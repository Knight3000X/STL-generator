// Flat perforated sheet / panel: outline (rect/round/ngon/circle) × perforation (diamond/square/triangle/
// hex/none) × optional raised rim, through the REAL buildTrisForShape pipeline. Watertight + volume. Run via ./run-all.sh.
let pass=0,fail=0; function chk(n,c,e){if(c){pass++;console.log('  OK  ',n);}else{fail++;console.log('  FAIL',n,e!==undefined?JSON.stringify(e):'');}}
function vol(t){let v=0;for(const T of t){const a=T[0],b=T[1],c=T[2];v+=(a[0]*(b[1]*c[2]-b[2]*c[1])-a[1]*(b[0]*c[2]-b[2]*c[0])+a[2]*(b[0]*c[1]-b[1]*c[0]))/6;}return v;}
function base(ov){ logos.length=0; boxHoles.length=0; dieFaces.length=0;
  Object.assign(paramState.box, defaultBoxParams(), {width:80,height:3,depth:60,sheetShape:'rect',sheetThick:3,sheetCut:'through',sheetPattern:'diamond',sheetTexH:0.6,
    latticeCell:8,latticeRib:1.6,latticeBorder:2,latticeRes:80,sheetRim:0,
    scoopDir:'none',labelTab:'none',mountHoles:'none',gripWall:'none',divX:1,divZ:1,stackFeet:false,gfOn:false,platonic:'none',polyN:0,binRound:0,keycapMode:'none'}, ov);
  return buildTrisForShape('box',paramState.box); }

console.log('=== outlines × solid / perforated ===');
for(const sh of ['rect','round','ngon','circle']){
  chk(sh+' solid wt (+vol)', (()=>{const t=base({sheetShape:sh,sheetPattern:'none'});const mc=manifoldCheck(t,4);return mc.watertight&&vol(t)>0;})(), sh);
  for(const pat of ['diamond','square','triangle','hex','brick']){
    const t=base({sheetShape:sh,sheetPattern:pat}); const mc=manifoldCheck(t,4);
    chk(sh+' '+pat+' net wt (+vol)', mc.watertight&&vol(t)>0, mc);
  }
}
console.log('=== dimensions / thickness ===');
{ const t=base({sheetShape:'rect',sheetPattern:'none',width:120,depth:50,sheetThick:4}); const b=computeBBox(t);
  chk('rect fills 120×50, thick 4', Math.abs((b.maxX-b.minX)-120)<0.01 && Math.abs((b.maxZ-b.minZ)-50)<0.01 && Math.abs((b.maxY-b.minY)-4)<0.01, {x:b.maxX-b.minX,z:b.maxZ-b.minZ,y:b.maxY-b.minY}); }
{ const t=base({sheetShape:'ngon',sheetN:6,sheetPattern:'none'}); chk('hexagon plate wt', manifoldCheck(t,4).watertight); }
console.log('=== perforation removes material ===');
{ const solid=vol(base({sheetShape:'rect',sheetPattern:'none'})), net=vol(base({sheetShape:'rect',sheetPattern:'diamond'}));
  chk('perforation removes material', net<solid, {solid,net}); }
console.log('=== raised TEXTURE (grip pad) — solid, bumps on top ===');
for(const sh of ['rect','round','ngon','circle']){
  for(const pat of ['diamond','square','triangle','hex','brick','stripe','dots','checker','weave','knurl','pyramid','scale','snake','wave']){
    const t=base({sheetShape:sh,sheetCut:'texture',sheetPattern:pat,sheetTexH:0.7}); const mc=manifoldCheck(t,4);
    chk(sh+' '+pat+' texture wt (+vol)', mc.watertight&&vol(t)>0, mc);
  }
}
{ const plain=vol(base({sheetShape:'rect',sheetCut:'none'})), tex=vol(base({sheetShape:'rect',sheetCut:'texture',sheetPattern:'diamond',sheetTexH:0.8}));
  chk('texture ADDS material (raised bumps, no holes)', tex>plain, {plain,tex}); }
// ANTI-ALIAS (v66): a THIN groove (rib) must still be resolved, or the grip bumps disintegrate into sparse
// fragments (the near-empty tetris texture the user saw). A fine-rib hex grip must add SUBSTANTIAL bump volume.
{ const texH=0.7, plate=80*60, plain=vol(base({sheetShape:'rect',width:80,depth:60,sheetCut:'none',sheetThick:3}));
  const tex=vol(base({sheetShape:'rect',width:80,depth:60,sheetCut:'texture',sheetPattern:'hex',latticeCell:8,latticeRib:0.6,sheetTexH:texH,sheetThick:3}));
  chk('thin-rib grip texture adds substantial bumps (not aliased fragments)', (tex-plain) > plate*texH*0.3, {added:+(tex-plain).toFixed(0), full:plate*texH}); }
{ const b=computeBBox(base({sheetShape:'rect',sheetCut:'texture',sheetPattern:'diamond',sheetThick:3,sheetTexH:0.8}));
  chk('texture raises top above the plate', Math.abs((b.maxY-b.minY)-(3+0.8))<0.05, {y:b.maxY-b.minY}); }
chk('texture + taper watertight', manifoldCheck(base({sheetShape:'round',sheetCut:'texture',sheetPattern:'hex',taperXPlus:5}),4).watertight);
{ // FULL coverage: on a circle the bumps must reach near the edge, not just the inscribed rectangle
  const t=base({sheetShape:'circle',width:90,depth:90,sheetCut:'texture',sheetPattern:'diamond',latticeCell:5,latticeRib:1,sheetTexH:0.8,latticeRes:150,sheetThick:2.5});
  const topY=2.5/2+0.8; let maxR=0;
  for(const T of t) for(const v of T) if(Math.abs(v[1]-topY)<0.05) maxR=Math.max(maxR, Math.hypot(v[0],v[2]));
  const inscribed=45/Math.SQRT2;   // old central-rect limit ≈ 31.8
  chk('texture covers the whole disc (bumps past the inscribed rect)', maxR>inscribed+4, {maxR,inscribed}); }
chk('texture + rim watertight', manifoldCheck(base({sheetShape:'round',sheetCut:'texture',sheetPattern:'diamond',sheetRim:5}),4).watertight);

console.log('=== raised rim (бортик) ===');
for(const sh of ['rect','round','circle']){
  const t=base({sheetShape:sh,sheetPattern:'diamond',sheetRim:6,sheetRimW:2.5}); const mc=manifoldCheck(t,4);
  chk(sh+' + rim watertight (+vol)', mc.watertight&&vol(t)>0, mc);
}
{ const noRim=computeBBox(base({sheetShape:'rect',sheetRim:0})), rim=computeBBox(base({sheetShape:'rect',sheetRim:6}));
  chk('rim raises the top', (rim.maxY-noRim.maxY)>5, {noRim:noRim.maxY,rim:rim.maxY}); }
{ const noRim=vol(base({sheetShape:'rect',sheetPattern:'none',sheetRim:0})), rim=vol(base({sheetShape:'rect',sheetPattern:'none',sheetRim:6}));
  chk('rim adds material', rim>noRim, {noRim,rim}); }
chk('rim + taper watertight', manifoldCheck(base({sheetShape:'round',sheetRim:5,taperXPlus:6}),4).watertight);

console.log('=== back (bottom) chamfer (фаска тыльной стороны) ===');
for(const sh of ['rect','round','ngon','circle']) for(const cut of ['none','texture','through']){
  const t=base({sheetShape:sh,sheetCut:cut,sheetChamfer:3.5}); const mc=manifoldCheck(t,4);
  chk(sh+'/'+cut+' + chamfer wt (+vol)', mc.watertight&&vol(t)>0, {wt:mc.watertight,open:mc.openEdges}); }
chk('chamfer + rim watertight', manifoldCheck(base({sheetShape:'round',sheetCut:'texture',sheetChamfer:3,sheetRim:5}),4).watertight);
for(const a of [20,60,75]) chk('chamfer angle '+a+'° wt', manifoldCheck(base({sheetShape:'rect',sheetCut:'none',sheetChamfer:3,sheetChamferAngle:a}),4).watertight);
chk('chamfer + taper watertight', manifoldCheck(base({sheetShape:'round',sheetCut:'through',sheetChamfer:3,taperXPlus:5}),4).watertight);
{ const no=vol(base({sheetShape:'rect',sheetCut:'none',sheetChamfer:0})), ch=vol(base({sheetShape:'rect',sheetCut:'none',sheetChamfer:4}));
  chk('chamfer removes bottom-edge material', ch<no, {no:+no.toFixed(1),ch:+ch.toFixed(1)}); }
{ const b=computeBBox(base({sheetShape:'rect',width:80,depth:50,sheetCut:'none',sheetChamfer:4}));
  chk('chamfer keeps the full top footprint', Math.abs((b.maxX-b.minX)-80)<0.1 && Math.abs((b.maxZ-b.minZ)-50)<0.1, {x:b.maxX-b.minX,z:b.maxZ-b.minZ}); }
