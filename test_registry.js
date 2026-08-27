// РЕЕСТР СЕМЕЙСТВ — опись набора и проверки ПО ВСЕМУ НАБОРУ сразу.
//
// ЗАЧЕМ ЭТОТ ФАЙЛ СУЩЕСТВУЕТ. Я взялся мерить набор — сколько разновидностей ничего не говорят
// человеку — и три замера подряд вышли неверными. Ошибался не расчёт: набор нельзя было ПЕРЕЧИСЛИТЬ.
// Диспетчер ветвится по двум десяткам семейств, у каждого свой контракт включения, и снаружи этого не
// видно нигде. Теперь список есть (`FAMILIES` в приложении), и на нём держатся утверждения, которых до
// сих пор не проверял никто:
//
//   1. КАЖДОЕ СЕМЕЙСТВО ВКЛЮЧАЕТСЯ ТЕМ, ЧЕМ ОБЪЯВЛЕНО. И «чем» — это не любая непустая строка, а
//      ЗАКОННОЕ значение своей же строки параметров. Ровно этого не хватало: в двух тестах жило
//      `tstMode:'temptower'`, значения с таким именем у переключателя тестов нет вовсе, и обе проверки
//      его пропускали — они спрашивали лишь «тот ли это режим». Форма при этом строилась в НОЛЬ
//      треугольников, а строка формы читалась «тест печати: undefined».
//
//   2. КАЖДОЕ СТРОИТСЯ. Из своей же минимальной настройки: непустая сетка, герметичная, не вывернутая.
//      Пустая модель — это молчаливый отказ, самый неприятный из отказов.
//
//   3. КАЖДОЕ ЗОВЁТСЯ ПО ИМЕНИ. Строка формы в шапке — то единственное, что человек видит всегда, и
//      безымянных в наборе быть не должно: базплейт Gridfinity и объёмный логотип назывались «кубом».
//
//   4. КАЖДОЕ КЕМ-ТО ПРОВЕРЯЕТСЯ. Файлы проверок названы в самой строке реестра, они существуют и стоят
//      в батарее. Утверждение «у каждой разновидности есть тест» до сих пор никем не проверялось.
//
//   5. ПЕРЕПИСЬ МОЛЧУНОВ (пункт 10.4 дорожной карты). Сколько семейств не говорят человеку НИ ОДНОГО
//      числа сверх имени — записано поимённо и может только СОКРАЩАТЬСЯ: новый молчун роняет батарею.
//
// Run: ./run-all.sh

let pass = 0, fail = 0;
function chk(n, c, e){ if (c){ pass++; console.log('  OK  ', n); }
  else { fail++; console.log('  FAIL', n, e !== undefined ? JSON.stringify(e) : ''); } }
function vol(t){ let v=0; for(const T of t){ const a=T[0],b=T[1],c=T[2];
  v += (a[0]*(b[1]*c[2]-b[2]*c[1]) - a[1]*(b[0]*c[2]-b[2]*c[0]) + a[2]*(b[0]*c[1]-b[1]*c[0]))/6; } return v; }
/* Каждое семейство строится в СВОИХ параметрах, а не в подправленных чужих: два ключа включения
   (`gfBaseplate`, `logo3d`) в умолчаниях не значатся вовсе — их ставит кнопка на свежей модели, — и
   присвоение поверх прежнего объекта их бы не сбросило. Первый мой замер на этом и сорвался: все
   двадцать пять форм отдали по 384 треугольника, потому что базплейт, включённый первой строкой,
   так и остался включённым до конца обхода. */
const build = (f) => { logos.length = 0; boxHoles.length = 0;
  const p = Object.assign(defaultBoxParams(), f.act);
  paramState.box = p;
  return {p, tris: buildTrisForShape('box', p)}; };

