// Сильфон (меха): гофрированная трубка — пыльник, чехол, компенсатор хода.
//
// Первая деталь набора, у которой ВСЯ работа — быть тонкой оболочкой, и проверять здесь нужно
// ровно то, что у такой детали ломается тихо:
//
//   1. ТОЛЩИНА СТЕНКИ МЕРЯЕТСЯ ПО НОРМАЛИ, А НЕ ПО РАДИУСУ. Сдвинь внутреннюю ломаную радиально —
//      и настоящая стенка выйдет тоньше заказанной ровно во столько раз, во сколько косая стенка
//      длиннее своей радиальной проекции. При глубине 5 и шаге 6 заказанные 0.8 мм превратились бы
//      в 0.41. Сетка при этом остаётся ГЕРМЕТИЧНОЙ, а число в панели верным: ни manifoldCheck, ни
//      габарит, ни объём в одиночку такого не видят. Поэтому здесь толщина замеряется как
//      расстояние между двумя параллельными прямыми сечения.
//
//   2. ОБЪЁМ СВЕРЯЕТСЯ С ТЕОРЕМОЙ ПАППА, а не с самим собой. Объём тела вращения равен площади
//      сечения, умноженной на путь его центра тяжести, — и это независимый от построителя ответ:
//      площадь и центроид считаются по тем же точкам сечения, но другой формулой.
//
//   3. ОБРЕЗКА ГЛУБИНЫ ДОЛЖНА ПОПАДАТЬ В ТОЧКУ. Наибольшая глубина решается квадратным уравнением,
//      и у него два корня; неверный даёт правдоподобное, но неверное число. Проверяется тем, что на
//      самой границе проход выходит РОВНО в минимум, а не около него.
//
//   4. УГОЛ СТЕНКИ — ЭТО НАВИСАНИЕ, и обещанный панелью угол обязан совпасть с тем, что реально
//      вышло в сетке: замер идёт по граням, а не по формуле, которой посчитали.

let pass=0,fail=0; function chk(n,c,e){if(c){pass++;console.log('  OK  ',n);}else{fail++;console.log('  FAIL',n,e!==undefined?JSON.stringify(e):'');}}
function B(ov){ logos.length=0; boxHoles.length=0; dieFaces.length=0;
  Object.assign(paramState.box, defaultBoxParams(), {gfBaseplate:false}, ov);
  return buildTrisForShape('box', paramState.box); }
const P  = ov => Object.assign(defaultBoxParams(), {gfBaseplate:false, sealMode:'bellows'}, ov);
const S  = ov => bellowsSpec(P(ov));
const L  = ov => bellowsSectionLoop(S(ov));
const BB = ov => { const b = computeBBox(B(Object.assign({sealMode:'bellows'}, ov)));
                   return {x:b.maxX-b.minX, y:b.maxY-b.minY, z:b.maxZ-b.minZ}; };
const warn = ov => collectPrintWarnings(P(ov)) || [];
const near = (a, b, t) => Math.abs(a - b) <= t;

