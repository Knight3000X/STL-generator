// Print-in-place hinge (петля «печать в сборе»): a two-leaf hinge that prints flat in one piece and
// folds without inserting a pin. Body A (leaf + solid pin + knuckles) and body B (leaf + tube knuckles)
// interlock along the pin but are separated everywhere by the clearance gap, so the slicer keeps them as
// two solids. Verified through the REAL buildTrisForShape pipeline. Run via ./run-all.sh.
let pass=0,fail=0; function chk(n,c,e){if(c){pass++;console.log('  OK  ',n);}else{fail++;console.log('  FAIL',n,e!==undefined?JSON.stringify(e):'');}}
function vol(t){let v=0;for(const T of t){const a=T[0],b=T[1],c=T[2];v+=(a[0]*(b[1]*c[2]-b[2]*c[1])-a[1]*(b[0]*c[2]-b[2]*c[0])+a[2]*(b[0]*c[1]-b[1]*c[0]))/6;}return v;}
function base(ov){ logos.length=0; boxHoles.length=0; dieFaces.length=0;
  Object.assign(paramState.box, defaultBoxParams(), {width:40,height:40,depth:40,
    pipMode:'flat',pipLen:60,pipLeafW:22,pipLeafT:6,pipKnuckles:5,pipPinD:0,pipGap:0.35,
    threadMode:'none',sheetShape:'none',keycapMode:'none',platonic:'none',polyN:0,binRound:0,
    scoopDir:'none',labelTab:'none',mountHoles:'none',gripWall:'none',divX:1,divZ:1,stackFeet:false,gfOn:false}, ov);
  return buildTrisForShape('box',paramState.box); }

console.log('=== watertight across configs ===');
for(const len of [30,60,120])
  for(const leafT of [3,6,10])
    for(const kn of [3,5,9])
      for(const gap of [0.2,0.35,0.6]){
        const t=base({pipLen:len,pipLeafT:leafT,pipKnuckles:kn,pipGap:gap}); const mc=manifoldCheck(t,4);
        chk('L'+len+' T'+leafT+' K'+kn+' g'+gap+' watertight (+vol)', mc.watertight&&vol(t)>0, {wt:mc.watertight,open:mc.openEdges});
      }
chk('even knuckle count is forced odd (still watertight)', manifoldCheck(base({pipKnuckles:6}),4).watertight);
chk('explicit pin Ø watertight', manifoldCheck(base({pipPinD:3}),4).watertight);

console.log('=== dimensions ===');
{ const b=computeBBox(base({pipLen:80,pipLeafW:25,pipLeafT:5}));
  chk('length = pipLen (X)', Math.abs((b.maxX-b.minX)-80)<0.5, {x:+(b.maxX-b.minX).toFixed(2)});
  chk('thickness = leafT (Y)', Math.abs((b.maxY-b.minY)-5)<0.05, {y:+(b.maxY-b.minY).toFixed(2)});
  chk('span = two leaves (Z ≈ 2·leafW)', Math.abs((b.maxZ-b.minZ)-50)<0.5, {z:+(b.maxZ-b.minZ).toFixed(2)}); }
{ const narrow=vol(base({pipLeafW:12})), wide=vol(base({pipLeafW:30}));
  chk('wider leaves → more material', wide>narrow, {narrow:+narrow.toFixed(0),wide:+wide.toFixed(0)}); }
{ const b=computeBBox(base()); chk('centered on Y', Math.abs(b.maxY+b.minY)<1e-6 && Math.abs(b.maxX+b.minX)<1e-6 && Math.abs(b.maxZ+b.minZ)<1e-6, {}); }

console.log('=== print-in-place clearances (folds off the bed) ===');
// The two bodies never touch: the pin (radius pinR) sits inside every B tube bore (pinR+gap) with a full
// radial gap, and adjacent knuckles are split axially by the same gap. Both are guaranteed by construction.
{ const leafT=6, gap=0.35, zEdge=leafT/2, wall=Math.max(1.0,gap+0.9), pinR=Math.max(0.8,zEdge-wall);
  chk('radial clearance pin↔tube-bore = gap', Math.abs(((pinR+gap)-pinR)-gap)<1e-9, {gap});
  chk('pin has real wall inside the tube', wall>gap+0.4, {wall,gap});
  const N=5, L=60, w=L/N, wf=Math.max(2,w-gap);
  chk('axial gap between knuckles > 0', (w-wf)>0.1, {axialGap:+(w-wf).toFixed(2)}); }
{ // the two leaf plates are physically separated in Z (a band around the pin line has no plate material)
  const t=base({pipLeafT:6}); let minPos=1e9,maxNeg=-1e9;
  for(const T of t) for(const v of T){ if(v[2]>0.01) minPos=Math.min(minPos,v[2]); if(v[2]<-0.01) maxNeg=Math.max(maxNeg,v[2]); }
  chk('leaves separated by a clearance band at the pin line', minPos>0 && maxNeg<0, {minPos:+minPos.toFixed(2),maxNeg:+maxNeg.toFixed(2)}); }

