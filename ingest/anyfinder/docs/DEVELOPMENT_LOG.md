# anyfinder DEVELOPMENT_LOG

## Purpose

AI memory for generic Foundry pathfinding implementation, compatibility
constraints, and system-coupling removal decisions.

## 2026-02-19T12:05:00Z - Initial Creation From Wayfinder Fork

- Created new module `anyfinder` from `wayfinder` baseline.
- Converted module identity and localization namespace from `wayfinder` to
  `anyfinder`.
- Removed PF2e-only coupling:
  - deleted `relationships.systems` lock to `pf2e` in manifest.
  - replaced `game.settings.get("pf2e", "gmVision")` usage with
    system-agnostic visibility logic.
- Kept generic pathfinding runtime wiring:
  - wraps `Token.findMovementPath` via `lib-wrapper`
  - scene control toggle for pathfinding
  - fog exploration restriction setting
  - wall create/update/delete synchronization
- Switched runtime entrypoint to `dist/anyfinder.js` and removed stale
  source-map trailer from generated bundle.

## Open Risks

- Runtime behavior not yet validated in a live world session after module
  rename/fork.
- Bundle is inherited from compiled upstream artifact; future changes should
  move toward a source-available build pipeline for maintainability.

## 2026-02-19T12:12:00Z - Namespace Collision Hardening

- Updated runtime canvas namespace usage from `canvas.wayfinder` to
  `canvas.anyfinder`.
- Reason: avoid state collisions if `wayfinder` and `anyfinder` are both
  installed/enabled in the same world.
- Also removed stale `sourceMappingURL` trailer from `dist/anyfinder.js` to
  avoid browser sourcemap 404 noise.

## 2026-02-19T12:18:00Z - Release Metadata Confirmation + .skills Sync

- Confirmed module manifest metadata:
  - `id`: `anyfinder`
  - `version`: `13.0.0`
  - maintainer/author: `Apostol Apostolov`
- Removed stale fork leftovers from `anyfinder/dist`:
  - `wayfinder.js`
  - `wayfinder.js.map`
- Synced working-tree module to public repo path:
  - `.skills/modules/anyfinder`

## 2026-02-19T12:27:00Z - Product Review + Future Backlog Created

- Reviewed current `anyfinder` runtime behavior from a power-DM/power-user
  perspective.
- Identified key gaps in:
  - reliability/fallback behavior
  - per-scene/per-token GM controls
  - tactical route feedback and movement cost configurability
  - ecosystem API surface and long-term maintainability
- Added structured backlog document:
  - `.skills/logs/anyfinder/TODO.md`
- Backlog organized into P0/P1/P2 with milestone outcomes and acceptance focus
  for future implementation tracking.

## 2026-02-19T12:40:00Z - Milestone A Implemented (P0 Reliability/Safety)

- Implemented graceful fallback behavior when `lib-wrapper` is unavailable or
  wrapper registration fails.
- Added settings hardening:
  - `anyfinderGetBoolSetting(...)` safe accessor with defaults.
  - normalization pass to repair malformed non-boolean setting values.
- Added defensive pathfinding fallback pipeline:
  - wrapped pathfinding path with try/catch and native fallback.
  - resilient handling for non-promise/invalid backend return values.
- Added world-level debug setting:
  - `anyfinder.settings.debugMode` + localized strings.
  - module-prefixed debug logging (`Anyfinder | ...`) gated by setting.
- Cleaned delete-wall hook tail by removing stray no-op document reference.

## Milestone A Status

- P0 checklist completed in `TODO.md`.
- Remaining work is now Milestone B/P1 and beyond.

## 2026-02-19T13:05:00Z - P1 Region-Cost Planning Expanded (Docs Only)

- Expanded `.skills/logs/anyfinder/TODO.md` under P1 with concrete planning for
  Foundry v12+ Region movement costs.
- Documented a non-invasive integration approach:
  - inject custom cost via `TokenDocument.measureMovementPath(..., { cost })`
  - keep Anyfinder Rust path search untouched for this milestone.
- Added explicit fallback, compatibility, hook, and UX acceptance notes.
- No runtime/module code changes made in this pass.

## 2026-02-19T13:25:00Z - Public GitHub Repository Bootstrap

- Created a dedicated public GitHub repository:
  `https://github.com/apoapostolov/Anyfinder-for-Foundry-VTT`.
- Synced module source from `.skills/modules/anyfinder` into local public
  workspace: `git-public/Anyfinder-for-Foundry-VTT`.
- Updated manifest metadata for standalone distribution in both source and
  public workspace copies:
  - `url`
  - `manifest`
  - `download`
  - `readme`
  - `bugs`
- Initialized git in `git-public/Anyfinder-for-Foundry-VTT`, created initial
  commit, and pushed `main` to origin.
- Public initial commit:
  - hash: `646cbc9`
  - message: `Initial public release: Anyfinder v13.0.0`

## 2026-02-19T13:40:00Z - Public Repo Docs and Metadata Pass

- Updated public standalone repository docs in
  `git-public/Anyfinder-for-Foundry-VTT`:
  - expanded `README.md` with feature breakdown, requirements, configuration,
    install manifest URL, archive URL, and compatibility notes.
  - added release badges/shields (Foundry version, module version, MIT, manifest,
    issues).
  - added `CHANGELOG.md` with initial `13.0.0` entry.
- Updated `module.json` in the public repo to include `changelog` URL field.
- Updated `LICENSE` copyright holder metadata to:
  `Copyright (c) 2026 Apostol Apostolov`.
- Set GitHub repository description (~288 chars) via `gh repo edit`.
- Committed and pushed public repo changes:
  - commit: `012726f`
  - message: `Docs: expand README, add changelog, badges, and MIT metadata`

## 2026-02-19T13:50:00Z - Gridless Walls Backlog Expansion (Docs Only)

- Expanded `.skills/logs/anyfinder/TODO.md` with a dedicated design block for
  gridless wall navigation using scale-aware token footprint.
- Captured explicit requirement that token footprint includes size and scale
  (`1x1` with scale `1.25` treated as larger collider).
- Added configurable squeeze/leeway backlog items for controlled minor clipping
  in tight corridors, plus planned constraints and acceptance criteria.
- No module runtime code changes made in this pass.

## 2026-02-19T14:25:00Z - Gridless Wall-Aware Pathfinding (Worktree Implementation)

- Implemented gridless routing in `anyfinder/dist/anyfinder.js` using a
  JavaScript fallback A* layer when `canvas.grid.isGridless` is true.
- Previous behavior hard-disabled pathfinding on gridless scenes.
- New gridless route pipeline:
  - derives token footprint radius from token width/height and texture scale
    (`scaleX`/`scaleY`) in pixel space.
  - applies wall clearance as `max(0, tokenRadius - squeezeLeewayPx)`.
  - builds a sampled node graph over `sceneRect` using configurable step size.
  - rejects nodes/edges that violate wall clearance via segment-distance checks.
  - runs bounded A* and post-processes with line-of-sight path simplification.
  - preserves original destination waypoint payload on segment endpoints.
- Added gridless world settings:
  - `gridlessAllowSqueeze` (boolean)
  - `gridlessSqueezeLeewayPx` (number, 0..100)
  - `gridlessNodeStepPx` (number, 16..160)
- Added localization strings in `anyfinder/languages/en.json` for new settings.
- Updated setting normalization logic to handle both boolean and numeric
  settings.
- Updated runtime gate logic:
  - `anyfinderShouldUsePathfinding(...)` no longer excludes gridless scenes.
  - `anyfinderFindPathWithFallback(...)` branches:
    - gridless -> JS A* router
    - gridded -> wasm backend (`canvas.anyfinder`)
    - any failure -> native Foundry movement fallback.

### Verification

- `node --check anyfinder/dist/anyfinder.js` passed.
- `jq empty anyfinder/languages/en.json` passed.

### Known Technical Tradeoffs

- Gridless route quality/perf depends on `gridlessNodeStepPx`; smaller values
  route better around thin obstacles but increase CPU cost.
- Wall semantics are currently movement-block centric (`move` + door open state);
  directional/special wall behavior is not yet modeled in this pass.

## 2026-02-19T14:45:00Z - Gridless Performance Pass (Safety-First)

- Applied low-risk optimizations only; pathing behavior and fallback logic remain
  unchanged.
- Added runtime cache for gridless static scene data:
  - sampled node coordinates by `gridlessNodeStepPx`
  - blocking wall segment list
  - per-clearance walkability mask (`Uint8Array`) keyed by rounded clearance
- Result: avoids rebuilding full node coordinates and walk mask on every drag
  recalculation when scene/walls/settings are unchanged.
- Added cache invalidation on:
  - `canvasReady`
  - `canvasTearDown`
  - `createWall`
  - `updateWall`
  - `deleteWall`
- Replaced linear `z.includes(u)` checks in A* with `Set` membership for
  goal-attach nodes.

### Intentionally Not Changed (Risk Control)

- Did not change A* algorithm structure, neighbor policy, or simplification
  semantics.
- Did not introduce priority-queue refactor (deferred due to higher regression
  risk).
- Did not alter wall collision rules, door filtering, or squeeze logic.

### Verification

- `node --check anyfinder/dist/anyfinder.js` passed.

## 2026-02-19T15:05:00Z - Global Force Pathfinding Setting

- Added new world-level setting:
  - `forcePathfindingAllPlayers` (default `true`)
  - purpose: global enable switch that forces Anyfinder pathfinding on for all
    players.
- Added helper `anyfinderIsPathfindingEnabledForUser()` to compute effective
  enabled state:
  - `forcePathfindingAllPlayers || enablePathfinding`
- Wired helper into runtime gate:
  - `anyfinderShouldUsePathfinding(...)` now uses effective enabled state.
- Wired helper into scene control UI state:
  - pathfinding tool `active` reflects effective global/user state.
- Added localization strings:
  - `anyfinder.settings.forcePathfindingAllPlayers.name`
  - `anyfinder.settings.forcePathfindingAllPlayers.hint`

### Verification

- `node --check anyfinder/dist/anyfinder.js` passed.
- `jq empty anyfinder/languages/en.json` passed.

## 2026-02-19T15:20:00Z - Squeeze Default Off + Wall-Adjacent Endpoint Handling

- Changed gridless squeeze default to OFF:
  - `ANYFINDER_SETTING_DEFAULTS.gridlessAllowSqueeze = false`
  - setting registration default for `gridlessAllowSqueeze` set to `false`
- Goal: conservative collision behavior by default unless GM explicitly enables
  squeeze leeway.

- Improved gridless routing behavior when token start/goal is very close to (or
  partially overlapping) a wall:
  - removed hard abort when start or goal point is blocked by clearance.
  - added progressive endpoint attach attempts for start/goal graph connection
    with relaxed attach clearance only (`clearance`, then `clearance-2`, then
    `clearance-6`, clamped at `0`).
- Rationale: prevents immediate fallback to native direct movement in near-wall
  edge cases during drag updates, while keeping main path graph and wall rules
  unchanged.

### Verification

- `node --check anyfinder/dist/anyfinder.js` passed.

## 2026-02-19T15:40:00Z - Gridless Wall-Overlap Trigger + Slowdown Fix

- Addressed regression where dragging with token center barely across a wall could
  still produce a direct line and delayed reroute.
- Addressed slowdown when start/goal was inside wall clearance zone.

### Runtime Changes

- Added blocked-endpoint detection for segment solve:
  - `startBlocked = anyfinderIsPointBlocked(start, ...)`
  - `goalBlocked = anyfinderIsPointBlocked(goal, ...)`
- Direct segment fast-path now requires both endpoints unblocked:
  - no direct `[start, goal]` return if either endpoint is blocked.
- Added blocked-endpoint attachment strategy:
  - when start/goal is blocked, attach to nearest walkable graph nodes without
    expensive strict edge-filter prechecks (`anyfinderFindNearestWalkableNodeIdx`).
  - allows immediate graph engagement instead of repeated failed attach probes.
- Kept normal strict attach behavior for unblocked endpoints (with progressive
  fallback clearances) to preserve previous routing behavior.
- For blocked start only, first hop from virtual start to attach node bypasses
  strict edge blocking check to allow escape from overlap state.

### Performance Intent

- Reduce expensive failed endpoint edge checks in overlap scenarios.
- Avoid large repeated search churn before fallback when token is partially
  crossing wall boundary.

### Verification

- `node --check anyfinder/dist/anyfinder.js` passed.

## 2026-02-19T16:00:00Z - Rollback: Remove Near-Wall Partial-Crossing Changes

- Reverted runtime behavior to the state before the "Near-wall partial-crossing
  behavior improved" pass.
- Rolled back `anyfinder/dist/anyfinder.js` changes introduced in the near-wall
  patch and the follow-up blocked-endpoint overlap patch.

### Reverted Items

- Removed blocked-endpoint special attach logic and related helper used for
  wall-overlap recovery.
- Restored previous gridless segment flow:
  - hard abort when start/goal is blocked by clearance
  - strict endpoint edge filtering only
  - progressive attach fallback (`clearance`, `clearance-2`, `clearance-6`)
- Restored `gridlessAllowSqueeze` defaults back to pre-near-wall state:
  - runtime default `true`
  - setting registration default `true`

### Verification

- `node --check anyfinder/dist/anyfinder.js` passed.

## 2026-02-19T16:20:00Z - Center-Cross Trigger Experiment (Lightweight)

- Implemented a minimal endpoint recovery strategy for gridless pathing to
  improve behavior when token center is just across a wall.
- Added helper `anyfinderNudgeBlockedStartPoint(...)`:
  - if start center is blocked by clearance, nudge start forward toward target
    in small fixed steps until unblocked (or capped distance).
- Integrated in `anyfinderFindGridlessSegmentPath(...)`:
  - use `mStart` (nudged start) for direct-edge test, endpoint attach search,
    and A* virtual start node.
  - kept existing solver logic unchanged otherwise.

### Scope/Risk Control

- Only start-point handling changed; goal handling, wall semantics, and A*
  structure unchanged.
- Chosen to avoid prior heavy overlap logic that caused slowdown.

### Verification

- `node --check anyfinder/dist/anyfinder.js` passed.

## 2026-02-19T16:35:00Z - Earlier Trigger Tuning (Few-Pixels Through Wall)

- Added early-trigger bias for gridless start handling to make reroute engage
  when token has only slightly crossed a wall boundary.

### Runtime Additions

- `anyfinderGetPointWallDistance(point, walls)`
  - computes nearest wall distance for a point.
- `anyfinderGetBiasedStartPoint(start, goal, clearance, walls, sceneRect)`
  - if start is near walls (`distance <= clearance + bias`), shift start forward
    toward drag direction by a small bias (`~20% of clearance`, clamped 4..24 px).
- `anyfinderFindGridlessSegmentPath(...)`
  - now uses `BStart = anyfinderGetBiasedStartPoint(...)` before
    `anyfinderNudgeBlockedStartPoint(...)`.

### Intent

- Trigger wall-aware reroute earlier (few-pixel overlap) without restoring the
  heavy overlap-resolution logic that caused slowdowns.

### Verification

- `node --check anyfinder/dist/anyfinder.js` passed.

## 2026-02-19T16:50:00Z - Revert + Start-Only Clearance Trigger Tuning

- Reverted prior forward-bias start experiment (`anyfinderGetBiasedStartPoint` /
  wall-distance bias) due no meaningful behavior improvement.

### New Attempt (Current)

- Kept algorithm/perf structure unchanged, but decoupled **start endpoint**
  probing from full token clearance:
  - introduced `mStartProbeClearance = min(fullClearance, 4px)`.
  - start unblock nudge now uses this probe clearance.
  - start attach edge checks now use probe-clearance progression
    (`probe`, `probe-2`, `probe-4`), clamped to `0`.
- Full token clearance is still used for goal and full route validation.

### Intent

- Make path recalculation engage when center is just a few pixels past a wall,
  instead of waiting for deep overlap distance tied to full token clearance.
- Avoid heavy overlap recovery logic that previously caused lag.

### Verification

- `node --check anyfinder/dist/anyfinder.js` passed.

## 2026-02-19T17:00:00Z - Rollback: Start-Only Clearance Probe Attempt

- Reverted the start-only probe-clearance trigger tuning introduced at
  `2026-02-19T16:50:00Z`.
- Removed `mStartProbeClearance` path and restored previous start endpoint
  handling using full active clearance.

### Restored Behavior

- `anyfinderNudgeBlockedStartPoint(...)` uses full clearance.
- Start-blocked gate uses full clearance.
- Start attach edge checks use full-clearance progression (`clearance`,
  `clearance-2`, `clearance-6`).

### Verification

- `node --check anyfinder/dist/anyfinder.js` passed.

## 2026-02-19T17:20:00Z - Rollback to Last Confirmed-Good Baseline

- Reverted additional center-cross trigger experiments to restore prior stable
  behavior after user report that long-path calculation regressed.

### Reverted in Runtime

- Removed start-point nudge helper and all related `mStart` route plumbing.
- Restored gridless segment solver start handling to direct `start` point (`A`)
  across:
  - blocked-start checks
  - direct-edge short-circuit
  - attach-node search and fallback
  - A* virtual start node mapping

### Resulting Intent

- Return to the last confirmed-good baseline behavior (before recent endpoint
  trigger experiments) so long paths compute reliably again.

### Verification

- `node --check anyfinder/dist/anyfinder.js` passed.

## 2026-02-19T17:40:00Z - Gridless Large-Map Reliability Fix (Stops on Long/Curvy Paths)

- Investigated report: gridless routing stops on huge maps with many turns.
- Root causes in runtime:
  - hard scene node budget abort at fixed `20,000` nodes with no fallback
  - fixed A* iteration cap (`15,000`) too low for long/curvy traversals

### Implemented Changes

- Added `anyfinderGetGridlessSceneDataWithFallback(step)`:
  - if requested step exceeds node budget, automatically retries with coarser
    step sizes up to `160px`.
  - logs fallback step via debug logger when degradation happens.
- Updated `anyfinderFindGridlessSegmentPath(...)` to use fallback resolver and
  step actually used by scene data.
- Made A* iteration cap adaptive to graph size:
  - `maxIterations = max(15000, min(250000, nodes * 8))`
  - preserves safety ceiling while allowing complex routes on larger maps.
- Added debug log when cap is reached to aid future diagnosis.

### Expected Outcome

- Fewer premature stops on large/circuitous maps.
- Better chance of obtaining a route by auto-coarsening graph before aborting.

### Verification

- `node --check anyfinder/dist/anyfinder.js` passed.

## 2026-02-19T11:29:45Z - Gridless Long-Route Reliability Patch (Post-Rollback)

- User reported gridless routes still stopping on huge maps after rollback to
  pre-close-wall behavior.
- Confirmed runtime was already back to baseline close-wall logic (no nudge/
  bias helpers), so issue scope was solver limits on large scenes.

### Runtime Changes

- Added safe node-budget degradation in `anyfinderGetGridlessSceneData(step)`:
  - if sampled grid exceeds `20,000` nodes, step is increased in `+8px`
    increments (capped at `160px`) until within budget.
  - stores actual sampled step in returned scene data (`sceneData.step`).
- Updated segment solver to use effective sampled step (`sceneData.step`) for
  nearest-node attach radius calculations.
- Increased A* traversal headroom in `anyfinderFindGridlessSegmentPath(...)`:
  - replaced fixed `15,000` iteration cap with adaptive
    `max(15,000, min(250,000, nodes * 8))`.
  - added debug log when iteration cap is reached.

### Safety Notes

- No changes to wall-collision semantics, endpoint blocked behavior, squeeze
  mechanics, or native fallback path.
- This pass only adjusts graph density fallback and search budget sizing.

### Verification

- `node --check anyfinder/dist/anyfinder.js` passed.

## 2026-02-19T11:36:04Z - Nearest Wall-Edge Reroute on Wall Crossing

- Implemented explicit wall-cross behavior for gridless routing: when a direct
  segment crosses/presses against walls, attach search is now biased toward the
  nearest endpoint of the blocking wall(s).

### Runtime Changes

- Added `anyfinderGetBlockingWallsForSegment(start, goal, walls, clearanceSq)`
  to identify walls interfering with the attempted direct segment.
- Added `anyfinderGetNearestWallEndpoint(point, walls)` to select the closest
  wall edge endpoint for reroute anchoring.
- Updated `anyfinderFindGridlessSegmentPath(...)`:
  - removed hard abort when start/goal lies inside wall-clearance.
  - when blocked direct walls are detected, start/goal attach search points are
    shifted to nearest blocking-wall endpoints.
  - direct-line shortcut is now skipped when start or goal is blocked, forcing
    route search around wall edges.
  - for blocked endpoints only, endpoint-to-node edge checks use slightly
    relaxed clearance (`clearance - 4`) to escape immediate overlap and engage
    the graph.

