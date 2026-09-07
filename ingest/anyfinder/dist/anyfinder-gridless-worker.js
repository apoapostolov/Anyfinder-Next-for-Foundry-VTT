const NODE_BUDGET = 20000;
const MAX_STEP = 320;
const sceneStepCache = new Map();

class MinHeap {
  constructor() {
    this.data = [];
    this.scores = null;
  }
  init(scores) {
    this.scores = scores;
    this.data.length = 0;
  }
  push(val) {
    this.data.push(val);
    this.bubbleUp(this.data.length - 1);
  }
  pop() {
    const len = this.data.length;
    if (len === 0) return -1;
    const top = this.data[0];
    const bottom = this.data.pop();
    if (len > 1) {
      this.data[0] = bottom;
      this.sinkDown(0);
    }
    return top;
  }
  bubbleUp(idx) {
    const val = this.data[idx];
    const score = this.scores[val];
    while (idx > 0) {
      const parentIdx = (idx - 1) >>> 1;
      const parentVal = this.data[parentIdx];
      if (score >= this.scores[parentVal]) break;
      this.data[idx] = parentVal;
      idx = parentIdx;
    }
    this.data[idx] = val;
  }
  sinkDown(idx) {
    const len = this.data.length;
    const val = this.data[idx];
    const score = this.scores[val];
    const half = len >>> 1;
    while (idx < half) {
      let leftIdx = (idx << 1) + 1;
      let rightIdx = leftIdx + 1;
      let bestIdx = leftIdx;
      let bestScore = this.scores[this.data[leftIdx]];
      if (rightIdx < len) {
        let rightScore = this.scores[this.data[rightIdx]];
        if (rightScore < bestScore) {
          bestIdx = rightIdx;
          bestScore = rightScore;
        }
      }
      if (score <= bestScore) break;
      this.data[idx] = this.data[bestIdx];
      idx = bestIdx;
    }
    this.data[idx] = val;
  }
  get size() {
    return this.data.length;
  }
}

