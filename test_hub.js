// Ступица: посадка печатной детали на ВАЛ.
//
// Шкивы, шестерни и кулачки в приложении были давно, а насаживать их было не на что: `gearBore` — гладкий
// круг, который проворачивается. Вся модель держится на одной функции r(θ) (`shaftBoreRadiusAt`), и у неё
// два способа соврать так, что на картинке ничего не видно.
//
//   1. СРЕЗАННЫЕ УГЛЫ. Между двумя соседними углами выборки поверхность строится хордой. Угол
//      шестигранника, не попавший в сетку, срезается — и отверстие становится ТЕСНЕЕ заказанного ровно
//      там, где вал опирается. На глаз это сотые доли миллиметра, на валу это непосадка. Поэтому здесь
//      измеряется не «похоже ли на шестигранник», а точный радиус в самом углу — и сверх того строится
//      кольцо с ЗАВЕДОМО слепой выборкой, чтобы было видно, что разница есть и в какую сторону.
//
//   2. СКЛЕЕННЫЕ ГРАНИ. Проушины разрезной ступицы стоят вплотную к срезу кольца. Совпади их плоскости —
//      получилось бы две одинаковые грани двух оболочек, четыре треугольника на ребре, и manifoldCheck,
//      который считает рёбра, а не грани, назвал бы это водонепроницаемым. Прорезь в кольце поэтому шире
//      рабочей щели, и это проверяется ЗАМЕРОМ обеих: щель между проушинами и просвет в кольце — разные
//      числа, и badEdges обязан быть нулём.
//
// Всё остальное — обычная арифметика, которую нельзя увидеть в превью: зазор посадки (он НА СТОРОНУ),
// момент до среза выступа, и все места, где генератор что-то поднял или зажал и обязан об этом сказать.
// Запускать через ./run-all.sh.
let pass=0, fail=0;
function chk(n,c,e){if(c){pass++;console.log('  OK  ',n);}else{fail++;console.log('  FAIL',n,e!==undefined?JSON.stringify(e):'');}}

function setp(ov){ logos.length=0; boxHoles.length=0; dieFaces.length=0;
  Object.assign(paramState.box, defaultBoxParams(), {gfBaseplate:false, mntMode:'hub'}, ov); return paramState.box; }
const mk = ov => buildTrisForShape('box', setp(ov));
const spec = ov => hubSpec(setp(ov));

// Интервалы МАТЕРИАЛА вдоль оси `ax` на прямой (p,q) — по знаковым пересечениям, а не по чётности:
// деталь собрана из ПЕРЕСЕКАЮЩИХСЯ оболочек, и чётность на них врёт (точка внутри двух тел даёт два
// пересечения и читается как наружная).
function solidRuns(tris, ax, p, q){
  const u=(ax+1)%3, v=(ax+2)%3, hits=[];
  for(const T of tris){ const [a,b,c]=T;
    const d1=(b[u]-a[u])*(q-a[v])-(b[v]-a[v])*(p-a[u]);
    const d2=(c[u]-b[u])*(q-b[v])-(c[v]-b[v])*(p-b[u]);
    const d3=(a[u]-c[u])*(q-c[v])-(a[v]-c[v])*(p-c[u]);
    if(!((d1>=0&&d2>=0&&d3>=0)||(d1<=0&&d2<=0&&d3<=0))) continue;
    const A=(b[u]-a[u])*(c[v]-a[v])-(b[v]-a[v])*(c[u]-a[u]); if(Math.abs(A)<1e-12) continue;
    const w1=((b[u]-p)*(c[v]-q)-(b[v]-q)*(c[u]-p))/A, w2=((c[u]-p)*(a[v]-q)-(c[v]-q)*(a[u]-p))/A;
    const e1=[b[0]-a[0],b[1]-a[1],b[2]-a[2]], e2=[c[0]-a[0],c[1]-a[1],c[2]-a[2]];
    const nrm=[e1[1]*e2[2]-e1[2]*e2[1], e1[2]*e2[0]-e1[0]*e2[2], e1[0]*e2[1]-e1[1]*e2[0]];
    if(Math.abs(nrm[ax])<1e-12) continue;
    hits.push([w1*a[ax]+w2*b[ax]+(1-w1-w2)*c[ax], nrm[ax]<0 ? 1 : -1]);
  }
  hits.sort((A,B)=>A[0]-B[0]);
  const runs=[]; let depth=0, start=null;
  for(const [t0,d] of hits){ const prev=depth; depth+=d;
    if(prev<=0 && depth>0) start=t0;
    else if(prev>0 && depth<=0){ if(start!==null && t0-start > 1e-6) runs.push([start,t0]); start=null; } }
  return runs;
}
// Где на луче из оси (в плоскости X-Z, на высоте y) начинается материал — это и есть радиус отверстия.
function boreEdge(tris, ax, sign, other, y){
  const runs = ax===0 ? solidRuns(tris, 0, y, other) : solidRuns(tris, 2, other, y);
  const inner = [];
  for(const [a,b] of runs){ if(sign>0 && a> 1e-9) inner.push(a); if(sign<0 && b< -1e-9) inner.push(-b); }
  return inner.length ? Math.min.apply(null, inner) : null;
}

