// Assembly preview: the mating part, built from the same parameters and placed where it would sit.
// The claims worth testing are not "a second model appeared" but geometric ones — the pair actually
// ENGAGES (their extents overlap along the mating axis, so nothing floats apart), and it does not
// interfere beyond the clearance the joint was designed with. Both are measured on the real meshes.
// Run via ./run-all.sh.
let pass=0, fail=0;
function chk(n,c,e){if(c){pass++;console.log('  OK  ',n);}else{fail++;console.log('  FAIL',n,e!==undefined?JSON.stringify(e):'');}}
// gfBaseplate is NOT in SHAPE_PARAMS, so defaultBoxParams() does not carry it and a plain reset leaves
// a previous `true` in place — which quietly made every later case look like a Gridfinity baseplate.
// Cleared explicitly here rather than left as a trap for the next test that touches it.
function setp(ov){ logos.length=0; boxHoles.length=0; dieFaces.length=0;
  Object.assign(paramState.box, defaultBoxParams(), {gfBaseplate:false}, ov); return paramState.box; }

// Is q inside the solid A? Depth counting along +X over the crossings AHEAD of q only — so an interior
// point sees nothing but EXITS, each of them a face whose normal agrees with the ray, and the sum comes
// out at minus the number of shells containing it. Hence `< 0`, not `> 0`. (Getting this backwards is
// easy and silent: every point then reads "outside" and the test passes by measuring nothing.) Depth
// counting rather than parity because these are unions of interpenetrating shells, where a ray sees
// enter/enter/leave/leave and parity would call the inside of an overlap hollow.
function insideDepth(A, q0){
  // Nudged off the lattice before casting. Where the mate is an exact TRANSLATE of the part (a gear
  // with an odd tooth count needs no phase turn, so it is), a +X ray leaving a vertex runs straight
  // through the mate's corresponding vertices and every one of those degenerate hits is counted twice
  // — which reported 347 phantom interior points on a pair that is not touching. Two ten-thousandths
  // of a millimetre of jitter, well under any tolerance being measured, breaks the alignment.
  const q=[q0[0], q0[1]+1.7e-4, q0[2]+2.3e-4];
  let d=0;
  for(const T of A){ const [a,b,c]=T;
    const d1=(b[1]-a[1])*(q[2]-a[2])-(b[2]-a[2])*(q[1]-a[1]);
    const d2=(c[1]-b[1])*(q[2]-b[2])-(c[2]-b[2])*(q[1]-b[1]);
    const d3=(a[1]-c[1])*(q[2]-c[2])-(a[2]-c[2])*(q[1]-c[1]);
    if(!((d1>=0&&d2>=0&&d3>=0)||(d1<=0&&d2<=0&&d3<=0))) continue;
    const Ar=(b[1]-a[1])*(c[2]-a[2])-(b[2]-a[2])*(c[1]-a[1]); if(Math.abs(Ar)<1e-12) continue;
    const w1=((b[1]-q[1])*(c[2]-q[2])-(b[2]-q[2])*(c[1]-q[1]))/Ar, w2=((c[1]-q[1])*(a[2]-q[2])-(c[2]-q[2])*(a[1]-q[1]))/Ar;
    const x=w1*a[0]+w2*b[0]+(1-w1-w2)*c[0]; if(x < q[0]) continue;
    const e1=[b[0]-a[0],b[1]-a[1],b[2]-a[2]], e2=[c[0]-a[0],c[1]-a[1],c[2]-a[2]];
    const nx=e1[1]*e2[2]-e1[2]*e2[1]; if(Math.abs(nx)<1e-12) continue;
    d += nx<0 ? 1 : -1; }
  return d<0;
}
// Do two meshes actually PASS THROUGH each other? Möller's triangle-triangle overlap, restricted by an
// AABB pre-filter to the triangles that could possibly meet. A shared point or edge is contact and does
// not count — only an interval of genuine crossing does, which is the distinction that matters here:
// these profiles are drawn with no backlash, so mating flanks are SUPPOSED to touch.
//
// This replaced a point-sampling probe that could not be trusted. That one reported hundreds of
// "interior" points on gear pairs, and gave the same count at +0 and at +1.0 mm of extra centre
// distance — which real interference cannot do. The answer it was hiding turns out to be zero.
function triTriOverlap(A,B){
  const sub=(u,v)=>[u[0]-v[0],u[1]-v[1],u[2]-v[2]], dot=(u,v)=>u[0]*v[0]+u[1]*v[1]+u[2]*v[2];
  const cr=(u,v)=>[u[1]*v[2]-u[2]*v[1],u[2]*v[0]-u[0]*v[2],u[0]*v[1]-u[1]*v[0]];
  const EPS=1e-9;
  const N1=cr(sub(A[1],A[0]),sub(A[2],A[0])), d1=-dot(N1,A[0]);
  const dB=B.map(q=>dot(N1,q)+d1);
  if((dB[0]>EPS&&dB[1]>EPS&&dB[2]>EPS)||(dB[0]<-EPS&&dB[1]<-EPS&&dB[2]<-EPS)) return false;
  const N2=cr(sub(B[1],B[0]),sub(B[2],B[0])), d2=-dot(N2,B[0]);
  const dA=A.map(q=>dot(N2,q)+d2);
  if((dA[0]>EPS&&dA[1]>EPS&&dA[2]>EPS)||(dA[0]<-EPS&&dA[1]<-EPS&&dA[2]<-EPS)) return false;
  const D=cr(N1,N2), aD=[Math.abs(D[0]),Math.abs(D[1]),Math.abs(D[2])];
  if(Math.max(...aD) < 1e-12) return false;       // coplanar — touching, not passing through
  const idx=aD.indexOf(Math.max(...aD));
  const interval=(T,d)=>{ const q=T.map(v=>v[idx]), out=[];
    for(let i=0;i<3;i++){ const j=(i+1)%3;
      if(d[i]*d[j]<0){ const t=d[i]/(d[i]-d[j]); out.push(q[i]+(q[j]-q[i])*t); }
      if(Math.abs(d[i])<=EPS) out.push(q[i]); }
    return out.length<2 ? null : [Math.min(...out), Math.max(...out)]; };
  const i1=interval(A,dA), i2=interval(B,dB);
  if(!i1||!i2) return false;
  return (Math.min(i1[1],i2[1]) - Math.max(i1[0],i2[0])) > 1e-6;
}
function triBBox(T){ const lo=[1e30,1e30,1e30], hi=[-1e30,-1e30,-1e30];
  for(const v of T) for(let a=0;a<3;a++){ if(v[a]<lo[a])lo[a]=v[a]; if(v[a]>hi[a])hi[a]=v[a]; } return {lo,hi}; }
