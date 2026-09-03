// Minimal DOM/requestAnimationFrame stubs so the control-flow tests (debounce, apply-button,
// multi-model) can exercise the real file's wiring under plain Node.js (which has neither).
// Prepended before the (stubbed) library code — see run-all.sh or each test's own header for
// the full run recipe. Elements are persistent per id (getElementById returns the same object
// every time), and createElement/appendChild/innerHTML are tolerated so card-list renderers
// (renderLogoCards / renderModelCards) can run as no-op DOM builders.
global.requestAnimationFrame = (cb) => setTimeout(cb, 16);
function __mkEl() {
  const cls = new Set();
  const el = {
    style: {}, dataset: {}, children: [], textContent: '', className: '', innerHTML: '',
    value: '', checked: false, disabled: false, tagName: 'DIV',
    classList: {
      add: (c) => cls.add(c), remove: (c) => cls.delete(c), contains: (c) => cls.has(c),
      toggle: (c, on) => (on === undefined ? (cls.has(c) ? cls.delete(c) : cls.add(c)) : (on ? cls.add(c) : cls.delete(c))),
    },
    appendChild(child) { el.children.push(child); return child; },
    removeChild(child) { const i = el.children.indexOf(child); if (i >= 0) el.children.splice(i, 1); },
    addEventListener() {}, removeEventListener() {},
    querySelector() { return null; }, querySelectorAll() { return []; },
    closest() { return null; }, click() {}, focus() {},
    getBoundingClientRect() { return { left: 0, top: 0, width: 100, height: 100 }; },
  };
  return el;
}
const __els = new Map();
global.document = {
  getElementById: (id) => { if (!__els.has(id)) __els.set(id, __mkEl()); return __els.get(id); },
  createElement: () => __mkEl(),
  querySelectorAll: () => [], querySelector: () => null,
  addEventListener: () => {},
  body: __mkEl(),
};
global.window = global;
global.alert = () => {};
// Back-compat alias for test_debounce_flow.js: the busy indicator's style object (setBusy target).
const fakeStyle = global.document.getElementById('busy-indicator').style;
let __regenerateCalls = 0, __rotateOnlyCalls = 0;

/* ПРИМЕЧАНИЯ — НЕ ТЕКСТ ПРОГРАММЫ. Проверки, которые СЧИТАЮТ места в исходнике («это выражение
   написано ровно один раз»), обязаны считать код, а не пояснения к нему: пояснение, приводящее
   выражение в пример, попадало в счёт наравне с кодом и давало ложную копию — так в v25.43.0
   `Math.max(15, knobOf(p, 'woShelfD'))`, процитированный в примечании, «совпал» с настоящим местом.
   Помощник живёт ЗДЕСЬ, в общем начале, а не в каждом тесте: иначе он сам стал бы той копией, за
   которой эти проверки и следят. Вместо вырезанного остаются пробелы: длина и переводы строк
   сохраняются, а с ними и все адреса.

   ПЕРВАЯ РЕДАКЦИЯ УМЕЛА СТРОКИ, НО НЕ РЕГУЛЯРКИ, и на этом ломалась: в `replace(/"/g, '&quot;')`
   кавычка внутри РЕГУЛЯРКИ открывала «строку», и дальше по файлу всё разъезжалось — настоящая
   строка `'…xmlns="http://…"'` теряла хвост, потому что её `//` читалось как примечание. Поймано
   это не глазами, а проверкой «вырезанный исходник — всё ещё JS»: она и стоит в `test_saidbuilt.js`.

   РЕГУЛЯРКА ОТ ДЕЛЕНИЯ отличается по ПРЕДЫДУЩЕМУ знаку — тем же правилом, что в разборщике
   `test_defaults.js`: после значения (`)`, `]`, имени, числа, строки) косая черта делит, после
   всего прочего и после слов вроде `return` — начинает регулярку. */
global.__stripComments = (t) => {
  const REGEX_AFTER = "(,=:[!&|?{};+-*%~^<>";
  const REGEX_WORDS = ['return', 'typeof', 'case', 'in', 'of', 'new', 'delete', 'void', 'instanceof', 'do', 'else'];
  let out = '', i = 0, prev = '', word = '';
  const canBeRegex = () => prev === '' || REGEX_AFTER.indexOf(prev) >= 0 || REGEX_WORDS.indexOf(word) >= 0;
  while (i < t.length) {
    const c = t[i], n = t[i + 1];
    if (c === '/' && n === '*') { const e = t.indexOf('*/', i + 2), cut = e < 0 ? t.length : e + 2;
      out += t.slice(i, cut).replace(/[^\n]/g, ' '); i = cut; continue; }
    if (c === '/' && n === '/') { let e = t.indexOf('\n', i); if (e < 0) e = t.length;
      out += ' '.repeat(e - i); i = e; continue; }
    if (c === "'" || c === '"' || c === '`') { let j = i + 1;
      while (j < t.length && t[j] !== c) { if (t[j] === '\\') j++; j++; }
      out += t.slice(i, j + 1); i = j + 1; prev = c; word = ''; continue; }
    if (c === '/' && canBeRegex()) {                       // регулярка целиком, вместе с классами [/]
      let j = i + 1, cls = false, ok = false;
      while (j < t.length) { const d = t[j];
        if (d === '\\') { j += 2; continue; }
        if (d === '\n') break;
        if (d === '[') cls = true; else if (d === ']') cls = false;
        else if (d === '/' && !cls) { ok = true; break; }
        j++; }
      if (ok) { out += t.slice(i, j + 1); i = j + 1; prev = '/'; word = ''; continue; }
    }
    out += c;
    if (/[A-Za-z0-9_$]/.test(c)) word += c; else if (!/\s/.test(c)) word = '';
    if (!/\s/.test(c)) prev = c;
    i++;
  }
  return out;
};
