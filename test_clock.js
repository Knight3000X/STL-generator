// Настенные часы: циферблат под кварцевый механизм — диск или кольцо на лучах.
//
// Пластина строится ЯЧЕЙКАМИ В ПОЛЯРНЫХ КООРДИНАТАХ: полоса по радиусу × интервал по углу, у каждой
// присутствующей ячейки крышка, дно и стенка с той стороны, где соседа нет. Сетка углов одна на все
// полосы — отсюда замкнутость по построению. Проверять здесь надо не её (она следует из конструкции),
// а то, чего конструкция НЕ гарантирует и что ломается тихо:
//
//   1. МЕТКА СТОИТ НЕ ВСТЫК. Метки — отдельные оболочки, и они обязаны ЗАХОДИТЬ в пластину. Поставленная
//      подошвой ровно на лицо, метка даёт две совпадающие грани нулевой толщины — сетка при этом
//      замкнута, объём верен, manifoldCheck молчит, и увидеть это можно только пересчитав ПЕРЕСЕЧЕНИЯ
//      луча по отдельности, до слияния в отрезки материала: их должно быть четыре на разных высотах.
//
//   2. УГОЛ МЕТКИ ДАЛЬШЕ ОТ ЦЕНТРА, ЧЕМ ЕЁ СЕРЕДИНА. Метка — прямоугольник, а не сектор: её наружные
//      углы лежат на √(r²+h²). Забыть про это значит выпустить угол за обрез пластины, и обе оболочки
//      при этом остаются закрытыми — просто одна торчит из другой.
//
//   3. ЛУЧ — КЛИН, А НЕ БРУСОК, и ширина у него заказана В САМОМ УЗКОМ МЕСТЕ, у ступицы. Проверяется
//      измерением по сетке, причём и радиус ступицы, и радиус обода тоже ИЗМЕРЯЮТСЯ (радиальным
//      прощупыванием в просвете между лучами), а не берутся из той же спецификации, что строила: сверка
//      числа с самим собой проходит и на сломанном коде.
//
//   4. ГРАНЬ КЛИНА, ВЫВЕРНУТАЯ НАИЗНАНКУ, НЕВИДИМА ДЛЯ ОБЪЁМА. Она лежит в плоскости, проходящей через
//      ось, её x·n тождественно ноль, и под интегралом расхождения весит ровно ничего: перевернуть
//      ориентир — объём не изменится ни в последнем разряде. Ловит её только луч ПОПЕРЁК.
//
// Запускать через ./run-all.sh (extraction test).

let pass=0, fail=0;
function chk(n,c,e){ if(c){pass++;console.log('  OK  ',n);} else {fail++;console.log('  FAIL',n,e!==undefined?JSON.stringify(e):'');} }
function vol(t){let v=0;for(const T of t){const a=T[0],b=T[1],c=T[2];v+=(a[0]*(b[1]*c[2]-b[2]*c[1])-a[1]*(b[0]*c[2]-b[2]*c[0])+a[2]*(b[0]*c[1]-b[1]*c[0]))/6;}return v;}
const CL = ov => Object.assign({}, defaultBoxParams(), {clMode:'dial'}, ov||{});
const raw = ov => buildWallClock(CL(ov));
const W   = ov => collectPrintWarnings(CL(ov));
function ship(ov){ logos.length=0; boxHoles.length=0; dieFaces.length=0;
  Object.assign(paramState.box, defaultBoxParams(), {clMode:'dial'}, ov||{});
  return buildTrisForShape('box', paramState.box); }

// Пересечения вертикального луча через (x,z) — СЫРЫЕ, без слияния в отрезки материала.
function pierceY(tris, x, z){
  const hits=[];
  for(const T of tris){ const [a,b,c]=T;
    const d1=(b[0]-a[0])*(z-a[2])-(b[2]-a[2])*(x-a[0]);
    const d2=(c[0]-b[0])*(z-b[2])-(c[2]-b[2])*(x-b[0]);
    const d3=(a[0]-c[0])*(z-c[2])-(a[2]-c[2])*(x-c[0]);
    if(!((d1>=0&&d2>=0&&d3>=0)||(d1<=0&&d2<=0&&d3<=0))) continue;
    const A=(b[0]-a[0])*(c[2]-a[2])-(b[2]-a[2])*(c[0]-a[0]); if(Math.abs(A)<1e-12) continue;
    const w1=((b[0]-x)*(c[2]-z)-(b[2]-z)*(c[0]-x))/A, w2=((c[0]-x)*(a[2]-z)-(c[2]-z)*(a[0]-x))/A;
    const e1=[b[0]-a[0],b[1]-a[1],b[2]-a[2]], e2=[c[0]-a[0],c[1]-a[1],c[2]-a[2]];
    const ny=e1[2]*e2[0]-e1[0]*e2[2];
    if(Math.abs(ny)<1e-12) continue;
    hits.push(w1*a[1]+w2*b[1]+(1-w1-w2)*c[1]);
  }
  return hits.sort((p,q)=>p-q);
}
// Отрезки материала (объединение оболочек) вдоль того же луча.
function runsY(tris, x, z){
  const hits=[];
  for(const T of tris){ const [a,b,c]=T;
    const d1=(b[0]-a[0])*(z-a[2])-(b[2]-a[2])*(x-a[0]);
    const d2=(c[0]-b[0])*(z-b[2])-(c[2]-b[2])*(x-b[0]);
    const d3=(a[0]-c[0])*(z-c[2])-(a[2]-c[2])*(x-c[0]);
    if(!((d1>=0&&d2>=0&&d3>=0)||(d1<=0&&d2<=0&&d3<=0))) continue;
    const A=(b[0]-a[0])*(c[2]-a[2])-(b[2]-a[2])*(c[0]-a[0]); if(Math.abs(A)<1e-12) continue;
    const w1=((b[0]-x)*(c[2]-z)-(b[2]-z)*(c[0]-x))/A, w2=((c[0]-x)*(a[2]-z)-(c[2]-z)*(a[0]-x))/A;
    const e1=[b[0]-a[0],b[1]-a[1],b[2]-a[2]], e2=[c[0]-a[0],c[1]-a[1],c[2]-a[2]];
    const ny=e1[2]*e2[0]-e1[0]*e2[2];
    if(Math.abs(ny)<1e-12) continue;
    hits.push([w1*a[1]+w2*b[1]+(1-w1-w2)*c[1], ny<0?1:-1]);
  }
  hits.sort((p,q)=>p[0]-q[0]);
  const runs=[]; let d=0, st=null;
  for(const [t0,dd] of hits){ const pr=d; d+=dd;
    if(pr<=0&&d>0) st=t0; else if(pr>0&&d<=0){ if(st!==null&&t0-st>1e-6) runs.push([st,t0]); st=null; } }
  return runs;
}
/* Отрезки материала вдоль X на высоте y и глубине z. Нужен именно ГОРИЗОНТАЛЬНЫЙ луч: объём слеп к
   вывернутой грани клина — она проходит через ось, её x·n тождественно ноль, и знак под интегралом
   ничего не меняет. Луч поперёк такой грани — меняет. */
