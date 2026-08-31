// Тесты печати (базовая форма «Тесты») — через НАСТОЯЩИЙ buildTrisForShape.
//
// v18.5.0: прежние шесть образцов сняты целиком (они остались на ветке `backup/test-models-v18.4.2`) и
// заменены пулом из десяти. Файл переписан под него.
//
// Эти детали существуют, ЧТОБЫ ИХ МЕРИЛИ, поэтому здесь меряют их самих: радиус скругления читается со
// скруглённой кромки, угол нависания — с нависающей грани, диаметр отверстия — с отверстия. Ни одна
// проверка не спрашивает строителя, что он собирался построить: величина берётся из сетки и сравнивается
// с подписанной. Так поймалась мерительная карточка, у которой все клинья выходили с одним углом при
// разных подписях, и температурная башня, у которой куб выходил 9.6 вместо 10.
//
// Две вещи меряются здесь потому, что герметичность их не видит:
//   • СОВПАДАЮЩИЕ ГРАНИ. `manifoldCheck` ключует рёбра НЕНАПРАВЛЕННО и склейку двух оболочек по общей
//     грани принимает за норму. Ловит её счёт НАПРАВЛЕННЫХ рёбер: в замкнутой согласованно
//     ориентированной сетке каждое направленное ребро встречается ровно один раз.
//   • НАЛОЖЕНИЕ ПОДПИСЕЙ. Цифры, наехавшие друг на друга, оставляют деталь герметичной и печатаются как
//     каша. Проверяется просветом: между соседними станциями в полосе подписей обязан быть пустой зазор.
//
// Run via ./run-all.sh.
let pass=0,fail=0; function chk(n,c,e){if(c){pass++;console.log('  OK  ',n);}else{fail++;console.log('  FAIL',n,e!==undefined?JSON.stringify(e):'');}}
function vol(t){let v=0;for(const T of t){const a=T[0],b=T[1],c=T[2];v+=(a[0]*(b[1]*c[2]-b[2]*c[1])-a[1]*(b[0]*c[2]-b[2]*c[0])+a[2]*(b[0]*c[1]-b[1]*c[0]))/6;}return v;}

const MODES = ['ruler','radius','chamfer','overhang','bridge','sphere','fit','tower','dim','wall',
               'fan','string','spiral','infill','surface'];
function bb(t){ const b={x0:1e9,x1:-1e9,y0:1e9,y1:-1e9,z0:1e9,z1:-1e9};
  for(const T of t) for(const v of T){ if(v[0]<b.x0)b.x0=v[0]; if(v[0]>b.x1)b.x1=v[0];
    if(v[1]<b.y0)b.y0=v[1]; if(v[1]>b.y1)b.y1=v[1]; if(v[2]<b.z0)b.z0=v[2]; if(v[2]>b.z1)b.z1=v[2]; } return b; }
function build(ov){ logos.length=0; boxHoles.length=0; dieFaces.length=0;
  Object.assign(paramState.box, defaultBoxParams(), ov);
  return buildTrisForShape('box', paramState.box); }

// Направленные рёбра: каждое ровно один раз, иначе две оболочки делят грань или треугольник вывернут.
function dupDirected(tris){
  const m = new Map(), K = v => v[0].toFixed(4)+','+v[1].toFixed(4)+','+v[2].toFixed(4);
  let bad = 0;
  for(const T of tris) for(let i=0;i<3;i++){ const k = K(T[i])+'|'+K(T[(i+1)%3]); m.set(k, (m.get(k)||0)+1); }
  for(const n of m.values()) if(n > 1) bad++;
  return bad;
}
// Треугольники, чья проекция на XZ может накрыть точку с этой z / этим y — сузить перебор один раз на скан.
const byZ = (t,z) => t.filter(T => Math.min(T[0][2],T[1][2],T[2][2]) <= z && Math.max(T[0][2],T[1][2],T[2][2]) >= z);
const byY = (t,y) => t.filter(T => Math.min(T[0][1],T[1][1],T[2][1]) <= y && Math.max(T[0][1],T[1][1],T[2][1]) >= y);
const EMPTY = -1e8;
// Высота верхней поверхности в столбике (x,z). Пусто (сквозная дыра / вне детали) — вернёт EMPTY-меньше.
function topOf(sub, x, z){ let hi = -1e9;
  for(const T of sub){ const A=T[0],B=T[1],C=T[2];
    const d1=(B[0]-A[0])*(z-A[2])-(B[2]-A[2])*(x-A[0]);
    const d2=(C[0]-B[0])*(z-B[2])-(C[2]-B[2])*(x-B[0]);
    const d3=(A[0]-C[0])*(z-C[2])-(A[2]-C[2])*(x-C[0]);
    if(!((d1>=0&&d2>=0&&d3>=0)||(d1<=0&&d2<=0&&d3<=0))) continue;
    const ar=(B[0]-A[0])*(C[2]-A[2])-(B[2]-A[2])*(C[0]-A[0]); if(Math.abs(ar)<1e-12) continue;
    const w1=((B[0]-x)*(C[2]-z)-(B[2]-z)*(C[0]-x))/ar, w2=((C[0]-x)*(A[2]-z)-(C[2]-z)*(A[0]-x))/ar;
    hi = Math.max(hi, w1*A[1]+w2*B[1]+(1-w1-w2)*C[1]); }
  return hi; }
// Пересечения луча вдоль X с оболочкой в точке (y,z) — для замеров ВНУТРИ детали, куда взгляд сверху не достаёт.
function hitsX(sub, y, z){ const xs=[];
  for(const T of sub){ const A=T[0],B=T[1],C=T[2];
    const d1=(B[1]-A[1])*(z-A[2])-(B[2]-A[2])*(y-A[1]);
    const d2=(C[1]-B[1])*(z-B[2])-(C[2]-B[2])*(y-B[1]);
    const d3=(A[1]-C[1])*(z-C[2])-(A[2]-C[2])*(y-C[1]);
    if(!((d1>=0&&d2>=0&&d3>=0)||(d1<=0&&d2<=0&&d3<=0))) continue;
    const ar=(B[1]-A[1])*(C[2]-A[2])-(B[2]-A[2])*(C[1]-A[1]); if(Math.abs(ar)<1e-12) continue;
    const w1=((B[1]-y)*(C[2]-z)-(B[2]-z)*(C[1]-y))/ar, w2=((C[1]-y)*(A[2]-z)-(C[2]-z)*(A[1]-y))/ar;
    xs.push(w1*A[0]+w2*B[0]+(1-w1-w2)*C[0]); }
  return xs.sort((u,v)=>u-v); }
// Где вдоль X в полосе z стоит материал выше `yMin`: списком отрезков. Так СТАНЦИИ НАХОДЯТСЯ, а не
// вычисляются по формуле раскладки: тест не должен повторять арифметику, которую проверяет.
function runsX(tris, z, yMin, b, step){
  const sub = byZ(tris, z), out = [], st = step || 0.05;
  let inR = false, x0 = 0, prev = 0;
  for(let x = b.minX; x <= b.maxX; x += st){
    const solid = topOf(sub, x, z) > yMin;
    if(solid && !inR){ x0 = x; inR = true; }
    if(!solid && inR){ out.push([x0, prev]); inR = false; }
    prev = x;
  }
  if(inR) out.push([x0, b.maxX]);
  return out;
}
/* Станции по ВЕРШИНАМ выше `yMin`. Нужно там, где скан сверху не годится: стенка в 0.2 мм тоньше любого
   разумного шага, а наклонная пластина у общей для всех глубины ещё утоплена в плите. Подписи в выборку
   не попадают — они не поднимаются выше 0.6 мм над плитой.

   Границы берутся ПАРАМИ подряд, а не разрывами: у прямой стенки и у наклонной пластины ровно две
   плоскости по X, и разрыв ВНУТРИ станции (её толщина) у одних моделей больше, а у других меньше
   разрыва МЕЖДУ станциями — порога, который развёл бы и то и другое, не существует. Пар выходит ровно
   столько, сколько станций, и это заодно проверка: лишняя плоскость сразу собьёт счёт. */
