// Conjugate bevel pair (коническая пара). A bevel gear is a cone over a SPHERICAL outline, so "radius by
// angle" becomes "polar angle by azimuth"; truncate it by planes instead of spheres and the body is that
// one outline scaled linearly with height — extrudeProfileY with a scaleFn, the construction already there.
// Only the PROFILE was missing, and it is found the way the worm wheel's and the cycloidal disc's were: the
// PINION gets a defined trapezoidal tooth on its cone, the WHEEL is enveloped from it.
//
// The claim that matters is not the shape but the pair: build both, place them apex to apex with axes at
// 90°, and measure triangle against triangle. That instrument is used here rather than an analytic probe on
// purpose — two analytic probes were written for this during v148/v149 and BOTH were wrong, one of them
// returning the same 1.0000 mm for every parameter set and not moving when the profile changed.
// Run via ./run-all.sh.
let pass=0, fail=0;
function chk(n,c,e){if(c){pass++;console.log('  OK  ',n);}else{fail++;console.log('  FAIL',n,e!==undefined?JSON.stringify(e):'');}}
function vol(t){let v=0;for(const T of t){const a=T[0],b=T[1],c=T[2];v+=(a[0]*(b[1]*c[2]-b[2]*c[1])-a[1]*(b[0]*c[2]-b[2]*c[0])+a[2]*(b[0]*c[1]-b[1]*c[0]))/6;}return v;}
function setp(ov){ logos.length=0; boxHoles.length=0; dieFaces.length=0;
  Object.assign(paramState.box, defaultBoxParams(), {gfBaseplate:false, gearMode:'bevel',
    gearModule:2, gearBevelRole:'pinion', gearTeeth:12, gearBevelMate:24}, ov); return paramState.box; }
const bpSub=(u,v)=>[u[0]-v[0],u[1]-v[1],u[2]-v[2]], bpDot=(u,v)=>u[0]*v[0]+u[1]*v[1]+u[2]*v[2];
const bpCr=(u,v)=>[u[1]*v[2]-u[2]*v[1],u[2]*v[0]-u[0]*v[2],u[0]*v[1]-u[1]*v[0]], EPS=1e-9;
function overlap(A,B){
  const N1=bpCr(bpSub(A[1],A[0]),sub(A[2],A[0])), d1=-bpDot(N1,A[0]), dB=B.map(q=>bpDot(N1,q)+d1);
  if((dB[0]>EPS&&dB[1]>EPS&&dB[2]>EPS)||(dB[0]<-EPS&&dB[1]<-EPS&&dB[2]<-EPS)) return false;
  const N2=bpCr(bpSub(B[1],B[0]),sub(B[2],B[0])), d2=-bpDot(N2,B[0]), dA=A.map(q=>bpDot(N2,q)+d2);
  if((dA[0]>EPS&&dA[1]>EPS&&dA[2]>EPS)||(dA[0]<-EPS&&dA[1]<-EPS&&dA[2]<-EPS)) return false;
  const D=bpCr(N1,N2), aD=D.map(Math.abs); if(Math.max(...aD)<1e-12) return false;
  const idx=aD.indexOf(Math.max(...aD));
  const iv=(T,d)=>{ const q=T.map(v=>v[idx]), out=[];
    for(let i=0;i<3;i++){ const j=(i+1)%3;
      if(d[i]*d[j]<0){ const t=d[i]/(d[i]-d[j]); out.push(q[i]+(q[j]-q[i])*t); }
      if(Math.abs(d[i])<=EPS) out.push(q[i]); }
    return out.length<2?null:[Math.min(...out),Math.max(...out)]; };
  const i1=iv(A,dA), i2=iv(B,dB);
  return !!(i1&&i2) && (Math.min(i1[1],i2[1]) - Math.max(i1[0],i2[0])) > 1e-6;
}
const bb=T=>{const lo=[1e30,1e30,1e30],hi=[-1e30,-1e30,-1e30];
  for(const v of T)for(let a=0;a<3;a++){if(v[a]<lo[a])lo[a]=v[a];if(v[a]>hi[a])hi[a]=v[a];}return{lo,hi};};
