// MULTI-MODEL state management: several independent models ("сборка"), each a snapshot of the
// active globals (params, logos, rotation, position); switching = save/load; export merges every
// VISIBLE model (rotate + translate its cached raw tris). Exercises the REAL model functions from
// the page with regenerate()/applyRotationOnly() swapped for counters (heavy geometry is out of
// scope here — geometry itself is covered by the other suites).
// Run against the real file:
//   awk '/<script>/{f=1;next}/<\/script>/{f=0}f' parametric-stl-generator.html \
//     | sed '$ { /^init();$/d }' > /tmp/lib.js
//   node -e '<swap regenerate/applyRotationOnly for counters as in run-all.sh>' ...
//   cat stub_preamble.js /tmp/lib_stubbed.js test_multi_model.js > /tmp/run.js && node /tmp/run.js

let pass = 0, fail = 0;
function chk(name, cond, extra){ if (cond) { pass++; console.log('  OK  ', name); } else { fail++; console.log('  FAIL', name, extra !== undefined ? JSON.stringify(extra) : ''); } }

console.log('=== MULTI-MODEL state management ===');

// boot the model system the way init() does
models.push(makeModelRecord('Модель 1', defaultBoxParams()));
activeModelId = models[0].id;
renderModelCards();
chk('one model after boot, active', models.length === 1 && activeModelId === models[0].id);
chk('record params come from defaults', models[0].params.width === 40 && models[0].params.squircle === 0);

// simulate a built state, then edit the active globals and snapshot them
const T1 = [[[0,0,0],[10,0,0],[0,10,0]], [[0,0,0],[0,10,0],[0,0,10]]];
cachedRawTris = T1;
paramState.box.width = 77;
logos.push({id: nextLogoId++, face:'+Z', u0:1, v0:2, w:10, h:10, depth:1, threshold:0.5, invert:false, rotation:0, heightmap:null, previewUrl:null});
transformState.rx = 45; positionState.px = 30;
saveActiveModel();
models[0].bbox = computeBBox(T1);
chk('saveActiveModel: rawTris reference stored', models[0].rawTris === T1);
chk('saveActiveModel: params snapshot', models[0].params.width === 77);
chk('saveActiveModel: params are a COPY (later global edits do not leak)', (paramState.box.width = 123, models[0].params.width === 77));
chk('saveActiveModel: logos snapshot', models[0].logos.length === 1);
chk('saveActiveModel: rotation + position', models[0].rx === 45 && models[0].px === 30);
paramState.box.width = 77; // restore for the switch tests below

console.log('\n=== add / switch: the newcomer is fresh, switching back restores everything ===');
addModel();
chk('two models, the new one is active', models.length === 2 && activeModelId === models[1].id);
chk('new model gets default params', paramState.box.width === 40);
chk('new model has no logos', logos.length === 0);
chk('new model reset rotation/position state', transformState.rx === 0 && positionState.px !== 30);
chk('new model auto-offset to the right of model 1', models[1].px >= models[0].bbox.maxX + models[0].px);

const T2 = [[[0,0,0],[5,0,0],[0,5,0]]];
cachedRawTris = T2; paramState.box.width = 55; saveActiveModel();
activateModel(models[0].id);
chk('back to model 1: width restored', paramState.box.width === 77);
chk('back to model 1: logo restored', logos.length === 1 && logos[0].u0 === 1);
chk('back to model 1: rotation restored', transformState.rx === 45);
chk('back to model 1: position restored', positionState.px === 30);
chk('back to model 1: cached tris restored', cachedRawTris === T1);
chk('model 2 kept its own snapshot', models[1].params.width === 55 && models[1].rawTris === T2);

console.log('\n=== duplicate: independent copy, placed beside the source ===');
duplicateModel(models[0].id);
chk('three models', models.length === 3);
const dup = models[2];
chk('dup copies params', dup.params.width === 77);
chk('dup logos are copies, not shared objects', dup.logos.length === 1 && dup.logos[0] !== models[0].logos[0] && dup.logos[0].u0 === 1);
dup.params.width = 99;
chk('dup params independent of the source', models[0].params.width === 77);
chk('dup keeps rotation, offsets position', dup.rx === 45 && dup.px > models[0].px);
chk('duplicating did not steal focus from the active model', activeModelId === models[0].id);

console.log('\n=== merged export: visible models only, rotated + translated ===');
setModelVisible(models[1].id, false);
const merged = mergedExportTris();
chk('hidden model excluded from the merge', merged.length === models[0].rawTris.length + dup.rawTris.length);
// model 1: rx=45 (rotation about X leaves x untouched) then px=+30
chk('merge applies the position offset', Math.abs(merged[0][0][0] - (T1[0][0][0] + 30)) < 1e-9, merged[0][0]);
// rotation applied: T1[0][1]=[10,0,0] stays on the x-axis; T1[0][2]=[0,10,0] must rotate off the y-axis
chk('merge applies the rotation', Math.abs(merged[0][2][1] - 10*Math.cos(Math.PI/4)) < 1e-9, merged[0][2]);
setModelVisible(models[1].id, true);
chk('re-shown model returns to the merge', mergedExportTris().length === models[0].rawTris.length + models[1].rawTris.length + dup.rawTris.length);

console.log('\n=== assembly bbox / floor ===');
const u = sceneUnionBBox();
// model 1 at px=30 (bbox x 0..10 -> 30..40), dup beside it (px=50 -> 50..60); model 2 has no bbox yet
chk('union bbox spans all visible models (translated)',
  Math.abs(u.minX - (models[0].px + models[0].bbox.minX)) < 1e-9 &&
  Math.abs(u.maxX - (dup.px + dup.bbox.maxX)) < 1e-9, u);

console.log('\n=== delete: neighbour becomes active; the last model is protected ===');
deleteModel(models[1].id);
chk('non-active model deleted', models.length === 2 && activeModelId === models[0].id);
const oldActive = activeModelId;
deleteModel(oldActive);
chk('deleting the ACTIVE model activates the neighbour', models.length === 1 && activeModelId !== oldActive);
chk('neighbour state loaded after delete', paramState.box.width === 99); // dup had width 99
deleteModel(activeModelId);
chk('the last model cannot be deleted', models.length === 1);

console.log('\n=== TOTAL:', pass, 'passed,', fail, 'failed ===');
process.exit(fail > 0 ? 1 : 0);
