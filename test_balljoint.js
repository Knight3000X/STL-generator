// Шаровой шарнир, печатный в сборе. The ball is not snapped in afterwards — it is printed already inside
// the socket, and it is captive because the mouth is narrower than the ball. Nothing flexes, nothing is
// assembled, and there are no slits weakening the cup.
//
// That makes the claims sharp and physical: the two must NEVER touch (or the print fuses into one lump),
// the gap between them must be the ordered one all the way round (or it binds on one side and rattles on
// the other), and the mouth must be narrower than the ball (or the whole thing falls apart in the hand).
// All three are read off the built mesh. Run via ./run-all.sh.
let pass=0, fail=0;
function chk(n,c,e){if(c){pass++;console.log('  OK  ',n);}else{fail++;console.log('  FAIL',n,e!==undefined?JSON.stringify(e):'');}}
function vol(t){let v=0;for(const T of t){const a=T[0],b=T[1],c=T[2];v+=(a[0]*(b[1]*c[2]-b[2]*c[1])-a[1]*(b[0]*c[2]-b[2]*c[0])+a[2]*(b[0]*c[1]-b[1]*c[0]))/6;}return v;}
function setp(ov){ logos.length=0; boxHoles.length=0; dieFaces.length=0;
  Object.assign(paramState.box, defaultBoxParams(), {gfBaseplate:false, pipMode:'ball',
    ballD:16, ballGap:0.35, ballWall:2.4, ballMouth:125, ballStemD:0, ballStem:0,
    ballBaseR:0, ballBaseT:3}, ov);
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
// Möller triangle-triangle overlap + an AABB pre-filter — contact is a printed weld, so zero is the bar.
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
function crossings(a,b){ const B=b.map(bb); let n=0;
  for(const A of a){ const x=bb(A);
    for(let t=0;t<b.length;t++){ const y=B[t];
      if(x.hi[0]<y.lo[0]||y.hi[0]<x.lo[0]||x.hi[1]<y.lo[1]||y.hi[1]<x.lo[1]||x.hi[2]<y.lo[2]||y.hi[2]<x.lo[2]) continue;
      if(overlap(A,b[t])) n++; } }
  return n; }
// The three shells, told apart by how far they reach from the axis: the ball is the narrowest.
function parts(t){
  const cs = meshComponents(t).map(c => { let r=0, lo=1e9, hi=-1e9;
    for(const T of c) for(const v of T){ r=Math.max(r, Math.hypot(v[0],v[2])); lo=Math.min(lo,v[1]); hi=Math.max(hi,v[1]); }
    return {tris:c, r, lo, hi}; });
  cs.sort((a,b)=>a.r-b.r);
  return {ball:cs[0], rest:cs.slice(1)};
}

console.log('=== builds across the range, and as three separate closed shells ===');
for(const D of [8,16,40]) for(const m of [110,125,145]){
  const t = mk({ballD:D, ballMouth:m}), mc = manifoldCheck(t,4);
  chk('Ø'+D+' устье '+m+'°: замкнут', mc.watertight && vol(t)>0, {open:mc.openEdges, bad:mc.badEdges});
}
for(const ov of [{ballGap:0.15}, {ballGap:1.2}, {ballWall:1.2}, {ballWall:10},
                 {ballStemD:3}, {ballStemD:20}, {ballStem:60}, {ballBaseR:40}, {ballBaseT:15},
                 {ballD:6}, {ballMouth:100}, {ballMouth:160}]){
  const t = mk(ov), mc = manifoldCheck(t,4);
  chk('крайние параметры '+JSON.stringify(ov), mc.watertight && vol(t)>0, {open:mc.openEdges, bad:mc.badEdges});
}
{ const t = mk({});
  const cs = meshComponents(t);
  chk('шар, чашка и основание — три оболочки', cs.length === 3, {n:cs.length});
  chk('и каждая замкнута сама по себе', cs.every(c=>manifoldCheck(c,4).watertight), {});
}

console.log('=== the ball and the socket NEVER touch — that is the whole print ===');
{ const t = mk({}), P = parts(t);
  const cup = P.rest.reduce((a,b)=>a.concat(b.tris), []);
  chk('ноль пересечений треугольник-против-треугольника', crossings(P.ball.tris, cup) === 0,
      {crossings:crossings(P.ball.tris, cup)});
  // ...and they are not merely non-crossing but properly spaced. A ray through the centre meets the cup
  // wall, then air, then the ball, then air, then the cup wall: three runs, and both gaps are the print gap.
  const yC = P.ball.lo + 8;                      // sphere's bottom pole + R
  const runs = solidRuns(t, 0, yC, 0.11);
  chk('луч сквозь центр встречает стенку, шар и стенку', runs.length === 3, {runs:runs.length});
  if(runs.length === 3){
    const g1 = runs[1][0]-runs[0][1], g2 = runs[2][0]-runs[1][1];
    chk('зазор с обеих сторон — заказанный', Math.abs(g1-0.35) < 0.06 && Math.abs(g2-0.35) < 0.06,
        {left:+g1.toFixed(3), right:+g2.toFixed(3)});
    chk('и он одинаков с обеих сторон', Math.abs(g1-g2) < 0.02, {});
  }
}
{ // The gap follows the parameter, and it is the same all the way round the cavity — a gap that closes on
  // one side is a joint that binds there and rattles opposite.
  //
  // It has to be measured RADIALLY. The two spheres are concentric, so the radial gap is constant, but the
  // HORIZONTAL distance between them is sqrt(Ri²−h²) − sqrt(R²−h²), which grows without bound toward the
  // poles: off the equator a correct 0.35 mm gap measures 0.44 and a correct 0.8 measures 1.0. The first
  // draft of this check read the horizontal distance and called the geometry wrong.
  for(const g of [0.2, 0.35, 0.8]){
    const t = mk({ballGap:g}), P = parts(t), yC = P.ball.lo + 8;
    let worst = 0, seen = 0;
    for(let k=0;k<9;k++){ const y = yC - 5 + 10*k/9, h = y - yC;
      const runs = solidRuns(t, 0, y, 0.11);
      if(runs.length !== 3) continue;
      seen++;
      for(const [outer, inner] of [[runs[0][1], runs[1][0]], [runs[2][0], runs[1][1]]]){
        const rCav = Math.hypot(outer, h, 0.11), rBall = Math.hypot(inner, h, 0.11);
        worst = Math.max(worst, Math.abs((rCav - rBall) - g)); }
    }
    chk('зазор '+g+' держится по всей высоте полости', seen >= 5 && worst < 0.05,
        {heights:seen, worst:+worst.toFixed(3)});
  }
}

console.log('=== captive: the mouth is narrower than the ball ===');
{ const s = ballJointSpec(setp({}));
  chk('устье уже шара', s.captive && s.rMouth < 8, {mouth:+s.rMouth.toFixed(2), ball:8});
  // ...and the mesh agrees: at the mouth's height the cup's opening really is that narrow.
  const t = mk({}), P = parts(t), yMouth = P.rest.reduce((a,b)=>Math.max(a,b.hi), -1e9);
  const runs = solidRuns(t, 0, yMouth - 0.4, 0.11);
  const open = runs.length >= 2 ? runs[runs.length-1][0] - runs[0][1] : 0;
  chk('и в меше устье такое же', Math.abs(open/2 - s.rMouth) < 0.35, {open:+(open/2).toFixed(2)});
  chk('шире 100° устье уже не держит', !ballJointSpec(setp({ballMouth:100})).captive, {});
  chk('и это попадает в предупреждения',
      collectPrintWarnings(setp({ballMouth:100})).some(x=>/выпадет/.test(x)), {});
  chk('а нормальный шарнир ни о чём не предупреждает', collectPrintWarnings(setp({})).length === 0,
      collectPrintWarnings(setp({})));
}

console.log('=== the swing is what the mouth leaves once the stem is through it ===');
{ const wide = ballJointSpec(setp({ballMouth:110})), narrow = ballJointSpec(setp({ballMouth:145}));
  chk('шире устье — больше качание', wide.swing > narrow.swing + 20,
      {'110°':+wide.swing.toFixed(0), '145°':+narrow.swing.toFixed(0)});
  const thin = ballJointSpec(setp({ballStemD:3})), thick = ballJointSpec(setp({ballStemD:14}));
  chk('тоньше ножка — больше качание', thin.swing > thick.swing + 10,
      {thin:+thin.swing.toFixed(0), thick:+thick.swing.toFixed(0)});
  chk('и заклиненный шарнир отмечается', collectPrintWarnings(setp({ballMouth:158})).some(x=>/качание/.test(x)), {});
  chk('слишком тесный зазор — тоже', collectPrintWarnings(setp({ballGap:0.15})).some(x=>/спечься/.test(x)), {});
}

console.log('=== the ball is a ball, and the stem comes out of the mouth ===');
{ const t = mk({}), P = parts(t);
  chk('шар — заказанного Ø', Math.abs(2*P.ball.r - 16) < 0.25, {d:+(2*P.ball.r).toFixed(2)});
  // The stem leaves through the mouth, so the ball's component reaches ABOVE the cup's rim.
  const rim = P.rest.reduce((a,b)=>Math.max(a,b.hi), -1e9);
  chk('ножка выходит наружу через устье', P.ball.hi > rim + 1, {stem:+P.ball.hi.toFixed(1), rim:+rim.toFixed(1)});
  const longer = parts(mk({ballStem:40}));
  chk('и её длина — параметр', longer.ball.hi > P.ball.hi + 25, {});
  // The stem Ø is clamped to 1.4·R — a stem wider than that leaves no ball to grip — so the expectation
  // comes from the builder's own spec rather than from what was typed in.
  const want = ballJointSpec(setp({ballStemD:12})).ds;
  const fat = parts(mk({ballStemD:12}));
  let rs = 0; for(const T of fat.ball.tris) for(const v of T) if(v[1] > fat.ball.hi - 2) rs = Math.max(rs, Math.hypot(v[0],v[2]));
  chk('Ø ножки — тоже параметр (с ограничением 1.4·R)', Math.abs(2*rs - want) < 0.4,
      {d:+(2*rs).toFixed(2), want:+want.toFixed(2)});
  chk('и 12 мм на шаре Ø16 действительно урезаются', want < 12, {want:+want.toFixed(2)});
}

console.log('=== no triangle is inside-out ===');
for(const [nm,ov] of [['шарнир',{}], ['широкое устье',{ballMouth:110}], ['узкое устье',{ballMouth:150}],
                      ['толстая чашка',{ballWall:6}], ['длинная ножка',{ballStem:40}]]){
  const t = mk(ov), B = computeBBox(t);
  let worst = 0, at = null;
  for(let k=1;k<14;k++){ const y = B.minY + (B.maxY-B.minY)*(k+0.37)/14;
    for(const z of [0.31, -0.44, 0.83]){ const d = minDepth(t, 0, y, z);
      if(d < worst){ worst = d; at = [+y.toFixed(2), z]; } } }
  chk(nm+': глубина по лучу нигде не уходит в минус', worst===0, {depth:worst, at});
}

/* ЦЕПОЧКА НА ШАРОВЫХ ЗАМКАХ. Замок тот же, что у одиночного шарнира, и проверять его заново незачем —
   проверяется то, что добавляет цепочка:

     1. ЗВЕНЬЯ ОСТАЮТСЯ ОТДЕЛЬНЫМИ ТЕЛАМИ. Ради этого всё и печатается в сборе: слипшиеся звенья дают
        не цепочку, а один кусок, и увидеть это по герметичности нельзя — сетка остаётся замкнутой.
     2. ШАГ НЕ КОРОЧЕ МИНИМАЛЬНОГО. Короче — и шар следующего звена оказывается внутри тела
        предыдущего. Заказанный короткий подтягивается и ОБЪЯВЛЯЕТСЯ.
     3. СУЖЕНИЕ ТЯНЕТ ТОЛЬКО ТЕЛО. Сузь замок вместе с телом — соседние звенья перестанут подходить.
     4. ДЛИНА, КОТОРУЮ ПРИЛОЖЕНИЕ НАЗЫВАЕТ, — ТА САМАЯ. Первая версия складывала слагаемые на глаз и
        врала на пятнадцать миллиметров из ста восьмидесяти. */
console.log('\n=== цепочка на шаровых замках ===');
{
  const P = ov => Object.assign(defaultBoxParams(), {pipMode:'artic'}, ov);
  const A = ov => articSpec(P(ov));
  const B = ov => { logos.length=0; boxHoles.length=0;
    Object.assign(paramState.box, defaultBoxParams(), {pipMode:'artic'}, ov);
    return buildTrisForShape('box', paramState.box); };
  const W = ov => collectPrintWarnings(P(ov)) || [];
  // разбор сетки на связные оболочки по общим вершинам
  const shells = t => {
    const key = q => q.map(c => Math.round(c*1e6)).join(',');
    const par = [...t.keys()], find = i => par[i]===i ? i : (par[i] = find(par[i]));
    const vm = new Map();
    t.forEach((T,i) => T.forEach(v => { const k = key(v);
      if (vm.has(k)){ const a = find(vm.get(k)), b = find(i); if (a!==b) par[a] = b; } else vm.set(k, i); }));
    return new Set(t.map((_,i) => find(i))).size;
  };
  /* Число оборотов вдоль ЛЮБОЙ оси: 1 — материал, 0 — пустота. Ось параметром не для красоты — ниже
     точка считается внутренней только если ДВА разных луча согласны. Луч, прошедший по касательной к
     стыку двух тел вращения или по шву, даёт лишнее пересечение, и один такой щуп из четырёхсот
     пятидесяти уже выдал «пересечение», которого нет. Два луча в разные стороны на этом расходятся. */
  const windAx = (t, P0, ax) => { const u=(ax+1)%3, v=(ax+2)%3; let w=0;
    for(const T of t){ const a=T[0], b=T[1], c=T[2];
      const d1=(b[u]-a[u])*(P0[v]-a[v])-(b[v]-a[v])*(P0[u]-a[u]);
      const d2=(c[u]-b[u])*(P0[v]-b[v])-(c[v]-b[v])*(P0[u]-b[u]);
      const d3=(a[u]-c[u])*(P0[v]-c[v])-(a[v]-c[v])*(P0[u]-c[u]);
      if(!((d1>=0&&d2>=0&&d3>=0)||(d1<=0&&d2<=0&&d3<=0))) continue;
      const A2=(b[u]-a[u])*(c[v]-a[v])-(b[v]-a[v])*(c[u]-a[u]); if(Math.abs(A2)<1e-12) continue;
      const w1=((b[u]-P0[u])*(c[v]-P0[v])-(b[v]-P0[v])*(c[u]-P0[u]))/A2;
      const w2=((c[u]-P0[u])*(a[v]-P0[v])-(c[v]-P0[v])*(a[u]-P0[u]))/A2;
      const h=w1*a[ax]+w2*b[ax]+(1-w1-w2)*c[ax];
      if(h<=P0[ax]) continue;
      const n=(b[v]-a[v])*(c[u]-a[u])-(b[u]-a[u])*(c[v]-a[v]);
      w += n>0 ? 1 : -1; }
    return w; };
  const wind = (t,x,y,z) => windAx(t, [x,y,z], 1);
  const insideBoth = (t, P0) => windAx(t, P0, 1) !== 0 && windAx(t, P0, 0) !== 0;
  for(const ov of [{artN:3}, {artN:6}, {ballD:24, artN:4}, {ballD:8, artN:10}, {artTaper:60, artN:5}]){
    const t = B(ov), mc = manifoldCheck(t, 4);
    chk('цепочка '+JSON.stringify(ov)+' герметична (+объём)', mc.watertight && vol(t) > 0,
        {open:mc.openEdges, bad:mc.badEdges});
    /* ТРИ ОБОЛОЧКИ НА ЗВЕНО, а не одна. Звено собрано так же, как всё в этом приложении: чашка, шар
       со стержнем и тело — три ЗАМКНУТЫХ тела, которые пересекаются объёмом и ничего друг у друга не
       вычитают. Я поначалу потребовал по одной на звено и получил девять вместо трёх — ошибка была в
       ожидании, а не в детали. Число всё равно стоит утверждать: если тело случайно сварится с
       чашкой общей вершиной, оболочек станет меньше, а сетка останется герметичной. */
    chk('  и распадается ровно на '+(3*A(ov).N)+' тел — по три на звено', shells(t) === 3*A(ov).N,
        {оболочек:shells(t), ждём:3*A(ov).N});
  }
  {
    const ov = {artN:4}, t = B(ov), a = A(ov), b = computeBBox(t);
    chk('длина, которую называет приложение, — это габарит',
        Math.abs((b.maxY - b.minY) - a.len) < 0.05, {названо:+a.len.toFixed(2), габарит:+(b.maxY-b.minY).toFixed(2)});
    chk('и она названа в предупреждениях', W(ov).some(x => new RegExp('длина '+Math.round(a.len)).test(x)), W(ov));
    /* ЗАЗОР МЕЖДУ ШАРОМ И ЧАШКОЙ — НАСТОЯЩАЯ ПУСТОТА. Между поверхностью шара (R) и стенкой
       полости (Ri) обязана быть пустота: там и там материал означал бы слипшиеся звенья. */
    const j = a.j, yc = b.minY + j.R + a.pitch;       // центр первой чашки в мировых координатах
    /* УГОЛ ЩУПА БЕРЁТСЯ СТРОГО ВНУТРИ ПОЛОСТИ. Полость идёт от φ₀ до φm, считая от нижнего полюса,
       то есть от оси +Y — от (π−φm) до (π−φ₀). Первые щупы я поставил веером от нуля, один попал
       ниже устья, где материал и должен быть, и проверка «нашла» несуществующую беду. */
    const fLo = Math.PI - j.phiM, fHi = Math.PI - j.phi0;
    let solid = 0, tries = 0;
    for(let i = 1; i <= 6; i++){
      const f = fLo + (fHi - fLo)*i/7, rr = (j.R + j.Ri)/2;
      const x = rr*Math.sin(f), y = yc - rr*Math.cos(f);
      tries++; if (wind(t, x, y, 0) !== 0) solid++;
    }
    chk('в зазоре между шаром и чашкой — пустота, а не материал', solid === 0, {материала:solid, източек:tries});
    /* И ГЛАВНОЕ, РАДИ ЧЕГО ПЕЧАТАЮТ В СБОРЕ: соседние звенья не пересекаются объёмом. Слипшиеся дают
       не цепочку, а один кусок, и сетка при этом остаётся герметичной — увидеть это можно только
       спросив, нет ли точек одного звена ВНУТРИ другого. */
    /* ЗВЕНЬЯ СВАРИВАЮТСЯ ПЕРЕД ЗАМЕРОМ. `articSegTris` отдаёт три тела как есть, и одно из них —
       шар со стержнем — до сварки имеет тридцать три непарных ребра: это нормально для здешнего
       конвейера, который сваривает на выходе. Но по НЕЗАМКНУТОЙ оболочке число оборотов недостоверно,
       и первый прогон насчитал 189 «пересечений» из ниоткуда. Считать надо то же, что печатается. */
    const s0 = snapWeldTris(articSegTris(a, 0));
    const s1 = snapWeldTris(articSegTris(a, 1)).map(T => T.map(v => [v[0], v[1] + a.pitch, v[2]]));
    /* ЩУП — ЦЕНТР ТРЕУГОЛЬНИКА, А НЕ ЕГО ВЕРШИНА. У тел вращения вершины лежат ровно на шве z = 0, и
       луч, пущенный оттуда, задевает общие рёбра дважды: число оборотов выходило −4 и 3 там, где у
       замкнутой оболочки бывает только 0 и ±1. Проверка «нашла» 188 пересечений, которых нет. */
    const mid = T => [(T[0][0]+T[1][0]+T[2][0])/3, (T[0][1]+T[1][1]+T[2][1])/3, (T[0][2]+T[1][2]+T[2][2])/3];
    let cross = 0, checked = 0, worst = null;
    for(let i = 0; i < s1.length; i += 37){ const v = mid(s1[i]);
      if (Math.abs(v[2]) < 1e-6) continue;
      checked++;
      if (insideBoth(s0, v)){ cross++; if(!worst) worst = {точка:v.map(q=>+q.toFixed(2)), где:'звено 1 внутри звена 0'}; } }
    for(let i = 0; i < s0.length; i += 37){ const v = mid(s0[i]);
      if (Math.abs(v[2]) < 1e-6) continue;
      checked++;
      if (insideBoth(s1, v)){ cross++; if(!worst) worst = {точка:v.map(q=>+q.toFixed(2)), где:'звено 0 внутри звена 1'}; } }
    chk('соседние звенья не пересекаются объёмом', cross === 0, {внутри:cross, проверено:checked, где:worst});
  }
  {
    /* НИЖНИЙ УГОЛ ТЕЛА ОБЯЗАН БЫТЬ ВНЕ ПОЛОСЫ ЧАШКИ, и это условие делает заявленный угол складывания
       правдой. Чашка — сферическая оболочка вокруг центра шара, её материал лежит между Ri и
       Ri+стенка; точка звена, вращающегося вокруг того же центра, радиуса не меняет. Попал угол тела
       в полосу — он упрётся в кромку устья, и упрётся раньше стержня. У первой версии тело начиналось
       на 0.75·R, его угол выходил на 48° при устье в 55°, и цепочка складывалась на семь градусов
       вместо заявленных тридцати двух: число печаталось в предупреждении, а проверить его было
       нечем. */
    for(const ov of [{}, {ballD:12}, {ballD:32}, {artBodyR:12}, {artBodyR:3}]){
      const a2 = A(ov), j2 = a2.j;
      const rB = Math.max(j2.ds/2 + 0.6, a2.bodyR);
      const d = Math.hypot(rB, a2.yBody0);
      chk('тело '+JSON.stringify(ov)+' начинается вне полосы чашки', d > j2.Ri + j2.wall - 1e-9,
          {расстояние:+d.toFixed(2), полоса:+(j2.Ri + j2.wall).toFixed(2)});
    }
  }
  console.log('\n=== цепочка: шаг и сужение ===');
  chk('шаг по умолчанию не меньше минимального', A({}).pitch >= A({}).pitchMin - 1e-9,
      {шаг:+A({}).pitch.toFixed(2), минимум:+A({}).pitchMin.toFixed(2)});
  chk('заказанный короткий шаг подтягивается', A({artPitch:1}).pitch === A({artPitch:1}).pitchMin);
  chk('  и об этом сказано', W({artPitch:1}).some(x => /короче минимального/.test(x)), W({artPitch:1}));
  chk('а достаточный — берётся как есть', Math.abs(A({artPitch:40}).pitch - 40) < 1e-9);
  chk('  и о нём молчат', !W({artPitch:40}).some(x => /короче минимального/.test(x)));
  /* МИНИМУМ ЕДЕТ ЗА ШАРОМ: жёстко вписанное число сошлось бы при одном размере и разошлось при любом
     другом, а деталь при этом строилась бы и выглядела правильно. */
  chk('минимальный шаг растёт вместе с шаром', A({ballD:32}).pitchMin > A({ballD:12}).pitchMin*2,
      {крупный:+A({ballD:32}).pitchMin.toFixed(1), мелкий:+A({ballD:12}).pitchMin.toFixed(1)});
  /* СУЖЕНИЕ ТЯНЕТ ТОЛЬКО ТЕЛО. Замок обязан остаться прежним — иначе соседние звенья не подойдут. */
  chk('сужение уменьшает объём', vol(B({artTaper:60, artN:5})) < vol(B({artTaper:0, artN:5})));
  chk('но не трогает замок: шаг, шар и угол те же',
      A({artTaper:60}).pitch === A({}).pitch && A({artTaper:60}).j.R === A({}).j.R &&
      A({artTaper:60}).j.swing === A({}).j.swing);
  chk('и длина от сужения не меняется', Math.abs(A({artTaper:60, artN:5}).len - A({artTaper:0, artN:5}).len) < 1e-9);
  chk('незахваченный шар назван вслух',
      W({ballMouth:100}).some(x => /не захватятся/.test(x)) || A({ballMouth:100}).j.captive,
      {захват:A({ballMouth:100}).j.captive, слова:W({ballMouth:100})});
  chk('и на умолчаниях ни одной жалобы',
      !W({}).some(x => /не захватятся|короче минимального|почти прямой/.test(x)), W({}));
}
console.log('\n=== TOTAL:', pass, 'passed,', fail, 'failed ===');
if(fail) process.exitCode = 1;