console.log('=== сечение замкнуто и просто ===');
{
  const s = S({}), pts = L({});
  chk('точек в сечении 4n+7', pts.length === 4*s.n + 7, pts.length);
  /* БЕЗ ОБОДА ТОЧЕК ОБОДА НЕТ ВОВСЕ. Первая редакция ставила их всегда, и торцевое кольцо шло от
     гребня внутрь до прохода, а потом обратно наружу — сечение накрывало само себя. */
  chk('  а без ободов их 4n+2', L({belCollar:0}).length === 4*s.n + 2, L({belCollar:0}).length);
  chk('первая и последняя точки не совпадают',
      Math.hypot(pts[0][0]-pts[pts.length-1][0], pts[0][1]-pts[pts.length-1][1]) > 1e-9);
  chk('все радиусы положительны', pts.every(q => q[0] > 0), pts.filter(q => q[0] <= 0));
  chk('высоты лежат в пределах детали', pts.every(q => q[1] >= -1e-9 && q[1] <= s.H + 1e-9));
  /* ПРОСТОТА СЕЧЕНИЯ — не косметика: самопересечение даёт вывернутую наизнанку полосу, которую
     manifoldCheck пропустит, потому что рёбра всё равно сшиваются попарно. */
  let crossings = 0;
  const cross = (a, b, c, d) => {
    const d1 = (b[0]-a[0])*(c[1]-a[1]) - (b[1]-a[1])*(c[0]-a[0]);
    const d2 = (b[0]-a[0])*(d[1]-a[1]) - (b[1]-a[1])*(d[0]-a[0]);
    const d3 = (d[0]-c[0])*(a[1]-c[1]) - (d[1]-c[1])*(a[0]-c[0]);
    const d4 = (d[0]-c[0])*(b[1]-c[1]) - (d[1]-c[1])*(b[0]-c[0]);
    return ((d1>0)!==(d2>0)) && ((d3>0)!==(d4>0));
  };
  const selfCross = q => { let c = 0;
    for (let i = 0; i < q.length; i++) for (let j = i+2; j < q.length; j++){
      if (i === 0 && j === q.length-1) continue;
      if (cross(q[i], q[(i+1)%q.length], q[j], q[(j+1)%q.length])) c++;
    } return c; };
  crossings = selfCross(pts);
  chk('сечение само себя не пересекает', crossings === 0, crossings);
  chk('  и без ободов тоже', selfCross(L({belCollar:0})) === 0, selfCross(L({belCollar:0})));
}

console.log('\n=== материал там, где ему быть (число оборотов) ===');
/* САМАЯ СИЛЬНАЯ ПРОВЕРКА ЭТОГО НАБОРА. Накрывшее само себя сечение даёт взаимно уничтожающиеся
   обходы: материала нет, а сетка ГЕРМЕТИЧНА — manifoldCheck сшивает рёбра попарно и не спрашивает,
   куда повёрнута грань. Именно так и выглядела первая редакция при нулевом ободе: в торцевом кольце
   выходил НОЛЬ оборотов. Ни объём, ни габарит, ни герметичность этого не видят. */
{
  const wind = (t,x,y,z) => { let w = 0;
    for (const T of t){ const [a,b,c] = T;
      const d1=(b[0]-a[0])*(z-a[2])-(b[2]-a[2])*(x-a[0]);
      const d2=(c[0]-b[0])*(z-b[2])-(c[2]-b[2])*(x-b[0]);
      const d3=(a[0]-c[0])*(z-c[2])-(a[2]-c[2])*(x-c[0]);
      if(!((d1>=0&&d2>=0&&d3>=0)||(d1<=0&&d2<=0&&d3<=0))) continue;
      const A=(b[0]-a[0])*(c[2]-a[2])-(b[2]-a[2])*(c[0]-a[0]); if(Math.abs(A)<1e-12) continue;
      const w1=((b[0]-x)*(c[2]-z)-(b[2]-z)*(c[0]-x))/A, w2=((c[0]-x)*(a[2]-z)-(c[2]-z)*(a[0]-x))/A;
      if (w1*a[1]+w2*b[1]+(1-w1-w2)*c[1] < y) continue;
      const u=[b[0]-a[0],b[1]-a[1],b[2]-a[2]], v=[c[0]-a[0],c[1]-a[1],c[2]-a[2]];
      w += ((u[2]*v[0]-u[0]*v[2])>0)?1:-1; }
    return w; };
  /* Угол взят не кратным ничему: точка, легшая ровно на шов между сегментами, засчитывается обоим. */
  const AN = 0.37, at = (t, r, y) => wind(t, r*Math.cos(AN), y, r*Math.sin(AN));
  for (const hC of [0, 4]){
    const s = bellowsSpec(P({belCollar:hC})), t = B({sealMode:'bellows', belCollar:hC}), yB = -s.H/2;
    const tag = hC > 0 ? 'с ободом' : 'без обода';
    chk(tag + ': в стенке у верха материал есть', at(t, s.R - 0.4, yB + s.H - 0.4) === 1,
        at(t, s.R - 0.4, yB + s.H - 0.4));
    chk(tag + ': в проходе пусто', at(t, 1.0, yB + s.H - 0.4) === 0, at(t, 1.0, yB + s.H - 0.4));
    chk(tag + ': в гребне гофра материал есть', at(t, s.R - 0.4, yB + s.hC + s.pitch) === 1,
        at(t, s.R - 0.4, yB + s.hC + s.pitch));
    chk(tag + ': во впадине снаружи пусто', at(t, s.R - 0.4, yB + s.hC + s.p2) === 0,
        at(t, s.R - 0.4, yB + s.hC + s.p2));
    /* КОЛЬЦО МЕЖДУ ПРОХОДОМ И ВНУТРЕННИМ ГРЕБНЕМ У ВЕРХНЕГО ТОРЦА: с ободом это тело обода, без
       обода — пустота. Ровно здесь первая редакция и давала ноль вместо единицы. */
    chk(tag + ': кольцо у верхнего торца — ' + (hC > 0 ? 'тело обода' : 'пустота'),
        at(t, (s.rIn + s.R - s.e)/2, yB + s.H - 0.4) === (hC > 0 ? 1 : 0),
        at(t, (s.rIn + s.R - s.e)/2, yB + s.H - 0.4));
  }
}

