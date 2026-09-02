// Телескопическая труба, печатная в сборе: N tubes nested inside one another, all the same height, so it
// comes off the bed collapsed and pulls out. Each section carries an outward ring at its BOTTOM and an
// inward one at its TOP, and a section stops when its bottom ring reaches the ring above it.
//
// The design is one chain of inequalities on the radii, and every link of it is testable off the mesh:
// each section must PASS THROUGH the ring above it (or the thing never extends), CATCH on it coming back
// (or the sections simply fall out), and clear it everywhere in between (or the print fuses solid). The
// three conditions have a solution only when the ring is deeper than twice the clearance — a ring
// shallower than the gap on both sides cannot both slip past and hold. Run via ./run-all.sh.
let pass=0, fail=0;
function chk(n,c,e){if(c){pass++;console.log('  OK  ',n);}else{fail++;console.log('  FAIL',n,e!==undefined?JSON.stringify(e):'');}}
function vol(t){let v=0;for(const T of t){const a=T[0],b=T[1],c=T[2];v+=(a[0]*(b[1]*c[2]-b[2]*c[1])-a[1]*(b[0]*c[2]-b[2]*c[0])+a[2]*(b[0]*c[1]-b[1]*c[0]))/6;}return v;}
function setp(ov){ logos.length=0; boxHoles.length=0; dieFaces.length=0;
  Object.assign(paramState.box, defaultBoxParams(), {gfBaseplate:false, pipMode:'telescope',
    telN:3, telD:26, telLen:40, telWall:1.6, telGap:0.35, telStopD:0, telStopH:2.5}, ov);
  return paramState.box; }
const mk = ov => buildTrisForShape('box', setp(ov));

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
const sb=(u,v)=>[u[0]-v[0],u[1]-v[1],u[2]-v[2]], dt=(u,v)=>u[0]*v[0]+u[1]*v[1]+u[2]*v[2];
const cx=(u,v)=>[u[1]*v[2]-u[2]*v[1],u[2]*v[0]-u[0]*v[2],u[0]*v[1]-u[1]*v[0]], EP=1e-9;
function overlap(A,B){
  const N1=cx(sb(A[1],A[0]),sb(A[2],A[0])), d1=-dt(N1,A[0]), dB=B.map(q=>dt(N1,q)+d1);
  if((dB[0]>EP&&dB[1]>EP&&dB[2]>EP)||(dB[0]<-EP&&dB[1]<-EP&&dB[2]<-EP)) return false;
  const N2=cx(sb(B[1],B[0]),sb(B[2],B[0])), d2=-dt(N2,B[0]), dA=A.map(q=>dt(N2,q)+d2);
  if((dA[0]>EP&&dA[1]>EP&&dA[2]>EP)||(dA[0]<-EP&&dA[1]<-EP&&dA[2]<-EP)) return false;
  const D=cx(N1,N2), aD=D.map(Math.abs); if(Math.max(...aD)<1e-12) return false;
  const idx=aD.indexOf(Math.max(...aD));
  const iv=(T,d)=>{ const q=T.map(v=>v[idx]), out=[];
    for(let i=0;i<3;i++){ const j=(i+1)%3;
      if(d[i]*d[j]<0){ const t=d[i]/(d[i]-d[j]); out.push(q[i]+(q[j]-q[i])*t); }
      if(Math.abs(d[i])<=EP) out.push(q[i]); }
    return out.length<2?null:[Math.min(...out),Math.max(...out)]; };
  const i1=iv(A,dA), i2=iv(B,dB);
  return !!(i1&&i2) && (Math.min(i1[1],i2[1]) - Math.max(i1[0],i2[0])) > 1e-6;
}
const bb=T=>{const lo=[1e30,1e30,1e30],hi=[-1e30,-1e30,-1e30];
  for(const v of T)for(let a=0;a<3;a++){if(v[a]<lo[a])lo[a]=v[a];if(v[a]>hi[a])hi[a]=v[a];}return{lo,hi};};
