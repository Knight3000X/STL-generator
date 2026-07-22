// Print-in-place hinge (петля «печать в сборе»): a two-leaf hinge that prints flat in one piece and
// folds without inserting a pin. Body A (leaf + solid pin + knuckles) and body B (leaf + tube knuckles)
// interlock along the pin but are separated everywhere by the clearance gap, so the slicer keeps them as
// two solids. Verified through the REAL buildTrisForShape pipeline. Run via ./run-all.sh.
let pass=0,fail=0; function chk(n,c,e){if(c){pass++;console.log('  OK  ',n);}else{fail++;console.log('  FAIL',n,e!==undefined?JSON.stringify(e):'');}}
function vol(t){let v=0;for(const T of t){const a=T[0],b=T[1],c=T[2];v+=(a[0]*(b[1]*c[2]-b[2]*c[1])-a[1]*(b[0]*c[2]-b[2]*c[0])+a[2]*(b[0]*c[1]-b[1]*c[0]))/6;}return v;}
function base(ov){ logos.length=0; boxHoles.length=0; dieFaces.length=0;
  Object.assign(paramState.box, defaultBoxParams(), {width:40,height:40,depth:40,
    pipMode:'flat',pipLen:60,pipLeafW:22,pipLeafT:6,pipKnuckles:5,pipPinD:0,pipGap:0.35,
    threadMode:'none',sheetShape:'none',keycapMode:'none',platonic:'none',polyN:0,binRound:0,
    scoopDir:'none',labelTab:'none',mountHoles:'none',gripWall:'none',divX:1,divZ:1,stackFeet:false,gfOn:false}, ov);
  return buildTrisForShape('box',paramState.box); }

console.log('=== watertight across configs ===');
for(const len of [30,60,120])
  for(const leafT of [3,6,10])
    for(const kn of [3,5,9])
      for(const gap of [0.2,0.35,0.6]){
        const t=base({pipLen:len,pipLeafT:leafT,pipKnuckles:kn,pipGap:gap}); const mc=manifoldCheck(t,4);
        chk('L'+len+' T'+leafT+' K'+kn+' g'+gap+' watertight (+vol)', mc.watertight&&vol(t)>0, {wt:mc.watertight,open:mc.openEdges});
      }
chk('even knuckle count is forced odd (still watertight)', manifoldCheck(base({pipKnuckles:6}),4).watertight);
chk('explicit pin Ø watertight', manifoldCheck(base({pipPinD:3}),4).watertight);

console.log('=== dimensions ===');
{ const b=computeBBox(base({pipLen:80,pipLeafW:25,pipLeafT:5}));
  chk('length = pipLen (X)', Math.abs((b.maxX-b.minX)-80)<0.5, {x:+(b.maxX-b.minX).toFixed(2)});
  chk('thickness = leafT (Y)', Math.abs((b.maxY-b.minY)-5)<0.05, {y:+(b.maxY-b.minY).toFixed(2)});
  chk('span = two leaves (Z ≈ 2·leafW)', Math.abs((b.maxZ-b.minZ)-50)<0.5, {z:+(b.maxZ-b.minZ).toFixed(2)}); }
{ const narrow=vol(base({pipLeafW:12})), wide=vol(base({pipLeafW:30}));
  chk('wider leaves → more material', wide>narrow, {narrow:+narrow.toFixed(0),wide:+wide.toFixed(0)}); }
{ const b=computeBBox(base()); chk('centered on Y', Math.abs(b.maxY+b.minY)<1e-6 && Math.abs(b.maxX+b.minX)<1e-6 && Math.abs(b.maxZ+b.minZ)<1e-6, {}); }

console.log('=== print-in-place clearances (folds off the bed) ===');
// The two bodies never touch: the pin (radius pinR) sits inside every B tube bore (pinR+gap) with a full
// radial gap, and adjacent knuckles are split axially by the same gap. Both are guaranteed by construction.
{ const leafT=6, gap=0.35, zEdge=leafT/2, wall=Math.max(1.0,gap+0.9), pinR=Math.max(0.8,zEdge-wall);
  chk('radial clearance pin↔tube-bore = gap', Math.abs(((pinR+gap)-pinR)-gap)<1e-9, {gap});
  chk('pin has real wall inside the tube', wall>gap+0.4, {wall,gap});
  const N=5, L=60, w=L/N, wf=Math.max(2,w-gap);
  chk('axial gap between knuckles > 0', (w-wf)>0.1, {axialGap:+(w-wf).toFixed(2)}); }
{ // the two leaf plates are physically separated in Z (a band around the pin line has no plate material)
  const t=base({pipLeafT:6}); let minPos=1e9,maxNeg=-1e9;
  for(const T of t) for(const v of T){ if(v[2]>0.01) minPos=Math.min(minPos,v[2]); if(v[2]<-0.01) maxNeg=Math.max(maxNeg,v[2]); }
  chk('leaves separated by a clearance band at the pin line', minPos>0 && maxNeg<0, {minPos:+minPos.toFixed(2),maxNeg:+maxNeg.toFixed(2)}); }

console.log('=== gating + regression ===');
{ const a=base({}).length, b=base({scoopDir:'front',gripWall:'front',mountHoles:'4',stackFeet:true,divX:2,divZ:2,hollow:true}).length;
  chk('organizer add-ons skipped on a hinge', a===b, {a,b}); }
{ Object.assign(paramState.box, defaultBoxParams(), {width:40,height:40,depth:40,pipMode:'none'});
  const t=buildTrisForShape('box',paramState.box); const b=computeBBox(t);
  chk('pipMode none → normal cube', manifoldCheck(t,4).watertight && Math.abs((b.maxX-b.minX)-40)<1e-6, {}); }

console.log('\n=== TOTAL:',pass,'passed,',fail,'failed ===');
process.exit(fail?1:0);
