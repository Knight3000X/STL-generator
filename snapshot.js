// СЛЕПОК: ПОЛНЫЙ ПЕРЕБОР НАБОРОВ И ТО, ЧТО ПРИЛОЖЕНИЕ НА НИХ ОТВЕЧАЕТ.
//
// Это не проверка, а МЕРА СЛЕДА: она не говорит, верен ли ответ, — она говорит, ИЗМЕНИЛСЯ ли он и у
// каких наборов. Гоняется дважды, до правки и после, и файлы сравниваются по полям (`snapshot-diff.py`).
// Правка, которая ничего не должна была задеть, обязана дать ноль различий; правка с намерением —
// различия РОВНО там, где намерение было.
//
// ЗАЧЕМ ОНА, ЕСЛИ ЕСТЬ СТО СОРОК ДЕВЯТЬ ФАЙЛОВ ПРОВЕРОК. Проверки смотрят на то, что автор догадался
// проверить. Слепок смотрит на всё сразу. За один выпуск (v25.48.0) он поймал три вещи, которых не
// нашла вся батарея: сдвиг 208 замеров пролёта побочным действием чужой правки, возврат схлопывания
// касаний, объявленного мёртвым, и разрыв в правиле периметров, где совет прыгал с восьми на три от
// восьми сотых прохода.
//
// ПОЧЕМУ ОН ЛЕЖИТ В РЕПОЗИТОРИИ. До этого выпуска оба сценария жили в черновиках контейнера. Контейнер
// за одну сессию перезапустился, снятый слепок пропал, а сами сценарии уцелели случайно — при том что
// `README.md` и `VERSION.md` ссылаются на слепок как на метод восемнадцать раз. Решающий инструмент
// проекта существовал ровно до следующей уборки, и восстановить его было бы неоткуда.
//
// ПЕРЕБОР ЗДЕСЬ ОДИН НА ВСЕХ, И ЭТО ГЛАВНОЕ, ЧТО ДАЁТ ЭТОТ ФАЙЛ ПОМИМО СОХРАННОСТИ. Всякая перепись,
// написавшая свой перебор, оказывается у́же слепка — и обобщает с него. За ту же сессию так вышло
// ТРИЖДЫ, и из этого вышли все три неверных вывода: «крест мальтийского перекрывается» (перебор шёл по
// семьям, а деталь односкорлупная — врал эталон), «схлопывание касаний мертво» (156 наборов при
// УМОЛЧАНИЯХ; случай требовал сочетания ручек и нашёлся тремя наборами из тысячи), «зажим тронет
// четыре набора» (155 семей; на полном переборе — 676). Ошибка была не в замере, а в том, что вывод
// делался шире перебора. Поэтому `setsFamilies`, `setsPart` и `setsExtra` живут здесь, и любая перепись
// берёт их отсюда, а не пишет заново.
//
// КАК ГОНЯТЬ:   node snapshot.js part  <файл>      — 3948 наборов, широкий перебор
//               node snapshot.js extra <файл>      — 1196 наборов, семьи и их собственные ручки
//               ./snapshot-run.sh <коммит-ДО>      — снимет оба, до и после, и сверит
//
// ЧТО ЗАПИСЫВАЕТСЯ на каждый набор: сетка (число треугольников и свёртка вершин), строка формы,
// числа спецификаций, слой советов по печати и тексты предупреждений. Числа советов округлены до
// сотых: слепок сверяется побайтово, и болтанка в пятнадцатом знаке сделала бы его бесполезным.
const fsS = require('fs');
const MODE = process.argv[2] || 'part';
const OUT  = process.argv[3] || ('/tmp/snapshot-' + MODE + '.txt');

