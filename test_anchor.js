// Дюбель по гипсокартону, спиральный (тип «Дрива»).
//
// Что здесь меряется и почему именно это. Прошлая версия строилась, была герметична и проходила
// всё, что тогда проверялось, — и при этом ею нельзя было ПОЛЬЗОВАТЬСЯ: у детали не было шлица, а
// дюбель вкручивают отвёрткой. Проверялась геометрия, а не пригодность, и разница между ними ровно
// в этом файле: почти каждая проверка ниже спрашивает не «построилось ли», а «можно ли этим
// воспользоваться» — есть ли чем вкрутить, есть ли чему врезаться в гипс, останется ли мясо вокруг
// самореза, доходит ли виток до листа.
//
// Отдельно проверяется ОРИЕНТАЦИЯ граней направленными рёбрами. manifoldCheck ключует рёбра
// ненаправленно и вывернутую наизнанку грань не видит вовсе — на литофании такая грань прошла
// проверку герметичности и уронила объём вдвое. У детали, целиком собранной из полос между кольцами,
// это первое, что может пойти не так, и меряться оно должно прямо.
// Запускать через ./run-all.sh (extraction test).

let pass = 0, fail = 0;
function chk(n, c, e){ if(c){ pass++; console.log('  OK  ', n); } else { fail++; console.log('  FAIL', n, e !== undefined ? JSON.stringify(e) : ''); } }

function A(over){ return Object.assign({}, defaultBoxParams(), {threadMode:'anchor'}, over || {}); }
function build(over){ return buildTrisForShape('box', A(over)); }
function bbox(t){ const lo=[1e9,1e9,1e9], hi=[-1e9,-1e9,-1e9];
  for(const T of t) for(const q of T) for(let k=0;k<3;k++){ lo[k]=Math.min(lo[k],q[k]); hi[k]=Math.max(hi[k],q[k]); }
  return {lo,hi}; }
/* Согласованность обхода. В замкнутой сетке без вывернутых граней каждое НАПРАВЛЕННОЕ ребро
   встречается ровно один раз: соседние треугольники проходят общее ребро в разные стороны. Вывернешь
   грань — её рёбра совпадут по направлению с соседскими, и счётчик это назовёт. Ненаправленный счёт,
   которым живёт manifoldCheck, останется при этом идеальным. */
function flippedEdges(tris, dec){
  const K = Math.pow(10, dec || 4);
  const key = q => Math.round(q[0]*K)+'_'+Math.round(q[1]*K)+'_'+Math.round(q[2]*K);
  const seen = new Set(); let dup = 0;
  for (const T of tris){ const v = [key(T[0]), key(T[1]), key(T[2])];
    for (let i=0;i<3;i++){ const e = v[i]+'|'+v[(i+1)%3];
      if (seen.has(e)) dup++; else seen.add(e); } }
  return dup;
}
/* Кольцо вершин на высоте y, по одной на угол, отсортированное по углу. Читается ИМЕННО так, а не
   выборкой по угловому окну: окно на участке, где строк нет (прямое отверстие описано двумя кольцами
   на концах), молча возвращает вершину наружной поверхности, и проверка начинает мерить не то. Здесь
   же видно и сколько вершин нашлось — пусто это пусто, а не «ноль». */
function ringAt(t, y, rMax){
  const by = new Map();
  for (const T of t) for (const q of T){
    if (Math.abs(q[1]-y) > 1e-6) continue;
    const r = Math.hypot(q[0], q[2]); if (rMax != null && r > rMax) continue;
    const a = Math.atan2(q[2], q[0]);
    const k = Math.round(a*1e6);
    if (!by.has(k) || by.get(k).r > r) by.set(k, {a, r});
  }
  return [...by.values()].sort((u,v) => u.a - v.a);
}
// Наименьший радиус среди вершин РЯДОМ с высотой y — чем меряется, есть ли там вообще полость.
function minRNear(t, y, tol){
  let r = Infinity, n = 0;
  for (const T of t) for (const q of T){
    if (Math.abs(q[1]-y) > (tol||0.1)) continue;
    n++; r = Math.min(r, Math.hypot(q[0], q[2]));
  }
  return {r, n};
}

console.log('=== дюбель замкнут и не вывернут ни в одной настройке ===');
for (const [name, over] of [['по умолчанию', {}],
                            ['крест', {anDrive:'pz'}], ['прямой шлиц', {anDrive:'slot'}],
                            ['шестигранник', {anDrive:'hex'}], ['без шлица', {anDrive:'none'}],
                            ['левая навивка', {threadHand:'left'}], ['два захода', {threadStarts:2}],
                            ['без носка', {anTipLen:0}], ['без сужения', {anTaper:1}],
                            ['крупный', {anD:24, anPitch:12, anLen:50, anScrew:6}],
                            ['мелкий', {anD:8, anPitch:3, anLen:12, anScrew:2.5}],
                            ['толстый виток', {anFlight:4}], ['тонкий виток', {anFlight:0.8}],
                            ['толстая головка', {anHeadThk:8, anHeadD:30}]]){
  const t = build(over), mc = manifoldCheck(t, 4);
  chk(name + ' — герметичен', mc.watertight, {open:mc.openEdges, bad:mc.badEdges});
  chk(name + ' — ни одной вывернутой грани', flippedEdges(t, 4) === 0, flippedEdges(t, 4));
  chk(name + ' — объём положительный', meshVolume(t) > 0, meshVolume(t));
}

