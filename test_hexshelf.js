// Сота-полка: глубокий шестигранный стакан на стену.
//
// Соты в приложении уже были, но плоские — панель-решётка и держатели в её ячейках. Полка другая, и
// проверять в ней надо то, что решает, вещь это или картинка:
//
//   1. ПЛОСКАЯ ГРАНЬ ВНИЗ, А НЕ ВЕРШИНА. Вершиной вниз шестигранник красивее ровно до того момента, как
//      на него что-нибудь ставят: дно тогда — линия. Меряется по сетке: самый низкий уровень обязан быть
//      ОТРЕЗКОМ по ширине, а не точкой.
//
//   2. ЗАДНИК ПЕРЕСЕКАЕТ СТЕНКУ ПОПЕРЁК, А НЕ ЛОЖИТСЯ НА НЕЁ ГРАНЬЮ. Задник шире внутреннего
//      шестигранника и утоплен от торца трубы — обе оболочки закрыты и в обоих случаях, но встык это
//      совпадающие грани нулевой толщины. Видно только по СЫРЫМ пересечениям луча.
//
//   3. НИ ОДНОЙ НАКЛОННОЙ ГРАНИ. Полка печатается задником на стол, и если каждая грань либо
//      горизонтальна, либо вертикальна, поддержки не нужны ни при какой глубине — это не мнение, а
//      измеримое свойство сетки.
//
// Запускать через ./run-all.sh (extraction test).

let pass=0, fail=0;
function chk(n,c,e){ if(c){pass++;console.log('  OK  ',n);} else {fail++;console.log('  FAIL',n,e!==undefined?JSON.stringify(e):'');} }
function vol(t){let v=0;for(const T of t){const a=T[0],b=T[1],c=T[2];v+=(a[0]*(b[1]*c[2]-b[2]*c[1])-a[1]*(b[0]*c[2]-b[2]*c[0])+a[2]*(b[0]*c[1]-b[1]*c[0]))/6;}return v;}
const P = ov => Object.assign({}, defaultBoxParams(), {woBack:'hexshelf'}, ov||{});
const raw = ov => buildHexShelf(P(ov));
const W   = ov => collectPrintWarnings(P(ov));
function ship(ov){ logos.length=0; boxHoles.length=0; dieFaces.length=0;
  Object.assign(paramState.box, defaultBoxParams(), {woBack:'hexshelf'}, ov||{});
  return buildTrisForShape('box', paramState.box); }
const bbox = t => { const lo=[1e9,1e9,1e9], hi=[-1e9,-1e9,-1e9];
  for(const T of t) for(const v of T) for(let i=0;i<3;i++){ if(v[i]<lo[i])lo[i]=v[i]; if(v[i]>hi[i])hi[i]=v[i]; }
  return {lo,hi}; };
// Сырые пересечения вертикального (по Y) луча — до слияния в отрезки материала.
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
    const ny=e1[2]*e2[0]-e1[0]*e2[2]; if(Math.abs(ny)<1e-12) continue;
    hits.push(w1*a[1]+w2*b[1]+(1-w1-w2)*c[1]);
  }
  return hits.sort((p,q)=>p-q);
}
// Отрезки материала вдоль Z на высоте y и абсциссе x.
function runsZ(tris, x, y){
  const hits=[];
  for(const T of tris){ const [a,b,c]=T;
    const d1=(b[0]-a[0])*(y-a[1])-(b[1]-a[1])*(x-a[0]);
    const d2=(c[0]-b[0])*(y-b[1])-(c[1]-b[1])*(x-b[0]);
    const d3=(a[0]-c[0])*(y-c[1])-(a[1]-c[1])*(x-c[0]);
    if(!((d1>=0&&d2>=0&&d3>=0)||(d1<=0&&d2<=0&&d3<=0))) continue;
    const A=(b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0]); if(Math.abs(A)<1e-12) continue;
    const w1=((b[0]-x)*(c[1]-y)-(b[1]-y)*(c[0]-x))/A, w2=((c[0]-x)*(a[1]-y)-(c[1]-y)*(a[0]-x))/A;
    const e1=[b[0]-a[0],b[1]-a[1],b[2]-a[2]], e2=[c[0]-a[0],c[1]-a[1],c[2]-a[2]];
    const nz=e1[0]*e2[1]-e1[1]*e2[0]; if(Math.abs(nz)<1e-12) continue;
    hits.push([w1*a[2]+w2*b[2]+(1-w1-w2)*c[2], nz<0?1:-1]);
  }
  hits.sort((p,q)=>p[0]-q[0]);
  const runs=[]; let d=0, st=null;
  for(const [t0,dd] of hits){ const pr=d; d+=dd;
    if(pr<=0&&d>0) st=t0; else if(pr>0&&d<=0){ if(st!==null&&t0-st>1e-6) runs.push([st,t0]); st=null; } }
  return runs;
}

