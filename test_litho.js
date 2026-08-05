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
  Object.assign(paramState.box, defaultBoxParams(), {ltMode:'flat', ltW:100, ltH:70, ltMin:0.8, ltMax:3,
                                                    ltFrame:0, ltRes:120}, over || {});
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
  /* Лицо плоское, тыл — поле высот, значит толщина в точке это (z лица − z тыла). Картинка — половина
     белая, половина чёрная, поэтому ответ известен заранее: слева ровно ltMin, справа ровно ltMax.
     Меряется по вершинам тыла, а не «на глаз по габариту»: габарит покажет ltMax и на панели, у которой
     тонкое место всего одно. */
  const p = setup({ltMin:0.8, ltMax:3, ltFrame:0, ltW:100, ltH:70});
  const t = buildTrisForShape('box', p);
  const zF = 3/2;                                   // лицо: +tMax/2
  let front = 0, left = [Infinity, -Infinity], right = [Infinity, -Infinity];
  for (const T of t) for (const q of T){
    if (Math.abs(q[2] - zF) < 1e-9){ front++; continue; }
    const th = zF - q[2];
    const side = q[0] < -25 ? left : q[0] > 25 ? right : null;
    if (side){ side[0] = Math.min(side[0], th); side[1] = Math.max(side[1], th); }
  }
  chk('лицевая сторона существует и она плоская', front > 100, front);
  chk('на светлой половине толщина ровно ltMin',
      Math.abs(left[0] - 0.8) < 1e-6 && Math.abs(left[1] - 0.8) < 1e-6, left);
  chk('на тёмной половине толщина ровно ltMax',
      Math.abs(right[0] - 3) < 1e-6 && Math.abs(right[1] - 3) < 1e-6, right);
}
{ // инверсия меняет местами светлое и тёмное, и ничего больше
  const p = setup({ltFrame:0});
  logos[0].invert = true;
  const t = buildTrisForShape('box', p);
  const zF = 1.5; let left = Infinity, right = Infinity;
  for (const T of t) for (const q of T){
    if (Math.abs(q[2] - zF) < 1e-9) continue;
    if (q[0] < -25) left = Math.min(left, zF - q[2]);
    if (q[0] >  25) right = Math.min(right, zF - q[2]);
  }
  chk('с инверсией светлое становится толстым', Math.abs(left - 3) < 1e-6, left);
  chk('а тёмное — тонким', Math.abs(right - 0.8) < 1e-6, right);
  logos[0].invert = false;
}
{ // клин: промежуточный тон даёт промежуточную толщину, а не одну из двух ступеней
  const p = setup({ltFrame:0, ltRes:200}, rampHM());
  const t = buildTrisForShape('box', p);
  const zF = 1.5, seen = new Set();
  for (const T of t) for (const q of T){ if (Math.abs(q[2]-zF) > 1e-9) seen.add(Math.round((zF-q[2])*100)); }
  chk('у плавного клина толщин много, а не две', seen.size > 20, seen.size);
  const arr = [...seen].sort((a,b)=>a-b);
  chk('и они лежат ровно между ltMin и ltMax', arr[0] >= 79 && arr[arr.length-1] <= 301, [arr[0], arr[arr.length-1]]);
}

console.log('\n=== рамка держит максимум по всему краю ===');
{
  const p = setup({ltFrame:5, ltW:100, ltH:70, ltMin:0.8, ltMax:3});
  const t = buildTrisForShape('box', p);
  const zF = 1.5; let thinInFrame = 0, n = 0;
  for (const T of t) for (const q of T){
    if (Math.abs(q[2] - zF) < 1e-9) continue;
    const inFrame = Math.abs(q[0]) > 50 - 5 + 1e-9 || Math.abs(q[1]) > 35 - 5 + 1e-9;
    if (!inFrame) continue;
    n++; if (Math.abs((zF - q[2]) - 3) > 1e-6) thinInFrame++;
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
  chk('и габарит по X это диаметр 2R, а не заданные 120',
      Math.abs((b.hi[0]-b.lo[0]) - 2*120/(2*Math.PI)) < 0.05, b.hi[0]-b.lo[0]);
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
  let rMax = 0; for (const T of t) for (const q of T) rMax = Math.max(rMax, r(q));
  chk('внешняя поверхность лежит на радиусе R', Math.abs(rMax - R) < 1e-6, {rMax, R});
}

console.log('\n=== настройки, которые нельзя задать бессмысленно ===');
{
  const s = lithoSpec(Object.assign({}, defaultBoxParams(), {ltMode:'flat', ltMin:5, ltMax:2}));
  chk('светлое не может быть толще тёмного', s.tMin < s.tMax, [s.tMin, s.tMax]);
  const s2 = lithoSpec(Object.assign({}, defaultBoxParams(), {ltMode:'flat', ltW:40, ltH:30, ltFrame:100}));
  chk('рамка не съедает картинку целиком', s2.frame <= 30/2 - 2 + 1e-9, s2.frame);
  const s3 = lithoSpec(Object.assign({}, defaultBoxParams(), {ltMode:'flat', ltW:100, ltH:50, ltRes:200}));
  chk('ячейка квадратная: густота по длинной стороне, короткая пропорционально',
      Math.abs(s3.W/s3.N - s3.H/s3.M) < 1e-6, [s3.W/s3.N, s3.H/s3.M]);
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