// Triangle pairs that genuinely cross. The second mesh goes into a uniform grid first — all-pairs box
// testing is 10 million comparisons on a gear pair and made this file the slowest in the battery.
function crossings(M1, M2){
  const B2 = M2.map(triBBox);
  let lo=[1e30,1e30,1e30], hi=[-1e30,-1e30,-1e30];
  for(const b of B2) for(let a=0;a<3;a++){ if(b.lo[a]<lo[a])lo[a]=b.lo[a]; if(b.hi[a]>hi[a])hi[a]=b.hi[a]; }
  const span = Math.max(hi[0]-lo[0], hi[1]-lo[1], hi[2]-lo[2], 1e-6);
  const cell = Math.max(span/40, 1e-6);
  const grid = new Map();
  const key = (i,j,k) => i+','+j+','+k;
  const cellsOf = (b, fn) => {
    const i0=Math.floor((b.lo[0]-lo[0])/cell), i1=Math.floor((b.hi[0]-lo[0])/cell);
    const j0=Math.floor((b.lo[1]-lo[1])/cell), j1=Math.floor((b.hi[1]-lo[1])/cell);
    const k0=Math.floor((b.lo[2]-lo[2])/cell), k1=Math.floor((b.hi[2]-lo[2])/cell);
    for(let i=i0;i<=i1;i++) for(let j=j0;j<=j1;j++) for(let k=k0;k<=k1;k++) fn(key(i,j,k));
  };
  for(let j=0;j<M2.length;j++) cellsOf(B2[j], k => { let a=grid.get(k); if(!a){a=[];grid.set(k,a);} a.push(j); });
  let n=0, pairs=0;
  for(const T of M1){
    const b = triBBox(T);
    if(b.hi[0]<lo[0]||b.lo[0]>hi[0]||b.hi[1]<lo[1]||b.lo[1]>hi[1]||b.hi[2]<lo[2]||b.lo[2]>hi[2]) continue;
    const seen = new Set();
    cellsOf(b, k => { const a=grid.get(k); if(!a) return;
      for(const j of a){ if(seen.has(j)) continue; seen.add(j);
        if(b.lo[0]>B2[j].hi[0]||B2[j].lo[0]>b.hi[0]) continue;
        if(b.lo[1]>B2[j].hi[1]||B2[j].lo[1]>b.hi[1]) continue;
        if(b.lo[2]>B2[j].hi[2]||B2[j].lo[2]>b.hi[2]) continue;
        pairs++; if(triTriOverlap(T, M2[j])) n++; } });
  }
  return {n, pairs};
}
function placed(p){
  const plan = assemblyPlacement(p, null); if(!plan) return null;
  plan.world = plan.tris.map(T=>T.map(v=>[v[0]+plan.px, v[1]+plan.py, v[2]+plan.pz]));
  return plan;
}

