// Картодержатель с выдвижением карт — ЗАКРЫТЫЙ ФУТЛЯР с толкателем, печать в сборе.
//
// Проверяется не «похоже ли на кошелёк», а то, что ломается молча:
//
//   1. КАРТА — СТАНДАРТ. ISO/IEC 7810 ID-1: 85.60 × 53.98 × 0.76. Размер приходит из кармана, а не из
//      панели, и «прикинуть» его нельзя.
//
//   2. ТЕЛА СВЯЗАНЫ. Это главная проверка этого файла, и появилась она по горькому поводу: у первой
//      версии (открытый лоток) язычок удержания ВИСЕЛ В ВОЗДУХЕ — навешивался над пазом, где материала
//      нет вовсе. Проверка тогда считала ТЕЛА («ровно шесть») и была довольна: летающее тело — тоже
//      тело. Число тел не говорит о том, СВЯЗАНЫ ли они. Связность спрашивается ОБЪЁМОМ: тела
//      объединяются в группы по взаимному проникновению, и групп обязано быть ровно две — футляр и
//      толкатель.
//
//   3. ПЕЧАТЬ В СБОРЕ. Толкатель отделён от футляра зазором СО ВСЕХ СТОРОН, и зазор ИЗМЕРЯЕТСЯ. Точки
//      берутся не только в вершинах: между двумя параллельными гранями, разнесёнными по третьей оси,
//      ни одна вершина не проецируется на соседнюю грань.
//
//   4. ТОЛКАТЕЛЬ НЕ ВЫПАДАЕТ. Держат его не концы паза — паз сквозной во всю длину, — а лопасть в
//      кармане и пятка на лицевой оболочке: обе шире паза.
//
//   5. ГЕОМЕТРИЧЕСКИЕ ГАРАНТИИ ВПЕРЕДИ УПРУГИХ. Сколько карты остаётся в футляре при полном ходе — не
//      зависит ни от материала, ни от печати.
//
//   6. УПРУГИЙ ЭЛЕМЕНТ ОДИН — губы у устья, и они СИДЯТ В БОКОВЫХ СТЕНКАХ. Усилие пересчитывается из
//      измеренной сетки: спецификация о расхождении между построенным и посчитанным не знает.
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
  return [...g.values()].map(idx => idx.map(i => t[i])); };
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
/* Точки на треугольнике, а не только его вершины. */
const samples = (T, k) => { const out = []; k = k || 4;
  for (let i = 0; i <= k; i++) for (let j = 0; i + j <= k; j++){
    const a = i/k, b = j/k, c = 1 - a - b;
    out.push([a*T[0][0] + b*T[1][0] + c*T[2][0], a*T[0][1] + b*T[1][1] + c*T[2][1],
              a*T[0][2] + b*T[1][2] + c*T[2][2]]); }
  return out; };
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
/* ГРУППЫ ПО ВЗАИМНОМУ ПРОНИКНОВЕНИЮ: тела сливаются в одну группу, если хоть одна точка одного лежит
   внутри другого. Это и есть связность детали — та, которой числом тел не задать. */
const glued = bodies => {
  const par = bodies.map((_, i) => i), find = i => par[i]===i ? i : (par[i] = find(par[i]));
  for (let a = 0; a < bodies.length; a++) for (let b = a+1; b < bodies.length; b++){
    if (find(a) === find(b)) continue;
    let hit = false;
    for (const T of bodies[a]){ for (const v of samples(T, 2)) if (IN(bodies[b], v)){ hit = true; break; } if (hit) break; }
    if (!hit) for (const T of bodies[b]){ for (const v of samples(T, 2)) if (IN(bodies[a], v)){ hit = true; break; } if (hit) break; }
    if (hit) par[find(a)] = find(b); }
  const g = new Map(); bodies.forEach((_, i) => { const r = find(i); if (!g.has(r)) g.set(r, []); g.get(r).push(i); });
  return [...g.values()]; };

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


console.log('=== картодержатель: строится, герметичен и не вывернут ===');
for (const ov of [{}, {chCards:1}, {chCards:20}, {chTravel:50}, {chSlot:20}, {chLipLen:20}, {chCardT:1.2}]){
  const t = B(ov), mc = manifoldCheck(t, 4);
  chk('футляр '+JSON.stringify(ov)+' герметичен и объём положителен', mc.watertight && vol(t) > 0,
      {open:mc.openEdges, bad:mc.badEdges, объём:+vol(t).toFixed(0)});
  chk('  и без совпадающих граней', coplanarPairs(t).hits === 0, coplanarPairs(t).where);
  const b = computeBBox(t), s = S(ov);
  chk('  габарит — тот, что назван',
      Math.abs((b.maxX-b.minX) - s.outer.x) < 0.02 && Math.abs((b.maxZ-b.minZ) - s.outer.z) < 0.02 &&
      Math.abs((b.maxY-b.minY) - s.outer.y) < 0.02,
      {назван:[+s.outer.x.toFixed(2), +s.outer.z.toFixed(2), +s.outer.y.toFixed(2)],
       габарит:[+(b.maxX-b.minX).toFixed(2), +(b.maxZ-b.minZ).toFixed(2), +(b.maxY-b.minY).toFixed(2)]});
}

console.log('=== НИЧЕГО НЕ ВИСИТ В ВОЗДУХЕ ===');
/* Та самая проверка, которой не было. У первой версии язычок навешивался над пазом и не касался
   ничего; «тел ровно шесть» это пропустило, потому что летающее тело — тоже тело. */
