// Keycaps (кейкапы): parametric cap with MX/Choc stems, dish, legend from the first logo card, and the
// AMS two-colour shell/core pair. Watertight in every mode through the REAL pipeline.
//
// The DISH is measured rather than assumed, because its shape is what tells one profile from another and
// no amount of watertightness has an opinion about it. Cherry and OEM are scooped in ONE plane — a
// cylindrical trough across the key, dead straight front to back — and SA, XDA and DSA in two. A cap that
// says Cherry and comes out with a bowl is wrong in the only way that matters, and it is wrong silently.
// So: rays down onto the top surface, and the sag across each axis compared with the other. Run via
// ./run-all.sh.
let pass=0,fail=0; function chk(n,c,e){if(c){pass++;console.log('  OK  ',n);}else{fail++;console.log('  FAIL',n,e!==undefined?JSON.stringify(e):'');}}
function vol(t){let v=0;for(const T of t){const a=T[0],b=T[1],c=T[2];v+=(a[0]*(b[1]*c[2]-b[2]*c[1])-a[1]*(b[0]*c[2]-b[2]*c[0])+a[2]*(b[0]*c[1]-b[1]*c[0]))/6;}return v;}
function blobHM(r){ const N=LOGO_HM_SIZE,h=new Float32Array(N*N); r=r||0.3; for(let y=0;y<N;y++)for(let x=0;x<N;x++){const fx=x/N-0.5,fy=y/N-0.5;h[y*N+x]=(Math.hypot(fx,fy)<r)?1:0;} return h; }
function base(ov, withLegend){
  logos.length=0; boxHoles.length=0; dieFaces.length=0;
  if(withLegend) logos.push({id:nextLogoId++,face:'+Y',u0:0,v0:0,w:8,h:8,depth:1,threshold:0.5,invert:false,rotation:0,heightmap:blobHM(),previewUrl:null});
  Object.assign(paramState.box, defaultBoxParams(), {keycapMode:'single',keySizeU:1,keyH:9,keyTaper:2.4,keyRound:1.8,
    keyWall:1.3,keyPlate:1.8,keyDish:1,keyLegendDepth:0.6,keyStem:'mx',keyStemTol:0.1}, ov);
  return buildTrisForShape('box',paramState.box); }

console.log('=== single-colour cap: sizes / stems / dish ===');
for(const u of [1,1.5,2,6.25]){ const t=base({keySizeU:u}); const mc=manifoldCheck(t,4);
  chk('cap '+u+'u (MX) watertight (+vol)', mc.watertight&&vol(t)>0, mc); }
chk('cap choc stem watertight', manifoldCheck(base({keyStem:'choc'}),4).watertight);
chk('cap no stem watertight', manifoldCheck(base({keyStem:'none'}),4).watertight);
chk('cap flat top (dish 0) watertight', manifoldCheck(base({keyDish:0}),4).watertight);
{ const b=computeBBox(base({keySizeU:1})); chk('1u footprint ≈18.2mm', Math.abs((b.maxX-b.minX)-18.2)<0.2 && Math.abs(b.minY-0)<1e-6, {w:b.maxX-b.minX,y0:b.minY}); }
{ const noStem=vol(base({keyStem:'none'})), mx=vol(base({keyStem:'mx'}));
  chk('MX stem adds material', mx>noStem, {noStem,mx}); }

console.log('=== legend from the first logo card ===');
chk('single + engraved legend watertight', manifoldCheck(base({},true),4).watertight);
chk('single + embossed legend (neg depth) watertight', manifoldCheck(base({keyLegendDepth:-0.5},true),4).watertight);
{ const plain=vol(base({keyDish:0})), eng=vol(base({keyDish:0},true));
  chk('engraved legend removes material', eng<plain, {plain,eng}); }

