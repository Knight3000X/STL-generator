// Перебор наборов слепка: он один на всех, и сузиться молча не должен.
//
// ЗАЧЕМ ЭТА ПРОВЕРКА. Слепок ловит то, чего не ловят остальные сто сорок девять файлов, — но ровно
// настолько, насколько широк его перебор. А перебор — обычный код, и он может тихо сузиться: семья
// перестанет попадать в список, подрежим выпадет, счётчик уедет. Тогда слепок продолжит показывать
// «ноль различий» и будет при этом слеп.
//
// И ЭТО НЕ ВЫДУМАННАЯ ОПАСНОСТЬ. В v25.48.0 перебор писался трижды — своими руками, под каждую
// перепись, — и все три раза оказывался у́же слепкового. Из этого вышли ВСЕ ТРИ неверных вывода того
// выпуска: «крест мальтийского перекрывается» (перебор шёл по семьям, а деталь односкорлупная),
// «схлопывание касаний мертво» (156 наборов при УМОЛЧАНИЯХ; случай требовал сочетания ручек),
// «зажим тронет четыре набора» (155 семей; на полном переборе 676). Ошибка была не в замере, а в том,
// что вывод делался шире перебора.
//
// Поэтому здесь закреплены ЧИСЛА. Они обязаны меняться осознанно: добавили модель — счёт вырос, и это
// видно в правке. Молча уменьшиться они не могут.

let pass=0, fail=0;
function chk(n,c,e){if(c){pass++;console.log('  OK  ',n);}else{fail++;console.log('  FAIL',n,e!==undefined?JSON.stringify(e):'');}}

console.log('=== перебор семей покрывает ВСЕ семьи и ВСЕ их подрежимы ===');
{
  const fam = setsFamilies();
  const names = fam.map(s => s[0]);
  chk('перебор не пуст', fam.length > 0, fam.length);
  /* КАЖДАЯ СЕМЬЯ ИЗ РЕЕСТРА — в переборе, и не «примерно», а поимённо. */
  const missing = FAMILIES.filter(f => !names.includes('семья:' + f.key)).map(f => f.key);
  chk('все ' + FAMILIES.length + ' семей на месте', missing.length === 0, missing);
  /* И КАЖДЫЙ ПОДРЕЖИМ — тоже. Список берётся у ПАНЕЛИ, а не выписывается: выписанный по памяти
     пропустил бы ровно тот, который добавили последним. */
  let want = 0, lost = [];
  for (const f of FAMILIES){
    const keys = Object.keys(f.act || {});
    if (keys.length !== 1) continue;
    const row = SHAPE_PARAMS.box.find(r => r.key === keys[0]);
    if (!row || row.type !== 'select') continue;
    for (const o of (row.options || [])){
      if (!o.v || o.v === 'none') continue;
      want++;
      if (!names.includes('семья:' + f.key + ':' + o.v)) lost.push(f.key + ':' + o.v);
    }
  }
  chk('все ' + want + ' подрежимов на месте', lost.length === 0, lost);
  chk('имена наборов семей не повторяются', new Set(names).size === names.length,
      names.length - new Set(names).size);
  /* НОВЫЕ МОДЕЛИ ЭТОГО ЗАХОДА — поимённо: они и проверяют, что перебор читает панель, а не память. */
  for (const k of ['seal:bellows', 'seal:labyrinth', 'gear:oldham'])
    chk('  в переборе есть ' + k, names.includes('семья:' + k));
}

console.log('\n=== счёт наборов закреплён: сузиться молча нельзя ===');
{
  const fam = setsFamilies(), part = setsPart(), extra = setsExtra();
  /* Числа не выдуманы: столько выдаёт перебор на v25.49.0. Выросли — значит добавили модель или ручку,
     и это видно в правке. Упали — значит что-то выпало, и это падение. */
  chk('семьи и подрежимы: 155 наборов', fam.length === 155, fam.length);
  chk('широкий перебор: 3948 наборов', part.length === 3948, part.length);
  chk('семьи и их ручки: 1196 наборов', extra.length === 1196, extra.length);
  /* ШИРОКИЙ ПЕРЕБОР БЕРЁТ ПЕРЕБОР СЕМЕЙ ЦЕЛИКОМ, а не повторяет его своими руками — ради этого он и
     вынесен. Семьи идут вторыми: первыми стоят «умолчания». */
  chk('широкий перебор включает перебор семей целиком и в том же порядке',
      part.length > fam.length && part[0][0] === 'умолчания' &&
      fam.every((s, i) => part[i+1][0] === s[0]),
      {семей:fam.length, широкий:part.length, первый:part[0][0]});
  /* ИМЕНА ЗДЕСЬ ПОВТОРЯЮТСЯ, И ЭТО НЕ БЕДА — но проверять надо не отсутствие повторов, а то, что
     под одним именем не прячутся РАЗНЫЕ наборы. Повторы берутся оттуда, что у ручки минимум и
     умолчание бывают равны (у `chPad` оба нули), и `triOf` выдаёт значение дважды. Сверялка ключуется
     по имени, поэтому одинаковые наборы она сложит в один — потери нет, есть лишний счёт. А вот если
     под общим именем окажутся РАЗНЫЕ наборы, сверялка ослепнет на один из них молча. Это и закреплено.
     Первая редакция этой проверки требовала уникальности имён и падала на давнем и безобидном. */
  const collide = sets => { const by = {};
    for (const [nm, ov] of sets) (by[nm] = by[nm] || []).push(JSON.stringify(ov));
    return Object.keys(by).filter(nm => new Set(by[nm]).size > 1); };
  chk('в широком переборе под одним именем не прячутся РАЗНЫЕ наборы',
      collide(part).length === 0, collide(part).slice(0, 3));
  chk('и в переборе ручек тоже', collide(extra).length === 0, collide(extra).slice(0, 3));
  const dupPart = part.length - new Set(part.map(s => s[0])).size;
  const dupExtra = extra.length - new Set(extra.map(s => s[0])).size;
  chk('повторов в широком переборе 48 — все одинаковые наборы', dupPart === 48, dupPart);
  chk('повторов в переборе ручек 104 — тоже', dupExtra === 104, dupExtra);
}

console.log('\n=== каждый набор строится, и ни один не молчит ===');
{
  /* ПЕРЕБОР, ПОЛОВИНА КОТОРОГО ПАДАЕТ, — это не перебор. Проверяются семьи: полный прогон стоит
     минут, и он и есть сам слепок; здесь довольно того, что каждый набор даёт непустую сетку. */
  const setP = ov => { logos.length = 0; boxHoles.length = 0;
    if (typeof dieFaces !== 'undefined') dieFaces.length = 0;
    Object.assign(paramState.box, defaultBoxParams(), {gfBaseplate:false, logo3d:false}, ov);
    return paramState.box; };
  let bad = [], empty = [];
  for (const [nm, ov] of setsFamilies()){
    let t; try { t = buildTrisForShape('box', setP(ov)); }
    catch(e){ bad.push(nm + ': ' + e.message); continue; }
    if (!t || !t.length) empty.push(nm);
  }
  chk('ни один набор семей не роняет построитель', bad.length === 0, bad.slice(0, 3));
  chk('и ни один не отдаёт пустую сетку', empty.length === 0, empty.slice(0, 3));
}

console.log('\n=== TOTAL:', pass, 'passed,', fail, 'failed ===');
if (fail) process.exitCode = 1;
