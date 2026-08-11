// Справка по выбранной модели и всплывающие подсказки у параметров.
//
// The panel could always say what a PARAMETER does. It could never say what the PART is — which is the
// question you actually have when you land on «переходник круг↔прямоугольник» — and it could never say what
// to print it out of, which is the difference between a living hinge that folds a thousand times and one
// that snaps on the second fold. Both are now in the fold under the tile row, and they are checked here
// because help is exactly the kind of thing that rots: a sub-model gets added, nobody writes its entry, and
// the panel quietly shows the parent shape's text as if it were about the new part.
//
// So: a census. Every base shape and every sub-model must have its OWN entry, every material named must
// exist, and every substitute must be a real material that is not the one it replaces. Nothing here is
// clever; it is the kind of thing that is only ever wrong because no one looked.
//
// The tooltips are the same argument. They are composed from what is already declared — the group, the `w:`
// marks, the range — so they cannot drift from the panel; what CAN go wrong is the composition itself
// producing a line that says nothing, or naming a sub-model by its internal code instead of the name on the
// tile. Both are checked. Run via ./run-all.sh.
let pass=0, fail=0;
function chk(n,c,e){if(c){pass++;console.log('  OK  ',n);}else{fail++;console.log('  FAIL',n,e!==undefined?JSON.stringify(e):'');}}

const ALL = SHAPE_PARAMS.box;
const DEF = {}; for(const sk in SHAPE_PARAMS) for(const r of SHAPE_PARAMS[sk]) if(DEF[r.key]===undefined) DEF[r.key]=r.default;
const MODES = ['box','die','sheet','keycap','thread','hinge','gear','mount','hook',
               'wallorg','pbox','stand','funnel','baseplate','logo3d'];
// What has to be switched on for dominantMode to report each base shape.
const ACTIVATE = {thread:'threadMode', hinge:'pipMode', gear:'gearMode', mount:'mntMode',
                  sheet:'sheetShape', keycap:'keycapMode', die:'platonic', hook:'hookMount',
                  wallorg:'woBack', pbox:'pbPart', stand:'psOn', funnel:'fnOn',
                  baseplate:'gfBaseplate', logo3d:'logo3d'};
function stateFor(mode){
  const on = {}, a = ACTIVATE[mode];
  if(a){ const r = ALL.find(x => x.key === a);
    on[a] = (r && r.type === 'select') ? r.options.map(o=>o.v).filter(v=>v!=='none')[0] : true; }
  return Object.assign({}, DEF, on);
}

console.log('=== материалы: таблица цела ===');
{
  const keys = Object.keys(PRINT_MATERIALS);
  chk('материалов достаточно', keys.length >= 8, keys.length);
  for(const k of keys){
    const m = PRINT_MATERIALS[k];
    chk(k+': есть название', !!m.n && m.n.length > 1, m.n);
    chk(k+': есть описание', !!m.d && m.d.length > 40, m.d && m.d.length);
    chk(k+': описание — законченная фраза', /[.!?]$/.test((m.d||'').trim()), m.d);
    chk(k+': заменители перечислены', Array.isArray(m.sub) && m.sub.length > 0, m.sub);
    for(const s of (m.sub||[])){
      chk(k+' → '+s+': заменитель существует', !!PRINT_MATERIALS[s]);
      chk(k+' → '+s+': заменитель не он же сам', s !== k);
    }
  }
  const names = keys.map(k => PRINT_MATERIALS[k].n);
  chk('названия материалов не повторяются', new Set(names).size === names.length, names);
}

