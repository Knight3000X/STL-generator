// Colour printing for labels on ANY base shape (`logoAms`): the body sinks the artwork into a pocket,
// and each tone of the artwork becomes its own closed body filling its own cells of that pocket. The same
// arrangement the coaster has had since v189, lifted off the coaster.
//
// What is actually measured here: that the colours TILE the pocket — every cell of it belongs to exactly
// one colour, no cell twice, none left over — and that each colour is a closed body on its own. A mosaic
// that overlaps prints twice; a mosaic with gaps shows the body's colour through the artwork.
// Run via ./run-all.sh (extraction test).

let pass = 0, fail = 0;
function check(name, cond, extra) {
  if (cond) { pass++; console.log('  OK  ', name); }
  else { fail++; console.log('  FAIL', name, extra !== undefined ? JSON.stringify(extra) : ''); }
}

// A three-tone target: outer ring 0.34, middle ring 0.67, core 1.0, transparent outside.
function ringArt(size){
  const hm = new Float32Array(size*size);
  for (let j=0;j<size;j++) for (let i=0;i<size;i++){
    const dx=(i-size/2)/(size/2), dy=(j-size/2)/(size/2), r=Math.hypot(dx,dy);
    hm[j*size+i] = r < 0.35 ? 1 : r < 0.60 ? 0.67 : r < 0.85 ? 0.34 : 0;
  }
  return hm;
}
function putLogo(over){
  logos.length = 0;
  logos.push(Object.assign({
    id: 1, face: '+Z', u0: 0, v0: 0, w: 24, h: 24, depth: -0.6, threshold: 0.5, invert: false,
    rotation: 0, heightmap: ringArt(256), levels: 4, chan: 'detail',
    tones: ['#101010', '#404040', '#BB1828'],
  }, over || {}));
  return logos[0];
}
function container(over){
  Object.assign(paramState.box, defaultBoxParams(),
    {width:60, height:40, depth:40, hollow:true, wall:2}, over || {});
  boxHoles.length = 0;
  return paramState.box;
}
// Area of the faces looking along +n at a given offset, in the patch's own frame.
function faceArea(tris, n, want, tol){
  let a = 0;
  for (const t of tris){
    const u = [t[1][0]-t[0][0], t[1][1]-t[0][1], t[1][2]-t[0][2]];
    const v = [t[2][0]-t[0][0], t[2][1]-t[0][1], t[2][2]-t[0][2]];
    const c = [u[1]*v[2]-u[2]*v[1], u[2]*v[0]-u[0]*v[2], u[0]*v[1]-u[1]*v[0]];
    const len = Math.hypot(c[0], c[1], c[2]);
    if (len < 1e-12) continue;
    if ((c[0]*n[0] + c[1]*n[1] + c[2]*n[2]) / len < 0.999) continue;      // not facing that way
    const at = t[0][0]*n[0] + t[0][1]*n[1] + t[0][2]*n[2];
    if (Math.abs(at - want) > (tol || 1e-6)) continue;
    a += len / 2;
  }
  return a;
}

// Artwork whose colours meet DIAGONALLY: an X of one tone crossing a band of another, plus a checker
// at the centre. Concentric rings never test the thing that matters here — a colour that touches itself
// only at a cell corner puts four wall quads on one vertical edge, and the plug stops being a solid.
function diagonalArt(size){
  const hm = new Float32Array(size*size);
  for (let j=0;j<size;j++) for (let i=0;i<size;i++){
    const x = i/size - 0.5, y = j/size - 0.5;
    let v = 0;
    if (Math.abs(Math.abs(x) - Math.abs(y)) < 0.06) v = 1;             // the X
    else if (Math.abs(y) < 0.10) v = 0.67;                             // the band
    else if (Math.abs(x) < 0.35 && Math.abs(y) < 0.35
             && ((i>>3) + (j>>3)) % 2 === 0) v = 0.34;                 // the checker
    hm[j*size+i] = v;
  }
  return hm;
}
// How many places a set of cells touches itself only at a corner. Zero is the only acceptable answer:
// see the diagonal fix in logoPatchPlan.
function cornerTouches(mask, N, M, pred){
  let n = 0;
  for (let j=0;j+1<M;j++) for (let i=0;i+1<N;i++){
    const a=pred(mask[j*N+i]), b=pred(mask[j*N+i+1]), c=pred(mask[(j+1)*N+i]), d=pred(mask[(j+1)*N+i+1]);
    if ((a&&d&&!b&&!c) || (b&&c&&!a&&!d)) n++;
  }
  return n;
}

