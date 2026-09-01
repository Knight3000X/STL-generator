// ПОЛКА ПОД ИНСТРУМЕНТ (`mntMode:'tool'`) — гнёзда в полке под отвёртки, кисти, стамески.
//
// ЗАЧЕМ ЭТОТ ФАЙЛ ЗАВЕДЁН. Перепись расчётов показала, что `toolRackSpec` — один из четырёх
// калькуляторов приложения, которых НЕ КАСАЛАСЬ ни одна проверка из 134 файлов. Числа он при этом
// печатает человеку: сколько гнёзд, какого они диаметра и до какой ширины пришлось расширить полку.
// Непроверенное число ничем не лучше выдуманного — разница только в том, что выдуманное видно сразу.
//
// МЕРЯЕТСЯ ПОСТРОЕННОЕ. Гнёзда — это отверстия по оси Y в плите полки, и стоят они в её локальной
// системе на `z = shelfD/2`; значит по сетке читаются и число гнёзд, и их радиус, и шаг между ними, и
// сколько полки осталось снаружи крайнего. Спецификация сверяется с деталью, а не сама с собой.
//
// Run: ./run-all.sh

let pass = 0, fail = 0;
function chk(n, c, e){ if (c){ pass++; console.log('  OK  ', n); }
  else { fail++; console.log('  FAIL', n, e !== undefined ? JSON.stringify(e) : ''); } }

const P = (ov) => Object.assign(defaultBoxParams(), {mntMode:'tool'}, ov);
const S = (ov) => toolRackSpec(P(ov));
const M = (ov) => buildTrisForShape('box', P(ov));
const W_ = (ov) => collectPrintWarnings(P(ov));

/* Габарит по оси: полка кладётся симметрично по X, поэтому ширина читается прямо с крайних вершин. */
function extent(t, i){ let lo = 1e9, hi = -1e9;
  for (const T of t) for (const v of T){ if (v[i] < lo) lo = v[i]; if (v[i] > hi) hi = v[i]; }
  return {lo, hi, d: hi - lo}; }

/* ГНЁЗДА ЧИТАЮТСЯ ПО ВЕРШИНАМ ИХ СТЕНОК, а не пробой лучом и не сечением. Две предыдущие попытки
   этого файла кончились ничем, и обе поучительны. СЕЧЕНИЕ ПЛОСКОСТЬЮ y = const не годится: стенка
   гнезда вертикальна, плоскость идёт ВДОЛЬ неё, и «диаметр» выходил 52 мм вместо десяти. ПРОБА ЛУЧОМ
   по чётности пересечений не годится тоже — точки ложились ровно на рёбра грани, общее ребро
   считалось дважды, и полка с четырьмя гнёздами читалась как пустая; сдвиг с узлов это чинил, но
   ширина пустоты всё равно зависела от того, где именно провели линию.
   А стенка гнезда — это ПРИЗМА, и её вершины лежат ровно на радиусе от своего центра. Значит и число
   гнёзд, и радиус, и положение центра читаются точно, без единого допуска на способ замера. */
function ringAt(t, cx, cz, r){
  const ang = new Set(); let n = 0, dMin = 1e9, dMax = 0;
  for (const T of t) for (const v of T){
    const d = Math.hypot(v[0] - cx, v[2] - cz);
    if (Math.abs(d - r) > 0.02) continue;
    n++; dMin = Math.min(dMin, d); dMax = Math.max(dMax, d);
    ang.add(Math.round(Math.atan2(v[2] - cz, v[0] - cx)*1000)/1000);
  }
  return {n, facets: ang.size, dMin, dMax};
}
/* Сколько гнёзд ВСТАЛО в детали: у каждого расчётного центра спрашивается, есть ли там кольцо. */
function builtSlots(ov){
  const s = S(ov), t = M(ov), zc = s.shelfD/2;
  const rings = s.cps.map(cx => ringAt(t, cx, zc, s.r));
  return {s, rings, built: rings.filter(g => g.facets >= 8).length};
}

console.log('=== полка под инструмент: замкнутость ===');
for (const ov of [{}, {mntToolN:1}, {mntToolN:8}, {mntToolD:6}, {mntToolD:30},
                  {mntW:200}, {mntLegA:60}, {mntLegB:80}, {mntT:8}, {mntScrewD:0}]){
  const t = M(ov);
  chk('замкнута ' + JSON.stringify(ov), manifoldCheck(t, 4).watertight && t.length > 100, ov);
}

