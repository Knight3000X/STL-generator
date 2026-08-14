// Энергоцепь — кабельная гусеница: гнётся в ОДНУ сторону до заданного радиуса и в другую стоит прямой.
//
// Именно это отличает её от цепи (`pipMode:'chain'`), которая гнётся куда угодно, и именно это нельзя
// увидеть на экране: на столе лежат звенья россыпью, а всё, что про них важно, — про то, как они себя
// поведут, когда их защёлкнут друг в друга.
//
// Поэтому главная проверка здесь — НЕ ПРО СЕТКУ ОДНОГО ЗВЕНА, а про два. Второе звено сажается на палец
// первого и поворачивается; угол, на котором они впервые пересекаются, ищется делением пополам честным
// пересечением треугольник-против-треугольника (тот же Мёллер, что у зубчатых пар) — и обязан совпасть с
// тем, что объявляет спецификация. Совпасть, а не «примерно»: зазор выведен в замкнутой форме
// G = 2·Zbar·tg(θ/2), и если формула верна, замер ложится на неё до сотых градуса.
//
// Второе, что проверяется, — почему упор достаётся именно перемычкам. Торцы языков круглые и описаны
// радиусом от оси СВОЕГО шарнира: круг, вращаемый вокруг собственного центра, стоит на месте. Проверка
// требует, чтобы при повороте В ПРЕДЕЛАХ угла не пересекалось НИЧЕГО — то есть чтобы упор был там, где
// он спроектирован, а не там, где случайно сошлись две детали.
// Run via ./run-all.sh.
let pass=0, fail=0;
function chk(n,c,e){if(c){pass++;console.log('  OK  ',n);}else{fail++;console.log('  FAIL',n,e!==undefined?JSON.stringify(e):'');}}

function setp(ov){ logos.length=0; boxHoles.length=0; dieFaces.length=0;
  Object.assign(paramState.box, defaultBoxParams(), {gfBaseplate:false, pipMode:'energy'}, ov);
  return paramState.box; }
const mk   = ov => buildTrisForShape('box', setp(ov));
const spec = ov => energyChainSpec(setp(ov));
const warn = ov => { setp(ov); return collectPrintWarnings(paramState.box).join(' | '); };
const bbox = tris => { const lo=[1e30,1e30,1e30], hi=[-1e30,-1e30,-1e30];
  for(const T of tris) for(const v of T) for(let a=0;a<3;a++){ if(v[a]<lo[a])lo[a]=v[a]; if(v[a]>hi[a])hi[a]=v[a]; }
  return {lo,hi}; };

/* Пересечение треугольников по Мёллеру, с отсевом по коробкам через равномерную сетку — тот же приём и
   те же две функции, что в test_assembly.js: касание общей точкой или ребром не считается, считается
   только настоящий отрезок пересечения. Сравниваются ДВА РАЗНЫХ звена, поэтому соседние треугольники
   одной сетки, делящие ребро, сюда не попадают вовсе. */
