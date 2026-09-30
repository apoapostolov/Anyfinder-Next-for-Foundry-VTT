# Anyfinder Next for Foundry VTT

*Drag a token toward its destination and let it find a route around the walls.*

Anyfinder Next plans movement through square, hex, and gridless scenes while
you drag. It checks a proposed route against Foundry's movement rules before
the token moves, so an unfinished calculation does not become an accidental
trip through a wall. It works across game systems on Foundry VTT v14.

[![Foundry v14](https://img.shields.io/badge/Foundry-v14-green)](https://foundryvtt.com/)
[![Module Version](https://img.shields.io/badge/version-14.0.6-blue)](./module.json)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](./LICENSE.md)
[![Issues](https://img.shields.io/github/issues/apoapostolov/Anyfinder-Next-for-Foundry-VTT)](https://github.com/apoapostolov/Anyfinder-Next-for-Foundry-VTT/issues)

## In 14.0.6

- Gridless pathfinding is enabled by default after a GM acknowledgement.
- Gridless routing warns the GM that complex maps may take a moment to solve.
- The GM can tune how closely tokens squeeze past a wall; the default is a
  conservative 10% overlap allowance.

See the full [changelog](./CHANGELOG.md).

## What You Can Do

- **Route around walls.** Find practical movement paths through square and hex
  scenes using Foundry's wall and region constraints.
- **Use gridless maps.** A route appears when the module finds one it can
  verify. Until then, dropping the token does not send it through a barrier.
- **Tune tight passages.** Allow a configurable percentage of token width to
  overlap wall clearance while keeping the token center and vision centerline
  on the legal side of walls.
- **Respect fog.** Restrict pathfinding to areas explored by the current user
  when the setting is enabled.
- **Understand a blocked move.** Optional diagnostics explain why a route
  could not be used; the console helpers below give developers more detail.

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

There is no published GitHub Release or manifest download for this repository
yet. For a source install, clone the repository to
`Data/modules/anyfinder-next`, then enable the module in your world.
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
