// Уплотнение: кольцо в канавку и плоская прокладка под фланец.
//
// Первая деталь набора, которую печатают НЕ жёстким пластиком, и первая, у которой вся работа —
// сминаться. Проверяется здесь то, что ломается тихо:
//
//   1. ТОЧКИ ЗАМЕРА НЕ ДОЛЖНЫ ПОПАДАТЬ НА ШВЫ. Число оборотов считается лучом, и точка, легшая ровно
//      на ребро между сегментами, засчитывается обоим — на кольце из ста двух сегментов ровный угол
//      2π·i/24 совпал со швом, и «внутри сечения» намерилось шесть оборотов вместо одного. Углы и
//      радиусы поэтому берутся со сдвигом, не кратным ничему.
//
//   2. НАПРАВЛЕНИЕ ГРАНИ У ТЕЛА ВРАЩЕНИЯ С ЗАМКНУТЫМ СЕЧЕНИЕМ берётся из обхода, а не из радиуса:
//      сечение кольца обходит ось со всех сторон, и на верхней с нижней четвертях радиальная опора
//      стоит перпендикулярно грани, которую судит. Вывернутая полоса проходит manifoldCheck насквозь —
//      он сшивает рёбра, не спрашивая, куда повёрнута грань. Ловится числом оборотов.
//
//   3. НОЛЬ — ЗНАЧЕНИЕ, А НЕ ПУСТО. У расточки ноль означает СПЛОШНУЮ прокладку, а обычная в этом
//      файле связка `p.x > 0 ? p.x : умолчание` читает его как «не задано». Сплошная выходила с
//      дыркой Ø30: объём правдоподобен, сетка герметична, увидеть можно только сравнив с площадью.
//
//   4. БОЛТОВЫЕ ОТВЕРСТИЯ НЕ ВЫБРАСЫВАЮТСЯ МОЛЧА. Ушное отсечение с мостами требует, чтобы дырки
//      лежали внутри контура и не касались ни его, ни друг друга; нарушение даёт не отказ, а сшитую
//      невесть как сетку. Негодный набор отверстий не ставится, и предупреждение говорит, почему.
//
//   5. КАНАВКА СЧИТАЕТСЯ, ХОТЯ И НЕ СТРОИТСЯ. Она в ответной части, которой здесь может и не быть,
//      но её размер полностью определяется кольцом — молчать о нём значило бы отдать кольцо и
//      оставить человека гадать.
//
// Запуск: ./run-all.sh
let pass=0,fail=0; function chk(n,c,e){if(c){pass++;console.log('  OK  ',n);}else{fail++;console.log('  FAIL',n,e!==undefined?JSON.stringify(e):'');}}
function B(ov){ logos.length=0; boxHoles.length=0; dieFaces.length=0;
  Object.assign(paramState.box, defaultBoxParams(), ov);
  return buildTrisForShape('box', paramState.box); }
const S = ov => sealSpec(Object.assign(defaultBoxParams(), ov));
const V = ov => meshVolume(B(ov));
const BB = ov => { const b = computeBBox(B(ov)); return {x:b.maxX-b.minX, y:b.maxY-b.minY, z:b.maxZ-b.minZ}; };
function warn(ov){ return collectPrintWarnings(Object.assign(defaultBoxParams(), ov)) || []; }
/* Число оборотов в точке: сколько оболочек её накрывают. 1 — материал, 0 — пустота, всё остальное —
   сетка сама себе противоречит. Знак берётся с нормали, поэтому вывернутая полоса видна, а чётность
   пересечений её не заметила бы. */
function winding(t,x,y,z){ let w=0;
  for(const T of t){ const [a,b,c]=T;
    const d1=(b[0]-a[0])*(z-a[2])-(b[2]-a[2])*(x-a[0]);
    const d2=(c[0]-b[0])*(z-b[2])-(c[2]-b[2])*(x-b[0]);
    const d3=(a[0]-c[0])*(z-c[2])-(a[2]-c[2])*(x-c[0]);
    if(!((d1>=0&&d2>=0&&d3>=0)||(d1<=0&&d2<=0&&d3<=0))) continue;
    const A=(b[0]-a[0])*(c[2]-a[2])-(b[2]-a[2])*(c[0]-a[0]); if(Math.abs(A)<1e-12) continue;
    const w1=((b[0]-x)*(c[2]-z)-(b[2]-z)*(c[0]-x))/A, w2=((c[0]-x)*(a[2]-z)-(c[2]-z)*(a[0]-x))/A;
    const yy=w1*a[1]+w2*b[1]+(1-w1-w2)*c[1];
    if(yy<=y) continue;
    const ny=(b[2]-a[2])*(c[0]-a[0])-(b[0]-a[0])*(c[2]-a[2]);
    w += ny>0 ? 1 : -1; }
  return w; }

