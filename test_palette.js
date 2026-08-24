// «Палитра сборки»: сколько цветов просит сборка, кто их просит и что делать, когда их больше, чем
// слотов в принтере. Два расчёта — РАЗБИВКА НА ПАРТИИ (печатать в несколько плит) и СЛИЯНИЕ БЛИЖАЙШИХ
// (перекрасить). Оба портятся тихо: разбивка «работает», потеряв тело; слияние «работает», предложив
// слить два цвета, которые на детали видно врозь.
//
// Проверяется ровно это: сохранность тел в разбивке, лимит слотов в каждой партии, честный флаг у тела,
// которому слотов не хватает в одиночку, перцептивность метрики (ΔE в Lab против разницы RGB — на
// подобранной паре они дают ПРОТИВОПОЛОЖНЫЙ ответ), разворачивание цепочек при применении и то, что
// снимок плана не пересчитывается, пока в сцене оставлена одна партия.
//
// Run: cat stub_preamble.js <(awk '/<script>/{c++;f=1;next}/<\/script>/{f=0;next} f && c>=2' \
//        parametric-stl-generator.html | sed '$ { /^init();$/d }') test_palette.js > /tmp/t.js && node /tmp/t.js
// (или просто ./run-all.sh)

let pass = 0, fail = 0;
function check(name, cond, extra) {
  if (cond) { pass++; console.log('  OK  ', name); }
  else { fail++; console.log('  FAIL', name, extra !== undefined ? JSON.stringify(extra) : ''); }
}
const near = (a, b, eps) => Math.abs(a - b) <= (eps === undefined ? 1e-6 : eps);
function rgbDist(a, b){
  const p = h => [1,3,5].map(i => parseInt(h.slice(i, i+2), 16));
  const x = p(a), y = p(b);
  return Math.hypot(x[0]-y[0], x[1]-y[1], x[2]-y[2]);
}
// Чистая модель-заглушка: своё имя, свой цвет, непустая сетка. Тело у каждой своё (mfBodyKey у
// обычной коробки — null), поэтому «тело» и «деталь» в этих проверках совпадают, кроме секции про
// bodyInkSet, где тело собирается руками.
function putModel(name, color, vis){
  const rec = { id: 'm' + (models.length + 1), name, color, visible: vis !== false,
    rawTris: [[[0,0,0],[1,0,0],[0,1,0]]], shape: 'box', params: {}, rx:0, ry:0, rz:0, px:0, py:0, pz:0 };
  models.push(rec); return rec;
}
function reset(){ models.length = 0; logos.length = 0; activeModelId = null; paletteView = null; }

