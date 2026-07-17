// Regression tests for the (now single) logoResolution control, and for the
// tris.push(...bigArray) stack-overflow bug this area turned up in buildHollowBox
// (fixed by switching to concat). The two detail sliders (solid + hollow) were later
// merged back into one shared logoResolution — this suite guards that merged control.
// Run against the real file, same as test_debounce_flow.js / test_hollow_inner_logo.js:
//
//   awk '/<script>/{f=1;next}/<\/script>/{f=0}f' ../parametric-stl-generator.html \
//     | sed '$ { /^init();$/d }' > /tmp/lib.js
//   cat /tmp/lib.js test_hollow_resolution.js > /tmp/run.js && node /tmp/run.js

let pass = 0, fail = 0;
function check(name, cond, extra) {
  if (cond) { pass++; console.log('  OK  ', name); }
  else { fail++; console.log('  FAIL', name, extra!==undefined?JSON.stringify(extra):''); }
}
function makeSolidHeightmap() { return new Float32Array(LOGO_HM_SIZE*LOGO_HM_SIZE).fill(1); }
function hasNaN(tris) { for (const tri of tris) for (const p of tri) for (const c of p) if (!Number.isFinite(c)) return true; return false; }

console.log('=== Regression: buildHollowBox no longer stack-overflows at high resolution ===');
{
  // This exact combination (100x60x80, res=300) crashed with "Maximum call stack size
  // exceeded" before switching push(...array) to concat inside buildHollowBox.
  Object.assign(paramState.box, { width: 100, height: 60, depth: 80, hollow: true, wallThickness: 2 });
  logos.length = 0;
  logos.push({ id:1, face:'-Y', u0:0, v0:0, w:15, h:15, depth:2, threshold:0.5, invert:false, rotation:0, heightmap: makeSolidHeightmap(), previewUrl:'' });
  let threw = null;
  let tris = [];
  try { tris = buildHollowBox(100, 60, 80, 2, 300, buildCombinedLogoDispFns(makeTaperPointFn(0,0,0,0,0,0,0,0,50,30,40))); }
  catch (e) { threw = e; }
  check('res=300 on a modest hollow box does not throw', threw === null, threw && threw.message);
  check('res=300: no NaN', !hasNaN(tris));
  check('res=300: watertight', manifoldCheck(tris,4).watertight, manifoldCheck(tris,4));
}

console.log('\n=== The single logoResolution control drives BOTH solid and hollow output ===');
{
  Object.assign(paramState.box, { width: 100, height: 60, depth: 80, hollow: false,
    taperXPlus:0,taperXMinus:0,taperZPlus:0,taperZMinus:0,taperYPlusX:0,taperYPlusZ:0,taperYMinusX:0,taperYMinusZ:0 });
  logos.length = 0;
  logos.push({ id:1, face:'+Z', u0:0, v0:0, w:15, h:15, depth:2, threshold:0.5, invert:false, rotation:0, heightmap: makeSolidHeightmap(), previewUrl:'' });
  for (const l of logos) clampLogoToFace(l);

  logoResolution = 250;
  const trisSolidHiRes = buildTrisForShape('box', paramState.box);
  logoResolution = 20;
  const trisSolidLoRes = buildTrisForShape('box', paramState.box);
  check('changing logoResolution changes the solid-box output', trisSolidHiRes.length !== trisSolidLoRes.length, {hi: trisSolidHiRes.length, lo: trisSolidLoRes.length});

  paramState.box.hollow = true;
  paramState.box.wallThickness = 2;
  logoResolution = 20;
  const trisHollowA = buildTrisForShape('box', paramState.box);
  logoResolution = 80;
  const trisHollowB = buildTrisForShape('box', paramState.box);
  check('the same control changes the hollow output too', trisHollowA.length !== trisHollowB.length, {a: trisHollowA.length, b: trisHollowB.length});
}

console.log('\n=== Hollow resolution at a high value stays fast and correct ===');
{
  Object.assign(paramState.box, { width: 120, height: 80, depth: 100, hollow: true, wallThickness: 2.5 });
  logos.length = 0;
  logos.push({ id:1, face:'-Y-inner', u0:0, v0:0, w:20, h:15, depth:1.5, threshold:0.5, invert:false, rotation:0, heightmap: makeSolidHeightmap(), previewUrl:'' });
  logos.push({ id:2, face:'+X', u0:0, v0:0, w:15, h:15, depth:1.5, threshold:0.5, invert:false, rotation:0, heightmap: makeSolidHeightmap(), previewUrl:'' });
  for (const l of logos) clampLogoToFace(l);
  logoResolution = 150;
  const t0 = Date.now();
  const tris = buildTrisForShape('box', paramState.box);
  const ms = Date.now() - t0;
  console.log('    logoResolution=150, 2 logos incl. inner-bottom: ' + tris.length + ' tris in ' + ms + 'ms');
  check('no NaN at high hollow resolution', !hasNaN(tris));
  check('watertight at high hollow resolution', manifoldCheck(tris,4).watertight, manifoldCheck(tris,4));
  check('completes comfortably fast', ms < 2000, ms); // guards the stack-overflow regression, not micro-perf: CI-load tolerant
}

console.log('\n=== TOTAL:', pass, 'passed,', fail, 'failed ===');
process.exit(fail > 0 ? 1 : 0);
