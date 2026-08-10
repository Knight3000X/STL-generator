// Шаблон резьб многогранником: низкая призма, одна грань — один стандартный размер.
//
// The comb this joins is a stack of blades, and the stack is what is wrong with it: you hunt along it, the
// blade you want has neighbours in the way, and each blade is a 1 mm plate hanging off a spine. Rolled into
// a prism, the face you are using is the only thing in front of you and the tool is a solid block.
//
// None of that is what a mesh test can see, so this file measures what the tool CLAIMS instead. A face that
// says 0.8 has to carry teeth 0.8 mm apart and 0.4330 mm deep, measured off the built triangles and not off
// the spec that made them; the label over it has to be the label of THAT face and no other, checked by its
// own ink width against the width its text should have; and the lean has to lean the way the flat comb's
// does, measured on both artefacts and compared, because the one thing worse than no lean is a tool that
// leans the wrong way and looks right.
//
// It also pins two things the toothed outline dragged out of the shared extruder. A profile made of
// collinear runs ends the ear clipper on three of them often, and dropping that remainder as degenerate put
// a triangular hole in BOTH caps; and a flat corner has no normal to orient by, so deciding each cap from
// its own gave two caps that were not mirrors of each other — a directed edge running the wrong way on a
// mesh that pairs every undirected one. Run via ./run-all.sh.
let pass=0, fail=0;
function chk(n,c,e){if(c){pass++;console.log('  OK  ',n);}else{fail++;console.log('  FAIL',n,e!==undefined?JSON.stringify(e):'');}}
const near = (a,b,eps) => Math.abs(a-b) < (eps||1e-6);

const DEF = {}; for(const sk in SHAPE_PARAMS) for(const r of SHAPE_PARAMS[sk]) if(DEF[r.key]===undefined) DEF[r.key]=r.default;
const par = over => Object.assign({}, DEF, {shape:'box', mntMode:'polygauge'}, over);
const build = over => buildTrisForShape('box', par(over));
const wt = tris => manifoldCheck(tris, 4).watertight;
// The summary reads the LIVE state rather than a parameter, so it is asked through the state.
function setp(ov){ logos.length=0; boxHoles.length=0; dieFaces.length=0;
  Object.assign(paramState.box, defaultBoxParams(), {gfBaseplate:false, mntMode:'polygauge'}, ov);
  return paramState.box; }

// Undirected pairing cannot see a face that is on the right edges and facing the wrong way. In a closed
// mesh with consistent winding each DIRECTED edge occurs exactly once; anything else is a flipped or a
// duplicated triangle.
function flippedEdges(tris, dec){
  const d = dec == null ? 4 : dec, seen = new Map();
  const key = v => v.map(x => (+x).toFixed(d)).join(',');
  for(const T of tris) for(let i=0;i<3;i++){
    const k = key(T[i]) + '>' + key(T[(i+1)%3]);
    seen.set(k, (seen.get(k)||0) + 1); }
  let bad = 0; for(const v of seen.values()) if(v !== 1) bad += v;
  return bad;
}
const bbox = tris => { const lo=[1e9,1e9,1e9], hi=[-1e9,-1e9,-1e9];
  for(const T of tris) for(const v of T) for(let i=0;i<3;i++){ if(v[i]<lo[i])lo[i]=v[i]; if(v[i]>hi[i])hi[i]=v[i]; }
  return {lo, hi}; };

// Solid intervals along a ray, counted by DEPTH — parity cannot tell an inverted shell from a solid one.
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