function spansX(tris, yMin){
  const all = [];
  for(const T of tris) for(const v of T) if(v[1] > yMin) all.push(v[0]);
  all.sort((a, b) => a - b);
  const u = []; for(const x of all) if(!u.length || x - u[u.length-1] > 1e-6) u.push(x);
  const pairs = []; for(let i = 0; i + 1 < u.length; i += 2) pairs.push([u[i], u[i+1]]);
  return {planes:u.length, pairs:pairs};
}
// Просвет между соседними подписями: если цифры наехали друг на друга, пустого места между станциями нет.
function labelsClear(tris, zLab, yMin, centres, b){
  const sub = byZ(tris, zLab);
  for(let k = 1; k < centres.length; k++){
    let gap = 0, best = 0;
    for(let x = centres[k-1]; x <= centres[k]; x += 0.05){
      if(topOf(sub, x, zLab) > yMin){ gap = 0; } else { gap += 0.05; if(gap > best) best = gap; }
    }
    if(best < 0.5) return {between:k-1, clear:+best.toFixed(2)};
  }
  return null;
}

console.log('=== все десять образцов герметичны и не склеены по граням ===');
for(const m of MODES)
  for(const n of [3, 8, 14]){
    const t = build({tstMode:m, tstN:n}), mc = manifoldCheck(t, 4);
    chk(m+' N='+n+': герметичен, объём положителен', mc.watertight && vol(t) > 0,
        {open:mc.openEdges, bad:mc.badEdges, vol:+vol(t).toFixed(1)});
    chk(m+' N='+n+': ни одного дублирующегося направленного ребра', dupDirected(t) === 0, dupDirected(t));
  }
/* Крайние положения КАЖДОЙ собственной ручки. Умолчания подобраны так, чтобы доли выходили круглыми, и
   именно поэтому проверять надо не их: ошибка раскладки прячется на границах диапазона, где фигура шире
   подписи или наоборот. */
for(const ov of [{tstMode:'ruler',tstRulerL:50},{tstMode:'ruler',tstRulerL:300},
                 {tstMode:'radius',tstRadMax:2},{tstMode:'radius',tstRadMax:24},
                 {tstMode:'chamfer',tstChfMax:1},{tstMode:'chamfer',tstChfMax:16},
                 {tstMode:'overhang',tstAngMax:40},{tstMode:'overhang',tstAngMax:85,tstH:40},
                 {tstMode:'bridge',tstSpan:10},{tstMode:'bridge',tstSpan:120,tstH:5},
                 {tstMode:'sphere',tstSphMax:6},{tstMode:'sphere',tstSphMax:40},
                 {tstMode:'fit',tstFitMax:0.2,tstFitPin:3},{tstMode:'fit',tstFitMax:1.6,tstFitPin:12},
                 {tstMode:'tower',tstTowMin:2,tstTowMax:5},{tstMode:'tower',tstTowMin:39,tstTowMax:80},
                 {tstMode:'dim',tstDimMin:3,tstDimMax:5},{tstMode:'dim',tstDimMin:30,tstDimMax:60},
                 {tstMode:'wall',tstWallMax:0.4},{tstMode:'wall',tstWallMax:4,tstH:40},
                 {tstMode:'wall',tstT:2},{tstMode:'dim',tstT:20}]){
  const t = build(ov), mc = manifoldCheck(t, 4);
  chk('край '+JSON.stringify(ov)+': герметичен', mc.watertight && vol(t) > 0,
      {open:mc.openEdges, bad:mc.badEdges});
  chk('край '+JSON.stringify(ov)+': без совпадающих граней', dupDirected(t) === 0, dupDirected(t));
}

console.log('=== линейка: длина ровно заданная, риски на своих местах ===');
for(const L of [50, 200, 300]){
  const t = build({tstMode:'ruler', tstRulerL:L}), b = computeBBox(t);
  chk('L='+L+': габарит по X ровно L', Math.abs((b.maxX - b.minX) - L) < 1e-6, +(b.maxX-b.minX).toFixed(4));
}
{
  const L = 200, t = build({tstMode:'ruler', tstRulerL:L}), b = computeBBox(t);
  const yTop = b.maxY - 0.5;                        // риски выступают на 0.5 над планкой
  const sub = byZ(t, b.minZ + 0.5), xs = [];
  for(let x = b.minX; x <= b.maxX; x += 0.05) if(topOf(sub, x, b.minZ + 0.5) > yTop + 1e-6) xs.push(x);
  const runs = []; for(const x of xs){ const l = runs[runs.length-1];
    if(l && x - l[1] < 0.08) l[1] = x; else runs.push([x, x]); }
  chk('рисок ровно L+1 (нулевая и последняя — на торцах)', runs.length === L + 1, runs.length);
  chk('первая риска начинается на нуле', Math.abs(runs[0][0] - b.minX) < 0.06, +(runs[0][0]-b.minX).toFixed(3));
  chk('последняя кончается на L', Math.abs(runs[runs.length-1][1] - b.maxX) < 0.06,
      +(b.maxX - runs[runs.length-1][1]).toFixed(3));
}

console.log('=== скругления: радиус кромки равен подписанному ===');
{
  const N = 8, Rmax = 16, t = build({tstMode:'radius', tstN:N, tstRadMax:Rmax}), b = computeBBox(t);
  const yP = b.minY + 4;                                   // верх плиты при tstT по умолчанию
  const st = runsX(t, b.minZ + 2, yP + 1, b);
  chk('станций ровно N', st.length === N, st.length);
  const centres = st.map(r => (r[0] + r[1])/2);
  for(let k = 0; k < Math.min(N, st.length); k++){
    const x = centres[k], want = Rmax*(k+1)/N;
    // Скан по глубине в столбце станции: где кончается плоский верх и где кончается сам блок.
    let apex = -1e9, zFlat = -1e9, zFront = -1e9;
    const col = t.filter(T => Math.min(T[0][0],T[1][0],T[2][0]) <= x && Math.max(T[0][0],T[1][0],T[2][0]) >= x);
    for(let z = b.minZ; z <= b.maxZ; z += 0.02){ const h = topOf(col, x, z); if(h > apex) apex = h; }
    for(let z = b.minZ; z <= b.maxZ; z += 0.02){ const h = topOf(col, x, z);
      if(h > apex - 1e-6) zFlat = z; if(h > yP + 1) zFront = z; }
    chk('R'+(+want.toFixed(2))+': высота блока — R + 4 над плитой',
        Math.abs((apex - yP) - (want + 4)) < 0.05, {izm:+(apex-yP).toFixed(3)});
    chk('R'+(+want.toFixed(2))+': дуга съедает R по глубине',
        Math.abs((zFront - zFlat) - want) < 0.08, {izm:+(zFront-zFlat).toFixed(3)});
    /* ...и это ДУГА, а не срез. Проверяется одной точкой — той, где дуга проходит под 45°: у окружности
       она отстоит от вершины на R·(1−sin45°) = 0.293 R, у прямой фаски того же размера — на 0.707 C.
       Перепутать их вдвое с лишним нельзя, а «съедено R по глубине» верно для обеих. */
    const d45 = want*(1 - Math.SQRT1_2), h45 = topOf(col, x, zFront - d45);
    chk('R'+(+want.toFixed(2))+': кромка — дуга, а не фаска',
        Math.abs((apex - h45) - d45) < 0.08, {izm:+(apex-h45).toFixed(3), want:+d45.toFixed(3)});
  }
  const bad = labelsClear(t, b.maxZ - 3.5, yP + 0.2, centres, b);
  chk('подписи не наползают друг на друга', bad === null, bad);
}

console.log('=== фаски: срез равен подписанному ===');
{
  const N = 8, Cmax = 8, t = build({tstMode:'chamfer', tstN:N, tstChfMax:Cmax}), b = computeBBox(t);
  const yP = b.minY + 4;
  const st = runsX(t, b.minZ + 2, yP + 1, b);
  chk('станций ровно N', st.length === N, st.length);
  const centres = st.map(r => (r[0] + r[1])/2);
  for(let k = 0; k < Math.min(N, st.length); k++){
    const x = centres[k], want = Cmax*(k+1)/N;
    const col = t.filter(T => Math.min(T[0][0],T[1][0],T[2][0]) <= x && Math.max(T[0][0],T[1][0],T[2][0]) >= x);
    let apex = -1e9, zFlat = -1e9, zFront = -1e9;
    for(let z = b.minZ; z <= b.maxZ; z += 0.02){ const h = topOf(col, x, z); if(h > apex) apex = h; }
    for(let z = b.minZ; z <= b.maxZ; z += 0.02){ const h = topOf(col, x, z);
      if(h > apex - 1e-6) zFlat = z; if(h > yP + 1) zFront = z; }
    chk('C'+(+want.toFixed(2))+': высота блока — C + 4 над плитой',
        Math.abs((apex - yP) - (want + 4)) < 0.05, {izm:+(apex-yP).toFixed(3)});
    chk('C'+(+want.toFixed(2))+': срез съедает C по глубине',
        Math.abs((zFront - zFlat) - want) < 0.05, {izm:+(zFront-zFlat).toFixed(3)});
    // Фаска — ПРЯМАЯ: на полпути по глубине высота ровно посередине между вершиной и передней кромкой.
    const hMid = topOf(col, x, zFlat + want/2);
    chk('C'+(+want.toFixed(2))+': срез прямой, а не дуга',
        Math.abs(hMid - (apex - want/2)) < 0.03, {izm:+(hMid-apex).toFixed(3), want:+(-want/2).toFixed(3)});
  }
  const bad = labelsClear(t, b.maxZ - 3.5, yP + 0.2, centres, b);
  chk('подписи не наползают друг на друга', bad === null, bad);
}

