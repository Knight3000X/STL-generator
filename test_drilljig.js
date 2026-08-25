// Кондуктор для сверления: плита с отверстиями и упор по кромке.
//
// В наборе было чем МЕРИТЬ и нечем разметить. Кондуктор закрывает это, и проверяется в нём не «похоже
// ли на плиту с дырками», а то, что ломается тихо:
//
//   1. ОТВЕРСТИЕ ПОД СВЕРЛО И ОТВЕРСТИЕ ПОД ВТУЛКУ — РАЗНЫЕ ЧИСЛА. Под сверло идёт припуск, потому что
//      печать сужает круглые проёмы; под втулку припуска НЕТ вовсе — её сажают в натяг, и добавленная
//      десятая доля превратила бы посадку в болтанку. Перепутать их местами — ошибка, которую видно
//      только на готовой детали.
//
//   2. ОТВЕРСТИЕ ПРОТКНУТО НАСКВОЗЬ. `buildBoxWithHoles` ВЫБРАСЫВАЕТ отверстие, налезающее на соседнее,
//      — молча, ради герметичности. Кондуктор с шагом мельче диаметра — ровно тот случай.
//
//   3. ОТСТУП ОТ УПОРА УРЕЗАЕТСЯ, И ОБ ЭТОМ ГОВОРЯТ. Отверстие у самой кромки лопнет при первой же
//      посадке втулки; молча подвинуть его значило бы отдать кондуктор с не тем размером — а размер
//      здесь и есть всё изделие.
//
//   4. УПОР ПЕРЕСЕКАЕТСЯ С ПЛИТОЙ ОБЪЁМОМ, А НЕ ГРАНЬЮ. Два тела, сложенные заподлицо, дают совпадающие
//      грани, и проверка герметичности их не видит: она сшивает рёбра, а у совпадающей пары все рёбра
//      парны.
//
//   5. НАКЛОННЫЙ КАНАЛ ДЕЙСТВИТЕЛЬНО НАКЛОНЁН, И ИМЕННО НА ЗАКАЗАННЫЙ УГОЛ. Здесь легко получить
//      деталь, которая ГЕРМЕТИЧНА, ВЫГЛЯДИТ ПРАВДОПОДОБНО И НЕ РАБОТАЕТ: паз в плите есть, трубка в
//      пазу есть, а сверло в них не проходит — или проходит, но не под тем углом и не оттуда, откуда
//      отмерян отступ. Ровно на этом уже попалась рейка французской планки: наклон граней совпал,
//      зацепления не было, а проверка сравнивала наклоны и купилась.
//
//      Поэтому наклон здесь проверяется НЕ СРАВНЕНИЕМ ЧИСЕЛ, А СВЕРЛОМ: в готовую сетку запускается
//      цилиндр диаметром со сверло, и требуется, чтобы под заказанным углом из заказанной точки он
//      прошёл насквозь, а сдвинутый на миллиметр или повёрнутый на шесть градусов — упёрся. Отверстие
//      печатается с припуском в две десятых, так что «прошёл» и «упёрся» здесь различимы.
//
//   6. ДЛИНА НАПРАВЛЯЮЩЕЙ — ЭТО ЗАКАЗАННОЕ ЧИСЛО, А НЕ ТОЛЩИНА ПЛИТЫ. При наклоне ведёт сверло трубка,
//      а не плита, и плита толще трубки на её наклонённые торцы. Меряется ПО СЕТКЕ: на каком протяжении
//      вокруг канала есть материал.
//
// Run: ./run-all.sh

let pass = 0, fail = 0;
function chk(name, cond, extra){
  if (cond) { pass++; console.log('  OK  ', name); }
  else { fail++; console.log('  FAIL', name, extra !== undefined ? JSON.stringify(extra) : ''); }
}
const J  = ov => Object.assign({}, defaultBoxParams(), {mntMode:'drilljig'}, ov || {});
const sp = ov => drillJigSpec(J(ov));
const raw = ov => buildDrillJig(J(ov));
const W  = ov => collectPrintWarnings(J(ov));
const bboxOf = t => { const b = {x:[1e9,-1e9], y:[1e9,-1e9], z:[1e9,-1e9]};
  for (const T of t) for (const v of T){
    b.x[0]=Math.min(b.x[0],v[0]); b.x[1]=Math.max(b.x[1],v[0]);
    b.y[0]=Math.min(b.y[0],v[1]); b.y[1]=Math.max(b.y[1],v[1]);
    b.z[0]=Math.min(b.z[0],v[2]); b.z[1]=Math.max(b.z[1],v[2]); } return b; };
/* Луч вверх из точки (x, z): сколько раз протыкает тело. Смещён на сотую миллиметра — пущенный точно из
   центра прямоугольной грани, он попадает в диагональ между её треугольниками, строгий тест отвергает
   оба, и «материала нет» получается на сплошной плите. */
const rayHits = (tris, x0, z0) => {
  const x = x0 + 0.013, z = z0 + 0.0071; let n = 0;
  for (const T of tris){
    const e1 = sub(T[1], T[0]), e2 = sub(T[2], T[0]), d = [0, 1, 0];
    const h = cross(d, e2), a = e1[0]*h[0] + e1[1]*h[1] + e1[2]*h[2];
    if (Math.abs(a) < 1e-12) continue;
    const sv = [x - T[0][0], -1e6 - T[0][1], z - T[0][2]], f = 1/a;
    const u = f*(sv[0]*h[0] + sv[1]*h[1] + sv[2]*h[2]);
    if (u < 1e-9 || u > 1 - 1e-9) continue;
    const q = cross(sv, e1), v = f*(d[0]*q[0] + d[1]*q[1] + d[2]*q[2]);
    if (v < 1e-9 || u + v > 1 - 1e-9) continue;
    if (f*(e2[0]*q[0] + e2[1]*q[1] + e2[2]*q[2]) > 1e-9) n++;
  } return n; };