// Every vertex of the body at one height, put into face k's own frame: u along the face from its middle, h
// out of the face plane. The station's twist is undone first, so a leaning tool reads the same as a
// straight one — which is the point: the teeth are the same teeth, they are only turned.
function faceLocal(tris, s, k, yWant){
  const th = 2*Math.PI*k/s.n, nx = Math.cos(th), nz = Math.sin(th), tx = -Math.sin(th), tz = Math.cos(th);
  const out = [], seen = new Set();
  for(const T of tris) for(const v of T){
    if(!near(v[1], yWant, 1e-6)) continue;
    const a = s.angAt(v[1]), ca = Math.cos(a), sa = Math.sin(a);
    const x = v[0]*ca + v[2]*sa, z = -v[0]*sa + v[2]*ca;   // back to the untwisted section
    const u = x*tx + z*tz, h = x*nx + z*nz - s.a;
    if(Math.abs(u) > s.S/2 + 1e-6) continue;               // belongs to a neighbour
    const key = u.toFixed(6) + ',' + h.toFixed(6);
    if(seen.has(key)) continue; seen.add(key);
    out.push([u, h]);
  }
  return out.sort((A,B) => A[0]-B[0]);
}

console.log('=== собирается, замкнут и ориентирован — по всему полю настроек ===');
{
  let n = 0, open = 0, flip = 0;
  for(const std of ['metric','imperial'])
    for(const [lo,hi] of [[0.7,2],[0.3,3.5],[1,1],[0.85,0.95],[0.35,0.6],[2,3.5]])
      for(const lean of [0, 3, -3, 1.4])
        for(const bore of [0, 3, 8, 40])
          for(const H of [5, 12, 60]){
            const t = build({mntPolyStd:std, mntPitchMin:lo, mntPitchMax:hi,
                             mntPitchLean:lean, mntPolyBore:bore, mntPolyH:H});
            n++; if(!wt(t)) open++; if(flippedEdges(t)) flip++;
          }
  chk('576 сочетаний собраны', n === 576, n);
  chk('все замкнуты', open === 0, open);
  chk('ни одной перевёрнутой грани', flip === 0, flip);
}

console.log('=== грани — это размеры стандарта, а не что попало ===');
{
  const m = polyGaugeSpec(par({}));
  chk('метрическая: 8 граней в 0.7…2', m.n === 8, m.list.map(v=>v.tag));
  chk('метрическая: каждая грань — стандартный шаг ISO',
      m.list.every(v => ISO_PITCHES.indexOf(v.P) >= 0), m.list.map(v=>v.P));
  chk('метрическая: подпись — сам шаг', m.list.every(v => v.tag === fmtNum(v.P)), m.list.map(v=>v.tag));
  chk('метрическая: шаги по возрастанию', m.list.every((v,i) => !i || v.P > m.list[i-1].P), true);
  const im = polyGaugeSpec(par({mntPolyStd:'imperial'}));
  chk('дюймовая: другой набор граней', im.n === 9 && im.imp, {n:im.n, imp:im.imp});
  chk('дюймовая: подпись — витки на дюйм, шаг из неё и следует',
      im.list.every(v => UNC_TPI.indexOf(+v.tag) >= 0 && near(v.P, 25.4/(+v.tag), 1e-9)), im.list.map(v=>v.tag));
  chk('дюймовая: подписи по убыванию витков', im.list.every((v,i) => !i || +v.tag < +im.list[i-1].tag), true);
  // Both are filtered by the SAME window, in millimetres, because a comb measures a pitch and nothing else.
  chk('оба ряда попадают в заданное окно',
      m.list.every(v => v.P >= 0.7-1e-9 && v.P <= 2+1e-9) &&
      im.list.every(v => v.P >= 0.7-1e-9 && v.P <= 2+1e-9), true);
  const narrow = polyGaugeSpec(par({mntPitchMin:0.35, mntPitchMax:0.6}));
  chk('узкое окно — только его размеры', narrow.list.every(v => v.P >= 0.35-1e-9 && v.P <= 0.6+1e-9),
      narrow.list.map(v=>v.tag));
  chk('узкое окно не подсказывает лишнего', !narrow.padded && narrow.n === 5, {n:narrow.n, padded:narrow.padded});
}