console.log('=== AMS pair: shell (through legend) + core (plugs) ===');
chk('shell with through legend watertight', manifoldCheck(base({keycapMode:'shell'},true),4).watertight);
chk('shell without legend watertight (solid top)', manifoldCheck(base({keycapMode:'shell'}),4).watertight);
chk('core insert watertight', manifoldCheck(base({keycapMode:'core'},true),4).watertight);
chk('core without legend watertight (plain slab)', manifoldCheck(base({keycapMode:'core'}),4).watertight);
{ const shell=vol(base({keycapMode:'shell'},true)), solid=vol(base({keycapMode:'shell'}));
  chk('through legend removes material from shell', shell<solid, {shell,solid}); }
{ const core=vol(base({keycapMode:'core'},true)), slab=vol(base({keycapMode:'core'}));
  chk('legend plugs add material to core', core>slab, {core,slab}); }
chk('shell choc watertight', manifoldCheck(base({keycapMode:'shell',keyStem:'choc'},true),4).watertight);
chk('shell 2u watertight', manifoldCheck(base({keycapMode:'shell',keySizeU:2},true),4).watertight);

console.log('=== profiles (Cherry/OEM/SA/MDA/XDA/DSA) × rows ===');
for(const pr of ['cherry','oem','sa','mda','xda','dsa'])
  for(const r of ['r1','r3','r4'])
    chk(pr+' '+r+' watertight', manifoldCheck(base({keyProfile:pr,keyRow:r},true),4).watertight);
{ const hSA=computeBBox(base({keyProfile:'sa'})).maxY, hDSA=computeBBox(base({keyProfile:'dsa'})).maxY;
  chk('SA taller than DSA', hSA>hDSA+4, {hSA,hDSA}); }
{ // sculpted R1 tilts the front edge down: max Y at the back (z<0) higher than at the front (z>0)
  const t=base({keyProfile:'cherry',keyRow:'r1',keyStem:'none'});
  let backTop=-1, frontTop=-1;
  for(const T of t) for(const v of T){ if(v[2]<-5) backTop=Math.max(backTop,v[1]); if(v[2]>5) frontTop=Math.max(frontTop,v[1]); }
  chk('cherry R1 top tilts toward the front', backTop>frontTop+0.5, {backTop,frontTop}); }
{ const a=computeBBox(base({keyProfile:'xda',keyRow:'r1'})).maxY, b=computeBBox(base({keyProfile:'xda',keyRow:'r4'})).maxY;
  chk('uniform profile ignores the row', Math.abs(a-b)<1e-6, {a,b}); }
chk('profile + shell watertight', manifoldCheck(base({keyProfile:'sa',keycapMode:'shell'},true),4).watertight);
chk('profile + core watertight', manifoldCheck(base({keyProfile:'oem',keyRow:'r1',keycapMode:'core'},true),4).watertight);