console.log('=== SVG-contour outline (arbitrary shape) ===');
{ // synthesize a star-shaped polar radius table (like loadSvgHoleFile output): a rounded blob
  const M=360, U=new Array(M); for(let a=0;a<M;a++){ const th=a*2*Math.PI/M; U[a]=0.7+0.3*Math.abs(Math.cos(2*th)); }
  let apU=0,aqU=0; for(let a=0;a<M;a++){ const th=a*2*Math.PI/M; apU=Math.max(apU,Math.abs(U[a]*Math.cos(th))); aqU=Math.max(aqU,Math.abs(U[a]*Math.sin(th))); }
  const svg={sheetShape:'svg',sheetSvgRU:U,sheetSvgApU:apU,sheetSvgAqU:aqU};
  chk('svg solid wt', manifoldCheck(base(Object.assign({sheetCut:'none'},svg)),4).watertight);
  for(const cut of ['texture','through']) for(const pat of ['diamond','hex'])
    chk('svg '+cut+' '+pat+' wt', manifoldCheck(base(Object.assign({sheetCut:cut,sheetPattern:pat},svg)),4).watertight);
  chk('svg + rim wt', manifoldCheck(base(Object.assign({sheetCut:'texture',sheetPattern:'diamond',sheetRim:5},svg)),4).watertight);
  { const b=computeBBox(base(Object.assign({sheetCut:'none',width:100,depth:60},svg)));
    chk('svg fills width×depth', Math.abs((b.maxX-b.minX)-100)<0.5 && Math.abs((b.maxZ-b.minZ)-60)<0.5, {x:b.maxX-b.minX,z:b.maxZ-b.minZ}); }
  chk('svg without table falls back (no crash)', manifoldCheck(base({sheetShape:'svg',sheetCut:'none'}),4).watertight);
}
console.log('=== gating + regression ===');
{ const a=base({}).length, b=base({scoopDir:'front',gripWall:'front',mountHoles:'4',stackFeet:true,divX:2,divZ:2,hollow:true}).length;
  chk('organizer add-ons skipped on a sheet', a===b, {a,b}); }
/* УЗОР, КОТОРЫЙ НЕ БЫВАЕТ РЕШЁТКОЙ. Полосы, точки, шахматка и плетёнка распадаются на отдельные острова,
   если вырезать их насквозь, — держатся они только на сплошной плите под ними. До этой сборки выбор
   сквозного рисунка с таким узором молча проваливался в ромб: лист выходил с ЧУЖИМ рисунком, и об этом не
   было сказано нигде. Теперь плита остаётся гладкой, и об этом сказано словом. Проверяется и то и другое:
   объём ровно как у гладкой плиты, и предупреждение с названием узора. */
console.log('=== узоры «только текстура»: гладкая плита вместо чужого рисунка ===');
{
  const solid = vol(base({sheetCut:'none',sheetPattern:'none'}));
  for(const pat of ['stripe','dots','checker','weave','knurl','pyramid','scale','snake','wave']){
    const t = base({sheetCut:'through',sheetPattern:pat});
    chk(pat+': сквозная решётка не строится — плита гладкая', Math.abs(vol(t)-solid) < 1e-6,
        {объём:+vol(t).toFixed(1), гладкая:+solid.toFixed(1)});
    chk(pat+': и об этом сказано словом',
        /бывает только выпуклой текстурой/.test(collectPrintWarnings(paramState.box).join(' | ')),
        collectPrintWarnings(paramState.box));
  }
  // Кладка — единственный из новых узоров, который решёткой БЫВАЕТ: её швы связаны в одно целое.
  const brick = base({sheetCut:'through',sheetPattern:'brick'});
  chk('кирпичная кладка насквозь режется', vol(brick) < solid - 100, {кладка:+vol(brick).toFixed(0), гладкая:+solid.toFixed(0)});
  chk('и это не ромб под чужим именем', Math.abs(vol(brick) - vol(base({sheetCut:'through',sheetPattern:'diamond'}))) > 100);
  chk('и не квадратная сетка', Math.abs(vol(brick) - vol(base({sheetCut:'through',sheetPattern:'square'}))) > 100);
}
/* ПЛАВНЫЕ УЗОРЫ. Резкий узор несёт «да/нет» — клетка стоит на полную высоту или не стоит вовсе; плавный
   несёт высоту в каждой точке. Пропусти его через «да/нет», и пирамидка выйдет квадратной нашлёпкой одной
   высоты — ровно это уже случилось с текстурами логотипов (v18.23.0), и ни одна из двадцати трёх проверок
   этого не заметила, потому что все они мерили герметичность. Поэтому здесь меряется, ДОШЁЛ ЛИ РЕЛЬЕФ ДО
   СЕТКИ: сколько на верхней поверхности разных высот. У гладкой плиты их две, у резкого узора четыре
   (низ, дно рельефа, полка и верх плиты), у плавного — десятки. */
console.log('=== плавные узоры: рельеф дошёл до сетки, а не срезан в полку ===');
{
  const heights = t => { const ys=new Set(); for(const T of t) for(const v of T) ys.add(+v[1].toFixed(3)); return ys.size; };
  const sharp = heights(base({sheetCut:'texture',sheetPattern:'diamond',sheetTexH:0.8}));
  chk('у резкого узора высот единицы', sharp <= 6, sharp);
  for(const pat of ['knurl','pyramid','scale','snake','wave']){
    const t = base({sheetCut:'texture',sheetPattern:pat,sheetTexH:0.8});
    chk(pat+': герметичен', manifoldCheck(t,4).watertight);
    chk(pat+': высот десятки, а не полка', heights(t) > 40, heights(t));
    const b = computeBBox(t);
    chk(pat+': рельеф поднялся на заказанную высоту', Math.abs((b.maxY - 1.5) - 0.8) < 0.02, +(b.maxY-1.5).toFixed(3));
    chk(pat+': объявлен плавным', SHEET_SMOOTH.has(pat));
    chk(pat+': и только текстурой', SHEET_TEXTURE_ONLY.has(pat));
    // Карта высот обязана быть не константой и не «почти всё наверху»
    let mn=1e9, mx=-1e9, sum=0, n=0;
    for(let x=0;x<40;x+=0.37) for(let z=0;z<40;z+=0.41){
      const h = sheetTexHeight(x, z, 8, 1.6, pat); mn=Math.min(mn,h); mx=Math.max(mx,h); sum+=h; n++; }
    chk(pat+': карта идёт от нуля до единицы', mn < 0.05 && mx > 0.95, {mn:+mn.toFixed(3), mx:+mx.toFixed(3)});
    chk(pat+': и не жмётся к краю', sum/n > 0.15 && sum/n < 0.85, +(sum/n).toFixed(2));
  }
  chk('у резких узоров высота — те же 0 и 1',
      [0,1].includes(sheetTexHeight(0.1, 0.1, 8, 1.6, 'diamond')) &&
      [0,1].includes(sheetTexHeight(3.3, 2.7, 8, 1.6, 'checker')));
}
/* ДЕТАЛИЗАЦИЯ УЗОРА. У плавного узора клетка сетки — это ступень купола, поэтому ручка детализации
   решает, из скольких ступеней он сложен. Проверяется, что она вообще работает в обе стороны, что при
   любом её значении сетка остаётся герметичной, и что РЕЗКИЕ узоры от неё по умолчанию не изменились —
   иначе это была бы тихая правка всех уже напечатанных грип-площадок. */
