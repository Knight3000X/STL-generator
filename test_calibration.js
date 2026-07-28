// Calibration prints (калибровочные печати): temperature tower, bridge/overhang test and retraction test,
// through the REAL buildTrisForShape pipeline. These models exist to be MEASURED off the bed, so the tests
// measure them off the mesh — segment heights, tick counts, bridge spans, overhang angles, tower taper.
// Run via ./run-all.sh.
let pass=0,fail=0; function chk(n,c,e){if(c){pass++;console.log('  OK  ',n);}else{fail++;console.log('  FAIL',n,e!==undefined?JSON.stringify(e):'');}}
function vol(t){let v=0;for(const T of t){const a=T[0],b=T[1],c=T[2];v+=(a[0]*(b[1]*c[2]-b[2]*c[1])-a[1]*(b[0]*c[2]-b[2]*c[0])+a[2]*(b[0]*c[1]-b[1]*c[0]))/6;}return v;}
function base(ov){ logos.length=0; boxHoles.length=0; dieFaces.length=0;
  Object.assign(paramState.box, defaultBoxParams(), {width:40,height:40,depth:40,
    mntMode:'temptower', mntCalN:5, mntCalH:12, mntW:30, mntT:4, mntBrSpan:50, mntRetGap:35,
    fnOn:false,pbPart:'none',woBack:'none',hookMount:'none',gearMode:'none',pipMode:'none',psOn:false,
    threadMode:'none',sheetShape:'none',keycapMode:'none',platonic:'none',polyN:0,binRound:0,
    scoopDir:'none',labelTab:'none',mountHoles:'none',gripWall:'none',divX:1,divZ:1,stackFeet:false,gfOn:false}, ov);
  return buildTrisForShape('box',paramState.box); }

const uniq=a=>a.filter((v,i)=>i===0||v-a[i-1]>1e-6);
function hitsX(tris,y,z){const xs=[];for(const T of tris){const[a,b,c]=T;
 const d1=(b[1]-a[1])*(z-a[2])-(b[2]-a[2])*(y-a[1]);const d2=(c[1]-b[1])*(z-b[2])-(c[2]-b[2])*(y-b[1]);const d3=(a[1]-c[1])*(z-c[2])-(a[2]-c[2])*(y-c[1]);
 if(!((d1>=0&&d2>=0&&d3>=0)||(d1<=0&&d2<=0&&d3<=0)))continue;
 const A=(b[1]-a[1])*(c[2]-a[2])-(b[2]-a[2])*(c[1]-a[1]);if(Math.abs(A)<1e-12)continue;
 const w1=((b[1]-y)*(c[2]-z)-(b[2]-z)*(c[1]-y))/A,w2=((c[1]-y)*(a[2]-z)-(c[2]-z)*(a[1]-y))/A;
 xs.push(w1*a[0]+w2*b[0]+(1-w1-w2)*c[0]);}return xs.sort((u,v)=>u-v);}
// De-duplicated only where distinct POSITIONS are wanted; parity counting needs every crossing, including
// the two a shared edge legitimately produces.
const hitsXu=(t,y,z)=>uniq(hitsX(t,y,z));
// A horizontal section's closed loops: the outline plus one per through-window.
function sectionLoops(tris, y){
  const segs=[];
  for(const T of tris){ const pts=[];
    for(let k=0;k<3;k++){ const A=T[k], B=T[(k+1)%3];
      if((A[1]-y)*(B[1]-y)<0){ const t=(y-A[1])/(B[1]-A[1]);
        pts.push([A[0]+(B[0]-A[0])*t, A[2]+(B[2]-A[2])*t]); } }
    if(pts.length===2) segs.push(pts); }
  const key=q=>q.map(c=>Math.round(c*1e3)).join(',');
  const par=new Map(), find=a=>{ while(par.get(a)!==a){ par.set(a,par.get(par.get(a))); a=par.get(a);} return a; };
  const add=q=>{ const k=key(q); if(!par.has(k)) par.set(k,k); return k; };
  for(const sg of segs){ const a=find(add(sg[0])), b=find(add(sg[1])); if(a!==b) par.set(b,a); }
  const roots=new Set(); for(const k of par.keys()) roots.add(find(k));
  return roots.size;
}

console.log('=== watertight across every knob ===');
for(const m of ['temptower','bridgetest','retract'])
  for(const n of [3,5,8,10])
    for(const H of [5,12,60])
      for(const W of [10,30,300]){
        const t=base({mntMode:m,mntCalN:n,mntCalH:H,mntW:W}), mc=manifoldCheck(t,4);
        chk(m+' n'+n+' H'+H+' W'+W+' watertight (+vol)', mc.watertight&&vol(t)>0,
            {open:mc.openEdges,bad:mc.badEdges});
      }