const CASES = {
  'крышка → банка':  {threadMode:'cap',  threadD:30, threadPitch:3,    threadLen:16, mate:'Банка',             axis:1},
  'банка → крышка':  {threadMode:'jar',  threadD:30, threadPitch:3,    threadLen:16, mate:'Крышка',            axis:1},
  'болт → гайка':    {threadMode:'bolt', threadD:12, threadPitch:1.75, threadLen:25, mate:'Гайка',             axis:1},
  'гайка → болт':    {threadMode:'nut',  threadD:12, threadPitch:1.75, threadLen:25, mate:'Болт',              axis:1},
  'штуцер → гайка':  {threadMode:'stud', threadD:16, threadPitch:2,    threadLen:14, mate:'Гайка',             axis:1},
  'ввод → гайка':    {threadMode:'gland',threadD:16, threadPitch:2,    threadLen:14, mate:'Гайка',             axis:1},
  'шестерня Z20':    {gearMode:'spur', gearModule:2, gearTeeth:20, gearThick:6, mate:'Ответная шестерня',      axis:0},
  'шестерня Z21':    {gearMode:'spur', gearModule:2, gearTeeth:21, gearThick:6, mate:'Ответная шестерня',      axis:0},
  'червяк → колесо': {gearMode:'worm', gearModule:2, gearTeeth:20, mate:'Червячное колесо',                    axis:0},
  'колесо → червяк': {gearMode:'wormwheel', gearModule:2, gearTeeth:20, mate:'Червяк',                         axis:0},
};

console.log('=== the right mate, and none invented where there is none ===');
for(const [nm, cfg] of Object.entries(CASES)){
  const spec = assemblyMate(setp(cfg));
  chk(nm+': пара найдена и названа верно', spec && spec.name===cfg.mate, {got: spec && spec.name});
}
for(const ov of [{}, {hollow:true}, {polyN:6}, {platonic:'d6'}, {sheetShape:'rect'},
                 {mntMode:'lbracket'}, {gearMode:'rack'},
                 {gearMode:'cam'}, {threadMode:'anchor'}, {threadMode:'wingnut'}]){
  chk('без пары: '+JSON.stringify(ov)+' → null', assemblyMate(setp(ov)) === null, {});
}

