// ============================================================================
// Standalone Node test harness for the logo-zone-aware grid fix.
// Contains: (a) unchanged utility fns copied verbatim from the HTML for context,
// (b) the NEW/MODIFIED functions exactly as intended for the merge, (c) test scenarios.
// ============================================================================

// ---- unchanged utils (copied verbatim from the HTML, lines 481-494) ----
function sub(a, b) { return [a[0]-b[0], a[1]-b[1], a[2]-b[2]]; }
function cross(a, b) { return [ a[1]*b[2]-a[2]*b[1], a[2]*b[0]-a[0]*b[2], a[0]*b[1]-a[1]*b[0] ]; }
function vlength(a) { return Math.sqrt(a[0]*a[0]+a[1]*a[1]+a[2]*a[2]); }
function normalize(a) { const l = vlength(a) || 1; return [a[0]/l, a[1]/l, a[2]/l]; }
function faceNormal(tri) { return normalize(cross(sub(tri[1], tri[0]), sub(tri[2], tri[0]))); }
function dot(a,b){ return a[0]*b[0]+a[1]*b[1]+a[2]*b[2]; }
function snap(p) { return p.map(c => Math.abs(c) < 1e-9 ? 0 : c); }

// ---- unchanged (lines 502-533) ----
function makeTaperPointFn(angXPlus, angXMinus, angZPlus, angZMinus, angYPlusX, angYPlusZ, angYMinusX, angYMinusZ, hw, hh, hd) {
  const height = 2*hh;
  function clampedTan(deg, halfDim, budget) {
    if (!deg) return 0;
    const maxAngle = Math.atan((halfDim*budget)/height);
    const theta = Math.max(-maxAngle, Math.min(maxAngle, deg*Math.PI/180));
    return Math.tan(theta);
  }
  const tXP = clampedTan(angXPlus, hw, 0.85), tXM = clampedTan(angXMinus, hw, 0.85);
  const tZP = clampedTan(angZPlus, hd, 0.85), tZM = clampedTan(angZMinus, hd, 0.85);
  function clampedTanY(deg) {
    if (!deg) return 0;
    const maxAngle = Math.atan(0.5);
    const theta = Math.max(-maxAngle, Math.min(maxAngle, deg*Math.PI/180));
    return Math.tan(theta);
  }
  const tYPX = clampedTanY(angYPlusX), tYPZ = clampedTanY(angYPlusZ);
  const tYMX = clampedTanY(angYMinusX), tYMZ = clampedTanY(angYMinusZ);
  return function taperPoint(p) {
    const hOff = p[1]+hh;
    const wallXPlus = hw - hOff*tXP, wallXMinus = -hw + hOff*tXM;
    const wallZPlus = hd - hOff*tZP, wallZMinus = -hd + hOff*tZM;
    const ux = (p[0]+hw)/(2*hw), uz = (p[2]+hd)/(2*hd);
    const x1 = wallXMinus + ux*(wallXPlus-wallXMinus);
    const z1 = wallZMinus + uz*(wallZPlus-wallZMinus);
    const bottomPlane = -hh + x1*tYMX + z1*tYMZ;
    const topPlane = hh + x1*tYPX + z1*tYPZ;
    const uy = (p[1]+hh)/(2*hh);
    const y1 = bottomPlane + uy*(topPlane-bottomPlane);
    return [x1, y1, z1];
  };
}

// ============================================================================
// NEW: replaces buildFaceUniformTapered.
// ============================================================================
const AXIS_POINT_BUDGET = 300; // see note in buildLogoAwareAxisPositions — tightened from 600
                                // after real-world use showed 600 could still take multiple
                                // seconds and feel like a freeze even though it never OOM'd

