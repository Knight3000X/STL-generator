// САМЫЙ ДЛИННЫЙ НЕПОДПЁРТЫЙ ПРОЛЁТ.
//
// ЗАЧЕМ ЭТОТ ФАЙЛ. Приложение мерило нависания ПЛОЩАДЬЮ, а печатника мучает ДЛИНА: сорок
// миллиметров через пустоту провиснут, а восемь пройдут ниткой и не заметятся. Площадь на этот
// вопрос не отвечает в принципе — у щели 8×200 она больше, чем у окна 30×30, а печатается щель
// легко, окно плохо.
//
// ЧТО ЗДЕСЬ ПРОВЕРЯЕТСЯ. Не «похоже на правду», а ТОЧНЫЕ ОТВЕТЫ НА ФИГУРАХ, СОБРАННЫХ РУКАМИ: у
// арки с просветом сорок пролёт равен сорока, и ничему другому. И одна проверка против детали,
// которую приложение строит само: калибровочный образец мостов знает свою длину из ручки, и мера
// обязана её узнать, не спрашивая.
//
// Run: ./run-all.sh

let pass = 0, fail = 0;
function chk(n, c, e){ if (c){ pass++; console.log('  OK  ', n); }
  else { fail++; console.log('  FAIL', n, e !== undefined ? JSON.stringify(e) : ''); } }

const P = ov => { logos.length = 0; boxHoles.length = 0;
  if (typeof dieFaces !== 'undefined') dieFaces.length = 0;
  Object.assign(paramState.box, defaultBoxParams(), {gfBaseplate:false}, ov); return paramState.box; };

/* КИРПИЧ РУКАМИ: восемь вершин, двенадцать треугольников, нормали наружу. Всё, что ниже, собрано
   из него — чтобы ответ был известен заранее, а не взят у построителя, который сам может ошибаться. */
const brick = (x0,y0,z0,x1,y1,z1) => {
  const v = [[x0,y0,z0],[x1,y0,z0],[x1,y1,z0],[x0,y1,z0],[x0,y0,z1],[x1,y0,z1],[x1,y1,z1],[x0,y1,z1]];
  const q = (a,b,c,d) => [[v[a],v[b],v[c]],[v[a],v[c],v[d]]];
  return [].concat(q(0,3,2,1), q(4,5,6,7), q(0,1,5,4), q(1,2,6,5), q(2,3,7,6), q(3,0,4,7));
};
const P0 = P({});

console.log('=== арка: пролёт равен просвету, и ничему другому ===');
{
  /* П-ОБРАЗНАЯ АРКА: две ноги и перемычка. Под перемычкой пусто до самого стола — это и есть мост,
     а его длина известна с точностью до постановки задачи. */
  const arch = (gap, legW, depth) =>
    brick(0, 0, 0, legW, 20, depth)
      .concat(brick(legW + gap, 0, 0, 2*legW + gap, 20, depth))
      .concat(brick(0, 20, 0, 2*legW + gap, 26, depth));
  for (const gap of [8, 20, 40]){
    const s = bridgeSpec(arch(gap, 10, 10), P0);
    chk('просвет ' + gap + ' → пролёт ' + gap, Math.abs(s.span - gap) <= s.cell + 1e-9,
        {пролёт:s.span, клетка:s.cell});
    chk('  и высота названа верно (20)', Math.abs(s.height - 20) < 0.5, s.height);
  }
  /* ТОЛЩИНА НОГ НА ПРОЛЁТ НЕ ВЛИЯЕТ: мост меряется между опорами, а не по габариту детали. */
  const thin = bridgeSpec(arch(30, 4, 10), P0), fat = bridgeSpec(arch(30, 25, 10), P0);
  chk('толщина ног пролёт не меняет', Math.abs(thin.span - fat.span) <= thin.cell + fat.cell,
      {тонкие:thin.span, толстые:fat.span});
  /* ГЛУБИНА — ТОЖЕ: поперёк арки опор нет вовсе, и «мостить» там не между чем. Первая редакция
     брала просто меньшую из длин по X и по Z и объявляла у арки 40×10 пролёт ДЕСЯТЬ. */
  const deep = bridgeSpec(arch(40, 10, 60), P0);
  chk('глубина арки пролёт не меняет: он поперёк, а не вдоль', Math.abs(deep.span - 40) <= deep.cell + 1e-9,
      {пролёт:deep.span, клетка:deep.cell});
}

