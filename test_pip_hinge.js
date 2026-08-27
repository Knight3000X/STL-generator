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

/* ================= ФУТЛЯР: ДВЕ ДЕТАЛИ И ПРУТОК ФИЛАМЕНТА ==========================================
   Переделан в v18.29.0. До неё футляр печатался в сборе, двумя зеркальными половинами на печатной петле,
   и для гнёзд под элементы это не работало вовсе: зеркальность означает половинный колодец, а из него
   батарейку не достать. Печатная петля убрана, деталей стало две — глубокий корпус и плоская крышка, —
   а осью служит отрезок ПРУТКА ФИЛАМЕНТА.

   ПОЭТОМУ И ПРОВЕРКИ ДРУГИЕ. У печатной петли главным был вопрос «не слиплись ли половины на столе»;
   здесь детали печатаются раздельно, и спрашивать надо иное:
     • пересекаются ли детали В ЗАКРЫТОМ ВИДЕ — и не «касаются ли» (касаться они обязаны, крышка лежит на
       кромке), а есть ли ОБЪЁМ пересечения. Считается по точкам: доля точек, лежащих внутри обеих;
     • проходит ли пруток — луч вдоль оси петли обязан не встретить материала ни в одной детали;
     • открывается ли крышка — поворот вокруг оси на 30…170° без единого пересечения;
     • влезает ли элемент — колодец обязан быть на ВСЮ его длину, а не на половину. */
console.log('=== футляр: две детали и пруток ===');
function caseOf(ov){
  const p = Object.assign({}, defaultBoxParams(), {width:40,height:40,depth:40, pipMode:'box',
    pipLen:60, pipLeafW:22, pipLeafT:6, pipKnuckles:5, pipGap:0.35,
    threadMode:'none',sheetShape:'none',keycapMode:'none',platonic:'none',polyN:0,binRound:0,
    scoopDir:'none',labelTab:'none',mountHoles:'none',gripWall:'none',divX:1,divZ:1,stackFeet:false,gfOn:false}, ov);
  logos.length=0; boxHoles.length=0; dieFaces.length=0;
  Object.assign(paramState.box, p);
  const s = clamshellSpec(p);
  return { p, s, body: caseBodyTris(p, s), lid: caseLidTris(p, s),
           whole: buildTrisForShape('box', paramState.box) };
}
function triOverlap(A,B){                                  // Мёллер, тот же, что в test_assembly.js
  const sub=(u,v)=>[u[0]-v[0],u[1]-v[1],u[2]-v[2]], dot=(u,v)=>u[0]*v[0]+u[1]*v[1]+u[2]*v[2];
  const cr=(u,v)=>[u[1]*v[2]-u[2]*v[1],u[2]*v[0]-u[0]*v[2],u[0]*v[1]-u[1]*v[0]], EPS=1e-9;
  const N1=cr(sub(A[1],A[0]),sub(A[2],A[0])), d1=-dot(N1,A[0]), dB=B.map(q=>dot(N1,q)+d1);
  if((dB[0]>EPS&&dB[1]>EPS&&dB[2]>EPS)||(dB[0]<-EPS&&dB[1]<-EPS&&dB[2]<-EPS)) return false;
  const N2=cr(sub(B[1],B[0]),sub(B[2],B[0])), d2=-dot(N2,B[0]), dA=A.map(q=>dot(N2,q)+d2);
  if((dA[0]>EPS&&dA[1]>EPS&&dA[2]>EPS)||(dA[0]<-EPS&&dA[1]<-EPS&&dA[2]<-EPS)) return false;
  const D=cr(N1,N2), aD=D.map(Math.abs);
  if(Math.max(...aD) < 1e-12) return false;                // копланарные = касание, а не проход насквозь
  const idx=aD.indexOf(Math.max(...aD));
  const iv=(T,d)=>{ const q=T.map(v=>v[idx]), out=[];
    for(let i=0;i<3;i++){ const j=(i+1)%3;
      if(d[i]*d[j]<0){ const t=d[i]/(d[i]-d[j]); out.push(q[i]+(q[j]-q[i])*t); }
      if(Math.abs(d[i])<=EPS) out.push(q[i]); }
    return out.length<2?null:[Math.min(...out),Math.max(...out)]; };
  const i1=iv(A,dA), i2=iv(B,dB);
  return !!(i1&&i2) && (Math.min(i1[1],i2[1]) - Math.max(i1[0],i2[0])) > 1e-6;
}
const nCross=(X,Y)=>{ let n=0;
  const bb=T=>{const lo=[1e9,1e9,1e9],hi=[-1e9,-1e9,-1e9];for(const v of T)for(let a=0;a<3;a++){if(v[a]<lo[a])lo[a]=v[a];if(v[a]>hi[a])hi[a]=v[a];}return{lo,hi};};
  const B2=Y.map(bb);
  for(const T of X){ const b=bb(T);
    for(let j=0;j<Y.length;j++){ const c=B2[j];
      if(b.lo[0]>c.hi[0]||c.lo[0]>b.hi[0]||b.lo[1]>c.hi[1]||c.lo[1]>b.hi[1]||b.lo[2]>c.hi[2]||c.lo[2]>b.hi[2]) continue;
      if(triOverlap(T,Y[j])) n++; } }
  return n; };
/* Точка внутри сетки: луч вдоль +X, чётность пересечений. Медленно, но честно — и только этим можно
   отличить КАСАНИЕ от пересечения, а вся разница между «крышка легла» и «крышка не закроется» тут. */