function triTriOverlap(A,B){
  const sub=(u,v)=>[u[0]-v[0],u[1]-v[1],u[2]-v[2]], dot=(u,v)=>u[0]*v[0]+u[1]*v[1]+u[2]*v[2];
  const cr=(u,v)=>[u[1]*v[2]-u[2]*v[1],u[2]*v[0]-u[0]*v[2],u[0]*v[1]-u[1]*v[0]];
  const EPS=1e-9;
  const N1=cr(sub(A[1],A[0]),sub(A[2],A[0])), d1=-dot(N1,A[0]);
  const dB=B.map(q=>dot(N1,q)+d1);
  if((dB[0]>EPS&&dB[1]>EPS&&dB[2]>EPS)||(dB[0]<-EPS&&dB[1]<-EPS&&dB[2]<-EPS)) return false;
  const N2=cr(sub(B[1],B[0]),sub(B[2],B[0])), d2=-dot(N2,B[0]);
  const dA=A.map(q=>dot(N2,q)+d2);
  if((dA[0]>EPS&&dA[1]>EPS&&dA[2]>EPS)||(dA[0]<-EPS&&dA[1]<-EPS&&dA[2]<-EPS)) return false;
  const D=cr(N1,N2), aD=[Math.abs(D[0]),Math.abs(D[1]),Math.abs(D[2])];
  if(Math.max(...aD) < 1e-12) return false;       // копланарные — касание, а не проход насквозь
  const idx=aD.indexOf(Math.max(...aD));
  const interval=(T,d)=>{ const q=T.map(v=>v[idx]), out=[];
    for(let i=0;i<3;i++){ const j=(i+1)%3;
      if(d[i]*d[j]<0){ const t=d[i]/(d[i]-d[j]); out.push(q[i]+(q[j]-q[i])*t); }
      if(Math.abs(d[i])<=EPS) out.push(q[i]); }
    return out.length<2 ? null : [Math.min(...out), Math.max(...out)]; };
  const i1=interval(A,dA), i2=interval(B,dB);
  if(!i1||!i2) return false;
  return (Math.min(i1[1],i2[1]) - Math.max(i1[0],i2[0])) > 1e-6;
}
function triBBox(T){ const lo=[1e30,1e30,1e30], hi=[-1e30,-1e30,-1e30];
  for(const v of T) for(let a=0;a<3;a++){ if(v[a]<lo[a])lo[a]=v[a]; if(v[a]>hi[a])hi[a]=v[a]; } return {lo,hi}; }
function crossCount(M1, M2){
  const B2 = M2.map(triBBox);
  let lo=[1e30,1e30,1e30], hi=[-1e30,-1e30,-1e30];
  for(const b of B2) for(let a=0;a<3;a++){ if(b.lo[a]<lo[a])lo[a]=b.lo[a]; if(b.hi[a]>hi[a])hi[a]=b.hi[a]; }
  const span = Math.max(hi[0]-lo[0], hi[1]-lo[1], hi[2]-lo[2], 1e-6), cell = Math.max(span/40, 1e-6);
  const grid = new Map(), key=(i,j,k)=>i+','+j+','+k;
  const cellsOf = (b, fn) => {
    const i0=Math.floor((b.lo[0]-lo[0])/cell), i1=Math.floor((b.hi[0]-lo[0])/cell);
    const j0=Math.floor((b.lo[1]-lo[1])/cell), j1=Math.floor((b.hi[1]-lo[1])/cell);
    const k0=Math.floor((b.lo[2]-lo[2])/cell), k1=Math.floor((b.hi[2]-lo[2])/cell);
    for(let i=i0;i<=i1;i++) for(let j=j0;j<=j1;j++) for(let k=k0;k<=k1;k++) fn(key(i,j,k)); };
  for(let j=0;j<M2.length;j++) cellsOf(B2[j], k => { let a=grid.get(k); if(!a){a=[];grid.set(k,a);} a.push(j); });
  let n=0;
  for(const T of M1){ const b=triBBox(T);
    if(b.hi[0]<lo[0]||b.lo[0]>hi[0]||b.hi[1]<lo[1]||b.lo[1]>hi[1]||b.hi[2]<lo[2]||b.lo[2]>hi[2]) continue;
    const seen=new Set();
    cellsOf(b, k => { const a=grid.get(k); if(!a) return;
      for(const j of a){ if(seen.has(j)) continue; seen.add(j);
        if(b.lo[0]>B2[j].hi[0]||B2[j].lo[0]>b.hi[0]) continue;
        if(b.lo[1]>B2[j].hi[1]||B2[j].lo[1]>b.hi[1]) continue;
        if(b.lo[2]>B2[j].hi[2]||B2[j].lo[2]>b.hi[2]) continue;
        if(triTriOverlap(T, M2[j])) n++; } }); }
  return n;
}
// Сосед, надетый на палец: сдвиг на шаг и поворот вокруг оси пальца (в системе построителя это ось Y).
const mateAt = (s, A, th) => A.map(T => T.map(v => {
  const x=v[0], z=v[2], c=Math.cos(th), si=Math.sin(th);
  return [s.pitch + x*c - z*si, v[1], x*si + z*c]; }));
