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
  for(const pat of ['diamond','square','triangle','hex','brick','stripe','dots','checker','weave','knurl','pyramid','scale','wave']){
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
  for(const pat of ['stripe','dots','checker','weave','knurl','pyramid','scale','wave']){
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
  for(const pat of ['knurl','pyramid','scale','wave']){
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
  const coarse = base({sheetCut:'texture',sheetPattern:'pyramid',sheetTexH:0.8,sheetPatRes:40});
  const fine   = base({sheetCut:'texture',sheetPattern:'pyramid',sheetTexH:0.8,sheetPatRes:200});
  chk('выше детализация — больше ступеней', heights(fine) > heights(coarse) + 20,
      {грубо:heights(coarse), густо:heights(fine)});
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
  for(const pat of ['diamond','square','brick','knurl','wave']){
    const wide = period(pat, 20), tight = period(pat, 5);
    chk(pat+': мельче шаг — чаще рисунок', tight > 1.4*wide && wide > 0, {шаг20:wide, шаг5:tight});
  }
  /* Ровно вчетверо частить умеет не всякий узор: у решётчатых перемычка задана в МИЛЛИМЕТРАХ, и на мелком
     шаге она съедает свою же клетку — у ромба выходит вдвое, а не вчетверо. У накатки перемычек нет
     вовсе, поэтому на ней период обязан идти строго обратно шагу, и это проверяется отдельно. */
  { const a = period('knurl', 20), b = period('knurl', 5);
    chk('у накатки период строго обратен шагу', Math.abs(b/a - 4) < 0.15, {шаг20:a, шаг5:b, отношение:+(b/a).toFixed(2)}); }
  for(const cell of [3, 25]) for(const pat of ['diamond','scale']){
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
{ Object.assign(paramState.box, defaultBoxParams(), {width:40,height:40,depth:40,sheetShape:'none'});
  const t=buildTrisForShape('box',paramState.box); const b=computeBBox(t);
  chk('sheetShape none → normal cube', manifoldCheck(t,4).watertight && Math.abs((b.maxX-b.minX)-40)<1e-6, {}); }

console.log('\n=== TOTAL:',pass,'passed,',fail,'failed ===');
process.exit(fail?1:0);
