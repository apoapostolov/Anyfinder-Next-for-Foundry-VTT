import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";

const workerSource = readFileSync(
  new URL("../dist/anyfinder-gridless-worker.js", import.meta.url),
  "utf8",
);

function wall(x1, y1, x2, y2) {
  return {
    a: { x: x1, y: y1 },
    b: { x: x2, y: y2 },
    minX: Math.min(x1, x2),
    minY: Math.min(y1, y2),
    maxX: Math.max(x1, x2),
    maxY: Math.max(y1, y2),
  };
}

function payload(overrides = {}) {
  return {
    start: { x: 60, y: 60 },
    waypoints: [{ x: 340, y: 60 }],
    interactiveFast: false,
    fingerprint: "scene-a|7|fixture",
    scene: {
      sceneId: "scene-a",
      wallRevision: 7,
      rect: { x: 0, y: 0, width: 400, height: 300 },
      walls: [],
    },
    token: { radiusPx: 10, cornerExtraPx: 0 },
    settings: {
      gridlessAllowSqueeze: false,
      gridlessSqueezeLeewayPx: 0,
      gridlessMinCenterClearancePx: 0,
      gridlessNodeStepPx: 20,
      gridlessExactFitTolerancePx: 0.25,
    },
    ...overrides,
  };
}

function runWorker(input, clock = performance) {
  let response;
  const context = vm.createContext({
    performance: clock,
    self: { postMessage: (message) => { response = message; } },
  });
  vm.runInContext(workerSource, context, {
    filename: "anyfinder-gridless-worker.js",
  });
  context.self.onmessage({
    data: { type: "solve", requestId: 11, tokenId: "token-a", payload: input },
  });
  return structuredClone(response);
}

test("returns a direct route in open space and echoes geometry identity", () => {
  const result = runWorker(payload());

  assert.equal(result.type, "solve_result");
  assert.equal(result.sceneId, "scene-a");
  assert.equal(result.wallRevision, 7);
  assert.equal(result.fingerprint, "scene-a|7|fixture");
  assert.equal(result.reason, null);
  assert.deepEqual(result.path.at(-1), { x: 340, y: 60 });
});

test("routes around a blocking wall instead of crossing it", () => {
  const input = payload();
  input.scene.walls = [wall(200, 0, 200, 220)];
  const result = runWorker(input);

  assert.equal(result.reason, null);
  assert.ok(Array.isArray(result.path));
  assert.ok(result.path.length > 1, "expected at least one detour node");
  assert.ok(
    result.path.some((point) => point.y > 220),
    "route should pass below the wall endpoint",
  );
  assert.deepEqual(result.path.at(-1), { x: 340, y: 60 });
});

test("reports no route for a wall spanning the scene", () => {
  const input = payload();
  input.scene.walls = [wall(200, 0, 200, 300)];
  const result = runWorker(input);

  assert.equal(result.path, null);
  assert.match(result.reason, /no_route|time_cap_hit|iter_cap_hit/);
});

test("enforces and reports the worker time budget", () => {
  let now = 0;
  const result = runWorker(payload(), { now: () => (now += 1000) });

  assert.equal(result.path, null);
  assert.equal(result.reason, "time_cap_hit");
});

test("squeeze routes through a passage that is 60% of token diameter", () => {
  const input = payload();
  input.start = { x: 60, y: 100 };
  input.waypoints = [{ x: 340, y: 100 }];
  input.scene.rect = { x: 0, y: 0, width: 400, height: 200 };
  input.scene.walls = [wall(0, 70, 400, 70), wall(0, 130, 400, 130)];
  input.token.radiusPx = 50;
  input.settings.gridlessAllowSqueeze = true;
  input.settings.gridlessNodeStepPx = 10;

  const result = runWorker(input);

  assert.equal(result.reason, null);
  assert.ok(Array.isArray(result.path));
  assert.ok(result.path.every((point) => point.y > 70 && point.y < 130));
});

test("squeeze never permits the center path to cross a wall", () => {
  const input = payload();
  input.start = { x: 60, y: 100 };
  input.waypoints = [{ x: 340, y: 100 }];
  input.scene.rect = { x: 0, y: 0, width: 400, height: 200 };
  input.scene.walls = [wall(200, 0, 200, 200)];
  input.token.radiusPx = 50;
  input.settings.gridlessAllowSqueeze = true;
  input.settings.gridlessNodeStepPx = 10;

  const result = runWorker(input);

  assert.equal(result.path, null);
  assert.match(result.reason, /no_route|time_cap_hit|iter_cap_hit/);
});

test("finds a long route through alternating narrow castle passages", () => {
  const input = payload();
  input.start = { x: 200, y: 1200 };
  input.waypoints = [{ x: 11800, y: 1200 }];
  input.scene.rect = { x: 0, y: 0, width: 12000, height: 2400 };
  input.scene.walls = [wall(0, 100, 12000, 100), wall(0, 2300, 12000, 2300)];
  for (let x = 2000, topGap = true; x <= 10000; x += 2000, topGap = !topGap) {
    input.scene.walls.push(topGap ? wall(x, 200, x, 2300) : wall(x, 100, x, 2200));
  }
  input.token.radiusPx = 50;
  input.settings.gridlessAllowSqueeze = true;
  input.settings.gridlessNodeStepPx = 32;

  const result = runWorker(input);

  assert.equal(result.reason, null);
  assert.ok(Array.isArray(result.path));
  assert.ok(result.path.length > 5, "expected a route through each alternating passage");
  assert.deepEqual(result.path.at(-1), { x: 11800, y: 1200 });
});
