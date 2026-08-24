// Panel search across base shapes. Parameter groups are hidden when they do not apply to the model
// kind on screen — right for browsing, wrong for searching: typing «холдер» on a cube used to find
// nothing at all, because the battery-holder parameters live in a group that only exists once
// «Крепёж» is the base shape. That reads as "the app cannot do that", which is untrue. These tests
// drive the pure core (paramSearchHits), so no DOM is involved. Run via ./run-all.sh.
let pass=0, fail=0;
function chk(n,c,e){if(c){pass++;console.log('  OK  ',n);}else{fail++;console.log('  FAIL',n,e!==undefined?JSON.stringify(e):'');}}
function setp(ov){ logos.length=0; boxHoles.length=0; dieFaces.length=0;
  Object.assign(paramState.box, defaultBoxParams(), ov); return paramState.box; }

console.log('=== a parameter is findable from any base shape ===');
// Each of these lives in a group belonging to one kind. From a plain cube, every one must still be
// found — and reported as belonging elsewhere rather than silently produced as if it were live.
const ELSEWHERE = [
  ['холдер',   'battType',   'mount'],
  ['резьба:',  'threadD',    'thread'],
  ['шестерня:','gearModule', 'gear'],
  ['крючок:',  'hookBar',    'hook'],
  ['корпус:',  'pbW',        'pbox'],
  ['подставка:','psW',       'stand'],
  ['воронка',  'fnOn',       'funnel'],
  ['лист:',    'sheetThick', 'sheet'],
  ['кейкап',   'keycapMode', 'keycap'],
];
{ const cube = setp({});
  for(const [q, key, kind] of ELSEWHERE){
    const hits = paramSearchHits(q, cube);
    const hit = hits.find(h => h.key === key);
    chk('«'+q+'» с куба находит '+key, !!hit, {found: hits.length});
    if(hit){
      chk('  ...и говорит, что это «'+kind+'»', hit.kind === kind && hit.relevant === false,
          {kind: hit.kind, relevant: hit.relevant});
    }
  }
}

console.log('=== ...and is reported as live once that shape is selected ===');
for(const [q, key, kind] of ELSEWHERE){
  const p = setp({ mount:{mntMode:'lbracket'}, thread:{threadMode:'cap'}, gear:{gearMode:'spur'},
                   hook:{hookMount:'wall'}, pbox:{pbPart:'tray'}, stand:{psOn:true},
                   funnel:{fnOn:true}, sheet:{sheetShape:'rect'}, keycap:{keycapMode:'single'} }[kind]);
  const hit = paramSearchHits(q, p).find(h => h.key === key);
  chk('на «'+kind+'» параметр '+key+' уже свой', hit && hit.relevant === true,
      {relevant: hit && hit.relevant});
}

console.log('=== the shape-independent parameters are never called foreign ===');
{ const cube = setp({});
  for(const [q, key] of [['ширина', 'width'], ['фаска рёбер: ширина', 'edgeBevel'],
                         ['скругление углов (общее)', 'filletRadius'],
                         ['squircle / супереллипс (0', 'squircle']]){
    const hit = paramSearchHits(q, cube).find(h => h.key === key);
    chk('«'+q+'» — свой параметр куба', hit && hit.relevant === true && hit.kind === null,
        {kind: hit && hit.kind, relevant: hit && hit.relevant});
  }
  // the polyhedron group is reachable from the cube (polyN), so it is not somebody else's
  const poly = paramSearchHits('число боковых граней', cube).find(h => h.key === 'polyN');
  chk('«Многогранник» — не чужая группа для куба', poly && poly.relevant === true, {poly});
}

console.log('=== every foreign group names a kind the picker actually has ===');
{ const kinds = new Set(Object.values(GROUP_KIND));
  chk('у каждого вида есть подпись', [...kinds].every(k => !!KIND_LABEL[k]), [...kinds]);
  // and each named kind really does make its group live
  const ACT = { keycap:{keycapMode:'single'}, sheet:{sheetShape:'rect'}, thread:{threadMode:'cap'},
                hinge:{pipMode:'flat'}, gear:{gearMode:'spur'}, mount:{mntMode:'lbracket'},
                hook:{hookMount:'wall'}, wallorg:{woBack:'cleat'}, pbox:{pbPart:'tray'},
                stand:{psOn:true}, funnel:{fnOn:true}, coaster:{csMode:'round'},
                litho:{ltMode:'flat'}, test:{tstMode:'temptower'}, frame:{frMode:'frame'}, tile:{tlMode:'tile'}, ball:{lnMode:'ball'},
                clock:{clMode:'dial'}, spool:{spMode:'roller'} };
  for(const [group, kind] of Object.entries(GROUP_KIND)){
    const p = setp(ACT[kind] || {});
    chk('«'+group+'» оживает на «'+kind+'»', sectionRelevant(group, dominantMode(p), !!p.hollow), {});
    const cube = setp({});
    chk('  ...и на кубе действительно скрыта', !sectionRelevant(group, dominantMode(cube), false), {});
  }
}

console.log('=== an empty or nonsense query returns nothing, not everything ===');
{ const cube = setp({});
  for(const q of ['', '   ', 'кувалда', 'zzzz']) chk('«'+q+'» → пусто', paramSearchHits(q, cube).length === 0,
      {n: paramSearchHits(q, cube).length});
  chk('поиск не зависит от регистра',
      paramSearchHits('ХОЛДЕР', cube).length === paramSearchHits('холдер', cube).length &&
      paramSearchHits('холдер', cube).length > 0, {}); }

console.log('=== the search does not disturb the model ===');
{ const cube = setp({width:57, hollow:true});
  paramSearchHits('холдер', cube); paramSearchHits('резьба', cube);
  chk('параметры активной модели не тронуты',
      paramState.box.width === 57 && paramState.box.hollow === true &&
      paramState.box.mntMode === 'none' && paramState.box.threadMode === 'none', {}); }

console.log('\n'+(fail?'FAILED':'ALL PASSED')+': '+pass+' passed, '+fail+' failed');
if(fail) process.exitCode=1;
