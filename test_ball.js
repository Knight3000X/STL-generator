// Ажурный шар / фонарь: сферическая оболочка с прорезанными окнами.
//
// Узор задан НЕПРЕРЫВНЫМ ПОЛЕМ: g = половина ширины перемычки минус расстояние до её осевой линии, в
// миллиметрах; материал там, где g ≥ 0, а граница — изолиния g = 0, которую «шагающие квадраты»
// извлекают внутри ячейки где угодно. До этого ячейка была сплошной или дырой ЦЕЛИКОМ, и у спирали с
// ромбом граница шла лесенкой со ступенькой в целую ячейку. Замерено: 100 % площади стенок смотрело
// строго по осям сетки, и у ромба стенок выходило 9461 мм² против 4665 у сетки — вдвое больше при той
// же ширине перемычки, потому что лесенка длиннее диагонали, которую изображает.
//
// Поэтому здесь проверяется не только герметичность, но и ДВА следствия поля: доля стенок, идущих по
// осям сетки (у сетки и кладки она законно высокая — их перемычки и есть меридианы с параллелями, у
// спирали и ромба обязана быть низкой), и ширина перемычки, которая перестала квантоваться.
//
// Второе, что меряется, — кромки отверстий. Оболочку режут ПЛОСКОСТИ, а не широты: по широте наружная и
// внутренняя точки одной широты стоят на разной высоте, кромка выходит косой, и деталь садится на стол
// линией вместо кольца.
// Запускать через ./run-all.sh (extraction test).

let pass=0, fail=0;
function chk(n,c,e){ if(c){pass++;console.log('  OK  ',n);} else {fail++;console.log('  FAIL',n,e!==undefined?JSON.stringify(e):'');} }
function vol(t){let v=0;for(const T of t){const a=T[0],b=T[1],c=T[2];v+=(a[0]*(b[1]*c[2]-b[2]*c[1])-a[1]*(b[0]*c[2]-b[2]*c[0])+a[2]*(b[0]*c[1]-b[1]*c[0]))/6;}return v;}
function base(ov){ logos.length=0; boxHoles.length=0; dieFaces.length=0;
  Object.assign(paramState.box, defaultBoxParams(), {lnMode:'ball', lnD:90, lnT:1.6, lnTopD:26,
    lnBottomD:60, lnPattern:'grid', lnCols:12, lnRows:6, lnRib:2, lnTwist:180}, ov||{});
  return buildTrisForShape('box', paramState.box); }
function par(ov){ base(ov); return Object.assign({}, paramState.box); }

/* Доля площади СТЕНОК, чья касательная нормаль смотрит строго по осям сетки. Стенка — треугольник,
   нормаль которого почти перпендикулярна радиусу; «по осям» — в пределах 10° от направления на север
   или на восток. У лесенки эта доля равна единице по построению: все её отрезки идут либо по меридиану,
   либо по параллели. */
function wallAxisShare(t){
  let axis = 0, all = 0;
  for(const T of t){
    const u=[T[1][0]-T[0][0],T[1][1]-T[0][1],T[1][2]-T[0][2]], v=[T[2][0]-T[0][0],T[2][1]-T[0][1],T[2][2]-T[0][2]];
    const n=[u[1]*v[2]-u[2]*v[1], u[2]*v[0]-u[0]*v[2], u[0]*v[1]-u[1]*v[0]];
    const a=0.5*Math.hypot(n[0],n[1],n[2]); if(a<1e-12) continue;
    const c=[(T[0][0]+T[1][0]+T[2][0])/3,(T[0][1]+T[1][1]+T[2][1])/3,(T[0][2]+T[1][2]+T[2][2])/3];
    const rl=Math.hypot(c[0],c[1],c[2]); if(rl<1e-9) continue;
    const rh=[c[0]/rl,c[1]/rl,c[2]/rl], nl=Math.hypot(n[0],n[1],n[2]), nh=[n[0]/nl,n[1]/nl,n[2]/nl];
    if(Math.abs(nh[0]*rh[0]+nh[1]*rh[1]+nh[2]*rh[2])>0.35) continue;        // не стенка, а поверхность
    const north=[-rh[0]*rh[1], 1-rh[1]*rh[1], -rh[2]*rh[1]], nn=Math.hypot(north[0],north[1],north[2]);
    if(nn<1e-6) continue;
    const No=north.map(x=>x/nn);
    const Ea=[rh[1]*No[2]-rh[2]*No[1], rh[2]*No[0]-rh[0]*No[2], rh[0]*No[1]-rh[1]*No[0]];
    const ang=Math.atan2(nh[0]*Ea[0]+nh[1]*Ea[1]+nh[2]*Ea[2], nh[0]*No[0]+nh[1]*No[1]+nh[2]*No[2]);
    const d=Math.min.apply(null,[0,Math.PI/2,Math.PI,-Math.PI/2,-Math.PI].map(q=>Math.abs(ang-q)));
    all+=a; if(d<10*Math.PI/180) axis+=a;
  }
  return { area:all, share: all>0 ? axis/all : 0 };
}
/* Ширина перемычки в миллиметрах на заданной широте: двоичный поиск изолинии по долготе от оси
   меридиана. Считается по полю — то есть по тому же правилу, которым строится сетка. */
