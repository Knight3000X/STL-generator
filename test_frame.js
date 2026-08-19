// Рамка для фото: профиль багета, протянутый по замкнутому скруглённому прямоугольнику, плюс задник с
// проушиной. Проверяется не «строится ли» — рамка с вывернутым наизнанку проёмом тоже строится и тоже
// «герметична»: замерено, снимок 20×20 с нахлёстом 30 давал проём −40 мм, ноль открытых рёбер и на вид
// правильную деталь. Поэтому здесь меряются РАЗМЕРЫ (лучом сквозь деталь) и ОБЪЁМ (против точной
// формулы для прямоугольного кольца с фальцем), а не факт постройки.
// Запускать через ./run-all.sh (extraction test).

let pass=0, fail=0;
function chk(n,c,e){ if(c){pass++;console.log('  OK  ',n);} else {fail++;console.log('  FAIL',n,e!==undefined?JSON.stringify(e):'');} }
function vol(t){let v=0;for(const T of t){const a=T[0],b=T[1],c=T[2];v+=(a[0]*(b[1]*c[2]-b[2]*c[1])-a[1]*(b[0]*c[2]-b[2]*c[0])+a[2]*(b[0]*c[1]-b[1]*c[0]))/6;}return v;}
function base(ov){ logos.length=0; boxHoles.length=0; dieFaces.length=0;
  Object.assign(paramState.box, defaultBoxParams(), {frMode:'frame',
    frPhotoW:100, frPhotoH:150, frWidth:12, frOverlap:4, frT:10, frRabbetD:3,
    frProfile:'flat', frProfD:3, frCorner:0, frBackT:2, frHang:'none', frNailD:8}, ov||{});
  return buildTrisForShape('box', paramState.box); }
function par(ov){ base(ov); return Object.assign({}, paramState.box); }

// Отрезки материала вдоль оси ax через точку (p,q), где p — ось (ax+1)%3, q — ось (ax+2)%3.
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
    const nr=[e1[1]*e2[2]-e1[2]*e2[1], e1[2]*e2[0]-e1[0]*e2[2], e1[0]*e2[1]-e1[1]*e2[0]];
    if(Math.abs(nr[ax])<1e-12) continue;
    hits.push([w1*a[ax]+w2*b[ax]+(1-w1-w2)*c[ax], nr[ax]<0?1:-1]);
  }
  hits.sort((A,B)=>A[0]-B[0]);
  const runs=[]; let d=0, st=null;
  for(const [t0,dd] of hits){ const pr=d; d+=dd;
    if(pr<=0&&d>0) st=t0; else if(pr>0&&d<=0){ if(st!==null&&t0-st>1e-6) runs.push([st,t0]); st=null; } }
  return runs;
}
const runsX = (t,y,z) => solidRuns(t,0,y,z);   // вдоль X: p→Y, q→Z
const runsY = (t,x,z) => solidRuns(t,1,z,x);   // вдоль Y: p→Z, q→X

console.log('=== рамка: герметичность по всему диапазону ===');
for(const prof of ['flat','bevel','round','step'])
  for(const cr of [0,10,60])
    for(const ov of [0,4,30]){
      const t=base({frProfile:prof, frCorner:cr, frOverlap:ov}), mc=manifoldCheck(t,4);
      chk('профиль '+prof+' угол'+cr+' нахлёст'+ov+' watertight (+vol)', mc.watertight&&vol(t)>0,
          {open:mc.openEdges, bad:mc.badEdges});
    }
for(const ov of [{frPhotoW:20,frPhotoH:20},{frPhotoW:400,frPhotoH:400},{frPhotoW:20,frPhotoH:400},
                 {frWidth:3},{frWidth:60},{frT:4},{frT:40},{frRabbetD:30},{frProfD:30,frProfile:'bevel'},
                 {frPhotoW:20,frPhotoH:20,frOverlap:10,frWidth:3},
                 {frPhotoW:20,frPhotoH:20,frOverlap:30,frWidth:3},
                 {frCorner:60,frProfile:'round',frProfD:30}]){
  const t=base(ov), mc=manifoldCheck(t,4);
  chk('крайний случай '+JSON.stringify(ov)+' watertight', mc.watertight&&vol(t)>0, {open:mc.openEdges,bad:mc.badEdges});
}
console.log('=== задник: герметичность ===');
for(const ov of [{},{frHang:'keyhole'},{frHang:'keyhole',frNailD:16},{frHang:'keyhole',frNailD:4},
                 {frCorner:20,frHang:'keyhole'},{frPhotoW:20,frPhotoH:20,frHang:'keyhole',frNailD:16},
                 {frPhotoW:400,frPhotoH:400,frHang:'keyhole'},{frBackT:1},{frBackT:10}]){
  const t=base(Object.assign({frMode:'back'},ov)), mc=manifoldCheck(t,4);
  chk('задник '+JSON.stringify(ov)+' watertight (+vol)', mc.watertight&&vol(t)>0, {open:mc.openEdges,bad:mc.badEdges});
}

