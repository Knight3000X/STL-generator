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
  chk('тел ровно пять'+tag, cs.length === 5, {тел:cs.length});
  const gr = glued(cs);
  chk('  и они срастаются РОВНО В ДВЕ группы: футляр и толкатель'+tag, gr.length === 2,
      {групп:gr.length, размеры:gr.map(g => g.length)});
  chk('  причём в футляре четыре тела, в толкателе одно'+tag,
      gr.length === 2 && gr.map(g => g.length).sort((a,b)=>a-b).join(',') === '1,4',
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

console.log('\n=== TOTAL:', pass, 'passed,', fail, 'failed ===');
if (fail) process.exitCode = 1;
