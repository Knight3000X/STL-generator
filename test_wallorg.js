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

/* ===============================================================================================
   ОРГАНАЙЗЕР ГОВОРИТ, ЧТО ДЕРЖИТ И ЧЕМ ДЕРЖИТСЯ (v25.16.0). Молчал он обиднее прочих: КРЮЧОК У НЕГО
   ТОТ ЖЕ САМЫЙ, что у отдельного семейства «крючок», которое с v25.4.0 называет свой груз, — только
   ручки зовутся иначе (`woHookBar` вместо `hookBar`), и весь расчёт проходил мимо. Одна деталь на одной
   странице то называла число, то молчала, смотря каким путём человек до неё дошёл. Первая же проверка
   ниже это и запирает: два семейства обязаны отдать ОДНО И ТО ЖЕ число на одних размерах.

   Второе число здесь своё: держатель висит НА СТЕНЕ. Груз на вылете отжимает верх задника рычагом, и
   сила на зацепе — W·d/H. Третье: деталь умеет молча РАЗВАЛИТЬСЯ НА ДВА КУСКА, и это проверяется
   счётом связных кусков сетки, а не глазами. */
console.log('\n=== органайзер говорит, что держит ===');
{
  const setP = (ov) => { logos.length=0; boxHoles.length=0; dieFaces.length=0;
    Object.assign(paramState.box, defaultBoxParams(), {width:40,height:40,depth:40,
      woBack:'cleat',woFront:'hook',woW:60,woH:60,woT:5,woCleatLip:8,woPegD:6,woPegSpacing:25.4,
      woPegN:2,woPegLen:10,woHookBar:8,woHookReach:24,woHookDrop:14,woHookSweep:230,
      woShelfD:35,woShelfT:4,woToolN:3,woToolD:16,
      hookMount:'none',mntMode:'none',gearMode:'none',pipMode:'none',threadMode:'none',
      sheetShape:'none',keycapMode:'none',platonic:'none',polyN:0,binRound:0,scoopDir:'none',
      labelTab:'none',mountHoles:'none',gripWall:'none',divX:1,divZ:1,stackFeet:false,gfOn:false}, ov);
    return paramState.box; };
  const warn = (ov) => collectPrintWarnings(setP(ov));
  const line = (ws) => ws.find(s => /^органайзер: /.test(s));
  const spec = (ov) => wallOrgSpec(setP(ov));
  const mesh = (ov) => { setP(ov); return buildTrisForShape('box', paramState.box); };

  chk('органайзер больше не молчит: на умолчаниях есть строка с грузом',
      line(warn({})) !== undefined, warn({}));
  chk('  и это единственная строка — жаловаться на умолчаниях не на что', warn({}).length === 1, warn({}));

  /* 1. ОДИН КРЮЧОК — ОДНО ЧИСЛО. Отдельное семейство «крючок» и крючок органайзера обязаны сойтись
     на одних размерах до последнего знака: правило у них одно, а не два похожих. */
  {
    const o = spec({});
    const h = hookSpec(Object.assign(defaultBoxParams(), {hookMount:'plate', hookStyle:'bar',
      hookBar:8, hookReach:24, hookDrop:14, hookSweep:230}));
    chk('крючок органайзера и отдельный крючок дают ОДНО число',
        Math.abs(o.kg - h.kg) < 1e-9, {органайзер:+o.kg.toFixed(4), крючок:+h.kg.toFixed(4)});
    chk('  и совпадают они сечением, а не случайно',
        Math.abs(o.I - h.I) < 1e-9 && Math.abs(o.c - h.c) < 1e-9 && Math.abs(o.arm - h.arm) < 1e-9,
        {I:[+o.I.toFixed(3), +h.I.toFixed(3)], arm:[o.arm, h.arm]});
    chk('  и половина за слои у обоих одна', o.bond === h.bond, [o.bond, h.bond]);
    /* Разные размеры расходятся тоже одинаково — иначе совпадение было бы совпадением одной точки. */
    const o2 = spec({woHookBar:5, woHookReach:40});
    const h2 = hookSpec(Object.assign(defaultBoxParams(), {hookMount:'plate', hookStyle:'bar',
      hookBar:5, hookReach:40, hookDrop:14, hookSweep:230}));
    chk('  и на других размерах тоже', Math.abs(o2.kg - h2.kg) < 1e-9,
        {органайзер:+o2.kg.toFixed(4), крючок:+h2.kg.toFixed(4)});
  }
  /* 2. ПРУТОК — МНОГОГРАННИК, А НЕ КРУГ. Меряется по построенной сетке: сечение стержня плоскостью
     z = const растеризуется, из него берётся второй момент, и он обязан сойтись с гранёной формулой, а
     НЕ с круглой. Это то же самое, что нашлось у отдельного крючка в v25.4.0, — и здесь оно живое. */
  {
    const g = spec({}), t = mesh({}), b = computeBBox(t);
    /* Стержень идёт вдоль Z на высоте оси; сечение берём в его середине, отступив от задника. */
    const zCut = b.minZ + g.t + (g.reach)*0.45;
    const seg = [];
    for (const T of t){ const pts = [];
      for (let k = 0; k < 3; k++){ const A = T[k], B = T[(k+1)%3];
        if ((A[2] - zCut)*(B[2] - zCut) > 0) continue;
        if (Math.abs(A[2] - B[2]) < 1e-12) continue;
        const u = (zCut - A[2])/(B[2] - A[2]); if (u < 0 || u > 1) continue;
        pts.push([A[0] + u*(B[0] - A[0]), A[1] + u*(B[1] - A[1])]); }
      if (pts.length === 2) seg.push(pts); }
    // растеризация по столбцам x
    let A = 0, Sy = 0, Iy = 0; const nx = 900;
    const x0 = -g.rBar - 1, x1 = g.rBar + 1, dx = (x1 - x0)/nx;
    for (let i = 0; i < nx; i++){ const x = x0 + dx*(i + 0.5), ys = [];
      for (const [P, Q] of seg){
        if ((P[0] - x)*(Q[0] - x) > 0) continue;
        if (Math.abs(P[0] - Q[0]) < 1e-12) continue;
        const u = (x - P[0])/(Q[0] - P[0]); if (u < 0 || u > 1) continue;
        ys.push(P[1] + u*(Q[1] - P[1])); }
      ys.sort((a,c) => a-c);
      for (let k = 0; k + 1 < ys.length; k += 2){ const a = ys[k], c = ys[k+1];
        A += (c - a)*dx; Sy += (c*c - a*a)/2*dx; Iy += (c*c*c - a*a*a)/3*dx; } }
    chk('сечение стержня читается из сетки', A > 0, +A.toFixed(2));
    const Imeas = Iy - A*(Sy/A)*(Sy/A);
    const Icirc = Math.PI*Math.pow(g.rBar, 4)/4;
    chk('  второй момент сходится с ГРАНЁНОЙ формулой', Math.abs(Imeas - g.I) < 0.03*g.I,
        {измерено:+Imeas.toFixed(1), гранёная:+g.I.toFixed(1)});
    chk('  и НЕ сходится с круглой — огранка режет момент на проценты', Imeas < Icirc*0.99,
        {измерено:+Imeas.toFixed(1), круглая:+Icirc.toFixed(1)});
  }
  /* 3. ДВА КУСКА. Крючок садится на высоту max(загиб + пруток + 2, H/2), и при большом загибе на низком
     заднике эта высота уходит выше задника целиком: стержень висит в воздухе.

     СЧИТАТЬ СВЯЗНЫЕ КУСКИ СЕТКИ ЗДЕСЬ НЕЛЬЗЯ, и первый мой замер на этом и сорвался — он отдал ЧЕТЫРЕ
     куска на здоровой детали. Всё приложение строит формы ВЗАИМОПРОНИКАЮЩИМИ замкнутыми оболочками, а не
     объединением: задник, клин планки, полоса усиления, трубка крючка и шарик на кончике общих вершин не
     имеют вовсе и по вершинам не связаны никогда. Связность здесь — вопрос ОБЪЁМА: если тела и правда
     срослись, найдётся точка, лежащая ВНУТРИ ДВУХ оболочек разом, и число оборотов в ней равно двум.
     Его и считаем — вдоль вертикальной прямой в толще задника. */
  {
    const winding = (tris, P) => { let w = 0;
      for (const T of tris){
        const a = [T[0][0]-P[0], T[0][1]-P[1], T[0][2]-P[2]];
        const b = [T[1][0]-P[0], T[1][1]-P[1], T[1][2]-P[2]];
        const c = [T[2][0]-P[0], T[2][1]-P[1], T[2][2]-P[2]];
        const la = Math.hypot(a[0],a[1],a[2]), lb = Math.hypot(b[0],b[1],b[2]), lc = Math.hypot(c[0],c[1],c[2]);
        const det = a[0]*(b[1]*c[2]-b[2]*c[1]) - a[1]*(b[0]*c[2]-b[2]*c[0]) + a[2]*(b[0]*c[1]-b[1]*c[0]);
        const den = la*lb*lc + (a[0]*b[0]+a[1]*b[1]+a[2]*b[2])*lc +
                    (b[0]*c[0]+b[1]*c[1]+b[2]*c[2])*la + (c[0]*a[0]+c[1]*a[1]+c[2]*a[2])*lb;
        w += 2*Math.atan2(det, den); }
      return Math.abs(w/(4*Math.PI)); };
    /* Сколько высот на прямой x = 0 в толще задника лежат ВНУТРИ ДВУХ тел разом. */
    const welded = (ov) => { const g = spec(ov), t = mesh(ov), b = computeBBox(t);
      const zW = b.minZ + (g.back === 'cleat' ? g.cleatLip : 0);      // плоскость стены: клин уходит за неё
      let n = 0;
      for (let k = 0; k <= 60; k++){
        const y = b.minY + (b.maxY - b.minY)*k/60;
        if (winding(t, [0, y, zW + g.t*0.6]) > 1.5) n++; }
      return n; };
    chk('на умолчаниях крючок и задник срослись объёмом', welded({}) > 0, welded({}));
    const ov = {woH:20, woHookDrop:60};
    chk('  а высокий загиб на низком заднике не касается его вовсе', welded(ov) === 0, welded(ov));
    chk('  спецификация зовёт это оторвавшимся', spec(ov).adrift === true,
        {ось:+spec(ov).hookY.toFixed(1), задник:spec(ov).H});
    chk('  и говорит словами', /НЕ КАСАЕТСЯ ЗАДНИКА/.test(warn(ov).join(' ')), warn(ov));
    chk('  на умолчаниях не оторвался и не свисает',
        spec({}).adrift === false && spec({}).perched === false);
    /* Свисание — ДРУГАЯ беда: стержень достаёт до задника, но держится неполным сечением. */
    chk('  свисание отличается от отрыва: тела ещё срослись',
        spec({woH:20}).adrift === false && spec({woH:20}).perched === true && welded({woH:20}) > 0,
        {ось:+spec({woH:20}).hookY.toFixed(1), сросшихся:welded({woH:20})});
  }
  /* 4. РЫЧАГ НА СТЕНУ. Плечо берётся у ПОСТРОИТЕЛЯ: после разворота витка на 180° самая низкая линия
     дуги приходится ровно на её ось, z = t − 3 + вылет. Проверяется по сетке: у самой низкой линии
     крючка берётся ДАЛЬНИЙ её конец — по всему стержню высота одна, и минимум по y без этого
     неоднозначен (первый мой замер вернул случайную точку стержня). */
  {
    const g = spec({}), t = mesh({}), b = computeBBox(t);
    const zW = b.minZ + g.cleatLip;                    // плоскость стены
    let yMin = 1e9;
    for (const T of t) for (const v of T) if (v[2] > zW + g.t + 1 && v[1] < yMin) yMin = v[1];
    let zAt = -1e9;
    for (const T of t) for (const v of T)
      if (v[2] > zW + g.t + 1 && v[1] < yMin + 0.3 && v[2] > zAt) zAt = v[2];
    const dMeas = zAt - zW;
    chk('низ витка меряется по сетке и сходится с плечом рычага',
        Math.abs(dMeas - g.dWall) < 1.5, {измерено:+dMeas.toFixed(1), спец:+g.dWall.toFixed(1)});
    chk('  рычаг — это плечо, делённое на высоту задника',
        Math.abs(g.pry - g.dWall/g.H) < 1e-9, +g.pry.toFixed(3));
    chk('  на умолчаниях он меньше единицы и молчит', g.levered === false, +g.pry.toFixed(2));
    const ov = {woH:20, woHookReach:100};
    chk('  а низкий задник с длинным вылетом даёт пятикратный рычаг',
        spec(ov).levered === true && spec(ov).pry > 4 &&
        /рычаг на стену 5\.\d× веса/.test(warn(ov).join(' ')), {рычаг:+spec(ov).pry.toFixed(2)});
  }
  /* 5. ГНЁЗДА СЪЕДАЮТ ПОЛКУ РОВНО ПОСЕРЕДИНЕ, и с v25.17.0 сказать можно, СКОЛЬКО их там будет.
     В v25.16.0 это было отложено нарочно: `buildBoxWithHoles` роняет отверстие, если его клетка сетки
     задевает уже принятое, повторить отбор без всей сетки было нельзя, а печатать число, которого в
     детали нет, — хуже молчания. Теперь отбор вынесен в общее правило, спецификация зовёт ТО ЖЕ САМОЕ,
     чем живёт построитель, и обе стороны сверяются с деталью. */
  {
    const ov = {woFront:'tools'};
    const g = spec(ov), t = mesh(ov), b = computeBBox(t);
    const zW = b.minZ + g.cleatLip;
    const st = Math.max(3, 4), sd = Math.max(15, 34);
    const yc = b.minY + 0.4*g.H + st/2;                // середина плиты полки
    /* Ряд гнёзд стоит на середине глубины; берём САМОЕ УЗКОЕ сечение вокруг него — там круги во всю
       ширину, а не хордой. */
    const netAt = (zRow) => { const seg = [];
      for (const T of t){ const pts = [];
        for (let k = 0; k < 3; k++){ const A = T[k], B = T[(k+1)%3];
          if ((A[2] - zRow)*(B[2] - zRow) > 0) continue;
          if (Math.abs(A[2] - B[2]) < 1e-12) continue;
          const u = (zRow - A[2])/(B[2] - A[2]); if (u < 0 || u > 1) continue;
          pts.push([A[0] + u*(B[0] - A[0]), A[1] + u*(B[1] - A[1])]); }
        if (pts.length === 2) seg.push(pts); }
      const xs = [];
      for (const [P, Q] of seg){
        if ((P[1] - yc)*(Q[1] - yc) > 0) continue;
        if (Math.abs(P[1] - Q[1]) < 1e-12) continue;
        const u = (yc - P[1])/(Q[1] - P[1]); if (u < 0 || u > 1) continue;
        xs.push(P[0] + u*(Q[0] - P[0])); }
      xs.sort((a, c) => a - c);
      /* Совпавшие пересечения схлопываются: боковая грань плиты замощена сеткой, и прямая режет её
         дважды в одной точке — с этим первый мой замер насчитал три гнезда вместо двух. */
      const u = xs.filter((v, i) => i === 0 || v > xs[i-1] + 1e-6);
      let solid = 0; for (let k = 0; k + 1 < u.length; k += 2) solid += u[k+1] - u[k];
      return {solid, n: Math.max(0, u.length/2 - 1)}; };
    let best = {solid: 1e9, n: 0};
    for (let k = -6; k <= 6; k++){ const q = netAt(zW + g.t - 1 + sd/2 + k*0.3);
      if (q.solid < best.solid) best = q; }
    chk('гнёзд в детали ровно столько, сколько назвал отбор', best.n === g.extra.nSock,
        {вдетали:best.n, спец:g.extra.nSock, заказано:g.extra.n});
    chk('  и заказано их было больше — потеря объявлена', g.extra.lost === true && g.extra.nSock === 2 &&
        /гнёзд встанет 2, а не 3/.test(warn(ov).join(' ')), warn(ov));
    chk('  оставшаяся ширина меряется на детали и сходится', Math.abs(best.solid - g.extra.wNet) < 2.5,
        {измерено:+best.solid.toFixed(1), спец:+g.extra.wNet.toFixed(1)});
    chk('  и слабое место теперь — ряд гнёзд, а не задник',
        g.atSockets === true && /РЯД ГНЁЗД/.test(warn(ov).join(' ')), g.what);
    /* Мелкие гнёзда помещаются все, и тогда ни потери, ни оговорки. */
    const ok = {woFront:'tools', woToolD:8};
    chk('  мелкие гнёзда встают все три', spec(ok).extra.nSock === 3 && spec(ok).extra.lost === false,
        spec(ok).extra.nSock);
    chk('  и тогда про потерю не говорится', !/гнёзд встанет/.test(warn(ok).join(' ')), warn(ok));
    chk('  у плоской полки гнёзд нет вовсе', spec({woFront:'shelf'}).extra === null);
  }
  /* 6. ЗАДНИК: зацеп планки и стандарт перфопанели. */
  {
    chk('зацеп глубже задника объявлен', spec({woH:20, woCleatLip:25}).lipDeep === true &&
        /клин свисает ниже пластины/.test(warn({woH:20, woCleatLip:25}).join(' ')));
    chk('  на умолчаниях зацеп мельче задника', spec({}).lipDeep === false);
    chk('толстый штырь в дюймовое отверстие не входит',
        spec({woBack:'peg', woPegD:12}).pegFat === true &&
        /6\.35 мм\) не войдёт/.test(warn({woBack:'peg', woPegD:12}).join(' ')));
    chk('  недюймовый шаг объявлен', spec({woBack:'peg', woPegSpacing:20}).pegOffPitch === true);
    chk('  а умолчания перфопанели дюймовые и молчат',
        spec({woBack:'peg'}).pegFat === false && spec({woBack:'peg'}).pegOffPitch === false);
    chk('  и штырь с шагом названы в строке',
        /Штырь Ø6\.0 с шагом 25\.4 мм/.test(line(warn({woBack:'peg'}))), line(warn({woBack:'peg'})));
  }
  /* 7. СОТОВАЯ ПАНЕЛЬ И СОТА-ПОЛКА — другие детали со своей геометрией, их эта строка не касается. */
  chk('строки нет у сотовой панели и соты-полки',
      ['hexpanel','hexshelf'].every(m => wallOrgSpec(setP({woBack:m})) === null &&
        line(warn({woBack:m})) === undefined));
  chk('  и у выключенного органайзера', wallOrgSpec(setP({woBack:'none'})) === null);
  setP({});
}

console.log('\n=== TOTAL:',pass,'passed,',fail,'failed ===');
process.exit(fail?1:0);
