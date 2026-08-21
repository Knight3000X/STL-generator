// Посадка абажура на патрон: КРЕСТОВИНА У ОСНОВАНИЯ.
//
// Первая попытка (v22.2.0) сажала абажур хомутом сверху — устье схлопывалось до диаметра кольца
// патрона. Неверно сразу по трём причинам, и все три видны на готовой детали: силуэт задавала посадка,
// а не человек; хомут приходился на самый верх, то есть печатался последним и в самом трудном месте
// оболочки; и настоящие абажуры так не крепятся. Крестовина стоит у основания, ложится на стол первым
// слоем и силуэт не трогает вовсе.
//
// Проверяется ровно то, что от этого решения зависит:
//
//   1. СИЛУЭТ НЕ ТРОНУТ. Оболочка с посадкой и без неё — одна и та же до последнего знака.
//   2. ПОДОШВА КРЕСТОВИНЫ И ТОРЕЦ ОБОЛОЧКИ НЕ ДЕЛЯТ ГРАНЬ. Обе лежат на плоскости стола, и внизу луч
//      намеренно НЕ доходит до стенки; наверху — заходит в неё. Между этими высотами грань наклонная.
//   3. КРАЙ ЛУЧА СЧИТАЕТСЯ ПО САМОМУ УЗКОМУ СЕЧЕНИЮ. Огранка и рельеф только убавляют радиус, и луч,
//      отмеренный по круглому, пробил бы стенку насквозь — оболочка при этом осталась бы замкнутой.
//
// Запускать через ./run-all.sh (extraction test).

let pass=0, fail=0;
function chk(n,c,e){ if(c){pass++;console.log('  OK  ',n);} else {fail++;console.log('  FAIL',n,e!==undefined?JSON.stringify(e):'');} }
function vol(t){let v=0;for(const T of t){const a=T[0],b=T[1],c=T[2];v+=(a[0]*(b[1]*c[2]-b[2]*c[1])-a[1]*(b[0]*c[2]-b[2]*c[0])+a[2]*(b[0]*c[1]-b[1]*c[0]))/6;}return v;}
const P = ov => Object.assign({}, defaultBoxParams(), {fnOn:true, fnMode:'vase', vaseFloor:false}, ov||{});
const build = ov => buildVase(P(ov));
const spec  = ov => vaseSpec(P(ov));
const W     = ov => collectPrintWarnings(P(ov));
const web   = ov => vaseSpiderTris(vaseSpec(P(ov)));
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
const at = (t,r,a) => runsY(t, r*Math.cos(a), r*Math.sin(a));
/* ЩУПАТЬ НАДО В ПОЛОСЕ КРЕСТОВИНЫ, А НЕ ПО ВСЕЙ ВЫСОТЕ. Профиль вазы проходит один и тот же радиус
   несколько раз — у основания, потом по дороге от пуза к шейке, потом от шейки к устью, — и луч,
   пущенный на радиусе луча крестовины, встречает стенку в трёх местах. Первая версия этих проверок
   считала такие встречи материалом крестовины и объявляла просветы между лучами занятыми. */
function webRun(t, lo, T, r, a){
  for(const d of [0, 3e-4, -3e-4]){
    const rr = at(t, r, a + d);
    for(const q of rr) if(q[0] < lo + T*0.5 && q[1] > lo + T*0.5) return q;
  }
  return null;
}
const inWeb = (t, lo, T, r, a) => webRun(t, lo, T, r, a) !== null;

