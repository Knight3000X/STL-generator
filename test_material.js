// Материал печати как ЧИСЛО, а не как совет.
//
// До этого набора материал жил в приложении в двух местах и ни на что не влиял: `PRINT_MATERIALS`
// рассказывал человеку, что нейлон вязкий, а ASA не боится солнца, а `SNAP_MATERIALS` считал прогиб
// защёлки по своему отдельному выбору. Геометрия не менялась ни от того, ни от другого.
//
// Проверяется здесь ровно то, что ломается тихо:
//
//   1. ПЛОТНОСТЕЙ БЫЛО ДВЕ ИЗ ДЕСЯТИ. Вес сборки и вес каждого слота палитры считались всегда по PLA,
//      так что человек, выбравший ABS, читал цифру, завышенную на пятую часть. Ошибка правдоподобна и
//      потому незаметна: граммы выглядят как граммы.
//
//   2. КОМПЕНСАЦИЯ УСАДКИ — РАЗНИЦА, А НЕ САМА УСАДКА. Все допуски приложения выверены на PLA, и «как
//      нарисовано» здесь всегда означало «как выйдет в PLA». Если применить усадку абсолютной, на PLA
//      множитель станет 1.002 и КАЖДЫЙ существующий размер съедет — молча, на две сотых процента.
//      Поэтому отсчёт от PLA, и поэтому первая же проверка ниже требует на PLA ровно единицу.
//
//   3. УСАДКА И ПОСАДКА — РАЗНЫЕ ВЕЩИ, и путать их нельзя. Усадка тянет ВСЮ деталь, поэтому две
//      детали из одного материала после неё всё так же подходят друг к другу. Посадка правит зазор
//      там, где ответная часть не печатается (болт, подшипник, труба) или где материал ведёт себя не
//      как пластик. Если свести их в одно число, пара «болт + гайка» разъедется.
//
//   4. ВЫБОР МАТЕРИАЛА ОДИН, А ТАБЛИЦ ДВЕ. Человек, поставивший нейлон в допусках и забывший
//      переставить его в защёлке, получил бы деталь, посчитанную наполовину в одном материале,
//      наполовину в другом. Своё имя сильнее общего, «как у печати» — умолчание.
//
// Запуск: ./run-all.sh
let pass=0,fail=0; function chk(n,c,e){if(c){pass++;console.log('  OK  ',n);}else{fail++;console.log('  FAIL',n,e!==undefined?JSON.stringify(e):'');}}
const P = ov => Object.assign(defaultBoxParams(), ov);
function build(ov){ logos.length=0; boxHoles.length=0; dieFaces.length=0;
  Object.assign(paramState.box, defaultBoxParams(), ov);
  return buildTrisForShape('box', paramState.box); }
function bb(t){ const b=computeBBox(t); return {x:b.maxX-b.minX, y:b.maxY-b.minY, z:b.maxZ-b.minZ}; }
const MATS = Object.keys(FIL_MAT);

console.log('=== таблица материалов: полна и в разумных пределах ===');
chk('семейств в таблице десять', MATS.length === 10, MATS);
{
  let bad=[];
  for (const k of MATS){ const m=FIL_MAT[k];
    if (!(m.g > 0.8 && m.g < 1.6)) bad.push(k+' плотность '+m.g);
    if (!(m.shrink >= 0 && m.shrink <= 3)) bad.push(k+' усадка '+m.shrink);
    if (!(m.fit > -0.5 && m.fit < 0.5)) bad.push(k+' посадка '+m.fit);
    if (!m.t) bad.push(k+' без имени'); }
  chk('у каждого есть плотность, усадка, поправка и имя', bad.length===0, bad);
}
/* Плотность названа ОДИН раз. Две таблицы с одними и теми же числами расходятся так же неминуемо,
   как два места с одной константой, — только тише: никто не сверяет их глазами. */
chk('FIL_G_CM3 считается из FIL_MAT, а не пишется рядом',
    Object.keys(FIL_G_CM3).length === MATS.length && MATS.every(k => FIL_G_CM3[k] === FIL_MAT[k].g),
    MATS.filter(k => FIL_G_CM3[k] !== FIL_MAT[k].g));
