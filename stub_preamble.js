// Minimal DOM/requestAnimationFrame stubs so test_debounce_flow.js can exercise the real
// file's regenerateSoon/rotateOnlySoon/flushPendingRegenerate control flow under plain
// Node.js (which has neither). Prepended before the (stubbed) library code — see
// run-all.sh or test_debounce_flow.js's own header for the full run recipe.
global.requestAnimationFrame = (cb) => setTimeout(cb, 16);
const fakeStyle = {};
// classList/disabled are used by the "Подтвердить" (apply-button) control flow; a single shared
// element is fine for these tests since each only inspects one button.
const __clsSet = new Set();
const fakeEl = { style: fakeStyle, textContent: '', className: '', disabled: false, classList: {
  add: (c) => __clsSet.add(c), remove: (c) => __clsSet.delete(c), contains: (c) => __clsSet.has(c),
  toggle: (c, on) => (on === undefined ? (__clsSet.has(c) ? __clsSet.delete(c) : __clsSet.add(c)) : (on ? __clsSet.add(c) : __clsSet.delete(c))) } };
global.document = { getElementById: (id) => fakeEl, querySelectorAll: () => [], addEventListener: () => {} };
global.window = global;
global.alert = () => {};
let __regenerateCalls = 0, __rotateOnlyCalls = 0;
