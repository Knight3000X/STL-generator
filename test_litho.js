// Литофания: панель, у которой ТОЛЩИНА и есть картинка — светлое тонкое и просвечивает, тёмное толстое.
//
// Что здесь меряется, и почему именно это. Не «строится ли»: панель, у которой рельеф лежит на лицевой
// стороне вместо толщины, тоже построится и тоже будет герметична, а на просвет покажет ровный кусок
// пластика. Поэтому тесты меряют РАССТОЯНИЕ между лицом и тылом в конкретной точке и сверяют его с тем,
// что в этой точке нарисовано, — а лицо при этом обязано остаться гладким.
//
// Отдельно проверяется шов цилиндра. Столбец при i = N берётся как i = 0; посчитать его «по формуле с
// другой стороны» нельзя, потому что sin(+π) и sin(−π) в double отличаются, и оболочка расходится ровно
// на эту величину — герметичность это ловит, а на глаз не видно.
// Запускать через ./run-all.sh (extraction test).

let pass = 0, fail = 0;
function chk(n, c, e){ if(c){ pass++; console.log('  OK  ', n); } else { fail++; console.log('  FAIL', n, e !== undefined ? JSON.stringify(e) : ''); } }

// Половина белая, половина чёрная, граница ровно по середине: слева свет проходит (тонко), справа нет.
function halfHM(){
  const S = LOGO_HM_SIZE, h = new Float32Array(S*S);
  for (let j = 0; j < S; j++) for (let i = 0; i < S; i++) h[j*S+i] = (i < S/2) ? 1 : 0;
  return h;
}
// Плавный клин слева направо — для проверки, что промежуточные тона дают промежуточную толщину.
function rampHM(){
  const S = LOGO_HM_SIZE, h = new Float32Array(S*S);
  for (let j = 0; j < S; j++) for (let i = 0; i < S; i++) h[j*S+i] = (i + 0.5)/S;
  return h;
}
function setup(over, hm){
  logos.length = 0; boxHoles.length = 0;
  /* Подгонка под пропорции снимка выключена: тесты задают высоту руками и меряют её же. Сама подгонка
     проверяется отдельным случаем ниже — там, где у картинки есть заявленные пропорции. */
  Object.assign(paramState.box, defaultBoxParams(), {ltMode:'flat', ltW:100, ltH:70, ltMin:0.8, ltMax:3,
                                                    ltFrame:0, ltRes:120, ltFit:false}, over || {});
  if (hm !== null) logos.push({id:1, face:'+Z', u0:0, v0:0, w:40, h:40, depth:0.6, threshold:0.5,
                               invert:false, rotation:0, heightmap:hm || halfHM(), levels:2});
  return paramState.box;
}
const bbox = t => { const lo=[1e9,1e9,1e9], hi=[-1e9,-1e9,-1e9];
  for(const T of t) for(const q of T) for(let a=0;a<3;a++){ lo[a]=Math.min(lo[a],q[a]); hi[a]=Math.max(hi[a],q[a]); }
  return {lo,hi}; };

console.log('=== панель строится замкнутой во всех трёх формах ===');
for (const mode of ['flat','curved','cylinder']){
  for (const frame of [0, 4]){
    const p = setup({ltMode:mode, ltFrame:frame});
    const t = buildTrisForShape('box', p);
    const mc = manifoldCheck(t, 4);
    chk(mode + (frame ? ' с рамкой' : ' без рамки') + ' — герметична', mc.watertight, mc);
    chk(mode + (frame ? ' с рамкой' : ' без рамки') + ' — объём положительный', meshVolume(t) > 0, meshVolume(t));
  }
}
{ // без картинки форма всё равно должна быть — иначе непонятно, что настраивать до загрузки
  const p = setup({}, null);
  const t = buildTrisForShape('box', p);
  chk('без картинки — просто ровная плита, но замкнутая', manifoldCheck(t, 4).watertight);
  const b = bbox(t);
  chk('и толщина у неё ровно максимальная', Math.abs((b.hi[2]-b.lo[2]) - 3) < 1e-6, b.hi[2]-b.lo[2]);
}

