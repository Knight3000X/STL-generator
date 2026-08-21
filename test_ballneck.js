// Шейка под шнур: ёлочный шарик из ажурного шара.
//
// Верхнее отверстие у шара НЕ ВЫБИРАЕТСЯ, а выводится: плоскость реза обязана пересекать и внутреннюю
// сферу, поэтому уже 2·√(t·(2R−t)) оно не бывает — на шаре Ø90 со стенкой 1.6 это 23.8 мм. Заказать
// шесть и получить двадцать четыре и есть та жалоба, которую «Печатаемость» печатает с v21.0.0.
//
// Шейка снимает ограничение, не трогая шар: отдельная оболочка садится на кромку и сводит отверстие к
// заказанному. Проверяется здесь то, что от этого решения зависит:
//
//   1. ОТВЕРСТИЕ СТАЛО ЗАКАЗАННЫМ. Не «меньше», а ровно им.
//   2. ПОДОШВА ШЕЙКИ ЛЕЖИТ В ТОЛЩЕ СТЕНКИ ШАРА. Кольцо, съехавшее внутренним краем в просвет, печаталось
//      бы мостом над пустотой шара — и увидеть это можно только сложив шейку с шаром, потому что каждая
//      оболочка по отдельности безупречна.
//   3. КОНУС НЕ КРУЧЕ 45°. Шар печатается нижним отверстием на стол, шейка идёт последней.
//
// Запускать через ./run-all.sh (extraction test).

let pass=0, fail=0;
function chk(n,c,e){ if(c){pass++;console.log('  OK  ',n);} else {fail++;console.log('  FAIL',n,e!==undefined?JSON.stringify(e):'');} }
function vol(t){let v=0;for(const T of t){const a=T[0],b=T[1],c=T[2];v+=(a[0]*(b[1]*c[2]-b[2]*c[1])-a[1]*(b[0]*c[2]-b[2]*c[0])+a[2]*(b[0]*c[1]-b[1]*c[0]))/6;}return v;}
const P = ov => Object.assign({}, defaultBoxParams(), {lnMode:'ball'}, ov||{});
const raw = ov => buildLanternBall(P(ov));
const W   = ov => collectPrintWarnings(P(ov));
const bbox = t => { const lo=[1e9,1e9,1e9], hi=[-1e9,-1e9,-1e9];
  for(const T of t) for(const v of T) for(let i=0;i<3;i++){ if(v[i]<lo[i])lo[i]=v[i]; if(v[i]>hi[i])hi[i]=v[i]; }
  return {lo,hi}; };
// Отрезки материала вдоль Y через (x,z).
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
    const ny=e1[2]*e2[0]-e1[0]*e2[2]; if(Math.abs(ny)<1e-12) continue;
    hits.push([w1*a[1]+w2*b[1]+(1-w1-w2)*c[1], ny<0?1:-1]);
  }
  hits.sort((p,q)=>p[0]-q[0]);
  const runs=[]; let d=0, st=null;
  for(const [t0,dd] of hits){ const pr=d; d+=dd;
    if(pr<=0&&d>0) st=t0; else if(pr>0&&d<=0){ if(st!==null&&t0-st>1e-6) runs.push([st,t0]); st=null; } }
  return runs;
}

console.log('=== герметичность ===');
{
  let bad = 0, worst = null, minVol = 1e18, n = 0;
  for(const D of [30, 90, 250])
    for(const t of [0.8, 1.6, 6])
      for(const bore of [2, 6, 20])
        for(const h of [0, 5, 20])
          for(const top of [2, 26, 200]){
            const ov = {lnNeck:true, lnD:D, lnT:t, lnNeckD:bore, lnNeckH:h, lnTopD:top};
            const m = manifoldCheck(raw(ov), 6); n++;
            if(!m.watertight){ bad++; if(!worst) worst = {ov, open:m.openEdges, bad:m.badEdges}; }
            minVol = Math.min(minVol, vol(raw(ov)));
          }
  chk('243 сочетания с шейкой герметичны', bad === 0 && n === 243, worst || n);
  chk('объём везде положителен', minVol > 0, minVol);
}

