// Mesh import: STL binary / STL ASCII / OBJ parsers + scaleImportedMesh (centre-on-origin, uniform % or
// non-uniform fit-to-box) through the REAL pipeline. Run via ./run-all.sh.
let pass=0,fail=0; function chk(n,c,e){if(c){pass++;console.log('  OK  ',n);}else{fail++;console.log('  FAIL',n,e!==undefined?JSON.stringify(e):'');}}
function approx(a,b,t){return Math.abs(a-b)<=(t||1e-4);}

// a unit tetra (4 tris) spanning x∈[0,2], y∈[0,4], z∈[0,6] so the bbox is 2×4×6
const T=[
  [[0,0,0],[2,0,0],[0,4,0]],
  [[0,0,0],[0,4,0],[0,0,6]],
  [[0,0,0],[0,0,6],[2,0,0]],
  [[2,0,0],[0,0,6],[0,4,0]],
];
function makeBinSTL(tris){
  const buf=new ArrayBuffer(84+50*tris.length), dv=new DataView(buf);
  dv.setUint32(80,tris.length,true); let o=84;
  for(const t of tris){ let p=o+12;   // 12-byte normal (left 0), then 3 vertices, then 2-byte attr
    for(let k=0;k<3;k++){ dv.setFloat32(p,t[k][0],true); dv.setFloat32(p+4,t[k][1],true); dv.setFloat32(p+8,t[k][2],true); p+=12; }
    o+=50; }
  return buf;
}
function asciiSTL(tris){ let s='solid t\n';
  for(const t of tris){ s+='facet normal 0 0 0\nouter loop\n'; for(const v of t) s+='vertex '+v[0]+' '+v[1]+' '+v[2]+'\n'; s+='endloop\nendfacet\n'; }
  return s+'endsolid t\n'; }
function objText(tris){ let s=''; const vs=[]; for(const t of tris) for(const v of t){ vs.push(v); s+='v '+v[0]+' '+v[1]+' '+v[2]+'\n'; }
  for(let i=0;i<tris.length;i++) s+='f '+(i*3+1)+' '+(i*3+2)+' '+(i*3+3)+'\n'; return s; }
function bbox(t){let b={minX:1e9,maxX:-1e9,minY:1e9,maxY:-1e9,minZ:1e9,maxZ:-1e9};for(const T of t)for(const v of T){b.minX=Math.min(b.minX,v[0]);b.maxX=Math.max(b.maxX,v[0]);b.minY=Math.min(b.minY,v[1]);b.maxY=Math.max(b.maxY,v[1]);b.minZ=Math.min(b.minZ,v[2]);b.maxZ=Math.max(b.maxZ,v[2]);}return b;}

console.log('=== parsers ===');
{ const t=parseSTLBinary(makeBinSTL(T)); chk('binary STL: 4 tris', t.length===4, {n:t.length});
  const b=bbox(t); chk('binary STL bbox 2×4×6', approx(b.maxX-b.minX,2)&&approx(b.maxY-b.minY,4)&&approx(b.maxZ-b.minZ,6), b); }
{ const t=parseSTL(makeBinSTL(T)); chk('parseSTL auto-detects binary', t.length===4, {n:t.length}); }
{ const t=parseSTLText(asciiSTL(T)); chk('ASCII STL: 4 tris', t.length===4, {n:t.length});
  const b=bbox(t); chk('ASCII STL bbox 2×4×6', approx(b.maxX-b.minX,2)&&approx(b.maxY-b.minY,4)&&approx(b.maxZ-b.minZ,6), b); }
{ // parseSTL on ASCII bytes (size won't match binary formula) → falls back to text
  const buf=new TextEncoder().encode(asciiSTL(T)).buffer; const t=parseSTL(buf);
  chk('parseSTL falls back to ASCII', t.length===4, {n:t.length}); }
{ const t=parseOBJ(objText(T)); chk('OBJ: 4 tris', t.length===4, {n:t.length});
  const b=bbox(t); chk('OBJ bbox 2×4×6', approx(b.maxX-b.minX,2)&&approx(b.maxY-b.minY,4)&&approx(b.maxZ-b.minZ,6), b); }
{ // OBJ quad face → fan into 2 tris; negative index; extra v/vt/vn tokens
  const s='v 0 0 0\nv 1 0 0\nv 1 1 0\nv 0 1 0\nf 1/1/1 2/2/2 3/3/3 4/4/4\n';
  const t=parseOBJ(s); chk('OBJ quad → 2 tris (fan)', t.length===2, {n:t.length}); }
{ const s='v 0 0 0\nv 1 0 0\nv 0 1 0\nf -3 -2 -1\n'; const t=parseOBJ(s);
  chk('OBJ negative indices', t.length===1 && t[0][2][1]===1, {t}); }

