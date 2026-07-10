let pass=0, fail=0;
function check(name, cond, extra) {
  if (cond) { pass++; console.log('  OK  ', name); }
  else { fail++; console.log('  FAIL', name, extra!==undefined?JSON.stringify(extra):''); }
}
function hasNaN(tris) { for (const tri of tris) for (const p of tri) for (const c of p) if (!Number.isFinite(c)) return true; return false; }

console.log('=== Sanity: UNIFORM radius should be watertight + correct volume ===');
{
  const R = edgeRadiiDefaults(8);
  const tris = buildAsymRoundedBox(100, 60, 80, R);
  check('no NaN', !hasNaN(tris));
  const mc = manifoldCheck(tris, 3);
  check('watertight (uniform case)', mc.watertight, mc);
  const vol = computeMeshVolume(tris);
  const boxVol = 100*60*80;
  console.log('    volume:', vol.toFixed(1), '(plain box would be', boxVol, ')');
  check('volume positive and less than plain box', vol > 0 && vol < boxVol, vol);
}

console.log('\n=== Asymmetric: one edge much larger than its neighbors ===');
{
  const R = edgeRadiiDefaults(4);
  R.rX['1,1'] = 15;
  const tris = buildAsymRoundedBox(100, 60, 80, R);
  check('no NaN', !hasNaN(tris));
  const mc = manifoldCheck(tris, 3);
  check('watertight (one large edge)', mc.watertight, mc);
  check('positive volume', computeMeshVolume(tris) > 0, computeMeshVolume(tris));
}

console.log('\n=== Fully asymmetric: all 12 edges different ===');
{
  const R = {
    rX: {'0,0':3, '0,1':6, '1,0':9, '1,1':2},
    rY: {'0,0':5, '0,1':4, '1,0':7, '1,1':3},
    rZ: {'0,0':2, '0,1':8, '1,0':5, '1,1':6},
  };
  const tris = buildAsymRoundedBox(120, 70, 90, R);
  check('no NaN', !hasNaN(tris));
  const mc = manifoldCheck(tris, 3);
  check('watertight (all 12 different)', mc.watertight, mc);
  check('positive volume', computeMeshVolume(tris) > 0, computeMeshVolume(tris));
}

console.log('\n=== Edge case: some radii = 0 (sharp edges mixed with rounded) ===');
{
  const R = edgeRadiiDefaults(0);
  R.rY['1,1'] = 10; R.rX['1,1'] = 6; R.rZ['1,1'] = 8;
  const tris = buildAsymRoundedBox(80, 60, 70, R);
  check('no NaN with zero radii mixed in', !hasNaN(tris));
  const mc = manifoldCheck(tris, 3);
  check('watertight with zero radii mixed in', mc.watertight, mc);
}

console.log('\n=== Edge case: ALL radii zero (should reduce to a plain box) ===');
{
  const R = edgeRadiiDefaults(0);
  const tris = buildAsymRoundedBox(50, 40, 60, R);
  check('no NaN', !hasNaN(tris));
  const mc = manifoldCheck(tris, 3);
  check('watertight (all zero)', mc.watertight, mc);
  const vol = computeMeshVolume(tris);
  check('volume matches plain box exactly', Math.abs(vol - 50*40*60) < 1, vol);
}

console.log('\n=== Extreme asymmetric: max-ish radii on some edges, zero on adjacent ones ===');
{
  const R = edgeRadiiDefaults(2);
  R.rX['1,1'] = 20; R.rY['1,1'] = 0; R.rZ['1,1'] = 25;
  const tris = buildAsymRoundedBox(90, 70, 90, R);
  check('no NaN', !hasNaN(tris));
  const mc = manifoldCheck(tris, 3);
  check('watertight (extreme mix)', mc.watertight, mc);
}

console.log('\n=== TOTAL:', pass, 'passed,', fail, 'failed ===');