function setP(ov){
  logos.length = 0; boxHoles.length = 0;
  if (typeof dieFaces !== 'undefined') dieFaces.length = 0;
  const holes = ov.__holes || null; ov = Object.assign({}, ov); delete ov.__holes;
  Object.assign(paramState.box, defaultBoxParams(), {gfBaseplate:false, logo3d:false}, ov);
  if (holes) for (const h of holes){ const c = Object.assign({}, h); boxHoles.push(c); clampHoleToFace(c); }
  return paramState.box;
}
const rowOf = k => SHAPE_PARAMS.box.find(r => r.key === k);
/* Значения подрежимов берутся у ПАНЕЛИ, а не выписываются по памяти: выписанный по памяти список
   молча пропустил бы подрежим, а слепок обязан покрыть все. */
const optsOf = k => ((rowOf(k) || {}).options || []).map(o => o.v).filter(v => v && v !== 'none');
/* И ЧИСЛА РУЧЕК — ТОЖЕ У ПАНЕЛИ: край, умолчание, край. Выписанные по памяти, они норовят уехать за
   предел строки, и тогда слепок меряет то, чего ни один ползунок не выдаёт. */
const triOf = k => { const r = rowOf(k) || {}; return [r.min, r.default, r.max].filter(v => v != null); };
const actOf = k => Object.assign({}, (FAMILIES.find(f => f.key === k) || {act:{}}).act);
const round = v => Math.abs(v) < 5e-7 ? 0 : +v.toFixed(6);
const hash = s => { let h1 = 0x811c9dc5, h2 = 1;
  for (let i = 0; i < s.length; i++){ h1 = (h1 ^ s.charCodeAt(i)) * 16777619 >>> 0; h2 = (h2 + h1) >>> 0; }
  return h1.toString(16) + '-' + h2.toString(16) + '-' + s.length; };

/* ВСЕ СЕМЬИ И ВСЕ ИХ ПОДРЕЖИМЫ — самый частый перебор, и потому он вынесен отдельно: любая перепись
   должна брать ЕГО, а не писать свой. Подрежимы читаются у строки панели, а не по памяти. */
function setsFamilies(){
  const sets = [];
  const add = (name, ov) => sets.push([name, ov]);

  for (const f of FAMILIES){
    const act = f.act || {};
    add('семья:' + f.key, act);
    const keys = Object.keys(act);
    if (keys.length !== 1) continue;
    const row = rowOf(keys[0]);
    if (!row || row.type !== 'select') continue;
    for (const o of (row.options || [])){
      if (!o.v || o.v === 'none') continue;
      const ov = {}; ov[keys[0]] = o.v;
      add('семья:' + f.key + ':' + o.v, ov);
    }
  }
  return sets;
}

/* ШИРОКИЙ ПЕРЕБОР: семьи и подрежимы, все пути решётки, крепёж, шестерни, органайзер,
   корпус, цепь, футляр, наборы под разбор пар «спецификация + построитель» и под сорок копий. */
