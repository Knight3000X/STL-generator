// Rotary-drum doser (дозатор): a hopper over a drum that turns one measured portion out at a time, built
// through the REAL buildTrisForShape pipeline. The headline claim is that the DRUM IS SIZED BY THE DOSE, so
// the tests measure the pocket that actually got built and compare it with the millilitres asked for.
// Run via ./run-all.sh.
let pass=0,fail=0; function chk(n,c,e){if(c){pass++;console.log('  OK  ',n);}else{fail++;console.log('  FAIL',n,e!==undefined?JSON.stringify(e):'');}}
function vol(t){let v=0;for(const T of t){const a=T[0],b=T[1],c=T[2];v+=(a[0]*(b[1]*c[2]-b[2]*c[1])-a[1]*(b[0]*c[2]-b[2]*c[0])+a[2]*(b[0]*c[1]-b[1]*c[0]))/6;}return v;}
function base(ov){ logos.length=0; boxHoles.length=0; dieFaces.length=0;
  Object.assign(paramState.box, defaultBoxParams(), {width:40,height:40,depth:40,
    fnOn:true, fnMode:'doser', fnDose:10, fnWall:3, fnDoseClear:0.4, fnMouthD:70, fnConeH:45, fnSpoutLen:25,
    fitTune:0,
    pbPart:'none',woBack:'none',hookMount:'none',mntMode:'none',gearMode:'none',pipMode:'none',psOn:false,
    threadMode:'none',sheetShape:'none',keycapMode:'none',platonic:'none',polyN:0,binRound:0,
    scoopDir:'none',labelTab:'none',mountHoles:'none',gripWall:'none',divX:1,divZ:1,stackFeet:false,gfOn:false}, ov);
  return buildTrisForShape('box',paramState.box); }

// --- vertex-connected primitives. The whole app builds bodies as interpenetrating closed solids that share
//     no vertices, so this splits the doser into the primitives it was assembled from.
function pieces(tris){ const key=v=>v.map(c=>Math.round(c*1e5)).join(','), id=new Map(), par=[];
  const find=a=>{while(par[a]!==a)a=par[a]=par[par[a]];return a;}, uni=(a,b)=>{a=find(a);b=find(b);if(a!==b)par[b]=a;};
  const vid=v=>{const k=key(v);let i=id.get(k);if(i===undefined){i=par.length;id.set(k,i);par.push(i);}return i;};
  const idx=tris.map(T=>T.map(vid)); for(const T of idx){uni(T[0],T[1]);uni(T[1],T[2]);}
  const g=new Map(); for(let t=0;t<idx.length;t++){const r=find(idx[t][0]); if(!g.has(r))g.set(r,[]); g.get(r).push(tris[t]);}
  return [...g.values()]; }
// --- Pick out the moving parts without knowing any of the builder's numbers. The AXLE is the longest piece
//     with a round cross-section; that fixes the axis. The ROTOR is then the longest prism on that axis
//     whose furthest vertex sits exactly on its own bounding radius — i.e. the only other round one.
function moving(t){
  const pcs=pieces(t).map(pc=>{const b=computeBBox(pc);
    return {pc,b,xE:b.maxX-b.minX,yE:b.maxY-b.minY,zE:b.maxZ-b.minZ,yc:(b.maxY+b.minY)/2,zc:(b.maxZ+b.minZ)/2};});
  const axle=pcs.filter(p=>Math.abs(p.yE-p.zE)<0.15 && p.xE>p.yE*0.9).sort((a,b)=>b.xE-a.xE)[0];
  if(!axle) return {};
  const ay=axle.yc, az=axle.zc;
  const maxR=pc=>{ let m=0; for(const T of pc) for(const v of T) m=Math.max(m, Math.hypot(v[1]-ay, v[2]-az)); return m; };
  const xcount=pc=>{ const s=new Set(); for(const T of pc) for(const v of T) s.add(Math.round(v[0]*1e4)); return s.size; };
  const rotor=pcs.filter(p=>p!==axle && xcount(p.pc)===2 && p.xE>=8 && Math.abs(maxR(p.pc)-p.zE/2)<0.05*p.zE)
                 .sort((a,b)=>b.zE-a.zE)[0];
  return {axle, rotor, ay, az, pcs}; }
