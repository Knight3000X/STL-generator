// Lead screw (ходовой винт): a plain trapezoidal-threaded rod with a smooth journal out each end. No new
// machinery — the same male thread the stud and bolt carry, with neither a flange nor a head, which is
// exactly what was missing: every male thread in the app came attached to something.
//
// What makes it a MOTION thread rather than a fastener is the coarse pitch and the wide flat (ACME is 29°
// included, so a flat around 0.2 of the pitch). The claim worth testing is that it drives the existing nut
// — that the two are the same profile at the same clearance and screw together rather than merely looking
// alike. Measured triangle against triangle, not by eye. Run via ./run-all.sh.
let pass=0, fail=0;
function chk(n,c,e){if(c){pass++;console.log('  OK  ',n);}else{fail++;console.log('  FAIL',n,e!==undefined?JSON.stringify(e):'');}}
function vol(t){let v=0;for(const T of t){const a=T[0],b=T[1],c=T[2];v+=(a[0]*(b[1]*c[2]-b[2]*c[1])-a[1]*(b[0]*c[2]-b[2]*c[0])+a[2]*(b[0]*c[1]-b[1]*c[0]))/6;}return v;}
function setp(ov){ logos.length=0; boxHoles.length=0; dieFaces.length=0;
  Object.assign(paramState.box, defaultBoxParams(), {gfBaseplate:false, threadMode:'leadscrew',
    threadD:16, threadPitch:4, threadFlat:0.2, threadLen:60, threadJournal:8}, ov);
  return paramState.box; }
const mk = ov => buildTrisForShape('box', setp(ov));

console.log('=== builds across the range ===');
for(const D of [8,16,30,40]) for(const P of [2,4,8]){
  const t = mk({threadD:D, threadPitch:P}), mc = manifoldCheck(t,4);
  chk('Ø'+D+' шаг '+P+': замкнут', mc.watertight && vol(t)>0, {open:mc.openEdges, bad:mc.badEdges});
}
for(const ov of [{threadFlat:0},{threadFlat:0.24},{threadLen:20},{threadLen:200},{threadJournal:0},
                 {threadJournal:40},{threadJournalD:4},{threadJournalD:14},{threadStarts:2},
                 {threadStarts:4},{threadHand:'left'},{threadLead:0},{threadLead:6}]){
  chk('крайние параметры '+JSON.stringify(ov), manifoldCheck(mk(ov),4).watertight, {});
}

console.log('=== it is a plain ROD: no head, no flange ===');
{ // The whole point. A stud carries a flange and a bolt a head; both make the shaft's diameter jump.
  const B = computeBBox(mk({}));
  chk('наружный Ø равен номиналу резьбы', Math.abs((B.maxX-B.minX) - 16) < 0.6, {d:+(B.maxX-B.minX).toFixed(2)});
  const stud = computeBBox(buildTrisForShape('box', setp({threadMode:'stud'})));
  chk('у шпильки он больше — из-за фланца', (stud.maxX-stud.minX) > (B.maxX-B.minX) + 3,
      {stud:+(stud.maxX-stud.minX).toFixed(1), screw:+(B.maxX-B.minX).toFixed(1)});
  setp({});
}
{ // Journals stick out past the thread at both ends and are SMOOTH — that is what runs in a bearing.
  const withJ = computeBBox(mk({threadJournal:8})), noJ = computeBBox(mk({threadJournal:0}));
  chk('цапфы удлиняют винт на два вылета',
      Math.abs((withJ.maxY-withJ.minY) - (noJ.maxY-noJ.minY) - 16) < 0.05,
      {with:+(withJ.maxY-withJ.minY).toFixed(2), without:+(noJ.maxY-noJ.minY).toFixed(2)});
  // out at the very end there is only the journal, and it is round
  const t = mk({threadJournal:8, threadJournalD:8}), B = computeBBox(t);
  let r = 0; for(const T of t) for(const v of T) if(v[1] > B.maxY-1) r = Math.max(r, Math.hypot(v[0],v[2]));
  chk('на конце — только цапфа заказанного Ø', Math.abs(2*r - 8) < 0.4, {d:+(2*r).toFixed(2)});
  chk('и она уже резьбы', 2*r < 16, {});
}