chk('и все десять в нём есть, а не две', Object.keys(FIL_G_CM3).length === 10, Object.keys(FIL_G_CM3).length);
{
  chk('каждое семейство из PRINT_MATERIALS имеет числа',
      Object.keys(PRINT_MATERIALS).every(k => FIL_MAT[k] !== undefined),
      Object.keys(PRINT_MATERIALS).filter(k => !FIL_MAT[k]));
  chk('и наоборот — лишних строк в числах нет',
      MATS.every(k => PRINT_MATERIALS[k] !== undefined), MATS.filter(k => !PRINT_MATERIALS[k]));
}

console.log('=== плотность: вес считается по выбранному материалу ===');
chk('плотность неизвестного материала — PLA, а не пусто', matDensity(P({printMat:'нетакого'})) === FIL_MAT.pla.g);
chk('плотность без параметра — PLA', matDensity(P({})) === FIL_MAT.pla.g);
{
  // отношение весов обязано быть отношением плотностей — при одинаковом объёме
  let bad=[];
  for (const k of MATS){
    const r = matDensity(P({printMat:k})) / matDensity(P({printMat:'pla'}));
    const want = FIL_MAT[k].g / FIL_MAT.pla.g;
    if (Math.abs(r-want) > 1e-9) bad.push(k+': '+r.toFixed(4)+' вместо '+want.toFixed(4));
  }
  chk('вес в каждом материале относится к весу в PLA как плотности', bad.length===0, bad);
}
chk('ABS легче PLA примерно на пятую часть (а раньше считался как PLA)',
    matDensity(P({printMat:'abs'})) < matDensity(P({printMat:'pla'}))*0.9,
    {abs:matDensity(P({printMat:'abs'})), pla:matDensity(P({printMat:'pla'}))});

console.log('=== усадка: на PLA ровно единица, на остальных — разница ===');
chk('на PLA множитель ровно 1 — ни один существующий размер не съезжает',
    matShrinkScale(P({printMat:'pla'})) === 1, matShrinkScale(P({printMat:'pla'})));
chk('и без параметра тоже ровно 1', matShrinkScale(P({})) === 1);
{
  let bad=[];
  for (const k of MATS){
    const want = 1 + (FIL_MAT[k].shrink - FIL_MAT.pla.shrink)/100;
    const got = matShrinkScale(P({printMat:k}));
    if (Math.abs(got-want) > 1e-12) bad.push(k+': '+got+' вместо '+want);
  }
  chk('у каждого материала множитель — разница усадок с PLA', bad.length===0, bad);
}
chk('выключатель работает: с ним нейлон не масштабируется',
    matShrinkScale(P({printMat:'nylon', matShrink:false})) === 1);
chk('а без выключателя — масштабируется',
    matShrinkScale(P({printMat:'nylon'})) > 1.009, matShrinkScale(P({printMat:'nylon'})));

console.log('=== усадка тянет ВСЮ деталь, а не одну ось ===');
{
  const a = bb(build({})), b = bb(build({printMat:'nylon'}));
  const rx=b.x/a.x, ry=b.y/a.y, rz=b.z/a.z;
  chk('габарит в нейлоне больше габарита в PLA на 1 %',
      Math.abs(rx - 1.01) < 1e-6, {rx:+rx.toFixed(6)});
  chk('и по всем трём осям одинаково', Math.abs(rx-ry)<1e-9 && Math.abs(rx-rz)<1e-9,
      {rx:+rx.toFixed(8), ry:+ry.toFixed(8), rz:+rz.toFixed(8)});
  const c = bb(build({printMat:'pla'}));
  chk('а в PLA габарит не изменился ни на что', Math.abs(c.x-a.x)<1e-12 && Math.abs(c.y-a.y)<1e-12, {c,a});
}
{
  /* ПАРА ИЗ ОДНОГО МАТЕРИАЛА ОБЯЗАНА ОСТАТЬСЯ ПАРОЙ. Усадка тянет обе детали одинаково, значит и
     зазор между ними тянется — резьба свинчивается в любом материале. Если бы усадку применили
     только к габариту, а зазор оставили как есть, болт в гайку перестал бы лезть ровно на этот
     процент, и разошлось бы это тем сильнее, чем крупнее деталь. */
  const bolt = bb(build({threadMode:'bolt'})), boltN = bb(build({threadMode:'bolt', printMat:'nylon'}));
  const nut  = bb(build({threadMode:'nut'})),  nutN  = bb(build({threadMode:'nut',  printMat:'nylon'}));
  const rb = boltN.x/bolt.x, rn = nutN.x/nut.x;
  chk('болт и гайка тянутся ОДИНАКОВО (пара не расходится)', Math.abs(rb-rn) < 1e-9,
      {болт:+rb.toFixed(8), гайка:+rn.toFixed(8)});
}

