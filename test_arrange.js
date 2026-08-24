// Раскладка по столу принтера. Габарит стола лежит там же, где палитра филамента, — в
// `Metadata/project_settings.config` шаблона Orca, — так что один раз отданный проект отвечает сразу
// на два вопроса: каким цветом печатать и во что укладывать.
//
// Проверяется не «красиво ли легло», а то, что ломается тихо:
//
//   1. ДЕТАЛЬ, КОТОРАЯ НЕ ВЛЕЗЛА, ОСТАЁТСЯ ГДЕ БЫЛА — и об этом СКАЗАНО. Молча оставленная деталь
//      выглядит разложенной: человек видит аккуратную плиту и не видит, что одна модель за её краем.
//
//   2. ДЕТАЛИ НЕ НАКЛАДЫВАЮТСЯ. Раскладка, положившая две модели друг на друга, «работает» — она их
//      подвинула, — и обнаруживается это в слайсере.
//
//   3. РЕЗУЛЬТАТ НЕ ЗАВИСИТ ОТ ПОРЯДКА добавления моделей. Иначе одна и та же сборка раскладывается
//      по-разному от того, в каком порядке её собирали, и сравнить два прогона нельзя.
//
//   4. РАЗБОР СТОЛА ОТКАЗЫВАЕТ ЯВНО. Конфиг без `printable_area`, с мусором вместо точек, с одной
//      точкой — это не стол; вернуть из такого «256×256 по умолчанию» значило бы соврать про принтер.
//
// Run: ./run-all.sh

let pass = 0, fail = 0;
function chk(name, cond, extra){
  if (cond) { pass++; console.log('  OK  ', name); }
  else { fail++; console.log('  FAIL', name, extra !== undefined ? JSON.stringify(extra) : ''); }
}
const TPL = o => JSON.stringify(Object.assign({
  printer_settings_id: 'Bambu Lab P1S 0.4 nozzle', printer_model: 'Bambu Lab P1S',
  printable_area: ['0x0','256x0','256x256','0x256'], printable_height: '256',
  bed_exclude_area: [], filament_colour: ['#000000'] }, o || {}));
/* Плоская коробка w×d: габарит в плане известен точно. Сдвиг ox/oz — НЕ украшение фикстуры: сетка
   модели вовсе не обязана быть центрирована на своём нуле (у половины построителей она и не
   центрирована по X и Z), и раскладка обязана считать положение от ФАКТИЧЕСКОГО пятна, а не от нуля.
   На симметричной коробке эта разница не видна вовсе — обе арифметики дают одно и то же. */
const boxTris = (w, d, ox, oz) => {
  const X = ox || 0, Z = oz || 0;
  const V = [[X-w/2,0,Z-d/2],[X+w/2,0,Z-d/2],[X+w/2,0,Z+d/2],[X-w/2,0,Z+d/2],
             [X-w/2,10,Z-d/2],[X+w/2,10,Z-d/2],[X+w/2,10,Z+d/2],[X-w/2,10,Z+d/2]];
  const F = [[0,1,2],[0,2,3],[4,6,5],[4,7,6],[0,4,5],[0,5,1],[1,5,6],[1,6,2],[2,6,7],[2,7,3],[3,7,4],[3,4,0]];
  return F.map(f => f.map(i => V[i])); };
const put = (n, w, d, ov) => { const o = ov || {}; const rec = Object.assign({ id:'m'+(models.length+1), name:n,
  color:'#101010', visible:true, rawTris: boxTris(w, d, o.ox, o.oz), shape:'box', params:{},
  rx:0, ry:0, rz:0, px:99, py:0, pz:-77 }, o); models.push(rec); return rec; };
// Пятно модели в плане, уже с поворотом и положением — то, что увидит стол.
const rectOf = m => { const b = computeBBox(rotateTris(m.rawTris, m.rx, m.ry, m.rz));
  return { x: b.minX + m.px, z: b.minZ + m.pz, w: b.maxX - b.minX, d: b.maxZ - b.minZ }; };
