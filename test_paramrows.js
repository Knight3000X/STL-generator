// Какие строки настроек показывать для выбранной подмодели.
//
// Eleven parameter groups are not groups at all but FAMILIES: «Крепёж / монтаж» is twenty-one different
// parts behind one `mntMode`, «Шестерня» is eighteen behind `gearMode`, and so on. Together they are 365
// rows of the app's 603, and until this was written every one of them was on screen at once, so choosing
// «гребёнка кабелей» meant scrolling past a hundred controls that do nothing to a cable comb.
//
// Each row now names the sub-models it belongs to (`w:`), plus, where a row is still dead until some other
// control is set, the condition that wakes it (`only:` for a value, `needs:` for a number over a
// threshold). Nothing checks that by looking — a wrong mark HIDES A WORKING CONTROL, which is worse than
// the crowding it was meant to cure, and it fails silently in exactly the sub-model nobody opened.
//
// So the marks are checked against the geometry itself. For every (row, sub-model) pair the parameter is
// swept over its whole declared range and the mesh is rebuilt: if the mesh moves, that row belongs to that
// sub-model. Two directions, and the second is the one that matters:
//
//   * ЛИШНЕЕ — the mesh moves where the row says it should not. Merely crowding, but a lie.
//   * ПРОПАЖА — the mesh moves where the row is HIDDEN. That is the control the user cannot reach.
//
// A handful of parameters legitimately change nothing in the mesh: they feed the printed warnings and the
// force figures instead. Those are named below, one at a time, so "it does nothing" can never quietly
// become the excuse for a bad mark. Run via ./run-all.sh.
let pass=0, fail=0;
function chk(n,c,e){if(c){pass++;console.log('  OK  ',n);}else{fail++;console.log('  FAIL',n,e!==undefined?JSON.stringify(e):'');}}

const ALL=[]; for(const sk in SHAPE_PARAMS) for(const p of SHAPE_PARAMS[sk]) ALL.push(p);
const DEF={}; for(const r of ALL) if(DEF[r.key]===undefined) DEF[r.key]=r.default;
const byKey={}; for(const r of ALL) byKey[r.key]=r;
const modesOfFamily = g => byKey[FAMILY_MODE[g]].options.map(o => o.v!==undefined?o.v:o);
const rowsOfFamily = g => ALL.filter(r => r.group===g);
// A family has ONE hub group — the one carrying the selector, where the sub-models share a heading and the
// rows have to sort themselves out — and any number of SATELLITE groups, each a heading of its own for a
// single sub-model. The print-in-place family is built that way: «Телескоп» and «Цепь» are separate groups
// but the same `pipMode`. A satellite is not a crowded group and is not asked to shrink; what it is asked
// is to be honest — every row on the same sub-model, and the whole heading gone in all the others.
const isHub = g => rowsOfFamily(g).some(r => r.key === FAMILY_MODE[g]);

console.log('=== перепись: каждая строка семейства знает, чья она ===');
{
  const fams = Object.keys(FAMILY_MODE);
  chk('семейства объявлены', fams.length >= 4, fams.length);
  chk('ровно одна головная группа на семейство', (() => {
    const hubs = {}; for(const g of fams) if(isHub(g)) hubs[FAMILY_MODE[g]] = (hubs[FAMILY_MODE[g]]||0)+1;
    const keys = new Set(fams.map(g => FAMILY_MODE[g]));
    return Array.prototype.every.call([...keys], k => hubs[k] === 1);
  })());
  for(const g of fams){
    const mk = FAMILY_MODE[g], rows = rowsOfFamily(g), modes = modesOfFamily(g);
    chk('«'+g+'» — селектор это список', byKey[mk] && byKey[mk].type==='select');
    if(!isHub(g)){
      const vals = new Set(); for(const r of rows) for(const v of (r.w||[])) vals.add(v);
      chk('«'+g+'» — группа одной подмодели', vals.size === 1, [...vals]);
      const mine = [...vals][0];
      for(const md of modes){
        const p = Object.assign({}, DEF, {[mk]:md});
        const n = rows.filter(r => paramRowRelevant(r, p)).length;
        chk('«'+g+'» при '+mk+'='+md+': '+(md===mine ? 'вся на экране' : 'исчезает целиком'),
            md===mine ? n===rows.length : n===0, n);
      }
      continue;
    }
    const unmarked = rows.filter(r => r.key!==mk && !r.w);
    chk('«'+g+'»: размечены все '+rows.length+' строк', unmarked.length===0, unmarked.map(r=>r.key));
    for(const r of rows){
      if(!r.w) continue;
      const stray = r.w.filter(v => modes.indexOf(v) < 0);
      chk(r.key+': в w только настоящие подмодели', stray.length===0, stray);
      chk(r.key+': w не пуст', r.w.length > 0);
      chk(r.key+': w без «none»', r.w.indexOf('none') < 0);
    }
  }
}

