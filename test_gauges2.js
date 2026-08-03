// Шаблон шага резьбы стопкой (наружная + внутренняя) и шаблон диаметров стойками.
//
// The pitch gauge used to lay its blades side by side, all facing the same way along one edge. It built,
// it was watertight, and it was unusable: a screw offered up to blade k lies across blades k−1 and k+1 as
// well, so it never seats on the one you meant. Nothing a mesh test can see — the mesh was right, the tool
// was wrong. Now the blades stack, each alone on its own level, with a clear space below it that you set to
// the diameter of the screws you measure.
//
// That makes the CLEARANCE a working dimension rather than a margin, and this file measures it as one: a
// ray sent along a blade's own line, in the gap under it, must pass through nothing. It also measures what
// the tool actually claims — the pitch. A blade whose teeth are 1.24 mm apart when it says 1.25 is a
// blade that lies, and it lies in exactly the way you cannot see: by looking right.
//
// The internal finger and the pin gauge are held to the same standard: the finger's section has to pass
// through the bore of the smallest nut it advertises, and each post has to measure its own diameter to the
// hundredth at every height, which is the whole reason it is a cylinder and not a cone. Run via ./run-all.sh.
let pass=0, fail=0;
function chk(n,c,e){if(c){pass++;console.log('  OK  ',n);}else{fail++;console.log('  FAIL',n,e!==undefined?JSON.stringify(e):'');}}
const near = (a,b,eps) => Math.abs(a-b) < (eps||1e-6);

const DEF = {}; for(const sk in SHAPE_PARAMS) for(const r of SHAPE_PARAMS[sk]) if(DEF[r.key]===undefined) DEF[r.key]=r.default;
const build = over => buildTrisForShape('box', Object.assign({}, DEF, {shape:'box'}, over));
const bbox = tris => { const lo=[1e9,1e9,1e9], hi=[-1e9,-1e9,-1e9];
  for(const T of tris) for(const v of T) for(let i=0;i<3;i++){ if(v[i]<lo[i])lo[i]=v[i]; if(v[i]>hi[i])hi[i]=v[i]; }
  return {lo, hi}; };
const wt = tris => { const m = manifoldCheck(tris, 4); return m.watertight; };

// Solid intervals along a ray, counted by DEPTH — parity cannot tell an inverted shell from a solid one.
// Axis `ax`; the ray is fixed at (p, q) on axes (ax+1)%3 and (ax+2)%3 IN THAT ORDER, which for a ray up Y
// means (z, x) and not (x, z).
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
const rayY = (tris, x, z) => solidRuns(tris, 1, z, x);     // straight up, at (x, z)
const rayX = (tris, y, z) => solidRuns(tris, 0, y, z);     // across, at (y, z)
const rayZ = (tris, x, y) => solidRuns(tris, 2, x, y);     // fore and aft, at (x, y)


console.log('=== шаблон шага: собирается и замкнут ===');
for(const kind of ['ext','int','both'])
  for(const [lo,hi] of [[0.7,2],[0.35,3.5],[1,1],[0.85,0.95]])
    for(const gap of [0, 4, 12]){
      const o = {mntMode:'pitchgauge', mntPitchKind:kind, mntPitchMin:lo, mntPitchMax:hi, mntGaugeGap:gap};
      const tris = build(o);
      chk('шаг '+kind+' '+lo+'…'+hi+' зазор '+gap+': водонепроницаем', wt(tris), manifoldCheck(tris,4));
      chk('шаг '+kind+' '+lo+'…'+hi+' зазор '+gap+': не пуст', tris.length > 100, tris.length);
    }

