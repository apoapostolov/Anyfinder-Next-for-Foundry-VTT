# Anyfinder Next Pathfinding Audit

Audit date: 2026-09-07  
Audited artifact: `dist/anyfinder-next.js` and `dist/anyfinder-gridless-worker.js`  
Module manifest: version `14.0.1`, Foundry VTT v14 only

## Executive summary

Anyfinder Next has two materially different pathfinding implementations:

1. Square and hex scenes are delegated to the embedded Rust/WebAssembly Wayfinder core.
2. Strict gridless scenes use a JavaScript sampled navigation graph, optionally solved in a Web Worker, with a synchronous duplicate implementation as fallback.

The square/hex integration is comparatively thin and benefits from the compiled Wayfinder core's grid, wall, region, fog, elevation, and movement-cost model. The gridless implementation is a separate approximation: it samples a 2D point graph, treats blocking walls as line segments expanded by token clearance, and uses Euclidean A*.

The most important audit result is that the gridless cache invalidation function exists but is never called. Gridless scene data, walk masks, walk graphs, segment paths, worker results, and last-valid paths can therefore survive wall changes. This can return a route based on obsolete geometry. The gridless branch also does not pass fog or Region data to either gridless solver, despite those features being present in the grid-backed core.

## Runtime entry point and routing

Foundry's `Token.findMovementPath` is wrapped in the generated bundle at [dist/anyfinder-next.js](dist/anyfinder-next.js:1063).

The wrapper currently routes as follows:

| Condition | Backend | Result behavior |
|---|---|---|
| `ignoreWalls` or `ignoreCost` | Foundry native wrapper | Anyfinder is bypassed |
| Strict gridless canvas | Anyfinder gridless dispatcher | Worker result, synchronous JS solver, cached path, or native fallback |
| Square or hex canvas | WASM Wayfinder | Async path from `canvas.anyfinder.findMovementPath` |
| Missing backend, non-Promise, or exception | Foundry native constraint | Native result is returned |

The gridless/square/hex decision is made by `anxIsStrictGridlessScene` and `anxFindPathWithFallback` in [dist/anyfinder-next.js](dist/anyfinder-next.js:2276) and [dist/anyfinder-next.js](dist/anyfinder-next.js:3104).

Important: the wrapper condition at [dist/anyfinder-next.js](dist/anyfinder-next.js:1063) checks the global force/user settings, but does not call `anxShouldUsePathfinding`. Consequently, the scene override flag and token opt-out API are defined but are not enforced by the actual movement-path wrapper.

## Shared inputs and Foundry integration

The original Wayfinder object is created on `canvasReady`, freed on `canvasTearDown`, and receives wall and Region create/update/delete notifications in [dist/anyfinder-next.js](dist/anyfinder-next.js:1101).

The WASM binding exposes:

- `Wayfinder.findMovementPath(cancellationToken, tokenDocument, waypoints, useExploration, gridMeasurePathResult)`
- wall and Region mutation methods
- fog refresh through `updateFog`
- cancellation through `CancellationToken`
- explicit grid types: gridless, square, and four Foundry hex offset variants

That API is visible in the generated binding source embedded in the source map. The actual Rust search implementation is not present as readable source in this repository; it is inside the shipped WASM binary. Therefore the audit can verify the JS/WASM contract and integration behavior, but cannot independently prove every internal Rust algorithmic detail from this artifact alone.

## Square-grid behavior

Square scenes use the WASM Wayfinder pathfinder. The wrapper supplies:

- the Token document and requested movement waypoints;
- movement history when Foundry provides it;
- a fog-exploration boolean derived from the scene and token-vision state;
- Foundry's measured movement-path result.

The core's exported enum set includes Foundry diagonal rules (`Equidistant`, `Exact`, `Approximate`, `Rectilinear`, alternating rules, and `Illegal`). The core also reads grid size, distance, columns/rows, wall data, Regions, movement actions, elevation, and fog-related objects through the WebAssembly bindings.