console.log('=== the mate is a real part, built from the same parameters ===');
for(const [nm, cfg] of Object.entries(CASES)){
  const p = setp(cfg), plan = placed(p);
  chk(nm+': ответная деталь замкнута', plan && manifoldCheck(plan.tris,4).watertight,
      plan ? manifoldCheck(plan.tris,4) : null);
  chk(nm+': унаследовала параметры, но не логотипы',
      plan && plan.params.threadD===p.threadD && plan.params.gearModule===p.gearModule, {});
}

console.log('=== the pair ENGAGES: the two overlap along the mating axis ===');
// Nothing here may float apart. A cap that merely hovers over its jar is not an assembly preview.
for(const [nm, cfg] of Object.entries(CASES)){
  const p = setp(cfg), self = buildTrisForShape('box', p), plan = placed(p);
  const A = computeBBox(self), B = computeBBox(plan.world);
  const lo = ['minX','minY','minZ'][cfg.axis], hi = ['maxX','maxY','maxZ'][cfg.axis];
  const ov = Math.min(A[hi], B[hi]) - Math.max(A[lo], B[lo]);
  chk(nm+': детали заходят друг в друга по оси '+'XYZ'[cfg.axis], ov > 0.5, {overlap:+ov.toFixed(2)});
  // ...and they are CONCENTRIC / in line on the axes that are not the mating one
  for(const k of [0,1,2]) if(k !== cfg.axis){
    const l=['minX','minY','minZ'][k], h=['maxX','maxY','maxZ'][k];
    const cA=(A[l]+A[h])/2, cB=(B[l]+B[h])/2;
    chk(nm+': соосны по '+'XYZ'[k], Math.abs(cA-cB) < 1.0, {d:+(cA-cB).toFixed(2)});
  }
}

console.log('=== no pair passes through itself ===');
// Every pair, measured triangle against triangle. Contact is allowed and expected — these profiles
// carry no backlash, so a mating flank, a cap rim on a shoulder and a bin's foot in its socket all
// touch by design. What is checked is that neither part CROSSES into the other.
//
// Nothing is left out any more. The worm pair used to be — 299 crossing pairs at best over twelve
// timings and both rim types, because a wheel drawn with involute teeth is not conjugate to a screw —
// and it now holds the same bar as everything else, on a rim cut by enveloping the worm.
for(const [nm, cfg] of Object.entries(CASES)){
  const p = setp(cfg), self = buildTrisForShape('box', p), plan = placed(p);
  const r = crossings(self, plan.world);
  chk(nm+': детали не проходят сквозь друг друга', r.n === 0, {crossings:r.n, tested:r.pairs});
}

