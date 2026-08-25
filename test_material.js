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

console.log('\n=== TOTAL:',pass,'passed,',fail,'failed ===');
process.exit(fail?1:0);