function runsX(tris, y, z){
  const hits=[];
  for(const T of tris){ const [a,b,c]=T;
    const d1=(b[1]-a[1])*(z-a[2])-(b[2]-a[2])*(y-a[1]);
    const d2=(c[1]-b[1])*(z-b[2])-(c[2]-b[2])*(y-b[1]);
    const d3=(a[1]-c[1])*(z-c[2])-(a[2]-c[2])*(y-c[1]);
    if(!((d1>=0&&d2>=0&&d3>=0)||(d1<=0&&d2<=0&&d3<=0))) continue;
    const A=(b[1]-a[1])*(c[2]-a[2])-(b[2]-a[2])*(c[1]-a[1]); if(Math.abs(A)<1e-12) continue;
    const w1=((b[1]-y)*(c[2]-z)-(b[2]-z)*(c[1]-y))/A, w2=((c[1]-y)*(a[2]-z)-(c[2]-z)*(a[1]-y))/A;
    const e1=[b[0]-a[0],b[1]-a[1],b[2]-a[2]], e2=[c[0]-a[0],c[1]-a[1],c[2]-a[2]];
    const nx=e1[1]*e2[2]-e1[2]*e2[1];
    if(Math.abs(nx)<1e-12) continue;
    hits.push([w1*a[0]+w2*b[0]+(1-w1-w2)*c[0], nx<0?1:-1]);
  }
  hits.sort((p,q)=>p[0]-q[0]);
  const runs=[]; let d=0, st=null;
  for(const [t0,dd] of hits){ const pr=d; d+=dd;
    if(pr<=0&&d>0) st=t0; else if(pr>0&&d<=0){ if(st!==null&&t0-st>1e-6) runs.push([st,t0]); st=null; } }
  return runs;
}
const polar = (r,a) => [r*Math.sin(a), -r*Math.cos(a)];
const atR   = (t,r,a) => { const q = polar(r,a); return runsY(t, q[0], q[1]); };
const pierceAt = (t,r,a) => { const q = polar(r,a); return pierceY(t, q[0], q[1]); };
/* ТРАССИРОВКА ЛУЧА ВРЁТ, КОГДА ЛУЧ ПОПАДАЕТ РОВНО НА ДИАГОНАЛЬ ТРИАНГУЛЯЦИИ. Точка на общем ребре двух
   треугольников может быть отвергнута ОБОИМИ: у каждого из них знак по этому ребру выходит нулевым с
   разной стороны от нуля, и «все знаки одинаковы» не выполняется ни там, ни там. Сплошной материал
   читается тогда пустотой. Замерено: на кольце с пятью лучами радиус 14.8 мм в просвете между лучами
   дал пусто, хотя 14.7 и 14.9 — сплошь; двоичный поиск кромки ступицы уехал с 15.5 на 14.9, а объём
   разошёлся с аналитикой на 22 %.
   Поэтому каждое прощупывание делается ТРИЖДЫ, со смещением ПОПЕРЁК измеряемой оси: радиальный поиск
   качает угол, угловой — радиус. Смещение выбрано так, чтобы не влиять на измеряемое число: 2e-4 рад
   это 3 микрона у ступицы, 2e-3 мм по радиусу — микрон поперёк луча. */
const solidRad = (t, r, a) => atR(t,r,a).length>0 || atR(t,r,a+2e-4).length>0 || atR(t,r,a-2e-4).length>0;
const solidAng = (t, r, a) => atR(t,r,a).length>0 || atR(t,r+2e-3,a).length>0 || atR(t,r-2e-3,a).length>0;
/* Граница материала двоичным делением. f истинно в xIn и ложно в xOut. Линейный проход с шагом 0.002
   по сотне миллиметров стоит десятки тысяч трассировок луча — этот файл был бы тогда самым долгим в
   батарее, а точность та же. */
function edge(f, xIn, xOut){
  for(let i = 0; i < 44; i++){ const m = (xIn + xOut)/2; if(f(m)) xIn = m; else xOut = m; }
  return (xIn + xOut)/2;
}
/* Контур — ВПИСАННЫЙ многоугольник, поэтому измеренный радиус кромки всегда чуть меньше заказанного:
   на стороне между узлами он проседает на r·(1−cos(π/n)). При n≈650 это 1.2e-3 мм на радиусе 105 —
   отсюда допуск 0.002, а не 1e-6. Число не подогнано: оно и есть эта стрелка прогиба с запасом. */
const SAGITTA = 0.002;
const bbox = t => { const lo=[1e9,1e9,1e9], hi=[-1e9,-1e9,-1e9];
  for(const T of t) for(const v of T) for(let i=0;i<3;i++){ if(v[i]<lo[i])lo[i]=v[i]; if(v[i]>hi[i])hi[i]=v[i]; }
  return {lo,hi}; };
const maxRad = (t, above) => { let m=0;
  for(const T of t) for(const v of T) if(above===undefined || v[1]>above) m=Math.max(m, Math.hypot(v[0],v[2]));
  return m; };

console.log('=== часы: герметичность по всему диапазону ===');
{
  let bad = 0, worst = null, minVol = 1e18, cnt = 0;
  for(const shape of ['disc','ring'])
    for(const marks of ['none','quarters','hours','all'])
      for(const D of [60, 130, 250, 400])
        for(const cfg of [{}, {clShaftD:30}, {clRays:2}, {clRays:12}, {clRayW:40}, {clRimW:5}, {clT:12, clMarkH:10},
                          {clRimW:40}, {clHubD:8}, {clHubD:200}, {clMarkW:40}]){
          const ov = Object.assign({clShape:shape, clMarks:marks, clD:D}, cfg);
          const t = raw(ov), m = manifoldCheck(t, 6);
          cnt++;
          if(!m.watertight){ bad++; if(!worst) worst = {ov, open:m.openEdges, badE:m.badEdges}; }
          minVol = Math.min(minVol, vol(t));
        }
  chk('352 сочетания герметичны на сыром построителе', bad === 0 && cnt === 352, worst || cnt);
  chk('объём везде положителен (нормали наружу)', minVol > 0, minVol);
}
{
  let degen = 0;
  for(const ov of [{}, {clShape:'ring'}, {clShape:'ring', clRays:12, clRayW:40}, {clMarks:'all', clD:60}])
    for(const T of raw(ov)){
      const e1=[T[1][0]-T[0][0],T[1][1]-T[0][1],T[1][2]-T[0][2]], e2=[T[2][0]-T[0][0],T[2][1]-T[0][1],T[2][2]-T[0][2]];
      const n=[e1[1]*e2[2]-e1[2]*e2[1], e1[2]*e2[0]-e1[0]*e2[2], e1[0]*e2[1]-e1[1]*e2[0]];
      if(Math.hypot(n[0],n[1],n[2])/2 < 1e-9) degen++;
    }
  chk('вырожденных треугольников нет', degen === 0, degen);
}

