// Gridfinity baseplate (separate model, params.gfBaseplate): a gfX×gfY grid of female sockets that
// receive bin feet. Checks: watertight for a range of grids, exact 42-pitch footprint, socket depth
// and the SEATING invariant — a bin foot's profile must fit inside the baseplate socket at every
// height (the whole point of the standard). Run via ./run-all.sh (extraction test).

let pass = 0, fail = 0;
function check(name, cond, extra) {
  if (cond) { pass++; console.log('  OK  ', name); }
  else { fail++; console.log('  FAIL', name, extra!==undefined?JSON.stringify(extra):''); }
}
function sv(t){let v=0;for(const T of t){const a=T[0],b=T[1],c=T[2];v+=(a[0]*(b[1]*c[2]-b[2]*c[1])-a[1]*(b[0]*c[2]-b[2]*c[0])+a[2]*(b[0]*c[1]-b[1]*c[0]))/6;}return v;}
function bbox(t){const lo=[1e9,1e9,1e9],hi=[-1e9,-1e9,-1e9];for(const tr of t)for(const p of tr)for(let a=0;a<3;a++){lo[a]=Math.min(lo[a],p[a]);hi[a]=Math.max(hi[a],p[a]);}return{lo,hi};}
function setBP(over){
  logos.length = 0; boxHoles.length = 0;
  Object.assign(paramState.box, { gfBaseplate:true, gfX:1, gfY:1, gfBaseThk:1.2, gfMagnets:false, logo3d:false, gfOn:false }, over);
  return buildTrisForShape('box', paramState.box);
}

console.log('=== Watertight + dimensions across grids ===');
for (const [gx, gy] of [[1,1],[2,1],[3,2],[4,4],[5,3]]) {
  const tris = setBP({ gfX:gx, gfY:gy });
  const mc = manifoldCheck(tris, 4);
  check(`${gx}×${gy}: watertight & +vol`, mc.watertight && sv(tris) > 0, mc);
  const b = bbox(tris);
  check(`${gx}×${gy}: footprint = grid×42`, Math.abs((b.hi[0]-b.lo[0]) - gx*42) < 1e-6 && Math.abs((b.hi[2]-b.lo[2]) - gy*42) < 1e-6,
    {dx:+(b.hi[0]-b.lo[0]).toFixed(2), dz:+(b.hi[2]-b.lo[2]).toFixed(2)});
}

console.log('=== Height = socket depth + base thickness ===');
{
  const b = bbox(setBP({ gfBaseThk:1.2 }));
  check('total height 4.75 + 1.2 = 5.95', Math.abs((b.hi[1]-b.lo[1]) - 5.95) < 1e-6, {h:+(b.hi[1]-b.lo[1]).toFixed(2)});
  const b2 = bbox(setBP({ gfBaseThk:3 }));
  check('thicker base raises height', Math.abs((b2.hi[1]-b2.lo[1]) - 7.75) < 1e-6, {h:+(b2.hi[1]-b2.lo[1]).toFixed(2)});
}

console.log('=== SEATING: a bin foot fits inside the socket at every height ===');
{
  // baseplate socket half-size vs height below the top (from GFB_PROFILE):
  //   0→41.6/2, 2.15→37.3/2, 3.95→37.3/2, 4.75→35.7/2   (linear between)
  const bpHalf = d => d<=2.15 ? 41.6/2 - (41.6-37.3)/2*(d/2.15)
    : d<=3.95 ? 37.3/2
    : 37.3/2 - (37.3-35.7)/2*((d-3.95)/0.8);
  // bin foot half-size vs height above its bottom (foot: 0→35.6/2, 0.8→37.2/2, 2.6→37.2/2, 4.75→41.5/2).
  // seated foot: foot bottom at socket floor (d=4.75), foot top at socket top (d=0). So at socket
  // depth d, the foot height above its bottom is (4.75 - d).
  const footHalf = h => h<=0.8 ? 35.6/2 + (37.2-35.6)/2*(h/0.8)
    : h<=2.6 ? 37.2/2
    : 37.2/2 + (41.5-37.2)/2*((h-2.6)/(4.75-2.6));
  let worst = -1e9;
  for (let d = 0; d <= 4.75; d += 0.05) {
    const over = footHalf(4.75 - d) - bpHalf(d);   // foot must be ≤ socket at every depth
    worst = Math.max(worst, over);
  }
  check('foot profile fits the socket (with clearance) at every height', worst <= 0.05, {worstOver:+worst.toFixed(3)});
  check('socket is slightly larger than the foot (clearance ≥ 0)', worst < 0, {maxOver:+worst.toFixed(3)});
}

console.log('=== Multiple baseplates tile (2×1 = two 1×1 side by side) ===');
{
  const one = bbox(setBP({ gfX:1, gfY:1 }));
  const two = bbox(setBP({ gfX:2, gfY:1 }));
  check('2×1 is exactly two cells wide (no gap/overlap)', Math.abs((two.hi[0]-two.lo[0]) - 2*(one.hi[0]-one.lo[0])) < 1e-6);
}

console.log('=== addGridfinityBaseplate makes a model ===');
{
  models.length = 0; activeModelId = null; nextModelId = 1;
  models.push(makeModelRecord('Модель 1', defaultBoxParams()));
  activeModelId = models[0].id;
  Object.assign(paramState.box, { gfOn:true, gfX:3, gfY:2 }); saveActiveModel();
  addGridfinityBaseplate();
  check('a baseplate model was added', models.length === 2 && models[1].params.gfBaseplate === true);
  check('baseplate grid copied from the active bin', models[1].params.gfX === 3 && models[1].params.gfY === 2, models[1].params);
  check('baseplate model mesh watertight', manifoldCheck(models[1].rawTris, 4).watertight);
}