console.log('=== какие тона считаются цветами ===');
{
  const lg = putLogo();
  const inks = logoInks(lg);
  check('три тона — три цвета', inks.levels.length === 3, inks.levels);
  check('нулевой уровень не цвет', inks.levels.every(v => v > 1e-4), inks.levels);
  check('цвета взяты с картинки', (inks.colors||[]).join() === '#101010,#404040,#BB1828', inks.colors);
  // The coaster keeps the background as a colour on a luminance map; a label's patch is the artwork, so
  // here it is dropped — and the colours must be dropped WITH it or every part wears its neighbour's.
  const lum = putLogo({chan:'lum'});
  const cInks = coasterInks(lum), lInks = logoInks(lum);
  check('на яркостной карте подстаканник считает фон цветом', cInks.levels[0] < 1e-4, cInks.levels);
  check('а этикетка — нет', lInks.levels.every(v => v > 1e-4), lInks.levels);
  check('и цвет фона ушёл вместе с ним',
        lInks.colors.length === lInks.levels.length && lInks.colors[0] === cInks.colors[1],
        {label: lInks.colors, coaster: cInks.colors});
  const flat = putLogo({levels:2});
  check('силуэт в один порог — один цвет', logoInks(flat).levels.length === 1, logoInks(flat).levels);
}

console.log('\n=== цвета замощают карман тела ===');
{
  const p = container();
  const lg = putLogo();
  const inks = logoInks(lg);
  p.logoAms = 'body';
  const body = buildTrisForShape('box', p);
  const bb = bboxOfTris(body);
  // The plan the builder itself uses: the host as it stands BEFORE any plate is laid on it. Handing it
  // the finished body instead would probe the plaque's own top, which is flat only over the artwork.
  const saved = logos.splice(0, logos.length);
  const bare = buildTrisForShape('box', Object.assign({}, p, {logoAms:'none'}));
  for (const l of saved) logos.push(l);
  const plan = logoPatchPlan(lg, bboxOfTris(bare), p.logoPlate || 0, logoResolution * 2, bare);
  check('план построен', !!plan);
  check('тело герметично', manifoldCheck(body, 4).watertight);
  // The plaque stands proud of the face it sits on, and its pocket floor is `depth` under its top.
  check('бляшка выступает над гранью', bb.hi[2] > 20 + 1e-6, bb.hi[2]);

  const parts = [];
  for (let k = 1; k <= inks.levels.length; k++){
    p.logoAms = 'ink' + k;
    parts.push(buildTrisForShape('box', p));
  }
  check('цветов ровно столько, сколько тонов', parts.length === 3);
  check('каждый цвет — замкнутое тело', parts.every(t => manifoldCheck(t, 4).watertight),
        parts.map(t => manifoldCheck(t, 4).openEdges));
  check('и не пустой', parts.every(t => t.length > 0), parts.map(t => t.length));

  // The pocket floor of the body and the top faces of the plugs are the two sides of one surface: the
  // colours have to cover it exactly. Area is the honest measure — cell counts would not notice a plug
  // built on a coarser grid, which is the whole failure this design is meant to make impossible.
  const nZ = [0,0,1];
  const floorAt = plan.frame.o[2] + plan.hi, topAt = plan.frame.o[2] + plan.base;
  const pocket = faceArea(body, [0,0,-1], -floorAt, 1e-6) + 0;   // floor looks INTO the plaque
  const pocketUp = faceArea(body, nZ, floorAt, 1e-6);
  const covered = parts.reduce((s,t) => s + faceArea(t, nZ, topAt, 1e-6), 0);
  check('у тела есть дно кармана', (pocket + pocketUp) > 1, {pocket, pocketUp});
  check('цвета накрывают его целиком, ровно один раз',
        Math.abs(covered - (pocket + pocketUp)) < 1e-6 * Math.max(1, covered),
        {covered, pocket: pocket + pocketUp});

  // No colour may sit on top of another: two plugs sharing a cell print the same place twice.
  const cells = new Map();
  for (let k = 0; k < plan.mask.length; k++) if (plan.mask[k]) cells.set(k, (cells.get(k)||0)+1);
  check('каждая ячейка принадлежит ровно одному цвету', [...cells.values()].every(v => v === 1));
  check('и цвет каждой в пределах списка',
        [...plan.mask].every(v => v <= inks.levels.length), Math.max(...plan.mask));

  // A colour part is ONLY its plugs. It must not carry the container: that filament would print a second
  // box under its own logo, which is what the coaster's accent parts were written to avoid.
  const ink1 = bboxOfTris(parts[0]);
  check('цветная деталь не несёт корпус', ink1.hi[0]-ink1.lo[0] < 26 && ink1.hi[1]-ink1.lo[1] < 26,
        {w:+(ink1.hi[0]-ink1.lo[0]).toFixed(2), h:+(ink1.hi[1]-ink1.lo[1]).toFixed(2)});
  check('и лежит в кармане по толщине',
        parts.every(t => { const b = bboxOfTris(t);
          return b.hi[2] <= topAt + 1e-6 && b.lo[2] >= floorAt - LOGO_AMS_LAP - 1e-6; }),
        parts.map(t => bboxOfTris(t)).map(b => [b.lo[2], b.hi[2]]));
  // …and it reaches PAST the floor, or plug and pocket would share a plane instead of interpenetrating.
  check('и заходит за дно кармана', parts.every(t => bboxOfTris(t).lo[2] < floorAt - 1e-6),
        {floorAt, lows: parts.map(t => +bboxOfTris(t).lo[2].toFixed(3))});
}

