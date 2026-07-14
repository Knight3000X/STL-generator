// Regression tests for the "logo-detail slider drives a logo-free shell" explosion:
// a hollow/rim box WITHOUT logos used logoResolution as its UNIFORM wall-grid density, so
// deleting the last logo (or hitting the container/tray preset) with the slider raised
// jumped the mesh from a few thousand to millions of triangles. The fix caps the uniform
// grid for plain (no logo / no bulge / no lattice) shells; zonal and bulge paths keep
// their previous behaviour.
//
// Run against the real file, same recipe as test_hollow_resolution.js:
//
//   awk '/<script>/{c++;f=1;next}/<\/script>/{f=0;next} f && c>=2' ../parametric-stl-generator.html \
//     | sed '$ { /^init();$/d }' > /tmp/lib.js
//   cat stub_preamble.js /tmp/lib.js test_shell_resolution.js > /tmp/run.js && node /tmp/run.js

let pass = 0, fail = 0;
function check(name, cond, extra) {
  if (cond) { pass++; console.log('  OK  ', name); }
  else { fail++; console.log('  FAIL', name, extra !== undefined ? JSON.stringify(extra) : ''); }
}
function makeSolidHeightmap() { return new Float32Array(LOGO_HM_SIZE*LOGO_HM_SIZE).fill(1); }
function hasNaN(tris) { for (const tri of tris) for (const p of tri) for (const c of p) if (!Number.isFinite(c)) return true; return false; }
function resetBoxDefaults() {
  for (const p of SHAPE_PARAMS.box) paramState.box[p.key] = p.default;
  logos.length = 0;
  if (typeof boxHoles !== 'undefined') boxHoles.length = 0;
}

console.log('=== Plain hollow shell must NOT scale with the logo-detail slider ===');
{
  resetBoxDefaults();
  Object.assign(paramState.box, { width: 100, height: 60, depth: 80, hollow: true, wallThickness: 2 });
  logoResolution = 500; // max legal slider value
  const tris = buildTrisForShape('box', paramState.box);
  console.log('    hollow, no logos, logoResolution=500: ' + tris.length + ' tris');
  check('no-logo hollow at slider=500 stays sane (<50k tris, was ~2.5M)', tris.length < 50000, tris.length);
  check('no-logo hollow at slider=500: no NaN', !hasNaN(tris));
  check('no-logo hollow at slider=500: watertight', manifoldCheck(tris,4).watertight, manifoldCheck(tris,4));

  logoResolution = 50;
  const trisLo = buildTrisForShape('box', paramState.box);
  check('slider value no longer changes a logo-free hollow shell', tris.length === trisLo.length, {hi: tris.length, lo: trisLo.length});
}

console.log('\n=== Plain rim (tray) shell: same guard ===');
{
  resetBoxDefaults();
  Object.assign(paramState.box, { width: 100, height: 60, depth: 80, rim: true, rimHeight: 8, wallThickness: 2 });
  logoResolution = 500;
  const tris = buildTrisForShape('box', paramState.box);
  console.log('    rim, no logos, logoResolution=500: ' + tris.length + ' tris');
  check('no-logo tray at slider=500 stays sane (<50k tris)', tris.length < 50000, tris.length);
  check('no-logo tray at slider=500: watertight', manifoldCheck(tris,4).watertight, manifoldCheck(tris,4));
}

console.log('\n=== Zonal path (hollow WITH a logo) keeps responding to the slider ===');
{
  resetBoxDefaults();
  Object.assign(paramState.box, { width: 100, height: 60, depth: 80, hollow: true, wallThickness: 2 });
  logos.push({ id:1, face:'+X', u0:0, v0:0, w:15, h:15, depth:1.5, threshold:0.5, invert:false, rotation:0, heightmap: makeSolidHeightmap(), previewUrl:'' });
  for (const l of logos) clampLogoToFace(l);
  logoResolution = 20;
  const a = buildTrisForShape('box', paramState.box);
  logoResolution = 80;
  const b = buildTrisForShape('box', paramState.box);
  check('with a logo, the slider still changes the output', a.length !== b.length, {lo20: a.length, lo80: b.length});
  check('logo hollow at slider=80: watertight', manifoldCheck(b,4).watertight, manifoldCheck(b,4));
}

console.log('\n=== Bulge-only shell keeps its dense (dome-capable) grid ===');
{
  resetBoxDefaults();
  Object.assign(paramState.box, { width: 100, height: 60, depth: 80, hollow: true, wallThickness: 2, bulgeXPlus: 6 });
  logoResolution = 50;
  const bulged = buildTrisForShape('box', paramState.box);
  Object.assign(paramState.box, { bulgeXPlus: 0 });
  const plain = buildTrisForShape('box', paramState.box);
  check('bulge-only shell is denser than the capped plain shell', bulged.length > plain.length, {bulged: bulged.length, plain: plain.length});
  check('bulge-only shell: watertight', manifoldCheck(bulged,4).watertight, manifoldCheck(bulged,4));
}

console.log('\n=== TOTAL:', pass, 'passed,', fail, 'failed ===');
process.exit(fail > 0 ? 1 : 0);