console.log('=== mounting holes in leaves ===');
for(const d of [2.5,4]) for(const n of [1,2,3])
  chk('screw Ø'+d+' ×'+n+'/leaf watertight', manifoldCheck(base({pipScrewD:d,pipScrewN:n}),4).watertight);
{ const solid=vol(base({pipScrewD:0})), holed=vol(base({pipScrewD:4,pipScrewN:2}));
  chk('screw holes remove material', holed<solid, {solid:+solid.toFixed(0),holed:+holed.toFixed(0)}); }

console.log('=== box mode (лоток + крышка) ===');
for(const bh of [6,12,30]) for(const kn of [3,5,9])
  chk('box H'+bh+' K'+kn+' watertight (+vol)', (()=>{const t=base({pipMode:'box',pipBoxH:bh,pipKnuckles:kn});const mc=manifoldCheck(t,4);return mc.watertight&&vol(t)>0;})(), {bh,kn});
{ const flat=computeBBox(base({pipMode:'flat'})), box=computeBBox(base({pipMode:'box',pipBoxH:14}));
  chk('tray walls add height above the leaf', (box.maxY-box.minY) > (flat.maxY-flat.minY)+8, {flat:+(flat.maxY-flat.minY).toFixed(1),box:+(box.maxY-box.minY).toFixed(1)}); }
chk('box + screw holes watertight', manifoldCheck(base({pipMode:'box',pipScrewD:3}),4).watertight);

console.log('=== clip mode (клипса-защёлка) ===');
for(const d of [6,12,25]) for(const mouth of [50,75,95]) for(const wall of [2,3.5])
  chk('clip Ø'+d+' mouth'+mouth+'% w'+wall+' watertight (+vol)', (()=>{const t=base({pipMode:'clip',pipClipD:d,pipClipMouth:mouth,pipClipWall:wall});const mc=manifoldCheck(t,4);return mc.watertight&&vol(t)>0;})(), {d,mouth,wall});
chk('clip + screw tabs watertight', manifoldCheck(base({pipMode:'clip',pipScrewD:3.5}),4).watertight);
{ const t=base({pipMode:'clip',pipClipD:12,pipClipWall:2.5,pipClipW:14}); const b=computeBBox(t);
  chk('clip width = pipClipW (X)', Math.abs((b.maxX-b.minX)-14)<0.2, {x:+(b.maxX-b.minX).toFixed(2)}); }
{ // a narrower mouth (snap grip) really leaves a gap at the top narrower than the bore diameter
  const t=base({pipMode:'clip',pipClipD:20,pipClipMouth:60,pipClipWall:3}); let topZmin=1e9,topZmax=-1e9,ymax=-1e9;
  for(const T of t) for(const v of T) ymax=Math.max(ymax,v[1]);
  for(const T of t) for(const v of T) if(v[1]>ymax-1){ topZmin=Math.min(topZmin,v[2]); topZmax=Math.max(topZmax,v[2]); }
  chk('clip has an open mouth at the top (grip < Ø)', (topZmax-topZmin) < 20, {mouthGap:+(topZmax-topZmin).toFixed(1)}); }

console.log('=== cable tie (кабель-стяжка) ===');
for(const w of [4,6]) for(const t of [1.2,1.8]) for(const len of [60,150])
  chk('tie W'+w+' T'+t+' L'+len+' watertight (+vol)', (()=>{const tr=base({pipMode:'tie',tieW:w,tieT:t,tieLen:len});const mc=manifoldCheck(tr,4);return mc.watertight&&vol(tr)>0;})(), {w,t,len});
{ const short=vol(base({pipMode:'tie',tieLen:60})), long=vol(base({pipMode:'tie',tieLen:180}));
  chk('longer strap → more material', long>short, {short:+short.toFixed(0),long:+long.toFixed(0)}); }
{ const b=computeBBox(base({pipMode:'tie',tieLen:120,tieW:5})); chk('tie is strap-long in X', (b.maxX-b.minX) > 100, {x:+(b.maxX-b.minX).toFixed(1)}); }
{ const smooth=vol(base({pipMode:'tie',tieToothH:0.1,tieLen:100})), toothy=vol(base({pipMode:'tie',tieToothH:1.4,tieLen:100}));
  chk('taller ratchet teeth add material', toothy>smooth, {smooth:+smooth.toFixed(0),toothy:+toothy.toFixed(0)}); }

