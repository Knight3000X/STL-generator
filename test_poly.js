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
console.log('=== Platonic through pipeline ===');
for(const k of ['tetrahedron','octahedron','dodecahedron','icosahedron']){ const t=base({platonic:k}); const mc=manifoldCheck(t,4); chk(k+' wt',mc.watertight&&vol(t)>0,mc); }
chk('platonic + taper wt', manifoldCheck(base({platonic:'icosahedron',taperXPlus:10}),4).watertight);
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
console.log('\n=== TOTAL:',pass,'passed,',fail,'failed ===');
process.exit(fail?1:0);