for (const ov of [{}, {chCards:20}, {chSlot:20}, {chLipLen:20}, {chTravel:50}]){
  const t = B(ov), cs = shells(t), tag = ' ' + JSON.stringify(ov);
  /* Тел ЧЕТЫРЕ У ФУТЛЯРА плюс по одному на перемычку в пазу (v25.5.0) и одно у толкателя. Число не
     вписано, а выведено из спецификации: вписанное разошлось бы с ней при первом же изменении. */
  const nb = S(ov).bridgeN;
  chk('тел ровно пять и по одному на перемычку'+tag, cs.length === 5 + nb, {тел:cs.length, перемычек:nb});
  const gr = glued(cs);
  chk('  и они срастаются РОВНО В ДВЕ группы: футляр и толкатель'+tag, gr.length === 2,
      {групп:gr.length, размеры:gr.map(g => g.length)});
  chk('  причём в толкателе одно тело, остальное — футляр'+tag,
      gr.length === 2 && gr.map(g => g.length).sort((a,b)=>a-b).join(',') === '1,' + (4 + nb),
      {размеры:gr.map(g => g.length).sort((a,b)=>a-b)});
  chk('  и каждое тело замкнуто само по себе'+tag,
      cs.every(g => manifoldCheck(g, 4).watertight), {});
}

console.log('=== карта — стандарт, а не выдуманное число ===');
{
  chk('таблица карты — ровно ISO/IEC 7810 ID-1',
      CARD_ISO.l === 85.60 && CARD_ISO.w === 53.98 && CARD_ISO.t === 0.76, CARD_ISO);
  const s = S({});
  chk('карман шире карты ровно на печатный зазор',
      Math.abs(s.cw - (CARD_ISO.w + s.gap)) < 1e-9, {карман:+s.cw.toFixed(3)});
  chk('и длина футляра — карта, ход, лопасть и задняя стенка',
      Math.abs(s.outer.z - (CARD_ISO.l + s.gap + s.travel + s.blade + s.tE)) < 1e-9,
      {длина:+s.outer.z.toFixed(3)});
  const h1 = S({chCards:4}).outer.y, h2 = S({chCards:8}).outer.y;
  chk('пачка растёт ровно на карту за карту',
      Math.abs((h2 - h1) - 4*CARD_ISO.t) < 1e-9, {'4':+h1.toFixed(2), '8':+h2.toFixed(2)});
}

console.log('=== футляр ЗАКРЫТ: над пачкой оболочка, а не воздух ===');
for (const ov of [{}, {chCards:12}, {chCardT:1.2}]){
  const t = B(ov), s = S(ov), tag = ' ' + JSON.stringify(ov);
  const yMid = s.tF + s.stack/2;
  const zMid = -s.outer.z/2 + s.tE + s.blade + s.travel + CARD_ISO.l/2;
  chk('в кармане пусто по ширине карты'+tag,
      !IN(t, [0, yMid, zMid]) && !IN(t, [CARD_ISO.w/2 - 0.3, yMid, zMid]) &&
      !IN(t, [-(CARD_ISO.w/2 - 0.3), yMid, zMid]), {y:+yMid.toFixed(2), z:+zMid.toFixed(2)});
  chk('  а за боковой стенкой материал'+tag,
      IN(t, [s.xi + s.tW/2, yMid, zMid]) && IN(t, [-(s.xi + s.tW/2), yMid, zMid]));
  /* ЛИЦЕВАЯ ОБОЛОЧКА НАД ПАЧКОЙ — то, чего не было у лотка. Материал есть везде, кроме паза. */
  const yShell = s.tF + s.stack + s.tT/2;
  chk('  над пачкой оболочка'+tag,
      IN(t, [s.xi - 2, yShell, zMid]) && IN(t, [-(s.xi - 2), yShell, zMid]), {y:+yShell.toFixed(2)});
  chk('  и только паз в ней открыт'+tag, !IN(t, [0, yShell, zMid]));
  /* И ТЫЛЬНАЯ ОБОЛОЧКА ПОД ПАЧКОЙ. */
  chk('  под пачкой тоже оболочка'+tag, IN(t, [0, s.tF/2, zMid]), {y:+(s.tF/2).toFixed(2)});
}

console.log('=== печать в сборе: толкатель отделён и не выпадает ===');
for (const ov of [{}, {chSlot:20}, {chCards:20}]){
  const t = B(ov), s = S(ov), tag = ' ' + JSON.stringify(ov);
  const cs = shells(t);
  const inPush = [0, s.H + s.gap + s.padT/2, -s.outer.z/2 + s.tE + 0.6 + s.gap + s.blade/2];
  const push = cs.find(g => IN(g, inPush));
  chk('толкатель опознан точкой внутри него'+tag, !!push, {точка:inPush.map(v => +v.toFixed(2))});
  if (!push) continue;
  const tray = [].concat(...cs.filter(g => g !== push));
  let inside = 0;
  for (const T of push) for (const v of T) if (IN(tray, v)) inside++;
  chk('  ни одна вершина толкателя не внутри футляра'+tag, inside === 0, {внутри:inside});
  const bb = computeBBox(push), R = 4;
  const ovl = (lo, hi, a, b) => hi >= a - R && lo <= b + R;
  const near = tray.filter(T => { const xs = T.map(v=>v[0]), ys = T.map(v=>v[1]), zs = T.map(v=>v[2]);
    return ovl(Math.min(...xs), Math.max(...xs), bb.minX, bb.maxX) &&
           ovl(Math.min(...ys), Math.max(...ys), bb.minY, bb.maxY) &&
           ovl(Math.min(...zs), Math.max(...zs), bb.minZ, bb.maxZ); });
  let best = 1e9;
  for (const T of push) for (const v of samples(T)) for (const U of near){ const d = dTri(v, U); if (d < best) best = d; }
  for (const T of near) for (const v of samples(T)) for (const U of push){ const d = dTri(v, U); if (d < best) best = d; }
  chk('  и зазор между ними — заказанный'+tag, Math.abs(Math.sqrt(best) - s.gap) < 0.03,
      {измерен:+Math.sqrt(best).toFixed(4), заказан:+s.gap.toFixed(4)});
  chk('  лопасть и пятка шире паза'+tag, (bb.maxX - bb.minX) > s.sw + 1.0,
      {толкатель:+(bb.maxX-bb.minX).toFixed(2), паз:+s.sw.toFixed(2)});
}