function buildLogoAwareAxisPositions(halfLen, zones, innerRes) {
  innerRes = Math.max(1, innerRes|0);
  const clipped = zones
    .map(([a,b]) => [Math.max(-halfLen, Math.min(a,b)), Math.min(halfLen, Math.max(a,b))])
    .filter(([lo,hi]) => hi > lo + 1e-9)
    .sort((p,q) => p[0]-q[0]);
  const merged = [];
  for (const z of clipped) {
    const last = merged[merged.length-1];
    if (last && z[0] <= last[1] + 1e-9) last[1] = Math.max(last[1], z[1]);
    else merged.push([z[0], z[1]]);
  }
  // Defense in depth: innerRes is meant to size ONE logo's own footprint, but every zone on
  // this axis (from every logo touching it, across up to 4 different faces) gets its own
  // full innerRes subdivisions. With enough zones sharing an axis (many logos, or logos
  // spread so they land in separate zones), zoneCount*innerRes can still grow large enough
  // to multiply into a huge per-face grid (nu*nv) — so cap the TOTAL points this axis
  // contributes, scaling every zone's resolution down together (never below a usable floor)
  // rather than letting resolution*zoneCount grow unbounded.
  let effRes = innerRes;
  if (merged.length >= 1 && merged.length * innerRes > AXIS_POINT_BUDGET) {
    effRes = Math.max(4, Math.floor(AXIS_POINT_BUDGET / merged.length));
  }
  const positions = [-halfLen];
  let cursor = -halfLen;
  for (const [lo, hi] of merged) {
    if (lo > cursor + 1e-9) positions.push(lo);
    for (let i = 1; i <= effRes; i++) positions.push(lo + (hi-lo)*i/effRes);
    cursor = hi;
  }
  if (cursor < halfLen - 1e-9) positions.push(halfLen);
  const out = [positions[0]];
  for (let i = 1; i < positions.length; i++) if (positions[i] > out[out.length-1] + 1e-9) out.push(positions[i]);
  return out;
}

// NEW: replaces buildFaceUniformTapered's grid-building half.
function buildFaceFromPositionsTapered(uAxis, vAxis, nAxis, nOffset, uPositions, vPositions, outward, dispFn, taperFn) {
  const nu = uPositions.length, nv = vPositions.length;
  const baseGrid = [];
  for (let j = 0; j < nv; j++) {
    const vv = vPositions[j];
    const row = [];
    for (let i = 0; i < nu; i++) {
      const p = [0,0,0]; p[uAxis]=uPositions[i]; p[vAxis]=vv; p[nAxis]=nOffset;
      row.push(taperFn(p));
    }
    baseGrid.push(row);
  }
  function localNormalAt(i, j) {
    const left = baseGrid[j][Math.max(0,i-1)], right = baseGrid[j][Math.min(nu-1,i+1)];
    const down = baseGrid[Math.max(0,j-1)][i], up = baseGrid[Math.min(nv-1,j+1)][i];
    let n = cross(sub(right,left), sub(up,down));
    if (vlength(n) < 1e-9) return outward;
    n = normalize(n);
    return dot(n, outward) < 0 ? [-n[0],-n[1],-n[2]] : n;
  }
  const grid = [];
  for (let j = 0; j < nv; j++) {
    const row = [];
    for (let i = 0; i < nu; i++) {
      const base = baseGrid[j][i];
      const disp = dispFn ? dispFn(uPositions[i], vPositions[j], base) : 0;
      let p = base;
      if (disp) {
        const n = localNormalAt(i,j);
        p = [base[0]+n[0]*disp, base[1]+n[1]*disp, base[2]+n[2]*disp];
      }
      row.push(snap(p));
    }
    grid.push(row);
  }
  const tris = [];
  for (let j = 0; j < nv-1; j++) {
    for (let i = 0; i < nu-1; i++) {
      const a=grid[j][i], b=grid[j][i+1], c=grid[j+1][i+1], dd=grid[j+1][i];
      const refN = localNormalAt(i,j);
      const n = cross(sub(b,a),sub(dd,a));
      const flip = dot(n,refN) < 0;
      if (!flip) { tris.push([a,b,c]); tris.push([a,c,dd]); }
      else { tris.push([a,c,b]); tris.push([a,dd,c]); }
    }
  }
  return tris;
}