Based on the exposed contract and changelog, square routing is intended to be a cost-aware graph search over Foundry grid nodes, with wall/door restrictions, diagonal-rule costs, Regions, elevation/levels, and optional exploration constraints. The wrapper does not post-validate every square result against native Foundry geometry; it trusts the WASM result except for the generic exception/non-Promise fallbacks.

## Hex-grid behavior

Hex scenes use the same WASM backend as square scenes. The binding explicitly supports:

- `HexOddR`
- `HexEvenR`
- `HexOddQ`
- `HexEvenQ`

The wrapper adds a hex-specific defensive comparison at [dist/anyfinder-next.js](dist/anyfinder-next.js:3332): it computes a native Foundry path, detects unexpected extra waypoints and wall crossings, and replaces the WASM result with the native result in selected cases.

This is a useful safety net, but it is heuristic rather than a proof of correctness. It only activates when the returned path is an array and the native fallback is also available. If both paths appear to cross a wall, the WASM path is retained and the debug outcome records `hex_kept_backend_both_cross`.

The source changelog says the v14 core was added specifically for hex topology and phantom-waypoint/wall-crossing problems. Since the core is shipped as opaque WASM, those claims should be covered by runtime fixture tests for all four offset layouts.

## Gridless behavior

### Scene representation

The gridless implementation builds a rectangular lattice over `canvas.dimensions.sceneRect`. The requested node spacing defaults to 40 px and is clamped to 16–160 px. If the lattice would exceed 20,000 nodes, the effective spacing is increased in 16 px steps up to 320 px. Scene data construction is in [dist/anyfinder-next.js](dist/anyfinder-next.js:2585) and the worker equivalent is in [dist/anyfinder-gridless-worker.js](dist/anyfinder-gridless-worker.js:195).

Each node is classified as walkable when its center is inside the scene rectangle and farther than the effective token clearance from every blocking wall. Edges use eight neighboring directions. Diagonal edges require both orthogonal neighbor nodes to be walkable, preventing ordinary grid corner cutting.

### Collision model

Blocking walls are extracted from canvas wall documents. Non-blocking movement edges are ignored; open doors are allowed, while closed and locked doors remain blocking. This extraction is in [dist/anyfinder-next.js](dist/anyfinder-next.js:2362).

For gridless routing, token size is approximated by the larger scaled token dimension divided by two. Squeeze routing can reduce the effective radius by the configured leeway. A minimum center clearance, endpoint guard, exact-fit tolerance, and token corner allowance are then applied. This is a conservative 2D line-segment clearance model, not Foundry's full shape/grid collision model.

### Search and route construction

For each segment between the current point and a requested waypoint, the solver:

1. Builds or retrieves a walk mask and eight-neighbor graph.
2. Projects blocked endpoints to their nearest walkable sampled node.
3. Adds temporary start and goal nodes.
4. Attaches those nodes to nearby walkable samples whose connecting edges are clear.
5. Runs Euclidean A* using straight-line distance as the heuristic and edge length as cost.
6. Simplifies the resulting polyline by testing longer direct edges.
7. Restores the exact requested endpoints.
8. Validates the combined multi-segment result in the synchronous solver.

The synchronous implementation is in [dist/anyfinder-next.js](dist/anyfinder-next.js:2774). The worker contains a largely duplicated implementation in [dist/anyfinder-gridless-worker.js](dist/anyfinder-gridless-worker.js:426).

Long routes may be split into additional waypoints when they are long and appear to cross many walls. Multiple retry profiles vary node spacing, corner guard scale, iteration budget, and time budget.

### Worker and interactive drag path

The first gridless request for a token queues a Worker solve. While the Worker is in flight, the wrapper can return Foundry's native fallback. Completed Worker results are reused when token start and target are close enough and the result is no more than 1.2 seconds old. Recent valid paths and recent failures are also reused during drag updates.

Worker lifecycle and result consumption are implemented in [dist/anyfinder-next.js](dist/anyfinder-next.js:1872). The Worker protocol is implemented in [dist/anyfinder-gridless-worker.js](dist/anyfinder-gridless-worker.js:885).

## Feature matrix

