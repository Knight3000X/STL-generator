// Polyhedron shape: N-gon prism (configurable sides, optional rounded edges; solid / hollow container)
// + Platonic solids, through the REAL buildTrisForShape pipeline. Watertight + volume, taper (height
// preserved), organizer add-ons gated off, cube regression, and slicing. Run via ./run-all.sh.
let pass=0,fail=0; function chk(n,c,e){if(c){pass++;console.log('  OK  ',n);}else{fail++;console.log('  FAIL',n,e!==undefined?JSON.stringify(e):'');}}
function vol(t){let v=0;for(const T of t){const a=T[0],b=T[1],c=T[2];v+=(a[0]*(b[1]*c[2]-b[2]*c[1])-a[1]*(b[0]*c[2]-b[2]*c[0])+a[2]*(b[0]*c[1]-b[1]*c[0]))/6;}return v;}
function base(ov){ logos.length=0; boxHoles.length=0;
  Object.assign(paramState.box, defaultBoxParams(), {width:60,height:40,depth:60,hollow:false,polyN:0,polyRound:0,platonic:'none',
    scoopDir:'none',labelTab:'none',mountHoles:'none',gripWall:'none',divX:1,divZ:1,stackFeet:false,gfOn:false,
    taperXPlus:0,taperYPlusX:0,taperYPlusZ:0}, ov);
  return buildTrisForShape('box',paramState.box); }
console.log('=== N-gon prism through pipeline ===');
for(const N of [3,5,6,8,12]){ const t=base({polyN:N}); const mc=manifoldCheck(t,4); chk('solid N='+N+' wt',mc.watertight&&vol(t)>0,mc); }
console.log('=== N-gon hollow ===');
for(const N of [4,6,8]){ const t=base({polyN:N,hollow:true,wallThickness:3}); const mc=manifoldCheck(t,4); chk('hollow N='+N+' wt',mc.watertight&&vol(t)>0,mc); }
console.log('=== rounded edges + taper ===');
chk('hex round6 wt', manifoldCheck(base({polyN:6,polyRound:6}),4).watertight);
{ const t=base({polyN:6,taperYPlusX:20}); const b=computeBBox(t); chk('hex + top tilt: watertight + height preserved', manifoldCheck(t,4).watertight && Math.abs((b.maxY-b.minY)-40)<0.2, {h:(b.maxY-b.minY)}); }
chk('oct hollow + taper wt', manifoldCheck(base({polyN:8,hollow:true,wallThickness:3,taperXPlus:12}),4).watertight);
console.log('=== Platonic / dice through pipeline ===');
for(const k of ['d4','d8','d12','d20']){ const t=base({platonic:k}); const mc=manifoldCheck(t,4); chk(k+' wt',mc.watertight&&vol(t)>0,mc); }
chk('platonic + taper wt', manifoldCheck(base({platonic:'d20',taperXPlus:10}),4).watertight);
console.log('=== organizer add-ons gated off (no effect) on polyN ===');
{ const a=base({polyN:6}).length; const b=base({polyN:6,scoopDir:'front',gripWall:'front',mountHoles:'4',divX:2,stackFeet:true}).length;
  chk('scoop/grip/ears/dividers/feet skipped on poly (same mesh)', a===b, {a,b}); }
console.log('=== regression: polyN=0 is the normal cube ===');
{ const a=base({polyN:0}); const mc=manifoldCheck(a,4); const bb=computeBBox(a);
  chk('cube still watertight + full size', mc.watertight && Math.abs((bb.maxX-bb.minX)-60)<1e-6, mc); }
console.log('=== slicing works on a polyhedron ===');
{ const t=base({polyN:6,hollow:true,wallThickness:3}); const {frags}=sliceMeshIntoFragments(t,35,35,35);
  let ok=frags.length>1; for(const f of frags) if(!manifoldCheck(f.tris,4).watertight) ok=false;
  chk('hex container slices into watertight fragments', ok, {n:frags.length}); }