console.log('=== герметичность ===');
{
  /* Ваза здесь вдвое ниже обычной. Перебор меряет КРЕСТОВИНУ, а высота профиля к ней не относится
     вовсе — зато вдвое меньше рядов это вдвое меньше треугольников на каждую из сотни сборок, и файл
     из полутора минут превращается в двадцать секунд. */
  let bad = 0, worst = null, minVol = 1e18, n = 0;
  for(const sk of ['none','e27','e14','custom'])
    for(const base of [60, 140])
      for(const fac of [0, 6])
        for(const rel of ['none','lobe'])
          for(const arms of [2, 4, 8]){
            const ov = {vaseH:60, vaseSocket:sk, vaseBaseD:base, vaseFacets:fac, vaseRelief:rel,
                        vaseReliefD:3, vaseSpiderN:arms, vaseSocketD:20};
            const t = build(ov), m = manifoldCheck(t, 6); n++;
            if(!m.watertight){ bad++; if(!worst) worst = {ov, open:m.openEdges, bad:m.badEdges}; }
            minVol = Math.min(minVol, vol(t));
          }
  for(const sk of ['none','e27','custom'])
    for(const arms of [2, 8]){
      const ov = {vaseH:60, vaseSocket:sk, vaseSpiderN:arms, vaseFloor:true};   // с дном посадки нет
      const t = build(ov), m = manifoldCheck(t, 6); n++;
      if(!m.watertight){ bad++; if(!worst) worst = {ov, open:m.openEdges, bad:m.badEdges}; }
      minVol = Math.min(minVol, vol(t));
    }
  chk('102 сочетания посадки герметичны', bad === 0 && n === 102, worst || n);
  chk('объём везде положителен', minVol > 0, minVol);
}

console.log('=== силуэт не тронут: устье остаётся заказанным ===');
{
  /* ЭТО И ЕСТЬ ГЛАВНОЕ ОТЛИЧИЕ ОТ ХОМУТА. Хомут задавал верхний диаметр сам: заказанное устье Ø70
     превращалось в Ø43. Крестовина не трогает профиль вовсе, и проверяется это буквально — оболочка
     строится дважды, с посадкой и без, и профили обязаны совпасть. */
  const a = spec({vaseSocket:'none'}), b = spec({vaseSocket:'e27'});
  chk('профиль с посадкой и без — один и тот же',
      a.prof.length === b.prof.length && a.prof.every((r,i) => Math.abs(r - b.prof[i]) < 1e-12),
      [a.prof.length, b.prof.length]);
  chk('и контрольные точки те же', JSON.stringify(a.pts) === JSON.stringify(b.pts), [a.pts, b.pts]);
  // Устье в СЕТКЕ: верхняя кромка оболочки при заказанных Ø70.
  const t = build({vaseSocket:'e27', vaseMouthD:70}), bb = bbox(t);
  let rTopMax = 0;
  for(const T of t) for(const v of T) if(Math.abs(v[1] - bb.hi[1]) < 1e-9) rTopMax = Math.max(rTopMax, Math.hypot(v[0], v[2]));
  chk('устье в сетке — заказанные Ø70', Math.abs(rTopMax*2 - 70) < 1e-9, rTopMax*2);
  chk('и габарит по высоте прежний', Math.abs((bb.hi[1]-bb.lo[1]) - 120) < 1e-9, bb.hi[1]-bb.lo[1]);
}

console.log('=== крестовина стоит У ОСНОВАНИЯ, а не наверху ===');
{
  const ov = {vaseSocket:'e27', vaseBaseD:80, vaseSpiderT:3};
  const t = build(ov), bb = bbox(t), sp0 = spec(ov).spider;
  // На самой оси материала нет вовсе — там отверстие под кольцо патрона.
  chk('на оси материала нет: там отверстие', runsY(t, 0.0001, 0.0001).length === 0, runsY(t, 0.0001, 0.0001));
  // А в ступице — ровно один отрезок, от стола и в толщину крестовины.
  const hub = runsY(t, (sp0.rBore + sp0.rHub)/2, 0.0001);
  chk('в ступице есть ровно один отрезок', hub.length === 1, hub);
  chk('он начинается от плоскости стола', hub.length===1 && Math.abs(hub[0][0] - bb.lo[1]) < 1e-9, hub);
  chk('и он ровно в толщину крестовины', hub.length===1 && Math.abs((hub[0][1]-hub[0][0]) - 3) < 1e-9, hub);
  for(const T of [1.5, 3, 8]){
    const o = {vaseSocket:'e27', vaseBaseD:80, vaseSpiderT:T};
    const sp = spec(o).spider;
    const r = runsY(build(o), (sp.rBore + sp.rHub)/2, 0.0001);
    chk('толщина ' + T + ' мм получилась', r.length===1 && Math.abs((r[0][1]-r[0][0]) - T) < 1e-9, r);
  }
  chk('и крестовина стоит ВНИЗУ: выше своей толщины в ступице пусто',
      hub.length===1 && hub[0][1] < bb.lo[1] + 3.001, hub);
}