### Intent

- If token crosses a wall line by a few pixels, pathfinding should reroute
  around the closest wall edge immediately instead of stalling/falling back to
  straight-line behavior.

### Verification

- `node --check anyfinder/dist/anyfinder.js` passed.

## 2026-02-19T11:44:35Z - Rollback: Nearest Wall-Edge Attach Strategy

- Reverted the wall-cross nearest-edge anchoring experiment due to severe
  slowdowns when path segments intersected many walls.

### Reverted Runtime Pieces

- Removed `anyfinderGetNearestWallEndpoint(...)`.
- Removed `anyfinderGetBlockingWallsForSegment(...)`.
- Restored gridless segment solver endpoint flow:
  - hard abort when start or goal is blocked by clearance.
  - attach search anchored to original start/goal points (no wall-endpoint
    bias).
  - standard clearance progression only (`clearance`, `clearance-2`,
    `clearance-6`).

### Preserved

- Kept earlier large-map reliability improvements:
  - dynamic gridless step coarsening under node budget pressure.
  - adaptive A* iteration cap.

### Verification

- `node --check anyfinder/dist/anyfinder.js` passed.

## 2026-02-19T11:48:29Z - Partial Release Packaging and Repo Sync (v13.0.0)

- User accepted current state as partial implementation because long walks are
  stable again.
- Kept module version at `13.0.0` (no release bump in this pass).

### Distribution Updates

- Synced current runtime build from worktree module to:
  - `.skills/modules/anyfinder/dist/anyfinder.js`
  - `git-public/Anyfinder-for-Foundry-VTT/dist/anyfinder.js`
- Updated public docs to match current behavior:
  - `README.md` now documents experimental gridless support and reliability
    characteristics.
  - `CHANGELOG.md` now includes an `Unreleased` section for this partial pass.
- Synced public module metadata/docs back into `.skills/modules/anyfinder`
  (`README.md`, `CHANGELOG.md`, `module.json`) to keep source/public parity.

### Notes

- Reverted nearest-wall-edge reroute experiment remains reverted due to
  multi-wall slowdown; long-route reliability improvements are retained.

## 2026-02-19T11:50:23Z - Fix: Corner-Safe Token Clearance Radius

- Reported issue: path line uses token center and could route too close to hard
  wall corners, causing larger token footprint to clip/get stuck.
- Root cause: `anyfinderGetTokenRadiusPx(...)` used `max(width,height)/2`, which
  models a side-midpoint radius, not the true corner distance of the token
  footprint.

### Runtime Fix

- Updated token radius computation to use half-diagonal (circumradius):
  - from: `Math.max(widthPx, heightPx) / 2`
  - to: `Math.hypot(widthPx / 2, heightPx / 2)`

### Effect

- Gridless clearance checks now protect token corners, not just center-to-side
  distance.
- Reduces corner clipping/sticking when routing around hard wall corners.

### Verification

- `node --check anyfinder/dist/anyfinder.js` passed.

## 2026-02-19T11:52:35Z - Revert: Global Corner Radius Increase

- Reverted the prior change that switched token clearance radius to
  half-diagonal (`Math.hypot(width/2, height/2)`).
- User reported immediate regression: pathfinding quality dropped and routes
  failed in cases that previously worked.

### Why It Failed

- Applying corner-safe circumradius globally over-constrained all edge checks,
  not only hard-corner traps.
- This reduced route availability in normal corridors and produced a practical
  regression.

### Restored

- `anyfinderGetTokenRadiusPx(...)` back to:
  `Math.max(widthPx, heightPx) / 2`

### Next Safer Direction

- Keep baseline radius for general routing.
- Add a targeted hard-corner guard only near wall endpoints/intersections, so
  corner trapping is prevented without globally inflating clearance.

## 2026-02-19T11:56:13Z - Targeted Hard-Corner Guard (Endpoint-Only)

- After checkpointing stable baseline, implemented a safer corner-trap fix that
  avoids global clearance inflation.

### Design

- Keep baseline token radius (`max(width,height)/2`) for normal routing.
- Add extra clearance only around wall endpoints, derived from token corner
  geometry:
  - `cornerExtra = circumradius - sideRadius`
  - apply capped guard: `endpointGuard = min(cornerExtra, clearance * 0.6)`

### Runtime Changes

- Added `anyfinderGetTokenCornerExtraPx(token)`.
- Extended `anyfinderIsPointBlocked(...)` and `anyfinderIsEdgeBlocked(...)` with
  optional endpoint guard parameter.
- Endpoint guard applies only to wall endpoints (`a`/`b`) while retaining the
  original wall-segment clearance logic.
- Updated gridless walk-mask cache key to include both clearance and endpoint
  guard.
- Updated gridless solver calls to pass endpoint guard through:
  - start/goal blocked checks
  - direct-edge test
  - attach-node candidate filtering
  - A* edge expansion
  - post-simplification edge checks
- Updated edge-block cache key to include clearance and endpoint guard values to
  avoid cross-threshold cache contamination.

### Verification

- `node --check anyfinder/dist/anyfinder.js` passed.

### Expected Outcome

- Reduce hard-corner clipping/sticking behavior while preserving route
  availability better than full global diagonal-radius inflation.

## 2026-02-19T12:00:38Z - Tune: Limit Corner Guard Scope for Long-Route Recovery

- User feedback: after targeted corner-guard implementation, long computed
  routes became too short on complex maps.
- Root cause: endpoint guard was still being applied too broadly (walk mask,
  interior edge checks, and simplification), over-constraining graph traversal.

### Adjustments

- Reduced guard strength cap:
  - from `min(cornerExtra, clearance * 0.6)`
  - to `min(cornerExtra, clearance * 0.35)`
- Removed endpoint guard from global walk-mask generation:
  - walk mask now uses `endpointGuard = 0`.
- Edge guard now only applies on start/goal-adjacent transitions:
  - when expanding from virtual start (`u === startVirtual`) or to virtual goal
    (`ke === goalVirtual`).
  - interior node-to-node traversal uses guard `0`.
- Path simplification now runs without endpoint guard to preserve route length
  and avoid post-A* over-pruning.

### Expected Outcome

- Keep anti-corner-stick improvement near endpoints.
- Restore ability to compute long, complex-map routes.

### Verification

- `node --check anyfinder/dist/anyfinder.js` passed.

## 2026-02-19T12:09:19Z - Gridless Stability Pass (Do-Not-Drop Routing)

Implemented a comprehensive anti-drop gridless reliability pass to keep pathing
active during drag under difficult conditions.

### 1) Removed Hard Start/Goal Abort

- Replaced hard fail on blocked start/goal with projection to nearest walkable
  gridless node (`anyfinderFindNearestWalkableNodeIdx`).
- Segment solve now proceeds even when endpoint centers are blocked by wall
  clearance.

### 2) Multi-Tier Solve Fallback

- Added per-path attempt tiers in `anyfinderFindGridlessPath(...)` with staged
  options:
  - increasing step (`base`, `+12`, `+24`, `+36`)
  - reducing corner guard scale (`0.35 -> 0`)
  - increasing endpoint relax (`0 -> 6`)
  - increasing iteration/time budgets
- Attempts are deduplicated by option signature.

### 3) Sticky Last-Valid Path Reuse

- Added token-scoped cache `anyfinderGridlessLastPathCache`.
- On gridless failure, if token has a recent valid path (`<= 400ms`), return it
  instead of dropping immediately to native straight fallback.
- Cache is cleared on gridless invalidation events (`anyfinderInvalidateGridlessCache`).

### 4) Adaptive Attach Candidate Expansion

- Added `anyfinderFindAttachCandidates(...)`:
  - first uses normal localized attach search.
  - if empty, falls back to nearest globally walkable candidates filtered by
    edge-block test (up to 24 candidates).

### 5) Time-Budgeted A*

- Added time budget gate in A* loop (checked every 64 iterations) in addition to
  iteration cap.
- Failure reasons now include `time_cap_hit` and `iter_cap_hit`.

### 6) Conservative Simplification

- Path simplification retained with endpoint guard disabled (`guard=0`) to avoid
  post-solve over-restriction.

### 7) Failure Telemetry

- Added explicit reason codes through the pipeline:
  - `scene_data_unavailable`
  - `start_blocked_no_node`
  - `goal_blocked_no_node`
  - `no_attach_start`
  - `no_attach_goal`
  - `time_cap_hit`
  - `iter_cap_hit`
  - `no_route`
- Added debug logs for full-attempt failure and sticky-path reuse.

### Verification

- `node --check anyfinder/dist/anyfinder.js` passed.

## 2026-02-19T12:19:06Z - Leeway Clamp Model for Gridless Center-Collision

- User reported that squeeze/leeway became counterproductive: high leeway let
  center collision enter wall clusters and caused immediate stuck behavior near
  many edges.

### Runtime Changes

- Added new numeric default/setting:
  - `gridlessMinCenterClearancePx` (default `4`, range `0..32`)
- Updated effective gridless clearance computation in segment solver:
  - from: `clearance = max(0, radius - leeway)`
  - to: `clearance = max(minCenterClearancePx, radius - leeway)`
- Result: squeeze/leeway can reduce collision radius, but never below the
  configured minimum center-clearance floor.

### Settings/UI

- Registered world setting in runtime settings panel:
  - `anyfinder.settings.gridlessMinCenterClearancePx.*`
- Updated localization text for leeway to clarify it is now clamped by minimum
  center clearance.

### Files Updated

- `anyfinder/dist/anyfinder.js`
- `anyfinder/languages/en.json`

### Verification

- `node --check anyfinder/dist/anyfinder.js` passed.
- `jq empty anyfinder/languages/en.json` passed.

## 2026-02-19T12:26:02Z - Strict Whole-Token Clearance Semantics (No Hidden Relax)

- Follow-up to user report that token center still entered dense wall-edge
  clusters during long drags.

### Changes

- Removed hidden clearance relaxation during attach/goal-link phases in
  `anyfinderFindGridlessSegmentPath(...)`.
- Attach candidate filtering now uses the same effective collision clearance as
  the rest of the solver (`effectiveClearance = max(minCenterClearance,
  radius - leeway)`).
- Goal-connect edge checks now also use full effective clearance.
- Removed `endpointRelax` from multi-tier attempt profiles to avoid implicit
  center-only behavior at higher fallback tiers.

### Resulting Leeway Semantics

- Leeway only reduces token collision radius (edge allowance), not center
  penetration.
- Example intent preserved: radius `50`, leeway `8` => effective clearance `42`
  (subject to minimum center-clearance clamp).

### Verification

- `node --check anyfinder/dist/anyfinder.js` passed.

## 2026-02-19T12:36:53Z - Deep Gridless Debug Trace for Stuck/Slow Edge Cases

- Implemented opt-in, high-detail gridless tracing intended for reproducing
  "token tries to pass through/into wall edge" failures and diagnosing slowdown.
- Fixed a regression in prior WIP trace patch where trace context and path result
  were mixed in `anyfinderFindPathWithFallback(...)`.

### Runtime Changes

- Added settings:
  - `gridlessDebugTrace` (world, default `false`)
  - `gridlessDebugMaxTraces` (world, default `200`, min `20`, max `1000`)
- Exposed console helpers:
  - `anyfinderDebugGetTraces()`
  - `anyfinderDebugLastTrace()`
  - `anyfinderDebugClearTraces()`
- Each traced pathfinding call now records:
  - token/scene context
  - all attempt profiles and segment-level outcomes
  - fail reason propagation (`no_attach_start`, `time_cap_hit`, etc.)
  - final outcome (`gridless_success`, `reused_last_valid_path`,
    `native_fallback_after_gridless_fail`)
- Added deep counters for hotspot diagnosis (trace mode only):
  - `pointChecks`
  - `edgeChecks`
  - `edgeCacheHit` / `edgeCacheMiss`
  - `walkMaskCacheHit` / `walkMaskCacheMiss`
  - `walkMaskBuiltNodes`
- Added per-call summary block with aggregate attempts/segments/elapsed time.
- Added native fallback duration in trace finalization for failed gridless paths.

### Why This Matters

- We can now classify whether a bad route is caused by:
  - blocked start/goal projection
  - attach candidate exhaustion near wall clusters
  - A* timeout/iteration exhaustion on complex maps
  - collision check explosion (high edge/point check counts)
  - cache inefficiency (low edge cache hit rate / walk-mask rebuilds)

### Verification

- `node --check anyfinder/dist/anyfinder.js` passed.
- `jq empty anyfinder/languages/en.json` passed.

## 2026-02-19T12:43:33Z - Auto Console Trace Dump + Problem Classifier

- User requested zero manual console commands when trace mode is enabled.
- Updated trace pipeline so every completed trace is automatically emitted to
  browser console.

### Changes

- Added `anyfinderClassifyGridlessTrace(trace)` to label problematic runs with
  diagnostic flags, including:
  - `fallback_after_fail`
  - `reused_last_path`
  - `slow` / `very_slow`
  - `segment_fail:*`
  - `invalid_blocked_point_in_path`
  - `invalid_blocked_segment_in_path`
  - `heavy_edge_checks` / `extreme_edge_checks`
  - `high_cache_miss`
  - `very_low_edge_cache_hit_rate`
  - `expensive_walkmask_build`
- Added `anyfinderEmitGridlessTraceToConsole(trace)` with grouped output:
  - collapsed header with token/outcome/elapsed/flags
  - summary object
  - full trace object
- Wired auto emission from `anyfinderPushGridlessTrace(...)`, so output appears
  automatically whenever `gridlessDebugTrace` is enabled.

### Validation

- `node --check anyfinder/dist/anyfinder.js` passed.

## 2026-02-19T12:47:24Z - Debug Trace Gated by Debug Mode + Settings Order Update

- User requested trace to be part of debug flow instead of standalone behavior.
- Updated runtime gating so gridless trace capture is active only when both are
  enabled:
  - `debugMode = true`
  - `gridlessDebugTrace = true`

### Settings/UI Changes

- Reordered settings registration to keep debug controls at the bottom:
  - `debugMode` (bottom section)
  - `gridlessDebugTrace` (immediately after debug mode)
- Updated localization copy for clarity:
  - `debugMode` is now documented as master switch
  - trace setting renamed in UI to indicate debug dependency

### Verification

- `node --check anyfinder/dist/anyfinder.js` passed.
- `jq empty anyfinder/languages/en.json` passed.

## 2026-02-19T12:50:15Z - Strict Path Validation + Movement Outcome Observation

- Implemented requested hardening for gridless edge cases where trace said
  success but token still collided/stuck.

### 1) Invalid "Success" Paths Are Now Rejected

- Added `anyfinderValidatePathCollision(...)` to re-check returned path points and
  segments against blocking geometry with effective clearance.
- In `anyfinderFindGridlessSegmentPath(...)`:
  - after simplification/path reconstruction, final validation now runs always
  - if blocked point/segment is detected, segment returns
    `reason: "final_path_invalid_collision"` and is treated as failure
- This forces attempt fallback progression instead of returning collision-invalid
  "success" routes.

### 2) Trace Includes Full Settings Snapshot

- Added `anyfinderGetSettingsSnapshot()`.
- `anyfinderBuildGridlessTraceContext(...)` now stores:
  - `settings` (all Anyfinder bool/number settings)
  - `tokenCenterStart`
  - `requestedWaypoints`

### 3) Trace Includes Expected Final Position + Real Movement Outcome

- On successful/reused gridless route, trace now stores:
  - `final.expectedFinalCenter`
  - `final.requestedFinalWaypoint`
  - `final.movementObservation` initialized as `pending_observation`
- Added pending movement tracker map keyed by token id.
- Added `Hooks.on("updateToken", ...)` observer to update movement status:
  - `reached_expected_endpoint`
  - `stalled_near_obstacle`
  - `timeout_not_reached`
  - `likely_edge_conflict`
  - `in_progress`
- Movement observation logs are emitted automatically in console.

### 4) Trace Console Noise Reduction

- Summary still logs for each trace.
- Full trace object now logs only when:
  - classifier has flags, or
  - elapsed time >= 80ms.

### Verification

- `node --check anyfinder/dist/anyfinder.js` passed.

## 2026-02-19T12:52:42Z - Movement Observation Bound to Real Token Updates

- User trace showed `movementObservation` was noisy/misleading (large
  `in_progress` distances) because observation was attached to every preview
  path trace during drag.

### Fix

- Introduced `anyfinderGridlessLatestTraceByToken` map.
- Trace push now remembers latest trace id per token, but does **not** start
  movement observation immediately.
- `Hooks.on("updateToken", ...)` now lazily boots pending movement observation
  from the latest trace only when real token x/y updates begin.
- Pending/Latest state is cleaned on completion and canvas teardown.

### Effect

- Movement outcome reflects committed movement updates rather than drag-preview
  path calculations.
- Removes false high-distance `in_progress` observations caused by preview-only
  traces.

### Verification

- `node --check anyfinder/dist/anyfinder.js` passed.

## 2026-02-19T12:54:25Z - Movement Outcome Classification Tuning (Near Endpoint)

- User reported `timeout_not_reached` at distance ~35px from expected endpoint,
  which is semantically closer to near-obstacle stall.

### Change

- Tuned movement observation classification in `updateToken` hook:
  - added `nearObstacleBandPx = max(36, tolerancePx * 8)`
  - if movement ends/lingers within this near band, classify as
    `stalled_near_obstacle` instead of `timeout_not_reached`
  - keep `timeout_not_reached` for far-distance unresolved movement only
- Added `nearObstacleBandPx` to movement observation payload for visibility.

### Verification

- `node --check anyfinder/dist/anyfinder.js` passed.

## 2026-02-19T12:55:13Z - Suppress Noisy In-Progress Movement Logs

- User reported noisy/misleading movement debug line:
  `in_progress distance=714px`.

### Change

- Removed first-shot `in_progress` movement emission.
- Movement observation is still tracked internally on each `updateToken`, but
  console output is now emitted only for terminal states:
  - `reached_expected_endpoint`
  - `stalled_near_obstacle`
  - `timeout_not_reached`

### Verification

- `node --check anyfinder/dist/anyfinder.js` passed.

## 2026-02-19T12:57:25Z - Revert: Restore In-Progress Movement Emission

- User requested revert after disabling `in_progress` emission.
- Restored one-time initial movement observation console log per movement cycle.
- Implementation restored:
  - `pending.emittedInProgress` flag in pending movement state
  - first `anyfinderEmitMovementObservation(...)` call before terminal-state logging

### Verification

- `node --check anyfinder/dist/anyfinder.js` passed.

## 2026-02-19T13:01:08Z - Copy-Friendly JSON Console Snapshots

- User reported difficulty copying full nested console objects in Chrome/Firefox.

### Change

- Added explicit JSON snapshot logs alongside object logs:
  - Trace emission now logs `Anyfinder Trace JSON #<id>` with
    pretty-printed `JSON.stringify(trace, null, 2)`.
  - Movement emission now logs `Anyfinder Movement JSON #<id>` with
    pretty-printed payload containing movement observation + token update.
- Added serialization failure fallback message so logging still succeeds even if
  a field cannot be serialized.

### Result

- Console output is now copy/paste friendly as plain text JSON for Linux/DevTools
  workflows.

### Verification

- `node --check anyfinder/dist/anyfinder.js` passed.

## 2026-02-19T13:04:37Z - Fix Movement Observation Trace Mismatch on Drag

- User reported `in_progress` with huge distance (~700px), indicating movement
  observation attached to the wrong trace.

### Root Cause

- Pending movement observation fallback was using latest trace id for token,
  which can mismatch the actual `updateToken` destination during frequent drag
  path recomputes.

### Fix

- Added update-target aware matching:
  - `anyfinderGetTokenCenterFromUpdate(tokenDoc, change)` computes center of the
    actual token update target.
  - `anyfinderFindBestTraceForUpdate(tokenDoc, targetCenter)` scans recent traces
    for that token and picks closest `final.expectedFinalCenter`.
  - Trace is accepted only if distance is within reliability bound:
    `max(64, stepPx * 5)`.
- `updateToken` now initializes pending observation from best-match trace first,
  and only then falls back to legacy latest-id behavior.

### Expected Effect

- Prevents large false `in_progress` distances caused by trace/update mismatch.
- Movement observation should now correspond to the route actually being applied.

### Verification

- `node --check anyfinder/dist/anyfinder.js` passed.

## 2026-02-19T13:07:56Z - Fix Stale Observed Center in Movement Debug

