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
// plain hollow present → hole becomes a single-wall PORT (no longer ignored): mesh changes + stays watertight
base({hollow:true}); const hollowNoHole=buildTrisForShape('box',paramState.box).length;
boxHoles.push({id:3,face:'+Z',u0:0,v0:0,diameter:10}); clampHoleToFace(boxHoles[0]);
{ const t=buildTrisForShape('box',paramState.box); chk('plain hollow: hole applied as port (mesh differs)', t.length!==hollowNoHole, {withPort:t.length, noHole:hollowNoHole});
  chk('plain hollow + port still watertight', wt(t)); }
// squircle present → holes ignored
base({squircle:45}); const sqNoHole=buildTrisForShape('box',paramState.box).length;
boxHoles.push({id:4,face:'+Z',u0:0,v0:0,diameter:8}); clampHoleToFace(boxHoles[0]);
chk('squircle: holes ignored', buildTrisForShape('box',paramState.box).length===sqNoHole);
// fillet present → hole is now DRILLED through the flat faces (compatibility), mesh differs + watertight
base({filletRadius:6}); const filNoHole=buildTrisForShape('box',paramState.box).length;
boxHoles.push({id:5,face:'+X',u0:0,v0:0,diameter:8}); clampHoleToFace(boxHoles[0]);
{ const t=buildTrisForShape('box',paramState.box);
  chk('fillet: hole drilled (mesh differs)', t.length!==filNoHole, {withHole:t.length, noHole:filNoHole});
  chk('fillet + hole watertight', wt(t)); }

console.log('\n=== clampHoleToFace keeps the hole inside the face ===');
base({width:40,height:40,depth:40});
{ const h={id:9,face:'+Z',u0:100,v0:-100,diameter:999}; clampHoleToFace(h);
  // face +Z is width×height = 40×40 → half 20; block hs=r*1.7 must fit
  chk('oversized hole clamped to fit', h.diameter<=40 && Math.abs(h.u0)<=20 && Math.abs(h.v0)<=20 && h.diameter>0, h);
  boxHoles.length=0; boxHoles.push(h);
  chk('clamped oversized hole still watertight', wt(buildTrisForShape('box',paramState.box))); }

console.log('\n=== overlapping holes on the same axis stay watertight (later one dropped) ===');
// Two holes on the SAME face whose blocks overlap used to share grid cells and open the mesh.
{ const t = buildBoxWithHoles(60,60,60,[{axis:2,cp:-3,cq:0,r:7},{axis:2,cp:4,cq:0,r:7}]);
  const mc = manifoldCheck(t,4);
  chk('overlapping same-face bores: watertight', mc.watertight && !hasNaN(t), {open:mc.openEdges, bad:mc.badEdges}); }
// A +Y and a -Y hole are the SAME axis (Y): overlapping in the shared X/Z plane must not leak either.
{ const t = buildBoxWithHoles(40,40,40,[{axis:1,cp:2,cq:3,r:8},{axis:1,cp:-2,cq:-2,r:8}]);
  const mc = manifoldCheck(t,4);
  chk('overlapping +Y/-Y bores: watertight', mc.watertight && !hasNaN(t), {open:mc.openEdges, bad:mc.badEdges}); }
// The overlap guard must be conservative, not greedy: two well-separated holes on one axis both survive.
{ const solid = buildBoxWithHoles(80,40,80,[]);
  const two   = buildBoxWithHoles(80,40,80,[{axis:2,cp:-22,cq:0,r:6},{axis:2,cp:22,cq:0,r:6}]);
  chk('separated same-axis bores: both drilled', signedVol(two) < signedVol(solid) - 2000, {solid:signedVol(solid)|0, two:signedVol(two)|0});
  chk('separated same-axis bores: watertight', manifoldCheck(two,4).watertight); }
// buildTrisForShape path: two overlapping UI holes on +Z → still watertight (was open before the fix).
base({width:60,height:60,depth:60}); boxHoles.length=0;
boxHoles.push({id:11,face:'+Z',u0:-3,v0:0,diameter:14}); boxHoles.push({id:12,face:'+Z',u0:4,v0:0,diameter:14});
boxHoles.forEach(clampHoleToFace);
chk('dispatcher: overlapping UI holes watertight', wt(buildTrisForShape('box',paramState.box)));

