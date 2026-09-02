// УМОЛЧАНИЕ, НАПИСАННОЕ ДВАЖДЫ — перепись, которой в файле не было, и честный ответ на вопрос,
// оставленный открытым в `BUGS.md`.
//
// ЗАЧЕМ ЭТОТ ФАЙЛ СУЩЕСТВУЕТ. У каждой ручки приложения умолчание записано ДВА раза: строкой панели
// (`{key:'pipGap', … default:0.35}`) и запаской в коде (`p.pipGap != null ? p.pipGap : 0.35`).
// Панельное всегда сильнее — `defaultBoxParams()` раскладывает его по всем ключам ещё до первой
// сборки, — поэтому расхождение этих двух чисел НЕ ВИДНО НИ НА ОДНОМ наборе настроек. Оно и уехало:
// у `p.pipGap` было четыре записи, три с умолчанием 0.35 и одна с 0.30.
//
// ПЕРВЫЙ ЗАМЕР БЫЛ НЕГОДНЫМ и объявлен таковым в `BUGS.md`: регулярное выражение по строке ловило
// посторонние числа в той же строке, дало «61» и не подтвердилось. Здесь замер идёт РАЗБОРОМ
// ВЫРАЖЕНИЙ: исходник токенизируется (строки, шаблоны, комментарии и регулярки — не текст программы),
// и запаска ищется по форме выражения, а не по соседству символов.
//
// ЧТО СЧИТАЕТСЯ ЗАПАСКОЙ, А ЧТО НЕТ — это половина работы замера:
//   • `p.k != null ? p.k : N`, `p.k || N`, `p.k ?? N`, `p.k > 0 ? p.k : N` — запаска;
//   • `p.k > 0 ? p.k : N` при ручке, у которой НОЛЬ в пределах панели, — НЕ вторая копия умолчания:
//     это «0 = авто», и N там единственное написание числа. Такие места считаются отдельно и со
//     значением умолчания не сверяются вовсе;
//   • «тогда» тернарника обязано быть той же ручкой: `p.vaseDrain > 0 ? 'слив' : 'ваза'` — это выбор
//     слова, а не запаска, и первая редакция замера на таких местах врала.
//
// ЧЕГО ЗАМЕР НЕ ВИДИТ (объявленная слепота): ручки читаются через `p` — так написан весь файл, — и
// местá, где параметры пришли под другим именем, в перепись не попадают. Не видит он и запаску,
// спрятанную в помощнике (`cl_(p.chCards, 1, 20, 6)`): там умолчание стоит четвёртым доводом, и по
// форме выражения оно неотличимо от обычного числа.
//
// Run: ./run-all.sh

let pass = 0, fail = 0;
function chk(n, c, e){ if (c){ pass++; console.log('  OK  ', n); }
  else { fail++; console.log('  FAIL', n, e !== undefined ? JSON.stringify(e) : ''); } }

const fs = require('fs');
const app = fs.readFileSync('parametric-stl-generator.html', 'utf8');
/* ТОТ ЖЕ КУСОК, ЧТО БЕРЁТ `run-all.sh`: всё со ВТОРОГО `<script>` и дальше (первый — вшитая Three.js). */
const src = app.split('<script>').slice(2).join('<script>');

/* ============================ панельная сторона ============================
   Берётся из ЖИВОГО `SHAPE_PARAMS`, а не из текста файла: строка панели — это объект, и читать его
   разбором исходника значило бы завести третью копию тех же чисел. */
const panel = new Map();
for (const row of SHAPE_PARAMS.box) panel.set(row.key, row);

/* ============================ токенизатор ============================
   Мелкий, но настоящий: строки, шаблоны, комментарии и регулярные выражения не должны попадать в
   разбор ни одним символом — иначе `p.width` из строки подсказки станет чтением ручки. */
