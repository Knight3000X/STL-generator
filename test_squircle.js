// Squircle PRISM (супереллипс): the horizontal cross-section is a superellipse, exercised through the
// REAL buildTrisForShape routing (p.squircle>0 -> buildSquirclePrism). Must stay watertight across
// roundness, sizes and taper; squircle=0 must fall back to the plain box unchanged.
// Run against the real file:
//   awk '/<script>/{f=1;next}/<\/script>/{f=0}f' parametric-stl-generator.html \
//     | sed '$ { /^init();$/d }' > /tmp/lib.js
//   cat stub_preamble.js /tmp/lib.js test_squircle.js > /tmp/run.js && node /tmp/run.js

let pass=0, fail=0;
function chk(name,cond,extra){ if(cond){pass++;console.log('  OK  ',name);} else {fail++;console.log('  FAIL',name, extra!==undefined?JSON.stringify(extra):'');} }
function hasNaN(t){for(const tr of t)for(const p of tr)for(const c of p)if(!Number.isFinite(c))return true;return false;}
function signedVol(tris){let v=0;for(const t of tris){const a=t[0],b=t[1],c=t[2];v+=(a[0]*(b[1]*c[2]-b[2]*c[1])-a[1]*(b[0]*c[2]-b[2]*c[0])+a[2]*(b[0]*c[1]-b[1]*c[0]))/6;}return v;}
function base(ov){
  Object.assign(paramState.box,{width:60,height:42,depth:60,hollow:false,rim:false,wallThickness:4,rimHeight:8,filletSeg:8,
    filletRadius:0,filletTop:0,filletBottom:0,filletVert:0,filletInnerFloor:0,filletInnerVert:0,filletInnerLip:0,squircle:0,squircleV:0,
    latticeFloor:false,latticeCell:8,latticeRib:2,latticeBorder:1,
    bulgeXPlus:0,bulgeXMinus:0,bulgeZPlus:0,bulgeZMinus:0,bulgeYPlus:0,bulgeYMinus:0,
    taperXPlus:0,taperXMinus:0,taperZPlus:0,taperZMinus:0,taperYPlusX:0,taperYPlusZ:0,taperYMinusX:0,taperYMinusZ:0},ov);
  logos.length=0;
}
function build(){ return buildTrisForShape('box', paramState.box); }
function wt(t){ return manifoldCheck(t).watertight; }

console.log('=== regression: squircle=0 is the plain sharp box ===');
base({});
{ const t=build(); chk('squircle=0: watertight', wt(t)); chk('squircle=0: minimal box (12 tris)', t.length===12, t.length); }

console.log('\n=== watertight across roundness (top-down cross-section = superellipse) ===');
for (const s of [8, 20, 30, 45, 60, 80, 100]) {
  base({squircle:s});
  const t=build();
  chk(`squircle=${s}%: watertight`, wt(t) && !hasNaN(t) && signedVol(t)>0, {open:manifoldCheck(t).openEdges, vol:signedVol(t)|0, tris:t.length});
}

console.log('\n=== non-cube footprint + taper ===');
base({squircle:45, width:80, height:30, depth:50});
{ const t=build(); chk('non-cube squircle: watertight', wt(t)); chk('non-cube squircle: positive volume', signedVol(t)>0); }
base({squircle:50, taperXPlus:14, taperZMinus:10});
{ const t=build(); chk('squircle + taper: watertight', wt(t)); chk('squircle + taper: no NaN', !hasNaN(t)); }

console.log('\n=== roundness monotonicity: rounder = less volume (ellipse < square) ===');
base({squircle:12}); const volBoxy = signedVol(build());
base({squircle:100}); const volEllipse = signedVol(build());
chk('volume(100% ellipse) < volume(12% ~square)', volEllipse < volBoxy, {ellipse:volEllipse|0, boxy:volBoxy|0});

console.log('\n=== squircle overrides corner fillet (it IS the corner treatment) ===');
base({squircle:45}); const sq = build();
base({squircle:45, filletVert:10, filletTop:8, filletBottom:8}); const sqWithFillet = build();
chk('squircle+fillet: watertight', wt(sqWithFillet));
chk('squircle+fillet == squircle-only (fillet ignored)', sqWithFillet.length === sq.length, {sq:sq.length, both:sqWithFillet.length});

console.log('\n=== superellipsoid: rounded top/bottom edges too (squircleV>0) ===');
for (const sv of [20, 45, 70, 100]) {
  base({squircle:45, squircleV:sv});
  const t=build();
  chk(`squircle=45 squircleV=${sv}%: watertight`, wt(t) && !hasNaN(t) && signedVol(t)>0, {open:manifoldCheck(t).openEdges, tris:t.length});
}
base({squircle:45, squircleV:50}); const ellipsoid = build();
base({squircle:45, squircleV:0});  const prism = build();
chk('squircleV>0 changes the mesh vs flat-top prism', ellipsoid.length !== prism.length, {prism:prism.length, ellipsoid:ellipsoid.length});
chk('superellipsoid has less volume than the prism (top/bottom rounded off)', signedVol(ellipsoid) < signedVol(prism), {prism:signedVol(prism)|0, ellipsoid:signedVol(ellipsoid)|0});
base({squircle:60, squircleV:60, width:80, height:34, depth:52, taperXPlus:10});
{ const t=build(); chk('superellipsoid non-cube + taper: watertight', wt(t)); chk('superellipsoid non-cube + taper: no NaN', !hasNaN(t)); }
base({squircle:100, squircleV:100}); // fully round both ways = ellipsoid
{ const t=build(); chk('full ellipsoid (100/100): watertight', wt(t) && signedVol(t)>0); }

console.log('\n=== TOTAL:', pass, 'passed,', fail, 'failed ===');
process.exit(fail>0?1:0);