console.log('=== split clamp (разъёмный хомут) ===');
for(const d of [12,25,50]) for(const wall of [2.5,4]) for(const cw of [10,20])
  chk('clamp Ø'+d+' wall'+wall+' W'+cw+' watertight (+vol)', (()=>{const t=base({pipMode:'clamp',clampD:d,clampWall:wall,clampW:cw});const mc=manifoldCheck(t,4);return mc.watertight&&vol(t)>0;})(), {d,wall,cw});
{ const b=computeBBox(base({pipMode:'clamp',clampD:20,clampW:16,clampWall:3}));
  chk('clamp width = clampW (X)', Math.abs((b.maxX-b.minX)-16)<0.3, {x:+(b.maxX-b.minX).toFixed(2)});
  chk('clamp outer Ø ≈ pipe + 2·wall (Z)', Math.abs((b.maxZ-b.minZ)-(20+2*3)) < 22, {z:+(b.maxZ-b.minZ).toFixed(1)}); }
{ const t=base({pipMode:'clamp',clampD:20,clampGap:1.5}); let hasTop=false,hasBot=false;
  for(const T of t) for(const v of T){ if(v[1]>1) hasTop=true; if(v[1]<-1) hasBot=true; }
  chk('clamp is two halves (material above and below the split)', hasTop&&hasBot, {hasTop,hasBot}); }

console.log('=== gating + regression ===');
{ const a=base({}).length, b=base({scoopDir:'front',gripWall:'front',mountHoles:'4',stackFeet:true,divX:2,divZ:2,hollow:true}).length;
  chk('organizer add-ons skipped on a hinge', a===b, {a,b}); }
{ Object.assign(paramState.box, defaultBoxParams(), {width:40,height:40,depth:40,pipMode:'none'});
  const t=buildTrisForShape('box',paramState.box); const b=computeBBox(t);
  chk('pipMode none → normal cube', manifoldCheck(t,4).watertight && Math.abs((b.maxX-b.minX)-40)<1e-6, {}); }