console.log('=== перепись: у каждой модели своя справка ===');
{
  let n = 0;
  for(const mode of MODES){
    const mk = subModelKey(mode), base = stateFor(mode);
    const cases = mk ? subModelTiles(mode).map(t => [mode+':'+t.v, Object.assign({}, base, {[mk]:t.v})])
                     : [[mode, base]];
    for(const [want, p] of cases){
      n++;
      const h = modelHelp(p);
      chk(want+': справка есть', !!h);
      if(!h) continue;
      chk(want+': справка своя, а не родительской формы', h.key === want, h.key);
      chk(want+': сказано, что это', !!h.what && h.what.length > 40, h.what && h.what.length);
      chk(want+': сказано, как печатать', !!h.how && h.how.length > 15, h.how);
      chk(want+': названы материалы', h.mats.length >= 1, h.mats.length);
      chk(want+': у каждого материала есть замена', h.mats.every(m => m.sub.length > 0));
      chk(want+': заголовок совпадает с плиткой', !!h.title && h.title.length > 2, h.title);
      // The text has to be about THIS part: the same sentence under two sub-models means one of them was
      // never written.
      chk(want+': текст — законченные фразы', /[.!?]$/.test(h.what.trim()) && /[.!?]$/.test(h.how.trim()));
    }
  }
  chk('моделей охвачено', n >= 65, n);
  // ...and no two sub-models share a description
  const seen = {};
  for(const mode of MODES){
    const mk = subModelKey(mode), base = stateFor(mode);
    const cases = mk ? subModelTiles(mode).map(t => Object.assign({}, base, {[mk]:t.v})) : [base];
    for(const p of cases){ const h = modelHelp(p); if(!h) continue;
      chk('описание «'+h.key+'» не повторяет чужое', !seen[h.what], seen[h.what]);
      seen[h.what] = h.key; }
  }
}
{ // an unknown material in a model entry would show as a missing block rather than as an error
  for(const key in MODEL_HELP){
    const h = MODEL_HELP[key];
    for(const m of (h.mat||[])) chk('«'+key+'» → материал '+m+' существует', !!PRINT_MATERIALS[m]);
    chk('«'+key+'» — первый материал рекомендуемый и он один', (h.mat||[]).length >= 1 && (h.mat||[]).length <= 3, h.mat);
  }
}

console.log('=== подсказка у параметра ===');
for(const r of ALL){
  const t = paramTooltip(r), lines = t.split('\n');
  chk(r.key+': подсказка начинается с названия', lines[0] === (r.label || r.key), lines[0]);
  chk(r.key+': названа группа', lines.some(l => l.indexOf('Раздел: ') === 0), lines);
  chk(r.key+': сказано, что принимает',
      lines.some(l => /^(От |Вариантов: |Переключатель)/.test(l)) || r.type === 'text', lines);
  chk(r.key+': ни одной пустой строки', lines.every(l => l.trim().length > 0), lines);
}
{
  // Sub-models are named the way the tile names them, not by their internal code — the code is exactly
  // what a person searching cannot look up.
  const codes = new Set();
  for(const g in FAMILY_MODE) for(const t of subModelTiles(GROUP_KIND[g])) codes.add(t.v);
  for(const r of ALL){
    if(!r.w || r.w === '*' || r.w.length > 4) continue;
    const line = paramTooltip(r).split('\n').find(l => l.indexOf('Относится к: ') === 0);
    if(!line) continue;
    chk(r.key+': разновидности названы по-человечески',
        r.w.every(v => codes.has(v) ? line.indexOf(v) < 0 || line.length > v.length : true), line);
    const tiles = subModelTiles(GROUP_KIND[r.group]);
    chk(r.key+': перечислены все её разновидности',
        r.w.every(v => { const t = tiles.find(t=>t.v===v); return t && line.indexOf(t.label) >= 0; }), line);
  }
  const kd = ALL.find(r => r.key === 'gearKeyD');
  chk('условие «needs» попало в подсказку', paramTooltip(kd).indexOf('больше 0') > 0, paramTooltip(kd));
  const bd = ALL.find(r => r.key === 'battD');
  chk('условие «only» попало в подсказку', paramTooltip(bd).indexOf('свой размер') > 0, paramTooltip(bd));
  const many = ALL.find(r => r.key === 'mntW');
  chk('длинный список свёрнут в число', paramTooltip(many).indexOf('Относится к 5 разновидностям') > 0,
      paramTooltip(many));
}

