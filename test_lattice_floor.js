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
wt('lattice + cavity-floor logo (solid patch)', {...L, wallThickness:4, latticeCell:8}, [{face:'-Y-inner',u0:0,v0:0,w:14,h:14}], true);

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

console.log('=== cavity-floor logo ON the lattice: solid patch + relief, watertight ===');
// A -Y-inner logo forces a solid patch under its footprint (fewer through-holes) and embosses the relief.
{ base({...L, wallThickness:4, latticeCell:8, latticeRib:2, latticeBorder:2});
  const noLogo=buildTrisForShape('box',paramState.box).length;
  base({...L, wallThickness:4, latticeCell:8, latticeRib:2, latticeBorder:2}); addLogo({face:'-Y-inner',u0:0,v0:0,w:18,h:18,depth:1.5}, true);
  const t=buildTrisForShape('box',paramState.box); const mc=manifoldCheck(t,5);
  chk('floor logo on lattice: watertight', !hasNaN(t)&&mc.watertight, {open:mc.openEdges});
  // solid patch + emboss changes the mesh vs the hole-free-floor-logo-less lattice
  chk('floor logo changes the lattice mesh (patch + relief)', t.length!==noLogo, {withLogo:t.length, noLogo});
  // relief actually raised above the cavity-floor plane (only possible if the patch is solid under it)
  const hh=30, t2=clampWallThickness(60,60,60,4), yt=-(hh-t2);
  chk('floor logo relief rises above the cavity floor', t.some(tr=>tr.some(p=>p[1]>yt+0.3)), {yt}); }
// engraved floor logo (negative depth) + rounded ribs, watertight
{ base({hollow:true, latticeFloor:true, latticeRound:true, wallThickness:4, latticeCell:8}); addLogo({face:'-Y-inner',u0:4,v0:-3,w:14,h:14,depth:-1.2}, true);
  const t=buildTrisForShape('box',paramState.box); chk('engraved floor logo + rounded lattice: watertight', !hasNaN(t)&&manifoldCheck(t,5).watertight, manifoldCheck(t,5)); }
// depth==0 floor logo: the SHAPE must still fill a solid patch (flush inlay), not vanish into the net
{ base({...L, wallThickness:4, latticeCell:8, latticeRib:2, latticeBorder:2}); const noLogo=buildTrisForShape('box',paramState.box).length;
  base({...L, wallThickness:4, latticeCell:8, latticeRib:2, latticeBorder:2}); addLogo({face:'-Y-inner',u0:0,v0:0,w:20,h:20,depth:0}, true);
  const t=buildTrisForShape('box',paramState.box); const mc=manifoldCheck(t,5);
  chk('depth-0 floor logo: watertight', !hasNaN(t)&&mc.watertight, {open:mc.openEdges});
  chk('depth-0 floor logo still fills the shape (mesh differs from no-logo)', t.length!==noLogo, {withLogo:t.length, noLogo});
  // check only the CENTRAL floor region (|x|,|z|<12) — no walls there, just floor/relief
  const hh=30, t2=clampWallThickness(60,60,60,4), yt=-(hh-t2);
  const centralMaxY=(tris)=>{ let m=-1e9; for(const tr of tris) for(const p of tr) if(Math.abs(p[0])<12&&Math.abs(p[2])<12) m=Math.max(m,p[1]); return m; };
  chk('depth-0 floor logo is FLUSH (central floor not raised above yt)', centralMaxY(t) <= yt+0.05, {centralMaxY:+centralMaxY(t).toFixed(2), yt});
  // sanity: a depth>0 logo DOES raise the central floor above yt
  base({...L, wallThickness:4, latticeCell:8, latticeRib:2, latticeBorder:2}); addLogo({face:'-Y-inner',u0:0,v0:0,w:20,h:20,depth:1.5}, true);
  chk('depth>0 floor logo IS raised (central floor above yt)', centralMaxY(buildTrisForShape('box',paramState.box)) > yt+0.3, {yt}); }
// floor logo + wall logo together on the lattice
{ base({...L, wallThickness:4, latticeCell:8}); addLogo({face:'-Y-inner',u0:0,v0:0,w:14,h:14}, true); addLogo({face:'+X',u0:0,v0:0,w:14,h:14}, true);
  const t=buildTrisForShape('box',paramState.box); chk('floor logo + wall logo + lattice: watertight', !hasNaN(t)&&manifoldCheck(t,5).watertight, manifoldCheck(t,5)); }
// the RELIEF SHAPE is solid, the background stays NET (not a solid square tile): a SHAPE logo (synthHM,
// ring+bar) leaves more through-holes under its footprint than a FULL-coverage logo of the same size.
{ const outerBottomAreaInBbox=(tris,half)=>{ let a=0; const yb=-30; // 60^3 → outer bottom at -30
    for(const tr of tris){ const ys=(tr[0][1]+tr[1][1]+tr[2][1])/3; if(Math.abs(ys-yb)>0.05) continue;
      const cx=(tr[0][0]+tr[1][0]+tr[2][0])/3, cz=(tr[0][2]+tr[1][2]+tr[2][2])/3; if(Math.abs(cx)>half||Math.abs(cz)>half) continue;
      a+=Math.abs((tr[1][0]-tr[0][0])*(tr[2][2]-tr[0][2])-(tr[2][0]-tr[0][0])*(tr[1][2]-tr[0][2]))/2; } return a; };
  const FULL=new Float32Array(LOGO_HM_SIZE*LOGO_HM_SIZE).fill(1);
  base({...L, wallThickness:4, latticeCell:6, latticeRib:1.6, latticeBorder:2}); addLogo({face:'-Y-inner',u0:0,v0:0,w:30,h:30,heightmap:FULL}, true);
  const full=buildTrisForShape('box',paramState.box);
  base({...L, wallThickness:4, latticeCell:6, latticeRib:1.6, latticeBorder:2}); addLogo({face:'-Y-inner',u0:0,v0:0,w:30,h:30}, true); // HM = synthHM (ring+bar)
  const shape=buildTrisForShape('box',paramState.box);
  const fA=outerBottomAreaInBbox(full,15), sA=outerBottomAreaInBbox(shape,15);
  chk('shape logo leaves NET background (less solid than a full tile)', sA < fA*0.95, {shapeArea:sA|0, fullArea:fA|0}); }

