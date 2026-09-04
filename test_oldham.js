// Муфта Олдхэма: две ступицы с шипами и диск-поводок с пазами крест-накрест.
//
// Единственная деталь набора, которая существует ТОЛЬКО ПАРОЙ: ступица без диска бессмысленна, а
// проверять их порознь — значит не проверять главного. Поэтому здесь всё сводится к трём вопросам:
//
//   1. СХОДЯТСЯ ЛИ ШИП И ПАЗ. Обе детали строятся из одного набора чисел, и зазор обязан оказаться
//      ровно тем, что заказан, — не вдвое, не вдвое меньше. Меряется по ДВУМ СЕТКАМ: наибольшая
//      полуширина шипа против наименьшей полуширины паза. Каждая деталь по отдельности при любой
//      ошибке выглядит безупречно.
//
//   2. ИДЁТ ЛИ РАСТОЧКА СКВОЗЬ ШИП. Первая редакция строила шип без отверстия: расточка выходила
//      ГЛУХОЙ, шип накрывал её крышей, и собственная мера пролёта показывала на этой крыше мост во
//      весь диаметр вала. Сетка при этом герметична, габарит верен, вал просто некуда вставить.
//
//   3. ЧИСЛА, РАДИ КОТОРЫХ МУФТУ И СТАВЯТ. Люфт равен 4·зазор/Ø и на Ø40 при зазоре 0.2 больше
//      градуса — это цена вопроса на ходовом винте. Скольжение в пазу равно ПОЛНОМУ смещению осей, а
//      центр диска ходит по кругу радиусом в половину смещения и с УДВОЕННОЙ частотой вала: отсюда
//      предел муфты по оборотам, и ошибиться здесь вдвое проще всего.

let pass=0,fail=0; function chk(n,c,e){if(c){pass++;console.log('  OK  ',n);}else{fail++;console.log('  FAIL',n,e!==undefined?JSON.stringify(e):'');}}
function B(ov){ logos.length=0; boxHoles.length=0; dieFaces.length=0;
  Object.assign(paramState.box, defaultBoxParams(), {gfBaseplate:false, gearMode:'oldham'}, ov);
  return buildTrisForShape('box', paramState.box); }
const P = ov => Object.assign(defaultBoxParams(), {gfBaseplate:false, gearMode:'oldham'}, ov);
const S = ov => oldhamSpec(P(ov));
const warn = ov => collectPrintWarnings(P(ov)) || [];
const near = (a,b,t) => Math.abs(a-b) <= t;
function winding(t,x,y,z){ let w=0;
  for(const T of t){ const [a,b,c]=T;
    const d1=(b[0]-a[0])*(z-a[2])-(b[2]-a[2])*(x-a[0]);
    const d2=(c[0]-b[0])*(z-b[2])-(c[2]-b[2])*(x-b[0]);
    const d3=(a[0]-c[0])*(z-c[2])-(a[2]-c[2])*(x-c[0]);
    if(!((d1>=0&&d2>=0&&d3>=0)||(d1<=0&&d2<=0&&d3<=0))) continue;
    const A=(b[0]-a[0])*(c[2]-a[2])-(b[2]-a[2])*(c[0]-a[0]); if(Math.abs(A)<1e-12) continue;
    const w1=((b[0]-x)*(c[2]-z)-(b[2]-z)*(c[0]-x))/A, w2=((c[0]-x)*(a[2]-z)-(c[2]-z)*(a[0]-x))/A;
    if(w1*a[1]+w2*b[1]+(1-w1-w2)*c[1] < y) continue;
    const u=[b[0]-a[0],b[1]-a[1],b[2]-a[2]], v=[c[0]-a[0],c[1]-a[1],c[2]-a[2]];
    w += ((u[2]*v[0]-u[0]*v[2])>0)?1:-1; }
  return w; }

console.log('=== шип и паз сходятся: зазор ровно тот, что заказан ===');
/* МЕРЯЕТСЯ ПО ДВУМ СЕТКАМ, А НЕ ПО ОДНОМУ ЧИСЛУ СПЕЦИФИКАЦИИ: числу поверить — значит поверить и
   ошибке, если она сидит в самом числе. Шип — полоса |x| ≤ tW/2; паз в диске — просвет между ушами,
   то есть |x| ≥ hs. Разница и есть зазор на сторону. */