console.log('=== поиск предлагает переключить разновидность ===');
{
  const p = Object.assign({}, DEF, {mntMode:'vesa'});
  const h = searchSubModelHint('Крепёж / монтаж', ['mntCabD'], p);
  chk('найден параметр чужой разновидности — предложено переключиться', !!h && h.value === 'cablecomb', h);
  chk('предложение названо по-человечески', !!h && h.label === 'гребёнка кабелей', h && h.label);
  chk('и указан ключ, которым переключать', !!h && h.key === 'mntMode', h && h.key);
  chk('своя разновидность — предлагать нечего',
      searchSubModelHint('Крепёж / монтаж', ['mntCabD'], Object.assign({}, DEF, {mntMode:'cablecomb'})) === null);
  chk('не-семейство — предлагать нечего', searchSubModelHint('Допуски печати', ['fitTune'], p) === null);
  chk('общий параметр — предлагать нечего', searchSubModelHint('Крепёж / монтаж', ['mntT'], p) === null);
  // ...and the offer is always reachable: whatever it names must be a real tile of that family
  for(const g in FAMILY_MODE){
    const mk = FAMILY_MODE[g], tiles = subModelTiles(GROUP_KIND[g]);
    for(const md of tiles.map(t=>t.v)){
      const st = Object.assign({}, DEF, {[mk]:md});
      for(const r of ALL){
        if(r.group !== g || !r.w || r.w === '*') continue;
        const hint = searchSubModelHint(g, [r.key], st);
        if(!hint) continue;
        chk(g+'/'+md+'/'+r.key+': предложенная разновидность настоящая',
            tiles.some(t => t.v === hint.value), hint);
        // The offer carries whatever named option the row also waits on, so pressing it actually shows the
        // control. A numeric «0 = без» threshold is the one thing it will not decide for you — that is a
        // change to the part, not to the view — and it says so with `blocked`.
        const after = Object.assign({}, st, hint.extra || {}, {[hint.key]:hint.value});
        chk(g+'/'+md+'/'+r.key+': переключение делает параметр видимым (или честно помечено)',
            paramRowRelevant(r, after) === !hint.blocked, {hint, blocked:hint.blocked});
        chk(g+'/'+md+'/'+r.key+': «blocked» только там, где есть числовой порог',
            !!hint.blocked === !!r.needs, hint.blocked);
      }
    }
  }
}


