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

// ---- logos on the curved squircle / superellipsoid wall ----
// Synthetic heightmap: ring + diagonal bar -> lots of relief walls to stress watertightness.
function synthHM(){ const n=LOGO_HM_SIZE, hm=new Float32Array(n*n);
  for(let y=0;y<n;y++)for(let x=0;x<n;x++){ const fx=x/n-0.5, fy=y/n-0.5, r=Math.hypot(fx,fy);
    hm[y*n+x]=((r>0.28&&r<0.40)||(Math.abs(fx-fy)<0.06&&r<0.42))?1:0; }
  return hm; }
const HM=synthHM();
function addLogo(ov){ const l=Object.assign({id:nextLogoId++, face:'+Z', u0:0, v0:0, w:16, h:16, depth:1.5, threshold:0.5, invert:false, rotation:0, heightmap:HM, previewUrl:null}, ov); logos.push(l); clampLogoToFace(l); return l; }
function wtLogo(name, ov, logoOvs){ base(ov); for(const o of (logoOvs||[{}])) addLogo(o); const t=build(); chk(name, !hasNaN(t) && manifoldCheck(t).watertight, manifoldCheck(t)); return t; }
// These logo tests validate watertightness / valence / signs — all density-INDEPENDENT — so run the
// emboss grid light to keep the suite fast (the app default is ~2× denser; that only changes triangle
// count, not any property asserted here).
logoResolution = 24; logoResolutionHollow = 24;

console.log('\n=== logos emboss onto the squircle PRISM wall (watertight) ===');
const solidPrism = (()=>{ base({squircle:45}); return build().length; })();
{ const t=wtLogo('squircle prism + logo on +Z (curved side)', {squircle:45}, [{face:'+Z'}]);
  chk('logo path densifies the mesh vs plain prism', t.length > solidPrism, {plain:solidPrism, withLogo:t.length}); }
wtLogo('squircle prism + logo on +X',            {squircle:45}, [{face:'+X'}]);
wtLogo('squircle prism + logo on -X',            {squircle:45}, [{face:'-X'}]);
wtLogo('squircle prism + logo on -Z',            {squircle:45}, [{face:'-Z'}]);
wtLogo('squircle prism + logo on +Y (flat cap)', {squircle:45}, [{face:'+Y'}]);
wtLogo('squircle prism + logo on -Y (flat cap)', {squircle:45}, [{face:'-Y'}]);
wtLogo('squircle prism + engraved logo',         {squircle:45}, [{depth:-1.2}]);
wtLogo('squircle prism + rotated logo',          {squircle:45}, [{rotation:30}]);
wtLogo('rounder squircle (70%) + logo',          {squircle:70}, [{face:'+Z'}]);
wtLogo('boxier squircle (20%) + logo',           {squircle:20}, [{face:'+Z'}]);
wtLogo('squircle + logo + taper',                {squircle:45, taperXPlus:8, taperZMinus:6}, [{face:'+Z'}]);
wtLogo('squircle + two logos, different faces',  {squircle:45}, [{face:'+Z'},{face:'+X'}]);
wtLogo('squircle + two logos, same face',        {squircle:45}, [{face:'+Z', u0:-8},{face:'+Z', u0:8}]);
wtLogo('non-cube squircle + logo',               {squircle:45, width:80, height:34, depth:52}, [{face:'+Z'}]);

console.log('\n=== logos emboss onto the SUPERELLIPSOID wall (watertight) ===');
const solidSE = (()=>{ base({squircle:45, squircleV:40}); return build().length; })();
{ const t=wtLogo('superellipsoid + logo on +Z', {squircle:45, squircleV:40}, [{face:'+Z'}]);
  chk('superellipsoid logo path densifies the mesh', t.length > solidSE, {plain:solidSE, withLogo:t.length}); }
wtLogo('superellipsoid + logo on +X',        {squircle:45, squircleV:40}, [{face:'+X'}]);
wtLogo('superellipsoid + logo on top pole',  {squircle:45, squircleV:40}, [{face:'+Y'}]);
wtLogo('superellipsoid + engraved logo',     {squircle:45, squircleV:40}, [{depth:-1.2}]);
wtLogo('superellipsoid + rotated logo',      {squircle:45, squircleV:40}, [{rotation:25}]);
wtLogo('rounder superellipsoid (80/80)+logo',{squircle:80, squircleV:80}, [{face:'+Z'}]);
wtLogo('superellipsoid + taper + logo',      {squircle:60, squircleV:50, taperXPlus:8}, [{face:'+Z'}]);
wtLogo('superellipsoid non-cube + two logos',{squircle:50, squircleV:45, width:80, height:34, depth:52}, [{face:'+Z'},{face:'-X'}]);

