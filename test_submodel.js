// Выбор разновидности вынесен из аккордеона наверх, плиткой.
//
// «Крепёж», «Шестерня», «Резьба» и «Печать в сборе» are not one model each but twenty, eighteen, thirteen
// and ten. The control that decides WHICH of them you are making sat inside a collapsible group, below the
// thing it decides — you had to open the group to find out you were in the wrong sub-model. It is now a tile
// row directly under the base shape, which is where the choice belongs.
//
// Nothing here is geometric, and the v170 bug is the reminder of what that means: a fact about which group
// belongs to which shape, written down in several places, drifts, and the drift is invisible to every mesh
// test in the battery. So the tile row is not given a table of its own. It reads FAMILY_MODE (which groups
// are families, and by what key) and GROUP_KIND (which base shape a group belongs to) — both already there,
// both already checked by test_groups.js and test_paramrows.js — and this file's job is to prove it stays
// derived: every family reachable, every tile a real option, nothing invented and nothing lost.
// Run via ./run-all.sh.
let pass=0, fail=0;
function chk(n,c,e){if(c){pass++;console.log('  OK  ',n);}else{fail++;console.log('  FAIL',n,e!==undefined?JSON.stringify(e):'');}}

// Выводится из KIND_LABEL, а не переписывается руками: ручной список отстал на восемнадцатой форме.
const MODES = Object.keys(KIND_LABEL);
const rowOf = k => SHAPE_PARAMS.box.find(r => r.key === k);

console.log('=== у каждого семейства ровно одна головная форма ===');
{
  const fams = new Set(Object.keys(FAMILY_MODE).map(g => FAMILY_MODE[g]));
  chk('семейств пять', fams.size === 5, [...fams]);
  const found = {};
  for(const m of MODES){ const k = subModelKey(m); if(k){ chk('форма '+m+' → '+k+' (единственный раз)', !found[k], found[k]); found[k] = m; } }
  chk('каждое семейство досягаемо с какой-то базовой формы',
      [...fams].every(k => k in found), [...fams].filter(k => !(k in found)));
  // ...and the shape it is reachable from is the one its rows actually belong to
  for(const k in found){
    const g = Object.keys(FAMILY_MODE).find(g => FAMILY_MODE[g]===k && rowOf(k) && rowOf(k).group===g);
    chk('«'+g+'» — головная группа '+k, !!g);
    chk('«'+g+'» живёт на форме '+found[k], GROUP_KIND[g] === found[k], GROUP_KIND[g]);
    chk('«'+g+'» видна на своей форме', sectionRelevant(g, found[k], true));
  }
  const plain = MODES.filter(m => !subModelKey(m));
  chk('у остальных форм разновидностей нет', plain.length === MODES.length - fams.size, plain);
}

console.log('=== плитки: настоящие варианты, ничего не выдумано и ничего не потеряно ===');
for(const m of MODES){
  const k = subModelKey(m); if(!k) continue;
  const row = rowOf(k), tiles = subModelTiles(m);
  const opts = row.options.map(o => o.v);
  chk(k+': плиток столько же, сколько вариантов кроме «нет»', tiles.length === opts.length-1,
      {tiles:tiles.length, opts:opts.length});
  chk(k+': «нет» плиткой не показывается', !tiles.some(t => t.v === 'none'));
  for(const t of tiles){
    chk(k+'/'+t.v+': настоящий вариант', opts.indexOf(t.v) >= 0);
    chk(k+'/'+t.v+': подпись не пуста', !!t.label && t.label.length > 0, t.label);
    chk(k+'/'+t.v+': подпись коротка для плитки', t.label.length <= 34, t.label);
    // The tooltip keeps the whole thing, so trimming never loses what the trimmed part explained.
    chk(k+'/'+t.v+': подсказка — полный текст варианта',
        t.title === row.options.find(o => o.v===t.v).t, t.title);
    chk(k+'/'+t.v+': подпись содержится в полном тексте', t.title.indexOf(t.label) >= 0, [t.label, t.title]);
    // ...and what was trimmed off the front is only ever the heading repeating itself
    const head = (KIND_LABEL[m]||'').toLowerCase(), cut = t.title.slice(0, t.title.indexOf(t.label));
    chk(k+'/'+t.v+': срезано только повторение заголовка',
        cut === '' || cut.toLowerCase().replace(/[:\s]+$/,'') === head, cut);
  }
  const dup = tiles.map(t=>t.label).filter((l,i,a) => a.indexOf(l)!==i);
  chk(k+': подписи плиток различимы', dup.length === 0, dup);
}
{ // a shape with no family asks for no tiles rather than throwing or offering the previous shape's
  chk('у куба плиток нет', subModelTiles('box').length === 0);
  chk('у неизвестной формы плиток нет', subModelTiles('нет такой').length === 0);
  chk('__sub скрыт там, где разновидностей нет', !sectionRelevant('__sub', 'box', true));
  chk('__sub показан на крепеже', sectionRelevant('__sub', 'mount', true));
}

console.log('=== плитки покрывают ровно те подмодели, что размечены в строках ===');
// The tile row and the row marks are two descriptions of the same set of sub-models. If they disagree, one
// of them is wrong, and the visible symptom is a sub-model you can choose that shows nothing — or rows
// marked for a sub-model no tile can reach.
for(const m of MODES){
  const k = subModelKey(m); if(!k) continue;
  const tiles = new Set(subModelTiles(m).map(t => t.v));
  const marked = new Set();
  for(const r of SHAPE_PARAMS.box) if(FAMILY_MODE[r.group] === k && r.w) for(const v of r.w) marked.add(v);
  const unreachable = [...marked].filter(v => !tiles.has(v));
  chk(k+': каждая размеченная подмодель выбирается плиткой', unreachable.length === 0, unreachable);
  const empty = [...tiles].filter(v => !marked.has(v));
  chk(k+': у каждой плитки есть свои настройки', empty.length === 0, empty);
}

console.log('=== подпись над плитками называет форму ===');
for(const m of MODES){ if(!subModelKey(m)) continue;
  chk('форма '+m+' имеет человеческое имя', !!KIND_LABEL[m], KIND_LABEL[m]); }

console.log('=== построение строки плиток не падает ===');
// The DOM stub cannot show a panel, but it can run the builder — and what breaks a hoisted control is
// usually not the layout, it is a global that is not there yet on the first pass.
{
  const before = JSON.stringify(paramState && paramState.box ? paramState.box.mntMode : null);
  let threw = null;
  try {
    updateSubModelPicker();
    if (paramState && paramState.box){
      paramState.box.mntMode = 'cablecomb';
      updateSubModelPicker();
      paramState.box.mntMode = JSON.parse(before);
      updateSubModelPicker();
    }
  } catch(e){ threw = e.message; }
  chk('перестроение плиток проходит без исключения', threw === null, threw);
  chk('состояние не тронуто', JSON.stringify(paramState && paramState.box ? paramState.box.mntMode : null) === before);
}

console.log('=== TOTAL: ' + pass + ' passed, ' + fail + ' failed ===');
if(fail) process.exit(1);