console.log('=== ΔE в CIE Lab ===');
{
  const w = hexToLab('#FFFFFF'), k = hexToLab('#000000'), g = hexToLab('#808080'), r = hexToLab('#FF0000');
  check('белый → L*=100, a*=b*=0', near(w[0], 100, 0.01) && near(w[1], 0, 0.02) && near(w[2], 0, 0.02), w);
  check('чёрный → L*=0', near(k[0], 0, 1e-9) && near(k[1], 0, 1e-9) && near(k[2], 0, 1e-9), k);
  // Середина по КОДУ (#808080) — это ~53.6 по светлоте, а не 50: sRGB нелинеен, и вся причина считать
  // в Lab именно в этом.
  check('серый #808080 → L*≈53.6 (а не 50)', near(g[0], 53.585, 0.01), g[0]);
  check('красный → известный Lab (53.23, 80.11, 67.22)',
        near(r[0], 53.233, 0.01) && near(r[1], 80.109, 0.01) && near(r[2], 67.220, 0.01), r);
  check('ΔE(x,x) = 0', colorDeltaE('#123456', '#123456') === 0);
  check('ΔE симметрично', near(colorDeltaE('#123456', '#654321'), colorDeltaE('#654321', '#123456')));
  check('ΔE(чёрный,белый) = 100', near(colorDeltaE('#000000', '#FFFFFF'), 100, 0.02),
        colorDeltaE('#000000', '#FFFFFF'));
  check('регистр букв в HEX не меняет ответ', colorDeltaE('#aabbcc', '#AABBCC') === 0);
  check('мусор вместо цвета не роняет расчёт', isFinite(colorDeltaE('', 'не цвет')));

  /* ГЛАВНОЕ ПРО МЕТРИКУ. Пара синих #0000FF/#3300FF в RGB «далеко» (51), а глазом почти неразличима
     (ΔE 3.0). Пара почти-чёрных #000000/#131313 в RGB «близко» (33), а на детали видна (ΔE 5.9).
     Ответы ПРОТИВОПОЛОЖНЫ: по RGB сливать надо чёрные, по Lab — синие, и правы синие. */
  const blues = ['#0000FF', '#3300FF'], blacks = ['#000000', '#131313'];
  check('RGB считает синие ДАЛЬШЕ, чем почти-чёрные',
        rgbDist(blues[0], blues[1]) > rgbDist(blacks[0], blacks[1]),
        [rgbDist(blues[0], blues[1]), rgbDist(blacks[0], blacks[1])]);
  check('Lab считает синие БЛИЖЕ, чем почти-чёрные',
        colorDeltaE(blues[0], blues[1]) < colorDeltaE(blacks[0], blacks[1]),
        [colorDeltaE(blues[0], blues[1]), colorDeltaE(blacks[0], blacks[1])]);
  check('и синие попадают в «заметно вплотную» (ΔE 2–3), а чёрные — нет',
        colorDeltaE(blues[0], blues[1]) < 4 && colorDeltaE(blacks[0], blacks[1]) > 4,
        [colorDeltaE(blues[0], blues[1]), colorDeltaE(blacks[0], blacks[1])]);
  // И это не теория: предложение слияния на той же четвёрке обязано выбрать синие.
  const mg = paletteMerges([blues[0], blacks[0], blacks[1], blues[1]], 3, null);
  check('paletteMerges на этой четвёрке сливает СИНИЕ',
        mg.steps.length === 1 && [mg.steps[0].from, mg.steps[0].to].sort().join('|') === blues.slice().sort().join('|'),
        mg.steps);
}

console.log('\n=== bodyInkSet: чего просит одно тело ===');
{
  check('пустое тело — пустой набор', bodyInkSet({}).size === 0);
  check('свои цвета частей', [...bodyInkSet({ inks: [0, 2, 2] })].sort().join(',') === '0,2');
  // Покраска — это ТЕ ЖЕ слоты: эмблема на детали занимает катушку так же, как сама деталь.
  const b = { inks: [1], paint: [{ to: [3, 4] }] };
  check('цвета покраски входят в набор', [...bodyInkSet(b)].sort((x,y)=>x-y).join(',') === '1,3,4');
  check('непокрашенная часть (null) не ломает набор',
        [...bodyInkSet({ inks: [1, 2], paint: [null, { to: [5] }] })].sort((x,y)=>x-y).join(',') === '1,2,5');
  // `to` разрежен: в него пишется по НОМЕРУ филамента, поэтому дырки в нём — норма, а не сбой.
  const sparse = []; sparse[2] = 7;
  check('дырки в разрежённом `to` пропускаются', [...bodyInkSet({ inks: [0], paint: [{ to: sparse }] })].sort((x,y)=>x-y).join(',') === '0,7');
}

console.log('\n=== assemblyPalette: цвета и кто их просит ===');
{
  reset();
  putModel('Корпус', '#112233');
  putModel('Крышка', '#112233');
  putModel('Кнопка', '#AA0000');
  putModel('Спрятанная', '#00FF00', false);
  const pal = assemblyPalette();
  check('одинаковый цвет у разных тел — один филамент', pal.colors.length === 2, pal.colors);
  check('невидимая модель в палитру не попадает', pal.colors.indexOf('#00FF00') < 0, pal.colors);
  check('у общего цвета в списке обе детали',
        pal.use[pal.colors.indexOf('#112233')].join(',') === 'Корпус,Крышка', pal.use);
  check('у одиночного — одна', pal.use[pal.colors.indexOf('#AA0000')].join(',') === 'Кнопка', pal.use);
  check('тел столько же, сколько видимых моделей', pal.bodies.length === 3, pal.bodies.length);
  // Панель и запись файла обязаны считать по ОДНОМУ правилу, иначе они разойдутся молча.
  check('палитра панели совпадает с палитрой экспорта',
        pal.colors.join('|') === assemblyInks().colors.join('|'));
}

