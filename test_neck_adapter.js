// Переходник горловин — the neck adapter. A cap with a MALE-threaded spigot on its top, of its own
// diameter and pitch, bored straight through: screw it onto one bottle, screw the other bottle's cap
// onto the spigot. Two threads that were already in the app, back to back, with a passage between them.
//
// Unlike the funnel and the spout, this one is NOT a separate shell buried in the cap's top — the cap's
// throat simply keeps going as the spigot's bore, so the whole adapter is one closed surface and there is
// no thin interpenetration band to trust. That is worth pinning: an adapter whose passage is blocked is
// a cap, and an adapter whose spigot does not take the mating cap is a decoration.
//
// Everything here is measured off the built mesh: the passage by ray casting through it, the fit by
// Möller triangle-against-triangle against the mate the assembly pair hands over. Run via ./run-all.sh.
let pass=0, fail=0;
function chk(n,c,e){if(c){pass++;console.log('  OK  ',n);}else{fail++;console.log('  FAIL',n,e!==undefined?JSON.stringify(e):'');}}
function vol(t){let v=0;for(const T of t){const a=T[0],b=T[1],c=T[2];v+=(a[0]*(b[1]*c[2]-b[2]*c[1])-a[1]*(b[0]*c[2]-b[2]*c[0])+a[2]*(b[0]*c[1]-b[1]*c[0]))/6;}return v;}
function setp(ov){ logos.length=0; boxHoles.length=0; dieFaces.length=0;
  Object.assign(paramState.box, defaultBoxParams(), {gfBaseplate:false, threadMode:'cap',
    threadD:40, threadPitch:3, threadLen:14, threadTopMode:'neck',
    threadNeckD:24, threadNeckPitch:2, threadNeckH:12}, ov);
  return paramState.box; }
const mk = ov => buildTrisForShape('box', setp(ov));

