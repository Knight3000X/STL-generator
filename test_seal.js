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

console.log('=== форма зарегистрирована везде, где её будут искать ===');
{
  const D = defaultBoxParams();
  chk('уплотнение — базовая форма', KIND_LABEL.seal === 'Уплотнение');
  chk('и выбор кольца даёт именно её', dominantMode(Object.assign({}, D, {sealMode:'oring'})) === 'seal');
  chk('и выбор прокладки тоже', dominantMode(Object.assign({}, D, {sealMode:'flat'})) === 'seal');
  chk('группа принадлежит семейству', FAMILY_MODE['Уплотнение'] === 'sealMode');
  chk('и семейство знает свою форму', GROUP_KIND['Уплотнение'] === 'seal');
  chk('у обеих разновидностей есть подсказка «что / как / чем»',
      ['oring','flat'].every(v => MODEL_HELP['seal:'+v] && MODEL_HELP['seal:'+v].what &&
                                  MODEL_HELP['seal:'+v].how && (MODEL_HELP['seal:'+v].mat||[]).length),
      ['oring','flat'].filter(v => !MODEL_HELP['seal:'+v]));
  /* Мягкий пластик рекомендуется НЕ для красоты: жёсткое кольцо не уплотняет вовсе. */
  chk('и в обеих рекомендован мягкий пластик',
      ['oring','flat'].every(v => MODEL_HELP['seal:'+v].mat.includes('tpu')));
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
