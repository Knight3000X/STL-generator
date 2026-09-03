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
   ссылка на то же самое число. Значение берётся у живого кода, а не выводится из текста.
   ЧИТАЕТСЯ И `PANEL_DEF.knob` (v25.38.0) — та самая ссылка на строку панели, которой заменены
   шестьдесят разошедшихся запасок. Не читай замер этой формы, свод выглядел бы как ИСЧЕЗНОВЕНИЕ мест:
   было 953 запаски, стало бы 900, и перепись перестала бы подтверждать, что они читают панель. */
function constVal(name){
  if (!/^[A-Z][A-Z0-9_]*(\.[A-Za-z_$][A-Za-z0-9_$]*)?$/.test(name)) return undefined;
  try { const v = eval(name); return (typeof v === 'number' || typeof v === 'string' || typeof v === 'boolean') ? v : undefined; }
  catch (e) { return undefined; }
}
function readVal(T, k){                       // литерал (можно со знаком) или именованная константа
  let sign = 1, j = k;
  if (T[j] && T[j].t === 'punct' && (T[j].v === '-' || T[j].v === '+')){ if (T[j].v === '-') sign = -1; j++; }
  if (isLit(T, j)){ const v = litVal(T, j); return {v: typeof v === 'number' ? sign*v : v, next: j+1, named: false}; }
  if (T[j] && T[j].t === 'name'){
    if (T[j+1] && T[j+1].v === '.' && T[j+2] && T[j+2].t === 'name'){      // `PANEL_DEF.knob`
      const v = constVal(T[j].v + '.' + T[j+2].v);
      if (v !== undefined) return {v: typeof v === 'number' ? sign*v : v, next: j+3, named: true};
    }
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
/* ЧТЕНИЕ ЧЕРЕЗ `knobOf` — ТОЖЕ ЧТЕНИЕ, и перепись обязана его видеть (v25.39.0). Ключ там строкой
   (`knobOf(p, 'gearTeeth')`), а не `p.gearTeeth`, — значит разбор выражений мимо него проходит, и
   свод 79 мест на это правило выглядел бы как их ИСЧЕЗНОВЕНИЕ: было 905 запасок, стало бы 798, и
   числа переписи потеряли бы смысл. Такие места считаются наравне с прочими и всегда согласны с
   панелью по построению — правило берёт умолчание и пределы из её же строки. */
const VIA_KNOBOF = [];
for (const m of src.matchAll(/knobOf\(\s*p\s*,\s*'(\w+)'\s*\)/g)){
  if (!panel.has(m[1])) continue;
  const f = {key:m[1], def:panel.get(m[1]).default, at:m.index, form:'knobOf', guard:'null', named:true, fn:owner(m.index)};
  VIA_KNOBOF.push(f); found.push(f);
}

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
/* ЗАПАСКА, РАВНАЯ ПЕРВОМУ ПОДРЕЖИМУ СЕМЬИ, — НЕ КОПИЯ УМОЛЧАНИЯ, и это единственное законное
   исключение (v25.38.0). У ручки-переключателя семьи панельное умолчание значит «семьи нет вовсе»
   ('none'), а места с такой запаской работают только когда семья УЖЕ включена: подставить туда 'none'
   значило бы сказать «строим то, чего нет». Значение берётся НЕ С МОИХ СЛОВ, а из реестра семей —
   `FAMILIES[].act` — того самого, чем семья включается. Скажи я «cleat законен», проверка молчала бы
   и о любом другом слове на его месте. */
const FAMILY_ACT = {};
for (const f of FAMILIES) for (const k in (f.act || {})) FAMILY_ACT[k] = f.act[k];
const auto = [], copies = [], bad = [], famAct = [];
for (const f of found){
  const row = panel.get(f.key), d = row.default;
  if (panelCanFire(f.guard, row)){ auto.push(f); continue; }
  /* ТОЛЬКО ВКЛЮЧЕНИЕ СЕМЬИ, И НИЧЕГО КРОМЕ. `p.pipMode || 'none'` — это ВОПРОС «включена ли семья»,
     и там 'none' совпадает с панелью, то есть расхождения нет вовсе (таких мест 23). А `|| 'cleat'` —
     это ОТВЕТ подрежимом внутри уже включённой семьи. Первое проходит общим правилом, второе —
     этим исключением; всё остальное на этих ручках остаётся расхождением. */
  if (FAMILY_ACT[f.key] !== undefined && FAMILY_ACT[f.key] === f.def && d !== f.def){ famAct.push(f); continue; }
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
  /* «АВТО» стало ВЧЕТВЕРО МЕНЬШЕ (было >100, стало 57) — и это не потеря зрения, а свод: в
     v25.42.0 сто семьдесят одно чтение вида `cl(p.ключ, min, max, default)` ушло в `knobOf`, а у
     него запаска стоит на `null`, то есть в «авто» она не попадает по построению. Число закреплено
     снизу, чтобы машинка не могла ослепнуть молча. */
  chk('и разложены на «авто» и вторые копии', auto.length > 40 && copies.length > 500,
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
  /* СЛЕПОТЫ ПРО ПОМОЩНИКА БОЛЬШЕ НЕТ — не потому, что замер научился её читать, а потому, что
     читать стало нечего (v25.42.0). Помощник `cl(v, lo, hi, d)` был объявлен внутри ДЕВЯТНАДЦАТИ
     разных функций, и сто семьдесят один его вызов передавал пределы и умолчание СВОЕЙ СТРОКИ
     ПАНЕЛИ — то есть был `knobOf`, написанным от руки. Они сведены; осталось одно имя `clampNum` и
     семь вызовов, у которых предел вычисляется на месте. Проверяется ровно это: ни одного вызова
     формы «ручка, min, max, умолчание» в файле не осталось, иначе умолчание снова жило бы в двух
     местах и замер его снова бы не видел. */
  chk('помощник объявлен ОДИН раз, а не в каждой функции',
      (src.match(/const cl_? = \(v, lo, hi, d\) => \{/g) || []).length === 0 &&
      (src.match(/function clampNum\(v, lo, hi, d\)/g) || []).length === 1,
      {местных:(src.match(/const cl_? = \(v, lo, hi, d\) => \{/g) || []).length});
  const handMade = [...src.matchAll(/\bclampNum\(\s*p\.(\w+)\s*,\s*-?[\d.]+\s*,\s*-?[\d.]+\s*,\s*-?[\d.]+\s*\)/g)].map(m => m[1]);
  chk('и ни одного вызова «ручка, min, max, умолчание» — такие ушли в `knobOf` (' + handMade.length + ')',
      handMade.length === 0, handMade.slice(0, 6));
  chk('  а вызовы с вычисляемым пределом остались и их немного',
      (src.match(/\bclampNum\(/g) || []).length <= 8, (src.match(/\bclampNum\(/g) || []).length);
}

console.log('\n=== перепись: сколько умолчаний написано дважды ===');
{
  /* ЧИСЛА ЗАКРЕПЛЕНЫ, А НЕ ОБЪЯВЛЕНЫ ОКОНЧАТЕЛЬНЫМИ. Было 60 на v25.36.0 (первый честный замер;
     прежние «61» получены негодным регулярным выражением и объявлены неподтверждёнными), стало НОЛЬ
     на v25.38.0: разобраны все девятнадцать ручек, и запаска каждой ссылается на строку панели.
     Двигаться число может только вниз, а ноль — только остаться нулём. */
  const MAX_BAD = 0;
  chk('расхождений не прибыло (' + bad.length + ' ≤ ' + MAX_BAD + ')', bad.length <= MAX_BAD,
      bad.slice(0, 8).map(f => f.key + ': панель ' + JSON.stringify(panel.get(f.key).default) +
                               ' против ' + JSON.stringify(f.def) + ' в ' + f.fn));
  chk('и перепись не опустела (' + copies.length + ' вторых копий)', copies.length > 650, copies.length);
  /* ЗАЗОР ПОДВИЖНОСТИ ИЗ ПЕРЕПИСИ УШЁЛ ВОВСЕ. Четыре записи сведены к одной, и та ссылается на общее
     число, а не пишет его заново. */
  chk('у зазора петли расхождений нет', bad.every(f => f.key !== 'pipGap'),
      bad.filter(f => f.key === 'pipGap'));
  const gapForms = found.filter(f => f.key === 'pipGap');
  chk('и запаска у него ровно одна, ссылкой на общее число',
      gapForms.length === 1 && gapForms[0].named === true && gapForms[0].def === panel.get('pipGap').default,
      gapForms.map(f => ({где:f.fn, что:f.def, ссылка:f.named})));
  chk('именованных ссылок вместо чисел — не меньше одной', named.length >= 1, named.length);
  /* ССЫЛКА НА ПАНЕЛЬ — ЭТО НЕ ИСЧЕЗНОВЕНИЕ МЕСТА. Свод шестидесяти расхождений заменил числа на
     `PANEL_DEF.knob`; не умей замер читать эту форму, места просто выпали бы из переписи, и ноль выше
     означал бы «перестали видеть», а не «сошлось». */
  const viaPanel = copies.filter(f => f.named && panel.get(f.key).default === f.def);
  chk('запаски, ссылающиеся на строку панели, перепись ВИДИТ (' + viaPanel.length + ')',
      viaPanel.length >= 100, viaPanel.length);
  chk('  из них через `knobOf` — ' + VIA_KNOBOF.length,
      VIA_KNOBOF.length >= 75 && VIA_KNOBOF.every(f => copies.indexOf(f) >= 0), VIA_KNOBOF.length);
  chk('  и каждая отдаёт ровно панельное число',
      viaPanel.every(f => f.def === panel.get(f.key).default));
}

console.log('\n=== единственное исключение: запаска = первый подрежим семьи ===');
{
  /* Восемь мест на двух ручках — переключатели семей органайзера и корпуса. Проверяется не то, что их
     восемь, а то, ЧЕМ они оправданы: значение обязано совпасть с `act` своей семьи и НЕ совпасть с
     панельным умолчанием — иначе исключение стало бы дырой, через которую пройдёт любое число. */
  chk('реестр семей прочитан', Object.keys(FAMILY_ACT).length > 10, Object.keys(FAMILY_ACT).length);
  chk('и в нём есть обе ручки-переключателя',
      FAMILY_ACT.woBack === 'cleat' && FAMILY_ACT.pbPart === 'tray',
      {woBack:FAMILY_ACT.woBack, pbPart:FAMILY_ACT.pbPart});
  /* Мест стало ДВА вместо восьми (v25.42.0): `p.woBack || 'cleat'` стояло пятью копиями, а
     `p.pbPart || 'tray'` — тремя; теперь у каждого одно имя, и исключение прикрывает ровно два
     места — по одному на ручку. Само оправдание не изменилось. */
  chk('исключений ровно столько, сколько мест (' + famAct.length + ')', famAct.length === 2, famAct.length);
  chk('  и каждое — включение своей семьи, а не умолчание панели',
      famAct.every(f => f.def === FAMILY_ACT[f.key] && f.def !== panel.get(f.key).default),
      famAct.map(f => f.key + '=' + JSON.stringify(f.def) + ' в ' + f.fn));
  chk('  панель при этом говорит «семьи нет»',
      famAct.every(f => panel.get(f.key).default === 'none'),
      [...new Set(famAct.map(f => f.key + ':' + panel.get(f.key).default))]);
  /* И ЧТО ИСКЛЮЧЕНИЕ НЕ ПУСКАЕТ ЧУЖОГО: слово, которого нет в реестре семей, обязано остаться
     расхождением. Проверяется на подложенном месте, а не рассуждением. */
  const probe = scan(tokenize("function buildX(p){ const q = p.woBack || 'hexshelf'; }"), () => 'проба');
  chk('чужое слово на месте включения семьи исключением не станет',
      probe.length === 1 && probe[0].def === 'hexshelf' && FAMILY_ACT.woBack !== 'hexshelf', probe);
}

console.log('\n=== умолчание живёт в одном месте, и оно — строка панели ===');
{
  chk('`PANEL_DEF` собран из строк панели и полон',
      Object.keys(PANEL_DEF).length === SHAPE_PARAMS.box.length &&
      SHAPE_PARAMS.box.every(r => PANEL_DEF[r.key] === r.default),
      Object.keys(PANEL_DEF).length);
  /* Набор по умолчанию обязан быть КОПИЕЙ, а не самой таблицей: его потом правят ручками. */
  const a = defaultBoxParams(), b = defaultBoxParams();
  a.width = 1234;
  chk('`defaultBoxParams()` отдаёт свежую копию', b.width !== 1234 && PANEL_DEF.width !== 1234,
      {b:b.width, def:PANEL_DEF.width});
  chk('  и она равна панели ключ в ключ',
      Object.keys(b).length === Object.keys(PANEL_DEF).length &&
      Object.keys(b).every(k => b[k] === PANEL_DEF[k]));
  /* НАБОР РУЧЕК СЕТКИ — ОДНО ПРАВИЛО. Проверяется в исходнике: собранный вручную объект из бандла не
     виден, а именно он и был шестью копиями. */
  const inline = (src.match(/rib\s*:\s*Math\.max\(0\.1\s*,\s*(?:p\.latticeRib|knobOf\(\s*p\s*,\s*'latticeRib')/g) || []);
  chk('сетка собирается одним правилом, а не шестью копиями (' + inline.length + ')',
      inline.length === 1, inline);
  chk('  и правило это зовут все её пути',
      (src.match(/latticeOptsOf\(p/g) || []).length >= 6, (src.match(/latticeOptsOf\(p/g) || []).length);
  chk('  а детализация — второе правило, с панельным зажимом',
      typeof latticeResOf === 'function' &&
      latticeResOf({latticeRes:1}) === 10 && latticeResOf({latticeRes:9999}) === 500 &&
      latticeResOf({}) === PANEL_DEF.latticeRes,
      [latticeResOf({latticeRes:1}), latticeResOf({latticeRes:9999}), latticeResOf({})]);
  /* И ЧТО ОДНО ПРАВИЛО ОТДАЁТ ТО ЖЕ, ЧТО ОТДАВАЛИ ШЕСТЬ: числа панели, а не свои. */
  const o = latticeOptsOf(defaultBoxParams());
  chk('  и отдаёт панельные числа',
      o.rib === PANEL_DEF.latticeRib && o.cell === PANEL_DEF.latticeCell &&
      o.borderCells === PANEL_DEF.latticeBorder && o.pattern === PANEL_DEF.latticePattern &&
      o.res === PANEL_DEF.latticeRes, o);
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

console.log('\n=== ручка, прочитанная по своей же строке ===');
{
  /* `knobOf` — второе правило этой работы (v25.39.0): пределы и умолчание ручки записаны в её строке,
     и построители переписывали их у себя. Проверяется не «оно работает», а что оно ТО ЖЕ САМОЕ, что
     панель делает с введённым числом: иначе у одного вопроса снова стало бы два ответа. */
  const KN = ['keySizeU','keyWall','keyPlate','gearTeeth','gearPA','planetN','gfX','sheetTexH','woShelfD','mntW'];
  for (const k of KN){
    const r = panel.get(k);
    const vals = [undefined, null, '', r.min, r.default, r.max, r.min - 5, r.max + 100, (r.min + r.max)/2 + 0.37];
    let bad = null;
    for (const v of vals){
      const q = defaultBoxParams(); if (v === undefined) delete q[k]; else q[k] = v;
      const got = knobOf(q, k);
      const want = clampParam(r, (v === undefined || v === null || v === '') ? r.default : +v);
      if (!(Math.abs(got - want) < 1e-12)) bad = {ручка:k, дано:v, получено:got, ждали:want};
    }
    chk(k + ': то же, что панель делает с введённым числом', bad === null, bad);
  }
  chk('без ключа отдаётся умолчание строки', KN.every(k => {
    const q = defaultBoxParams(); delete q[k]; return knobOf(q, k) === panel.get(k).default; }));
  chk('за пределы строки не выпускает', KN.every(k => {
    const r = panel.get(k), q = defaultBoxParams();
    q[k] = r.max * 10; const hi = knobOf(q, k);
    q[k] = r.min - 1000; const lo = knobOf(q, k);
    return hi === r.max && lo === r.min; }));
  /* И ЧТО ЭТО ИМЕННО ПАНЕЛЬНОЕ ПРАВИЛО, а не похожее: `knobOf` обязан стоять на `clampParam`. */
  /* Ищется `clampParam` ВНУТРИ самого `knobOf` — до начала следующей функции, а не в пределах
     скольких-то знаков: счёт знаков ломался от одного добавленного примечания. */
  chk('правило одно с панельным',
      /function knobOf\(p, key\)\{(?:(?!\nfunction )[\s\S])*?clampParam\(r,/.test(src));
  /* СПИСОК И ФЛАЖОК — ТОЖЕ СТРОКИ ПАНЕЛИ (v25.41.0). До этой сборки `knobOf` умел только числовые:
     у списка нет ни `min`, ни `max`, а `clampParam` на такой строке вернул бы NaN — то есть правило
     МОЛЧА ломалось бы, а не отказывалось. Умолчания списков были поэтому выписаны руками
     (`p.woFront || 'hook'`), и каждое такое написание — второй адрес одного числа. Теперь строка
     отвечает сама; проверяется это на всех списках и флажках панели разом, а не на выбранных. */
  const PICKS = SHAPE_PARAMS.box.filter(r => r.type === 'select' || r.type === 'bool');
  chk('списков и флажков в панели больше сотни', PICKS.length > 100, PICKS.length);
  chk('пустое значение списка и флажка — умолчание СТРОКИ, а не NaN',
      PICKS.every(r => [undefined, null, ''].every(v => {
        const q = {}; if (v !== undefined) q[r.key] = v;
        return knobOf(q, r.key) === r.default; })),
      PICKS.filter(r => knobOf({}, r.key) !== r.default).map(r => r.key).slice(0, 5));
  chk('заданное значение списка отдаётся как есть',
      PICKS.filter(r => r.type === 'select').every(r => {
        const v = (r.options || []).length ? r.options[r.options.length - 1].v : r.default;
        const q = {}; q[r.key] = v; return knobOf(q, r.key) === v; }));
  /* ФЛАЖОК — ОТДЕЛЬНО, и это не придирка: `p.flag || false` при ЛЮБОМ написании сводит `false` к
     умолчанию, и флажок, снятый пользователем, читался бы как «умолчание». У `knobOf` `false` — ответ. */
  chk('снятый флажок остаётся снятым даже при умолчании «включено»',
      PICKS.filter(r => r.type === 'bool').every(r => knobOf({[r.key]: false}, r.key) === false));
  chk('и поднятый — поднятым',
      PICKS.filter(r => r.type === 'bool').every(r => knobOf({[r.key]: true}, r.key) === true));
  /* И ГЛАВНОЕ ПРО СВОД v25.42.0: `knobOf` — ЭТО РОВНО ТОТ ЖЕ ЗАЖИМ, что писали от руки. Сто
     семьдесят один вызов вида `clampNum(p.ключ, min, max, default)` заменён на `knobOf(p, 'ключ')`,
     и замер показал, что все три числа в каждом из них совпадали со строкой панели. Здесь это
     проверяется НЕ на замере, а поведением, и не на тех ста семидесяти одной, а на ВСЕХ числовых
     строках панели разом: для каждой берутся значения, которые ползунок правда выдаёт (края, шаг от
     края, умолчание, середина по шагу), и пустые. Пока это сходится, замена неотличима — а разойдись
     она, ноль ниже не спасёт, потому что здесь спрашивается не текст, а ответ. */
  const NUMS = SHAPE_PARAMS.box.filter(r => !r.type);
  let mismatch = null, checked = 0;
  for (const r of NUMS){
    const step = r.step > 0 ? r.step : 1;
    const mid = r.min + Math.round((r.max - r.min)/2/step)*step;
    for (const v of [undefined, null, r.min, r.min + step, r.default, mid, r.max - step, r.max]){
      if (typeof v === 'number' && (v < r.min || v > r.max)) continue;
      const q = {}; if (v !== undefined) q[r.key] = v;
      const got = knobOf(q, r.key);
      const want = clampNum(v === undefined ? null : v, r.min, r.max, r.default);
      checked++;
      if (!(Math.abs(got - want) < 1e-9) && !mismatch) mismatch = {ручка:r.key, дано:v, knobOf:got, помощник:want};
    }
  }
  chk('строк проверено на всём, что даёт ползунок (' + NUMS.length + ' строк, ' + checked + ' значений)',
      NUMS.length > 700 && checked > 5000, {строк:NUMS.length, значений:checked});
  chk('`knobOf` отвечает то же, что писавшийся от руки зажим с теми же тремя числами',
      mismatch === null, mismatch);
  /* И ЧТО ПРОВЕРКА ВЫШЕ НЕ ПУСТАЯ: подмени у помощника предел — и она обязана упасть. Спрашивается
     тот же `clampNum`, которым пользуется приложение, а не переписанный здесь заново. */
  chk('  и сама эта проверка различает разные пределы',
      clampNum(5, 0, 3, 1) !== clampNum(5, 0, 9, 1), [clampNum(5, 0, 3, 1), clampNum(5, 0, 9, 1)]);
  /* ОДНО РАСХОЖДЕНИЕ ЕСТЬ, И ОНО НАЗВАНО ВСЛУХ: ПУСТАЯ СТРОКА. Написанный от руки помощник читал её
     как НОЛЬ (`+'' === 0`) и зажимал до нижнего предела; `knobOf` читает её как «не задано» и отдаёт
     умолчание строки — ровно так же, как панель читает очищенное поле. Из сводимых замена меняет
     ответ только здесь, и меняет в правильную сторону: ширина очищенного поля — сорок, а не одна
     десятая. Проверка стоит именно для того, чтобы разница осталась названной, а не забытой. */
  const wRow = panel.get('width');
  chk('пустое поле: `knobOf` отдаёт умолчание строки, а прежний помощник отдавал нижний предел',
      knobOf({width:''}, 'width') === wRow.default && clampNum('', wRow.min, wRow.max, wRow.default) === wRow.min,
      {knobOf:knobOf({width:''}, 'width'), помощник:clampNum('', wRow.min, wRow.max, wRow.default)});
  /* ПОСТРОИТЕЛЬ И СПЕЦИФИКАЦИЯ ОТВЕЧАЮТ ОДНО И ТО ЖЕ — на тех семьях, где копии и стояли. Спрашивается
     поведение, а не текст: текст проверяет перепись копий в `test_saidbuilt.js`. */
  const P2 = ov => Object.assign(defaultBoxParams(), {gfBaseplate:false}, ov);
  const kc = P2({keycapMode:'single', keySizeU:2.75, keyWall:2.4, keyPlate:3.1});
  chk('кейкап: посадка и стабилизатор считают одну ширину стенки',
      keycapFitSpec(kc).wall === knobOf(kc, 'keyWall'), [keycapFitSpec(kc).wall, knobOf(kc, 'keyWall')]);
  chk('  и один размер в юнитах',
      keycapFitSpec(kc).u === keycapStabSpec(kc).u && keycapStabSpec(kc).u === knobOf(kc, 'keySizeU'));
  const gf = P2({gfBaseplate:true, gfX:12, gfY:2});
  chk('плита: спецификация не обещает больше, чем даёт ползунок',
      baseplateSpec(gf).n === panel.get('gfX').max && baseplateSpec(gf).gridCut === true,
      {n:baseplateSpec(gf).n, предел:panel.get('gfX').max});
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