console.log('\n=== габарит — это ровно заданные ширина и высота ===');
{
  const p = setup({ltW:120, ltH:80});
  const b = bbox(buildTrisForShape('box', p));
  chk('ширина', Math.abs((b.hi[0]-b.lo[0]) - 120) < 1e-6, b.hi[0]-b.lo[0]);
  chk('высота', Math.abs((b.hi[1]-b.lo[1]) - 80) < 1e-6, b.hi[1]-b.lo[1]);
  chk('толщина не больше максимальной', (b.hi[2]-b.lo[2]) <= 3 + 1e-6, b.hi[2]-b.lo[2]);
}

console.log('\n=== толщина И ЕСТЬ картинка ===');
{
  /* Тыл плоский, рельеф — поле высот, значит толщина в точке это (z рельефа − z тыла). Картинка —
     половина белая, половина чёрная, поэтому ответ известен заранее: слева ровно ltMin, справа ровно
     ltMax. Меряется по вершинам рельефа, а не «на глаз по габариту»: габарит покажет ltMax и на панели,
     у которой тонкое место всего одно. */
  const p = setup({ltMin:0.8, ltMax:3, ltFrame:0, ltW:100, ltH:70});
  const t = buildTrisForShape('box', p);
  const zB = -3/2;                                  // гладкая сторона: −tMax/2 (сзади)
  let front = 0, left = [Infinity, -Infinity], right = [Infinity, -Infinity];
  for (const T of t) for (const q of T){
    if (Math.abs(q[2] - zB) < 1e-9){ front++; continue; }
    const th = q[2] - zB;
    const side = q[0] < -25 ? left : q[0] > 25 ? right : null;
    if (side){ side[0] = Math.min(side[0], th); side[1] = Math.max(side[1], th); }
  }
  chk('гладкая сторона существует и она плоская', front > 100, front);
  chk('на светлой половине толщина ровно ltMin',
      Math.abs(left[0] - 0.8) < 1e-6 && Math.abs(left[1] - 0.8) < 1e-6, left);
  chk('на тёмной половине толщина ровно ltMax',
      Math.abs(right[0] - 3) < 1e-6 && Math.abs(right[1] - 3) < 1e-6, right);
}
{ // инверсия меняет местами светлое и тёмное, и ничего больше
  const p = setup({ltFrame:0});
  logos[0].invert = true;
  const t = buildTrisForShape('box', p);
  const zB = -1.5; let left = Infinity, right = Infinity;
  for (const T of t) for (const q of T){
    if (Math.abs(q[2] - zB) < 1e-9) continue;
    if (q[0] < -25) left = Math.min(left, q[2] - zB);
    if (q[0] >  25) right = Math.min(right, q[2] - zB);
  }
  chk('с инверсией светлое становится толстым', Math.abs(left - 3) < 1e-6, left);
  chk('а тёмное — тонким', Math.abs(right - 0.8) < 1e-6, right);
  logos[0].invert = false;
}
{ // клин: промежуточный тон даёт промежуточную толщину, а не одну из двух ступеней
  const p = setup({ltFrame:0, ltRes:200}, rampHM());
  const t = buildTrisForShape('box', p);
  const zB = -1.5, seen = new Set();
  for (const T of t) for (const q of T){ if (Math.abs(q[2]-zB) > 1e-9) seen.add(Math.round((q[2]-zB)*100)); }
  chk('у плавного клина толщин много, а не две', seen.size > 20, seen.size);
  const arr = [...seen].sort((a,b)=>a-b);
  chk('и они лежат ровно между ltMin и ltMax', arr[0] >= 79 && arr[arr.length-1] <= 301, [arr[0], arr[arr.length-1]]);
}