function ribWidthAt(p, v0){
  const s = ballSpec(p);
  let lo = 0, hi = 0.5/s.cols;
  if (ballFieldAt(s, lo, v0) < 0) return null;
  for(let k=0;k<80;k++){ const m=(lo+hi)/2; if (ballFieldAt(s, m, v0) >= 0) lo = m; else hi = m; }
  return 2*2*Math.PI*s.R*Math.sin(s.aTop + (s.aBot - s.aTop)*v0)*lo;
}
function minFaceArea(t){
  let mn = 1e9;
  for(const T of t){
    const u=[T[1][0]-T[0][0],T[1][1]-T[0][1],T[1][2]-T[0][2]], v=[T[2][0]-T[0][0],T[2][1]-T[0][1],T[2][2]-T[0][2]];
    mn = Math.min(mn, 0.5*Math.hypot(u[1]*v[2]-u[2]*v[1], u[2]*v[0]-u[0]*v[2], u[0]*v[1]-u[1]*v[0]));
  }
  return mn;
}

console.log('=== герметичность по всему диапазону ===');
for(const pat of ['grid','brick','spiral','diamond'])
  for(const ov of [{}, {lnRib:0.8}, {lnRib:10}, {lnRows:1}, {lnCols:3}]){
    const t=base(Object.assign({lnPattern:pat}, ov)), mc=manifoldCheck(t,4);
    chk('узор '+pat+' '+JSON.stringify(ov)+' watertight (+vol)', mc.watertight&&vol(t)>0,
        {open:mc.openEdges, bad:mc.badEdges});
  }
for(const ov of [{lnD:30},{lnD:250},{lnT:0.8},{lnT:6},{lnTopD:2},{lnBottomD:2},{lnTopD:240,lnBottomD:240},
                 {lnCols:48},{lnRows:24},{lnTwist:-360,lnPattern:'spiral'},{lnTwist:0,lnPattern:'spiral'},
                 {lnD:30,lnT:6},{lnCols:48,lnRows:24,lnPattern:'diamond'}]){
  const t=base(ov), mc=manifoldCheck(t,4);
  chk('крайний случай '+JSON.stringify(ov)+' watertight', mc.watertight&&vol(t)>0, {open:mc.openEdges,bad:mc.badEdges});
}

console.log('=== ступенек нет: граница идёт по изолинии, а не по линиям сетки ===');
{
  /* У сетки и кладки перемычки — это меридианы и параллели, то есть сами линии сетки: их доля «по осям»
     законно близка к единице, и требовать от них другого было бы требовать кривизны на ровном месте.
     У спирали и ромба граница идёт наискось; целыми ячейками её не выложить, и до перехода на поле она
     была лесенкой — 100 % по осям. Ловится это именно так: числом, а не взглядом на картинку. */
  const g = wallAxisShare(base({lnPattern:'grid'})), b = wallAxisShare(base({lnPattern:'brick'}));
  const sp = wallAxisShare(base({lnPattern:'spiral'})), dm = wallAxisShare(base({lnPattern:'diamond'}));
  chk('у сетки перемычки и есть линии сетки', g.share > 0.85, +g.share.toFixed(3));
  chk('у кладки тоже', b.share > 0.85, +b.share.toFixed(3));
  chk('у спирали граница НЕ по осям', sp.share < 0.6, +sp.share.toFixed(3));
  chk('у ромба тем более', dm.share < 0.4, +dm.share.toFixed(3));
  /* И цена лесенки, которую видно в площади: наискось идущая граница длиннее в √2 раз, если её
     выкладывать ступеньками. У ромба до починки было 9461 мм² стенок, сейчас около 5200. */
  chk('у ромба стенок не как у лесенки', dm.area < 7000, +dm.area.toFixed(0));
  chk('и это заметно больше, чем у сетки — ромб гуще', dm.area > g.area, {dm:+dm.area.toFixed(0), g:+g.area.toFixed(0)});
  // Мелкая сетка не должна менять ответ: граница берётся из поля, а не из ячеек.
  for(const pat of ['spiral','diamond']){
    const a = wallAxisShare(base({lnPattern:pat, lnD:90})), c = wallAxisShare(base({lnPattern:pat, lnD:180}));
    chk(pat+': доля «по осям» не растёт при другой частоте сетки', Math.abs(a.share - c.share) < 0.25,
        {small:+a.share.toFixed(3), big:+c.share.toFixed(3)});
  }
}