console.log('=== кольцо: строится, герметично, нужного размера ===');
for (const sect of ['d','rect','round'])
  for (const d1 of [6, 30, 120])
    for (const cord of [1.5, 3, 8]){
      const ov = {sealMode:'oring', sealSect:sect, sealD:d1, sealCord:cord, sealW:sect==='round'?0:cord};
      const t = B(ov), mc = manifoldCheck(t, 4), s = S(ov);
      chk('кольцо '+sect+' Ø'+d1+'×'+cord+' герметично (+объём)',
          mc.watertight && meshVolume(t) > 0, {open:mc.openEdges, bad:mc.badEdges, vol:+meshVolume(t).toFixed(1)});
      const b = computeBBox(t);
      chk('  и наружный Ø = внутренний + две ширины сечения',
          Math.abs((b.maxX-b.minX) - (d1 + 2*s.w)) < Math.max(0.05, d1*0.004),
          {габарит:+(b.maxX-b.minX).toFixed(2), ждём:+(d1+2*s.w).toFixed(2)});
      chk('  и высота = высоте сечения', Math.abs((b.maxY-b.minY) - cord) < 0.02, +(b.maxY-b.minY).toFixed(3));
    }

console.log('=== кольцо: тело сплошное, ни одной вывернутой полосы ===');
{
  /* ЧИСЛО ОБОРОТОВ, А НЕ ЧЁТНОСТЬ. Вывернутая полоса меняет знак вклада, а не его наличие: чётность
     пересечений на ней ровно та же, что на правильной. Точки берутся ВНУТРИ сечения по всему кругу —
     верх, низ и бока, потому что вывернуться может именно четверть, а не всё кольцо разом. */
  const ov = {sealMode:'oring', sealD:30, sealCord:4, sealSect:'round'};
  const t = B(ov), s = S(ov);
  let inside = 0, bad = null;
  for (let i = 0; i < 24 && !bad; i++){
    const a = 2*Math.PI*(i + 0.3137)/24;
    for (const [dr, dy] of [[0,0],[0.6,0],[-0.6,0],[0,0.6],[0,-0.6]]){
      const r = s.Rm + dr*s.cord/2, y = dy*s.cord/2;
      const w = winding(t, r*Math.cos(a), y, r*Math.sin(a));
      if (w === 1) inside++; else bad = {угол:Math.round(a*180/Math.PI), dr, dy, оборотов:w};
    }
  }
  chk('внутри сечения число оборотов везде ровно 1', bad === null, bad);
  chk('и точек проверено достаточно', inside === 120, inside);
  let out = 0;
  for (let i = 0; i < 12; i++){ const a = 2*Math.PI*(i + 0.2113)/12;
    for (const r of [1, s.Rm - s.cord, s.Rm + s.cord])
      if (winding(t, r*Math.cos(a), 0, r*Math.sin(a)) === 0) out++; }
  chk('а снаружи и в отверстии — ровно 0', out === 36, out);
}