- User trace showed mismatch:
  - `tokenUpdate.x/y` near expected endpoint
  - `observedCenter` far away (stale token object center)

### Root Cause

- Movement observation used `canvas.tokens.get(id)` center, which can lag the
  update payload on the same tick.

### Fix

- `updateToken` movement observation now computes `observedCenter` from the
  update payload (`x/y`) via `anyfinderGetTokenCenterFromUpdate(...)`.
- This keeps distance computation aligned with the actual token update event.

### Verification

- `node --check anyfinder/dist/anyfinder.js` passed.

## 2026-02-19T15:20:00Z - Corner-Guard Validation and Trace-Match Hardening

- User reported same edge-collision symptom despite `gridless_success` traces:
  token still enters first wall edge, then repeated `final_path_invalid_collision`
  and fallback/reuse behavior.

### Root Cause

- Final gridless path post-processing did not preserve endpoint corner guard:
  - `anyfinderSimplifyPath(...)` was called with guard `0`.
  - `anyfinderValidatePathCollision(...)` was called with guard `0`.
- Movement observation still allowed legacy trace-id fallback during
  `updateToken`, which could attach updates to stale traces in dense drag loops.

### Change

- Strengthened final segment safety checks:
  - `anyfinderSimplifyPath(...)` now uses `endpointGuardPx` (`x`) instead of `0`.
  - `anyfinderValidatePathCollision(...)` now accepts a guard parameter and is
    called with `endpointGuardPx` (`x`) for final path validation.
- Removed legacy movement matching fallback:
  - `updateToken` now uses only
    `anyfinderEnsurePendingMovementFromLatestTrace(tokenId, tokenDoc, change)`.
  - Deleted `anyfinderLegacyPendingFromLatestId(...)` helper.

### Expected Effect

- Prevents simplification/validation from accepting edge-scraping segments that
  are invalid for token-corner clearance.
- Reduces stale movement-observation mismatches in rapid recompute scenarios.

### Verification

- `node --check anyfinder/dist/anyfinder.js` passed.

## 2026-02-19T13:14:24Z - Safer Dense-Edge Routing Bias

- User reported persistent behavior in dense wall-edge areas: token center still
  prefers unsafe lines that run into chained wall corners/edges.

### Root Cause Hypothesis

- Corner guard was applied inconsistently during graph expansion:
  - stronger guard near start/goal,
  - weaker/no guard on interior candidate edges.
- Retry profile still included low corner scales, allowing routes that are
  technically passable by center but unsafe for full token envelope.

### Change

- Applied corner guard on all edge transitions during graph search, not just
  start/goal attachment transitions.
- Raised default corner-guard fallback in segment solver from `0.35` to `0.75`.
- Updated retry profiles to avoid unsafe low-corner attempts:
  - from `[0.35, 0.25, 0.15, 0.00]`
  - to `[0.75, 0.60, 0.45, 0.35]`.

### Expected Effect

- Pathfinding should route around dense wall-edge clusters more conservatively,
  reducing center-led corner clipping and edge-entry behavior.
- May trade some route permissiveness for safety; failures should surface as
  controlled fallback/reuse traces instead of unsafe direct edge glides.

### Verification

- `node --check anyfinder/dist/anyfinder.js` passed.

## 2026-02-19T13:19:01Z - Near-Wall Sampled Edge Blocking

- User traces still showed dense-edge leakage: planner frequently returned
  `gridless_success` with clean validation, but token could still walk into
  close wall-edge chains (curved walls made from many small wall segments).

### Root Cause Hypothesis

- Segment-vs-wall clearance checks can miss some near-cusp/near-junction cases
  in dense wall clusters, especially on short connector segments.

### Change

- Hardened `anyfinderIsEdgeBlocked(...)` with an additional near-wall sampling
  pass:
  - keep existing capsule distance checks as fast primary gate;
  - if any wall is within a near-wall band (`clearance + 12px`) but not flagged
    blocked by primary checks, sample points along the edge and run
    `anyfinderIsPointBlocked(...)` with the same clearance/guard;
  - if any sampled point is blocked, mark edge blocked.

### Expected Effect

- Rejects false-negative edges near dense wall endpoints/curves before they are
  accepted into the route, reducing center-led wall entry in curved edge packs.
- Minor CPU increase expected near dense walls; low impact in open areas.

### Verification

- `node --check anyfinder/dist/anyfinder.js` passed.

## 2026-02-19T13:22:41Z - Dense Curve-Joint Strict Clearance

- User reported only partial improvement on curved-wall chains: first edges were
  avoided, but later nearby edges in the same curve were still penetrated.

### Root Cause Hypothesis

- Near-wall sampling was active, but in dense endpoint clusters it still used the
  same effective clearance (post-squeeze), allowing center paths that are too
  permissive across successive curve joints.

### Change

- Enhanced near-wall edge guard in `anyfinderIsEdgeBlocked(...)`:
  - Count near-wall proximity hits during pre-check.
  - If segment is near multiple walls (`pCount >= 2`), sample with stricter
    clearance (up to near full-radius behavior):
    `strictClearance = max(effectiveClearance, effectiveClearance + clamp(endpointGuard * 0.4, 2, 8))`.
  - Increased sampling density for near-wall segments (`3..10px` spacing) so
    late-joint crossings are less likely to be missed.

### Expected Effect

- Curved walls formed by many short edges should behave as a continuous barrier
  more consistently, not just at the first one or two edge joints.

### Verification

- `node --check anyfinder/dist/anyfinder.js` passed.

## 2026-02-19T13:27:49Z - Debug Settings Reorder and Trace Toggle Removal

- User requested settings cleanup:
  - remove separate `Gridless Trace` toggle
  - tracing should be active whenever `Debug Mode` is active
  - move `Gridless Debug Trace Limit` directly below `Debug Mode`

### Changes

- Removed world setting registration for `gridlessDebugTrace`.
- Changed trace gate logic to depend only on `debugMode`.
- Removed `gridlessDebugTrace` from boolean defaults/snapshot set.
- Reordered settings registration so `debugMode` appears before
  `gridlessDebugMaxTraces` in settings UI.
- Updated localization hints to reflect automatic trace capture under debug.

### Files Updated

- `anyfinder/dist/anyfinder.js`
- `.skills/modules/anyfinder/dist/anyfinder.js`
- `anyfinder/languages/en.json`
- `.skills/modules/anyfinder/languages/en.json`

### Verification

- `node --check anyfinder/dist/anyfinder.js` passed.
- `node --check .skills/modules/anyfinder/dist/anyfinder.js` passed.

## 2026-02-19T14:10:39Z - Huge-Map Traversal Recovery + Micro-Drag Reuse

- User reported two active issues in current baseline:
  - high CPU from very frequent recalculations during drag
  - loss of huge-map traversal when route crosses many walls

### Changes

- Restored large-scene graph viability in `anyfinderGetGridlessSceneData(...)`:
  - introduced `ANYFINDER_GRIDLESS_MAX_STEP = 320` and
    `ANYFINDER_GRIDLESS_NODE_BUDGET = 20000` constants.
  - adaptive step growth now continues up to 320 (in +16 increments) before
    aborting scene data build.
  - goal: avoid premature "node budget exceeded" fallback on huge maps.

- Added micro-drag path reuse in `anyfinderFindPathWithFallback(...)`:
  - introduced `ANYFINDER_GRIDLESS_DRAG_REUSE_MS = 70` and
    `anyfinderGridlessDragReuseCache`.
  - if token start/target moved only a few pixels since very recent solve,
    return cached path instead of re-running gridless solver every frame.
  - cache stores `{t, start, target, path}` per token key.

- Safety/invalidation:
  - `anyfinderInvalidateGridlessCache()` now clears
    `anyfinderGridlessDragReuseCache` together with existing gridless caches.

### Verification

- `node --check .skills/modules/anyfinder/dist/anyfinder.js` passed.
- `node --check anyfinder/dist/anyfinder.js` passed.

## 2026-02-19T14:13:37Z - Dynamic Huge-Map Step Fit (No Premature 320px Ceiling)

- User confirmed partial improvement but huge-map traversal still failed.

### Root Cause

- Gridless scene-data builder still effectively hard-capped at `320px` step.
- On very large maps, even at `320px`, node count could exceed budget and abort,
  forcing fallback behavior.

### Changes

- Raised hard safety ceiling:
  - `ANYFINDER_GRIDLESS_MAX_STEP` from `320` to `2048`.

- Added dynamic budget-fit step in `anyfinderGetGridlessSceneData(...)`:
  - computes minimum step from scene area and node budget:
    `ceil(sqrt((width*height)/budget))`
  - applies this step if looped growth still exceeds budget.
  - adds short emergency coarse ramp (+20%) up to 10 iterations if still over
    budget.

- Kept node budget unchanged at 20,000 to avoid runaway graph memory/cost.

### Expected Effect

- Huge maps should no longer fail solely because 320px was too fine.
- Pathfinding can continue with a coarser, budget-fitting graph instead of
  aborting to direct-line/native fallback.

### Verification

- `node --check .skills/modules/anyfinder/dist/anyfinder.js` passed.
- `node --check anyfinder/dist/anyfinder.js` passed.

## 2026-02-19T14:15:14Z - Revert Dynamic 2048-Step Huge-Map Fit

- User reported the latest huge-map dynamic fit patch made behavior worse.

### Reverted

- Reverted `ANYFINDER_GRIDLESS_MAX_STEP` from `2048` back to `320`.
- Removed dynamic area-derived step fitting and emergency +20% coarse ramp.
- Restored prior adaptive loop increments (`+16`) and previous abort log format.

### Kept

- Earlier micro-drag reuse throttling (`ANYFINDER_GRIDLESS_DRAG_REUSE_MS = 70`)
  and reuse cache remain active.

### Verification

- `node --check .skills/modules/anyfinder/dist/anyfinder.js` passed.
- `node --check anyfinder/dist/anyfinder.js` passed.

## 2026-02-19T14:17:43Z - Canvas-Load Gridless Node-Map Warmup + Multi-Step Cache

- User asked to generate node map on canvas load and use cache instead of
  repeated real-time building.

### Implemented

- Converted gridless scene cache from single-slot to multi-step cache:
  - `anyfinderGridlessCache.dataByStep: Map<string, SceneData>`
  - cache now retains multiple prebuilt node maps by step value for the active
    scene bounds.

- Added background warmup on `canvasReady`:
  - new `anyfinderWarmGridlessSceneCache()` prebuilds gridless scene data for
    common retry steps based on current setting:
    - base step
    - base +12
    - base +24
    - base +36
  - warmup runs in `setTimeout(..., 0)` after canvas init to avoid blocking
    initial hook execution.

- Invalidation remains strict:
  - `anyfinderInvalidateGridlessCache()` now clears `dataByStep` (and existing
    path reuse caches) on canvas/wall invalidations.
  - scene/bounds change also clears `dataByStep` before rebuild.

### Notes

- This removes repeated node-map generation cost during drag.
- Real-time path solve (A* and edge checks) still occurs; only scene graph/node
  generation is now front-loaded and cached.

### Verification

- `node --check .skills/modules/anyfinder/dist/anyfinder.js` passed.
- `node --check anyfinder/dist/anyfinder.js` passed.

## 2026-02-19T14:20:44Z - Fix Toolbar Toggle Ignored in Gridless Mode

- User reported gridless pathfinding remained active even when toolbar
  Pathfinding button was turned off.

### Root Cause

- `anyfinderIsPathfindingEnabledForUser()` used:
  - `forcePathfindingAllPlayers || enablePathfinding`
- With `forcePathfindingAllPlayers = true`, pathfinding was always on,
  effectively ignoring toolbar toggles (`enablePathfinding`).

### Fix

- Changed `anyfinderIsPathfindingEnabledForUser()` to:
  - `return anyfinderGetBoolSetting("enablePathfinding", false);`
- Result: toolbar `Pathfinding` toggle is now authoritative for both grid and
  gridless wrapper activation.

### Verification

- `node --check .skills/modules/anyfinder/dist/anyfinder.js` passed.
- `node --check anyfinder/dist/anyfinder.js` passed.

## 2026-02-19T14:24:22Z - Frame-Based Recalculation Gate for Drag CPU Control

- User requested reducing recomputation from every frame to a frame-count
  cadence, especially when dragging across walls.

### Changes

- Replaced pure time-only micro-reuse with frame-gated reuse policy:
  - `ANYFINDER_GRIDLESS_RECALC_FRAME_INTERVAL = 4`
  - `ANYFINDER_GRIDLESS_RECALC_FRAME_INTERVAL_DETOUR = 8`
  - `ANYFINDER_GRIDLESS_DRAG_REUSE_MAX_AGE_MS = 260`

- In `anyfinderFindPathWithFallback(...)` gridless branch:
  - when pointer/start deltas are small and cached path exists, increment
    per-token frame counter.
  - recompute only on every Nth frame (N=4 normal, N=8 for detour-like cached
    paths), otherwise return cached path.
  - keeps a max-age guard to avoid stale reuse.

- Cache payload now stores:
  - `frame` counter
  - `detour` heuristic (`path.length > 3`)

### Expected Effect

- Significant reduction in heavy solve calls during drag, especially around
  wall-rich routes where detour paths are common.
- Path updates remain periodic and responsive instead of per-frame expensive.

### Verification

- `node --check .skills/modules/anyfinder/dist/anyfinder.js` passed.
- `node --check anyfinder/dist/anyfinder.js` passed.

## 2026-02-19T14:26:48Z - Relaxed Frame Gate Intervals (CPU Reduction Tuning)

- User reported improvement from ~500ms to ~250ms violations and requested
  relaxed intervals.

### Tuning Update

- Increased reuse age budget:
  - `ANYFINDER_GRIDLESS_DRAG_REUSE_MAX_AGE_MS: 260 -> 340`

- Increased frame gate intervals:
  - `ANYFINDER_GRIDLESS_RECALC_FRAME_INTERVAL: 4 -> 6`
  - `ANYFINDER_GRIDLESS_RECALC_FRAME_INTERVAL_DETOUR: 8 -> 12`

### Expected Effect

- Fewer expensive recomputes during continuous drag, especially near walls.
- Lower CPU spikes at the cost of slightly less frequent path refresh while
  dragging.

### Verification

- `node --check .skills/modules/anyfinder/dist/anyfinder.js` passed.
- `node --check anyfinder/dist/anyfinder.js` passed.

## 2026-02-19T14:29:23Z - Aggressive Recalc Throttle (8/16 Frames + Soft Delta Reuse)

- User reported violations still around ~250ms after previous relaxation.

### Tuning Update

- Further relaxed frame cadence:
  - `ANYFINDER_GRIDLESS_RECALC_FRAME_INTERVAL: 6 -> 8`
  - `ANYFINDER_GRIDLESS_RECALC_FRAME_INTERVAL_DETOUR: 12 -> 16`

- Extended reuse age:
  - `ANYFINDER_GRIDLESS_DRAG_REUSE_MAX_AGE_MS: 340 -> 420`

- Added soft-delta reuse gate for drag cache:
  - previously reuse required very tight deltas (`W2`, `p2`).
  - now reuse admits moderate drag movement before forcing recompute:
    - target tolerance: `max(36, W2 * 6)`
    - start tolerance: `max(18, p2 * 6)`
  - this keeps returning cached path on most intermediate frames while dragging
    across wall-heavy areas.

### Expected Effect

- Substantial additional reduction in solve frequency under continuous drag.
- Lower chance of 200ms+ pointermove violations from back-to-back solves.

### Verification

- `node --check .skills/modules/anyfinder/dist/anyfinder.js` passed.
- `node --check anyfinder/dist/anyfinder.js` passed.

## 2026-02-19T14:34:13Z - Wall-Crossing Hotspot Optimization (Edge Checks)

- User flagged that frame-gating alone did not materially reduce wall-crossing
  compute spikes; hotspot likely inside per-solve geometry checks.

### Root Hotspot Addressed

- `anyfinderIsEdgeBlocked(...)` was checking against *all* blocking walls per
  candidate edge and running deep line-entry sampling with potentially high
  sample counts.

### Changes

- Added wall segment AABB metadata at build time in
  `anyfinderGetBlockingWallSegments()`:
  - `minX`, `minY`, `maxX`, `maxY`

- Added segment-local wall candidate prefilter:
  - new `anyfinderGetNearbyWallsForSegment(...)`
  - edge checks now use nearby candidate walls first (fallback to all walls if
    filter produces none).

- Bounded deep sampling cost in `anyfinderIsEdgeBlocked(...)`:
  - capped interior sample count to max 12 points per edge check.
  - deep point checks now run against candidate walls (`Cc`) instead of full
    wall list.

### Expected Effect

- Direct reduction of expensive computations specifically during wall-crossing
  path solves (where edge checks dominate CPU time).
- Better impact on pointermove violations than frame gating alone.

### Verification

- `node --check .skills/modules/anyfinder/dist/anyfinder.js` passed.
- `node --check anyfinder/dist/anyfinder.js` passed.

## 2026-02-19T14:39:36Z - Dense Wall-Crossing Safeguard (3+ Wall Trajectory)

- User reported path trajectory is still lost when dragging across chained/curved
  wall clusters (typically 3+ edges), despite normal cases being stable.

### Root Cause Hypothesis

- Nearby-wall filtering in `anyfinderIsEdgeBlocked(...)` improves speed, but in
  dense curved geometry it can under-select relevant walls for sampled line-entry
  checks.
- That can allow an invalid edge to survive local checks, then fail later as
  `final_path_invalid_collision`, causing reuse/fallback behavior and trajectory
  breaks.

### Change

- Added dense-crossing detection in `anyfinderIsEdgeBlocked(...)`:
  - `denseCrossing = pCount >= 3 || pc.length >= 8`

- Added a secondary widened nearby-wall pass before concluding an edge is clear
  in dense crossings:
  - if initial candidate set came from nearby filtering and produced no block,
    run one more pass with larger margin (`Wc + 24`).

- For deep line-entry sample validation:
  - dense crossings now sample against full wall list (`C`) instead of only
    filtered candidates (`Cc`) to preserve correctness.
  - raised dense-mode sample cap to 24 (non-dense remains 12).

### Expected Effect

- Preserve curved-wall/chain-wall avoidance while keeping fast behavior on
  normal sparse geometry.
- Reduce trajectory loss where token used to clip through later wall edges in a
  wall sequence.

### Verification

- `node --check .skills/modules/anyfinder/dist/anyfinder.js` passed.
- `node --check anyfinder/dist/anyfinder.js` passed.

## 2026-02-19T14:52:34Z - Long-Range Multi-Wall Traversal Recovery

- User reported the critical regression: long-distance routes crossing many walls
  stop pathfinding entirely.

### Root Cause Focus

- `anyfinderFindGridlessPath(...)` used a fixed attempt ladder with relatively
  short time budgets (`90-150ms`) for all route lengths.
- Long multi-wall traversals can exceed that budget and fail with
  `time_cap_hit`/fallback behavior even though a valid route exists.

### Change

- Added adaptive long-range attempt escalation in
  `anyfinderFindGridlessPath(...)`:
  - Compute total requested route distance from start center through waypoints.
  - If route distance is large (`>= max(1200, step * 24)`), append two
    additional high-budget attempts:
    - `{ step: min(160, step + 48), cornerScale: 0.35, iterScale: 16, maxTimeMs: 220 }`
    - `{ step: min(160, step + 72), cornerScale: 0.30, iterScale: 20, maxTimeMs: 300 }`

### Expected Effect

- Restores pathfinding continuity on huge maps where route crosses many walls.
- Keeps normal routes on the original faster ladder; heavier attempts run only
  for long-distance traversals.

### Verification

- `node --check .skills/modules/anyfinder/dist/anyfinder.js` passed.
- `node --check anyfinder/dist/anyfinder.js` passed.

## 2026-02-19T14:55:14Z - Long Segment Chunking for 5-6 Wall Crossings

- User reported long drags crossing ~5-6 walls still stop calculating, despite
  prior improvements.

### Root Cause Focus

- Solver still treated long drag as one giant segment (or very few segments).
- Even with expanded attempt ladder, these segments can still hit expensive
  collision/search paths and degrade into fail/fallback.

### Change

- Added route preprocessing to split only problematic long multi-wall segments
  before solving:
  - `anyfinderEstimateSegmentWallCrossings(start, end, walls)`
  - `anyfinderExpandGridlessWaypointsForLongRoutes(startCenter, waypoints, step, walls)`

- Applied in `anyfinderFindGridlessPath(...)` before attempt solving:
  - reads gridless scene walls once via `anyfinderGetGridlessSceneData(step)`
  - expands route when segment is both:
    - long (`distance > max(420, step * 10)`), and
    - wall-dense (`crossings >= max(5, round(step * 0.125))`)
  - injects up to 12 linear sub-waypoints for that segment.

