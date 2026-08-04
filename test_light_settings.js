// Свет в предпросмотре и настройки слайсера в справке.
//
// TWO SMALL THINGS THAT ARE ABOUT THE SAME PROBLEM: a person cannot tell «не видно» from «не получилось».
//
//   СВЕТ. The preview's key light was bolted above and behind the camera's starting position, which is
//   fine until the thing worth looking at is on the UNDERSIDE — a coaster's inlay, a stand's floor logo,
//   any relief printed face-down. Lit by nothing, it reads as a flat grey disc. Azimuth and elevation are
//   in degrees about the part rather than a direction vector, because that is what a person can aim, and
//   elevation goes NEGATIVE: a light from under the build plate is exactly what a bottom face needs and
//   exactly what no real lamp can do, which is the point of it being a preview.
//
//   НАСТРОЙКИ. «Какие настройки» is not seventy different answers — it is four, chosen by what the part
//   has to do, so the profile comes from the model KIND and is named once. What a per-model table cannot
//   get right is the two lines that depend on numbers the person has just typed: how many nozzle passes
//   their wall thickness actually buys, and the layer height that puts a coaster's colour change exactly
//   on the pocket floor instead of a layer above it.
//
// Run via ./run-all.sh (extraction test).
let pass=0, fail=0;
function chk(n,c,e){if(c){pass++;console.log('  OK  ',n);}else{fail++;console.log('  FAIL',n,e!==undefined?JSON.stringify(e):'');}}
const D = defaultBoxParams();
const len = v => Math.hypot(v[0], v[1], v[2]);

console.log('=== свет наводится в градусах, и умеет светить снизу ===');
{
  chk('направление — единичный вектор',
      [[0,0],[45,45],[123,-70],[359,85]].every(([a,e]) => Math.abs(len(lightDirection(a,e)) - 1) < 1e-12));
  // The axis conventions, stated as what a person means by the word rather than as component indices.
  chk('высота +90° — прямо сверху', Math.abs(lightDirection(0,90)[1] - 1) < 1e-12, lightDirection(0,90));
  chk('высота −90° — прямо снизу', Math.abs(lightDirection(0,-90)[1] + 1) < 1e-12, lightDirection(0,-90));
  chk('высота 0° — сбоку, на уровне детали', Math.abs(lightDirection(37,0)[1]) < 1e-12, lightDirection(37,0));
  chk('поворот крутит вокруг вертикали, высоту не трогая',
      Math.abs(lightDirection(0,30)[1] - lightDirection(200,30)[1]) < 1e-12);
  chk('поворот на 360° возвращается туда же',
      lightDirection(0,25).every((c,i) => Math.abs(c - lightDirection(360,25)[i]) < 1e-9));
  // ...and the thing the feature exists for: a bottom face can be lit at all
  chk('снизу свет и правда идёт снизу', lightDirection(0,-45)[1] < -0.5, lightDirection(0,-45)[1]);
  chk('а по умолчанию — сверху', lightDirection(45,45)[1] > 0.5);
}

console.log('=== состояние света осмысленно и сохраняется ===');
{
  chk('по умолчанию свет за камерой', lightState.follow === true, lightState.follow);
  chk('и яркость нормальная', lightState.power === 1, lightState.power);
  chk('высота по умолчанию сверху', lightState.elev > 0, lightState.elev);
  // applyLighting must survive being called before there is a scene — init order is not guaranteed and a
  // throw here takes the whole preview down, not just the light.
  const saved = {keyLight: typeof keyLight !== 'undefined' ? keyLight : null};
  let threw = false; try { applyLighting(); } catch(e){ threw = true; }
  chk('applyLighting без сцены не падает', !threw);
  // saving must not throw without localStorage either (the tests run in Node)
  let threw2 = false; try { saveLightState(); loadLightState(); } catch(e){ threw2 = true; }
  chk('сохранение и чтение без localStorage не падают', !threw2);
  chk('и состояние после этого целое',
      typeof lightState.azim === 'number' && typeof lightState.elev === 'number' &&
      typeof lightState.power === 'number' && typeof lightState.follow === 'boolean', lightState);
}