console.log('=== нависания: угол от вертикали равен подписанному ===');
{
  const N = 8, aMax = 80, H = 12, t = build({tstMode:'overhang', tstN:N, tstAngMax:aMax, tstH:H});
  const b = computeBBox(t), yP = b.minY + 4;
  /* Станции ищутся по вершинам ВЫШЕ плиты, а не сканом на одной глубине: пластины наклонены, и общей
     глубины, где все они стоят на заметной высоте, у них нет. Подписи выше плиты не поднимаются. */
  const sp = spansX(t, yP + 1);
  chk('плоскостей ровно 2N — по две на пластину', sp.planes === 2*N, sp.planes);
  const st = sp.pairs;
  chk('станций ровно N', st.length === N, st.length);
  for(let k = 0; k < Math.min(N, st.length); k++){
    const x = (st[k][0] + st[k][1])/2, want = aMax*(k+1)/N;
    /* Угол читается ДВУМЯ СЕЧЕНИЯМИ по высоте: у наклонной пластины передняя кромка уезжает по Z
       линейно, и наклон этого ухода есть tg(угла от вертикали). Так замер ничего не знает ни о том, где
       строитель поставил основание, ни о толщине пластины — а первая версия строителя как раз выводила
       вылет из высоты неверно, и все пластины выходили с одним углом при разных подписях. */
    const zf = yy => { const sub = byY(t, yy); let last = -1e9;
      for(let z = b.minZ; z <= b.maxZ; z += 0.02){
        const xs = hitsX(sub, yy, z); let c = 0; for(const v of xs) if(v < x) c++;
        if(c % 2 === 1) last = z; }
      return last; };
    const y1 = yP + 0.25*H, y2 = yP + 0.75*H;
    const ang = Math.atan2(zf(y2) - zf(y1), y2 - y1)*180/Math.PI;
    chk(Math.round(want)+'°: измеренный угол совпадает с подписью', Math.abs(ang - want) < 0.5,
        {izm:+ang.toFixed(2)});
  }
  chk('высота пластин над плитой — заданная', Math.abs((b.maxY - yP) - (H - 0.4)) < 1e-6,
      +(b.maxY - yP).toFixed(4));
  const bad = labelsClear(t, b.minZ + 2, yP + 0.2, st.map(r=>(r[0]+r[1])/2), b);
  chk('подписи не наползают друг на друга', bad === null, bad);
}

console.log('=== мосты: пролёт под настилом равен подписанному ===');
{
  const N = 6, spanMax = 60, hP = 12, t = build({tstMode:'bridge', tstN:N, tstSpan:spanMax, tstH:hP});
  const b = computeBBox(t), yP = b.minY + 4;
  const st = runsX(t, 0, yP + 1, b);            // настил всегда накрывает середину, а опоры у каждой станции свои
  chk('станций ровно N', st.length === N, st.length);
  const yMid = yP + hP/2, sub = byY(t, yMid);            // на этой высоте стоят ТОЛЬКО опоры
  for(let k = 0; k < Math.min(N, st.length); k++){
    const x = (st[k][0] + st[k][1])/2, want = spanMax*(k+1)/N;
    const runs = []; let inR = false, z0 = 0, prev = 0;
    for(let z = b.minZ; z <= b.maxZ; z += 0.05){
      const xs = hitsX(sub, yMid, z); let cross = 0; for(const v of xs) if(v < x) cross++;
      const solid = (cross % 2) === 1;
      if(solid && !inR){ z0 = z; inR = true; }
      if(!solid && inR){ runs.push([z0, prev]); inR = false; }
      prev = z; }
    if(inR) runs.push([z0, b.maxZ]);
    const piers = runs.filter(r => r[1] - r[0] > 1);
    chk('пролёт '+(+want.toFixed(1))+': ровно две опоры', piers.length === 2, piers.length);
    if(piers.length === 2)
      chk('пролёт '+(+want.toFixed(1))+': просвет между ними равен подписи',
          Math.abs((piers[1][0] - piers[0][1]) - want) < 0.12, {izm:+(piers[1][0]-piers[0][1]).toFixed(3)});
  }
  const bad = labelsClear(t, b.maxZ - 3.5, yP + 0.2, st.map(r=>(r[0]+r[1])/2), b);
  chk('подписи не наползают друг на друга', bad === null, bad);
}

console.log('=== купола: высота и след равны половине и целому подписанного Ø ===');
{
  const N = 8, Dmax = 24, t = build({tstMode:'sphere', tstN:N, tstSphMax:Dmax});
  const b = computeBBox(t), yP = b.minY + 4, zc = b.minZ + Dmax/2 + 3;
  const st = runsX(t, zc, yP + 0.5, b);
  chk('станций ровно N', st.length === N, st.length);
  for(let k = 0; k < Math.min(N, st.length); k++){
    const x = (st[k][0] + st[k][1])/2, r = Dmax*(k+1)/N/2;
    const col = t.filter(T => Math.min(T[0][0],T[1][0],T[2][0]) <= x && Math.max(T[0][0],T[1][0],T[2][0]) >= x);
    let apex = -1e9;
    for(let z = b.minZ; z <= b.maxZ; z += 0.05){ const h = topOf(col, x, z); if(h > apex) apex = h; }
    // Купол сидит в плите на 0.4: над её верхом остаётся r − 0.4, и это ровно то, что видно на детали.
    chk('Ø'+(+(2*r).toFixed(2))+': высота над плитой — r − 0.4', Math.abs((apex - yP) - (r - 0.4)) < 0.03,
        {izm:+(apex-yP).toFixed(3)});
    // След купола на плите — полный диаметр: меряется у самого верха плиты, где сечение почти экваториальное.
    const w = st[k][1] - st[k][0];
    chk('Ø'+(+(2*r).toFixed(2))+': след близок к полному диаметру', Math.abs(w - 2*r) < 0.9,
        {izm:+w.toFixed(2)});
  }
  const bad = labelsClear(t, b.maxZ - 3.5, yP + 0.2, st.map(r=>(r[0]+r[1])/2), b);
  chk('подписи не наползают друг на друга', bad === null, bad);
}

console.log('=== посадка: отверстия сквозные, диаметры равны Ø штыря + зазор ===');
{
  const N = 8, gMax = 0.8, pin = 6, t = build({tstMode:'fit', tstN:N, tstFitMax:gMax, tstFitPin:pin});
  const b = computeBBox(t), yP = b.minY + 4, zc = b.minZ + (pin + gMax)/2 + 4;
  const sub = byZ(t, zc);
  // Отверстие — столбик, в котором НЕТ ни одной поверхности: сквозное по определению, не «глубокое».
  const holes = []; let inH = false, x0 = 0, prev = 0;
  for(let x = b.minX; x <= b.maxX; x += 0.01){
    const e = topOf(sub, x, zc) < EMPTY;
    if(e && !inH){ x0 = x; inH = true; }
    if(!e && inH){ holes.push([x0, prev]); inH = false; }
    prev = x; }
  if(inH) holes.push([x0, b.maxX]);
  chk('отверстий ровно N и все сквозные', holes.length === N, holes.length);
  for(let k = 0; k < Math.min(N, holes.length); k++){
    const want = pin + gMax*(k+1)/N, got = holes[k][1] - holes[k][0];
    chk('зазор '+(+(gMax*(k+1)/N).toFixed(2))+': Ø отверстия = Ø штыря + зазор',
        Math.abs(got - want) < 0.06, {izm:+got.toFixed(3), want:+want.toFixed(3)});
  }
  chk('диаметры растут строго', holes.every((h,i) => i===0 || (h[1]-h[0]) > (holes[i-1][1]-holes[i-1][0]) + 1e-6));
  // Штырь стоит отдельной станцией и он ровно Ø штыря — иначе проба меряет не то, что обещает.
  const posts = runsX(t, zc, yP + 1, b, 0.01);
  chk('штырь один', posts.length === 1, posts.length);
  if(posts.length === 1)
    chk('и он ровно заданного Ø', Math.abs((posts[0][1] - posts[0][0]) - pin) < 0.05,
        {izm:+(posts[0][1]-posts[0][0]).toFixed(3)});
  chk('штырь стоит ПОСЛЕ отверстий, а не среди них',
      posts.length === 1 && posts[0][0] > holes[holes.length-1][1], {pin:posts[0], last:holes[holes.length-1]});
}