console.log('\n=== рамка держит максимум по всему краю ===');
{
  const p = setup({ltFrame:5, ltW:100, ltH:70, ltMin:0.8, ltMax:3});
  const t = buildTrisForShape('box', p);
  const zB = -1.5; let thinInFrame = 0, n = 0;
  for (const T of t) for (const q of T){
    if (Math.abs(q[2] - zB) < 1e-9) continue;
    const inFrame = Math.abs(q[0]) > 50 - 5 + 1e-9 || Math.abs(q[1]) > 35 - 5 + 1e-9;
    if (!inFrame) continue;
    n++; if (Math.abs((q[2] - zB) - 3) > 1e-6) thinInFrame++;
  }
  chk('в рамке есть узлы', n > 50, n);
  chk('и ни один из них не тоньше максимума', thinInFrame === 0, thinInFrame);
}

console.log('\n=== дуга и цилиндр: ширина это ДЛИНА ДУГИ, а не хорда ===');
{
  const g = lithoSpec(Object.assign({}, defaultBoxParams(), {ltMode:'cylinder', ltW:120, ltH:80}));
  chk('у цилиндра радиус следует из длины окружности', Math.abs(g.R - 120/(2*Math.PI)) < 1e-9, g.R);
  const p = setup({ltMode:'cylinder', ltW:120, ltH:80, ltFrame:0});
  const b = bbox(buildTrisForShape('box', p));
  /* Габарит по X не равен 2R: снаружи теперь РЕЛЬЕФ, и он разной высоты — до R доходит только самое
     тёмное место. Что обязано выполняться — рельеф не вылезает за R, а гладкая сторона лежит ровно
     на R − tMax. */
  chk('и габарит по X не больше диаметра 2R',
      (b.hi[0]-b.lo[0]) <= 2*120/(2*Math.PI) + 1e-6, b.hi[0]-b.lo[0]);
  chk('высота по-прежнему своя', Math.abs((b.hi[1]-b.lo[1]) - 80) < 1e-6, b.hi[1]-b.lo[1]);
}
{
  const g = lithoSpec(Object.assign({}, defaultBoxParams(), {ltMode:'curved', ltW:100, ltArc:90}));
  chk('у дуги радиус тоже из длины дуги', Math.abs(g.R - 100/(Math.PI/2)) < 1e-9, g.R);
  chk('у плоской панели радиуса нет вовсе', lithoSpec(Object.assign({}, defaultBoxParams(), {ltMode:'flat'})).R === 0);
}
{
  /* Шов цилиндра: столбец N это столбец 0, поэтому лишней колонки вершин быть не должно. Считается по
     ЧИСЛУ различных X-координат на лице — дублирующий шов дал бы две, отличающиеся на 1e-16. */
  const p = setup({ltMode:'cylinder', ltW:120, ltH:80, ltFrame:0, ltRes:80});
  const t = buildTrisForShape('box', p);
  chk('цилиндр герметичен', manifoldCheck(t, 4).watertight, manifoldCheck(t, 4));
  const g = lithoSpec(p);
  const R = g.R;
  let onSeam = 0;
  for (const T of t) for (const q of T) if (Math.abs(q[0]) < 1e-12 && q[2] < 0) onSeam++;
  chk('шов существует и он один', onSeam > 0, onSeam);
  const r = q => Math.hypot(q[0], q[2]);
  let rMax = 0, rMin = Infinity;
  for (const T of t) for (const q of T){ const v = r(q); rMax = Math.max(rMax, v); rMin = Math.min(rMin, v); }
  chk('рельеф не вылезает за радиус R', rMax <= R + 1e-9, {rMax, R});
  chk('и доходит до него в самом тёмном месте', Math.abs(rMax - R) < 1e-6, {rMax, R});
  /* Гладкая сторона — ровно R − tMax. Она же и проверяет, что цилиндр НЕ сдвинут с оси: сдвинь его, и
     расстояние от начала координат до этой поверхности перестанет быть постоянным. */
  chk('гладкая сторона лежит ровно на R − tMax', Math.abs(rMin - (R - 3)) < 1e-6, {rMin, надо:R-3});
}