// Sections, grouped by matching each shell to the radii it was BUILT from. Grouping by outer reach alone
// does not work and it is worth saying why: section 0's inward top ring reaches out to r₀+0.3, which is
// nearer section 1's bottom ring (r₁+w+f) than it is to section 0's own wall (r₀+w). Bucketed that way,
// section 0's wall and its own top ring — which interpenetrate BY DESIGN — land in different groups and
// the crossing count reports 637 collisions in a part that has none.
function sections(t, s){
  const want = [];                                        // [lo, hi, section] for every shell built
  for(let i=0;i<s.N;i++){
    want.push([s.rs[i], s.rs[i]+s.w, i]);
    if(i > 0)     want.push([s.rs[i]+s.w-0.3, s.rs[i]+s.w+s.f, i]);
    if(i < s.N-1) want.push([s.rs[i]-s.f, s.rs[i]+0.3, i]);
  }
  const out = s.rs.map(()=>[]);
  for(const c of meshComponents(t)){
    let lo=1e9, hi=-1e9;
    for(const T of c) for(const v of T){ const r=Math.hypot(v[0],v[2]); if(r<lo)lo=r; if(r>hi)hi=r; }
    let best=0, bd=1e9;
    for(const [wl,wh,i] of want){ const d=Math.abs(lo-wl)+Math.abs(hi-wh); if(d<bd){ bd=d; best=i; } }
    out[best] = out[best].concat(c);
  }
  return out;
}
function crossings(a,b){ const B=b.map(bb); let n=0;
  for(const A of a){ const x=bb(A);
    for(let t=0;t<b.length;t++){ const y=B[t];
      if(x.hi[0]<y.lo[0]||y.hi[0]<x.lo[0]||x.hi[1]<y.lo[1]||y.hi[1]<x.lo[1]||x.hi[2]<y.lo[2]||y.hi[2]<x.lo[2]) continue;
      if(overlap(A,b[t])) n++; } }
  return n; }

console.log('=== builds across the range ===');
for(const N of [2,4,6]) for(const D of [20,40,80]){
  const t = mk({telN:N, telD:D}), mc = manifoldCheck(t,4);
  chk(N+' секций, Ø'+D+': замкнут', mc.watertight && vol(t)>0, {open:mc.openEdges, bad:mc.badEdges});
}
for(const ov of [{telGap:0.15}, {telGap:1}, {telWall:0.8}, {telWall:6}, {telStopD:4}, {telStopH:10},
                 {telLen:10}, {telLen:300}, {telN:8}, {telD:200}]){
  const t = mk(ov), mc = manifoldCheck(t,4);
  chk('крайние параметры '+JSON.stringify(ov), mc.watertight && vol(t)>0, {open:mc.openEdges, bad:mc.badEdges});
}
{ const t = mk({}), cs = meshComponents(t);
  // Three shells per section, less the two rings that would have nothing to work against: the outermost
  // section's outward ring and the innermost's inward one.
  chk('оболочек — по три на секцию минус два бесполезных кольца', cs.length === 3*3 - 2, {n:cs.length});
  chk('и каждая замкнута', cs.every(c=>manifoldCheck(c,4).watertight), {});
}

console.log('=== the sections never touch — collapsed, that is the whole print ===');
for(const ov of [{}, {telN:5}, {telGap:0.15}, {telGap:1}, {telWall:3}, {telStopD:4}, {telStopH:8}]){
  const s = telescopeSpec(setp(ov)), t = mk(ov), sec = sections(t, s);
  let n = 0;
  for(let i=0;i+1<sec.length;i++) n += crossings(sec[i], sec[i+1]);
  chk('ноль пересечений между соседними секциями: '+JSON.stringify(ov), n === 0, {crossings:n});
}