console.log('=== чаша: цилиндрическая у Cherry, сферическая у SA ===');
// Solid intervals along a ray, counted by DEPTH. `ax`=1 fixes the ray at (z, x) — that order, not (x, z).
function solidRuns(tris, ax, p, q){
  const u=(ax+1)%3, v=(ax+2)%3, hits=[];
  for(const T of tris){ const [a,b,c]=T;
    const d1=(b[u]-a[u])*(q-a[v])-(b[v]-a[v])*(p-a[u]);
    const d2=(c[u]-b[u])*(q-b[v])-(c[v]-b[v])*(p-b[u]);
    const d3=(a[u]-c[u])*(q-c[v])-(a[v]-c[v])*(p-c[u]);
    if(!((d1>=0&&d2>=0&&d3>=0)||(d1<=0&&d2<=0&&d3<=0))) continue;
    const A=(b[u]-a[u])*(c[v]-a[v])-(b[v]-a[v])*(c[u]-a[u]); if(Math.abs(A)<1e-12) continue;
    const w1=((b[u]-p)*(c[v]-q)-(b[v]-q)*(c[u]-p))/A, w2=((c[u]-p)*(a[v]-q)-(c[v]-q)*(a[u]-p))/A;
    const e1=[b[0]-a[0],b[1]-a[1],b[2]-a[2]], e2=[c[0]-a[0],c[1]-a[1],c[2]-a[2]];
    const nrm=[e1[1]*e2[2]-e1[2]*e2[1], e1[2]*e2[0]-e1[0]*e2[2], e1[0]*e2[1]-e1[1]*e2[0]];
    if(Math.abs(nrm[ax])<1e-12) continue;
    hits.push([w1*a[ax]+w2*b[ax]+(1-w1-w2)*c[ax], nrm[ax]<0 ? 1 : -1]);
  }
  hits.sort((A,B)=>A[0]-B[0]);
  const runs=[]; let depth=0, start=null;
  for(const [t0,d] of hits){ const prev=depth; depth+=d;
    if(prev<=0 && depth>0) start=t0;
    else if(prev>0 && depth<=0){ if(start!==null && t0-start > 1e-6) runs.push([start,t0]); start=null; } }
  return runs;
}
// The top of the cap at (x, z). Probed OFF the centre line and off any round number: the middle of a grid
// cell's face lies on the diagonal that splits it in two, and a ray through a shared edge is counted twice
// and reads as no surface at all.
const topAt = (tris,x,z) => { const r = solidRuns(tris,1,z,x); return r.length ? r[r.length-1][1] : NaN; };
// Sag across each axis: how much lower the middle sits than the two sides. Cylindrical means one of these
// is real and the other is zero; spherical means both.
function sag(tris){
  const c = topAt(tris, 0.37, 0.29);
  return { x: (topAt(tris,-4.37,0.29) + topAt(tris,4.37,0.29))/2 - c,
           z: (topAt(tris,0.37,-4.71) + topAt(tris,0.37,4.71))/2 - c, c };
}
{
  // Every profile builds, and every profile now HAS a dish — «dish: 0» on all six was the real bug: the
  // presets came out flat-topped, which is not a look any of them has.
  const PROFILES = Object.keys(KEYCAP_PROFILES);
  chk('профилей столько, сколько на таблице сравнения', PROFILES.length >= 18, PROFILES.length);
  for(const pr of PROFILES){
    const t = base({keyProfile:pr, keyRow:'r3'});
    chk(pr+': водонепроницаем', manifoldCheck(t,4).watertight && vol(t)>0, manifoldCheck(t,4));
    chk(pr+': чаша объявлена', KEYCAP_PROFILES[pr].dish > 0.3, KEYCAP_PROFILES[pr].dish);
    chk(pr+': форма чаши названа', ['cyl','sph'].includes(KEYCAP_PROFILES[pr].dishKind),
        KEYCAP_PROFILES[pr].dishKind);
    const g = sag(t), want = KEYCAP_PROFILES[pr].dishKind;
    chk(pr+': ложбина поперёк есть', g.x > 0.1, g);
    if(want === 'cyl') chk(pr+': вдоль — прямая (цилиндр)', Math.abs(g.z) < 0.1, g);
    else               chk(pr+': вдоль — тоже ложбина (сфера)', g.z > 0.1, g);
  }
  // Cherry and OEM are the two the photo is of; state them by name so the profile cannot quietly drift.
  chk('Cherry — цилиндрическая', KEYCAP_PROFILES.cherry.dishKind === 'cyl');
  chk('OEM — цилиндрическая', KEYCAP_PROFILES.oem.dishKind === 'cyl');
  chk('SA — сферическая', KEYCAP_PROFILES.sa.dishKind === 'sph');
}
{
  // The custom profile chooses for itself, and the choice is the ONLY difference between the two: across
  // the key both sag the same, along it one does and one does not.
  const cyl = base({keyProfile:'custom', keyDish:1.5, keyDishKind:'cyl'});
  const sph = base({keyProfile:'custom', keyDish:1.5, keyDishKind:'sph'});
  const flat= base({keyProfile:'custom', keyDish:0});
  const gc = sag(cyl), gs = sag(sph), gf = sag(flat);
  chk('цилиндр: поперёк ложбина', gc.x > 0.3, gc);
  chk('цилиндр: вдоль ровно', Math.abs(gc.z) < 0.05, gc);
  chk('сфера: ложбина в обе стороны', gs.x > 0.3 && gs.z > 0.3, gs);
  chk('поперёк обе одинаковы', Math.abs(gc.x - gs.x) < 0.05, {cyl:gc.x, sph:gs.x});
  chk('плоская: никакой ложбины', Math.abs(gf.x) < 0.02 && Math.abs(gf.z) < 0.02, gf);
  chk('плоская выше обеих', gf.c > gc.c && gf.c > gs.c, {flat:gf.c, cyl:gc.c, sph:gs.c});
  // deeper dish → lower middle, and by the depth asked for
  for(const d of [0.5, 1, 2, 3]){
    const t = base({keyProfile:'custom', keyDish:d, keyDishKind:'cyl'});
    chk('глубина '+d+': середина ниже плоской на '+d+' мм',
        Math.abs((gf.c - sag(t).c) - d) < 0.06, {got:gf.c - sag(t).c, want:d});
  }
  // ...and the shape of it is a circular ARC of the depth asked for over the top face's own half-width —
  // radius (a²+d²)/2d — not the parabola that is easier to write. Checked against the closed form at
  // several offsets rather than against "lower than a parabola", because that pins the radius too: at
  // 3 mm the two curves differ by only ~0.05 mm and a comparison that loose would pass a wrong radius.
  for(const d of [1, 3]){
    const t2 = base({keyProfile:'custom', keyDish:d, keyDishKind:'cyl', keyTaper:2.4, keyH:9});
    const a = (18.2 - 2*2.4)/2, Rc = (a*a + d*d)/(2*d);
    for(const q of [0.37, 2.63, 4.37]){          // inside the cell grid, where the arc is sampled finely
      const want = 9 - (d - (Rc - Math.sqrt(Rc*Rc - q*q)));
      chk('чаша '+d+' на '+q+' мм от оси: поверхность на дуге R'+Rc.toFixed(2),
          Math.abs(topAt(t2, q, 0.29) - want) < 0.03, {got:topAt(t2, q, 0.29), want});
    }
    // Past the grid the top is a coarse annulus stitched out to the cap's edge, so its facets are big
    // enough to see in a measurement: a chord of a curve that sags away from you lies ABOVE it, never
    // below, and here by under a tenth of a millimetre. Stated as the bound it is rather than hidden in a
    // loose tolerance on the whole check.
    { const q = 5.13, want = 9 - (d - (Rc - Math.sqrt(Rc*Rc - q*q))), got = topAt(t2, q, 0.29);
      chk('чаша '+d+' у самой кромки: грань кольца лежит НАД дугой, не под ней',
          got > want - 0.005 && got < want + 0.1, {got, want}); }
  }
}
{
  // The scoop must not eat the plate it is cut into. It did: a 3 mm dish over a 1.8 mm plate opened the
  // cavity through the top of the cap — watertight, correctly paired edge for edge, and a hole.
  for(const d of [0, 1, 2, 3]) for(const pl of [1, 1.8, 4]){
    const t = base({keyProfile:'custom', keyDish:d, keyPlate:pl});
    chk('чаша '+d+' плита '+pl+': водонепроницаем', manifoldCheck(t,4).watertight && vol(t)>0,
        manifoldCheck(t,4));
    // one solid run straight down the middle: top plate, then the cavity, then nothing
    const runs = solidRuns(t, 1, 0.29, 0.37);
    chk('чаша '+d+' плита '+pl+': крышка цела', runs.length >= 1 && runs[runs.length-1][1] > 1, runs);
  }
  // deep dish on a sculpted, tilted row is the worst case of the three effects at once
  for(const pr of ['cherry','oem','sa']) for(const row of ['r1','r2','r3','r4'])
    chk(pr+'/'+row+': водонепроницаем', manifoldCheck(base({keyProfile:pr, keyRow:row}),4).watertight);
  for(const u of [1, 2, 6.25]) for(const pr of ['cherry','sa'])
    chk(pr+' '+u+'u: водонепроницаем', manifoldCheck(base({keyProfile:pr, keySizeU:u}),4).watertight);
}
{
  // The rows a preset decides for you are hidden while a preset is chosen — a control that does nothing is
  // worse than a control that is not there.
  const row = k => SHAPE_PARAMS.box.find(r => r.key === k);
  for(const k of ['keyH','keyTaper','keyDish','keyDishKind']){
    chk(k+': только для своего профиля', !!row(k).only && row(k).only.keyProfile.join() === 'custom',
        row(k).only);
    chk(k+': виден при «свой»', paramRowRelevant(row(k),
        Object.assign({}, paramState.box, {keyProfile:'custom', keyDish:1})));
    chk(k+': скрыт при Cherry', !paramRowRelevant(row(k),
        Object.assign({}, paramState.box, {keyProfile:'cherry', keyDish:1})));
  }
  chk('форма чаши скрыта при нулевой чаше', !paramRowRelevant(row('keyDishKind'),
      Object.assign({}, paramState.box, {keyProfile:'custom', keyDish:0})));
  chk('ряд — для всякого пресета, но не для «своего»',
      row('keyRow').only.keyProfile.join() === Object.keys(KEYCAP_PROFILES).join(), row('keyRow').only);
  chk('ряд виден у XDA (у него всё равно есть пробел)', paramRowRelevant(row('keyRow'),
      Object.assign({}, paramState.box, {keyProfile:'xda'})));
  chk('ряд скрыт при «своём» профиле', !paramRowRelevant(row('keyRow'),
      Object.assign({}, paramState.box, {keyProfile:'custom'})));
}


