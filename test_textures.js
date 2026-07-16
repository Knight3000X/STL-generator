// Procedural surface textures («рифление / точки / решётка»): binary repeating heightmaps poured
// into the ordinary logo pipeline. Checks: maps are sharp 0/1 with a sane raised share and real
// periodicity, and each kind embosses a solid face AND a hollow-container wall watertight.
// Run via ./run-all.sh (extraction test).

let pass = 0, fail = 0;
function check(name, cond, extra) {
  if (cond) { pass++; console.log('  OK  ', name); }
  else { fail++; console.log('  FAIL', name, extra!==undefined?JSON.stringify(extra):''); }
}
function sv(t){let v=0;for(const T of t){const a=T[0],b=T[1],c=T[2];v+=(a[0]*(b[1]*c[2]-b[2]*c[1])-a[1]*(b[0]*c[2]-b[2]*c[0])+a[2]*(b[0]*c[1]-b[1]*c[0]))/6;}return v;}
function setBox(over){
  logos.length = 0; boxHoles.length = 0;
  Object.assign(paramState.box, {
    width:50, height:50, depth:50, hollow:false, rim:false, wallThickness:2.5,
    divX:1, divZ:1, stackFeet:false, squircle:0, squircleVBot:0, latticeFloor:false,
    filletRadius:0, filletTop:0, filletBottom:0, filletVert:0, logo3d:false, hingeRole:undefined,
    taperXPlus:0,taperXMinus:0,taperZPlus:0,taperZMinus:0,taperYPlusX:0,taperYPlusZ:0,taperYMinusX:0,taperYMinusZ:0,
    bulgeXPlus:0,bulgeXMinus:0,bulgeZPlus:0,bulgeZMinus:0,bulgeYPlus:0,bulgeYMinus:0, chamferTop:0,
  }, over);
}

const share = hm => { let d=0; for (const v of hm) d+=v; return d/hm.length; };

console.log('=== Heightmap sanity per kind ===');
for (const kind of Object.keys(TEXTURE_KINDS)) {
  const res = makeTextureLogoResult(kind);
  check(`${kind}: created, aspect 1`, !!res && res.aspect === 1);
  let sharp = true; for (const v of res.heightmap) if (v!==0 && v!==1) sharp=false;
  check(`${kind}: sharp 0/1`, sharp);
  const sh = share(res.heightmap);
  check(`${kind}: raised share sane`, sh > 0.15 && sh < 0.85, +sh.toFixed(2));
}
check('unknown kind -> null', makeTextureLogoResult('nope') === null);

console.log('\n=== Periodicity: ribs repeat 12× along the axis ===');
{
  const S = LOGO_HM_SIZE, hm = makeTextureLogoResult('ribs-v').heightmap;
  let transitions = 0;
  for (let x = 1; x < S; x++) if (hm[x] !== hm[x-1]) transitions++;
  check('ribs-v: ~24 transitions on a row', Math.abs(transitions - 24) <= 2, transitions);
  const hmH = makeTextureLogoResult('ribs-h').heightmap;
  let tV = 0; for (let y = 1; y < S; y++) if (hmH[y*S] !== hmH[(y-1)*S]) tV++;
  check('ribs-h: ~24 transitions on a column', Math.abs(tV - 24) <= 2, tV);
}

console.log('\n=== Each texture embosses watertight: solid face + hollow wall ===');
for (const kind of Object.keys(TEXTURE_KINDS)) {
  const res = makeTextureLogoResult(kind);
  setBox({});
  logos.push({ id:1, face:'+Z', u0:0, v0:0, w:36, h:36, depth:0.8, threshold:0.5, invert:false,
    rotation:0, heightmap: res.heightmap, aspect:1 });
  const solid = buildTrisForShape('box', paramState.box);
  const mcS = manifoldCheck(solid, 4);
  check(`${kind} on solid face: watertight`, mcS.watertight, mcS);
  setBox({ hollow:true });
  logos.push({ id:1, face:'+X', u0:0, v0:0, w:30, h:30, depth:0.8, threshold:0.5, invert:false,
    rotation:0, heightmap: res.heightmap, aspect:1 });
  const hol = buildTrisForShape('box', paramState.box);
  const mcH = manifoldCheck(hol, 4);
  check(`${kind} on hollow wall: watertight & +vol`, mcH.watertight && sv(hol) > 0, mcH);
}

logos.length = 0;
console.log(`\n=== TOTAL: ${pass} passed, ${fail} failed ===`);
process.exit(fail ? 1 : 0);
