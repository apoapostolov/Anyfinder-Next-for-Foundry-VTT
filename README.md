# Anyfinder Next for Foundry VTT

System-agnostic, wall-aware token pathfinding for Foundry VTT v14.

[![Foundry v14](https://img.shields.io/badge/Foundry-v14-green)](https://foundryvtt.com/)
[![Module Version](https://img.shields.io/badge/version-14.0.6-blue)](./module.json)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](./LICENSE.md)
[![Manifest](https://img.shields.io/badge/Manifest-module.json-orange)](https://github.com/apoapostolov/Anyfinder-Next-for-Foundry-VTT/releases/latest/download/module.json)
[![Issues](https://img.shields.io/github/issues/apoapostolov/Anyfinder-Next-for-Foundry-VTT)](https://github.com/apoapostolov/Anyfinder-Next-for-Foundry-VTT/issues)

Anyfinder Next finds wall-aware movement paths while a token is dragged. It
supports square, hex, and gridless scenes, uses Foundry v14 movement origins,
and validates generated paths through Foundry before allowing a token to move.

## What's New in 14.0.6

- Gridless pathfinding is enabled by default after a GM acknowledgement.
- Gridless routing explains dead zones and the possible calculation delay.
- Tight-passage overlap uses a conservative 10% default instead of a fixed
  60%-passage assumption.
- The wall-overlap allowance is configurable from Game Settings with a slider.
- Worker, cache, origin, endpoint, and Foundry collision validation are covered
  by regression tests.

See the full [changelog](./CHANGELOG.md).

## What You Can Do

- **Route around walls.** Find practical movement paths through square and hex
  scenes using Foundry's wall and region constraints.
- **Use gridless maps.** Generate graph-backed routes with adaptive resolution,
  Worker calculations, and a fail-closed result while a verified path is not
  ready.
- **Tune tight passages.** Allow a configurable percentage of token width to
  overlap wall clearance while keeping the token center and vision centerline
  on the legal side of walls.
- **Respect fog.** Restrict pathfinding to areas explored by the current user
  when the setting is enabled.
- **Diagnose blocked movement.** Capture route stages, relevant walls, cache
  state, Worker status, and the last rejected candidate from the browser
  console.

## Quick Start

1. Enable **Anyfinder Next** in your world.
2. Open **Settings → Anyfinder Next** and review the Pathfinding settings.
3. On a gridless map, acknowledge the warning before using pathfinding.
4. Drag a token and wait for the pathfinding line before releasing it.
5. If a sparse gridless route does not appear, move the pointer slightly so it
   can connect to a nearby navigation node.

## Settings

| Setting | Default | Effect |
| --- | --- | --- |
| Enable Pathfinding for Everyone | On | Enables pathfinding for players by default |
| Respect Explored Fog | On | Restricts routes to explored map areas |
| Enable Pathfinding on Gridless Maps | On | Enables gridless routing after GM acknowledgement |
| Gridless Route Detail | 40 px | Controls graph sampling detail and performance |
| Allow Tight-Passage Movement | On | Enables the configurable overlap allowance |
| Tight-Passage Wall Overlap | 10% | Maximum token-width overlap in narrow passages |
| Enable Diagnostic Logging | Off | Records technical routing diagnostics |

## Diagnostics

Enable **Settings → Anyfinder Next → Enable Diagnostic Logging**, then use the
following helpers in the browser developer console after a blocked movement:

```js
anxDebugGetLastBlockedMovement()
anxDebugExplainLastFailure()
anxDebugWriteSessionLog()
```

The diagnostics identify whether a route was still calculating, exceeded a
search budget, could not attach to the graph, had no connected route, failed
final collision validation, or was changed by Foundry.

## Installation

In Foundry's **Configuration and Setup**, open **Add-on Modules**, choose
**Install Module**, and paste:

```text
https://github.com/apoapostolov/Anyfinder-Next-for-Foundry-VTT/releases/latest/download/module.json
```

For a source install, clone the repository to `Data/modules/anyfinder-next`.
Do not enable it alongside the original Anyfinder module.

## Compatibility

| Component | Support |
| --- | --- |
| Foundry VTT | v14 only |
| Game systems | System agnostic |
| Module id | `anyfinder-next` |
| Required module | lib-wrapper |
| License | MIT |

## Development

Use Node.js 20 or newer.

```bash
npm test
npm run check
```

## Credits

Anyfinder Next is forked from 7H3LaughingMan's Wayfinder v14 and maintained by
Apostol Apostolov.
