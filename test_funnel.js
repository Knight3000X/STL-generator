// Funnel (воронка): a straight spout under a cone, built as a constant-thickness shell of revolution,
// through the REAL buildTrisForShape pipeline. Watertight, dimensions, open bore. Run via ./run-all.sh.
let pass=0,fail=0; function chk(n,c,e){if(c){pass++;console.log('  OK  ',n);}else{fail++;console.log('  FAIL',n,e!==undefined?JSON.stringify(e):'');}}
function vol(t){let v=0;for(const T of t){const a=T[0],b=T[1],c=T[2];v+=(a[0]*(b[1]*c[2]-b[2]*c[1])-a[1]*(b[0]*c[2]-b[2]*c[0])+a[2]*(b[0]*c[1]-b[1]*c[0]))/6;}return v;}
function base(ov){ logos.length=0; boxHoles.length=0; dieFaces.length=0;
  Object.assign(paramState.box, defaultBoxParams(), {width:40,height:40,depth:40,
    fnOn:true,fnMouthD:70,fnSpoutD:12,fnSpoutLen:25,fnConeH:45,fnWall:1.6,
    psOn:false,pbPart:'none',woBack:'none',hookMount:'none',mntMode:'none',gearMode:'none',
    pipMode:'none',threadMode:'none',sheetShape:'none',keycapMode:'none',platonic:'none',polyN:0,binRound:0,
    scoopDir:'none',labelTab:'none',mountHoles:'none',gripWall:'none',divX:1,divZ:1,stackFeet:false,gfOn:false}, ov);
  return buildTrisForShape('box',paramState.box); }

console.log('=== watertight across mouth × spout × lengths × wall ===');
for(const md of [20,70,300]) for(const sd of [3,12,60]) for(const sl of [2,25,100]) for(const ch of [4,45,200]) for(const w of [0.8,1.6,5]){
  const t=base({fnMouthD:md,fnSpoutD:sd,fnSpoutLen:sl,fnConeH:ch,fnWall:w}); const mc=manifoldCheck(t,4);
  chk('mouth'+md+' spout'+sd+' L'+sl+' cone'+ch+' wall'+w+' watertight (+vol)', mc.watertight&&vol(t)>0, {wt:mc.watertight,bad:mc.badEdges,open:mc.openEdges});
}

console.log('=== dimensions ===');
{ const b=computeBBox(base({fnMouthD:80,fnSpoutLen:20,fnConeH:50}));
  chk('mouth Ø = fnMouthD', Math.abs((b.maxX-b.minX)-80)<1.5, {x:+(b.maxX-b.minX).toFixed(1)});
  chk('height = spout + cone', Math.abs((b.maxY-b.minY)-70)<0.5, {y:+(b.maxY-b.minY).toFixed(1)}); }
{ // it is a SHELL, not a solid cone: the spout must be bored through by the wall thickness
  const t=base({fnSpoutD:12,fnWall:1.6}); const b=computeBBox(t);
  let minR=1e9; for(const T of t)for(const v of T) if(v[1]<b.minY+0.3) minR=Math.min(minR,Math.hypot(v[0],v[2]));
  chk('spout bore = Ø/2 − wall (shell, not a solid)', Math.abs(minR-4.4)<0.3, {minR:+minR.toFixed(2)}); }
{ const thin=vol(base({fnWall:0.8})), thick=vol(base({fnWall:5}));
  chk('thicker wall → more material', thick>thin, {thin:+thin.toFixed(0),thick:+thick.toFixed(0)}); }
{ const lo=computeBBox(base({fnConeH:20})), hi=computeBBox(base({fnConeH:120}));
  chk('taller cone → taller funnel', (hi.maxY-hi.minY) > (lo.maxY-lo.minY)+90, {}); }

console.log('=== gating + regression ===');
{ const a=base({}).length, b=base({scoopDir:'front',gripWall:'front',mountHoles:'4',stackFeet:true,divX:2,divZ:2,hollow:true}).length;
  chk('box add-ons skipped on a funnel', a===b, {a,b}); }
{ Object.assign(paramState.box, defaultBoxParams(), {width:40,height:40,depth:40,fnOn:false});
  const t=buildTrisForShape('box',paramState.box); const b=computeBBox(t);
  chk('fnOn false → normal cube', manifoldCheck(t,4).watertight && Math.abs((b.maxX-b.minX)-40)<1e-6, {}); }

console.log('\n=== TOTAL:',pass,'passed,',fail,'failed ===');
process.exit(fail?1:0);