console.log('=== кольцо: канавка считается и называется ===');
{
  const s = S({sealMode:'oring', sealCord:4, sealSqueeze:20});
  /* СЖАТИЕ БЕРЁТСЯ НЕ ПО УМОЛЧАНИЮ, и это не придирка. Умолчание — 20 %, то есть глубина 0.8·сечения;
     проверка, поставившая 20, не отличает расчёт от жёстко вписанной восьми десятых. Мутация
     «глубина не зависит от сжатия» прошла ровно так: 133 из 133, ни одного падения. */
  for (const [sq, k] of [[10, 0.90], [20, 0.80], [30, 0.70], [35, 0.65]]){
    const q = S({sealMode:'oring', sealCord:4, sealSqueeze:sq});
    chk('сжатие '+sq+' % → глубина канавки '+(4*k).toFixed(1)+' мм', Math.abs(q.grooveH - 4*k) < 1e-9, q.grooveH);
  }
  chk('и чем сильнее сжатие, тем канавка мельче и шире',
      S({sealMode:'oring', sealSqueeze:30}).grooveH < S({sealMode:'oring', sealSqueeze:10}).grooveH &&
      S({sealMode:'oring', sealSqueeze:30}).grooveW > S({sealMode:'oring', sealSqueeze:10}).grooveW);
  chk('и число в предупреждении меняется вместе с ним',
      warn({sealMode:'oring', sealCord:4, sealSqueeze:10}).join() !==
      warn({sealMode:'oring', sealCord:4, sealSqueeze:30}).join());
  chk('ширина канавки заполняется смятой резиной на заданную долю',
      Math.abs(s.grooveW*s.grooveH*SEAL_FILL - s.area) < 1e-6, {ширина:s.grooveW, площадь:s.area});
  /* ЗАПОЛНЕНИЕ НИЖЕ 100 % — не запас на неточность: резина несжимаема, смять её можно только в
     сторону, и в заполненной доверху канавке давить становится некуда. */
  chk('и доля эта меньше единицы', SEAL_FILL > 0.5 && SEAL_FILL < 1, SEAL_FILL);
  chk('канавка названа в предупреждениях всегда, а не только при беде',
      warn({sealMode:'oring'}).some(x => /канавка/i.test(x)), warn({sealMode:'oring'}));
  chk('слабое сжатие названо слабым',
      warn({sealMode:'oring', sealSqueeze:8}).some(x => /не держит/i.test(x)));
  chk('чрезмерное — чрезмерным',
      warn({sealMode:'oring', sealSqueeze:35}).some(x => /насмерть/i.test(x)));
  chk('а в вилке не сказано ни того, ни другого',
      !warn({sealMode:'oring', sealSqueeze:20}).some(x => /не держит|насмерть/i.test(x)));
  chk('вилка — это статическое уплотнение, 15–25 %', SEAL_SQ_MIN === 15 && SEAL_SQ_MAX === 25);
  chk('слишком тонкое сечение названо тонким',
      warn({sealMode:'oring', sealCord:0.8}).some(x => /ниткой/i.test(x)));
  chk('а обычное — нет', !warn({sealMode:'oring', sealCord:3}).some(x => /ниткой/i.test(x)));
}

console.log('=== кольцо: форма сечения меняет и площадь, и сетку ===');
{
  const a = S({sealMode:'oring', sealCord:4, sealSect:'round'});
  const b = S({sealMode:'oring', sealCord:4, sealSect:'rect', sealW:4});
  const c = S({sealMode:'oring', sealCord:4, sealSect:'d',    sealW:4});
  chk('круглое — площадь круга', Math.abs(a.area - Math.PI*4) < 1e-9, a.area);
  chk('прямоугольное — площадь прямоугольника', Math.abs(b.area - 16) < 1e-9, b.area);
  chk('D-образное между ними', c.area > a.area && c.area < b.area, {round:a.area, d:c.area, rect:b.area});
  chk('и объёмы кольца идут в том же порядке',
      V({sealMode:'oring', sealCord:4, sealSect:'round'}) < V({sealMode:'oring', sealCord:4, sealSect:'d', sealW:4}) &&
      V({sealMode:'oring', sealCord:4, sealSect:'d', sealW:4}) < V({sealMode:'oring', sealCord:4, sealSect:'rect', sealW:4}));
  /* У круглого сечения ширины нет — она и есть высота. Ручка ширины на нём не должна делать ничего:
     иначе человек задаёт число, деталь молчит, и непонятно, кто из них не прав. */
  chk('у круглого сечения ручка ширины ничего не меняет',
      Math.abs(V({sealMode:'oring', sealSect:'round'}) - V({sealMode:'oring', sealSect:'round', sealW:9})) < 1e-9);
  chk('а у прямоугольного — меняет',
      V({sealMode:'oring', sealSect:'rect', sealW:9}) > V({sealMode:'oring', sealSect:'rect', sealW:3})*2);
  /* D-образное плоское СНИЗУ, и это вся его причина: первый слой ложится начисто. */
  const t = B({sealMode:'oring', sealSect:'d', sealCord:4, sealW:4});
  const bb = computeBBox(t);
  let flat = 0;
  for (const T of t) if (T.every(v => Math.abs(v[1] - bb.minY) < 1e-6)) flat++;
  chk('у D-образного есть плоское дно (а у круглого нет)', flat > 0, flat);
  const tr = B({sealMode:'oring', sealSect:'round', sealCord:4});
  const br = computeBBox(tr);
  let flatR = 0;
  for (const T of tr) if (T.every(v => Math.abs(v[1] - br.minY) < 1e-6)) flatR++;
  chk('  а у круглого — ни одного треугольника в плоскости дна', flatR === 0, flatR);
}