console.log('=== гарантии геометрические — впереди упругих ===');
{
  for (const ov of [{}, {chTravel:5}, {chTravel:40}]){
    const s = S(ov);
    chk('выходит + держится = длина карты '+JSON.stringify(ov),
        Math.abs(s.stickOut + s.held - (CARD_ISO.l + s.gap)) < 1e-9,
        {выходит:+s.stickOut.toFixed(1), держится:+s.held.toFixed(1)});
  }
  chk('слишком длинный ход объявлен', W({chTravel:60}).some(x => /вылетит целиком/.test(x)), W({chTravel:60}));
  chk('а на умолчаниях об этом молчат', !W({}).some(x => /вылетит целиком/.test(x)), W({}));
}

console.log('=== упругий элемент один, и он СИДИТ В СТЕНКЕ, а не висит ===');
{
  for (const ov of [{}, {chLipLen:14}, {chLipT:1.6}]){
    const t = B(ov), s = S(ov), tag = ' ' + JSON.stringify(ov);
    const yLip = s.tF + s.stack - s.lipLift - s.lipT/2, zLip = s.outer.z/2 - 1.0;
    const xLip = (s.lipX0 + s.lipX1)/2;
    chk('губа на месте'+tag, IN(t, [xLip, yLip, zLip]) && IN(t, [-xLip, yLip, zLip]),
        {x:+xLip.toFixed(2), y:+yLip.toFixed(2)});
    /* И МИМО ЛОПАСТИ: посередине, где ходит толкатель, губы нет. */
    chk('  и толкателю она не мешает'+tag, !IN(t, [0, yLip, zLip]));
    /* Толщина губы — оборотами, а не по вершинам: у коробки вершины только по углам. */
    const yEdge = dir => { let hi = -1;
      for (let m = 0.02; m <= 12; m += 0.02){ if (!IN(t, [xLip, yLip + dir*m, zLip])){ hi = m; break; } }
      if (hi < 0) return 1e9;
      let lo = hi - 0.02;
      for (let i = 0; i < 30; i++){ const m = (lo + hi)/2; if (IN(t, [xLip, yLip + dir*m, zLip])) lo = m; else hi = m; }
      return (lo + hi)/2; };
    const tMeas = yEdge(1) + yEdge(-1);
    const Fmeas = 3*s.mat.E*(2*s.lipW*Math.pow(tMeas, 3)/12)*s.lipLift/Math.pow(s.lipL, 3);
    chk('  усилие губ сходится с пересчётом из сетки'+tag,
        Math.abs(Fmeas - s.F)/Math.max(1e-9, s.F) < 0.12,
        {названо:+s.F.toFixed(2), 'из сетки':+Fmeas.toFixed(2), толщина:+tMeas.toFixed(3)});
  }
  chk('перегруженная губа объявлена',
      W({chLipT:3, chLipLen:3}).some(x => /отломится, а не согнётся/.test(x)), W({chLipT:3, chLipLen:3}));
  chk('слабая губа объявлена', W({chLipLen:30}).some(x => /выпадет сама/.test(x)), W({chLipLen:30}));
  chk('а на умолчаниях губы не жалуются',
      !W({}).some(x => /отломится|выпадет сама/.test(x)), W({}));
}

console.log('=== чего модель НЕ обещает — сказано вслух ===');
{
  chk('про «веер» сказано, что его не будет',
      W({}).some(x => /веером/.test(x) && /трения карты о карту/.test(x)), W({}));
  chk('и про то, что печатается В СБОРЕ, тоже',
      W({}).some(x => /В СБОРЕ/.test(x) && /зазор/.test(x)), W({}));
  chk('и про то, что упругие здесь только губы',
      W({}).some(x => /единственн/.test(x)), W({}));
}


