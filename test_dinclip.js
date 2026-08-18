// Клипса на DIN-рейку TS35.
//
// Держит её не форма, а ОДНО ЧИСЛО, которого в превью не видно: деформация упругого язычка. Отойти губке
// нужно на заход плюс зазор — около полутора миллиметров, — и отойти вбок, поперёк рейки. Ножка губки для
// этого коротка (восемь с половиной миллиметров дают восемь процентов деформации, вчетверо больше, чем
// терпит PETG), поэтому пружина лежит в плоскости спинки: язычок, вырезанный двумя прорезями, с губкой
// посередине.
//
// Язычок защемлён С ОБОИХ КОНЦОВ, и это следствие, а не выбор: прорезь, доходящая до края спинки, — уже не
// отверстие, а вырез, а собрать спинку из положенных рядом кусков нельзя (у двух коробок одной толщины
// совпадут верхняя и нижняя грани — четыре треугольника на ребре, дыра, которой manifoldCheck не видит).
// Цена: ε = 12·y·t/L² вместо 1.5·y·t/L² у консоли, ВОСЕМЬ раз строже. Здесь проверяется и сама формула, и
// то, что прорези действительно освобождают язычок, — потому что прорезь, не дошедшая до конца, превращает
// пружину в сплошную спинку, а деталь при этом выглядит ровно так же.
//
// И геометрия захвата: просвет между губками, высота подреза над спинкой и вылет крючка внутрь. Ошибись в
// любом из трёх на полмиллиметра — клипса либо не наденется, либо не удержит, и узнать это можно только на
// рейке. Запускать через ./run-all.sh.
let pass=0, fail=0;
function chk(n,c,e){if(c){pass++;console.log('  OK  ',n);}else{fail++;console.log('  FAIL',n,e!==undefined?JSON.stringify(e):'');}}

function setp(ov){ logos.length=0; boxHoles.length=0; dieFaces.length=0;
  Object.assign(paramState.box, defaultBoxParams(), {gfBaseplate:false, mntMode:'dinclip'}, ov); return paramState.box; }
const mk = ov => buildTrisForShape('box', setp(ov));
const spec = ov => dinClipSpec(setp(ov));

// Интервалы материала вдоль оси `ax` на прямой (p,q) — знаковыми пересечениями, а не чётностью: деталь
// собрана из пересекающихся оболочек, и чётность на них врёт.
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

console.log('=== водонепроницаемость по всему диапазону ===');
for(const ov of [{}, {dinTab:0}, {dinLen:12}, {dinLen:90}, {dinTongue:0.8}, {dinTongue:6}, {dinAnchor:20},
                 {dinRailW:8}, {dinRailW:40}, {dinGrab:0.3}, {dinGrab:4}, {dinLead:10}, {dinLead:75},
                 {dinT:1.2}, {dinT:8}, {mntScrewD:0}, {mntScrewD:12}, {dinClear:0}, {dinClear:1},
                 {dinRailDep:2}, {dinRailDep:20}, {dinRailT:0.4}, {dinRailT:3}]){
  const m = manifoldCheck(mk(ov), 4);
  chk(JSON.stringify(ov)+': рёбра спарены и граней не склеено', m.openEdges===0 && m.badEdges===0, m);
}