console.log('\n=== по диагонали цвета не рассыпаются ===');
{
  const p = container();
  const lg = putLogo({heightmap: diagonalArt(256), w: 30, h: 30});
  const inks = logoInks(lg);
  const saved = logos.splice(0, logos.length);
  const bare = buildTrisForShape('box', Object.assign({}, p, {logoAms:'none'}));
  for (const l of saved) logos.push(l);
  const plan = logoPatchPlan(lg, bboxOfTris(bare), p.logoPlate || 0, logoResolution * 2, bare);
  check('план по диагональной картинке построен', !!plan);
  check('в ней три тона', inks.levels.length === 3, inks.levels);
  check('силуэт нигде не сходится в точку',
        cornerTouches(plan.mask, plan.N, plan.M, v => v > 0) === 0,
        cornerTouches(plan.mask, plan.N, plan.M, v => v > 0));
  for (let k = 1; k <= inks.levels.length; k++)
    check('и цвет ' + k + ' тоже',
          cornerTouches(plan.mask, plan.N, plan.M, v => v === k) === 0,
          cornerTouches(plan.mask, plan.N, plan.M, v => v === k));
  // …and the meshes agree: a corner touch shows up as an open edge, not as a wrong-looking picture.
  for (let k = 1; k <= inks.levels.length; k++){
    p.logoAms = 'ink' + k;
    const t = buildTrisForShape('box', p);
    const m = manifoldCheck(t, 4);
    check('деталь цвета ' + k + ' на диагоналях замкнута', m.watertight, m);
  }
  p.logoAms = 'body';
  check('и тело тоже', manifoldCheck(buildTrisForShape('box', p), 4).watertight);
}

