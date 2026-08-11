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
// mesh that pairs every undirected one.
//
// The teeth turned 90° in v17.7.3: they run AROUND the prism and stack up its axis, so a screw lies along
// the axis. What that moves is where the measurements are taken — the pitch is read up a face's height
// now, not across its width — and how the lean works: a twist of the section cannot tilt a horizontal ring,
// so the lean is a shear, the height read at y − u·tan λ. Run via ./run-all.sh.
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

// Every vertex of the body standing on face k's own middle line (u = 0), as [y, h]: how far up the face and
// how far out of its plane. The teeth stack along y now, so this is the line the pitch is read along.
function faceColumn(tris, s, k){
  const th = 2*Math.PI*k/s.n, nx = Math.cos(th), nz = Math.sin(th), tx = -Math.sin(th), tz = Math.cos(th);
  const out = [], seen = new Set();
  for(const T of tris) for(const v of T){
    const u = v[0]*tx + v[2]*tz, h = v[0]*nx + v[2]*nz - s.a;
    if(Math.abs(u) > 1e-6) continue;                       // only the face's own middle line
    const key = v[1].toFixed(6) + ',' + h.toFixed(6);
    if(seen.has(key)) continue; seen.add(key);
    out.push([v[1], h]);
  }
  return out.sort((A,B) => A[0]-B[0]);
}

console.log('=== собирается, замкнут и ориентирован — по всему полю настроек ===');
{
  /* Наклонов здесь ДВА, а не четыре. Развёртка отвечает на вопрос «замыкается ли», и на него отвечают
     прямой случай и наклонённый; знак наклона и его величина разобраны отдельным блоком ниже, где их и
     меряют. Лишние два наклона — это вдвое больше самой дорогой сборки в батарее, а батарея гоняет
     четыре файла на четырёх ядрах, и у соседей есть проверки бюджета процессорного времени с запасом в
     считанные проценты. Тест, который роняет соседа своей ценой, стоит дешевле переписать, чем объяснять. */
  let n = 0, open = 0, flip = 0;
  for(const std of ['metric','imperial'])
    for(const [lo,hi] of [[0.7,2],[0.3,3.5],[1,1],[0.85,0.95],[0.35,0.6],[2,3.5]])
      for(const lean of [0, 3])
        for(const bore of [0, 3, 8, 40])
          for(const H of [5, 12, 60]){
            const t = build({mntPolyStd:std, mntPitchMin:lo, mntPitchMax:hi,
                             mntPitchLean:lean, mntPolyBore:bore, mntPolyH:H});
            n++; if(!wt(t)) open++; if(flippedEdges(t)) flip++;
          }
  chk('288 сочетаний собраны', n === 288, n);
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
      const pts = faceColumn(tris, s, k);
      // Crests: the points standing a full tooth depth out of the face. Every crest is a FLAT of P/8, so
      // they come in pairs; the pitch is the distance between one pair's middle and the next one's.
      /* Гребни ищутся ОТРЕЗКАМИ, а не парами точек. Сетка по высоте общая на все грани — это объединение
         изломов всех шагов сразу, — поэтому на площадку одного гребня попадает сколько угодно станций, и
         «первая и вторая» ничего не значат. Отрезок — это подряд идущие точки на глубине зуба; между
         соседними гребнями разрыв не меньше трёх четвертей шага, по нему и режем. */
      const crest = pts.filter(q => near(q[1], d, 1e-6)).map(q => q[0]);
      const runs = [];
      for(const y of crest){ const last = runs[runs.length-1];
        if(last && y - last[last.length-1] < P/4) last.push(y); else runs.push([y]); }
      chk(std+' грань '+s.list[k].tag+': гребней столько, сколько зубцов',
          runs.length === s.nTeeth(P), {гребней:runs.length, зубцов:s.nTeeth(P)});
      const mids = runs.map(r => (r[0] + r[r.length-1])/2);
      let worst = 0;
      for(let i=1;i<mids.length;i++) worst = Math.max(worst, Math.abs((mids[i]-mids[i-1]) - P));
      chk(std+' грань '+s.list[k].tag+': шаг между гребнями = ' + P.toFixed(4) + ' мм ПО ВЫСОТЕ',
          worst < 1e-6, worst);
      // Crest flat P/8 — the ISO profile, the same one the comb cut before it was rolled into a ring.
      let flatC = 0; for(const r of runs) flatC = Math.max(flatC, Math.abs((r[r.length-1]-r[0]) - P/8));
      chk(std+' грань '+s.list[k].tag+': площадка гребня P/8', flatC < 1e-6, flatC);
      const deep = Math.max.apply(null, pts.map(q => q[1]));
      chk(std+' грань '+s.list[k].tag+': глубина 0.5413·P', near(deep, 0.5413*P, 1e-9), {deep, want:0.5413*P});
      const root = pts.filter(q => near(q[1], 0, 1e-9));
      chk(std+' грань '+s.list[k].tag+': впадины лежат на самой грани', root.length >= 4, root.length);
    }
  }
}