console.log('\n=== no-logo path is unchanged (regression) ===');
{ base({squircle:45}); const a=build().length; base({squircle:45}); logos.length=0; const b=build().length; chk('no-logo prism deterministic + logo-free', a===b && a===solidPrism, {a,b}); }

console.log('\n=== squircle as a HOLLOW container (watertight shell) ===');
for (const s of [12, 30, 45, 70, 100]) {
  base({squircle:s, hollow:true, wallThickness:4});
  const t=build(); chk(`hollow squircle ${s}%: watertight`, wt(t) && !hasNaN(t) && signedVol(t)>0, {open:manifoldCheck(t).openEdges, vol:signedVol(t)|0});
}
base({squircle:45, hollow:true, wallThickness:2});
{ const solid=(()=>{ base({squircle:45}); return signedVol(build()); })(); base({squircle:45, hollow:true, wallThickness:2});
  chk('hollow removes material (cavity < solid volume)', signedVol(build()) < solid, {}); }
base({squircle:45, hollow:true, wallThickness:8, width:80, height:36, depth:52});
{ const t=build(); chk('hollow squircle non-cube + thick wall: watertight', wt(t)); chk('hollow squircle non-cube: no NaN', !hasNaN(t)); }
base({squircle:45, hollow:true, wallThickness:4, taperXPlus:8, taperZMinus:6});
{ const t=build(); chk('hollow squircle + taper: watertight', wt(t)); }
base({squircle:45, hollow:true, wallThickness:4, squircleV:0}); const hollowFlatTop=build();
base({squircle:45, hollow:true, wallThickness:4, squircleV:60}); const hollowRoundV=build();
chk('hollow ignores squircleV (open container has a flat rim)', hollowFlatTop.length===hollowRoundV.length && Math.abs(signedVol(hollowFlatTop)-signedVol(hollowRoundV))<1e-6, {a:hollowFlatTop.length,b:hollowRoundV.length});

console.log('\n=== squircle as a RIM / tray (shallow pocket, solid base) ===');
for (const s of [12, 30, 45, 70]) {
  base({squircle:s, rim:true, wallThickness:4, rimHeight:10});
  const t=build(); chk(`tray squircle ${s}%: watertight`, wt(t) && !hasNaN(t) && signedVol(t)>0, {open:manifoldCheck(t).openEdges});
}
base({squircle:45, rim:true, wallThickness:5, rimHeight:6, width:80, depth:52});
{ const t=build(); chk('tray squircle non-cube: watertight', wt(t)); }
base({squircle:45, rim:true, wallThickness:4, rimHeight:10, taperXPlus:6});
{ const t=build(); chk('tray squircle + taper: watertight', wt(t)); }
{ base({squircle:45, rim:true, wallThickness:4, rimHeight:10}); const vTray=signedVol(build());
  base({squircle:45, hollow:true, wallThickness:4}); const vHollow=signedVol(build());
  chk('tray keeps more material than the deep hollow', vTray > vHollow, {tray:vTray|0, hollow:vHollow|0}); }

console.log('\n=== logos on the hollow / tray squircle (walls + bottom + cavity floor) ===');
wtLogo('hollow squircle + logo on +Z wall',      {squircle:45, hollow:true, wallThickness:4}, [{face:'+Z'}]);
wtLogo('hollow squircle + logo on -X wall',      {squircle:45, hollow:true, wallThickness:4}, [{face:'-X'}]);
wtLogo('hollow squircle + logo on -Y (bottom)',  {squircle:45, hollow:true, wallThickness:4}, [{face:'-Y'}]);
wtLogo('hollow squircle + logo on cavity floor', {squircle:45, hollow:true, wallThickness:5}, [{face:'-Y-inner'}]);
wtLogo('hollow squircle + engraved wall logo',   {squircle:45, hollow:true, wallThickness:5}, [{face:'+Z', depth:-1.2}]);
wtLogo('hollow squircle + two wall logos',       {squircle:45, hollow:true, wallThickness:4}, [{face:'+Z'},{face:'+X'}]);
wtLogo('hollow squircle + wall + floor logos',   {squircle:45, hollow:true, wallThickness:5}, [{face:'+Z'},{face:'-Y-inner'}]);
wtLogo('tray squircle + logo on +Z wall',        {squircle:45, rim:true, wallThickness:4, rimHeight:12}, [{face:'+Z'}]);
wtLogo('tray squircle + logo on pocket floor',   {squircle:45, rim:true, wallThickness:4, rimHeight:12}, [{face:'-Y-inner'}]);
wtLogo('tray squircle + logo + taper',           {squircle:45, rim:true, wallThickness:4, rimHeight:12, taperXPlus:6}, [{face:'+Z'}]);