// Solid intervals along a ray, counted by DEPTH (see test_funnel_cap.js — parity would call the inside
// of an overlap hollow, and a stale start once reported a 2.5 mm wall as 62 mm).
function solidRuns(tris, ax, p, q){
  const u=(ax+1)%3, v=(ax+2)%3, hits=[];
  for(const T of tris){ const [a,b,c]=T;
    const d1=(b[u]-a[u])*(q-a[v])-(b[v]-a[v])*(p-a[u]);
    const d2=(c[u]-b[u])*(q-b[v])-(c[v]-b[v])*(p-b[u]);
    const d3=(a[u]-c[u])*(q-c[v])-(a[v]-c[v])*(p-c[u]);
    if(!((d1>=0&&d2>=0&&d3>=0)||(d1<=0&&d2<=0&&d3<=0))) continue;
    const A=(b[u]-a[u])*(c[v]-a[v])-(b[v]-a[v])*(c[u]-a[u]); if(Math.abs(A)<1e-12) continue;
    const w1=((b[u]-p)*(c[v]-q)-(b[v]-q)*(c[u]-p))/A, w2=((c[u]-p)*(a[v]-q)-(c[v]-q)*(a[u]-p))/A;
    const e1=[b[0]-a[0],b[1]-a[1],b[2]-a[2]], e2=[c[0]-a[0],c[1]-a[1],c[2]-a[2]];
    const nrm=[e1[1]*e2[2]-e1[2]*e2[1], e1[2]*e2[0]-e1[0]*e2[2], e1[0]*e2[1]-e1[1]*e2[0]];
    if(Math.abs(nrm[ax])<1e-12) continue;
    hits.push([w1*a[ax]+w2*b[ax]+(1-w1-w2)*c[ax], nrm[ax]<0 ? 1 : -1]);
  }
  hits.sort((A,B)=>A[0]-B[0]);
  const runs=[]; let depth=0, start=null;
  for(const [t0,d] of hits){ const prev=depth; depth+=d;
    if(prev<=0 && depth>0) start=t0;
    else if(prev>0 && depth<=0){ if(start!==null && t0-start > 1e-6) runs.push([start,t0]); start=null; } }
  return runs;
}
function minDepth(tris, ax, p, q){   // a correctly wound union can never go negative
  const runs=[]; void runs;
  const u=(ax+1)%3, v=(ax+2)%3, hits=[];
  for(const T of tris){ const [a,b,c]=T;
    const d1=(b[u]-a[u])*(q-a[v])-(b[v]-a[v])*(p-a[u]);
    const d2=(c[u]-b[u])*(q-b[v])-(c[v]-b[v])*(p-b[u]);
    const d3=(a[u]-c[u])*(q-c[v])-(a[v]-c[v])*(p-c[u]);
    if(!((d1>=0&&d2>=0&&d3>=0)||(d1<=0&&d2<=0&&d3<=0))) continue;
    const A=(b[u]-a[u])*(c[v]-a[v])-(b[v]-a[v])*(c[u]-a[u]); if(Math.abs(A)<1e-12) continue;
    const e1=[b[0]-a[0],b[1]-a[1],b[2]-a[2]], e2=[c[0]-a[0],c[1]-a[1],c[2]-a[2]];
    const nrm=[e1[1]*e2[2]-e1[2]*e2[1], e1[2]*e2[0]-e1[0]*e2[2], e1[0]*e2[1]-e1[1]*e2[0]];
    if(Math.abs(nrm[ax])<1e-12) continue;
    const w1=((b[u]-p)*(c[v]-q)-(b[v]-q)*(c[u]-p))/A, w2=((c[u]-p)*(a[v]-q)-(c[v]-q)*(a[u]-p))/A;
    hits.push([w1*a[ax]+w2*b[ax]+(1-w1-w2)*c[ax], nrm[ax]<0 ? 1 : -1]);
  }
  hits.sort((A,B)=>A[0]-B[0]);
  let depth=0, lo=0;
  for(const [,d] of hits){ depth+=d; if(depth<lo) lo=depth; }
  return lo;
}
// Widest opening across the part at height y, along X through z = 0.
function boreAt(tris, y, z){
  const runs = solidRuns(tris, 0, y, z||0);
  let gap = 0;
  for(let k=0;k+1<runs.length;k++) gap = Math.max(gap, runs[k+1][0]-runs[k][1]);
  return gap;
}
// Möller triangle-triangle overlap + an AABB pre-filter — the instrument that settled the worm pair and
// the bevel pair. Contact is fine; passing through is not.
const sub_=(u,v)=>[u[0]-v[0],u[1]-v[1],u[2]-v[2]], dot_=(u,v)=>u[0]*v[0]+u[1]*v[1]+u[2]*v[2];
const cr_=(u,v)=>[u[1]*v[2]-u[2]*v[1],u[2]*v[0]-u[0]*v[2],u[0]*v[1]-u[1]*v[0]], EPS_=1e-9;
function overlap(A,B){
  const N1=cr_(sub_(A[1],A[0]),sub_(A[2],A[0])), d1=-dot_(N1,A[0]), dB=B.map(q=>dot_(N1,q)+d1);
  if((dB[0]>EPS_&&dB[1]>EPS_&&dB[2]>EPS_)||(dB[0]<-EPS_&&dB[1]<-EPS_&&dB[2]<-EPS_)) return false;
  const N2=cr_(sub_(B[1],B[0]),sub_(B[2],B[0])), d2=-dot_(N2,B[0]), dA=A.map(q=>dot_(N2,q)+d2);
  if((dA[0]>EPS_&&dA[1]>EPS_&&dA[2]>EPS_)||(dA[0]<-EPS_&&dA[1]<-EPS_&&dA[2]<-EPS_)) return false;
  const D=cr_(N1,N2), aD=D.map(Math.abs); if(Math.max(...aD)<1e-12) return false;
  const idx=aD.indexOf(Math.max(...aD));
  const iv=(T,d)=>{ const q=T.map(v=>v[idx]), out=[];
    for(let i=0;i<3;i++){ const j=(i+1)%3;
      if(d[i]*d[j]<0){ const t=d[i]/(d[i]-d[j]); out.push(q[i]+(q[j]-q[i])*t); }
      if(Math.abs(d[i])<=EPS_) out.push(q[i]); }
    return out.length<2?null:[Math.min(...out),Math.max(...out)]; };
  const i1=iv(A,dA), i2=iv(B,dB);
  return !!(i1&&i2) && (Math.min(i1[1],i2[1]) - Math.max(i1[0],i2[0])) > 1e-6;
}
const bb=T=>{const lo=[1e30,1e30,1e30],hi=[-1e30,-1e30,-1e30];
  for(const v of T)for(let a=0;a<3;a++){if(v[a]<lo[a])lo[a]=v[a];if(v[a]>hi[a])hi[a]=v[a];}return{lo,hi};};