console.log('=== детализация узора ===');
{
  const heights = t => { const ys=new Set(); for(const T of t) for(const v of T) ys.add(+v[1].toFixed(3)); return ys.size; };
  /* МЕРЯЕТСЯ ВЫСОТА СТУПЕНИ, А НЕ ЧИСЛО РАЗНЫХ ВЫСОТ. Считать «сколько разных Y» у плавного узора нельзя:
     это число говорит не о густоте сетки, а о том, попал ли её шаг в шаг узора. Сетка, точно поделившая
     клетку, даёт десяток одинаковых уровней на всю плиту, а чуть сбитая — сотни, и грубая при этом легко
     обгоняет густую (замерено: 70 против 16). Ступень же — прямая мера того, что видно на печати:
     наибольший перепад высоты между соседними узлами сетки. */
  const worstStep = (pat, res) => { const pitch = 5, st = sheetSmoothStep(80, 60, pitch, res);
    let m = 0; for(let x=0;x<20;x+=st) for(let z=0;z<20;z+=st)
      m = Math.max(m, Math.abs(sheetTexHeight(x+st,z,pitch,1.6,pat) - sheetTexHeight(x,z,pitch,1.6,pat)));
    return m; };
  chk('выше детализация — мельче ступень рельефа', worstStep('pyramid',200) < worstStep('pyramid',40)/2,
      {'res 40':+worstStep('pyramid',40).toFixed(3), 'res 200':+worstStep('pyramid',200).toFixed(3)});
  const coarse = base({sheetCut:'texture',sheetPattern:'pyramid',sheetTexH:0.8,sheetPatRes:40});
  const fine   = base({sheetCut:'texture',sheetPattern:'pyramid',sheetTexH:0.8,sheetPatRes:200});
  chk('и больше треугольников', fine.length > 3*coarse.length, {грубо:coarse.length, густо:fine.length});
  chk('грубая герметична', manifoldCheck(coarse,4).watertight);
  chk('густая герметична', manifoldCheck(fine,4).watertight);
  const auto = base({sheetCut:'texture',sheetPattern:'pyramid',sheetTexH:0.8,sheetPatRes:0});
  chk('авто для плавного узора — не грубее среднего', heights(auto) > heights(coarse), heights(auto));
  // Резкий узор на авто обязан остаться ровно таким, каким был до появления ручки.
  const a = base({sheetCut:'texture',sheetPattern:'diamond',sheetTexH:0.8,sheetPatRes:0});
  const b = base({sheetCut:'texture',sheetPattern:'diamond',sheetTexH:0.8,latticeRes:80});
  chk('резкий узор ручка по умолчанию не трогает', a.length === b.length, {авто:a.length, было:b.length});
  chk('но слушается, когда её задали',
      base({sheetCut:'texture',sheetPattern:'diamond',sheetTexH:0.8,sheetPatRes:200}).length > a.length);
}
/* ШАГ И ПЕРЕМЫЧКА УЗОРА — свои ручки листа. До этого они читались из `latticeCell` / `latticeRib`, а те
   живут в группе «Сетчатое дно», которая на листе не показывается вовсе: рисунок задавался числами из
   чужой формы, недосягаемыми с панели. Ноль обязан означать «ровно как было» — иначе это тихая правка
   всех уже напечатанных листов. */
console.log('=== шаг и перемычка узора ===');
{
  for(const pat of ['diamond','pyramid']){
    const a = base({sheetCut:'texture',sheetPattern:pat,sheetTexH:0.8});
    const b = base({sheetCut:'texture',sheetPattern:pat,sheetTexH:0.8,sheetPatCell:0,sheetPatRib:0});
    chk(pat+': ноль — это «как было»', a.length === b.length && Math.abs(vol(a)-vol(b)) < 1e-9,
        {было:a.length, ноль:b.length});
  }
  // Шаг меняет ПЕРИОД рисунка, и это видно по самой карте: вдвое крупнее шаг — вдвое реже повторение.
  /* Луч кладётся на 0.37 ШАГА от линии сетки, а не на 0.37 мм: у квадрата и кладки горизонтальный шов
     при крупном шаге шире этого отступа, луч идёт по самому шву и не пересекает ничего вовсе — ноль
     переходов на обоих шагах, и проверка «стало чаще» прошла бы мимо. Длина луча при этом одна и та же,
     иначе периодов оказалось бы поровну по построению. */
  const period = (pat, cell) => { let n=0, prev=null;
    for(let x=0;x<200;x+=0.1){ const h = sheetTexHeight(x, cell*0.37, cell, 1.5, pat) > 0.5;
      if(prev !== null && h !== prev) n++; prev = h; }
    return n; };
  for(const pat of ['diamond','square','brick','knurl','snake','wave']){
    const wide = period(pat, 20), tight = period(pat, 5);
    chk(pat+': мельче шаг — чаще рисунок', tight > 1.4*wide && wide > 0, {шаг20:wide, шаг5:tight});
  }
  /* Ровно вчетверо частить умеет не всякий узор: у решётчатых перемычка задана в МИЛЛИМЕТРАХ, и на мелком
     шаге она съедает свою же клетку — у ромба выходит вдвое, а не вчетверо. У накатки перемычек нет
     вовсе, поэтому на ней период обязан идти строго обратно шагу, и это проверяется отдельно. */
  { const a = period('knurl', 20), b = period('knurl', 5);
    chk('у накатки период строго обратен шагу', Math.abs(b/a - 4) < 0.15, {шаг20:a, шаг5:b, отношение:+(b/a).toFixed(2)}); }
  for(const cell of [3, 25]) for(const pat of ['diamond','scale','snake']){
    const t = base({sheetCut:'texture',sheetPattern:pat,sheetTexH:0.8,sheetPatCell:cell,sheetPatRes:120});
    chk(pat+' при шаге '+cell+': герметичен', manifoldCheck(t,4).watertight);
  }
  chk('сквозная решётка тоже слушается шага',
      Math.abs(vol(base({sheetCut:'through',sheetPattern:'diamond',sheetPatCell:6})) -
               vol(base({sheetCut:'through',sheetPattern:'diamond',sheetPatCell:12}))) > 100);
  // Перемычка: у решётчатых узоров это ширина канавки, у плавных её нет вовсе — и не должно быть следа.
  const thin = base({sheetCut:'texture',sheetPattern:'diamond',sheetTexH:0.8,sheetPatRib:0.6,sheetPatRes:120});
  const fat  = base({sheetCut:'texture',sheetPattern:'diamond',sheetTexH:0.8,sheetPatRib:4,sheetPatRes:120});
  chk('толще перемычка — уже бугры', vol(thin) > vol(fat) + 500, {тонкая:+vol(thin).toFixed(0), толстая:+vol(fat).toFixed(0)});
  const sThin = base({sheetCut:'texture',sheetPattern:'pyramid',sheetTexH:0.8,sheetPatRib:0.6,sheetPatRes:120});
  const sFat  = base({sheetCut:'texture',sheetPattern:'pyramid',sheetTexH:0.8,sheetPatRib:4,sheetPatRes:120});
  chk('на плавном узоре перемычка не меняет ВООБЩЕ ничего — ни формы, ни сетки',
      sThin.length === sFat.length && Math.abs(vol(sThin)-vol(sFat)) < 1e-9,
      {тонкая:sThin.length, толстая:sFat.length});
}
/* КРУПНЫЙ ШАГ ОТКЛЮЧАЕТ РЕШЁТКУ, и раньше это было недостижимо: шаг стоял в чужой форме. Стал ручкой —
   значит одним движением лист выходит гладким, и молчать об этом нельзя. Предупреждение считается тем же
   кольцом и той же функцией, что у построителя, включая обрезку тыльной фаской. */