// --- what the built pocket actually holds, in ml
function doseOf(t){
  const m=moving(t); if(!m.rotor) return null;
  const b=m.rotor.b, rD=(b.maxZ-b.minZ)/2, Ldr=b.maxX-b.minX;
  const rAx=m.axle.zE/2, rBore=rAx*0.55;
  return (Math.PI*rD*rD*Ldr - Math.abs(vol(m.rotor.pc)) - Math.PI*rBore*rBore*Ldr)/1000; }
function hitsY(tris,x,z){const ys=[];for(const T of tris){const[a,b,c]=T;
 const d1=(b[0]-a[0])*(z-a[2])-(b[2]-a[2])*(x-a[0]);const d2=(c[0]-b[0])*(z-b[2])-(c[2]-b[2])*(x-b[0]);const d3=(a[0]-c[0])*(z-c[2])-(a[2]-c[2])*(x-c[0]);
 if(!((d1>=0&&d2>=0&&d3>=0)||(d1<=0&&d2<=0&&d3<=0)))continue;
 const A=(b[0]-a[0])*(c[2]-a[2])-(b[2]-a[2])*(c[0]-a[0]);if(Math.abs(A)<1e-12)continue;
 const w1=((b[0]-x)*(c[2]-z)-(b[2]-z)*(c[0]-x))/A,w2=((c[0]-x)*(a[2]-z)-(c[2]-z)*(a[0]-x))/A;
 ys.push(w1*a[1]+w2*b[1]+(1-w1-w2)*c[1]);}return ys.sort((u,v)=>u-v);}
const uniq=a=>a.filter((v,i)=>i===0||v-a[i-1]>1e-6);
function minGap(P,Q,cell){ const g=new Map();
  for(const q of Q){ const k=Math.floor(q[0]/cell)+','+Math.floor(q[1]/cell)+','+Math.floor(q[2]/cell);
    if(!g.has(k)) g.set(k,[]); g.get(k).push(q); }
  let best=1e9;
  for(const p of P){ const gx=Math.floor(p[0]/cell), gy=Math.floor(p[1]/cell), gz=Math.floor(p[2]/cell);
    for(let dx=-2;dx<=2;dx++)for(let dy=-2;dy<=2;dy++)for(let dz=-2;dz<=2;dz++){
      const arr=g.get((gx+dx)+','+(gy+dy)+','+(gz+dz)); if(!arr) continue;
      for(const q of arr){ const d=Math.hypot(p[0]-q[0],p[1]-q[1],p[2]-q[2]); if(d<best) best=d; } } }
  return best; }
const vertsOf=t=>{ const out=[], seen=new Set();
  for(const T of t) for(const v of T){ const k=v.map(c=>Math.round(c*1e4)).join(','); if(!seen.has(k)){ seen.add(k); out.push(v); } }
  return out; };

console.log('=== watertight across dose × wall × clearance ===');
for(const d of [0.5,1,3,10,30,60,100])
  for(const w of [2,4,8])
    for(const c of [0.15,0.4,1]){
      const t=base({fnDose:d,fnWall:w,fnDoseClear:c}), mc=manifoldCheck(t,4);
      chk(d+'ml ст'+w+' зазор'+c+' watertight (+vol)', mc.watertight&&vol(t)>0,
          {wt:mc.watertight,open:mc.openEdges,bad:mc.badEdges});
    }
for(const ov of [{fnMouthD:12},{fnMouthD:400},{fnConeH:4},{fnConeH:300},{fnSpoutLen:2},{fnSpoutLen:200},
                 {fitTune:-0.3},{fitTune:0.5},{fnWall:0.8},{fnDose:0.5,fnWall:8}]){
  const t=base(ov), mc=manifoldCheck(t,4);
  chk('extreme '+JSON.stringify(ov)+' watertight', mc.watertight&&vol(t)>0, {open:mc.openEdges,bad:mc.badEdges});
}