console.log('\n=== hole cross-section shapes (circle / rounded-rect / slot) stay watertight ===');
// roundedRectDist: circle is r at every angle; a rectangle hits its half-extents on-axis.
chk('roundedRectDist circle @0', Math.abs(roundedRectDist(5,5,5,0)-5)<1e-9);
chk('roundedRectDist circle @45', Math.abs(roundedRectDist(5,5,5,Math.PI/4)-5)<1e-9);
chk('roundedRectDist rect p-extent', Math.abs(roundedRectDist(8,2,1,0)-8)<1e-9);
chk('roundedRectDist rect q-extent', Math.abs(roundedRectDist(8,2,1,Math.PI/2)-2)<1e-9);
// Circle expressed two ways builds the identical mesh.
{ const a=buildBoxWithHoles(40,40,40,[{axis:2,cp:0,cq:0,r:6}]);
  const b=buildBoxWithHoles(40,40,40,[{axis:2,cp:0,cq:0,ap:6,aq:6,rc:6}]);
  chk('circle {r} == circle {ap=aq=rc}', a.length===b.length && Math.abs(signedVol(a)-signedVol(b))<1e-6, {a:a.length,b:b.length}); }
for (const [name,w,h,d,holes] of [
  ['USB-C rrect (9x3.2 r1.6) +Z', 40,30,40, [{axis:2,cp:0,cq:0,ap:4.5,aq:1.6,rc:1.6}]],
  ['USB-C rrect on +X',           30,40,60, [{axis:0,cp:0,cq:0,ap:4.5,aq:1.6,rc:1.6}]],
  ['slot / pill (rc=min)',        60,40,40, [{axis:2,cp:0,cq:0,ap:6,aq:2,rc:2}]],
  ['near-rect (rc small)',        50,50,50, [{axis:0,cp:0,cq:0,ap:5,aq:8,rc:0.3}]],
  ['rrect off-centre + circle',   80,50,80, [{axis:2,cp:-14,cq:6,ap:6,aq:2,rc:2},{axis:2,cp:16,cq:-8,r:4}]],
]) { const t=buildBoxWithHoles(w,h,d,holes); const mc=manifoldCheck(t,4);
  chk(name+': watertight', mc.watertight && !hasNaN(t) && signedVol(t)>0, {open:mc.openEdges,bad:mc.badEdges}); }
// dispatcher path: a UI rounded-rect (USB-C) hole → still watertight, and less material than the solid box.
base({width:44,height:30,depth:40}); boxHoles.length=0;
boxHoles.push({id:21,face:'+Z',u0:0,v0:0,shape:'rrect',portW:9,portH:3.2,cornerR:1.6}); clampHoleToFace(boxHoles[0]);
{ const t=buildTrisForShape('box',paramState.box); chk('dispatcher: USB-C port watertight', wt(t)&&!hasNaN(t));
  chk('dispatcher: USB-C port removes material', signedVol(t) < signedVol(buildBoxWithHoles(44,30,40,[])), signedVol(t)|0); }
// clampHoleToFace on an oversized rounded-rect keeps its block inside the face and stays watertight.
base({width:40,height:24,depth:40});
{ const h={id:22,face:'+Z',u0:50,v0:-50,shape:'rrect',portW:999,portH:999,cornerR:999}; clampHoleToFace(h);
  chk('oversized rrect clamped', h.portW<=40 && h.portH<=24 && h.cornerR<=Math.min(h.portW,h.portH)/2+1e-9, h);
  boxHoles.length=0; boxHoles.push(h);
  chk('clamped oversized rrect watertight', wt(buildTrisForShape('box',paramState.box))); }

