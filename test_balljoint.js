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

  /* ================================================================================================
     ТРЕТЬЯ РУКА: КОНЦЫ ЦЕПОЧКИ (v24.17.0). Прислан снимок покупной «третьей руки» — плита с гибкими
     рукавами и «крокодилами». Рукав у нас уже был; не было двух его КОНЦОВ.

     Что здесь может сломаться молча, и потому проверяется:

       1. КОНЕЦ ОБЯЗАН ЗАМЕНЯТЬ, А НЕ ПРИСТАВЛЯТЬСЯ. Внизу шар не лежит ни в какой чашке, наверху
          чашка пуста — оба бесполезны, и хвостовик с держателем встают ВМЕСТО них. Приставь я концы
          к целым звеньям, рука выросла бы на диаметр шара и на всю чашку, а на картинке разницы
          почти не видно. Проверяется числом тел и тем, что ОСТАЛЬНАЯ рука не шелохнулась.

       2. ПАЗ ДЕРЖАТЕЛЯ — НАСТОЯЩАЯ ПУСТОТА, ОГРАНИЧЕННАЯ С ПЯТИ СТОРОН. Резать в этом приложении
          нечем, паз собран тремя полосами вдоль оси винта, и ошибиться в нём можно ровно двумя
          способами: полосы разъедутся — паза не будет вовсе, полосы сольются — паз зарастёт. Ни то
          ни другое герметичности не ломает. Поэтому щупается ОБОРОТАМИ, а не глазом: в пазу пусто,
          в щеках, стенках и дне — материал.

       3. ОТВЕРСТИЕ ПОД ВИНТ ПРОХОДИТ ОБЕ ЩЁКИ. Одна просверленная щека — это не крепление.

       4. УМОЛЧАНИЯ НЕ ТРОНУТЫ. Цепочка была змейкой и осталась ею; рукой она становится выбором.
     ================================================================================================ */
  /* ДЕТЕКТОР СОВПАДАЮЩИХ ГРАНЕЙ — тот же, что у струбцины, и здесь он нужен по той же причине:
     держатель садится на тело звена СВЕРХУ, и если не утопить его подошву, она ляжет ровно на торец
     тела. Герметичность такого не видит вовсе — рёбра не общие, вершины не общие, — а печатается это
     двумя телами, встретившимися гранями, вместо одного сросшегося. Мутация «держатель не утоплен»
     ловилась одной лишь длиной, и это было везением, а не проверкой. */
