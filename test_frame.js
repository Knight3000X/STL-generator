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
  chk('прорезь тоже', runsY(t, 0, b.top + b.slotL*0.6).length===0);
  chk('а рядом с прорезью материал есть', runsY(t, b.slotW, b.top + b.slotL*0.6).length===1);
  /* СУЖЕНИЕ СВЕРХУ, А НЕ СНИЗУ — и это не про вид, а про то, держится ли рамка на гвозде. Гвоздь заводят
     в круглое окно и рамку ОТПУСКАЮТ: она едет вниз, гвоздь относительно неё уходит ВВЕРХ и попадает в
     узкую прорезь, откуда шляпке не пройти. Перевёрнутая проушина строится и герметична ровно так же, а
     рамка съезжает с гвоздя тем же движением, каким её вешали.

     Меряется ШИРИНА ДЫРЫ на двух высотах: у центра окружности она равна шляпке, выше — прорези. */
  const holeWidth = (z) => { let lo=null, hi=null;
    for(let i=0;i<=400;i++){ const x = -b.headD + 2*b.headD*i/400;
      if (runsY(t, x, z).length === 0){ if(lo===null) lo=x; hi=x; } }
    return lo===null ? 0 : hi-lo; };
  const wHead = holeWidth(b.top), wSlot = holeWidth(b.top + b.slotL*0.6);
  chk('у центра окружности дыра шириной со шляпку', Math.abs(wHead - b.headD) < 0.6,
      {got:+wHead.toFixed(2), want:b.headD});
  chk('выше — шириной с прорезь', Math.abs(wSlot - b.slotW) < 0.6, {got:+wSlot.toFixed(2), want:b.slotW});
  chk('то есть сужение СВЕРХУ, а не снизу', wSlot < wHead*0.7, {slot:+wSlot.toFixed(2), head:+wHead.toFixed(2)});
  chk('а ниже окружности дыры нет вовсе', holeWidth(b.top - b.headD/2 - 1.0) === 0,
      holeWidth(b.top - b.headD/2 - 1.0));
  chk('прорезь уже шляпки — иначе гвоздь выпадет', b.slotW < b.headD*0.6, {slot:b.slotW, head:b.headD});
  /* ШЛЯПКА ПРОРЕЗАНА ЦЕЛИКОМ, А НЕ ПОЛОВИНОЙ. Первая версия обходила ПОЛОВИНУ окружности и замыкалась
     прямо на прорезь: выходил полудиск с хвостиком — контур по X от −4.00 до +1.80 при радиусе 4. Луч по
     оси такое проходит насквозь, и все прежние проверки (дырка в центре, дырка в прорези, материал
     рядом) на нём проходили. Ловится это только промером ПОПЕРЁК: слева и справа от оси должно быть
     одинаково пусто, а за краем шляпки — одинаково твёрдо. */
  const r0 = b.headD/2;
  chk('шляпка пуста и слева, и справа от оси',
      runsY(t, -r0*0.7, b.top).length === 0 && runsY(t, r0*0.7, b.top).length === 0,
      {left:runsY(t,-r0*0.7,b.top).length, right:runsY(t,r0*0.7,b.top).length});
  chk('а за её краем материал с обеих сторон',
      runsY(t, -r0*1.6, b.top).length === 1 && runsY(t, r0*1.6, b.top).length === 1);
  let sym = true, probes = 0;
  for(let k=0;k<48;k++){ const a2=2*Math.PI*k/48, x=r0*0.6*Math.cos(a2), z=b.top + r0*0.6*Math.sin(a2);
    probes++;
    if((runsY(t,x,z).length===0) !== (runsY(t,-x,z).length===0)) sym = false; }
  chk('и вся проушина симметрична относительно оси', sym && probes===48, {sym, probes});
  /* Снятая площадь — круг ПЛЮС ТО, ЧТО ПРОРЕЗЬ ДОБАВЛЯЕТ К НЕМУ, а не круг плюс вся прорезь: верхняя
     часть прорези лежит внутри круга и уже посчитана. Стык прорези с окружностью — на глубине r·cos φ,
     где sin φ = hw/r. Прежняя, наивная формула завышала на 18 %, и проверка с допуском 15 % падала на
     ПРАВИЛЬНОМ коде. */
  const cut = vol(base({frMode:'back', frHang:'none'})) - vol(t);
  const hw0 = Math.min(b.slotW/2, r0*0.8), phi0 = Math.asin(hw0/r0);
  const want = (Math.PI*r0*r0 + b.slotW*(b.slotL - r0*Math.cos(phi0)))*b.T;
  chk('снятый объём = шляпка плюс выступающая часть прорези', Math.abs(cut - want) < want*0.05,
      {cut:+cut.toFixed(1), want:+want.toFixed(1)});
  chk('и это заметно больше половины круга', cut > (Math.PI*r0*r0/2)*b.T*1.4,
      {cut:+cut.toFixed(1), half:+((Math.PI*r0*r0/2)*b.T).toFixed(1)});
  chk('и проушина внутри задника', b.top + b.slotL < b.H/2 && b.top - b.headD/2 > -b.H/2,
      {top:b.top, H:b.H});
  chk('и держится у ВЕРХНЕГО края, а не посередине', b.top + b.slotL > b.H/2 - 6, {top:b.top, H:b.H});
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