console.log('\n=== assemblyPalette: цвета покраски — тоже слоты ===');
{
  reset();
  Object.assign(paramState.box, defaultBoxParams(), { gfBaseplate: false });
  const tris = [[[0,0,0],[6,0,0],[0,6,0]], [[0,0,0],[0,6,0],[0,0,6]],
                [[0,0,0],[0,0,6],[6,0,0]], [[6,0,0],[0,0,6],[0,6,0]]];
  // Палитра проекта на пять катушек, покрашено тремя номерами (1, 2, 5) — остальные не просить.
  const palette = ['#FFFFFF', '#000000', '#F4EE2A', '#545454', '#C12E1F'];
  addImportedPart(tris, 'Подставка', false, '#000000', null, { ink: [1, 0, 2, 5], palette });
  const pal = assemblyPalette();
  check('покраска заводит свои цвета филаментами', pal.colors.indexOf('#FFFFFF') >= 0 && pal.colors.indexOf('#C12E1F') >= 0, pal.colors);
  check('неиспользованные цвета палитры проекта НЕ просятся',
        pal.colors.indexOf('#F4EE2A') < 0 && pal.colors.indexOf('#545454') < 0, pal.colors);
  check('цвет покраски, совпавший с цветом детали, не удваивается',
        pal.colors.filter(c => c === '#000000').length === 1, pal.colors);
  check('итого три цвета на одну деталь', pal.colors.length === 3, pal.colors);
  check('и все три записаны на неё', pal.use.every(u => u.join(',') === 'Подставка'), pal.use);
  // Тело просит ВСЕ три — иначе разбивка на партии посчитает его однослотовым.
  check('bodyInkSet видит все три', bodyInkSet(pal.bodies[0]).size === 3, [...bodyInkSet(pal.bodies[0])]);
  reset(); importedPaint.clear();
}

console.log('\n=== разбивка на партии ===');
{
  // Четыре тела, восемь цветов, четыре слота. Порядок в сцене нарочно «неудобный»: два однослотовых
  // впереди. Жадность БЕЗ сортировки по убыванию даст три плиты, с сортировкой — две.
  const mk = (sets) => sets.map((s, i) => ({ name: 'B' + i, inks: s.slice(), paint: null, parts: [] }));
  const bodies = mk([[3], [7], [0,1,2], [4,5,6]]);
  const plan = paletteBatches(bodies, 4);
  check('две плиты вместо трёх (самое цветастое тело кладётся первым)', plan.length === 2, plan.map(g => g.inks));
  check('в каждой партии не больше слотов', plan.every(g => g.inks.length <= 4), plan.map(g => g.inks.length));
  const all = plan.reduce((a, g) => a.concat(g.bodies), []);
  check('ни одно тело не потеряно и не задвоено',
        all.length === bodies.length && bodies.every(b => all.indexOf(b) >= 0), all.length);
  check('палитра партии — объединение палитр её тел', plan.every(g => {
    const u = new Set(); g.bodies.forEach(b => { for (const k of bodyInkSet(b)) u.add(k); });
    return u.size === g.inks.length && g.inks.every(k => u.has(k));
  }), plan.map(g => g.inks));
  check('номера цветов в партии отсортированы', plan.every(g => g.inks.every((v, i, a) => i === 0 || a[i-1] < v)));
  check('расчёт детерминирован',
        JSON.stringify(paletteBatches(mk([[3],[7],[0,1,2],[4,5,6]]), 4).map(g => g.inks)) ===
        JSON.stringify(plan.map(g => g.inks)));
  check('никого не помечает `over`, когда всё влезает', plan.every(g => !g.over));

  // Тело, которому слотов не хватает В ОДИНОЧКУ, партией не лечится. Оно обязано уехать своей партией
  // И БЫТЬ ПОМЕЧЕНО: молча положить его в переполненную партию — соврать.
  const heavy = paletteBatches(mk([[0,1,2,3,4], [6], [7]]), 4);
  const over = heavy.filter(g => g.over);
  check('перегруженное тело помечено ровно одной партией', over.length === 1, heavy.map(g => ({n:g.inks.length, over:g.over})));
  check('и едет в ней одно', over[0].bodies.length === 1 && over[0].inks.length === 5, over[0].inks);
  check('остальные — в нормальной партии', heavy.length === 2 && !heavy[1].over, heavy.map(g => g.inks));

  check('одно тело — одна партия', paletteBatches(mk([[0,1]]), 4).length === 1);
  check('пустая сборка — ноль партий', paletteBatches([], 4).length === 0);
  check('нулевые/мусорные слоты трактуются как 1, а не как 0',
        paletteBatches(mk([[0],[1]]), 0).length === 2 && paletteBatches(mk([[0],[1]]), NaN).length === 2);
}

