// 3MF export: an OPC zip (store-only, real CRC32) with [Content_Types].xml, _rels/.rels,
// 3D/3dmodel.model and Metadata/model_settings.config. The test UNZIPS the writer's own output
// (parsing local headers), re-computes every CRC, and checks the model XML carries the right
// objects/vertices/triangles per visible model, that AMS colour parts arrive as PARTS of one
// object rather than as separate objects, and that each part names its own filament.
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
  check('part names survive', parts[1].name === 'Цвет 1 (AMS)', parts.map(p=>p.name));
}

console.log(`\n=== TOTAL: ${pass} passed, ${fail} failed ===`);
process.exit(fail ? 1 : 0);
}
main();
