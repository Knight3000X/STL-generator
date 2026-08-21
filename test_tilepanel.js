// Панно из плиток одной кнопкой: nx×nz отдельных моделей сборки, у каждой свой номер в панно.
//
// Непрерывность узора через шов обеспечена с v20.0.0 самим построителем — высота считается от
// ГЛОБАЛЬНОЙ координаты. Здесь проверяется другое: что кнопка раздаёт плиткам ПРАВИЛЬНЫЕ номера и
// ставит их на ПРАВИЛЬНЫЕ места, то есть что собранное панно и есть то панно, которое рисует
// построитель. Ошибка тут не ломает ни одну плитку по отдельности — она ломает только стык, и увидеть
// её можно, лишь сложив соседей и сравнив их кромки.
//
// Второе, что меряется, — что у КАЖДОЙ записи есть своя сетка. `regenerate()` строит только активную
// модель; запись с пустым rawTris не покажется в сцене, не попадёт в экспорт и не сосчитается в
// треугольниках — молча, ровно как это уже случалось с наборами образцов (см. spawnFrozenModels).
//
// Запускать через ./run-all.sh (extraction test).

const SRC = require('fs').readFileSync('parametric-stl-generator.html', 'utf8');
let pass=0, fail=0;
function chk(n,c,e){ if(c){pass++;console.log('  OK  ',n);} else {fail++;console.log('  FAIL',n,e!==undefined?JSON.stringify(e):'');} }
function reset(ov){
  logos.length=0; boxHoles.length=0; dieFaces.length=0;
  models.length = 0; activeModelId = null;
  Object.assign(paramState.box, defaultBoxParams(), {gfBaseplate:false}, ov||{});
  const rec = makeModelRecord('плитка', deepCopyParams(paramState.box));
  models.push(rec); activeModelId = rec.id;
  return rec;
}
const TP = ov => Object.assign({tlMode:'tile', tlW:100, tlH:80, tlNX:3, tlNZ:2, tlIX:0, tlIZ:0}, ov||{});

console.log('=== раскладка панно ===');
{
  reset(TP());
  const plan = tilePanelPlan(paramState.box);
  chk('плиток столько, сколько в панно', plan.n === 6, plan.n);
  const pts = [];
  for(let iz=0; iz<2; iz++) for(let ix=0; ix<3; ix++) pts.push(plan.at(ix, iz));
  chk('шаг по горизонтали = ширина плитки + зазор',
      Math.abs((pts[1].px - pts[0].px) - (100 + PANEL_GAP)) < 1e-12, pts[1].px - pts[0].px);
  chk('шаг по вертикали = высота плитки + зазор',
      Math.abs((pts[3].pz - pts[0].pz) - (80 + PANEL_GAP)) < 1e-12, pts[3].pz - pts[0].pz);
  const sx = pts.reduce((a,q)=>a+q.px, 0), sz = pts.reduce((a,q)=>a+q.pz, 0);
  chk('панно центрировано относительно начала координат', Math.abs(sx) < 1e-9 && Math.abs(sz) < 1e-9, {sx, sz});
  chk('строки не съезжают друг относительно друга',
      pts.every((q,i) => Math.abs(q.px - pts[i % 3].px) < 1e-12), pts.map(q=>q.px));
  // Зазор — предпросмотровый, а не конструктивный: он обязан быть много меньше плитки.
  chk('зазор меньше миллиметра', PANEL_GAP > 0 && PANEL_GAP < 1, PANEL_GAP);
}

console.log('=== кнопка раздаёт номера и места ===');
{
  reset(TP());
  addTilePanel();
  chk('в сборке ровно шесть моделей, а не семь', models.length === 6, models.length);
  const seen = new Set();
  for(const m of models) seen.add(m.params.tlIX + ':' + m.params.tlIZ);
  chk('номера покрывают всё панно без повторов', seen.size === 6 &&
      [...seen].sort().join(',') === '0:0,0:1,1:0,1:1,2:0,2:1', [...seen].sort());
  chk('у каждой плитки размер панно тот же', models.every(m => m.params.tlNX === 3 && m.params.tlNZ === 2));
  chk('у каждой есть своя сетка', models.every(m => m.rawTris && m.rawTris.length > 100),
      models.map(m => (m.rawTris||[]).length));
  chk('и габарит', models.every(m => m.bbox));
  chk('место каждой отвечает её номеру', models.every(m => {
    const q = tilePanelPlan(paramState.box).at(m.params.tlIX, m.params.tlIZ);
    return Math.abs(m.px - q.px) < 1e-9 && Math.abs(m.pz - q.pz) < 1e-9;
  }), models.map(m => [m.params.tlIX, m.params.tlIZ, m.px, m.pz]));
  chk('имя называет номер и размер панно',
      models.some(m => m.name === 'плитка 3:2 из 3×2'), models.map(m => m.name));
}

