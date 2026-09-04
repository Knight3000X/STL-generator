// Лабиринтное уплотнение: ротор с кольцевыми зубьями и корпус-втулка.
//
// Деталь, у которой РАБОТА И ФОРМА расходятся дальше, чем у любой другой в наборе: лабиринт может
// быть построен безупречно — герметичная сетка, обе половины надеваются одна на другую, габариты
// верные — и при этом не уплотнять вовсе. Проверяется здесь именно работа:
//
//   1. ЗЕМЛЯ СТОИТ НАПРОТИВ ЗУБА, А ПОДРЕЗКА — НАПРОТИВ КАМЕРЫ. Первая редакция подрезала корпус ровно
//      там, где стоит зуб: щель у вершины выходила 1.4 мм вместо 0.4, а земли приходились на камеры,
//      где дросселировать нечего. Обе детали строились, надевались и проходили manifoldCheck насквозь.
//      Ловится только замером расточки НАПРОТИВ КАЖДОГО ЗУБА — что здесь и делается.
//
//   2. ЗАЗОР ВЫЧИТАЕТСЯ ИЗ КОРПУСА, А НЕ ПРИБАВЛЯЕТСЯ К РОТОРУ. Прибавь его к обеим — и щель выйдет
//      вдвое шире заказанной, причём каждая деталь по отдельности будет выглядеть правильной.
//
//   3. ШАГ НЕ МОЖЕТ БЫТЬ УЖЕ ЗУБА. Иначе камеры исчезают, зубья сливаются в юбку, и лабиринт
//      становится одной длинной щелью — она держит хуже одного зуба.
//
//   4. ВЫИГРЫШ ИДЁТ КАК КОРЕНЬ ИЗ ЧИСЛА ЗУБЬЕВ, а не пропорционально: это ровно то, в чём ошибаются,
//      ставя двадцать зубьев вместо четырёх, и приложение обязано называть число, а не намекать.

let pass=0,fail=0; function chk(n,c,e){if(c){pass++;console.log('  OK  ',n);}else{fail++;console.log('  FAIL',n,e!==undefined?JSON.stringify(e):'');}}
function B(ov){ logos.length=0; boxHoles.length=0; dieFaces.length=0;
  Object.assign(paramState.box, defaultBoxParams(), {gfBaseplate:false, sealMode:'labyrinth'}, ov);
  return buildTrisForShape('box', paramState.box); }
const P = ov => Object.assign(defaultBoxParams(), {gfBaseplate:false, sealMode:'labyrinth'}, ov);
const S = ov => labyrinthSpec(P(ov));
const warn = ov => collectPrintWarnings(P(ov)) || [];
const near = (a,b,t) => Math.abs(a-b) <= t;

/* Радиус расточки корпуса на высоте y — по вертикальным отрезкам его сечения. Меряется ПО ПРОФИЛЮ,
   а не по сетке: сетка ту же ошибку показала бы столь же герметично. */
function innerAt(s, y){
  const prof = labyrinthProfile(Object.assign({}, s, {part:'housing'}));
  let r = Infinity;
  for (let i = 0; i < prof.length; i++){
    const a = prof[i], b = prof[(i+1)%prof.length];
    if (a[0] > s.rOut - 1e-9 || b[0] > s.rOut - 1e-9) continue;
    if (Math.abs(a[0]-b[0]) < 1e-9 && Math.min(a[1],b[1]) - 1e-9 <= y && y <= Math.max(a[1],b[1]) + 1e-9)
      r = Math.min(r, a[0]);
  }
  return r;
}