console.log('=== зубцы идут КОЛЬЦАМИ, а не вдоль оси ===');
{
  /* То, ради чего был поворот на 90°: вдоль грани (по u) высота постоянна, вдоль оси (по y) она и есть
     профиль зуба. Мерится это прямо на построенных треугольниках — луч поперёк детали на высоте гребня
     видит МНОГОГРАННИК, а на высоте впадины — многогранник поменьше, и разница есть глубина зуба. */
  const s = polyGaugeSpec(par({}));
  const tris = build({});
  const P = s.list[0].P, d = s.td(P), y0 = s.y0Of(P);
  // Радиус грани 0 (нормаль вдоль +X) на заданной высоте: самая дальняя точка луча вдоль X при z = 0.
  const rAt = y => { const runs = solidRuns(tris, 0, y, 0); let m = -1e9;
    for(const r of runs) m = Math.max(m, r[1]); return m; };
  const yCrest = y0 + P/4 + 0.3125*P + P/16;          // середина площадки гребня первого зуба
  const yRoot  = y0 + P/8;                            // середина площадки впадины
  chk('на высоте гребня грань стоит на глубину зуба дальше',
      near(rAt(yCrest) - rAt(yRoot), d, 1e-3), {гребень:rAt(yCrest), впадина:rAt(yRoot), d});
  chk('и впадина лежит ровно на самой грани', near(rAt(yRoot), s.a, 1e-3), {got:rAt(yRoot), a:s.a});
  // А вдоль грани, на одной высоте, высота не меняется — пока не начнётся плечо.
  const th = 0, tx = 0, tz = 1;                        // грань 0: t = (0, 1) в (x, z)
  const hAtU = (u, y) => { const runs = solidRuns(tris, 0, y, u); let m = -1e9;
    for(const r of runs) m = Math.max(m, r[1]); return m; };
  let flat = 0;
  for(const u of [-4, -2, 0, 2, 4]) flat = Math.max(flat, Math.abs(hAtU(u, yCrest) - rAt(yCrest)));
  chk('на гребне высота вдоль грани постоянна', flat < 2e-3, flat);
  // ...и сходит на нет к углу: там встречаются две грани с РАЗНЫМИ шагами, и обе обязаны прийти в одну точку.
  const uCorner = s.S/2 - 0.05;
  chk('у самого угла зуба уже нет', near(hAtU(uCorner, yCrest), s.a, 0.02),
      {угол:hAtU(uCorner, yCrest), a:s.a});
  chk('плечо начинается там, где кончается гребень', s.run < s.S - 1e-9, {run:s.run, S:s.S});
}

console.log('=== число зубцов задаёт ВЫСОТА, а не ширина грани ===');
{
  const s = polyGaugeSpec(par({}));
  for(let k=0;k<s.n;k++){
    const P = s.list[k].P, nT = s.nTeeth(P);
    chk('грань '+s.list[k].tag+': зубцов ровно столько, сколько влезло по высоте',
        nT === Math.floor(s.band/P + 1e-9), {nT, band:s.band, P});
    chk('грань '+s.list[k].tag+': зубцы не выходят за высоту', nT*P <= s.band + 1e-9, {run:nT*P, band:s.band});
    const pts = faceColumn(build({}), s, k);
    const yMax = Math.max.apply(null, pts.filter(q => near(q[1], s.td(P), 1e-6)).map(q => q[0]));
    chk('грань '+s.list[k].tag+': последний гребень не достаёт до торца',
        yMax < s.H/2 - 1e-9, {yMax, H:s.H});
  }
  // Выше деталь — больше витков на той же грани. Это и есть «высота задаёт число».
  const tall = polyGaugeSpec(par({mntPolyH:30}));
  chk('выше призма — больше зубцов', tall.nTeeth(tall.list[0].P) > s.nTeeth(s.list[0].P),
      {H12:s.nTeeth(s.list[0].P), H30:tall.nTeeth(tall.list[0].P)});
  // ...а ширина грани на число зубцов не влияет вовсе.
  chk('ширина грани числа зубцов не меняет', s.nTeeth(s.list[0].P) === polyGaugeSpec(par({})).nTeeth(s.list[0].P));
  const low = polyGaugeSpec(par({mntPolyH:5}));
  chk('на низкой призме крупный шаг набирает мало витков — и об этом сказано',
      low.few === (low.nTeeth(low.list[low.n-1].P) < 4), {nT:low.nTeeth(low.list[low.n-1].P), few:low.few});
}

