function sub(a, b) { return [a[0]-b[0], a[1]-b[1], a[2]-b[2]]; }
function cross(a, b) { return [ a[1]*b[2]-a[2]*b[1], a[2]*b[0]-a[0]*b[2], a[0]*b[1]-a[1]*b[0] ]; }
function vlength(a) { return Math.sqrt(a[0]*a[0]+a[1]*a[1]+a[2]*a[2]); }
function normalize(a) { const l = vlength(a) || 1; return [a[0]/l, a[1]/l, a[2]/l]; }
function dot(a,b){ return a[0]*b[0]+a[1]*b[1]+a[2]*b[2]; }
function orient(tri, outward) {
  const n = normalize(cross(sub(tri[1],tri[0]), sub(tri[2],tri[0])));
  return dot(n, outward) < 0 ? [tri[0],tri[2],tri[1]] : tri;
}
function manifoldCheck(tris, decimals) {
  decimals = decimals == null ? 5 : decimals;
  const key = (p) => p[0].toFixed(decimals)+','+p[1].toFixed(decimals)+','+p[2].toFixed(decimals);
  const edges = new Map();
  for (const tri of tris) {
    const k = [key(tri[0]), key(tri[1]), key(tri[2])];
    for (let e = 0; e < 3; e++) {
      const ka = k[e], kb = k[(e+1)%3];
      if (ka === kb) continue;
      const ek = ka < kb ? ka+'|'+kb : kb+'|'+ka;
      edges.set(ek, (edges.get(ek)||0)+1);
    }
  }
  let open=0, bad=0;
  for (const c of edges.values()) { if (c===1) open++; else if (c!==2) bad++; }
  return { triangleCount: tris.length, openEdges: open, badEdges: bad, watertight: open===0 && bad===0 };
}
function computeMeshVolume(tris) { let vol=0; for (const [a,b,c] of tris) vol += dot(a, cross(b,c)); return vol/6; }
function idx(s) { return s > 0 ? 1 : 0; }

function edgeRadiiDefaults(uniform) {
  const mk = () => ({ '0,0': uniform, '0,1': uniform, '1,0': uniform, '1,1': uniform });
  return { rX: mk(), rY: mk(), rZ: mk() };
}
function cornerMinR(sx, sy, sz, R) {
  const ix=idx(sx), iy=idx(sy), iz=idx(sz);
  return Math.min(R.rX[iy+','+iz], R.rY[ix+','+iz], R.rZ[ix+','+iy]);
}
// rho(t) at parameter t along an edge's own axis, given its own radius and the two
// corner-min radii at its -1/+1 ends: constant in the middle, linear "distance-to-corner"
// taper near each end (see PROGRESS notes for why this exact profile is what keeps the
// bordering flat faces' corner cuts as simple straight chamfers instead of curves).
function rhoAt(t, alongHalf, ownR, rMinus, rPlus) {
  const distToMinus = t - (-alongHalf), distToPlus = alongHalf - t;
  return Math.min(ownR, distToMinus, distToPlus);
}

// Shared per-world-axis position arrays, analogous to posByAxis elsewhere in this file:
// each axis gets ONE array used by every edge cylinder running along it AND every face
// dimension that touches it, so seams can never T-junction against each other regardless
// of how differently each of the (up to 4) edges along that axis tapers.
function buildFilletAxisPositions(halfLen, edgeSpecs, resolution, allRadiusValues) {
  const breakpoints = new Set([-halfLen, halfLen]);
  for (const {ownR, rMinus, rPlus} of edgeSpecs) {
    breakpoints.add(-halfLen + rMinus);
    breakpoints.add(-halfLen + ownR);
    breakpoints.add(halfLen - ownR);
    breakpoints.add(halfLen - rPlus);
  }
  // ALSO: any face using this axis as U or V transitions to a DIFFERENT (perpendicular)
  // edge at its inset boundary — e.g. the X axis is used by +Y/-Y faces (inset governed by
  // rZ values) and +Z/-Z faces (inset governed by rY values), not just by the X-edges
  // themselves. Without these, a face's own corner-cut boundary can reference a coordinate
  // this axis never knew about, creating exactly the T-junction/gap this fixes.
  for (const v of allRadiusValues) {
    breakpoints.add(halfLen - v);
    breakpoints.add(-(halfLen - v));
  }
  const sorted = [...breakpoints].filter(v => v >= -halfLen-1e-9 && v <= halfLen+1e-9).sort((a,b)=>a-b);
  const total = 2*halfLen;
  const positions = [sorted[0]];
  for (let s = 0; s < sorted.length-1; s++) {
    const segStart = sorted[s], segEnd = sorted[s+1], segLen = segEnd-segStart;
    if (segLen < 1e-9) continue;
    const subdivisions = Math.max(1, Math.round(resolution * segLen/total));
    for (let i = 1; i <= subdivisions; i++) positions.push(segStart + segLen*i/subdivisions);
  }
  const out = [positions[0]];
  for (let i = 1; i < positions.length; i++) if (positions[i] > out[out.length-1]+1e-9) out.push(positions[i]);
  return out;
}