console.log('=== башня: диаметр каждой ступени равен своей доле ===');
{
  const N = 8, dLo = 5, dHi = 40, hL = 12;
  const t = build({tstMode:'tower', tstN:N, tstTowMin:dLo, tstTowMax:dHi, tstH:hL});
  const b = computeBBox(t), y0 = b.minY + 4 - 0.4;
  /* Диаметр читается с ВЕРХНЕГО КОЛЬЦА ступени, а не лучом поперёк неё. Луч вдоль X при z = 0 проходит
     ровно через шов цилиндра — вершину при угле 0 — и считает там то два пересечения, то три, смотря
     какой треугольник первым признает точку своей. Кольцо однозначно: у ступени k своя плоскость,
     y = y0 + k·hL + hL + 0.4, и соседи в неё не попадают. */
  const got = [];
  for(let k = 0; k < N; k++){
    const yRing = y0 + (k + 1)*hL + (k === N - 1 ? 0 : 0.4), want = dHi - (dHi - dLo)*k/(N - 1);
    let lo = 1e9, hi = -1e9;
    for(const T of t) for(const v of T) if(Math.abs(v[1] - yRing) < 1e-7){
      if(v[0] < lo) lo = v[0]; if(v[0] > hi) hi = v[0]; }
    chk('ступень '+(k+1)+': кольцо найдено', hi > lo, {lo:lo, hi:hi});
    chk('ступень '+(k+1)+': Ø = '+(+want.toFixed(2)), Math.abs((hi - lo) - want) < 0.02,
        {izm:+(hi-lo).toFixed(3)});
    got.push(hi - lo);
  }
  chk('каждая следующая ступень уже предыдущей', got.every((d,i) => i === 0 || d < got[i-1] - 1e-9),
      got.map(v => +v.toFixed(2)));
  chk('высота башни — N ступеней плюс плита', Math.abs((b.maxY - b.minY) - (4 - 0.4 + N*hL)) < 1e-6,
      +(b.maxY-b.minY).toFixed(3));
}

console.log('=== проверка размеров: куб и цилиндр ровно номинальные ===');
{
  const N = 8, dLo = 5, dHi = 19, t = build({tstMode:'dim', tstN:N, tstDimMin:dLo, tstDimMax:dHi});
  const b = computeBBox(t), yP = b.minY + 4;
  const zA = b.minZ + 3 + dHi/2, zB = zA + dHi + 4;
  const cubes = runsX(t, zA, yP + 0.5, b, 0.01), cyls = runsX(t, zB, yP + 0.5, b, 0.01);
  chk('кубов ровно N', cubes.length === N, cubes.length);
  chk('цилиндров ровно N', cyls.length === N, cyls.length);
  for(let k = 0; k < Math.min(N, cubes.length, cyls.length); k++){
    const s = dLo + (dHi - dLo)*k/(N - 1);
    const x = (cubes[k][0] + cubes[k][1])/2;
    chk(s+' мм: куб — ровно s по X', Math.abs((cubes[k][1]-cubes[k][0]) - s) < 0.02,
        +(cubes[k][1]-cubes[k][0]).toFixed(3));
    chk(s+' мм: цилиндр — ровно s по X', Math.abs((cyls[k][1]-cyls[k][0]) - s) < 0.02,
        +(cyls[k][1]-cyls[k][0]).toFixed(3));
    /* И РОВНО s НАД ПЛИТОЙ. Фигура утоплена в плиту на 0.4, и если утопление вычесть из верха вместо
       того, чтобы прибавить, эталон 10 мм выходит 9.6 — герметичный, подписанный и врущий. Так и было. */
    const col = t.filter(T => Math.min(T[0][0],T[1][0],T[2][0]) <= x && Math.max(T[0][0],T[1][0],T[2][0]) >= x);
    chk(s+' мм: куб — ровно s НАД плитой', Math.abs((topOf(col, x, zA) - yP) - s) < 0.01,
        +(topOf(col, x, zA) - yP).toFixed(4));
    const xc = (cyls[k][0] + cyls[k][1])/2;
    const col2 = t.filter(T => Math.min(T[0][0],T[1][0],T[2][0]) <= xc && Math.max(T[0][0],T[1][0],T[2][0]) >= xc);
    chk(s+' мм: цилиндр — ровно s НАД плитой', Math.abs((topOf(col2, xc, zB) - yP) - s) < 0.01,
        +(topOf(col2, xc, zB) - yP).toFixed(4));
  }
  const bad = labelsClear(t, b.maxZ - 4.5, yP + 0.2, cubes.map(r=>(r[0]+r[1])/2), b);
  chk('подписи не наползают друг на друга', bad === null, bad);
}

console.log('=== тонкие стенки: толщина равна подписанной, включая 0.2 мм ===');
{
  const N = 8, wMax = 1.6, H = 12, t = build({tstMode:'wall', tstN:N, tstWallMax:wMax, tstH:H});
  const b = computeBBox(t), yP = b.minY + 4;
  /* Стенка в 0.2 мм тоньше любого разумного шага скана, поэтому меряется ПО ВЕРШИНАМ: всё, что стоит
     выше плиты, — это стенки (подписи не поднимаются выше 0.6 над её верхом), и разрывы по X делят их. */
  const sp = spansX(t, yP + 1);
  chk('плоскостей ровно 2N — по две на стенку', sp.planes === 2*N, sp.planes);
  const grp = sp.pairs;
  chk('стенок ровно N', grp.length === N, grp.length);
  for(let k = 0; k < Math.min(N, grp.length); k++){
    const want = wMax*(k+1)/N;
    chk('стенка '+(+want.toFixed(2))+' мм: толщина совпадает', Math.abs((grp[k][1]-grp[k][0]) - want) < 1e-6,
        +(grp[k][1]-grp[k][0]).toFixed(4));
  }
  chk('высота стенок над плитой — заданная', Math.abs((b.maxY - yP) - H) < 1e-6, +(b.maxY-yP).toFixed(4));
  const bad = labelsClear(t, b.maxZ - 3.5, yP + 0.2, grp.map(r=>(r[0]+r[1])/2), b);
  chk('подписи не наползают друг на друга', bad === null, bad);
}

console.log('=== ручки и правда управляют деталью ===');
{
  const pairs = [
    ['radius',  {tstRadMax:4},   {tstRadMax:24},  b => b.maxY - b.minY],
    ['chamfer', {tstChfMax:2},   {tstChfMax:16},  b => b.maxY - b.minY],
    ['overhang',{tstAngMax:40},  {tstAngMax:85},  b => b.maxZ - b.minZ],
    ['bridge',  {tstSpan:20},    {tstSpan:120},   b => b.maxZ - b.minZ],
    ['sphere',  {tstSphMax:8},   {tstSphMax:40},  b => b.maxY - b.minY],
    ['fit',     {tstFitPin:3},   {tstFitPin:12},  b => b.maxZ - b.minZ],
    ['tower',   {tstTowMax:10},  {tstTowMax:80},  b => b.maxX - b.minX],
    ['dim',     {tstDimMax:8},   {tstDimMax:60},  b => b.maxY - b.minY],
    ['wall',    {tstH:5},        {tstH:40},       b => b.maxY - b.minY],
    ['ruler',   {tstRulerL:50},  {tstRulerL:300}, b => b.maxX - b.minX],
  ];
  for(const [m, lo, hi, f] of pairs){
    const a = f(computeBBox(build(Object.assign({tstMode:m}, lo))));
    const c = f(computeBBox(build(Object.assign({tstMode:m}, hi))));
    chk(m+': своя ручка меняет деталь', c > a + 1, {lo:+a.toFixed(1), hi:+c.toFixed(1)});
  }
  /* «Линейка» и «ячейка заполнения» станций не имеют вовсе, и это не пропуск: у линейки станция — это
     миллиметровое деление, их число задаёт длина; у ячейки заполнения станций ровно столько, сколько
     узоров у OrcaSlicer, и меняться от ручки они не могут. Обе обязаны игнорировать `tstN` — что здесь и
     проверяется, а не обходится. */
  const NO_STATIONS = ['ruler', 'infill', 'surface'];
  for(const m of MODES){
    const a = build({tstMode:m, tstN:4}).length, c = build({tstMode:m, tstN:12}).length;
    chk(m+': число образцов меняет деталь',
        NO_STATIONS.indexOf(m) >= 0 ? a === c : c > a, {n4:a, n12:c});
  }
}

