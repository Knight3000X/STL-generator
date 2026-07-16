// Hole patterns («массив отверстий», grid / around a circle) + connector presets. Patterns are
// expanded at builder level (expandHolePatterns): copies centred on the base hole, off-face and
// overlapping copies dropped, so the block-based hole builders always see disjoint in-face blocks.
// Run via ./run-all.sh (extraction test).

let pass = 0, fail = 0;
function check(name, cond, extra) {
  if (cond) { pass++; console.log('  OK  ', name); }
  else { fail++; console.log('  FAIL', name, extra!==undefined?JSON.stringify(extra):''); }
}
function sv(t){let v=0;for(const T of t){const a=T[0],b=T[1],c=T[2];v+=(a[0]*(b[1]*c[2]-b[2]*c[1])-a[1]*(b[0]*c[2]-b[2]*c[0])+a[2]*(b[0]*c[1]-b[1]*c[0]))/6;}return v;}
function setBox(over){
  logos.length = 0;
  Object.assign(paramState.box, {
    width:80, height:60, depth:70, hollow:false, rim:false, wallThickness:2.5,
    divX:1, divZ:1, stackFeet:false, squircle:0, squircleVBot:0, latticeFloor:false,
    filletRadius:0, filletTop:0, filletBottom:0, filletVert:0,
    taperXPlus:0,taperXMinus:0,taperZPlus:0,taperZMinus:0,taperYPlusX:0,taperYPlusZ:0,taperYMinusX:0,taperYMinusZ:0,
    bulgeXPlus:0,bulgeXMinus:0,bulgeZPlus:0,bulgeZMinus:0,bulgeYPlus:0,bulgeYMinus:0,
    chamferTop:0, hingeRole:undefined, logo3d:false,
  }, over);
}

console.log('=== Grid 3×2 of circles through a solid box ===');
{
  setBox({});
  boxHoles.length = 0;
  // NOTE pitch 20: buildBoxWithHoles drops any hole whose grid block touches another's (that's what
  // keeps the mesh watertight), so a pattern's pitch must exceed the block span (~1.7×Ø) plus a cell.
  boxHoles.push({ id:1, face:'+Z', u0:0, v0:0, shape:'circle', diameter:5, pattern:'grid', gridNU:3, gridNV:2, gridPU:20, gridPV:20 });
  const holes = holesForBuilder(paramState.box);
  check('grid expands to 6 copies', holes.length === 6, holes.length);
  const tris = buildTrisForShape('box', paramState.box);
  const mc = manifoldCheck(tris, 4);
  check('grid: watertight', mc.watertight, mc);
  boxHoles.length = 0;
  const solidV = sv(buildTrisForShape('box', paramState.box));
  boxHoles.push({ id:1, face:'+Z', u0:0, v0:0, shape:'circle', diameter:5 });
  const oneCut = solidV - sv(buildTrisForShape('box', paramState.box));
  boxHoles.length = 0;
  boxHoles.push({ id:1, face:'+Z', u0:0, v0:0, shape:'circle', diameter:5, pattern:'grid', gridNU:3, gridNV:2, gridPU:20, gridPV:20 });
  const cut = solidV - sv(buildTrisForShape('box', paramState.box));
  check('grid cuts ≈ 6× a single bore', Math.abs(cut - 6*oneCut) < 0.1*6*oneCut, {cut:+cut.toFixed(0), one:+oneCut.toFixed(0)});
}

console.log('\n=== Circle-of-8 pattern ===');
{
  setBox({});
  boxHoles.length = 0;
  boxHoles.push({ id:1, face:'+Z', u0:0, v0:0, shape:'circle', diameter:4, pattern:'circle', circN:8, circR:18 });
  const holes = holesForBuilder(paramState.box);
  check('circle pattern expands to 8 copies', holes.length === 8, holes.length);
  const R = Math.hypot(holes[0].cp, holes[0].cq);
  check('copies sit on the requested radius', Math.abs(R - 18) < 1e-9, {R});
  const mc = manifoldCheck(buildTrisForShape('box', paramState.box), 4);
  check('circle pattern: watertight', mc.watertight, mc);
}

console.log('\n=== Safety: off-face and overlapping copies are dropped ===');
{
  setBox({});
  boxHoles.length = 0;
  // pitch smaller than the block -> only non-overlapping survivors
  boxHoles.push({ id:1, face:'+Z', u0:0, v0:0, shape:'circle', diameter:8, pattern:'grid', gridNU:4, gridNV:1, gridPU:5, gridPV:5 });
  const tight = holesForBuilder(paramState.box);
  check('overlapping grid copies dropped', tight.length < 4 && tight.length >= 1, tight.length);
  boxHoles.length = 0;
  // huge radius -> every copy off the face
  boxHoles.push({ id:1, face:'+Z', u0:0, v0:0, shape:'circle', diameter:5, pattern:'circle', circN:6, circR:200 });
  check('off-face copies dropped', holesForBuilder(paramState.box).length === 0, holesForBuilder(paramState.box).length);
  const mc = manifoldCheck(buildTrisForShape('box', paramState.box), 4);
  check('empty pattern: plain box, watertight', mc.watertight, mc);
}

console.log('\n=== Pattern of USB-C ports on a hollow container wall ===');
{
  setBox({ hollow:true });
  boxHoles.length = 0;
  boxHoles.push({ id:1, face:'+Z', u0:0, v0:0, shape:'rrect', portW:9, portH:3.2, cornerR:1.6, pattern:'grid', gridNU:2, gridNV:1, gridPU:25, gridPV:10 });
  const ports = portsForBuilder(paramState.box);
  check('2 ports expanded', ports.length === 2, ports.length);
  const mc = manifoldCheck(buildTrisForShape('box', paramState.box), 4);
  check('hollow + port pattern: watertight', mc.watertight, mc);
}

console.log('\n=== Connector presets carry sane cutouts ===');
{
  check('presets exist', Object.keys(HOLE_PRESETS).length >= 8, Object.keys(HOLE_PRESETS).length);
  for (const k in HOLE_PRESETS) {
    const ps = HOLE_PRESETS[k];
    const ok = ps.shape === 'circle' ? (ps.d >= 3 && ps.d <= 12)
      : (ps.w > ps.h && ps.w >= 6 && ps.w <= 30 && ps.h >= 1 && ps.h <= 8 && ps.r <= ps.h/2 + 1e-9);
    check(`preset ${ps.label}: sane dims`, ok, ps);
  }
  // a preset actually builds: SD card slot through a solid box
  setBox({});
  boxHoles.length = 0;
  const ps = HOLE_PRESETS['sd'];
  boxHoles.push({ id:1, face:'+Z', u0:0, v0:0, shape:ps.shape, portW:ps.w, portH:ps.h, cornerR:ps.r });
  const mc = manifoldCheck(buildTrisForShape('box', paramState.box), 4);
  check('SD slot builds watertight', mc.watertight, mc);
}

boxHoles.length = 0;
console.log(`\n=== TOTAL: ${pass} passed, ${fail} failed ===`);
process.exit(fail ? 1 : 0);