console.log('=== отверстие под кольцо патрона — заказанное ===');
{
  for(const [sk, d] of [['e27',40],['e14',28]]){
    const t = build({vaseSocket:sk, vaseBaseD:90}), sp = spec({vaseSocket:sk, vaseBaseD:90}).spider;
    chk('посадка ' + sk + ' встала', sp && sp.fits, sp);
    chk('  Ø ступицы изнутри = ' + d, Math.abs(sp.rBore*2 - d) < 1e-12, sp.rBore*2);
    const bb = bbox(t), T = sp.T;
    chk('  в отверстии материала нет', !inWeb(t, bb.lo[1], T, sp.rBore - 0.5, 0.3));
    chk('  а сразу за ним — есть', inWeb(t, bb.lo[1], T, sp.rBore + 0.5, 0.3));
  }
  for(const d of [10, 20, 55]){
    const o = {vaseSocket:'custom', vaseSocketD:d, vaseBaseD:140};
    const sp = spec(o).spider, t = build(o), bb = bbox(t);
    chk('свой Ø' + d + ' — ровно он',
        Math.abs(sp.rBore*2 - d) < 1e-12 && !inWeb(t, bb.lo[1], sp.T, d/2 - 0.5, 0.3) &&
        inWeb(t, bb.lo[1], sp.T, d/2 + 0.5, 0.3), sp.rBore*2);
  }
}

