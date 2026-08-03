// Заголовок группы называет выбранную разновидность, а внутри — своё отдельно от общего.
//
// After v172/v173 the family group shows a handful of rows instead of eighty, and the choice is made by a
// tile above the accordion — but the heading still read «Крепёж / монтаж» over settings that are now the
// cable comb's alone. It now reads «Крепёж — гребёнка кабелей», and inside, the rows this sub-model shares
// with the rest of the family are put below a divider, so «стенка корпуса», which only the housing has,
// does not sit interleaved with «толщина», which everything in the family carries.
//
// Both are stated as pure functions and the panel reads them — `panelRowVisible` and `familySplitVisible`
// are the rules, the DOM pass is a loop over data attributes. That arrangement is the point of this file,
// and it is not decoration: the first version of the hoisted-selector rule was a SECOND pass over the same
// rows, and a second pass has to decide what to do with the rows it did not come for. Its `toggle` un-hid
// every other <select> in the family — `gearBevelRole` belongs to the bevel alone and came back on screen
// for the spur. Nothing geometric, nothing visible to a mesh test, and no pure function to check against.
// Run via ./run-all.sh.
let pass=0, fail=0;
function chk(n,c,e){if(c){pass++;console.log('  OK  ',n);}else{fail++;console.log('  FAIL',n,e!==undefined?JSON.stringify(e):'');}}

const ALL = SHAPE_PARAMS.box;
const DEF = {}; for(const sk in SHAPE_PARAMS) for(const r of SHAPE_PARAMS[sk]) if(DEF[r.key]===undefined) DEF[r.key]=r.default;
const FAMS = Object.keys(FAMILY_MODE);
const modesOf = g => ALL.find(r => r.key===FAMILY_MODE[g]).options.map(o => o.v!==undefined?o.v:o);
const stateFor = (g, md) => Object.assign({}, DEF, {[FAMILY_MODE[g]]: md});

console.log('=== головная группа у семейства одна ===');
{
  const hubs = FAMS.filter(isHubGroup), sats = FAMS.filter(g => !isHubGroup(g));
  chk('головных групп ровно по одной на семейство',
      hubs.length === new Set(FAMS.map(g => FAMILY_MODE[g])).size, hubs);
  chk('спутники есть', sats.length >= 5, sats);
  for(const g of hubs) chk('«'+g+'» держит свой селектор ' + FAMILY_MODE[g],
      ALL.some(r => r.key===FAMILY_MODE[g] && r.group===g));
  for(const g of sats) chk('спутник «'+g+'» селектора не держит',
      !ALL.some(r => r.key===FAMILY_MODE[g] && r.group===g));
}

console.log('=== заголовок называет разновидность ===');
for(const g of FAMS){
  const mk = FAMILY_MODE[g], kind = GROUP_KIND[g], titles = {};
  for(const md of modesOf(g)){
    const h = familyHeading(g, stateFor(g, md));
    chk('«'+g+'»/'+md+': заголовок не пуст', !!h && h.length > 0, h);
    if(!isHubGroup(g)){ chk('спутник «'+g+'» заголовка не меняет', h === g, h); continue; }
    if(md === 'none'){ chk('«'+g+'» без выбора — своё имя', h === g, h); continue; }
    const t = subModelTiles(kind).find(t => t.v === md);
    chk('«'+g+'»/'+md+': заголовок называет форму', h.indexOf(KIND_LABEL[kind]) === 0, h);
    chk('«'+g+'»/'+md+': заголовок называет разновидность', h.indexOf(t.label) > 0, h);
    chk('«'+g+'»/'+md+': заголовок совпадает с плиткой', h === KIND_LABEL[kind] + ' — ' + t.label, h);
    chk('«'+g+'»/'+md+': заголовок различим', !titles[h], h);
    titles[h] = 1;
  }
}
{ // an unknown group is not a family and keeps its name — nothing invents a heading out of nothing
  chk('чужая группа не переименовывается', familyHeading('Допуски печати', DEF) === 'Допуски печати');
  chk('несуществующая группа возвращается как есть', familyHeading('нет такой', DEF) === 'нет такой');
}

