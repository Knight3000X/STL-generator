// Разъём шара на половинки: чтобы внутрь можно было положить гирлянду, не продевая её сквозь окна.
//
// Половинки строятся ДВУМЯ ПОЛОСАМИ ОДНОГО ПОЛЯ, а не разрезанием готовой сетки. Отсюда и то, что надо
// проверять:
//
//   1. ШОВ ИДЁТ ПО СПЛОШНОМУ ПОЯСКУ. Без него плоскость реза проходит посреди перемычек: на кромке
//      остаются тонкие язычки, которые не с чем стыковать и нечем клеить. Меряется долей углов, на
//      которых у кромки есть материал, — и рядом стоит КОНТРОЛЬНЫЙ ОПЫТ: та же мера на высоте окна
//      обязана показать разрывы, иначе она ничего не меряет.
//
//   2. ПОЛОВИНКИ СХОДЯТСЯ. Верх кромки нижней половины и низ кромки верхней — одна и та же высота и
//      одни и те же радиусы; узор у них общий, потому что поле считается по глобальному v.
//
//   3. ПОЯСОК-ЗАМОК СУЖАЕТСЯ КВЕРХУ И НЕ УПИРАЕТСЯ В ВЕРХНЮЮ ПОЛОВИНУ. Оба свойства измеримы: наклон
//      его стенок и зазор до внутренней поверхности верхней половины на каждой высоте.
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
// Есть ли материал в точке (r, угол a, высота y)? Вертикальный луч и попадание y внутрь его отрезка.
function solidAt(tris, r, a, y){
  const rr = runsY(tris, r*Math.cos(a), r*Math.sin(a));
  for(const q of rr) if(q[0] < y && q[1] > y) return true;
  return false;
}
/* Середина стенки НА ЗАДАННОЙ ВЫСОТЕ, а не на экваторе. Шар — сфера: на высоте шва он у'же, чем на
   экваторе, и луч, пущенный по экваториальному радиусу, не встречает у шва ничего. Первая версия этих
   проверок так и меряла — и печатала ноль сплошности на всех четырёх узорах. */
function midWallAt(tris, y){
  let mn = 1e9, mx = 0;
  for(const T of tris) for(const v of T) if(Math.abs(v[1] - y) < 1e-9){
    const r = Math.hypot(v[0], v[2]); mn = Math.min(mn, r); mx = Math.max(mx, r); }
  return (mn + mx)/2;
}
// Доля углов, на которых на данной высоте есть материал в середине стенки.
function ringFill(tris, r, y, n){
  let on = 0;
  for(let k=0;k<n;k++) if(solidAt(tris, r, 2*Math.PI*k/n, y)) on++;
  return on/n;
}

console.log('=== герметичность ===');
{
  let bad = 0, worst = null, minVol = 1e18, n = 0;
  for(const pat of ['grid','brick','spiral','diamond'])
    for(const D of [30, 90, 250])
      for(const t of [0.8, 1.6, 6])
        for(const part of ['both','top','bottom']){
          const ov = {lnSplit:true, lnPattern:pat, lnD:D, lnT:t, lnPart:part};
          const tr = raw(ov), m = manifoldCheck(tr, 6); n++;
          if(!m.watertight){ bad++; if(!worst) worst = {ov, open:m.openEdges, bad:m.badEdges}; }
          minVol = Math.min(minVol, vol(tr));
        }
  chk('108 сочетаний разъёма герметичны', bad === 0 && n === 108, worst || n);
  chk('объём везде положителен', minVol > 0, minVol);
}

