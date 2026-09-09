# Gridless Pathfinding Design and Edge-Case Study

## Contract

Gridless Anyfinder computes a polyline for a token center through a 2D scene. It is wall-aware and token-size-aware, but it is not currently Region-, fog-, elevation-, or terrain-cost-aware. Internal solver results omit the start point. The Foundry adapter always prepends the exact first requested waypoint because Foundry v14 requires every non-empty returned path to begin there; it also preserves the requested destination as the final waypoint.

The normal execution path is asynchronous in `dist/anyfinder-gridless-worker.js`. `dist/anyfinder-next.js` contains a synchronous equivalent for the initial bounded bootstrap and environments where Workers are unavailable.

## Geometry model

### Blocking walls

The main thread extracts wall endpoints and axis-aligned bounds once per scene wall revision. Walls whose movement sense is `NONE` are excluded. Open doors are excluded; closed and locked doors remain obstacles. Directional wall semantics are not represented in the gridless payload. The serialized wall snapshot is sent to the Worker once per revision instead of being rebuilt and structured-cloned with every pointer update.

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

The raw node chain is simplified by replacing runs of short edges with the longest collision-free segment. Exact requested endpoints are restored. The combined path is collision-validated before it is accepted by the main thread. Worker answers receive a second current-geometry validation at consumption time. Rounded segment-cache hits are also revalidated after substituting exact endpoints; an invalid connector evicts the entry and continues through a fresh search.

### 7. Retry with Alternate Resolutions

If a solve fails, the retry ladder changes node step, search-area margin, corner scale, iteration allowance, and time allowance. Long routes get fine-step attempts inside progressively wider route corridors before a full-scene fallback. Coarser graphs reduce work; finer rescue steps recover narrow passages. Short interactive routes retain a smaller ladder to protect drag responsiveness.

## Interactive scheduling

The first stage is a synchronous fast path, not A*. The complete requested center polyline is checked against the cached wall geometry and then passed through Foundry's authoritative movement constraint. Open-space movement and short movement with no obstructing wall therefore return immediately without constructing, consulting, or waiting for a node graph.

Each token has at most one in-flight Worker request. New drag targets replace the queued payload, so obsolete queued work is coalesced. A drag call never waits for the Worker: the previous implementation could pause a normal pointer frame for 1.2 seconds and a long route for 8 seconds. Ordinary routes use the bounded retry ladder while the pointer is moving; if the same target remains unresolved for 180 ms, a complete refinement is queued. Castle-scale routes retain the full ladder immediately. If no current route can be proved immediately, the call fails closed while the Worker continues in the background.

After any successful detour, Anyfinder retains its center-path corridor. For a nearby cursor target it first tries a safe suffix from the old endpoint. If that crosses a wall or violates clearance, it walks backward through the old bends until it finds the latest bend that can connect legally. The repaired route is fully collision-validated and constrained by Foundry before use. This gives nearby drag frames a current exact endpoint without another A* search and avoids the former dead zone where a stale Worker path acquired an illegal straight suffix.

Corridor repair is intentionally temporary rather than an indefinitely growing freehand path. Anyfinder accumulates the actual cursor distance added by repairs. Once it reaches the larger of 80 px or 2.5 node steps, or after 16 very small repairs, it queues a fresh Worker route. The verified repaired corridor remains visible and usable while that search runs. A valid Worker answer then replaces the accumulated tail and resets the budget. At the default 40 px node spacing, rebasing begins after roughly 100 px of freehand drift.

Foundry may render an unresolved destination as a dashed, direct “unreachable” segment. Anyfinder wraps the protected token-ruler segment-style method and hides only that current-user unreachable segment while Anyfinder is enabled. The actual path, history, endpoint, and distance labels remain available.

Worker and corridor reuse are protected by five gates:

1. start-point proximity;
2. target-point proximity;
3. exact scene ID, wall revision, token size, and solver-setting fingerprint;
4. collision validation against current walls immediately before return;
5. Foundry's own movement constraint with exact requested endpoints.

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

The returned route is treated as a corridor, not blindly re-anchored. Endpoint repair may keep the old endpoint, connect from an earlier bend, or reject the route. Very large target changes exceed the reuse window and use a newer solve. No pathfinding request waits on obsolete work.

### Scene or wall changes in flight

Every mutation increments `wallRevision` and clears main-thread result maps. The Worker echoes revision and fingerprint; mismatches are rejected. Teardown terminates the Worker, preventing old-scene results from repopulating state.

### No route

The solver reports a reason and may reuse a very recent legal path. If no verified route is available—including while a Worker is pending, after a cached failure, or after an exception—the gridless adapter returns only Foundry's exact first requested waypoint. This fail-closed path leaves the token at its origin and marks the destination unreachable. It never substitutes Foundry's partial straight constraint, which could otherwise draw through walls and move the token up to the first collision. Native fallback remains available for square and hex routing compatibility, but not for strict gridless pathfinding.

### Rejection diagnostics

With **Record Diagnostics** enabled, every fail-closed return creates a completed trace—even when it comes from an early cached failure or a pending Worker rather than the main solver. `final.rejection` records:

- the rejection stage and a plain-language classification;
- the solver or Worker reason and whether work is still in flight;
- requested token-position and movement-origin endpoints;
- token radius, effective clearance, corner guard, and squeeze state;
- direct-route point/segment collision results;
- up to 12 relevant walls with Foundry wall ID, endpoints, door state, centerline crossing, and clearance margin;
- Worker request/result state, recent-failure cache state, and whether the last valid route matched the request;
- the most recent rejected Worker or Foundry-constrained candidate.

The primary artifact is the debounced rolling file `C:/FoundryData.14/Data/modules/anyfinder-next/storage/anyfinder-next-debug-latest.json`. It contains the retained gridless traces, failure digest, and cross-grid path captures, and is rewritten about 1.2 seconds after diagnostic activity stops. This keeps normal debugging filesystem-first and avoids DevTools/CDP collection. Only a GM client writes the file, and Foundry's persistent module storage keeps it across module updates. If the running Foundry server has not yet reloaded the module's `persistentStorage` manifest flag, the writer automatically uses `C:/FoundryData.14/Data/modules/anyfinder-next/debug/anyfinder-next-debug-latest.json` instead; the JSON records the actual path in `relativePath`.

The console helpers remain available for focused inspection: `anxDebugGetLastBlockedMovement()`, `anxDebugExplainLastFailure()`, and `anxDebugWriteSessionLog()`. Full console trace emission occurs only when the diagnostic detail setting is **Full**.

## Optimization priorities

1. Share one generated search core between Worker and main thread to eliminate semantic drift.
2. Port the Worker's heap to the synchronous implementation.
3. Extend the Worker's wall spatial hash to the synchronous fast-path and bootstrap collision checks.
4. Add local adaptive refinement near failed endpoints and narrow passages.
5. Add generation-based cancellation if stable-target scheduling does not sufficiently reduce obsolete Worker work.
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