for (const ov of [{}, {oldGap:0.05}, {oldGap:1}, {oldD:120, oldTenonW:30}, {oldD:10, oldBore:2, oldTenonW:2}]){
  const s = S(ov);
  const hub = B(Object.assign({oldPart:'hub'}, ov)), disc = B(Object.assign({oldPart:'disc'}, ov));
  let tenonHalf = 0;                                            // наибольшее |x| в шипе
  for (const T of hub) for (const v of T)
    if (v[1] > s.hubT - s.hubH/2 + 0.1) tenonHalf = Math.max(tenonHalf, Math.abs(v[0]));
  let slotHalf = Infinity;                                      // наименьшее |x| в верхних ушах
  for (const T of disc) for (const v of T)
    if (v[1] > s.discT/2 - s.slotD + 0.1) slotHalf = Math.min(slotHalf, Math.abs(v[0]));
  chk('зазор на сторону = ' + s.gap + ': ' + JSON.stringify(ov), near(slotHalf - tenonHalf, s.gap, 1e-9),
      {шип:tenonHalf, паз:slotHalf, вышло:slotHalf - tenonHalf, заказано:s.gap});
  chk('  и шип ровно заказанной ширины', near(2*tenonHalf, s.tW, 1e-9), {вышло:2*tenonHalf, спец:s.tW});
}

console.log('\n=== пазы диска идут КРЕСТ-НАКРЕСТ ===');
{
  const s = S({}), disc = B({oldPart:'disc'});
  let topX = Infinity, botZ = Infinity, topXmax = 0, botZmax = 0, topZ = 0, botX = 0;
  for (const T of disc) for (const v of T){
    if (v[1] > s.discT/2 - s.slotD + 0.1){ topX = Math.min(topX, Math.abs(v[0]));
      topXmax = Math.max(topXmax, Math.abs(v[0])); topZ = Math.max(topZ, Math.abs(v[2])); }
    if (v[1] < -s.discT/2 + s.slotD - 0.1){ botZ = Math.min(botZ, Math.abs(v[2]));
      botZmax = Math.max(botZmax, Math.abs(v[2])); botX = Math.max(botX, Math.abs(v[0])); }
  }
  /* УХО ПРОСТИРАЕТСЯ ДО R ПО СВОЕЙ ОСИ, А ПОПЕРЁК — ДО ПОЛОВИНЫ ХОРДЫ, то есть до √(R²−hs²), а вовсе
     не до R: дуга уха идёт лишь по тем углам, где |x| ≥ hs. Первая редакция этой проверки ждала
     поперёк R и была неправа — ошибка в ожидании, а не в детали. */
  const chord = Math.sqrt(s.R*s.R - s.hs*s.hs);
  chk('верхний паз идёт вдоль Z (уши разведены по X)',
      near(topX, s.hs, 1e-9) && near(topXmax, s.R, 0.05) && near(topZ, chord, 0.05),
      {топX:topX, топXmax:topXmax, топZ:topZ, hs:s.hs, R:s.R, хорда:chord});
  chk('нижний паз идёт вдоль X (уши разведены по Z)',
      near(botZ, s.hs, 1e-9) && near(botZmax, s.R, 0.05) && near(botX, chord, 0.05),
      {низZ:botZ, низZmax:botZmax, низX:botX, хорда:chord});
  chk('  то есть пазы перпендикулярны — иначе муфта не поводок, а шайба', near(topX, botZ, 1e-12));
  chk('толщина диска = два паза плюс сердцевина', near(s.discT, 2*s.slotD + s.core, 1e-12), s.discT);
  chk('  и габарит сетки это подтверждает',
      near(computeBBox(disc).maxY - computeBBox(disc).minY, s.discT, 1e-6));
  chk('глубина паза больше высоты шипа на зазор — шип не достаёт до дна',
      near(s.slotD, s.tH + s.gap, 1e-12), s.slotD);
}