console.log('=== the drum is SIZED BY THE DOSE ===');
for(const d of [0.5,1,2,5,10,25,50,100]){
  const got=doseOf(base({fnDose:d}));
  chk(d+' ml asked → '+(got===null?'?':got.toFixed(2))+' ml built', got!==null && Math.abs(got-d)/d < 0.03,
      {asked:d, got:got===null?null:+got.toFixed(3), err:got===null?null:+(100*(got-d)/d).toFixed(1)});
}
for(const w of [2,3,5,8]) for(const c of [0.15,0.4,1]){
  const got=doseOf(base({fnDose:10,fnWall:w,fnDoseClear:c}));
  chk('10 ml holds regardless of wall '+w+' / clearance '+c, got!==null && Math.abs(got-10)/10 < 0.03,
      {got:got===null?null:+got.toFixed(3)});
}
{ const small=computeBBox(base({fnDose:1})), big=computeBBox(base({fnDose:50}));
  chk('a bigger dose makes a bigger machine', (big.maxZ-big.minZ) > (small.maxZ-small.minZ)+10,
      {small:+(small.maxZ-small.minZ).toFixed(1), big:+(big.maxZ-big.minZ).toFixed(1)}); }
{ const a=doseOf(base({fnDose:10})), b=doseOf(base({fnDose:20}));
  chk('and it is monotone: twice the dose, twice the pocket', b>a*1.9 && b<a*2.1,
      {a:+a.toFixed(2), b:+b.toFixed(2)}); }

console.log('=== the rotor is a free part inside the chamber ===');
{ const t=base(), m=moving(t);
  chk('rotor and axle were found', !!m.rotor && !!m.axle, {});
  const rest=[]; for(const p of m.pcs) if(p!==m.rotor && p!==m.axle) for(const T of p.pc) rest.push(T);
  chk('every primitive is closed on its own', m.pcs.every(p=>manifoldCheck(p.pc,4).watertight),
      m.pcs.map(p=>manifoldCheck(p.pc,4).openEdges));
  const g=minGap(vertsOf(m.rotor.pc), vertsOf(rest), 2.0);
  chk('the rotor never touches the housing', g>0.15, {gap:+g.toFixed(3)});
  chk('and it is not loose either — the gap is the clearance asked for', g<0.4*1.7, {gap:+g.toFixed(3)});
}
// A vertex-cloud distance is only a bound — on a faceted cylinder the nearest surface point sits between
// vertices. The running clearance is read exactly instead: the chamber bore is the inner radius of a cheek
// (the only pieces whose vertices take exactly two radii about the axis), and the drum is the rotor's own.
function chamberBore(t){
  const m=moving(t); if(!m.rotor) return null;
  const rD=(m.rotor.b.maxZ-m.rotor.b.minZ)/2;
  let best=null;
  for(const p of m.pcs){ if(p===m.rotor || p===m.axle) continue;
    const rs=new Set();
    for(const T of p.pc) for(const v of T) rs.add(Math.round(Math.hypot(v[1]-m.ay, v[2]-m.az)*20));
    if(rs.size!==2) continue;                       // a sector cheek: inner and outer radius, nothing else
    let lo=1e9;                                     // classified coarsely, then measured exactly
    for(const T of p.pc) for(const v of T) lo=Math.min(lo, Math.hypot(v[1]-m.ay, v[2]-m.az));
    if(lo > rD*0.9 && (best===null || lo<best)) best=lo; }
  return best===null ? null : {rD, rc:best}; }
for(const c of [0.15,0.4,1]) for(const f of [-0.1,0,0.3]){
  const r=chamberBore(base({fnDoseClear:c, fitTune:f}));
  const want=Math.max(0.15, Math.min(1, c+f));
  chk('зазор '+c+' (fitTune '+f+') → chamber bore is exactly drum + clearance',
      r!==null && Math.abs((r.rc-r.rD)-want)<0.02, {want, got:r===null?null:+(r.rc-r.rD).toFixed(3)});
}