console.log('=== пластины сложены стопкой, а не в ряд ===');
{
  // The whole point of the change, stated as a fact about the shape: growing the gap makes the tool TALLER
  // and leaves its width alone. Side by side it was the other way round.
  const base = bbox(build({mntMode:'pitchgauge', mntGaugeGap:4}));
  const wide = bbox(build({mntMode:'pitchgauge', mntGaugeGap:16}));
  const bH = base.hi[2]-base.lo[2], wH = wide.hi[2]-wide.lo[2];
  const bW = base.hi[0]-base.lo[0], wW = wide.hi[0]-wide.lo[0];
  chk('просвет растит высоту', wH > bH + 20, {bH, wH});
  chk('просвет не растит ширину', near(bW, wW, 1e-6), {bW, wW});
  const s4 = pitchGaugeSpec(Object.assign({}, DEF, {mntGaugeGap:4}));
  const s16 = pitchGaugeSpec(Object.assign({}, DEF, {mntGaugeGap:16}));
  chk('высота растёт ровно на n·Δ', near(s16.H - s4.H, (s16.n+1)*12, 1e-9), {a:s4.H, b:s16.H, n:s4.n});
  // more pitches → more levels, one each
  for(const [lo,hi] of [[0.7,2],[0.35,3.5],[1.5,3.5]]){
    const s = pitchGaugeSpec(Object.assign({}, DEF, {mntPitchMin:lo, mntPitchMax:hi}));
    const zs = []; for(let k=0;k<s.n;k++) zs.push(s.zAt(k));
    chk(lo+'…'+hi+': уровни идут по возрастанию', zs.every((z,i)=>i===0||z>zs[i-1]), zs);
    chk(lo+'…'+hi+': шаг уровней равен rowH',
        zs.every((z,i)=>i===0||near(z-zs[i-1], s.rowH, 1e-9)), zs);
  }
}

console.log('=== под пластиной действительно пусто ===');
// The clearance is the feature. A ray straight along the blade's line, in the space under it, must hit
// nothing — that is what "the screw lies on one blade only" means, expressed as a measurement.
{
  for(const gap of [4, 8, 16]){
    const p = Object.assign({}, DEF, {mntMode:'pitchgauge', mntGaugeGap:gap});
    const s = pitchGaugeSpec(p), tris = build({mntMode:'pitchgauge', mntGaugeGap:gap});
    for(let k=0;k<s.n;k++){
      // the middle of the clear space under level k's blade, out where the teeth are
      const z = s.zAt(k) - gap/2, x = s.hs/2 + s.bw*0.6;
      const runs = rayY(tris, x, z);
      chk('зазор '+gap+' уровень '+k+': под пластиной пусто', runs.length === 0, runs);
    }
    // ...and the blade itself IS there, just above that line
    for(let k=0;k<s.n;k++){
      const z = s.zAt(k) + s.bl*0.7, x = s.hs/2 + s.bw*0.6;
      const runs = rayY(tris, x, z);
      chk('зазор '+gap+' уровень '+k+': сама пластина на месте', runs.length === 1, runs);
    }
  }
}

console.log('=== шаг зубьев — тот, что написан ===');
// Read the tooth line off the mesh: down the blade's own X line, the tips are the extreme −Z points. The
// distance from one tip to the next has to be the pitch on the label, to a hundredth.
{
  // Flat-edged on purpose: the pitch is a fact about the tooth line along X, and the arc across Y moves
  // every vertex off the level's own plane, which is what this probe reads. The arc has its own section.
  const o = {mntPitchMin:0.5, mntPitchMax:2.5, mntPitchR:0, mntPitchLean:0};
  const p = Object.assign({}, DEF, {mntMode:'pitchgauge'}, o);
  const s = pitchGaugeSpec(p), tris = build(Object.assign({mntMode:'pitchgauge'}, o));
  for(let k=0;k<s.n;k++){
    const P = s.list[k], zb = s.zAt(k);
    // every vertex of this level's blade that sits on the tooth-tip line
    const tips = [];
    for(const T of tris) for(const v of T)
      if(Math.abs(v[2] - zb) < 1e-6 && v[0] > s.hs/2 && Math.abs(v[1]) > s.t/2 - 1e-6) tips.push(v[0]);
    const xs = [...new Set(tips.map(x => +x.toFixed(4)))].sort((a,b)=>a-b);
    chk('шаг '+P+': зубья найдены', xs.length >= 6, xs.length);
    if(xs.length < 6) continue;
    // tips come in pairs (the P/4 flat), so the run repeats every second pair — measure flat-start to
    // flat-start and demand it be the pitch
    const starts = xs.filter((x,i) => i%2 === 0);
    let okAll = true, worst = 0;
    for(let i=1;i<starts.length-1;i++){ const d = starts[i]-starts[i-1];
      worst = Math.max(worst, Math.abs(d-P)); if(Math.abs(d-P) > 0.005) okAll = false; }
    chk('шаг '+P+': расстояние между зубьями = ' + P, okAll, worst);
    chk('шаг '+P+': глубина зуба 0.5413·P', near(s.td(P), 0.5413*P, 1e-9), s.td(P));
  }
}