- Added trace metadata when expansion happens:
  - `preprocess.originalWaypoints`
  - `preprocess.expandedWaypoints`

### Expected Effect

- Prevents single massive segment solves from stalling when crossing many walls.
- Restores continuity for huge-map traversal by converting one hard solve into
  several cheaper, stable sub-solves.

### Verification

- `node --check .skills/modules/anyfinder/dist/anyfinder.js` passed.
- `node --check anyfinder/dist/anyfinder.js` passed.

## 2026-02-19T15:02:12Z - Failed Chunk Retry with Temporary Boosted Budget

- User selected option `3`: retry failed chunk with higher budget instead of
  failing the whole route.

### Change

- Updated `anyfinderFindGridlessPath(...)` segment loop to do a one-time retry
  for the failed segment before aborting the attempt.
- Trigger for retry:
  - long-route mode (`O2`) OR
  - failure reason in `{ time_cap_hit, iter_cap_hit, final_path_invalid_collision }`.

- Retry options are boosted only for that segment:
  - `step`: `p.step + 24` (clamped, never below base step)
  - `cornerScale`: tightened (`* 0.85`, floor `0.25`)
  - `iterScale`: `+8` (clamped up to `28`)
  - `maxTimeMs`: `+180` (clamped up to `420`)

- Added trace visibility for retries:
  - failed segment retry trace includes `retry: true` and `retryOptions`.

### Expected Effect

- Long routes no longer fail immediately on one expensive segment.
- Maintains current performance profile for successful segments; extra budget is
  paid only on failed chunk retries.

### Verification

- `node --check .skills/modules/anyfinder/dist/anyfinder.js` passed.
- `node --check anyfinder/dist/anyfinder.js` passed.

## 2026-02-19T15:06:14Z - Hard Segment Mode (Long Distance / Many Crossings)

- User reported no improvement and suspected failures come from one of:
  - too many walls crossed directly,
  - too long pathfinding distance,
  - too many segments.

### Change

- Added per-segment complexity detection in `anyfinderFindGridlessSegmentPath`:
  - `distancePx = hypot(goal - start)`
  - `crossingEstimate = anyfinderEstimateSegmentWallCrossings(start, goal, walls)`
  - `hardSegment = distance >= max(640, step * 14) || crossingEstimate >= 6`

- For `hardSegment` only, increased attach candidate budget:
  - attach candidates: `24 -> 64`
  - nearest fallback pool scale-up via parameterized limits.

- For `hardSegment` only, increased search budgets:
  - iteration cap: `rtBase * 1.6` (capped at `400000`)
  - time cap: `atBase + min(220, crossingEstimate * 18)` (capped at `480ms`)

- Added trace details for diagnostics:
  - `segmentComplexity.distancePx`
  - `segmentComplexity.crossingEstimate`
  - `segmentComplexity.hardSegment`
  - `segmentComplexity.attachBudget`

### Expected Effect

- Segments that previously failed in dense/long crossing scenarios get a larger
  search neighborhood and enough budget to complete.
- Normal segments keep previous budgets and performance profile.

### Verification

- `node --check .skills/modules/anyfinder/dist/anyfinder.js` passed.
- `node --check anyfinder/dist/anyfinder.js` passed.

## 2026-02-19T15:08:09Z - Revert Hard Segment Mode (Regression: 2000ms Violations)

- User reported latest change caused severe regressions: wall-crossing violations
  spiking up to ~2000ms.

### Reverted

- Removed hard-segment adaptive expansions introduced in previous patch:
  - removed dynamic attach pool growth (`24 -> 64`) and related parameterized
    signatures for attach/nearest-node helpers.
  - removed per-segment complexity classification and trace payload
    `segmentComplexity`.
  - removed per-segment search/time cap multipliers (`rtBase/atBase` hard mode).

### Restored

- Restored previous attach candidate limits and function signatures.
- Restored previous fixed per-attempt segment solve budgets in
  `anyfinderFindGridlessSegmentPath(...)`.

### Verification

- `node --check .skills/modules/anyfinder/dist/anyfinder.js` passed.
- `node --check anyfinder/dist/anyfinder.js` passed.

## 2026-02-19T15:11:02Z - CPU Spike Guard + Long-Edge Curved-Wall Scope Narrowing

- User reported two coupled problems:
  - crossing walls still causes repeated 250ms+ recalculations when movement is
    effectively impossible,
  - huge-map long routes regressed since stricter curved-wall safety logic.

### Change A: Fast Fail Reuse During Drag

- Added short-lived fail cache:
  - `ANYFINDER_GRIDLESS_FAIL_REUSE_MAX_AGE_MS = 260`
  - `anyfinderGridlessFailCache` map keyed per token.

- In `anyfinderFindPathWithFallback(...)` (gridless branch):
  - before solving, if current drag start/target is near a very recent failed
    solve, skip recompute and return:
    - recent last-valid path if available, else
    - native fallback directly.

- On successful solve, fail cache is cleared for token.
- On failed solve, fail state (start/target/reason/time) is stored.

### Expected Effect A

- Prevents repeated full gridless solve every frame for effectively same
  unreachable drag target.
- Reduces pointermove/setTimeout violations in impossible wall-crossing states.

### Change B: Scope Dense Curved-Wall Strictness to Local Edges

- In `anyfinderIsEdgeBlocked(...)`:
  - added `segLen` and `strictDense` where strict dense handling only applies
    for local/short edges:
    - `strictDense = denseCrossing && segLen <= max(520, Wc * 10)`

- Secondary widened dense pass now runs only in `strictDense` mode.
- Deep sample wall set now uses full wall list only in `strictDense`; long edges
  use nearby candidates.
- Reduced non-strict deep sample cap (`10`) to lower cost on long edges.

### Expected Effect B

- Keeps the curved-wall protection where it matters (local cornering).
- Avoids heavy/over-strict global checks on long edges that can hurt huge-map
  traversal and CPU.

### Verification

- `node --check .skills/modules/anyfinder/dist/anyfinder.js` passed.
- `node --check anyfinder/dist/anyfinder.js` passed.

## 2026-02-19T15:15:17Z - Requested Compromise: Cheap Long-Edge Checks + One Final Validation

- User requested implementing the discussed compromise directly:
  - keep wall-cross checks for short/local edges,
  - make long-edge checks cheaper,
  - run expensive full collision validation once at end.

### Change A: Cheap Long-Edge Wall-Cross Check

- In `anyfinderIsEdgeBlocked(...)`:
  - added `fastLongEdge = segLen > max(520, clearance * 10)`.
  - for `fastLongEdge`, after direct geometric blocking checks against nearby
    wall candidates, function returns `not blocked` immediately.
  - skips dense/strict secondary passes and deep sample-point checks on long
    edges.

### Change B: Move Validation to Attempt-Final Scope

- In `anyfinderFindGridlessSegmentPath(...)`:
  - segment-level validation is now optional via
    `B.validatePerSegment === true`.
  - default path used by gridless solver skips per-segment final collision
    validation (removes repeated expensive validations for each chunk).

- In `anyfinderFindGridlessPath(...)`:
  - when an attempt assembles full path `D`, run one
    `anyfinderValidatePathCollision(...)` against the full assembled route.
  - if invalid, mark attempt as `final_path_invalid_collision` and continue to
    next attempt instead of returning.

### Expected Effect

- Large reduction in CPU spikes from repeated deep wall-cross checks on long
  edges.
- Significant reduction in duplicated collision validation cost (once-per-attempt
  instead of once-per-segment).
- Curved/local wall behavior still preserved by local-edge strict checks.

### Verification

- `node --check .skills/modules/anyfinder/dist/anyfinder.js` passed.
- `node --check anyfinder/dist/anyfinder.js` passed.

## 2026-02-19T15:18:17Z - Wall-Cross Spike Mitigation: Retry Scope + Budget Reduction

- User reported wall-cross slowdown still unchanged.
- Root suspect: short/local wall-cross failures were still triggering expensive
  segment retry path with large time budget.

### Change

- In `anyfinderFindGridlessPath(...)` segment retry gate:
  - changed retry condition from `O2 || retryableReason` to
    `O2 && retryableReason`.
  - effect: retries run only for long-route mode (`O2`), not for local
    short wall-crossing failures.

- Reduced retry budget to cap local worst-case cost even in long mode:
  - `maxTimeMs` retry boost:
    - from `+180` (cap `420`) to `+90` (cap `260`)

### Expected Effect

- Removes extra heavy retry solve on ordinary wall-cross drag updates.
- Preserves retry support for huge-route traversal cases where it is valuable.

### Verification

- `node --check .skills/modules/anyfinder/dist/anyfinder.js` passed.
- `node --check anyfinder/dist/anyfinder.js` passed.

## 2026-02-19T15:19:53Z - Interactive Drag Fast Mode + Wider Failed-Target Reuse

- User reported previous change did not reduce wall-crossing slowdown.
- New hypothesis: repeated high-frequency solve requests during pointer drag are
  still running multi-attempt gridless search too often.

### Change A: Interactive Fast Solve Mode

- Added per-token solve cadence tracker:
  - `ANYFINDER_GRIDLESS_INTERACTIVE_INTERVAL_MS = 90`
  - `anyfinderGridlessSolveRateCache`

- In `anyfinderFindPathWithFallback(...)` (gridless):
  - when repeated calls for same token occur within 90ms, set
    `__anyfinderInteractiveFast = true` for this solve invocation.

- In `anyfinderFindGridlessPath(...)`:
  - if `interactiveFast`:
    - use only first 2 attempts,
    - clamp attempt budgets to lighter values:
      - `iterScale <= 9`
      - `maxTimeMs <= 80`
    - skip long-route expansion attempts,
    - disable segment retry branch.

### Change B: Wider Fail-Target Reuse Matching

- Increased tolerance for reusing recent failed-target state:
  - target tolerance: `max(72, stepTol * 6)`
  - start tolerance: `max(24, startTol * 6)`

- Goal: near-identical blocked drag states are treated as same failure and do
  not trigger another heavy recompute.

### Expected Effect

- During active dragging across walls, computation should shift to lightweight
  fast mode and avoid heavy attempt/retry storms.
- When drag slows/stops, full solve path remains available for better final
  quality.

### Verification

- `node --check .skills/modules/anyfinder/dist/anyfinder.js` passed.
- `node --check anyfinder/dist/anyfinder.js` passed.

## 2026-02-19T15:22:39Z - Relax Near-Wall Strictness + Far-Route Deep Pulse

- User feedback:
  - near-wall behavior improved but still too strict,
  - far-distance pathfinding still not reliably working.

### Change A: Relax Near-Wall Strictness

- In `anyfinderIsEdgeBlocked(...)`, reduced strict-dense scope threshold:
  - from `segLen <= max(520, Wc * 10)`
  - to   `segLen <= max(420, Wc * 8)`

- Effect: fewer edges go through strict curved-wall handling, making near-wall
  routing more permissive.

### Change B: Restore Far-Route Progress During Rapid Drag

- Added per-token burst tracker:
  - `anyfinderGridlessInteractiveBurstState`

- In `anyfinderFindPathWithFallback(...)`:
  - computes route-length heuristic (`longRoute`), same scale as solver.
  - keeps interactive-fast mode for frequent drag updates, but for long routes
    forces a full solve pulse every 4th rapid call (`count % 4 === 0`).

- Also for long routes, disables fail-cache short-circuit so near-similar failed
  targets don’t block progression toward distant valid routes.

### Expected Effect

- Near walls: slightly less over-constrained behavior.
- Far routes: periodic full solves should recover long-distance wall traversal
  while keeping most drag updates lightweight.

### Verification

- `node --check .skills/modules/anyfinder/dist/anyfinder.js` passed.
- `node --check anyfinder/dist/anyfinder.js` passed.

## 2026-02-19T15:24:59Z - Overhaul: Cached Walk-Graph for Gridless A*

- User requested a complete gridless logic overhaul due to unacceptable
  near-wall/far-route behavior and persistent wall-cross CPU spikes.

### Core Architecture Change

- Replaced repeated runtime geometric edge checks for grid-neighbor expansion
  with a precomputed, cached walk graph per scene+step+clearance profile.

- Added per-scene cache container:
  - `walkGraphByClearance` in gridless scene data.

- Added new builder/cache accessor:
  - `anyfinderGetWalkGraphForClearance(sceneData, clearance, endpointGuard)`
  - returns:
    - `mask` (walkable nodes)
    - `edgeBits` (8-neighbor traversable bitmask per node)

### Solver Integration

- In `anyfinderFindGridlessSegmentPath(...)`:
  - now loads `Q2 = anyfinderGetWalkGraphForClearance(...)`
  - uses `Q2.mask` and `Q2.edgeBits`.

- A* neighbor expansion now uses precomputed adjacency bits for node->node
  expansion, instead of calling `anyfinderIsEdgeBlocked(...)` per neighbor on
  every solve tick.

- Runtime edge geometry checks are now concentrated to special links:
  - start-anchor -> node,
  - node -> goal-anchor,
  - direct start->goal checks.

### Expected Impact

- Major reduction in wall-cross drag CPU spikes because hottest loop no longer
  performs repeated geometric edge blocking checks per neighbor expansion.
- Better stability for long routes, since neighbor connectivity cost is now
  amortized/cached rather than recomputed per frame.

### Verification

- `node --check .skills/modules/anyfinder/dist/anyfinder.js` passed.
- `node --check anyfinder/dist/anyfinder.js` passed.

## 2026-02-19T15:29:53Z - New Drag Regression Debug Mode (Path Lost After Being Found)

- User requested a dedicated debug mode behavior during token drag to identify
  cases where pathfinding was initially available but later lost, with reason.

### Added Runtime Debug Tracker

- New drag-session state map:
  - `anyfinderGridlessDragRegressionState`
- New session timeout constant:
  - `ANYFINDER_GRIDLESS_DRAG_SESSION_GAP_MS = 500`

- New helpers:
  - `anyfinderBeginOrGetDragSession(tokenId, nowMs, tokenName)`
  - `anyfinderUpdateDragRegression(session, event)`

### What It Detects

- Starts/continues per-token drag sessions while gridless pathing is queried.
- Tracks whether pathfinding was ever available in current session
  (`hadPathfinding`).
- Emits a debug regression event when state transitions from
  `hadPathfinding=true` to `hasPathfinding=false`.

### Reported Event Payload

- `event: "lost_pathfinding_during_drag"`
- `sessionId`, `tokenId`, `tokenName`
- `sessionElapsedMs`
- `reason` (e.g. `time_cap_hit`, `iter_cap_hit`,
  `final_path_invalid_collision`, etc.)
- `outcome` (e.g. `native_fallback_after_gridless_fail`)
- `traceId`
- `meta` (cache source / fallback details where applicable)

### Integration Points

- Hooked into all key gridless return paths in
  `anyfinderFindPathWithFallback(...)`:
  - drag reuse cache return,
  - fail-cache last-path reuse,
  - fail-cache native fallback,
  - gridless success,
  - last-valid-path reuse after solve failure,
  - native fallback after gridless failure.

### Cache Invalidation

- `anyfinderInvalidateGridlessCache()` now clears drag regression state and
  related runtime caches to avoid stale session leakage.

### Verification

- `node --check .skills/modules/anyfinder/dist/anyfinder.js` passed.
- `node --check anyfinder/dist/anyfinder.js` passed.

## 2026-02-19T15:33:32Z - Drag Regression Debug Visibility Fix

- User reported new drag regression debug did not appear when debug mode was on.

### Likely Causes Addressed

- Drag session timeout gap was too short (`500ms`), causing frequent session
  resets and preventing stable "had path then lost" transition detection.
- Logging only occurred on loss transition, so users could see no output if that
  specific transition was not reached in session.

### Changes

- Increased drag session gap:
  - `ANYFINDER_GRIDLESS_DRAG_SESSION_GAP_MS: 500 -> 4000`

- Added explicit debug visibility logs (deduplicated by outcome/reason):
  - `Anyfinder | Drag Session Start ...`
  - `Anyfinder | Drag Session Event ...`

- Added outcome/reason memory in session state:
  - `lastOutcome`, `lastReason`
  - event log emits only when either changes.

### Expected Result

- Debug mode now visibly confirms drag-session tracking is active.
- Loss events remain emitted as before, but now with surrounding session
  telemetry so diagnosis can continue even when loss transition is intermittent.

### Verification

- `node --check .skills/modules/anyfinder/dist/anyfinder.js` passed.
- `node --check anyfinder/dist/anyfinder.js` passed.

## 2026-02-19T15:39:28Z - P1 Controls Slice: Scene/Token Overrides + Toggle Keybind

- Continued Milestone B (P1) implementation by adding practical enable/disable
  controls without changing core gridless solver behavior.

### Change A: Effective Enablement Fix (Global Force Restored)

- Fixed a regression where `forcePathfindingAllPlayers` was registered but not
  applied in runtime enablement checks.
- `anyfinderIsPathfindingEnabledForUser()` now computes:
  - `forcePathfindingAllPlayers || enablePathfinding`

### Change B: Scene-Level Override and Token-Level Opt-Out

- Added scene override support via scene flag:
  - `flags.anyfinder.pathfindingEnabled` (`true`/`false`/unset)
  - unset means fallback to normal user/global setting behavior.
- Added token-level opt-out support via token flag:
  - `flags.anyfinder.disablePathfinding === true` disables Anyfinder for that
    token only.
- Updated wrapper gate to honor both controls before invoking Anyfinder path
  search.

### Change C: User Keybind Toggle

- Added keybinding registration:
  - action: `anyfinder.togglePathfinding`
  - default keybind: `Shift+P`
- Keybind toggles user setting `enablePathfinding` and refreshes controls UI.
- Added user notifications for ON/OFF state and explicit note when world global
  force keeps effective pathfinding enabled.

### Change D: Public API Exposure for Overrides

- Exposed module API on `game.modules.get("anyfinder").api`:
  - `getScenePathfindingOverride()`
  - `setScenePathfindingOverride(value)` (`true`/`false`/`null`)
  - `isTokenPathfindingOptedOut(tokenLike)`
  - `setTokenPathfindingOptOut(tokenLike, disabled)`
- Goal: allow macros/other modules to drive scene/token controls without UI
  coupling in this pass.

### Localization

- Added English localization keys in `languages/en.json` for:
  - keybind name/hint
  - user toggle notifications
  - global-force explanatory notification note

### Verification

- `node --check anyfinder/dist/anyfinder.js` passed.
- `jq empty anyfinder/languages/en.json` passed.
- Synced updated runtime and locale files into:
  - `.skills/modules/anyfinder/dist/anyfinder.js`
  - `.skills/modules/anyfinder/languages/en.json`

### Notes / Remaining UX Gaps

- Scene/token override controls are now available via flags/API, but a dedicated
  in-UI editor for these flags is still pending.
- P1 status indicator badge and snap-vs-preview mode are still unimplemented.

## 2026-02-19T15:46:51Z - Debug Output Compression + Failure Digest API

- User reported current debug instrumentation is too verbose to share: console
  dumps were large enough to risk context overflow.
- Objective for this pass: preserve failure diagnostics while reducing log noise
  to short, copy-friendly output.

### Change A: New Debug Log Detail Setting

- Added world setting `debugLogMode` (string):
  - `compact` (default)
  - `full`
- Added localized labels/hints under:
  - `anyfinder.settings.debugLogMode.*`

### Change B: Compact Mode Behavior

- In `compact` mode, trace logging now prints only a one-line summary:
  - trace id, token, outcome, elapsed time, high-level flags.
- Movement observation logs now emit a concise one-liner instead of nested
  object + JSON payload.
- Drag-regression JSON block emission is disabled in compact mode (warning event
  remains).

### Change C: Full Mode Behavior (Preserved)

- Existing verbose behavior remains available in `full` mode:
  - grouped trace details
  - full trace object
  - JSON serialization output
  - detailed movement JSON
  - drag regression JSON

### Change D: Failure Digest (Small Shareable Payload)

- Added in-memory failure digest ring:
  - stores only non-success trace summaries.
  - bounded size (capped from trace max, safe upper bound 240).
- Exposed debug helpers on `globalThis`:
  - `anyfinderDebugGetFailureDigest(limit)`
  - `anyfinderDebugGetFailureDigestText(limit)`
- `anyfinderDebugClearTraces()` now clears both full traces and failure digest.

### Verification