function setsPart(){
  /* «УМОЛЧАНИЯ» СТОЯТ ПЕРВЫМИ, и это не косметика: порядок наборов — часть слепка, файлы сверяются
     построчно. Собирая этот файл из двух черновых сценариев, я этот набор потерял — перебор выдал
     3947 вместо 3948, и поймала это проверка на сам перебор, а не глаз. */
  const sets = [['умолчания', {}]].concat(setsFamilies());
  const add = (name, ov) => sets.push([name, ov]);
  // ---- РЕШЁТКА: все её пути (плоский полый, полигон, squircle) и все её ручки ----
  const LAT_BASE = [
    ['плоский полый',   {hollow:true}],
    ['полигон',         {hollow:true, polySides:6}],
    ['squircle',        {hollow:true, squircle:60}],
  ];
  /* Три профиля ручек вместо полного произведения: числа, которые правятся, недостижимы ни при одном
     наборе, поэтому слепку нужна ШИРИНА (все пути и все подрежимы), а не глубина по каждой ручке. */
  const LAT_PROFILES = [
    ['мелкий',   {latticeRib:0.3, latticeCell:2,  latticeBorder:1, latticeRes:10}],
    ['панельный',{latticeRib:1.6, latticeCell:10, latticeBorder:2, latticeRes:50}],
    ['крупный',  {latticeRib:4,   latticeCell:30, latticeBorder:6, latticeRes:80}],
  ];
  for (const [nm, base] of LAT_BASE)
    for (const on of [{latticeFloor:true}, {latticeWalls:'all'}, {latticeFloor:true, latticeWalls:'all'}])
      for (const [pn, prof] of LAT_PROFILES)
        for (const pat of ['diamond', 'square'])
          add('решётка:' + nm + ':' + Object.keys(on).join('+') + ':' + pn + ':' + pat,
              Object.assign({}, base, on, prof, {latticePattern:pat}));
  // лист со своим узором (у него свои ручки шага и перемычки, но border/res — общие)
  for (const cut of optsOf('sheetCut'))
    for (const pat of optsOf('sheetPattern'))
      for (const [border, res] of [[2, 50], [6, 200]])
          add('лист:' + cut + '/' + pat + ':' + border + '/' + res,
              Object.assign({sheetCut:cut, sheetPattern:pat, latticeBorder:border, latticeRes:res},
                            (FAMILIES.find(f => f.key === 'sheet') || {act:{}}).act));

  // ---- КРЕПЁЖ: все подрежимы против общих ручек ----
  for (const m of optsOf('mntMode'))
    for (const W of [10, 120])
      for (const t of [2, 12])
        for (const [A, B] of [[12, 12], [120, 90]])
          add('крепёж:' + m + ':' + W + '/' + t + '/' + A + '/' + B,
              {mntMode:m, mntW:W, mntT:t, mntLegA:A, mntLegB:B});

  // ---- ШЕСТЕРНИ ----
  for (const m of optsOf('gearMode'))
    for (const Z of [6, 60])
      for (const Zp of [6, 40])
        for (const th of [1, 30])
          add('шестерня:' + m + ':' + Z + '/' + Zp + '/' + th,
              {gearMode:m, gearTeeth:Z, planetTeeth:Zp, gearThick:th});

  // ---- ОРГАНАЙЗЕР, КОРПУС, ЦЕПЬ, ФУТЛЯР ----
  for (const back of optsOf('woBack'))
    for (const front of optsOf('woFront'))
      for (const sd of [10, 35, 120])
        add('органайзер:' + back + '/' + front + '/' + sd, {woBack:back, woFront:front, woShelfD:sd});
  for (const part of optsOf('pbPart'))
    for (const w of [40, 120])
      add('корпус:' + part + '/' + w, {pbPart:part, pbW:w});
  for (const n of [1, 12, 40]) add('цепь:' + n, {pipMode:'energy', ecLinks:n});
  for (const h of [2, 12, 60]) add('футляр:' + h, {pipMode:'box', pipBoxH:h});
  for (const [w, hgt, d] of [[10, 10, 10], [40, 40, 40], [200, 3, 200]])
    add('лого3d:' + w + '/' + hgt + '/' + d, {logo3d:true, width:w, height:hgt, depth:d});


  // ---- НАБОРЫ ПОД РАЗБОР 28 ПАР «спецификация + построитель» ----
  for (const prof of optsOf('keyProfile').slice(0, 6))
    for (const u of [1, 1.5, 6.25])
      for (const wall of [0.8, 1.3, 3])
        for (const plate of [1, 1.8, 4])
          add('кейкап:' + prof + ':' + u + '/' + wall + '/' + plate,
              {keycapMode:'single', keyProfile:prof, keySizeU:u, keyWall:wall, keyPlate:plate});
  for (const m of optsOf('threadMode').slice(0, 10))
    for (const w of [1.2, 2.5, 6])
      add('резьба:' + m + ':' + w, {threadMode:m, threadWall:w});
  for (const m of optsOf('gearMode'))
    for (const mod of [0.3, 2, 6])
      for (const pa of [14, 20, 30])
        for (const [pn, clr] of [[2, 0], [3, 0.25], [6, 1]])
          add('шестерня2:' + m + ':' + mod + '/' + pa + '/' + pn + '/' + clr,
              {gearMode:m, gearModule:mod, gearPA:pa, planetN:pn, gearPlanClear:clr});
  for (const th of [0.4, 3, 12])
    for (const rib of [0, 0.1, 4])
      for (const tex of [0.1, 0.6, 3])
        for (const ang of [10, 45, 80])
          add('лист2:' + th + '/' + rib + '/' + tex + '/' + ang,
              Object.assign({sheetThick:th, sheetPatRib:rib, sheetTexH:tex, sheetChamferAngle:ang, sheetChamfer:2},
                            (FAMILIES.find(f => f.key === 'sheet') || {act:{}}).act));
  for (const n of [1, 2, 4])
    for (const W of [10, 40, 200])
      add('уголок:' + n + '/' + W, {mntMode:'lbracket', mntHoleN:n, mntW:W, mntLegA:60, mntLegB:60});
  for (const mount of optsOf('hookMount'))
    for (const drop of [5, 16, 60])
      for (const sweep of [120, 230, 300])
        for (const [tw, td, tht] of [[30, 20, 3], [95, 85, 12], [200, 150, 40]])
          add('крючок:' + mount + ':' + drop + '/' + sweep + '/' + tw,
              {hookMount:mount, hookDrop:drop, hookSweep:sweep, hookTrayW:tw, hookTrayD:td, hookTrayH:tht});
  for (const back of optsOf('woBack'))
    for (const [W, t] of [[20, 3], [60, 5], [200, 12]])
      for (const [sd, st] of [[10, 2], [35, 4], [120, 10]])
        add('органайзер2:' + back + ':' + W + '/' + t + '/' + sd + '/' + st,
            {woBack:back, woFront:'shelf', woW:W, woT:t, woShelfD:sd, woShelfT:st});
  for (const c of [0.1, 0.35, 1])
    add('корпус2:' + c, {pbPart:'tray', pbClear:c});
  for (const x of [1, 3, 7]) for (const y of [1, 4, 7])
    add('базплейт:' + x + 'x' + y, {gfBaseplate:true, gfX:x, gfY:y});

  // ---- НАБОРЫ ПОД ЧЕТВЁРТЫЙ ЗАХОД: сорок копий вне поля зрения переписи ----
  /* Слепку нужна ШИРИНА по тем семьям, чьи выражения сводятся: каждая ручка, стоящая в копии,
     обязана попасть в набор хотя бы тремя своими значениями — краями и серединой. */
  for (const m of optsOf('fnMode'))
    for (const w of triOf('fnWall'))
      for (const sl of triOf('fnSpoutLen')) for (const ch of triOf('fnConeH'))
        add('воронка3:' + m + ':' + w + '/' + sl + '/' + ch,
            {fnOn:true, fnMode:m, fnWall:w, fnSpoutLen:sl, fnConeH:ch});
  for (const part of optsOf('vasePart'))
    for (const w of triOf('fnWall'))
      for (const bd of triOf('vaseBaseD'))
        add('ваза2:' + part + ':' + w + '/' + bd, {vaseOn:true, vasePart:part, fnWall:w, vaseBaseD:bd});
  for (const m of ['flat', 'clip', 'box', 'bagclip'])
    for (const L of triOf('pipLen'))
      for (const lt of triOf('pipLeafT'))
        for (const sd of triOf('pipScrewD'))
          add('петля2:' + m + ':' + L + '/' + lt + '/' + sd,
              {pipMode:m, pipLen:L, pipLeafT:lt, pipScrewD:sd});
  for (const m of optsOf('threadMode').slice(0, 10))
    for (const L of triOf('threadLen'))
      add('резьба2:' + m + ':' + L, {threadMode:m, threadLen:L});
  for (const L of triOf('gearWormLen'))
    for (const th of triOf('gearThick'))
      add('червяк:' + L + '/' + th, {gearMode:'worm', gearWormLen:L, gearThick:th});
  for (const af of triOf('hcAF')) add('соты:' + af, {hcOn:true, hcAF:af});
  for (const st of optsOf('hookStyle'))
    for (const bar of triOf('hookBar'))
      for (const reach of triOf('hookReach'))
        add('крючок2:' + st + ':' + bar + '/' + reach,
            {hookMount:'wall', hookStyle:st, hookBar:bar, hookReach:reach});
  for (const d of triOf('psDepth'))
    for (const lip of triOf('psLip'))
      for (const rest of triOf('psRest'))
        for (const slot of triOf('psSlot'))
          add('подставка2:' + d + '/' + lip + '/' + rest + '/' + slot,
              {psOn:true, psDepth:d, psLip:lip, psRest:rest, psSlot:slot});
  for (const part of optsOf('pbPart'))
    for (const h of triOf('pbH'))
      for (const sd of triOf('pbScrewD'))
        for (const pd of triOf('pbPostD'))
          add('корпус3:' + part + ':' + h + '/' + sd + '/' + pd,
              {pbPart:part, pbH:h, pbScrewD:sd, pbPostD:pd});
  for (const front of optsOf('woFront'))
    for (const dr of triOf('woHookDrop')) for (const re of triOf('woHookReach'))
      for (const td of triOf('woToolD')) for (const lip of triOf('woCleatLip')) for (const sp of triOf('woPegSpacing'))
        add('органайзер3:' + front + ':' + dr + '/' + re + '/' + td + '/' + lip + '/' + sp,
            {woBack:'cleat', woFront:front, woHookDrop:dr, woHookReach:re,
             woToolD:td, woCleatLip:lip, woPegSpacing:sp});
  for (const holl of [false, true])
    for (const [dx, dz] of [[1, 1], [3, 2], [8, 8]])
      for (const dir of optsOf('scoopDir').concat(['none']))
        for (const tab of optsOf('labelTab').concat(['none']))
          for (const feet of [false, true])
            add('ящик2:' + holl + ':' + dx + 'x' + dz + '/' + dir + '/' + tab + '/' + feet,
                {hollow:holl, divX:dx, divZ:dz, scoopDir:dir, labelTab:tab, stackFeet:feet});
  for (const w of triOf('wallThickness').concat([2, 10]))
    for (const holl of [false, true])
      add('стенка:' + w + '/' + holl, {wallThickness:w, hollow:holl, divX:2});
  for (const r of triOf('filletRadius').concat([6]))
    for (const [f, v, lip] of [[0, 0, 0], [3, 3, 2], [20, 20, 12], [150, 150, 150]])
      for (const holl of [false, true])
        add('скругления:' + r + '/' + f + '/' + v + '/' + lip + '/' + holl,
            {filletRadius:r, filletInnerFloor:f, filletInnerVert:v, filletInnerLip:lip, hollow:holl});
  for (const [xp, xm, zp, zm] of [[0, 0, 0, 0], [10, 5, 8, 3], [40, 40, 40, 40]])
    add('конус:' + xp + '/' + xm + '/' + zp + '/' + zm,
        {taperXPlus:xp, taperXMinus:xm, taperZPlus:zp, taperZMinus:zm});
  /* Отверстия — ради `FACE_AXES[…] ? … : […]`: пять граней и запасная ветвь по несуществующей грани. */
  for (const face of ['+Z', '-Z', '+X', '-X', '-Y', '?нет такой'])
    for (const shape of ['round', 'rrect'])
      for (const holl of [false, true])
        add('отверстие:' + face + '/' + shape + '/' + holl,
            {hollow:holl, __holes:[{id:1, face, u0:0, v0:0, diameter:8, shape,
                                    portW:9, portH:3.2, cornerR:1.6}]});
  for (const part of ['stand', 'clamp'])
    for (const load of triOf('artStandLoad'))
      add('артик:' + part + '/' + load, {artOn:true, artPart:part, artStandLoad:load});
  for (const rw of triOf('sheetRimW'))
    for (const cut of optsOf('sheetCut'))
      add('лист3:' + rw + '/' + cut,
          Object.assign({sheetRimW:rw, sheetCut:cut}, (FAMILIES.find(f => f.key === 'sheet') || {act:{}}).act));
  for (const pl of triOf('logoPlate'))
    for (const holl of [false, true])
      add('этикетка:' + pl + '/' + holl, {logoPlate:pl, hollow:holl});
  for (const m of optsOf('tstMode'))
    for (const a of triOf('tstAngMax'))
      add('образец:' + m + '/' + a, {tstMode:m, tstAngMax:a});
  for (const m of optsOf('threadMode'))
    add('резьба3:' + m, {threadMode:m});
  for (const cut of optsOf('sheetCut'))
    add('лист4:' + cut, Object.assign({sheetCut:cut}, (FAMILIES.find(f => f.key === 'sheet') || {act:{}}).act));
  return sets;
}

