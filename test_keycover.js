// Накладка на головку ключа. Держит НАТЯГ — у головки ни канавки, ни выступа, зацепиться не за что, —
// поэтому меряется именно посадка: полость обязана быть шире головки ровно на зазор, и ни на сколько
// больше. И верх обязан быть открыт: родное отверстие ключа должно остаться доступным, иначе накладку
// нельзя надеть, не сняв ключ с кольца.
// Run via ./run-all.sh.
let pass=0, fail=0;
function chk(n,c,e){if(c){pass++;console.log('  OK  ',n);}else{fail++;console.log('  FAIL',n,e!==undefined?JSON.stringify(e):'');}}
function vol(t){let v=0;for(const T of t){const a=T[0],b=T[1],c=T[2];
  v+=(a[0]*(b[1]*c[2]-b[2]*c[1])-a[1]*(b[0]*c[2]-b[2]*c[0])+a[2]*(b[0]*c[1]-b[1]*c[0]))/6;}return Math.abs(v);}
function build(ov){ logos.length=0; boxHoles.length=0; dieFaces.length=0;
  // Режим называется ЯВНО в каждой проверке: с v18.20.0 умолчание — половинки, и молчаливая опора на
  // умолчание превратила бы замеры чехла в замеры не той детали (они и превратились: «полость 16» → 4).
  Object.assign(paramState.box, defaultBoxParams(), {mntMode:'keycover'}, ov);
  return buildTrisForShape('box', paramState.box); }
const bb = t => { const b={x0:1e9,x1:-1e9,y0:1e9,y1:-1e9,z0:1e9,z1:-1e9};
  for(const T of t) for(const v of T){ if(v[0]<b.x0)b.x0=v[0]; if(v[0]>b.x1)b.x1=v[0];
    if(v[1]<b.y0)b.y0=v[1]; if(v[1]>b.y1)b.y1=v[1]; if(v[2]<b.z0)b.z0=v[2]; if(v[2]>b.z1)b.z1=v[2]; } return b; };
// Ширина материала на луче вдоль X при (y,z) — по нему видно и стенки, и полость между ними.
function runsX(tris, y, z){
  const h=[];
  for(const T of tris){ const [a,b,c]=T;
    const d1=(b[1]-a[1])*(z-a[2])-(b[2]-a[2])*(y-a[1]);
    const d2=(c[1]-b[1])*(z-b[2])-(c[2]-b[2])*(y-b[1]);
    const d3=(a[1]-c[1])*(z-c[2])-(a[2]-c[2])*(y-c[1]);
    if(!((d1>=0&&d2>=0&&d3>=0)||(d1<=0&&d2<=0&&d3<=0))) continue;
    const A=(b[1]-a[1])*(c[2]-a[2])-(b[2]-a[2])*(c[1]-a[1]); if(Math.abs(A)<1e-12) continue;
    const e1=[b[0]-a[0],b[1]-a[1],b[2]-a[2]], e2=[c[0]-a[0],c[1]-a[1],c[2]-a[2]];
    const nx=e1[1]*e2[2]-e1[2]*e2[1]; if(Math.abs(nx)<1e-12) continue;
    const w1=((b[1]-y)*(c[2]-z)-(b[2]-z)*(c[1]-y))/A, w2=((c[1]-y)*(a[2]-z)-(c[2]-z)*(a[1]-y))/A;
    h.push([w1*a[0]+w2*b[0]+(1-w1-w2)*c[0], nx<0?1:-1]); }
  h.sort((p,q)=>p[0]-q[0]);
  const out=[]; let d=0,s=null;
  for(const [x,q] of h){ const pr=d; d+=q; if(pr<=0&&d>0)s=x; else if(pr>0&&d<=0){ if(s!==null&&x-s>1e-9)out.push([s,x]); s=null; } }
  return out;
}

console.log('=== строится и герметична на всех разумных числах ===');
for(const W of [12, 23, 45]) for(const T of [1.5, 2.4, 5]) for(const cap of [false, true]){
  const t = build({mntKcMode:'sleeve', mntKcW:W, mntKcT:T, mntKcH:28, mntKcCap:cap}), mc = manifoldCheck(t, 4);
  chk('W'+W+' T'+T+(cap?' с крышкой':' без крышки')+': герметична', mc.watertight && vol(t) > 0,
      {open:mc.openEdges, bad:mc.badEdges});
}

