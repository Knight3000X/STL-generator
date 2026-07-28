// Derived hooks (крючки-производные): earphone cradle, brush/razor rack and draining soap dish, each on
// the SAME wall plate or pipe collar the plain J hook uses. Built through the REAL buildTrisForShape
// pipeline. Run via ./run-all.sh.
let pass=0,fail=0; function chk(n,c,e){if(c){pass++;console.log('  OK  ',n);}else{fail++;console.log('  FAIL',n,e!==undefined?JSON.stringify(e):'');}}
function vol(t){let v=0;for(const T of t){const a=T[0],b=T[1],c=T[2];v+=(a[0]*(b[1]*c[2]-b[2]*c[1])-a[1]*(b[0]*c[2]-b[2]*c[0])+a[2]*(b[0]*c[1]-b[1]*c[0]))/6;}return v;}
function base(ov){ logos.length=0; boxHoles.length=0; dieFaces.length=0;
  Object.assign(paramState.box, defaultBoxParams(), {width:40,height:40,depth:40,
    hookMount:'wall', hookStyle:'bar', hookBar:8, hookReach:28, hookScrewD:4.5, hookPlateT:4,
    hookCradleR:22, hookCradleW:45, hookSlotN:3, hookSlotW:9, hookTrayW:95, hookTrayD:85, hookTrayH:12,
    fnOn:false,pbPart:'none',woBack:'none',mntMode:'none',gearMode:'none',pipMode:'none',psOn:false,
    threadMode:'none',sheetShape:'none',keycapMode:'none',platonic:'none',polyN:0,binRound:0,
    scoopDir:'none',labelTab:'none',mountHoles:'none',gripWall:'none',divX:1,divZ:1,stackFeet:false,gfOn:false}, ov);
  return buildTrisForShape('box',paramState.box); }

// Solid intervals along a ray, counted by DEPTH: these models are interpenetrating closed solids, and
// crossing parity would report the inside of an overlap as hollow.
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
  const runs=[]; let depth=0, start=0;
  for(const [t0,d] of hits){ if(depth===0 && d>0) start=t0; depth+=d; if(depth===0) runs.push([start,t0]); }
  return runs;
}

console.log('=== watertight: every style on every mount ===');
for(const st of ['bar','headphone','brush','soap'])
  for(const m of ['wall','pipe'])
    for(const rb of [3,8,20])
      for(const sd of [0,4.5]){
        const t=base({hookStyle:st,hookMount:m,hookBar:rb,hookScrewD:sd}), mc=manifoldCheck(t,4);
        chk(st+' + '+m+' пруток'+rb+' винт'+sd+' watertight (+vol)', mc.watertight&&vol(t)>0,
            {open:mc.openEdges,bad:mc.badEdges});
      }
for(const ov of [{hookStyle:'headphone',hookCradleR:8,hookCradleW:10},{hookStyle:'headphone',hookCradleR:60,hookCradleW:120},
                 {hookStyle:'brush',hookSlotN:1,hookSlotW:3},{hookStyle:'brush',hookSlotN:8,hookSlotW:30},
                 {hookStyle:'soap',hookTrayW:30,hookTrayD:20,hookTrayH:3},{hookStyle:'soap',hookTrayW:200,hookTrayD:150,hookTrayH:40},
                 {hookStyle:'soap',hookBar:20},{hookStyle:'brush',hookBar:20},{hookStyle:'headphone',hookReach:100}]){
  const t=base(ov), mc=manifoldCheck(t,4);
  chk('extreme '+JSON.stringify(ov)+' watertight', mc.watertight&&vol(t)>0, {open:mc.openEdges,bad:mc.badEdges});
}

console.log('=== the earphone cradle is a saddle, not a bar ===');
// Measured on the FRONT geometry, not the bounding box: the wall plate deliberately grows to cover
// whatever it carries, so the box is the plate's width, not the cradle's.
const frontWidth=(t)=>{ const B=computeBBox(t); let w=0;
  for(const T of t) for(const v of T) if(v[2] > B.minZ+6) w=Math.max(w, Math.abs(v[0])*2);
  return w; };
{ for(const [R,W] of [[15,30],[22,45],[40,90]]){
    const t=base({hookStyle:'headphone',hookCradleR:R,hookCradleW:W});
    chk('R'+R+' W'+W+': the cradle is as wide as asked', Math.abs(frontWidth(t)-W)<0.6,
        {x:+frontWidth(t).toFixed(1), W});
  }
  // the band rests IN a hollow: at the cradle's height a Z-ray finds material, then a gap, then material
  const t=base({hookStyle:'headphone',hookCradleR:22,hookCradleW:45}), B=computeBBox(t);
  let sawCradle=false, widest=0;
  for(let i=1;i<200;i++){ const y=B.minY+(B.maxY-B.minY)*i/200;
    const r=solidRuns(t, 2, 0, y);
    for(let k=0;k+1<r.length;k++){ const g=r[k+1][0]-r[k][1];
      if(g>8 && g<2*22+4){ sawCradle=true; widest=Math.max(widest,g); } } }
  chk('there is an open cradle above the material', sawCradle, {widest:+widest.toFixed(1)});
  chk('and it is about the requested radius across', Math.abs(widest-44)<8, {widest:+widest.toFixed(1)});
}
{ const a=vol(base({hookStyle:'headphone',hookCradleW:30})), b=vol(base({hookStyle:'headphone',hookCradleW:90}));
  chk('a wider saddle is more material', b>a*1.6, {a:+a.toFixed(0),b:+b.toFixed(0)}); }

