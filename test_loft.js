// Лофт между РАЗНЫМИ контурами — the last piece of machinery the roadmap asked for, and the only one whose
// difficulty is not geometric. Sweeping one outline is easy; joining two different ones means deciding
// which point of the first belongs to which point of the second, and everything else follows from that.
//
// Two decisions are tested here rather than the triangles they produce:
//   * correspondence by ARC LENGTH, not by angle — an angle-parametrised circle and rectangle put four
//     times the points into the rectangle's corners as into its flats, and the ruled surface creases;
//   * the index offset that TRAVELS LEAST — otherwise the two ends are joined with a twist, which a
//     wireframe of a symmetric pair does not show and a print does.
// Both are checked directly on the loops, before any mesh exists. Run via ./run-all.sh.
let pass=0, fail=0;
function chk(n,c,e){if(c){pass++;console.log('  OK  ',n);}else{fail++;console.log('  FAIL',n,e!==undefined?JSON.stringify(e):'');}}
function vol(t){let v=0;for(const T of t){const a=T[0],b=T[1],c=T[2];v+=(a[0]*(b[1]*c[2]-b[2]*c[1])-a[1]*(b[0]*c[2]-b[2]*c[0])+a[2]*(b[0]*c[1]-b[1]*c[0]))/6;}return v;}
function setp(ov){ logos.length=0; boxHoles.length=0; dieFaces.length=0;
  Object.assign(paramState.box, defaultBoxParams(), {gfBaseplate:false, mntMode:'transition',
    mntTrAW:100, mntTrAD:100, mntTrAR:50, mntTrBW:120, mntTrBD:60, mntTrBR:5,
    mntTrH:60, mntTrWall:2}, ov); return paramState.box; }
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
const perim = P => { let L=0; for(let i=0;i<P.length;i++){ const q=P[(i+1)%P.length];
  L += Math.hypot(q[0]-P[i][0], q[1]-P[i][1]); } return L; };
const ringXZ = (ap, aq, rc, n) => { const P=[];
  for(let i=0;i<n;i++){ const a=2*Math.PI*i/n, r=roundedRectDist(ap, aq, rc, a);
    P.push([r*Math.cos(a), r*Math.sin(a)]); } return P; };

console.log('=== пересэмплирование по длине дуги ===');
// Steps are made equal in ARC LENGTH along the original outline, which is not the same as equal in
// straight-line distance: a chord that spans a corner cuts it off and reads short. So uniformity is not
// asserted as an absolute here — it is asserted as an IMPROVEMENT over parametrising by angle, which is
// the thing arc length was chosen instead of, and as an absolute only where there are no corners to cut.
for(const N of [16, 64, 256]) for(const shape of [[50,50,50], [60,30,0], [60,30,15]]){
  const raw = ringXZ(shape[0], shape[1], shape[2], 512);
  const R = resampleLoopXZ(raw, N);
  const spread = P => { let lo=1e9, hi=0;
    for(let i=0;i<P.length;i++){ const q=P[(i+1)%P.length], d=Math.hypot(q[0]-P[i][0], q[1]-P[i][1]);
      lo=Math.min(lo,d); hi=Math.max(hi,d); }
    return hi/lo; };
  chk(N+' точек на '+shape.join('×')+': столько и вышло', R.length === N, R.length);
  if(N >= 64) chk(N+' точек на '+shape.join('×')+': периметр сохранён',
      Math.abs(perim(R) - perim(raw))/perim(raw) < 0.015, {got:+perim(R).toFixed(2), want:+perim(raw).toFixed(2)});
  chk(N+' точек на '+shape.join('×')+': ровнее, чем по углу',
      spread(R) < spread(ringXZ(shape[0], shape[1], shape[2], N)) + 1e-9,
      {arc:+spread(R).toFixed(3), angle:+spread(ringXZ(shape[0], shape[1], shape[2], N)).toFixed(3)});
  if(shape[2] >= Math.min(shape[0], shape[1]))     // no corners at all: then it really is uniform
    chk(N+' точек на '+shape.join('×')+': без углов шаг ровный', spread(R) < 1.02, +spread(R).toFixed(4));
}
{ // and the comparison itself, stated once: by angle a rectangle's steps are not equal at all
  const N = 128, byAngle = ringXZ(60, 30, 0, N);
  let lo=1e9, hi=0;
  for(let i=0;i<N;i++){ const q=byAngle[(i+1)%N], d=Math.hypot(q[0]-byAngle[i][0], q[1]-byAngle[i][1]);
    lo=Math.min(lo,d); hi=Math.max(hi,d); }
  chk('по углу шаг прямоугольника гуляет в разы', hi/lo > 2, +(hi/lo).toFixed(2));
  const arc = resampleLoopXZ(ringXZ(60, 30, 0, 512), N);
  let lo2=1e9, hi2=0;
  for(let i=0;i<N;i++){ const q=arc[(i+1)%N], d=Math.hypot(q[0]-arc[i][0], q[1]-arc[i][1]);
    lo2=Math.min(lo2,d); hi2=Math.max(hi2,d); }
  chk('по длине дуги — в пределах четверти', hi2/lo2 < 1.25, +(hi2/lo2).toFixed(3));
}