console.log('=== посадка: полость шире головки ровно на зазор ===');
for(const W of [16, 30]) for(const T of [2, 4]) for(const clr of [0, 0.25, 0.6]){
  const t = build({mntKcMode:'sleeve', mntKcW:W, mntKcT:T, mntKcH:30, mntKcClr:clr, mntKcWall:1.6});
  const b = bb(t);
  // луч поперёк устья, у самого низа: встретит левую стенку, полость, правую стенку
  const r = runsX(t, b.y0 + 1.5, 0);
  chk('W'+W+' T'+T+' зазор '+clr+': две стенки и полость между ними', r.length === 2, r.length);
  if(r.length !== 2) continue;
  const cav = r[1][0] - r[0][1];
  chk('W'+W+' T'+T+' зазор '+clr+': полость = головка + два зазора',
      Math.abs(cav - (W + 2*clr)) < 0.02, {надо:+(W+2*clr).toFixed(2), есть:+cav.toFixed(2)});
  chk('W'+W+' T'+T+' зазор '+clr+': стенка заданная',
      Math.abs((r[0][1]-r[0][0]) - 1.6) < 0.02, +(r[0][1]-r[0][0]).toFixed(2));
  chk('W'+W+' T'+T+' зазор '+clr+': габарит = головка + зазоры + две стенки',
      Math.abs((b.x1-b.x0) - (W + 2*clr + 3.2)) < 0.02, +(b.x1-b.x0).toFixed(2));
}

console.log('=== верх открыт, если не просили крышку ===');
for(const H of [20, 40]){
  const open = build({mntKcMode:'sleeve', mntKcH:H, mntKcCap:false}),
        capd = build({mntKcMode:'sleeve', mntKcH:H, mntKcCap:true});
  const covered = t => { const b = bb(t);
    for(const T of t) if(T.every(v => Math.abs(v[1] - b.y1) < 1e-6)){
      const xs = T.map(v=>v[0]), zs = T.map(v=>v[2]);
      if(Math.min(...xs) <= 0 && Math.max(...xs) >= 0 && Math.min(...zs) <= 0 && Math.max(...zs) >= 0) return true; }
    return false; };
  chk('H'+H+': без крышки верх открыт', !covered(open));
  chk('H'+H+': с крышкой закрыт', covered(capd));
  chk('H'+H+': крышка прибавляет высоту на свою стенку',
      Math.abs(((bb(capd).y1-bb(capd).y0) - (bb(open).y1-bb(open).y0)) - 1.6) < 0.02,
      {без:+(bb(open).y1-bb(open).y0).toFixed(2), с:+(bb(capd).y1-bb(capd).y0).toFixed(2)});
  // надевается не на всю высоту: родное отверстие ключа должно остаться снаружи
  chk('H'+H+': по умолчанию надевается не на всю головку', keyCoverSpec(paramState.box).deep < H - 1,
      keyCoverSpec(paramState.box).deep);
}

console.log('=== имя и предупреждения ===');
{
  chk('размеры головки в имени', /23×25×2.4/.test(activeShapeLabel(Object.assign(paramState.box,
      defaultBoxParams(), {mntMode:'keycover'}))), activeShapeLabel());
  chk('и режим тоже', /половинками/.test(activeShapeLabel()), activeShapeLabel());
  chk('справка на месте', !!MODEL_HELP['mount:keycover']);
  const S = keyCoverSpec(Object.assign(defaultBoxParams(), {mntMode:'keycover', mntKcClr:0.9}));
  chk('слишком большой зазор виден спецификации', S.loose);
  const S2 = keyCoverSpec(Object.assign(defaultBoxParams(), {mntMode:'keycover', mntKcClr:0}));
  chk('нулевой зазор виден тоже', S2.tight);
}
/* ПОЛОВИНКИ ПОД СКЛЕЙКУ. Их две, они одинаковы, лежат плашмя и у каждой карман на ПОЛОВИНУ толщины
   головки: сойдясь на ключе, они смыкаются по его кромке. Карман нужен для совмещения при склейке, а не
   для держания — держит клей, и поэтому в посадку попадать не нужно. */