console.log('\n=== толщина стенки — та, что заказана (мерится по нормали) ===');
/* Косая стенка сечения — это пара параллельных отрезков: наружный от гребня к впадине и внутренний
   от гребня к впадине. Расстояние между ними и есть толщина. Радиальный сдвиг дал бы здесь
   `wall·(шаг/2)/L` — при глубине 5 и шаге 6 это 0.51 от заказанного. */
function measuredWall(ov){
  const s = S(ov), p2 = s.p2;
  const a = [s.R, s.hC], b = [s.R - s.amp, s.hC + p2];          // наружная косая стенка
  const c = [s.R - s.e, s.hC];                                   // та же стенка изнутри
  const dx = b[0]-a[0], dy = b[1]-a[1], n = Math.hypot(dx, dy);
  return Math.abs((c[0]-a[0])*dy - (c[1]-a[1])*dx)/n;            // расстояние точки до прямой
}
for (const ov of [{}, {belAmp:5, belPitch:6, belWall:0.8}, {belAmp:1, belPitch:20, belWall:1.2},
                  {belAmp:10, belPitch:30, belWall:0.4}, {belD:120, belAmp:2, belPitch:8, belWall:1.6}]){
  const want = S(ov).wall, got = measuredWall(ov);
  chk('стенка ' + want + ' при глубине ' + S(ov).amp + ' и шаге ' + S(ov).pitch + ' — она и есть',
      near(got, want, 1e-9), {заказано:want, вышло:got});
}
{
  /* И ЧТО РАДИАЛЬНЫЙ СДВИГ ЗДЕСЬ ДЕЙСТВИТЕЛЬНО ДАЛ БЫ ДРУГОЕ ЧИСЛО — иначе проверка выше проверяла
     бы совпадение, а не правило: при глубине 5 и шаге 6 разница вдвое. */
  const s = S({belAmp:5, belPitch:6, belWall:0.8});
  chk('  а радиальный сдвиг дал бы вдвое тоньше',
      near(s.wall*s.p2/s.L, 0.411, 0.002), s.wall*s.p2/s.L);
  chk('отступ по нормали больше толщины ровно в L/(шаг/2) раз',
      near(s.e, s.wall*s.L/s.p2, 1e-12) && s.e > s.wall, {e:s.e, wall:s.wall});
  /* В ПРЕДЕЛЕ НУЛЕВОЙ ГЛУБИНЫ отступ обязан сойтись к толщине: гофра нет, стенка вертикальная,
     нормаль смотрит по радиусу. Через панель туда не попасть — у глубины минимум 1 мм, и это
     правильно: нулевой гофр не сильфон, — поэтому проверяется сама формула. */
  const eOf = (amp, p2, wall) => wall*Math.hypot(amp, p2)/p2;
  chk('  в пределе нулевой глубины отступ сходится к толщине',
      near(eOf(1e-9, 5, 0.8), 0.8, 1e-9) && eOf(0.5, 5, 0.8) > 0.8 && eOf(0.5, 5, 0.8) < 0.81,
      {ноль:eOf(1e-9, 5, 0.8), полмиллиметра:eOf(0.5, 5, 0.8)});
  chk('  и панель к нулевой глубине не пускает',
      S({belAmp:0}).amp === 1 && SHAPE_PARAMS.box.find(r => r.key === 'belAmp').min === 1, S({belAmp:0}).amp);
}

