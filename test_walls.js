// СТЕНКИ И СОПЛО — общее правило, а не пять похожих.
//
// ЗАЧЕМ. Пять построителей — ваза, воронка, переходник, чашка и чехол ключа — зажимали толщину стенки
// числом 0.8 и делали это МОЛЧА: человек заказывал 0.5, получал 0.8 и не узнавал об этом ниоткуда.
// У троих при этом стояла жалоба «стенка 0.8 мм — тоньше ОДНОГО прохода сопла», а 0.8 — это ровно ДВА
// прохода сопла 0.4. Утверждение было неверным, и порог у него был свой (`< 1.0`), к соплу не
// привязанный вовсе: на сопле 0.6 стенка 1.0 мм это меньше двух проходов, и жалобы не было.
//
// ПРАВИЛО ОДНО: тоньше двух проходов стенка не печатается. Значит ниже этого её поднимает СОПЛО — и
// об этом надо сказать, назвав оба числа. Проверяется здесь именно ОБЩНОСТЬ: все пять живут одним
// выражением `wallFloored`, ведут себя одинаково на всех соплах и одинаково об этом говорят.
//
// Run: ./run-all.sh

let pass = 0, fail = 0;
function chk(n, c, e){ if (c){ pass++; console.log('  OK  ', n); }
  else { fail++; console.log('  FAIL', n, e !== undefined ? JSON.stringify(e) : ''); } }

/* Пятеро: имя, набор параметров семьи, ручка стенки, как достать построенную стенку и как — заказанную. */
const WALLS = [
  ['переходник', {mntMode:'transition'}, 'mntTrWall',  p => transitionSpec(p).w,   p => transitionSpec(p).wAsk],
  ['чашка',      {mntMode:'cupholder'},  'mntCupWall', p => cupHolderSpec(p).w,    p => cupHolderSpec(p).wAsk],
  ['чехол',      {mntMode:'keycover'},   'mntKcWall',  p => keyCoverSpec(p).wall,  p => keyCoverSpec(p).wAsk],
  ['ваза',       {fnOn:true, fnMode:'vase', vaseH:120, vaseBaseD:60, vaseBellyD:95}, 'fnWall',
                 p => vaseSpec(p).wall,  p => vaseSpec(p).wAsk],
  ['воронка',    {fnOn:true, fnMode:'funnel'}, 'fnWall', p => funnelSpec(p).wWant, p => funnelSpec(p).wAsk],
  /* ШЕСТАЯ НАШЛАСЬ ПРОВЕРКОЙ, а не глазами: поддон вазы живёт на той же ручке `fnWall` и зажимался
     тем же числом. Строка «ни у одной не осталось зажима числом» и поймала его — ровно затем она и
     написана в исходник, а не по списку из головы. */
  ['поддон',     {fnOn:true, fnMode:'vase', vasePart:'saucer', vaseH:120, vaseBaseD:60, vaseBellyD:95},
                 'fnWall', p => vaseSaucerSpec(p).wall, p => vaseSaucerSpec(p).wAsk],
  /* СЕДЬМАЯ ПРИШЛА ПОЗЖЕ ОСТАЛЬНЫХ (v25.37.0), и отложена была не зря: у телескопа стенка входит ещё
     и в ШАГ СЕКЦИЙ, поэтому поднятая соплом стенка забирает место у просвета — это считается отдельно
     и говорится отдельной строкой. Само же правило пола у неё общее, и здесь проверяется именно оно. */
  ['телескоп',   {pipMode:'telescope'}, 'telWall', p => telescopeSpec(p).w, p => telescopeSpec(p).wAsk],
];
const P = (base, ov) => Object.assign(defaultBoxParams(), base, ov);
const W_ = (base, ov) => collectPrintWarnings(P(base, ov));