console.log('=== строитель отдаёт чистую сетку САМ, без починки ===');
{
  /* Меряется СЫРОЙ выход `buildLanternBall`, а не то, что приезжает через `buildTrisForShape`. Разница
     существенная: на общем пути стоит `snapWeldTris`, и он сваривает почти совпавшие вершины — сетка
     оказывается герметичной, даже если строитель наплодил треугольников шириной в микрон. Замерено:
     без ограничения врезки сырой выход давал 9 негерметичных конфигураций из 76 и грань площадью
     3.3e-11 мм², а после сварки всё выглядело безупречно.

     Полагаться на чужую починку здесь нельзя: `manifoldCheck` округляет до 1e-4, запись 3MF — до 1e-3,
     и «микронный» треугольник у каждого схлопывается по-своему. Строитель обязан быть чистым сам. */
  for(const pat of ['grid','brick','spiral','diamond'])
    for(const ov of [{}, {lnRib:0.8}, {lnCols:48}, {lnRows:24}, {lnTwist:75,lnCols:7,lnRows:5}]){
      base(Object.assign({lnPattern:pat}, ov));
      const raw = buildLanternBall(paramState.box), mc = manifoldCheck(raw, 4);
      chk('сырой выход герметичен: '+pat+' '+JSON.stringify(ov), mc.watertight,
          {open:mc.openEdges, bad:mc.badEdges});
      chk('и без граней нулевой площади: '+pat+' '+JSON.stringify(ov), minFaceArea(raw) > 1e-9,
          minFaceArea(raw).toExponential(2));
    }
  // И ребро не короче того, что переживёт округление записи 3MF (три знака).
  base({lnPattern:'diamond', lnRows:24});
  const raw = buildLanternBall(paramState.box);
  let mnE = 1e9;
  for(const T of raw) for(let k=0;k<3;k++){ const a2=T[k], b2=T[(k+1)%3];
    mnE = Math.min(mnE, Math.hypot(a2[0]-b2[0], a2[1]-b2[1], a2[2]-b2[2])); }
  chk('самое короткое ребро переживает округление 3MF', mnE > 2e-4, mnE.toExponential(3));
}