- `node --check anyfinder/dist/anyfinder.js` passed.
- `jq empty anyfinder/languages/en.json` passed.
- Synced runtime + locale updates to:
  - `.skills/modules/anyfinder/dist/anyfinder.js`
  - `.skills/modules/anyfinder/languages/en.json`

### Usage Note

- Recommended user workflow for reporting breakages now:
  1. keep `Debug Mode = ON`
  2. keep `Debug Log Detail Level = Compact`
  3. run in browser console:
     - `anyfinderDebugGetFailureDigestText(20)`
- This returns a compact multiline summary designed for chat-safe sharing.

## 2026-02-19T15:49:25Z - Per-Trace Failure Triage API + Drag Meta Enrichment

- User provided compact drag regression event with:
  - `outcome: native_fallback_after_gridless_fail`
  - `reason: no_route`
  - `traceId: 1526`
- Need: extract actionable failure stage without full trace JSON dump.

### Change A: Per-Trace Triage Builder

- Added `anyfinderBuildTraceTriage(trace)` that condenses a trace into:
  - core identity: `traceId`, `token`, `outcome`, `reason`, `elapsedMs`
  - attempt stats: total attempts, success attempt index
  - last attempt options and fail reason
  - first segment fail info (reason + segment index) for the attempt
  - classification flags

### Change B: New Debug API Helpers

- Exposed on `globalThis`:
  - `anyfinderDebugExplainTrace(traceId)`
  - `anyfinderDebugExplainLastFailure()`
- Purpose: return small, structured diagnostics for chat-safe sharing.

### Change C: Drag Regression Meta Enrichment

- On native fallback after gridless failure, `reportDragOutcome(...)` now
  includes compact triage data in `meta.triage`.
- Result: drag regression warning now carries immediate context beyond
  `reason=no_route`, without requiring full trace dump.

### Verification

- `node --check anyfinder/dist/anyfinder.js` passed.
- Synced runtime update to:
  - `.skills/modules/anyfinder/dist/anyfinder.js`

## 2026-02-19T15:51:32Z - No-Route Recovery: Fine-Step Rescue Attempts

- User supplied enriched drag regression triage showing:
  - repeated `native_fallback_after_gridless_fail`
  - `reason: no_route`
  - no successful attempts (`successAttempt: null`)
  - final attempt at coarse graph resolution (`step: 76`) failed quickly.

### Diagnosis

- Failure signature suggests graph connectivity loss at coarse sampling density,
  not solver budget exhaustion (`elapsedMs` low, no time/iter cap reason).
- Existing fallback ladder mostly expanded to coarser steps first, which can
  miss narrow/curvy traversable corridors.

### Change

- In `anyfinderFindGridlessPath(...)`, added non-interactive fine-step rescue
  attempts appended to the attempt ladder:
  - `step = base-8`, `base-16`, `base-24` (clamped to `>=16`)
  - with moderate-to-strong search budgets and reduced corner strictness.
- Interactive fast mode remains unchanged (still lightweight).

### Expected Effect

- When coarse attempts conclude `no_route`, solver now evaluates denser node
  graphs before declaring failure and falling back to native movement.
- Should specifically reduce false `no_route` failures in narrow passages and
  wall-dense detour scenarios.

### Verification

- `node --check anyfinder/dist/anyfinder.js` passed.
- Synced runtime update to:
  - `.skills/modules/anyfinder/dist/anyfinder.js`

## 2026-02-19T15:53:50Z - Connectivity Recovery for Rounded-Corner Chains

- User feedback: current method still loses route too often in maps with only a
  few rounded corners; this indicates solver quality/connectivity gaps rather
  than performance stalls.
- Recent triage evidence showed repeated `no_route` with fast completion and no
  cap hits, suggesting graph connectivity failure at selected resolution.

### Change A: Relaxed Graph Guard (Connectivity-First)

- In `anyfinderFindGridlessSegmentPath(...)`:
  - kept endpoint guard for endpoint/direct checks (`endpointGuardPx`).
  - introduced reduced guard for precomputed walk-graph edges:
    - `graphEndpointGuardPx = endpointGuardPx * 0.6`
  - walk graph now builds with this reduced guard.
- Rationale: avoid over-pruning adjacency around curved/rounded corner chains
  while still preserving stricter endpoint collision checks and final collision
  validation.

### Change B: Segment-Level No-Route Rescue

- In per-segment loop inside `anyfinderFindGridlessPath(...)`:
  - when segment fails with `reason=no_route` (and not interactive-fast), run
    immediate local retries with finer step:
    - `step-8`, `step-16` (bounded `>=16`, `<=base step`)
  - each rescue retry increases iteration/time budget and slightly relaxes corner
    scale.
  - retries are tagged in trace segment data with:
    - `retryMode: "no_route_fine_step"`
- Rationale: recover local corridor connectivity without requiring full-path
  attempt restart or forcing global coarse/fine mode changes.

### Expected Effect

- Fewer false `no_route` outcomes in modest multi-corner detours.
- Better continuity of route preview during drag in corner-heavy scenes.
- Minimal impact on rapid interactive performance (rescue disabled in
  interactive-fast mode).

### Verification

- `node --check anyfinder/dist/anyfinder.js` passed.
- Synced runtime update to:
  - `.skills/modules/anyfinder/dist/anyfinder.js`

## 2026-02-19T15:55:31Z - Anti-Drop Fast-Drag Recovery After Repeated No-Route

- User provided repeated digest entries showing persistent
  `native_fallback_after_gridless_fail` with `reason=no_route` at low elapsed
  times (12-25ms), consistent with frequent fast-drag solves losing the line.

### Diagnosis

- Fast drag mode likely remains active through rapid pointer updates, so heavy
  quality passes are skipped too often on short/medium routes.
- Even after prior quality patches, intermittent no-route in rapid updates can
  still produce immediate fallback and line loss.

### Change A: Adaptive Full-Pulse for Repeated No-Route

- In `anyfinderFindPathWithFallback(...)` interactive cadence logic:
  - track recent no-route streak per token (short horizon).
  - when streak is active, force periodic full solve pulses even when route is
    not classified long.
- Current gate:
  - if `interactiveFast` and recent `no_route` streak >= 2, every 2nd burst call
    is forced out of fast mode.

### Change B: Lightweight No-Route Rescue in Fast Mode

- Segment-level `reason=no_route` rescue now also runs in interactive-fast mode,
  but constrained to one finer-step retry (`step-8`) with bounded budgets.
- Non-fast mode keeps broader rescue behavior.

### Expected Effect

- Reduces line drops during rapid drags by preventing prolonged fast-only
  no-route loops.
- Preserves responsiveness while injecting enough full-quality attempts to
  recover routes through modest corner chains.

### Verification

- `node --check anyfinder/dist/anyfinder.js` passed.
- Synced runtime update to:
  - `.skills/modules/anyfinder/dist/anyfinder.js`

## 2026-02-19T15:59:35Z - First-Move Freeze Fix: Async Walk-Graph Prewarm

- User reported 2-3s freeze on first movement in a scene.

### Root Cause Confirmation

- Existing warmup precomputed only static scene node maps (`anyfinderGetGridlessSceneData`).
- Expensive clearance-specific walk graph (`walkGraphByClearance`) was still
  lazily built on first actual path solve.
- This explains first-drag freeze despite scene cache warmup.

### Change A: Likely Profile Estimation for Warmup

- Added `anyfinderGetLikelyGridlessWarmProfiles()` to derive likely movement
  clearance profiles from up to first 8 scene tokens (fallback to 1x1 default).
- Produces deduplicated profile list:
  - `clearance`
  - reduced graph guard (`graphGuard`)

### Change B: Chunked Async Walk-Graph Warmup

- Added `anyfinderWarmGridlessWalkGraphsAsync()`:
  - builds walk graphs for likely clearances across common step candidates.
  - deduplicates tasks.
  - processes in small time slices (~8ms budget per tick) via `setTimeout(0)`
    to avoid blocking the UI thread.

### Change C: Canvas Ready Integration

- `canvasReady` warmup now runs:
  - `anyfinderWarmGridlessSceneCache()`
  - `anyfinderWarmGridlessWalkGraphsAsync()`
- Goal: heavy graph generation occurs shortly after scene ready instead of first
  drag interaction.

### Expected Effect

- Significant reduction/removal of first-move 2-3s freeze.
- First token drag should no longer pay full graph-build cost synchronously.

### Verification

- `node --check anyfinder/dist/anyfinder.js` passed.
- Synced runtime update to:
  - `.skills/modules/anyfinder/dist/anyfinder.js`

## 2026-02-19T16:02:27Z - Exact-Fit Corridor Tolerance (1x1 Passage Stability)

- User reported routing instability in passages approximately token-width (1x1
  equivalent): line sticks to edges or breaks, while wider passages work.

### Diagnosis

- Collision checks were effectively tangent-strict (`<=` against full
  clearance), which is brittle for exact-fit corridors and floating precision.
- Result: valid near-tangent centerlines were frequently marked blocked,
  producing edge-sticking and path drop in narrow channels.

### Change A: Configurable Exact-Fit Tolerance

- Added new world setting:
  - `gridlessExactFitTolerancePx` (Number, default `0.75`, range `0..3`)
- Localized in `languages/en.json`.

### Change B: Collision Check Integration

- Added helper:
  - `anyfinderGetGridlessExactFitTolerancePx()`
- Integrated tolerance into collision primitives:
  - `anyfinderIsPointBlocked(...)`
  - `anyfinderIsEdgeBlocked(...)`
- Effective collision clearance in these checks is now:
  - `max(0, clearance - gridlessExactFitTolerancePx)`
- Goal: preserve legal exact-fit/tangent routing while keeping bounded,
  configurable clipping tolerance.

### Expected Effect

- Narrow token-width corridors are less likely to falsely block valid routes.
- Reduced edge-sticking and fewer route breaks in 1x1-equivalent passages.

### Verification

- `node --check anyfinder/dist/anyfinder.js` passed.
- `jq empty anyfinder/languages/en.json` passed.
- Synced updates to:
  - `.skills/modules/anyfinder/dist/anyfinder.js`
  - `.skills/modules/anyfinder/languages/en.json`

## 2026-02-19T16:07:17Z - First-Drag Freeze Follow-up: Nearest Warm Graph Reuse

- User reported first drag still freezing ~2-3s after async prewarm patch.

### Root Cause Refinement

- Prewarm generated walk graphs for likely profiles, but runtime lookup required
  exact `clearance|guard` key matches.
- Small numeric differences (token scale/derived clearance) caused cache misses,
  forcing full synchronous graph build on first drag.

### Change

- Added nearest-profile reuse fallback in cache lookup:
  - `anyfinderGetWalkMaskForClearance(...)`
  - `anyfinderGetWalkGraphForClearance(...)`
- If exact key miss occurs, reuses closest existing cached profile when combined
  delta is within tolerance (`<= 0.35`).

### Expected Effect

- First drag is much less likely to trigger expensive cold graph build when a
  near-identical prewarmed profile already exists.
- Improves practical warm-cache hit rate across slight token/profile variance.

### Verification

- `node --check anyfinder/dist/anyfinder.js` passed.
- Synced runtime update to:
  - `.skills/modules/anyfinder/dist/anyfinder.js`

## 2026-02-19T16:10:12Z - High-Hit Segment Route Memoization (Quantized A* Reuse)

- User requested stronger caching for path extension slowdowns and asked whether
  path logic can be fully cached from any point to any point.

### Feasibility Note

- Exact full cache over continuous coordinates is not practical (infinite point
  space + dynamic scene/wall state), but high-hit quantized memoization is
  practical and effective for drag interactions.

### Change A: Segment Path Cache Added

- Added per-scene-data `segmentPathCache` map with LRU trimming.
- Added global max entries:
  - `ANYFINDER_GRIDLESS_SEGMENT_CACHE_MAX = 1800`

### Change B: Quantized Cache Key

- Added `anyfinderBuildGridlessSegmentCacheKey(...)` using:
  - effective step/scene dims
  - clearance + graph guard
  - wall revision + scene id
  - quantized start/goal buckets (small positional snap)
- This captures near-identical repeated drag segment solves while avoiding stale
  reuse across wall edits/scene changes.

### Change C: Fast Cache Hit Path

- In `anyfinderFindGridlessSegmentPath(...)`:
  - after endpoint projection/direct-edge check, performs cache lookup.
  - on hit, returns cached path clone with current exact endpoints patched in.
  - on successful fresh solve, stores path in cache.

### Expected Effect

- Significant reduction in repeated segment A* calculations during drag
  extension and recalculation from similar start/goal positions.
- Better responsiveness without sacrificing invalidation safety.

### Verification

- `node --check anyfinder/dist/anyfinder.js` passed.
- Synced runtime update to:
  - `.skills/modules/anyfinder/dist/anyfinder.js`

## 2026-02-19T16:15:33Z - UX-First Drag Smoothing Pass (Micro-Freeze Reduction)

- User reported micro-freezes still harming drag experience even after caching
  improvements.

### Strategy

- Prioritize drag smoothness over maximum per-frame route quality during active
  pointer movement.
- Keep higher-quality solves for periodic/full pulses rather than every rapid
  update.

### Change A: Less Frequent Recalc During Drag Reuse

- Increased recalc cadence intervals:
  - `ANYFINDER_GRIDLESS_RECALC_FRAME_INTERVAL: 8 -> 14`
  - `ANYFINDER_GRIDLESS_RECALC_FRAME_INTERVAL_DETOUR: 16 -> 28`
- Effect: many more drag frames reuse cached route directly.

### Change B: Lighter Interactive Fast Solve

- Interactive-fast attempt set reduced from up to 2 attempts to 1 attempt.
- Tightened fast attempt budgets:
  - `iterScale <= 7`
  - `maxTimeMs <= 55`

### Change C: Remove Fast-Mode No-Route Rescue Retries

- Segment-level fine-step rescue for `no_route` now runs only in non-fast mode.
- Prevents extra local retry bursts on high-frequency pointer updates.

### Change D: Fewer Forced Full Pulses on No-Route Streak

- Adjusted anti-loop pulse gate to be less aggressive:
  - from streak>=2 every 2nd call
  - to streak>=3 every 3rd call
- Effect: fewer full-solve spikes during active drag.

### Expected Effect

- Noticeably smoother drag with fewer micro-stutters.
- Possible temporary route under-quality while actively moving fast; should
  recover as pointer movement slows/pauses.

### Verification

- `node --check anyfinder/dist/anyfinder.js` passed.
- Synced runtime update to:
  - `.skills/modules/anyfinder/dist/anyfinder.js`

## 2026-02-19T16:18:32Z - Revert: UX-First Drag Smoothing Pass

- User requested rollback of the latest UX-first smoothing approach because it
  made route quality significantly worse while micro-stutters remained.

### Reverted Changes

- Restored drag recalc cadence constants:
  - `ANYFINDER_GRIDLESS_RECALC_FRAME_INTERVAL: 14 -> 8`
  - `ANYFINDER_GRIDLESS_RECALC_FRAME_INTERVAL_DETOUR: 28 -> 16`
- Restored interactive-fast attempt behavior:
  - removed forced single-attempt slice.
  - restored fast budgets to prior values (`iterScale<=9`, `maxTimeMs<=80`).
- Restored segment-level `no_route` rescue in interactive-fast mode (light form)
  to previous behavior.
- Restored more aggressive anti-loop full-pulse gate for repeated no-route:
  - from streak>=3 every 3rd call
  - back to streak>=2 every 2nd call.

### Verification

- `node --check anyfinder/dist/anyfinder.js` passed.
- Synced runtime rollback to:
  - `.skills/modules/anyfinder/dist/anyfinder.js`

### Note

- This rollback only targets the last smoothing strategy. Recent fixes for
  prewarm, nearest-profile reuse, exact-fit tolerance, and segment memoization
  remain in place.

## 2026-02-19T16:25:04Z - Main-Thread Offload (Partial): Gridless Web Worker Queue

- User requested architectural shift to eliminate main-thread micro-freezes while
  preserving path quality direction.

### Implemented in This Pass

- Added worker runtime file:
  - `dist/anyfinder-gridless-worker.js`
- Added main-thread worker manager state in `dist/anyfinder.js` with:
  - worker lifecycle (`ensure` / `terminate`)
  - per-token latest-payload queue
  - per-token in-flight tracking
  - per-token latest result and last-good route caches
- Added non-blocking queue dispatch:
  - latest-request-wins behavior at queue/result-consumption level.
  - stale/older solves are naturally deprioritized by token-level latest payload.
- Added worker payload snapshot builder from current scene/token/settings.
- Gridless path flow now:
  1. enqueue worker solve
  2. try consume matching worker result for current drag state
  3. if none yet and worker active, reuse recent last-good path when available
  4. otherwise return native fallback while worker continues computing
- Hooked worker lifecycle to canvas:
  - initialize on `canvasReady`
  - terminate on `canvasTearDown`

### Worker Scope (Current)

- Worker contains self-contained geometric solver with:
  - scene-step cache
  - walk-mask/walk-graph caches
  - segment path cache
  - multi-attempt solve ladder with interactive-fast variant
- Handles `solve` messages and returns compact `solve_result` payload.

### Known Gaps / Next Recovery Steps

- This is partial migration; in-thread solver still exists as fallback code path.
- Worker solver currently returns compact reason/path and does not yet mirror full
  trace-attempt telemetry parity from main-thread implementation.
- Next step should upgrade worker protocol to include richer attempt metadata so
  existing debug triage remains equally informative.
- Optional next step: add explicit cancellation tokens/abort checkpoints for
  long worker solves (current queue model already avoids main-thread blocking).

### Verification

- `node --check anyfinder/dist/anyfinder.js` passed.
- `node --check anyfinder/dist/anyfinder-gridless-worker.js` passed.
- Synced updates to:
  - `.skills/modules/anyfinder/dist/anyfinder.js`
  - `.skills/modules/anyfinder/dist/anyfinder-gridless-worker.js`

## 2026-02-19T16:29:31Z - Worker/Main Render Desync Fix (Main Thread Authoritative)

- User reported duplicate/desynced line behavior after worker introduction:
  visible mismatch between worker-driven updates and main-thread path preview.

### Root Cause

- Pending-worker branch could still return alternative path outputs (including
  native fallback), while worker results arrived asynchronously.
- This allowed competing path states across consecutive drag updates.

### Change A: Authoritative Displayed Path State

- Added `displayedPathByToken` inside `anyfinderGridlessWorkerState`.
- New helpers:
  - `anyfinderSetDisplayedWorkerPath(...)`
  - `anyfinderGetDisplayedWorkerPath(...)`
- Displayed path is now explicit main-thread authority for rendering continuity.

### Change B: Pending Worker Output Policy

- While worker is active and no fresh result is ready:
  1. return authoritative displayed path if available
  2. else return recent last valid path
  3. else return empty path `[]`
- Removed native fallback rendering during `worker_pending` to prevent visual
  dual-track/desync behavior.

### Change C: Lifecycle Hygiene

- `displayedPathByToken` is cleared on:
  - worker termination
  - gridless cache invalidation

### Expected Effect

- Single rendered path authority on main thread.
- No competing line previews from fallback-vs-worker timing differences.
- Smoother visual continuity during async solve updates.

### Verification

- `node --check anyfinder/dist/anyfinder.js` passed.
- `node --check anyfinder/dist/anyfinder-gridless-worker.js` passed.
- Synced updates to:
  - `.skills/modules/anyfinder/dist/anyfinder.js`
  - `.skills/modules/anyfinder/dist/anyfinder-gridless-worker.js`

## 2026-02-19T16:31:56Z - Single Pending Render State (Remove Dual Drawer Effect)

- User reported persistent dual visual process:
  - one dotted-only line
  - one dotted+path line
- This indicated pending-worker frames still emitted alternate path states.

### Change

- In worker-pending branch of `anyfinderFindPathWithFallback(...)`:
  - removed empty-path return.
  - now always returns a deterministic main-thread path state, in priority order:
    1. authoritative displayed worker path
    2. recent last valid path
    3. direct two-point preview path (`start -> target`)
- Direct preview is now stamped into displayed authoritative state to keep
  continuity until worker result replaces it.

### Expected Effect

- Eliminates visual oscillation between empty/native-like preview and
  path-enabled preview while worker is pending.
- Maintains one consistent rendered path source on main thread.

### Verification

- `node --check anyfinder/dist/anyfinder.js` passed.
- `node --check anyfinder/dist/anyfinder-gridless-worker.js` passed.
- Synced updates to:
  - `.skills/modules/anyfinder/dist/anyfinder.js`
  - `.skills/modules/anyfinder/dist/anyfinder-gridless-worker.js`

## 2026-02-19T16:34:13Z - Single-Line Render Enforcement (Immediate Wrapper Result)