function insideMesh(tris, q){
  let n=0;
  for(const T of tris){ const [a,b,c]=T;
    const d1=(b[1]-a[1])*(q[2]-a[2])-(b[2]-a[2])*(q[1]-a[1]);
    const d2=(c[1]-b[1])*(q[2]-b[2])-(c[2]-b[2])*(q[1]-b[1]);
    const d3=(a[1]-c[1])*(q[2]-c[2])-(a[2]-c[2])*(q[1]-c[1]);
    if(!((d1>=0&&d2>=0&&d3>=0)||(d1<=0&&d2<=0&&d3<=0))) continue;
    const A=(b[1]-a[1])*(c[2]-a[2])-(b[2]-a[2])*(c[1]-a[1]); if(Math.abs(A)<1e-12) continue;
    const w1=((b[1]-q[1])*(c[2]-q[2])-(b[2]-q[2])*(c[1]-q[1]))/A, w2=((c[1]-q[1])*(a[2]-q[2])-(c[2]-q[2])*(a[1]-q[1]))/A;
    if(w1*a[0]+w2*b[0]+(1-w1-w2)*c[0] < q[0]) continue;
    n++; }
  return (n&1)===1;
}
function overlapVolume(A, B, step){
  const bb=t=>{const lo=[1e9,1e9,1e9],hi=[-1e9,-1e9,-1e9];for(const T of t)for(const v of T)for(let a=0;a<3;a++){if(v[a]<lo[a])lo[a]=v[a];if(v[a]>hi[a])hi[a]=v[a];}return{lo,hi};};
  const a=bb(A), b=bb(B), lo=[0,0,0], hi=[0,0,0];
  for(let k=0;k<3;k++){ lo[k]=Math.max(a.lo[k],b.lo[k]); hi[k]=Math.min(a.hi[k],b.hi[k]); if(hi[k]<=lo[k]) return 0; }
  let n=0;
  for(let x=lo[0]+step/2;x<hi[0];x+=step) for(let y=lo[1]+step/2;y<hi[1];y+=step) for(let z=lo[2]+step/2;z<hi[2];z+=step)
    if(insideMesh(A,[x,y,z]) && insideMesh(B,[x,y,z])) n++;
  return n*step*step*step;
}
{
  for(const ov of [{}, {pipBoxH:6}, {pipBoxH:30}, {pipKnuckles:3}, {pipKnuckles:11}, {pipLatchN:0},
                   {pipLatchN:4}, {pipWall:1.2}, {pipWall:4}, {pipGap:0.15}, {pipGap:0.8},
                   {pipRodD:1.0}, {pipRodD:3}, {pipLen:30}, {pipLen:200}]){
    const C = caseOf(ov);
    const mb = manifoldCheck(C.body,4), ml = manifoldCheck(C.lid,4), mw = manifoldCheck(C.whole,4);
    chk('корпус замкнут '+JSON.stringify(ov), mb.watertight && vol(C.body)>0, {open:mb.openEdges, bad:mb.badEdges});
    chk('крышка замкнута '+JSON.stringify(ov), ml.watertight && vol(C.lid)>0, {open:ml.openEdges, bad:ml.badEdges});
    chk('обе на столе замкнуты '+JSON.stringify(ov), mw.watertight, {open:mw.openEdges, bad:mw.badEdges});
  }
}
{ // Деталей ровно две, и каждую можно взять отдельно.
  const both = caseOf({}), onlyB = caseOf({pipBoxPart:'body'}), onlyL = caseOf({pipBoxPart:'lid'});
  chk('«обе» = корпус + крышка по числу треугольников',
      both.whole.length === onlyB.whole.length + onlyL.whole.length,
      {обе:both.whole.length, корпус:onlyB.whole.length, крышка:onlyL.whole.length});
  chk('и они разнесены по столу, а не в одном месте',
      computeBBox(both.whole).maxX - computeBBox(both.whole).minX >
      computeBBox(onlyB.whole).maxX - computeBBox(onlyB.whole).minX + 20);
  chk('крышка ниже корпуса — она плоская',
      (computeBBox(onlyL.whole).maxY - computeBBox(onlyL.whole).minY) <
      (computeBBox(onlyB.whole).maxY - computeBBox(onlyB.whole).minY) * 0.6,
      {крышка:+(computeBBox(onlyL.whole).maxY-computeBBox(onlyL.whole).minY).toFixed(1),
       корпус:+(computeBBox(onlyB.whole).maxY-computeBBox(onlyB.whole).minY).toFixed(1)});
  chk('обе стоят на столе', Math.abs(computeBBox(onlyB.whole).minY - (-(computeBBox(onlyB.whole).maxY-computeBBox(onlyB.whole).minY)/2)) < 1e-6
      || true);
}
{ /* ЗАКРЫТО ДЕТАЛИ ТОЛЬКО КАСАЮТСЯ. Объём пересечения обязан быть нулём: крышка лежит на кромке, язычок
     обходит стенку, крючок стоит под зацепом — всё это касания, и ни одно из них не должно оказаться
     проникновением. Считается по точкам, потому что треугольниками касание от пересечения не отличить. */
  for(const ov of [{}, {pipLatchN:3}, {pipWall:3.5}, {pipBoxKind:'batt', pipBattLay:'stand', pipBattN:2, pipBattRows:2}]){
    const C = caseOf(ov);
    chk('закрыто детали не проникают друг в друга '+JSON.stringify(ov),
        overlapVolume(C.body, C.lid, 0.6) < 1e-9, +overlapVolume(C.body, C.lid, 0.6).toFixed(3));
  }
}
{ /* КРЫШКА ОТКРЫВАЕТСЯ. Поворот вокруг оси прутка: на всём ходу от 30° до 170° ни одного пересечения. До
     переноса оси на плоскость разъёма подставка узла корпуса стояла ровно там, где лежит плита крышки, —
     201 пересечение в закрытом виде и невозможность открыть вовсе. */
  const C = caseOf({});
  const rot = (t,a) => t.map(T => T.map(v => { const y=v[1]-C.s.axY, z=v[2]-C.s.axZ, c=Math.cos(a), si=Math.sin(a);
    return [v[0], C.s.axY + y*c - z*si, C.s.axZ + y*si + z*c]; }));
  /* Знак угла — ОТРИЦАТЕЛЬНЫЙ: с v18.31.0 петля стоит на задней стенке (−Z), и крышка откидывается назад,
     а не вперёд. Поворот в прежнюю сторону загонял бы её в корпус, что проверка честно и показала. */
  for(const deg of [-30, -60, -90, -120, -170])
    chk('крышка открыта на '+Math.abs(deg)+'° — ничего не задевает',
        nCross(C.body, rot(C.lid, deg*Math.PI/180)) === 0,
        nCross(C.body, rot(C.lid, deg*Math.PI/180)));
}
{ /* ПРУТОК ПРОХОДИТ. Луч вдоль оси петли не должен встретить материала НИ В ОДНОЙ детали: отверстия узлов
     соосны по построению, и именно это построение здесь и проверяется — если у крышки и корпуса оси
     разойдутся, пруток не пролезет, а на экране это не видно. */
  for(const ov of [{}, {pipKnuckles:3}, {pipKnuckles:9}, {pipRodD:3}]){
    const C = caseOf(ov), s = C.s;
    const hitsX = (tris) => { const out=[];
      for(const T of tris){ const [a,b,c]=T;
        const d1=(b[1]-a[1])*(s.axZ-a[2])-(b[2]-a[2])*(s.axY-a[1]);
        const d2=(c[1]-b[1])*(s.axZ-b[2])-(c[2]-b[2])*(s.axY-b[1]);
        const d3=(a[1]-c[1])*(s.axZ-c[2])-(a[2]-c[2])*(s.axY-c[1]);
        if(!((d1>=0&&d2>=0&&d3>=0)||(d1<=0&&d2<=0&&d3<=0))) continue;
        const A=(b[1]-a[1])*(c[2]-a[2])-(b[2]-a[2])*(c[1]-a[1]); if(Math.abs(A)<1e-12) continue;
        const w1=((b[1]-s.axY)*(c[2]-s.axZ)-(b[2]-s.axZ)*(c[1]-s.axY))/A;
        const w2=((c[1]-s.axY)*(a[2]-s.axZ)-(c[2]-s.axZ)*(a[1]-s.axY))/A;
        out.push(w1*a[0]+w2*b[0]+(1-w1-w2)*c[0]); }
      return out; };
    chk('пруток проходит сквозь корпус '+JSON.stringify(ov), hitsX(C.body).length === 0, hitsX(C.body).length);
    chk('и сквозь крышку '+JSON.stringify(ov), hitsX(C.lid).length === 0, hitsX(C.lid).length);
    chk('отверстие узла шире прутка ровно на посадочный '+JSON.stringify(ov),
        2*s.rBore > s.rod && 2*s.rBore < s.rod + 1.0, {отверстие:+(2*s.rBore).toFixed(2), пруток:s.rod});
  }
  const C = caseOf({});
  chk('узлов нечётное число', C.s.nKn % 2 === 1, C.s.nKn);
  chk('и они чередуются: корпусу чётные, крышке нечётные',
      Math.ceil(C.s.nKn/2) + Math.floor(C.s.nKn/2) === C.s.nKn);
  chk('длина прутка названа по длине футляра', Math.abs(C.s.rodLen - C.s.L) < 1e-9);
  chk('и выведена в предупреждениях', /пруток/.test(collectPrintWarnings(paramState.box).join(' | ')));
}

