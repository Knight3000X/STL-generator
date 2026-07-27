// Model slicer: cut a finished mesh into a grid of watertight fragments no larger than a chosen size
// per axis (for splitting a print that doesn't fit the bed). Exercises the REAL in-page
// sliceMeshIntoFragments + the frozen-mesh round-trip through buildTrisForShape + sliceActiveModel's
// model bookkeeping. Each fragment must be watertight, fragments must reassemble to the original volume,
// and the cut must actually produce the expected number of pieces. Run via ./run-all.sh (extraction test).

let pass=0, fail=0;
function chk(name,cond,extra){ if(cond){pass++;console.log('  OK  ',name);} else {fail++;console.log('  FAIL',name, extra!==undefined?JSON.stringify(extra):'');} }
function vol(t){let v=0;for(const T of t){const a=T[0],b=T[1],c=T[2];v+=(a[0]*(b[1]*c[2]-b[2]*c[1])-a[1]*(b[0]*c[2]-b[2]*c[0])+a[2]*(b[0]*c[1]-b[1]*c[0]))/6;}return v;}
function hasNaN(t){for(const tr of t)for(const p of tr)for(const c of p)if(!Number.isFinite(c))return true;return false;}
function bbox(t){const lo=[1e9,1e9,1e9],hi=[-1e9,-1e9,-1e9];for(const tr of t)for(const p of tr)for(let a=0;a<3;a++){lo[a]=Math.min(lo[a],p[a]);hi[a]=Math.max(hi[a],p[a]);}return{lo,hi};}
function build(ov){
  logos.length=0; boxHoles.length=0;
  Object.assign(paramState.box,{ width:80,height:60,depth:70,hollow:false,rim:false,wallThickness:3,
    latticeFloor:false,latticeWalls:'none',squircle:0,squircleVBot:0,gfOn:false,scoopDir:'none',labelTab:'none',
    mountHoles:'none',gripWall:'none',divX:1,divZ:1,stackFeet:false,frozenId:undefined,filletRadius:0,filletTop:0,filletBottom:0,
    filletVert:0,filletInnerFloor:0,filletInnerVert:0,filletInnerLip:0,chamferTop:0,hingeRole:undefined,logo3d:false,fragSize:180,
    taperXPlus:0,taperXMinus:0,taperZPlus:0,taperZMinus:0,taperYPlusX:0,taperYPlusZ:0,taperYMinusX:0,taperYMinusZ:0,
    bulgeXPlus:0,bulgeXMinus:0,bulgeZPlus:0,bulgeZMinus:0,bulgeYPlus:0,bulgeYMinus:0 }, ov);
  return buildTrisForShape('box', paramState.box);
}
function slice(name, tris, sx,sy,sz, expFrags){
  const orig=vol(tris);
  const { frags } = sliceMeshIntoFragments(tris, sx,sy,sz);
  let allWT=true, worst=null, sum=0, nan=false;
  for(const f of frags){ const mc=manifoldCheck(f.tris,4); if(!mc.watertight){allWT=false; if(!worst)worst=mc;} if(hasNaN(f.tris))nan=true; sum+=vol(f.tris); }
  chk(`${name}: ${frags.length} frags all watertight`, allWT && !nan, worst);
  chk(`${name}: fragment volume sum == original`, Math.abs(sum-orig) < Math.abs(orig)*0.02+1, {orig:+orig.toFixed(1), sum:+sum.toFixed(1)});
  if(expFrags!=null) chk(`${name}: ${expFrags} fragments`, frags.length===expFrags, {got:frags.length});
  // no fragment exceeds the requested size (+ small clip tolerance) on any axis
  let sizeOK=true; for(const f of frags){ const b=f.bb; if(b.hi[0]-b.lo[0] > sx+0.01 || b.hi[1]-b.lo[1] > sy+0.01 || b.hi[2]-b.lo[2] > sz+0.01) sizeOK=false; }
  chk(`${name}: no fragment exceeds the size`, sizeOK);
  return frags;
}