console.log('=== прокладка: площадь сходится с арифметикой ===');
{
  const area = v => v/2;   // толщина по умолчанию 2 мм
  chk('сплошная Ø60 — это круг Ø60',
      Math.abs(area(V({sealMode:'flat', sealBoreD:0})) - Math.PI*900) < Math.PI*900*0.005,
      {получилось:+area(V({sealMode:'flat', sealBoreD:0})).toFixed(1), круг:+(Math.PI*900).toFixed(1)});
  /* НОЛЬ У РАСТОЧКИ — ЗНАЧЕНИЕ. Связка `x > 0 ? x : умолчание` читала его как «не задано», и
     сплошная выходила с дыркой Ø30 — правдоподобного объёма и герметичной. */
  chk('и она НЕ равна прокладке с расточкой по умолчанию',
      V({sealMode:'flat', sealBoreD:0}) > V({sealMode:'flat'})*1.2,
      {сплошная:+V({sealMode:'flat', sealBoreD:0}).toFixed(1), сдыркой:+V({sealMode:'flat'}).toFixed(1)});
  chk('расточка Ø30 убирает ровно круг Ø30',
      Math.abs(area(V({sealMode:'flat', sealBoreD:0}) - V({sealMode:'flat', sealBoreD:30})) - Math.PI*225) < Math.PI*225*0.01);
  chk('шесть болтов Ø5 убирают шесть кругов Ø5',
      Math.abs(area(V({sealMode:'flat'}) - V({sealMode:'flat', sealBoltN:6, sealBoltD:5})) - 6*Math.PI*6.25) < 6*Math.PI*6.25*0.02);
  chk('прямоугольная — это прямоугольник минус расточка',
      Math.abs(area(V({sealMode:'flat', sealFlatShape:'rect', sealFlatW:40, sealFlatD:60})) - (40*60 - Math.PI*225)) < 40,
      +area(V({sealMode:'flat', sealFlatShape:'rect', sealFlatW:40, sealFlatD:60})).toFixed(1));
  const b = BB({sealMode:'flat', sealFlatW:40, sealFlatD:60, sealT:3});
  chk('габарит — заданные размеры и толщина',
      Math.abs(b.x-40)<0.5 && Math.abs(b.z-60)<0.5 && Math.abs(b.y-3)<1e-6, b);
  chk('ширина 0 значит «как по Z»',
      Math.abs(BB({sealMode:'flat', sealFlatD:50, sealFlatW:0}).x - 50) < 0.5);
}

console.log('=== прокладка: отверстия либо стоят, либо названы ===');
{
  for (const [n, d, ok] of [[4, 5, true], [6, 5, true], [20, 8, false], [4, 25, false]]){
    const s = S({sealMode:'flat', sealBoltN:n, sealBoltD:d});
    chk(n+'×Ø'+d+' по умолчанию — '+(ok?'помещаются':'НЕ помещаются'), s.boltFit === ok,
        {окружность:+(2*s.pcd).toFixed(1), шаг:+(2*Math.PI*s.pcd/n).toFixed(1)});
    const t = B({sealMode:'flat', sealBoltN:n, sealBoltD:d});
    chk('  и сетка герметична в обоих случаях', manifoldCheck(t,4).watertight && meshVolume(t) > 0);
    if (!ok) chk('  и сказано, что отверстия не поставлены',
        warn({sealMode:'flat', sealBoltN:n, sealBoltD:d}).some(x => /не хватает места/i.test(x)),
        warn({sealMode:'flat', sealBoltN:n, sealBoltD:d}));
  }
  chk('негодные отверстия действительно не вычтены',
      Math.abs(V({sealMode:'flat', sealBoltN:20, sealBoltD:8}) - V({sealMode:'flat'})) < 1e-9);
  chk('а годные — вычтены', V({sealMode:'flat', sealBoltN:6, sealBoltD:5}) < V({sealMode:'flat'}) - 100);
  chk('без отверстий про них ничего не сказано',
      !warn({sealMode:'flat'}).some(x => /не хватает места/i.test(x)));
}

