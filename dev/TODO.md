# Create and publish Anyfinder Next remote

- [x] Audit neighboring project README and CHANGELOG templates.
- [x] Confirm GitHub authentication and repository availability.
- [x] Update README, CHANGELOG, and module metadata for the new repository.
- [x] Run validation and live HTTP checks.
- [x] Create the GitHub repository and configure `origin`.
- [x] Commit the repository-template changes.
- [x] Push `main` and verify the remote branch.
- [x] Create the live `storage` directory required by persistent debug logs.

## Review

The repository will use the same user-facing template as neighboring
git-foundry modules: badges, What's New, feature summary, quick start,
settings, installation, compatibility, development, and credits.

## Commit review

- Existing implementation commit: `515c488` (`feat-polish-gridless-routing`).

## Remote review

- Repository: `https://github.com/apoapostolov/Anyfinder-Next-for-Foundry-VTT`
- Visibility: public

## Commit review

- Commit: `6e7c459` (`feat-add-anyfinder-next-project-docs`), target `main`.
- Pushed successfully to `origin/main`.

## Debug storage fix

- Added `storage/.gitkeep` to preserve the persistent upload target in fresh
  installs.
- Created `C:/FoundryData.14/Data/modules/anyfinder-next/storage` in the live
  test install.

# Remove gridless drag latency and make diagnostics filesystem-first

- [x] Capture the current failure evidence and identify the dominant causes.
- [x] Add an automatic, debounced rolling diagnostics file in the live module.
- [x] Add a synchronous authoritative fast path for direct legal gridless moves.
- [x] Cache immutable scene wall geometry and reuse it across drag frames.
- [x] Reduce obsolete Worker work and prevent stale calculations from blocking
  the latest pointer target.
- [x] Add regression/performance tests for open space, short moves, wall changes,
  and repeated nearby targets.
- [x] Run syntax/tests, deploy through the approved live-sync workflow, and
  verify the served module plus browser behavior on port 30005.
- [ ] Reload the world once more and compare the final two-stage Worker
  scheduler against the static log's prior 172–389 ms pending runs.

## Review

Implementation and live verification are complete. The node/walk graph was
already memoized; the dominant delays came from awaiting stale Worker searches
and repeatedly cloning wall geometry. Direct legal routes now bypass A*, nearby
targets safely repair the last path corridor, and both Worker and main rounded
cache hits revalidate exact endpoints. The suite passes 29/29 tests. The three
runtime files were deployed through `foundry_live_sync`, served with HTTP 200,
and matched the checkout hashes. The reloaded world produced the rolling debug
file at `modules/anyfinder-next/debug/anyfinder-next-debug-latest.json`. A live
200-trace sample measured 1.9 ms median, 3.2 ms p90, and 21.1 ms maximum request
time; subsequent traces recovered from non-blocking `worker_pending` frames to
verified path successes without allowing an illegal direct fallback. The final
two-stage Worker scheduling refinement is deployed and served, but still needs
one browser reload before its in-world trace can be compared with that baseline.

# Rebase long freehand corridor tails

- [x] Diagnose why corridor reuse accumulates pointer positions indefinitely.
- [x] Add a distance/complexity budget for repaired corridor tails.
- [x] Queue a fresh node route after the budget without hiding the valid path.
- [x] Replace the freehand tail when the verified Worker result arrives.
- [x] Add regression coverage and update pathfinding documentation/changelog.
- [x] Commit the verified implementation and prepare `main` for push.

## Review

Implementation is complete. At the default 40 px node spacing, 100 px of
accumulated repaired movement requests a fresh node route; 16 tiny repairs are
the secondary cap. The valid repaired path remains displayed until a verified
Worker route replaces it. The suite passes 30/30 tests, and the final live
bundle is served on port 30005 with matching hashes. The implementation and
verification notes are committed; the refreshed in-world source-transition
trace still depends on a browser reload.