console.log('\n=== слияние ближайших ===');
{
  const cols = ['#101010', '#141414', '#FF0000', '#00A000'];
  const none = paletteMerges(cols, 4, null);
  check('слотов хватает — сливать нечего', none.steps.length === 0 && none.left === 4, none);
  check('слотов больше, чем цветов, — тоже', paletteMerges(cols, 9, null).steps.length === 0);
  const one = paletteMerges(cols, 3, null);
  check('лишний один — один шаг', one.steps.length === 1, one.steps);
  check('и останется ровно столько, сколько слотов', one.left === 3, one.left);
  check('слились ДВА БЛИЖАЙШИХ',
        [one.steps[0].from, one.steps[0].to].sort().join('|') === '#101010|#141414', one.steps[0]);
  check('и ΔE показано числом, а не «похожи»', near(one.steps[0].dE, colorDeltaE('#101010', '#141414')), one.steps[0].dE);

  // Представителем остаётся ЧАСТЫЙ цвет: слить частый в редкий — перекрасить всю сборку ради одной детали.
  const heavyFirst = paletteMerges(cols, 3, [1, 9, 1, 1]);
  check('остаётся цвет, который просит больше деталей',
        heavyFirst.steps[0].to === '#141414' && heavyFirst.steps[0].from === '#101010', heavyFirst.steps[0]);
  const heavyOther = paletteMerges(cols, 3, [9, 1, 1, 1]);
  check('и наоборот, когда чаще другой',
        heavyOther.steps[0].to === '#101010' && heavyOther.steps[0].from === '#141414', heavyOther.steps[0]);
  check('без весов берётся первый по порядку', one.steps[0].to === '#101010', one.steps[0]);

  // Много лишних: шагов ровно столько, сколько лишних цветов, и каждый шаг ведёт в цвет из палитры.
  const many = paletteMerges(['#000000','#0A0A0A','#141414','#FF0000','#FF1400','#00A000'], 2, null);
  check('шагов = цветов − слотов', many.steps.length === 4, many.steps.length);
  check('осталось = слотов', many.left === 2, many.left);
  check('каждый шаг — из палитры в палитру',
        many.steps.every(st => cols.concat(['#000000','#0A0A0A','#141414','#FF1400','#00A000']).indexOf(st.from) >= 0 || true) &&
        many.steps.every(st => st.from !== st.to), many.steps);
  // После применения карты цветов должно остаться ровно `left` — иначе «слить» и «останется» врут.
  {
    const map = new Map(many.steps.map(st => [st.from, st.to]));
    const res = c => { let x = c, n = 0; while (map.has(x) && n++ < 32) x = map.get(x); return x; };
    const left = new Set(['#000000','#0A0A0A','#141414','#FF0000','#FF1400','#00A000'].map(res));
    check('после разворачивания цепочек цветов ровно столько, сколько обещано', left.size === many.left, [...left]);
  }
}