console.log('=== вторая ступень: only / needs ссылаются на существующее ===');
for(const r of ALL){
  if(r.only) for(const k in r.only){
    chk(r.key+'.only → '+k+' существует', !!byKey[k]);
    if(byKey[k] && byKey[k].type==='select'){
      const opts = byKey[k].options.map(o => o.v!==undefined?o.v:o);
      const bad = r.only[k].filter(v => opts.indexOf(v) < 0);
      chk(r.key+'.only → '+k+': только настоящие значения', bad.length===0, bad);
    }
  }
  if(r.needs) for(const k in r.needs){
    chk(r.key+'.needs → '+k+' существует', !!byKey[k]);
    // The threshold has to be reachable, or the row is simply gone: a row that needs gearHub > 100 when the
    // slider stops at 60 can never appear.
    if(byKey[k] && byKey[k].max !== undefined)
      chk(r.key+'.needs → '+k+': порог '+r.needs[k]+' достижим', byKey[k].max > r.needs[k], byKey[k].max);
  }
}

console.log('=== предикат делает то, что написано ===');
{
  const p0 = Object.assign({}, DEF, {mntMode:'cablecomb'});
  const comb = ALL.find(r => r.key==='mntCabD');
  chk('строка своей подмодели видна', paramRowRelevant(comb, p0));
  chk('она же в чужой подмодели скрыта', !paramRowRelevant(comb, Object.assign({}, p0, {mntMode:'vesa'})));
  chk('сам селектор виден всегда', paramRowRelevant(byKey.mntMode, p0) &&
      paramRowRelevant(byKey.mntMode, Object.assign({}, p0, {mntMode:'none'})));
  chk('строка вне семейства видна всегда', paramRowRelevant(byKey.width || ALL[0], p0));
  // only / needs
  const bd = ALL.find(r => r.key==='battD');
  chk('battD скрыт при типоразмере AA', !paramRowRelevant(bd, Object.assign({}, DEF, {mntMode:'battery', battType:'aa'})));
  chk('battD виден при «свой размер»', paramRowRelevant(bd, Object.assign({}, DEF, {mntMode:'battery', battType:'custom'})));
  chk('battD скрыт в чужой подмодели даже со «свой размер»',
      !paramRowRelevant(bd, Object.assign({}, DEF, {mntMode:'vesa', battType:'custom'})));
  const kd = ALL.find(r => r.key==='gearKeyD');
  chk('глубина шпонки скрыта при нулевой ширине',
      !paramRowRelevant(kd, Object.assign({}, DEF, {gearMode:'spur', gearKeyW:0})));
  chk('глубина шпонки видна при ненулевой',
      paramRowRelevant(kd, Object.assign({}, DEF, {gearMode:'spur', gearKeyW:4})));
  // an unmarked row must stay visible: leniency at runtime is what makes a missing mark harmless
  chk('неразмеченная строка семейства всё равно видна',
      paramRowRelevant({group:'Крепёж / монтаж', key:'__нет_такого'}, p0));
}

