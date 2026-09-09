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

## 2026-09-09 — Documentation commit

- Commit: `6e7c459` (`feat-add-anyfinder-next-project-docs`), target `main`.
- Pushed successfully to `origin/main`.

## 2026-09-09 — Persistent debug storage

- Foundry reported that `modules/anyfinder-next/storage` did not exist when
  Debug Mode attempted its persistent upload.
- Added `storage/.gitkeep` to the checkout and created the matching live
  directory under `C:/FoundryData.14/Data/modules/anyfinder-next`.
- Full test suite passed: 30 tests.

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

## 2026-09-09 — Non-blocking gridless drag and persistent diagnostics

- Confirmed that walk masks, walk graphs, and segment routes were already
  memoized. The main latency source was waiting up to 1.2 seconds for ordinary
  Worker requests and 8 seconds for long routes, not rebuilding the node map.
- Added a synchronous fast path that validates the requested center route
  against cached walls and Foundry's movement constraint before any A* work.
- Added local corridor repair: nearby targets first connect from the old
  endpoint, then walk backward through prior bends until a fully legal suffix
  is found. Every candidate is revalidated against current geometry and
  Foundry before display or movement.
- Removed Worker waits from the drag hot path. Unresolved movement remains
  fail-closed while the latest coalesced Worker calculation continues.
- Cached blocking-wall extraction and serialization. The main thread now sends
  one `set_geometry` snapshot per scene/wall revision; subsequent solve
  messages contain only query data.
- Fixed a correctness defect in both segment caches: rounded keys previously
  replaced endpoints and returned without validating the new connectors.
  Invalid hits are now evicted and solved afresh.
- Replaced timestamped console-oriented exports with a GM-written, debounced
  rolling file in Foundry persistent module storage:
  `modules/anyfinder-next/storage/anyfinder-next-debug-latest.json`.
  It includes failure digests, full gridless traces, and cross-grid captures.
- Restricted full console trace/Worker diagnostic emission to Full diagnostic
  detail so the local file is the primary debugging boundary.
- Added regression coverage for geometry reuse, exact cache-hit validation,
  non-blocking Worker scheduling, direct fast-path wiring, persistent logging,
  and walking a stale route backward to a safe bend.
- Verification: syntax checks passed; 29/29 Node tests passed.

## 2026-09-09 — Live deployment and latency verification

- Deployed `module.json`, `dist/anyfinder-next.js`, and
  `dist/anyfinder-gridless-worker.js` with the approved `foundry_live_sync`
  workflow.
- Confirmed checkout/live-install MD5 parity for all three files, then fetched
  each from Foundry on port 30005 with HTTP 200 and matching byte counts/hashes.
- Confirmed that the reloaded world writes and continuously refreshes the local
  rolling log at
  `C:/FoundryData.14/Data/modules/anyfinder-next/debug/anyfinder-next-debug-latest.json`.
  Foundry used the documented module-directory fallback rather than the
  preferred persistent-storage subdirectory on this host.
- A live rolling sample of 200 gridless traces measured 1.9 ms median, 3.2 ms
  p90, 18.3 ms p95, and 21.1 ms maximum request time. This removes the prior
  31 ms median, 98 ms p90, 123 ms p95, and 1213 ms tail caused by waiting on the
  Worker in the drag path.
- During a later obstructed drag burst, `worker_pending` requests returned in
  roughly 1–5 ms and remained fail-closed; later frames reused verified Worker
  output and ended in successful paths. No illegal straight-line fallback was
  observed in the file trace.
- Two novel obstructed transitions still produced 7- and 17-frame pending runs
  spanning about 172 ms and 389 ms. This is asynchronous first-result latency,
  not a blocked drag call. The audit records stable-target refinement as the
  appropriate next scheduling optimization.
- The browser-control runtime could not initialize because its local kernel
  assets path was missing. Live behavior was therefore verified from the
  module's own newly persisted in-world trace rather than DevTools/CDP.
- Live verification showed that `game.modules` still reflected the manifest
  loaded before live sync, so the first session selected the debug-directory
  fallback. Updated the writer to attempt Foundry's documented
  `uploadPersistent` API directly and fall back to the module debug directory
  if the server has not yet accepted the new package capability.
- Re-ran all 29 tests after that correction, live-synced the revised main
  bundle, and confirmed HTTP 200 with matching checkout/live/served MD5
  `538dc2107260d885465400606226a923`.
- Changed ordinary Worker requests to use the bounded interactive ladder while
  the cursor moves. A full refinement is now queued only when the same target
  remains unresolved for 180 ms; castle-scale routes retain the full ladder.
- Verification after the scheduling change: syntax checks passed, all 29 tests
  passed, and `git diff --check` passed. Live-synced the final bundle and
  confirmed checkout/live/HTTP parity at MD5
  `e010fc25c15a095e3c5e0f3477424bec`.

## 2026-09-09 — Bounded freehand corridor rebasing

- The user confirmed that the illegal-move and dead-zone fixes now behave
  correctly, but identified that successful corridor repair could continue
  indefinitely as a precision freehand polyline.
- Added per-token cumulative repair distance and repair-count tracking. The
  rebase budget is the larger of 80 px or 2.5 configured node steps, with a
  16-repair safety cap for tiny pointer movements.
- Crossing the budget queues a fresh Worker solve and checks for a verified
  replacement before returning the corridor. The current collision-safe path
  remains visible while the Worker runs, so rebasing does not recreate a dead
  zone.
- A successful `worker_corridor_rebase` atomically replaces the accumulated
  tail and resets the repair budget.
- Added a regression test for cumulative-distance rebasing. Syntax checks and
  all 30 tests pass.
- Final review found that consuming a fast Worker result could leave its
  delayed full-refinement timer armed. Successful direct, Worker, main, and
  rebased routes now cancel matching timers and queued payloads, avoiding an
  unnecessary second solve.
- Re-ran all 30 tests, live-synced the corrected bundle, and confirmed
  checkout/live/HTTP parity at MD5
  `bcbfca440d63ade4e1388915d0eb0d6d` with HTTP 200.