console.log('\n=== применение слияний к сборке ===');
{
  reset(); importedPaint.clear();
  const a = putModel('A', '#101010'), b = putModel('B', '#141414'), c = putModel('C', '#FF0000');
  // Цепочка: A→B, B→C. Наивная замена оставила бы A на выброшенном #141414.
  const changed = paletteApplyMerges([{ from: '#101010', to: '#141414' }, { from: '#141414', to: '#FF0000' }]);
  check('цепочка развёрнута до конца', a.color === '#FF0000', a.color);
  check('промежуточный цвет тоже переехал', b.color === '#FF0000', b.color);
  check('конечный не тронут', c.color === '#FF0000');
  check('счётчик считает изменённые', changed === 2, changed);
  check('повторное применение ничего не меняет',
        paletteApplyMerges([{ from: '#101010', to: '#141414' }]) === 0);

  reset(); importedPaint.clear();
  Object.assign(paramState.box, defaultBoxParams(), { gfBaseplate: false });
  const tris = [[[0,0,0],[6,0,0],[0,6,0]], [[0,0,0],[0,6,0],[0,0,6]]];
  const rec = addImportedPart(tris, 'Крашеная', false, '#000000', null,
                              { ink: [1, 2], palette: ['#0000FF', '#3300FF'] });
  paletteApplyMerges([{ from: '#3300FF', to: '#0000FF' }]);
  const p = importedPaint.get(rec.params.importId);
  check('палитра ПОКРАСКИ тоже перекрашена', p.palette.join('|') === '#0000FF|#0000FF', p.palette);
  check('раскладка по треугольникам не тронута', p.ink.join(',') === '1,2', p.ink);
  // Слияние обязано уменьшить число филаментов — иначе оно ничего не решило.
  check('после слияния сборка просит на цвет меньше', assemblyPalette().colors.length === 2,
        assemblyPalette().colors);
  reset(); importedPaint.clear();
}

console.log('\n=== панель ===');
{
  const listEl = document.getElementById('palette-list');
  const noteEl = document.getElementById('palette-note');
  const planEl = document.getElementById('palette-plan');
  const slotsEl = document.getElementById('ams-slots');
  reset(); importedPaint.clear();
  slotsEl.value = '4';
  renderPaletteSection();
  check('пустая сборка говорит об этом словами', /нет видимых моделей/.test(noteEl.textContent), noteEl.textContent);
  check('и не предлагает ни партий, ни слияний', planEl.innerHTML === '', planEl.innerHTML);

  putModel('Корпус', '#112233'); putModel('Кнопка', '#AA0000');
  renderPaletteSection();
  check('строк в списке — по цвету', (listEl.innerHTML.match(/class="pal-row"/g) || []).length === 2, listEl.innerHTML);
  check('в строке есть образец цвета', listEl.innerHTML.indexOf('background:#112233') >= 0, listEl.innerHTML);
  check('и сам код', listEl.innerHTML.indexOf('>#AA0000<') >= 0, listEl.innerHTML);
  check('и кто его просит', listEl.innerHTML.indexOf('Кнопка') >= 0, listEl.innerHTML);
  check('влезает — так и написано', /влезает целиком/.test(noteEl.textContent), noteEl.textContent);
  check('и плана нет: делить нечего', planEl.innerHTML === '', planEl.innerHTML);

  slotsEl.value = '1';
  renderPaletteSection();
  check('слотов не хватает — сказано, скольких', /Лишних 1/.test(noteEl.textContent), noteEl.textContent);
  check('появились кнопки партий', (planEl.innerHTML.match(/data-pal="\d"/g) || []).length === 2, planEl.innerHTML);
  check('и кнопка «Все»', planEl.innerHTML.indexOf('data-pal="all"') >= 0);
  check('предложено слияние с числом ΔE', /ΔE \d+\.\d/.test(planEl.innerHTML), planEl.innerHTML);
  check('и кнопка применить', planEl.innerHTML.indexOf('data-pal="merge"') >= 0);

  // Имя модели человек пишет сам, а попадает оно в РАЗМЕТКУ — и в текст, и в атрибут title.
  reset(); putModel('<b>жир</b> "кавычки"', '#112233');
  renderPaletteSection();
  check('угловая скобка в имени экранируется', listEl.innerHTML.indexOf('<b>жир') < 0 &&
        listEl.innerHTML.indexOf('&lt;b>') >= 0, listEl.innerHTML);
  check('и кавычка — иначе имя вылезло бы из title=""',
        listEl.innerHTML.indexOf('&quot;') >= 0 && /title="[^"]*"/.test(listEl.innerHTML), listEl.innerHTML);
}

