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

/* 3MF — ZIP с XML внутри, и берётся он ради СОСТАВНЫХ моделей: несколько объектов, каждый со своим
   местом. Проверяется весь путь целиком, на настоящем архиве, собранном прямо здесь: центральная
   директория, распаковка deflate, разбор XML, ссылки `<components>` с матрицами, раскладка `<build>`
   и единицы измерения. Разбирать один XML было бы проверкой половины дороги.

   Архив собирается вручную, без библиотек: `DecompressionStream` умеет только РАСПАКОВЫВАТЬ, поэтому
   записи кладутся методом 0 («сложено»), а отдельной записью — deflate-поток, полученный через
   `CompressionStream`. Так проверены обе ветки чтения. */
function zipStored(files){
  const enc = new TextEncoder(), parts = [], cd = [];
  let off = 0;
  const crcTab = (() => { const t = new Uint32Array(256);
    for(let n=0;n<256;n++){ let c=n; for(let k=0;k<8;k++) c = (c&1) ? (0xEDB88320 ^ (c>>>1)) : (c>>>1); t[n]=c>>>0; }
    return t; })();
  const crc32 = b => { let c = 0xFFFFFFFF; for(let i=0;i<b.length;i++) c = crcTab[(c ^ b[i]) & 0xFF] ^ (c>>>8); return (c ^ 0xFFFFFFFF)>>>0; };
  for(const f of files){
    const nm = enc.encode(f.name), data = f.data, crc = crc32(f.raw !== undefined ? f.raw : data);
    const lh = new Uint8Array(30 + nm.length), dv = new DataView(lh.buffer);
    dv.setUint32(0, 0x04034b50, true); dv.setUint16(4, 20, true); dv.setUint16(8, f.method, true);
    dv.setUint32(14, crc, true); dv.setUint32(18, data.length, true);
    dv.setUint32(22, (f.raw !== undefined ? f.raw.length : data.length), true);
    dv.setUint16(26, nm.length, true);
    lh.set(nm, 30);
    parts.push(lh, data);
    const ch = new Uint8Array(46 + nm.length), cv = new DataView(ch.buffer);
    cv.setUint32(0, 0x02014b50, true); cv.setUint16(6, 20, true); cv.setUint16(10, f.method, true);
    cv.setUint32(16, crc, true); cv.setUint32(20, data.length, true);
    cv.setUint32(24, (f.raw !== undefined ? f.raw.length : data.length), true);
    cv.setUint16(28, nm.length, true); cv.setUint32(42, off, true);
    ch.set(nm, 46);
    cd.push(ch);
    off += lh.length + data.length;
  }
  const cdOff = off; let cdLen = 0; for(const c of cd) cdLen += c.length;
  const eo = new Uint8Array(22), ev = new DataView(eo.buffer);
  ev.setUint32(0, 0x06054b50, true); ev.setUint16(8, cd.length, true); ev.setUint16(10, cd.length, true);
  ev.setUint32(12, cdLen, true); ev.setUint32(16, cdOff, true);
  let total = 0; for(const p of parts) total += p.length; total += cdLen + 22;
  const out = new Uint8Array(total); let q = 0;
  for(const p of parts){ out.set(p, q); q += p.length; }
  for(const c of cd){ out.set(c, q); q += c.length; }
  out.set(eo, q);
  return out.buffer;
}
const MODEL_XML = (unit, withBuild) => '<?xml version="1.0"?>' +
  '<model unit="' + unit + '"><resources>' +
  '<object id="1" name="Тетра" type="model"><mesh><vertices>' +
  '<vertex x="0" y="0" z="0"/><vertex x="2" y="0" z="0"/><vertex x="0" y="4" z="0"/><vertex x="0" y="0" z="6"/>' +
  '</vertices><triangles>' +
  '<triangle v1="0" v2="2" v3="1"/><triangle v1="0" v2="1" v3="3"/>' +
  '<triangle v1="0" v2="3" v3="2"/><triangle v1="1" v2="2" v3="3"/>' +
  '</triangles></mesh></object>' +
  '<object id="2" name="Сдвинутый" type="model"><components>' +
  '<component objectid="1" transform="1 0 0 0 1 0 0 0 1 20 0 0"/></components></object>' +
  '</resources>' +
  (withBuild ? '<build><item objectid="1"/><item objectid="2" transform="1 0 0 0 1 0 0 0 1 0 50 0"/></build>' : '') +
  '</model>';