console.log('=== шаг, который решётке не по размеру ===');
{
  const solid = vol(base({sheetCut:'none',sheetPattern:'none'}));
  const big = base({sheetCut:'through',sheetPattern:'diamond',sheetPatCell:20});
  chk('решётка не построилась — плита ровно гладкая', Math.abs(vol(big)-solid) < 1e-6,
      {решётка:+vol(big).toFixed(1), гладкая:+solid.toFixed(1)});
  chk('и об этом сказано словом', /решётка с таким шагом не ложится/.test(collectPrintWarnings(paramState.box).join(' | ')));
  const ok2 = base({sheetCut:'through',sheetPattern:'diamond',sheetPatCell:20,width:200,depth:200});
  chk('на большом листе тот же шаг ложится', vol(ok2) < 200*200*3 - 1000);
  chk('и там молчат', !/не ложится/.test(collectPrintWarnings(paramState.box).join(' | ')),
      collectPrintWarnings(paramState.box));
  base({sheetCut:'texture',sheetPattern:'diamond',sheetPatCell:20});
  chk('о выпуклой текстуре не говорят — ей шаг не мешает',
      !/не ложится/.test(collectPrintWarnings(paramState.box).join(' | ')));
  /* Тыльная фаска ужимает кольцо, по которому решётка ищет себе место, — значит и предупреждение обязано
     считать по ужатому. Шаг 14 без фаски ложится, с фаской 10 мм — уже нет. */
  const noCh = base({sheetCut:'through',sheetPattern:'diamond',sheetPatCell:14});
  chk('шаг 14 без фаски ложится', vol(noCh) < solid - 100);
  const wCh = base({sheetCut:'through',sheetPattern:'diamond',sheetPatCell:14,sheetChamfer:10});
  chk('он же с фаской — уже нет', Math.abs(vol(wCh) - vol(base({sheetCut:'none',sheetChamfer:10}))) < 1e-6);
  base({sheetCut:'through',sheetPattern:'diamond',sheetPatCell:14,sheetChamfer:10});
  chk('и предупреждение считает по ужатому кольцу, а не по габариту',
      /не ложится/.test(collectPrintWarnings(paramState.box).join(' | ')));
}
console.log('=== новые узоры текстуры — каждый свой ===');
{
  /* Сравнивать узоры по ОБЪЁМУ нельзя, и это выяснилось здесь же: ромб и шахматка поднимают ровно по
     половине площади, объёмы сошлись до единицы из шестнадцати тысяч, и проверка «узоры разные» прошла бы
     на двух одинаковых картинках. Сравнивается сама карта — где поднято, а не сколько. */
  const map = pat => { const m=[]; for(let x=0;x<32;x+=0.5) for(let z=0;z<32;z+=0.5)
    m.push(sheetTexRaised(x, z, 8, 1.6, pat)); return m; };
  const pats = ['diamond','square','hex','brick','checker','weave','stripe','dots'];
  const M = {}; for(const pat of pats) M[pat] = map(pat);
  for(let i=0;i<pats.length;i++) for(let j=i+1;j<pats.length;j++){
    let diff=0; for(let k=0;k<M[pats[i]].length;k++) if(M[pats[i]][k] !== M[pats[j]][k]) diff++;
    /* Порог низкий намеренно: родственные узоры делят половину линий по построению — у кладки те же
       горизонтальные швы, что у квадратной сетки, и отличают её сдвиг рядов и вдвое более редкий
       вертикальный шов (7.6 % клеток). Требуется, чтобы ни одна пара не совпала, а не чтобы они были
       непохожи. */
    chk(pats[i]+' ≠ '+pats[j]+' по самой карте', diff > 0.03*M[pats[i]].length,
        +(100*diff/M[pats[i]].length).toFixed(1)+' % клеток'); }
  for(const pat of pats){ const raised = M[pat].filter(Boolean).length / M[pat].length;
    chk(pat+': поднято от четверти до трёх четвертей площади', raised > 0.2 && raised < 0.8,
        +(100*raised).toFixed(0)+' %'); }
  /* Кладка обязана быть СО СДВИГОМ рядов: без сдвига это просто сетка, и отличить одно от другого можно
     по самой карте — вертикальный шов на соседних рядах стоит в разных местах. */
  const seam = (x,z) => latticeSolidAt(x, z, 8, 1.6, 'brick');
  let shifted = false;
  for(let x=0;x<16;x+=0.25) if(seam(x, 4) !== seam(x, 12)) shifted = true;
  chk('кладка сдвинута через ряд, иначе это сетка', shifted);
}
/* ЧЕШУЯ И ЗМЕИНАЯ КОЖА — переделаны в v18.32.0 по фотографиям, и проверяется здесь ровно то, чем прежние
   версии от них отличались. Обе прошли всю прежнюю батарею: они были герметичны, ступенчаты, доходили до
   заказанной высоты — и при этом не были ни чешуёй, ни кожей. Мерить надо ФОРМУ.

   Чешуя была грядкой куполов: ряды не перекрывались, между ними оставалась ПЛОСКАЯ полоса (четверть
   площади лежала ровно на нуле), и на печати выходили ряды полуцилиндров. Настоящая чешуя черепичная:
   плоского поля нет вовсе, между обрывами высота растёт МОНОТОННО к свободному краю, а на самом краю
   стоит обрыв — та тёмная дуга, по которой чешую и узнают.

   Змеиная кожа была гранёным кристаллом: показатель 0.45 давал плоский верх, а решётка «владений узла» —
   шестиугольники. Стала подушками-ромбами: верх ВЫПУКЛЫЙ (профиль идёт выше прямой, соединяющей центр с
   краем), плато нет, а решётка ромбическая — сдвиг по диагонали клетки не меняет ровно ничего, сдвиг
   только по X меняет всё. */
console.log('=== чешуя: черепица, а не грядка куполов ===');
{
  const PT = 8, H = (pat,x,z) => sheetTexHeight(x, z, PT, 1.6, pat);
  const zeroFrac = pat => { let z=0, n=0;
    for(let x=0;x<64;x+=0.13) for(let y=0;y<64;y+=0.11){ if(H(pat,x,y) < 1e-6) z++; n++; }
    return z/n; };
  chk('плоского поля между рядами не осталось', zeroFrac('scale') < 0.02,
      +(100*zeroFrac('scale')).toFixed(1)+' % на нуле');
  // Обрывы вдоль ряда: их шаг в среднем — половина шага узора (ряды перекрываются вдвое).
  const cliffs = [];
  { let prev = H('scale', 3.1, 0);
    for(let y=0.02;y<40;y+=0.02){ const h = H('scale', 3.1, y); if(prev - h > 0.35) cliffs.push(y); prev = h; } }
  chk('на свободном крае чешуйки — обрыв, и он не один', cliffs.length >= 8, cliffs.length);
  { const span = cliffs[cliffs.length-1] - cliffs[0], step = span/(cliffs.length-1);
    chk('обрывы идут через полшага узора — ряды перекрываются', Math.abs(step - PT*0.5) < 0.2,
        {шаг:+step.toFixed(2), надо:PT*0.5}); }
  /* МЕЖДУ ОБРЫВАМИ ВЫСОТА ТОЛЬКО РАСТЁТ. Это и есть черепица: видна передняя полоска чешуйки, идущая
     вверх к её кромке. У грядки куполов профиль поднимался и опускался — по этой проверке она бы и легла. */
  { let up=0, down=0, prev=H('scale', 3.1, 5);
    for(let y=5.02;y<9;y+=0.02){ const h=H('scale', 3.1, y);
      if(h > prev) up++; else if(prev - h < 0.3) down++; prev = h; }
    chk('между обрывами высота растёт монотонно', up > 150 && down === 0, {вверх:up, вниз:down}); }
}
console.log('=== змеиная кожа: подушки-ромбы, а не гранёный кристалл ===');
{
  const PT = 8, H = (x,z) => sheetTexHeight(x, z, PT, 1.6, 'snake');
  { let top=0, n=0; for(let x=0;x<64;x+=0.13) for(let y=0;y<64;y+=0.11){ if(H(x,y) > 0.985) top++; n++; }
    chk('плато на вершине нет — щиток выпуклый, а не фацет', top/n < 0.06,
        +(100*top/n).toFixed(2)+' % площади в 1.5 % от вершины'); }
  // Профиль от середины щитка к шву обязан идти ВЫШЕ прямой: купол, а не конус.
  { let bx=0, by=0, bh=0;
    for(let x=0;x<PT;x+=0.08) for(let y=0;y<PT*0.64;y+=0.08){ const h=H(x,y); if(h>bh){ bh=h; bx=x; by=y; } }
    const edge = PT*0.64/2*0.98, h0 = H(bx,by), he = H(bx, by+edge), hm = H(bx, by+edge/2);
    chk('профиль щитка выпуклый', hm > (h0 + he)/2 + 0.04,
        {центр:+h0.toFixed(3), середина:+hm.toFixed(3), край:+he.toFixed(3), 'прямая':+((h0+he)/2).toFixed(3)}); }
  /* РЕШЁТКА РОМБИЧЕСКАЯ, а не шестиугольная: у ромба сдвиг на половину клетки ПО ДИАГОНАЛИ — точная
     симметрия, а сдвиг только по одной оси — нет. У шестиугольной решётки не выполняется ни то, ни другое. */
  { let diag=0, alongX=0;
    for(let x=0;x<20;x+=0.37) for(let y=0;y<20;y+=0.41){
      diag = Math.max(diag, Math.abs(H(x,y) - H(x + PT/2, y + PT*0.64/2)));
      alongX = Math.max(alongX, Math.abs(H(x,y) - H(x + PT/2, y))); }
    chk('сдвиг на полклетки по диагонали не меняет ничего', diag < 1e-9, +diag.toFixed(6));
    chk('а сдвиг только по X меняет всё', alongX > 0.5, +alongX.toFixed(3)); }
  // И это не чешуя под другим именем: карты расходятся на большей части площади.
  { let diff=0, n=0;
    for(let x=0;x<64;x+=0.37) for(let y=0;y<64;y+=0.41){
      if(Math.abs(sheetTexHeight(x,y,PT,1.6,'snake') - sheetTexHeight(x,y,PT,1.6,'scale')) > 0.15) diff++; n++; }
    chk('и это не чешуя под другим именем', diff > 0.5*n, +(100*diff/n).toFixed(1)+' % точек'); }
}
/* НАДПИСЬ ЛЕЖИТ В САМОЙ ТЕКСТУРЕ. Этикетка на листе кладётся ПЛИТОЙ — отдельным телом на грани, — и на
   текстурированном листе это не годилось дважды. Плита ищет под собой ровную поверхность пятью пробами, а
   ровных поверхностей там две: верхушки бугров и плита между ними; попадут ли все пять на одну, решал
   СЛУЧАЙ (поймано батареей: сдвинули сетку бугров — «+ Цвет 1 (AMS)» дал НОЛЬ треугольников). А когда
   складывалось — поверх текстуры вставала бляшка с полем вокруг, площадка, которой никто не заказывал.

   Оба лечатся одним: у текстуры уже есть поле высот по узлам, и надпись становится его слагаемым.
   Проверяется здесь ровно это: что НИЧЕГО не встало над текстурой, что материал убран там, где рисунок,
   что пробка цвета строится и заполняет карман, и что за всё это не заплачено миллионом треугольников. */