function bendLimitDeg(s, sign){          // угол, на котором звенья впервые встречаются
  const A = energyLinkTris(s);
  let lo = 0, hi = sign*75*Math.PI/180;
  for(let i=0;i<20;i++){ const m=(lo+hi)/2; if(crossCount(A, mateAt(s, A, m)) === 0) lo=m; else hi=m; }
  return Math.abs(lo)*180/Math.PI;
}

console.log('=== звено: сетка ===');
{
  const s = spec({}), one = energyLinkTris(s), mc = manifoldCheck(one);
  chk('одно звено герметично', mc.watertight, {open:mc.openEdges, bad:mc.badEdges});
  const all = mk({}), mca = manifoldCheck(all);
  chk('раскладка звеньев герметична', mca.watertight, {open:mca.openEdges, bad:mca.badEdges});
  chk('звеньев на столе столько, сколько заказано',
      Math.abs(all.length / one.length - s.N) < 1e-9, all.length/one.length);
  const bb = bbox(all);
  chk('высота раскладки — высота звена, а не его длина',
      Math.abs((bb.hi[1]-bb.lo[1]) - 2*s.Zbar) < 0.01, +(bb.hi[1]-bb.lo[1]).toFixed(2));
  chk('звенья лежат на столе, а не висят', Math.abs(bb.lo[1]) < 1e-9, bb.lo[1]);
  /* Положено НАБОК не для красоты: ось пальца обязана быть горизонтальной, иначе ступенька языка
     печатается плоской консолью в воздухе. Проверяется по сетке — отверстие видно сквозь звено вдоль Z. */
  chk('раскладка шире, чем выше — звенья лежат', (bb.hi[0]-bb.lo[0]) > 3*(bb.hi[1]-bb.lo[1]));
}

console.log('\n=== шарнир: два звена, повёрнутые друг относительно друга ===');
{
  const s = spec({});
  const A = energyLinkTris(s);
  chk('собранные звенья не пересекаются вовсе', crossCount(A, mateAt(s, A, 0)) === 0,
      crossCount(A, mateAt(s, A, 0)));
  chk('и на половине хода изгиба тоже', crossCount(A, mateAt(s, A, -s.theta/2)) === 0);
  chk('и почти на всём ходу', crossCount(A, mateAt(s, A, -s.theta*0.97)) === 0);
  chk('а за упором — встречаются', crossCount(A, mateAt(s, A, -s.theta*1.1)) > 0);
  chk('назад цепь не гнётся: за 3° уже упор', crossCount(A, mateAt(s, A, 4*Math.PI/180)) > 0);
}
{
  /* ГЛАВНАЯ ПРОВЕРКА: замеренный угол ложится на формулу. Зазор G = 2·Zbar·tg(θ/2) выведен из того, что
     торец перемычки отстоит от оси пальца на Zbar; если бы упор давало что-то другое — например круглые
     торцы языков, — замер ушёл бы от расчёта на градусы. */
  for(const ov of [{}, {ecRadius:25}, {ecRadius:120}, {ecH:20, ecPitch:40}, {ecW:20, ecWall:3}, {ecH:6}]){
    const s = spec(ov);
    chk('изгиб ' + JSON.stringify(ov) + ': замер = расчёт (' + s.thetaDeg.toFixed(2) + '°)',
        Math.abs(bendLimitDeg(s, -1) - s.thetaDeg) < 0.05,
        {замер:+bendLimitDeg(s,-1).toFixed(2), расчёт:+s.thetaDeg.toFixed(2)});
    chk('  и обратный упор тоже (' + s.thRevDeg.toFixed(2) + '°)',
        Math.abs(bendLimitDeg(s, +1) - s.thRevDeg) < 0.05,
        {замер:+bendLimitDeg(s,+1).toFixed(2), расчёт:+s.thRevDeg.toFixed(2)});
  }
}
{
  // Обратный упор — не «почти прямая», а прямая: назад цепь не складывается, и в этом весь её смысл.
  const s = spec({});
  chk('вперёд цепь гнётся в разы дальше, чем назад', s.thetaDeg > 8*s.thRevDeg,
      {вперёд:+s.thetaDeg.toFixed(1), назад:+s.thRevDeg.toFixed(1)});
}