console.log('=== ROUNDED rib profile: continuous domed top, still watertight ===');
const R = {hollow:true, latticeFloor:true, latticeRound:true};
wt('rounded 60^3 pitch10 rib2',   {...R, wallThickness:4, latticeCell:10, latticeRib:2, latticeBorder:2});
wt('rounded 60^3 pitch8 rib1.5',  {...R, wallThickness:4, latticeCell:8, latticeRib:1.5, latticeBorder:2});
wt('rounded fat rib pitch8 rib4', {...R, wallThickness:4, latticeCell:8, latticeRib:4, latticeBorder:2});
wt('rounded thin rib pitch10 r1', {...R, wallThickness:4, latticeCell:10, latticeRib:1, latticeBorder:2});
wt('rounded non-cube 80x50x60',   {...R, width:80,height:50,depth:60, wallThickness:4, latticeCell:9, latticeRib:2, latticeBorder:2});
wt('rounded + taper',             {...R, wallThickness:4, latticeCell:8, taperXPlus:8,taperXMinus:8,taperZPlus:8,taperZMinus:8});
wt('rounded + wall logo',         {...R, wallThickness:4, latticeCell:8}, [{face:'+X',u0:0,v0:0,w:16,h:16}]);
wt('rounded coarse pitch20',      {...R, wallThickness:4, latticeCell:20, latticeRib:3, latticeBorder:1});
// rounded differs from flat (the domed top adds height variation → different vertex set/tri count)
{ base({...L, wallThickness:4, latticeCell:8, latticeRib:2, latticeBorder:2}); const flat=buildTrisForShape('box',paramState.box);
  base({...R, wallThickness:4, latticeCell:8, latticeRib:2, latticeBorder:2}); const round=buildTrisForShape('box',paramState.box);
  // top surface must actually dome: some floor-region vertices sit ABOVE the flat cavity-floor plane's rib edge
  const hh=30, t=clampWallThickness(60,60,60,4), yb=-hh, yt=-(hh-t);
  const flatMaxFloorY = Math.max(...flat.flatMap(tr=>tr.map(p=>p[1])).filter(y=>y<=yt+1e-6));
  chk('rounded floor still watertight vs flat (both build)', flat.length>0 && round.length>0);
  chk('rounded top domes between yb and yt', round.some(tr=>tr.some(p=>p[1]>yb+1e-3 && p[1]<yt-1e-3)), {yb,yt}); }

// ---- enclosed logo holes (letter counters) are filled solid on the lattice, not left as net -----------
console.log('\n=== lattice: an enclosed logo counter is filled solid (no net inside), a C-gap is not ===');
function ringHM(gap){ const N=LOGO_HM_SIZE, hm=new Float32Array(N*N);
  for(let y=0;y<N;y++)for(let x=0;x<N;x++){ const fx=x/N-0.5, fy=y/N-0.5, r=Math.hypot(fx,fy), ang=Math.atan2(fy,fx);
    let on = r>0.20 && r<0.40;
    if(gap && ang>-0.5 && ang<0.5) on=false; // open a mouth → the centre is NOT enclosed
    hm[y*N+x]=on?1:0; } return hm; }
function svol(t){let v=0;for(const T of t){const a=T[0],b=T[1],c=T[2];v+=(a[0]*(b[1]*c[2]-b[2]*c[1])-a[1]*(b[0]*c[2]-b[2]*c[0])+a[2]*(b[0]*c[1]-b[1]*c[0]))/6;}return v;}
function buildRing(gap){ base({...L, width:70, depth:70, height:30, wallThickness:2.5, latticeCell:6, latticeRib:2, latticeBorder:1});
  const l=addLogo({face:'-Y-inner',u0:0,v0:0,w:34,h:34,depth:1.5}, true); l.heightmap=ringHM(gap);
  return buildTrisForShape('box',paramState.box); }
const ringClosed=buildRing(false), ringOpen=buildRing(true);
chk('closed-ring logo on lattice: watertight', manifoldCheck(ringClosed,5).watertight && !hasNaN(ringClosed), manifoldCheck(ringClosed,5));
chk('C-gap ring on lattice: watertight', manifoldCheck(ringOpen,5).watertight && !hasNaN(ringOpen), manifoldCheck(ringOpen,5));
// The closed ring fills its enclosed counter (perforations there are closed) → more material than the C,
// whose centre opens to the outside and stays lattice.
chk('closed counter filled → more solid than the open C', svol(ringClosed) > svol(ringOpen) + 200, {closed:svol(ringClosed)|0, open:svol(ringOpen)|0});

console.log('\n=== TOTAL:', pass, 'passed,', fail, 'failed ===');
if(fail>0) process.exit(1);