console.log('\n=== single-wall ports on a PLAIN hollow container (USB-C etc. pierce ONE wall) ===');
// buildHollowBoxWithPorts directly: circle / USB-C / slot on side walls + bottom, all watertight.
for (const [name,w,h,d,t,ports] of [
  ['circle side +Z',   60,40,50,3,   [{axis:2,side:1,cp:0,cq:0,r:6}]],
  ['USB-C side +Z',    60,30,50,2.5, [{axis:2,side:1,cp:0,cq:0,ap:4.5,aq:1.6,rc:1.6}]],
  ['USB-C side +X',    50,40,60,3,   [{axis:0,side:1,cp:0,cq:0,ap:4.5,aq:1.6,rc:1.6}]],
  ['slot side -Z',     70,40,50,3,   [{axis:2,side:-1,cp:10,cq:-4,ap:8,aq:2,rc:2}]],
  ['circle bottom -Y', 50,40,50,3,   [{axis:1,side:-1,cp:0,cq:0,r:5}]],
  ['two walls',        70,40,70,3,   [{axis:2,side:1,cp:0,cq:2,ap:4.5,aq:1.6,rc:1.6},{axis:0,side:1,cp:0,cq:0,r:5}]],
]) { const tr=buildHollowBoxWithPorts(w,h,d,t,ports); const mc=manifoldCheck(tr,4);
  chk(name+': watertight', mc.watertight && !hasNaN(tr) && signedVol(tr)>0, {open:mc.openEdges,bad:mc.badEdges}); }
// A port removes material vs the plain hollow container.
{ const noP=signedVol(buildHollowBoxWithPorts(60,36,50,2.5,[]));
  const withP=signedVol(buildHollowBoxWithPorts(60,36,50,2.5,[{axis:2,side:1,cp:0,cq:0,ap:6,aq:2.5,rc:1.5}]));
  chk('port opens the wall (less material)', withP < noP - 5, {noP:noP|0,withP:withP|0}); }
// Two ports on the SAME wall → second dropped; open top (+Y) never pierced.
{ const tr=buildHollowBoxWithPorts(60,40,50,3,[{axis:2,side:1,cp:-10,cq:0,r:4},{axis:2,side:1,cp:10,cq:0,r:4}]);
  chk('dup wall port dropped, watertight', manifoldCheck(tr,4).watertight);
  const a=buildHollowBoxWithPorts(60,40,50,3,[{axis:1,side:1,cp:0,cq:0,r:5}]).length;
  const b=buildHollowBoxWithPorts(60,40,50,3,[]).length;
  chk('open-top (+Y) port ignored', a===b, {a,b}); }
// Extreme centre clamped into the wall, still watertight.
{ const tr=buildHollowBoxWithPorts(60,40,50,3,[{axis:2,side:1,cp:999,cq:999,ap:4.5,aq:1.6,rc:1.6}]);
  chk('extreme centre clamped, watertight', manifoldCheck(tr,4).watertight); }

console.log('\n=== dispatcher: hollow single-wall ports (gated to plain hollow) ===');
base({width:60,height:36,depth:50,hollow:true,wallThickness:2.5}); boxHoles.length=0;
boxHoles.push({id:31,face:'+Z',u0:0,v0:0,shape:'rrect',portW:9,portH:3.2,cornerR:1.6}); clampHoleToFace(boxHoles[0]);
chk('hollow + USB-C port: watertight', wt(buildTrisForShape('box',paramState.box)));
base({width:60,height:40,depth:50,hollow:true,wallThickness:3,taperXPlus:8,taperZMinus:-6}); boxHoles.length=0;
boxHoles.push({id:32,face:'+X',u0:0,v0:0,shape:'rrect',portW:9,portH:3.2,cornerR:1.6}); clampHoleToFace(boxHoles[0]);
chk('hollow + port + taper: watertight', wt(buildTrisForShape('box',paramState.box)));
// gate: hollow + inner fillet + hole → port builder NOT used (rounded path builds, non-empty)
base({width:60,height:40,depth:50,hollow:true,wallThickness:3,filletInnerFloor:3}); boxHoles.length=0;
boxHoles.push({id:33,face:'+Z',u0:0,v0:0,diameter:6}); clampHoleToFace(boxHoles[0]);
{ const t=buildTrisForShape('box',paramState.box); chk('hollow + fillet: port gated off (still builds)', t.length>0 && !hasNaN(t)); }

