// Cavity dividers («перегородки/секции»): divX×divZ organizer cells inside the hollow container /
// rim tray — thin walls welded into the floor and side walls as extra closed shells. Checks:
// watertight, correct count/placement, containment inside the outer body (incl. the squircle chord
// clamp), rim-tray support, and the guards. Run via ./run-all.sh (extraction test).

let pass = 0, fail = 0;
function check(name, cond, extra) {
  if (cond) { pass++; console.log('  OK  ', name); }
  else { fail++; console.log('  FAIL', name, extra!==undefined?JSON.stringify(extra):''); }
}
function sv(t){let v=0;for(const T of t){const a=T[0],b=T[1],c=T[2];v+=(a[0]*(b[1]*c[2]-b[2]*c[1])-a[1]*(b[0]*c[2]-b[2]*c[0])+a[2]*(b[0]*c[1]-b[1]*c[0]))/6;}return v;}
function setBox(over){
  logos.length = 0; boxHoles.length = 0;
  Object.assign(paramState.box, {
    width:60, height:40, depth:50, hollow:true, wallThickness:2.5, rim:false, rimHeight:8,
    divX:1, divZ:1, divT:1.2, divH:100, stackFeet:false,
    filletRadius:0, filletTop:0, filletBottom:0, filletVert:0,
    filletInnerFloor:0, filletInnerVert:0, filletInnerLip:0,
    squircle:0, squircleVTop:0, squircleVBot:0, latticeFloor:false,
    taperXPlus:0,taperXMinus:0,taperZPlus:0,taperZMinus:0,taperYPlusX:0,taperYPlusZ:0,taperYMinusX:0,taperYMinusZ:0,
    bulgeXPlus:0,bulgeXMinus:0,bulgeZPlus:0,bulgeZMinus:0,bulgeYPlus:0,bulgeYMinus:0,
    chamferTop:0, hingeRole:undefined, logo3d:false,
  }, over);
  return buildTrisForShape('box', paramState.box);
}

console.log('=== 3×2 organizer grid in a hollow container ===');
{
  const base = setBox({});
  const tris = setBox({ divX:3, divZ:2 });
  const mc = manifoldCheck(tris, 4);
  check('watertight with dividers', mc.watertight && sv(tris) > 0, mc);
  // 3×2 cells -> 2 walls across X + 1 across Z, each a 12-tri plain shell
  check('divider tri count = 3 slabs × 12', tris.length - base.length === 3*12, {extra: tris.length - base.length});
  // and the added volume matches the slab algebra (±5% for the crossing overlaps)
  const t=2.5, embed=Math.min(1, t*0.6), hgt=37.5+embed, aI=27.5, bI=22.5;
  const expect = 2*(1.2*hgt*2*(bI+embed)) + 1*(1.2*hgt*2*(aI+embed));
  check('divider volume ≈ slab algebra', Math.abs((sv(tris)-sv(base)) - expect) < 0.06*expect,
    {got: +(sv(tris)-sv(base)).toFixed(0), expect: +expect.toFixed(0)});
  // dividers add material
  check('dividers add volume', sv(tris) > sv(base) + 100, {d: +(sv(tris)-sv(base)).toFixed(0)});
  // divider tops reach the rim plane (divH=100%): a 12-tri slab only has CORNER vertices — the
  // X-slabs' corners sit at x=±9.17±0.6, z=±23.5 (bI+embed), strictly between the inner (22.5) and
  // outer (25) wall planes, so this band is unique to the dividers.
  let topAt = -1e9;
  for (const tr of tris) for (const p of tr)
    if (Math.abs(p[0]) > 2 && Math.abs(p[0]) < 20 && Math.abs(p[2]) > 23 && Math.abs(p[2]) < 24.4)
      topAt = Math.max(topAt, p[1]);
  check('divider top reaches the rim (y=20)', Math.abs(topAt - 20) < 1e-6, {topAt});
  // nothing pokes outside the body
  let mx=0, mz=0; for (const tr of tris) for (const p of tr){ mx=Math.max(mx,Math.abs(p[0])); mz=Math.max(mz,Math.abs(p[2])); }
  check('nothing outside the outer walls', mx <= 30+1e-9 && mz <= 25+1e-9, {mx, mz});
}

console.log('\n=== Half-height dividers + thicker walls ===');
{
  const tris = setBox({ divX:2, divH:50, divT:2 });
  const mc = manifoldCheck(tris, 4);
  check('half-height: watertight', mc.watertight, mc);
  // floorY=-17.5, cavH=37.5 -> top = floorY + 18.75 = 1.25. divX=2 puts the slab at x=0 with
  // corner vertices at z=±23.5 — the divider-only band between the wall planes.
  let topAt = -1e9;
  for (const tr of tris) for (const p of tr)
    if (Math.abs(p[0]) <= 1.5 && Math.abs(p[2]) > 23 && Math.abs(p[2]) < 24.4) topAt = Math.max(topAt, p[1]);
  check('half-height top ≈ 1.25', Math.abs(topAt - 1.25) < 1e-6, {topAt});
}

console.log('\n=== Rim tray (борт) gets dividers in its pocket ===');
{
  const base = setBox({ hollow:false, rim:true });
  const tris = setBox({ hollow:false, rim:true, divX:2, divZ:2 });
  const mc = manifoldCheck(tris, 4);
  check('tray + dividers: watertight', mc.watertight, mc);
  check('tray dividers present (2 slabs × 12 tris)', tris.length - base.length === 2*12, {extra: tris.length - base.length});
}

console.log('\n=== Squircle container: chord-clamped dividers stay inside the curved wall ===');
{
  const tris = setBox({ squircle:70, divX:3, divZ:3 });
  const mc = manifoldCheck(tris, 4);
  check('squircle + dividers: watertight', mc.watertight, mc);
  // containment: every divider vertex inside the OUTER superellipse (e=2/0.7)
  const e = 2/0.7, W=60, D=50;
  let worst = 0;
  for (const tr of tris) for (const p of tr) {
    const r = Math.pow(Math.abs(p[0])/(W/2), e) + Math.pow(Math.abs(p[2])/(D/2), e);
    worst = Math.max(worst, r);
  }
  check('every vertex inside the outer superellipse', worst <= 1 + 1e-6, {worst: +worst.toFixed(4)});
  const base = setBox({ squircle:70 });
  check('squircle dividers actually added', tris.length > base.length, {extra: tris.length - base.length});
}

console.log('\n=== Guards: curved floor / lattice / bulge / taper skip dividers ===');
{
  for (const [name, over] of [
    ['rounded squircle bottom', { squircle:60, squircleVBot:50, divX:2 }],
    ['lattice floor',           { latticeFloor:true, divX:2 }],
    ['wall bulge',              { bulgeXPlus:6, divX:2 }],
    ['taper',                   { taperXPlus:15, divX:2 }],
    ['solid box (no cavity)',   { hollow:false, divX:2 }],
  ]) {
    const w = setBox(over);
    const wo = setBox(Object.assign({}, over, { divX:1, divZ:1 }));
    check(`${name}: dividers skipped, watertight`, manifoldCheck(w,4).watertight && w.length === wo.length,
      {w: w.length, wo: wo.length});
  }
}

paramState.box.divX = 1; paramState.box.divZ = 1;
console.log(`\n=== TOTAL: ${pass} passed, ${fail} failed ===`);
process.exit(fail ? 1 : 0);