console.log('=== габарит и посадка на стол ===');
{
  const t = raw({clD:250, clT:4, clMarkH:2}), b = bbox(t);
  chk('габарит вписан в диаметр и не больше него',
      b.hi[0]-b.lo[0] <= 250 + 1e-9 && b.hi[2]-b.lo[2] <= 250 + 1e-9 &&
      b.hi[0]-b.lo[0] > 249.99 && b.hi[2]-b.lo[2] > 249.99, [b.hi[0]-b.lo[0], b.hi[2]-b.lo[2]]);
  chk('а вершины края лежат на окружности радиуса 125 точно', Math.abs(maxRad(t) - 125) < 1e-9, maxRad(t));
  chk('высота = пластина + метка', Math.abs((b.hi[1]-b.lo[1]) - 6) < 1e-9, b.hi[1]-b.lo[1]);
  chk('центрировано по всем осям',
      Math.abs(b.hi[0]+b.lo[0])<1e-9 && Math.abs(b.hi[1]+b.lo[1])<1e-9 && Math.abs(b.hi[2]+b.lo[2])<1e-9);
  // Спинка ПЛОСКАЯ: печатается лицом вверх, и вся тыльная сторона обязана лежать в одной плоскости.
  let off = 0;
  for(const T of t) for(const v of T) if(v[1] < b.lo[1] + 0.5) off = Math.max(off, Math.abs(v[1]-b.lo[1]));
  chk('спинка плоская — ни одной вершины вне плоскости стола', off < 1e-12, off);
  const b2 = bbox(raw({clMarks:'none'}));
  chk('без меток высота = толщине пластины', Math.abs((b2.hi[1]-b2.lo[1]) - 4) < 1e-9, b2.hi[1]-b2.lo[1]);
}

console.log('=== отверстие под вал — сквозное ===');
{
  const t = raw({clD:250, clShaftD:11, clT:4});
  chk('на оси материала нет', !solidRad(t, 0.0001, 0.13));
  chk('в 3 мм от оси (внутри Ø11) материала нет', !solidRad(t, 3.0, 0.13));
  const r1 = atR(t, 7.3, 0.13);
  chk('в 7.3 мм от оси (снаружи Ø11) — один отрезок', r1.length === 1, r1);
  chk('и он ровно в толщину пластины', r1.length===1 && Math.abs((r1[0][1]-r1[0][0]) - 4) < 1e-9, r1);
  const rEdge = edge(r => solidRad(t, r, 0.13), 12, 3);
  chk('кромка отверстия на 5.5 мм (Ø11)', Math.abs(rEdge - 5.5) < SAGITTA, rEdge);
}
{
  const t = raw({clD:250, clShaftD:24, clT:6});
  const rEdge = edge(r => solidRad(t, r, 0.13), 20, 6);
  chk('другой Ø вала — кромка следом (Ø24 → 12 мм)', Math.abs(rEdge - 12) < SAGITTA, rEdge);
}

console.log('=== диск: между валом и краем сплошь материал ===');
{
  const t = raw({clD:250, clT:4, clMarks:'hours'});
  let holes = 0, wrong = 0;
  for(let r = 7; r < 124; r += 0.7){
    const rr = atR(t, r, 0.2618);         // 15° — ровно между часовыми метками
    if(rr.length !== 1) holes++;
    else if(Math.abs((rr[0][1]-rr[0][0]) - 4) > 1e-9) wrong++;
  }
  chk('167 радиусов подряд: везде ровно один отрезок', holes === 0, holes);
  chk('и везде ровно 4 мм толщины', wrong === 0, wrong);
}

console.log('=== метка стоит НЕ ВСТЫК (она заходит в пластину) ===');
{
  const ov = {clD:250, clT:4, clMarkH:2, clMarks:'hours'};
  const t = raw(ov), s = clockSpec(CL(ov));
  const rMid = s.rOut - s.qL/2;
  const h = pierceAt(t, rMid, 0.004);     // на 0.004 рад от осевой линии метки «12»
  chk('четыре пересечения луча, а не два', h.length === 4, h);
  const gaps = h.slice(1).map((v,i) => v - h[i]);
  chk('все четыре на РАЗНЫХ высотах — совпадающих граней нет', Math.min.apply(null, gaps) > 0.3, gaps);
  chk('подошва метки утоплена ровно на 0.6 мм', Math.abs(gaps[1] - 0.6) < 1e-9, gaps[1]);
  const r = atR(t, rMid, 0.004);
  chk('в объединении это ОДИН отрезок (пустоты между меткой и пластиной нет)', r.length === 1, r);
  chk('и он ровно пластина + метка = 6 мм', Math.abs((r[0][1]-r[0][0]) - 6) < 1e-9, r);
  // Метка на ЛИЦЕ (+Y), а не с изнанки: низ у неё общий с пластиной, верх выше.
  const plain = atR(t, rMid, 0.2618);
  chk('низ под меткой и низ пластины совпадают', Math.abs(r[0][0] - plain[0][0]) < 1e-12);
  chk('верх метки выше верха пластины ровно на её высоту',
      Math.abs((r[0][1] - plain[0][1]) - 2) < 1e-9, r[0][1] - plain[0][1]);
}
{
  for(const mh of [0.4, 2, 5, 10]){
    const ov = {clD:250, clT:4, clMarkH:mh};
    const t = raw(ov), s = clockSpec(CL(ov));
    const r = atR(t, s.rOut - s.qL/2, 0.004);
    chk('высота метки ' + mh + ' мм получилась', r.length===1 && Math.abs((r[0][1]-r[0][0]) - (4+mh)) < 1e-9, r);
  }
}

console.log('=== циферблат смотрит правильно: 12 в −Z, 3 в +X ===');
{
  const ov = {clD:250, clMarks:'hours'};
  const t = raw(ov), s = clockSpec(CL(ov)), rMid = s.rOut - s.qL/2;
  const tall1 = a => { const r = atR(t, rMid, a); return r.length===1 && (r[0][1]-r[0][0]) > 4.5; };
  const tall = a => tall1(a) || tall1(a + 2e-4) || tall1(a - 2e-4);
  chk('метка на 12 часах (φ=0, то есть −Z)', tall(0.004));
  chk('метка на 3 часах (φ=90°, то есть +X)', tall(Math.PI/2 + 0.004));
  chk('метка на 6 часах (+Z)', tall(Math.PI + 0.004));
  chk('между часами метки нет', !tall(0.2618));
  const q = polar(rMid, 0.004);
  chk('«двенадцать» действительно в минус Z', q[1] < -100 && Math.abs(q[0]) < 2, q);
  const q3 = polar(rMid, Math.PI/2 + 0.004);
  chk('«тройка» действительно в плюс X', q3[0] > 100 && Math.abs(q3[1]) < 2, q3);
}