/* Соседи по крепежу. `tstMode:'none'` здесь ОБЯЗАТЕЛЕН и не для красоты: форма «Тесты» стоит в
   dominantMode ВЫШЕ крепежа, и включённый образец накрыл бы обе проверки ниже — они прошли бы всегда,
   холостыми. Ровно это и случилось при переносе, и поймала это единственная строка, которая проверяет
   ОТСУТСТВИЕ влияния. */
console.log('=== тесты не мешают соседям ===');
for(const m of ['lbracket','vesa','boss','tool','pipe','foot','fittest','dovetail']){
  const t = build({tstMode:'none', mntMode:m, width:40, height:40, depth:40}), mc = manifoldCheck(t, 4);
  chk(m+' по-прежнему герметичен', mc.watertight && vol(t) > 0, {open:mc.openEdges, bad:mc.badEdges});
  chk(m+' — это крепёж, а не тест', dominantMode(paramState.box) === 'mount', dominantMode(paramState.box));
}
{ const a = vol(build({tstMode:'none', mntMode:'fittest', tstN:3})),
        b = vol(build({tstMode:'none', mntMode:'fittest', tstN:12}));
  chk('число образцов теста ничего не делает с калибровкой крепежа', Math.abs(a - b) < 1e-9, {a, b}); }

/* ПЕРЕНОС СТАРЫХ КОНФИГОВ. Два поколения сразу. Конфиг до v18.0.0 несёт `mntMode:'temptower'` и размеры в
   ключах `mnt*`; конфиг v18.0.0…v18.4.2 несёт `tstMode` со снятой разновидностью. Ни ту, ни другую
   воспроизвести нельзя — образцы сняты, — но открыться ПУСТОЙ моделью хуже всего: человек решает, что
   испорчен файл. Перенос идёт по СЫРЫМ параметрам, до слияния с умолчаниями: после слияния у новых
   ключей уже стоят их умолчания, и «пусто ли здесь» ответить нечем. */
console.log('=== старый конфиг открывается настоящим тестом, а не пустотой ===');
{
  const NEAR = {temptower:'tower', bridgetest:'bridge', retract:'tower',
                allinone:'dim', toolcard:'fit', filcard:'ruler'};
  for(const was in NEAR){
    const raw = {tstMode:was, tstSegN:7, tstSegH:15, tstSpan:80, tstT:5};
    const mp = Object.assign(defaultBoxParams(), migrateLegacyParams(raw));
    chk(was+' → '+NEAR[was], mp.tstMode === NEAR[was], mp.tstMode);
    chk(was+': размеры перенесены', mp.tstN === 7 && mp.tstH === 15 && mp.tstT === 5,
        {n:mp.tstN, h:mp.tstH, t:mp.tstT});
    chk(was+': открывается формой «Тесты»', dominantMode(mp) === 'test', dominantMode(mp));
    logos.length = 0; boxHoles.length = 0; dieFaces.length = 0;
    Object.assign(paramState.box, mp);
    const t = buildTrisForShape('box', paramState.box);
    chk(was+': и это настоящая деталь, а не пустой список',
        t.length > 100 && manifoldCheck(t, 4).watertight, t.length);
  }
  for(const was of ['temptower','bridgetest','retract']){
    const raw = {mntMode:was, mntCalN:6, mntCalH:20, mntBrSpan:90, mntT:6};
    const mp = Object.assign(defaultBoxParams(), migrateLegacyParams(raw));
    chk('крепёж '+was+': уехал в тесты', mp.tstMode === NEAR[was] && mp.mntMode === 'none',
        {tst:mp.tstMode, mnt:mp.mntMode});
    chk('крепёж '+was+': размеры перенесены', mp.tstN === 6 && mp.tstH === 20 && mp.tstSpan === 90 && mp.tstT === 6,
        {n:mp.tstN, h:mp.tstH, span:mp.tstSpan, t:mp.tstT});
  }
  const keep = Object.assign(defaultBoxParams(), migrateLegacyParams({mntMode:'lbracket', mntW:50}));
  chk('чужой крепёж не тронут', keep.mntMode === 'lbracket' && (keep.tstMode||'none') === 'none',
      {mnt:keep.mntMode, tst:keep.tstMode});
  chk('и он по-прежнему крепёж', dominantMode(keep) === 'mount', dominantMode(keep));
  const live = Object.assign(defaultBoxParams(), migrateLegacyParams({tstMode:'radius', tstN:5}));
  chk('живая разновидность переносом не тронута', live.tstMode === 'radius' && live.tstN === 5,
      {tst:live.tstMode, n:live.tstN});
}

console.log('=== форма «Тесты» стоит в панели наравне с остальными ===');
{
  chk('имя формы есть', KIND_LABEL.test === 'Тесты', KIND_LABEL.test);
  chk('её группа знает свою форму', GROUP_KIND['Тесты печати'] === 'test');
  chk('и свой переключатель подмодели', subModelKey('test') === 'tstMode', subModelKey('test'));
  chk('группа видна только на ней', sectionRelevant('Тесты печати','test',false) &&
      !sectionRelevant('Тесты печати','mount',false));
  chk('а крепёж на ней не виден', !sectionRelevant('Крепёж / монтаж','test',false));
  const opts = SHAPE_PARAMS.box.find(r => r.key === 'tstMode').options.map(o => o.v);
  chk('в списке ровно пятнадцать образцов и «нет»', opts.length === MODES.length + 1, opts);
  for(const m of MODES){
    chk(m+': есть плитка', opts.includes(m), opts);
    chk(m+': справка на месте', !!MODEL_HELP['test:'+m], m);
    chk(m+': и её больше нет под крепежом', !MODEL_HELP['mount:'+m], m);
    chk(m+': строитель отдаёт непустую сетку', buildTestPrint(
        Object.assign(defaultBoxParams(), {tstMode:m})).length > 50, m);
  }
  for(const gone of ['temptower','bridgetest','retract','allinone','toolcard','filcard']){
    chk(gone+': снят из списка', !opts.includes(gone), opts);
    chk(gone+': и справка снята вместе с ним', !MODEL_HELP['test:'+gone]);
  }
  chk('неизвестная разновидность даёт пустой список, а не исключение',
      buildTestPrint(Object.assign(defaultBoxParams(), {tstMode:'нетакой'})).length === 0);
  const mnt = SHAPE_PARAMS.box.find(r => r.key === 'mntMode').options.map(o => o.v);
  chk('в крепеже калибровок нет', !mnt.includes('temptower') && !mnt.includes('bridgetest') &&
      !mnt.includes('retract'), mnt);
  // Каждая ручка раздела относится к настоящей разновидности — иначе строка висит в панели мёртвой.
  for(const r of SHAPE_PARAMS.box){
    if(r.group !== 'Тесты печати' || !r.w || r.w === '*') continue;
    chk(r.key+': относится только к живым образцам', r.w.every(v => MODES.includes(v)), r.w);
  }
}

/* ТРИ НОВЫХ ОБРАЗЦА меряются той же меркой, что и остальные: величина берётся из сетки и сравнивается с
   той, что заказана ручкой. Строителя никто не спрашивает, что он собирался построить. */
/* Границы берутся ПАРАМИ через `spansX`, а не группировкой соседних вершин. У призмы вершины есть только
   на двух торцах, поэтому «сгустки координат» дают по два сгустка на одно рёбрышко, а не по одному:
   первая версия этих проверок насчитала 2N рёбрышек вместо N и нулевую сторону у каждого столбика. */
