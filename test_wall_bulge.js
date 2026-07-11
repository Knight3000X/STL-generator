// Wall bulge (скругление стенок) on the SOLID cube, exercised through the REAL buildTrisForShape
// routing (hasWallBulge -> buildBoxWithLogos with the bulge dispFn, added to any logo relief). Each
// flat face bows out (+, convex) or in (-, concave) as a dome that falls to 0 at every edge, so the
// mesh must stay watertight — with per-face signs, taper, overlapping logos, and the concave clamp.
// Run against the real file:
//   awk '/<script>/{f=1;next}/<\/script>/{f=0}f' parametric-stl-generator.html \
//     | sed '$ { /^init();$/d }' > /tmp/lib.js
//   cat stub_preamble.js /tmp/lib.js test_wall_bulge.js > /tmp/run.js && node /tmp/run.js

let pass=0, fail=0;
function chk(name,cond,extra){ if(cond){pass++;console.log('  OK  ',name);} else {fail++;console.log('  FAIL',name, extra!==undefined?JSON.stringify(extra):'');} }
function hasNaN(t){for(const tr of t)for(const p of tr)for(const c of p)if(!Number.isFinite(c))return true;return false;}
function synthHM(){ const N=LOGO_HM_SIZE, hm=new Float32Array(N*N);
  for(let y=0;y<N;y++)for(let x=0;x<N;x++){ const fx=x/N-0.5, fy=y/N-0.5, r=Math.hypot(fx,fy);
    hm[y*N+x]=((r>0.28&&r<0.40)||(Math.abs(fx-fy)<0.06&&r<0.42))?1:0; } return hm; }
const HM=synthHM();
function base(ov){
  Object.assign(paramState.box,{width:40,height:40,depth:40,hollow:false,rim:false,wallThickness:3,rimHeight:8,filletSeg:6,
    filletRadius:0,filletTop:0,filletBottom:0,filletVert:0,filletInnerFloor:0,filletInnerVert:0,filletInnerLip:0,
    latticeFloor:false,latticeCell:8,latticeRib:2,latticeBorder:1,
    bulgeXPlus:0,bulgeXMinus:0,bulgeZPlus:0,bulgeZMinus:0,bulgeYPlus:0,bulgeYMinus:0,
    taperXPlus:0,taperXMinus:0,taperZPlus:0,taperZMinus:0,taperYPlusX:0,taperYPlusZ:0,taperYMinusX:0,taperYMinusZ:0},ov);
  logos.length=0;
}
function addLogo(ov, clamp){ const l=Object.assign({id:nextLogoId++,face:'+X',u0:0,v0:0,w:14,h:14,depth:1.5,threshold:0.5,invert:false,rotation:0,heightmap:HM,previewUrl:null},ov); logos.push(l); if(clamp) clampLogoToFace(l); return l; }
function build(){ return buildTrisForShape('box', paramState.box); }
function wt(t){ return manifoldCheck(t).watertight; }

console.log('=== regression: no bulge = unchanged sharp cube ===');
base({});
{ const t=build(); chk('no bulge: watertight', wt(t)); chk('no bulge: minimal tri count (12)', t.length===12, t.length);
  chk('hasWallBulge false', hasWallBulge(paramState.box)===false); }

console.log('\n=== single wall, convex vs concave ===');
base({bulgeXPlus:6});
{ const t=build(); chk('convex +X: watertight', wt(t)); chk('convex +X: no NaN', !hasNaN(t)); chk('convex +X: face gridded (many tris)', t.length>12, t.length);
  const bb=computeBBox(t); chk('convex +X: pushes maxX out to ~hw+amp', Math.abs(bb.maxX-(20+6))<1e-3, bb.maxX); }
base({bulgeXPlus:-6});
{ const t=build(); chk('concave +X: watertight', wt(t));
  const bb=computeBBox(t); chk('concave +X: edges stay at hw (bbox maxX ~20)', Math.abs(bb.maxX-20)<1e-3, bb.maxX);
  chk('concave +X: dips inward (minX side untouched, some vert < hw)', bb.minX<=-20+1e-9); }

console.log('\n=== all six faces, mixed signs ===');
base({bulgeXPlus:8,bulgeXMinus:-5,bulgeZPlus:10,bulgeZMinus:-4,bulgeYPlus:6,bulgeYMinus:-3});
{ const t=build(); chk('mixed 6: watertight', wt(t)); chk('mixed 6: no NaN', !hasNaN(t)); }
base({width:60,height:36,depth:50,bulgeXPlus:7,bulgeZMinus:-6,bulgeYPlus:5});
{ const t=build(); chk('non-cube mixed: watertight', wt(t)); }

console.log('\n=== bulge + taper ===');
base({bulgeXPlus:8,bulgeZPlus:-6,taperXPlus:12,taperZMinus:8});
{ const t=build(); chk('bulge+taper: watertight', wt(t)); chk('bulge+taper: no NaN', !hasNaN(t)); }

console.log('\n=== bulge + logo on the SAME face (relief adds to bulge) ===');
base({bulgeXPlus:6}); addLogo({face:'+X',u0:0,v0:0,w:16,h:16,depth:2},true);
{ const t=build(); chk('bulge+logo(+X): watertight', wt(t)); chk('bulge+logo(+X): no NaN', !hasNaN(t));
  const bb=computeBBox(t); chk('bulge+logo: peak = hw+bulge+logoDepth', bb.maxX>20+6+1-1e-6, bb.maxX); }
base({bulgeZPlus:5}); addLogo({face:'+Z',u0:0,v0:0,w:14,h:14,depth:1.5},true); addLogo({face:'+X',u0:0,v0:0,w:12,h:12,depth:1.5},true);
{ const t=build(); chk('bulge + logos on different faces: watertight', wt(t)); }

console.log('\n=== concave clamp (opposite walls cannot cross) ===');
base({width:40,bulgeXPlus:-500,bulgeXMinus:-500}); // way past the -0.45*width cap
{ const amps=wallBulgeAmounts(paramState.box); chk('concave clamp: |amp| <= 0.45*width', Math.abs(amps['+X'])<=0.45*40+1e-9, amps['+X']);
  const t=build(); chk('extreme concave both walls: watertight', wt(t)); chk('extreme concave: no NaN', !hasNaN(t)); }

console.log('\n=== precedence: bulge wins over corner rounding, still watertight ===');
base({bulgeXPlus:8,filletTop:6,filletBottom:6,filletVert:6});
{ const t=build(); chk('bulge+fillet set: watertight', wt(t));
  base({filletTop:6,filletBottom:6,filletVert:6}); const noBulge=build();
  base({bulgeXPlus:8,filletTop:6,filletBottom:6,filletVert:6}); const withBulge=build();
  chk('bulge changes the mesh vs pure fillet (bulge took precedence)', withBulge.length!==noBulge.length, {fillet:noBulge.length, bulge:withBulge.length}); }

console.log('\n=== TOTAL:', pass, 'passed,', fail, 'failed ===');
process.exit(fail>0?1:0);