console.log('=== сколько меток на самом деле ===');
{
  /* Считаем не сплошным обходом, а ПО ПОЗИЦИЯМ: приподнят ли материал на каждом из шестидесяти делений
     и — отдельно — МЕЖДУ ними. Второе важнее первого: оно ловит метки, слипшиеся с соседками, а обход
     с шагом такую пару считает одной и молчит. */
  const count = (ov) => {
    const t = raw(ov), s = clockSpec(CL(ov));
    const rMid = s.rOut - s.minL/2;       // радиус, который пересекают ВСЕ метки, включая минутные
    const tall1 = a => { const r = atR(t, rMid, a); return r.length===1 && (r[0][1]-r[0][0]) > 4.5; };
    const tall = a => tall1(a) || tall1(a + 2e-4) || tall1(a - 2e-4);
    let onSlots = 0, onMid = 0;
    for(let k = 0; k < 60; k++){
      if(tall((k + 0.0012)*Math.PI/30)) onSlots++;
      if(tall((k + 0.5)*Math.PI/30)) onMid++;
    }
    return {onSlots, onMid, s};
  };
  for(const [mode, want] of [['none',0],['quarters',4],['hours',12],['all',60]]){
    const c = count({clD:250, clMarks:mode});
    chk('режим «' + mode + '» даёт ' + want + ' меток', c.onSlots === want, c.onSlots);
    chk('и между делениями пусто', c.onMid === 0, c.onMid);
  }
  /* ШИРИНА, УРЕЗАННАЯ ШАГОМ МЕТОК, а не углом. У шестидесяти делений шаг вчетверо мельче, чем у
     двенадцати, и заказанные 40 мм слепили бы весь ряд в сплошное кольцо. Потолок по углу метки тут не
     срабатывает вовсе — он позволяет почти 40, — поэтому без потолка по шагу это видно только здесь. */
  const c = count({clD:250, clMarks:'all', clMarkW:40});
  chk('шестьдесят меток по 40 мм остаются шестьюдесятью', c.onSlots === 60, c.onSlots);
  chk('и между ними по-прежнему пусто', c.onMid === 0, c.onMid);
  chk('ширина при этом урезана', c.s.hourW < 40 - 0.05 && c.s.hourWwant === 40, c.s.hourW);
}

console.log('=== часовая, четвертная и минутная — разного размера ===');
{
  const ov = {clD:250, clMarks:'all'};
  const t = raw(ov), s = clockSpec(CL(ov)), b = bbox(t), topPlate = b.lo[1] + s.T;
  const hi3 = rr => rr.length === 1 && rr[0][1] > topPlate + 1e-9;
  const raisedRad = (r, a) => hi3(atR(t,r,a)) || hi3(atR(t,r,a+2e-4)) || hi3(atR(t,r,a-2e-4));
  const raisedAng = (r, a) => hi3(atR(t,r,a)) || hi3(atR(t,r+2e-3,a)) || hi3(atR(t,r-2e-3,a));
  const lenAt = a => s.rOut - edge(r => !raisedRad(r, a), s.shaftR, s.rOut - 0.05);
  const lQ = lenAt(0.004), lH = lenAt(Math.PI/6 + 0.004), lM = lenAt(Math.PI/30 + 0.004);
  chk('четвертная длиннее часовой, часовая длиннее минутной', lQ > lH + 1 && lH > lM + 1, {lQ, lH, lM});
  chk('четвертная ровно в CLOCK_QUARTER раз длиннее часовой', Math.abs(lQ/lH - CLOCK_QUARTER) < 0.01, lQ/lH);
  // Окно ±0.05 рад: соседние минутные метки стоят через 0.105 рад, и окно пошире меряло бы ИХ.
  const widAt = (c) => { const r = s.rOut - 0.5, W = 0.05;
    const lo = edge(a => !raisedAng(r, a), c - W, c + 0.004);
    const hi = edge(a => !raisedAng(r, a), c + W, c - 0.004);
    return 2*r*Math.sin((hi - lo)/2); };
  const wQ = widAt(0), wH = widAt(Math.PI/6), wM = widAt(Math.PI/30);
  chk('и по ширине тот же порядок', wQ > wH + 0.5 && wH > wM + 0.5, {wQ, wH, wM});
  chk('часовая метка шириной ровно 4 мм (0.016 от Ø250)', Math.abs(wH - 4) < 0.05, wH);
}