console.log('=== the pipe a collar clips to ===');
// The one pair whose datum could not be read off a bounding box: buildHook builds the collar at the
// origin of its own frame and then maps the whole clip by (x,y,z)→(z,y,−x), so the bore centre stays
// at the origin with its axis along Z. That is the builder publishing the number, not the preview
// guessing it. The pipe is a REFERENCE part — a frozen mesh, not a parametric model.
for(const D of [16, 25, 40]){
  const p = setp({hookMount:'pipe', hookPipeD:D});
  const spec = assemblyMate(p);
  chk('Ø'+D+': пара — труба', spec && spec.name === 'Труба (образец)', {got: spec && spec.name});
  const plan = placed(p);
  chk('Ø'+D+': труба замкнута', manifoldCheck(plan.tris,4).watertight, manifoldCheck(plan.tris,4));
  chk('Ø'+D+': отдана геометрией, а не параметрами', !!plan.frozenTris, {});
  const B = computeBBox(plan.world);
  // drawn a fit clearance under nominal — see the note in assemblyMate
  chk('Ø'+D+': диаметр — заказанный минус посадочный зазор',
      (B.maxX-B.minX) < D && (B.maxX-B.minX) > D-1.0, {got:+(B.maxX-B.minX).toFixed(2), nominal:D});
  chk('Ø'+D+': ось идёт по Z', (B.maxZ-B.minZ) > (B.maxX-B.minX)*1.4, {z:+(B.maxZ-B.minZ).toFixed(1)});
  // buildHook recentres its output on the bounding box, so the bore is NOT at the origin — it
  // publishes where it ended up. Assuming the origin here is exactly the mistake that produced a
  // phantom "the hook sits in its own pipe" defect.
  // Tolerance, not equality: the tube is a polygon and its facet count comes out odd at some radii,
  // so its bounding box is not centred on its own axis. A hundredth of a millimetre is facet noise;
  // the misplacement this guards against was ten to thirty MILLIMETRES.
  chk('Ø'+D+': соосна расточке хомута (по опубликованному датуму)',
      hookPipeDatum && Math.abs((B.minX+B.maxX)/2 - hookPipeDatum.x) < 0.05 &&
      Math.abs((B.minY+B.maxY)/2 - hookPipeDatum.y) < 0.05,
      {centre:[(B.minX+B.maxX)/2, (B.minY+B.maxY)/2], datum:hookPipeDatum});
  chk('Ø'+D+': и датум действительно не в начале координат',
      hookPipeDatum && (Math.abs(hookPipeDatum.x) > 0.5 || Math.abs(hookPipeDatum.y) > 0.5), hookPipeDatum);
  // the collar grips the pipe: its bore is drawn AT the pipe radius, so they touch — but the pipe may
  // not sink into the clip's material any deeper than that contact
  const self = buildTrisForShape('box', p);
  const r = crossings(self, plan.world);
  chk('Ø'+D+': труба не проходит сквозь крючок', r.n === 0, {crossings:r.n, tested:r.pairs});
}
{ const wall = setp({hookMount:'wall'});
  chk('крючок на стену трубы не просит', assemblyMate(wall) === null, {}); }

console.log('=== enclosure tray + lid, and Gridfinity bin + baseplate ===');
// The other two pairs whose datum lives inside the builder. The tray's geometry runs y = 0 (floor
// underside) to y = H (wall top), so its wall top is its maxY; the lid is a plate centred on y = 0
// with a drop-in rib reaching lipH below it, so the face that SEATS is lipH above its lowest point.
// The baseplate cuts its sockets 4.75 mm down from the top, which is exactly how far a bin's feet go.
{ const H = 30, lipH = 5;
  for(const [nm, ov, mate] of [['лоток', {pbPart:'tray', pbW:80, pbD:60, pbH:H, pbLipH:lipH}, 'Крышка корпуса'],
                               ['крышка',{pbPart:'lid',  pbW:80, pbD:60, pbH:H, pbLipH:lipH}, 'Лоток корпуса']]){
    const p = setp(ov), self = buildTrisForShape('box', p), plan = placed(p);
    chk(nm+': пара — '+mate, plan && plan.name === mate, {got: plan && plan.name});
    const A = computeBBox(self), B = computeBBox(plan.world);
    const ovl = Math.min(A.maxY,B.maxY) - Math.max(A.minY,B.minY);
    chk(nm+': борт заходит ровно на его высоту ('+lipH+' мм)', Math.abs(ovl - lipH) < 0.05, {overlap:+ovl.toFixed(2)});
    chk(nm+': ответная замкнута', manifoldCheck(plan.tris,4).watertight, {});
    chk(nm+': и они соосны', Math.abs((A.minX+A.maxX)/2-(B.minX+B.maxX)/2) < 0.01 &&
        Math.abs((A.minZ+A.maxZ)/2-(B.minZ+B.maxZ)/2) < 0.01, {});
  }
  // the rib's depth follows its own parameter, so the seating must follow it too
  for(const lp of [3, 8, 12]){
    const p = setp({pbPart:'tray', pbW:80, pbD:60, pbH:H, pbLipH:lp}), plan = placed(p);
    const A = computeBBox(buildTrisForShape('box', p)), B = computeBBox(plan.world);
    const ovl = Math.min(A.maxY,B.maxY) - Math.max(A.minY,B.minY);
    chk('борт '+lp+' мм: посадка идёт за ним', Math.abs(ovl - lp) < 0.05, {overlap:+ovl.toFixed(2)});
  }
}
for(const [nm, ov, mate] of [['бин',  {gfOn:true, gfX:2, gfY:1},      'Gridfinity плита'],
                             ['плита',{gfBaseplate:true, gfX:2, gfY:1},'Gridfinity бин']]){
  const p = setp(ov), self = buildTrisForShape('box', p), plan = placed(p);
  chk(nm+': пара — '+mate, plan && plan.name === mate, {got: plan && plan.name});
  const A = computeBBox(self), B = computeBBox(plan.world);
  const ovl = Math.min(A.maxY,B.maxY) - Math.max(A.minY,B.minY);
  chk(nm+': ножка садится ровно на дно гнезда (4.75 мм)', Math.abs(ovl - 4.75) < 0.05, {overlap:+ovl.toFixed(2)});
  chk(nm+': ответная замкнута', manifoldCheck(plan.tris,4).watertight, {});
}
{ const both = setp({pbPart:'both', pbW:80, pbD:60, pbH:30});
  chk('«лоток + крышка» пары не просит — она уже целиком', assemblyMate(both) === null, {}); }