console.log('=== водонепроницаемость: все профили, оба исполнения ===');
for(const shape of SHAFT_SHAPES) for(const style of HUB_STYLES){
  const ov = {hubShaft:shape, hubStyle:style};
  if(style==='plain') ov.hubFlange = 40;
  const t = mk(ov), m = manifoldCheck(t, 4);
  chk(shape+'/'+style+': рёбра спарены', m.openEdges===0, m.openEdges);
  // Четыре треугольника на ребре — след СКЛЕЕННЫХ совпадающих граней. Открытых рёбер при этом нет, и
  // поймать это можно только здесь.
  chk(shape+'/'+style+': склеенных граней нет', m.badEdges===0, m.badEdges);
  chk(shape+'/'+style+': тело непустое', t.length > 200, t.length);
}
for(const ov of [{hubOD:6}, {hubH:4}, {mntScrewD:0}, {mntScrewD:12}, {hubSlit:3}, {hubClear:0},
                 {hubShaftD:40, hubOD:80}, {hubShaft:'spline', hubSplineN:20},
                 {hubShaft:'spline', hubSplineN:1}, {hubStyle:'plain', hubFlange:1},
                 {hubStyle:'plain', hubFlange:120, hubBoltD:10}]){
  const m = manifoldCheck(mk(ov), 4);
  chk('край диапазона '+JSON.stringify(ov)+': водонепроницаемо', m.openEdges===0 && m.badEdges===0, m);
}