console.log('=== цифры: римские и греческие ===');
{
  /* САМАЯ ДОРОГАЯ ОШИБКА ЗДЕСЬ — ГОМОГЛИФ. Греческая йота «Ι» (U+0399) и латинская «I» (U+0049)
     выглядят одинаково и печатаются одной клавишей, но это разные символы: запись одиннадцати «ΙΑ»
     набрана греческими буквами, и без отдельного ключа в таблице глифов первый знак просто пропадал —
     молча, потому что отсутствующий глиф пропускается. Проверка перебирает КАЖДЫЙ символ КАЖДОЙ записи. */
  for(const set of ['roman','greek']){
    const miss = [];
    for(const str of CLOCK_NUMERALS[set]) for(const ch of str)
      if(!CLOCK_GLYPHS[ch]) miss.push(ch + ' (U+' + ch.charCodeAt(0).toString(16).toUpperCase() + ')');
    chk('«' + set + '»: у каждого символа есть глиф', miss.length === 0, miss);
    chk('«' + set + '»: записей ровно двенадцать', CLOCK_NUMERALS[set].length === 12);
  }
  chk('римская четвёрка — IIII, а не IV (часовая традиция)', CLOCK_NUMERALS.roman[3] === 'IIII',
      CLOCK_NUMERALS.roman[3]);
  chk('греческая шестёрка — дигамма Ϝ', CLOCK_NUMERALS.greek[5] === '\u03DC', CLOCK_NUMERALS.greek[5]);
  chk('одиннадцать и двенадцать — ΙΑ и ΙΒ',
      CLOCK_NUMERALS.greek[10] === '\u0399\u0391' && CLOCK_NUMERALS.greek[11] === '\u0399\u0392',
      [CLOCK_NUMERALS.greek[10], CLOCK_NUMERALS.greek[11]]);
}
{
  /* КАЖДЫЙ ГЛИФ ПО ОТДЕЛЬНОСТИ ГЕРМЕТИЧЕН. Здесь ловится совпадение граней на стыке штрихов: у «Γ», «Ε»
     и «Ϝ» верх стойки — это ещё и начало перекладины, и при продлении концов ровно на полтолщины торец
     одного прямоугольника вставал заподлицо с боковой гранью другого. Открытых рёбер при этом ноль,
     объём верен, вид правильный — видно только по пересчёту рёбер. */
  const glyphTris = ch => {
    const out = [], h = 20, half = 1.5;
    for(const g of clockStrStrokes(ch)){
      const A = [g[0][0]*h, g[0][1]*h], B = [g[1][0]*h, g[1][1]*h];
      const dx = B[0]-A[0], dz = B[1]-A[1], L = Math.hypot(dx,dz); if(L < 1e-9) continue;
      const px = -dz/L*half, pz = dx/L*half, ex = dx/L*half*CLOCK_JOINT, ez = dz/L*half*CLOCK_JOINT;
      for(const T of extrudePolyYTris([[[A[0]-ex+px,A[1]-ez+pz],[B[0]+ex+px,B[1]+ez+pz],
        [B[0]+ex-px,B[1]+ez-pz],[A[0]-ex-px,A[1]-ez-pz]]], 0, 3)) out.push(T);
    }
    return out;
  };
  let bad = 0, worst = null;
  for(const ch of Object.keys(CLOCK_GLYPHS)){
    const m = manifoldCheck(glyphTris(ch), 6);
    if(!m.watertight){ bad++; if(!worst) worst = {ch, open:m.openEdges, bad:m.badEdges}; }
  }
  chk('каждый глиф в отдельности герметичен', bad === 0, worst);
  chk('продление на стыке НЕ равно полтолщины — иначе грани совпадут', CLOCK_JOINT !== 1, CLOCK_JOINT);
  /* НИ ОДНА ПАРА ШТРИХОВ НЕ ЛЕЖИТ НА ОДНОЙ ПРЯМОЙ, ПЕРЕКРЫВАЯСЬ. Пересчёт рёбер этого не видит и не
     может: у двух пересекающихся штрихов верхние грани и так на одной высоте — это не порок, материал
     есть под обеими. Порок — когда штрихи СООСНЫ и один лежит внутри другого: тогда совпадают ещё и
     боковые грани, а лишний прямоугольник вдобавок торчит наружу шпорой. Так получалось на «Γ», «Ε» и
     «Ϝ», где верх стойки — это ещё и начало перекладины: засечка по правилу вставала ровно на неё. */
  let over = 0, ovAt = null;
  for(const ch of Object.keys(CLOCK_GLYPHS)){
    const g = clockStrStrokes(ch);
    for(let i = 0; i < g.length; i++) for(let j = i+1; j < g.length; j++){
      const a1 = g[i][0], b1 = g[i][1], a2 = g[j][0], b2 = g[j][1];
      const d1 = [b1[0]-a1[0], b1[1]-a1[1]], d2 = [b2[0]-a2[0], b2[1]-a2[1]];
      const L1 = Math.hypot(d1[0], d1[1]), L2 = Math.hypot(d2[0], d2[1]);
      if(L1 < 1e-9 || L2 < 1e-9) continue;
      if(Math.abs(d1[0]*d2[1] - d1[1]*d2[0])/(L1*L2) > 1e-9) continue;      // не параллельны
      const off = Math.abs((a2[0]-a1[0])*d1[1] - (a2[1]-a1[1])*d1[0])/L1;
      if(off > 1e-9) continue;                                              // параллельны, но не соосны
      const t1 = ((a2[0]-a1[0])*d1[0] + (a2[1]-a1[1])*d1[1])/(L1*L1);
      const t2 = ((b2[0]-a1[0])*d1[0] + (b2[1]-a1[1])*d1[1])/(L1*L1);
      if(Math.min(t1,t2) < 1 - 1e-9 && Math.max(t1,t2) > 1e-9){ over++; if(!ovAt) ovAt = {ch, i, j}; }
    }
  }
  chk('соосных перекрывающихся штрихов нет ни в одном глифе', over === 0, ovAt);
}
{
  let bad = 0, worst = null, n = 0;
  for(const set of ['roman','greek'])
    for(const D of [60, 130, 250, 400])
      for(const marks of ['none','hours','all'])
        for(const up of [false, true])
          for(const shape of ['disc','ring']){
            const ov = {clNum:set, clD:D, clMarks:marks, clNumUp:up, clShape:shape};
            const t = raw(ov), m = manifoldCheck(t, 6); n++;
            if(!m.watertight){ bad++; if(!worst) worst = {ov, open:m.openEdges, badE:m.badEdges}; }
          }
  chk('96 сочетаний с цифрами герметичны', bad === 0 && n === 96, worst || n);
}
{
  /* СЧИТАТЬ НАДО ЦИФРЫ, А НЕ ШТРИХИ. Первая версия считала угловые группы приподнятого материала и
     насчитала 32 у римских: «III» — это три отдельных штриха, и каждый читается своей группой. И щупать
     ровно в середине цифры тоже нельзя: у «II» там ПРОСВЕТ между двумя единицами. Меряем иначе — есть ли
     материал хоть где-то в пределах своей цифры, и нет ли его ровно между часами. */
  for(const set of ['roman','greek']){
    const ov = {clNum:set, clD:250, clMarks:'none'};
    const t = raw(ov), s = clockSpec(CL(ov)), b = bbox(t);
    const topPlate = b.lo[1] + s.T;
    const upAt = a => { const rr = atR(t, s.numR, a); return rr.length === 1 && rr[0][1] > topPlate + 1e-9; };
    const halfSpan = (s.wMax*s.numH/2)/s.numR;
    let miss = 0;
    for(let k = 1; k <= 12; k++){
      let seen = false;
      for(let j = -20; j <= 20 && !seen; j++) if(upAt(k*Math.PI/6 + halfSpan*j/20)) seen = true;
      if(!seen) miss++;
    }
    chk('«' + set + '»: цифра стоит на каждом из двенадцати часов', miss === 0, miss);
    let between = 0;
    for(let k = 0; k < 12; k++) if(upAt((k + 0.5)*Math.PI/6)) between++;
    chk('  а ровно между часами пусто', between === 0, between);
  }
}
{
  /* РАЗВОРОТ. По радиусу «III» на трёх часах ложится на бок: три штриха расходятся вдоль Z. Прямо —
     вдоль X. А на двенадцати часах оба разворота ОБЯЗАНЫ совпасть: там радиус и вертикаль — одно и то
     же направление, и несовпадение означало бы перепутанные орты. */
  const spread = (ov, k) => {
    const t = raw(ov), s = clockSpec(CL(ov)), b = bbox(t), top = b.lo[1] + s.T;
    const a = k*Math.PI/6, cx = s.numR*Math.sin(a), cz = -s.numR*Math.cos(a);
    let lo = [1e9,1e9], hi = [-1e9,-1e9];
    for(const T of t) for(const v of T) if(v[1] > top + 1e-9 && Math.hypot(v[0]-cx, v[2]-cz) < s.numH*1.2){
      lo[0] = Math.min(lo[0], v[0]); hi[0] = Math.max(hi[0], v[0]);
      lo[1] = Math.min(lo[1], v[2]); hi[1] = Math.max(hi[1], v[2]); }
    return [hi[0]-lo[0], hi[1]-lo[1]];
  };
  const rad3 = spread({clNum:'roman', clMarks:'none'}, 3);
  const up3  = spread({clNum:'roman', clMarks:'none', clNumUp:true}, 3);
  chk('по радиусу «III» на трёх часах вытянута вдоль Z', rad3[1] > rad3[0], rad3);
  chk('прямо — вдоль X', up3[0] > up3[1], up3);
  /* И ЭТО РОВНО ПОВОРОТ НА 90°, а не «примерно на бок»: габариты обязаны ПЕРЕСТАВИТЬСЯ. Утверждение про
     отношение сторон было бы слабее и притом неверным — у «III» стороны отличаются всего в 1.1 раза. */
  chk('и один разворот — точная перестановка другого',
      Math.abs(rad3[0] - up3[1]) < 1e-9 && Math.abs(rad3[1] - up3[0]) < 1e-9, [rad3, up3]);
  const rad12 = spread({clNum:'roman', clMarks:'none'}, 12);
  const up12  = spread({clNum:'roman', clMarks:'none', clNumUp:true}, 12);
  chk('а на двенадцати часах развороты совпадают',
      Math.abs(rad12[0]-up12[0]) < 1e-9 && Math.abs(rad12[1]-up12[1]) < 1e-9, [rad12, up12]);
}
{
  /* ВЫСОТА. Осевые линии глифа лежат ровно между нулём и единицей — это проверяется на чистой функции,
     без сетки. В сетке к ним прибавляется толщина штриха на обоих концах, и не ровно она: у «X» концы
     диагоналей срезаны наискось и уходят чуть дальше. Поэтому по сетке проверяется не равенство, а то,
     что превышение — это именно толщина штриха, а не что-то ещё. */
  for(const set of ['roman','greek']){
    let lo = 1e9, hi = -1e9;
    for(const str of CLOCK_NUMERALS[set]) for(const g of clockStrStrokes(str)) for(const q of g){
      lo = Math.min(lo, q[1]); hi = Math.max(hi, q[1]); }
    chk('«' + set + '»: осевые линии стоят ровно от нуля до единицы',
        Math.abs(lo) < 1e-12 && Math.abs(hi - 1) < 1e-12, [lo, hi]);
  }
  for(const h of [8, 14, 22]){
    const ov = {clNum:'roman', clD:400, clMarks:'none', clNumH:h};
    const t = raw(ov), s = clockSpec(CL(ov)), b = bbox(t), top = b.lo[1] + s.T;
    let rlo = 1e9, rhi = 0;
    for(const T of t) for(const v of T) if(v[1] > top + 1e-9 && Math.abs(v[0]) < s.numH && v[2] < 0){
      const r = Math.hypot(v[0], v[2]); rlo = Math.min(rlo, r); rhi = Math.max(rhi, r); }
    const over = (rhi - rlo) - h;
    chk('высота цифры ' + h + ' мм получилась, а лишнее — толщина штриха',
        over > s.numStroke*0.8 && over < s.numStroke*1.6, {measured: rhi - rlo, h, stroke: s.numStroke, over});
  }
}
{
  // Цифры не вылезают за обрез и не лезут в метки.
  for(const ov of [{clNum:'roman'}, {clNum:'greek'}, {clNum:'roman', clD:60}, {clNum:'greek', clNumH:60}]){
    const t = raw(ov), s = clockSpec(CL(ov)), R = (ov.clD || 250)/2;
    chk(JSON.stringify(ov) + ': самая дальняя вершина — по-прежнему край пластины',
        Math.abs(maxRad(t) - R) < 1e-6, maxRad(t));
    chk('  и цифры не выходят за наружный край меток',
        s.numR + s.numH/2 <= s.rOut - (s.marksFit ? s.qL : 0) + 1e-9,
        {numOuter: s.numR + s.numH/2, marksInner: s.rOut - s.qL});
  }
}
{
  // Толщина штриха — заказанная.
  for(const wv of [1, 2.4, 5]){
    const s = clockSpec(CL({clNum:'roman', clD:400, clNumW:wv}));
    chk('толщина штриха ' + wv + ' мм принята', Math.abs(s.numStroke - wv) < 1e-9, s.numStroke);
  }
  chk('на кольце с метками цифрам места нет — и об этом сказано',
      W({clNum:'roman', clShape:'ring'}).some(x => /цифрам не осталось места/.test(x)),
      W({clNum:'roman', clShape:'ring'}));
  chk('автовысота не считается урезанием и не жалуется',
      !W({clNum:'roman'}).some(x => /цифра уменьшена/.test(x)), W({clNum:'roman'}));
  chk('а введённая — жалуется', W({clNum:'greek', clNumH:60}).some(x => /цифра уменьшена/.test(x)));
  chk('без цифр про них не говорится', !W({}).some(x => /цифр/.test(x)));
}

