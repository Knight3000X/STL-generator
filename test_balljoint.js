// Шаровой шарнир, печатный в сборе. The ball is not snapped in afterwards — it is printed already inside
// the socket, and it is captive because the mouth is narrower than the ball. Nothing flexes, nothing is
// assembled, and there are no slits weakening the cup.
//
// That makes the claims sharp and physical: the two must NEVER touch (or the print fuses into one lump),
// the gap between them must be the ordered one all the way round (or it binds on one side and rattles on
// the other), and the mouth must be narrower than the ball (or the whole thing falls apart in the hand).
// All three are read off the built mesh. Run via ./run-all.sh.
let pass=0, fail=0;
function chk(n,c,e){if(c){pass++;console.log('  OK  ',n);}else{fail++;console.log('  FAIL',n,e!==undefined?JSON.stringify(e):'');}}
function vol(t){let v=0;for(const T of t){const a=T[0],b=T[1],c=T[2];v+=(a[0]*(b[1]*c[2]-b[2]*c[1])-a[1]*(b[0]*c[2]-b[2]*c[0])+a[2]*(b[0]*c[1]-b[1]*c[0]))/6;}return v;}
function setp(ov){ logos.length=0; boxHoles.length=0; dieFaces.length=0;
  Object.assign(paramState.box, defaultBoxParams(), {gfBaseplate:false, pipMode:'ball',
    ballD:16, ballGap:0.35, ballWall:2.4, ballMouth:125, ballStemD:0, ballStem:0,
    ballBaseR:0, ballBaseT:3}, ov);
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
// Möller triangle-triangle overlap + an AABB pre-filter — contact is a printed weld, so zero is the bar.
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
function crossings(a,b){ const B=b.map(bb); let n=0;
  for(const A of a){ const x=bb(A);
    for(let t=0;t<b.length;t++){ const y=B[t];
      if(x.hi[0]<y.lo[0]||y.hi[0]<x.lo[0]||x.hi[1]<y.lo[1]||y.hi[1]<x.lo[1]||x.hi[2]<y.lo[2]||y.hi[2]<x.lo[2]) continue;
      if(overlap(A,b[t])) n++; } }
  return n; }
// The three shells, told apart by how far they reach from the axis: the ball is the narrowest.
function parts(t){
  const cs = meshComponents(t).map(c => { let r=0, lo=1e9, hi=-1e9;
    for(const T of c) for(const v of T){ r=Math.max(r, Math.hypot(v[0],v[2])); lo=Math.min(lo,v[1]); hi=Math.max(hi,v[1]); }
    return {tris:c, r, lo, hi}; });
  cs.sort((a,b)=>a.r-b.r);
  return {ball:cs[0], rest:cs.slice(1)};
}

console.log('=== builds across the range, and as three separate closed shells ===');
for(const D of [8,16,40]) for(const m of [110,125,145]){
  const t = mk({ballD:D, ballMouth:m}), mc = manifoldCheck(t,4);
  chk('Ø'+D+' устье '+m+'°: замкнут', mc.watertight && vol(t)>0, {open:mc.openEdges, bad:mc.badEdges});
}
for(const ov of [{ballGap:0.15}, {ballGap:1.2}, {ballWall:1.2}, {ballWall:10},
                 {ballStemD:3}, {ballStemD:20}, {ballStem:60}, {ballBaseR:40}, {ballBaseT:15},
                 {ballD:6}, {ballMouth:100}, {ballMouth:160}]){
  const t = mk(ov), mc = manifoldCheck(t,4);
  chk('крайние параметры '+JSON.stringify(ov), mc.watertight && vol(t)>0, {open:mc.openEdges, bad:mc.badEdges});
}
{ const t = mk({});
  const cs = meshComponents(t);
  chk('шар, чашка и основание — три оболочки', cs.length === 3, {n:cs.length});
  chk('и каждая замкнута сама по себе', cs.every(c=>manifoldCheck(c,4).watertight), {});
}

console.log('=== the ball and the socket NEVER touch — that is the whole print ===');
{ const t = mk({}), P = parts(t);
  const cup = P.rest.reduce((a,b)=>a.concat(b.tris), []);
  chk('ноль пересечений треугольник-против-треугольника', crossings(P.ball.tris, cup) === 0,
      {crossings:crossings(P.ball.tris, cup)});
  // ...and they are not merely non-crossing but properly spaced. A ray through the centre meets the cup
  // wall, then air, then the ball, then air, then the cup wall: three runs, and both gaps are the print gap.
  const yC = P.ball.lo + 8;                      // sphere's bottom pole + R
  const runs = solidRuns(t, 0, yC, 0.11);
  chk('луч сквозь центр встречает стенку, шар и стенку', runs.length === 3, {runs:runs.length});
  if(runs.length === 3){
    const g1 = runs[1][0]-runs[0][1], g2 = runs[2][0]-runs[1][1];
    chk('зазор с обеих сторон — заказанный', Math.abs(g1-0.35) < 0.06 && Math.abs(g2-0.35) < 0.06,
        {left:+g1.toFixed(3), right:+g2.toFixed(3)});
    chk('и он одинаков с обеих сторон', Math.abs(g1-g2) < 0.02, {});
  }
}
{ // The gap follows the parameter, and it is the same all the way round the cavity — a gap that closes on
  // one side is a joint that binds there and rattles opposite.
  //
  // It has to be measured RADIALLY. The two spheres are concentric, so the radial gap is constant, but the
  // HORIZONTAL distance between them is sqrt(Ri²−h²) − sqrt(R²−h²), which grows without bound toward the
  // poles: off the equator a correct 0.35 mm gap measures 0.44 and a correct 0.8 measures 1.0. The first
  // draft of this check read the horizontal distance and called the geometry wrong.
  for(const g of [0.2, 0.35, 0.8]){
    const t = mk({ballGap:g}), P = parts(t), yC = P.ball.lo + 8;
    let worst = 0, seen = 0;
    for(let k=0;k<9;k++){ const y = yC - 5 + 10*k/9, h = y - yC;
      const runs = solidRuns(t, 0, y, 0.11);
      if(runs.length !== 3) continue;
      seen++;
      for(const [outer, inner] of [[runs[0][1], runs[1][0]], [runs[2][0], runs[1][1]]]){
        const rCav = Math.hypot(outer, h, 0.11), rBall = Math.hypot(inner, h, 0.11);
        worst = Math.max(worst, Math.abs((rCav - rBall) - g)); }
    }
    chk('зазор '+g+' держится по всей высоте полости', seen >= 5 && worst < 0.05,
        {heights:seen, worst:+worst.toFixed(3)});
  }
}

console.log('=== captive: the mouth is narrower than the ball ===');
{ const s = ballJointSpec(setp({}));
  chk('устье уже шара', s.captive && s.rMouth < 8, {mouth:+s.rMouth.toFixed(2), ball:8});
  // ...and the mesh agrees: at the mouth's height the cup's opening really is that narrow.
  const t = mk({}), P = parts(t), yMouth = P.rest.reduce((a,b)=>Math.max(a,b.hi), -1e9);
  const runs = solidRuns(t, 0, yMouth - 0.4, 0.11);
  const open = runs.length >= 2 ? runs[runs.length-1][0] - runs[0][1] : 0;
  chk('и в меше устье такое же', Math.abs(open/2 - s.rMouth) < 0.35, {open:+(open/2).toFixed(2)});
  chk('шире 100° устье уже не держит', !ballJointSpec(setp({ballMouth:100})).captive, {});
  chk('и это попадает в предупреждения',
      collectPrintWarnings(setp({ballMouth:100})).some(x=>/выпадет/.test(x)), {});
  chk('а нормальный шарнир ни о чём не предупреждает', collectPrintWarnings(setp({})).length === 0,
      collectPrintWarnings(setp({})));
}

console.log('=== the swing is what the mouth leaves once the stem is through it ===');
{ const wide = ballJointSpec(setp({ballMouth:110})), narrow = ballJointSpec(setp({ballMouth:145}));
  chk('шире устье — больше качание', wide.swing > narrow.swing + 20,
      {'110°':+wide.swing.toFixed(0), '145°':+narrow.swing.toFixed(0)});
  const thin = ballJointSpec(setp({ballStemD:3})), thick = ballJointSpec(setp({ballStemD:14}));
  chk('тоньше ножка — больше качание', thin.swing > thick.swing + 10,
      {thin:+thin.swing.toFixed(0), thick:+thick.swing.toFixed(0)});
  chk('и заклиненный шарнир отмечается', collectPrintWarnings(setp({ballMouth:158})).some(x=>/качание/.test(x)), {});
  chk('слишком тесный зазор — тоже', collectPrintWarnings(setp({ballGap:0.15})).some(x=>/спечься/.test(x)), {});
}

console.log('=== the ball is a ball, and the stem comes out of the mouth ===');
{ const t = mk({}), P = parts(t);
  chk('шар — заказанного Ø', Math.abs(2*P.ball.r - 16) < 0.25, {d:+(2*P.ball.r).toFixed(2)});
  // The stem leaves through the mouth, so the ball's component reaches ABOVE the cup's rim.
  const rim = P.rest.reduce((a,b)=>Math.max(a,b.hi), -1e9);
  chk('ножка выходит наружу через устье', P.ball.hi > rim + 1, {stem:+P.ball.hi.toFixed(1), rim:+rim.toFixed(1)});
  const longer = parts(mk({ballStem:40}));
  chk('и её длина — параметр', longer.ball.hi > P.ball.hi + 25, {});
  // The stem Ø is clamped to 1.4·R — a stem wider than that leaves no ball to grip — so the expectation
  // comes from the builder's own spec rather than from what was typed in.
  const want = ballJointSpec(setp({ballStemD:12})).ds;
  const fat = parts(mk({ballStemD:12}));
  let rs = 0; for(const T of fat.ball.tris) for(const v of T) if(v[1] > fat.ball.hi - 2) rs = Math.max(rs, Math.hypot(v[0],v[2]));
  chk('Ø ножки — тоже параметр (с ограничением 1.4·R)', Math.abs(2*rs - want) < 0.4,
      {d:+(2*rs).toFixed(2), want:+want.toFixed(2)});
  chk('и 12 мм на шаре Ø16 действительно урезаются', want < 12, {want:+want.toFixed(2)});
}

console.log('=== no triangle is inside-out ===');
for(const [nm,ov] of [['шарнир',{}], ['широкое устье',{ballMouth:110}], ['узкое устье',{ballMouth:150}],
                      ['толстая чашка',{ballWall:6}], ['длинная ножка',{ballStem:40}]]){
  const t = mk(ov), B = computeBBox(t);
  let worst = 0, at = null;
  for(let k=1;k<14;k++){ const y = B.minY + (B.maxY-B.minY)*(k+0.37)/14;
    for(const z of [0.31, -0.44, 0.83]){ const d = minDepth(t, 0, y, z);
      if(d < worst){ worst = d; at = [+y.toFixed(2), z]; } } }
  chk(nm+': глубина по лучу нигде не уходит в минус', worst===0, {depth:worst, at});
}

console.log('\n=== TOTAL:', pass, 'passed,', fail, 'failed ===');
if(fail) process.exitCode = 1;