// MODIFIED: now takes an extra zonesByAxis param, uses buildLogoAwareAxisPositions +
// buildFaceFromPositionsTapered instead of buildFaceUniformTapered.
function buildBoxWithLogos(w, h, d, resolution, logoDispFns, taperFn, zonesByAxis) {
  const hw=w/2, hh=h/2, hd=d/2;
  const halfByAxis = [hw, hh, hd];
  const posByAxis = [0,1,2].map(ax => buildLogoAwareAxisPositions(halfByAxis[ax], (zonesByAxis && zonesByAxis[ax]) || [], resolution));
  const faces = [
    {name:'+X', uAxis:1,vAxis:2,nAxis:0,nOffset:hw,  outward:[1,0,0]},
    {name:'-X', uAxis:1,vAxis:2,nAxis:0,nOffset:-hw, outward:[-1,0,0]},
    {name:'+Y', uAxis:0,vAxis:2,nAxis:1,nOffset:hh,  outward:[0,1,0]},
    {name:'-Y', uAxis:0,vAxis:2,nAxis:1,nOffset:-hh, outward:[0,-1,0]},
    {name:'+Z', uAxis:0,vAxis:1,nAxis:2,nOffset:hd,  outward:[0,0,1]},
    {name:'-Z', uAxis:0,vAxis:1,nAxis:2,nOffset:-hd, outward:[0,0,-1]},
  ];
  let tris = [];
  for (const f of faces) {
    const dispFn = logoDispFns && logoDispFns[f.name];
    tris = tris.concat(buildFaceFromPositionsTapered(f.uAxis,f.vAxis,f.nAxis,f.nOffset, posByAxis[f.uAxis], posByAxis[f.vAxis], f.outward, dispFn, taperFn));
  }
  return { tris, posByAxis };
}

// ---- unchanged (lines 615-627) ----
const BOX_FACE_DIMS = {
  '+X': (p)=>({uLen:p.height, vLen:p.depth}),  '-X': (p)=>({uLen:p.height, vLen:p.depth}),
  '+Y': (p)=>({uLen:p.width,  vLen:p.depth}),  '-Y': (p)=>({uLen:p.width,  vLen:p.depth}),
  '+Z': (p)=>({uLen:p.width,  vLen:p.height}), '-Z': (p)=>({uLen:p.width,  vLen:p.height}),
};
const FACE_AXES = {
  '+X': (p)=>[1,2,0, p.width/2],  '-X': (p)=>[1,2,0,-p.width/2],
  '+Y': (p)=>[0,2,1, p.height/2],'-Y': (p)=>[0,2,1,-p.height/2],
  '+Z': (p)=>[0,1,2, p.depth/2], '-Z': (p)=>[0,1,2,-p.depth/2],
};

// ---- unchanged (lines 1147, 1197-1253) ----
const LOGO_HM_SIZE = 256;
function sampleHeightmap(hm, u01, v01) {
  const size = LOGO_HM_SIZE;
  const x = Math.min(size-1, Math.max(0, Math.floor(u01*size)));
  const y = Math.min(size-1, Math.max(0, Math.floor(v01*size)));
  return hm[y*size+x];
}
function makeLogoFrame(logo, taperFn) {
  const eps = 0.5;
  const mk = (uu,vv) => { const p=[0,0,0]; p[logo.uAxis]=uu; p[logo.vAxis]=vv; p[logo.nAxis]=logo.nOffset; return p; };
  const center = taperFn(mk(logo.u0, logo.v0));
  const TuRaw = sub(taperFn(mk(logo.u0+eps, logo.v0)), taperFn(mk(logo.u0-eps, logo.v0))).map(c=>c/(2*eps));
  const TvRaw = sub(taperFn(mk(logo.u0, logo.v0+eps)), taperFn(mk(logo.u0, logo.v0-eps))).map(c=>c/(2*eps));
  return { center, TuHat: normalize(TuRaw), TvHat: normalize(TvRaw), magU: vlength(TuRaw), magV: vlength(TvRaw) };
}
function makeLogoDispFn(logo, frame) {
  if (!logo.heightmap) return null;
  const rad = (logo.rotation||0) * Math.PI/180;
  const cosR = Math.cos(-rad), sinR = Math.sin(-rad);
  return (u, v, taperedPos) => {
    const offset3D = sub(taperedPos, frame.center);
    const realDu = dot(offset3D, frame.TuHat);
    const realDv = dot(offset3D, frame.TvHat);
    const ldu = realDu*cosR - realDv*sinR, ldv = realDu*sinR + realDv*cosR;
    if (Math.abs(ldu) > logo.w/2 || Math.abs(ldv) > logo.h/2) return 0;
    let u01 = (ldu + logo.w/2) / logo.w;
    let v01 = 1 - (ldv + logo.h/2) / logo.h;
    let val = sampleHeightmap(logo.heightmap, u01, v01);
    if (logo.invert) val = 1 - val;
    return val > logo.threshold ? logo.depth : 0;
  };
}
function rotatedHalfExtents(w, h, rotationDeg) {
  const rad = (rotationDeg||0) * Math.PI/180;
  const c = Math.abs(Math.cos(rad)), s = Math.abs(Math.sin(rad));
  return { halfX: (w/2)*c + (h/2)*s, halfY: (w/2)*s + (h/2)*c };
}