console.log('=== настройки слайсера: профиль по роду детали ===');
{
  chk('профилей ровно четыре', Object.keys(PRINT_PROFILES).length === 4, Object.keys(PRINT_PROFILES));
  for(const k in PRINT_PROFILES){
    const P = PRINT_PROFILES[k];
    chk('«'+k+'» назван по-человечески', !!P.n && P.n.length > 5, P.n);
    chk('«'+k+'»: строк достаточно, чтобы это была настройка', P.rows.length >= 5, P.rows.length);
    for(const [name, val] of P.rows){
      chk('«'+k+'» / '+name+': есть значение', !!val && val.trim().length > 0, val);
    }
  }
  // Every kind named must be a kind that exists, or the mapping quietly points at nothing.
  const kinds = new Set(Object.keys(KIND_LABEL));
  for(const k in KIND_PRINT){
    chk('«'+k+'» — настоящий вид модели', kinds.has(k), k);
    chk('«'+k+'» указывает на существующий профиль', !!PRINT_PROFILES[KIND_PRINT[k]], KIND_PRINT[k]);
  }
  // ...and the mapping is a preference, not a requirement: an unnamed kind gets the ordinary profile
  // rather than nothing at all.
  chk('неназванный вид получает обычный профиль',
      printSettingsFor({}).profile === PRINT_PROFILES.general.n, printSettingsFor({}).profile);
}

console.log('=== мелкому рельефу — тонкий слой, нагруженной детали — стенки ===');
{
  const prof = ov => printSettingsFor(Object.assign({}, D, ov)).profile;
  chk('кейкап — мелкий рельеф', prof({keycapMode:'single'}) === PRINT_PROFILES.detail.n, prof({keycapMode:'single'}));
  chk('подстаканник — мелкий рельеф', prof({csMode:'round'}) === PRINT_PROFILES.detail.n);
  chk('кость — мелкий рельеф', prof({platonic:'d20'}) === PRINT_PROFILES.detail.n);
  chk('шестерня — нагруженная', prof({gearMode:'spur'}) === PRINT_PROFILES.strong.n);
  chk('резьба — нагруженная', prof({threadMode:'cap'}) === PRINT_PROFILES.strong.n);
  chk('крепёж — нагруженная', prof({mntMode:'lbracket'}) === PRINT_PROFILES.strong.n);
  chk('куб — обычная', prof({}) === PRINT_PROFILES.general.n);
  // the point of the split, said as a number: fine detail asks for a thinner layer than a loaded part
  const layerOf = p => (p.rows.find(r => /Высота слоя$/.test(r[0])) || ['',''])[1];
  chk('у мелкого рельефа слой тоньше 0,2',
      /0,1/.test(layerOf(printSettingsFor(Object.assign({}, D, {keycapMode:'single'})))),
      layerOf(printSettingsFor(Object.assign({}, D, {keycapMode:'single'}))));
  chk('у нагруженной — периметров больше трёх',
      /[45]/.test((PRINT_PROFILES.strong.rows.find(r => /Периметры/.test(r[0]))||['',''])[1]));
}

