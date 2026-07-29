// Мальтийский механизм (Geneva) — the first shape in the app whose outline is not star-shaped, and the
// reason extrudePolyYTris exists: a slot with parallel walls gives a ray from the centre TWO intervals of
// material, and r(θ) cannot say that. So this file tests two things at once — the new general extruder,
// and the mechanism built on it.
//
// The mechanism's radii are closed form (a = c·sin(π/n), R = c·cos(π/n)) but the DRIVER is not: its
// locking disc has to be cut away wherever the cross sweeps past, and that notch is an envelope. Envelopes
// are where this app has gone wrong before, always in the measuring rather than the drawing, so the sweep
// here is run at a finer step than the one the envelope was built at, and the outlines are subdivided to
// 0.12 mm before any point is asked whether it is inside the other part. Sampling a part's own vertices
// reads a 1 mm bite as no contact at all — the locking seat carries a vertex only every ~4 mm.
// Run via ./run-all.sh.
let pass=0, fail=0;
function chk(n,c,e){if(c){pass++;console.log('  OK  ',n);}else{fail++;console.log('  FAIL',n,e!==undefined?JSON.stringify(e):'');}}
function vol(t){let v=0;for(const T of t){const a=T[0],b=T[1],c=T[2];v+=(a[0]*(b[1]*c[2]-b[2]*c[1])-a[1]*(b[0]*c[2]-b[2]*c[0])+a[2]*(b[0]*c[1]-b[1]*c[0]))/6;}return v;}
function setp(ov){ logos.length=0; boxHoles.length=0; dieFaces.length=0;
  Object.assign(paramState.box, defaultBoxParams(), {gfBaseplate:false, gearMode:'geneva',
    genevaRole:'cross', genevaSlots:4, genevaCenter:40, genevaPinD:5, genevaThick:5,
    genevaBase:3, genevaBore:5, genevaGap:0.35}, ov); return paramState.box; }
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
const cx3=(u,v)=>[u[1]*v[2]-u[2]*v[1],u[2]*v[0]-u[0]*v[2],u[0]*v[1]-u[1]*v[0]], EP=1e-9;
function overlap(A,B){
  const N1=cx3(sb(A[1],A[0]),sb(A[2],A[0])), d1=-dt(N1,A[0]), dB=B.map(q=>dt(N1,q)+d1);
  if((dB[0]>EP&&dB[1]>EP&&dB[2]>EP)||(dB[0]<-EP&&dB[1]<-EP&&dB[2]<-EP)) return false;
  const N2=cx3(sb(B[1],B[0]),sb(B[2],B[0])), d2=-dt(N2,B[0]), dA=A.map(q=>dt(N2,q)+d2);
  if((dA[0]>EP&&dA[1]>EP&&dA[2]>EP)||(dA[0]<-EP&&dA[1]<-EP&&dA[2]<-EP)) return false;
  const D=cx3(N1,N2), aD=D.map(Math.abs); if(Math.max(...aD)<1e-12) return false;
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
function crossings(a,b){ const B=b.map(bb); let n=0;
  for(const A of a){ const x=bb(A);
    for(let t=0;t<b.length;t++){ const y=B[t];
      if(x.hi[0]<y.lo[0]||y.hi[0]<x.lo[0]||x.hi[1]<y.lo[1]||y.hi[1]<x.lo[1]||x.hi[2]<y.lo[2]||y.hi[2]<x.lo[2]) continue;
      if(overlap(A,b[t])) n++; } }
  return n; }
const shift=(t,dx,dy,dz)=>t.map(T=>T.map(v=>[v[0]+dx, v[1]+dy, v[2]+dz]));

// ---- 2D instruments, for the kinematics -------------------------------------------------------------
const dense=(P,step)=>{ const out=[];
  for(let i=0;i<P.length;i++){ const p=P[i], q=P[(i+1)%P.length], L=Math.hypot(q[0]-p[0],q[1]-p[1]);
    const k=Math.max(1, Math.ceil(L/step));
    for(let j=0;j<k;j++) out.push([p[0]+(q[0]-p[0])*j/k, p[1]+(q[1]-p[1])*j/k]); }
  return out; };
const rot2=(p,A)=>[p[0]*Math.cos(A)-p[1]*Math.sin(A), p[0]*Math.sin(A)+p[1]*Math.cos(A)];
// The driver, as the pair of things the cross has to miss: the notched locking disc (a radius per angle,
// so a lookup) and the pin (a circle at a known place). Depth is returned, not a yes/no — a sweep that
// only ever answers "no contact" is indistinguishable from one whose transform is wrong.
function driverDepth(s, prof, pt, psi){
  // The MODEL is the body turned half a revolution (that is what puts it in its rest pose), so a world
  // point goes into model axes by −(ψ − π), not by −ψ. Getting this wrong reports 11 mm of interference
  // in a pair that has none, and reports it hardest right where the parts are closest.
  const q = rot2(pt, Math.PI - psi);
  let i = Math.round(Math.atan2(q[1],q[0])/(2*Math.PI)*GENEVA_M); i = ((i%GENEVA_M)+GENEVA_M)%GENEVA_M;
  const d1 = prof[i] - Math.hypot(q[0],q[1]);
  const d2 = s.pinR - Math.hypot(q[0]+s.a, q[1]);           // the pin lives at (−a, 0) of the model
  return Math.max(d1, d2);
}
// The cross's pose: it follows the pin while engaged and stands still while locked. Built already in its
// rest pose, so the offset that genevaGamma is written against has to come back off.
const crossPose = (s, psi) => {
  const e = Math.max(-s.psiE, Math.min(s.psiE, psi <= Math.PI ? psi : psi - 2*Math.PI));
  return genevaGamma(s, e) - (Math.PI - Math.PI/s.n); };

console.log('=== the new extruder: one ray, several runs of material ===');
{ // This is the whole point of extrudePolyYTris. A 4-slot cross has slots at 45° and 135°; a ray along X
  // at the height where both are half open crosses rim, slot, hub, slot, rim — THREE runs of material.
  // Every earlier shape in the app is single-valued in angle and can only ever give one (or two, with a
  // bore). No r(θ) can produce three, which is why the Maltese cross waited for a triangulator.
  const t = mk({genevaRole:'cross', genevaSlots:4, genevaCenter:40});
  const s = genevaSpec(paramState.box);
  const z0 = ((s.rin + s.R)/2) * Math.SQRT1_2;
  const runs = solidRuns(t, 0, s.tC/2, z0);
  chk('луч сквозь два паза даёт три интервала материала', runs.length === 3, runs.map(r=>r.map(x=>+x.toFixed(2))));
  // ...and the void between them really is the slot: each gap is the pin's Ø plus two clearances, taken
  // across the slot, which at 45° means the gap along X is the slot width times √2.
  const g1 = runs[1][0] - runs[0][1], g2 = runs[2][0] - runs[1][1];
  chk('оба разрыва — это пазы', Math.abs(g1 - 2*s.w*Math.SQRT2) < 0.15 && Math.abs(g2 - 2*s.w*Math.SQRT2) < 0.15,
      {g1:+g1.toFixed(3), g2:+g2.toFixed(3), want:+(2*s.w*Math.SQRT2).toFixed(3)});
  chk('крест — одна связная оболочка', meshComponents(t).length === 1, meshComponents(t).length);
  chk('расточка на месте', solidRuns(t, 0, s.tC/2, 0.7).length === 2, solidRuns(t, 0, s.tC/2, 0.7).length);
}

console.log('=== builds across the range ===');
for(const n of [3,4,5,6,8,12]) for(const c of [30, 45, 70]){
  for(const role of ['cross','driver']){
    const t = mk({genevaRole:role, genevaSlots:n, genevaCenter:c}), mc = manifoldCheck(t,4);
    chk(n+' пазов, c='+c+', '+role+': замкнут', mc.watertight && vol(t)>0, {open:mc.openEdges, bad:mc.badEdges});
    chk(n+' пазов, c='+c+', '+role+': обмотка', minDepth(t,1,0.3*c,0.11*c) === 0 && minDepth(t,1,0,0) === 0);
  }
}

console.log('=== closed form, read off the mesh ===');
for(const n of [3,4,6,8]){
  const t = mk({genevaRole:'cross', genevaSlots:n, genevaCenter:40});
  const s = genevaSpec(paramState.box);
  let R=0; for(const T of t) for(const v of T) R = Math.max(R, Math.hypot(v[0], v[2]));
  chk(n+' пазов: R = c·cos(π/n)', Math.abs(R - 40*Math.cos(Math.PI/n)) < 0.05, {R, want:40*Math.cos(Math.PI/n)});
  chk(n+' пазов: a = c·sin(π/n)', Math.abs(s.a - 40*Math.sin(Math.PI/n)) < 1e-9);
  // The pin enters exactly at the rim: |pin − cross centre| = R at ψ = ψe. That equality IS the reason
  // a and R are not free, so it is worth asserting rather than deriving twice.
  const d = Math.hypot(s.a*Math.cos(s.psiE) - s.c, s.a*Math.sin(s.psiE));
  chk(n+' пазов: палец входит ровно на ободе', Math.abs(d - s.R) < 1e-9, {d, R:s.R});
  // One index per engagement, and it is exactly one slot pitch.
  const turn = (genevaGamma(s, s.psiE) - genevaGamma(s, -s.psiE)) * 180/Math.PI;
  chk(n+' пазов: поворот за один заход = 360/n', Math.abs((360 - turn) - 360/n) < 1e-6, {turn});
}

console.log('=== the slot fits the pin, and nothing else ===');
for(const pd of [3, 5, 8]) for(const g of [0.2, 0.35, 0.6]){
  const t = mk({genevaRole:'cross', genevaSlots:4, genevaCenter:40, genevaPinD:pd, genevaGap:g});
  const s = genevaSpec(paramState.box);
  // measure the slot ACROSS its axis, at mid depth — a run along the axis would never see the walls
  const th = Math.PI + Math.PI/4, m = (s.rin + s.R)/2;
  const px = m*Math.cos(th), pz = m*Math.sin(th);
  // sweep a line perpendicular to the slot: the void between the two walls is the slot's width
  let wMeas = 0; const span = Math.ceil((pd/2 + g + 2)/0.05);
  for(let k=-span;k<=span;k++){
    const u = k*0.05, x = px - Math.sin(th)*u, z = pz + Math.cos(th)*u;
    const inside = solidRuns(t, 1, x, z).length > 0;
    if(!inside) wMeas += 0.05; }
  chk('Ø'+pd+' зазор '+g+': ширина паза = Ø + 2·зазор',
      Math.abs(wMeas - (pd + 2*g)) < 0.12, {wMeas, want:pd+2*g});
}

console.log('=== the sweep: the two parts must never touch, over the WHOLE revolution ===');
for(const n of [3,4,6,8]) for(const c of [30, 55]){
  const s = genevaSpec(setp({genevaRole:'driver', genevaSlots:n, genevaCenter:c}));
  // A geometry the spec itself rejects is not a counter-example to the envelope: n slots at a small
  // centre distance leave the cross's lobe inside the driver's own hub, and the app says so rather
  // than drawing a part that cannot exist. Those cases are checked for the warning, not for clearance.
  if(s.hub || s.tight){
    chk(n+' пазов, c='+c+': негодная геометрия названа',
        collectPrintWarnings(paramState.box).some(x=>/ступиц|запирающ/.test(x)));
    continue; }
  const prof = genevaDriverProfile(s);
  const X = dense(genevaCrossOutline(s, 90), 0.12);
  let worst = 0, at = 0;
  for(let k=0;k<720;k++){
    const psi = 2*Math.PI*k/720, A = crossPose(s, psi);
    for(const p of X){ const w = rot2(p, A);
      const d = driverDepth(s, prof, [w[0]+s.c, w[1]], psi);   // cross centre sits at +c of the driver
      if(d > worst){ worst = d; at = k; } } }
  chk(n+' пазов, c='+c+': ноль пересечений за оборот', worst <= 0, {worst:+worst.toFixed(4), atDeg:at/2});
}

console.log('=== запирание ===');
// Outside engagement the cross must be held. It is held by its lobe corners bearing on the locking disc,
// so the test turns the cross ±1.5° and asks whether BOTH directions bite. The handover is the one place
// it cannot: the moment the pin leaves, the notch is still where the cross just came from, and the cross
// is free to run backwards over its own path. That window is real, it is not a bug, and the assertion
// below is that it stays a window — a fixed slice at each end, not a hole in the middle of the lock.
for(const n of [3,4,6,8]){
  setp({genevaRole:'driver', genevaSlots:n, genevaCenter:40});
  const s = genevaSpec(paramState.box), prof = genevaDriverProfile(s);
  const X = dense(genevaCrossOutline(s, 90), 0.12);
  const bite = (dg, psi) => { for(const p of X){ const w = rot2(p, dg);
      if(driverDepth(s, prof, [w[0]+s.c, w[1]], psi) > 0.05) return true; } return false; };
  const D = 1.5*Math.PI/180;
  let locked = 0, tot = 0, mid = 0, midTot = 0;
  const lo = s.psiE, hi = 2*Math.PI - s.psiE;
  for(let k=0;k<=180;k++){
    const psi = lo + (hi-lo)*k/180, u = k/180; tot++;
    const ok = bite(D, psi) && bite(-D, psi);
    if(ok) locked++;
    if(u > 0.2 && u < 0.8){ midTot++; if(ok) mid++; } }
  chk(n+' пазов: середина запертого участка держит всегда', mid === midTot, {mid, midTot});
  chk(n+' пазов: заперт не меньше 75% хода', locked/tot >= 0.75, +(locked/tot).toFixed(2));
}

console.log('=== 3D: пара в позе покоя ===');
for(const n of [3,4,6]){
  const cr = mk({genevaRole:'cross', genevaSlots:n, genevaCenter:40});
  const s  = genevaSpec(paramState.box);
  const dr = mk({genevaRole:'driver', genevaSlots:n, genevaCenter:40});
  const comp = meshComponents(dr);
  chk(n+' пазов: кривошип — три оболочки (плита, диск, палец)', comp.length === 3, comp.length);
  // seat the pair exactly as the assembly preview does
  const placed = shift(dr, -s.c, -s.tB-s.gap, 0);
  chk(n+' пазов: крест и кривошип не пересекаются в покое', crossings(cr, placed) === 0, crossings(cr, placed));
  // ...and the locking disc really is inside the cross's seat, not merely near it
  // A prism carries vertices only on its two end faces, so "somewhere in the middle" finds nothing.
  // The locking boss is the only shell whose top face sits exactly at the cross's own top.
  let near = 1e9;
  for(const T of placed) for(const v of T) if(Math.abs(v[1] - s.tC) < 1e-6)
    near = Math.min(near, Math.hypot(v[0], v[2]));
  chk(n+' пазов: диск заходит в гнездо креста', near < s.R, {near, R:s.R});
}

console.log('=== кривошип: расточка и палец на местах ===');
// The same run-structure probe as on the cross, and for the same reason: an inverted bore is watertight,
// pairs edge for edge, and never sends a depth counter negative. Only WHERE the material is gives it away.
for(const n of [4,6]){
  const t = mk({genevaRole:'driver', genevaSlots:n, genevaCenter:40});
  const s = genevaSpec(paramState.box);
  const rp = solidRuns(t, 0, s.tB/2, 0.7);
  chk(n+' пазов: плита кривошипа расточена насквозь', rp.length === 2, rp.map(r=>r.map(x=>+x.toFixed(2))));
  const pin = solidRuns(t, 1, 0, -s.a);
  chk(n+' пазов: палец стоит на плите одним куском', pin.length === 1, pin.map(r=>r.map(x=>+x.toFixed(2))));
  chk(n+' пазов: палец доходит выше креста',
      pin.length === 1 && pin[0][1] > s.tB + s.tC, pin.length===1 ? +pin[0][1].toFixed(2) : null);
  // At the disc's own height the ray meets three runs, not two: the pin stands out at −a, and the disc
  // itself is asymmetric because the notch is on that same side. The bore is the gap in the MIDDLE.
  const dsk = solidRuns(t, 0, s.tB + s.tC/2, 0.7);
  chk(n+' пазов: палец, диск, расточка — три интервала', dsk.length === 3, dsk.map(r=>r.map(x=>+x.toFixed(2))));
  chk(n+' пазов: запирающий диск расточен насквозь',
      dsk.length === 3 && Math.abs((dsk[2][0] - dsk[1][1]) - 2*Math.sqrt(s.rB*s.rB - 0.49)) < 0.05,
      dsk.length===3 ? +(dsk[2][0]-dsk[1][1]).toFixed(3) : null);
  chk(n+' пазов: выемка съедает диск со стороны пальца',
      dsk.length === 3 && Math.abs(dsk[2][1]) - Math.abs(dsk[1][0]) > 1,
      dsk.length===3 ? [+dsk[1][0].toFixed(2), +dsk[2][1].toFixed(2)] : null);
}

console.log('=== предупреждения ===');
{
  const w1 = collectPrintWarnings(setp({genevaSlots:12, genevaCenter:14, genevaPinD:5}));
  chk('тесная геометрия — предупреждение есть', w1.some(x=>/паз|диск|ступиц|вал/i.test(x)), w1);
  const w2 = collectPrintWarnings(setp({genevaSlots:4, genevaCenter:40, genevaBore:5}));
  chk('обычная геометрия — предупреждений по механизму нет',
      !w2.some(x=>/запирающ|ступиц|дно паза/i.test(x)), w2);
  const w3 = collectPrintWarnings(setp({genevaSlots:3, genevaCenter:40, genevaBore:9}));
  chk('большой вал — дно паза выходит на отверстие', w3.some(x=>/дно паза/.test(x)), w3);
  // The bore is not merely complained about, it is CUT BACK: an outline that crosses itself is not a
  // shape, and the slot's rounded bottom reaches rin − w, half a slot width further in than its centre.
  for(const cfg of [[3,40,9],[3,30,5],[4,40,5],[12,60,5],[6,25,6]]){
    const g = genevaSpec(setp({genevaSlots:cfg[0], genevaCenter:cfg[1], genevaBore:cfg[2]}));
    chk(cfg.join('/')+': расточка не доходит до дна паза', g.rB < g.rin - g.w,
        {rB:+g.rB.toFixed(2), floor:+(g.rin-g.w).toFixed(2)});
    chk(cfg.join('/')+': урезание объявлено', !(g.rB < g.rBwant - 1e-9) ||
        collectPrintWarnings(paramState.box).some(x=>/урезан/.test(x))); }
  // Three slots pull the slot bottom in to c(1−sin60°), so a small centre distance leaves nothing at all.
  const w4 = collectPrintWarnings(setp({genevaSlots:3, genevaCenter:30, genevaBore:5}));
  chk('места под вал нет вовсе — сказано', w4.some(x=>/не остаётся места вовсе/.test(x)), w4);
}

console.log('=== имя детали ===');
{
  chk('крест назван', /мальтийск/i.test(activeShapeLabel(setp({genevaRole:'cross'}))), activeShapeLabel());
  const m = assemblyMate(setp({genevaRole:'cross'}));
  chk('пара объявлена', !!m && /кривошип/i.test(m.name), m && m.name);
}

console.log('=== TOTAL: ' + pass + ' passed, ' + fail + ' failed ===');
if(fail) process.exit(1);
