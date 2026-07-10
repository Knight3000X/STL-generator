// Fillet + logo compatibility on the SOLID box: a logo relief on a filleted face must stay watertight,
// and the clamp must keep the logo inside the flat region (never reaching into an edge fillet, which
// would break the seam with the edge cylinders). Exercises the real buildTrisForShape routing.
// Run against the real file:
//   awk '/<script>/{f=1;next}/<\/script>/{f=0}f' parametric-stl-generator.html \
//     | sed '$ { /^init();$/d }' > /tmp/lib.js
//   cat stub_preamble.js /tmp/lib.js test_fillet_logo.js > /tmp/run.js && node /tmp/run.js

let pass=0, fail=0;
function check(name, cond, extra){ if(cond){pass++;console.log('  OK  ',name);} else {fail++;console.log('  FAIL',name, extra!==undefined?JSON.stringify(extra):'');} }
function hasNaN(t){for(const tr of t)for(const p of tr)for(const c of p)if(!Number.isFinite(c))return true;return false;}

// Synthetic heightmap: ring + diagonal bar -> plenty of relief walls to stress watertightness.
function synthHM(){
  const N=LOGO_HM_SIZE, hm=new Float32Array(N*N);
  for(let y=0;y<N;y++)for(let x=0;x<N;x++){ const fx=x/N-0.5, fy=y/N-0.5, r=Math.hypot(fx,fy);
    hm[y*N+x]=((r>0.28&&r<0.40)||(Math.abs(fx-fy)<0.06&&r<0.42))?1:0; }
  return hm;
}
const HM = synthHM();
function base(boxOv){
  Object.assign(paramState.box, {
    width:40,height:40,depth:40,hollow:false,rim:false,wallThickness:2,rimHeight:8,filletSeg:6,
    filletRadius:0,filletTop:0,filletBottom:0,filletVert:0,filletInnerFloor:0,filletInnerVert:0,filletInnerLip:0,
    taperXPlus:0,taperXMinus:0,taperZPlus:0,taperZMinus:0,taperYPlusX:0,taperYPlusZ:0,taperYMinusX:0,taperYMinusZ:0}, boxOv);
  logos.length = 0;
}
function addLogo(ov){ const l=Object.assign({id:nextLogoId++, face:'+Z', u0:0,v0:0, w:16,h:16, depth:1.5, threshold:0.5, invert:false, rotation:0, heightmap:HM, previewUrl:null}, ov); logos.push(l); clampLogoToFace(l); return l; }
function wt(name, boxOv, logoOvs){
  base(boxOv); for(const o of (logoOvs||[{}])) addLogo(o);
  const tris = buildTrisForShape('box', paramState.box);
  const mc = manifoldCheck(tris, 5);
  check(name, !hasNaN(tris) && mc.watertight, mc);
}

console.log('=== solid rounded box + logo relief (watertight via buildTrisForShape) ===');
wt('uniform r8 +Z',        {filletTop:8,filletBottom:8,filletVert:8}, [{}]);
wt('uniform r8 engraved',  {filletTop:8,filletBottom:8,filletVert:8}, [{depth:-1.5}]);
wt('asym fillet +Z',       {filletTop:12,filletBottom:3,filletVert:8}, [{}]);
wt('big fillet r14',       {filletTop:14,filletBottom:14,filletVert:14}, [{}]);
wt('filletRadius (uni)',   {filletRadius:6}, [{}]);
wt('logo on +Y (top)',     {filletTop:8,filletBottom:8,filletVert:8}, [{face:'+Y'}]);
wt('logo on -X',           {filletTop:8,filletBottom:8,filletVert:8}, [{face:'-X'}]);
wt('rotated 30',           {filletTop:8,filletBottom:8,filletVert:8}, [{rotation:30}]);
wt('with taper',           {filletTop:8,filletBottom:8,filletVert:8, taperXPlus:8, taperZMinus:6}, [{}]);
wt('two logos diff faces', {filletTop:8,filletBottom:8,filletVert:8}, [{face:'+Z'},{face:'+X'}]);
wt('two logos same face',  {filletTop:8,filletBottom:8,filletVert:8}, [{u0:-6},{u0:6}]);

console.log('\n=== clamp keeps logo inside the flat region ===');
{
  base({filletTop:8,filletBottom:8,filletVert:8});
  const l = addLogo({w:100,h:100, u0:50, v0:50}); // ask for huge, off-edge
  // flat half on +Z = depth/2 - vert = 20-8 = 12; usable half ~ 12-1.5margin = 10.5 -> w<=21, |u0| small
  check('oversize logo clamped to flat zone', l.w <= 21.01 && Math.abs(l.u0) < 11 && Math.abs(l.v0) < 11, {w:l.w,u0:l.u0,v0:l.v0});
  const tris = buildTrisForShape('box', paramState.box);
  check('clamped oversize logo watertight', manifoldCheck(tris,5).watertight);
}
{
  // Raising the fillet after placement must re-clamp (handled by the input listener via LOGO_CLAMP_KEYS);
  // here we emulate it: place with small fillet, then raise fillet + re-clamp, expect still watertight.
  base({filletTop:2,filletBottom:2,filletVert:2}); const l=addLogo({w:16,h:16});
  paramState.box.filletTop=14; paramState.box.filletBottom=14; paramState.box.filletVert=14;
  clampLogoToFace(l);
  check('re-clamp after fillet raised keeps watertight', manifoldCheck(buildTrisForShape('box',paramState.box),5).watertight, {w:l.w});
}

console.log('\n=== no regression: fillet without logos, logos without fillet ===');
{ base({filletTop:8,filletBottom:8,filletVert:8}); check('fillet, no logo', manifoldCheck(buildTrisForShape('box',paramState.box),5).watertight); }
{ base({}); addLogo({}); check('logo, no fillet (flat box path)', manifoldCheck(buildTrisForShape('box',paramState.box),5).watertight); }

console.log('\n=== TOTAL:', pass, 'passed,', fail, 'failed ===');