console.log('=== призме нужны три грани: окно, в котором их меньше ===');
{
  const none = polyGaugeSpec(par({mntPitchMin:0.85, mntPitchMax:0.95}));
  chk('в 0.85…0.95 стандартных шагов нет', none.empty, none.list.map(v=>v.tag));
  chk('и всё равно три грани', none.n === 3 && none.padded, {n:none.n, padded:none.padded});
  chk('добавлены ближайшие к окну', none.list.map(v=>v.tag).join('/') === '0.75/0.8/1', none.list.map(v=>v.tag));
  const one = polyGaugeSpec(par({mntPitchMin:1, mntPitchMax:1}));
  chk('ровно один шаг в окне — тоже дополнено до трёх', one.n === 3 && one.padded && !one.empty,
      {n:one.n, padded:one.padded, empty:one.empty});
  chk('и сам заказанный никуда не делся', one.list.some(v => v.P === 1), one.list.map(v=>v.tag));
  chk('трёхгранник замкнут', wt(build({mntPitchMin:0.85, mntPitchMax:0.95})), true);
}

console.log('=== грань несёт тот шаг, который на ней написан ===');
{
  for(const std of ['metric','imperial']){
    const s = polyGaugeSpec(par({mntPolyStd:std}));
    const tris = build({mntPolyStd:std});
    for(let k=0;k<s.n;k++){
      const P = s.list[k].P, d = s.td(P);
      const pts = faceLocal(tris, s, k, -s.H/2);
      // Crests: the points standing a full tooth depth out of the face. Every crest is a FLAT of P/8, so
      // they come in pairs; the pitch is the distance between one pair's middle and the next one's.
      const crest = pts.filter(q => near(q[1], d, 1e-6)).map(q => q[0]);
      chk(std+' грань '+s.list[k].tag+': гребни парами',
          crest.length >= 6 && crest.length % 2 === 0, crest.length);
      const mids = []; for(let i=0;i<crest.length;i+=2) mids.push((crest[i]+crest[i+1])/2);
      let worst = 0;
      for(let i=1;i<mids.length;i++) worst = Math.max(worst, Math.abs((mids[i]-mids[i-1]) - P));
      chk(std+' грань '+s.list[k].tag+': шаг между гребнями = ' + P.toFixed(4), worst < 1e-6, worst);
      // Crest flat P/8 — the ISO profile, the same one the flat comb cuts.
      let flatC = 0; for(let i=0;i<crest.length;i+=2) flatC = Math.max(flatC, Math.abs((crest[i+1]-crest[i]) - P/8));
      chk(std+' грань '+s.list[k].tag+': площадка гребня P/8', flatC < 1e-6, flatC);
      const deep = Math.max.apply(null, pts.map(q => q[1]));
      chk(std+' грань '+s.list[k].tag+': глубина 0.5413·P', near(deep, 0.5413*P, 1e-9), {deep, want:0.5413*P});
      const root = pts.filter(q => near(q[1], 0, 1e-9));
      chk(std+' грань '+s.list[k].tag+': впадины лежат на самой грани', root.length >= 6, root.length);
    }
  }
}

console.log('=== число зубцов и плечи по краям грани ===');
{
  const s = polyGaugeSpec(par({}));
  for(let k=0;k<s.n;k++){
    const P = s.list[k].P, nT = s.nTeeth(P);
    chk('грань '+s.list[k].tag+': не меньше шести витков', nT >= 6, nT);
    chk('грань '+s.list[k].tag+': зубцы не доходят до угла', nT*P <= s.S - 2*s.edge + 1e-9, {run:nT*P, S:s.S});
    const pts = faceLocal(build({}), s, k, -s.H/2);
    const uMax = Math.max.apply(null, pts.filter(q => near(q[1], s.td(P), 1e-6)).map(q => q[0]));
    chk('грань '+s.list[k].tag+': последний гребень внутри плеча', uMax < s.S/2 - s.edge + 1e-6,
        {uMax, lim:s.S/2 - s.edge});
  }
}