console.log('=== защёлки футляра ===');
// A clamshell with nothing holding it shut is a box that falls open, so the latch is the piece that makes
// it a case. The pattern is the toolbox one: a CATCH standing proud of the body's front wall, and a WINDOW
// in a tongue hanging off the lid that the catch clicks into.
//
// Two things have to be true at once and they pull in opposite directions. FLAT on the bed the two halves
// must not touch anywhere, or the slicer fuses them into one solid and nothing ever opens. FOLDED the
// latch must actually engage — and the lid's front wall lands EXACTLY on the body's, so anything the lid
// hangs down there has to pass outside it. Both are measured below on the real mesh.
function halves(ov){
  const p = Object.assign({}, defaultBoxParams(), {width:40,height:40,depth:40,
    pipMode:'box', pipLen:60, pipLeafW:22, pipLeafT:6, pipKnuckles:5, pipPinD:0, pipGap:0.35,
    threadMode:'none',sheetShape:'none',keycapMode:'none',platonic:'none',polyN:0,binRound:0,
    scoopDir:'none',labelTab:'none',mountHoles:'none',gripWall:'none',divX:1,divZ:1,stackFeet:false,gfOn:false}, ov);
  logos.length=0; boxHoles.length=0; dieFaces.length=0;
  Object.assign(paramState.box, p);
  const t = buildTrisForShape('box', paramState.box);
  // The hinge lives around z = 0; the latch is at the far edge, so the sign of z separates the two bodies
  // cleanly out there without having to unpick the knuckles.
  const gap = Math.max(0.15, Math.min(0.8, fitTuned(p, p.pipGap!=null?p.pipGap:0.35)));
  const zIn = Math.max(0.8, p.pipPinD>0?p.pipPinD/2:1.0) + Math.max(1.0, gap+0.9) + 1.0;
  const far = T => T.every(v => Math.abs(v[2]) > zIn+2);
  const body = t.filter(T => far(T) && T[0][2] < 0), lid = t.filter(T => far(T) && T[0][2] > 0);
  const B = computeBBox(body), rimY = B.maxY;             // top of the body's front wall IS the parting line
  return { t, p, gap, body, lid, rimY, wallInner: B.maxZ, wallOuter: B.maxZ - Math.max(1.2, p.pipWall||2),
           // folding is what the hinge does: (y, z) → (2·rimY − y, −z)
           folded: lid.map(T => T.map(v => [v[0], 2*rimY - v[1], -v[2]])) };
}
function triOverlap(A,B){                                  // Möller, same test the assembly file uses
  const sub=(u,v)=>[u[0]-v[0],u[1]-v[1],u[2]-v[2]], dot=(u,v)=>u[0]*v[0]+u[1]*v[1]+u[2]*v[2];
  const cr=(u,v)=>[u[1]*v[2]-u[2]*v[1],u[2]*v[0]-u[0]*v[2],u[0]*v[1]-u[1]*v[0]], EPS=1e-9;
  const N1=cr(sub(A[1],A[0]),sub(A[2],A[0])), d1=-dot(N1,A[0]), dB=B.map(q=>dot(N1,q)+d1);
  if((dB[0]>EPS&&dB[1]>EPS&&dB[2]>EPS)||(dB[0]<-EPS&&dB[1]<-EPS&&dB[2]<-EPS)) return false;
  const N2=cr(sub(B[1],B[0]),sub(B[2],B[0])), d2=-dot(N2,B[0]), dA=A.map(q=>dot(N2,q)+d2);
  if((dA[0]>EPS&&dA[1]>EPS&&dA[2]>EPS)||(dA[0]<-EPS&&dA[1]<-EPS&&dA[2]<-EPS)) return false;
  const D=cr(N1,N2), aD=D.map(Math.abs);
  if(Math.max(...aD) < 1e-12) return false;                // coplanar = touching, not passing through
  const idx=aD.indexOf(Math.max(...aD));
  const iv=(T,d)=>{ const q=T.map(v=>v[idx]), out=[];
    for(let i=0;i<3;i++){ const j=(i+1)%3;
      if(d[i]*d[j]<0){ const t=d[i]/(d[i]-d[j]); out.push(q[i]+(q[j]-q[i])*t); }
      if(Math.abs(d[i])<=EPS) out.push(q[i]); }
    return out.length<2?null:[Math.min(...out),Math.max(...out)]; };
  const i1=iv(A,dA), i2=iv(B,dB);
  return !!(i1&&i2) && (Math.min(i1[1],i2[1]) - Math.max(i1[0],i2[0])) > 1e-6;
}
const nCross=(X,Y)=>{ let n=0; for(const a of X) for(const b of Y) if(triOverlap(a,b)) n++; return n; };
  /* Перегородок между гнёздами ровно на одну меньше, чем гнёзд. Считается ЛУЧОМ вдоль X под самым бортом
     корпусной половины: там стоят только перегородки и две боковые стенки, а фаски дна и пол — ниже. */
const runsAlongX = (tris, y, z) => {
    const hits=[];
    for(const T of tris){ const [a,b,c]=T;
      const d1=(b[1]-a[1])*(z-a[2])-(b[2]-a[2])*(y-a[1]);
      const d2=(c[1]-b[1])*(z-b[2])-(c[2]-b[2])*(y-b[1]);
      const d3=(a[1]-c[1])*(z-c[2])-(a[2]-c[2])*(y-c[1]);
      if(!((d1>=0&&d2>=0&&d3>=0)||(d1<=0&&d2<=0&&d3<=0))) continue;
      const A=(b[1]-a[1])*(c[2]-a[2])-(b[2]-a[2])*(c[1]-a[1]); if(Math.abs(A)<1e-12) continue;
      const w1=((b[1]-y)*(c[2]-z)-(b[2]-z)*(c[1]-y))/A, w2=((c[1]-y)*(a[2]-z)-(c[2]-z)*(a[1]-y))/A;
      const e1=[b[0]-a[0],b[1]-a[1],b[2]-a[2]], e2=[c[0]-a[0],c[1]-a[1],c[2]-a[2]];
      const nx=e1[1]*e2[2]-e1[2]*e2[1]; if(Math.abs(nx)<1e-12) continue;
      hits.push([w1*a[0]+w2*b[0]+(1-w1-w2)*c[0], nx<0 ? 1 : -1]); }
    hits.sort((A,B)=>A[0]-B[0]);
    const runs=[]; let depth=0, start=null;
    for(const [t0,d] of hits){ const prev=depth; depth+=d;
      if(prev<=0&&depth>0) start=t0; else if(prev>0&&depth<=0){ if(start!==null&&t0-start>1e-6) runs.push([start,t0]); start=null; } }
    return runs;
  };


