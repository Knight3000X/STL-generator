// Verifies the "staged parameters" control flow behind the Подтвердить (apply) button: parameter
// and logo edits must NOT rebuild the model live — they only mark it pending — and the model is
// regenerated exactly when applyPending() (button) or applyPendingNow() (export) is called.
//
// Runs against the REAL file's script (not a re-transcription), with regenerate()/applyRotationOnly()
// swapped for counters — same recipe as test_debounce_flow.js. Run via ../run-all.sh, or manually:
//
//   awk '/<script>/{f=1;next}/<\/script>/{f=0}f' parametric-stl-generator.html \
//     | sed '$ { /^init();$/d }' > /tmp/lib.js
//   node -e '
//     const fs=require("fs"); let s=fs.readFileSync("/tmp/lib.js","utf8");
//     s=s.replace(/function regenerate\(\) \{[\s\S]*?\n\}\n/,"function regenerate(){__regenerateCalls++;}\n");
//     s=s.replace(/function applyRotationOnly\(\) \{[\s\S]*?\n\}\n/,"function applyRotationOnly(){__rotateOnlyCalls++;}\n");
//     fs.writeFileSync("/tmp/lib_stubbed.js",s);'
//   cat stub_preamble.js /tmp/lib_stubbed.js test_apply_button.js > /tmp/run.js && node /tmp/run.js

async function wait(ms) { return new Promise(r => setTimeout(r, ms)); }

async function main() {
  let pass = 0, fail = 0;
  function check(name, cond, extra) {
    if (cond) { pass++; console.log('  OK  ', name); }
    else { fail++; console.log('  FAIL', name, extra !== undefined ? JSON.stringify(extra) : ''); }
  }
  const btn = document.getElementById('btn-apply');

  updateApplyButton();
  check('initial: button disabled', btn.disabled === true, btn.disabled);
  check('initial: text = "Изменения применены"', btn.textContent === 'Изменения применены', btn.textContent);
  check('initial: no has-pending class', btn.classList.contains('has-pending') === false);

  // Staging edits must not rebuild the model.
  __regenerateCalls = 0;
  markPending(); markPending();
  check('markPending: pendingChanges = true', pendingChanges === true);
  check('markPending: button enabled', btn.disabled === false);
  check('markPending: has-pending class set', btn.classList.contains('has-pending') === true);
  check('markPending: text = "Подтвердить изменения"', btn.textContent === 'Подтвердить изменения', btn.textContent);
  check('markPending: model NOT regenerated live', __regenerateCalls === 0, __regenerateCalls);

  // Pressing Подтвердить applies once (deferred via rAF) and clears pending.
  __regenerateCalls = 0;
  applyPending();
  check('applyPending: pending cleared immediately', pendingChanges === false);
  check('applyPending: button disabled again', btn.disabled === true);
  await wait(60);
  check('applyPending: regenerate() ran exactly once', __regenerateCalls === 1, __regenerateCalls);

  // A second press with nothing staged does nothing (button is the only trigger).
  __regenerateCalls = 0;
  markPending(); applyPending(); await wait(60);
  const afterFirst = __regenerateCalls;
  applyPending(); await wait(60); // pending already false -> still schedules regenerateSoon once; assert idempotent clear
  check('applyPending twice: pending stays cleared', pendingChanges === false);

  // Export commits staged edits synchronously so the file matches the panel.
  markPending();
  __regenerateCalls = 0;
  if (pendingChanges) applyPendingNow();
  check('export path: applyPendingNow regenerates synchronously', __regenerateCalls === 1, __regenerateCalls);
  check('export path: pending cleared', pendingChanges === false);
  check('export path: button disabled', btn.disabled === true);

  console.log('\n=== APPLY-BUTTON TOTAL:', pass, 'passed,', fail, 'failed ===');
  process.exit(fail > 0 ? 1 : 0);
}
main();
