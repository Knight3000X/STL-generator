// Diamond-lattice through-hole FLOOR for the flat hollow container, exercised through the REAL
// buildTrisForShape routing (makeLatticeOpts -> buildHollowBox -> emitLatticeFloor). Must stay
// watertight across sizes, cell/rib/border, wall taper, and with wall logos present.
// Run:
//   awk '/<script>/{f=1;next}/<\/script>/{f=0}f' parametric-stl-generator.html \
//     | sed '$ { /^init();$/d }' > /tmp/lib.js
//   cat stub_preamble.js /tmp/lib.js test_lattice_floor.js > /tmp/run.js && node /tmp/run.js

let pass=0, fail=0;
function chk(name,cond,extra){ if(cond){pass++;console.log('  OK  ',name);} else {fail++;console.log('  FAIL',name, extra!==undefined?JSON.stringify(extra):'');} }
function hasNaN(t){for(const tr of t)for(const p of tr)for(const c of p)if(!Number.isFinite(c))return true;return false;}
function synthHM(){ const N=LOGO_HM_SIZE, hm=new Float32Array(N*N);
  for(let y=0;y<N;y++)for(let x=0;x<N;x++){ const fx=x/N-0.5, fy=y/N-0.5, r=Math.hypot(fx,fy);
    hm[y*N+x]=((r>0.28&&r<0.40)||(Math.abs(fx-fy)<0.06&&r<0.42))?1:0; } return hm; }
const HM=synthHM();
function base(ov){
  Object.assign(paramState.box,{width:60,height:60,depth:60,hollow:false,rim:false,wallThickness:4,rimHeight:20,filletSeg:6,
    filletRadius:0,filletTop:0,filletBottom:0,filletVert:0,filletInnerFloor:0,filletInnerVert:0,filletInnerLip:0,
    latticeFloor:false,latticeCell:8,latticeRib:2,latticeBorder:1,
    taperXPlus:0,taperXMinus:0,taperZPlus:0,taperZMinus:0,taperYPlusX:0,taperYPlusZ:0,taperYMinusX:0,taperYMinusZ:0},ov);
  logos.length=0;
}
function addLogo(ov, clamp){ const l=Object.assign({id:nextLogoId++,face:'+X',u0:0,v0:0,w:14,h:14,depth:1.5,threshold:0.5,invert:false,rotation:0,heightmap:HM,previewUrl:null},ov); logos.push(l); if(clamp) clampLogoToFace(l); return l; }

// count HOLE fine cells the real diagonal-net emit produces (mirror of emitLatticeFloor mask)
function holeCount(){
  const p=paramState.box, hw=p.width/2, hd=p.depth/2;
  const t=clampWallThickness(p.width,p.height,p.depth,p.wallThickness);
  const lat=makeLatticeOpts(p), pitch=Math.max(1e-3,lat.cell);
  const xP=buildAxisPositions(hw,[-(hw-t),hw-t],logoResolution), zP=buildAxisPositions(hd,[-(hd-t),hd-t],logoResolution);
  const xMid=midSlice(xP,-(hw-t),hw-t), zMid=midSlice(zP,-(hd-t),hd-t);
  const nx=xMid.length-1, nz=zMid.length-1, xi0=xMid[0], zi0=zMid[0];
  const b=Math.min(Math.max(1,lat.borderCells), Math.floor(nx/2), Math.floor(nz/2));
  const rh=(lat.rib/2)*Math.SQRT2/pitch;
  let n=0;
  for(let i=0;i<nx;i++)for(let j=0;j<nz;j++){
    if(i<b||i>=nx-b||j<b||j>=nz-b) continue;
    const cx=(xMid[i]+xMid[i+1])/2-xi0, cz=(zMid[j]+zMid[j+1])/2-zi0;
    const uu=(cx+cz)/pitch, vv=(cx-cz)/pitch;
    if(!(Math.abs(uu-Math.round(uu))<rh||Math.abs(vv-Math.round(vv))<rh)) n++;
  }
  return n;
}
function wt(name, boxOv, logoOvs, clamp){
  base(boxOv); for(const o of (logoOvs||[])) addLogo(o, clamp);
  const tris=buildTrisForShape('box',paramState.box); const mc=manifoldCheck(tris,5);
  const holes=holeCount();
  chk(name+`  (tris=${tris.length}, holes=${holes})`, !hasNaN(tris)&&mc.watertight, {open:mc.openEdges, bad:mc.badEdges});
  return {tris,holes};
}

const L = {hollow:true, latticeFloor:true};

