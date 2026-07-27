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


console.log('=== fit-clearance calibration print (калибровка зазора) ===');
{ let n=0,bad=0;
  for(const cnt of [2,5,10]) for(const d of [3,6,12,30]) for(const g0 of [0,0.1,0.5]) for(const dg of [0.02,0.1,0.5]){
    const t=buildMount({mntMode:'fittest',mntFitN:cnt,mntFitD:d,mntFitStart:g0,mntFitStep:dg,mntT:4});
    const mc=manifoldCheck(t,4); n++; if(!(mc.watertight&&vol(t)>0)) bad++;
  }
  chk('fit test: all '+n+' step × Ø × start × increment combos watertight', bad===0, {n,bad}); }
{ // EVERY step must survive. buildBoxWithHoles judges hole blocks in coarse grid-index space and silently
  // drops ones it thinks clash, which would quietly delete exactly the wide-clearance steps being measured —
  // hence one hole per tile. Verify each expected bore is really in the mesh.
  const present=(cfg)=>{ const p=Object.assign({mntMode:'fittest',mntT:4},cfg), t=buildMount(p);
    const n=p.mntFitN, nom=p.mntFitD, g0=p.mntFitStart, dg=p.mntFitStep;
    const rMax=nom/2+g0+dg*(n-1), tile=2*rMax+8, pitch=tile+2, W=n*pitch-2;
    const D=tile+(nom*0.8+6)+(nom+8), zTile=-D/2+tile/2;
    let found=0;
    for(let k=0;k<n;k++){ const r=nom/2+g0+dg*k, cx=-W/2+tile/2+pitch*k;
      for(const T of t){ let hit=false; for(const v of T) if(Math.abs(Math.hypot(v[0]-cx,v[2]-zTile)-r)<0.35){hit=true;break;}
        if(hit){found++;break;} } }
    return found===n; };
  for(const cfg of [{mntFitN:5,mntFitD:6,mntFitStart:0.1,mntFitStep:0.1},{mntFitN:5,mntFitD:6,mntFitStart:0.1,mntFitStep:0.5},
                    {mntFitN:10,mntFitD:12,mntFitStart:0.5,mntFitStep:0.5},{mntFitN:10,mntFitD:3,mntFitStart:0,mntFitStep:0.02}])
    chk('no calibration step is dropped: '+JSON.stringify(cfg), present(cfg), {}); }
{ const few=vol(buildMount({mntMode:'fittest',mntFitN:2})), many=vol(buildMount({mntMode:'fittest',mntFitN:8}));
  chk('more steps → bigger calibration part', many>few, {n2:+few.toFixed(0),n8:+many.toFixed(0)}); }


console.log('=== dovetail slide (ласточкин хвост) ===');
{ let n=0,bad=0;
  for(const L of [20,60,200]) for(const w of [6,18,60]) for(const h of [3,8,25]) for(const a of [5,12,30]){
    const t=buildMount({mntMode:'dovetail',mntDtLen:L,mntDtW:w,mntDtH:h,mntDtAngle:a,mntDtClear:0.25,mntT:3});
    const mc=manifoldCheck(t,4); n++; if(!(mc.watertight&&vol(t)>0)) bad++;
  }
  chk('dovetail: all '+n+' length × width × height × angle combos watertight', bad===0, {n,bad}); }
{ // The tail must be UNDERCUT — wider at the top than at its root — otherwise it lifts straight out and the
  //   joint is just a rectangular tongue. That undercut is exactly why the socket cannot be a single prism.
  const w=18,h=8,ang=12*Math.PI/180, wT=w/2+h*Math.tan(ang);
  chk('tail is undercut (top wider than root)', wT > w/2 + 0.5, {root:w/2,top:+wT.toFixed(2)}); }
{ // Clearance must open the socket. Total volume is the wrong probe — a wider groove also pushes the socket's
  //   outer walls out, so the part GROWS. And slicing at an arbitrary height finds nothing, because a prism
  //   only has vertices at its profile corners. Measure the socket's own Z span instead (half = tail + clr + wall).
  const spanAt=(c)=>{ const t=buildMount({mntMode:'dovetail',mntDtLen:60,mntDtW:18,mntDtH:8,mntDtAngle:12,mntDtClear:c,mntT:3});
    let lo=1e9,hi=-1e9; for(const T of t)for(const v of T) if(v[2]>0){ lo=Math.min(lo,v[2]); hi=Math.max(hi,v[2]); }
    return hi-lo; };
  chk('more clearance → wider socket', spanAt(0.8) > spanAt(0)+0.5, {tight:+spanAt(0).toFixed(2),loose:+spanAt(0.8).toFixed(2)}); }
{ const b=computeBBox(buildMount({mntMode:'dovetail',mntDtLen:80}));
  chk('dovetail length = mntDtLen', Math.abs((b.maxX-b.minX)-80)<0.5, {x:+(b.maxX-b.minX).toFixed(1)}); }
{ const lo=vol(buildMount({mntMode:'dovetail',mntDtH:4})), hi=vol(buildMount({mntMode:'dovetail',mntDtH:20}));
  chk('taller tail → more material', hi>lo, {lo:+lo.toFixed(0),hi:+hi.toFixed(0)}); }