console.log('\n=== holes on a CORNER-FILLETED box (drilled through the flat faces) ===');
{ const R=(rT,rB,rV)=>asymRadiiFromGroups(rT,rB,rV,30,20,25);
  for (const [name,rT,rB,rV,holes] of [
    ['uniform fillet + circle',  6,6,6,  [{axis:2,cp:0,cq:0,r:6}]],
    ['uniform fillet + USB-C',   6,6,6,  [{axis:2,cp:0,cq:0,ap:4.5,aq:1.6,rc:1.6}]],
    ['asym fillet + circle',     8,4,10, [{axis:2,cp:0,cq:0,r:5}]],
    ['fillet + holes on 2 axes', 6,6,6,  [{axis:2,cp:0,cq:0,r:5},{axis:0,cp:0,cq:0,r:4}]],
    ['fillet + off-centre rrect',5,5,5,  [{axis:2,cp:-8,cq:6,ap:5,aq:2.5,rc:1.5}]],
  ]) { const tr=buildAsymRoundedBox(60,40,50,R(rT,rB,rV),16,4,null,null,50,undefined,holes);
    chk(name+': watertight', manifoldCheck(tr,4).watertight && !hasNaN(tr) && signedVol(tr)>0); }
  // a hole too big for the flat region is dropped → identical to the no-hole filleted box
  const noH=buildAsymRoundedBox(40,40,40,R(6,6,6),16,4,null,null,50,undefined,[]).length;
  const big=buildAsymRoundedBox(40,40,40,R(6,6,6),16,4,null,null,50,undefined,[{axis:2,cp:0,cq:0,r:100}]);
  chk('oversized fillet hole dropped', big.length===noH && manifoldCheck(big,4).watertight, {big:big.length,noH}); }
// dispatcher: filleted solid box + hole (circle / USB-C / asym / taper)
base({width:60,height:40,depth:50,filletRadius:6}); boxHoles.length=0;
boxHoles.push({id:41,face:'+Z',u0:0,v0:0,shape:'rrect',portW:12,portH:5,cornerR:2}); clampHoleToFace(boxHoles[0]);
chk('dispatcher: fillet + USB-C watertight', wt(buildTrisForShape('box',paramState.box)));
base({width:60,height:40,depth:50,filletTop:8,filletBottom:4,filletVert:10}); boxHoles.length=0;
boxHoles.push({id:42,face:'+X',u0:0,v0:0,diameter:7}); clampHoleToFace(boxHoles[0]);
chk('dispatcher: asym fillet + hole watertight', wt(buildTrisForShape('box',paramState.box)));
base({width:60,height:40,depth:50,filletRadius:6,taperXPlus:8,taperZMinus:-6}); boxHoles.length=0;
boxHoles.push({id:43,face:'+Z',u0:0,v0:0,diameter:8}); clampHoleToFace(boxHoles[0]);
chk('dispatcher: fillet + hole + taper watertight', wt(buildTrisForShape('box',paramState.box)));

console.log('\n=== countersink / counterbore heads (recessed screw seats) on the solid box ===');
for (const [name, holes] of [
  ['countersink +Z head+', [{axis:2,cp:0,cq:0,r:2.5,head:'sink',headR:5,headDepth:3,headSide:1}]],
  ['countersink head-',    [{axis:2,cp:0,cq:0,r:2.5,head:'sink',headR:5,headDepth:3,headSide:-1}]],
  ['counterbore +Z',       [{axis:2,cp:0,cq:0,r:2.5,head:'bore',headR:5,headDepth:4,headSide:1}]],
  ['counterbore floor -Y', [{axis:1,cp:0,cq:0,r:2,head:'bore',headR:4.5,headDepth:3,headSide:-1}]],
  ['sink + plain circle',  [{axis:2,cp:-12,cq:0,r:2.5,head:'sink',headR:5,headDepth:3,headSide:1},{axis:2,cp:12,cq:0,r:4}]],
  ['sink on two axes',     [{axis:2,cp:0,cq:0,r:2.5,head:'sink',headR:5,headDepth:3,headSide:1},{axis:0,cp:0,cq:0,r:2.5,head:'sink',headR:5,headDepth:3,headSide:1}]],
]) { const t=buildBoxWithHoles(50,40,50,holes); const mc=manifoldCheck(t,4);
  chk(name+': watertight', mc.watertight && !hasNaN(t) && signedVol(t)>0, {open:mc.openEdges,bad:mc.badEdges}); }
