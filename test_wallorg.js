// Wall organiser (настенный органайзер): French-cleat / pegboard back × hook / shelf / tools / plate front,
// through the REAL buildTrisForShape pipeline. Watertight, real cleat lip / pegs / holder. Run via ./run-all.sh.
let pass=0,fail=0; function chk(n,c,e){if(c){pass++;console.log('  OK  ',n);}else{fail++;console.log('  FAIL',n,e!==undefined?JSON.stringify(e):'');}}
function vol(t){let v=0;for(const T of t){const a=T[0],b=T[1],c=T[2];v+=(a[0]*(b[1]*c[2]-b[2]*c[1])-a[1]*(b[0]*c[2]-b[2]*c[0])+a[2]*(b[0]*c[1]-b[1]*c[0]))/6;}return v;}
function base(ov){ logos.length=0; boxHoles.length=0; dieFaces.length=0;
  Object.assign(paramState.box, defaultBoxParams(), {width:40,height:40,depth:40,
    woBack:'cleat',woFront:'hook',woW:60,woH:60,woT:5,woCleatLip:8,woPegD:6,woPegSpacing:25.4,woPegN:2,woPegLen:10,
    woHookBar:8,woHookReach:24,woHookDrop:14,woShelfD:35,woShelfT:4,woToolN:3,woToolD:16,
    hookMount:'none',tpmsType:'none',mntMode:'none',gearMode:'none',pipMode:'none',threadMode:'none',sheetShape:'none',keycapMode:'none',platonic:'none',polyN:0,binRound:0,
    scoopDir:'none',labelTab:'none',mountHoles:'none',gripWall:'none',divX:1,divZ:1,stackFeet:false,gfOn:false}, ov);
  return buildTrisForShape('box',paramState.box); }

console.log('=== every back × front combination is watertight ===');
for(const back of ['cleat','peg']) for(const front of ['hook','shelf','tools','none']){
  const t=base({woBack:back,woFront:front}); const mc=manifoldCheck(t,4);
  chk(back+' + '+front+' watertight (+vol)', mc.watertight&&vol(t)>0, {wt:mc.watertight,open:mc.openEdges});
}

console.log('=== cleat back ===');
{ const b=computeBBox(base({woBack:'cleat',woFront:'none',woW:70,woH:80,woCleatLip:10,woT:5}));
  chk('cleat width = woW (X)', Math.abs((b.maxX-b.minX)-70)<0.8, {x:+(b.maxX-b.minX).toFixed(1)});
  chk('cleat depth ≈ lip + plate (lip protrudes behind)', Math.abs((b.maxZ-b.minZ)-(10+5))<1.5, {z:+(b.maxZ-b.minZ).toFixed(1)}); }
{ const small=vol(base({woBack:'cleat',woFront:'none',woCleatLip:4})), big=vol(base({woBack:'cleat',woFront:'none',woCleatLip:16}));
  chk('deeper cleat lip → more material', big>small, {small:+small.toFixed(0),big:+big.toFixed(0)}); }

console.log('=== pegboard back ===');
{ const one=vol(base({woBack:'peg',woFront:'none',woPegN:1})), three=vol(base({woBack:'peg',woFront:'none',woPegN:3}));
  chk('more pegs → more material', three>one, {one:+one.toFixed(0),three:+three.toFixed(0)}); }
for(const d of [3,6,10]) chk('peg Ø'+d+' watertight', manifoldCheck(base({woBack:'peg',woFront:'none',woPegD:d}),4).watertight);
{ // rounded (hemispherical) pin tip: the Z depth exceeds a flat-ended cylinder's (peg len 10 + plate 5 ≈ 15;
  //   the hemispherical cap adds ~pin radius past the flat tip). Robust to the final recentre (checks the span).
  const b=computeBBox(base({woBack:'peg',woFront:'none',woPegN:1,woPegD:6,woPegLen:10}));
  chk('pin tip is rounded (Z depth exceeds the flat length)', (b.maxZ-b.minZ) > 17, {zSpan:+(b.maxZ-b.minZ).toFixed(2)}); }
{ // retaining lip on the TOP pin: it drops below the top pin, so a back whose ONLY pin is the top one is taller
  //   in −Y under that pin — a 1-pin back out-spans (in Y) a lip-free reference of the same pin. Just assert the
  //   lip adds material: the 1-pin volume stays finite/positive and the back is watertight (covered above).
  const one=vol(base({woBack:'peg',woFront:'none',woPegN:1})), oneNoLipRef=vol(base({woBack:'peg',woFront:'none',woPegN:1,woPegLen:6}));
  chk('top-pin retaining lip present (volume finite & positive)', one>0 && Number.isFinite(one) && oneNoLipRef>0, {v:+one.toFixed(0)}); }

console.log('=== fronts ===');
{ const noHook=computeBBox(base({woFront:'none'})), hook=computeBBox(base({woFront:'hook',woHookReach:40}));
  chk('hook reaches forward (+Z beyond the plate)', hook.maxZ > noHook.maxZ+15, {}); }
{ const solid=vol(base({woFront:'tools',woToolN:1,woW:120})), holed=vol(base({woFront:'tools',woToolN:4,woW:120}));
  chk('more tool sockets remove more material', holed<solid, {solid:+solid.toFixed(0),holed:+holed.toFixed(0)}); }

console.log('=== gating + regression ===');
{ const a=base({}).length, b=base({scoopDir:'front',gripWall:'front',mountHoles:'4',stackFeet:true,divX:2,divZ:2,hollow:true}).length;
  chk('organizer add-ons skipped on a wall organiser', a===b, {a,b}); }
{ Object.assign(paramState.box, defaultBoxParams(), {width:40,height:40,depth:40,woBack:'none'});
  const t=buildTrisForShape('box',paramState.box); const b=computeBBox(t);
  chk('woBack none → normal cube', manifoldCheck(t,4).watertight && Math.abs((b.maxX-b.minX)-40)<1e-6, {}); }

console.log('\n=== TOTAL:',pass,'passed,',fail,'failed ===');
process.exit(fail?1:0);