function buildEdgeCylinderFromAxis(axis, s1, s2, hw, hh, hd, R, alongPositions, segs) {
  segs = segs || 12;
  let along, alongHalf, bAxis,bSign,bHalf, cAxis,cSign,cHalf, ownR, cornerAt;
  if (axis === 'X') {
    along=0; alongHalf=hw; bAxis=1;bSign=s1;bHalf=hh; cAxis=2;cSign=s2;cHalf=hd;
    ownR = R.rX[idx(s1)+','+idx(s2)]; cornerAt = (sx) => cornerMinR(sx, s1, s2, R);
  } else if (axis === 'Y') {
    along=1; alongHalf=hh; bAxis=0;bSign=s1;bHalf=hw; cAxis=2;cSign=s2;cHalf=hd;
    ownR = R.rY[idx(s1)+','+idx(s2)]; cornerAt = (sy) => cornerMinR(s1, sy, s2, R);
  } else {
    along=2; alongHalf=hd; bAxis=0;bSign=s1;bHalf=hw; cAxis=1;cSign=s2;cHalf=hh;
    ownR = R.rZ[idx(s1)+','+idx(s2)]; cornerAt = (sz) => cornerMinR(s1, s2, sz, R);
  }
  const rMinus = cornerAt(-1), rPlus = cornerAt(1);
  if (ownR < 1e-6) return []; // a zero-radius edge is a sharp line, not a surface — nothing to build
  const aStart = -alongHalf + rMinus, aEnd = alongHalf - rPlus;
  const ts = alongPositions.filter(v => v >= aStart-1e-7 && v <= aEnd+1e-7);
  const grid = [];
  for (const t of ts) {
    const rho = rhoAt(t, alongHalf, ownR, rMinus, rPlus);
    const row = [];
    for (let j = 0; j <= segs; j++) {
      const beta = (Math.PI/2)*j/segs;
      const p = [0,0,0];
      p[along] = t;
      p[bAxis] = bSign*(bHalf - rho*(1-Math.cos(beta)));
      p[cAxis] = cSign*(cHalf - rho*(1-Math.sin(beta)));
      row.push(p);
    }
    grid.push(row);
  }
  const outwardMid = [0,0,0]; outwardMid[bAxis]=bSign*0.7071; outwardMid[cAxis]=cSign*0.7071;
  const tris = [];
  // When an adjacent edge is sharp (cornerMin=0) the rim tapers to a single point, so the
  // last row collapses to the box corner. Skipping zero-area triangles turns those would-be
  // degenerate quads into a clean fan to the tip (a degenerate quad otherwise double-counts
  // the tip edges and reports as a non-manifold "bad" edge).
  const pushTri = (tri) => {
    const n = cross(sub(tri[1],tri[0]), sub(tri[2],tri[0]));
    if (n[0]*n[0]+n[1]*n[1]+n[2]*n[2] < 1e-14) return;
    tris.push(orient(tri, outwardMid));
  };
  for (let i = 0; i < ts.length-1; i++) {
    for (let j = 0; j < segs; j++) {
      const a=grid[i][j], b=grid[i][j+1], c=grid[i+1][j+1], d=grid[i+1][j];
      pushTri([a,b,c]);
      pushTri([a,c,d]);
    }
  }
  return tris;
}

