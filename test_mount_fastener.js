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
/* ШИРИНА ПОЛКИ УСТУПАЕТ ГНЁЗДАМ, и с v25.28.0 это ДОГОВОР, а не случайность: заказанные гнёзда
   важнее заказанной ширины, потому что полка без гнёзд не полка. Прежняя проверка требовала ровно
   `mntW` и сломалась на починке — до неё полка молча теряла половину ряда, лишь бы остаться заданной
   ширины. Требуется теперь другое: ширина берётся у спецификации, она НЕ МЕНЬШЕ заказанной, и причина
   роста названа человеку. */
{ const P0={mntMode:'tool',mntW:100,mntLegB:44,mntT:4};
  const b=computeBBox(base(P0)), sp=toolRackSpec(Object.assign({}, paramState.box, P0));
  chk('tool holder width = spec W (X)', Math.abs((b.maxX-b.minX)-sp.W)<0.3,
      {x:+(b.maxX-b.minX).toFixed(1), spec:+sp.W.toFixed(1)});
  chk('  and never narrower than asked', sp.W >= 100 - 1e-9, {W:sp.W, asked:100});
  chk('  and the growth is spoken for', !sp.grew ||
      collectPrintWarnings(Object.assign({}, paramState.box, P0)).some(x=>/ради ГНЁЗД/.test(x)));
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

/* ===============================================================================================
   L-КРОНШТЕЙН ГОВОРИТ, СКОЛЬКО ДЕРЖИТ (v25.15.0). Уголок — деталь несущая, и вопрос к ней ровно один:
   какой груз. Из картинки он не выводится вовсе, а из ручек — только тремя числами разом.

   ГЛАВНОЕ ЗДЕСЬ — НЕ ФОРМУЛА, А МЕСТО. Ребро жёсткости стоит в углу и сходит на нет за свою длину:
   глубина сечения падает от t + gl до t, а момент за то же расстояние падает лишь с F·legA до
   F·(legA − gl). Глубина входит в момент сопротивления В КВАДРАТЕ — значит опасное сечение не в углу, а
   у кончика ребра, и на умолчаниях разница восьмикратная.

   Проверяется это НЕ ПОВТОРЕНИЕМ ФОРМУЛЫ, а замером по построенной детали: плоскость z = const режет
   сетку, сечение растеризуется по столбцам, и из него берутся площадь, центр тяжести и второй момент —
   те самые, из которых считается момент сопротивления. Совпадение расчёта с замером и есть проверка. */
console.log('\n=== L-кронштейн говорит, сколько держит ===');
{
  const setP = (ov) => { logos.length=0; boxHoles.length=0; dieFaces.length=0;
    Object.assign(paramState.box, defaultBoxParams(), {width:40,height:40,depth:40,
      mntMode:'lbracket',mntW:40,mntT:4,mntLegA:45,mntLegB:45,mntScrewD:4.5,mntGusset:'yes',
      mntHoleN:1,mntGussetLen:0,mntGussetW:0,mntVesa:'100',mntCenterD:0,
      gearMode:'none',pipMode:'none',threadMode:'none',sheetShape:'none',keycapMode:'none',
      platonic:'none',polyN:0,binRound:0,scoopDir:'none',labelTab:'none',mountHoles:'none',
      gripWall:'none',divX:1,divZ:1,stackFeet:false,gfOn:false}, ov);
    return paramState.box; };
  const warn = (ov) => collectPrintWarnings(setP(ov));
  const line = (ws) => ws.find(s => /^L-кронштейн: /.test(s));
  const spec = (ov) => lbracketSpec(setP(ov));
  const mesh = (ov) => { setP(ov); return buildTrisForShape('box', paramState.box); };

  /* Сечение плоскостью z = c, растеризованное по столбцам x: для каждого x собираются пересечения
     вертикальной прямой с отрезками сечения, сортируются, и материал — это промежутки чётности.
     Отсюда площадь, центр тяжести и второй момент относительно него — численно, без единой формулы
     из построителя. */
  const sectionZ = (tris, c) => { const seg = [];
    for (const T of tris){ const pts = [];
      for (let k = 0; k < 3; k++){ const A = T[k], B = T[(k+1)%3];
        if ((A[2] - c)*(B[2] - c) > 0) continue;
        if (Math.abs(A[2] - B[2]) < 1e-12) continue;
        const u = (c - A[2])/(B[2] - A[2]); if (u < 0 || u > 1) continue;
        pts.push([A[0] + u*(B[0] - A[0]), A[1] + u*(B[1] - A[1])]); }
      if (pts.length === 2) seg.push(pts); }
    return seg; };
  const sectionProps = (seg, x0, x1, nx) => {
    let A = 0, Sy = 0, Iy = 0;
    const dx = (x1 - x0)/nx;
    for (let i = 0; i < nx; i++){
      const x = x0 + dx*(i + 0.5), ys = [];
      for (const [P, Q] of seg){
        if ((P[0] - x)*(Q[0] - x) > 0) continue;
        if (Math.abs(P[0] - Q[0]) < 1e-12) continue;
        const u = (x - P[0])/(Q[0] - P[0]); if (u < 0 || u > 1) continue;
        ys.push(P[1] + u*(Q[1] - P[1])); }
      ys.sort((a,b) => a-b);
      for (let k = 0; k + 1 < ys.length; k += 2){
        const a = ys[k], b = ys[k+1];
        A  += (b - a)*dx;
        Sy += (b*b - a*a)/2*dx;
        Iy += (b*b*b - a*a*a)/3*dx; } }
    if (A <= 0) return null;
    const yb = Sy/A;
    return {A, yb, I: Iy - A*yb*yb, top: (() => { let m = -1e9;
      for (const [P, Q] of seg){ m = Math.max(m, P[1], Q[1]); } return m; })()}; };

  chk('L-кронштейн больше не молчит: на умолчаниях есть строка с грузом',
      line(warn({})) !== undefined, warn({}));

  /* 1. МОМЕНТ СОПРОТИВЛЕНИЯ — ИЗ СЕТКИ. Сечение берётся там, где спецификация назвала опасное место, и
     считается численно. Совпадение с расчётным Z проверяет и формулу тавра, и то, что ребро в этом
     сечении и правда той высоты, какой его считают. */
  {
    const g = spec({}), t = mesh({});
    const b = computeBBox(t);
    /* Станции — в АБСОЛЮТНОМ z нижней полки, ровно как в спецификации: она построена от z = 0, а
       заделка стоит на z = t + 0.3. Первый мой замер отсчитывал ребро от заделки, а построитель
       ведёт его от z = 0.3, и расчёт разошёлся с сеткой ровно на толщину полки. */
    for (const [nm, z] of [['у заделки', g.zRoot + 0.5], ['в опасном сечении', g.atZ]]){
      const pr = sectionProps(sectionZ(t, b.minZ + z), b.minX - 1, b.maxX + 1, 800);
      chk('сечение ' + nm + ' читается из сетки', pr !== null && pr.A > 0, pr && +pr.A.toFixed(1));
      const Zmeas = pr.I/(pr.top - pr.yb);
      /* То же сечение по правилу спецификации: h — остаток ребра на этой станции. */
      const h = g.ribAt(z);
      const A1 = g.W*g.t, A2 = 2*g.gw*h;
      const yb = A2 > 0 ? (A1*g.t/2 + A2*(g.t + h/2))/(A1 + A2) : g.t/2;
      const I = g.W*g.t*g.t*g.t/12 + A1*(yb - g.t/2)**2 + (A2 > 0 ? 2*g.gw*h*h*h/12 + A2*(g.t + h/2 - yb)**2 : 0);
      const Zcalc = I/(g.t + h - yb);
      chk('  и момент сопротивления сходится с расчётным (' + nm + ')',
          Math.abs(Zmeas - Zcalc) < 0.12*Zcalc, {измерено:+Zmeas.toFixed(0), расчёт:+Zcalc.toFixed(0)});
    }
  }
  /* 2. ОПАСНОЕ СЕЧЕНИЕ НЕ У УГЛА. Проверяется прямым перебором станций ПО ЗАМЕРАМ: напряжение
     M(z)/Z(z) считается из измеренных сечений, и его максимум обязан лежать там, где сказала
     спецификация, — у кончика ребра, а не в углу. */
  {
    const g = spec({}), t = mesh({});
    const b = computeBBox(t);
    let bestZ = g.zRoot, best = 0;
    for (let k = 0; k <= 12; k++){
      const z = g.zRoot + 0.4 + (g.zTip - g.zRoot - 0.4)*k/12;
      const pr = sectionProps(sectionZ(t, b.minZ + z), b.minX - 1, b.maxX + 1, 600);
      if (!pr) continue;
      const q = (g.legA - z)/(pr.I/(pr.top - pr.yb));
      if (q > best){ best = q; bestZ = z; } }
    chk('измеренное опасное сечение — у кончика ребра, а не у заделки',
        bestZ - g.zRoot > (g.zTip - g.zRoot)*0.7,
        {измерено:+(bestZ - g.zRoot).toFixed(1), ребро:+(g.zTip - g.zRoot).toFixed(1)});
    chk('  и спецификация называет то же место', Math.abs(bestZ - g.atZ) < g.gl*0.25,
        {измерено:+bestZ.toFixed(1), спец:+g.atZ.toFixed(1)});
    chk('  переоценка «по углу» и правда кратная', g.overCorner > 4, +g.overCorner.toFixed(1));
    chk('  и названа в предупреждении',
        new RegExp('завысить его ×' + g.overCorner.toFixed(0)).test(warn({}).join(' ')),
        {спец:+g.overCorner.toFixed(1), строки:warn({})});
  }
  /* 3. ГРУЗ. Число выводится из измеримых величин, и обратный ход это подтверждает: допускаемое
     напряжение, делённое на напряжение при единичной силе, — это и есть сила. */
  {
    const g = spec({});
    chk('груз — это допускаемое напряжение, делённое на напряжение от единичной силы',
        Math.abs(g.N - g.allow/g.worst) < 1e-6 && Math.abs(g.kg - g.N/9.80665) < 1e-6,
        {N:+g.N.toFixed(1), kg:+g.kg.toFixed(2)});
    chk('  поперёк слоёв ровно вдвое меньше', Math.abs(g.kgAcross*2 - g.kg) < 1e-9);
    chk('  и оба числа названы', /держит 28 кг/.test(line(warn({}))) && /14 кг/.test(line(warn({}))),
        line(warn({})));
    chk('  материал участвует: нейлон и PLA дают разные числа',
        spec({printMat:'nylon'}).kg > spec({printMat:'pla'}).kg*1.5,
        [+spec({printMat:'nylon'}).kg.toFixed(1), +spec({printMat:'pla'}).kg.toFixed(1)]);
    /* Толщина полки входит В КВАДРАТЕ — это и есть та ручка, которой чинят слабый кронштейн. Ровно
       четырёх не выходит, и это не погрешность: заделка стоит на дальней грани задней полки, поэтому
       толстая полка укорачивает ещё и плечо. Проверяется поэтому и то, и другое — по отдельности. */
    const rT = spec({mntT:8, mntGusset:'no'}).kg / spec({mntT:4, mntGusset:'no'}).kg;
    chk('  вдвое толще — БОЛЬШЕ чем вчетверо: квадрат толщины плюс укоротившееся плечо',
        rT > 4 && rT < 4.6, +rT.toFixed(3));
    const a45 = spec({mntGusset:'no'}), a90 = spec({mntLegA:90, mntGusset:'no'});
    chk('  а вылет — строго линейно по плечу от заделки',
        Math.abs(a90.kg/a45.kg - (a45.legA - a45.zRoot)/(a90.legA - a90.zRoot)) < 1e-9,
        {отношение:+(a90.kg/a45.kg).toFixed(4)});
  }
  /* 4. РЕБРО, КОТОРОЕ НЕ РАБОТАЕТ. При полке много длиннее ребра момент у его кончика почти тот же,
     что у угла, и прочности ребро не добавляет вовсе. То же самое приложение говорит про косынки
     струбцины — и там это верно всегда, а здесь зависит от длины. */
  {
    chk('на умолчаниях ребро работает', spec({}).ribIdle === false && spec({}).gain > 1.5,
        +spec({}).gain.toFixed(2));
    chk('  а при полке 200 мм — уже нет', spec({mntLegA:200}).ribIdle === true,
        +spec({mntLegA:200}).gain.toFixed(2));
    chk('  и об этом сказано словами', /прочности НЕ добавляет/.test(warn({mntLegA:200}).join(' ')),
        warn({mntLegA:200}));
    /* Ребро и правда стоит в детали — его объём меряется разностью и совпадает с двумя призмами. */
    const g = spec({});
    const vG = vol(mesh({})), vN = vol(mesh({mntGusset:'no'}));
    chk('  объём ребра в детали совпадает с двумя треугольными призмами',
        Math.abs((vG - vN) - g.gl*g.gl*(g.gw - 0.2)) < 0.03*(vG - vN),
        {измерено:+(vG - vN).toFixed(0), расчёт:+(g.gl*g.gl*(g.gw - 0.2)).toFixed(0)});
  }
  /* 5. ВИНТЫ, КОТОРЫЕ МОЛЧА ПРОПАДАЮТ. `buildBoxWithHoles` держит отверстие только если его клетка не
     пересекается с уже принятой, и на узкой полке четыре заказанных винта превращаются в два.
     Раскладка теперь ОДНА на построитель и спецификацию, и проверка считает дырки ПО СЕТКЕ. */
  {
    /* Отверстия считаются по горизонтальному сечению нижней плиты: связные куски контура сечения —
       это наружная кромка плюс по одному кольцу на отверстие. */
    const holesIn = (ov) => { const g = spec(ov), t = mesh(ov), b = computeBBox(t);
      const y = b.minY + Math.min(0.25*g.t, g.t - g.hD - 0.2);   // ниже потая, внутри плиты
      const pts = [];
      for (const T of t) for (let k = 0; k < 3; k++){ const A = T[k], B = T[(k+1)%3];
        if ((A[1] - y)*(B[1] - y) > 0) continue;
        if (Math.abs(A[1] - B[1]) < 1e-12) continue;
        const u = (y - A[1])/(B[1] - A[1]); if (u < 0 || u > 1) continue;
        const x = A[0] + u*(B[0] - A[0]), z = A[2] + u*(B[2] - A[2]);
        if (z > b.minZ + g.t + 1.0) pts.push([x, z]); }        // только нижняя плита, без задней
      // связные куски: объединение точек, отстоящих меньше чем на 1.5 мм
      const par = pts.map((_, i) => i);
      const find = (i) => { while (par[i] !== i) i = par[i] = par[par[i]]; return i; };
      /* Порог склейки берётся ШИРЕ шага станций сетки (max(габарит)/24), иначе наружная кромка
         рассыпается на десятки «отверстий»: на полке 100×120 мм шаг доходит до пяти миллиметров. */
      const G = Math.max(g.W, g.t, g.legA)/24*2;
      for (let i = 0; i < pts.length; i++) for (let j = i + 1; j < pts.length; j++)
        if (Math.hypot(pts[i][0] - pts[j][0], pts[i][1] - pts[j][1]) < G){
          const a = find(i), c = find(j); if (a !== c) par[a] = c; }
      const roots = new Set(); for (let i = 0; i < pts.length; i++) roots.add(find(i));
      return roots.size - 1; };                                  // минус наружная кромка
    chk('один заказанный винт — одно отверстие в детали', holesIn({}) === 1, holesIn({}));
    chk('четыре заказанных на широкой полке и правда четыре',
        holesIn({mntHoleN:4}) === 4 && spec({mntHoleN:4}).nBase === 4, holesIn({mntHoleN:4}));
    const nar = {mntHoleN:4, mntW:20};
    chk('на узкой полке их меньше — и деталь согласна со спецификацией',
        holesIn(nar) === spec(nar).nBase && spec(nar).nBase < 4,
        {вдетали:holesIn(nar), спец:spec(nar).nBase});
    chk('  и об этом сказано', spec(nar).screwsLost === true &&
        /винтов помещается 2, а не 4/.test(warn(nar).join(' ')), warn(nar));
    chk('  на умолчаниях ничего не теряется', spec({}).screwsLost === false);
    /* ФИЛЬТРА ДВА, А НЕ ОДИН (v25.17.0). Раскладка решает, сколько винтов РАЗМЕСТИТЬ, а
       `buildBoxWithHoles` потом решает, сколько ПОСТАВИТЬ: он роняет отверстие, если его клетка сетки
       задевает уже принятое. До выноса отбора спецификация знала только первый фильтр и называла
       размещённые, будто это и есть поставленные. Теперь она зовёт то же правило, что построитель. */
    /* И ВОТ ЧТО ВЫЯСНИЛОСЬ ПРИ ВЫНОСЕ: у уголка второй фильтр не срабатывает НИ РАЗУ. Раскладка уже
       разносит винты достаточно, и всё размещённое ставится. Это РЕЗУЛЬТАТ, а не предположение: до
       выноса отбора сказать этого было нельзя, а число называлось так, будто фильтр один. Перебор ниже
       и есть доказательство; у полки с гнёздами органайзера тот же фильтр роняет заказанное регулярно. */
    { let diverged = 0, seen = 0;
      for (const W of [10, 18, 24, 40, 80, 140]) for (const nH of [1, 2, 3, 4])
        for (const sd of [2, 4.5, 8, 12]){
          const g = spec({mntW:W, mntHoleN:nH, mntScrewD:sd}); seen++;
          if (g.nBase < g.nPlacedBase || g.nBack < g.nPlacedBack) diverged++; }
      chk('у уголка отбор сетки не роняет размещённого ни разу (' + seen + ' наборов)',
          diverged === 0, {расхождений:diverged}); }
    for (const ov of [{}, {mntHoleN:4}, {mntHoleN:4, mntW:20}, {mntHoleN:4, mntW:20, mntScrewD:8},
                      {mntHoleN:3, mntW:30, mntScrewD:6}, {mntHoleN:2, mntW:100, mntLegA:120}]){
      const g = spec(ov);
      chk('заказано ≥ размещено ≥ поставлено ' + JSON.stringify(ov),
          g.nAsk >= g.nPlacedBase && g.nPlacedBase >= g.nBase,
          {заказ:g.nAsk, размещено:g.nPlacedBase, поставлено:g.nBase});
      chk('  и поставленное совпадает с деталью', holesIn(ov) === g.nBase,
          {вдетали:holesIn(ov), спец:g.nBase});
    }
  }
  /* 6. МАТЕРИАЛ ПОД ПОТАЕМ — та стенка, которой винт прижимает кронштейн. Меряется по детали: внизу
     плиты отверстие узкое (тело винта), вверху широкое (конус головки), и разность высот, на которых
     это меняется, и есть глубина потая. Диаметр берётся по КЛАСТЕРУ точек сечения, а не по максимуму
     |x|: наружная кромка плиты шире любого отверстия, и первый мой замер мерил именно её. */
  {
    const holeD = (ov, frac) => { const g = spec(ov), t = mesh(ov), b = computeBBox(t);
      const y = b.minY + g.t*frac;
      const pts = [];
      for (const T of t) for (let k = 0; k < 3; k++){ const A = T[k], B = T[(k+1)%3];
        if ((A[1] - y)*(B[1] - y) > 0) continue;
        if (Math.abs(A[1] - B[1]) < 1e-12) continue;
        const u = (y - A[1])/(B[1] - A[1]); if (u < 0 || u > 1) continue;
        const x = A[0] + u*(B[0] - A[0]), z = A[2] + u*(B[2] - A[2]);
        if (z > b.minZ + g.t + 1.0) pts.push([x, z]); }
      const par = pts.map((_, i) => i);
      const find = (i) => { while (par[i] !== i) i = par[i] = par[par[i]]; return i; };
      for (let i = 0; i < pts.length; i++) for (let j = i + 1; j < pts.length; j++)
        if (Math.hypot(pts[i][0] - pts[j][0], pts[i][1] - pts[j][1]) < 1.5){
          const a = find(i), c = find(j); if (a !== c) par[a] = c; }
      const by = new Map();
      for (let i = 0; i < pts.length; i++){ const rt = find(i);
        const q = by.get(rt) || [1e9,-1e9,1e9,-1e9];
        q[0] = Math.min(q[0], pts[i][0]); q[1] = Math.max(q[1], pts[i][0]);
        q[2] = Math.min(q[2], pts[i][1]); q[3] = Math.max(q[3], pts[i][1]);
        by.set(rt, q); }
      let d = 0;                                     // самый широкий кластер, НЕ дотягивающий до кромки
      for (const q of by.values()){
        if (q[1] - q[0] > g.W - 1.5) continue;        // это наружная кромка плиты
        d = Math.max(d, q[1] - q[0]); }
      return d; };
    const ov = {mntT:2, mntScrewD:12};
    const g = spec(ov);
    const low = holeD(ov, 0.12), high = holeD(ov, 0.98);
    chk('снизу отверстие — тело винта, сверху — конус головки', high > low + 1,
        {низ:+low.toFixed(2), верх:+high.toFixed(2)});
    chk('  снизу это ровно Ø винта', Math.abs(low - g.sd) < 0.5, {низ:+low.toFixed(2), винт:g.sd});
    /* САМ ОСТАТОК меряется прямо: на какой высоте отверстие перестаёт быть телом винта и начинает
       расширяться конусом. Это и есть материал под потаем — та стенка, которой винт прижимает. */
    let start = g.t;
    for (let k = 1; k <= 40; k++){ const f = k/40;
      if (holeD(ov, f) > g.sd + 0.4){ start = g.t*f; break; } }
    chk('  измеренный остаток под потаем сходится с объявленным',
        Math.abs(start - g.underSink) < g.t*0.06,
        {измерено:+start.toFixed(2), спец:+g.underSink.toFixed(2)});
    chk('  остаток под потаем назван тонким', g.thinUnderSink === true &&
        /под потаем остаётся 0\.60/.test(warn(ov).join(' ')));
    chk('  на умолчаниях он толще двух проходов сопла', spec({}).thinUnderSink === false,
        +spec({}).underSink.toFixed(2));
  }
  /* 7. МОЛЧАЛИВЫЕ ЗАЖИМЫ РЕБРА и слишком большое отверстие. */
  {
    chk('длина ребра, урезанная короткой полкой, объявлена',
        spec({mntGussetLen:150}).glCut === true && /укорочено с 150 до 40/.test(warn({mntGussetLen:150}).join(' ')));
    chk('толщина ребра, урезанная шириной полки, объявлена',
        spec({mntGussetW:30}).gwCut === true && /утоньшено с 30\.0 до 19\.0/.test(warn({mntGussetW:30}).join(' ')));
    chk('отверстие шире полки объявлено', spec({mntW:10, mntScrewD:12}).holeTooBig === true &&
        /рвать будет по отверстию/.test(warn({mntW:10, mntScrewD:12}).join(' ')));
    chk('на умолчаниях зажимов нет',
        spec({}).glCut === false && spec({}).gwCut === false && spec({}).holeTooBig === false);
    chk('слабый кронштейн назван слабым', spec({mntLegA:150, mntW:15, mntT:2}).weak === true &&
        /для полки этого мало/.test(warn({mntLegA:150, mntW:15, mntT:2}).join(' ')));
    chk('  а умолчания слабыми не зовутся', spec({}).weak === false, +spec({}).kg.toFixed(1));
  }
  /* 8. ЧУЖИЕ РАЗНОВИДНОСТИ КРЕПЕЖА НЕ ЗАТРОНУТЫ. */
  chk('строка про уголок есть только у уголка',
      ['vesa','boss','hub','dinclip','tool','pipe','foot','dovetail','gclamp']
        .every(m => line(warn({mntMode:m})) === undefined),
      ['vesa','boss','hub','dinclip','tool','pipe','foot','dovetail','gclamp']
        .filter(m => line(warn({mntMode:m})) !== undefined));
  chk('  и спецификация у них пуста',
      ['vesa','boss','dovetail','gclamp'].every(m => lbracketSpec(setP({mntMode:m})) === null));
  setP({});
}

console.log('\n=== TOTAL:',pass,'passed,',fail,'failed ===');
process.exit(fail?1:0);