console.log('=== шов идёт по СПЛОШНОМУ пояску (с контрольным опытом) ===');
{
  /* ПОЯСОВ ПЯТЬ, А НЕ ШЕСТЬ, И ЭТО НЕ МЕЛОЧЬ. При шести поясах доля v=0.5 приходится ровно на пояс
     САМОГО УЗОРА: кольцо там сплошное и без всякого шва, и проверка прошла бы на коде, из которого поясок
     шва убран вовсе. При нечётном числе поясов шов ложится между ними, и сплошность там — заслуга
     только шва. */
  for(const pat of ['grid','brick','spiral','diamond']){
    const ov = {lnSplit:true, lnPattern:pat, lnRows:5};
    const s = ballSpec(P(ov));
    const dn = ballBandTris(s, s.vSplit, 1);
    const bb = bbox(dn);
    const yS = bb.hi[1];                                   // кромка шва — верх нижней полосы
    const rMid = midWallAt(dn, yS);
    const fillSeam = ringFill(dn, rMid, yS - 0.15, 360);
    chk('«' + pat + '»: у шва материал на всех углах', fillSeam > 0.999, fillSeam);
    /* КОНТРОЛЬНЫЙ ОПЫТ. Та же мера ниже пояска, на высоте окна, обязана показать разрывы — иначе она
       меряет не сплошность, а собственную нечувствительность. */
    const yWin = yS - (bb.hi[1] - bb.lo[1])*0.5;
    const fillWin = ringFill(dn, rMid, yWin, 360);
    chk('  а на высоте окна — разрывы', fillWin < 0.9, fillWin);
  }
}
{
  // Ширина пояска — та же, что у перемычки: она и заказана.
  for(const rib of [1, 2, 5]){
    const ov = {lnSplit:true, lnRib:rib, lnPattern:'grid', lnRows:5};
    const s = ballSpec(P(ov));
    const dn = ballBandTris(s, s.vSplit, 1), bb = bbox(dn);
    const rMid = midWallAt(dn, bb.hi[1]);
    // Идём вниз от шва, пока кольцо сплошное: это и есть половина пояска.
    let h = 0;
    for(let d = 0.1; d < 20; d += 0.1){
      if(ringFill(dn, rMid, bb.hi[1] - d, 72) > 0.999) h = d; else break;
    }
    chk('перемычка ' + rib + ' мм — поясок под швом примерно её ширины', Math.abs(h - rib) < 0.6, h);
  }
}

console.log('=== половинки сходятся ===');
{
  const ov = {lnSplit:true};
  const s = ballSpec(P(ov));
  const dn = ballBandTris(s, s.vSplit, 1), up = ballBandTris(s, 0, s.vSplit);
  const bd = bbox(dn), bu = bbox(up);
  chk('верх нижней половины и низ верхней — одна высота', Math.abs(bd.hi[1] - bu.lo[1]) < 1e-9,
      {dn: bd.hi[1], up: bu.lo[1]});
  // И одни и те же радиусы кромки: наружный и внутренний.
  const rimR = (t, y) => { let mn = 1e9, mx = 0;
    for(const T of t) for(const v of T) if(Math.abs(v[1] - y) < 1e-9){ const r = Math.hypot(v[0], v[2]);
      mn = Math.min(mn, r); mx = Math.max(mx, r); }
    return [mn, mx]; };
  const a = rimR(dn, bd.hi[1]), b = rimR(up, bu.lo[1]);
  chk('и одни и те же радиусы кромки', Math.abs(a[0]-b[0]) < 1e-9 && Math.abs(a[1]-b[1]) < 1e-9, {dn:a, up:b});
  chk('кромка — кольцо в толщину стенки', Math.abs((a[1]-a[0]) - s.t) < 0.05, a[1]-a[0]);
}
{
  /* УЗОР У ПОЛОВИНОК ОБЩИЙ, потому что поле считается по ГЛОБАЛЬНОМУ v. Если бы каждая полоса мерила v
     от себя, спираль на верхней половине пошла бы с той же фазы, что и на нижней, — и на шве рисунок
     сломался бы. Меряем фазу спирали по обе стороны шва: на маленьком отступе она обязана совпасть. */
  const ov = {lnSplit:true, lnPattern:'spiral', lnRib:1.2, lnTwist:360};
  const s = ballSpec(P(ov));
  const dn = ballBandTris(s, s.vSplit, 1), up = ballBandTris(s, 0, s.vSplit);
  const yS = bbox(dn).hi[1], rMid = midWallAt(dn, yS);
  const angles = (t, y) => { const out = [];
    for(let k=0;k<720;k++){ const a = 2*Math.PI*k/720;
      if(solidAt(t, rMid, a, y)) out.push(a); }
    return out; };
  // Чуть ниже и чуть выше пояска — там узор уже свой, а не сплошной.
  const below = angles(dn, yS - s.rib - 1.5), above = angles(up, yS + s.rib + 1.5);
  chk('по обе стороны шва узор есть', below.length > 20 && above.length > 20 &&
      below.length < 700 && above.length < 700, {below: below.length, above: above.length});
  // Ближайшая перемычка сверху к каждой перемычке снизу — не дальше половины шага окон.
  const step = 2*Math.PI/s.cols;
  let worst = 0;
  for(const a of below){ let d = 1e9;
    for(const b2 of above) d = Math.min(d, Math.abs(((a - b2 + Math.PI) % (2*Math.PI) + 2*Math.PI) % (2*Math.PI) - Math.PI));
    worst = Math.max(worst, d); }
  chk('и перемычки по обе стороны шва не разъезжаются', worst < step*0.5, {worst, step});
}

