// Модульная настенная плитка: рельеф — окно в узор, который живёт на ВСЁМ панно.
//
// Единственное, что здесь по-настоящему проверяемо, — ШОВ. Плитка с красивым рельефом, у которой узор
// на стыке обрывается, строится, герметична и по отдельности безупречна; видно её только когда рядом
// легла соседняя. Поэтому тесты строят ДВЕ соседние плитки и сверяют их края узел в узел, требуя ТОЧНОГО
// совпадения, а не «в пределах допуска»: обе высоты считаются от одной глобальной координаты одним и тем
// же выражением, и любое расхождение означает, что где-то вкралась местная координата.
//
// Второе, что меряется, — тыльная плоскость. Плитка, отцентрованная по СВОЕМУ габариту, встаёт на своей
// высоте: у каждой свой кусок узора, значит свой максимум, значит свой сдвиг. Замерено до починки:
// панно 3×3, «рябь» с волной 220 мм — тыл гулял на 0.858 мм.
// Запускать через ./run-all.sh (extraction test).

let pass=0, fail=0;
function chk(n,c,e){ if(c){pass++;console.log('  OK  ',n);} else {fail++;console.log('  FAIL',n,e!==undefined?JSON.stringify(e):'');} }
function vol(t){let v=0;for(const T of t){const a=T[0],b=T[1],c=T[2];v+=(a[0]*(b[1]*c[2]-b[2]*c[1])-a[1]*(b[0]*c[2]-b[2]*c[0])+a[2]*(b[0]*c[1]-b[1]*c[0]))/6;}return v;}
function base(ov){ logos.length=0; boxHoles.length=0; dieFaces.length=0;
  Object.assign(paramState.box, defaultBoxParams(), {tlMode:'tile', tlPattern:'dunes',
    tlW:100, tlH:100, tlT:3, tlAmp:4, tlScale:60, tlAngle:30, tlNX:3, tlNZ:3, tlIX:0, tlIZ:0,
    tlBorder:0, tlRes:0}, ov||{});
  return buildTrisForShape('box', paramState.box); }
function par(ov){ base(ov); return Object.assign({}, paramState.box); }

/* Верхняя кромка одной стороны: для каждой координаты вдоль кромки — САМАЯ ВЫСОКАЯ вершина. Берётся
   именно максимум: на кромке стоят и верхние узлы, и нижние (стенка), и их не различить по одной оси. */
function edgeProfile(t, axis, side){
  const B = computeBBox(t), a = axis, b = axis === 0 ? 2 : 0;
  const at = side < 0 ? (a === 0 ? B.minX : B.minZ) : (a === 0 ? B.maxX : B.maxZ);
  const m = new Map();
  for(const T of t) for(const v of T){
    if (Math.abs(v[a] - at) > 1e-9) continue;
    const k = v[b].toFixed(6);
    if (!m.has(k) || m.get(k) < v[1]) m.set(k, v[1]);
  }
  return [...m.entries()].map(([k,y]) => [+k, y]).sort((p,q) => p[0]-q[0]);
}
function seamGap(A, B){
  if (A.length !== B.length) return {n:A.length+'/'+B.length, worst:Infinity};
  let worst = 0, offs = 0;
  for(let i=0;i<A.length;i++){ worst = Math.max(worst, Math.abs(A[i][1]-B[i][1]));
    offs = Math.max(offs, Math.abs(A[i][0]-B[i][0])); }
  return {n:A.length, worst, offs};
}

console.log('=== герметичность по всему диапазону ===');
for(const pat of ['dunes','flow','ripple','weave','terrain'])
  for(const ov of [{}, {tlAmp:0}, {tlAmp:20}, {tlBorder:15}]){
    const t=base(Object.assign({tlPattern:pat}, ov)), mc=manifoldCheck(t,4);
    chk('узор '+pat+' '+JSON.stringify(ov)+' watertight (+vol)', mc.watertight&&vol(t)>0,
        {open:mc.openEdges, bad:mc.badEdges});
  }
