// Print-readiness analysis: overhangArea (supports needed?), bestOrientation (6 face-down
// candidates, least overhang wins, upright ties win) and collectPrintWarnings (thin features
// straight from the parameters). Run via ./run-all.sh (extraction test).

let pass = 0, fail = 0;
function check(name, cond, extra) {
  if (cond) { pass++; console.log('  OK  ', name); }
  else { fail++; console.log('  FAIL', name, extra!==undefined?JSON.stringify(extra):''); }
}
function setBox(over){
  logos.length = 0; boxHoles.length = 0;
  Object.assign(paramState.box, {
    width:40, height:40, depth:40, hollow:false, rim:false, wallThickness:2.5, rimHeight:8,
    divX:1, divZ:1, divT:1.2, stackFeet:false, squircle:0, squircleVBot:0, latticeFloor:false, latticeRib:1.6,
    filletRadius:0, filletTop:0, filletBottom:0, filletVert:0, logo3d:false, hingeRole:undefined,
    taperXPlus:0,taperXMinus:0,taperZPlus:0,taperZMinus:0,taperYPlusX:0,taperYPlusZ:0,taperYMinusX:0,taperYMinusZ:0,
    bulgeXPlus:0,bulgeXMinus:0,bulgeZPlus:0,bulgeZMinus:0,bulgeYPlus:0,bulgeYMinus:0, chamferTop:0,
  }, over);
  return buildTrisForShape('box', paramState.box);
}

console.log('=== overhangArea ===');
{
  const cube = setBox({});
  check('plain cube: no overhangs (bottom is bed contact)', overhangArea(cube) < 1e-6, overhangArea(cube));
  const cup = setBox({ hollow:true });
  check('upright hollow cup: no overhangs', overhangArea(cup) < 1e-6, overhangArea(cup));
  // flip the cup: the cavity floor becomes a ceiling ≈ (W−2t)² of unsupported area
  const flipped = rotateTris(cup, 180, 0, 0);
  const a = overhangArea(flipped);
  const cav = (40-5)*(40-5);
  check('flipped cup: overhang ≈ cavity floor area', Math.abs(a - cav) < 0.15*cav, {a:+a.toFixed(0), cav});
  // taper: walls leaning OUT more than 45° -> side overhangs appear
  // cup on its side: the cavity's upper wall becomes a flat ceiling → real overhang area
  const side = rotateTris(setBox({ hollow:true }), 90, 0, 0);
  check('sideways cup: cavity ceiling is an overhang', overhangArea(side) > 500, +overhangArea(side).toFixed(0));
}

console.log('\n=== bestOrientation ===');
{
  const cup = setBox({ hollow:true });
  const up = bestOrientation(cup);
  check('upright cup stays upright', up.rx === 0 && up.rz === 0, up);
  // pre-flipped mesh: the best candidate must flip it back (rx=180 on the flipped = upright)
  const flipped = rotateTris(cup, 180, 0, 0);
  const fix = bestOrientation(flipped);
  check('flipped cup: auto-orient flips it back', fix.rx === 180 && fix.rz === 0, fix);
  check('fixed orientation has (near) zero overhang', fix.area < 1e-6, fix.area);
  // a plate lying on its side: any face-down works for a box — area 0 for all — earliest wins
  const plate = setBox({ height: 4 });
  const p = bestOrientation(rotateTris(plate, 90, 0, 0));
  check('sideways plate: laid flat again', p.area < 1e-6, p);
}

console.log('\n=== collectPrintWarnings ===');
{
  setBox({ hollow:true, wallThickness:2.5 });
  check('healthy container: no warnings', collectPrintWarnings(paramState.box).length === 0,
    collectPrintWarnings(paramState.box));
  setBox({ hollow:true, wallThickness:0.8 });
  check('thin wall flagged', collectPrintWarnings(paramState.box).some(w=>/стенка/.test(w)));
  setBox({ hollow:true, latticeFloor:true, latticeRib:0.5 });
  check('thin lattice rib flagged', collectPrintWarnings(paramState.box).some(w=>/ребро/.test(w)));
  setBox({ hollow:true, divX:3, divT:0.5 });
  check('thin divider flagged', collectPrintWarnings(paramState.box).some(w=>/перегородка/.test(w)));
  setBox({});
  logos.push({ id:1, face:'+Z', u0:0, v0:0, w:10, h:10, depth:0.2, threshold:0.5, invert:false, rotation:0,
    heightmap:new Float32Array(4).fill(1) });
  check('too-shallow relief flagged', collectPrintWarnings(paramState.box).some(w=>/рельеф/.test(w)));
  logos.length = 0;
}