console.log('=== scaleImportedMesh (centre on origin) ===');
{ const out=scaleImportedMesh(T, {importFit:'scale', importScale:100});
  const b=bbox(out); chk('scale 100% keeps size 2×4×6', approx(b.maxX-b.minX,2)&&approx(b.maxY-b.minY,4)&&approx(b.maxZ-b.minZ,6), b);
  chk('centred on origin', approx((b.minX+b.maxX)/2,0)&&approx((b.minY+b.maxY)/2,0)&&approx((b.minZ+b.maxZ)/2,0), b); }
{ const out=scaleImportedMesh(T, {importFit:'scale', importScale:50}); const b=bbox(out);
  chk('scale 50% halves every axis', approx(b.maxX-b.minX,1)&&approx(b.maxY-b.minY,2)&&approx(b.maxZ-b.minZ,3), b); }
{ const out=scaleImportedMesh(T, {importFit:'box', width:20, height:20, depth:20}); const b=bbox(out);
  chk('fit-box stretches to exactly 20×20×20', approx(b.maxX-b.minX,20)&&approx(b.maxY-b.minY,20)&&approx(b.maxZ-b.minZ,20), b); }
{ const out=scaleImportedMesh(T, {importFit:'box', width:119.9, height:43, depth:74.5}); const b=bbox(out);
  chk('fit-box to Naga Pro dims', approx(b.maxX-b.minX,119.9)&&approx(b.maxY-b.minY,43)&&approx(b.maxZ-b.minZ,74.5), b); }

console.log('=== through the pipeline (importId in params) ===');
{ importedMeshes.clear();
  const id=nextImportId++; importedMeshes.set(id, T);
  Object.assign(paramState.box, defaultBoxParams(), {importId:id, importFit:'box', width:60, height:30, depth:90});
  const t=buildTrisForShape('box', paramState.box); const b=computeBBox(t);
  chk('buildTrisForShape returns scaled import', t.length===4 && Math.abs((b.maxX-b.minX)-60)<0.01 && Math.abs((b.maxY-b.minY)-30)<0.01 && Math.abs((b.maxZ-b.minZ)-90)<0.01, {x:b.maxX-b.minX,y:b.maxY-b.minY,z:b.maxZ-b.minZ});
  paramState.box.importScale=200; paramState.box.importFit='scale';
  const t2=buildTrisForShape('box', paramState.box); const b2=computeBBox(t2);
  chk('scale mode 200% → 4×8×12 (from native 2×4×6)', Math.abs((b2.maxX-b2.minX)-4)<0.01 && Math.abs((b2.maxY-b2.minY)-8)<0.01, {x:b2.maxX-b2.minX,y:b2.maxY-b2.minY});
  delete paramState.box.importId; importedMeshes.clear();
}
console.log('=== regression: no importId → normal cube ===');
{ Object.assign(paramState.box, defaultBoxParams(), {width:40,height:40,depth:40});
  const t=buildTrisForShape('box', paramState.box); const b=computeBBox(t);
  chk('cube unaffected', manifoldCheck(t,4).watertight && Math.abs((b.maxX-b.minX)-40)<1e-6, {}); }

console.log('\n=== TOTAL:',pass,'passed,',fail,'failed ===');
process.exit(fail?1:0);