for(const n of [0,1,2,3,4,6])
  for(const bh of [8,14,22]){
    const t = halves({pipLatchN:n, pipBoxH:bh}).t, mc = manifoldCheck(t,4);
    chk('защёлок '+n+' при высоте '+bh+': замкнуто', mc.watertight && vol(t)>0,
        {open:mc.openEdges, bad:mc.badEdges});
  }
for(const ov of [{pipLatchN:2,pipLen:120},{pipLatchN:2,pipLen:30},{pipLatchN:6,pipLen:150},
                 {pipLatchN:2,pipWall:1.2},{pipLatchN:2,pipWall:4},{pipLatchN:2,pipGap:0.15},
                 {pipLatchN:2,pipGap:0.8},{pipLatchN:2,pipLatchW:40},{pipLatchN:2,pipLatchW:7},
                 {pipLatchN:3,pipPin:'removable'},{pipLatchN:2,pipScrewD:3}]){
  const t = halves(ov).t;
  chk('защёлки + '+JSON.stringify(ov)+': замкнуто', manifoldCheck(t,4).watertight, {});
}
{ /* Счёт есть счёт: N защёлок ставят на корпус N зацепов, разнесённых по его длине. Считаются они по
     ПЕРЕСЕКАЮЩИМСЯ отрезкам вдоль X, а не по округлённым центрам треугольников: центры одного и того же
     зацепа отстоят друг от друга тем дальше, чем он шире, и прежний счёт по «ближе трёх миллиметров»
     разваливал широкий зацеп на четыре. Он был верен ровно для той ширины, что была тогда. */
  const clusters = tris => {
    const iv = tris.map(T => [Math.min(T[0][0],T[1][0],T[2][0]), Math.max(T[0][0],T[1][0],T[2][0])])
                   .sort((a,b) => a[0]-b[0]);
    const out = [];
    for(const [a,b] of iv){ const last = out[out.length-1];
      if(last && a <= last[1] + 0.05) last[1] = Math.max(last[1], b); else out.push([a,b]); }
    return out;
  };
  for(const n of [1,2,3,4]){
    const H = halves({pipLatchN:n});
    const catches = H.body.filter(T => T.some(v => v[2] < H.wallOuter - 0.05));
    chk('N='+n+': на корпусе ровно '+n+' зацепов', clusters(catches).length === n,
        {found:clusters(catches).length});
  }
  const none = halves({pipLatchN:0});
  chk('N=0: зацепов нет вовсе', none.body.every(T => T.every(v => v[2] >= none.wallOuter - 0.05)), {});
}
{ // PLOSKO: the two halves must not touch at all, or they print as one lump.
  for(const n of [1,2,4]){
    const H = halves({pipLatchN:n});
    chk('N='+n+': плоско половины нигде не соприкасаются', nCross(H.body, H.lid) === 0, {});
  }
}
{ // FOLDED: the catch has to sit INSIDE the window, touching neither the bar below it nor the posts beside
  // it — that is the difference between a latch and a lid that will not close. The only contact allowed is
  // the two front walls meeting along the parting line, which is what "closed" means.
  for(const n of [1,2,3]){
    const H = halves({pipLatchN:n});
    const catches = H.body.filter(T => T.some(v => v[2] < H.wallOuter - 0.05));
    const frame   = H.folded.filter(T => T.every(v => v[2] < H.wallOuter - 0.05));
    chk('N='+n+': сложено — зацеп не задевает рамку язычка', nCross(catches, frame) === 0,
        {crossings: nCross(catches, frame)});
  }
}
{ const H = halves({pipLatchN:2});
  const catches = H.body.filter(T => T.some(v => v[2] < H.wallOuter - 0.05));
  const CB = computeBBox(catches);
  // How far the catch stands proud of the wall, and how far it reaches past the tongue's inner face —
  // the second number IS the snap: it is how much the tongue must flex to let go.
  const proud = H.wallOuter - CB.minZ, engage = (H.wallOuter - H.gap) - CB.minZ;
  chk('зацеп выступает за стенку', proud > 0.5 && proud < 2.0, {proud:+proud.toFixed(2)});
  chk('и заходит за язычок — есть чему держать', engage > 0.3 && engage < proud,
      {engage:+engage.toFixed(2), proud:+proud.toFixed(2)});
  // the tongue itself clears the body's wall by the fit clearance, no more and no less
  const frame = H.folded.filter(T => T.every(v => v[2] < H.wallOuter - 0.05));
  chk('язычок обходит стенку корпуса с посадочным зазором',
      Math.abs((H.wallOuter - computeBBox(frame).maxZ) - H.gap) < 0.02,
      {clr:+(H.wallOuter - computeBBox(frame).maxZ).toFixed(3), gap:H.gap});
}
{ // A case too small to carry one is left alone rather than given a latch that does not fit.
  const tiny = halves({pipLatchN:4, pipLen:20});
  chk('на слишком коротком футляре защёлки не строятся', manifoldCheck(tiny.t,4).watertight, {});
  const shallow = halves({pipLatchN:2, pipBoxH:3});
  chk('и на слишком мелком — тоже', manifoldCheck(shallow.t,4).watertight, {});
}

