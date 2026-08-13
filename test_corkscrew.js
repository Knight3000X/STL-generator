// Штопор — and, underneath it, `sweepTube3D`: the first path in this app that leaves a plane.
//
// Every other helix here is a heightfield r(θ,y) on a cylinder. A corkscrew is the one that cannot be,
// because it is HOLLOW: a ray down its axis meets nothing at all, and a radial ray meets the wire in a
// band that starts well off the axis. Two radii per direction is exactly what r(θ,y) has no way to say.
// So the spiral is a swept bar — and `sweepTubePlanar`, the sweep that was already here, cannot carry it
// either: that one builds each ring off the fixed X axis, which is perpendicular to the path only while
// the path stays in the Y-Z plane.
//
// Both claims are tested: the new sweep on paths chosen to break the old one, and the screw itself on the
// property that makes it a corkscrew rather than an auger — that there is nothing in the middle.
// Run via ./run-all.sh.
let pass=0, fail=0;
function chk(n,c,e){if(c){pass++;console.log('  OK  ',n);}else{fail++;console.log('  FAIL',n,e!==undefined?JSON.stringify(e):'');}}
function vol(t){let v=0;for(const T of t){const a=T[0],b=T[1],c=T[2];v+=(a[0]*(b[1]*c[2]-b[2]*c[1])-a[1]*(b[0]*c[2]-b[2]*c[0])+a[2]*(b[0]*c[1]-b[1]*c[0]))/6;}return v;}
function setp(ov){ logos.length=0; boxHoles.length=0; dieFaces.length=0;
  /* Размеры у штопора СВОИ (с v18.22.1): раньше он брал Ø, шаг и длину у резьбы, а пруток выводил из
     ШАГА — и на умолчаниях резьбы получалась пружина. Здесь 4 витка по 11.25 мм дают те же 45 мм
     спирали, на которых написаны проверки ниже, и притом ПРОПОРЦИИ настоящего штопора: шаг 0.7 от Ø.
     Прежние 6 мм шага на Ø16 давали пруток толщиной в две трети шага — витки почти смыкались. */
  Object.assign(paramState.box, defaultBoxParams(), {gfBaseplate:false, threadMode:'corkscrew',
    threadCorkD:16, threadCorkPitch:11.25, threadCorkTurns:4, threadWireD:0, threadHandleW:0,
    threadJournal:0}, ov);
  return paramState.box; }
const mk = ov => buildTrisForShape('box', setp(ov));

// Solid intervals along a ray, counted by DEPTH (see test_funnel_cap.js for why parity will not do).
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
function minDepth(tris, ax, p, q){
  const u=(ax+1)%3, v=(ax+2)%3, hits=[];
  for(const T of tris){ const [a,b,c]=T;
    const d1=(b[u]-a[u])*(q-a[v])-(b[v]-a[v])*(p-a[u]);
    const d2=(c[u]-b[u])*(q-b[v])-(c[v]-b[v])*(p-b[u]);
    const d3=(a[u]-c[u])*(q-c[v])-(a[v]-c[v])*(p-c[u]);
    if(!((d1>=0&&d2>=0&&d3>=0)||(d1<=0&&d2<=0&&d3<=0))) continue;
    const A=(b[u]-a[u])*(c[v]-a[v])-(b[v]-a[v])*(c[u]-a[u]); if(Math.abs(A)<1e-12) continue;
    const e1=[b[0]-a[0],b[1]-a[1],b[2]-a[2]], e2=[c[0]-a[0],c[1]-a[1],c[2]-a[2]];
    const nrm=[e1[1]*e2[2]-e1[2]*e2[1], e1[2]*e2[0]-e1[0]*e2[2], e1[0]*e2[1]-e1[1]*e2[0]];
    if(Math.abs(nrm[ax])<1e-12) continue;
    const w1=((b[u]-p)*(c[v]-q)-(b[v]-q)*(c[u]-p))/A, w2=((c[u]-p)*(a[v]-q)-(c[v]-q)*(a[u]-p))/A;
    hits.push([w1*a[ax]+w2*b[ax]+(1-w1-w2)*c[ax], nrm[ax]<0 ? 1 : -1]);
  }
  hits.sort((A,B)=>A[0]-B[0]);
  let depth=0, lo=0;
  for(const [,d] of hits){ depth+=d; if(depth<lo) lo=depth; }
  return lo;
}

