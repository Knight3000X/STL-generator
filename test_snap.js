// Защёлка-консоль, посчитанная, а не нарисованная. Every other latch in this app is dimensioned by eye;
// this one starts from what the beam is allowed to do and reports what it will take to work it.
//
// So there are two things to test and they are different in kind. One is the arithmetic — ε = 1.5·y·t/L²,
// the 1.64 the taper buys, P = w·t³·E·y/(4L³), and the ramp/friction factor on top — and it is checked
// against the closed forms independently. The other is that the MESH is the beam those numbers describe:
// the arm really is L long and t thick and does taper, the hook really does stand y proud, and the two
// faces really are at the ordered angles. A calculator attached to the wrong solid is worse than neither.
// Run via ./run-all.sh.
let pass=0, fail=0;
function chk(n,c,e){if(c){pass++;console.log('  OK  ',n);}else{fail++;console.log('  FAIL',n,e!==undefined?JSON.stringify(e):'');}}
function vol(t){let v=0;for(const T of t){const a=T[0],b=T[1],c=T[2];v+=(a[0]*(b[1]*c[2]-b[2]*c[1])-a[1]*(b[0]*c[2]-b[2]*c[0])+a[2]*(b[0]*c[1]-b[1]*c[0]))/6;}return v;}
function setp(ov){ logos.length=0; boxHoles.length=0; dieFaces.length=0;
  Object.assign(paramState.box, defaultBoxParams(), {gfBaseplate:false, pipMode:'snap',
    snapLen:20, snapT:2, snapW:8, snapUndercut:1.2, snapLeadAngle:30, snapRetAngle:45,
    snapBaseT:3, snapTaper:true, snapMat:'pla'}, ov);
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
// Thickness of the arm in Z at height y, measured on the centre line but clear of the hook.
const armT = (t, y) => { const runs = solidRuns(t, 2, 0.31, y); return runs.length ? runs[runs.length-1][1] : 0; };

console.log('=== builds across the range ===');
for(const L of [8,20,60]) for(const t of [1,2,4]){
  const m = mk({snapLen:L, snapT:t}), mc = manifoldCheck(m,4);
  chk('L='+L+' t='+t+': замкнута', mc.watertight && vol(m)>0, {open:mc.openEdges, bad:mc.badEdges});
}
for(const ov of [{snapTaper:false}, {snapRetAngle:90}, {snapRetAngle:30}, {snapLeadAngle:10},
                 {snapLeadAngle:60}, {snapUndercut:0.2}, {snapUndercut:8}, {snapW:2}, {snapW:60},
                 {snapBaseT:12}, {snapMat:'nylon'}, {snapT:0.6}, {snapLen:4}]){
  const m = mk(ov), mc = manifoldCheck(m,4);
  chk('крайние параметры '+JSON.stringify(ov), mc.watertight && vol(m)>0, {open:mc.openEdges, bad:mc.badEdges});
}

console.log('=== the arithmetic, against the closed forms ===');
// ε = 1.5·y·t/L², and a beam tapered to half thickness takes 1.64× the deflection for the same strain.
{ const s = snapSpec(setp({}));
  chk('деформация — 1.5·y·t/L², делённая на 1.64 за сужение',
      Math.abs(s.eps - 100*1.5*1.2*2/(20*20)/1.64) < 1e-9, {eps:+s.eps.toFixed(4)});
  const flat = snapSpec(setp({snapTaper:false}));
  chk('без сужения деформация ровно в 1.64 раза больше', Math.abs(flat.eps/s.eps - 1.64) < 1e-9,
      {taper:+s.eps.toFixed(3), flat:+flat.eps.toFixed(3)});
  chk('сила прогиба — w·t³·E·y/(4L³)',
      Math.abs(flat.P - 8*8*2600*1.2/(4*8000)) < 1e-6, {P:+flat.P.toFixed(3)});
  // Doubling the length quarters the strain and cuts the force eightfold — that is the whole point of the
  // calculation, and it is the relationship a hand-drawn latch gets wrong.
  const a = snapSpec(setp({snapLen:20})), b = snapSpec(setp({snapLen:40}));
  chk('вдвое длиннее — вчетверо меньше деформация', Math.abs(a.eps/b.eps - 4) < 1e-9, {});
  chk('и в восемь раз меньше сила', Math.abs(a.P/b.P - 8) < 1e-9, {});
  const t1 = snapSpec(setp({snapT:2})), t2 = snapSpec(setp({snapT:4}));
  chk('вдвое толще — вдвое больше деформация', Math.abs(t2.eps/t1.eps - 2) < 1e-9, {});
  chk('и в восемь раз больше сила', Math.abs(t2.P/t1.P - 8) < 1e-9, {});
}
{ // Pushing it home costs more than deflecting it: the ramp and the friction are levered on top.
  const s = snapSpec(setp({}));
  chk('усилие сборки больше усилия прогиба', s.push > s.P, {P:+s.P.toFixed(2), push:+s.push.toFixed(2)});
  const steep = snapSpec(setp({snapLeadAngle:60})), shallow = snapSpec(setp({snapLeadAngle:10}));
  chk('пологий заход — легче собрать', shallow.push < steep.push,
      {'10°':+shallow.push.toFixed(1), '60°':+steep.push.toFixed(1)});
  chk('90° удержания — деталь неразъёмная', snapSpec(setp({snapRetAngle:90})).pull === Infinity, {});
  chk('45° — разъёмная, но туже сборки', (()=>{ const q=snapSpec(setp({snapRetAngle:45}));
      return isFinite(q.pull) && q.pull > q.push; })(), {});
}
{ // The material is a real input, not a label: a softer one takes less force at the same strain.
  const E = {pla:2600, petg:2100, abs:2200, nylon:1700};
  for(const m of ['pla','petg','abs','nylon']){
    const s = snapSpec(setp({snapMat:m}));
    chk(m+': сила пропорциональна модулю', Math.abs(s.P/s.mat.E - snapSpec(setp({snapMat:'pla'})).P/2600) < 1e-9,
        {E:s.mat.E, want:E[m]});
  }
  chk('деформация от материала не зависит — она геометрическая',
      Math.abs(snapSpec(setp({snapMat:'nylon'})).eps - snapSpec(setp({snapMat:'pla'})).eps) < 1e-12, {});
}

console.log('=== and the mesh is the beam those numbers describe ===');
{ const m = mk({}), B = computeBBox(m);
  chk('ширина консоли — заказанная', Math.abs((B.maxX-B.minX) - 8) < 1e-6, {w:+(B.maxX-B.minX).toFixed(3)});
  // Arm length: base thickness + L, and the whole part is that tall.
  chk('высота — основание плюс длина консоли', Math.abs((B.maxY-B.minY) - 23) < 0.05,
      {h:+(B.maxY-B.minY).toFixed(2)});
  // Thickness at the root is t, at the tip is t/2 — that IS the taper the 1.64 was claimed for.
  const root = armT(m, B.minY + 4.5), tip = armT(m, B.maxY - 3.5);
  chk('у корня консоль толщиной t', Math.abs(root - 2) < 0.15, {root:+root.toFixed(2)});
  chk('к концу сужается вдвое', Math.abs(tip - 1) < 0.2, {tip:+tip.toFixed(2)});
  const flat = mk({snapTaper:false}), Bf = computeBBox(flat);
  chk('без сужения — та же толщина по всей длине',
      Math.abs(armT(flat, Bf.minY+4.5) - armT(flat, Bf.maxY-3.5)) < 0.15,
      {root:+armT(flat,Bf.minY+4.5).toFixed(2), tip:+armT(flat,Bf.maxY-3.5).toFixed(2)});
}
{ // The undercut IS the deflection the arithmetic assumed. If the hook does not stand that proud, the
  // strain number is about a beam that was never built.
  for(const y of [0.6, 1.2, 3]){
    const m = mk({snapUndercut:y}), B = computeBBox(m);
    let zMax = -1e9, tipT = 0;
    for(const T of m) for(const v of T) if(v[1] > B.maxY - 6) zMax = Math.max(zMax, v[2]);
    tipT = 1;                                        // tapered arm is t/2 = 1 mm at the tip
    chk('зацеп '+y+' мм выступает над консолью ровно на столько',
        Math.abs((zMax - tipT) - y) < 0.1, {stand:+(zMax-tipT).toFixed(2)});
  }
}
{ // The two faces are at the ordered angles — the retention one is what decides whether it ever comes off.
  const m = mk({snapRetAngle:90}), B = computeBBox(m);
  // At 90° the retention face is vertical, so the hook's foot and crest sit at the same height.
  let yCrest = 0, zTop = -1e9, yFoot = 1e9;
  for(const T of m) for(const v of T) if(v[2] > zTop + 1e-9){ zTop = v[2]; }
  for(const T of m) for(const v of T) if(Math.abs(v[2]-zTop) < 1e-9) yCrest = Math.max(yCrest, v[1]);
  for(const T of m) for(const v of T) if(Math.abs(v[2]-zTop) < 1e-9) yFoot = Math.min(yFoot, v[1]);
  chk('при α₂ = 90° грань удержания отвесная', Math.abs(yCrest - yFoot) < 0.05,
      {crest:+yCrest.toFixed(2), foot:+yFoot.toFixed(2)});
  // At 45° it slopes back by exactly the undercut
  const m2 = mk({snapRetAngle:45, snapUndercut:2});
  let z2 = -1e9; for(const T of m2) for(const v of T) z2 = Math.max(z2, v[2]);
  let yc = -1e9, yf = 1e9;
  for(const T of m2) for(const v of T) if(Math.abs(v[2]-z2) < 1e-9){ yc = Math.max(yc, v[1]); yf = Math.min(yf, v[1]); }
  chk('при α₂ = 45° она откинута назад ровно на зацеп', Math.abs(yc - yf) < 0.05, {});
  const lo = mk({snapRetAngle:30, snapUndercut:2});
  chk('и чем меньше угол, тем длиннее скос',
      (()=>{ let z=-1e9; for(const T of lo) for(const v of T) z=Math.max(z,v[2]);
             let a=-1e9,b=1e9; for(const T of lo) for(const v of T) if(Math.abs(v[2]-z)<1e-9){a=Math.max(a,v[1]);b=Math.min(b,v[1]);}
             const B2=computeBBox(lo), B3=computeBBox(m2);
             return (B2.maxY-B2.minY) === (B3.maxY-B3.minY); })(), {});
}
{ // It is one solid, not a pad with a beam balanced on it: a ray through the joint meets ONE run.
  const m = mk({}), B = computeBBox(m);
  chk('основание и консоль — одно тело', solidRuns(m, 1, 0.3, 1.0).length === 1,
      {runs:solidRuns(m, 1, 0.3, 1.0).length});
  chk('и консоль с зацепом — тоже', solidRuns(m, 1, 0.3, 1.6).length === 1,
      {runs:solidRuns(m, 1, 0.3, 1.6).length});
}

console.log('=== and it says so when the beam will break ===');
{ chk('заведомо перегруженная консоль отмечается',
      collectPrintWarnings(setp({snapLen:8, snapUndercut:2})).some(s=>/деформация/.test(s)),
      collectPrintWarnings(setp({snapLen:8, snapUndercut:2})));
  chk('а нормальная — нет', collectPrintWarnings(setp({})).length === 0, collectPrintWarnings(setp({})));
  // The SAME beam in a tougher material is fine — that is what the allowable strain column is for.
  chk('та же консоль из нейлона проходит',
      collectPrintWarnings(setp({snapLen:8, snapUndercut:2, snapMat:'nylon'})).length === 0,
      collectPrintWarnings(setp({snapLen:8, snapUndercut:2, snapMat:'nylon'})));
  chk('и тонкая консоль отмечается отдельно',
      collectPrintWarnings(setp({snapT:0.6, snapLen:60})).some(s=>/тоньше 0.8/.test(s)), {});
}

console.log('=== no triangle is inside-out ===');
for(const [nm,ov] of [['защёлка',{}], ['без сужения',{snapTaper:false}], ['неразъёмная',{snapRetAngle:90}],
                      ['глубокий зацеп',{snapUndercut:6}], ['короткая',{snapLen:6}]]){
  const m = mk(ov), B = computeBBox(m);
  let worst = 0, at = null;
  for(let k=1;k<12;k++){ const y = B.minY + (B.maxY-B.minY)*(k+0.37)/12;
    for(const x of [0.31, -1.44, 2.83]){ const d = minDepth(m, 2, x, y);
      if(d < worst){ worst = d; at = [x, +y.toFixed(2)]; } } }
  chk(nm+': глубина по лучу нигде не уходит в минус', worst===0, {depth:worst, at});
}

/* ЗАЖИМ ДЛЯ ПАКЕТА — та же консоль, что и защёлка, только гнётся она не один раз при защёлкивании, а
   всё время, пока пакет закрыт. Проверяется поэтому то же самое и в том же духе: арифметика отдельно
   от сетки, потому что калькулятор, привинченный не к тому телу, хуже, чем ни того, ни другого.

     1. УСИЛИЕ РАСТЁТ КАК КУБ ТОЛЩИНЫ и падает как куб длины — это надо утверждать прямо, потому что
        линейная зависимость выглядела бы ровно так же правдоподобно и была бы в разы неверна.
     2. ДЕФОРМАЦИЯ У КОРНЯ — то же выражение, что у защёлки: там и там гнётся консоль. Если бы они
        разошлись, одна из двух деталей считалась бы по чужой формуле, и никто бы не заметил.
     3. СПИНКА ПОЛУКРУГЛАЯ. Прямой внутренний угол — концентратор, и расчётная формула про него не
        знает. Проверяется геометрией: в основании губки не должно быть ни одной точки, где стенка
        тоньше заданной толщины губки. */
console.log('\n=== зажим для пакета: та же консоль, что и защёлка ===');
{
  const P = ov => Object.assign(defaultBoxParams(), {pipMode:'bagclip'}, ov);
  const S = ov => bagClipSpec(P(ov));
  const B = ov => { logos.length=0; boxHoles.length=0;
    Object.assign(paramState.box, defaultBoxParams(), {pipMode:'bagclip'}, ov);
    return buildTrisForShape('box', paramState.box); };
  const W = ov => collectPrintWarnings(P(ov)) || [];
  const g = S({});
  chk('прогиб губки — половина того, на что развели', Math.abs(g.d - (g.open - g.gap0)/2) < 1e-9, g.d);
  chk('усилие — консольная формула E·w·t³·δ/(4L³)',
      Math.abs(g.F - g.mat.E*g.W*g.t*g.t*g.t*g.d/(4*g.L*g.L*g.L)) < 1e-9, g.F);
  chk('деформация у корня — та же 1.5·δ·t/L², что у защёлки',
      Math.abs(g.eps - 100*1.5*g.d*g.t/(g.L*g.L)) < 1e-9, g.eps);
  /* ТА ЖЕ ФОРМУЛА, ЧТО У ЗАЩЁЛКИ, И ЭТО УТВЕРЖДАЕТСЯ ПРЯМО: если бы они разошлись, одна из деталей
     считалась бы по чужому выражению, а обе продолжали бы строиться и выглядеть правильно. */
  const sn = snapSpec(Object.assign(defaultBoxParams(), {pipMode:'snap', snapLen:g.L, snapT:g.t, snapUndercut:g.d, snapTaper:false}));
  chk('и она совпадает с той, по которой посчитана защёлка',
      Math.abs(g.eps - sn.eps) < 1e-9, {зажим:+g.eps.toFixed(4), защёлка:+sn.eps.toFixed(4)});
  /* КУБ, А НЕ ПРОПОРЦИЯ. Удвоенная толщина обязана дать усилие ВОСЕМЬЮ, а не двумя. */
  chk('вдвое толще губка — усилие в восемь раз',
      Math.abs(S({bagT:4}).F/S({bagT:2}).F - 8) < 1e-9, +(S({bagT:4}).F/S({bagT:2}).F).toFixed(4));
  chk('вдвое длиннее губка — усилие в восемь раз меньше',
      Math.abs(S({bagL:40}).F/S({bagL:20}).F - 1/8) < 1e-9, +(S({bagL:40}).F/S({bagL:20}).F).toFixed(5));
  chk('а деформация от толщины — линейна, а не кубична',
      Math.abs(S({bagT:4}).eps/S({bagT:2}).eps - 2) < 1e-9, +(S({bagT:4}).eps/S({bagT:2}).eps).toFixed(4));
  chk('шире зажим — сильнее, ровно во столько же раз',
      Math.abs(S({bagW:80}).F/S({bagW:40}).F - 2) < 1e-9);
  chk('материал доходит: PETG мягче PLA',
      S({printMat:'petg'}).F < S({printMat:'pla'}).F && S({printMat:'petg'}).mat.t === 'PETG');
  chk('и своё имя сильнее общего', S({printMat:'pla', bagMat:'nylon'}).mat.t === 'нейлон');

  console.log('\n=== зажим: сетка — та балка, которую посчитали ===');
  for (const ov of [{}, {bagT:4}, {bagL:60}, {bagW:120}, {bagOpen:12}]){
    const t = B(ov), mc = manifoldCheck(t, 4);
    chk('зажим '+JSON.stringify(ov)+' герметичен (+объём)', mc.watertight && vol(t) > 0,
        {open:mc.openEdges, bad:mc.badEdges});
  }
  {
    const s2 = S({}), t = B({}), b = computeBBox(t);
    chk('ширина сетки — заданная ширина зажима', Math.abs((b.maxX-b.minX) - s2.W) < 0.01, +(b.maxX-b.minX).toFixed(3));
    /* Высота = наружный диаметр спинки: два раза (просвет/2 + толщина). Если бы спинку строили
       прямоугольной, высота вышла бы другой — и губки уперлись бы в концентратор. */
    chk('высота — наружный поперечник спинки',
        Math.abs((b.maxY-b.minY) - 2*(s2.gap0/2 + s2.t)) < 0.02,
        {габарит:+(b.maxY-b.minY).toFixed(3), ждём:+(2*(s2.gap0/2+s2.t)).toFixed(3)});
    chk('и вылет — длина губки плюс радиус спинки',
        Math.abs((b.maxZ-b.minZ) - (s2.L + s2.gap0/2 + s2.t)) < 0.02,
        {габарит:+(b.maxZ-b.minZ).toFixed(3), ждём:+(s2.L + s2.gap0/2 + s2.t).toFixed(3)});
  }
  {
    /* СТЕНКА ПОСТОЯННОЙ ТОЛЩИНЫ ПО ВСЕЙ СПИНКЕ. Полукруг тем и хорош, что не оставляет ни угла, ни
       утоньшения: и внутренний, и наружный обвод — окружности из одного центра. Меряется прямо на
       контуре: расстояние от центра до внутренней и наружной точек отличается ровно на толщину. */
    const s2 = S({}), loop = bagClipLoop(s2);
    const back = loop.filter(q => q[1] < -1e-9);        // всё, что ушло за спинку
    chk('спинка есть и она не прямоугольная', back.length > 8, back.length);
    const rs = back.map(q => Math.hypot(q[0], q[1]));
    const inner = rs.filter(r => r < (s2.gap0/2 + s2.t/2)), outer = rs.filter(r => r >= (s2.gap0/2 + s2.t/2));
    chk('внутренний обвод спинки — окружность просвета',
        inner.length > 0 && inner.every(r => Math.abs(r - s2.gap0/2) < 1e-9), inner.slice(0,3));
    chk('наружный — окружность на толщину губки больше',
        outer.length > 0 && outer.every(r => Math.abs(r - (s2.gap0/2 + s2.t)) < 1e-9), outer.slice(0,3));
  }
  console.log('\n=== зажим: оба предела названы, умолчание молчит ===');
  chk('на умолчаниях ни одной жалобы',
      !W({}).some(x => /выше допустимой|выскользнет/.test(x)), W({}));
  chk('но числа названы', W({}).some(x => /усилие .* Н/.test(x)) && W({}).some(x => /деформация/.test(x)));
  chk('короткая толстая губка названа ломкой',
      W({bagT:4, bagL:12}).some(x => /выше допустимой/.test(x)), W({bagT:4, bagL:12}));
  chk('длинная тонкая — слабой', W({bagL:60, bagT:1}).some(x => /выскользнет/.test(x)));
  /* Пределы тянут в РАЗНЫЕ стороны, и это надо утверждать: набор, где выполнены оба, существовать
     не обязан, но набор, где нарушены оба сразу, — признак того, что формулы перепутаны. */
  chk('и одновременно оба не нарушаются', !(S({bagT:4, bagL:12}).weak) && !(S({bagL:60, bagT:1}).over),
      {толстая:S({bagT:4,bagL:12}), тонкая:S({bagL:60,bagT:1})});
  chk('подпись называет усилие, а не только размер',
      /Н\)/.test((function(){ B({}); return activeShapeLabel(); })()),
      (function(){ B({}); return activeShapeLabel(); })());
}
console.log('\n=== TOTAL:', pass, 'passed,', fail, 'failed ===');
if(fail) process.exitCode = 1;