console.log('=== виброножка: строится и имеет заданную высоту ===');
{
  for (const ov of [{}, {sealFootBore:6}, {sealFootWaistD:8, sealFootH:6}, {sealFootTopD:50}, {sealFootFill:100}]){
    const o = Object.assign({sealMode:'foot', printMat:'tpu'}, ov);
    const t = B(o), mc = manifoldCheck(t, 4), g = footSpec(Object.assign(defaultBoxParams(), o));
    chk('ножка '+JSON.stringify(ov)+' герметична (+объём)', mc.watertight && meshVolume(t) > 0,
        {open:mc.openEdges, bad:mc.badEdges, vol:+meshVolume(t).toFixed(1)});
    const b = computeBBox(t);
    /* Спецификация считает деталь ДО усадки, габарит меряется ПОСЛЕ неё: у TPU это лишние четыре
       десятых процента, и на двадцати шести миллиметрах ровно та десятая, на которой я и споткнулся.
       Множитель поэтому назван, а не спрятан в допуск — заодно это проверяет, что усадка доходит и
       до уплотнения, а не только до кубов. */
    const k = matShrinkScale(Object.assign(defaultBoxParams(), o));
    chk('  высота = два фланца, два перехода и талия (с поправкой на усадку)',
        Math.abs((b.maxY-b.minY) - g.H*k) < 0.02,
        {габарит:+(b.maxY-b.minY).toFixed(3), расчёт:+(g.H*k).toFixed(3), усадка:k});
    chk('  и опора шириной в заданный Ø', Math.abs((b.maxX-b.minX) - Math.max(g.baseD, g.topD)*k) < 0.3,
        {габарит:+(b.maxX-b.minX).toFixed(2), ждём:+(Math.max(g.baseD, g.topD)*k).toFixed(2)});
  }
  /* Сплошная ножка и ножка с отверстием строятся РАЗНЫМИ токарями: у latheYTris расточка — цилиндр
     со своими стенками, и при нулевом радиусе он вырождается в полосу нулевой площади вдоль оси.

     Смотреть на это надо у САМОГО ПОСТРОИТЕЛЯ, а не у готовой модели, и вот почему. Дальше по пути
     стоит snapWeldTris, который схлопнувшиеся щепки выбрасывает; на выходе сетка одинаково
     герметична и одинакового объёма, что с веткой, что без неё. Мутация «строить сплошную сверлящим
     токарем» прошла все 187 проверок насквозь. Ветка даёт не другую деталь — она даёт отсутствие
     мусора, который иначе пришлось бы подчищать, и проверять надо ровно это. */
  const solid = buildSeal(Object.assign(defaultBoxParams(), {sealMode:'foot', printMat:'tpu'}));
  let degen = 0;
  for (const T of solid){
    const e1 = [T[1][0]-T[0][0], T[1][1]-T[0][1], T[1][2]-T[0][2]];
    const e2 = [T[2][0]-T[0][0], T[2][1]-T[0][1], T[2][2]-T[0][2]];
    const n = [e1[1]*e2[2]-e1[2]*e2[1], e1[2]*e2[0]-e1[0]*e2[2], e1[0]*e2[1]-e1[1]*e2[0]];
    if (Math.hypot(n[0],n[1],n[2])/2 < 1e-9) degen++;
  }
  chk('построитель сплошной ножки не создаёт вырожденных треугольников', degen === 0, degen);
  chk('и их не пришлось подчищать: у построителя столько же треугольников, сколько у готовой модели',
      solid.length === B({sealMode:'foot', printMat:'tpu'}).length,
      {построитель:solid.length, модель:B({sealMode:'foot', printMat:'tpu'}).length});
  chk('а отверстие в ней действительно есть', V({sealMode:'foot', printMat:'tpu', sealFootBore:8}) <
      V({sealMode:'foot', printMat:'tpu'}) - 500,
      {сглухим:+V({sealMode:'foot', printMat:'tpu'}).toFixed(0), сдыркой:+V({sealMode:'foot', printMat:'tpu', sealFootBore:8}).toFixed(0)});
}

