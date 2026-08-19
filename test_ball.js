// Ажурный шар / фонарь: сферическая оболочка с прорезанными окнами.
//
// Перфорация строится ячейками, и ломается она тихо ровно одним способом: две сплошные ячейки касаются
// ТОЛЬКО УГЛОМ. Тогда в радиальном ребре этого угла сходятся четыре стенки вместо двух — поверхность
// защемлена в точку, но не разорвана: открытых рёбер ноль, деталь на вид правильная. Замерено на
// «спирали» до починки: 0 открытых рёбер, 276 битых. Поэтому здесь проверяются не только герметичность,
// но и ОТСУТСТВИЕ диагональных касаний в самой карте ячеек.
//
// Второе, что меряется, — кромки отверстий. Оболочку режут ПЛОСКОСТИ, а не широты: по широте наружная и
// внутренняя точки одной широты стоят на разной высоте, кромка выходит косой, и деталь садится на стол
// линией вместо кольца. Проверяется тем, что у самой нижней и самой верхней точки меша ровно две
// высоты — по одной на кромку, — и что на каждой кромке есть и наружный, и внутренний радиус.
// Запускать через ./run-all.sh (extraction test).

let pass=0, fail=0;
function chk(n,c,e){ if(c){pass++;console.log('  OK  ',n);} else {fail++;console.log('  FAIL',n,e!==undefined?JSON.stringify(e):'');} }
function vol(t){let v=0;for(const T of t){const a=T[0],b=T[1],c=T[2];v+=(a[0]*(b[1]*c[2]-b[2]*c[1])-a[1]*(b[0]*c[2]-b[2]*c[0])+a[2]*(b[0]*c[1]-b[1]*c[0]))/6;}return v;}
function base(ov){ logos.length=0; boxHoles.length=0; dieFaces.length=0;
  Object.assign(paramState.box, defaultBoxParams(), {lnMode:'ball', lnD:90, lnT:1.6, lnTopD:26,
    lnBottomD:60, lnPattern:'grid', lnCols:12, lnRows:6, lnRib:2, lnTwist:180}, ov||{});
  return buildTrisForShape('box', paramState.box); }
function par(ov){ base(ov); return Object.assign({}, paramState.box); }

/* Карта ячеек — та же, что у строителя, включая заливку диагоналей. Пересчитывается здесь, а не берётся
   из него, потому что проверяется как раз ЕЁ свойство; читать ответ у проверяемого было бы бессмысленно.
   Совпадение с построенной сеткой проверяется отдельно — по числу треугольников. */
