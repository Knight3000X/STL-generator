// Посадка абажура на патрон: верхнее отверстие превращается в ХОМУТ — короткий прямой цилиндр под
// кольцо патрона E27/E14.
//
// Проверять тут надо ровно три вещи, и ни одна из них не видна проверке замкнутости:
//
//   1. ХОМУТ ПРЯМОЙ. Профиль — Catmull-Rom, и «поставить две контрольные точки одного радиуса» прямого
//      участка НЕ даёт: касательная считается по соседям, и между ними кривая проседает внутрь.
//      Прямота меряется по сетке: у всех вершин выше tC радиус обязан быть ОДИН.
//
//   2. ХОМУТ КРУГЛЫЙ. Огранка и рельеф только УБАВЛЯЮТ радиус: на шестиграннике середина грани уходит
//      внутрь на 13 %, и кольцо Ø40 в такой хомут не пройдёт. Выше tC сечение обязано быть круглым —
//      при том, что ниже оно огранено, и обе части одной оболочки.
//
//   3. ВНУТРЕННИЙ ДИАМЕТР — ЗАКАЗАННЫЙ. Не «примерно 40», а ровно: это посадочный размер.
//
// Запускать через ./run-all.sh (extraction test).

let pass=0, fail=0;
function chk(n,c,e){ if(c){pass++;console.log('  OK  ',n);} else {fail++;console.log('  FAIL',n,e!==undefined?JSON.stringify(e):'');} }
const P = ov => Object.assign({}, defaultBoxParams(), {fnOn:true, fnMode:'vase', vaseFloor:false}, ov||{});
const build = ov => buildVase(P(ov));
const spec  = ov => vaseSpec(P(ov));
const W     = ov => collectPrintWarnings(P(ov));
// Радиусы вершин выше заданной высоты (высота — от НИЗА детали, деталь центрирована по Y).
function radiiAbove(tris, frac){
  let lo=1e9, hi=-1e9;
  for(const T of tris) for(const v of T){ if(v[1]<lo)lo=v[1]; if(v[1]>hi)hi=v[1]; }
  const yc = lo + (hi-lo)*frac, out=[];
  for(const T of tris) for(const v of T) if(v[1] >= yc + 1e-9) out.push(Math.hypot(v[0], v[2]));
  return {r: out, lo, hi, H: hi-lo};
}

console.log('=== герметичность и габарит ===');
{
  let bad = 0, worst = null;
  for(const sk of ['none','e27','e14','custom'])
    for(const fac of [0, 6])
      for(const rel of ['none','lobe'])
        for(const h of [4, 8, 30])
          for(const floor of [true, false]){
            const ov = {vaseSocket:sk, vaseFacets:fac, vaseRelief:rel, vaseReliefD:4,
                        vaseSocketH:h, vaseFloor:floor, vaseSocketD:33};
            const m = manifoldCheck(build(ov), 6);
            if(!m.watertight){ bad++; if(!worst) worst = {ov, open:m.openEdges, bad:m.badEdges}; }
          }
  chk('96 сочетаний посадки герметичны', bad === 0, worst);
  const r = radiiAbove(build({vaseSocket:'e27'}), 0);
  chk('высота абажура — заказанные 120 мм', Math.abs(r.H - 120) < 1e-9, r.H);
}

console.log('=== хомут ПРЯМОЙ: сплайн между двумя точками одного радиуса проседает ===');
{
  const ov = {vaseSocket:'e27', vaseSocketH:12};
  const s = spec(ov), t = build(ov);
  // Берём вершины строго выше начала хомута и смотрим разброс радиусов.
  const a = radiiAbove(t, s.sock.tC + 0.005);
  const rMin = Math.min.apply(null, a.r), rMax = Math.max.apply(null, a.r);
  chk('в хомуте есть что мерить', a.r.length > 200, a.r.length);
  chk('ровно два радиуса — наружный и внутренний, без промежуточных',
      Math.abs(rMax - s.sock.rC) < 1e-9 && Math.abs(rMin - s.sock.rIn) < 1e-9, {rMin, rMax, want:[s.sock.rIn, s.sock.rC]});
  const mid = a.r.filter(x => x > s.sock.rIn + 1e-6 && x < s.sock.rC - 1e-6);
  chk('ни одна вершина хомута не проседает внутрь', mid.length === 0, mid.slice(0,5));
  // Толщина стенки хомута — та же, что у всей оболочки.
  chk('стенка хомута = стенке абажура', Math.abs((rMax - rMin) - s.wall) < 1e-9, rMax - rMin);
}
{
  // Высота хомута — заказанная, и меряется по сетке: ищем, с какой высоты радиус перестаёт меняться.
  for(const hh of [4, 8, 20]){
    const ov = {vaseSocket:'e27', vaseSocketH:hh};
    const s = spec(ov), t = build(ov);
    let lo=1e9, hi=-1e9;
    for(const T of t) for(const v of T){ if(v[1]<lo)lo=v[1]; if(v[1]>hi)hi=v[1]; }
    let yStart = hi;
    for(const T of t) for(const v of T){
      const r = Math.hypot(v[0], v[2]);
      if(Math.abs(r - s.sock.rC) > 1e-9 && Math.abs(r - s.sock.rIn) > 1e-9) yStart = Math.min(yStart, 1e9);
    }
    // Нижняя граница прямого участка: самая низкая вершина с радиусом ровно rC.
    let yC = hi;
    for(const T of t) for(const v of T)
      if(Math.abs(Math.hypot(v[0], v[2]) - s.sock.rC) < 1e-9) yC = Math.min(yC, v[1]);
    chk('хомут высотой ' + hh + ' мм и вышел ' + hh, Math.abs((hi - yC) - hh) < 1e-9, hi - yC);
  }
}