console.log('=== виброножка: цепочка расчёта сходится сама с собой ===');
{
  const F = ov => footSpec(Object.assign(defaultBoxParams(), {sealMode:'foot', printMat:'tpu'}, ov));
  const g = F({});
  chk('площадь талии — кольцо между талией и отверстием',
      Math.abs(g.A - Math.PI/4*(g.waistD*g.waistD - g.bore*g.bore)) < 1e-9, g.A);
  chk('жёсткость = приведённый модуль × площадь ÷ высоту', Math.abs(g.k - g.Eeff*g.A/g.hW) < 1e-9, g.k);
  chk('осадка = вес ÷ жёсткость', Math.abs(g.set - g.load*FOOT_G/1000/g.k) < 1e-9, g.set);
  chk('собственная частота из осадки, а не из массы',
      Math.abs(g.fn - Math.sqrt(FOOT_G/g.set)/(2*Math.PI)) < 1e-9, g.fn);
  /* Формула каталогов виброопор: f₀ ≈ 15.76/√δ, δ в миллиметрах. Если бы 2π потерялось, число
     разошлось бы в шесть с лишним раз — а выглядело бы всё так же правдоподобно. */
  chk('и это та самая 15.76/√δ из каталогов', Math.abs(g.fn - 15.76/Math.sqrt(g.set)) < 0.02, g.fn);
  chk('изоляция начинается выше f₀·√2', Math.abs(g.isolFrom - g.fn*Math.SQRT2) < 1e-9, g.isolFrom);
  /* СОБСТВЕННАЯ ЧАСТОТА НЕ ЗАВИСИТ ОТ МАССЫ при заданной осадке, но зависит от неё через осадку:
     тяжелее груз — больше осадка — ниже частота. Проверяется именно этот ход, а не число. */
  chk('тяжелее груз — ниже частота', F({sealFootLoad:20}).fn < F({sealFootLoad:5}).fn);
  chk('и осадка ровно вчетверо больше', Math.abs(F({sealFootLoad:20}).set/F({sealFootLoad:5}).set - 4) < 1e-9);
}

console.log('=== виброножка: заполнение работает КВАДРАТОМ, а не долей ===');
{
  const F = ov => footSpec(Object.assign(defaultBoxParams(), {sealMode:'foot', printMat:'tpu'}, ov));
  chk('приведённый модуль = модуль × квадрат заполнения',
      Math.abs(F({sealFootFill:25}).Eeff - FIL_MAT.tpu.Ec*0.0625) < 1e-9, F({sealFootFill:25}).Eeff);
  /* ЛИНЕЙНАЯ ЗАВИСИМОСТЬ ВЫГЛЯДЕЛА БЫ ТАК ЖЕ ПРАВДОПОДОБНО и была бы вдвое неверна. Отношение
     жёсткостей при вдвое большем заполнении обязано быть ЧЕТЫРЕ, а не два. */
  chk('вдвое гуще — вчетверо жёстче', Math.abs(F({sealFootFill:50}).k/F({sealFootFill:25}).k - 4) < 1e-9,
      +(F({sealFootFill:50}).k/F({sealFootFill:25}).k).toFixed(4));
  chk('вчетверо гуще — в шестнадцать раз жёстче',
      Math.abs(F({sealFootFill:100}).k/F({sealFootFill:25}).k - 16) < 1e-9);
  chk('сплошная ножка изолирует ХУЖЕ редкой — в этом вся суть',
      F({sealFootFill:100}).fn > F({sealFootFill:25}).fn*2,
      {сплошная:+F({sealFootFill:100}).fn.toFixed(1), редкая:+F({sealFootFill:25}).fn.toFixed(1)});
  chk('и умолчание — редкое заполнение, а не сплошное', F({}).fill < 0.5, F({}).fill);
}