console.log('\n=== разрешение диагоналей само по себе ===');
{
  // Driven directly, on masks built to be awkward rather than on artwork that happens to be. The two
  // things it must guarantee: no colour touches itself at a corner when it is done, and the UNION is
  // exactly what came in — cells change colour, never membership, because the body's pocket was already
  // cut from that union.
  const rand = (seed) => () => (seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff;
  let worst = 0, unionBroken = 0, leftover = 0;
  for (let trial = 0; trial < 300; trial++){
    const N = 6 + (trial % 9), M = 6 + ((trial * 5) % 9), K = 1 + (trial % 4);
    const r = rand(trial * 7919 + 13);
    const src = new Uint8Array(N*M);
    for (let q = 0; q < src.length; q++) src[q] = r() < 0.25 ? 0 : 1 + Math.floor(r() * K);
    // the silhouette pass runs first in the real thing, so run it here too
    const mask = Uint8Array.from(src);
    for (let changed = true; changed; ){ changed = false;
      for(let j=0;j+1<M;j++) for(let i=0;i+1<N;i++){
        const a=mask[j*N+i], b=mask[j*N+i+1], c=mask[(j+1)*N+i], d=mask[(j+1)*N+i+1];
        if(a&&d&&!b&&!c){ mask[j*N+i+1]=a; changed=true; }
        else if(b&&c&&!a&&!d){ mask[j*N+i]=b; changed=true; } } }
    const before = Uint8Array.from(mask);
    resolveInkCorners(mask, N, M, K);
    for (let q = 0; q < mask.length; q++) if (!!mask[q] !== !!before[q]) unionBroken++;
    for (let k = 1; k <= K; k++) leftover += cornerTouches(mask, N, M, v => v === k);
    // and it must be SETTLED: another pass may not find anything left to do
    const again = Uint8Array.from(mask);
    resolveInkCorners(again, N, M, K);
    for (let q = 0; q < mask.length; q++) if (again[q] !== mask[q]) worst++;
  }
  check('на 300 случайных мозаиках не осталось ни одного схождения в точку', leftover === 0, leftover);
  check('и союз клеток не тронут', unionBroken === 0, unionBroken);
  check('и повторный проход уже ничего не меняет', worst === 0, worst);
  // A mask that needs a colour to GIVE a cell away: colour 2 is blocked by colour 1, which is settled.
  {
    const N = 4, M = 4, m = new Uint8Array([1,1,1,1, 1,2,1,1, 1,1,2,1, 1,1,1,1]);
    resolveInkCorners(m, N, M, 2);
    check('цвет, которому некого потеснить, отдаёт свою клетку',
          cornerTouches(m, N, M, v => v === 2) === 0 && cornerTouches(m, N, M, v => v === 1) === 0,
          [...m]);
    check('и союз всё тот же', [...m].every(v => v > 0), [...m]);
  }
}

console.log('\n=== мозаика из шума: проход обязан сойтись, а не упереться в потолок ===');
{
  // Dense three-tone noise is the hard case for the re-colouring sweep: every colour has diagonals
  // against every other, so a rule that resolves ties by always TAKING the cell can pass it back and
  // forth for ever. The sweep is capped, so cycling does not hang — it leaves an open edge instead,
  // which is exactly what this measures.
  const size = 256, hm = new Float32Array(size*size);
  let seed = 12345;
  const rnd = () => (seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff;
  const blocks = 32, cellPx = size / blocks, tone = [0, 0.34, 0.67, 1];
  for (let bj=0;bj<blocks;bj++) for (let bi=0;bi<blocks;bi++){
    const v = tone[Math.floor(rnd()*4)];
    for (let j=bj*cellPx;j<(bj+1)*cellPx;j++) for (let i=bi*cellPx;i<(bi+1)*cellPx;i++) hm[j*size+i] = v;
  }
  const p = container();
  const lg = putLogo({heightmap: hm, w: 30, h: 30});
  const inks = logoInks(lg);
  const saved = logos.splice(0, logos.length);
  const bare = buildTrisForShape('box', Object.assign({}, p, {logoAms:'none'}));
  for (const l of saved) logos.push(l);
  const plan = logoPatchPlan(lg, bboxOfTris(bare), p.logoPlate || 0, logoResolution * 2, bare);
  check('план по шуму построен', !!plan);
  check('в шуме три тона', inks.levels.length === 3, inks.levels);
  check('силуэт сошёлся', cornerTouches(plan.mask, plan.N, plan.M, v => v > 0) === 0,
        cornerTouches(plan.mask, plan.N, plan.M, v => v > 0));
  for (let k = 1; k <= inks.levels.length; k++)
    check('цвет ' + k + ' сошёлся', cornerTouches(plan.mask, plan.N, plan.M, v => v === k) === 0,
          cornerTouches(plan.mask, plan.N, plan.M, v => v === k));
  for (let k = 1; k <= inks.levels.length; k++){
    p.logoAms = 'ink' + k;
    const m = manifoldCheck(buildTrisForShape('box', p), 4);
    check('и деталь цвета ' + k + ' замкнута', m.watertight, m);
  }
}

console.log('\n=== выключено — ничего не изменилось ===');
{
  const p = container();
  putLogo();
  p.logoAms = 'none';
  const plain = buildTrisForShape('box', p);
  check('обычный логотип по-прежнему смещает вершины куба, а не кладёт бляшку',
        bboxOfTris(plain).hi[2] <= 20 + 1e-6, bboxOfTris(plain).hi[2]);
  check('и деталь герметична', manifoldCheck(plain, 4).watertight);
  const idTaper = pt => pt;                       // no taper: the frame builder only needs a mapping
  check('диспетчер рельефа работает, пока цветная печать выключена',
        Object.keys(buildCombinedLogoDispFns(idTaper)).length > 0);
  p.logoAms = 'body';
  check('а при включённой — молчит, чтобы карман резала одна машинка',
        Object.keys(buildCombinedLogoDispFns(idTaper)).length === 0);
}

console.log('\n=== цепочка сборки и группировка в 3MF ===');
{
  const p = container();
  putLogo();
  p.logoAms = 'body';
  const m1 = assemblyMate(p);
  check('от тела ведёт к первому цвету', m1 && m1.name === 'Цвет 1 (AMS)', m1 && m1.name);
  check('и цвет берётся с картинки', m1 && m1.color === '#101010', m1 && m1.color);
  check('пара несёт логотип', m1 && m1.logos === true);
  const m2 = assemblyMate(Object.assign({}, p, {logoAms:'ink2'}));
  check('второй ведёт к третьему', m2 && m2.name === 'Цвет 3 (AMS)', m2 && m2.name);
  check('с его цветом', m2 && m2.color === '#BB1828', m2 && m2.color);
  const m3 = assemblyMate(Object.assign({}, p, {logoAms:'ink3'}));
  check('последний возвращает к телу', m3 && /Тело/.test(m3.name), m3 && m3.name);
  // Explicit beats implicit: a jar has a cap to offer, but colour printing was switched on deliberately.
  const jar = assemblyMate(Object.assign({}, p, {threadMode:'jar'}));
  check('явно включённый цвет важнее готовой пары', jar && /Цвет/.test(jar.name), jar && jar.name);
  check('а без него банка снова предлагает крышку',
        /Крышка/.test((assemblyMate(Object.assign({}, p, {threadMode:'jar', logoAms:'none'}))||{}).name));
  // The parts share one place, so they are parts of ONE printed body — see mfBodyKey.
  const rec = (part) => ({params:{logoAms:part}, px:0, py:0, pz:0, rx:0, ry:0, rz:0});
  check('тело и цвета — одно печатаемое тело',
        mfBodyKey(rec('body')) === mfBodyKey(rec('ink2')) && mfBodyKey(rec('body')) !== null,
        mfBodyKey(rec('body')));
  check('а модель без цветной печати — своё',
        mfBodyKey({params:{logoAms:'none'}, px:0,py:0,pz:0,rx:0,ry:0,rz:0}) === null);
}

console.log('\n=== то же на форме, которая и так получала этикетку плитой ===');
{
  const p = container({sheetShape:'rect', width:60, height:4, depth:60, hollow:false});
  putLogo({face:'+Y'});
  p.logoAms = 'body';
  const body = buildTrisForShape('box', p);
  check('тело листа герметично', manifoldCheck(body, 4).watertight);
  p.logoAms = 'ink1';
  const ink = buildTrisForShape('box', p);
  check('цвет построился', ink.length > 0, ink.length);
  check('и он герметичен', manifoldCheck(ink, 4).watertight, manifoldCheck(ink, 4));
  const b = bboxOfTris(ink);
  check('и это только пробки', (b.hi[0]-b.lo[0]) < 26 && (b.hi[2]-b.lo[2]) < 26,
        {w:+(b.hi[0]-b.lo[0]).toFixed(2), d:+(b.hi[2]-b.lo[2]).toFixed(2)});
}

console.log('\n=== выпуклый логотип: пробка это сама надпись ===');
{
  const p = container();
  putLogo({depth: 0.8});
  p.logoAms = 'ink1';
  const ink = buildTrisForShape('box', p);
  check('строится и на выпуклом', ink.length > 0);
  check('герметичен', manifoldCheck(ink, 4).watertight);
  const b = bboxOfTris(ink);
  check('и стоит НАД гранью, а не под ней', b.hi[2] > 20, {hi: +b.hi[2].toFixed(2)});
}

console.log('\n=== игральная кость: цифры своим цветом ===');
{
  // A die's numbers are not logos — they come from the «Грани кости» cards and are cut by the die's own
  // machinery — so colour printing reaches them through their own builder. Everything else is shared.
  // Deliberately NOT a circle: a disc is invariant under the glyph's own rotation, so a plug built with
  // the rotation dropped would still land in the right place and cover the right area. An L catches it.
  const blob = () => { const N = LOGO_HM_SIZE, h = new Float32Array(N*N);
    for (let y=0;y<N;y++) for (let x=0;x<N;x++){ const fx=x/N-0.5, fy=y/N-0.5;
      h[y*N+x] = (Math.abs(fx) < 0.08 && Math.abs(fy) < 0.28) || (fy > 0.12 && fy < 0.28 && fx > -0.08 && fx < 0.26)
        ? 1 : 0; } return h; };
  const die = (over) => {
    logos.length = 0; boxHoles.length = 0; dieFaces.length = 0;
    Object.assign(paramState.box, defaultBoxParams(),
      {width:20, height:20, depth:20, platonic:'d6', hollow:false}, over || {});
    for (let f=0; f<6; f++) dieFaces.push({id:f+1, face:f, src:'text', depth:-0.8, sizeFrac:0.5,
      rotation:(f*30)%360, invert:false, threshold:0.5, offU:(f%2?0.18:-0.12), offV:(f%3?-0.15:0.2), heightmap:blob()});
    return paramState.box;
  };
  const p = die();
  check('у кости с цифрами один акцентный цвет', amsInkCount(p) === 1, amsInkCount(p));
  check('и он тёмный по умолчанию — картинки, с которой его взять, тут нет',
        amsInkColor(p, 1) === '#20242a', amsInkColor(p, 1));
  dieFaces.length = 0;
  check('без цифр красить нечего', amsInkCount(p) === 0, amsInkCount(p));

  die();
  p.logoAms = 'body';
  const body = buildTrisForShape('box', p);
  check('тело кости герметично', manifoldCheck(body, 4).watertight);
  p.logoAms = 'ink1';
  const ink = buildTrisForShape('box', p);
  check('цифры построились', ink.length > 0, ink.length);
  check('и они герметичны', manifoldCheck(ink, 4).watertight, manifoldCheck(ink, 4));
  // ONLY the numbers: a die's own volume is orders of magnitude bigger than six little glyphs.
  const vol = t => { let v = 0; for (const T of t){ const [a1,b1,c1] = T;
    v += (a1[0]*(b1[1]*c1[2]-b1[2]*c1[1]) - a1[1]*(b1[0]*c1[2]-b1[2]*c1[0]) + a1[2]*(b1[0]*c1[1]-b1[1]*c1[0]))/6; }
    return v; };
  check('цветная деталь не несёт саму кость', vol(ink) > 0 && vol(ink) < vol(body) * 0.1,
        {ink: +vol(ink).toFixed(1), body: +vol(body).toFixed(1)});
  // The plug fills exactly the pocket the body cut: same grid, same cells, so the two areas are equal.
  // Measured on the +X face, where the die's own face plane is axis-aligned and the numbers are flush.
  const nX = [1,0,0];
  const floor = faceArea(body, nX, 10 - 0.8, 1e-6);       // pocket floor of the +X face
  const top   = faceArea(ink,  nX, 10, 1e-6);             // top of that face's plug
  check('дно кармана и пробка совпадают по площади', floor > 1 && Math.abs(top - floor) < 1e-6 * floor,
        {floor, top});
  check('пробка не выходит за поверхность кости', bboxOfTris(ink).hi[0] <= 10 + 1e-6,
        bboxOfTris(ink).hi[0]);
  // Area alone would not notice the glyph's own rotation being dropped — an L would simply land turned.
  // So the two are compared by WHERE they are as well: same centroid in the face's own plane.
  const centroid = (tris, n, want) => { let A=0, cy=0, cz=0;
    for (const T of tris){
      const u=[T[1][0]-T[0][0],T[1][1]-T[0][1],T[1][2]-T[0][2]], v=[T[2][0]-T[0][0],T[2][1]-T[0][1],T[2][2]-T[0][2]];
      const c=[u[1]*v[2]-u[2]*v[1], u[2]*v[0]-u[0]*v[2], u[0]*v[1]-u[1]*v[0]], L=Math.hypot(c[0],c[1],c[2]);
      if (L < 1e-12 || (c[0]*n[0]+c[1]*n[1]+c[2]*n[2])/L < 0.999) continue;
      if (Math.abs(T[0][0]*n[0]+T[0][1]*n[1]+T[0][2]*n[2] - want) > 1e-6) continue;
      const a2=L/2; A+=a2; cy += a2*(T[0][1]+T[1][1]+T[2][1])/3; cz += a2*(T[0][2]+T[1][2]+T[2][2])/3;
    }
    return A > 0 ? [cy/A, cz/A] : null; };
  const cF = centroid(body, nX, 10 - 0.8), cP = centroid(ink, nX, 10);
  check('и стоит там же, где карман — с тем же поворотом глифа',
        cF && cP && Math.hypot(cF[0]-cP[0], cF[1]-cP[1]) < 1e-6, {pocket: cF, plug: cP});
  check('а глиф несимметричен и сдвинут с центра, иначе ни поворот, ни смещение поймать нечем',
        cF && Math.hypot(cF[0], cF[1]) > 0.3, cF);
  // …and an EMBOSSED number is the plug itself, standing proud.
  for (const a1 of dieFaces) a1.depth = 0.8;
  const up = buildTrisForShape('box', p);
  check('выпуклые цифры тоже строятся и замкнуты',
        up.length > 0 && manifoldCheck(up, 4).watertight);
  check('и стоят НАД гранью', bboxOfTris(up).hi[0] > 10 + 1e-6, bboxOfTris(up).hi[0]);

  die();
  check('цепочка ведёт к цвету', /Цвет 1/.test((assemblyMate(Object.assign({}, p, {logoAms:'body'}))||{}).name));
  check('и возвращает к кости',
        /Кость/.test((assemblyMate(Object.assign({}, p, {logoAms:'ink1'}))||{}).name),
        (assemblyMate(Object.assign({}, p, {logoAms:'ink1'}))||{}).name);
  // A die may also carry a label on the cube-logo list. The label patch must not take over its ink part —
  // the numbers are what the colour is for.
  putLogo();
  p.logoAms = 'ink1';
  const both = buildTrisForShape('box', p);
  check('этикетка не перехватывает цветную деталь кости',
        Math.abs(vol(both) - vol(ink)) < 1e-6 * Math.max(1, Math.abs(vol(ink))),
        {both: +vol(both).toFixed(3), die: +vol(ink).toFixed(3)});
  logos.length = 0; dieFaces.length = 0;
}

console.log(`\n=== TOTAL: ${pass} passed, ${fail} failed ===`);
process.exit(fail ? 1 : 0);
