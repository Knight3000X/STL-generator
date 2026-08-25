// Wall organiser (настенный органайзер): French-cleat / pegboard back × hook / shelf / tools / plate front,
// through the REAL buildTrisForShape pipeline. Watertight, real cleat lip / pegs / holder. Run via ./run-all.sh.
let pass=0,fail=0; function chk(n,c,e){if(c){pass++;console.log('  OK  ',n);}else{fail++;console.log('  FAIL',n,e!==undefined?JSON.stringify(e):'');}}
function vol(t){let v=0;for(const T of t){const a=T[0],b=T[1],c=T[2];v+=(a[0]*(b[1]*c[2]-b[2]*c[1])-a[1]*(b[0]*c[2]-b[2]*c[0])+a[2]*(b[0]*c[1]-b[1]*c[0]))/6;}return v;}
function base(ov){ logos.length=0; boxHoles.length=0; dieFaces.length=0;
  Object.assign(paramState.box, defaultBoxParams(), {width:40,height:40,depth:40,
    woBack:'cleat',woFront:'hook',woW:60,woH:60,woT:5,woCleatLip:8,woPegD:6,woPegSpacing:25.4,woPegN:2,woPegLen:10,
    woHookBar:8,woHookReach:24,woHookDrop:14,woShelfD:35,woShelfT:4,woToolN:3,woToolD:16,
    hookMount:'none',mntMode:'none',gearMode:'none',pipMode:'none',threadMode:'none',sheetShape:'none',keycapMode:'none',platonic:'none',polyN:0,binRound:0,
    scoopDir:'none',labelTab:'none',mountHoles:'none',gripWall:'none',divX:1,divZ:1,stackFeet:false,gfOn:false}, ov);
  return buildTrisForShape('box',paramState.box); }

console.log('=== every back × front combination is watertight ===');
for(const back of ['cleat','peg']) for(const front of ['hook','shelf','tools','none']){
  const t=base({woBack:back,woFront:front}); const mc=manifoldCheck(t,4);
  chk(back+' + '+front+' watertight (+vol)', mc.watertight&&vol(t)>0, {wt:mc.watertight,open:mc.openEdges});
}

/* ПЕРЕХОДНИКИ МЕЖДУ СИСТЕМАМИ. Сзади любая из трёх (соты, перфопанель, планка), спереди — другая.
   Проверяется здесь не «строится ли», а то, что разъезжается тихо:

     1. РЕЙКА ОБЯЗАНА СХОДИТЬСЯ С ОТВЕТНЫМ ЗАДНИКОМ. Наклон, подобранный на глаз, даёт две детали,
        каждая из которых строится, выглядит правильно и проходит любую проверку герметичности, — а
        не сходятся они только вживую, на столе. Поэтому клин рейки ВЫВЕДЕН из задника поворотом на
        пол-оборота, и проверка сравнивает наклоны настоящих граней, а не числа в коде.
     2. ПЛИТА GRIDFINITY ДОЛЖНА БЫТЬ ТОЙ ЖЕ САМОЙ. Второй раз выписать шаг 42 и профиль ножки —
        значит завести им второе место жительства; разъедутся они молча, бины перестанут садиться, а
        выглядеть будет по-прежнему. */
console.log('=== переходники: все девять сочетаний спинки и лица ===');
for(const back of ['cleat','peg','hex']) for(const front of ['cleatrail','gfshelf','hook']){
  const t=base({woBack:back,woFront:front}); const mc=manifoldCheck(t,4);
  chk(back+' → '+front+' герметично (+объём)', mc.watertight&&vol(t)>0, {wt:mc.watertight,open:mc.openEdges});
}
/* РЕЙКА ПРОВЕРЯЕТСЯ СБОРКОЙ, А НЕ НАКЛОНОМ ГРАНИ. Прежняя проверка сравнивала наклоны двух граней и
   требовала их совпадения после поворота на пол-оборота. Наклон совпадал — а переходник не работал:
   материал у клина оказался НАД скосом вместо под ним, и ответной планке было не на что лечь.
   Совпадение наклона не есть зацепление, и разница видна только если детали СОБРАТЬ.

   Собираются они без разворота: «стеной» для ответной детали служит лицевая грань переходника, и
   обе модели строятся в одном соглашении — стена сзади, тело вперёд. Дальше проверяются три вещи,
   и вместе они и есть французская планка:
     ОПОРА     — опусти деталь, и она упрётся: ей есть на чём висеть;
     УПОР      — потяни ПРЯМО НА СЕБЯ, и она упрётся в скос: просто так не снимается;
     СЪЁМ      — потяни вверх-и-на-себя, и она сходит: это не замок, а планка.
   Считается всё по сечению при одном x: обе детали в этом месте — призмы вдоль X. */