console.log('=== две половины под склейку ===');
for(const W of [16, 30]) for(const H of [20, 34]) for(const T of [1.6, 3]){
  const t = build({mntKcMode:'halves', mntKcW:W, mntKcH:H, mntKcT:T, mntKcWall:1.6});
  const mc = manifoldCheck(t, 4);
  chk('W'+W+' H'+H+' T'+T+': герметичны', mc.watertight && mc.badEdges === 0,
      {open:mc.openEdges, bad:mc.badEdges});
  /* «Две» считаются ПРОСВЕТОМ, а не оболочками: каждая половинка сложена из подложки и бортика, которые
     пересекаются, и `meshComponents` насчитает четыре куска на две детали. Луч поперёк подложек встречает
     две полосы материала с пустотой между ними — вот это и есть две половинки. */
  chk('W'+W+' H'+H+' T'+T+': их ровно две', runsX(t, bb(t).y0 + 0.5, 0).length === 2,
      runsX(t, bb(t).y0 + 0.5, 0).length);
  const b = bb(t);
  chk('W'+W+' H'+H+' T'+T+': толщина = подложка + полтолщины головки',
      Math.abs((b.y1-b.y0) - (1.6 + T/2)) < 0.02, +(b.y1-b.y0).toFixed(2));
  // карман: луч поперёк одной половинки на уровне бортика встретит бортик, карман, бортик
  const oneX = -(W + 3.2 + 4)/2;
  const r = runsX(t, b.y1 - 0.2, 0).filter(q => q[1] < 0);
  chk('W'+W+' H'+H+' T'+T+': у половинки бортик и карман', r.length === 2, r.length);
  if(r.length === 2) chk('W'+W+' H'+H+' T'+T+': карман по ширине головки',
      Math.abs((r[1][0] - r[0][1]) - (W + 0.5)) < 0.06, +(r[1][0]-r[0][1]).toFixed(2));
  void oneX;
}
{
  // Половинки печатаются ПЛАШМЯ: они шире, чем высоки, — иначе слои легли бы поперёк отрыва.
  const t = build({mntKcMode:'halves', mntKcW:23, mntKcH:25, mntKcT:2.4});
  const b = bb(t);
  chk('половинки лежат плашмя', (b.y1-b.y0) < (b.z1-b.z0)/3, {толщина:+(b.y1-b.y0).toFixed(2), высота:+(b.z1-b.z0).toFixed(2)});
  chk('и стоят рядом, а не друг на друге', (b.x1-b.x0) > (b.z1-b.z0), {ширина:+(b.x1-b.x0).toFixed(1)});
}

/* МЕБЕЛЬНЫЙ КЛЮЧ. Проверяется то, что делает его ключом: бородка есть и вылезает за стержень, прорезей
   ровно столько, сколько заказано, деталь плоская (иначе её не напечатать плашмя), и момент до слома
   считается, а не берётся с потолка. */
console.log('=== мебельный ключ ===');
function fk(ov){ logos.length=0; boxHoles.length=0; dieFaces.length=0;
  Object.assign(paramState.box, defaultBoxParams(), {mntMode:'furnkey'}, ov);
  return buildTrisForShape('box', paramState.box); }
for(const d of [3, 5, 9]) for(const n of [0, 1, 3]){
  const t = fk({mntFkShaft:d, mntFkWards:n, mntFkBitH:12, mntFkBitW:16, mntFkBowH:18}), mc = manifoldCheck(t, 4);
  chk('Ø'+d+' прорезей '+n+': герметичен', mc.watertight && vol(t) > 0, {open:mc.openEdges, bad:mc.badEdges});
  const b = bb(t);
  chk('Ø'+d+' прорезей '+n+': плоский — толщина много меньше длины', (b.y1-b.y0) < (b.x1-b.x0)/4,
      {толщина:+(b.y1-b.y0).toFixed(2), длина:+(b.x1-b.x0).toFixed(1)});
  /* Луч пускается ВЫШЕ кромки головки: бородка и головка лежат в одной плоскости, и проба на общей
     высоте считала головку лишним бруском — всегда на один больше, чем прорезей. */
  const r = runsX(t, (b.y0+b.y1)/2, b.z1 - 1);
  chk('Ø'+d+' прорезей '+n+': брусков на один больше, чем прорезей', r.length === n + 1, r.length);
}
{
  const s1 = furnKeySpec(Object.assign(defaultBoxParams(), {mntMode:'furnkey', mntFkShaft:5}));
  const s2 = furnKeySpec(Object.assign(defaultBoxParams(), {mntMode:'furnkey', mntFkShaft:10}));
  chk('момент считается и растёт как куб Ø', Math.abs(s2.torque/s1.torque - 8) < 0.05,
      {'Ø5':+s1.torque.toFixed(2), 'Ø10':+s2.torque.toFixed(2)});
  chk('тонкий стержень назван слабым', furnKeySpec(Object.assign(defaultBoxParams(),
      {mntMode:'furnkey', mntFkShaft:3})).weak);
  chk('и Ø5 уже не слабый', !s1.weak, +s1.torque.toFixed(2));
  chk('бородка вылезает за стержень', bb(fk({mntFkShaft:5, mntFkBitW:9})).z1 > 5/2 + 4);
  chk('справка на месте', !!MODEL_HELP['mount:furnkey']);
}