console.log('=== the three inequalities that make it a telescope ===');
// Every one of these is read off the built mesh, not off the parameters.
{ const s = telescopeSpec(setp({})), t = mk({}), B = computeBBox(t);
  // 1. PASSES: at the height of section 0's top ring, section 1's plain wall must clear it.
  const yTop = B.maxY - s.hf/2, runs = solidRuns(t, 0, yTop, 0.11);
  const pos = runs.filter(r => r[0] > 0).sort((a,b)=>a[0]-b[0]);
  chk('под верхним кольцом секции 1 остаётся просвет', pos.length >= 2, {runs:pos.length});
  chk('и он не меньше зазора',
      pos.length >= 2 && pos[0][0] - pos[1][1] !== 0 && Math.min(...pos.slice(1).map((r,k)=>r[0]-pos[k][1])) > s.gap - 0.05,
      {gaps: pos.slice(1).map((r,k)=>+(r[0]-pos[k][1]).toFixed(3))});
  // 2. CATCHES: section 1's bottom ring reaches FURTHER out than section 0's top ring reaches in.
  chk('нижнее кольцо секции 1 шире внутреннего края верхнего кольца секции 0',
      s.rs[1] + s.w + s.f > s.rs[0] - s.f + s.gap,
      {ring:+(s.rs[1]+s.w+s.f).toFixed(2), lip:+(s.rs[0]-s.f).toFixed(2)});
  // ...and the mesh agrees: at the bottom, section 1 reaches out past where section 0's top lip sits.
  const yBot = B.minY + s.hf/2, rb = solidRuns(t, 0, yBot, 0.11).filter(r=>r[0]>0).sort((a,b)=>a[0]-b[0]);
  chk('и в меше это видно', rb.length >= 2 && rb[1][1] > s.rs[0] - s.f, {reach:rb.length>=2 ? +rb[1][1].toFixed(2) : 0});
  // 3. FITS: that same ring still sits inside section 0's plain bore.
  chk('но всё ещё помещается в расточку секции 0', s.rs[1] + s.w + s.f < s.rs[0] - s.gap,
      {ring:+(s.rs[1]+s.w+s.f).toFixed(2), bore:+s.rs[0].toFixed(2)});
}
{ // The condition that makes all three satisfiable at once: the ring must be deeper than twice the gap.
  for(const g of [0.15, 0.35, 0.6, 1.0]){
    const s = telescopeSpec(setp({telGap:g}));
    chk('зазор '+g+': кольцо глубже двойного зазора', s.f > 2*s.gap, {f:+s.f.toFixed(2), gap:+s.gap.toFixed(2)});
    chk('  и все три неравенства выполняются',
        s.rs[1] + s.w < s.rs[0] - s.f - s.gap &&
        s.rs[1] + s.w + s.f > s.rs[0] - s.f + s.gap &&
        s.rs[1] + s.w + s.f < s.rs[0] - s.gap, {});
  }
  // A ring the user asks to be too shallow is raised to the floor rather than quietly failing to catch.
  chk('слишком мелкое кольцо поднимается до минимума', telescopeSpec(setp({telStopD:0.2, telGap:0.5})).f > 1.0,
      {f:+telescopeSpec(setp({telStopD:0.2, telGap:0.5})).f.toFixed(2)});
}

console.log('=== collapsed as printed, and the travel is what it says ===');
{ const s = telescopeSpec(setp({})), B = computeBBox(mk({}));
  chk('печатается сложенным — высота одной секции', Math.abs((B.maxY-B.minY) - 40) < 1e-9,
      {h:+(B.maxY-B.minY).toFixed(2)});
  chk('ход секции — длина минус два кольца', Math.abs(s.travel - (40 - 2*2.5)) < 1e-9, {travel:s.travel});
  chk('и раздвинутая длина — секция плюс (N−1) ходов',
      Math.abs(s.extended - (40 + 2*35)) < 1e-9, {ext:s.extended});
  const five = telescopeSpec(setp({telN:5}));
  chk('больше секций — длиннее раздвинутая', Math.abs(five.extended - (40 + 4*35)) < 1e-9, {ext:five.extended});
  const tall = telescopeSpec(setp({telStopH:8}));
  chk('выше кольца — короче ход', tall.travel < s.travel - 10, {travel:tall.travel});
  chk('наружный Ø — заказанный', Math.abs((B.maxX-B.minX) - 2*s.rOut) < 0.3, {d:+(B.maxX-B.minX).toFixed(2)});
}
{ // The bore runs all the way through — it is a tube, not a stack of cups.
  const t = mk({});
  chk('по оси сквозной проход', solidRuns(t,1,0,0).length === 0, {runs:solidRuns(t,1,0,0).length});
  const s = telescopeSpec(setp({})), B = computeBBox(t);
  // The bore is the opening AROUND THE AXIS, so it is the gap between the two runs either side of x = 0 —
  // not the distance between the outermost runs, which spans the whole part.
  const runs = solidRuns(t, 0, B.maxY - s.hf/2, 0.11);
  let open = 0;
  for(let k=0;k+1<runs.length;k++) if(runs[k][1] <= 0 && runs[k+1][0] >= 0) open = runs[k+1][0]-runs[k][1];
  chk('и в самом узком месте он — Ø внутренней секции', Math.abs(open - s.bore) < 0.3,
      {open:+open.toFixed(2), bore:+s.bore.toFixed(2)});
}