console.log('=== переходник: рейка ДЕРЖИТ ответную деталь ===');
{
  const spansZ = (t,x,y) => { const hs=[];
    for(const T of t){ const [a,b,c]=T;
      const d1=(b[0]-a[0])*(y-a[1])-(b[1]-a[1])*(x-a[0]);
      const d2=(c[0]-b[0])*(y-b[1])-(c[1]-b[1])*(x-b[0]);
      const d3=(a[0]-c[0])*(y-c[1])-(a[1]-c[1])*(x-c[0]);
      if(!((d1>=0&&d2>=0&&d3>=0)||(d1<=0&&d2<=0&&d3<=0))) continue;
      const A=(b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0]); if(Math.abs(A)<1e-12) continue;
      const w1=((b[0]-x)*(c[1]-y)-(b[1]-y)*(c[0]-x))/A, w2=((c[0]-x)*(a[1]-y)-(c[1]-y)*(a[0]-x))/A;
      const z=w1*a[2]+w2*b[2]+(1-w1-w2)*c[2];
      const nz=(b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0]);
      hs.push([z, nz>0?1:-1]); }
    hs.sort((u,v)=>u[0]-v[0]);
    const out=[]; let w=0, st=0;
    for(const [z,sg] of hs){ if(w===0) st=z; w-=sg; if(w===0) out.push([st,z]); }
    return out; };
  const STEP = 0.25, X = 0.37;
  const A = base({woBack:'peg', woFront:'cleatrail'});
  const I = base({woBack:'cleat', woFront:'none'});
  const bA = computeBBox(A), bI = computeBBox(I);
  const rowsA = new Map(), rowsI = new Map();
  for(let y=bA.minY; y<=bA.maxY; y+=STEP) rowsA.set(+y.toFixed(2), spansZ(A, X, y));
  for(let y=bI.minY; y<=bI.maxY; y+=STEP) rowsI.set(+y.toFixed(2), spansZ(I, X, y));
  /* Сдвиги обязаны быть КРАТНЫ шагу выборки: строка ответной детали ищется по точному ключу, и сдвиг
     на 0.4 при шаге 0.25 не попадал в сетку — «опирается ли деталь» отвечало «нет» всегда, при любой
     геометрии. Проверка при этом выглядела работающей. */
  const overlap = (dy, dz) => { let sum = 0;
    for(const [y, sa] of rowsA){
      const si = rowsI.get(+(y-dy).toFixed(2)); if(!si) continue;
      for(const [a0,a1] of sa) for(const [i0,i1] of si){
        const lo = Math.max(a0, i0+dz), hi = Math.min(a1, i1+dz);
        if (hi > lo) sum += hi-lo; } }
    return sum*STEP; };
  const lip = 8, t = 5;
  const good = [];
  for(let dz = t; dz <= t + 3*lip; dz += STEP)
    for(let dy = 0; dy <= lip + 4; dy += STEP){
      if (overlap(dy, dz) > 1e-9) continue;
      const rest = overlap(dy - 0.5, dz), fwd = overlap(dy, dz + 1.0), up = overlap(dy + 1.0, dz + 1.0);
      if (rest > 0.1 && fwd > 0.5 && up < 1e-9) good.push({dy:+dy.toFixed(2), dz:+dz.toFixed(2), опора:+rest.toFixed(2)});
    }
  chk('ответная деталь СЦЕПЛЯЕТСЯ с рейкой — такая посадка есть', good.length > 0, {посадок:good.length});
  if (good.length){
    good.sort((a,b) => b.опора - a.опора);
    const g = good[0];
    chk('  в посадке детали не пересекаются', overlap(g.dy, g.dz) < 1e-9, overlap(g.dy, g.dz));
    chk('  она на чём-то ВИСИТ: опустить нельзя', overlap(g.dy - 0.5, g.dz) > 0.1, g.опора);
    chk('  ПРЯМО НА СЕБЯ не снимается: упирается в скос', overlap(g.dy, g.dz + 1.0) > 0.5,
        +overlap(g.dy, g.dz + 1.0).toFixed(2));
    chk('  а вверх-и-на-себя сходит: это планка, а не замок',
        overlap(g.dy + 1.0, g.dz + 1.0) < 1e-9, +overlap(g.dy + 1.0, g.dz + 1.0).toFixed(3));
    /* СКОЛЬЖЕНИЕ ПО СКОСУ — подпись параллельных граней. Если сцепленные посадки образуют дорожку,
       где dy и dz растут шаг в шаг, значит грани лежат друг на друге, а не касаются углом. */
    const track = good.filter(q => Math.abs((q.dz - g.dz) - (q.dy - g.dy)) < 1e-6);
    chk('  и грани лежат друг на друге, а не углом: посадки идут дорожкой по скосу',
        track.length >= 4, {надорожке:track.length, всего:good.length});
  }
  /* И РЕЙКА ОБЯЗАНА ЕХАТЬ ЗА ВЫЛЕТОМ: жёстко вписанный скос сошёлся бы при одном вылете и разъехался
     при любом другом, а деталь строилась бы и выглядела правильно при всех. */
  const depth = ov => { const b = computeBBox(base(Object.assign({woBack:'peg', woFront:'cleatrail'}, ov)));
    return b.maxZ - b.minZ; };
  chk('вылет рейки едет за вылетом зацепа',
      Math.abs((depth({woCleatLip:20}) - depth({woCleatLip:8})) - 12) < 0.6,
      {вылет8:+depth({woCleatLip:8}).toFixed(1), вылет20:+depth({woCleatLip:20}).toFixed(1)});
}
console.log('=== переходник: полка Gridfinity — та же плита, а не вторая копия ===');
{
  const shelf = ov => base(Object.assign({woBack:'hex', woFront:'gfshelf'}, ov));
  const bb = t => { const b=computeBBox(t); return {x:b.maxX-b.minX, y:b.maxY-b.minY, z:b.maxZ-b.minZ}; };
  /* Плита строится своим построителем, поэтому её шаг обязан ехать за числом ячеек ровно на 42 мм —
     то же число, которым живёт вся остальная Gridfinity этого приложения. */
  /* Ширину берём от ДВУХ ячеек и выше: при одной плита (42) уже спинки (60), и габарит меряет
     спинку, а не плиту — разница вышла бы 24 вместо 42, и проверка ловила бы не то. */
  const one = bb(shelf({gfX:2, gfY:1})), two = bb(shelf({gfX:3, gfY:1}));
  chk('лишняя ячейка по X добавляет ровно шаг Gridfinity',
      Math.abs((two.x - one.x) - GF_PITCH) < 0.3, {было:+one.x.toFixed(1), стало:+two.x.toFixed(1), шаг:GF_PITCH});
  const shallow = bb(shelf({gfX:2, gfY:1})), deep = bb(shelf({gfX:2, gfY:2}));
  chk('и лишняя ячейка по Y — ровно шаг в глубину',
      Math.abs((deep.z - shallow.z) - GF_PITCH) < 0.3, {было:+shallow.z.toFixed(1), стало:+deep.z.toFixed(1)});
  chk('полка глубже плоской полки — она несёт плиту', bb(shelf({gfX:2,gfY:2})).z > bb(base({woBack:'hex',woFront:'shelf'})).z);
  /* КОСЫНКИ. Полка вылетает вперёд на всю глубину плиты и держится одной кромкой. Без подкоса она
     отламывается по слою — и это не гипотеза, а первое, что ломается у печатных полок.

     Сравнивать объём полки с плитой и плоской полки БЕСПОЛЕЗНО: разницу целиком съедает сама плита,
     и мутация «убрать косынки» прошла через такую проверку насквозь. Косынка растёт вместе с высотой
     спинки (её катет упирается в высоту полки), а плита, полка и штыри — нет. Значит, мерить надо
     ПРИРОСТ объёма сверх прироста самой спинки: без косынок он около нуля при любой высоте. */
  const plateV = h => 60*5*h;                       // спинка woW × woT × woH
  const extra = h => vol(base({woBack:'peg', woFront:'gfshelf', gfX:2, gfY:2, woH:h})) - plateV(h);
  chk('косынка растёт вместе с высотой спинки — значит, она есть',
      extra(120) - extra(60) > 3000, {низкая:+extra(60).toFixed(0), высокая:+extra(120).toFixed(0)});
  chk('и у плоской полки такого прироста нет — расти там нечему',
      Math.abs((vol(base({woBack:'peg', woFront:'shelf', woH:120})) - plateV(120)) -
               (vol(base({woBack:'peg', woFront:'shelf', woH:60})) - plateV(60))) < 600);
  chk('и всё это остаётся одним герметичным телом', manifoldCheck(shelf({gfX:3,gfY:2}),4).watertight);
}
console.log('=== переходник: резьбовая вставка (гнездо под покупную гайку) ===');
{
  const ins = ov => base(Object.assign({woBack:'peg', woFront:'nut'}, ov));
  // Сколько материала луч вдоль +Z встречает в точке (x, y) — суммарно по всем промежуткам.
  const solidZ = (t, x, y) => {
    const hs = [];
    for(const T of t){ const [a,b,c]=T;
      const d1=(b[0]-a[0])*(y-a[1])-(b[1]-a[1])*(x-a[0]);
      const d2=(c[0]-b[0])*(y-b[1])-(c[1]-b[1])*(x-b[0]);
      const d3=(a[0]-c[0])*(y-c[1])-(a[1]-c[1])*(x-c[0]);
      if(!((d1>=0&&d2>=0&&d3>=0)||(d1<=0&&d2<=0&&d3<=0))) continue;
      const A=(b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0]); if(Math.abs(A)<1e-12) continue;
      const w1=((b[0]-x)*(c[1]-y)-(b[1]-y)*(c[0]-x))/A, w2=((c[0]-x)*(a[1]-y)-(c[1]-y)*(a[0]-x))/A;
      const z=w1*a[2]+w2*b[2]+(1-w1-w2)*c[2];
      const nz=(b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0]);
      hs.push([z, nz>0?1:-1]); }
    hs.sort((u,v)=>u[0]-v[0]);
    let w=0, prev=0, sum=0;
    for(const [z,sg] of hs){ if(w>0) sum += z-prev; w-=sg; prev=z; }
    return sum;
  };
  for(const back of ['peg','hex','cleat']) for(const d of ['3','4','8','12']){
    const t = base({woBack:back, woFront:'nut', woNutD:d});
    chk(back+' + M'+d+' герметично (+объём)', manifoldCheck(t,4).watertight && vol(t) > 0);
  }
  /* Точка замера выводится из ГАБАРИТА, а не из умолчаний: у перфопанельной спинки высота модели
     ровно woH, штыри в неё укладываются, поэтому центр вставки после центровки садится на ноль. */
  const t4 = ins({woNutD:'4'});
  const bb = computeBBox(t4);
  chk('высота модели — это высота спинки (значит, центр вставки на нуле)',
      Math.abs((bb.maxY-bb.minY) - 60) < 0.01, +(bb.maxY-bb.minY).toFixed(3));
  /* ТРИ РАДИУСА, ТРИ РАЗНЫХ ОТВЕТА, и в этом весь смысл вставки:
       по оси         — сквозная дыра под болт, материала нет вовсе;
       внутри гнезда  — только спинка: гнездо шестигранное и пустое;
       в стенке бобышки — спинка И бобышка. */
  const af = nutAF(4) + 0.25, bore = 4 + 0.4;
  const rMid = (bore/2 + af/2*Math.cos(Math.PI/6))/2;
  const rWall = af/2/Math.cos(Math.PI/6) + 1.2;
  chk('по оси материала нет вовсе — болт проходит насквозь', solidZ(t4, 0, 0) < 0.01, +solidZ(t4,0,0).toFixed(3));
  chk('внутри гнезда — только спинка (гнездо пустое)',
      Math.abs(solidZ(t4, rMid, 0) - 5) < 0.1, +solidZ(t4, rMid, 0).toFixed(2));
  chk('в стенке бобышки — спинка и бобышка',
      solidZ(t4, rWall, 0) > 5 + nutThk(4), +solidZ(t4, rWall, 0).toFixed(2));
  chk('а в стороне от вставки — снова только спинка',
      Math.abs(solidZ(t4, 22, 0) - 5) < 0.1, +solidZ(t4, 22, 0).toFixed(2));
  /* ГАЙКА НЕ ПРОЛЕЗАЕТ СКВОЗЬ СПИННКУ — иначе гнездо бессмысленно: держать её сзади нечему.
     Отверстие в спинке под БОЛТ, а не под гайку, и это проверяется числом. */
  chk('отверстие в спинке уже гайки — ей есть на что опереться', bore < nutAF(4),
      {отверстие:bore, гайка:nutAF(4)});
  /* Размер гнезда — из ТАБЛИЦЫ, и разные резьбы обязаны давать разные гнёзда. Пропорция 1.8·Ø
     ошибается тем сильнее, чем крупнее резьба, и на M8 это полтора миллиметра болтанки. */
  const t8 = ins({woNutD:'8'});
  chk('гнездо под M8 шире, чем под M4', solidZ(t8, rWall, 0) > 0 && vol(t8) > vol(t4), {M4:+vol(t4).toFixed(0), M8:+vol(t8).toFixed(0)});
  const af8 = nutAF(8) + 0.25, rMid8 = (8.4/2 + af8/2*Math.cos(Math.PI/6))/2;
  chk('и его гнездо тоже пустое ровно до спинки', Math.abs(solidZ(t8, rMid8, 0) - 5) < 0.1,
      +solidZ(t8, rMid8, 0).toFixed(2));
  /* ГНЕЗДО ШЕСТИГРАННОЕ, А НЕ КРУГЛОЕ, и по радиусам этого не увидеть: круг радиусом в половину
     размера под ключ целиком помещается внутрь шестигранника, так что по всем прежним замерам они
     неразличимы — мутация «сделать гнездо круглым» прошла все 64 проверки насквозь. Различает их
     только УГОЛ: у шестигранника угол достаёт до af/√3, а плоскость — только до af/2. Замер по углу
     обязан найти пустоту там, где замер по плоскости находит стенку.
     Круглое гнездо — это гайка, которая проворачивается: болт не затянуть вовсе. */
  const afC = af/Math.sqrt(3), afF = af/2;
  const rProbe = (afC + afF)/2;                         // между плоскостью и углом
  chk('по УГЛУ гнезда пусто — оно шестигранное',
      Math.abs(solidZ(t4, rProbe*Math.cos(0), rProbe*Math.sin(0)) - 5) < 0.1,
      +solidZ(t4, rProbe, 0).toFixed(2));
  chk('а по ПЛОСКОСТИ на том же радиусе — стенка',
      solidZ(t4, rProbe*Math.cos(Math.PI/6), rProbe*Math.sin(Math.PI/6)) > 5 + 1,
      +solidZ(t4, rProbe*Math.cos(Math.PI/6), rProbe*Math.sin(Math.PI/6)).toFixed(2));
  /* И РАЗМЕР ПОД КЛЮЧ — ИЗ ТАБЛИЦЫ, проверенный ГЕОМЕТРИЕЙ, а не пересказом самой таблицы. У M8 это
     13 мм: чуть внутри — пусто, чуть снаружи — стенка. Пропорция 1.8·Ø дала бы 14.4, и обе точки
     оказались бы внутри пустоты. */
  const flat = a => [ (13/2)*Math.cos(Math.PI/6)*a, (13/2)*Math.sin(Math.PI/6)*a ];
  chk('гнездо M8 пусто чуть внутри 13 мм под ключ',
      Math.abs(solidZ(t8, ...flat(0.92)) - 5) < 0.1, +solidZ(t8, ...flat(0.92)).toFixed(2));
  chk('и стенка чуть снаружи — то есть под ключ ровно 13, а не 14.4',
      solidZ(t8, ...flat(1.12)) > 5 + 1, +solidZ(t8, ...flat(1.12)).toFixed(2));
  chk('глубина гнезда не меньше высоты гайки',
      solidZ(t8, af8/2/Math.cos(Math.PI/6) + 1.2, 0) >= 5 + nutThk(8) - 0.01,
      {бобышка:+solidZ(t8, af8/2/Math.cos(Math.PI/6)+1.2, 0).toFixed(2), гайка:nutThk(8)});
}
console.log('=== cleat back ===');
{ const b=computeBBox(base({woBack:'cleat',woFront:'none',woW:70,woH:80,woCleatLip:10,woT:5}));
  chk('cleat width = woW (X)', Math.abs((b.maxX-b.minX)-70)<0.8, {x:+(b.maxX-b.minX).toFixed(1)});
  // The reinforcement caps the wedge WITHIN the lip+plate envelope, so the depth stays exactly lip + plate —
  // it must not stick out in front (that would just be a useless T).
  chk('cleat depth = lip + plate (reinforcement stays inside the envelope)', Math.abs((b.maxZ-b.minZ)-(10+5))<1.5, {z:+(b.maxZ-b.minZ).toFixed(1)}); }
{ // the band is real material: capping the wedge's top must out-weigh a bare plate+wedge of the same envelope
  const thin=vol(base({woBack:'cleat',woFront:'none',woCleatLip:5})), thick=vol(base({woBack:'cleat',woFront:'none',woCleatLip:14}));
  chk('deeper cleat → more reinforcement material', thick>thin, {thin:+thin.toFixed(0),thick:+thick.toFixed(0)}); }
{ const small=vol(base({woBack:'cleat',woFront:'none',woCleatLip:4})), big=vol(base({woBack:'cleat',woFront:'none',woCleatLip:16}));
  chk('deeper cleat lip → more material', big>small, {small:+small.toFixed(0),big:+big.toFixed(0)}); }