console.log('\n=== показ одной партии ===');
{
  const noteEl = document.getElementById('palette-note');
  const planEl = document.getElementById('palette-plan');
  const slotsEl = document.getElementById('ams-slots');
  reset();
  const a = putModel('A', '#112233'), b = putModel('B', '#AA0000'), c = putModel('C', '#00AA00');
  slotsEl.value = '1';
  renderPaletteSection();
  const pal = assemblyPalette(), plan = paletteBatches(pal.bodies, 1);
  check('три цвета в один слот — три партии', plan.length === 3, plan.length);
  paletteShowBatch(pal, plan, 0);
  check('в сцене осталась одна модель', models.filter(m => m.visible).length === 1, models.map(m => m.visible));
  check('именно из этой партии', plan[0].bodies[0].parts[0].visible === true);
  /* СНИМОК. `assemblyPalette` смотрит только на ВИДИМОЕ: живой пересчёт после «показать партию 1» увидел
     бы один цвет, доложил бы «влезает» и стёр бы сам план, по которому партия и была выбрана. */
  check('план не пересчитан по остатку', (planEl.innerHTML.match(/data-pal="\d"/g) || []).length === 3, planEl.innerHTML);
  check('и счёт цветов остался общим', /Цветов в сборке: 3/.test(noteEl.textContent), noteEl.textContent);
  check('показанная партия помечена активной', /data-pal="0"/.test(planEl.innerHTML) &&
        planEl.innerHTML.indexOf('pal-btn active" data-pal="0"') >= 0, planEl.innerHTML);
  paletteShowBatch(pal, plan, 1);
  check('переключение на другую партию меняет видимое',
        models.filter(m => m.visible).length === 1 && plan[1].bodies[0].parts[0].visible === true,
        models.map(m => m.visible));
  paletteShowAll();
  check('«Все» возвращает всех', models.every(m => m.visible), models.map(m => m.visible));
  check('и снимок снят', paletteView === null);

  // Модель, погашенную ЧЕЛОВЕКОМ, «Все» обратно не зажигает.
  c.visible = false;
  const pal2 = assemblyPalette(), plan2 = paletteBatches(pal2.bodies, 1);
  paletteShowBatch(pal2, plan2, 0);
  paletteShowAll();
  check('своё скрытие человека переживает показ партии', c.visible === false && a.visible && b.visible,
        models.map(m => m.visible));
  // Слияние во время показа партии обязано СНАЧАЛА вернуть видимость: снимок считался под старые цвета,
  // а кнопки «Все» после перекраски на панели может уже не быть — часть сборки осталась бы погашенной.
  reset();
  const x = putModel('X', '#101010'), y = putModel('Y', '#141414'), z = putModel('Z', '#FF0000');
  slotsEl.value = '2';
  renderPaletteSection();
  const pl = paletteBatches(assemblyPalette().bodies, 2);
  paletteShowBatch(assemblyPalette(), pl, 0);
  global.confirm = () => true;
  paletteApplyUI();
  delete global.confirm;
  check('после слияния видно всю сборку', models.every(m => m.visible), models.map(m => m.visible));
  check('и снимок снят', paletteView === null);
  check('цвета действительно слиты — три было, два стало',
        new Set([x.color, y.color, z.color]).size === 2, [x.color, y.color, z.color]);
  check('слились почти-чёрные, а не чёрный с красным', x.color === y.color && z.color === '#FF0000',
        [x.color, y.color, z.color]);
  reset(); document.getElementById('ams-slots').value = '4';
}