console.log('=== правило одно на всех ===');
{
  chk('правило зажима стенки — одно выражение', typeof wallFloored === 'function' &&
      Math.abs(wallFloored({}, 0.1) - 0.8) < 1e-9 && Math.abs(wallFloored({printNozzle:'0.6'}, 0.1) - 1.2) < 1e-9);
  chk('  и оно не трогает стенку толще двух проходов',
      Math.abs(wallFloored({}, 2) - 2) < 1e-9 && Math.abs(wallFloored({printNozzle:'0.8'}, 2) - 2) < 1e-9);
  const fs = require('fs'), app = fs.readFileSync('parametric-stl-generator.html', 'utf8')
    .split('<script>').slice(2).join('<script>');
  /* Прежний зажим числом у этих пятерых не должен остаться НИ В ОДНОМ: проверка смотрит в исходник,
     потому что удалённое выражение из бандла иначе не видно. */
  const olds = ['p.mntTrWall>0 ? p.mntTrWall : 2)', 'p.mntCupWall>0 ? p.mntCupWall : 1.6)',
                'p.mntKcWall>0 ? p.mntKcWall : 1.6))', 'p.fnWall||1.6)', 'p.fnWall||1.6);',
                'p.telWall>0 ? p.telWall : 1.6)']
    .filter(x => app.indexOf('Math.max(0.8, ' + x) >= 0);
  chk('  и ни у одной из семи стенок не осталось зажима числом', olds.length === 0, olds);
}

console.log('\n=== стенка идёт за соплом — у всех семерых одинаково ===');
for (const [name, base, knob, get, asked] of WALLS){
  for (const [nz, want] of [['0.25', 0.5], ['0.4', 0.8], ['0.6', 1.2], ['0.8', 1.6]]){
    const p = P(base, {[knob]:0.5, printNozzle:nz});
    chk(name + ', сопло ' + nz + ': заказ 0.5 → ' + get(p).toFixed(2),
        Math.abs(get(p) - want) < 1e-9, {деталь:+get(p).toFixed(3), ждём:want});
  }
  const pThick = P(base, {[knob]:3, printNozzle:'0.8'});
  chk('  ' + name + ': толстую стенку сопло не трогает', Math.abs(get(pThick) - 3) < 1e-9, get(pThick));
  /* У КОГО ЕСТЬ СВОЙ ПОТОЛОК — он остаётся на месте: зажим снизу его не отменяет. У чехла ключа
     стенка толще четырёх миллиметров съела бы саму полость. */
  if (name === 'чехол'){
    const pHigh = P(base, {[knob]:8});
    chk('  чехол: свой потолок 4 мм остался', Math.abs(get(pHigh) - 4) < 1e-9, get(pHigh));
  }
  chk('  ' + name + ': заказанное число сохранено рядом',
      Math.abs(asked(P(base, {[knob]:0.5})) - 0.5) < 1e-9, asked(P(base, {[knob]:0.5})));
}

console.log('\n=== и все семеро об этом ГОВОРЯТ, называя оба числа ===');
/* СТРОКА КАЖДОГО — СВОЯ, И ЭТО НЕ ПРИДИРКА. Поддон живёт на той же ручке `fnWall`, что и ваза, и
   общий шаблон «стенка … поднята» ловил у него ЧУЖУЮ строку: подмена «поддон молчит» проходила
   насквозь, потому что вместо него говорила ваза. Каждая проверка спрашивает СВОЁ имя. */
const OWN = {'переходник':'переходника', 'чашка':'чашки', 'чехол':'чехла', 'ваза':'вазы',
             'воронка':'воронки', 'поддон':'поддона', 'телескоп':'секции'};
for (const [name, base, knob] of WALLS){
  const re = new RegExp('стенка ' + OWN[name] + ' поднята с 0\\.50 до 1\\.20 мм соплом 0\\.6');
  const said = W_(base, {[knob]:0.5, printNozzle:'0.6'}).filter(x => re.test(x));
  chk(name + ': подъём назван СВОЕЙ строкой, обоими числами и соплом', said.length === 1, said);
  chk('  ' + name + ': на своём умолчании молчит',
      !W_(base, {}).some(x => /поднята с/.test(x)), W_(base, {}).filter(x => /поднята/.test(x)));
  chk('  ' + name + ': и на мелком сопле тоже — оно тонкую стенку уважает',
      !W_(base, {[knob]:0.5, printNozzle:'0.25'}).some(x => /поднята с/.test(x)));
}

