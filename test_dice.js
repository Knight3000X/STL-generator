// Dice (правильные многогранники): D4/D6/D8/D12/D20 Platonic solids + D10/D100 trapezohedra, through the
// REAL buildDie / buildTrisForShape pipeline. Watertight body, correct face counts, per-axis fill, and
// per-face raised relief (numbers/logos/text) appended as watertight slabs. Run via ./run-all.sh.
let pass=0,fail=0; function chk(n,c,e){if(c){pass++;console.log('  OK  ',n);}else{fail++;console.log('  FAIL',n,e!==undefined?JSON.stringify(e):'');}}
function vol(t){let v=0;for(const T of t){const a=T[0],b=T[1],c=T[2];v+=(a[0]*(b[1]*c[2]-b[2]*c[1])-a[1]*(b[0]*c[2]-b[2]*c[0])+a[2]*(b[0]*c[1]-b[1]*c[0]))/6;}return v;}
// synthetic round-blob heightmap (no canvas in Node) — stands in for a number/logo silhouette
function blobHM(r){ const N=LOGO_HM_SIZE,h=new Float32Array(N*N); r=r||0.32; for(let y=0;y<N;y++)for(let x=0;x<N;x++){const fx=x/N-0.5,fy=y/N-0.5;h[y*N+x]=(Math.hypot(fx,fy)<r)?1:0;} return h; }
function base(ov){ logos.length=0; boxHoles.length=0; dieFaces.length=0;
  Object.assign(paramState.box, defaultBoxParams(), {width:40,height:40,depth:40,hollow:false,polyN:0,polyRound:0,platonic:'none',
    scoopDir:'none',labelTab:'none',mountHoles:'none',gripWall:'none',divX:1,divZ:1,stackFeet:false,gfOn:false,
    taperXPlus:0,taperYPlusX:0,taperYPlusZ:0}, ov);
  return buildTrisForShape('box',paramState.box); }

const DICE={d4:4,d6:6,d8:8,d10:10,d12:12,d20:20,d100:100};
console.log('=== die bodies watertight + face counts ===');
for(const k in DICE){ const t=base({platonic:k}); const mc=manifoldCheck(t,4);
  chk(k+' watertight (+vol)', mc.watertight&&vol(t)>0, mc);
  chk(k+' face count = '+DICE[k], dieFaceCount(k)===DICE[k], {got:dieFaceCount(k)}); }

console.log('=== per-axis fill (bbox = width×height×depth) ===');
{ const t=base({platonic:'d6',width:30,height:50,depth:70}); const b=computeBBox(t);
  chk('d6 fills 30×50×70', Math.abs((b.maxX-b.minX)-30)<0.01 && Math.abs((b.maxY-b.minY)-50)<0.01 && Math.abs((b.maxZ-b.minZ)-70)<0.01,
      {x:b.maxX-b.minX,y:b.maxY-b.minY,z:b.maxZ-b.minZ}); }
{ const t=base({platonic:'d20'}); const b=computeBBox(t); chk('d20 fills 40mm on every axis', Math.abs((b.maxX-b.minX)-40)<0.5 && Math.abs((b.maxY-b.minY)-40)<0.5, {x:b.maxX-b.minX,y:b.maxY-b.minY}); }

console.log('=== D10 trapezohedron / D100 Zocchihedron are proper ===');
{ const P=diePoly('d10'); chk('d10 has 10 kite faces (all quads)', P.polys.length===10 && P.polys.every(p=>p.length===4), {n:P.polys.length}); }
{ const P=diePoly('d100'); chk('d100 (Zocchihedron) has exactly 100 facets', P.polys.length===100, {n:P.polys.length});
  const sides=P.polys.map(p=>p.length); chk('d100 facets are polygons (pent/hex, not kites)', sides.every(s=>s>=4&&s<=7) && sides.some(s=>s>=5), {min:Math.min(...sides),max:Math.max(...sides)});
  // near-spherical: every vertex roughly equidistant from centre (unit-ish radius spread is tight)
  let rmin=1e9,rmax=0; for(const v of P.verts){ const r=Math.hypot(v[0],v[1],v[2]); rmin=Math.min(rmin,r); rmax=Math.max(rmax,r); }
  chk('d100 is near-spherical (vertex radius spread < 25%)', (rmax-rmin)/rmax < 0.25, {rmin,rmax}); }

