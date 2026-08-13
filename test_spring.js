// Витая пружина сжатия — и ЧИСЛО, без которого она просто спираль.
//
// Геометрия здесь дешёвая и заимствованная: пружина полая ровно так же, как штопор, r(θ,y) её не
// описывает, и строится она тем же `sweepTube3D`. Новой машинерии — ноль. Поэтому и проверки здесь не про
// то, что спираль похожа на спираль, а про три вещи, которые на неё не видно:
//
//   1. ВИТКИ НЕ ПЕРЕСЕКАЮТСЯ. Это единственная в приложении оболочка, способная пройти сквозь саму себя:
//      не два проникающих тела, к которым всё остальное привыкло, а одна поверхность. Условие простое —
//      шаг не меньше Ø прутка, — и оно проверяется ПО СЕТКЕ: луч вдоль оси витка обязан встретить ровно
//      столько отдельных кусков материала, сколько заказано витков.
//   2. ЖЁСТКОСТЬ СЧИТАЕТСЯ ВЕРНО. k = G·d⁴/(8·Dm³·n) сверяется с интегралом, которым она берётся у
//      конической, а модуль сдвига — с модулем упругости, из которого он выведен. Четвёртая степень
//      прутка и первая степень числа витков проверены изменением, а не пересчётом той же формулы.
//   3. ЧИСЛА ДОХОДЯТ ДО СЛОВ. Каждый флаг спецификации должен где-то печататься: молчащее предупреждение
//      — ровно та порода дефекта, которую ловила ревизия v18.22.0, и заводить её заново нет смысла.
//
// Отдельным разделом — УМОЛЧАНИЯ. Проверки штопора все до одной задавали свои числа руками, и поэтому
// деталь была правильной всюду, кроме того состояния, в котором её видит человек, открывший приложение
// (v18.22.1). Здесь умолчания меряются первыми.
// Run via ./run-all.sh.
let pass=0, fail=0;
function chk(n,c,e){if(c){pass++;console.log('  OK  ',n);}else{fail++;console.log('  FAIL',n,e!==undefined?JSON.stringify(e):'');}}

function setp(ov){ logos.length=0; boxHoles.length=0; dieFaces.length=0;
  Object.assign(paramState.box, defaultBoxParams(), {gfBaseplate:false, threadMode:'spring'}, ov);
  return paramState.box; }
const mk = ov => buildTrisForShape('box', setp(ov));
const spec = ov => springSpec(setp(ov));
const warn = ov => { setp(ov); return collectPrintWarnings(paramState.box).join(' | '); };

const bbox = tris => { const lo=[1e30,1e30,1e30], hi=[-1e30,-1e30,-1e30];
  for(const T of tris) for(const v of T) for(let a=0;a<3;a++){ if(v[a]<lo[a])lo[a]=v[a]; if(v[a]>hi[a])hi[a]=v[a]; }
  return {lo,hi}; };
const maxRadiusIn = (tris, y0, y1) => { let r=0;
  for(const T of tris) for(const v of T) if(v[1]>=y0 && v[1]<=y1) r=Math.max(r, Math.hypot(v[0],v[2]));
  return r; };

// Куски материала вдоль луча, посчитанные ПО ГЛУБИНЕ (чётность здесь не годится — см. test_funnel_cap.js).
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
// Вертикальный луч на радиусе r под углом a: ax = 1 (Y), и тогда u = z, v = x.
const runsAtRadius = (tris, r, a) => solidRuns(tris, 1, r*Math.sin(a), r*Math.cos(a));