console.log('\n=== ложное утверждение убрано ===');
{
  /* 0.8 мм — это ДВА прохода сопла 0.4, а не меньше одного. Прежний текст говорил обратное. */
  const fs = require('fs'), app = fs.readFileSync('parametric-stl-generator.html', 'utf8');
  chk('в файле не осталось «тоньше одного прохода сопла»',
      app.indexOf('тоньше одного прохода сопла') < 0);
  /* А порог жалобы теперь от сопла, а не число 1.0: на крупном сопле стенка 1.0 уже тонка. */
  for (const [name, base, knob, get] of WALLS.slice(0, 3)){
    const p = P(base, {[knob]:1.0, printNozzle:'0.8'});
    chk(name + ': на сопле 0.8 стенка 1.0 поднята до 1.6', Math.abs(get(p) - 1.6) < 1e-9, get(p));
  }
}

console.log('\n=== геометрия при своём сопле не двигается ===');
{
  /* Числа ПЕЧАТНЫЕ: при сопле 0.4 старое поведение сохранено до последней цифры. */
  for (const [name, base, knob, get] of WALLS)
    chk(name + ': при сопле 0.4 зажим тот же, что был числом 0.8',
        Math.abs(get(P(base, {[knob]:0.5, printNozzle:'0.4'})) - 0.8) < 1e-9);
}

console.log('\n=== воронка: спецификация и ПОСТРОЕННОЕ — одно и то же ===');
/* ЗАЧЕМ ЭТОТ РАЗДЕЛ. Шесть стенок из семи кончаются полом по соплу, и `spec.w` для них — последнее
   слово. У воронки после пола идёт ПОТОЛОК по носику, и до v25.34.0 потолок этот стоял в двух местах:
   в спецификации — от `wallFloored`, у построителя — от зашитого 0.8. На сопле 0.6 приложение писало
   «поднята до 1.20» и строило 0.80. Проверка выше этого не видела, потому что спрашивала у воронки
   `wWant` — ЗАКАЗАННОЕ число, а не построенное. Поэтому здесь мерится СЕТКА. */
{
  /* Толщина трубки носика горизонтальным сечением: наружный радиус минус внутренний. Сечение берётся
     ВНУТРИ трубки (3 мм над низом), где стенка вертикальна, а не на конусе. */
  const spoutWall = (tris, y) => {
    const hits = [];
    for (const T of tris) for (let e = 0; e < 3; e++){
      const a = T[e], b = T[(e+1)%3];
      if ((a[1]-y)*(b[1]-y) < 0){ const t = (y-a[1])/(b[1]-a[1]);
        hits.push(Math.hypot(a[0] + t*(b[0]-a[0]), a[2] + t*(b[2]-a[2]))); } }
    if (!hits.length) return null;
    hits.sort((x, z) => x - z);
    return hits[hits.length-1] - hits[0];
  };
  const FN = {fnOn:true, fnMode:'funnel', fnMouthD:70, fnSpoutD:12, fnSpoutLen:25, fnConeH:45};
  const cases = [
    ['умолчание',              {fnWall:1.6},                                    1.6],
    ['ровно два прохода',      {fnWall:0.8},                                    0.8],
    ['сопло 0.6 поднимает',    {fnWall:0.8, printNozzle:'0.6'},                 1.2],
    ['сопло 0.8 поднимает',    {fnWall:0.5, printNozzle:'0.8'},                 1.6],
    ['носик режет потолком',   {fnWall:1.6, fnSpoutD:3},                        1.0],
    ['носик режет НИЖЕ пола',  {fnWall:1.6, fnSpoutD:3, printNozzle:'0.8'},     1.0]];
  for (const [name, ov, want] of cases){
    const p = P(FN, ov), s = funnelSpec(p), tris = buildTrisForShape('box', p);
    let lo = 1e9; for (const T of tris) for (const v of T) if (v[1] < lo) lo = v[1];
    const built = spoutWall(tris, lo + 3);
    chk('воронка ' + name + ': спецификация говорит ' + want, Math.abs(s.w - want) < 1e-9, s.w);
    chk('  и построена ровно она', built !== null && Math.abs(built - want) < 1e-3, built);
  }
  /* ПОТОЛОК СИЛЬНЕЕ ПОЛА, И ЭТО ЕДИНСТВЕННОЕ МЕСТО, ГДЕ ТАК. Подтянуть стенку обратно нельзя: она
     съела бы просвет носика целиком, — поэтому воронка единственная, кому есть на что жаловаться. */
  const thin = P(FN, {fnWall:1.6, fnSpoutD:3, printNozzle:'0.8'});
  chk('воронка: тонкая стенка ДОСТИЖИМА — потолок бьёт пол', funnelSpec(thin).thinWall === true);
  const said = collectPrintWarnings(thin).filter(x => /тоньше двух проходов сопла 0\.8 \(1\.6 мм\)/.test(x));
  chk('и об этом сказано с настоящим соплом', said.length === 1, said);
  chk('  и виноватым назван НОСИК, а не ручка стенки',
      said.length === 1 && /носик Ø3\.0/.test(said[0]), said);
  chk('воронка на умолчаниях жалобы не знает', funnelSpec(P(FN, {})).thinWall === false);
}