console.log('\n=== им можно вкрутить: шлиц ===');
{
  /* Главное, чего не было. Шлиц меряется тем, что он ЕСТЬ: сечением полости по углу. У креста должно
     быть четыре широких луча и четыре узких промежутка, у прямого — два луча, у шестигранника шесть
     одинаковых граней. Считать «стало ли меньше объёма» здесь нельзя: убыль объёма одинакова у креста
     и у круглой ямы того же размера, а отвёртка в круглой яме проворачивается. */
  const arms = drive => {
    const p = A({anDrive:drive}), g = anchorSpec(p), t = buildTrisForShape('box', p);
    // Контур шлица — это внутреннее кольцо торца головки: всё, что уже самой головки.
    const ring = ringAt(t, 0, g.rHead - 0.01);
    const rs = ring.map(v => v.r);
    const wide = rs.filter(r => r > g.rBore + 0.3).length;
    return {g, rs, ring, wide, frac: wide/rs.length};
  };
  const pz = arms('pz');
  /* Доля «широких» углов зависит от того, где провести границу широкого, поэтому band тут широкий, а
     решает дело не он, а счёт переходов ниже: лучей ровно четыре. */
  chk('у креста полость шире отверстия на большей части углов, но не везде',
      pz.frac > 0.4 && pz.frac < 0.9, +pz.frac.toFixed(2));
  chk('и доходит до заданного размера', Math.abs(Math.max(...pz.rs) - pz.g.driveD/2) < 0.2,
      {max:+Math.max(...pz.rs).toFixed(2), надо:pz.g.driveD/2});
  const sl = arms('slot');
  chk('у прямого шлица широких углов вдвое меньше, чем у креста', sl.frac < pz.frac*0.75,
      {slot:+sl.frac.toFixed(2), pz:+pz.frac.toFixed(2)});
  const hx = arms('hex');
  chk('у шестигранника полость шире отверстия ВЕЗДЕ — это яма, а не лучи', hx.frac > 0.95, +hx.frac.toFixed(2));
  chk('и его грань лежит между вписанным и описанным радиусом',
      Math.min(...hx.rs) > hx.g.driveD/2*Math.cos(Math.PI/6) - 0.15 &&
      Math.max(...hx.rs) < hx.g.driveD/2 + 0.05,
      {min:+Math.min(...hx.rs).toFixed(2), max:+Math.max(...hx.rs).toFixed(2)});
  /* Радиусы восьмигранника легли бы в тот же коридор — вписанный у него всего на 7 % шире, — поэтому
     число граней считается прямо: сколько раз радиус проходит через локальный минимум по кругу.
     Отвёртке важно именно это число, а не то, в каких пределах гуляет радиус. */
  /* Число граней. Считать локальные минимумы на дискретном кольце ненадёжно — минимум попадает между
     отсчётами и площадка съедает его, — а вот ОТНОШЕНИЕ описанного радиуса к вписанному зависит только
     от числа граней: у шестиугольника 1/cos30° = 1,155, у восьмиугольника 1,082, и коридоры не
     пересекаются. Радиусы по отдельности их не различают: у восьмиугольника вписанный шире всего на 7 %,
     и он ложится в тот же коридор. */
  chk('граней у него шесть, а не восемь: отношение радиусов шестиугольное',
      Math.abs(Math.max(...hx.rs)/Math.min(...hx.rs) - 1/Math.cos(Math.PI/6)) < 0.03,
      +(Math.max(...hx.rs)/Math.min(...hx.rs)).toFixed(4));
  const no = arms('none');
  chk('без шлица полость всюду ровно отверстие под саморез',
      no.wide === 0 && Math.abs(Math.max(...no.rs) - no.g.rBore) < 1e-6, {wide:no.wide});
}
{ // симметрия шлицев: у креста четыре луча, у прямого два, у шестигранника лучей нет вовсе
  const turns = drive => {
    const p = A({anDrive:drive}), g = anchorSpec(p), t = buildTrisForShape('box', p);
    const ring = ringAt(t, 0, g.rHead - 0.01);
    let flips = 0;
    for (let k = 0; k < ring.length; k++){
      const a = ring[k].r > g.rBore + 0.3, b = ring[(k+1)%ring.length].r > g.rBore + 0.3;
      if (a !== b) flips++;
    }
    return {flips, n:ring.length};
  };
  const pz = turns('pz'), sl = turns('slot'), hx = turns('hex');
  chk('крест — четыре луча: восемь переходов по кругу', pz.flips === 8, pz);
  chk('прямой шлиц — два луча: четыре перехода', sl.flips === 4, sl);
  chk('у шестигранника переходов нет — он всюду шире отверстия', hx.flips === 0, hx);
}
{ // шлиц живёт в головке и кончается: ниже него полость обязана стать круглым отверстием
  const p = A({anDrive:'pz'}), g = anchorSpec(p), t = buildTrisForShape('box', p);
  const floor = ringAt(t, g.driveDepth, g.rHead - 0.01);
  chk('дно шлица — это кольцо', floor.length > 40, floor.length);
  const rs = floor.map(v => v.r);
  chk('и ниже него полость всюду ровно отверстие под саморез',
      Math.abs(Math.min(...rs) - g.rBore) < 1e-9 && Math.abs(Math.max(...rs) - g.rBore) < 1e-9,
      {min:Math.min(...rs), max:Math.max(...rs), надо:g.rBore});
  /* Шлиц ПОДЖИМАЕТСЯ к дну — так сделан и настоящий PZ, и так остаётся стенка между лучами креста и
     конусом головки, который к этой глубине уже сузился. */
  /* Высота берётся ПО СТАНЦИИ сетки (5/6 глубины), а не «примерно у дна»: между станциями вершин нет,
     кольцо выходит пустым, максимум пустого множества это −∞, и сравнение проходит само собой. Первая
     редакция так и прошла — вместе с мутантом, который поджатие вовсе отменял. Поэтому непустота
     кольца здесь проверяется отдельной строкой, а не подразумевается. */
  const mouth = ringAt(t, 0, g.rHead - 0.01), deep = ringAt(t, g.driveDepth*5/6, g.rHead - 0.01);
  chk('оба кольца шлица непусты — есть что сравнивать', mouth.length > 40 && deep.length > 40,
      {устье:mouth.length, глубже:deep.length});
  const rMouth = Math.max(...mouth.map(v => v.r)), rDeep = Math.max(...deep.map(v => v.r));
  chk('шлиц к дну поджимается, а не идёт отвесной шахтой',
      deep.length > 40 && rDeep < rMouth - 0.3, {устье:+rMouth.toFixed(2), глубже:+rDeep.toFixed(2)});
}
{ /* Полость нигде не уже отверстия под саморез. Поджатие шлица к дну само по себе загнало бы узкое
     место между лучами креста внутрь отверстия, и саморез упёрся бы в оставшиеся там гребни. */
  for (const d of ['pz','slot','hex']){
    const p = A({anDrive:d}), g = anchorSpec(p), t = buildTrisForShape('box', p);
    let minR = Infinity, n = 0;
    for (let j = 0; j <= 10; j++){
      const y = g.driveDepth*j/10, ring = ringAt(t, y, g.rHead - 0.01);
      for (const v of ring){ n++; minR = Math.min(minR, v.r); }
    }
    chk('полость шлица «' + d + '» нигде не уже отверстия под саморез',
        n > 100 && minR >= g.rBore - 1e-9, {minR:+minR.toFixed(3), rBore:g.rBore, n});
  }
}

