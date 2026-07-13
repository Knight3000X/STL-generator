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