console.log('=== профили и ряды с таблицы сравнения ===');
{
  const PROFILES = Object.keys(KEYCAP_PROFILES);
  // The chart's number against a profile's name is the height of its TALLEST row, so that is what has to
  // come out of the tallest row and nothing else. Written down once, checkable against the picture.
  const CHART = {sa:16.5, csa:16.1, taihao:14.8, osa:14.4, asa:14.4, kat:13.5, mt3:13.3,
                 mda:12.5, oem:11.9, dss:11.0, jda:10.5, cherry:9.4,
                 sal:13.9, kam:9.1, xda:9.1, asalow:8.9, dsa:7.6, g20:7.1};
  for(const pr of PROFILES){
    chk(pr+': высота с таблицы', Math.abs(KEYCAP_PROFILES[pr].top - CHART[pr]) < 1e-9,
        {got:KEYCAP_PROFILES[pr].top, chart:CHART[pr]});
    const hs = KEYCAP_ROWS.map(r => keycapRowSpec(pr, r).h);
    chk(pr+': самый высокий ряд — заявленная высота', Math.abs(Math.max(...hs) - CHART[pr]) < 1e-9, hs);
    chk(pr+': ни один ряд не выше', hs.every(h => h <= CHART[pr] + 1e-9), hs);
    chk(pr+': семейство скульптуры настоящее', !!KEYCAP_SCULPT[KEYCAP_PROFILES[pr].sculpt],
        KEYCAP_PROFILES[pr].sculpt);
    chk(pr+': у профиля есть человеческое имя', !!KEYCAP_PROFILES[pr].t && KEYCAP_PROFILES[pr].t.length > 3);
  }
  chk('таблица и проверка описывают один список',
      Object.keys(CHART).sort().join() === PROFILES.slice().sort().join(),
      {chart:Object.keys(CHART).length, code:PROFILES.length});
  // A sculpted profile steps down towards the home row and back up; a flat one does not step at all.
  for(const pr of PROFILES){
    const S = KEYCAP_SCULPT[KEYCAP_PROFILES[pr].sculpt];
    const h = i => keycapRowSpec(pr, KEYCAP_ROWS[i]).h;
    if(KEYCAP_PROFILES[pr].sculpt === 'flat'){
      chk(pr+': нескульптурный — все ряды равны', [0,1,2,3,4].every(i => Math.abs(h(i)-h(0)) < 1e-9),
          [0,1,2,3,4].map(h));
      chk(pr+': и наклона по рядам нет', [0,1,2,3,4].every(i => S.ang[i] === 0), S.ang);
    } else {
      chk(pr+': домашний ряд — самый низкий из R1…R5',
          h(2) <= Math.min(h(0),h(1),h(3),h(4)) + 1e-9, [0,1,2,3,4].map(h));
      chk(pr+': верхний ряд наклонён к себе, нижний от себя', S.ang[0] < 0 && S.ang[4] > 0, S.ang);
      chk(pr+': домашний ряд без наклона', S.ang[2] === 0, S.ang);
      chk(pr+': наклон растёт монотонно', [1,2,3,4].every(i => S.ang[i] > S.ang[i-1]), S.ang);
    }
  }
}
{
  // The spacebar row: level top, and a cylindrical trough whatever the profile does elsewhere. A bowl
  // 100 mm across is a valley you cannot get out of, and no set has ever had one.
  for(const pr of Object.keys(KEYCAP_PROFILES)){
    const rs = keycapRowSpec(pr, 'space');
    chk(pr+'/пробел: верх ровный', rs.ang === 0, rs.ang);
    chk(pr+'/пробел: жёлоб, а не чаша', rs.dishKind === 'cyl', rs.dishKind);
    chk(pr+'/пробел: не выше самого высокого ряда', rs.h <= KEYCAP_PROFILES[pr].top + 1e-9, rs.h);
  }
  // ...and it really is straight front to back, on the profiles whose alphas are bowls. Probed near the
  // centre for the Z direction and out at the ends for the X one: a trough spanning 110 mm is nearly flat
  // over the middle 9, so the same offsets that read an alpha would read a spacebar as having no dish.
  for(const pr of ['sa','dsa','kat','cherry']){
    const t = base({keyProfile:pr, keyRow:'space', keySizeU:6.25});
    chk(pr+'/пробел: водонепроницаем', manifoldCheck(t,4).watertight && vol(t)>0, manifoldCheck(t,4));
    const g = sag(t);
    chk(pr+'/пробел: вдоль клавиши прямой', Math.abs(g.z) < 0.02, g);
    const c = topAt(t, 0.37, 0.29), farL = topAt(t, -48.37, 0.29), farR = topAt(t, 48.37, 0.29);
    chk(pr+'/пробел: поперёк жёлоб есть, но пологий',
        (farL+farR)/2 - c > 0.5 && (farL+farR)/2 - c < KEYCAP_PROFILES[pr].dish + 0.05,
        {sag:(farL+farR)/2 - c, dish:KEYCAP_PROFILES[pr].dish});
    if(KEYCAP_PROFILES[pr].dishKind === 'sph'){
      const alpha = sag(base({keyProfile:pr, keyRow:'r3'}));
      chk(pr+': у обычной клавиши того же профиля ложбина вдоль ЕСТЬ', alpha.z > 0.1, alpha);
    }
  }
}
{
  // Every profile in every row, at the sizes people actually print. This is the combination count that
  // makes a table of eighteen hand-written row-height arrays a bad idea, and the reason there is not one.
  for(const pr of Object.keys(KEYCAP_PROFILES)) for(const r of KEYCAP_ROWS){
    const u = r === 'space' ? 6.25 : 1;
    const t = base({keyProfile:pr, keyRow:r, keySizeU:u});
    chk(pr+'/'+r+' '+u+'u: водонепроницаем', manifoldCheck(t,4).watertight && vol(t)>0,
        manifoldCheck(t,4));
  }
  // rows are the list the UI offers, not a second copy of it
  const opts = SHAPE_PARAMS.box.find(r => r.key === 'keyRow').options.map(o => o.v);
  chk('ряды панели = KEYCAP_ROWS', opts.join() === KEYCAP_ROWS.join(), opts);
  const pOpts = SHAPE_PARAMS.box.find(r => r.key === 'keyProfile').options.map(o => o.v);
  chk('профили панели = KEYCAP_PROFILES + «свой»',
      pOpts.slice(1).join() === Object.keys(KEYCAP_PROFILES).join() && pOpts[0] === 'custom', pOpts);
  chk('подписи профилей взяты из таблицы', SHAPE_PARAMS.box.find(r => r.key === 'keyProfile')
      .options.slice(1).every(o => o.t === KEYCAP_PROFILES[o.v].t));
  // an unknown profile or row must not throw — the panel can hold a stale preset from an old file
  chk('неизвестный профиль — не пресет, а «свой»', keycapRowSpec('нет такого','r3') === null);
  chk('неизвестный ряд — домашний', keycapRowSpec('cherry','нет такого').row === 'r1',
      keycapRowSpec('cherry','нет такого').row);
}
{
  // The name carries the profile and the row, because eighteen profiles times six rows is a folder you
  // otherwise have to open one file at a time.
  const nm = ov => { base(ov); return activeShapeLabel(); };
  chk('имя называет профиль и ряд', /SA R1/.test(nm({keyProfile:'sa', keyRow:'r1'})),
      nm({keyProfile:'sa', keyRow:'r1'}));
  chk('имя называет пробел', /пробел/.test(nm({keyProfile:'cherry', keyRow:'space', keySizeU:6.25})),
      nm({keyProfile:'cherry', keyRow:'space', keySizeU:6.25}));
  chk('у нескульптурного ряд в имя не идёт', !/R3/.test(nm({keyProfile:'dsa', keyRow:'r3'})),
      nm({keyProfile:'dsa', keyRow:'r3'}));
  chk('ширина в юнитах — только когда не 1u',
      /6\.25u/.test(nm({keyProfile:'dsa', keyRow:'space', keySizeU:6.25})) &&
      !/u$/.test(nm({keyProfile:'dsa', keyRow:'r3', keySizeU:1})),
      nm({keyProfile:'dsa', keyRow:'r3', keySizeU:1}));
  chk('«свой» профиль имени не портит', /кейкап/.test(nm({keyProfile:'custom'})), nm({keyProfile:'custom'}));
}

console.log('=== keycap overrides other box modes; organizer add-ons gated ===');
{ const a=base({}).length, b=base({scoopDir:'front',gripWall:'front',mountHoles:'4',stackFeet:true,divX:2,divZ:2,hollow:true}).length;
  chk('scoop/grip/ears/feet/dividers skipped on keycap', a===b, {a,b}); }
{ const t=base({platonic:'d20',polyN:6,binRound:5}); const b=computeBBox(t);
  chk('keycap wins over die/poly/bin (footprint still ≈18.2)', Math.abs((b.maxX-b.minX)-18.2)<0.2, {w:b.maxX-b.minX}); }
console.log('=== regression: keycapMode none → normal cube ===');
{ logos.length=0; Object.assign(paramState.box, defaultBoxParams(), {width:40,height:40,depth:40,keycapMode:'none'});
  const t=buildTrisForShape('box',paramState.box); const b=computeBBox(t);
  chk('cube unaffected', manifoldCheck(t,4).watertight && Math.abs((b.maxX-b.minX)-40)<1e-6, {}); }

console.log('\n=== TOTAL:',pass,'passed,',fail,'failed ===');
process.exit(fail?1:0);
