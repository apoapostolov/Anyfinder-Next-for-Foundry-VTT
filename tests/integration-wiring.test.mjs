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
const manifest = JSON.parse(
  readFileSync(new URL("../module.json", import.meta.url), "utf8"),
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
  assert.match(bundle, /Rejected worker path after safe endpoint repair/);
  assert.match(bundle, /anxGridlessWorkerState\.geometryKey = null/);
});

test("main-thread walk graph prevents diagonal corner cutting", () => {
  assert.match(bundle, /orthogonalA/);
  assert.match(bundle, /!C\[orthogonalA\] \|\| !C\[orthogonalB\]/);
});

test("first worker request gets a bounded synchronous bootstrap path", () => {
  assert.match(bundle, /bootstrapByToken/);
  assert.match(bundle, /__anxInteractiveFast: r2 \|\| bootstrapGridlessPath/);
});

test("worker searches never block drag frames and Foundry's direct dashed segment is hidden", () => {
  const findPathStart = bundle.indexOf("async function anxFindPathWithFallback");
  const gridlessStart = bundle.indexOf("if (anxIsStrictGridlessScene())", findPathStart);
  const gridlessEnd = bundle.indexOf("if (!canvas.anyfinder)", gridlessStart);
  const gridlessBranch = bundle.slice(gridlessStart, gridlessEnd);
  assert.doesNotMatch(gridlessBranch, /await anxWaitForGridlessWorkerPath/);
  assert.match(bundle, /ANX_GRIDLESS_WORKER_REFINE_DELAY_MS = 180/);
  assert.match(bundle, /anxScheduleGridlessWorkerRefinement\(I, A\)/);
  assert.match(bundle, /__anxInteractiveFast: !longRoute/);
  assert.match(bundle, /latestPayloadByToken\.set\(I, \{ \.\.\.A, interactiveFast: !1 \}\)/);
  assert.match(bundle, /CONFIG\.Token\.rulerClass\.prototype\._getSegmentStyle/);
  assert.match(bundle, /A\?\.unreachable/);
});

test("squeeze defaults on and uses configurable token-relative wall overlap", () => {
  assert.match(bundle, /const ANX_GRIDLESS_DEFAULT_WALL_OVERLAP_PERCENT = 20/);
  assert.match(bundle, /gridlessAllowSqueeze: !0/);
  assert.match(bundle, /gridlessWallOverlapPercent: 10/);
  assert.match(bundle, /overlapPercent \/ 50/);
});

test("gridless pathfinding is enabled by default and requires GM acknowledgement", () => {
  assert.match(bundle, /enableGridlessPathfinding: !0/);
  assert.match(bundle, /anxOnGridlessPathfindingSettingChanged/);
  assert.match(bundle, /settings\.enableGridlessPathfinding\.confirmation/);
});