for(const ov of [{tlW:20,tlH:20},{tlW:300,tlH:300},{tlScale:5},{tlScale:400},{tlAngle:-180},
                 {tlT:1},{tlT:20},{tlRes:0.6},{tlRes:10},{tlIX:15,tlIZ:15},{tlNX:1,tlNZ:1},
                 {tlW:20,tlH:300,tlScale:5}]){
  const t=base(ov), mc=manifoldCheck(t,4);
  chk('крайний случай '+JSON.stringify(ov)+' watertight', mc.watertight&&vol(t)>0, {open:mc.openEdges,bad:mc.badEdges});
}

console.log('=== в сетке нет вырожденных граней ===');
{
  /* Треугольник нулевой площади герметичности НЕ ломает: его рёбра исправно спариваются, и
     `manifoldCheck` молчит. Ломает он то, что дальше — слайсер и запись 3MF такие грани выбрасывают, а
     нормаль у них не определена вовсе. Здесь это не теория: веер дна, построенный из УГЛА, а не из
     середины, даёт по строке вырожденных граней вдоль двух сторон плитки и проходит все остальные
     проверки насквозь. */
  const area = T => { const [a,b,c]=T;
    const u=[b[0]-a[0],b[1]-a[1],b[2]-a[2]], v=[c[0]-a[0],c[1]-a[1],c[2]-a[2]];
    return 0.5*Math.hypot(u[1]*v[2]-u[2]*v[1], u[2]*v[0]-u[0]*v[2], u[0]*v[1]-u[1]*v[0]); };
  for(const ov of [{}, {tlAmp:0}, {tlBorder:15}, {tlW:20,tlH:300}]){
    const t=base(ov); let mn=1e9;
    for(const T of t) mn=Math.min(mn, area(T));
    chk('нет граней нулевой площади '+JSON.stringify(ov), mn > 1e-6, {min:mn});
  }
}

console.log('=== ШОВ: узор через стык не обрывается ===');
for(const pat of ['dunes','flow','ripple','weave','terrain']){
  const a = base({tlPattern:pat, tlIX:0, tlIZ:0}), b = base({tlPattern:pat, tlIX:1, tlIZ:0});
  const g = seamGap(edgeProfile(a,0,+1), edgeProfile(b,0,-1));
  chk(pat+': шов по X точен', g.worst === 0, g);
  const c = base({tlPattern:pat, tlIX:0, tlIZ:1});
  const g2 = seamGap(edgeProfile(a,2,+1), edgeProfile(c,2,-1));
  chk(pat+': шов по Z точен', g2.worst === 0, g2);
}
{
  // И по диагонали — угол плитки принадлежит сразу четырём соседям.
  const t00=base({tlIX:0,tlIZ:0}), t11=base({tlIX:1,tlIZ:1});
  const cornerOf=(t,sx,sz)=>{ const B=computeBBox(t); let best=-1e9;
    for(const T of t) for(const v of T)
      if(Math.abs(v[0]-(sx<0?B.minX:B.maxX))<1e-9 && Math.abs(v[2]-(sz<0?B.minZ:B.maxZ))<1e-9)
        best=Math.max(best,v[1]);
    return best; };
  chk('угол сходится и по диагонали', cornerOf(t00,+1,+1) === cornerOf(t11,-1,-1),
      {a:cornerOf(t00,+1,+1), b:cornerOf(t11,-1,-1)});
}
{
  /* Заявление «координата ГЛОБАЛЬНАЯ» пусто, если соседняя плитка вышла такой же. Длина волны 60 на
     плитке 100 нарочно не кратна: узор не обязан повторяться от плитки к плитке. */
  const a=base({tlIX:0}), b=base({tlIX:1});
  chk('соседняя плитка ДРУГАЯ, а не копия', Math.abs(vol(a)-vol(b)) > 1, {a:+vol(a).toFixed(1), b:+vol(b).toFixed(1)});
  // А при длине волны, кратной плитке, наоборот — обязана совпасть.
  const c=base({tlIX:0,tlScale:50,tlAngle:0}), d=base({tlIX:2,tlScale:50,tlAngle:0});
  chk('при кратной волне плитки повторяются', Math.abs(vol(c)-vol(d)) < 1e-6, {c:+vol(c).toFixed(4), d:+vol(d).toFixed(4)});
}

