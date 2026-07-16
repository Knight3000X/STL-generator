// Self-contained QR encoder (byte mode, v1–6, ECC M): structural checks + a mini-DECODER that
// reverses the whole pipeline — reads the format info, unmasks, walks the zigzag, de-interleaves
// blocks, verifies the Reed-Solomon syndromes are ALL ZERO (a real ECC validity proof) and parses
// the byte-mode payload back — it must equal the input for a range of strings. Plus: the QR logo
// heightmap is sharp 0/1, embosses a box face watertight, and extrudes to a watertight 3D model.
// Run via ./run-all.sh (extraction test).

let pass = 0, fail = 0;
function check(name, cond, extra) {
  if (cond) { pass++; console.log('  OK  ', name); }
  else { fail++; console.log('  FAIL', name, extra!==undefined?JSON.stringify(extra):''); }
}
function sv(t){let v=0;for(const T of t){const a=T[0],b=T[1],c=T[2];v+=(a[0]*(b[1]*c[2]-b[2]*c[1])-a[1]*(b[0]*c[2]-b[2]*c[0])+a[2]*(b[0]*c[1]-b[1]*c[0]))/6;}return v;}

// ---- mini-decoder (independent reversal of the encoder's public conventions) -------------------
function qrDecode(qr){
  const { size, modules } = qr, m = modules;
  // format info from copy 1, un-xor 0x5412 → mask + ecc bits
  let fmt = 0;
  const fb = [];
  for(let i=0;i<6;i++) fb.push(m[8*size+i]);
  fb.push(m[8*size+7]); fb.push(m[8*size+8]); fb.push(m[7*size+8]);
  for(let i=9;i<15;i++) fb.push(m[(14-i)*size+8]);
  for(let i=0;i<15;i++) fmt |= fb[i]<<i;
  fmt ^= 0x5412;
  const mask = (fmt>>10)&7, ecc = (fmt>>13)&3;
  // rebuild the function-module map exactly as the encoder lays it out
  const version = (size-17)/4;
  const fn = new Uint8Array(size*size);
  const mark=(r,c)=>{ if(r>=0&&c>=0&&r<size&&c<size) fn[r*size+c]=1; };
  for(const [r0,c0] of [[0,0],[0,size-7],[size-7,0]])
    for(let r=-1;r<8;r++) for(let c=-1;c<8;c++) mark(r0+r,c0+c);
  for(let i=8;i<size-8;i++){ mark(6,i); mark(i,6); }
  for(const ar of QR_ALIGN[version]) for(const ac of QR_ALIGN[version]){
    if(!(ar<9&&ac<9 || ar<9&&ac>size-10 || ar>size-10&&ac<9))
      for(let r=-2;r<=2;r++) for(let c=-2;c<=2;c++) mark(ar+r,ac+c);
  }
  mark(4*version+9, 8);
  for(let i=0;i<9;i++){ mark(8,i); mark(i,8); }
  for(let i=0;i<8;i++){ mark(size-1-i,8); mark(8,size-1-i); }
  // unmask + read zigzag
  const coords = qrDataCoords(size, fn);
  const bits=[];
  for(const [r,c] of coords){
    let b = m[r*size+c];
    if(QR_MASKS[mask](r,c)) b ^= 1;
    bits.push(b);
  }
  const nCw = bits.length>>3, cw=[];
  for(let i=0;i<nCw;i++){ let b=0; for(let k=0;k<8;k++) b=(b<<1)|bits[i*8+k]; cw.push(b); }
  // de-interleave
  const [total,nEcc,nBlocks,dcw] = QR_M_TABLE[version];
  const blocks=[]; for(let b=0;b<nBlocks;b++) blocks.push({data:[],ecc:[]});
  let k=0;
  for(let i=0;i<dcw;i++) for(let b=0;b<nBlocks;b++) blocks[b].data.push(cw[k++]);
  for(let i=0;i<nEcc;i++) for(let b=0;b<nBlocks;b++) blocks[b].ecc.push(cw[k++]);
  // RS syndromes must be zero
  let synOk = true;
  for(const blk of blocks){
    const full = blk.data.concat(blk.ecc);
    for(let i=0;i<nEcc;i++){
      let s=0, x=QR_GF_EXP[i];
      for(const c of full) s = qrGfMul(s,x) ^ c;
      if(s!==0) synOk=false;
    }
  }
  // payload: mode(4) count(8) bytes
  const data=[]; for(const blk of blocks) for(const d of blk.data) data.push(d);
  const dbits=[]; for(const d of data) for(let i=7;i>=0;i--) dbits.push((d>>i)&1);
  const take=n=>{ let v=0; for(let i=0;i<n;i++) v=(v<<1)|dbits.shift(); return v; };
  const mode=take(4), count=take(8), out=[];
  for(let i=0;i<count;i++) out.push(take(8));
  const text = Buffer.from(out).toString('utf8');
  return { mask, ecc, mode, text, synOk };
}