/* НАКЛЕЙКА НА ФУТЛЯРЕ (v25.2.0). Пришла она с картинки от человека: наклейка сидела на ПЛОЩАДКЕ
   13.3 × 13.4 × 1.0 мм. Площадка бралась не из прихоти — логотип по умолчанию УТОПЛЕН, а вырезать
   общая машинка не умеет: она ищет плоскость поиском по мешу и кладёт на неё плиту. На полой коробке
   поиск и вовсе находил ДНО КАРМАНА (y = 1.6) и клал наклейку внутрь футляра.

   Теперь грань называет сам футляр, и мнётся она своими же вершинами. Проверяется поэтому не «есть ли
   рельеф», а четыре вещи, каждая из которых ломается молча:

     1. ПЛОЩАДКИ НЕТ. Габарит с утопленной надписью в точности тот же, что без неё, и ни одна вершина не
        выступает за тыльную грань. Габарит один этого не докажет — плита могла бы влезть внутрь, —
        поэтому объём сверяется с площадью рисунка, посчитанной ОТДЕЛЬНО по карте высот.
     2. НАДПИСЬ СНАРУЖИ, А НЕ В КАРМАНЕ. Ровно то, что делал общий путь.
     3. ОСИ НЕ ПЕРЕПУТАНЫ. У призмы и у рамки они разные, и перестановку сетки видно только по форме
        ПЯТНА КРАСКИ: у карточки 30 × 8 перекладина «Т» идёт во всю ширину, а по высоте краска занимает
        0.6 от неё, значит пятно обязано лечь на 30 вдоль X и на 4.8 вдоль Z. И сдвиг «вниз по карточке»
        обязан двигать его вдоль Z, а не вдоль X.
     4. ПОД ВМЯТИНОЙ ОСТАЁТСЯ ОБОЛОЧКА. За ней сразу карман с картами. */
/* ПЕРЕМЫЧКИ В ПАЗУ И ШИРИНА ЛОПАСТИ (v25.5.0) — заказано человеком по картинке: паз шёл во всю длину
   лицевой оболочки, и она была двумя полосами.

   Перемычка не украшение и стоит не «где-нибудь»: стойка толкателя ходит по пазу от дома вперёд на весь
   ход, и всё, что дальше, паз не посещает вовсе. Первая перемычка ставится ровно на конце хода и потому
   работает вторым делом — УПОРОМ: до неё толкатель не удерживало от выхода из устья ничто.

   Проверяется поэтому не «есть ли тело в пазу», а четыре вещи: перемычка ЛЕЖИТ НА КОНЦЕ ХОДА (иначе она либо
   крадёт ход, либо не упор); она СВЯЗЫВАЕТ обе половины (иначе это просто ещё одно тело); лопасть и
   пятка проходят ПОД и НАД ней (иначе толкатель встанет сразу); и лопасть ШИРЕ ПАЗА при любом заказе —
   иначе она провалится в паз и толкатель выйдет наружу. */
