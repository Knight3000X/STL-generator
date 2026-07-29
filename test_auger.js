// Шнек / архимедов винт: a thick shaft carrying a thin helical flight, for moving powder or granules
// along a tube. No new machinery — it is the same heightfield r(θ,y) every thread in the app is written
// as, and only the PROFILE differs: a fastener's thread fills its pitch, a flight is a narrow pulse.
//
// That difference is the whole risk, and it is where the tests point. A pulse that the sampling steps
// over is not a thin flight, it is NO flight — the screw comes out a plain rod, watertight and wrong. So
// what is measured here is the flight itself: that it is there, that it stands the ordered height off
// the shaft, that it is the ordered thickness, and that it advances one pitch per turn (which is the only
// thing that makes it a conveyor rather than decoration). Run via ./run-all.sh.
let pass=0, fail=0;
function chk(n,c,e){if(c){pass++;console.log('  OK  ',n);}else{fail++;console.log('  FAIL',n,e!==undefined?JSON.stringify(e):'');}}
function vol(t){let v=0;for(const T of t){const a=T[0],b=T[1],c=T[2];v+=(a[0]*(b[1]*c[2]-b[2]*c[1])-a[1]*(b[0]*c[2]-b[2]*c[0])+a[2]*(b[0]*c[1]-b[1]*c[0]))/6;}return v;}
function setp(ov){ logos.length=0; boxHoles.length=0; dieFaces.length=0;
  Object.assign(paramState.box, defaultBoxParams(), {gfBaseplate:false, threadMode:'auger',
    threadD:30, threadPitch:20, threadLen:60, threadAugerShaft:10, threadAugerBlade:1.6,
    threadJournal:0}, ov);
  return paramState.box; }
const mk = ov => buildTrisForShape('box', setp(ov));

// The radius of the SURFACE at (angle a, height y), read off the mesh: the farthest vertex from the axis
// in a thin slab. Cheap, and enough to tell a flight from a rod — the flight is 10 mm of radius.
function radiiAt(tris, y, tol){
  const out=[];
  for(const T of tris) for(const v of T) if(Math.abs(v[1]-y) < (tol||0.25)) out.push(Math.hypot(v[0],v[2]));
  return out;
}
// Solid intervals along a ray, counted by DEPTH (see test_funnel_cap.js for why parity will not do).
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
  const runs = solidRuns(tris, ax, p, q); void runs;
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
// Where the flight crosses a given line parallel to the axis, offset out at radius rp: the axial midpoints
// of the solid runs. Along a line at a radius the shaft does not reach, the ONLY material is the flight.
function flightHits(tris, rp, ang){
  const x = rp*Math.cos(ang), z = rp*Math.sin(ang);
  return solidRuns(tris, 1, z, x).map(r => (r[0]+r[1])/2);   // ax=1 → (u,v) = (z,x)
}
// How many separate ribbons the flight has, counted AROUND the screw at one height. This is the only
// place the start count shows: `phase` advances by y/P along the axis whatever S is — a 2-start screw
// still repeats every pitch, that is what a pitch means — and by S per revolution around it. Measuring
// axially (as the first draft of this file did) reports the same number for every S and proves nothing.
// The bins must be COARSER than the mesh's own angular columns. At Ø30 the builder lays 171 of them,
// one every 2.1°, so 360 bins leave an empty bin between every pair of vertices and a single ribbon reads
// as fifteen. 90 bins (4°) cannot be skipped by a 2.1° step, and the narrowest ribbon here still spans
// three of them.
function flightArcs(tris, y, rThresh){
  const N=90, hit=new Array(N).fill(false);
  for(const T of tris) for(const v of T)
    if(Math.abs(v[1]-y) < 0.35 && Math.hypot(v[0],v[2]) > rThresh){
      let a=Math.atan2(v[2],v[0]); if(a<0) a+=2*Math.PI;
      hit[Math.min(N-1, Math.floor(a/(2*Math.PI)*N))]=true; }
  let runs=0;
  for(let i=0;i<N;i++) if(hit[i] && !hit[(i+N-1)%N]) runs++;
  return hit.every(Boolean) ? 1 : runs;
}