/* ВЛЕЗЕТ ЛИ НА СТОЛ (v25.12.0). Габарит стола приложение знало давно — он приезжает из шаблона проекта
   Orca вместе с палитрой, — но спрашивали его только в раскладке сборки, то есть уже ПОСЛЕ того, как
   человек нажал «разложить». Деталь, которая на стол не встаёт, до сих пор строилась молча.

   Проверки здесь стерегут ровно четыре решения, каждое из которых легко потерять:
     • меряется СЕТКА, а не ширина куба (у половины форм габарит известен только после построения);
     • нет сетки — нет и строки (иначе перепись молчунов в test_registry.js начала бы врать);
     • поворот на 90° считается влезанием, но с другой формулировкой;
     • «впритык» — отдельный случай: юбка и кайма съедают по краю несколько миллиметров. */
console.log('\n=== влезет ли деталь на стол ===');
{
  const noBed  = () => { orcaTemplate = null; };
  const bedOf  = (w, d, h) => { orcaTemplate = { name:'t', cfg: JSON.stringify({
      printable_area: ['0x0', w+'x0', w+'x'+d, '0x'+d],
      printable_height: [String(h)], printer_settings_id: 'Стенд' }) }; };
  const bedLine = (ws) => ws.find(s => /стол|СТОЛ|ПОВЁРНУТОЙ|краю/.test(s));
  // деталь задаётся своей сеткой: параметры куба тут ни при чём, и это же проверяется ниже
  const warn = (w, h, d) => collectPrintWarnings(paramState.box, plainBoxShellTris(w, h, d));

  setBox({});
  noBed();
  check('без сетки строки про стол нет вовсе', bedLine(collectPrintWarnings(paramState.box)) === undefined,
        collectPrintWarnings(paramState.box));
  check('пустая сетка — не повод считать', bedFitSpec([]) === null && bedFitSpec(null) === null);

  const fb = bedFitSpec(plainBoxShellTris(10, 10, 10));
  check('без шаблона стол считается по 256×256', fb.bed.fallback && fb.bed.w === 256 && fb.bed.d === 256,
        {w: fb.bed.w, d: fb.bed.d});
  check('стол берётся у раскладки, а не считается заново',
        fb.bed.w === arrangeBed().w && fb.bed.d === arrangeBed().d && fb.bed.h === arrangeBed().h);

  check('деталь 100×100 на столе 256 — молчание', warn(100, 50, 100).length === 0, warn(100, 50, 100));
  check('деталь 250×250 влезает и молчит', warn(250, 50, 250).length === 0, warn(250, 50, 250));

  {
    const w300 = warn(300, 50, 200), line = bedLine(w300);
    check('деталь 300×200 на столе 256 не влезает', /НЕ ВЛЕЗАЕТ/.test(line || ''), line);
    check('в строке названы обе стороны детали', /300/.test(line) && /200/.test(line), line);
    check('в строке названо, ОТКУДА стол', /не объявлен/.test(line) && /256/.test(line), line);
    /* Ровно ОДНА строка: «не влезает» и «остаётся −1 мм по краю» в одной шапке — это не два наблюдения,
       а одно наблюдение и одна арифметическая нелепость. */
    check('и это единственная строка про стол', w300.length === 1, w300);
  }

  /* Поворот. 300 × 200 на столе 250 × 350 не влезает как есть и влезает повёрнутой — сказать надо
     именно это. Стол здесь НЕ квадратный намеренно: на квадратном эту ветку не отличить от прочих. */
  bedOf(250, 350, 0);
  {
    const sp = bedFitSpec(plainBoxShellTris(300, 50, 200));
    check('300×200 на 250×350: как есть не встаёт', sp.asIs === false);
    check('300×200 на 250×350: повёрнутой встаёт', sp.turned === true && sp.fits === true);
    const line = bedLine(collectPrintWarnings(paramState.box, plainBoxShellTris(300, 50, 200)));
    check('и сказано про поворот, а не «не влезает»',
          /ПОВЁРНУТОЙ/.test(line || '') && !/НЕ ВЛЕЗАЕТ/.test(line || ''), line);
    check('стол назван по имени из шаблона', /Стенд/.test(line || ''), line);
  }
  check('300×300 не влезет ни так, ни этак',
        /НЕ ВЛЕЗАЕТ/.test(bedLine(collectPrintWarnings(paramState.box, plainBoxShellTris(300, 50, 300))) || ''));
  /* Запас считается по ТОЙ ЖЕ ориентации, в которой деталь встала: как есть 349 × 249 не влезает вовсе,
     и запас «как есть» был бы отрицательным. */
  check('запас меряется у повёрнутой детали', bedFitSpec(plainBoxShellTris(349, 50, 249)).slack === 1,
        bedFitSpec(plainBoxShellTris(349, 50, 249)).slack);
  /* «Влезает повёрнутой» и «стоит впритык» — два независимых наблюдения, и второе не отменяется первым. */
  {
    const ws = collectPrintWarnings(paramState.box, plainBoxShellTris(349, 50, 249));
    check('повёрнутая впритык получает обе оговорки',
          ws.some(s => /ПОВЁРНУТОЙ/.test(s)) && ws.some(s => /краю/.test(s)), ws);
  }

  /* Впритык. Ровно BED_MARGIN — ещё не впритык, меньше — уже. */
  noBed();
  check('запас ровно в 5 мм — молчание', warn(246, 50, 246).length === 0, warn(246, 50, 246));
  {
    const line = bedLine(warn(254, 50, 254));
    check('запас в 2 мм — предупреждение', /краю/.test(line || ''), line);
    check('и названо, сколько именно осталось', /остаётся 2 мм/.test(line || ''), line);
  }

  /* Высота. Габарит по Z объявлен не у всякого стола: если его нет, выдумывать нечего. */
  bedOf(250, 250, 100);
  {
    const ws = collectPrintWarnings(paramState.box, plainBoxShellTris(50, 400, 50));
    check('деталь выше стола названа высокой', ws.some(s => /выше стола/.test(s)), ws);
    check('в строке и рост детали, и высота печати',
          ws.some(s => /400/.test(s) && /100/.test(s)), ws);
  }
  noBed();
  check('стол без объявленной высоты о росте молчит',
        collectPrintWarnings(paramState.box, plainBoxShellTris(50, 400, 50)).length === 0);

  /* Порядок. В шапке видна ПЕРВАЯ строка, и деталь, которая не встаёт на стол, отменяет все
     остальные числа: тонкая стенка у ненапечатанной детали никого не занимает. */
  setBox({ hollow:true, wallThickness:0.8 });
  {
    const ws = collectPrintWarnings(paramState.box, plainBoxShellTris(300, 50, 200));
    check('строка про стол идёт первой', /НЕ ВЛЕЗАЕТ/.test(ws[0] || ''), ws[0]);
    check('прочие жалобы при этом не пропали', ws.some(s => /стенка/.test(s)), ws);
  }

  /* Меряется сетка, а не параметры. Пара проверок ловит соблазн взять width/depth: у половины форм
     (червячное колесо, ваза, крючок) габарит из параметров не выводится вовсе. */
  setBox({ width: 40, depth: 40 });
  check('маленькие параметры не спасают большую сетку',
        /НЕ ВЛЕЗАЕТ/.test(bedLine(warn(300, 50, 300)) || ''));
  setBox({ width: 300, depth: 300 });
  check('большие параметры не топят маленькую сетку', warn(40, 40, 40).length === 0, warn(40, 40, 40));
  setBox({});
}