console.log('=== наклон — это закрутка, и в ту же сторону, что идёт правая резьба ===');
{
  // Face 0's outermost crest, found in the UNTWISTED section (that is what makes it a crest) but reported
  // in the fixed frame (that is what makes it a slide). Bottom against top gives the tangent of the lean.
  const polySlide = lean => {
    const s = polyGaugeSpec(par({mntPitchLean:lean})), tris = build({mntPitchLean:lean});
    const d = s.td(s.list[0].P);
    const pick = y => { let best = -1e9;
      for(const T of tris) for(const v of T){ if(!near(v[1], y, 1e-6)) continue;
        const a = s.angAt(v[1]), ca = Math.cos(a), sa = Math.sin(a);
        const x = v[0]*ca + v[2]*sa, z = -v[0]*sa + v[2]*ca;      // face 0: n = (1,0), t = (0,1)
        if(Math.abs(z) > s.S/2 + 1e-6 || !near(x - s.a, d, 1e-6)) continue;
        if(v[2] > best) best = v[2]; }
      return best; };
    return {slide: (pick(s.H/2) - pick(-s.H/2))/s.H, s};
  };
  /* Куда крутить — не выкладка, а СОБСТВЕННАЯ резьба приложения, померенная тем же лучом. У неё
     `phase = y/P − hand·S·θ/2π`, то есть у правой гребень идёт с РОСТОМ θ; сверяемся с построенным
     штуцером, а не с этой строкой. До v17.7.2 знак сверялся с плоской гребёнкой, но её больше нет, и
     первоисточник тут в любом случае резьба. */
  const threadSlide = hand => {
    const P = 3;
    const p = Object.assign({}, DEF, {shape:'box', threadMode:'stud', threadD:30, threadPitch:P,
                                      threadLen:20, threadLead:0, threadStarts:1, threadHand:hand});
    const tris = buildTrisForShape('box', p);
    let lo = 1e9, hi = -1e9;
    for(const T of tris) for(const v of T){ if(v[1]<lo) lo=v[1]; if(v[1]>hi) hi=v[1]; }
    // Наружный радиус на луче наружу от оси: вдоль +X это θ=0, вдоль +Z это θ=π/2.
    const rAt = (ax, y) => { const runs = solidRuns(tris, ax, ax===0 ? y : 0, ax===0 ? 0 : y);
      let m = -1e9; for(const r of runs) m = Math.max(m, r[1]); return m; };
    // Высота гребня рядом с серединой резьбы, отдельно на каждом из двух лучей.
    const crest = ax => { const y0 = (lo+hi)/2 - P/2; let best = null, bm = -1e9;
      for(let k=0;k<=400;k++){ const y = y0 + P*k/400, r = rAt(ax, y);
        if(r > bm){ bm = r; best = y; } }
      return best; };
    // phase = y/P − hand·S·θ/2π: у правой гребень на θ=π/2 стоит на P/4 ВЫШЕ, чем на θ=0.
    let d = crest(2) - crest(0);
    while(d >  P/2) d -= P; while(d < -P/2) d += P;
    return d;
  };
  const rightThread = threadSlide('right'), leftThread = threadSlide('left');
  chk('правая и левая резьба идут в разные стороны', (rightThread > 0) !== (leftThread > 0),
      {правая:rightThread, левая:leftThread});
  for(const lean of [1.4, 3, -1.4, -3]){
    const P = polySlide(lean), want = Math.tan(lean*Math.PI/180);
    chk('λ='+lean+'°: призма скручена на tan λ по касательной', near(P.slide, want, 2e-3), {got:P.slide, want});
    // Плюс закручивает туда же, куда идёт правая резьба приложения; минус — куда левая.
    const wantSign = lean > 0 ? rightThread > 0 : leftThread > 0;
    chk('λ='+lean+'°: сторона та же, что у резьбы этой руки', (P.slide > 0) === wantSign,
        {poly:P.slide, правая:rightThread, левая:leftThread});
    chk('λ='+lean+'°: закрутка = tan λ / вписанный радиус', near(P.s.rate, want/P.s.a, 1e-12),
        {rate:P.s.rate, want:want/P.s.a});
  }
  const zero = polyGaugeSpec(par({mntPitchLean:0}));
  chk('без наклона закрутки нет и проход один', !zero.twist && zero.rate === 0 && zero.steps === 1, zero.steps);
  // Zero turn through the twisting extruder must be the straight extruder, triangle for triangle.
  const loop = [[10,0],[10,6],[-4,6],[-4,-6],[10,-6]];
  const A = extrudePolyYTris([loop], -3, 3), B = extrudePolyTwistYTris([loop], -3, 3, 1, () => 0);
  chk('скручивание на 0 — это обычная выдавка', A.length === B.length &&
      A.every((T,i) => T.every((v,j) => v.every((c,l) => near(c, B[i][j][l], 1e-12)))), {a:A.length, b:B.length});
}

