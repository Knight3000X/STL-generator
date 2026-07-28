// Battery holder (батарейный холдер): a row of snap-in troughs for cylindrical cells with slotted end
// walls, through the REAL buildTrisForShape pipeline. A holder is only useful if the cell it names really
// fits, so the tests measure the bore, the cavity length and the mouth off the mesh and check them against
// the published cell dimensions. Run via ./run-all.sh.
let pass=0,fail=0; function chk(n,c,e){if(c){pass++;console.log('  OK  ',n);}else{fail++;console.log('  FAIL',n,e!==undefined?JSON.stringify(e):'');}}
function vol(t){let v=0;for(const T of t){const a=T[0],b=T[1],c=T[2];v+=(a[0]*(b[1]*c[2]-b[2]*c[1])-a[1]*(b[0]*c[2]-b[2]*c[0])+a[2]*(b[0]*c[1]-b[1]*c[0]))/6;}return v;}
function base(ov){ logos.length=0; boxHoles.length=0; dieFaces.length=0;
  Object.assign(paramState.box, defaultBoxParams(), {width:40,height:40,depth:40,
    mntMode:'battery', battType:'aa', battN:2, battWall:2.4, battMouth:88, battClear:0.35, battSpring:3,
    mntScrewD:4.5, fitTune:0,
    fnOn:false,pbPart:'none',woBack:'none',hookMount:'none',gearMode:'none',pipMode:'none',psOn:false,
    threadMode:'none',sheetShape:'none',keycapMode:'none',platonic:'none',polyN:0,binRound:0,
    scoopDir:'none',labelTab:'none',mountHoles:'none',gripWall:'none',divX:1,divZ:1,stackFeet:false,gfOn:false}, ov);
  return buildTrisForShape('box',paramState.box); }

const CELL={aaa:[10.5,44.5], aa:[14.5,50.5], c:[26.2,50.0], d:[34.2,61.5], '18650':[18.6,65.2], '21700':[21.2,70.2]};

// Solid intervals along a ray, by DEPTH rather than by parity. The whole app builds bodies out of
// interpenetrating closed solids, so a ray through two overlapping shells sees enter/enter/leave/leave and
// parity would call the middle of the union hollow. Counting +1 on a face whose normal opposes the ray and
// −1 on one that agrees gives a depth that is positive exactly where the union is solid.
function solidRuns(tris, ax, p, q){          // ax: 0=X, 1=Y, 2=Z ray; p,q are the other two coordinates
  const u=(ax+1)%3, v=(ax+2)%3, hits=[];
  for(const T of tris){ const [a,b,c]=T;
    const d1=(b[u]-a[u])*(q-a[v])-(b[v]-a[v])*(p-a[u]);
    const d2=(c[u]-b[u])*(q-b[v])-(c[v]-b[v])*(p-b[u]);
    const d3=(a[u]-c[u])*(q-c[v])-(a[v]-c[v])*(p-c[u]);
    if(!((d1>=0&&d2>=0&&d3>=0)||(d1<=0&&d2<=0&&d3<=0))) continue;
    const A=(b[u]-a[u])*(c[v]-a[v])-(b[v]-a[v])*(c[u]-a[u]); if(Math.abs(A)<1e-12) continue;
    const w1=((b[u]-p)*(c[v]-q)-(b[v]-q)*(c[u]-p))/A, w2=((c[u]-p)*(a[v]-q)-(c[v]-q)*(a[u]-p))/A;
    // normal component along the ray axis, from the triangle's own winding
    const e1=[b[0]-a[0],b[1]-a[1],b[2]-a[2]], e2=[c[0]-a[0],c[1]-a[1],c[2]-a[2]];
    const n=[e1[1]*e2[2]-e1[2]*e2[1], e1[2]*e2[0]-e1[0]*e2[2], e1[0]*e2[1]-e1[1]*e2[0]];
    if(Math.abs(n[ax])<1e-12) continue;
    hits.push([w1*a[ax]+w2*b[ax]+(1-w1-w2)*c[ax], n[ax]<0 ? 1 : -1]);
  }
  hits.sort((A,B)=>A[0]-B[0]);
  const runs=[]; let depth=0, start=0;
  for(const [t0,d] of hits){
    if(depth===0 && d>0) start=t0;
    depth+=d;
    if(depth===0) runs.push([start,t0]);
  }
  return runs;
}
const voids=(runs)=>{ const out=[]; for(let k=0;k+1<runs.length;k++) out.push([runs[k][1], runs[k+1][0]]); return out; };