console.log('\n=== ему есть чем врезаться: виток ===');
{
  /* Виток обязан быть ТОНКОЙ ВЫСОКОЙ лентой на тонком сердечнике — этим он режет гипс. Прошлая версия
     несла крепёжный профиль, который заполняет свой шаг: гребень шириной в половину шага и впадина той
     же ширины.

     Меряется вдоль Y при ЗАФИКСИРОВАННОМ угле — то есть по той оси, вдоль которой профиль и определён.
     Первая редакция сканировала по углу на одной высоте и мерила не то: ширина сектора, в котором на
     одной строке материал доходит до радиуса витка, зависит от того, как строка режет винтовую линию,
     а не от толщины ленты. Подмена профиля на крепёжный ту проверку не роняла вовсе. */
  const p = A({}), g = anchorSpec(p), t = buildTrisForShape('box', p);
  const rMid = (g.rCore + g.rFl)/2;
  const col = 7, ang = 2*Math.PI*col/g.cols;               // одна угловая колонка сетки
  const yA = g.headThk + 1, yB = g.headThk + g.len - g.tipLen - 1;
  const pts = [];
  for (const T of t) for (const q of T){
    if (q[1] < yA || q[1] > yB) continue;
    const a = Math.atan2(q[2], q[0]); let d = Math.abs(a-ang); if (d > Math.PI) d = 2*Math.PI-d;
    if (d < 1e-4) pts.push([q[1], Math.hypot(q[0], q[2])]);
  }
  pts.sort((u,v) => u[0]-v[0]);
  const wide = pts.filter(v => v[1] > rMid).length;
  const frac = wide/pts.length;
  chk('вдоль оси виток занимает лишь малую долю шага — это лента, а не гребень',
      pts.length > 200 && frac < 0.35, {доля:+frac.toFixed(3), n:pts.length});
  chk('и эта доля — толщина витка в долях шага', Math.abs(frac - g.duty) < 0.08,
      {измерено:+frac.toFixed(3), duty:+g.duty.toFixed(3)});
  // и по этой же колонке видно, что виток ПОВТОРЯЕТСЯ с заданным шагом
  const tops = [];
  for (let k = 1; k+1 < pts.length; k++)
    if (pts[k][1] > rMid && pts[k-1][1] <= rMid) tops.push(pts[k][0]);
  chk('виток повторяется ровно с заданным шагом',
      tops.length >= 2 && Math.abs((tops[1]-tops[0]) - g.pitch) < g.dy*2,
      {промежуток:+(tops.length>1 ? tops[1]-tops[0] : 0).toFixed(2), pitch:g.pitch});
}
{
  /* Кромка витка обязана быть ВИНТОВОЙ ЛИНИЕЙ, а не лестницей. Мерить это «высотой кромки по
     колонкам» нельзя: за оборот кромка поднимается ровно на шаг, так что любое окно по высоте её
     обрезает и показывает ступени там, где их нет, — на этом первая редакция и села.

     Меряется ФАЗА: у точки на кромке y/pitch − starts·(колонка/cols) одинаково по всему обороту, это и
     значит «винтовая линия». Разброс фазы по колонкам — та самая ступенька, выраженная в миллиметрах,
     и он обязан укладываться в одну строку сетки. Сделай строку грубее подъёма кромки — и он вырастет
     во столько раз, во сколько строка грубее. */
  const rimStep = over => {
    const p = A(over), g = anchorSpec(p), t = buildTrisForShape('box', p);
    const rMid = (g.rCore + g.rFl)/2;
    const hand = (p.threadHand === 'left') ? -1 : 1;
    /* Окно ЕДЕТ ВМЕСТЕ С ВИТКОМ: центр окна для колонки c поднят на rise·c, как и сама кромка.
       Неподвижное окно тут не годится ни в каком виде — за оборот кромка уходит ровно на шаг, у любой
       границы её срезает, и срез читается как площадка. На этом сели две предыдущие редакции этой
       проверки, причём на ПРАВИЛЬНОЙ сетке площадка выходила длиннее, чем на грубой. */
    const yM = g.headThk + (g.len - g.tipLen)/2;
    const byCol = new Map();                     // колонка → все высоты кромки в ней
    for (const T of t) for (const q of T){
      const r = Math.hypot(q[0], q[2]); if (r <= rMid) continue;
      const c = Math.round((Math.atan2(q[2], q[0])/(2*Math.PI) + 1)*g.cols) % g.cols;
      if (!byCol.has(c)) byCol.set(c, []); byCol.get(c).push(q[1]);
    }
    /* Кромка ПРОСЛЕЖИВАЕТСЯ от колонки к колонке, а не ищется в окне вокруг заранее посчитанной
       высоты: где именно виток начинается по фазе, заранее неизвестно, и окно вокруг середины тела
       промахивалось мимо него целиком при неудачном шаге. Тут же берётся ближайший к предыдущему
       положению верх витка — и попадание не зависит от фазы вовсе. */
    const top = new Map();
    let cur = null;
    for (const y of (byCol.get(0) || [])) if (y < yM + g.pitch/2 && y > yM - g.pitch/2)
      cur = (cur === null || y > cur) ? y : cur;
    if (cur !== null){ top.set(0, cur);
      for (let c = 1; c < g.cols; c++){
        const ys = (byCol.get(c) || []).filter(y => Math.abs(y - cur - hand*g.rise) < g.pitch/2);
        if (!ys.length) break;
        cur = Math.max(...ys); top.set(c, cur);
      } }
    /* Меряется ДЛИНА ПЛОЩАДКИ: сколько соседних колонок кромка простояла на одной высоте. Это и есть
       ступенька — ровно то, что видно на детали. Отклонение шага от подъёма для этого не годится: при
       грубой сетке шаг равен строке, а строка тогда во столько же раз больше подъёма, и любой допуск,
       заданный через строку, растёт вместе с дефектом. */
    let run = 0, worst = 0, n = 0;
    for (let c = 0; c + 1 < g.cols; c++){
      if (!top.has(c) || !top.has(c+1)) continue;
      const d = top.get(c+1) - top.get(c);
      // на витке, уходящем за верхнюю границу тела, максимум скачком возвращается на шаг ниже —
      // это не ступенька кромки, а конец витка, и такие переходы пропускаются
      if (Math.abs(d) > g.pitch/2){ run = 0; continue; }   // конец витка, а не ступенька
      n++;
      if (Math.abs(d) < g.rise/2){ run++; worst = Math.max(worst, run); } else run = 0;
    }
    return {worst, n, g};
  };
  // тело обязано быть длиннее одного оборота кромки, иначе едущее окно уезжает за носок
  for (const over of [{}, {anPitch:12, anLen:50}, {anD:24}, {anD:8, anPitch:4}, {threadHand:'left'}]){
    const r = rimStep(over);
    chk('кромка витка идёт наклонно, а не ступенями (' + JSON.stringify(over) + ')',
        r.n > 40 && r.worst <= 1,
        {площадка:r.worst, строка:+r.g.dy.toFixed(4), подъём:+r.g.rise.toFixed(4), колонок:r.n});
  }
}
{ /* Число заходов входит в подъём кромки, а значит и в потребную плотность: два захода поднимают
     кромку за колонку вдвое быстрее, и строк нужно вдвое МЕНЬШЕ. Забудь про заходы в формуле подъёма —
     и двухзаходный дюбель выйдет вдвое тяжелее без всякой пользы. Сверять спецификацию с её же
     формулой бессмысленно (она останется согласованной), поэтому сверяются два РАЗНЫХ дюбеля. */
  const one = anchorSpec(A({threadStarts:1})), two = anchorSpec(A({threadStarts:2}));
  chk('два захода требуют вдвое меньше строк, чем один',
      Math.abs(two.rows - one.rows/2) <= 2, {один:one.rows, два:two.rows});
  chk('и подъём кромки у них отличается вдвое',
      Math.abs(two.rise - one.rise*2) < 1e-9, {один:one.rise, два:two.rise});
}
{ // виток обязан РАСТВОРЯТЬСЯ на носке вместе с сердечником, иначе на конусе остаётся кольцевой обрыв
  const p = A({}), g = anchorSpec(p), t = buildTrisForShape('box', p);
  const yTop = g.headThk + g.len, yTip0 = yTop - g.tipLen;
  const at = y => { let r = 0, n = 0;
    for (const T of t) for (const q of T) if (Math.abs(q[1]-y) < 0.1){ n++; r = Math.max(r, Math.hypot(q[0], q[2])); }
    return {r, n}; };
  const a = at(yTip0 + g.tipLen*0.25), b = at(yTip0 + g.tipLen*0.6), c = at(yTip0 + g.tipLen*0.9);
  chk('на носке радиус убывает монотонно — виток тает вместе с конусом',
      a.n > 10 && a.r > b.r && b.r > c.r, {r:[+a.r.toFixed(2), +b.r.toFixed(2), +c.r.toFixed(2)]});
  chk('и у самого острия от витка не остаётся ничего', c.r < g.rCore*0.6, {r:+c.r.toFixed(2), rCore:g.rCore});
}
{ // виток обязан ДОХОДИТЬ до заданного Ø и сужаться к носку, иначе он не заходит в лист постепенно
  const p = A({}), g = anchorSpec(p), t = buildTrisForShape('box', p);
  const b = bbox(t);
  chk('габарит по ширине — это Ø головки, самой широкой части',
      Math.abs((b.hi[0]-b.lo[0]) - 2*g.rHead) < 0.05, b.hi[0]-b.lo[0]);
  let rTop = 0, rBot = 0;
  const yTip0 = g.headThk + g.len - g.tipLen;
  for (const T of t) for (const q of T){ const r = Math.hypot(q[0], q[2]);
    if (q[1] > g.headThk + 0.5 && q[1] < g.headThk + 3) rBot = Math.max(rBot, r);
    if (q[1] > yTip0 - 3 && q[1] < yTip0 - 0.5) rTop = Math.max(rTop, r); }
  chk('у головки виток доходит до заданного Ø', Math.abs(rBot - g.rFl) < 0.1, {rBot, надо:g.rFl});
  chk('а к носку сужается', rTop < rBot - 0.5, {rTop:+rTop.toFixed(2), rBot:+rBot.toFixed(2)});
  chk('ровно в заданную долю', Math.abs(rTop/rBot - (1 - (1-g.taper)*(g.len-g.tipLen)/g.len)) < 0.05,
      {измерено:+(rTop/rBot).toFixed(3)});
}
{ // сужение выключается, и тогда виток идёт цилиндром
  const g = anchorSpec(A({anTaper:1})), t = build({anTaper:1});
  let rTop = 0, rBot = 0;
  const yTip0 = g.headThk + g.len - g.tipLen;
  for (const T of t) for (const q of T){ const r = Math.hypot(q[0], q[2]);
    if (q[1] > g.headThk + 0.5 && q[1] < g.headThk + 3) rBot = Math.max(rBot, r);
    if (q[1] > yTip0 - 3 && q[1] < yTip0 - 0.5) rTop = Math.max(rTop, r); }
  chk('без сужения виток одного радиуса по всей длине', Math.abs(rTop - rBot) < 0.05, {rTop, rBot});
}
{ /* Пила на кромке. Кромка витка — винтовая линия, и пока строки по высоте реже её подъёма за одну
     угловую колонку, она ложится ступеньками во всю строку. Проверяется само правило: шаг строки не
     больше подъёма кромки. Это не украшательство — зубец во всю строку это 0,24 мм, слой печати. */
  for (const over of [{}, {anPitch:3}, {anPitch:15}, {anD:24}, {anD:8}, {threadStarts:2}]){
    const g = anchorSpec(A(over));
    chk('строка не грубее подъёма кромки за колонку (' + JSON.stringify(over) + ')',
        g.dy <= g.rise + 1e-9, {dy:+g.dy.toFixed(4), rise:+g.rise.toFixed(4)});
  }
}

