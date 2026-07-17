// Through-hole lattice on the SIDE WALLS of a flat hollow container (latticeWalls:'all'), exercised
// through the REAL buildTrisForShape -> buildHollowBox -> emitLatticeWall path. Must stay watertight
// across sizes / patterns / cell-rib-border, actually punch holes THROUGH the walls (less solid volume
// than a plain shell), coexist with the net floor and taper, and fall back to a plain shell when a
// guard (logo / bulge / chamfer) is present. Run via ./run-all.sh (extraction test).

let pass=0, fail=0;
function chk(name,cond,extra){ if(cond){pass++;console.log('  OK  ',name);} else {fail++;console.log('  FAIL',name, extra!==undefined?JSON.stringify(extra):'');} }
function hasNaN(t){for(const tr of t)for(const p of tr)for(const c of p)if(!Number.isFinite(c))return true;return false;}
function sv(t){let v=0;for(const T of t){const a=T[0],b=T[1],c=T[2];v+=(a[0]*(b[1]*c[2]-b[2]*c[1])-a[1]*(b[0]*c[2]-b[2]*c[0])+a[2]*(b[0]*c[1]-b[1]*c[0]))/6;}return v;}
function bbox(t){const lo=[1e9,1e9,1e9],hi=[-1e9,-1e9,-1e9];for(const tr of t)for(const p of tr)for(let a=0;a<3;a++){lo[a]=Math.min(lo[a],p[a]);hi[a]=Math.max(hi[a],p[a]);}return{lo,hi};}
function setBox(over){
  logos.length = 0; boxHoles.length = 0;
  Object.assign(paramState.box, {
    width:70, height:40, depth:60, hollow:true, rim:false, cavityDepth:0, wallThickness:3,
    filletRadius:0, filletTop:0, filletBottom:0, filletVert:0, filletInnerFloor:0, filletInnerVert:0, filletInnerLip:0,
    chamferTop:0, squircle:0, squircleVBot:0, gfOn:false, scoopDir:'none', labelTab:'none', mountHoles:'none',
    gripWall:'none', divX:1, divZ:1, stackFeet:false, hingeRole:undefined, logo3d:false,
    latticeFloor:false, latticeWalls:'none', latticeCell:9, latticeRib:1.8, latticeBorder:2, latticeRound:false,
    latticePattern:'diamond', latticeRes:50,
    taperXPlus:0,taperXMinus:0,taperZPlus:0,taperZMinus:0,taperYPlusX:0,taperYPlusZ:0,taperYMinusX:0,taperYMinusZ:0,
    bulgeXPlus:0,bulgeXMinus:0,bulgeZPlus:0,bulgeZMinus:0,bulgeYPlus:0,bulgeYMinus:0,
  }, over);
  return buildTrisForShape('box', paramState.box);
}
// solid area of the outer +X wall face (triangles centred at x≈hw, facing +X)
function outerXArea(tris, hw){
  let a=0;
  for(const tr of tris){
    const cx=(tr[0][0]+tr[1][0]+tr[2][0])/3;
    if(Math.abs(cx-hw)>0.05) continue;
    const n=faceNormal(tr); if(n[0]<0.8) continue;
    a+=Math.abs((tr[1][1]-tr[0][1])*(tr[2][2]-tr[0][2])-(tr[2][1]-tr[0][1])*(tr[1][2]-tr[0][2]))/2;
  }
  return a;
}
function wt(name, over){
  const tris=setBox(over); const mc=manifoldCheck(tris,5);
  chk(name+`  (tris=${tris.length})`, !hasNaN(tris)&&mc.watertight&&sv(tris)>0, {open:mc.openEdges, bad:mc.badEdges, vol:+sv(tris).toFixed(1)});
  return tris;
}

const W = {latticeWalls:'all'};

console.log('=== flat hollow + WALL net: watertight across params ===');
wt('70x40x60 pitch9 rib1.8 b2', {...W});
wt('cell12 rib1.3 b1',          {...W, latticeCell:12, latticeRib:1.3, latticeBorder:1});
wt('cell7 rib2 b2',             {...W, latticeCell:7, latticeRib:2, latticeBorder:2});
wt('cell8 rib1 b2 (pinch)',     {...W, latticeCell:8, latticeRib:1, latticeBorder:2});
wt('fat rib cell8 rib4',        {...W, latticeCell:8, latticeRib:4, latticeBorder:2});
wt('thin wall 1.5',             {...W, wallThickness:1.5, latticeCell:8, latticeRib:1.6});
wt('border 0 -> clamps to 1',   {...W, latticeBorder:0});
wt('coarse pitch20 b1',         {...W, latticeCell:20, latticeRib:3, latticeBorder:1});
wt('tall 30x90x30',             {...W, width:30, height:90, depth:30, wallThickness:3, latticeCell:7});
wt('wide flat 100x24x70',       {...W, width:100, height:24, depth:70, wallThickness:2.5, latticeCell:8});
wt('cube 50^3',                 {...W, width:50, height:50, depth:50, wallThickness:3, latticeCell:8});

