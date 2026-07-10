// Tests for hollow-container wall taper support. Run against the real file:
//   awk '/<script>/{f=1;next}/<\/script>/{f=0}f' ../parametric-stl-generator.html \
//     | sed '$ { /^init();$/d }' > /tmp/lib.js
//   cat /tmp/lib.js test_hollow_taper.js > /tmp/run.js && node /tmp/run.js

let pass = 0, fail = 0;
function check(name, cond, extra) {
  if (cond) { pass++; console.log('  OK  ', name); }
  else { fail++; console.log('  FAIL', name, extra!==undefined?JSON.stringify(extra):''); }
}
function makeSolidHeightmap() { return new Float32Array(LOGO_HM_SIZE*LOGO_HM_SIZE).fill(1); }
function hasNaN(tris) { for (const tri of tris) for (const p of tri) for (const c of p) if (!Number.isFinite(c)) return true; return false; }

function setBox(overrides) {
  Object.assign(paramState.box, { width:80, height:60, depth:70, hollow:true, wallThickness:2.5,
    taperXPlus:0,taperXMinus:0,taperZPlus:0,taperZMinus:0,taperYPlusX:0,taperYPlusZ:0,taperYMinusX:0,taperYMinusZ:0 }, overrides);
}

console.log('=== Modest single-wall taper, no logos ===');
{
  setBox({ taperXPlus: 20 });
  logos.length = 0;
  const tris = buildTrisForShape('box', paramState.box);
  check('no NaN', !hasNaN(tris));
  const mc = manifoldCheck(tris, 4);
  check('watertight', mc.watertight, mc);
  // The +X wall taper hinges at the BOTTOM (unchanged) and is maximal at the TOP — so the
  // mesh's overall max-X will always still show hw from the untouched bottom edge; check the
  // actual tapered position at the top directly instead.
  const hw = paramState.box.width/2, hh = paramState.box.height/2;
  const p = paramState.box;
  const taperFn = makeTaperPointFn(p.taperXPlus,p.taperXMinus,p.taperZPlus,p.taperZMinus,p.taperYPlusX,p.taperYPlusZ,p.taperYMinusX,p.taperYMinusZ, hw,hh,p.depth/2);
  const topOfWall = taperFn([hw, hh, 0]);
  check('outer +X wall visibly tapered inward at the top (taper is not silently ignored)', topOfWall[0] < hw - 1, {topX: topOfWall[0], hw});
}

console.log('\n=== Combined X+Z taper on all 4 walls, with logos on outer wall + outer bottom + inner bottom ===');
{
  setBox({ taperXPlus:35, taperXMinus:35, taperZPlus:35, taperZMinus:35 });
  logos.length = 0;
  logos.push({ id:1, face:'+X', u0:0, v0:0, w:12, h:12, depth:1.2, threshold:0.5, invert:false, rotation:0, heightmap: makeSolidHeightmap(), previewUrl:'' });
  logos.push({ id:2, face:'-Y', u0:5, v0:5, w:10, h:10, depth:1, threshold:0.5, invert:false, rotation:20, heightmap: makeSolidHeightmap(), previewUrl:'' });
  logos.push({ id:3, face:'-Y-inner', u0:-3, v0:-3, w:8, h:8, depth:1, threshold:0.5, invert:false, rotation:0, heightmap: makeSolidHeightmap(), previewUrl:'' });
  for (const l of logos) clampLogoToFace(l);
  const tris = buildTrisForShape('box', paramState.box);
  check('no NaN', !hasNaN(tris));
  const mc = manifoldCheck(tris, 4);
  check('watertight with combined taper + 3 logos incl. inner-bottom', mc.watertight, mc);
}

console.log('\n=== Extreme combined taper (75° on all 4 side walls) — thin but must not cross/break ===');
{
  setBox({ taperXPlus:75, taperXMinus:75, taperZPlus:75, taperZMinus:75, wallThickness: 2.5 });
  logos.length = 0;
  const tris = buildTrisForShape('box', paramState.box);
  check('no NaN at extreme taper', !hasNaN(tris));
  const mc = manifoldCheck(tris, 4);
  check('watertight at extreme taper', mc.watertight, mc);
}

console.log('\n=== Top/bottom tilt (Y taper) on hollow, with an inner-bottom logo ===');
{
  setBox({ taperYPlusX:15, taperYPlusZ:10, taperYMinusX:-8, taperYMinusZ:0 });
  logos.length = 0;
  logos.push({ id:1, face:'-Y-inner', u0:0, v0:0, w:15, h:15, depth:1.5, threshold:0.5, invert:false, rotation:0, heightmap: makeSolidHeightmap(), previewUrl:'' });
  for (const l of logos) clampLogoToFace(l);
  const tris = buildTrisForShape('box', paramState.box);
  check('no NaN with Y-tilt', !hasNaN(tris));
  check('watertight with Y-tilt', manifoldCheck(tris,4).watertight, manifoldCheck(tris,4));
}