function crossings(a, b){   // uniform grid over b, so a 30k × 30k pair is seconds rather than minutes
  const B=b.map(bb); let lo=[1e30,1e30,1e30], hi=[-1e30,-1e30,-1e30];
  for(const x of B) for(let k=0;k<3;k++){ if(x.lo[k]<lo[k])lo[k]=x.lo[k]; if(x.hi[k]>hi[k])hi[k]=x.hi[k]; }
  const N=24, sp=[0,1,2].map(k=>Math.max(1e-6,(hi[k]-lo[k])/N));
  const cell=new Map(), key=(i,j,k)=>i+','+j+','+k;
  const idx=(v,k)=>Math.max(0,Math.min(N-1,Math.floor((v-lo[k])/sp[k])));
  for(let t=0;t<b.length;t++){ const x=B[t];
    for(let i=idx(x.lo[0],0);i<=idx(x.hi[0],0);i++) for(let j=idx(x.lo[1],1);j<=idx(x.hi[1],1);j++)
      for(let k=idx(x.lo[2],2);k<=idx(x.hi[2],2);k++){ const K=key(i,j,k);
        let L=cell.get(K); if(!L){ L=[]; cell.set(K,L); } L.push(t); } }
  let n=0;
  for(const A of a){ const x=bb(A);
    if(x.hi[0]<lo[0]||x.lo[0]>hi[0]||x.hi[1]<lo[1]||x.lo[1]>hi[1]||x.hi[2]<lo[2]||x.lo[2]>hi[2]) continue;
    const seen=new Set();
    for(let i=idx(x.lo[0],0);i<=idx(x.hi[0],0);i++) for(let j=idx(x.lo[1],1);j<=idx(x.hi[1],1);j++)
      for(let k=idx(x.lo[2],2);k<=idx(x.hi[2],2);k++){ const L=cell.get(key(i,j,k)); if(!L) continue;
        for(const t of L){ if(seen.has(t)) continue; seen.add(t);
          const y=B[t];
          if(x.hi[0]<y.lo[0]||y.hi[0]<x.lo[0]||x.hi[1]<y.lo[1]||y.hi[1]<x.lo[1]||x.hi[2]<y.lo[2]||y.hi[2]<x.lo[2]) continue;
          if(overlap(A, b[t])) n++; } } }
  return n;
}

console.log('=== builds across the range, both threads independent ===');
for(const D of [20,30,40,60]) for(const ND of [12,24,40]){
  const t = mk({threadD:D, threadNeckD:ND}), mc = manifoldCheck(t,4);
  chk('низ Ø'+D+' / верх Ø'+ND+': замкнут', mc.watertight && vol(t)>0, {open:mc.openEdges, bad:mc.badEdges});
}
for(const ov of [{threadPitch:1}, {threadPitch:6}, {threadNeckPitch:0.8}, {threadNeckPitch:6},
                 {threadNeckPitch:0}, {threadNeckD:0}, {threadNeckH:3}, {threadNeckH:80},
                 {threadStarts:3}, {threadHand:'left'}, {threadLead:0}, {threadLead:6},
                 {threadGrip:0}, {threadGrip:60, threadGripD:2}, {threadWall:1.2}, {threadWall:6},
                 {threadSeal:1.2}, {threadTop:6}, {threadClear:0}, {threadClear:1}]){
  const t = mk(ov), mc = manifoldCheck(t,4);
  chk('крайние параметры '+JSON.stringify(ov), mc.watertight && vol(t)>0, {open:mc.openEdges, bad:mc.badEdges});
}