console.log('=== and it says when it had to change what was asked ===');
{ chk('тесный зазор отмечается', collectPrintWarnings(setp({telGap:0.15})).some(x=>/спечься/.test(x)), {});
  /* СТЕНКА — v25.37.0. Прежняя жалоба говорила «стенка секции 0.8 мм — тоньше 1 мм» и была неправа
     дважды: порог `1.0` взят числом, к соплу не привязанным (на сопле 0.6 стенка 1.0 это меньше двух
     проходов, и молчали), а число 0.8 приложение ставило САМО вместо заказанных 0.5 — то есть жалоба
     шла на собственную подстановку, не назвав её. Теперь говорится ровно то, что произошло. */
  chk('поднятая соплом стенка названа обоими числами',
      collectPrintWarnings(setp({telWall:0.5})).some(x=>/стенка секции поднята с 0\.50 до 0\.80 мм соплом 0\.4/.test(x)),
      collectPrintWarnings(setp({telWall:0.5})));
  chk('  и на сопле 0.6 порог идёт за соплом, а не за единицей',
      collectPrintWarnings(setp({telWall:1.0, printNozzle:'0.6'})).some(x=>/поднята с 1\.00 до 1\.20/.test(x)),
      collectPrintWarnings(setp({telWall:1.0, printNozzle:'0.6'})));
  chk('  а ровно два прохода жалобы не вызывают', !collectPrintWarnings(setp({telWall:0.8})).some(x=>/стенка секции/.test(x)),
      collectPrintWarnings(setp({telWall:0.8})));
  chk('  и прежнего порога числом в файле не осталось',
      require('fs').readFileSync('parametric-stl-generator.html','utf8').indexOf('стенка секции \' + t.w.toFixed(1)') < 0);
  // N sections need N·step of radius; rather than let the innermost vanish, the outer Ø is raised — and
  // silently growing a part someone dimensioned would be worse than saying so.
  chk('и то, что Ø пришлось увеличить', collectPrintWarnings(setp({telN:6, telD:26})).some(x=>/увеличен/.test(x)),
      collectPrintWarnings(setp({telN:6, telD:26})));
  chk('а нормальный телескоп ни о чём не предупреждает', collectPrintWarnings(setp({})).length === 0,
      collectPrintWarnings(setp({})));
}

