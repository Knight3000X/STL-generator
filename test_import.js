// Mesh import: STL binary / STL ASCII / OBJ parsers + scaleImportedMesh (centre-on-origin, uniform % or
// non-uniform fit-to-box) through the REAL pipeline.
//
// Плюс три вещи, каждая из которых ломалась ТИХО — файл открывался, карточки появлялись, и всё выглядело
// работающим:
//   · СИСТЕМА КООРДИНАТ. Приложение моделирует в Y-вверх, слайсеры едят Z-вверх; на выходе это учтено
//     давно, на входе не учитывалось вовсе, и импортированное приезжало лёжа на боку. Заметить трудно —
//     модель видно, она просто повёрнута.
//   · ГЕОМЕТРИЯ В ЗАПИСИ. buildTrisForShape для НЕАКТИВНЫХ моделей не зовёт никто, а показ, экспорт и
//     карточка читают rawTris записи. Из файла на двадцать семь деталей строилась одна.
//   · ИМЯ И ЦВЕТ. Они лежат в метаданных слайсера (model_settings.config + project_settings.config), и
//     порознь эти файлы бесполезны: номер филамента без палитры — число, палитра без номера — список.
// Run via ./run-all.sh.
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
  /* 8) СИСТЕМА КООРДИНАТ. Приложение моделирует в Y-ВВЕРХ, слайсеры едят Z-ВВЕРХ, и на выходе это давно
        учтено (toPrintFrameTris). На ВХОДЕ не учитывалось вовсе, и любой импортированный файл приезжал
        лёжа на боку: у подставки 100×100×3.6 толщина шла по глубине сцены, а не по высоте. Заметить это
        трудно ровно потому, что модель всё равно видно — она просто повёрнута, и рука тянется довернуть
        её ручками вместо того, чтобы заподозрить границу форматов. */
  {
    const one = await parseMeshFileParts(makeBinSTL(T), 'тетра.stl');
    const b = bbox(one[0].tris);
    chk('импорт ставит модель на пол: 2×4×6 в файле → 2×6×4 в сцене',
        approx(b.maxX-b.minX, 2) && approx(b.maxY-b.minY, 6) && approx(b.maxZ-b.minZ, 4),
        [b.maxX-b.minX, b.maxY-b.minY, b.maxZ-b.minZ]);
    // Точное обращение: экспорт после импорта возвращает исходные координаты до последнего знака.
    const back = toPrintFrameTris(fromPrintFrameTris(T));
    chk('импорт и экспорт — взаимно обратны', JSON.stringify(back) === JSON.stringify(T), back[0]);
    // И это ПОВОРОТ, а не отражение: объём со знаком не меняется.
    const vol = t => { let v = 0; for (const q of t){ const [a,b2,c] = q;
      v += (a[0]*(b2[1]*c[2]-b2[2]*c[1]) - a[1]*(b2[0]*c[2]-b2[2]*c[0]) + a[2]*(b2[0]*c[1]-b2[1]*c[0]))/6; } return v; };
    chk('это поворот, а не отражение (знак объёма цел)',
        Math.abs(vol(fromPrintFrameTris(T)) - vol(T)) < 1e-9, [vol(T), vol(fromPrintFrameTris(T))]);
  }

  /* 9) ИМЯ И ЦВЕТ ИЗ МЕТАДАННЫХ СЛАЙСЕРА. Bambu Studio и Orca кладут рядом два файла, и порознь они
        бесполезны: `model_settings.config` даёт имя объекта и НОМЕР филамента, `project_settings.config` —
        палитру. Номер без палитры просто число, палитра без номера просто список. Вместе они дают то, что
        видно в слайсере, и то, чего у импортированной детали не было: своё имя вместо «Деталь 2» и свой
        цвет вместо общего серого. */
  {
    const model = '<?xml version="1.0"?><model unit="millimeter"><resources>' +
      '<object id="1" type="model"><mesh><vertices>' +
      '<vertex x="0" y="0" z="0"/><vertex x="2" y="0" z="0"/><vertex x="0" y="4" z="0"/><vertex x="0" y="0" z="6"/>' +
      '</vertices><triangles>' +
      '<triangle v1="0" v2="2" v3="1"/><triangle v1="0" v2="1" v3="3"/>' +
      '<triangle v1="0" v2="3" v3="2"/><triangle v1="1" v2="2" v3="3"/>' +
      '</triangles></mesh></object>' +
      '<object id="2" type="model"><mesh><vertices>' +
      '<vertex x="0" y="0" z="0"/><vertex x="2" y="0" z="0"/><vertex x="0" y="4" z="0"/><vertex x="0" y="0" z="6"/>' +
      '</vertices><triangles>' +
      '<triangle v1="0" v2="2" v3="1"/><triangle v1="0" v2="1" v3="3"/>' +
      '<triangle v1="0" v2="3" v3="2"/><triangle v1="1" v2="2" v3="3"/>' +
      '</triangles></mesh></object></resources>' +
      '<build><item objectid="1" transform="1 0 0 0 1 0 0 0 1 0 0 0"/>' +
      '<item objectid="2" transform="1 0 0 0 1 0 0 0 1 30 0 0"/></build></model>';
    const ms = '<?xml version="1.0"?><config>' +
      // Объект 1: часть МОЛЧИТ — значит наследует номер объекта (3 → жёлтый).
      '<object id="1"><metadata key="name" value="Orbital Laser.stl"/><metadata key="extruder" value="3"/>' +
      '<part id="1" subtype="normal_part"><metadata key="name" value="Не это имя"/></part></object>' +
      // Объект 2: своего номера нет, часть говорит 2 → чёрный.
      '<object id="2"><metadata key="name" value="Ramp.stl"/>' +
      '<part id="2" subtype="normal_part"><metadata key="extruder" value="2"/></part></object>' +
      // Объект 3: часть ВЫШЕ собственных метаданных объекта. Настоящие слайсеры так не пишут, но и не
      // обязаны: порядок здесь ничем не закреплён, а ответ от него зависеть не должен.
      '<object id="3"><part id="3" subtype="normal_part"/>' +
      '<metadata key="name" value="Перевёрнутый.stl"/><metadata key="extruder" value="4"/></object>' +
      // Объект 4: части СПОРЯТ — одного цвета у склеенной детали нет, берётся объявленный объектом.
      '<object id="4"><metadata key="extruder" value="4"/>' +
      '<part id="4" subtype="normal_part"><metadata key="extruder" value="1"/></part>' +
      '<part id="5" subtype="normal_part"><metadata key="extruder" value="2"/></part></object>' +
      '</config>';
    const ps = JSON.stringify({ filament_colour: ['#FFFFFF', '#000000', '#F4EE2A', '#545454'] });
    const buf = zipStored([
      {name:'3D/3dmodel.model', method:0, data:enc.encode(model)},
      {name:'Metadata/model_settings.config', method:0, data:enc.encode(ms)},
      {name:'Metadata/project_settings.config', method:0, data:enc.encode(ps)}]);
    const parts = await parse3MF(buf);
    chk('деталей две', parts.length === 2, parts.length);
    chk('имя взято у слайсера, расширение отброшено', parts[0].name === 'Orbital Laser', parts[0].name);
    chk('молчащая часть наследует номер объекта', parts[0].color === '#F4EE2A', parts[0].color);
    chk('говорящая часть перекрывает объект', parts[1].color === '#000000', parts[1].color);
    chk('и своё имя', parts[1].name === 'Ramp', parts[1].name);
    const meta = parse3MFMeta(ms, ps).objs;
    chk('своё у объекта то, что не внутри части — даже если часть выше',
        meta.get('3').extruder === 4 && meta.get('3').name === 'Перевёрнутый.stl', meta.get('3'));
    chk('спорящие части — берётся номер объекта', meta.get('4').extruder === 4, meta.get('4'));
    // Без метаданных всё как было: имя из XML или номер, цвета нет.
    const bare = await parse3MF(zipStored([{name:'3D/3dmodel.model', method:0, data:enc.encode(model)}]));
    chk('без метаданных имя — номер объекта', bare[0].name === 'Деталь 1', bare[0].name);
    chk('и цвета нет', !bare[0].color, bare[0].color);
    // Палитра из мусора не притворяется палитрой.
    const bad = parse3MFMeta('<config><object id="1"><metadata key="extruder" value="2"/></object></config>', 'не json');
    chk('нечитаемая палитра — пустая', bad.palette.length === 0);
    chk('но номер филамента всё равно прочитан', bad.objs.get('1').extruder === 2);
  }

  /* 10) ГЕОМЕТРИЯ ПИШЕТСЯ В ЗАПИСЬ. `buildTrisForShape` для НЕАКТИВНЫХ моделей не зовёт никто: показ,
         экспорт, счётчик треугольников и габарит карточки читают `rawTris` записи. Пока addImportedPart
         этого не делал, из файла на двадцать семь деталей строилась ОДНА — та, которую loadModel делал
         активной, — а остальные стояли с нулём треугольников и пустым габаритом. Молча: файл открылся,
         карточки появились, в сцене одна деталь. */
  {
    const before = models.length;
    const a = addImportedPart(fromPrintFrameTris(T), 'Первая', false, '#123456');
    const b2 = addImportedPart(fromPrintFrameTris(T), 'Вторая', false, null);
    chk('обе записи добавлены', models.length === before + 2, models.length);
    chk('у первой есть геометрия', a.rawTris && a.rawTris.length > 0, a.rawTris && a.rawTris.length);
    chk('и у второй тоже — она не активна и никто её больше не построит',
        b2.rawTris && b2.rawTris.length > 0, b2.rawTris && b2.rawTris.length);
    chk('габарит посчитан, а не остался пустым', !!a.bbox && Number.isFinite(a.bbox.maxX), a.bbox);
    chk('цвет из файла взят', a.color === '#123456', a.color);
    chk('без цвета остаётся общий серый', b2.color === '#b9c5cd', b2.color);
    // Размеры записи — родные размеры детали: 100 % масштаба это тождество.
    chk('размеры записи — родные', approx(a.params.width, 2) && approx(a.params.height, 6) && approx(a.params.depth, 4),
        [a.params.width, a.params.height, a.params.depth]);
    models.length = before;
  }

  /* 11) ЦЕПОЧКА ЦЕЛИКОМ. Разбор находил цвет, проверка разбора его видела — а в сборку он не доезжал:
         посередине стоял шаг, который пересобирал деталь из пары полей (`{name, tris}`) и молча ронял
         всё остальное. Единственным следом была серая деталь там, где в файле чёрная. Поэтому здесь
         проверяется не разбор и не запись по отдельности, а ПУТЬ от файла до модели сборки. */
  {
    const kept = sanitizeImportParts([{ name:'Цветная', color:'#BD1828', tris: T },
                                      { name:'Битая', color:'#123456',
                                        tris: [[[0,0,0],[1,0,0],[NaN,0,0]]] },
                                      { name:'Полубитая', color:'#00FF00',
                                        tris: T.concat([[[0,0,0],[1,0,0],[0,Infinity,0]]]) }]);
    chk('деталь из одних битых треугольников выброшена', kept.length === 2, kept.map(p=>p.name));
    chk('битый треугольник выброшен, целые остались', kept[1].tris.length === T.length, kept[1].tris.length);
    chk('ЦВЕТ пережил чистку', kept[0].color === '#BD1828' && kept[1].color === '#00FF00',
        kept.map(p=>p.color));
    chk('и имя тоже', kept[0].name === 'Цветная', kept[0].name);

    // …и весь путь: файл → разбор → чистка → запись сборки.
    const model = '<?xml version="1.0"?><model unit="millimeter"><resources>' +
      '<object id="7" type="model"><mesh><vertices>' +
      '<vertex x="0" y="0" z="0"/><vertex x="2" y="0" z="0"/><vertex x="0" y="4" z="0"/><vertex x="0" y="0" z="6"/>' +
      '</vertices><triangles>' +
      '<triangle v1="0" v2="2" v3="1"/><triangle v1="0" v2="1" v3="3"/>' +
      '<triangle v1="0" v2="3" v3="2"/><triangle v1="1" v2="2" v3="3"/>' +
      '</triangles></mesh></object></resources>' +
      '<build><item objectid="7" transform="1 0 0 0 1 0 0 0 1 0 0 0"/></build></model>';
    const ms = '<?xml version="1.0"?><config><object id="7">' +
      '<metadata key="name" value="Подставка.stl"/><metadata key="extruder" value="2"/>' +
      '<part id="7" subtype="normal_part"/></object></config>';
    const ps = JSON.stringify({ filament_colour: ['#FFFFFF', '#000000'] });
    const buf = zipStored([
      {name:'3D/3dmodel.model', method:0, data:enc.encode(model)},
      {name:'Metadata/model_settings.config', method:0, data:enc.encode(ms)},
      {name:'Metadata/project_settings.config', method:0, data:enc.encode(ps)}]);
    const raw = await parseMeshFileParts(buf, 'набор.3mf');
    const clean = sanitizeImportParts(raw);
    const before = models.length;
    const rec = addImportedPart(clean[0].tris, clean[0].name, false, clean[0].color);
    chk('цвет доехал от файла до записи сборки', rec.color === '#000000', rec.color);
    chk('имя доехало тоже', rec.name === 'Подставка', rec.name);
    chk('и геометрия', rec.rawTris.length === 4, rec.rawTris.length);
    models.length = before;
  }

  /* 12) МЕСТО ДЕТАЛИ. 3MF несёт его матрицей, вшитой в координаты, — и до записи оно доезжает, а в записи
         теряется: каждая модель сборки устроена как «форма в своём нуле + место в px/py/pz», и
         scaleImportedMesh честно центрует сетку на её начале. Замерено на присланном файле: двадцать семь
         деталей, стоявших от 28 до 838 мм по X, вставали в ОДИН НОЛЬ, друг на друга. */
  {
    const model = '<?xml version="1.0"?><model unit="millimeter"><resources>' +
      '<object id="1" name="A" type="model"><mesh><vertices>' +
      '<vertex x="0" y="0" z="0"/><vertex x="2" y="0" z="0"/><vertex x="0" y="4" z="0"/><vertex x="0" y="0" z="6"/>' +
      '</vertices><triangles>' +
      '<triangle v1="0" v2="2" v3="1"/><triangle v1="0" v2="1" v3="3"/>' +
      '<triangle v1="0" v2="3" v3="2"/><triangle v1="1" v2="2" v3="3"/>' +
      '</triangles></mesh></object></resources>' +
      '<build><item objectid="1" transform="1 0 0 0 1 0 0 0 1 0 0 0"/>' +
      '<item objectid="1" transform="1 0 0 0 1 0 0 0 1 30 0 0"/></build></model>';
    const parts = sanitizeImportParts(await parseMeshFileParts(
      zipStored([{name:'3D/3dmodel.model', method:0, data:enc.encode(model)}]), 'узел.3mf'));
    chk('деталей две', parts.length === 2, parts.length);
    // Тетра в файле: x 0…2, y 0…4, z 0…6 → в сцене x 0…2, y 0…6, z −4…0. Вторая сдвинута на +30 по X.
    const org = importAssemblyOrigin(parts);
    chk('начало сборки — середина её габарита по X и Z',
        approx(org.x, 16) && approx(org.z, -2), org);
    const before = models.length;
    const a = addImportedPart(parts[0].tris, 'A', false, null, org);
    const b2 = addImportedPart(parts[1].tris, 'B', false, null, org);
    chk('места РАЗНЫЕ, а не общий ноль', a.px !== b2.px, [a.px, b2.px]);
    chk('взаимное расположение из файла сохранено', approx(b2.px - a.px, 30), b2.px - a.px);
    chk('и сборка приехала к началу координат', approx(a.px, -15) && approx(b2.px, 15), [a.px, b2.px]);
    chk('по Z обе на месте', approx(a.pz, 0) && approx(b2.pz, 0), [a.pz, b2.pz]);
    // По Y не вычитается ничего: высота над столом — это сама деталь, а не произвол раскладки.
    chk('высота над столом сохранена', approx(a.py, 3) && approx(b2.py, 3), [a.py, b2.py]);
    chk('сетка при этом отцентрована на своём нуле',
        approx((a.bbox.minX + a.bbox.maxX)/2, 0), [a.bbox.minX, a.bbox.maxX]);
    // Одиночный файл — по-прежнему «следующая правее предыдущей»: у него своей раскладки нет.
    const solo = addImportedPart(parts[0].tris, 'Один', true, null, null);
    chk('одиночная деталь раскладывается вправо, а не по координатам файла',
        solo.px > b2.px, [solo.px, b2.px]);
    models.length = before;
  }

  /* 13) ЦВЕТА САМОГО ФОРМАТА. Спецификация 3MF описывает их `<basematerials>`, расширение материалов —
         `<m:colorgroup>`; и то и другое пишет этот генератор, и то и другое до сих пор импорт не читал
         вовсе. Следствие было ровно одно и вполне обидное: СВОЙ ЖЕ экспорт возвращался серым — цвет в
         файле есть, любой просмотрщик его показывает, а генератор своего же цвета не узнаёт. */
  {
    const mats = parse3MFMaterials(
      '<resources><basematerials id="1">' +
      '<base name="a" displaycolor="#112233FF"/><base name="b" displaycolor="#445566"/>' +
      '<base name="c" displaycolor="мусор"/></basematerials>' +
      '<m:colorgroup id="7"><m:color color="#AABBCCDD"/></m:colorgroup></resources>');
    chk('basematerials прочитан', (mats.get('1')||[]).length === 3, mats.get('1'));
    chk('прозрачность отброшена, цвет остался', mats.get('1')[0] === '#112233' && mats.get('1')[1] === '#445566',
        mats.get('1'));
    chk('мусор не притворяется цветом', mats.get('1')[2] === null, mats.get('1')[2]);
    chk('место в группе за ним сохранено (иначе съедет pindex)', mats.get('1').length === 3);
    chk('m:colorgroup читается тоже', (mats.get('7')||[])[0] === '#AABBCC', mats.get('7'));

    // Файл БЕЗ слайсерных метаданных: цвет лежит только в материалах формата.
    const mesh = '<mesh><vertices>' +
      '<vertex x="0" y="0" z="0"/><vertex x="2" y="0" z="0"/><vertex x="0" y="4" z="0"/><vertex x="0" y="0" z="6"/>' +
      '</vertices><triangles>' +
      '<triangle v1="0" v2="2" v3="1"/><triangle v1="0" v2="1" v3="3"/>' +
      '<triangle v1="0" v2="3" v3="2"/><triangle v1="1" v2="2" v3="3"/>' +
      '</triangles></mesh>';
    const model = '<?xml version="1.0"?><model unit="millimeter"><resources>' +
      '<basematerials id="1"><base name="ч" displaycolor="#141414FF"/><base name="к" displaycolor="#BD1828FF"/></basematerials>' +
      '<object id="2" type="model" pid="1" pindex="0">' + mesh + '</object>' +
      '<object id="3" type="model" pid="1" pindex="1">' + mesh + '</object>' +
      // Тело из ДВУХ частей разного цвета: одного цвета у склеенной детали нет вовсе.
      '<object id="4" type="model"><components>' +
      '<component objectid="2" transform="1 0 0 0 1 0 0 0 1 0 0 0"/>' +
      '<component objectid="3" transform="1 0 0 0 1 0 0 0 1 0 0 0"/></components></object>' +
      '</resources><build>' +
      '<item objectid="2" transform="1 0 0 0 1 0 0 0 1 0 0 0"/>' +
      '<item objectid="3" transform="1 0 0 0 1 0 0 0 1 40 0 0"/>' +
      '<item objectid="4" transform="1 0 0 0 1 0 0 0 1 80 0 0"/></build></model>';
    const parts = await parse3MF(zipStored([{name:'3D/3dmodel.model', method:0, data:enc.encode(model)}]));
    chk('деталей три', parts.length === 3, parts.length);
    chk('цвет взят из материала формата', parts[0].color === '#141414' && parts[1].color === '#BD1828',
        parts.map(p=>p.color));
    chk('у тела из частей разного цвета своего цвета нет', !parts[2].color, parts[2].color);

    // Слайсер главнее: печатается тем, что назначено филаментом.
    const ms = '<?xml version="1.0"?><config><object id="2">' +
      '<metadata key="extruder" value="2"/><part id="2" subtype="normal_part"/></object></config>';
    const ps = JSON.stringify({ filament_colour: ['#FFFFFF', '#00FF00'] });
    const both = await parse3MF(zipStored([
      {name:'3D/3dmodel.model', method:0, data:enc.encode(model)},
      {name:'Metadata/model_settings.config', method:0, data:enc.encode(ms)},
      {name:'Metadata/project_settings.config', method:0, data:enc.encode(ps)}]));
    chk('метаданные слайсера перебивают материал формата', both[0].color === '#00FF00', both[0].color);
    chk('а там, где слайсер молчит, остаётся материал', both[1].color === '#BD1828', both[1].color);
  }

  /* 14) КРУГ ЗАМКНУТ: свой экспорт → свой импорт. Цвет, имя и взаимное расположение обязаны вернуться. */
  {
    const keepModels = models.slice(), keepActive = activeModelId, keepCached = cachedRawTris;
    Object.assign(paramState.box, defaultBoxParams(), {gfBaseplate:false});
    logos.length = 0; boxHoles.length = 0; dieFaces.length = 0;
    const solid = buildTrisForShape('box', paramState.box);
    models.length = 0;
    [['Тело','#141414',0], ['Логотип','#bd1828',60], ['Третья','#00aa55',120]].forEach(([nm, col, px]) =>
      models.push({ id: nextModelId++, name: nm, visible: true, rawTris: solid, shape: 'box',
        params: JSON.parse(JSON.stringify(paramState.box)), logos: [], holes: [], dieFaces: [],
        color: col, rx:0, ry:0, rz:0, px, py:0, pz:0, bbox: computeBBox(solid) }));
    activeModelId = models[0].id; cachedRawTris = solid;
    const ab = await assemblyTo3MF().arrayBuffer();
    const back = sanitizeImportParts(await parseMeshFileParts(ab, 'своё.3mf'));
    chk('вернулись все три детали', back.length === 3, back.length);
    chk('имена вернулись', back.map(p=>p.name).join('|') === 'Тело|Логотип|Третья', back.map(p=>p.name));
    chk('цвета вернулись', back.map(p=>(p.color||'').toLowerCase()).join('|') === '#141414|#bd1828|#00aa55',
        back.map(p=>p.color));
    const org = importAssemblyOrigin(back);
    const offs = back.map(p => importPartOffset(computeBBox(p.tris), org).px);
    chk('взаимное расположение вернулось', approx(offs[1]-offs[0], 60) && approx(offs[2]-offs[1], 60), offs);
    models.length = 0; for (const m of keepModels) models.push(m);
    activeModelId = keepActive; cachedRawTris = keepCached;
  }

  console.log('\n=== TOTAL:',pass,'passed,',fail,'failed ===');
  process.exit(fail?1:0);
})();