console.log('=== захват: просвет, подрез, вылет крючка ===');
{
  const ov = {dinRailW:35, dinRailDep:7.5, dinRailT:1, dinClear:0.3, dinGrab:1.2, dinT:3, dinLen:40};
  const s = spec(ov), t = mk(ov);
  // Деталь центруется по габариту; по X и Z она симметрична, съезжает только Y.
  let mny=1e9, mxy=-1e9; for(const T of t) for(const v of T){ if(v[1]<mny)mny=v[1]; if(v[1]>mxy)mxy=v[1]; }
  const dy = mny, Y = y => y + dy;              // спинка начиналась на y = 0
  chk('спинка стоит на нуле, а не съехала', Math.abs((mxy - mny) - (s.legTop + s.tab)) < 1e-6, [mxy-mny, s.legTop+s.tab]);
  // Просвет между внутренними гранями губок: на высоте лапки он равен размаху рейки плюс два зазора.
  const yFoot = (s.yFoot0 + s.yFoot1)/2, runs = solidRuns(t, 0, Y(yFoot), 0);
  const right = runs.filter(r=>r[0] > 1e-6).map(r=>r[0]), left = runs.filter(r=>r[1] < -1e-6).map(r=>-r[1]);
  const clearW = Math.min.apply(null, right) + Math.min.apply(null, left);
  chk('просвет между губками = размах + два зазора', Math.abs(clearW - (s.railW + 2*s.clear)) < 0.02, [clearW, s.railW+2*s.clear]);
  // Подрез: снизу у крючка горизонтальная грань ровно на задней плоскости лапки.
  /* Мерить надо ТАМ, ГДЕ ТОЛЬКО КРЮЧОК: внутри ножки столб материала сплошной от спинки до верха. Берётся
     ГЛУХАЯ губка: под упругой на этой же координате прорезь, и спинки в столбе просто нет — столб выходит
     один, а не два, и «второй кусок» оказался бы пустотой. */
  const colF = solidRuns(t, 1, 0, -(s.xi - s.grab*0.5));    // ось 1: p — это Z, q — это X
  const hookBottom = colF.length >= 2 ? colF[1][0] - dy : null;
  chk('под крючком глухой губки — спинка и пустота', colF.length === 2, colF.length);
  chk('подрез стоит на задней плоскости лапки', Math.abs(hookBottom - s.yFoot1) < 0.02, [hookBottom, s.yFoot1]);
  // А под упругой губкой на той же координате спинки нет вовсе: там прорезь.
  const colS = solidRuns(t, 1, 0, s.xi - s.grab*0.5);
  chk('под упругой губкой спинка прорезана', colS.length === 1 && Math.abs(colS[0][0] - dy - s.yFoot1) < 0.02,
      colS.map(r=>[+(r[0]-dy).toFixed(2), +(r[1]-dy).toFixed(2)]));
  chk('и это высота вылета шляпы + толщина лапки + зазор',
      Math.abs(s.yFoot1 - (s.T + s.dep + s.railT + s.clear)) < 1e-9, s.yFoot1);
  // Вылет крючка внутрь: на высоте подреза материал заходит на `grab` за внутреннюю грань губки.
  const atHook = solidRuns(t, 0, Y(s.yFoot1 + 0.25), 0);
  const inner = Math.min.apply(null, atHook.filter(r=>r[0] > 1e-6).map(r=>r[0]));
  chk('крючок заходит внутрь ровно на заход', Math.abs((s.xi - inner) - s.grab) < 0.03, [s.xi - inner, s.grab]);
  chk('глухая губка заходит на столько же',
      Math.abs((s.xi - Math.min.apply(null, atHook.filter(r=>r[1] < -1e-6).map(r=>-r[1]))) - s.grab) < 0.03);
  // Заходная фаска: чем острее угол, тем выше губка — форма отзывается на ручку.
  chk('угол фаски меняет высоту губки', spec({dinLead:15}).legTop > spec({dinLead:60}).legTop + 3);
  // Угол считается ОТ ВЕРТИКАЛИ, как у защёлки-консоли: 30° — это пологий заход, а не крутой.
  chk('фаска идёт под заданным углом',
      Math.abs(Math.atan2(s.grab + 0.8, s.lipH)*180/Math.PI - s.lead) < 1e-6, s.lipH);
}

console.log('=== прорези действительно освобождают язычок ===');
{
  const s = spec({}), t = mk({});
  let mny=1e9; for(const T of t) for(const v of T) if(v[1]<mny) mny=v[1];
  const yMid = mny + s.T/2;                                  // внутри спинки, ниже всех губок
  // На середине пролёта: спинка — язычок — обод, между ними две пустоты.
  const mid = solidRuns(t, 0, yMid, 0).filter(r => r[1] > 0);
  chk('на середине пролёта спинка разрезана надвое', mid.length === 3, mid.map(r=>[+r[0].toFixed(2),+r[1].toFixed(2)]));
  if(mid.length === 3){
    const tongue = mid[1];
    chk('средний кусок — это язычок заданной ширины', Math.abs((tongue[1]-tongue[0]) - s.bw) < 0.05, tongue[1]-tongue[0]);
    chk('внутренняя прорезь — просто разрез', Math.abs((tongue[0] - mid[0][1]) - s.slitIn) < 0.05, tongue[0]-mid[0][1]);
    // Наружная прорезь — это и есть ход язычка: она обязана быть шире требуемого отхода.
    const gapOut = mid[2][0] - tongue[1];
    chk('наружная прорезь = ход + запас', Math.abs(gapOut - s.slitOut) < 0.05, [gapOut, s.slitOut]);
    chk('и её хватает на весь отход губки', gapOut > s.yDefl + 1e-9, [gapOut, s.yDefl]);
  }
  // В заделке спинка сплошная — иначе язычок не балка, а болтающаяся полоска.
  const anch = solidRuns(t, 0, yMid, s.Ls/2 + s.anchor/2).filter(r => r[1] > 0);
  chk('в заделке спинка сплошная', anch.length === 1, anch.map(r=>[+r[0].toFixed(2),+r[1].toFixed(2)]));
  // Прорезь идёт ровно на пролёт: замер вдоль Z по её середине.
  const slitZ = solidRuns(t, 2, s.xt0 + s.bw + s.slitOut/2, yMid);
  const openZ = slitZ.length === 2 ? slitZ[1][0] - slitZ[0][1] : 0;
  chk('длина прорези = свободный пролёт', Math.abs(openZ - s.Ls) < 0.05, [openZ, s.Ls]);
  // Упругая губка стоит НА язычке и никуда не свешивается.
  chk('ножка упругой губки уже язычка', s.bw - 2*DIN_FIT < s.bw && DIN_FIT > 0);
  chk('и целиком внутри его ширины', s.xi >= s.xt0 - 1e-9 && s.xi + s.bw - 2*DIN_FIT <= s.xt0 + s.bw + 1e-9);
  chk('губка короче пролёта', s.jawZ < s.Ls + 1e-9, [s.jawZ, s.Ls]);
}