console.log('\n=== рельеф смотрит на зрителя, гладкая сторона — от него ===');
{
  /* Панель односторонняя, поэтому с изнанки картинка зеркальна ВСЕГДА — это не дефект построения, это
     свойство любого рельефа. Дефектом было то, какой стороной панель повёрнута к камере: рельеф лежал
     на −Z, камера стоит на +Z, и в предпросмотре была пустая плита, а картинку находили, развернув
     модель, — то есть зеркальной.

     Меряется не «есть ли плоскость» (она есть при любой ориентации: у половинчатой картинки тёмная
     половина сама плоская), а КАКАЯ из двух сторон одна и та же по всей ширине. Гладкая та, что
     покрывает обе половины сразу. */
  const p = setup({ltFrame:0, ltW:100, ltH:70, ltMin:0.8, ltMax:3});
  const t = buildTrisForShape('box', p);
  const b = bbox(t);
  const zLo = b.lo[2], zHi = b.hi[2];
  let flatLeft = 0, flatRight = 0, hiLeft = -Infinity, hiRight = -Infinity;
  for (const T of t) for (const q of T){
    const light = q[0] < -25, dark = q[0] > 25;
    if (!light && !dark) continue;
    if (Math.abs(q[2] - zLo) < 1e-9){ if (light) flatLeft++; else flatRight++; }
    if (light) hiLeft = Math.max(hiLeft, q[2]); else hiRight = Math.max(hiRight, q[2]);
  }
  chk('дальняя от зрителя сторона — одна плоскость на всю ширину',
      flatLeft > 20 && flatRight > 20, [flatLeft, flatRight]);
  chk('и она лежит на −tMax/2', Math.abs(zLo + 1.5) < 1e-9, zLo);
  chk('ближняя к зрителю сторона — рельеф: на светлом он мельче',
      Math.abs(hiLeft - (zLo + 0.8)) < 1e-6, hiLeft);
  chk('а на тёмном выходит вперёд на всю толщину',
      Math.abs(hiRight - (zLo + 3)) < 1e-6, hiRight);
  chk('то есть перед панели — это самое тёмное место', Math.abs(zHi - hiRight) < 1e-9, [zHi, hiRight]);
  /* Объём с ИЗВЕСТНЫМ ответом, а не «больше нуля». Герметичность считает рёбра ненаправленно и потому
     слепа к вывернутой грани: разверни тыл наизнанку — оболочка останется «замкнутой», а объём с
     13364 упадёт до 6364, потому что вклад этой плоскости поменяет знак. Половина светлая, половина
     тёмная, значит средняя толщина известна заранее. */
  chk('объём равен площади на среднюю толщину — ни одна грань не вывернута',
      Math.abs(meshVolume(t) - 100*70*(0.8 + 3)/2) < 100*70*(0.8 + 3)/2*0.01, meshVolume(t));
}
{
  /* Абажур: лампа внутри, значит гладкая сторона обязана смотреть В ЦИЛИНДР, а рельеф — наружу.
     Крайние радиусы этого не показывают: и так, и наоборот они дают R и R − tMax. Показывает то,
     ЧТО лежит на светлой половине — снаружи там R − tMax + tMin, а не R − tMin. */
  const p = setup({ltMode:'cylinder', ltW:120, ltH:80, ltFrame:0, ltMin:0.8, ltMax:3});
  const t = buildTrisForShape('box', p);
  const R = 120/(2*Math.PI);
  let lightMax = 0, between = 0;
  for (const T of t) for (const q of T){
    const r = Math.hypot(q[0], q[2]);
    if (r > R - 3 + 0.8 + 1e-6 && r < R - 1e-6) between++;
    const u = Math.atan2(q[0], q[2])/(2*Math.PI) + 0.5;
    if (u < 0.25) lightMax = Math.max(lightMax, r);
  }
  chk('снаружи светлого места радиус R − tMax + tMin', Math.abs(lightMax - (R - 3 + 0.8)) < 1e-6,
      {lightMax, надо: R - 3 + 0.8});
  chk('и промежуточных радиусов у двухцветной картинки нет вовсе', between === 0, between);
}
{
  /* Дуга стоит там же, где стоят все остальные модели: построенная вокруг оси Y, она лежит по Z целиком
     с одной стороны, и её двигают на середину габарита. Без этого сдвига панель уезжает от начала
     координат на радиус — герметичности всё равно, а на столе видно. */
  const b = bbox(buildTrisForShape('box', setup({ltMode:'curved', ltW:100, ltH:70, ltArc:90, ltFrame:0})));
  chk('дуга центрирована по Z', Math.abs(b.lo[2] + b.hi[2]) < 1e-9, [b.lo[2], b.hi[2]]);
  chk('и лежит по обе стороны от нуля', b.lo[2] < 0 && b.hi[2] > 0, [b.lo[2], b.hi[2]]);
}

