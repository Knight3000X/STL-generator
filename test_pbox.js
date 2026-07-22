// Project box (электрокорпус): tray + drop-in lid, through the REAL buildTrisForShape pipeline.
// Verifies watertightness across sizes/options, that the lid clears the tray cavity (fits), that
// posts/standoffs add material, and that box-mode add-ons are gated off. Run via ./run-all.sh.
let pass=0,fail=0; function chk(n,c,e){if(c){pass++;console.log('  OK  ',n);}else{fail++;console.log('  FAIL',n,e!==undefined?JSON.stringify(e):'');}}
function vol(t){let v=0;for(const T of t){const a=T[0],b=T[1],c=T[2];v+=(a[0]*(b[1]*c[2]-b[2]*c[1])-a[1]*(b[0]*c[2]-b[2]*c[0])+a[2]*(b[0]*c[1]-b[1]*c[0]))/6;}return v;}
function base(ov){ logos.length=0; boxHoles.length=0; dieFaces.length=0;
  Object.assign(paramState.box, defaultBoxParams(), {width:40,height:40,depth:40,
    pbPart:'tray',pbW:80,pbD:60,pbH:30,pbWall:2.4,pbFloor:2.4,pbFlange:1.5,pbScrewD:3,pbPostD:8,pbClear:0.35,
    pbLidT:2.4,pbLipH:5,pbBossNX:0,pbBossNZ:0,pbBossD:6,pbBossH:5,pbBossBore:2.6,
    woBack:'none',hookMount:'none',tpmsType:'none',mntMode:'none',gearMode:'none',pipMode:'none',threadMode:'none',
    sheetShape:'none',keycapMode:'none',platonic:'none',polyN:0,binRound:0,
    scoopDir:'none',labelTab:'none',mountHoles:'none',gripWall:'none',divX:1,divZ:1,stackFeet:false,gfOn:false}, ov);
  return buildTrisForShape('box',paramState.box); }

console.log('=== watertight: part × size × options ===');
for(const part of ['tray','lid','both'])
  for(const size of [{pbW:40,pbD:40,pbH:15},{pbW:80,pbD:60,pbH:30},{pbW:180,pbD:120,pbH:60}])
    for(const opt of [{},{pbBossNX:2,pbBossNZ:2},{pbWall:1.6,pbFlange:0.8,pbScrewD:4}]){
      const t=base(Object.assign({pbPart:part},size,opt)); const mc=manifoldCheck(t,4);
      chk(part+' '+JSON.stringify(size)+' '+JSON.stringify(opt)+' watertight (+vol)',
          mc.watertight&&vol(t)>0, {wt:mc.watertight,open:mc.openEdges,bad:mc.badEdges});
    }

console.log('=== dimensions ===');
{ const b=computeBBox(base({pbPart:'tray',pbW:100,pbD:70,pbH:40}));
  chk('tray outer X = pbW', Math.abs((b.maxX-b.minX)-100)<0.6, {x:+(b.maxX-b.minX).toFixed(1)});
  chk('tray outer Z = pbD', Math.abs((b.maxZ-b.minZ)-70)<0.6, {z:+(b.maxZ-b.minZ).toFixed(1)});
  chk('tray height ≈ pbH', Math.abs((b.maxY-b.minY)-40)<1.5, {y:+(b.maxY-b.minY).toFixed(1)}); }
{ const lo=computeBBox(base({pbPart:'tray',pbH:20})), hi=computeBBox(base({pbPart:'tray',pbH:50}));
  chk('taller walls → taller tray', Math.abs(((hi.maxY-hi.minY)-(lo.maxY-lo.minY))-30)<1.5, {}); }

console.log('=== lid fits the tray (lip clears the cavity) ===');
{ // The lid lip outer footprint must be smaller than the tray inner cavity by ~2·clearance, so it drops in.
  const W=80,D=60,wall=2.4,flange=1.5,clr=0.35;
  const cavityW=(W-2*flange)-2*wall, cavityD=(D-2*flange)-2*wall;   // inner footprint
  const lid=base({pbPart:'lid',pbW:W,pbD:D,pbWall:wall,pbFlange:flange,pbClear:clr,pbLidT:2.4,pbLipH:6});
  // measure the lip: the widest X extent BELOW the plate (plate is centred; lip hangs to −Y)
  const b=computeBBox(lid); let lipMaxX=-1e9,lipMinX=1e9;
  for(const T of lid) for(const v of T) if(v[1] < b.minY+ (b.maxY-b.minY)*0.4){ if(v[0]>lipMaxX)lipMaxX=v[0]; if(v[0]<lipMinX)lipMinX=v[0]; }
  const lipW=lipMaxX-lipMinX;
  chk('lid lip fits inside tray cavity (with clearance)', lipW < cavityW-0.4 && lipW > cavityW-2.5, {lipW:+lipW.toFixed(2),cavityW:+cavityW.toFixed(2)}); }
{ const plate=computeBBox(base({pbPart:'lid'}));
  chk('lid outer X ≈ wall footprint (pbW − 2·flange)', Math.abs((plate.maxX-plate.minX)-(80-2*1.5))<0.8, {x:+(plate.maxX-plate.minX).toFixed(1)}); }

console.log('=== posts & standoffs add material ===');
{ const none=vol(base({pbBossNX:0,pbBossNZ:0})), grid=vol(base({pbBossNX:2,pbBossNZ:3}));
  chk('PCB standoffs add material', grid>none, {none:+none.toFixed(0),grid:+grid.toFixed(0)}); }
{ const thin=vol(base({pbPostD:6})), thick=vol(base({pbPostD:12}));
  chk('thicker corner posts add material', thick>thin, {thin:+thin.toFixed(0),thick:+thick.toFixed(0)}); }
{ const both=base({pbPart:'both'}); const b=computeBBox(both);
  chk('both parts span wider in X than a single tray', (b.maxX-b.minX) > 80, {x:+(b.maxX-b.minX).toFixed(1)}); }

console.log('=== gating + regression ===');
{ const a=base({}).length, b=base({scoopDir:'front',gripWall:'front',mountHoles:'4',stackFeet:true,divX:2,divZ:2,hollow:true}).length;
  chk('box add-ons skipped on a project box', a===b, {a,b}); }
{ Object.assign(paramState.box, defaultBoxParams(), {width:40,height:40,depth:40,pbPart:'none'});
  const t=buildTrisForShape('box',paramState.box); const b=computeBBox(t);
  chk('pbPart none → normal cube', manifoldCheck(t,4).watertight && Math.abs((b.maxX-b.minX)-40)<1e-6, {}); }

console.log('\n=== TOTAL:',pass,'passed,',fail,'failed ===');
process.exit(fail?1:0);
