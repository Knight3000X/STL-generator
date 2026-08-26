// Картодержатель с выдвижением карт — лоток с толкателем, печать в сборе.
//
// Проверяется не «похоже ли на кошелёк», а то, что ломается молча:
//
//   1. КАРТА — СТАНДАРТ. ISO/IEC 7810 ID-1: 85.60 × 53.98 × 0.76. Размер приходит из кармана, а не из
//      панели, и «прикинуть» его нельзя. Таблица сверяется числом, и карман — с таблицей.
//
//   2. ПЕЧАТЬ В СБОРЕ. Толкатель отделён от лотка зазором СО ВСЕХ СТОРОН. Связностью это не задать:
//      тела здесь не делят вершин вовсе. Спрашивать надо объёмом и мерить расстояние.
//
//   3. ТОЛКАТЕЛЬ НЕ ВЫПАДАЕТ. Держат его не концы паза — паз сквозной во всю длину, — а лопасть над
//      полом и пятка под ним: обе шире паза. Сузь любую, и деталь останется герметичной и правдоподобной.
//
//   4. ГЕОМЕТРИЧЕСКИЕ ГАРАНТИИ ВПЕРЕДИ УПРУГИХ. Сколько карты остаётся под губами при полном ходе — это
//      не зависит ни от материала, ни от печати, и потому надёжнее всякой пружины.
//
//   5. УПРУГИЙ ЭЛЕМЕНТ ЗДЕСЬ ОДИН — язычок у устья, и это надо было ЗАВЕСТИ, а не выдумать. Первая
//      запись считала усилие закладки как отгиб боковой стенки и получила 1677 Н на карту при 214 МПа:
//      абсурд был не в формуле, а в замысле — стенка высотой шесть миллиметров и шириной во всю карту
//      не пружина, она балка. Усилие язычка пересчитывается ИЗ ИЗМЕРЕННОЙ СЕТКИ.
//
// Run: ./run-all.sh

let pass = 0, fail = 0;
function chk(n, c, e){ if (c){ pass++; console.log('  OK  ', n); }
  else { fail++; console.log('  FAIL', n, e !== undefined ? JSON.stringify(e) : ''); } }
function vol(t){ let v=0; for(const T of t){ const a=T[0],b=T[1],c=T[2];
  v += (a[0]*(b[1]*c[2]-b[2]*c[1]) - a[1]*(b[0]*c[2]-b[2]*c[0]) + a[2]*(b[0]*c[1]-b[1]*c[0]))/6; } return v; }
const P = ov => Object.assign({}, defaultBoxParams(), {chMode:'wallet'}, ov || {});
const S = ov => cardSpec(P(ov));
const B = ov => { logos.length = 0; boxHoles.length = 0;
  Object.assign(paramState.box, defaultBoxParams(), {chMode:'wallet'}, ov || {});
  return buildTrisForShape('box', paramState.box); };
const W = ov => collectPrintWarnings(P(ov)) || [];
const shells = t => { const key = q => q.map(c => Math.round(c*1e6)).join(',');
  const par = [...t.keys()], find = i => par[i]===i ? i : (par[i] = find(par[i]));
  const vm = new Map();
  t.forEach((T,i) => T.forEach(v => { const k = key(v);
    if (vm.has(k)){ const a = find(vm.get(k)), b = find(i); if (a!==b) par[a] = b; } else vm.set(k, i); }));
  const g = new Map(); t.forEach((_,i) => { const r = find(i); if (!g.has(r)) g.set(r, []); g.get(r).push(i); });
  return [...g.values()]; };
/* Число оборотов вдоль оси: 0 — пустота, иначе материал. Два разных луча обязаны согласиться —
   один, прошедший по касательной к стыку тел, даёт лишнее пересечение. */