console.log('=== тыльная плоскость одна на всё панно ===');
for(const cfg of [{tlPattern:'dunes'},{tlPattern:'ripple',tlScale:220},{tlPattern:'terrain',tlScale:120},
                  {tlPattern:'weave',tlScale:150}]){
  let lo=1e9, hi=-1e9;
  for(let ix=0;ix<3;ix++) for(let iz=0;iz<3;iz++){
    const B=computeBBox(base(Object.assign({tlIX:ix,tlIZ:iz,tlNX:3,tlNZ:3}, cfg)));
    lo=Math.min(lo,B.minY); hi=Math.max(hi,B.minY);
  }
  chk('тыл девяти плиток '+JSON.stringify(cfg)+' на одной высоте', hi-lo === 0, +(hi-lo).toFixed(4));
}
{
  const B=computeBBox(base({}));
  chk('и он на −(T+amp)/2', Math.abs(B.minY + (3+4)/2) < 1e-9, B.minY);
  chk('рельеф не выходит за T+amp', B.maxY <= (3+4)/2 + 1e-9, B.maxY);
}

console.log('=== узлы, а не центры ячеек ===');
{
  /* Готовые текстуры приложения считаются в центрах ячеек: u = (x + 0.5)/S. Для бесшовной плитки так
     нельзя — край не попадает в выборку вовсе. Проверяется, что кромка ЕСТЬ в сетке и что узлов на ней
     ровно на один больше, чем ячеек. */
  const s=tileSpec(par({})), t=base({});
  const e=edgeProfile(t,0,+1);
  chk('узлов на кромке = ячеек + 1', e.length === s.M+1, {edge:e.length, M:s.M});
  chk('крайние узлы стоят точно на обрезе', Math.abs(e[0][0] + s.H/2) < 1e-9 &&
      Math.abs(e[e.length-1][0] - s.H/2) < 1e-9, [e[0][0], e[e.length-1][0]]);
}

console.log('=== нормировка аналитическая, а не по плитке ===');
{
  /* Соблазн — растянуть рельеф на полную высоту по минимуму и максимуму ЭТОЙ плитки. Каждая плитка тогда
     красива, а на шве ступенька. Проверяется двояко: узор нигде не выходит за [0,1] (значит нормировка
     верна аналитически) и при этом ДОСТАЕТ до обоих концов на большом поле (значит она не «на всякий
     случай с запасом», и рельеф не потерял половину высоты). */
  for(const pat of ['dunes','flow','ripple','weave','terrain']){
    const s=tileSpec(par({tlPattern:pat, tlScale:60}));
    let mn=1e9, mx=-1e9;
    for(let i=0;i<600;i++) for(let j=0;j<600;j++){
      const f=tilePatternAt(pat, i*1.7, j*1.9, s);
      if(f<mn) mn=f; if(f>mx) mx=f;
    }
    chk(pat+': узор не выходит за [0,1]', mn >= -1e-12 && mx <= 1+1e-12, {mn:+mn.toFixed(6), mx:+mx.toFixed(6)});
    chk(pat+': и достаёт до обоих концов', mn < 0.06 && mx > 0.94, {mn:+mn.toFixed(3), mx:+mx.toFixed(3)});
  }
  // Плитка в «тихом» месте узора обязана быть НИЖЕ соседки в «громком» — если бы нормировали по плитке,
  // обе вышли бы одинаковой высоты.
  const hs=[];
  for(let ix=0;ix<3;ix++) hs.push(computeBBox(base({tlPattern:'ripple',tlScale:220,tlIX:ix,tlIZ:1})).maxY);
  chk('у разных плиток разная высота рельефа', Math.max(...hs)-Math.min(...hs) > 0.3,
      hs.map(v=>+v.toFixed(3)));
}