test("returned gridless paths validate the implicit start connector", () => {
  assert.match(bundle, /function anxIsSafeGridlessStartEgress/);
  assert.match(bundle, /function anxValidateGridlessCenterPath/);
  assert.match(bundle, /anxValidatePathCollisionFromStart\(I, A/);
  assert.match(bundle, /startConnectorBlocked/);
});

test("gridless routing converts Foundry token positions to movement origins and back", () => {
  const start = bundle.indexOf("function anxWaypointToMovementOrigin");
  const end = bundle.indexOf("function anxIsStrictGridlessScene", start);
  assert.ok(start >= 0 && end > start, "expected coordinate conversion helpers");
  const context = vm.createContext({
    anxGetTokenCenter: () => ({ x: 150, y: 240 }),
    anxDebugLog: () => {},
    anxClonePointPath: (path) => path.map((point) => ({ x: point.x, y: point.y })),
    anxDistanceSquared: (a, b) => ((a.x - b.x) ** 2) + ((a.y - b.y) ** 2),
    anxPathPointMatchesAny: (point, candidates, tolerance) => candidates.some(
      (candidate) => Math.hypot(point.x - candidate.x, point.y - candidate.y) <= tolerance,
    ),
  });
  vm.runInContext(`${bundle.slice(start, end)}\nthis.api = { anxWaypointToMovementOrigin, anxGridlessPathToWaypoints, anxEnsureGridlessCenterPathStartsAt, anxFoundryPathMatchesRequestedEndpoints, anxPrepareGridlessPathForFoundry };`, context);
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
    [{ x: 250, y: 340 }],
    [{ x: 100, y: 200 }, { x: 200, y: 300, explicit: true }],
    "test",
  );
  assert.deepEqual(path.map(({ x, y }) => ({ x, y })), [
    { x: 100, y: 200 },
    { x: 200, y: 300 },
  ]);
  assert.equal(path.at(-1).explicit, true);
  assert.equal(context.api.anxFoundryPathMatchesRequestedEndpoints(path, [
    { x: 100, y: 200 },
    { x: 200, y: 300 },
  ]), true);
  assert.equal(context.api.anxFoundryPathMatchesRequestedEndpoints(path, [
    { x: 100, y: 200 },
    { x: 220, y: 300 },
  ]), false);

  token.constrainMovementPath = (candidate) => [candidate.slice(0, 1), true];
  assert.equal(context.api.anxPrepareGridlessPathForFoundry(
    token,
    [{ x: 250, y: 340 }],
    [{ x: 100, y: 200 }, { x: 200, y: 300 }],
    "test-rejection",
  ), null);
});