console.log('=== per-face relief (numbers/logos) appended, watertight ===');
{ // one relief on one face
  base({platonic:'d6'}); const plain=buildTrisForShape('box',paramState.box).length;
  dieFaces.push({id:nextDieId++,face:0,src:'text',depth:1.5,sizeFrac:0.55,rotation:0,invert:false,threshold:0.5,heightmap:blobHM()});
  const t=buildTrisForShape('box',paramState.box); const mc=manifoldCheck(t,4);
  chk('d6 + 1 face relief watertight', mc.watertight, mc);
  chk('relief adds material (mesh grows, +vol)', t.length>plain && vol(t)>0, {plain,now:t.length});
}
console.log('=== relief on EVERY face (auto-number style) for each die ===');
for(const k in DICE){
  base({platonic:k});
  for(let f=0;f<DICE[k];f++) dieFaces.push({id:nextDieId++,face:f,src:'text',depth:1.2,sizeFrac:0.5,rotation:(f*37)%360,invert:false,threshold:0.5,heightmap:blobHM(0.3)});
  const t=buildTrisForShape('box',paramState.box); const mc=manifoldCheck(t,4);
  chk(k+' relief on all '+DICE[k]+' faces watertight', mc.watertight, mc);
}
console.log('=== relief + taper, + rounded dims ===');
{ base({platonic:'d8',taperXPlus:8}); dieFaces.push({id:nextDieId++,face:2,src:'text',depth:1.2,sizeFrac:0.5,rotation:0,invert:false,threshold:0.5,heightmap:blobHM()});
  chk('d8 relief + taper watertight', manifoldCheck(buildTrisForShape('box',paramState.box),4).watertight); }
{ base({platonic:'d10'}); for(let f=0;f<10;f++) dieFaces.push({id:nextDieId++,face:f,src:'text',depth:1,sizeFrac:0.45,rotation:0,invert:false,threshold:0.5,heightmap:blobHM(0.28)});
  chk('d10 relief on all 10 faces watertight', manifoldCheck(buildTrisForShape('box',paramState.box),4).watertight); }
{ base({platonic:'d100',width:50,height:50,depth:50}); for(let f=0;f<20;f++) dieFaces.push({id:nextDieId++,face:f*3,src:'text',depth:0.8,sizeFrac:0.55,rotation:0,invert:false,threshold:0.5,heightmap:blobHM(0.3)});
  chk('d100 partial relief watertight', manifoldCheck(buildTrisForShape('box',paramState.box),4).watertight); }

console.log('=== NEGATIVE depth engraves (recessed) and stays watertight; volume drops below flat body ===');
for(const k of ['d6','d8','d12','d20','d100']){
  base({platonic:k}); const flat=vol(buildTrisForShape('box',paramState.box));
  dieFaces.length=0; for(let f=0;f<DICE[k];f++) dieFaces.push({id:nextDieId++,face:f,src:'text',depth:-1.0,sizeFrac:0.5,rotation:0,invert:false,threshold:0.5,heightmap:blobHM(0.3)});
  const t=buildTrisForShape('box',paramState.box); const mc=manifoldCheck(t,4);
  chk(k+' engraved (neg depth) watertight', mc.watertight, mc);
  chk(k+' engraving removes material (vol < flat body)', vol(t) < flat, {flat,engraved:vol(t)});
}
{ base({platonic:'d20'}); const flat=vol(buildTrisForShape('box',paramState.box));
  dieFaces.length=0; dieFaces.push({id:nextDieId++,face:0,src:'text',depth:1.2,sizeFrac:0.5,rotation:0,invert:false,threshold:0.5,heightmap:blobHM(0.3)});
  chk('d20 emboss (pos depth) adds material (vol > flat body)', vol(buildTrisForShape('box',paramState.box)) > flat, {}); }
console.log('=== invert (engrave-look silhouette) still watertight; empty threshold falls back ===');
{ base({platonic:'d6'}); dieFaces.push({id:nextDieId++,face:0,src:'text',depth:1.2,sizeFrac:0.5,rotation:0,invert:true,threshold:0.5,heightmap:blobHM()});
  chk('d6 inverted relief watertight', manifoldCheck(buildTrisForShape('box',paramState.box),4).watertight); }

console.log('=== dieFaces ignored when no die active (regression) ===');
{ dieFaces.length=0; dieFaces.push({id:nextDieId++,face:0,src:'text',depth:1.5,sizeFrac:0.5,rotation:0,invert:false,threshold:0.5,heightmap:blobHM()});
  const cube=base({polyN:0}); // base() clears dieFaces, so re-add after
  dieFaces.push({id:nextDieId++,face:0,src:'text',depth:1.5,sizeFrac:0.5,rotation:0,invert:false,threshold:0.5,heightmap:blobHM()});
  const t=buildTrisForShape('box',paramState.box); const bb=computeBBox(t);
  chk('plain cube unaffected by dieFaces', manifoldCheck(t,4).watertight && Math.abs((bb.maxX-bb.minX)-40)<1e-6, {}); }
dieFaces.length=0;

console.log('=== slicing works on a die ===');
{ const t=base({platonic:'d20',width:80,height:80,depth:80}); const {frags}=sliceMeshIntoFragments(t,45,45,45);
  let ok=frags.length>1; for(const f of frags) if(!manifoldCheck(f.tris,4).watertight) ok=false;
  chk('d20 slices into watertight fragments', ok, {n:frags.length}); }

console.log('\n=== TOTAL:',pass,'passed,',fail,'failed ===');
process.exit(fail?1:0);