console.log('=== flat hollow + diagonal NET floor: watertight across params ===');
wt('60^3 pitch10 rib2 b2',    {...L, wallThickness:4, latticeCell:10, latticeRib:2, latticeBorder:2});
wt('60^3 pitch8 rib1.5 b2',   {...L, wallThickness:4, latticeCell:8, latticeRib:1.5, latticeBorder:2});
wt('60^3 pitch12 rib1.3 b1',  {...L, wallThickness:4, latticeCell:12, latticeRib:1.3, latticeBorder:1});
wt('60^3 pitch7 rib2 b2',     {...L, wallThickness:3, latticeCell:7, latticeRib:2, latticeBorder:2});
wt('80x50x60 pitch9 rib2 b2', {...L, width:80,height:50,depth:60, wallThickness:4, latticeCell:9, latticeRib:2, latticeBorder:2});
wt('40^3 pitch7 rib1.4 b2',   {...L, width:40,height:40,depth:40, wallThickness:3, latticeCell:7, latticeRib:1.4, latticeBorder:2});
wt('thin wall 1.5 pitch8 b2', {...L, wallThickness:1.5, latticeCell:8, latticeRib:1.6, latticeBorder:2});
wt('thin rib pitch10 rib1',   {...L, wallThickness:4, latticeCell:10, latticeRib:1, latticeBorder:2});  // pinch-removal path
wt('fat rib pitch8 rib4',     {...L, wallThickness:4, latticeCell:8, latticeRib:4, latticeBorder:2});
wt('border 0 -> clamps to 1', {...L, wallThickness:4, latticeCell:8, latticeRib:2, latticeBorder:0});
wt('coarse pitch20 b1',       {...L, wallThickness:4, latticeCell:20, latticeRib:3, latticeBorder:1});
wt('tall 30x80x30 pitch6',    {...L, width:30,height:80,depth:30, wallThickness:3, latticeCell:6, latticeRib:1.5, latticeBorder:2});

console.log('=== lattice floor + WALL logos (relief on walls, holes in floor) ===');
wt('lattice + +X logo',  {...L, wallThickness:4, latticeCell:8}, [{face:'+X',u0:0,v0:0,w:16,h:16}]);
wt('lattice + -Z logo',  {...L, wallThickness:4, latticeCell:8}, [{face:'-Z',u0:0,v0:0,w:16,h:16,depth:-1.2}]);
wt('lattice + 2 walls',  {...L, wallThickness:4, latticeCell:8}, [{face:'+X',u0:0,v0:0,w:14,h:14},{face:'+Z',u0:0,v0:0,w:14,h:14}]);
wt('lattice + floor logo ignored', {...L, wallThickness:4, latticeCell:8}, [{face:'-Y-inner',u0:0,v0:0,w:14,h:14}]);

console.log('=== lattice floor + TAPER (angled walls) ===');
wt('taper 8/8 cell8',    {...L, wallThickness:4, latticeCell:8, taperXPlus:8,taperXMinus:8,taperZPlus:8,taperZMinus:8});
wt('taper mixed cell7',  {...L, wallThickness:4, latticeCell:7, taperXPlus:10,taperZMinus:-6});
wt('taper + wall logo',  {...L, wallThickness:4, latticeCell:8, taperXPlus:8,taperXMinus:8,taperZPlus:8,taperZMinus:8}, [{face:'+X',u0:0,v0:0,w:14,h:14}]);

console.log('=== regression: hollow WITHOUT lattice still watertight ===');
wt('plain hollow no lattice', {hollow:true, wallThickness:4});
wt('plain hollow + wall logo',{hollow:true, wallThickness:4}, [{face:'+X',u0:0,v0:0,w:16,h:16}]);

console.log('=== sanity ===');
const a=wt('holes present',   {...L, wallThickness:4, latticeCell:7, latticeRib:2, latticeBorder:1});
chk('has through-holes', a.holes>0, a.holes);
const vol=(t=>{let v=0;for(const[A,B,C]of t)v+=A[0]*(B[1]*C[2]-B[2]*C[1])-A[1]*(B[0]*C[2]-B[2]*C[0])+A[2]*(B[0]*C[1]-B[1]*C[0]);return v/6;})(a.tris);
chk('volume positive', vol>0, vol);

console.log('=== DECOUPLING: wall/cavity detail must NOT change with cell size ===');
// floor slab lives at y in [-hh, -(hh-t)]; anything above is wall/cavity/rim. Count that set —
// it must be byte-identical across cell sizes (proves cell no longer coarsens the walls/logos).
function wallTriCount(cell){
  base({...L, wallThickness:4, latticeCell:cell, latticeRib:1.5, latticeBorder:1});
  addLogo({face:'+X',u0:0,v0:0,w:16,h:16}, false);
  const tris=buildTrisForShape('box',paramState.box);
  const hh=paramState.box.height/2, t=clampWallThickness(paramState.box.width,paramState.box.height,paramState.box.depth,paramState.box.wallThickness);
  const yt=-(hh-t)+1e-6;
  let n=0; for(const tr of tris) if(Math.min(tr[0][1],tr[1][1],tr[2][1])>=yt) n++;
  return n;
}
const wc2=wallTriCount(2.5), wc8=wallTriCount(8), wc20=wallTriCount(20);
chk('wall+cavity tris identical across cell (2.5 vs 8)', wc2===wc8, {wc2,wc8});
chk('wall+cavity tris identical across cell (8 vs 20)', wc8===wc20, {wc8,wc20});

console.log('\n=== TOTAL:', pass, 'passed,', fail, 'failed ===');
if(fail>0) process.exit(1);