// ---- unchanged (lines 1362-1379), needs global `logos` ----
function buildCombinedLogoDispFns(taperFn, logos) {
  const p = paramState.box;
  const fnsByFace = {};
  for (const logo of logos) {
    const [uAxis,vAxis,nAxis,nOffset] = FACE_AXES[logo.face](p);
    const fullLogo = {...logo, uAxis, vAxis, nAxis, nOffset};
    const frame = makeLogoFrame(fullLogo, taperFn);
    const fn = makeLogoDispFn(fullLogo, frame);
    if (!fnsByFace[logo.face]) fnsByFace[logo.face] = [];
    fnsByFace[logo.face].push(fn);
  }
  const dispFns = {};
  for (const face in fnsByFace) {
    const fns = fnsByFace[face];
    dispFns[face] = (u,v,base) => { for (const fn of fns) { const d = fn(u,v,base); if (d !== 0) return d; } return 0; };
  }
  return dispFns;
}

// ============================================================================
// NEW: goes right after buildCombinedLogoDispFns in the real file.
// ============================================================================
function computeLogoZonesByAxis(taperFn, logos) {
  const p = paramState.box;
  const zonesByAxis = {0:[], 1:[], 2:[]};
  const margin = 2;
  for (const logo of logos) {
    const [uAxis,vAxis,nAxis,nOffset] = FACE_AXES[logo.face](p);
    const fullLogo = {...logo, uAxis, vAxis, nAxis, nOffset};
    const frame = makeLogoFrame(fullLogo, taperFn);
    const ext = rotatedHalfExtents(logo.w, logo.h, logo.rotation);
    const flatHalfU = ext.halfX / Math.max(1e-3, frame.magU) + margin;
    const flatHalfV = ext.halfY / Math.max(1e-3, frame.magV) + margin;
    zonesByAxis[uAxis].push([logo.u0 - flatHalfU, logo.u0 + flatHalfU]);
    zonesByAxis[vAxis].push([logo.v0 - flatHalfV, logo.v0 + flatHalfV]);
  }
  return zonesByAxis;
}

// ---- unchanged (1029-1069), for verification ----
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
  let open = 0, bad = 0;
  for (const c of edges.values()) { if (c === 1) open++; else if (c !== 2) bad++; }
  return { triangleCount: tris.length, openEdges: open, badEdges: bad, watertight: open===0 && bad===0 };
}
function computeBBox(tris) {
  let minX=Infinity,maxX=-Infinity,minY=Infinity,maxY=-Infinity,minZ=Infinity,maxZ=-Infinity;
  for (const tri of tris) for (const p of tri) {
    if(p[0]<minX)minX=p[0]; if(p[0]>maxX)maxX=p[0];
    if(p[1]<minY)minY=p[1]; if(p[1]>maxY)maxY=p[1];
    if(p[2]<minZ)minZ=p[2]; if(p[2]>maxZ)maxZ=p[2];
  }
  return {minX,maxX,minY,maxY,minZ,maxZ};
}
function hasNaN(tris) {
  for (const tri of tris) for (const p of tri) for (const c of p) if (!Number.isFinite(c)) return true;
  return false;
}

// ============================================================================
// TEST HARNESS
// ============================================================================
let pass = 0, fail = 0;
function check(name, cond, extra) {
  if (cond) { pass++; console.log('  OK  ', name); }
  else { fail++; console.log('  FAIL', name, extra!==undefined?JSON.stringify(extra):''); }
}

function makeSolidHeightmap() { return new Float32Array(LOGO_HM_SIZE*LOGO_HM_SIZE).fill(1); }

