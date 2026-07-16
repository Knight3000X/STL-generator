// SVG-contour hole («импорт произвольной 2D-формы для выреза»): the imported SVG becomes a polar
// radius table r(θ) that the block→annulus→bore machinery cuts exactly like a circle — just with a
// per-angle radius. Node has no SVG rasteriser, so these tests feed SYNTHETIC tables (a 5-lobe star,
// an egg) through the same hole fields the UI loader fills in. Run via ./run-all.sh.

let pass = 0, fail = 0;
function check(name, cond, extra) {
  if (cond) { pass++; console.log('  OK  ', name); }
  else { fail++; console.log('  FAIL', name, extra!==undefined?JSON.stringify(extra):''); }
}
function sv(t){let v=0;for(const T of t){const a=T[0],b=T[1],c=T[2];v+=(a[0]*(b[1]*c[2]-b[2]*c[1])-a[1]*(b[0]*c[2]-b[2]*c[0])+a[2]*(b[0]*c[1]-b[1]*c[0]))/6;}return v;}
// synthetic unit tables + their extents/area, mirroring loadSvgHoleFile's outputs
function mkTable(fn){
  const M=360, r=[]; for(let a=0;a<M;a++) r.push(fn(a*2*Math.PI/M));
  const mx=Math.max(...r), unit=r.map(v=>Math.max(0.02, v/mx));
  let apU=0,aqU=0,area=0;
  for(let a=0;a<M;a++){ const th=a*2*Math.PI/M;
    apU=Math.max(apU,Math.abs(unit[a]*Math.cos(th))); aqU=Math.max(aqU,Math.abs(unit[a]*Math.sin(th)));
    area += 0.5*unit[a]*unit[(a+1)%M]*Math.sin(2*Math.PI/M); }
  return { unit, apU, aqU, area };
}
const star = mkTable(th => 0.65 + 0.35*Math.cos(5*th));   // 5-lobe star (star-shaped domain)
const egg  = mkTable(th => 1/(1+0.3*Math.cos(th)));       // off-centre oval
function setBox(over){
  logos.length = 0;
  Object.assign(paramState.box, {
    width:80, height:60, depth:20, hollow:false, rim:false, wallThickness:2.5,
    divX:1, divZ:1, stackFeet:false, squircle:0, squircleVBot:0, latticeFloor:false,
    filletRadius:0, filletTop:0, filletBottom:0, filletVert:0,
    taperXPlus:0,taperXMinus:0,taperZPlus:0,taperZMinus:0,taperYPlusX:0,taperYPlusZ:0,taperYMinusX:0,taperYMinusZ:0,
    bulgeXPlus:0,bulgeXMinus:0,bulgeZPlus:0,bulgeZMinus:0,bulgeYPlus:0,bulgeYMinus:0,
    chamferTop:0, hingeRole:undefined, logo3d:false,
  }, over);
}
const mkHole = (tbl, over) => Object.assign({ id:1, face:'+Z', u0:0, v0:0, shape:'svg',
  svgWidth:24, svgRU:tbl.unit, svgApU_img:tbl.apU, svgAqU_img:tbl.aqU }, over);

console.log('=== 5-lobe star cut through a solid plate ===');
{
  setBox({});
  boxHoles.length = 0;
  const solid = sv(buildTrisForShape('box', paramState.box));
  boxHoles.push(mkHole(star));
  const tris = buildTrisForShape('box', paramState.box);
  const mc = manifoldCheck(tris, 4);
  check('star: watertight', mc.watertight, mc);
  // cut volume = polygon area × depth: scale = (24/2)/apU
  const s = 12/star.apU, expect = star.area*s*s*20;
  const cut = solid - sv(tris);
  check('star: cut ≈ polar-polygon area × depth', Math.abs(cut - expect) < 0.06*expect,
    {cut:+cut.toFixed(0), expect:+expect.toFixed(0)});
  // scale honoured: the cut RING's x-extent must match the table's own x-extent × scale. (The bore
  // tube is one ruled span, so its vertices sit exactly ON the faces — select them by radius.)
  const M = star.unit.length;
  let uxMax=-1e9, uxMin=1e9;
  for (let a=0;a<M;a++){ const x=star.unit[a]*Math.cos(a*2*Math.PI/M); uxMax=Math.max(uxMax,x); uxMin=Math.min(uxMin,x); }
  const expectW = (uxMax - uxMin) * s;
  let mn=1e9, mx=-1e9;
  for (const tr of tris) for (const pnt of tr)
    if (Math.hypot(pnt[0], pnt[1]) <= 12*1.05) { mn=Math.min(mn,pnt[0]); mx=Math.max(mx,pnt[0]); }
  check('star: ring x-extent matches table × scale', Math.abs((mx-mn) - expectW) < 0.4,
    {got:+(mx-mn).toFixed(2), expect:+expectW.toFixed(2)});
}