function tokenize(s){
  const T = [];
  let i = 0;
  const isIdStart = c => /[A-Za-z_$]/.test(c), isId = c => /[A-Za-z0-9_$]/.test(c);
  const KEYWORD_BEFORE_RE = ['return','typeof','case','in','of','new','delete','void','instanceof','do','else'];
  while (i < s.length){
    const c = s[i];
    if (c === '/' && s[i+1] === '/'){ while (i < s.length && s[i] !== '\n') i++; continue; }
    if (c === '/' && s[i+1] === '*'){ const j = s.indexOf('*/', i+2); i = j < 0 ? s.length : j+2; continue; }
    if (c === ' ' || c === '\t' || c === '\n' || c === '\r'){ i++; continue; }
    if (c === "'" || c === '"'){ const q = c; let j = i+1, v = '';
      while (j < s.length && s[j] !== q){ if (s[j] === '\\'){ v += s[j+1]; j += 2; } else v += s[j++]; }
      T.push({t:'str', v, i}); i = j+1; continue; }
    if (c === '`'){ let j = i+1, depth = 0;                       // шаблон целиком — один токен
      while (j < s.length){ if (s[j] === '\\'){ j += 2; continue; }
        if (s[j] === '$' && s[j+1] === '{'){ depth++; j += 2; continue; }
        if (s[j] === '}' && depth){ depth--; j++; continue; }
        if (s[j] === '`' && !depth) break; j++; }
      T.push({t:'str', v:'', i}); i = j+1; continue; }
    if (/[0-9]/.test(c) || (c === '.' && /[0-9]/.test(s[i+1]))){
      let j = i; while (j < s.length && /[0-9.eE]/.test(s[j])){ if ((s[j]==='e'||s[j]==='E') && (s[j+1]==='-'||s[j+1]==='+')) j++; j++; }
      T.push({t:'num', v:parseFloat(s.slice(i,j)), i}); i = j; continue; }
    if (isIdStart(c)){ let j = i; while (j < s.length && isId(s[j])) j++;
      T.push({t:'name', v:s.slice(i,j), i}); i = j; continue; }
    if (c === '/'){                                               // деление или регулярка — по предыдущему токену
      const p = T.length ? T[T.length-1] : null;
      const div = p && ((p.t === 'name' && KEYWORD_BEFORE_RE.indexOf(p.v) < 0) || p.t === 'num'
                        || (p.t === 'punct' && [')',']','}'].indexOf(p.v) >= 0));
      if (!div){ let j = i+1, cls = false;
        while (j < s.length){ if (s[j] === '\\'){ j += 2; continue; }
          if (s[j] === '[') cls = true; else if (s[j] === ']') cls = false;
          else if (s[j] === '/' && !cls) break; else if (s[j] === '\n') break; j++; }
        while (j < s.length && /[a-z]/.test(s[j+1])) j++;
        T.push({t:'re', v:'', i}); i = j+1; continue; }
    }
    const OPS = ['>>>=','===','!==','**=','...','<<=','>>=','>>>','&&=','||=','??=','=>','==','!=','<=','>=',
                 '&&','||','??','?.','++','--','+=','-=','*=','/=','%=','&=','|=','^=','**','<<','>>'];
    let op = null;
    for (const o of OPS) if (s.startsWith(o, i)){ op = o; break; }
    if (!op) op = c;
    T.push({t:'punct', v:op, i}); i += op.length;
  }
  return T;
}
const T = tokenize(src);