console.log('=== закрученная призма остаётся телом, а не выворачивается ===');
{
  // A quarter turn is far past anything the gauge asks for, and is exactly where a wall reference taken
  // from the untwisted loop points at the wrong side.
  const loop = []; for(let i=0;i<6;i++){ const a = 2*Math.PI*i/6; loop.push([12*Math.cos(a), 12*Math.sin(a)]); }
  const straight = 12*12*Math.sin(Math.PI/3)*3*16;
  for(const turn of [0.2, Math.PI/2, -Math.PI/2, 2*Math.PI/3]){
    const t = extrudePolyTwistYTris([loop], -8, 8, 24, y => turn*(y+8)/16);
    chk('поворот '+turn.toFixed(2)+' рад: замкнут', wt(t), manifoldCheck(t,4));
    chk('поворот '+turn.toFixed(2)+' рад: ни одной перевёрнутой грани', flippedEdges(t) === 0, flippedEdges(t));
    // The side is ruled between turned stations and each quad is split along ONE of its two diagonals, so a
    // twist trims the solid one way and swells it the other. Bounded, not equal — and the bound is what
    // says the walls did not fold through themselves.
    const v = meshVolume(t);
    chk('поворот '+turn.toFixed(2)+' рад: объём остался объёмом призмы с точностью до огранки',
        v > 0 && Math.abs(v - straight) < straight*0.03, {v, straight});
  }
  chk('малая закрутка почти ничего не меняет',
      near(meshVolume(extrudePolyTwistYTris([loop], -8, 8, 24, y => 0.02*(y+8)/16)), straight, 1), true);
}

console.log('=== подпись стоит над своей гранью и это её подпись ===');
{
  for(const std of ['metric','imperial']) for(const lean of [0, 2]){
    const s = polyGaugeSpec(par({mntPolyStd:std, mntPitchLean:lean}));
    const tris = build({mntPolyStd:std, mntPitchLean:lean});
    // Label ink is the only thing standing proud of the top face.
    const ink = []; for(const T of tris) for(const v of T) if(v[1] > s.H/2 + 1e-6) ink.push(v);
    chk(std+' λ='+lean+': над верхом что-то есть', ink.length > 0, ink.length);
    const aTop = s.angAt(s.H/2), half = Math.PI/s.n;
    const groups = []; for(let k=0;k<s.n;k++) groups.push([]);
    let stray = 0;
    for(const v of ink){
      const th = Math.atan2(v[2], v[0]) - aTop;
      let k = Math.round(th/(2*Math.PI/s.n)); k = ((k % s.n) + s.n) % s.n;
      const off = th - 2*Math.PI*k/s.n;
      const dd = Math.atan2(Math.sin(off), Math.cos(off));
      if(Math.abs(dd) > half - 1e-9) stray++; else groups[k].push(v);
    }
    chk(std+' λ='+lean+': ни одна подпись не залезла на соседнюю грань', stray === 0, stray);
    chk(std+' λ='+lean+': подпись на каждой грани', groups.every(g => g.length > 0), groups.map(g=>g.length));
    // ...and it is the RIGHT label: its ink is as wide as its own text and nobody else's.
    let worst = 0, worstK = -1;
    for(let k=0;k<s.n;k++){
      const th = 2*Math.PI*k/s.n + aTop, tx = -Math.sin(th), tz = Math.cos(th);
      let lo = 1e9, hi = -1e9;
      for(const v of groups[k]){ const u = v[0]*tx + v[2]*tz; if(u<lo) lo=u; if(u>hi) hi=u; }
      // The reference is the INK, not the advance: a leading '1' is two uprights on the right of its cell,
      // so a label starting with one is narrower than its own text width by most of a glyph.
      let bl = 1e9, bh = -1e9;
      for(const b of seg7BarsXZ(s.list[k].tag, -seg7Width(s.list[k].tag, s.digit)/2, 0, s.digit)){
        if(b[0] < bl) bl = b[0]; if(b[1] > bh) bh = b[1]; }
      if(Math.abs((hi-lo) - (bh-bl)) > worst){ worst = Math.abs((hi-lo) - (bh-bl)); worstK = k; }
    }
    chk(std+' λ='+lean+': ширина краски = ширина своего же текста', worst < 1e-9,
        {worst, face: worstK >= 0 ? s.list[worstK].tag : null});
  }
}

