// Finger grip («грип-насечка»): rounded horizontal ridges standing proud of a wall, each a welded
// half-cylinder. Checks: watertight on every wall, ridges stand proud, ridge count, works on
// solid/hollow, coexists with the other organizer features, and the guards. Run via ./run-all.sh.

let pass = 0, fail = 0;
function check(name, cond, extra) {
  if (cond) { pass++; console.log('  OK  ', name); }
  else { fail++; console.log('  FAIL', name, extra!==undefined?JSON.stringify(extra):''); }
}
function sv(t){let v=0;for(const T of t){const a=T[0],b=T[1],c=T[2];v+=(a[0]*(b[1]*c[2]-b[2]*c[1])-a[1]*(b[0]*c[2]-b[2]*c[0])+a[2]*(b[0]*c[1]-b[1]*c[0]))/6;}return v;}
function bbox(t){const lo=[1e9,1e9,1e9],hi=[-1e9,-1e9,-1e9];for(const tr of t)for(const p of tr)for(let a=0;a<3;a++){lo[a]=Math.min(lo[a],p[a]);hi[a]=Math.max(hi[a],p[a]);}return{lo,hi};}
function setBox(over){
  logos.length = 0; boxHoles.length = 0;
  Object.assign(paramState.box, {
    width:60, height:40, depth:50, hollow:true, rim:false, cavityDepth:0, wallThickness:2.5,
    latticeFloor:false, squircle:0, gfOn:false, scoopDir:'none', labelTab:'none', mountHoles:'none', divX:1, divZ:1, stackFeet:false,
    filletRadius:0, hingeRole:undefined, logo3d:false, gripWall:'none', gripCount:4, gripR:1.5,
    taperXPlus:0,taperXMinus:0,taperZPlus:0,taperZMinus:0,taperYPlusX:0,taperYPlusZ:0,taperYMinusX:0,taperYMinusZ:0,
    bulgeXPlus:0,bulgeXMinus:0,bulgeZPlus:0,bulgeZMinus:0,bulgeYPlus:0,bulgeYMinus:0,
  }, over);
  return buildTrisForShape('box', paramState.box);
}

console.log('=== Watertight on every wall + stands proud ===');
{
  const plain = setBox({});
  const pb = bbox(plain);
  for (const [w, axis, sign] of [['front',2,1],['back',2,-1],['left',0,-1],['right',0,1]]) {
    const tris = setBox({ gripWall:w });
    const mc = manifoldCheck(tris, 4);
    check(`grip ${w}: watertight & +vol`, mc.watertight && sv(tris) > 0, mc);
    const b = bbox(tris);
    if (sign > 0) check(`grip ${w}: stands proud (past the wall)`, (axis===2 ? b.hi[2] : b.hi[0]) > (axis===2 ? pb.hi[2] : pb.hi[0]) + 0.3);
    else check(`grip ${w}: stands proud (past the wall)`, (axis===2 ? b.lo[2] : b.lo[0]) < (axis===2 ? pb.lo[2] : pb.lo[0]) - 0.3);
  }
}

console.log('=== Ridge shell alone: count and half-cylinder shape ===');
{
  setBox({ gripWall:'front', gripCount:5, gripR:1.5 });
  const grip = buildFingerGrip(paramState.box);
  check('grip shell is a closed watertight solid', manifoldCheck(grip,4).watertight, manifoldCheck(grip,4));
  // 5 ridges → 5 distinct Y bands. Count distinct ridge-centre Y by the proud-most vertices.
  const wallZ = 25;
  const proud = [];
  for (const tr of grip) for (const p of tr) if (p[2] > wallZ + 0.5) proud.push(Math.round(p[1]*10)/10);
  const ys = [...new Set(proud)].sort((a,b)=>a-b);
  // ridge peaks are the local maxima; at least ~5 clusters. Simple check: proud vertices span a stack.
  check('ridges stack over a vertical range', ys.length >= 5 && (ys[ys.length-1] - ys[0]) > 2, {span:ys.length});
  const b = bbox(grip);
  check('ridge proud by ~R−embed', Math.abs((b.hi[2] - wallZ) - (1.5 - Math.min(1.5*0.5,0.8))) < 0.05, {proud:+(b.hi[2]-wallZ).toFixed(2)});
}

console.log('=== Solid box, coexistence, auto-fit count ===');
{
  check('solid box + grip: watertight', manifoldCheck(setBox({ hollow:false, gripWall:'back', gripCount:8, gripR:2 }),4).watertight);
  check('grip + scoop + label + ears: watertight', manifoldCheck(setBox({ gripWall:'front', scoopDir:'front', labelTab:'back', mountHoles:'2' }),4).watertight);
  // too many ridges for the wall → auto-reduced, still watertight
  check('over-tall stack auto-fits, watertight', manifoldCheck(setBox({ height:20, gripWall:'front', gripCount:12, gripR:2 }),4).watertight);
}

console.log('=== Guards ===');
{
  for (const [name, over] of [
    ['squircle',   { squircle:60 }],
    ['fillet',     { filletRadius:5 }],
    ['wall bulge', { bulgeZPlus:6 }],
    ['taper',      { taperXPlus:15 }],
    ['gridfinity', { gfOn:true }],
  ]) {
    const withGrip = setBox(Object.assign({ gripWall:'front' }, over));
    const without = setBox(over);
    check(`${name}: grip skipped (same mesh), watertight`,
      manifoldCheck(withGrip,4).watertight && withGrip.length === without.length, {a:withGrip.length, b:without.length});
  }
}

paramState.box.gripWall = 'none';
console.log(`\n=== TOTAL: ${pass} passed, ${fail} failed ===`);
process.exit(fail ? 1 : 0);