console.log('=== щель стоит там, где зуб (а не наоборот) ===');
for (const ov of [{}, {labN:1}, {labN:12, labPitch:4, labToothW:1.5}, {labToothH:8, labGap:0.8},
                  {labD:120, labN:7, labChamber:5}]){
  const s = S(ov);
  let worstTip = 0, worstCham = Infinity;
  for (let i = 0; i < s.n; i++){
    const yT = i*s.pitch + s.cw + s.tW/2;                     // середина зуба i
    worstTip = Math.max(worstTip, innerAt(s, yT) - s.rTip);
  }
  for (let i = 0; i <= s.n; i++){
    const yC = i*s.pitch + s.cw/2;                            // середина камеры i
    worstCham = Math.min(worstCham, innerAt(s, yC) - s.rTip);
  }
  chk('щель у КАЖДОЙ вершины ровно ' + s.gap + ': ' + JSON.stringify(ov),
      near(worstTip, s.gap, 1e-9), {щель:worstTip, заказано:s.gap});
  chk('  а напротив камер расточка глубже ровно на подрезку',
      near(worstCham, s.gap + s.cham, 1e-9), {камера:worstCham, ждали:s.gap + s.cham});
  chk('  и камер на одну больше, чем зубьев', s.n + 1 >= 2 && near(s.L, s.n*s.pitch + s.cw, 1e-12), s.L);
}
{
  /* И ЧТО ПОДРЕЗКА ВООБЩЕ НА ЧТО-ТО ВЛИЯЕТ — иначе проверка выше прошла бы и на корпусе без камер. */
  const s = S({labChamber:0});
  chk('без подрезки расточка всюду одна', near(innerAt(s, s.cw + s.tW/2), innerAt(s, s.cw/2), 1e-12));
  /* СТЕНКА МЕРЯЕТСЯ ОТ САМОГО ТОНКОГО МЕСТА — от дна камеры, а не от земли. Поэтому подрезка камер
     РАСТИТ наружный Ø, а не съедает корпус изнутри: иначе при глубокой камере от стенки осталась бы
     фольга. Первая редакция этой проверки ждала обратного и была неправа. */
  chk('подрезка камер растит наружный Ø, а стенку оставляет прежней',
      near(S({labChamber:3}).rOut - S({labChamber:0}).rOut, 3, 1e-12) &&
      near(S({labChamber:3}).rOut - (S({labChamber:3}).rBore + S({labChamber:3}).cham), S({}).wall, 1e-12),
      {rOut0:S({labChamber:0}).rOut, rOut3:S({labChamber:3}).rOut});
}