/* ЧИСЛО ОБОРОТОВ, А НЕ ЧЁТНОСТЬ. Наклонный кондуктор — это ДВА пересекающихся замкнутых тела (плита с
   пазом и трубка-направляющая), и счёт пересечений по чётности на них врёт: точка в стенке трубки лежит
   внутри одного тела и снаружи другого, и парность даёт «снаружи». Складывается знак нормали: выход из
   тела +1, вход −1; снаружи всего — ноль, внутри k наложенных тел — k. Луч взят косой, чтобы не ложиться
   ни на одну грань сетки. */
const WDIR = [0.113, 0.2317, 0.9661];
/* Луч один и тот же для всех точек, поэтому всё, что зависит только от треугольника, считается ОДИН
   РАЗ на сетку: h = d×e₂, 1/(e₁·h) и знак нормали. Дальше на точку остаётся полтора десятка умножений
   без единого нового массива. Это не украшение: щупов здесь десятки тысяч на сетку в две с половиной
   тысячи треугольников, и наивная запись через sub/cross/dot уводила один прогон файла за десять минут. */
function prepMesh(tris){
  const N = tris.length, A = new Float64Array(N*14);
  let m = 0;
  for (let i = 0; i < N; i++){
    const T = tris[i], p = T[0];
    const e1x = T[1][0]-p[0], e1y = T[1][1]-p[1], e1z = T[1][2]-p[2];
    const e2x = T[2][0]-p[0], e2y = T[2][1]-p[1], e2z = T[2][2]-p[2];
    const hx = WDIR[1]*e2z - WDIR[2]*e2y, hy = WDIR[2]*e2x - WDIR[0]*e2z, hz = WDIR[0]*e2y - WDIR[1]*e2x;
    const a = e1x*hx + e1y*hy + e1z*hz;
    if (Math.abs(a) < 1e-12) continue;                       // луч в плоскости треугольника — не пересечёт
    const nx = e1y*e2z - e1z*e2y, ny = e1z*e2x - e1x*e2z, nz = e1x*e2y - e1y*e2x;
    const o = m*14; m++;
    A[o]=p[0]; A[o+1]=p[1]; A[o+2]=p[2];
    A[o+3]=e1x; A[o+4]=e1y; A[o+5]=e1z;
    A[o+6]=e2x; A[o+7]=e2y; A[o+8]=e2z;
    A[o+9]=hx; A[o+10]=hy; A[o+11]=hz;
    A[o+12]=1/a;
    A[o+13]=(nx*WDIR[0] + ny*WDIR[1] + nz*WDIR[2]) > 0 ? 1 : -1;
  }
  return {A, m};
}
function windAt(M, px, py, pz){
  const A = M.A; let n = 0;
  for (let i = 0, o = 0; i < M.m; i++, o += 14){
    const svx = px-A[o], svy = py-A[o+1], svz = pz-A[o+2], f = A[o+12];
    const u = f*(svx*A[o+9] + svy*A[o+10] + svz*A[o+11]);
    if (u < 1e-9 || u > 1 - 1e-9) continue;
    const e1x = A[o+3], e1y = A[o+4], e1z = A[o+5];
    const qx = svy*e1z - svz*e1y, qy = svz*e1x - svx*e1z, qz = svx*e1y - svy*e1x;
    const v = f*(WDIR[0]*qx + WDIR[1]*qy + WDIR[2]*qz);
    if (v < 1e-9 || u + v > 1 - 1e-9) continue;
    if (f*(A[o+6]*qx + A[o+7]*qy + A[o+8]*qz) <= 1e-9) continue;
    n += A[o+13];
  }
  return n;
}
// Сдвиг детали по Y: буфер пересчитывается по габариту перед выдачей, и «низ плиты» уже не −T/2.
const yShiftOf = (tris, s) => bboxOf(tris).y[0] + s.T/2;
/* СВЕРЛО. Цилиндр Ø drill с осью через (cx, РАБОЧАЯ грань, zw) под углом adeg к нормали плиты, идущий
   от рабочей грани вглубь. Возвращает, прошёл ли он, не задев материала. Рабочая грань — та, что
   ложится на заготовку (+Y): кондуктор в работе переворачивают, и отступ от упора отмерян именно там. */
function drillFits(M, s, shiftY, cx, zw, adeg){
  const ca = Math.cos(adeg*Math.PI/180), sa = Math.sin(adeg*Math.PI/180), R = s.drill/2;
  const oy = s.T/2 + shiftY, yLo = -s.T/2 + shiftY + 0.02;
  for (let i = 0; i <= 24; i++){
    const L = i/24*(s.T/ca), by = oy - ca*L, bz = zw + sa*L;
    for (const rr of [0, R*0.55, R]) for (let k = 0; k < 8; k++){
      const ph = k*Math.PI/4, c = Math.cos(ph)*rr, d = Math.sin(ph)*rr;
      const y = by + d*sa;
      if (y < yLo) continue;
      if (windAt(M, cx + c, y, bz + d*ca) !== 0) return false;
    }
  }
  return true;
}
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
    const mid = T => [(T[0][0]+T[1][0]+T[2][0])/3, (T[0][1]+T[1][1]+T[2][1])/3];
    for (let a = 0; a < polys.length; a++) for (let b = a+1; b < polys.length; b++)
      if (inside(mid(polys[a]), polys[b]) || inside(mid(polys[b]), polys[a])){
        hits++; if (!where) where = {plane:k, a:list[a], b:list[b]}; }
  }
  return { hits, where };
}