console.log('=== builds across the range ===');
for(const D of [12,30,60]) for(const P of [6,20,50]){
  const t = mk({threadD:D, threadPitch:P, threadAugerShaft:0, threadAugerBlade:0}), mc = manifoldCheck(t,4);
  chk('Ø'+D+' шаг '+P+': замкнут', mc.watertight && vol(t)>0, {open:mc.openEdges, bad:mc.badEdges});
}
for(const ov of [{threadAugerBlade:0.4}, {threadAugerBlade:6}, {threadAugerBlade:0},
                 {threadAugerShaft:0}, {threadAugerShaft:4}, {threadAugerShaft:28},
                 {threadLen:10}, {threadLen:200}, {threadStarts:2}, {threadStarts:4},
                 {threadHand:'left'}, {threadJournal:10}, {threadJournal:10, threadJournalD:4},
                 {threadJournal:10, threadJournalD:20}, {threadPitch:0.5}]){
  const t = mk(ov), mc = manifoldCheck(t,4);
  chk('крайние параметры '+JSON.stringify(ov), mc.watertight && vol(t)>0, {open:mc.openEdges, bad:mc.badEdges});
}

console.log('=== there IS a flight, and it stands off the shaft ===');
// The failure this whole file exists for: a pulse the sampling steps over gives a plain rod, closed and
// wrong. A rod's radius is one number at every height; a flight makes it swing between the two.
{ const t = mk({}), B = computeBBox(t);
  chk('наружный Ø — по витку, а не по валу', Math.abs((B.maxX-B.minX) - 30) < 0.6, {d:+(B.maxX-B.minX).toFixed(2)});
  let lo=1e9, hi=-1e9;
  for(const r of radiiAt(t, 0, 0.3)){ if(r<lo) lo=r; if(r>hi) hi=r; }
  chk('на одной высоте радиус ходит от вала до витка', Math.abs(lo-5)<0.6 && Math.abs(hi-15)<0.6,
      {rmin:+lo.toFixed(2), rmax:+hi.toFixed(2)});
  chk('и это не пруток', hi - lo > 8, {swing:+(hi-lo).toFixed(2)});
}
{ // The shaft is its own parameter, and the flight rides on whatever it is set to.
  for(const shD of [6, 10, 20]){
    const t = mk({threadAugerShaft:shD});
    let lo=1e9; for(const r of radiiAt(t, 0.7, 0.3)) if(r<lo) lo=r;
    chk('Ø вала '+shD+' — таким и вышел', Math.abs(2*lo - shD) < 0.8, {got:+(2*lo).toFixed(2)});
  }
}