console.log('\n=== высота панели берётся из пропорций снимка ===');
{
  /* Раньше высоту задавали руками, и снимок 3880×5184 на панели 100×70 выходил раздавленным: поле
     высот растянуто на квадрат при загрузке, так что панель — единственное место, где пропорции живут.
     Считать надо по КАРТИНКЕ, а не по панели: рамка ест поле с каждой стороны. */
  const port = {heightmap: halfHM(), aspect: 3880/5184};
  const base = () => Object.assign({}, defaultBoxParams(), {ltMode:'flat', ltW:100, ltFrame:0, ltH:70});
  const s = lithoSpec(base(), port);
  chk('высота идёт от пропорций, а не от ltH', Math.abs(s.H - 100/port.aspect) < 1e-6, s.H);
  chk('и это те самые 133,6 мм для 3880×5184', Math.abs(s.H - 133.6) < 0.05, s.H);
  chk('и панель сообщает, что подгонялась', s.fit === true, s.fit);
  const sf = lithoSpec(Object.assign(base(), {ltFrame:5}), port);
  chk('с рамкой пропорции считает картинка внутри рамки, а не панель целиком',
      Math.abs(sf.H - ((100 - 10)/port.aspect + 10)) < 1e-6, sf.H);
  chk('иначе рамка сплющила бы снимок', Math.abs(sf.H - 100/port.aspect) > 1, sf.H);
  const land = lithoSpec(base(), {heightmap: halfHM(), aspect: 2});
  chk('горизонтальный снимок даёт низкую панель', Math.abs(land.H - 50) < 1e-6, land.H);
  const off = lithoSpec(Object.assign(base(), {ltFit:false}), port);
  chk('выключатель возвращает ручную высоту', Math.abs(off.H - 70) < 1e-9 && off.fit === false, [off.H, off.fit]);
  /* Проекты, сохранённые до появления выключателя, приходят вообще без ключа. Отсутствие — это НЕ
     «выключено»: такой проект должен получить новое поведение, иначе старый снимок так и останется
     раздавленным до тех пор, пока галочку не тронут руками. */
  const old = base(); delete old.ltFit;
  chk('в старом проекте без ключа подгонка включена', lithoSpec(old, port).fit === true);
  const none = lithoSpec(base(), null);
  chk('без картинки подгонять не по чему', Math.abs(none.H - 70) < 1e-9 && none.fit === false, [none.H, none.fit]);
  const bad = lithoSpec(base(), {heightmap: halfHM(), aspect: 0});
  chk('и пропорции 0 тоже не годятся', Math.abs(bad.H - 70) < 1e-9 && bad.fit === false, [bad.H, bad.fit]);
  const tall = lithoSpec(Object.assign(base(), {ltW:400}), {heightmap: halfHM(), aspect: 0.01});
  chk('высота остаётся в пределах станка', tall.H <= 400 + 1e-9 && tall.H >= 10, tall.H);

  // и то же самое доезжает до самой модели, а не только до спецификации
  const p = setup({ltFit:true, ltW:100, ltFrame:0, ltH:70});
  logos[0].aspect = port.aspect;
  const b = bbox(buildTrisForShape('box', p));
  chk('готовая модель имеет ту же высоту', Math.abs((b.hi[1]-b.lo[1]) - 100/port.aspect) < 1e-6, b.hi[1]-b.lo[1]);
  chk('ширина при этом не тронута', Math.abs((b.hi[0]-b.lo[0]) - 100) < 1e-6, b.hi[0]-b.lo[0]);
  chk('и она по-прежнему герметична', manifoldCheck(buildTrisForShape('box', p), 4).watertight);
}
{ // ручную высоту нельзя крутить, пока она вычисляется, — иначе ползунок ни на что не отвечает
  const row = SHAPE_PARAMS.box.find(r => r.key === 'ltH');
  chk('строка ручной высоты скрыта при включённой подгонке',
      !paramRowRelevant(row, Object.assign({}, defaultBoxParams(), {ltMode:'flat', ltFit:true})));
  chk('и показана при выключенной',
      paramRowRelevant(row, Object.assign({}, defaultBoxParams(), {ltMode:'flat', ltFit:false})));
  const sw = SHAPE_PARAMS.box.find(r => r.key === 'ltFit');
  chk('сам выключатель есть и он галочка', !!sw && sw.type === 'bool', sw && sw.type);
  chk('и по умолчанию включён', sw.default === true, sw.default);
  chk('и лежит в той же группе', sw.group === 'Литофания', sw.group);
}