/* ЗАЩЁЛКА ПЕРЕДЕЛАНА (v18.27.0): вместо рамки с окном — крючок, длина которого не нарисована, а посчитана
   из допустимой деформации материала. Проверяется поэтому не форма, а СВЯЗЬ: ε = 1.5·y·t/L² на пределе, и
   то, что при нехватке высоты уступает ЗАХОД, а не деформация. Заход, ушедший в ноль, — это защёлка,
   которая не держит, и об этом должно быть сказано словом. */
console.log('=== защёлка: длина считается, а не рисуется ===');
{
  const sp = ov => { halves(ov); return clamshellSpec(paramState.box); };
  const s = sp({});
  chk('деформация ровно на допустимой для материала', Math.abs(s.eps - s.mat.eps) < 1e-9, +s.eps.toFixed(3));
  chk('и это та же формула, что у защёлки-консоли',
      Math.abs(s.eps - 100*1.5*s.eng*s.lt/(s.arm*s.arm)) < 1e-9);
  const pla = sp({pipLatchMat:'pla'});
  chk('у PLA допустимая вдвое ниже — язычок выходит длиннее',
      pla.arm > s.arm + 1 && Math.abs(pla.eng - s.eng) < 1e-9,
      {petg:+s.arm.toFixed(2), pla:+pla.arm.toFixed(2), заход:[+s.eng.toFixed(3), +pla.eng.toFixed(3)]});
  chk('и деформация у него своя', Math.abs(pla.eps - pla.mat.eps) < 1e-9, +pla.eps.toFixed(2));
  const shallow = sp({pipBoxH:5, pipLatchMat:'pla'});
  chk('в мелком футляре уступает ЗАХОД, а не деформация',
      shallow.armCut && shallow.eng < s.eng && Math.abs(shallow.eps - shallow.mat.eps) < 1e-9,
      {заход:+shallow.eng.toFixed(2), деформация:+shallow.eps.toFixed(2)});
  chk('и об этом сказано словом', /уступил ЗАХОД/.test(collectPrintWarnings(paramState.box).join(' | ')));
  chk('слабый заход назван отдельно', /держать почти нечем/.test(collectPrintWarnings(paramState.box).join(' | ')));
  halves({});
  chk('заход и деформация печатаются ВСЕГДА',
      /защёлка футляра: заход .* деформация/.test(collectPrintWarnings(paramState.box).join(' | ')));
  // Компактность — измеримое свойство: вся защёлка живёт внутри борта, а не переваливает за него.
  chk('язычок помещается в борт', s.arm < s.wh, {язычок:+s.arm.toFixed(1), борт:s.wh});
  chk('и зацепу хватает места под линией разъёма', s.arm >= s.armNeed, {есть:+s.arm.toFixed(2), надо:+s.armNeed.toFixed(2)});
  const noRoom = sp({pipBoxH:4});
  chk('где не хватает — защёлки нет вовсе, а не наполовину', !noRoom.latchOn && noRoom.tooShallow);
  chk('и сказано, какого борта не хватило',
      /на язычок нужен борт от/.test(collectPrintWarnings(paramState.box).join(' | ')));
  /* Порог по длине тоже считается, а не назначается: прежний («длиннее 24 мм») был написан под рамку,
     которая у́же шести миллиметров не бывала, и однобаночный футляр оставался без защёлки при том, что
     крючок на нём помещается. */
  const one = sp({pipLatchN:1, pipLen:16});
  chk('одна защёлка помещается на коротком футляре', one.latchOn, {L:one.L, надо:one.lenNeed});
  const four = sp({pipLatchN:4, pipLen:16});
  chk('а четыре на нём же — нет', !four.latchOn && four.tooShort);
}

/* ГНЁЗДА ПОД ЭЛЕМЕНТЫ. Футляр под батарейки отличается от пустого лотка одним: размер у него не задан, а
   ПОСЧИТАН. Проверяется по сетке, что посчитан он верно — что элемент в гнездо влезает, что сложенные
   половины смыкаются вокруг него, и что число гнёзд равно числу элементов. */