console.log('=== solid box 80x60x70 across sizes ===');
slice('solid /40', build({}), 40,40,40, 2*2*2);
slice('solid /30', build({}), 30,30,30, 3*2*3);
slice('solid /25', build({}), 25,25,25, null);
slice('solid /100 (fits, no cut)', build({}), 100,100,100, 1);
slice('solid /35 X-only', build({}), 35,999,999, 3);
slice('solid /35 Z-only', build({}), 999,999,35, 2);

console.log('=== hollow container (annulus cross-sections → capped with holes) ===');
slice('hollow /40', build({hollow:true, wallThickness:3}), 40,40,40, null);
slice('hollow /30', build({hollow:true, wallThickness:4}), 30,30,30, null);
slice('hollow tall 40x90x40 /25', build({hollow:true, width:40,height:90,depth:40, wallThickness:3}), 25,25,25, null);

console.log('=== rounded / squircle (curved cross-sections) ===');
slice('squircle /35', build({hollow:true, squircle:60, wallThickness:3}), 35,35,35, null);
slice('fillet /35',  build({hollow:true, filletRadius:8, wallThickness:3}), 35,35,35, null);
slice('solid fillet /40', build({filletRadius:6}), 40,40,40, null);

console.log('=== tapered walls ===');
slice('taper /40', build({taperXPlus:10, taperZMinus:8}), 40,40,40, null);

console.log('=== frozen fragment round-trips through buildTrisForShape ===');
{
  const frags = sliceMeshIntoFragments(build({}), 40,40,40).frags;
  const id = nextFrozenId++; frozenMeshes.set(id, frags[0].tris);
  chk('frozen mesh returned verbatim by buildTrisForShape', buildTrisForShape('box', {frozenId:id}) === frags[0].tris);
  chk('frozen mesh watertight', manifoldCheck(buildTrisForShape('box', {frozenId:id}), 4).watertight);
}

console.log('=== sliceActiveModel creates fragment models ===');
{
  models.length = 0; activeModelId = null; nextModelId = 1;
  models.push(makeModelRecord('Деталь', defaultBoxParams()));
  activeModelId = models[0].id;
  Object.assign(paramState.box, defaultBoxParams(), { width:80, height:60, depth:70, hollow:false, fragSize:40 });
  saveActiveModel(); regenerate();
  const before = models.length;
  sliceActiveModel();
  chk('active model split into 8 fragment models', models.length === before - 1 + 8, {before, after:models.length});
  chk('every fragment model carries a frozenId', models.every(m => m.params.frozenId != null));
  chk('every fragment model mesh watertight', models.every(m => manifoldCheck(m.rawTris, 4).watertight));
  // slicing when the model already fits does nothing (no split)
  Object.assign(paramState.box, { fragSize: 500 }); saveActiveModel();
  const n2 = models.length; sliceActiveModel();
  chk('no split when the model already fits', models.length === n2);
}

/* ============================================================================================
   REGISTRATION PINS. A cut leaves two flat faces that slide freely against each other; the low
   side gets a dowel, the high side a matching blind socket. The dowel is added by interpenetration
   (a closed cylinder), the socket by boring a hole through the cap triangulation — the only way to
   remove material here, since there is no CSG engine. Both must leave every fragment watertight.
   ============================================================================================ */