/* ЦИЛИНДРОВЫЙ КЛЮЧ. Проверяется то, что делает его ключом, и то, что делает его ПРАВДИВЫМ.
   Первое — бородка: нарезок ровно столько, сколько заказано, и они на своих местах. Второе — момент до
   слома: он считается для самого слабого сечения и обязан попадать в предупреждения, потому что вся
   ценность модели в этом числе.

   Отдельная забота — упрощатель контура. Кромка клинка кусочно-линейна, выборка частая, и лишние точки
   выбрасываются; если выбросить лишнюю, контур пересечёт сам себя, и сетка развалится молча. Поэтому
   упрощатель проверяется отдельно, на случае, ради которого он и переписан: длинная прямая цепочка,
   упирающаяся в угол, до которого миллиметровая доля. */
console.log('=== цилиндровый ключ ===');
function cy(ov){ logos.length=0; boxHoles.length=0; dieFaces.length=0;
  Object.assign(paramState.box, defaultBoxParams(), {mntMode:'cylkey'}, ov);
  return buildTrisForShape('box', paramState.box); }
function cyS(ov){ return cylKeySpec(Object.assign(defaultBoxParams(), {mntMode:'cylkey'}, ov)); }
/* Луч вдоль ЛЮБОЙ оси. runsX умеет только вдоль X, а канавку надо мерить поперёк клинка: переставляем
   координаты и зовём ту же математику. ax=0 — луч вдоль X в точке (y,z); ax=1 — вдоль Y в точке (z,x);
   ax=2 — вдоль Z в точке (x,y). Порядок аргументов именно такой — циклический сдвиг, не «оставшиеся». */
function runsAx(tris, ax, u, v){
  const A = ax, B = (ax+1)%3, C = (ax+2)%3;
  return runsX(tris.map(T => T.map(p => [p[A], p[B], p[C]])), u, v);
}

for(const cuts of [0, 3, 5, 7]) for(const ward of ['none', 'groove']) for(const H of [5, 8.5, 14]){
  const t = cy({mntCyCuts:cuts, mntCyWard:ward, mntCyH:H}), mc = manifoldCheck(t, 4);
  chk('нарезок '+cuts+' '+ward+' H'+H+': герметичен', mc.watertight && mc.badEdges === 0 && vol(t) > 0,
      {open:mc.openEdges, bad:mc.badEdges});
  const b = bb(t);
  chk('нарезок '+cuts+' '+ward+' H'+H+': плоский — толщина много меньше длины', (b.y1-b.y0) < (b.x1-b.x0)/6,
      {толщина:+(b.y1-b.y0).toFixed(2), длина:+(b.x1-b.x0).toFixed(1)});
}

/* Нарезки на месте. Деталь центрируется по габариту, а по высоте габарит задаёт головка, симметричная
   относительно середины клинка, — поэтому середина габарита и есть середина клинка, считать сдвиг не
   надо. Мерить нарезки ПЕРЕМЫЧКАМИ на луче вдоль клинка нельзя, и это не мелочь: у V-образной нарезки
   раствор шире всего наверху (полка + 2·глубина·tg), при шаге 3.9 и глубине 2 это 5 мм на 3.9 мм шага,
   так что соседние вырезы наверху СЛИВАЮТСЯ — у настоящего ключа тоже. Поэтому профиль кромки снимается
   лучами вдоль Z и считаются его локальные минимумы с порогом по высоте подъёма. */