console.log('=== на столе подошва и торец оболочки НЕ делят грань ===');
{
  /* Обе лежат на плоскости стола. Перекройся они там — получились бы две совпадающие грани: сетка
     замкнута, объём верен, и увидеть это можно только разложив радиусы вершин НА САМОЙ ПЛОСКОСТИ. Их
     набор обязан распадаться на две группы с настоящим просветом между ними. */
  for(const ov of [{vaseSocket:'e27', vaseBaseD:80}, {vaseSocket:'e14', vaseBaseD:60},
                   {vaseSocket:'e27', vaseBaseD:140, vaseSpiderN:8}]){
    const t = build(ov), bb = bbox(t), sp = spec(ov).spider;
    const rs = [];
    for(const T of t) for(const v of T) if(Math.abs(v[1] - bb.lo[1]) < 1e-9) rs.push(Math.hypot(v[0], v[2]));
    rs.sort((a,b) => a-b);
    /* Ищем не самый широкий просвет вообще (он между ступицей и концом луча — там просто нет узлов), а
       именно тот, что отделяет крестовину от оболочки: последний радиус ДО внутренней поверхности. */
    const s2 = spec(ov);
    let maxBelow = 0;
    for(const r of rs) if(r < s2.innerMin - 1e-9) maxBelow = Math.max(maxBelow, r);
    let minAbove = 1e9;
    for(const r of rs) if(r >= s2.innerMin - 1e-9) minAbove = Math.min(minAbove, r);
    chk(JSON.stringify(ov) + ': на плоскости стола между крестовиной и оболочкой есть просвет',
        minAbove - maxBelow > 0.15, {maxBelow, minAbove});
    chk('  и кончается луч ровно там, где обещано', Math.abs(maxBelow - sp.rBot) < 1e-9,
        {maxBelow, rBot: sp.rBot});
  }
}
{
  // А НАВЕРХУ своей толщины луч, наоборот, сидит В стенке — иначе крестовина ни к чему не прикреплена.
  const ov = {vaseSocket:'e27', vaseBaseD:80, vaseSpiderT:3};
  const t = build(ov), s = spec(ov), sp = s.spider;
  chk('наверху луч заходит за внутреннюю поверхность', sp.rTop > s.innerMin + 1e-9, {rTop:sp.rTop, innerMin:s.innerMin});
  chk('и ровно на заявленный заход', Math.abs((sp.rTop - s.innerMin) - VASE_SPIDER_LIFT) < 1e-12, sp.rTop - s.innerMin);
  chk('а внизу не доходит ровно на заявленный зазор',
      Math.abs((s.innerMin - sp.rBot) - VASE_SPIDER_GAP) < 1e-12, s.innerMin - sp.rBot);
  /* На радиусе внутри стенки, по оси луча, отрезок, накрывающий крестовину, обязан начинаться ОТ СТОЛА:
     значит луч и оболочка срослись, а не стоят рядом. Всего отрезков там больше одного — профиль вазы
     проходит этот радиус ещё дважды, по дороге от пуза к шейке и от шейки к устью. */
  const bb2 = bbox(t);
  const q = webRun(t, bb2.lo[1], sp.T, s.innerMin + 0.3, 0.002);
  chk('на оси луча оболочка и крестовина — одно тело', !!q && Math.abs(q[0] - bb2.lo[1]) < 1e-9, q);
  /* А ЧТО ОНИ ИМЕННО СРОСЛИСЬ, а не стоят встык, меряется по КРАЙНИМ РАДИУСАМ САМОЙ КРЕСТОВИНЫ против
     ИЗМЕРЕННОЙ внутренней поверхности оболочки. Внутренняя поверхность берётся из сетки БЕЗ крестовины:
     самый близкий к оси узел на плоскости стола. Со спецификацией, которая строила, тут не сверяется
     ничего. */
  const shellOnly = build({vaseSocket:'none', vaseBaseD:80});
  const bs = bbox(shellOnly);
  let innerMeasured = 1e9;
  for(const T2 of shellOnly) for(const v of T2)
    if(Math.abs(v[1] - bs.lo[1]) < 1e-9) innerMeasured = Math.min(innerMeasured, Math.hypot(v[0], v[2]));
  const wt = web(ov);
  let webTop = 0, webBot = 0;
  for(const T2 of wt) for(const v of T2){ const r = Math.hypot(v[0], v[2]);
    if(Math.abs(v[1] - sp.T) < 1e-9) webTop = Math.max(webTop, r);
    if(Math.abs(v[1]) < 1e-9)        webBot = Math.max(webBot, r); }
  chk('наверху луч заходит ЗА измеренную внутреннюю поверхность',
      webTop > innerMeasured + 1e-9, {webTop, innerMeasured});
  chk('  и ровно на заявленный заход', Math.abs((webTop - innerMeasured) - VASE_SPIDER_LIFT) < 1e-9,
      webTop - innerMeasured);
  chk('внизу не доходит до неё ровно на заявленный зазор',
      Math.abs((innerMeasured - webBot) - VASE_SPIDER_GAP) < 1e-9, innerMeasured - webBot);
}

console.log('=== край луча — по САМОМУ УЗКОМУ сечению, а не по круглому ===');
{
  /* Огранка и рельеф только убавляют радиус. Луч, отмеренный по круглому профилю, на гранёном абажуре
     вылез бы наружу сквозь стенку — и оболочка при этом осталась бы замкнутой. */
  const plain = spec({vaseSocket:'e27', vaseBaseD:140});
  const fac   = spec({vaseSocket:'e27', vaseBaseD:140, vaseFacets:6});
  const rel   = spec({vaseSocket:'e27', vaseBaseD:140, vaseRelief:'lobe', vaseReliefD:5});
  chk('на огранке самое узкое сечение уже круглого', fac.innerMin < plain.innerMin - 1,
      {fac:fac.innerMin, plain:plain.innerMin});
  chk('и луч укорачивается вместе с ним', fac.spider.rTop < plain.spider.rTop - 1,
      {fac:fac.spider.rTop, plain:plain.spider.rTop});
  chk('рельеф тоже убавляет', rel.innerMin < plain.innerMin - 0.5, {rel:rel.innerMin, plain:plain.innerMin});
  // И луч НИГДЕ не пробивает наружную поверхность: самый дальний край меньше наружного радиуса.
  for(const ov of [{vaseFacets:6}, {vaseRelief:'lobe', vaseReliefD:5}, {vaseFacets:8, vaseRelief:'flute', vaseReliefD:4}]){
    const o = Object.assign({vaseSocket:'e27', vaseBaseD:140}, ov);
    const s = spec(o), t = build(o), bb = bbox(t);
    let rShell = 0;
    for(const T of t) for(const v of T) if(v[1] < bb.lo[1] + s.spider.T) rShell = Math.max(rShell, Math.hypot(v[0], v[2]));
    let rWeb = 0;
    for(const T of web(o)) for(const v of T) rWeb = Math.max(rWeb, Math.hypot(v[0], v[2]));
    chk(JSON.stringify(ov) + ': луч не выходит за наружную поверхность', rWeb < rShell - 0.3, {rWeb, rShell});
  }
}