console.log('=== внутренний палец: с другой стороны хребта и лезет в гайку ===');
{
  const sExt = pitchGaugeSpec(Object.assign({}, DEF, {mntPitchKind:'ext'}));
  const sInt = pitchGaugeSpec(Object.assign({}, DEF, {mntPitchKind:'int'}));
  const sBoth= pitchGaugeSpec(Object.assign({}, DEF, {mntPitchKind:'both'}));
  chk('«ext» — только наружные', sExt.ext && !sExt.int);
  chk('«int» — только внутренние', !sInt.ext && sInt.int);
  chk('«both» — и те и другие', sBoth.ext && sBoth.int);
  const bE = bbox(build({mntMode:'pitchgauge', mntPitchKind:'ext'}));
  const bI = bbox(build({mntMode:'pitchgauge', mntPitchKind:'int'}));
  const bB = bbox(build({mntMode:'pitchgauge', mntPitchKind:'both'}));
  chk('наружные растут вправо от хребта', bE.hi[0] > sExt.hs/2 + 1 && bE.lo[0] > -sExt.hs, [bE.lo[0], bE.hi[0]]);
  chk('внутренние растут влево от хребта', bI.lo[0] < -sInt.hs/2 - 1 && bI.hi[0] <= sInt.hs/2 + 1e-6, [bI.lo[0], bI.hi[0]]);
  chk('вместе — по обе стороны', bB.lo[0] < -sBoth.hs/2 - 1 && bB.hi[0] > sBoth.hs/2 + 1, [bB.lo[0], bB.hi[0]]);
  chk('«обе» шире каждой по отдельности',
      (bB.hi[0]-bB.lo[0]) > (bE.hi[0]-bE.lo[0]) && (bB.hi[0]-bB.lo[0]) > (bI.hi[0]-bI.lo[0]));
  // A finger measures a nut from the inside, so its section has to go through the bore. Declared, and
  // warned about when the plate is too thick for the smallest pitch on the tool.
  for(const t of [1.2, 2, 4, 8]){
    const s = pitchGaugeSpec(Object.assign({}, DEF, {mntPitchKind:'int', mntT:t}));
    chk('t='+t+': сечение пальца объявлено честно', near(s.bore, Math.hypot(s.t, s.fl) + 0.4, 1e-9), s.bore);
    chk('t='+t+': толще плита — толще палец', s.bore > Math.hypot(1.2, s.fl), s.bore);
  }
  const thick = collectPrintWarnings(Object.assign({}, DEF, {shape:'box', mntMode:'pitchgauge', mntPitchKind:'int', mntT:8}));
  chk('слишком толстая плита — предупреждение есть', thick.some(w => w.indexOf('палец') >= 0), thick);
  const tight = collectPrintWarnings(Object.assign({}, DEF, {shape:'box', mntMode:'pitchgauge', mntGaugeGap:2}));
  chk('тесный просвет — предупреждение есть', tight.some(w => w.indexOf('просвет') >= 0), tight);
  const roomy = collectPrintWarnings(Object.assign({}, DEF, {shape:'box', mntMode:'pitchgauge', mntGaugeGap:10}));
  chk('нормальный просвет — молчит', !roomy.some(w => w.indexOf('просвет') >= 0), roomy);
}