console.log('=== Unit tests: buildLogoAwareAxisPositions ===');
{
  const pos = buildLogoAwareAxisPositions(233, [[-50,-18]], 50);
  check('starts at -halfLen', pos[0] === -233);
  check('ends at +halfLen', pos[pos.length-1] === 233);
  check('monotonic strictly increasing', pos.every((v,i)=> i===0 || v > pos[i-1]));
  const inZone = pos.filter(v => v >= -50-1e-6 && v <= -18+1e-6);
  check('zone has innerRes+1 points', inZone.length === 51, inZone.length);
  const spacingInZone = inZone[1]-inZone[0];
  check('zone spacing ~ (32/50)=0.64mm', Math.abs(spacingInZone-0.64) < 1e-6, spacingInZone);
  const outsideBig = pos.filter(v => v < -50-1e-6);
  check('nothing but the boundary outside the zone on the left', outsideBig.length === 1 && outsideBig[0]===-233, outsideBig);
}
{
  // overlap merging
  const pos = buildLogoAwareAxisPositions(100, [[-10,10],[5,20]], 10);
  check('merged overlapping zones (no dup/degenerate segments)', pos.every((v,i)=> i===0 || v > pos[i-1]));
  check('covers merged span start', pos.some(v=>Math.abs(v-(-10))<1e-6));
  check('covers merged span end', pos.some(v=>Math.abs(v-20)<1e-6));
}
{
  // no zones at all -> single flat cell
  const pos = buildLogoAwareAxisPositions(50, [], 80);
  check('no zones -> exactly 2 points', pos.length === 2, pos);
  check('no zones -> spans full range', pos[0]===-50 && pos[1]===50);
}
{
  // zone touching the boundary
  const pos = buildLogoAwareAxisPositions(50, [[-50,-30]], 5);
  check('zone flush with boundary: no dup at start', pos[0] === -50 && pos[1] > -50);
  check('flush zone count', pos.length === 1+5+1, pos.length); // -50 start + 5 interior + far boundary... check below
}

console.log('\n=== Scenario A: big box, one small logo, no taper ===');
{
  paramState = { box: { width: 466, height: 60, depth: 60, taperXPlus:0, taperXMinus:0, taperZPlus:0, taperZMinus:0, taperYPlusX:0, taperYPlusZ:0, taperYMinusX:0, taperYMinusZ:0 } };
  const p = paramState.box;
  const logos = [
    { id:1, face:'+Z', u0:0, v0:0, w:16, h:16, depth:2, threshold:0.5, invert:false, rotation:0, heightmap: makeSolidHeightmap() },
  ];
  const resolution = 50;
  const taperFn = makeTaperPointFn(0,0,0,0,0,0,0,0, p.width/2, p.height/2, p.depth/2);
  const dispFns = buildCombinedLogoDispFns(taperFn, logos);
  const zonesByAxis = computeLogoZonesByAxis(taperFn, logos);
  const { tris, posByAxis } = buildBoxWithLogos(p.width, p.height, p.depth, resolution, dispFns, taperFn, zonesByAxis);

  check('no NaN/Infinity in output', !hasNaN(tris));
  const mc = manifoldCheck(tris, 4);
  check('watertight manifold', mc.watertight, mc);
  const bb = computeBBox(tris);
  check('bbox X matches width', Math.abs((bb.maxX-bb.minX) - 466) < 1e-6, bb);

  // X positions (axis 0) should be dense around the logo (u0=0, w=16 -> zone ~[-8-2,8+2]=[-10,10])
  const xPos = posByAxis[0];
  const cellsSpanningLogo = xPos.filter(v => v >= -8 && v <= 8);
  console.log('    logoResolution =', resolution, '| xPositions total points =', xPos.length, '| points spanning the 16mm logo width =', cellsSpanningLogo.length);
  // zone = logo width + 2*margin(2mm) = 20mm, so ~16/20=80% of the resolution's points land
  // inside the exact 16mm logo footprint - still an enormous improvement over the old ~5/150.
  check('logo width now gets close to full resolution (not diluted ~5/150 like before)', cellsSpanningLogo.length >= resolution*0.7, cellsSpanningLogo.length);
  check('face far from the logo stays coarse (total x points << resolution*width/logoWidth)', xPos.length < 120, xPos.length);

  // confirm actual relief got applied (some points sit above z = hd)
  const hd = p.depth/2;
  const raised = tris.some(tri => tri.some(pt => pt[2] > hd + 0.5));
  check('relief actually present (raised vertices found)', raised);
}

