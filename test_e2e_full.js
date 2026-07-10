// End-to-end regression suite covering the full box pipeline together: solid + zonal logo
// grid, taper, rotation-only caching, hollow container, and the plain fillet/segment path —
// each of the other test_*.js files exercises ONE feature in isolation; this one checks they
// still all work correctly when combined in the same file, dispatched through the real
// buildTrisForShape/regenerate functions. Run via ../run-all.sh, or manually:
//   awk '/<script>/{f=1;next}/<\/script>/{f=0}f' ../parametric-stl-generator.html \
//     | sed '$ { /^init();$/d }' > /tmp/lib.js
//   cat /tmp/lib.js test_e2e_full.js > /tmp/run.js && node /tmp/run.js
//
// Appended after the real file's script (minus init()); runs against the ACTUAL merged code.
let pass = 0, fail = 0;
function check(name, cond, extra) {
  if (cond) { pass++; console.log('  OK  ', name); }
  else { fail++; console.log('  FAIL', name, extra!==undefined?JSON.stringify(extra):''); }
}
function makeSolidHeightmap() { return new Float32Array(LOGO_HM_SIZE*LOGO_HM_SIZE).fill(1); }
function hasNaN(tris) { for (const tri of tris) for (const p of tri) for (const c of p) if (!Number.isFinite(c)) return true; return false; }

console.log('=== E2E against the ACTUAL merged file (paramState/logos/buildTrisForShape as shipped) ===');

// paramState.box already exists (populated from SHAPE_PARAMS defaults at top-level load).
// Just override what this scenario needs, exactly like the real UI's input handlers would.
Object.assign(paramState.box, { width: 466, height: 60, depth: 60,
  taperXPlus:0, taperXMinus:0, taperZPlus:0, taperZMinus:0,
  taperYPlusX:0, taperYPlusZ:0, taperYMinusX:0, taperYMinusZ:0, hollow:false });
logos.length = 0;
logos.push({ id:1, face:'+Z', u0:0, v0:0, w:16, h:16, depth:2, threshold:0.5, invert:false, rotation:0, heightmap: makeSolidHeightmap(), previewUrl:'' });
logoResolution = 50;

const tris1 = buildTrisForShape('box', paramState.box);
check('scenario A (via buildTrisForShape, real dispatch path): no NaN', !hasNaN(tris1));
const mc1 = manifoldCheck(tris1, 4);
check('scenario A: watertight', mc1.watertight, mc1);
const bb1 = computeBBox(tris1);
check('scenario A: bbox width correct', Math.abs((bb1.maxX-bb1.minX)-466) < 1e-6, bb1);
console.log('    scenario A triangle count:', tris1.length);

// Combined taper + 2 logos on different faces (exercises the bilinear-warp path)
Object.assign(paramState.box, { width: 300, height: 80, depth: 300,
  taperXPlus:20, taperXMinus:-10, taperZPlus:15, taperZMinus:15,
  taperYPlusX:5, taperYPlusZ:0, taperYMinusX:0, taperYMinusZ:0, hollow:false });
logos.length = 0;
logos.push({ id:1, face:'+Z', u0:20, v0:10, w:20, h:12, depth:1.5, threshold:0.5, invert:false, rotation:0, heightmap: makeSolidHeightmap(), previewUrl:'' });
logos.push({ id:2, face:'+Y', u0:-30, v0:0, w:15, h:15, depth:1.5, threshold:0.5, invert:false, rotation:30, heightmap: makeSolidHeightmap(), previewUrl:'' });
logoResolution = 40;
const tris2 = buildTrisForShape('box', paramState.box);
check('scenario B (combined taper, 2 logos): no NaN', !hasNaN(tris2));
const mc2 = manifoldCheck(tris2, 4);
check('scenario B: watertight', mc2.watertight, mc2);
console.log('    scenario B triangle count:', tris2.length);

// clampLogoToFace + resize interaction (mirrors what the real width/height/depth input
// handler does: logos.forEach(clampLogoToFace) after a dimension change) — verifying the
// live-resize path (the ORIGINAL bug report scenario: shrinking/growing the box) still
// produces a valid, watertight, crisp result afterward.
Object.assign(paramState.box, { width: 40, height: 40, depth: 40,
  taperXPlus:0, taperXMinus:0, taperZPlus:0, taperZMinus:0,
  taperYPlusX:0, taperYPlusZ:0, taperYMinusX:0, taperYMinusZ:0 }); // shrink a lot, taper back to none