console.log('\n=== окно в плите: мостят поперёк узкой стороны ===');
{
  /* ОКНО 20×60 В ОСНОВАНИИ, ПЕРЕКРЫТОЕ СПЛОШНОЙ КРЫШКОЙ. Крышка опёрта на основание по всему
     контуру окна — и вдоль X, и вдоль Z, — а над самим окном висит. Слайсер мостит поперёк УЗКОЙ
     стороны: двадцать, а не шестьдесят.

     ПЕРВАЯ РЕДАКЦИЯ ЭТОЙ ФИГУРЫ БЫЛА НЕВЕРНА, и мера это показала: я поставил плиту на две подставки
     по краям, и настоящим самым длинным пролётом оказалась сама плита между ними — 87.5 мм. Мера
     ответила правильно, ошибкой была фигура. */
  const windowed = (wx, wz) => {
    const X = 100, Z = 100, y0 = 0, y1 = 10, y2 = 14;
    const x0 = (X - wx)/2, x1 = x0 + wx, z0 = (Z - wz)/2, z1 = z0 + wz;
    return [].concat(
      brick(0, y0, 0, X, y1, z0), brick(0, y0, z1, X, y1, Z),          // основание вокруг окна
      brick(0, y0, z0, x0, y1, z1), brick(x1, y0, z0, X, y1, z1),
      brick(0, y1, 0, X, y2, Z));                                       // сплошная крышка поверх
    };
  const s = bridgeSpec(windowed(20, 60), P0);
  chk('окно 20×60 → пролёт 20', Math.abs(s.span - 20) <= s.cell*2 + 1e-9, {пролёт:s.span, клетка:s.cell});
  const s2 = bridgeSpec(windowed(60, 20), P0);
  chk('окно 60×20 → тоже 20 (узкая сторона та же)', Math.abs(s2.span - 20) <= s2.cell*2 + 1e-9, s2.span);
  chk('  и высота моста — верх основания (10)', Math.abs(s.height - 10) < 0.5, s.height);
}

console.log('\n=== чего мостом НЕ считается ===');
{
  chk('у сплошного куба пролёта нет', bridgeSpec(buildTrisForShape('box', P({})), P0).span === 0);
  chk('у полого ящика тоже', bridgeSpec(buildTrisForShape('box', P({hollow:true})), P0).span === 0);
  /* КОНСОЛЬ — НЕ МОСТ. Полка, торчащая в воздух, опёрта с ОДНОЙ стороны: её ловит замер нависаний,
     а мостом она не является, и удваивать одно наблюдение двумя мерами незачем. */
  const cantilever = brick(0, 0, 0, 10, 20, 10).concat(brick(0, 20, 0, 60, 24, 10));
  const c = bridgeSpec(cantilever, P0);
  chk('консоль мостом не считается', c.span === 0, c.span);
  /* А ТА ЖЕ ПОЛКА, ОПЁРТАЯ С ДВУХ СТОРОН, — мост. Разница ровно в одной ноге. */
  const bridged = cantilever.concat(brick(50, 0, 0, 60, 20, 10));
  const bs = bridgeSpec(bridged, P0);
  chk('  а с ногой на дальнем конце — мост в 40 мм', Math.abs(bs.span - 40) <= bs.cell + 1e-9, bs.span);
}

console.log('\n=== против детали, которая знает свой пролёт ===');
{
  /* КАЛИБРОВОЧНЫЙ ОБРАЗЕЦ МОСТОВ строит пролёты до заказанной длины — она стоит в ручке `tstSpan`.
     Мера обязана узнать это число, не спрашивая ручку: она читает только сетку. Допуск — одна
     клетка сетки колонн, и она же названа в ответе. */
  for (const want of [40, 80, 120]){
    const p = P({tstMode:'bridge', tstSpan:want});
    const s = bridgeSpec(buildTrisForShape('box', p), p);
    chk('образец мостов на ' + want + ' мм: измерено ' + s.span.toFixed(1),
        Math.abs(s.span - want) <= s.cell*2 + 1e-9, {измерено:s.span, ждали:want, клетка:s.cell});
  }
}

console.log('\n=== мера отказывается, когда мерить нечего ===');
{
  chk('без сетки — нет ответа', bridgeSpec(null, P0) === null && bridgeSpec([], P0) === null);
  /* ПЛОСКАЯ СЕТКА НУЛЕВОЙ ТОЛЩИНЫ тоже не деталь: у неё нет ни верха, ни низа, и пролёта в ней нет. */
  const flat = [[[0,0,0],[10,0,0],[0,0,10]], [[0,0,0],[0,0,10],[10,0,0]]];
  chk('плоская сетка — пролёта нет', bridgeSpec(flat, P0).span === 0);
  /* И ШАГ СЕТКИ НАЗЫВАЕТСЯ ВСЕГДА: число без своей точности читается как точное. */
  const s = bridgeSpec(buildTrisForShape('box', P({pipMode:'box'})), P0);
  chk('шаг сетки колонн назван и разумен', s.cell > 0 && s.cell <= 1, s.cell);
}

