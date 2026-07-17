// Gridfinity bin: body gfX·42−0.5 × gfY·42−0.5 × (gfU·7−4.75) hollow container + one socket-profile
// foot per 42mm cell (0.8 chamfer / 1.8 straight / 2.15 chamfer, top 41.5, corner r 0.8→3.75).
// Checks: watertight, exact outer dims, foot protrusion, the SOCKET-FIT invariant (every foot
// vertex stays inside the official profile envelope at its height), and that logos/dividers still
// ride the gf body. Run via ./run-all.sh (extraction test).

let pass = 0, fail = 0;
function check(name, cond, extra) {
  if (cond) { pass++; console.log('  OK  ', name); }
  else { fail++; console.log('  FAIL', name, extra!==undefined?JSON.stringify(extra):''); }
}
function sv(t){let v=0;for(const T of t){const a=T[0],b=T[1],c=T[2];v+=(a[0]*(b[1]*c[2]-b[2]*c[1])-a[1]*(b[0]*c[2]-b[2]*c[0])+a[2]*(b[0]*c[1]-b[1]*c[0]))/6;}return v;}
function bbox(tris){ const lo=[1e9,1e9,1e9], hi=[-1e9,-1e9,-1e9];
  for (const tr of tris) for (const p of tr) for (let a=0;a<3;a++){ lo[a]=Math.min(lo[a],p[a]); hi[a]=Math.max(hi[a],p[a]); }
  return {lo,hi}; }
function setGf(over){
  logos.length = 0; boxHoles.length = 0;
  Object.assign(paramState.box, {
    width:40, height:40, depth:40, hollow:false, rim:false, cavityDepth:0, wallThickness:1.6,
    gfOn:true, gfX:1, gfY:1, gfU:3, gfLip:false, gfMagnets:false,
    divX:1, divZ:1, divT:1.2, divH:100, stackFeet:false, latticeFloor:false, chamferTop:0,
    filletRadius:0, filletTop:0, filletBottom:0, filletVert:0, squircle:0, squircleVBot:0,
    taperXPlus:0,taperXMinus:0,taperZPlus:0,taperZMinus:0,taperYPlusX:0,taperYPlusZ:0,taperYMinusX:0,taperYMinusZ:0,
    bulgeXPlus:0,bulgeXMinus:0,bulgeZPlus:0,bulgeZMinus:0,bulgeYPlus:0,bulgeYMinus:0,
    hingeRole:undefined, logo3d:false,
  }, over);
  return buildTrisForShape('box', paramState.box);
}
// official socket envelope: half-size allowed at height dy above the foot bottom (worst-case
// square cross-section; the corner radius only makes the real foot SMALLER than this)
function envelopeHalf(dy){
  if (dy <= 0.8) return 35.6/2 + dy + 1e-6;            // 45° chamfer
  if (dy <= 2.6) return 37.2/2 + 1e-6;                 // straight
  return 37.2/2 + (dy - 2.6) + 1e-6;                   // 45° chamfer to 41.5 at 4.75
}

console.log('=== 1×1×3u bin ===');
{
  const tris = setGf({});
  const mc = manifoldCheck(tris, 4);
  check('watertight & +vol', mc.watertight && sv(tris) > 0, mc);
  const b = bbox(tris);
  check('footprint 41.5×41.5', Math.abs((b.hi[0]-b.lo[0]) - 41.5) < 1e-6 && Math.abs((b.hi[2]-b.lo[2]) - 41.5) < 1e-6,
    {dx:+(b.hi[0]-b.lo[0]).toFixed(3), dz:+(b.hi[2]-b.lo[2]).toFixed(3)});
  // total height = body (3·7−4.75=16.25) + foot 4.75 = 21 = gfU·7
  check('total height = gfU·7 = 21', Math.abs((b.hi[1]-b.lo[1]) - 21) < 1e-6, {h:+(b.hi[1]-b.lo[1]).toFixed(3)});
  // SOCKET FIT: every vertex below the body bottom must stay inside the profile envelope
  const yBody = -16.25/2;
  let worst = -1e9;
  for (const tr of tris) for (const p of tr) {
    if (p[1] >= yBody - 1e-9) continue;
    const dy = p[1] - (yBody - 4.75);
    const over = Math.max(Math.abs(p[0]), Math.abs(p[2])) - envelopeHalf(dy);
    worst = Math.max(worst, over);
  }
  check('every foot vertex inside the socket envelope', worst <= 0, {worstOver:+worst.toFixed(4)});
  // foot bottom face is 35.6 wide (bed contact)
  let botMax = 0;
  for (const tr of tris) for (const p of tr)
    if (Math.abs(p[1] - (yBody-4.75)) < 1e-6) botMax = Math.max(botMax, Math.abs(p[0]));
  check('foot bottom ≈ 35.6 wide', Math.abs(botMax - 17.8) < 1e-6, {botMax});
}

console.log('\n=== 3×2×2u bin: 6 feet on the 42mm grid ===');
{
  const tris = setGf({ gfX:3, gfY:2, gfU:2 });
  const mc = manifoldCheck(tris, 4);
  check('3×2: watertight', mc.watertight, mc);
  const b = bbox(tris);
  check('3×2 footprint 125.5 × 83.5', Math.abs((b.hi[0]-b.lo[0]) - (3*42-0.5)) < 1e-6 &&
    Math.abs((b.hi[2]-b.lo[2]) - (2*42-0.5)) < 1e-6, {dx:+(b.hi[0]-b.lo[0]).toFixed(2), dz:+(b.hi[2]-b.lo[2]).toFixed(2)});
  // feet sit on cell centres ±42: vertices at the foot-bottom plane cluster around x = −42, 0, +42
  const yBot = b.lo[1];
  const xs = new Set();
  for (const tr of tris) for (const p of tr)
    if (Math.abs(p[1]-yBot) < 1e-6) xs.add(Math.round(p[0]/GF_PITCH));
  check('feet on the 42mm grid (x ∈ {−42,0,42})', xs.has(-1) && xs.has(0) && xs.has(1), [...xs]);
}