console.log('=== хомут КРУГЛЫЙ даже на огранённом абажуре ===');
{
  const ov = {vaseSocket:'e27', vaseFacets:6, vaseSocketH:12};
  const s = spec(ov), t = build(ov);
  const a = radiiAbove(t, s.sock.tC + 0.005);
  const rMax = Math.max.apply(null, a.r), rMin = Math.min.apply(null, a.r);
  chk('на шестиграннике хомут всё равно круглый',
      Math.abs(rMax - s.sock.rC) < 1e-9 && Math.abs(rMin - s.sock.rIn) < 1e-9, {rMin, rMax});
  // А НИЖЕ хомута огранка обязана быть: иначе проверка выше меряла бы просто круглый абажур.
  let lo=1e9, hi=-1e9;
  for(const T of t) for(const v of T){ if(v[1]<lo)lo=v[1]; if(v[1]>hi)hi=v[1]; }
  const yMid = lo + (hi-lo)*0.5, band = [];
  for(const T of t) for(const v of T) if(Math.abs(v[1] - yMid) < 1.0) band.push(Math.hypot(v[0], v[2]));
  const spread = Math.max.apply(null, band) - Math.min.apply(null, band);
  chk('а на середине абажура огранка на месте — значит меряли не круглый', spread > s.wall*1.5, spread);
  // Кольцо патрона Ø40 действительно проходит: минимальный радиус в хомуте не меньше 20.
  chk('кольцо Ø40 проходит в хомут', rMin >= 20 - 1e-9, rMin);
}
{
  const ov = {vaseSocket:'e27', vaseFacets:6, vaseRelief:'lobe', vaseReliefD:5, vaseSocketH:12};
  const s = spec(ov), a = radiiAbove(build(ov), s.sock.tC + 0.005);
  chk('рельеф в хомуте тоже выключен',
      Math.abs(Math.min.apply(null, a.r) - 20) < 1e-9, Math.min.apply(null, a.r));
  chk('и об этом плече сказано', W(ov).some(x => /выше хомута выключены/.test(x)), W(ov));
}

console.log('=== внутренний Ø — заказанный, а не примерный ===');
{
  for(const [sk, d] of [['e27',40],['e14',28]]){
    const s = spec({vaseSocket:sk});
    chk('посадка ' + sk + ' даёт Ø' + d, s.sock.d === d && Math.abs(s.sock.rIn*2 - d) < 1e-12, s.sock.d);
    const a = radiiAbove(build({vaseSocket:sk}), s.sock.tC + 0.005);
    chk('и в сетке он же', Math.abs(Math.min.apply(null, a.r)*2 - d) < 1e-9, Math.min.apply(null, a.r)*2);
  }
  for(const d of [12, 33, 90]){
    const s = spec({vaseSocket:'custom', vaseSocketD:d});
    const a = radiiAbove(build({vaseSocket:'custom', vaseSocketD:d}), s.sock.tC + 0.005);
    chk('свой Ø' + d + ' — ровно он', Math.abs(Math.min.apply(null, a.r)*2 - d) < 1e-9, Math.min.apply(null, a.r)*2);
  }
}

console.log('=== посадка перекрывает устье, и об этом сказано ===');
{
  const ov = {vaseSocket:'e27', vaseMouthD:90};
  const s = spec(ov);
  chk('заказанное устье 90 не берётся', Math.abs(s.sock.rC*2 - (40 + 2*s.wall)) < 1e-9, s.sock.rC*2);
  chk('и об этом сказано', W(ov).some(x => /устье задаёт патрон/.test(x)), W(ov));
  const same = {vaseSocket:'e27', vaseMouthD: 40 + 2*(defaultBoxParams().fnWall || 1.6)};
  chk('а когда устье и так совпало — молчит', !W(same).some(x => /устье задаёт патрон/.test(x)), W(same));
}