console.log('=== 3MF: составная модель приходит деталями, каждая на своём месте ===');
(async () => {
  const enc = new TextEncoder();
  // 1) без сжатия, со сборкой
  {
    const buf = zipStored([{name:'3D/3dmodel.model', method:0, data:enc.encode(MODEL_XML('millimeter', true))}]);
    const parts = await parse3MF(buf);
    chk('деталей две', parts.length === 2, parts.length);
    chk('имена взяты из файла', parts[0].name === 'Тетра' && parts[1].name === 'Сдвинутый',
        parts.map(p=>p.name));
    const b0 = computeBBox(parts[0].tris), b1 = computeBBox(parts[1].tris);
    chk('у первой габарит 2×4×6', approx(b0.maxX-b0.minX,2) && approx(b0.maxY-b0.minY,4) && approx(b0.maxZ-b0.minZ,6),
        [b0.maxX-b0.minX, b0.maxY-b0.minY, b0.maxZ-b0.minZ]);
    /* Место — главное, ради чего берётся 3MF. У второй детали складываются ДВЕ матрицы: сдвиг ссылки
       (+20 по X) и сдвиг элемента сборки (+50 по Y). Перемножь их не в том порядке — и узел рассыплется. */
    chk('матрицы ссылки и сборки сложились', approx((b1.minX+b1.maxX)/2, 21) && approx((b1.minY+b1.maxY)/2, 52),
        [(b1.minX+b1.maxX)/2, (b1.minY+b1.maxY)/2]);
  }
  // 2) со сжатием deflate
  {
    const raw = enc.encode(MODEL_XML('millimeter', true));
    const cs = new CompressionStream('deflate-raw');
    const packed = new Uint8Array(await new Response(new Blob([raw]).stream().pipeThrough(cs)).arrayBuffer());
    const buf = zipStored([{name:'3D/3dmodel.model', method:8, data:packed, raw}]);
    const parts = await parse3MF(buf);
    chk('сжатый архив читается так же', parts.length === 2 && parts[0].tris.length === 4, parts.length);
  }
  // 3) без раскладки сборки — берутся объекты с собственной сеткой
  {
    const buf = zipStored([{name:'3D/3dmodel.model', method:0, data:enc.encode(MODEL_XML('millimeter', false))}]);
    const parts = await parse3MF(buf);
    chk('без <build> берутся объекты с сеткой', parts.length === 1 && parts[0].name === 'Тетра',
        parts.map(p=>p.name));
  }
  // 4) единицы: дюймы пересчитываются в миллиметры
  {
    const buf = zipStored([{name:'3D/3dmodel.model', method:0, data:enc.encode(MODEL_XML('inch', false))}]);
    const parts = await parse3MF(buf);
    const b = computeBBox(parts[0].tris);
    chk('дюймы пересчитаны в миллиметры', approx(b.maxX-b.minX, 2*25.4, 1e-3), b.maxX-b.minX);
  }
  // 5) отказы внятные, а не молчаливые
  {
    let msg = '';
    try { await parse3MF(new Uint8Array([1,2,3,4]).buffer); } catch(e){ msg = e.message; }
    chk('не-ZIP отвергнут словами', /не 3MF/.test(msg), msg);
    msg = '';
    try { await parse3MF(zipStored([{name:'что-то.txt', method:0, data:enc.encode('привет')}])); }
    catch(e){ msg = e.message; }
    chk('ZIP без модели отвергнут словами', /3dmodel\.model/.test(msg), msg);
  }
  /* 6) РАСШИРЕНИЕ PRODUCTION: геометрия в отдельных файлах, в главном одни ссылки `p:path`.
        Так пишут Bambu Studio и Orca, то есть почти всё, что скачивается с MakerWorld. Первая версия
        парсера читала только `3D/3dmodel.model` и на таких файлах возвращала НОЛЬ деталей — молча, потому
        что «нет вершин» неотличимо от «пустая модель». Из семи настоящих файлов не открылись пять.

        Номера объектов в разных файлах СВОИ и совпадают сплошь и рядом: здесь и главный, и внешний
        содержат объект с id="1", и они разные. Поэтому объект опознаётся парой «файл + id». */
  {
    const external = '<?xml version="1.0"?><model unit="millimeter"><resources>' +
      '<object id="1" name="Внешняя" type="model"><mesh><vertices>' +
      '<vertex x="0" y="0" z="0"/><vertex x="2" y="0" z="0"/><vertex x="0" y="4" z="0"/><vertex x="0" y="0" z="6"/>' +
      '</vertices><triangles>' +
      '<triangle v1="0" v2="2" v3="1"/><triangle v1="0" v2="1" v3="3"/>' +
      '<triangle v1="0" v2="3" v3="2"/><triangle v1="1" v2="2" v3="3"/>' +
      '</triangles></mesh></object></resources></model>';
    // В главном файле объект с ТЕМ ЖЕ id="1", но пустой: он только ссылается на внешний.
    const main = '<?xml version="1.0"?><model unit="millimeter" xmlns:p="…/production/2015/06"><resources>' +
      '<object id="1" name="Обёртка" type="model"><components>' +
      '<component p:path="/3D/Objects/object_1.model" objectid="1" transform="1 0 0 0 1 0 0 0 1 5 0 0"/>' +
      '</components></object></resources>' +
      '<build><item objectid="1" transform="1 0 0 0 1 0 0 0 1 0 7 0"/></build></model>';
    const buf = zipStored([
      {name:'3D/3dmodel.model', method:0, data:enc.encode(main)},
      {name:'3D/Objects/object_1.model', method:0, data:enc.encode(external)}]);
    const parts = await parse3MF(buf);
    chk('геометрия из внешнего файла найдена', parts.length === 1 && parts[0].tris.length === 4,
        {деталей:parts.length, тр:parts[0] && parts[0].tris.length});
    const b = computeBBox(parts[0].tris);
    // Тетра занимает x∈[0,2], y∈[0,4] — центр её ГАБАРИТА (1, 2), а не центр тяжести.
    // Ссылка сдвигает на +5 по X, элемент сборки на +7 по Y.
    chk('и матрицы ссылки и сборки сложились', approx((b.minX+b.maxX)/2, 6, 1e-3) &&
        approx((b.minY+b.maxY)/2, 9, 1e-3), [(b.minX+b.maxX)/2, (b.minY+b.maxY)/2]);
    chk('взят объект ВНЕШНЕГО файла, а не одноимённый из главного',
        parts[0].tris.length === 4, parts[0].tris.length);
  }

  // 7) общий вход отдаёт список деталей для всех форматов
  {
    const one = await parseMeshFileParts(makeBinSTL(T), 'куб.stl');
    chk('STL приходит одной деталью', one.length === 1 && one[0].tris.length === 4, one.length);
    const buf = zipStored([{name:'3D/3dmodel.model', method:0, data:enc.encode(MODEL_XML('millimeter', true))}]);
    const two = await parseMeshFileParts(buf, 'узел.3mf');
    chk('3MF приходит двумя', two.length === 2, two.length);
  }
  console.log('\n=== TOTAL:',pass,'passed,',fail,'failed ===');
  process.exit(fail?1:0);
})();