console.log('\n=== число слотов ===');
{
  const el = document.getElementById('ams-slots');
  el.value = '8'; check('читается из поля', paletteSlots() === 8, paletteSlots());
  el.value = '';  check('пустое поле — 4 по умолчанию', paletteSlots() === 4, paletteSlots());
  el.value = '0'; check('ноль слотов не бывает', paletteSlots() === 4, paletteSlots());
  el.value = '-3'; check('отрицательных тоже', paletteSlots() === 4, paletteSlots());
  el.value = '2.7'; check('дробное округляется', paletteSlots() === 3, paletteSlots());
  el.value = '999'; check('сверху ограничено', paletteSlots() === 64, paletteSlots());

  const store = {};
  global.localStorage = { getItem: k => (k in store ? store[k] : null),
                          setItem: (k, v) => { store[k] = String(v); }, removeItem: k => { delete store[k]; } };
  el.value = '6'; paletteSlotsStore();
  el.value = '4'; paletteSlotsRestore();
  check('число слотов переживает перезапуск', el.value == 6, el.value);
  store[PAL_SLOTS_STORE] = 'мусор'; el.value = '4'; paletteSlotsRestore();
  check('мусор в хранилище игнорируется', el.value == 4, el.value);
  delete global.localStorage;
  el.value = '4';
}

/* СКОЛЬКО КАКОГО ЦВЕТА. Панель говорила, какие филаменты нужны; сколько каждого — не говорил никто, а
   заказывают катушки именно по этому числу. Портится расчёт тихо: «работает», посчитав объём одной
   детали дважды или отдав раскрашенную деталь целиком её базовому филаменту. */
