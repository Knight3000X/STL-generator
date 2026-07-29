// Цепь, печатная в сборе. A link is a flat ring — a stadium outline with a stadium hole — and a stadium is
// convex, so both are radius-by-angle and `extrudeProfileY` builds the whole link in one call. No new
// machinery. Consecutive links are turned 90° and set a pitch apart.
//
// A chain has exactly two ways to be wrong, and neither shows in a watertight check. The links can
// INTERSECT, in which case the print comes off as one solid lump; or they can merely sit end to end
// without threading, in which case it comes off as N loose rings. Both are measured here — the first by
// Möller triangle against triangle, the second by asking whether the neighbour actually has material
// inside this link's hole. Run via ./run-all.sh.
let pass=0, fail=0;
function chk(n,c,e){if(c){pass++;console.log('  OK  ',n);}else{fail++;console.log('  FAIL',n,e!==undefined?JSON.stringify(e):'');}}
function vol(t){let v=0;for(const T of t){const a=T[0],b=T[1],c=T[2];v+=(a[0]*(b[1]*c[2]-b[2]*c[1])-a[1]*(b[0]*c[2]-b[2]*c[0])+a[2]*(b[0]*c[1]-b[1]*c[0]))/6;}return v;}
function setp(ov){ logos.length=0; boxHoles.length=0; dieFaces.length=0;
  Object.assign(paramState.box, defaultBoxParams(), {gfBaseplate:false, pipMode:'chain',
    chainN:6, chainLen:18, chainW:9, chainT:2.2, chainH:0, chainGap:0.4}, ov);
  return paramState.box; }
