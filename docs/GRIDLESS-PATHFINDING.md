# Gridless Pathfinding Design and Edge-Case Study

## Contract

Gridless Anyfinder computes a polyline for a token center through a 2D scene. It is wall-aware and token-size-aware, but it is not currently Region-, fog-, elevation-, or terrain-cost-aware. Internal solver results omit the start point. The Foundry adapter always prepends the exact first requested waypoint because Foundry v14 requires every non-empty returned path to begin there; it also preserves the requested destination as the final waypoint.

The normal execution path is asynchronous in `dist/anyfinder-gridless-worker.js`. `dist/anyfinder-next.js` contains a synchronous equivalent for the initial bounded bootstrap and environments where Workers are unavailable.

## Geometry model

### Blocking walls

The main thread extracts wall endpoints and axis-aligned bounds. Walls whose movement sense is `NONE` are excluded. Open doors are excluded; closed and locked doors remain obstacles. Directional wall semantics are not represented in the gridless payload.

### Token clearance

The token is approximated as a circle based on its larger scaled pixel dimension:

```text
effective clearance = max(
  1 pixel,
  token radius × (squeeze enabled ? 0.60 : 1.00)
)
```

Squeeze is enabled by default. A clearance of 60% of the radius permits a corridor approximately 60% of the token diameter. This necessarily allows token artwork to overlap the wall visually, but every point and edge of the center path is collision-checked: the center cannot touch or cross a physical wall, so the vision origin cannot cross through it. The former fixed-pixel squeeze-leeway and minimum-clearance settings remain registered for compatibility but are hidden and no longer control clearance.

Foundry movement waypoints store token positions, while collision rays operate on the token's movement origin. Anyfinder converts every requested waypoint to a movement origin before solving, then converts generated route nodes back to token positions before returning the path. The first requested waypoint—not movement history—is the solver origin. The completed path is passed through Foundry's own movement constraint as an authoritative safety check; any path Foundry shortens, adjusts, or de-anchors from that exact origin is discarded.

The exact-fit tolerance is subtracted during collision checks to prevent floating-point/tangent noise from closing nominally exact passages. A bounded endpoint guard accounts for extra corner reach. This is conservative for some shapes and permissive for others because rotated or non-circular footprints are reduced to one scalar radius.

### Collision tests

A point is blocked when it lies outside `sceneRect` or falls within effective clearance of a blocking wall segment. An edge is blocked when the minimum distance between the movement segment and a wall segment violates clearance. Axis-aligned bounds eliminate obviously distant walls before exact segment-distance checks.

## Node algorithm

### 1. Sample the Search Area

A regular rectangular lattice covers the search area. The Worker first searches a route-focused rectangle around the start, destination, and explicit waypoints, then widens that rectangle on later attempts. Its soft budget is 120,000 nodes and its maximum automatic spacing is 160 px. The synchronous bootstrap still covers the full scene with a conservative 20,000-node budget because it runs on the UI thread.

For a scene of width `W`, height `H`, and step `s`, the approximate node count is:

```text
(floor(W / s) + 1) × (floor(H / s) + 1)
```

Smaller steps improve narrow-passage fidelity but increase mask construction, graph construction, A* memory, and search time.

### 2. Build a walk mask

Each sample becomes one byte in a `Uint8Array`: `1` when the token center can occupy it, otherwise `0`. Masks are cached by rounded clearance and guard. Wall revisions, scene changes, and relevant setting changes invalidate them.

### 3. Build an eight-neighbor graph

Each walkable node can connect horizontally, vertically, or diagonally to adjacent samples. An edge is stored as one bit in a byte.

Graph construction now evaluates only east/south-facing undirected edges and sets the opposite bit on the neighbor. This halves exact edge checks. A diagonal edge is permitted only when both orthogonal side nodes are walkable, preventing passage through a blocked corner pinch.

### 4. Attach exact endpoints

Start and goal are temporary graph vertices, not necessarily lattice samples. The solver searches nearby walkable nodes and retains candidates with clear connector segments. If an endpoint itself is blocked by token clearance, it is projected to the nearest walkable sample first.

This attachment phase is where wall-adjacent tokens are most sensitive. Too-strict connectors can make a legal escape impossible; too-relaxed connectors can jump across the wall. The current model favors safety and records distinct reasons such as `start_blocked_no_node`, `goal_blocked_no_node`, `no_attach_start`, and `no_attach_goal`.

### 5. Run A*

Edge cost is Euclidean pixel length: `s` for orthogonal neighbors and `s√2` for diagonals. The heuristic is straight-line Euclidean distance to the goal, so it is admissible for this graph.

The Worker uses a binary minimum heap and a closed byte mask. The synchronous fallback currently uses a `Set` and scans it for the lowest f-score, making its worst-case open-set selection linear. Both enforce adaptive iteration caps. The Worker now also enforces the declared monotonic time cap every 64 iterations and after graph construction.

### 6. Simplify and validate

The raw node chain is simplified by replacing runs of short edges with the longest collision-free segment. Exact requested endpoints are restored. The combined path is collision-validated before it is accepted by the main thread. Worker answers receive a second current-geometry validation at consumption time.

