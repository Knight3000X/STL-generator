// Cycloidal reducer (циклоидальный редуктор): a disc with N−1 lobes rolling inside a ring of N pins on an
// eccentric. One stage gives N−1 : 1. The disc's outline is not drawn from a formula — it is ENVELOPED, the
// same way the worm wheel is cut: in the disc's own frame the pins trace a family of circles as the
// mechanism turns, and the profile is the largest radius none of them ever reaches.
//
// That choice is the thing these tests are really about. The textbook offset-hypotrochoid formula was tried
// first and measured WRONG — rollers sat 0.5 mm inside the disc at some phases, and no translation, ratio or
// sign fixed it. So the claim under test is not "the shape looks right" but "run the mechanism and nothing
// ever collides", which is the only claim that distinguishes the two. Run via ./run-all.sh.
let pass=0, fail=0;
function chk(n,c,e){if(c){pass++;console.log('  OK  ',n);}else{fail++;console.log('  FAIL',n,e!==undefined?JSON.stringify(e):'');}}
function vol(t){let v=0;for(const T of t){const a=T[0],b=T[1],c=T[2];v+=(a[0]*(b[1]*c[2]-b[2]*c[1])-a[1]*(b[0]*c[2]-b[2]*c[0])+a[2]*(b[0]*c[1]-b[1]*c[0]))/6;}return v;}
function mk(ov){ logos.length=0; boxHoles.length=0; dieFaces.length=0;
  Object.assign(paramState.box, defaultBoxParams(), {gfBaseplate:false, gearMode:'cycloidal'}, ov);
  return buildTrisForShape('box', paramState.box); }

console.log('=== builds, across the whole parameter range ===');
for(const N of [6,8,12,20,30,40])
  for(const D of [30,60,120]){
    const t = mk({cycPins:N, cycPinCircleD:D});
    const mc = manifoldCheck(t,4);
    chk('N='+N+' Ø'+D+': замкнуто', mc.watertight && vol(t)>0, {open:mc.openEdges, bad:mc.badEdges});
  }
for(const ov of [{cycPinD:2},{cycPinD:20},{cycEcc:0.2},{cycEcc:12},{cycThick:2},{cycThick:40},
                 {cycWall:1.6},{cycWall:12},{cycOutN:3},{cycOutN:10},{cycOutPinD:2},{cycOutPinD:20},
                 {gearBore:3},{gearBore:20},{cycPins:6,cycPinCircleD:20,cycPinD:2}]){
  const t = mk(ov);
  chk('крайние параметры '+JSON.stringify(ov)+': замкнуто', manifoldCheck(t,4).watertight && vol(t)>0, {});
}