console.log('=== виброножка: умолчание работает, а не жалуется ===');
{
  const w0 = warn({sealMode:'foot', printMat:'tpu'});
  const g = footSpec(Object.assign(defaultBoxParams(), {sealMode:'foot', printMat:'tpu'}));
  /* УМОЛЧАНИЕ ОБЯЗАНО БЫТЬ РАБОТАЮЩЕЙ ДЕТАЛЬЮ. Первая версия давала на умолчаниях 57 Гц — изоляция
     выше восьмидесяти, то есть ножка не делала того, ради чего её печатают, и никто бы не сказал. */
  chk('на умолчаниях ножка изолирует в разумной полосе', g.isolFrom < 30, +g.isolFrom.toFixed(1));
  chk('и осадка в пределах прямого участка', !g.overSet && g.set < g.hW*FOOT_SET_MAX,
      {осадка:+g.set.toFixed(2), предел:+(g.hW*FOOT_SET_MAX).toFixed(2)});
  chk('и столбик устойчив', !g.slender, {талия:g.hW, диаметр:g.waistD});
  chk('и ни одной ЖАЛОБЫ на умолчаниях', !w0.some(x => /нелинейн|выпучится|не работает/i.test(x)), w0);
  chk('а числа названы', w0.some(x => /собственная частота/i.test(x)) && w0.some(x => /заполнения/i.test(x)), w0);
}

console.log('=== виброножка: каждый предел назван, когда достигнут ===');
{
  chk('жёсткий материал назван непригодным',
      warn({sealMode:'foot', printMat:'pla'}).some(x => /виброножкой не работает/i.test(x)),
      warn({sealMode:'foot', printMat:'pla'}));
  chk('и для него не печатается вилка изоляции — она бессмысленна',
      !warn({sealMode:'foot', printMat:'pla'}).some(x => /изоляция начинается/i.test(x)));
  chk('перегруз назван перегрузом',
      warn({sealMode:'foot', printMat:'tpu', sealFootLoad:60}).some(x => /нелинейную/i.test(x)),
      warn({sealMode:'foot', printMat:'tpu', sealFootLoad:60}));
  chk('а нормальная нагрузка — нет',
      !warn({sealMode:'foot', printMat:'tpu', sealFootLoad:5}).some(x => /нелинейную/i.test(x)));
  chk('слишком высокая талия названа неустойчивой',
      warn({sealMode:'foot', printMat:'tpu', sealFootWaistD:8, sealFootH:30}).some(x => /выпучится/i.test(x)));
  chk('а приземистая — нет',
      !warn({sealMode:'foot', printMat:'tpu', sealFootWaistD:20, sealFootH:8}).some(x => /выпучится/i.test(x)));
  /* Устойчивость проверяется ОТДЕЛЬНО от расчёта жёсткости, и это не педантизм: k = E·A/h про
     выпучивание не знает вовсе и продолжает выдавать бодрые числа для сколь угодно тонкого столбика. */
  const tall = footSpec(Object.assign(defaultBoxParams(), {sealMode:'foot', printMat:'tpu', sealFootWaistD:8, sealFootH:30}));
  chk('и расчёт при этом молча выдаёт число — потому проверка и отдельная', tall.k > 0 && tall.slender,
      {k:+tall.k.toFixed(2), слишкомвысокая:tall.slender});
}

console.log('=== виброножка: отверстие и материал доходят до расчёта ===');
{
  const F = ov => footSpec(Object.assign(defaultBoxParams(), {sealMode:'foot', printMat:'tpu'}, ov));
  chk('отверстие убирает площадь и смягчает опору', F({sealFootBore:10}).k < F({sealFootBore:0}).k,
      {сглухим:+F({sealFootBore:0}).k.toFixed(2), сдыркой:+F({sealFootBore:10}).k.toFixed(2)});
  chk('и ровно на своё кольцо',
      Math.abs(F({sealFootBore:10}).A - (F({sealFootBore:0}).A - Math.PI*25)) < 1e-9);
  chk('TPE мягче TPU — частота ниже',
      footSpec(Object.assign(defaultBoxParams(), {sealMode:'foot', printMat:'tpe'})).fn <
      footSpec(Object.assign(defaultBoxParams(), {sealMode:'foot', printMat:'tpu'})).fn);
  chk('у каждого материала есть модуль на сжатие, и он положителен',
      Object.keys(FIL_MAT).every(k => FIL_MAT[k].Ec > 0), Object.keys(FIL_MAT).filter(k => !(FIL_MAT[k].Ec > 0)));
  chk('и мягкие заметно мягче жёстких', FIL_MAT.tpu.Ec < FIL_MAT.pla.Ec/10 && FIL_MAT.tpe.Ec < FIL_MAT.tpu.Ec);
  chk('подпись называет частоту, а не только размер',
      /Гц/.test((function(){ B({sealMode:'foot', printMat:'tpu'}); return activeShapeLabel(); })()));
}