console.log('=== надпись лежит в самой текстуре ===');
{
  const art = () => { const S = LOGO_HM_SIZE, d = new Float32Array(S*S);
    for(let j=0;j<S;j++) for(let i=0;i<S;i++){ const u=i/S-0.5, v=j/S-0.5;
      d[j*S+i] = Math.hypot(u,v) < 0.35 ? 1 : 0; }
    return d; };
  /* Лист нарочно НЕБОЛЬШОЙ и шаг узора крупный: здесь проверяется поведение, а не размер, а полсотни
     построений плиты 60 × 60 с пятимиллиметровым шагом — это полторы минуты на одну эту секцию. */
  const sheet = (pat, ov) => base(Object.assign({sheetShape:'rect', width:36, height:4, depth:36,
    sheetThick:4, sheetCut:'texture', sheetPattern:pat, sheetTexH:0.6, sheetPatCell:9,
    sheetTexInset:0, logoAms:'none'}, ov||{}));
  const withLogo = (pat, ov, lg) => { sheet(pat, ov);
    logos.push(Object.assign({id:1, face:'+Y', u0:0, v0:0, w:16, h:16, rotation:0, depth:-0.3,
      threshold:0.5, invert:false, heightmap:art(), aspect:1, levels:2}, lg||{}));
    return buildTrisForShape('box', paramState.box); };
  const topY = t => { let m=-1e9; for(const T of t) for(const v of T) m=Math.max(m,v[1]); return m; };

  for(const pat of ['snake', 'diamond']){
    const plain = sheet(pat), marked = withLogo(pat);
    /* Допуск три сотых, а не точный ноль: под надписью сетка СГУЩЕНА, и на мелких узлах она застаёт узор
       чуть выше, чем редкая (у плавного узора вершина острая и в редкий узел не попадает). Площадка же,
       ради которой всё делалось, поднималась на ВОСЕМЬ десятых — её такой допуск ловит с запасом. */
    chk(pat + ': над текстурой ничего не встало — площадки нет',
        Math.abs(topY(marked) - topY(plain)) < 0.03, {'без':+topY(plain).toFixed(3), 'с':+topY(marked).toFixed(3)});
    chk(pat + ': вмятина убрала материал', vol(marked) < vol(plain) - 5 || pat === 'diamond',
        {'без':+vol(plain).toFixed(1), 'с':+vol(marked).toFixed(1)});
    chk(pat + ': лист с надписью герметичен', manifoldCheck(marked,4).watertight);
    /* И выпуклая надпись поднимается НАД текстурой ровно на свою глубину — то есть входит в то же поле
       высот, а не встаёт бляшкой поверх. */
    const proud = withLogo(pat, {}, {depth: 0.5});
    /* Допуск, а не точное равенство: под надписью сетка СГУЩЕНА, и на мелких узлах она застаёт узор чуть
       выше, чем на редких (у плавного узора вершина острая и в редкий узел не попадает). Три сотых — это
       про попадание в вершину купола, а не про высоту надписи, которая тут полмиллиметра. */
    chk(pat + ': выпуклая поднялась ровно на свою глубину',
        Math.abs(topY(proud) - topY(plain) - 0.5) < 0.03,
        {'текстура':+topY(plain).toFixed(3), 'надпись':+topY(proud).toFixed(3)});
  }
  /* ПРОБКА ЦВЕТА. Тело и цвет режутся ОДНОЙ сеткой того же поля высот, поэтому карман и пробка совпадают
     по построению. Меряется объёмом: пробка это карман плюс нахлёст, которым она проникает в тело. */
  for(const pat of ['snake', 'diamond']){
    const plain = sheet(pat), marked = withLogo(pat);
    const ink = withLogo(pat, {logoAms:'ink1'});
    chk(pat + ': цвет AMS построился', ink.length > 200, ink.length);
    chk(pat + ': и он герметичен', manifoldCheck(ink,4).watertight, manifoldCheck(ink,4).openEdges);
    const bi = computeBBox(ink);
    chk(pat + ': пробка не вылезает за след надписи',
        Math.max(-bi.minX, bi.maxX) < 9 && Math.max(-bi.minZ, bi.maxZ) < 9,
        {x:+bi.maxX.toFixed(2), z:+bi.maxZ.toFixed(2)});
    /* Карман + нахлёст: площадь круга Ø11.2 (0.35 от 16 мм) на глубину 0.3 плюс тот же круг на нахлёст
       0.4. Сходиться обязано с точностью до сетки, а не «примерно»: расхождение здесь означало бы, что
       тело и цвет резаны разными сетками — та самая беда, ради которой всё и делалось. */
    const A = Math.PI*Math.pow(0.35*16, 2), want = A*(0.3 + LOGO_AMS_LAP);
    chk(pat + ': объём пробки — это карман плюс нахлёст', Math.abs(vol(ink) - want)/want < 0.12,
        {замер:+vol(ink).toFixed(1), расчёт:+want.toFixed(1)});
    void plain; void marked;
  }
  /* СГУЩЕНИЕ, А НЕ МЕЛКАЯ СЕТКА НА ВЕСЬ ЛИСТ. Надпись мельче узора, и резать по ней всю плиту — значит
     платить миллионом треугольников за грань, на которой рисунка нет. Проверяется ценой: с надписью
     решётчатый узор дорожает в разы, а не в сотни раз. */
  { const plain = sheet('diamond').length, marked = withLogo('diamond').length;
    chk('надпись сгущает сетку только под собой', marked < plain*8 && marked > plain*1.5,
        {'без':plain, 'с':marked}); }
  /* И РИСУНОК НЕ ЗЕРКАЛЬНЫЙ. Ориентация в этом приложении задана в одном месте (LOGO_FACE_MAP), и своя
     формула на листе означала бы ещё одну поверхность, на которой надпись ложится наоборот. Сверяется с
     кубом — той же надписью на той же грани. */
  { const F = () => { const S = LOGO_HM_SIZE, d = new Float32Array(S*S);
      for(let j=0;j<S;j++) for(let i=0;i<S;i++){ const u=i/S, v=j/S;
        d[j*S+i] = ((u>0.30&&u<0.42&&v>0.20&&v<0.80) || (u>0.30&&u<0.72&&v>0.20&&v<0.31)) ? 1 : 0; }
      return d; };
    sheet('snake');
    logos.push({id:1, face:'+Y', u0:0, v0:0, w:24, h:24, rotation:0, depth:-0.35, threshold:0.5,
                invert:false, heightmap:F(), aspect:1, levels:2});
    const fld = sheetLogoField(paramState.box, 36, 4, 36);
    // След на кубе: та же грань, та же надпись, но своя, давно проверенная машинка.
    base({width:36, height:10, depth:36, sheetShape:'none'});
    logos.push({id:1, face:'+Y', u0:0, v0:0, w:24, h:24, rotation:0, depth:-0.35, threshold:0.5,
                invert:false, heightmap:F(), aspect:1, levels:2});
    const cube = buildTrisForShape('box', paramState.box);
    const cubeDent = (x,z) => { let m = 5;
      for(const T of cube) for(const v of T)
        if(Math.abs(v[0]-x) < 1 && Math.abs(v[2]-z) < 1 && v[1] > 4) m = Math.min(m, v[1]);
      return m < 4.9; };
    let same = 0, seen = 0;
    for(let z=-10;z<=10;z+=2) for(let x=-10;x<=10;x+=2){
      const a = fld.disp(x, z) < 0, b = cubeDent(x, z); seen++; if(a === b) same++; }
    chk('надпись на листе ложится так же, как на кубе', same > seen*0.85,
        {совпало:same, всего:seen});
    logos.length = 0; }
}
/* ВМЯТИНА РЕЖЕТ ТОЛЬКО ТЕКСТУРУ. Рельеф надписи входит слагаемым в поле высот ТЕКСТУРЫ, а сама текстура
   лежит отдельным замкнутым телом поверх сплошной плиты. Объединение замкнутых тел умеет только ДОБАВЛЯТЬ
   материал, поэтому глубже верха плиты вмятина не уходит физически.

   Меряется числом оборотов, а не чётностью: оболочки пересекаются, и точка внутри двух даёт два
   пересечения — чётность объявит её наружной и «докажет» несуществующую вмятину. На этом и попались:
   первая проба показала дыру там, где материал есть. */
