// Роторы Roots — two identical N-lobed rotors turning at the same speed in opposite directions inside a
// figure-of-eight bore. The pair is conjugate WITH ITSELF: there is no master member to envelope from, so
// unlike the worm wheel and the cycloidal disc this one is drawn from the closed-form cycloidal profile
// (epicycloid tip out to r + 2ρ, hypocycloid root in to r − 2ρ, ρ = r/2N) and the conjugacy is then
// PROVED by sweep rather than assumed. That is the whole point of this file: a profile that is right at
// one angle and wrong at another looks perfect in the preview.
//
// Two things are measured over a full revolution: that the rotors never touch (or the pair seizes) and
// that they never open up (or the blower does not seal). Both matter, and only the first of them is the
// kind of thing a build-time check would ever catch. Run via ./run-all.sh.
let pass=0, fail=0;
function chk(n,c,e){if(c){pass++;console.log('  OK  ',n);}else{fail++;console.log('  FAIL',n,e!==undefined?JSON.stringify(e):'');}}
function vol(t){let v=0;for(const T of t){const a=T[0],b=T[1],c=T[2];v+=(a[0]*(b[1]*c[2]-b[2]*c[1])-a[1]*(b[0]*c[2]-b[2]*c[0])+a[2]*(b[0]*c[1]-b[1]*c[0]))/6;}return v;}
function setp(ov){ logos.length=0; boxHoles.length=0; dieFaces.length=0;
  Object.assign(paramState.box, defaultBoxParams(), {gfBaseplate:false, gearMode:'roots',
    rootsPart:'rotor', rootsLobes:2, rootsCenter:40, rootsThick:12, rootsBore:5,
    rootsWall:3, rootsGap:0.35}, ov); return paramState.box; }
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
// ---- 2D instruments ---------------------------------------------------------------------------------
const rot2=(p,A)=>[p[0]*Math.cos(A)-p[1]*Math.sin(A), p[0]*Math.sin(A)+p[1]*Math.cos(A)];
const dense=(P,step)=>{ const out=[];
  for(let i=0;i<P.length;i++){ const p=P[i], q=P[(i+1)%P.length], L=Math.hypot(q[0]-p[0],q[1]-p[1]);
    const k=Math.max(1, Math.ceil(L/step));
    for(let j=0;j<k;j++) out.push([p[0]+(q[0]-p[0])*j/k, p[1]+(q[1]-p[1])*j/k]); }
  return out; };
// Signed distance from a point to a closed outline: negative inside. Distance to the nearest EDGE, not to
// the nearest vertex — a vertex-only reading turns a 0.1 mm bite into a clean miss on a curve this coarse.
function sdLoop(P, p){
  let best = Infinity;
  for(let i=0;i<P.length;i++){ const a=P[i], b=P[(i+1)%P.length];
    const ex=b[0]-a[0], ez=b[1]-a[1], L2=ex*ex+ez*ez;
    let t = L2>0 ? ((p[0]-a[0])*ex + (p[1]-a[1])*ez)/L2 : 0;
    t = Math.max(0, Math.min(1, t));
    const d = Math.hypot(p[0]-a[0]-t*ex, p[1]-a[1]-t*ez);
    if(d<best) best=d; }
  let inside=false;
  for(let i=0,n=P.length,j=n-1;i<n;j=i++){
    if((P[i][1]>p[1])!==(P[j][1]>p[1]) &&
       p[0] < (P[j][0]-P[i][0])*(p[1]-P[i][1])/(P[j][1]-P[i][1])+P[i][0]) inside=!inside; }
  return inside ? -best : best;
}