/* СЕМЬИ И ИХ СОБСТВЕННЫЕ РУЧКИ, по три значения на ручку — край, умолчание, край. Список ручек
   семьи берётся у ПАНЕЛИ, по группе строки, а не по памяти. */
function setsExtra(){
  const sets = [];
  const add = (name, ov) => sets.push([name, ov]);

  /* СЕМЬЯ + ЕЁ СОБСТВЕННЫЕ РУЧКИ, по три значения на ручку. Список ручек семьи берётся у ПАНЕЛИ —
     по группе строки, а не по памяти: выписанный по памяти пропустил бы ровно ту, что сменила читателя. */
  const GROUPS = {};
  for (const r of SHAPE_PARAMS.box) if (!r.type) (GROUPS[r.group] = GROUPS[r.group] || []).push(r.key);
  const FAM_GROUP = [
    ['cardholder', 'Картодержатель'], ['clock', 'Настенные часы'], ['spool', 'Держатель катушки'],
    ['ball', 'Ажурный шар'], ['tile', 'Настенная плитка'], ['frame', 'Рамка для фото'],
    ['seal', 'Уплотнение'], ['coaster', 'Подстаканник'], ['litho', 'Литофания'],
    ['wallorg', 'Настенный органайзер'], ['pbox', 'Корпус (электроника)'], ['hook', 'Крючок'],
    ['funnel', 'Воронка'], ['stand', 'Подставка'], ['gear', 'Шестерня'], ['thread', 'Резьба'],
    ['keycap', 'Кейкап'], ['sheet', 'Лист'], ['mount', 'Крепёж'], ['pip', 'Печать в сборе'],
  ];
  for (const [fam, group] of FAM_GROUP){
    const act = actOf(fam), keys = GROUPS[group] || [];
    add('семья+' + fam, act);
    for (const k of keys) for (const v of triOf(k)){
      const ov = Object.assign({}, act); ov[k] = v;
      add('ручка:' + fam + ':' + k + '=' + v, ov);
    }
  }
  /* ПОДРЕЖИМЫ, У КОТОРЫХ УМОЛЧАНИЕ СТРОКИ — НЕ «нет». Ровно на них `pickedOn` отвечает иначе, чем
     прежнее `p.k && p.k !== 'none'`, когда ключа нет вовсе. */
  for (const v of optsOf('keyStem').concat(['none']))
    for (const u of [1, 2.75]) add('стебель:' + v + '/' + u, {keycapMode:'single', keyStem:v, keySizeU:u});
  for (const v of optsOf('sheetPattern').concat(['none']))
    for (const cut of optsOf('sheetCut')) add('узор:' + v + '/' + cut, Object.assign({sheetPattern:v, sheetCut:cut}, actOf('sheet')));
  /* ШЕСТЕРНИ: паз, расточка, площадка, роль конической пары. */
  for (const m of optsOf('gearMode'))
    for (const kd of triOf('gearKeyD')) for (const bore of triOf('gearBore'))
      add('шестерня3:' + m + ':' + kd + '/' + bore, {gearMode:m, gearKeyD:kd, gearBore:bore});
  for (const role of ['none', 'pinion', 'wheel'])
    for (const th of triOf('gearThick')) add('коническая:' + role + '/' + th, {gearMode:'bevel', gearBevelRole:role, gearThick:th});
  for (const wd of triOf('gearWormD')) add('червяк2:' + wd, {gearMode:'worm', gearWormD:wd});
  for (const wd of triOf('gearWormD')) add('колесо2:' + wd, {gearMode:'wormwheel', gearWormD:wd});
  /* НАКИДНАЯ ГАЙКА: длина резьбы считалась тремя копиями. */
  for (const t of triOf('threadCapThread')) for (const d of [4, 12, 30])
    add('накидная:' + t + '/' + d, {threadMode:'glandcap', threadCapThread:t, threadD:d});
  /* ШАРНИРНАЯ ЦЕПОЧКА и её части. */
  for (const part of optsOf('artPart')) add('шарнир:' + part, {pipMode:'artic', artPart:part});
  /* ОТВЕРСТИЯ: грань → размеры, с запасной ветвью. */
  for (const face of ['+Z', '-Z', '+X', '-X', '-Y', '?нет такой'])
    add('грань:' + face, {__holes:[{id:1, face, u0:0, v0:0, diameter:8}]});
  /* КАЛИБРОВОЧНЫЕ ОБРАЗЦЫ — все подрежимы: их числа читались помощником. */
  for (const m of optsOf('tstMode')) add('образец2:' + m, {tstMode:m});
  /* СТРУБЦИНА, КОНДУКТОР, КОСТЬ, ЛОГОТИП AMS. */
  for (const part of optsOf('gcPart')) add('струбцина:' + part, {gcOn:true, gcPart:part});
  for (const n of triOf('jigHoleN')) add('кондуктор:' + n, {jigOn:true, jigHoleN:n});
  for (const pl of optsOf('platonic')) add('платон:' + pl, {platonic:pl});
  return sets;
}

