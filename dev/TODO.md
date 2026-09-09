# Create and publish Anyfinder Next remote

- [x] Audit neighboring project README and CHANGELOG templates.
- [x] Confirm GitHub authentication and repository availability.
- [x] Update README, CHANGELOG, and module metadata for the new repository.
- [x] Run validation and live HTTP checks.
- [x] Create the GitHub repository and configure `origin`.
- [ ] Commit the repository-template changes.
- [ ] Push `main` and verify the remote branch.

## Review

The repository will use the same user-facing template as neighboring
git-foundry modules: badges, What's New, feature summary, quick start,
settings, installation, compatibility, development, and credits.

## Commit review

- Existing implementation commit: `515c488` (`feat-polish-gridless-routing`).

## Remote review

- Repository: `https://github.com/apoapostolov/Anyfinder-Next-for-Foundry-VTT`
- Visibility: public

# Remove gridless drag latency and make diagnostics filesystem-first

- [ ] Capture the current failure evidence and identify the dominant causes.
- [ ] Add an automatic, debounced rolling diagnostics file in the live module.
- [ ] Add a synchronous authoritative fast path for direct legal gridless moves.
- [ ] Cache immutable scene wall geometry and reuse it across drag frames.
- [ ] Reduce obsolete Worker work and prevent stale calculations from blocking
  the latest pointer target.
- [ ] Add regression/performance tests for open space, short moves, wall changes,
  and repeated nearby targets.
- [ ] Run syntax/tests, deploy through the approved live-sync workflow, and
  verify the served module plus browser behavior on port 30005.

## Review

Pending implementation and live verification.
