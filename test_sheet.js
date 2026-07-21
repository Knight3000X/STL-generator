// Flat perforated sheet / panel: outline (rect/round/ngon/circle) × perforation (diamond/square/triangle/
// hex/none) × optional raised rim, through the REAL buildTrisForShape pipeline. Watertight + volume. Run via ./run-all.sh.
let pass=0,fail=0; function chk(n,c,e){if(c){pass++;console.log('  OK  ',n);}else{fail++;console.log('  FAIL',n,e!==undefined?JSON.stringify(e):'');}}
function vol(t){let v=0;for(const T of t){const a=T[0],b=T[1],c=T[2];v+=(a[0]*(b[1]*c[2]-b[2]*c[1])-a[1]*(b[0]*c[2]-b[2]*c[0])+a[2]*(b[0]*c[1]-b[1]*c[0]))/6;}return v;}
function base(ov){ logos.length=0; boxHoles.length=0; dieFaces.length=0;
  Object.assign(paramState.box, defaultBoxParams(), {width:80,height:3,depth:60,sheetShape:'rect',sheetThick:3,sheetCut:'through',sheetPattern:'diamond',sheetTexH:0.6,
    latticeCell:8,latticeRib:1.6,latticeBorder:2,latticeRes:80,sheetRim:0,
    scoopDir:'none',labelTab:'none',mountHoles:'none',gripWall:'none',divX:1,divZ:1,stackFeet:false,gfOn:false,platonic:'none',polyN:0,binRound:0,keycapMode:'none'}, ov);
  return buildTrisForShape('box',paramState.box); }

console.log('=== outlines × solid / perforated ===');
for(const sh of ['rect','round','ngon','circle']){
  chk(sh+' solid wt (+vol)', (()=>{const t=base({sheetShape:sh,sheetPattern:'none'});const mc=manifoldCheck(t,4);return mc.watertight&&vol(t)>0;})(), sh);
  for(const pat of ['diamond','square','triangle','hex']){
    const t=base({sheetShape:sh,sheetPattern:pat}); const mc=manifoldCheck(t,4);
    chk(sh+' '+pat+' net wt (+vol)', mc.watertight&&vol(t)>0, mc);
  }
}
console.log('=== dimensions / thickness ===');
{ const t=base({sheetShape:'rect',sheetPattern:'none',width:120,depth:50,sheetThick:4}); const b=computeBBox(t);
  chk('rect fills 120×50, thick 4', Math.abs((b.maxX-b.minX)-120)<0.01 && Math.abs((b.maxZ-b.minZ)-50)<0.01 && Math.abs((b.maxY-b.minY)-4)<0.01, {x:b.maxX-b.minX,z:b.maxZ-b.minZ,y:b.maxY-b.minY}); }
{ const t=base({sheetShape:'ngon',sheetN:6,sheetPattern:'none'}); chk('hexagon plate wt', manifoldCheck(t,4).watertight); }
console.log('=== perforation removes material ===');
{ const solid=vol(base({sheetShape:'rect',sheetPattern:'none'})), net=vol(base({sheetShape:'rect',sheetPattern:'diamond'}));
  chk('perforation removes material', net<solid, {solid,net}); }
console.log('=== raised TEXTURE (grip pad) — solid, bumps on top ===');
for(const sh of ['rect','round','ngon','circle']){
  for(const pat of ['diamond','square','triangle','hex','stripe','dots']){
    const t=base({sheetShape:sh,sheetCut:'texture',sheetPattern:pat,sheetTexH:0.7}); const mc=manifoldCheck(t,4);
    chk(sh+' '+pat+' texture wt (+vol)', mc.watertight&&vol(t)>0, mc);
  }
}
{ const plain=vol(base({sheetShape:'rect',sheetCut:'none'})), tex=vol(base({sheetShape:'rect',sheetCut:'texture',sheetPattern:'diamond',sheetTexH:0.8}));
  chk('texture ADDS material (raised bumps, no holes)', tex>plain, {plain,tex}); }