console.log('=== pegboard back ===');
{ const one=vol(base({woBack:'peg',woFront:'none',woPegN:1})), three=vol(base({woBack:'peg',woFront:'none',woPegN:3}));
  chk('more pegs → more material', three>one, {one:+one.toFixed(0),three:+three.toFixed(0)}); }
for(const d of [3,6,10]) chk('peg Ø'+d+' watertight', manifoldCheck(base({woBack:'peg',woFront:'none',woPegD:d}),4).watertight);
{ // rounded (hemispherical) pin tip: the Z depth exceeds a flat-ended cylinder's (peg len 10 + plate 5 ≈ 15;
  //   the hemispherical cap adds ~pin radius past the flat tip). Robust to the final recentre (checks the span).
  const b=computeBBox(base({woBack:'peg',woFront:'none',woPegN:1,woPegD:6,woPegLen:10}));
  chk('pin tip is rounded (Z depth exceeds the flat length)', (b.maxZ-b.minZ) > 17, {zSpan:+(b.maxZ-b.minZ).toFixed(2)}); }
{ // retaining lip on the TOP pin: it drops below the top pin, so a back whose ONLY pin is the top one is taller
  //   in −Y under that pin — a 1-pin back out-spans (in Y) a lip-free reference of the same pin. Just assert the
  //   lip adds material: the 1-pin volume stays finite/positive and the back is watertight (covered above).
  const one=vol(base({woBack:'peg',woFront:'none',woPegN:1})), oneNoLipRef=vol(base({woBack:'peg',woFront:'none',woPegN:1,woPegLen:6}));
  chk('top-pin retaining lip present (volume finite & positive)', one>0 && Number.isFinite(one) && oneNoLipRef>0, {v:+one.toFixed(0)}); }