console.log('=== профиль: замкнутая форма ===');
for(const N of [2,3,4,5]) for(const c of [24, 40, 70]){
  const s = rootsSpec(setp({rootsLobes:N, rootsCenter:c}));
  chk(N+' лопастей, c='+c+': r = c/2', Math.abs(s.r - c/2) < 1e-12);
  chk(N+' лопастей, c='+c+': вершина r(1+1/N)', Math.abs(s.Rt - s.r*(1+1/N)) < 1e-12, {Rt:s.Rt});
  chk(N+' лопастей, c='+c+': впадина r(1−1/N)', Math.abs(s.Rr - s.r*(1-1/N)) < 1e-12, {Rr:s.Rr});
  // Both arches must land back ON the pitch circle at their ends, or the lobes do not join up.
  const P = rootsProfile(s, 60, 0);
  let onPitch = 0;
  for(let k=0;k<N;k++){ const a = 2*Math.PI*k/N + Math.PI/(2*N);
    let near = Infinity;
    for(const q of P) near = Math.min(near, Math.hypot(q[0]-s.r*Math.cos(a), q[1]-s.r*Math.sin(a)));
    if(near < 0.02*c) onPitch++; }
  chk(N+' лопастей, c='+c+': стыки лежат на начальной окружности', onPitch === N, onPitch);
}

console.log('=== сборка ===');
for(const N of [2,3,4]) for(const c of [24, 60]){
  for(const part of ['rotor','housing']){
    const t = mk({rootsLobes:N, rootsCenter:c, rootsPart:part}), mc = manifoldCheck(t,4);
    chk(N+' лопастей, c='+c+', '+part+': замкнут', mc.watertight && vol(t)>0, {open:mc.openEdges, bad:mc.badEdges});
    chk(N+' лопастей, c='+c+', '+part+': обмотка', minDepth(t,1,0,0)===0 && minDepth(t,1,c*0.3,c*0.05)===0);
    chk(N+' лопастей, c='+c+', '+part+': одна оболочка', meshComponents(t).length === 1, meshComponents(t).length);
  }
}

console.log('=== ротор: радиусы с мешa ===');
for(const N of [2,3,4]){
  const t = mk({rootsLobes:N, rootsCenter:40});
  const s = rootsSpec(paramState.box);
  let hi=0, lo=1e9;
  for(const T of t) for(const v of T){ const r=Math.hypot(v[0],v[2]);
    if(r>hi) hi=r; if(r>s.rB+0.5 && r<lo) lo=r; }
  chk(N+' лопастей: вершина ужата на ползазора', Math.abs(hi - s.tip) < 0.06, {hi, want:s.tip});
  chk(N+' лопастей: впадина раздана на ползазора', Math.abs(lo - s.root) < 0.06, {lo, want:s.root});
  // The bore is still a bore: a ray across the rotor gives two runs with the hole between them.
  const rr = solidRuns(t, 0, s.L/2, 0.7);
  chk(N+' лопастей: расточка насквозь', rr.length === 2, rr.map(r=>r.map(x=>+x.toFixed(2))));
}

console.log('=== корпус: восьмёрка ===');
for(const N of [2,3]){
  const t = mk({rootsLobes:N, rootsCenter:40, rootsPart:'housing'});
  const s = rootsSpec(paramState.box);
  // across the waist of the eight, on the axis: wall, bore, wall — and NOT a single run, which is what a
  // radius function would have been forced to draw.
  const runs = solidRuns(t, 0, s.L/2, 0);
  chk(N+' лопастей: поперёк корпуса — стенка, полость, стенка', runs.length === 2, runs.map(r=>r.map(x=>+x.toFixed(2))));
  chk(N+' лопастей: полость шире межосевого', runs.length===2 && (runs[1][0]-runs[0][1]) > s.c,
      runs.length===2 ? +(runs[1][0]-runs[0][1]).toFixed(2) : null);
  // off-axis, above both bores, the eight has a WAIST: the section there is two separate pieces of wall
  // plus the two bores — four runs, the signature of a shape no r(θ) can express.
  // Above the waist of the BORE the two cavities have separated, so the ray meets outer wall, cavity,
  // the web between the cavities, cavity, outer wall — three runs of material with two holes in them.
  // No radius function can put a piece of material between two holes on the same ray.
  // The height has to sit BETWEEN the two waists: above the bore's, where the cavities have parted, and
  // below the outer shell's, where the block itself parts in two and the count goes back up to four.
  const zi = Math.sqrt(s.Rh*s.Rh - (s.c/2)*(s.c/2));
  const zo = Math.sqrt((s.Rh+s.wall)*(s.Rh+s.wall) - (s.c/2)*(s.c/2));
  const off = solidRuns(t, 0, s.L/2, (zi + zo)/2);
  chk(N+' лопастей: выше талии — три интервала через две полости', off.length === 3, off.map(r=>r.map(x=>+x.toFixed(2))));
}

