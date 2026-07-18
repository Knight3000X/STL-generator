// Model slicer: cut a finished mesh into a grid of watertight fragments no larger than a chosen size
// per axis (for splitting a print that doesn't fit the bed). Exercises the REAL in-page
// sliceMeshIntoFragments + the frozen-mesh round-trip through buildTrisForShape + sliceActiveModel's
// model bookkeeping. Each fragment must be watertight, fragments must reassemble to the original volume,
// and the cut must actually produce the expected number of pieces. Run via ./run-all.sh (extraction test).

let pass=0, fail=0;
function chk(name,cond,extra){ if(cond){pass++;console.log('  OK  ',name);} else {fail++;console.log('  FAIL',name, extra!==undefined?JSON.stringify(extra):'');} }
function vol(t){let v=0;for(const T of t){const a=T[0],b=T[1],c=T[2];v+=(a[0]*(b[1]*c[2]-b[2]*c[1])-a[1]*(b[0]*c[2]-b[2]*c[0])+a[2]*(b[0]*c[1]-b[1]*c[0]))/6;}return v;}
function hasNaN(t){for(const tr of t)for(const p of tr)for(const c of p)if(!Number.isFinite(c))return true;return false;}
function bbox(t){const lo=[1e9,1e9,1e9],hi=[-1e9,-1e9,-1e9];for(const tr of t)for(const p of tr)for(let a=0;a<3;a++){lo[a]=Math.min(lo[a],p[a]);hi[a]=Math.max(hi[a],p[a]);}return{lo,hi};}
function build(ov){
  logos.length=0; boxHoles.length=0;
  Object.assign(paramState.box,{ width:80,height:60,depth:70,hollow:false,rim:false,wallThickness:3,
    latticeFloor:false,latticeWalls:'none',squircle:0,squircleVBot:0,gfOn:false,scoopDir:'none',labelTab:'none',
    mountHoles:'none',gripWall:'none',divX:1,divZ:1,stackFeet:false,filletRadius:0,filletTop:0,filletBottom:0,
    filletVert:0,filletInnerFloor:0,filletInnerVert:0,filletInnerLip:0,chamferTop:0,hingeRole:undefined,logo3d:false,fragSize:180,
    taperXPlus:0,taperXMinus:0,taperZPlus:0,taperZMinus:0,taperYPlusX:0,taperYPlusZ:0,taperYMinusX:0,taperYMinusZ:0,
    bulgeXPlus:0,bulgeXMinus:0,bulgeZPlus:0,bulgeZMinus:0,bulgeYPlus:0,bulgeYMinus:0 }, ov);
  return buildTrisForShape('box', paramState.box);
}
function slice(name, tris, sx,sy,sz, expFrags){
  const orig=vol(tris);
  const { frags } = sliceMeshIntoFragments(tris, sx,sy,sz);
  let allWT=true, worst=null, sum=0, nan=false;
  for(const f of frags){ const mc=manifoldCheck(f.tris,4); if(!mc.watertight){allWT=false; if(!worst)worst=mc;} if(hasNaN(f.tris))nan=true; sum+=vol(f.tris); }
  chk(`${name}: ${frags.length} frags all watertight`, allWT && !nan, worst);
  chk(`${name}: fragment volume sum == original`, Math.abs(sum-orig) < Math.abs(orig)*0.02+1, {orig:+orig.toFixed(1), sum:+sum.toFixed(1)});
  if(expFrags!=null) chk(`${name}: ${expFrags} fragments`, frags.length===expFrags, {got:frags.length});
  // no fragment exceeds the requested size (+ small clip tolerance) on any axis
  let sizeOK=true; for(const f of frags){ const b=f.bb; if(b.hi[0]-b.lo[0] > sx+0.01 || b.hi[1]-b.lo[1] > sy+0.01 || b.hi[2]-b.lo[2] > sz+0.01) sizeOK=false; }
  chk(`${name}: no fragment exceeds the size`, sizeOK);
  return frags;
}

console.log('=== solid box 80x60x70 across sizes ===');
slice('solid /40', build({}), 40,40,40, 2*2*2);
slice('solid /30', build({}), 30,30,30, 3*2*3);
slice('solid /25', build({}), 25,25,25, null);
slice('solid /100 (fits, no cut)', build({}), 100,100,100, 1);
slice('solid /35 X-only', build({}), 35,999,999, 3);
slice('solid /35 Z-only', build({}), 999,999,35, 2);

console.log('=== hollow container (annulus cross-sections → capped with holes) ===');
slice('hollow /40', build({hollow:true, wallThickness:3}), 40,40,40, null);
slice('hollow /30', build({hollow:true, wallThickness:4}), 30,30,30, null);
slice('hollow tall 40x90x40 /25', build({hollow:true, width:40,height:90,depth:40, wallThickness:3}), 25,25,25, null);

console.log('=== rounded / squircle (curved cross-sections) ===');
slice('squircle /35', build({hollow:true, squircle:60, wallThickness:3}), 35,35,35, null);
slice('fillet /35',  build({hollow:true, filletRadius:8, wallThickness:3}), 35,35,35, null);
slice('solid fillet /40', build({filletRadius:6}), 40,40,40, null);

console.log('=== tapered walls ===');
slice('taper /40', build({taperXPlus:10, taperZMinus:8}), 40,40,40, null);

console.log('=== frozen fragment round-trips through buildTrisForShape ===');
{
  const frags = sliceMeshIntoFragments(build({}), 40,40,40).frags;
  const id = nextFrozenId++; frozenMeshes.set(id, frags[0].tris);
  chk('frozen mesh returned verbatim by buildTrisForShape', buildTrisForShape('box', {frozenId:id}) === frags[0].tris);
  chk('frozen mesh watertight', manifoldCheck(buildTrisForShape('box', {frozenId:id}), 4).watertight);
}

console.log('=== sliceActiveModel creates fragment models ===');
{
  models.length = 0; activeModelId = null; nextModelId = 1;
  models.push(makeModelRecord('Деталь', defaultBoxParams()));
  activeModelId = models[0].id;
  Object.assign(paramState.box, defaultBoxParams(), { width:80, height:60, depth:70, hollow:false, fragSize:40 });
  saveActiveModel(); regenerate();
  const before = models.length;
  sliceActiveModel();
  chk('active model split into 8 fragment models', models.length === before - 1 + 8, {before, after:models.length});
  chk('every fragment model carries a frozenId', models.every(m => m.params.frozenId != null));
  chk('every fragment model mesh watertight', models.every(m => manifoldCheck(m.rawTris, 4).watertight));
  // slicing when the model already fits does nothing (no split)
  Object.assign(paramState.box, { fragSize: 500 }); saveActiveModel();
  const n2 = models.length; sliceActiveModel();
  chk('no split when the model already fits', models.length === n2);
}

paramState.box.fragSize = 180;
console.log(`\n=== TOTAL: ${pass} passed, ${fail} failed ===`);
process.exit(fail ? 1 : 0);