// One trough, read off the mesh: the bore is the widest void along Z, and the height it happens at is the
// axis; sweeping upward from there the same void narrows to the mouth chord.
function trough(t, D, clr){
  // Above the mouth's rim the inner wall has ended and the same measurement reads the gap between what is
  // left of the OUTER wall, which is wider than the bore. Capping the window at the bore's own theoretical
  // width keeps those readings out — otherwise one of them is mistaken for the axis and everything
  // measured from there is measured from the wrong place.
  const B=computeBBox(t), lim=D+2*clr+0.05;
  let bore=0, axisY=0;
  for(let i=1;i<500;i++){ const y=B.minY+(B.maxY-B.minY)*i/500;
    for(const [z0,z1] of voids(solidRuns(t, 2, 0, y))){ const g=z1-z0;
      if(g>bore && g<lim){ bore=g; axisY=y; } } }
  let mouth=1e9;
  for(let i=1;i<500;i++){ const y=axisY+(B.maxY-axisY)*i/500;
    for(const [z0,z1] of voids(solidRuns(t, 2, 0, y))){ const g=z1-z0;
      if(g>0.5 && g<=bore+0.02 && g<mouth) mouth=g; } }
  return {bore, axisY, mouth: mouth<1e9 ? mouth : NaN};
}
const boreWidth=(t,D,clr)=>trough(t,D,clr).bore;

console.log('=== watertight across cell type × count × wall × mouth × clearance ===');
for(const k of ['aaa','aa','c','d','18650','21700','custom'])
  for(const n of [1,2,4,8]){
    const t=base({battType:k,battN:n}), mc=manifoldCheck(t,4);
    chk(k+' ×'+n+' watertight (+vol)', mc.watertight&&vol(t)>0, {open:mc.openEdges,bad:mc.badEdges});
  }
for(const w of [1.2,2.4,6])
  for(const m of [50,88,98])
    for(const c of [0,0.35,1]){
      const t=base({battWall:w,battMouth:m,battClear:c}), mc=manifoldCheck(t,4);
      chk('ст'+w+' горл'+m+'% зазор'+c+' watertight', mc.watertight&&vol(t)>0, {open:mc.openEdges,bad:mc.badEdges});
    }
for(const ov of [{battSpring:0},{battSpring:12},{mntScrewD:0},{battType:'custom',battD:4,battLen:8},
                 {battType:'custom',battD:60,battLen:140},{fitTune:-0.3},{fitTune:0.5},{battN:8,battType:'d'}]){
  const t=base(ov), mc=manifoldCheck(t,4);
  chk('extreme '+JSON.stringify(ov)+' watertight', mc.watertight&&vol(t)>0, {open:mc.openEdges,bad:mc.badEdges});
}

console.log('=== the named cell actually fits ===');
for(const k of Object.keys(CELL)){
  const [D,L]=CELL[k], t=base({battType:k,battN:1});
  const bore=boreWidth(t, D, 0.35);
  chk(k+': bore = cell Ø + 2 × clearance', Math.abs(bore-(D+0.7))<0.12,
      {bore:+bore.toFixed(2), want:+(D+0.7).toFixed(2)});
  // Measured OFF the axis: on the axis the ray goes straight out through the contact slots, which is
  // exactly what they are for.
  const tr=trough(t, D, 0.35);
  const cav=solidRuns(t, 0, tr.axisY, 0.4*D);   // beside the slot, still inside the bore
  chk(k+': the cavity is the cell plus the spring allowance',
      cav.length===2 && Math.abs((cav[1][0]-cav[0][1])-(L+3))<0.2,
      {got:cav.length===2?+(cav[1][0]-cav[0][1]).toFixed(2):null, want:L+3});
}
for(const clr of [0,0.35,1]){
  const bore=boreWidth(base({battType:'aa',battN:1,battClear:clr}), 14.5, clr);
  chk('зазор '+clr+' shows up in the bore', Math.abs(bore-(14.5+2*clr))<0.12, {bore:+bore.toFixed(2)});
}
{ const a=boreWidth(base({battType:'aa',battN:1,battClear:0.2,fitTune:0}), 14.5, 0.2);
  const b=boreWidth(base({battType:'aa',battN:1,battClear:0.2,fitTune:0.4}), 14.5, 0.6);
  chk('global fitTune reaches the holder', Math.abs((b-a)-0.8)<0.12, {a:+a.toFixed(2),b:+b.toFixed(2)}); }
{ const t=base({battType:'custom',battD:20,battLen:60,battN:1});
  chk('a custom cell is honoured', Math.abs(boreWidth(t,20,0.35)-20.7)<0.12, {bore:+boreWidth(t,20,0.35).toFixed(2)}); }

