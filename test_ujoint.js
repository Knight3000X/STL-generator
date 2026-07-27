// Universal (Cardan) joint (карданчик, печать в сборе): two forks riding one cross, printed already
// assembled, through the REAL buildTrisForShape pipeline. Watertight, blind sockets that capture the cross,
// clearances that are actually there, and a fork depth derived from the requested angle. Run via ./run-all.sh.
let pass=0,fail=0; function chk(n,c,e){if(c){pass++;console.log('  OK  ',n);}else{fail++;console.log('  FAIL',n,e!==undefined?JSON.stringify(e):'');}}
function vol(t){let v=0;for(const T of t){const a=T[0],b=T[1],c=T[2];v+=(a[0]*(b[1]*c[2]-b[2]*c[1])-a[1]*(b[0]*c[2]-b[2]*c[0])+a[2]*(b[0]*c[1]-b[1]*c[0]))/6;}return v;}
function base(ov){ logos.length=0; boxHoles.length=0; dieFaces.length=0;
  Object.assign(paramState.box, defaultBoxParams(), {width:40,height:40,depth:40,
    gearMode:'ujoint', ujShaftD:10, ujShaftLen:18, ujBoreD:0, ujPinD:4, ujWall:2.5, ujAngle:25, ujClear:0.35,
    fitTune:0,
    pipMode:'none',threadMode:'none',sheetShape:'none',keycapMode:'none',platonic:'none',polyN:0,binRound:0,
    scoopDir:'none',labelTab:'none',mountHoles:'none',gripWall:'none',divX:1,divZ:1,stackFeet:false,gfOn:false}, ov);
  return buildTrisForShape('box',paramState.box); }

// --- Vertex-connected pieces. The app builds every body out of INTERPENETRATING closed primitives that
//     share no vertices, so this splits the joint into primitives, not into parts; `parts()` regroups them.
function pieces(tris){
  const key=v=>v.map(c=>Math.round(c*1e5)).join(','), id=new Map();
  const par=[], find=a=>{ while(par[a]!==a) a=par[a]=par[par[a]]; return a; };
  const uni=(a,b)=>{ a=find(a); b=find(b); if(a!==b) par[b]=a; };
  const vid=v=>{ const k=key(v); let i=id.get(k); if(i===undefined){ i=par.length; id.set(k,i); par.push(i); } return i; };
  const idx=tris.map(T=>T.map(vid));
  for(const T of idx){ uni(T[0],T[1]); uni(T[1],T[2]); }
  const g=new Map();
  for(let t=0;t<idx.length;t++){ const r=find(idx[t][0]); if(!g.has(r)) g.set(r,[]); g.get(r).push(tris[t]); }
  return [...g.values()];
}
// --- Regroup primitives into the three real parts by where they sit: fork A owns everything reaching out
//     along ±X or hanging below, fork B everything along ±Z or standing above, the cross is what is left.
function parts(tris){
  const A=[], B=[], C=[];
  for(const pc of pieces(tris)){
    let cx=0,cy=0,cz=0,n=0;
    for(const T of pc) for(const v of T){ cx+=v[0]; cy+=v[1]; cz+=v[2]; n++; }
    cx/=n; cy/=n; cz/=n;
    const dst = Math.abs(cx)>0.5 ? A : Math.abs(cz)>0.5 ? B : cy<-0.5 ? A : cy>0.5 ? B : C;
    for(const T of pc) dst.push(T);
  }
  return {A,B,C};
}
// --- x of every surface crossing along the +X ray through (y,z)
function hitsX(tris, y, z){
  const xs=[];
  for(const T of tris){
    const [a,b,c]=T;
    const d1=(b[1]-a[1])*(z-a[2])-(b[2]-a[2])*(y-a[1]);
    const d2=(c[1]-b[1])*(z-b[2])-(c[2]-b[2])*(y-b[1]);
    const d3=(a[1]-c[1])*(z-c[2])-(a[2]-c[2])*(y-c[1]);
    if(!((d1>=0&&d2>=0&&d3>=0)||(d1<=0&&d2<=0&&d3<=0))) continue;
    const A=(b[1]-a[1])*(c[2]-a[2])-(b[2]-a[2])*(c[1]-a[1]); if(Math.abs(A)<1e-12) continue;
    const w1=((b[1]-y)*(c[2]-z)-(b[2]-z)*(c[1]-y))/A, w2=((c[1]-y)*(a[2]-z)-(c[2]-z)*(a[1]-y))/A;
    xs.push(w1*a[0]+w2*b[0]+(1-w1-w2)*c[0]);
  }
  return xs.sort((u,v)=>u-v);
}
const alongY=(t,x,z)=>hitsX(t.map(T=>T.map(v=>[v[1],v[2],v[0]])), z, x);
const alongZ=(t,x,y)=>hitsX(t.map(T=>T.map(v=>[v[2],v[0],v[1]])), x, y);
const uniq=xs=>xs.filter((v,i)=>i===0||v-xs[i-1]>1e-6);
// --- closest approach between two vertex clouds, on a grid so the sweep stays cheap
function minGap(P, Q, cell){
  const g=new Map();
  for(const q of Q){ const k=Math.floor(q[0]/cell)+','+Math.floor(q[1]/cell)+','+Math.floor(q[2]/cell);
    if(!g.has(k)) g.set(k,[]); g.get(k).push(q); }
  let best=1e9;
  for(const p of P){ const gx=Math.floor(p[0]/cell), gy=Math.floor(p[1]/cell), gz=Math.floor(p[2]/cell);
    for(let dx=-2;dx<=2;dx++)for(let dy=-2;dy<=2;dy++)for(let dz=-2;dz<=2;dz++){
      const arr=g.get((gx+dx)+','+(gy+dy)+','+(gz+dz)); if(!arr) continue;
      for(const q of arr){ const d=Math.hypot(p[0]-q[0],p[1]-q[1],p[2]-q[2]); if(d<best) best=d; } } }
  return best;
}
const vertsOf=t=>{ const out=[], seen=new Set();
  for(const T of t) for(const v of T){ const k=v.map(c=>Math.round(c*1e4)).join(','); if(!seen.has(k)){ seen.add(k); out.push(v); } }
  return out; };

