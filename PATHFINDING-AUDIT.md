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
| Fast drag Worker reuse | `1.2 s`, about `1.5–4 px` target drift | `5 s`, `24–160 px`, scaled to node step |
| Stale Worker answer | Age/proximity only | Scene ID, wall revision, token/settings fingerprint, and collision validation |
| Wall mutation | Gridless data survived wall edits | Create/update/delete hooks invalidate all gridless derived state |
| Setting mutation | Masks and graphs survived clearance changes | Relevant setting callbacks invalidate and re-warm |
| Scene lifecycle | Worker and results survived teardown | Worker termination and state clearing on teardown |
| Cold scene | Worker and graph initialized lazily | Worker starts and main scene/graph caches warm on `canvasReady` |
| Main graph | Every edge checked twice; diagonal corner cutting possible | Symmetric edge construction and orthogonal-corner guard |
| Worker budget | `maxTimeMs` existed but was ignored | Monotonic time cap enforced in primary and fallback searches |
| v14 options | Some paths read legacy top-level fields | History/ignore flags normalized through `constrainOptions` |

Automated Node tests exercise the Worker in open space, around a blocking wall, and against a sealed scene. Static integration tests guard the wrapper signature, lifecycle hooks, stale-result checks, corner-cut prevention, and bootstrap behavior.

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

This pass now validates the previously omitted start-to-first-waypoint connector. A blocked start is allowed to escape only if the connector does not intersect any physical wall, does not enter another wall's clearance, ends fully clear, and increases sampled distance from every wall initially overlapped. This closes the common “route exists but token sticks on its first segment” case without allowing a cross-wall jump. It remains a sampled heuristic and needs live fixtures on both sides of wall endpoints and at exact wall contact.

### P2 — Duplicate gridless solvers can drift

The Worker uses a binary heap; the synchronous implementation scans a JavaScript `Set` to find the lowest score. Collision, retry, and graph logic also exist twice. The newly fixed corner-rule mismatch demonstrates the risk.

Best next refactor: move pure geometry/graph/search code into one source module and produce both runtime bundles from it. A lower-risk interim improvement is to port the Worker's heap to the synchronous path.

### P2 — Dense wall collision remains approximately linear

Broad-phase checks use wall bounding boxes, but candidate walls are still found by scanning the full wall list. A uniform spatial hash keyed to node step would make point and segment checks proportional to nearby walls on dense maps. Benchmark before adding an R-tree; regular hashing fits the existing lattice and is easier to invalidate.

### P2 — Worker work is coalesced, not cancellable

Only the latest queued payload per token is retained, but an in-flight solve runs to its deadline. Rapid drags can therefore finish obsolete work before starting the newest target. Add a request-generation cancellation message or a `SharedArrayBuffer` flag only if profiling shows the time cap and wider reuse are insufficient.

### P2 — Open-path score updates duplicate heap entries

The Worker heap has no decrease-key operation and may contain repeated node IDs. The closed mask makes this correct, but difficult scenes do extra heap work. An indexed heap could reduce churn, though spatial hashing and source unification are higher-value first steps.

## Verification performed

- `node --check dist/anyfinder-next.js`
- `node --check dist/anyfinder-gridless-worker.js`
- `npm test`
- `git diff --check`

Live Foundry validation remains necessary for the WASM core and UI timing. The highest-value manual matrix is: square plus every diagonal rule; all four hex offsets; gridless open/closed/locked doors; wall edits while dragging; first drag immediately after scene load; token starts tangent to or slightly overlapping a wall; and rapid 200+ px pointer sweeps.