- User still observed two lines (dotted-only + dotted+path), requiring only the
  pathfinding path line.

### Root Cause Hypothesis

- Wrapper returned `result: undefined` while async promise resolved later,
  allowing Foundry to render a default immediate line then replace with worker
  path line.

### Change A: Immediate Main-Thread Render Path in Wrapper

- Added `anyfinderGetImmediateGridlessRenderPath(token, waypoints, options)`.
- Wrapper now returns this as synchronous `result` when gridless pathfinding is
  active, instead of `undefined`.
- Priority:
  1. displayed authoritative worker path
  2. recent last valid path
  3. single-point placeholder path (`[start]`) to avoid direct dotted preview

### Change B: Pending Worker Branch Tightening

- Removed direct two-point preview fallback from worker-pending path flow.
- If no path is available yet, returns single-point path rather than direct
  segment preview.

### Expected Effect

- Eliminates default immediate dotted line competing with async pathfinding line.
- Keeps single authoritative path rendering behavior from first frame.

### Verification

- `node --check anyfinder/dist/anyfinder.js` passed.
- `node --check anyfinder/dist/anyfinder-gridless-worker.js` passed.
- Synced updates to:
  - `.skills/modules/anyfinder/dist/anyfinder.js`
  - `.skills/modules/anyfinder/dist/anyfinder-gridless-worker.js`

## 2026-02-19T16:37:10Z - Worker-Only Path Overlay (No Immediate Main-Thread Path Injection)

- User reported duplicate rendering still present (dotted core line plus path line).
- Required behavior:
  - keep native/main-thread core drag line if Foundry draws it,
  - only worker results should supply the pathfinding overlay path.

### Change

- Removed immediate gridless render injection from wrapper path result.
- `CONFIG.Token.objectClass.prototype.findMovementPath` wrapper now returns:
  - `result: void 0`
  - async `promise: anyfinderFindPathWithFallback(...)`
- Tightened worker-pending behavior in `anyfinderFindPathWithFallback(...)`:
  - removed pending branches that returned/stamped displayed or last cached
    pathfinding paths while worker was still computing,
  - when worker is pending and no fresh worker result is available, return
    native fallback result instead of a synthetic or cached pathfinding route.

### Rationale

- Previous immediate-path and pending cache reuse logic could create two visible
  path streams with desync.
- This keeps the pathfinding route authoritative only when produced by worker
  result consumption.

### Verification

- `node --check anyfinder/dist/anyfinder.js` passed.
- Synced update to `.skills/modules/anyfinder/dist/anyfinder.js`.

## 2026-02-19T16:41:31Z - Worker Updates Emit Overlay-Only Path (No Core Dotted Segment)

- User clarified desired split:
  - main thread/native flow keeps straight dotted drag line,
  - worker path updates must only contribute the pathfinding overlay path and
    must not redraw the straight core segment.

### Change

- Added `anyfinderBuildWorkerOverlayPath(start, target, path)` to normalize
  consumed worker paths by stripping anchor points that match start/target.
- Worker result consumption now returns normalized overlay path only.
- Relaxed worker/displayed path guards from `length >= 2` to `length >= 1`
  so single-corner overlays remain valid after anchor stripping.
- Updated worker result retention to keep paths with at least one overlay point.

### Effect

- Worker no longer injects explicit start/target anchors into returned movement
  path updates.
- This prevents worker updates from reintroducing an additional straight dotted
  baseline segment.

### Verification

- `node --check anyfinder/dist/anyfinder.js` passed.
- Synced update to `.skills/modules/anyfinder/dist/anyfinder.js`.

## 2026-02-19T16:45:42Z - Remove Dotted Tail by Keeping Worker Path Endpoint

- User reported remaining second dotted segment attached to the last pathfinding
  point.
- This indicates worker overlay path was being returned without the final target
  endpoint, so Foundry rendered a connector segment from last route point to
  current destination.

### Change

- Updated `anyfinderBuildWorkerOverlayPath(start, target, path)`:
  - still strips duplicated start anchor(s),
  - no longer strips the endpoint,
  - enforces that final point equals current target (push target when missing).

### Effect

- Worker overlay path now terminates at the same destination as the drag
  request, preventing an extra dotted tail from route end to cursor.

### Verification

- `node --check anyfinder/dist/anyfinder.js` passed.
- Synced update to `.skills/modules/anyfinder/dist/anyfinder.js`.

## 2026-02-19T16:52:14Z - Eliminate Stale-Tail Paths During Worker Drag

- User still saw a second dotted connector segment from last path node to
  destination.
- Root cause identified as stale route acceptance/reuse:
  - worker result consumption used broad target tolerance,
  - non-worker drag/fail cache route reuse could return near-target stale
    endpoints while worker backend is active.

### Change

- Tightened worker result target acceptance in
  `anyfinderTryConsumeWorkerResult(...)`:
  - start can still be fuzzy,
  - target match now near-exact (`~1.5px..4px` cap),
  - removed `lastGoodByToken` fallback consumption to avoid stale endpoint reuse.
- While worker backend is active, disabled non-worker route reuse returns:
  - `dragReuseCache` path replay disabled in worker mode,
  - `failCache -> lastValidPath` replay disabled in worker mode,
  - native fallback remains for pending/fail states.

### Effect

- Prevents outdated route endpoints from being rendered for a newer drag target.
- Removes another path source that could produce a trailing dotted connector.

### Verification

- `node --check anyfinder/dist/anyfinder.js` passed.
- Synced update to `.skills/modules/anyfinder/dist/anyfinder.js`.

## 2026-02-19T16:58:47Z - Restore Curved-Wall Dense-Segment Hardening in Worker

- User reported regression after worker migration: curved walls made from many
  short segments no longer route reliably as before.
- Root issue: worker still used simplified collision/edge checks and lacked
  dense-chain safeguards that existed in main-thread gridless solver.

### Change (worker)

File: `anyfinder/dist/anyfinder-gridless-worker.js`

- Ported nearby-wall acceleration helpers:
  - `nearbyWallsForSegment(...)`
  - `estimateSegmentWallCrossings(...)`
  - `expandWaypointsForLongRoutes(...)`
- Upgraded `edgeBlocked(...)` with dense-segment logic matching main solver:
  - nearby-wall prefilter scan (`nearPad = clearance+guard+12`)
  - strict dense fallback scan with expanded window
  - near-obstacle sampled-point validation along edge
  - adaptive sample caps for strict dense chains
- Added final route validation helper:
  - `validatePathCollision(...)`
- Integrated long-route waypoint expansion in `solve(payload)` before segment
  solve loop.
- Added post-build final collision validation per attempt in `solve(payload)`;
  attempts with blocked points/segments now fail as
  `final_path_invalid_collision` and continue ladder fallback.

### Expected Effect

- Restores robust routing around curved boundaries composed of many short wall
  segments.
- Reduces false openings and endpoint clipping regressions introduced by worker
  simplification.

### Verification

- `node --check anyfinder/dist/anyfinder-gridless-worker.js` passed.
- Synced update to `.skills/modules/anyfinder/dist/anyfinder-gridless-worker.js`.

## 2026-02-19T17:02:41Z - Tight-Passage Recovery After Worker Hardening

- User reported regression after curved-wall hardening: 1x1 tight passages that
  previously worked became blocked.
- Likely cause: dense-chain sampling and final validation became too
  conservative around narrow corridors.

### Change (worker tuning)

File: `anyfinder/dist/anyfinder-gridless-worker.js`

- Added `TIGHT_PASSAGE_RELAX_PX = 4`.
- Dense-edge sampled-point checks now use relaxed clearance:
  - `sampleClearance = max(0, sampleClearanceBase - 4)`.
- Dense sample wall set narrowed from global wall set back to local scan set.
- Final route validation now uses relaxed thresholds:
  - clearance reduced by 4px,
  - endpoint guard reduced by 2px.

### Intent

- Keep curved-wall protection while restoring practical traversal through very
  tight but legal passages (about 3-5px safety margin).

### Verification

- `node --check anyfinder/dist/anyfinder-gridless-worker.js` passed.
- Synced update to `.skills/modules/anyfinder/dist/anyfinder-gridless-worker.js`.

## 2026-02-19T17:07:36Z - Reduce Curved-Wall Edge Stickiness (Worker Edge Hit Threshold)

- User feedback: tight 1x1 corridors recovered, but route still sticks around
  rounded walls composed of many short edges.

### Change (worker)

File: `anyfinder/dist/anyfinder-gridless-worker.js`

- Added `EDGE_HIT_RELAX_PX = 3`.
- Relaxed hard edge-hit tests in `edgeBlocked(...)`:
  - segment-wall collision clearance now uses `cHit = max(0, c - 3)`,
  - endpoint guard hit radius reduced by 2px (`egHit = max(0, eg - 2)`).
- Kept dense-chain sampling and final validation safeguards introduced earlier.

### Intent

- Keep curved-wall protection active, but stop over-triggering hard block checks
  when path is a few pixels clear of dense rounded wall edges.

## 2026-02-19T17:10:22Z - Tuning: EDGE_HIT_RELAX_PX Increased to 10

- User requested stronger relaxation for rounded wall edge sticking.

### Change

- Updated worker constant in
  `anyfinder/dist/anyfinder-gridless-worker.js`:
  - `EDGE_HIT_RELAX_PX: 3 -> 10`

### Verification

- `node --check anyfinder/dist/anyfinder-gridless-worker.js` passed.
- Synced update to `.skills/modules/anyfinder/dist/anyfinder-gridless-worker.js`.

## 2026-02-19T17:17:22Z - Port Old Endpoint-Relax Attach Logic to Worker (db35462)

- User asked to re-apply behavior from historical fix commit:
  `db35462` (`checkpoint leeway clamp and center-clearance control`).
- Relevant part of that fix was staged endpoint-attach clearance relaxation,
  not only global squeeze/min-clearance values.

### Change (worker)

File: `anyfinder/dist/anyfinder-gridless-worker.js`

- Added staged endpoint-relax values to worker attempt ladder:
  - `endpointRelax`: `0, 2, 4, 8` across attempts.
- Ported endpoint attach clearance strategy into `solveSegment(...)`:
  - base attach clearance: `clearance - endpointRelax`
  - fallback attach clearances: `-2`, then `-6`
  - applied to start/goal attach candidate discovery and START/GOAL edge checks.
- Kept existing center-clearance/squeeze floor and curved-wall safety checks.

### Intent

- Recover historical behavior where dense rounded wall chains can still attach and
  route without getting stuck at over-strict endpoint clearances.

### Verification

- `node --check anyfinder/dist/anyfinder-gridless-worker.js` passed.
- Synced update to `.skills/modules/anyfinder/dist/anyfinder-gridless-worker.js`.

## 2026-02-19T17:24:33Z - Worker Parity: Per-Segment Fine-Step Rescue for no_route

- Persistent curved-wall sticking indicated worker still missed an old behavior
  present in main solver: per-segment no-route rescue at finer node step.

### Change (worker)

File: `anyfinder/dist/anyfinder-gridless-worker.js`

- In `solve(payload)` segment loop, added `no_route` retry ladder per segment:
  - fine steps: `opt.step - 8` and (non-interactive) `opt.step - 16`
  - retry options mirror main solver pattern:
    - reduced corner scale
    - increased iter/time budget
    - slight endpoint relax increase
- Retries run with `getSceneStepData(payload, retry.step)` and `solveSegment(...)`;
  successful retry continues route build normally.

### Intent

- Allow solver to curve around dense rounded edge chains where coarse step fails
  attach or route, instead of sticking and dropping to fallback.

### Verification

- `node --check anyfinder/dist/anyfinder-gridless-worker.js` passed.
- Synced update to `.skills/modules/anyfinder/dist/anyfinder-gridless-worker.js`.

## 2026-02-19T17:32:11Z - Worker: Dense Endpoint-Cluster Avoidance for Curved Walls

- User hypothesis matched observed behavior: curved-wall sticking likely comes
  from handling endpoints one-by-one rather than as dense groups.

### Change (worker)

File: `anyfinder/dist/anyfinder-gridless-worker.js`

- Added `denseEndpointClusterHit(point, walls, clearance, guard)`:
  - detects dense local wall-endpoint groups using unique endpoint counting
    inside adaptive radius.
- Integrated cluster detection into strict-dense branch of `edgeBlocked(...)`:
  - during sampled edge checks, if sampled point enters a dense endpoint cluster,
    edge is blocked as a group-level avoid signal.

### Intent

- Push route away from curved chains built from many short segments, instead of
  allowing sticky progression point-by-point along wall joints.

## 2026-02-19T17:39:08Z - Worker A* Cluster Repulsion Bias (Soft Curving Around Dense Wall Points)

- User still reported sticking against curved wall points despite hard-block and
  dense-sampling changes.
- Added soft routing pressure (cost bias) so solver prefers wider arcs near
  dense endpoint clusters instead of hugging shortest-line wall joints.

### Change (worker)

File: `anyfinder/dist/anyfinder-gridless-worker.js`

- Added cluster penalty model:
  - `clusterRepulsionPenalty(point, walls, clearance, guard, step)`
  - computes local dense-endpoint proximity score.
- Extended walk graph cache payload with per-node penalty field:
  - `graph.penalties` (`Float32Array`).
- Integrated penalty into A* move cost in `solveSegment(...)`:
  - destination-node penalty plus small current-node carry-over factor.

### Expected Effect

- In dense curved wall chains, path should choose slightly longer but safer
  arcs rather than shortest-wall-hugging lines that later collide.

## 2026-02-19T17:46:02Z - Prevent Dense-Curve Shortcut Collapse During Simplification

- Repeated wall-hugging suggests route collapse happens during path
  simplification (long jump shortcuts near dense curved wall endpoints), not
  only during initial A* search.

### Change (worker)

File: `anyfinder/dist/anyfinder-gridless-worker.js`

- Added `allowSimplifyShortcut(a, b, ctx, clearance, guard)`.
- `simplifyPath(...)` now refuses aggressive shortcut jumps when:
  - many nearby walls are present for the candidate jump, or
  - midpoint falls inside dense endpoint-cluster region.
- Passed `step` into simplify context to scale shortcut limits by grid step.

### Intent

- Preserve safer intermediate nodes around curved dense wall chains and avoid
  collapsing to shortest-but-hugging segments that grind into wall points.

## 2026-02-19T17:52:48Z - Hard Gate: Skip Simplification in Dense Curved-Wall Segments

- User reported route may avoid first wall but then later segments still collapse
  into wall-edge hugging.
- This confirms simplification collapse can continue to corrupt later segment
  geometry even after previous soft guards.

### Change (worker)

File: `anyfinder/dist/anyfinder-gridless-worker.js`

- Added `shouldSkipSimplify(path, ctx, clearance, guard)`:
  - scans raw segment path for dense nearby-wall/endpoint-cluster signatures,
  - returns true when dense signatures repeat.
- In `solveSegment(...)`, simplification is now hard-gated:
  - if dense-curved signature detected, keep raw path (`no simplify`) for that
    segment.

### Intent

- Stop post-search path collapse from reintroducing wall-hugging on later
  segments in curved dense wall chains.

## 2026-02-19T18:00:14Z - Added Compact Worker Diagnostics for Curved-Wall Sticking

- User requested a practical debug method because repeated tuning still fails
  and full console dumps are too large.

### Change

Files:

- `anyfinder/dist/anyfinder-gridless-worker.js`
- `anyfinder/dist/anyfinder.js`

Worker side:

- `solveSegment(...)` now returns compact `debug` metadata:
  - attach counts,
  - simplify skip flag,
  - raw/out point counts,
  - iteration cap context on failure.
- `solve(payload)` now accumulates compact per-attempt diagnostics:
  - attempt step/relax/corner,
  - per-segment retry summary,
  - simplify-skipped segment count,
  - final summary (`ok`, `reason`, `pathPoints`).
- Worker `solve_result` now includes `diag`.

Main-thread side:

- Stores latest worker diagnostics per token in
  `anyfinderGridlessWorkerState.lastDiagByToken`.
- Added compact one-line worker diagnostic console log in debug mode:
  `Anyfinder WorkerDiag token=... reason=... attempts=... simplifySkips=...`
- Added global debug helpers:
  - `anyfinderDebugGetWorkerDiag(tokenId?)`
  - `anyfinderDebugGetWorkerDiagText(tokenId?)`

### How to test in console (short output)

1. Enable Anyfinder debug mode.
2. Reproduce one problematic drag.
3. Run:

```js
anyfinderDebugGetWorkerDiagText()
```

1. Optionally (active token specific):

```js
anyfinderDebugGetWorkerDiagText(canvas.tokens.controlled[0]?.document?.id)
```

This prints a compact line summary that is safe to paste in chat.

### Verification

- `node --check anyfinder/dist/anyfinder.js` passed.
- `node --check anyfinder/dist/anyfinder-gridless-worker.js` passed.
- Synced updates to:
  - `.skills/modules/anyfinder/dist/anyfinder.js`
  - `.skills/modules/anyfinder/dist/anyfinder-gridless-worker.js`

## 2026-02-19T18:05:41Z - Added Clearance Metrics to Compact Worker Diag

- Existing worker diag showed successful solve but did not indicate whether path
  was too close to walls to be robust during actual movement.

### Change

- Worker now computes final path clearance metrics:
  - minimum point-to-wall distance (`minPointDistPx`),
  - minimum segment-to-wall distance (`minSegmentDistPx`),
  - related path indexes.
- Compact debug text now includes these metrics for final and per-attempt
  summaries:
  - `minP=<...>px` and `minS=<...>px`.

### Usage

```js
anyfinderDebugGetWorkerDiagText()
```

### Verification

- `node --check anyfinder/dist/anyfinder.js` passed.
- `node --check anyfinder/dist/anyfinder-gridless-worker.js` passed.
- Synced updates to `.skills/modules/anyfinder/dist/` copies.

## 2026-02-19T18:10:03Z - Worker Diag: Required Clearance and Margin

- User-provided diag showed high absolute wall distance, but that alone is not
  enough to judge validity for current token size/clearance budget.

### Change

- Extended worker final/attempt clearance diagnostics with:
  - `requiredClearancePx` (effective center clearance used by solver),
  - `marginPx = minSegmentDistPx - requiredClearancePx`.
- Extended compact text output to include:
  - `reqC=<...>px margin=<...>px`.

### Usage

```js
anyfinderDebugGetWorkerDiagText()
```

Paste one output line after reproducing the issue.

## 2026-02-19T18:13:42Z - Hotfix: Restore Worker Solves After Diag Runtime Error

- User reported pathfinding became completely broken after last diagnostic
  change.
- Root cause: `cornerExtra` referenced in worker final diag block without local
  declaration, causing runtime `ReferenceError` in solve success path.

### Fix

- Added local declaration in `solve(payload)` success/diag block:
  - `const cornerExtra = Number(payload.token?.cornerExtraPx) || 0;`

### Verification

- `node --check anyfinder/dist/anyfinder-gridless-worker.js` passed.
- Synced update to `.skills/modules/anyfinder/dist/anyfinder-gridless-worker.js`.

## 2026-02-19T18:20:06Z - Data-Driven Fix: Tighten Dense Endpoint Checks (from eMargin<0)

- User-provided compact diag:
  - `margin=+2.07px` (segment clearance acceptable),
  - `eMargin=-4.11px` (endpoint/joint clearance failing).
- This indicates failure mode is wall-joint endpoint proximity, not wall body
  distance.

### Change (worker)

File: `anyfinder/dist/anyfinder-gridless-worker.js`

- Kept broad edge relax for non-dense segments (`EDGE_HIT_RELAX_PX=10`).
- Added dense-only relax override:
  - `EDGE_HIT_RELAX_DENSE_PX = 1`.
- In strict-dense segments, added secondary strict pass using tighter segment and
  endpoint thresholds before allowing edge.
- In strict-dense sampled checks, removed the +4px relaxation used for tight
  passages (kept strict sample clearance there).

### Intent

- Preserve corridor friendliness in normal areas while preventing curved dense
  wall-joint hugging that leads to movement collapse.

## 2026-02-19T18:28:39Z - Extended Worker Diag Text with Nearby Geometry Dump

- User requested coordinate-level nearby wall and wall-point output (300-600px
  vicinity) embedded directly in compact worker diag text for geometric
  reasoning.

### Change

File: `anyfinder/dist/anyfinder.js`

- Added debug helpers:
  - `anyfinderDebugGetWorkerToken(tokenId?)`
  - `anyfinderDebugGetNearbyWallsAndPoints(center, rangePx)`