console.log('=== размеры выводятся из снимка ===');
{
  const t=base({}), B=computeBBox(t), s=frameSpec(par({}));
  chk('наружный габарит = снимок + 2·зазор + 2·багет',
      Math.abs((B.maxX-B.minX)-(100+1+24))<0.05 && Math.abs((B.maxZ-B.minZ)-(150+1+24))<0.05,
      {w:+(B.maxX-B.minX).toFixed(2), h:+(B.maxZ-B.minZ).toFixed(2)});
  chk('толщина = заданная', Math.abs((B.maxY-B.minY)-10)<0.05, {t:+(B.maxY-B.minY).toFixed(2)});
  // Проём мерится ЛУЧОМ на уровне передней губы, фальц — на уровне фальца.
  const yFront = B.minY + s.rabD + (s.T-s.rabD)*0.5, yRab = B.minY + s.rabD*0.5;
  const rf = runsX(t, yFront, 0), rr = runsX(t, yRab, 0);
  chk('на уровне губы луч встречает два бруса', rf.length===2, rf.map(x=>x.map(v=>+v.toFixed(2))));
  chk('световой проём = снимок − 2·нахлёст', Math.abs(2*rf[1][0]-(100-8))<0.05, {open:+(2*rf[1][0]).toFixed(2)});
  chk('фальц = снимок + 2·зазор', Math.abs(2*rr[1][0]-(100+1))<0.05, {rab:+(2*rr[1][0]).toFixed(2)});
  chk('и фальц ШИРЕ проёма — иначе снимку не на что лечь', rr[1][0] > rf[1][0]);
  // Глубина фальца — по столбику в зоне губы.
  const xLip = (rf[1][0]+rr[1][0])/2;
  const col = runsY(t, xLip, 0);
  chk('над фальцем стоит только губа', col.length===1 && Math.abs((col[0][1]-col[0][0])-(10-3))<0.05,
      col.map(x=>x.map(v=>+v.toFixed(2))));
  chk('и она с ПЕРЕДНЕЙ стороны', Math.abs(col[0][1]-B.maxY)<0.05, {top:+col[0][1].toFixed(2)});
  const colBody = runsY(t, (rr[1][0]+B.maxX)/2, 0);
  chk('за фальцем рамка на всю толщину', colBody.length===1 && Math.abs((colBody[0][1]-colBody[0][0])-10)<0.05,
      colBody.map(x=>x.map(v=>+v.toFixed(2))));
}

console.log('=== объём против точной формулы ===');
{
  /* Прямоугольное кольцо с фальцем считается ровно: габарит минус проём на высоту губы минус фальц на
     свою глубину. Совпадение с точностью до кубического миллиметра проверяет ВСЁ сразу — протяжку,
     фальц и ориентацию граней: перевёрнутая нормаль на горизонтальном участке профиля (полка фальца,
     задняя грань) даёт герметичную сетку с НЕПРАВИЛЬНЫМ знаком объёма, и никакая проверка рёбер этого
     не увидит. */
  const s=frameSpec(par({}));
  const openW=s.W-2*s.Wm, openH=s.H-2*s.Wm, rabW=s.W-2*(s.Wm-s.Wr), rabH=s.H-2*(s.Wm-s.Wr);
  const want=s.W*s.H*s.T - openW*openH*(s.T-s.rabD) - rabW*rabH*s.rabD;
  const got=vol(base({}));
  chk('объём плоской рамки сходится с формулой', Math.abs(got-want) < want*0.001,
      {got:+got.toFixed(1), want:+want.toFixed(1)});
  chk('и он положительный (нормали наружу)', got>0);
  // Задник — просто пластина.
  const b=frameBackSpec(par({frMode:'back'}));
  chk('объём задника = пластина', Math.abs(vol(base({frMode:'back'})) - b.W*b.H*b.T) < b.W*b.H*b.T*0.002,
      {got:+vol(base({frMode:'back'})).toFixed(1), want:+(b.W*b.H*b.T).toFixed(1)});
}