console.log('\n=== вокруг самореза остаётся мясо, а носок сплошной ===');
{
  const g = anchorSpec(A({}));
  chk('отверстие уже самореза — резьбе есть во что врезаться', 2*g.rBore < g.screw - 0.5, {bore:2*g.rBore, screw:g.screw});
  chk('и стенка вокруг него не тоньше 0,9 мм', g.wall >= 0.9 - 1e-9, g.wall);
  for (const s of [2.5, 4, 6, 8]){
    const q = anchorSpec(A({anScrew:s}));
    chk('стенка держится и при саморезе Ø' + s, q.wall >= 0.9 - 1e-9, +q.wall.toFixed(2));
  }
}
{
  /* Отверстие СЛЕПОЕ. Сквозное превратило бы остриё в трубку, которая сминается о лист вместо того,
     чтобы его проколоть. Меряется тем, что у самого носка полости нет: ни одной вершины на малом
     радиусе выше потолка отверстия, кроме самой вершины острия. */
  const p = A({}), g = anchorSpec(p), t = buildTrisForShape('box', p);
  const yTop = g.headThk + g.len, yTip0 = yTop - g.tipLen;
  // Потолок отверстия: единственная вершина на оси НИЖЕ острия. Их ровно две на всю деталь.
  const axis = [];
  for (const T of t) for (const q of T) if (Math.hypot(q[0], q[2]) < 1e-9) axis.push(+q[1].toFixed(4));
  const ys = [...new Set(axis)].sort((a,b)=>a-b);
  chk('на оси ровно две точки: потолок отверстия и остриё', ys.length === 2, ys);
  chk('потолок отверстия заметно ниже острия', ys[1] - ys[0] > 1, {потолок:ys[0], остриё:ys[1]});
  chk('и он там, где его посчитала спецификация', ys[1] === +yTop.toFixed(4), {ys, yTop});
  /* А выше потолка носок СПЛОШНОЙ. По вершинам это не меряется ни с какой стороны: наружный конус
     носка сам сходится к нулю и по дороге проходит ровно через радиус отверстия, так что «вершины на
     радиусе rBore» есть и у сплошного. Меряется тем, что спрашивается, — ЛУЧОМ: вертикаль, идущая
     внутри отверстия, обязана пересечь поверхность дважды (потолок отверстия и склон носка). У
     сквозного дюбеля она не пересечёт её ни разу — потому оно и сквозное. */
  const crossings = (x, z) => {
    const ys2 = [];
    for (const T of t){
      const [Aa,Bb,Cc] = T;
      // барицентрическая проверка попадания (x,z) в проекцию треугольника на XZ
      const d = (Bb[2]-Cc[2])*(Aa[0]-Cc[0]) + (Cc[0]-Bb[0])*(Aa[2]-Cc[2]);
      if (Math.abs(d) < 1e-12) continue;
      const a = ((Bb[2]-Cc[2])*(x-Cc[0]) + (Cc[0]-Bb[0])*(z-Cc[2]))/d;
      const b = ((Cc[2]-Aa[2])*(x-Cc[0]) + (Aa[0]-Cc[0])*(z-Cc[2]))/d;
      const c = 1-a-b;
      if (a < 1e-9 || b < 1e-9 || c < 1e-9) continue;
      ys2.push(a*Aa[1] + b*Bb[1] + c*Cc[1]);
    }
    return ys2.sort((u,v)=>u-v);
  };
  const cr = crossings(0.5, 0.13);
  chk('вертикаль внутри отверстия пересекает поверхность ровно дважды — носок сплошной', cr.length === 2,
      cr.map(v=>+v.toFixed(2)));
  chk('и первое пересечение — это потолок отверстия',
      cr.length === 2 && Math.abs(cr[0] - ys[0]) < 1e-6, {первое:cr[0], потолок:ys[0]});
  // а сам потолок — кольцо ровно по отверстию, иначе предыдущая проверка прошла бы и на глухой детали
  const ceil = ringAt(t, ys[0], g.rCore);
  chk('потолок отверстия — кольцо радиусом с сердечник самореза',
      ceil.length > 40 && Math.abs(Math.max(...ceil.map(v=>v.r)) - g.rBore) < 1e-9,
      {n:ceil.length, r:ceil.length ? Math.max(...ceil.map(v=>v.r)) : null, надо:g.rBore});
}
{ // головка шире витка: ей есть на что опереться на поверхности листа
  const g = anchorSpec(A({})), t = build({});
  chk('головка шире витка', g.rHead > g.rFl, {rHead:g.rHead, rFl:g.rFl});
  chk('и торцом лежит на нуле — на неё и ставится деталь при печати',
      Math.abs(bbox(t).lo[1]) < 1e-9, bbox(t).lo[1]);
  /* Головка ПОТАЙНАЯ: широкой стороной она садится на поверхность листа, то есть на y = 0, и сужается
     внутрь. Габарит этого не показывает — вывернутый конус даёт тот же габарит, просто своим широким
     концом вверх; поэтому меряется радиус ИМЕННО на опорном торце. */
  const widest = y => { let r = 0, n = 0;
    for (const T of t) for (const q of T) if (Math.abs(q[1]-y) < 1e-9){ n++; r = Math.max(r, Math.hypot(q[0], q[2])); }
    return {r, n}; };
  const seat = widest(0), neck = widest(g.headThk);
  chk('на опорном торце головка самая широкая', seat.n > 40 && Math.abs(seat.r - g.rHead) < 1e-9, seat);
  chk('и к телу сужается, а не расширяется', neck.r < g.rHead - 0.5,
      {уШейки:+neck.r.toFixed(2), уТорца:g.rHead});
}