{
  /* ПАЛЕЦ ДОЛЖЕН ВОЙТИ В ОТВЕРСТИЕ, а не просто разминуться с ним: непересечение двух звеньев само по
     себе так же верно для пары, лежащей врозь. Луч вдоль ОСИ ШАРНИРА показывает и то и другое: у соседа
     на этой оси нет материала вовсе (там отверстие), а палец первого звена заходит в его полосу. */
  const s = spec({});
  const A = energyLinkTris(s), B = mateAt(s, A, 0);
  const hitsY = (tris, x, z) => { const out=[];
    for(const T of tris){ const [a,b,c]=T;
      const d1=(b[0]-a[0])*(z-a[2])-(b[2]-a[2])*(x-a[0]);
      const d2=(c[0]-b[0])*(z-b[2])-(c[2]-b[2])*(x-b[0]);
      const d3=(a[0]-c[0])*(z-c[2])-(a[2]-c[2])*(x-c[0]);
      if(!((d1>=0&&d2>=0&&d3>=0)||(d1<=0&&d2<=0&&d3<=0))) continue;
      const Ar=(b[0]-a[0])*(c[2]-a[2])-(b[2]-a[2])*(c[0]-a[0]); if(Math.abs(Ar)<1e-12) continue;
      const w1=((b[0]-x)*(c[2]-z)-(b[2]-z)*(c[0]-x))/Ar, w2=((c[0]-x)*(a[2]-z)-(c[2]-z)*(a[0]-x))/Ar;
      out.push(w1*a[1]+w2*b[1]+(1-w1-w2)*c[1]); }
    return out.sort((p,q)=>p-q); };
  const onAxisB = hitsY(B, s.pitch, 0);
  chk('на оси шарнира у соседа материала нет — там отверстие', onAxisB.length === 0, onAxisB.length);
  const onAxisA = hitsY(A, s.pitch, 0);
  chk('а палец первого звена там есть', onAxisA.length >= 2, onAxisA.length);
  chk('и заходит в полосу соседа на высоту пальца',
      Math.abs(onAxisA[0] - (-s.gap - s.hPin)) < 0.01, {низ_пальца:+onAxisA[0].toFixed(2), ждали:+(-s.gap-s.hPin).toFixed(2)});
  // Стенка отверстия отстоит от пальца ровно на зазор — иначе шарнир либо спечётся, либо будет болтаться.
  const wall = (() => { for(let r = s.rPin; r < s.rEye; r += 0.01){
      const h = hitsY(B, s.pitch + r, 0); if(h.length) return r; } return NaN; })();
  chk('стенка отверстия — на зазор дальше пальца', Math.abs(wall - (s.rPin + s.gap)) < 0.06,
      {стенка:+wall.toFixed(2), ждали:+(s.rPin+s.gap).toFixed(2)});
}

console.log('\n=== радиус: связь угла, шага и зазора ===');
{
  const s = spec({});
  chk('R = p/(2·sin(θ/2)) — хорда звена лежит на окружности',
      Math.abs(s.R - s.pitch/(2*Math.sin(s.theta/2))) < 1e-9, +s.R.toFixed(3));
  chk('зазор G = 2·Zbar·tg(θ/2)', Math.abs(s.gBend - 2*s.Zbar*Math.tan(s.theta/2)) < 1e-9, +s.gBend.toFixed(3));
  chk('заказанный радиус и есть построенный', Math.abs(spec({ecRadius:60}).R - 60) < 1e-9);
  chk('больше радиус — меньше угол на звено', spec({ecRadius:120}).theta < spec({ecRadius:40}).theta);
  chk('больше радиус — меньше зазор между перемычками', spec({ecRadius:120}).gBend < spec({ecRadius:40}).gBend);
  // Радиус меньше минимального не даётся: зазор съел бы перемычку целиком.
  const tight = spec({ecRadius:5});
  chk('слишком тесный радиус поднят до предельного', tight.radCut && tight.R > 5 && Math.abs(tight.R - tight.rMin) < 1e-9,
      +tight.R.toFixed(1));
  chk('и об этом сказано словом', /радиус изгиба поднят/.test(warn({ecRadius:5})));
  chk('на пределе зазор — половина шага', Math.abs(tight.gBend - 0.5*tight.pitch) < 1e-6,
      {зазор:+tight.gBend.toFixed(2), шаг:tight.pitch});
  chk('и на пределе цепь всё ещё собирается', crossCount(energyLinkTris(tight),
      mateAt(tight, energyLinkTris(tight), 0)) === 0);
}