console.log('=== Encode/decode roundtrip across versions ===');
for (const s of ['A', 'HELLO', 'https://example.com/stl', 'x'.repeat(40), 'Привет, мир! Тест кириллицы.', 'z'.repeat(100)]) {
  const qr = qrEncode(s);
  check(`"${s.slice(0,18)}…"(${s.length}): encoded`, !!qr, s.length);
  if (!qr) continue;
  check(`  size = 17+4v (v=${qr.version})`, qr.size === 17+4*qr.version, qr.size);
  const dec = qrDecode(qr);
  check('  ECC level M in format info', dec.ecc === 0, dec.ecc);
  check('  byte mode', dec.mode === 4, dec.mode);
  check('  RS syndromes all zero', dec.synOk);
  check('  payload roundtrips', dec.text === s, dec.text.slice(0,30));
  check('  mask matches the chosen one', dec.mask === qr.mask, {dec:dec.mask, enc:qr.mask});
}

console.log('\n=== Structural: finders + timing ===');
{
  const qr = qrEncode('STRUCT'); const m=qr.modules, n=qr.size;
  const finderOk = (r0,c0)=>{ let ok=true;
    for(let r=0;r<7;r++) for(let c=0;c<7;c++){
      const want = (r===0||r===6||c===0||c===6||(r>=2&&r<=4&&c>=2&&c<=4)) ? 1:0;
      if(m[(r0+r)*n+c0+c]!==want) ok=false; } return ok; };
  check('three finder patterns', finderOk(0,0)&&finderOk(0,n-7)&&finderOk(n-7,0));
  let timOk=true; for(let i=8;i<n-8;i++) if(m[6*n+i] !== (i%2===0?1:0)) timOk=false;
  check('timing row alternates', timOk);
  check('too-long input returns null', qrEncode('q'.repeat(200)) === null);
}

console.log('\n=== QR as a logo: heightmap, relief, extrusion ===');
{
  const res = makeQrLogoResult('https://example.com');
  check('logo result created (aspect 1)', !!res && res.aspect === 1);
  let sharp = true, dark = 0;
  for (const v of res.heightmap) { if (v!==0 && v!==1) sharp=false; dark += v; }
  check('heightmap is sharp 0/1', sharp);
  check('dark share sane (20–60%)', dark/res.heightmap.length > 0.2 && dark/res.heightmap.length < 0.6,
    +(dark/res.heightmap.length).toFixed(2));
  // relief on a box face
  logos.length = 0; boxHoles.length = 0;
  Object.assign(paramState.box, { width:50, height:50, depth:50, hollow:false, rim:false, squircle:0,
    filletRadius:0, latticeFloor:false, divX:1, divZ:1, stackFeet:false, logo3d:false, hingeRole:undefined,
    taperXPlus:0,taperXMinus:0,taperZPlus:0,taperZMinus:0,taperYPlusX:0,taperYPlusZ:0,taperYMinusX:0,taperYMinusZ:0,
    bulgeXPlus:0,bulgeXMinus:0,bulgeZPlus:0,bulgeZMinus:0,bulgeYPlus:0,bulgeYMinus:0 });
  logos.push({ id:1, face:'+Z', u0:0, v0:0, w:30, h:30, depth:1.2, threshold:0.5, invert:false,
    rotation:0, heightmap: res.heightmap, aspect:1 });
  const tris = buildTrisForShape('box', paramState.box);
  const mc = manifoldCheck(tris, 4);
  check('QR relief on a face: watertight', mc.watertight, mc);
  // standalone extrusion (the «3D» path)
  const ex = buildLogoExtrudeTris(logos[0], 40, 40, 2.4, 200);
  const mcE = manifoldCheck(ex, 4);
  check('QR extruded model: watertight & +vol', mcE.watertight && sv(ex) > 0, mcE);
  logos.length = 0;
}

console.log(`\n=== TOTAL: ${pass} passed, ${fail} failed ===`);
process.exit(fail ? 1 : 0);
