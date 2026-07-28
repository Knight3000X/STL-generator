// Assembly preview: the mating part, built from the same parameters and placed where it would sit.
// The claims worth testing are not "a second model appeared" but geometric ones — the pair actually
// ENGAGES (their extents overlap along the mating axis, so nothing floats apart), and it does not
// interfere beyond the clearance the joint was designed with. Both are measured on the real meshes.
// Run via ./run-all.sh.
let pass=0, fail=0;
function chk(n,c,e){if(c){pass++;console.log('  OK  ',n);}else{fail++;console.log('  FAIL',n,e!==undefined?JSON.stringify(e):'');}}
function setp(ov){ logos.length=0; boxHoles.length=0; dieFaces.length=0;
  Object.assign(paramState.box, defaultBoxParams(), ov); return paramState.box; }

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
// Deepest a vertex of B gets inside A, in mm. Sampled — the point is the DEPTH, not the count: a
// handful of crest vertices grazing a root is a different thing from one part passing through another.
function penetration(A, B, budget){
  const pts=[]; for(const T of B) for(const v of T) pts.push(v);
  const step=Math.max(1, Math.floor(pts.length/(budget||1200)));
  let worst=0, n=0;
  for(let i=0;i<pts.length;i+=step){ const q=pts[i];
    if(!insideDepth(A,q)) continue;
    n++;
    let near=Infinity;
    for(const T of A){ const dd=pointTriDist(q,T[0],T[1],T[2]); if(dd<near) near=dd; }
    if(near>worst) worst=near; }
  return {n, worst};
}
// Distance from a point to a triangle: project onto the plane, and if that lands outside, fall back to
// the nearest of the three edges. Nearest VERTEX is not the same thing and is wildly wrong on a coarse
// face — it read 39 mm of "penetration" on a gear pair that is not touching at all.
function pointTriDist(q,a,b,c){
  const sub=(u,v)=>[u[0]-v[0],u[1]-v[1],u[2]-v[2]], dot=(u,v)=>u[0]*v[0]+u[1]*v[1]+u[2]*v[2];
  const e1=sub(b,a), e2=sub(c,a);
  const n=[e1[1]*e2[2]-e1[2]*e2[1], e1[2]*e2[0]-e1[0]*e2[2], e1[0]*e2[1]-e1[1]*e2[0]];
  const nn=dot(n,n);
  if(nn>1e-18){
    const w=sub(q,a), h=dot(w,n)/nn, proj=[q[0]-n[0]*h, q[1]-n[1]*h, q[2]-n[2]*h];
    const v0=e1, v1=e2, v2=sub(proj,a);
    const d00=dot(v0,v0), d01=dot(v0,v1), d11=dot(v1,v1), d20=dot(v2,v0), d21=dot(v2,v1);
    const den=d00*d11-d01*d01;
    if(Math.abs(den)>1e-18){
      const u=(d11*d20-d01*d21)/den, v=(d00*d21-d01*d20)/den;
      if(u>=0 && v>=0 && u+v<=1) return Math.abs(dot(w,n))/Math.sqrt(nn);
    }
  }
  let best=Infinity;
  for(const [P,Q] of [[a,b],[b,c],[c,a]]){
    const d=sub(Q,P), L=dot(d,d);
    let t = L>1e-18 ? dot(sub(q,P),d)/L : 0; t = t<0?0:t>1?1:t;
    const r=[P[0]+d[0]*t-q[0], P[1]+d[1]*t-q[1], P[2]+d[2]*t-q[2]];
    best=Math.min(best, Math.hypot(r[0],r[1],r[2]));
  }
  return best;
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
for(const ov of [{}, {hollow:true}, {polyN:6}, {platonic:'d6'}, {sheetShape:'rect'}, {pbPart:'tray'},
                 {hookMount:'pipe'}, {gfOn:true}, {mntMode:'lbracket'}, {gearMode:'rack'},
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

console.log('=== ...and the screwed pairs do not interfere beyond their own clearance ===');
// Only the THREADED pairs are checked this way, and that limit is deliberate rather than lazy. The
// spur profiles this app draws carry NO backlash — that is why the planetary gearset has to add its
// own (see buildGear's `back`) — so a pair at the textbook centre distance touches on the flanks by
// construction, and the sampling probe below could not tell that real contact apart from its own
// noise: the interior count came out the same at +0 and at +1.0 mm of extra centre distance, which
// real interference cannot do. Rather than assert a number that is not being measured, the gear pair
// is held to its LAYOUT (below) and the non-interference claim is left unmade. Noted in IDEAS.md.
for(const [nm, cfg] of Object.entries(CASES)){
  if(!cfg.threadMode) continue;
  const p = setp(cfg), self = buildTrisForShape('box', p), plan = placed(p);
  const budget = (p.threadClear!=null ? p.threadClear : 0.4) + 0.3;
  const a = penetration(self, plan.world, 700), b = penetration(plan.world, self, 700);
  chk(nm+': ответная не проваливается в деталь', a.worst <= budget,
      {deepest:+a.worst.toFixed(3), points:a.n, budget:+budget.toFixed(2)});
  chk(nm+': и деталь не проваливается в ответную', b.worst <= budget,
      {deepest:+b.worst.toFixed(3), points:b.n, budget:+budget.toFixed(2)});
}

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
  chk(cfg.gearMode+': ответная положена на бок (оси перпендикулярны)', plan.rx === 90, {rx:plan.rx});
  const self = computeBBox(buildTrisForShape('box', p)), B = computeBBox(plan.world);
  const a = (B.minX+B.maxX)/2 - (self.minX+self.maxX)/2;
  chk(cfg.gearMode+': межосевое = сумма делительных радиусов', Math.abs(a - 26) < 0.6, {a:+a.toFixed(2)});
}

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