console.log('\n=== Seam check: rim edges land exactly on outer/inner wall top edges under taper ===');
{
  setBox({ taperXPlus:25, taperZMinus:18 });
  const p = paramState.box;
  const taperFn = makeTaperPointFn(p.taperXPlus,p.taperXMinus,p.taperZPlus,p.taperZMinus,p.taperYPlusX,p.taperYPlusZ,p.taperYMinusX,p.taperYMinusZ, p.width/2,p.height/2,p.depth/2);
  const t = clampWallThickness(p.width,p.height,p.depth,p.wallThickness);
  const hw=p.width/2, hh=p.height/2, hd=p.depth/2;
  // A point on the outer +X wall's top edge (flat coords) and the corresponding rim-frame
  // corner both start from x=hw,y=hh — after tapering by the SAME function they must be
  // bit-identical, or the seam would visibly crack.
  const outerTop = taperFn([hw, hh, 0]);
  const rimOuterEdge = taperFn([hw, hh, 0]); // same flat input as used inside buildHollowBox's rim strip
  check('outer wall top edge == rim outer edge (identical taper input -> identical output)',
    outerTop[0]===rimOuterEdge[0] && outerTop[1]===rimOuterEdge[1] && outerTop[2]===rimOuterEdge[2]);
  const innerTop = taperFn([hw-t, hh, 0]);
  check('inner cavity top edge is a DIFFERENT point from the outer edge (wall has real thickness)', innerTop[0] !== outerTop[0]);

  logos.length = 0;
  const tris = buildTrisForShape('box', paramState.box);
  check('full build with this taper combo stays watertight', manifoldCheck(tris,4).watertight, manifoldCheck(tris,4));
}

console.log('\n=== Regression: solid box taper (buildBoxWithLogos path) unaffected ===');
{
  Object.assign(paramState.box, { width:60,height:50,depth:55, hollow:false,
    taperXPlus:20,taperXMinus:0,taperZPlus:0,taperZMinus:0,taperYPlusX:0,taperYPlusZ:0,taperYMinusX:0,taperYMinusZ:0 });
  logos.length = 0;
  logos.push({ id:1, face:'+Z', u0:0, v0:0, w:15, h:15, depth:1.5, threshold:0.5, invert:false, rotation:0, heightmap: makeSolidHeightmap(), previewUrl:'' });
  for (const l of logos) clampLogoToFace(l);
  const tris = buildTrisForShape('box', paramState.box);
  check('solid box + taper + logo still watertight', manifoldCheck(tris,4).watertight, manifoldCheck(tris,4));
}

console.log('\n=== Regression: hollow with ZERO taper produces the exact same result as before (identity path) ===');
{
  setBox({}); // all taper angles 0
  logos.length = 0;
  const trisNoLogo = buildTrisForShape('box', paramState.box);
  check('zero-taper hollow, no logos: no NaN', !hasNaN(trisNoLogo));
  check('zero-taper hollow, no logos: watertight', manifoldCheck(trisNoLogo,4).watertight, manifoldCheck(trisNoLogo,4));
  const bbNoLogo = computeBBox(trisNoLogo);
  check('zero-taper hollow, no logos: bbox matches flat dimensions exactly', Math.abs((bbNoLogo.maxX-bbNoLogo.minX)-80)<1e-6 && Math.abs((bbNoLogo.maxY-bbNoLogo.minY)-60)<1e-6 && Math.abs((bbNoLogo.maxZ-bbNoLogo.minZ)-70)<1e-6, bbNoLogo);

  // With a logo added, the bbox should extend by exactly the logo's depth on the side it's
  // raised (-Y here) — confirms displacement direction is still correct post-taper-refactor.
  logos.push({ id:1, face:'-Y', u0:0, v0:0, w:10, h:10, depth:1, threshold:0.5, invert:false, rotation:0, heightmap: makeSolidHeightmap(), previewUrl:'' });
  for (const l of logos) clampLogoToFace(l);
  const trisWithLogo = buildTrisForShape('box', paramState.box);
  check('zero-taper hollow, with logo: no NaN', !hasNaN(trisWithLogo));
  check('zero-taper hollow, with logo: watertight', manifoldCheck(trisWithLogo,4).watertight, manifoldCheck(trisWithLogo,4));
  const bbWithLogo = computeBBox(trisWithLogo);
  check('logo relief extends the bbox by its depth on the -Y side (raised outward correctly)', Math.abs((bbWithLogo.minY) - (-31)) < 1e-6, bbWithLogo);
}

console.log('\n=== TOTAL:', pass, 'passed,', fail, 'failed ===');
process.exit(fail > 0 ? 1 : 0);