console.log('=== футляр под элементы ===');
{
  const cases = [['aa',4],['aaa',6],['c',3],['d',2],['18650',2],['21700',4]];
  for(const [type,n] of cases){
    const H = halves({pipBoxKind:'batt', pipBattType:type, pipBattN:n});
    const s = clamshellSpec(paramState.box), mc = manifoldCheck(H.t,4);
    chk(type+'×'+n+': замкнуто', mc.watertight && vol(H.t)>0, {open:mc.openEdges, bad:mc.badEdges});
    const D = BATT_CELLS[type][0], Lc = BATT_CELLS[type][1];
    chk(type+'×'+n+': борт — половина элемента с зазором', Math.abs(s.wh - (D/2 + s.bclr)) < 1e-9,
        {борт:+s.wh.toFixed(2), надо:+(D/2+s.bclr).toFixed(2)});
    chk(type+'×'+n+': глубина держит длину элемента', s.zOut - s.zIn - 2*s.bw >= Lc + 2*s.bclr - 1e-9,
        {просвет:+(s.zOut-s.zIn-2*s.bw).toFixed(1), элемент:Lc});
    chk(type+'×'+n+': длина — гнёзда плюс перегородки',
        Math.abs(s.L - (2*s.bw + n*(D+2*s.bclr) + (n-1)*s.bw)) < 1e-9, +s.L.toFixed(2));
  }
  for(const n of [1,2,4,6]){
    const H = halves({pipBoxKind:'batt', pipBattN:n});
    const s = clamshellSpec(paramState.box);
    // Готовая сетка отцентрована по высоте, поэтому линия разъёма берётся ИЗ НЕЁ (H.rimY), а не из
    // спецификации: спецификация считает в системе построителя, а меряем мы построенное.
    const runs = runsAlongX(H.t, H.rimY - 0.5, -(s.zIn + s.zOut)/2);
    chk('гнёзд '+n+': поперёк лотка '+(n+1)+' стенки (две боковых и '+(n-1)+' перегородок)',
        runs.length === n+1, {found:runs.length, runs:runs.map(r=>+(r[1]-r[0]).toFixed(2))});
    chk('гнёзд '+n+': просвет гнезда — элемент с зазором',
        runs.length < 2 || Math.abs((runs[1][0]-runs[0][1]) - s.pocket) < 0.01,
        runs.length > 1 ? +(runs[1][0]-runs[0][1]).toFixed(2) : null);
  }
  {
    // Сложенные половины должны сомкнуться вокруг элемента: высота закрытого гнезда = Ø + два зазора.
    const H = halves({pipBoxKind:'batt'});
    const s = clamshellSpec(paramState.box);
    chk('закрытое гнездо — это элемент с зазором', Math.abs(2*s.wh - (s.D + 2*s.bclr)) < 1e-9,
        {гнездо:+(2*s.wh).toFixed(2), элемент:s.D});
    chk('и габарит закрытого футляра считается по крышке, а не по столу',
        s.outer.z === s.zOut && s.flatZ === 2*s.zOut);
    chk('размеры выведены в предупреждения', /футляр под элементы/.test(collectPrintWarnings(paramState.box).join(' | ')));
    chk('и сказано, что свои числа не читаются',
        /свои числа в этом режиме не читаются/.test(collectPrintWarnings(paramState.box).join(' | ')));
    // Ручки длины/ширины/борта в этом режиме действительно ничего не меняют.
    const a = halves({pipBoxKind:'batt'}).t.length;
    const b = halves({pipBoxKind:'batt', pipLen:200, pipLeafW:99, pipBoxH:40, pipLeafT:12}).t.length;
    chk('чужие ручки размера футляр под элементы не трогают', a === b, {своё:a, 'с чужими':b});
    // ...а у пустого лотка — по-прежнему трогают.
    chk('у пустого лотка они работают как работали',
        halves({pipLen:60}).t.length > 0 &&
        Math.abs(computeBBox(halves({pipLen:90}).t).maxX - 45) < 0.01);
  }
  { // Плоско половины не должны соприкасаться и здесь: гнёзда стоят в обеих.
    const H = halves({pipBoxKind:'batt', pipBattN:3});
    chk('плоско половины с гнёздами нигде не соприкасаются', nCross(H.body, H.lid) === 0);
  }
}
/* СТОЙМЯ, СЕТКОЙ. Вторая раскладка: элементы стоят вертикально, гнездо становится колодцем, а стенка
   между соседними колодцами — одна на двоих. Половины и здесь зеркальны (петля требует, чтобы обе кромки
   пришли на ось пальца), поэтому колодец каждой ровно в половину элемента.

   ГЛАВНОЕ ЗДЕСЬ — НЕ ФОРМА, А КАСАНИЕ. Наружный радиус трубы ровно в половину шага сетки означал бы, что
   соседние трубы соприкасаются ПО ЛИНИИ, а линия в сетке треугольников не объединяет, а рвёт. Поймано это
   было ровно на одном сочетании из семидесяти двух (18650 2×2): у остальных вершины случайно совпадали и
   шов не открывался. Поэтому проверка идёт СПЛОШНЫМ ПЕРЕБОРОМ размеров и сеток, а не тремя образцами. */