for(const ov of [{mntMode:'bridgetest',mntBrSpan:10},{mntMode:'bridgetest',mntBrSpan:120},
                 {mntMode:'retract',mntRetGap:10},{mntMode:'retract',mntRetGap:150},
                 {mntMode:'temptower',mntT:20},{mntMode:'bridgetest',mntT:2},
                 {mntMode:'retract',mntW:10,mntCalH:5},{mntMode:'temptower',mntCalN:10,mntCalH:60}]){
  const t=base(ov), mc=manifoldCheck(t,4);
  chk('extreme '+JSON.stringify(ov)+' watertight', mc.watertight&&vol(t)>0, {open:mc.openEdges,bad:mc.badEdges});
}

console.log('=== temperature tower: the segments are countable and each one tests something ===');
{ const H=12, n=5, W=30, t=base({mntMode:'temptower',mntCalN:n,mntCalH:H,mntW:W});
  const B=computeBBox(t), y0=B.minY;
  chk('height = segments × segment height', Math.abs((B.maxY-B.minY)-n*H)<0.05, {y:+(B.maxY-B.minY).toFixed(2)});
  const widths=[];
  for(let k=0;k<n;k++){ const xs=hitsXu(t, y0+k*H+H*0.15, 0);
    widths.push(xs.length>=2 ? xs[xs.length-1]-xs[0] : NaN); }
  chk('every segment steps in, so the boundary is visible',
      widths.every((w,i)=>i===0 || w < widths[i-1]-0.5), widths.map(v=>+v.toFixed(2)));
  chk('and the bottom one is the width asked for', Math.abs(widths[0]-W)<0.05, {w:+widths[0].toFixed(2)});
  for(let k=0;k<n;k++){
    const xs=hitsXu(t, y0+k*H+H*0.7, -( (B.maxZ-B.minZ)/2 )+0.2 - 0.6);
    chk('segment '+(k+1)+' wears '+(k+1)+' count marks', xs.length===2*(k+1), {got:xs.length/2, want:k+1});
  }
  for(let k=0;k<n;k++)
    chk('segment '+(k+1)+' has a bridged window', sectionLoops(t, y0+k*H+H*0.42)===2,
        {loops:sectionLoops(t, y0+k*H+H*0.42)});
}
{ const a=computeBBox(base({mntMode:'temptower',mntCalN:4})), b=computeBBox(base({mntMode:'temptower',mntCalN:9}));
  chk('more segments → taller tower', (b.maxY-b.minY) > (a.maxY-a.minY)+50,
      {a:+(a.maxY-a.minY).toFixed(0), b:+(b.maxY-b.minY).toFixed(0)}); }

console.log('=== bridge / overhang: the spans and the angles are the ones printed on the tin ===');
{ const n=5, span=50, t=base({mntMode:'bridgetest',mntCalN:n,mntBrSpan:span,mntCalH:12,mntW:30,mntT:4});
  const B=computeBBox(t), W=Math.min(30,40)*0.5, pitch=W+6;
  const xAt=k=>-(n-1)*pitch/2 + k*pitch;
  const got=[];
  for(let k=0;k<n;k++){
    const y=B.minY+4+6;                        // between the base and the deck: only the piers are here
    // read the clear span under the deck by walking z and testing solidity
    let runs=[], inside=false, start=0;
    for(let i=0;i<=1600;i++){ const z=B.minZ+(B.maxZ-B.minZ)*i/1600;
      const xs=hitsX(t, y, z), x=xAt(k);
      let cross=0; for(const v of xs) if(v<x) cross++;
      const solid=(cross%2)===1;
      if(solid && !inside){ start=z; inside=true; }
      if(!solid && inside){ runs.push([start,z]); inside=false; } }
    if(inside) runs.push([start,B.maxZ]);
    const piers=runs.filter(r=>r[1]-r[0]>1);
    got.push(piers.length>=2 ? piers[1][0]-piers[0][1] : NaN);
  }
  chk('the spans grow linearly to the maximum asked for',
      got.every((s,i)=>Math.abs(s-span*(i+1)/n)<0.6), got.map(v=>+v.toFixed(1)));
  chk('and the widest really is mntBrSpan', Math.abs(got[n-1]-span)<0.6, {got:+got[n-1].toFixed(2)});
}
{ const n=5, t=base({mntMode:'bridgetest',mntCalN:n,mntBrSpan:50,mntCalH:12,mntW:30,mntT:4});
  const B=computeBBox(t), W=Math.min(30,40)*0.5, pitch=W+6, xAt=k=>-(n-1)*pitch/2 + k*pitch;
  const angles=[];
  for(let k=0;k<n;k++){
    // The fin is a prism: its underside runs between exactly two Z stations. Take the lowest vertex at
    // each and the angle from vertical is atan(run / rise).
    const zs=new Map();                                    // the fin is narrower than its pier, so this
    for(const T of t) for(const v of T){                   // slot contains the fin and nothing else
      if(Math.abs(v[0]-xAt(k)) > W/2-0.3) continue;
      if(v[1] < B.minY+5) continue;                        // above the base
      const zk=Math.round(v[2]*100);
      if(!zs.has(zk) || v[1]<zs.get(zk)) zs.set(zk, v[1]); }
    const keys=[...zs.keys()].sort((a,b)=>a-b);
    if(keys.length<2){ angles.push(NaN); continue; }
    const z0=keys[0]/100, z1=keys[keys.length-1]/100, y0=zs.get(keys[0]), y1=zs.get(keys[keys.length-1]);
    angles.push(Math.atan2(z1-z0, y1-y0)*180/Math.PI);
  }
  chk('the overhang angles sweep 30° → 80° from vertical',
      Math.abs(angles[0]-30)<6 && Math.abs(angles[n-1]-80)<6 &&
      angles.every((v,i)=>i===0||v>angles[i-1]), angles.map(v=>+v.toFixed(1)));
}
{ const a=computeBBox(base({mntMode:'bridgetest',mntBrSpan:20})), b=computeBBox(base({mntMode:'bridgetest',mntBrSpan:100}));
  chk('a bigger maximum span makes a deeper model', (b.maxZ-b.minZ) > (a.maxZ-a.minZ)+50,
      {a:+(a.maxZ-a.minZ).toFixed(0), b:+(b.maxZ-b.minZ).toFixed(0)}); }