console.log('=== sweepTube3D: the paths the planar sweep cannot carry ===');
// A quarter circle in the X-Y plane. Its tangent runs from +Y round to +X, so partway along it is
// PARALLEL to the axis sweepTubePlanar builds its rings from — where that sweep's cross product vanishes
// and the section collapses to a line. A parallel-transported frame has no such orientation.
{ const path=[]; for(let i=0;i<=60;i++){ const a=Math.PI/2*i/60; path.push([20*Math.sin(a), 20*Math.cos(a), 0]); }
  const t = sweepTube3D(path, ()=>2, 16), mc = manifoldCheck(t,4);
  chk('четверть окружности, разворот касательной на 90°: замкнута', mc.watertight && vol(t)>0,
      {open:mc.openEdges, bad:mc.badEdges});
  // ...and the section stayed CIRCULAR the whole way. A sheared frame shows up here as a radius that
  // drifts: every vertex of ring i must sit exactly r from node i.
  let worst=0;
  for(let i=0;i<=60;i++){
    for(const T of t) for(const v of T){
      const d=Math.hypot(v[0]-path[i][0], v[1]-path[i][1], v[2]-path[i][2]);
      if(Math.abs(d-2) < 0.35) worst=Math.max(worst, Math.abs(d-2)); } }
  chk('и сечение осталось круглым', worst < 0.35, {worst:+worst.toFixed(4)});
}
{ // A helix: leaves the plane and keeps leaving it. This is the corkscrew's own path.
  const path=[]; for(let i=0;i<=240;i++){ const t=30*i/240, a=2*Math.PI*t/6;
    path.push([7*Math.cos(a), t, 7*Math.sin(a)]); }
  const t = sweepTube3D(path, ()=>1.2, 14), mc = manifoldCheck(t,4);
  chk('винтовая линия: замкнута', mc.watertight && vol(t)>0, {open:mc.openEdges, bad:mc.badEdges});
  // Volume of a swept tube ≈ π r² × arc length, and the helix's length is knowable in closed form.
  const L = 30*Math.hypot(1, 2*Math.PI*7/6);
  chk('и объём равен π·r²·длине дуги', Math.abs(vol(t) - Math.PI*1.44*L)/(Math.PI*1.44*L) < 0.04,
      {got:+vol(t).toFixed(0), want:+(Math.PI*1.44*L).toFixed(0)});
}
{ // A tapering bar, and a straight one — the degenerate cases either side of the interesting ones.
  const straight=[[0,0,0],[0,10,0],[0,20,0],[0,30,0]];
  chk('прямой пруток: замкнут', manifoldCheck(sweepTube3D(straight, ()=>2, 12),4).watertight, {});
  const taper = sweepTube3D(straight, i=>2-1.6*i/3, 12);
  chk('пруток с утоньшением: замкнут', manifoldCheck(taper,4).watertight && vol(taper)>0, {});
  chk('и утоньшение убавило объём', vol(taper) < vol(sweepTube3D(straight, ()=>2, 12)), {});
}

console.log('=== builds across the range ===');
for(const D of [10,16,30]) for(const P of [4,6,10]){
  const t = mk({threadCorkD:D, threadCorkPitch:P}), mc = manifoldCheck(t,4);
  chk('Ø'+D+' шаг '+P+': замкнут', mc.watertight && vol(t)>0, {open:mc.openEdges, bad:mc.badEdges});
}
for(const ov of [{threadWireD:0.8}, {threadWireD:5}, {threadCorkTurns:2}, {threadCorkTurns:12},
                 {threadHand:'left'}, {threadHandleW:70}, {threadHandleW:200},
                 {threadJournal:40}, {threadCorkPitch:2}, {threadCorkD:4}, {threadCorkD:40}]){
  const t = mk(ov), mc = manifoldCheck(t,4);
  chk('крайние параметры '+JSON.stringify(ov), mc.watertight && vol(t)>0, {open:mc.openEdges, bad:mc.badEdges});
}