/* СПИСКИ СПЕЦИФИКАЦИЙ У ДВУХ СЛЕПКОВ РАЗНЫЕ, и сводить их в один не надо: каждый заводился под
   свой заход и покрывает своих построителей. Расхождение спецификации с построителем одна
   сетка не поймает — тем и жив `test_saidbuilt.js`. */
/* Спецификации трогаемых семейств — числами, а не сеткой: расхождение спецификации с построителем
   сетка одна не поймает (тем и жив `test_saidbuilt.js`). */
const SPECS_PART = [['wallOrgSpec', p => wallOrgSpec(p)], ['toolRackSpec', p => toolRackSpec(p)],
               ['gearToothSpec', p => gearToothSpec(p)], ['clamshellSpec', p => clamshellSpec(p)],
               ['energyChainSpec', p => energyChainSpec(p)], ['sheetSpec', p => sheetSpec(p)],
               ['logo3dSpec', p => logo3dSpec(p)], ['lbracketSpec', p => lbracketSpec(p)],
               ['keycapCoreSpec', p => keycapCoreSpec(p)], ['keycapFitSpec', p => keycapFitSpec(p)],
               ['keycapStabSpec', p => keycapStabSpec(p)], ['hookSpec', p => hookSpec(p)],
               ['baseplateSpec', p => baseplateSpec(p)], ['pboxFitSpec', p => pboxFitSpec(p)],
               ['threadNeckSpec', p => threadNeckSpec(p)], ['capGasketSpec', p => capGasketSpec(p)],
               ['gearToothSpec', p => gearToothSpec(p)],
               ['funnelSpec', p => funnelSpec(p)], ['vaseSpec', p => vaseSpec(p)],
               ['vaseSaucerSpec', p => vaseSaucerSpec(p)], ['hingeSpec', p => hingeSpec(p)],
               ['standSpec', p => standSpec(p)], ['threadFitSpec', p => threadFitSpec(p)],
               ['augerSpec', p => augerSpec(p)], ['artStandSpec', p => artStandSpec(p)],
               ['artClampSpec', p => artClampSpec(p)], ['dividerSpec', p => dividerSpec(p)],
               ['toolRackSpec', p => toolRackSpec(p)], ['hexShelfSpec', p => hexShelfSpec(p)]];
