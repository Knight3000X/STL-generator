// Принадлежность групп параметров базовым формам.
//
// Every parameter group belongs to a base shape, and that belonging is written down in FOUR separate
// places: the switch in `sectionRelevant`, its per-mode tail, `GROUP_KIND` (which the panel search reads)
// and `GROUP_TAB` (which decides the tab). A group missing from all four does not error — it falls through
// the switch, misses the tail, reaches the final `return true` and becomes visible EVERYWHERE. That is how
// ТЕЛЕСКОП, ЖИВОЙ ШАРНИР, ЦЕПЬ, ШАРОВОЙ ШАРНИР and ЗАЩЁЛКА-КОНСОЛЬ ended up on the cube while the hinge,
// whose family they are, showed only the sixth group of the six.
//
// Nothing about that is geometric, so no geometry test could see it, and it survived eighteen versions.
// What sees it is a census: ask every group, in every base mode, whether it is on — and then insist that
// the answer is a DECISION rather than an accident. A group visible in every mode must be on the list of
// groups that are meant to be; a group exclusive to a shape other than the plain cube must be registered
// for search; and every group must have a tab. Run via ./run-all.sh.
let pass=0, fail=0;
function chk(n,c,e){if(c){pass++;console.log('  OK  ',n);}else{fail++;console.log('  FAIL',n,e!==undefined?JSON.stringify(e):'');}}

/* Список базовых форм ВЫВОДИТСЯ из KIND_LABEL, а не переписывается сюда руками. Руками он уже отстал
   однажды: восемнадцатая форма («Тесты», v18.0.0) в него не попала, и три проверки этого файла стали
   сообщать, что её группа не видна нигде — при том что видна она ровно там, где надо. Список, который
   надо помнить обновить, — это не список, а ловушка. */
const MODES = Object.keys(KIND_LABEL);
const GROUPS = (() => { const seen = new Set(), out = [];
  for(const sk in SHAPE_PARAMS) for(const p of SHAPE_PARAMS[sk]){
    const g = p.group || 'Параметры'; if(!seen.has(g)){ seen.add(g); out.push(g); } }
  return out; })();
const modesOf = g => MODES.filter(m => sectionRelevant(g, m, true));

// Groups that are deliberately not tied to one shape. Anything else landing here is an oversight, which
// is the entire point: the list is short and adding to it has to be a conscious act.
const UNIVERSAL = new Set(['Допуски печати']);
const SHARED = {                                    // visible in several shapes, on purpose
  'Размеры':                     ['box','die','sheet','keycap','logo3d'],
  'Многогранник':                ['box','die'],
  'Наклон стенок':               ['box','sheet'],
  'Gridfinity':                  ['box','baseplate'],
  'Фаска рёбер (любая форма)':   MODES.filter(m => m !== 'baseplate'),
  'Логотипы (рельеф на гранях)': MODES.filter(m => m !== 'baseplate' && m !== 'logo3d'),
};

console.log('=== перепись: каждая группа знает, чья она ===');
{
  chk('группы вообще нашлись', GROUPS.length >= 30, GROUPS.length);
  const homeless = GROUPS.filter(g => modesOf(g).length === 0);
  chk('ни одна группа не спрятана во всех режимах', homeless.length === 0, homeless);
  const everywhere = GROUPS.filter(g => modesOf(g).length === MODES.length);
  chk('видны везде только те, что заявлены таковыми',
      everywhere.every(g => UNIVERSAL.has(g)), everywhere.filter(g => !UNIVERSAL.has(g)));
  const shared = GROUPS.filter(g => { const m = modesOf(g); return m.length > 1 && m.length < MODES.length; });
  chk('в нескольких формах — только заявленные', shared.every(g => g in SHARED),
      shared.filter(g => !(g in SHARED)));
  /* Сравнение МНОЖЕСТВАМИ, а не строками. Раньше здесь стояло `JSON.stringify(...) === JSON.stringify(...)`,
     и это требовало вдобавок совпадения ПОРЯДКА обхода — а порядок задаёт перечислитель форм, к вопросу
     «в каких формах видна группа» отношения не имеющий. Пока список форм был переписан сюда руками в том
     же порядке, что и в SHARED, оно сходилось случайно; стоило вывести список из KIND_LABEL — и четыре
     проверки упали, ничего не найдя. */
  const same = (a, b) => a.length === b.length && a.slice().sort().join('|') === b.slice().sort().join('|');
  for(const g of shared) if(g in SHARED)
    chk('«' + g + '» ровно в тех формах, что заявлены',
        same(modesOf(g), SHARED[g].filter(m => MODES.includes(m))), modesOf(g));
}

console.log('=== исключительная группа зарегистрирована для поиска ===');
// Search reaches into shapes that are not on screen and says which button would make a hit live. A group
// exclusive to a shape OTHER than the plain cube has to be in GROUP_KIND, or the search finds it and
// cannot say where it lives. (The cube is the default shape, so its own groups need no entry.)
for(const g of GROUPS){
  const m = modesOf(g);
  if(m.length !== 1 || m[0] === 'box') continue;
  chk('«' + g + '» → GROUP_KIND', GROUP_KIND[g] === m[0], {kind:GROUP_KIND[g], mode:m[0]});
}
for(const g of Object.keys(GROUP_KIND)){
  const m = modesOf(g);
  chk('GROUP_KIND «' + g + '» видна ровно в своей форме',
      m.length === 1 && m[0] === GROUP_KIND[g], {kind:GROUP_KIND[g], visible:m});
  chk('GROUP_KIND «' + g + '» — настоящая группа параметров', GROUPS.includes(g));
}

console.log('=== закладка есть у каждой ===');
for(const g of GROUPS)
  chk('«' + g + '» → закладка', ['form','cavity','finish','export'].includes(GROUP_TAB[g]), GROUP_TAB[g]);

console.log('=== семейство «печать в сборе» ===');
// The bug itself, stated as a fact about the six groups rather than about the tables that describe them.
{
  chk('семейство объявлено одним списком', Array.isArray(PIP_GROUPS) && PIP_GROUPS.length === 6, PIP_GROUPS);
  for(const g of PIP_GROUPS){
    chk('«' + g + '» — настоящая группа параметров', GROUPS.includes(g));
    chk('«' + g + '» видна на петле', sectionRelevant(g, 'hinge', true));
    chk('«' + g + '» НЕ видна на кубе', !sectionRelevant(g, 'box', true));
    const stray = MODES.filter(m => m !== 'hinge' && sectionRelevant(g, m, true));
    chk('«' + g + '» не видна больше нигде', stray.length === 0, stray);
    chk('«' + g + '» найдётся поиском как петля', GROUP_KIND[g] === 'hinge', GROUP_KIND[g]);
    chk('«' + g + '» лежит в закладке «Форма»', GROUP_TAB[g] === 'form', GROUP_TAB[g]);
  }
  // ...and the hinge shows the whole family, not one group of six
  const onHinge = GROUPS.filter(g => modesOf(g).length === 1 && modesOf(g)[0] === 'hinge');
  chk('на петле — все шесть групп семейства', onHinge.length === PIP_GROUPS.length, onHinge);
  // every pipMode sub-model has parameters, and they are in the family
  const modes = SHAPE_PARAMS.box.find(p => p.key === 'pipMode');
  chk('подрежимов печати в сборе столько же, сколько ожидается', !!modes && modes.options.length >= 6,
      modes && modes.options.length);
}

console.log('=== TOTAL: ' + pass + ' passed, ' + fail + ' failed ===');
if(fail) process.exit(1);
