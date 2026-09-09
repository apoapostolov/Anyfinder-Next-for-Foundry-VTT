# Anyfinder Next Pathfinding Audit

Audit date: 2026-09-07  
Scope: Anyfinder Next `14.0.1`, normal Anyfinder `14.0.0`, Foundry VTT v14

## Outcome

The earlier audit was directionally correct but incomplete. It correctly identified stale gridless caches, stale Worker answers, missing Worker teardown, dead scene/token controls, and the feature gap between grid-backed and gridless routing. The comparison against normal Anyfinder also exposed two additional production issues:

- fast pointer movement caused valid Worker routes to be discarded because Next allowed only about `1.5–4 px` of target drift and `1.2 s` of age;
- after routing all grid types through the defensive dispatcher, the v14 Wayfinder call needed the five-argument signature, including its `CancellationToken`.

This pass migrated the useful normal-Anyfinder integration fixes and hardened them for Next. It also fixed a main-thread graph discrepancy: unlike the Worker, Next allowed diagonal edges through blocked orthogonal corners and tested every undirected edge twice.

## Implemented remediation

| Area | Before | Current state |
|---|---|---|
| Pathfinding policy | Scene override and token opt-out helpers were unused | Wrapper calls `anxShouldUsePathfinding` |
| Missing `lib-wrapper` | Ready hook could fail | Warning plus native Foundry behavior |
| v14 grid backend | Dispatcher had an invalid four-argument call | Five arguments, with cancellable token |
| Gridless first request | Always returned native straight fallback while Worker built its first graph | One bounded synchronous bootstrap solve per token |
| Fast drag Worker reuse | `1.2 s`, about `1.5–4 px` target drift | Validated path-corridor repair to the current exact target |
| Stale Worker answer | Age/proximity only | Scene ID, wall revision, token/settings fingerprint, and collision validation |
| Wall mutation | Gridless data survived wall edits | Create/update/delete hooks invalidate all gridless derived state |
| Setting mutation | Masks and graphs survived clearance changes | Relevant setting callbacks invalidate and re-warm |
| Scene lifecycle | Worker and results survived teardown | Worker termination and state clearing on teardown |
| Cold scene | Worker and graph initialized lazily | Worker starts and main scene/graph caches warm on `canvasReady` |
| Main graph | Every edge checked twice; diagonal corner cutting possible | Symmetric edge construction and orthogonal-corner guard |
| Worker budget | `maxTimeMs` existed but was ignored | Monotonic time cap enforced in primary and fallback searches |
| Open/short movement | Entered Worker/node scheduling | Synchronous wall + Foundry validation bypasses A* |
| Drag-frame waiting | Up to `1.2 s` normally and `8 s` for long routes | No Worker wait in the pointer hot path |
| Worker geometry | Every request cloned the full wall list | One immutable snapshot per wall revision |
| Rounded path caches | Replaced exact endpoints without revalidation | Revalidate connectors or evict and search |
| v14 options | Some paths read legacy top-level fields | History/ignore flags normalized through `constrainOptions` |

Automated Node tests exercise the Worker in open space, around a blocking wall, against a sealed scene, and around a joined hard corner. Integration tests guard the wrapper signature, lifecycle hooks, stale-result checks, corner-cut prevention, coordinate conversion, Foundry's final collision gate, and bootstrap behavior.

## Architecture by grid type

### Square

Square scenes use the embedded Rust/WebAssembly Wayfinder backend. JavaScript supplies the token document, requested waypoints, a cancellation token, fog/exploration choice, and Foundry's measured movement-path result. Wall and Region changes are mirrored into the live WASM object.

The exposed bindings include Foundry diagonal policies, wall/Region mutation, elevation-related data, fog updates, and measured movement. The Rust source is not in this repository, so the exact queue, heuristic, graph encoding, and cost-combination rules cannot be source-audited. Those claims need black-box Foundry fixtures.

### Hex