console.log('=== отверстия под винт стоят за лапками рейки ===');
{
  const s = spec({mntScrewD:4.5}), t = mk({mntScrewD:4.5});
  let mny=1e9; for(const T of t) for(const v of T) if(v[1]<mny) mny=v[1];
  chk('винты есть', s.hasScrew);
  chk('и стоят СНАРУЖИ от лапки рейки', Math.abs(s.screwX) > s.railW/2 + 1e-9, [s.screwX, s.railW/2]);
  chk('мимо глухой губки', Math.abs(s.screwX) - s.screwD/2 > s.xi + s.jf - 1e-9, [Math.abs(s.screwX) - s.screwD/2, s.xi + s.jf]);
  chk('и не выходят за спинку', Math.abs(s.screwX) + s.screwD/2 < s.W/2 - 1e-9, [Math.abs(s.screwX) + s.screwD/2, s.W/2]);
  for(const sz of [-1, 1]){
    const col = solidRuns(t, 1, sz*s.screwZ, s.screwX);      // ось 1: p — это Z, q — это X
    chk('отверстие на z='+(sz*s.screwZ).toFixed(1)+' сквозное', col.length === 0, col.length);
  }
  const solid = solidRuns(t, 1, 0, s.screwX);                // между отверстиями спинка цела
  chk('между отверстиями спинка цела', solid.length === 1 && Math.abs((solid[0][1]-solid[0][0]) - s.T) < 1e-6, solid);
  chk('крыло появляется только под винты', spec({mntScrewD:0}).W < s.W - 1e-9, [spec({mntScrewD:0}).W, s.W]);
}

console.log('=== губки и язычок для снятия ===');
{
  const s = spec({}), t = mk({});
  let mny=1e9; for(const T of t) for(const v of T) if(v[1]<mny) mny=v[1];
  const Y = y => y + mny;
  // Глухая губка идёт во всю длину, упругая — только по середине язычка.
  const zF = solidRuns(t, 2, -(s.xi + s.jf/2), Y(s.yFoot0 - 1));
  const zS = solidRuns(t, 2, s.xi + (s.bw - 2*DIN_FIT)/2, Y(s.yFoot0 - 1));
  chk('глухая губка почти во всю длину', zF.length === 1 && zF[0][1]-zF[0][0] > s.L - 1.2, zF);
  chk('упругая губка сидит на середине', zS.length === 1 && Math.abs((zS[0][1]-zS[0][0]) - s.jawZ) < 0.02, zS);
  chk('и она короче глухой', (zS[0][1]-zS[0][0]) < (zF[0][1]-zF[0][0]) - 1, [zS[0][1]-zS[0][0], zF[0][1]-zF[0][0]]);
  // Полочка для ногтя торчит НАРУЖУ, у самого верха, и только когда язычок заказан.
  const top = solidRuns(t, 0, Y(s.legTop + s.tab - 1.2), 0).filter(r => r[0] > 0);
  chk('вверху остаётся только упругая губка', top.length === 1, top);
  chk('и полочка выходит за её наружную грань', top[0][1] > s.xi + s.bw - 2*DIN_FIT + 0.5,
      [top[0][1], s.xi + s.bw - 2*DIN_FIT]);
  const noTab = mk({dinTab:0});
  let hi=-1e9, lo=1e9; for(const T of noTab) for(const v of T){ if(v[1]>hi)hi=v[1]; if(v[1]<lo)lo=v[1]; }
  chk('без язычка деталь ровно на него ниже', Math.abs((hi-lo) - s.legTop) < 1e-6, [hi-lo, s.legTop]);
}

