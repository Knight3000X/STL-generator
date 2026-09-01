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
                'p.mntKcWall>0 ? p.mntKcWall : 1.6))', 'p.fnWall||1.6)', 'p.fnWall||1.6);']
    .filter(x => app.indexOf('Math.max(0.8, ' + x) >= 0);
  chk('  и ни у одной из пяти стенок не осталось зажима числом', olds.length === 0, olds);
}

console.log('\n=== стенка идёт за соплом — у всех пятерых одинаково ===');
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

console.log('\n=== и все пятеро об этом ГОВОРЯТ, называя оба числа ===');
/* СТРОКА КАЖДОГО — СВОЯ, И ЭТО НЕ ПРИДИРКА. Поддон живёт на той же ручке `fnWall`, что и ваза, и
   общий шаблон «стенка … поднята» ловил у него ЧУЖУЮ строку: подмена «поддон молчит» проходила
   насквозь, потому что вместо него говорила ваза. Каждая проверка спрашивает СВОЁ имя. */
const OWN = {'переходник':'переходника', 'чашка':'чашки', 'чехол':'чехла', 'ваза':'вазы',
             'воронка':'воронки', 'поддон':'поддона'};
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

console.log('\n=== TOTAL:', pass, 'passed,', fail, 'failed ===');
if (fail) process.exitCode = 1;