console.log('\n=== мёртвых правил про тонкую стенку не осталось ===');
{
  /* ПОЛ — ПОСЛЕДНЕЕ, ЧТО ДЕЛАЕТСЯ С ПЯТЬЮ СТЕНКАМИ, значит «тоньше двух проходов» у них недостижимо
     ТОЖДЕСТВЕННО. Такое правило не осторожность, а мёртвый код: выглядит проверкой, проверить не
     может ничего. Перебором этого не докажешь — доказывает построение, поэтому проверка спрашивает
     исходник, а не гоняет значения. */
  const fs = require('fs'), app = fs.readFileSync('parametric-stl-generator.html', 'utf8');
  chk('ни одна стенка не жалуется, что её «обрезало место»',
      app.indexOf('её обрезало место, а не ручка') < 0);
  /* Воронка спрашивается ОТДЕЛЬНО и НАСТОЯЩИМ полем `w`: у неё пол не последний, и попади она в этот
     цикл через `wWant`, проверка молча мерила бы заказанное число вместо построенного — ровно та
     дыра, сквозь которую расхождение спецификации с построителем и прожило три сборки. */
  const FLOORED = [['переходник', {mntMode:'transition'}, 'mntTrWall',  p => transitionSpec(p).w],
                   ['чашка',      {mntMode:'cupholder'},  'mntCupWall', p => cupHolderSpec(p).w],
                   ['чехол',      {mntMode:'keycover'},   'mntKcWall',  p => keyCoverSpec(p).wall],
                   ['ваза',       {fnOn:true, fnMode:'vase', vaseH:120}, 'fnWall', p => vaseSpec(p).wall],
                   ['поддон',     {fnOn:true, fnMode:'vase', vasePart:'saucer', vaseH:120}, 'fnWall',
                                  p => vaseSaucerSpec(p).wall],
                   ['телескоп',   {pipMode:'telescope'}, 'telWall', p => telescopeSpec(p).w]];
  for (const [name, base, knob, get] of FLOORED){
    /* Ни на одном сопле и ни на одном значении ручки построенная стенка не выходит ниже пола. */
    let below = null;
    for (const nz of ['0.25','0.4','0.6','0.8']) for (const v of [0, 0.1, 0.5, 0.8, 1.2, 1.6, 4, 12]){
      const p = P(base, {[knob]:v, printNozzle:nz});
      if (get(p) < minFeature(p) - 1e-9) below = [nz, v, get(p)];
    }
    chk(name + ': ниже двух проходов стенка не опускается ни при каком сопле', below === null, below);
  }
  chk('и проверены этим все шестеро, у кого пол последний', FLOORED.length === WALLS.length - 1);
  /* А у воронки — опускается, и потому правило у неё живое: одно и то же утверждение проверено с
     обеих сторон, иначе «мёртвых нет» доказывалось бы отсутствием попытки. */
  const fp = P({fnOn:true, fnMode:'funnel', fnSpoutD:3}, {fnWall:1.6, printNozzle:'0.8'});
  chk('воронка — единственное исключение, и оно измерено', funnelSpec(fp).w < minFeature(fp) - 1e-9);
}

console.log('\n=== TOTAL:', pass, 'passed,', fail, 'failed ===');
if (fail) process.exitCode = 1;