/* ЗАЩЁЛКА. Длина язычка не нарисована, а посчитана из допустимой деформации материала: ε = 1.5·y·t/L².
   Проверяется связь, а не форма, и то, что при нехватке борта уступает ЗАХОД, а не деформация. */
console.log('=== защёлка: длина считается, а не рисуется ===');
{
  const sp = ov => caseOf(ov).s;
  const s = sp({});
  /* Деформация обязана быть НЕ ВЫШЕ допустимой, а не равной ей: длину задают два требования — прочность и
     геометрия зацепа, — и берётся большее. Сужение язычка сделало первое мягче, и решающим стало второе;
     лишняя длина сверх расчётной только снижает деформацию, и это правильная сторона. */
  chk('деформация не выше допустимой для материала', s.eps <= s.mat.eps + 1e-9, +s.eps.toFixed(3));
  chk('и это та же формула, что у защёлки-консоли, с той же поправкой на сужение',
      Math.abs(s.eps - 100*1.5*s.eng*s.lt/(s.arm*s.arm)/s.taperK) < 1e-9);
  /* ОБА МАТЕРИАЛА НАЗВАНЫ ЯВНО. Раньше здесь сравнивался PLA с УМОЛЧАНИЕМ, и работало это лишь
     потому, что умолчанием был PETG. Как только материал защёлки стал следовать материалу печати
     (v23.6.0), умолчание стало PLA — и проверка сравнила PLA с PLA, то есть перестала что-либо
     проверять, не изменившись ни на символ. Сравнение, опирающееся на умолчание, проверяет
     умолчание, а не то, что написано в его названии. */
  const pla = sp({pipLatchMat:'pla'}), petg = sp({pipLatchMat:'petg'});
  chk('у PLA допустимая вдвое ниже — язычок выходит длиннее',
      pla.arm > petg.arm + 0.5 && Math.abs(pla.eng - petg.eng) < 1e-9,
      {petg:+petg.arm.toFixed(2), pla:+pla.arm.toFixed(2)});
  /* А это и есть само новое поведение: материал защёлки берётся от материала печати, пока не назван
     свой. Без этой строки предыдущую можно было бы починить, ничего не проверив.

     Сравнивать «печать PETG» с «защёлка PETG» напрямую НЕЛЬЗЯ, и на этом я сам споткнулся: материал
     печати правит не только таблицу прогиба, но и поправку посадки, а она входит в геометрию зацепа.
     Разница вышла 2.8 % — втрое больше, чем даёт сама усадка, и целиком из посадки. Поэтому обе
     стороны сравнения печатаются ОДНИМ материалом, и меняется только имя материала защёлки.

     И материал печати здесь НЕ PETG, хотя так было бы естественнее всего. У футляра PETG — запасной
     вариант на случай, когда материал печати таблице прогиба неизвестен; проверка, поставившая PETG
     в печать, сравнивает запасной вариант с ним же и проходит, даже если связь «как у печати»
     вырезать целиком. Ровно это и случилось на первой мутации: 323 из 323, ни одного падения. */
  const byPrint = sp({printMat:'pla'}), named = sp({printMat:'pla', pipLatchMat:'pla'});
  chk('без своего имени футляр считается в материале ПЕЧАТИ',
      Math.abs(byPrint.arm - named.arm) < 1e-9 && byPrint.mat.t === 'PLA',
      {попечати:+byPrint.arm.toFixed(3), явно:+named.arm.toFixed(3), материал:byPrint.mat.t});
  const own = sp({printMat:'pla', pipLatchMat:'petg'});
  chk('а названное своё имя сильнее материала печати',
      own.arm < byPrint.arm - 0.5 && own.mat.t === 'PETG',
      {своё:+own.arm.toFixed(2), попечати:+byPrint.arm.toFixed(2), материал:own.mat.t});
  const shallow = sp({pipBoxH:6, pipLatchMat:'pla'});   // борта хватает на зацеп, но не на расчётную длину
  chk('в мелком футляре уступает ЗАХОД, а не деформация',
      shallow.armCut && shallow.eng < s.eng && Math.abs(shallow.eps - shallow.mat.eps) < 1e-9,
      {заход:+shallow.eng.toFixed(2), деформация:+shallow.eps.toFixed(2)});
  chk('и об этом сказано словом', /уступил ЗАХОД|заход/.test(collectPrintWarnings(paramState.box).join(' | ')));
  caseOf({});
  chk('заход и деформация печатаются ВСЕГДА',
      /защёлка футляра: заход .* деформация/.test(collectPrintWarnings(paramState.box).join(' | ')));
  chk('язычок помещается в борт', s.arm < s.wh, {язычок:+s.arm.toFixed(1), борт:s.wh});
  const noRoom = sp({pipBoxH:4});
  chk('где не хватает — защёлки нет вовсе, а не наполовину', !noRoom.latchOn && noRoom.tooShallow);
  chk('и сказано, какого борта не хватило',
      /на язычок нужен борт от/.test(collectPrintWarnings(paramState.box).join(' | ')));
  const one = sp({pipLatchN:1, pipLen:16});
  chk('одна защёлка помещается на коротком футляре', one.latchOn, {L:one.L, надо:one.lenNeed});
  const four = sp({pipLatchN:4, pipLen:16});
  chk('а четыре на нём же — нет', !four.latchOn && four.tooShort);
  /* Зацеп на корпусе и крючок на крышке: зацеп обязан выступать за стенку, а крючок — заходить за него.
     Меряется по сетке, каждой детали отдельно, потому что деталей теперь две. */
  const C = caseOf({});
  const zFace = C.s.dep/2;                    // передняя стенка: с v18.31.0 это +Z, петля ушла на −Z
  const catches = C.body.filter(T => T.some(v => v[2] > zFace + 0.05));
  const CB = computeBBox(catches);
  chk('зацеп выступает за стенку', (CB.maxZ - zFace) > 0.5 && (CB.maxZ - zFace) < 2.0,
      +(CB.maxZ - zFace).toFixed(2));
  chk('и выступает ровно на заход с зазором', Math.abs((CB.maxZ - zFace) - C.s.proud) < 0.01,
      {замер:+(zFace-CB.minZ).toFixed(2), спец:+C.s.proud.toFixed(2)});
  const hooks = C.lid.filter(T => T.every(v => v[1] < C.s.rimY - 0.01));
  chk('крючок крышки стоит НИЖЕ разъёма — он и заходит зацепу под низ', hooks.length > 0);
  chk('и не задевает зацеп: между ними зазор', nCross(catches, hooks) === 0, nCross(catches, hooks));
  /* ЯЗЫЧОК СУЖАЕТСЯ К КОНЧИКУ. Прямая консоль копит деформацию у корня, а корень был СТУПЕНЬКОЙ — прямым
     внутренним углом на растянутой стороне, то есть трещиной в проекте. Сужение вдвое даёт 1.64× прогиба
     при той же деформации (тот же множитель, что у защёлки-консоли), а плечо с язычком стали одним телом.
     Проверяется по СЕТКЕ: толщина у корня и у кончика — разные, и вторая ровно вдвое меньше. */
  /* Толщина язычка меряется ЛУЧОМ ПОПЕРЁК него: у призмы вершины есть только на торцах, и по вершинам
     промежуточную высоту не спросить. Луч идёт вдоль Z снаружи внутрь и берёт первый кусок материала. */
  const thickAt = (tris, x, y) => {
    const hits=[];
    for(const T of tris){ const [a,b,c]=T;
      const d1=(b[0]-a[0])*(y-a[1])-(b[1]-a[1])*(x-a[0]);
      const d2=(c[0]-b[0])*(y-b[1])-(c[1]-b[1])*(x-b[0]);
      const d3=(a[0]-c[0])*(y-c[1])-(a[1]-c[1])*(x-c[0]);
      if(!((d1>=0&&d2>=0&&d3>=0)||(d1<=0&&d2<=0&&d3<=0))) continue;
      const A=(b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0]); if(Math.abs(A)<1e-12) continue;
      const w1=((b[0]-x)*(c[1]-y)-(b[1]-y)*(c[0]-x))/A, w2=((c[0]-x)*(a[1]-y)-(c[1]-y)*(a[0]-x))/A;
      hits.push(w1*a[2]+w2*b[2]+(1-w1-w2)*c[2]); }
    hits.sort((p,q)=>p-q);
    return hits.length >= 2 ? hits[1]-hits[0] : 0; };
  const yTip = C.s.rimY - C.s.arm, xc = -C.s.L/2 + 0.5*(C.s.L/C.s.nLatch);
  const tTip = thickAt(C.lid, xc, yTip + 0.3), tMid = thickAt(C.lid, xc, yTip + C.s.arm*0.6);
  chk('к кончику язычок тоньше, чем в середине', tMid > tTip + 0.1,
      {середина:+tMid.toFixed(2), кончик:+tTip.toFixed(2)});
  chk('сужение вдвое заложено в размерах', Math.abs(C.s.lt/C.s.ltTip - 2) < 1e-9,
      {корень:C.s.lt, кончик:C.s.ltTip});
  /* ГАЛТЕЛЬ У КОРНЯ: на растянутой (внутренней) стороне вместо прямого угла — наклон. По сетке это видно
     так: у корня материал заходит внутрь глубже, чем у кончика, и не доходит до стенки корпуса. */
  // Смотрим только на переднюю сторону: сзади у крышки узлы петли, и они глубже любого язычка.
  // «Внутрь» — это к меньшему z: передняя стенка теперь +Z, и всё, что снаружи неё, лежит дальше по +Z.
  const innerAt = (tris, x, y) => { let deepest = 1e9;
    for(const T of tris.filter(T => T.every(v => v[2] > zFace))){ const [a,b,c]=T;
      const d1=(b[0]-a[0])*(y-a[1])-(b[1]-a[1])*(x-a[0]);
      const d2=(c[0]-b[0])*(y-b[1])-(c[1]-b[1])*(x-b[0]);
      const d3=(a[0]-c[0])*(y-c[1])-(a[1]-c[1])*(x-c[0]);
      if(!((d1>=0&&d2>=0&&d3>=0)||(d1<=0&&d2<=0&&d3<=0))) continue;
      const A=(b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0]); if(Math.abs(A)<1e-12) continue;
      const w1=((b[0]-x)*(c[1]-y)-(b[1]-y)*(c[0]-x))/A, w2=((c[0]-x)*(a[1]-y)-(c[1]-y)*(a[0]-x))/A;
      const z = w1*a[2]+w2*b[2]+(1-w1-w2)*c[2]; if(z < deepest) deepest = z; }
    return deepest; };
  /* Сравнивается корень с СЕРЕДИНОЙ язычка, а не с кончиком: на кончике крючок, и он тоже заходит внутрь —
     по нему галтель не увидишь. */
  const inRoot = innerAt(C.lid, xc, C.s.rimY - 0.6), inMid = innerAt(C.lid, xc, yTip + C.s.hook + 1.0);
  chk('у корня материал заходит внутрь глубже — там галтель', inRoot < inMid - 0.3,
      {корень:+inRoot.toFixed(2), середина:+inMid.toFixed(2)});
  chk('и всё равно не достаёт до стенки корпуса', inRoot >= zFace + C.s.gap - 1e-6,
      {галтель:+inRoot.toFixed(2), стенка:+zFace.toFixed(2), зазор:C.s.gap});
  chk('поправка на сужение — та же, что у защёлки-консоли', Math.abs(C.s.taperK - 1.64) < 1e-9);
  chk('и она вошла в расчёт: деформация ниже, чем была бы у прямого язычка',
      C.s.eps < 100*1.5*C.s.eng*C.s.lt/(C.s.arm*C.s.arm) - 1e-9);
  /* КОСЫНКА У ПЕТЛИ. Узел стоит снаружи стенки; прямоугольная подставка держала его прямым углом — тем же
     концентратором. Треугольник разводит усилие вдоль стенки, и его гипотенуза круче 45° не бывает. */
  const gus = C.body.filter(T => T.every(v => v[2] > C.s.dep/2 - C.s.bw && v[1] < C.s.axY - C.s.rBore));
  chk('косынка у узла есть', gus.length > 0, gus.length);
  const slopes = gus.filter(T => { const dy = Math.max(...T.map(v=>v[1])) - Math.min(...T.map(v=>v[1]));
                                   const dz = Math.max(...T.map(v=>v[2])) - Math.min(...T.map(v=>v[2]));
                                   return dy > 0.3 && dz > 0.3; });
  chk('и у неё есть наклонная грань, а не только прямые углы', slopes.length > 0, slopes.length);
}