console.log('=== отверстие под кольцо ===');
{
  const s = polyGaugeSpec(par({mntPolyBore:8}));
  chk('Ø8 помещается целиком', near(s.rb, 4) && !s.boreCut, {rb:s.rb, cut:s.boreCut});
  const t = build({mntPolyBore:8});
  chk('по оси — насквозь, пусто', rayY(t, 0, 0).length === 0, rayY(t, 0, 0));
  const solid = rayY(t, s.rb + 2, 0);
  chk('в стенке между отверстием и гранью — сплошняк на всю высоту',
      solid.length === 1 && near(solid[0][1]-solid[0][0], s.H, 1e-6), solid);
  chk('внутри отверстия по-прежнему пусто', rayY(t, s.rb - 0.5, 0).length === 0, rayY(t, s.rb - 0.5, 0));
  const noBore = polyGaugeSpec(par({mntPolyBore:0}));
  chk('0 — отверстия нет', noBore.rb === 0 && !noBore.boreCut, {rb:noBore.rb, cut:noBore.boreCut});
  const full = rayY(build({mntPolyBore:0}), 0, 0);
  chk('без отверстия по оси сплошняк', full.length === 1 && near(full[0][1]-full[0][0], noBore.H, 1e-6), full);
  const huge = polyGaugeSpec(par({mntPolyBore:60}));
  chk('Ø60 урезан, а не раздул шаблон', huge.boreCut && near(huge.a, noBore.a), {a:huge.a, rb:huge.rb});
  chk('урезан ровно до того, что осталось внутри подписей',
      near(huge.rb, huge.a - huge.digit - 2*huge.mLab - 1), {rb:huge.rb, a:huge.a, digit:huge.digit});
  chk('дырка меньше 1.5 мм радиусом не печатается вовсе', polyGaugeSpec(par({mntPolyBore:2.4})).rb === 0,
      polyGaugeSpec(par({mntPolyBore:2.4})).rb);
}