console.log('=== registration pins on the cut face ===');
const SEG = 28;                       // PIN_SEG inside the slicer
const RING = SEG, DISC = SEG + 1;     // verts on a bare ring / on a fan disc (ring + centre)
// Unique vertices lying exactly on plane `axis == c` — used to count pin tops / socket floors,
// each of which is a fan disc and so contributes exactly DISC unique points.
function vertsOnPlane(tris, axis, c, eps){
  const s=new Set();
  for(const T of tris) for(const p of T) if(Math.abs(p[axis]-c) < (eps||1e-6))
    s.add(p.map(x=>Math.round(x*1e4)).join(','));
  return [...s].map(k=>k.split(',').map(x=>+x/1e4));
}
function radiusAbout(pts, axis, ctr){
  const u=(axis===0)?1:0, v=(axis===2)?1:2; let mx=0;
  for(const p of pts){ const d=Math.hypot(p[u]-ctr[0], p[v]-ctr[1]); if(d>mx) mx=d; }
  return mx;
}
function centroid2(pts, axis){
  const u=(axis===0)?1:0, v=(axis===2)?1:2; let su=0, sv=0;
  for(const p of pts){ su+=p[u]; sv+=p[v]; }
  return [su/pts.length, sv/pts.length];
}
{
  const tris = build({});                                  // 80×60×70 solid, so the cut is at x=0
  const cfg  = {dia:5, len:6, n:2, clear:0.2};
  const pinR = cfg.dia/2, sockR = pinR + cfg.clear;
  const plain  = sliceMeshIntoFragments(tris, 40, 999, 999).frags;
  const pinned = sliceMeshIntoFragments(tris, 40, 999, 999, cfg).frags;
  chk('pins: same fragment count as an unpinned cut', pinned.length === plain.length && pinned.length === 2,
      {plain:plain.length, pinned:pinned.length});
  let wt=true, worst=null;
  for(const f of pinned){ const mc=manifoldCheck(f.tris,4); if(!mc.watertight){ wt=false; worst=worst||mc; } }
  chk('pins: every fragment still watertight', wt, worst);
  chk('pins: no NaN', !pinned.some(f=>hasNaN(f.tris)));

  const low  = pinned.find(f => f.bb.lo[0] < -1), high = pinned.find(f => f.bb.lo[0] > -1);
  const lowP = plain .find(f => f.bb.lo[0] < -1), highP= plain .find(f => f.bb.lo[0] > -1);
  chk('pins: dowels stand proud of the cut plane', low.bb.hi[0] > 0 + (cfg.len-0.6) - 1e-6,
      {hi:+low.bb.hi[0].toFixed(3), want:cfg.len-0.6});
  chk('pins: the high side stops AT the cut plane (socket is a blind bore, not a boss)',
      Math.abs(high.bb.lo[0]) < 1e-6, {lo:high.bb.lo[0]});

  // Each pin top and each socket floor is one fan disc → exactly DISC unique vertices per pin.
  const tops  = vertsOnPlane(low.tris,  0, cfg.len-0.6);
  const floors= vertsOnPlane(high.tris, 0, cfg.len);
  chk('pins: 2 dowel tops built',   tops.length   === 2*DISC, {got:tops.length,   want:2*DISC});
  chk('pins: 2 socket floors built',floors.length === 2*DISC, {got:floors.length, want:2*DISC});

  // Dowel Ø and socket Ø, measured off the built mesh — their difference IS the fit clearance.
  const halfT = tops.filter(p => p[2] < 0), halfF = floors.filter(p => p[2] < 0);
  const rT = radiusAbout(halfT, 0, centroid2(halfT, 0)), rF = radiusAbout(halfF, 0, centroid2(halfF, 0));
  chk('pins: dowel radius == dia/2',  Math.abs(rT - pinR)  < 1e-3, {rT:+rT.toFixed(4), want:pinR});
  chk('pins: socket radius == dowel + clearance', Math.abs(rF - sockR) < 1e-3, {rF:+rF.toFixed(4), want:sockR});

  // Material bookkeeping: the low side GAINED the dowels, the high side LOST the bores.
  const dLow = vol(low.tris) - vol(lowP.tris), dHigh = vol(high.tris) - vol(highP.tris);
  const wantLow  =  2 * Math.PI*pinR*pinR  * (cfg.len - 0.6 + 1.0);
  const wantHigh = -2 * Math.PI*sockR*sockR * cfg.len;
  chk('pins: low side gained 2 dowel volumes',  Math.abs(dLow  - wantLow ) < Math.abs(wantLow )*0.05,
      {got:+dLow.toFixed(2),  want:+wantLow.toFixed(2)});
  chk('pins: high side lost 2 socket volumes',  Math.abs(dHigh - wantHigh) < Math.abs(wantHigh)*0.05,
      {got:+dHigh.toFixed(2), want:+wantHigh.toFixed(2)});
  chk('pins: dowels fit their sockets with room to spare', wantLow < -wantHigh);
}