console.log('=== holes actually pierce the walls (less solid than a plain shell) ===');
{
  const plain = setBox({});                       // solid walls
  const perf  = setBox({...W});                   // perforated walls
  const hw = 35;
  const aPlain = outerXArea(plain, hw), aPerf = outerXArea(perf, hw);
  chk('outer +X wall has openings (solid area reduced)', aPerf < aPlain*0.9, {plain:aPlain|0, perf:aPerf|0});
  chk('perforated shell has LESS material (lower volume)', sv(perf) < sv(plain), {plain:+sv(plain).toFixed(1), perf:+sv(perf).toFixed(1)});
  chk('outer footprint unchanged by holes', (()=>{const a=bbox(plain),b=bbox(perf);
    return Math.abs(a.hi[0]-b.hi[0])<1e-6 && Math.abs(a.lo[1]-b.lo[1])<1e-6 && Math.abs(a.hi[2]-b.hi[2])<1e-6;})());
}

console.log('=== WALL patterns (diamond/square/triangle/hex) watertight + distinct ===');
for (const pat of ['diamond','square','triangle','hex']) {
  wt('wall pattern '+pat, {...W, width:70, height:40, depth:60, wallThickness:2.5, latticeCell:10, latticeRib:1.8, latticeBorder:2, latticePattern:pat});
}
{
  const mk = pat => setBox({...W, width:70, height:40, depth:60, wallThickness:2.5, latticeCell:10, latticeRib:1.8, latticeBorder:2, latticePattern:pat}).length;
  const d=mk('diamond'), sq=mk('square'), trg=mk('triangle'), hx=mk('hex');
  chk('wall patterns produce distinct meshes', new Set([d,sq,trg,hx]).size >= 3, {d,sq,trg,hx});
}

console.log('=== WALL net + FLOOR net together, and + taper ===');
wt('walls + floor net',        {...W, latticeFloor:true, latticeCell:9, latticeRib:1.8, latticeBorder:2});
wt('walls + floor + pattern hex', {...W, latticeFloor:true, latticeCell:10, latticeRib:1.8, latticeBorder:2, latticePattern:'hex'});
wt('walls + taper 8',          {...W, taperXPlus:8, taperXMinus:8, taperZPlus:8, taperZMinus:8, latticeCell:9});
wt('walls + taper mixed',      {...W, taperXPlus:10, taperZMinus:-6, latticeCell:8});
wt('walls + floor + taper',    {...W, latticeFloor:true, taperXPlus:8, taperXMinus:8, taperZPlus:8, taperZMinus:8, latticeCell:9});

console.log('=== coexists with organizer features (welded shells) ===');
wt('walls + scoop',   {...W, scoopDir:'front', latticeCell:9});
wt('walls + label',   {...W, labelTab:'back', latticeCell:9});
wt('walls + grip',    {...W, gripWall:'front', latticeCell:9});
wt('walls + dividers',{...W, divX:2, divZ:2, latticeCell:9});
wt('walls + feet',    {...W, stackFeet:true, latticeCell:9});

console.log('=== guards: incompatible features fall back to a plain shell ===');
{
  // logo present -> wall lattice skipped, so mesh == plain-hollow-with-logo (not perforated)
  const withWallsAndLogo = (()=>{ setBox({...W}); logos.push({id:nextLogoId++,face:'+X',u0:0,v0:0,w:16,h:16,depth:1.5,threshold:0.5,invert:false,rotation:0,heightmap:new Float32Array(LOGO_HM_SIZE*LOGO_HM_SIZE).fill(1),previewUrl:null}); clampLogoToFace(logos[0]);
    return buildTrisForShape('box',paramState.box); })();
  const plainWithLogo = (()=>{ setBox({}); logos.push({id:nextLogoId++,face:'+X',u0:0,v0:0,w:16,h:16,depth:1.5,threshold:0.5,invert:false,rotation:0,heightmap:new Float32Array(LOGO_HM_SIZE*LOGO_HM_SIZE).fill(1),previewUrl:null}); clampLogoToFace(logos[0]);
    return buildTrisForShape('box',paramState.box); })();
  chk('logo present -> wall lattice skipped (same mesh)', withWallsAndLogo.length === plainWithLogo.length, {a:withWallsAndLogo.length, b:plainWithLogo.length});
  logos.length=0;
  // chamfer present -> skipped
  const wc = setBox({...W, chamferTop:4}).length, pc = setBox({chamferTop:4}).length;
  chk('chamfer present -> wall lattice skipped (same mesh)', wc === pc, {a:wc, b:pc});
  // bulge present -> skipped
  const wb = setBox({...W, bulgeXPlus:6}).length, pb = setBox({bulgeXPlus:6}).length;
  chk('bulge present -> wall lattice skipped (same mesh)', wb === pb, {a:wb, b:pb});
}

console.log('=== regression: latticeWalls none == plain hollow ===');
{
  const none = setBox({latticeWalls:'none'}).length, plain = setBox({}).length;
  chk('latticeWalls:none identical to plain hollow', none === plain, {none, plain});
}

paramState.box.latticeWalls = 'none';
console.log('\n=== TOTAL:', pass, 'passed,', fail, 'failed ===');
if(fail>0) process.exit(1);