console.log('\n=== числа, которые называет панель ===');
{
  const s = S({});
  chk('умолчания: Ø40, глубина 4, шаг 10, 5 гофров, стенка 0.8, обод 4',
      s.R === 20 && s.amp === 4 && s.pitch === 10 && s.n === 5 && s.wall === 0.8 && s.hC === 4);
  chk('высота = два обода плюс шаг на гофр', near(s.H, 2*4 + 5*10, 1e-12), s.H);
  chk('  и габарит сетки её подтверждает', near(BB({}).y, s.H, 1e-6), BB({}).y);
  chk('  и наружный габарит равен Ø по гребню', near(BB({}).x, 2*s.R, 0.02), BB({}).x);
  chk('проход = Ø по гребню минус глубина и отступ с обеих сторон',
      near(s.bore, 2*(s.R - s.amp - s.e), 1e-12) && near(s.bore, 29.951, 0.001), s.bore);
  chk('угол стенки = atan(2·глубина/шаг)', near(s.tilt, Math.atan2(4, 5)*180/Math.PI, 1e-12) &&
      near(s.tilt, 38.66, 0.01), s.tilt);
  /* ХОД: на каждом шаге остаются два листа, и по вертикали лист занимает не толщину, а `wall·L/amp` —
     поставленный на ребро, он тем выше, чем круче. */
  chk('ход сжатия = n·(шаг − два осевых листа)',
      near(s.travel, 5*(10 - 2*0.8*s.L/4), 1e-12) && near(s.travel, 37.19, 0.01), s.travel);
  chk('  и он меньше корпуса гофра', s.travel < s.n*s.pitch);
  chk('стенка 0.8 соплом 0.4 — ровно два прохода', s.passes === 2 && !s.offAtLine);
  chk('  а 0.9 — это 2.25, и об этом говорится',
      near(S({belWall:0.9}).passes, 2.25, 1e-12) && S({belWall:0.9}).offAtLine);
  chk('  сопло 0.6: те же 0.8 мм это 1.33 прохода',
      near(S({printNozzle:'0.6'}).passes, 0.8/0.6, 1e-12) && S({printNozzle:'0.6'}).offAtLine);
}