console.log('=== and it DRIVES THE NUT — measured, not assumed ===');
{ const p = setp({}), plan = assemblyPlacement(p, null);
  chk('пара — гайка', plan && plan.name === 'Гайка', {got: plan && plan.name});
  chk('гайка замкнута', manifoldCheck(plan.tris,4).watertight, {});
  const world = plan.tris.map(T=>T.map(v=>[v[0]+plan.px, v[1]+plan.py, v[2]+plan.pz]));
  // Möller, the same test that settled the worm pair. Contact is fine; passing through is not.
  const sub=(u,v)=>[u[0]-v[0],u[1]-v[1],u[2]-v[2]], dot=(u,v)=>u[0]*v[0]+u[1]*v[1]+u[2]*v[2];
  const cr=(u,v)=>[u[1]*v[2]-u[2]*v[1],u[2]*v[0]-u[0]*v[2],u[0]*v[1]-u[1]*v[0]], EPS=1e-9;
  function overlap(A,B){
    const N1=cr(sub(A[1],A[0]),sub(A[2],A[0])), d1=-dot(N1,A[0]), dB=B.map(q=>dot(N1,q)+d1);
    if((dB[0]>EPS&&dB[1]>EPS&&dB[2]>EPS)||(dB[0]<-EPS&&dB[1]<-EPS&&dB[2]<-EPS)) return false;
    const N2=cr(sub(B[1],B[0]),sub(B[2],B[0])), d2=-dot(N2,B[0]), dA=A.map(q=>dot(N2,q)+d2);
    if((dA[0]>EPS&&dA[1]>EPS&&dA[2]>EPS)||(dA[0]<-EPS&&dA[1]<-EPS&&dA[2]<-EPS)) return false;
    const D=cr(N1,N2), aD=D.map(Math.abs); if(Math.max(...aD)<1e-12) return false;
    const idx=aD.indexOf(Math.max(...aD));
    const iv=(T,d)=>{ const q=T.map(v=>v[idx]), out=[];
      for(let i=0;i<3;i++){ const j=(i+1)%3;
        if(d[i]*d[j]<0){ const t=d[i]/(d[i]-d[j]); out.push(q[i]+(q[j]-q[i])*t); }
        if(Math.abs(d[i])<=EPS) out.push(q[i]); }
      return out.length<2?null:[Math.min(...out),Math.max(...out)]; };
    const i1=iv(A,dA), i2=iv(B,dB);
    return !!(i1&&i2) && (Math.min(i1[1],i2[1]) - Math.max(i1[0],i2[0])) > 1e-6;
  }
  const bb=T=>{const lo=[1e30,1e30,1e30],hi=[-1e30,-1e30,-1e30];
    for(const v of T)for(let a=0;a<3;a++){if(v[a]<lo[a])lo[a]=v[a];if(v[a]>hi[a])hi[a]=v[a];}return{lo,hi};};
  const self = buildTrisForShape('box', p);
  const NB = world.map(bb);
  let n=0;
  for(const A of self){ const a=bb(A);
    for(let j=0;j<world.length;j++){ const b=NB[j];
      if(a.hi[0]<b.lo[0]||b.hi[0]<a.lo[0]||a.hi[1]<b.lo[1]||b.hi[1]<a.lo[1]||a.hi[2]<b.lo[2]||b.hi[2]<a.lo[2]) continue;
      if(overlap(A, world[j])) n++; } }
  chk('винт и гайка не проходят сквозь друг друга', n === 0, {crossings:n});
  const A = computeBBox(self), Bb = computeBBox(world);
  chk('и гайка сидит НА резьбе, а не рядом',
      Math.min(A.maxY,Bb.maxY) - Math.max(A.minY,Bb.minY) > 5, {});
}
{ // The pitch is the thing you set on a motion screw: one turn moves the nut by exactly that.
  const hs = [2,4,8].map(P => { const t = mk({threadPitch:P, threadJournal:0}); return computeBBox(t); });
  chk('шаг не меняет длину нарезки', hs.every(B => Math.abs((B.maxY-B.minY) - 60) < 0.05),
      hs.map(B=>+(B.maxY-B.minY).toFixed(2)));
  const fine = mk({threadPitch:2}).length, coarse = mk({threadPitch:8}).length;
  chk('мелкий шаг — больше витков, больше треугольников', fine > coarse*2, {fine, coarse});
}

console.log('\n=== TOTAL:', pass, 'passed,', fail, 'failed ===');
if(fail) process.exitCode = 1;