console.log('=== герметичность и габарит ===');
{
  let bad = 0, worst = null, minVol = 1e18, n = 0;
  for(const AF of [60, 180, 400])
    for(const wall of [2, 4, 12])
      for(const D of [30, 90, 250])
        for(const bt of [0, 1, 3, 10])
          for(const sd of [0, 4.5, 12]){
            const ov = {hsAF:AF, hsWall:wall, hsDepth:D, hsBackT:bt, mntScrewD:sd};
            const t = raw(ov), m = manifoldCheck(t, 6); n++;
            if(!m.watertight){ bad++; if(!worst) worst = {ov, open:m.openEdges, bad:m.badEdges}; }
            minVol = Math.min(minVol, vol(t));
          }
  chk('324 сочетания герметичны', bad === 0 && n === 324, worst || n);
  chk('объём везде положителен (нормали наружу)', minVol > 0, minVol);
}
{
  const t = raw({hsAF:180, hsWall:4, hsDepth:90}), b = bbox(t);
  chk('глубина = заказанной', Math.abs((b.hi[1]-b.lo[1]) - 90) < 1e-9, b.hi[1]-b.lo[1]);
  chk('габарит по вертикали = шестигранник в свету + две стенки',
      Math.abs((b.hi[2]-b.lo[2]) - 188) < 1e-9, b.hi[2]-b.lo[2]);
  chk('по горизонтали шестигранник шире в 2/√3 раза (вершины по бокам)',
      Math.abs((b.hi[0]-b.lo[0]) - 188*2/Math.sqrt(3)) < 1e-9, b.hi[0]-b.lo[0]);
  chk('центрировано по глубине', Math.abs(b.hi[1]+b.lo[1]) < 1e-9, [b.lo[1], b.hi[1]]);
}

console.log('=== плоской гранью вниз, а не вершиной ===');
{
  const t = raw({hsAF:180, hsWall:4}), b = bbox(t);
  const bottom = [];
  for(const T of t) for(const v of T) if(Math.abs(v[2] - b.lo[2]) < 1e-9) bottom.push(v[0]);
  const span = Math.max.apply(null, bottom) - Math.min.apply(null, bottom);
  chk('самый низкий уровень — отрезок, а не точка', span > 50, span);
  /* Ширина нижней грани у правильного шестигранника — ровно сторона, то есть AF/√3. Считается
     независимо, от НАРУЖНОГО размера под ключ, и с той же точностью, с какой строится. */
  chk('и он ровно в сторону шестигранника (AF/√3)', Math.abs(span - 188/Math.sqrt(3)) < 1e-9,
      {span, want: 188/Math.sqrt(3)});
  const top = [];
  for(const T of t) for(const v of T) if(Math.abs(v[2] - b.hi[2]) < 1e-9) top.push(v[0]);
  chk('верх такой же плоский', Math.abs((Math.max.apply(null, top) - Math.min.apply(null, top)) - span) < 1e-9);
  // Вершины — по бокам: самая правая точка одна, а не отрезок.
  const right = [];
  for(const T of t) for(const v of T) if(Math.abs(v[0] - b.hi[0]) < 1e-9) right.push(v[2]);
  chk('а справа именно вершина: точка, а не грань',
      Math.max.apply(null, right) - Math.min.apply(null, right) < 1e-9);
}