// Uniform grid over the second mesh first: these are 15-40 thousand triangles a side, and all-pairs is
// half a billion box tests — the same reason test_assembly.js grids rather than sweeps.
function nCross(X,Y){
  const BY=Y.map(bb); const lo=[1e30,1e30,1e30], hi=[-1e30,-1e30,-1e30];
  for(const b of BY) for(let a=0;a<3;a++){ if(b.lo[a]<lo[a])lo[a]=b.lo[a]; if(b.hi[a]>hi[a])hi[a]=b.hi[a]; }
  const cell=Math.max((Math.max(hi[0]-lo[0],hi[1]-lo[1],hi[2]-lo[2]))/48, 1e-6), grid=new Map();
  const cells=(b,fn)=>{ for(let i=Math.floor((b.lo[0]-lo[0])/cell);i<=Math.floor((b.hi[0]-lo[0])/cell);i++)
    for(let j=Math.floor((b.lo[1]-lo[1])/cell);j<=Math.floor((b.hi[1]-lo[1])/cell);j++)
    for(let k=Math.floor((b.lo[2]-lo[2])/cell);k<=Math.floor((b.hi[2]-lo[2])/cell);k++) fn(i+','+j+','+k); };
  for(let j=0;j<Y.length;j++) cells(BY[j], k=>{ let a=grid.get(k); if(!a){a=[];grid.set(k,a);} a.push(j); });
  let n=0;
  for(const A of X){ const a=bb(A);
    if(a.hi[0]<lo[0]||a.lo[0]>hi[0]||a.hi[1]<lo[1]||a.lo[1]>hi[1]||a.hi[2]<lo[2]||a.lo[2]>hi[2]) continue;
    const seen=new Set();
    cells(a, k=>{ const arr=grid.get(k); if(!arr) return;
      for(const j of arr){ if(seen.has(j)) continue; seen.add(j); const b=BY[j];
        if(a.hi[0]<b.lo[0]||b.hi[0]<a.lo[0]||a.hi[1]<b.lo[1]||b.hi[1]<a.lo[1]||a.hi[2]<b.lo[2]||b.hi[2]<a.lo[2]) continue;
        if(overlap(A,Y[j])) n++; } }); }
  return n; }
function placedPair(Zp, Zw, role, ov){
  const p = setp(Object.assign({gearBevelRole:role, gearTeeth:role==='pinion'?Zp:Zw,
                                gearBevelMate:role==='pinion'?Zw:Zp}, ov||{}));
  const self = buildTrisForShape('box', p), plan = assemblyPlacement(p, null);
  const world = plan.tris.map(T=>T.map(v=>[v[0]+plan.px, v[1]+plan.py, v[2]+plan.pz]));
  return {p, self, plan, world};
}

console.log('=== both members build, across ratios ===');
for(const [Zp,Zw] of [[12,24],[15,15],[10,30],[20,20],[8,40],[6,12],[30,30]])
  for(const role of ['pinion','wheel']){
    const q = placedPair(Zp,Zw,role);
    const mc = manifoldCheck(q.self,4);
    chk(Zp+':'+Zw+' '+role+': замкнута', mc.watertight && vol(q.self)>0, {open:mc.openEdges, bad:mc.badEdges});
  }
for(const ov of [{gearModule:1},{gearModule:4},{gearThick:3},{gearThick:20},{gearBore:3},{gearBore:10},
                 {gearKeyW:3,gearKeyD:1.5},{gearPA:14},{gearPA:30}]){
  const q = placedPair(12,24,'pinion',ov);
  chk('шестерня + '+JSON.stringify(ov)+': замкнута', manifoldCheck(q.self,4).watertight, {});
  const w = placedPair(12,24,'wheel',ov);
  chk('колесо + '+JSON.stringify(ov)+': замкнуто', manifoldCheck(w.self,4).watertight, {});
}