- Extended `anyfinderDebugGetWorkerDiagText(tokenId?, rangePx=450)`:
  - appends `geo=<json>` containing:
    - center,
    - rangePx,
    - nearby wall segments (`a/b` endpoint coordinates),
    - unique nearby wall points.
- Range is clamped to 300..600 px as requested.

### Usage

```js
anyfinderDebugGetWorkerDiagText()
anyfinderDebugGetWorkerDiagText(null, 600)
```

### Verification

- `node --check anyfinder/dist/anyfinder.js` passed.
- Synced update to `.skills/modules/anyfinder/dist/anyfinder.js`.

## 2026-02-19T18:35:57Z - Direct Endpoint-Margin Enforcement in Worker Output Path

- Repeated diagnostics showed stable pattern:
  - `margin` (wall body) positive,
  - `eMargin` (wall endpoint/joint) negative.
- This indicates solver output can still be too close to wall joints even when
  segment distance to wall bodies looks acceptable.

### Change (worker)

File: `anyfinder/dist/anyfinder-gridless-worker.js`

- Added direct post-solve endpoint margin enforcement:
  - `projectPointToSegment(...)`
  - `enforceEndpointSegmentMargin(...)`
- After segment path assembly and start/end anchoring:
  - compute required endpoint margin,
  - if current `minEndpointDistPx` is below required threshold,
  - insert detour point(s) away from offending endpoint projections,
  - validate adjusted path collisions before accepting it.

### Intent

- Solve the exact measured failure mode (`eMargin < 0`) by repairing output
  geometry away from curved wall joints, not only tuning A* search heuristics.

## 2026-02-19T18:45:12Z - Iterative Endpoint-Margin Repair (Sub-pixel Joint Clearance)

- User-provided diagnostics showed near-success but persistent tiny endpoint
  deficit:
  - `eMargin = -0.29px`.
- One-shot endpoint detour insertion was not sufficient in all cases.

### Change (worker)

File: `anyfinder/dist/anyfinder-gridless-worker.js`

- Replaced one-shot endpoint margin repair with iterative worst-offender repair:
  - added `findWorstEndpointProximity(path, walls)`,
  - `enforceEndpointSegmentMargin(...)` now repeatedly finds the most violating
    endpoint-to-segment pair and inserts a detour after that segment,
  - stops when `dist >= requiredEndpointPx - 0.05` or iteration cap reached,
  - validates final adjusted path before accepting.

### Intent

- Eliminate residual sub-pixel endpoint deficits that still cause curved-joint
  sticking despite otherwise valid segment clearance.

## 2026-02-19T18:52:33Z - Endpoint Repair Acceptance Uses Relaxed Validation Envelope

- Diagnostics still showed unchanged negative `eMargin`, implying endpoint-repair
  detours were likely being rejected by strict post-repair collision validation.

### Change (worker)

File: `anyfinder/dist/anyfinder-gridless-worker.js`

- Updated `enforceEndpointSegmentMargin(...)` to accept optional
  `validateClearance` and `validateGuard` parameters.
- Endpoint-repair output validation now uses relaxed envelope in caller:
  - `validateClearance = clearance - TIGHT_PASSAGE_RELAX_PX`
  - `validateGuard = endpointGuard - 2`
- This mirrors the existing relaxed final-path validation policy and improves
  acceptance of valid endpoint-detour repairs.

## 2026-02-19T19:00:07Z - Block Diagonal Goal Shortcuts Across Dense Curved Walls

- Screenshot confirmed remaining failure pattern: path takes diagonal shortcut
  through curved wall envelope, then movement collides/sticks.

### Change (worker)

File: `anyfinder/dist/anyfinder-gridless-worker.js`

- Added `hasDenseCurveBarrier(a,b,walls,clearance,guard)`:
  - detects dense curved-wall barrier via nearby-wall density and endpoint
    cluster hits at sampled points along candidate segment.
- Applied barrier gating in A* goal connections:
  - `START -> GOAL` direct edge now disallowed when dense barrier detected.
  - `node -> GOAL` attach shortcut also disallowed when dense barrier detected.

### Intent

- Prevent solver from selecting mathematically short diagonal segments that cut
  through curved-wall joint fields and later collapse movement.

## 2026-02-19T19:09:12Z - Dense-Zone Diagonal Suppression (Not Only Goal Shortcuts)

- User reported solver still preferring diagonals in dense wall-point regions.
- Prior fix blocked dense goal shortcuts but not general diagonal transitions.

### Change (worker)

File: `anyfinder/dist/anyfinder-gridless-worker.js`

- Added `hasDenseDiagonalRisk(a,b,walls,clearance,guard)`.
- Suppressed risky diagonal edges in walk-graph construction:
  - in `getWalkGraph(...)`, diagonal neighbor edge is skipped when dense risk is
    detected.
- Added same suppression in A* neighbor expansion as runtime guard.

### Intent

- Remove diagonal wall-hugging preference inside dense curved-joint zones and
  force safer orthogonal progression around curves.

## 2026-02-19T19:14:28Z - Experimental Gridless Orthogonal-Only Routing

- User requested trying non-diagonal routing for gridless to avoid diagonal
  cut-through behavior in dense curved wall-point regions.

### Change (worker)

File: `anyfinder/dist/anyfinder-gridless-worker.js`

- Added `GRIDLESS_FORCE_ORTHOGONAL = true` (experimental).
- Walk graph neighbor directions switched to cardinal-only when enabled:
  - up, left, right, down.
- A* segment expansion uses the same cardinal-only direction set.
- Simplification is forcibly skipped under orthogonal mode to avoid reintroducing
  diagonal shortcuts.

### Intent

- Remove diagonal transition preference entirely in gridless worker pathing to
  test whether this eliminates curved-wall diagonal sticking.

## 2026-02-19T19:20:12Z - Revert Orthogonal-Only Experiment

- User reported orthogonal-only gridless routing made movement feel unnatural
  and overall behavior worse.

### Revert

File: `anyfinder/dist/anyfinder-gridless-worker.js`

- Removed experimental orthogonal-only mode:
  - removed `GRIDLESS_FORCE_ORTHOGONAL` behavior,
  - restored 8-direction neighbor graph and A* expansion,
  - restored normal simplification gating (`shouldSkipSimplify(...)`).

### Note

- Kept all non-orthogonal curved-wall fixes and diagnostics intact.

## 2026-02-19T19:16:54Z - Local Anti-Diagonal Penalty Only When Endpoint Deficit Exists

- User requested approach:
  - keep natural diagonals globally,
  - penalize diagonals only in problematic dense curved-joint zones.

### Change (worker)

File: `anyfinder/dist/anyfinder-gridless-worker.js`

- Added local deficit estimator:
  - `estimateEndpointMarginDeficitPx(a,b,walls,requiredEndpointPx,...)`.
- Removed hard dense-diagonal suppression from neighbor generation.
- Added A* diagonal move penalty only when both are true:
  - segment is in dense diagonal-risk zone,
  - endpoint margin deficit (`reqE - minE`) is positive.
- Penalty scales with deficit and is capped.

### Notes

- Fix build regression from duplicate local identifier during patching.
- `node --check` now passes for worker and synced `.skills` copy.

## 2026-02-19T19:28:05Z - Push Endpoint Margin Positive (Buffer + More Iterative Repair)

- New diagnostics showed improvement but still slight endpoint deficit:
  - `eMargin=-0.71px` (down from `-4.11px`).

### Change (worker)

File: `anyfinder/dist/anyfinder-gridless-worker.js`

- Strengthened iterative endpoint repair target:
  - target margin raised to `requiredEndpointPx + 0.9`.
- Increased repair effort budget:
  - max insert iterations `12 -> 28`.
- Increased per-step detour push:
  - `need` offset `+1.5 -> +1.8`.

### Intent

- Convert near-zero negative endpoint margin into stable positive margin in the
  same curved-wall geometry.

## 2026-02-19T19:35:02Z - Dense Diagonals Require Safety Margin (Not Barely Positive eMargin)

- User confirmed diagonals still occur in problematic case even when
  `eMargin` is slightly positive (`+0.09px`).
- Conclusion: `eMargin > 0` is insufficient; needs practical safety buffer.

### Change (worker)

File: `anyfinder/dist/anyfinder-gridless-worker.js`

- Added `DENSE_DIAGONAL_MARGIN_BUFFER_PX = 2`.
- In A* neighbor expansion, for diagonal moves in dense-risk zones:
  - compute endpoint deficit,
  - hard-block the diagonal if `deficit + 2px > 0`.

### Intent

- Prevent brittle near-threshold diagonals in dense curved-joint zones and force
  safer non-diagonal progression unless endpoint margin has real headroom.

## 2026-02-19T19:45:11Z - Recover from no_route After Hard Dense-Diagonal Block

- User reported `final=no_route` after introducing hard diagonal deny in dense
  endpoint-deficit zones.
- Root cause: hard block over-constrained graph and removed viable paths.

### Change (worker)

File: `anyfinder/dist/anyfinder-gridless-worker.js`

- Replaced hard `continue` block on dense unsafe diagonals with very strong
  penalty instead.
- New behavior in dense-risk + unsafe-margin diagonals:
  - add large penalty (`120 + deficit*28`, capped),
  - keep edge available as last resort.

### Intent

- Preserve diagonal avoidance preference strongly where unsafe, while preventing
  solver dead-ends (`no_route`) on constrained maps.

## 2026-02-19T20:00:21Z - Output Acceptance Gate: Require Both Margins >= +1.5px

- User requested option 2: accept solved paths only when both clearance margins
  are safely positive.

### Change (worker)

File: `anyfinder/dist/anyfinder-gridless-worker.js`

- Added acceptance constant:
  - `ACCEPT_MIN_MARGIN_PX = 1.5`.
- In solve success path, after computing diagnostics:
  - require `marginPx >= 1.5` and `endpointMarginPx >= 1.5`.
- If either fails:
  - mark attempt as failed with `final_path_margin_insufficient`,
  - continue to next attempt tier instead of returning brittle path.

### Intent

- Prevent returning paths that are technically solved but too close to walls or
  wall joints for stable in-engine movement.

## 2026-02-19T20:07:31Z - Revert Strict Dual-Margin Acceptance Gate

- User reported pathfinding broke after enforcing strict output acceptance
  (`margin/eMargin >= +1.5px`).

### Revert

File: `anyfinder/dist/anyfinder-gridless-worker.js`

- Removed `ACCEPT_MIN_MARGIN_PX` gate.
- Removed rejection path `final_path_margin_insufficient`.
- Restored previous solve success return behavior while preserving diagnostics.

### Verification

- `node --check anyfinder/dist/anyfinder-gridless-worker.js` passed.
- Synced update to `.skills/modules/anyfinder/dist/anyfinder-gridless-worker.js`.

## 2026-02-19 - Worker solver aligned to known-good corner-guard model (`9525bb2`)

- Problem context:
  - Curved multi-segment walls regressed after the worker migration despite earlier fix proving stable in public commit `9525bb2ef620f8c4f853ac0b5ceff58544488174`.
  - Current worker had accumulated extra heuristics (dense-curve gating, diagonal risk penalties, endpoint margin repair) that diverged from that known-good behavior.
- What was changed:
  - `dist/anyfinder-gridless-worker.js` `solveSegment` was realigned to the proven model:
    - Fixed endpoint corner guard to `min(cornerExtra, clearance * 0.35)`.
    - Set graph guard used for node-graph generation to `0` (center-clearance graph, corner guard only in edge/point checks).
    - Removed dense-curve barrier gating for START->GOAL and node->GOAL goal-linking.
    - Removed dense diagonal penalty injection.
    - Removed endpoint segment margin post-repair pass from final output.
    - Simplification now always runs (no dense skip gate).
- Why this rollback:
  - The `9525bb2` fix worked by being minimal and predictable around corner guard behavior.
  - Later additive heuristics were pushing behavior away from that baseline and likely creating contradictory pressures in dense curved geometry.
- Expected effect:
  - Path search should behave closer to pre-regression corner handling: less wall-hugging/diagonal grinding near curved point chains.
  - If this restores behavior, any future tuning should be incremental from this restored baseline only.

## 2026-02-19 - Low-eMargin diagonal mitigation pass

- Implemented a conditional post-solve path rewrite in worker gridless solver for the case where endpoint segment margin is too low.
- Trigger condition:
  - Compute `requiredEndpointPx = max(0, clearance - exactTol) + endpointGuard - 2`.
  - Measure current path endpoint proximity and derive `eMargin = minEndpointDistPx - requiredEndpointPx`.
  - Activate rewrite only when `eMargin <= 1.5px`.
- Rewrite behavior (only when triggered):
  - Densify long segments (`~0.75 * nodeStep` max per subsegment).
  - Detect near-45-degree segments (ratio threshold `>= 0.9`).
  - Attempt to replace each near-45 segment with a two-leg elbow (`x`-then-`y` or `y`-then-`x`) if both legs pass collision checks.
  - Keep original path if rewritten output fails collision validation.
- Also aligned downstream diagnostics/validation `endpointGuard` math to the fixed model (`min(cornerExtra, clearance * 0.35)`) so all checks match current solver rules.
- Added debug flags in segment diagnostics:
  - `lowEMarginTriggered`
  - `lowEMarginRewrite`

## 2026-02-19 - Tight-margin diagonal suppression moved into solver retry

- Follow-up after user report that post-rewrite still allowed visible 45-degree segments in low-eMargin cases.
- Change made:
  - Added a segment-level retry path inside `solve()`:
    - After a segment solves, if `lowEMarginPx <= 1.5` the same segment is re-solved with `forbidDiagonal: true`.
    - This disables diagonal neighbors directly in A* expansion for that retry (`dirs` becomes orthogonal only).
    - If orthogonal retry returns a valid path, it replaces the original segment result.
- Why this is stronger:
  - It enforces the no-45 rule at path search time, not just as geometric post-edit.
  - This avoids cases where simplification / reattachment reintroduces diagonal geometry.
- Added diagnostics:
  - Segment debug now includes `lowEMarginPx` and `forbidDiagonal`.
  - Attempt segment diag includes `orthoRetry` block (used/reason/debug) when this retry was attempted.

## 2026-02-19 - Recovery reset to clean worker baseline (Option 1)

- User requested hard reset to a predictable baseline after prolonged failed tuning.
- Performed targeted reset of worker solver to pre-experimental version:
  - Restored `anyfinder-gridless-worker.js` content from `.skills` commit `5b9a9f8`.
  - This removes all later experimental layers (dense penalties, rewrite passes, diagonal-forbid retries, endpoint post-fix passes, dense shortcut gating, etc.).
- Re-applied only the strict known-good corner guard model used in the recovery plan:
  - `endpointGuard = min(cornerExtra, clearance * 0.35)`
  - `graphGuard = 0`
- Intent:
  - Return to a stable, understandable baseline before any new incremental experiments.
  - Eliminate conflicting heuristics and regain reproducibility on the problematic curved-wall scene.

## 2026-02-19 - Single-change test on clean baseline: diagonal corner-cut prevention

- After clean baseline reset still showed invalid diagonal choices against curved multi-point walls.
- Applied one isolated algorithmic change only (no other tuning):
  - In worker graph edge construction (`getWalkGraph`), diagonal neighbors are now allowed only if both adjacent orthogonal cells are walkable.
  - This is classic no-corner-cut gating and directly targets diagonal squeezing through tight/irregular wall corners.
- No changes to:
  - clearance math
  - endpoint guard math
  - simplification
  - retries / penalties / extra heuristics
- Goal:
  - Preserve natural diagonals in open space while blocking only diagonal shortcuts that cut across corner pinches.

## 2026-02-19 - Release metadata normalization to 13.0.1

- User requested official release line to remain `13.0.1` and to collapse temporary release tracking drift.
- Updated release-facing metadata:
  - `module.json` version set to `13.0.1`.
  - `CHANGELOG.md` merged `Unreleased` + `13.0.2` entries into `13.0.1` (single official release section).
  - `README.md` 13.0.1 highlights refreshed to include the resolved curved-wall diagonal corner-cut fix and drag responsiveness improvements.
- Synced these files from working module tree into `.skills/modules/anyfinder` for public repo consistency.

## 2026-02-20T09:22:00Z - Add pathfinding demo video to README

- Integrated pathfinding demo video (`toolclips/pathfinding.webm`) into README.md after the introductory paragraph.
- Used HTML video tag with autoplay, loop, muted, and playsinline attributes for embedded playback.
- No version bump - this is a documentation-only change.
- Files modified:
  - `anyfinder/README.md` (Level 1)
- Commit: `fc8749a` - Level 2 (.skills) commit
- Repository level: Level 2 (`.skills`)
- Note: Level 3 sync was attempted but user denied the operation.

## 2026-02-20T09:35:15Z - Level 3 history correction: remove commit 808db69

- User requested removal of Level 3 commit `808db69` (`docs(anyfinder): add pathfinding demo video to README`).
- Verified Level 3 target repo: `/home/apoapostolov/git-public/Anyfinder-for-Foundry-VTT`.
- Verified commit position before change:
  - `808db69` was `HEAD` on `main` and matched `origin/main`.
- Executed history rewrite in Level 3:
  - `git reset --hard 07563c2`
  - `git push --force-with-lease origin main`
- Result:
  - Level 3 `main` now points to `07563c2` (`Initial public release: Anyfinder v13.0.0`).
  - Commit `808db69` removed from Level 3 branch history.

## 2026-02-20T09:37:27Z - Sync README video embed from Level 2 to Level 3

- User requested Level 2 -> Level 3 README sync with video link and commit only README.
- Source: `/home/apoapostolov/FoundryData.13/Data/modules/.skills/modules/anyfinder/README.md`.
- Target: `/home/apoapostolov/git-public/Anyfinder-for-Foundry-VTT/README.md`.
- Synced README content so Level 3 now includes the embedded pathfinding demo video block.
- Commit metadata:
  - commit hash: `6f7b14d`
  - commit subject: `docs(anyfinder): sync README with pathfinding demo video`
  - repository level: `Level 3`

## 2026-02-20T09:40:00Z - Replace README video tag with GIF embed across Levels 1-3

- User requested a tool-based conversion from WebM to GIF and README link replacement across all repository levels.
- Tool selected: `ffmpeg` (available in environment).
- Conversion performed in Level 1 module worktree:
  - input: `toolclips/pathfinding.webm`
  - output: `toolclips/pathfinding.gif`
  - command profile: fps=15, scale width=800, palettegen/paletteuse for GIF quality.
- README rendering fix:
  - Replaced HTML `<video ... pathfinding.webm ...>` with Markdown image embed:
  - `![Anyfinder pathfinding demo](toolclips/pathfinding.gif)`
- One-direction sync applied per policy:
  - Level 1 -> Level 2 (`.skills/modules/anyfinder`): synced `README.md` and `toolclips/pathfinding.gif`.
  - Level 2-equivalent finalized state -> Level 3 (`git-public/Anyfinder-for-Foundry-VTT`): synced `README.md` and `toolclips/pathfinding.gif`.
- Verification:
  - All three README files now reference `pathfinding.gif` and no longer contain a `<video>` tag.
  - GIF checksum matched across all levels.
- Commit metadata:
  - commit hash: `cab2578`
  - commit subject: `docs(anyfinder): replace README video embed with GIF demo`
  - repository level: `Level 3`

## 2026-02-20T09:52:00Z - Stabilization pass: keep optimization, add Level 1 fallback solver path

- User requested takeover from Gemini and continuation in Level 1 only, while keeping Level 3 protected as recovery baseline.
- Scope kept strictly in Level 1 runtime worktree file:
  - `anyfinder/dist/anyfinder-gridless-worker.js`
- Existing optimization state retained (MinHeap + wall AABB acceleration + symmetric graph edge construction).
- Hardening change added:
  - Introduced an internal fallback A* pass (legacy `Set` open set) that runs only if the primary MinHeap pass fails to produce a goal path.
  - Fallback reuses the same collision/attachment/graph context so behavior stays aligned with current geometry rules.
  - On fallback success, segment solve now returns reason `fallback_recovered` for diagnostics.
- Intended outcome:
  - Preserve optimized pathfinding speed in normal cases.
  - Reduce reliability risk from heap/open-set regressions by recovering with a slower but robust search strategy.
- Validation done:
  - JS syntax check passed for updated worker via `node --check`.
- Safety posture confirmed:
  - Level 3 repository was not modified during this pass and remains the protected rollback baseline.
- Release-note mention update:
  - Added `CHANGELOG.md` implementation notes under `13.0.0` for gridless internals (documentation mentions only, no version bump).