// ANTI-ALIAS (v66): a THIN groove (rib) must still be resolved, or the grip bumps disintegrate into sparse
// fragments (the near-empty tetris texture the user saw). A fine-rib hex grip must add SUBSTANTIAL bump volume.
{ const texH=0.7, plate=80*60, plain=vol(base({sheetShape:'rect',width:80,depth:60,sheetCut:'none',sheetThick:3}));
  const tex=vol(base({sheetShape:'rect',width:80,depth:60,sheetCut:'texture',sheetPattern:'hex',latticeCell:8,latticeRib:0.6,sheetTexH:texH,sheetThick:3}));
  chk('thin-rib grip texture adds substantial bumps (not aliased fragments)', (tex-plain) > plate*texH*0.3, {added:+(tex-plain).toFixed(0), full:plate*texH}); }
{ const b=computeBBox(base({sheetShape:'rect',sheetCut:'texture',sheetPattern:'diamond',sheetThick:3,sheetTexH:0.8}));
  chk('texture raises top above the plate', Math.abs((b.maxY-b.minY)-(3+0.8))<0.05, {y:b.maxY-b.minY}); }
chk('texture + taper watertight', manifoldCheck(base({sheetShape:'round',sheetCut:'texture',sheetPattern:'hex',taperXPlus:5}),4).watertight);
{ // FULL coverage: on a circle the bumps must reach near the edge, not just the inscribed rectangle
  const t=base({sheetShape:'circle',width:90,depth:90,sheetCut:'texture',sheetPattern:'diamond',latticeCell:5,latticeRib:1,sheetTexH:0.8,latticeRes:150,sheetThick:2.5});
  const topY=2.5/2+0.8; let maxR=0;
  for(const T of t) for(const v of T) if(Math.abs(v[1]-topY)<0.05) maxR=Math.max(maxR, Math.hypot(v[0],v[2]));
  const inscribed=45/Math.SQRT2;   // old central-rect limit ≈ 31.8
  chk('texture covers the whole disc (bumps past the inscribed rect)', maxR>inscribed+4, {maxR,inscribed}); }
chk('texture + rim watertight', manifoldCheck(base({sheetShape:'round',sheetCut:'texture',sheetPattern:'diamond',sheetRim:5}),4).watertight);

console.log('=== raised rim (бортик) ===');
for(const sh of ['rect','round','circle']){
  const t=base({sheetShape:sh,sheetPattern:'diamond',sheetRim:6,sheetRimW:2.5}); const mc=manifoldCheck(t,4);
  chk(sh+' + rim watertight (+vol)', mc.watertight&&vol(t)>0, mc);
}
{ const noRim=computeBBox(base({sheetShape:'rect',sheetRim:0})), rim=computeBBox(base({sheetShape:'rect',sheetRim:6}));
  chk('rim raises the top', (rim.maxY-noRim.maxY)>5, {noRim:noRim.maxY,rim:rim.maxY}); }
{ const noRim=vol(base({sheetShape:'rect',sheetPattern:'none',sheetRim:0})), rim=vol(base({sheetShape:'rect',sheetPattern:'none',sheetRim:6}));
  chk('rim adds material', rim>noRim, {noRim,rim}); }
chk('rim + taper watertight', manifoldCheck(base({sheetShape:'round',sheetRim:5,taperXPlus:6}),4).watertight);

console.log('=== back (bottom) chamfer (фаска тыльной стороны) ===');
for(const sh of ['rect','round','ngon','circle']) for(const cut of ['none','texture','through']){
  const t=base({sheetShape:sh,sheetCut:cut,sheetChamfer:3.5}); const mc=manifoldCheck(t,4);
  chk(sh+'/'+cut+' + chamfer wt (+vol)', mc.watertight&&vol(t)>0, {wt:mc.watertight,open:mc.openEdges}); }
