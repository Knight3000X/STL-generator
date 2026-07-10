let pass=0, fail=0;
function check(name, cond, extra) {
  if (cond) { pass++; console.log('  OK  ', name); }
  else { fail++; console.log('  FAIL', name, extra!==undefined?JSON.stringify(extra):''); }
}
function hasNaN(tris) { for (const tri of tris) for (const p of tri) for (const c of p) if (!Number.isFinite(c)) return true; return false; }

// Build a 12-value R structure from just 3 values (top/bottom/vertical), matching how the
// real feature will expose only 3 controls to the user.
function make3RadiusR(rTop, rBottom, rVert) {
  return {
    rX: {'1,0':rTop, '1,1':rTop, '0,0':rBottom, '0,1':rBottom}, // rX[iy,iz]: iy=1(sy=+1)->top
    rZ: {'1,1':rTop, '0,1':rTop, '1,0':rBottom, '0,0':rBottom}, // rZ[ix,iy]: iy=1(sy=+1)->top
    rY: {'0,0':rVert, '0,1':rVert, '1,0':rVert, '1,1':rVert},
  };
}

console.log('=== 3-radius: top != bottom != vertical, all different ===');
{
  const R = make3RadiusR(10, 3, 6);
  const tris = buildAsymRoundedBox(100, 60, 80, R);
  check('no NaN', !hasNaN(tris));
  const mc = manifoldCheck(tris, 3);
  check('watertight', mc.watertight, mc);
  const vol = computeMeshVolume(tris);
  check('positive volume, less than plain box', vol > 0 && vol < 100*60*80, vol);
}

console.log('\n=== 3-radius: top large, bottom zero (sharp bottom edges), vertical medium ===');
{
  const R = make3RadiusR(12, 0, 5);
  const tris = buildAsymRoundedBox(90, 50, 70, R);
  check('no NaN', !hasNaN(tris));
  const mc = manifoldCheck(tris, 3);
  check('watertight', mc.watertight, mc);
}

console.log('\n=== 3-radius: vertical zero (sharp corner posts), top/bottom rounded ===');
{
  const R = make3RadiusR(8, 8, 0);
  const tris = buildAsymRoundedBox(80, 60, 60, R);
  check('no NaN', !hasNaN(tris));
  const mc = manifoldCheck(tris, 3);
  check('watertight', mc.watertight, mc);
}

console.log('\n=== 3-radius: top=bottom (uniform horizontal), vertical different ===');
{
  const R = make3RadiusR(6, 6, 12);
  const tris = buildAsymRoundedBox(100, 70, 90, R);
  check('no NaN', !hasNaN(tris));
  const mc = manifoldCheck(tris, 3);
  check('watertight', mc.watertight, mc);
}

console.log('\n=== 3-radius: extreme — near-max top, tiny bottom, tiny vertical ===');
{
  const R = make3RadiusR(20, 1, 1);
  const tris = buildAsymRoundedBox(90, 50, 70, R);
  check('no NaN', !hasNaN(tris));
  const mc = manifoldCheck(tris, 3);
  check('watertight', mc.watertight, mc);
}

console.log('\n=== 3-radius: many different box sizes and value combos (stress) ===');
{
  const combos = [[5,10,3],[15,2,8],[4,4,4],[0,10,5],[10,0,5],[7,7,0],[9,3,15]];
  const dims = [[100,60,80],[50,50,50],[120,40,90],[70,90,60]];
  let allOk = true;
  for (const [t,b,v] of combos) {
    for (const [w,h,d] of dims) {
      const R = make3RadiusR(t,b,v);
      const tris = buildAsymRoundedBox(w,h,d,R);
      const mc = manifoldCheck(tris,3);
      if (!mc.watertight || hasNaN(tris)) { allOk = false; console.log('    FAIL combo', {t,b,v,w,h,d}, mc); }
    }
  }
  check('all '+(combos.length*dims.length)+' combos watertight', allOk);
}

console.log('\n=== TOTAL:', pass, 'passed,', fail, 'failed ===');