console.log('\n=== мелкий шаг при глубоком гофре — нависание ===');
{
  chk('глубина 8, шаг 4: стенка под 76° к вертикали',
      near(S({belAmp:8, belPitch:4}).tilt, Math.atan2(8, 2)*180/Math.PI, 1e-12) &&
      near(S({belAmp:8, belPitch:4}).tilt, 75.96, 0.01), S({belAmp:8, belPitch:4}).tilt);
  chk('  и об этом сказано', warn({belAmp:8, belPitch:4}).some(w => w.indexOf('к вертикали') > 0));
  chk('шаг ровно вдвое больше глубины — это ровно 45°',
      near(S({belAmp:4, belPitch:8}).tilt, 45, 1e-12), S({belAmp:4, belPitch:8}).tilt);
  chk('  и на 45° ещё не ругаются', !warn({belAmp:4, belPitch:8}).some(w => w.indexOf('к вертикали') > 0));
  /* ОБЕЩАННЫЙ УГОЛ СВЕРЯЕТСЯ С СЕТКОЙ, А НЕ С САМИМ СОБОЙ: наклон меряется по нормалям граней.
     Из замера выкинуто ровно две вещи, и обе по делу: грани ПЕРВОГО СЛОЯ (они лежат на столе, это не
     нависание) и ТОРЦЫ, смотрящие ровно вниз (у них наклона нет — их ловит замер мостов, а не
     нависаний). Первая редакция этой проверки не выкидывала ни того ни другого, получала честные
     90° от нижнего торца и ругалась на верную геометрию. */
  const worst = ov => { const t = B(Object.assign({sealMode:'bellows'}, ov));
    let yMin = Infinity; for (const T of t) for (const v of T) if (v[1] < yMin) yMin = v[1];
    let m = 0; for (const T of t){
      if (T.every(v => v[1] < yMin + 0.5)) continue;                       // первый слой
      const u = [T[1][0]-T[0][0], T[1][1]-T[0][1], T[1][2]-T[0][2]];
      const v = [T[2][0]-T[0][0], T[2][1]-T[0][1], T[2][2]-T[0][2]];
      const n = [u[1]*v[2]-u[2]*v[1], u[2]*v[0]-u[0]*v[2], u[0]*v[1]-u[1]*v[0]];
      const len = Math.hypot(n[0], n[1], n[2]); if (len < 1e-12) continue;
      const down = -n[1]/len; if (down <= 1e-9 || down > 0.999) continue;   // вниз, но не плашмя
      if (90 - Math.acos(Math.min(1, down))*180/Math.PI > m)
        m = 90 - Math.acos(Math.min(1, down))*180/Math.PI;
    } return m; };
  /* Нависают у сильфона ровно две поверхности: косая стенка гофра и конус расточки верхнего обода.
     Худшее из двух — то, что и должна показать сетка. */
  for (const ov of [{}, {belAmp:8, belPitch:4}, {belCollar:12}, {belCollar:0}]){
    const s = S(ov), want = Math.max(s.tilt, s.hC > 0 ? s.coneTilt : 0);
    chk('наклон нависающих граней в сетке = max(стенка, конус): ' + JSON.stringify(ov),
        near(worst(ov), want, 0.6), {сетка:worst(ov), обещано:want, стенка:s.tilt, конус:s.coneTilt});
  }
}

console.log('\n=== конус под верхним ободом убирает карниз ===');
/* ОБОД СТОИТ НАД ГОФРОМ, и его проход уже внутреннего гребня под ним ровно на глубину гофра. При
   ЦИЛИНДРИЧЕСКОЙ расточке под ободом висел бы кольцевой карниз этой ширины, и замер пролёта видел на
   нём мост в двадцать два миллиметра: хорда, идущая по узкому кольцу вскользь, длинная. */
{
  const s = S({});
  chk('конус перекрывает глубину гофра за высоту обода',
      near(s.coneTilt, Math.atan2(s.amp, s.hC)*180/Math.PI, 1e-12) && near(s.coneTilt, 45, 1e-9), s.coneTilt);
  chk('  и на умолчаниях это ровно 45°: глубина 4 при ободе 4', S({}).amp === S({}).hC);
  chk('выше обод — положе конус', S({belCollar:12}).coneTilt < S({}).coneTilt);
  chk('обод ниже гофра — конус круче 45°, и об этом сказано',
      S({belCollar:2}).coneTilt > 45 && warn({belCollar:2}).some(w => w.indexOf('обод ') === 0),
      S({belCollar:2}).coneTilt);
  chk('  а на 45° и положе не ругаются',
      !warn({}).some(w => w.indexOf('обод ') === 0) && !warn({belCollar:12}).some(w => w.indexOf('обод ') === 0));
  /* И ГЛАВНОЕ — ЧТО КАРНИЗА БОЛЬШЕ НЕТ: мера пролёта на той же детали мерила 22 мм. */
  const p = P({}), br = bridgeSpec(B({sealMode:'bellows'}), p);
  chk('замер пролёта больше не находит карниза под ободом', br.span < 10, br);
  chk('  и в советах нет строки про обдув на мостах',
      !partProfileRows(p, B({sealMode:'bellows'})).some(r => r[0].indexOf('Обдув') === 0),
      partProfileRows(p, B({sealMode:'bellows'})).map(r => r[0]));
}