function cyTop(t, zc, x){ const r = runsAx(t, 2, x, 0); return r.length ? r[r.length-1][1] - zc : -1e9; }
function cyProfile(t, s){
  const x0 = (s.kW - s.L)/2, out = [], zc = (bb(t).z0 + bb(t).z1)/2;   // x0 — упор в координатах детали
  for(let x = 0.2; x <= s.L - 0.2; x += 0.1) out.push([x, cyTop(t, zc, x0 + x) + s.H/2]);
  return out;                                                          // [x от упора, высота кромки]
}
/* Ложбины кромки с порогом по высоте подъёма. Дно нарезки — ПЛОЩАДКА, а не точка, поэтому за координату
   берётся её середина: если запомнить первую точку площадки, ответ уезжает ровно на полполки, и половина
   нарезок оказывается «не на своей координате» в одну сторону, половина — в другую. */
function cyMinima(prof, prom){
  const out = []; let dir = -1, ez = prof[0][1], ea = prof[0][0], eb = prof[0][0];
  for(const [x, z] of prof){
    const same = Math.abs(z - ez) <= 1e-6;
    if(dir < 0){
      if(z < ez - 1e-6){ ez = z; ea = eb = x; }
      else if(same){ eb = x; }
      else if(z - ez > prom){ out.push([(ea + eb)/2, ez]); dir = 1; ez = z; ea = eb = x; }
    } else {
      if(z > ez + 1e-6){ ez = z; ea = eb = x; }
      else if(same){ eb = x; }
      else if(ez - z > prom){ dir = -1; ez = z; ea = eb = x; }
    }
  }
  return out;
}
for(const cuts of [1, 3, 5, 7]){
  // Клинок берётся с запасом: последняя нарезка, упёршаяся в скос кончика, сливается с ним — и правильно
  // делает, но мерить на этом нечего.
  const room = {mntCyCuts:cuts, mntCyLen: Math.max(30, 5 + (cuts-1)*3.9 + 8)};
  const s = cyS(room), t = cy(room);
  const mins = cyMinima(cyProfile(t, s), 0.05);
  chk('нарезок '+cuts+': столько же ложбин на кромке', mins.length === cuts,
      {надо:cuts, вышло:mins.length, где:mins.map(m => +m[0].toFixed(1))});
  // каждая — на своём месте и своей глубины
  let okX = true, okD = true;
  for(let i = 0; i < Math.min(mins.length, s.cuts.length); i++){
    if(Math.abs(mins[i][0] - s.cuts[i].x) > 0.12) okX = false;
    if(Math.abs(mins[i][1] - (s.H - s.cuts[i].d)) > 0.06) okD = false;
  }
  chk('нарезок '+cuts+': каждая на своей координате', okX && mins.length === cuts,
      mins.map(m => +m[0].toFixed(2)));
  chk('нарезок '+cuts+': каждая своей глубины', okD && mins.length === cuts,
      {надо:s.cuts.map(c => +(s.H - c.d).toFixed(2)), вышло:mins.map(m => +m[1].toFixed(2))});
}
{
  // Нулевая глубина — не нарезка: кромка остаётся сплошной, ложбин нет ни одной.
  const s = cyS({mntCyCuts:3, mntCyD1:0, mntCyD2:0, mntCyD3:0});
  chk('нулевые глубины нарезками не считаются', s.cuts.length === 0 && s.noCuts);
  chk('и кромка остаётся ровной',
      cyMinima(cyProfile(cy({mntCyCuts:3, mntCyD1:0, mntCyD2:0, mntCyD3:0}), s), 0.05).length === 0);
}
for(const st of [3, 3.9, 6]){
  const s = cyS({mntCyCuts:2, mntCyStep:st, mntCyD1:2, mntCyD2:2});
  const mins = cyMinima(cyProfile(cy({mntCyCuts:2, mntCyStep:st, mntCyD1:2, mntCyD2:2}), s), 0.05);
  chk('шаг '+st+': две ложбины', mins.length === 2, mins.length);
  if(mins.length === 2) chk('шаг '+st+' виден в сетке', Math.abs((mins[1][0] - mins[0][0]) - st) < 0.12,
      +(mins[1][0] - mins[0][0]).toFixed(3));
}
for(const d of [1.5, 3, 5]){
  const s = cyS({mntCyCuts:1, mntCyD1:d, mntCyFlat:1.2}), t = cy({mntCyCuts:1, mntCyD1:d, mntCyFlat:1.2});
  const zc = (bb(t).z0 + bb(t).z1)/2, xc = s.cuts[0].x + (s.kW - s.L)/2;
  chk('глубина '+d+': дно нарезки на своём месте', Math.abs((cyTop(t, zc, xc) + s.H/2) - (s.H - d)) < 0.05,
      {надо:+(s.H-d).toFixed(2), вышло:+(cyTop(t, zc, xc) + s.H/2).toFixed(2)});
}

