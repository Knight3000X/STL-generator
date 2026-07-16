// Stacking feet («штабелируемость»): four pads at the bottom edge middles, inset past
// (wall + clearance) so they nest into the cavity of an identical box below. Checks: watertight
// with the extra shells, correct protrusion, the NESTING invariant (feet fit inside the cavity
// with clearance), and the guards (curved bottoms / lattice / tiny boxes skip feet).
// Run via ./run-all.sh (extraction test).

let pass = 0, fail = 0;
function check(name, cond, extra) {
  if (cond) { pass++; console.log('  OK  ', name); }
  else { fail++; console.log('  FAIL', name, extra!==undefined?JSON.stringify(extra):''); }
}
function sv(t){let v=0;for(const T of t){const a=T[0],b=T[1],c=T[2];v+=(a[0]*(b[1]*c[2]-b[2]*c[1])-a[1]*(b[0]*c[2]-b[2]*c[0])+a[2]*(b[0]*c[1]-b[1]*c[0]))/6;}return v;}
function minY(tris){ let m=1e9; for(const tr of tris) for(const p of tr) m=Math.min(m,p[1]); return m; }
// horizontal extents of everything BELOW the box bottom (the feet)
function feetExtent(tris, yBottom){
  let mx=0, mz=0, found=false;
  for (const tr of tris) for (const p of tr) if (p[1] < yBottom - 1e-6) {
    found=true; mx=Math.max(mx,Math.abs(p[0])); mz=Math.max(mz,Math.abs(p[2]));
  }
  return { found, mx, mz };
}
function setBox(over){
  logos.length = 0; boxHoles.length = 0;
  Object.assign(paramState.box, {
    width:60, height:40, depth:50, hollow:true, wallThickness:2.5, rim:false,
    stackFeet:true, stackFootH:1.6, stackClear:0.6,
    filletRadius:0, filletTop:0, filletBottom:0, filletVert:0,
    filletInnerFloor:0, filletInnerVert:0, filletInnerLip:0,
    squircle:0, squircleVTop:0, squircleVBot:0, latticeFloor:false,
    taperXPlus:0,taperXMinus:0,taperZPlus:0,taperZMinus:0,taperYPlusX:0,taperYPlusZ:0,taperYMinusX:0,taperYMinusZ:0,
    bulgeXPlus:0,bulgeXMinus:0,bulgeZPlus:0,bulgeZMinus:0,bulgeYPlus:0,bulgeYMinus:0,
    chamferTop:0, hingeRole:undefined, logo3d:false,
  }, over);
  return buildTrisForShape('box', paramState.box);
}

console.log('=== Hollow container with stacking feet ===');
{
  const tris = setBox({});
  const mc = manifoldCheck(tris, 4);
  check('watertight with feet shells', mc.watertight && sv(tris) > 0, mc);
  check('feet protrude by stackFootH', Math.abs(minY(tris) - (-20 - 1.6)) < 1e-9, {minY: minY(tris)});
  // NESTING: everything below the bottom must fit inside the cavity of the same box:
  // cavity half-extents = W/2−wall, D/2−wall; feet must stay ≤ that minus the clearance.
  const fe = feetExtent(tris, -20);
  check('feet exist below the bottom', fe.found);
  check('feet fit the cavity in X with clearance', fe.mx <= 30 - 2.5 - 0.6 + 1e-9, {mx: fe.mx, limit: 30-2.5-0.6});
  check('feet fit the cavity in Z with clearance', fe.mz <= 25 - 2.5 - 0.6 + 1e-9, {mz: fe.mz, limit: 25-2.5-0.6});
}

console.log('\n=== Volume grows vs no feet; toggle off is a no-op ===');
{
  const withFeet = sv(setBox({}));
  const without  = sv(setBox({ stackFeet:false }));
  check('feet add material', withFeet > without + 10, {withFeet:+withFeet.toFixed(0), without:+without.toFixed(0)});
  check('no feet -> bottom stays flat', Math.abs(minY(setBox({stackFeet:false})) - (-20)) < 1e-9);
}

console.log('\n=== Works on solid box and squircle walls; taller feet honoured ===');
{
  const solid = setBox({ hollow:false });
  check('solid box + feet: watertight', manifoldCheck(solid,4).watertight);
  const sq = setBox({ squircle:60 });
  const mcSq = manifoldCheck(sq, 4);
  check('squircle + feet: watertight', mcSq.watertight, mcSq);
  const fe = feetExtent(sq, -20);
  check('squircle: mid-edge feet stay under solid material', fe.found && fe.mx <= 30-2.5-0.6+1e-9 && fe.mz <= 25-2.5-0.6+1e-9, fe);
  const tall = setBox({ stackFootH: 4 });
  check('taller feet protrude 4mm', Math.abs(minY(tall) - (-24)) < 1e-9, {minY: minY(tall)});
}

console.log('\n=== Guards: curved bottoms / lattice / tiny boxes skip the feet cleanly ===');
{
  for (const [name, over] of [
    ['rounded squircle bottom', { squircle:60, squircleVBot:50 }],
    ['bottom bulge',            { bulgeYMinus: 5 }],
    ['lattice net floor',       { latticeFloor: true }],
  ]) {
    const tris = setBox(over);                                   // stackFeet:true …
    const base = setBox(Object.assign({ stackFeet:false }, over)); // … must be a no-op here
    const mc = manifoldCheck(tris, 4);
    check(`${name}: feet skipped (same mesh), still watertight`,
      mc.watertight && tris.length === base.length,
      {tris: tris.length, base: base.length, open:mc.openEdges, bad:mc.badEdges});
  }
  const tiny = setBox({ width:8, depth:8, wallThickness:2.5 });
  check('tiny box: feet skipped, watertight', manifoldCheck(tiny,4).watertight && Math.abs(minY(tiny) - (-20)) < 1e-9,
    {minY: minY(tiny)});
}

console.log('\n=== Fillet-bottom container: feet inset past the rounding ===');
{
  const tris = setBox({ filletBottom: 6, filletVert: 6, filletTop: 2 });
  const mc = manifoldCheck(tris, 4);
  check('fillet + feet: watertight', mc.watertight, mc);
  const fe = feetExtent(tris, -20);
  check('feet inset past the fillet radius', fe.found && fe.mx <= 30 - 6 - 0.6 + 1e-9, {mx: fe.mx, limit: 30-6-0.6});
}

paramState.box.stackFeet = false;
console.log(`\n=== TOTAL: ${pass} passed, ${fail} failed ===`);
process.exit(fail ? 1 : 0);