console.log('=== the mouth is narrower than the cell, which is what retains it ===');
for(const pct of [60,88,98]){
  const tr=trough(base({battType:'aa',battN:1,battMouth:pct}), 14.5, 0.35);
  const want=(14.5+0.7)*pct/100;
  chk('горловина '+pct+'% is that fraction of the bore', Math.abs(tr.mouth-want)<0.6,
      {mouth:+tr.mouth.toFixed(2), want:+want.toFixed(2)});
  chk('горловина '+pct+'% is narrower than the cell', tr.mouth < 14.5+0.7, {mouth:+tr.mouth.toFixed(2)});
}

console.log('=== a row of cells shares walls instead of standing apart ===');
{ const one=computeBBox(base({battType:'aa',battN:1})), four=computeBBox(base({battType:'aa',battN:4}));
  const w1=one.maxZ-one.minZ, w4=four.maxZ-four.minZ;
  chk('four cells take less room than four separate holders', w4 < 4*w1-3,
      {one:+w1.toFixed(1), four:+w4.toFixed(1)});
  chk('but they are not crushed together either', w4 > 3.4*(14.5+0.7)/2,
      {four:+w4.toFixed(1)}); }
{ const a=vol(base({battN:1})), b=vol(base({battN:2}));
  chk('more cells → more material', b>a*1.5, {a:+a.toFixed(0),b:+b.toFixed(0)}); }
{ const t=base({battN:3,battType:'aa'}), B=computeBBox(t);
  let n=0;
  for(let i=1;i<400;i++){ const y=B.minY+(B.maxY-B.minY)*i/400;
    let c=0; for(const [z0,z1] of voids(solidRuns(t, 2, 0, y))){ const g=z1-z0; if(g>14.0 && g<15.3) c++; }
    n=Math.max(n,c); }
  chk('three cells → three bores', n===3, {n}); }

console.log('=== the end walls carry contact slots ===');
{ const t=base({battType:'aa',battN:1}), tr=trough(t, 14.5, 0.35);
  const axial=solidRuns(t, 0, tr.axisY, 0);
  chk('the contact slot leaves the axis open end to end', axial.length===0, {runs:axial.length});
  const xs=solidRuns(t, 0, tr.axisY, 0.4*14.5);
  chk('and beside the slot both end walls are solid', xs.length===2, {runs:xs.length});
  if(xs.length===2) chk('the walls are the requested thickness',
      Math.abs((xs[0][1]-xs[0][0])-2.4)<0.05 && Math.abs((xs[1][1]-xs[1][0])-2.4)<0.05,
      {a:+(xs[0][1]-xs[0][0]).toFixed(2), b:+(xs[1][1]-xs[1][0]).toFixed(2)}); }
{ const thin=vol(base({battWall:1.2})), thick=vol(base({battWall:6}));
  chk('a thicker wall adds material', thick>thin*1.4, {thin:+thin.toFixed(0),thick:+thick.toFixed(0)}); }
{ const withT=vol(base({mntScrewD:5})), noT=vol(base({mntScrewD:0}));
  chk('mounting tabs appear with a screw Ø and vanish at 0', withT>noT, {withT:+withT.toFixed(0),noT:+noT.toFixed(0)}); }

console.log('=== the other mount modes are untouched ===');
for(const m of ['lbracket','vesa','boss','tool','pipe','foot','fittest','dovetail','temptower','bridgetest','retract']){
  const t=base({mntMode:m}), mc=manifoldCheck(t,4);
  chk(m+' still watertight', mc.watertight&&vol(t)>0, {open:mc.openEdges,bad:mc.badEdges});
}
{ const a=vol(base({mntMode:'lbracket',battN:1})), b=vol(base({mntMode:'lbracket',battN:8}));
  chk('the holder knobs do nothing to the L-bracket', Math.abs(a-b)<1e-9, {}); }

console.log('\n'+(fail?'FAILED':'ALL PASSED')+': '+pass+' passed, '+fail+' failed');
if(fail) process.exitCode=1;