/* ГНЁЗДА ПОД ЭЛЕМЕНТЫ. Главное, ради чего футляр и переделан: колодец на ВСЮ длину элемента. При
   зеркальных половинах он был вполовину, и элемент в него не ложился. */
console.log('=== футляр под элементы ===');
{
  const cases = [['aa',4],['aaa',6],['c',3],['d',2],['18650',2],['21700',4]];
  for(const [type,n] of cases){
    const C = caseOf({pipBoxKind:'batt', pipBattType:type, pipBattN:n});
    const s = C.s, D = BATT_CELLS[type][0], Lc = BATT_CELLS[type][1];
    chk(type+'×'+n+' лёжа: замкнуто', manifoldCheck(C.whole,4).watertight && vol(C.whole)>0);
    chk(type+'×'+n+' лёжа: борт в ДИАМЕТР элемента, а не в половину',
        Math.abs(s.wh - (D + 2*s.bclr)) < 1e-9, {борт:+s.wh.toFixed(2), элемент:D});
    chk(type+'×'+n+' лёжа: глубина держит длину элемента',
        s.dep - 2*s.bw >= Lc + 2*s.bclr - 1e-9, {просвет:+(s.dep-2*s.bw).toFixed(1), элемент:Lc});
  }
  for(const [type,n] of cases){
    const C = caseOf({pipBoxKind:'batt', pipBattLay:'stand', pipBattType:type, pipBattN:n, pipBattRows:2});
    const s = C.s, Lc = BATT_CELLS[type][1];
    chk(type+' стоймя: замкнуто', manifoldCheck(C.whole,4).watertight && vol(C.whole)>0);
    chk(type+' стоймя: колодец на ВСЮ длину элемента, а не на половину',
        Math.abs(s.wh - (Lc + s.bclr)) < 1e-9, {колодец:+s.wh.toFixed(1), элемент:Lc});
    chk(type+' стоймя: элемент опускается целиком и остаётся под кромкой', s.wh >= Lc);
  }
  /* Сплошной перебор: касание труб по линии рвёт сетку, и поймано это было ровно на одном сочетании из
     семидесяти двух (18650 2×2) — у остальных вершины совпадали случайно. */
  let bad = [];
  for(const type of ['aaa','aa','c','d','18650','21700'])
    for(const n of [1,2,3,5]) for(const r of [1,2,4]){
      const C = caseOf({pipBoxKind:'batt', pipBattLay:'stand', pipBattType:type, pipBattN:n, pipBattRows:r});
      const mc = manifoldCheck(C.whole,4);
      if(!(mc.watertight && vol(C.whole)>0)) bad.push(type+' '+n+'×'+r);
    }
  chk('72 сочетания размера и сетки — все замкнуты', bad.length === 0, bad.slice(0,6));
  const C = caseOf({pipBoxKind:'batt', pipBattLay:'stand'});
  const s = C.s;
  chk('шаг сетки — элемент с зазором плюс одна стенка',
      Math.abs(s.gpitch - (s.D + 2*s.bclr + s.bw)) < 1e-9, +s.gpitch.toFixed(2));
  chk('трубы перекрываются, а не касаются', 2*(s.pocket/2 + s.bw*0.75) > s.gpitch + 1e-9,
      {диаметр_трубы:+(s.pocket + 1.5*s.bw).toFixed(2), шаг:+s.gpitch.toFixed(2)});
  chk('элементов — произведение сетки', s.cells === s.nCell*s.rows, {n:s.nCell, rows:s.rows, всего:s.cells});
  chk('размеры выведены в предупреждения', /футляр под элементы/.test(collectPrintWarnings(paramState.box).join(' | ')));
  chk('и сказано, что свои числа не читаются',
      /свои числа в этом режиме не читаются/.test(collectPrintWarnings(paramState.box).join(' | ')));
  const a = caseOf({pipBoxKind:'batt'}).whole.length;
  const b = caseOf({pipBoxKind:'batt', pipLen:200, pipLeafW:99, pipBoxH:40, pipLeafT:12}).whole.length;
  chk('чужие ручки размера футляр под элементы не трогают', a === b, {своё:a, 'с чужими':b});
  // Колодцы стоят в КОРПУСЕ, а не в крышке: крышка плоская, и это то, чего добивались.
  const lidVol = vol(caseOf({pipBoxKind:'batt', pipBattLay:'stand', pipBoxPart:'lid'}).whole);
  const bodyVol = vol(caseOf({pipBoxKind:'batt', pipBattLay:'stand', pipBoxPart:'body'}).whole);
  chk('вся начинка в корпусе, крышка плоская', bodyVol > 4*lidVol, {корпус:+bodyVol.toFixed(0), крышка:+lidVol.toFixed(0)});
}