console.log('=== «рябь» считается от центра ПАННО ===');
{
  /* Центр ряби — центр всего панно, а не плитки. Проверяется симметрией: плитка (0,1) панно 3×3 и
     плитка (2,1) стоят зеркально относительно центра, значит их рельефы обязаны быть зеркальны. */
  const a=base({tlPattern:'ripple',tlScale:150,tlNX:3,tlNZ:3,tlIX:0,tlIZ:1});
  const b=base({tlPattern:'ripple',tlScale:150,tlNX:3,tlNZ:3,tlIX:2,tlIZ:1});
  const ea=edgeProfile(a,2,-1), eb=edgeProfile(b,2,-1);
  let worst=0;
  for(let i=0;i<ea.length;i++) worst=Math.max(worst, Math.abs(ea[i][1]-eb[ea.length-1-i][1]));
  chk('плитки, зеркальные относительно центра панно, зеркальны и рельефом', worst < 1e-9, worst);
  chk('и они не одинаковы (иначе зеркальность ничего не значит)',
      Math.abs(ea[0][1]-ea[ea.length-1][1]) > 0.2, {l:ea[0][1], r:ea[ea.length-1][1]});
}

console.log('=== кайма, размеры, объём ===');
{
  const B=computeBBox(base({}));
  chk('габарит в плане = заданный', Math.abs((B.maxX-B.minX)-100)<1e-9 && Math.abs((B.maxZ-B.minZ)-100)<1e-9,
      {w:B.maxX-B.minX, h:B.maxZ-B.minZ});
  chk('плоская плитка — это плита W·H·T', Math.abs(vol(base({tlAmp:0})) - 100*100*3) < 1e-6,
      vol(base({tlAmp:0})));
  chk('рельеф добавляет материал', vol(base({tlAmp:8})) > vol(base({tlAmp:2})));
  // Кайма: кромка ровно на T, и это видно в сетке.
  const e=edgeProfile(base({tlBorder:15}),0,+1), back=-(3+4)/2;
  chk('с каймой кромка ровно на толщине основания', e.every(([,y]) => Math.abs(y-(back+3))<1e-9),
      e.slice(0,3));
  const e0=edgeProfile(base({tlBorder:0}),0,+1);
  chk('без каймы кромка гуляет вместе с узором',
      Math.max(...e0.map(x=>x[1])) - Math.min(...e0.map(x=>x[1])) > 1, 
      {span:+(Math.max(...e0.map(x=>x[1]))-Math.min(...e0.map(x=>x[1]))).toFixed(2)});
  chk('и с каймой материала меньше', vol(base({tlBorder:15})) < vol(base({tlBorder:0})));
  // Шов остаётся целым и с каймой: обе кромки просто ровные.
  const g=seamGap(edgeProfile(base({tlBorder:15,tlIX:0}),0,+1), edgeProfile(base({tlBorder:15,tlIX:1}),0,-1));
  chk('с каймой шов тоже точен', g.worst === 0, g);
}