console.log('=== watertight across shaft × pin × wall × angle ===');
for(const sd of [6,10,20])
  for(const pd of [2,4,8])
    for(const w of [1.5,2.5,4])
      for(const ang of [10,25,45]){
        const t=base({ujShaftD:sd,ujPinD:pd,ujWall:w,ujAngle:ang}); const mc=manifoldCheck(t,4);
        chk('Øвал'+sd+' Øшип'+pd+' ст'+w+' '+ang+'° watertight (+vol)', mc.watertight&&vol(t)>0,
            {wt:mc.watertight,open:mc.openEdges,bad:mc.badEdges,v:+vol(t).toFixed(1)});
      }
for(const clr of [0.1,0.35,0.6,0.9])
  for(const bore of [0,4,8]){
    const t=base({ujClear:clr,ujBoreD:bore}); const mc=manifoldCheck(t,4);
    chk('зазор'+clr+' бор'+bore+' watertight (+vol)', mc.watertight&&vol(t)>0,
        {wt:mc.watertight,open:mc.openEdges,bad:mc.badEdges});
  }
for(const sl of [4,18,60,150]){
  const t=base({ujShaftLen:sl}); const mc=manifoldCheck(t,4);
  chk('вылет'+sl+' watertight', mc.watertight, {open:mc.openEdges,bad:mc.badEdges});
}