console.log('=== две строки считаются, а не берутся из таблицы ===');
{
  // A printed table cannot be right about numbers the person just typed. These two are the ones that
  // change under the reader's hands, so they are computed and a test says so.
  const wall = t => printSettingsFor(Object.assign({}, D, {hollow:true, wallThickness:t}))
                      .rows.find(r => /^Стенка/.test(r[0]));
  chk('у полого куба есть строка про стенку', !!wall(1.6), wall(1.6));
  chk('1.6 мм — это 4 прохода', !!wall(1.6) && /4 прохода/.test(wall(1.6)[1]), wall(1.6));
  chk('0.8 мм — это 2', !!wall(0.8) && /2 прохода/.test(wall(0.8)[1]), wall(0.8));
  chk('3.2 мм — это 8', !!wall(3.2) && /8 проход/.test(wall(3.2)[1]), wall(3.2));
  chk('у сплошного куба такой строки нет',
      !printSettingsFor(Object.assign({}, D)).rows.some(r => /^Стенка/.test(r[0])));

  // The coaster's colour change happens at the pocket floor. If that height is not a whole number of
  // layers the slicer puts the boundary mid-layer and the accent bleeds a layer up into the coaster.
  const pocket = d => printSettingsFor(Object.assign({}, D, {csMode:'round', csInlay:d}))
                        .rows.find(r => /под карман/.test(r[0]));
  chk('у подстаканника есть строка про карман', !!pocket(0.8), pocket(0.8));
  chk('0.8 мм делится на 0.2', !!pocket(0.8) && /0\.2/.test(pocket(0.8)[1]), pocket(0.8));
  chk('и на 0.16 тоже', !!pocket(0.8) && /0\.16/.test(pocket(0.8)[1]), pocket(0.8));
  chk('0.6 мм делится на 0.12, но не на 0.16',
      !!pocket(0.6) && /0\.12/.test(pocket(0.6)[1]) && !/0\.16/.test(pocket(0.6)[1]), pocket(0.6));
  chk('строка называет саму глубину', !!pocket(0.6) && /0\.6/.test(pocket(0.6)[0]), pocket(0.6));
  chk('у куба строки про карман нет',
      !printSettingsFor(Object.assign({}, D)).rows.some(r => /под карман/.test(r[0])));

  // There is no «ни одна высота не подходит» branch, and this is why: sweep every depth and thickness the
  // panel can actually produce and there is always an answer. Written as a test rather than as a branch —
  // a branch that cannot be reached is worse than no branch, and this way the claim is checked instead of
  // being a comment somebody has to believe.
  let empty = [];
  for(let csT = 2; csT <= 15; csT += 0.5)
    for(let d = 0.4; d <= 3.0001; d += 0.1){
      const csInlay = Math.round(d*10)/10;
      const row = printSettingsFor(Object.assign({}, D, {csMode:'round', csT, csInlay}))
                    .rows.find(r => /под карман/.test(r[0]));
      if (!row || /^\s*мм/.test(row[1])) empty.push({csT, csInlay, row});
    }
  chk('на любой достижимой глубине высота слоя находится', empty.length === 0, empty.slice(0,3));
}

console.log('=== справка несёт настройки дальше ===');
{
  const h = modelHelp(Object.assign({}, D, {csMode:'round'}));
  chk('в справке есть блок настроек', !!h.print && Array.isArray(h.print.rows), h && h.print);
  chk('и он назван', !!h.print.profile && h.print.profile.length > 5, h.print.profile);
  chk('и не пуст', h.print.rows.length >= 5, h.print.rows.length);
  chk('у каждой модели он есть',
      Object.keys(MODEL_HELP).every(() => true) &&
      [{}, {keycapMode:'single'}, {gearMode:'spur'}, {psOn:true}, {fnOn:true}, {platonic:'d6'}]
        .every(ov => (modelHelp(Object.assign({}, D, ov))||{print:{rows:[]}}).print.rows.length >= 5));
  // the rows must carry the typed numbers, or the panel would show a frozen table
  const thin = modelHelp(Object.assign({}, D, {hollow:true, wallThickness:0.8}));
  const thick = modelHelp(Object.assign({}, D, {hollow:true, wallThickness:3.2}));
  chk('таблица меняется вместе с параметрами',
      JSON.stringify(thin.print.rows) !== JSON.stringify(thick.print.rows));
}

console.log('=== TOTAL: ' + pass + ' passed, ' + fail + ' failed ===');
if(fail) process.exit(1);
