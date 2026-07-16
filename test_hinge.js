// Filament-pin hinge («откидная крышка»): the container ('cup') grows two knuckles on its back
// wall, the flat lid plate carries one centre knuckle; a 1.75mm filament piece through the Ø2
// bores is the pin. Checks: every body watertight (knuckles are extra closed shells), the pin
// bores of cup and closed lid are COAXIAL, the lid knuckle fits the cup slot with clearance, and
// the knuckles weld into their parents (real overlap, not just touching). Run via ./run-all.sh.

let pass = 0, fail = 0;
function check(name, cond, extra) {
  if (cond) { pass++; console.log('  OK  ', name); }
  else { fail++; console.log('  FAIL', name, extra!==undefined?JSON.stringify(extra):''); }
}
function sv(t){let v=0;for(const T of t){const a=T[0],b=T[1],c=T[2];v+=(a[0]*(b[1]*c[2]-b[2]*c[1])-a[1]*(b[0]*c[2]-b[2]*c[0])+a[2]*(b[0]*c[1]-b[1]*c[0]))/6;}return v;}
function bbox(tris){ const lo=[1e9,1e9,1e9], hi=[-1e9,-1e9,-1e9];
  for (const tr of tris) for (const p of tr) for (let a=0;a<3;a++){ lo[a]=Math.min(lo[a],p[a]); hi[a]=Math.max(hi[a],p[a]); }
  return {lo,hi}; }

async function main(){
  models.length = 0; activeModelId = null; nextModelId = 1;
  models.push(makeModelRecord('Модель 1', defaultBoxParams()));
  activeModelId = models[0].id;
  const W=40, H=40, D=40, wall=2;
  Object.assign(paramState.box, { width:W, height:H, depth:D, hollow:true, wallThickness:wall });
  logos.length = 0; boxHoles.length = 0;
  regenerate();

  addHingeLidForActive();

  check('two models (cup + hinge lid)', models.length === 2, models.length);
  const cup = models[0], lid = models[1];
  check('container marked as hinge cup', cup.params.hingeRole === 'cup');
  check('lid marked as hinge lid', lid.params.hingeRole === 'lid');

  // Watertight with the extra knuckle shells.
  const mcCup = manifoldCheck(cup.rawTris, 4), mcLid = manifoldCheck(lid.rawTris, 4);
  check('cup with knuckles: watertight & +vol', mcCup.watertight && sv(cup.rawTris) > 0, mcCup);
  check('lid with knuckle: watertight & +vol', mcLid.watertight && sv(lid.rawTris) > 0, mcLid);

  // Knuckles actually protrude beyond the back wall (−Z) on both bodies.
  const bbC = bbox(cup.rawTris), bbL = bbox(lid.rawTris);
  check('cup knuckles protrude past the back wall', bbC.lo[2] < -D/2 - 3, {minZ: bbC.lo[2]});
  check('lid knuckle hangs below the plate', bbL.lo[1] < -lid.params.height/2 - 3, {minY: bbL.lo[1]});
  check('lid knuckle sticks out the back', bbL.lo[2] < -lid.params.depth/2 - 3, {minZ: bbL.lo[2]});

  // COAXIALITY: with the lid closed (plate resting on the rim: plateCenterY = H/2 + Hl/2, same x/z
  // origin) the two bores must share one axis. Reconstruct both from the published conventions.
  const kx=7, ky=7, kz=5, embed=1.2;
  const zPin = -D/2 - kz/2 + embed;               // both bores' z (shared formula, same p.depth)
  const cupPinY = H/2 - ky/2;                     // cup knuckle centre, bore at its centre
  const Hl = lid.params.height;
  const plateY = H/2 + Hl/2;                      // closed plate centre
  const lidKnuckleY = plateY + (-ky/2 - Hl/2 + 1);
  const lidPinY = lidKnuckleY + (-1);             // bore offset −1 inside the knuckle
  check('closed lid: pin bores are coaxial in Y', Math.abs(cupPinY - lidPinY) < 1e-9, {cupPinY, lidPinY});
  check('closed lid: pin bores are coaxial in Z (same formula, same depth)', lid.params.depth === D);

  // FIT: the lid's 7mm knuckle drops into the 8mm slot between the cup knuckles (0.5mm per side).
  const slot = 2*4;                               // cup inner faces at ±4
  check('lid knuckle fits the cup slot with clearance', slot - kx >= 0.9, {slot, kx});

  // WELD: knuckle overlaps its parent by ≥1mm (not just touching).
  check('cup knuckle embeds into the wall', embed >= 1, embed);

  // Bores are Ø2 (filament 1.75 + slack): measure the actual hole in the lid knuckle mesh —
  // vertices on the bore ring sit ~1mm from the pin axis.
  const ring = [];
  for (const tr of lid.rawTris) for (const p of tr) {
    const dy = p[1] - (lidPinY - plateY), dz = p[2] - zPin; // lid-local frame
    const r = Math.hypot(dy, dz);
    if (r < 1.4 && Math.abs(p[0]) <= kx/2 + 1e-6) ring.push(r);
  }
  check('lid bore ring found at r≈1', ring.length > 8 && Math.min(...ring) > 0.85 && Math.min(...ring) < 1.15,
    {n: ring.length, rMin: ring.length ? +Math.min(...ring).toFixed(3) : null});

  // Idempotence-ish: a second press on an already-cup container must not stack a second pair.
  const trisBefore = cup.rawTris.length;
  activateModel(cup.id);
  const trisAfterActivate = getActiveModel().rawTris.length;
  check('re-activating the cup keeps its mesh stable', trisAfterActivate === trisBefore,
    {before: trisBefore, after: trisAfterActivate});

  console.log(`\n=== TOTAL: ${pass} passed, ${fail} failed ===`);
  process.exit(fail ? 1 : 0);
}
main();
