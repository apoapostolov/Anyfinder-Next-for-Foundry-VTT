# Lessons

## 2026-09-09

- Verify the remote before promising a push; this checkout currently has no
  configured destination.
- Browser-console diagnostics are the wrong retrieval boundary for repeated
  Foundry testing. When diagnostics are enabled, persist a debounced rolling
  log under the local Foundry Data tree so later analysis is filesystem-first
  and does not require DevTools automation or manual object expansion.
- Treat repeated `worker_pending` blocks as a hot-path design failure, not as
  acceptable fail-closed behavior. Prove direct legal movement synchronously
  and avoid queueing a full search when no obstacle requires one.