console.log('=== перемычка ровно заказанная у ВСЕХ узоров ===');
{
  /* Главная проверка на весь узор, и она независима от того, как поле записано: от точки на ОСЕВОЙ
     линии перемычки берётся МИНИМУМ расстояния до изолинии по всем направлениям. Это и есть поперечная
     полуширина, и она обязана равняться half.

     Минимум по направлениям, а не спуск по градиенту, — потому что на самом гребне градиент вырождается
     (центральная разность там сокращается), а на перекрестье двух семей спуск уводит вдоль «коридора» и
     даёт метры вместо миллиметров. Замерено на первой версии проверки: у спирали выходило от 0.99 до
     8.90 при заказанной единице, и все крайние значения приходились на перекрестья.

     Мерить «вдоль параллели» нельзя: у спирали линии винтовые, параллель им не перпендикулярна, и такая
     мерка завышает ширину в 1/cos наклона. Ошибку нашли именно так — до починки поле переставало быть
     расстоянием, модуль его градиента доходил до 1.79 вместо единицы. */
  function halfWidth(sp, u0, v0, cap){
    const S2 = sp.R*(sp.aBot - sp.aTop);
    let best = cap;
    for(let d=0; d<24; d++){
      const th = 2*Math.PI*d/24, cs = Math.cos(th), sn = Math.sin(th);
      let lo = 0, hi = 0;
      for(let k=1; k<=Math.round(cap/0.02); k++){
        const r = k*0.02; if (r >= best) { hi = 0; break; }
        const rho = sp.R*Math.sin(sp.aTop + (sp.aBot - sp.aTop)*v0);
        const u = u0 + r*cs/(2*Math.PI*rho), v = v0 + r*sn/S2;
        if (v <= 0.005 || v >= 0.995) { hi = 0; break; }
        if (ballFieldAt(sp, u, v) < 0){ lo = r - 0.02; hi = r; break; }
      }
      if (!hi) continue;
      for(let k=0;k<40;k++){                                    // уточняем двоичным поиском
        const m = (lo+hi)/2;
        const rho = sp.R*Math.sin(sp.aTop + (sp.aBot - sp.aTop)*v0);
        const u = u0 + m*cs/(2*Math.PI*rho), v = v0 + m*sn/S2;
        if (ballFieldAt(sp, u, v) >= 0) lo = m; else hi = m;
      }
      if (hi < best) best = hi;
    }
    return best;
  }
  function centrePoints(sp, want){
    /* На каждой выбранной широте берём долготу, где поле максимально: это точка на осевой линии. Искать
       «g равно half» перебором бесполезно — осевая линия кривая, и сетка перебора на неё почти никогда
       не попадает: первая версия проверки нашла ноль точек из сорока. */
    const out = [];
    for(let b2=0; b2<want; b2++){
      const v = 0.18 + 0.64*(b2 + 0.5)/want;
      let bu = 0, bg = -1e9;
      for(let a2=0; a2<3000; a2++){ const u = a2/3000, g = ballFieldAt(sp, u, v);
        if (g > bg){ bg = g; bu = u; } }
      if (bg > 0) out.push([bu, v]);
    }
    return out;
  }
  for(const pat of ['grid','brick','spiral','diamond'])
    for(const rib of [1, 2, 4]){
      const sp = ballSpec(par({lnPattern:pat, lnRib:rib}));
      const pts = centrePoints(sp, 16);
      const ws = pts.map(q => halfWidth(sp, q[0], q[1], rib*2)).filter(x => x < rib*2 - 1e-9);
      /* НА ПЕРЕКРЕСТЬЕ материал законно толще: у креста из двух полос шириной d ближайшая граница от
         центра лежит по диагонали, на d/√2·… — для d = 4 это 2.83 вместо 2. Поэтому проверяется не
         «везде ровно half», а два утверждения: у'же заказанного НИГДЕ, и там, где перемычка одиночная,
         ровно заказанное. Первая версия требовала равенства всюду и падала именно на перекрестьях. */
      /* Допуск растёт с шириной перемычки, и это не поблажка. Расстояние до КРИВОЙ линии уровня
         считается через модуль градиента — первым порядком; остаток тем заметнее, чем шире перемычка
         относительно радиуса кривизны. Замерено: у ромба и спирали при перемычке 4 мм на шаре Ø90
         недобор 1.7 % (1.966 вместо 2.000), при 1 и 2 мм — меньше сотой доли. */
      const tol = Math.max(0.03, rib*0.02);
      const thin = ws.filter(w => w < rib/2 - tol).length;
      const mn = Math.min.apply(null, ws.concat([99]));
      chk(pat+', заказано '+rib+' мм: у'+'же нигде, а на одиночной — ровно',
          ws.length >= 8 && thin === 0 && Math.abs(mn - rib/2) < tol,
          {n:ws.length, thin, min:+mn.toFixed(3),
           max:+Math.max.apply(null, ws.concat([0])).toFixed(3), want:rib/2});
    }
  // И отдельно: у спирали ширина не зависит от закрутки — иначе мерка идёт вдоль параллели.
  {
    const w = tw => {
      const sp = ballSpec(par({lnPattern:'spiral', lnRib:2, lnTwist:tw}));
      const ws = centrePoints(sp, 10).map(q => halfWidth(sp, q[0], q[1], 4)).filter(x => x < 4 - 1e-9);
      return Math.min.apply(null, ws);
    };
    const w0 = w(0), w180 = w(180), w360 = w(360);
    chk('спираль: закрутка не раздувает перемычку',
        Math.abs(w0-1) < 0.05 && Math.abs(w180-1) < 0.05 && Math.abs(w360-1) < 0.05,
        {tw0:+w0.toFixed(3), tw180:+w180.toFixed(3), tw360:+w360.toFixed(3)});
  }
}