console.log('=== умолчания: то состояние, в котором деталь видит человек ===');
{
  const s = spec({}), tris = mk({}), bb = bbox(tris);
  chk('строится', tris.length > 2000, tris.length);
  const mc = manifoldCheck(tris);
  chk('герметична', mc.watertight, {open:mc.openEdges, bad:mc.badEdges});
  chk('высота сетки — это свободная длина из спецификации',
      Math.abs((bb.hi[1]-bb.lo[1]) - s.L0) < 0.05, {сетка:+(bb.hi[1]-bb.lo[1]).toFixed(2), спец:+s.L0.toFixed(2)});
  chk('наружный Ø сетки — заказанный', Math.abs(2*maxRadiusIn(tris, bb.lo[1], bb.hi[1]) - s.D) < 0.15,
      +(2*maxRadiusIn(tris, bb.lo[1], bb.hi[1])).toFixed(2));
  /* ПРОПОРЦИИ, А НЕ ПРОСТО ЧИСЛА. Индекс C = Dm/d — то, чем пружина отличается от кольца (ниже 4 гнуть
     нечего) и от проволоки (выше 14 витки ведёт). Умолчания обязаны попадать в середину этого коридора,
     иначе первое, что видит человек, — предупреждение. */
  chk('индекс на умолчаниях в рабочем коридоре', s.C > 4 && s.C < 10, +s.C.toFixed(2));
  chk('и просвет между витками равен Ø прутка', Math.abs(s.gap - s.d) < 1e-9, {gap:+s.gap.toFixed(2), d:+s.d.toFixed(2)});
  chk('жёсткость на умолчаниях — рабочая, не резинка и не лом', s.k > 0.1 && s.k < 3, +s.k.toFixed(3));
  chk('усилие на всём ходу измеримое', s.k*s.travel > 1 && s.k*s.travel < 100, +(s.k*s.travel).toFixed(1));
  chk('на умолчаниях ни одного предупреждения, кроме самого расчёта',
      collectPrintWarnings(paramState.box).length === 1, collectPrintWarnings(paramState.box));
}

console.log('\n=== витки не пересекаются: это единственная оболочка, способная пройти сквозь себя ===');
{
  /* Луч вдоль оси витка встречает по одному куску прутка на виток. Слипшиеся витки дали бы куски длиннее
     Ø прутка и числом меньше; пересёкшиеся — и вовсе сплошной столб. Меряется на ГОЛОЙ спирали: шайбы
     съели бы крайние промежутки, а это ровно то, что здесь и проверяется. */
  const s = spec({springEnds:'open'}), tris = mk({springEnds:'open'});
  const Rm = (s.D - s.d)/2;
  /* Углы взяты не круглые намеренно: путь начинается ровно на нуле, и луч, пущенный туда же, проходит
     через сами вершины сетки — каждый такой прокол считается дважды и глушит все до одного. Тот же
     подвох, что у пробника сборки, и лечится он тем же — не попадать в решётку. */
  for(const a of [0.37, 1.1, 2.7, 4.9]){
    const runs = runsAtRadius(tris, Rm, a);
    chk('луч на среднем радиусе (угол '+a.toFixed(1)+'): кусков ровно по числу витков',
        runs.length === s.n, {кусков:runs.length, витков:s.n});
    const hs = runs.map(r => r[1]-r[0]);
    chk('  и каждый кусок — толщина прутка', hs.every(h => Math.abs(h - s.d) < 0.08), hs.map(h=>+h.toFixed(2)));
    const gaps = []; for(let i=1;i<runs.length;i++) gaps.push(runs[i][0] - runs[i-1][1]);
    chk('  а промежутки между ними — просвет', gaps.every(g => Math.abs(g - s.gap) < 0.08), gaps.map(g=>+g.toFixed(2)));
  }
}
{
  // Зажим шага — не украшение: попросили шаг меньше прутка, и без зажима витки прошли бы друг сквозь друга.
  const s = spec({springPitch:0.5, springWire:3, springD:20});
  chk('шаг зажат по Ø прутка', s.pitchCut && Math.abs(s.pitch - (s.d + 0.4)) < 1e-9,
      {просили:0.5, дали:+s.pitch.toFixed(2)});
  chk('и об этом сказано словом', /шаг пружины поднят/.test(warn({springPitch:0.5, springWire:3, springD:20})));
  const tris = mk({springPitch:0.5, springWire:3, springD:20, springEnds:'open'});
  chk('и после зажима витки по-прежнему отдельные',
      runsAtRadius(tris, (s.D-s.d)/2, 0.3).length === s.n, runsAtRadius(tris, (s.D-s.d)/2, 0.3).length);
  chk('сетка при этом герметична', manifoldCheck(tris).watertight);
}