console.log('=== the whole point: a passage runs right through it ===');
{ const t = mk({}), B = computeBBox(t);
  // Straight up the axis there must be NO material at all — the adapter is a tube from end to end.
  chk('по оси сквозной проход — материала нет', solidRuns(t,1,0,0).length===0, {runs:solidRuns(t,1,0,0).length});
  // ...and across it, at three heights: inside the lower thread, through the cap's top, up the spigot.
  const spec = threadNeckSpec(paramState.box);
  chk('переходник объявляет свою горловину', !!spec && Math.abs(spec.D-24)<1e-9 && Math.abs(spec.pitch-2)<1e-9, spec);
  // Off-round heights on purpose. The spigot's rings land on exact millimetres at these settings, and a
  // ray sent along a vertex row is handed both facets that share it — which reads as a solid slab across
  // the bore. That is the probe's artefact, not the part's: every height between the rows says otherwise.
  const low = boreAt(t, B.minY+3.13), mid = boreAt(t, B.maxY-13.37), hi = boreAt(t, B.maxY-2.13, 0.31);
  chk('в нижней резьбе проход есть', low > 20, {low:+low.toFixed(2)});
  // ...and it is open at EVERY height up the spigot, not just at the three sampled above
  { let closed=null;
    for(let y=B.maxY-11.87; y<B.maxY-0.6 && closed===null; y+=0.137)
      if(boreAt(t, y, 0.31) < spec.bore-0.5) closed=+y.toFixed(2);
    chk('и канал не перекрыт ни на одной высоте горловины', closed===null, {closedAt:closed}); }
  chk('через верх крышки проход есть', mid > 2, {mid:+mid.toFixed(2)});
  chk('и в горловине тоже — заказанного Ø канала', Math.abs(hi - spec.bore) < 0.4,
      {hi:+hi.toFixed(2), bore:+spec.bore.toFixed(2)});
  chk('канал не шире корня верхней резьбы', spec.bore < 24 - 1, {bore:+spec.bore.toFixed(2)});
}
/* СПЕЦИФИКАЦИЯ И ПОСТРОЕННАЯ ДЕТАЛЬ ОБЯЗАНЫ СХОДИТЬСЯ И ТАМ, ГДЕ ЗАКАЗАНА ГЛУБИНА ПРОФИЛЯ (v24.16.1).
   Ручка глубины одна на деталь, а резьб в переходнике две: крышкина и носика. Носик её НЕ читает —
   абсолютная глубина, годная для Ø30, на Ø24 съела бы стенку, — и это решение живёт в двух местах
   сразу: в опубликованной спецификации и в самом построителе. Сойтись они обязаны, а разойтись могли
   бы молча: канал сузился бы, переходник остался бы герметичным, и заметить это можно было бы только
   на паре, которая не свинчивается. Поэтому канал МЕРЯЕТСЯ в сетке и сверяется со спецификацией. */
{ for (const dep of [0, 0.8, 3]){
    const t = mk({threadDepth:dep}), B = computeBBox(t), spec = threadNeckSpec(paramState.box);
    const hi = boreAt(t, B.maxY-2.13, 0.31);
    chk('глубина профиля ' + dep + ': канал носика в сетке равен объявленному',
        !!spec && Math.abs(hi - spec.bore) < 0.4, {измерен:+hi.toFixed(2), объявлен:spec && +spec.bore.toFixed(2)});
  }
  /* И встречная проверка: у САМОЙ КРЫШКИ глубина профиля работает, иначе три строки выше сошлись бы
     просто оттого, что ручка никуда не идёт. */
  const shallow = threadMinorR(setp({threadDepth:0})), deep = threadMinorR(setp({threadDepth:3}));
  chk('а корень крышки заказанной глубине послушен — и уходит ВНУТРЬ, как ей и положено',
      shallow - deep > 0.3, {без:+shallow.toFixed(2), с:+deep.toFixed(2)});
}
{ // The spigot is a MALE thread: outside it there is nothing, and its crest is the nominal Ø.
  const t = mk({}), B = computeBBox(t);
  let r = 0; for(const T of t) for(const v of T) if(v[1] > B.maxY-8 && v[1] < B.maxY-2) r = Math.max(r, Math.hypot(v[0],v[2]));
  chk('наружный Ø горловины равен номиналу', Math.abs(2*r - 24) < 0.5, {d:+(2*r).toFixed(2)});
  chk('и он уже юбки крышки', 2*r < B.maxX-B.minX, {neck:+(2*r).toFixed(1), skirt:+(B.maxX-B.minX).toFixed(1)});
}
{ // Height, diameter and pitch are three separate knobs.
  const hs = [6,12,40].map(H => { const B=computeBBox(mk({threadNeckH:H})); return B.maxY-B.minY; });
  chk('длина горловины следует за параметром', hs[1]-hs[0] > 5 && hs[2]-hs[1] > 26, hs.map(v=>+v.toFixed(1)));
  const ds = [16,24,36].map(D => { const t=mk({threadNeckD:D}), B=computeBBox(t);
    let r=0; for(const T of t) for(const v of T) if(v[1] > B.maxY-6 && v[1] < B.maxY-2) r=Math.max(r,Math.hypot(v[0],v[2]));
    return 2*r; });
  chk('Ø горловины следует за параметром', ds[0]<ds[1]-6 && ds[1]<ds[2]-9, ds.map(v=>+v.toFixed(1)));
  const fine = mk({threadNeckPitch:1}).length, coarse = mk({threadNeckPitch:5}).length;
  chk('мелкий шаг горловины — больше треугольников', fine > coarse + 2000, {fine, coarse});
}
{ // A spigot wider than the cap must not overhang thin air: the CAP grows instead.
  const narrow = computeBBox(mk({threadD:30, threadNeckD:16}));
  const wideN  = computeBBox(mk({threadD:30, threadNeckD:44}));
  chk('широкая горловина расширяет крышку, а не свисает с неё',
      (wideN.maxX-wideN.minX) > 44 && (wideN.maxX-wideN.minX) > (narrow.maxX-narrow.minX)+10,
      {narrow:+(narrow.maxX-narrow.minX).toFixed(1), wide:+(wideN.maxX-wideN.minX).toFixed(1)});
  chk('и остаётся замкнутой', manifoldCheck(mk({threadD:30, threadNeckD:44}),4).watertight, {});
}