console.log('=== сетка считается от ДЛИНЫ ВОЛНЫ ===');
{
  const a=tileSpec(par({tlW:20,tlH:20,tlScale:60})), b=tileSpec(par({tlW:300,tlH:300,tlScale:60}));
  chk('шаг сетки не зависит от размера плитки', Math.abs(a.step-b.step)<1e-12, {a:a.step, b:b.step});
  const c=tileSpec(par({tlScale:20})), d=tileSpec(par({tlScale:200}));
  chk('короткая волна — мельче шаг', c.step < d.step, {c:c.step, d:d.step});
  chk('и узлов на волну не меньше двадцати', 60/tileSpec(par({tlScale:60})).step >= 20 - 1e-9,
      60/tileSpec(par({tlScale:60})).step);
  chk('шаг снизу ограничен', tileSpec(par({tlScale:5})).step >= TILE_MIN_STEP - 1e-12, tileSpec(par({tlScale:5})).step);
  chk('узлов на сторону сверху ограничено', tileSpec(par({tlW:300,tlScale:5})).N <= TILE_MAX_NODES);
  chk('ручной шаг перебивает авто', Math.abs(tileSpec(par({tlRes:1.5})).step-1.5)<1e-12);
}

console.log('=== пределы названы вслух ===');
{
  const wOf=ov=>collectPrintWarnings(par(ov));
  chk('индекс за пределами панно', wOf({tlIX:9,tlNX:3}).some(w=>/не помещается в панно/.test(w)), wOf({tlIX:9,tlNX:3}));
  chk('и он действительно ужат', tileSpec(par({tlIX:9,tlNX:3})).ix === 2, tileSpec(par({tlIX:9,tlNX:3})).ix);
  chk('в пределах — молчит', !wOf({tlIX:2,tlNX:3}).some(w=>/не помещается/.test(w)));
  chk('гранёный узор', wOf({tlScale:5,tlRes:2}).some(w=>/узлов сетки/.test(w)), wOf({tlScale:5,tlRes:2}));
  chk('слишком крутой рельеф', wOf({tlAmp:18,tlScale:20}).some(w=>/склон круче/.test(w)));
  /* «Молчит» — это молчит О ПЛОХОМ. С v25.18.0 плитка всегда печатает строку со своими числами (панно,
     склон, узлы на волну) ровно как пружина печатает жёсткость: это не жалоба, а то, чего на экране нет.
     Строка узнаётся по началу и из счёта исключается — иначе проверка требовала бы от плитки молчания,
     то есть ровно того, из-за чего она и стояла в переписи молчунов. */
  chk('обычная плитка ни на что не жалуется', wOf({}).filter(x => !/^плитка /.test(x)).length === 0, wOf({}));
  chk('  но свои числа называет всегда', wOf({}).some(x => /^плитка /.test(x)), wOf({}));
}

console.log('=== плитка не задевает остальное приложение ===');
{
  const a=vol(base({divX:3, divZ:3, stackFeet:true, scoopDir:'x', labelTab:'front', gripWall:'all'}));
  const b=vol(base({}));
  chk('надстройки органайзера на плитку не лезут', Math.abs(a-b)<1e-9, {a,b});
  const t=base({tlMode:'none'}), B=computeBBox(t);
  chk('«нет» — это обычная коробка', Math.abs((B.maxX-B.minX)-paramState.box.width)<0.6, {w:B.maxX-B.minX});
}

/* ===============================================================================================
   ПЛИТКА НАЗЫВАЕТ ПАННО И СКЛОН (v25.18.0). На экране одна плитка, а печатать их nx×nz — и общий размер
   стены не назывался нигде. Второе число — СКЛОН рельефа: у волны амплитуды amp и длины lam наибольший
   наклон равен π·amp/lam, и это то самое, на чём печать начинает нависать. Меряется он не формулой, а
   по нормалям верхней поверхности построенной плитки. */