const apart = (A, B) => A.x + A.w <= B.x + 1e-9 || B.x + B.w <= A.x + 1e-9 ||
                        A.z + A.d <= B.z + 1e-9 || B.z + B.d <= A.z + 1e-9;
const reset = () => { models.length = 0; logos.length = 0; activeModelId = null; orcaTemplate = null; };

console.log('=== стол читается из шаблона проекта ===');
{
  const b = orcaBedSpec(TPL());
  chk('габарит взят из printable_area', b && b.w === 256 && b.d === 256, b);
  chk('и высота — из printable_height', b.h === 256, b.h);
  chk('и принтер назван', /P1S/.test(b.name), b.name);
  chk('запретной зоны нет', b.exclude === false);
  chk('а если есть — сказано', orcaBedSpec(TPL({bed_exclude_area:['0x0','18x0','18x28','0x28']})).exclude === true);
  // Прямоугольник берётся ГАБАРИТНЫЙ: стол бывает и не прямоугольным, а полки всё равно прямоугольные.
  const round = orcaBedSpec(TPL({printable_area:['0x100','100x0','200x100','100x200']}));
  chk('у неправильного стола берётся габаритный прямоугольник', round.w === 200 && round.d === 200, round);
  const rect = orcaBedSpec(TPL({printable_area:['0x0','350x0','350x250','0x250'], printable_height:'300'}));
  chk('прямоугольный стол читается как прямоугольный', rect.w === 350 && rect.d === 250, rect);

  /* ОТКАЗ ЯВНЫЙ, А НЕ «ПО УМОЛЧАНИЮ». Вернуть из нечитаемого конфига правдоподобные 256×256 значило бы
     соврать про чужой принтер, и проверить это никто бы не смог. */
  chk('не-JSON — не стол', orcaBedSpec('какой-то мусор') === null);
  chk('массив вместо объекта — не стол', orcaBedSpec('[1,2,3]') === null);
  chk('конфиг без printable_area — не стол', orcaBedSpec(TPL({printable_area: undefined})) === null);
  chk('двух точек мало', orcaBedSpec(TPL({printable_area:['0x0','10x10']})) === null);
  chk('мусор вместо точки — не стол', orcaBedSpec(TPL({printable_area:['0x0','гдето','10x10']})) === null);
  chk('вырожденный стол — не стол', orcaBedSpec(TPL({printable_area:['0x0','0x0','0x0']})) === null);
  chk('без высоты стол всё равно стол', orcaBedSpec(TPL({printable_height: undefined})).h === 0);
  chk('высота списком тоже читается', orcaBedSpec(TPL({printable_height:['180']})).h === 180);
}

console.log('\n=== раскладка: что влезло и что нет ===');
{
  const bed = { w: 256, d: 256 };
  const plan = arrangePlan([{w:60,d:40},{w:100,d:90},{w:30,d:30}], bed, 3);
  chk('влезли все три', plan.placed.length === 3 && plan.over.length === 0, plan.over);
  chk('и пятно не шире стола', plan.used.w <= bed.w && plan.used.d <= bed.d, plan.used);
  const big = arrangePlan([{w:60,d:40},{w:300,d:20}], bed, 3);
  chk('деталь шире стола не влезает В ОДИНОЧКУ', big.over.join() === '1', big.over);
  chk('и остальные от этого не страдают', big.placed.length === 1 && big.placed[0].i === 0, big.placed);
  chk('глубже стола — тоже не влезает', arrangePlan([{w:10,d:300}], bed, 3).over.join() === '0');
  // Полная плита: сколько бы ни просили, за край не уедет ни одна из размещённых.
  const many = [];
  for (let k = 0; k < 40; k++) many.push({w: 50, d: 50});
  const full = arrangePlan(many, bed, 3);
  chk('на полной плите часть остаётся за бортом', full.over.length > 0, full.over.length);
  chk('и всё размещённое — внутри стола',
      full.placed.every(q => q.x >= -1e-9 && q.z >= -1e-9 && q.x + q.w <= bed.w + 1e-9 && q.z + q.d <= bed.d + 1e-9),
      full.placed.filter(q => q.x + q.w > bed.w + 1e-9 || q.z + q.d > bed.d + 1e-9));
  chk('ни одна деталь не потерялась', full.placed.length + full.over.length === many.length,
      [full.placed.length, full.over.length]);
  chk('и ни одна не посчитана дважды',
      new Set(full.placed.map(q => q.i).concat(full.over)).size === many.length);
  chk('пустая сборка не ломается', arrangePlan([], bed, 3).placed.length === 0);
  chk('нулевой габарит не размещается', arrangePlan([{w:0,d:10},{w:10,d:0}], bed, 3).over.length === 2);
}

