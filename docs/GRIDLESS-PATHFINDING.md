# Gridless Pathfinding Design and Edge-Case Study

## Contract

Gridless Anyfinder computes a polyline for a token center through a 2D scene. It is wall-aware and token-size-aware, but it is not currently Region-, fog-, elevation-, or terrain-cost-aware. The result format excludes the current start point and preserves the requested destination as the final waypoint.

The normal execution path is asynchronous in `dist/anyfinder-gridless-worker.js`. `dist/anyfinder-next.js` contains a synchronous equivalent for the initial bounded bootstrap and environments where Workers are unavailable.

## Geometry model

### Blocking walls

The main thread extracts wall endpoints and axis-aligned bounds. Walls whose movement sense is `NONE` are excluded. Open doors are excluded; closed and locked doors remain obstacles. Directional wall semantics are not represented in the gridless payload.

### Token clearance

The token is approximated as a circle based on its larger scaled pixel dimension:

```text
effective clearance = max(
  minimum center clearance,
  token radius - (squeeze enabled ? squeeze leeway : 0)
)
```

The exact-fit tolerance is subtracted during collision checks to prevent floating-point/tangent noise from closing nominally exact passages. A bounded endpoint guard accounts for extra corner reach. This is conservative for some shapes and permissive for others because rotated or non-circular footprints are reduced to one scalar radius.

### Collision tests

A point is blocked when it lies outside `sceneRect` or falls within effective clearance of a blocking wall segment. An edge is blocked when the minimum distance between the movement segment and a wall segment violates clearance. Axis-aligned bounds eliminate obviously distant walls before exact segment-distance checks.

## Node algorithm

### 1. Sample the scene

A regular rectangular lattice covers `sceneRect`. The configured spacing defaults to 40 px. If the grid would exceed 20,000 nodes, spacing increases until the budget is met, up to a hard maximum.

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

### 7. Retry with alternate resolutions

If a solve fails, the retry ladder changes node step, corner scale, iteration allowance, and time allowance. Coarser graphs reduce work and can recover long routes; finer rescue steps can recover narrow passages. Interactive mode uses a shorter ladder to protect drag responsiveness.

## Interactive scheduling

Each token has at most one in-flight Worker request. New drag targets replace the queued payload, so obsolete queued work is coalesced. Completed routes are accepted for up to five seconds and for target drift between 24 and 160 px, scaled by node step.

That wider window fixes the principal “straight line first / never gets the node path” defect. The former 1.5–4 px target tolerance was smaller than ordinary pointer movement between frames, so valid Worker answers were routinely thrown away.

Wider reuse is protected by four gates:

1. start-point proximity;
2. target-point proximity;
3. exact scene ID, wall revision, token size, and solver-setting fingerprint;
4. collision validation against current walls immediately before return.

For the first request after invalidation, the main thread performs one bounded interactive solve per token while the Worker builds its graph. This avoids presenting a straight native route into a wall. Later frames return to Worker-first behavior; the bootstrap marker is cleared whenever geometry/settings or the canvas lifecycle invalidates routing state.

## Failure modes and edge cases

### Token starts inside wall clearance

Projection finds a graph node quickly, but connecting the real token center to that node may still intersect the expanded wall. Simply ignoring the first collision is unsafe because the token might be on the opposite side. The current egress validator requires:

- no crossing of the physical wall centerline;
- nondecreasing sampled distance, with net improvement, from every wall currently overlapped;
- no new wall overlap;
- a fully clear first waypoint and normal validation from there onward.

The sampling makes this a pragmatic rather than analytic proof. Exact contact with a physical wall is rejected because its side is ambiguous.

### Narrow corridors and exact fits

A corridor can be geometrically passable yet contain no sampled centerline nodes. Fine-step retries help, but the 20,000-node budget can force a coarser step on large maps. A local refinement patch around failed attachment/search areas would give better narrow-passage fidelity than globally shrinking the lattice.

### Wall endpoints and diagonal pinches

Endpoint guards and the no-corner-cut rule prevent many “cut around the wall cap” artifacts. However, multiple walls meeting with subpixel gaps remain sensitive to tolerance. Fixtures should cover T-junctions, acute angles, nearly coincident endpoints, and closed doors embedded in longer walls.

### Target moves while Worker solves

The returned route is re-anchored to the current target. The final collision check rejects an unsafe new final segment. Very large target changes exceed the reuse window and wait for a newer solve.

### Scene or wall changes in flight

Every mutation increments `wallRevision` and clears main-thread result maps. The Worker echoes revision and fingerprint; mismatches are rejected. Teardown terminates the Worker, preventing old-scene results from repopulating state.

### No route

The solver reports a reason and may reuse a very recent legal path. Otherwise it uses Foundry's native constraint result. The one-time bootstrap specifically reduces the unsafe-looking native straight preview during cold Worker startup; native fallback is still the final compatibility path after genuine failures.

## Optimization priorities

1. Share one generated search core between Worker and main thread to eliminate semantic drift.
2. Port the Worker's heap to the synchronous implementation.
3. Add a uniform spatial hash for walls and use it in mask, edge, and simplification checks.
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
- maps at and above the 20,000-node budget;
- multi-waypoint and long-route retry behavior.