console.log('=== свёртка: подмодель показывает единицы строк, а не сотни ===');
for(const g of Object.keys(FAMILY_MODE)){
  if(!isHub(g)) continue;                     // satellites are one sub-model each — nothing to collapse
  const mk = FAMILY_MODE[g], rows = rowsOfFamily(g), modes = modesOfFamily(g);
  let worst = 0;
  for(const md of modes){
    const p = Object.assign({}, DEF, {[mk]:md});
    const n = rows.filter(r => paramRowRelevant(r, p)).length;
    worst = Math.max(worst, n);
    /* Правило сворачивания: одна подмодель не должна тащить на экран всю семью. Оно про ТЕСНОТУ и
       написано под «Крепёж» — двадцать одна подмодель в ста двадцати восьми строках, где выбор гребёнки
       кабелей выводил больше сотни чужих контролов.

       Семье из трёх-четырёх подмоделей оно не подходит и меряет не то. У «Тестов печати» семь строк и три
       подмодели, которые честно делят ширину, толщину, число ступеней и их высоту: у моста на экране
       шесть строк из семи, и каждая из шести им используется. Свернуть тут нечего, а 60 % дали бы
       четыре — то есть потребовали бы спрятать работающий контрол, ровно ту беду, против которой весь
       этот файл и написан.

       Что строки не врут, проверяет не это правило, а развёртка по геометрии ниже: она перебирает весь
       диапазон каждого параметра и смотрит, двигается ли сетка. Порог здесь — грубая страховка от
       тесноты, и применяется он там, где теснота вообще возможна. */
    /* Порог применяется там, где ТЕСНОТА возможна: строк втрое больше, чем подмоделей. У «Крепежа»
       128 строк на 21 подмодель — вшестеро, и выбор гребёнки кабелей выводил больше сотни чужих контролов,
       ради чего правило и написано. У «Тестов печати» девять строк на шесть подмоделей: они честно делят
       ширину, толщину, число ступеней и высоту, и у моста на экране шесть строк, каждая из которых им
       используется. Скрыть работающий контрол — ровно та беда, против которой весь этот файл. Что строки
       не врут, проверяет не порог, а развёртка по геометрии ниже. */
    /* И ещё один порог — АБСОЛЮТНЫЙ. Правило про тесноту, а теснота — это когда семья не влезает на
       экран: у «Крепежа» 154 строки, у «Шестерни» 71, у «Петли» 53, у «Резьбы» 61, и там доля в 60 %
       действительно что-то ограничивает. У «Рамки для фото» тринадцать строк на две разновидности: 60 %
       от тринадцати — это 7.8, то есть требование спрятать три работающих контрола из десяти, ни один из
       которых не принадлежит ЧУЖОЙ подмодели. Это ровно та беда, против которой написан весь файл, и та
       же, из-за которой выше пришлось вывести «Тесты печати» из-под правила.

       Двадцать четыре — это примерно панель на один экран. Семья, которая влезает в экран целиком,
       проблемы «выбор одной подмодели вывалил на экран всю семью» не создаёт: её и так видно всю. */
    if (rows.length >= modes.length * 3 && rows.length >= 24)
      chk('«'+g+'»/'+md+': строк на экране '+n+' (было '+rows.length+')', n <= Math.max(4, rows.length*0.6), n);
  }
  chk('«'+g+'»: худшая подмодель короче всей группы', worst < rows.length, {worst, all:rows.length});
  // ...and every sub-model of the family is reachable: none of them ends up with nothing anywhere.
  for(const md of modes){
    if(md === 'none') continue;
    const p = Object.assign({}, DEF, {[mk]:md});
    const anywhere = ALL.filter(r => FAMILY_MODE[r.group]===mk && paramRowRelevant(r, p)).length;
    chk(mk+'='+md+': своих строк во всём семействе '+anywhere, anywhere >= 2, anywhere);
  }
}