console.log('\n=== гнёзда: сколько их и какие они — по детали ===');
{
  /* РАДИУС И ЦЕНТР — ТОЧНО. Вершины стенки лежат на радиусе `r` от центра `cps[k]`, и разброс между
     ближайшей и дальней обязан быть нулевым: призма вписана в окружность, а не описана вокруг неё. */
  for (const d of [10, 16, 24]){
    const {s, rings} = builtSlots({mntToolD:d, mntW:200});
    const g = rings[0];
    chk('гнездо Ø' + d + ': стенка стоит ровно на радиусе ' + s.r.toFixed(2),
        g.facets >= 8 && g.dMax - g.dMin < 0.01 && Math.abs(g.dMax - s.r) < 0.01,
        {граней:g.facets, 'от':+g.dMin.toFixed(4), 'до':+g.dMax.toFixed(4), спец:+s.r.toFixed(4)});
  }
  chk('крупное гнездо огранено мельче мелкого',
      builtSlots({mntToolD:24, mntW:200}).rings[0].facets >
      builtSlots({mntToolD:10, mntW:200}).rings[0].facets,
      {'Ø24':builtSlots({mntToolD:24, mntW:200}).rings[0].facets,
       'Ø10':builtSlots({mntToolD:10, mntW:200}).rings[0].facets});
  /* ЦЕНТРЫ: у каждого расчётного центра кольцо есть — значит и положение совпало. */
  {
    const {s, rings} = builtSlots({mntToolN:4, mntW:200});
    chk('все четыре гнезда стоят там, где их посчитали',
        rings.every(g => g.facets >= 8), rings.map(g => g.facets));
    /* ПОЛЯ: «три миллиметра полки снаружи крайнего гнезда» — правило построителя, до этого файла
       нигде не подпёртое. */
    const edge = extent(M({mntToolN:4, mntW:200}), 0);
    chk('  и снаружи крайнего остаётся 3 мм полки',
        Math.abs((s.cps[0] - edge.lo) - (s.r + 3)) < 0.02,
        {осталось:+(s.cps[0] - edge.lo).toFixed(3), спец:+s.m.toFixed(3)});
    /* «ВПРИТЫК» БОЛЬШЕ НЕ БЫВАЕТ, и это следствие починки: полка расширяется дальше минимума, чтобы
       гнёзда не выбросил построитель. Минимальная ширина осталась ЧИСЛОМ и по-прежнему складывается
       из полей и шага — её и проверяем как тождество, а рядом требуем, чтобы итоговая ширина была не
       меньше: расширение может только прибавлять. */
    const tight = S({mntToolN:4, mntW:20});
    chk('  минимальная ширина — это поля плюс шаги ряда',
        Math.abs(tight.wNeed - (2*tight.m + (tight.n - 1)*tight.pitch)) < 1e-9 &&
        Math.abs(tight.pitch - (2*tight.r + 3)) < 1e-9 && tight.W >= tight.wNeed - 1e-9,
        {wNeed:+tight.wNeed.toFixed(2), pitch:+tight.pitch.toFixed(2), W:+tight.W.toFixed(2)});
    const gaps = s.cps.slice(1).map((c, k) => c - s.cps[k]);
    chk('  а на широкой — расходятся ровно и шире минимума',
        gaps.every(g2 => Math.abs(g2 - gaps[0]) < 1e-9) && gaps[0] > s.pitch,
        gaps.map(v => +v.toFixed(2)));
  }
}

console.log('\n=== два зажима, о которых приложение говорит ===');
{
  /* ПОЛКА РАСШИРЯЕТСЯ САМА, когда заказанной ширины на ряд не хватает, — и это видно на детали. */
  const g = S({mntW:30, mntToolN:5});
  chk('узкая полка расширена, и число названо', g.widened && g.W > g.wAsked + 1,
      {просили:g.wAsked, вышло:g.W});
  chk('  и деталь и правда шире заказанного',
      Math.abs(extent(M({mntW:30, mntToolN:5}), 0).d - g.W) < 0.05,
      {деталь:+extent(M({mntW:30, mntToolN:5}), 0).d.toFixed(2), спец:g.W});
  /* Сообщение здесь ТОГО ЖЕ РОДА, что и на умолчаниях: полка выросла не потому, что ряд не влез в
     тридцать миллиметров, а потому, что на девяноста восьми построитель выбросил бы часть гнёзд.
     Прежняя строка про «не влезают» осталась в файле для случая, когда рост ничем другим не вызван. */
  chk('  и об этом сказано числом',
      W_({mntW:30, mntToolN:5}).some(x => /полка расширена до 196 мм не ради размера, а ради ГНЁЗД: на 98 мм/.test(x)),
      W_({mntW:30, mntToolN:5}));
  chk('  а широкой полке расширяться незачем',
      S({mntW:200, mntToolN:4}).widened === false &&
      !W_({mntW:200, mntToolN:4}).some(x => /полка расширена/.test(x)));
  /* ГНЕЗДО УРЕЗАЕТСЯ ГЛУБИНОЙ ПОЛКИ: шире половины глубины оно бы вышло за кромку. */
  const h = S({mntLegA:16, mntToolD:20});
  chk('мелкая полка урезает гнездо, и оба числа названы', h.thin && h.r < h.tr - 0.5,
      {просили:+(2*h.tr).toFixed(1), вышло:+(2*h.r).toFixed(1)});
  { const g = builtSlots({mntLegA:16, mntToolD:20, mntW:200});
    chk('  и урезано оно на самой детали',
        g.rings[0].facets >= 8 && Math.abs(g.rings[0].dMax - h.r) < 0.01,
        {деталь:+(2*g.rings[0].dMax).toFixed(2), спец:+(2*h.r).toFixed(2)}); }
  chk('  и об этом сказано', W_({mntLegA:16, mntToolD:20}).some(x => /гнездо Ø.* вместо Ø/.test(x)),
      W_({mntLegA:16, mntToolD:20}));
  chk('  а на глубокой полке гнездо не трогают', S({mntLegA:60, mntToolD:20}).thin === false);
}