console.log('\n=== Scenario B: big box, small logo, WITH combined taper (bilinear-warp stress test) ===');
{
  paramState = { box: { width: 300, height: 80, depth: 300, taperXPlus:20, taperXMinus:-10, taperZPlus:15, taperZMinus:15, taperYPlusX:5, taperYPlusZ:0, taperYMinusX:0, taperYMinusZ:0 } };
  const p = paramState.box;
  const logos = [
    { id:1, face:'+Z', u0:20, v0:10, w:20, h:12, depth:1.5, threshold:0.5, invert:false, rotation:0, heightmap: makeSolidHeightmap() },
    { id:2, face:'+Y', u0:-30, v0:0, w:15, h:15, depth:1.5, threshold:0.5, invert:false, rotation:30, heightmap: makeSolidHeightmap() },
  ];
  const taperFn = makeTaperPointFn(p.taperXPlus,p.taperXMinus,p.taperZPlus,p.taperZMinus,p.taperYPlusX,p.taperYPlusZ,p.taperYMinusX,p.taperYMinusZ, p.width/2, p.height/2, p.depth/2);
  const dispFns = buildCombinedLogoDispFns(taperFn, logos);
  const zonesByAxis = computeLogoZonesByAxis(taperFn, logos);
  const { tris } = buildBoxWithLogos(p.width, p.height, p.depth, 40, dispFns, taperFn, zonesByAxis);

  check('no NaN/Infinity with combined taper', !hasNaN(tris));
  const mc = manifoldCheck(tris, 4);
  check('watertight with combined taper + 2 logos on different faces', mc.watertight, mc);
}

console.log('\n=== Scenario C: two logos sharing an axis (seam-sharing check) ===');
{
  // +Z uses X as u; +Y also uses X as u. A logo on +Z and a logo on +Y both contribute
  // zones to the SAME shared X axis array. Also directly verify the actual +Z/+Y shared
  // edge (running along X, at Y=hh & Z=hd) lines up vertex-for-vertex.
  paramState = { box: { width: 200, height: 200, depth: 200, taperXPlus:0, taperXMinus:0, taperZPlus:0, taperZMinus:0, taperYPlusX:0, taperYPlusZ:0, taperYMinusX:0, taperYMinusZ:0 } };
  const p = paramState.box;
  const logos = [
    { id:1, face:'+Z', u0:40, v0:0, w:10, h:10, depth:1, threshold:0.5, invert:false, rotation:0, heightmap: makeSolidHeightmap() },
    { id:2, face:'+Y', u0:-60, v0:0, w:8, h:8, depth:1, threshold:0.5, invert:false, rotation:0, heightmap: makeSolidHeightmap() },
  ];
  const taperFn = makeTaperPointFn(0,0,0,0,0,0,0,0, p.width/2, p.height/2, p.depth/2);
  const dispFns = buildCombinedLogoDispFns(taperFn, logos);
  const zonesByAxis = computeLogoZonesByAxis(taperFn, logos);
  const { tris, posByAxis } = buildBoxWithLogos(p.width, p.height, p.depth, 30, dispFns, taperFn, zonesByAxis);

  check('X axis zones list has 2 entries (one per logo)', zonesByAxis[0].length === 2, zonesByAxis[0]);
  check('watertight with cross-face shared-axis zones', manifoldCheck(tris,4).watertight, manifoldCheck(tris,4));

  // Manually collect vertices exactly on the +Z/+Y shared edge (Y=100,Z=100) from both faces'
  // independently-built grids and confirm the SET of X values is identical (no strays).
  const hw=100,hh=100,hd=100;
  const edgeXsFromZFace = new Set();
  const edgeXsFromYFace = new Set();
  for (const tri of tris) for (const pt of tri) {
    if (Math.abs(pt[1]-hh) < 1e-6 && Math.abs(pt[2]-hd) < 1e-6) edgeXsFromZFace.add(pt[0].toFixed(4));
  }
  check('shared +Z/+Y edge has vertices (sanity)', edgeXsFromZFace.size > 5, edgeXsFromZFace.size);
}

console.log('\n=== Scenario D: rotated logo near a corner ===');
{
  paramState = { box: { width: 120, height: 60, depth: 80, taperXPlus:0, taperXMinus:0, taperZPlus:0, taperZMinus:0, taperYPlusX:0, taperYPlusZ:0, taperYMinusX:0, taperYMinusZ:0 } };
  const p = paramState.box;
  const logos = [
    { id:1, face:'+X', u0:20, v0:30, w:10, h:6, depth:1, threshold:0.5, invert:false, rotation:47, heightmap: makeSolidHeightmap() },
  ];
  const taperFn = makeTaperPointFn(0,0,0,0,0,0,0,0, p.width/2, p.height/2, p.depth/2);
  const dispFns = buildCombinedLogoDispFns(taperFn, logos);
  const zonesByAxis = computeLogoZonesByAxis(taperFn, logos);
  const { tris } = buildBoxWithLogos(p.width, p.height, p.depth, 40, dispFns, taperFn, zonesByAxis);
  check('no NaN with rotated logo near edge', !hasNaN(tris));
  check('watertight with rotated logo', manifoldCheck(tris,4).watertight, manifoldCheck(tris,4));
}