console.log('\n=== канал под кабели: просвет одинаков по всей длине ===');
{
  /* Просвет — САМОЕ УЗКОЕ место канала, а не габарит. В шарнире языки расходятся НАРУЖУ, поэтому в
     сечении поперёк цепи ширина канала не проседает нигде. Меряется по сетке лучом поперёк звена. */
  const s = spec({}), one = energyLinkTris(s);
  const hits = (x, z) => { const out=[];                 // где луч вдоль Y протыкает звено
    for(const T of one){ const [a,b,c]=T;
      const d1=(b[0]-a[0])*(z-a[2])-(b[2]-a[2])*(x-a[0]);
      const d2=(c[0]-b[0])*(z-b[2])-(c[2]-b[2])*(x-b[0]);
      const d3=(a[0]-c[0])*(z-c[2])-(a[2]-c[2])*(x-c[0]);
      if(!((d1>=0&&d2>=0&&d3>=0)||(d1<=0&&d2<=0&&d3<=0))) continue;
      const A=(b[0]-a[0])*(c[2]-a[2])-(b[2]-a[2])*(c[0]-a[0]); if(Math.abs(A)<1e-12) continue;
      const w1=((b[0]-x)*(c[2]-z)-(b[2]-z)*(c[0]-x))/A, w2=((c[0]-x)*(a[2]-z)-(c[2]-z)*(a[0]-x))/A;
      out.push(w1*a[1]+w2*b[1]+(1-w1-w2)*c[1]); }
    return out.sort((p,q)=>p-q); };
  let worst = 1e9, at = null;
  for(let k=0;k<=20;k++){ const x = s.rEye + (s.pitch - 2*s.rEye)*k/20;   // между шарнирами
    const h = hits(x, 0); if(h.length < 2) continue;
    // просвет — самый большой промежуток между соседними протыканиями (это и есть канал)
    let g = 0; for(let i=1;i<h.length;i++) g = Math.max(g, h[i]-h[i-1]);
    if(g < worst){ worst = g; at = +x.toFixed(1); } }
  chk("просвет канала нигде не меньше заказанного", worst > s.W - 0.01, {просвет:+worst.toFixed(2), заказано:s.W, при_x:at});
  chk('и не сильно больше — иначе это не тот канал', worst < s.W + 0.6, +worst.toFixed(2));
  const wide = spec({ecW:24});
  chk('ширина канала — своя ручка', wide.W === 24);
  const bbW = bbox(energyLinkTris(spec({ecW:24}))), bbN = bbox(energyLinkTris(spec({ecW:10})));
  chk('и она правда раздвигает боковины',
      (bbW.hi[1]-bbW.lo[1]) - (bbN.hi[1]-bbN.lo[1]) > 13, +((bbW.hi[1]-bbW.lo[1])-(bbN.hi[1]-bbN.lo[1])).toFixed(1));
}

console.log('\n=== защёлкивание: число, а не «на глаз» ===');
{
  const s = spec({});
  chk('деформация — та же формула, что у защёлки-консоли',
      Math.abs(s.eps - 100*1.5*s.hPin*s.wall/(s.arm*s.arm)) < 1e-9, +s.eps.toFixed(2));
  chk('материал берётся из общей таблицы', s.mat === SNAP_MATERIALS.petg);
  chk('длиннее шаг — легче защёлкнуть', spec({ecPitch:40}).eps < spec({ecPitch:20}).eps);
  chk('толще стенка — тяжелее', spec({ecWall:3}).eps > spec({ecWall:1.5}).eps);
  chk('PLA не выдерживает того, что выдерживает PETG',
      spec({ecMat:'pla'}).over && !spec({ecMat:'petg'}).over);
  chk('и об этом сказано словом', /защёлкивание рвёт язык/.test(warn({ecMat:'pla'})));
  chk('деформация печатается ВСЕГДА, а не только при перегрузе',
      /деформация .* % при допустимых/.test(warn({})));
}