console.log('=== the thing that makes it a corkscrew: there is NOTHING in the middle ===');
// The whole point, and the one property an auger does not have. Down the axis, through the spiral, the
// ray must meet no material at all — the only material on that line is the shank above the spiral.
{ const t = mk({}), B = computeBBox(t);
  const spiralTop = B.minY + 45;                       // threadLen of spiral, then the turn and the shank
  for(const [x,z] of [[0.4,0.4], [-0.6,0.3], [0,0], [1.1,-0.9]]){
    const inSpiral = solidRuns(t,1,z,x).filter(r => r[1] < spiralTop - 1);
    chk('по оси (x='+x+', z='+z+') внутри спирали пусто', inSpiral.length === 0,
        {runs:inSpiral.map(r=>[+r[0].toFixed(1),+r[1].toFixed(1)])});
  }
  // ...and above it there IS a shank, otherwise the "nothing" above would be trivially true
  chk('а выше спирали — стержень', solidRuns(t,1,0.4,0.4).some(r => r[0] > spiralTop - 1), {});
}
{ // Cut across the spiral at one height and you meet the wire ONCE, off to one side — never straddling
  // the axis. (Not twice: at a given height a single-start helix is at one angle, one point. The first
  // draft of this check asked for two walls, thinking of the section as a ring, and that is a cylinder's
  // property, not a helix's — the two sides of a corkscrew are half a pitch apart, not level.)
  const t = mk({}), B = computeBBox(t);
  let ok=0, straddles=0, seen=0;
  for(let k=0;k<24;k++){ const y = B.minY + 8 + 28*k/24;
    const runs = solidRuns(t, 0, y, 0.37);
    if(!runs.length) continue;
    seen++;
    if(runs.length === 1) ok++;
    for(const r of runs) if(r[0] < -1.5 && r[1] > 1.5) straddles++;
  }
  // Not every sampled height has material on that particular line — the wire is only near z = 0.37 twice
  // per pitch — so what is asserted is that WHEREVER it does, it is exactly one run. `seen` is checked too,
  // only to keep the claim from passing vacuously.
  chk('на каждой высоте спираль встречается лучу один раз и в стороне', seen >= 8 && ok === seen,
      {heights:seen, single:ok});
  chk('и ни на одной не перекрывает ось', straddles === 0, {straddling:straddles});
}

// The wire's diameter, read RADIALLY: in a thin height slab the wire's vertices span exactly
// [Rh−rw, Rh+rw] from the axis whatever angle the helix happens to be at, so the band's width is the wire
// diameter. A chord along X measures whatever the ray grazed instead, which is why the first draft of the
// diameter check reported 0 for a 1.2 mm wire.
function radialBand(tris, y, tol){
  let lo=1e9, hi=-1e9;
  for(const T of tris) for(const v of T) if(Math.abs(v[1]-y) < (tol||0.4)){
    const r=Math.hypot(v[0],v[2]); if(r<lo) lo=r; if(r>hi) hi=r; }
  return hi<lo ? 0 : hi-lo;
}

console.log('=== it is a spiral of the ordered size, and one turn per pitch ===');
{ const t = mk({}), B = computeBBox(t);
  chk('наружный Ø спирали — заказанный', Math.abs((B.maxX-B.minX) - 16) < 0.4, {d:+(B.maxX-B.minX).toFixed(2)});
  // A line parallel to the axis at the centreline radius meets the wire once per pitch.
  const CS = corkscrewSpec(paramState.box), rw = CS.rw, Rh = CS.Rh, ang = 0.8;
  const hits = solidRuns(t, 1, Rh*Math.sin(ang), Rh*Math.cos(ang)).map(r => (r[0]+r[1])/2);
  chk('витков — по одному на шаг', hits.length === 4 || hits.length === 5, {hits:hits.length});
  const gaps = hits.slice(1).map((v,k)=>v-hits[k]);
  chk('и они разнесены ровно на шаг', gaps.every(g=>Math.abs(g-CS.P)<0.3), gaps.map(v=>+v.toFixed(2)));
  // Consecutive turns must not touch: the wire is thinner than the pitch, and the gap is what a cork
  // actually grips. A wire as thick as the pitch would fuse the spiral into a solid cone.
  const runs = solidRuns(t, 1, Rh*Math.sin(ang), Rh*Math.cos(ang));
  const clear = runs.slice(1).map((r,k)=>r[0]-runs[k][1]);
  chk('соседние витки не слиплись', clear.every(c => c > 2), clear.map(v=>+v.toFixed(2)));
}
{ // The wire diameter is a knob, and the pitch is a separate one.
  const wires = [1.2, 2.4, 4].map(d => { const t = mk({threadWireD:d}), B = computeBBox(t);
    return radialBand(t, B.minY+22, 0.3); });
  chk('Ø прутка следует за параметром',
      Math.abs(wires[0]-1.2)<0.3 && Math.abs(wires[1]-2.4)<0.4 && Math.abs(wires[2]-4)<0.55,
      wires.map(v=>+v.toFixed(2)));
  /* Витков теперь СТОЛЬКО, СКОЛЬКО ЗАКАЗАНО, поэтому «мельче шаг — больше витков» больше не про эту
     деталь: при том же числе витков мельче шаг делает спираль КОРОЧЕ. Это и проверяется — и заодно то,
     что пруток от шага не зависит вовсе, ради чего вся правка и делалась. */
  const hs = [4,6,10].map(P => { const t = mk({threadCorkPitch:P}); return computeBBox(t); });
  chk('мельче шаг — короче спираль при том же числе витков',
      (hs[0].maxY-hs[0].minY) < (hs[1].maxY-hs[1].minY) && (hs[1].maxY-hs[1].minY) < (hs[2].maxY-hs[2].minY),
      hs.map(b=>+(b.maxY-b.minY).toFixed(1)));
  const wAt = P => { const t = mk({threadCorkPitch:P}), B = computeBBox(t); return radialBand(t, B.minY+22, 0.3); };
  chk('Ø прутка от шага НЕ зависит — он доля Ø спирали', Math.abs(wAt(6) - wAt(10)) < 0.15,
      {'шаг6':+wAt(6).toFixed(2), 'шаг10':+wAt(10).toFixed(2)});
}
{ // The point. The wire thins toward the tip, so the lowest turn is thinner than the ones above it.
  const t = mk({threadWireD:3}), B = computeBBox(t);
  const tip = radialBand(t, B.minY + 0.5, 0.3), mid = radialBand(t, B.minY + 22, 0.3);
  chk('к острию пруток утоньшается', tip > 0 && tip < mid*0.6, {tip:+tip.toFixed(2), mid:+mid.toFixed(2)});
  chk('но не сходит в ноль — нулевое кольцо это вырожденный веер', tip > 0.3, {tip:+tip.toFixed(2)});
}
{ // Handedness: the spiral climbs the other way. Measured off the seam — at θ = 0 the handed term is
  // zero and both hands read alike, the trap test_auger.js walked into.
  const R = mk({threadHand:'right'}), L = mk({threadHand:'left'});
  const CS = corkscrewSpec(paramState.box);
  const at = (t,ang) => solidRuns(t,1,CS.Rh*Math.sin(ang),CS.Rh*Math.cos(ang)).map(r=>(r[0]+r[1])/2);
  const slope = t => at(t,2.4)[2] - at(t,1.6)[2];
  chk('правый и левый закручены в разные стороны', slope(R)*slope(L) < 0,
      {right:+slope(R).toFixed(2), left:+slope(L).toFixed(2)});
  chk('и габариты у них одинаковые', Math.abs(vol(R)-vol(L)) < 1, {});
}