console.log('=== перемычки в пазу и ширина лопасти ===');
{
  const zOf = (body) => { let lo = 1e9, hi = -1e9;
    for (const T of body) for (const v of T){ lo = Math.min(lo, v[2]); hi = Math.max(hi, v[2]); }
    return {lo, hi}; };
  const yOf = (body) => { let lo = 1e9, hi = -1e9;
    for (const T of body) for (const v of T){ lo = Math.min(lo, v[1]); hi = Math.max(hi, v[1]); }
    return {lo, hi}; };
  const xOf = (body) => { let lo = 1e9, hi = -1e9;
    for (const T of body) for (const v of T){ lo = Math.min(lo, v[0]); hi = Math.max(hi, v[0]); }
    return {lo, hi}; };
  /* Толкатель — то тело, которое ни с чем не срастается; перемычки — тела, лежащие ЦЕЛИКОМ в пазу по
     высоте. И то и другое находится по мешу, а не по порядку, в котором построитель их клал. */
  const parts = (ov) => { const t = B(ov), cs = shells(t), s = S(ov), gr = glued(cs);
    const solo = gr.find(g => g.length === 1);
    const pusher = solo ? cs[solo[0]] : null;
    const yc1 = s.tF + s.stack;
    const bridges = cs.filter(b => b !== pusher && yOf(b).lo > yc1 && yOf(b).hi < s.H);
    return {t, cs, s, pusher, bridges}; };

  for (const ov of [{}, {chBridge:3}, {chTravel:45}]){
    const {s, pusher, bridges} = parts(ov), tag = ' ' + JSON.stringify(ov);
    chk('перемычек в сетке столько, сколько названо'+tag, bridges.length === s.bridgeN,
        {всетке:bridges.length, названо:s.bridgeN});
    if (!bridges.length || !pusher) continue;
    // 1. ПЕРВАЯ ПЕРЕМЫЧКА — РОВНО НА КОНЦЕ ХОДА
    const back = bridges.map(b => zOf(b).lo).sort((a, b) => a - b)[0];
    const stemFront = zOf(pusher).hi;
    chk('  первая перемычка стоит ровно на конце хода'+tag,
        Math.abs((back - stemFront) - s.travel) < 1e-6,
        {досюда:+(back - stemFront).toFixed(3), ход:s.travel});
    // 2. СВЯЗЫВАЕТ ОБЕ ПОЛОВИНЫ — заходит в тело шире паза, и группа осталась одна
    const bx = xOf(bridges[0]);
    chk('  и заходит в обе половины оболочки, а не висит в пазу'+tag,
        bx.lo < -s.sw/2 - 0.5 && bx.hi > s.sw/2 + 0.5, {перемычка:[+bx.lo.toFixed(2), +bx.hi.toFixed(2)], паз:s.sw});
    // 3. ЛОПАСТЬ ПОД НЕЙ, ПЯТКА НАД НЕЙ
    const by = yOf(bridges[0]), py = yOf(pusher);
    chk('  лопасть проходит под перемычкой, пятка — над ней'+tag,
        by.lo > s.tF + s.stack && by.hi < s.H && py.lo < by.lo && py.hi > by.hi,
        {перемычка:[+by.lo.toFixed(2), +by.hi.toFixed(2)], толкатель:[+py.lo.toFixed(2), +py.hi.toFixed(2)]});
  }
  /* НА УМОЛЧАНИЯХ ПЕРЕМЫЧКА ЕСТЬ. Это решение, а не мелочь: без неё лицевая оболочка — две полосы, и
     толкатель ничем не удержан от выхода из устья. Ноль остаётся возможным, но по заказу. */
  chk('на умолчаниях перемычка стоит', S({}).bridgeN >= 1, S({}).bridgeN);

  // 4. НОЛЬ — ЭТО НОЛЬ, и об этом сказано
  chk('без перемычек их в сетке и нет', parts({chBridge:0}).bridges.length === 0, {});
  chk('  и сказано, чем это кончится',
      W({chBridge:0}).some(x => /перемычек в пазу нет/.test(x) && /из устья/.test(x)), W({chBridge:0}));
  chk('а с перемычкой сказано, что она же упор',
      W({}).some(x => /УПОРОМ/.test(x)), W({}));
  chk('слишком длинный ход не оставляет им места, и это объявлено',
      S({chTravel:60}).bridgeN < 1 || S({chTravel:60}).bridgeCut ||
      W({chTravel:60}).some(x => /перемычк/.test(x)), {перемычек:S({chTravel:60}).bridgeN});

  // ШИРИНА ЛОПАСТИ
  chk('заказанная ширина лопасти берётся как есть', Math.abs(S({chBladeW:20}).bladeW - 20) < 1e-9,
      S({chBladeW:20}).bladeW);
  chk('  и в сетке она именно такая', (() => { const {pusher, s} = parts({chBladeW:20});
      const x = xOf(pusher); return Math.abs((x.hi - x.lo) - 20) < 1e-6; })(), {});
  /* ГРАНИЦЫ НЕ ВКУСОВЫЕ: уже паза — провалится, шире кармана — не влезет. Проверяются обе, и обе
     объявляются. */
  chk('слишком широкая урезается по карману',
      S({chBladeW:60}).bladeWCut && S({chBladeW:60}).bladeW < 2*S({}).xi, S({chBladeW:60}).bladeW);
  chk('слишком узкая поднимается выше паза',
      S({chBladeW:8}).bladeWCut && S({chBladeW:8}).bladeW > S({}).sw, S({chBladeW:8}).bladeW);
  chk('  и при ЛЮБОМ заказе лопасть шире паза — иначе провалится',
      [0, 4, 8, 12, 20, 40, 60].every(v => S({chBladeW:v}).bladeW > S({chBladeW:v}).sw + 1e-9),
      [0, 4, 8, 12, 20, 40, 60].map(v => +S({chBladeW:v}).bladeW.toFixed(1)));
  chk('  об урезании сказано вслух',
      W({chBladeW:60}).some(x => /ширина лопасти урезана/.test(x)), W({chBladeW:60}));
  chk('  а ширина называется всегда, даже когда её не трогали',
      W({}).some(x => /лопасть толкателя/.test(x)), W({}));

  /* МЁРТВАЯ РУЧКА. В панели жила строка «Вылет губы над пачкой» (`chLip`), которую не читал никто:
     осталась от открытого лотка. Рядом был обратный случай — `chPad` читался, а строки не имел. */
  const rows = SHAPE_PARAMS.box.filter(r => r.group === 'Картодержатель').map(r => r.key);
  chk('мёртвой ручки «chLip» в панели больше нет', rows.indexOf('chLip') < 0, rows);
  chk('  а «chPad», который читается, теперь можно задать', rows.indexOf('chPad') >= 0, rows);
  chk('  и он действительно меняет деталь',
      Math.abs(S({chPad:5}).outer.y - S({chPad:1.2}).outer.y - 3.8) < 1e-9,
      {толстая:S({chPad:5}).outer.y, тонкая:S({chPad:1.2}).outer.y});
  chk('  и каждую ручку картодержателя кто-то читает',
      rows.every(k => k === 'chMode' || new RegExp('p\\.' + k + '\\b').test(String(cardSpec))),
      rows.filter(k => k !== 'chMode' && !new RegExp('p\\.' + k + '\\b').test(String(cardSpec))));
}