console.log('=== отверстие стало заказанным ===');
{
  for(const d of [2, 6, 12, 20]){
    const ov = {lnNeck:true, lnNeckD:d};
    const t = raw(ov), nk = ballNeckSpec(P(ov)), b = bbox(t);
    chk('шейка Ø' + d + ' встала', nk.fits, nk);
    // Самая верхняя точка детали — верх шейки; там просвет и меряется.
    let rMin = 1e9;
    for(const T of t) for(const v of T) if(Math.abs(v[1] - b.hi[1]) < 1e-9) rMin = Math.min(rMin, Math.hypot(v[0], v[2]));
    chk('  и просвет наверху = заказанному Ø' + d, Math.abs(rMin*2 - d) < 1e-9, rMin*2);
    chk('  на оси шейки материала нет', runsY(t, 0, 0).length === 0, runsY(t, 0, 0));
    chk('  а в её стенке — есть', runsY(t, d/2 + 0.8, 0).length >= 1);
  }
}
{
  // БЕЗ шейки просвет наверху — тот, что навязала геометрия, и он много шире заказанного.
  const t = raw({}), b = bbox(t), s = ballSpec(P({}));
  let rMin = 1e9;
  for(const T of t) for(const v of T) if(Math.abs(v[1] - b.hi[1]) < 1e-9) rMin = Math.min(rMin, Math.hypot(v[0], v[2]));
  /* Просвет без шейки — 10.5 мм при заказанных шести: не «примерно шесть», а почти вдвое шире, и уже
     его не сделать никак. С шейкой ровно шесть — это и есть вся разница. */
  chk('без шейки просвет наверху почти вдвое шире заказанных шести', rMin*2 > 9 && rMin*2 < 12, rMin*2);
  chk('а с шейкой ровно шесть', (() => { const tn = raw({lnNeck:true, lnNeckD:6}), bn = bbox(tn);
    let r = 1e9; for(const T of tn) for(const v of T) if(Math.abs(v[1] - bn.hi[1]) < 1e-9) r = Math.min(r, Math.hypot(v[0], v[2]));
    return Math.abs(r*2 - 6) < 1e-9; })());
  chk('и это не выдумка: минимум отверстия выведен из толщины',
      Math.abs(s.capMin - (2*Math.sqrt(s.t*(2*s.R - s.t)) + 0.4)) < 1e-12, s.capMin);
}

console.log('=== подошва шейки лежит в толще стенки шара ===');
{
  /* Кольцо подошвы, съехавшее внутренним краем в просвет, печаталось бы мостом над пустотой шара. Каждая
     оболочка по отдельности при этом безупречна — ловится только сложением. Меряем ШАР БЕЗ ШЕЙКИ на том
     же радиусе и требуем, чтобы высота подошвы попадала СТРОГО внутрь его материала. */
  for(const ov of [{lnNeck:true}, {lnNeck:true, lnD:30, lnT:6}, {lnNeck:true, lnD:250, lnT:6},
                   {lnNeck:true, lnTopD:60}]){
    const nk = ballNeckSpec(P(ov));
    if(!nk.fits){ chk(JSON.stringify(ov) + ': шейка встала', false, nk); continue; }
    const ball = raw(Object.assign({}, ov, {lnNeck:false}));
    const bb = bbox(ball), bn = bbox(raw(ov));
    // Обе сетки центрируются по своему размаху — переводим высоту подошвы в систему шара без шейки.
    const y0ball = nk.y0 - (nk.spec.R*Math.cos(nk.spec.aTop) + nk.spec.R*Math.cos(nk.spec.aBot))/2;
    let okIn = 0, okOut = 0;
    for(const f of [0.15, 0.5, 0.85]){
      const r = nk.rBase - nk.wBase*f;
      const rr = runsY(ball, r, 0);
      if(rr.some(q => q[0] < y0ball - 0.05 && q[1] > y0ball + 0.05)) okIn++; else okOut++;
    }
    chk(JSON.stringify(ov) + ': вся подошва внутри стенки шара', okIn === 3, {okIn, okOut});
  }
}

console.log('=== конус не круче 45° ===');
{
  for(const ov of [{lnNeck:true}, {lnNeck:true, lnNeckD:2}, {lnNeck:true, lnNeckD:20},
                   {lnNeck:true, lnTopD:200}, {lnNeck:true, lnD:250, lnT:6}]){
    let worst = 0;
    for(const T of ballNeckTris(P(ov))){
      const e1=[T[1][0]-T[0][0],T[1][1]-T[0][1],T[1][2]-T[0][2]], e2=[T[2][0]-T[0][0],T[2][1]-T[0][1],T[2][2]-T[0][2]];
      const n=[e1[1]*e2[2]-e1[2]*e2[1], e1[2]*e2[0]-e1[0]*e2[2], e1[0]*e2[1]-e1[1]*e2[0]];
      const L=Math.hypot(n[0],n[1],n[2]); if(L<1e-12) continue;
      const ny=Math.abs(n[1]/L);
      if(ny < 1 - 1e-9) worst = Math.max(worst, ny);   // торцевые кольца горизонтальны — их не считаем
    }
    chk(JSON.stringify(ov) + ': ни одна стенка шейки не круче 45°', worst <= Math.SQRT1_2 + 1e-9,
        {worst, limit: Math.SQRT1_2});
  }
}