console.log('=== метка не вылезает за обрез пластины ===');
{
  for(const ov of [{clD:250}, {clD:100, clMarks:'quarters', clMarkW:40}, {clD:400, clMarkW:40},
                   {clD:60, clMarks:'all'}, {clD:100, clMarks:'hours', clMarkW:40}]){
    const t = raw(ov), R = (ov.clD||250)/2, b = bbox(t);
    const rAll = maxRad(t), rMark = maxRad(t, b.lo[1] + (ov.clT||4) + 1e-6);
    const tag = 'Ø' + (ov.clD||250) + ' ' + (ov.clMarks||'hours');
    chk(tag + ': самая дальняя вершина — край пластины', Math.abs(rAll - R) < 1e-6, rAll);
    chk(tag + ': ни один угол метки не выходит за обрез', rMark < R - 1e-9, {rMark, R});
  }
}
{
  const ov = {clD:100, clMarks:'quarters', clMarkW:40};
  const s = clockSpec(CL(ov));
  chk('ширина метки урезана против заказанных 40 мм', s.hourW < 40 - 0.05, s.hourW);
  chk('и урезание объявлено', collectPrintWarnings(CL(ov)).some(x => /сужена/.test(x)),
      collectPrintWarnings(CL(ov)));
  // Ожидание считается НЕЗАВИСИМО: угол на √(rOut²+h²) обязан уложиться в R − 0.3.
  const R = 50, rOut = R - Math.max(1.5, 100*0.012);
  const hMax = Math.sqrt((R-0.3)*(R-0.3) - rOut*rOut);
  chk('и урезана ровно до того, что помещается углом', Math.abs(s.qW/2 - hMax) < 1e-9, {half:s.qW/2, hMax});
}

