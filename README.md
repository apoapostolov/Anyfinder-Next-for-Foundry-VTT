# Anyfinder Next

Next-generation system-agnostic pathfinding for Foundry VTT v14.

Forked from 7H3LaughingMan's Wayfinder v14 with hex grid awareness built into the WebAssembly pathfinding core.

## What's Different from Anyfinder (v13)

- **Hex grid awareness** — The v14 WASM core has explicit support for hex grid offset types (HexEvenQ/R, HexOddQ/R), eliminating the phantom waypoint and wall-crossing issues.
- **660KB WASM** (vs 147KB in v13) — more sophisticated path graph with correct hex topology.
- **Region support** — respects Foundry v14 Region movement restrictions.
- **Cancellation tokens** — supports cancelling in-progress pathfinding.
- **Gridless squeeze routing** — token-relative clearance supports configurable wall overlap (20% of token width by default, equivalent to the previous 60%-width passage) while keeping the movement and vision centerline on the legal side of every wall.
- **Gridless pathfinding opt-in notice** — pathfinding is enabled by default on gridless maps, with a GM acknowledgement explaining the possible dead zones and calculation delay.
- **Foundry-verified gridless movement** — routes are solved in movement-origin coordinates, converted back to token positions, and rejected if Foundry's own collision constraint would alter them.
- **Large-map gridless routing** — route-focused Worker graphs, spatial wall indexing, and adaptive fine-resolution retries preserve narrow alleys over long distances.

## Requirements

- Foundry VTT v14
- lib-wrapper

## Repository layout

- `dist/` — Foundry runtime bundle and gridless Worker.
- `tests/` — Node regression tests for gridless routing and integration wiring.
- `docs/GRIDLESS-PATHFINDING.md` — gridless geometry, graph, A*, scheduling, edge cases, and optimization study.
- `PATHFINDING-AUDIT.md` — square, hex, and gridless audit with remediation status.
- `ingest/anyfinder/` — read-only comparison snapshot copied from the installed normal Anyfinder v14 module. It is not loaded by the Next manifest.

Run `npm test` for the fixture suite and `npm run check` for JavaScript syntax validation.

## Diagnosing blocked gridless movement

Enable **Settings → Anyfinder Next → Record Diagnostics**. After Anyfinder prevents a movement because no verified route exists, open the browser developer console and run:

```js
anxDebugGetLastBlockedMovement()
```

The result identifies whether the route was still calculating, exceeded a search budget, could not attach to the graph, had no connected route, collided during final validation, or was changed by Foundry. It also includes relevant wall IDs and coordinates, token clearance, Worker/cache state, and the last rejected candidate. `anxDebugExplainLastFailure()` includes the same diagnosis with the solver-attempt summary. Use `anxDebugWriteSessionLog()` to save the complete trace set.

## Installation

Copy to `Data/modules/anyfinder-next`. Do NOT enable alongside Anyfinder.

## Credits

- Original Wayfinder v14 by 7H3LaughingMan
- Forked and maintained by Apostol Apostolov