console.log('=== размер в свету — заказанный ===');
{
  for(const [AF, wall] of [[180,4],[60,2],[400,12]]){
    const t = raw({hsAF:AF, hsWall:wall, hsDepth:90});
    // Луч поперёк, по вертикали через ось, на середине глубины: два куска стенки и просвет между ними.
    const rr = runsZ(t, 0, 0);
    chk('AF' + AF + '/стенка' + wall + ': поперёк — ровно две стенки', rr.length === 2, rr);
    if(rr.length === 2){
      chk('  просвет между ними = заказанному «под ключ»', Math.abs((rr[1][0] - rr[0][1]) - AF) < 1e-9,
          rr[1][0] - rr[0][1]);
      chk('  и каждая стенка — заказанной толщины',
          Math.abs((rr[0][1]-rr[0][0]) - wall) < 1e-9 && Math.abs((rr[1][1]-rr[1][0]) - wall) < 1e-9,
          [rr[0][1]-rr[0][0], rr[1][1]-rr[1][0]]);
    }
  }
}

console.log('=== задник пересекает стенку ПОПЕРЁК, а не встык ===');
{
  const ov = {hsAF:180, hsWall:4, hsDepth:90, hsBackT:3};
  const t = raw(ov), s = hexShelfSpec(P(ov)), b = bbox(t);
  const y0 = b.lo[1];   // торец трубы
  // В просвете полки: только задник, две грани.
  const inBore = pierceY(t, 0, 0);
  chk('в просвете луч встречает только задник', inBore.length === 2, inBore);
  chk('и задник утоплен от торца трубы, а не вровень с ним',
      Math.abs((inBore[0] - y0) - HEX_SHELF_SINK) < 1e-9, inBore[0] - y0);
  chk('толщина задника — заказанная', Math.abs((inBore[1] - inBore[0]) - 3) < 1e-9, inBore[1]-inBore[0]);
  /* В ЗОНЕ НАХЛЁСТА — четыре грани на разных высотах. Встык их было бы тоже четыре, но две совпали бы
     по высоте: труба кончается на y0, задник начинался бы там же. Разность высот и есть доказательство,
     что грани не совпадающие. */
  const zLap = 180/2 + HEX_SHELF_OVL/2;     // между внутренней гранью стенки и краем задника
  const lap = pierceY(t, 0, zLap);
  chk('в нахлёсте четыре пересечения', lap.length === 4, lap);
  if(lap.length === 4){
    const gaps = lap.slice(1).map((v,i) => v - lap[i]);
    chk('все четыре на разных высотах — совпадающих граней нет', Math.min.apply(null, gaps) > 0.3, gaps);
    chk('труба начинается ниже задника ровно на утопление',
        Math.abs(gaps[0] - HEX_SHELF_SINK) < 1e-9, gaps[0]);
  }
  // А в толще стенки, за краем задника, — только труба.
  const inWall = pierceY(t, 0, 180/2 + 4/2);
  chk('дальше в стенке — только труба', inWall.length === 2 && Math.abs((inWall[1]-inWall[0]) - 90) < 1e-9, inWall);
}
{
  const t = raw({hsBackT:0});
  chk('без задника в просвете пусто', pierceY(t, 0, 0).length === 0);
  chk('и треугольников ровно на трубу', t.length === 48, t.length);
}

