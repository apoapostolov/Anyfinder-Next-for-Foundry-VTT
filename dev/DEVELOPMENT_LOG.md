# Development Log

## 2026-09-09 — Commit current state

- Prepared the current Anyfinder Next state for commit.
- Focused gridless worker and integration tests passed.
- Confirmed the live copy is under `C:/FoundryData.14/Data/modules/anyfinder-next`.
- No Git remote is configured for this checkout, so push is pending a remote.
- Commit: `515c488` (`feat-polish-gridless-routing`), target `main`.

## 2026-09-09 — Repository template and remote preparation

- Reviewed neighboring git-foundry README and Keep a Changelog patterns.
- Prepared the Anyfinder Next README with badges, feature overview, quick
  start, settings, installation, diagnostics, compatibility, and development
  sections.
- Added the 14.0.6 changelog entry and updated module URLs for the new
  `Anyfinder-Next-for-Foundry-VTT` repository.
- GitHub authentication is available and the target repository does not yet
  exist.

## 2026-09-09 — Remote created

- Created public repository `apoapostolov/Anyfinder-Next-for-Foundry-VTT`.
- Configured `origin` and pushed the existing `main` history.
- The README/CHANGELOG/module metadata changes remain to be committed and
  pushed.

## 2026-09-09 — Gridless latency and dead-zone redesign

- The supplied trace range `#1040–#1313` contained 274 unique requests: 164
  successes and 110 fail-closed `worker_pending` results.
- All 110 blocked traces stopped at `worker_wait`; 62 still had work in flight,
  90 crossed a wall, and 98 violated token-clearance on the direct route.
- The median blocked request was 31 ms, p90 was 98 ms, and the worst cases were
  1064–1213 ms. Forty current-geometry Worker-path rejections clustered around
  the same narrow wall areas, confirming Worker/main-thread semantic drift.
- Work started to persist rolling diagnostics locally, bypass unnecessary
  searches for directly legal movement, cache scene geometry, and coalesce or
  supersede obsolete Worker requests.