| Capability | Square | Hex | Gridless |
|---|---:|---:|---:|
| WASM Wayfinder core | Yes | Yes | No |
| Foundry native fallback | Yes | Yes | Yes |
| Blocking walls and doors | Core | Core + JS heuristic check | JS line-segment model |
| Grid diagonal rules | Core | Core | Eight-way Euclidean graph |
| Hex offset topology | N/A | Core | N/A |
| Regions | Core integration | Core integration | Not included in payload |
| Fog/exploration restriction | Passed to core | Passed to core | Not included in payload |
| Movement cost / measured path | Passed to core | Passed to core | Euclidean pixel distance only |
| Elevation / levels | Core integration | Core integration | Not represented |
| Cancellation | WASM token | WASM token | Wrapper cancel is a no-op |
| Async Worker | No | No | Optional |

## Findings

### P1 — Gridless geometry caches are never invalidated

`anxInvalidateGridlessCache` is defined at [dist/anyfinder-next.js](dist/anyfinder-next.js:2015), but static inspection finds no call site. The gridless scene cache is keyed by scene ID and scene bounds, not by current wall geometry, and stores walls, masks, graphs, and segment paths at [dist/anyfinder-next.js](dist/anyfinder-next.js:2585).

Impact: adding, deleting, moving, opening, or closing a wall can leave gridless routes using stale wall geometry for the rest of the scene. The Worker has the same risk: its cache key includes `wallRevision`, but the main thread never increments that revision.

Recommended fix: call cache invalidation from wall create/update/delete, scene/canvas teardown, and any setting change that affects collision. Include a monotonic wall revision in every request and reject Worker results from an older revision.

### P1 — Gridless routing ignores Regions and fog exploration

The gridless Worker payload contains only scene bounds, blocking wall segments, token dimensions, and gridless settings at [dist/anyfinder-next.js](dist/anyfinder-next.js:1980). It does not contain Region geometry/restrictions, fog texture/exploration data, elevation, or movement-cost data. The gridless dispatcher also does not call `anxUseFogRestriction`.

Impact: the same setting can produce different semantics by grid type. A route blocked by a Region or unexplored fog on square/hex may be returned through gridless space.

Recommended fix: either document gridless as intentionally wall-only, or add explicit Region/fog/cost inputs and validation. Do not advertise parity until the latter exists.

### P1 — Scene override and token opt-out are dead controls

The bundle defines `anxShouldUsePathfinding`, scene flag helpers, and token opt-out helpers, but `anxShouldUsePathfinding` has no call site. The actual wrapper at [dist/anyfinder-next.js](dist/anyfinder-next.js:1063) checks only global force/user settings and ignore flags.

Impact: callers using the public API to disable pathfinding for a scene or token will not get the documented behavior. With `forcePathfindingAllPlayers` enabled, the normal user toggle also cannot disable routing, although that part appears intentional.

Recommended fix: use `anxShouldUsePathfinding(this, this.document)` in the wrapper condition, while preserving the force-setting semantics explicitly.

### P1 — Worker results are accepted without current-geometry validation

`anxTryConsumeWorkerResult` validates age and proximity of start/target, then overlays the Worker path at [dist/anyfinder-next.js](dist/anyfinder-next.js:1941). It does not validate wall revision, token dimensions/settings, scene ID, or path collision before returning the path.

Impact: a result computed for old walls, a prior scene, or prior clearance settings can be accepted during a drag. This compounds the cache invalidation defect.

Recommended fix: include a request fingerprint containing scene ID, wall revision, token clearance, corner guard, tolerance, and solver settings; validate the returned polyline against current walls before consumption.

### P2 — Worker and synchronous gridless solvers can diverge

The synchronous solver enforces a time cap every 64 iterations at [dist/anyfinder-next.js](dist/anyfinder-next.js:2869). The Worker implementation declares `maxTimeMs` in retry profiles but does not use it inside `solveSegment`; it only enforces an iteration cap at [dist/anyfinder-gridless-worker.js](dist/anyfinder-gridless-worker.js:426).