console.log('=== отверстие под сверло и отверстие под втулку — разные числа ===');
{
  /* Под сверло идёт припуск: печать сужает круглые проёмы, и сверло в номинальное отверстие не входит.
     Под втулку припуска НЕТ вовсе — её сажают в натяг. Перепутать их местами значит либо отдать
     кондуктор, в который сверло не лезет, либо втулку, которая в нём болтается. */
  chk('под сверло — с припуском', Math.abs(sp({jigHoleD:8}).holeD - 8.2) < 1e-9, sp({jigHoleD:8}).holeD);
  chk('и припуск ровно в две десятых', Math.abs(sp({jigHoleD:5}).holeD - 5.2) < 1e-9, sp({jigHoleD:5}).holeD);
  chk('под втулку — БЕЗ припуска', Math.abs(sp({jigHoleD:8, jigBush:10}).holeD - 10) < 1e-9,
      sp({jigHoleD:8, jigBush:10}).holeD);
  chk('и втулка перебивает сверло', sp({jigHoleD:16, jigBush:6}).holeD === 6, sp({jigHoleD:16, jigBush:6}).holeD);
  chk('нулевая втулка — это «без втулки», а не Ø0',
      Math.abs(sp({jigHoleD:8, jigBush:0}).holeD - 8.2) < 1e-9);
  // ...и это доходит до сетки, а не остаётся в спецификации
  const wide = t => { let lo = 1e9, hi = -1e9;
    for (const T of t) for (let i = 0; i < 3; i++){ const a = T[i], b = T[(i+1)%3];
      if ((a[1])*(b[1]) > 0) continue; const d = b[1]-a[1]; if (Math.abs(d) < 1e-12) continue;
      const u = -a[1]/d, x = a[0] + u*(b[0]-a[0]), z = a[2] + u*(b[2]-a[2]);
      if (Math.abs(z - (sp({}).edge - sp({}).D/2)) > 0.5 || Math.abs(x) > 6) continue;
      lo = Math.min(lo, x); hi = Math.max(hi, x); }
    return hi - lo; };
  chk('в сетке отверстие того же диаметра, что в спецификации',
      Math.abs(wide(raw({})) - sp({}).holeD) < 0.05, [wide(raw({})), sp({}).holeD]);
}

console.log('\n=== отверстия проткнуты насквозь и их столько, сколько заказано ===');
{
  /* buildBoxWithHoles выбрасывает отверстие, налезающее на соседнее, молча — ради герметичности. Шаг
     мельче диаметра ровно тот случай, и панель тогда говорит «6», а в плите три дырки. */
  /* Щуп идёт СТРОГО ВНУТРИ плиты: у самого края луч не встречает материала и без всякого отверстия,
     и такой счётчик насчитал бы на одну дырку больше. Ошибка тихая — она даёт «больше, чем заказано»,
     то есть выглядит как избыток, а не как недостача. */
  const holesIn = (t, s) => { let n = 0, was = false;
    const cq = s.edge - s.D/2;
    for (let x = -s.W/2 + 0.6; x <= s.W/2 - 0.6; x += 0.15){
      const here = rayHits(t, x, cq) === 0;
      if (here && !was) n++; was = here; }
    return n; };
  for (const n of [1, 2, 3, 6, 12]){
    const s = sp({jigHoleN:n}), t = raw({jigHoleN:n});
    chk('заказано ' + n + ' — просверлено столько же', holesIn(t, s) === n, holesIn(t, s));
  }
  const s = sp({});
  chk('между отверстиями плита цела',
      rayHits(raw({}), s.xs[0] + s.pitch/2, s.edge - s.D/2) === 2,
      rayHits(raw({}), s.xs[0] + s.pitch/2, s.edge - s.D/2));
  chk('и у самого упора тоже', rayHits(raw({}), 0, -s.D/2 + 1) > 0);
  // Шаг доходит до сетки: расстояние между крайними осями — ровно (n−1)·шаг.
  chk('шаг соблюдён', Math.abs((s.xs[s.n-1] - s.xs[0]) - (s.n - 1)*s.pitch) < 1e-9,
      [s.xs[s.n-1] - s.xs[0], (s.n - 1)*s.pitch]);
  chk('и оси симметричны относительно середины плиты',
      Math.abs(s.xs[0] + s.xs[s.n-1]) < 1e-9, [s.xs[0], s.xs[s.n-1]]);
  chk('шире шаг — шире плита', sp({jigPitch:64}).W > sp({jigPitch:32}).W + 30);

  /* ШАГ УРЕЗАЕТСЯ СНИЗУ, И ОБ ЭТОМ ГОВОРЯТ. Причина двойная: тонкая перемычка между направляющими
     крошится, а построитель плиты вдобавок ВЫБРАСЫВАЕТ отверстие, чей блок в сетке касается соседнего,
     — молча, ради герметичности. Панель тогда сказала бы «12», а в плите оказалось бы семь. */
  const tight = sp({jigHoleN:6, jigPitch:5, jigHoleD:8});
  chk('слишком частый шаг поднимают', tight.pitch > 5, tight.pitch);
  chk('и ровно до 2.6 диаметров плюс миллиметр',
      Math.abs(tight.pitch - (tight.holeD*2.6 + 1)) < 1e-9, [tight.pitch, tight.holeD]);
  chk('урезание помечено', tight.pitchCut === true);
  chk('и названо вслух', W({jigHoleN:6, jigPitch:5}).some(x => /шаг поднят с/.test(x)),
      W({jigHoleN:6, jigPitch:5}));
  chk('просторный шаг не трогают', sp({jigPitch:64}).pitchCut === false);
  chk('и у одного отверстия шага нет вовсе', sp({jigHoleN:1, jigPitch:5}).pitchCut === false);
  chk('толще сверло — больше минимальный шаг',
      sp({jigHoleN:6, jigPitch:5, jigHoleD:16}).pitch > sp({jigHoleN:6, jigPitch:5, jigHoleD:2}).pitch);
  // ...и после урезания все отверстия на месте, а не семь из двенадцати
  const s6 = sp({jigHoleN:6, jigPitch:5});
  chk('и после урезания просверлены все', holesIn(raw({jigHoleN:6, jigPitch:5}), s6) === 6,
      holesIn(raw({jigHoleN:6, jigPitch:5}), s6));
  /* ГУСТОТА СЕТКИ СЧИТАЕТСЯ ОТ ШАГА, а не от габарита: длинная планка с редкими отверстиями иначе
     получала бы клетку крупнее самого отверстия. Ровно на этом двенадцать отверстий превращались в
     семь — и проверка ниже прогоняет самые длинные плиты, какие панель вообще даёт. */
  for (const [nn, pp, dd] of [[12, 200, 8], [12, 32, 16], [12, 100, 2], [8, 150, 12]]){
    const s2 = sp({jigHoleN:nn, jigPitch:pp, jigHoleD:dd});
    chk('длинная планка ' + nn + '×Ø' + dd + ' шаг ' + pp + ' — все отверстия на месте',
        holesIn(raw({jigHoleN:nn, jigPitch:pp, jigHoleD:dd}), s2) === nn,
        {дали: holesIn(raw({jigHoleN:nn, jigPitch:pp, jigHoleD:dd}), s2), надо: nn, W: +s2.W.toFixed(0), res: s2.res});
  }
  chk('густота растёт вместе с плитой', sp({jigHoleN:12, jigPitch:200}).res > sp({jigHoleN:2, jigPitch:32}).res,
      [sp({jigHoleN:2, jigPitch:32}).res, sp({jigHoleN:12, jigPitch:200}).res]);
}