console.log('=== side logos on N-gon faces (solid + hollow) ===');
{
  const HM=()=>{ const N=LOGO_HM_SIZE,h=new Float32Array(N*N); for(let y=0;y<N;y++)for(let x=0;x<N;x++){const fx=x/N-0.5,fy=y/N-0.5;h[y*N+x]=(Math.hypot(fx,fy)<0.35)?1:0;} return h; };
  const withLogo=(ov,logoOv)=>{ base(ov); const l=Object.assign({id:nextLogoId++,face:'+X',u0:0,v0:0,w:16,h:16,depth:1.5,threshold:0.5,invert:false,rotation:0,heightmap:HM(),previewUrl:null},logoOv); logos.push(l); clampLogoToFace(l); return buildTrisForShape('box',paramState.box); };
  for(const N of [4,6,8,12]){ const t=withLogo({polyN:N},{face:'+X'}); chk('N='+N+' +X logo watertight',manifoldCheck(t,4).watertight,manifoldCheck(t,4)); }
  const plain=base({polyN:6}).length, lg=withLogo({polyN:6},{face:'+X',depth:2}).length;
  chk('logo adds relief (mesh grows)', lg>plain, {plain,lg});
  for(const N of [4,6,8]){ const t=withLogo({polyN:N,hollow:true,wallThickness:3},{face:'+Z',depth:1.2}); chk('hollow N='+N+' logo watertight',manifoldCheck(t,4).watertight,manifoldCheck(t,4)); }
  chk('hex logo + taper watertight', manifoldCheck(withLogo({polyN:6,taperXPlus:12},{face:'+X'}),4).watertight);
}
console.log('=== single-wall port (hole) through an N-gon face ===');
{
  base({polyN:6,hollow:true,wallThickness:3}); boxHoles.length=0;
  boxHoles.push({id:nextHoleId++,face:'+Z',u0:0,v0:0,shape:'circle',diameter:8,pattern:'single'}); clampHoleToFace(boxHoles[0]);
  const t=buildTrisForShape('box',paramState.box); const mc=manifoldCheck(t,4);
  chk('hex hollow + Ø8 port watertight (+vol)', mc.watertight && vol(t)>0, mc);
  boxHoles.length=0;
}
console.log('=== through-hole lattice floor on the N-gon container ===');
{
  const lat=(ov)=>{ base(Object.assign({width:70,height:36,depth:70,hollow:true,wallThickness:3,polyN:6,latticeFloor:true,latticeCell:9,latticeRib:2,latticeBorder:2,latticePattern:'diamond',latticeRes:60},ov)); return buildTrisForShape('box',paramState.box); };
  for(const N of [4,6,8,12]){ const t=lat({polyN:N}); chk('N='+N+' lattice floor wt (+vol)', manifoldCheck(t,4).watertight && vol(t)>0, manifoldCheck(t,4)); }
  for(const pat of ['diamond','square','triangle','hex']){ chk('N=8 '+pat+' lattice wt', manifoldCheck(lat({polyN:8,latticePattern:pat}),4).watertight); }
  chk('lattice removes material (net floor < solid floor)', vol(lat({polyN:6})) < vol(base({polyN:6,hollow:true,wallThickness:3,width:70,height:36,depth:70})), {});
  chk('lattice + rounded edges wt', manifoldCheck(lat({polyN:6,polyRound:6}),4).watertight);
  chk('lattice + taper wt', manifoldCheck(lat({polyN:6,taperXPlus:8}),4).watertight);
  chk('tiny container: lattice falls back to solid floor, watertight', manifoldCheck(lat({polyN:6,width:24,depth:24}),4).watertight);
}
console.log('=== internal dividers on the N-gon container ===');
{
  const dv=(ov)=>{ base(Object.assign({width:80,height:36,depth:80,hollow:true,wallThickness:3,polyN:6,divT:1.4},ov)); return buildTrisForShape('box',paramState.box); };
  for(const [dx,dz] of [[2,1],[1,2],[2,2],[3,2],[3,3]]){ const t=dv({divX:dx,divZ:dz}); chk(`div ${dx}x${dz} wt (+vol)`, manifoldCheck(t,4).watertight && vol(t)>0, manifoldCheck(t,4)); }
  chk('dividers add material', vol(dv({divX:3,divZ:3})) > vol(dv({divX:1,divZ:1})), {});
  for(const N of [4,5,8,12]) chk('N='+N+' 2x2 dividers wt', manifoldCheck(dv({polyN:N,divX:2,divZ:2}),4).watertight);
  chk('rounded + dividers wt', manifoldCheck(dv({polyN:6,polyRound:6,divX:2,divZ:2}),4).watertight);
  chk('partial-height dividers wt', manifoldCheck(dv({polyN:6,divX:2,divZ:2,divH:60}),4).watertight);
  chk('dividers + lattice floor wt', manifoldCheck(dv({polyN:6,divX:2,divZ:2,latticeFloor:true,latticeCell:9,latticeRib:2,latticeBorder:2,latticePattern:'diamond',latticeRes:60}),4).watertight);
  const a=dv({polyN:6,divX:2,divZ:2,taperXPlus:10}).length, b=dv({polyN:6,taperXPlus:10}).length;
  chk('tapered container: dividers skipped (like the cube)', a===b, {a,b});
}
console.log('=== through-hole lattice on the N-gon SIDE WALLS ===');
{
  const wl=(ov)=>{ base(Object.assign({width:70,height:44,depth:70,hollow:true,wallThickness:3,polyN:6,latticeWalls:'all',latticeCell:9,latticeRib:2,latticeBorder:2,latticePattern:'diamond',latticeRes:60},ov)); return buildTrisForShape('box',paramState.box); };
  for(const N of [4,6,8,12]){ const t=wl({polyN:N}); chk('N='+N+' wall net wt (+vol)', manifoldCheck(t,4).watertight && vol(t)>0, manifoldCheck(t,4)); }
  for(const pat of ['diamond','square','triangle','hex']){ chk('N=8 '+pat+' wall net wt', manifoldCheck(wl({polyN:8,latticePattern:pat}),4).watertight); }
  chk('wall net removes material', vol(wl({polyN:6})) < vol(base({polyN:6,hollow:true,wallThickness:3,width:70,height:44,depth:70})), {});
  chk('wall net + floor net together wt', manifoldCheck(wl({polyN:6,latticeFloor:true}),4).watertight);
  chk('wall net + rounded edges wt', manifoldCheck(wl({polyN:6,polyRound:6}),4).watertight);
  chk('wall net + taper wt', manifoldCheck(wl({polyN:6,taperXPlus:8}),4).watertight);
  chk('wall net + dividers wt', manifoldCheck(wl({polyN:6,divX:2,divZ:2}),4).watertight);
}
paramState.box.latticeWalls='none';
console.log('=== squircle container: full lattice walls + floor (round basket) ===');
{
  const sq=(ov)=>{ base(Object.assign({width:90,height:90,depth:90,squircle:100,hollow:true,wallThickness:2.4,
    latticeCell:8,latticeRib:1.8,latticeBorder:3,latticePattern:'hex',latticeRes:100},ov)); return buildTrisForShape('box',paramState.box); };
  for(const s of [100,70,40,15]){ const t=sq({squircle:s,latticeWalls:'all',latticeFloor:true}); const mc=manifoldCheck(t,4);
    chk('squircle '+s+'% walls+floor net wt (+vol)', mc.watertight && vol(t)>0, mc); }
  for(const pat of ['diamond','square','triangle','hex']) chk('squircle '+pat+' wall net wt', manifoldCheck(sq({squircle:100,latticeWalls:'all',latticePattern:pat}),4).watertight);
  chk('squircle floor-only net wt', manifoldCheck(sq({squircle:100,latticeWalls:'none',latticeFloor:true}),4).watertight);
  chk('squircle walls-only net wt', manifoldCheck(sq({squircle:100,latticeWalls:'all',latticeFloor:false}),4).watertight);
  { const t=sq({squircle:100,width:110,depth:70,latticeWalls:'all',latticeFloor:true}); chk('elliptical (W≠D) squircle net wt', manifoldCheck(t,4).watertight); }
  { const t=sq({squircle:100,latticeWalls:'all',latticeFloor:true,taperXPlus:-9,taperXMinus:-9,taperZPlus:-9,taperZMinus:-9}); const b=computeBBox(t);
    chk('round net BASKET (flared) wt + top wider', manifoldCheck(t,4).watertight && (b.maxX-b.minX)>90+8, {top:b.maxX-b.minX}); }
  chk('net removes material vs plain squircle', vol(sq({squircle:100,latticeWalls:'all',latticeFloor:true})) < vol(sq({squircle:100,latticeWalls:'none',latticeFloor:false})), {});
  // roundness: the outer ring should be smoothly round (many distinct perimeter directions), not a few flats
  { const t=sq({squircle:100,latticeWalls:'all',latticeFloor:true}); const b=computeBBox(t);
    chk('squircle basket fills 90mm bbox', Math.abs((b.maxX-b.minX)-90)<0.6 && Math.abs((b.maxZ-b.minZ)-90)<0.6, {x:b.maxX-b.minX,z:b.maxZ-b.minZ}); }
  // ANTI-ALIAS (the v63 fix): the net grid must sample ≥4 cells across each pitch, or the diamond/hex ribs
  // stair-step into the ragged vertical-bar fragments the user reported. netGridStep is the single source.
  for(const cell of [2,5,8,12]){ const step=netGridStep(2*45, cell, 80);
    chk('netGridStep '+cell+'mm holds ≥4 samples/cell', step <= cell/4 + 1e-9, {cell,step}); }
  chk('netGridStep stays bounded for perf on a big part', netGridStep(400, 2, 80) >= 400/600 - 1e-9, {step:netGridStep(400,2,80)});
  // geometry proof: the WALL band must carry many vertical rows (the old cell/2 cap left only ~2 rows/cell,
  // which is what shattered the pattern). Count distinct Y levels strictly inside the cavity band.
  { const t=sq({squircle:100,height:90,wallThickness:2.4,latticeCell:8,latticeWalls:'all',latticeFloor:false});
    const ys=new Set(); for(const T of t) for(const v of T){ if(v[1]>-42 && v[1]<44) ys.add(Math.round(v[1]*10)/10); }
    chk('wall net has fine vertical rows (no cell/2 aliasing)', ys.size>40, {rows:ys.size}); }
  // commensurate wall: the ring is resampled to an INTEGER number of pattern periods so the hex/diamond tiles
  // the curved wall seamlessly (fixes the "ряды не связаны" drift). Hex must stay watertight at a fine cell.
  chk('squircle hex wall watertight at fine cell (commensurate)', manifoldCheck(sq({squircle:100,width:110,depth:110,height:120,latticeCell:2,latticeRib:0.4,latticeBorder:1,latticePattern:'hex',latticeRes:120,latticeWalls:'all',latticeFloor:false}),4).watertight);
  // FULL-COVERAGE floor: holes now fill the whole round floor (staircase clipped to the ring), so hole rib
  // walls reach FAR out toward the wall — not stopping at a small central inscribed square.
  { const t=sq({squircle:100,width:90,depth:90,wallThickness:2.4,latticeCell:6,latticeRib:1.2,latticeBorder:1,latticeWalls:'none',latticeFloor:true});
    const floorY=-45+2.4, yb=-45, ringR=42.6; let maxHoleR=0;
    for(const T of t){ const ys=T.map(v=>v[1]), hi=Math.max(...ys), lo=Math.min(...ys);
      if(hi>floorY-0.06 && lo<yb+0.06 && (hi-lo)>1){                       // a rib wall spans the floor slab
        const cx=(T[0][0]+T[1][0]+T[2][0])/3, cz=(T[0][2]+T[1][2]+T[2][2])/3, r=Math.hypot(cx,cz);
        if(r<ringR-2) maxHoleR=Math.max(maxHoleR, r); } }                  // exclude the container wall itself
    chk('floor net covers the whole disc (holes reach the rim, not just a central square)', maxHoleR>33, {maxHoleR}); }
}
paramState.box.latticeWalls='none'; paramState.box.squircle=0;
console.log('=== бин: full-size rounded-rect container (gridfinity-bin look) ===');
{
  const bin=(ov)=>{ base(Object.assign({width:84,height:44,depth:60,binRound:8},ov)); return buildTrisForShape('box',paramState.box); };
  { const t=bin({}); const b=computeBBox(t);   // solid prism must fill the FULL footprint (not inscribed)
    chk('bin solid wt + fills 84×60', manifoldCheck(t,4).watertight && Math.abs((b.maxX-b.minX)-84)<0.01 && Math.abs((b.maxZ-b.minZ)-60)<0.01, {x:b.maxX-b.minX,z:b.maxZ-b.minZ}); }
  chk('bin hollow wt', manifoldCheck(bin({hollow:true,wallThickness:3}),4).watertight);
  chk('bin hollow + floor net wt', manifoldCheck(bin({hollow:true,wallThickness:3,latticeFloor:true,latticeCell:9,latticeRib:2,latticeBorder:2,latticePattern:'diamond',latticeRes:60}),4).watertight);
  for(const pat of ['diamond','square','triangle','hex'])
    chk('bin wall net '+pat+' wt', manifoldCheck(bin({hollow:true,wallThickness:3,latticeWalls:'all',latticePattern:pat,latticeCell:9,latticeRib:2,latticeBorder:2,latticeRes:60}),4).watertight);
  chk('bin wall+floor nets together wt', manifoldCheck(bin({hollow:true,wallThickness:3,latticeWalls:'all',latticeFloor:true,latticeCell:9,latticeRib:2,latticeBorder:2,latticePattern:'diamond',latticeRes:60}),4).watertight);
  chk('bin 2x2 dividers wt', manifoldCheck(bin({hollow:true,wallThickness:3,divX:2,divZ:2,divT:1.4}),4).watertight);
  { const t=bin({taperXPlus:10}); const b=computeBBox(t);
    chk('bin + taper wt + height kept', manifoldCheck(t,4).watertight && Math.abs((b.maxY-b.minY)-44)<0.2, {h:b.maxY-b.minY}); }
  chk('bin net removes material', vol(bin({hollow:true,wallThickness:3,latticeWalls:'all',latticeCell:9,latticeRib:2,latticeBorder:2,latticePattern:'diamond',latticeRes:60})) < vol(bin({hollow:true,wallThickness:3})), {});
  { const a=bin({scoopDir:'front',gripWall:'front',mountHoles:'4',stackFeet:true}).length, b=bin({}).length;
    chk('organizer add-ons gated off on bin', a===b, {a,b}); }
  // ROUND flared basket (screens 3+4): square bin, near-max corner radius → circle, taper flare, net walls+floor
  { base(Object.assign({width:110,height:110,depth:110,binRound:54,filletSeg:16,hollow:true,wallThickness:2.2,
      latticeWalls:'all',latticeFloor:true,latticeCell:8,latticeRib:1.6,latticeBorder:3,latticePattern:'hex',latticeRes:100,
      taperXPlus:-9,taperXMinus:-9,taperZPlus:-9,taperZMinus:-9}));
    const t=buildTrisForShape('box',paramState.box); const b=computeBBox(t);
    chk('round tapered basket + hex net walls/floor wt', manifoldCheck(t,4).watertight, manifoldCheck(t,4));
    chk('basket flares open (top wider than base)', (b.maxX-b.minX)>110+10, {top:b.maxX-b.minX}); }
}
paramState.box.latticeWalls='none';
console.log('\n=== TOTAL:',pass,'passed,',fail,'failed ===');
process.exit(fail?1:0);