console.log('\n=== настройки, которые нельзя задать бессмысленно ===');
{
  const s = anchorSpec(A({anCore:100}));
  chk('сердечник не может быть толще витка', s.rCore <= s.rFl - 0.8 + 1e-9, s.rCore);
  const s2 = anchorSpec(A({anFlight:99}));
  chk('виток не может быть толще половины шага', s2.flight <= s2.pitch*0.5 + 1e-9, s2.flight);
  const s3 = anchorSpec(A({anDriveD:99}));
  chk('шлиц не может съесть головку целиком', s3.driveD <= 2*s3.rHead - 2.4 + 1e-9, s3.driveD);
  const s4 = anchorSpec(A({anDriveDepth:99}));
  chk('шлиц не может пройти головку насквозь', s4.driveDepth <= s4.headThk*0.85 + 1e-9, s4.driveDepth);
  const s5 = anchorSpec(A({anTipLen:99}));
  chk('носок не может съесть тело целиком', s5.tipLen <= s5.len*0.6 + 1e-9, s5.tipLen);
  const s6 = anchorSpec(A({anHeadD:1}));
  chk('головка не может быть уже витка', s6.rHead >= s6.rFl + 0.5 - 1e-9, s6.rHead);
  chk('незнакомый шлиц — это крест, а не отсутствие шлица', anchorSpec(A({anDrive:'звёздочка'})).drive === 'pz');
  chk('спецификация не падает на пустых параметрах', !!anchorSpec({}) && anchorSpec({}).D > 0);
}

console.log('\n=== приложение говорит вслух то, чем деталь плоха ===');
{
  const W = over => collectPrintWarnings(A(over));
  /* Ищется КОНКРЕТНАЯ жалоба, а не любая со словом «шлиц» или «удлините». Пока проверка ловила
     что угодно похожее, снятие нужного предупреждения проходило незамеченным: вместо него срабатывало
     соседнее, и слово в тексте находилось. Проверка, которая довольна чужим ответом, ничего не стоит. */
  chk('без шлица — предупреждает, что вкрутить нечем',
      W({anDrive:'none'}).some(x => /без шлица/i.test(x)), W({anDrive:'none'}));
  chk('а со шлицем — молчит', !W({}).some(x => /вкрутить/i.test(x)), W({}));
  chk('короткое тело в толстом листе — предупреждает именно про то, что в листе мало витка',
      W({anLen:10, anBoard:25}).some(x => /в листе .* сидит/i.test(x)), W({anLen:10, anBoard:25}));
  chk('крупный шаг на коротком теле — мало витков',
      W({anLen:12, anPitch:15}).some(x => /витков всего/i.test(x)), W({anLen:12, anPitch:15}));
  chk('головка вровень с витком — не на что опереться',
      W({anHeadD:13}).some(x => /опереться/i.test(x)), W({anHeadD:13}));
  chk('на настройках по умолчанию не ругается ни на что',
      W({}).length === 0, W({}));
}

