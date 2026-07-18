// Polyhedron shape: N-gon prism (configurable sides, optional rounded edges; solid / hollow container)
// + Platonic solids, through the REAL buildTrisForShape pipeline. Watertight + volume, taper (height
// preserved), organizer add-ons gated off, cube regression, and slicing. Run via ./run-all.sh.
let pass=0,fail=0; function chk(n,c,e){if(c){pass++;console.log('  OK  ',n);}else{fail++;console.log('  FAIL',n,e!==undefined?JSON.stringify(e):'');}}
function vol(t){let v=0;for(const T of t){const a=T[0],b=T[1],c=T[2];v+=(a[0]*(b[1]*c[2]-b[2]*c[1])-a[1]*(b[0]*c[2]-b[2]*c[0])+a[2]*(b[0]*c[1]-b[1]*c[0]))/6;}return v;}
function base(ov){ logos.length=0; boxHoles.length=0;
  Object.assign(paramState.box, defaultBoxParams(), {width:60,height:40,depth:60,hollow:false,polyN:0,polyRound:0,platonic:'none',
    scoopDir:'none',labelTab:'none',mountHoles:'none',gripWall:'none',divX:1,divZ:1,stackFeet:false,gfOn:false,
    taperXPlus:0,taperYPlusX:0,taperYPlusZ:0}, ov);
  return buildTrisForShape('box',paramState.box); }
console.log('=== N-gon prism through pipeline ===');
for(const N of [3,5,6,8,12]){ const t=base({polyN:N}); const mc=manifoldCheck(t,4); chk('solid N='+N+' wt',mc.watertight&&vol(t)>0,mc); }
console.log('=== N-gon hollow ===');
for(const N of [4,6,8]){ const t=base({polyN:N,hollow:true,wallThickness:3}); const mc=manifoldCheck(t,4); chk('hollow N='+N+' wt',mc.watertight&&vol(t)>0,mc); }
console.log('=== rounded edges + taper ===');
chk('hex round6 wt', manifoldCheck(base({polyN:6,polyRound:6}),4).watertight);
{ const t=base({polyN:6,taperYPlusX:20}); const b=computeBBox(t); chk('hex + top tilt: watertight + height preserved', manifoldCheck(t,4).watertight && Math.abs((b.maxY-b.minY)-40)<0.2, {h:(b.maxY-b.minY)}); }
chk('oct hollow + taper wt', manifoldCheck(base({polyN:8,hollow:true,wallThickness:3,taperXPlus:12}),4).watertight);
console.log('=== Platonic through pipeline ===');
for(const k of ['tetrahedron','octahedron','dodecahedron','icosahedron']){ const t=base({platonic:k}); const mc=manifoldCheck(t,4); chk(k+' wt',mc.watertight&&vol(t)>0,mc); }
chk('platonic + taper wt', manifoldCheck(base({platonic:'icosahedron',taperXPlus:10}),4).watertight);
console.log('=== organizer add-ons gated off (no effect) on polyN ===');
{ const a=base({polyN:6}).length; const b=base({polyN:6,scoopDir:'front',gripWall:'front',mountHoles:'4',divX:2,stackFeet:true}).length;
  chk('scoop/grip/ears/dividers/feet skipped on poly (same mesh)', a===b, {a,b}); }
console.log('=== regression: polyN=0 is the normal cube ===');
{ const a=base({polyN:0}); const mc=manifoldCheck(a,4); const bb=computeBBox(a);
  chk('cube still watertight + full size', mc.watertight && Math.abs((bb.maxX-bb.minX)-60)<1e-6, mc); }
console.log('=== slicing works on a polyhedron ===');
{ const t=base({polyN:6,hollow:true,wallThickness:3}); const {frags}=sliceMeshIntoFragments(t,35,35,35);
  let ok=frags.length>1; for(const f of frags) if(!manifoldCheck(f.tris,4).watertight) ok=false;
  chk('hex container slices into watertight fragments', ok, {n:frags.length}); }
console.log('\n=== TOTAL:',pass,'passed,',fail,'failed ===');
process.exit(fail?1:0);