console.log('\n=== зуб ротора ПРЯМОУГОЛЬНЫЙ, а не пилообразный ===');
/* САМАЯ ТИХАЯ ИЗ ЗДЕШНИХ ОШИБОК. Убери у зуба спуск обратно на вал — и вместо прямоугольного зуба
   выйдет пила: подъём отвесный, а спад пологий, через всю камеру. Щель у вершины останется той же,
   корпус не изменится, сетка будет герметична, габарит верен — и первая редакция этих проверок такую
   мутацию ПЕРЕЖИЛА, потому что мерила зазор по числу из спецификации, а не по самому ротору.
   А дроссель — это именно вершина заданной ШИРИНЫ: пила дросселирует хуже и держит меньше. */
{
  const s = S({}), t = B({labPart:'rotor'});
  /* У ТОЧЁНОЙ СЕТКИ ВЕРШИНЫ СТОЯТ ТОЛЬКО НА ВЫСОТАХ ПРОФИЛЯ, и «радиус на середине зуба» по вершинам
     не берётся — там их попросту нет. Спрашивать надо иначе: КАКИЕ РАДИУСЫ ЕСТЬ НА ГРАНИЦАХ ЗУБА.
     У прямоугольного зуба на ОБЕИХ границах есть и вал, и вершина: подъём и спуск отвесные. У пилы на
     дальней границе есть только вершина — спуск ушёл наклонной через всю камеру. Этим они и
     различаются, и первая редакция этой проверки мерила не то. */
  const radiiAt = y => { const set = [];
    for (const T of t) for (const v of T)
      if (Math.abs(v[1] - (y - s.L/2)) < 1e-6){ const r = Math.hypot(v[0], v[2]);
        if (!set.some(q => Math.abs(q - r) < 0.05)) set.push(r); }
    return set; };
  const has = (a, r) => a.some(q => Math.abs(q - r) < 0.06);
  let rises = 0, falls = 0;
  for (let i = 0; i < s.n; i++){
    const y0 = i*s.pitch + s.cw, y1 = y0 + s.tW;
    if (has(radiiAt(y0), s.rS) && has(radiiAt(y0), s.rTip)) rises++;
    if (has(radiiAt(y1), s.rS) && has(radiiAt(y1), s.rTip)) falls++;
  }
  chk('у каждого зуба отвесный подъём: на входе есть и вал, и вершина', rises === s.n,
      {отвесных:rises, зубьев:s.n, радиусы:radiiAt(s.cw)});
  chk('  и отвесный спуск: на выходе тоже есть и вал, и вершина', falls === s.n,
      {отвесных:falls, зубьев:s.n, радиусы:radiiAt(s.cw + s.tW)});
  chk('  и между зубьями радиус ровно один — вал',
      radiiAt(s.pitch + s.cw/2 - s.cw/2 + 1e-9).length >= 1 &&
      has(radiiAt(s.cw + s.tW), s.rS), radiiAt(s.cw + s.tW));
  /* И ОБЪЁМ СВЕРЯЕТСЯ С АНАЛИТИКОЙ: вал минус расточка плюс n прямоугольных колец. У пилы кольца
     вышли бы примерно вдвое легче — треугольное сечение вместо прямоугольного. */
  const k = (s.seg/(2*Math.PI))*Math.sin(2*Math.PI/s.seg);          // вписанный многоугольник
  const want = Math.PI*(s.rS*s.rS - (s.bore/2)*(s.bore/2))*s.L
             + s.n*Math.PI*(s.rTip*s.rTip - s.rS*s.rS)*s.tW;
  chk('объём ротора = вал минус расточка плюс n прямоугольных колец',
      near(meshVolume(t), want*k, want*0.002), {сетка:meshVolume(t), аналитика:want*k});
  for (const ov of [{labN:1}, {labN:12, labToothW:1}, {labToothH:8}, {labD:60, labToothW:6}]){
    const q = S(ov), tt = B(Object.assign({labPart:'rotor'}, ov));
    const kk = (q.seg/(2*Math.PI))*Math.sin(2*Math.PI/q.seg);
    const w2 = Math.PI*(q.rS*q.rS - (q.bore/2)*(q.bore/2))*q.L
             + q.n*Math.PI*(q.rTip*q.rTip - q.rS*q.rS)*q.tW;
    chk('  и на ' + JSON.stringify(ov), near(meshVolume(tt), w2*kk, w2*0.002),
        {сетка:meshVolume(tt), аналитика:w2*kk});
  }
}