console.log('=== наклон — это СДВИГ, и в ту же сторону, что идёт правая резьба ===');
{
  /* Кольцо нельзя наклонить поворотом сечения — оно так и останется горизонтальным. Наклон здесь это
     сдвиг: высота читается на y − u·tan λ, то есть один и тот же зуб поднимается, пока идёт по грани.
     Мерится он на построенных треугольниках: на сколько уезжает по высоте гребень между двумя точками
     грани, разнесёнными по u. */
  const polyLift = lean => {
    const s = polyGaugeSpec(par({mntPitchLean:lean})), tris = build({mntPitchLean:lean});
    const P = s.list[0].P, d = s.td(P);
    // Грань 0: нормаль вдоль +X, касательная вдоль +Z. Луч поперёк детали при z = u даёт радиус в (u, y).
    const rAt = (u, y) => { const runs = solidRuns(tris, 0, y, u); let m = -1e9;
      for(const r of runs) m = Math.max(m, r[1]); return m; };
    // Высота первого гребня над заданной точкой грани: ищем максимум радиуса по y в окне в один шаг.
    const crestY = u => { const y0 = s.y0Of(P) + P; let best = null, bm = -1e9;
      for(let i=0;i<=300;i++){ const y = y0 + P*i/300, r = rAt(u, y);
        if(r > bm){ bm = r; best = y; } }
      return best; };
    const u0 = -4, u1 = 4;
    return {lift: (crestY(u1) - crestY(u0))/(u1 - u0), s};
  };
  const threadSlide = hand => {
    const P = 3;
    const p = Object.assign({}, DEF, {shape:'box', threadMode:'stud', threadD:30, threadPitch:P,
                                      threadLen:20, threadLead:0, threadStarts:1, threadHand:hand});
    const tris = buildTrisForShape('box', p);
    let lo = 1e9, hi = -1e9;
    for(const T of tris) for(const v of T){ if(v[1]<lo) lo=v[1]; if(v[1]>hi) hi=v[1]; }
    const rAt = (ax, y) => { const runs = solidRuns(tris, ax, ax===0 ? y : 0, ax===0 ? 0 : y);
      let m = -1e9; for(const r of runs) m = Math.max(m, r[1]); return m; };
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
    const L = polyLift(lean), want = Math.tan(lean*Math.PI/180);
    chk('λ='+lean+'°: гребень поднимается на tan λ на миллиметр грани',
        near(L.lift, want, 3e-3), {got:L.lift, want});
    // Плюс поднимает туда же, куда идёт правая резьба приложения; минус — куда левая.
    const wantSign = lean > 0 ? rightThread > 0 : leftThread > 0;
    chk('λ='+lean+'°: сторона та же, что у резьбы этой руки', (L.lift > 0) === wantSign,
        {poly:L.lift, правая:rightThread, левая:leftThread});
    chk('λ='+lean+'°: сдвиг в спеке — это tan λ', near(L.s.shear, want, 1e-12), {shear:L.s.shear, want});
  }
  const zero = polyGaugeSpec(par({mntPitchLean:0}));
  chk('без наклона сдвига нет', zero.shear === 0, zero.shear);
  // Без наклона высота на грани зависит ТОЛЬКО от y — это и значит «кольцо».
  const s0 = polyGaugeSpec(par({}));
  let worst = 0;
  for(const y of [-3, -1, 0, 1, 3]) for(const u of [-4, 0, 4])
    worst = Math.max(worst, Math.abs(s0.heightAt(0, u, y) - s0.heightAt(0, 0, y)));
  chk('без наклона высота вдоль грани не зависит от u', worst < 1e-12, worst);
}