console.log('\n=== главное: заказанные гнёзда и правда встают ===');
{
  /* ЧТО ЗДЕСЬ ПРОВЕРЯЕТСЯ И ПОЧЕМУ ЭТОТ ФАЙЛ ВООБЩЕ ПОЯВИЛСЯ. Отверстия режет `buildBoxWithHoles`, и
     он выбрасывает те, чьи клетки сетки задевают соседа. Полка про это правило не знала и на
     УМОЛЧАНИЯХ строила ДВА гнезда из четырёх — молча. Нашлось это первым же замером по детали, а не
     чтением кода: спецификация говорила «четыре», в сетке стояло два. */
  for (const ov of [{}, {mntToolN:2}, {mntToolN:3}, {mntToolN:5}, {mntToolD:26}, {mntToolD:6},
                    {mntLegA:20}, {mntT:8}, {mntW:200}]){
    const {s, built} = builtSlots(ov);
    chk('заказано ' + s.n + ' — встало ' + built + ' ' + JSON.stringify(ov),
        built === s.builtN && built === s.n, {деталь:built, спец:s.builtN, заказано:s.n});
  }
  /* И КОГДА НЕ ВСТАЮТ — спецификация обязана знать это ЗАРАНЕЕ, а не человек после печати. */
  {
    const {s, built} = builtSlots({mntToolN:8, mntW:300});
    chk('восемь гнёзд не встают, и это посчитано заранее',
        s.dropped > 0 && built === s.builtN && built < s.n,
        {деталь:built, спец:s.builtN, заказано:s.n});
    chk('  и сказано числом', W_({mntToolN:8, mntW:300})
          .some(x => /гнёзд встанет 4 из 8/.test(x)), W_({mntToolN:8, mntW:300}));
  }
  /* РАСШИРЕНИЙ ДВА, И ПРИЧИНЫ РАЗНЫЕ: «ряд не влез» и «гнёзда стояли бы слишком тесно». */
  chk('на умолчаниях полка расширена РАДИ ГНЁЗД, и причина названа',
      S({}).grew === true && W_({}).some(x => /не ради размера, а ради ГНЁЗД/.test(x)), W_({}));
  chk('  одно гнездо расширять незачем', S({mntToolN:1}).grew === false &&
      S({mntToolN:1}).dropped === 0 && W_({mntToolN:1}).length === 0, W_({mntToolN:1}));
  /* И РАСШИРЕНИЕ — НЕ ПРОИЗВОЛ: на меньшей ширине гнёзда и правда терялись бы. */
  {
    const s2 = S({});
    const narrow = Math.max(s2.wAsked, s2.wNeed);
    const m2 = s2.r + 3, sp = narrow - 2*m2;
    const cps = []; for (let k = 0; k < s2.n; k++) cps.push(-sp/2 + sp*k/(s2.n - 1));
    const kept = holeKeepSets(narrow, s2.t, s2.shelfD,
      cps.map(cp => ({axis:1, cp, cq:0, r:s2.r}))).kept.length;
    chk('  и на прежней ширине их правда встало бы меньше',
        kept < s2.n && s2.W > narrow, {ширина:narrow, встало_бы:kept, заказано:s2.n});
  }
}

console.log('\n=== TOTAL:', pass, 'passed,', fail, 'failed ===');
if (fail) process.exitCode = 1;