console.log('=== разметка против геометрии ===');
// Ground truth. Sweeping every row of every family against every sub-model is minutes of work, so the
// families are covered by their own test files and this one takes the whole mount family (the biggest, and
// the one the marks were derived on) plus a named sample from each of the others.
const fp = over => {
  const p = Object.assign({}, DEF, {shape:'box'}, over);
  let tris; try { tris = buildTrisForShape('box', p); } catch(e){ return 'ERR:'+e.message; }
  if(!tris || !tris.length) return 'EMPTY';
  let s=0, n=0, cx=0;
  for(const T of tris){ s += T[0][0]*(T[1][1]*T[2][2]-T[2][1]*T[1][2]); n++;
    cx += T[0][0]+T[0][1]*3+T[0][2]*7 + T[1][0]*11+T[1][1]*13+T[1][2]*17 + T[2][0]*19+T[2][1]*23+T[2][2]*29; }
  return n+'|'+s.toFixed(4)+'|'+cx.toFixed(4);
};
const valuesOf = r => {
  if(r.type==='bool') return [true, false];
  if(r.type==='select') return r.options.map(o => o.v!==undefined?o.v:o);
  if(r.type==='text' || r.min===undefined) return [];
  const out=[]; for(let k=0;k<=4;k++){ const v=r.min+(r.max-r.min)*k/4; out.push(r.int?Math.round(v):+v.toFixed(3)); }
  return out;
};
// Parameters that move no vertex on purpose: they feed the printed warnings and the strength figures.
// Named individually — "it does nothing" must never be a blanket excuse for a mark nobody checked.
const ADVISORY = new Set([
  'snapMat',        // модуль и допустимая деформация: считает усилие и запас, а не форму
  'dinMat',         // то же самое у язычка DIN-клипсы
  /* У СТРУБЦИНЫ материал не двигает ничего и не должен: размеры скобы задаёт человек, а материал
     отвечает на вопрос «сколько она при этих размерах держит». Это НЕ то же самое, что у защёлки, где
     из модуля и допустимой деформации выводится сама толщина язычка, — и потому строка попадает сюда,
     а не остаётся необъявленной. */
  'gcMat',
  'mntCalStart', 'mntCalStep',  // подписи на калибровочных образцах
]);
function auditFamily(g, only){
  const mk = FAMILY_MODE[g], modes = modesOfFamily(g).filter(m => m!=='none');
  const rows = rowsOfFamily(g).filter(r => r.key!==mk && (!only || only.indexOf(r.key)>=0));
  for(const r of rows){
    const vals = valuesOf(r); if(!vals.length) continue;
    // The context that wakes a second-stage row, so it is judged awake rather than judged asleep.
    const ctx = {};
    if(r.only) for(const k in r.only) ctx[k] = r.only[k][0];
    if(r.needs) for(const k in r.needs){ const t = byKey[k]; ctx[k] = Math.min(t?t.max:t, r.needs[k] + Math.max(1, (t&&t.step)||1)*2); }
    let effects = [];
    for(const md of modes){
      const base = fp(Object.assign({[mk]:md}, ctx));
      let moves = false;
      for(const v of vals){ if(v===r.default) continue;
        if(fp(Object.assign({[mk]:md}, ctx, {[r.key]:v})) !== base){ moves = true; break; } }
      if(moves) effects.push(md);
    }
    const declared = r.w || [];
    const missing = effects.filter(m => declared.indexOf(m) < 0);
    const extra   = declared.filter(m => effects.indexOf(m) < 0);
    chk('ПРОПАЖА: '+r.key+' нигде не работает втайне от разметки', missing.length===0, missing);
    if(ADVISORY.has(r.key))
      chk('СПРАВОЧНЫЙ: '+r.key+' объявлен как не меняющий форму', effects.length===0, effects);
    else
      chk('ЛИШНЕЕ: '+r.key+' заявлен там, где работает', extra.length===0, {заявлено:extra, работает:effects});
  }
}
auditFamily('Крепёж / монтаж');
// A named row per family: the sweep is expensive and the families have their own geometry tests.
auditFamily('Шестерня', ['gearHelix','gearSpokes','gearSpokeW','gearBevelMate','rackLen','camLift','rootsWall']);
auditFamily('Резьба (крышка / штуцер)', ['threadWireD','threadBarbN','threadJournalD','threadNeckD','threadFloor']);
auditFamily('Петля (печать в сборе)', ['pipScrewN','pipClipD','tieLen','clampD','snapMat']);
auditFamily('Телескоп', ['telN','telStopD']);

console.log('=== TOTAL: ' + pass + ' passed, ' + fail + ' failed ===');
if(fail) process.exit(1);