console.log('\n=== жёсткость: считается, а не обещается ===');
{
  const s = spec({});
  const Dm = s.D - s.d;
  const closed = s.G*Math.pow(s.d,4)/(8*Dm*Dm*Dm*s.n);
  chk('у цилиндрической интеграл сходится к k = G·d⁴/(8·Dm³·n)', Math.abs(s.k - closed)/closed < 1e-9,
      {интеграл:+s.k.toFixed(6), формула:+closed.toFixed(6)});
  for(const key of Object.keys(SPRING_MATERIALS)){
    const m = SPRING_MATERIALS[key], t = spec({springMat:key});
    chk(key+': G выведен из E, а не вписан', Math.abs(t.G - m.E/(2*(1+m.nu))) < 1e-9, +t.G.toFixed(3));
  }
  /* Четвёртая степень прутка — самая сильная ручка модели, и проверяется она ИЗМЕНЕНИЕМ, а не подстановкой
     в ту же формулу. Шаг задан руками и с запасом, чтобы зажим по Ø прутка не вмешался в сравнение. */
  /* Наружный Ø при этом двигается вместе с прутком: работает СРЕДНИЙ диаметр, D − d, и оставить D тем же
     значило бы менять две величины разом (при D = 16 отношение выходит 25.4, а не 16 — куб отношения
     средних диаметров сверху). Здесь средний удержан на 14 мм. */
  const thin = spec({springWire:2, springD:16, springPitch:12}), fat = spec({springWire:4, springD:18, springPitch:12});
  chk('вдвое толще пруток — в шестнадцать раз жёстче (средний Ø тот же)',
      Math.abs(fat.k/thin.k - 16) < 1e-6, +(fat.k/thin.k).toFixed(4));
  const n5 = spec({springTurns:5}), n10 = spec({springTurns:10});
  chk('вдвое больше витков — вдвое мягче', Math.abs(n5.k/n10.k - 2) < 1e-9, +(n5.k/n10.k).toFixed(4));
  const big = spec({springD:32, springWire:2.56}), small = spec({springD:16, springWire:2.56});
  chk('Ø входит кубом среднего диаметра',
      Math.abs(big.k/small.k - Math.pow((16-2.56)/(32-2.56), 3)) < 1e-6, +(big.k/small.k).toFixed(4));
  chk('TPU мягче PETG на два порядка', spec({springMat:'petg'}).k / spec({springMat:'tpu'}).k > 50,
      +(spec({springMat:'petg'}).k/spec({springMat:'tpu'}).k).toFixed(0));
}
{
  /* У КОНИЧЕСКОЙ ОДНОЙ ФОРМУЛЫ НЕТ. Складываются податливости витков, а податливость идёт по кубу
     диаметра — поэтому среднее по кубам и куб среднего дают разные числа, и подставить средний диаметр в
     цилиндрическую формулу было бы ошибкой. Проверяется и то и другое: что интеграл равен среднему по
     кубам и что он ОТЛИЧАЕТСЯ от формулы по среднему диаметру. */
  const s = spec({springTopD:8, springD:24, springWire:2.5, springPitch:6});
  const a = s.D - s.d, b = s.Dtop - s.d;
  const mean3 = (Math.pow(a,4) - Math.pow(b,4))/(4*(a-b));          // ∫Dm³ по линейному сужению
  const kInt = s.G*Math.pow(s.d,4)/(8*mean3*s.n);
  chk('коническая: k — интеграл по кубам диаметра', Math.abs(s.k - kInt)/kInt < 2e-5,
      {спец:+s.k.toFixed(5), интеграл:+kInt.toFixed(5)});
  const kMean = s.G*Math.pow(s.d,4)/(8*Math.pow((a+b)/2,3)*s.n);
  chk('и это НЕ формула по среднему диаметру', Math.abs(s.k - kMean)/s.k > 0.02,
      {по_интегралу:+s.k.toFixed(5), по_среднему:+kMean.toFixed(5)});
  chk('коническая жёстче цилиндрической того же основания',
      s.k > spec({springTopD:0, springD:24, springWire:2.5, springPitch:6}).k);
  const tris = mk({springTopD:8, springD:24, springWire:2.5, springPitch:6}), bb = bbox(tris);
  const h = bb.hi[1]-bb.lo[1];
  chk('и сужается по сетке: низ шире верха',
      maxRadiusIn(tris, bb.lo[1], bb.lo[1]+h*0.15) > maxRadiusIn(tris, bb.hi[1]-h*0.15, bb.hi[1]) + 3,
      {низ:+maxRadiusIn(tris, bb.lo[1], bb.lo[1]+h*0.15).toFixed(1),
       верх:+maxRadiusIn(tris, bb.hi[1]-h*0.15, bb.hi[1]).toFixed(1)});
  chk('коническая герметична', manifoldCheck(tris).watertight);
}