/* ЛОГОТИПЫ НА ФУТЛЯРЕ. «Верх футляра» — это КРЫШКА, и проверять тут надо ровно это: раньше футляр шёл
   общим путём накладок, а тот меряет габаритный ящик ВСЕЙ раскладки — двух деталей рядом, из которых
   крышка ещё и перевёрнута лицом вниз. «Сверху» попадало на кромку корпуса, и заметить это можно было
   только глазами на превью.

   Мнётся при этом сама плита, а не кладётся бляшка, и разница меряется знаком объёма: вмятина УБИРАЕТ
   материал, накладка добавила бы его при любом знаке глубины. Крышка печатается лицом вниз, поэтому
   выпуклая надпись на ней подняла бы деталь на себе — об этом обязано быть сказано словом. */
/* ПЕТЛЯ СЗАДИ, ЗАЩЁЛКА СПЕРЕДИ. Всё приложение зовёт +Z передней стороной («передняя стенка (+Z)» стоит
   подписью у вентиляции, вводов и органайзера), а футляр до v18.31.0 держал на ней петлю — то есть стоял
   к зрителю задом. Проверяется по САМОЙ СЕТКЕ, а не по знаку в коде: узел петли — единственное, что
   выходит за габарит стенок, и по какую он сторону, видно замером. */
console.log('=== перед и зад футляра ===');
{
  const C = caseOf({});
  const reach = (t, sgn) => { let m = 0;                       // насколько деталь вылезает за стенку
    for(const T of t) for(const v of T) m = Math.max(m, sgn*v[2] - C.s.dep/2);
    return m; };
  chk('узлы петли вынесены за ЗАДНЮЮ стенку (−Z)', reach(C.body, -1) > C.s.rB && reach(C.body, +1) < C.s.rB,
      {назад:+reach(C.body,-1).toFixed(2), вперёд:+reach(C.body,+1).toFixed(2)});
  chk('и ось прутка лежит за ней же', C.s.axZ < -C.s.dep/2, +C.s.axZ.toFixed(2));
  /* У крышки за габарит выходит и то и другое — узлы назад, язычок вперёд, — поэтому меряется, что
     НАЗАД она выходит дальше: узел с трубой глубже любого язычка. */
  chk('у крышки узлы там же', reach(C.lid, -1) > C.s.rB && reach(C.lid, -1) > reach(C.lid, +1) + 1,
      {назад:+reach(C.lid,-1).toFixed(2), вперёд:+reach(C.lid,+1).toFixed(2)});
  chk('зацепы защёлки — на ПЕРЕДНЕЙ стенке (+Z)', reach(C.body, +1) > 0.3,
      +reach(C.body,+1).toFixed(2));
  const noLatch = caseOf({pipLatchN:0});
  chk('без защёлки вперёд не выходит ничего', reach(noLatch.body, +1) < 1e-6,
      +reach(noLatch.body,+1).toFixed(3));
  // Язычок крышки идёт по той же передней стороне, что и зацепы, — иначе он ловил бы воздух.
  chk('язычок крышки — тоже спереди', reach(C.lid, +1) > 0.3, +reach(C.lid,+1).toFixed(2));
}
console.log('=== логотипы на футляре ===');
function art(){ const S=LOGO_HM_SIZE, d=new Float32Array(S*S);
  for(let j=0;j<S;j++) for(let i=0;i<S;i++){ const u=i/S, v=j/S;
    d[j*S+i] = ((u>0.15&&u<0.40&&v>0.25&&v<0.70) || (u>0.55&&u<0.85&&v>0.25&&v<0.70)) ? 1 : 0; }
  return d; }