console.log('=== веер нависаний: вылет растёт и совпадает с дугой ===');
for(const N of [4, 8]) for(const aMax of [50, 80]){
  const t = build({tstMode:'fan', tstN:N, tstAngMax:aMax, tstH:12});
  const b = bb(t), yMin = b.y0 + 4 + 1.5;
  const sp = spansX(t, yMin);
  chk('веер N='+N+' до '+aMax+'°: рёбрышек ровно столько, сколько станций', sp.pairs.length === N,
      sp.pairs.length);
  const runs = sp.pairs.map(([x0, x1]) => { let lo = 1e9, hi = -1e9;
    for(const T of t) for(const v of T) if(v[1] > yMin && v[0] >= x0 - 1e-6 && v[0] <= x1 + 1e-6){
      if(v[2] < lo) lo = v[2]; if(v[2] > hi) hi = v[2]; }
    return hi - lo; });
  chk('веер N='+N+' до '+aMax+'°: вылет растёт от станции к станции',
      runs.every((v, i) => i === 0 || v > runs[i-1] + 0.1), runs.map(r => +r.toFixed(2)));
  // Вылет крайнего обязан лечь на дугу: R = H/sin A, средняя линия уходит на R(1−cos A), плюс полстенки
  // у корня (нормаль там горизонтальна) и полстенки·cos A у кончика.
  const A = aMax*Math.PI/180, want = 12*(1 - Math.cos(A))/Math.sin(A) + 1.5 + 1.5*Math.cos(A);
  chk('веер N='+N+' до '+aMax+'°: вылет крайнего лёг на дугу', Math.abs(runs[N-1] - want) < 0.35,
      {есть:+runs[N-1].toFixed(2), надо:+want.toFixed(2)});
}
console.log('=== стрункость: перелёты и берега ===');
for(const N of [3, 7]) for(const g of [20, 80]){
  const t = build({tstMode:'string', tstN:N, tstStrGap:g, tstStrPost:2.5, tstH:14});
  const sp = spansX(t, bb(t).y0 + 4 + 2);
  chk('стрункость N='+N+' до '+g+': столбиков на один больше, чем перелётов', sp.pairs.length === N + 1,
      sp.pairs.length + ' вместо ' + (N + 1));
  chk('стрункость N='+N+' до '+g+': столбик — заданной стороны',
      sp.pairs.every(q => Math.abs((q[1] - q[0]) - 2.5) < 0.02), sp.pairs.map(q => +(q[1]-q[0]).toFixed(2)));
  const gaps = []; for(let i = 1; i < sp.pairs.length; i++) gaps.push(sp.pairs[i][0] - sp.pairs[i-1][1]);
  chk('стрункость N='+N+' до '+g+': перелёты растут',
      gaps.every((v, i) => i === 0 || v > gaps[i-1] + 0.3), gaps.map(v => +v.toFixed(1)));
  chk('стрункость N='+N+' до '+g+': самый длинный — заказанный',
      Math.abs(gaps[gaps.length-1] - g) < 1.2, {есть:+gaps[gaps.length-1].toFixed(2), надо:g});
}
console.log('=== кольца: их число и стенка ===');
for(const N of [3, 8]) for(const dMax of [40, 120]) for(const w of [0.4, 1.2]){
  const t = build({tstMode:'spiral', tstSpiKind:'rings', tstN:N, tstSpiMax:dMax, tstSpiWall:w, tstH:10});
  const b = bb(t);
  // луч вдоль X через центр на высоте колец: сколько кусков материала он встретит
  const y = b.y0 + 4 + 5;
  const segs = [];
  {
    const hits = [];
    for(const T of t){ const [a,c,d] = T;
      const dd1=(c[1]-a[1])*(0-a[2])-(c[2]-a[2])*(y-a[1]);
      const dd2=(d[1]-c[1])*(0-c[2])-(d[2]-c[2])*(y-c[1]);
      const dd3=(a[1]-d[1])*(0-d[2])-(a[2]-d[2])*(y-d[1]);
      if(!((dd1>=0&&dd2>=0&&dd3>=0)||(dd1<=0&&dd2<=0&&dd3<=0))) continue;
      const A2=(c[1]-a[1])*(d[2]-a[2])-(c[2]-a[2])*(d[1]-a[1]); if(Math.abs(A2)<1e-12) continue;
      const e1=[c[0]-a[0],c[1]-a[1],c[2]-a[2]], e2=[d[0]-a[0],d[1]-a[1],d[2]-a[2]];
      const nx=e1[1]*e2[2]-e1[2]*e2[1]; if(Math.abs(nx)<1e-12) continue;
      const w1=((c[1]-y)*(d[2]-0)-(c[2]-0)*(d[1]-y))/A2, w2=((d[1]-y)*(a[2]-0)-(d[2]-0)*(a[1]-y))/A2;
      hits.push([w1*a[0]+w2*c[0]+(1-w1-w2)*d[0], nx<0?1:-1]); }
    hits.sort((a,c)=>a[0]-c[0]);
    let dep=0, st=null;
    for(const [x,q] of hits){ const pr=dep; dep+=q;
      if(pr<=0&&dep>0) st=x; else if(pr>0&&dep<=0){ if(st!==null&&x-st>1e-9) segs.push([st,x]); st=null; } }
  }
  chk('кольца N='+N+' Ø'+dMax+' стенка '+w+': колец ровно столько, сколько станций',
      segs.length === 2*N, segs.length + ' пересечений вместо ' + 2*N);
  chk('кольца N='+N+' Ø'+dMax+' стенка '+w+': крайнее кольцо — заказанного Ø',
      Math.abs((segs[segs.length-1][1] - segs[0][0]) - (dMax + w)) < 0.06,
      {есть:+(segs[segs.length-1][1]-segs[0][0]).toFixed(3), надо:dMax + w});
  chk('кольца N='+N+' Ø'+dMax+' стенка '+w+': стенка — заказанной толщины',
      segs.every(q => Math.abs((q[1]-q[0]) - w) < 0.05), segs.map(q=>+(q[1]-q[0]).toFixed(3)));
}

/* НАСТОЯЩАЯ СПИРАЛЬ отличается от колец НЕСИММЕТРИЧНОСТЬЮ, и это самый дешёвый способ их различить.
   Кольцо пересекает луч через центр на одном и том же радиусе слева и справа. У спирали радиус растёт
   непрерывно, поэтому за пол-оборота он успевает подрасти на полшага: справа витки стоят на r₀+p·k,
   слева — на r₀+p·(k+½).

   Первая версия считала оболочки выше плиты и падала: отбор «весь треугольник выше порога» режет стенку
   по её нижней кромке, а бруски подписи считаются отдельными телами. Считать надо не куски, а геометрию. */