console.log('=== it is an ASSEMBLY: two forks and a cross, none of them touching ===');
{ const t=base(), {A,B,C}=parts(t);
  chk('all three parts came out non-empty', A.length>0&&B.length>0&&C.length>0, {a:A.length,b:B.length,c:C.length});
  chk('every part is closed on its own',
      manifoldCheck(A,4).watertight&&manifoldCheck(B,4).watertight&&manifoldCheck(C,4).watertight,
      [manifoldCheck(A,4).openEdges,manifoldCheck(B,4).openEdges,manifoldCheck(C,4).openEdges]);
  chk('the two forks are identical in volume', Math.abs(vol(A)-vol(B))<1e-6*Math.abs(vol(B)),
      {a:+vol(A).toFixed(3),b:+vol(B).toFixed(3)});
  const bc=computeBBox(C);
  chk('the cross is the small central part', Math.abs(bc.maxY+bc.minY)<1e-9 && bc.maxY-bc.minY<12,
      {y:+(bc.maxY-bc.minY).toFixed(2)});
  chk('the cross reaches equally far along both pins',
      Math.abs((bc.maxX-bc.minX)-(bc.maxZ-bc.minZ))<1e-9, {x:+(bc.maxX-bc.minX).toFixed(3)});
  const gA=minGap(vertsOf(C), vertsOf(A), 1.5), gB=minGap(vertsOf(C), vertsOf(B), 1.5);
  const gF=minGap(vertsOf(A), vertsOf(B), 2.0);
  chk('cross never touches fork A', gA>0.2, {gap:+gA.toFixed(3)});
  chk('cross never touches fork B', gB>0.2, {gap:+gB.toFixed(3)});
  chk('the forks never touch each other', gF>0.2, {gap:+gF.toFixed(3)});
  chk('and the parts are not merely far apart — the cross sits INSIDE both forks',
      gA<1.2 && gB<1.2, {a:+gA.toFixed(3),b:+gB.toFixed(3)});
}

console.log('=== the socket is BLIND, so the cross is captured ===');
// Along the pin axis the ray meets, outward from the middle: the OTHER pin's wall, this pin's end cap,
// the socket floor, the eye's solid far end. Eight crossings, symmetric — anything else means the socket
// is open at the end, or the pin runs into it.
{ const t=base(), xs=uniq(hitsX(t, 0, 0));
  chk('eight crossings along the pin axis', xs.length===8, xs.map(v=>+v.toFixed(2)));
  if(xs.length===8){
    const [oL,fL,pL,zL,zR,pR,fR,oR]=xs;
    chk('the ray is symmetric about the pivot',
        Math.abs(oL+oR)<1e-9 && Math.abs(fL+fR)<1e-9 && Math.abs(pL+pR)<1e-9 && Math.abs(zL+zR)<1e-9,
        xs.map(v=>+v.toFixed(4)));
    chk('the middle pair is the other pin, at its own radius', Math.abs((zR-zL)-4)<1e-9, {d:+(zR-zL).toFixed(4)});
    chk('pin end stops short of the socket floor', fR-pR>0.05 && fR-pR<0.9, {slack:+(fR-pR).toFixed(3)});
    chk('solid material beyond the socket floor', oR-fR>1.0, {cap:+(oR-fR).toFixed(2)});
    chk('the whole axial travel is smaller than the engagement',
        2*(fR-pR) < (fR-pL)/2, {travel:+(2*(fR-pR)).toFixed(2), engaged:+(fR-pL).toFixed(2)});
  }
}
{ const t=base(), a=uniq(hitsX(t,0,0)).map(v=>+v.toFixed(6)), b=uniq(alongZ(t,0,0)).map(v=>+v.toFixed(6));
  chk('the other fork is built exactly the same way', JSON.stringify(a)===JSON.stringify(b), {a,b}); }
// Across the socket at the pivot height: eye wall → bore → pin → pin → bore → eye wall. The arm hangs
// below the bore, so a ray at y = 0 sees the bearing surfaces and nothing else.
const radial=(p)=>{ const t=base(p), xs=uniq(hitsX(t,0,0));
  return xs.length===8 ? uniq(alongZ(t, xs[5]-0.5, 0)) : []; };
{ const zs=radial({ujClear:0.35,ujPinD:4,ujWall:2.5});
  chk('six crossings across the socket', zs.length===6, zs.map(v=>+v.toFixed(3)));
  if(zs.length===6){
    chk('bore − pin = the requested clearance, both sides',
        Math.abs((zs[2]-zs[1])-0.35)<1e-9 && Math.abs((zs[4]-zs[3])-0.35)<1e-9,
        {a:+(zs[2]-zs[1]).toFixed(4), b:+(zs[4]-zs[3]).toFixed(4)});
    chk('the eye wall is the requested thickness', Math.abs((zs[1]-zs[0])-2.5)<1e-9, {wall:+(zs[1]-zs[0]).toFixed(4)});
    chk('the pin is the requested diameter', Math.abs((zs[3]-zs[2])-4)<1e-9, {d:+(zs[3]-zs[2]).toFixed(4)});
  }
}