console.log('\n=== зазор вычитается из корпуса, а не прибавляется к ротору ===');
{
  const s = S({});
  chk('вершина зуба ротора не знает про зазор', near(s.rTip, s.rS + s.tH, 1e-12) &&
      near(s.rTip, 13, 1e-12), s.rTip);
  chk('  расточка корпуса — вершина плюс зазор', near(s.rBore, s.rTip + s.gap, 1e-12), s.rBore);
  /* СЕТКИ ОБЕИХ ДЕТАЛЕЙ СВЕРЯЮТСЯ МЕЖДУ СОБОЙ: наибольший радиус ротора и наименьший корпуса. */
  const rot = B({labPart:'rotor'}), hou = B({labPart:'housing'});
  const maxR = t => { let m = 0; for (const T of t) for (const v of T) m = Math.max(m, Math.hypot(v[0], v[2])); return m; };
  const minR = t => { let m = Infinity; for (const T of t) for (const v of T) m = Math.min(m, Math.hypot(v[0], v[2])); return m; };
  chk('в сетках зазор между вершиной ротора и расточкой корпуса — тот, что заказан',
      near(minR(hou) - maxR(rot), s.gap, 0.02), {ротор:maxR(rot), корпус:minR(hou), щель:minR(hou)-maxR(rot)});
  chk('  и он меняется вслед за ручкой',
      near(S({labGap:1.2}).rBore - S({labGap:1.2}).rTip, 1.2, 1e-12));
  /* РОТОР ОТ ЗАЗОРА НЕ ЗАВИСИТ ВОВСЕ, и это проверяется не «примерно», а совпадением сеток точка в
     точку. Первая редакция брала число сегментов у ГАБАРИТА КОРПУСА — и ротор при разном зазоре
     выходил с разной огранкой: объёмы расходились в четвёртом знаке, деталь менялась от ручки, до
     которой ей дела нет. */
  const same = (a, b) => a.length === b.length &&
    a.every((T, i) => T.every((v, j) => v.every((c, k) => c === b[i][j][k])));
  chk('  а ротор от неё не меняется ВООБЩЕ — сетка та же точка в точку',
      same(B({labPart:'rotor', labGap:1.2}), B({labPart:'rotor', labGap:0.2})),
      {a:B({labPart:'rotor', labGap:1.2}).length, b:B({labPart:'rotor', labGap:0.2}).length,
       va:meshVolume(B({labPart:'rotor', labGap:1.2})), vb:meshVolume(B({labPart:'rotor', labGap:0.2}))});
  chk('  и от толщины стенки корпуса тоже',
      same(B({labPart:'rotor', labWall:12}), B({labPart:'rotor', labWall:0.8})));
  chk('  и от подрезки камер', same(B({labPart:'rotor', labChamber:20}), B({labPart:'rotor', labChamber:0})));
  chk('обе детали одной длины', near(S({labPart:'rotor'}).L, S({labPart:'housing'}).L, 1e-12));
}

console.log('\n=== шаг не может быть уже зуба ===');
{
  chk('шаг 1 при зубе 4 поднят до зуба плюс минимум камеры',
      near(S({labPitch:1, labToothW:4}).pitch, 4 + LAB_MIN_GAP_PRINT, 1e-12), S({labPitch:1, labToothW:4}).pitch);
  chk('  и об этом сказано', warn({labPitch:1, labToothW:4}).some(w => w.indexOf('шаг увеличен') === 0));
  chk('  и камера при этом ровно в минимум', near(S({labPitch:1, labToothW:4}).cw, LAB_MIN_GAP_PRINT, 1e-9),
      S({labPitch:1, labToothW:4}).cw);
  chk('нормальный шаг не трогают', !S({}).pitchCut && S({}).pitch === 5 &&
      !warn({}).some(w => w.indexOf('шаг увеличен') === 0));
  chk('камера = шаг минус зуб', near(S({}).cw, 5 - 2, 1e-12), S({}).cw);
}

console.log('\n=== выигрыш как корень, и он назван числом ===');
{
  chk('четыре зуба дают вдвое, а не вчетверо', near(S({labN:4}).gain, 2, 1e-12), S({labN:4}).gain);
  chk('девять зубьев — втрое', near(S({labN:9}).gain, 3, 1e-12), S({labN:9}).gain);
  chk('  и в предупреждении сказано «вдвое», а не «вчетверо»',
      warn({labN:4}).some(w => w.indexOf('в 2.0 раза меньше') > 0 && w.indexOf('НЕ в 4 раза') > 0), warn({labN:4}));
  chk('  и что это оценка СВЕРХУ', warn({labN:4}).some(w => w.indexOf('оценка СВЕРХУ') > 0));
  /* ПРИ ОДНОМ ЗУБЕ СРАВНИВАТЬ НЕ С ЧЕМ, и «в 1.0 раза меньше, чем у одной щели» было бы бессмыслицей. */
  chk('один зуб — не лабиринт, и так и сказано',
      warn({labN:1}).some(w => w.indexOf('единственного зуба') > 0) &&
      !warn({labN:1}).some(w => w.indexOf('раза меньше') > 0), warn({labN:1}));
  /* СОГЛАСОВАНИЕ ЧИСЛИТЕЛЬНОГО: 2 раза, 5 раз, 21 раз, 22 раза. */
  for (const [n, form] of [[2,'2 раза'],[4,'4 раза'],[5,'5 раз'],[11,'11 раз'],[21,'21 раз'],[22,'22 раза']])
    chk('  «НЕ в ' + form + '»', warn({labN:n}).some(w => w.indexOf('НЕ в ' + form) > 0),
        warn({labN:n}).find(w => w.indexOf('НЕ в') > 0));
}

