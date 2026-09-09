# Lessons

## 2026-09-09

- Verify the remote before promising a push; this checkout currently has no
  configured destination.
- A module declaring `persistentStorage: true` must include its storage target
  directory in the install, even when the runtime creates the actual files.
- Browser-console diagnostics are the wrong retrieval boundary for repeated
  Foundry testing. When diagnostics are enabled, persist a debounced rolling
  log under the local Foundry Data tree so later analysis is filesystem-first
  and does not require DevTools automation or manual object expansion.
- Treat repeated `worker_pending` blocks as a hot-path design failure, not as
  acceptable fail-closed behavior. Prove direct legal movement synchronously
  and avoid queueing a full search when no obstacle requires one.
- A spatially quantized path-cache key never proves that substituted exact
  endpoints are safe. Revalidate every point and connector after endpoint
  replacement; evict the cache entry when validation fails.
- For pointer-driven pathfinding, reuse a valid path as a corridor and walk
  backward to a safe reconnecting bend. Never append the latest cursor point
  to an older path without validating the resulting suffix.
- A live package object can reflect the server's pre-sync manifest until the
  Foundry service is restarted. For optional v14 package capabilities, try the
  documented API and fall back safely instead of trusting a client-side
  manifest flag to select the only code path.
- A safely repaired drag corridor still needs a rebase budget. Replacing the
  cached route with every repaired pointer position turns the route into an
  indefinitely growing freehand polyline; keep showing it for responsiveness,
  but periodically replace it with a freshly verified node route.