console.log('=== поясок у кромки шириной в перемычку, а не в половину ===');
{
  /* У кромок отверстий поле держит СПЛОШНОЙ поясок шириной `rib`. Без него пояс широты на v = 0 всё
     равно даст материал, но вдвое у'же — половину ширины перемычки, — и кромка выйдет хлипкой. */
  for(const rib of [2, 4]){
    const sp = ballSpec(par({lnRib:rib})), S2 = sp.R*(sp.aBot - sp.aTop);
    const u0 = 0.5/sp.cols;                                          // ровно между меридианами
    let lo = 0, hi = 0.5;
    for(let k=0;k<80;k++){ const m=(lo+hi)/2; if (ballFieldAt(sp, u0, m) >= 0) lo = m; else hi = m; }
    chk('нижний поясок = '+rib+' мм', Math.abs(lo*S2 - rib) < 0.02, +(lo*S2).toFixed(4));
  }
}

console.log('=== кромки отверстий сплошные по всему кругу ===');
{
  /* Кромка обязана быть ЦЕЛЫМ кольцом: иначе первый слой ложится обрывками, а отверстие выходит
     зубчатым. Меряется по сетке — угловые промежутки между вершинами на самой нижней высоте. */
  for(const pat of ['grid','brick','spiral','diamond']){
    const t=base({lnPattern:pat}), B=computeBBox(t), s=ballSpec(par({lnPattern:pat}));
    const angs=[];
    for(const T of t) for(const v of T) if(Math.abs(v[1]-B.minY)<1e-6) angs.push(Math.atan2(v[2],v[0]));
    angs.sort((a,b)=>a-b);
    let gap=0;
    for(let i=0;i<angs.length;i++){ const d=(i+1<angs.length? angs[i+1]:angs[0]+2*Math.PI)-angs[i];
      gap=Math.max(gap,d); }
    chk(pat+': нижняя кромка — целое кольцо', gap < 4*Math.PI/s.N, {gapDeg:+(gap*180/Math.PI).toFixed(2),
        cellDeg:+(360/s.N).toFixed(2)});
    const angsT=[];
    for(const T of t) for(const v of T) if(Math.abs(v[1]-B.maxY)<1e-6) angsT.push(Math.atan2(v[2],v[0]));
    angsT.sort((a,b)=>a-b);
    let gapT=0;
    for(let i=0;i<angsT.length;i++){ const d=(i+1<angsT.length? angsT[i+1]:angsT[0]+2*Math.PI)-angsT[i];
      gapT=Math.max(gapT,d); }
    chk(pat+': верхняя кромка — целое кольцо', gapT < 4*Math.PI/s.N, {gapDeg:+(gapT*180/Math.PI).toFixed(2)});
  }
}