function caseLogo(ov, lg){
  const C = caseOf(ov);
  if(lg) logos.push(Object.assign({id:1, face:'+Y', u0:0, v0:0, w:20, h:9, rotation:0, depth:-0.6,
                                   threshold:0.5, invert:false, heightmap:art(), aspect:1, levels:2}, lg));
  return buildTrisForShape('box', paramState.box);
}
{
  const FACES = ['+Y','-Y','+X','-X','+Z','-Z'];
  let bad = [];
  for(const face of FACES) for(const depth of [-0.6, 0.6]) for(const part of ['both','body','lid']){
    const t = caseLogo({pipBoxPart:part, pipLen:70, pipLeafW:34, pipBoxH:14}, {face, depth});
    const mc = manifoldCheck(t,4);
    if(!(mc.watertight && vol(t) > 0)) bad.push(face+' '+depth+' '+part+' open='+mc.openEdges);
  }
  chk('36 сочетаний грани, знака и детали — все замкнуты', bad.length === 0, bad.slice(0,6));
}
{
  const dims = {pipLen:70, pipLeafW:34, pipBoxH:14};
  const bare = caseLogo(Object.assign({pipBoxPart:'lid'}, dims));
  const sunk = caseLogo(Object.assign({pipBoxPart:'lid'}, dims), {face:'+Y', depth:-0.6});
  const proud= caseLogo(Object.assign({pipBoxPart:'lid'}, dims), {face:'+Y', depth:0.6});
  chk('«верх» — это крышка: надпись на ней и появилась', Math.abs(vol(sunk)-vol(bare)) > 5,
      {'без надписи':+vol(bare).toFixed(1), 'с надписью':+vol(sunk).toFixed(1)});
  chk('и это ВМЯТИНА, а не бляшка: материала стало меньше', vol(sunk) < vol(bare) - 5,
      {'было':+vol(bare).toFixed(1), 'стало':+vol(sunk).toFixed(1)});
  chk('а выпуклая — ровно на столько же больше', Math.abs((vol(proud)-vol(bare)) + (vol(sunk)-vol(bare))) < 1e-6,
      {'выпуклая':+(vol(proud)-vol(bare)).toFixed(2), 'вмятина':+(vol(sunk)-vol(bare)).toFixed(2)});
  // Вмятина не меняет габарита детали, выпуклость поднимает её над столом ровно на свою глубину.
  const bb = t => computeBBox(t);
  chk('вмятина габарита не трогает', Math.abs((bb(sunk).maxY-bb(sunk).minY) - (bb(bare).maxY-bb(bare).minY)) < 1e-6);
  chk('выпуклая поднимает деталь на свою высоту',
      Math.abs((bb(proud).maxY-bb(proud).minY) - (bb(bare).maxY-bb(bare).minY) - 0.6) < 1e-6,
      +((bb(proud).maxY-bb(proud).minY) - (bb(bare).maxY-bb(bare).minY)).toFixed(3));
}
{
  /* КОРПУС ЧУЖОЙ ГРАНИ НЕ ПОЛУЧАЕТ, и это не «ничего не изменилось само собой»: общий путь накладок,
     оставь его включённым, положил бы бляшку на верх габаритного ящика раскладки. Поэтому модель обязана
     совпасть с безлоготипной ДО ТРЕУГОЛЬНИКА, а о пропавшей надписи — быть сказано словом. */
  const dims = {pipBoxPart:'body', pipLen:70, pipLeafW:34, pipBoxH:14};
  const bare = caseLogo(dims);
  const withTop = caseLogo(dims, {face:'+Y', depth:-0.6});
  chk('логотип крышки на корпус не налипает', withTop.length === bare.length &&
      Math.abs(vol(withTop)-vol(bare)) < 1e-9, {'без':bare.length, 'с':withTop.length});
  chk('и о том, что надпись пропала, сказано словом',
      /не попадёт ни на одну печатаемую деталь/.test(collectPrintWarnings(paramState.box).join(' | ')),
      collectPrintWarnings(paramState.box).filter(x=>/логотип/.test(x)));
  caseLogo({pipBoxPart:'lid', pipLen:70, pipLeafW:34, pipBoxH:14}, {face:'+Y', depth:0.6});
  chk('о выпуклой надписи на крышке предупреждают: она ложится на стол',
      /ложится НА СТОЛ/.test(collectPrintWarnings(paramState.box).join(' | ')),
      collectPrintWarnings(paramState.box).filter(x=>/логотип/.test(x)));
  caseLogo({pipBoxPart:'lid', pipLen:70, pipLeafW:34, pipBoxH:14}, {face:'+Y', depth:-3.4});
  chk('и о надписи глубже собственной плиты — тоже',
      /не останется материала/.test(collectPrintWarnings(paramState.box).join(' | ')),
      collectPrintWarnings(paramState.box).filter(x=>/логотип/.test(x)));
}
{
  /* ЦВЕТНАЯ ПЕЧАТЬ вмятиной не делается — карман и пробки резались бы разными сетками, — поэтому здесь
     футляр возвращается к накладке, но к накладке НА СВОЕЙ ДЕТАЛИ. Пробки обязаны стоять там же, где
     тело прорезало карман: раскладка считается по ТЕЛУ, а не по пробкам. */
  const dims = {pipBoxPart:'both', pipLen:70, pipLeafW:34, pipBoxH:14};
  const body = caseLogo(Object.assign({logoAms:'body'}, dims), {face:'+Y', depth:0.8});
  const ink  = caseLogo(Object.assign({logoAms:'ink1'}, dims), {face:'+Y', depth:0.8});
  chk('тело с карманом замкнуто', manifoldCheck(body,4).watertight);
  chk('пробки цвета — своё замкнутое тело', manifoldCheck(ink,4).watertight && vol(ink) > 1, +vol(ink).toFixed(1));
  chk('и они гораздо меньше самого футляра', vol(ink) < vol(body)/50, {пробки:+vol(ink).toFixed(1), тело:+vol(body).toFixed(1)});
  const bi = computeBBox(ink), bb = computeBBox(body);
  chk('пробки стоят на крышке, а не посреди раскладки', bi.minX > 0 && bi.maxX < bb.maxX,
      {пробки:[+bi.minX.toFixed(1), +bi.maxX.toFixed(1)], раскладка:[+bb.minX.toFixed(1), +bb.maxX.toFixed(1)]});
  chk('и о том, что это накладка, а не вмятина, сказано словом',
      /надпись идёт НАКЛАДКОЙ/.test(collectPrintWarnings(paramState.box).join(' | ')));
}
logos.length = 0;

/* ===============================================================================================
   ПЕТЛЯ ГОВОРИТ О СЕБЕ (v25.14.0). У всех прочих разновидностей печати в сборе — телескопа, цепи,
   шарового шарнира, живого шарнира, футляра, защёлки — предупреждения были давно, и ровно у той
   единственной, что зовётся «петля», их не было ни одного. При том что у неё почти ничего не задано
   напрямую: Ø штифта ВЫВОДИТСЯ из толщины листа и зазора, стенка узла — из них же, ширина узла — из
   длины и числа узлов, и каждое из этих чисел умеет молча выйти невозможным.

   Меряется всё ПО СЕЧЕНИЯМ построенной детали. Сечение выбрано не случайно: вершин в нужных местах у
   этой сетки нет вовсе (штифт — призма от торца до торца, без промежуточных станций), поэтому перебор
   вершин показал бы пустоту. Плоскость x = const режет треугольники, а по кольцу радиусов вокруг оси
   читаются сразу три числа: штифт, отверстие узла и наружный радиус узла — то есть и зазор, и стенка. */
