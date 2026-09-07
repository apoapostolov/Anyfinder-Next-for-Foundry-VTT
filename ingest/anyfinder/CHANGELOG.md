# Changelog

All notable changes to this project are documented in this file.

## [14.0.0] - 2026-07-02

### Added

- **Foundry VTT v14 compatibility** — Anyfinder now runs on Foundry v14 with no deprecation warnings. All pathfinding features work across square, hex, and gridless scenes.
- **Debug session logging** — When Debug Mode is enabled, Anyfinder writes a complete JSON trace of every pathfinding decision to `Data/debug/` (your Foundry user data folder). Each session produces one file with full wall analysis, token clearance data, and route outcomes. Use `anyfinderDebugWriteSessionLog()` in the console to manually export.
- **Shift+P keybinding** — Toggle personal pathfinding preference without opening the token controls toolbar.

### Improved

- **Gridless pathfinding is now responsive at all drag speeds** — Previously, fast cursor movements would discard the computed route and fall back to slow synchronous calculation. The route now persists smoothly even during rapid drags across the map.
- **Path simplification** — Gridless routes now have fewer displayed waypoints. Intermediate nodes that don't contribute to wall avoidance are automatically removed, making the rendered path cleaner and faster to draw.
- **Pathfinding is on by default for all players** — The `Force Pathfinding for All Players` world setting (default: ON) means GMs don't need to tell every player to enable it manually.
- **Smarter wall avoidance on hex grids** — Anyfinder now compares the backend route against Foundry's native pathfinding and automatically prefers the cleaner result. Routes that cross walls are rejected in favor of legal alternatives.
- **Cleaner UI** — Only the computed route is now visible during drag. The straight-line measurement preview is suppressed when pathfinding is active.

### Fixed

- **Phantom waypoints on hex grids** — The pathfinding backend sometimes injected unnecessary midpoint detours on hexagonal maps. Anyfinder now detects these and falls back to the cleaner native route when both reach the same destination.
- **Wall-crossing routes rejected** — Routes that geometrically cross blocking wall segments are now automatically rejected and replaced with legal alternatives.
- **Gridless performance on large maps** — Tight internal tolerances (as low as 1.5 pixels) prevented cached routes from being reused during fast drags. Tolerances are now relaxed (up to 400 pixels) so the async worker's results are preserved across rapid cursor movements.
- **All v14 deprecation warnings eliminated** — No more console spam about deprecated `ignoreWalls`, `ignoreCost`, `history`, `WALL_SENSE_TYPES`, `fog.exploration`, or `FilePicker` APIs.

### Known Limitations

- **Hex grid pathfinding at wall junctions** — Routes around complex wall intersections (where multiple walls meet at corners) may still show unnecessary detour waypoints. This is a limitation of the underlying pathfinding engine shared by all Foundry pathfinding modules. Isolated walls and simple corridors route correctly.

## [13.0.0] - 2026-02-19

### Added

- Initial standalone public release of Anyfinder.
- System-agnostic token pathfinding wrapper for Foundry VTT v13.
- Token Controls pathfinding toggle.
- Optional world fog-exploration restriction for route planning.
- Wall lifecycle synchronization (create/update/delete).
- Safe fallback behavior to native movement pathing.
- Gridless pathfinding with token-size-aware wall clearance.
- Configurable gridless graph sampling (`gridlessNodeStepPx`) and optional
  squeeze/leeway controls.
- Global force setting to enable pathfinding for all players by default.

### Improved

- Curved-wall routing reliability is significantly improved, including dense and
  irregular wall chains.
- Invalid diagonal corner-cutting near curved wall pinch points is prevented.
- Drag responsiveness is significantly improved in dense wall scenes.
- Long gridless routes on large scenes now degrade step size automatically when
  scene node budgets are exceeded, instead of failing immediately.
- Adaptive A* iteration cap for gridless routing to reduce early stop behavior
  on long, curvy routes.
- Reduced hard-corner sticking with targeted corner-guard handling.
- Gridless drag pathing is now significantly more stable during long/complex
  drags by using staged retry tiers, blocked-endpoint projection, and
  short-window reuse of last valid paths instead of dropping immediately.
- Added `Gridless Minimum Center Clearance (px)` so squeeze leeway cannot
  collapse effective collision below a safe floor in dense wall clusters.
- Final route validation around walls is more consistent and avoids false-safe
  line choices in tight corridors.
- Route recomputation during active drag is more stable with fewer visible
  path drops.

### Implementation Notes (Gridless Internals)

- The gridless A* open set now uses a binary min-heap (`MinHeap`) to reduce
  queue maintenance overhead on dense scenes.
- Wall segments are pre-indexed with axis-aligned bounds (`minX/maxX/minY/maxY`)
  so point/edge collision checks can skip non-overlapping segments earlier.
- Graph edge construction is built symmetrically in a forward pass, then mirrored
  to opposite directions to reduce redundant checks.
- A guarded fallback solver path is retained: if the optimized pass does not
  recover a route, a legacy `Set`-based open-set search is retried for safety.

### Distribution

- Public repository bootstrap at:
  `https://github.com/apoapostolov/Anyfinder-for-Foundry-VTT`
- Manifest and download URLs wired for direct Foundry installation.