chk('chamfer + rim watertight', manifoldCheck(base({sheetShape:'round',sheetCut:'texture',sheetChamfer:3,sheetRim:5}),4).watertight);
for(const a of [20,60,75]) chk('chamfer angle '+a+'° wt', manifoldCheck(base({sheetShape:'rect',sheetCut:'none',sheetChamfer:3,sheetChamferAngle:a}),4).watertight);
chk('chamfer + taper watertight', manifoldCheck(base({sheetShape:'round',sheetCut:'through',sheetChamfer:3,taperXPlus:5}),4).watertight);
{ const no=vol(base({sheetShape:'rect',sheetCut:'none',sheetChamfer:0})), ch=vol(base({sheetShape:'rect',sheetCut:'none',sheetChamfer:4}));
  chk('chamfer removes bottom-edge material', ch<no, {no:+no.toFixed(1),ch:+ch.toFixed(1)}); }
{ const b=computeBBox(base({sheetShape:'rect',width:80,depth:50,sheetCut:'none',sheetChamfer:4}));
  chk('chamfer keeps the full top footprint', Math.abs((b.maxX-b.minX)-80)<0.1 && Math.abs((b.maxZ-b.minZ)-50)<0.1, {x:b.maxX-b.minX,z:b.maxZ-b.minZ}); }
console.log('=== SVG-contour outline (arbitrary shape) ===');
{ // synthesize a star-shaped polar radius table (like loadSvgHoleFile output): a rounded blob
  const M=360, U=new Array(M); for(let a=0;a<M;a++){ const th=a*2*Math.PI/M; U[a]=0.7+0.3*Math.abs(Math.cos(2*th)); }
  let apU=0,aqU=0; for(let a=0;a<M;a++){ const th=a*2*Math.PI/M; apU=Math.max(apU,Math.abs(U[a]*Math.cos(th))); aqU=Math.max(aqU,Math.abs(U[a]*Math.sin(th))); }
  const svg={sheetShape:'svg',sheetSvgRU:U,sheetSvgApU:apU,sheetSvgAqU:aqU};
  chk('svg solid wt', manifoldCheck(base(Object.assign({sheetCut:'none'},svg)),4).watertight);
  for(const cut of ['texture','through']) for(const pat of ['diamond','hex'])
    chk('svg '+cut+' '+pat+' wt', manifoldCheck(base(Object.assign({sheetCut:cut,sheetPattern:pat},svg)),4).watertight);
  chk('svg + rim wt', manifoldCheck(base(Object.assign({sheetCut:'texture',sheetPattern:'diamond',sheetRim:5},svg)),4).watertight);
  { const b=computeBBox(base(Object.assign({sheetCut:'none',width:100,depth:60},svg)));
    chk('svg fills width×depth', Math.abs((b.maxX-b.minX)-100)<0.5 && Math.abs((b.maxZ-b.minZ)-60)<0.5, {x:b.maxX-b.minX,z:b.maxZ-b.minZ}); }
  chk('svg without table falls back (no crash)', manifoldCheck(base({sheetShape:'svg',sheetCut:'none'}),4).watertight);
}
console.log('=== gating + regression ===');
{ const a=base({}).length, b=base({scoopDir:'front',gripWall:'front',mountHoles:'4',stackFeet:true,divX:2,divZ:2,hollow:true}).length;
  chk('organizer add-ons skipped on a sheet', a===b, {a,b}); }
{ Object.assign(paramState.box, defaultBoxParams(), {width:40,height:40,depth:40,sheetShape:'none'});
  const t=buildTrisForShape('box',paramState.box); const b=computeBBox(t);
  chk('sheetShape none → normal cube', manifoldCheck(t,4).watertight && Math.abs((b.maxX-b.minX)-40)<1e-6, {}); }

console.log('\n=== TOTAL:',pass,'passed,',fail,'failed ===');
process.exit(fail?1:0);