function cellMap(p){
  const s = ballSpec(p), N = s.N, M = s.M, R = s.R;
  const alp = j => s.aTop + (s.aBot - s.aTop)*j/M, roAt = j => R*Math.sin(alp(j));
  const aWid = new Array(M);
  for(let j=0;j<M;j++){ const rM=(roAt(j)+roAt(j+1))/2, c=2*Math.PI*Math.max(0.5,rM)/N;
    aWid[j]=Math.max(1,Math.min(s.K-1,Math.round(s.rib/c))); }
  const bWid=Math.max(1,Math.min(s.L-1,Math.round(s.rib/s.cellV)));
  const rim=Math.max(1,Math.round(s.rib/s.cellV));
  const map=new Uint8Array(N*M);
  for(let j=0;j<M;j++) for(let i=0;i<N;i++) map[j*N+i]=ballSolidAt(s,i,j,aWid,bWid,rim)?1:0;
  return { s, N, M, raw:map, aWid, bWid, rim };
}
function diagTouches(N, M, at){
  let n=0;
  for(let j=0;j+1<M;j++) for(let i=0;i<N;i++){
    const a=at(i,j), b=at(i+1,j), c=at(i,j+1), d=at(i+1,j+1);
    if((a&&d&&!b&&!c) || (b&&c&&!a&&!d)) n++;
  }
  return n;
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

console.log('=== диагональных касаний не остаётся ===');
{
  /* Заливка добавляет материал и повторяется до неподвижности. Проверяется и то, что она СРАБАТЫВАЕТ
     (в исходной карте «спирали» касания есть), и то, что после неё их НЕТ — иначе проверка не отличала
     бы починенный код от такого, где чинить было нечего. */
  const c = cellMap(par({lnPattern:'spiral'}));
  const rawAt = (i,j) => (j<0||j>=c.M) ? 0 : c.raw[j*c.N + (((i%c.N)+c.N)%c.N)];
  chk('в сыром узоре «спираль» диагональные касания ЕСТЬ', diagTouches(c.N, c.M, rawAt) > 0,
      diagTouches(c.N, c.M, rawAt));
  for(const pat of ['grid','brick','spiral','diamond']){
    const t = base({lnPattern:pat});
    // Проверяем по САМОЙ СЕТКЕ: битых рёбер быть не должно ни на одном узоре.
    const mc = manifoldCheck(t,4);
    chk(pat+': битых рёбер ноль', mc.badEdges === 0, mc.badEdges);
  }
  // И на неудобных числах, где касания вероятнее всего.
  for(const ov of [{lnPattern:'spiral',lnTwist:75,lnCols:7,lnRows:5},
                   {lnPattern:'spiral',lnTwist:345,lnCols:11,lnRows:9},
                   {lnPattern:'diamond',lnCols:7,lnRows:5,lnRib:1.0},
                   {lnPattern:'brick',lnCols:5,lnRows:3,lnRib:0.8}]){
    const mc=manifoldCheck(base(ov),4);
    chk('без битых рёбер '+JSON.stringify(ov), mc.badEdges===0 && mc.openEdges===0, mc);
  }
}

console.log('=== постусловие карты ячеек ===');
{
  /* Проверяется ПОСТУСЛОВИЕ, а не число проходов заливки: касаний по диагонали не осталось. На всех
     четырёх узорах одного прохода хватает (перебор 784 сочетаний не нашёл исключений), поэтому мутация
     «делать один проход» эту батарею пройдёт — и это записано здесь честно, а не спрятано. Держит
     правильность именно постусловие. */
  let checked = 0;
  for(const pat of ['grid','brick','spiral','diamond'])
    for(const tw of [45,120,180,345])
      for(const cols of [5,7,12,23])
        for(const rows of [3,6,9]){
          const c = ballCellMap(ballSpec(par({lnPattern:pat, lnTwist:tw, lnCols:cols, lnRows:rows})));
          if (diagTouches(c.N, c.M, c.at) !== 0){
            chk('касаний нет: '+pat+' tw'+tw+' c'+cols+' r'+rows, false, diagTouches(c.N,c.M,c.at));
            checked = -1e9;
          }
          checked++;
        }
  chk('после заливки диагональных касаний не осталось ни в одной из 192 конфигураций', checked === 192, checked);
  // И заливка действительно что-то делает — иначе проверка выше ничего не значит.
  const c2 = ballCellMap(ballSpec(par({lnPattern:'spiral'})));
  let added = 0; for(let k=0;k<c2.map.length;k++) if(c2.map[k] !== c2.raw[k]) added++;
  chk('на «спирали» заливка добавила ячейки', added > 0, added);
  chk('и добавила немного — это заплатка, а не заливка всего', added < c2.map.length*0.05,
      {added, total:c2.map.length});
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

console.log('=== перемычка держится в миллиметрах ===');
{
  /* Доля долготы у полюса — волосок: окружность там втрое меньше экваторной. Проверяется, что число
     ячеек под перемычку РАЗНОЕ на разных широтах и что произведение «ячеек × ширина ячейки» держится
     около заказанного. */
  const c = cellMap(par({lnRib:2}));
  const s = c.s, R = s.R, N = s.N, M = s.M;
  const alp = j => s.aTop + (s.aBot - s.aTop)*j/M, roAt = j => R*Math.sin(alp(j));
  const widths = [];
  for(const j of [1, Math.floor(M*0.25), Math.floor(M*0.5), M-2]){
    const rM=(roAt(j)+roAt(j+1))/2, cell=2*Math.PI*rM/N;
    widths.push({j, cells:c.aWid[j], mm:c.aWid[j]*cell, r:rM});
  }
  chk('у кромки ячеек под перемычку больше, чем на экваторе',
      widths[0].cells > widths[2].cells, widths.map(w=>w.cells));
  chk('а фактическая ширина везде около двух миллиметров',
      widths.every(w => Math.abs(w.mm - 2) < 0.9), widths.map(w=>+w.mm.toFixed(2)));
  chk('радиус у кромки правда меньше экваторного', widths[0].r < widths[2].r*0.7,
      {rim:+widths[0].r.toFixed(1), eq:+widths[2].r.toFixed(1)});
  // И панель называет фактическую ширину, если она разошлась с заказом.
  const f=ballFacts(par({lnRib:2}));
  chk('ballFacts отдаёт фактическую перемычку', f.ribGot > 0 && isFinite(f.ribGot), f.ribGot);
  chk('о грубом расхождении сказано',
      collectPrintWarnings(par({lnCols:48, lnRib:9})).some(w=>/перемычка вышла/.test(w)),
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
  chk('кладка даёт тот же объём — это тот же узор со сдвигом', Math.abs(v.brick-v.grid) < 1e-6, v);
  {
    const g = cellMap(par({lnPattern:'grid'})), b2 = cellMap(par({lnPattern:'brick'}));
    let diff = 0;
    for(let k=0;k<g.raw.length;k++) if(g.raw[k] !== b2.raw[k]) diff++;
    chk('но ячейки у них стоят по-разному', diff > g.raw.length*0.02, {diff, total:g.raw.length});
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