console.log('=== подпись стоит над своей гранью и это её подпись ===');
{
  for(const std of ['metric','imperial']) for(const lean of [0, 2]){
    const s = polyGaugeSpec(par({mntPolyStd:std, mntPitchLean:lean}));
    const tris = build({mntPolyStd:std, mntPitchLean:lean});
    // Label ink is the only thing standing proud of the top face.
    const ink = []; for(const T of tris) for(const v of T) if(v[1] > s.H/2 + 1e-6) ink.push(v);
    chk(std+' λ='+lean+': над верхом что-то есть', ink.length > 0, ink.length);
    const aTop = 0, half = Math.PI/s.n;
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
  /* Лучи уводятся С ОСИ. Ровно по оси у правильного многогранника проходит ребро крышки: луч попадает в
     общее ребро двух треугольников, оба его отбрасывают, и сплошное тело читается как пустое. Ловушка
     ровно та же, о которой предупреждает шапка про чётные многоугольники, — и первым в неё попался этот
     файл. Точка в полумиллиметре от оси про отверстие говорит ровно то же самое и ни на чём не стоит. */
  const OFF = 0.37;
  const t = build({mntPolyBore:8});
  chk('по оси — насквозь, пусто', rayY(t, OFF, 0).length === 0, rayY(t, OFF, 0));
  const solid = rayY(t, s.rb + 2, 0);
  chk('в стенке между отверстием и гранью — сплошняк на всю высоту',
      solid.length === 1 && near(solid[0][1]-solid[0][0], s.H, 1e-6), solid);
  chk('внутри отверстия по-прежнему пусто', rayY(t, s.rb - 0.5, 0).length === 0, rayY(t, s.rb - 0.5, 0));
  const noBore = polyGaugeSpec(par({mntPolyBore:0}));
  chk('0 — отверстия нет', noBore.rb === 0 && !noBore.boreCut, {rb:noBore.rb, cut:noBore.boreCut});
  const full = rayY(build({mntPolyBore:0}), OFF, 0);
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

/* ИГЛЫ. Треугольник, у которого одна сторона в двести раз длиннее высоты, — это не «мелкая деталь», а
   брак: он тоньше пикселя, и плоское затенение выводит нормаль из экранных производных, которые у иглы
   шум. На экране это рваная бахрома вдоль края каждого зубца, в том месте, где грань сходит к углу
   призмы, — то, о чём сообщили дважды. Причиной было ОБЪЕДИНЕНИЕ изломов всех граней в одну сетку по
   высоте: грани с шагом 3 мм доставалось четыреста рядов вместо пятнадцати. Мера — доля треугольников
   с L²/A > 40 (у равностороннего 4.6, у квадрата, разрезанного пополам, 8): было 73 %, стало 9. */
console.log('=== зубцы не осыпаются иглами ===');
{
  const slivers = (t) => { let n = 0;
    for(const T of t){
      const e = [[0,1],[1,2],[2,0]].map(([i,j]) => Math.hypot(T[i][0]-T[j][0], T[i][1]-T[j][1], T[i][2]-T[j][2]));
      const p2 = (e[0]+e[1]+e[2])/2, A = Math.sqrt(Math.max(0, p2*(p2-e[0])*(p2-e[1])*(p2-e[2])));
      if(!(A > 0) || Math.max(...e)**2/A > 40) n++; }
    return n/t.length; };
  for(const [nm, ov] of [['метрический', {}], ['дюймовый', {mntPolyStd:'imperial'}],
                         ['высокий', {mntPolyH:30}], ['наклон +3°', {mntPitchLean:3}],
                         ['наклон −2°', {mntPitchLean:-2}]]){
    const t = build(ov), f = slivers(t);
    chk(nm + ': игл меньше 15 %', f < 0.15, {доля:+(100*f).toFixed(1), треугольников:t.length});
  }
  // Своих рядов у грани столько, сколько изломов у её профиля, поэтому мелкий шаг обязан стоить дороже
  // крупного — а при общей сетке они стоили одинаково, и в этом была вся беда.
  const t = build({});
  chk('и весь шаблон дешевле пятнадцати тысяч треугольников', t.length < 15000, t.length);
}

/* РЕБРО ПРИЗМЫ ОБЩЕЕ. Свои ряды у каждой грани — это разные вершины на общем ребре, если ребро не сшить;
   поэтому в крайних столбцах берётся объединение рядов обеих соседок, а полоса до него идёт «молнией».
   Проверяется тем же счётом направленных рёбер, что ловил перевёрнутые крышки: в замкнутой оболочке
   каждое направленное ребро встречается ровно один раз. */
console.log('=== ребро призмы у двух граней одно ===');
{
  for(const ov of [{}, {mntPolyStd:'imperial'}, {mntPolyH:30}, {mntPitchLean:3}, {mntPolyBore:0}]){
    const t = build(ov), seen = new Map();
    const key = v => v.map(c => c.toFixed(4)).join(',');
    for(const T of t) for(let i=0;i<3;i++){ const k = key(T[i]) + '|' + key(T[(i+1)%3]);
      seen.set(k, (seen.get(k)||0) + 1); }
    let bad = 0, lone = 0;
    for(const [k, c] of seen){ if(c > 1) bad++;
      const [a, b] = k.split('|'); if(!seen.has(b + '|' + a)) lone++; }
    chk(JSON.stringify(ov) + ': каждое направленное ребро ровно раз и с парой',
        bad === 0 && lone === 0, {дубли:bad, безпары:lone});
  }
}

console.log('=== TOTAL: ' + pass + ' passed, ' + fail + ' failed ===');
if(fail) process.exit(1);