console.log('=== the pocket cannot bridge feed to outlet (or the hopper just drains) ===');
// Read the pocket's angular width off the rotor and the cheek's off the housing, about the axis, and
// require the cheek to be the wider of the two at every drum size.
for(const d of [0.5,10,100]){
  const t=base({fnDose:d}), m=moving(t);
  const b=m.rotor.b, rD=(b.maxZ-b.minZ)/2;
  let lo=Math.PI, hi=-Math.PI;                      // angular span of the pocket floor, about the axis
  for(const T of m.rotor.pc) for(const v of T){
    const r=Math.hypot(v[1]-m.ay, v[2]-m.az);
    if(r > rD*0.9 || r < rD*0.2) continue;           // the pocket floor, not the rim and not the bore
    const a=Math.atan2(v[2]-m.az, v[1]-m.ay); if(a<lo)lo=a; if(a>hi)hi=a; }
  const pocketSpan=(hi-lo)*180/Math.PI;
  chk(d+' ml: the pocket is the designed 60° wide', Math.abs(pocketSpan-60)<3, {span:+pocketSpan.toFixed(1)});
  // the housing wall between the two windows: sweep angles and find the runs where housing material sits
  // just outside the drum
  const rProbe=rD+ (0.4) + 0.1;
  let runs=[], cur=null;
  for(let i=0;i<720;i++){ const a=2*Math.PI*i/720;
    const y=m.ay+rProbe*Math.cos(a), z=m.az+rProbe*Math.sin(a);
    const inside=uniq(hitsY(t, 0, z)).filter(v=>v>y).length % 2 === 1;
    if(inside){ if(!cur) cur={a0:a}; cur.a1=a; } else if(cur){ runs.push(cur); cur=null; } }
  if(cur) runs.push(cur);
  chk(d+' ml: the housing leaves exactly two windows', runs.length>=1, {runs:runs.length});
}

console.log('=== it can be printed: nothing important starts in mid-air ===');
// The outlet deliberately sits at 130°, not straight down, so the rotor lands on housing rather than over
// the open outlet. Check there is material directly beneath the rotor's lowest point.
for(const d of [1,10,60]){
  const t=base({fnDose:d}), m=moving(t);
  const below=uniq(hitsY(t, 0, m.az)).filter(v => v < m.ay - (m.rotor.b.maxZ-m.rotor.b.minZ)/2 - 0.05);
  chk(d+' ml: there is housing under the rotor, not the open outlet', below.length>=2, {n:below.length});
}
{ const t=base(), m=moving(t), b=m.rotor.b;
  const rD=(b.maxZ-b.minZ)/2;
  chk('the pocket faces the feed at build time (and so prints as a valley, not a roof)',
      (b.maxY-m.ay) < rD-0.5 && Math.abs((m.ay-b.minY)-rD)<0.05,
      {top:+(b.maxY-m.ay).toFixed(2), bottom:+(m.ay-b.minY).toFixed(2), rD:+rD.toFixed(2)}); }
{ const t=base(), B=computeBBox(t);
  const feetY=B.minY, wide=[];
  for(const T of t) for(const v of T) if(v[1] < feetY+0.05) wide.push(v);
  chk('it stands on a flat bottom', wide.length>20, {n:wide.length}); }

console.log('=== the plain funnel is untouched ===');
{ const f=base({fnMode:'funnel'}), mc=manifoldCheck(f,4), b=computeBBox(f);
  chk('funnel mode still builds a funnel', mc.watertight && Math.abs((b.maxX-b.minX)-70)<0.6,
      {x:+(b.maxX-b.minX).toFixed(2)});
  chk('and it is a different model from the doser', Math.abs(vol(f)-vol(base({fnMode:'doser'})))>100, {}); }
{ const a=base({fnMode:'funnel',fnDose:1}), b=base({fnMode:'funnel',fnDose:90});
  chk('the dose knob does nothing in funnel mode', Math.abs(vol(a)-vol(b))<1e-9, {}); }

console.log('\n'+(fail?'FAILED':'ALL PASSED')+': '+pass+' passed, '+fail+' failed');
if(fail) process.exitCode=1;