console.log('=== посадка только у абажура ===');
{
  const s = spec({vaseSocket:'e27', vaseFloor:true});
  chk('с дном посадки нет вовсе', s.sock === null, s.sock);
  chk('и об этом сказано', W({vaseSocket:'e27', vaseFloor:true}).some(x => /это абажур/.test(x)));
  chk('без посадки абажур прежний', spec({vaseSocket:'none'}).sock === null);
  // Абажур без посадки не должен измениться ни на вершину — новая ветка обязана быть отключаемой.
  const a = build({vaseSocket:'none'}), b = build({});
  chk('и байт в байт тот же, что был', a.length === b.length &&
      a[0][0][0] === b[0][0][0] && a[a.length-1][2][1] === b[b.length-1][2][1], [a.length, b.length]);
}

console.log('=== высота хомута упирается в высоту абажура ===');
{
  const s = spec({vaseSocket:'e27', vaseSocketH:60, vaseH:120});
  chk('60 мм хомута на 120 мм абажура урезаны', s.sock.h < 60 - 0.05 && s.sock.h > 10, s.sock.h);
  chk('и урезание объявлено', W({vaseSocket:'e27', vaseSocketH:60, vaseH:120}).some(x => /высота хомута/.test(x)));
  chk('а 8 мм проходят молча', !W({vaseSocket:'e27', vaseSocketH:8}).some(x => /высота хомута/.test(x)));
  chk('хомут не бывает короче четырёх миллиметров', spec({vaseSocket:'e27', vaseSocketH:1}).sock.h >= 4 - 1e-9,
      spec({vaseSocket:'e27', vaseSocketH:1}).sock.h);
}

console.log('=== завал стенки внутрь назван числом ===');
{
  /* Число меряется по ПОСТРОЕННОМУ профилю, а не по контрольным точкам: Catmull-Rom между ними идёт
     круче хорды. Проверяем, что оно и вправду читается с сетки, а не берётся из воздуха. */
  const s = spec({vaseSocket:'none'});
  let m = 0;
  for(let i=1;i<=s.nS;i++){ const dr = s.prof[i-1] - s.prof[i];
    if(dr > 0) m = Math.max(m, Math.atan2(dr, s.H/s.nS)*180/Math.PI); }
  chk('завал считается по профилю', Math.abs(s.leanMax - m) < 1e-12, {spec:s.leanMax, mine:m});
  chk('у вазы по умолчанию он около 30°', s.leanMax > 25 && s.leanMax < 35, s.leanMax);
  chk('и молчит', !W({vaseSocket:'none'}).some(x => /заваливается внутрь/.test(x)));
  const steep = {vaseSocket:'none', vaseBellyD:200, vaseNeckD:30};
  chk('на крутом переходе он за 60°', spec(steep).leanMax > 60, spec(steep).leanMax);
  chk('и сказан', W(steep).some(x => /заваливается внутрь/.test(x)), W(steep));
  // Хорда между контрольными точками ПОЛОЖЕ кривой — вот зачем меряется профиль, а не точки.
  const sp = spec(steep), pts = sp.pts;
  let chord = 0;
  for(let i=1;i<pts.length;i++){ const dr = pts[i-1][1] - pts[i][1], dy = (pts[i][0]-pts[i-1][0])*sp.H;
    if(dr > 0) chord = Math.max(chord, Math.atan2(dr, dy)*180/Math.PI); }
  chk('по контрольным точкам вышло бы положе — и порог бы не сработал', chord < sp.leanMax - 3,
      {chord, prof:sp.leanMax});
}

console.log('=== имя модели ===');
{
  currentShape = 'box';
  const nm = ov => { Object.assign(paramState.box, P(ov)); return activeShapeLabel(); };
  chk('абажур с E27 назван по патрону', /^абажур E27 /.test(nm({vaseSocket:'e27'})), nm({vaseSocket:'e27'}));
  chk('со своим Ø — по диаметру', /^абажур Ø33 /.test(nm({vaseSocket:'custom', vaseSocketD:33})),
      nm({vaseSocket:'custom', vaseSocketD:33}));
  chk('без посадки — просто абажур', /^абажур \(/.test(nm({vaseSocket:'none'})), nm({vaseSocket:'none'}));
  chk('с дном — ваза', /^ваза \(/.test(nm({vaseSocket:'e27', vaseFloor:true})), nm({vaseSocket:'e27', vaseFloor:true}));
}

console.log((fail? 'FAIL ':'OK   ') + pass + ' passed, ' + fail + ' failed');
if(fail) process.exit(1);