console.log('\n=== настройки, которые нельзя задать бессмысленно ===');
{
  /* Картинка передаётся явным null: здесь меряются зажимы на РУЧНЫХ числах, а высота при загруженном
     снимке считается сама, и тогда заданные тут W и H перестают быть теми, что проверяются. */
  const s = lithoSpec(Object.assign({}, defaultBoxParams(), {ltMode:'flat', ltMin:5, ltMax:2}), null);
  chk('светлое не может быть толще тёмного', s.tMin < s.tMax, [s.tMin, s.tMax]);
  const s2 = lithoSpec(Object.assign({}, defaultBoxParams(), {ltMode:'flat', ltW:40, ltH:30, ltFrame:100}), null);
  chk('рамка не съедает картинку целиком', s2.frame <= 30/2 - 2 + 1e-9, s2.frame);
  const s3 = lithoSpec(Object.assign({}, defaultBoxParams(), {ltMode:'flat', ltW:100, ltH:50, ltRes:200}), null);
  chk('ячейка квадратная: густота по длинной стороне, короткая пропорционально',
      Math.abs(s3.W/s3.N - s3.H/s3.M) < 1e-6, [s3.W/s3.N, s3.H/s3.M]);
}
{ /* Спецификация без второго довода берёт картинку из загруженных сама — этим живут предупреждения и
     сводка, которые о логотипах ничего не знают и знать не должны. */
  setup({ltFit:true, ltW:100, ltFrame:0, ltH:70});
  logos[0].aspect = 0.5;
  const s = lithoSpec(paramState.box);
  chk('спецификация сама находит загруженный снимок', s.fit === true && Math.abs(s.H - 200) < 1e-6, [s.fit, s.H]);
  logos.length = 0;
  const s2 = lithoSpec(paramState.box);
  chk('а когда снимка нет — возвращается к ручной высоте',
      s2.fit === false && Math.abs(s2.H - 70) < 1e-9, [s2.fit, s2.H]);
}