// Spot selection has to REFUSE where the geometry can't carry a pin: too thin, or too close to a
// section edge. Both are silent skips, not failures — the cut still happens, just without pins.
{
  const cfg = {dia:5, len:6, n:2, clear:0.2};
  // 3 mm walls: a 6 mm deep bore would burst straight out the back, so no pin may be placed.
  const thin = sliceMeshIntoFragments(build({hollow:true, wallThickness:3}), 40, 999, 999, cfg).frags;
  let wt=true; for(const f of thin) if(!manifoldCheck(f.tris,4).watertight) wt=false;
  chk('thin walls: fragments watertight', wt);
  const lowT = thin.find(f => f.bb.lo[0] < -1);
  chk('thin walls: no dowel placed (nothing to bore into)', lowT.bb.hi[0] < 1e-6, {hi:lowT.bb.hi[0]});
  // A dowel bigger than the section it sits on can't clear the edges either.
  const huge = sliceMeshIntoFragments(build({width:80,height:14,depth:14}), 40, 999, 999,
                                      {dia:12, len:6, n:2, clear:0.2}).frags;
  let wt2=true; for(const f of huge) if(!manifoldCheck(f.tris,4).watertight) wt2=false;
  chk('oversized dowel: fragments watertight', wt2);
  chk('oversized dowel: refused on a 14×14 section',
      huge.find(f=>f.bb.lo[0] < -1).bb.hi[0] < 1e-6);
}

// Pins must survive the full 3-axis pipeline, and must never be sawn in half by a LATER cut.
{
  const cfg = {dia:4, len:5, n:2, clear:0.2};
  for(const [nm, sz] of [['/40',40],['/30',30],['/25',25]]){
    const frags = sliceMeshIntoFragments(build({}), sz,sz,sz, cfg).frags;
    let wt=true, worst=null, proud=0;
    for(const f of frags){ const mc=manifoldCheck(f.tris,4); if(!mc.watertight){ wt=false; worst=worst||mc; } }
    // a dowel shows up as a fan disc floating one pin-length off a cell boundary; just confirm
    // SOME fragment grew past a plain cut's cell in at least one axis
    const plain = sliceMeshIntoFragments(build({}), sz,sz,sz).frags;
    const span = (l)=>l.reduce((m,f)=>Math.max(m, f.bb.hi[0]-f.bb.lo[0], f.bb.hi[1]-f.bb.lo[1], f.bb.hi[2]-f.bb.lo[2]), 0);
    proud = span(frags) - span(plain);
    chk(`3-axis ${nm}: every fragment watertight`, wt, worst);
    chk(`3-axis ${nm}: dowels present`, proud > cfg.len - 1.1, {proud:+proud.toFixed(2)});
    chk(`3-axis ${nm}: fragment count unchanged`, frags.length === plain.length, {a:frags.length, b:plain.length});
  }
}

// Curved and holed sections: the cap is no longer a rectangle, so spot rejection near the edges
// and the two-loop (outer + cavity) case both get exercised.
{
  const cfg = {dia:5, len:5, n:2, clear:0.25};
  const cases = [
    ['squircle',   build({squircle:60})],
    ['fillet',     build({filletRadius:8})],
    ['taper',      build({taperXPlus:10, taperZMinus:8})],
    ['thick hollow', build({hollow:true, wallThickness:12})],
  ];
  for(const [nm, t] of cases){
    const frags = sliceMeshIntoFragments(t, 35,35,35, cfg).frags;
    let wt=true, worst=null, nan=false, sum=0;
    for(const f of frags){ const mc=manifoldCheck(f.tris,4); if(!mc.watertight){ wt=false; worst=worst||mc; }
      if(hasNaN(f.tris)) nan=true; sum+=vol(f.tris); }
    chk(`${nm} + pins: all fragments watertight`, wt && !nan, worst);
    chk(`${nm} + pins: volume within 6% of the original`, Math.abs(sum-vol(t)) < Math.abs(vol(t))*0.06,
        {orig:+vol(t).toFixed(0), sum:+sum.toFixed(0)});
  }
}