console.log('\n=== плитка называет панно и склон ===');
{
  const setP = (ov) => { logos.length=0; boxHoles.length=0; dieFaces.length=0;
    Object.assign(paramState.box, defaultBoxParams(), {tlMode:'tile', tlPattern:'dunes',
      tlW:100, tlH:100, tlT:3, tlAmp:4, tlScale:60, tlAngle:30, tlNX:3, tlNZ:3, tlIX:0, tlIZ:0,
      tlBorder:0, tlRes:0}, ov||{});
    return paramState.box; };
  const warn = (ov) => collectPrintWarnings(setP(ov));
  const line = (ws) => ws.find(x => /^плитка /.test(x));
  const spec = (ov) => tileSpec(setP(ov));
  const mesh = (ov) => { setP(ov); return buildTrisForShape('box', paramState.box); };

  chk('плитка больше не молчит: на умолчаниях есть строка с числами', line(warn({})) !== undefined, warn({}));
  {
    const g = spec({}), b = computeBBox(mesh({}));
    chk('полная высота плитки — основание плюс рельеф',
        Math.abs((b.maxY - b.minY) - (g.T + g.amp)) < 0.05,
        {измерено:+(b.maxY - b.minY).toFixed(2), спец:+(g.T + g.amp).toFixed(2)});
    chk('  и размер плитки тот, что заказан',
        Math.abs((b.maxX - b.minX) - g.W) < 0.05 && Math.abs((b.maxZ - b.minZ) - g.H) < 0.05);
    chk('  панно названо целиком', /всё панно 300×300 мм из 9 штук/.test(line(warn({}))), line(warn({})));
    chk('  и это и правда nx·W на nz·H',
        Math.abs(g.nx*g.W - 300) < 1e-9 && Math.abs(g.nz*g.H - 300) < 1e-9);
  }
  /* СКЛОН МЕРЯЕТСЯ ПО НОРМАЛЯМ, а не повторением формулы. Верхняя поверхность — треугольники, чья
     нормаль смотрит вверх; наибольший её наклон от горизонтали и есть крутизна рельефа. */
  {
    const slopeOf = (ov) => { const t = mesh(ov); let mx = 0;
      for (const T of t){
        const u = [T[1][0]-T[0][0], T[1][1]-T[0][1], T[1][2]-T[0][2]];
        const v = [T[2][0]-T[0][0], T[2][1]-T[0][1], T[2][2]-T[0][2]];
        const n = [u[1]*v[2]-u[2]*v[1], u[2]*v[0]-u[0]*v[2], u[0]*v[1]-u[1]*v[0]];
        const L = Math.hypot(n[0], n[1], n[2]); if (L < 1e-12) continue;
        if (n[1]/L < 0.05) continue;                  // только верх, без боков и низа
        mx = Math.max(mx, Math.acos(Math.min(1, n[1]/L))*180/Math.PI); }
      return mx; };
    const g = spec({});
    const calc = Math.atan(Math.PI*g.amp/g.lam)*180/Math.PI;
    chk('склон рельефа измерен по нормалям и сходится с π·amp/lam',
        Math.abs(slopeOf({}) - calc) < 2.5, {измерено:+slopeOf({}).toFixed(1), расчёт:+calc.toFixed(1)});
    chk('  и назван в строке', new RegExp('склон ' + calc.toFixed(0) + '°').test(line(warn({}))), line(warn({})));
    const steep = {tlAmp:20, tlScale:10};
    chk('  крутой рельеф и правда круче на детали', slopeOf(steep) > 60, +slopeOf(steep).toFixed(1));
    chk('  и назван нависающим', /склон круче 45°/.test(warn(steep).join(' ')), warn(steep));
    chk('  а умолчания пологие и молчат',
        !/склон круче/.test(warn({}).join(' ')) && calc < 45, +calc.toFixed(1));
  }
  {
    const g = spec({});
    chk('узлов на волну — это длина волны, делённая на шаг сетки',
        Math.abs(g.lam/g.step - 30) < 0.5, +(g.lam/g.step).toFixed(1));
    chk('  и число названо', /узлов на волну 30/.test(line(warn({}))), line(warn({})));
    chk('  на грубой сетке приложение жалуется', /гранёным/.test(warn({tlRes:8}).join(' ')), warn({tlRes:8}));
  }
  setP({});
}

console.log('\n'+(fail?'FAILED':'ALL PASSED')+': '+pass+' passed, '+fail+' failed');
if(fail) process.exitCode=1;