console.log('=== one path, one shell — and the handle crossing it ===');
{ // The spiral, the turn onto the axis and the shank are swept in a SINGLE pass, so there are no joints
  // to make watertight. Without a handle the whole screw is one connected surface.
  const plain = mk({}), withH = mk({threadHandleW:70});
  chk('без ручки штопор — одна оболочка', meshComponents(plain).length === 1, {n:meshComponents(plain).length});
  chk('с ручкой — две, и обе замкнуты', meshComponents(withH).length === 2, {n:meshComponents(withH).length});
  for(const c of meshComponents(withH))
    chk('  оболочка из '+c.length+' треугольников замкнута', manifoldCheck(c,4).watertight, {});
  const B = computeBBox(withH);
  chk('ручка — заказанной ширины', Math.abs((B.maxX-B.minX) - 70) < 0.1, {w:+(B.maxX-B.minX).toFixed(2)});
  chk('и она пересекает стержень, а не висит рядом', vol(withH) > vol(plain) + 100, {});
  // ...the two together are still one solid: a ray through the join meets ONE run, not two touching ones
  const runs = solidRuns(withH, 0, B.maxY - 3.5, 0);
  chk('стержень и ручка образуют одно тело', runs.length === 1, {runs:runs.length});
}

console.log('=== no triangle is inside-out ===');
for(const [nm,ov] of [['штопор',{}], ['левый',{threadHand:'left'}], ['с ручкой',{threadHandleW:70}],
                      ['толстый пруток',{threadWireD:4}], ['мелкий шаг',{threadCorkPitch:3}]]){
  const t = mk(ov), B = computeBBox(t);
  let worst = 0, at = null;
  for(let k=1;k<14;k++){ const y = B.minY + (B.maxY-B.minY)*(k+0.37)/14;
    for(const z of [0.31, -0.44, 0.83]){ const d = minDepth(t, 0, y, z);
      if(d < worst){ worst = d; at = [+y.toFixed(2), z]; } } }
  chk(nm+': глубина по лучу нигде не уходит в минус', worst===0, {depth:worst, at});
}