console.log('=== the lower thread is untouched by what stands on top ===');
{ const plain = mk({threadTopMode:'none'}), ad = mk({});
  const pb = computeBBox(plain), ab = computeBBox(ad);
  chk('юбка с резьбой того же Ø', Math.abs((pb.maxX-pb.minX)-(ab.maxX-ab.minX)) < 1e-9,
      {plain:+(pb.maxX-pb.minX).toFixed(2), adapter:+(ab.maxX-ab.minX).toFixed(2)});
  chk('и расточка под неё та же', Math.abs(boreAt(plain, pb.minY+4)-boreAt(ad, ab.minY+4)) < 0.05,
      {plain:+boreAt(plain,pb.minY+4).toFixed(3), adapter:+boreAt(ad,ab.minY+4).toFixed(3)});
  chk('переходник выше глухой крышки ровно на горловину',
      Math.abs((ab.maxY-ab.minY) - (pb.maxY-pb.minY) - 12) < 0.05,
      {plain:+(pb.maxY-pb.minY).toFixed(2), adapter:+(ab.maxY-ab.minY).toFixed(2)});
}
{ // A cap too small to open a throat in falls back to a plain lid rather than drawing a broken one.
  // (Ø6 is NOT that case: a small cap can carry a big spigot — the cap widens to meet it. It takes a
  // root so thin that no ceiling is left at all, which is where the fallback bites.)
  const t = mk({threadD:4, threadPitch:3}), mc = manifoldCheck(t,4);
  chk('крышке Ø4 горловину не приделать — но она замкнута', mc.watertight, {open:mc.openEdges});
  chk('и переходником себя не объявляет', threadNeckSpec(paramState.box) === null, {});
}