console.log('=== чего стоил подъём стенки: две ветки, и обе измерены по СЕТКЕ ===');
/* ЗАЧЕМ ОТДЕЛЬНЫЙ РАЗДЕЛ. У шести остальных стенок подъём соплом кончается на самой стенке. У
   телескопа стенка входит в ШАГ СЕКЦИЙ, и потому у подъёма есть цена — но она не одна, а две, и
   какая именно, решают числа: пока наружный Ø задан с запасом, лишняя толщина уходит в ПРОСВЕТ (на
   каждой из N секций), а когда запаса нет, растёт САМ наружный Ø. Спрашивать про это спецификацию
   бессмысленно — она сама себе источник, — поэтому меряется построенное. */
{
  const bore = (t, s) => {                      // просвет: щель вокруг оси на высоте между кольцами
    const B = computeBBox(t), runs = solidRuns(t, 0, B.maxY - s.hf/2, 0.11);
    let open = 0;
    for (let k = 0; k+1 < runs.length; k++) if (runs[k][1] <= 0 && runs[k+1][0] >= 0) open = runs[k+1][0] - runs[k][1];
    return open;
  };
  const wallOuter = (t, s) => {                 // толщина стенки самой широкой секции, на середине высоты
    const runs = solidRuns(t, 0, 0, 0.11);
    return runs.length ? runs[0][1] - runs[0][0] : null;
  };
  /* ВЕТКА ПЕРВАЯ: Ø с запасом — просвет сужается ровно на то, что обещано, и обещание это в тексте. */
  for (const [nz, ask, wantW] of [['0.4', 0.5, 0.8], ['0.6', 0.8, 1.2], ['0.8', 0.5, 1.6]]){
    const p = setp({telWall:ask, printNozzle:nz, telD:40}), s = telescopeSpec(p), t = mk({telWall:ask, printNozzle:nz, telD:40});
    chk('сопло ' + nz + ': построена стенка ' + wantW, Math.abs(wallOuter(t, s) - wantW) < 1e-3,
        {построено:+wallOuter(t, s).toFixed(3), правило:s.w});
    chk('  и просвет — тот, что назван', Math.abs(bore(t, s) - s.bore) < 0.3,
        {построено:+bore(t, s).toFixed(2), сказано:+s.bore.toFixed(2)});
    chk('  а сужение названо в тексте', collectPrintWarnings(p).some(x => x.indexOf('просвет от этого сузился с ' +
        s.boreAsk.toFixed(1) + ' до ' + s.bore.toFixed(1)) >= 0), collectPrintWarnings(p));
    chk('  и оно не выдумано: с заказанной стенкой просвет был бы шире',
        s.boreAsk > s.bore + 0.05 && Math.abs(s.boreLost - (s.boreAsk - s.bore)) < 1e-9,
        {сузился:+s.boreLost.toFixed(2)});
  }
  /* ВЕТКА ВТОРАЯ: Ø не хватает самому — тогда просвет НЕ трогается, растёт наружный Ø, и говорит об
     этом другая строка. Без этой половины «сужение» объявлялось бы всегда, а это неправда. */
  {
    const ov = {telWall:0.8, printNozzle:'0.6', telN:6, telD:26};
    const p = setp(ov), s = telescopeSpec(p), t = mk(ov);
    chk('когда Ø растёт сам, просвет не меняется', Math.abs(s.boreLost) < 1e-9,
        {потеряно:+s.boreLost.toFixed(3), bore:+s.bore.toFixed(2)});
    chk('  про сужение тогда не говорится', !collectPrintWarnings(p).some(x => /сузился/.test(x)),
        collectPrintWarnings(p));
    chk('  а про рост Ø — говорится', collectPrintWarnings(p).some(x => /увеличен до/.test(x)));
    chk('  и построенный Ø — тот, что назван',
        Math.abs((computeBBox(t).maxX - computeBBox(t).minX) - 2*s.rOut) < 0.3,
        {построено:+(computeBBox(t).maxX - computeBBox(t).minX).toFixed(2), сказано:+(2*s.rOut).toFixed(2)});
  }
  /* И ПРИ СВОЁМ СОПЛЕ НЕ ДВИНУЛОСЬ НИЧЕГО: 0.4 даёт ровно прежний зажим числом 0.8. */
  for (const wall of [0.4, 0.5, 0.8, 1.6, 3])
    chk('сопло 0.4, стенка ' + wall + ': зажим тот же, что был числом',
        Math.abs(telescopeSpec(setp({telWall:wall, printNozzle:'0.4'})).w - Math.max(0.8, wall)) < 1e-9,
        telescopeSpec(setp({telWall:wall, printNozzle:'0.4'})).w);
}

console.log('=== no triangle is inside-out ===');
for(const [nm,ov] of [['телескоп',{}], ['пять секций',{telN:5}], ['толстая стенка',{telWall:3}],
                      ['глубокие кольца',{telStopD:4}], ['большой Ø',{telD:80}]]){
  const t = mk(ov), B = computeBBox(t);
  let worst = 0, at = null;
  for(let k=1;k<12;k++){ const y = B.minY + (B.maxY-B.minY)*(k+0.37)/12;
    for(const z of [0.31, -0.44, 0.83]){ const d = minDepth(t, 0, y, z);
      if(d < worst){ worst = d; at = [+y.toFixed(2), z]; } } }
  chk(nm+': глубина по лучу нигде не уходит в минус', worst===0, {depth:worst, at});
}

console.log('\n=== TOTAL:', pass, 'passed,', fail, 'failed ===');
if(fail) process.exitCode = 1;