console.log('=== пружина: формула балки с двумя заделками ===');
{
  const b = {dinLen:40, dinAnchor:4, dinTongue:2, dinGrab:1.2, dinClear:0.3, dinT:3, dinMat:'petg'};
  const s = spec(b);
  chk('пролёт = длина минус две заделки', Math.abs(s.Ls - (40 - 8)) < 1e-9, s.Ls);
  chk('деформация по ε = 12·y·t/L²', Math.abs(s.eps - 100*12*1.5*2/(32*32)) < 1e-9, s.eps);
  chk('усилие по F = 16·E·w·t³·δ/L³',
      Math.abs(s.force - 16*2100*3*8*1.5/(32*32*32)) < 1e-6, s.force);
  // Пролёт входит КВАДРАТОМ — это и есть та ручка, которую советуют крутить.
  const long = spec(Object.assign({}, b, {dinLen:64}));      // пролёт 56 вместо 32
  chk('вдвое длиннее пролёт — вчетверо меньше деформация',
      Math.abs(long.eps - s.eps*(32*32)/(56*56)) < 1e-9, [s.eps, long.eps]);
  chk('шире язычок — прямо пропорционально больше',
      Math.abs(spec(Object.assign({}, b, {dinTongue:4})).eps - 2*s.eps) < 1e-9);
  chk('больше заход — прямо пропорционально больше',
      Math.abs(spec(Object.assign({}, b, {dinGrab:2.7})).eps - s.eps*3/1.5) < 1e-9);
  chk('умолчания укладываются в PETG', !s.over && s.eps < s.mat.eps, [s.eps, s.mat.eps]);
  chk('на PLA те же размеры уже за пределом', spec(Object.assign({}, b, {dinMat:'pla'})).over);
  chk('на нейлоне запас большой', !spec(Object.assign({}, b, {dinMat:'nylon'})).over);
  chk('материал форму не меняет', (() => {
    const a = mk(Object.assign({}, b, {dinMat:'pla'})), c = mk(Object.assign({}, b, {dinMat:'nylon'}));
    return a.length === c.length; })());
  chk('усилие правдоподобно (десятки ньютон)', s.force > 5 && s.force < 200, +s.force.toFixed(1));
}

console.log('=== имя и предупреждения ===');
{
  chk('имя называет рейку и деформацию', /DIN-рейку 35 мм \(язычок 3\.5 % при 4\)/.test(activeShapeLabel(setp({}))), activeShapeLabel());
  const wr = ov => collectPrintWarnings(setp(ov));
  chk('деформация печатается всегда', wr({}).some(x=>/деформация 3\.5 % при допустимых 4 %/.test(x)), wr({}));
  chk('и усилие снятия тоже', wr({}).some(x=>/усилие снятия/.test(x)));
  chk('перебор назван прямо', wr({dinMat:'pla'}).some(x=>/БОЛЬШЕ допустимого/.test(x)), wr({dinMat:'pla'}));
  chk('и сказано, что крутить', wr({dinMat:'pla'}).some(x=>/КВАДРАТ пролёта/.test(x)));
  chk('расширенный язычок назван', wr({dinTongue:0.8}).some(x=>/язычок расширен/.test(x)));
  chk('урезанная заделка названа', wr({dinAnchor:20}).some(x=>/заделка уменьшена/.test(x)));
  chk('мелкий заход назван', wr({dinGrab:0.4}).some(x=>/соскочит с лапки/.test(x)));
  chk('тонкая спинка названа', wr({dinT:1.4}).some(x=>/гнётся плашмя/.test(x)));
  chk('нестандартный размах назван', wr({dinRailW:32}).some(x=>/у стандартной TS35/.test(x)));
  chk('невлезшие винты названы', wr({dinLen:20, mntScrewD:9}).some(x=>/не поместились/.test(x)), wr({dinLen:20, mntScrewD:9}));
  chk('умолчания не жалуются на зажимы', !wr({}).some(x=>/расширен|уменьшена|соскочит|плашмя|TS35|не поместились/.test(x)), wr({}));
  const h = MODEL_HELP['mount:dinclip'];
  chk('у клипсы своя справка', !!h && /рейку/.test(h.what), h && h.what);
  chk('и PLA в ней не советуют', !!h && h.mat.indexOf('pla') < 0, h && h.mat);
}

console.log('=== TOTAL: ' + pass + ' passed, ' + fail + ' failed ===');
if(fail) process.exit(1);