console.log('\n=== обрезка глубины попадает в точку, а не около ===');
{
  const s = S({belD:20, belAmp:40});
  chk('глубина обрезана', s.ampCut && s.amp < 40);
  chk('  и проход вышел РОВНО в минимум', near(s.bore, 2*BELLOWS_MIN_BORE, 1e-9), s.bore);
  chk('  и об этом сказано числом', warn({belD:20, belAmp:40}).some(w => w.indexOf('глубина гофра уменьшена') === 0));
  for (const ov of [{belD:20, belAmp:40}, {belD:9, belAmp:30, belPitch:3, belWall:0.5},
                    {belD:200, belAmp:40, belPitch:1.5, belWall:0.4}, {belD:12, belAmp:40, belWall:3}]){
    const q = S(ov);
    chk('на пределе проход ровно ' + (2*BELLOWS_MIN_BORE) + ': ' + JSON.stringify(ov),
        !q.ampCut || near(q.bore, 2*BELLOWS_MIN_BORE, 1e-9), {bore:q.bore, amp:q.amp, cut:q.ampCut});
  }
  chk('незатребованная обрезка не срабатывает', !S({}).ampCut && !S({belAmp:1}).ampCut);
  chk('  и тогда про уменьшение не говорят', !warn({}).some(w => w.indexOf('глубина гофра уменьшена') === 0));
  /* СТЕНКА ТОЛЩЕ ПОЛУШАГА — ГОФРА НЕ ВЫЙДЕТ ВОВСЕ: отступ по нормали уходит в бесконечность. */
  chk('стенка толще полушага: глубина обнуляется, а не даёт вывернутое сечение',
      bellowsAmpMax(20, 0.5, 3) === 0, bellowsAmpMax(20, 0.5, 3));
}

console.log('\n=== сетка герметична на всём поле ===');
{
  const sets = [];
  for (const D of [8, 40, 200]) for (const amp of [1, 4, 40]) for (const pitch of [1, 10, 60])
    for (const wall of [0.3, 0.8, 3]) for (const n of [1, 5, 60]) for (const hC of [0, 4, 30])
      sets.push({belD:D, belAmp:amp, belPitch:pitch, belWall:wall, belN:n, belCollar:hC});
  let bad = 0, first = null, vol = 0;
  for (const ov of sets){
    const t = B(Object.assign({sealMode:'bellows'}, ov));
    const m = manifoldCheck(t);
    if (!m.watertight || !t.length){ bad++; if (!first) first = {ov, m}; }
    if (!(meshVolume(t) > 0)){ vol++; if (!first) first = {ov, объём:meshVolume(t)}; }
  }
  chk('все ' + sets.length + ' наборов краёв панели герметичны', bad === 0, first);
  chk('  и у всех положительный объём', vol === 0, first);
  /* ХОД ЗАЖАТ СНИЗУ НУЛЁМ, И ЭТО НЕ ПРИДИРКА. На 252 из этих наборов сырая разность отрицательна, а
     при нулевой глубине она равна −Infinity: без зажима человек прочитал бы в предупреждении
     «ход сжатия ≈ -Infinity мм». Мутация, снявшая зажим, пережила первую редакцию этих проверок. */
  let badT = 0, firstT = null;
  for (const ov of sets){ const q = S(ov);
    if (!(q.travel >= 0) || !isFinite(q.travel)){ badT++; if (!firstT) firstT = {ov, ход:q.travel}; } }
  chk('  и ход у всех конечный и неотрицательный', badT === 0, firstT);
  const wAll = sets.map(ov => warn(ov).join(' '));
  chk('  и ни в одном предупреждении нет ни Infinity, ни NaN, ни минуса перед числом',
      !wAll.some(t => /Infinity|NaN|≈ -/.test(t)), wAll.find(t => /Infinity|NaN|≈ -/.test(t)));
}

