// TPMS lattice infill (гироид / Schwarz-P / diamond): marching-tetrahedra implicit block, through the REAL
// buildTrisForShape pipeline. Watertight, bounded by the box, real porosity. Run via ./run-all.sh.
let pass=0,fail=0; function chk(n,c,e){if(c){pass++;console.log('  OK  ',n);}else{fail++;console.log('  FAIL',n,e!==undefined?JSON.stringify(e):'');}}
function vol(t){let v=0;for(const T of t){const a=T[0],b=T[1],c=T[2];v+=(a[0]*(b[1]*c[2]-b[2]*c[1])-a[1]*(b[0]*c[2]-b[2]*c[0])+a[2]*(b[0]*c[1]-b[1]*c[0]))/6;}return v;}
function base(ov){ logos.length=0; boxHoles.length=0; dieFaces.length=0;
  Object.assign(paramState.box, defaultBoxParams(), {width:40,height:40,depth:40,
    tpmsType:'gyroid',tpmsStyle:'sheet',tpmsW:36,tpmsH:36,tpmsD:36,tpmsCell:14,tpmsThick:2.4,tpmsIso:0,
    mntMode:'none',gearMode:'none',pipMode:'none',threadMode:'none',sheetShape:'none',keycapMode:'none',platonic:'none',polyN:0,binRound:0,
    scoopDir:'none',labelTab:'none',mountHoles:'none',gripWall:'none',divX:1,divZ:1,stackFeet:false,gfOn:false}, ov);
  return buildTrisForShape('box',paramState.box); }

console.log('=== watertight: type × style ===');
for(const type of ['gyroid','schwarzp','diamond'])
  for(const style of ['sheet','solid']){
    const t=base({tpmsType:type,tpmsStyle:style,tpmsCell:16,tpmsW:32,tpmsH:32,tpmsD:32}); const mc=manifoldCheck(t,4);
    chk(type+'/'+style+' watertight (+vol)', mc.watertight&&vol(t)>0, {wt:mc.watertight,open:mc.openEdges,tris:t.length});
  }

console.log('=== bounded by the box ===');
{ const W=44,H=30,Dd=36, t=base({tpmsW:W,tpmsH:H,tpmsD:Dd,tpmsCell:14}); const b=computeBBox(t);
  chk('X within [-W/2,W/2]', (b.maxX-b.minX)<=W+0.5 && (b.maxX-b.minX)>W-3, {x:+(b.maxX-b.minX).toFixed(1),W});
  chk('Y within [-H/2,H/2]', (b.maxY-b.minY)<=H+0.5 && (b.maxY-b.minY)>H-3, {y:+(b.maxY-b.minY).toFixed(1),H});
  chk('Z within [-D/2,D/2]', (b.maxZ-b.minZ)<=Dd+0.5 && (b.maxZ-b.minZ)>Dd-3, {z:+(b.maxZ-b.minZ).toFixed(1),Dd});
  chk('centered', Math.abs(b.maxX+b.minX)<1.5 && Math.abs(b.maxY+b.minY)<1.5 && Math.abs(b.maxZ+b.minZ)<1.5, {}); }

console.log('=== porosity is real (lighter than a solid block) ===');
{ const W=36, solidBlock=W*W*W, net=vol(base({tpmsW:W,tpmsH:W,tpmsD:W,tpmsStyle:'sheet',tpmsCell:12,tpmsThick:2}));
  chk('gyroid sheet is porous (< 70% of the bounding box)', net>0 && net < 0.7*solidBlock, {net:+net.toFixed(0),block:solidBlock}); }
{ const thin=vol(base({tpmsStyle:'sheet',tpmsThick:1.2,tpmsCell:14})), thick=vol(base({tpmsStyle:'sheet',tpmsThick:4,tpmsCell:14}));
  chk('thicker walls → more material', thick>thin, {thin:+thin.toFixed(0),thick:+thick.toFixed(0)}); }
{ const fine=base({tpmsCell:8,tpmsW:32,tpmsH:32,tpmsD:32}).length, coarse=base({tpmsCell:20,tpmsW:32,tpmsH:32,tpmsD:32}).length;
  chk('smaller cell → more unit cells → more triangles', fine>coarse, {fine,coarse}); }
{ // solid style: iso offset shifts the volume fraction
  const lo=vol(base({tpmsStyle:'solid',tpmsIso:-0.6})), hi=vol(base({tpmsStyle:'solid',tpmsIso:0.6}));
  chk('solid iso offset changes volume fraction', Math.abs(hi-lo)>200, {lo:+lo.toFixed(0),hi:+hi.toFixed(0)}); }

console.log('=== field sanity ===');
{ chk('gyroid zero at origin', Math.abs(tpmsF(0,0,0,'gyroid',1))<1e-9, {});
  chk('schwarzP = 3 at origin', Math.abs(tpmsF(0,0,0,'schwarzp',1)-3)<1e-9, {});
  chk('gyroid is periodic in cell', Math.abs(tpmsF(0,0,0,'gyroid',2*Math.PI/14) - tpmsF(14,0,0,'gyroid',2*Math.PI/14))<1e-9, {}); }

console.log('=== gating + regression ===');
{ const a=base({}).length, b=base({scoopDir:'front',gripWall:'front',mountHoles:'4',stackFeet:true,divX:2,divZ:2,hollow:true}).length;
  chk('organizer add-ons skipped on a TPMS block', a===b, {a,b}); }
{ Object.assign(paramState.box, defaultBoxParams(), {width:40,height:40,depth:40,tpmsType:'none'});
  const t=buildTrisForShape('box',paramState.box); const b=computeBBox(t);
  chk('tpmsType none → normal cube', manifoldCheck(t,4).watertight && Math.abs((b.maxX-b.minX)-40)<1e-6, {}); }

console.log('\n=== TOTAL:',pass,'passed,',fail,'failed ===');
process.exit(fail?1:0);