const windAx = (t, P0, ax) => { const u=(ax+1)%3, v=(ax+2)%3; let w=0;
  for (const T of t){ const a=T[0], b=T[1], c=T[2];
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
const IN = (t, q) => windAx(t, q, 1) !== 0 && windAx(t, q, 0) !== 0;
/* Квадрат расстояния от точки до треугольника — тот же замер, что у зажима для пакета: сперва
   проекция на плоскость, и если она внутри — высота, иначе ближайшее из трёх рёбер. */
const d2seg = (p, a, b) => { const d = sub(b, a), L2 = dot(d, d);
  let u = L2 > 0 ? dot(sub(p, a), d)/L2 : 0; u = Math.max(0, Math.min(1, u));
  const q = [a[0]+u*d[0]-p[0], a[1]+u*d[1]-p[1], a[2]+u*d[2]-p[2]]; return dot(q, q); };
const dTri = (p, T) => { const [A, Bb, C] = T;
  const n = cross(sub(Bb, A), sub(C, A)), L = vlength(n);
  if (L > 1e-12){ const u = [n[0]/L, n[1]/L, n[2]/L], h = dot(sub(p, A), u);
    const q = [p[0]-h*u[0], p[1]-h*u[1], p[2]-h*u[2]];
    const s1 = dot(cross(sub(Bb,A), sub(q,A)), u), s2 = dot(cross(sub(C,Bb), sub(q,Bb)), u),
          s3 = dot(cross(sub(A,C), sub(q,C)), u);
    if ((s1>=0&&s2>=0&&s3>=0)||(s1<=0&&s2<=0&&s3<=0)) return h*h; }
  return Math.min(d2seg(p,A,Bb), d2seg(p,Bb,C), d2seg(p,C,A)); };

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


console.log('=== картодержатель: строится и герметичен ===');
for (const ov of [{}, {chCards:1}, {chCards:20}, {chTravel:50}, {chLip:3}, {chSlot:20}, {chTabLen:20}, {chCardT:1.2}]){
  const t = B(ov), mc = manifoldCheck(t, 4);
  chk('картодержатель '+JSON.stringify(ov)+' герметичен', mc.watertight && vol(t) > 0,
      {open:mc.openEdges, bad:mc.badEdges});
  chk('  и без совпадающих граней', coplanarPairs(t).hits === 0, coplanarPairs(t).where);
  const b = computeBBox(t), s = S(ov);
  chk('  габарит — тот, что назван',
      Math.abs((b.maxX-b.minX) - s.outer.x) < 0.02 && Math.abs((b.maxZ-b.minZ) - s.outer.z) < 0.02 &&
      Math.abs((b.maxY-b.minY) - s.outer.y) < 0.02,
      {назван:[+s.outer.x.toFixed(2), +s.outer.z.toFixed(2), +s.outer.y.toFixed(2)],
       габарит:[+(b.maxX-b.minX).toFixed(2), +(b.maxZ-b.minZ).toFixed(2), +(b.maxY-b.minY).toFixed(2)]});
}

console.log('=== карта — стандарт, а не выдуманное число ===');
{
  /* ISO/IEC 7810 ID-1. Числа сверяются прямо: «примерно 86 на 54» — это уже не стандарт, а прикидка,
     и карман, построенный по прикидке, карту либо зажмёт, либо отпустит болтаться. */
  chk('таблица карты — ровно ISO/IEC 7810 ID-1',
      CARD_ISO.l === 85.60 && CARD_ISO.w === 53.98 && CARD_ISO.t === 0.76, CARD_ISO);
  const s = S({});
  chk('карман шире карты ровно на печатный зазор',
      Math.abs(s.cw - (CARD_ISO.w + s.gap)) < 1e-9, {карман:+s.cw.toFixed(3), 'карта+зазор':+(CARD_ISO.w + s.gap).toFixed(3)});
  chk('и длина кармана — карта, ход и лопасть',
      Math.abs(s.inner - (CARD_ISO.l + s.gap + s.travel + s.blade)) < 1e-9,
      {карман:+s.inner.toFixed(3)});
  /* И ТОЛЩИНА ПАЧКИ ИДЁТ ЗА ЧИСЛОМ КАРТ, а не за ручкой высоты: высоты у лотка нет вовсе. */
  const h1 = S({chCards:4}).outer.y, h2 = S({chCards:8}).outer.y;
  chk('пачка растёт ровно на карту за карту',
      Math.abs((h2 - h1) - 4*CARD_ISO.t) < 1e-9, {'4':+h1.toFixed(2), '8':+h2.toFixed(2)});
}

console.log('=== карман: карта влезает, и влезает с зазором ===');
for (const ov of [{}, {chCards:12}, {chCardT:1.2}]){
  const t = B(ov), s = S(ov), tag = ' ' + JSON.stringify(ov);
  const yMid = s.tF + s.stack/2;                       // середина пачки по высоте
  const zMid = -s.outer.z/2 + s.tE + s.blade + s.travel + CARD_ISO.l/2;   // середина карты в кармане
  /* Внутри кармана пусто на всю ширину карты... */
  chk('в кармане пусто по ширине карты'+tag,
      !IN(t, [0, yMid, zMid]) && !IN(t, [CARD_ISO.w/2 - 0.3, yMid, zMid]) &&
      !IN(t, [-(CARD_ISO.w/2 - 0.3), yMid, zMid]),
      {y:+yMid.toFixed(2), z:+zMid.toFixed(2)});
  /* ...а сразу за стенкой — материал, иначе «пусто» ничего не значит. */
  chk('  а за стенкой материал'+tag,
      IN(t, [s.xi + s.tW/2, yMid, zMid]) && IN(t, [-(s.xi + s.tW/2), yMid, zMid]));
  /* И ГУБЫ НАВИСАЮТ НАД ПАЧКОЙ: выше пачки у краёв материал есть, а посередине нет. */
  const yLip = s.tF + s.stack + s.tLip/2;
  chk('  губы нависают над пачкой'+tag,
      IN(t, [s.xi - s.lipOver/2, yLip, zMid]) && !IN(t, [0, yLip, zMid]),
      {y:+yLip.toFixed(2)});
}

console.log('=== печать в сборе: толкатель отделён и не выпадает ===');
for (const ov of [{}, {chSlot:20}, {chCards:20}]){
  const t = B(ov), s = S(ov), tag = ' ' + JSON.stringify(ov);
  const cs = shells(t);
  /* ШЕСТЬ: две половины лотка, задняя стенка, передняя перемычка, язычок и толкатель. Число это
     стоит утверждать: сварись любое с любым, сетка осталась бы герметичной и на вид целой. */
  chk('деталь распадается ровно на шесть тел'+tag, cs.length === 6, {тел:cs.length});
  /* КАЖДОЕ ТЕЛО ЗАМКНУТО САМО ПО СЕБЕ: открытая оболочка одного на общей сетке не видна — её рёбра
     спарены соседом. */
  chk('  и каждое замкнуто само по себе'+tag,
      cs.every(g => manifoldCheck(g.map(i => t[i]), 4).watertight), {});
  /* ТОЛКАТЕЛЬ — САМОЕ МАЛЕНЬКОЕ ТЕЛО, и ни одна его вершина не лежит внутри лотка. */
  /* ТОЛКАТЕЛЬ ОПОЗНАЁТСЯ ТОЧКОЙ ВНУТРИ НЕГО, а не «самое маленькое тело»: самым маленьким оказался
     язычок, и первая запись мерила зазор до него. */
  const inPush = [0, s.tF/2, -s.outer.z/2 + s.tE + s.gap + s.blade/2];
  const bodies = cs.map(g => g.map(i => t[i]));
  const push = bodies.find(g => IN(g, inPush));
  const tray = [].concat(...bodies.filter(g => g !== push));
  chk('  толкатель опознан точкой внутри него'+tag, !!push, {точка:inPush.map(v => +v.toFixed(2))});
  if (!push) continue;
  let inside = 0;
  for (const T of push) for (const v of T) if (IN(tray, v)) inside++;
  chk('  ни одна вершина толкателя не внутри лотка'+tag, inside === 0, {внутри:inside});
  /* И ЗАЗОР МЕЖДУ НИМИ — ЗАКАЗАННЫЙ, а не «какой-нибудь»: положительным он остался бы и вдвое меньше,
     а печать в сборе живёт ровно этим числом. */
  /* ЗАЗОР МЕРЯЕТСЯ ОТ ВЕРШИН ОДНОГО ТЕЛА ДО ТРЕУГОЛЬНИКОВ ДРУГОГО — так же, как у зажима для пакета.
     Вершина-к-вершине здесь не годится и дала 1.07 при заказанных 0.35: плоскости стоят в зазоре
     параллельно, а их ближайшие ВЕРШИНЫ разнесены по другой оси, и такой замер меряет диагональ, а не
     просвет. */
  const bb = computeBBox(push);
  /* ОТБОР БЛИЗКИХ ГРАНЕЙ — ПО ПЕРЕСЕЧЕНИЮ ГАБАРИТОВ, а не по «все вершины рядом»: грани лотка длинные,
     во всю деталь, и условие «каждая вершина близко» не проходило ни одна — отбор возвращал ноль. */
  const R = 4, ov3 = (lo, hi, a, b) => hi >= a - R && lo <= b + R;
  const near = tray.filter(T => {
    const xs = T.map(v => v[0]), ys = T.map(v => v[1]), zs = T.map(v => v[2]);
    return ov3(Math.min(...xs), Math.max(...xs), bb.minX, bb.maxX) &&
           ov3(Math.min(...ys), Math.max(...ys), bb.minY, bb.maxY) &&
           ov3(Math.min(...zs), Math.max(...zs), bb.minZ, bb.maxZ); });
  /* И ТОЧКИ БЕРУТСЯ НЕ ТОЛЬКО В ВЕРШИНАХ. Между двумя ПАРАЛЛЕЛЬНЫМИ гранями, разнесёнными по другой
     оси, ни одна вершина не проецируется на соседнюю грань: расстояние вершина-к-грани обходит такой
     зазор стороной и меряет диагональ через ребро. Мутация «зазор стойки вдвое меньше» прошла эту
     проверку насквозь именно так — 0.175 мм просвета между боком стойки и стенкой паза не нашлось ни
     одной парой вершин. Поэтому каждый треугольник засевается барицентрической сеткой. */
  const samples = T => { const out = [], k = 4;
    for (let i = 0; i <= k; i++) for (let j = 0; i + j <= k; j++){
      const a = i/k, b = j/k, c = 1 - a - b;
      out.push([a*T[0][0] + b*T[1][0] + c*T[2][0],
                a*T[0][1] + b*T[1][1] + c*T[2][1],
                a*T[0][2] + b*T[1][2] + c*T[2][2]]); }
    return out; };
  let best = 1e9;
  for (const T of push) for (const v of samples(T)) for (const U of near){ const d = dTri(v, U); if (d < best) best = d; }
  for (const T of near) for (const v of samples(T)) for (const U of push){ const d = dTri(v, U); if (d < best) best = d; }
  const dmin = Math.sqrt(best);
  chk('  и зазор между ними — заказанный'+tag, Math.abs(dmin - s.gap) < 0.03,
      {измерен:+dmin.toFixed(4), заказан:+s.gap.toFixed(4), граней:near.length});
  /* ТОЛКАТЕЛЬ НЕ ПРОЛЕЗАЕТ В ПАЗ: лопасть и пятка шире его. Меряется по сетке, а не по спецификации. */
  const wPush = bb.maxX - bb.minX;
  chk('  лопасть и пятка шире паза'+tag, wPush > s.sw + 1.0,
      {толкатель:+wPush.toFixed(2), паз:+s.sw.toFixed(2)});
}

console.log('=== гарантии геометрические — впереди упругих ===');
{
  for (const ov of [{}, {chTravel:5}, {chTravel:40}]){
    const s = S(ov);
    chk('сколько выходит и сколько держится — сумма даёт длину карты '+JSON.stringify(ov),
        Math.abs(s.stickOut + s.held - (CARD_ISO.l + s.gap)) < 1e-9,
        {выходит:+s.stickOut.toFixed(1), держится:+s.held.toFixed(1)});
  }
  chk('слишком длинный ход объявлен',
      W({chTravel:60}).some(x => /пачка вылетит целиком/.test(x)), W({chTravel:60}));
  chk('а на умолчаниях об этом молчат', !W({}).some(x => /вылетит целиком/.test(x)), W({}));
}

console.log('=== упругий элемент здесь ОДИН, и он считается из сетки ===');
{
  /* Язычок меряется в сетке: вылет, толщина и ширина, — и сила считается заново. Спецификация о
     расхождении между построенным и посчитанным не знает по определению. */
  for (const ov of [{}, {chTabLen:14}, {chTabT:1.6}, {chTabW:16}]){
    const t = B(ov), s = S(ov), tag = ' ' + JSON.stringify(ov);
    const yTab = s.tF + s.stack + s.tabLift + s.tabT/2;
    // ширина язычка по X на его высоте
    const zTab = s.outer.z/2 - s.tE - 1.0;
    const edge = (dir) => { let hi = -1;
      for (let m = 0.05; m <= 40; m += 0.05){ if (!IN(t, [dir*m, yTab, zTab])){ hi = m; break; } }
      if (hi < 0) return 1e9;
      let lo = hi - 0.05;
      for (let i = 0; i < 30; i++){ const m = (lo + hi)/2; if (IN(t, [dir*m, yTab, zTab])) lo = m; else hi = m; }
      return (lo + hi)/2; };
    const wTab = edge(1) + edge(-1);
    /* ТОЛЩИНУ ЯЗЫЧКА ПО ВЕРШИНАМ НЕ ВЗЯТЬ: у коробки вершины только по углам, и щуп «все вершины с
       |x| < 0.4» не находил ни одной — тот же урок, что с цилиндром у хвостовика. Меряем оборотами. */
    const yEdge = dir => { let hi = -1;
      for (let m = 0.02; m <= 12; m += 0.02){ if (!IN(t, [0, yTab + dir*m, zTab])){ hi = m; break; } }
      if (hi < 0) return 1e9;
      let lo = hi - 0.02;
      for (let i = 0; i < 30; i++){ const m = (lo + hi)/2; if (IN(t, [0, yTab + dir*m, zTab])) lo = m; else hi = m; }
      return (lo + hi)/2; };
    const tTab = yEdge(1) + yEdge(-1);
    const Fmeas = 3*s.mat.E*(wTab*Math.pow(tTab,3)/12)*s.tabLift/Math.pow(s.tabL, 3);
    chk('усилие язычка сходится с пересчётом из сетки'+tag,
        Math.abs(Fmeas - s.F)/Math.max(1e-9, s.F) < 0.12,
        {названо:+s.F.toFixed(3), 'из сетки':+Fmeas.toFixed(3), замеры:{ширина:+wTab.toFixed(2), толщина:+tTab.toFixed(2)}});
  }
  chk('перегруженный язычок объявлен',
      W({chTabT:3, chTabLen:3}).some(x => /отломится, а не согнётся/.test(x)), W({chTabT:3, chTabLen:3}));
  chk('слабый язычок объявлен',
      W({chTabLen:30}).some(x => /пачка выпадет сама/.test(x)), W({chTabLen:30}));
  chk('а на умолчаниях язычок не жалуется',
      !W({}).some(x => /отломится|выпадет сама/.test(x)), W({}));
}

console.log('=== чего модель НЕ обещает — сказано вслух ===');
{
  /* Это требование дорожной карты, записанное ДО работы: «карты веером» — поведение трения карты о
     карту, а не геометрии. Молчание тут было бы обещанием. */
  chk('про «веер» сказано, что его не будет',
      W({}).some(x => /веером/.test(x) && /трения карты о карту/.test(x)), W({}));
  chk('и про то, что печатается В СБОРЕ, тоже',
      W({}).some(x => /В СБОРЕ/.test(x) && /зазор/.test(x)), W({}));
  chk('и про то, что упругий здесь только язычок',
      W({}).some(x => /единственный упругий/.test(x)), W({}));
}

console.log('\n=== TOTAL:', pass, 'passed,', fail, 'failed ===');
if (fail) process.exitCode = 1;
