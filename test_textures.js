// Procedural surface textures («рифление / точки / решётка»): binary repeating heightmaps poured
// into the ordinary logo pipeline. Checks: maps are sharp 0/1 with a sane raised share and real
// periodicity, and each kind embosses a solid face AND a hollow-container wall watertight.
// Run via ./run-all.sh (extraction test).

let pass = 0, fail = 0;
function check(name, cond, extra) {
  if (cond) { pass++; console.log('  OK  ', name); }
  else { fail++; console.log('  FAIL', name, extra!==undefined?JSON.stringify(extra):''); }
}
function sv(t){let v=0;for(const T of t){const a=T[0],b=T[1],c=T[2];v+=(a[0]*(b[1]*c[2]-b[2]*c[1])-a[1]*(b[0]*c[2]-b[2]*c[0])+a[2]*(b[0]*c[1]-b[1]*c[0]))/6;}return v;}
function setBox(over){
  logos.length = 0; boxHoles.length = 0;
  Object.assign(paramState.box, {
    width:50, height:50, depth:50, hollow:false, rim:false, wallThickness:2.5,
    divX:1, divZ:1, stackFeet:false, squircle:0, squircleVBot:0, latticeFloor:false,
    filletRadius:0, filletTop:0, filletBottom:0, filletVert:0, logo3d:false, hingeRole:undefined,
    taperXPlus:0,taperXMinus:0,taperZPlus:0,taperZMinus:0,taperYPlusX:0,taperYPlusZ:0,taperYMinusX:0,taperYMinusZ:0,
    bulgeXPlus:0,bulgeXMinus:0,bulgeZPlus:0,bulgeZMinus:0,bulgeYPlus:0,bulgeYMinus:0, chamferTop:0,
  }, over);
}

const share = hm => { let d=0; for (const v of hm) d+=v; return d/hm.length; };

console.log('=== Heightmap sanity per kind ===');
/* ДВА РОДА УЗОРОВ, и мерить их одной меркой нельзя. Резкие несут 0 или 1 — одна полка одной высоты.
   Плавные несут высоту в каждой точке и РАЗЛОЖЕНЫ ПО СТУПЕНЯМ: обычный логотип режется порогом, и
   пирамидка в таком конвейере выходила бы квадратной нашлёпкой (замерено: три разных Y на всю плиту).
   Поэтому у плавных проверяется ровно TEXTURE_LEVELS разных значений, нижнее из которых 0 — низ узора
   обязан лежать заподлицо с гранью, а не висеть над ней. Требовать «строго 0 или 1» от всех подряд
   значило бы либо запретить плавные, либо перестать проверять резкие. */
for (const kind of Object.keys(TEXTURE_KINDS)) {
  const res = makeTextureLogoResult(kind), smooth = !!TEXTURE_KINDS[kind].smooth;
  check(`${kind}: created, aspect 1`, !!res && res.aspect === 1);
  check(`${kind}: у каждого узора есть подпись`, typeof TEXTURE_KINDS[kind].label === 'string'
        && TEXTURE_KINDS[kind].label.length > 2);
  const vals = new Set(); let mn = 1e9, mx = -1e9;
  for (const v of res.heightmap) { vals.add(+v.toFixed(6)); if (v < mn) mn = v; if (v > mx) mx = v; }
  if (smooth) {
    check(`${kind}: ступенчатый, ${TEXTURE_LEVELS} ступеней`, res.levels === TEXTURE_LEVELS, res.levels);
    check(`${kind}: ровно столько разных высот`, vals.size === TEXTURE_LEVELS, vals.size);
    check(`${kind}: нижняя ступень ровно 0 — низ заподлицо с гранью`, mn === 0, mn);
    check(`${kind}: верхняя ровно 1 — глубина берётся целиком`, mx === 1, mx);
  } else {
    check(`${kind}: резкий 0/1`, vals.size === 2 && mn === 0 && mx === 1, [...vals]);
    check(`${kind}: один порог, одна ступень`, res.levels === 2, res.levels);
  }
  const sh = share(res.heightmap);
  check(`${kind}: raised share sane`, sh > 0.15 && sh < 0.85, +sh.toFixed(2));
}
check('unknown kind -> null', makeTextureLogoResult('nope') === null);