// Pin count and clearance are parameters, so sweep them.
{
  const base = build({});
  for(const n of [1,2,3,4]){
    const frags = sliceMeshIntoFragments(base, 40,999,999, {dia:5,len:6,n,clear:0.2}).frags;
    const low = frags.find(f=>f.bb.lo[0] < -1);
    chk(`n=${n}: exactly ${n} dowel(s)`, vertsOnPlane(low.tris,0,5.4).length === n*DISC,
        {got:vertsOnPlane(low.tris,0,5.4).length/DISC});
    chk(`n=${n}: watertight`, frags.every(f=>manifoldCheck(f.tris,4).watertight));
  }
  for(const clear of [0, 0.15, 0.4, 0.8]){
    const frags = sliceMeshIntoFragments(base, 40,999,999, {dia:6,len:5,n:2,clear}).frags;
    const high = frags.find(f=>f.bb.lo[0] > -1);
    const fl = vertsOnPlane(high.tris,0,5).filter(p=>p[2]<0);
    const r = radiusAbout(fl, 0, centroid2(fl,0));
    chk(`clear=${clear}: socket radius == 3 + ${clear}`, Math.abs(r - (3+clear)) < 1e-3, {r:+r.toFixed(4)});
    chk(`clear=${clear}: watertight`, frags.every(f=>manifoldCheck(f.tris,4).watertight));
  }
  for(const dia of [2,3,8,12,20]){
    const frags = sliceMeshIntoFragments(base, 40,999,999, {dia,len:6,n:2,clear:0.2}).frags;
    chk(`dia=${dia}: watertight`, frags.every(f=>manifoldCheck(f.tris,4).watertight));
  }
  for(const len of [2,4,10,20,30]){
    const frags = sliceMeshIntoFragments(base, 40,999,999, {dia:5,len,n:2,clear:0.2}).frags;
    chk(`len=${len}: watertight`, frags.every(f=>manifoldCheck(f.tris,4).watertight));
    const low = frags.find(f=>f.bb.lo[0] < -1);
    // len 30 needs 31.2 mm of stock behind the face but only 40 is there — still fine; len must
    // always show up as protrusion len-0.6 when it was accepted at all
    const proud = low.bb.hi[0];
    chk(`len=${len}: protrusion is len-0.6 or no pin`, Math.abs(proud-(len-0.6))<1e-6 || proud<1e-6, {proud});
  }
}

// sliceActiveModel must pick the pin settings up from paramState (fragPins default = on).
{
  models.length = 0; activeModelId = null; nextModelId = 1;
  models.push(makeModelRecord('Деталь', defaultBoxParams()));
  activeModelId = models[0].id;
  Object.assign(paramState.box, defaultBoxParams(), { width:80, height:60, depth:70, fragSize:40 });
  saveActiveModel(); regenerate();
  sliceActiveModel();
  chk('UI path: all fragment models watertight with pins on',
      models.every(m => manifoldCheck(m.rawTris, 4).watertight));
  const grew = models.some(m => { const b=bbox(m.rawTris); return (b.hi[0]-b.lo[0]) > 40.001; });
  chk('UI path: fragPins default put dowels on the cuts', grew);

  models.length = 0; activeModelId = null; nextModelId = 1;
  models.push(makeModelRecord('Деталь', defaultBoxParams()));
  activeModelId = models[0].id;
  Object.assign(paramState.box, defaultBoxParams(), { width:80, height:60, depth:70, fragSize:40, fragPins:false });
  saveActiveModel(); regenerate();
  sliceActiveModel();
  chk('UI path: fragPins off → no fragment exceeds the cell',
      models.every(m => { const b=bbox(m.rawTris); return (b.hi[0]-b.lo[0]) <= 40.001; }));
}