console.log('=== кромки отверстий горизонтальные ===');
{
  const t=base({}), B=computeBBox(t), s=ballSpec(par({}));
  const atY=(y)=>{ const r=[]; for(const T of t) for(const v of T) if(Math.abs(v[1]-y)<1e-6) r.push(Math.hypot(v[0],v[2])); return r; };
  const bot=atY(B.minY), top=atY(B.maxY);
  chk('на самой нижней высоте есть материал', bot.length>0, bot.length);
  chk('и на самой верхней', top.length>0, top.length);
  /* На горизонтальной кромке живут ДВА радиуса — наружный и внутренний, и их разность это не толщина
     стенки по нормали, а её горизонтальная проекция: ρ_o = √(R²−y²), ρ_i = √((R−t)²−y²). Проверяется
     именно эта пара, а не «толщина 1.6». */
  const y0=B.minY - (-(s.R*Math.cos(s.aTop) + s.R*Math.cos(s.aBot))/2);
  const roB=Math.sqrt(s.R*s.R - y0*y0), riB=Math.sqrt((s.R-s.t)*(s.R-s.t) - y0*y0);
  chk('нижняя кромка: наружный радиус на месте', Math.abs(Math.max(...bot)-roB)<0.05, {got:Math.max(...bot), want:roB});
  chk('нижняя кромка: внутренний радиус на месте', Math.abs(Math.min(...bot)-riB)<0.05, {got:Math.min(...bot), want:riB});
  chk('нижнее отверстие = заданное', Math.abs(2*roB-60)<0.05, 2*roB);
  // Косая кромка дала бы на нижней высоте ОДИН радиус (нижнюю точку наружной сферы), а не пару.
  chk('кромка не выродилась в линию', Math.max(...bot)-Math.min(...bot) > 0.2,
      {span:Math.max(...bot)-Math.min(...bot)});
}
{
  const B=computeBBox(base({lnBottomD:2}));
  const s=ballSpec(par({lnBottomD:2}));
  chk('крошечное отверстие ужато до выведенного минимума', Math.abs(s.botD-s.capMin)<1e-9, {botD:s.botD, cap:s.capMin});
  chk('и минимум равен 2·√(t(2R−t))', Math.abs(s.capMin - (2*Math.sqrt(s.t*(2*s.R-s.t))+0.4))<1e-9, s.capMin);
  chk('о срезке сказано', collectPrintWarnings(par({lnBottomD:2})).some(w=>/отверстие ужато/.test(w)),
      collectPrintWarnings(par({lnBottomD:2})));
  /* Значение по умолчанию обязано БЫТЬ в пределах: приложение, которое из коробки показывает
     предупреждение, приучает его не читать. Верхнее отверстие 16 мм на шаре Ø90 со стенкой 1.6 ниже
     выведенного минимума 24.2 — поэтому умолчание 26. */
  chk('в пределах — молчит', !collectPrintWarnings(par({})).some(w=>/отверстие ужато/.test(w)),
      collectPrintWarnings(par({})));
  {
    const D = {}; for(const r of SHAPE_PARAMS.box) if(r.group === 'Ажурный шар') D[r.key] = r.default;
    D.lnMode = 'ball';
    const sd = ballSpec(D);
    chk('умолчания панели не упираются в предел', sd.topD === sd.topWant && sd.botD === sd.botWant,
        {topWant:sd.topWant, topD:sd.topD, cap:sd.capMin});
  }
}

console.log('=== габарит и объём ===');
{
  const B=computeBBox(base({}));
  chk('ширина = диаметр', Math.abs((B.maxX-B.minX)-90)<0.05, B.maxX-B.minX);
  chk('и глубина тоже', Math.abs((B.maxZ-B.minZ)-90)<0.05, B.maxZ-B.minZ);
  chk('высота — между плоскостями реза', (B.maxY-B.minY) < 90 && (B.maxY-B.minY) > 60, B.maxY-B.minY);
  chk('шар отцентрован по высоте', Math.abs(B.maxY+B.minY)<1e-6, {lo:B.minY, hi:B.maxY});
  chk('перфорация УБАВЛЯЕТ материал', vol(base({lnRib:0.8})) < vol(base({lnRib:10}))*0.5,
      {thin:vol(base({lnRib:0.8})), thick:vol(base({lnRib:10}))});
  chk('и объём далёк от сплошной оболочки',
      vol(base({})) < 4*Math.PI*45*45*1.6*0.85, vol(base({})));
}

console.log('=== перемычка ровно заказанная, без квантования ===');
{
  /* Раньше перемычка выкладывалась целым числом ячеек, и её ширина квантовалась — панель об этом честно
     предупреждала. Поле сняло квантование целиком: изолиния стоит ровно на половине ширины от осевой
     линии, и предупреждать больше не о чем. Проверяется и то, и другое: ширина сходится с заказанной, и
     она ОДИНАКОВА на разных широтах — доля долготы у полюса волосок, окружность там втрое меньше
     экваторной, и держаться в миллиметрах можно только считая расстояние по поверхности. */
  for(const rib of [0.8, 2, 5]){
    const w = ribWidthAt(par({lnRib:rib}), 2.5/6);
    chk('заказано '+rib+' мм — вышло столько же', Math.abs(w - rib) < 0.002, +w.toFixed(4));
  }
  const ws = [1.5/6, 2.5/6, 3.5/6, 4.5/6].map(v => ribWidthAt(par({lnRib:2}), v));
  chk('и ширина одинакова на всех широтах', Math.max.apply(null,ws) - Math.min.apply(null,ws) < 0.002,
      ws.map(x => +x.toFixed(4)));
  const s0 = ballSpec(par({lnRib:2}));
  const rTop = s0.R*Math.sin(s0.aTop + (s0.aBot-s0.aTop)*(1.5/6));
  const rEq  = s0.R*Math.sin(s0.aTop + (s0.aBot-s0.aTop)*0.5);
  chk('а радиусы этих широт правда разные', rTop < rEq*0.85, {rim:+rTop.toFixed(1), eq:+rEq.toFixed(1)});
  chk('о квантовании панель больше не предупреждает',
      !collectPrintWarnings(par({lnCols:48, lnRib:9})).some(w2 => /перемычка/.test(w2)),
      collectPrintWarnings(par({lnCols:48, lnRib:9})));
}