console.log('\n=== Body features still work on a gf bin ===');
{
  const withDiv = setGf({ gfX:2, gfY:1, divX:2 });
  check('gf + dividers: watertight', manifoldCheck(withDiv,4).watertight);
  const hm = new Float32Array(LOGO_HM_SIZE*LOGO_HM_SIZE).fill(1);
  logos.push({ id:1, face:'+Z', u0:0, v0:0, w:14, h:6, depth:0.8, threshold:0.5, invert:false, rotation:0, heightmap:hm });
  Object.assign(paramState.box, { divX:1 });
  const withLogo = buildTrisForShape('box', paramState.box);
  check('gf + logo relief: watertight', manifoldCheck(withLogo,4).watertight);
  logos.length = 0;
  // outer dims are overridden while gfOn: width param is ignored
  const a = setGf({ width: 500 });
  const bb = bbox(a);
  check('user width ignored while gfOn', Math.abs((bb.hi[0]-bb.lo[0]) - 41.5) < 1e-6, {dx:+(bb.hi[0]-bb.lo[0]).toFixed(2)});
  // gfOn off -> ordinary box untouched
  const off = setGf({ gfOn:false });
  check('gfOn off: plain 40³ box', Math.abs(sv(off) - 40*40*40) < 1e-6, {vol:+sv(off).toFixed(0)});
}

console.log('\n=== Stacking lip (gfLip) ===');
{
  const tris = setGf({ gfLip:true });
  const mc = manifoldCheck(tris, 4);
  check('lip: watertight', mc.watertight, mc);
  const b = bbox(tris);
  check('lip adds 4.4mm on top (21 → 25.4)', Math.abs((b.hi[1]-b.lo[1]) - 25.4) < 1e-6, {h:+(b.hi[1]-b.lo[1]).toFixed(2)});
  check('lip stays flush with the footprint', Math.abs((b.hi[0]-b.lo[0]) - 41.5) < 1e-6, {dx:+(b.hi[0]-b.lo[0]).toFixed(3)});
  // NESTING: simulate inserting a foot until first contact — the seat must be deep (≥4.2 of the
  // 4.4 lip) and contact must land on the 45° chamfer pair (self-centring), never mid-straight.
  const lipOpening = d => 20.75 - (d <= 0 ? 0.25 : d < 1.65 ? 0.25 + d : d < 3.3 ? 1.9 : d < 4.1 ? 1.9 + (d - 3.3) : 2.7);
  const footFromTip = t => t <= 0 ? 17.8 : t < 0.8 ? 17.8 + t : t < 2.6 ? 18.6 : Math.min(20.75, 18.6 + (t - 2.6));
  let seat = 0;
  for (let S = 0; S <= 4.4; S += 0.01) {
    let ok = true;
    for (let t = 0; t <= S; t += 0.05) if (footFromTip(t) > lipOpening(S - t) + 1e-9) ok = false;
    if (ok) seat = S;
  }
  check('foot seats deep into the lip (≥4.2 of 4.4)', seat >= 4.2, {seat:+seat.toFixed(2)});
  check('seated foot leaves a small stand-off (stacking pitch)', 4.75 - seat > 0.2 && 4.75 - seat < 0.8,
    {standOff:+(4.75-seat).toFixed(2)});
}

console.log('\n=== Magnet pockets (gfMagnets) ===');
{
  const plain = setGf({});
  const tris = setGf({ gfMagnets:true });
  const mc = manifoldCheck(tris, 4);
  check('magnets: watertight', mc.watertight, mc);
  check('magnets remove material (4 pockets)', sv(plain) - sv(tris) > 4*Math.PI*3.25*3.25*2.4*0.7,
    {cut:+(sv(plain)-sv(tris)).toFixed(1)});
  const b = bbox(tris), yBot = b.lo[1];
  // pocket ceiling: highest vertex inside the pocket footprint just above the foot bottom
  let ceil = -1e9, rimMin = 1e9;
  for (const tr of tris) for (const p of tr) {
    const rr = Math.hypot(p[0]-13, p[2]-13);
    if (rr < 3.3 && p[1] > yBot + 1e-6 && p[1] < yBot + 4) ceil = Math.max(ceil, p[1]);
    if (Math.abs(p[1]-yBot) < 1e-9 && rr < 3.3) rimMin = Math.min(rimMin, rr);
  }
  check('pocket is 2.4mm deep', Math.abs((ceil - yBot) - 2.4) < 1e-6, {d:+(ceil-yBot).toFixed(2)});
  check('pocket entry ring at r=3.25 (Ø6.5)', Math.abs(rimMin - 3.25) < 1e-6, {rimMin:+rimMin.toFixed(3)});
  // 2×2: all 16 pockets, still watertight
  const big = setGf({ gfMagnets:true, gfLip:true, gfX:2, gfY:2 });
  check('2×2 + lip + magnets: watertight', manifoldCheck(big,4).watertight);
}

paramState.box.gfOn = false;
console.log(`\n=== TOTAL: ${pass} passed, ${fail} failed ===`);
process.exit(fail ? 1 : 0);