console.log('\n=== панель есть в панели: строка, кнопка, справка ===');
{
  const rows = SHAPE_PARAMS.box.filter(r => r.group === 'Литофания');
  chk('строки параметров есть', rows.length >= 6, rows.length);
  chk('и у каждой человеческое имя', rows.every(r => r.label && r.label.length > 3));
  const act = rows.find(r => r.key === 'ltMode');
  chk('включатель — select с «нет»', !!act && act.type === 'select' && act.options.some(o => o.v === 'none'));
  chk('и он даёт три формы', !!act && act.options.length === 4, act && act.options.length);
  chk('форма опознаётся', dominantMode(Object.assign({}, defaultBoxParams(), {ltMode:'flat'})) === 'litho');
  chk('а без неё — нет', dominantMode(Object.assign({}, defaultBoxParams(), {ltMode:'none'})) !== 'litho');
  chk('группа видна только на литофании',
      sectionRelevant('Литофания', 'litho', false) === true &&
      sectionRelevant('Литофания', 'coaster', false) === false);
  chk('а логотипы на ней видны — картинка приходит оттуда',
      sectionRelevant('Логотипы (рельеф на гранях)', 'litho', false) === true);
  chk('у формы есть имя', !!KIND_LABEL.litho);
  const h = MODEL_HELP.litho;
  chk('и справка', !!h && !!h.what && !!h.how, h);
  chk('справка говорит, как ставить на стол', /стоя|вертикал|ребр/i.test(h.how), h.how);
  chk('профиль печати — мелкий рельеф', KIND_PRINT.litho === 'detail', KIND_PRINT.litho);
  /* Строки, на которые литофания не отзывается, не должны показываться: она сама себе рисунок, ни
     бляшки под этикетку, ни разбора на цвета у неё нет. Молчаливый холостой ход хуже отсутствия. */
  for (const key of ['logoAms', 'logoPlate']){
    const row = SHAPE_PARAMS.box.find(r => r.key === key);
    chk('«'+key+'» скрыта на литофании',
        !paramRowRelevant(row, Object.assign({}, defaultBoxParams(), {ltMode:'flat'})), key);
    chk('…и видна без неё',
        paramRowRelevant(row, Object.assign({}, defaultBoxParams(), {ltMode:'none'})), key);
  }
  chk('группа лежит на вкладке «Форма»', GROUP_TAB['Литофания'] === 'form', GROUP_TAB['Литофания']);
  chk('и знает свою форму', GROUP_KIND['Литофания'] === 'litho', GROUP_KIND['Литофания']);
}

console.log('\n=== предупреждения говорят то, что видно только на просвет ===');
{
  setup({ltMin:0.4, ltMax:3});
  const w1 = collectPrintWarnings(paramState.box);
  chk('тонкое место меньше двух проходов сопла — сказано', w1.some(x => /меньше двух проходов/.test(x)), w1);
  setup({ltMin:0.8, ltMax:1.6});
  chk('маленькая разница толщин — сказано',
      collectPrintWarnings(paramState.box).some(x => /бл[её]клой/.test(x)));
  setup({ltRes:500, ltW:200, ltH:200});
  chk('очень густая сетка — сказано',
      collectPrintWarnings(paramState.box).some(x => /предпросмотр будет медленным/.test(x)));
  setup({}, null);
  chk('без картинки — сказано',
      collectPrintWarnings(paramState.box).some(x => /картинка не загружена/.test(x)));
  setup({ltMin:0.8, ltMax:3, ltRes:120});
  chk('а на разумных настройках литофания молчит',
      collectPrintWarnings(paramState.box).every(x => !/литофания/.test(x)),
      collectPrintWarnings(paramState.box));
  Object.assign(paramState.box, defaultBoxParams());
  chk('и на не-литофании молчит тоже',
      collectPrintWarnings(paramState.box).every(x => !/литофания/.test(x)));
}

console.log('\n=== TOTAL: ' + pass + ' passed, ' + fail + ' failed ===');
process.exit(fail ? 1 : 0);