console.log('=== узоры отличаются друг от друга ===');
{
  const v = {};
  for(const pat of ['grid','brick','spiral','diamond']) v[pat] = vol(base({lnPattern:pat}));
  /* «Кладка» — это та же сетка со сдвигом через ряд: сплошных ячеек столько же, поэтому и объём тот же.
     Отличать их по объёму бессмысленно; отличаются они РАСПОЛОЖЕНИЕМ, и проверяется оно по карте ячеек. */
  chk('ромб и спираль отличаются от сетки объёмом',
      Math.abs(v.diamond-v.grid) > 1 && Math.abs(v.spiral-v.grid) > 1, v);
  /* У кладки те же перемычки, только через ряд сдвинутые, поэтому объём тот же — но уже НЕ бит в бит:
     на стыках поясов фаза меридианов скачком меняется, и изолиния около стыка ложится чуть иначе.
     Расхождение 0.1 мм³ на 7848 — это одна стотысячная, то есть именно «тот же объём». */
  chk('кладка даёт тот же объём — это тот же узор со сдвигом',
      Math.abs(v.brick-v.grid) < v.grid*1e-4, {brick:+v.brick.toFixed(3), grid:+v.grid.toFixed(3)});
  {
    // Отличаются они РАСПОЛОЖЕНИЕМ: у кладки меридианы через ряд сдвинуты на полшага, и поле это видит.
    const sg = ballSpec(par({lnPattern:'grid'})), sb = ballSpec(par({lnPattern:'brick'}));
    let diff = 0, all = 0;
    for(let i=0;i<200;i++) for(let j=0;j<80;j++){
      const u = i/200, v = j/80; all++;
      if ((ballFieldAt(sg,u,v) >= 0) !== (ballFieldAt(sb,u,v) >= 0)) diff++;
    }
    chk('но узор у них стоит по-разному', diff > all*0.05, {diff, all});
  }
  chk('«спираль» с нулевой закруткой — это сетка',
      Math.abs(vol(base({lnPattern:'spiral',lnTwist:0})) - v.grid) < 1e-6,
      {spiral0:vol(base({lnPattern:'spiral',lnTwist:0})), grid:v.grid});
  chk('и закрутка меняет её', Math.abs(vol(base({lnPattern:'spiral',lnTwist:180})) - v.grid) > 1);
  chk('окон больше — материала больше', vol(base({lnCols:24})) > vol(base({lnCols:6})));
  chk('поясов больше — материала больше', vol(base({lnRows:12})) > vol(base({lnRows:3})));
}

console.log('=== нависание у верхней кромки названо ===');
{
  const f=ballFacts(par({lnTopD:16}));
  chk('нависание считается от полярного угла кромки',
      Math.abs(f.overhang - (90 - Math.asin(f.spec.topD/f.spec.D)*180/Math.PI)) < 1e-9, f.overhang);
  chk('узкая горловина — крутое нависание', ballFacts(par({lnTopD:16})).overhang > 60);
  chk('широкая — пологое', ballFacts(par({lnTopD:70})).overhang < 60, ballFacts(par({lnTopD:70})).overhang);
  chk('и о крутом сказано', collectPrintWarnings(par({lnTopD:16})).some(w=>/нависание/.test(w)));
  chk('о пологом — нет', !collectPrintWarnings(par({lnTopD:70})).some(w=>/нависание/.test(w)));
}

console.log('=== шар не задевает остальное приложение ===');
{
  const a=vol(base({divX:3, divZ:3, stackFeet:true, labelTab:'front', gripWall:'all'}));
  const b=vol(base({}));
  chk('надстройки органайзера на шар не лезут', Math.abs(a-b)<1e-9, {a,b});
  const t=base({lnMode:'none'}), B=computeBBox(t);
  chk('«нет» — это обычная коробка', Math.abs((B.maxX-B.minX)-paramState.box.width)<0.6, {w:B.maxX-B.minX});
}

console.log('\n'+(fail?'FAILED':'ALL PASSED')+': '+pass+' passed, '+fail+' failed');
if(fail) process.exitCode=1;