console.log('=== спираль: витки идут непрерывно, а не кольцами ===');
for(const pitch of [3, 6]) for(const dMax of [50, 100]){
  const mk = kind => build({tstMode:'spiral', tstSpiKind:kind, tstN:6, tstSpiPitch:pitch,
                            tstSpiMax:dMax, tstSpiWall:0.8, tstH:10});
  /* Луч пускается НЕ через самый центр, а со сдвигом на полмиллиметра. Кольца нарезаны с первой вершиной
     на нуле градусов, и луч по z = 0 приходит ровно в вершину: пересечение вырождается и с одной стороны
     теряется, отчего симметричные кольца выглядят несимметричными. Сдвиг эту вырожденность убирает, а на
     радиус влияет на пять микрон. */
  const radii = t => {
    const b = bb(t), y = b.y0 + 4 + 5, zc = 0.5;
    const xs = hitsX(byZ(t, zc), y, zc).map(x => Math.sign(x)*Math.hypot(x, zc));
    return {rt: xs.filter(x => x > 0.5).sort((a,c)=>a-c),
            lf: xs.filter(x => x < -0.5).map(x => -x).sort((a,c)=>a-c)};
  };
  const sp = mk('spiral'), rg = mk('rings');
  chk('спираль шаг '+pitch+' Ø'+dMax+': герметична',
      manifoldCheck(sp, 4).watertight, manifoldCheck(sp, 4).openEdges);
  /* Начальный участок отбрасывается: лента начинается ТОРЦОМ на радиусе r₀, и вокруг него луч ловит
     лишние близкие пересечения, которых у витка нет. Стороны потом равняются по короткой — иначе
     сравниваются разные витки и «смещение» выходит в полтора шага вместо половины. */
  const r0 = Math.max(pitch, 4), cut = r0 + pitch*1.5;
  const pair = A => { const rt = A.rt.filter(v => v > cut), lf = A.lf.filter(v => v > cut);
    const n = Math.min(rt.length, lf.length), d = [];
    for(let k = 0; k < n; k++) d.push(Math.abs(rt[k] - lf[k]));
    return d; };
  /* Смещение берётся ПО МОДУЛЮ ШАГА. Стороны могут начаться с разных витков, и тогда разность выходит не
     полшага, а полтора — но по модулю шага это одно и то же число. Кольца дают ноль, спираль — половину,
     и спутать их нельзя ни при каком сдвиге нумерации. */
  const fold = d => { const m = ((d % pitch) + pitch) % pitch; return Math.min(m, pitch - m); };
  const mean = a => a.length ? a.reduce((x, y) => x + fold(y), 0)/a.length : NaN;
  const dR = pair(radii(rg)), dS = pair(radii(sp));
  chk('кольца симметричны относительно центра', dR.length > 2 && mean(dR) < 0.05, +mean(dR).toFixed(4));
  chk('спираль шаг '+pitch+' Ø'+dMax+': НЕсимметрична — витки смещены на полшага',
      dS.length > 1 && Math.abs(mean(dS) - pitch/2) < pitch*0.3,
      {смещение:+mean(dS).toFixed(2), полшага:pitch/2});
  const S2 = radii(sp).rt.filter(v => v > cut);
  chk('спираль шаг '+pitch+' Ø'+dMax+': соседние витки отстоят на шаг',
      S2.length > 3 && S2.slice(2).every((v, k) => Math.abs((v - S2[k]) - pitch) < 0.25),
      S2.map(v=>+v.toFixed(1)));
  chk('спираль шаг '+pitch+' Ø'+dMax+': не вылезла за заказанный Ø',
      (bb(sp).x1 - bb(sp).x0) <= dMax + 12 + 1e-6, +(bb(sp).x1 - bb(sp).x0).toFixed(2));
}

/* НАБОР ЗАПОЛНЕНИЙ. Проверяется то, ради чего он затеян: ячеек ровно столько, сколько узоров у
   OrcaSlicer, они РАЗНЫЕ по номеру, не налезают друг на друга и все влезают в сборку. Раскладка вынесена
   в отдельную функцию именно чтобы её можно было померить без DOM. */
console.log('=== набор заполнений: раскладка ===');
{
  const plan = infillSwatchPlan(defaultBoxParams());
  chk('ячеек столько же, сколько узоров', plan.length === ORCA_INFILL.length, plan.length);
  chk('и все влезают в сборку', plan.length <= MAX_MODELS, {надо:plan.length, мест:MAX_MODELS});
  chk('номера идут подряд с единицы', plan.every((c, k) => c.no === k + 1));
  chk('имена не повторяются', new Set(plan.map(c => c.name)).size === plan.length);
  // Габарит берётся у ПОСТРОЕННОЙ ячейки: при включённом замке плита шире заказанной стороны, и проверка
  // по заказанной пропустила бы ровно тот нахлёст, из-за которого раскладку и переписали.
  const cellBox = (ov) => { const b = computeBBox(buildInfillCell(1, Object.assign(defaultBoxParams(), ov||{})));
    return {w: b.maxX - b.minX, d: b.maxZ - b.minZ}; };
  for(const ov of [{}, {tstJoin:true}, {tstInfSide:50}, {tstInfSide:18, tstJoin:true}]){
    const pl = infillSwatchPlan(Object.assign(defaultBoxParams(), ov)), cb = cellBox(ov);
    let clash = 0;
    for(let i = 0; i < pl.length; i++) for(let j = i + 1; j < pl.length; j++)
      if(Math.abs(pl[i].px - pl[j].px) < cb.w - 1e-6 && Math.abs(pl[i].pz - pl[j].pz) < cb.d - 1e-6) clash++;
    chk('ячейки не налезают ('+JSON.stringify(ov)+')', clash === 0, clash);
  }
  chk('раскладка близка к квадрату, а не в строку',
      Math.max(...plan.map(c=>c.px)) - Math.min(...plan.map(c=>c.px)) < ORCA_INFILL.length*30*0.5);
  // сторона ячейки правит и раскладку — иначе набор разъедется при другом размере
  const big = infillSwatchPlan(Object.assign(defaultBoxParams(), {tstInfSide: 50}));
  chk('шаг раскладки следует за стороной ячейки',
      Math.max(...big.map(c=>c.px)) > Math.max(...plan.map(c=>c.px)) + 10);
}
console.log('=== набор заполнений: сама ячейка ===');
for(const no of [1, 7, 20]) for(const side of [15, 30, 60]){
  const t = buildInfillCell(no, Object.assign(defaultBoxParams(), {tstInfSide:side, tstInfH:12}));
  const mc = manifoldCheck(t, 4);
  chk('ячейка '+no+' сторона '+side+': герметична', mc.watertight && mc.badEdges === 0,
      {open:mc.openEdges, bad:mc.badEdges});
  const b = computeBBox(t);
  chk('ячейка '+no+' сторона '+side+': сторона заказанная',
      Math.abs((b.maxX - b.minX) - side) < 1e-6, +(b.maxX-b.minX).toFixed(2));
  // верх ОТКРЫТ — ради этого всё и делается: луч сверху по центру обязан дойти до дна
  const yTop = b.maxY, hits = [];
  for(const T of t) if(T.every(v => Math.abs(v[1] - yTop) < 1e-6)) hits.push(T);
  let covers = false;
  for(const T of hits){ const xs = T.map(v=>v[0]), zs = T.map(v=>v[2]);
    if(Math.min(...xs) <= 0 && Math.max(...xs) >= 0 && Math.min(...zs) <= 0 && Math.max(...zs) >= 0) covers = true; }
  chk('ячейка '+no+' сторона '+side+': верх открыт', !covers);
}

console.log('=== набор корки: те же правила, что у заполнения ===');
{
  const plan = surfaceSwatchPlan(defaultBoxParams());
  chk('площадок столько же, сколько рисунков', plan.length === ORCA_SURFACE.length, plan.length);
  chk('и все влезают в сборку', plan.length <= MAX_MODELS, {надо:plan.length, мест:MAX_MODELS});
  chk('имена не повторяются', new Set(plan.map(c => c.name)).size === plan.length);
  for(const ov of [{}, {tstJoin:true}, {tstSrfSide:50}]){
    const pl = surfaceSwatchPlan(Object.assign(defaultBoxParams(), ov));
    const b = computeBBox(buildSurfacePad(1, Object.assign(defaultBoxParams(), ov)));
    const w = b.maxX - b.minX, d = b.maxZ - b.minZ;
    let clash = 0;
    for(let i = 0; i < pl.length; i++) for(let j = i + 1; j < pl.length; j++)
      if(Math.abs(pl[i].px - pl[j].px) < w - 1e-6 && Math.abs(pl[i].pz - pl[j].pz) < d - 1e-6) clash++;
    chk('площадки не налезают ('+JSON.stringify(ov)+')', clash === 0, clash);
  }
}
/* Площадка СПЛОШНАЯ — этим она и отличается от ячейки заполнения, у которой верх открыт. Проверяется
   прямо: над центром площадки материал есть, над центром ячейки его нет. */
console.log('=== площадка сплошная, ячейка открыта ===');
for(const side of [20, 40]){
  const P = Object.assign(defaultBoxParams(), {tstSrfSide:side, tstInfSide:side});
  const covered = t => { const b = computeBBox(t); let yes = false;
    for(const T of t) if(T.every(v => Math.abs(v[1] - b.maxY) < 1e-6)){
      const xs = T.map(v=>v[0]), zs = T.map(v=>v[2]);
      if(Math.min(...xs) <= 0 && Math.max(...xs) >= 0 && Math.min(...zs) <= 0 && Math.max(...zs) >= 0) yes = true; }
    return yes; };
  chk('площадка '+side+': верх сплошной', covered(buildSurfacePad(1, P)));
  chk('ячейка '+side+': верх открыт', !covered(buildInfillCell(1, P)));
  const mc = manifoldCheck(buildSurfacePad(1, P), 4);
  chk('площадка '+side+': герметична', mc.watertight && mc.badEdges === 0, {open:mc.openEdges, bad:mc.badEdges});
}

