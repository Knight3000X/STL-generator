// Snap-clip lid: '+ Крышка с защёлками' puts bump ridges on the container's ±X walls (relief pads
// via makeBumpPadLogo) and matching windows through the lid's skirt (single-wall ports). Both bodies
// must stay watertight, the bump must stand proud beyond the slip clearance, and — the actual
// engineering check — with the lid CLOSED (flipped, plate resting on the container rim) the window
// must sit exactly over the bump. Run via ./run-all.sh (extraction test).

async function wait(ms){ return new Promise(r=>setTimeout(r,ms)); }
let pass = 0, fail = 0;
function check(name, cond, extra) {
  if (cond) { pass++; console.log('  OK  ', name); }
  else { fail++; console.log('  FAIL', name, extra!==undefined?JSON.stringify(extra):''); }
}
function sv(t){let v=0;for(const T of t){const a=T[0],b=T[1],c=T[2];v+=(a[0]*(b[1]*c[2]-b[2]*c[1])-a[1]*(b[0]*c[2]-b[2]*c[0])+a[2]*(b[0]*c[1]-b[1]*c[0]))/6;}return v;}
function maxAbs(tris, axis){ let m=0; for(const tr of tris) for(const p of tr) m=Math.max(m,Math.abs(p[axis])); return m; }

async function main(){
  // Fresh assembly with one container model (mirrors init()).
  models.length = 0; activeModelId = null; nextModelId = 1;
  models.push(makeModelRecord('Модель 1', defaultBoxParams()));
  activeModelId = models[0].id;
  Object.assign(paramState.box, { width:40, height:40, depth:40, hollow:true, wallThickness:2 });
  logos.length = 0; boxHoles.length = 0;
  regenerate();

  const W=40, H=40, wall=2, clearance=0.4, lip=8;
  addLidForActive(true);

  check('two models exist (container + snap lid)', models.length === 2, models.length);
  const cont = models[0], lid = models[1];
  check('lid named for clips', /защёлк/i.test(lid.name), lid.name);

  // Container: two full-pad bump logos on ±X, standing proud beyond the slip clearance.
  check('container got 2 bump logos', cont.logos.length === 2, cont.logos.length);
  check('bumps on +X and -X', new Set(cont.logos.map(l=>l.face)).size === 2 &&
    cont.logos.every(l => l.face==='+X' || l.face==='-X'));
  check('bump stands proud beyond clearance', cont.logos.every(l => l.depth > clearance + 0.2),
    cont.logos.map(l=>l.depth));
  const mcC = manifoldCheck(cont.rawTris, 4);
  check('container with ridges: watertight', mcC.watertight, mcC);
  check('container max|x| grew by the bump depth', Math.abs(maxAbs(cont.rawTris,0) - (W/2 + 0.7)) < 1e-6,
    {maxX: maxAbs(cont.rawTris,0)});

  // Lid: two windows through the skirt, still watertight, sized clip+0.8.
  check('lid got 2 skirt windows', (lid.holes||[]).length === 2, lid.holes);
  const mcL = manifoldCheck(lid.rawTris, 4);
  check('lid with windows: watertight & +vol', mcL.watertight && sv(lid.rawTris) > 0, mcL);
  const holeW = lid.holes[0];
  check('window is wider than the ridge', holeW.portW > 6 && holeW.portH > 2.6, holeW);

  // ENGAGEMENT: flipped lid (rx=180) closed on the container — its plate's inner face rests on the
  // container rim (y=H/2). Then a skirt point at local y maps to world Yc − y with
  // Yc = H/2 − H_lid/2 + wall. The window centre must land exactly on the bump centre.
  check('lid is flipped (rx=180)', lid.rx === 180, lid.rx);
  const Hlid = lid.params.height;
  check('lid height = lip + wall', Math.abs(Hlid - (lip + wall)) < 1e-9, Hlid);
  const Yc = H/2 - Hlid/2 + wall;
  const windowWorldY = Yc - holeW.u0;
  const bumpWorldY = cont.logos[0].u0;
  check('closed lid: window centre lands on the bump centre', Math.abs(windowWorldY - bumpWorldY) < 1e-9,
    {windowWorldY, bumpWorldY});
  // The lid cavity must clear the container wall everywhere except the ridge (slip fit),
  // and the ridge must reach INTO the window (interference > 0).
  const cavityHalfW = lid.params.width/2 - wall;
  check('slip fit: cavity clears the wall', cavityHalfW - W/2 > 0.35, {gap: cavityHalfW - W/2});
  check('snap: ridge interferes with the skirt', (W/2 + 0.7) - cavityHalfW > 0.25,
    {interference: (W/2 + 0.7) - cavityHalfW});

  // Plain lid (no clips) must stay exactly as before: no logos added, no holes.
  models.length = 0; activeModelId = null; nextModelId = 1;
  models.push(makeModelRecord('Модель 1', defaultBoxParams()));
  activeModelId = models[0].id;
  Object.assign(paramState.box, { width:40, height:40, depth:40, hollow:true, wallThickness:2 });
  logos.length = 0; boxHoles.length = 0;
  regenerate();
  addLidForActive(false);
  check('plain lid: container has no bump logos', models[0].logos.length === 0, models[0].logos.length);
  check('plain lid: no windows', (models[1].holes||[]).length === 0);
  check('plain lid: watertight', manifoldCheck(models[1].rawTris,4).watertight);

  console.log(`\n=== TOTAL: ${pass} passed, ${fail} failed ===`);
  process.exit(fail ? 1 : 0);
}
main();