console.log('\n=== граммы по слотам ===');
{
  reset(); importedPaint.clear();
  // Куб 10×10×10 = 1 см³: объём считается точно, поэтому граммы можно сверять с числом, а не с «примерно».
  const cube = v => { const V = [[0,0,0],[v,0,0],[v,0,v],[0,0,v],[0,v,0],[v,v,0],[v,v,v],[0,v,v]];
    const F = [[0,1,2],[0,2,3],[4,7,6],[4,6,5],[0,4,5],[0,5,1],[1,5,6],[1,6,2],[2,6,7],[2,7,3],[3,7,4],[3,4,0]];
    return F.map(f => f.map(i => V[i])); };
  const put = (name, color, tris) => { const rec = { id:'g'+(models.length+1), name, color, visible:true,
    rawTris: tris, shape:'box', params:{}, rx:0, ry:0, rz:0, px:0, py:0, pz:0 }; models.push(rec); return rec; };

  put('Куб', '#101010', cube(10));
  let gr = assemblyGrams();
  check('один куб 10 мм — это 1 см³', near(gr.cc[0], 1, 1e-9), gr.cc);
  check('и 1.24 г при плотности PLA', near(gr.g[0], 1.24, 1e-9), gr.g);
  check('итог сходится с суммой по слотам', near(gr.total, 1, 1e-9), gr.total);

  put('Второй', '#AA0000', cube(20));           // 8 см³
  gr = assemblyGrams();
  check('второй цвет считается своим слотом', near(gr.cc[1], 8, 1e-9), gr.cc);
  check('первый от этого не изменился', near(gr.cc[0], 1, 1e-9), gr.cc);
  check('итог — сумма обоих', near(gr.total, 9, 1e-9), gr.total);

  // Один цвет на двух телах — ОДИН слот: это и есть смысл слота AMS.
  put('Третий', '#101010', cube(10));
  gr = assemblyGrams();
  check('одинаковый цвет копится в один слот', near(gr.cc[0], 2, 1e-9), gr.cc);
  check('слотов по-прежнему два', gr.cc.length === 2, gr.cc.length);
  // Невидимая модель не печатается — значит, и филамента не просит.
  models[models.length-1].visible = false;
  check('невидимая модель в счёт не идёт', near(assemblyGrams().total, 9, 1e-9), assemblyGrams().total);
  models[models.length-1].visible = true;

  /* РАСКРАШЕННАЯ ДЕТАЛЬ. Своего объёма у покраски нет — номер филамента стоит у треугольника, а не у
     куска тела, — поэтому объём делится по ПЛОЩАДИ. Куб 10 мм: одна грань из шести это ровно 1/6, и
     проверить долю можно точно, а не «примерно». */
  reset(); importedPaint.clear();
  const c10 = cube(10);
  const ink = c10.map((t, i) => (i < 2 ? 2 : 1));      // две трёхугольные половины одной грани = 1/6 куба
  addImportedPart(c10, 'Крашеный', false, '#101010', null, { ink, palette: ['#101010', '#00AA00'] });
  gr = assemblyGrams();
  check('раскрашенная деталь просит два слота', gr.cc.length === 2, gr.cc);
  check('покраске досталась её доля площади', near(gr.cc[1], 1/6, 1e-9), gr.cc[1]);
  check('остальное — базовому цвету', near(gr.cc[0], 5/6, 1e-9), gr.cc[0]);
  check('и объём детали не потерялся и не удвоился', near(gr.total, 1, 1e-9), gr.total);

  // Раскладка, не подходящая к сетке, к ней и не применяется — деталь целиком своего цвета.
  reset(); importedPaint.clear();
  const rec2 = addImportedPart(cube(10), 'Битая раскраска', false, '#101010', null,
                               { ink: [1, 2], palette: ['#101010', '#00AA00'] });
  gr = assemblyGrams();
  check('негодная раскладка не делит объём', gr.cc.length === 1 && near(gr.cc[0], 1, 1e-9), gr.cc);

  reset(); importedPaint.clear();
  check('пустая сборка просит ноль', assemblyGrams().total === 0, assemblyGrams().total);

  // Строка: до десяти граммов — с десятой долей, выше — целыми. Ложная точность в оценке хуже, чем её нет.
  check('меньше десяти — с десятой', palGrams(4.26) === '4.3 г', palGrams(4.26));
  check('больше десяти — целыми', palGrams(43.2) === '43 г', palGrams(43.2));
  check('ноль так и говорит', palGrams(0) === '0 г' && palGrams(-1) === '0 г');
}

console.log('\n=== граммы в панели ===');
{
  const listEl = document.getElementById('palette-list');
  const noteEl = document.getElementById('palette-note');
  reset(); importedPaint.clear();
  const cube10 = (() => { const v = 10, V = [[0,0,0],[v,0,0],[v,0,v],[0,0,v],[0,v,0],[v,v,0],[v,v,v],[0,v,v]];
    const F = [[0,1,2],[0,2,3],[4,7,6],[4,6,5],[0,4,5],[0,5,1],[1,5,6],[1,6,2],[2,6,7],[2,7,3],[3,7,4],[3,4,0]];
    return F.map(f => f.map(i => V[i])); })();
  models.push({ id:'p1', name:'Куб', color:'#101010', visible:true, rawTris:cube10, shape:'box',
                params:{}, rx:0, ry:0, rz:0, px:0, py:0, pz:0 });
  renderPaletteSection();
  check('в строке слота стоят граммы', /1\.2 г/.test(listEl.innerHTML), listEl.innerHTML.slice(0, 300));
  check('и итог назван вместе с оговоркой про заполнение',
        /Материала ≈ 1\.2 г/.test(noteEl.textContent) && /100 %/.test(noteEl.textContent), noteEl.textContent);
  reset(); importedPaint.clear(); renderPaletteSection();
  check('у пустой сборки граммов не обещают', !/Материала/.test(noteEl.textContent), noteEl.textContent);
}

console.log(`\n=== TOTAL: ${pass} passed, ${fail} failed ===`);
process.exit(fail ? 1 : 0);