console.log('=== профиль отверстия — тот, что заказан ===');
{
  // Глухая ступица без фланца: тело — ровное кольцо, и всё, что меряется в его середине, — это отверстие.
  const base = {hubStyle:'plain', hubShaftD:8, hubOD:24, hubH:12, hubClear:0.2};
  {
    const s = spec(Object.assign({}, base, {hubShaft:'round'})), t = mk(Object.assign({}, base, {hubShaft:'round'}));
    chk('круг: радиус = Ø/2 + зазор', Math.abs(s.bore.R - (4+0.2)) < 1e-9, s.bore.R);
    for(const [ax,sg] of [[0,1],[0,-1],[2,1],[2,-1]])
      chk('круг: замер по оси '+ax+' знак '+sg, Math.abs(boreEdge(t,ax,sg,0,0) - s.bore.R) < 0.02, boreEdge(t,ax,sg,0,0));
  }
  {
    const ov = Object.assign({}, base, {hubShaft:'dflat', hubFlat:1});
    const s = spec(ov), t = mk(ov);
    // Лыска смотрит в +Z (SHAFT_FLAT_A): по +Z до плоскости F, по −Z и по обеим сторонам X — круг R.
    chk('лыска: F = Ø/2 − глубина + зазор', Math.abs(s.bore.F - (4-1+0.2)) < 1e-9, s.bore.F);
    chk('лыска: по +Z упирается в плоскость', Math.abs(boreEdge(t,2,1,0,0) - s.bore.F) < 0.02, boreEdge(t,2,1,0,0));
    chk('лыска: по −Z остаётся круг', Math.abs(boreEdge(t,2,-1,0,0) - s.bore.R) < 0.02, boreEdge(t,2,-1,0,0));
    chk('лыска: по X остаётся круг', Math.abs(boreEdge(t,0,1,0,0) - s.bore.R) < 0.02, boreEdge(t,0,1,0,0));
    // Плоская она и есть плоская: край материала не зависит от того, где по X мерить.
    const e1 = boreEdge(t,2,1,0,0), e2 = boreEdge(t,2,1,1.5,0);
    chk('лыска: край не зависит от X (это плоскость)', Math.abs(e1-e2) < 0.01, [e1,e2]);
  }
  {
    const ov = Object.assign({}, base, {hubShaft:'dflat2', hubFlat:1});
    const t = mk(ov), s = spec(ov);
    chk('две лыски: по +Z плоскость', Math.abs(boreEdge(t,2,1,0,0) - s.bore.F) < 0.02, boreEdge(t,2,1,0,0));
    chk('две лыски: по −Z тоже плоскость', Math.abs(boreEdge(t,2,-1,0,0) - s.bore.F) < 0.02, boreEdge(t,2,-1,0,0));
    chk('две лыски: по X круг', Math.abs(boreEdge(t,0,1,0,0) - s.bore.R) < 0.02, boreEdge(t,0,1,0,0));
  }
  {
    const ov = Object.assign({}, base, {hubShaft:'hex'});
    const s = spec(ov), t = mk(ov);
    chk('шестигранник: «Ø вала» читается под ключ', Math.abs(s.bore.F - (4+0.2)) < 1e-9, s.bore.F);
    chk('шестигранник: R = F/cos30', Math.abs(s.bore.R - s.bore.F/Math.cos(Math.PI/6)) < 1e-9, s.bore.R);
    chk('шестигранник: грань по +X', Math.abs(boreEdge(t,0,1,0,0) - s.bore.F) < 0.02, boreEdge(t,0,1,0,0));
    chk('шестигранник: угол по +Z', Math.abs(boreEdge(t,2,1,0,0) - s.bore.R) < 0.02, boreEdge(t,2,1,0,0));
  }
  {
    const ov = Object.assign({}, base, {hubShaft:'square'});
    const s = spec(ov), t = mk(ov);
    chk('квадрат: грань по +X', Math.abs(boreEdge(t,0,1,0,0) - s.bore.F) < 0.02, boreEdge(t,0,1,0,0));
    chk('квадрат: грань по +Z', Math.abs(boreEdge(t,2,1,0,0) - s.bore.F) < 0.02, boreEdge(t,2,1,0,0));
  }
  {
    const ov = Object.assign({}, base, {hubShaft:'spline', hubSplineN:6, hubSplineW:1.4, hubSplineD:1});
    const s = spec(ov), t = mk(ov);
    chk('шлицы: паз по +X уходит на глубину', Math.abs(boreEdge(t,0,1,0,0) - (s.bore.R + s.bore.sd)) < 0.02, boreEdge(t,0,1,0,0));
    chk('шлицы: между пазами круг', Math.abs(boreEdge(t,2,1,0,0) - s.bore.R) < 0.02, boreEdge(t,2,1,0,0));
    // Ширина паза: на дне (радиус R+sd) он ровно такой, каким заказан.
    const runs = solidRuns(t, 2, s.bore.R + s.bore.sd - 0.05, 0);
    const gap = runs.filter(r => r[0] < 0 && r[1] > 0).length ? 0
              : (Math.min.apply(null, runs.filter(r=>r[0]>0).map(r=>r[0]).concat([1e9]))
                 + Math.min.apply(null, runs.filter(r=>r[1]<0).map(r=>-r[1]).concat([1e9])));
    chk('шлицы: ширина паза выдержана', Math.abs(gap - s.bore.sw) < 0.05, [gap, s.bore.sw]);
    chk('шпоночный паз — это шлиц с n = 1', spec(Object.assign({}, ov, {hubSplineN:1})).bore.n === 1);
  }
}