console.log('=== реестр описывает набор целиком ===');
{
  chk('в реестре есть строки', Array.isArray(FAMILIES) && FAMILIES.length >= 25, FAMILIES.length);
  const keys = FAMILIES.map(f => f.key);
  chk('ключи не повторяются', new Set(keys).size === keys.length, keys.length - new Set(keys).size);
  chk('у каждого есть имя', FAMILIES.every(f => typeof f.label === 'string' && f.label.length > 1),
      FAMILIES.filter(f => !(typeof f.label === 'string' && f.label.length > 1)).map(f => f.key));
  chk('имена не повторяются', new Set(FAMILIES.map(f => f.label)).size === FAMILIES.length,
      FAMILIES.length - new Set(FAMILIES.map(f => f.label)).size);
  /* Имена семейств ВЫВЕДЕНЫ из реестра. Отдельной таблицей это было местом, где новая форма забывается
     молча: ключ есть, имени нет. Мажорный разряд версии считает строки KIND_LABEL — значит, считает
     реестр. */
  chk('KIND_LABEL — это и есть реестр, а не список рядом с ним',
      Object.keys(KIND_LABEL).length === FAMILIES.length &&
      FAMILIES.every(f => KIND_LABEL[f.key] === f.label), Object.keys(KIND_LABEL).length);
  const last = FAMILIES[FAMILIES.length - 1];
  chk('куб стоит последним и берёт всё, что не взяли до него',
      last.key === 'box' && last.on({}) === true, last.key);
  const D = defaultBoxParams();
  chk('на умолчаниях не срабатывает никто, кроме куба',
      FAMILIES.filter(f => f.on(D)).map(f => f.key).join(',') === 'box',
      FAMILIES.filter(f => f.on(D)).map(f => f.key));
}

console.log('=== каждое семейство включается тем, чем объявлено ===');
{
  const rows = {}; for (const r of SHAPE_PARAMS.box) rows[r.key] = r;
  const D = defaultBoxParams();
  for (const f of FAMILIES){
    if (f.key === 'box') continue;
    const p = Object.assign(defaultBoxParams(), f.act);
    chk('«'+f.label+'» включается своей настройкой', dominantMode(p) === f.key, dominantMode(p));
    chk('  и её условие на ней срабатывает', f.on(p) === true, f.key);
    /* ЗНАЧЕНИЕ ЗАКОННОЕ, а не просто непустое. Это и есть та проверка, которой не было: и `on`, и
       `dominantMode` довольны любой строкой, кроме 'none', — а построитель знает поимённо. */
    for (const k of Object.keys(f.act)){
      const r = rows[k], v = f.act[k];
      if (!r){
        chk('  ключ «'+k+'» без строки панели объявлен как кнопочный', typeof f.via === 'string' && f.via.length > 3,
            {ключ:k, via:f.via});
        chk('  и такого ключа в умолчаниях действительно нет', !(k in D), k);
        continue;
      }
      if (r.type === 'select')
        chk('  «'+k+'» = «'+v+'» есть среди значений переключателя',
            (r.options||[]).some(o => o.v === v), (r.options||[]).map(o => o.v));
      else if (r.type === 'bool')
        chk('  «'+k+'» — логический, и значение логическое', typeof v === 'boolean', typeof v);
      else
        chk('  «'+k+'» — число в своих пределах',
            typeof v === 'number' && (r.min == null || v >= r.min) && (r.max == null || v <= r.max),
            {v, min:r.min, max:r.max});
    }
  }
}

console.log('=== порядок реестра — это старшинство, и он закреплён ===');
{
  /* Семейства НЕ исключают друг друга: включить можно и лист, и резьбу разом, и тогда решает первое
     сверху. Порядок перенесён из прежнего `dominantMode` строка в строку, и здесь он закреплён СПИСКОМ:
     это не копия механизма, а заявление о старшинстве — переставивший строки обязан переставить и
     здесь, осознанно, а не узнать об этом от человека, у которого лист вдруг стал резьбой. */
  const ORDER = ['baseplate','logo3d','wallorg','pbox','litho','cardholder','coaster','frame','tile',
                 'ball','seal','spool','clock','stand','funnel','hook','test','mount','gear','hinge',
                 'thread','sheet','keycap','die','box'];
  chk('старшинство то же, что было до реестра', FAMILIES.map(f => f.key).join(',') === ORDER.join(','),
      FAMILIES.map(f => f.key));
  /* И сам обход: при двух включённых семействах побеждает то, что выше. Проверяется на ВСЕХ парах —
     их три сотни, и каждая пара это настоящий выбор, который приложение делает молча. */
  let bad = null, pairs = 0;
  for (let i = 0; i < FAMILIES.length && !bad; i++) for (let j = i+1; j < FAMILIES.length; j++){
    const p = Object.assign(defaultBoxParams(), FAMILIES[i].act, FAMILIES[j].act);
    pairs++;
    if (dominantMode(p) !== FAMILIES[i].key){ bad = [FAMILIES[i].key, FAMILIES[j].key, dominantMode(p)]; break; }
  }
  chk('на любой паре побеждает старший (' + pairs + ' пар)', !bad, bad);
}