console.log('=== наклейка: на тыльной оболочке, БЕЗ ПЛОЩАДКИ ===');
{
  const HM = (fn) => { const N = LOGO_HM_SIZE, hm = new Float32Array(N*N);
    for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) hm[j*N+i] = fn((i+0.5)/N, (j+0.5)/N) ? 1 : 0;
    return hm; };
  const TEE = (u, v) => (v > 0.2 && v < 0.35) || (u > 0.42 && u < 0.58 && v > 0.2 && v < 0.8);
  const frac = (fn) => { const N = LOGO_HM_SIZE; let k = 0;
    for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) if (fn((i+0.5)/N, (j+0.5)/N)) k++;
    return k/(N*N); };
  const LG = (ov) => Object.assign({heightmap: HM(TEE), w: 26, h: 14, depth: -0.4, rotation: 0,
    u0: 0, v0: 0, threshold: 0.5, invert: false, face: '+Y'}, ov || {});
  /* Густота сетки задаётся ЯВНО, и низкая здесь не небрежность: на умолчании грань 59 × 108 мм режется
     ячейкой в четверть миллиметра, и это 160 тысяч треугольников — на них проверка связности объёмом
     считалась бы часами. Всё, что меряется числом (объём, габарит), берётся на рабочей густоте. */
  const BL = (ov, lg, res) => { logos.length = 0; boxHoles.length = 0; logos.push(LG(lg));
    const save = logoResolution; logoResolution = res || 8;
    Object.assign(paramState.box, defaultBoxParams(), {chMode:'wallet'}, ov || {});
    const t = buildTrisForShape('box', paramState.box);
    logoResolution = save; logos.length = 0; return t; };
  const WL = (ov, lg) => { logos.length = 0; logos.push(LG(lg));
    const w = collectPrintWarnings(P(ov)) || []; logos.length = 0; return w; };

  const plain = B({}), s = S({});
  const t = BL({}, {});
  const mc = manifoldCheck(t, 4);
  chk('футляр с надписью герметичен и не вывернут', mc.watertight && vol(t) > 0,
      {open:mc.openEdges, bad:mc.badEdges, объём:+vol(t).toFixed(0)});
  chk('  и без совпадающих граней', coplanarPairs(t).hits === 0, coplanarPairs(t).where);
  chk('  рельеф действительно построен', t.length > plain.length*4, {было:plain.length, стало:t.length});

  // 1. ПЛОЩАДКИ НЕТ
  const fine = BL({}, {}, 50);
  const b0 = computeBBox(plain), b1 = computeBBox(fine);
  chk('габарит с утопленной надписью тот же, что без неё',
      Math.abs(b1.minY - b0.minY) < 1e-9 && Math.abs(b1.maxY - b0.maxY) < 1e-9 &&
      Math.abs(b1.minX - b0.minX) < 1e-9 && Math.abs(b1.maxZ - b0.maxZ) < 1e-9,
      {без:[+b0.minY.toFixed(3), +b0.maxY.toFixed(3)], с:[+b1.minY.toFixed(3), +b1.maxY.toFixed(3)]});
  chk('  ни одна вершина не выступает за тыльную грань',
      fine.every(T => T.every(v => v[1] > -1e-9)), fine.filter(T => T.some(v => v[1] < -1e-9)).length);
  /* Объём — против площади рисунка, посчитанной по карте высот ОТДЕЛЬНО от построителя. Габарит один
     ничего не доказал бы: плита толщиной в глубину влезла бы внутрь габарита и осталась площадкой. */
  const area = frac(TEE)*26*14, dV = vol(plain) - vol(fine);
  chk('  и снято ровно столько, сколько занимает рисунок', Math.abs(dV - area*0.4) < area*0.4*0.06,
      {снято:+dV.toFixed(2), рисунок:+(area*0.4).toFixed(2)});

  // 2. НАДПИСЬ СНАРУЖИ, А НЕ В КАРМАНЕ
  const zc = (-s.outer.z/2 + s.tE + s.outer.z/2)/2;
  chk('в самой вмятине воздух', !IN(t, [0, 0.2, zc]), {});
  chk('  а под нею — оболочка', IN(t, [0, 0.6, zc]) && IN(t, [0, s.tF - 0.1, zc]), {});
  chk('  карман с картами не тронут: над оболочкой по-прежнему воздух',
      !IN(t, [0, s.tF + 0.2, zc]), {});
  /* Дно кармана осталось плоским: в полосе над ним, ТАМ ГДЕ ЛЕЖИТ НАДПИСЬ, нет ни одной вершины.
     Толкатель тоже начинает свою пятку чуть выше дна, но стоит он у задней стенки, а надпись — посреди
     футляра, поэтому полоса берётся вокруг неё. */
  chk('  и дно кармана осталось плоским — рельефа внутри футляра нет',
      t.every(T => T.every(v => !(v[1] > s.tF + 1e-6 && v[1] < s.tF + 0.39 &&
                                  Math.abs(v[0]) < 15 && Math.abs(v[2] - zc) < 12))), {});

  // 3. ОСИ НЕ ПЕРЕПУТАНЫ
  /* Пятно вмятины — это вершины, отодвинутые от тыльной грани, но не дошедшие до кармана. Задняя
     стенка тоже начинается с 0.4, поэтому её торец отсекается по z. */
  const patch = (tt) => { const lo = [1e9,1e9], hi = [-1e9,-1e9];
    for (const T of tt) for (const v of T)
      if (v[1] > 1e-6 && v[1] < s.tF - 1e-6 && v[2] > -s.outer.z/2 + s.tE + 1){
        lo[0] = Math.min(lo[0], v[0]); hi[0] = Math.max(hi[0], v[0]);
        lo[1] = Math.min(lo[1], v[2]); hi[1] = Math.max(hi[1], v[2]); }
    return {w:hi[0]-lo[0], d:hi[1]-lo[1], cx:(lo[0]+hi[0])/2, cz:(lo[1]+hi[1])/2}; };
  /* Рисунок 30 × 8: перекладина «Т» идёт во всю ширину карточки, а по высоте краска занимает 0.6 от
     неё (v от 0.2 до 0.8) — то есть 30 мм вдоль U и 4.8 вдоль V. Меряется ПЯТНО КРАСКИ, а не карточка,
     поэтому число второе, а не восемь. */
  const wide = patch(BL({}, {w:30, h:8}, 24));
  chk('рисунок 30 × 8 ложится на 30 вдоль X и на 4.8 вдоль Z',
      Math.abs(wide.w - 30) < 1.5 && Math.abs(wide.d - 4.8) < 1.5, {X:+wide.w.toFixed(2), Z:+wide.d.toFixed(2)});
  const moved = patch(BL({}, {v0: 12}, 24)), home = patch(BL({}, {}, 24));
  chk('  а сдвиг по V двигает пятно вдоль Z, и только вдоль него',
      Math.abs(moved.cz - home.cz - 12) < 1.0 && Math.abs(moved.cx - home.cx) < 0.5,
      {dz:+(moved.cz - home.cz).toFixed(2), dx:+(moved.cx - home.cx).toFixed(2)});

  // 4. ПОД ВМЯТИНОЙ ОСТАЁТСЯ ОБОЛОЧКА
  const deep = BL({}, {depth: -3});
  let maxDent = 0;
  for (const T of deep) for (const v of T)
    if (v[1] < s.tF - 1e-6 && v[2] > -s.outer.z/2 + s.tE + 1) maxDent = Math.max(maxDent, v[1]);
  chk('глубокая надпись зажата толщиной оболочки', maxDent <= s.tF - CARD_LOGO_KEEP + 1e-6,
      {вмятина:+maxDent.toFixed(3), можно:+(s.tF - CARD_LOGO_KEEP).toFixed(3)});
  chk('  и глубина эта — та самая, что заказана правилом, а не меньшая',
      Math.abs(maxDent - (s.tF - CARD_LOGO_KEEP)) < 1e-6, +maxDent.toFixed(3));
  chk('  оболочка под нею цела', IN(deep, [0, s.tF - 0.1, zc]), {});
  chk('  а о зажиме сказано вслух', WL({}, {depth:-3}).some(x => /глубина надписи ограничена/.test(x)),
      WL({}, {depth:-3}));

  // СВЯЗНОСТЬ не сломана: наклейка — это сама оболочка, а не ещё одно тело
  const cs = shells(t);
  chk('с надписью тел по-прежнему столько же', cs.length === 5 + S({}).bridgeN, {тел:cs.length});
  chk('  и групп по-прежнему две', glued(cs).length === 2, {групп:glued(cs).length});

  // ВЫПУКЛАЯ надпись: строится, но про стол сказано
  const up = BL({}, {depth: 0.6});
  chk('выпуклая надпись выходит за тыльную грань ровно на свою высоту',
      Math.abs(computeBBox(up).minY - (b0.minY - 0.6)) < 1e-6, {y:+computeBBox(up).minY.toFixed(3)});
  chk('  и про первый слой сказано вслух', WL({}, {depth:0.6}).some(x => /ВЫПУКЛАЯ/.test(x)),
      WL({}, {depth:0.6}));
  chk('  а на утопленной этого не говорится', !WL({}, {}).some(x => /ВЫПУКЛАЯ/.test(x)), WL({}, {}));

  // ГРАНЬ НАЗВАНА, и сказано, что оси карточки футляр не читает
  chk('грань названа человеку', WL({}, {}).some(x => /ТЫЛЬНУЮ ОБОЛОЧКУ/.test(x)), WL({}, {}));
  chk('  и сказано, что площадки нет', WL({}, {}).some(x => /ПЛОЩАДКИ ПОД НАДПИСЬЮ НЕТ/.test(x)), WL({}, {}));
  /* ПОДЛОЖКА — ВЫБОР, а не случайность. Ручка, которая на этой форме не делает ничего, тут считается
     дефектом не меньшим, чем площадка, которой не просили. Поэтому проверяется обе стороны: с нулём
     накладки нет вовсе, с заказанной — она есть, ровно заказанной толщины, и оболочка при ней не
     мнётся (вмятина под бляшкой была бы работой впустую). */
  /* Толщина взята 2.0, а не 1.0, и это не всё равно: у утопленного логотипа накладка сама по себе
     выходит не тоньше `-глубина + 0.6`, то есть при глубине 0.4 ровно в миллиметр. Проверка на
     миллиметре прошла бы и с НЕПЕРЕДАННЫМ параметром — мутация это и показала. */
  const withPlate = BL({logoPlate: 2.0}, {});
  chk('заказанная подложка выходит за тыльную грань на свою толщину',
      Math.abs(computeBBox(withPlate).minY - (b0.minY - 2.0)) < 1e-6,
      {y:+computeBBox(withPlate).minY.toFixed(3)});
  chk('  и она герметична, без совпадающих граней',
      manifoldCheck(withPlate, 4).watertight && coplanarPairs(withPlate).hits === 0,
      {open:manifoldCheck(withPlate, 4).openEdges, coplanar:coplanarPairs(withPlate).where});
  const bodyOf = (ov, lg) => { logos.length = 0; if (lg) logos.push(LG(lg));
    const save = logoResolution; logoResolution = 8;
    const t = buildCardHolder(P(ov)); logoResolution = save; logos.length = 0; return t; };
  chk('  а оболочка под нею НЕ промята — работа впустую',
      bodyOf({logoPlate:2.0}, {}).length === bodyOf({}, null).length &&
      bodyOf({}, {}).length > bodyOf({}, null).length,
      {сподложкой:bodyOf({logoPlate:1.0}, {}).length, безлого:bodyOf({}, null).length,
       свмятиной:bodyOf({}, {}).length});
  chk('  и про подложку сказано вслух',
      WL({logoPlate:2.0}, {}).some(x => /ПОДЛОЖКА 2.0 мм/.test(x)), WL({logoPlate:2.0}, {}));
  chk('  а без логотипа про надпись не говорится ничего', !W({}).some(x => /ТЫЛЬНУЮ ОБОЛОЧКУ/.test(x)), W({}));

  /* ПОВЕРХНОСТЬ ОДНА — и в списке на карточке логотипа она тоже одна. Семь осей, ни одна из которых
     ничего не меняет, — это молчаливый холостой ход в самом заметном месте; у подставки такое уже
     ловили. И наоборот: логотип, сохранённый на оси (в старом файле или перенесённый с куба), обязан
     строиться так же — грань у футляра всё равно одна. */
  chk('на карточке логотипа у футляра ровно одна поверхность',
      facesForShape(P({})).length === 1 && facesForShape(P({}))[0] === 'chback', facesForShape(P({})));
  chk('  у неё есть и подпись, и оси смещения',
      !!FACE_LABELS['chback'] && (FACE_AXIS_LABELS['chback']||[]).length === 2,
      [FACE_LABELS['chback'], FACE_AXIS_LABELS['chback']]);
  chk('  а на обычной коробке список осей прежний',
      facesForShape(defaultBoxParams()).length === ALL_FACES.length, facesForShape(defaultBoxParams()).length);
  const byAxis = BL({}, {face:'+Y'}), byName = BL({}, {face:'chback'});
  chk('  логотип со старой осью строится ровно так же, как с названной поверхностью',
      byAxis.length === byName.length && Math.abs(vol(byAxis) - vol(byName)) < 1e-9,
      {ось:byAxis.length, поверхность:byName.length});

  /* ПЕРЕКЛЮЧИЛИ ФОРМУ — приложение обязано устоять. Имя грани хранится на карточке логотипа, а наборы
     граней у форм разные; ушёл человек с футляра на обычную коробку — имя осталось от футляра, и оси у
     него там нет. Кончалось это ИСКЛЮЧЕНИЕМ, а не потерянной надписью: `FACE_AXES['chback']` не
     функция, и коробка не строилась вовсе. То же самое было и с поверхностями подставки — то есть
     дефект этот старше футляра. */
  const other = (face) => { logos.length = 0; logos.push(LG({face}));
    Object.assign(paramState.box, defaultBoxParams());
    let t = null, err = null;
    try { t = buildTrisForShape('box', paramState.box); } catch(e){ err = e.message; }
    logos.length = 0; return {t, err}; };
  /* И обратная сторона того же: РАЗМЕР наклейки на футляре меряется его собственной гранью, а не
     гранями куба, который здесь не строится. Куб дал бы потолок в 37 мм при тыльной оболочке 59 × 108. */
  const sized = (w) => { logos.length = 0;
    Object.assign(paramState.box, defaultBoxParams(), {chMode:'wallet'});
    const lg = LG({w, h: 20}); logos.push(lg); clampLogoToFace(lg);
    const got = lg.w; logos.length = 0; return got; };
  chk('размер наклейки меряется гранью футляра, а не кубом', sized(80) === 80, sized(80));

  const fromCase = other('chback'), fromStand = other('floor');
  chk('логотип с гранью футляра не роняет обычную коробку',
      !fromCase.err && fromCase.t && fromCase.t.length > 0, fromCase.err);
  chk('  и с поверхностью подставки тоже — дефект был общий',
      !fromStand.err && fromStand.t && fromStand.t.length > 0, fromStand.err);

  // ЦВЕТНАЯ ПЕЧАТЬ: пробка — это ТОЛЬКО пробка, и сидит она в кармане
  const ink = (k) => { logos.length = 0;
    logos.push(Object.assign(LG({depth:-0.6}), {levels: 3}));
    const save = logoResolution; logoResolution = 12;
    Object.assign(paramState.box, defaultBoxParams(), {chMode:'wallet', logoAms:'ink'+k});
    const tt = buildTrisForShape('box', paramState.box);
    logoResolution = save; logos.length = 0; return tt; };
  const plug = ink(1);
  chk('цветная деталь строится и герметична', plug.length > 0 && manifoldCheck(plug, 4).watertight,
      {tris:plug.length});
  const pb = plug.length ? computeBBox(plug) : null;
  chk('  и она ТОЛЬКО пробка, а не второй футляр', plug.length > 0 && vol(plug) < vol(plain)*0.05,
      {объём:plug.length ? +vol(plug).toFixed(2) : 0});
  /* Пробка ЗАПОДЛИЦО с гранью — не «не выше» её. Разница в полтора десятка сотых, и молчаливая: пробка,
     отсчитанная как для накладки, а не для вмятины, села бы на 0.15 мм ниже лица, и цвет ушёл бы в
     ямку. Проверка «не выступает» такое пропускает, проверка «ровно на грани» — нет. */
  chk('  пробка выходит ровно на тыльную грань, заподлицо', !!pb && Math.abs(pb.minY) < 1e-9,
      pb && +pb.minY.toFixed(3));
  chk('  и уходит глубже дна вмятины — проникновением, а не касанием',
      !!pb && pb.maxY > 0.6 + 1e-6, pb && +pb.maxY.toFixed(3));
  /* Пробка и вмятина режутся РАЗНЫМИ сетками — панель своей, пробка своей, — и сходиться они обязаны в
     одном месте. Сетки считают по-разному, а вот РАМКА у них одна, и если она соскользнёт, пробка ляжет
     мимо кармана: тело герметично, пробка герметична, а на печати цвет рядом с надписью. */
  const dpat = patch(BL({}, {depth:-0.6}, 12));
  chk('  и лежит там же, где вмятина, а не рядом',
      !!pb && Math.abs((pb.minX + pb.maxX)/2 - dpat.cx) < 1.0 &&
              Math.abs((pb.minZ + pb.maxZ)/2 - dpat.cz) < 1.0,
      pb && {пробка:[+((pb.minX+pb.maxX)/2).toFixed(2), +((pb.minZ+pb.maxZ)/2).toFixed(2)],
             вмятина:[+dpat.cx.toFixed(2), +dpat.cz.toFixed(2)]});
}

console.log('\n=== TOTAL:', pass, 'passed,', fail, 'failed ===');
if (fail) process.exitCode = 1;