console.log('=== L-bracket: every screw hole asked for must actually be there ===');
// buildBoxWithHoles keeps a hole only when its grid block is strictly disjoint from the ones already kept,
// so holes crowded onto one row were dropped in silence — four screws on a 40 mm plate produced two. The
// count is measured by piercing the plate with rays and counting the openings, not by trusting the params.
// A hole is an extra closed loop in a horizontal section through the plate. Counting loops measures the
// holes that were actually BUILT, which is the whole point: buildBoxWithHoles silently drops a hole whose
// grid block collides with one already kept, so four screws crowded onto one row came out as two.
function sectionLoops(tris, y){
  const segs=[];
  for(const T of tris){ const pts=[];
    for(let k=0;k<3;k++){ const A=T[k], B=T[(k+1)%3];
      if((A[1]-y)*(B[1]-y)<0){ const t=(y-A[1])/(B[1]-A[1]);
        pts.push([A[0]+(B[0]-A[0])*t, A[2]+(B[2]-A[2])*t]); } }
    if(pts.length===2) segs.push(pts); }
  const key=q=>q.map(c=>Math.round(c*1e3)).join(',');
  const par=new Map(), find=a=>{ while(par.get(a)!==a){ par.set(a,par.get(par.get(a))); a=par.get(a); } return a; };
  const add=q=>{ const k=key(q); if(!par.has(k)) par.set(k,k); return k; };
  for(const sg of segs){ const a=find(add(sg[0])), b=find(add(sg[1])); if(a!==b) par.set(b,a); }
  const roots=new Set(); for(const k of par.keys()) roots.add(find(k));
  return roots.size;
}
for(const W of [40,60,100])
  for(const n of [1,2,3,4]){
    const t=base({mntMode:'lbracket',mntW:W,mntT:4,mntLegA:100,mntLegB:100,mntScrewD:4.5,mntHoleN:n,mntGusset:'no'});
    const B=computeBBox(t);
    chk('W'+W+' × '+n+' screws: all of them are drilled on the base', sectionLoops(t, B.minY+2)===n,
        {W, n, got:sectionLoops(t, B.minY+2)});
  }
{ // and "0 = без" on the screw diameter has to mean no holes at all
  const t=base({mntMode:'lbracket',mntW:60,mntT:4,mntLegA:100,mntLegB:100,mntScrewD:0,mntHoleN:4,mntGusset:'no'});
  const B=computeBBox(t);
  chk('mntScrewD 0 leaves the bracket undrilled', sectionLoops(t, B.minY+2)===0, {got:sectionLoops(t,B.minY+2)});
  chk('and it is still watertight', manifoldCheck(t,4).watertight, {});
  const solid=vol(t), drilled=vol(base({mntMode:'lbracket',mntW:60,mntT:4,mntLegA:100,mntLegB:100,mntScrewD:6,mntHoleN:4,mntGusset:'no'}));
  chk('drilling removes material', drilled<solid, {solid:+solid.toFixed(0),drilled:+drilled.toFixed(0)}); }
{ const t=base({hookMount:'wall',hookScrewD:0});
  chk('hook wall plate: "0 = без" leaves it undrilled too', manifoldCheck(t,4).watertight &&
      vol(t) > vol(base({hookMount:'wall',hookScrewD:5})), {}); }
for(const [W,legA,legB,sd,n] of [[10,12,12,8,4],[16,20,20,4.5,4],[25,45,45,2,3],[300,200,100,12,4],[40,20,45,4.5,2]]){
  const t=base({mntMode:'lbracket',mntW:W,mntT:4,mntLegA:legA,mntLegB:legB,mntScrewD:sd,mntHoleN:n,mntGusset:'yes'});
  const mc=manifoldCheck(t,4);
  chk('cramped W'+W+' A'+legA+' Ø'+sd+' ×'+n+' still watertight', mc.watertight&&vol(t)>0,
      {open:mc.openEdges,bad:mc.badEdges});
}
{ // holes stay ON the plate whenever the head physically fits on it
  for(const [W,legA,sd] of [[16,16,4.5],[40,100,4.5],[100,100,8],[300,200,12]]){
    const t=base({mntMode:'lbracket',mntW:W,mntT:4,mntLegA:legA,mntLegB:legA,mntScrewD:sd,mntHoleN:4,mntGusset:'no'});
    const b=computeBBox(t);
    chk('W'+W+' A'+legA+' Ø'+sd+': the bracket keeps its outline', Math.abs((b.maxX-b.minX)-W)<0.05,
        {x:+(b.maxX-b.minX).toFixed(2), W});
  }
}