console.log('=== каждое семейство СТРОИТСЯ, и не в пустоту ===');
{
  for (const f of FAMILIES){
    const {tris} = build(f);
    chk('«'+f.label+'» строится непустой сеткой', tris.length > 0, tris.length);
    if (!tris.length) continue;
    const mc = manifoldCheck(tris, 4);
    chk('  герметична', mc.watertight, {open:mc.openEdges, bad:mc.badEdges});
    chk('  и не вывернута', vol(tris) > 0, +vol(tris).toFixed(2));
  }
}

console.log('=== каждое семейство зовётся по имени ===');
{
  /* Строка формы в шапке — единственное, что человек видит всегда. «Куб» на месте базплейта означал,
     что форма есть, а сказать о ней нечего; таких было две. */
  for (const f of FAMILIES){
    build(f);
    const lab = activeShapeLabel();
    chk('«'+f.label+'» названа в шапке', typeof lab === 'string' && lab.length > 1, lab);
    chk('  и не «кубом», если она не куб', f.key === 'box' || lab !== 'куб', lab);
    chk('  и без undefined в строке', !/undefined|NaN/.test(lab), lab);
  }
}

console.log('=== у каждого семейства есть свои проверки, и они в батарее ===');
{
  const fs = require('fs');
  const runAll = fs.readFileSync('run-all.sh', 'utf8');
  for (const f of FAMILIES){
    chk('«'+f.label+'»: файлы проверок названы', Array.isArray(f.tests) && f.tests.length > 0, f.tests);
    for (const t of (f.tests || [])){
      chk('  ' + t + ' существует', fs.existsSync(t), t);
      chk('  ' + t + ' стоит в батарее', runAll.includes(t), t);
    }
  }
}

console.log('=== ПЕРЕПИСЬ МОЛЧУНОВ (10.4): список может только сокращаться ===');
{
  /* Молчун — семейство, которое строится и не говорит человеку НИ ОДНОГО числа сверх собственного
     имени: `collectPrintWarnings` на его умолчаниях пуст. Это не всегда дефект — у куба и правда нет
     числа, которого не видно на экране, — но это всегда ВОПРОС, и раньше его нельзя было даже задать.
     Список записан поимённо. Новый молчун роняет батарею; разобранный — вычёркивается отсюда. */
  /* «Крючок» вычеркнут в v25.4.0 — первый разобранный: он теперь говорит, сколько держит. Строка
     остаётся памятью о том, что список сокращается разбором, а не правкой списка: вычеркнуть можно
     только то, что и правда заговорило, — проверка ниже это и требует. */
  const SILENT = ['baseplate', 'pbox', 'coaster', 'frame', 'tile', 'clock',
                  'test', 'sheet',
                  'die', 'box'];
  /* «Кость» осталась в списке НАРОЧНО, и это надо объяснить: она молчит, пока на гранях нет цифр, —
     а на умолчаниях их нет. Говорить голому многограннику нечего, и придумывать ему число значило бы
     шуметь. Разобрана она в v25.9.0: как только цифры появляются, кость называет своё смещение центра
     тяжести. Проверка этого живёт в `test_dice.js`, где цифры и заводятся. */
  const now = [];
  for (const f of FAMILIES){
    const {p} = build(f);
    const w = collectPrintWarnings(p) || [];
    if (!w.length) now.push(f.key);
  }
  chk('новых молчунов не появилось', now.every(k => SILENT.includes(k)),
      now.filter(k => !SILENT.includes(k)));
  chk('  а вычеркнутые из списка и правда заговорили', SILENT.every(k => now.includes(k)),
      SILENT.filter(k => !now.includes(k)));
  console.log('       молчат сейчас: ' + now.length + ' из ' + FAMILIES.length);
}

console.log('\n=== TOTAL:', pass, 'passed,', fail, 'failed ===');
if (fail) process.exitCode = 1;