console.log('\n=== ход: два разных ограничителя, и меньший главный ===');
{
  const s = spec({});
  chk('ход до упора — просвет, взятый по числу витков', Math.abs(s.sSol - s.n*s.gap) < 1e-9, +s.sSol.toFixed(2));
  chk('и сомкнутая длина — та же формула при шаге, равном Ø прутка',
      Math.abs(s.Lsol - (2*s.tp - 2*s.emb + s.d + s.d*s.n)) < 1e-9,
      {спец:+s.Lsol.toFixed(2), формула:+(2*s.tp-2*s.emb+s.d+s.d*s.n).toFixed(2)});
  chk('рабочий ход — меньшее из двух', Math.abs(s.travel - Math.min(s.sSol, s.sMax)) < 1e-12);
  chk('на умолчаниях ограничивает смыкание', !s.stressLimited && s.travel === s.sSol);
  // Жёсткая пружина упирается в прочность раньше, чем в смыкание, и это то, чего на экране не видно.
  const hard = spec({springTopD:6});
  chk('узкая коническая упирается в ПРОЧНОСТЬ', hard.stressLimited && hard.travel === hard.sMax,
      {до_упора:+hard.sSol.toFixed(1), до_предела:+hard.sMax.toFixed(1)});
  chk('и об этом сказано словом', /ход ограничен ПРОЧНОСТЬЮ/.test(warn({springTopD:6})));
  /* Формула касательного напряжения — с поправкой Валя: у витой пружины напряжение на ВНУТРЕННЕЙ стороне
     витка выше среднего, и тем сильнее, чем меньше индекс. Без поправки тонкая пружина считалась бы
     прочнее, чем она есть. */
  const C = spec({}).C, Kw = (4*C-1)/(4*C-4) + 0.615/C;
  chk('поправка Валя на месте и больше единицы', Math.abs(spec({}).Kw - Kw) < 1e-12 && Kw > 1.1, +Kw.toFixed(3));
  chk('у тесной пружины поправка больше, чем у просторной',
      spec({springD:12, springWire:3}).Kw > spec({springD:40, springWire:3}).Kw);
}
{
  // Коническая, сложенная в плоскость: витки проходят друг мимо друга, и в сжатом виде остаются шайбы.
  const s = spec({springD:60, springTopD:12, springTurns:3, springWire:6});
  chk('складывается в плоскость', s.telescopes);
  chk('сомкнутая высота — шайбы и один пруток',
      Math.abs(s.Lsol - (2*s.tp - 2*s.emb + s.d)) < 1e-9, +s.Lsol.toFixed(2));
  chk('и об этом сказано словом', /складывается в плоскость/.test(warn({springD:60, springTopD:12, springTurns:3, springWire:6})));
  chk('обычная коническая так не складывается', !spec({springTopD:8, springD:24}).telescopes);
}