console.log('=== the profile is what the ENVELOPE says, and the mechanism runs ===');
// The disc is driven round its full cycle against the fixed pins. At no phase may a pin reach inside the
// disc's outline — that is what "it rolls" means, and it is exactly what the formula failed.
function rollTest(N, R, Rr, E, NA, steps){
  const rad = cycloidDiscRadii(N, R, Rr, E, NA, Math.max(400, Math.min(1600, Math.round(3*NA/Math.max(3,N-1)))));
  const P = []; for(let i=0;i<NA;i++){ const a=2*Math.PI*i/NA; P.push([rad[i]*Math.cos(a), rad[i]*Math.sin(a)]); }
  let worst = -Infinity;
  for(let s=0;s<steps;s++){
    const th = 2*Math.PI*s/steps, phi = -th/(N-1), c = Math.cos(phi), sn = Math.sin(phi);
    const D = P.map(q=>[q[0]*c - q[1]*sn + E*Math.cos(th), q[0]*sn + q[1]*c + E*Math.sin(th)]);
    for(let k=0;k<N;k++){ const a = 2*Math.PI*k/N, px = R*Math.cos(a), py = R*Math.sin(a);
      let dm = Infinity; for(const q of D){ const d = Math.hypot(q[0]-px, q[1]-py); if(d<dm) dm = d; }
      if(Rr - dm > worst) worst = Rr - dm; }
  }
  return {worst, rad};
}
for(const [N,R,Rr,E] of [[12,30,3,0.9],[8,20,2,1.2],[16,40,3,1.0],[20,45,3,1.2],[24,50,3,1.5],
                         [10,25,2.5,1.0],[30,60,3,1.0],[12,30,3,3.0],[6,15,1.5,0.8]]){
  const r = rollTest(N,R,Rr,E,1440,96);
  chk('N='+N+' R='+R+' E='+E+': прокатывается без захода роликов', r.worst < 0.03,
      {заход:+r.worst.toFixed(4)});
  let lobes=0; for(let i=0;i<r.rad.length;i++){
    const a=r.rad[(i-1+r.rad.length)%r.rad.length], b=r.rad[i], c=r.rad[(i+1)%r.rad.length];
    if(b>a && b>=c) lobes++; }
  chk('N='+N+': лепестков ровно N−1 = '+(N-1), lobes === N-1, {lobes});
}
{ // The lobes ARE the eccentricity: their depth is 2·E and the disc sits about R−Rr. Both fall out of the
  // envelope rather than being drawn, so measuring them is a real check on it.
  for(const E of [0.5, 1.0, 2.0, 3.0]){
    const rad = cycloidDiscRadii(12, 30, 3, E, 1440, 400);
    const depth = Math.max(...rad) - Math.min(...rad);
    chk('E='+E+': глубина лепестка = 2·E', Math.abs(depth - 2*E) < 0.06, {depth:+depth.toFixed(3)});
  }
}
{ // Star-shaped by construction: it IS a radius per angle, so the undercut that folds a drawn cycloidal
  // profile through itself cannot arise. Checked at an eccentricity that folds the formula outright.
  const rad = cycloidDiscRadii(12, 30, 3, 5, 1440, 400);
  chk('даже при огромном эксцентриситете радиус остаётся положительным и однозначным',
      [...rad].every(r => r > 0.5 && Number.isFinite(r)), {min:+Math.min(...rad).toFixed(2)});
}

console.log('=== four parts, laid out to print, none touching ===');
{ const t = mk({}), comps = meshComponents(t);
  chk('модель распадается на отдельные тела', comps.length >= 4, {n:comps.length});
  const B = computeBBox(t);
  chk('разложено в ряд по X, а не стопкой', (B.maxX-B.minX) > 3*(B.maxY-B.minY), 
      {x:+(B.maxX-B.minX).toFixed(1), y:+(B.maxY-B.minY).toFixed(1)});
}
{ // Every part must stand clear of its neighbours on the bed, or they print fused.
  const t = mk({});
  const xs = t.map(T => (T[0][0]+T[1][0]+T[2][0])/3).sort((a,b)=>a-b);
  let gaps = 0; for(let i=1;i<xs.length;i++) if(xs[i]-xs[i-1] > 2) gaps++;
  chk('между деталями есть просветы', gaps >= 3, {gaps});
}
{ // The ring has to swallow the disc, and the pins have to reach in past its tip — otherwise there is a
  // ring and a disc but no engagement.
  const N=12, R=30, Rr=3, E=0.9;
  const rad = cycloidDiscRadii(N,R,Rr,E,720,400);
  chk('вершина диска заходит за внутреннюю кромку роликов', Math.max(...rad) > R - Rr,
      {tip:+Math.max(...rad).toFixed(2), pinInner:+(R-Rr).toFixed(2)});
  chk('и впадина диска не глубже, чем нужно', Math.min(...rad) > R - Rr - 2*E - 0.05,
      {root:+Math.min(...rad).toFixed(2)});
}

console.log('=== the option does not leak into the other gear modes ===');
for(const m of ['spur','helical','worm','wormwheel','planetary','ratchet','cam'])
  chk(m+' игнорирует параметры циклоидального',
      Math.abs(vol(mk({gearMode:m, cycPins:30, cycEcc:4})) - vol(mk({gearMode:m}))) < 1e-9, {});

console.log('\n=== TOTAL:', pass, 'passed,', fail, 'failed ===');
if(fail) process.exitCode = 1;