const mk = ov => buildTrisForShape('box', setp(ov));

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
function minDepth(tris, ax, p, q){
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
const sb=(u,v)=>[u[0]-v[0],u[1]-v[1],u[2]-v[2]], dt=(u,v)=>u[0]*v[0]+u[1]*v[1]+u[2]*v[2];
const cx=(u,v)=>[u[1]*v[2]-u[2]*v[1],u[2]*v[0]-u[0]*v[2],u[0]*v[1]-u[1]*v[0]], EP=1e-9;
function overlap(A,B){
  const N1=cx(sb(A[1],A[0]),sb(A[2],A[0])), d1=-dt(N1,A[0]), dB=B.map(q=>dt(N1,q)+d1);
  if((dB[0]>EP&&dB[1]>EP&&dB[2]>EP)||(dB[0]<-EP&&dB[1]<-EP&&dB[2]<-EP)) return false;
  const N2=cx(sb(B[1],B[0]),sb(B[2],B[0])), d2=-dt(N2,B[0]), dA=A.map(q=>dt(N2,q)+d2);
  if((dA[0]>EP&&dA[1]>EP&&dA[2]>EP)||(dA[0]<-EP&&dA[1]<-EP&&dA[2]<-EP)) return false;
  const D=cx(N1,N2), aD=D.map(Math.abs); if(Math.max(...aD)<1e-12) return false;
  const idx=aD.indexOf(Math.max(...aD));
  const iv=(T,d)=>{ const q=T.map(v=>v[idx]), out=[];
    for(let i=0;i<3;i++){ const j=(i+1)%3;
      if(d[i]*d[j]<0){ const t=d[i]/(d[i]-d[j]); out.push(q[i]+(q[j]-q[i])*t); }
      if(Math.abs(d[i])<=EP) out.push(q[i]); }
    return out.length<2?null:[Math.min(...out),Math.max(...out)]; };
  const i1=iv(A,dA), i2=iv(B,dB);
  return !!(i1&&i2) && (Math.min(i1[1],i2[1]) - Math.max(i1[0],i2[0])) > 1e-6;
}
const bb=T=>{const lo=[1e30,1e30,1e30],hi=[-1e30,-1e30,-1e30];
  for(const v of T)for(let a=0;a<3;a++){if(v[a]<lo[a])lo[a]=v[a];if(v[a]>hi[a])hi[a]=v[a];}return{lo,hi};};
// Crossings between every PAIR of links — not just neighbours. A pitch short enough to reach past a
// neighbour would show up nowhere else.
function allCrossings(cs){ let n=0;
  for(let i=0;i<cs.length;i++) for(let j=i+1;j<cs.length;j++){
    const B=cs[j].map(bb);
    for(const A of cs[i]){ const x=bb(A);
      for(let k=0;k<cs[j].length;k++){ const y=B[k];
        if(x.hi[0]<y.lo[0]||y.hi[0]<x.lo[0]||x.hi[1]<y.lo[1]||y.hi[1]<x.lo[1]||x.hi[2]<y.lo[2]||y.hi[2]<x.lo[2]) continue;
        if(overlap(A,cs[j][k])) n++; } } }
  return n; }
const links = t => meshComponents(t).map(c => ({tris:c, b:computeBBox(c)}))
                                    .sort((a,b)=>a.b.minX-b.b.minX);

console.log('=== builds across the range, one closed shell per link ===');
for(const N of [2,6,20]) for(const t of [1.2,2.2,4]){
  const m = mk({chainN:N, chainT:t}), mc = manifoldCheck(m,4);
  chk(N+' звеньев, пруток '+t+': замкнуто', mc.watertight && vol(m)>0, {open:mc.openEdges, bad:mc.badEdges});
  chk('  и это ровно '+N+' оболочек', meshComponents(m).length === N, {n:meshComponents(m).length});
}
for(const ov of [{chainLen:8}, {chainLen:100}, {chainW:30}, {chainH:1}, {chainH:8},
                 {chainGap:0.15}, {chainGap:1.2}, {chainT:0.8}, {chainN:60}]){
  const m = mk(ov), mc = manifoldCheck(m,4);
  chk('крайние параметры '+JSON.stringify(ov), mc.watertight && vol(m)>0, {open:mc.openEdges, bad:mc.badEdges});
}

console.log('=== the links never intersect — a chain that does prints as one lump ===');
for(const ov of [{}, {chainT:4}, {chainT:1.2}, {chainW:30}, {chainH:1}, {chainH:8},
                 {chainGap:0.15}, {chainGap:1.2}, {chainLen:8}, {chainLen:60}]){
  const m = mk(Object.assign({chainN:5}, ov));
  chk('ноль пересечений: '+JSON.stringify(ov), allCrossings(meshComponents(m)) === 0,
      {crossings:allCrossings(meshComponents(m))});
}

console.log('=== ...and they really are threaded, not just laid end to end ===');
// The other half of the claim, and the one a crossing count cannot make: a chain of N rings that merely
// touch is watertight, non-intersecting, and falls apart in the hand. So look INSIDE the hole: at heights
// spanning this link's opening, the neighbour must have material there.
{ const s = chainSpec(setp({})), L = links(mk({}));
  // Link 0 lies flat (its hole is a through-hole along Y); link 1 stands on edge and passes through it.
  const x0 = (L[0].b.minX + L[0].b.maxX)/2;
  // A ray along Y down the middle of link 0's hole, at the x where link 1's end bar sits.
  const xBar = x0 + s.pitch - s.L/2 + s.t/2;
  const runs = solidRuns(L[1].tris, 1, 0.07, xBar);       // ax=1 → (u,v) = (z,x)
  chk('через отверстие первого звена проходит пруток второго', runs.length >= 1,
      {runs:runs.length, x:+xBar.toFixed(2)});
  // ...and that bar is inside the hole, not beside it: |z| under the hole's half-width, |x| under its half-length
  chk('и он попадает в проём, а не мимо', Math.abs(xBar - x0) < s.Li/2 - s.t/2,
      {off:+Math.abs(xBar-x0).toFixed(2), half:+(s.Li/2 - s.t/2).toFixed(2)});
  // Every consecutive pair overlaps along the chain by more than a bar's thickness — end-to-end links
  // would overlap by nothing at all.
  let worst = 1e9;
  for(let k=0;k+1<L.length;k++) worst = Math.min(worst, L[k].b.maxX - L[k+1].b.minX);
  chk('соседние звенья перекрываются по длине', worst > s.t + s.gap, {overlap:+worst.toFixed(2)});
  chk('но не насквозь — через одно уже не достаёт', L[0].b.maxX < L[2].b.minX,
      {first:+L[0].b.maxX.toFixed(2), third:+L[2].b.minX.toFixed(2)});
}
{ // Alternating orientation: even links are flat, odd ones on edge. Their bounding boxes say so.
  const L = links(mk({chainH:1.5}));
  const flat = L[0].b, edge = L[1].b;
  chk('чётные звенья лежат плашмя', (flat.maxY-flat.minY) < (flat.maxZ-flat.minZ) - 1,
      {y:+(flat.maxY-flat.minY).toFixed(1), z:+(flat.maxZ-flat.minZ).toFixed(1)});
  chk('нечётные — на ребре', (edge.maxZ-edge.minZ) < (edge.maxY-edge.minY) - 1,
      {y:+(edge.maxY-edge.minY).toFixed(1), z:+(edge.maxZ-edge.minZ).toFixed(1)});
}

console.log('=== the numbers follow the parameters ===');
{ const s = chainSpec(setp({}));
  const B = computeBBox(mk({}));
  chk('длина цепи — (N−1)·шаг + звено', Math.abs((B.maxX-B.minX) - s.span) < 0.05,
      {got:+(B.maxX-B.minX).toFixed(2), want:+s.span.toFixed(2)});
  const lens = [4, 6, 12].map(N => { const b = computeBBox(mk({chainN:N})); return b.maxX-b.minX; });
  chk('больше звеньев — длиннее цепь', lens[1]-lens[0] > s.pitch*1.9 && lens[2]-lens[1] > s.pitch*5.9,
      lens.map(v=>+v.toFixed(1)));
  const L = links(mk({}));
  chk('звено — заказанной длины', Math.abs((L[0].b.maxX-L[0].b.minX) - 18) < 0.05, {});
  chk('и заказанной ширины', Math.abs((L[0].b.maxZ-L[0].b.minZ) - 9) < 0.05, {});
  const thick = links(mk({chainH:5}))[0].b;
  chk('толщина прутка поперёк — параметр', Math.abs((thick.maxY-thick.minY) - 5) < 0.05,
      {h:+(thick.maxY-thick.minY).toFixed(2)});
}
{ // The width has a floor, and it is what stops the links intersecting. The builder publishes it.
  const s = chainSpec(setp({chainT:4, chainW:9}));
  chk('узкая ширина поднимается до минимума', s.W > 9, {W:+s.W.toFixed(2)});
  chk('и проём остаётся шире прутка соседа с зазором', s.Wi > s.h + 2*s.gap,
      {hole:+s.Wi.toFixed(2), bar:+(s.h + 2*s.gap).toFixed(2)});
  chk('тесный зазор отмечается', collectPrintWarnings(setp({chainGap:0.15})).some(x=>/спечься/.test(x)), {});
  chk('тонкий пруток тоже', collectPrintWarnings(setp({chainT:0.9})).some(x=>/тоньше 1 мм/.test(x)), {});
  chk('а нормальная цепь — ни о чём', collectPrintWarnings(setp({})).length === 0, collectPrintWarnings(setp({})));
}

console.log('=== no triangle is inside-out ===');
for(const [nm,ov] of [['цепь',{}], ['толстый пруток',{chainT:4}], ['плоские звенья',{chainH:1.2}],
                      ['широкие звенья',{chainW:20}], ['два звена',{chainN:2}]]){
  const m = mk(ov), B = computeBBox(m);
  let worst = 0, at = null;
  for(let k=1;k<12;k++){ const x = B.minX + (B.maxX-B.minX)*(k+0.37)/12;
    for(const z of [0.31, -1.44, 2.83]){ const d = minDepth(m, 1, z, x);
      if(d < worst){ worst = d; at = [+x.toFixed(2), z]; } } }
  chk(nm+': глубина по лучу нигде не уходит в минус', worst===0, {depth:worst, at});
}

console.log('\n=== TOTAL:', pass, 'passed,', fail, 'failed ===');
if(fail) process.exitCode = 1;