console.log('=== прокрутка пары на полный оборот ===');
// Rotor A turns +θ about the origin, rotor B turns −θ about (c, 0) and starts half a lobe round when N is
// even. Both are the SAME part. Every point of B is asked for its signed distance to A: it must never go
// negative (they would seize) and the closest approach must never grow past the clearance by much (they
// would stop sealing). The second half is the one that fails silently.
for(const N of [2,3,4]) for(const c of [24, 60]){
  const s = rootsSpec(setp({rootsLobes:N, rootsCenter:c}));
  const A0 = rootsProfile(s), B0 = dense(rootsProfile(s), Math.max(0.05, c/900));
  let worst = 1e9, widest = 0, atW = 0;
  for(let k=0;k<240;k++){
    const th = 2*Math.PI*k/240;
    const A = A0.map(q=>rot2(q, th));
    let near = 1e9;
    for(const q of B0){ const w = rot2(q, s.phase - th);
      const d = sdLoop(A, [w[0] + s.c, w[1]]);
      if(d < near) near = d; }
    if(near < worst) worst = near;
    if(near > widest){ widest = near; atW = k; } }
  chk(N+' лопастей, c='+c+': роторы не сходятся вплотную', worst > 0, +worst.toFixed(4));
  chk(N+' лопастей, c='+c+': уплотнение не раскрывается', widest < s.gap + 0.06*c,
      {widest:+widest.toFixed(3), lim:+(s.gap + 0.06*c).toFixed(3), atDeg:+(atW*1.5).toFixed(0)});
}

console.log('=== ротор в корпусе ===');
for(const N of [2,3]){
  const s = rootsSpec(setp({rootsLobes:N, rootsCenter:40}));
  const bore = [];
  for(let i=0;i<720;i++){ const a=2*Math.PI*i/720; bore.push([s.Rh*Math.cos(a), s.Rh*Math.sin(a)]); }
  let out = -1e9;
  for(let k=0;k<120;k++){ const th=2*Math.PI*k/120;
    for(const q of rootsProfile(s)){ const w=rot2(q, th); out = Math.max(out, Math.hypot(w[0],w[1]) - s.Rh); } }
  chk(N+' лопастей: ротор не задевает корпус', out < 0, +out.toFixed(4));
  chk(N+' лопастей: и не болтается в нём', out > -(s.gap + 0.05), {out:+out.toFixed(4), gap:s.gap});
}

console.log('=== пара и имя ===');
{
  const s = rootsSpec(setp({rootsLobes:2, rootsCenter:40}));
  chk('фаза для чётного N — полдоли', Math.abs(s.phase - Math.PI/2) < 1e-9, s.phase);
  chk('фаза для нечётного N — ноль', Math.abs(rootsSpec(setp({rootsLobes:3})).phase) < 1e-9);
  const m = assemblyMate(setp({rootsLobes:2, rootsPart:'rotor'}));
  chk('пара объявлена', !!m && /ротор/i.test(m.name), m && m.name);
  chk('назван', /roots/i.test(activeShapeLabel(setp({rootsPart:'rotor'}))), activeShapeLabel());
  chk('корпус собирается отдельно', !assemblyMate(setp({rootsPart:'housing'})) ||
      !/ротор/i.test(assemblyMate(setp({rootsPart:'housing'})).name || ''));
}

console.log('=== TOTAL: ' + pass + ' passed, ' + fail + ' failed ===');
if(fail) process.exit(1);