console.log('=== кольцо на лучах: просветы пустые, лучи на месте ===');
{
  const ov = {clShape:'ring', clD:250, clRays:4, clRayW:8, clT:4};
  const t = raw(ov), s = clockSpec(CL(ov));
  const rMid = (s.hubR + s.Rin)/2;
  chk('между лучами (45°) материала нет', !solidRad(t, rMid, Math.PI/4));
  const on = atR(t, rMid, 0.002);
  chk('на оси луча — один отрезок в толщину пластины',
      on.length === 1 && Math.abs((on[0][1]-on[0][0]) - 4) < 1e-9, on);
  chk('ступица вокруг вала сплошная', atR(t, s.shaftR + 1.7, Math.PI/4).length === 1);
  chk('обод сплошной', atR(t, s.R - 1.3, Math.PI/4 + 0.01).length === 1);
  // Кромки ступицы и обода ИЗМЕРЯЮТСЯ в просвете между лучами, а не берутся из спецификации.
  const solid = r => solidRad(t, r, Math.PI/4);
  const rHub = edge(solid, s.shaftR + 1, rMid), rRim = edge(solid, s.R - 1, rMid);
  chk('наружная кромка ступицы найдена', Math.abs(rHub - s.hubR) < SAGITTA, {rHub, spec:s.hubR});
  chk('внутренняя кромка обода найдена', Math.abs(rRim - s.Rin) < SAGITTA, {rRim, spec:s.Rin});
  const widthAt = (r) => {
    const lo = edge(a => !solidAng(t, r, a), -0.6, 0.02);
    const hi = edge(a => !solidAng(t, r, a),  0.6, -0.02);
    return 2*r*Math.sin((hi - lo)/2);
  };
  /* Мерить ровно НА кромке ступицы нельзя — там луч граничит со сплошной ступицей, — поэтому меряем на
     0.05 мм дальше и приводим обратно по закону клина (ширина ∝ радиус). Оба радиуса ИЗМЕРЕНЫ, а
     сверяется результат с ЗАКАЗАННЫМИ 8 мм: со спецификацией, которая строила, он не сверяется нигде. */
  const wHub = widthAt(rHub + 0.05), wAtHub = wHub*rHub/(rHub + 0.05);
  chk('ширина луча у ступицы — заказанные 8 мм', Math.abs(wAtHub - 8) < 0.01, wAtHub);
  const wRim = widthAt(rRim - 0.05);
  chk('к ободу луч расширяется', wRim > wHub + 1, {wHub, wRim});
  chk('и расширяется РОВНО как клин: ширины относятся как радиусы',
      Math.abs(wRim/wHub - (rRim - 0.05)/(rHub + 0.05)) < 0.005, {r:wRim/wHub, want:(rRim-0.05)/(rHub+0.05)});
}
{
  // Заказ ширины луча слышен: другое число — другая измеренная ширина.
  for(const rw of [4, 8, 16]){
    const ov = {clShape:'ring', clD:250, clRays:4, clRayW:rw};
    const t = raw(ov), s = clockSpec(CL(ov));
    const rH = edge(rr => solidRad(t, rr, Math.PI/4), s.shaftR + 1, (s.hubR + s.Rin)/2);
    const r = rH + 0.05;
    const lo = edge(a => !solidAng(t, r, a), -0.8, 0.02);
    const hi = edge(a => !solidAng(t, r, a),  0.8, -0.02);
    const w = 2*r*Math.sin((hi-lo)/2)*rH/r;
    chk('луч ' + rw + ' мм у ступицы и вышел ' + rw, Math.abs(w - rw) < 0.01, w);
  }
}
{
  for(const n of [2, 3, 5, 12]){
    const ov = {clShape:'ring', clD:250, clRays:n, clRayW:6};
    const t = raw(ov), s = clockSpec(CL(ov));
    const rMid = (s.hubR + s.Rin)/2;
    let on = 0, between = 0;
    for(let k = 0; k < n; k++){
      if(solidRad(t, rMid, (k + 0.002)*2*Math.PI/n)) on++;
      if(solidRad(t, rMid, (k + 0.5)*2*Math.PI/n)) between++;
    }
    chk(n + ' лучей построено', on === n, on);
    chk('и между ними пусто', between === 0, between);
  }
}

console.log('=== кольцо остаётся кольцом на краях диапазона ===');
{
  // Широкий луч: клин обязан упереться в потолок 0.9 от шага лучей, иначе лучи сходятся боками и
  // «кольцо» молча становится диском — герметичным, правильным по объёму и не тем, что заказали.
  const ov = {clShape:'ring', clD:250, clRays:4, clRayW:40};
  const t = raw(ov), s = clockSpec(CL(ov));
  const rMid = (s.hubR + s.Rin)/2;
  let on = 0, between = 0;
  for(let k = 0; k < 4; k++){
    if(solidRad(t, rMid, (k + 0.002)*Math.PI/2)) on++;
    if(solidRad(t, rMid, (k + 0.5)*Math.PI/2)) between++;
  }
  chk('луч 40 мм: четыре луча, а не сплошное кольцо', on === 4 && between === 0, {on, between});
  chk('и ширина луча упёрлась в потолок, а не в заказ', s.rayNarrow < 28, s.rayNarrow);
}
{
  // Широкий обод на мелких часах: ступица обязана отступить внутрь него, иначе полосы налезают друг на
  // друга и просвет между ступицей и ободом исчезает вместе с лучами.
  const ov = {clShape:'ring', clD:80, clRimW:40};
  const t = raw(ov), s = clockSpec(CL(ov));
  chk('ступица осталась внутри обода', s.hubR < s.Rin - 1e-9, {hubR:s.hubR, Rin:s.Rin});
  const solid = r => solidRad(t, r, Math.PI/4);
  const rHub = edge(solid, s.shaftR + 0.5, (s.hubR + s.Rin)/2), rRim = edge(solid, s.R - 1, (s.hubR + s.Rin)/2);
  chk('и просвет между ними существует', rRim - rHub > 1, {rHub, rRim});
  chk('обод при этом сужен и об этом сказано',
      collectPrintWarnings(CL(ov)).some(x => /обод сужен/.test(x)), collectPrintWarnings(CL(ov)));
}
{
  // Ступица меньше вала: полоса ступицы вывернулась бы наизнанку (r0 > r1). Отступ в 2 мм — не вкус.
  const ov = {clShape:'ring', clD:250, clShaftD:11, clHubD:8};
  const t = raw(ov), s = clockSpec(CL(ov));
  chk('ступица шире вала не меньше чем на 2 мм', s.hubR >= s.shaftR + 2 - 1e-9, {hubR:s.hubR, shaftR:s.shaftR});
  chk('и вокруг вала есть материал', atR(t, s.shaftR + 1.5, Math.PI/4).length === 1,
      atR(t, s.shaftR + 1.5, Math.PI/4));
  chk('а просвет за ступицей пуст', !solidRad(t, (s.hubR + s.Rin)/2, Math.PI/4));
}

console.log('=== грани смотрят наружу: луч ПОПЕРЁК, а не только объём ===');
{
  /* Вывернутая грань клина объёмом не ловится ВООБЩЕ: эта грань лежит в плоскости, проходящей через
     ось, её x·n тождественно ноль, и под интегралом расхождения она весит ровно ничего. Замерено:
     перевернуть ориентир боковой грани — объём не меняется ни в последнем разряде.
     Ловит её луч, идущий ПОПЕРЁК: он входит в спицу через одну такую грань и выходит через другую, и
     у перевёрнутой знак не тот — счётчик глубины уходит в минус, и отрезок материала не возникает. */
  const t = raw({clShape:'ring', clD:250, clRays:4, clRayW:8, clT:4, clMarks:'none'});
  const rr = runsX(t, 0, 60);
  chk('поперёк кольца на z=60 ровно три отрезка: обод, спица, обод', rr.length === 3, rr);
  if(rr.length === 3){
    chk('крайние — обод, и кромки там, где заказаны (√(125²−60²) и √(105²−60²))',
        Math.abs(-rr[0][0] - Math.sqrt(125*125 - 3600)) < 0.02 &&
        Math.abs(-rr[0][1] - Math.sqrt(105*105 - 3600)) < 0.02 &&
        Math.abs(rr[2][1] - Math.sqrt(125*125 - 3600)) < 0.02, rr);
    chk('средний — спица, симметричная относительно оси', Math.abs(rr[1][0] + rr[1][1]) < 1e-6, rr[1]);
    chk('и она не тоньше двадцати миллиметров', rr[1][1] - rr[1][0] > 20, rr[1][1] - rr[1][0]);
  }
  const t2 = raw({clD:250, clT:4, clMarks:'none'});
  const r2 = runsX(t2, 0, 60);
  chk('поперёк диска на z=60 — один отрезок от края до края', r2.length === 1 &&
      Math.abs(r2[0][1] - Math.sqrt(125*125 - 3600)) < 0.02, r2);
  const r3 = runsX(t2, 0, 0);
  chk('а через центр — два, разделённые отверстием под вал',
      r3.length === 2 && Math.abs(r3[0][1] + 5.5) < 0.02 && Math.abs(r3[1][0] - 5.5) < 0.02, r3);
}
{
  /* ОБЪЁМ ПРОТИВ АНАЛИТИКИ. Все радиусы и полуугол клина ИЗМЕРЕНЫ по сетке; ожидание собрано из них и
     из заказанной толщины — с той же спецификацией, что строила, оно не сверяется нигде. */
  const ov = {clShape:'ring', clD:250, clRays:5, clRayW:10, clT:5, clMarks:'none'};
  const t = raw(ov), s = clockSpec(CL(ov));
  const solid = r => solidRad(t, r, Math.PI/5);
  const rMid = (s.hubR + s.Rin)/2;
  const rShaft = edge(r => solidRad(t, r, 0.13), 20, 1);
  const rHub = edge(solid, rShaft + 1, rMid), rRim = edge(solid, s.R - 1, rMid);
  const rw = rHub + 0.05;
  const lo = edge(a => !solidAng(t, rw, a), -0.5, 0.02);
  const hi = edge(a => !solidAng(t, rw, a),  0.5, -0.02);
  const half = (hi - lo)/2;
  const want = 5*(Math.PI*(rHub*rHub - rShaft*rShaft) + Math.PI*(125*125 - rRim*rRim)
                  + 5*half*(rRim*rRim - rHub*rHub));
  const got = vol(t);
  chk('объём совпал с аналитическим по измеренным радиусам', Math.abs(got/want - 1) < 0.005,
      {got, want, rel:got/want - 1});
}