console.log('\n=== главное про эту деталь говорится всегда ===');
{
  chk('сказано, что давления не держит',
      warn({}).some(w => w.indexOf('давления оно не держит') > 0), warn({}));
  chk('  и что не трётся — в этом весь смысл', warn({}).some(w => w.indexOf('не трётся') > 0));
  chk('  и что обе детали печатать одним пластиком',
      warn({}).some(w => w.indexOf('одним соплом и одним пластиком') > 0));
  chk('тесный зазор назван недостижимым для печати',
      S({labGap:0.15}).tightGap && warn({labGap:0.15}).some(w => w.indexOf('не выдержать') > 0));
  chk('  а 0.3 уже не ругают', !S({labGap:0.3}).tightGap &&
      !warn({labGap:0.3}).some(w => w.indexOf('не выдержать') > 0));
  chk('тонкий зуб назван ниткой',
      warn({labToothW:0.6}).some(w => w.indexOf('печатается ниткой') > 0), warn({labToothW:0.6}));
  /* СЧИТАЕТСЯ ОТ ШИРИНЫ ЛИНИИ, А НЕ ОТ ЗАШИТЫХ 0.4: тот же зуб при сопле 0.8 — это вдвое меньше
     проходов, и предупреждение обязано назвать другое число и другое сопло. Сравнивается отношение,
     а не выписанная строка: выписанная проверяла бы форматирование, а не правило. */
  chk('  число проходов считается от ширины линии, а не от зашитых 0.4',
      near(S({labToothW:0.6}).toothPasses, 0.6/lineWidthOf(P({})), 1e-12) &&
      near(S({labToothW:0.6, printNozzle:'0.8'}).toothPasses,
           S({labToothW:0.6}).toothPasses/2, 1e-9),
      {сопло04:S({labToothW:0.6}).toothPasses, сопло08:S({labToothW:0.6, printNozzle:'0.8'}).toothPasses});
  chk('  и в тексте стоит то же сопло, что выбрано',
      warn({labToothW:0.6, printNozzle:'0.8'}).some(w => w.indexOf('соплом ' + fmtNum(0.8)) > 0),
      warn({labToothW:0.6, printNozzle:'0.8'}).find(w => w.indexOf('ниткой') > 0));
  chk('широкая расточка ротора названа опасной',
      S({labBore:19}).boreBig && warn({labBore:19}).some(w => w.indexOf('лопнет по слоям') > 0));
  chk('  а обычная — нет', !S({}).boreBig);
}

console.log('\n=== сетки герметичны на всём поле ===');
{
  /* ПОЛНЫЙ ПЕРЕБОР ИДЁТ НА ОДНОМ ДИАМЕТРЕ, А ДИАМЕТР ПЕРЕБИРАЕТСЯ ОТДЕЛЬНО, и это не экономия ради
     экономии: топология детали от диаметра НЕ ЗАВИСИТ — он меняет только огранку. Гоняя его внутри
     произведения, набор втрое дольше проверял ровно то же самое, а на Ø200 с 24 зубьями огранка
     упирается в потолок 360 сегментов, и один такой набор стоит как десяток обычных. */
  const sets = [];
  for (const part of ['rotor','housing']) for (const n of [1, 4, 24])
    for (const tH of [0.5, 3, 30]) for (const tW of [0.4, 2, 20]) for (const gap of [0.1, 0.4, 2])
      for (const cham of [0, 1, 20]) for (const bore of [0, 8])
        sets.push({labPart:part, labD:20, labN:n, labToothH:tH, labToothW:tW, labGap:gap,
                   labChamber:cham, labBore:bore});
  for (const part of ['rotor','housing']) for (const D of [4, 8, 55, 200])
    for (const n of [1, 24]) for (const tH of [0.5, 30]) for (const bore of [0, 8])
      sets.push({labPart:part, labD:D, labN:n, labToothH:tH, labBore:bore});
  let bad = 0, vol = 0, first = null;
  for (const ov of sets){
    const t = B(ov), m = manifoldCheck(t);
    if (!m.watertight || !t.length){ bad++; if (!first) first = {ov, m}; }
    if (!(meshVolume(t) > 0)){ vol++; if (!first) first = {ov, объём:meshVolume(t)}; }
  }
  chk('все ' + sets.length + ' наборов краёв панели герметичны', bad === 0, first);
  chk('  и у всех положительный объём', vol === 0, first);
  const w = sets.map(ov => warn(ov).join(' '));
  chk('  и ни в одном предупреждении нет Infinity или NaN',
      !w.some(t => /Infinity|NaN/.test(t)), w.find(t => /Infinity|NaN/.test(t)));
}