Hex scenes use the same v14 WASM backend, which exposes `HexOddR`, `HexEvenR`, `HexOddQ`, and `HexEvenQ`. Next then compares the backend route with Foundry's native constrained path. It can prefer native when the backend injects a phantom waypoint or crosses a wall while native remains clean.

This is a mitigation, not proof of correct topology. If both routes cross walls, the backend route is retained. Normal Anyfinder's development history explicitly records unresolved phantom-waypoint and wall-junction behavior. All four offset layouts still need live fixture coverage, especially parity transitions and wall vertices.

### Gridless

Gridless routing does not use the WASM core. It builds a sampled navigation lattice in JavaScript and normally solves it in a Web Worker. The algorithm, data model, retry ladder, and edge cases are documented in [docs/GRIDLESS-PATHFINDING.md](docs/GRIDLESS-PATHFINDING.md).

## Normal Anyfinder comparison

The exact installed normal module is preserved at `ingest/anyfinder`; its source commit was `05e7fb5` and its manifest version is `14.0.0`. Its Worker file was byte-identical to the pre-audit Next Worker. The useful differences were in the main integration bundle.

Migrated from normal Anyfinder:

- policy gate, public/debug API exposure, setting normalization;
- graceful `lib-wrapper` failure;
- canvas warmup, invalidation, teardown, Worker lifecycle;
- wall-driven invalidation;
- v14-safe movement-option reads;
- wider Worker-result tolerance proven useful during fast drag.

Migrated with additional hardening:

- Worker answers now carry and must match a geometry/settings fingerprint;
- every accepted Worker polyline is checked against current blocking walls;
- the first Worker request uses one bounded synchronous bootstrap route instead of a straight native preview;
- main graph edge construction now matches the Worker's no-corner-cut behavior;
- Worker profile time limits are real rather than declarative.

Not migrated:

- normal Anyfinder's optional Worker overlay simplifier estimates clearance using a synthetic 1×1 token, which can cut a valid large-token detour into an unsafe segment;
- its displayed-path tolerance helper is dead code in both bundles and has no geometry fingerprint;
- its four-argument WASM call matches its older binding but is invalid for Next's v14 five-argument binding.

## Remaining findings

### P1 — Gridless Regions, fog, elevation, and movement costs are not modeled

The gridless payload contains scene bounds, movement-blocking walls, token clearance, and gridless settings. It does not contain Region polygons/behaviors, explored-fog state, elevation/levels, terrain cost, or Foundry's measured movement costs.

Result: “pathfinding enabled” does not mean the same thing on gridless and gridded scenes. This must remain documented as wall-only routing until those inputs and corresponding tests are added.

### P1 — Square/hex core is not reproducibly auditable

The repository ships generated bindings and WASM but no Rust source, Cargo metadata, or reproducible build. Internal correctness and performance cannot be reviewed or fixed here. Preserve or publish the matching core source before making algorithmic guarantees.

### P2 — Blocked-start escape remains heuristic

If a token starts inside its configured clearance envelope, the gridless solver projects it to the nearest walkable node, computes from there, then restores the real endpoint. Near-wall “escape” behavior is inherently difficult: strict validation can reject every egress, while relaxed validation can permit crossing a wall. Normal Anyfinder's log records several attempted relaxations that regressed long routes and were rolled back.

This pass now validates the previously omitted start-to-first-waypoint connector. A blocked start is allowed to escape only if the connector does not intersect any physical wall, does not enter another wall's clearance, ends fully clear, and increases sampled distance from every wall initially overlapped. Gridless requests are now solved entirely in movement-origin coordinates and converted back to Foundry token positions only after solving. The returned route is also checked by Foundry's own movement constraint, closing both the initial-segment and coordinate-offset variants of the “route exists but token sticks” failure.

### P2 — Duplicate gridless solvers can drift

The Worker uses a binary heap; the synchronous implementation scans a JavaScript `Set` to find the lowest score. Collision, retry, and graph logic also exist twice. The newly fixed corner-rule mismatch demonstrates the risk.

