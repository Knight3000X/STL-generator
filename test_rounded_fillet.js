// Tests for the ROUNDED hollow / tray fillet path (buildRoundedHollow via buildTrisForShape),
// including the inner-lip spike fix: a 0 inner lip with a rounded inner vertical used to taper the
// inner vertical cylinders to a point at the sharp top corner (a cone "spike" in the pocket). The
// fix falls the 0 lip back to the inner vertical radius (clamped to the pocket depth) so the inner
// opening is a rounded rectangle. The spike case was ALWAYS watertight (a cone is a closed surface),
// so watertight alone can't see it; spike REMOVAL is confirmed visually in-browser. These tests are
// the watertight regression guard for the whole rounded fillet path (previously uncovered by Node).
// Run against the real file:
//   awk '/<script>/{f=1;next}/<\/script>/{f=0}f' parametric-stl-generator.html \
//     | sed '$ { /^init();$/d }' > /tmp/lib.js
//   cat /tmp/lib.js test_rounded_fillet.js > /tmp/run.js && node /tmp/run.js

let pass = 0, fail = 0;
function check(name, cond, extra) {
  if (cond) { pass++; console.log('  OK  ', name); }
  else { fail++; console.log('  FAIL', name, extra!==undefined?JSON.stringify(extra):''); }
}
function hasNaN(tris) { for (const tri of tris) for (const p of tri) for (const c of p) if (!Number.isFinite(c)) return true; return false; }
function base(overrides) {
  Object.assign(paramState.box, {
    width:80, height:50, depth:70, hollow:false, rim:false, wallThickness:3, rimHeight:8, filletSeg:6,
    filletRadius:0, filletTop:0, filletBottom:0, filletVert:0, filletInnerFloor:0, filletInnerVert:0, filletInnerLip:0,
    taperXPlus:0,taperXMinus:0,taperZPlus:0,taperZMinus:0,taperYPlusX:0,taperYPlusZ:0,taperYMinusX:0,taperYMinusZ:0 }, overrides);
  logos.length = 0;
}
console.log('=== USER CASE: 40 cube tray, inner floor=vert=10, inner lip=0 (was: spikes) ===');
{
  base({ rim:true, width:40, height:40, depth:40, wallThickness:3, rimHeight:8,
    filletTop:10, filletBottom:10, filletVert:10, filletInnerFloor:10, filletInnerVert:10, filletInnerLip:0, filletSeg:8 });
  const p = paramState.box;
  const tris = buildTrisForShape('box', p);
  check('no NaN', !hasNaN(tris));
  const mc = manifoldCheck(tris, 5);
  check('watertight', mc.watertight, mc);
}

console.log('\n=== tray fillet combos, inner lip = 0 ===');
for (const c of [
  {name:'shallow rh=5',  o:{rimHeight:5}},
  {name:'deep rh=20',    o:{rimHeight:20}},
  {name:'floor only',    o:{filletInnerFloor:8, filletInnerVert:0}},
  {name:'vert only',     o:{filletInnerFloor:0, filletInnerVert:8}},
  {name:'thin wall',     o:{wallThickness:1.5}},
  {name:'thick wall',    o:{wallThickness:8}},
]) {
  base(Object.assign({ rim:true, width:80, height:50, depth:70, wallThickness:3, rimHeight:10,
    filletTop:4, filletBottom:6, filletVert:8, filletInnerFloor:6, filletInnerVert:7, filletInnerLip:0, filletSeg:6 }, c.o));
  const p = paramState.box;
  const tris = buildTrisForShape('box', p);
  const mc = manifoldCheck(tris, 5);
  check(c.name + ' watertight', !hasNaN(tris) && mc.watertight, mc);
}

console.log('\n=== hollow container fillet combos, inner lip = 0 ===');
for (const c of [
  {name:'basic',         o:{}},
  {name:'no outer lip',  o:{filletTop:0}},
  {name:'vert only',     o:{filletInnerFloor:0, filletInnerVert:9}},
  {name:'with taper',    o:{taperXPlus:6, taperZMinus:4}},
  {name:'inner lip set', o:{filletInnerLip:5}},
]) {
  base(Object.assign({ hollow:true, width:80, height:60, depth:70, wallThickness:4,
    filletTop:5, filletBottom:7, filletVert:9, filletInnerFloor:6, filletInnerVert:8, filletInnerLip:0, filletSeg:6 }, c.o));
  const p = paramState.box;
  const tris = buildTrisForShape('box', p);
  const mc = manifoldCheck(tris, 5);
  check(c.name + ' watertight', !hasNaN(tris) && mc.watertight, mc);
}

console.log('\n=== sub-slider fillets snap to sharp (no fragile sliver) ===');
{
  // inner vert clamped/entered tiny -> RSNAP should zero it, keeping the mesh watertight.
  base({ rim:true, width:80, height:50, depth:70, wallThickness:5, rimHeight:20,
    filletInnerFloor:3.5, filletInnerVert:0.05, filletInnerLip:0, filletTop:4, filletBottom:1.5, filletVert:1.4, filletSeg:9 });
  const p = paramState.box;
  const tris = buildTrisForShape('box', p);
  const mc = manifoldCheck(tris, 5);
  check('tiny inner vert snapped, watertight', !hasNaN(tris) && mc.watertight, mc);
}

console.log('\n=== TOTAL:', pass, 'passed,', fail, 'failed ===');