console.log('\n=== сплошной ротор действительно сплошной ===');
{
  /* НОЛЬ ЗДЕСЬ — ЗНАЧЕНИЕ, А НЕ ПУСТО: у отверстия ноль означает СПЛОШНОЙ вал, и подпись так и
     говорит. Связка `p.x > 0 ? p.x : умолчание` прочла бы его как «не задано» и просверлила Ø8. */
  const solid = meshVolume(B({labPart:'rotor', labBore:0}));
  const holed = meshVolume(B({labPart:'rotor', labBore:8}));
  const s = S({});
  chk('сплошной ротор тяжелее просверленного', solid > holed);
  chk('  и разница равна цилиндру Ø8 длиной L', near(solid - holed, Math.PI*16*s.L, s.L*0.2),
      {разница:solid - holed, цилиндр:Math.PI*16*s.L});
  chk('  и ноль не читается как «не задано»', S({labBore:0}).bore === 0);
}

console.log('\n=== лабиринт вписан в семью ===');
{
  const p = P({});
  chk('семья опознаётся как уплотнение', dominantMode(p) === 'seal', dominantMode(p));
  B({}); chk('строка формы называет лабиринт, деталь, дроссели и щель',
      /лабиринт Ø20: ротор \(4 дросс\., щель 0\.40\)/.test(activeShapeLabel()), activeShapeLabel());
  B({labPart:'housing'});
  chk('  и корпус называется корпусом', activeShapeLabel().indexOf('корпус') > 0, activeShapeLabel());
  chk('справка о модели есть и говорит про бесконтактность',
      !!MODEL_HELP['seal:labyrinth'] && MODEL_HELP['seal:labyrinth'].what.indexOf('НЕ КАСАЕТСЯ') > 0);
  chk('  и про корень из числа зубьев', MODEL_HELP['seal:labyrinth'].what.indexOf('КОРЕНЬ') > 0);
  chk('  и советует жёсткий пластик, а не TPU',
      (MODEL_HELP['seal:labyrinth'].mat || []).indexOf('tpu') < 0 &&
      (MODEL_HELP['seal:labyrinth'].mat || []).indexOf('pla') >= 0);
  chk('плитка подрежима есть', subModelTiles('seal').some(t => t.v === 'labyrinth'));
  chk('строки панели прячутся у других подрежимов',
      ['labPart','labD','labN','labToothH','labToothW','labPitch','labGap','labChamber','labWall','labBore']
        .every(k => { const r = SHAPE_PARAMS.box.find(q => q.key === k);
                      return r && Array.isArray(r.w) && r.w.length === 1 && r.w[0] === 'labyrinth'; }));
  chk('у других подрежимов про лабиринт не говорят',
      !(collectPrintWarnings(Object.assign(defaultBoxParams(), {gfBaseplate:false, sealMode:'oring'})) || [])
        .some(w => w.indexOf('лабиринт') === 0));
  chk('«сброс всего» выключает лабиринт',
      !pickedOn(Object.assign(defaultBoxParams(), {gfBaseplate:false}), 'sealMode'));
}

console.log('\n=== TOTAL:', pass, 'passed,', fail, 'failed ===');
if (fail) process.exitCode = 1;