console.log('=== the flight is the ordered THICKNESS, and advances one pitch per turn ===');
// Read out at a radius between the shaft and the tip: there, the only material a line parallel to the
// axis can meet is the flight, once per pitch per start. Both claims come off the same measurement.
{ const t = mk({}), rp = 12;                              // shaft 10, tip 30 → 12 is clear of the shaft
  const hits = flightHits(t, rp, 0.7);
  chk('на радиусе между валом и кромкой виток встречается по разу на шаг',
      hits.length === 3, {hits:hits.length, want:3});     // 60 mm of screw at a 20 mm pitch
  const gaps = hits.slice(1).map((v,k)=>v-hits[k]);
  chk('и расстояние между витками равно шагу', gaps.every(g=>Math.abs(g-20)<0.4), gaps.map(v=>+v.toFixed(2)));
  const runs = solidRuns(t, 1, rp*Math.sin(0.7), rp*Math.cos(0.7));
  const thick = runs.map(r=>r[1]-r[0]);
  // Measured mid-height of the blade, so half the ramp is included on each side: root 1.6, tip 1.6−2·ramp.
  chk('толщина витка — заказанная, в пределах скоса',
      thick.every(v => v > 0.7 && v < 1.7), thick.map(v=>+v.toFixed(2)));
}
{ // The thickness is a knob, and it is the one that decides whether the thing prints at all.
  const meas = [1.0, 1.6, 3.0].map(tw => {
    const t = mk({threadAugerBlade:tw}), rp = 12;
    const runs = solidRuns(t, 1, rp*Math.sin(0.7), rp*Math.cos(0.7));
    return runs.length ? runs.reduce((s,r)=>s+(r[1]-r[0]),0)/runs.length : 0; });
  chk('толщина витка следует за параметром', meas[0] < meas[1]-0.3 && meas[1] < meas[2]-0.8,
      meas.map(v=>+v.toFixed(2)));
  // The builder publishes what it actually drew, and the mesh has to agree with it. The blade is measured
  // at r = 12 of a 5→15 flight, i.e. 0.7 of the way out, so the taper has eaten 0.7 of its full bite.
  { const sp = augerSpec(setp({})), want = sp.blade - 2*sp.ramp*0.7;
    const t = mk({}), runs = solidRuns(t, 1, 12*Math.sin(0.7), 12*Math.cos(0.7));
    const got = runs.reduce((s,r)=>s+(r[1]-r[0]),0)/runs.length;
    chk('и совпадает с тем, что построитель объявил', Math.abs(got-want) < 0.12,
        {got:+got.toFixed(2), want:+want.toFixed(2), ramp:+sp.ramp.toFixed(2), rows:sp.rows});
    chk('кромка витка не сходит на нет', sp.tip > 0.8, {tip:+sp.tip.toFixed(2)}); }
  chk('и тонкий виток отмечается как непечатаемый',
      collectPrintWarnings(setp({threadAugerBlade:0.5})).some(s=>/виток шнека/.test(s)),
      collectPrintWarnings(setp({threadAugerBlade:0.5})));
  chk('а нормальный — нет', collectPrintWarnings(setp({threadAugerBlade:1.6})).length === 0,
      collectPrintWarnings(setp({threadAugerBlade:1.6})));
}
{ // Pitch is the axial ratio: halve it and the flight comes round twice as often along the screw.
  const h1 = flightHits(mk({threadPitch:10}), 12, 0.7);
  chk('вдвое мельче шаг — вдвое больше витков', h1.length === 6, {hits:h1.length});
}
{ // Starts is the ANGULAR ratio, and it is invisible axially: a 2-start screw still repeats every pitch.
  // What two starts buys is two ribbons side by side, so the count has to be taken around the screw.
  for(const [S,want] of [[1,1],[2,2],[3,3]]){
    const n = flightArcs(mk({threadStarts:S}), 0, 10);
    chk(S+' захода: лент вокруг вала — '+want, n === want, {arcs:n});
  }
  // ...and each ribbon is correspondingly NARROWER, so the material is the same: a 2-start screw at the
  // same pitch is not a heavier screw, it is the same flight cut into two and laid at twice the helix
  // angle. (Written down because the first draft of this check asserted the opposite and was wrong.)
  const v1 = vol(mk({threadStarts:1})), v2 = vol(mk({threadStarts:2}));
  chk('но материала на витки уходит столько же', Math.abs(v2-v1)/v1 < 0.05,
      {one:+v1.toFixed(0), two:+v2.toFixed(0)});
}
{ // Handedness decides which way the material travels — the one thing you cannot fix after printing.
  // It must be measured OFF the seam: at θ = 0 the handed term is zero and both hands read identically,
  // which is what the first draft of this check did and why it saw no difference at all.
  const R = mk({threadHand:'right'}), L = mk({threadHand:'left'});
  const hR = flightHits(R, 12, 1.9), hL = flightHits(L, 12, 1.9);
  chk('на луче вне шва левый и правый расходятся',
      hR.length===hL.length && hR.some((v,k)=>Math.abs(v-hL[k])>0.5),
      {right:hR.map(v=>+v.toFixed(1)), left:hL.map(v=>+v.toFixed(1))});
  // ...and they go opposite ways: as the angle grows, one flight climbs and the other falls.
  const slope = t => flightHits(t, 12, 2.6)[1] - flightHits(t, 12, 1.9)[1];
  chk('и закручены в разные стороны', slope(R)*slope(L) < 0,
      {right:+slope(R).toFixed(2), left:+slope(L).toFixed(2)});
  chk('на шве (θ=0) они, наоборот, совпадают — это свойство пробника, а не детали',
      flightHits(R,12,0).every((v,k)=>Math.abs(v-flightHits(L,12,0)[k])<1e-9), {});
}