console.log('\n=== нулевой ход объясняется, а не просто называется ===');
{
  /* Шаг 1 мм при стенке 0.8: два листа по вертикали занимают больше шага, и сжиматься некуда.
     «Ход ≈ 0» формально верно и бесполезно — нужно знать, ЧТО крутить. */
  const ov = {belPitch:1, belWall:0.8, belAmp:1};
  chk('ход обнулился', S(ov).travel === 0, S(ov).travel);
  chk('  и сказано, что сжиматься некуда', warn(ov).some(w => w.indexOf('сжиматься ему НЕКУДА') > 0), warn(ov));
  chk('  и названы шаг, стенка и сколько занимают два листа',
      warn(ov).some(w => w.indexOf('два листа стенки') > 0));
  chk('  а при живом ходе про это не говорят',
      !warn({}).some(w => w.indexOf('НЕКУДА') > 0) && warn({}).some(w => w.indexOf('ход сжатия') > 0));
}

console.log('\n=== объём сходится с теоремой Паппа ===');
/* Объём тела вращения = площадь сечения × путь центра тяжести. Считается по тем же точкам, но
   ДРУГОЙ формулой, и потому ловит ошибку в самом вращении. Расхождение — от многогранника: сетка
   вписана в тело вращения, и её объём меньше ровно на коэффициент, который здесь и проверяется. */
{
  const pappus = ov => { const pts = L(ov); let A = 0, Cr = 0;
    for (let i = 0; i < pts.length; i++){ const a = pts[i], b = pts[(i+1)%pts.length];
      const cr = a[0]*b[1] - b[0]*a[1]; A += cr; Cr += (a[0] + b[0])*cr; }
    A /= 2; Cr /= (6*A);
    return Math.abs(2*Math.PI*Cr*A); };
  for (const ov of [{}, {belAmp:2, belPitch:20}, {belD:120, belN:3}, {belCollar:0}]){
    const s = S(ov), got = meshVolume(B(Object.assign({sealMode:'bellows'}, ov))), want = pappus(ov);
    const k = (s.seg/(2*Math.PI))*Math.sin(2*Math.PI/s.seg);        // вписанный многоугольник
    chk('объём по Паппу сходится: ' + JSON.stringify(ov), near(got, want*k, want*0.002),
        {сетка:got, Папп:want, сПоправкой:want*k});
  }
}

console.log('\n=== ручки отзываются, и в ту сторону ===');
{
  chk('больше гофров — выше', S({belN:9}).H > S({belN:5}).H);
  chk('больше гофров — длиннее ход', S({belN:9}).travel > S({belN:5}).travel);
  chk('глубже гофр — уже проход', S({belAmp:6}).bore < S({belAmp:4}).bore);
  chk('толще стенка — уже проход', S({belWall:1.6}).bore < S({belWall:0.8}).bore);
  chk('толще стенка — короче ход', S({belWall:1.6}).travel < S({belWall:0.8}).travel);
  chk('шире шаг — положе стенка', S({belPitch:20}).tilt < S({belPitch:10}).tilt);
  chk('глубже гофр — круче стенка', S({belAmp:6}).tilt > S({belAmp:4}).tilt);
  chk('выше обод — выше деталь, но ход тот же',
      S({belCollar:10}).H > S({belCollar:4}).H && near(S({belCollar:10}).travel, S({belCollar:4}).travel, 1e-12));
  chk('толще стенка — больше материала',
      meshVolume(B({sealMode:'bellows', belWall:1.6})) > meshVolume(B({sealMode:'bellows', belWall:0.8})));
}