Impact: Worker latency can exceed the profile's intended interactive budget on large or difficult scenes, while the synchronous fallback reports time-cap behavior differently. Diagnostics and user-visible responsiveness can vary depending on which backend answered.

Recommended fix: enforce a monotonic-clock deadline in the Worker and return a distinct timeout reason.

### P2 — Gridless worker lifecycle survives canvas teardown

The original WASM object is freed on canvas teardown, but the gridless Worker is not terminated by the visible lifecycle hooks. The termination helper exists at [dist/anyfinder-next.js](dist/anyfinder-next.js:1872) but has no static call site.

Impact: old-scene Worker requests can complete after a scene switch, retain old scene graphs, and populate result maps. This is also a memory-growth risk over long sessions.

Recommended fix: terminate the Worker and clear all gridless maps on `canvasTearDown` and before accepting a new scene.

### P2 — Gridless route reuse is deliberately optimistic

Recent drag paths can be returned without a fresh collision test, and a recent last-valid path can be reused after a failed solve. This is visible in [dist/anyfinder-next.js](dist/anyfinder-next.js:3140).

This is reasonable as an interaction optimization only if wall/settings/scene fingerprints are guaranteed current. Until cache invalidation is fixed, the optimization can preserve unsafe routes rather than merely reduce jitter.

### P2 — Diagnostics contain stale identifiers

The debug session writer labels exported traces with `moduleVersion: "13.0.0"` and uploads to `modules/anx/debug` at [dist/anyfinder-next.js](dist/anyfinder-next.js:1850). The module ID and manifest are `anyfinder-next` / `14.0.1`.

Impact: exported diagnostics can be misclassified or uploaded to an unexpected location, making support investigations harder.

Recommended fix: source the module ID/version from the module manifest or a single runtime constant, and use the current module's debug path.

### P3 — The shipped bundle is not auditable at the core algorithm level

The repository contains generated JS and a source map, but no Rust source, Cargo manifest, tests, build script, or readable WASM source. The source map references the original Wayfinder JS wrapper, while the generated bundle contains additional Anyfinder Next logic.

Impact: core changes cannot be reviewed or reproduced from this repository, and square/hex correctness relies on black-box runtime behavior.

Recommended fix: maintain the Rust/WASM source and reproducible build metadata in a source repository, or at minimum publish a versioned source artifact and fixture test suite alongside the module.

## Verification plan

The current repository has no automated tests. A complete validation suite should include:

1. Square maps with each Foundry diagonal rule, closed/open/locked doors, token sizes, and wall tangencies.
2. Hex maps for all four offset layouts, including routes around corners and across every row/column parity transition.
3. Gridless corridors at widths below, equal to, and above token diameter; diagonal corner pinches; exact-fit tolerance; squeeze on/off; and rotated/large tokens.
4. Wall mutation tests: create, move, delete, open, close, lock, and unlock a wall while a scene remains active; assert that the next path reflects the mutation.
5. Scene-switch tests while a Worker request is in flight; assert that no old-scene result is consumed.
6. Region and fog parity tests across square, hex, and gridless scenes.
7. Setting-change tests for node step, squeeze leeway, minimum clearance, and exact-fit tolerance.
8. Cancellation and fallback tests, including Worker failure, WASM failure, missing `canvas.anyfinder`, and native fallback parity.
9. Performance tests at 20,000-node grids, dense wall layouts, long routes, and rapid drag updates.

## Audit conclusion

Square and hex routing have a clear WASM-backed integration path and explicit support for Foundry's grid types, but their internal algorithm cannot be fully audited from the shipped artifact. Gridless routing is a well-structured sampled A* approximation with useful retry, simplification, fallback, and diagnostics layers. Its production safety is currently undermined by missing invalidation/lifecycle wiring and by feature differences that are not surfaced in the user-facing contract.

The first remediation pass should fix cache/Worker fingerprints and lifecycle, enforce the scene/token enable controls, and decide/document whether gridless is wall-only or must reach feature parity with the WASM backend. Then add the fixture suite above before changing path heuristics.
