// Undo/redo for the active model's parameters/logos/holes: a pre-edit snapshot is captured
// (maybeCaptureUndo — in the app it fires on focus/pointerdown inside the panel), doUndo/doRedo
// walk the stacks and re-apply state. Runs on the counter-stubbed library (regenerate is a stub),
// same recipe as test_apply_button.js — see run-all.sh.

async function wait(ms){ return new Promise(r=>setTimeout(r,ms)); }
async function main(){
  let pass = 0, fail = 0;
  function check(name, cond, extra) {
    if (cond) { pass++; console.log('  OK  ', name); }
    else { fail++; console.log('  FAIL', name, extra!==undefined?JSON.stringify(extra):''); }
  }

  clearUndoHistory();
  check('initial: stacks empty', undoStack.length === 0 && redoStack.length === 0);

  // Edit width 40 -> 55 with a pre-edit capture, then undo.
  paramState.box.width = 40;
  maybeCaptureUndo();                 // user focuses the field (state: 40)
  paramState.box.width = 55;          // user types
  markPending();
  check('capture pushed one snapshot', undoStack.length === 1, undoStack.length);
  doUndo();
  check('undo restores width 40', paramState.box.width === 40, paramState.box.width);
  check('undo marks the model pending', pendingChanges === true);
  doRedo();
  check('redo returns width 55', paramState.box.width === 55, paramState.box.width);

  // Idempotent capture: same state twice -> one snapshot.
  clearUndoHistory();
  maybeCaptureUndo(); maybeCaptureUndo();
  check('identical captures collapse', undoStack.length === 1, undoStack.length);

  // A chain of edits, then walk all the way back and forward.
  clearUndoHistory();
  paramState.box.width = 10; maybeCaptureUndo();
  paramState.box.width = 20; maybeCaptureUndo();
  paramState.box.width = 30; maybeCaptureUndo();
  paramState.box.width = 40;
  doUndo(); check('chain: 40 -> 30', paramState.box.width === 30, paramState.box.width);
  doUndo(); check('chain: 30 -> 20', paramState.box.width === 20, paramState.box.width);
  doUndo(); check('chain: 20 -> 10', paramState.box.width === 10, paramState.box.width);
  doUndo(); check('chain: bottom is stable', paramState.box.width === 10, paramState.box.width);
  doRedo(); doRedo(); doRedo();
  check('chain: redo back to 40', paramState.box.width === 40, paramState.box.width);

  // New edit after undo clears redo.
  clearUndoHistory();
  paramState.box.width = 5; maybeCaptureUndo();
  paramState.box.width = 6;
  doUndo();
  check('redo available after undo', redoStack.length === 1, redoStack.length);
  maybeCaptureUndo(); paramState.box.width = 7; // diverging edit
  check('new edit clears redo', redoStack.length === 0, redoStack.length);

  // Holes and logos ride along.
  clearUndoHistory();
  boxHoles.length = 0; logos.length = 0;
  maybeCaptureUndo();
  boxHoles.push({ id:1, face:'+Z', u0:0, v0:0, shape:'circle', diameter:6 });
  logos.push({ id:1, face:'+Z', u0:0, v0:0, w:10, h:10, depth:1, threshold:0.5, invert:false, rotation:0, heightmap:new Float32Array(4) });
  doUndo();
  check('undo removes the added hole and logo', boxHoles.length === 0 && logos.length === 0,
    {holes: boxHoles.length, logos: logos.length});
  doRedo();
  check('redo restores them (heightmap by reference)', boxHoles.length === 1 && logos.length === 1 && logos[0].heightmap.length === 4);

  console.log('\n=== UNDO TOTAL:', pass, 'passed,', fail, 'failed ===');
  process.exit(fail > 0 ? 1 : 0);
}
main();