console.log('=== поясок-замок ===');
{
  const ov = {lnSplit:true};
  const s = ballSpec(P(ov)), L = ballLipSpec(P(ov));
  chk('поясок встал', L.on && L.fits, L);
  const lip = ballLipTris(P(ov));
  chk('и он построен', lip.length > 100, lip.length);
  const bl = bbox(lip);
  const yS = bbox(ballBandTris(s, s.vSplit, 1)).hi[1];
  chk('он торчит над швом', bl.hi[1] > yS + 1, {top: bl.hi[1], yS});
  chk('и уходит под него', bl.lo[1] < yS - 1, {bot: bl.lo[1], yS});
  /* СУЖАЕТСЯ КВЕРХУ: нижняя половина печатается швом вверх, поясок идёт последним, и расширение вверх
     означало бы нависание. Меряется по сетке — радиус на верхней кромке против радиуса на нижней. */
  const rAt = y => { let mx = 0;
    for(const T of lip) for(const v of T) if(Math.abs(v[1] - y) < 1e-9) mx = Math.max(mx, Math.hypot(v[0], v[2]));
    return mx; };
  chk('сужается кверху', rAt(bl.hi[1]) < rAt(bl.lo[1]) - 0.1, {top: rAt(bl.hi[1]), bot: rAt(bl.lo[1])});
  let worst = 0;
  for(const T of lip){
    const e1=[T[1][0]-T[0][0],T[1][1]-T[0][1],T[1][2]-T[0][2]], e2=[T[2][0]-T[0][0],T[2][1]-T[0][1],T[2][2]-T[0][2]];
    const n=[e1[1]*e2[2]-e1[2]*e2[1], e1[2]*e2[0]-e1[0]*e2[2], e1[0]*e2[1]-e1[1]*e2[0]];
    const Ln=Math.hypot(n[0],n[1],n[2]); if(Ln<1e-12) continue;
    const ny=Math.abs(n[1]/Ln);
    if(ny < 1 - 1e-9) worst = Math.max(worst, ny);
  }
  chk('и нигде не заваливается круче 45°', worst <= Math.SQRT1_2 + 1e-9, {worst});
  /* И НЕ УПИРАЕТСЯ В ВЕРХНЮЮ ПОЛОВИНУ. Внутренняя поверхность верхней половины меряется по ЕЁ сетке —
     наименьший радиус вершин на каждой высоте, — и поясок обязан всюду быть у'же неё. */
  const up = ballBandTris(s, 0, s.vSplit);
  let clash = 0, minGap = 1e9;
  for(let k = 1; k <= 10; k++){
    const y = yS + (bl.hi[1] - yS)*k/10;
    let rInner = 1e9;
    for(const T of up) for(const v of T) if(Math.abs(v[1] - y) < 0.6) rInner = Math.min(rInner, Math.hypot(v[0], v[2]));
    let rLip = 0;
    for(const T of lip) for(const v of T) if(Math.abs(v[1] - y) < 0.6) rLip = Math.max(rLip, Math.hypot(v[0], v[2]));
    if(rLip > 0 && rInner < 1e9){ minGap = Math.min(minGap, rInner - rLip); if(rInner - rLip < 0.05) clash++; }
  }
  chk('поясок нигде не упирается в верхнюю половину', clash === 0, {clash, minGap});
  chk('и зазор при этом не разгульный', minGap < 2, minGap);
}
{
  /* УКЛОН НЕ КРУЧЕ 45° — ПО ПОСТРОЕНИЮ, А НЕ ПО СЧАСТЛИВОМУ СЛУЧАЮ. Высота захода под шов считается ПОД
     перепад радиуса, а не берётся константой: с фиксированными двумя миллиметрами на шаре Ø90 выходило
     ровно 45.0°, то есть впритык, а на других шарах и круче. Перебираем область определения. */
  {
    let worst = 0, at = null;
    for(let D = 30; D <= 250; D += 10)
      for(const tw of [0.8, 1.6, 3.2, 6])
        for(const top of [2, 60, 200]){
          const L2 = ballLipSpec(P({lnSplit:true, lnD:D, lnT:tw, lnTopD:top}));
          if(!L2.fits) continue;
          const k = (L2.rBot - L2.rTop)/L2.drop;
          if(k > worst){ worst = k; at = {D, t:tw, top, k:+k.toFixed(4)}; }
        }
    chk('на всей области определения уклон пояска не круче 45°', worst <= 1 + 1e-9, {worst, at});
    chk('и где-то он ровно 45° — значит высота считается, а не взята с запасом', worst > 0.999, worst);
  }
  /* ОТКАЗ ПОЯСКА ДОСТИЖИМ, и набор для него подобран перебором: из 19 425 сочетаний он случается в 1210,
     и все требуют тонкой стенки при узком верхнем отверстии — «на глаз» такое не берут. */
  {
    const nofit = {lnSplit:true, lnD:58, lnT:0.8, lnTopD:2, lnBottomD:60};
    chk('поясок отказывает там, где отказывает', !ballLipSpec(P(nofit)).fits, ballLipSpec(P(nofit)));
    chk('и об этом сказано', W(nofit).some(x => /поясок-замок не встал/.test(x)), W(nofit));
    chk('и половинки при этом всё равно строятся и герметичны',
        manifoldCheck(raw(nofit), 6).watertight);
  }
  /* НА ТОНКОЙ СТЕНКЕ ПОЯСОК ВСЁ РАВНО ВСТАЁТ, если места хватает: он толще стенки и просто выступает
     внутрь шара — держать он от этого хуже не станет. Проверяем именно это, а не выдуманный отказ. */
  const thin = {lnSplit:true, lnD:250, lnT:0.8};
  const L = ballLipSpec(P(thin));
  chk('на стенке 0.8 мм поясок встаёт', L.fits, L);
  chk('и он толще самой стенки — выступает внутрь', L.t > 0.8, {lip: L.t, wall: 0.8});
  chk('на настройках по умолчанию про поясок молчат', !W({lnSplit:true}).some(x => /поясок/.test(x)),
      W({lnSplit:true}));
}