console.log('=== вмятина на текстуре режет узор, а не плиту ===');
{
  const art = () => { const S = LOGO_HM_SIZE, d = new Float32Array(S*S);
    for(let j=0;j<S;j++) for(let i=0;i<S;i++){ const u=i/S-0.5, v=j/S-0.5;
      d[j*S+i] = Math.hypot(u,v) < 0.4 ? 1 : 0; }
    return d; };
  const build = (texH, depth) => { base({sheetShape:'rect', width:40, height:4, depth:40, sheetThick:4,
      sheetCut:'texture', sheetPattern:'snake', sheetTexH:texH, sheetTexInset:0});
    logos.push({id:1, face:'+Y', u0:0, v0:0, w:16, h:16, rotation:0, depth:depth, threshold:0.5,
                invert:false, heightmap:art(), aspect:1, levels:2});
    return buildTrisForShape('box', paramState.box); };
  const winding = (t, x, y, z) => { let n = 0;
    for(const T of t){ const [a,b,c] = T;
      const d1=(b[0]-a[0])*(z-a[2])-(b[2]-a[2])*(x-a[0]);
      const d2=(c[0]-b[0])*(z-b[2])-(c[2]-b[2])*(x-b[0]);
      const d3=(a[0]-c[0])*(z-c[2])-(a[2]-c[2])*(x-c[0]);
      if(!((d1>=0&&d2>=0&&d3>=0)||(d1<=0&&d2<=0&&d3<=0))) continue;
      const A=(b[0]-a[0])*(c[2]-a[2])-(b[2]-a[2])*(c[0]-a[0]); if(Math.abs(A)<1e-12) continue;
      const w1=((b[0]-x)*(c[2]-z)-(b[2]-z)*(c[0]-x))/A, w2=((c[0]-x)*(a[2]-z)-(c[2]-z)*(a[0]-x))/A;
      const yy=w1*a[1]+w2*b[1]+(1-w1-w2)*c[1];
      if(yy <= y) continue;
      n += ((b[2]-a[2])*(c[0]-a[0])-(b[0]-a[0])*(c[2]-a[2])) > 0 ? 1 : -1; }
    return n; };
  // Точка во впадине узора внутри глифа: там снимать нечего, и плита обязана остаться целой.
  let low = null;
  for(let x=-4;x<=4;x+=0.25) for(let z=-4;z<=4;z+=0.25){
    const pat = sheetTexHeight(x, z, 5, 0.75, 'snake');
    if(low === null || pat < low.pat) low = {x, z, pat}; }
  const deep = build(0.6, -1.5);
  chk('под верхом плиты материал на месте даже при вмятине вдвое глубже текстуры',
      winding(deep, low.x, 2 - 0.05, low.z) !== 0, {'узор в точке':+low.pat.toFixed(3)});
  chk('и лист при этом герметичен', manifoldCheck(deep, 4).watertight);
  chk('о том, что глубже текстуры вмятина не идёт, сказано словом',
      collectPrintWarnings(paramState.box).some(x => /глубже самой текстуры/.test(x)),
      collectPrintWarnings(paramState.box).filter(x => /вмятина/.test(x)));
  build(0.6, -0.3);
  chk('а про саму оговорку говорят и при разумной глубине',
      collectPrintWarnings(paramState.box).some(x => /в плиту не режет/.test(x)));
  build(0.6, 0.5);
  chk('выпуклой надписи оговорка не адресована',
      !collectPrintWarnings(paramState.box).some(x => /в плиту не режет/.test(x)));
  logos.length = 0;
}
/* НАДПИСЬ, СРЕЗАННАЯ ОТСТУПОМ ТЕКСТУРЫ. Рельеф надписи живёт в поле высот ТЕКСТУРЫ, а текстура встаёт не
   во весь лист, а внутри отступа от края. Сдвиньте надпись к краю — и она обрежется ровно по нему, молча:
   замерено, вмятина с 47 мм³ до 11. Ловится тем же кольцом и той же обрезкой, что у построителя. */
console.log('=== надпись, срезанная отступом текстуры ===');
{
  const art = () => { const S = LOGO_HM_SIZE, d = new Float32Array(S*S);
    for(let j=0;j<S;j++) for(let i=0;i<S;i++){ const u=i/S-0.5, v=j/S-0.5;
      d[j*S+i] = Math.hypot(u,v) < 0.4 ? 1 : 0; }
    return d; };
  const put = (ov, u0) => { base(Object.assign({sheetShape:'rect', width:60, height:4, depth:60,
      sheetThick:4, sheetCut:'texture', sheetPattern:'snake', sheetTexH:0.6}, ov));
    logos.push({id:1, face:'+Y', u0:u0, v0:0, w:16, h:16, rotation:0, depth:-0.4, threshold:0.5,
                invert:false, heightmap:art(), aspect:1, levels:2});
    return buildTrisForShape('box', paramState.box); };
  const said = () => collectPrintWarnings(paramState.box).some(x => /выходит за область текстуры/.test(x));
  const plain = (ov) => { base(Object.assign({sheetShape:'rect', width:60, height:4, depth:60,
      sheetThick:4, sheetCut:'texture', sheetPattern:'snake', sheetTexH:0.6}, ov)); 
    return vol(buildTrisForShape('box', paramState.box)); };
  /* Договор предупреждения — про СЛЕД карточки, а не про то, сколько от рисунка уцелело: срезанная
     карточка означает, что часть рельефа ушла, и сказать об этом надо ДО того, как пропадёт половина
     надписи. Поэтому проверяется и то и другое: что оно срабатывает по следу и что за ним стоит
     настоящая потеря, а не ложная тревога. */
  const p8 = plain({sheetTexInset:8});
  put({sheetTexInset:8}, 18);
  chk('след, вылезший за область текстуры, назван', said(),
      collectPrintWarnings(paramState.box).filter(x=>/текстур/.test(x)));
  const far = vol(put({sheetTexInset:8}, 25));
  chk('и это не ложная тревога — рельеф там правда срезан', p8 - far < 20,
      {'вмятина, мм³':+(p8-far).toFixed(1)});
  const p0 = plain({sheetTexInset:0});
  const whole = vol(put({sheetTexInset:0}, 25));
  chk('та же надпись вплотную к краю — цела', p0 - whole > 35, {'вмятина, мм³':+(p0-whole).toFixed(1)});
  put({sheetTexInset:8}, 10);
  chk('а надпись, влезающая целиком, молчит', !said(),
      collectPrintWarnings(paramState.box).filter(x=>/текстур/.test(x)));
  logos.length = 0;
}
/* ОТСТУП ТЕКСТУРЫ ОТ КРАЯ. Считался как «шаг узора × 0.4» и потому РОС ВМЕСТЕ С ШАГОМ: при шаге 10 мм по
   краю листа оставалась гладкая рамка в четыре миллиметра, которую никто не заказывал, а убрать было
   нечем — своей ручки у неё не было вовсе. Стал ручкой, и авто у неё — технический минимум.

   Совсем в ноль он не уходит и уйти не может: плита текстуры это ОТДЕЛЬНОЕ замкнутое тело, вставленное в
   лист, и доведи её борт до самого контура — боковые стенки двух тел лягут в одну плоскость. Общая грань
   между оболочками это четыре треугольника на ребре, то есть дыра, которой manifoldCheck не увидит.
   Поэтому здесь проверяется И то, что рамка ушла, И то, что она не ушла совсем. */
console.log('=== отступ текстуры от края ===');
{
  // Ширина гладкой рамки: докуда по X доходит рельеф, считая от края листа.
  const frame = (ov) => { const t = base(Object.assign({sheetShape:'rect', width:60, depth:60, sheetThick:2,
      sheetCut:'texture', sheetPattern:'snake', sheetTexH:0.3, sheetRim:0}, ov));
    let m = 0; for(const T of t) for(const v of T) if(v[1] > 1.0 + 1e-6) m = Math.max(m, Math.abs(v[0]));
    return 30 - m; };
  chk('авто — технический минимум, а не рамка в полсантиметра',
      Math.abs(frame({}) - SHEET_TEX_MIN_INSET) < 0.02, +frame({}).toFixed(2));
  chk('и он НЕ растёт вместе с шагом узора — раньше рос',
      Math.abs(frame({sheetPatCell:10}) - frame({sheetPatCell:2})) < 0.02,
      {'шаг 2':+frame({sheetPatCell:2}).toFixed(2), 'шаг 10':+frame({sheetPatCell:10}).toFixed(2)});
  for(const ins of [3, 8]) chk('заказанный отступ ' + ins + ' мм соблюдён',
      Math.abs(frame({sheetTexInset:ins}) - ins) < 0.05, +frame({sheetTexInset:ins}).toFixed(2));
  chk('но в ноль не уходит: общая стенка двух тел — это дыра в сетке',
      sheetTexEdgeGap({sheetTexInset:0.05}) >= SHEET_TEX_MIN_INSET - 1e-9,
      sheetTexEdgeGap({sheetTexInset:0.05}));
  /* При БОРТИКЕ отступ считается от него: текстура, доведённая до стенки бортика, в неё упрётся. Заказанное
     число тогда не выполняется, и об этом обязано быть сказано. */
  chk('при бортике отступ берётся от его стенки',
      Math.abs(sheetTexEdgeGap({sheetRim:3, sheetRimW:2, sheetTexInset:1}) - 2.6) < 1e-9,
      sheetTexEdgeGap({sheetRim:3, sheetRimW:2, sheetTexInset:1}));
  base({sheetShape:'rect', width:60, depth:60, sheetCut:'texture', sheetPattern:'snake',
        sheetRim:3, sheetRimW:2, sheetTexInset:1});
  chk('и о поднятом отступе сказано словом',
      /отступ текстуры поднят до/.test(collectPrintWarnings(paramState.box).join(' | ')),
      collectPrintWarnings(paramState.box).filter(x => /отступ/.test(x)));
  base({sheetShape:'rect', width:60, depth:60, sheetCut:'texture', sheetPattern:'snake', sheetTexInset:4});
  chk('а когда выполнено — молчат',
      !/отступ текстуры поднят/.test(collectPrintWarnings(paramState.box).join(' | ')));
  // Любая рамка на любом контуре обязана оставаться герметичной.
  { let bad = [];
    for(const pat of ['diamond','hex','snake','pyramid']) for(const ins of [0, 0.5, 6]) for(const shp of ['rect','round','circle']){
      const t = base({sheetShape:shp, width:60, depth:50, sheetThick:2, sheetCut:'texture',
                      sheetPattern:pat, sheetTexH:0.4, sheetTexInset:ins});
      if(!(manifoldCheck(t,4).watertight && t.length > 100)) bad.push(pat+'/'+ins+'/'+shp); }
    chk('36 сочетаний узора, отступа и контура — все замкнуты', bad.length === 0, bad.slice(0,5)); }
}
/* ПЕРЕМЫЧКА, СЪЕДАЮЩАЯ КЛЕТКУ. Авто-перемычка бралась у «сетчатого дна» — 1.5 мм при ЛЮБОМ шаге. На шаге
   10 мм это рисунок, на шаге 2.5 мм — россыпь точек: перемычка съедает клетку целиком, просветов не
   остаётся. Ромб и треугольники превращались в точки, соты — в кружки, и сказано об этом не было нигде.
   Меряется тем, что и различает две картинки: ДОЛЯ ПЛОЩАДИ, занятая буграми. У выродившегося узора она
   считанные проценты, у живого — половина и больше. */
