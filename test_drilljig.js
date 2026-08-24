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
  chk('справка есть и говорит про переворот',
      !!MODEL_HELP['mount:drilljig'] && /ПЕРЕВОРАЧИВАЮТ/.test(MODEL_HELP['mount:drilljig'].how));
  chk('и про недолговечность пластика',
      /ПЛАСТИК ВЕДЁТ СВЕРЛО НЕДОЛГО/.test(MODEL_HELP['mount:drilljig'].how));
}

console.log(`\n=== TOTAL: ${pass} passed, ${fail} failed ===`);
process.exit(fail ? 1 : 0);