console.log('=== the PAIR: apex to apex, axes at 90°, and it does not pass through itself ===');
for(const [Zp,Zw] of [[12,24],[15,15],[10,30],[20,20],[16,32],[8,40],[13,13],[9,27],[11,22]])
  for(const role of ['pinion','wheel']){
    const q = placedPair(Zp,Zw,role);
    chk(Zp+':'+Zw+' от «'+role+'»: пара не проходит сквозь себя', nCross(q.self, q.world) === 0,
        {crossings: nCross(q.self, q.world)});
    const A = computeBBox(q.self), B = computeBBox(q.world);
    const ov = [0,1,2].map(k=>{ const l=['minX','minY','minZ'][k], h=['maxX','maxY','maxZ'][k];
      return Math.min(A[h],B[h]) - Math.max(A[l],B[l]); });
    chk(Zp+':'+Zw+' от «'+role+'»: и при этом в зацеплении', ov.every(v => v > 0.8),
        {overlap: ov.map(v=>+v.toFixed(1))});
  }
{ // The half-tooth phase is a measured rule, not a guess: with the mate's count ODD the offset is required
  // and without it the pair grinds; with it EVEN the offset would break a pair that is already clean.
  const q = placedPair(15,15,'pinion');
  const spin = ph => q.plan.tris.map(T=>T.map(v=>{ const c=Math.cos(ph), s=Math.sin(ph);
      return [v[0]+q.plan.px, (v[1]*c-v[2]*s)+q.plan.py, (v[1]*s+v[2]*c)+q.plan.pz]; }));
  chk('15:15 — с полушаговым доворотом чисто', nCross(q.self, q.world) === 0, {});
  chk('...а сдвинь на полшага обратно — заклинит', nCross(q.self, spin(Math.PI/15)) > 50, {});
}

console.log('=== the wheel really is ENVELOPED, not drawn ===');
for(const [Zp,Zw] of [[12,24],[10,30],[16,32],[20,20]]){
  const d = bevelWheelDeltas(Zp, Zw, 2, 20, Zw*36, 200);
  const mid = (Math.max(...d)+Math.min(...d))/2; let teeth=0;
  for(let i=0;i<d.length;i++){ const a=d[i]-mid, b=d[(i+1)%d.length]-mid; if(a<=0&&b>0) teeth++; }
  chk(Zp+':'+Zw+': у колеса ровно '+Zw+' зубьев', teeth === Zw, {teeth});
  const A0 = bevelConeDist(2, Zw, Zp);
  chk(Zp+':'+Zw+': высота зуба около 2.25·m', Math.abs((Math.max(...d)-Math.min(...d))*A0 - 4.5) < 0.5,
      {h:+((Math.max(...d)-Math.min(...d))*A0).toFixed(2)});
}
{ // Pitch angles sum to a right angle — that is what a 90° shaft angle means.
  for(const [Zp,Zw] of [[12,24],[15,15],[8,40]])
    chk(Zp+':'+Zw+': углы конусов дают прямой угол',
        Math.abs(bevelPitchAngle(Zp,Zw) + bevelPitchAngle(Zw,Zp) - Math.PI/2) < 1e-12, {});
  chk('и внешнее конусное расстояние общее', Math.abs(bevelConeDist(2,12,24) - bevelConeDist(2,24,12)) < 1e-9, {});
}

console.log('=== the simple bevel is untouched ===');
{ const a = (setp({gearBevelRole:'simple', gearTeeth:20, gearBevel:45}), buildTrisForShape('box', paramState.box));
  chk('простая коническая по-прежнему строится', manifoldCheck(a,4).watertight && vol(a)>0, {});
  chk('и у неё нет пары в сборке', assemblyPlacement(paramState.box, null) === null, {}); }

console.log('\n=== TOTAL:', pass, 'passed,', fail, 'failed ===');
if(fail) process.exitCode = 1;