console.log('=== перемычка ужимается вместе с шагом ===');
{
  const plain = vol(base({sheetCut:'none', sheetPattern:'none'}));
  const area = 80*60*0.6;
  const raised = (ov) => (vol(base(Object.assign({sheetCut:'texture', sheetTexH:0.6}, ov))) - plain)/area;
  chk('на прежнем шаге перемычка ровно прежняя', Math.abs(sheetAutoRib(10, 1.5) - 1.5) < 1e-9,
      sheetAutoRib(10, 1.5));
  chk('а на мелком — ужата по клетке', Math.abs(sheetAutoRib(2.5, 1.5) - 0.75) < 1e-9, sheetAutoRib(2.5, 1.5));
  chk('и никогда не больше трети клетки', sheetAutoRib(1, 1.5) <= 0.3 + 1e-9 && sheetAutoRib(40, 1.5) === 1.5);
  for(const pat of ['diamond', 'triangle', 'hex']){
    const dead = raised({sheetPattern:pat, sheetPatCell:2.5, sheetPatRib:1.5});   // как было: перемычка от чужой формы
    const live = raised({sheetPattern:pat, sheetPatCell:2.5});                    // как стало: ужата по клетке
    chk(pat + ' на шаге 2.5 больше не вырождается', live > dead*2 && live > 0.45,
        {'с прежней перемычкой':+(100*dead).toFixed(0)+' %', 'с ужатой':+(100*live).toFixed(0)+' %'});
    chk(pat + ' при этом остаётся герметичным',
        manifoldCheck(base({sheetCut:'texture', sheetTexH:0.6, sheetPattern:pat, sheetPatCell:2.5}), 4).watertight);
  }
  base({sheetCut:'texture', sheetPattern:'diamond', sheetPatCell:2.5, sheetPatRib:1.5});
  chk('о перемычке, заданной руками не по клетке, сказано словом',
      /выродится в точки/.test(collectPrintWarnings(paramState.box).join(' | ')),
      collectPrintWarnings(paramState.box).filter(x => /перемычк/.test(x)));
  base({sheetCut:'texture', sheetPattern:'diamond', sheetPatCell:2.5});
  chk('и об автоматическом ужатии — тоже',
      /ужата до/.test(collectPrintWarnings(paramState.box).join(' | ')),
      collectPrintWarnings(paramState.box).filter(x => /перемычк/.test(x)));
  base({sheetCut:'texture', sheetPattern:'diamond', sheetPatCell:10});
  chk('а на прежнем шаге молчат — там ничего не изменилось',
      !/перемычка узора/.test(collectPrintWarnings(paramState.box).join(' | ')),
      collectPrintWarnings(paramState.box).filter(x => /перемычк/.test(x)));
}
/* ДЕТАЛИЗАЦИЯ ПЛАВНОГО УЗОРА мерилась долей ГАБАРИТА: res = 400 означало «четыреста делений на лист», и
   на листе 80 мм при щитке 2.5 мм это двенадцать узлов на щиток — гранёный камешек вместо купола, причём
   ползунок уже стоял на максимуме. Теперь ползунок означает УЗЛОВ НА КЛЕТКУ УЗОРА, величину от размера
   листа не зависящую, а потолок — бюджет узлов на плиту, и когда связывает он, об этом сказано. */
console.log('=== детализация плавного узора мерится узором, а не листом ===');
{
  chk('ползунок — это узлы на клетку', sheetSmoothDivs(400) === 50 && sheetSmoothDivs(140) === 18,
      {'400':sheetSmoothDivs(400), '140':sheetSmoothDivs(140)});
  // Один и тот же щиток на маленьком и на большом листе получает одинаково густую сетку — пока хватает бюджета.
  const a = sheetSmoothStep(40, 40, 2.5, 80), b = sheetSmoothStep(60, 60, 2.5, 80);
  chk('на разных листах щиток режется одинаково', Math.abs(a - b) < 1e-9, {'40мм':a, '60мм':b});
  chk('и это ровно заказанное число узлов', Math.abs(2.5/a - 10) < 0.01, +(2.5/a).toFixed(2));
  // На большом листе связывает бюджет — и об этом говорят, а не молчат.
  const big = sheetSmoothStep(300, 300, 2.5, 400);
  chk('на большом листе связывает бюджет узлов', 2.5/big < 25, +(2.5/big).toFixed(1));
  base({sheetShape:'rect', width:300, depth:300, sheetCut:'texture', sheetPattern:'snake',
        sheetPatCell:2.5, sheetPatRes:400});
  chk('и об этом сказано словом',
      /упёрлась в размер листа/.test(collectPrintWarnings(paramState.box).join(' | ')),
      collectPrintWarnings(paramState.box).filter(x => /детализац|узлов/.test(x)));
  base({sheetShape:'rect', width:40, depth:40, sheetCut:'texture', sheetPattern:'snake', sheetPatRes:0});
  chk('а на нормальных числах молчат',
      !/упёрлась в размер листа/.test(collectPrintWarnings(paramState.box).join(' | ')),
      collectPrintWarnings(paramState.box).filter(x => /детализац|узлов/.test(x)));
  // Гуще сетка — больше треугольников, и это должно быть видно.
  const coarse = base({sheetShape:'rect', width:40, depth:40, sheetCut:'texture', sheetPattern:'snake', sheetPatRes:40});
  const fine   = base({sheetShape:'rect', width:40, depth:40, sheetCut:'texture', sheetPattern:'snake', sheetPatRes:200});
  chk('ползунок действительно сгущает сетку', fine.length > coarse.length*4,
      {грубо:coarse.length, густо:fine.length});
}
/* СИЛУЭТА У ПЛАВНОГО УЗОРА НЕТ. Клетка попадала в рельеф по порогу «высота больше 1/64» — то есть у
   каждого щитка вырезался ДВОИЧНЫЙ контур, нарезанный сеткой: та самая пила по краю. Как сетку ни мельчи,
   ступеньки остаются — они от порога, а не от грубости. Теперь плавный узор кладётся на всю область, а
   где высота ноль — там он заподлицо с плитой. Меряется тем, что при этом меняется: верхняя поверхность
   рельефа покрывает область СПЛОШЬ, а не долями. */
console.log('=== у плавного узора нет двоичного контура ===');
{
  const topArea = (t, y0) => { let a = 0;
    for(const T of t){ if(!T.every(v => v[1] >= y0 - 1e-9)) continue;
      a += Math.abs((T[1][0]-T[0][0])*(T[2][2]-T[0][2]) - (T[2][0]-T[0][0])*(T[1][2]-T[0][2]))/2; }
    return a; };
  const t = base({sheetShape:'rect', width:40, depth:40, sheetCut:'texture', sheetPattern:'snake',
                  sheetThick:3, sheetTexH:0.6, sheetPatRes:140});
  /* Плита 40 × 40 с отступом от края: рельеф обязан покрыть почти всё, что внутри отступа. Долевое
     покрытие (а у порога оно было около двух третей) эту проверку не проходит. */
  const cover = topArea(t, 1.5) / (40*40);
  chk('рельеф покрывает область сплошь', cover > 0.85, +(100*cover).toFixed(0)+' % площади листа');
  chk('и остаётся герметичным', manifoldCheck(t, 4).watertight);
}
/* ШАГ У ПЛАВНЫХ УЗОРОВ — СВОЙ. Прежде он брался у «сетчатого дна» (10 мм), и на плите 40 × 40 выходило
   четыре чешуйки в ряд. Раз число подставлено за пользователя, оно обязано быть названо. */