console.log('=== метка на кольце держится обода ===');
{
  const ov = {clShape:'ring', clD:250, clRimW:14, clMarks:'hours', clMarkL:60};
  const t = raw(ov), s = clockSpec(CL(ov));
  const b = bbox(t), topPlate = b.lo[1] + s.T;
  const raised = r => [0.004, 0.004+2e-4, 0.004-2e-4].some(a => {
    const rr = atR(t, r, a); return rr.length === 1 && rr[0][1] > topPlate + 1e-9; });
  const rIn  = edge(r => !raised(r), s.shaftR, s.rOut - 0.05);
  const rRim = edge(r => solidRad(t, r, Math.PI/4), s.R - 1, (s.hubR + s.Rin)/2);
  chk('метка не свисает с внутренней кромки обода', rIn >= rRim - 1e-6, {rIn, rRim});
  chk('и укорочение объявлено', collectPrintWarnings(CL(ov)).some(x => /укорочена/.test(x)),
      collectPrintWarnings(CL(ov)));
}

console.log('=== толщина: её НЕ урезают, о ней предупреждают ===');
{
  const s = clockSpec(CL({clT:12}));
  chk('12 мм остались 12 мм', s.T === 12, s.T);
  const b = bbox(raw({clT:12, clMarks:'none'}));
  chk('и в сетке они же', Math.abs((b.hi[1]-b.lo[1]) - 12) < 1e-9, b.hi[1]-b.lo[1]);
  chk('но сказано про резьбу вала',
      collectPrintWarnings(CL({clT:12})).some(x => /резьба вала/.test(x)), collectPrintWarnings(CL({clT:12})));
  chk('при 4 мм молчит', !collectPrintWarnings(CL({clT:4})).some(x => /резьба вала/.test(x)));
  chk('порог — CLOCK_SHAFT_LEN, а не круглое число',
      collectPrintWarnings(CL({clT:8})).every(x => !/резьба вала/.test(x)) &&
      collectPrintWarnings(CL({clT:8.5})).some(x => /резьба вала/.test(x)));
}

console.log('=== предупреждения ===');
{
  const W = ov => collectPrintWarnings(CL(ov));
  chk('тонкий луч назван', W({clShape:'ring', clRayW:1.5, clD:250}).some(x => /луч у ступицы/.test(x)),
      W({clShape:'ring', clRayW:1.5, clD:250}));
  chk('лучи, сомкнувшиеся в диск, названы',
      W({clShape:'ring', clRays:12, clRayW:40, clD:250}).some(x => /просвет между лучами/.test(x)));
  chk('на четырёх лучах по 8 мм молчит', !W({clShape:'ring'}).some(x => /просвет между лучами/.test(x)));
  chk('урезанный обод назван', W({clShape:'ring', clD:80, clShaftD:20, clRimW:40}).some(x => /обод сужен/.test(x)),
      W({clShape:'ring', clD:80, clShaftD:20, clRimW:40}));
  chk('метки выше пластины названы', W({clT:2, clMarkH:5}).some(x => /метки выше пластины/.test(x)));
  chk('у диска про лучи не говорится', !W({clShape:'disc', clD:250}).some(x => /луч/.test(x)));
  chk('на настройках по умолчанию часы не жалуются', W({}).length === 0, W({}));
}

console.log('=== форма зарегистрирована как базовая ===');
{
  chk('dominantMode', dominantMode({clMode:'dial'}) === 'clock');
  chk('выключенные часы форму не перехватывают', dominantMode({clMode:'none'}) !== 'clock');
  chk('KIND_LABEL', KIND_LABEL.clock === 'Настенные часы');
  chk('GROUP_KIND', GROUP_KIND['Настенные часы'] === 'clock');
  chk('GROUP_TAB', GROUP_TAB['Настенные часы'] === 'form');
  chk('KIND_PRINT', KIND_PRINT.clock === 'detail');
  chk('MODEL_HELP есть и говорит про печать лицом вверх',
      !!MODEL_HELP.clock && /ЛИЦОМ ВВЕРХ/.test(MODEL_HELP.clock.how));
  chk('своя группа видна под своей формой', sectionRelevant('Настенные часы', 'clock'));
  chk('и не видна под чужой', !sectionRelevant('Настенные часы', 'ball'));
  chk('чужие группы под часами скрыты', !sectionRelevant('Ажурный шар', 'clock') &&
      !sectionRelevant('Настенная плитка', 'clock') && !sectionRelevant('Воронка', 'clock'));
  chk('строки параметров живут в своей группе',
      SHAPE_PARAMS.box.filter(r => r.group === 'Настенные часы').length === 17,
      SHAPE_PARAMS.box.filter(r => r.group === 'Настенные часы').length);
  chk('строки кольца показываются только у кольца',
      SHAPE_PARAMS.box.filter(r => r.group === 'Настенные часы' && r.only && r.only.clShape).length === 4);
  currentShape = 'box';
  ship({}); const nm1 = activeShapeLabel();
  ship({clShape:'ring', clD:300}); const nm2 = activeShapeLabel();
  chk('имя модели называет форму и диаметр',
      nm1 === 'часы диск (Ø250)' && nm2 === 'часы кольцо (Ø300)', [nm1, nm2]);
}
{
  const t = ship({clShape:'ring', clMarks:'all'});
  chk('через настоящий путь приложения строится то же тело', t.length > 0 && manifoldCheck(t, 3).watertight);
  chk('и это часы, а не куб', Math.abs(bbox(t).hi[0] - 125) < 1e-6, bbox(t).hi[0]);
}

console.log((fail? 'FAIL ':'OK   ') + pass + ' passed, ' + fail + ' failed');
if(fail) process.exit(1);