console.log('\n=== дюбель есть в панели: строка, разновидность, справка ===');
{
  const rows = SHAPE_PARAMS.box.filter(r => r.group === 'Дюбель по гипсокартону (спиральный)' || r.group === 'Дюбель по гипсокартону (складной)');
  chk('у каждой разновидности своя группа параметров', rows.length >= 20, rows.length);
  chk('и у каждой строки человеческое имя', rows.every(r => r.label && r.label.length > 3));
  /* Группа обслуживает ОБЕ разновидности дюбеля, и каждая строка обязана назвать свою. Строка без
     пометки показалась бы на обеих и на одной из них была бы холостым ходом. */
  chk('каждая строка группы названа своей разновидностью',
      rows.every(r => r.w && r.w.length && r.w.every(v => v === 'anchor' || v === 'anchorfold')),
      rows.filter(r => !r.w || !r.w.length || r.w.some(v => v !== 'anchor' && v !== 'anchorfold')).map(r => r.key));
  chk('и у обеих разновидностей есть свои строки',
      rows.some(r => r.w.indexOf('anchor') >= 0) && rows.some(r => r.w.indexOf('anchorfold') >= 0));
  chk('группа видна на резьбе и только на ней',
      sectionRelevant('Дюбель по гипсокартону (спиральный)', 'thread', false) === true &&
      sectionRelevant('Дюбель по гипсокартону (складной)', 'thread', false) === true &&
      sectionRelevant('Дюбель по гипсокартону (спиральный)', 'box', false) === false);
  chk('и лежит на вкладке «Форма»', GROUP_TAB['Дюбель по гипсокартону (спиральный)'] === 'form' && GROUP_TAB['Дюбель по гипсокартону (складной)'] === 'form');
  chk('и знает свою форму', GROUP_KIND['Дюбель по гипсокартону (спиральный)'] === 'thread' && GROUP_KIND['Дюбель по гипсокартону (складной)'] === 'thread');
  /* Строки группы обязаны показываться на дюбеле и прятаться на остальной резьбе — иначе получится
     второй раздел с параметрами, до которых не дотянуться. Ровно этим был сломан AMS на подставке. */
  for (const r of rows){
    // каждая строка видна на СВОЕЙ разновидности и спрятана на чужой резьбе
    const own = r.w[0];
    chk('«' + r.key + '» видна на своей разновидности', paramRowRelevant(r, A({threadMode:own})) || !!r.only, r.key);
    chk('«' + r.key + '» скрыта на крышке', !paramRowRelevant(r, A({threadMode:'cap'})), r.key);
  }
  /* Строки одной разновидности не должны показываться на другой: обе живут в ОДНОЙ группе, и стоит
     забыть пометку — на спиральном дюбеле появятся ползунки складного, которые ни на что не влияют. */
  for (const r of rows){
    if (r.w.length !== 1) continue;
    const other = r.w[0] === 'anchor' ? 'anchorfold' : 'anchor';
    chk('«' + r.key + '» не показывается на другой разновидности',
        !paramRowRelevant(r, A({threadMode:other})), {key:r.key, other});
  }
  const size = SHAPE_PARAMS.box.find(x => x.key === 'anD');
  chk('Ø по виткам по умолчанию дюбельный, а не Ø30 от крепёжной резьбы', size.default === 13, size.default);
  const drv = SHAPE_PARAMS.box.find(x => x.key === 'anDrive');
  chk('шлиц по умолчанию есть', drv.default === 'pz', drv.default);
  chk('и предлагается четырьмя вариантами', drv.options.length === 4, drv.options.length);
  const dd = SHAPE_PARAMS.box.find(x => x.key === 'anDriveD');
  chk('размер шлица прячется, когда шлица нет', !paramRowRelevant(dd, A({anDrive:'none'})));
  chk('и показан, когда есть', paramRowRelevant(dd, A({anDrive:'pz'})));
  /* Общие резьбовые строки дюбелю больше не адресованы: пока threadD стоял в его списке, ползунок
     «Резьба: номинальный Ø» был на панели и ни на что не влиял — молчаливый холостой ход. */
  for (const key of ['threadD','threadPitch','threadLen','threadDepth','threadFlange','threadBore']){
    const row = SHAPE_PARAMS.box.find(x => x.key === key);
    chk('общая строка «' + key + '» на дюбеле скрыта', !paramRowRelevant(row, A({})), key);
  }
  const h = MODEL_HELP['thread:anchor'];
  chk('справка есть', !!h && !!h.what && !!h.how);
  chk('и говорит, какой стороной ставить', /головкой|остри/i.test(h.how), h.how);
  chk('и что PLA здесь не годится', /PLA/.test(h.how), h.how);
  Object.assign(paramState.box, A({}));
  chk('имя детали в сводке — дюбель', /дюбель/i.test(activeShapeLabel()), activeShapeLabel());
}

console.log('\n=== складной дюбель: замкнут и не вывернут ===');
function F(over){ return Object.assign({}, defaultBoxParams(), {threadMode:'anchorfold'}, over || {}); }
for (const [name, over] of [['по умолчанию', {}],
                            ['узкое отверстие', {afHole:6, afScrew:2.5}],
                            ['широкое', {afHole:24, afLegW:16, afScrew:8}],
                            ['тонкая полоса', {afLegT:0.6}], ['толстая полоса', {afLegT:3}],
                            ['большой выгиб', {afBow:4}], ['малый выгиб', {afBow:0.2}],
                            ['короткая часть', {afLen:10}], ['длинная', {afLen:60}],
                            ['толстый фланец', {afHeadThk:8, afHeadD:40}],
                            ['высокий блок', {afBlock:20}], ['узкий блок', {afBlock:2}]]){
  const t = buildTrisForShape('box', F(over)), mc = manifoldCheck(t, 4);
  chk('складной, ' + name + ' — герметичен', mc.watertight, {open:mc.openEdges, bad:mc.badEdges});
  chk('складной, ' + name + ' — ни одной вывернутой грани', flippedEdges(t, 4) === 0, flippedEdges(t, 4));
  chk('складной, ' + name + ' — объём положительный', meshVolume(t) > 0, meshVolume(t));
}

