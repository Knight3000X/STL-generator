// ПЕРЕПИСЬ МЁРТВЫХ ПРЕДУПРЕЖДЕНИЙ — зеркало переписи молчунов.
//
// ЗАЧЕМ ЭТОТ ФАЙЛ СУЩЕСТВУЕТ. Пункт 10.4 спрашивал, какие СЕМЕЙСТВА не говорят человеку ничего. Разбор
// кончился, и остался обратный вопрос, который никто не задавал: какие ПРАВИЛА не могут сработать
// никогда. Условие, которое не выполняется ни при каких настройках, — это не осторожность, а мёртвый
// код: он выглядит заботой, стоит места в голове читающего и молча врёт про то, что приложение якобы
// проверяет. Мест `w.push` в `collectPrintWarnings` без малого пять сотен, и до этой сборки никто не
// знал, сколько из них достижимо.
//
// КАК ЭТО МЕРИТСЯ. Функция берётся ЖИВАЯ — `collectPrintWarnings.toString()`, — и каждое место `w.push`
// в её теле подменяется на запись «сработало место номер N». Собранный из этого исходника двойник
// зовётся ЧЕРЕЗ ПРЯМОЙ `eval`, а не через `new Function`: второй создаёт функцию в глобальной области,
// где нет ни одной из сотен функций страницы, и падает на первой же строке. Двойник проверяется на
// совпадение с настоящей функцией, иначе перепись мерила бы что-то своё.
//
// ЧЕГО ЭТОТ ПЕРЕБОР НЕ ВИДИТ — сказано прямо, потому что перепись заниженная по построению:
//   • он крутит ручки ПАНЕЛИ, а часть правил стережёт значения, которых панель не даёт вовсе (плита
//     Gridfinity больше семи ячеек: ползунок кончается на шести, а из сохранённого JSON приехать может
//     что угодно) — такие правила законны и будут числиться молчащими;
//   • он берёт ОДНУ ручку и ПАРЫ ручек своей группы, но не тройки: «перемычка узора тоньше сопла»
//     требует разом сквозного реза, узора-соты и мелкой клетки, и в перебор не попадает;
//   • контексты, которых ручками не задать (логотипы, отверстия, грани кости, сетка детали, шаблон
//     стола Orca), заданы списком, и список этот неполон.
// Поэтому здесь закреплены ДВА ЧИСЛА: сколько мест сработало (может только расти) и сколько молчит
// (может только сокращаться). Ровно как список молчунов в `test_registry.js`.
//
// Run: ./run-all.sh

let pass = 0, fail = 0;
function chk(n, c, e){ if (c){ pass++; console.log('  OK  ', n); }
  else { fail++; console.log('  FAIL', n, e !== undefined ? JSON.stringify(e) : ''); } }