console.log('\n=== Periodicity: ribs repeat 12× along the axis ===');
{
  const S = LOGO_HM_SIZE, hm = makeTextureLogoResult('ribs-v').heightmap;
  let transitions = 0;
  for (let x = 1; x < S; x++) if (hm[x] !== hm[x-1]) transitions++;
  check('ribs-v: ~24 transitions on a row', Math.abs(transitions - 24) <= 2, transitions);
  const hmH = makeTextureLogoResult('ribs-h').heightmap;
  let tV = 0; for (let y = 1; y < S; y++) if (hmH[y*S] !== hmH[(y-1)*S]) tV++;
  check('ribs-h: ~24 transitions on a column', Math.abs(tV - 24) <= 2, tV);
}

console.log('\n=== Each texture embosses watertight: solid face + hollow wall ===');
for (const kind of Object.keys(TEXTURE_KINDS)) {
  const res = makeTextureLogoResult(kind);
  setBox({});
  logos.push({ id:1, face:'+Z', u0:0, v0:0, w:36, h:36, depth:0.8, threshold:0.5, invert:false,
    rotation:0, heightmap: res.heightmap, aspect:1, levels: res.levels });
  const solid = buildTrisForShape('box', paramState.box);
  const mcS = manifoldCheck(solid, 4);
  check(`${kind} on solid face: watertight`, mcS.watertight, mcS);
  setBox({ hollow:true });
  logos.push({ id:1, face:'+X', u0:0, v0:0, w:30, h:30, depth:0.8, threshold:0.5, invert:false,
    rotation:0, heightmap: res.heightmap, aspect:1, levels: res.levels });
  const hol = buildTrisForShape('box', paramState.box);
  const mcH = manifoldCheck(hol, 4);
  check(`${kind} on hollow wall: watertight & +vol`, mcH.watertight && sv(hol) > 0, mcH);
}

/* А ЕСТЬ ЛИ РЕЛЬЕФ ВООБЩЕ. Прежние проверки этого не спрашивали: они мерили герметичность, и узор,
   который не дошёл до сетки, прошёл бы их все до одной. Именно так плавные узоры и оказались бы
   плоскими — порог срезал бы пирамидку в полку, а сетка осталась бы законной.

   Меряется по ВЫСОТАМ верхней грани: у резкого узора их три (низ плиты, дно рельефа, полка), у
   ступенчатого — на TEXTURE_LEVELS больше, по одной на ступень. И грань без узора даёт ровно одну. */
console.log('\n=== рельеф действительно доходит до сетки ===');
function topHeights(kind){
  logos.length = 0; boxHoles.length = 0;
  setBox({ width:44, depth:44, height:6 });
  if (kind){ const r = makeTextureLogoResult(kind);
    logos.push({ id:1, face:'+Y', u0:0, v0:0, w:40, h:40, depth:1.2, threshold:0.5, invert:false,
      rotation:0, heightmap:r.heightmap, aspect:1, levels:r.levels }); }
  const t = buildTrisForShape('box', paramState.box), ys = new Set();
  for (const T of t) for (const v of T) ys.add(v[1].toFixed(3));
  return { n:t.length, ys:ys.size };
}
const bare = topHeights(null);
check('гладкая плита — две высоты и дюжина треугольников', bare.ys === 2 && bare.n === 12, bare);
for (const kind of Object.keys(TEXTURE_KINDS)) {
  const g = topHeights(kind), smooth = !!TEXTURE_KINDS[kind].smooth;
  check(`${kind}: узор поднял грань`, g.n > bare.n * 100, g.n);
  check(`${kind}: высот столько, сколько ступеней`, g.ys === (smooth ? TEXTURE_LEVELS + 1 : 3),
        { высот:g.ys, надо:(smooth ? TEXTURE_LEVELS + 1 : 3) });
}
logos.length = 0;

logos.length = 0;
console.log(`\n=== TOTAL: ${pass} passed, ${fail} failed ===`);
process.exit(fail ? 1 : 0);