paramState.box.gfBaseplate = false;
/* ===============================================================================================
   ПЛИТА НАЗЫВАЕТ СВОЙ РАЗМЕР И ОДИН МОЛЧАЛИВЫЙ ЗАЖИМ (v25.19.0). Плита задаётся В ЯЧЕЙКАХ, а стоит на
   столе в миллиметрах: 3 × 2 это 126 × 84, и нигде это не называлось. Толщина же основания под гнёздами
   имеет в строке параметров потолок в МИЛЛИОН миллиметров — очевидная заглушка, — а построитель молча
   режет её шестью: человек, поставивший двадцать, получает шесть и не узнаёт об этом ниоткуда. */
console.log('\n=== плита называет размер и зажим основания ===');
{
  const setP = (ov) => { logos.length = 0; boxHoles.length = 0;
    Object.assign(paramState.box, defaultBoxParams(), {gfBaseplate:true, gfX:1, gfY:1}, ov||{});
    return paramState.box; };
  const warn = (ov) => collectPrintWarnings(setP(ov));
  const line = (ws) => ws.find(x => /^плита Gridfinity /.test(x));
  const spec = (ov) => baseplateSpec(setP(ov));
  const mesh = (ov) => { setP(ov); return buildTrisForShape('box', paramState.box); };

  check('плита больше не молчит: на умолчаниях есть строка с размером', line(warn({})) !== undefined, warn({}));
  /* РАЗМЕР МЕРЯЕТСЯ ПО ДЕТАЛИ, а не пересказывается: ячейки × шаг обязаны сойтись с габаритом. */
  for (const [nx, ny] of [[1,1], [3,2], [5,5]]){
    const g = spec({gfX:nx, gfY:ny}), b = computeBBox(mesh({gfX:nx, gfY:ny}));
    check('плита ' + nx + '×' + ny + ': габарит измерен и равен ячейкам на шаг',
        Math.abs((b.maxX - b.minX) - g.W) < 0.02 && Math.abs((b.maxZ - b.minZ) - g.D) < 0.02,
        {измерено:[+(b.maxX-b.minX).toFixed(2), +(b.maxZ-b.minZ).toFixed(2)], спец:[g.W, g.D]});
    check('  и высота тоже', Math.abs((b.maxY - b.minY) - g.H) < 0.02,
        {измерено:+(b.maxY-b.minY).toFixed(2), спец:+g.H.toFixed(2)});
  }
  check('шаг именно 42 мм, как у стандарта', spec({}).pitch === 42);
  check('  и число гнёзд — это произведение ячеек', spec({gfX:3, gfY:2}).cells === 6);
  check('  строка называет и миллиметры, и гнёзда',
      /126×84×5\.95 мм и 6 гнёзд/.test(line(warn({gfX:3, gfY:2}))), line(warn({gfX:3, gfY:2})));
  /* ЗАЖИМ ОСНОВАНИЯ. Строка параметров разрешает миллион, построитель кладёт шесть — и теперь говорит. */
  {
    const g = spec({gfBaseThk:1000});
    check('основание урезано до шести миллиметров', g.thkCut === true && Math.abs(g.baseThk - 6) < 1e-9,
        g.baseThk);
    check('  и деталь и правда такой высоты', (() => { const b = computeBBox(mesh({gfBaseThk:1000}));
        return Math.abs((b.maxY - b.minY) - (4.75 + 6)) < 0.02; })());
    check('  и сказано, что потолок в строке — заглушка',
        /потолок в строке параметров стоит заглушкой/.test(warn({gfBaseThk:1000}).join(' ')),
        warn({gfBaseThk:1000}));
    check('  на умолчаниях зажим не срабатывает', spec({}).thkCut === false, spec({}).baseThk);
    check('  и на разумной толщине тоже', spec({gfBaseThk:3}).thkCut === false);
  }
  /* И второй зажим — по числу ячеек. До v25.39.0 он был СВОЙ у построителя (семь), и ползунок с ним
     расходился: панель даёт шесть, а файл с «gfX: 20» строил плиту семь на семь — размер, которого
     приложение не предлагает и не покажет ни одной ручкой. Теперь предел один, и он в строке ручки;
     проверка спрашивает у строки, а не у меня. */
  {
    const g = spec({gfX:12, gfY:1});
    const lim = SHAPE_PARAMS.box.find(r => r.key === 'gfX').max;
    check('сетка урезана до предела ползунка', g.gridCut === true && g.n === lim, {ячеек:g.n, предел:lim});
    check('  и об этом сказано, назвав тот же предел',
        new RegExp('больше ' + lim + ' ячеек').test(warn({gfX:12, gfY:1}).join(' ')), warn({gfX:12, gfY:1}));
    check('  на умолчаниях не урезана', spec({}).gridCut === false);
    /* И ПОСТРОЕННАЯ ПЛИТА — ТОГО ЖЕ РАЗМЕРА, что названа: расхождение предела спецификации с
       построителем и было тем, ради чего всё это сводилось. */
    const b = computeBBox(mesh({gfX:12, gfY:1}));
    check('  и построена ровно она', Math.abs((b.maxX - b.minX) - lim*42) < 0.02,
        {построено:+(b.maxX - b.minX).toFixed(2), сказано:lim*42});
  }
  setP({});
}
paramState.box.gfBaseplate = false;
console.log(`\n=== TOTAL: ${pass} passed, ${fail} failed ===`);
process.exit(fail ? 1 : 0);