console.log('=== лучей столько, сколько заказано, и они той ширины ===');
{
  for(const n of [2, 3, 4, 8]){
    const ov = {vaseSocket:'e27', vaseBaseD:140, vaseSpiderN:n, vaseSpiderW:6};
    const t = build(ov), s = spec(ov), sp = s.spider;
    const bb = bbox(t), r = (sp.rHub + sp.rTop)/2;
    let on = 0, between = 0;
    for(let k=0;k<n;k++){
      if(inWeb(t, bb.lo[1], sp.T, r, (k + 0.002)*2*Math.PI/n)) on++;
      if(inWeb(t, bb.lo[1], sp.T, r, (k + 0.5)*2*Math.PI/n)) between++;
    }
    chk(n + ' лучей построено', on === n, on);
    chk('  и между ними пусто', between === 0, between);
  }
  // Ширина у ступицы — заказанная. Меряется по сетке на измеренном же радиусе ступицы.
  for(const w of [3, 6, 12]){
    const ov = {vaseSocket:'e27', vaseBaseD:140, vaseSpiderN:4, vaseSpiderW:w};
    const t = build(ov), sp = spec(ov).spider, bb = bbox(t);
    const rr = sp.rHub + 0.05;
    const edge = (f, xIn, xOut) => { for(let i=0;i<44;i++){ const m=(xIn+xOut)/2; if(f(m)) xIn=m; else xOut=m; } return (xIn+xOut)/2; };
    const loA = edge(a => !inWeb(t, bb.lo[1], sp.T, rr, a), -0.7, 0.02),
          hiA = edge(a => !inWeb(t, bb.lo[1], sp.T, rr, a), 0.7, -0.02);
    const got = 2*rr*Math.sin((hiA - loA)/2)*sp.rHub/rr;
    chk('луч ' + w + ' мм у ступицы и вышел ' + w, Math.abs(got - w) < 0.06, got);
  }
}

console.log('=== крестовина печатается плоско: наклон её граней не круче 20° ===');
{
  for(const ov of [{vaseSocket:'e27', vaseBaseD:80}, {vaseSocket:'e27', vaseBaseD:140, vaseSpiderT:8},
                   {vaseSocket:'e14', vaseBaseD:60, vaseSpiderN:8}]){
    let worst = 0;
    for(const T of web(ov)){
      const e1=[T[1][0]-T[0][0],T[1][1]-T[0][1],T[1][2]-T[0][2]], e2=[T[2][0]-T[0][0],T[2][1]-T[0][1],T[2][2]-T[0][2]];
      const n=[e1[1]*e2[2]-e1[2]*e2[1], e1[2]*e2[0]-e1[0]*e2[2], e1[0]*e2[1]-e1[1]*e2[0]];
      const L=Math.hypot(n[0],n[1],n[2]); if(L<1e-12) continue;
      const ny=Math.abs(n[1]/L);
      if(ny < 1 - 1e-9) worst = Math.max(worst, ny);
    }
    chk(JSON.stringify(ov) + ': боковые грани отклоняются от вертикали не больше чем на 20°',
        worst <= Math.sin(20*Math.PI/180) + 1e-9, {worst, limit: Math.sin(20*Math.PI/180)});
  }
}