console.log('=== шаблон диаметров: стойки и есть размер ===');
for(const o of [{}, {mntPinN:2}, {mntPinN:20}, {mntPinStart:0.8, mntPinStep:0.1},
                {mntPinStart:20, mntPinStep:5}, {mntGaugeGap:0}, {mntGaugeGap:20}, {mntPinH:60}]){
  const over = Object.assign({mntMode:'pingauge'}, o);
  const tris = build(over);
  chk('стойки '+JSON.stringify(o)+': водонепроницаемы', wt(tris), manifoldCheck(tris,4));
}
{
  const p = Object.assign({}, DEF, {mntMode:'pingauge'});
  const s = pinGaugeSpec(p), tris = build({mntMode:'pingauge'});
  chk('диаметры идут по возрастанию', s.ds.every((d,i)=>i===0||d>s.ds[i-1]), s.ds);
  chk('шаг диаметров тот, что задан', s.ds.every((d,i)=>i===0||near(d-s.ds[i-1], s.dd, 1e-9)), s.ds);
  const b = bbox(tris), base = b.lo[1];
  // Measure each post across its own middle: a chord through the axis has to be the declared diameter, at
  // every height. This is what a cylinder buys and a cone does not — a cone measures the depth you pushed to.
  for(let k=0;k<s.n;k++){
    // OFF the axis by a known fraction of the radius. A ray straight down the axis of an even-sided prism
    // runs along the edge between two facets and is counted by both or by neither — the same degeneracy
    // that made a box's face centre unreadable. A chord at offset e is 2·√(r²−e²), which is just as much a
    // statement about the diameter and has no vertex to trip over.
    const r = s.ds[k]/2, e = r*0.37, chord = 2*Math.sqrt(r*r - e*e);
    for(const f of [0.2, 0.5, 0.9]){
      const y = base + s.t + s.H*f;
      const runs = rayX(tris, y, s.zPin + e);   // across the post row at this height
      const hit = runs.filter(rn => rn[0] < s.xAt(k) + r && rn[1] > s.xAt(k) - r);
      chk('стойка '+k+' на высоте '+f+': ровно одно тело', hit.length === 1, runs);
      if(hit.length !== 1) continue;
      // the facet count is finite, so the printed chord is a hair under the true one — never over
      const got = hit[0][1]-hit[0][0];
      chk('стойка '+k+' на высоте '+f+': Ø = ' + fmtNum(s.ds[k]) + ' (хорда ' + chord.toFixed(2) + ')',
          got <= chord + 1e-6 && got > chord - Math.max(0.03, chord*0.01), {got, chord});
    }
  }
  // ...and there is clear space between neighbours, which is what the spacing parameter is for
  for(const gap of [2, 6, 14]){
    const sg = pinGaugeSpec(Object.assign({}, DEF, {mntGaugeGap:gap}));
    const tg = build({mntMode:'pingauge', mntGaugeGap:gap});
    const bg = bbox(tg);
    for(let k=1;k<sg.n;k++){
      const xMid = (sg.xAt(k-1) + sg.xAt(k))/2, y = bg.lo[1] + sg.t + sg.H*0.5;
      const runs = rayZ(tg, xMid, y);       // fore and aft between two posts, above the plate
      chk('зазор '+gap+': между стойками '+(k-1)+' и '+k+' пусто', runs.length === 0, runs);
    }
    chk('зазор '+gap+': шаг не меньше Ø + зазора', sg.pitch >= sg.dMax + gap - 1e-9, sg.pitch);
  }
  const thin = collectPrintWarnings(Object.assign({}, DEF, {shape:'box', mntMode:'pingauge', mntPinStart:0.9}));
  chk('тонкая первая стойка — предупреждение есть', thin.some(w => w.indexOf('тоньше') >= 0), thin);
  const tall = collectPrintWarnings(Object.assign({}, DEF, {shape:'box', mntMode:'pingauge', mntPinStart:2, mntPinH:40}));
  chk('высокая тонкая стойка — предупреждение есть', tall.some(w => w.indexOf('отломится') >= 0), tall);
}

console.log('=== просвет — один параметр на три шаблона ===');
{
  for(const v of [0, 3, 25, 40, 100, -5, null]){
    const g = gaugeGap({mntGaugeGap: v});
    chk('просвет '+v+' → '+g+' в пределах', g >= 0 && g <= 40, g);
  }
  chk('без параметра — умолчание', gaugeGap({}) === 4, gaugeGap({}));
  // all three read it, and all three answer to it
  const grows = (mode, key) => {
    const a = bbox(build(Object.assign({mntMode:mode}, {mntGaugeGap:1})));
    const b = bbox(build(Object.assign({mntMode:mode}, {mntGaugeGap:15})));
    return (b.hi[key]-b.lo[key]) > (a.hi[key]-a.lo[key]) + 10;
  };
  chk('шаблон радиусов слушает просвет', grows('radgauge', 0));
  chk('шаблон шага слушает просвет', grows('pitchgauge', 2));
  chk('шаблон диаметров слушает просвет', grows('pingauge', 0));
}


