// Top-outer chamfer on the hollow container (#5): a bevel on the upper OUTER edge where the wall
// meets the top rim. Width = horizontal setback (clamped < wall thickness), angle = bevel from the
// horizontal. The result must stay watertight-by-construction and positively oriented for every
// width/angle, alone and combined with taper or the lattice floor; width 0 must be a no-op.
// Run against the REAL <script>:
//   awk '/<script>/{f=1;next}/<\/script>/{f=0}f' parametric-stl-generator.html | sed '$ { /^init();$/d }' > /tmp/lib.js
//   cat stub_preamble.js /tmp/lib.js test_chamfer.js > /tmp/run.js && node /tmp/run.js

let pass = 0, fail = 0;
function check(name, cond, extra) {
  if (cond) { pass++; console.log('  OK  ', name); }
  else { fail++; console.log('  FAIL', name, extra!==undefined?JSON.stringify(extra):''); }
}
function hasNaN(tris) { for (const tri of tris) for (const p of tri) for (const c of p) if (!Number.isFinite(c)) return true; return false; }
function sv(t){let v=0;for(const T of t){const a=T[0],b=T[1],c=T[2];v+=(a[0]*(b[1]*c[2]-b[2]*c[1])-a[1]*(b[0]*c[2]-b[2]*c[0])+a[2]*(b[0]*c[1]-b[1]*c[0]))/6;}return v;}
function maxAbsXat(tris, y, eps){ let m=0; for(const tr of tris) for(const p of tr) if(Math.abs(p[1]-y)<eps) m=Math.max(m,Math.abs(p[0])); return m; }
function maxY(tris){ let m=-1e9; for(const tr of tris) for(const p of tr) m=Math.max(m,p[1]); return m; }

function setBox(overrides) {
  logos.length = 0;
  Object.assign(paramState.box, {
    width:80, height:60, depth:70, hollow:true, wallThickness:3,
    segW:1,segH:1,segD:1, filletRadius:0,filletTop:0,filletBottom:0,filletVert:0,
    filletInnerFloor:0,filletInnerVert:0,filletInnerLip:0, squircle:0,squircleVTop:0,squircleVBot:0,
    rim:false, latticeFloor:false, chamferTop:0, chamferAngle:45,
    taperXPlus:0,taperXMinus:0,taperZPlus:0,taperZMinus:0,taperYPlusX:0,taperYPlusZ:0,taperYMinusX:0,taperYMinusZ:0,
    bulgeXPlus:0,bulgeXMinus:0,bulgeZPlus:0,bulgeZMinus:0,bulgeYPlus:0,bulgeYMinus:0,
  }, overrides);
}

console.log('=== Basic 45° chamfer on a plain hollow container ===');
{
  setBox({ chamferTop: 2.5, chamferAngle: 45 });
  const tris = buildTrisForShape('box', paramState.box);
  const mc = manifoldCheck(tris, 4);
  check('no NaN', !hasNaN(tris));
  check('watertight', mc.watertight, mc);
  check('positively oriented (volume > 0)', sv(tris) > 0);
  const hw = 40, hh = 30;
  // The very top plane (y=hh) exists but is pulled IN by the setback: max|x| there < hw.
  check('top plane is inset by the setback', maxAbsXat(tris, hh, 1e-4) < hw - 1e-3, {atTop: maxAbsXat(tris, hh, 1e-4)});
  // The full outer extent (max|x|=hw) survives only at/below the lowered wall top (y <= hh - v).
  const v = 2.5*Math.tan(45*Math.PI/180); // = 2.5
  check('outer edge (|x|=hw) is lowered by v', maxAbsXat(tris, hh, 1e-4) < hw && maxAbsXat(tris, hh - v, 1e-3) > hw - 1e-2, {atDrop: maxAbsXat(tris, hh - v, 1e-3)});
  check('mesh top stays at hh', Math.abs(maxY(tris) - hh) < 1e-6, {maxY: maxY(tris)});
}

console.log('\n=== Width 0 is a no-op (identical to a plain hollow rim) ===');
{
  setBox({ chamferTop: 0 });
  const base = buildTrisForShape('box', paramState.box);
  setBox({ chamferTop: 0, chamferAngle: 60 });
  const same = buildTrisForShape('box', paramState.box);
  check('width 0 stays watertight', manifoldCheck(base,4).watertight);
  check('width 0 ⇒ same triangle count regardless of angle', base.length === same.length, {a:base.length,b:same.length});
}

console.log('\n=== A range of widths and angles all stay watertight ===');
for (const w of [1, 2.5, 3, 5]) for (const ang of [20, 45, 60, 75]) {
  setBox({ chamferTop: w, chamferAngle: ang });
  const tris = buildTrisForShape('box', paramState.box);
  const mc = manifoldCheck(tris, 4);
  check(`w=${w} ang=${ang}: watertight & +vol`, mc.watertight && !hasNaN(tris) && sv(tris) > 0, {open:mc.openEdges,bad:mc.badEdges});
}

console.log('\n=== Setback wider than the wall is clamped, not leaked ===');
{
  setBox({ chamferTop: 50, chamferAngle: 70 }); // far exceeds wall thickness 3
  const tris = buildTrisForShape('box', paramState.box);
  const mc = manifoldCheck(tris, 4);
  check('over-wide chamfer clamps and stays watertight', mc.watertight && sv(tris) > 0, mc);
  // Clamped setback must not cross into the opening: top plane still shows material beyond hw-wall.
  check('top inset does not exceed the wall thickness', maxAbsXat(tris, 30, 1e-4) >= 40 - 3 - 1e-2, {atTop: maxAbsXat(tris, 30, 1e-4)});
}

console.log('\n=== Chamfer + wall taper ===');
{
  setBox({ chamferTop: 2.5, chamferAngle: 45, taperXPlus: 15, taperZMinus: 10 });
  const tris = buildTrisForShape('box', paramState.box);
  const mc = manifoldCheck(tris, 4);
  check('chamfer + taper: watertight', mc.watertight && !hasNaN(tris), mc);
}

console.log('\n=== Chamfer + lattice floor (independent regions) ===');
{
  setBox({ chamferTop: 3, chamferAngle: 50, latticeFloor: true, latticeCell: 12, latticeRib: 1.6, latticeBorder: 2 });
  const tris = buildTrisForShape('box', paramState.box);
  const mc = manifoldCheck(tris, 4);
  check('chamfer + lattice: watertight', mc.watertight && !hasNaN(tris), mc);
}

console.log('\n=== Chamfer removes material (smaller volume than the un-chamfered container) ===');
{
  setBox({ chamferTop: 0 });
  const v0 = sv(buildTrisForShape('box', paramState.box));
  setBox({ chamferTop: 3, chamferAngle: 60 });
  const v1 = sv(buildTrisForShape('box', paramState.box));
  check('chamfer cuts volume', v1 < v0 && v1 > 0, {v0:+v0.toFixed(1), v1:+v1.toFixed(1)});
}

console.log('\n=== TOTAL:', pass, 'passed,', fail, 'failed ===');
process.exit(fail > 0 ? 1 : 0);