/* ЧЕМ ШТОПОР ОТЛИЧАЕТСЯ ОТ ПРУЖИНЫ — и почему этого здесь раньше не было.

   До v18.22.1 штопор брал Ø, шаг и длину у резьбы, а толщину прутка выводил из ШАГА. На умолчаниях
   резьбы (Ø30, шаг 3) выходил пруток 1.08 мм и просвет в середине 27.8 мм — 93 % наружного диаметра.
   Это пружина, и выглядела она пружиной. Ни одна проверка этого не поймала, потому что все они задавали
   свои числа руками и УМОЛЧАНИЙ НЕ ТРОГАЛИ НИ РАЗУ.

   Отличает одно число: ПРОСВЕТ К НАРУЖНОМУ Ø. У настоящего винта около 0.48 — дырка заметно уже самой
   спирали. Оно и меряется, причём по СЕТКЕ, а не по спецификации: спецификация может врать согласованно
   с собой. */
console.log('=== это штопор, а не пружина ===');
{
  const dflt = Object.assign(defaultBoxParams(), {threadMode:'corkscrew'});
  const k = corkscrewSpec(dflt);
  chk('умолчания дают пропорции настоящего штопора', Math.abs(k.boreRatio - 0.48) < 0.06,
      {'просвет/наружный':+k.boreRatio.toFixed(3)});
  chk('и шаг заметно крупнее прутка', k.pitchRatio > 2.2 && k.pitchRatio < 3.4, +k.pitchRatio.toFixed(2));
  chk('умолчания молчат — придираться не к чему',
      collectPrintWarnings(dflt).filter(w => /просвет|витки сольются|пруток/.test(w)).length === 0,
      collectPrintWarnings(dflt));
}
for(const D of [6, 8, 16, 30]){
  // Просвет меряется ПО СЕТКЕ: луч поперёк оси на середине высоты входит в материал не раньше, чем
  // кончится дырка. Пропорция не зависит от размера — обе величины доли одного Ø.
  const t = mk({threadCorkD:D, threadCorkPitch:0, threadWireD:0}), B = computeBBox(t);
  const k = corkscrewSpec(paramState.box);
  let inner = 1e9;
  for(let key=0; key<40; key++){
    const y = B.minY + 3 + (B.minY + k.len - 3 - (B.minY + 3))*key/39;
    for(const r of solidRuns(t, 0, y, 0)) inner = Math.min(inner, Math.min(Math.abs(r[0]), Math.abs(r[1])));
  }
  chk('Ø'+D+': просвет в сетке совпадает с расчётным', Math.abs(2*inner - k.bore) < 0.5,
      {'по сетке':+(2*inner).toFixed(2), 'расчёт':+k.bore.toFixed(2)});
  chk('Ø'+D+': и это доля 0.48, а не пружинные 0.9', Math.abs(k.boreRatio - 0.48) < 0.06,
      +k.boreRatio.toFixed(3));
}
{
  // Прежние числа теперь ОБЪЯВЛЯЮТСЯ пружиной, а не строятся молча.
  const spring = Object.assign(defaultBoxParams(), {threadMode:'corkscrew',
    threadCorkD:30, threadCorkPitch:3, threadWireD:1.08});
  const k = corkscrewSpec(spring);
  chk('старые числа спецификация зовёт пружиной', k.springy, +k.boreRatio.toFixed(2));
  const w = collectPrintWarnings(spring).join(' | ');
  chk('и это сказано словом «пружина» с числом', /пружина/.test(w) && /93%/.test(w), w.slice(0, 140));
  /* Слипнуться витки не могут — пруток зажат по шагу. Зато зажим срабатывает МОЛЧА, и вот об этом
     сказать обязаны: попросили 4 мм при шаге 2, получили 1.8. */
  const fat = Object.assign(defaultBoxParams(), {threadMode:'corkscrew', threadCorkPitch:2, threadWireD:4});
  const kf = corkscrewSpec(fat);
  chk('толстый пруток при мелком шаге урезан', kf.wireCut && Math.abs(2*kf.rw - 1.8) < 1e-9, +(2*kf.rw).toFixed(2));
  chk('и об этом предупреждают', /урезан/.test(collectPrintWarnings(fat).join(' | ')));
  chk('витки при этом не слипаются никогда', kf.pitchRatio > 1.1, +kf.pitchRatio.toFixed(2));
}
{
  // Резьбовые ручки штопора больше не касаются: он живёт своими.
  const a = mk({}), b = mk({threadD:60, threadPitch:0.5, threadLen:100});
  chk('Ø, шаг и длина резьбы штопора не трогают', vol(a) === vol(b),
      {'свой':+vol(a).toFixed(1), 'с чужими ручками':+vol(b).toFixed(1)});
  chk('справка на месте', !!MODEL_HELP['thread:corkscrew']);
}

console.log('\n=== TOTAL:', pass, 'passed,', fail, 'failed ===');
if(fail) process.exitCode = 1;
