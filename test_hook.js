// Hooks (крючки): a swept-bar hook on a wall plate or a snap-on pipe clip (any Ø), through the REAL
// buildTrisForShape pipeline. Watertight, real hook, mount variants. Run via ./run-all.sh.
let pass=0,fail=0; function chk(n,c,e){if(c){pass++;console.log('  OK  ',n);}else{fail++;console.log('  FAIL',n,e!==undefined?JSON.stringify(e):'');}}
function vol(t){let v=0;for(const T of t){const a=T[0],b=T[1],c=T[2];v+=(a[0]*(b[1]*c[2]-b[2]*c[1])-a[1]*(b[0]*c[2]-b[2]*c[0])+a[2]*(b[0]*c[1]-b[1]*c[0]))/6;}return v;}
function base(ov){ logos.length=0; boxHoles.length=0; dieFaces.length=0;
  Object.assign(paramState.box, defaultBoxParams(), {width:40,height:40,depth:40,
    hookMount:'wall',hookBar:8,hookReach:28,hookDrop:16,hookSweep:230,hookScrewD:4.5,hookPlateW:26,hookPlateH:44,
    hookPipeD:25,hookClipWall:3.5,hookClipW:14,
    tpmsType:'none',mntMode:'none',gearMode:'none',pipMode:'none',threadMode:'none',sheetShape:'none',keycapMode:'none',platonic:'none',polyN:0,binRound:0,
    scoopDir:'none',labelTab:'none',mountHoles:'none',gripWall:'none',divX:1,divZ:1,stackFeet:false,gfOn:false}, ov);
  return buildTrisForShape('box',paramState.box); }

console.log('=== wall hook ===');
for(const bar of [5,8,12]) for(const reach of [16,40]) for(const sd of [0,4.5])
  chk('wall bar'+bar+' reach'+reach+' screw'+sd+' watertight (+vol)', (()=>{const t=base({hookMount:'wall',hookBar:bar,hookReach:reach,hookScrewD:sd});const mc=manifoldCheck(t,4);return mc.watertight&&vol(t)>0;})(), {bar,reach,sd});
for(const sw of [140,200,280]) chk('wall sweep '+sw+'° watertight', manifoldCheck(base({hookSweep:sw}),4).watertight);
{ const noH=vol(base({hookScrewD:0})), withH=vol(base({hookScrewD:5}));
  chk('screw holes remove material from the plate', withH<noH, {noH:+noH.toFixed(0),withH:+withH.toFixed(0)}); }
{ const short=computeBBox(base({hookReach:16})), long=computeBBox(base({hookReach:50}));
  chk('longer reach → deeper hook (Z)', (long.maxZ-long.minZ) > (short.maxZ-short.minZ)+20, {}); }

console.log('=== pipe hook (any Ø) ===');
for(const d of [12,25,50]) for(const bar of [6,10])
  chk('pipe Ø'+d+' bar'+bar+' watertight (+vol)', (()=>{const t=base({hookMount:'pipe',hookPipeD:d,hookBar:bar});const mc=manifoldCheck(t,4);return mc.watertight&&vol(t)>0;})(), {d,bar});
{ // Ring on top (pipe axis X), J-hook hangs straight down below it. The ring top is the highest point (y≈rO),
  //   so a bigger pipe raises maxY cleanly (the hook only pulls minY further down).
  const small=computeBBox(base({hookMount:'pipe',hookPipeD:12})), big=computeBBox(base({hookMount:'pipe',hookPipeD:50}));
  chk('bigger pipe → higher ring top (maxY grows)', (big.maxY) > (small.maxY)+12, {small:+small.maxY.toFixed(1),big:+big.maxY.toFixed(1)}); }
chk('pipe clip is watertight with a thin wall', manifoldCheck(base({hookMount:'pipe',hookPipeD:32,hookClipWall:2.5}),4).watertight);
{ // hook hangs straight DOWN from the ring: the X span stays ≈ the clip width W (pipe axis), while the vertical
  //   span is far larger (ring + hanging J-hook), and most of the mesh sits below the ring.
  const b=computeBBox(base({hookMount:'pipe',hookPipeD:25,hookClipW:16,hookReach:30,hookDrop:16}));
  chk('hook hangs down (Y span ≫ X span ≈ clip width)', (b.maxY-b.minY) > (b.maxX-b.minX)*2 && Math.abs((b.maxX-b.minX)-16) < 2, {xSpan:+(b.maxX-b.minX).toFixed(1),ySpan:+(b.maxY-b.minY).toFixed(1)}); }

console.log('=== gating + regression ===');
{ const a=base({}).length, b=base({scoopDir:'front',gripWall:'front',mountHoles:'4',stackFeet:true,divX:2,divZ:2,hollow:true}).length;
  chk('organizer add-ons skipped on a hook', a===b, {a,b}); }
{ Object.assign(paramState.box, defaultBoxParams(), {width:40,height:40,depth:40,hookMount:'none'});
  const t=buildTrisForShape('box',paramState.box); const b=computeBBox(t);
  chk('hookMount none → normal cube', manifoldCheck(t,4).watertight && Math.abs((b.maxX-b.minX)-40)<1e-6, {}); }

console.log('\n=== TOTAL:',pass,'passed,',fail,'failed ===');
process.exit(fail?1:0);