console.log('=== зазор посадки — НА СТОРОНУ ===');
{
  const base = {hubStyle:'plain', hubShaft:'round', hubShaftD:8, hubOD:24};
  const a = spec(Object.assign({}, base, {hubClear:0})), b = spec(Object.assign({}, base, {hubClear:0.3}));
  chk('без зазора отверстие равно валу', Math.abs(a.bore.R - 4) < 1e-9, a.bore.R);
  chk('зазор 0.3 расширяет радиус на 0.3', Math.abs(b.bore.R - a.bore.R - 0.3) < 1e-9, b.bore.R - a.bore.R);
  const ta = mk(Object.assign({}, base, {hubClear:0})), tb = mk(Object.assign({}, base, {hubClear:0.3}));
  chk('и это видно в сетке', Math.abs((boreEdge(tb,0,1,0,0) - boreEdge(ta,0,1,0,0)) - 0.3) < 0.02,
      [boreEdge(ta,0,1,0,0), boreEdge(tb,0,1,0,0)]);
}

console.log('=== изломы профиля попадают в сетку точно ===');
{
  // Прямое сравнение: то же кольцо, но выборка РАВНОМЕРНАЯ, без углов. Слепая срезает угол хордой и делает
  // отверстие теснее — ровно то, ради чего shaftBoreAngles и существует.
  const s = shaftBoreSpec(setp({hubShaft:'hex', hubShaftD:8, hubClear:0.2}));
  // 50 делений намеренно: при 60 шаг 6° и угол 30° попал бы в равномерную сетку сам собой,
  // а тогда сравнивать было бы нечего.
  const seg = 50, TAU = 2*Math.PI;
  const blind = []; for(let k=0;k<seg;k++) blind.push(TAU*k/seg);
  const smart = shaftBoreAngles(s, seg, 0, TAU);
  const rMaxOf = angs => { let m = 0; for(const T of boreRingYTris(12, a=>shaftBoreRadiusAt(a,s), 0, 5, angs, true))
    for(const v of T){ const r = Math.hypot(v[0], v[2]); if(r < 11 && r > m) m = r; } return m; };
  chk('слепая выборка углы не ловит', rMaxOf(blind) < s.R - 1e-4, [rMaxOf(blind), s.R]);
  chk('с изломами радиус в углу точен', Math.abs(rMaxOf(smart) - s.R) < 1e-9, [rMaxOf(smart), s.R]);
  chk('изломов у шестигранника шесть', shaftCornerAngles(s).length === 6, shaftCornerAngles(s).length);
  chk('у круга изломов нет', shaftCornerAngles(shaftBoreSpec(setp({hubShaft:'round'}))).length === 0);
  chk('у шлицев по четыре излома на паз',
      shaftCornerAngles(shaftBoreSpec(setp({hubShaft:'spline', hubSplineN:5}))).length === 20);
}