console.log('=== раскладка: обе половинки на столе ===');
{
  const t = raw({lnSplit:true}), bb = bbox(t);
  // Разделяем по X: левая группа — нижняя половина, правая — верхняя.
  let loL = 1e9, loR = 1e9, hiL = -1e9, loXR = 1e9, hiXL = -1e9;
  for(const T of t) for(const v of T){
    if(v[0] < 0){ loL = Math.min(loL, v[1]); hiXL = Math.max(hiXL, v[0]); }
    else { loR = Math.min(loR, v[1]); loXR = Math.min(loXR, v[0]); }
  }
  chk('обе половинки стоят на одном уровне', Math.abs(loL - loR) < 1e-9, {loL, loR});
  chk('и это самый низ детали', Math.abs(loL - bb.lo[1]) < 1e-9, {loL, bbox: bb.lo[1]});
  chk('они не пересекаются по X', loXR > hiXL + 1, {hiXL, loXR});
  chk('и деталь стала вдвое шире шара', bb.hi[0]-bb.lo[0] > 90*1.9, bb.hi[0]-bb.lo[0]);
  const one = bbox(raw({lnSplit:true, lnPart:'bottom'}));
  chk('а по одной — шириной в шар', one.hi[0]-one.lo[0] < 91, one.hi[0]-one.lo[0]);
}