console.log('=== шов: кромки соседей совпадают по высоте ===');
{
  /* СОБРАННОЕ ПАННО И ЕСТЬ ПАННО ПОСТРОИТЕЛЯ — вот единственное, что кнопка может сломать. Плитки по
     отдельности останутся безупречными при любой путанице в номерах; разойдётся только стык. Меряем
     профиль правой кромки левого соседа против левой кромки правого: у плитки ширина W, значит правая
     кромка стоит на местном x = +W/2, левая — на −W/2, и высоты в точках с одинаковым местным z обязаны
     совпасть ТОЖДЕСТВЕННО, а не примерно: у обеих плиток это одна и та же глобальная координата. */
  reset(TP({tlPattern:'flow', tlScale:70, tlAmp:5}));
  addTilePanel();
  const at = (ix, iz) => models.find(m => m.params.tlIX === ix && m.params.tlIZ === iz);
  const edgeProfile = (m, sign) => {
    const W = m.params.tlW, out = new Map();
    for(const T of m.rawTris) for(const v of T)
      if(Math.abs(v[0] - sign*W/2) < 1e-9){
        const k = v[2].toFixed(6);
        if(!out.has(k) || v[1] > out.get(k)) out.set(k, v[1]);
      }
    return out;
  };
  const A = edgeProfile(at(0,0), +1), B = edgeProfile(at(1,0), -1);
  // Правая кромка идёт вдоль Z, поэтому узлов на ней столько, сколько РЯДОВ сетки, а не столбцов.
  chk('на кромке есть с чем сравнивать', A.size === B.size && A.size > 30, {A:A.size, B:B.size});
  let miss = 0, worst = 0;
  for(const [k, y] of A){ if(!B.has(k)){ miss++; continue; } worst = Math.max(worst, Math.abs(B.get(k) - y)); }
  chk('узлы кромок совпали по z', miss === 0, miss);
  chk('и высоты совпали ТОЧНО, а не приблизительно', worst === 0, worst);
  // По вертикали то же самое: нижняя кромка верхнего соседа против верхней кромки нижнего.
  const edgeZ = (m, sign) => {
    const H = m.params.tlH, out = new Map();
    for(const T of m.rawTris) for(const v of T)
      if(Math.abs(v[2] - sign*H/2) < 1e-9){
        const k = v[0].toFixed(6);
        if(!out.has(k) || v[1] > out.get(k)) out.set(k, v[1]);
      }
    return out;
  };
  const C = edgeZ(at(0,0), +1), D = edgeZ(at(0,1), -1);
  let missZ = 0, worstZ = 0;
  for(const [k, y] of C){ if(!D.has(k)){ missZ++; continue; } worstZ = Math.max(worstZ, Math.abs(D.get(k) - y)); }
  chk('по вертикали узлы кромок тоже совпали', missZ === 0, missZ);
  chk('и высоты тоже точно', worstZ === 0, worstZ);
}
{
  /* А ЭТО КОНТРОЛЬНЫЙ ОПЫТ: если номера перепутать, шов разойдётся. Без него предыдущая проверка
     доказывала бы только то, что две плитки с одинаковым узором одинаковы. */
  reset(TP({tlPattern:'flow', tlScale:70, tlAmp:5}));
  addTilePanel();
  const wrong = models.find(m => m.params.tlIX === 2 && m.params.tlIZ === 0);
  const right = models.find(m => m.params.tlIX === 0 && m.params.tlIZ === 0);
  const edge = (m, sign) => { const W = m.params.tlW, out = new Map();
    for(const T of m.rawTris) for(const v of T) if(Math.abs(v[0] - sign*W/2) < 1e-9){
      const k = v[2].toFixed(6); if(!out.has(k) || v[1] > out.get(k)) out.set(k, v[1]); } return out; };
  const A = edge(right, +1), Z = edge(wrong, -1);
  let d = 0; for(const [k, y] of A) if(Z.has(k)) d = Math.max(d, Math.abs(Z.get(k) - y));
  chk('с ЧУЖИМ соседом шов расходится — значит проверка выше не пуста', d > 0.5, d);
}

console.log('=== отказы ===');
{
  /* «Сборка не трогается» — это не только «моделей не прибавилось». Панно 1×1 прошло бы всю раскладку
     без единой новой записи и при этом ПЕРЕИМЕНОВАЛО и ПЕРЕСТАВИЛО бы активную модель — работа
     впустую, зато с последствиями. Поэтому меряется и имя, и место. */
  { const nm = reset(TP({tlNX:1, tlNZ:1})).name;
    addTilePanel();
    chk('панно 1×1 — это просто плитка, сборка не трогается',
        models.length === 1 && models[0].name === nm && models[0].params.tlIX === 0,
        {n:models.length, name:models[0].name}); }
  { const nm = reset(TP({tlNX:8, tlNZ:8})).name;
    addTilePanel();
    chk('панно крупнее лимита моделей отказано, и сборка цела',
        models.length === 1 && models[0].name === nm, {n:models.length, name:models[0].name, max:MAX_MODELS}); }
  { const nm = reset({tlMode:'none'}).name;
    addTilePanel();
    chk('не на плитке кнопка ничего не делает',
        models.length === 1 && models[0].name === nm, {n:models.length, name:models[0].name}); }
}

console.log('=== кнопка на месте ===');
{
  chk('кнопка есть в разметке', SRC.indexOf('id="btn-add-panel"') >= 0);
  chk('и подписана панно', /btn-add-panel[\s\S]{0,400}?панно/.test(SRC));
  chk('обработчик привязан', /btn-add-panel[\s\S]{0,4000}?addEventListener\('click', addTilePanel\)/.test(SRC) ||
      SRC.indexOf("addEventListener('click', addTilePanel)") >= 0);
}

console.log((fail? 'FAIL ':'OK   ') + pass + ' passed, ' + fail + ' failed');
if(fail) process.exit(1);