console.log('=== отказы ===');
{
  chk('с дном посадка не строится', spec({vaseSocket:'e27', vaseFloor:true}).spider === null);
  chk('и об этом сказано', W({vaseSocket:'e27', vaseFloor:true}).some(x => /это абажур/.test(x)));
  chk('без посадки крестовины нет', spec({vaseSocket:'none'}).spider === null);
  chk('и треугольников она не даёт', web({vaseSocket:'none'}).length === 0);
  // Тесное основание: ступица занимает его целиком.
  const tight = {vaseSocket:'e27', vaseBaseD:52};
  chk('в тесное основание крестовина не встаёт', !spec(tight).spider.fits, spec(tight).spider);
  chk('и сказано, каким основание должно быть', W(tight).some(x => /основание должно быть шире/.test(x)), W(tight));
  chk('а в просторное — встаёт молча', !W({vaseSocket:'e27', vaseBaseD:120}).some(x => /крестовина/.test(x)),
      W({vaseSocket:'e27', vaseBaseD:120}));
  // Слишком широкая ступица от широкого луча.
  const fat = {vaseSocket:'e27', vaseBaseD:60, vaseSpiderN:8, vaseSpiderW:20};
  chk('широкий луч раздувает ступицу и крестовина не встаёт', !spec(fat).spider.fits, spec(fat).spider);
}

console.log('=== завал стенки внутрь назван числом ===');
{
  const s = spec({vaseSocket:'none'});
  let m = 0;
  for(let i=1;i<=s.nS;i++){ const dr = s.prof[i-1] - s.prof[i], dy = (s.ts[i]-s.ts[i-1])*s.H;
    if(dr > 0 && dy > 0) m = Math.max(m, Math.atan2(dr, dy)*180/Math.PI); }
  chk('завал считается по профилю', Math.abs(s.leanMax - m) < 1e-12, {spec:s.leanMax, mine:m});
  chk('у вазы по умолчанию он около 30°', s.leanMax > 25 && s.leanMax < 35, s.leanMax);
  chk('и молчит', !W({vaseSocket:'none'}).some(x => /заваливается внутрь/.test(x)));
  const steep = {vaseSocket:'none', vaseBellyD:200, vaseNeckD:30};
  chk('на крутом переходе он за 60°', spec(steep).leanMax > 60, spec(steep).leanMax);
  chk('и сказан', W(steep).some(x => /заваливается внутрь/.test(x)), W(steep));
}

console.log('=== имя и справка ===');
{
  currentShape = 'box';
  const nm = ov => { Object.assign(paramState.box, P(ov)); return activeShapeLabel(); };
  chk('абажур с E27 назван по патрону', /^абажур E27 /.test(nm({vaseSocket:'e27', vaseBaseD:90})),
      nm({vaseSocket:'e27', vaseBaseD:90}));
  chk('со своим Ø — по диаметру', /^абажур Ø20 /.test(nm({vaseSocket:'custom', vaseSocketD:20, vaseBaseD:90})),
      nm({vaseSocket:'custom', vaseSocketD:20, vaseBaseD:90}));
  chk('не вставшая крестовина в имени не хвастается', /^абажур \(/.test(nm({vaseSocket:'e27', vaseBaseD:52})),
      nm({vaseSocket:'e27', vaseBaseD:52}));
  chk('без посадки — просто абажур', /^абажур \(/.test(nm({vaseSocket:'none'})), nm({vaseSocket:'none'}));
  chk('с дном — ваза', /^ваза \(/.test(nm({vaseSocket:'e27', vaseFloor:true})), nm({vaseSocket:'e27', vaseFloor:true}));
  chk('справка говорит про первый слой', /ПЕРВЫМ СЛОЕМ/.test(MODEL_HELP.funnel.how));
  chk('и про самое узкое сечение', /САМОМУ УЗКОМУ сечению/.test(MODEL_HELP.funnel.how));
  const rows = SHAPE_PARAMS.box.filter(r => /vaseSpider/.test(r.key));
  chk('три строки крестовины', rows.length === 3, rows.map(r => r.key));
  chk('строки хомута убраны', !SHAPE_PARAMS.box.some(r => r.key === 'vaseSocketH'));
}

console.log((fail? 'FAIL ':'OK   ') + pass + ' passed, ' + fail + ' failed');
if(fail) process.exit(1);