console.log('=== посадка: отдельная поправка, не усадка ===');
chk('на PLA поправка ровно ноль', matFitBias(P({printMat:'pla'})) === 0);
chk('TPU уходит в МИНУС — он сминается при затяжке', matFitBias(P({printMat:'tpu'})) < 0, matFitBias(P({printMat:'tpu'})));
chk('нейлон в ПЛЮС — он разбухает от влаги', matFitBias(P({printMat:'nylon'})) > 0, matFitBias(P({printMat:'nylon'})));
chk('наполненный углем в плюс — волокно не даёт струе сойтись', matFitBias(P({printMat:'cf'})) > 0);
{
  const base = 0.35;
  const pla = fitTuned(P({printMat:'pla'}), base);
  const ny  = fitTuned(P({printMat:'nylon'}), base);
  const tpu = fitTuned(P({printMat:'tpu'}), base);
  chk('зазор в PLA — это сам зазор', Math.abs(pla-base)<1e-12, pla);
  chk('в нейлоне шире, в TPU уже', ny > pla && tpu < pla, {pla, ny, tpu});
  chk('ручная поправка и поправка материала СКЛАДЫВАЮТСЯ',
      Math.abs(fitTuned(P({printMat:'nylon', fitTune:0.1}), base) - (base + 0.1 + matFitBias(P({printMat:'nylon'})))) < 1e-12);
  chk('и зазор не уходит в минус даже там, где поправка больше него',
      fitTuned(P({printMat:'tpe'}), 0.05) >= 0, fitTuned(P({printMat:'tpe'}), 0.05));
}

console.log('=== защёлка: выбор один, таблицы две ===');
{
  chk('«как у печати» — умолчание у обеих защёлок',
      defaultBoxParams().snapMat === 'auto' && defaultBoxParams().pipLatchMat === 'auto',
      {snapMat:defaultBoxParams().snapMat, pipLatchMat:defaultBoxParams().pipLatchMat});
  chk('на умолчаниях защёлка считается в PLA — как и всё остальное',
      snapMatOf(P({}), 'snapMat', 'pla').t === 'PLA');
  chk('материал печати доходит до расчёта защёлки',
      snapMatOf(P({printMat:'abs'}), 'snapMat', 'pla').t === 'ABS',
      snapMatOf(P({printMat:'abs'}), 'snapMat', 'pla').t);
  chk('и до расчёта футляра тоже',
      snapMatOf(P({printMat:'nylon'}), 'pipLatchMat', 'petg').t === 'нейлон');
  chk('СВОЁ имя сильнее общего',
      snapMatOf(P({printMat:'abs', snapMat:'nylon'}), 'snapMat', 'pla').t === 'нейлон');
  /* Материал, которого таблица прогиба не знает, обязан упасть на НАЗВАННОЕ умолчание, а не на
     что попало: `SNAP_MATERIALS[undefined]` — это undefined, и расчёт свалился бы на чтении .E. */
  chk('материал вне таблицы прогиба даёт названное умолчание, а не поломку',
      snapMatOf(P({printMat:'tpu'}), 'snapMat', 'pla').t === 'PLA' &&
      snapMatOf(P({printMat:'pc'}), 'pipLatchMat', 'petg').t === 'PETG');
  chk('и у каждого материала прогиба есть E и допустимая деформация',
      Object.values(SNAP_MATERIALS).every(m => m.E > 0 && m.eps > 0));
}
{
  chk('расчёт защёлки вообще отзывается на материал',
      snapMatOf(P({printMat:'nylon'}),'snapMat','pla').eps > snapMatOf(P({printMat:'pla'}),'snapMat','pla').eps);
}

