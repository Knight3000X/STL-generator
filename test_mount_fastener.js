// Mounts & fasteners (крепёж): L-bracket, VESA plate, heat-set boss plate, through the REAL
// buildTrisForShape pipeline. Watertight, dimensions, real countersinks/bores. Run via ./run-all.sh.
let pass=0,fail=0; function chk(n,c,e){if(c){pass++;console.log('  OK  ',n);}else{fail++;console.log('  FAIL',n,e!==undefined?JSON.stringify(e):'');}}
function vol(t){let v=0;for(const T of t){const a=T[0],b=T[1],c=T[2];v+=(a[0]*(b[1]*c[2]-b[2]*c[1])-a[1]*(b[0]*c[2]-b[2]*c[0])+a[2]*(b[0]*c[1]-b[1]*c[0]))/6;}return v;}
function base(ov){ logos.length=0; boxHoles.length=0; dieFaces.length=0;
  Object.assign(paramState.box, defaultBoxParams(), {width:40,height:40,depth:40,
    mntMode:'lbracket',mntW:40,mntT:4,mntLegA:45,mntLegB:45,mntScrewD:4.5,mntGusset:'yes',mntVesa:'100',mntCenterD:0,
    mntBossNX:2,mntBossNZ:2,mntBossD:8,mntBossH:7,
    gearMode:'none',pipMode:'none',threadMode:'none',sheetShape:'none',keycapMode:'none',platonic:'none',polyN:0,binRound:0,
    scoopDir:'none',labelTab:'none',mountHoles:'none',gripWall:'none',divX:1,divZ:1,stackFeet:false,gfOn:false}, ov);
  return buildTrisForShape('box',paramState.box); }

console.log('=== L-bracket ===');
for(const W of [30,60]) for(const t of [3,5]) for(const gus of ['yes','no']) for(const sd of [0,4.5])
  chk('lbracket W'+W+' t'+t+' gus'+gus+' screw'+sd+' watertight (+vol)', (()=>{const tr=base({mntMode:'lbracket',mntW:W,mntT:t,mntGusset:gus,mntScrewD:sd});const mc=manifoldCheck(tr,4);return mc.watertight&&vol(tr)>0;})(), {W,t,gus,sd});
{ const b=computeBBox(base({mntMode:'lbracket',mntW:50,mntLegA:40,mntLegB:60,mntT:4}));
  chk('lbracket width = mntW (X)', Math.abs((b.maxX-b.minX)-50)<0.2, {x:+(b.maxX-b.minX).toFixed(1)});
  chk('lbracket footprint ≈ legA (Z)', Math.abs((b.maxZ-b.minZ)-40)<1.0, {z:+(b.maxZ-b.minZ).toFixed(1)});
  chk('lbracket height ≈ legB (Y)', Math.abs((b.maxY-b.minY)-60)<1.0, {y:+(b.maxY-b.minY).toFixed(1)}); }
{ const noH=vol(base({mntMode:'lbracket',mntScrewD:0})), withH=vol(base({mntMode:'lbracket',mntScrewD:5}));
  chk('screw holes remove material', withH<noH, {noH:+noH.toFixed(0),withH:+withH.toFixed(0)}); }
{ const noG=vol(base({mntMode:'lbracket',mntGusset:'no'})), withG=vol(base({mntMode:'lbracket',mntGusset:'yes'}));
  chk('gusset adds material', withG>noG, {noG:+noG.toFixed(0),withG:+withG.toFixed(0)}); }

console.log('=== VESA plate ===');
for(const v of ['75','100','200']) for(const cd of [0,40])
  chk('VESA '+v+' center'+cd+' watertight (+vol)', (()=>{const t=base({mntMode:'vesa',mntVesa:v,mntCenterD:cd});const mc=manifoldCheck(t,4);return mc.watertight&&vol(t)>0;})(), {v,cd});
{ const b=computeBBox(base({mntMode:'vesa',mntVesa:'100',mntT:4}));
  chk('VESA100 plate ≥ 100mm', (b.maxX-b.minX)>=100 && Math.abs((b.maxY-b.minY)-4)<0.05, {x:+(b.maxX-b.minX).toFixed(1),y:+(b.maxY-b.minY).toFixed(1)}); }
{ const noC=vol(base({mntMode:'vesa',mntCenterD:0})), withC=vol(base({mntMode:'vesa',mntCenterD:30}));
  chk('center hole removes material', withC<noC, {noC:+noC.toFixed(0),withC:+withC.toFixed(0)}); }

console.log('=== heat-set boss plate ===');
for(const nx of [1,2,3]) for(const nz of [1,2]) for(const bH of [5,12])
  chk('boss '+nx+'x'+nz+' H'+bH+' watertight (+vol)', (()=>{const t=base({mntMode:'boss',mntBossNX:nx,mntBossNZ:nz,mntBossH:bH});const mc=manifoldCheck(t,4);return mc.watertight&&vol(t)>0;})(), {nx,nz,bH});
{ const b=computeBBox(base({mntMode:'boss',mntBossH:10,mntT:3}));
  chk('boss stack height = plate + bossH', Math.abs((b.maxY-b.minY)-(3+10))<0.05, {y:+(b.maxY-b.minY).toFixed(2)}); }
{ const one=vol(base({mntMode:'boss',mntBossNX:1,mntBossNZ:1})), many=vol(base({mntMode:'boss',mntBossNX:3,mntBossNZ:3}));
  chk('more bosses → more material', many>one, {one:+one.toFixed(0),many:+many.toFixed(0)}); }