console.log('=== канавка под вороты ===');
for(const gd of [0.3, 0.5, 0.8]){
  const s = cyS({mntCyWard:'groove', mntCyWardD:gd, mntCyT:3, mntCyCuts:0});
  const t = cy({mntCyWard:'groove', mntCyWardD:gd, mntCyT:3, mntCyCuts:0});
  const xm = s.L*0.6 - (s.L - s.kW)/2;                       // середина клинка, подальше от головки
  const thickAt = z => { const r = runsAx(t, 1, z, xm); return r.length ? r[r.length-1][1] - r[0][0] : 0; };
  chk('глубина '+gd+': на канавке клинок тоньше ровно на две глубины',
      Math.abs(thickAt(s.gz - s.H/2) - (s.T - 2*gd)) < 0.02, +thickAt(s.gz - s.H/2).toFixed(2));
  chk('глубина '+gd+': выше канавки полная толщина',
      Math.abs(thickAt(s.gHi + 0.3 - s.H/2) - s.T) < 0.02, +thickAt(s.gHi + 0.3 - s.H/2).toFixed(2));
  chk('глубина '+gd+': ниже канавки тоже полная',
      Math.abs(thickAt(s.gLo - 0.3 - s.H/2) - s.T) < 0.02, +thickAt(s.gLo - 0.3 - s.H/2).toFixed(2));
}
{
  const s = cyS({mntCyWard:'none'});
  chk('без канавки толщина одна на всю высоту', s.tEff === s.T && s.gd === 0);
  // Канавка глубже, чем позволяет толщина, урезается: сквозной прорези быть не должно.
  const q = cyS({mntCyWard:'groove', mntCyT:1.4, mntCyWardD:2});
  chk('канавка не прорезает клинок насквозь', q.tEff >= 0.79, +q.tEff.toFixed(2));
}

console.log('=== момент до слома ===');
{
  const a = cyS({mntCyT:2.3}), b2 = cyS({mntCyT:4.6});
  chk('толще — момент больше', b2.torque > a.torque*2.5,
      {'2.3':+a.torque.toFixed(3), '4.6':+b2.torque.toFixed(3)});
  // У ТОНКОЙ полосы момент идёт как t², у толстой — медленнее: k падает вместе с ростом t/b.
  chk('у тонкой полосы вдвое толще — вчетверо',
      Math.abs(rectTorsionTorque(100,2)/rectTorsionTorque(100,1) - 4) < 0.05,
      +(rectTorsionTorque(100,2)/rectTorsionTorque(100,1)).toFixed(3));
  chk('слабое сечение слабее полного', a.torqueMin < a.torque*0.6,
      {полное:+a.torque.toFixed(3), надне:+a.torqueMin.toFixed(3)});
  chk('без нарезок слабого сечения нет', Math.abs(cyS({mntCyCuts:0}).torqueMin - cyS({mntCyCuts:0}).torque) < 1e-9);
  chk('печатный клинок назван слабым', a.weak, +a.torqueMin.toFixed(3));
  // Формула Роарка: у квадрата k = 0.208, у длинной полосы → 1/3. Иначе это не кручение, а домысел.
  chk('коэффициент квадратного сечения', Math.abs(rectTorsionTorque(10,10)/(25*10*100/1000) - 0.208) < 0.002,
      +(rectTorsionTorque(10,10)/(25*10*100/1000)).toFixed(4));
  chk('коэффициент тонкой полосы стремится к 1/3',
      Math.abs(rectTorsionTorque(100,1)/(25*100*1/1000) - 1/3) < 0.004,
      +(rectTorsionTorque(100,1)/(25*100/1000)).toFixed(4));
  const w = collectPrintWarnings(Object.assign(defaultBoxParams(), {mntMode:'cylkey'})).join(' | ');
  chk('момент попадает в предупреждения', /Н·м/.test(w) && /до слома/.test(w), w.slice(0, 160));
  chk('и сказано, что это заготовка, а не рабочий ключ', /заготовка/.test(w));
  const wf = collectPrintWarnings(Object.assign(defaultBoxParams(), {mntMode:'furnkey'})).join(' | ');
  chk('у мебельного ключа момент тоже выводится', /Н·м/.test(wf), wf.slice(0, 120));
}