### 7. Retry with Alternate Resolutions

If a solve fails, the retry ladder changes node step, search-area margin, corner scale, iteration allowance, and time allowance. Long routes get fine-step attempts inside progressively wider route corridors before a full-scene fallback. Coarser graphs reduce work; finer rescue steps recover narrow passages. Short interactive routes retain a smaller ladder to protect drag responsiveness.

## Interactive scheduling

Each token has at most one in-flight Worker request. New drag targets replace the queued payload, so obsolete queued work is coalesced. Completed routes are accepted for up to five seconds and for target drift between 24 and 160 px, scaled by node step.

For a long route, or after the first synchronous bootstrap, the Foundry pathfinding job now remains pending while the matching Worker result is calculated. Cancellation follows Foundry's drag-search cancellation. This fixes the case where a successful Worker result arrived after Foundry had already accepted a native fallback and therefore was never displayed unless the pointer moved again.

Foundry renders the unresolved destination as a dashed, direct “unreachable” segment while a pathfinding promise is pending. Anyfinder wraps the protected token-ruler segment-style method and hides only that current-user unreachable segment while Anyfinder is enabled. The actual path, history, endpoint, and distance labels remain available.

That wider window fixes the principal “straight line first / never gets the node path” defect. The former 1.5–4 px target tolerance was smaller than ordinary pointer movement between frames, so valid Worker answers were routinely thrown away.

Wider reuse is protected by four gates:

1. start-point proximity;
2. target-point proximity;
3. exact scene ID, wall revision, token size, and solver-setting fingerprint;
4. collision validation against current walls immediately before return.

In addition, cached paths are returned only when their first point still matches Foundry's first requested waypoint. This prevents a route calculated from a movement-history point or a stripped Worker origin from being reused during later drag frames.

For the first request after invalidation, the main thread performs one bounded interactive solve per token while the Worker builds its graph. This avoids presenting a straight native route into a wall. Later frames return to Worker-first behavior; the bootstrap marker is cleared whenever geometry/settings or the canvas lifecycle invalidates routing state.

## Failure modes and edge cases

### Token starts inside wall clearance

Projection finds a graph node quickly, but connecting the real token center to that node may still intersect the expanded wall. Simply ignoring the first collision is unsafe because the token might be on the opposite side. The current egress validator requires:

- no crossing of the physical wall centerline;
- nondecreasing sampled distance, with net improvement, from every wall currently overlapped;
- no new wall overlap;
- a fully clear first waypoint and normal validation from there onward.

The sampling makes this a pragmatic rather than analytic proof. Exact contact with a physical wall is rejected because its side is ambiguous.

### Narrow Corridors and Exact Fits

A corridor can be geometrically passable yet contain no sampled centerline nodes. Fine-step retries and route-focused search rectangles preserve more detail on large maps, but lattice alignment can still miss a passage close to the configured minimum width. A future local refinement pass around failed attachment/search areas could improve this further.

### Wall endpoints and diagonal pinches

Endpoint exclusion acts as a protective zone around wall vertices, including vertices shared by multiple walls. Together with the no-corner-cut rule and Foundry's final constraint check, it prevents routes from becoming tangent to a hard wall corner. Multiple walls meeting with subpixel gaps remain sensitive to tolerance; fixtures should continue to cover T-junctions, acute angles, nearly coincident endpoints, and closed doors embedded in longer walls.

### Target moves while Worker solves

The returned route is re-anchored to the current target. The final collision check rejects an unsafe new final segment. Very large target changes exceed the reuse window and wait for a newer solve.

### Scene or wall changes in flight

Every mutation increments `wallRevision` and clears main-thread result maps. The Worker echoes revision and fingerprint; mismatches are rejected. Teardown terminates the Worker, preventing old-scene results from repopulating state.

### No route

The solver reports a reason and may reuse a very recent legal path. Otherwise it uses Foundry's native constraint result. The one-time bootstrap specifically reduces the unsafe-looking native straight preview during cold Worker startup; native fallback is still the final compatibility path after genuine failures.

## Optimization priorities

1. Share one generated search core between Worker and main thread to eliminate semantic drift.
2. Port the Worker's heap to the synchronous implementation.
3. Extend the Worker's wall spatial hash to the synchronous bootstrap.
4. Add local adaptive refinement near failed endpoints and narrow passages.
5. Add generation-based cancellation if profiling shows obsolete in-flight work remains material.
6. Replace full nearest-walkable scans for blocked endpoints with expanding lattice rings; this matters mainly at the 20,000-node ceiling.
7. Consider an indexed heap only after spatial indexing and source unification.

## Required fixture suite

- no walls, one wall detour, sealed scene;
- open, closed, and locked doors;
- corridor widths below/equal/above effective diameter;
- squeeze on/off and exact-fit tolerance boundaries;
- token scale and non-square dimensions;
- wall corners, T-junctions, acute angles, and coincident endpoints;
- blocked start on each side of a wall and near an endpoint;
- rapid drag while editing/opening/closing walls;
- immediate drag after canvas load and after settings change;
- maps at and above both the 20,000-node synchronous and 120,000-node Worker budgets;
- multi-waypoint and long-route retry behavior.