console.log('=== профиль багета правда меняет переднюю грань ===');
{
  const flat=vol(base({frProfile:'flat'}));
  for(const k of ['bevel','round','step']){
    const v=vol(base({frProfile:k, frProfD:3}));
    chk('профиль '+k+' снимает материал с лица', v < flat*0.999, {flat:+flat.toFixed(0), v:+v.toFixed(0)});
  }
  chk('вал снимает меньше скоса (он выпуклый)',
      vol(base({frProfile:'round',frProfD:3})) > vol(base({frProfile:'bevel',frProfD:3})));
  chk('глубже профиль — меньше материала',
      vol(base({frProfile:'bevel',frProfD:5})) < vol(base({frProfile:'bevel',frProfD:1})));
  chk('нулевая глубина — это плоский', Math.abs(vol(base({frProfile:'bevel',frProfD:0}))-flat)<1e-6);
  chk('«плоский» глубину профиля игнорирует', Math.abs(vol(base({frProfile:'flat',frProfD:9}))-flat)<1e-6);
  // Скос идёт ВНУТРЬ: у наружной кромки лицо выше, чем у проёма.
  const t=base({frProfile:'bevel',frProfD:3}), B=computeBBox(t), s=frameSpec(par({frProfile:'bevel',frProfD:3}));
  const outerTop=runsY(t, B.maxX-1.0, 0), innerTop=runsY(t, (s.W-2*s.Wm)/2+0.6, 0);
  chk('у наружной кромки лицо выше, чем у проёма', outerTop[0][1] > innerTop[0][1]+2,
      {outer:+outerTop[0][1].toFixed(2), inner:+innerTop[0][1].toFixed(2)});
}

console.log('=== задник входит в фальц ===');
{
  const s=frameSpec(par({})), b=frameBackSpec(par({frMode:'back'}));
  chk('задник уже фальца на зазор', Math.abs((s.photoW+2*FRAME_PHOTO_GAP - b.W) - 2*FRAME_BACK_GAP)<1e-9,
      {rab:s.photoW+2*FRAME_PHOTO_GAP, back:b.W});
  chk('и ниже фальца, чтобы не торчать', b.T <= s.rabD, {backT:b.T, rabD:s.rabD});
  chk('его углы совпадают с углом фальца', Math.abs(b.cornerR - Math.max(FRAME_MIN_R, s.cornerR - s.bw))<1e-9,
      {back:b.cornerR, want:s.cornerR-s.bw});
}

console.log('=== проушина ===');
{
  const t=base({frMode:'back', frHang:'keyhole'}), b=frameBackSpec(par({frMode:'back',frHang:'keyhole'}));
  const B=computeBBox(t);
  chk('шляпка прорезана насквозь', runsY(t, 0, b.top).length===0, runsY(t,0,b.top));
  chk('прорезь под ней тоже', runsY(t, 0, b.top - b.slotL*0.6).length===0);
  chk('а рядом с прорезью материал есть', runsY(t, b.slotW, b.top - b.slotL*0.6).length===1);
  chk('прорезь уже шляпки — иначе гвоздь выпадет', b.slotW < b.headD*0.6, {slot:b.slotW, head:b.headD});
  chk('и проушина внутри задника', b.top + b.headD/2 < b.H/2 && b.top - b.slotL > -b.H/2,
      {top:b.top, H:b.H});
  chk('габарит задника от неё не вырос', Math.abs((B.maxZ-B.minZ)-b.H)<0.05, {h:+(B.maxZ-B.minZ).toFixed(2)});
  chk('без подвеса дырки нет', runsY(base({frMode:'back',frHang:'none'}), 0, b.top).length===1);
  chk('и материала больше', vol(base({frMode:'back',frHang:'none'})) > vol(t));
}

