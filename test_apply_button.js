// Verifies the LIVE / DEFERRED preview control flow (replaced the old "Подтвердить" staged flow):
// while the model is cheap to rebuild (lastRegenMs < REGEN_HEAVY_MS) parameter edits regenerate
// automatically (debounced); once a rebuild is measured heavy, edits only mark the preview stale
// (viewport badge) and the mesh is rebuilt exactly when the badge is tapped (applyPending) or on
// export/save (applyPendingNow, synchronous).
//
// Runs against the REAL file's script with regenerate()/applyRotationOnly() swapped for counters —
// same recipe as test_debounce_flow.js; see run-all.sh.

async function wait(ms) { return new Promise(r => setTimeout(r, ms)); }

async function main() {
  let pass = 0, fail = 0;
  function check(name, cond, extra) {
    if (cond) { pass++; console.log('  OK  ', name); }
    else { fail++; console.log('  FAIL', name, extra !== undefined ? JSON.stringify(extra) : ''); }
  }
  const badge = document.getElementById('stale-badge');

  updateApplyButton();
  check('initial: badge hidden', badge.style.display === 'none', badge.style.display);
  check('initial: preview counts as live (lastRegenMs=0)', previewIsLive() === true);

  // LIVE mode: edits auto-apply (debounced) — a burst regenerates exactly once.
  __regenerateCalls = 0;
  markPending(); markPending(); markPending();
  check('live: pending set immediately', pendingChanges === true);
  check('live: no badge (auto-apply is coming)', badge.style.display === 'none', badge.style.display);
  check('live: not regenerated synchronously', __regenerateCalls === 0, __regenerateCalls);
  await wait(420); // 300ms debounce + 2 rAF (16ms stubs)
  check('live: burst auto-applied exactly once', __regenerateCalls === 1, __regenerateCalls);
  check('live: pending cleared by auto-apply', pendingChanges === false);

  // HEAVY mode: a slow rebuild switches edits to stale-badge-only.
  lastRegenMs = 5000;
  check('heavy: preview no longer live', previewIsLive() === false);
  __regenerateCalls = 0;
  markPending(); markPending();
  await wait(420);
  check('heavy: edits do NOT regenerate', __regenerateCalls === 0, __regenerateCalls);
  check('heavy: pending stays set', pendingChanges === true);
  check('heavy: stale badge shown', badge.style.display === 'flex', badge.style.display);

  // Badge tap: rebuild once, badge hides.
  __regenerateCalls = 0;
  if (pendingChanges) applyPending();
  check('badge tap: pending cleared immediately', pendingChanges === false);
  check('badge tap: badge hidden again', badge.style.display === 'none', badge.style.display);
  await wait(80);
  check('badge tap: regenerate() ran exactly once', __regenerateCalls === 1, __regenerateCalls);

  // Export path: synchronous flush regardless of mode.
  markPending();
  __regenerateCalls = 0;
  if (pendingChanges) applyPendingNow();
  check('export path: applyPendingNow regenerates synchronously', __regenerateCalls === 1, __regenerateCalls);
  check('export path: pending cleared', pendingChanges === false);
  await wait(420);
  check('export path: no stray auto-apply afterwards', __regenerateCalls === 1, __regenerateCalls);

  // Back to a fast model -> live behaviour returns.
  lastRegenMs = 100;
  __regenerateCalls = 0;
  markPending();
  check('fast again: badge stays hidden', badge.style.display === 'none', badge.style.display);
  await wait(420);
  check('fast again: edits auto-apply', __regenerateCalls === 1, __regenerateCalls);

  console.log('\n=== APPLY-BUTTON TOTAL:', pass, 'passed,', fail, 'failed ===');
  process.exit(fail > 0 ? 1 : 0);
}
main();