/* ---- двойник ------------------------------------------------------------------------------------ */
const src = collectPrintWarnings.toString();
const body = src.slice(src.indexOf('{') + 1, src.lastIndexOf('}'));
const sites = [];
let nSites = 0;
const inst = body.replace(/w\.push\(/g, (m, off) => { sites.push(off); return '__push(' + (nSites++) + ', w, '; });
const twin = eval('(function(p, mesh, __push, __fired){' + inst + '})');
const fired = new Set();
const push = (i, arr, s) => { fired.add(i); arr.push(s); };

console.log('=== двойник описывает ту же функцию ===');
{
  chk('мест w.push найдено', nSites >= 400, nSites);
  chk('  и все они размечены', nSites === (src.match(/w\.push\(/g) || []).length, nSites);
  /* СОВПАДЕНИЕ С НАСТОЯЩЕЙ ФУНКЦИЕЙ. Без этого перепись мерила бы свой собственный текст: подмена
     `w.push` могла бы, например, съесть аргумент или сломать порядок, и никто бы не заметил. */
  const same = [];
  for (const f of FAMILIES){
    logos.length = 0; boxHoles.length = 0; if (typeof dieFaces !== 'undefined') dieFaces.length = 0;
    const p = Object.assign(defaultBoxParams(), f.act);
    paramState.box = p;
    const a = twin(p, undefined, push, fired), b = collectPrintWarnings(p);
    same.push(JSON.stringify(a) === JSON.stringify(b));
  }
  chk('двойник отдаёт то же, что и настоящая функция, на всех двадцати пяти семействах',
      same.every(Boolean), same.filter(x => !x).length);
}

/* ---- перебор ------------------------------------------------------------------------------------ */
const rows = SHAPE_PARAMS.box, byKey = {};
for (const r of rows) byKey[r.key] = r;
function values(r){
  if (r.type === 'select') return (r.options || []).map(o => o.v);
  if (r.type === 'bool') return [true, false];
  if (typeof r.min === 'number'){ const st = r.step || 0.1;
    /* ОДИН ШАГ ОТ КРАЯ — не прихоть: у половины ручек ноль означает «выключено», и правило висит на
       самом мелком НЕнулевом значении. Канавка под манжету 0.2 мм не находилась вовсе, пока перебор
       брал только края, умолчание и четверти: пятнадцать мест ожили от одной этой строки. */
    const v = [r.min, r.min + st, r.max, r.max - st, r.default,
               r.min + (r.max - r.min)*0.25, r.min + (r.max - r.min)*0.5, r.min + (r.max - r.min)*0.75];
    return [...new Set(v.map(x => r.int ? Math.round(x) : +x.toFixed(4)))]; }
  return [];
}
const mkLogo = (over) => Object.assign({id:1, face:'+Z', u0:0, v0:0, w:20, h:20, depth:1,
  threshold:0.5, invert:false, rotation:0, levels:2,
  heightmap:(() => { const a = new Float32Array(64); for (let i = 0; i < 64; i++) a[i] = (i % 8 < 4) ? 1 : 0; return a; })(),
  hmW:8, hmH:8}, over || {});
/* Сетки разного размера и НЕКВАДРАТНЫЙ стол: правила про стол иначе недостижимы — «влезает только
   повёрнутой» требует стола 250×350, «запас по краю» — детали впритык, «выше стола» — объявленной
   высоты печати. */
const MESHES = [plainBoxShellTris(100, 50, 100), plainBoxShellTris(250, 50, 250),
                plainBoxShellTris(300, 50, 200), plainBoxShellTris(100, 400, 100),
                plainBoxShellTris(300, 50, 300)];
const ORCA = {name:'t', cfg: JSON.stringify({printable_area:['0x0','250x0','250x350','0x350'],
  printable_height:['100'], printer_settings_id:'Стенд'})};
let probes = 0;
const take = (p, mesh) => { paramState.box = p; probes++;
  try { twin(p, mesh, push, fired); } catch(e){ /* сломанные сочетания не в счёт */ } };
const BROKE = [];
for (const fam of FAMILIES){
 try {
  const actKeys = Object.keys(fam.act);
  const selKey = actKeys.find(kk => byKey[kk] && byKey[kk].type === 'select');
  const modes = selKey ? values(byKey[selKey]).filter(v => v !== 'none') : [null];
  const famGroup = (byKey[selKey] || byKey[actKeys[0]] || {}).group;
  for (const mode of modes){
    const base = () => { logos.length = 0; boxHoles.length = 0;
      if (typeof dieFaces !== 'undefined') dieFaces.length = 0;
      const p = Object.assign(defaultBoxParams(), fam.act);
      if (mode !== null) p[selKey] = mode; return p; };
    take(base());
    for (const m of MESHES){ orcaTemplate = null; take(base(), m);
      orcaTemplate = ORCA; take(base(), m); }
    orcaTemplate = null;
    const rel = rows.filter(r => !r.w || (mode !== null && r.w.includes(mode)) || !selKey);
    for (const r of rel) for (const v of values(r)){ const p = base(); p[r.key] = v; take(p); }
    const few = r => { const v = values(r); return v.length <= 3 ? v : [v[0], v[1], v[2]]; };
    /* «Свои» ручки — это ручки ГРУППЫ семейства, а не только те, у кого есть `w`: ширина задника,
       глубина зацепа и число ячеек плиты `w` не несут вовсе. А у куба, базплейта и объёмного логотипа
       своей группы нет вообще (их включает кнопка или ничего), и парами у них крутятся ОБЩИЕ строки. */
    const own = famGroup
      ? rows.filter(r => r.group === famGroup && (!r.w || mode === null || r.w.includes(mode)))
      : rows.filter(r => !r.w);
    for (let i = 0; i < own.length; i++) for (let j = i + 1; j < own.length; j++)
      for (const a of few(own[i])) for (const b of few(own[j])){
        const p = base(); p[own[i].key] = a; p[own[j].key] = b; take(p); }
    /* Контексты, которых ручками не задать. */
    { const p = base(); logos.push(mkLogo()); take(p); take(p, MESHES[2]);
      for (const d of [0.1, 0.3, 3, -1]){ logos[0].depth = d; take(p); } }
    { const p = base(); logos.length = 0; logos.push(mkLogo({w:200, h:200})); take(p); }
    /* Рисунок, у которого порог не переваливает НИ ОДНА точка, и рисунок, у которого его переваливают
       ВСЕ: два разных правила, и второе без сплошной картинки недостижимо. */
    { const p = base(); logos.length = 0; logos.push(mkLogo({heightmap:new Float32Array(64)})); take(p); }
    { const p = base(); logos.length = 0;
      logos.push(mkLogo({heightmap:new Float32Array(64).fill(1)})); take(p); }
    { const p = base(); logos.length = 0;
      logos.push(mkLogo()); logos.push(mkLogo({id:2, face:'+Z', u0:2, v0:2})); take(p); }
    { const p = base(); boxHoles.push({id:1, face:'+Y', u:0, v:0, d:6, kind:'plain'});
      boxHoles.push({id:2, face:'+Y', u:1, v:0, d:6, kind:'plain'}); take(p); }
    { const p = base(); if (typeof dieFaces !== 'undefined') dieFaces.push({id:1, face:0, kind:'digit'}); take(p); }
  }
 } catch(e){ BROKE.push(fam.key + ': ' + e.message); }
}
logos.length = 0; boxHoles.length = 0; if (typeof dieFaces !== 'undefined') dieFaces.length = 0;
orcaTemplate = null;

console.log('\n=== перепись мёртвых предупреждений ===');
{
  const dead = [];
  for (let i = 0; i < nSites; i++) if (!fired.has(i)) dead.push(i);
  chk('перебор нигде не оборвался', BROKE.length === 0, BROKE);
  chk('перебор и правда широкий', probes > 1000000, probes);
  /* ДВА ЧИСЛА, ЗАКРЕПЛЁННЫЕ ПОИМЁННО. Сработавших может стать только больше, молчащих — только меньше:
     первое падает, если правило перестало быть достижимым, второе — если добавили ещё одно мёртвое.
     Числа занижены по построению (см. шапку), и в этом нет беды: перепись меряет ДВИЖЕНИЕ. */
  const FIRED_MIN = 417, DEAD_MAX = 69;   // закреплено v25.20.0, поднято v25.22.0 (486 мест)
  chk('сработавших мест не убыло (' + fired.size + ' ≥ ' + FIRED_MIN + ')', fired.size >= FIRED_MIN,
      {сработало:fired.size, порог:FIRED_MIN});
  chk('молчащих мест не прибыло (' + dead.length + ' ≤ ' + DEAD_MAX + ')', dead.length <= DEAD_MAX,
      {молчит:dead.length, порог:DEAD_MAX});
  console.log('       мест всего: ' + nSites + ', сработало ' + fired.size +
              ', молчит ' + dead.length + '; наборов перебрано ' + probes);
  for (const i of dead){
    const off = sites[i];
    console.log('       молчит #' + i + ': ' + body.slice(off, off + 90).replace(/\s+/g, ' '));
  }
}

console.log('\n=== TOTAL:', pass, 'passed,', fail, 'failed ===');
if (fail) process.exitCode = 1;