console.log('=== tool holder ===');
for(const n of [1,3,6]) for(const d of [10,20]) for(const sd of [0,4.5])
  chk('tool N'+n+' Ø'+d+' screw'+sd+' watertight (+vol)', (()=>{const t=base({mntMode:'tool',mntToolN:n,mntToolD:d,mntScrewD:sd,mntW:100});const mc=manifoldCheck(t,4);return mc.watertight&&vol(t)>0;})(), {n,d,sd});
{ const b=computeBBox(base({mntMode:'tool',mntW:100,mntLegB:44,mntT:4}));
  chk('tool holder width = mntW (X)', Math.abs((b.maxX-b.minX)-100)<0.3, {x:+(b.maxX-b.minX).toFixed(1)});
  chk('tool holder height ≈ back (Y)', Math.abs((b.maxY-b.minY)-44)<1.0, {y:+(b.maxY-b.minY).toFixed(1)}); }
{ const few=vol(base({mntMode:'tool',mntToolN:1,mntToolD:10,mntW:120})), many=vol(base({mntMode:'tool',mntToolN:5,mntToolD:10,mntW:120}));
  chk('more tool holes remove more material', many<few, {few:+few.toFixed(0),many:+many.toFixed(0)}); }

console.log('=== pipe standoff bracket ===');
for(const d of [15,25,50]) for(const so of [8,25]) for(const sd of [0,4.5])
  chk('pipe Ø'+d+' standoff'+so+' screw'+sd+' watertight (+vol)', (()=>{const t=base({mntMode:'pipe',mntPipeD:d,mntLegA:so,mntScrewD:sd});const mc=manifoldCheck(t,4);return mc.watertight&&vol(t)>0;})(), {d,so,sd});
{ const near=computeBBox(base({mntMode:'pipe',mntPipeD:25,mntLegA:8})), far=computeBBox(base({mntMode:'pipe',mntPipeD:25,mntLegA:35}));
  chk('bigger standoff holds the pipe further from the wall (Z)', (far.maxZ-far.minZ) > (near.maxZ-near.minZ)+20, {near:+(near.maxZ-near.minZ).toFixed(1),far:+(far.maxZ-far.minZ).toFixed(1)}); }
{ const b=computeBBox(base({mntMode:'pipe',mntPipeD:30,mntPipeWall:3,mntW:6}));   // small ring width → plate = ring Ø
  chk('ring Ø ≈ pipe + 2·wall', Math.abs((b.maxX-b.minX)-(30+2*3)) < 4, {x:+(b.maxX-b.minX).toFixed(1)}); }

console.log('=== gating + regression ===');
{ const a=base({}).length, b=base({scoopDir:'front',gripWall:'front',mountHoles:'4',stackFeet:true,divX:2,divZ:2,hollow:true}).length;
  chk('organizer add-ons skipped on a mount', a===b, {a,b}); }
{ Object.assign(paramState.box, defaultBoxParams(), {width:40,height:40,depth:40,mntMode:'none'});
  const t=buildTrisForShape('box',paramState.box); const b=computeBBox(t);
  chk('mntMode none → normal cube', manifoldCheck(t,4).watertight && Math.abs((b.maxX-b.minX)-40)<1e-6, {}); }

console.log('=== furniture foot / glide (ножка-накладка) ===');
{ let n=0,bad=0;
  for(const sh of ['square','round']) for(const leg of [10,25,60,100]) for(const d of [6,22,60]) for(const w of [1.5,3,6]){
    const t=buildMount({mntMode:'foot',mntFootShape:sh,mntFootLeg:leg,mntFootH:d,mntT:w,mntFootClear:0.3,mntFootPad:3});
    const mc=manifoldCheck(t,4); n++; if(!(mc.watertight&&vol(t)>0)) bad++;
  }
  chk('foot: all '+n+' shape × leg × depth × wall combos watertight', bad===0, {n,bad}); }
{ const b=computeBBox(buildMount({mntMode:'foot',mntFootShape:'square',mntFootLeg:30,mntT:3,mntFootClear:0.3}));
  chk('square foot outer = leg + 2·(clearance + wall)', Math.abs((b.maxX-b.minX)-(30+2*0.3+2*3))<0.5, {x:+(b.maxX-b.minX).toFixed(2)}); }
{ const b=computeBBox(buildMount({mntMode:'foot',mntFootH:20,mntFootPad:4}));
  chk('foot height = socket depth + pad', Math.abs((b.maxY-b.minY)-24)<0.6, {y:+(b.maxY-b.minY).toFixed(2)}); }
{ // the socket must be OPEN at the top so the leg can enter, and its bore must widen with the fit clearance
  const bore=(c)=>{ const t=buildMount({mntMode:'foot',mntFootShape:'round',mntFootLeg:30,mntFootH:20,mntT:3,mntFootClear:c});
    const b=computeBBox(t); let mn=1e9; for(const T of t)for(const v of T) if(v[1]>b.maxY-0.3) mn=Math.min(mn,Math.hypot(v[0],v[2])); return mn; };
  chk('round socket is open at the top', bore(0.3) > 14, {r:+bore(0.3).toFixed(2)});
  chk('more clearance → wider socket bore', bore(1.0) > bore(0)+0.5, {tight:+bore(0).toFixed(2),loose:+bore(1.0).toFixed(2)}); }
{ const boreF=(ft)=>{ const t=buildMount({mntMode:'foot',mntFootShape:'round',mntFootLeg:30,mntFootClear:0,fitTune:ft});
    const b=computeBBox(t); let mn=1e9; for(const T of t)for(const v of T) if(v[1]>b.maxY-0.3) mn=Math.min(mn,Math.hypot(v[0],v[2])); return mn; };
  chk('global fitTune widens the socket too', boreF(0.5) > boreF(0)+0.3, {tight:+boreF(0).toFixed(2),loose:+boreF(0.5).toFixed(2)}); }

console.log('\n=== TOTAL:',pass,'passed,',fail,'failed ===');
process.exit(fail?1:0);