console.log('=== отверстия под саморезы ===');
{
  const ov = {hsAF:180, hsBackT:3, mntScrewD:4.5};
  const t = raw(ov), s = hexShelfSpec(P(ov));
  chk('их два', s.holes === 2, s.holes);
  chk('в отверстии материала нет', pierceY(t, 0, s.sz).length === 0, pierceY(t, 0, s.sz));
  chk('и во втором тоже', pierceY(t, 0, -s.sz).length === 0);
  chk('рядом с отверстием материал есть', pierceY(t, 0, s.sz + s.sr + 0.5).length === 2);
  // Радиус меряется по сетке, а сверяется с ЗАКАЗАННЫМ Ø самореза.
  let rMin = 1e9, rMax = 0;
  for(const T of t) for(const v of T){ const d = Math.hypot(v[0], v[2] - s.sz);
    if(Math.abs(v[1] - (bbox(t).lo[1] + HEX_SHELF_SINK)) < 1e-9 && d < 20){ rMin = Math.min(rMin, d); rMax = Math.max(rMax, d); } }
  chk('радиус отверстия = половине заказанного Ø', Math.abs(rMin - 4.5/2) < 1e-9 && Math.abs(rMax - 4.5/2) < 1e-9,
      {rMin, rMax});
  chk('от кромки задника осталось не меньше запаса',
      (180/2 + HEX_SHELF_OVL) - (s.sz + s.sr) >= HEX_SHELF_EDGE - 1e-9,
      (180/2 + HEX_SHELF_OVL) - (s.sz + s.sr));
  const big = hexShelfSpec(P({hsAF:60, mntScrewD:60}));
  chk('слишком крупный саморез урезан', big.sr*2 < 60 - 0.05, big.sr*2);
  chk('и урезание объявлено', W({hsAF:60, mntScrewD:60}).some(x => /Ø самореза урезан/.test(x)),
      W({hsAF:60, mntScrewD:60}));
}

console.log('=== ни одной наклонной грани: поддержки не нужны нигде ===');
{
  for(const ov of [{}, {hsDepth:250}, {hsBackT:0}, {hsAF:60, hsWall:12}]){
    let sloped = 0, worst = 0;
    for(const T of raw(ov)){
      const e1=[T[1][0]-T[0][0],T[1][1]-T[0][1],T[1][2]-T[0][2]], e2=[T[2][0]-T[0][0],T[2][1]-T[0][1],T[2][2]-T[0][2]];
      const n=[e1[1]*e2[2]-e1[2]*e2[1], e1[2]*e2[0]-e1[0]*e2[2], e1[0]*e2[1]-e1[1]*e2[0]];
      const L=Math.hypot(n[0],n[1],n[2]); if(L < 1e-12) continue;
      const ny=Math.abs(n[1]/L);
      if(ny > 1e-9 && ny < 1 - 1e-9){ sloped++; worst = Math.max(worst, Math.min(ny, 1-ny)); }
    }
    chk(JSON.stringify(ov) + ': все грани строго вертикальны или горизонтальны', sloped === 0, {sloped, worst});
  }
}

console.log('=== предупреждения ===');
{
  chk('сквозная полка названа', W({hsBackT:0}).some(x => /сквозной трубой/.test(x)), W({hsBackT:0}));
  chk('с задником молчит', !W({}).some(x => /сквозной трубой/.test(x)));
  chk('нулевой саморез назван', W({mntScrewD:0}).some(x => /отверстий под саморезы нет/.test(x)));
  chk('тонкая стенка на крупной соте названа',
      W({hsAF:400, hsWall:4}).some(x => /полка такого размера гнётся/.test(x)));
  chk('на настройках по умолчанию не жалуется', W({}).length === 0, W({}));
  chk('глубокая башня названа', W({hsDepth:250}).some(x => /высокой башней/.test(x)));
}

console.log('=== вариант зарегистрирован ===');
{
  const opt = SHAPE_PARAMS.box.find(r => r.key === 'woBack').options.map(o => o.v);
  chk('в списке задников он есть', opt.indexOf('hexshelf') >= 0, opt);
  chk('строки полки показываются только у неё',
      SHAPE_PARAMS.box.filter(r => r.only && r.only.woBack && r.only.woBack.indexOf('hexshelf') >= 0).length === 4);
  chk('форма остаётся органайзером', dominantMode(P({})) === 'wallorg');
  const t = ship({});
  chk('через настоящий путь приложения строится то же тело', t.length > 0 && manifoldCheck(t, 3).watertight);
  currentShape = 'box';
  chk('имя модели называет размер под ключ', activeShapeLabel() === 'сота-полка (180 под ключ)', activeShapeLabel());
  chk('справка знает про плоскую грань вниз', /плоской гранью вниз/.test(MODEL_HELP.wallorg.what));
}

console.log((fail? 'FAIL ':'OK   ') + pass + ' passed, ' + fail + ' failed');
if(fail) process.exit(1);