console.log('\n=== раскладка: детали не накладываются ===');
{
  /* Раскладка, положившая две модели друг на друга, «работает» — она их подвинула, — и обнаруживается
     это в слайсере. Перекрытие считается по прямоугольникам в плане, с зазором: соседи обязаны стоять
     врозь не менее чем на просвет, иначе юбка первой сольётся с юбкой второй. */
  const bed = { w: 256, d: 256 }, gap = 3;
  const sets = [
    [{w:60,d:40},{w:100,d:90},{w:30,d:30}],
    [{w:50,d:50},{w:50,d:50},{w:50,d:50},{w:50,d:50},{w:50,d:50},{w:50,d:50}],
    [{w:120,d:10},{w:120,d:10},{w:120,d:10},{w:5,d:200},{w:80,d:80}],
    [{w:7,d:7},{w:250,d:3},{w:3,d:250},{w:40,d:40}],
  ];
  let bad = 0, at = null;
  for (const s of sets){
    const p = arrangePlan(s, bed, gap);
    for (let a = 0; a < p.placed.length; a++) for (let b = a+1; b < p.placed.length; b++){
      const A = p.placed[a], B = p.placed[b];
      const apart = A.x + A.w <= B.x + 1e-9 || B.x + B.w <= A.x + 1e-9 ||
                    A.z + A.d <= B.z + 1e-9 || B.z + B.d <= A.z + 1e-9;
      if (!apart){ bad++; if (!at) at = {A, B}; }
    }
  }
  chk('ни одна пара не перекрывается', bad === 0, at);
  // ...и просвет между соседями по строке — не меньше заказанного.
  const row = arrangePlan([{w:40,d:40},{w:40,d:40},{w:40,d:40}], bed, 5);
  const xs = row.placed.slice().sort((a,b) => a.x - b.x);
  chk('просвет между соседями — заказанный',
      xs.every((q, k) => k === 0 || q.x - (xs[k-1].x + xs[k-1].w) >= 5 - 1e-9),
      xs.map(q => [q.x, q.w]));
}