console.log('\n=== концы: шайбы, а не поджатые витки ===');
{
  /* Поджатый виток настоящей пружины ЛЕЖИТ на соседнем — в сетке это самопересечение единственной
     оболочки, и ради одной лишь опоры. Шайба даёт ту же опору отдельным телом, а заодно первый слой
     получается кольцом нормальной ширины, а не касательной линией к прутку. Проверяется по площади. */
  const flat = tris => { const bb=bbox(tris); let A=0;
    for(const T of tris){ if(!T.every(v => Math.abs(v[1]-bb.lo[1]) < 1e-6)) continue;
      const [a,b,c]=T; A += Math.abs((b[0]-a[0])*(c[2]-a[2]) - (b[2]-a[2])*(c[0]-a[0]))/2; }
    return A; };
  const withPlate = mk({}), bare = mk({springEnds:'open'});
  const s = spec({});
  chk('на шайбе деталь стоит всей площадью', flat(withPlate) > 0.9*Math.PI*s.D*s.D/4,
      {площадь:+flat(withPlate).toFixed(0), круг:+(Math.PI*s.D*s.D/4).toFixed(0)});
  chk('у голой спирали опоры нет вовсе', flat(bare) < 1, +flat(bare).toFixed(3));
  chk('голая спираль короче ровно на шайбы', Math.abs(spec({}).L0 - spec({springEnds:'open'}).L0
      - (2*s.tp - 2*s.emb)) < 1e-9);
  chk('обе герметичны', manifoldCheck(withPlate).watertight && manifoldCheck(bare).watertight);
}
{
  // Отверстие под направляющий стержень: луч по самой оси не встречает ничего.
  const holed = mk({springBore:6}), solid = mk({});
  chk('без отверстия ось перекрыта шайбами', solidRuns(solid, 1, 0, 0).length === 2,
      solidRuns(solid, 1, 0, 0).length);
  chk('с отверстием ось свободна', solidRuns(holed, 1, 0, 0).length === 0, solidRuns(holed, 1, 0, 0).length);
  chk('и стенка отверстия на месте: луч в 1 мм от края ловит обе шайбы',
      solidRuns(holed, 1, 0, 3.4).length === 2, solidRuns(holed, 1, 0, 3.4).length);
  chk('с отверстием герметична', manifoldCheck(holed).watertight);
  const wide = spec({springBore:100});
  chk('слишком широкое отверстие урезано, а не съедает спираль', wide.boreCut && wide.bore < wide.D - 2*wide.d,
      +wide.bore.toFixed(1));
  chk('и об этом сказано словом', /отверстие в шайбах урезано/.test(warn({springBore:100})));
  chk('направляемая пружина не объявляется заваливающейся',
      !spec({springTurns:20, springBore:6}).slender && spec({springTurns:20}).slender);
}

console.log('\n=== числа доходят до слов: молчащих флагов нет ===');
{
  chk('жёсткость печатается ВСЕГДА', /жёсткость .* Н\/мм/.test(warn({})));
  chk('и ход вместе с ней', /рабочий ход/.test(warn({})));
  chk('PLA: кручение поперёк слоёв', /кручением поперёк слоёв/.test(warn({springMat:'pla'})));
  chk('PETG об этом не предупреждают', !/кручением поперёк слоёв/.test(warn({springMat:'petg'})));
  chk('слишком мягкая: не удержит своего веса', /не удержит/.test(warn({springMat:'tpu'})));
  chk('тонкий пруток', /тоньше трёх проходов сопла/.test(warn({springD:6, springWire:0.5})));
  chk('урезанный пруток', /пруток пружины урезан/.test(warn({springD:10, springWire:8})));
  chk('низкий индекс', /ниже 4/.test(warn({springD:10, springWire:3})));
  chk('высокий индекс', /выше 14/.test(warn({springD:40, springWire:1.6})));
  chk('завал вбок', /завалится вбок/.test(warn({springTurns:20})));
  chk('крутой подъём витка', /подъём витка/.test(warn({springD:10, springPitch:20, springWire:1.6})));
  chk('на просторной пружине о подъёме не говорят', !/подъём витка/.test(warn({})));
}

console.log('\n=== своё, а не резьбино ===');
{
  /* Штопор до v18.22.1 брал Ø, шаг и длину у резьбы и на умолчаниях выдавал пружину. Здесь ручки свои с
     самого начала, и это проверяется тем же способом: чужие крутятся, деталь не меняется. */
  const vol = t => { let v=0; for(const T of t){ const [a,b,c]=T;
    v += (a[0]*(b[1]*c[2]-b[2]*c[1]) - a[1]*(b[0]*c[2]-b[2]*c[0]) + a[2]*(b[0]*c[1]-b[1]*c[0]))/6; } return v; };
  const a = mk({}), b = mk({threadD:80, threadPitch:0.5, threadLen:90, threadWall:6});
  chk('ручки резьбы пружину не трогают', Math.abs(vol(a) - vol(b)) < 1e-9,
      {своё:+vol(a).toFixed(2), 'с чужими':+vol(b).toFixed(2)});
  chk('справка на месте', !!MODEL_HELP['thread:spring']);
  chk('справка называет главное — жёсткость', /жёсткост/.test(MODEL_HELP['thread:spring'].what));
  chk('и материалы в ней настоящие',
      MODEL_HELP['thread:spring'].mat.every(m => !!PRINT_MATERIALS[m]), MODEL_HELP['thread:spring'].mat);
  setp({});
  chk('модель называет себя пружиной', /пружина/.test(activeShapeLabel()), activeShapeLabel());
}

console.log('\n=== TOTAL:', pass, 'passed,', fail, 'failed ===');
if(fail) process.exitCode = 1;