console.log('=== dovetail: the socket must be an UNDERCUT, not a copy of the tail ===');
// A groove that repeats the tail's taper opens outward, so the parts lift straight apart. The socket has to
// MIRROR it: narrow at the mouth, wide at the floor.
function dtSections(ov){
  const p=Object.assign({}, paramState.box);
  const t=base(Object.assign({mntMode:'dovetail',mntDtLen:60,mntDtW:18,mntDtH:8,mntDtAngle:12,mntDtClear:0.25,mntT:3}, ov));
  const B=computeBBox(t);
  // widths of solid material along z, sampled at two heights, on each half of the plate
  const solidRuns=(y, xHalf)=>{ const runs=[];
    let prev=false, start=0;
    for(let j=0;j<=1400;j++){ const z=B.minZ+(B.maxZ-B.minZ)*j/1400;
      let n=0;
      for(const T of t){ const A=T[0],Bv=T[1],C=T[2];
        const d1=(Bv[0]-A[0])*(z-A[2])-(Bv[2]-A[2])*(xHalf-A[0]);
        const d2=(C[0]-Bv[0])*(z-Bv[2])-(C[2]-Bv[2])*(xHalf-Bv[0]);
        const d3=(A[0]-C[0])*(z-C[2])-(A[2]-C[2])*(xHalf-C[0]);
        if(!((d1>=0&&d2>=0&&d3>=0)||(d1<=0&&d2<=0&&d3<=0))) continue;
        const AR=(Bv[0]-A[0])*(C[2]-A[2])-(Bv[2]-A[2])*(C[0]-A[0]); if(Math.abs(AR)<1e-12) continue;
        const w1=((Bv[0]-xHalf)*(C[2]-z)-(Bv[2]-z)*(C[0]-xHalf))/AR;
        const w2=((C[0]-xHalf)*(A[2]-z)-(C[2]-z)*(A[0]-xHalf))/AR;
        const yy=w1*A[1]+w2*Bv[1]+(1-w1-w2)*C[1]; if(yy>y) n++; }
      const inside=(n%2)===1;
      if(inside && !prev) start=z;
      if(!inside && prev) runs.push([start,z]);
      prev=inside; }
    if(prev) runs.push([start,B.maxZ]);
    return runs; };
  return {B, solidRuns};
}
{ const {B, solidRuns} = dtSections({});
  const yLow = B.minY + 3 + 1.0, yHigh = B.minY + 3 + 7.0;   // just above the slab, and near the top of the rib
  const lo=solidRuns(yLow, 0), hi=solidRuns(yHigh, 0);
  chk('at both heights there is a tail and a socket', lo.length>=3 && hi.length>=3, {lo:lo.length, hi:hi.length});
  if(lo.length>=3 && hi.length>=3){
    // the tail is one solid run; the socket is two flanks with a gap between them
    const tailLo=lo[0][1]-lo[0][0], tailHi=hi[0][1]-hi[0][0];
    chk('the TAIL widens toward its free end (a real dovetail)', tailHi>tailLo+0.5,
        {low:+tailLo.toFixed(2), high:+tailHi.toFixed(2)});
    const gapLo=lo[2][0]-lo[1][1], gapHi=hi[2][0]-hi[1][1];
    chk('the SOCKET narrows toward its mouth (an undercut, not a copy)', gapHi<gapLo-0.5,
        {floor:+gapLo.toFixed(2), mouth:+gapHi.toFixed(2)});
    chk('and the groove is the tail plus the fit clearance at both ends',
        Math.abs(gapLo-(tailHi+0.5))<0.35 && Math.abs(gapHi-(tailLo+0.5))<0.35,
        {gapFloor:+gapLo.toFixed(2), tailWide:+tailHi.toFixed(2),
         gapMouth:+gapHi.toFixed(2), tailNarrow:+tailLo.toFixed(2)});
  }
}
for(const ang of [5,12,20,30]){
  const {B, solidRuns} = dtSections({mntDtAngle:ang});
  const lo=solidRuns(B.minY+4, 0), hi=solidRuns(B.minY+10, 0);
  if(lo.length>=3 && hi.length>=3)
    chk('undercut angle '+ang+'°: socket still narrows upward', (hi[2][0]-hi[1][1]) < (lo[2][0]-lo[1][1]), {ang});
  else chk('undercut angle '+ang+'°: sections found', false, {lo:lo.length,hi:hi.length});
}
for(const ov of [{mntDtW:4},{mntDtW:120},{mntDtH:3},{mntDtH:60},{mntDtClear:0},{mntDtClear:1},{mntDtLen:10},{mntDtLen:300}]){
  const t=base(Object.assign({mntMode:'dovetail'}, ov)), mc=manifoldCheck(t,4);
  chk('dovetail '+JSON.stringify(ov)+' watertight', mc.watertight&&vol(t)>0, {open:mc.openEdges,bad:mc.badEdges});
}

console.log('\n=== TOTAL:',pass,'passed,',fail,'failed ===');
process.exit(fail?1:0);