console.log('\n=== отступ от упора урезается, и об этом говорят ===');
{
  const near = sp({jigEdge:2, jigHoleD:8});
  chk('к самой кромке отверстие не пускают', near.edge > 2, near.edge);
  chk('и оставляют ровно радиус плюс четыре миллиметра',
      Math.abs(near.edge - (near.r + 4)) < 1e-9, [near.edge, near.r]);
  chk('урезание помечено', near.edgeCut === true);
  chk('и названо вслух', W({jigEdge:2}).some(x => /отступ от упора поднят/.test(x)), W({jigEdge:2}));
  const ok = sp({jigEdge:20});
  chk('а просторный отступ не трогают', Math.abs(ok.edge - 20) < 1e-9 && ok.edgeCut === false, ok.edge);
  chk('и молчат про него', !W({jigEdge:20}).some(x => /отступ от упора/.test(x)));
  chk('толще сверло — дальше отодвигают', sp({jigEdge:1, jigHoleD:16}).edge > sp({jigEdge:1, jigHoleD:2}).edge);
  // ...и в сетке отверстие стоит там, куда его отодвинули
  const t = raw({jigEdge:2}), s2 = sp({jigEdge:2});
  chk('в сетке ось отверстия — на урезанном отступе',
      rayHits(t, s2.xs[0], s2.edge - s2.D/2) === 0 && rayHits(t, s2.xs[0], 2 - s2.D/2) > 0,
      [rayHits(t, s2.xs[0], s2.edge - s2.D/2), rayHits(t, s2.xs[0], 2 - s2.D/2)]);
}

console.log('\n=== упор ===');
{
  const s = sp({}), t = raw({});
  const b = bboxOf(t);
  chk('упор поднимает деталь выше плиты', b.y[1] - b.y[0] > s.T + 1, [b.y[1]-b.y[0], s.T]);
  chk('и ровно на свою высоту', Math.abs((b.y[1] - b.y[0]) - (s.T + s.fence)) < 1e-6,
      [b.y[1]-b.y[0], s.T + s.fence]);
  const none = bboxOf(raw({jigFence:0}));
  chk('без упора остаётся одна плита', Math.abs((none.y[1] - none.y[0]) - s.T) < 1e-6,
      [none.y[1]-none.y[0], s.T]);
  chk('и она мельче по глубине', (none.z[1] - none.z[0]) < (b.z[1] - b.z[0]), [none.z[1]-none.z[0], b.z[1]-b.z[0]]);
  chk('выше упор — выше деталь', bboxOf(raw({jigFence:40})).y[1] - bboxOf(raw({jigFence:40})).y[0] >
      (b.y[1] - b.y[0]) + 20);
  /* УПОР УТОПЛЕН В ПЛИТУ, А НЕ ПРИСТАВЛЕН К НЕЙ. Приставленный даёт совпадающие грани — деталь при этом
     остаётся герметичной, объём верным, а слайсер видит две поверхности в одном месте. */
  chk('совпадающих граней нет', coplanarPairs(t).hits === 0, coplanarPairs(t).where);
  chk('и без упора тоже', coplanarPairs(raw({jigFence:0})).hits === 0);
}

console.log('\n=== про пластик и про тонкую плиту сказано ===');
{
  chk('без втулки предупреждают про износ',
      W({}).some(x => /пластик ведёт сверло на десяток отверстий/.test(x)), W({}));
  chk('со втулкой — молчат', !W({jigBush:10}).some(x => /пластик ведёт сверло/.test(x)), W({jigBush:10}));
  /* ТОЛЩИНА ПЛИТЫ — ОНА ЖЕ ДЛИНА НАПРАВЛЯЮЩЕЙ, и короче полутора диаметров сверла она не ведёт вовсе.
     Порог назван числом, а не «на глаз»: плечо короче диаметра не держит сверло от увода, и это
     единственное, ради чего кондуктор существует. */
  chk('тонкая плита названа', W({jigBush:10, jigT:6, jigHoleD:8}).some(x => /направляющая короче полутора/.test(x)),
      W({jigBush:10, jigT:6, jigHoleD:8}));
  chk('и порог — полтора диаметра', !W({jigBush:10, jigT:12, jigHoleD:8}).some(x => /направляющая короче/.test(x)) &&
      W({jigBush:10, jigT:11.9, jigHoleD:8}).some(x => /направляющая короче/.test(x)));
  chk('умолчания не ругаются толщиной',
      !W({jigBush:10}).some(x => /направляющая короче/.test(x)), W({jigBush:10}));
}