console.log('\n=== cap / pole logos: no radial-fan singularity (regression on the spike bug) ===');
// A radial-fan apex is incident to ~N triangles; a Cartesian / cube-sphere grid caps out around 6.
// This is what made a top/pole logo smear into radial spikes, so bound the max vertex valence.
function maxVertexValence(tris){ const m=new Map(), key=p=>p[0].toFixed(4)+','+p[1].toFixed(4)+','+p[2].toFixed(4);
  for(const t of tris) for(const p of t){ const k=key(p); m.set(k,(m.get(k)||0)+1); }
  let mx=0; for(const v of m.values()) if(v>mx) mx=v; return mx; }
{ base({squircle:45}); addLogo({face:'+Y'}); const t=build();
  chk('prism +Y cap logo: watertight', wt(t)); chk('prism +Y cap: no fan apex (max valence <= 12)', maxVertexValence(t)<=12, {maxVal:maxVertexValence(t)}); }
{ base({squircle:45}); addLogo({face:'-Y'}); const t=build();
  chk('prism -Y cap: no fan apex (max valence <= 12)', maxVertexValence(t)<=12, {maxVal:maxVertexValence(t)}); }
{ base({squircle:45, squircleV:45}); addLogo({face:'+Y'}); const t=build();
  chk('superellipsoid top logo: watertight', wt(t)); chk('superellipsoid top: no pole fan (max valence <= 12)', maxVertexValence(t)<=12, {maxVal:maxVertexValence(t)}); }
{ base({squircle:60, squircleV:70}); addLogo({face:'-Y'}); const t=build();
  chk('superellipsoid bottom: no pole fan (max valence <= 12)', maxVertexValence(t)<=12, {maxVal:maxVertexValence(t)}); }
{ base({squircle:45, hollow:true, wallThickness:5}); addLogo({face:'-Y-inner'}); const t=build();
  chk('hollow cavity-floor logo: watertight', wt(t)); chk('hollow cavity floor: no fan apex (max valence <= 12)', maxVertexValence(t)<=12, {maxVal:maxVertexValence(t)}); }
{ base({squircle:45, hollow:true, wallThickness:5}); addLogo({face:'-Y'}); const t=build();
  chk('hollow outer-bottom logo: no fan apex (max valence <= 12)', maxVertexValence(t)<=12, {maxVal:maxVertexValence(t)}); }

console.log('\n=== zone densification: cost tracks the logo footprint, not the whole surface ===');
{ const save=logoResolution; logoResolution=300;   // high detail: fine grid should stay local to the logo
  base({squircle:45, squircleV:45}); addLogo({face:'+Y', w:8,  h:8 }); const small=build().length;
  base({squircle:45, squircleV:45}); addLogo({face:'+Y', w:44, h:44}); const big=build().length;
  chk('small +Y logo far cheaper than a full-face one', small < big*0.7, {small, big});
  base({squircle:45}); addLogo({face:'+Z', w:8, h:8}); const sSmall=build().length;
  base({squircle:45}); addLogo({face:'+Z', w:44, h:30}); const sBig=build().length;
  chk('small side logo far cheaper than a big one', sSmall < sBig*0.7, {sSmall, sBig});
  logoResolution=save; }

console.log('\n=== high detail stays watertight + spike-free (~0.5M tris) ===');
{ const save=logoResolution; logoResolution=300;   // hits the cube-sphere cap (S=260)
  base({squircle:45, squircleV:45}); addLogo({face:'+Y'}); const t=build();
  chk('superellipsoid @ high detail: watertight', wt(t) && !hasNaN(t), {tris:t.length, open:manifoldCheck(t).openEdges});
  chk('superellipsoid @ high detail: no fan apex', maxVertexValence(t)<=12);
  logoResolution=save; }

console.log('\n=== TOTAL:', pass, 'passed,', fail, 'failed ===');
process.exit(fail>0?1:0);