console.log('=== подставка на стол ===');
{
  /* Паз держит рамку и задаёт наклон сам — ни петли, ни упора. Меряется ПО СЕТКЕ, а не по
     спецификации: горизонтальный луч на двух высотах даёт и ширину паза (хорда t/cos θ), и сдвиг его
     середины, из которого выводится сам угол. */
  const runsZ = (t, x, y) => solidRuns(t, 2, x, y);          // вдоль Z: p→X, q→Y
  const st = (ov) => { base(Object.assign({frMode:'stand'}, ov)); return frameStandSpec(paramState.box); };
  const mesh = (ov) => base(Object.assign({frMode:'stand'}, ov));

  for(const ov of [{}, {frStandAngle:3}, {frStandAngle:35}, {frT:4}, {frT:40}, {frT:40,frStandAngle:35},
                   {frPhotoH:400}, {frPhotoH:20}, {frPhotoW:400}, {frWidth:60}, {frWidth:3},
                   {frStandLen:20}, {frStandLen:400}, {frPhotoW:20,frPhotoH:20,frT:40}]){
    const t = mesh(ov), mc = manifoldCheck(t,4);
    chk('подставка '+JSON.stringify(ov)+' watertight (+vol)', mc.watertight && vol(t)>0,
        {open:mc.openEdges, bad:mc.badEdges});
  }

  // Габарит совпадает со спецификацией — значит ничего не выпирает наружу.
  for(const ov of [{}, {frT:40}, {frStandAngle:35}]){
    const s2 = st(ov), B = computeBBox(mesh(ov));
    chk('габарит = спецификация '+JSON.stringify(ov),
        Math.abs((B.maxX-B.minX)-s2.L) < 0.02 && Math.abs((B.maxY-B.minY)-s2.hB) < 0.02 &&
        Math.abs((B.maxZ-B.minZ)-s2.D) < 0.02,
        {L:+(B.maxX-B.minX).toFixed(2), h:+(B.maxY-B.minY).toFixed(2), D:+(B.maxZ-B.minZ).toFixed(2),
         want:[+s2.L.toFixed(2), +s2.hB.toFixed(2), +s2.D.toFixed(2)]});
  }

  /* ПАЗ ЦЕЛИКОМ ВНУТРИ БРУСКА. Первая версия считала высоту бруска по глубине паза и забывала, что
     наклонённый паз опускает свой задний нижний угол ещё на (t/2)·sin θ: при рамке толщиной 40 мм это
     5.2 мм, и паз прорезал основание насквозь. Брусок выходил 34.2 мм вместо 32.0 — контур
     самопересёкся, а `manifoldCheck` смолчал, потому что триангуляция всё равно замкнулась. */
  for(const ov of [{}, {frT:40}, {frT:40,frStandAngle:35}, {frWidth:3}]){
    const s2 = st(ov), t = mesh(ov), B = computeBBox(t);
    /* Луч ставится В СТОРОНЕ ОТ ОСИ. При x = 0 он идёт ровно по диагонали триангуляции торцевой крышки,
       пересечение вырождается, и проба возвращает пусто на сплошном материале — первая версия этой
       проверки падала именно так, а не из-за геометрии. */
    const xp = s2.L*0.17;
    let holes = 0, probes = 0;
    for(let k=0;k<=60;k++){ probes++;
      const z = B.minZ + 0.3 + (B.maxZ - B.minZ - 0.6)*k/60;
      if (runsY(t, xp, z).length === 0) holes++;              // сквозная дыра снизу доверху
    }
    chk('снизу паз не выходит наружу '+JSON.stringify(ov), holes === 0, {holes, probes});
    const col = runsY(t, xp, B.minZ + (B.maxZ-B.minZ)*0.83);  // заведомо позади паза
    chk('под пазом остаётся дно '+JSON.stringify(ov), col.length === 1 && col[0][0] < B.minY+0.02,
        col.map(x=>x.map(v=>+v.toFixed(2))));
  }

  // Ширина паза и его наклон — с меша.
  for(const ov of [{}, {frT:4}, {frT:25}, {frStandAngle:30}]){
    const s2 = st(ov), t = mesh(ov), B = computeBBox(t);
    const chord = (y) => { const r = runsZ(t, s2.L*0.17, y);
      if (r.length !== 2) return null;
      return { w: r[1][0] - r[0][1], mid: (r[0][1] + r[1][0])/2 }; };
    const y1 = B.maxY - 0.6, y2 = B.maxY - Math.min(4, s2.d*Math.cos(s2.th) - 0.6);
    const c1 = chord(y1), c2 = chord(y2);
    chk('луч встречает брусок по обе стороны паза '+JSON.stringify(ov), !!(c1 && c2), {c1, c2});
    if (c1 && c2){
      /* Сверяется с ТОЛЩИНОЙ РАМКИ плюс зазор, посчитанной здесь заново, а не с шириной паза из той же
         спецификации: сверять спецификацию с самой собой — значит проверить, что она равна себе. Первая
         версия так и делала, и мутация «убрать зазор» её проходила. */
      const wantT = frameSpec(par(Object.assign({frMode:'stand'}, ov))).T + FRAME_STAND_GAP;
      chk('ширина паза = толщина рамки + зазор '+JSON.stringify(ov),
          Math.abs(c1.w - wantT/Math.cos(s2.th)) < 0.05,
          {got:+c1.w.toFixed(3), want:+(wantT/Math.cos(s2.th)).toFixed(3)});
      const ang = Math.atan2(c1.mid - c2.mid, y1 - y2)*180/Math.PI;
      chk('наклон паза = заданному '+JSON.stringify(ov), Math.abs(Math.abs(ang) - s2.angDeg) < 0.6,
          {got:+ang.toFixed(2), want:s2.angDeg});
    }
  }

  /* ГЛУБИНА ОСНОВАНИЯ ВЫВЕДЕНА ИЗ ВЫСОТЫ РАМКИ, а не введена рядом. Наклонённая рамка держит центр
     тяжести примерно на половине высоты, и по горизонтали он уезжает назад на (H/2)·sin θ. Основание
     обязано доставать за эту точку — иначе опрокинется. */
  for(const ov of [{}, {frPhotoH:400}, {frStandAngle:35}, {frPhotoH:400,frStandAngle:35}]){
    const s2 = st(ov);
    chk('основание достаёт за центр тяжести '+JSON.stringify(ov),
        s2.back >= s2.f.H/2*Math.sin(s2.th) + FRAME_STAND_TIP - 1e-9,
        {back:+s2.back.toFixed(2), need:+(s2.f.H/2*Math.sin(s2.th)).toFixed(2)});
  }
  chk('выше рамка — глубже основание', st({frPhotoH:400}).D > st({frPhotoH:100}).D*1.5,
      {tall:+st({frPhotoH:400}).D.toFixed(1), short:+st({frPhotoH:100}).D.toFixed(1)});
  chk('круче наклон — глубже основание', st({frStandAngle:35}).D > st({frStandAngle:5}).D*2,
      {steep:+st({frStandAngle:35}).D.toFixed(1), flat:+st({frStandAngle:5}).D.toFixed(1)});
  /* Глубина паза растёт вместе с толщиной рамки, иначе толстая рамка болтается в мелком пазу. Своим
     числом это не проверить — «12 мм» проходит и там, и там; проверяется ЗАВИСИМОСТЬ. */
  chk('толще рамка — глубже паз', st({frT:20}).d > st({frT:5}).d*1.9,
      {thick:+st({frT:20}).d.toFixed(1), thin:+st({frT:5}).d.toFixed(1)});
  chk('и глубина упирается в потолок, а не растёт без конца', st({frT:40}).d === st({frT:30}).d,
      {t40:+st({frT:40}).d.toFixed(1), t30:+st({frT:30}).d.toFixed(1)});
  chk('длина по умолчанию — от ширины рамки',
      Math.abs(st({}).L - frameSpec(par({})).W*0.45) < 0.01, +st({}).L.toFixed(2));
  chk('и заданная вручную перебивает авто', Math.abs(st({frStandLen:75}).L - 75) < 1e-9);

  // Подставке безразлично то, от чего она не зависит.
  {
    const a2 = vol(mesh({frProfile:'round', frProfD:5, frCorner:20, frOverlap:0, frRabbetD:2}));
    const b2 = vol(mesh({}));
    chk('профиль, углы, нахлёст и фальц на подставку не влияют', Math.abs(a2-b2) < 1e-9, {a2, b2});
    chk('а толщина рамки влияет', Math.abs(vol(mesh({frT:20})) - b2) > 1);
  }
  // Пределы названы вслух.
  {
    const wOf = ov => collectPrintWarnings(par(Object.assign({frMode:'stand'}, ov)));
    chk('короткая подставка', wOf({frStandLen:20}).some(w=>/держать от заваливания/.test(w)), wOf({frStandLen:20}));
    chk('обычная молчит', wOf({}).length === 0, wOf({}));
    chk('глубокое основание названо', wOf({frPhotoH:20, frStandAngle:35}).some(w=>/опрокинется/.test(w)),
        wOf({frPhotoH:20, frStandAngle:35}));
  }
  // Вырожденных граней нет.
  for(const ov of [{}, {frT:40,frStandAngle:35}, {frStandAngle:3}]){
    const t = mesh(ov); let mn = 1e9;
    for(const T of t){ const u=[T[1][0]-T[0][0],T[1][1]-T[0][1],T[1][2]-T[0][2]], v=[T[2][0]-T[0][0],T[2][1]-T[0][1],T[2][2]-T[0][2]];
      mn = Math.min(mn, 0.5*Math.hypot(u[1]*v[2]-u[2]*v[1], u[2]*v[0]-u[0]*v[2], u[0]*v[1]-u[1]*v[0])); }
    chk('нет граней нулевой площади '+JSON.stringify(ov), mn > 1e-6, mn.toExponential(2));
  }
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