console.log('=== разрезная: щель задают проушины, а прорезь в кольце шире ===');
{
  const ov = {hubStyle:'clamp', hubShaftD:8, hubOD:26, hubH:18, hubSlit:1.2, mntScrewD:4};
  const s = spec(ov), t = mk(ov);
  /* Готовая деталь ОТЦЕНТРОВАНА по своему габариту, а проушины торчат только в одну сторону — значит ось
     ступицы уже не на нуле, и мерить по числам из hubSpec напрямую нельзя. Сдвиг берётся по дальней грани
     проушины: она построена коробкой и стоит ровно на earOut, тогда как «левый» край кольца — это выборка
     по углам и до −rO чуть-чуть не достаёт. */
  let mxx = -1e9; for(const T of t) for(const v of T) if(v[0] > mxx) mxx = v[0];
  const dx = mxx - s.earOut, X = x => x + dx;
  const gapAt = (x, y) => { const runs = solidRuns(t, 2, X(x), y||0);
    const up = runs.filter(r=>r[0] > 1e-6).map(r=>r[0]), dn = runs.filter(r=>r[1] < -1e-6).map(r=>-r[1]);
    return (up.length && dn.length) ? Math.min.apply(null,up) + Math.min.apply(null,dn) : null; };
  const gEar = gapAt(s.rO + 0.5);                    // за кольцом — только проушины
  const gRing = gapAt((s.bore.R + s.earIn)/2);       // в самом кольце, до проушин
  chk('рабочая щель между проушинами = заказанной', Math.abs(gEar - s.slit) < 0.03, [gEar, s.slit]);
  chk('прорезь в кольце шире щели', gRing > gEar + 1.5, [gRing, gEar]);
  chk('и шире ровно на два HUB_SLOT_RELIEF', Math.abs(gRing - (s.slit + 2*HUB_SLOT_RELIEF)) < 0.03, [gRing, s.ringSlot]);
  chk('прорезь доходит до отверстия', gapAt(s.bore.R + 0.3) !== null);
  chk('проушина ниже кольца (торцы не совпадают)', s.earH < s.H - 1e-9, [s.earH, s.H]);
  /* Отверстие под стяжной винт меряется лучом ВДОЛЬ Z сквозь обе проушины на разной высоте: где луч идёт
     внутри отверстия, материала нет вовсе. Это заодно показывает, что дальняя проушина уже ближней — под
     саморез или термовтулку, а не под тот же зазор. */
  const nRuns = y => solidRuns(t, 2, X(s.boltX), y).length;
  const rNear = s.screwD/2, rFar = Math.max(0.6, s.screwD*0.41);
  chk('по оси винта материала нет вовсе', nRuns(0) === 0, nRuns(0));
  chk('внутри обоих отверстий — пусто', nRuns(rFar - 0.3) === 0, nRuns(rFar - 0.3));
  chk('между ними остаётся только дальняя проушина', nRuns((rFar + rNear)/2) === 1, nRuns((rFar + rNear)/2));
  chk('выше обоих отверстий — обе проушины', nRuns(rNear + 0.3) === 2, nRuns(rNear + 0.3));
  chk('и щель там та же', Math.abs(gapAt(s.boltX, rNear + 0.3) - s.slit) < 0.03, gapAt(s.boltX, rNear + 0.3));
}

console.log('=== фланец ===');
{
  const ov = {hubStyle:'plain', hubFlange:44, hubFlangeT:5, hubBoltD:3.4, hubOD:22, hubH:14};
  const s = spec(ov), t = mk(ov);
  chk('фланец не меньше кольца', s.flS >= 2*s.rO + 3 - 1e-9, [s.flS, s.rO]);
  const m = s.flS/2 - Math.max(2.2, s.boltD*1.2);
  let holes = 0;
  for(const sx of [-1,1]) for(const sz of [-1,1]){
    const runs = solidRuns(t, 1, sz*m, sx*m);   // ось 1: p — это Z, q — это X
    if(!runs.length) holes++;                                     // сквозное: материала на этой прямой нет
  }
  chk('четыре отверстия под болты сквозные', holes === 4, holes);
  chk('проходное отверстие шире профиля', s.throughR > s.rMax + 0.3, [s.throughR, s.rMax]);
  // Фланец растёт сам, если заказанного не хватает на непересекающиеся отверстия, — и говорит об этом.
  const g2 = spec({hubStyle:'plain', hubFlange:12, hubBoltD:8, hubShaftD:20});
  chk('маленький фланец поднят', g2.flGrown && g2.flS > 12, [g2.flS, g2.flAsked]);
  chk('без фланца остаётся втулка', spec({hubStyle:'plain', hubFlange:0}).flangeOn === false);
}