console.log('=== смещение скруглённого прямоугольника ===');
{
  /* Смещение внутрь — это тот же прямоугольник с меньшим радиусом и НЕПОДВИЖНЫМИ центрами угловых дуг.
     На этом держится вся протяжка: не будь так, пришлось бы считать офсет многоугольника с разбором
     самопересечений. */
  const A=frameRectLoop(100,60,10,8), Bl=frameRectLoop(100-2*3, 60-2*3, 10-3, 8);
  chk('точек в обоих контурах поровну', A.pts.length===Bl.pts.length, [A.pts.length, Bl.pts.length]);
  let worst=0;
  for(let i=0;i<A.pts.length;i++){
    const cA=[A.pts[i][0]-10*A.nrm[i][0], A.pts[i][1]-10*A.nrm[i][1]];
    const cB=[Bl.pts[i][0]-7*Bl.nrm[i][0], Bl.pts[i][1]-7*Bl.nrm[i][1]];
    worst=Math.max(worst, Math.hypot(cA[0]-cB[0], cA[1]-cB[1]));
  }
  chk('центры угловых дуг не сдвинулись', worst<1e-9, worst);
  let off=0;
  for(let i=0;i<A.pts.length;i++)
    off=Math.max(off, Math.abs(Math.hypot(A.pts[i][0]-Bl.pts[i][0], A.pts[i][1]-Bl.pts[i][1]) - 3));
  chk('и каждая точка ушла ровно на смещение', off<1e-9, off);
  chk('нормали единичные', A.nrm.every(n=>Math.abs(Math.hypot(n[0],n[1])-1)<1e-12));
  const C=frameRectLoop(40,40,0,8);
  chk('нулевой радиус не схлопывает точки в одну', C.pts.some((q,i)=>i>0 && Math.hypot(q[0]-C.pts[i-1][0],q[1]-C.pts[i-1][1])>1e-9));
  const D=frameRectLoop(40,40,100,8);
  chk('радиус больше половины стороны ужимается', D.pts.every(q=>Math.abs(q[0])<=20+1e-9 && Math.abs(q[1])<=20+1e-9));
}

console.log('=== пределы названы вслух ===');
{
  const wOf=ov=>collectPrintWarnings(par(ov));
  chk('мелкая рамка под глубокий фальц', wOf({frT:4,frRabbetD:10}).some(w=>/фальц: просили/.test(w)), wOf({frT:4,frRabbetD:10}));
  chk('в пределах — молчит', !wOf({}).some(w=>/фальц: просили/.test(w)), wOf({}));
  chk('глубокий профиль', wOf({frProfile:'bevel',frProfD:30}).some(w=>/профиль багета/.test(w)));
  chk('нахлёст больше снимка', wOf({frPhotoW:20,frPhotoH:20,frOverlap:30}).some(w=>/нахлёст губы/.test(w)));
  chk('задник толще фальца', wOf({frBackT:6,frRabbetD:2}).some(w=>/мельче задника/.test(w)));
  chk('проушина не влезла', wOf({frMode:'back',frHang:'keyhole',frPhotoW:20,frPhotoH:20,frNailD:16})
        .some(w=>/проушина: просили|проушина не помещается/.test(w)),
      wOf({frMode:'back',frHang:'keyhole',frPhotoW:20,frPhotoH:20,frNailD:16}));
  chk('и совсем крошечный задник остаётся без подвеса',
      !frameBackSpec({frMode:'back',frHang:'keyhole',frPhotoW:20,frPhotoH:20,frBackT:2,frWidth:12,frT:10,frRabbetD:3,frNailD:16,frOverlap:0}).fits === false ||
      frameBackSpec({frMode:'back',frHang:'keyhole',frPhotoW:8,frPhotoH:8,frNailD:8}).hang === 'none');
}

console.log('=== рамка не задевает остальное приложение ===');
{
  const t=base({frMode:'none'}), B=computeBBox(t);
  chk('«нет» — это обычная коробка', Math.abs((B.maxX-B.minX)-(paramState.box.width))<0.6, {w:+(B.maxX-B.minX).toFixed(2)});
  const a=vol(base({frMode:'frame', divX:3, divZ:3, stackFeet:true, scoopDir:'x', labelTab:'front'}));
  const b=vol(base({frMode:'frame'}));
  chk('надстройки органайзера на рамку не лезут', Math.abs(a-b)<1e-9, {a,b});
}

console.log('\n'+(fail?'FAILED':'ALL PASSED')+': '+pass+' passed, '+fail+' failed');
if(fail) process.exitCode=1;