/* Кто владеет местом в файле — чтобы расхождение можно было назвать по имени функции, а не смещением. */
const spans = [];
for (const m of src.matchAll(/function (\w+)\s*\(/g)){
  const name = m[1], a = m.index, j = src.indexOf('{', a);
  if (j < 0) continue;
  let d = 0;
  for (let k = j; k < src.length; k++){ if (src[k]==='{') d++; else if (src[k]==='}'){ d--; if (!d){ spans.push([a,k,name]); break; } } }
}
const owner = off => { let best = null;
  for (const [a,b,n] of spans) if (off >= a && off <= b && (!best || (b-a) < best[1])) best = [n, b-a];
  return best ? best[0] : '(верхний уровень)'; };

/* ============================ разбор запасок ============================ */
const LITNAME = ['true','false','null','undefined'];
const isLit = (T, k) => T[k] && (T[k].t === 'num' || T[k].t === 'str' || (T[k].t === 'name' && LITNAME.indexOf(T[k].v) >= 0));
const litVal = (T, k) => T[k].t === 'num' ? T[k].v : T[k].t === 'str' ? T[k].v
                  : T[k].v === 'true' ? true : T[k].v === 'false' ? false : null;
/* ИМЕНОВАННАЯ КОНСТАНТА — ТОЖЕ ОТВЕТ, и притом правильный: `PIP_GAP_DEF` не копия умолчания, а
   ссылка на то же самое число. Значение берётся у живого кода, а не выводится из текста. */
function constVal(name){
  if (!/^[A-Z][A-Z0-9_]*$/.test(name)) return undefined;
  try { const v = eval(name); return (typeof v === 'number' || typeof v === 'string' || typeof v === 'boolean') ? v : undefined; }
  catch (e) { return undefined; }
}
function readVal(T, k){                       // литерал (можно со знаком) или именованная константа
  let sign = 1, j = k;
  if (T[j] && T[j].t === 'punct' && (T[j].v === '-' || T[j].v === '+')){ if (T[j].v === '-') sign = -1; j++; }
  if (isLit(T, j)){ const v = litVal(T, j); return {v: typeof v === 'number' ? sign*v : v, next: j+1, named: false}; }
  if (T[j] && T[j].t === 'name'){
    const v = constVal(T[j].v);
    if (v !== undefined) return {v: typeof v === 'number' ? sign*v : v, next: j+1, named: true};
  }
  return null;
}
const endsExpr = (T, k) => T[k] && T[k].t === 'punct' && [',',')',']',';','}',':'].indexOf(T[k].v) >= 0;
function matchColon(T, k){                    // ':' своего '?', с учётом вложенности и чужих тернарников
  let d = 0, q = 0;
  for (let j = k; j < T.length; j++){
    const t = T[j];
    if (t.t !== 'punct') continue;
    if ('([{'.indexOf(t.v) >= 0) d++;
    else if (')]}'.indexOf(t.v) >= 0){ if (d === 0) return -1; d--; }
    else if (t.v === '?' && d === 0) q++;
    else if (t.v === ':' && d === 0){ if (q === 0) return j; q--; }
  }
  return -1;
}
function sameKnob(T, a, b, key){              // токены [a,b) — это ровно `p.key` (можно с унарным плюсом)
  let k = a;
  if (T[k] && T[k].t === 'punct' && T[k].v === '+') k++;
  return T[k] && T[k].t === 'name' && T[k].v === 'p' && T[k+1] && T[k+1].v === '.' &&
         T[k+2] && T[k+2].t === 'name' && T[k+2].v === key && k+3 === b;
}

/* САМ ПОИСК — ФУНКЦИЯ НАД ТОКЕНАМИ, а не разложенный цикл: тем же поиском ниже проверяется
   подложенная запаска, и переписывать его для пробы значило бы проверять другую машинку. */
function scan(T, owner){
const found = [];
for (let i = 0; i + 2 < T.length; i++){
  if (T[i].t !== 'name' || T[i].v !== 'p') continue;
  if (T[i+1].t !== 'punct' || T[i+1].v !== '.' || T[i+2].t !== 'name') continue;
  if (T[i-1] && T[i-1].t === 'punct' && T[i-1].v === '.') continue;      // `a.p.k` — чужой объект
  const key = T[i+2].v;
  if (!panel.has(key)) continue;
  const k = i + 3, t = T[k];
  if (!t) continue;
  const push = (def, form, guard, named) => found.push({key, def, at: T[i].i, form, guard, named, fn: owner(T[i].i)});
  if (t.t === 'punct' && (t.v === '||' || t.v === '??')){
    const L = readVal(T, k+1);
    if (L && endsExpr(T, L.next)) push(L.v, t.v, t.v === '||' ? 'truthy' : 'null', L.named);
    continue;
  }
  let cmpEnd = -1, guard = null;
  if (['!=','!=='].indexOf(t.v) >= 0 && T[k+1] && T[k+1].t === 'name' && ['null','undefined'].indexOf(T[k+1].v) >= 0){ cmpEnd = k+2; guard = 'null'; }
  else if (['>','>='].indexOf(t.v) >= 0 && T[k+1] && T[k+1].t === 'num'){ cmpEnd = k+2; guard = {op:t.v, n:T[k+1].v}; }
  if (cmpEnd < 0) continue;
  let q = cmpEnd, wrapped = false;
  if (T[q] && T[q].t === 'punct' && T[q].v === ')'){ q++; wrapped = true; }
  if (!T[q] || T[q].t !== 'punct' || T[q].v !== '?') continue;
  const colon = matchColon(T, q+1);
  if (colon < 0) continue;
  if (!sameKnob(T, q+1, colon, key)) continue;        // «тогда» — сама ручка, иначе это не запаска
  const L = readVal(T, colon+1);
  if (L && endsExpr(T, L.next)) push(L.v, (wrapped ? '(' : '') + t.v + '?:', guard, L.named);
}
return found;
}
const found = scan(T, owner);

/* ============================ сверка ============================
   Вторая копия умолчания — только там, где НИ ОДНО панельное значение до запаски не доводит: тогда
   запаска отвечает за отсутствующий ключ и обязана повторять строку панели. Где доводит — там она
   значит «сколько взять, когда не задано», и это своё число, а не копия. */
function panelCanFire(guard, row){
  if (guard === 'null') return false;                       // null с панели не приходит
  if (row.type === 'bool') return true;
  if (row.type === 'select') return (row.options || []).some(o => !o.v);
  const lo = row.min, hi = row.max;
  if (typeof lo !== 'number') return true;
  if (guard === 'truthy') return lo <= 0 && hi >= 0;
  if (guard && guard.op) return guard.op === '>' ? lo <= guard.n : lo < guard.n;
  return true;
}
const auto = [], copies = [], bad = [];
for (const f of found){
  const row = panel.get(f.key), d = row.default;
  if (panelCanFire(f.guard, row)){ auto.push(f); continue; }
  copies.push(f);
  const same = (typeof d === typeof f.def)
    ? (typeof d === 'number' ? Math.abs(d - f.def) < 1e-9 : d === f.def)
    : String(d) === String(f.def);
  if (!same) bad.push(f);
}
const named = copies.filter(f => f.named);

console.log('=== машинка переписи видит то, что должна ===');
{
  chk('исходник токенизирован', T.length > 300000, T.length);
  chk('строки панели прочитаны из живого кода', panel.size > 800, panel.size);
  chk('запаски найдены', found.length > 700, found.length);
  chk('и разложены на «авто» и вторые копии', auto.length > 100 && copies.length > 500,
      {авто:auto.length, копий:copies.length});
  chk('функции по именам различаются', spans.length > 500 && spans.some(s => /Spec$/.test(s[2])), spans.length);
  /* И ЧТО ОНА ВООБЩЕ СПОСОБНА НАЙТИ РАСХОЖДЕНИЕ — иначе ноль ниже означал бы сломанный счётчик, а не
     чистый файл. Подкладываем заведомую пару и требуем, чтобы разбор её увидел и осудил. */
  const probe = scan(tokenize(
      "function fooSpec(p){ const a = Math.max(1, p.pipGap != null ? p.pipGap : 0.11);\n" +
      "  const b = Math.max(1, p.pipGap != null ? p.pipGap : PIP_GAP_DEF);\n" +
      "  const c = (p.vaseDrain > 0) ? 'слив' : 'ваза';\n" +
      "  const d = 'p.pipGap != null ? p.pipGap : 0.99';   /* p.pipGap != null ? p.pipGap : 0.98 */ }"),
    () => 'проба');
  chk('подложенную запаску тот же разбор находит', probe.length === 2 && probe[0].def === 0.11, probe);
  chk('и 0.11 не равно панельным ' + panel.get('pipGap').default, probe[0] && probe[0].def !== panel.get('pipGap').default);
  chk('именованную константу он отличает от числа', probe[1] && probe[1].named === true && probe[1].def === PIP_GAP_DEF, probe[1]);
  /* И ЧЕГО ОН НЕ ДОЛЖЕН ВИДЕТЬ: выбор слова тернарником — не запаска, а число из строки и из
     комментария — вообще не текст программы. Обе ловушки лежат в той же пробе. */
  chk('выбор слова и числа из строк с комментариями пропущены',
      probe.every(f => f.def !== 'ваза' && f.def !== 0.99 && f.def !== 0.98), probe);
  /* Слепота объявлена в шапке — она обязана быть НАСТОЯЩЕЙ, а не выдуманной: помощник с умолчанием
     четвёртым доводом в файле правда есть, и замер его правда не видит. */
  chk('слепота про помощника — не выдумка', /cl_\(p\.\w+, [\d.]+, [\d.]+, [\d.]+\)/.test(src));
}

console.log('\n=== перепись: сколько умолчаний написано дважды ===');
{
  /* ЧИСЛА ЗАКРЕПЛЕНЫ, А НЕ ОБЪЯВЛЕНЫ ОКОНЧАТЕЛЬНЫМИ. Расхождений на v25.36.0 — 60, и это ПЕРВЫЙ
     честный замер: прежние «61» получены негодным регулярным выражением и в `BUGS.md` объявлены
     неподтверждёнными. Двигаться число может только вниз. */
  const MAX_BAD = 60;
  chk('расхождений не прибыло (' + bad.length + ' ≤ ' + MAX_BAD + ')', bad.length <= MAX_BAD,
      bad.slice(0, 8).map(f => f.key + ': панель ' + JSON.stringify(panel.get(f.key).default) +
                               ' против ' + JSON.stringify(f.def) + ' в ' + f.fn));
  chk('и перепись не опустела (' + copies.length + ' вторых копий)', copies.length > 700, copies.length);
  /* ЗАЗОР ПОДВИЖНОСТИ ИЗ ПЕРЕПИСИ УШЁЛ ВОВСЕ. Четыре записи сведены к одной, и та ссылается на общее
     число, а не пишет его заново. */
  chk('у зазора петли расхождений нет', bad.every(f => f.key !== 'pipGap'),
      bad.filter(f => f.key === 'pipGap'));
  const gapForms = found.filter(f => f.key === 'pipGap');
  chk('и запаска у него ровно одна, ссылкой на общее число',
      gapForms.length === 1 && gapForms[0].named === true && gapForms[0].def === panel.get('pipGap').default,
      gapForms.map(f => ({где:f.fn, что:f.def, ссылка:f.named})));
  chk('именованных ссылок вместо чисел — не меньше одной', named.length >= 1, named.length);
}

console.log('\n=== запаска и панель: кто из них отвечает ===');
{
  /* ГЛАВНОЕ УТВЕРЖДЕНИЕ ВСЕЙ ЭТОЙ РАБОТЫ, и до v25.36.0 оно было записано НЕВЕРНО — и в `BUGS.md`, и
     в комментарии `test_saidbuilt.js`: «запаска достижима сохранённым файлом, в котором ключа нет».
     Файл, в котором ключа нет, до запаски НЕ ДОХОДИТ: импорт кладёт разобранные параметры поверх
     `defaultBoxParams()`, то есть поверх полного набора панельных умолчаний. Дверь была ровно одна и
     другая — ключ, который ЕСТЬ и равен `null`: `Object.assign` копирует его поверх умолчания. */
  /* СПРАШИВАЕТСЯ САМО ПРИЛОЖЕНИЕ, А НЕ ЕГО ПЕРЕПИСАННАЯ КОПИЯ. Первая редакция этой проверки собирала
     `Object.assign(defaultBoxParams(), paramsWithoutHoles(…))` у себя — и мутация «убрать замазку дыр
     из импорта» её ПЕРЕЖИЛА: проверка сходилась сама с собой. Правило вынесено в `paramsFromFile`, и
     ниже зовётся ровно оно. */
  const merge = j => paramsFromFile(JSON.parse(j));
  const noKey = merge('{"width":40}');
  chk('файла без ключа хватает панельного умолчания', noKey.pipGap === panel.get('pipGap').default, noKey.pipGap);
  const nulled = merge('{"pipGap":null,"latticeCell":null,"mntW":null}');
  chk('и ключ-дыра лечится тем же умолчанием, а не запаской',
      nulled.pipGap === panel.get('pipGap').default &&
      nulled.latticeCell === panel.get('latticeCell').default &&
      nulled.mntW === panel.get('mntW').default,
      {pipGap:nulled.pipGap, latticeCell:nulled.latticeCell, mntW:nulled.mntW});
  chk('дыра именно выкидывается, а не заменяется нулём',
      !('pipGap' in paramsWithoutHoles(JSON.parse('{"pipGap":null}'))) && nulled.pipGap !== 0, nulled.pipGap);
  /* И ЧТО САМА ЗАМАЗКА ДЫР НЕ ТРОГАЕТ ЗАКОННЫХ ЗНАЧЕНИЙ: ноль, пустая строка и `false` — значения, а
     не дыры, и умолчанием их подменять нельзя. */
  const zero = merge('{"pipScrewD":0,"gfLip":false,"logoText":""}');
  chk('ноль, false и пустая строка остаются собой',
      zero.pipScrewD === 0 && zero.gfLip === false && zero.logoText === '',
      {pipScrewD:zero.pipScrewD, gfLip:zero.gfLip, logoText:zero.logoText});
  /* И ЧТО ИМПОРТ ЗОВЁТ ИМЕННО ЭТО ПРАВИЛО — в исходнике, а не в замере: вернуть выражение обратно в
     обработчик значит снова отнять у проверки её предмет. */
  chk('импорт собирает параметры этим же правилом',
      /const mp = paramsFromFile\(md\.params\);/.test(src) &&
      /function paramsFromFile\(raw\)\{? ?return Object\.assign\(defaultBoxParams\(\), paramsWithoutHoles\(/.test(src));
  /* Запаска после этого — последний рубеж, а не рабочий путь; числа её всё равно закреплены, потому
     что читатель кода видит именно их. */
  const cut = k => { const q = Object.assign({}, defaultBoxParams()); delete q[k]; return q; };
  chk('без ключа зазор всё равно 0.35', Math.abs(pipGapOf(cut('pipGap')) - 0.35) < 1e-9, pipGapOf(cut('pipGap')));
  chk('и заказанный зазор без ключа — тоже 0.35', pipGapAsked(cut('pipGap')) === 0.35, pipGapAsked(cut('pipGap')));
}

console.log('\n=== зазор подвижности: одна ручка, одно умолчание, два потолка ===');
{
  const P = ov => Object.assign(defaultBoxParams(), {gfBaseplate:false}, ov);
  /* УМОЛЧАНИЕ ОДНО НА ВСЕХ ПОТРЕБИТЕЛЕЙ. Проверяется по СЧИТАННОМУ числу, а не по строке кода:
     картодержатель брал 0.30, и увидеть это можно было только сравнив его с петлёй. */
  const p0 = P({});
  chk('петля и карман считают один зазор', Math.abs(pipGapOf(p0) - cardSpec(p0).gap) < 1e-9,
      {петля:pipGapOf(p0), карман:cardSpec(p0).gap});
  const pn = P({}); delete pn.pipGap;
  chk('и без ключа тоже один', Math.abs(pipGapOf(pn) - cardSpec(pn).gap) < 1e-9,
      {петля:pipGapOf(pn), карман:cardSpec(pn).gap});
  chk('и это ровно панельные 0.35', Math.abs(cardSpec(pn).gap - 0.35) < 1e-9, cardSpec(pn).gap);
  /* ПОТОЛКА ДВА, И ОНИ РАЗНЫЕ — иначе правка свелась бы к «сделать одинаково» и отняла бы у шаровой
     посадки её люфт. Разводит их только поправка посадки: панель выше 0.8 не даёт. */
  const wide = P({fitTune:0.5, pipGap:0.8});
  chk('петле поправка не даёт перейти 0.8', Math.abs(pipGapOf(wide) - PIP_GAP_HI) < 1e-9, pipGapOf(wide));
  chk('а скользящей посадке — 1.2', Math.abs(pipGapOf(wide, JOINT_GAP_HI) - JOINT_GAP_HI) < 1e-9,
      pipGapOf(wide, JOINT_GAP_HI));
  chk('и карман берёт именно шарнирный потолок', Math.abs(cardSpec(wide).gap - JOINT_GAP_HI) < 1e-9, cardSpec(wide).gap);
  chk('потолки не совпали', PIP_GAP_HI < JOINT_GAP_HI, [PIP_GAP_HI, JOINT_GAP_HI]);
  /* ПОЛ ОБЩИЙ — 0.15, панельный минимум: ниже него зазор не печатается ни в каком соединении. */
  const tight = P({fitTune:-0.3, pipGap:0.15});
  chk('пол один на оба потолка',
      Math.abs(pipGapOf(tight) - PIP_GAP_LO) < 1e-9 && Math.abs(pipGapOf(tight, JOINT_GAP_HI) - PIP_GAP_LO) < 1e-9,
      [pipGapOf(tight), pipGapOf(tight, JOINT_GAP_HI)]);
  /* ЧТО ПОТОЛОК ЗАДАЁТ ВЫЗЫВАЮЩИЙ, А НЕ ВТОРОЕ ВЫРАЖЕНИЕ РЯДОМ: ноль и отсутствие довода значат
     «петля», а не «без потолка». */
  chk('без довода потолок петельный', pipGapOf(wide, 0) === pipGapOf(wide) && pipGapOf(wide) === PIP_GAP_HI);
  /* ЧЕТЫРЁХ ЗАПИСЕЙ БОЛЬШЕ НЕТ — в исходнике, а не в замере: рядом с ручкой не осталось ни одного
     ручного зажима, и завести новый молча уже нельзя. */
  const handmade = src.match(/Math\.(?:max|min)\([^;\n]*p\.pipGap[^;\n]*\)/g) || [];
  chk('ручных зажимов зазора в файле нет', handmade.length === 0, handmade.slice(0, 3));
  /* И СТРОКА ПАНЕЛИ ЧИТАЕТ ТЕ ЖЕ КОНСТАНТЫ — иначе умолчаний снова станет два. */
  chk('строка панели стоит на общих числах',
      /key:'pipGap'[^}]*min:PIP_GAP_LO, max:PIP_GAP_HI[^}]*default:PIP_GAP_DEF/.test(src));
  chk('и они и есть панельные значения',
      panel.get('pipGap').min === PIP_GAP_LO && panel.get('pipGap').max === PIP_GAP_HI &&
      panel.get('pipGap').default === PIP_GAP_DEF,
      [panel.get('pipGap').min, panel.get('pipGap').max, panel.get('pipGap').default]);
}

console.log('\n=== расхождения названы поимённо, а не сосчитаны ===');
{
  /* СПИСОК ПЕЧАТАЕТСЯ ЦЕЛИКОМ. Счёт без имён — это обещание разобраться когда-нибудь: следующему
     придётся заново писать замер, чтобы узнать, о чём шла речь. */
  const byKey = {};
  for (const f of bad) (byKey[f.key] = byKey[f.key] || []).push(f);
  const keys = Object.keys(byKey).sort();
  for (const k of keys)
    console.log('        ' + k + ' — панель ' + JSON.stringify(panel.get(k).default) + ', в коде ' +
      byKey[k].map(f => JSON.stringify(f.def) + ' (' + f.fn + ')').join(', '));
  chk('у расхождений есть имена и адреса', keys.length === 0 || keys.every(k => byKey[k].every(f => f.fn && f.fn.length > 1)));
  chk('ручек с расхождением не больше двадцати (' + keys.length + ')', keys.length <= 20, keys);
}

console.log('\n=== TOTAL:', pass, 'passed,', fail, 'failed ===');
if (fail) process.exitCode = 1;