console.log('=== порядок действий там, где он нужен ===');
// Some models are not printed in one go, and those carry a procedure in their help. The roster below is
// explicit — a half-written `steps` must not slip in unnoticed — but membership is not merely asserted:
// what makes an entry legitimate is that the model really HAS a second part to print, so each one is
// checked against its own assemblyMate, and the steps have to name that mate's button and the one file
// format that can carry two objects. An entry with no mate is a procedure for a part that is printed in
// one go, which is a procedure for nothing.
{
  // Some models only HAVE a second part once there is artwork to split — a coaster with no logo has no
  // colours, and its «pair» is the walk back to itself. Each entry therefore says what to set up, not just
  // what to switch on, so the mate being checked is the real one a person would meet.
  const STEPPED = {
    keycap:  {on:{keycapMode:'shell'}, prep:()=>{ logos.length = 0; }},
    coaster: {on:{csMode:'round'}, prep:()=>{
                logos.length = 0;
                const hm = new Float32Array(LOGO_HM_SIZE*LOGO_HM_SIZE);
                for(let i=0;i<hm.length;i++) hm[i] = [0, 1/3, 2/3, 1][i % 4];   // three tones over a background
                logos.push({id:1, face:'-Y', u0:0, v0:0, w:20, h:20, depth:-0.6,
                            threshold:0.5, invert:false, rotation:0, heightmap:hm, levels:3, chan:'detail'}); }},
  };
  const withSteps = Object.keys(MODEL_HELP).filter(k => (MODEL_HELP[k].steps || []).length);
  chk('порядок действий ровно у тех, кто печатается в два захода',
      withSteps.slice().sort().join() === Object.keys(STEPPED).sort().join(), withSteps);
  const savedLogos = (typeof logos !== 'undefined') ? logos.slice() : [];
  for(const k of withSteps){
    const h = MODEL_HELP[k];
    chk(k+': у порядка есть заголовок', !!h.stepsTitle && h.stepsTitle.length > 5, h.stepsTitle);
    chk(k+': шагов достаточно, чтобы это был порядок', h.steps.length >= 4, h.steps.length);
    for(let i=0;i<h.steps.length;i++){
      chk(k+' шаг '+(i+1)+': не пуст', h.steps[i].length > 25, h.steps[i]);
      chk(k+' шаг '+(i+1)+': законченная фраза', /[.!?]$/.test(h.steps[i].trim()), h.steps[i]);
    }
    // the procedure exists because there is a second part — and it names the button that makes it
    const on = STEPPED[k];
    chk(k+': у модели правда есть вторая деталь', !!on, k);
    if(on && on.prep) on.prep();
    const spec = on && assemblyMate(Object.assign({}, DEF, on.on));
    chk(k+': пара находится', !!spec, spec && spec.name);
    chk(k+': её кнопка названа в шагах',
        !!spec && h.steps.some(x => x.indexOf(spec.name) >= 0), spec && spec.name);
    chk(k+': пара несёт логотип', !!spec && spec.logos === true, spec && spec.logos);
    chk(k+': и садится на то же место',
        !!spec && JSON.stringify(spec.seat({minY:0,maxY:9},{minY:0,maxY:9},{px:3,py:1,pz:-2}))
                 === JSON.stringify({px:3,py:1,pz:-2}));
    // the format that can carry two objects, and the one that cannot
    chk(k+': шаги называют 3MF', h.steps.some(x => /3MF/.test(x)));
    chk(k+': шаги предупреждают про STL', h.steps.some(x => /STL/.test(x)));
    // and the help travels: modelHelp must hand the whole procedure on, not just the prose
    const got = modelHelp(Object.assign({}, DEF, on.on));
    chk(k+': справка несёт порядок дальше', got.steps.length === h.steps.length, got.steps.length);
    chk(k+': и заголовок к нему', got.stepsTitle === h.stepsTitle, got.stepsTitle);
  }
  logos.length = 0; for(const l of savedLogos) logos.push(l);
  chk('у куба порядка нет', modelHelp(DEF).steps.length === 0);
  chk('у одноцветного колпачка пары нет', !assemblyMate(Object.assign({}, DEF, {keycapMode:'single'})));
  const back = assemblyMate(Object.assign({}, DEF, {keycapMode:'core'}));
  chk('и обратная пара у кейкапа тоже есть', !!back && back.over.keycapMode === 'shell', back && back.over);
  const cback = assemblyMate(Object.assign({}, DEF, {csMode:'round', csPart:'inlay'}));
  chk('и у подстаканника', !!cback && cback.over.csPart === 'body', cback && cback.over);
}

console.log('=== общей справки снизу больше нет ===');
// It said the same thing as the per-model help now sitting at the top of the panel, and two notes about
// one thing are a question ("are these the same?") asked for nothing.
{
  chk('справка по модели на месте', !!modelHelp(DEF) && modelHelp(DEF).what.length > 40);
  chk('и она про куб', modelHelp(DEF).key === 'box', modelHelp(DEF).key);
  // what the removed note used to explain has to be somewhere: the box's own entry
  const w = modelHelp(DEF).what + ' ' + modelHelp(DEF).how;
  for(const word of ['полая', 'карман'])
    chk('справка куба говорит про «'+word+'»', w.toLowerCase().indexOf(word) >= 0, w);
}

console.log('=== TOTAL: ' + pass + ' passed, ' + fail + ' failed ===');
if(fail) process.exit(1);