console.log('\n=== складной: он пролезает в своё отверстие ===');
{
  /* Габарит сложенного тела определяется УГЛОМ сечения полосы — он на диагонали, и по одному вылету
     его не видно. Пока считался вылет, полоса шириной 6 на отверстии Ø10 давала тело Ø11,24: дюбель,
     который не лезет в собственное отверстие, и при этом безупречно герметичный, с габаритом по X
     ровно 9,5, как и заказано. Меряется по ГОТОВОЙ сетке, а не по спецификации. */
  for (const over of [{}, {afHole:6, afScrew:2.5}, {afHole:24, afLegW:16, afScrew:8},
                      {afLegW:20}, {afBow:4}, {afLegT:0.6}]){
    const p = F(over), g = anchorFoldSpec(p), t = buildTrisForShape('box', p);
    let mx = 0;
    for (const T of t) for (const q of T) if (q[1] > g.headThk + 0.01) mx = Math.max(mx, Math.hypot(q[0], q[2]));
    /* «Не больше отверстия» мало: тело, равное отверстию впритык, в него не войдёт — нужен ЗАЗОР.
       Пока проверялось «≤ Ø», снятие зазора проходило незамеченным. Сам зазор объявлен в
       спецификации и проверяется отдельно ниже; здесь — что деталь строго меньше отверстия. */
    chk('сложенное тело строго меньше отверстия (' + JSON.stringify(over) + ')',
        2*mx < g.hole - 0.15, {тело:+(2*mx).toFixed(2), отверстие:g.hole, зазор:+(g.hole-2*mx).toFixed(2)});
    /* Спецификация обязана быть ВЕРХНЕЙ оценкой, и тесной. Точного равенства тут быть не может:
       протяжка дискретна, вершина выгиба приходится между станциями, и сетка законно недобирает
       микроны. Недобор безопасен — деталь выходит чуть меньше заявленного, — а вот перебор означал бы,
       что предупреждение «пролезет» врёт. */
    chk('спецификация — тесная верхняя оценка габарита (' + JSON.stringify(over) + ')',
        2*mx <= g.bodyD + 1e-9 && g.bodyD - 2*mx < 0.01,
        {сетка:+(2*mx).toFixed(5), спека:+g.bodyD.toFixed(5)});
  }
}
{ /* Посадочный радиус объявлен УЖЕ отверстия на настоящий зазор — иначе деталь «влезает» только на
     бумаге. Проверяется прямо, а не через габарит: габарит на тесных настройках упирается в саморез,
     и по нему одному снятие зазора не видно. */
  for (const over of [{}, {afHole:6, afScrew:2.5}, {afHole:24, afScrew:8}]){
    const g = anchorFoldSpec(F(over));
    chk('посадочный радиус уже отверстия на объявленный зазор (' + JSON.stringify(over) + ')',
        g.clear >= 0.2 && Math.abs(g.rFit - (g.rHole - g.clear)) < 1e-9, {rFit:g.rFit, rHole:g.rHole, clear:g.clear});
  }
}
{ // единственный случай, когда не пролезает, — когда саморезу и полосе вместе не хватает отверстия
  const p = F({afLegT:3, afHole:10, afScrew:4}), g = anchorFoldSpec(p);
  chk('когда саморез и полоса не помещаются вместе, это сказано вслух',
      g.bodyD > g.hole && collectPrintWarnings(p).some(x => /не пролезет/.test(x)), collectPrintWarnings(p));
}

console.log('\n=== складной: полос две, и они по обе стороны оси ===');
{
  /* Одна полоса вместо двух даёт замкнутую деталь с нормальным просветом под саморез и правильным
     габаритом — и совершенно неработающий механизм: тянуть блок будет не за что, он перекосится.
     Ни герметичность, ни габарит, ни просвет этого не видят, потому что все они меряют ОДНУ сторону. */
  for (const over of [{}, {afHole:6, afScrew:2.5}, {afHole:24, afScrew:8}]){
    const p = F(over), g = anchorFoldSpec(p), t = buildTrisForShape('box', p);
    const yA = g.headThk + 1, yB = g.headThk + g.len - 1;
    let left = 0, right = 0;
    for (const T of t) for (const q of T){
      if (q[1] < yA || q[1] > yB) continue;
      if (q[0] < -g.legXmin/2) left++; else if (q[0] > g.legXmin/2) right++;
    }
    chk('материал есть по обе стороны оси (' + JSON.stringify(over) + ')',
        left > 50 && right > 50, {слева:left, справа:right});
    chk('и поровну — полосы одинаковы (' + JSON.stringify(over) + ')',
        Math.abs(left - right) <= 2, {слева:left, справа:right});
  }
}
{
  /* Полосы обязаны ЗАХОДИТЬ во фланец и в блок, а не упираться в них плоскостью. Оболочки этой детали
     держатся тем, что пересекаются по ОБЪЁМУ; сведи перекрытие к нулю — и они просто соприкоснутся
     гранями. Проверка герметичности этого не заметит (каждая оболочка замкнута сама по себе), а
     напечатанная деталь расслоится ровно по этому стыку.

     Меряется лучом: вертикаль сквозь полосу пересекает поверхность в шести местах, и при перекрытии
     все шесть РАЗНЫЕ. Без перекрытия дно полосы садится ровно на торец фланца, и две высоты
     совпадают — вот это совпадение и ловится. */
  const p = F({}), g = anchorFoldSpec(p), t = buildTrisForShape('box', p);
  const ys = [];
  /* Луч ведём через СЕРЕДИНУ выгиба и с уводом по z: полоса едет по x, и вертикаль ровно на legX
     выходит из неё в средней части; а z = 0 попадает точно на радиальное ребро кольца фланца, и
     строгая проверка попадания внутрь треугольника такую точку отбрасывает — оба раза луч показывал
     меньше пересечений, чем есть. */
  const x = g.legX + g.bow/2, z = 0.13;
  for (const T of t){
    const [A,B,C] = T;
    const d = (B[2]-C[2])*(A[0]-C[0]) + (C[0]-B[0])*(A[2]-C[2]);
    if (Math.abs(d) < 1e-12) continue;
    const a2 = ((B[2]-C[2])*(x-C[0]) + (C[0]-B[0])*(z-C[2]))/d;
    const b2 = ((C[2]-A[2])*(x-C[0]) + (A[0]-C[0])*(z-C[2]))/d;
    const c2 = 1-a2-b2;
    if (a2 < 1e-9 || b2 < 1e-9 || c2 < 1e-9) continue;
    ys.push(a2*A[1] + b2*B[1] + c2*C[1]);
  }
  ys.sort((u,v)=>u-v);
  chk('вертикаль сквозь полосу пересекает поверхность шесть раз', ys.length === 6, ys.map(v=>+v.toFixed(2)));
  let touch = 0;
  for (let i = 1; i < ys.length; i++) if (Math.abs(ys[i]-ys[i-1]) < 1e-6) touch++;
  chk('и ни одна пара высот не совпадает — оболочки пересекаются, а не соприкасаются',
      touch === 0, {совпало:touch, ys:ys.map(v=>+v.toFixed(3))});
}