function buildCornerSphere(sx, sy, sz, hw, hh, hd, R, segs) {
  segs = segs || 12;
  const r = cornerMinR(sx, sy, sz, R);
  if (r < 1e-6) return []; // a zero-radius corner is a sharp point, not a surface — nothing to build
  const cx = sx*(hw-r), cy = sy*(hh-r), cz = sz*(hd-r);
  const grid = [];
  for (let i = 0; i <= segs; i++) {
    const theta = (Math.PI/2)*i/segs;
    const row = [];
    for (let j = 0; j <= segs; j++) {
      const phi = (Math.PI/2)*j/segs;
      const dx = Math.sin(theta)*Math.cos(phi), dy=Math.cos(theta), dz=Math.sin(theta)*Math.sin(phi);
      row.push([cx+sx*r*dx, cy+sy*r*dy, cz+sz*r*dz]);
    }
    grid.push(row);
  }
  const outward = normalize([sx,sy,sz]);
  const tris = [];
  // theta=0 (i=0) collapses to a single pole point regardless of phi — a "quad" there would
  // have 2 coincident corners (degenerate), which silently double-counts that shared edge in
  // any edge-based watertightness check. Fan the pole directly instead of quad-splitting it.
  const pole = grid[0][0];
  for (let j = 0; j < segs; j++) {
    tris.push(orient([pole, grid[1][j+1], grid[1][j]], outward));
  }
  for (let i = 1; i < segs; i++) for (let j = 0; j < segs; j++) {
    const a=grid[i][j], b=grid[i][j+1], c=grid[i+1][j+1], d=grid[i+1][j];
    tris.push(orient([a,b,c], outward));
    tris.push(orient([a,c,d], outward));
  }
  return tris;
}

// Flat face = grid over the SHARED per-axis arrays, each cell clipped to the region F that
// stays outside all four (tapered) edge cylinders. F's boundary per edge is *exactly* the
// cylinder's tangent rim  u = uHalf - min(ownR, distToCorner+, distToCorner-)  — so the flat
// face and the cylinders share the same limit curve by construction, no separate "chamfer"
// bookkeeping. Corners legitimately bulge OUT past the mid-edge inset (the fat edge slims to
// the corner min), so the full axis range is gridded, not a clipped rectangle. Within any one
// cell each side's min() picks a single linear piece (the switch points are grid lines), so
// the boundary is locally linear and Sutherland–Hodgman clips it exactly; adjacent cells clip
// the shared edge to identical crossing points, keeping the interior watertight.
function buildFaceAsymFromAxis(uAxis, vAxis, nAxis, nOffset, uHalf, vHalf, outward, insetU, insetV, uPositionsFull, vPositionsFull) {
  const EPS = 1e-7;
  const mk = (uu, vv) => { const p=[0,0,0]; p[uAxis]=uu; p[vAxis]=vv; p[nAxis]=nOffset; return p; };
  const marginUp = (u,v) => (uHalf - Math.min(insetU.plus,  vHalf - v, vHalf + v)) - u;
  const marginUm = (u,v) => u + (uHalf - Math.min(insetU.minus, vHalf - v, vHalf + v));
  const marginVp = (u,v) => (vHalf - Math.min(insetV.plus,  uHalf - u, uHalf + u)) - v;
  const marginVm = (u,v) => v + (vHalf - Math.min(insetV.minus, uHalf - u, uHalf + u));
  const sides = [marginUp, marginUm, marginVp, marginVm];
  const inF = (u,v) => sides.every(f => f(u,v) >= -EPS);
  const dedup = a => a.slice().sort((x,y)=>x-y).filter((x,i,arr)=> i===0 || x > arr[i-1]+1e-9);
  const uPos = dedup(uPositionsFull), vPos = dedup(vPositionsFull);

  function clip(poly, f) {
    const out = [];
    for (let i=0;i<poly.length;i++){
      const A=poly[i], C=poly[(i+1)%poly.length];
      const da=f(A[0],A[1]), db=f(C[0],C[1]);
      const ain = da >= -EPS, bin = db >= -EPS;
      if (ain) out.push(A);
      if (ain !== bin) { const t=da/(da-db); out.push([A[0]+(C[0]-A[0])*t, A[1]+(C[1]-A[1])*t]); }
    }
    return out;
  }
  const dedupPoly = poly => {
    const out=[];
    for (let i=0;i<poly.length;i++){ const p=poly[i], q=poly[(i+1)%poly.length];
      if (Math.abs(p[0]-q[0])>1e-9 || Math.abs(p[1]-q[1])>1e-9) out.push(p); }
    return out;
  };

  const tris = [];
  for (let j=0;j<vPos.length-1;j++){
    for (let i=0;i<uPos.length-1;i++){
      const u0=uPos[i],u1=uPos[i+1],v0=vPos[j],v1=vPos[j+1];
      let poly=[[u0,v0],[u1,v0],[u1,v1],[u0,v1]];
      const nin=poly.filter(c=>inF(c[0],c[1])).length;
      if (nin===0) continue;
      if (nin!==4) { for (const f of sides){ poly=clip(poly,f); if (poly.length<3) break; } }
      poly=dedupPoly(poly);
      if (poly.length<3) continue;
      for (let k=1;k<poly.length-1;k++){
        const area=Math.abs((poly[k][0]-poly[0][0])*(poly[k+1][1]-poly[0][1])-(poly[k+1][0]-poly[0][0])*(poly[k][1]-poly[0][1]));
        if (area<1e-9) continue;
        tris.push(orient([mk(poly[0][0],poly[0][1]), mk(poly[k][0],poly[k][1]), mk(poly[k+1][0],poly[k+1][1])], outward));
      }
    }
  }
  return tris;
}