console.log('=== селектор поднят наверх и в группе не дублируется ===');
for(const g of FAMS){
  if(!isHubGroup(g)) continue;
  const mk = FAMILY_MODE[g], kind = GROUP_KIND[g], sel = ALL.find(r => r.key===mk);
  for(const md of modesOf(g)){
    const p = stateFor(g, md);
    // «нет» means the family is not the model being made, so the group is off the panel entirely and the
    // hoisted tile row is not on it either. Nothing to hide — and nothing to hide it from.
    if(md === 'none'){ chk(mk+'=none: группа не на экране', !sectionRelevant(g, dominantMode(p), true)); continue; }
    chk(mk+'='+md+': строка селектора скрыта (она есть плиткой)', !panelRowVisible(sel, p));
    chk(mk+'='+md+': сам селектор по-прежнему «относится»', paramRowRelevant(sel, p));
  }
}
{
  // ...and ONLY the selector. The whole point of folding this into the one pass: an ordinary select of the
  // family must still obey its own w:. gearBevelRole is the row that caught it.
  const role = ALL.find(r => r.key === 'gearBevelRole');
  chk('gearBevelRole виден на конической', panelRowVisible(role, Object.assign({}, DEF, {gearMode:'bevel'})));
  chk('gearBevelRole скрыт на прямозубой', !panelRowVisible(role, Object.assign({}, DEF, {gearMode:'spur'})));
  for(const g of FAMS){
    const mk = FAMILY_MODE[g];
    for(const md of modesOf(g)){
      const p = stateFor(g, md);
      const wrong = ALL.filter(r => r.group===g && r.key!==mk &&
                                    panelRowVisible(r, p) !== paramRowRelevant(r, p));
      chk('«'+g+'»/'+md+': поднят только селектор', wrong.length===0, wrong.map(r=>r.key));
    }
  }
  // a row outside every family is untouched by the hoisting rule
  const plain = ALL.find(r => !FAMILY_MODE[r.group] && r.type !== 'text');
  chk('строка вне семейства видна как обычно', panelRowVisible(plain, DEF) === paramRowRelevant(plain, DEF));
}

console.log('=== разделитель «общие» появляется только когда есть обе половины ===');
for(const g of FAMS){
  for(const md of modesOf(g)){
    const p = stateFor(g, md);
    let own = 0, shared = 0;
    for(const r of ALL) if(r.group===g && panelRowVisible(r, p)){ if(rowShare(r)==='shared') shared++; else own++; }
    const want = isHubGroup(g) && own > 0 && shared > 0;
    chk('«'+g+'»/'+md+': разделитель '+(want?'нужен':'не нужен')+' ('+own+' своих, '+shared+' общих)',
        familySplitVisible(g, p) === want, {got:familySplitVisible(g,p), own, shared});
  }
  chk('спутник «'+g+'» без разделителя', isHubGroup(g) || !familySplitVisible(g, DEF));
}
{
  chk('у не-семейства разделителя нет', !familySplitVisible('Допуски печати', DEF));
  // and the split is a partition: every visible row is on exactly one side of it
  for(const g of FAMS) for(const md of modesOf(g)){
    const p = stateFor(g, md);
    const vis = ALL.filter(r => r.group===g && panelRowVisible(r, p));
    chk('«'+g+'»/'+md+': каждая строка по одну сторону',
        vis.every(r => rowShare(r)==='own' || rowShare(r)==='shared'));
  }
}

console.log('=== «общая» строка — та, что и правда общая ===');
// The divider claims something. A row below it must belong to more than one sub-model, and a row above it
// to exactly this one — otherwise the line is a label for a set it does not describe.
for(const r of ALL){
  const mk = FAMILY_MODE[r.group]; if(!mk || r.key===mk) continue;
  const s = rowShare(r);
  if(s === 'shared') chk(r.key+': «общая» — и вправду у нескольких', r.w && r.w.length > 1, r.w);
  else chk(r.key+': «своя» — и вправду у одной', !r.w || r.w.length === 1, r.w);
}

console.log('=== TOTAL: ' + pass + ' passed, ' + fail + ' failed ===');
if(fail) process.exit(1);