console.log('=== the brush rack really has slots, and the count is what was asked ===');
for(const n of [1,2,3,5,8]){
  const t=base({hookStyle:'brush',hookSlotN:n,hookSlotW:9}), B=computeBBox(t);
  // across the fingers, out past the spine: n slots means n+1 solid runs
  const z=B.maxZ-2;
  const runs=solidRuns(t, 0, 0, z);
  chk(n+' slots → '+(n+1)+' fingers', runs.length===n+1, {runs:runs.length});
  if(runs.length===n+1){
    const gaps=[]; for(let k=0;k+1<runs.length;k++) gaps.push(runs[k+1][0]-runs[k][1]);
    chk(n+' slots are the requested width', gaps.every(g=>Math.abs(g-9)<0.05), gaps.map(v=>+v.toFixed(2)));
  }
}
{ const narrow=base({hookStyle:'brush',hookSlotW:5}), wide=base({hookStyle:'brush',hookSlotW:20});
  const a=computeBBox(narrow), b=computeBBox(wide);
  chk('wider slots → wider rack', (b.maxX-b.minX) > (a.maxX-a.minX)+40,
      {a:+(a.maxX-a.minX).toFixed(1), b:+(b.maxX-b.minX).toFixed(1)}); }

console.log('=== the soap dish drains ===');
{ const t=base({hookStyle:'soap',hookTrayW:95,hookTrayD:85,hookTrayH:12}), B=computeBBox(t);
  const z=B.minZ+(B.maxZ-B.minZ)*0.5;
  const runs=solidRuns(t, 0, 0, z);                       // across the floor, mid-depth
  chk('the floor is ribs with gaps, not a solid pan', runs.length>=4, {runs:runs.length});
  if(runs.length>=4){
    const gaps=[]; for(let k=0;k+1<runs.length;k++) gaps.push(runs[k+1][0]-runs[k][1]);
    const wide=gaps.filter(g=>g>1.5).length;
    chk('and the gaps are real, not hairlines', wide >= gaps.length-2,
        {wide, of:gaps.length, gaps:gaps.map(v=>+v.toFixed(2))});
  }
  chk('the dish is as wide as asked', Math.abs(frontWidth(t)-95)<0.9, {x:+frontWidth(t).toFixed(1)});
}
{ const lowRim=base({hookStyle:'soap',hookTrayH:4}), highRim=base({hookStyle:'soap',hookTrayH:30});
  const a=computeBBox(lowRim), b=computeBBox(highRim);
  chk('a taller rim makes a taller dish', (b.maxY-b.minY) > (a.maxY-a.minY)+18,
      {a:+(a.maxY-a.minY).toFixed(1), b:+(b.maxY-b.minY).toFixed(1)}); }

console.log('=== the mount is the same one the plain hook uses ===');
for(const st of ['bar','headphone','brush','soap']){
  const withS=vol(base({hookStyle:st,hookScrewD:5})), noS=vol(base({hookStyle:st,hookScrewD:0}));
  chk(st+': the wall plate is drilled, and 0 leaves it whole', withS<noS,
      {withS:+withS.toFixed(0), noS:+noS.toFixed(0)});
  const pipe=base({hookStyle:st,hookMount:'pipe'});
  chk(st+': it also mounts on a pipe', manifoldCheck(pipe,4).watertight && vol(pipe)>0, {});
}
{ // the plate must be at least as wide as what it carries
  for(const st of ['headphone','soap']){
    const t=base({hookStyle:st,hookMount:'wall',hookPlateW:26}), B=computeBBox(t);
    const front=frontWidth(t);
    chk(st+': the plate grew to cover its load', (B.maxX-B.minX) >= front-0.01,
        {plate:+(B.maxX-B.minX).toFixed(1), front:+front.toFixed(1)});
  }
}

console.log('=== the plain J hook is unchanged ===');
{ const t=base({hookStyle:'bar'}), B=computeBBox(t);
  chk('bar still watertight with the documented plate size', manifoldCheck(t,4).watertight &&
      Math.abs((B.maxX-B.minX)-26)<0.6, {x:+(B.maxX-B.minX).toFixed(1)});
  const a=vol(base({hookStyle:'bar',hookCradleR:8,hookSlotN:1,hookTrayW:30}));
  const b=vol(base({hookStyle:'bar',hookCradleR:60,hookSlotN:8,hookTrayW:200}));
  chk('and the new knobs do nothing to it', Math.abs(a-b)<1e-9, {}); }

console.log('\n'+(fail?'FAILED':'ALL PASSED')+': '+pass+' passed, '+fail+' failed');
if(fail) process.exitCode=1;