test("gridless routes obey Foundry's required first-waypoint contract", () => {
  assert.match(bundle, /iStart = centerWaypoints\.length > 0 \? centerWaypoints\[0\]/);
  assert.match(bundle, /centerDestinations = centerWaypoints\.slice\(1\)/);
  assert.match(bundle, /return B\.unshift\(g\), B/);
  assert.match(bundle, /C\[0\] = \{ \.\.\.C2\[0\] \}/);
  assert.match(bundle, /centerPath: anxClonePointPath\(J2\)/);
  assert.match(bundle, /anxTryRetargetGridlessCenterPath\(v2\.centerPath/);
  assert.match(bundle, /__anxStart: iStart/);
});

test("gridless open-space movement bypasses search and cached corridors are repaired safely", () => {
  assert.match(bundle, /direct_fast_path/);
  assert.match(bundle, /function anxPrepareVerifiedGridlessCenterPath/);
  assert.match(bundle, /function anxTryRetargetGridlessCenterPath/);
  assert.match(bundle, /anxValidateGridlessCenterPath\(D, A, B\)/);
  assert.match(bundle, /segment_path_rejected/);
});

test("corridor repair walks back to a safe bend instead of appending an illegal suffix", () => {
  const retargetStart = bundle.indexOf("function anxValidateGridlessCenterPath");
  const retargetEnd = bundle.indexOf("function anxClonePointPath", retargetStart);
  const ensureStart = bundle.indexOf("function anxEnsureGridlessCenterPathStartsAt");
  const ensureEnd = bundle.indexOf("function anxFoundryPathMatchesRequestedEndpoints", ensureStart);
  assert.ok(retargetStart >= 0 && retargetEnd > retargetStart, "expected gridless corridor repair helpers");
  assert.ok(ensureStart >= 0 && ensureEnd > ensureStart, "expected gridless start helper");
  const wallX = 50;
  const context = vm.createContext({
    canvas: { dimensions: { sceneRect: { x: 0, y: 0, width: 200, height: 200 } } },
    anxClonePointPath: (path) => path.map((point) => ({ x: point.x, y: point.y })),
    anxDistanceSquared: (a, b) => ((a.x - b.x) ** 2) + ((a.y - b.y) ** 2),
    anxGetBlockingWallSegments: () => [],
    anxValidatePathCollisionFromStart: (path) => {
      let blockedSegmentIndex = -1;
      for (let index = 0; index < path.length - 1; index++) {
        const a = path[index];
        const b = path[index + 1];
        if ((a.x < wallX && b.x > wallX) || (a.x > wallX && b.x < wallX)) {
          const y = a.y + ((wallX - a.x) / (b.x - a.x)) * (b.y - a.y);
          if (y >= 0 && y <= 100) {
            blockedSegmentIndex = index;
            break;
          }
        }
      }
      return { blockedPointIndex: -1, blockedSegmentIndex, startConnectorBlocked: false };
    },
  });
  vm.runInContext(`${bundle.slice(ensureStart, ensureEnd)}\n${bundle.slice(retargetStart, retargetEnd)}\nthis.retarget = anxTryRetargetGridlessCenterPath;`, context);
  const cached = [
    { x: 10, y: 50 },
    { x: 40, y: 110 },
    { x: 100, y: 110 },
    { x: 100, y: 50 },
  ];
  const repaired = context.retarget(
    cached,
    { x: 10, y: 50 },
    { x: 40, y: 50 },
    { clearance: 0, cornerGuard: 0 },
  );

  assert.deepEqual(repaired.map(({ x, y }) => ({ x, y })), [
    { x: 10, y: 50 },
    { x: 40, y: 110 },
    { x: 40, y: 50 },
  ]);
});

test("corridor repair rebases after bounded freehand drift", () => {
  const start = bundle.indexOf("function anxAdvanceGridlessCorridorState");
  const end = bundle.indexOf("function anxPrepareVerifiedGridlessCenterPath", start);
  assert.ok(start >= 0 && end > start, "expected corridor rebase helper");
  const context = vm.createContext({
    ANX_GRIDLESS_CORRIDOR_REBASE_MIN_DISTANCE_PX: 80,
    ANX_GRIDLESS_CORRIDOR_REBASE_MAX_REPAIRS: 16,
  });
  vm.runInContext(`${bundle.slice(start, end)}\nthis.advance = anxAdvanceGridlessCorridorState;`, context);
  let state = { target: { x: 0, y: 0 }, repairDistancePx: 0, repairCount: 0, rebasePending: false };
  for (const x of [30, 60, 90]) {
    state = { ...context.advance(state, { x, y: 0 }, 40), target: { x, y: 0 } };
  }
  assert.equal(state.repairDistancePx, 90);
  assert.equal(state.rebasePending, false);
  state = { ...context.advance(state, { x: 120, y: 0 }, 40), target: { x: 120, y: 0 } };
  assert.equal(state.repairDistancePx, 120);
  assert.equal(state.rebasePending, true);
  assert.match(bundle, /worker_corridor_rebase/);
  assert.match(bundle, /source: K2,/);
  assert.match(bundle, /K2 !== "drag_corridor_repair" && anxCancelGridlessWorkerRefinement\(n2\)/);
  assert.match(bundle, /return commitGridlessSuccess\(K2, q2, "drag_corridor_repair", null, corridorState\)/);
});

test("debug diagnostics use a debounced persistent local file", () => {
  assert.match(bundle, /ANX_DEBUG_LOG_FILENAME = "anyfinder-next-debug-latest\.json"/);
  assert.match(bundle, /ANX_DEBUG_LOG_DEBOUNCE_MS = 1200/);
  assert.match(bundle, /fp\.uploadPersistent\(ANX_MODULE_ID/);
  assert.match(bundle, /fp\.upload\("data", `modules\/\$\{ANX_MODULE_ID\}\/debug`/);
  assert.match(bundle, /makeFile\(fallbackPath\)/);
  assert.match(bundle, /failureDigest: anxCloneTrace/);
  assert.match(bundle, /gridlessTraces: anxCloneTrace/);
  assert.equal(manifest.persistentStorage, true);
});

test("gridless failures fail closed at the exact requested origin", () => {
  const start = bundle.indexOf("function anxBlockedGridlessPath");
  const end = bundle.indexOf("function anxDistanceSquared", start);
  assert.ok(start >= 0 && end > start, "expected fail-closed gridless helper");
  const context = vm.createContext({});
  vm.runInContext(`${bundle.slice(start, end)}\nthis.block = anxBlockedGridlessPath;`, context);
  const origin = { x: 120, y: 340, elevation: 10, explicit: true };
  const blocked = context.block([origin, { x: 800, y: 900 }]);
  assert.deepEqual({ ...blocked[0] }, origin);
  assert.equal(blocked.length, 1);
  assert.notEqual(blocked[0], origin);

  const findPathStart = bundle.indexOf("async function anxFindPathWithFallback");
  const gridlessStart = bundle.indexOf("if (anxIsStrictGridlessScene())", findPathStart);
  const gridlessEnd = bundle.indexOf("if (!canvas.anyfinder)", gridlessStart);
  const gridlessBranch = bundle.slice(gridlessStart, gridlessEnd);
  assert.match(gridlessBranch, /worker_pending_fail_closed/);
  assert.match(gridlessBranch, /anxFinalizeBlockedGridlessPath/);
  assert.doesNotMatch(gridlessBranch, /anxNativeFallback/);
  assert.match(bundle, /i = C \? \(anxRecordGridlessRejection[\s\S]*?anxFinalizeBlockedGridlessPath/);
  assert.match(bundle, /: anxNativeFallback\(I, A, g\)\.result/);
  assert.match(bundle, /anxFoundryPathMatchesRequestedEndpoints/);
});

test("blocked gridless movement captures actionable rejection diagnostics", () => {
  const start = bundle.indexOf("function anxExplainGridlessFailureReason");
  const end = bundle.indexOf("function anxBuildGridlessRejectionDiagnosis", start);
  assert.ok(start >= 0 && end > start, "expected rejection reason helper");
  const context = vm.createContext({});
  vm.runInContext(`${bundle.slice(start, end)}\nthis.explain = anxExplainGridlessFailureReason;`, context);
  assert.match(context.explain("worker_pending"), /had not finished/);
  assert.match(context.explain("no_attach_goal"), /destination could not connect/);
  assert.match(context.explain("foundry_collision_rejected"), /Foundry shortened or changed/);
  assert.match(context.explain("worker_error"), /Worker failed/);

  assert.match(bundle, /function anxBuildGridlessRejectionDiagnosis/);
  assert.match(bundle, /classification: J/);
  assert.match(bundle, /token_origin_inside_wall_clearance/);
  assert.match(bundle, /blockedPoint: x\.blockedPointIndex/);
  assert.match(bundle, /blockedSegment: x\.blockedSegmentIndex/);
  assert.match(bundle, /physicalWallCrossings: P/);
  assert.match(bundle, /relevantWalls: _\.slice\(0, 12\)/);
  assert.match(bundle, /lastCandidateRejection/);
  assert.match(bundle, /inFlightTarget: j\?\.target/);
  assert.match(bundle, /queuedTarget:/);
  assert.match(bundle, /globalThis\.anxDebugGetLastBlockedMovement/);
  assert.match(bundle, /stage: "worker_current_geometry_validation"/);
  assert.match(bundle, /stage: "foundry_constraint_validation"/);
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
  assert.match(bundle, /id: "general"[\s\S]*settings: \["forcePathfindingAllPlayers", "fogExploration"\]/);
  assert.match(bundle, /id: "gridless"[\s\S]*settings: \["enableGridlessPathfinding", "gridlessNodeStepPx", "gridlessAllowSqueeze", "gridlessWallOverlapPercent"\]/);
  assert.match(bundle, /id: "advanced"[\s\S]*settings: \["debugMode", "debugLogMode"\]/);
  assert.match(bundle, /data-anx-settings-section=/);
  assert.equal(english["anyfinder-next"].settings.sections.gridless, "Gridless Maps");
  assert.equal(english["anyfinder-next"].settings.gridlessNodeStepPx.name, "Gridless Route Detail");
  assert.match(bundle, /gridlessExactFitTolerancePx[\s\S]*?config: !1/);
  assert.match(bundle, /gridlessMinCenterClearancePx[\s\S]*?config: !1/);
  assert.match(bundle, /gridlessDebugMaxTraces[\s\S]*?config: !1/);
});