console.log('=== размеры, о которых говорит сводка ===');
{
  const s = polyGaugeSpec(par({}));
  const b = bbox(build({}));
  chk('высота — та, что задана', near(b.hi[1] - b.lo[1], s.H + 0.6, 1e-6), {got:b.hi[1]-b.lo[1], H:s.H});
  // Across the corners is what the summary prints, and on an even-sided prism that is NOT the bounding box:
  // no corner lies on an axis. Measured where it lives — the furthest point of the outline that is still on
  // the face plane, which is the corner itself.
  let corner = 0, crest = 0;
  for(const T of build({})) for(const v of T){
    if(!near(v[1], -s.H/2, 1e-6)) continue;
    const r = Math.hypot(v[0], v[2]);
    if(r > crest) crest = r;
    const k = Math.round(Math.atan2(v[2], v[0])/(2*Math.PI/s.n));
    const h = v[0]*Math.cos(2*Math.PI*k/s.n) + v[2]*Math.sin(2*Math.PI*k/s.n) - s.a;
    if(near(h, 0, 1e-6) && r > corner) corner = r;
  }
  chk('Ø по углам — как в сводке', near(2*corner, s.d, 1e-6), {got:2*corner, d:s.d});
  chk('зубцы стоят снаружи вписанной окружности', crest > s.a, {crest, a:s.a});
  chk('вписанный радиус даёт ширину грани', near(s.S, 2*s.a*Math.tan(Math.PI/s.n)), {S:s.S, a:s.a});
  const H60 = bbox(build({mntPolyH:60}));
  chk('высота 60 — это 60', near(H60.hi[1] - H60.lo[1], 60 + 0.6, 1e-6), H60.hi[1]-H60.lo[1]);
  chk('высота зажата снизу пятёркой', polyGaugeSpec(par({mntPolyH:1})).H === 5, polyGaugeSpec(par({mntPolyH:1})).H);
  chk('объём положительный', meshVolume(build({})) > 0, meshVolume(build({})));
}

console.log('=== предупреждения говорят о том, что правда произошло ===');
{
  const warn = o => collectPrintWarnings(par(o));
  const has = (o, re) => warn(o).some(w => re.test(w));
  chk('пустое окно — сказано', has({mntPitchMin:0.85, mntPitchMax:0.95}, /нет ни одного стандартного размера/),
      warn({mntPitchMin:0.85, mntPitchMax:0.95}));
  chk('добавленная грань — сказано', has({mntPitchMin:1, mntPitchMax:1}, /добавлен ближайший/),
      warn({mntPitchMin:1, mntPitchMax:1}));
  chk('мелкий зуб — сказано', has({mntPitchMin:0.3, mntPitchMax:0.5}, /на грани того, что печатается/),
      warn({mntPitchMin:0.3, mntPitchMax:0.5}));
  chk('урезанное отверстие — сказано', has({mntPolyBore:60}, /отверстие урезано/), warn({mntPolyBore:60}));
  chk('на настройках по умолчанию молчит', warn({}).length === 0, warn({}));
}

console.log('=== сводка называет то, что построено ===');
{
  setp({});
  const t = activeShapeLabel();
  chk('метрическая сводка', /^шаблон резьб 8-гранник Ø\d+ \(метрический, 0\.7…2 мм\)$/.test(t), t);
  setp({mntPolyStd:'imperial', mntPitchLean:-2});
  const ti = activeShapeLabel();
  chk('дюймовая сводка с левым наклоном', /дюймовый, 36…13 вит\.\/дюйм.*левой 2\.0°/.test(ti), ti);
}

console.log('=== хвост уховёртки: три точки на одной прямой — не дырка ===');
{
  // The regression this build fixed: an outline whose last three vertices are collinear used to lose its
  // cap triangle in BOTH caps. A plain rectangle with a redundant mid-edge point is the smallest case.
  const withMid = [[-10,-5],[0,-5],[10,-5],[10,5],[-10,5]];
  const t = extrudePolyYTris([withMid], -2, 2);
  chk('прямоугольник с лишней точкой на ребре замкнут', wt(t), manifoldCheck(t,4));
  chk('и ни одной перевёрнутой грани', flippedEdges(t) === 0, flippedEdges(t));
  chk('и объём его не изменился', near(meshVolume(t), 20*10*4, 1e-6), meshVolume(t));
  const many = [[-10,-5],[-6,-5],[-2,-5],[2,-5],[6,-5],[10,-5],[10,5],[6,5],[2,5],[-2,5],[-6,5],[-10,5]];
  const t2 = extrudePolyYTris([many], -2, 2);
  chk('и с целой цепочкой лишних точек тоже',
      wt(t2) && flippedEdges(t2) === 0 && near(meshVolume(t2), 20*10*4, 1e-6), meshVolume(t2));
}

console.log('=== TOTAL: ' + pass + ' passed, ' + fail + ' failed ===');
if(fail) process.exit(1);
