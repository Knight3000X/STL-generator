// 3MF export: an OPC zip (store-only, real CRC32) with [Content_Types].xml, _rels/.rels,
// 3D/3dmodel.model and Metadata/model_settings.config. The test UNZIPS the writer's own output
// (parsing local headers), re-computes every CRC, and checks the model XML carries the right
// objects/vertices/triangles per visible model, that AMS colour parts arrive as PARTS of one
// object rather than as separate objects, and that each part names its own filament.
//
// Плюс ПАЛИТРА: `Metadata/project_settings.config`, собранный из шаблона пользователя с подставленным
// `filament_colour`. Это единственное место, откуда Orca берёт цвета филамента, и портится оно тихо —
// подставить палитру и заодно сдвинуть чужой ключ или длину чужого вектора значит подменить человеку
// профиль принтера, ничего ему об этом не сказав. Поэтому проверяется не «цвета на месте», а «изменился
// РОВНО ОДИН ключ».
// Run via ./run-all.sh (extraction test).

async function main(){
let pass = 0, fail = 0;
function check(name, cond, extra) {
  if (cond) { pass++; console.log('  OK  ', name); }
  else { fail++; console.log('  FAIL', name, extra!==undefined?JSON.stringify(extra):''); }
}

// minimal store-zip reader for the test
function readZip(buf){
  const dv = new DataView(buf.buffer || buf), out = {};
  let off = 0;
  while (off + 4 <= dv.byteLength && dv.getUint32(off, true) === 0x04034b50){
    const crc = dv.getUint32(off+14, true), size = dv.getUint32(off+18, true);
    const nameLen = dv.getUint16(off+26, true), extraLen = dv.getUint16(off+28, true);
    const name = new TextDecoder().decode(new Uint8Array(dv.buffer, off+30, nameLen));
    const data = new Uint8Array(dv.buffer, off+30+nameLen+extraLen, size);
    out[name] = { crc, data: new Uint8Array(data) };
    off += 30 + nameLen + extraLen + size;
  }
  return out;
}

// model_settings.config → [{id, name, extruder}], one entry per <part>. Split rather than matched
// across the whole file so a part missing a key cannot silently borrow the next part's.
function parseParts(cfg){
  return cfg.split('<part ').slice(1).map(chunk => {
    const body = chunk.slice(0, chunk.indexOf('</part>'));
    const val = k => (new RegExp('key="' + k + '" value="([^"]*)"').exec(body) || [])[1];
    return { id: (/^id="(\d+)"/.exec(chunk)||[])[1], name: val('name') || '', extruder: +(val('extruder') || 0) };
  });
}

console.log('=== zip writer basics ===');
{
  const blob = makeZipStore([{name:'a.txt', text:'hello'}, {name:'d/b.txt', text:'мир'}]);
  const buf = new Uint8Array(await blob.arrayBuffer());
  check('zip starts with PK\\x03\\x04', buf[0]===0x50 && buf[1]===0x4B && buf[2]===3 && buf[3]===4);
  const entries = readZip(buf);
  check('both entries present', !!entries['a.txt'] && !!entries['d/b.txt'], Object.keys(entries));
  check('stored data readable', new TextDecoder().decode(entries['a.txt'].data) === 'hello');
  check('utf-8 payload survives', new TextDecoder().decode(entries['d/b.txt'].data) === 'мир');
  check('CRC32 matches recomputation', entries['a.txt'].crc === crc32(new TextEncoder().encode('hello')) &&
    entries['d/b.txt'].crc === crc32(new TextEncoder().encode('мир')));
  check('known CRC vector ("123456789" -> 0xCBF43926)', crc32(new TextEncoder().encode('123456789')) === 0xCBF43926);
}

console.log('\n=== assembly → 3MF ===');
{
  // two models: a cube and a moved/rotated plate; one hidden model must be skipped
  models.length = 0; activeModelId = null; nextModelId = 1;
  models.push(makeModelRecord('A', defaultBoxParams()));
  activeModelId = models[0].id;
  Object.assign(paramState.box, { width:20, height:20, depth:20, hollow:false, gfOn:false });
  logos.length=0; boxHoles.length=0;
  regenerate();
  saveActiveModel();
  const rec2 = makeModelRecord('B', Object.assign(defaultBoxParams(), { width:30, height:4, depth:30 }));
  rec2.rawTris = buildTrisForShape('box', rec2.params);
  rec2.px = 50; rec2.ry = 45;
  models.push(rec2);
  const rec3 = makeModelRecord('C', defaultBoxParams());
  rec3.rawTris = rec2.rawTris; rec3.visible = false;
  models.push(rec3);

  models[0].color = '#112233';
  rec2.color = '#445566';

  const blob = assemblyTo3MF();
  const entries = readZip(new Uint8Array(await blob.arrayBuffer()));
  check('OPC parts present', !!entries['[Content_Types].xml'] && !!entries['_rels/.rels'] && !!entries['3D/3dmodel.model'],
    Object.keys(entries));
  const xml = new TextDecoder().decode(entries['3D/3dmodel.model'].data);
  check('unit is millimeter', /unit="millimeter"/.test(xml));
  const meshObjs = [...xml.matchAll(/<object id="(\d+)"[^>]*><mesh>/g)].map(m => m[1]);
  const compObjs = [...xml.matchAll(/<object id="(\d+)"[^>]*><components>/g)].map(m => m[1]);
  const items = [...xml.matchAll(/<item objectid="(\d+)"/g)].map(m => m[1]);
  check('2 visible models → 2 mesh objects (hidden skipped)', meshObjs.length === 2, meshObjs);
  check('each is wrapped in a body of its own', compObjs.length === 2, compObjs);
  check('the build holds the bodies, not the meshes',
        items.length === 2 && items.every(i => compObjs.indexOf(i) >= 0 && meshObjs.indexOf(i) < 0),
        {items, compObjs});
  // a component may only reference a resource ALREADY defined — parts must precede their body
  const comps = [...xml.matchAll(/<component objectid="(\d+)"/g)].map(m => m[1]);
  check('every component names a mesh object', comps.length === 2 && comps.every(c => meshObjs.indexOf(c) >= 0),
        {comps, meshObjs});
  check('parts are declared before the body that holds them',
        comps.every(c => xml.indexOf('<object id="' + c + '"') < xml.indexOf('<component objectid="' + c + '"')));
  // the transforms are already baked into the vertices, so every frame on the way out is the identity —
  // a component or an item carrying a second copy of the placement would apply it twice
  check('components sit at the identity',
        (xml.match(/<component objectid="\d+" transform="1 0 0 0 1 0 0 0 1 0 0 0"\/>/g)||[]).length === comps.length);
  check('build items sit at the identity',
        (xml.match(/<item objectid="\d+" transform="1 0 0 0 1 0 0 0 1 0 0 0"\/>/g)||[]).length === items.length);
  // cube object: 8 unique vertices, 12 triangles
  const first = xml.slice(xml.indexOf('<object id="' + meshObjs[0] + '"'), xml.indexOf('</object>'));
  check('cube: 8 deduped vertices', (first.match(/<vertex /g)||[]).length === 8, (first.match(/<vertex /g)||[]).length);
  check('cube: 12 triangles', (first.match(/<triangle /g)||[]).length === 12, (first.match(/<triangle /g)||[]).length);
  // second object baked at px=50: its vertices centre around x≈50
  const second = xml.slice(xml.indexOf('<object id="' + meshObjs[1] + '"'));
  const xs = [...second.matchAll(/<vertex x="([-0-9.]+)"/g)].map(m=>parseFloat(m[1]));
  const cx = xs.reduce((a,b)=>a+b,0)/xs.length;
  check('moved model baked at x≈50', Math.abs(cx - 50) < 0.5, {cx:+cx.toFixed(2)});
  // triangle indices reference existing vertices
  const nV = (second.match(/<vertex /g)||[]).length;
  const bad = [...second.matchAll(/<triangle v1="(\d+)" v2="(\d+)" v3="(\d+)"/g)]
    .some(m => +m[1] >= nV || +m[2] >= nV || +m[3] >= nV);
  check('triangle indices in range', !bad, {nV});

  // ---- COLOUR ------------------------------------------------------------------------------------
  // The two-colour keycap and the multi-tone coaster export as several shells sitting in EXACTLY the
  // same place, flush, so the outside is one smooth surface. Without material information every part
  // lands on filament 1 and the slicer shows a plain grey disc — nothing is missing from the file, but
  // there is no way to tell which shell is which, and the person is asked to assign filaments by hand
  // to parts they cannot see. So each part carries its colour.
  const bases = [...xml.matchAll(/<base name="([^"]*)" displaycolor="(#[0-9A-F]{8})"\/>/g)];
  check('a material for every distinct colour', bases.length === 2, {bases: bases.length});
  check('materials come before the objects that reference them',
        xml.indexOf('<basematerials') < xml.indexOf('<object '));
  check('the group has an id', /<basematerials id="\d+"/.test(xml));
  // ids share ONE namespace in 3MF, so the material group and the objects must not collide
  const matId = (/<basematerials id="(\d+)"/.exec(xml)||[])[1];
  const objIds = [...xml.matchAll(/<object id="(\d+)"/g)].map(m => m[1]);
  check('material id does not collide with an object id', objIds.indexOf(matId) < 0, {matId, objIds});
  check('object ids are unique', new Set(objIds).size === objIds.length, objIds);
  // every MESH object points at the group, and at its OWN entry; a body of components carries no material
  const refs = [...xml.matchAll(/<object id="(\d+)" type="model" pid="(\d+)" pindex="(\d+)"/g)];
  check('every mesh object names its material',
        refs.length === meshObjs.length && refs.every(r => meshObjs.indexOf(r[1]) >= 0), {refs: refs.length});
  check('all of them point at the one group', refs.every(r => r[2] === matId), refs.map(r=>r[2]));
  check('and each at a different entry',
        new Set(refs.map(r => r[3])).size === refs.length, refs.map(r=>r[3]));
  check('no entry index runs past the list',
        refs.every(r => +r[3] < bases.length), {idx: refs.map(r=>+r[3]), have: bases.length});
  // the colours are the models' own, not a default repeated
  check('colours carry the models\' names', bases.some(b => b[1].length > 0), bases.map(b=>b[1]));
  check('a colour is 8 hex digits (RGB + alpha)', bases.every(b => /^#[0-9A-F]{8}$/.test(b[2])), bases.map(b=>b[2]));
  check('alpha is opaque', bases.every(b => b[2].slice(7) === 'FF'), bases.map(b=>b[2]));
  check('the models\' own colours, not a default', bases.map(b=>b[2]).join() === '#112233FF,#445566FF',
        bases.map(b=>b[2]));

  // ---- SLICER METADATA ---------------------------------------------------------------------------
  // `<basematerials>` is the core spec's answer and every conforming viewer reads it, but a slicer picks
  // what to print with from its own metadata: without Metadata/model_settings.config Orca puts every part
  // on filament 1 and the flush multi-tone coaster comes out a plain grey disc — which is exactly what it
  // did with a file that carried displaycolor and nothing else.
  check('model_settings.config is in the package', !!entries['Metadata/model_settings.config'],
        Object.keys(entries));
  check('.config has a declared content type', /Extension="config"/.test(
        new TextDecoder().decode(entries['[Content_Types].xml'].data)));
  const cfg = entries['Metadata/model_settings.config']
    ? new TextDecoder().decode(entries['Metadata/model_settings.config'].data) : '';
  const cfgObjs = [...cfg.matchAll(/<object id="(\d+)"/g)].map(m => m[1]);
  const cfgParts = [...cfg.matchAll(/<part id="(\d+)" subtype="normal_part"/g)].map(m => m[1]);
  check('one config object per body', cfgObjs.join() === compObjs.join(), {cfgObjs, compObjs});
  check('one config part per mesh object', cfgParts.join() === meshObjs.join(), {cfgParts, meshObjs});
  const ext = parseParts(cfg).map(p => [p.id, p.extruder]);
  check('every part names a filament', ext.length === meshObjs.length && ext.every(e => e[1] > 0), ext);
  // the filament number IS the material entry, 1-based: the colour the picture chose and the colour the
  // slicer prints with must be the same colour, or the assignment is decoration
  const byMesh = new Map(refs.map(r => [r[1], +r[3] + 1]));
  check('filament number matches the part\'s own material entry',
        ext.every(e => byMesh.get(e[0]) === e[1]), {ext, want: [...byMesh]});
  check('each part carries a name', parseParts(cfg).every(p => p.name.length > 0), parseParts(cfg).map(p=>p.name));
  check('each part carries the identity matrix',
        (cfg.match(/key="matrix" value="1 0 0 0 0 1 0 0 0 0 1 0 0 0 0 1"/g)||[]).length === meshObjs.length);
}

console.log('\n=== AMS colour parts are PARTS, not objects ===');
{
  // A coaster's colour plugs fill the coaster's own pocket and a keycap's core fills the shell's own
  // cavity: the shells INTERPENETRATE. Between two objects a slicer refuses to reason about that and
  // extrudes the overlap twice; between parts of one object the same overlap is resolved for free.
  // So the AMS chain has to arrive as one object with several parts — and each part on its own filament,
  // which is the whole of what "печать логотипа в цвете" means.
  models.length = 0; activeModelId = null; nextModelId = 1;
  const tris = buildTrisForShape('box', Object.assign(defaultBoxParams(), {width:20, height:4, depth:20}));
  const mk = (name, over, color, px) => {
    const rec = makeModelRecord(name, Object.assign(defaultBoxParams(), over));
    rec.rawTris = tris; rec.color = color; rec.px = px || 0;
    models.push(rec); return rec;
  };
  mk('Подстаканник',  {csMode:'round', csPart:'body'}, '#101010', 0);
  mk('Цвет 1 (AMS)',  {csMode:'round', csPart:'ink1'}, '#AA0000', 0);
  mk('Цвет 2 (AMS)',  {csMode:'round', csPart:'ink2'}, '#00AA00', 0);
  mk('Второй',        {csMode:'round', csPart:'body'}, '#101010', 100);   // another coaster, elsewhere
  mk('Кубик',         {},                              '#0000AA', 200);   // not an AMS part at all
  mk('Оболочка',      {keycapMode:'shell'},            '#101010', 300);   // the other AMS pair
  mk('Сердечник',     {keycapMode:'core'},             '#AA0000', 300);
  // Same place, turned over: a part laid on its back is not filling anyone's pocket, and merging it into
  // a body would glue two things that were never in the same place at all.
  const spun = mk('Лежит на боку', {csMode:'round', csPart:'ink1'}, '#0000AA', 100);
  spun.rz = 90;
  // no active model: assemblyTo3MF() writes the live parameter panel back onto whichever model is
  // active, and here the records ARE the fixture

  const entries = readZip(new Uint8Array(await assemblyTo3MF().arrayBuffer()));
  const xml = new TextDecoder().decode(entries['3D/3dmodel.model'].data);
  const cfg = entries['Metadata/model_settings.config']
    ? new TextDecoder().decode(entries['Metadata/model_settings.config'].data) : '';
  const compObjs = [...xml.matchAll(/<object id="(\d+)"[^>]*><components>/g)].map(m => m[1]);
  const meshObjs = [...xml.matchAll(/<object id="(\d+)"[^>]*><mesh>/g)].map(m => m[1]);
  check('8 models → 8 meshes', meshObjs.length === 8, meshObjs);
  check('but only 5 printed bodies', compObjs.length === 5, compObjs);
  const perBody = compObjs.map(id => (xml.match(new RegExp('<object id="'+id+'"[^>]*><components>(.*?)</components>'))||[])[1])
                          .map(s => (s.match(/<component /g)||[]).length);
  check('the coaster chain is one body of three parts, the keycap one of two',
        perBody.join() === '3,1,1,2,1', perBody);
  check('the build lists the five bodies', (xml.match(/<item /g)||[]).length === 5);
  check('a part turned over is not in the same place',
        mfBodyKey(models[3]) !== mfBodyKey(models[7]), [mfBodyKey(models[3]), mfBodyKey(models[7])]);
  // a coaster standing somewhere else is a different body, however identical its parameters
  check('placement separates identical bodies',
        mfBodyKey(models[0]) === mfBodyKey(models[1]) && mfBodyKey(models[0]) !== mfBodyKey(models[3]),
        [mfBodyKey(models[0]), mfBodyKey(models[3])]);
  check('an ordinary model has no body key', mfBodyKey(models[4]) === null);
  check('a plain keycap has none either', mfBodyKey({params:{keycapMode:'single'}}) === null);

  const parts = parseParts(cfg);
  check('every mesh is a part of some body', parts.map(p=>p.id).join() === meshObjs.join(), parts.map(p=>p.id));
  const chain = parts.slice(0, 3).map(p => p.extruder);
  check('the three AMS colours get three filaments', chain.join() === '1,2,3', chain);
  // identical colours are ONE filament: an AMS slot is a colour, not a part
  const bases = [...xml.matchAll(/displaycolor="(#[0-9A-F]{8})"/g)].map(m => m[1]);
  check('four distinct colours → four filaments', bases.length === 4, bases);
  check('the repeated body colour reuses its slot', parts[3].extruder === 1, parts.map(p=>p.extruder));
  check('the odd model out gets the fourth', parts[4].extruder === 4, parts.map(p=>p.extruder));
  check('the keycap pair reuses the same two slots',
        parts[5].extruder === 1 && parts[6].extruder === 2, parts.map(p=>p.extruder));
  check('config bodies are the component bodies',
        [...cfg.matchAll(/<object id="(\d+)"/g)].map(m=>m[1]).join() === compObjs.join());
  /* ИМЯ ДЕТАЛИ НЕСЁТ СЛОТ И ЕГО ЦВЕТ. Без шаблона проекта цветов филамента в файле нет вовсе, и слайсер
     показывает серую сборку с номерами слотов — а какой слот какого цвета, человек шёл выяснять назад в
     генератор. Имя читают все слайсеры и все просмотрщики, и стоит оно рядом с деталью, поэтому ответ
     кладётся туда. Своё имя при этом обязано уцелеть: хвост приписывается, а не заменяет. */
  check('имя детали уцелело', parts[1].name.indexOf('Цвет 1 (AMS)') === 0, parts[1].name);
  check('и несёт номер слота и его цвет', parts[1].name === 'Цвет 1 (AMS) \u00b7 слот 2 \u00b7 #AA0000',
        parts[1].name);
  check('слот в имени — тот же, что в metadata',
        parts.every(q => q.name.indexOf('\u00b7 слот ' + q.extruder + ' \u00b7') > 0),
        parts.map(q => [q.extruder, q.name]));
  check('и цвет в имени — тот же, что у его материала',
        parts.every(q => bases.indexOf(q.name.slice(-7).toUpperCase() + 'FF') === q.extruder - 1),
        parts.map(q => [q.extruder, q.name.slice(-7)]));
  // Тело целиком названо тем же правилом: у одноцветного объекта хвост один, у составного — все слоты.
  const objNames = [...cfg.matchAll(/<object id="\d+"><metadata key="name" value="([^"]*)"/g)].map(m=>m[1]);
  check('составное тело называет все свои слоты',
        objNames.some(n => /\u00b7 слоты 1,2,3 \u00b7 #101010 #AA0000 #00AA00$/.test(n)), objNames);
  check('а одноцветное — один', objNames.some(n => /\u00b7 слот 4 \u00b7 #0000AA$/.test(n)), objNames);
}

/* ХВОСТ С ЦВЕТОМ: СОБИРАЕТСЯ И СНИМАЕТСЯ. Собирается — чтобы в слайсере было видно, чем заряжать слот.
   Снимается на импорте — иначе имя обрастает хвостами по одному за каждый круг «выгрузил — вернул», а
   слот и цвет у вернувшейся детали и так свои. */
console.log('\n=== слот и цвет в имени детали ===');
{
  const C = ['#101010', '#AA0000', '#00AA00'];
  check('без слотов хвоста нет', inkTag([], C) === '');
  check('неизвестный слот хвоста не даёт', inkTag([7, null], C) === '');
  check('один слот', inkTag([1], C) === ' \u00b7 слот 2 \u00b7 #AA0000', inkTag([1], C));
  check('несколько — по возрастанию и без повторов',
        inkTag([2, 0, 2, 0, 1], C) === ' \u00b7 слоты 1,2,3 \u00b7 #101010 #AA0000 #00AA00', inkTag([2,0,2,0,1], C));
  check('нули не теряются', inkTag([0], C) === ' \u00b7 слот 1 \u00b7 #101010', inkTag([0], C));

  // Снятие: свой хвост уходит целиком, чужое имя со словом «слот» не трогается.
  const back = n => mf3MFName({name: n}, null, 9);
  check('свой хвост снимается', back('Пробка \u00b7 слот 2 \u00b7 #BD1828') === 'Пробка', back('Пробка \u00b7 слот 2 \u00b7 #BD1828'));
  check('и многослотовый тоже',
        back('Тело \u00b7 слоты 1,3 \u00b7 #101010 #00AA00') === 'Тело', back('Тело \u00b7 слоты 1,3 \u00b7 #101010 #00AA00'));
  check('чужое имя со словом «слот» не трогается',
        back('Держатель слот 12 мм') === 'Держатель слот 12 мм', back('Держатель слот 12 мм'));
  check('хвост снимается только с конца',
        back('A \u00b7 слот 1 \u00b7 #101010 и ещё что-то') === 'A \u00b7 слот 1 \u00b7 #101010 и ещё что-то');
  check('пустое имя после снятия не остаётся пустым', back(' \u00b7 слот 1 \u00b7 #101010') !== '');

  // И через настоящий файл: выгрузили — вернули — имя чистое и ровно одно.
  models.length = 0; logos.length = 0;
  Object.assign(paramState.box, defaultBoxParams(), {gfBaseplate:false});
  const tris = buildTrisForShape('box', paramState.box);
  const put = (name, color) => models.push({ name, visible:true, rawTris:tris, shape:'box',
    params:JSON.parse(JSON.stringify(paramState.box)), color, rx:0, ry:0, rz:0, px:0, py:0, pz:0 });
  put('Тело', '#101010'); put('Крышка', '#AA0000');
  const buf = new Uint8Array(await assemblyTo3MF().arrayBuffer()).buffer;
  const got = await parse3MF(buf);
  check('вернулись обе детали', got.length === 2, got.length);
  check('и с чистыми именами', got.map(q => q.name).join() === 'Тело,Крышка', got.map(q => q.name));

  /* РАСКРАШЕННАЯ ДЕТАЛЬ ПРОСИТ НЕ ОДИН СЛОТ. Покраска слайсера — это номер филамента у каждого
     треугольника: деталь печатается своим цветом И цветами покраски сразу. Назвать в её имени только
     базовый слот значило бы умолчать ровно о тех цветах, которые труднее всего вычислить обратно. */
  models.length = 0; importedPaint.clear();
  const tri2 = [[[0,0,0],[6,0,0],[0,6,0]], [[0,0,0],[0,6,0],[0,0,6]]];
  addImportedPart(tri2, 'Крашеная', false, '#101010', null, { ink: [1, 2], palette: ['#AA0000', '#00AA00'] });
  const xml2 = readZip(new Uint8Array(await assemblyTo3MF().arrayBuffer()));
  const cfg2 = new TextDecoder().decode(xml2['Metadata/model_settings.config'].data);
  const nm2 = /<part [^>]*><metadata key="name" value="([^"]*)"/.exec(cfg2);
  check('имя раскрашенной детали называет ВСЕ её слоты',
        nm2 && nm2[1] === 'Крашеная \u00b7 слоты 1,2,3 \u00b7 #101010 #AA0000 #00AA00', nm2 && nm2[1]);
  const on2 = /<object id="\d+"><metadata key="name" value="([^"]*)"/.exec(cfg2);
  check('и тело над ней — тоже все', on2 && /\u00b7 слоты 1,2,3 \u00b7/.test(on2[1]), on2 && on2[1]);

  /* И МАТЕРИАЛ НАЗЫВАЕТ СВОЙ СЛОТ. `<basematerials>` читают просмотрщики и PrusaSlicer, а Orca не читает
     вовсе — но список материалов это единственное место в файле, где палитра лежит СПИСКОМ, по порядку
     слотов, и подписать его номером слота стоит одной строки. */
  const mdl2 = new TextDecoder().decode(xml2['3D/3dmodel.model'].data);
  const bn2 = [...mdl2.matchAll(/<base name="([^"]*)" displaycolor="(#[0-9A-F]{8})"\/>/g)];
  check('материалов столько же, сколько слотов', bn2.length === 3, bn2.length);
  check('каждый материал назван своим слотом и своим цветом',
        bn2.every((b, i) => b[1].endsWith('\u00b7 слот ' + (i+1) + ' \u00b7 ' + b[2].slice(0,7))),
        bn2.map(b => b[1]));
  models.length = 0; importedPaint.clear();
}

console.log('\n=== two parts of one body are never one filament ===');
{
  // Colours are shared ACROSS bodies on purpose — two coasters in the same three tones are three AMS
  // slots, not six. Within ONE body sharing is a contradiction: a body has several parts precisely
  // because they are separate colours. A two-colour keycap is born with both halves at the default
  // grey, and collapsing them by colour is how it reached the slicer on one filament and printed as a
  // blank cap with no legend at all.
  models.length = 0; activeModelId = null; nextModelId = 1;
  const tris = buildTrisForShape('box', Object.assign(defaultBoxParams(), {width:18, height:9, depth:18}));
  const mk = (name, over, color, px) => {
    const rec = makeModelRecord(name, Object.assign(defaultBoxParams(), over));
    rec.rawTris = tris; rec.color = color; rec.px = px || 0; models.push(rec); return rec;
  };
  mk('Оболочка',  {keycapMode:'shell'}, '#B9C5CD', 0);     // both at the default, as the app makes them
  mk('Сердечник', {keycapMode:'core'},  '#B9C5CD', 0);
  mk('Сосед',     {},                   '#B9C5CD', 60);    // a body of its own, same colour
  const entries = readZip(new Uint8Array(await assemblyTo3MF().arrayBuffer()));
  const cfg = new TextDecoder().decode(entries['Metadata/model_settings.config'].data);
  const xml = new TextDecoder().decode(entries['3D/3dmodel.model'].data);
  const parts = parseParts(cfg);
  check('the pair gets two filaments even in one colour',
        parts[0].extruder !== parts[1].extruder, parts.map(p=>p.extruder));
  check('and there are two materials to point at',
        (xml.match(/<base /g)||[]).length === 2, (xml.match(/<base /g)||[]).length);
  check('a separate body still shares the first slot', parts[2].extruder === parts[0].extruder,
        parts.map(p=>p.extruder));
  // and the app does not hand the pair the same colour in the first place
  logos.length = 0;
  Object.assign(paramState.box, defaultBoxParams(), {keycapMode:'shell'});
  const plan = assemblyMate(paramState.box);
  check('the mate button names the insert', plan && /Вставка/.test(plan.name), plan && plan.name);
  check('and gives it a colour of its own', plan && /^#[0-9a-fA-F]{6}$/.test(plan.color || ''), plan && plan.color);
  check('darker than the default body', plan && plan.color.toUpperCase() !== '#B9C5CD', plan && plan.color);
  // when the artwork knows its tones, the legend is printed in the artwork's own ink
  logos.push({ heightmap: new Float32Array(4), levels: 3, tones: ['#101010', '#404040', '#BB1828'] });
  check('the legend takes the artwork\'s top tone',
        (assemblyMate(paramState.box) || {}).color === '#BB1828', (assemblyMate(paramState.box)||{}).color);
  logos.length = 0;
}

/* ПАЛИТРА ORCA. Номера слотов в файле были всегда, а цветов не было, и человек ставил их руками. Взять
   их Orca может ровно из одного места — `filament_colour` в `Metadata/project_settings.config`, — но
   применяет его, только открывая файл КАК ПРОЕКТ, и тогда накладывает найденное поверх СВОИХ умолчаний и
   выбирает получившиеся профили. Файл, в котором лежат одни цвета, поэтому сносит профиль принтера.

   Отсюда вся конструкция: подставляются цвета не в пустоту, а в ШАБЛОН — сохранённый проект самого
   пользователя. Здесь проверяется то, что в этой подстановке можно испортить незаметно: что меняется
   ТОЛЬКО палитра (принтер, температуры, длины остальных векторов — как были), что число слотов не растёт
   (растянуть «по именам» значит однажды растянуть заодно nozzle_diameter), и что лишние цвета не
   пропадают молча. */
console.log('=== палитра Orca: шаблон проекта ===');
{
  const TPL = JSON.stringify({
    print_settings_id: '0.20mm Standard @MyPrinter',
    printer_settings_id: 'My Printer 0.4 nozzle',
    nozzle_diameter: ['0.4'],
    filament_colour: ['#00FF00', '#0000FF', '#FF0000', '#FFFFFF'],
    filament_type: ['PLA', 'PLA', 'PETG', 'PLA'],
    filament_settings_id: ['Generic PLA', 'Generic PLA', 'Generic PETG', 'Generic PLA'],
    nozzle_temperature: ['220', '220', '250', '220'],
    version: '2.3.0.0'
  });
  check('слоты шаблона считаются по filament_colour', orcaTemplateSlots(TPL) === 4, orcaTemplateSlots(TPL));
  check('без filament_colour это не шаблон', orcaTemplateSlots('{"printer_settings_id":"x"}') === 0);
  check('не-JSON это не шаблон', orcaTemplateSlots('какой-то мусор') === 0);
  check('массив вместо объекта — не шаблон', orcaTemplateSlots('[1,2,3]') === 0);
  check('нечитаемый шаблон не притворяется рабочим', orcaPaletteConfig('мусор', ['#000000']) === null);

  const pal = orcaPaletteConfig(TPL, ['#141414', '#BD1828']);
  const j = JSON.parse(pal.text), t0 = JSON.parse(TPL);
  check('палитра встала в первые слоты',
        j.filament_colour[0] === '#141414' && j.filament_colour[1] === '#BD1828', j.filament_colour);
  check('остальные слоты шаблона не тронуты',
        j.filament_colour[2] === '#FF0000' && j.filament_colour[3] === '#FFFFFF', j.filament_colour);
  check('число слотов не изменилось', j.filament_colour.length === 4, j.filament_colour.length);
  // Всё остальное обязано совпасть ДО ЕДИНОГО КЛЮЧА: подстановка палитры — не повод трогать принтер.
  const diff = Object.keys(t0).filter(k => JSON.stringify(t0[k]) !== JSON.stringify(j[k]));
  check('изменился ровно один ключ', diff.length === 1 && diff[0] === 'filament_colour', diff);
  check('длины остальных векторов на месте',
        j.filament_type.length === 4 && j.nozzle_temperature.length === 4 && j.nozzle_diameter.length === 1);

  const many = orcaPaletteConfig(TPL, ['#010101','#020202','#030303','#040404','#050505','#060606']);
  check('лишние цвета названы, а не выброшены молча', many.short && many.want === 6 && many.slots === 4,
        {short: many.short, want: many.want, slots: many.slots});
  check('и записано ровно столько, сколько влезло', many.wrote === 4 &&
        JSON.parse(many.text).filament_colour.length === 4, many.wrote);
  check('строка под кнопкой говорит про нехватку',
        /Лишние 2 в файл не попадут/.test(orcaNoteText({name:'p.3mf', cfg:TPL}, 6)),
        orcaNoteText({name:'p.3mf', cfg:TPL}, 6));
  check('и про порядок, когда всё влезает',
        /как проект/.test(orcaNoteText({name:'p.3mf', cfg:TPL}, 3)));
  check('без шаблона объясняет, почему цветов нет',
        /из ПРОЕКТА, а не из модели/.test(orcaNoteText(null, 3)), orcaNoteText(null, 3));

  // Шаблон вынимается из НАСТОЯЩЕГО архива — тем же кодом, которым приложение читает 3MF.
  const zip = new Uint8Array(await makeZipStore([
    { name: '[Content_Types].xml', text: '<Types/>' },
    { name: 'Metadata/project_settings.config', text: TPL }]).arrayBuffer());
  const got = await orcaTemplateFrom3MF(zip.buffer);
  check('шаблон вынут из проекта', orcaTemplateSlots(got) === 4, got.slice(0, 40));
  let err = null;
  const plain = new Uint8Array(await makeZipStore([{ name: '3D/3dmodel.model', text: '<model/>' }]).arrayBuffer());
  try { await orcaTemplateFrom3MF(plain.buffer); } catch(e){ err = e.message; }
  check('3MF без настроек проекта отвергается СВОИМИ словами', /СОХРАНЁННЫЙ ПРОЕКТ/.test(err || ''), err);
  err = null;
  try { await orcaTemplateFrom3MF(new Uint8Array([1,2,3,4]).buffer); } catch(e){ err = e.message; }
  check('не-ZIP отвергается другими словами', /не 3MF/.test(err || ''), err);

  // И то же самое в готовом файле.
  models.length = 0; logos.length = 0;
  Object.assign(paramState.box, defaultBoxParams(), {gfBaseplate:false});
  const tris = buildTrisForShape('box', paramState.box);
  const put = (name, color) => models.push({ name, visible:true, rawTris:tris, shape:'box',
    params:JSON.parse(JSON.stringify(paramState.box)), color, rx:0, ry:0, rz:0, px:0, py:0, pz:0 });
  put('Тело', '#141414'); put('Логотип', '#BD1828');
  const before = readZip(new Uint8Array(await assemblyTo3MF().arrayBuffer()));
  check('без шаблона настроек проекта в файле нет', !before['Metadata/project_settings.config'],
        Object.keys(before));
  orcaTemplate = { name: 'мой-проект.3mf', cfg: TPL };
  const after = readZip(new Uint8Array(await assemblyTo3MF().arrayBuffer()));
  const inFile = after['Metadata/project_settings.config'];
  check('с шаблоном — есть', !!inFile, Object.keys(after));
  const conf = JSON.parse(new TextDecoder().decode(inFile.data));
  check('и в нём цвета сборки', conf.filament_colour[0] === '#141414' && conf.filament_colour[1] === '#BD1828',
        conf.filament_colour);
  check('и принтер пользователя', conf.printer_settings_id === 'My Printer 0.4 nozzle', conf.printer_settings_id);
  // Номера слотов у деталей и порядок палитры — одно и то же: иначе цвет уедет не на ту деталь.
  const parts2 = parseParts(new TextDecoder().decode(after['Metadata/model_settings.config'].data));
  check('слот детали указывает на её же цвет',
        conf.filament_colour[parts2[0].extruder - 1] === '#141414' &&
        conf.filament_colour[parts2[1].extruder - 1] === '#BD1828',
        parts2.map(p => p.extruder));
  orcaTemplate = null;
  models.length = 0;
}

/* ПОКРАСКА УЕЗЖАЕТ ОБРАТНО. Импортированная многоцветная покраска — это номер филамента на каждый
   треугольник; в файл она пишется тем же `paint_color`, каким пришла. Испортить это можно тихо тремя
   способами: потерять соответствие треугольник↔номер (вырожденные грани отбрасываются по дороге), не
   завести цвета покраски филаментами, и написать атрибут на КАЖДОМ треугольнике вместо тех, что
   отличаются от собственного номера объекта, — файл раздуется вдвое, а выглядеть будет правильно. */
console.log('=== покраска в выгрузке ===');
{
  models.length = 0; logos.length = 0;
  Object.assign(paramState.box, defaultBoxParams(), {gfBaseplate:false});
  // Четыре треугольника, три цвета: собственный (чёрный), плюс белый и красный из палитры.
  const tris = [[[0,0,0],[6,0,0],[0,6,0]], [[0,0,0],[0,6,0],[0,0,6]],
                [[0,0,0],[0,0,6],[6,0,0]], [[6,0,0],[0,0,6],[0,6,0]]];
  const palette = ['#FFFFFF', '#000000', '#F4EE2A', '#545454', '#C12E1F'];
  const rec = addImportedPart(tris, 'Подставка', false, '#000000', null, { ink: [1, 0, 2, 5], palette });
  // Активная модель ЖИВЁТ В ГЛОБАЛЬНЫХ: экспорт первым делом сливает их обратно в запись, и без этой
  // строки запись потеряла бы importId — то есть перестала бы быть импортом ещё до выгрузки.
  Object.assign(paramState.box, rec.params);
  activeModelId = rec.id; cachedRawTris = rec.rawTris;
  const zip = readZip(new Uint8Array(await assemblyTo3MF().arrayBuffer()));
  const xml = new TextDecoder().decode(zip['3D/3dmodel.model'].data);
  const codes = (xml.match(/paint_color="([^"]*)"/g) || []).map(x => x.slice(13, -1));
  check('цвета покраски заведены филаментами', (xml.match(/<base /g)||[]).length === 3,
       (xml.match(/<base /g)||[]).length);
  check('в файле есть и белый, и красный', /displaycolor="#FFFFFFFF"/.test(xml) && /displaycolor="#C12E1FFF"/.test(xml));
  check('помечены только отличные от собственного номера', codes.length === 2, codes);
  // Собственный номер детали — 1 (её цвет первый в списке филаментов), белый и красный — 2 и 3.
  check('и помечены ИМЕННО те два', codes.join('|') === paintLeafCode(2) + '|' + paintLeafCode(3), codes);
  // Номер 2 в ink — это #000000, то есть тот же цвет, что у детали: отдельным филаментом он не заводится
  // и атрибутом не помечается.
  check('цвет, совпавший с цветом детали, не удваивает филамент',
       (xml.match(/displaycolor="#000000FF"/g)||[]).length === 1, xml.match(/displaycolor="#000000FF"/g));
  models.length = 0;
}

console.log(`\n=== TOTAL: ${pass} passed, ${fail} failed ===`);
process.exit(fail ? 1 : 0);
}
main();