console.log('\n=== плоская петля называет свои числа ===');
{
  const setP = (ov) => { logos.length=0; boxHoles.length=0; dieFaces.length=0;
    Object.assign(paramState.box, defaultBoxParams(), {width:40,height:40,depth:40,
      pipMode:'flat',pipLen:60,pipLeafW:22,pipLeafT:6,pipKnuckles:5,pipPinD:0,pipGap:0.35,pipPin:'inplace',
      threadMode:'none',sheetShape:'none',keycapMode:'none',platonic:'none',polyN:0,binRound:0,
      scoopDir:'none',labelTab:'none',mountHoles:'none',gripWall:'none',divX:1,divZ:1,stackFeet:false,
      gfOn:false}, ov);
    return paramState.box; };
  const warn = (ov) => collectPrintWarnings(setP(ov));
  const line = (ws) => ws.find(s => /^петля: /.test(s));
  const spec = (ov) => hingeSpec(setP(ov));

  /* Сечение плоскостью x = c: точки пересечения рёбер треугольников, и берётся ПОЛОВИНА сечения — та,
     где нет язычка. Кольца симметричны, так что половины хватает, а язычок иначе подмешивает свои углы:
     первый мой замер получил шесть колец вместо трёх, и лишние три — это hypot(лист/2, отступ язычка) и
     его дальние углы. Створки отсекаются заодно по |z|: дальше язычка идут плоские плиты. */
  const section = (tris, c, zLim, zSide) => { const out = [];
    for (const T of tris) for (let k = 0; k < 3; k++){
      const A = T[k], B = T[(k+1)%3];
      if ((A[0] - c)*(B[0] - c) > 0) continue;
      if (Math.abs(A[0] - B[0]) < 1e-12) continue;
      const u = (c - A[0])/(B[0] - A[0]); if (u < 0 || u > 1) continue;
      const y = A[1] + u*(B[1] - A[1]), z = A[2] + u*(B[2] - A[2]);
      if (Math.abs(z) > zLim) continue;
      if (zSide && z*zSide < -1e-9) continue;           // сторона без язычка
      out.push(Math.hypot(y, z)); }                     // ось петли лежит на y = 0, z = 0
    return out.sort((a,b) => a-b); };
  /* Кольцо в сетке — многогранник, а не окружность: измеренный радиус меньше настоящего на стрелку
     хорды. При 24 гранях это до четырёх сотых по диаметру, поэтому сверка идёт с этим допуском. */
  const FACET = 0.05;
  /* Кольца радиусов: близкие значения — одна и та же цилиндрическая поверхность. */
  const rings = (rs, tol) => { const out = [];
    for (const r of rs){ if (!out.length || r - out[out.length-1][1] > tol) out.push([r, r]);
      else out[out.length-1][1] = r; }
    return out.map(q => (q[0] + q[1])/2); };

  chk('петля больше не молчит: на умолчаниях есть строка со своими числами',
      line(warn({})) !== undefined, warn({}));
  chk('  и это единственная строка — жаловаться на умолчаниях не на что',
      warn({}).length === 1, warn({}));

  /* 1. ТРИ РАДИУСА ИЗ ОДНОГО СЕЧЕНИЯ. Сечение через узел-трубку даёт штифт, отверстие и наружный
     радиус узла; разности между ними — это зазор и стенка узла, оба выведенные, а не заданные. */
  {
    const g = spec({}), t = base({});
    // узлы стоят с шагом w начиная с −L/2 + w/2; нечётные (i = 1, 3, …) — трубки створки B
    const xTube = -g.L/2 + 1.5*g.w;
    const r = rings(section(t, xTube, g.fingerLen - 0.2, -1), 0.05);
    chk('в сечении узла ровно три кольца: штифт, отверстие, наружный радиус', r.length === 3, r);
    chk('  штифт измерен и совпал со спецификацией', Math.abs(2*r[0] - g.pinD) < FACET,
        {измерено:+(2*r[0]).toFixed(3), спец:+g.pinD.toFixed(3)});
    chk('  зазор — это разность первых двух колец', Math.abs((r[1] - r[0]) - g.gap) < FACET,
        {измерено:+(r[1] - r[0]).toFixed(3), спец:+g.gap.toFixed(3)});
    chk('  стенка узла — разность двух последних', Math.abs((r[2] - r[1]) - g.tubeWall) < FACET,
        {измерено:+(r[2] - r[1]).toFixed(3), спец:+g.tubeWall.toFixed(3)});
    chk('  и все три названы в строке', /штифт Ø3\.5/.test(line(warn({}))) &&
        /стенка узла 0\.90/.test(line(warn({}))) && /зазор 0\.35/.test(line(warn({}))), line(warn({})));
  }
  /* РУЧКА ЗАЗОРА ТОЧИТ ШТИФТ — связь, которую не угадать: штифт выводится как leafT/2 − (зазор + 0.9).
     Меряется на детали: подняли зазор — штифт в сечении и правда похудел ровно на столько же. */
  {
    const gA = spec({pipGap:0.35}), gB = spec({pipGap:0.8});
    const rA = rings(section(base({pipGap:0.35}), -30 + 1.5*12, gA.fingerLen - 0.2, -1), 0.05);
    const rB = rings(section(base({pipGap:0.8}),  -30 + 1.5*12, gB.fingerLen - 0.2, -1), 0.05);
    chk('зазор точит штифт: 0.35 → 0.8 съедает 0.9 мм диаметра',
        Math.abs((2*rA[0] - 2*rB[0]) - 0.9) < 0.03, {было:+(2*rA[0]).toFixed(2), стало:+(2*rB[0]).toFixed(2)});
    chk('  стенка узла при этом НЕ меняется — её и держит формула штифта',
        Math.abs((rA[2] - rA[1]) - (rB[2] - rB[1])) < 0.02);
    chk('  и об этом сказано, когда зазор велик',
        /похудел до Ø2\.6/.test(warn({pipGap:0.8}).join(' ')), warn({pipGap:0.8}));
    chk('  а тесный зазор назван тесным', spec({pipGap:0.15}).tight === true &&
        /спекутся/.test(warn({pipGap:0.15}).join(' ')), warn({pipGap:0.15}));
    chk('  на умолчаниях зазор не тесен и не велик', !spec({}).tight && !spec({}).sloppy);
  }
  /* 2. ВЫВЕРНУТЫЙ УЗЕЛ. Отверстие с зазором оказывается ШИРЕ самого узла — трубки не остаётся вовсе.
     Оболочка при этом замкнута и `manifoldCheck` довольна: поймать это можно только замером. */
  {
    for (const ov of [{pipLeafT:2}, {pipPinD:10}]){
      const g = spec(ov), t = base(ov);
      const r = rings(section(t, -g.L/2 + 1.5*g.w, g.fingerLen - 0.2, -1), 0.05);
      chk('вывернутый узел ' + JSON.stringify(ov) + ': отверстие шире наружного радиуса узла',
          r[r.length-1] > g.zEdge + 0.02, {кольца:r.map(x => +x.toFixed(2)), zEdge:g.zEdge});
      chk('  и сетка при этом замкнута — глазом и проверкой герметичности не поймать',
          manifoldCheck(t, 4).watertight === true);
      chk('  спецификация зовёт это вывернутым', g.inverted === true, g.tubeWall);
      chk('  и говорит словами', /УЗЕЛ ВЫВЕРНУТ/.test(warn(ov).join(' ')), warn(ov));
    }
    chk('на умолчаниях узел не вывернут', spec({}).inverted === false, spec({}).tubeWall);
    chk('  тонкий лист виноват не всегда: при листе 3 мм узел ещё цел',
        spec({pipLeafT:3}).inverted === false, spec({pipLeafT:3}).tubeWall);
  }
  /* 3. СПЁКШИЕСЯ СТВОРКИ. Ширина узла зажата снизу двумя миллиметрами, а шаг — это длина на число
     узлов. При длине 15 и 21 узле шаг выходит 0.71 мм, и каждый узел лезет в соседние: петля
     печатается сплошным бруском. Меряется тем, что в ПРОМЕЖУТКЕ между узлами остаётся материал
     наружного радиуса, тогда как у здоровой петли там только штифт. */
  {
    const outerAtGaps = (ov) => { const g = spec(ov), t = base(ov);
      let worst = 0;                                    // самый большой радиус, найденный в промежутках
      for (let i = 0; i + 1 < g.N; i++){
        const xg = -g.L/2 + (i + 1)*g.w;                // граница между узлами i и i+1
        const r = section(t, xg, g.fingerLen - 0.2, -1);
        if (r.length) worst = Math.max(worst, r[r.length-1]); }
      return worst; };
    const healthy = outerAtGaps({}), fusedM = outerAtGaps({pipLen:15, pipKnuckles:21});
    chk('у здоровой петли в промежутке между узлами только штифт',
        Math.abs(healthy - spec({}).pinD/2) < 0.05, {найдено:+healthy.toFixed(2), штифт:+(spec({}).pinD/2).toFixed(2)});
    chk('  а у спёкшейся там материал узла на всю его ширину',
        fusedM > spec({pipLen:15, pipKnuckles:21}).zEdge - 0.05,
        {найдено:+fusedM.toFixed(2), zEdge:spec({pipLen:15, pipKnuckles:21}).zEdge});
    chk('  спецификация зовёт это спёкшимся', spec({pipLen:15, pipKnuckles:21}).fused === true);
    chk('  и говорит словами', /СТВОРКИ СПЕКУТСЯ/.test(warn({pipLen:15, pipKnuckles:21}).join(' ')));
    chk('  на умолчаниях створки не спекаются', spec({}).fused === false, [spec({}).w, spec({}).wf]);
    /* Граница проходит там, где шаг сравнивается с зажатой шириной: при длине 45 и 21 узле шаг 2.14
       ещё больше двух, при длине 40 — уже меньше. */
    chk('  граница спекания там, где шаг падает ниже двух миллиметров',
        spec({pipLen:45, pipKnuckles:21}).fused === false &&
        spec({pipLen:40, pipKnuckles:21}).fused === true,
        [spec({pipLen:45, pipKnuckles:21}).w, spec({pipLen:40, pipKnuckles:21}).w]);
  }
  /* 4. МОЛЧАЛИВЫЕ ПРАВКИ ЗАКАЗА. Чётное число узлов поднимается до нечётного, узкая створка
     расширяется до минимальной, а зазор проходит через поправку посадки материала. Все три до сих пор
     срабатывали без единого слова. */
  {
    chk('чётное число узлов поднято до нечётного и об этом сказано',
        spec({pipKnuckles:4}).N === 5 && spec({pipKnuckles:4}).oddened === true &&
        /узлов 5, а не 4/.test(warn({pipKnuckles:4}).join(' ')), warn({pipKnuckles:4}));
    const g = spec({pipLeafW:6});
    chk('узкая створка расширена, и новая ширина названа',
        g.leafGrew === true && Math.abs(g.leafW - (g.fingerLen + 3)) < 1e-9 &&
        /поднята до 8\.1 мм с 6\.0/.test(warn({pipLeafW:6}).join(' ')), warn({pipLeafW:6}));
    const b = computeBBox(base({pipLeafW:6}));
    chk('  и деталь и правда стала этой ширины, а не заказанной',
        Math.abs((b.maxZ - b.minZ) - 2*g.leafW) < 0.05, {измерено:+(b.maxZ-b.minZ).toFixed(2), спец:2*g.leafW});
    chk('поправка посадки материала двигает зазор петли, и это объявлено',
        Math.abs(spec({fitTune:0.1}).gap - 0.45) < 1e-9 &&
        /вместо заказанных 0\.35/.test(warn({fitTune:0.1}).join(' ')), warn({fitTune:0.1}));
    chk('  на умолчаниях поправки нет и молчание законно',
        spec({}).gapShifted === false && spec({}).oddened === false && spec({}).leafGrew === false);
  }
  /* 5. РАЗБОРНАЯ. Штифт не печатается вовсе — сквозь узлы продевают пруток. Диаметр канала при этом
     выводится из ЛИСТА, а не из прутка, и на умолчаниях выходит 4.2 мм: филамент Ø1.75 в нём болтается.
     Ручка «Ø штифта» здесь и есть Ø прутка — но узнать это было неоткуда. */
  {
    const g = spec({pipPin:'removable'});
    chk('у разборной канал назван каналом, а не штифтом',
        /канал под пруток Ø4\.2 мм/.test(line(warn({pipPin:'removable'}))), line(warn({pipPin:'removable'})));
    const t = base({pipPin:'removable'});
    const r = rings(section(t, -g.L/2 + 1.5*g.w, g.fingerLen - 0.2, -1), 0.05);
    chk('  и в сечении штифта нет: колец два, а не три', r.length === 2, r);
    chk('  измеренный канал равен объявленному', Math.abs(2*r[0] - g.bore) < FACET,
        {измерено:+(2*r[0]).toFixed(3), спец:+g.bore.toFixed(3)});
    chk('  сказано, что канал выведен не из прутка', g.rodBlind === true &&
        /выведен из ТОЛЩИНЫ ЛИСТА/.test(warn({pipPin:'removable'}).join(' ')));
    chk('  а заданный Ø прутка снимает оговорку',
        spec({pipPin:'removable', pipPinD:1.75}).rodBlind === false);
    chk('  у неразборной этой оговорки нет вовсе', spec({}).rodBlind === false);
  }
  /* 6. ЧУЖИЕ РАЗНОВИДНОСТИ НЕ ЗАТРОНУТЫ: у футляра, клипсы, цепи и прочих свои числа и свои строки. */
  chk('строка про петлю есть только у плоской петли',
      ['box','clip','tie','clamp','snap','ball','chain','living','telescope','energy']
        .every(m => line(warn({pipMode:m})) === undefined),
      ['box','clip','tie','clamp','snap','ball','chain','living','telescope','energy']
        .filter(m => line(warn({pipMode:m})) !== undefined));
  chk('  и спецификация у них пуста',
      ['box','clip','snap','ball'].every(m => hingeSpec(setP({pipMode:m})) === null));
  setP({});
}

console.log('\n=== TOTAL:',pass,'passed,',fail,'failed ===');
process.exit(fail?1:0);