function coplanarPairs(tris){
  const key = T => { const n = cross(sub(T[1],T[0]), sub(T[2],T[0])), L = vlength(n);
    if (L < 1e-12) return null;
    let u = [n[0]/L, n[1]/L, n[2]/L];
    if (u[0] < -1e-9 || (Math.abs(u[0]) < 1e-9 && (u[1] < -1e-9 || (Math.abs(u[1]) < 1e-9 && u[2] < 0))))
      u = [-u[0], -u[1], -u[2]];
    const d = u[0]*T[0][0] + u[1]*T[0][1] + u[2]*T[0][2];
    return u.map(q => Math.round(q*1e4)/1e4).join(',') + '|' + Math.round(d*1e3)/1e3; };
  const by = new Map();
  tris.forEach((T, i) => { const k = key(T); if (!k) return;
    if (!by.has(k)) by.set(k, []); by.get(k).push(i); });
  let hits = 0, where = null;
  for (const [k, list] of by){
    if (list.length < 2) continue;
    const u = k.split('|')[0].split(',').map(Number);
    const ax = Math.abs(u[0]) < 0.9 ? [1,0,0] : [0,1,0];
    const e1 = cross(u, ax), L1 = vlength(e1), E1 = e1.map(q => q/L1), E2 = cross(u, E1);
    const P = T => T.map(v => [v[0]*E1[0]+v[1]*E1[1]+v[2]*E1[2], v[0]*E2[0]+v[1]*E2[1]+v[2]*E2[2]]);
    const polys = list.map(i => P(tris[i]));
    const side = (q,a,b) => (b[0]-a[0])*(q[1]-a[1]) - (b[1]-a[1])*(q[0]-a[0]);
    const inside = (q,T) => { const d1=side(q,T[0],T[1]), d2=side(q,T[1],T[2]), d3=side(q,T[2],T[0]);
      return (d1>1e-9&&d2>1e-9&&d3>1e-9) || (d1<-1e-9&&d2<-1e-9&&d3<-1e-9); };
    /* НАЛОЖЕНИЕ ПРОВЕРЯЕТСЯ ВЕРШИНАМИ И ПЕРЕСЕЧЕНИЕМ РЁБЕР, а не одной серединной точкой. Середина —
       заманчиво дёшево и неверно: два треугольника могут накладываться УЗКОЙ ПОЛОСОЙ, в которую не
       попадает ни центр того, ни центр другого. Ровно так и вышло: скоба, приставленная к краю губки
       вплотную, давала совпадающие грани полосой в восемь десятых миллиметра — а детектор молчал, и
       мутация прошла насквозь. Вершина внутри чужого треугольника ИЛИ скрещение рёбер покрывают все
       случаи наложения площадей. */
    const segX = (p1,p2,p3,p4) => {
      const d1 = side(p3,p1,p2), d2 = side(p4,p1,p2), d3 = side(p1,p3,p4), d4 = side(p2,p3,p4);
      return ((d1 > 1e-9 && d2 < -1e-9) || (d1 < -1e-9 && d2 > 1e-9)) &&
             ((d3 > 1e-9 && d4 < -1e-9) || (d3 < -1e-9 && d4 > 1e-9)); };
    const over = (A, B) => {
      for (const q of A) if (inside(q, B)) return true;
      for (const q of B) if (inside(q, A)) return true;
      for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++)
        if (segX(A[i], A[(i+1)%3], B[j], B[(j+1)%3])) return true;
      return false; };
    for (let a = 0; a < polys.length; a++) for (let b = a+1; b < polys.length; b++)
      if (over(polys[a], polys[b])){ hits++; if (!where) where = {plane:k, a:list[a], b:list[b]}; }
  }
  return { hits, where };
}

  console.log('=== третья рука: концы цепочки ===');
  const E = ov => A(ov).e;
  const ARM = {artEndA:'post', artEndB:'clip'};
  for (const ov of [ARM, Object.assign({artN:3}, ARM), Object.assign({ballD:24, artClipW:9, artClipT:1.6}, ARM),
                    Object.assign({ballD:8, artN:12, artClipHole:0}, ARM), {artEndA:'post'}, {artEndB:'clip'}]){
    const t = B(ov), mc = manifoldCheck(t, 4);
    chk('рука '+JSON.stringify(ov)+' герметична', mc.watertight && vol(t) > 0,
        {open:mc.openEdges, bad:mc.badEdges});
  }
  /* ЧИСЛО ТЕЛ. У средних звеньев по три — чашка, шар и тело. Хвостовик встаёт ВМЕСТО шара, поэтому
     нижнее звено остаётся тройкой. Держатель встаёт вместо чашки, но сам он из трёх полос, поэтому
     верхнее звено даёт пять. Итого 3N при свободном верхе и 3N+2 при держателе — и это число, а не
     присказка: сварись полоса держателя с телом звена, тел станет меньше, а сетка останется
     герметичной и на вид целой. */
  for (const ov of [ARM, Object.assign({artN:3}, ARM), {artEndA:'post'}]){
    const n = A(ov).N, want = A(ov).e.endB === 'clip' ? 3*n + 2 : 3*n;
    chk('  '+JSON.stringify(ov)+': тел ровно '+want, shells(B(ov)) === want, {тел:shells(B(ov)), ждём:want});
  }
  /* ДЛИНА С КОНЦАМИ — ТА САМАЯ. У концов своя арифметика, и соврать в ней легче, чем в цепочке:
     первая запись прибавила высоту держателя к вершине ЧАШКИ, которой там уже нет, и промахнулась
     на четыре с лишним миллиметра. */
  for (const ov of [ARM, {artEndA:'post'}, {artEndB:'clip'}, Object.assign({artPostLen:60, artClipDepth:20}, ARM)]){
    const b = computeBBox(B(ov));
    chk('длина руки '+JSON.stringify(ov)+' — это габарит',
        Math.abs((b.maxY - b.minY) - A(ov).len) < 0.05,
        {названо:+A(ov).len.toFixed(2), габарит:+(b.maxY-b.minY).toFixed(2)});
  }
  /* КОНЕЦ ТРОГАЕТ ТОЛЬКО КОНЕЦ. Самая сильная здесь проверка и самая дешёвая: цепочка со свободными
     концами и рука обязаны совпадать ВЕРШИНА В ВЕРШИНУ везде, кроме своих концов. Разъедься хоть
     шаг, хоть тело звена — совпадение рассыплется целиком. */
  {
    const norm = (t, by) => { const b = computeBBox(t), dy = by === 'min' ? -b.minY : -b.maxY;
      return t.map(T => T.map(v => [v[0], v[1] + dy, v[2]])); };
    const key = t => t.map(T => T.map(v => v.map(x => Math.round(x*1e4)).join(',')).join('|')).sort().join(';');
    const cut = (t, lo, hi) => t.filter(T => T.every(v => v[1] > lo && v[1] < hi));
    const a0 = A({}), body = (a0.N - 1)*a0.pitch;
    // низ: держатель наверху не должен был тронуть ничего ниже последнего звена
    const lo1 = cut(norm(B({}), 'min'), -1e9, body - 2), lo2 = cut(norm(B({artEndB:'clip'}), 'min'), -1e9, body - 2);
    chk('держатель не тронул низ руки', lo1.length > 1000 && key(lo1) === key(lo2),
        {без:lo1.length, с:lo2.length});
    // верх: хвостовик внизу не должен был тронуть ничего выше первого звена
    const top = -(a0.N - 1)*a0.pitch + 2;   // всё, что выше первого звена, считая от вершины
    const hi1 = cut(norm(B({}), 'max'), top, 1e9), hi2 = cut(norm(B({artEndA:'post'}), 'max'), top, 1e9);
    chk('хвостовик не тронул верх руки', hi1.length > 1000 && key(hi1) === key(hi2),
        {без:hi1.length, с:hi2.length});
  }
  /* ХВОСТОВИК ТОНЬШЕ ТЕЛА, И УСТУП — НАСТОЯЩИЙ. Уступ и есть упор глубины посадки: без него рука
     проваливается в гнездо до дна. Меряется по сетке, а не по спецификации. */
  /* МЕРИТЬ ХВОСТОВИК ПО ВЕРШИНАМ НЕЛЬЗЯ, и это стоило трёх ложных провалов: у цилиндра вершины есть
     только на торцах, и «максимальный радиус в полосе высот» на его середине выдаёт ноль. Спрашивать
     надо ОБОРОТАМИ — есть ли материал на таком-то радиусе, — и спрашивать с ДВУХ сторон: внутри
     заказанного Ø материал обязан быть, снаружи — обязан отсутствовать. Одна сторона доказала бы
     только, что деталь не пуста. */
  /* ЗАКАЗАННЫЙ Ø ХВОСТОВИКА ПРОВЕРЯЕТСЯ ОТДЕЛЬНО, потому что строки панели до него не добираются:
     `artPostD` показывается только при выбранном хвостовике, а перебор строк такой связки не строит —
     мутация «хвостовик игнорирует заказанный Ø» прошла весь test_paramrows.js насквозь. Ручка,
     которую никто не дёргает, — это ручка, которой нет. */
  for (const ov of [{artEndA:'post'}, {artEndA:'post', artPostD:6}, {artEndA:'post', artPostD:14}]){
    const t = B(ov), b = computeBBox(t), a = A(ov), e = a.e;
    const yMid = b.minY + e.postLen*0.5, rP = e.postD/2;
    const tag = ' ' + JSON.stringify(ov);
    chk('хвостовик по сетке: внутри заказанного Ø материал есть'+tag,
        insideBoth(t, [rP - 0.3, yMid, 0]), {r:+(rP - 0.3).toFixed(2), y:+yMid.toFixed(2)});
    chk('  а снаружи его нет — Ø тот самый'+tag, !insideBoth(t, [rP + 0.3, yMid, 0]),
        {r:+(rP + 0.3).toFixed(2)});
    if (ov.artPostD)
      chk('  и это ровно заказанный Ø, а не «авто»'+tag, Math.abs(e.postD - ov.artPostD) < 1e-9,
          {спецификация:+e.postD.toFixed(2), заказан:ov.artPostD});
    /* И ВСТРЕЧНАЯ: шара внизу БОЛЬШЕ НЕТ. Приставь я хвостовик к шару — на радиусе шара здесь стоял
       бы материал, и первые две проверки прошли бы как ни в чём не бывало. */
    if (rP < a.j.R - 0.6)
      chk('  шара внизу нет — хвостовик его заменил'+tag, !insideBoth(t, [a.j.R - 0.3, yMid, 0]),
          {шар:+a.j.R.toFixed(2)});
    /* УСТУП: выше хвостовика тело звена ШИРЕ его, и ровно этим рука упирается в плиту. */
    const yBody = b.minY + e.postLen + a.yBody0 + 2;
    /* ЗАХОДНАЯ ФАСКА. Без неё хвостовик не находит гнездо: острая кромка упирается в край и рука
       ставится «в притирку», а не вставляется. Проверяется тем, что у самого торца материал у́же, чем
       на самом хвостовике, — и на столько, на сколько фаска снята. */
    chk('  заходная фаска снята: у торца хвостовик уже'+tag,
        !insideBoth(t, [rP - 0.3, b.minY + 0.2, 0]) && insideBoth(t, [rP - e.postCh - 0.1, b.minY + 0.2, 0]),
        {фаска:+e.postCh.toFixed(2), r:+(rP - 0.3).toFixed(2)});
    if (e.shoulder > 0.6)
      chk('  уступ настоящий: тело звена шире хвостовика'+tag,
          insideBoth(t, [rP + 0.3, yBody, 0]), {r:+(rP + 0.3).toFixed(2), y:+yBody.toFixed(2)});
  }
  /* И ДЛИНА ПОСАДКИ — тоже ручка, и тоже своя. */
  {
    const hs = [8, 18, 50].map(L => { const b = computeBBox(B({artEndA:'post', artPostLen:L})); return b.maxY - b.minY; });
    chk('длина хвостовика следует за ручкой миллиметр в миллиметр',
        Math.abs((hs[1] - hs[0]) - 10) < 0.05 && Math.abs((hs[2] - hs[1]) - 32) < 0.05,
        hs.map(v => +v.toFixed(2)));
  }
  /* ПАЗ ДЕРЖАТЕЛЯ. Ось винта — Z, паз открыт вверх по +Y, ширина хвоста идёт по X. */
  for (const ov of [ARM, Object.assign({ballD:24, artClipW:9, artClipT:1.6, artClipDepth:14}, ARM)]){
    const t = B(ov), b = computeBBox(t), e = E(ov), tag = ' ' + JSON.stringify(ov);
    const yT = b.maxY, pw = e.slotW/2, ht = e.slotT/2, zc = ht + e.cheek*0.5;
    const yPocket = yT - e.clipDepth*0.5, yHole = yT - e.hZ + e.holeZ, yFloor = yT - e.hZ + e.floor*0.5;
    chk('паз пуст'+tag, !insideBoth(t, [0, yPocket, 0]), {y:+yPocket.toFixed(2)});
    chk('  и у самого устья тоже'+tag, !insideBoth(t, [0, yT - 1.0, 0]));
    chk('  щека +Z на месте'+tag, insideBoth(t, [0, yT - 1.0,  zc]), {z:+zc.toFixed(2)});
    chk('  щека −Z на месте'+tag, insideBoth(t, [0, yT - 1.0, -zc]));
    chk('  стенка +X на месте'+tag, insideBoth(t, [pw + e.cheek*0.5, yPocket, 0]));
    chk('  стенка −X на месте'+tag, insideBoth(t, [-(pw + e.cheek*0.5), yPocket, 0]));
    chk('  дно паза на месте'+tag, insideBoth(t, [0, yFloor, 0]), {y:+yFloor.toFixed(2)});
    /* ВИНТ ПРОХОДИТ ОБЕ ЩЁКИ. Одна просверленная — это не крепление, а видимость. */
    chk('  винт проходит щеку +Z'+tag, !insideBoth(t, [0, yHole,  zc]), {y:+yHole.toFixed(2)});
    chk('  и щеку −Z'+tag, !insideBoth(t, [0, yHole, -zc]));
    /* ...и рядом с ним щека ЕСТЬ — иначе «отверстие» означало бы просто отсутствующую щеку. */
    chk('  а рядом с винтом щека есть'+tag, insideBoth(t, [e.holeR + 0.6, yHole, zc]),
        {x:+(e.holeR + 0.6).toFixed(2)});
  }
  /* РАЗМЕРЫ ПАЗА МЕРЯЮТСЯ, А НЕ ЧИТАЮТСЯ. Паз обязан быть шире хвоста «крокодила» ровно на печатный
     зазор — тот же, которым живёт весь замок. Забудь я зазор, паз вышел бы точно по хвосту, деталь
     осталась бы герметичной и правдоподобной, а «крокодил» в неё не полез бы. Меряется дихотомией по
     оборотам: от заведомо пустой середины наружу, пока не встретится материал. */
  for (const ov of [ARM, Object.assign({artClipT:2.5, artClipW:12}, ARM)]){
    const t = B(ov), b = computeBBox(t), e = E(ov), tag = ' ' + JSON.stringify(ov);
    /* ВЫСОТА ЩУПА ВЫБРАНА ВЫШЕ ОТВЕРСТИЯ ПОД ВИНТ — и это не мелочь: на высоте винта щека просверлена
       насквозь, и щуп, посланный оттуда, честно доложил бы, что щеки нет вовсе. Первый заход так и
       мерил и выдал сорок миллиметров паза при полутора заказанных. */
    const yP = b.maxY - (e.hZ - (e.holeZ + e.holeR + e.cz1)/2);
    /* И ИДЁТ ОН ШАГОМ, А НЕ ДИХОТОМИЕЙ. Материал здесь стоит ПОЛОСОЙ — щека от `ht` до `ht+cheek`, а
       дальше опять пусто, — и деление пополам, которое ищет одну границу на полупрямой, на полосе
       сходится к её концу и врёт. Шаг наружу до первой встречи, потом уточнение внутри шага. */
    const edge = (ax) => { const q = m => { const r = [0, yP, 0]; r[ax] = m; return r; };
      let hit = -1;
      for (let m = 0.05; m <= 20; m += 0.05) if (insideBoth(t, q(m))){ hit = m; break; }
      if (hit < 0) return 1e9;
      let lo = hit - 0.05, hi = hit;
      for (let i = 0; i < 30; i++){ const m = (lo + hi)/2; if (insideBoth(t, q(m))) hi = m; else lo = m; }
      return (lo + hi)/2; };
    /* СВЕРЯТЬСЯ НАДО С ЗАКАЗОМ, А НЕ С `slotT`. Мутация «зазор паза забыт» прошла первую запись этой
       проверки насквозь именно потому, что та сравнивала измеренный паз с ЕГО ЖЕ вычисленной
       толщиной: убери зазор из формулы — и обе стороны съедут вместе, согласно и молча. Здесь стоят
       толщина хвоста и печатный зазор ЗАМКА — два числа, которых мутация не трогает. */
    const wantT = e.clipT + A(ov).j.gap, wantW = e.clipW + A(ov).j.gap;
    chk('паз по толщине хвоста — ровно с печатным зазором'+tag,
        Math.abs(2*edge(2) - wantT) < 0.06, {измерен:+(2*edge(2)).toFixed(3), 'хвост+зазор':+wantT.toFixed(3)});
    chk('паз по ширине хвоста — тоже'+tag,
        Math.abs(2*edge(0) - wantW) < 0.06, {измерен:+(2*edge(0)).toFixed(3), 'хвост+зазор':+wantW.toFixed(3)});
    /* И ГЛУБИНА: дно паза стоит там, где заказано, а не где придётся. Здесь дихотомия годится — вниз
       от дна материал уже не кончается. */
    let yLo = b.maxY - e.hZ, yHi = b.maxY;
    for (let i = 0; i < 40; i++){ const m = (yLo + yHi)/2;
      if (insideBoth(t, [0, m, 0])) yLo = m; else yHi = m; }
    chk('и глубина посадки — заказанная'+tag,
        Math.abs((b.maxY - (yLo + yHi)/2) - e.clipDepth) < 0.06,
        {измерена:+(b.maxY - (yLo + yHi)/2).toFixed(3), заказана:+e.clipDepth.toFixed(3)});
  }
  /* БЕЗ ВИНТА — СПЛОШНАЯ ЩЕКА. Отверстие заказывается нулём, и тогда его быть не должно вовсе. */
  {
    const ov = Object.assign({artClipHole:0}, ARM), t = B(ov), b = computeBBox(t), e = E(ov);
    const zc = e.slotT/2 + e.cheek*0.5, yMid = b.maxY - e.hZ + e.clipDepth*0.5;
    chk('без винта щека сплошная', insideBoth(t, [0, yMid, zc]) && insideBoth(t, [0, yMid, -zc]), {y:+yMid.toFixed(2)});
  }
  /* ЗАМОК КОНЦАМИ НЕ ТРОНУТ: ход складывания — свойство шара и устья, и концы к нему отношения не
     имеют. Утверждение проверяемое, потому что соблазн вывести ход «на звено» был. */
  /* СОВПАДАЮЩИХ ГРАНЕЙ НЕТ НИ В ОДНОМ НАБОРЕ. Здесь их могло бы быть два источника: подошва
     держателя на торце тела звена и торец хвостовика на его же нижнем срезе. */
  for (const ov of [ARM, {artEndB:'clip'}, {artEndA:'post'},
                    Object.assign({ballD:24, artClipW:9, artClipDepth:14}, ARM), {}]){
    const c = coplanarPairs(B(ov));
    chk('совпадающих граней нет '+JSON.stringify(ov), c.hits === 0, c.where);
  }
  chk('концы не трогают ход складывания',
      Math.abs(A(ARM).j.swing - A({}).j.swing) < 1e-9 && A(ARM).pitch === A({}).pitch,
      {рука:+A(ARM).j.swing.toFixed(3), цепочка:+A({}).j.swing.toFixed(3)});
  /* ЧИСЛА КОНЦОВ НАЗВАНЫ ЧЕЛОВЕКУ — и названо главное: что конец ЗАМЕНЯЕТ, а не добавляет. */
  chk('хвостовик назван, и сказано «вместо шара»',
      W({artEndA:'post'}).some(x => /ХВОСТОВИК/.test(x) && /ВМЕСТО шара/.test(x)), W({artEndA:'post'}));
  chk('держатель назван, и сказано «вместо чашки»',
      W({artEndB:'clip'}).some(x => /ДЕРЖАТЕЛЬ/.test(x) && /ВМЕСТО чашки/.test(x)), W({artEndB:'clip'}));
  chk('и что «крокодил» с винтом покупные',
      W({artEndB:'clip'}).some(x => /ПОКУПНЫЕ/.test(x)), W({artEndB:'clip'}));
  chk('отверстие, не влезающее в щёку, объявлено',
      W(Object.assign({artClipDepth:3, artClipHole:9}, ARM)).some(x => /не помещается в щёку/.test(x)),
      W(Object.assign({artClipDepth:3, artClipHole:9}, ARM)));
  chk('а на разумных числах об этом молчат',
      !W(ARM).some(x => /не помещается в щёку|провалится в гнездо|ТОЛЩЕ тела/.test(x)), W(ARM));
  chk('хвостовик толще тела звена объявлен',
      W({artEndA:'post', artPostD:40}).some(x => /ТОЛЩЕ тела звена/.test(x)), W({artEndA:'post', artPostD:40}));
  /* УМОЛЧАНИЯ. Цепочка осталась цепочкой: концы свободны, тел ровно 3N, и в описании модели — слово
     «цепочка», а не «рука». */
  chk('умолчание — по-прежнему цепочка со свободными концами',
      E({}).endA === 'ball' && E({}).endB === 'cup' && shells(B({})) === 3*A({}).N,
      {низ:E({}).endA, верх:E({}).endB, тел:shells(B({}))});

  /* ================================================================================================
     ОСНОВАНИЕ ТРЕТЬЕЙ РУКИ (v24.18.0) — плита с гнёздами.

     Геометрия здесь простая: одна протяжка с отверстиями-петлями. Сложное — ЧИСЛО, и оно одно:
     опрокидывание. Проверять его надо так, чтобы проверка не повторяла формулу — иначе она докажет
     лишь то, что я дважды написал одно и то же. Поэтому:

       1. РАВНОВЕСИЕ ПИШЕТСЯ В ПРОВЕРКЕ ЗАНОВО, из масс и плеч, и требуется, чтобы выведенная глубина
          стояла ровно на его границе: на миллиметр мельче — плита валится. Бракетинг, а не сверка.
       2. МАССА ПЛИТЫ БЕРЁТСЯ ИЗ СЕТКИ, а не из спецификации: объём × плотность.
       3. ПЛЕЧО — ПО МЕНЬШЕЙ СТОРОНЕ. Рука смотрит куда захочет; плита, устойчивая «по глубине» и
          узкая, валится вбок. Проверяется тем, что плита и её перевёрнутая копия держат поровну.
       4. ГНЕЗДО МЕРЯЕТСЯ В СЕТКЕ и сверяется с ХВОСТОВИКОМ ИЗ ДРУГОЙ ДЕТАЛИ — это единственное, ради
          чего гнездо существует.
     ================================================================================================ */
  console.log('=== третья рука: основание ===');
  const S  = ov => artStandSpec(P(Object.assign({artPart:'stand', artEndA:'post'}, ov)));
  const BS = ov => B(Object.assign({artPart:'stand', artEndA:'post'}, ov));
  const WS = ov => W(Object.assign({artPart:'stand', artEndA:'post'}, ov));
  for (const ov of [{}, {artArms:1}, {artArms:8}, {artStandOut:4}, {artStandT:20},
                    {artN:4, ballD:10}, {artStandD:60}, {artPostD:14}]){
    const t = BS(ov), mc = manifoldCheck(t, 4);
    chk('основание '+JSON.stringify(ov)+' герметично', mc.watertight && vol(t) > 0,
        {open:mc.openEdges, bad:mc.badEdges});
    chk('  и одним телом, без совпадающих граней', shells(t) === 1 && coplanarPairs(t).hits === 0,
        {тел:shells(t), совпад:coplanarPairs(t).hits});
  }
  /* ГАБАРИТ И МАССА — ИЗ СЕТКИ. Масса входит в расчёт опрокидывания, поэтому она обязана быть массой
     НАПЕЧАТАННОГО, а не аккуратно посчитанной по забытым гнёздам. */
  for (const ov of [{}, {artArms:8}, {artStandT:20}]){
    const st = S(ov), t = BS(ov), b = computeBBox(t);
    chk('плита '+JSON.stringify(ov)+': габарит тот, что назван',
        Math.abs((b.maxX-b.minX) - st.W) < 0.05 && Math.abs((b.maxZ-b.minZ) - st.D) < 0.05 &&
        Math.abs((b.maxY-b.minY) - st.t) < 0.05,
        {назван:[+st.W.toFixed(1), +st.D.toFixed(1), +st.t.toFixed(1)],
         габарит:[+(b.maxX-b.minX).toFixed(1), +(b.maxZ-b.minZ).toFixed(1), +(b.maxY-b.minY).toFixed(1)]});
    const gMesh = meshVolume(t)/1000*st.rho;
    chk('  и масса — это масса СЕТКИ, с вычтенными гнёздами',
        Math.abs(gMesh - st.plateG) < 0.5, {сетка:+gMesh.toFixed(2), названо:+st.plateG.toFixed(2)});
  }
  /* ГНЁЗДА: сколько заказано, там, где заказано, и сквозные. */
  for (const ov of [{}, {artArms:1}, {artArms:8}, {artPostD:14}]){
    const st = S(ov), t = BS(ov), tag = ' ' + JSON.stringify(ov);
    let holes = 0;
    for (let k = 0; k < st.n; k++){
      const x = (k - (st.n - 1)/2)*st.pitch;
      if (!insideBoth(t, [x, 0, 0]) && insideBoth(t, [x, 0, st.rS + 1.2])) holes++;
    }
    chk('гнёзд ровно столько, сколько заказано'+tag, holes === st.n, {нашли:holes, заказано:st.n});
    /* СКВОЗНОЕ: пусто на всей толщине, а не ямка сверху. */
    const x0 = -((st.n - 1)/2)*st.pitch;
    chk('  и гнездо сквозное'+tag,
        !insideBoth(t, [x0, -st.t/2 + 0.3, 0]) && !insideBoth(t, [x0, st.t/2 - 0.3, 0]), {t:+st.t.toFixed(1)});
  }
  /* Ø ГНЕЗДА МЕРЯЕТСЯ В СЕТКЕ и сверяется с ХВОСТОВИКОМ ДРУГОЙ ДЕТАЛИ. Сверять его со спецификацией
     основания бессмысленно: обе стороны считает одна формула, и забудь я зазор — они съедут вместе. */
  for (const ov of [{}, {artPostD:14}, {ballD:10, artN:4}]){
    const st = S(ov), t = BS(ov), tag = ' ' + JSON.stringify(ov);
    const x0 = -((st.n - 1)/2)*st.pitch;
    const rSock = (() => { let hit = -1;
      for (let m = 0.05; m <= 40; m += 0.05) if (insideBoth(t, [x0, 0, m])){ hit = m; break; }
      if (hit < 0) return 1e9;
      let lo = hit - 0.05, hi = hit;
      for (let i = 0; i < 30; i++){ const m = (lo + hi)/2; if (insideBoth(t, [x0, 0, m])) hi = m; else lo = m; }
      return (lo + hi)/2; })();
    /* Хвостовик меряется в СВОЕЙ сетке — у руки, а не у основания. */
    const ta = B(Object.assign({artEndA:'post'}, ov)), ba = computeBBox(ta);
    const yMid = ba.minY + st.e.postLen*0.5;
    const rPost = (() => { let hit = -1;
      for (let m = 0.05; m <= 40; m += 0.05) if (insideBoth(ta, [m, yMid, 0])){ hit = m; break; }
      if (hit < 0) return -1e9;
      let lo = hit, hi = hit + 0.05;   // ищем ВНЕШНЮЮ границу: материал есть, дальше нет
      for (let i = 0; i < 200 && insideBoth(ta, [hi, yMid, 0]); i++) hi += 0.05;
      let a2 = hi - 0.05, b2 = hi;
      for (let i = 0; i < 30; i++){ const m = (a2 + b2)/2; if (insideBoth(ta, [m, yMid, 0])) a2 = m; else b2 = m; }
      return (a2 + b2)/2; })();
    chk('гнездо шире хвостовика ровно на печатный зазор'+tag,
        Math.abs(2*(rSock - rPost) - A(ov).j.gap) < 0.08,
        {гнездо:+(2*rSock).toFixed(3), хвостовик:+(2*rPost).toFixed(3), зазор:+A(ov).j.gap.toFixed(3)});
  }
  /* ================= ОПРОКИДЫВАНИЕ: РАВНОВЕСИЕ ПИШЕТСЯ ЗАНОВО ================= */
  {
    /* Момент относительно ближней кромки, из масс и плеч. Плечо — половина МЕНЬШЕЙ стороны: рука
       смотрит куда захочет. Положительный запас — плита стоит. */
    const marg = (st, W_, D_, gPlate) => { const m = Math.min(W_, D_)/2;
      return gPlate*m + st.nOut*(st.armG*(m - st.reach/2) + st.load*(m - st.reach)); };
    for (const ov of [{}, {artStandOut:4}, {artStandT:20}, {artArms:8}, {artN:4, ballD:10}, {artStandLoad:200}]){
      const st = S(ov), tag = ' ' + JSON.stringify(ov);
      const gAt = (W_, D_) => (W_*D_ - st.n*Math.PI*st.rS*st.rS)*st.t*st.rho/1000;
      chk('выведенная плита стоит'+tag, marg(st, st.W, st.D, gAt(st.W, st.D)) > -1e-6,
          {запас:+marg(st, st.W, st.D, gAt(st.W, st.D)).toFixed(3)});
      /* ...И СТОИТ ЕДВА. Иначе «выведена» означало бы «взята с потолка щедро»: глубина на миллиметр
         меньше обязана валить плиту. Это и есть разница между выводом и назначением. */
      const D2 = st.D - 1, W2 = Math.max(st.wMin, Math.min(st.W, D2));
      chk('  и на миллиметр мельче — валится'+tag, marg(st, W2, D2, gAt(W2, D2)) < 0,
          {запас:+marg(st, W2, D2, gAt(W2, D2)).toFixed(3)});
      /* НАЗВАННЫЙ ГРУЗ — ЭТО ЗАКАЗАННЫЙ ГРУЗ: на выведенной плите она держит ровно его. */
      chk('  и держит ровно заказанное'+tag, Math.abs(st.holdG - st.load) < 0.5,
          {держит:+st.holdG.toFixed(2), заказано:+st.load.toFixed(2)});
      chk('  и рук выдерживает ровно столько, сколько заказано вытянутыми'+tag,
          st.armsOK === st.nOut, {выдержит:st.armsOK, заказано:st.nOut});
    }
    /* ПЛЕЧО ПО МЕНЬШЕЙ СТОРОНЕ — утверждение проверяемое: плита и её перевёрнутая копия держат
       поровну. Считай я по глубине, узкая и глубокая держала бы «больше» широкой и мелкой. */
    /* Обе стороны заказаны ЗАВЕДОМО БОЛЬШЕ минимума по гнёздам — иначе одна из них подтянется вверх,
       массы разойдутся, и проверка провалится не потому, что плечо неверно. Первая запись брала 70 при
       минимуме 77 и ловила именно это. */
    const a1 = S({artStandW:140, artStandD:90}), a2 = S({artStandW:90, artStandD:140});
    chk('плита и её перевёрнутая копия держат поровну', Math.abs(a1.holdG - a2.holdG) < 0.05,
        {'140×90':+a1.holdG.toFixed(2), '90×140':+a2.holdG.toFixed(2)});
    /* И МАССА У НИХ ОДНА — иначе равенство выше вышло бы само собой, из разной массы и разного плеча. */
    chk('  при равной массе — значит сошлось именно плечо', Math.abs(a1.plateG - a2.plateG) < 1e-9,
        {'140×90':+a1.plateG.toFixed(2), '90×140':+a2.plateG.toFixed(2)});
  }
  /* ЗАКАЗАННАЯ МЕЛКАЯ ПЛИТА — ОБЪЯВЛЯЕТСЯ, а не подтягивается молча. */
  {
    const st = S({artStandD:60});
    chk('мелкая плита: опрокидывание объявлено',
        st.tips && WS({artStandD:60}).some(x => /опрокидывается ПОД САМИМИ РУКАМИ/.test(x)),
        WS({artStandD:60}));
    /* И ПРОМЕЖУТОЧНЫЙ СЛУЧАЙ: плита, которая стоит под самими руками, но держит меньше заказанного,
       обязана назвать, СКОЛЬКО она держит. «Мелковата» без числа — это не предупреждение. */
    let mid = null;
    for (let d = Math.ceil(S({}).dMin); d < Math.floor(S({}).dNeed); d += 1){
      const q = S({artStandD:d}); if (!q.tips && q.thin){ mid = d; break; } }
    chk('мелковатая плита названа вместе с тем, сколько держит', mid !== null &&
        WS({artStandD:mid}).some(x => /мельче, чем требует равновесие/.test(x) &&
                                      x.indexOf(S({artStandD:mid}).holdG.toFixed(0) + ' г вместо') >= 0),
        {глубина:mid, держит:mid && +S({artStandD:mid}).holdG.toFixed(1), слова:mid && WS({artStandD:mid})});
    chk('плита без хвостовика у руки объявлена',
        W({artPart:'stand'}).some(x => /садиться нечему/.test(x)), W({artPart:'stand'}));
    chk('и на выведенной плите об опрокидывании молчат',
        !WS({}).some(x => /опрокидывается ПОД САМИМИ РУКАМИ|мельче, чем требует равновесие/.test(x)), WS({}));
  }
  /* УМОЛЧАНИЕ ОСНОВАНИЯ НЕ ТРОГАЕТ РУКУ: `artPart` — выбор детали, и цепочка при нём та же. */
  chk('основание не трогает саму цепочку', A({artPart:'stand'}).len === A({}).len);
}
console.log('\n=== TOTAL:', pass, 'passed,', fail, 'failed ===');
if(fail) process.exitCode = 1;