console.log('=== кромка выгнута поперёк плиты ===');
// The arc is across the THICKNESS, not along the length: a flat edge laid on a round thread touches it on
// one line and rocks off it. Measured by sending a ray down the tooth line at three points across the
// plate — the shoulders must reach further than the middle, by the sagitta and by nothing else.
{
  for(const R of [0, 3, 6, 20]){
    const p = Object.assign({}, DEF, {mntMode:'pitchgauge', mntPitchR:R, mntPitchLean:0});
    const s = pitchGaugeSpec(p), tris = build({mntMode:'pitchgauge', mntPitchR:R, mntPitchLean:0});
    chk('R='+R+': водонепроницаем', wt(tris), manifoldCheck(tris,4));
    chk('R='+R+': радиус не меньше полутолщины', s.R === 0 || s.R >= s.t/2, {R:s.R, t:s.t});
    chk('R='+R+': прогиб согласован с радиусом',
        near(s.sag, s.R > 0 ? s.R - Math.sqrt(s.R*s.R - s.t*s.t/4) : 0, 1e-9), s.sag);
    // the lowest point of the blade, at the middle of the plate and at its shoulder
    const k = 0, x = s.hs/2 + s.bw*0.6;
    const zAtY = y => { let lo = 1e9;
      for(const T of tris) for(const v of T)
        if(Math.abs(v[1]-y) < 1e-6 && v[0] > s.hs/2 && v[2] > s.zAt(k)-3 && v[2] < s.zAt(k)+s.bl) lo = Math.min(lo, v[2]);
      return lo; };
    // A flat blade is extruded in ONE step, so it has no station at y = 0 to probe — its two faces are the
    // whole story, and they must be level with each other.
    if(R === 0){
      chk('плоская кромка — обе грани вровень', near(zAtY(-s.t/2), zAtY(s.t/2), 1e-9),
          {a:zAtY(-s.t/2), b:zAtY(s.t/2)});
    } else {
      const mid = zAtY(0), edge = zAtY(-s.t/2);
      chk('R='+R+': плечо тянется дальше середины', edge < mid - 1e-9, {mid, edge});
      chk('R='+R+': ровно на прогиб', near(mid - edge, s.sag, 1e-6), {got:mid-edge, sag:s.sag});
    }
  }
  // Bigger radius, shallower arc — the flat plate is the limit, and the tool says so rather than being
  // silently clamped: a radius under the half-thickness is not an arc, it is a cusp.
  const sags = [2, 3, 6, 12, 40].map(R => pitchGaugeSpec(Object.assign({}, DEF, {mntPitchR:R})).sag);
  chk('чем больше радиус, тем меньше прогиб', sags.every((v,i)=>i===0||v<sags[i-1]), sags);
  const tiny = pitchGaugeSpec(Object.assign({}, DEF, {mntPitchR:0.5, mntT:4}));
  chk('слишком малый радиус поднят до полутолщины', tiny.R >= tiny.t/2, {R:tiny.R, t:tiny.t});
  const wTiny = collectPrintWarnings(Object.assign({}, DEF, {shape:'box', mntMode:'pitchgauge', mntPitchR:0.5}));
  chk('и об этом сказано', wTiny.some(w => w.indexOf('радиус кромки') >= 0), wTiny);
  const wDeep = collectPrintWarnings(Object.assign({}, DEF, {shape:'box', mntMode:'pitchgauge',
    mntPitchR:2.2, mntPitchMin:0.35, mntPitchMax:0.5}));
  chk('прогиб глубже мелкого зуба — предупреждение', wDeep.some(w => w.indexOf('прогиб') >= 0), wDeep);
}