console.log('\n=== раскладка не зависит от порядка добавления ===');
{
  /* Иначе одна и та же сборка раскладывается по-разному от того, в каком порядке её собирали, и два
     прогона нельзя сравнить. Порядок внутри раскладки задан ЯВНО — по убыванию глубины, при равенстве
     по ширине, при равенстве по исходному номеру, — и последнее звено тут не украшение: без него две
     одинаковые детали меняются местами от прогона к прогону. */
  const bed = { w: 200, d: 200 };
  const A = [{w:60,d:40},{w:100,d:90},{w:30,d:30},{w:45,d:70}];
  const key = p => p.placed.slice()
    .sort((a,b) => a.i - b.i)
    .map(q => q.i + '@' + q.x.toFixed(3) + ',' + q.z.toFixed(3)).join('|');
  const straight = key(arrangePlan(A, bed, 3));
  const shuffled = A.map((_, k) => A[(k + 2) % A.length]);
  const back = arrangePlan(shuffled, bed, 3);
  // Разложенные габариты те же, просто под другими номерами — сверяем по габаритам, а не по индексам.
  const asWD = p => p.placed.slice().sort((a,b) => a.x - b.x || a.z - b.z)
    .map(q => q.w + 'x' + q.d + '@' + q.x.toFixed(3) + ',' + q.z.toFixed(3)).join('|');
  chk('перестановка входа не меняет картину', asWD(arrangePlan(A, bed, 3)) === asWD(back),
      [asWD(arrangePlan(A, bed, 3)), asWD(back)]);
  chk('и повторный вызов даёт то же самое', key(arrangePlan(A, bed, 3)) === straight);
  // Одинаковые детали не тасуются: последнее звено сравнения — исходный номер.
  const same = arrangePlan([{w:20,d:20},{w:20,d:20},{w:20,d:20}], bed, 3);
  chk('одинаковые детали идут в исходном порядке',
      same.placed.map(q => q.i).join() === '0,1,2', same.placed.map(q => q.i));

  /* «ПО УБЫВАНИЮ ГЛУБИНЫ» — ПРОВЕРЯЕМОЕ УТВЕРЖДЕНИЕ, а не пояснение в комментарии. Из него прямо
     следует наблюдаемое свойство: у полок, считая от ближней, глубина не растёт. Первая полка забирает
     самые глубокие детали, каждая следующая начинается с более мелкой — иначе она началась бы раньше.

     Проверяется на наборе, где ширина и глубина АНТИКОРРЕЛИРОВАНЫ: там сортировка по ширине и
     сортировка по возрастанию дают заметно другой ответ, а на «широкое значит глубокое» все три порядка
     совпали бы, и проверка ловила бы воздух. */
  const anti = [];
  for (let k = 1; k <= 9; k++) anti.push({ w: k*10, d: 100 - k*10 });
  const p2 = arrangePlan(anti, { w: 200, d: 400 }, 3);
  chk('все девять разложены', p2.placed.length === 9, p2.over);
  const shelves = new Map();
  for (const q of p2.placed) shelves.set(q.z, Math.max(shelves.get(q.z) || 0, q.d));
  const depths = [...shelves.keys()].sort((a, b) => a - b).map(z => shelves.get(z));
  chk('глубина полок не растёт от ближней к дальней',
      depths.every((v, k) => k === 0 || v <= depths[k-1] + 1e-9), depths);
  chk('и полок больше одной — иначе утверждать нечего', depths.length > 1, depths.length);
}

console.log('\n=== применение к сборке ===');
{
  reset();
  put('A', 60, 40); put('B', 100, 90); put('C', 30, 30);
  const before = models.map(m => [m.px, m.pz]);
  chk('до раскладки все лежат где попало', before.every(q => q[0] === 99 && q[1] === -77));
  const moved = arrangeApply();
  chk('подвинуты все три', moved === 3, moved);
  chk('и никто не остался на прежнем месте', models.every(m => m.px !== 99 || m.pz !== -77),
      models.map(m => [m.px, m.pz]));
  // Габариты в плане после раскладки не перекрываются — уже на настоящих моделях.
  const rects = models.map(rectOf);
  let over = 0;
  for (let a = 0; a < rects.length; a++) for (let b = a+1; b < rects.length; b++)
    if (!apart(rects[a], rects[b])) over++;
  chk('и настоящие модели не накладываются', over === 0, rects);
  chk('высоту раскладка не трогает', models.every(m => m.py === 0), models.map(m => m.py));
  chk('и поворот тоже', models.every(m => m.rx === 0 && m.ry === 0 && m.rz === 0));
  // Невидимая модель не участвует и не двигается.
  const hidden = put('Скрытая', 20, 20, { visible:false });
  arrangeApply();
  chk('невидимую не двигают', hidden.px === 99 && hidden.pz === -77, [hidden.px, hidden.pz]);
  /* НЕ ВЛЕЗШАЯ ОСТАЁТСЯ ГДЕ БЫЛА. Это осознанный выбор, а не недоделка: подвинуть её «куда-нибудь»
     значило бы выдать неразложенную деталь за разложенную. */
  reset();
  put('Мелкая', 20, 20); const giant = put('Гигант', 400, 20);
  const n = arrangeApply();
  chk('мелкую разложило', models[0].px !== 99, models[0].px);
  chk('а гиганта не тронули', giant.px === 99 && giant.pz === -77, [giant.px, giant.pz]);
  chk('и он не посчитан подвинутым', n === 1, n);
  reset();
  chk('пустая сборка не ломает применение', arrangeApply() === 0);
}