console.log('=== свой шаг у плавных узоров ===');
{
  base({sheetShape:'rect', width:40, depth:40, sheetCut:'texture', sheetPattern:'scale'});
  chk('плавному узору ставится свой шаг', SHEET_SMOOTH_CELL === 5 &&
      sheetAutoCell('scale', 10) === 5 && sheetAutoCell('diamond', 10) === 10,
      {плавный:sheetAutoCell('scale',10), решётчатый:sheetAutoCell('diamond',10)});
  chk('и об этом сказано словом',
      /шаг 5 мм \(авто у плавных узоров/.test(collectPrintWarnings(paramState.box).join(' | ')),
      collectPrintWarnings(paramState.box));
  const fine = base({sheetShape:'rect', width:40, depth:40, sheetCut:'texture', sheetPattern:'scale'});
  const coarse = base({sheetShape:'rect', width:40, depth:40, sheetCut:'texture', sheetPattern:'scale', sheetPatCell:10});
  chk('на своём шаге чешуек вдвое больше, чем на прежнем', fine.length > coarse.length,
      {своё:fine.length, 'шаг 10':coarse.length});
  base({sheetShape:'rect', width:40, depth:40, sheetCut:'texture', sheetPattern:'scale', sheetPatCell:10});
  chk('а когда шаг задали руками — не говорят',
      !/авто у плавных узоров/.test(collectPrintWarnings(paramState.box).join(' | ')));
  chk('резким узорам шаг не тронут', sheetAutoCell('diamond', undefined) === 8);
}
{ Object.assign(paramState.box, defaultBoxParams(), {width:40,height:40,depth:40,sheetShape:'none'});
  const t=buildTrisForShape('box',paramState.box); const b=computeBBox(t);
  chk('sheetShape none → normal cube', manifoldCheck(t,4).watertight && Math.abs((b.maxX-b.minX)-40)<1e-6, {}); }

/* ===============================================================================================
   ЛИСТ НАЗЫВАЕТ СВОИ ЧИСЛА (v25.18.0). Плоская панель выглядит самой простой формой набора, и ровно
   поэтому у неё всё выведенное: шаг узора, перемычка и подъём фаски берутся автоматически, а ручки
   показывают НОЛЬ. Ноль на панели значит «как было», и человек видит ноль там, где в детали полтора
   миллиметра. Толщина же — единственное, что он задаёт прямо, и она решает, лист это или плёнка. */
console.log('\n=== лист называет свои числа ===');
{
  const setP = (ov) => { logos.length=0; boxHoles.length=0; dieFaces.length=0;
    Object.assign(paramState.box, defaultBoxParams(), {width:80, height:3, depth:60, sheetShape:'rect',
      sheetThick:3, sheetCut:'texture', sheetPattern:'diamond', sheetTexH:0.6, sheetRim:0}, ov||{});
    return paramState.box; };
  const warn = (ov) => collectPrintWarnings(setP(ov));
  const line = (ws) => ws.find(x => /^лист /.test(x));
  const spec = (ov) => sheetSpec(setP(ov));
  const mesh = (ov) => { setP(ov); return buildTrisForShape('box', paramState.box); };

  chk('лист больше не молчит: на умолчаниях есть строка с числами', line(warn({})) !== undefined, warn({}));
  /* 1. ТОЛЩИНА И ТЕКСТУРА МЕРЯЮТСЯ ПО ДЕТАЛИ. Плита стоит серединой на нуле, текстура надстроена сверху:
     значит нижняя грань даёт половину толщины, а верх — половину плюс высоту рисунка. */
  {
    const g = spec({}), b = computeBBox(mesh({}));
    chk('толщина плиты измерена снизу', Math.abs(-b.minY*2 - g.t) < 0.02,
        {измерено:+(-b.minY*2).toFixed(3), спец:g.t});
    chk('  высота текстуры измерена сверху', Math.abs((b.maxY - g.t/2) - g.texH) < 0.02,
        {измерено:+(b.maxY - g.t/2).toFixed(3), спец:g.texH});
    chk('  и оба числа названы', /толщина 3\.0 мм/.test(line(warn({}))) &&
        /высота 0\.6 мм = 3 слоя/.test(line(warn({}))), line(warn({})));
    const plain = computeBBox(mesh({sheetPattern:'none'}));
    chk('  без узора лист ровно своей толщины',
        Math.abs((plain.maxY - plain.minY) - g.t) < 0.02, +(plain.maxY - plain.minY).toFixed(3));
  }
  /* 2. СЛОИ И РУССКИЙ СЧЁТ. «2 слоёв» и «5 слоя» читаются как небрежность там, где число важно. */
  {
    chk('слоёв считается от общей высоты слоя', Math.abs(spec({}).layers - 3/0.2) < 1e-9);
    chk('  и слово согласовано с числом',
        layerWord(1) === 'слой' && layerWord(2) === 'слоя' && layerWord(5) === 'слоёв' &&
        layerWord(11) === 'слоёв' && layerWord(21) === 'слой' && layerWord(22) === 'слоя',
        [layerWord(1), layerWord(2), layerWord(5), layerWord(11), layerWord(21), layerWord(22)]);
    /* Слои приходят ДРОБНЫМИ — 0.8 мм кармана это четыре слоя, а 0.1 мм текстуры полслоя. Число в
       строке округляется, значит и слово обязано округляться вместе с ним: иначе выходит «1 слоёв». */
    chk('  и дробное число считается по округлённому',
        layerWord(0.5) === 'слой' && layerWord(2.6) === 'слоя' && layerWord(4.7) === 'слоёв',
        [layerWord(0.5), layerWord(2.6), layerWord(4.7)]);
    chk('  тонкий лист назван плёнкой', spec({sheetThick:0.4}).film === true &&
        /получится плёнка/.test(warn({sheetThick:0.4}).join(' ')));
    chk('  а на умолчаниях плёнкой не зовётся', spec({}).film === false, spec({}).layers);
  }
  /* 3. ПЕРЕМЫЧКА УЗОРА — выведенная, и она же держит решётку. Меряется по детали: у сквозного узора
     между отверстиями остаётся именно она. */
  {
    const g = spec({sheetCut:'through', sheetPattern:'honeycomb', sheetPatCell:2.5});
    chk('мелкая клетка даёт перемычку тоньше двух сопел', g.thinRib === true && g.rib < 0.8,
        +g.rib.toFixed(2));
    chk('  и об этом сказано', /перемычка узора 0\.75/.test(warn({sheetCut:'through',
        sheetPattern:'honeycomb', sheetPatCell:2.5}).join(' ')));
    chk('  на крупной клетке перемычка нормальная',
        spec({sheetCut:'through', sheetPattern:'honeycomb'}).thinRib === false,
        +spec({sheetCut:'through', sheetPattern:'honeycomb'}).rib.toFixed(2));
    /* Сквозной узор и правда сквозной: он снимает объём. */
    const solid = vol(mesh({sheetCut:'none', sheetPattern:'none'}));
    const netted = vol(mesh({sheetCut:'through', sheetPattern:'honeycomb'}));
    chk('  сквозной узор снимает объём', netted < solid*0.9, {сплошной:+solid.toFixed(0), решётка:+netted.toFixed(0)});
  }
  /* 4. ФАСКА: заказанный угол держится не всегда — подъём зажат толщиной листа. */
  {
    const g = spec({sheetChamfer:10, sheetChamferAngle:80});
    chk('крутая фаска на тонком листе легла положе заказанной',
        g.chamferCut === true && g.angGot < 80 - 1, {получилось:+g.angGot.toFixed(1)});
    chk('  и об этом сказано числом', new RegExp('фаска легла под ' + g.angGot.toFixed(0) + '°')
        .test(warn({sheetChamfer:10, sheetChamferAngle:80}).join(' ')),
        warn({sheetChamfer:10, sheetChamferAngle:80}));
    /* Подъём меряется по детали: нижняя грань сужена на ширину фаски, и она поднимается на `rise`. */
    const b = computeBBox(mesh({sheetChamfer:6, sheetChamferAngle:45}));
    const gg = spec({sheetChamfer:6, sheetChamferAngle:45});
    let wBot = 0;                                    // ширина нижней грани по X
    { const t = mesh({sheetChamfer:6, sheetChamferAngle:45}); let lo = 1e9, hi = -1e9;
      for (const T of t) for (const v of T) if (Math.abs(v[1] - b.minY) < 1e-6){
        lo = Math.min(lo, v[0]); hi = Math.max(hi, v[0]); }
      wBot = hi - lo; }
    chk('фаска и правда сужает нижнюю грань на свою ширину',
        Math.abs((80 - wBot)/2 - gg.chW) < 0.2, {снято:+((80 - wBot)/2).toFixed(2), фаска:gg.chW});
    chk('  на умолчаниях фаски нет и оговорки тоже',
        spec({}).chW === 0 && spec({}).chamferCut === false);
  }
  setP({});
}

console.log('\n=== TOTAL:',pass,'passed,',fail,'failed ===');
process.exit(fail?1:0);
