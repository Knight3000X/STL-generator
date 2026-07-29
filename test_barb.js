// Ёлочка на шланг: a barbed hose tail. A body of revolution, so `latheYTris` builds it whole — an outer
// silhouette plus a coaxial bore, no new machinery at all.
//
// What has to be true for it to hold a hose is dimensional, not topological, and that is what is measured
// here: the crests stand PROUD of the hose's bore (that interference is the grip) while the roots sit
// under it (or the hose will not go on at all), each barb ramps up toward the body and steps straight
// back (so it slides on and catches coming off), and the channel runs clear from end to end.
// Run via ./run-all.sh.
let pass=0, fail=0;
function chk(n,c,e){if(c){pass++;console.log('  OK  ',n);}else{fail++;console.log('  FAIL',n,e!==undefined?JSON.stringify(e):'');}}
function vol(t){let v=0;for(const T of t){const a=T[0],b=T[1],c=T[2];v+=(a[0]*(b[1]*c[2]-b[2]*c[1])-a[1]*(b[0]*c[2]-b[2]*c[0])+a[2]*(b[0]*c[1]-b[1]*c[0]))/6;}return v;}
function setp(ov){ logos.length=0; boxHoles.length=0; dieFaces.length=0;
  Object.assign(paramState.box, defaultBoxParams(), {gfBaseplate:false, threadMode:'barb',
    threadD:12, threadLen:22, threadBore:0, threadBarbN:0, threadBarbEnd:'barb'}, ov);
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
// It is a solid of revolution, so at any height the outer surface is one radius. It has to be read with a
// RAY, not by looking for vertices near that height: a lathe puts vertices only at the silhouette's
// corners, so a slab-of-vertices probe returns 0 at most heights and reports a barb-less rod. (It did.)
function radiusAt(tris, y){
  const z = 0.13, runs = solidRuns(tris, 0, y, z);
  let x = 0; for(const r of runs){ x = Math.max(x, Math.abs(r[0]), Math.abs(r[1])); }
  return x > 0 ? Math.hypot(x, z) : 0;
}

console.log('=== builds across the range ===');
for(const D of [6,12,25,40]) for(const end of ['barb','flange','thread']){
  const t = mk({threadD:D, threadBarbEnd:end}), mc = manifoldCheck(t,4);
  chk('Ø'+D+' / '+end+': замкнут', mc.watertight && vol(t)>0, {open:mc.openEdges, bad:mc.badEdges});
}
for(const ov of [{threadBarbN:1}, {threadBarbN:12}, {threadLen:6}, {threadLen:80},
                 {threadBore:2}, {threadBore:9}, {threadBore:0},
                 {threadBarbEnd:'thread', threadPitch:1.5}, {threadBarbEnd:'flange', threadFlangeR:30},
                 {threadBarbEnd:'flange', threadFlange:10}]){
  const t = mk(ov), mc = manifoldCheck(t,4);
  chk('крайние параметры '+JSON.stringify(ov), mc.watertight && vol(t)>0, {open:mc.openEdges, bad:mc.badEdges});
}

console.log('=== the channel runs clear from end to end ===');
{ for(const end of ['barb','flange','thread']){
    const t = mk({threadBarbEnd:end});
    chk(end+': по оси материала нет', solidRuns(t,1,0,0).length === 0, {runs:solidRuns(t,1,0,0).length});
    // ...and it is the ordered bore, not some pinhole
    // The auto bore is a fraction of the barb's root, not a round number — what matters is that it is a
    // real channel: wide enough to carry something, and comfortably inside the root so a wall is left.
    const B = computeBBox(t), runs = solidRuns(t, 0, B.minY + 4.3, 0.31);
    const gap = runs.length >= 2 ? runs[1][0]-runs[0][1] : 0;
    chk(end+': и канал — заметная доля от Ø шланга', gap > 12*0.4 && gap < 12*0.8, {gap:+gap.toFixed(2)});
  }
  const bores = [3, 5, 8].map(d => { const t = mk({threadBore:d}), B = computeBBox(t);
    const runs = solidRuns(t, 0, B.minY + 4.3, 0.31);
    return runs.length >= 2 ? runs[1][0]-runs[0][1] : 0; });
  chk('Ø канала следует за параметром', bores.every((v,k)=>Math.abs(v-[3,5,8][k])<0.4), bores.map(v=>+v.toFixed(2)));
}

console.log('=== the grip: crests proud of the hose bore, roots under it ===');
// The whole reason a barb holds. Crests below the hose's inner Ø grip nothing; roots above it and the
// hose will not go on at all. Both are read off the mesh, not off the parameters.
{ const t = mk({}), B = computeBBox(t);
  let rMax = 0, rMin = 1e9;
  for(let k=0;k<220;k++){ const y = B.minY + 0.6 + 20.5*k/220, r = radiusAt(t, y);
    if(r > 0){ rMax = Math.max(rMax, r); rMin = Math.min(rMin, r); } }
  chk('гребни выступают за расточку шланга', rMax > 6 + 0.2 && rMax < 6 + 1.2,
      {crest:+rMax.toFixed(2), hose:6});
  chk('а впадины уходят под неё', rMin < 6 - 0.3 && rMin > 6 - 1.6, {root:+rMin.toFixed(2), hose:6});
  chk('и натяг — десятые доли, а не миллиметры', (rMax-6) < 1.0, {fit:+(rMax-6).toFixed(2)});
  const wide = mk({threadD:25});
  let rw = 0; const Bw = computeBBox(wide);
  for(let k=0;k<220;k++) rw = Math.max(rw, radiusAt(wide, Bw.minY + 0.6 + 20.5*k/220));
  chk('на Ø25 гребень тоже чуть больше половины', rw > 12.5 && rw < 14, {crest:+rw.toFixed(2)});
}

console.log('=== the barbs: counted, and each one ramps up then steps back ===');
{ // Count the barbs by their STEPS, not by looking for a local maximum. A crest here is not a hill: the
  // radius climbs the ramp and then falls off a cliff, and immediately starts climbing the next ramp. A
  // peak detector asking for a fall on BOTH sides finds none at all — which is what the first draft did.
  const count = t => { const B = computeBBox(t), rs = [];
    for(let k=0;k<=440;k++) rs.push(radiusAt(t, B.minY + 0.4 + 21.2*k/440));
    let n = 0;
    for(let i=0;i<rs.length-1;i++) if(rs[i] - rs[i+1] > 0.3) n++;
    return n; };
  for(const N of [2, 4, 6]) chk(N+' зубца заказано — '+N+' и вышло', count(mk({threadBarbN:N})) === N,
      {got:count(mk({threadBarbN:N}))});
  chk('0 — авто, и зубцы всё равно есть', count(mk({threadBarbN:0})) >= 3, {got:count(mk({threadBarbN:0}))});
}
{ // The asymmetry IS the barb. The ramp climbs over most of the barb's length; the return is a step with
  // no length at all. A symmetric tooth would push on just as easily and pull off just as easily.
  const t = mk({threadBarbN:4}), B = computeBBox(t), bl = 22/4;
  const rs = [];
  for(let k=0;k<=400;k++) rs.push([B.minY + 0.4 + 21.2*k/400, radiusAt(t, B.minY + 0.4 + 21.2*k/400)]);
  // Height at which the radius is rising vs falling, over the second barb
  let rising = 0, falling = 0;
  for(let i=1;i<rs.length;i++){ const y=rs[i][0]-B.minY;
    if(y < bl || y > 3*bl) continue;
    const d = rs[i][1]-rs[i-1][1];
    if(d > 0.01) rising += rs[i][0]-rs[i-1][0]; else if(d < -0.01) falling += rs[i][0]-rs[i-1][0]; }
  chk('подъём зубца длинный, возврат — почти отвесный', rising > falling*6,
      {rising:+rising.toFixed(2), falling:+falling.toFixed(2)});
  // The tip is the narrowest thing on the tail — otherwise the hose does not start onto it
  chk('носок — самое узкое место', radiusAt(t, B.minY+0.05) < radiusAt(t, B.minY+3),
      {tip:+radiusAt(t,B.minY+0.05).toFixed(2)});
}

console.log('=== the far end is a choice, and each one is what it says ===');
{ const joiner = mk({threadBarbEnd:'barb'}), fl = mk({threadBarbEnd:'flange'}), th = mk({threadBarbEnd:'thread'});
  const Bj = computeBBox(joiner), Bf = computeBBox(fl), Bt = computeBBox(th);
  chk('соединитель — две ёлочки, значит вдвое длиннее фланцевой', (Bj.maxY-Bj.minY) > (Bf.maxY-Bf.minY)*1.7,
      {joiner:+(Bj.maxY-Bj.minY).toFixed(1), flange:+(Bf.maxY-Bf.minY).toFixed(1)});
  chk('и он симметричен', Math.abs(radiusAt(joiner, Bj.minY+2) - radiusAt(joiner, Bj.maxY-2)) < 0.05, {});
  chk('фланец шире гребней', radiusAt(fl, Bf.maxY-1) > radiusAt(fl, Bf.minY+4) + 2,
      {flange:+radiusAt(fl,Bf.maxY-1).toFixed(2)});
  chk('с резьбой деталь длиннее фланцевой', (Bt.maxY-Bt.minY) > (Bf.maxY-Bf.minY) + 5, {});
  // ...and that thread really is a thread: the radius swings along it, a plain tube's would not
  let lo=1e9, hi=0;
  for(let k=0;k<80;k++){ const r = radiusAt(th, Bt.maxY - 1.5 - 6*k/80); if(r>0){ lo=Math.min(lo,r); hi=Math.max(hi,r); } }
  chk('и на ней радиус ходит — это резьба, а не гладкая трубка', hi-lo > 0.6, {swing:+(hi-lo).toFixed(2)});
  chk('деталь с резьбой — две оболочки, обе замкнуты',
      meshComponents(th).length === 2 && meshComponents(th).every(c=>manifoldCheck(c,4).watertight),
      {n:meshComponents(th).length});
}

console.log('=== no triangle is inside-out ===');
for(const [nm,ov] of [['ёлочка',{}], ['фланец',{threadBarbEnd:'flange'}], ['штуцер',{threadBarbEnd:'thread'}],
                      ['один зубец',{threadBarbN:1}], ['узкий канал',{threadBore:2}]]){
  const t = mk(ov), B = computeBBox(t);
  let worst = 0, at = null;
  for(let k=1;k<14;k++){ const y = B.minY + (B.maxY-B.minY)*(k+0.37)/14;
    for(const z of [0.31, -0.44, 0.83]){ const d = minDepth(t, 0, y, z);
      if(d < worst){ worst = d; at = [+y.toFixed(2), z]; } } }
  chk(nm+': глубина по лучу нигде не уходит в минус', worst===0, {depth:worst, at});
}

console.log('\n=== TOTAL:', pass, 'passed,', fail, 'failed ===');
if(fail) process.exitCode = 1;