/* ============================================================================================
   T-JUNCTIONS ON CURVED CROSS-SECTIONS. A squircle's silhouette puts contour vertices a hair off
   collinear (y = 3e-8 rather than 0). With the containment tolerance stated as an AREA, an ear
   spanning 12 mm looked legal at that offset, got clipped, and swallowed the vertex — the cap then
   had one long edge where the side surface had two, and the fragment was open. Stating the tolerance
   as a DISTANCE fixes it; keeping sliver triangles through the weld (rather than discarding them and
   orphaning their edges) is the other half. Sweep sizes, since which vertices land near a cut plane
   changes with every one of them.
   ============================================================================================ */
console.log('=== curved cross-sections across cut sizes ===');
{
  const shapes = [
    ['solid squircle',  build({squircle:60})],
    ['squircle+fillet', build({squircle:60, filletRadius:6})],
    ['squircle vbot',   build({squircle:60, squircleVBot:40})],
    ['fillet',          build({filletRadius:8})],
    ['taper',           build({taperXPlus:10, taperZMinus:8})],
  ];
  const broken = (frags) => frags.reduce((n,f)=>n+(manifoldCheck(f.tris,4).watertight?0:1), 0);
  for(const [nm, t] of shapes){
    let worst = null;
    for(const s of [40,35,30,25]){
      const b = broken(sliceMeshIntoFragments(t, s,s,s).frags);
      if(b) worst = worst || {s, b};
    }
    chk(`${nm}: watertight at every cut size`, !worst, worst);
  }
  // ...and pins must never turn a clean cut into a broken one, on ANY of them.
  for(const [nm, t] of shapes){
    let regressed = null;
    for(const s of [40,35,30,25,20]){
      const plain = broken(sliceMeshIntoFragments(t, s,s,s).frags);
      const pinned= broken(sliceMeshIntoFragments(t, s,s,s, {dia:5,len:5,n:2,clear:0.25}).frags);
      if(pinned > plain) regressed = regressed || {s, plain, pinned};
    }
    chk(`${nm}: pins never make a cut worse`, !regressed, regressed);
  }
}
// Two squircle cases are still not sound at the finest cut sizes (see IDEAS.md). Pin them down here,
// asserting they ARE still broken, so the day someone fixes them this test says so out loud instead of
// staying quietly wrong. The tolerance sweep says it isn't the same near-collinear cause: widening the
// containment tolerance to 1e-5 or 1e-4 mm doesn't touch them.
{
  const broken = (f) => f.reduce((n,x)=>n+(manifoldCheck(x.tris,4).watertight?0:1), 0);
  const hollow = build({hollow:true, wallThickness:3, squircle:60});
  chk('hollow squircle: coarse cut is clean', broken(sliceMeshIntoFragments(hollow, 40,40,40).frags) === 0);
  const fine = broken(sliceMeshIntoFragments(hollow, 25,25,25).frags);
  chk('hollow squircle: fine cut still KNOWN-BROKEN (update this when fixed)', fine > 0, {fine});
  chk('hollow squircle: pins do not add to the damage',
      broken(sliceMeshIntoFragments(hollow, 25,25,25, {dia:5,len:5,n:2,clear:0.25}).frags) <= fine);
  const vbot = build({squircle:60, squircleVBot:40});
  const v20 = broken(sliceMeshIntoFragments(vbot, 20,20,20).frags);
  chk('squircle vbot /20 still KNOWN-BROKEN (update this when fixed)', v20 > 0, {v20});
  chk('squircle vbot /20: pins do not add to the damage',
      broken(sliceMeshIntoFragments(vbot, 20,20,20, {dia:5,len:5,n:2,clear:0.25}).frags) <= v20);
}

paramState.box.fragSize = 180;
console.log(`\n=== TOTAL: ${pass} passed, ${fail} failed ===`);
process.exit(fail ? 1 : 0);