console.log('=== отверстие под кольцо помещается в головку ===');
/* Дырка, вылезшая за контур, — это разрез: контур перестаёт быть простым и протяжка выдаёт вывернутую
   сетку. Ловилось только на редком сочетании «широкое кольцо, узкая головка», поэтому проверяется в лоб. */
for(const [W, Hh, ring] of [[11, 12, 14], [10, 8, 12], [22, 24, 14], [50, 50, 14], [12, 40, 13]]){
  const s = cyS({mntCyBowW:W, mntCyBowH:Hh, mntCyRing:ring});
  const t = cy({mntCyBowW:W, mntCyBowH:Hh, mntCyRing:ring}), mc = manifoldCheck(t, 4);
  chk('головка '+W+'×'+Hh+' кольцо '+ring+': герметичен', mc.watertight && mc.badEdges === 0,
      {open:mc.openEdges, bad:mc.badEdges});
  chk('головка '+W+'×'+Hh+' кольцо '+ring+': кольцо не шире головки', s.ring <= Math.min(s.kW, s.kH) - 2.39,
      {кольцо:+s.ring.toFixed(2), головка:Math.min(s.kW, s.kH)});
}
for(const [W, Hh, ring] of [[8, 10, 14], [9, 9, 12], [20, 22, 5]]){
  const g = furnKeySpec(Object.assign(defaultBoxParams(), {mntMode:'furnkey', mntFkBowW:W, mntFkBowH:Hh, mntFkRing:ring}));
  const t = fk({mntFkBowW:W, mntFkBowH:Hh, mntFkRing:ring}), mc = manifoldCheck(t, 4);
  chk('мебельный, головка '+W+'×'+Hh+' кольцо '+ring+': герметичен', mc.watertight && mc.badEdges === 0,
      {open:mc.openEdges, bad:mc.badEdges});
  chk('мебельный, головка '+W+'×'+Hh+' кольцо '+ring+': кольцо не шире головки',
      g.ring <= Math.min(W, Hh) - 2.99, +g.ring.toFixed(2));
}

console.log('=== упрощатель контура не съедает углы ===');
{
  // Квадрат, у которого нижняя сторона нарезана на сотню звеньев, а правый нижний угол отстоит от
  // последнего звена на пять микрон. Именно так и выглядит выход полосы: цепочка вплотную к углу.
  const pts = [];
  for(let i = 0; i <= 100; i++) pts.push([i*0.1, 0]);
  pts.push([10.000005, 0], [10, 6], [0, 6]);
  const s = polySimplifyXZ(pts, 1e-5);
  let ar = 0; for(let i = 0; i < s.length; i++){ const a = s[i], b2 = s[(i+1)%s.length]; ar += a[0]*b2[1] - b2[0]*a[1]; }
  chk('прямая цепочка свернулась', s.length <= 5, s.length);
  chk('но площадь сохранилась — угол на месте', Math.abs(Math.abs(ar/2) - 60) < 0.001, +(ar/2).toFixed(4));
  // Замкнутый контур: хвост, совпавший с головой, снимается, а не выбрасывается вместе с головой.
  const dup = polySimplifyXZ([[0,0],[4,0],[4,3],[0,3],[0,0]], 1e-5);
  chk('дубль головы в хвосте снят, углов осталось четыре', dup.length === 4, dup.length);
}
chk('справка на месте', !!MODEL_HELP['mount:cylkey']);

console.log('=== TOTAL: ' + pass + ' passed, ' + fail + ' failed ===');
if(fail) process.exit(1);