const specLinePart = p => SPECS_PART.map(([nm, f]) => {
  try { const s = f(p); return nm + '=' + JSON.stringify(s, (k, v) => typeof v === 'number' ? round(v) : v).slice(0, 400); }
  catch (e){ return nm + '=нет'; }
}).join(' | ');

const SPECS_EXTRA = ['cardSpec','clockSpec','spoolSpec','sealSpec','coasterSpec','frameSpec','tileSpec',
  'lithoSpec','wallOrgSpec','pboxFitSpec','hookSpec','funnelSpec','standSpec','gearToothSpec',
  'threadFitSpec','threadNeckSpec','keycapCoreSpec','sheetSpec','lbracketSpec','hingeSpec',
  'artStandSpec','artClampSpec','drillJigSpec','gclampSpec','dieSpec','testSweepSpec','roseSpec'];
const specLineExtra = p => SPECS_EXTRA.map(nm => {
  try { const f = eval(nm); const s = f(p);
    return nm + '=' + JSON.stringify(s, (k, v) => typeof v === 'number' ? round(v) : v).slice(0, 300); }
  catch (e){ return nm + '=нет'; }
}).join(' | ');

const sets = (MODE === "extra") ? setsExtra() : setsPart();
const specLine = (MODE === "extra") ? specLineExtra : specLinePart;
const lines = [];
for (const [name, ov] of sets){
  const p = setP(ov);
  let mesh = 'ошибка', warn = 'ошибка', label = 'ошибка', spec = 'ошибка', print = 'ошибка';
  let tris = null;
  try { const t = buildTrisForShape('box', p); tris = t;
    mesh = t.length + ':' + hash(t.map(T => T.map(v => v.map(round).join(',')).join(';')).join('|'));
  } catch(e){ mesh = 'ошибка: ' + e.message; }
  try { warn = (collectPrintWarnings(p) || []).join(' ~ '); } catch(e){ warn = 'ошибка: ' + e.message; }
  try { label = activeShapeLabel(); } catch(e){ label = 'ошибка: ' + e.message; }
  try { spec = specLine(p); } catch(e){ spec = 'ошибка: ' + e.message; }
  /* СЛОЙ СОВЕТОВ ПО ПЕЧАТИ (v25.48.0). Три выпуска подряд — вес и время, ориентация и первый слой,
     мосты и профиль под деталь — не попадали в слепок ВОВСЕ: он писал сетку, форму, спецификации и
     предупреждения, а этих мер не касался. Доказано делом: правка меры пролёта, изменившая ответ на
     кривошипе мальтийского с 30.8 мм на 0, дала в обоих слепках НОЛЬ различий. Числа округляются до
     сотых: слепок сверяется побайтово, и болтанка в пятнадцатом знаке сделала бы его бесполезным. */
  try {
    const r2 = v => (v == null || !isFinite(v)) ? 'нет' : String(Math.round(v*100)/100);
    const b = tris ? printBudget(tris, p) : null;
    const br = tris ? bridgeSpec(tris, p) : null;
    const g = tris ? bedGripSpec(tris, p) : null;
    const o = tris ? orientationAdvice(tris) : null;
    const rows = tris ? partProfileRows(p, tris).map(q => q[0]).join(' / ') : '';
    print = 'расход ' + (b ? r2(b.fill) + '/' + r2(b.mass) + 'г/' + r2(b.hours) + 'ч' : 'нет')
          + ' | толщина ' + (tris ? r2(meanThickness(tris)) : 'нет')
          + ' | мост ' + (br ? r2(br.span) : 'нет')
          + ' | пятно ' + (g ? r2(g.area) + '/' + r2(g.margin) : 'нет')
          + ' | поворот ' + (o && o.worth ? o.best.t + ':' + r2(o.best.overhang) : 'не нужен')
          + ' | советы ' + rows;
  } catch(e){ print = 'ошибка: ' + e.message; }
  lines.push(name + '\n  сетка: ' + mesh + '\n  форма: ' + label + '\n  спец: ' + spec
           + '\n  печать: ' + print + '\n  тексты: ' + warn);
}
fsS.writeFileSync(OUT, lines.join('\n') + '\n');
const meshes = new Set(lines.map(l => (l.match(/сетка: [^\n]+/) || [''])[0]));
console.log('наборов:', sets.length, '; различных сеток:', meshes.size, '→', OUT);
