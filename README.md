# Anyfinder Next

Next-generation system-agnostic pathfinding for Foundry VTT v14.

Forked from 7H3LaughingMan's Wayfinder v14 with hex grid awareness built into the WebAssembly pathfinding core.

## What's Different from Anyfinder (v13)

- **Hex grid awareness** — The v14 WASM core has explicit support for hex grid offset types (HexEvenQ/R, HexOddQ/R), eliminating the phantom waypoint and wall-crossing issues.
- **660KB WASM** (vs 147KB in v13) — more sophisticated path graph with correct hex topology.
- **Region support** — respects Foundry v14 Region movement restrictions.
- **Cancellation tokens** — supports cancelling in-progress pathfinding.
- **Simpler JS wrapper** — 160 lines of clean JS, all logic in the WASM.

## Requirements

- Foundry VTT v14
- lib-wrapper

## Installation

Copy to `Data/modules/anyfinder-next`. Do NOT enable alongside Anyfinder.

## Credits

- Original Wayfinder v14 by 7H3LaughingMan
- Forked and maintained by Apostol Apostolov