console.log('=== the gear pair is set out by the textbook, not by eye ===');
for(const Z of [12, 20, 21, 30, 31]){
  const m = 2, p = setp({gearMode:'spur', gearModule:m, gearTeeth:Z, gearThick:6});
  const plan = placed(p), self = computeBBox(buildTrisForShape('box', p)), B = computeBBox(plan.world);
  const a = (B.minX+B.maxX)/2 - (self.minX+self.maxX)/2;
  chk('Z='+Z+': межосевое = m·(Z₁+Z₂)/2 = '+(m*Z), Math.abs(a - m*Z) < 1e-6, {a:+a.toFixed(3)});
  // a tooth sits at angle 0 on every gear, so the mate must show a GAP at its own 180° — which is a
  // tooth centre exactly when its tooth count is even
  chk('Z='+Z+': фаза '+(Z%2===0 ? 'полшага (чётное)' : 'ноль (нечётное)'),
      Math.abs((plan.ry||0) - (Z%2===0 ? 180/Z : 0)) < 1e-9, {ry:plan.ry});
  // and they really mesh: the tip circles overlap
  const Ra = m*(Z+2)/2;
  chk('Z='+Z+': вершины заходят за межосевое', 2*Ra - a > 0.5, {reach:+(2*Ra-a).toFixed(2)});
}
{ // module scales the whole layout
  const a1 = (()=>{ const p=setp({gearMode:'spur',gearModule:1,gearTeeth:20}); const pl=placed(p);
    return pl.px; })();
  const a3 = (()=>{ const p=setp({gearMode:'spur',gearModule:3,gearTeeth:20}); const pl=placed(p);
    return pl.px; })();
  chk('модуль масштабирует межосевое ровно втрое', Math.abs(a3 - 3*a1) < 1e-6, {a1:+a1.toFixed(2), a3:+a3.toFixed(2)}); }

