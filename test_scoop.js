// Scoop ramp («скат»): a solid concave quarter-circle ramp on the cavity floor so parts collect at
// the chosen low wall. Built as a welded appended shell (grid-independent). Checks: watertight for
// every direction, ramp geometry (rises R against the high wall, tangent to the floor at the front,
// spans the full cavity width), tray support, custom radius, and the incompatibility guards.
// Run via ./run-all.sh (extraction test).

let pass = 0, fail = 0;
function check(name, cond, extra) {
  if (cond) { pass++; console.log('  OK  ', name); }
  else { fail++; console.log('  FAIL', name, extra!==undefined?JSON.stringify(extra):''); }
}
function sv(t){let v=0;for(const T of t){const a=T[0],b=T[1],c=T[2];v+=(a[0]*(b[1]*c[2]-b[2]*c[1])-a[1]*(b[0]*c[2]-b[2]*c[0])+a[2]*(b[0]*c[1]-b[1]*c[0]))/6;}return v;}
function setBox(over){
  logos.length = 0; boxHoles.length = 0;
  Object.assign(paramState.box, {
    width:60, height:35, depth:50, hollow:true, rim:false, cavityDepth:0, wallThickness:2.5, rimHeight:12,
    divX:1, divZ:1, stackFeet:false, latticeFloor:false, chamferTop:0, squircle:0, squircleVBot:0, gfOn:false,
    filletRadius:0, filletTop:0, filletBottom:0, filletVert:0, filletInnerFloor:0, filletInnerVert:0, filletInnerLip:0,
    hingeRole:undefined, logo3d:false, scoopDir:'none', scoopRadius:0,
    taperXPlus:0,taperXMinus:0,taperZPlus:0,taperZMinus:0,taperYPlusX:0,taperYPlusZ:0,taperYMinusX:0,taperYMinusZ:0,
    bulgeXPlus:0,bulgeXMinus:0,bulgeZPlus:0,bulgeZMinus:0,bulgeYPlus:0,bulgeYMinus:0,
  }, over);
  return buildTrisForShape('box', paramState.box);
}

console.log('=== Watertight for every scoop direction ===');
{
  const plain = sv(setBox({}));
  for (const dir of ['front','back','left','right']) {
    const tris = setBox({ scoopDir:dir });
    const mc = manifoldCheck(tris, 4);
    check(`scoop ${dir}: watertight`, mc.watertight, mc);
    check(`scoop ${dir}: adds solid material`, sv(tris) > plain + 100, {added:+(sv(tris)-plain).toFixed(0)});
  }
}

console.log('\n=== Ramp geometry (front: low at +Z, rises at −Z back wall) — inspect the ramp shell alone ===');
{
  setBox({ scoopDir:'front', scoopRadius:12 });
  const ramp = buildScoopRamp(paramState.box);     // the ramp shell only, in scope
  check('ramp shell is a closed watertight solid', manifoldCheck(ramp,4).watertight, manifoldCheck(ramp,4));
  const floorY = -35/2 + 2.5;                        // -15
  const zBack = -(50/2 - 2.5), zFront = 50/2 - 2.5;  // −22.5 .. +22.5
  let minX=1e9,maxX=-1e9,minZ=1e9,maxZ=-1e9,maxY=-1e9;
  for (const tr of ramp) for (const p of tr) { minX=Math.min(minX,p[0]); maxX=Math.max(maxX,p[0]);
    minZ=Math.min(minZ,p[2]); maxZ=Math.max(maxZ,p[2]); maxY=Math.max(maxY,p[1]); }
  check('ramp rises ~R (12mm) above the floor', Math.abs((maxY - floorY) - 12) < 0.4, {rise:+(maxY-floorY).toFixed(2)});
  check('ramp is against the back wall (−Z)', minZ <= zBack + 0.01, {minZ:+minZ.toFixed(1), zBack:+zBack.toFixed(1)});
  check('ramp does not reach the front wall', maxZ < zFront - 5, {maxZ:+maxZ.toFixed(1)});
  check('ramp spans the cavity width (welds into both side walls)', (maxX - minX) > (60 - 2*2.5) - 0.01, {span:+(maxX-minX).toFixed(1)});
}

console.log('\n=== Auto radius is modest (not half the cavity) ===');
{
  const plain = sv(setBox({}));
  const auto = setBox({ scoopDir:'front' });
  const cavVol = (60-5)*(35-2.5)*(50-5);
  check('auto scoop < 12% of cavity volume', (sv(auto) - plain) < 0.12*cavVol, {frac:+((sv(auto)-plain)/cavVol).toFixed(3)});
}

console.log('\n=== Tray, custom radius, dividers coexist ===');
{
  check('tray + scoop: watertight', manifoldCheck(setBox({ hollow:false, rim:true, rimHeight:12, scoopDir:'back' }),4).watertight);
  check('scoop R=20: watertight', manifoldCheck(setBox({ scoopDir:'left', scoopRadius:20 }),4).watertight);
  check('scoop + dividers: watertight', manifoldCheck(setBox({ scoopDir:'front', divX:2, divZ:2 }),4).watertight);
  check('scoop + wall logo hole (dividers off): watertight', manifoldCheck(setBox({ scoopDir:'front', stackFeet:true }),4).watertight);
}

console.log('\n=== Guards: incompatible floors skip the scoop cleanly ===');
{
  for (const [name, over] of [
    ['lattice floor',   { latticeFloor:true }],
    ['squircle',        { squircle:60 }],
    ['rounded bottom',  { squircle:60, squircleVBot:50 }],
    ['inner fillet',    { filletInnerFloor:6, filletInnerVert:6 }],
    ['wall bulge',      { bulgeXPlus:6 }],
    ['solid (no cavity)', { hollow:false, rim:false }],
  ]) {
    const withScoop = setBox(Object.assign({ scoopDir:'front' }, over));
    const without   = setBox(over);
    check(`${name}: scoop skipped (same mesh), watertight`,
      manifoldCheck(withScoop,4).watertight && withScoop.length === without.length,
      {a: withScoop.length, b: without.length});
  }
}

paramState.box.scoopDir = 'none';
console.log(`\n=== TOTAL: ${pass} passed, ${fail} failed ===`);
process.exit(fail ? 1 : 0);