Best next refactor: move pure geometry/graph/search code into one source module and produce both runtime bundles from it. A lower-risk interim improvement is to port the Worker's heap to the synchronous path.

### P2 — Dense wall collision remains approximately linear

Broad-phase checks use wall bounding boxes, but candidate walls are still found by scanning the full wall list. A uniform spatial hash keyed to node step would make point and segment checks proportional to nearby walls on dense maps. Benchmark before adding an R-tree; regular hashing fits the existing lattice and is easier to invalidate.

### P2 — Worker work is coalesced, not cancellable

Only the latest queued payload per token is retained, but an in-flight solve runs to its deadline. Rapid drags can therefore finish obsolete work before starting the newest target. It no longer blocks a drag call: direct movement and valid corridor repairs complete synchronously, while unresolved movement fails closed. Add a request-generation cancellation message or a `SharedArrayBuffer` flag only if profiling shows obsolete Worker CPU use remains material.

### P2 — Open-path score updates duplicate heap entries

The Worker heap has no decrease-key operation and may contain repeated node IDs. The closed mask makes this correct, but difficult scenes do extra heap work. An indexed heap could reduce churn, though spatial hashing and source unification are higher-value first steps.

## Verification performed

- `node --check dist/anyfinder-next.js`
- `node --check dist/anyfinder-gridless-worker.js`
- `npm test`
- `git diff --check`

Live Foundry validation was performed for the gridless drag timing and local
diagnostic writer. The broader manual matrix still required for the WASM core
and edge-case coverage is: square plus every diagonal rule; all four hex
offsets; gridless open/closed/locked doors; wall edits while dragging; first
drag immediately after scene load; token starts tangent to or slightly
overlapping a wall; and rapid 200+ px pointer sweeps.

## 2026-09-09 latency and dead-zone follow-up

The supplied trace set contained 110 fail-closed `worker_pending` movements. All stopped at the Worker wait stage; the median delay was 31 ms, p95 was 123 ms, and one request took 1213 ms. Forty returned Worker paths then failed current-geometry validation in repeated narrow wall areas.

The dominant problem was scheduling and endpoint reuse, not a missing node-map cache. Both solvers already memoized walk masks and graphs by scene geometry, step, clearance, and corner guard. The corrective design therefore keeps those caches and changes the query path:

1. prove direct legal motion synchronously and bypass A*;
2. repair the previous valid corridor to nearby exact targets;
3. run expensive searches asynchronously without awaiting them in a drag frame;
4. transfer wall geometry to the Worker once per revision;
5. validate every rounded cache hit after exact endpoint substitution.

This is consistent with established navigation practice: preserve and locally adjust a valid corridor when the target moves, while retaining line-of-sight simplification and a complete search for cases that genuinely need it. It avoids introducing a second hierarchical graph or navmesh format before profiling demonstrates that the existing cached lattice itself is the bottleneck.

After deployment, a live 200-request rolling sample measured 1.9 ms median,
3.2 ms p90, 18.3 ms p95, and 21.1 ms maximum synchronous request time. Two
later transitions into previously unsolved obstructed geometry produced runs of
7 and 17 fail-closed `worker_pending` frames spanning about 172 ms and 389 ms;
both recovered to verified paths. These are no longer main-thread stalls. They
are first-result latency while an in-flight Worker finishes an older target.
The Worker scheduler now applies that evidence: ordinary moving targets use the
bounded ladder, and a complete refinement is queued only after the same target
remains unresolved for 180 ms. Long routes still start with their complete
castle-scale ladder. This reduces obsolete first-route work without lowering
collision checks or showing an unverified straight fallback.

Live testing also showed that successful corridor repair could remain active
indefinitely, retaining each exact pointer position as another freehand segment.
Corridor state now tracks cumulative repair distance and repair count. At the
larger of 80 px or 2.5 node steps—or 16 small repairs—it requests a fresh node
route in the background. The current verified corridor remains displayed until
the fresh route passes wall-clearance and Foundry constraint validation, at
which point it atomically replaces the freehand tail.