console.log('=== journals: a smooth stub to turn it by ===');
{ const withJ = computeBBox(mk({threadJournal:12})), noJ = computeBBox(mk({threadJournal:0}));
  chk('цапфы удлиняют шнек на два вылета',
      Math.abs((withJ.maxY-withJ.minY) - (noJ.maxY-noJ.minY) - 24) < 0.05,
      {with:+(withJ.maxY-withJ.minY).toFixed(2), without:+(noJ.maxY-noJ.minY).toFixed(2)});
  const t = mk({threadJournal:12, threadJournalD:8}), B = computeBBox(t);
  let r=0; for(const T of t) for(const v of T) if(v[1] > B.maxY-2) r = Math.max(r, Math.hypot(v[0],v[2]));
  chk('на конце — только гладкая цапфа заказанного Ø', Math.abs(2*r - 8) < 0.4, {d:+(2*r).toFixed(2)});
  chk('и она уже вала', 2*r < 10 + 1e-9, {});
  chk('без цапф шнек ровно заказанной длины', Math.abs((noJ.maxY-noJ.minY) - 60) < 0.05,
      {L:+(noJ.maxY-noJ.minY).toFixed(2)});
}

console.log('=== and it turns inside its barrel without touching it ===');
{ const p = setp({}), plan = assemblyPlacement(p, null);
  chk('пара — ствол', plan && plan.name === 'Ствол шнека (образец)', {got: plan && plan.name});
  chk('ствол замкнут', manifoldCheck(plan.tris,4).watertight, {});
  const world = plan.tris.map(T=>T.map(v=>[v[0]+plan.px, v[1]+plan.py, v[2]+plan.pz]));
  const Bb = computeBBox(world), A = computeBBox(buildTrisForShape('box', p));
  // The barrel's bore must clear the flight's tip — that is the running clearance, and it is the whole
  // reason the barrel is drawn at all. Measured off the two meshes, not off the parameters.
  let rTip=0; for(const T of buildTrisForShape('box', p)) for(const v of T) rTip=Math.max(rTip, Math.hypot(v[0],v[2]));
  let rBore=1e9; for(const T of world) for(const v of T) rBore=Math.min(rBore, Math.hypot(v[0],v[2]));
  chk('расточка ствола шире кромки витка', rBore > rTip + 0.2, {bore:+rBore.toFixed(2), tip:+rTip.toFixed(2)});
  chk('и не настолько шире, чтобы сыпучее шло мимо', rBore < rTip + 1.2, {gap:+(rBore-rTip).toFixed(2)});
  chk('ствол накрывает шнек по длине', Bb.minY <= A.minY+0.01 && Bb.maxY >= A.maxY-0.01,
      {barrel:[+Bb.minY.toFixed(1),+Bb.maxY.toFixed(1)], auger:[+A.minY.toFixed(1),+A.maxY.toFixed(1)]});
  chk('и соосен ему', Math.abs((Bb.maxX+Bb.minX)/2) < 0.02 && Math.abs((Bb.maxZ+Bb.minZ)/2) < 0.02,
      {cx:+((Bb.maxX+Bb.minX)/2).toFixed(4), cz:+((Bb.maxZ+Bb.minZ)/2).toFixed(4)});
}

console.log('=== no triangle is inside-out ===');
// manifoldCheck pairs edges undirected and cannot see an inverted face. The seam sits at θ = 0, on the
// +X axis, which is where these rays cross it; over a correctly wound union the depth never goes negative.
for(const [nm,ov] of [['шнек',{}], ['левый',{threadHand:'left'}], ['2 захода',{threadStarts:2}],
                      ['с цапфами',{threadJournal:10}], ['толстый виток',{threadAugerBlade:5}],
                      ['тонкий вал',{threadAugerShaft:4}]]){
  const t = mk(ov), B = computeBBox(t);
  let worst = 0, at = null;
  for(let k=1;k<14;k++){ const y = B.minY + (B.maxY-B.minY)*(k+0.37)/14;
    for(const z of [0.31, -0.44, 0.83]){ const d = minDepth(t, 0, y, z);
      if(d < worst){ worst = d; at = [+y.toFixed(2), z]; } } }
  chk(nm+': глубина по лучу нигде не уходит в минус', worst===0, {depth:worst, at});
}

console.log('\n=== TOTAL:', pass, 'passed,', fail, 'failed ===');
if(fail) process.exitCode = 1;
