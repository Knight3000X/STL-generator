// Minimal DOM/requestAnimationFrame stubs so test_debounce_flow.js can exercise the real
// file's regenerateSoon/rotateOnlySoon/flushPendingRegenerate control flow under plain
// Node.js (which has neither). Prepended before the (stubbed) library code — see
// run-all.sh or test_debounce_flow.js's own header for the full run recipe.
global.requestAnimationFrame = (cb) => setTimeout(cb, 16);
const fakeStyle = {};
const fakeEl = { style: fakeStyle, textContent: '', className: '' };
global.document = { getElementById: (id) => fakeEl, querySelectorAll: () => [], addEventListener: () => {} };
global.window = global;
global.alert = () => {};
let __regenerateCalls = 0, __rotateOnlyCalls = 0;