console.log('\n=== настройки под ЭТУ деталь, а не под её семейство ===');
{
  /* СРЕДНЯЯ ТОЛЩИНА — 2V/A, и на фигурах с известным ответом она проверяется числом. У куба со
     стороной a объём a³, площадь 6a², откуда 2a³/6a² = a/3. У оболочки постоянной толщины t объём
     примерно половина площади на толщину, откуда сама t. */
  const cube = buildTrisForShape('box', P({}));
  chk('у куба 40 средняя толщина — треть стороны', Math.abs(meanThickness(cube) - 40/3) < 1e-6, meanThickness(cube));
  const plate = buildTrisForShape('box', P({width:100, height:2, depth:100}));
  /* У плиты 100×2×100 объём 20000, площадь 2·10000 + 4·200 = 20800, и 2V/A = 1.92 — чуть меньше
     двух: боковые кромки добавляют площади, не добавляя толщины. Это и есть честный ответ меры. */
  chk('у плиты толщиной 2 мм средняя толщина близка к двум',
      Math.abs(meanThickness(plate) - 1.92) < 0.01, meanThickness(plate));
  chk('пустая сетка — толщина ноль', meanThickness([]) === 0 && meanThickness(null) === 0);

  const rowsOf = (ov) => { const p = P(ov); return partProfileRows(p, buildTrisForShape('box', p)).map(r => r[0]); };
  /* МЯСИСТОЙ ДЕТАЛИ СОВЕТУЮТ ТРИ ПЕРИМЕТРА, А НЕ ТРИДЦАТЬ ТРИ. Первая редакция считала «сколько
     проходов влезает» и на сплошном кубе выдавала шесть — это не совет, а нелепость. */
  chk('сплошному кубу — три периметра', rowsOf({}).some(t => t === 'Периметров: 3'), rowsOf({}));
  /* А ТОНКОСТЕННОЙ — СТОЛЬКО, СКОЛЬКО НУЖНО, ЧТОБЫ СТЕНКА СОМКНУЛАСЬ. Стенка 2 мм соплом 0.4 — это
     пять проходов, и совет обязан назвать пять, а не три. */
  chk('полому ящику со стенкой 2 мм — пять периметров',
      rowsOf({hollow:true, wallThickness:2}).some(t => t === 'Периметров: 5'),
      rowsOf({hollow:true, wallThickness:2}));
  chk('  и сказано, что заполнение там не решает',
      rowsOf({hollow:true, wallThickness:2}).some(t => t === 'Заполнение: не решает'));
  chk('  а у сплошного куба такой строки нет', !rowsOf({}).some(t => t === 'Заполнение: не решает'));
  /* СОВЕТ ОТЗЫВАЕТСЯ НА СОПЛО И НА СЛОЙ — иначе он был бы не про эту деталь, а про вообще. */
  chk('сопло 0.8: периметров вдвое меньше',
      rowsOf({hollow:true, wallThickness:2, printNozzle:'0.8'}).some(t => t === 'Периметров: 3'),
      rowsOf({hollow:true, wallThickness:2, printNozzle:'0.8'}));
  chk('слой 0.1: сплошных слоёв вдвое больше',
      rowsOf({printLayerH:0.1}).some(t => t === 'Сплошных слоёв: 8'), rowsOf({printLayerH:0.1}));
  /* И ЧТО СОВЕТЫ ПРО МОСТ, КАЙМУ И ПОВОРОТ ПОЯВЛЯЮТСЯ ТОЛЬКО КОГДА ЕСТЬ ПОВОД. */
  chk('у куба ни моста, ни каймы, ни поворота не советуют',
      rowsOf({}).every(t => t.indexOf('Обдув') < 0 && t.indexOf('Кайма') < 0 && t.indexOf('Повернуть') < 0),
      rowsOf({}));
  const hook = rowsOf({hookMount:'wall'});
  chk('у крючка советуют и обдув, и кайму, и поворот',
      hook.some(t => t.indexOf('Обдув') === 0) && hook.some(t => t.indexOf('Кайма') === 0) &&
      hook.some(t => t.indexOf('Повернуть') === 0), hook);
  chk('без сетки советов нет вовсе', partProfileRows(P({}), null).length === 0 &&
      partProfileRows(P({}), []).length === 0);
  /* И ЧТО ОБЩИЙ СОВЕТ СЕМЕЙСТВА НЕ ПОТЕРЯЛСЯ: строки про деталь ДОПИСЫВАЮТСЯ к нему, а не заменяют. */
  const p = P({hookMount:'wall'}), t = buildTrisForShape('box', p);
  chk('советы семейства остались на месте',
      printSettingsFor(p, t).rows.length > partProfileRows(p, t).length,
      {всего:printSettingsFor(p, t).rows.length, про_деталь:partProfileRows(p, t).length});
  chk('  и без сетки они всё равно есть', printSettingsFor(p).rows.length > 0);
  /* И ЧТО СЕТКА ДОХОДИТ ДО СПРАВКИ, А НЕ ТЕРЯЕТСЯ ПО ДОРОГЕ. Считать про деталь и не показать
     посчитанное — то же самое, что не считать: на этой дырке в тестах мутация «справка перестала
     получать сетку» и выжила. */
  chk('справка о модели показывает советы про эту деталь',
      modelHelp(p, t).print.rows.length === printSettingsFor(p, t).rows.length &&
      modelHelp(p, t).print.rows.length > modelHelp(p).print.rows.length,
      {с_сеткой:modelHelp(p, t).print.rows.length, без:modelHelp(p).print.rows.length});
  chk('  и среди них есть строка про периметры этой детали',
      modelHelp(p, t).print.rows.some(r => r[0].indexOf('Периметров: ') === 0));
}

console.log('\n=== TOTAL:', pass, 'passed,', fail, 'failed ===');
if (fail) process.exitCode = 1;