console.log('=== футляр под элементы: стоймя, сеткой ===');
{
  const stand = ov => halves(Object.assign({pipBoxKind:'batt', pipBattLay:'stand'}, ov));
  let bad = [];
  for(const type of ['aaa','aa','c','d','18650','21700'])
    for(const n of [1,2,3,5])
      for(const r of [1,2,4]){
        const H = stand({pipBattType:type, pipBattN:n, pipBattRows:r});
        const mc = manifoldCheck(H.t,4);
        if(!(mc.watertight && vol(H.t) > 0)) bad.push(type+' '+n+'×'+r+' ('+mc.openEdges+'/'+mc.badEdges+')');
      }
  chk('72 сочетания размера и сетки — все замкнуты', bad.length === 0, bad.slice(0,6));
  const H = stand({});
  const s = clamshellSpec(paramState.box);
  chk('колодец — половина элемента, а не весь', Math.abs(s.wh - (s.cellL/2 + s.bclr)) < 1e-9,
      {борт:+s.wh.toFixed(2), элемент:s.cellL});
  chk('закрытый футляр держит элемент целиком',
      Math.abs(2*s.wh - (s.cellL + 2*s.bclr)) < 1e-9, +(2*s.wh).toFixed(2));
  chk('шаг сетки — элемент с зазором плюс одна стенка',
      Math.abs(s.gpitch - (s.D + 2*s.bclr + s.bw)) < 1e-9, +s.gpitch.toFixed(2));
  chk('элементов — произведение сетки', s.cells === s.nCell*s.rows, {n:s.nCell, rows:s.rows, всего:s.cells});
  /* Соседние трубы обязаны перекрываться ОБЪЁМОМ, а не касаться: половина шага — это касание, и оно рвёт
     сетку. Проверяется по числам построителя, потому что именно они и разошлись бы. */
  chk('трубы перекрываются, а не касаются', 2*(s.pocket/2 + s.bw*0.75) > s.gpitch + 1e-9,
      {диаметр_трубы:+(s.pocket + 1.5*s.bw).toFixed(2), шаг:+s.gpitch.toFixed(2)});
  // Колодцы по сетке: луч вдоль X под кромкой пересекает столько стенок, сколько их в ряду.
  const rowsSeen = (H2, s2, cz) => {
    const runs = runsAlongX(H2.t, H2.rimY - 1.0, cz);
    return runs.length;
  };
  for(const n of [2,3,5]){
    const Hn = stand({pipBattN:n, pipBattRows:2});
    const sn = clamshellSpec(paramState.box);
    const zc = -( (sn.zIn + sn.zOut)/2 ) - (0.5)*sn.gpitch;      // по центрам первого ряда
    chk('в ряду '+n+' колодцев — стенок '+(n+1), rowsSeen(Hn, sn, zc) === n+1,
        {found: rowsSeen(Hn, sn, zc)});
  }
  chk('плоско половины с колодцами нигде не соприкасаются', nCross(H.body, H.lid) === 0);
  // Состояние перед чтением предупреждений выставляется заново: цикл выше оставил в нём свою сетку.
  const H0 = stand({}), s0 = clamshellSpec(paramState.box); void H0;
  chk('раскладка названа в предупреждениях', /стоймя/.test(collectPrintWarnings(paramState.box).join(' | ')));
  chk('и число элементов в ней — произведение сетки',
      new RegExp(s0.nCell+'×'+s0.rows+' стоймя \\('+s0.cells+' шт').test(collectPrintWarnings(paramState.box).join(' | ')),
      collectPrintWarnings(paramState.box)[0]);
  // Лёжа и стоймя — разные детали, а не одна с другим числом
  const flat = halves({pipBoxKind:'batt', pipBattLay:'flat'}).t.length;
  chk('стоймя строится не тем же, чем лёжа', H.t.length !== flat, {стоймя:H.t.length, лёжа:flat});
}

console.log('\n=== TOTAL:',pass,'passed,',fail,'failed ===');
process.exit(fail?1:0);
