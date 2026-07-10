// Verifies the debounce / busy-indicator / generation-token control flow added for the
// "editor freezes at high logo detail" fix — the part that CAN'T be checked by
// test_logo_zone.js, since that only exercises the pure geometry functions.
//
// This has to run against the REAL file's actual script (not a re-transcription) because the
// whole point is to catch bugs in the wiring itself, and needs stub_preamble.js (DOM/rAF
// stubs) plus regenerate()/applyRotationOnly() swapped for counters. Run via ../run-all.sh,
// which handles all of this automatically, or manually:
//
//   awk '/<script>/{f=1;next}/<\/script>/{f=0}f' ../parametric-stl-generator.html \
//     | sed '$ { /^init();$/d }' > /tmp/lib.js
//   node -e '
//     const fs=require("fs");
//     let s=fs.readFileSync("/tmp/lib.js","utf8");
//     s=s.replace(/function regenerate\(\) \{[\s\S]*?\n\}\n/,"function regenerate(){__regenerateCalls++;}\n");
//     s=s.replace(/function applyRotationOnly\(\) \{[\s\S]*?\n\}\n/,"function applyRotationOnly(){__rotateOnlyCalls++;}\n");
//     fs.writeFileSync("/tmp/lib_stubbed.js",s);
//   '
//   cat stub_preamble.js /tmp/lib_stubbed.js test_debounce_flow.js > /tmp/run.js && node /tmp/run.js

async function wait(ms) { return new Promise(r => setTimeout(r, ms)); }

async function main() {
  let pass = 0, fail = 0;
  function check(name, cond, extra) {
    if (cond) { pass++; console.log('  OK  ', name); }
    else { fail++; console.log('  FAIL', name, extra!==undefined?JSON.stringify(extra):''); }
  }

  __regenerateCalls = 0;
  for (let i = 0; i < 10; i++) { regenerateDebounced(); await wait(10); }
  await wait(400);
  check('10 rapid debounced calls -> exactly 1 regenerate()', __regenerateCalls === 1, __regenerateCalls);

  __regenerateCalls = 0;
  regenerateDebounced(); await wait(300);
  regenerateDebounced(); await wait(300);
  check('2 well-spaced debounced calls -> 2 regenerate() calls', __regenerateCalls === 2, __regenerateCalls);

  __regenerateCalls = 0;
  regenerateSoon();
  regenerateSoon();
  await wait(200);
  check('2 back-to-back regenerateSoon() -> exactly 1 actual regenerate() (stale skipped)', __regenerateCalls === 1, __regenerateCalls);

  fakeStyle.display = 'none';
  regenerateSoon();
  check('busy indicator shown synchronously on regenerateSoon()', fakeStyle.display === 'flex', fakeStyle.display);
  await wait(200);
  check('busy indicator hidden after regenerate() completes', fakeStyle.display === 'none', fakeStyle.display);

  __regenerateCalls = 0;
  regenerateDebounced();
  flushPendingRegenerate();
  check('flushPendingRegenerate runs regenerate() synchronously', __regenerateCalls === 1, __regenerateCalls);
  await wait(400);
  check('the flushed debounced call does not ALSO fire later', __regenerateCalls === 1, __regenerateCalls);

  __regenerateCalls = 0; __rotateOnlyCalls = 0;
  rotateOnlyDebounced(); await wait(300);
  check('rotateOnlyDebounced calls applyRotationOnly, not regenerate', __rotateOnlyCalls === 1 && __regenerateCalls === 0, {rotateOnlyCalls: __rotateOnlyCalls, regenerateCalls: __regenerateCalls});

  __regenerateCalls = 0; __rotateOnlyCalls = 0;
  rotateOnlySoon();
  regenerateSoon();
  await wait(200);
  check('shared generation token: newer regenerateSoon supersedes older rotateOnlySoon', __regenerateCalls === 1 && __rotateOnlyCalls === 0, {rotateOnlyCalls: __rotateOnlyCalls, regenerateCalls: __regenerateCalls});

  console.log('\n=== CONTROL-FLOW TOTAL:', pass, 'passed,', fail, 'failed ===');
  process.exit(fail > 0 ? 1 : 0);
}
main();