console.log('\n=== сильфон вписан в семью, а не пришит сбоку ===');
{
  const p = P({});
  chk('семья опознаётся как уплотнение', dominantMode(p) === 'seal', dominantMode(p));
  chk('строка формы называет сильфон', activeShapeLabel !== undefined &&
      (B({sealMode:'bellows'}), activeShapeLabel().indexOf('сильфон') === 0), (B({sealMode:'bellows'}), activeShapeLabel()));
  chk('  и в ней Ø, высота, число гофров и ход',
      /сильфон Ø40×58 \(5 гофр\., ход 37\)/.test((B({sealMode:'bellows'}), activeShapeLabel())),
      (B({sealMode:'bellows'}), activeShapeLabel()));
  chk('справка о модели есть и говорит про стенку',
      !!MODEL_HELP['seal:bellows'] && MODEL_HELP['seal:bellows'].what.indexOf('тонк') > 0);
  chk('  и советует мягкий пластик', (MODEL_HELP['seal:bellows'].mat || []).indexOf('tpu') >= 0);
  chk('плитка подрежима есть в списке',
      subModelTiles('seal').some(t => t.v === 'bellows'), subModelTiles('seal').map(t => t.v));
  chk('строка панели прячется у других подрежимов',
      ['belD','belAmp','belPitch','belN','belWall','belCollar'].every(k => {
        const r = SHAPE_PARAMS.box.find(q => q.key === k);
        return r && Array.isArray(r.w) && r.w.length === 1 && r.w[0] === 'bellows'; }));
  chk('числа сильфона выводятся всегда, а не только когда плохо',
      warn({}).some(w => w.indexOf('сильфон: проход') === 0), warn({}));
  chk('у других подрежимов про сильфон не говорят',
      !(collectPrintWarnings(Object.assign(defaultBoxParams(), {gfBaseplate:false, sealMode:'oring'})) || [])
        .some(w => w.indexOf('сильфон') === 0));
  chk('«сброс всего» выключает сильфон',
      !pickedOn(Object.assign(defaultBoxParams(), {gfBaseplate:false}), 'sealMode'));
}

console.log('\n=== советы по печати отзываются на сильфон ===');
{
  const p = P({}), t = B({sealMode:'bellows'});
  const rows = partProfileRows(p, t).map(r => r[0]);
  /* СРЕДНЯЯ ТОЛЩИНА У СИЛЬФОНА С ОБОДАМИ — НЕ ТОЛЩИНА СТЕНКИ: два стоящих обода толщиной пять
     миллиметров поднимают среднее с 0.8 до 1.05, и мера обязана эту разницу видеть, иначе она мерит
     не деталь. НА СОВЕТЕ это с v25.51.0 не сказывается: петли идут с обеих сторон стенки, и обе
     толщины смыкаются двумя периметрами. Прежнее правило просило вдвое больше и выдавало здесь три —
     на стенке, которую две петли закрывают целиком. */
  chk('сильфону советуют два периметра — 0.8 мм соплом 0.4 смыкают две петли',
      rows.some(r => r === 'Периметров: 2'), rows);
  chk('  средняя толщина при этом между стенкой и ободом',
      meanThickness(t) > S({}).wall && meanThickness(t) < 2, meanThickness(t));
  const bare = P({belCollar:0}), bt = B({sealMode:'bellows', belCollar:0});
  chk('без ободов совет тот же — оболочка одна',
      partProfileRows(bare, bt).some(r => r[0] === 'Периметров: 2'),
      {толщина:meanThickness(bt), строки:partProfileRows(bare, bt).map(r => r[0])});
  chk('  и средняя толщина там равна толщине стенки', near(meanThickness(bt), 0.8, 0.05), meanThickness(bt));
  chk('  и говорят, что заполнение тут не решает', rows.some(r => r === 'Заполнение: не решает'), rows);
  chk('расход считает оболочку, а не литой цилиндр',
      printBudget(t, p).fill > 0.9 && printBudget(t, p).mat < meshVolume(t)*1.01,
      {доля:printBudget(t, p).fill});
}

console.log('\n=== TOTAL:', pass, 'passed,', fail, 'failed ===');
if (fail) process.exitCode = 1;
