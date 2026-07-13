// Cylindrical through-holes on the plain solid box (buildBoxWithHoles + the buildTrisForShape gate).
// Watertight is the whole point: each pierced face is an annulus (border grid-ring ↔ circle) and the
// bore reuses the same circle sampling, so rims coincide exactly. Run against the real file:
//   awk '/<script>/{f=1;next}/<\/script>/{f=0}f' parametric-stl-generator.html \
//     | sed '$ { /^init();$/d }' > /tmp/lib.js
//   cat stub_preamble.js /tmp/lib.js test_holes.js > /tmp/run.js && node /tmp/run.js

let pass=0, fail=0;
function chk(n,c,x){ if(c){pass++;console.log('  OK  ',n);} else {fail++;console.log('  FAIL',n,x!==undefined?JSON.stringify(x):'');} }
function hasNaN(t){for(const tr of t)for(const p of tr)for(const c of p)if(!Number.isFinite(c))return true;return false;}
function signedVol(t){let v=0;for(const T of t){const a=T[0],b=T[1],c=T[2];v+=(a[0]*(b[1]*c[2]-b[2]*c[1])-a[1]*(b[0]*c[2]-b[2]*c[0])+a[2]*(b[0]*c[1]-b[1]*c[0]))/6;}return v;}
function wt(t){ return manifoldCheck(t,4).watertight; }

console.log('=== buildBoxWithHoles: watertight across configs ===');
const cases = [
  ['1 hole Z centered',        40,40,40, [{axis:2,cp:0,cq:0,r:6}]],
  ['1 hole X off-center',      50,40,60, [{axis:0,cp:8,cq:-10,r:5}]],
  ['1 hole Y',                 40,40,40, [{axis:1,cp:0,cq:0,r:2}]],
  ['2 holes same axis',        60,40,60, [{axis:2,cp:-14,cq:0,r:5},{axis:2,cp:14,cq:8,r:6}]],
  ['holes on 3 axes',          60,60,60, [{axis:2,cp:18,cq:18,r:5},{axis:0,cp:-18,cq:-18,r:5},{axis:1,cp:0,cq:0,r:4}]],
  ['non-cube + big hole',      90,30,50, [{axis:2,cp:0,cq:0,r:10}]],
];
for (const [name,w,h,d,holes] of cases) {
  const t = buildBoxWithHoles(w,h,d,holes);
  const mc = manifoldCheck(t,4);
  chk(name+': watertight', mc.watertight && !hasNaN(t), {open:mc.openEdges, bad:mc.badEdges, tris:t.length});
  chk(name+': positive volume', signedVol(t)>0, signedVol(t)|0);
}

console.log('\n=== a hole removes material (volume drops vs the solid box) ===');
{ const solid = buildBoxWithHoles(40,40,40,[]); const holed = buildBoxWithHoles(40,40,40,[{axis:2,cp:0,cq:0,r:8}]);
  chk('holed volume < solid volume', signedVol(holed) < signedVol(solid), {solid:signedVol(solid)|0, holed:signedVol(holed)|0}); }

console.log('\n=== buildTrisForShape gate: holes only on the plain solid box ===');
function base(ov){
  Object.assign(paramState.box,{width:50,height:40,depth:60,hollow:false,rim:false,wallThickness:4,rimHeight:8,filletSeg:4,filletAxisRes:0,
    filletRadius:0,filletTop:0,filletBottom:0,filletVert:0,filletInnerFloor:0,filletInnerVert:0,filletInnerLip:0,squircle:0,squircleVTop:0,squircleVBot:0,
    latticeFloor:false,bulgeXPlus:0,bulgeXMinus:0,bulgeZPlus:0,bulgeZMinus:0,bulgeYPlus:0,bulgeYMinus:0,
    taperXPlus:0,taperXMinus:0,taperZPlus:0,taperZMinus:0,taperYPlusX:0,taperYPlusZ:0,taperYMinusX:0,taperYMinusZ:0},ov);
  logos.length=0; boxHoles.length=0;
}
// plain solid + a +Z hole → watertight, more tris than the 12-tri plain box
base({}); boxHoles.push({id:1,face:'+Z',u0:5,v0:-4,diameter:10}); clampHoleToFace(boxHoles[0]);
{ const t=buildTrisForShape('box',paramState.box); chk('plain solid + hole: watertight', wt(t)&&!hasNaN(t), manifoldCheck(t,4));
  chk('plain solid + hole: pierced (more than 12 tris)', t.length>12, t.length); }
// taper + hole → still watertight (per-vertex taper preserves the closed mesh)
base({taperXPlus:10,taperZMinus:6}); boxHoles.push({id:2,face:'+Z',u0:0,v0:0,diameter:12}); clampHoleToFace(boxHoles[0]);
{ const t=buildTrisForShape('box',paramState.box); chk('taper + hole: watertight', wt(t)&&!hasNaN(t), manifoldCheck(t,4)); }
// hollow present → holes ignored (equals the hole-free hollow build)
base({hollow:true}); const hollowNoHole=buildTrisForShape('box',paramState.box).length;
boxHoles.push({id:3,face:'+Z',u0:0,v0:0,diameter:10}); clampHoleToFace(boxHoles[0]);
{ const t=buildTrisForShape('box',paramState.box); chk('hollow: holes ignored (same as no-hole hollow)', t.length===hollowNoHole, {withHole:t.length, noHole:hollowNoHole});
  chk('hollow + (ignored) holes still watertight', wt(t)); }
// squircle present → holes ignored
base({squircle:45}); const sqNoHole=buildTrisForShape('box',paramState.box).length;
boxHoles.push({id:4,face:'+Z',u0:0,v0:0,diameter:8}); clampHoleToFace(boxHoles[0]);
chk('squircle: holes ignored', buildTrisForShape('box',paramState.box).length===sqNoHole);
// fillet present → holes ignored
base({filletRadius:6}); const filNoHole=buildTrisForShape('box',paramState.box).length;
boxHoles.push({id:5,face:'+X',u0:0,v0:0,diameter:8}); clampHoleToFace(boxHoles[0]);
chk('fillet: holes ignored', buildTrisForShape('box',paramState.box).length===filNoHole);

console.log('\n=== clampHoleToFace keeps the hole inside the face ===');
base({width:40,height:40,depth:40});
{ const h={id:9,face:'+Z',u0:100,v0:-100,diameter:999}; clampHoleToFace(h);
  // face +Z is width×height = 40×40 → half 20; block hs=r*1.7 must fit
  chk('oversized hole clamped to fit', h.diameter<=40 && Math.abs(h.u0)<=20 && Math.abs(h.v0)<=20 && h.diameter>0, h);
  boxHoles.length=0; boxHoles.push(h);
  chk('clamped oversized hole still watertight', wt(buildTrisForShape('box',paramState.box))); }

console.log('\n=== TOTAL:', pass, 'passed,', fail, 'failed ===');
process.exit(fail>0?1:0);