console.log('=== retraction: two towers, tapered, the requested distance apart ===');
{ const gap=35, t=base({mntMode:'retract',mntRetGap:gap,mntCalH:12,mntW:30,mntT:4});
  const B=computeBBox(t), yBase=B.minY;
  const xs=hitsXu(t, yBase+8, 0);
  chk('there are exactly two towers', xs.length===4, {n:xs.length});
  if(xs.length===4){
    const c1=(xs[0]+xs[1])/2, c2=(xs[2]+xs[3])/2;
    chk('their centres are mntRetGap apart', Math.abs((c2-c1)-gap)<0.05, {got:+(c2-c1).toFixed(3)});
    chk('and they are symmetric about the middle', Math.abs(c1+c2)<0.05, {c1:+c1.toFixed(4),c2:+c2.toFixed(4)});
  }
  const wAt=y=>{ const h=hitsXu(t, y, 0); return h.length===4 ? (h[1]-h[0]) : NaN; };
  const lo=wAt(yBase+6), hi=wAt(B.maxY-4);
  chk('the towers taper toward the top', hi < lo-1, {bottom:+lo.toFixed(2), top:+hi.toFixed(2)});
  chk('and taper is the only overhang: the top is never wider', hi <= lo+1e-9, {});
}
{ const a=computeBBox(base({mntMode:'retract',mntRetGap:15})), b=computeBBox(base({mntMode:'retract',mntRetGap:120}));
  chk('a wider gap makes a wider model', (b.maxX-b.minX)-(a.maxX-a.minX) > 100,
      {d:+((b.maxX-b.minX)-(a.maxX-a.minX)).toFixed(1)}); }
{ const a=computeBBox(base({mntMode:'retract',mntCalH:8})), b=computeBBox(base({mntMode:'retract',mntCalH:40}));
  chk('the height knob drives the towers', (b.maxY-b.minY) > (a.maxY-a.minY)+80,
      {a:+(a.maxY-a.minY).toFixed(0), b:+(b.maxY-b.minY).toFixed(0)}); }

console.log('=== the new modes do not disturb the old ones ===');
for(const m of ['lbracket','vesa','boss','tool','pipe','foot','fittest','dovetail']){
  const t=base({mntMode:m}), mc=manifoldCheck(t,4);
  chk(m+' still watertight', mc.watertight&&vol(t)>0, {open:mc.openEdges,bad:mc.badEdges});
}
{ const a=vol(base({mntMode:'fittest',mntCalN:3})), b=vol(base({mntMode:'fittest',mntCalN:9}));
  chk('the calibration-segment knob does nothing to the fit test', Math.abs(a-b)<1e-9, {}); }

console.log('\n'+(fail?'FAILED':'ALL PASSED')+': '+pass+' passed, '+fail+' failed');
if(fail) process.exitCode=1;
