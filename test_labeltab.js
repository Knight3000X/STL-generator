// Label tab («полка под ярлык»): a self-supporting triangular bracket on the top-inner edge of a
// chosen wall — a horizontal ledge at rim level with a 45° self-supporting underside, welded into
// the wall. Checks: watertight, the bracket geometry in isolation (ledge at rim, 45° underside,
// full width), all four walls, tray support, and the guards. Run via ./run-all.sh.

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
    hingeRole:undefined, logo3d:false, scoopDir:'none', scoopRadius:0, labelTab:'none', labelDepth:12,
    taperXPlus:0,taperXMinus:0,taperZPlus:0,taperZMinus:0,taperYPlusX:0,taperYPlusZ:0,taperYMinusX:0,taperYMinusZ:0,
    bulgeXPlus:0,bulgeXMinus:0,bulgeZPlus:0,bulgeZMinus:0,bulgeYPlus:0,bulgeYMinus:0,
  }, over);
  return buildTrisForShape('box', paramState.box);
}

console.log('=== Watertight on every wall ===');
{
  const plain = sv(setBox({}));
  for (const dir of ['back','front','left','right']) {
    const tris = setBox({ labelTab:dir });
    const mc = manifoldCheck(tris, 4);
    check(`label tab ${dir}: watertight`, mc.watertight, mc);
    check(`label tab ${dir}: adds material`, sv(tris) > plain + 50, {added:+(sv(tris)-plain).toFixed(0)});
  }
}

console.log('=== Bracket geometry (back wall), inspect the shell alone ===');
{
  setBox({ labelTab:'back', labelDepth:12 });
  const tab = buildLabelTab(paramState.box);
  check('bracket is a closed watertight solid', manifoldCheck(tab,4).watertight, manifoldCheck(tab,4));
  const topRim = 35/2, t = 2.5, zInner = -(50/2 - t); // back wall inner face at −22.5
  let minX=1e9,maxX=-1e9,minY=1e9,maxY=-1e9,minZ=1e9,maxZ=-1e9;
  for (const tr of tab) for (const p of tr) { minX=Math.min(minX,p[0]); maxX=Math.max(maxX,p[0]);
    minY=Math.min(minY,p[1]); maxY=Math.max(maxY,p[1]); minZ=Math.min(minZ,p[2]); maxZ=Math.max(maxZ,p[2]); }
  check('ledge top is at the rim (y=H/2)', Math.abs(maxY - topRim) < 1e-6, {maxY:+maxY.toFixed(2)});
  check('underside drops one depth below rim', Math.abs(minY - (topRim - 12)) < 1e-6, {minY:+minY.toFixed(2)});
  check('welded into the back wall (z reaches past inner face)', minZ <= zInner - 0.01, {minZ:+minZ.toFixed(2)});
  check('protrudes ~depth into the cavity', Math.abs((maxZ - zInner) - 12) < 0.5, {reach:+(maxZ-zInner).toFixed(2)});
  check('spans full inner width (welds side walls)', (maxX-minX) > (60-2*t) - 0.01, {span:+(maxX-minX).toFixed(1)});
  // 45° self-supporting underside: it runs from the ledge FRONT edge (maxZ, at rim) down to the
  // WALL (minZ, at rim−depth). So the front edge is all at the rim, and the low point is at the wall.
  let frontY = -1e9;
  for (const tr of tab) for (const p of tr) if (Math.abs(p[2] - maxZ) < 1e-6) frontY = Math.max(frontY, p[1]);
  check('ledge front edge is at the rim', Math.abs(frontY - topRim) < 1e-6, {frontY:+frontY.toFixed(2)});
  // underside slope ≈ 45°: Δy over Δz between the front-top and wall-bottom of the underside
  const embed = Math.min(1, 2.5*0.6);  // = 1.0 (weld into the wall)
  check('underside spans depth+embed (~45° over its run)', Math.abs((maxZ - minZ) - (12 + embed)) < 0.05, {dz:+(maxZ-minZ).toFixed(2)});
}

console.log('=== Tray + coexist with scoop/dividers ===');
{
  check('tray + label tab: watertight', manifoldCheck(setBox({ hollow:false, rim:true, rimHeight:14, labelTab:'back' }),4).watertight);
  check('label tab + scoop: watertight', manifoldCheck(setBox({ labelTab:'back', scoopDir:'front' }),4).watertight);
  check('label tab + dividers: watertight', manifoldCheck(setBox({ labelTab:'back', divX:2 }),4).watertight);
  check('custom deep tab clamped, watertight', manifoldCheck(setBox({ labelTab:'left', labelDepth:500 }),4).watertight);
}

console.log('=== Guards ===');
{
  for (const [name, over] of [
    ['squircle',      { squircle:60 }],
    ['wall bulge',    { bulgeXPlus:6 }],
    ['outer fillet',  { filletRadius:5 }],
    ['solid box',     { hollow:false, rim:false }],
  ]) {
    const withTab = setBox(Object.assign({ labelTab:'back' }, over));
    const without = setBox(over);
    check(`${name}: tab skipped (same mesh), watertight`,
      manifoldCheck(withTab,4).watertight && withTab.length === without.length, {a:withTab.length, b:without.length});
  }
}

paramState.box.labelTab = 'none';
console.log(`\n=== TOTAL: ${pass} passed, ${fail} failed ===`);
process.exit(fail ? 1 : 0);