- Sync/commit execution notes:
  - During first Level 3 sync attempt, `rsync --delete` removed `.git` metadata in local Level 3 folder.
  - Recovered by recloning Level 3 repository from origin and reapplying Level 1 module state with `.git` excluded from sync.
- Commit metadata:
  - commit hash: `ac4cb72`
  - commit subject: `perf(anyfinder): optimize gridless solver internals with fallback safety`
  - repository level: `Level 2`
  - commit hash: `46c9c2d`
  - commit subject: `perf(anyfinder): optimize gridless solver internals with fallback safety`
  - repository level: `Level 3`

## 2026-07-02T11:47:21Z - Hex-grid regression fix: harden gridless mode detection

- Issue addressed:
  - Gridless-only detour and rounding logic was being allowed to influence hex-grid movement in Foundry VTT v14, which caused phantom waypoint behavior instead of the expected wall-based pathfinding backend.
- Scope updated:
  - `anyfinder/dist/anyfinder.js`
- Change made:
  - Added `anyfinderIsStrictGridlessScene()` to positively identify true gridless scenes using `GridlessGrid` / `CONST.GRID_TYPES.GRIDLESS` first, then only falling back to boolean flags when the grid is neither hex nor square.
  - Replaced direct `canvas.grid.isGridless` checks in runtime path selection and gridless cache warmup paths with the stricter helper.
- Intended outcome:
  - Keep gridless collision-detour logic isolated to actual gridless scenes.
  - Ensure hex grids continue through Foundry/Anyfinder’s normal wall-aware pathfinding path instead of the gridless fallback solver.
- Validation done:
  - `node --check dist/anyfinder.js`

## 2026-07-02T11:54:29Z - Add opt-in path capture diagnostics for phantom waypoint debugging

- User reported the hex-grid phantom-point issue still reproduces, so the next step was instrumentation instead of another blind behavior change.
- Scope updated:
  - `anyfinder/dist/anyfinder.js`
  - `anyfinder/languages/en.json`
- Change made:
  - Added new world setting `Detailed Path Capture` (`debugPathCapture`) gated behind the existing debug mode.
  - Added a new path-capture trace store and console emitter for all pathfinding requests, not just gridless traces.
  - Captured per-request details now include:
    - grid snapshot (`type`, `isGridless`, `isHexagonal`, `isSquare`, constructor name),
    - token snapshot and requested/history waypoints,
    - selected branch (`gridless_solver`, `foundry_backend`, `native_fallback`),
    - returned path, final offset to requested destination, and unexpected intermediate waypoints ("phantom" candidates).
  - Exposed new debug API helpers on `globalThis`:
    - `anyfinderDebugGetPathTraces()`
    - `anyfinderDebugLastPathTrace()`
    - `anyfinderDebugClearPathTraces()`
    - `anyfinderDebugGetPathTraceText()`
- Intended outcome:
  - Let the user reproduce the bad drag once and provide a concrete trace artifact showing exactly whether phantom points originate before backend handoff, inside the backend return, or during fallback/reuse logic.
- Validation done:
  - `node --check dist/anyfinder.js`

## 2026-07-02T12:02:41Z - Hex backend mitigation: prefer native when backend injects phantom waypoint

- Investigation result from path capture:
  - On a hex scene, Anyfinder backend returned a 3-point route with an unexpected midpoint (`3378,4275`) while native constrained movement returned the clean 2-point route for the same drag.
  - This confirmed the phantom point is backend-specific, not produced by the native fallback path.
- Scope updated:
  - `anyfinder/dist/anyfinder.js`
- Change made:
  - Added `anyfinderIsStrictHexScene()` and `anyfinderCountUnexpectedReturnedWaypoints(...)`.
  - In the `foundry_backend` branch, Anyfinder now computes the native path in parallel as a shadow compare.
  - If the scene is hex and the backend:
    - returns more points than native,
    - injects unexpected intermediate waypoint(s),
    - and native still lands on the requested final waypoint,
    then Anyfinder prefers the native route for that drag.
- Intended outcome:
  - Suppress the observed phantom midpoint regression on hex scenes without changing square/gridless behavior.
  - Keep the deeper capture data available in case a narrower backend fix is needed later.
- Validation done:
  - `node --check dist/anyfinder.js`

## 2026-07-02T12:06:17Z - Extend path capture with nearby wall and wall-crossing diagnostics

- New issue reported:
  - On hex maps, route selection around walls can plan overly broad surroundings while returned route segments still cross blocking walls, causing movement to stop at the wall.
- Scope updated:
  - `anyfinder/dist/anyfinder.js`
- Change made:
  - Added `anyfinderBuildPathWallAnalysis(...)` for path-capture traces.
  - Each captured path result now includes:
    - nearby blocking walls around the returned route,
    - exact route segments that intersect blocking wall segments,
    - crossing count,
    - minimum wall distance for the requested line and the returned route.
  - Compact/full console summary now includes `wallCross` count for faster triage.
- Intended outcome:
  - A single reproduced trace should now show both the path Anyfinder chose and whether/where that route geometrically crosses movement-blocking walls.
- Validation done:
  - `node --check dist/anyfinder.js`

## 2026-07-02T12:11:02Z - Add local hex bypass attempt for short wall-blocked moves

- Follow-up issue:
  - After rejecting illegal backend routes on hex scenes, native constrained movement can still return only the origin point for adjacent/nearby destinations across a wall.
- Scope updated:
  - `anyfinder/dist/anyfinder.js`
- Change made:
  - Added a local hex bypass search that:
    - detects direct wall intersections for the requested move,
    - generates detour candidates around the intersecting wall endpoints,
    - tests 1-hop and 2-hop detour paths,
    - accepts only candidates whose segments do not cross blocking walls.
  - The `foundry_backend` override path now prefers this local bypass before falling back to native stay-put behavior.
- Intended outcome:
  - Recover nearby hex moves that should legally go around a wall even when native fallback cannot compute that detour itself.
- Validation done:
  - `node --check dist/anyfinder.js`

## 2026-07-02T12:23:40Z - Reject token-blocked hex backend paths and widen wall-bypass candidates

- New failing trace:
  - A hex move still returned `backend_success` even though the backend route's projected token center path was blocked by a nearby wall; native also returned stay-put, so the previous override rule did not trigger.
- Scope updated:
  - `anyfinder/dist/anyfinder.js`
- Change made:
  - Added `anyfinderShouldRejectHexBackendPath(...)` so hex backend routes are rejected when:
    - projected token-center clearance is blocked,
    - backend wall crossings are worse than native,
    - or phantom waypoint expansion appears on a wall-crossing request.
  - Expanded local hex bypass candidate generation to include:
    - offsets from wall endpoints,
    - offsets from wall midpoints,
    - walls that intersect or closely graze the requested line,
    - and walls too close to the request start/end for the token radius.
  - Extended backend compare debug fields with:
    - request-line crossing counts,
    - min token-center wall distances,
    - and explicit rejection reason flags.
- Intended outcome:
  - Illegal hex backend routes should no longer be accepted just because native also cannot advance, and short wall-adjacent moves should have a better chance of finding a local legal detour.
- Validation done:
  - `node --check dist/anyfinder.js`

## 2026-07-02T12:29:55Z - Remove Foundry v14 fog exploration deprecation reads

- New issue reported:
  - Foundry v14 logs `BaseScene#fog.exploration is deprecated in favor of BaseScene#fog.mode`, pointing at `anyfinderUseFogRestriction(...)`.
- Scope updated:
  - `anyfinder/dist/anyfinder.js`
- Change made:
  - Added scene helpers for:
    - token vision enabled state,
    - fog exploration enabled state via `scene.fog.mode`.
  - Replaced direct `scene.fog.exploration` reads in:
    - `anyfinderUseFogRestriction(...)`
    - fog texture sync gate `L()`
  - Left a compatibility fallback to `fog.exploration` only if `fog.mode` is unavailable.
- Intended outcome:
  - Preserve current fog-restriction behavior on Foundry v14 without triggering compatibility warnings.
- Validation done:
  - `node --check dist/anyfinder.js`

## 2026-07-02T12:38:15Z - Stop rejecting hex paths for start-only wall proximity

- Regression reported:
  - The latest hex override became too aggressive and rejected many backend routes, often falling back to native stay-put behavior even when the backend had a plausible around-wall route.
- Scope updated:
  - `anyfinder/dist/anyfinder.js`
- Change made:
  - Added `anyfinderIsMeaningfulTokenCollision(...)`.
  - A token-collision override now only triggers when:
    - a traveled segment is blocked, or
    - a blocked projected center appears after the start point.
  - Start-point-only proximity to a wall no longer counts as enough reason by itself to reject the backend route.
  - The same meaningful-collision rule is now used by:
    - hex path simplification,
    - local hex bypass candidate acceptance,
    - and the backend/native override decision.
- Intended outcome:
  - Keep the stricter wall handling for truly illegal routes without suppressing most legal hex pathfinding near walls.
- Validation done:
  - `node --check dist/anyfinder.js`

## 2026-07-02T12:47:05Z - Migrate pathfinding option reads to v14 constrainOptions

- New issue reported:
  - Foundry v14 logs deprecations for `ignoreWalls`, `ignoreCost`, and `history` on `Token#findMovementPath`, all pointing to Anyfinder reading the legacy top-level option fields.
- Scope updated:
  - `anyfinder/dist/anyfinder.js`
- Change made:
  - Added helpers to normalize movement options through `constrainOptions`.
  - Updated these call paths to use normalized options only:
    - `anyfinderShouldUsePathfinding(...)`
    - `anyfinderBuildPathCaptureContext(...)`
    - `anyfinderBuildGridlessTraceContext(...)`
    - `anyfinderFindGridlessPath(...)`
    - `anyfinderFindPathWithFallback(...)`
    - `anyfinderNativeFallback(...)`
    - the libWrapper hook for `Token#findMovementPath`
- Intended outcome:
  - Preserve the existing pathfinding behavior on Foundry v14 while eliminating compatibility warnings from legacy movement option getters.
- Validation done:
  - `node --check dist/anyfinder.js`

## 2026-07-02T12:56:45Z - Trim illegal fallback routes to a safe legal prefix

- New issue reported:
  - Some hex traces still returned an illegal route after rejecting the backend path, because native fallback itself could also be wall-blocked and was still being returned unchanged.
- Scope updated:
  - `anyfinder/dist/anyfinder.js`
- Change made:
  - Added `anyfinderTrimPathToLegalPrefix(...)`.
  - When hex override rejects the backend route and native fallback is also meaningfully blocked:
    - the returned path is now trimmed to the longest safe prefix instead of returning the known-illegal blocked route.
  - Added explicit trace outcome/note variants for the trimmed case.
- Intended outcome:
  - The module should no longer accept or return a route that its own collision analysis already marked illegal, even when no legal detour was found.
- Validation done:
  - `node --check dist/anyfinder.js`

## 2026-07-02T13:04:10Z - Roll back broad hex native-override behavior

- User-requested rollback:
  - The wider hex override logic was preventing tokens from moving away from wall-cut hexes, especially when native fallback itself was too conservative.
- Scope updated:
  - `anyfinder/dist/anyfinder.js`
- Change made:
  - Restored the narrower override rule for hex token collisions:
    - only override to native when backend has a meaningful collision and native does not.
  - Removed the trimmed-native fallback path from the main hex override branch.
  - Kept the newer logging, deprecation fixes, and wall analysis intact.
- Intended outcome:
  - Return to the earlier hex movement behavior before the broader native-override rollback logic started blocking ordinary escape moves from compromised hexes.
- Validation done:
  - `node --check dist/anyfinder.js`

## 2026-07-02T13:09:40Z - Restore full movement options object through wrapper

- New regression reported:
  - Grid movement broadly broke after the wrapper started passing only normalized `constrainOptions` through the entire pathfinding stack.
- Scope updated:
  - `anyfinder/dist/anyfinder.js`
- Change made:
  - Restored the libWrapper hook to pass Foundry's original `findMovementPath` options object into:
    - `anyfinderShouldUsePathfinding(...)`
    - `anyfinderNativeFallback(...)`
    - `anyfinderFindPathWithFallback(...)`
  - Kept the internal v14-safe readers that normalize through `constrainOptions`, so the deprecation fixes remain.
- Intended outcome:
  - Preserve v14 compatibility without stripping non-constrain option data that normal grid movement still relies on.
- Validation done:
  - `node --check dist/anyfinder.js`

## 2026-07-02T13:14:20Z - Restore original movement options inside pathfinding flow

- Follow-up regression:
  - Even after fixing the wrapper, the core pathfinding flow was still internally switching to normalized `constrainOptions`, which could still break ordinary grid movement.
- Scope updated:
  - `anyfinder/dist/anyfinder.js`
- Change made:
  - Reverted `anyfinderFindPathWithFallback(...)` to use the original Foundry options object throughout.
  - Kept v14-safe access only in the helper readers that inspect:
    - `ignoreWalls`
    - `ignoreCost`
    - `history`
  - Left `anyfinderNativeFallback(...)` normalization in place for `constrainMovementPath(...)`.
- Intended outcome:
  - Restore baseline square/grid movement behavior while preserving the compatibility fix for deprecated option getters.
- Validation done:
  - `node --check dist/anyfinder.js`

## 2026-07-02T13:20:05Z - Defer single-waypoint movement calls to Foundry

- New trace observation:
  - Square-grid captures were reaching Anyfinder with only a single waypoint equal to the token's current square, producing a no-op `backend_success` result instead of a real movement preview.
- Scope updated:
  - `anyfinder/dist/anyfinder.js`
- Change made:
  - Updated the libWrapper hook for `Token#findMovementPath` to immediately call the wrapped Foundry method when fewer than two waypoints are provided.
- Intended outcome:
  - Let Foundry handle its own early drag/setup calls and reserve Anyfinder's backend pathfinding for calls that already include an actual route segment to solve.
- Validation done:
  - `node --check dist/anyfinder.js`

## 2026-07-02T14:00:00Z - Hex phantom-point fix confirmed: backend override (Fix 2)

- After triaging multiple hex-grid phantom waypoint fixes, the second fix
  (2026-07-02T12:02:41Z) was confirmed as the correct resolution.
- Fix applied to `dist/anyfinder.js`:
  - Added `anyfinderIsStrictHexScene()` to positively identify hex scenes.
  - Added `anyfinderCountUnexpectedReturnedWaypoints(...)` to detect phantom
    intermediate waypoints injected by the pathfinding backend.
  - In `anyfinderFindPathWithFallback`, the `foundry_backend` branch now
    computes the native path in parallel and prefers it when:
    - the scene is hex,
    - the backend returns more waypoints than native,
    - unexpected intermediate waypoints are detected,
    - and native still lands on the requested final waypoint.
- The first fix (gridless scene hardening with `CONST.GRID_TYPES`) was reverted
  after confirmation it did not resolve the hex phantom-point issue.
- Validation: `node --check dist/anyfinder.js` passed.

## 2026-07-02T14:15:00Z - Debug infrastructure: path capture + wall analysis + file-based logging

- Migrated advanced debug infrastructure from codex-backups into
  `dist/anyfinder.js`:
  - `anyfinderPathCaptureState` — ring buffer for per-request path capture
    traces.
  - `anyfinderPathCaptureEnabled()` — gates capture on `debugMode` setting.
  - `anyfinderBuildPathCaptureContext(...)` — captures token state, grid
    snapshot, settings, and requested/history waypoints before pathfinding.
  - `anyfinderFinalizePathCapture(...)` — computes wall analysis, token
    clearance analysis, unexpected waypoints, and final offset, then stores
    the completed trace.
  - `anyfinderBuildPathWallAnalysis(...)` — JSON-based wall crossing analysis:
    identifies wall segments near and crossing the returned route, computes
    min wall distances, and enumerates exact crossing points.
  - `anyfinderAnalyzeTokenClearancePath(...)` — projects token center along
    the returned path and checks for wall-blocked points/segments.
  - `anyfinderIsMeaningfulTokenCollision(...)` — distinguishes meaningful
    wall collisions from start-point-only proximity.
  - Helper utilities: `anyfinderGetGridSnapshot`, `anyfinderDebugPointDistance`,
    `anyfinderBuildPathComparison`, `anyfinderGetTokenCenterOffsetSnapshot`.
- Replaced console-based trace emission with file-based session logging:
  - `anyfinderDebugWriteSessionLog()` — serializes all accumulated path
    capture traces to JSON and triggers a browser download with a
    timestamped filename.
  - Auto-save on `canvasTearDown` via hook.
  - Created `/debug` directory for future server-side log storage.
- Exposed new debug APIs on `globalThis`:
  - `anyfinderDebugGetPathTraces()`
  - `anyfinderDebugLastPathTrace()`
  - `anyfinderDebugClearPathTraces()`
  - `anyfinderDebugGetPathTraceText()`
  - `anyfinderDebugWriteSessionLog()`
- Wired path capture into `anyfinderFindPathWithFallback` for the
  `foundry_backend` and fallback branches.
- Validation: `node --check dist/anyfinder.js` passed.

## 2026-07-02T15:00:00Z - Gridless performance fix: loosen worker result tolerances

- **Problem**: Gridless pathfinding was slow or non-responsive on fast
  drags. The worker computed paths correctly, but the result consumption
  and displayed-path reuse had extremely tight distance tolerances
  (1.5-4px target tolerance, 1200ms timeout). Any drag moving faster than
  ~4px/frame would discard the worker's result and fall through to the
  blocking synchronous A* solver.
- **Root cause**: `anyfinderTryConsumeWorkerResult` and
  `anyfinderGetDisplayedWorkerPath` rejected cached worker paths when the
  cursor moved more than a few pixels between frames.
- **Fix**: Increased tolerances dramatically:
  - Worker result timeout: 1200ms → 5000ms
  - Worker target tolerance: 1.5-4px → 24-160px
  - Displayed path timeout: 2200ms → 10000ms
  - Displayed path tolerance: 8-32px → 80-400px
- **Result**: Fast drags now reuse the worker's last valid path instead of
  triggering the sync solver. Gridless pathfinding is responsive at all
  drag speeds.
- Also added path simplification pass in `anyfinderBuildWorkerOverlayPath`
  to reduce rendered waypoint count (fewer line segments = faster canvas
  rendering on CPU-only systems).
- Also added diagnostic warning when gridless worker fails to initialize
  (one-time log per session).

## 2026-07-02T15:15:00Z - v14 compatibility fixes

- Fixed deprecated `ignoreWalls`/`ignoreCost`/`history` accesses in
  gridless path by routing through `anyfinderGetConstrainOptions` and
  `anyfinderGetConstraintHistory`.
- Fixed `CONST.WALL_SENSE_TYPES` → `CONST.EDGE_SENSE_TYPES` deprecation.
- Fixed global `FilePicker` → `foundry.applications.apps.FilePicker`
  namespace.
- Fixed `anyfinderNativeFallback` to pass options through `constrainOptions`.
- Updated module.json compatibility: verified `14`, maximum `14`.
- Fixed `canvas.scene.fog.exploration` → `canvas.scene.fog.mode` via
  `anyfinderIsSceneFogExplorationEnabled` helper.

## 2026-07-02T15:30:00Z - Hex pathfinding: known limitation

- **Status**: Hex grid pathfinding remains a known limitation. The Rust/WASM
  backend (both v13 147KB and v14 660KB) produces broken routes at wall
  junctions — phantom waypoints, wall-crossing segments, and convoluted
  detours.
- **Current mitigation**: Two-gate JS override system:
  - `hex_override_native`: backend injects phantom waypoints AND native
    reaches target → prefer native
  - `hex_override_wall_cross`: backend path crosses walls AND native
    is clean → prefer native
  - `hex_kept_backend_both_cross`: both cross walls → keep backend
    (at least it navigates around walls)
- **Root cause**: The WASM path graph construction treats hex grids with
  square-grid topology, producing incorrect routing at wall junctions
  where multiple walls intersect. Wayfinder v14 added hex type enums
  (HexEvenQ/R/OddQ/R) to the WASM but the actual pathfinding output
  remains broken — suggesting the fix was incomplete.
- **Experiments tried and rejected**:
  - Hex reroute loop (injected detour waypoints) — made paths worse
  - Custom hex A* solver — failed due to Foundry v14 HexagonalGrid API
    mismatches (`getCenter`, `getOffset`, `columns`, `rows`)
  - Forking Wayfinder v14 as `anyfinder-next` — same broken hex output
  - Heavy phantom override — overrode legal around-wall detours
  - Hex WASM bypass (native only) — native Foundry just walks into walls
- **Path forward**: Requires either Rust source code access to fix the
  WASM topology, or a properly-implemented hex A* using Foundry v14's
  HexagonalGrid API (needs research into correct method names).