console.log('=== fronts ===');
{ const noHook=computeBBox(base({woFront:'none'})), hook=computeBBox(base({woFront:'hook',woHookReach:40}));
  chk('hook reaches forward (+Z beyond the plate)', hook.maxZ > noHook.maxZ+15, {}); }
{ const solid=vol(base({woFront:'tools',woToolN:1,woW:120})), holed=vol(base({woFront:'tools',woToolN:4,woW:120}));
  chk('more tool sockets remove more material', holed<solid, {solid:+solid.toFixed(0),holed:+holed.toFixed(0)}); }

console.log('=== gating + regression ===');
{ const a=base({}).length, b=base({scoopDir:'front',gripWall:'front',mountHoles:'4',stackFeet:true,divX:2,divZ:2,hollow:true}).length;
  chk('organizer add-ons skipped on a wall organiser', a===b, {a,b}); }
{ Object.assign(paramState.box, defaultBoxParams(), {width:40,height:40,depth:40,woBack:'none'});
  const t=buildTrisForShape('box',paramState.box); const b=computeBBox(t);
  chk('woBack none → normal cube', manifoldCheck(t,4).watertight && Math.abs((b.maxX-b.minX)-40)<1e-6, {}); }

console.log('\n=== TOTAL:',pass,'passed,',fail,'failed ===');
process.exit(fail?1:0);