console.log('=== выравнивание: наименьший путь, а не первый попавшийся ===');
for(const N of [64, 128]){
  const A = resampleLoopXZ(ringXZ(50, 50, 50, 512), N);
  // The same loop, started a third of the way round: alignment has to undo that exactly.
  const k = Math.round(N/3), shifted = A.slice(k).concat(A.slice(0, k));
  const back = alignLoopXZ(A, shifted);
  let worst = 0;
  for(let i=0;i<N;i++) worst = Math.max(worst, Math.hypot(back[i][0]-A[i][0], back[i][1]-A[i][1]));
  chk(N+': сдвинутый контур возвращается на место', worst < 1e-9, +worst.toFixed(9));
  // A square against a circle of the same perimeter: after alignment, no corresponding pair may travel
  // further than the naive offset would have made it. Checked against ALL offsets, not just against zero.
  const S = resampleLoopXZ(ringXZ(40, 40, 0, 512), N);
  const C = resampleLoopXZ(ringXZ(45, 45, 45, 512), N);
  const cost = Q => { let d=0; for(let i=0;i<N;i++) d += Math.hypot(Q[i][0]-S[i][0], Q[i][1]-S[i][1]); return d; };
  const aligned = alignLoopXZ(S, C);
  let bestCost = Infinity;
  for(let o=0;o<N;o++) bestCost = Math.min(bestCost, cost(C.slice(o).concat(C.slice(0,o))));
  chk(N+': выбран действительно наименьший путь', cost(aligned) <= bestCost + 1e-6,
      {chosen:+cost(aligned).toFixed(3), best:+bestCost.toFixed(3)});
}

console.log('=== сборка переходника ===');
for(const aw of [40, 100]) for(const bd of [30, 60]) for(const H of [20, 60, 150]){
  const t = mk({mntTrAW:aw, mntTrAD:aw, mntTrAR:aw/2, mntTrBD:bd, mntTrH:H}), mc = manifoldCheck(t,4);
  chk(aw+'→'+bd+' H='+H+': замкнут', mc.watertight && vol(t)>0, {open:mc.openEdges, bad:mc.badEdges});
  chk(aw+'→'+bd+' H='+H+': обмотка', minDepth(t,1,0.7,0.3)===0 && minDepth(t,0,0.7,0.3)===0);
  chk(aw+'→'+bd+' H='+H+': одна оболочка', meshComponents(t).length === 1, meshComponents(t).length);
}

console.log('=== концы — те контуры, которые заказаны ===');
for(const cfg of [[100,100,50, 120,60,5], [80,80,40, 80,80,0], [60,40,10, 30,30,15]]){
  const t = mk({mntTrAW:cfg[0], mntTrAD:cfg[1], mntTrAR:cfg[2],
                mntTrBW:cfg[3], mntTrBD:cfg[4], mntTrBR:cfg[5]});
  const s = transitionSpec(paramState.box);
  const yLo = -s.H/2 + 0.001, yHi = s.H/2 - 0.001;
  for(const e of [['низ', yLo, cfg[0], cfg[1]], ['верх', yHi, cfg[3], cfg[4]]]){
    const acr = solidRuns(t, 0, e[1], 0.3), dwn = solidRuns(t, 2, 0.3, e[1]);
    chk(cfg.join(',')+' '+e[0]+': поперёк — две стенки', acr.length === 2, acr.map(r=>r.map(x=>+x.toFixed(2))));
    chk(cfg.join(',')+' '+e[0]+': ширина по мешу', acr.length===2 && Math.abs((acr[1][1]-acr[0][0]) - e[2]) < 0.3,
        acr.length===2 ? +(acr[1][1]-acr[0][0]).toFixed(2) : null);
    chk(cfg.join(',')+' '+e[0]+': глубина по мешу', dwn.length===2 && Math.abs((dwn[1][1]-dwn[0][0]) - e[3]) < 0.3,
        dwn.length===2 ? +(dwn[1][1]-dwn[0][0]).toFixed(2) : null);
    chk(cfg.join(',')+' '+e[0]+': стенка в свою толщину',
        acr.length===2 && acr.every(r => Math.abs((r[1]-r[0]) - s.w) < 0.25), acr.map(r=>+(r[1]-r[0]).toFixed(2)));
  }
  chk(cfg.join(',')+': канал сквозной', solidRuns(t, 1, 0.3, 0.7).length === 0, solidRuns(t,1,0.3,0.7).length);
}