console.log('=== ни один материал не ломает построение ===');
{
  let bad=[];
  for (const k of MATS)
    for (const mode of [{}, {threadMode:'jar'}, {pipMode:'box'}, {pipMode:'snap'}, {gearMode:'spur'}]){
      const t = build(Object.assign({printMat:k}, mode));
      const mc = manifoldCheck(t, 4);
      if (!mc.watertight || meshVolume(t) <= 0)
        bad.push(k+' '+JSON.stringify(mode)+' open '+mc.openEdges+' vol '+meshVolume(t).toFixed(0));
    }
  chk('все десять материалов × пять моделей строятся герметично', bad.length===0, bad.slice(0,3));
}

console.log('\n=== выбор пластика стоит в сводке, и список у него один ===');
{
  const HTML = require('fs').readFileSync('parametric-stl-generator.html', 'utf8');
  /* СПИСОК МАТЕРИАЛОВ ОДИН НА ВЕСЬ ФАЙЛ. Он стоял двумя копиями — строка «Материал печати» и строка
     «ответная деталь», — и выпадайка сводки стала бы третьей. Копии сходились СЛУЧАЙНО, а разошлись
     бы тихо: новый пластик в `FIL_MAT` попал бы в расчёт и не попал бы в выбор — приложение умеет его
     считать, а выбрать его нельзя. */
  chk('MAT_OPTS перечисляет ровно материалы FIL_MAT, в том же порядке',
      MAT_OPTS.map(o => o.v).join() === Object.keys(FIL_MAT).join(), MAT_OPTS.map(o => o.v));
  chk('  и подписи взяты из той же таблицы', MAT_OPTS.every(o => o.t === FIL_MAT[o.v].t));
  const rowOf = k => SHAPE_PARAMS.box.find(r => r.key === k);
  chk('строка «Материал печати» берёт список оттуда же', rowOf('printMat').options === MAT_OPTS);
  chk('строка ответной детали — оттуда же плюс «из того же»',
      rowOf('matMate').options.length === MAT_OPTS.length + 1 &&
      rowOf('matMate').options[0].v === 'same' &&
      rowOf('matMate').options.slice(1).every((o, i) => o.v === MAT_OPTS[i].v),
      rowOf('matMate').options.map(o => o.v));
  /* И НИ ОДНОЙ КОПИИ СПИСКА В ИСХОДНИКЕ: имя последнего пластика встречается ровно один раз — в самой
     таблице чисел. Выписанный руками список проявился бы здесь вторым вхождением; так и было до
     этой правки — второе жило в таблице справки. */
  chk('в исходнике нет второго списка материалов',
      (HTML.match(/PLA-CF \/ PETG-CF/g) || []).length === 1,
      (HTML.match(/PLA-CF \/ PETG-CF/g) || []).length);
  /* ВЫПАДАЙКА В СВОДКЕ — ТОТ ЖЕ ЭЛЕМЕНТ УПРАВЛЕНИЯ, ЧТО В ПАНЕЛИ. Класс и ключ — то, чем её
     подхватывает единственный обработчик панели; свой обработчик означал бы второй способ менять один
     ключ. И список в разметке не выписан: `<select>` пуст, его наполняет `MAT_OPTS`. */
  const tag = (HTML.match(/<select id="stat-mat"[^>]*>/) || [''])[0];
  chk('в сводке есть выпадайка пластика', tag.length > 0);
  chk('  она помечена как ручка панели',
      tag.indexOf('class="param-select"') > 0 && tag.indexOf('data-shape="box"') > 0 &&
      tag.indexOf('data-key="printMat"') > 0, tag);
  chk('  и список в ней не выписан руками', HTML.indexOf(tag + '</select>') > 0);
  /* И ЧТО СПИСОК ПРАВДА ДОХОДИТ ДО ЭЛЕМЕНТА. Разметка пуста намеренно, наполняет её `MAT_OPTS`, —
     значит между таблицей и экраном есть шаг, и он тоже обязан проверяться: посчитать в коде и не
     показать посчитанное — то же самое, что не посчитать. */
  {
    const sel = document.getElementById('stat-mat');
    sel.children.length = 0;
    buildStatMatSelect();
    chk('выпадайка наполняется из MAT_OPTS',
        sel.children.length === MAT_OPTS.length &&
        sel.children.every((o, i) => o.value === MAT_OPTS[i].v && o.textContent === MAT_OPTS[i].t),
        sel.children.map(o => o.value));
    const n = sel.children.length;
    buildStatMatSelect();
    chk('  и повторный вызов её не удваивает', sel.children.length === n, sel.children.length);
  }
  chk('  а сама она стоит в сводке, рядом с весом',
      HTML.indexOf('id="stat-mat"') > HTML.indexOf('<div class="stats-box">') &&
      HTML.indexOf('id="stat-mat"') < HTML.indexOf('id="stat-weight-k"'));
  /* И ЧТО ОБРАБОТЧИК ПРАВДА ЗОВЁТ СИНХРОНИЗАЦИЮ. Саму функцию батарея проверяет прямо (ниже), а вот
     вызов из обработчика панели увидеть не может: тот живёт на событии DOM, которого в заглушке нет.
     Мутация «вызов убран» на этом и ВЫЖИЛА — замерено, а не предположено. Поэтому проверяется
     исходник: ветка `select.param-select` обязана звать `syncParamTwins`. Проверка слабее
     поведенческой, и слабость названа: она поймает удаление вызова и не поймает подмену его смысла. */
  const branch = HTML.slice(HTML.indexOf("t.matches('select.param-select')"),
                            HTML.indexOf("t.matches('[type=checkbox]')"));
  chk('обработчик панели зовёт синхронизацию близнецов',
      branch.length > 0 && branch.indexOf('syncParamTwins(t)') > 0, branch.length);
}