logos.length = 0;
logos.push({ id:1, face:'+Z', u0:0, v0:0, w:16, h:16, depth:2, threshold:0.5, invert:false, rotation:0, heightmap: makeSolidHeightmap(), previewUrl:'' });
for (const l of logos) clampLogoToFace(l);
const tris3 = buildTrisForShape('box', paramState.box);
check('resize-then-rebuild: no NaN', !hasNaN(tris3));
const mc3 = manifoldCheck(tris3,4);
check('resize-then-rebuild: watertight', mc3.watertight, mc3);
if (!mc3.watertight) {
  // Diagnostic: locate exactly where the open edges are.
  const key = (p) => p[0].toFixed(4)+','+p[1].toFixed(4)+','+p[2].toFixed(4);
  const edges = new Map();
  for (const tri of tris3) {
    const k = [key(tri[0]), key(tri[1]), key(tri[2])];
    for (let e = 0; e < 3; e++) {
      const ka = k[e], kb = k[(e+1)%3];
      if (ka === kb) continue;
      const ek = ka < kb ? ka+'|'+kb : kb+'|'+ka;
      if (!edges.has(ek)) edges.set(ek, 0);
      edges.set(ek, edges.get(ek)+1);
    }
  }
  let shown = 0;
  for (const [ek, c] of edges) {
    if (c === 1 && shown < 20) { console.log('    OPEN EDGE:', ek); shown++; }
  }
  console.log('    logos after clamp:', JSON.stringify(logos.map(l=>({face:l.face,u0:l.u0,v0:l.v0,w:l.w,h:l.h,rotation:l.rotation}))));
  console.log('    box dims:', JSON.stringify(paramState.box));
}

// Hollow box path untouched — make sure it still works (regression check, not in scope of
// this fix, but must not have been broken by the edits).
Object.assign(paramState.box, { width: 100, height: 50, depth: 80, hollow:true, wallThickness:2,
  taperXPlus:0, taperXMinus:0, taperZPlus:0, taperZMinus:0, taperYPlusX:0, taperYPlusZ:0, taperYMinusX:0, taperYMinusZ:0 });
logos.length = 0;
logos.push({ id:1, face:'+Z', u0:0, v0:0, w:10, h:10, depth:1, threshold:0.5, invert:false, rotation:0, heightmap: makeSolidHeightmap(), previewUrl:'' });
for (const l of logos) clampLogoToFace(l);
const tris4 = buildTrisForShape('box', paramState.box);
check('hollow box regression: no NaN', !hasNaN(tris4));
check('hollow box regression: watertight', manifoldCheck(tris4,4).watertight, manifoldCheck(tris4,4));

// No-logo path untouched (genRoundedBox + taperBoxTris) — regression check.
paramState.box.hollow = false;
logos.length = 0;
Object.assign(paramState.box, { width: 60, height:40, depth:50, filletRadius: 6, filletSeg:4, segW:2,segH:2,segD:2,
  taperXPlus:10, taperXMinus:0, taperZPlus:0, taperZMinus:0, taperYPlusX:0, taperYPlusZ:0, taperYMinusX:0, taperYMinusZ:0 });
const tris5 = buildTrisForShape('box', paramState.box);
check('no-logo fillet+taper regression: no NaN', !hasNaN(tris5));
check('no-logo fillet+taper regression: watertight', manifoldCheck(tris5,4).watertight, manifoldCheck(tris5,4));

// --- New: logo on the hollow container's inner bottom (-Y-inner) ---
Object.assign(paramState.box, { width: 80, height: 50, depth: 60, hollow: true, wallThickness: 3,
  taperXPlus:0,taperXMinus:0,taperZPlus:0,taperZMinus:0,taperYPlusX:0,taperYPlusZ:0,taperYMinusX:0,taperYMinusZ:0 });