function buildAsymRoundedBox(w, h, d, R, resolution) {
  const hw=w/2, hh=h/2, hd=d/2;
  resolution = resolution || 10;
  let tris = [];

  // Build the 3 shared per-axis position arrays, each fed by the 4 edges running along it.
  function edgeSpec(axis, s1, s2) {
    let alongHalf, ownR, cornerAt;
    if (axis==='X') { alongHalf=hw; ownR=R.rX[idx(s1)+','+idx(s2)]; cornerAt=(sx)=>cornerMinR(sx,s1,s2,R); }
    else if (axis==='Y') { alongHalf=hh; ownR=R.rY[idx(s1)+','+idx(s2)]; cornerAt=(sy)=>cornerMinR(s1,sy,s2,R); }
    else { alongHalf=hd; ownR=R.rZ[idx(s1)+','+idx(s2)]; cornerAt=(sz)=>cornerMinR(s1,s2,sz,R); }
    return { ownR, rMinus:cornerAt(-1), rPlus:cornerAt(1) };
  }
  const xSpecs = [[1,1],[1,-1],[-1,1],[-1,-1]].map(([sy,sz])=>edgeSpec('X',sy,sz));
  const ySpecs = [[1,1],[1,-1],[-1,1],[-1,-1]].map(([sx,sz])=>edgeSpec('Y',sx,sz));
  const zSpecs = [[1,1],[1,-1],[-1,1],[-1,-1]].map(([sx,sy])=>edgeSpec('Z',sx,sy));
  const allRadiusValues = [
    R.rX['0,0'],R.rX['0,1'],R.rX['1,0'],R.rX['1,1'],
    R.rY['0,0'],R.rY['0,1'],R.rY['1,0'],R.rY['1,1'],
    R.rZ['0,0'],R.rZ['0,1'],R.rZ['1,0'],R.rZ['1,1'],
  ];
  let xPositions = buildFilletAxisPositions(hw, xSpecs, resolution, allRadiusValues);
  let yPositions = buildFilletAxisPositions(hh, ySpecs, resolution, allRadiusValues);
  let zPositions = buildFilletAxisPositions(hd, zSpecs, resolution, allRadiusValues);

  // A corner's chamfer diagonal lies on the line  signV*v - signU*u = vHalf - uHalf  (a 45°
  // line through the sharp corner, independent of the radii). Both the flat face's cell-clip
  // (which lands a vertex wherever the diagonal crosses a grid line of EITHER axis) and each
  // edge cylinder (which subdivides its rim only along its OWN axis) touch this diagonal, so
  // every crossing must exist as a breakpoint on BOTH axes — otherwise the face gets a vertex
  // the cylinder's single long edge spans (a T-junction). Map each near-corner breakpoint to
  // its partner on the other axis. Iterate to a fixed point: the three axis-pairs feed each
  // other (a z added from the x/z diagonal must still be reflected into y via the y/z one).
  function syncDiagonal(uArr, vArr, uHalf, vHalf, iU, iV, signU, signV) {
    const hi = Math.max(iU, iV) + 1e-7;               // diagonal is active within this reach of the corner
    const lineConst = vHalf - uHalf;
    const addTo = (arr, halfLen, val) => { const c=Math.max(-halfLen,Math.min(halfLen,val)); if (!arr.some(x=>Math.abs(x-c)<1e-7)) { arr.push(c); return true; } return false; };
    let changed = false;
    for (const u of uArr.slice()) {
      const dist = uHalf - signU*u;                   // distance from the u = signU*uHalf edge
      if (dist < -1e-7 || dist > hi) continue;
      if (addTo(vArr, vHalf, signV*(signU*u + lineConst))) changed = true;
    }
    for (const v of vArr.slice()) {
      const dist = vHalf - signV*v;
      if (dist < -1e-7 || dist > hi) continue;
      if (addTo(uArr, uHalf, signU*(signV*v - lineConst))) changed = true;
    }
    return changed;
  }
  let syncGuard = 0, syncChanged = true;
  while (syncChanged && syncGuard++ < 30) {
    syncChanged = false;
    for (const sy of [1,-1]) for (const sz of [1,-1]) for (const sx of [1,-1]) {
      if (syncDiagonal(xPositions, zPositions, hw, hd, R.rZ[idx(sx)+','+idx(sy)], R.rX[idx(sy)+','+idx(sz)], sx, sz)) syncChanged = true;
      if (syncDiagonal(xPositions, yPositions, hw, hh, R.rY[idx(sx)+','+idx(sz)], R.rZ[idx(sx)+','+idx(sy)], sx, sy)) syncChanged = true;
      if (syncDiagonal(yPositions, zPositions, hh, hd, R.rX[idx(sy)+','+idx(sz)], R.rY[idx(sx)+','+idx(sz)], sy, sz)) syncChanged = true;
    }
  }
  xPositions.sort((a,b)=>a-b); yPositions.sort((a,b)=>a-b); zPositions.sort((a,b)=>a-b);

  const faceDefs = [
    { name:'+X', uAxis:1,vAxis:2,nAxis:0,nOffset:hw, uHalf:hh,vHalf:hd, outward:[1,0,0], uPos:yPositions, vPos:zPositions,
      insetU:{plus:R.rZ['1,1'], minus:R.rZ['1,0']}, insetV:{plus:R.rY['1,1'], minus:R.rY['1,0']} },
    { name:'-X', uAxis:1,vAxis:2,nAxis:0,nOffset:-hw, uHalf:hh,vHalf:hd, outward:[-1,0,0], uPos:yPositions, vPos:zPositions,
      insetU:{plus:R.rZ['0,1'], minus:R.rZ['0,0']}, insetV:{plus:R.rY['0,1'], minus:R.rY['0,0']} },
    { name:'+Y', uAxis:0,vAxis:2,nAxis:1,nOffset:hh, uHalf:hw,vHalf:hd, outward:[0,1,0], uPos:xPositions, vPos:zPositions,
      insetU:{plus:R.rZ['1,1'], minus:R.rZ['0,1']}, insetV:{plus:R.rX['1,1'], minus:R.rX['1,0']} },
    { name:'-Y', uAxis:0,vAxis:2,nAxis:1,nOffset:-hh, uHalf:hw,vHalf:hd, outward:[0,-1,0], uPos:xPositions, vPos:zPositions,
      insetU:{plus:R.rZ['1,0'], minus:R.rZ['0,0']}, insetV:{plus:R.rX['0,1'], minus:R.rX['0,0']} },
    { name:'+Z', uAxis:0,vAxis:1,nAxis:2,nOffset:hd, uHalf:hw,vHalf:hh, outward:[0,0,1], uPos:xPositions, vPos:yPositions,
      insetU:{plus:R.rY['1,1'], minus:R.rY['0,1']}, insetV:{plus:R.rX['1,1'], minus:R.rX['0,1']} },
    { name:'-Z', uAxis:0,vAxis:1,nAxis:2,nOffset:-hd, uHalf:hw,vHalf:hh, outward:[0,0,-1], uPos:xPositions, vPos:yPositions,
      insetU:{plus:R.rY['1,0'], minus:R.rY['0,0']}, insetV:{plus:R.rX['1,0'], minus:R.rX['0,0']} },
  ];
  for (const f of faceDefs) {
    tris = tris.concat(buildFaceAsymFromAxis(f.uAxis,f.vAxis,f.nAxis,f.nOffset,f.uHalf,f.vHalf,f.outward,f.insetU,f.insetV,f.uPos,f.vPos));
  }
  for (const [s1,s2] of [[1,1],[1,-1],[-1,1],[-1,-1]]) {
    tris = tris.concat(buildEdgeCylinderFromAxis('X', s1, s2, hw,hh,hd, R, xPositions));
    tris = tris.concat(buildEdgeCylinderFromAxis('Y', s1, s2, hw,hh,hd, R, yPositions));
    tris = tris.concat(buildEdgeCylinderFromAxis('Z', s1, s2, hw,hh,hd, R, zPositions));
  }
  for (const sx of [1,-1]) for (const sy of [1,-1]) for (const sz of [1,-1]) {
    tris = tris.concat(buildCornerSphere(sx,sy,sz, hw,hh,hd, R));
  }
  return tris;
}