console.log('=== выпуклая на гайку, вогнутая на болт ===');
// Same offset serves both, which reads wrong until you notice the teeth point opposite ways: the blade's
// shoulders reach DOWN past its middle so the screw nestles between them, and the finger's middle stands UP
// past its shoulders so it beds against the bore. Both are the tool reaching towards what it measures.
{
  const R = 6;
  const se = pitchGaugeSpec(Object.assign({}, DEF, {mntPitchKind:'ext', mntPitchR:R}));
  const te = build({mntMode:'pitchgauge', mntPitchKind:'ext', mntPitchR:R});
  const si = pitchGaugeSpec(Object.assign({}, DEF, {mntPitchKind:'int', mntPitchR:R}));
  const ti = build({mntMode:'pitchgauge', mntPitchKind:'int', mntPitchR:R});
  const extreme = (tris, s, side, pick) => { let best = pick > 0 ? -1e9 : 1e9;
    for(const T of tris) for(const v of T){
      if(Math.abs(v[1]-side) > 1e-6) continue;
      if(pick > 0 ? v[0] < -s.hs/2 : v[0] > s.hs/2) continue;   // the finger side / the blade side
      if(v[2] < s.zAt(0)-3 || v[2] > s.zAt(0)+Math.max(s.bl,s.fl)) continue;
      best = pick > 0 ? Math.max(best, v[2]) : Math.min(best, v[2]); }
    return best; };
  const eMid = extreme(te, se, 0, -1), eEdge = extreme(te, se, -se.t/2, -1);
  chk('болт: зубья наружной гребёнки смотрят вниз, плечи ниже середины', eEdge < eMid - 1e-9, {eMid, eEdge});
  const iMid = extreme(ti, si, 0, +1), iEdge = extreme(ti, si, -si.t/2, +1);
  chk('гайка: зубья пальца смотрят вверх, середина выше плеч', iMid > iEdge + 1e-9, {iMid, iEdge});
  chk('оба выгнуты на один и тот же прогиб',
      near(eMid - eEdge, se.sag, 1e-6) && near(iMid - iEdge, si.sag, 1e-6),
      {ext:eMid-eEdge, int:iMid-iEdge, sag:se.sag});
}