console.log('\n=== snapWeldTris (final safety weld) ===');
{
  // a sliver quad whose two long edges are 1e-6 apart must vanish entirely
  const sliver = [
    [[0,0,0],[10,0,0],[10,1e-6,0]],
    [[0,0,0],[10,1e-6,0],[0,1e-6,0]],
  ];
  check('sliver quad collapses to nothing', snapWeldTris(sliver).length === 0, snapWeldTris(sliver).length);
  // a normal closed box passes through untouched (12 tris, same coordinates)
  const box = plainBoxShellTris(10, 6, 4);
  const welded = snapWeldTris(box);
  check('plain box: 12 tris survive unchanged', welded.length === 12 &&
    JSON.stringify(welded) === JSON.stringify(box), welded.length);
  // near-duplicate vertices (1e-9 apart) are unified to ONE representative object
  const t2 = snapWeldTris([
    [[0,0,0],[5,0,0],[0,5,0]],
    [[5,0,0],[1e-9,0,0],[0,0,5]],
  ]);
  check('1e-9-apart vertices weld to one representative', t2.length === 2 && t2[0][0] === t2[1][1]);
  // distinct vertices well above the tolerance are NOT merged
  const t3 = snapWeldTris([[[0,0,0],[0.001,0,0],[0,0.001,0]]]);
  check('0.001mm features stay intact', t3.length === 1);
}

console.log(`\n=== TOTAL: ${pass} passed, ${fail} failed ===`);
process.exit(fail ? 1 : 0);
