import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";

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

test("long worker routes remain pending and Foundry's direct dashed segment is hidden", () => {
  assert.match(bundle, /function anxWaitForGridlessWorkerPath/);
  assert.match(bundle, /longRoute \? 8e3 : 1200/);
  assert.match(bundle, /CONFIG\.Token\.rulerClass\.prototype\._getSegmentStyle/);
  assert.match(bundle, /A\?\.unreachable/);
});

test("squeeze defaults on and uses a token-relative 60 percent clearance", () => {
  assert.match(bundle, /const ANX_GRIDLESS_SQUEEZE_RADIUS_RATIO = 0\.6/);
  assert.match(bundle, /gridlessAllowSqueeze: !0/);
  assert.match(bundle, /B \* ANX_GRIDLESS_SQUEEZE_RADIUS_RATIO/);
});

test("returned gridless paths validate the implicit start connector", () => {
  assert.match(bundle, /function anxIsSafeGridlessStartEgress/);
  assert.match(bundle, /anxValidatePathCollisionFromStart\(O, A/);
  assert.match(bundle, /startConnectorBlocked/);
});

test("gridless routing converts Foundry token positions to movement origins and back", () => {
  const start = bundle.indexOf("function anxWaypointToMovementOrigin");
  const end = bundle.indexOf("function anxIsStrictGridlessScene", start);
  assert.ok(start >= 0 && end > start, "expected coordinate conversion helpers");
  const context = vm.createContext({
    anxGetTokenCenter: () => ({ x: 150, y: 240 }),
    anxDebugLog: () => {},
    anxPathPointMatchesAny: (point, candidates, tolerance) => candidates.some(
      (candidate) => Math.hypot(point.x - candidate.x, point.y - candidate.y) <= tolerance,
    ),
  });
  vm.runInContext(`${bundle.slice(start, end)}\nthis.api = { anxWaypointToMovementOrigin, anxGridlessPathToWaypoints, anxPrepareGridlessPathForFoundry };`, context);
  const token = {
    x: 100,
    y: 200,
    document: {
      x: 100,
      y: 200,
      getMovementOrigin: (point) => ({ x: point.x + 50, y: point.y + 40 }),
    },
    constrainMovementPath: (path) => [path, false],
  };
  const origin = context.api.anxWaypointToMovementOrigin(token, { x: 100, y: 200 });
  assert.deepEqual({ x: origin.x, y: origin.y }, { x: 150, y: 240 });
  const path = context.api.anxPrepareGridlessPathForFoundry(
    token,
    [{ x: 150, y: 240 }, { x: 250, y: 340 }],
    [{ x: 100, y: 200 }, { x: 200, y: 300, explicit: true }],
    "test",
  );
  assert.deepEqual(path.map(({ x, y }) => ({ x, y })), [
    { x: 100, y: 200 },
    { x: 200, y: 300 },
  ]);
  assert.equal(path.at(-1).explicit, true);

  token.constrainMovementPath = (candidate) => [candidate.slice(0, 1), true];
  assert.equal(context.api.anxPrepareGridlessPathForFoundry(
    token,
    [{ x: 150, y: 240 }, { x: 250, y: 340 }],
    [{ x: 100, y: 200 }, { x: 200, y: 300 }],
    "test-rejection",
  ), null);
});

test("gridless results are rejected when Foundry constrains the route", () => {
  assert.match(bundle, /function anxPrepareGridlessPathForFoundry/);
  assert.match(bundle, /I\.constrainMovementPath\(C, \{ preview: !1, ignoreWalls: !1 \}\)/);
  assert.match(bundle, /foundry_collision_rejected/);
  assert.match(bundle, /centerWaypoints = .*anxWaypointToMovementOrigin/);
});

test("settings are localized, grouped with semantic headings, and hide internal knobs", () => {
  assert.match(bundle, /renderSettingsConfig/);
  assert.match(bundle, /createElement\("h3"\)/);
  assert.match(bundle, /anx-settings-section/);
  assert.equal(english["anyfinder-next"].settings.sections.gridless, "Gridless Maps");
  assert.equal(english["anyfinder-next"].settings.gridlessNodeStepPx.name, "Gridless Route Detail");
  assert.match(bundle, /gridlessExactFitTolerancePx[\s\S]*?config: !1/);
  assert.match(bundle, /gridlessMinCenterClearancePx[\s\S]*?config: !1/);
  assert.match(bundle, /gridlessDebugMaxTraces[\s\S]*?config: !1/);
});