console.log('\n=== расточка идёт СКВОЗЬ шип, а не упирается в него ===');
{
  const s = S({}), hub = B({oldPart:'hub'}), yB = -s.hubH/2;
  chk('на оси в подошве материала нет', winding(hub, 0.3, yB + 1, 0.2) === 0);
  chk('на оси В ШИПЕ материала тоже нет — расточка сквозная',
      winding(hub, 0.3, yB + s.hubT + 1, 0.2) === 0, winding(hub, 0.3, yB + s.hubT + 1, 0.2));
  chk('  а рядом с расточкой, в теле шипа, материал есть',
      winding(hub, s.bore/2 + (s.tW/2 - s.bore/2)/2, yB + s.hubT + 1, 0.2) === 1);
  /* И ЧТО МЕРА ПРОЛЁТА НЕ НАХОДИТ КРЫШИ НАД РАСТОЧКОЙ: глухая расточка давала мост во весь Ø вала. */
  chk('моста в ступице нет', bridgeSpec(hub, P({oldPart:'hub'})).span === 0,
      bridgeSpec(hub, P({oldPart:'hub'})));
  chk('  и обдувать мосты ступице не советуют',
      !partProfileRows(P({oldPart:'hub'}), hub).some(r => r[0].indexOf('Обдув') === 0));
  /* А У ДИСКА МОСТ НАСТОЯЩИЙ — крыша нижнего паза, — и он должен быть ШИРИНОЙ С ПАЗ. Ради него шип и
     отдан ступице: диск с шипами на обеих гранях на стол не лёг бы вовсе. */
  const disc = B({oldPart:'disc'}), br = bridgeSpec(disc, P({oldPart:'disc'}));
  chk('у диска мост есть, и он шириной с паз', near(br.span, 2*s.hs, br.cell*1.5), {мост:br.span, паз:2*s.hs});
  chk('  и он лежит на высоте крыши нижнего паза',
      near(br.height, -s.discT/2 + s.slotD, s.slotD*0.5), {высота:br.height, крыша:-s.discT/2 + s.slotD});
}

console.log('\n=== числа, ради которых муфту и ставят ===');
{
  const s = S({});
  chk('люфт = 4·зазор/Ø в градусах', near(s.backlash, 4*s.gap/(2*s.R)*180/Math.PI, 1e-12) &&
      near(s.backlash, 1.146, 0.001), s.backlash);
  chk('  вдвое больший зазор — вдвое больший люфт', near(S({oldGap:0.4}).backlash, 2*s.backlash, 1e-12));
  chk('  вдвое больший Ø — вдвое меньший люфт', near(S({oldD:80}).backlash, s.backlash/2, 1e-12));
  chk('  и он назван в предупреждениях', warn({}).some(w => w.indexOf('люфт 1.15°') > 0), warn({})[0]);
  /* СКОЛЬЖЕНИЕ РАВНО ПОЛНОМУ СМЕЩЕНИЮ, А ОРБИТА — ПОЛОВИНЕ. Перепутать их вдвое — самое лёгкое
     здесь заблуждение, поэтому проверяется и то, и другое, и вместе. */
  chk('скольжение в пазу = полное смещение', near(S({oldOffset:5}).off, 5, 1e-12));
  chk('орбита центра диска = половина смещения', near(S({oldOffset:5}).orbit, 2.5, 1e-12));
  chk('  то есть орбита ровно вдвое меньше скольжения',
      near(S({oldOffset:5}).off, 2*S({oldOffset:5}).orbit, 1e-12));
  chk('  и сказано про УДВОЕННУЮ частоту вала', warn({}).some(w => w.indexOf('УДВОЕННОЙ частотой') > 0));
  chk('зацепление = Ø минус смещение', near(S({oldOffset:5}).eng, 40 - 5, 1e-12));
  chk('момент падает вместе с зацеплением', S({oldOffset:20}).torque < S({oldOffset:0}).torque);
  chk('  и как КВАДРАТ зацепления', near(S({oldOffset:0}).torque/S({oldOffset:20}).torque,
      Math.pow(40/20, 2), 1e-9), S({oldOffset:0}).torque/S({oldOffset:20}).torque);
  chk('момент берёт τ у выбранного пластика, а не у зашитого',
      S({printMat:'petg'}).torque < S({printMat:'pla'}).torque &&
      near(S({printMat:'petg'}).torque/S({printMat:'pla'}).torque, 20/25, 1e-9),
      {petg:S({printMat:'petg'}).torque, pla:S({printMat:'pla'}).torque});
  chk('  и сказано, чего модель не знает',
      warn({}).some(w => w.indexOf('не знает ни спекания слоёв') > 0));
  chk('  и что сдаётся муфта обычно на посадке, а не на шипе',
      warn({}).some(w => w.indexOf('на посадке ступицы на вал') > 0));
  chk('сказано, что ступиц нужно ДВЕ', warn({}).some(w => w.indexOf('печатайте ДВЕ') > 0));
}