console.log('\n=== вся область значений ===');
{
  let bad = 0, worst = null, cop = 0, copAt = null, n = 0;
  for (const d of [2, 8, 16])
    for (const nn of [1, 3, 12])
      for (const pitch of [5, 32, 200])
        for (const T of [4, 40])
          for (const fence of [0, 40])
            for (const bush of [0, 20])
              for (const edge of [1, 120]){
                const ov = {jigHoleD:d, jigHoleN:nn, jigPitch:pitch, jigT:T, jigFence:fence, jigBush:bush, jigEdge:edge};
                const tr = raw(ov), m = manifoldCheck(tr, 6); n++;
                if (!m.watertight || meshVolume(tr) <= 0){ bad++; if (!worst) worst = {ov, open:m.openEdges, bad:m.badEdges}; }
                const c = coplanarPairs(tr);
                if (c.hits){ cop++; if (!copAt) copAt = {ov, hits:c.hits, where:c.where}; }
              }
  chk('432 набора герметичны', bad === 0 && n === 432, worst || n);
  chk('и ни в одном нет совпадающих граней', cop === 0, copAt);
}

console.log('\n=== наклонное сверление ===');
{
  /* УМОЛЧАНИЕ — НОЛЬ, и при нуле деталь обязана остаться прежней. Иначе новая возможность тихо
     переделала бы кондуктор всем, кто её не просил. */
  chk('умолчание — без наклона', sp({}).ang === 0 && sp({}).tilted === false, sp({}).ang);
  chk('и при нуле толщина плиты — заказанная', Math.abs(sp({jigT:12}).T - 12) < 1e-9, sp({}).T);
  chk('и утолщения нет', sp({}).tGrown === false);
  /* Наклон меньше полуградуса — не наклон: он не даёт ничего, кроме зря утолщённой плиты. */
  chk('наклон в треть градуса считается нулевым', sp({jigAngle:0.3}).ang === 0 && sp({jigAngle:0.3}).tilted === false);
  chk('и толщина при нём не растёт', Math.abs(sp({jigAngle:0.3, jigT:12}).T - 12) < 1e-9);
  chk('а полградуса — уже наклон', sp({jigAngle:0.5}).tilted === true);
  chk('выше сорока пяти не пускают', sp({jigAngle:80}).ang === 45, sp({jigAngle:80}).ang);

  /* СВЕРЛО ПРОХОДИТ ПОД ЗАКАЗАННЫМ УГЛОМ И НЕ ПРОХОДИТ НИ ПОД КАКИМ ДРУГИМ. Это и есть вся проверка
     наклона: числа в спецификации могут быть любыми, а сверло либо лезет, либо нет. */
  for (const a of [0, 5, 15, 30, 45]){
    const s = sp({jigAngle:a}), t = raw({jigAngle:a}), M = prepMesh(t);
    const sh = yShiftOf(t, s), zw = s.edge - s.D/2, cx = s.xs[0];
    chk('под ' + a + '° сверло проходит насквозь', drillFits(M, s, sh, cx, zw, a));
    chk('под ' + a + '° повёрнутое на шесть градусов — упирается',
        !drillFits(M, s, sh, cx, zw, a + 6) && (a === 0 || !drillFits(M, s, sh, cx, zw, a - 6)),
        [drillFits(M, s, sh, cx, zw, a + 6), drillFits(M, s, sh, cx, zw, a - 6)]);
    /* ОТСТУП ОТМЕРЯН ПО РАБОЧЕЙ ГРАНИ — там, где сверло входит в заготовку. Сдвиг на миллиметр
       упирается: припуск отверстия две десятых, и миллиметр он не прощает. */
    chk('под ' + a + '° отступ отмерян по рабочей грани',
        !drillFits(M, s, sh, cx, zw + 1, a) && !drillFits(M, s, sh, cx, zw - 1, a));
    chk('под ' + a + '° и так у КАЖДОГО отверстия, а не у первого',
        s.xs.every(cx2 => drillFits(M, s, sh, cx2, zw, a)));
  }
  /* Наклон УХОДИТ ОТ УПОРА: ось у входной грани дальше от него, чем у рабочей. В другую сторону сверло
     било бы в сам упор, а до того — в кромку заготовки. */
  {
    const s = sp({jigAngle:30}), t = raw({jigAngle:30}), sh = yShiftOf(t, s), zw = s.edge - s.D/2;
    const ca = Math.cos(30*Math.PI/180), sa = Math.sin(30*Math.PI/180);
    // точка на оси у входной грани: от рабочей грани назад на всю толщину
    const zEntry = zw + (s.T/ca)*sa;
    chk('наклон уходит от упора, а не в него', zEntry > zw + 1, [zw, zEntry]);
    chk('и снос посчитан в спецификации', Math.abs(s.shift - (zEntry - zw)) < 1e-6, [s.shift, zEntry - zw]);
    chk('плиты за наклонённой осью хватает', s.D/2 - zEntry > 3.9, s.D/2 - zEntry);
    chk('и до упора тоже', zw + s.D/2 > 3.9, zw + s.D/2);
  }

  /* ДЛИНА НАПРАВЛЯЮЩЕЙ МЕРЯЕТСЯ ПО СЕТКЕ. Заказанная толщина при наклоне становится длиной ТРУБКИ, и
     если бы формула толщины плиты разошлась с длиной трубки, здесь вышло бы не то число.

     Щуп идёт ВБОК ПО X, а не по нормали к оси в плоскости YZ. Нормаль уводит точку по высоте на
     rr·sin α, а торцы трубки теперь ПЛОСКИЕ — параллельные граням плиты, — и у самых торцов такая точка
     оказывается уже вне трубки: направляющая мерилась короче настоящей на rr·tg α с каждой стороны
     (12 мм заказа давали 9.66 на пятнадцати градусах). Вбок по X высота не меняется вовсе, а
     различать щупу есть что: паз шире канала на зазор, и на радиусе r+0.2 без трубки пусто. */
  const guideLen = (t, s, a) => {
    const M = prepMesh(t), sh = yShiftOf(t, s);
    const ca = Math.cos(a*Math.PI/180), sa = Math.sin(a*Math.PI/180);
    const zc = s.edge - s.D/2 + s.shift/2, cx = s.xs[0], rr = s.r + 0.2;
    let lo = null, hi = null;
    for (let k = -300; k <= 300; k++){
      const L = k/300*(s.T/(2*ca));                       // параметр вдоль оси от середины плиты
      const ay = L*ca + sh, az = zc - L*sa;
      if (windAt(M, cx + rr, ay, az) !== 0 && windAt(M, cx - rr, ay, az) !== 0){ if (lo === null) lo = L; hi = L; }
    }
    return lo === null ? 0 : hi - lo;
  };
  for (const [a, g] of [[15, 12], [30, 12], [45, 12], [30, 20], [30, 6]]){
    const s = sp({jigAngle:a, jigT:g}), t = raw({jigAngle:a, jigT:g});
    chk('под ' + a + '° при заказе ' + g + ' мм направляющая ровно такой и вышла',
        Math.abs(guideLen(t, s, a) - g) < 0.7, guideLen(t, s, a));
    chk('и заказанное число названо длиной направляющей', Math.abs(s.guide - g) < 1e-9, s.guide);
  }
  /* ЗА ПРЕДЕЛАМИ ТРУБКИ СТЕНКИ НЕТ — и это не придирка: если бы паз оказался уже канала, «направляющей»
     считался бы весь паз, длина сошлась бы сама собой и проверка выше ничего бы не значила. */
  {
    const a = 30, s = sp({jigAngle:a}), t = raw({jigAngle:a}), M = prepMesh(t), sh = yShiftOf(t, s);
    const ca = Math.cos(a*Math.PI/180), sa = Math.sin(a*Math.PI/180);
    const zc = s.edge - s.D/2 + s.shift/2, cx = s.xs[0], rr = s.r + 0.2;
    const L = s.T/(2*ca) - 0.05;                          // у самой грани плиты, за торцом трубки
    const ay = L*ca + sh, az = zc - L*sa;
    chk('у грани плиты вокруг канала пусто — там паз, а не трубка',
        windAt(M, cx + rr, ay, az) === 0 && windAt(M, cx - rr, ay, az) === 0);
  }
  /* ТРУБКА ДЕРЖИТСЯ ПЛИТОЙ, А НЕ ВОЗДУХОМ. Стенка обязана быть толще зазора паза, иначе трубка целиком
     помещается в паз и висит в нём: деталь остаётся герметичной и печатается, а направляющая отваливается
     первым же сверлом. Щуп идёт от стенки канала наружу по X — материал должен быть сплошным. */
  {
    const a = 30, s = sp({jigAngle:a}), t = raw({jigAngle:a}), M = prepMesh(t), sh = yShiftOf(t, s);
    chk('стенка направляющей толще зазора паза', s.wallB > JIG_SLOT_GAP + 1, [s.wallB, JIG_SLOT_GAP]);
    const cx = s.xs[0], zc = s.edge - s.D/2 + s.shift/2;
    let gapAt = null;
    // на середине толщины: от стенки канала наружу по X материал обязан быть сплошным
    for (let x = s.r + 0.25; x <= s.sap + 2.5; x += 0.1)
      if (windAt(M, cx + x, sh, zc) === 0) { gapAt = x; break; }
    chk('и от канала до плиты материал сплошной', gapAt === null, gapAt);
  }

  /* ТРУБКА НЕ ВЫЛЕЗАЕТ ЗА ГРАНИ ПЛИТЫ НИ ПО ОДНОЙ ОСИ. Вылезшая с рабочей стороны не дала бы кондуктору
     лечь на заготовку, с печатной — встать на стол, а вбок или вглубь — просто торчала бы наружу.
     Запасы теперь выведены из наружного радиуса трубки, и если бы вывод разошёлся с телом, габарит
     перестал бы совпадать с плитой. Меряется всеми тремя осями. */
  for (const a of [-45, -5, 5, 30, 45]) for (const fence of [0, 12]){
    const s = sp({jigAngle:a, jigFence:fence}), b = bboxOf(raw({jigAngle:a, jigFence:fence}));
    chk('под ' + a + '° при упоре ' + fence + ' габарит — ровно плита с упором',
        Math.abs((b.y[1] - b.y[0]) - (s.T + s.fence)) < 1e-6, [b.y[1] - b.y[0], s.T + s.fence]);
    chk('   и вширь ровно плита', Math.abs((b.x[1] - b.x[0]) - s.W) < 1e-6, [b.x[1] - b.x[0], s.W]);
    chk('   и вглубь ровно плита с упором', Math.abs((b.z[1] - b.z[0]) - (s.D + s.tF)) < 1e-6,
        [b.z[1] - b.z[0], s.D + s.tF]);
  }

  /* ТОЛЩИНА ПЛИТЫ ПРИ НАКЛОНЕ. Заданное число — длина направляющей ПО ОСИ, а ось пересекает плиту
     наискось, поэтому плите столько и не нужно: T = guide·cos α + два утопления. Прежняя версия резала
     торцы трубки поперёк оси и была вынуждена добавлять 2R·sin α — плита выходила заметно толще
     направляющей; теперь торцы плоские, и добавка свелась к утоплениям. */
  {
    const s = sp({jigAngle:30, jigT:12});
    chk('толщина — направляющая по косинусу плюс два утопления',
        Math.abs(s.T - (s.guide*Math.cos(30*Math.PI/180) + 2*JIG_CAP)) < 1e-9, s.T);
    chk('и от Ø сверла она не зависит вовсе',
        Math.abs(sp({jigAngle:30, jigHoleD:16}).T - sp({jigAngle:30, jigHoleD:2}).T) < 1e-9,
        [sp({jigAngle:30, jigHoleD:2}).T, sp({jigAngle:30, jigHoleD:16}).T]);
    chk('круче наклон — ТОНЬШЕ плита при той же направляющей', sp({jigAngle:45}).T < sp({jigAngle:15}).T - 2,
        [sp({jigAngle:15}).T, sp({jigAngle:45}).T]);
    chk('и на сорока пяти она тоньше заданного числа', sp({jigAngle:45}).T < 12 - 2, sp({jigAngle:45}).T);
    chk('расхождение с заданным названо вслух',
        W({jigAngle:30}).some(x => /плита вышла .* при заданных/.test(x)), W({jigAngle:30}));
    chk('без наклона молчат', !W({}).some(x => /при заданных/.test(x)));
  }

  /* МОНОЛИТНОСТЬ. Ради неё торцы трубки и режутся плоскостями плиты: на грани открыт ТОЛЬКО канал, а не
     весь паз. Меряется площадью пустоты в сечении — сразу под утоплением её обязано быть примерно
     столько, сколько в эллипсе канала, а не столько, сколько в капсуле паза. */
  {
    const openArea = (t, s, yOff) => {
      const M = prepMesh(t), sh = yShiftOf(t, s), y = s.T/2 - yOff + sh;
      const cx = s.xs[0], zc = s.edge - s.D/2 + s.shift/2, st = 0.05;
      let n = 0;
      for (let x = cx - s.sap - 1; x <= cx + s.sap + 1; x += st)
        for (let z = zc - s.saq - 1; z <= zc + s.saq + 1; z += st)
          if (windAt(M, x, y, z) === 0) n++;
      return n*st*st;
    };
    for (const a of [15, 30, 45]){
      const s = sp({jigAngle:a}), t = raw({jigAngle:a});
      const ca = Math.cos(a*Math.PI/180);
      const bore = Math.PI*s.r*(s.r/ca), slot = Math.PI*s.sap*s.sap + 2*s.sap*(2*s.saq - 2*s.sap);
      const inRecess = openArea(t, s, 0.15), belowSink = openArea(t, s, 0.9);
      chk('под ' + a + '° в утоплении открыт весь паз', Math.abs(inRecess - slot)/slot < 0.1,
          [inRecess, slot]);
      chk('а сразу под ним — только канал', Math.abs(belowSink - bore)/bore < 0.12, [belowSink, bore]);
      chk('и это заметно меньше паза', belowSink < slot*0.75, [belowSink, slot]);
    }
  }

  /* ОТРИЦАТЕЛЬНЫЙ НАКЛОН — К УПОРУ. Знак задаёт сторону, и запас по глубине обязан переехать вместе с
     ним: при минусе растёт отступ от упора, при плюсе — дальний край. Перепутать их — значит отдать
     плиту, у которой канал выходит за кромку. */
  {
    const pos = sp({jigAngle:30}), neg = sp({jigAngle:-30});
    chk('минус уводит ось К упору', neg.shift < -1 && pos.shift > 1, [neg.shift, pos.shift]);
    chk('и по модулю снос одинаков', Math.abs(Math.abs(neg.shift) - pos.shift) < 1e-9);
    chk('при минусе растёт отступ от упора', neg.edge > pos.edge + 3, [neg.edge, pos.edge]);
    chk('а дальний край наоборот', (neg.D - neg.edge) < (pos.D - pos.edge) - 3,
        [neg.D - neg.edge, pos.D - pos.edge]);
    chk('плита при этом одной толщины', Math.abs(neg.T - pos.T) < 1e-9);
    chk('ниже полуградуса по модулю наклона нет', sp({jigAngle:-0.3}).tilted === false);
    chk('и ниже минус сорока пяти не пускают', sp({jigAngle:-80}).ang === -45, sp({jigAngle:-80}).ang);
    for (const a of [-5, -20, -45]){
      const s = sp({jigAngle:a}), t = raw({jigAngle:a}), M = prepMesh(t);
      const sh = yShiftOf(t, s), zw = s.edge - s.D/2;
      chk('под ' + a + '° сверло проходит насквозь', s.xs.every(cx => drillFits(M, s, sh, cx, zw, a)));
      chk('под ' + a + '° отступ отмерян по рабочей грани',
          !drillFits(M, s, sh, s.xs[0], zw + 1, a) && !drillFits(M, s, sh, s.xs[0], zw - 1, a));
      chk('под ' + a + '° направляющая вышла заказанной', Math.abs(guideLen(t, s, a) - 12) < 0.7,
          guideLen(t, s, a));
    }
    chk('и плита у упора цела', rayHits(raw({jigAngle:-45}), 0, -sp({jigAngle:-45}).D/2 + 1) > 0);
  }
  /* ПОРОГ ПОЛУТОРА ДИАМЕТРОВ МЕРЯЕТСЯ ПО НАПРАВЛЯЮЩЕЙ, А НЕ ПО ПЛИТЕ. Иначе утолщение само собой
     заткнуло бы предупреждение: плита при 30° толще заказанной, и «короткая направляющая» замолчала бы
     ровно там, где направляющая как раз коротка. */
  {
    chk('короткую направляющую называют и под наклоном',
        W({jigBush:10, jigAngle:30, jigT:6, jigHoleD:8}).some(x => /направляющая короче полутора/.test(x)),
        W({jigBush:10, jigAngle:30, jigT:6, jigHoleD:8}));
    /* Прежде здесь стояло «а плита при этом толще порога» — при старых торцах плита от утолщения
       перепрыгивала порог и предупреждение замолчало бы, меряй оно плиту. Теперь плита ТОНЬШЕ
       направляющей, и утверждение переворачивается; порог по-прежнему обязан меряться направляющей. */
    chk('а плита при этом тоньше направляющей',
        sp({jigAngle:30, jigT:6, jigHoleD:8}).T < 6, sp({jigAngle:30, jigT:6, jigHoleD:8}).T);
    chk('длинную не называют', !W({jigBush:10, jigAngle:30, jigT:12, jigHoleD:8}).some(x => /направляющая короче/.test(x)));
  }
  /* ЭЛЛИПС НА ВХОДЕ И СНОС ОСИ НАЗВАНЫ. На экране этого не видно вовсе, а размечать по верхней грани
     кондуктора значит промахнуться на весь снос. */
  {
    const ww = W({jigAngle:45, jigHoleD:8});
    chk('эллипс входа назван', ww.some(x => /входит эллипсом 8×11.3/.test(x)), ww);
    chk('и снос оси тоже', ww.some(x => /вместо/.test(x) && /у входной грани отстоит от упора/.test(x)), ww);
    chk('без наклона про эллипс молчат', !W({}).some(x => /эллипсом/.test(x)));
  }
  /* ПАЗ РАСТЁТ ВГЛУБЬ, А НЕ ВШИРЬ: наклон уводит ось только по глубине. Одно число на обе стороны дало
     бы плиту вдвое шире нужного. */
  {
    const s0 = sp({}), s3 = sp({jigAngle:30});
    chk('вглубь плита растёт', s3.D > s0.D + 5, [s0.D, s3.D]);
    /* И ВШИРЬ — на трубку. Прежде здесь стояло «а вширь почти нет»: тогда трубке хватало стенки в два
       миллиметра, и вширь плита не менялась. Теперь трубка обязана перекрыть паз целиком, она заметно
       толще, и место ей нужно — ровно два её радиуса вместо двух полуширин паза, без запаса и наугад. */
    chk('и вширь — ровно на трубку', Math.abs((s3.W - s0.W) - 2*(s3.rO - s0.r)) < 1e-9,
        [s3.W - s0.W, 2*(s3.rO - s0.r)]);
    chk('и трубка перекрывает паз с любой высоты', s3.rO/Math.cos(30*Math.PI/180) >= Math.abs(s3.shift) + s3.sr - 1e-9,
        [s3.rO/Math.cos(30*Math.PI/180), Math.abs(s3.shift) + s3.sr]);
    chk('паз шире отверстия ровно на зазор', Math.abs(s3.sap - (s3.r + JIG_SLOT_GAP)) < 1e-9, s3.sap);
    chk('и длиннее его на снос оси', Math.abs(s3.saq - (s3.shift/2 + s3.r/Math.cos(30*Math.PI/180) + JIG_SLOT_GAP)) < 1e-9, s3.saq);
  }
  /* ОБЛАСТЬ ЗНАЧЕНИЙ С НАКЛОНОМ. Тела здесь ПЕРЕСЕКАЮТСЯ, а не складываются гранями, и любое касание
     торцом или стенкой всплыло бы либо дырой, либо совпадающей парой. */
  {
    let bad = 0, worst = null, cop = 0, copAt = null, n = 0;
    for (const a of [-45, -10, 0.5, 10, 25, 45])
      for (const d of [2, 16])
        for (const nn of [1, 4])
          for (const T of [4, 40])
            for (const fence of [0, 40])
              for (const bush of [0, 20])
                for (const edge of [1, 120]){
                  const ov = {jigAngle:a, jigHoleD:d, jigHoleN:nn, jigT:T, jigFence:fence, jigBush:bush, jigEdge:edge};
                  const tr = raw(ov), m = manifoldCheck(tr, 6); n++;
                  if (!m.watertight || meshVolume(tr) <= 0){ bad++; if (!worst) worst = {ov, open:m.openEdges, bad:m.badEdges}; }
                  const c = coplanarPairs(tr);
                  if (c.hits){ cop++; if (!copAt) copAt = {ov, hits:c.hits, where:c.where}; }
                }
    chk('384 наклонённых набора герметичны', bad === 0 && n === 384, worst || n);
    chk('и ни в одном нет совпадающих граней', cop === 0, copAt);
  }
  /* И СВЕРЛО ПРОХОДИТ НА КРАЯХ ОБЛАСТИ, а не только на умолчаниях. */
  for (const ov of [{jigAngle:45, jigHoleD:2, jigT:4}, {jigAngle:45, jigHoleD:16, jigT:40},
                    {jigAngle:10, jigBush:20, jigEdge:1}, {jigAngle:25, jigHoleN:12, jigPitch:5}]){
    const s = sp(ov), t = raw(ov), M = prepMesh(t), sh = yShiftOf(t, s), zw = s.edge - s.D/2;
    chk('на краю области сверло проходит ' + JSON.stringify(ov),
        s.xs.every(cx => drillFits(M, s, sh, cx, zw, s.ang)));
  }
}