function pointInside(p, r) {
  return (
    p.x >= r.x && p.x <= r.x + r.width && p.y >= r.y && p.y <= r.y + r.height
  );
}
function pointToSegD2(p, a, b) {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  if (dx === 0 && dy === 0) {
    const pdx = p.x - a.x;
    const pdy = p.y - a.y;
    return pdx * pdx + pdy * pdy;
  }
  const t = Math.max(
    0,
    Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / (dx * dx + dy * dy)),
  );
  const px = a.x + t * dx;
  const py = a.y + t * dy;
  const pdx = p.x - px;
  const pdy = p.y - py;
  return pdx * pdx + pdy * pdy;
}
function cross(a, b, c) {
  return (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x);
}
function segIntersect(a, b, c, d) {
  const o1 = cross(a, b, c);
  const o2 = cross(a, b, d);
  const o3 = cross(c, d, a);
  const o4 = cross(c, d, b);
  if (
    ((o1 > 0 && o2 < 0) || (o1 < 0 && o2 > 0)) &&
    ((o3 > 0 && o4 < 0) || (o3 < 0 && o4 > 0))
  ) {
    return true;
  }
  const eps = 1e-9;
  const between = (x, y, z) =>
    Math.min(x, y) - eps <= z && z <= Math.max(x, y) + eps;
  if (Math.abs(o1) < eps && between(a.x, b.x, c.x) && between(a.y, b.y, c.y))
    return true;
  if (Math.abs(o2) < eps && between(a.x, b.x, d.x) && between(a.y, b.y, d.y))
    return true;
  if (Math.abs(o3) < eps && between(c.x, d.x, a.x) && between(c.y, d.y, a.y))
    return true;
  if (Math.abs(o4) < eps && between(c.x, d.x, b.x) && between(c.y, d.y, b.y))
    return true;
  return false;
}
function segSegD2(a, b, c, d) {
  if (segIntersect(a, b, c, d)) return 0;
  return Math.min(
    pointToSegD2(a, c, d),
    pointToSegD2(b, c, d),
    pointToSegD2(c, a, b),
    pointToSegD2(d, a, b),
  );
}
function pointBlocked(p, walls, clearance, rect, guard, tol) {
  if (!pointInside(p, rect)) return true;
  const c = Math.max(0, clearance - tol);
  if (c <= 0) return false;
  const cd2 = c * c;
  const eg = Math.max(0, c + guard);
  const egd2 = eg * eg;
  const minX = p.x - eg;
  const maxX = p.x + eg;
  const minY = p.y - eg;
  const maxY = p.y + eg;
  for (const w of walls) {
    if (w.minX > maxX || w.maxX < minX || w.minY > maxY || w.maxY < minY)
      continue;
    if (pointToSegD2(p, w.a, w.b) <= cd2) return true;
    if (guard > 0) {
      const dxa = p.x - w.a.x;
      const dya = p.y - w.a.y;
      if (dxa * dxa + dya * dya <= egd2) return true;
      const dxb = p.x - w.b.x;
      const dyb = p.y - w.b.y;
      if (dxb * dxb + dyb * dyb <= egd2) return true;
    }
  }
  return false;
}
function edgeBlocked(a, b, edgeCache, clearance, walls, rect, guard, tol) {
  if (!pointInside(a, rect) || !pointInside(b, rect)) return true;
  const c = Math.max(0, clearance - tol);
  if (c <= 0) return false;
  const ax = Math.round(a.x * 100);
  const ay = Math.round(a.y * 100);
  const bx = Math.round(b.x * 100);
  const by = Math.round(b.y * 100);
  let k1 = ax + "," + ay;
  let k2 = bx + "," + by;
  if (k1 > k2) {
    const tmp = k1;
    k1 = k2;
    k2 = tmp;
  }
  const key =
    k1 + "|" + k2 + "|" + Math.round(c * 100) + "|" + Math.round(guard * 100);
  if (edgeCache.has(key)) return edgeCache.get(key);
  const c2 = c * c;
  const eg = Math.max(0, c + guard);
  const eg2 = eg * eg;
  const minX = Math.min(a.x, b.x) - eg;
  const maxX = Math.max(a.x, b.x) + eg;
  const minY = Math.min(a.y, b.y) - eg;
  const maxY = Math.max(a.y, b.y) + eg;
  for (const w of walls) {
    if (w.minX > maxX || w.maxX < minX || w.minY > maxY || w.maxY < minY)
      continue;
    const s2 = segSegD2(a, b, w.a, w.b);
    if (
      s2 <= c2 ||
      (guard > 0 &&
        (pointToSegD2(w.a, a, b) <= eg2 || pointToSegD2(w.b, a, b) <= eg2))
    ) {
      edgeCache.set(key, true);
      return true;
    }
  }
  edgeCache.set(key, false);
  return false;
}
function getSceneStepData(payload, stepRequested) {
  const scene = payload.scene;
  const keyBase = `${scene.sceneId}|${scene.wallRevision}|${scene.rect.x}:${scene.rect.y}:${scene.rect.width}:${scene.rect.height}`;
  let step = stepRequested;
  let cols;
  let rows;
  while (true) {
    cols = Math.floor(scene.rect.width / step) + 1;
    rows = Math.floor(scene.rect.height / step) + 1;
    if (cols * rows <= NODE_BUDGET || step >= MAX_STEP) break;
    step = Math.min(MAX_STEP, step + 16);
  }
  const key = `${keyBase}|${step}`;
  if (sceneStepCache.has(key)) return sceneStepCache.get(key);
  const nodes = new Array(cols * rows);
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const idx = y * cols + x;
      nodes[idx] = {
        x: scene.rect.x + x * step,
        y: scene.rect.y + y * step,
      };
    }
  }
  const data = {
    sceneRect: scene.rect,
    walls: scene.walls.map((w) => {
      const minX = Math.min(w.a.x, w.b.x);
      const maxX = Math.max(w.a.x, w.b.x);
      const minY = Math.min(w.a.y, w.b.y);
      const maxY = Math.max(w.a.y, w.b.y);
      return {
        a: w.a,
        b: w.b,
        minX,
        maxX,
        minY,
        maxY,
      };
    }),
    cols,
    rows,
    step,
    nodes,
    walkMaskByKey: new Map(),
    walkGraphByKey: new Map(),
    segmentPathCache: new Map(),
  };
  sceneStepCache.set(key, data);
  return data;
}
function getWalkMask(data, clearance, guard, tol) {
  const key = `${clearance.toFixed(2)}|${guard.toFixed(2)}|${tol.toFixed(2)}`;
  if (data.walkMaskByKey.has(key)) return data.walkMaskByKey.get(key);
  const mask = new Uint8Array(data.nodes.length);
  const nodes = data.nodes;
  const walls = data.walls;
  const sceneRect = data.sceneRect;
  for (let i = 0; i < nodes.length; i++) {
    mask[i] = pointBlocked(nodes[i], walls, clearance, sceneRect, guard, tol)
      ? 0
      : 1;
  }
  data.walkMaskByKey.set(key, mask);
  return mask;
}
function getWalkGraph(data, clearance, guard, tol) {
  const key = `${clearance.toFixed(2)}|${guard.toFixed(2)}|${tol.toFixed(2)}`;
  if (data.walkGraphByKey.has(key)) return data.walkGraphByKey.get(key);
  const mask = getWalkMask(data, clearance, 0, tol);
  const nodes = data.nodes;
  const cols = data.cols;
  const rows = data.rows;
  const walls = data.walls;
  const sceneRect = data.sceneRect;
  const edgeBits = new Uint8Array(nodes.length);
  const dirs = [
    [-1, -1],
    [0, -1],
    [1, -1],
    [-1, 0],
    [1, 0],
    [-1, 1],
    [0, 1],
    [1, 1],
  ];
  const forwardDirs = [4, 5, 6, 7]; // right, down-left, down, down-right
  const oppositeDirs = { 4: 3, 5: 2, 6: 1, 7: 0 };
  const ec = new Map();
  for (let idx = 0; idx < nodes.length; idx++) {
    if (!mask[idx]) continue;
    const x = idx % cols;
    const y = Math.floor(idx / cols);
    for (const d of forwardDirs) {
      const dx = dirs[d][0];
      const dy = dirs[d][1];
      const nx = x + dx;
      const ny = y + dy;
      if (nx < 0 || ny < 0 || nx >= cols || ny >= rows) continue;
      const nidx = ny * cols + nx;
      if (!mask[nidx]) continue;
      // Prevent diagonal corner-cutting through tight/curved wall pinch points.
      if (dx !== 0 && dy !== 0) {
        const ix1 = x + dx;
        const iy1 = y;
        const ix2 = x;
        const iy2 = y + dy;
        const i1 = iy1 * cols + ix1;
        const i2 = iy2 * cols + ix2;
        if (!mask[i1] || !mask[i2]) continue;
      }
      if (
        !edgeBlocked(
          nodes[idx],
          nodes[nidx],
          ec,
          clearance,
          walls,
          sceneRect,
          guard,
          tol,
        )
      ) {
        edgeBits[idx] |= 1 << d;
        edgeBits[nidx] |= 1 << oppositeDirs[d];
      }
    }
  }
  const g = { mask, edgeBits };
  data.walkGraphByKey.set(key, g);
  return g;
}
function nearestNodeIdx(mask, point, nodes) {
  let best = -1;
  let bestD = Infinity;
  const px = point.x;
  const py = point.y;
  for (let i = 0; i < nodes.length; i++) {
    if (!mask[i]) continue;
    const n = nodes[i];
    const dx = px - n.x;
    const dy = py - n.y;
    const v = dx * dx + dy * dy;
    if (v < bestD) {
      bestD = v;
      best = i;
    }
  }
  return best;
}
function nearestCandidates(
  mask,
  point,
  nodes,
  blockFn,
  cols,
  rows,
  step,
  rect,
) {
  const r = Math.max(2, Math.ceil(step / 14));
  const cx = Math.round((point.x - rect.x) / step);
  const cy = Math.round((point.y - rect.y) / step);
  const out = [];
  for (let dy = -r; dy <= r; dy++) {
    for (let dx = -r; dx <= r; dx++) {
      const x = cx + dx;
      const y = cy + dy;
      if (x < 0 || y < 0 || x >= cols || y >= rows) continue;
      const idx = y * cols + x;
      if (!mask[idx]) continue;
      if (!blockFn(nodes[idx])) out.push(idx);
    }
  }
  if (out.length) return out;
  const all = [];
  const px = point.x;
  const py = point.y;
  for (let i = 0; i < nodes.length; i++) {
    if (!mask[i]) continue;
    const n = nodes[i];
    const dx = px - n.x;
    const dy = py - n.y;
    all.push({ i, d: dx * dx + dy * dy });
  }
  all.sort((a, b) => a.d - b.d);
  const fb = [];
  for (const it of all) {
    if (!blockFn(nodes[it.i])) fb.push(it.i);
    if (fb.length >= 24) break;
  }
  return fb;
}
function simplifyPath(path, edgeCache, clearance, ctx, guard, tol) {
  if (path.length <= 2) return path;
  const out = [path[0]];
  let i = 0;
  while (i < path.length - 1) {
    let j = path.length - 1;
    let found = false;
    while (j > i + 1) {
      if (
        !edgeBlocked(
          path[i],
          path[j],
          edgeCache,
          clearance,
          ctx.walls,
          ctx.sceneRect,
          guard,
          tol,
        )
      ) {
        found = true;
        break;
      }
      j--;
    }
    out.push(path[j]);
    i = j;
  }
  return out;
}
function segmentKey(data, a, b, clearance, graphGuard) {
  const q = Math.max(4, Math.min(24, data.step * 0.2));
  const ax = Math.round(a.x / q),
    ay = Math.round(a.y / q),
    bx = Math.round(b.x / q),
    by = Math.round(b.y / q);
  return `${data.step}|${data.cols}x${data.rows}|c:${clearance.toFixed(2)}|g:${graphGuard.toFixed(2)}|${ax},${ay}->${bx},${by}`;
}
function solveSegment(payload, data, from0, to0, opt) {
  const settings = payload.settings;
  const allowSqueeze = !!settings.gridlessAllowSqueeze;
  const leeway = Number(settings.gridlessSqueezeLeewayPx) || 0;
  const minClear = Number(settings.gridlessMinCenterClearancePx) || 0;
  const exactTol = Number(settings.gridlessExactFitTolerancePx) || 0;
  const tokenRadius = Number(payload.token.radiusPx) || 0;
  const cornerExtra = Number(payload.token.cornerExtraPx) || 0;
  const clearance = Math.max(
    minClear,
    tokenRadius - (allowSqueeze ? leeway : 0),
  );
  const endpointGuard = Math.max(0, Math.min(cornerExtra, clearance * 0.35));
  const graphGuard = 0;
  const graph = getWalkGraph(data, clearance, graphGuard, exactTol);
  const ec = new Map();
  const ctx = { walls: data.walls, sceneRect: data.sceneRect };
  let from = from0;
  let to = to0;
  const startBlocked = pointBlocked(
    from,
    data.walls,
    clearance,
    data.sceneRect,
    endpointGuard,
    exactTol,
  );
  const goalBlocked = pointBlocked(
    to,
    data.walls,
    clearance,
    data.sceneRect,
    endpointGuard,
    exactTol,
  );
  if (startBlocked) {
    const idx = nearestNodeIdx(graph.mask, from, data.nodes);
    if (idx < 0) return { path: null, reason: "start_blocked_no_node" };
    from = data.nodes[idx];
  }
  if (goalBlocked) {
    const idx = nearestNodeIdx(graph.mask, to, data.nodes);
    if (idx < 0) return { path: null, reason: "goal_blocked_no_node" };
    to = data.nodes[idx];
  }
  if (
    !startBlocked &&
    !goalBlocked &&
    !edgeBlocked(
      from0,
      to0,
      ec,
      clearance,
      data.walls,
      data.sceneRect,
      endpointGuard,
      exactTol,
    )
  ) {
    return { path: [from0, to0], reason: null };
  }
  const ck = segmentKey(data, from, to, clearance, graphGuard);
  const cached = data.segmentPathCache.get(ck);
  if (cached && Array.isArray(cached) && cached.length >= 2) {
    const copy = cached.map((p) => ({ x: p.x, y: p.y }));
    copy[0] = { x: from0.x, y: from0.y };
    copy[copy.length - 1] = { x: to0.x, y: to0.y };
    return { path: copy, reason: null };
  }
  const startAttach = nearestCandidates(
    graph.mask,
    from,
    data.nodes,
    (p) =>
      edgeBlocked(
        from,
        p,
        ec,
        clearance,
        data.walls,
        data.sceneRect,
        endpointGuard,
        exactTol,
      ),
    data.cols,
    data.rows,
    data.step,
    data.sceneRect,
  );
  const goalAttach = nearestCandidates(
    graph.mask,
    to,
    data.nodes,
    (p) =>
      edgeBlocked(
        to,
        p,
        ec,
        clearance,
        data.walls,
        data.sceneRect,
        endpointGuard,
        exactTol,
      ),
    data.cols,
    data.rows,
    data.step,
    data.sceneRect,
  );
  if (!startAttach.length || !goalAttach.length)
    return {
      path: null,
      reason: !startAttach.length ? "no_attach_start" : "no_attach_goal",
    };

  const n = data.cols * data.rows;
  const START = n;
  const GOAL = n + 1;
  const N = n + 2;
  const gScore = new Float64Array(N);
  const fScore = new Float64Array(N);
  const came = new Int32Array(N);
  const gScoreFallback = new Float64Array(N);
  const fScoreFallback = new Float64Array(N);
  const cameFallback = new Int32Array(N);
  gScore.fill(Infinity);
  fScore.fill(Infinity);
  came.fill(-1);
  const open = new MinHeap();
  open.init(fScore);
  open.push(START);
  const goalAttachSet = new Set(goalAttach);
  const nodes = data.nodes;
  const node = (i) => (i === START ? from : i === GOAL ? to : nodes[i]);
  gScore[START] = 0;
  const sdx = from.x - to.x;
  const sdy = from.y - to.y;
  fScore[START] = Math.sqrt(sdx * sdx + sdy * sdy);
  const dirs = [
    [-1, -1],
    [0, -1],
    [1, -1],
    [-1, 0],
    [1, 0],
    [-1, 1],
    [0, 1],
    [1, 1],
  ];
  const dirDist = dirs.map(
    (d) => Math.sqrt(d[0] * d[0] + d[1] * d[1]) * data.step,
  );
  const iterCap = Math.max(
    15000,
    Math.min(250000, data.nodes.length * (Number(opt.iterScale) || 8)),
  );
  let iter = 0;
  const closed = new Uint8Array(N);
  let solvedWithFallback = false;
  let solved = false;
  let bestCame = came;
  while (open.size > 0 && iter < iterCap) {
    let curr = open.pop();
    if (curr === -1) break;
    if (closed[curr]) continue;
    closed[curr] = 1;
    iter++;
    if (curr === GOAL) break;
    if (curr === START) {
      const gCurr = gScore[curr];
      for (const nidx of startAttach) {
        if (
          edgeBlocked(
            from,
            nodes[nidx],
            ec,
            clearance,
            data.walls,
            data.sceneRect,
            endpointGuard,
            exactTol,
          )
        )
          continue;
        const dx = from.x - nodes[nidx].x;
        const dy = from.y - nodes[nidx].y;
        const tentative = gCurr + Math.sqrt(dx * dx + dy * dy);
        if (tentative < gScore[nidx]) {
          came[nidx] = curr;
          gScore[nidx] = tentative;
          const n = nodes[nidx];
          const hdx = n.x - to.x;
          const hdy = n.y - to.y;
          fScore[nidx] = tentative + Math.sqrt(hdx * hdx + hdy * hdy);
          open.push(nidx);
        }
      }
      if (
        !edgeBlocked(
          from,
          to,
          ec,
          clearance,
          data.walls,
          data.sceneRect,
          endpointGuard,
          exactTol,
        )
      ) {
        const dx = from.x - to.x;
        const dy = from.y - to.y;
        const tentative = gCurr + Math.sqrt(dx * dx + dy * dy);
        if (tentative < gScore[GOAL]) {
          came[GOAL] = curr;
          gScore[GOAL] = tentative;
          fScore[GOAL] = tentative;
          open.push(GOAL);
        }
      }
    } else {
      const x = curr % data.cols;
      const y = Math.floor(curr / data.cols);
      const bits = graph.edgeBits[curr] || 0;
      if (bits) {
        const gCurr = gScore[curr];
        for (let d = 0; d < dirs.length; d++) {
          if (!(bits & (1 << d))) continue;
          const nx = x + dirs[d][0];
          const ny = y + dirs[d][1];
          const nidx = ny * data.cols + nx;
          const tentative = gCurr + dirDist[d];
          if (tentative < gScore[nidx]) {
            came[nidx] = curr;
            gScore[nidx] = tentative;
            const n = nodes[nidx];
            const hdx = n.x - to.x;
            const hdy = n.y - to.y;
            fScore[nidx] = tentative + Math.sqrt(hdx * hdx + hdy * hdy);
            open.push(nidx);
          }
        }
      }
      if (
        goalAttachSet.has(curr) &&
        !edgeBlocked(
          nodes[curr],
          to,
          ec,
          clearance,
          data.walls,
          data.sceneRect,
          endpointGuard,
          exactTol,
        )
      ) {
        const dx = nodes[curr].x - to.x;
        const dy = nodes[curr].y - to.y;
        const tentative = gScore[curr] + Math.sqrt(dx * dx + dy * dy);
        if (tentative < gScore[GOAL]) {
          came[GOAL] = curr;
          gScore[GOAL] = tentative;
          fScore[GOAL] = tentative;
          open.push(GOAL);
        }
      }
    }
  }
  solved = Number.isFinite(gScore[GOAL]);
  if (!solved) {
    gScoreFallback.fill(Infinity);
    fScoreFallback.fill(Infinity);
    cameFallback.fill(-1);
    const openFallback = new Set([START]);
    const nodeFallback = (i) => (i === START ? from : i === GOAL ? to : nodes[i]);
    gScoreFallback[START] = 0;
    fScoreFallback[START] = fScore[START];
    let iterFallback = 0;
    while (openFallback.size && iterFallback < iterCap) {
      iterFallback++;
      let curr = -1;
      let best = Infinity;
      for (const i of openFallback) {
        if (fScoreFallback[i] < best) {
          best = fScoreFallback[i];
          curr = i;
        }
      }
      if (curr === -1 || curr === GOAL) break;
      openFallback.delete(curr);
      const neigh = [];
      if (curr === START) {
        neigh.push(...startAttach);
        if (
          !edgeBlocked(
            from,
            to,
            ec,
            clearance,
            data.walls,
            data.sceneRect,
            endpointGuard,
            exactTol,
          )
        )
          neigh.push(GOAL);
      } else {
        const x = curr % data.cols;
        const y = Math.floor(curr / data.cols);
        const bits = graph.edgeBits[curr] || 0;
        for (let d = 0; d < dirs.length; d++) {
          if (!(bits & (1 << d))) continue;
          const nx = x + dirs[d][0];
          const ny = y + dirs[d][1];
          if (nx < 0 || ny < 0 || nx >= data.cols || ny >= data.rows) continue;
          neigh.push(ny * data.cols + nx);
        }
        if (
          goalAttachSet.has(curr) &&
          !edgeBlocked(
            nodeFallback(curr),
            to,
            ec,
            clearance,
            data.walls,
            data.sceneRect,
            endpointGuard,
            exactTol,
          )
        )
          neigh.push(GOAL);
      }
      for (const nidx of neigh) {
        if (
          (curr === START || nidx === GOAL) &&
          edgeBlocked(
            nodeFallback(curr),
            nodeFallback(nidx),
            ec,
            clearance,
            data.walls,
            data.sceneRect,
            endpointGuard,
            exactTol,
          )
        )
          continue;
        const na = nodeFallback(curr);
        const nb = nodeFallback(nidx);
        const dx = na.x - nb.x;
        const dy = na.y - nb.y;
        const tentative = gScoreFallback[curr] + Math.sqrt(dx * dx + dy * dy);
        if (tentative < gScoreFallback[nidx]) {
          cameFallback[nidx] = curr;
          gScoreFallback[nidx] = tentative;
          const hx = nb.x - to.x;
          const hy = nb.y - to.y;
          fScoreFallback[nidx] = tentative + Math.sqrt(hx * hx + hy * hy);
          openFallback.add(nidx);
        }
      }
    }
    if (Number.isFinite(gScoreFallback[GOAL])) {
      solved = true;
      solvedWithFallback = true;
      bestCame = cameFallback;
    }
  }
  if (!solved)
    return {
      path: null,
      reason: iter >= iterCap ? "iter_cap_hit" : "no_route",
    };
  const raw = [];
  let c = GOAL;
  while (c !== -1) {
    raw.push(node(c));
    c = bestCame[c];
  }
  raw.reverse();
  let out = simplifyPath(raw, ec, clearance, ctx, endpointGuard, exactTol);
  const same = (a, b) =>
    Math.abs(a.x - b.x) < 1e-3 && Math.abs(a.y - b.y) < 1e-3;
  if (!same(out[0], from0)) out.unshift({ x: from0.x, y: from0.y });
  if (!same(out[out.length - 1], to0)) out.push({ x: to0.x, y: to0.y });
  data.segmentPathCache.set(
    ck,
    out.map((p) => ({ x: p.x, y: p.y })),
  );
  if (data.segmentPathCache.size > 2000) {
    const k = data.segmentPathCache.keys().next();
    if (!k.done) data.segmentPathCache.delete(k.value);
  }
  return { path: out, reason: solvedWithFallback ? "fallback_recovered" : null };
}
function solve(payload) {
  const waypoints = Array.isArray(payload.waypoints) ? payload.waypoints : [];
  if (!waypoints.length) return { path: [], reason: null };
  const baseStep = Number(payload.settings.gridlessNodeStepPx) || 40;
  const attempts = [
    { step: baseStep, cornerScale: 0.75, iterScale: 8, maxTimeMs: 90 },
    {
      step: Math.min(160, baseStep + 12),
      cornerScale: 0.6,
      iterScale: 10,
      maxTimeMs: 110,
    },
    {
      step: Math.min(160, baseStep + 24),
      cornerScale: 0.45,
      iterScale: 12,
      maxTimeMs: 130,
    },
    {
      step: Math.min(160, baseStep + 36),
      cornerScale: 0.35,
      iterScale: 14,
      maxTimeMs: 150,
    },
  ];
  const interactiveFast = payload.interactiveFast === true;
  let ladder = attempts;
  if (interactiveFast) {
    ladder = ladder
      .slice(0, 2)
      .map((a) => ({
        ...a,
        iterScale: Math.min(9, a.iterScale),
        maxTimeMs: Math.min(80, a.maxTimeMs),
      }));
  }
  const full = [];
  for (const opt of ladder) {
    const data = getSceneStepData(payload, opt.step);
    if (!data) continue;
    let from = {
      x: Number(payload.start.x) || 0,
      y: Number(payload.start.y) || 0,
    };
    full.length = 0;
    let ok = true;
    let failReason = "unknown";
    for (const wp of waypoints) {
      const to = { x: Number(wp.x) || 0, y: Number(wp.y) || 0 };
      const seg = solveSegment(payload, data, from, to, opt);
      if (!seg.path || seg.path.length < 2) {
        ok = false;
        failReason = seg.reason || "segment_failed";
        break;
      }
      for (let i = 1; i < seg.path.length; i++) {
        full.push({ x: seg.path[i].x, y: seg.path[i].y });
      }
      from = to;
    }
    if (ok) return { path: full, reason: null, step: data.step };
    if (interactiveFast && failReason === "no_route") break;
  }
  return { path: null, reason: "no_route", step: baseStep };
}

self.onmessage = (event) => {
  const msg = event.data;
  if (!msg || msg.type !== "solve") return;
  const requestId = msg.requestId;
  const tokenId = String(msg.tokenId || "");
  const payload = msg.payload;
  let result;
  try {
    result = solve(payload);
  } catch (err) {
    self.postMessage({
      type: "solve_result",
      requestId,
      tokenId,
      path: null,
      reason: "worker_error",
      error: String(err),
    });
    return;
  }
  const waypoints = Array.isArray(payload.waypoints) ? payload.waypoints : [];
  const target = waypoints.length
    ? waypoints[waypoints.length - 1]
    : payload.start;
  self.postMessage({
    type: "solve_result",
    requestId,
    tokenId,
    start: payload.start,
    target,
    step: result.step,
    path: result.path,
    reason: result.reason,
  });
};
