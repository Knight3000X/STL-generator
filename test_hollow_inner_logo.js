// Regression tests for the hollow container's inner-bottom logo face ('-Y-inner').
// Has to run against the REAL file's actual functions (buildHollowBox, clampLogoToFace,
// clampWallThickness, FACE_AXES/BOX_FACE_DIMS) rather than a re-transcription, since the
// whole point is to catch drift between the geometry and the clamp/UI logic that must agree
// with it (e.g. both need the exact same idea of where the inner floor plane is). To run:
//
//   awk '/<script>/{f=1;next}/<\/script>/{f=0}f' ../parametric-stl-generator.html \
//     | sed '$ { /^init();$/d }' > /tmp/lib.js
//   cat /tmp/lib.js test_hollow_inner_logo.js > /tmp/run.js && node /tmp/run.js

let pass = 0, fail = 0;
function check(name, cond, extra) {
  if (cond) { pass++; console.log('  OK  ', name); }
  else { fail++; console.log('  FAIL', name, extra!==undefined?JSON.stringify(extra):''); }
}
function makeSolidHeightmap() { return new Float32Array(LOGO_HM_SIZE*LOGO_HM_SIZE).fill(1); }
function hasNaN(tris) { for (const tri of tris) for (const p of tri) for (const c of p) if (!Number.isFinite(c)) return true; return false; }

console.log('=== Hollow container: inner-bottom logo face (-Y-inner) ===');

Object.assign(paramState.box, { width: 80, height: 50, depth: 60, hollow: true, wallThickness: 3,
  taperXPlus:0,taperXMinus:0,taperZPlus:0,taperZMinus:0,taperYPlusX:0,taperYPlusZ:0,taperYMinusX:0,taperYMinusZ:0 });
logos.length = 0;
logos.push({ id:1, face:'-Y-inner', u0:0, v0:0, w:20, h:15, depth:1.5, threshold:0.5, invert:false, rotation:0, heightmap: makeSolidHeightmap(), previewUrl:'' });
for (const l of logos) clampLogoToFace(l);
const trisInner = buildTrisForShape('box', paramState.box);
check('no NaN', !hasNaN(trisInner));
const mcInner = manifoldCheck(trisInner, 4);
check('watertight', mcInner.watertight, mcInner);

{
  const t = clampWallThickness(paramState.box.width, paramState.box.height, paramState.box.depth, paramState.box.wallThickness);
  const innerFloorY = -(paramState.box.height/2 - t);
  const outerBottomY = -paramState.box.height/2;
  check('relief raised above the inner floor plane', trisInner.some(tri => tri.some(pt => pt[1] > innerFloorY + 0.5)));
  check('stays above the outer bottom (correct plane, not floating/sunk)', !trisInner.some(tri => tri.some(pt => pt[1] < outerBottomY - 0.01)));
}

{
  // Clamp must use the INNER (cavity) extent, not the outer box footprint.
  const wideLogo = { id:2, face:'-Y-inner', u0:0, v0:0, w:1000, h:1000, depth:1, threshold:0.5, invert:false, rotation:0, heightmap: makeSolidHeightmap(), previewUrl:'' };
  clampLogoToFace(wideLogo);
  const t = clampWallThickness(paramState.box.width, paramState.box.height, paramState.box.depth, paramState.box.wallThickness);
  const innerW = paramState.box.width - 2*t;
  check('oversized logo clamped to inner (cavity) extent, not outer', wideLogo.w < innerW + 0.5, {w: wideLogo.w, innerW});
}

// Outer bottom + inner bottom + a side wall logo, all in the same build.
logos.length = 0;
logos.push({ id:1, face:'-Y', u0:5, v0:0, w:15, h:10, depth:1, threshold:0.5, invert:false, rotation:0, heightmap: makeSolidHeightmap(), previewUrl:'' });
logos.push({ id:2, face:'-Y-inner', u0:-5, v0:0, w:12, h:10, depth:1, threshold:0.5, invert:false, rotation:15, heightmap: makeSolidHeightmap(), previewUrl:'' });
logos.push({ id:3, face:'+X', u0:0, v0:0, w:10, h:10, depth:1, threshold:0.5, invert:false, rotation:0, heightmap: makeSolidHeightmap(), previewUrl:'' });
for (const l of logos) clampLogoToFace(l);
const trisCombo = buildTrisForShape('box', paramState.box);
check('outer + inner + wall logos together: no NaN', !hasNaN(trisCombo));
check('outer + inner + wall logos together: watertight', manifoldCheck(trisCombo,4).watertight, manifoldCheck(trisCombo,4));

// Toggling hollow off with a -Y-inner logo assigned must not crash (solid-box path simply
// doesn't have that face, logo is silently absent) — and toggling back on must work again.
paramState.box.hollow = false;
const trisOff = buildTrisForShape('box', paramState.box);
check('hollow off with -Y-inner logo assigned: no NaN', !hasNaN(trisOff));
check('hollow off with -Y-inner logo assigned: watertight', manifoldCheck(trisOff,4).watertight, manifoldCheck(trisOff,4));
paramState.box.hollow = true;
const trisBackOn = buildTrisForShape('box', paramState.box);
check('hollow back on: still watertight', manifoldCheck(trisBackOn,4).watertight, manifoldCheck(trisBackOn,4));

// Extreme wall thickness (clamped to 90% of the smallest half-dimension) — the inner cavity
// gets tiny; clamping and the actual build must still agree and stay watertight.
Object.assign(paramState.box, { width: 40, height: 40, depth: 40, wallThickness: 9999 });
logos.length = 0;
logos.push({ id:1, face:'-Y-inner', u0:0, v0:0, w:5, h:5, depth:0.5, threshold:0.5, invert:false, rotation:0, heightmap: makeSolidHeightmap(), previewUrl:'' });
for (const l of logos) clampLogoToFace(l);
const trisExtreme = buildTrisForShape('box', paramState.box);
check('extreme wall thickness: no NaN', !hasNaN(trisExtreme));
check('extreme wall thickness: watertight', manifoldCheck(trisExtreme,4).watertight, manifoldCheck(trisExtreme,4));

console.log('\n=== TOTAL:', pass, 'passed,', fail, 'failed ===');
process.exit(fail > 0 ? 1 : 0);