console.log('=== clearances follow the knob, including the global fitTune ===');
for(const clr of [0.15,0.35,0.7]){
  const zs=radial({ujClear:clr});
  chk('зазор '+clr+' → measured bore−pin tracks it',
      zs.length===6 && Math.abs((zs[2]-zs[1])-clr)<1e-9, {clr, got:zs.length===6?+(zs[2]-zs[1]).toFixed(4):null});
}
{ const gap=p=>{ const zs=radial(p); return zs.length===6 ? zs[2]-zs[1] : NaN; };
  const tight=gap({fitTune:-0.2}), loose=gap({fitTune:0.3});
  chk('global fitTune reaches this joint too', Math.abs(loose-tight-0.5)<1e-9,
      {tight:+tight.toFixed(4), loose:+loose.toFixed(4)}); }
for(const w of [1.5,4]) { const zs=radial({ujWall:w});
  chk('eye wall '+w+' is really that thick', zs.length===6 && Math.abs((zs[1]-zs[0])-w)<1e-9,
      {got:zs.length===6?+(zs[1]-zs[0]).toFixed(4):null}); }

console.log('=== the fork depth is DERIVED from the requested angle ===');
{ const ys=[10,20,30,45].map(a=>{ const b=computeBBox(base({ujAngle:a})); return b.maxY-b.minY; });
  chk('a bigger angle makes a deeper fork', ys[0]<ys[1] && ys[1]<ys[2] && ys[2]<ys[3], ys.map(v=>+v.toFixed(2)));
  chk('and it costs length, not clearance', ys[3]-ys[0]>3, {d:+(ys[3]-ys[0]).toFixed(2)});
}
{ // the real test of the derivation: tilt fork B by the angle it was designed for and look for a collision
  for(const ang of [10,25,40]){
    const {A,B,C}=parts(base({ujAngle:ang}));
    const c=Math.cos(ang*Math.PI/180), s=Math.sin(ang*Math.PI/180);
    const tilt=t=>t.map(T=>T.map(v=>[v[0]*c-v[1]*s, v[0]*s+v[1]*c, v[2]]));   // about the Z pin, which B rides
    const tB=tilt(B);
    chk('at '+ang+'° fork B still clears fork A', minGap(vertsOf(tB), vertsOf(A), 2.0)>0.15,
        {ang, gap:+minGap(vertsOf(tB), vertsOf(A), 2.0).toFixed(3)});
    chk('at '+ang+'° fork B still clears the cross', minGap(vertsOf(tB), vertsOf(C), 2.0)>0.1,
        {ang, gap:+minGap(vertsOf(tB), vertsOf(C), 2.0).toFixed(3)});
  }
}
{ // and it is not simply over-built: one step past the declared angle the fork does run out of room
  const ang=10, {A,B}=parts(base({ujAngle:ang}));
  const at=a=>{ const c=Math.cos(a*Math.PI/180), s=Math.sin(a*Math.PI/180);
    return minGap(vertsOf(B.map(T=>T.map(v=>[v[0]*c-v[1]*s, v[0]*s+v[1]*c, v[2]]))), vertsOf(A), 2.0); };
  chk('the fork is sized for the angle asked for, not for every angle', at(10)>0.15 && at(45)<at(10),
      {at10:+at(10).toFixed(3), at45:+at(45).toFixed(3)});
}