console.log('\n=== числа доходят до слов ===');
{
  chk('радиус, канал и ход печатаются всегда', /радиус изгиба .* канал .* дают ход/.test(warn({})));
  chk('короткий шаг поднят и назван', /шаг звена поднят/.test(warn({ecPitch:6})));
  chk('толстый палец урезан и назван', /палец урезан/.test(warn({ecPinD:9})));
  chk('тонкий палец назван', /тоньше 1.6 мм/.test(warn({ecWall:1})));
  chk('тонкая стенка названа', /стенка энергоцепи/.test(warn({ecWall:1})));
  chk('нужный ход считается в звеньях', /нужно \d+ звеньев/.test(warn({ecTravel:800})));
  chk('и если звеньев не хватает — сказано, сколько добрать', /напечатайте ещё/.test(warn({ecTravel:800, ecLinks:4})));
  chk('короткая цепь: хода нет вовсе', /не хватает даже на полукруг/.test(warn({ecLinks:2})));
  chk('раскладка шире стола — сказано', /шире обычного стола/.test(warn({ecW:30, ecH:25, ecWall:3, ecLinks:20})));
  chk('на умолчаниях лишнего не говорят', collectPrintWarnings(setp({})).length === 2,
      collectPrintWarnings(paramState.box));
}

console.log('\n=== ход: сколько звеньев на сколько миллиметров ===');
{
  const s = spec({ecLinks:20});
  chk('ход = 2·(длина цепи − полукруг − заделка)',
      Math.abs(s.travel - 2*(20*s.pitch - Math.PI*s.R - 2*s.pitch)) < 1e-9, +s.travel.toFixed(1));
  chk('больше звеньев — больше ход', spec({ecLinks:30}).travel > spec({ecLinks:20}).travel);
  chk('больше радиус — меньше ход при том же числе звеньев',
      spec({ecLinks:20, ecRadius:120}).travel < spec({ecLinks:20, ecRadius:40}).travel);
  chk('короткая цепь даёт ноль, а не отрицательное', spec({ecLinks:1}).travel === 0);
  const need = spec({ecLinks:20, ecTravel:1000});
  chk('и обратный счёт сходится: заказанный ход требует звеньев', need.linksNeeded > 20, need.linksNeeded);
  chk('столько звеньев этот ход и дают',
      spec({ecLinks:need.linksNeeded, ecTravel:1000}).travel >= 1000,
      +spec({ecLinks:need.linksNeeded}).travel.toFixed(0));
}

console.log('\n=== своё, а не чужое ===');
{
  const vol = t => { let v=0; for(const T of t){ const [a,b,c]=T;
    v += (a[0]*(b[1]*c[2]-b[2]*c[1]) - a[1]*(b[0]*c[2]-b[2]*c[0]) + a[2]*(b[0]*c[1]-b[1]*c[0]))/6; } return v; };
  const a = mk({}), b = mk({chainN:9, chainLen:40, telN:6, snapLen:60});
  chk('ручки соседних подмоделей энергоцепь не трогают', Math.abs(vol(a)-vol(b)) < 1e-9);
  chk('справка на месте', !!MODEL_HELP['hinge:energy']);
  chk('справка называет главное — радиус', /радиус/.test(MODEL_HELP['hinge:energy'].what));
  chk('и материалы в ней настоящие',
      MODEL_HELP['hinge:energy'].mat.every(m => !!PRINT_MATERIALS[m]), MODEL_HELP['hinge:energy'].mat);
  setp({});
  chk('модель называет себя энергоцепью', /энергоцеп/.test(activeShapeLabel()), activeShapeLabel());
}

console.log('\n=== TOTAL:', pass, 'passed,', fail, 'failed ===');
if(fail) process.exitCode = 1;
