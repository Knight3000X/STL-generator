// Шаблон радиусов — one plate with a concave comb on the back edge (measures an OUTSIDE radius) and a
// convex one on the front (measures an INSIDE radius), the same size at the same column.
//
// The instrument is one ray straight down each column. It enters at the crown of that column's tab and
// leaves at the floor of its notch, so a single run carries BOTH radii: start = −D/2 − r, end = D/2 − r.
// That is worth having, because the two features are drawn by different arcs going opposite ways round,
// and a sign slip in either one produces a plate that looks entirely reasonable and measures nothing.
// Run via ./run-all.sh.
let pass=0, fail=0;
function chk(n,c,e){if(c){pass++;console.log('  OK  ',n);}else{fail++;console.log('  FAIL',n,e!==undefined?JSON.stringify(e):'');}}
function vol(t){let v=0;for(const T of t){const a=T[0],b=T[1],c=T[2];v+=(a[0]*(b[1]*c[2]-b[2]*c[1])-a[1]*(b[0]*c[2]-b[2]*c[0])+a[2]*(b[0]*c[1]-b[1]*c[0]))/6;}return v;}
function setp(ov){ logos.length=0; boxHoles.length=0; dieFaces.length=0;
  Object.assign(paramState.box, defaultBoxParams(), {gfBaseplate:false, mntMode:'radgauge',
    mntRadN:6, mntRadStart:1, mntRadStep:1, mntT:4}, ov); return paramState.box; }
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
// The one ray: along Z at (x, y). ax=2 → p is X, q is Y.
const column = (t, x, y) => solidRuns(t, 2, x, y);

console.log('=== сборка ===');
for(const n of [2, 6, 14]) for(const r0 of [0.5, 1, 3]) for(const dr of [0.25, 1]){
  const t = mk({mntRadN:n, mntRadStart:r0, mntRadStep:dr}), mc = manifoldCheck(t,4);
  chk(n+'×, r0='+r0+', шаг '+dr+': замкнут', mc.watertight && vol(t)>0, {open:mc.openEdges, bad:mc.badEdges});
  chk(n+'×, r0='+r0+', шаг '+dr+': обмотка', minDepth(t,1,0.31,0.17)===0 && minDepth(t,2,0.31,0.17)===0);
  chk(n+'×, r0='+r0+', шаг '+dr+': одна оболочка', meshComponents(t).length === 1, meshComponents(t).length);
}

console.log('=== обе гребёнки, по одному лучу на колонку ===');
for(const n of [3, 6, 10]) for(const r0 of [0.6, 2]) for(const dr of [0.5, 1.5]){
  const t = mk({mntRadN:n, mntRadStart:r0, mntRadStep:dr});
  const s = radGaugeSpec(paramState.box);
  let okNotch = 0, okTab = 0, okSpan = 0;
  for(let k=0;k<n;k++){
    const runs = column(t, s.xAt(k) + 0.03, 0);   // a hair off the apex vertex: a ray straight
    // through a vertex is counted by both triangles that share it, and reads as no crossing at all
    if(runs.length !== 1) continue;
    const tabCrown = runs[0][0], notchFloor = runs[0][1];
    if(Math.abs((-s.D/2 - tabCrown) - s.rs[k]) < 0.04) okTab++;         // convex, standing proud
    if(Math.abs((s.D/2 - notchFloor) - s.rs[k]) < 0.04) okNotch++;      // concave, bitten in
    if(Math.abs((notchFloor - tabCrown) - s.D) < 0.08) okSpan++;        // ...and they cancel: the span is D
  }
  chk(n+'×, r0='+r0+', шаг '+dr+': вырезы = заданным радиусам', okNotch === n, okNotch+'/'+n);
  chk(n+'×, r0='+r0+', шаг '+dr+': выступы = тем же радиусам', okTab === n, okTab+'/'+n);
  chk(n+'×, r0='+r0+', шаг '+dr+': вырез и выступ гасят друг друга', okSpan === n, okSpan+'/'+n);
  // between columns the plate is its plain self, top edge to bottom edge
  let plain = 0;
  for(let k=0;k+1<n;k++){
    const runs = column(t, (s.xAt(k)+s.xAt(k+1))/2, 0);
    if(runs.length===1 && Math.abs(runs[0][0] + s.D/2) < 1e-6 && Math.abs(runs[0][1] - s.D/2) < 1e-6) plain++; }
  chk(n+'×, r0='+r0+', шаг '+dr+': между колонками кромки прямые', plain === n-1, plain+'/'+(n-1));
}

console.log('=== ряд радиусов ===');
for(const n of [4, 9]) for(const r0 of [0.8, 2.5]) for(const dr of [0.2, 1]){
  const s = radGaugeSpec(setp({mntRadN:n, mntRadStart:r0, mntRadStep:dr}));
  chk(n+'×: ряд начинается с заданного', Math.abs(s.rs[0] - r0) < 1e-12);
  chk(n+'×: шаг выдержан', s.rs.every((r,i)=>Math.abs(r - (r0+dr*i)) < 1e-12), s.rs);
  chk(n+'×: соседние выступы не сходятся', s.pitch >= 2*s.rMax + 4, {pitch:s.pitch, rMax:s.rMax});
  chk(n+'×: вырез не прорезает пластину насквозь', s.D/2 - s.rMax >= 5.9, s.D/2 - s.rMax);
}

console.log('=== имя несёт диапазон ===');
{
  chk('диапазон в имени', /1…6 мм/.test(activeShapeLabel(setp({mntRadN:6, mntRadStart:1, mntRadStep:1}))),
      activeShapeLabel());
  chk('дробный шаг тоже', /0\.5…2 мм/.test(activeShapeLabel(setp({mntRadN:4, mntRadStart:0.5, mntRadStep:0.5}))),
      activeShapeLabel());
}

console.log('=== предупреждения ===');
{
  const w1 = collectPrintWarnings(setp({mntRadStart:0.4}));
  chk('слишком мелкий первый радиус назван', w1.some(x=>/первый радиус/.test(x)), w1);
  const w2 = collectPrintWarnings(setp({mntRadStart:1.5}));
  chk('нормальный шаблон — молча', !w2.some(x=>/первый радиус|гребёнка/.test(x)), w2);
}

console.log('=== TOTAL: ' + pass + ' passed, ' + fail + ' failed ===');
if(fail) process.exit(1);