console.log('=== dimensions and options ===');
{ const a=computeBBox(base({ujShaftLen:18})), b=computeBBox(base({ujShaftLen:38}));
  chk('shaft length adds 2× to the total height', Math.abs((b.maxY-b.minY)-(a.maxY-a.minY)-40)<0.05,
      {d:+((b.maxY-b.minY)-(a.maxY-a.minY)).toFixed(3)}); }
{ const b=computeBBox(base()); chk('centered on Y', Math.abs(b.maxY+b.minY)<1e-9, {c:+(b.maxY+b.minY).toFixed(9)}); }
{ const b=computeBBox(base());
  chk('square in plan (both forks reach the same way)', Math.abs((b.maxX-b.minX)-(b.maxZ-b.minZ))<1e-9,
      {x:+(b.maxX-b.minX).toFixed(4),z:+(b.maxZ-b.minZ).toFixed(4)}); }
{ const solid=vol(base({ujBoreD:0})), bored=vol(base({ujBoreD:6}));
  chk('a shaft bore removes material', bored<solid-50, {solid:+solid.toFixed(0),bored:+bored.toFixed(0)}); }
{ const t=base({ujBoreD:6}), b=computeBBox(t);
  const r=uniq(hitsX(t, b.minY+1, 0));                   // across the shaft, just above its free end
  chk('the shaft bore shows up as a hole in cross-section', r.length===4, r.map(v=>+v.toFixed(3)));
  if(r.length===4){
    chk('bore Ø = ujBoreD', Math.abs((r[2]-r[1])-6)<1e-9, {d:+(r[2]-r[1]).toFixed(4)});
    chk('and it is centred in the shaft', Math.abs(r[0]+r[3])<1e-9 && Math.abs(r[1]+r[2])<1e-9, r); } }
{ const t=base({ujBoreD:0}), b=computeBBox(t);
  const r=uniq(hitsX(t, b.minY+1, 0));
  chk('with no bore the shaft is solid', r.length===2, r.map(v=>+v.toFixed(3))); }
{ const wide=computeBBox(base({ujShaftD:24})), narrow=computeBBox(base({ujShaftD:6}));
  chk('a fat shaft never shrinks the flange', wide.maxX-wide.minX >= narrow.maxX-narrow.minX-1e-9,
      {wide:+(wide.maxX-wide.minX).toFixed(2),narrow:+(narrow.maxX-narrow.minX).toFixed(2)}); }
{ const thin=vol(base({ujWall:1.5})), thick=vol(base({ujWall:4}));
  chk('a thicker eye wall adds material', thick>thin, {thin:+thin.toFixed(0),thick:+thick.toFixed(0)}); }
{ const small=computeBBox(base({ujPinD:2})), big=computeBBox(base({ujPinD:8}));
  chk('a fatter pin makes a wider joint', big.maxX-big.minX > small.maxX-small.minX,
      {small:+(small.maxX-small.minX).toFixed(2), big:+(big.maxX-big.minX).toFixed(2)}); }

console.log('=== degenerate and extreme inputs still close ===');
for(const ov of [{ujShaftD:4,ujPinD:8},{ujPinD:1.5,ujWall:10},{ujShaftD:60,ujPinD:1.5},
                 {ujBoreD:40},{ujShaftLen:4,ujAngle:45,ujClear:0.9},{ujWall:1.2,ujClear:0.1,ujPinD:20},
                 {ujBoreD:0.4},{ujShaftD:4,ujBoreD:20}]){
  const t=base(ov), mc=manifoldCheck(t,4), pr=parts(t);
  chk('extreme '+JSON.stringify(ov)+' watertight', mc.watertight&&vol(t)>0,
      {open:mc.openEdges,bad:mc.badEdges,v:+vol(t).toFixed(1)});
  chk('extreme '+JSON.stringify(ov)+' still three closed parts',
      manifoldCheck(pr.A,4).watertight&&manifoldCheck(pr.B,4).watertight&&manifoldCheck(pr.C,4).watertight,
      {a:manifoldCheck(pr.A,4).openEdges,b:manifoldCheck(pr.B,4).openEdges,c:manifoldCheck(pr.C,4).openEdges});
  chk('extreme '+JSON.stringify(ov)+' cross still free',
      minGap(vertsOf(pr.C), vertsOf(pr.A), 2.0)>0.04, {gap:+minGap(vertsOf(pr.C), vertsOf(pr.A), 2.0).toFixed(3)});
}

console.log('=== the joint does not leak into the other gear modes ===');
for(const m of ['spur','cam','follower','worm','planetary']){
  const t=base({gearMode:m}); chk(m+' unaffected', manifoldCheck(t,4).watertight, {open:manifoldCheck(t,4).openEdges});
}

console.log('\n'+(fail?'FAILED':'ALL PASSED')+': '+pass+' passed, '+fail+' failed');
if(fail) process.exitCode=1;