// a head opens a wider entry → removes MORE material than the plain bore
{ const plain=signedVol(buildBoxWithHoles(50,40,50,[{axis:2,cp:0,cq:0,r:2.5}]));
  const sink =signedVol(buildBoxWithHoles(50,40,50,[{axis:2,cp:0,cq:0,r:2.5,head:'sink',headR:5,headDepth:3,headSide:1}]));
  chk('head removes more material than the plain bore', sink < plain, {plain:plain|0, sink:sink|0}); }
// dispatcher: UI head hole (circle) on the plain solid box
base({width:50,height:40,depth:50}); boxHoles.length=0;
boxHoles.push({id:51,face:'+Z',u0:0,v0:0,diameter:5,head:'sink',headDiameter:10,headDepth:3}); clampHoleToFace(boxHoles[0]);
chk('dispatcher: countersink watertight', wt(buildTrisForShape('box',paramState.box)));
boxHoles.length=0;
boxHoles.push({id:52,face:'+X',u0:0,v0:0,diameter:5,head:'bore',headDiameter:11,headDepth:4}); clampHoleToFace(boxHoles[0]);
chk('dispatcher: counterbore watertight', wt(buildTrisForShape('box',paramState.box)));
// oversized head is clamped to the face and stays watertight
base({width:40,height:30,depth:40}); boxHoles.length=0;
{ const ho={id:53,face:'+Z',u0:0,v0:0,diameter:5,head:'sink',headDiameter:999,headDepth:999}; clampHoleToFace(ho);
  chk('oversized head clamped', ho.headDiameter<=40 && ho.headDepth<=40 && ho.headDiameter>ho.diameter, ho);
  boxHoles.length=0; boxHoles.push(ho); chk('clamped head watertight', wt(buildTrisForShape('box',paramState.box))); }

console.log('\n=== TYPE-C width=horizontal / height=vertical is consistent on every face (no 90° swap) ===');
function rrectYHor(face){
  base({width:60,height:50,depth:70}); boxHoles.length=0;
  boxHoles.push({id:1,face,u0:0,v0:0,shape:'rrect',portW:12,portH:4,cornerR:1}); clampHoleToFace(boxHoles[0]);
  const H=holesForBuilder(paramState.box)[0], [pp,qq]=HOLE_AXIS_PQ[H.axis];
  const ext=a=>a===pp?H.ap:(a===qq?H.aq:null);
  const horAxis=pp===1?qq:pp;
  return { yExt:ext(1), horExt:ext(horAxis) };
}
for (const f of ['+Z','-Z','+X','-X']) { const {yExt,horExt}=rrectYHor(f);
  chk(f+': height→Y(2), width→horizontal(6)', Math.abs(yExt-2)<1e-6 && Math.abs(horExt-6)<1e-6, {yExt,horExt}); }
// the previously-swapped left/right faces stay watertight (solid + hollow port)
base({width:60,height:50,depth:70}); boxHoles.length=0;
boxHoles.push({id:2,face:'+X',u0:0,v0:0,shape:'rrect',portW:14,portH:5,cornerR:2}); clampHoleToFace(boxHoles[0]);
chk('+X solid USB-C watertight', wt(buildTrisForShape('box',paramState.box)));
base({width:60,height:50,depth:70,hollow:true,wallThickness:3}); boxHoles.length=0;
boxHoles.push({id:3,face:'+X',u0:0,v0:0,shape:'rrect',portW:14,portH:5,cornerR:2}); clampHoleToFace(boxHoles[0]);
chk('+X hollow USB-C port watertight', wt(buildTrisForShape('box',paramState.box)));

console.log('\n=== TOTAL:', pass, 'passed,', fail, 'failed ===');
process.exit(fail>0?1:0);