console.log('\n=== смещённая сетка и поворот ===');
{
  /* ДВА СЛЕПЫХ ПЯТНА СИММЕТРИЧНОЙ ФИКСТУРЫ. Модель, чья сетка НЕ центрирована на своём нуле, и модель,
     повёрнутая на четверть оборота, — обе кладутся правильно только если раскладка меряет фактическое
     пятно, а не нулевую точку и не исходные габариты. На коробке, центрированной и неповёрнутой, обе
     ошибки дают ровно тот же ответ, что и правильный расчёт: проверка «не накладываются» их пропускала. */
  reset();
  put('Смещённая', 60, 40, { ox: 120, oz: -80 });
  put('Повёрнутая', 100, 20, { ry: 90 });
  put('Обычная', 50, 50);
  arrangeApply();
  const rects = models.map(rectOf);
  let over = 0;
  for (let a = 0; a < rects.length; a++) for (let b = a+1; b < rects.length; b++)
    if (!apart(rects[a], rects[b])) over++;
  chk('смещённая и повёрнутая тоже не накладываются', over === 0, rects);
  chk('у повёрнутой на 90° ширина и глубина меняются местами',
      Math.abs(rects[1].w - 20) < 1e-6 && Math.abs(rects[1].d - 100) < 1e-6,
      [rects[1].w, rects[1].d]);
  chk('а у смещённой габарит остаётся своим',
      Math.abs(rects[0].w - 60) < 1e-6 && Math.abs(rects[0].d - 40) < 1e-6, [rects[0].w, rects[0].d]);
  /* ПЯТНО ЦЕНТРУЕТСЯ ЦЕЛИКОМ. Раскладка отвечает за взаимное расположение, а не за угол стола, поэтому
     всё разложенное встаёт вокруг нуля сетки — иначе сборка уезжала бы в угол тем дальше, чем больше
     деталей, и это было бы видно только в слайсере. */
  const lo = [Math.min(...rects.map(r => r.x)), Math.min(...rects.map(r => r.z))];
  const hi = [Math.max(...rects.map(r => r.x + r.w)), Math.max(...rects.map(r => r.z + r.d))];
  chk('и всё пятно стоит вокруг нуля',
      Math.abs(lo[0] + hi[0]) < 1e-6 && Math.abs(lo[1] + hi[1]) < 1e-6,
      [(lo[0] + hi[0])/2, (lo[1] + hi[1])/2]);
  reset();
}

console.log('\n=== строка под кнопкой говорит правду ===');
{
  reset();
  chk('пустая сборка так и говорит', /нет видимых моделей/.test(arrangeNoteText()), arrangeNoteText());
  put('A', 60, 40); put('B', 100, 90);
  chk('без шаблона сказано, что стол не объявлен',
      /Стол не объявлен/.test(arrangeNoteText()), arrangeNoteText());
  chk('и предложено его отдать', /шаблон проекта Orca/.test(arrangeNoteText()));
  orcaTemplate = { name:'мой.3mf', cfg: TPL() };
  chk('с шаблоном назван принтер', /P1S/.test(arrangeNoteText()), arrangeNoteText());
  chk('и его габарит', /256×256×256/.test(arrangeNoteText()), arrangeNoteText());
  chk('и то, что всё влезает', /Все 2 укладываются/.test(arrangeNoteText()), arrangeNoteText());
  put('Гигант', 400, 20);
  chk('а когда не влезает — сказано сколько', /Не влезло 1 из 3/.test(arrangeNoteText()), arrangeNoteText());
  orcaTemplate = { name:'мой.3mf', cfg: TPL({bed_exclude_area:['0x0','18x0','18x28','0x28']}) };
  chk('про запретную зону сказано отдельно',
      /запретная зона — раскладка её НЕ учитывает/.test(arrangeNoteText()), arrangeNoteText());
  chk('а без неё — не сказано',
      !/запретная зона/.test((orcaTemplate = {name:'x', cfg:TPL()}, arrangeNoteText())));
  reset();
}

console.log(`\n=== TOTAL: ${pass} passed, ${fail} failed ===`);
process.exit(fail ? 1 : 0);