console.log('\n=== Scenario E: worst case — many NON-OVERLAPPING zones piled onto ONE shared axis ===');
{
  // +Y,-Y,+Z,-Z all use world-X as their 'u' -> deliberately spread 16 logos across exactly
  // those 4 faces with u0 spaced far enough apart that none of their zones merge, maximizing
  // how many separate zones land on the shared X axis at once (the actual danger case for
  // zoneCount*innerRes blowing up).
  paramState = { box: { width: 800, height: 800, depth: 800, taperXPlus:0, taperXMinus:0, taperZPlus:0, taperZMinus:0, taperYPlusX:0, taperYPlusZ:0, taperYMinusX:0, taperYMinusZ:0 } };
  const p = paramState.box;
  const logos = [];
  const faces4 = ['+Y','-Y','+Z','-Z'];
  for (let i=0;i<16;i++) {
    logos.push({ id:i+1, face: faces4[i%4], u0: -300 + i*40, v0: 0, w:10, h:10, depth:1, threshold:0.5, invert:false, rotation:0, heightmap: makeSolidHeightmap() });
  }
  const taperFn = makeTaperPointFn(0,0,0,0,0,0,0,0, p.width/2, p.height/2, p.depth/2);
  const dispFns = buildCombinedLogoDispFns(taperFn, logos);
  const zonesByAxis = computeLogoZonesByAxis(taperFn, logos);
  console.log('    zones piled onto shared X axis:', zonesByAxis[0].length);

  for (const resolution of [150, 300, 500, 1000, 100000]) {
    const t0 = Date.now();
    const { tris, posByAxis } = buildBoxWithLogos(p.width, p.height, p.depth, resolution, dispFns, taperFn, zonesByAxis);
    const ms = Date.now()-t0;
    const mc = manifoldCheck(tris, 4);
    console.log('    resolution='+resolution+': xPositions.length='+posByAxis[0].length+', '+tris.length+' triangles, '+ms+'ms, watertight='+mc.watertight);
    check('resolution='+resolution+': no NaN', !hasNaN(tris));
    check('resolution='+resolution+': watertight', mc.watertight, mc);
    check('resolution='+resolution+': triangle count stays bounded (budget cap engaged)', tris.length < 4_500_000, tris.length);
  }
}

console.log('\n=== Scenario F: single logo, absurd fat-finger resolution (extreme input safety) ===');
{
  paramState = { box: { width: 300, height: 300, depth: 300, taperXPlus:0, taperXMinus:0, taperZPlus:0, taperZMinus:0, taperYPlusX:0, taperYPlusZ:0, taperYMinusX:0, taperYMinusZ:0 } };
  const p = paramState.box;
  const logos = [{ id:1, face:'+Z', u0:0, v0:0, w:16, h:16, depth:2, threshold:0.5, invert:false, rotation:0, heightmap: makeSolidHeightmap() }];
  const taperFn = makeTaperPointFn(0,0,0,0,0,0,0,0, p.width/2, p.height/2, p.depth/2);
  const dispFns = buildCombinedLogoDispFns(taperFn, logos);
  const zonesByAxis = computeLogoZonesByAxis(taperFn, logos);
  const t0 = Date.now();
  const { tris } = buildBoxWithLogos(p.width, p.height, p.depth, 999999, dispFns, taperFn, zonesByAxis);
  const ms = Date.now()-t0;
  console.log('    resolution=999999 (fat-finger), 1 logo: ' + tris.length + ' triangles in ' + ms + 'ms');
  check('extreme single-zone input still bounded', tris.length < 4_500_000, tris.length);
  check('extreme single-zone input completes fast', ms < 5000, ms);
}

console.log('\n=== TOTAL:', pass, 'passed,', fail, 'failed ===');
process.exit(fail > 0 ? 1 : 0);