console.log('=== зубцы наклонены под руку резьбы, знаком угла ===');
// A thread's crest is a spiral, so it meets a square-cut tooth at an angle. The lean is a shear across the
// thickness: the same tooth line, slid along X as you cross the plate. The SIGN is the hand — plus leans
// the way a right-hand thread climbs, minus the way a left-hand one does — so a left-hand gauge is the
// same control at a negative angle rather than a second switch that means nothing at zero.
{
  const toothX = (tris, s, side) => { // x of the leftmost tooth tip of level 0 on the given face
    let best = 1e9;
    for(const T of tris) for(const v of T)
      // NOT filtered on x: a lean slides the run past the spine's own edge, and a filter there silently
      // drops the leftmost tooth on one face and reads the second one instead — which looks like a shear
      // of the wrong size rather than like a broken probe.
      if(Math.abs(v[1]-side) < 1e-6 && v[0] > 0 && Math.abs(v[2] - (s.zAt(0) + s.arcAt(side))) < 1e-6)
        best = Math.min(best, v[0]);
    return best; };
  for(const lean of [-3, -1.5, -0.4, 0, 0.4, 1.5, 3]){
    const o = {mntMode:'pitchgauge', mntPitchLean:lean};
    const s = pitchGaugeSpec(Object.assign({}, DEF, o)), tris = build(o);
    chk('наклон '+lean+'°: водонепроницаем', wt(tris), manifoldCheck(tris,4));
    const front = toothX(tris, s, s.t/2), back = toothX(tris, s, -s.t/2);
    const want = s.t * Math.tan(lean*Math.PI/180);
    chk('наклон '+lean+'°: сдвиг между гранями = t·tg λ', near(front - back, want, 1e-6),
        {got:front-back, want});
    chk('наклон '+lean+'°: знак сдвига — знак угла',
        lean === 0 ? near(front-back, 0, 1e-9) : Math.sign(front-back) === Math.sign(lean),
        {lean, shift:front-back});
  }
  // ...and the two hands are mirror images, not the same tool twice
  const r = pitchGaugeSpec(Object.assign({}, DEF, {mntPitchLean:2.4}));
  const l = pitchGaugeSpec(Object.assign({}, DEF, {mntPitchLean:-2.4}));
  chk('плюс и минус — зеркальны', r.hand === 1 && l.hand === -1, {r:r.hand, l:l.hand});
  for(const y of [-2, -0.5, 0, 1.3, 2])
    chk('сдвиг при y='+y+' противоположен по знаку', near(r.skewAt(y), -l.skewAt(y), 1e-12),
        {r:r.skewAt(y), l:l.skewAt(y)});
  chk('без наклона сдвига нет', pitchGaugeSpec(Object.assign({}, DEF, {mntPitchLean:0})).skewAt(2) === 0);
  // The range is deliberate: ±3° covers the lead angle of ordinary metric fasteners, and past that the
  // tooth line shears further across the plate than the tooth is deep.
  const row = SHAPE_PARAMS.box.find(r => r.key === 'mntPitchLean');
  chk('разлёт объявлен ±3°', row.min === -3 && row.max === 3, {min:row.min, max:row.max});
  chk('по умолчанию без наклона', row.default === 0, row.default);
  chk('шаг регулятора мельче градуса', row.step <= 0.5, row.step);
  for(const v of [-90, -3.5, 3.5, 90]){
    const s = pitchGaugeSpec(Object.assign({}, DEF, {mntPitchLean:v}));
    chk('наклон '+v+'° урезан до разлёта', Math.abs(s.lean) <= 3 + 1e-12 && Math.sign(s.lean) === Math.sign(v), s.lean);
  }
  chk('прежнего переключателя направления больше нет',
      !SHAPE_PARAMS.box.some(r => r.key === 'mntPitchHand'));
  // the model's own name says which way it leans, so the file is telling them apart before it is opened
  const nm = v => activeShapeLabel(Object.assign(paramState.box, DEF,
    {shape:'box', mntMode:'pitchgauge', mntPitchLean:v}));
  chk('левая названа левой', /левой 2\.0°/.test(nm(-2)), nm(-2));
  chk('правая названа правой', /правой 2\.0°/.test(nm(2)), nm(2));
  chk('без наклона в имени ничего лишнего', !/левой|правой/.test(nm(0)), nm(0));
  // The blade's root has to stay buried in the spine however far the lean slides it, either way.
  for(const lean of [-3, -1, 0, 1, 3]){
    const s = pitchGaugeSpec(Object.assign({}, DEF, {mntPitchLean:lean}));
    chk('наклон '+lean+'°: корень лепестка не выходит из хребта',
        s.bite >= Math.abs(s.skewAt(s.t/2)) + 1 - 1e-9, {bite:s.bite, slide:s.skewAt(s.t/2)});
    chk('наклон '+lean+'°: корень не шире хребта', 2*s.bite <= s.hs, {bite:s.bite, hs:s.hs});
  }
}

console.log('=== выгиб и наклон вместе, и плоский случай прежний ===');
{
  // With neither, the swept extrusion must produce exactly what the straight one did — same triangles.
  const flat = build({mntMode:'pitchgauge', mntPitchR:0, mntPitchLean:0});
  const s = pitchGaugeSpec(Object.assign({}, DEF, {mntPitchR:0, mntPitchLean:0}));
  chk('без выгиба и наклона проход один', s.steps === 1 && !s.sweep, {steps:s.steps, sweep:s.sweep});
  chk('плоский случай замкнут', wt(flat), manifoldCheck(flat,4));
  for(const kind of ['ext','int','both']) for(const R of [0, 5]) for(const lean of [-3, 0, 1.7, 3]){
      const tris = build({mntMode:'pitchgauge', mntPitchKind:kind, mntPitchR:R,
                          mntPitchLean:lean, mntPitchMin:0.5, mntPitchMax:2.5});
      chk(kind+' R='+R+' λ='+lean+': замкнут', wt(tris), manifoldCheck(tris,4));
    }
}

console.log('=== TOTAL: ' + pass + ' passed, ' + fail + ' failed ===');
if(fail) process.exit(1);