console.log('=== высота шейки — заказанная прямая часть плюс считанный конус ===');
{
  for(const h of [0, 5, 20]){
    const ov = {lnNeck:true, lnNeckH:h};
    const nk = ballNeckSpec(P(ov));
    chk('прямая часть ' + h + ' мм учтена', Math.abs((nk.top - nk.y0) - (nk.hCone + h)) < 1e-12, nk.top - nk.y0);
    // Конус ровно такой, чтобы уклон не превысил 45°: перепад радиуса равен высоте.
    if(nk.hCone > 1.5 + 1e-9)
      chk('  конус ровно 45° по ВНУТРЕННЕЙ стенке — она и круче',
          Math.abs((nk.rBase - nk.wBase - nk.bore) - nk.hCone) < 1e-12,
          {inner: nk.rBase - nk.wBase - nk.bore, outer: nk.rBase - nk.wall - nk.bore, h: nk.hCone});
  }
  const tall = ballNeckSpec(P({lnNeck:true, lnTopD:200}));
  chk('на широком отверстии конус вырастает', tall.hCone > 20, tall.hCone);
  chk('и об этом сказано', W({lnNeck:true, lnTopD:200}).some(x => /это уже труба/.test(x)) ||
      W({lnNeck:true, lnTopD:200}).some(x => /подошва шейки утончена/.test(x)), W({lnNeck:true, lnTopD:200}));
}

console.log('=== шейка выключена — шар прежний ===');
{
  const a = raw({}), b = raw({lnNeck:false});
  chk('без шейки треугольников столько же', a.length === b.length, [a.length, b.length]);
  chk('шейка не строится', ballNeckTris(P({})).length === 0);
  chk('и габарит прежний', Math.abs(bbox(a).hi[1] - bbox(b).hi[1]) < 1e-12);
  const withNeck = raw({lnNeck:true});
  chk('а с шейкой деталь становится выше', bbox(withNeck).hi[1] - bbox(withNeck).lo[1] >
      bbox(a).hi[1] - bbox(a).lo[1] + 5, [bbox(withNeck).hi[1]-bbox(withNeck).lo[1], bbox(a).hi[1]-bbox(a).lo[1]]);
}

console.log('=== отказы и предупреждения ===');
{
  // Шнуровое отверстие шире самого просвета — сводить нечего.
  const nk = ballNeckSpec(P({lnNeck:true, lnD:30, lnT:0.8, lnNeckD:20}));
  chk('шейка шире просвета не ставится', !nk.fits, nk);
  chk('и об этом сказано', W({lnNeck:true, lnD:30, lnT:0.8, lnNeckD:20}).some(x => /шейка не встала/.test(x)),
      W({lnNeck:true, lnD:30, lnT:0.8, lnNeckD:20}));
  chk('на настройках по умолчанию шейка встаёт молча',
      !W({lnNeck:true}).some(x => /шейка/.test(x)), W({lnNeck:true}));
  chk('без шейки про неё не говорится', !W({}).some(x => /шейка/.test(x)));
}

console.log('=== регистрация ===');
{
  const rows = SHAPE_PARAMS.box.filter(r => r.group === 'Ажурный шар' && /lnNeck/.test(r.key));
  chk('три строки шейки', rows.length === 3, rows.map(r => r.key));
  chk('две из них показываются только при включённой шейке',
      rows.filter(r => r.only && r.only.lnNeck).length === 2);
  chk('переключатель объясняет, откуда взялось ограничение',
      /2·√\(t·\(2R−t\)\)/.test(rows.find(r => r.key === 'lnNeck').hint));
  currentShape = 'box';
  Object.assign(paramState.box, P({lnNeck:true}));
  chk('с шейкой модель зовётся ёлочным шариком', activeShapeLabel() === 'ёлочный шарик (Ø90)', activeShapeLabel());
  Object.assign(paramState.box, P({}));
  chk('без неё — ажурным шаром', activeShapeLabel() === 'ажурный шар (Ø90)', activeShapeLabel());
}

console.log((fail? 'FAIL ':'OK   ') + pass + ' passed, ' + fail + ' failed');
if(fail) process.exit(1);
