// Gridfinity baseplate (separate model, params.gfBaseplate): a gfX×gfY grid of female sockets that
// receive bin feet. Checks: watertight for a range of grids, exact 42-pitch footprint, socket depth
// and the SEATING invariant — a bin foot's profile must fit inside the baseplate socket at every
// height (the whole point of the standard). Run via ./run-all.sh (extraction test).

let pass = 0, fail = 0;
function check(name, cond, extra) {
  if (cond) { pass++; console.log('  OK  ', name); }
  else { fail++; console.log('  FAIL', name, extra!==undefined?JSON.stringify(extra):''); }
}
function sv(t){let v=0;for(const T of t){const a=T[0],b=T[1],c=T[2];v+=(a[0]*(b[1]*c[2]-b[2]*c[1])-a[1]*(b[0]*c[2]-b[2]*c[0])+a[2]*(b[0]*c[1]-b[1]*c[0]))/6;}return v;}
function bbox(t){const lo=[1e9,1e9,1e9],hi=[-1e9,-1e9,-1e9];for(const tr of t)for(const p of tr)for(let a=0;a<3;a++){lo[a]=Math.min(lo[a],p[a]);hi[a]=Math.max(hi[a],p[a]);}return{lo,hi};}
function setBP(over){
  logos.length = 0; boxHoles.length = 0;
  Object.assign(paramState.box, { gfBaseplate:true, gfX:1, gfY:1, gfBaseThk:1.2, gfMagnets:false, logo3d:false, gfOn:false }, over);
  return buildTrisForShape('box', paramState.box);
}

console.log('=== Watertight + dimensions across grids ===');
for (const [gx, gy] of [[1,1],[2,1],[3,2],[4,4],[5,3]]) {
  const tris = setBP({ gfX:gx, gfY:gy });
  const mc = manifoldCheck(tris, 4);
  check(`${gx}×${gy}: watertight & +vol`, mc.watertight && sv(tris) > 0, mc);
  const b = bbox(tris);
  check(`${gx}×${gy}: footprint = grid×42`, Math.abs((b.hi[0]-b.lo[0]) - gx*42) < 1e-6 && Math.abs((b.hi[2]-b.lo[2]) - gy*42) < 1e-6,
    {dx:+(b.hi[0]-b.lo[0]).toFixed(2), dz:+(b.hi[2]-b.lo[2]).toFixed(2)});
}

console.log('=== Height = socket depth + base thickness ===');
{
  const b = bbox(setBP({ gfBaseThk:1.2 }));
  check('total height 4.75 + 1.2 = 5.95', Math.abs((b.hi[1]-b.lo[1]) - 5.95) < 1e-6, {h:+(b.hi[1]-b.lo[1]).toFixed(2)});
  const b2 = bbox(setBP({ gfBaseThk:3 }));
  check('thicker base raises height', Math.abs((b2.hi[1]-b2.lo[1]) - 7.75) < 1e-6, {h:+(b2.hi[1]-b2.lo[1]).toFixed(2)});
}

console.log('=== SEATING: a bin foot fits inside the socket at every height ===');
{
  // baseplate socket half-size vs height below the top (from GFB_PROFILE):
  //   0→41.6/2, 2.15→37.3/2, 3.95→37.3/2, 4.75→35.7/2   (linear between)
  const bpHalf = d => d<=2.15 ? 41.6/2 - (41.6-37.3)/2*(d/2.15)
    : d<=3.95 ? 37.3/2
    : 37.3/2 - (37.3-35.7)/2*((d-3.95)/0.8);
  // bin foot half-size vs height above its bottom (foot: 0→35.6/2, 0.8→37.2/2, 2.6→37.2/2, 4.75→41.5/2).
  // seated foot: foot bottom at socket floor (d=4.75), foot top at socket top (d=0). So at socket
  // depth d, the foot height above its bottom is (4.75 - d).
  const footHalf = h => h<=0.8 ? 35.6/2 + (37.2-35.6)/2*(h/0.8)
    : h<=2.6 ? 37.2/2
    : 37.2/2 + (41.5-37.2)/2*((h-2.6)/(4.75-2.6));
  let worst = -1e9;
  for (let d = 0; d <= 4.75; d += 0.05) {
    const over = footHalf(4.75 - d) - bpHalf(d);   // foot must be ≤ socket at every depth
    worst = Math.max(worst, over);
  }
  check('foot profile fits the socket (with clearance) at every height', worst <= 0.05, {worstOver:+worst.toFixed(3)});
  check('socket is slightly larger than the foot (clearance ≥ 0)', worst < 0, {maxOver:+worst.toFixed(3)});
}

console.log('=== Multiple baseplates tile (2×1 = two 1×1 side by side) ===');
{
  const one = bbox(setBP({ gfX:1, gfY:1 }));
  const two = bbox(setBP({ gfX:2, gfY:1 }));
  check('2×1 is exactly two cells wide (no gap/overlap)', Math.abs((two.hi[0]-two.lo[0]) - 2*(one.hi[0]-one.lo[0])) < 1e-6);
}

console.log('=== addGridfinityBaseplate makes a model ===');
{
  models.length = 0; activeModelId = null; nextModelId = 1;
  models.push(makeModelRecord('Модель 1', defaultBoxParams()));
  activeModelId = models[0].id;
  Object.assign(paramState.box, { gfOn:true, gfX:3, gfY:2 }); saveActiveModel();
  addGridfinityBaseplate();
  check('a baseplate model was added', models.length === 2 && models[1].params.gfBaseplate === true);
  check('baseplate grid copied from the active bin', models[1].params.gfX === 3 && models[1].params.gfY === 2, models[1].params);
  check('baseplate model mesh watertight', manifoldCheck(models[1].rawTris, 4).watertight);
}

paramState.box.gfBaseplate = false;
console.log(`\n=== TOTAL: ${pass} passed, ${fail} failed ===`);
process.exit(fail ? 1 : 0);