console.log('\n=== зажимы срабатывают там, где надо, и молчат, где не надо ===');
{
  chk('шип уже вала поднят до вала плюс мясо с боков',
      near(S({oldTenonW:6, oldBore:8}).tW, 8 + 2*OLDHAM_TENON_LAND, 1e-12), S({oldTenonW:6, oldBore:8}).tW);
  chk('  и об этом сказано', warn({oldTenonW:6, oldBore:8}).some(w => w.indexOf('ширина шипа поднята') === 0));
  chk('  а нормальный шип не трогают', !S({}).tenonCut && S({}).tW === 12);
  chk('смещение больше возможного обрезается', S({oldOffset:60}).offCut && S({oldOffset:60}).off < 60);
  chk('  и зацепление остаётся положительным', S({oldOffset:60}).eng > 0);
  chk('  а обычное смещение не трогают', !S({}).offCut && S({}).off === 2);
  chk('тонкая сердцевина названа местом излома',
      S({oldCore:1}).thinCore && warn({oldCore:1}).some(w => w.indexOf('ломается пополам') > 0));
  chk('широкий шип назван съедающим диск',
      S({oldTenonW:30}).wideTenon && warn({oldTenonW:30}).some(w => w.indexOf('шире трети') > 0));
  chk('тонкая стенка ступицы у расточки названа',
      S({oldD:10, oldBore:8}).boreThin && warn({oldD:10, oldBore:8}).some(w => w.indexOf('разорвёт на валу') > 0));
  chk('  а на умолчаниях ничего из этого не говорят',
      !S({}).thinCore && !S({}).wideTenon && !S({}).boreThin && !S({}).tenonCut && !S({}).offCut);
}

console.log('\n=== сетки герметичны на всём поле ===');
{
  const sets = [];
  for (const part of ['hub','disc']) for (const bore of [2, 8, 60]) for (const hubT of [2, 8, 60])
    for (const tW of [2, 12, 60]) for (const tH of [1, 4, 30]) for (const core of [1, 4, 40])
      for (const gap of [0.05, 0.2, 1])
        sets.push({oldPart:part, oldD:40, oldBore:bore, oldHubT:hubT, oldTenonW:tW,
                   oldTenonH:tH, oldCore:core, oldGap:gap});
  for (const part of ['hub','disc']) for (const D of [10, 25, 200]) for (const off of [0, 2, 60])
    sets.push({oldPart:part, oldD:D, oldOffset:off});
  let bad = 0, vol = 0, first = null;
  for (const ov of sets){
    const t = B(ov), m = manifoldCheck(t);
    if (!m.watertight || !t.length){ bad++; if (!first) first = {ov, m}; }
    if (!(meshVolume(t) > 0)){ vol++; if (!first) first = {ov, объём:meshVolume(t)}; }
  }
  chk('все ' + sets.length + ' наборов краёв панели герметичны', bad === 0, first);
  chk('  и у всех положительный объём', vol === 0, first);
  const w = sets.map(ov => warn(ov).join(' '));
  chk('  и ни в одном предупреждении нет Infinity или NaN',
      !w.some(t => /Infinity|NaN/.test(t)), w.find(t => /Infinity|NaN/.test(t)));
}

console.log('\n=== муфта вписана в семью ===');
{
  const p = P({});
  chk('семья опознаётся как шестерня', dominantMode(p) === 'gear', dominantMode(p));
  B({}); chk('строка формы называет ступицу', activeShapeLabel() === 'муфта Олдхэма: ступица', activeShapeLabel());
  B({oldPart:'disc'});
  chk('  и диск — диском', activeShapeLabel() === 'муфта Олдхэма: диск', activeShapeLabel());
  chk('  и числа зубьев к ней не приписывают', activeShapeLabel().indexOf('зуб.') < 0);
  chk('справка есть и говорит про постоянную скорость',
      !!MODEL_HELP['gear:oldham'] && MODEL_HELP['gear:oldham'].what.indexOf('БЕЗ колебаний') > 0);
  chk('  и объясняет, почему шип у ступицы, а паз у диска',
      MODEL_HELP['gear:oldham'].how.indexOf('на стол не ложится') > 0);
  chk('плитка подрежима есть', subModelTiles('gear').some(t => t.v === 'oldham'));
  chk('строки панели прячутся у других подрежимов',
      ['oldPart','oldD','oldBore','oldHubT','oldTenonW','oldTenonH','oldCore','oldGap','oldOffset']
        .every(k => { const r = SHAPE_PARAMS.box.find(q => q.key === k);
                      return r && Array.isArray(r.w) && r.w.length === 1 && r.w[0] === 'oldham'; }));
  chk('у других подрежимов про Олдхэма не говорят',
      !(collectPrintWarnings(Object.assign(defaultBoxParams(), {gfBaseplate:false, gearMode:'spur'})) || [])
        .some(w => w.indexOf('Олдхэм') === 0));
  chk('«сброс всего» выключает муфту',
      !pickedOn(Object.assign(defaultBoxParams(), {gfBaseplate:false}), 'gearMode'));
}

console.log('\n=== TOTAL:', pass, 'passed,', fail, 'failed ===');
if (fail) process.exitCode = 1;