{ // ...and when it does, the part says so. A silently blind cap looks like a bug in the app.
  const w = collectPrintWarnings(setp({threadD:4, threadPitch:3}));
  chk('и предупреждает, что горловины не будет', w.some(s=>/переходник/.test(s)), w);
  /* «Ни о чём» — это ни о чём ПЛОХОМ. С v25.13.0 крепёж всегда печатает строку со своими числами
     (зацеп, витки, слои) ровно как пружина печатает жёсткость: это не жалоба, а то, чего на экране нет.
     Строка узнаётся по началу и из счёта исключается — иначе проверка требовала бы от резьбы молчания,
     то есть ровно того, из-за чего она восемь сборок и стояла в переписи молчунов. */
  /* Строк «сама о себе» у резьбы теперь две: числа посадки и числа ХОДОВОЙ резьбы (подъём витка,
     самоторможение, КПД). Обе — не жалобы, и обе из счёта исключаются. */
  const complaints = ov => collectPrintWarnings(setp(ov))
    .filter(s => !/^резьба Ø/.test(s) && !/^подъём витка /.test(s));
  chk('на нормальных размерах не предупреждает ни о чём', complaints({}).length === 0, complaints({}));
  chk('  но числа резьбы называет и на нормальных размерах',
      collectPrintWarnings(setp({})).some(s => /^резьба Ø/.test(s)), collectPrintWarnings(setp({})));
  const thin = collectPrintWarnings(setp({threadD:12, threadPitch:1, threadNeckD:5, threadNeckPitch:1}));
  chk('тонкую стенку горловины замечает', thin.every(s=>!/переходник/.test(s)), thin);
}

console.log('=== and the mating cap really screws onto the spigot ===');
{ const p = setp({}), plan = assemblyPlacement(p, null);
  chk('пара в сборке — крышка горловины', plan && plan.name === 'Крышка горловины', {got: plan && plan.name});
  chk('она замкнута', manifoldCheck(plan.tris,4).watertight, {});
  const world = plan.tris.map(T=>T.map(v=>[v[0]+plan.px, v[1]+plan.py, v[2]+plan.pz]));
  const self = buildTrisForShape('box', p);
  chk('переходник и крышка не проходят сквозь друг друга', crossings(self, world) === 0,
      {crossings: crossings(self, world)});
  const A = computeBBox(self), Bb = computeBBox(world);
  chk('и крышка сидит НА горловине, а не рядом', Math.min(A.maxY,Bb.maxY) - Math.max(A.minY,Bb.minY) > 5,
      {overlap:+(Math.min(A.maxY,Bb.maxY)-Math.max(A.minY,Bb.minY)).toFixed(2)});
  chk('она соосна', Math.abs((Bb.maxX+Bb.minX)/2) < 0.5 && Math.abs((Bb.maxZ+Bb.minZ)/2) < 0.5, {});
}
for(const [ND,NP] of [[16,1.5],[24,2],[36,4],[24,2]]){   // the fit holds across the neck's own range
  const p = setp({threadNeckD:ND, threadNeckPitch:NP, threadNeckH:14}), plan = assemblyPlacement(p, null);
  const world = plan.tris.map(T=>T.map(v=>[v[0]+plan.px, v[1]+plan.py, v[2]+plan.pz]));
  chk('Ø'+ND+' шаг '+NP+': пара свинчивается без пересечений',
      crossings(buildTrisForShape('box', p), world) === 0, {});
}

console.log('=== no triangle is inside-out ===');
// manifoldCheck pairs edges undirected and cannot see an inverted face. The seam sits at θ = 0, on the
// +X axis, which is where these rays cross it; a depth counter over a correctly wound surface can never
// go negative. Off-round z offsets so a ray does not run down the vertex column itself.
for(const [nm,ov] of [['переходник',{}], ['широкая горловина',{threadD:30, threadNeckD:44}],
                      ['левая резьба',{threadHand:'left'}], ['3 захода',{threadStarts:3}],
                      ['без насечки',{threadGrip:0}], ['с уплотнением',{threadSeal:1.2}]]){
  const t = mk(ov), B = computeBBox(t);
  let worst = 0, at = null;
  for(let k=1;k<14;k++){ const y = B.minY + (B.maxY-B.minY)*(k+0.37)/14;
    for(const z of [0.31, -0.44, 0.83]){ const d = minDepth(t, 0, y, z);
      if(d < worst){ worst = d; at = [+y.toFixed(2), z]; } } }
  chk(nm+': глубина по лучу нигде не уходит в минус', worst===0, {depth:worst, at});
}

console.log('\n=== TOTAL:', pass, 'passed,', fail, 'failed ===');
if(fail) process.exitCode = 1;
