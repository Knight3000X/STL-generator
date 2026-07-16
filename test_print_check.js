// Print-readiness analysis: overhangArea (supports needed?), bestOrientation (6 face-down
// candidates, least overhang wins, upright ties win) and collectPrintWarnings (thin features
// straight from the parameters). Run via ./run-all.sh (extraction test).

let pass = 0, fail = 0;
function check(name, cond, extra) {
  if (cond) { pass++; console.log('  OK  ', name); }
  else { fail++; console.log('  FAIL', name, extra!==undefined?JSON.stringify(extra):''); }
}
function setBox(over){
  logos.length = 0; boxHoles.length = 0;
  Object.assign(paramState.box, {
    width:40, height:40, depth:40, hollow:false, rim:false, wallThickness:2.5, rimHeight:8,
    divX:1, divZ:1, divT:1.2, stackFeet:false, squircle:0, squircleVBot:0, latticeFloor:false, latticeRib:1.6,
    filletRadius:0, filletTop:0, filletBottom:0, filletVert:0, logo3d:false, hingeRole:undefined,
    taperXPlus:0,taperXMinus:0,taperZPlus:0,taperZMinus:0,taperYPlusX:0,taperYPlusZ:0,taperYMinusX:0,taperYMinusZ:0,
    bulgeXPlus:0,bulgeXMinus:0,bulgeZPlus:0,bulgeZMinus:0,bulgeYPlus:0,bulgeYMinus:0, chamferTop:0,
  }, over);
  return buildTrisForShape('box', paramState.box);
}

console.log('=== overhangArea ===');
{
  const cube = setBox({});
  check('plain cube: no overhangs (bottom is bed contact)', overhangArea(cube) < 1e-6, overhangArea(cube));
  const cup = setBox({ hollow:true });
  check('upright hollow cup: no overhangs', overhangArea(cup) < 1e-6, overhangArea(cup));
  // flip the cup: the cavity floor becomes a ceiling ≈ (W−2t)² of unsupported area
  const flipped = rotateTris(cup, 180, 0, 0);
  const a = overhangArea(flipped);
  const cav = (40-5)*(40-5);
  check('flipped cup: overhang ≈ cavity floor area', Math.abs(a - cav) < 0.15*cav, {a:+a.toFixed(0), cav});
  // taper: walls leaning OUT more than 45° -> side overhangs appear
  // cup on its side: the cavity's upper wall becomes a flat ceiling → real overhang area
  const side = rotateTris(setBox({ hollow:true }), 90, 0, 0);
  check('sideways cup: cavity ceiling is an overhang', overhangArea(side) > 500, +overhangArea(side).toFixed(0));
}

console.log('\n=== bestOrientation ===');
{
  const cup = setBox({ hollow:true });
  const up = bestOrientation(cup);
  check('upright cup stays upright', up.rx === 0 && up.rz === 0, up);
  // pre-flipped mesh: the best candidate must flip it back (rx=180 on the flipped = upright)
  const flipped = rotateTris(cup, 180, 0, 0);
  const fix = bestOrientation(flipped);
  check('flipped cup: auto-orient flips it back', fix.rx === 180 && fix.rz === 0, fix);
  check('fixed orientation has (near) zero overhang', fix.area < 1e-6, fix.area);
  // a plate lying on its side: any face-down works for a box — area 0 for all — earliest wins
  const plate = setBox({ height: 4 });
  const p = bestOrientation(rotateTris(plate, 90, 0, 0));
  check('sideways plate: laid flat again', p.area < 1e-6, p);
}

console.log('\n=== collectPrintWarnings ===');
{
  setBox({ hollow:true, wallThickness:2.5 });
  check('healthy container: no warnings', collectPrintWarnings(paramState.box).length === 0,
    collectPrintWarnings(paramState.box));
  setBox({ hollow:true, wallThickness:0.8 });
  check('thin wall flagged', collectPrintWarnings(paramState.box).some(w=>/стенка/.test(w)));
  setBox({ hollow:true, latticeFloor:true, latticeRib:0.5 });
  check('thin lattice rib flagged', collectPrintWarnings(paramState.box).some(w=>/ребро/.test(w)));
  setBox({ hollow:true, divX:3, divT:0.5 });
  check('thin divider flagged', collectPrintWarnings(paramState.box).some(w=>/перегородка/.test(w)));
  setBox({});
  logos.push({ id:1, face:'+Z', u0:0, v0:0, w:10, h:10, depth:0.2, threshold:0.5, invert:false, rotation:0,
    heightmap:new Float32Array(4).fill(1) });
  check('too-shallow relief flagged', collectPrintWarnings(paramState.box).some(w=>/рельеф/.test(w)));
  logos.length = 0;
}

console.log('\n=== snapWeldTris (final safety weld) ===');
{
  // a sliver quad whose two long edges are 1e-6 apart must vanish entirely
  const sliver = [
    [[0,0,0],[10,0,0],[10,1e-6,0]],
    [[0,0,0],[10,1e-6,0],[0,1e-6,0]],
  ];
  check('sliver quad collapses to nothing', snapWeldTris(sliver).length === 0, snapWeldTris(sliver).length);
  // a normal closed box passes through untouched (12 tris, same coordinates)
  const box = plainBoxShellTris(10, 6, 4);
  const welded = snapWeldTris(box);
  check('plain box: 12 tris survive unchanged', welded.length === 12 &&
    JSON.stringify(welded) === JSON.stringify(box), welded.length);
  // near-duplicate vertices (1e-9 apart) are unified to ONE representative object
  const t2 = snapWeldTris([
    [[0,0,0],[5,0,0],[0,5,0]],
    [[5,0,0],[1e-9,0,0],[0,0,5]],
  ]);
  check('1e-9-apart vertices weld to one representative', t2.length === 2 && t2[0][0] === t2[1][1]);
  // distinct vertices well above the tolerance are NOT merged
  const t3 = snapWeldTris([[[0,0,0],[0.001,0,0],[0,0.001,0]]]);
  check('0.001mm features stay intact', t3.length === 1);
}

console.log(`\n=== TOTAL: ${pass} passed, ${fail} failed ===`);
process.exit(fail ? 1 : 0);