console.log('=== лофт общий, а не только для звёздчатых контуров ===');
{ // A plus sign is not star-shaped about its centre in the sense r(θ) needs, and neither loop is a
  // rounded rectangle. loftShellYTris never asks: it takes points and pairs them.
  const N = 160, plus = [];
  const a = 12, b = 30;
  const pts = [[a,b],[-a,b],[-a,a],[-b,a],[-b,-a],[-a,-a],[-a,-b],[a,-b],[a,-a],[b,-a],[b,a],[a,a]];
  for(let i=0;i<pts.length;i++){ const p=pts[i], q=pts[(i+1)%pts.length], k=8;
    for(let j=0;j<k;j++) plus.push([p[0]+(q[0]-p[0])*j/k, p[1]+(q[1]-p[1])*j/k]); }
  const A = resampleLoopXZ(plus, N);
  const B = alignLoopXZ(A, resampleLoopXZ(ringXZ(25, 25, 25, 512), N));
  const t = loftShellYTris(A, B, insetLoopXZ(A, 2), insetLoopXZ(B, 2), 0, 40, 16);
  const mc = manifoldCheck(t, 4);
  chk('крест → круг: замкнут', mc.watertight && vol(t)>0, {open:mc.openEdges, bad:mc.badEdges});
  chk('крест → круг: обмотка', minDepth(t,1,0.7,0.3)===0 && minDepth(t,0,0.7,0.3)===0);
  chk('крест → круг: одна оболочка', meshComponents(t).length === 1, meshComponents(t).length);
  // the plus's arms survive: a ray across the bottom face meets the arm, not a circle
  const arm = solidRuns(t, 0, 0.001, 0.3);
  chk('крест → круг: у основания это ещё крест', arm.length === 2 && Math.abs((arm[1][1]-arm[0][0]) - 2*b) < 0.5,
      arm.map(r=>r.map(x=>+x.toFixed(2))));
  const top = solidRuns(t, 0, 39.999, 0.3);
  chk('крест → круг: наверху это уже круг', top.length === 2 && Math.abs((top[1][1]-top[0][0]) - 50) < 0.5,
      top.map(r=>r.map(x=>+x.toFixed(2))));
}

console.log('=== наклон стенки посчитан и вынесен ===');
for(const H of [15, 60, 200]){
  const s = transitionSpec(setp({mntTrH:H}));
  chk('H='+H+': наклон = arctg(ход / высота)',
      Math.abs(s.lean - Math.atan2(s.travel, H)*180/Math.PI) < 1e-9, +s.lean.toFixed(2));
  chk('H='+H+': выше — положе', H < 60 ? s.lean > 30 : true, +s.lean.toFixed(1));
}

console.log('=== имя и предупреждения ===');
{
  chk('оба конца в имени', /100×100 → 120×60/.test(activeShapeLabel(setp({}))), activeShapeLabel());
  const w1 = collectPrintWarnings(setp({mntTrH:12}));
  chk('крутая стенка названа', w1.some(x=>/от вертикали/.test(x)), w1);
  // v25.33.0: жалоба на 0.8 мм была неправдой — это ровно два прохода сопла 0.4. Проверяем
  // не текст про «тонко», а то, что пол стенки считается от СОПЛА и называет оба числа.
  const w2 = collectPrintWarnings(setp({mntTrWall:0.8}));
  chk('два прохода сопла 0.4 — не повод жаловаться', !w2.some(x=>/прохода сопла/.test(x)), w2);
  const w2a = collectPrintWarnings(setp({mntTrWall:0.5}));
  chk('поднятая стенка названа обоими числами',
      w2a.some(x=>/стенка переходника поднята с 0\.50 до 0\.80 мм соплом 0\.4/.test(x)), w2a);
  const w2b = collectPrintWarnings(setp({mntTrWall:0.8, printNozzle:0.6}));
  chk('пол стенки идёт за соплом, а не за числом 0.8',
      w2b.some(x=>/стенка переходника поднята с 0\.80 до 1\.20 мм соплом 0\.6/.test(x)), w2b);
  chk('и подняли её именно до двух проходов', transitionSpec(setp({mntTrWall:0.8, printNozzle:0.6})).w === 1.2);
  const w3 = collectPrintWarnings(setp({mntTrH:150}));
  chk('пологий переходник — молча', !w3.some(x=>/вертикали|сопла/.test(x)), w3);
  chk('скругление зажато половиной стороны', transitionSpec(setp({mntTrAW:40, mntTrAD:40, mntTrAR:999})).ar === 20);
  chk('нулевое скругление означает острый угол', transitionSpec(setp({mntTrBR:0})).br === 0);
}

console.log('=== TOTAL: ' + pass + ' passed, ' + fail + ' failed ===');
if(fail) process.exit(1);