console.log('=== выбор половинки ===');
{
  const top = raw({lnSplit:true, lnPart:'top'}), bot = raw({lnSplit:true, lnPart:'bottom'});
  chk('верх и низ — разные тела', top.length !== bot.length, [top.length, bot.length]);
  chk('оба герметичны', manifoldCheck(top,6).watertight && manifoldCheck(bot,6).watertight);
  const both = raw({lnSplit:true});
  chk('обе вместе — сумма их треугольников', both.length === top.length + bot.length,
      {both: both.length, sum: top.length + bot.length});
  // Поясок — только у нижней: у верхней на его высоте внутри пусто.
  const s = ballSpec(P({lnSplit:true}));
  chk('поясок только у нижней половины',
      ballLipTris(P({lnSplit:true})).length > 0 && bot.length > ballBandTris(s, s.vSplit, 1).length,
      [bot.length, ballBandTris(s, s.vSplit, 1).length]);
  /* А ШЕЙКА — ТОЛЬКО У ВЕРХНЕЙ, и это не симметрия ради симметрии: шейка садится на ВЕРХНЕЕ отверстие,
     которого у нижней половины нет вовсе. Уйди она вниз — встала бы на нижнее, то есть на то, которым
     половинка стоит на столе. Меряется тем, что от неё прибавляется треугольников. */
  const topN = raw({lnSplit:true, lnPart:'top', lnNeck:true});
  const botN = raw({lnSplit:true, lnPart:'bottom', lnNeck:true});
  chk('шейка прибавляется верхней половине', topN.length > top.length, [top.length, topN.length]);
  chk('и НЕ прибавляется нижней', botN.length === bot.length, [bot.length, botN.length]);
}

console.log('=== без разъёма шар прежний ===');
{
  const a = raw({}), s = ballSpec(P({}));
  chk('целый шар — это полоса [0,1]', a.length === ballBandTris(s, 0, 1).length, [a.length, ballBandTris(s,0,1).length]);
  chk('пояска нет', ballLipTris(P({})).length === 0);
  chk('и поле шва не включено', ballSpec(P({})).split === false);
  chk('а с разъёмом — включено', ballSpec(P({lnSplit:true})).split === true);
  // Поле без разъёма у шва ничего не добавляет: доля материала на кромке та же, что и в узоре.
  const sOdd = ballSpec(P({lnRows:5}));
  const dn = ballBandTris(sOdd, 0, 1);
  const split = ballBandTris(ballSpec(P({lnSplit:true, lnRows:5})), 0.5, 1);
  const yS = bbox(split).hi[1], rMid = midWallAt(split, yS);
  chk('на целом шаре на высоте шва материал НЕ сплошной', ringFill(dn, rMid, yS, 360) < 0.9,
      ringFill(dn, rMid, yS, 360));
}

console.log('=== регистрация ===');
{
  const rows = SHAPE_PARAMS.box.filter(r => r.key === 'lnSplit' || r.key === 'lnPart');
  chk('две строки разъёма', rows.length === 2, rows.map(r => r.key));
  chk('выбор половинки показывается только при разъёме',
      rows.find(r => r.key === 'lnPart').only.lnSplit.indexOf('true') >= 0);
  currentShape = 'box';
  const nm = ov => { Object.assign(paramState.box, P(ov)); return activeShapeLabel(); };
  chk('обе половинки в имени', nm({lnSplit:true}) === 'ажурный шар половинками (Ø90)', nm({lnSplit:true}));
  chk('верх', nm({lnSplit:true, lnPart:'top'}) === 'ажурный шар — верх (Ø90)', nm({lnSplit:true, lnPart:'top'}));
  chk('низ', nm({lnSplit:true, lnPart:'bottom'}) === 'ажурный шар — низ (Ø90)', nm({lnSplit:true, lnPart:'bottom'}));
  chk('с шейкой и разъёмом — ёлочный шарик половинками',
      nm({lnSplit:true, lnNeck:true}) === 'ёлочный шарик половинками (Ø90)', nm({lnSplit:true, lnNeck:true}));
  chk('без разъёма прежнее имя', nm({}) === 'ажурный шар (Ø90)', nm({}));
  chk('справка знает про поясок', /поясок-замок/.test(MODEL_HELP.ball.what));
  chk('и про то, что переворачивать не надо', /переворачивать ничего не надо/.test(MODEL_HELP.ball.how));
}

console.log((fail? 'FAIL ':'OK   ') + pass + ' passed, ' + fail + ' failed');
if(fail) process.exit(1);
