import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";

const bundle = readFileSync(
  new URL("../dist/anyfinder-next.js", import.meta.url),
  "utf8",
);
const english = JSON.parse(
  readFileSync(new URL("../languages/en.json", import.meta.url), "utf8"),
);

test("normal Anyfinder source is preserved under ingest", () => {
  assert.ok(
    existsSync(new URL("../ingest/anyfinder/module.json", import.meta.url)),
  );
  assert.ok(
    existsSync(new URL("../ingest/anyfinder/dist/anyfinder.js", import.meta.url)),
  );
});

test("wrapper honors enable policy and passes the v14 cancellation token", () => {
  assert.match(bundle, /anxShouldUsePathfinding\(n, this\)/);
  assert.match(
    bundle,
    /canvas\.anyfinder\.findMovementPath\(\s*cancellationToken,\s*I\.document,\s*A,\s*C,\s*measuredPath/s,
  );
});

test("gridless lifecycle invalidates geometry and rejects stale worker identity", () => {
  assert.match(bundle, /Hooks\.on\("createWall"[\s\S]*?anxInvalidateGridlessCache\(\)/);
  assert.match(bundle, /Hooks\.on\("canvasTearDown"[\s\S]*?anxTerminateGridlessWorker\(\)/);
  assert.match(bundle, /E\.fingerprint !== C2\.fingerprint/);
  assert.match(bundle, /Rejected worker path after current-geometry validation/);
});

test("main-thread walk graph prevents diagonal corner cutting", () => {
  assert.match(bundle, /orthogonalA/);
  assert.match(bundle, /!C\[orthogonalA\] \|\| !C\[orthogonalB\]/);
});

test("first worker request gets a bounded synchronous bootstrap path", () => {
  assert.match(bundle, /bootstrapByToken/);
  assert.match(bundle, /__anxInteractiveFast: r2 \|\| bootstrapGridlessPath/);
});

test("returned gridless paths validate the implicit start connector", () => {
  assert.match(bundle, /function anxIsSafeGridlessStartEgress/);
  assert.match(bundle, /anxValidatePathCollisionFromStart\(O, A/);
  assert.match(bundle, /startConnectorBlocked/);
});

test("settings are localized, grouped with semantic headings, and hide internal knobs", () => {
  assert.match(bundle, /renderSettingsConfig/);
  assert.match(bundle, /createElement\("h3"\)/);
  assert.match(bundle, /anx-settings-section/);
  assert.equal(english["anyfinder-next"].settings.sections.gridless, "Gridless Maps");
  assert.equal(english["anyfinder-next"].settings.gridlessNodeStepPx.name, "Gridless Route Detail");
  assert.match(bundle, /gridlessExactFitTolerancePx[\s\S]*?config: !1/);
  assert.match(bundle, /gridlessDebugMaxTraces[\s\S]*?config: !1/);
});