console.log('\n=== одна ручка — два элемента, и они не расходятся ===');
{
  /* ЗАМЕРЕНО В HEADLESS, А НЕ ПРИДУМАНО: без синхронизации выбор PETG в сводке пересчитывал вес и
     подпись, а панель продолжала показывать PLA — два разных ответа на один вопрос на одном экране.
     Обработчик правит только тот элемент, по которому кликнули, поэтому близнецов сводит он же.
     Заглушка DOM в батарее не умеет querySelectorAll, поэтому здесь она подменяется на время
     проверки: проверяется САМА функция, а не браузер. */
  const mk = v => ({dataset:{shape:'box', key:'printMat'}, value:v});
  const a = mk('pla'), b = mk('pla'), other = {dataset:{shape:'lid', key:'printMat'}, value:'pla'};
  const was = document.querySelectorAll;
  document.querySelectorAll = sel => (String(sel).indexOf('printMat') >= 0 ? [a, b, other] : []);
  a.value = 'petg'; syncParamTwins(a);
  chk('близнец получил то же значение', b.value === 'petg', b.value);
  chk('  и сам элемент не тронут', a.value === 'petg');
  chk('  а ручка ДРУГОЙ формы — нет', other.value === 'pla', other.value);
  let fell = false;
  try { syncParamTwins({dataset:{shape:'box'}, value:'x'}); } catch(e){ fell = true; }
  chk('элемент без ключа синхронизацию не роняет', !fell);
  document.querySelectorAll = was;
}

console.log('\n=== TOTAL:',pass,'passed,',fail,'failed ===');
process.exit(fail?1:0);