console.log('\n=== через настоящий путь приложения ===');
{
  logos.length = 0; boxHoles.length = 0; dieFaces.length = 0;
  Object.assign(paramState.box, J({}));
  const t = buildTrisForShape('box', paramState.box);
  chk('строится то же тело', Math.abs(meshVolume(t) - meshVolume(raw({}))) < 1e-6);
  chk('и герметично', manifoldCheck(t, 6).watertight);
  chk('имя называет число отверстий, сверло и шаг',
      /кондуктор 3×Ø8 шаг 32/.test(activeShapeLabel()), activeShapeLabel());
  Object.assign(paramState.box, J({jigBush:10}));
  chk('и втулку, когда она есть', /втулка Ø10/.test(activeShapeLabel()), activeShapeLabel());
  Object.assign(paramState.box, J({jigAngle:30}));
  chk('и наклон, когда он есть', /кондуктор 3×Ø8 под 30°/.test(activeShapeLabel()), activeShapeLabel());
  Object.assign(paramState.box, J({}));
  chk('а без наклона про угол молчат', !/под 0°/.test(activeShapeLabel()), activeShapeLabel());
  Object.assign(paramState.box, J({jigAngle:30}));
  const tilt = buildTrisForShape('box', paramState.box);
  chk('наклонная деталь строится через тот же путь и герметична', manifoldCheck(tilt, 6).watertight);
  chk('справка говорит про наклон',
      /НАКЛОН СВЕРЛЕНИЯ/.test(MODEL_HELP['mount:drilljig'].how) &&
      /ДЛИНОЙ НАПРАВЛЯЮЩЕЙ/.test(MODEL_HELP['mount:drilljig'].how));
  chk('справка есть и говорит про переворот',
      !!MODEL_HELP['mount:drilljig'] && /ПЕРЕВОРАЧИВАЮТ/.test(MODEL_HELP['mount:drilljig'].how));
  chk('и про недолговечность пластика',
      /ПЛАСТИК ВЕДЁТ СВЕРЛО НЕДОЛГО/.test(MODEL_HELP['mount:drilljig'].how));
}

console.log(`\n=== TOTAL: ${pass} passed, ${fail} failed ===`);
process.exit(fail ? 1 : 0);