console.log('\n=== Egg contour, off-centre + on a side wall (±X: vertical p-axis remap) ===');
{
  setBox({});
  boxHoles.length = 0;
  boxHoles.push(mkHole(egg, { u0:10, v0:-8 }));
  const mc1 = manifoldCheck(buildTrisForShape('box', paramState.box), 4);
  check('egg off-centre: watertight', mc1.watertight, mc1);
  boxHoles.length = 0;
  boxHoles.push(mkHole(egg, { face:'+X', svgWidth:12 }));
  setBox({ depth:60, width:20 });
  const tris = buildTrisForShape('box', paramState.box);
  const mc2 = manifoldCheck(tris, 4);
  check('egg on +X wall: watertight', mc2.watertight, mc2);
  // upright remap: the shape's HORIZONTAL extent must land along world Z on the ±X wall — the
  // ring's z-extent must equal the table's x-extent × scale (12/2 / apU).
  const M2 = egg.unit.length; let exMax=-1e9, exMin=1e9;
  for (let a=0;a<M2;a++){ const x=egg.unit[a]*Math.cos(a*2*Math.PI/M2); exMax=Math.max(exMax,x); exMin=Math.min(exMin,x); }
  const s2 = 6/egg.apU, expectZ = (exMax - exMin) * s2;
  let mnZ=1e9, mxZ=-1e9;
  for (const tr of tris) for (const pnt of tr)
    if (Math.hypot(pnt[1], pnt[2]) <= 6/egg.apU*1.05*Math.max(...egg.unit)) { mnZ=Math.min(mnZ,pnt[2]); mxZ=Math.max(mxZ,pnt[2]); }
  check('egg on +X: horizontal extent lies along Z', Math.abs((mxZ-mnZ) - expectZ) < 0.4,
    {got:+(mxZ-mnZ).toFixed(2), expect:+expectZ.toFixed(2)});
}

console.log('\n=== SVG hole + grid pattern; missing contour builds nothing ===');
{
  setBox({});
  boxHoles.length = 0;
  boxHoles.push(mkHole(star, { svgWidth:14, pattern:'grid', gridNU:2, gridNV:1, gridPU:34, gridPV:20 }));
  const holes = holesForBuilder(paramState.box);
  check('pattern expands the SVG hole', holes.length === 2, holes.length);
  const mc = manifoldCheck(buildTrisForShape('box', paramState.box), 4);
  check('star pattern: watertight', mc.watertight, mc);
  boxHoles.length = 0;
  boxHoles.push({ id:1, face:'+Z', u0:0, v0:0, shape:'svg', svgWidth:20 }); // no contour loaded yet
  check('no contour -> hole ignored', holesForBuilder(paramState.box).length === 0);
  check('no contour -> plain solid box, watertight', manifoldCheck(buildTrisForShape('box', paramState.box),4).watertight);
}

console.log('\n=== clampHoleToFace keeps an oversized SVG inside the face ===');
{
  setBox({});
  boxHoles.length = 0;
  const h = mkHole(star, { svgWidth: 500, u0: 30, v0: 25 });
  boxHoles.push(h);
  clampHoleToFace(h);
  check('width clamped to fit the face', h.svgWidth < 80, {w:h.svgWidth});
  const mc = manifoldCheck(buildTrisForShape('box', paramState.box), 4);
  check('clamped oversized SVG still watertight', mc.watertight, mc);
}

boxHoles.length = 0;
console.log(`\n=== TOTAL: ${pass} passed, ${fail} failed ===`);
process.exit(fail ? 1 : 0);