console.log('=== форма зарегистрирована везде, где её будут искать ===');
{
  const D = defaultBoxParams();
  chk('уплотнение — базовая форма', KIND_LABEL.seal === 'Уплотнение');
  chk('и выбор кольца даёт именно её', dominantMode(Object.assign({}, D, {sealMode:'oring'})) === 'seal');
  chk('и выбор прокладки тоже', dominantMode(Object.assign({}, D, {sealMode:'flat'})) === 'seal');
  chk('группа принадлежит семейству', FAMILY_MODE['Уплотнение'] === 'sealMode');
  chk('и семейство знает свою форму', GROUP_KIND['Уплотнение'] === 'seal');
  chk('и выбор ножки тоже', dominantMode(Object.assign({}, D, {sealMode:'foot'})) === 'seal');
  chk('у всех трёх разновидностей есть подсказка «что / как / чем»',
      ['oring','flat','foot'].every(v => MODEL_HELP['seal:'+v] && MODEL_HELP['seal:'+v].what &&
                                  MODEL_HELP['seal:'+v].how && (MODEL_HELP['seal:'+v].mat||[]).length),
      ['oring','flat','foot'].filter(v => !MODEL_HELP['seal:'+v]));
  /* Мягкий пластик рекомендуется НЕ для красоты: жёсткое кольцо не уплотняет вовсе, а жёсткая
     ножка не гасит — движок это и говорит числом. */
  chk('и во всех рекомендован мягкий пластик',
      ['oring','flat','foot'].every(v => MODEL_HELP['seal:'+v].mat.includes('tpu')));
  /* `activeShapeLabel` читает ГЛОБАЛЬНОЕ состояние, а не переданное: подпись рисуется для того, что
     сейчас на экране. Передав ей объект, я получил бы подпись прошлой модели — и получил: кольцо
     назвалось прокладкой, потому что перед этим строилась она. */
  const name = ov => { B(ov); return activeShapeLabel(); };
  chk('сводка называет деталь, а не «куб»',
      /кольцо/.test(name({sealMode:'oring'})) && /прокладка/.test(name({sealMode:'flat'})),
      {кольцо:name({sealMode:'oring'}), прокладка:name({sealMode:'flat'})});
  chk('и называет её размером, а не только словом',
      /30/.test(name({sealMode:'oring', sealD:30})) && /60/.test(name({sealMode:'flat', sealFlatD:60})),
      {кольцо:name({sealMode:'oring', sealD:30}), прокладка:name({sealMode:'flat', sealFlatD:60})});
}

console.log('=== материал доходит до уплотнения ===');
{
  /* TPU уходит в минус по посадке и имеет свою усадку — уплотнение обязано это чувствовать, иначе
     весь предыдущий выпуск для него зря. */
  const a = BB({sealMode:'oring'}), b = BB({sealMode:'oring', printMat:'tpu'});
  chk('кольцо в TPU крупнее кольца в PLA на усадку TPU',
      Math.abs(b.x/a.x - matShrinkScale({printMat:'tpu'})) < 1e-9,
      {отношение:+(b.x/a.x).toFixed(6), усадка:matShrinkScale({printMat:'tpu'})});
  chk('и вес считается по плотности TPU, а не PLA',
      Math.abs(matDensity({printMat:'tpu'}) - FIL_MAT.tpu.g) < 1e-12);
}

console.log('\n=== TOTAL:',pass,'passed,',fail,'failed ===');
process.exit(fail?1:0);