/* ПЛИТЫ. Проверяется то, ради чего они собраны: образцы не налезают друг на друга, все влезают в сборку,
   каждый настоящий, и у каждого есть зубья — иначе плита рассыплется на столе. Габариты берутся у
   ПОСТРОЕННЫХ деталей: раскладка их же и мерит, так что тест не повторяет её арифметику, а сверяет
   результат с самими сетками. */
console.log('=== плиты из образцов ===');
for(const rec of PLATE_RECIPES){
  const plan = platePlan(rec.key, defaultBoxParams());
  chk(rec.name+': образцов столько, сколько в рецепте', plan.cells.length === rec.items.length,
      plan.cells.length + ' из ' + rec.items.length);
  chk(rec.name+': все влезают в сборку', plan.cells.length <= MAX_MODELS, plan.cells.length);
  chk(rec.name+': каждый образец — живой режим',
      plan.cells.every(c => MODES.indexOf(c.mode) >= 0), plan.cells.map(c=>c.mode));
  let clash = 0;
  for(let i = 0; i < plan.cells.length; i++) for(let j = i + 1; j < plan.cells.length; j++){
    const a = plan.cells[i], b = plan.cells[j];
    if(Math.abs(a.px - b.px) < (a.w + b.w)/2 - 1e-6 && Math.abs(a.pz - b.pz) < (a.d + b.d)/2 - 1e-6) clash++;
  }
  chk(rec.name+': образцы не налезают друг на друга', clash === 0, clash);
  chk(rec.name+': плита отцентрована',
      Math.abs(Math.max.apply(null, plan.cells.map(c=>c.px + c.w/2)) +
               Math.min.apply(null, plan.cells.map(c=>c.px - c.w/2))) < 1e-6);
  // зубья: у образца с замком габарит по X кратен шагу сетки плюс вылет зуба
  for(const c of plan.cells){
    if(['ruler','tower','spiral'].indexOf(c.mode) >= 0) continue;   // этим замок не полагается
    chk(rec.name+'/'+c.mode+': зубья на месте', Math.abs((c.w - 4)/20 - Math.round((c.w - 4)/20)) < 1e-6,
        +c.w.toFixed(2));
  }
  // и сами сетки настоящие
  chk(rec.name+': сетки непустые и герметичные',
      plan.cells.every(c => c.tris.length > 50 && manifoldCheck(c.tris, 4).watertight));
}
chk('неизвестный рецепт даёт первый, а не исключение', platePlan('нетакой').cells.length > 0);

/* ===============================================================================================
   ТЕСТ ПЕЧАТИ НАЗЫВАЕТ ШАГ СВОЕГО РЯДА (v25.19.0). У печатных тестов есть справочная карточка с «что
   мерит» и «как печатать», и в переписи молчунов они стояли именно поэтому: человеку они говорят —
   просто не предупреждениями. Но карточка СТАТИЧНА, а ряд образцов зависит от ручек: восемь ступеней от
   Ø5 до Ø40 идут через пять миллиметров, а четырнадцать — через два с половиной. ШАГ РЯДА и есть то,
   что тест меряет: он задаёт разрешение ответа, и его-то карточка сказать не может.

   Второе число — ВЫСОТА. Башня на восемь ступеней по двенадцать миллиметров это деталь в десять
   сантиметров; на экране она выглядит так же, как двадцатимиллиметровая. */
console.log('\n=== тест печати называет шаг ряда ===');
{
  const setP = (ov) => { logos.length=0; boxHoles.length=0;
    Object.assign(paramState.box, defaultBoxParams(), {tstMode:'tower'}, ov||{});
    return paramState.box; };
  const warn = (ov) => collectPrintWarnings(setP(ov));
  const line = (ws) => ws.find(x => /^тест «/.test(x));
  const spec = (ov) => testSweepSpec(setP(ov));
  const mesh = (ov) => { setP(ov); return buildTrisForShape('box', paramState.box); };

  chk('тест больше не молчит: на умолчаниях есть строка с рядом', line(warn({})) !== undefined, warn({}));
  /* ВЫСОТА МЕРЯЕТСЯ ПО ДЕТАЛИ. Башня — единственный тест, где ступени стоят друг на друге. */
  {
    const g = spec({}), b = computeBBox(mesh({}));
    chk('высота башни измерена и совпала с плитой плюс ступени',
        Math.abs((b.maxY - b.minY) - g.height) < 0.5,
        {измерено:+(b.maxY - b.minY).toFixed(1), спец:+g.height.toFixed(1)});
    chk('  и названа', /всего 100 мм высоты/.test(line(warn({}))), line(warn({})));
    const g14 = spec({tstN:14}), b14 = computeBBox(mesh({tstN:14}));
    chk('  четырнадцать ступеней и правда выше', Math.abs((b14.maxY - b14.minY) - g14.height) < 0.5 &&
        g14.height > g.height, {измерено:+(b14.maxY - b14.minY).toFixed(1), спец:+g14.height.toFixed(1)});
    chk('  и на такой высоте приложение уже предупреждает',
        g14.tall === true && /долгая печать/.test(warn({tstN:14}).join(' ')));
    chk('  а на умолчаниях молчит — сто миллиметров это его же настройка', g.tall === false, g.height);
  }
  /* ШАГ РЯДА. У башни оба конца заданы ручками, значит между крайними ступенями их N−1. */
  {
    const g = spec({});
    chk('шаг ряда — это диапазон, делённый на число промежутков',
        Math.abs(g.step - (40 - 5)/7) < 1e-9, +g.step.toFixed(3));
    chk('  и он назван', /Ø ступени от 5 до 40 мм с шагом 5/.test(line(warn({}))), line(warn({})));
    chk('  больше ступеней — мельче шаг', spec({tstN:14}).step < g.step);
    /* НИЖНИЙ КОНЕЦ РЯДА УЧАСТВУЕТ. На умолчаниях это не видно: (40−5)/7 и 40/8 дают ровно пять, и
       мутация «делить наибольшее на число ступеней» первый прогон пережила. Смещённый диапазон их
       разводит: (40−10)/7 = 4.29, а 40/8 = 5. */
    chk('  и нижний конец диапазона участвует в шаге',
        Math.abs(spec({tstTowMin:10}).step - (40 - 10)/7) < 1e-9,
        +spec({tstTowMin:10}).step.toFixed(3));
    /* И диаметры в детали и правда идут этим шагом: крайние ступени меряются по габариту. */
    const t = mesh({}), b = computeBBox(t);
    chk('  нижняя ступень в детали — это наибольший Ø', Math.abs((b.maxX - b.minX) - (40 + 6)) < 1.0,
        {измерено:+(b.maxX - b.minX).toFixed(1), ожидалось:46});
  }
  /* СЛИШКОМ МЕЛКИЙ ШАГ. Ряд, отвечающий точнее, чем можно измерить, — это потраченный пластик. */
  {
    const g = spec({tstMode:'wall', tstN:14, tstWallMax:0.5});
    chk('шаг мельче сотки назван нечитаемым', g.tooFine === true && g.step < 0.05, +g.step.toFixed(3));
    chk('  и сказано словами', /мельче того, что различит/.test(
        warn({tstMode:'wall', tstN:14, tstWallMax:0.5}).join(' ')));
    chk('  на умолчаниях стенок шаг читаемый', spec({tstMode:'wall'}).tooFine === false,
        +spec({tstMode:'wall'}).step.toFixed(3));
  }
  /* ТЕСТЫ БЕЗ РЯДА не получают выдуманных ступеней: у них свои ручки, и сказано ровно это. */
  {
    for (const m of ['ruler', 'string', 'spiral', 'infill', 'surface']){
      const g = spec({tstMode:m});
      chk('у теста «' + g.label + '» ряда нет, и ступени не выдуманы',
          g.sweep === false && /ряда образцов у него нет/.test(line(warn({tstMode:m}))),
          line(warn({tstMode:m})));
    }
    for (const m of ['tower', 'dim', 'radius', 'chamfer', 'overhang', 'bridge', 'sphere', 'fit', 'wall', 'fan']){
      chk('  а у теста «' + spec({tstMode:m}).label + '» ряд есть и шаг назван',
          spec({tstMode:m}).sweep === true && /с шагом /.test(line(warn({tstMode:m}))),
          line(warn({tstMode:m})));
    }
  }
  setP({});
}

console.log('\n'+(fail?'FAILED':'ALL PASSED')+': '+pass+' passed, '+fail+' failed');
if(fail) process.exitCode=1;