console.log('=== the worm drive crosses at a right angle ===');
for(const cfg of [{gearMode:'worm', gearModule:2, gearTeeth:20}, {gearMode:'wormwheel', gearModule:2, gearTeeth:20}]){
  const p = setp(cfg), plan = placed(p);
  chk(cfg.gearMode+': ответная положена на бок (оси перпендикулярны)', Math.abs(plan.rx) === 90, {rx:plan.rx});
  const self = computeBBox(buildTrisForShape('box', p)), B = computeBBox(plan.world);
  const a = (B.minX+B.maxX)/2 - (self.minX+self.maxX)/2;
  // An enveloped wheel is chiral: which side of the worm it sits on and which way up are fixed by the
  // cut, not free. The magnitude is the centre distance either way.
  chk(cfg.gearMode+': межосевое = сумма делительных радиусов', Math.abs(Math.abs(a) - 26) < 0.6, {a:+a.toFixed(2)});
}

console.log('=== and the worm pair actually TURNS ===');
// The static check above says the two do not overlap where the preview puts them. That is necessary and
// not sufficient: a pair can be clear in one pose and bind in the next. Here they are driven — the worm
// turned about its own axis by ψ, the wheel about its own by hand·starts/teeth·ψ, right round — and the
// interference is measured at every station. Zero throughout is what makes it a gear pair rather than
// two parts that happen to miss each other once.
//
// The coupling's SIGN is not a free choice and the reverse run proves it: driven the other way the same
// two solids grind through each other by the hundreds. Were the sign arbitrary, both would read zero.
{ const p = setp({gearMode:'wormwheel', gearModule:2, gearTeeth:20, gearThick:10});
  const wheel = buildTrisForShape('box', p), worm = placed(p).world;
  const S = 1, Z = 20, hand = 1, k = hand*S/Z, C = wormCentreDist(p);
  const spinWheel = (T,f) => T.map(v=>[v[0]*Math.cos(f)+v[2]*Math.sin(f), v[1], -v[0]*Math.sin(f)+v[2]*Math.cos(f)]);
  const spinWorm = (T,psi) => T.map(v=>{ const x=v[0]-C, z=-v[1], a=Math.atan2(z,x)+psi, r=Math.hypot(x,z);
    return [C + r*Math.cos(a), -r*Math.sin(a), v[2]]; });
  const run = (sign)=>{ let worst=0, at=null;
    for(let s=0;s<16;s++){ const psi=2*Math.PI*s/16/S;
      const n = crossings(wheel.map(T=>spinWheel(T, sign*k*psi)), worm.map(T=>spinWorm(T, psi))).n;
      if(n>worst){ worst=n; at=+(psi*180/Math.PI).toFixed(0); } }
    return {worst, at}; };
  const fwd = run(1), rev = run(-1);
  chk('червячная пара прокручивается на полный оборот без задевания', fwd.worst === 0, fwd);
  chk('а в обратной связке — заклинивает (знак передачи не произволен)', rev.worst > 50, rev); }

console.log('=== the active model is not disturbed ===');
{ const p = setp({threadMode:'cap', threadD:30, threadPitch:3, threadLen:16});
  const before = buildTrisForShape('box', p).length;
  placed(p);
  chk('построение пары не меняет активную деталь',
      buildTrisForShape('box', paramState.box).length === before && paramState.box.threadMode === 'cap',
      {mode: paramState.box.threadMode}); }
{ const p = setp({threadMode:'cap', threadD:30}), self = {rx:0,ry:0,rz:0, px:17, py:-4, pz:9};
  const a = assemblyPlacement(setp({threadMode:'cap', threadD:30}), null);
  const b = assemblyPlacement(setp({threadMode:'cap', threadD:30}), self);
  chk('пара следует за смещением активной модели',
      Math.abs(b.px-a.px-17)<1e-9 && Math.abs(b.py-a.py+4)<1e-9 && Math.abs(b.pz-a.pz-9)<1e-9,
      {a:[a.px,a.py,a.pz], b:[b.px,b.py,b.pz]}); }

console.log('\n'+(fail?'FAILED':'ALL PASSED')+': '+pass+' passed, '+fail+' failed');
if(fail) process.exitCode=1;