console.log('\n=== складной: саморез проходит насквозь ===');
{
  /* Саморез идёт от фланца к блоку МЕЖДУ полосами. Уже его просвет — и он упрётся в них, а блок тянуть
     будет нечем: механизма нет вовсе, а не «держит хуже». Полосы стояли на ±2,28 при толщине 1,2 —
     просвет 3,4 мм на саморез Ø4, и деталь при этом была безупречно замкнута. */
  for (const over of [{}, {afHole:6, afScrew:2.5}, {afHole:24, afScrew:8}, {afLegW:20}, {afLegT:3}]){
    const p = F(over), g = anchorFoldSpec(p), t = buildTrisForShape('box', p);
    // ближайшая к оси точка полосы, на высоте между фланцем и блоком
    let inner = Infinity;
    const yA = g.headThk + 1, yB = g.headThk + g.len - 1;
    for (const T of t) for (const q of T){
      if (q[1] < yA || q[1] > yB) continue;
      inner = Math.min(inner, Math.abs(q[0]));
    }
    chk('между полосами проходит саморез (' + JSON.stringify(over) + ')',
        inner >= g.screw/2 + 0.15, {просвет:+(2*inner).toFixed(2), саморез:g.screw});
  }
  const p = F({}), g = anchorFoldSpec(p), t = buildTrisForShape('box', p);
  // фланец обязан пропускать саморез СВОБОДНО, а блок — держать его резьбой
  const hole = (y, rMax) => { let r = Infinity;
    for (const T of t) for (const q of T) if (Math.abs(q[1]-y) < 1e-9){ const d = Math.hypot(q[0], q[2]); if (d < rMax) r = Math.min(r, d); }
    return r; };
  chk('фланец пропускает саморез свободно', Math.abs(hole(0, g.rHead) - g.rFree) < 1e-9 && 2*g.rFree > g.screw,
      {отверстие:2*g.rFree, саморез:g.screw});
  chk('а блок держит его резьбой — там отверстие УЖЕ самореза',
      Math.abs(hole(g.headThk + g.len + g.block, g.rBlock) - g.rPilot) < 1e-9 && 2*g.rPilot < g.screw,
      {пилот:2*g.rPilot, саморез:g.screw});
}

console.log('\n=== складной: он раскрывается, и полоса это переживает ===');
{
  const g = anchorFoldSpec(F({}));
  chk('лапа перекрывает край отверстия', g.grip > 1, +g.grip.toFixed(2));
  chk('и раскрывается ЗА листом, а не в его толще', g.behind > 1, +g.behind.toFixed(2));
  chk('деформация полосы в пределах вязкого пластика', g.strain < 0.04, +(g.strain*100).toFixed(1));
  chk('ход самореза мал — это доли миллиметра, а не пол-листа', g.stroke < 3, +g.stroke.toFixed(2));
  /* Вершина дуги стоит на СЕРЕДИНЕ полосы — выгиб задан синусом, максимум у него на половине. Значит
     после стягивания она лежит между «серединой минус ход» и «серединой»; посчитанная от фланца, она
     уехала бы вдвое дальше, и все проверки «раскрылась за листом» стали бы врать в безопасную сторону. */
  const mid = g.headThk + g.len/2;
  chk('вершина дуги — в середине полосы, а не у её конца',
      g.apexY <= mid + 1e-9 && g.apexY >= mid - g.stroke, {apexY:+g.apexY.toFixed(2), середина:+mid.toFixed(2)});
  // и на самой сетке выгиб действительно достигает максимума в середине
  const t = buildTrisForShape('box', F({}));
  // только область полос: у фланца кромка на радиусе 8, и «максимум по x» без окна ловит именно её
  let peakY = 0, peak = 0;
  for (const T of t) for (const q of T){
    if (q[1] < g.headThk + 1 || q[1] > g.headThk + g.len - 1) continue;
    if (q[0] > peak){ peak = q[0]; peakY = q[1]; }
  }
  chk('и на построенной детали выгиб тоже наибольший посередине',
      Math.abs(peakY - (g.headThk + g.len/2)) < g.len*0.05, {peakY:+peakY.toFixed(2), надо:+(g.headThk+g.len/2).toFixed(2)});
  /* Толще полоса — больше деформация при том же раскрытии: это и есть причина, по которой полоса
     тонкая. Проверяется зависимостью, а не одним числом: одно число сходится и по случайности. */
  const thin = anchorFoldSpec(F({afLegT:0.6})), thick = anchorFoldSpec(F({afLegT:2.4}));
  chk('вдвое толще полоса — заметно больше деформация', thick.strain > thin.strain*1.8,
      {тонкая:+(thin.strain*100).toFixed(2), толстая:+(thick.strain*100).toFixed(2)});
  const short = anchorFoldSpec(F({afLen:12})), long = anchorFoldSpec(F({afLen:50}));
  chk('длиннее складная часть — меньше деформация', long.strain < short.strain*0.5,
      {короткая:+(short.strain*100).toFixed(2), длинная:+(long.strain*100).toFixed(2)});
}
{ // приложение говорит вслух всё, чем складной дюбель плох
  const W = over => collectPrintWarnings(F(over));
  chk('на настройках по умолчанию не ругается ни на что', W({}).length === 0, W({}));
  chk('слишком толстая полоса — предупреждает про излом',
      W({afLegT:3, afHole:16}).some(x => /треснет/.test(x)), W({afLegT:3, afHole:16}));
  chk('короткая часть в толстом листе — раскроется внутри листа',
      W({afLen:12}).some(x => /внутри листа|вплотную/.test(x)), W({afLen:12}));
  chk('урезанную ширину называет прямо',
      W({afLegW:20}).some(x => /ширина полосы урезана/.test(x)), W({afLegW:20}));
  chk('урезанный выгиб — тоже', W({afBow:4}).some(x => /выгиб урезан/.test(x)), W({afBow:4}));
  /* Про узкий фланец предупреждать нечем и не нужно: он ЗАЖАТ так, что уже отверстия быть не может.
     Предупреждение на этот счёт стояло и было мертво — до него не доходило ни на каких параметрах.
     Проверяется поэтому сам зажим, а не сообщение о нарушении, которого не бывает. */
  for (const d of [0, 1, 11, 40]){
    const g = anchorFoldSpec(F({afHeadD:d}));
    chk('фланец всегда шире отверстия минимум на 2 мм (afHeadD=' + d + ')',
        g.rHead >= g.rHole + 2 - 1e-9, {rHead:g.rHead, rHole:g.rHole});
  }
}

console.log('\n=== складной есть в панели: разновидность, строки, справка ===');
{
  const opt = SHAPE_PARAMS.box.find(r => r.key === 'threadMode').options;
  chk('складной есть в списке разновидностей', opt.some(o => o.v === 'anchorfold'));
  const foldOpt = opt.find(o => o.v === 'anchorfold');
  chk('и назван по-человечески', !!foldOpt && foldOpt.t.length > 10, foldOpt && foldOpt.t);
  chk('спиральный при этом никуда не делся', opt.some(o => o.v === 'anchor'));
  chk('строка формы опознаёт складной', dominantMode(F({})) === 'thread');
  const h = MODEL_HELP['thread:anchorfold'];
  chk('справка есть', !!h && !!h.what && !!h.how);
  chk('и предупреждает про PLA', /PLA/.test(h.how), h.how);
  chk('и говорит, что отверстие надо сверлить', /сверл/i.test(h.how) || /сверл/i.test(h.what));
  chk('и честно называет отличие от заводского', /шарнир/.test(h.how), h.how);
  Object.assign(paramState.box, F({}));
  chk('имя детали в сводке — складной дюбель', /складной/i.test(activeShapeLabel()), activeShapeLabel());
}

console.log('\n=== TOTAL: ' + pass + ' passed, ' + fail + ' failed ===');
process.exit(fail ? 1 : 0);
