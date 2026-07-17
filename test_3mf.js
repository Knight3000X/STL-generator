// 3MF export: an OPC zip (store-only, real CRC32) with [Content_Types].xml, _rels/.rels and
// 3D/3dmodel.model. The test UNZIPS the writer's own output (parsing local headers), re-computes
// every CRC, and checks the model XML carries the right objects/vertices/triangles per visible
// model. Run via ./run-all.sh (extraction test).

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

  const blob = assemblyTo3MF();
  const entries = readZip(new Uint8Array(await blob.arrayBuffer()));
  check('OPC parts present', !!entries['[Content_Types].xml'] && !!entries['_rels/.rels'] && !!entries['3D/3dmodel.model'],
    Object.keys(entries));
  const xml = new TextDecoder().decode(entries['3D/3dmodel.model'].data);
  check('unit is millimeter', /unit="millimeter"/.test(xml));
  const objects = (xml.match(/<object /g)||[]).length;
  const items = (xml.match(/<item /g)||[]).length;
  check('2 visible models → 2 objects + 2 build items (hidden skipped)', objects === 2 && items === 2, {objects, items});
  // cube object: 8 unique vertices, 12 triangles
  const first = xml.slice(xml.indexOf('<object id="1"'), xml.indexOf('</object>'));
  check('cube: 8 deduped vertices', (first.match(/<vertex /g)||[]).length === 8, (first.match(/<vertex /g)||[]).length);
  check('cube: 12 triangles', (first.match(/<triangle /g)||[]).length === 12, (first.match(/<triangle /g)||[]).length);
  // second object baked at px=50: its vertices centre around x≈50
  const second = xml.slice(xml.indexOf('<object id="2"'));
  const xs = [...second.matchAll(/<vertex x="([-0-9.]+)"/g)].map(m=>parseFloat(m[1]));
  const cx = xs.reduce((a,b)=>a+b,0)/xs.length;
  check('moved model baked at x≈50', Math.abs(cx - 50) < 0.5, {cx:+cx.toFixed(2)});
  // triangle indices reference existing vertices
  const nV = (second.match(/<vertex /g)||[]).length;
  const bad = [...second.matchAll(/<triangle v1="(\d+)" v2="(\d+)" v3="(\d+)"/g)]
    .some(m => +m[1] >= nV || +m[2] >= nV || +m[3] >= nV);
  check('triangle indices in range', !bad, {nV});
}

console.log(`\n=== TOTAL: ${pass} passed, ${fail} failed ===`);
process.exit(fail ? 1 : 0);
}
main();