console.log('=== момент до среза выступа ===');
{
  const base = {hubStyle:'plain', hubShaftD:8, hubOD:24, hubH:12};
  chk('гладкий круг момента не держит', spec(Object.assign({}, base, {hubShaft:'round'})).torque === 0);
  const h12 = spec(Object.assign({}, base, {hubShaft:'hex'})).torque;
  const h24 = spec(Object.assign({}, base, {hubShaft:'hex', hubH:24})).torque;
  chk('момент растёт прямо с высотой', Math.abs(h24 - 2*h12) < 1e-9, [h12, h24]);
  chk('шестигранник сильнее одной лыски',
      h12 > spec(Object.assign({}, base, {hubShaft:'dflat', hubFlat:0.5})).torque, h12);
  chk('две лыски вдвое сильнее одной',
      Math.abs(spec(Object.assign({}, base, {hubShaft:'dflat2', hubFlat:1})).torque
             - 2*spec(Object.assign({}, base, {hubShaft:'dflat', hubFlat:1})).torque) < 1e-9);
  chk('глубже лыска — больше момент',
      spec(Object.assign({}, base, {hubShaft:'dflat', hubFlat:1.5})).torque
      > spec(Object.assign({}, base, {hubShaft:'dflat', hubFlat:0.5})).torque);
  chk('значение правдоподобно (десятые–единицы Н·м)', h12 > 0.2 && h12 < 20, h12);
}

console.log('=== имя и предупреждения ===');
{
  chk('имя называет профиль', /шестигранная/.test(activeShapeLabel(setp({hubShaft:'hex'}))), activeShapeLabel());
  chk('имя называет исполнение', /разрезная/.test(activeShapeLabel(setp({hubStyle:'clamp'}))), activeShapeLabel());
  chk('у многогранника размер под ключ пишется как S',
      /S5/.test(activeShapeLabel(setp({hubShaft:'square', hubShaftD:5}))), activeShapeLabel());
  const wr = ov => collectPrintWarnings(setp(ov));
  chk('момент печатается всегда', wr({hubShaft:'hex'}).some(x=>/до среза ведущего выступа/.test(x)), wr({hubShaft:'hex'}));
  chk('про гладкий вал сказано прямо', wr({hubShaft:'round'}).some(x=>/момента оно не держит/.test(x)));
  chk('поднятый Ø назван', wr({hubOD:6, hubShaftD:8}).some(x=>/наружный Ø поднят/.test(x)), wr({hubOD:6, hubShaftD:8}));
  chk('зажатая глубина лыски названа',
      wr({hubShaft:'dflat', hubShaftD:3, hubFlat:6}).some(x=>/глубина лыски уменьшена/.test(x)));
  chk('зажатая ширина шлица названа',
      wr({hubShaft:'spline', hubShaftD:3, hubSplineN:20, hubSplineW:6}).some(x=>/ширина шлица уменьшена/.test(x)));
  chk('зажатый винт назван', wr({hubH:4, mntScrewD:12}).some(x=>/Ø стяжного винта уменьшен/.test(x)));
  chk('зажатая щель названа', wr({hubOD:8, hubSlit:3, hubShaftD:3}).some(x=>/щель уменьшена/.test(x)), wr({hubOD:8, hubSlit:3, hubShaftD:3}));
  chk('поднятый фланец назван', wr({hubStyle:'plain', hubFlange:12, hubBoltD:8, hubShaftD:20}).some(x=>/сторона фланца поднята/.test(x)));
  chk('нулевой винт назван', wr({mntScrewD:0}).some(x=>/стягивать будет нечем/.test(x)));
  chk('умолчания молчат о зажимах',
      !wr({}).some(x=>/поднят|уменьшен|зажат/.test(x)), wr({}));
  const h = MODEL_HELP['mount:hub'];
  chk('у ступицы своя справка', !!h && /вал/.test(h.what), h && h.what);
}

console.log('=== TOTAL: ' + pass + ' passed, ' + fail + ' failed ===');
if(fail) process.exit(1);