logos.length = 0;
logos.push({ id:1, face:'-Y-inner', u0:0, v0:0, w:20, h:15, depth:1.5, threshold:0.5, invert:false, rotation:0, heightmap: makeSolidHeightmap(), previewUrl:'' });
for (const l of logos) clampLogoToFace(l);
const trisInner = buildTrisForShape('box', paramState.box);
check('inner-bottom logo: no NaN', !hasNaN(trisInner));
const mcInner = manifoldCheck(trisInner, 4);
check('inner-bottom logo: watertight', mcInner.watertight, mcInner);
{
  // The logo should be raised INTO the cavity (Y above the inner-floor plane), not sunk
  // through the floor or left flat.
  const t = clampWallThickness(paramState.box.width, paramState.box.height, paramState.box.depth, paramState.box.wallThickness);
  const innerFloorY = -(paramState.box.height/2 - t);
  const raisedAboveFloor = trisInner.some(tri => tri.some(pt => pt[1] > innerFloorY + 0.5));
  check('inner-bottom logo: relief actually raised above the inner floor plane', raisedAboveFloor);
  // And should NOT poke out the actual OUTER bottom of the box (would mean it's on the
  // wrong plane / wall thickness math is off).
  const outerBottomY = -paramState.box.height/2;
  const pokesThroughOuterBottom = trisInner.some(tri => tri.some(pt => pt[1] < outerBottomY - 0.01));
  check('inner-bottom logo: stays above the outer bottom (correct plane)', !pokesThroughOuterBottom);
}

// Clamp should use the INNER (cavity) extent, not the outer box footprint.
{
  const wideLogo = { id:2, face:'-Y-inner', u0:0, v0:0, w:1000, h:1000, depth:1, threshold:0.5, invert:false, rotation:0, heightmap: makeSolidHeightmap(), previewUrl:'' };
  clampLogoToFace(wideLogo);
  const t = clampWallThickness(paramState.box.width, paramState.box.height, paramState.box.depth, paramState.box.wallThickness);
  const innerW = paramState.box.width - 2*t;
  check('inner-bottom logo: oversized width clamped to INNER (cavity) extent, not outer', wideLogo.w < innerW + 0.5, {w: wideLogo.w, innerW});
}

// Logo on the OUTER bottom (-Y) and inner bottom (-Y-inner) at the same time, plus a side
// wall logo — everything sharing the same buildHollowBox call must still be watertight.
logos.length = 0;
logos.push({ id:1, face:'-Y', u0:5, v0:0, w:15, h:10, depth:1, threshold:0.5, invert:false, rotation:0, heightmap: makeSolidHeightmap(), previewUrl:'' });
logos.push({ id:2, face:'-Y-inner', u0:-5, v0:0, w:12, h:10, depth:1, threshold:0.5, invert:false, rotation:15, heightmap: makeSolidHeightmap(), previewUrl:'' });
logos.push({ id:3, face:'+X', u0:0, v0:0, w:10, h:10, depth:1, threshold:0.5, invert:false, rotation:0, heightmap: makeSolidHeightmap(), previewUrl:'' });
for (const l of logos) clampLogoToFace(l);
const trisCombo = buildTrisForShape('box', paramState.box);
check('outer+inner+wall logos together: no NaN', !hasNaN(trisCombo));
check('outer+inner+wall logos together: watertight', manifoldCheck(trisCombo,4).watertight, manifoldCheck(trisCombo,4));

// Turning hollow OFF with a logo still assigned to -Y-inner must not crash or corrupt the
// solid-box path (buildBoxWithLogos simply doesn't have that face in its list, so the logo
// is silently absent — verifying that's true rather than, say, a thrown exception).
paramState.box.hollow = false;
const trisHollowOff = buildTrisForShape('box', paramState.box);
check('hollow toggled off with a -Y-inner logo assigned: no NaN', !hasNaN(trisHollowOff));
check('hollow toggled off with a -Y-inner logo assigned: watertight', manifoldCheck(trisHollowOff,4).watertight, manifoldCheck(trisHollowOff,4));
// ...and turning it back ON must correctly bring the inner logo back.
paramState.box.hollow = true;
const trisHollowBackOn = buildTrisForShape('box', paramState.box);
check('hollow toggled back on: still watertight', manifoldCheck(trisHollowBackOn,4).watertight, manifoldCheck(trisHollowBackOn,4));

console.log('\n=== E2E TOTAL:', pass, 'passed,', fail, 'failed ===');
process.exit(fail > 0 ? 1 : 0);
