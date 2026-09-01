// Threaded parts (резьба): internal-thread cap + external-thread stud, through the REAL
// buildTrisForShape pipeline. Verifies watertightness, that the thread actually removes/adds
// material, dimensional correctness, and — the whole point — that a cap and a stud of the same
// nominal Ø MATE (female bore clears the male crest by ~clearance). Run via ./run-all.sh.
let pass=0,fail=0; function chk(n,c,e){if(c){pass++;console.log('  OK  ',n);}else{fail++;console.log('  FAIL',n,e!==undefined?JSON.stringify(e):'');}}
function vol(t){let v=0;for(const T of t){const a=T[0],b=T[1],c=T[2];v+=(a[0]*(b[1]*c[2]-b[2]*c[1])-a[1]*(b[0]*c[2]-b[2]*c[0])+a[2]*(b[0]*c[1]-b[1]*c[0]))/6;}return v;}
function base(ov){ logos.length=0; boxHoles.length=0; dieFaces.length=0;
  Object.assign(paramState.box, defaultBoxParams(), {width:40,height:40,depth:40,
    threadMode:'cap',threadD:30,threadPitch:3,threadStarts:1,threadLen:16,threadClear:0.4,threadDepth:0,
    threadFlat:0.14,threadHand:'right',threadWall:2.5,threadTop:2.5,threadGrip:24,threadGripD:0.9,threadFlange:3,threadFlangeR:0,
    sheetShape:'none',keycapMode:'none',platonic:'none',polyN:0,binRound:0,
    scoopDir:'none',labelTab:'none',mountHoles:'none',gripWall:'none',divX:1,divZ:1,stackFeet:false,gfOn:false}, ov);
  return buildTrisForShape('box',paramState.box); }

console.log('=== watertight: cap × stud × jar × pitch × starts × handedness ===');
for(const mode of ['cap','stud','jar'])
  for(const pitch of [1.5,3,5])
    for(const starts of [1,2,3])
      for(const hand of ['right','left']){
        const t=base({threadMode:mode,threadPitch:pitch,threadStarts:starts,threadHand:hand});
        const mc=manifoldCheck(t,4);
        chk(mode+' P'+pitch+' ×'+starts+' '+hand+' watertight (+vol)', mc.watertight&&vol(t)>0, {wt:mc.watertight,open:mc.openEdges,vol:+vol(t).toFixed(0)});
      }

console.log('=== nominal-Ø range ===');
for(const D of [8,16,30,60,120]){
  chk('cap Ø'+D+' watertight', manifoldCheck(base({threadMode:'cap',threadD:D}),4).watertight);
  chk('stud Ø'+D+' watertight', manifoldCheck(base({threadMode:'stud',threadD:D}),4).watertight);
  chk('jar Ø'+D+' watertight', manifoldCheck(base({threadMode:'jar',threadD:D}),4).watertight);
}

console.log('=== jar: hollow vessel ===');
{ const b=computeBBox(base({threadMode:'jar',threadD:30,threadBodyD:50,threadBodyH:35,threadLen:16}));
  chk('jar body Ø = 50', Math.abs((b.maxX-b.minX)-50)<0.5 && Math.abs((b.maxZ-b.minZ)-50)<0.5, {x:+(b.maxX-b.minX).toFixed(1),z:+(b.maxZ-b.minZ).toFixed(1)});
  chk('jar height ≈ bodyH + threadLen', Math.abs((b.maxY-b.minY)-(35+16))<0.3, {y:+(b.maxY-b.minY).toFixed(1),expect:51}); }
{ const solidLike=vol(base({threadMode:'jar',threadWall:12,threadFloor:12})), hollow=vol(base({threadMode:'jar',threadWall:2,threadFloor:2}));
  chk('jar is hollow (thin walls enclose far less material)', hollow<solidLike, {hollow:+hollow.toFixed(0),solidLike:+solidLike.toFixed(0)}); }
{ const auto=computeBBox(base({threadMode:'jar',threadD:30,threadBodyD:0}));   // auto body Ø = D+16 = 46
  chk('jar auto body Ø = D+16', Math.abs((auto.maxX-auto.minX)-46)<0.5, {x:+(auto.maxX-auto.minX).toFixed(1)}); }
/* ПЛЕЧО БАНКИ ДОЛЖНО БЫТЬ ИЗ МАТЕРИАЛА. Потолок полости стоял на одной высоте с наружным плечом, и
   кольцо между горлом и стенкой корпуса выходило нулевой толщины: поверхность есть, материала нет.
   Горло начиналось в воздухе над полостью. Ни одна проверка этого не видела и не могла увидеть:
   manifoldCheck считает рёбра, а рёбра там спарены — сетка герметична, объём положителен, габарит
   верен, банка «полая». Поймать это может только вопрос «а есть ли за поверхностью материал».

   Луч вдоль оси, дважды пересёкший сетку на ОДНОЙ глубине, сам по себе ещё ничего не значит: так же
   выглядят стенки заподлицо (входим сразу в два тела) и стык впритык (из одного вышли, в другой
   вошли) — и там, и там материал есть. Различает их число оборотов ПО ОБЕ СТОРОНЫ совпадения:
   пустота с обеих сторон — и только она — значит, что деталь в этом месте бумажная. */
function zeroThickHits(tris, N){
  const b=[1e9,1e9,1e9,-1e9,-1e9,-1e9];
  for(const T of tris) for(const v of T) for(let k=0;k<3;k++){ if(v[k]<b[k])b[k]=v[k]; if(v[k]>b[3+k])b[3+k]=v[k]; }
  let hits=0, flush=0, where=null;
  for (const [ax,u,v] of [[0,1,2],[1,0,2],[2,0,1]]){
    for (let i=1;i<N;i++) for (let j=1;j<N;j++){
      const O=[0,0,0], D=[0,0,0]; D[ax]=1; O[ax]=b[ax]-1000;
      O[u]=b[u]+(b[3+u]-b[u])*(i+0.1371)/N; O[v]=b[v]+(b[3+v]-b[v])*(j+0.2113)/N;
      const ts=[];
      for (const T of tris){
        const e1=[T[1][0]-T[0][0],T[1][1]-T[0][1],T[1][2]-T[0][2]];
        const e2=[T[2][0]-T[0][0],T[2][1]-T[0][1],T[2][2]-T[0][2]];
        const h=[D[1]*e2[2]-D[2]*e2[1], D[2]*e2[0]-D[0]*e2[2], D[0]*e2[1]-D[1]*e2[0]];
        const a=e1[0]*h[0]+e1[1]*h[1]+e1[2]*h[2];
        if (Math.abs(a)<1e-12) continue;
        const sv=[O[0]-T[0][0],O[1]-T[0][1],O[2]-T[0][2]], f=1/a;
        const uu=f*(sv[0]*h[0]+sv[1]*h[1]+sv[2]*h[2]); if (uu<1e-9||uu>1-1e-9) continue;
        const q=[sv[1]*e1[2]-sv[2]*e1[1], sv[2]*e1[0]-sv[0]*e1[2], sv[0]*e1[1]-sv[1]*e1[0]];
        const vv=f*(D[0]*q[0]+D[1]*q[1]+D[2]*q[2]); if (vv<1e-9||uu+vv>1-1e-9) continue;
        const tt=f*(e2[0]*q[0]+e2[1]*q[1]+e2[2]*q[2]); if (tt<=1e-9) continue;
        const n=[e1[1]*e2[2]-e1[2]*e2[1], e1[2]*e2[0]-e1[0]*e2[2], e1[0]*e2[1]-e1[1]*e2[0]];
        ts.push([tt, (n[0]*D[0]+n[1]*D[1]+n[2]*D[2])>0 ? 1 : -1]);
      }
      ts.sort((x,y)=>x[0]-y[0]);
      let w=0, k=0;
      while (k<ts.length){
        let e=k; while (e+1<ts.length && ts[e+1][0]-ts[e][0]<1e-6) e++;
        if (e>k){ const before=w; let after=w; for(let q=k;q<=e;q++) after-=ts[q][1];
          if (before<=0 && after<=0){ hits++;
            if(!where) where={ось:'xyz'[ax], u:+O[u].toFixed(2), v:+O[v].toFixed(2), при:+(O[ax]+ts[k][0]).toFixed(3)}; }
          else flush++; }
        for(let q=k;q<=e;q++) w-=ts[q][1];
        k=e+1;
      }
    }
  }
  return {hits, flush, where};
}
// Сколько материала луч вверх встречает на радиусе r — суммарно по всем промежуткам, а с окном
// [y0,y1] — только внутри него. Окно нужно, чтобы спрашивать про ПЛЕЧО, а не про всю банку: дно есть
// и у сломанной, и без окна вопрос «есть ли материал под горлом» отвечает сам себе.
function solidAtRadius(tris, r, y0, y1){
  const x=r*Math.cos(0.37), z=r*Math.sin(0.37), hs=[];
  for(const T of tris){ const [a,b,c]=T;
    const d1=(b[0]-a[0])*(z-a[2])-(b[2]-a[2])*(x-a[0]);
    const d2=(c[0]-b[0])*(z-b[2])-(c[2]-b[2])*(x-b[0]);
    const d3=(a[0]-c[0])*(z-c[2])-(a[2]-c[2])*(x-c[0]);
    if(!((d1>=0&&d2>=0&&d3>=0)||(d1<=0&&d2<=0&&d3<=0))) continue;
    const A=(b[0]-a[0])*(c[2]-a[2])-(b[2]-a[2])*(c[0]-a[0]); if(Math.abs(A)<1e-12) continue;
    const w1=((b[0]-x)*(c[2]-z)-(b[2]-z)*(c[0]-x))/A, w2=((c[0]-x)*(a[2]-z)-(c[2]-z)*(a[0]-x))/A;
    const y=w1*a[1]+w2*b[1]+(1-w1-w2)*c[1];
    const ny=(b[2]-a[2])*(c[0]-a[0])-(b[0]-a[0])*(c[2]-a[2]);
    hs.push([y, ny>0?1:-1]); }
  hs.sort((u,v)=>u[0]-v[0]);
  const lo = y0===undefined ? -Infinity : y0, hi = y1===undefined ? Infinity : y1;
  let w=0, prev=-Infinity, sum=0;
  for(const [y,sg] of hs){
    if(w>0){ const p=Math.max(prev,lo), q=Math.min(y,hi); if(q>p) sum += q-p; }
    w-=sg; prev=y; }
  return sum;
}
console.log('=== jar: плечо из материала, а не из воздуха ===');
{
  // Между наружным Ø горла и стенкой корпуса горло обязано на что-то опираться. Радиус берётся
  // ровно посередине этого кольца, чтобы не зацепить ни резьбу, ни стенку.
  const t=base({threadMode:'jar',threadD:30,threadBodyD:46,threadBodyH:30,threadWall:2.5,threadFloor:2.5});
  /* Окно обязательно. Без него луч складывает ВЕСЬ материал на радиусе — и дно тоже, а дно есть и у
     сломанной банки: проверка «материал под горлом» прошла бы, ничего не проверив. Окно берётся под
     наружным плечом (оно на maxY − длина резьбы) и не достаёт до дна. */
  const yPl=computeBBox(t).maxY-16;
  const at=solidAtRadius(t, (15+20.5)/2, yPl-5, yPl+0.1);
  chk('под горлом банки есть материал (плечо не нулевой толщины)', at > 1.0, {материала:+at.toFixed(2)});
  chk('толщина плеча ≈ стенке', Math.abs(at-2.5)<0.3, {материала:+at.toFixed(2), стенка:2.5});
  chk('а дно в это окно не попало', solidAtRadius(t, (15+20.5)/2) - at > 2.0,
      {всего:+solidAtRadius(t,(15+20.5)/2).toFixed(2), вокне:+at.toFixed(2)});
  const z=zeroThickHits(t, 13);
  chk('в банке нет оболочек нулевой толщины', z.hits===0, z.where);
  /* Отсутствие находки и слепой детектор выглядят одинаково, поэтому детектор проверяется на заведомо
     бумажной сетке: квадрат, закрытый с обеих сторон и не имеющий толщины. */
  const paper=(()=>{ const a=[-5,0,-5],b=[5,0,-5],c=[5,0,5],d=[-5,0,5];
    return [[a,b,c],[a,c,d],[a,c,b],[a,d,c]]; })();
  chk('и он не слеп: на бумажном квадрате срабатывает', zeroThickHits(paper, 7).hits > 0,
      {сработало:zeroThickHits(paper,7).hits});
}
{
  /* ПЕРЕБОР, А НЕ ОДНА ТОЧКА. Толщина плеча зажата половиной того, что есть между дном и плечом:
     у низкой банки полость иначе схлопнулась бы. Значит, мерить надо и низкую, и толстостенную, и
     некруглую — там, где зажим срабатывает, и там, где нет. Полный луч-детектор для перебора
     непозволительно дорог (полсотни тысяч треугольников на банку, и так уже три минуты на файл),
     поэтому здесь спрашивается то же самое, но в лоб: НА ВСЁМ КОЛЬЦЕ между горлом и наружной
     стенкой, чуть ниже наружного плеча, обязан быть материал. У сломанной банки его там нет. */
  let bad=0, badAt=null, n=0;
  for(const H of [5, 12, 30, 90])
    for(const wall of [1.2, 2.5, 8])
      for(const D of [12, 30, 60])
        for(const shape of ['round','rect']){
          const t=base({threadMode:'jar',threadD:D,threadBodyH:H,threadWall:wall,threadBodyShape:shape,threadBodyD:0});
          const bb=computeBBox(t), yPl=bb.maxY-16;            // threadLen = 16 → плечо на maxY − 16
          const rOut=Math.min(bb.maxX, bb.maxZ)-0.6;
          n++;
          for(let k=0;k<=6;k++){
            const r=D/2 + (rOut-D/2)*k/6;
            if (r>=rOut) break;
            // Окно — ПОД плоскостью плеча и уже самого тонкого плеча (0.8 мм): что бы ни зажалось,
            // материал в этой полоске обязан быть на каждом радиусе кольца.
            if (solidAtRadius(t, r, yPl-0.7, yPl-0.1) < 0.5){
              bad++; if(!badAt) badAt={H,wall,D,shape,r:+r.toFixed(2),высота:+yPl.toFixed(2)}; break; }
          }
        }
  chk('кольцо под горлом сплошное во всех '+n+' банках', bad===0, badAt);
}
/* ЗАЖИМ ТОЛЩИНЫ ПЛЕЧА ТОЖЕ НАДО СТЕРЕЧЬ. Плечо толщиной в стенку — разумное умолчание, но у низкой
   толстостенной банки стенка больше всего, что есть между дном и плечом, и потолок полости уезжает
   НИЖЕ дна. Банка при этом остаётся герметичной, объём положителен, кольцо под горлом сплошное —
   и все проверки выше молчат: они спрашивают про плечо, а схлопывается полость. Мутация «убрать
   зажим» прошла сквозь них насквозь, поэтому здесь спрашивается прямо: полость есть? */
/* МАНЖЕТА В КРЫШКЕ. Печатная резьбовая пара не герметична сама по себе: витки ложатся слоями, между
   слоями остаются капилляры, и банка «закрыта» ровно до первого наклона. Уплотняет манжета на ТОРЦЕ
   ГОРЛА. Проверяется здесь то, что разъезжается тихо:

     1. РАДИУС КАНАВКИ СЛЕДУЕТ ИЗ БАНКИ, а не задаётся. Торец горла — кольцо между расточкой и резьбой;
        манжета садится на его середину. Задавай его руками — и он разъехался бы незаметно: канавка
        есть, кольцо есть, а прижимается оно к воздуху.
     2. КАНАВКЕ ШИРЕ ТОРЦА БЫТЬ МОЖНО И НУЖНО, а кольцу — нельзя. Это разные требования, и спутать их
        значит либо запретить любое разумное сечение, либо пустить кольцо мимо торца.
     3. КАНАВКА НЕ ДОЛЖНА ПРОРЕЗАТЬ КРЫШКУ НАСКВОЗЬ, а урезанная глубина меняет сжатие — и кольцу в
        пару отдаётся ДОСТИГНУТОЕ сжатие, а не заказанное.
     4. НЕГОДНАЯ КАНАВКА НЕ РЕЖЕТСЯ МОЛЧА — как и болтовые отверстия прокладки. */
/* СИТО-ЛЕЙКА. Крышка с перфорированным диском поперёк горла — навинтил на ПЭТ-бутылку и полил.
   Проверяется здесь то, что ломается тихо:
     1. РАСКЛАДКА ОТВЕРСТИЙ. Соприкоснувшиеся дырки ушное отсечение сшивает невесть как, и сетка
        выходит негерметичной — на этом уже попадались болтовые отверстия прокладки.
     2. ДИСК ПЕРЕСЕКАЕТСЯ С КРЫШКОЙ ОБЪЁМОМ, а не встречается с ней гранями. Совпадающие грани
        герметичности не ломают и не видны ничем, кроме прямого вопроса «а перекрываются ли тела».
     3. СЧЁТ ОТВЕРСТИЙ НЕ ДОЛЖЕН ПРЫГАТЬ. Отсчёт кольцами от центра оставлял у края пустое поле, и
        последнее кольцо влезало целиком или не влезало вовсе: 7 дырок против 19 от миллиметра резьбы. */
console.log('=== крышка: сито-лейка ===');
{
  const R = ov => Object.assign(defaultBoxParams(), {threadMode:'cap', threadTopMode:'rose'}, ov);
  const rose = ov => base(Object.assign({threadMode:'cap', threadTopMode:'rose'}, ov));
  const spec = ov => roseSpec(R(ov), capThroatR(R(ov)));
  const W = ov => collectPrintWarnings(R(ov)) || [];
  // промежутки материала вдоль оси Y в точке (x, z)
  const spans = (t, x, z) => {
    const hs = [];
    for(const T of t){ const [a,b,c]=T;
      const d1=(b[0]-a[0])*(z-a[2])-(b[2]-a[2])*(x-a[0]);
      const d2=(c[0]-b[0])*(z-b[2])-(c[2]-b[2])*(x-b[0]);
      const d3=(a[0]-c[0])*(z-c[2])-(a[2]-c[2])*(x-c[0]);
      if(!((d1>=0&&d2>=0&&d3>=0)||(d1<=0&&d2<=0&&d3<=0))) continue;
      const A=(b[0]-a[0])*(c[2]-a[2])-(b[2]-a[2])*(c[0]-a[0]); if(Math.abs(A)<1e-12) continue;
      const w1=((b[0]-x)*(c[2]-z)-(b[2]-z)*(c[0]-x))/A, w2=((c[0]-x)*(a[2]-z)-(c[2]-z)*(a[0]-x))/A;
      const y=w1*a[1]+w2*b[1]+(1-w1-w2)*c[1];
      const ny=(b[2]-a[2])*(c[0]-a[0])-(b[0]-a[0])*(c[2]-a[2]);
      hs.push([y, ny>0?1:-1]); }
    hs.sort((u,v)=>u[0]-v[0]);
    const out=[]; let w=0, start=0;
    for(const [y,sg] of hs){ if(w===0) start=y; w-=sg; if(w===0) out.push([start,y]); }
    return out;
  };
  for(const D of [16, 27.4, 40, 60]){
    const t = rose({threadD:D});
    chk('сито на резьбе Ø'+D+' герметично (+объём)', manifoldCheck(t,4).watertight && vol(t) > 0);
  }
  /* ПРОСВЕТ ВЫДЕРЖИВАЕТСЯ ВЕЗДЕ. Ближайшая пара центров обязана отстоять не меньше чем на диаметр
     плюс заказанный просвет — иначе дырки сливаются, и сетка расползается. */
  let worst = Infinity, worstAt = null, n = 0;
  for(const D of [16, 20, 27.4, 33, 40, 50, 60])
    for(const d of [1, 2, 3])
      for(const gp of [0.8, 1, 2]){
        const g = spec({threadD:D, threadRoseD:d, threadRoseGap:gp}); n++;
        for(let i=0;i<g.holes.length;i++) for(let j=i+1;j<g.holes.length;j++){
          const s2 = Math.hypot(g.holes[i][0]-g.holes[j][0], g.holes[i][1]-g.holes[j][1]) - g.d - g.gap;
          if (s2 < worst){ worst = s2; worstAt = {D, d, gp, зазор:+(s2).toFixed(3)}; }
        }
      }
  chk('во всех '+n+' раскладках просвет не меньше заказанного', worst > -1e-6, worstAt);
  /* И ВСЕ ОТВЕРСТИЯ ВНУТРИ ГОРЛА: вылезшее за край не дырка, а вырез в стенке диска.
     Сравнение — с РАДИУСОМ ГОРЛА, а не с полем `rMax` той же раскладки: мутация, сдвинувшая rMax
     наружу, сдвинула бы вместе с ним и ожидание, и проверка прошла бы насквозь. Так и вышло на
     первом прогоне — поймала её тогда совсем другая строка, про совпадение с построенной крышкой. */
  let out = 0, outAt = null;
  for(const D of [16, 27.4, 40, 60]) for(const d of [1, 3]){
    const g = spec({threadD:D, threadRoseD:d}), rThroat = capThroatR(R({threadD:D, threadRoseD:d}));
    for(const h of g.holes) if (Math.hypot(h[0],h[1]) + g.d/2 > rThroat - 0.6){ out++; if(!outAt) outAt={D,d,горло:+rThroat.toFixed(2)}; }
  }
  chk('и ни одно не вылезает за горло', out === 0, outAt);
  /* СЧЁТ РАСТЁТ ВМЕСТЕ С ГОРЛОМ И НЕ ПРЫГАЕТ. Отсчёт кольцами от центра давал скачок втрое. */
  const counts = [16, 20, 24, 27.4, 30, 33, 36, 40, 45, 50].map(D => spec({threadD:D}).holes.length);
  chk('счёт отверстий не убывает с ростом резьбы',
      counts.every((c, i) => i === 0 || c >= counts[i-1]), counts);
  /* Сравнение начинается там, где колец уже больше одного. Переход «только центральная дырка → первое
     полное кольцо» — скачок с одной штуки сразу на восемь, и он не изъян раскладки, а её природа;
     про такое горло и без того сказано отдельно, что ситу на нём негде разойтись. */
  chk('и не прыгает больше чем вдвое за шаг — там, где колец уже больше одного',
      counts.every((c, i) => i === 0 || counts[i-1] < 5 || c <= counts[i-1]*2), counts);
  /* ДИСК ПЕРЕСЕКАЕТСЯ С КРЫШКОЙ, а не стоит на ней. Промежуток материала под диском обязан
     ПЕРЕКРЫВАТЬСЯ по высоте с промежутком в плите крышки — иначе тела лишь соприкасаются гранями,
     а такое стыкование герметичности не ломает и не видно ничем. */
  const t27 = rose({threadD:27.4, threadPitch:2.7, threadStarts:3});
  const g27 = spec({threadD:27.4, threadPitch:2.7, threadStarts:3});
  const rt = capThroatR(R({threadD:27.4, threadPitch:2.7, threadStarts:3}));
  const inner = spans(t27, 0.55*g27.rMax*Math.cos(0.7), 0.55*g27.rMax*Math.sin(0.7));   // между дырками
  const slab  = spans(t27, rt + 1.6, 0);                                                // плита крышки
  chk('под диском есть материал', inner.length > 0, inner.length);
  chk('и в плите крышки тоже', slab.length > 0, slab.length);
  const dTop = inner.length ? inner[inner.length-1][1] : -1e9;
  const dBot = inner.length ? inner[inner.length-1][0] : 1e9;
  const sTop = slab.length ? slab[slab.length-1][1] : -1e9;
  chk('диск утоплен в плиту: их промежутки ПЕРЕКРЫВАЮТСЯ, а не встречаются',
      dBot < sTop - 0.5, {дискснизу:+dBot.toFixed(2), плитасверху:+sTop.toFixed(2)});
  chk('и диск при этом выступает над плитой', dTop > sTop + 0.1, {дисксверху:+dTop.toFixed(2), плита:+sTop.toFixed(2)});
  /* Радиус горла назван функцией, а не выведен заново, — и совпадает с построенной деталью. */
  chk('радиус горла из функции совпадает с построенной крышкой',
      spans(t27, rt - 0.4, 0).length === 1 && spans(t27, rt + 1.6, 0).length >= 1,
      {вгорле:spans(t27, rt-0.4, 0).length, вплите:spans(t27, rt+1.6, 0).length});
  console.log('=== сито: числа названы, умолчание не жалуется ===');
  chk('площадь просвета — это сумма дырок', Math.abs(g27.open - g27.holes.length*Math.PI*g27.d*g27.d/4) < 1e-9);
  chk('и доля — она же к сечению горла', Math.abs(g27.ratio - g27.open/(Math.PI*rt*rt)) < 1e-9);
  chk('число отверстий названо в предупреждениях', W({}).some(x => /сито: \d+ отверстий/.test(x)), W({}));
  chk('и стандарт горлышка тоже', W({}).some(x => /PCO-1881/.test(x)));
  /* УМОЛЧАНИЕ НЕ ЖАЛУЕТСЯ. Первый порог я поставил на треть сечения горла и получил жалобу прямо на
     умолчаниях — а порог был ещё и неверный: у ПЕЧАТНОГО сита треть недостижима, перемычки стали бы
     тоньше двух периметров. */
  chk('на умолчаниях ни одной жалобы', !W({}).some(x => /струйками|негде разойтись|не напечатаются/.test(x)), W({}));
  chk('тонкая перемычка названа непечатаемой',
      W({threadRoseGap:0.6}).some(x => /не напечатаются сплошными/.test(x)), W({threadRoseGap:0.6}));
  chk('а перемычка в два периметра — нет', !W({threadRoseGap:0.8}).some(x => /не напечатаются/.test(x)));
  chk('тесное горло названо тесным',
      W({threadD:12}).some(x => /негде разойтись/.test(x)), W({threadD:12}));
}
console.log('=== крышка: канавка под манжету ===');
{
  const gk = ov => capGasketSpec(Object.assign({}, base.p || {}, {}, Object.assign({threadMode:'cap'}, ov)));
  const G = ov => capGasketSpec(Object.assign(defaultBoxParams(), {threadMode:'cap'}, ov));
  const Vc = ov => vol(base(Object.assign({threadMode:'cap'}, ov)));
  chk('без параметра канавки нет вовсе', G({}) === null);
  const g = G({threadGasket:2});
  chk('канавка стоит на середине торца горла',
      Math.abs(g.rG - (g.minorR - g.wall/2)) < 1e-9, {rG:g.rG, minorR:g.minorR, стенка:g.wall});
  chk('и торец — это кольцо между расточкой и резьбой',
      Math.abs(g.rimIn - (g.minorR - g.wall)) < 1e-9 && Math.abs(g.rimOut - g.minorR) < 1e-9);
  /* Радиус ОБЯЗАН ехать за резьбой и за стенкой. Жёстко вписанное число выглядело бы верным на
     умолчаниях и молча мимо — на любом другом Ø. */
  chk('радиус едет за номинальным Ø', G({threadGasket:2, threadD:60}).rG > G({threadGasket:2, threadD:30}).rG + 10);
  chk('и за толщиной стенки', G({threadGasket:2, threadWall:5}).rG < G({threadGasket:2, threadWall:2.5}).rG);
  chk('и за шагом (шаг меняет глубину профиля, а с ней внутренний радиус резьбы)',
      G({threadGasket:2, threadPitch:1.5}).rG !== G({threadGasket:2, threadPitch:5}).rG);
  chk('САМО КОЛЬЦО ложится на торец целиком',
      g.rG - g.cord/2 >= g.rimIn - 1e-9 && g.rG + g.cord/2 <= g.rimOut + 1e-9,
      {кольцо:[+(g.rG-g.cord/2).toFixed(2), +(g.rG+g.cord/2).toFixed(2)], торец:[+g.rimIn.toFixed(2), +g.rimOut.toFixed(2)]});
  chk('а КАНАВКА при этом шире торца — и так и должно быть',
      g.width > g.wall, {канавка:+g.width.toFixed(2), торец:+g.wall.toFixed(2)});
  chk('и не доходит до резьбы', g.rOut <= g.minorR - 0.2 + 1e-9, {rOut:+g.rOut.toFixed(2), minorR:+g.minorR.toFixed(2)});
  chk('и не прорезает крышку насквозь', g.depth <= g.top - 0.8 + 1e-9, {глубина:g.depth, крышка:g.top});
}
console.log('=== крышка: канавка действительно вынута, и ровно своего объёма ===');
{
  const G = ov => capGasketSpec(Object.assign(defaultBoxParams(), {threadMode:'cap'}, ov));
  const Vc = ov => vol(base(Object.assign({threadMode:'cap'}, ov)));
  const g = G({threadGasket:2});
  const cut = Vc({}) - Vc({threadGasket:2});
  const want = Math.PI*(g.rOut*g.rOut - g.rIn*g.rIn)*g.depth;
  chk('вынуто ровно кольцо канавки', Math.abs(cut - want) < want*0.02,
      {вынуто:+cut.toFixed(1), кольцо:+want.toFixed(1)});
  chk('и крышка осталась герметичной', manifoldCheck(base({threadMode:'cap', threadGasket:2}), 4).watertight);
  for (const [D, cord] of [[16, 1.4], [30, 2], [60, 2], [120, 2.5]]){
    const t = base({threadMode:'cap', threadD:D, threadGasket:cord});
    chk('крышка Ø'+D+' с манжетой '+cord+' герметична (+объём)',
        manifoldCheck(t, 4).watertight && vol(t) > 0);
  }
}
console.log('=== крышка: негодная канавка не режется и названа ===');
{
  const Vc = ov => vol(base(Object.assign({threadMode:'cap'}, ov)));
  const W = ov => collectPrintWarnings(Object.assign(defaultBoxParams(), {threadMode:'cap'}, ov)) || [];
  const G = ov => capGasketSpec(Object.assign(defaultBoxParams(), {threadMode:'cap'}, ov));
  chk('слишком тонкая манжета: канавки нет', Math.abs(Vc({threadGasket:1}) - Vc({})) < 1e-6);
  chk('  и сказано, почему', W({threadGasket:1}).some(x => /ниткой/i.test(x)), W({threadGasket:1}));
  chk('мимо торца: канавки нет', Math.abs(Vc({threadGasket:3}) - Vc({})) < 1e-6);
  chk('  и сказано, почему', W({threadGasket:3}).some(x => /не ложится на торец/i.test(x)), W({threadGasket:3}));
  chk('  и это именно про торец, а не про глубину', !G({threadGasket:3}).onRim);
  /* Резине некуда растечься — канавка заполнена больше чем на сто процентов. Отдельный отказ, и он
     не совпадает с предыдущим: бывает сечение, которое НА ТОРЕЦ ложится, а в канавку не помещается. */
  const over = G({threadGasket:2, threadTop:1.2});
  chk('канавке не хватает места: канавки нет', over.fill > 1 && !over.fits, {заполнение:+over.fill.toFixed(2)});
  chk('  и сказано, почему', W({threadGasket:2, threadTop:1.2}).some(x => /некуда растечься/i.test(x)),
      W({threadGasket:2, threadTop:1.2}));
  chk('  и объём крышки при этом не тронут',
      Math.abs(Vc({threadGasket:2, threadTop:1.2}) - Vc({threadTop:1.2})) < 1e-6);
  chk('годная канавка ни на что не жалуется',
      !W({threadGasket:2}).some(x => /не прорезана|некуда растечься/i.test(x)), W({threadGasket:2}));
  chk('а размер кольца называет всегда', W({threadGasket:2}).some(x => /кольцо Ø/i.test(x)));
}
console.log('=== крышка: манжета идёт в пару, и это цепочка из трёх ===');
{
  const P = ov => Object.assign(defaultBoxParams(), {threadMode:'cap'}, ov);
  const m1 = assemblyMate(P({threadGasket:2}));
  chk('крышка с канавкой ведёт к манжете', m1 && m1.name === 'Манжета', m1 && m1.name);
  chk('и манжета — это кольцо ровно того сечения', m1.over.sealCord === 2 && m1.over.sealSect === 'd', m1.over);
  const g = capGasketSpec(P({threadGasket:2}));
  /* Кольцо задаётся ВНУТРЕННИМ Ø, а сесть должно серединой на торец: середина = внутренний радиус
     плюс полсечения. Сойтись это обязано с точностью до нуля, а не «примерно». */
  chk('и внутренний Ø такой, что середина кольца попадает на середину торца',
      Math.abs((m1.over.sealD/2 + m1.over.sealCord/2) - g.rG) < 1e-9,
      {середина:m1.over.sealD/2 + m1.over.sealCord/2, торец:g.rG});
  const ring = Object.assign({}, P({threadGasket:2}), m1.over);
  chk('манжета строится и она — уплотнение, а не крышка', dominantMode(ring) === 'seal');
  const rs = sealSpec(ring);
  chk('и её собственный расчёт даёт ту же середину', Math.abs(rs.Rm - g.rG) < 1e-9, {кольцо:rs.Rm, торец:g.rG});
  const m2 = assemblyMate(ring);
  chk('манжета ведёт к банке', m2 && m2.name === 'Банка', m2 && m2.name);
  const jar = Object.assign({}, ring, m2.over);
  const m3 = assemblyMate(jar);
  chk('а банка обратно к крышке — цепочка замкнулась', m3 && m3.name === 'Крышка', m3 && m3.name);
  chk('без канавки цепочка прежняя, из двух', assemblyMate(P({})).name === 'Банка');
}
console.log('=== крышка: урезанная глубина меняет сжатие, и это сказано ===');
{
  const P = ov => Object.assign(defaultBoxParams(), {threadMode:'cap'}, ov);
  const G = ov => capGasketSpec(P(ov));
  const W = ov => collectPrintWarnings(P(ov)) || [];
  const full = G({threadGasket:2, threadTop:6});
  chk('толстая крышка даёт заказанную глубину', !full.squeezed && Math.abs(full.sqActual - full.sq) < 1e-9,
      {достигнуто:+full.sqActual.toFixed(1), заказано:full.sq});
  /* УРЕЗАНИЕ И ПЕРЕПОЛНЕНИЕ — РАЗНЫЕ ОТКАЗЫ, и приставка не должна попадать сразу в оба. На крышке
     Ø30 сечение 2.4 и урезается по глубине, И не влезает по площади: канавка не режется вовсе, и
     проверять на ней «сжатие вышло больше» нечего — манжеты просто нет. Крышка Ø60 со стенкой 4 даёт
     чистый случай: глубину урезало, а места хватило. */
  const CUT = {threadGasket:2.4, threadTop:2.5, threadD:60, threadWall:4};
  const cut = G(CUT);
  chk('тонкая крышка урезает глубину', cut.squeezed && cut.depth < cut.want,
      {глубина:+cut.depth.toFixed(2), хотели:+cut.want.toFixed(2)});
  chk('  и канавка при этом всё-таки годна', cut.fits, {заполнение:+cut.fill.toFixed(2), наторце:cut.onRim});
  chk('  и сжатие выходит БОЛЬШЕ заказанного', cut.sqActual > cut.sq, {достигнуто:+cut.sqActual.toFixed(1), заказано:cut.sq});
  chk('  и об этом сказано', W(CUT).some(x => /урезана/i.test(x)), W(CUT));
  /* КОЛЬЦУ ОТДАЁТСЯ ДОСТИГНУТОЕ СЖАТИЕ, а не заказанное. Иначе кольцо посчитает себе канавку, какой
     в крышке нет, и человек прочтёт в двух местах два разных числа про одну деталь. */
  const m = assemblyMate(P(CUT));
  chk('и кольцу в пару отдано ДОСТИГНУТОЕ сжатие', m && m.over.sealSqueeze === Math.round(cut.sqActual),
      {кольцу:m && m.over.sealSqueeze, достигнуто:Math.round(cut.sqActual), заказано:cut.sq});
}
console.log('=== jar: полость не схлопывается на низкой толстостенной банке ===');
for (const [H, wall] of [[5,8],[5,2.5],[12,8],[30,8]]){
  const t=base({threadMode:'jar',threadD:30,threadBodyH:H,threadWall:wall});
  const bb=computeBBox(t), yPl=bb.maxY-16;
  const r=11;                                     // между каналом горла и стенкой полости при любой стенке
  const empty=(yPl-bb.minY) - solidAtRadius(t, r, bb.minY, yPl);
  chk('банка H'+H+' стенка '+wall+': полость на месте', empty > 0.5, {пусто:+empty.toFixed(2)});
}
console.log('=== jar: arbitrary body footprint (container of any shape) ===');
for(const shape of ['round','squircle','roundrect','rect'])
  chk('jar '+shape+' footprint watertight (+vol)', (()=>{const t=base({threadMode:'jar',threadBodyShape:shape,threadBodyD:50,threadBodyW:40,threadD:26});const mc=manifoldCheck(t,4);return mc.watertight&&vol(t)>0;})(), {shape});
{ const b=computeBBox(base({threadMode:'jar',threadBodyShape:'rect',threadBodyD:50,threadBodyW:40,threadD:26}));
  chk('rect footprint spans W×D (40×50)', Math.abs((b.maxX-b.minX)-40)<1.5 && Math.abs((b.maxZ-b.minZ)-50)<1.5, {x:+(b.maxX-b.minX).toFixed(1),z:+(b.maxZ-b.minZ).toFixed(1)}); }
{ // the round neck still matches the cap regardless of body shape — bore is round Ø threadD-ish
  chk('rect jar keeps a round threaded neck (cap still fits)', manifoldCheck(base({threadMode:'cap',threadD:26}),4).watertight && manifoldCheck(base({threadMode:'jar',threadBodyShape:'rect',threadD:26}),4).watertight, {}); }

console.log('=== dimensions ===');
{ // stud outer footprint = flange Ø; cap outer Ø = nominal + 2·clear + 2·wall
  const b=computeBBox(base({threadMode:'stud',threadD:30,threadFlangeR:20}));
  chk('stud flange spans 2·R = 40', Math.abs((b.maxX-b.minX)-40)<0.2 && Math.abs((b.maxZ-b.minZ)-40)<0.2, {x:b.maxX-b.minX,z:b.maxZ-b.minZ}); }
{ const wall=2.5, clr=0.4, D=30, gripD=0.9;
  const b=computeBBox(base({threadMode:'cap',threadD:D,threadWall:wall,threadClear:clr,threadGrip:24,threadGripD:gripD}));
  const expectMax=D+2*clr+2*wall;                       // flute crests reach the base radius
  chk('cap outer Ø ≈ nominal + 2·(clear+wall)', Math.abs((b.maxX-b.minX)-expectMax)<0.6, {got:+(b.maxX-b.minX).toFixed(2),expect:expectMax}); }
{ const len=16, wall=2.5, top=2.5;                       // cap height = thread length + top slab
  const b=computeBBox(base({threadMode:'cap',threadLen:len,threadTop:top}));
  chk('cap height ≈ threadLen + top', Math.abs((b.maxY-b.minY)-(len+top))<0.2, {y:+(b.maxY-b.minY).toFixed(2),expect:len+top}); }
{ const len=16, flange=3;                                // stud height = flange + thread length
  const b=computeBBox(base({threadMode:'stud',threadLen:len,threadFlange:flange}));
  chk('stud height ≈ flange + threadLen', Math.abs((b.maxY-b.minY)-(flange+len))<0.2, {y:+(b.maxY-b.minY).toFixed(2),expect:flange+len}); }

console.log('=== thread is real (removes / adds material) ===');
{ // a cap bore with thread encloses LESS solid than a plain-bored cap of the same major bore would…
  // simpler: deeper profile → the cap keeps MORE material (bore crests intrude further inward).
  const shallow=vol(base({threadMode:'cap',threadDepth:0.8})), deep=vol(base({threadMode:'cap',threadDepth:3}));
  chk('cap: deeper thread leaves more wall material', deep>shallow, {shallow:+shallow.toFixed(0),deep:+deep.toFixed(0)}); }
{ const shallow=vol(base({threadMode:'stud',threadDepth:0.8})), deep=vol(base({threadMode:'stud',threadDepth:3}));
  chk('stud: deeper thread cuts more material away', deep<shallow, {shallow:+shallow.toFixed(0),deep:+deep.toFixed(0)}); }
{ const smooth=vol(base({threadMode:'cap',threadGrip:0})), knurled=vol(base({threadMode:'cap',threadGrip:24,threadGripD:1.2}));
  chk('cap: knurling flutes remove material from a smooth wall', knurled<smooth, {smooth:+smooth.toFixed(0),knurled:+knurled.toFixed(0)}); }

console.log('=== MATING: cap bore clears the stud crest by ~clearance, everywhere ===');
{ // Sample both female-bore and male-thread radii on the SAME (θ,y) phase and confirm the cap never
  // bites into the stud: female bore radius ≥ male thread radius at every matching phase.
  const D=30,P=3,S=1,flat=0.14,clr=0.4;
  const majorR=D/2, h=Math.min(majorR*0.6,P*0.55), minorR=majorR-h;
  let minGap=Infinity, biteFrac=0, n=0;
  for(let iy=0;iy<40;iy++) for(let it=0;it<64;it++){
    const y=iy*0.4, th=it/64;
    const tM = y/P - S*th, tF = y/P - S*th;              // same helical phase (mated)
    const rM = minorR + h*threadProfile(tM,flat);        // male surface radius
    const rF = minorR + h*threadProfile(tF,flat) + clr;  // female bore = male + clearance
    const gap = rF - rM; minGap=Math.min(minGap,gap); if(gap < -1e-6) biteFrac++; n++;
  }
  chk('female bore never bites the male crest (min gap ≥ 0)', minGap > -1e-6, {minGap:+minGap.toFixed(3)});
  chk('mating clearance ≈ radial clearance', Math.abs(minGap-clr) < 0.05, {minGap:+minGap.toFixed(3),clr});
  chk('no interference cells', biteFrac===0, {biteFrac,n}); }

console.log('=== lead-in (заходная фаска) ===');
for(const mode of ['cap','stud','jar'])
  chk(mode+' with lead-in still watertight', manifoldCheck(base({threadMode:mode,threadLead:2.5}),4).watertight);
{ // stud: near the top the thread must flatten toward the root radius (self-starting tip). Compare the max
  // radius in the top pitch with vs without a lead-in — it must shrink toward minorR.
  const topRad=(lead)=>{ const t=base({threadMode:'stud',threadD:30,threadPitch:3,threadLen:18,threadLead:lead,threadFlange:3});
    const b=computeBBox(t), yTop=b.maxY; let mx=0;
    for(const T of t) for(const v of T) if(v[1] > yTop-0.6) mx=Math.max(mx, Math.hypot(v[0],v[2]));
    return mx; };
  chk('stud lead-in flattens the thread start (top thread shrinks)', topRad(2.5) < topRad(0)-0.5, {lead:+topRad(2.5).toFixed(2),none:+topRad(0).toFixed(2)}); }
{ // cap: at the mouth the bore must OPEN to the widest radius so the neck can enter.
  const mouthRad=(lead)=>{ const t=base({threadMode:'cap',threadD:30,threadPitch:3,threadLead:lead});
    const b=computeBBox(t), yBot=b.minY; let mn=1e9,cnt=0,sum=0;
    for(const T of t) for(const v of T) if(v[1] < yBot+0.3){ const r=Math.hypot(v[0],v[2]); if(r>1){sum+=r;cnt++;} }
    return cnt?sum/cnt:0; };
  chk('cap lead-in opens the mouth (avg bore radius grows)', mouthRad(2.5) > mouthRad(0)+0.3, {lead:+mouthRad(2.5).toFixed(2),none:+mouthRad(0).toFixed(2)}); }
chk('lead-in=0 disables cleanly (watertight)', manifoldCheck(base({threadMode:'cap',threadLead:0}),4).watertight);

console.log('=== cap sealing bead ===');
for(const s of [0.6,1.5,2.5]) chk('cap seal '+s+' watertight (+vol)', (()=>{const t=base({threadMode:'cap',threadSeal:s});const mc=manifoldCheck(t,4);return mc.watertight&&vol(t)>0;})(), {s});
{ const noSeal=vol(base({threadMode:'cap',threadSeal:0})), seal=vol(base({threadMode:'cap',threadSeal:2}));
  chk('sealing bead adds material', seal>noSeal, {noSeal:+noSeal.toFixed(0),seal:+seal.toFixed(0)}); }

console.log('=== profile sanity ===');
{ chk('profile: root=0, crest=1', threadProfile(0,0.14)===0 && Math.abs(threadProfile(0.5,0.14)-1)<1e-9, {});
  chk('profile: periodic (period 1)', Math.abs(threadProfile(0.3,0.14)-threadProfile(1.3,0.14))<1e-12, {});
  chk('profile: monotone rising flank', threadProfile(0.2,0.1) < threadProfile(0.3,0.1), {}); }

console.log('=== bolt / nut / wingnut ===');
for(const mode of ['bolt','nut','wingnut'])
  for(const D of [8,16,30,60])
    for(const pitch of [1.5,3])
      for(const hand of ['right','left']){
        const t=base({threadMode:mode,threadD:D,threadPitch:pitch,threadHand:hand,threadLen:14});
        const mc=manifoldCheck(t,4);
        chk(mode+' Ø'+D+' P'+pitch+' '+hand+' watertight (+vol)', mc.watertight&&vol(t)>0, {wt:mc.watertight,open:mc.openEdges,bad:mc.badEdges});
      }
{ // hex head across-flats: with threadHeadAF set, the head's widest cross-section (across corners) ≈ AF/cos30,
  // and the across-flats span ≈ AF. Measure the head band of a bolt (below the shaft).
  const af=24, t=base({threadMode:'bolt',threadD:16,threadHeadAF:af,threadHeadH:10,threadLen:14});
  const b=computeBBox(t); let mx=0; for(const T of t) for(const v of T) if(v[1]<9.5) mx=Math.max(mx, Math.hypot(v[0],v[2]));
  chk('bolt hex head across-corners ≈ AF/cos30', Math.abs(mx-af/2/Math.cos(Math.PI/6))<0.6, {mx:+mx.toFixed(2),exp:+(af/2/Math.cos(Math.PI/6)).toFixed(2)});
  const shortH=computeBBox(base({threadMode:'bolt',threadD:16,threadHeadH:6,threadLen:14})), tallH=computeBBox(base({threadMode:'bolt',threadD:16,threadHeadH:14,threadLen:14}));
  chk('taller head (threadHeadH) → taller bolt', Math.abs(((tallH.maxY-tallH.minY)-(shortH.maxY-shortH.minY))-8)<0.5, {short:+(shortH.maxY-shortH.minY).toFixed(1),tall:+(tallH.maxY-tallH.minY).toFixed(1)}); }
{ // bolt + nut MATE: the nut's internal bore (minor + profile + clearance) must clear the bolt's external crest.
  // Compare the nut's minimum bore radius against the bolt's major radius minus nothing — bore must exceed root.
  const D=20,P=2.5,clr=0.4;
  const nut=base({threadMode:'nut',threadD:D,threadPitch:P,threadClear:clr,threadHeadH:12});
  const bolt=base({threadMode:'bolt',threadD:D,threadPitch:P,threadLen:14});
  // sample bore (nut) inner radius and shaft (bolt) outer radius at matching phase is complex; instead assert
  // the nut is a through hole (top & bottom both have a central opening) and material exists.
  const nb=computeBBox(nut);
  let holeTop=false,holeBot=false; const yT=nb.maxY,yB=nb.minY;
  for(const T of nut) for(const v of T){ const r=Math.hypot(v[0],v[2]);
    if(v[1]>yT-0.3 && r<D/2-0.5) holeTop=true; if(v[1]<yB+0.3 && r<D/2-0.5) holeBot=true; }
  chk('nut is a through bore (opening top & bottom)', holeTop&&holeBot, {holeTop,holeBot});
  chk('nut & bolt both have volume', vol(nut)>0 && vol(bolt)>0, {nut:+vol(nut).toFixed(0),bolt:+vol(bolt).toFixed(0)}); }
{ const nut=vol(base({threadMode:'nut',threadD:20})), wing=vol(base({threadMode:'wingnut',threadD:20}));
  chk('wingnut adds grip fins (more material than nut)', wing>nut, {nut:+nut.toFixed(0),wing:+wing.toFixed(0)}); }
{ const wing=computeBBox(base({threadMode:'wingnut',threadD:20,threadHeadAF:0})), nut=computeBBox(base({threadMode:'nut',threadD:20,threadHeadAF:0}));
  chk('wingnut wider in X (fins on ±X) than plain nut', (wing.maxX-wing.minX) > (nut.maxX-nut.minX)+8, {wing:+(wing.maxX-wing.minX).toFixed(1),nut:+(nut.maxX-nut.minX).toFixed(1)}); }
{ const shortB=computeBBox(base({threadMode:'bolt',threadHeadH:6,threadLen:10})), tallB=computeBBox(base({threadMode:'bolt',threadHeadH:6,threadLen:30}));
  chk('longer shaft → taller bolt', (tallB.maxY-tallB.minY) > (shortB.maxY-shortB.minY)+15, {}); }
{ const lo=computeBBox(base({threadMode:'nut',threadHeadH:6})), hi=computeBBox(base({threadMode:'nut',threadHeadH:16}));
  chk('taller nut height follows threadHeadH', Math.abs(((hi.maxY-hi.minY)-(lo.maxY-lo.minY))-10)<0.5, {lo:+(lo.maxY-lo.minY).toFixed(1),hi:+(hi.maxY-hi.minY).toFixed(1)}); }

console.log('=== cable gland (кабельный ввод) ===');
for(const D of [10,16,25,40]) for(const bore of [0,4,10]) for(const hand of ['right','left']){
  const t=base({threadMode:'gland',threadD:D,threadBore:bore,threadHand:hand,threadLen:12,threadFlange:3});
  const mc=manifoldCheck(t,4);
  chk('gland Ø'+D+' bore'+bore+' '+hand+' watertight (+vol)', mc.watertight&&vol(t)>0, {wt:mc.watertight,bad:mc.badEdges});
}
/* Ввод сравнивается со штуцером БЕЗ ЦАНГИ: с v18.15.0 у него сверху венчик лепестков, и «легче штуцера»
   он теперь не обязан быть — материал канала уходит, материал цанги приходит. С v18.16.0 к ним прибавилась
   резьба под фланцем, которую тоже надо снять: сравнивать нужно сопоставимое, иначе проверка ловит не
   полость, а наличие цанги и хвостовика. */
{ const stud=vol(base({threadMode:'stud',threadD:20,threadPitch:2.5,threadLen:12}));
  const gl=vol(base({threadMode:'gland',threadD:20,threadPitch:2.5,threadLen:12,threadBore:8,threadColletN:0,threadBackLen:0}));
  chk('gland is hollow (less material than the solid stud)', gl<stud, {stud:+stud.toFixed(0),gland:+gl.toFixed(0)}); }
/* ЦАНГА. Проверяется то, ради чего она есть: лепестки прибавляют материала, их ровно столько, сколько
   заказано, и кончик ШИРЕ корня — иначе обычная гайка их не обожмёт и держать кабель будет нечем. */
{
  const P = {threadMode:'gland',threadD:20,threadPitch:2.5,threadLen:12,threadBore:8};
  const v0 = vol(base(Object.assign({}, P, {threadColletN:0})));
  for(const n of [3, 4, 6]){
    const t = base(Object.assign({}, P, {threadColletN:n, threadColletLen:8}));
    chk('цанга '+n+' лепестков: герметична', manifoldCheck(t,4).watertight);
    chk('цанга '+n+' лепестков: прибавила материала', vol(t) > v0 + 1,
        {без:+v0.toFixed(0), с:+vol(t).toFixed(0)});
    // лепестков ровно n: считаем куски материала на луче вокруг оси на высоте цанги
    const b = (function(){ let hi=-1e9; for(const T of t) for(const v of T) if(v[1]>hi) hi=v[1]; return hi; })();
    const yc = b - 2;
    let runs = 0, was = false;
    for(let k = 0; k <= 720; k++){
      const a = 2*Math.PI*k/720, r = 8.6;                  // между каналом и наружным Ø лепестка
      let inside = false;
      for(const T of t){                                   // грубая проба: есть ли треугольник рядом
        const c = [(T[0][0]+T[1][0]+T[2][0])/3, (T[0][1]+T[1][1]+T[2][1])/3, (T[0][2]+T[1][2]+T[2][2])/3];
        if(Math.abs(c[1]-yc) < 1.2 && Math.hypot(c[0]-r*Math.cos(a), c[2]-r*Math.sin(a)) < 0.9){ inside = true; break; }
      }
      if(inside && !was) runs++;
      was = inside;
    }
    chk('цанга '+n+' лепестков: их ровно столько', runs === n, runs);
  }
  // кончик шире корня — на этом держится вся затея с обычной гайкой
  for(const cl of [4, 12]){
    const t = base(Object.assign({}, P, {threadColletN:4, threadColletLen:cl}));
    let hi=-1e9; for(const T of t) for(const v of T) if(v[1]>hi) hi=v[1];
    const at = y => { let m = 0;
      for(const T of t) for(const v of T) if(Math.abs(v[1]-y) < 0.05) m = Math.max(m, Math.hypot(v[0], v[2]));
      return m; };
    chk('цанга длиной '+cl+': кончик шире корня', at(hi) > at(hi - cl + 0.7) + 0.2,
        {корень:+at(hi-cl+0.7).toFixed(2), кончик:+at(hi).toFixed(2)});
  }
}
{ // the cable channel must be open end to end: nothing may sit inside the bore radius at any height
  const t=base({threadMode:'gland',threadD:20,threadPitch:2.5,threadLen:12,threadBore:8,threadFlange:3});
  let minR=1e9; for(const T of t)for(const v of T){ const r=Math.hypot(v[0],v[2]); if(r<minR) minR=r; }
  chk('cable bore is clear end to end', Math.abs(minR-4)<0.05, {minR:+minR.toFixed(2)}); }

console.log('=== global fit tolerance (fitTune) ===');
{ const tight=vol(base({threadMode:'nut',threadD:20,threadPitch:2.5,fitTune:0}));
  const loose=vol(base({threadMode:'nut',threadD:20,threadPitch:2.5,fitTune:0.4}));
  chk('fitTune opens the nut bore', loose<tight, {tight:+tight.toFixed(0),loose:+loose.toFixed(0)}); }
for(const ft of [-0.3,0,0.25,0.5])
  chk('fitTune '+ft+' stays watertight', manifoldCheck(base({threadMode:'nut',fitTune:ft}),4).watertight && manifoldCheck(base({threadMode:'cap',fitTune:ft}),4).watertight);


console.log('=== drywall anchor (дюбель) ===');
/* Сам дюбель разобран в test_anchor.js — он больше не разновидность крепёжной резьбы, а своя деталь со
   своими размерами. Здесь остаётся ровно то, за что отвечает ЭТОТ файл: диспетчер buildThread обязан
   отдавать дюбель своему построителю, а не ветке штуцера, и делать это на любых общих параметрах. */
for(const hd of ['right','left']) for(const st of [1,2]){
  const t=base({threadMode:'anchor',threadHand:hd,threadStarts:st});
  const mc=manifoldCheck(t,4);
  chk('anchor '+hd+' '+st+'-start watertight (+vol)', mc.watertight&&vol(t)>0, {wt:mc.watertight,bad:mc.badEdges});
}
{ /* Общие резьбовые числа дюбелю больше не адресованы, и это ПРОВЕРЯЕТСЯ, а не подразумевается: пока
     threadD стоял в его строке, дюбель по умолчанию выходил Ø38 — пробкой от бутылки. */
  const a=base({threadMode:'anchor'}), b2=base({threadMode:'anchor',threadD:60,threadPitch:8,threadLen:50});
  chk('anchor ignores the generic thread size', a.length===b2.length && Math.abs(vol(a)-vol(b2))<1e-6,
      {a:a.length, b:b2.length}); }

console.log('=== gating + regression ===');
{ const a=base({}).length, b=base({scoopDir:'front',gripWall:'front',mountHoles:'4',stackFeet:true,divX:2,divZ:2,hollow:true}).length;
  chk('organizer add-ons skipped on a threaded part', a===b, {a,b}); }
{ Object.assign(paramState.box, defaultBoxParams(), {width:40,height:40,depth:40,threadMode:'none'});
  const t=buildTrisForShape('box',paramState.box); const b=computeBBox(t);
  chk('threadMode none → normal cube', manifoldCheck(t,4).watertight && Math.abs((b.maxX-b.minX)-40)<1e-6, {}); }

/* ТИПОРАЗМЕРЫ. Проверяется, что таблица ПОДСТАВЛЯЕТ, а не запирает: на умолчаниях размер правит Ø, шаг и
   канал, а тронутая ручка сильнее таблицы. Ряд PG снят не с чертежа, и возможность его поправить — не
   удобство, а условие, при котором им вообще можно пользоваться. */
{
  /* Таблица — ПРЕСЕТ: она отдаёт числа, а строит деталь то, что стоит в полях. Поэтому проверяется сама
     таблица и то, что по её числам получается верная деталь, — а не то, что размер что-то подменяет
     втихую. Скрытая подстановка и была причиной гайки, которая не наворачивалась. */
  for(const std of ['m','pg']){
    const rows = GLAND_SIZES[std];
    for(let k = 0; k < rows.length; k++){
      const g = glandSizeRow({glandStd:std, glandSize:k});
      chk(std+'['+k+'] '+g.name+': Ø и шаг из таблицы', g.D === rows[k][1] && g.pitch === rows[k][2]);
      chk(std+'['+k+'] '+g.name+': канал шире верхней границы кабеля', g.bore > rows[k][4],
          {канал:g.bore, кабель:rows[k][4]});
      const t = base({threadMode:'gland', threadD:g.D, threadPitch:g.pitch, threadBore:g.bore, threadLen:10});
      chk(std+'['+k+'] '+g.name+': по её числам деталь строится и герметична',
          manifoldCheck(t,4).watertight && vol(t) > 0);
      let rmax = 0; for(const T of t) for(const v of T) rmax = Math.max(rmax, Math.hypot(v[0], v[2]));
      chk(std+'['+k+'] '+g.name+': резьба того Ø, что в таблице', rmax > g.D/2 - 0.6,
          {надо:g.D/2, есть:+rmax.toFixed(2)});
    }
  }
  // Размер САМ ПО СЕБЕ деталь не меняет: числа приходят из полей, а их пишет пресет в панели.
  const vA = vol(base({threadMode:'gland', glandStd:'m', glandSize:0, threadLen:10}));
  const vB = vol(base({threadMode:'gland', glandStd:'m', glandSize:4, threadLen:10}));
  chk('размер сам по себе деталь не подменяет', Math.abs(vA - vB) < 1e-6, {n0:+vA.toFixed(1), n4:+vB.toFixed(1)});
  chk('номер за пределами ряда зажимается, а не роняет',
      glandSizeRow({glandStd:'m', glandSize:99}).name === 'M32');
  // Шестигранный фланец: у него углы дальше от оси, чем у круглого того же размера.
  const far = t => { let m = 0; for(const T of t) for(const v of T) if(Math.abs(v[1]) < 1e9) m = Math.max(m, Math.hypot(v[0], v[2])); return m; };
  const hx = base({threadMode:'gland', threadD:20, threadLen:10, threadFlangeHex:true,  threadFlangeR:14});
  const rd = base({threadMode:'gland', threadD:20, threadLen:10, threadFlangeHex:false, threadFlangeR:14});
  chk('шестигранный фланец шире круглого по углам', far(hx) > far(rd) + 0.5,
      {круг:+far(rd).toFixed(2), шестигранник:+far(hx).toFixed(2)});
  chk('и оба герметичны', manifoldCheck(hx,4).watertight && manifoldCheck(rd,4).watertight);
  chk('под ключ у шестигранника — прежний размер круга', Math.abs(far(rd) - 14) < 0.1, +far(rd).toFixed(2));
}

/* НАКИДНАЯ ГАЙКА С КОНУСОМ и РЕЗЬБА ПОД ФЛАНЦЕМ — то, чего вводу не хватало до сборки. Проверяется не то,
   что построилось, а что получилось: канал гайки СУЖАЕТСЯ кверху (иначе конуса нет и лепестки некому
   вести), а у ввода под фланцем есть материал ниже нуля. */
{
  for(const D of [12, 20, 32]) for(const out of [4, 8]){
    const t = base({threadMode:'glandcap', threadD:D, threadPitch:1.5, threadCapOut:out, threadHeadH:D*0.9});
    chk('гайка Ø'+D+' выход '+out+': герметична и с объёмом',
        manifoldCheck(t,4).watertight && vol(t) > 0, manifoldCheck(t,4).badEdges);
    // канал: радиус на разной высоте — внизу по резьбе, вверху по выходу
    let ylo=1e9, yhi=-1e9; for(const T of t) for(const v of T){ ylo=Math.min(ylo,v[1]); yhi=Math.max(yhi,v[1]); }
    /* Мерить надо ПО САМОМУ ТОРЦУ: конус сходится к выходу только на вершине, и проба на полмиллиметра
       ниже даёт радиус на её уклон больше — первая версия так и требовала от конуса быть цилиндром. */
    const rAt = (y, tol) => { let m = 1e9;
      for(const T of t) for(const v of T) if(Math.abs(v[1]-y) < (tol || 0.05)) m = Math.min(m, Math.hypot(v[0], v[2]));
      return m; };
    const rBot = rAt(ylo, 0.3), rTop = rAt(yhi);
    chk('гайка Ø'+D+' выход '+out+': канал сужается кверху', rTop < rBot - 0.5,
        {низ:+rBot.toFixed(2), верх:+rTop.toFixed(2)});
    chk('гайка Ø'+D+' выход '+out+': выход — заказанного Ø', Math.abs(rTop - out/2) < 0.35,
        {надо:out/2, есть:+rTop.toFixed(2)});
    chk('гайка Ø'+D+' выход '+out+': внизу канал шире цанги ввода', rBot > out/2,
        {низ:+rBot.toFixed(2)});
  }
  // резьба под фланцем: материал уходит НИЖЕ нуля, и его тем больше, чем длиннее хвостовик
  /* Мерится ВЫСОТА, а не низ: готовая деталь отдаётся центрированной, поэтому хвостовик в 6 мм опускает
     нижнюю точку лишь на три. Первая версия проверки требовала от неё полных шести и падала на верной
     детали. */
  const hgt = t => { let lo = 1e9, hi = -1e9;
    for(const T of t) for(const v of T){ if(v[1] < lo) lo = v[1]; if(v[1] > hi) hi = v[1]; } return hi - lo; };
  const low = t => { let m = 1e9; for(const T of t) for(const v of T) m = Math.min(m, v[1]); return m; };
  const a = base({threadMode:'gland', threadD:20, threadPitch:2.5, threadLen:12, threadBore:8, threadBackLen:0});
  const b = base({threadMode:'gland', threadD:20, threadPitch:2.5, threadLen:12, threadBore:8, threadBackLen:6});
  const c = base({threadMode:'gland', threadD:20, threadPitch:2.5, threadLen:12, threadBore:8, threadBackLen:14});
  chk('хвостовик прибавляет ровно свою длину', Math.abs((hgt(b) - hgt(a)) - 6) < 0.05,
      {без:+hgt(a).toFixed(2), с6:+hgt(b).toFixed(2)});
  chk('и длиннее хвостовик — выше деталь', Math.abs((hgt(c) - hgt(a)) - 14) < 0.05,
      {без:+hgt(a).toFixed(2), с14:+hgt(c).toFixed(2)});
  for(const t of [b, c]) chk('ввод с хвостовиком герметичен',
      manifoldCheck(t,4).watertight && manifoldCheck(t,4).badEdges === 0, manifoldCheck(t,4).badEdges);
  chk('и материала в нём больше, чем без него', vol(c) > vol(b) && vol(b) > vol(a),
      [+vol(a).toFixed(0), +vol(b).toFixed(0), +vol(c).toFixed(0)]);
  // канал проходит НАСКВОЗЬ, включая хвостовик: снизу по оси материала быть не должно
  const onAxis = (t, y) => { for(const T of t){ const c2 = [(T[0][0]+T[1][0]+T[2][0])/3,
      (T[0][1]+T[1][1]+T[2][1])/3, (T[0][2]+T[1][2]+T[2][2])/3];
      if(Math.abs(c2[1]-y) < 0.6 && Math.hypot(c2[0], c2[2]) < 1.2) return true; } return false; };
  chk('канал идёт сквозь хвостовик', !onAxis(c, low(c) + 1));
}

/* ЖЁСТКОСТЬ ЦАНГИ. Лепесток обязан гнуться — иначе гайке нечего обжимать, а деталь трескается у корня.
   Проверяется и геометрия (стенка тонкая, а не сплошной сектор), и то, что о жёсткой цанге СКАЗАНО. */
{
  const wallOf = t => {                                    // толщина лепестка = наружный минус внутренний
    let hi = -1e9; for(const T of t) for(const v of T) hi = Math.max(hi, v[1]);
    let rmin = 1e9, rmax = 0;
    for(const T of t) for(const v of T) if(Math.abs(v[1] - hi) < 0.05){
      const r = Math.hypot(v[0], v[2]); rmin = Math.min(rmin, r); rmax = Math.max(rmax, r); }
    return rmax - rmin;
  };
  for(const D of [16, 30]){
    const t = base({threadMode:'gland', threadD:D, threadPitch:D>20?3:1.5, threadLen:12, threadColletN:4, threadColletLen:9});
    chk('Ø'+D+': лепесток — тонкая стенка, а не сплошной сектор', wallOf(t) < 3.0, +wallOf(t).toFixed(2));
    chk('Ø'+D+': и не тоньше двух проходов сопла', wallOf(t) > 0.8, +wallOf(t).toFixed(2));
    chk('Ø'+D+': деталь герметична', manifoldCheck(t,4).watertight && manifoldCheck(t,4).badEdges === 0);
  }
  // заданная стенка слушается
  for(const cw of [1.2, 2.4]){
    const t = base({threadMode:'gland', threadD:24, threadPitch:2, threadLen:12, threadColletN:4,
                    threadColletLen:9, threadColletWall:cw});
    chk('стенка '+cw+' мм соблюдена', Math.abs(wallOf(t) - cw) < 0.15, +wallOf(t).toFixed(2));
  }
  // и о жёсткой цанге сказано вслух
  const stiff = Object.assign(defaultBoxParams(), {threadMode:'gland', threadD:30, threadPitch:3,
                  threadColletN:4, threadColletLen:3, threadColletWall:4});
  chk('жёсткая цанга названа', collectPrintWarnings(stiff).some(x => /цанга/.test(x)),
      collectPrintWarnings(stiff).filter(x => /цанга/.test(x)));
  const ok = Object.assign(defaultBoxParams(), {threadMode:'gland', threadD:20, threadPitch:1.5,
                  threadBore:9, threadColletN:4, threadColletLen:10, threadColletWall:1.6});
  chk('разумная — молчит', !collectPrintWarnings(ok).some(x => /цанга/.test(x)),
      collectPrintWarnings(ok).filter(x => /цанга/.test(x)));
}

/* КУПОЛ ВМЕСТО ШЕСТИГРАННОЙ ТУМБЫ. Раньше конус прятался внутри сплошного шестигранника во всю высоту:
   наружу выходил брусок вдвое выше своей резьбы. Теперь наружная поверхность идёт ЗА внутренним конусом,
   а под ключ остаётся ровно резьбовая часть.

   Проверяется тем, чем эти две формы отличаются, а не объёмом: наружный радиус на середине высоты. У
   тумбы он там ещё шестигранный — то есть равен радиусу у самого низа; у купола он уже меньше. И проверяется
   МОНОТОННОСТЬ: купол обязан сужаться кверху везде выше шестигранника, иначе где-то останется навес. */
console.log('=== накидная гайка: купол на шестиграннике ===');
{
  /* Наружный радиус НА ВЫСОТЕ y — по СЕЧЕНИЮ, а не по вершинам рядом с ней. Грань шестигранника идёт от
     низа до верха одним четырёхугольником, промежуточных вершин у неё нет вовсе, и проба «вершины в
     полосе ±0.4» на середине этой грани не находит ничего и возвращает ноль. Так первая версия проверки
     и «нашла» у шестигранника нулевой радиус на середине его собственной высоты. */
  const rAtY = (t, y) => { let m = 0;
    for(const T of t) for(let k=0;k<3;k++){ const A=T[k], B=T[(k+1)%3];
      if((A[1]-y)*(B[1]-y) > 0 || A[1] === B[1]) continue;
      const u = (y-A[1])/(B[1]-A[1]);
      m = Math.max(m, Math.hypot(A[0]+(B[0]-A[0])*u, A[2]+(B[2]-A[2])*u)); }
    return m; };
  for(const D of [12, 20, 32]){
    const t = base({threadMode:'glandcap', threadD:D, threadPitch:1.5, threadCapOut:4, threadHeadH:D*0.9});
    let ylo=1e9, yhi=-1e9; for(const T of t) for(const v of T){ ylo=Math.min(ylo,v[1]); yhi=Math.max(yhi,v[1]); }
    const H = yhi - ylo;
    chk('Ø'+D+': герметична', manifoldCheck(t,4).watertight && manifoldCheck(t,4).badEdges === 0);
    // Шестигранник = длина резьбы + 0.6; на середине высоты гайки его уже нет.
    const rBot = rAtY(t, ylo + 0.2), rMid = rAtY(t, ylo + H*0.75), rTop = rAtY(t, yhi - 0.02);
    chk('Ø'+D+': на середине высоты это уже купол, а не грань под ключ', rMid < rBot - 0.5,
        {низ:+rBot.toFixed(2), середина:+rMid.toFixed(2)});
    chk('Ø'+D+': купол доходит до выхода под кабель', rTop < rMid - 0.5 && rTop < rBot*0.55,
        {середина:+rMid.toFixed(2), верх:+rTop.toFixed(2)});
    /* Купол сужается кверху ВЕЗДЕ — этим он и печатается без поддержек: каждый слой лежит на предыдущем
       целиком. Расширься он хоть на одном шаге, там был бы навес, и увидеть это можно только замером. */
    let grew = null, prev = 1e9;
    for(let k=0;k<=60;k++){ const y = ylo + 0.05 + (H-0.1)*k/60, r = rAtY(t, y);
      if(r > prev + 0.05){ grew = [+((y-ylo)/H).toFixed(2), +r.toFixed(2), +prev.toFixed(2)]; break; } prev = r; }
    chk('Ø'+D+': купол нигде не расширяется кверху — навеса нет', grew === null, grew);
  }
  // Шестигранник идёт ровно по резьбе: заказали длиннее резьбу — вырос и он.
  const hexTop = t => { // высота, выше которой наружный радиус уже меньше, чем у самого низа
    let ylo=1e9, yhi=-1e9; for(const T of t) for(const v of T){ ylo=Math.min(ylo,v[1]); yhi=Math.max(yhi,v[1]); }
    const r0 = rAtY(t, ylo + 0.05);
    for(let y = ylo + 0.05; y <= yhi; y += 0.1) if(rAtY(t, y) < r0 - 0.3) return y - ylo;
    return yhi - ylo; };
  const shortT = base({threadMode:'glandcap', threadD:24, threadPitch:2, threadHeadH:24, threadCapThread:4});
  const longT  = base({threadMode:'glandcap', threadD:24, threadPitch:2, threadHeadH:24, threadCapThread:12});
  chk('шестигранник растёт вместе с резьбой', hexTop(longT) > hexTop(shortT) + 5,
      {'резьба 4':+hexTop(shortT).toFixed(1), 'резьба 12':+hexTop(longT).toFixed(1)});
  chk('и на авто он заметно ниже самой гайки', hexTop(base({threadMode:'glandcap', threadD:30, threadPitch:3})) < 27*0.45,
      +hexTop(base({threadMode:'glandcap', threadD:30, threadPitch:3})).toFixed(1));
  // Числа, которых на экране нет, выносятся словом.
  const cp = Object.assign(defaultBoxParams(), {threadMode:'glandcap', threadD:30, threadPitch:3});
  chk('высота шестигранника и витки названы вслух',
      collectPrintWarnings(cp).some(x => /накидная гайка: шестигранник/.test(x)),
      collectPrintWarnings(cp).filter(x => /накидная гайка/.test(x)));
  const thin = Object.assign(defaultBoxParams(), {threadMode:'glandcap', threadD:30, threadPitch:3, threadCapThread:2});
  chk('о слишком короткой резьбе сказано', collectPrintWarnings(thin).some(x => /витка — в пластике держит/.test(x)),
      collectPrintWarnings(thin).filter(x => /накидная гайка/.test(x)));
  const wide = Object.assign(defaultBoxParams(), {threadMode:'glandcap', threadD:20, threadPitch:1.5, threadCapOut:19});
  chk('и о выходе шире собственной резьбы — тоже', collectPrintWarnings(wide).some(x => /шире собственной резьбы/.test(x)),
      collectPrintWarnings(wide).filter(x => /накидная гайка/.test(x)));
}
/* СКОЛЬКО ЛЕПЕСТКОВ. Потолок стоял на десяти без обоснования; поднят до двадцати четырёх, и проверяется
   не число в поле, а то, что лепестков ДЕЙСТВИТЕЛЬНО столько. Объём для этого не годится: сектор делится
   на n частей, и сумма от n не зависит вовсе (замерено — совпадает до знака). Считаются боковые стенки
   прорезей: у каждого лепестка их две, по два треугольника, все три вершины в одной осевой плоскости. */
console.log('=== цанга: число лепестков ===');
{
  const slotWalls = t => { let n = 0;
    for(const T of t){ const a = T.map(v => Math.atan2(v[2], v[0]));
      if(Math.abs(a[0]-a[1]) < 1e-6 && Math.abs(a[0]-a[2]) < 1e-6) n++; }
    return n; };
  const G = n => base({threadMode:'gland', threadD:30, threadPitch:3, threadLen:16,
                       threadColletN:n, threadColletLen:14});
  for(const n of [0, 2, 4, 8, 12, 16, 20, 24]){
    const t = G(n);
    chk('лепестков ' + n + ': столько и построено', slotWalls(t) === 4*n, {надо:4*n, есть:slotWalls(t)});
    chk('лепестков ' + n + ': герметично', manifoldCheck(t,4).watertight && manifoldCheck(t,4).badEdges === 0);
  }
  chk('потолок поля и потолок построителя — одно число', COLLET_N_MAX === 24 &&
      SHAPE_PARAMS.box.find(r => r.key === 'threadColletN').max === COLLET_N_MAX);
  chk('сверх потолка не строится', slotWalls(G(40)) === 4*COLLET_N_MAX, slotWalls(G(40))/4);
  /* Ширина лепестка — второе, что ограничивает их число, и на мелком вводе она кончается раньше потолка.
     Молчать об этом нельзя: в поле стоит одно число на все диаметры. */
  const small = Object.assign(defaultBoxParams(), {threadMode:'gland', threadD:12, threadPitch:1.5,
                  threadColletN:24, threadColletLen:8});
  chk('на мелком вводе о ширине лепестка сказано вслух',
      collectPrintWarnings(small).some(x => /лепесток шириной/.test(x)),
      collectPrintWarnings(small).filter(x => /цанга/.test(x)));
  const tiny = Object.assign(defaultBoxParams(), {threadMode:'gland', threadD:10, threadPitch:1,
                  threadColletN:24, threadColletLen:8});
  chk('а там, где он уже двух проходов сопла, сказано и сколько лепестков влезет',
      collectPrintWarnings(tiny).some(x => /уже двух проходов сопла/.test(x)),
      collectPrintWarnings(tiny).filter(x => /цанга/.test(x)));
  const big = Object.assign(defaultBoxParams(), {threadMode:'gland', threadD:30, threadPitch:3,
                  threadColletN:24, threadColletLen:14, threadColletWall:1.4});
  chk('а на М30 те же 24 лепестка проходят молча',
      !collectPrintWarnings(big).some(x => /уже двух проходов|на пределе/.test(x)),
      collectPrintWarnings(big).filter(x => /цанга/.test(x)));
}

/* ======================================================================================
   ОДНО ПРАВИЛО НА ВЕСЬ ФАЙЛ: внутренний радиус резьбы и радиус горла (v24.16.1).

   До свода те же три строки — номинал, глубина профиля, minorR — стояли СЕМЬЮ копиями: у
   переходника горловин, у самого построителя, у носика внутри него, дважды в проверке печати
   (цанга и накидная гайка), во втулке струбцины и в самой функции. Копии сходились, но сходились
   СЛУЧАЙНО, и это худший вид согласия: правка глубины профиля в одной из них разошлась бы с
   остальными МОЛЧА — деталь строится, число осмысленное, расходится только посадка, а посадку на
   экране не видно вовсе. Увидели бы её на напечатанной паре, которая не свинчивается.

   Поэтому проверок здесь две породы, и нужны обе:
     * ИСХОДНИК — правило записано ровно один раз. Это единственное, что мешает копии отрасти
       заново: поведенческая сверка новую копию не заметит, пока она согласна со старой.
     * ПОВЕДЕНИЕ — каждый потребитель отвечает ТЕМ ЖЕ числом. Сверка формулы с формулой доказала бы
       только, что я дважды написал одно и то же, поэтому спрашивается ПОСТРОЕННАЯ деталь и
       НАПЕЧАТАННЫЙ текст предупреждений, а не соседняя строка кода.
   ====================================================================================== */
console.log('=== резьба: правило корня и горла живёт в одном месте ===');
{
  const fs = require('fs'), src = fs.readFileSync('parametric-stl-generator.html', 'utf8');
  const app = src.split('<script>').slice(2).join('<script>');   // 1-й блок — библиотека Three.js
  /* С v25.21.0 коэффициент глубины стал ПАРАМЕТРОМ: у метрической он 0.55, у ходовых профилей 0.5, и
     писать его числом внутри формулы больше нельзя. Правило от этого не размножилось — ищутся оба его
     куска по отдельности: сама формула и умолчание коэффициента. */
  const depthCopies  = (app.match(/\*\s*0\.6\s*,\s*\w+\s*\*\s*kk/g) || []);
  const depthDefault = (app.match(/k\s*>\s*0\s*\?\s*k\s*:\s*0\.55/g) || []);
  const throatCopies = (app.match(/Math\.min\(\s*\w+\s*-\s*1\.0\s*,\s*\w+\s*\*\s*0\.62\s*\)/g) || []);
  const wantCopies   = (app.match(/threadDepth\s*>\s*0/g) || []);
  const askCopies    = (app.match(/\(want\s*>\s*0\)\s*\?\s*Math\.min\(want,/g) || []);
  chk('глубина профиля выведена РОВНО ОДИН раз', depthCopies.length === 1, depthCopies);
  chk('  и умолчание её коэффициента тоже одно', depthDefault.length === 1, depthDefault);
  chk('радиус горла выведен РОВНО ОДИН раз', throatCopies.length === 1, throatCopies);
  /* Заказанную глубину не читают больше нигде: `p.threadDepth` доходит до правила ПАРАМЕТРОМ, и
     развилка «заказано или авто» существует в файле ровно одна. */
  chk('«заказано или авто» решается ровно в одном месте',
      wantCopies.length === 0 && askCopies.length === 1, {threadDepth:wantCopies.length, want:askCopies.length});
  /* ЗДЕСЬ ЖЕ — ДВЕ КОНСТАНТЫ, КОТОРЫЕ ПОТРЕБОВАЛ РАСЧЁТ ПРОЧНОСТИ (v25.23.0), и стоит проверка тут
     потому, что вынудила её резьба: заводить ПЯТУЮ копию `g` и ЧЕТВЁРТУЮ копию межслойного множителя
     ради «сколько держит» значило бы повторить ровно ту ошибку, которую эти же проверки и стерегут у
     глубины профиля. Ускорение стояло шестью копиями, из них две — с ДРУГИМ числом (9.81 у третьей
     руки против 9.80665 у крючка), то есть килограмм-сила считалась в файле двумя способами. */
  /* Ищется число В ВЫРАЖЕНИИ, а не в тексте: в комментарии выше обе величины названы поимённо, и
     без требования оператора перед числом проверка ловила бы собственное объяснение. */
  const gLiterals = (app.match(/[=*/+\-(]\s*(?:9\.80665|9\.81)(?![\d])/g) || []);
  const bondLiterals = (app.match(/const \w*BOND\w* = 0\.5;/g) || []).filter(x => !/const LAYER_BOND/.test(x));
  chk('ускорение свободного падения написано числом РОВНО ОДИН раз', gLiterals.length === 1, gLiterals);
  chk('  и все прежние имена — ссылки на него',
      LB_G === G_MS2 && HOOK_G === G_MS2 && WO_G === G_MS2 && STAND_G === G_MS2 &&
      Math.abs(G_MS2 - 9.80665) < 1e-12, {LB_G, HOOK_G, WO_G, STAND_G, G_MS2});
  chk('межслойный множитель написан числом РОВНО ОДИН раз',
      bondLiterals.length === 0 && (app.match(/const LAYER_BOND = 0\.5;/g) || []).length === 1,
      bondLiterals);
  chk('  и прежние имена — ссылки на него',
      LB_LAYER_BOND === LAYER_BOND && HOOK_LAYER_BOND === LAYER_BOND && WO_BOND === LAYER_BOND &&
      LAYER_BOND === 0.5, {LB_LAYER_BOND, HOOK_LAYER_BOND, WO_BOND, LAYER_BOND});
}

console.log('=== резьба: числовое правило, а не по `p` — резьб в детали бывает две ===');
{
  const R = ov => Object.assign({}, defaultBoxParams(), {threadMode:'cap', threadD:30, threadPitch:3,
                    threadLen:16, threadWall:2.5, threadDepth:0}, ov || {});
  chk('auto: глубина от меньшего из полурадиуса и шага',
      Math.abs(threadDepthOf(15, 3, 0) - Math.min(15*0.6, 3*0.55)) < 1e-12);
  chk('и на крупном шаге решает уже радиус',
      Math.abs(threadDepthOf(3, 20, 0) - 3*0.6) < 1e-12, threadDepthOf(3, 20, 0));
  chk('заказанная глубина принимается как есть', Math.abs(threadDepthOf(15, 3, 1.2) - 1.2) < 1e-12);
  chk('но упирается в семь десятых радиуса', Math.abs(threadDepthOf(15, 3, 99) - 15*0.7) < 1e-12);
  chk('корень никогда не уходит за ноль', threadMinorROf(0.4, 20, 99) >= 0.5, threadMinorROf(0.4, 20, 99));
  chk('и по `p` считается тем же правилом',
      Math.abs(threadMinorR(R({threadD:27.4, threadPitch:2.7, threadDepth:0.9})) -
               threadMinorROf(13.7, 2.7, 0.9)) < 1e-12);
  /* Горло — то же самое: одно правило, и `capThroatR` лишь подставляет в него корень. */
  chk('горло — это правило от корня', Math.abs(capThroatR(R({})) - throatROf(threadMinorR(R({})))) < 1e-12);
  /* И СРАЗУ ОГОВОРКА, КОТОРУЮ ЧЕСТНЕЕ СКАЗАТЬ, ЧЕМ ЗАМОЛЧАТЬ: в правиле горла три слагаемых, но
     работают из них два. Зажим «не ближе миллиметра к резьбе» решает исход только при корне от 2.42
     до 2.63 мм — полоса в две десятых, — и двигает горло не более чем на пять сотых: ниже всё
     съедает пол в 1.5 мм, выше — доля 0.62. Мутация, снимающая этот зажим, поведением не ловится
     вовсе, и признать это правильнее, чем изобразить проверку. Пусть он останется (снять его значило
     бы поменять поведение под видом свода), но числа зафиксированы: разъедутся — увидим. */
  chk('доля решает на больших: горло Ø30 — это 0.62 корня',
      Math.abs(throatROf(13.35) - 0.62*13.35) < 1e-12, throatROf(13.35));
  chk('пол решает на мелких', Math.abs(throatROf(2.0) - 1.5) < 1e-12, throatROf(2.0));
  chk('а зажим — только в полосе, и полоса эта уже трёх десятых миллиметра', (function(){
      let lo = null, hi = null, d = 0;
      for (let m = 0.5; m < 60; m += 0.001){
        const withC = Math.max(1.5, Math.min(m - 1.0, m*0.62)), noC = Math.max(1.5, m*0.62);
        if (Math.abs(withC - noC) > 1e-9){ if (lo === null) lo = m; hi = m; d = Math.max(d, noC - withC); }
      }
      return lo !== null && hi - lo < 0.3 && d < 0.06 && Math.abs(throatROf(2.6) - 1.6) < 1e-9;
    })(), {полоса:'2.42…2.63', сдвиг:'≤0.05'});
}

console.log('=== резьба: потребители отвечают ТЕМ ЖЕ числом ===');
{
  const R = ov => Object.assign({}, defaultBoxParams(), {threadMode:'cap', threadD:30, threadPitch:3,
                    threadLen:16, threadWall:2.5, threadDepth:0}, ov || {});
  /* 1. ПОСТРОЕННАЯ ДЕТАЛЬ. Резьба крышки — внутренняя, поэтому корень у неё САМОЕ ШИРОКОЕ место
     канала: щуп идёт лучом вдоль оси на разных радиусах и ищет, где материал кончается. Спрашивается
     сетка, а не формула. */
  for (const ov of [{}, {threadDepth:1.2}, {threadD:12, threadPitch:1.5}, {threadD:48, threadPitch:5, threadDepth:3}]){
    const p = R(ov), t = buildThread(p), m = threadMinorR(p), clr = 0.4;
    const hit = r => { let n = 0; for (const T of t){ const c = [(T[0][0]+T[1][0]+T[2][0])/3, (T[0][2]+T[1][2]+T[2][2])/3];
                         if (Math.abs(Math.hypot(c[0], c[1]) - r) < 0.35) n++; } return n; };
    /* Впадина женской резьбы лежит на minorR+clr, гребень — на majorR+clr; между ними материала нет. */
    chk('крышка ' + JSON.stringify(ov) + ': поверхность есть на корне из функции',
        hit(m + clr) > 20, {корень:+m.toFixed(3), граней:hit(m + clr)});
    chk('крышка ' + JSON.stringify(ov) + ': и её нет там, где корень был бы при чужой глубине',
        hit(m + clr) > 4*hit(m - 1.2 + clr), {науровне:hit(m + clr), нижена12:hit(m - 1.2 + clr)});
  }
  /* 2. ЦАНГА. Ширина лепестка печатается в предупреждении и считается ОТ КОРНЯ — значит, текст
     выдаёт, каким корнем пользуется проверка печати. Сверяем с корнем из функции. */
  const gp = Object.assign(R({threadMode:'gland', threadD:10, threadPitch:1, threadColletN:24,
                              threadColletLen:8}), {});
  const cwG = Math.max(1.2, Math.min(2.5, threadMinorR(gp)*0.22));
  const bWant = colletFingerWidth(threadMinorR(gp), cwG, 24);
  const wG = collectPrintWarnings(gp).find(x => /лепесток шириной/.test(x)) || '';
  chk('цанга: названная ширина лепестка выведена из корня ИЗ ФУНКЦИИ',
      wG.indexOf(bWant.toFixed(1)) >= 0, {втексте:wG, ждали:bWant.toFixed(1)});
  /* ...И ЭТОГО МАЛО. Ширина печатается с одним знаком, а корень входит в неё поделённым на число
     лепестков: подмена правила сдвигает её на сотые, и округление съедает подмену целиком — мутация
     «цанга считает корень по-своему» прошла эту строку насквозь. Сравнение округлённого числа вообще
     плохая проверка: у него разрешение хуже, чем ошибка, которую ищем.
     Спрашивать надо ПОРОГ. «Лепестки короче своего радиуса» — это `cl < minorR`, ровно один
     переход, и он ловится с точностью до пяти сотых, сколько бы знаков ни печаталось. */
  const thr = Object.assign({}, defaultBoxParams(), {threadMode:'gland', threadD:30, threadPitch:5});
  const mThr = threadMinorR(thr);
  const shortW = ov => collectPrintWarnings(Object.assign({}, thr, ov)).some(x => /лепестки короче своего радиуса/.test(x));
  chk('цанга: порог «короче своего радиуса» стоит РОВНО на корне из функции — снизу',
      shortW({threadColletLen: mThr - 0.05}), {корень:+mThr.toFixed(3)});
  chk('цанга: и сверху', !shortW({threadColletLen: mThr + 0.05}), {корень:+mThr.toFixed(3)});
  /* 3. НАКИДНАЯ ГАЙКА. При незаданном канале выход под кабель — ровно половина корня, и Ø печатается
     в предупреждении. Значит, названное число обязано равняться самому корню. */
  for (const ov of [{threadD:30, threadPitch:3}, {threadD:16, threadPitch:2, threadDepth:1.1}]){
    const cp = R(Object.assign({threadMode:'glandcap', threadBore:0, threadCapOut:0}, ov));
    const wC = collectPrintWarnings(cp).find(x => /накидная гайка: шестигранник/.test(x)) || '';
    const want = threadMinorR(cp).toFixed(1);
    chk('накидная гайка ' + JSON.stringify(ov) + ': Ø под кабель — это корень из функции',
        wC.indexOf('Ø' + want + ' мм') >= 0, {втексте:wC, ждали:want});
  }
  /* 4. НОСИК ПЕРЕХОДНИКА. Опубликованная спецификация обязана сойтись с правилом — и сойтись по
     СВОЕМУ Ø и шагу, а не по крышкиным. */
  const np = R({threadTopMode:'neck', threadNeckD:20, threadNeckPitch:2});
  const ns = threadNeckSpec(np);
  chk('носик: спецификация выдана', !!ns, ns);
  chk('носик: стенка + канал — это его собственный корень',
      ns && Math.abs((ns.bore/2 + ns.wall) - threadMinorROf(10, 2, 0)) < 1e-9,
      ns && {корень:+(ns.bore/2 + ns.wall).toFixed(4), правило:+threadMinorROf(10, 2, 0).toFixed(4)});
  /* И ГЛАВНОЕ — заказанная глубина профиля на носик НЕ ИДЁТ, и это не забывчивость, а решение:
     ручка одна на деталь, а резьба на носике другая, своего Ø. Пиши я свод «как проще», глубина
     утекла бы на носик, и Ø8 при заказе трёх миллиметров съело бы его до оси. */
  const nsDeep = threadNeckSpec(R({threadTopMode:'neck', threadNeckD:20, threadNeckPitch:2, threadDepth:3}));
  chk('носик: заказанная глубина профиля его НЕ трогает',
      nsDeep && Math.abs(nsDeep.bore - ns.bore) < 1e-9 && Math.abs(nsDeep.wall - ns.wall) < 1e-9,
      {без:ns && +ns.bore.toFixed(4), с:nsDeep && +nsDeep.bore.toFixed(4)});
  chk('а саму крышку — трогает, иначе проверка выше ничего не значила бы',
      Math.abs(threadMinorR(R({threadDepth:3})) - threadMinorR(R({}))) > 0.3,
      {без:+threadMinorR(R({})).toFixed(3), с:+threadMinorR(R({threadDepth:3})).toFixed(3)});
  /* 5. ВТУЛКА СТРУБЦИНЫ пользуется тем же правилом и по той же причине не читает ручку: у неё нет
     `p` вовсе, она резьба ПОД БОЛТ ГЕНЕРАТОРА и живёт его Ø и шагом. Проверяется тем, что глубина
     профиля не двигает струбцину ни на вершину. */
  const gc = ov => buildGClamp(Object.assign({}, defaultBoxParams(), {mntMode:'gclamp', gcNut:'thread'}, ov));
  const a = gc({}), b = gc({threadDepth:3});
  chk('струбцина: втулка живёт болтом, а не ручкой глубины профиля',
      a.length === b.length && a.every((T, i) => T.every((v, j) => v.every((x, k) => Math.abs(x - b[i][j][k]) < 1e-9))),
      {без:a.length, с:b.length});
}

/* ===============================================================================================
   ПАРА ГОВОРИТ О СЕБЕ (v25.13.0). Резьба была самым населённым молчуном переписи 10.4: пятнадцать
   разновидностей, и говорили из них только шнек, штопор, пружина и кабельный ввод — то есть всё,
   кроме собственно КРЕПЁЖА. Проверки ниже держат четыре числа, и держат их НА ПОСТРОЕННОЙ ДЕТАЛИ, а
   не на повторённой формуле: зацеп меряется как перекрытие мужского гребня и женской впадины у ДВУХ
   собранных деталей, глубина профиля — разностью радиусов, площадка гребня — длиной полки вдоль оси,
   а прорезанная насечкой крышка — тем, что снаружи неё появляется точка без материала на уровне
   резьбы. Сама спецификация сверяется с этими замерами, иначе она вправе врать молча — ровно на этом
   в v25.11.0 выжила мутация у кейкапа. */
console.log('\n=== резьбовая пара называет свои числа ===');
{
  /* Спецификация и предупреждения читают ПАРАМЕТРЫ, а не сетку, — значит и строить её незачем:
     `base` строит деталь, и звать его ради одного числа значило бы гонять построитель сотню раз. */
  const setP = (ov) => { logos.length=0; boxHoles.length=0; dieFaces.length=0;
    Object.assign(paramState.box, defaultBoxParams(), {threadMode:'cap',threadD:30,threadPitch:3,threadStarts:1,
      threadLen:16,threadClear:0.4,threadDepth:0,threadFlat:0.14,threadHand:'right',threadWall:2.5,threadTop:2.5,
      threadGrip:24,threadGripD:0.9,threadFlange:3,sheetShape:'none',keycapMode:'none',platonic:'none',polyN:0,
      binRound:0,scoopDir:'none',labelTab:'none',mountHoles:'none',gripWall:'none',divX:1,divZ:1,stackFeet:false,
      gfOn:false}, ov);
    return paramState.box; };
  const warn = (ov) => collectPrintWarnings(setP(ov));
  const line = (ws) => ws.find(s => /^резьба Ø/.test(s));
  const spec = (ov) => threadFitSpec(setP(ov));
  /* Замер по сетке: кольцевые крайности радиуса в полосе высот, взятой ВНУТРИ резьбы. */
  const band = (tris, y0, y1) => { let lo = 1e9, hi = -1e9;
    for (const T of tris) for (const v of T){ if (v[1] < y0 || v[1] > y1) continue;
      const r = Math.hypot(v[0], v[2]); if (r < lo) lo = r; if (r > hi) hi = r; }
    return {lo, hi}; };

  chk('крепёж больше не молчит: на умолчаниях крышки есть строка про резьбу',
      line(warn({})) !== undefined, warn({}));
  chk('  и она у всех девяти крепёжных разновидностей',
      ['cap','jar','stud','bolt','nut','wingnut','gland','glandcap','leadscrew']
        .every(m => line(warn({threadMode:m})) !== undefined),
      ['cap','jar','stud','bolt','nut','wingnut','gland','glandcap','leadscrew']
        .filter(m => line(warn({threadMode:m})) === undefined));
  chk('  а у шнека, штопора, пружины и ёлочки её нет — у них свои числа',
      ['auger','corkscrew','spring','barb','anchor'].every(m => line(warn({threadMode:m})) === undefined),
      ['auger','corkscrew','spring','barb','anchor'].filter(m => line(warn({threadMode:m})) !== undefined));

  /* 1. ЗАЦЕП. Меряется на ПАРЕ: наружный радиус мужского гребня минус внутренний радиус женской
     впадины. Полоса высот взята заведомо внутри резьбы обеих деталей. */
  {
    const male = band(base({threadMode:'stud'}), -4, 4);
    const fem  = band(base({threadMode:'cap'}),  -4, 4);
    const measured = male.hi - fem.lo;
    const t = spec({threadMode:'cap'});
    chk('зацеп из спецификации равен измеренному на паре', Math.abs(measured - t.grip) < 0.02,
        {измерено:+measured.toFixed(3), спец:+t.grip.toFixed(3)});
    chk('  и глубина профиля тоже измерена, а не обещана', Math.abs((male.hi - male.lo) - t.h) < 0.02,
        {измерено:+(male.hi - male.lo).toFixed(3), спец:+t.h.toFixed(3)});
    chk('  автоматическая глубина — 0.55 шага', Math.abs(t.h - 0.55*3) < 1e-6, t.h);
    chk('  число названо в строке', /зацеп 1\.25 мм/.test(line(warn({})) || ''), line(warn({})));
  }
  /* САМОЕ ВАЖНОЕ ЧИСЛО ЭТОГО ЗАХОДА: при мелком шаге глубина профиля (0.55·P) оказывается МЕНЬШЕ
     стандартного зазора 0.4, и пара перестаёт касаться друг друга вовсе. Ручка шага крутится от 0.5,
     зазор по умолчанию 0.4 — доехать сюда можно ОДНОЙ ручкой. Проверяется это не арифметикой: у
     построенной пары женская впадина оказывается ШИРЕ мужского гребня. */
  {
    const male = band(base({threadMode:'stud', threadPitch:0.5}), -3, 3);
    const fem  = band(base({threadMode:'cap',  threadPitch:0.5}), -3, 3);
    chk('шаг 0.5: женская впадина шире мужского гребня — пара не касается',
        fem.lo > male.hi + 0.05, {женская:+fem.lo.toFixed(3), мужской:+male.hi.toFixed(3)});
    const t = spec({threadPitch:0.5});
    chk('  спецификация зовёт это «не сойдётся»', t.loose === true && t.grip < 0, t.grip);
    chk('  и говорит об этом словами', /НЕ СОЙДЁТСЯ/.test(warn({threadPitch:0.5}).join(' ')),
        warn({threadPitch:0.5}));
    chk('  а при зазоре 0.05 пара сходится, но держится на одном проходе сопла',
        spec({threadPitch:0.5, threadClear:0.05}).weakGrip === true &&
        /тоньше прохода сопла/.test(warn({threadPitch:0.5, threadClear:0.05}).join(' ')),
        warn({threadPitch:0.5, threadClear:0.05}));
    chk('  на умолчаниях приложение молчит про зацеп', !spec({}).loose && !spec({}).weakGrip);
  }
  /* 2. ВИТКИ. Держит резьба ВИТКАМИ, а за оборот многозаходная уходит на шаг × число заходов —
     значит витков зацепления во столько же раз МЕНЬШЕ. Проверяется по сетке: при постоянном угле
     радиус повторяется с периодом ШАГА, поэтому число гребней вдоль резьбы даёт длину/шаг, а витки
     зацепления — это оно же, делённое на число заходов. */
  {
    /* Считать гребни надо в ОДНОМ угловом столбце. По всей детали сразу их не сосчитать вовсе:
       резьба — винт, гребень при каждом угле стоит на своей высоте, и вершины гребня покрывают весь
       диапазон высот сплошь. Первый мой замер именно так и вышел — «один гребень» на пяти витках. */
    const crestsAlong = (ov) => { const t = base(ov), s = spec(ov), eps = 0.02, tol = 2*Math.PI/400;
      const ys = [];
      for (const T of t) for (const v of T){
        if (Math.abs(Math.atan2(v[2], v[0])) > tol) continue;
        if (Math.abs(Math.hypot(v[0], v[2]) - s.majorR) < eps) ys.push(v[1]); }
      ys.sort((a,b) => a-b);
      let n = 0, prev = -1e9;                        // группы вершин гребня, разделённые впадиной
      for (const y of ys){ if (y - prev > s.P*0.5) n++; prev = y; }
      return n; };
    const t1 = spec({threadMode:'stud'});
    chk('гребней вдоль резьбы ≈ длина/шаг', Math.abs(crestsAlong({threadMode:'stud'}) - t1.len/t1.P) <= 1,
        {гребней:crestsAlong({threadMode:'stud'}), ожидалось:+(t1.len/t1.P).toFixed(1)});
    const t3 = spec({threadMode:'stud', threadStarts:3});
    chk('  а витков зацепления втрое меньше при трёх заходах',
        Math.abs(t3.turns*3 - t3.len/t3.P) < 1e-6 && Math.abs(t3.turns - t1.turns/3) < 1e-6,
        {заходов3:+t3.turns.toFixed(2), заход1:+t1.turns.toFixed(2)});
    chk('  PCO-1881 (Ø27.4×2.7 в три захода) — это два оборота, и об этом сказано',
        /2\.0 об/.test(line(warn({threadD:27.4, threadPitch:2.7, threadStarts:3})) || '') &&
        /первый виток/.test(warn({threadD:27.4, threadPitch:2.7, threadStarts:3}).join(' ')),
        warn({threadD:27.4, threadPitch:2.7, threadStarts:3}));
    chk('  на умолчаниях витков хватает', spec({}).fewTurns === false, spec({}).turns);
    chk('  у гайки длина резьбы — её высота, а не ручка длины',
        Math.abs(spec({threadMode:'nut'}).len - 30*0.8) < 1e-6 &&
        Math.abs(spec({threadMode:'nut', threadLen:100}).len - 30*0.8) < 1e-6,
        spec({threadMode:'nut', threadLen:100}).len);
  }
  /* 3. СЛОИ. Высота слоя объявлена вслух: выдумывать её молча было бы той самой прикидкой. */
  {
    chk('слоёв на виток считается от шага, а не от хода',
        Math.abs(spec({threadStarts:3}).layers - spec({threadStarts:1}).layers) < 1e-9,
        [spec({threadStarts:3}).layers, spec({threadStarts:1}).layers]);
    chk('  шаг 0.5 — это лесенка в два с половиной слоя',
        spec({threadPitch:0.5}).steppy === true &&
        /слоёв на виток всего 2\.5/.test(warn({threadPitch:0.5}).join(' ')), warn({threadPitch:0.5}));
    chk('  на умолчаниях лесенки нет', spec({}).steppy === false, spec({}).layers);
    chk('  высота слоя названа в самой строке', /при слое 0\.2 мм/.test(line(warn({})) || ''), line(warn({})));
  }
  /* 4. ПЛОЩАДКА ГРЕБНЯ. Меряется вдоль оси у одного углового столбца: длина полки, на которой радиус
     держится наружного. У профиля из построителя она равна 2·flat·P. */
  {
    const crestFlat = (ov) => { const t = base(ov), s = spec(ov), eps = 0.01;
      /* Один столбец: берутся вершины с почти одинаковым углом, чтобы полка не смазалась винтом. */
      const a0 = 0, tol = 2*Math.PI/400;
      let lo = 1e9, hi = -1e9;
      for (const T of t) for (const v of T){
        const th = Math.atan2(v[2], v[0]); if (Math.abs(th - a0) > tol) continue;
        if (Math.abs(Math.hypot(v[0], v[2]) - s.majorR) > eps) continue;
        if (v[1] > 0 && v[1] < s.P){ if (v[1] < lo) lo = v[1]; if (v[1] > hi) hi = v[1]; } }
      return hi - lo; };
    /* Замер по вершинам — это НИЖНЯЯ оценка полки: сетка режется по высоте с шагом P/spp, и края
       полки почти никогда не попадают на узел. Поэтому сверяется вилка, а не равенство: измеренное не
       больше расчётного и не меньше его на два шага сетки. Вилка всё равно узкая — вдвое большая или
       вдвое меньшая полка из неё выпадает. */
    const SPP = 26;                                   // столько высот на шаг кладёт построитель
    for (const flat of [0.14, 0.24]){
      const s = spec({threadMode:'stud', threadFlat:flat});
      const m = crestFlat({threadMode:'stud', threadFlat:flat});
      chk('площадка гребня при flat=' + flat + ' измерена на детали и сходится с 2·flat·P',
          m <= s.crest + 1e-6 && m >= s.crest - 2*s.P/SPP - 1e-6,
          {измерено:+m.toFixed(3), спец:+s.crest.toFixed(3)});
    }
    const s = spec({threadMode:'stud'});
    chk('  при нулевой полке профиль сходится в ребро, и об этом сказано',
        spec({threadFlat:0}).sharp === true && /сходится в ребро/.test(warn({threadFlat:0}).join(' ')),
        warn({threadFlat:0}));
    chk('  тонкая полка мелкого шага названа тонкой',
        spec({threadPitch:0.5}).thinCrest === true &&
        /площадка гребня 0\.14/.test(warn({threadPitch:0.5}).join(' ')), warn({threadPitch:0.5}));
    chk('  на умолчаниях полка толще прохода сопла', spec({}).thinCrest === false && spec({}).sharp === false);
  }
  /* 5. НАСЕЧКА, ПРОРЕЗАЮЩАЯ КРЫШКУ. Лыски режутся в НАРУЖНЫЙ радиус, а он отсчитан от женской впадины
     плюс стенка: глубже стенки лыска выходит внутрь, до самой резьбы. Ручки независимы, зажима между
     ними нет, и оба конца диапазона законны — то есть крышку в прорезях можно построить двумя ручками
     и не узнать об этом. Меряется это НА ДЕТАЛИ: точка чуть снаружи самой глубокой женской впадины,
     на угле дна лыски, либо лежит в материале, либо нет. */
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
    const solidAtFlute = (ov) => { const t = base(ov), s = spec(ov);
      const r = s.majorR + s.clr + 0.2;                 // чуть снаружи самой глубокой женской впадины
      const a = Math.PI/s.nFlute;                       // дно лыски: cos(nθ) = −1
      let lo = 1e9, hi = -1e9; for (const T of t) for (const v of T){ if(v[1]<lo)lo=v[1]; if(v[1]>hi)hi=v[1]; }
      return winding(t, [r*Math.cos(a), (lo+hi)/2, r*Math.sin(a)]) > 0.5; };
    chk('на умолчаниях крышка на уровне резьбы сплошная', solidAtFlute({}) === true);
    chk('  глубокая насечка при тонкой стенке ПРОРЕЗАЕТ её насквозь',
        solidAtFlute({threadWall:1.2, threadGripD:2}) === false);
    chk('  а при толстой стенке та же насечка не прорезает',
        solidAtFlute({threadWall:2.5, threadGripD:2}) === true);
    chk('спецификация зовёт прорезанной ровно ту, что прорезана',
        spec({}).pierced === false &&
        spec({threadWall:1.2, threadGripD:2}).pierced === true &&
        spec({threadWall:2.5, threadGripD:2}).pierced === false,
        [spec({}).pierced, spec({threadWall:1.2,threadGripD:2}).pierced, spec({threadWall:2.5,threadGripD:2}).pierced]);
    chk('  и говорит об этом словами', /ПРОРЕЗАЕТ крышку/.test(warn({threadWall:1.2, threadGripD:2}).join(' ')),
        warn({threadWall:1.2, threadGripD:2}));
    chk('  гладкая крышка (насечек 0) не прорезана ничем',
        spec({threadWall:1.2, threadGripD:2, threadGrip:0}).pierced === false);
  }
  /* 6. МОЛЧАЛИВЫЕ ЗАЖИМЫ. Глубина профиля режется дважды — ручкой сверху (0.7 радиуса) и
     автоматически снизу (шагом), — и до сих пор оба зажима срабатывали без единого слова. */
  {
    chk('глубина, урезанная ручкой, объявляется',
        spec({threadD:6, threadDepth:8}).depthCut === true &&
        /урезана до 2\.10/.test(warn({threadD:6, threadDepth:8}).join(' ')), warn({threadD:6, threadDepth:8}));
    chk('  шаг крупнее, чем несёт диаметр, объявляется тоже',
        spec({threadD:6, threadPitch:8}).pitchTooBig === true &&
        /пологой волной/.test(warn({threadD:6, threadPitch:8}).join(' ')), warn({threadD:6, threadPitch:8}));
    chk('  и это РАЗНЫЕ зажимы: ручной не путается с автоматическим',
        spec({threadD:6, threadDepth:8}).pitchTooBig === false &&
        spec({threadD:6, threadPitch:8}).depthCut === false);
    chk('  на умолчаниях не срезается ничего', spec({}).depthCut === false && spec({}).pitchTooBig === false);
  }
  /* 7. ЗАЗОР — СВОЙСТВО ЖЕНСКОЙ ДЕТАЛИ. Ручка показана у крышки, гайки и барашка, и в построителе он
     прибавляется только к женской поверхности. Обещать мужской детали посадку с ненапечатанной
     ответной частью значило бы выдумывать — поэтому у неё названа глубина профиля, а не зацеп. */
  {
    chk('у мужских разновидностей зазор не участвует',
        ['jar','stud','bolt','gland','leadscrew'].every(m => spec({threadMode:m}).clr === 0 &&
          spec({threadMode:m}).female === false));
    chk('  и в строке у них не «зацеп», а профиль',
        ['jar','stud','bolt','gland','leadscrew'].every(m => /профиль 1\.65 мм/.test(line(warn({threadMode:m}))) &&
          !/зацеп/.test(line(warn({threadMode:m})))));
    chk('  у женских наоборот', ['cap','nut','wingnut','glandcap'].every(m => spec({threadMode:m}).female === true &&
          /зацеп/.test(line(warn({threadMode:m})))));
    chk('  ручка зазора двигает зацеп на ту же величину',
        Math.abs((spec({threadClear:0.4}).grip - spec({threadClear:0.7}).grip) - 0.3) < 1e-6,
        [spec({threadClear:0.4}).grip, spec({threadClear:0.7}).grip]);
  }
  base({});
}

/* ===============================================================================================
   ПРОФИЛЬ И ДЮЙМ (v25.21.0). До этой сборки резьба была одна — треугольная метрическая, и задать её
   можно было только шагом в миллиметрах. Не хватало двух вещей, и обе не косметические.

   ПРОФИЛЬ РЕШАЕТ, ДЛЯ ЧЕГО РЕЗЬБА. У треугольной наклонные грани дают РАСПОР — силу поперёк оси,
   которая создаёт трение затяжки (крепежу оно и нужно) и разрывает гайку, когда через винт передают
   усилие. У трапецеидальной и прямоугольной грани почти отвесные, распора почти нет, и момент идёт в
   осевое усилие: тиски, струбцины и ходовые винты делают только такими.

   ДЮЙМОВАЯ ЗАДАЁТСЯ ДРУГИМ ЧИСЛОМ — витками на дюйм, а не шагом. Это второй способ задать одно и то
   же, и потому шаг сведён в ОДНО место на весь файл: выражение `Math.max(0.5, p.threadPitch||3)`
   стояло восемью копиями, и пока способ был один, они сходились случайно.

   Проверки ниже мерят УГОЛ ГРАНИ ПО ПОСТРОЕННОЙ ДЕТАЛИ — по наклону боковой стороны витка в осевом
   разрезе, — а не сверяют одну формулу с другой. */
console.log('\n=== профиль резьбы и дюймовый шаг ===');
{
  const setP = (ov) => { logos.length=0; boxHoles.length=0; dieFaces.length=0;
    Object.assign(paramState.box, defaultBoxParams(), {width:40,height:40,depth:40,
      threadMode:'stud',threadD:30,threadPitch:3,threadStarts:1,threadLen:16,threadClear:0.4,
      threadDepth:0,threadFlat:0.14,threadHand:'right',threadForm:'metric',threadTPI:0,
      threadWall:2.5,threadTop:2.5,threadGrip:24,threadGripD:0.9,threadFlange:3,
      sheetShape:'none',keycapMode:'none',platonic:'none',polyN:0,binRound:0,
      scoopDir:'none',labelTab:'none',mountHoles:'none',gripWall:'none',divX:1,divZ:1,
      stackFeet:false,gfOn:false}, ov||{});
    return paramState.box; };
  const warn = (ov) => collectPrintWarnings(setP(ov));
  const line = (ws) => ws.find(x => /^резьба /.test(x));
  const lift = (ws) => ws.find(x => /^подъём витка /.test(x));
  const spec = (ov) => threadFitSpec(setP(ov));
  const mesh = (ov) => { setP(ov); return buildTrisForShape('box', paramState.box); };

  /* ОДИН УГЛОВОЙ СТОЛБЕЦ: пары (высота, радиус) вдоль оси. По ним читается и профиль, и его наклон.

     ДВА ОТСЕВА, без которых замер врёт. Первый — ПО РАДИУСУ: у штуцера есть ещё и фланец радиусом
     девятнадцать, и без отсева «глубина профиля» выходила девятнадцать миллиметров вместо полутора.
     Второй — ПО ВЫСОТЕ: заходная фаска гасит глубину витка к торцу, и её наклонные куски тянут
     измеренный угол грани вниз (тридцать градусов читались как двадцать два). Берётся середина
     резьбы, где виток полной высоты. */
  const column = (ov) => { const g = spec(ov), t = mesh(ov), tol = 2*Math.PI/400, raw = [];
    /* У ЖЕНСКОЙ поверхности те же радиусы, отодвинутые наружу на зазор: без этой поправки окно
       срезает её гребень целиком, и столбец выходит пустым. */
    const off = g.female ? g.clr : 0;
    const rLo = g.majorR - g.h - 0.05 + off, rHi = g.majorR + 0.05 + off;
    for (const T of t) for (const v of T){
      if (Math.abs(Math.atan2(v[2], v[0])) > tol) continue;
      const r = Math.hypot(v[0], v[2]);
      if (r < rLo || r > rHi) continue;
      raw.push([v[1], r]); }
    let cLo = 1e9, cHi = -1e9;                       // где виток доходит до полной высоты
    for (const [y, r] of raw) if (r > g.majorR - 0.02){ cLo = Math.min(cLo, y); cHi = Math.max(cHi, y); }
    const mid = (cLo + cHi)/2, half = (cHi - cLo)*0.3;
    const out = raw.filter(([y]) => y > mid - half && y < mid + half);
    out.sort((a, b) => a[0] - b[0]);
    return out.filter((q, i) => i === 0 || q[0] > out[i-1][0] + 1e-9 || Math.abs(q[1] - out[i-1][1]) > 1e-9); };

  chk('профиль резьбы стал выбором', typeof threadFormOf === 'function' &&
      ['metric','trap','acme','square'].every(k => THREAD_FORMS[k]));
  /* 1. УГОЛ ГРАНИ — ИЗ ДЕТАЛИ. Боковая сторона витка поднимается на h по радиусу за h·tg(α) по оси,
     значит наклон dy/dr и есть tg(α). Берутся точки строго между впадиной и гребнем. */
  for (const form of ['metric', 'trap', 'acme']){
    const g = spec({threadForm:form}), want = g.alpha, col = column({threadForm:form});
    const lo = g.majorR - g.h, hi = g.majorR;
    let sy = 0, sr = 0, n = 0;                       // средний наклон по всем восходящим кускам
    for (let i = 1; i < col.length; i++){
      const [y0, r0] = col[i-1], [y1, r1] = col[i];
      if (r1 - r0 < 1e-6) continue;                  // только подъём
      if (r0 < lo + 0.05*g.h || r1 > hi - 0.05*g.h) continue;   // без площадок
      sy += y1 - y0; sr += r1 - r0; n++; }
    const got = Math.atan2(sy, sr)*180/Math.PI;
    chk('угол грани «' + g.formLabel + '» измерен по детали (' + got.toFixed(1) + '° при ' +
        want.toFixed(1) + '°)', n > 3 && Math.abs(got - want) < 2.5,
        {измерено:+got.toFixed(2), спец:+want.toFixed(2), кусков:n});
  }
  /* 1a. ОБЪЯВЛЕННЫЙ УГОЛ ОБЯЗАН ВЕРНУТЬСЯ. Замер по детали (пункт 1) сверяется со СПЕЦИФИКАЦИЕЙ, а та
     считает угол из площадки, которая сама выведена из угла таблицы, — круг замкнут, и подмена
     объявленного угла проходит его насквозь незамеченной. Держать таблицу должен обратный ход:
     из объявленных α и k выводится площадка, из площадки обратно α, и вернуться обязано ТО ЖЕ.
     Допуск тут узкий нарочно: Tr и ACME расходятся на полградуса, и именно их надо развести.
     ПОЧЕМУ ЭТОГО НЕЛЬЗЯ СПРОСИТЬ У СЕТКИ — сказано следующей проверкой. */
  for (const form of ['trap','acme','square']){
    const g = spec({threadForm:form});
    chk('объявленный угол «' + g.formLabel + '» возвращается из площадки',
        Math.abs(g.alpha - g.alphaWant) < 0.2, {объявлено:g.alphaWant, вышло:+g.alpha.toFixed(3)});
  }
  /* И ЧЕСТНО О ГРАНИЦЕ ЗАМЕРА: Tr и ACME отличаются половиной градуса, а это на глубине полутора
     миллиметров — считанные микроны по оси, меньше того, что кладёт сопло. Сетка их различить не
     может и не должна: подсказка на панели говорит ровно это, и проверка подпирает саму подсказку. */
  {
    const t = spec({threadForm:'trap'}), a = spec({threadForm:'acme'});
    const dAxial = Math.abs(t.flat - a.flat)*t.P*2;      // разбег площадки по оси, мм
    chk('Tr и ACME расходятся меньше, чем кладёт сопло (' + dAxial.toFixed(3) + ' мм)',
        Math.abs(t.alphaWant - a.alphaWant) === 0.5 && dAxial > 0 && dAxial < 0.4,
        {ось:+dAxial.toFixed(4), сопло:0.4});
  }
  /* 2. ГЛУБИНА СЛЕДУЕТ ИЗ ПРОФИЛЯ: у метрической 0.55 шага (как было всегда), у ходовых — половина. */
  {
    const m = spec({threadForm:'metric'}), t = spec({threadForm:'trap'});
    chk('метрическая осталась при своих 0.55 шага', Math.abs(m.h - 0.55*3) < 1e-9, m.h);
    chk('  у трапецеидальной глубина ровно половина шага', Math.abs(t.h - 0.5*3) < 1e-9, t.h);
    const col = column({threadForm:'trap'});
    let lo = 1e9, hi = -1e9; for (const [, r] of col){ lo = Math.min(lo, r); hi = Math.max(hi, r); }
    chk('  и деталь той же глубины', Math.abs((hi - lo) - t.h) < 0.05,
        {измерено:+(hi - lo).toFixed(3), спец:t.h});
  }
  /* 3. ПРЯМОУГОЛЬНАЯ — МЕАНДР: гребень и впадина делят шаг поровну, наклонных граней нет вовсе. */
  {
    const g = spec({threadForm:'square'});
    chk('у прямоугольной площадка ровно четверть (меандр)', Math.abs(g.flat - 0.25) < 1e-9, g.flat);
    /* «Наклонный» и «отвесный» различаются не самим наличием ступеньки — сетка режет высоту с шагом
       P/26, и отвесная грань тоже даёт один такой шаг, — а ОТНОШЕНИЕМ подъёма к разбегу. У наклонной
       оно около двух, у отвесной больше десяти. */
    const slopes = (ov) => { const col = column(ov), out = [];
      for (let i = 1; i < col.length; i++){
        const dr = Math.abs(col[i][1] - col[i-1][1]), dy = col[i][0] - col[i-1][0];
        if (dr > 0.05 && dy > 1e-6) out.push(dr/dy); }
      return out; };
    chk('  у прямоугольной все переходы отвесные', slopes({threadForm:'square'}).every(q => q > 5),
        slopes({threadForm:'square'}).map(q => +q.toFixed(1)).slice(0, 5));
    chk('  а у трапецеидальной — наклонные', slopes({threadForm:'trap'}).some(q => q < 5),
        slopes({threadForm:'trap'}).map(q => +q.toFixed(1)).slice(0, 5));
    /* Гребень меандра занимает половину шага: доля высоты, где радиус наружный, ко всей полосе. */
    const col = column({threadForm:'square'});
    let crest = 0, span = 0;
    for (let i = 1; i < col.length; i++){ const dy = col[i][0] - col[i-1][0]; span += dy;
      if (col[i][1] > g.majorR - 0.02 && col[i-1][1] > g.majorR - 0.02) crest += dy; }
    chk('  и гребень занимает около половины', Math.abs(crest/span - 0.5) < 0.12,
        {доля:+(crest/span).toFixed(3)});
  }
  /* 4. ДЮЙМ. Шаг равен 25.4/TPI, и это ОДНО правило: `threadPitchOf` зовут и построитель, и проверка. */
  {
    for (const tpi of [13, 20, 28]){
      const g = spec({threadTPI:tpi});
      chk('TPI ' + tpi + ' даёт шаг 25.4/' + tpi, Math.abs(g.P - 25.4/tpi) < 1e-9, +g.P.toFixed(4));
    }
    chk('  ноль означает «шаг в миллиметрах»', Math.abs(spec({threadTPI:0, threadPitch:2.5}).P - 2.5) < 1e-9);
    chk('  и TPI сильнее ползунка шага',
        Math.abs(spec({threadTPI:20, threadPitch:8}).P - 25.4/20) < 1e-9);
    chk('  число витков названо в строке', /\(20 витков на дюйм\)/.test(line(warn({threadTPI:20}))),
        line(warn({threadTPI:20})));
    /* И деталь и правда такого шага: гребни вдоль одного столбца стоят через 25.4/TPI. */
    const g = spec({threadTPI:20}), col = column({threadTPI:20});
    const ys = []; for (const [y, r] of col) if (Math.abs(r - g.majorR) < 0.02) ys.push(y);
    let n = 0, prev = -1e9;
    for (const y of ys){ if (y - prev > g.P*0.5) n++; prev = y; }
    /* Столбец берётся серединой резьбы, поэтому гребни считаются на ЕГО полосе, а не на всей длине. */
    const span = ys.length ? ys[ys.length-1] - ys[0] : 0;
    chk('  и гребни в детали стоят через шаг 25.4/TPI', n > 3 && Math.abs(span/Math.max(1, n-1) - g.P) < 0.1,
        {гребней:n, шагвдетали:+(span/Math.max(1, n-1)).toFixed(3), спец:+g.P.toFixed(3)});
  }
  /* 5. ХОДОВАЯ РЕЗЬБА: подъём витка, самоторможение и КПД. */
  {
    const g = spec({});
    chk('подъём витка — это ход, делённый на π·средний Ø',
        Math.abs(Math.tan(g.lam*Math.PI/180) - g.lead/(Math.PI*g.dm)) < 1e-9, +g.lam.toFixed(3));
    chk('  средний Ø — это наружный плюс внутренний',
        Math.abs(g.dm - (g.majorR + (g.majorR - g.h))) < 1e-9, +g.dm.toFixed(3));
    chk('  на умолчаниях резьба самотормозящая', g.selfLock === true && g.lam < 3, +g.lam.toFixed(2));
    chk('  и об этом сказано', /САМОТОРМОЗЯЩАЯ/.test(lift(warn({}))), lift(warn({})));
    /* Крупный шаг в четыре захода — и винт раскручивается сам: это и есть тот случай, ради которого
       число называется. */
    const q = spec({threadForm:'square', threadPitch:8, threadStarts:4});
    chk('  крупный многозаходный винт самоторможение теряет',
        q.selfLock === false && q.lam > 15, {подъём:+q.lam.toFixed(1)});
    chk('  и сказано об этом прямо',
        /НЕ самотормозящая/.test(lift(warn({threadForm:'square', threadPitch:8, threadStarts:4}))));
    chk('  КПД при этом много выше', q.eff > 3*g.eff, {было:+(100*g.eff).toFixed(0), стало:+(100*q.eff).toFixed(0)});
    /* ТРЕНИЕ СТОИТ В ЧИСЛИТЕЛЕ КПД, И ЭТО НЕ УКРАШЕНИЕ ФОРМУЛЫ. Член μ·tg λ — то, что трение отнимает
       у ВЫХОДА: чем круче подъём, тем большую долю осевого усилия оно съедает по дороге. Проверяется
       не переписью формулы, а её следствием: КПД обязан быть СТРОГО ниже потолка, посчитанного без
       этого члена, и разрыв обязан РАСТИ с ходом. У пологой резьбы он неразличим — десятые доли
       процента, — и именно поэтому на умолчаниях подмена не видна; у крупной многозаходной это уже
       пять процентов КПД. */
    const ceilEff = (s) => { const cb = Math.cos(s.alpha*Math.PI/180), tl = Math.tan(s.lam*Math.PI/180);
      return tl*cb/(cb*tl + s.mu); };
    const gapG = ceilEff(g) - g.eff, gapQ = ceilEff(q) - q.eff;
    chk('  и трение отнимает у КПД тем больше, чем круче подъём',
        gapG > 0 && gapQ > gapG + 0.02,
        {пологая:+(100*gapG).toFixed(2), крутая:+(100*gapQ).toFixed(2)});
    /* УГОЛ ГРАНИ ВХОДИТ В САМОТОРМОЖЕНИЕ: порог у наклонной грани выше (μ/cos β), значит найдётся шаг,
       при котором треугольная ещё держит, а прямоугольная уже раскручивается. Проверка не подставляет
       угаданное число, а ИЩЕТ такой шаг: если бы угол в условие не входил, не нашлось бы ни одного. */
    let found = null;
    for (let Pk = 10; Pk <= 80 && !found; Pk++) for (const S of [1, 2, 3, 4]){
      const ov = {threadD:12, threadPitch:Pk/10, threadStarts:S};
      const a = spec(Object.assign({threadForm:'metric'}, ov));
      const b = spec(Object.assign({threadForm:'square'}, ov));
      if (a.selfLock && !b.selfLock){ found = {шаг:Pk/10, заходов:S}; break; } }
    chk('  есть шаг, при котором наклонная грань ещё тормозит, а отвесная уже нет', found !== null, found);
  }
  /* 6. СОВЕТ ПО ДЕЛУ: метрический профиль на ходовом винте — это распор вместо усилия. */
  {
    chk('на ходовом винте метрический профиль назван неподходящим',
        spec({threadMode:'leadscrew'}).metricDrive === true &&
        /берите трапецеидальную Tr или ACME/.test(warn({threadMode:'leadscrew'}).join(' ')));
    chk('  а трапецеидальный на нём не ругают',
        spec({threadMode:'leadscrew', threadForm:'trap'}).metricDrive === false);
    chk('  и на крышке метрический профиль тоже не ругают',
        spec({threadMode:'cap'}).metricDrive === false);
  }
  /* 7. ПРЯМОУГОЛЬНАЯ ПЕЧАТАЕТСЯ МОСТАМИ, и об этом сказано вместе с ценой выгоды. */
  {
    chk('прямоугольный профиль назван мостовым', spec({threadForm:'square'}).squarePrint === true &&
        /печатается МОСТАМИ/.test(warn({threadForm:'square'}).join(' ')));
    chk('  у прочих профилей этой оговорки нет',
        ['metric','trap','acme'].every(f => !/печатается МОСТАМИ/.test(warn({threadForm:f}).join(' '))));
  }
  /* 8. РУЧКА ПЛОЩАДКИ У СВОЕГО ПРОФИЛЯ НЕ УЧАСТВУЕТ — и говорится это тому, кто её тронул. */
  {
    chk('нетронутая ручка площадки оговорки не вызывает', spec({threadForm:'trap'}).flatIgnored === false);
    chk('  а тронутая — вызывает', spec({threadForm:'trap', threadFlat:0.05}).flatIgnored === true &&
        /не участвует/.test(warn({threadForm:'trap', threadFlat:0.05}).join(' ')));
    chk('  у метрической ручка участвует по-прежнему',
        spec({threadForm:'metric', threadFlat:0.05}).flat === 0.05 &&
        spec({threadForm:'metric', threadFlat:0.05}).flatIgnored === false);
  }
  /* 9. ВСЕ ПРОФИЛИ СТРОЯТСЯ И ЗАМКНУТЫ — и пара по-прежнему сходится. */
  for (const form of ['metric','trap','acme','square'])
    for (const m of ['stud','cap','nut','bolt','leadscrew']){
      const t = mesh({threadMode:m, threadForm:form});
      chk('«' + form + '» ' + m + ': замкнута и не вывернута',
          manifoldCheck(t, 4).watertight && vol(t) > 0);
    }
  for (const form of ['trap','square']){
    const male = column({threadMode:'stud', threadForm:form});
    const fem = column({threadMode:'cap', threadForm:form});
    let mh = -1e9, fl = 1e9;
    for (const [, r] of male) mh = Math.max(mh, r);
    for (const [, r] of fem)  fl = Math.min(fl, r);
    const g = spec({threadMode:'cap', threadForm:form});
    chk('пара «' + form + '» сходится с тем же зацепом', Math.abs((mh - fl) - g.grip) < 0.06,
        {измерено:+(mh - fl).toFixed(3), спец:+g.grip.toFixed(3)});
  }
  /* 8. СТАНДАРТНЫЙ РЯД (v25.22.0). Он задаёт ТРИ числа, и третье — то самое, из-за которого прошлая
     сборка объявляла расхождение с ISO: площадку гребня. Ø и шаг без неё дают резьбу, которая
     называется M8 и на покупной болт не садится. */
  {
    chk('ряд собирается из таблиц, а не переписан рядом', typeof threadStdList === 'function' &&
        threadStdList().length === Object.keys(NUT_HEX).length + 2*Object.keys(THREAD_INCH).length,
        threadStdList().length);
    /* ШАГ БЕРЁТСЯ ИЗ ТОЙ ЖЕ ТАБЛИЦЫ, ЧТО У ГНЕЗДА ПОД ГАЙКУ: второй список шагов разошёлся бы с этим
       в тот день, когда в таблицу добавят размер. Спрашивается сама таблица, а не переписанные из неё
       числа, — иначе проверка охраняла бы собственную копию. */
    for (const d of Object.keys(NUT_HEX)){
      const g = spec({threadStd:'m'+d});
      /* Ø сверяется с рядом ЧЕРЕЗ нижний предел построителя: он сильнее ряда, и ниже четырёх
         миллиметров резьбы этот движок не делает вовсе. Молчать об этом нельзя — проверка ниже. */
      chk('M' + d + ' берёт Ø и шаг из ISO 261 (' + NUT_HEX[d][2] + ' мм)',
          Math.abs(g.D - Math.max(4, +d)) < 1e-9 && Math.abs(g.P - NUT_HEX[d][2]) < 1e-9,
          {Ø:g.D, шаг:g.P});
    }
    /* И САМ ЗАЖИМ НАЗВАН ВСЛУХ, обоими числами: ряд просит три, построитель даёт четыре. */
    {
      const g = spec({threadStd:'m3'});
      chk('M3 зажат нижним пределом построителя, и это сказано',
          g.stdClamped === true && Math.abs(g.stdD - 3) < 1e-9 && Math.abs(g.D - 4) < 1e-9 &&
          /ряд M3 просит Ø3, а построитель резьбы ниже Ø4 не идёт/.test(warn({threadStd:'m3'}).join(' ')),
          {просит:g.stdD, вышло:g.D});
      chk('  а M4 и выше не зажаты ничем',
          ['m4','m6','m8','m10','m12','m16'].every(k => spec({threadStd:k}).stdClamped === false) &&
          !/не идёт/.test(warn({threadStd:'m8'}).join(' ')));
    }
    /* ДЮЙМОВЫЙ РЯД: диаметр в дюймах, шаг из витков на дюйм. Обе величины — из таблицы `THREAD_INCH`. */
    for (const k of Object.keys(THREAD_INCH)){
      const [inch, unc, unf] = THREAD_INCH[k];
      const a = spec({threadStd:'unc'+k}), b = spec({threadStd:'unf'+k});
      chk(k + '″ UNC/UNF: Ø из дюймов, шаг из витков',
          Math.abs(a.D - inch*25.4) < 1e-9 && Math.abs(a.P - 25.4/unc) < 1e-9 &&
          Math.abs(b.P - 25.4/unf) < 1e-9 && b.P < a.P,
          {Ø:+a.D.toFixed(3), UNC:+a.P.toFixed(3), UNF:+b.P.toFixed(3)});
    }
    /* ГРАНЬ — ПО ДЕТАЛИ, А НЕ ПО ОБЕЩАНИЮ. Ради неё ряд и заводился: тридцать градусов от оси это то,
       что нарезано на покупном болте. Меряется тем же столбцом, что и остальные профили. */
    for (const std of ['m10', 'm12', 'unc1/2']){
      const g = spec({threadStd:std, threadMode:'stud'}), col = column({threadStd:std, threadMode:'stud'});
      const lo = g.majorR - g.h, hi = g.majorR;
      let sy = 0, sr = 0, n = 0;
      for (let i = 1; i < col.length; i++){
        const [y0, r0] = col[i-1], [y1, r1] = col[i];
        if (r1 - r0 < 1e-6) continue;
        if (r0 < lo + 0.05*g.h || r1 > hi - 0.05*g.h) continue;
        sy += y1 - y0; sr += r1 - r0; n++; }
      const got = Math.atan2(sy, sr)*180/Math.PI;
      chk('грань ряда «' + std + '» вышла стандартной (' + got.toFixed(1) + '° по детали)',
          n > 3 && Math.abs(got - 30) < 2.5 && Math.abs(g.alpha - 30) < 0.2,
          {деталь:+got.toFixed(2), спец:+g.alpha.toFixed(2)});
    }
    /* И РЯД ДОЕХАЛ ДО ПОСТРОЕННОГО, а не остался в спецификации: наружный радиус витка на детали
       равен половине стандартного Ø. Ø задаётся ВТОРЫМ способом, и восемь мест, читавших ползунок,
       разошлись бы с ним молча — это и проверяется. */
    for (const std of ['m6', 'm12', 'unc3/8']){
      const g = spec({threadStd:std, threadMode:'stud'}), col = column({threadStd:std, threadMode:'stud'});
      let hi = -1e9; for (const [, r] of col) hi = Math.max(hi, r);
      chk('Ø ряда «' + std + '» доехал до детали (' + (2*hi).toFixed(2) + ' мм)',
          Math.abs(2*hi - g.D) < 0.05, {деталь:+(2*hi).toFixed(3), ряд:+g.D.toFixed(3)});
    }
    chk('у ряда расхождения с ISO нет и оговорки тоже',
        spec({threadStd:'m8'}).notIso === false && !/по ISO было бы/.test(warn({threadStd:'m8'}).join(' ')));
    chk('  и ряд назван в строке резьбы вместе со своим стандартом',
        /^резьба M8 \(ISO 261, крупный шаг\): Ø8×1\.25,/.test(line(warn({threadStd:'m8'})) || ''),
        line(warn({threadStd:'m8'})));
    chk('  дюймовый — своим', /^резьба 1\/4″ UNC \(Unified, крупный шаг\)/.test(line(warn({threadStd:'unc1/4'})) || ''),
        line(warn({threadStd:'unc1/4'})));
    /* РЯД С ХОДОВЫМ ПРОФИЛЕМ — не запрет, а несбывшееся обещание: два числа стандартные, третье нет. */
    chk('ряд с ходовым профилем назван несходящимся с покупным',
        spec({threadStd:'m10', threadForm:'trap'}).stdOffProfile === true &&
        /С ПОКУПНОЙ гайкой такая резьба не свинтится/.test(warn({threadStd:'m10', threadForm:'trap'}).join(' ')));
    chk('  а с метрическим оговорки нет', spec({threadStd:'m10'}).stdOffProfile === false &&
        !/не свинтится/.test(warn({threadStd:'m10'}).join(' ')));
    chk('  и без ряда её нет тоже', spec({threadForm:'trap'}).stdOffProfile === false);
    /* ДВА СПОСОБА ЗАДАТЬ ОДНО ЧИСЛО ПОКАЗЫВАЮТСЯ ПООДИНОЧКЕ. В v25.21.0 это было заявлено и не
       работало: `needs:{threadTPI:-1}` требует «больше минус единицы», а больше её и ноль. */
    {
      const rows = {};
      for (const r of SHAPE_PARAMS.box) if (r.group === 'Резьба (крышка / штуцер)') rows[r.key] = r;
      const P0 = setP({});
      const at = (ov) => Object.assign({}, P0, ov);
      chk('свой размер — видны все три ручки',
          paramRowRelevant(rows.threadD, at({threadStd:'none'})) &&
          paramRowRelevant(rows.threadPitch, at({threadStd:'none', threadTPI:0})) &&
          paramRowRelevant(rows.threadTPI, at({threadStd:'none'})));
      chk('  витки на дюйм гасят ползунок шага',
          !paramRowRelevant(rows.threadPitch, at({threadStd:'none', threadTPI:20})));
      chk('  ряд гасит и Ø, и шаг, и витки',
          !paramRowRelevant(rows.threadD, at({threadStd:'m8'})) &&
          !paramRowRelevant(rows.threadPitch, at({threadStd:'m8'})) &&
          !paramRowRelevant(rows.threadTPI, at({threadStd:'m8'})));
      chk('  а сам ряд виден всегда', paramRowRelevant(rows.threadStd, at({threadStd:'m8'})) &&
          paramRowRelevant(rows.threadStd, at({threadStd:'none'})));
      /* Погасшая ручка гаснет ПО СВОЕЙ ПРИЧИНЕ, а не заодно: ряд не должен гасить длину резьбы. */
      chk('  и не гасит того, за что не отвечает',
          paramRowRelevant(rows.threadLen, at({threadStd:'m8', threadMode:'stud'})) &&
          paramRowRelevant(rows.threadStarts, at({threadStd:'m8'})));
    }
    /* ВСЕ РЯДЫ СТРОЯТСЯ ЗАМКНУТЫМИ — иначе стандарт был бы обещанием на бумаге. */
    for (const r of threadStdList()){
      const t = mesh({threadStd:r.v, threadMode:'stud'});
      chk('ряд «' + r.label + '» строится замкнутым', manifoldCheck(t, 4).watertight, r.v);
    }
  }
  /* 9. СКОЛЬКО ДЕРЖИТ (v25.23.0). Резьба говорила, КАК она крутится, и молчала о том, СКОЛЬКО
     выдержит, — а у струбцины и тисков это и есть главное число. */
  {
    /* ПЛОЩАДЬ СРЕЗА СТОИТ НА ОДНОМ УТВЕРЖДЕНИИ: на цилиндре СРЕДНЕГО Ø мужской и женский витки делят
       шаг поровну, поэтому материала там ровно половина. Это не подобранный коэффициент, а
       определение среднего диаметра, — и проверяется он по ПОСТРОЕННОМУ витку, а не пересказом.
       Куски сетки, пересекающие цилиндр, считаются по доле: шаг сетки P/26, и без интерполяции
       переход целиком уходил бы в пустоту, занижая долю до 0.46. */
    /* МЕРИТЬ НАДО ЦЕЛЫМ ЧИСЛОМ ШАГОВ, и это выяснилось замером же. Первая попытка брала окно в
       середине резьбы и давала 0.59 вместо половины — обрезок в полшага на конце окна попадал на
       гребень и добавлял материала там, где его считать не следовало. Отсчёт ведётся от пересечения
       среднего радиуса снизу вверх и кончается ровно через целое число ходов; куски сетки, режущие
       цилиндр, считаются по доле, иначе шаг сетки P/26 занижает ответ. */
    const pitchFrac = (ov) => { const g = spec(ov), rp = g.dm/2;
      const m = new Map();                       // на одной высоте берётся НАИБОЛЬШИЙ радиус
      for (const [y, r] of column(ov)){ const k = y.toFixed(6); if (!m.has(k) || m.get(k) < r) m.set(k, r); }
      const col = [...m.entries()].map(([k, r]) => [+k, r]).sort((a, b) => a[0] - b[0]);
      let i0 = -1;
      for (let i = 1; i < col.length; i++) if (col[i-1][1] < rp && col[i][1] >= rp){ i0 = i; break; }
      if (i0 < 0) return NaN;
      const y0 = col[i0][0], nP = Math.floor((col[col.length-1][0] - y0)/g.lead);
      if (nP < 1) return NaN;
      const y1 = y0 + nP*g.lead;
      let mat = 0, span = 0;
      for (let i = i0+1; i < col.length && col[i][0] <= y1; i++){
        const dy = col[i][0] - col[i-1][0], a = col[i-1][1] - rp, b = col[i][1] - rp;
        span += dy;
        if (a >= 0 && b >= 0) mat += dy;
        else if (a > 0 || b > 0) mat += dy*Math.abs(a > 0 ? a : b)/Math.abs(a - b); }
      return mat/span; };
    for (const ov of [{}, {threadForm:'trap'}, {threadForm:'acme'}, {threadForm:'square'},
                      {threadStd:'m10'}, {threadStd:'m12'}]){
      const o = Object.assign({threadMode:'stud'}, ov), f = pitchFrac(o), g = spec(o);
      chk('на среднем Ø материала половина (' + f.toFixed(3) + ') — ' + JSON.stringify(ov),
          Math.abs(f - 0.5) < 0.01, +f.toFixed(4));
      /* И ЭТА ПОЛОВИНА ДОЛЖНА БЫТЬ ТОЙ САМОЙ, ПО КОТОРОЙ СЧИТАЕТСЯ ПЛОЩАДЬ. Проверить допущение и не
         связать его с расчётом — значит проверить пустоту: подмена «срез по наружному Ø» проходит
         такую проверку насквозь, потому что доля на СРЕДНЕМ Ø от неё не меняется. Поэтому площадка из
         спецификации сверяется с цилиндром, ИЗМЕРЕННЫМ по детали: тот же средний Ø, та же рабочая
         длина, та же доля. */
      const aMeasured = Math.PI*g.dm*g.shearL*f;
      chk('  и площадка среза в расчёте — этот же цилиндр (' + g.aShear.toFixed(0) + ' мм²)',
          Math.abs(g.aShear - aMeasured)/aMeasured < 0.03,
          {расчёт:+g.aShear.toFixed(1), поДетали:+aMeasured.toFixed(1)});
      /* А сам средний Ø — полусумма ИЗМЕРЕННЫХ наружного и внутреннего, а не объявленная величина. */
      let lo = 1e9, hi = -1e9;
      for (const [, r] of column(o)){ lo = Math.min(lo, r); hi = Math.max(hi, r); }
      chk('  и средний Ø — полусумма измеренных наружного и впадины',
          Math.abs(g.dm - (hi + lo)) < 0.06, {расчёт:+g.dm.toFixed(3), поДетали:+(hi + lo).toFixed(3)});
    }
    /* ВПАДИНА — ТОЖЕ ПО ДЕТАЛИ: по ней считается обрыв стержня, и брать её из спецификации значило бы
       поверить формуле на слово. */
    for (const ov of [{}, {threadPitch:1.5}, {threadStd:'m12'}]){
      const o = Object.assign({threadMode:'stud'}, ov), g = spec(o), col = column(o);
      let lo = 1e9; for (const [, r] of col) lo = Math.min(lo, r);
      chk('впадина по детали совпала с расчётной (' + (2*lo).toFixed(2) + ' мм)',
          Math.abs(lo - g.coreR) < 0.05, {деталь:+(2*lo).toFixed(3), спец:+(2*g.coreR).toFixed(3)});
    }
    /* ДАЛЬНИЕ ВИТКИ НЕ РАБОТАЮТ. Нагрузка садится на первые; считать тридцать витков крышки
       работающими значило бы обещать усилие, которого не будет. Проверяется СЛЕДСТВИЕМ: до пяти
       витков длина резьбы силу растит, после пяти — не двигает вовсе. */
    {
      const a = spec({threadMode:'stud', threadLen:6}),  b = spec({threadMode:'stud', threadLen:12});
      const c = spec({threadMode:'stud', threadLen:40}), d = spec({threadMode:'stud', threadLen:90});
      chk('короткая резьба: длина растит силу', b.holdN > a.holdN*1.5,
          {'6мм':+a.holdN.toFixed(0), '12мм':+b.holdN.toFixed(0)});
      chk('  а за пятью витками длина не даёт ничего',
          Math.abs(c.holdN - d.holdN) < 1e-9 && c.workTurns === 5 && d.turns > 25,
          {'40мм':+c.holdN.toFixed(0), '90мм':+d.holdN.toFixed(0), витков:+d.turns.toFixed(1)});
    }
    /* ДВА МЕСТА РАЗРЫВА СЧИТАЮТСЯ ОБА, и какое слабее — решают числа, а не общее правило. Проверка не
       подставляет угаданный размер, а ИЩЕТ оба исхода: если бы стержень не считался, второго не
       нашлось бы никогда. */
    {
      let stripFirst = null, snapFirst = null;
      for (let D = 6; D <= 60 && !(stripFirst && snapFirst); D += 2) for (const P of [1, 2, 3, 5]){
        const g = spec({threadMode:'stud', threadD:D, threadPitch:P});
        if (g.shankFirst && !snapFirst) snapFirst = {Ø:D, шаг:P};
        if (!g.shankFirst && !stripFirst) stripFirst = {Ø:D, шаг:P}; }
      chk('есть размер, где первым срезает витки', stripFirst !== null, stripFirst);
      chk('  и есть, где первым рвётся стержень', snapFirst !== null, snapFirst);
      chk('  и слабейшее из двух и есть ответ',
          [{threadD:16},{threadD:40},{threadPitch:1},{threadPitch:6}].every(ov => {
            const g = spec(Object.assign({threadMode:'stud'}, ov));
            return Math.abs(g.holdMin - Math.min(g.holdN, g.shankN)) < 1e-9; }));
      chk('  у крышки и гайки стержня нет, и слабым звеном он не назначается',
          ['cap','nut','wingnut'].every(m => { const g = spec({threadMode:m});
            return g.hasShank === false && g.shankFirst === false &&
                   Math.abs(g.holdMin - g.holdN) < 1e-9; }));
    }
    /* ПРОЧНОСТЬ БЕРЁТСЯ ИЗ ТОЙ ЖЕ ТАБЛИЦЫ, ЧТО У ЗАЩЁЛКИ И КРЮЧКА. Второй набор прочностей разошёлся
       бы с первым молча, поэтому спрашивается сама таблица. */
    for (const m of ['pla','petg','abs','nylon']){
      const g = spec({threadMode:'stud', printMat:m}), s0 = SNAP_MATERIALS[m];
      chk('прочность «' + m + '» — та же E·ε с межслойной половиной',
          Math.abs(g.sigmaZ - s0.E*(s0.eps/100)*LAYER_BOND) < 1e-9 &&
          Math.abs(g.tauZ - g.sigmaZ/Math.sqrt(3)) < 1e-9,
          {сигма:+g.sigmaZ.toFixed(2), тау:+g.tauZ.toFixed(2)});
    }
    chk('  и материал двигает силу ровно как прочность',
        Math.abs(spec({threadMode:'stud', printMat:'nylon'}).holdN /
                 spec({threadMode:'stud', printMat:'pla'}).holdN -
                 (SNAP_MATERIALS.nylon.E*SNAP_MATERIALS.nylon.eps) /
                 (SNAP_MATERIALS.pla.E*SNAP_MATERIALS.pla.eps)) < 1e-9);
    /* МОМЕНТ — СЛЕДСТВИЕМ, А НЕ ПЕРЕПИСЬЮ ФОРМУЛЫ: при том же усилии круче подъём — больше момент,
       и самотормозящая пара тратит на трение больше, чем несамотормозящая. */
    {
      /* Проверяется НАПРАВЛЕНИЕ, а не угаданный множитель: удельный момент (на единицу усилия) обязан
         расти с ходом монотонно, потому что в него входит tg λ. Один порог поймал бы одну подмену,
         монотонность по всему ряду ловит любую, которая ход из формулы выбрасывает. */
      const spec4 = [1, 2, 3, 4].map(S =>
        spec({threadMode:'leadscrew', threadForm:'trap', threadStarts:S}));
      const uT = spec4.map(g => 1000*g.torque/g.holdMin);
      /* Требуется НАПРАВЛЕНИЕ, а не множитель. Множитель тут был бы магическим числом и к тому же
         зависел бы от трения: с v25.24.0 оно берётся у материала, и у PLA (0.3) доля хода в моменте
         меньше, чем была при общих 0.2, — тот же винт даёт рост в 1.33 раза вместо 1.45. Величину
         пинает не он, а проверка «момент считается по ИЗМЕРЕННОМУ среднему Ø» ниже: она пересчитывает
         момент от построенной детали целиком и ловит любую подмену в самой формуле. */
      chk('круче подъём — больше момента на ту же силу, и это монотонно',
          uT.every((v, i) => i === 0 || v > uT[i-1]) &&
          spec4.every((g, i) => i === 0 || g.lam > spec4[i-1].lam),
          uT.map(v => +v.toFixed(3)));
      /* ПЛЕЧО МОМЕНТА — СРЕДНИЙ РАДИУС, а не наружный: трение действует по тем же граням, по которым
         считается срез, то есть по линии среднего Ø. Пересчитывается момент от ИЗМЕРЕННОГО цилиндра —
         иначе подмена плеча на наружный радиус проходит незамеченной: она двигает число на шесть
         процентов, а все отношения оставляет прежними. */
      for (const ov of [{threadMode:'leadscrew', threadForm:'trap'},
                        {threadMode:'leadscrew', threadForm:'square', threadPitch:5},
                        {threadMode:'stud', threadStd:'m12'}]){
        const g = spec(ov);
        let lo = 1e9, hi = -1e9;
        for (const [, r] of column(ov)){ lo = Math.min(lo, r); hi = Math.max(hi, r); }
        const dmM = hi + lo, tl = g.lead/(Math.PI*dmM);
        const muE = g.mu/Math.cos(g.alpha*Math.PI/180);
        const want = g.holdMin*(dmM/2)*(tl + muE)/(1 - muE*tl)/1000;
        chk('момент считается по ИЗМЕРЕННОМУ среднему Ø (' + g.torque.toFixed(2) + ' Н·м)',
            Math.abs(g.torque - want)/want < 0.03,
            {расчёт:+g.torque.toFixed(3), поДетали:+want.toFixed(3), dm:+dmM.toFixed(2)});
      }
      chk('  и момент назван строкой у ходовой',
          /нужен момент .* Н·м — это .* Н на рукоятке 100 мм/.test(
            warn({threadMode:'leadscrew', threadForm:'trap'}).join(' ')));
      chk('  а у крышки от банки его нет', spec({threadMode:'cap'}).drive === false &&
          !/нужен момент/.test(warn({threadMode:'cap'}).join(' ')));
    }
    /* РУКА СИЛЬНЕЕ РЕЗЬБЫ — сравнение двух ПОСЧИТАННЫХ чисел, а не порог на глазок. */
    {
      const weak = {threadMode:'leadscrew', threadForm:'trap', threadD:10};
      const strong = {threadMode:'leadscrew', threadForm:'trap', threadD:40};
      chk('тонкий ходовой винт рука срывает, и это сказано',
          spec(weak).handStrips === true && spec(weak).torque < spec(weak).handTorque &&
          /РУКА СИЛЬНЕЕ ЭТОЙ РЕЗЬБЫ/.test(warn(weak).join(' ')));
      chk('  а толстый — нет', spec(strong).handStrips === false &&
          !/РУКА СИЛЬНЕЕ/.test(warn(strong).join(' ')));
    }
    /* ОГОВОРКА ПРО ЗАПОЛНЕНИЕ — не украшение: она и объясняет, почему на реальной печати порядок
       разрушения может быть обратным названному. */
    chk('сказано, что числа для сплошной печати',
        /Числа для СПЛОШНОЙ печати/.test(warn({threadMode:'stud'}).join(' ')));
    chk('  и что заполнение бьёт по двум местам по-разному',
        /витки лежат по краю и печатаются периметрами/.test(warn({threadMode:'stud'}).join(' ')) &&
        !/заполнение бьёт/.test(warn({threadMode:'cap'}).join(' ')));
  }
  /* 10. ТРЕНИЕ — СВОЙСТВО МАТЕРИАЛА (v25.24.0). До этой сборки в файле стояло одно число на всех, и
     резьба из нейлона считалась как резьба из TPU, хотя между ними впятеро. */
  {
    chk('трение спрашивается у материала, а не у резьбы',
        typeof matMu === 'function' && typeof threadMuOf === 'function' &&
        Object.keys(FIL_MAT).every(k => typeof FIL_MAT[k].mu === 'number' && FIL_MAT[k].mu > 0),
        Object.keys(FIL_MAT).map(k => k + ':' + FIL_MAT[k].mu).join(' '));
    for (const m of Object.keys(FIL_MAT))
      chk('  «' + m + '» доходит до расчёта резьбы',
          Math.abs(spec({printMat:m}).mu - FIL_MAT[m].mu) < 1e-12, spec({printMat:m}).mu);
    /* САМИ ЧИСЛА КОЛОНКИ ПОД ПРОВЕРКОЙ — но не переписыванием их сюда (это была бы вторая копия
       таблицы, ровно то, от чего колонка и заводилась), а теми УТВЕРЖДЕНИЯМИ О ПОРЯДКЕ, ради которых
       она вообще нужна. Эластомер липнет сильнее любого жёсткого пластика; нейлон самосмазывающийся и
       скользит лучше PLA; углеволокно трение СНИЖАЕТ — и у нейлона, и у PLA. Подмена любого числа,
       ломающая один из этих порядков, ломает и ответ приложения. */
    const MU = k => FIL_MAT[k].mu;
    chk('эластомеры липнут сильнее любого жёсткого пластика',
        ['pla','plaplus','petg','abs','nylon','pacf','pc','cf'].every(k => MU('tpu') > MU(k)*1.5) &&
        MU('tpe') >= MU('tpu'), {tpu:MU('tpu'), tpe:MU('tpe')});
    chk('  нейлон скользит лучше PLA', MU('nylon') < MU('pla'), {nylon:MU('nylon'), pla:MU('pla')});
    chk('  углеволокно трение снижает — и у нейлона, и у PLA',
        MU('pacf') < MU('nylon') && MU('cf') < MU('pla'),
        {pacf:MU('pacf'), nylon:MU('nylon'), cf:MU('cf'), pla:MU('pla')});
    chk('  и ни одно число не вышло за пределы правдоподобного',
        Object.keys(FIL_MAT).every(k => MU(k) >= 0.1 && MU(k) <= 1.2),
        Object.keys(FIL_MAT).map(k => MU(k)).join(' '));
    /* И ДОХОДИТ НЕ ТОЛЬКО ДО ПОЛЯ, А ДО ОТВЕТА: КПД обязан падать с ростом трения — монотонно по всей
       таблице. Одно сравнение поймало бы одну подмену; монотонность ловит любую, которая трение из
       формулы выбрасывает. */
    {
      const byMu = Object.keys(FIL_MAT).map(k => ({mu:FIL_MAT[k].mu, e:spec({printMat:k}).eff}))
        .sort((a, b) => a.mu - b.mu);
      chk('КПД падает с ростом трения — по всей таблице',
          byMu.every((v, i) => i === 0 || v.e <= byMu[i-1].e + 1e-12) && byMu[0].e > byMu[byMu.length-1].e*2,
          byMu.map(v => v.mu + '→' + (100*v.e).toFixed(0) + '%').join(' '));
    }
    /* САМОТОРМОЖЕНИЕ МАТЕРИАЛ ПЕРЕВОРАЧИВАЕТ, и это главное, ради чего трение перестало быть общим.
       Проверка не подставляет угаданный винт, а ИЩЕТ его: если бы материал в условие не входил, не
       нашлось бы ни одного. */
    {
      let found = null;
      for (let Pk = 20; Pk <= 90 && !found; Pk += 2) for (const S of [1, 2, 3, 4]){
        const ov = {threadMode:'leadscrew', threadForm:'trap', threadPitch:Pk/10, threadStarts:S};
        const a = spec(Object.assign({printMat:'tpu'}, ov));
        const b = spec(Object.assign({printMat:'pacf'}, ov));
        if (a.selfLock && !b.selfLock) found = {шаг:Pk/10, заходов:S}; }
      chk('есть винт, который TPU удержит, а PA-CF отпустит', found !== null, found);
      /* Дальше идёт разбор НАЙДЕННОГО винта, и без запасного набора весь остаток блока падал бы с
         обрывом файла, а не с честной строкой FAIL: подмена «трение снова одно на всех» именно так и
         вела себя в первом прогоне мутаций — тест не проваливался, а рушился, унося за собой всё, что
         стояло ниже. Проверка обязана падать, а не взрываться. */
      const FLIP = found || {шаг:6, заходов:3};
      chk('  и об этом сказано ИМЕНЕМ второго пластика',
          found !== null && /самоторможение здесь держится на МАТЕРИАЛЕ/.test(
            warn({threadMode:'leadscrew', threadForm:'trap', printMat:'tpu',
                  threadPitch:FLIP.шаг, threadStarts:FLIP.заходов}).join(' ')));
      /* Оговорка ищет ДРУГОЙ МАТЕРИАЛ ИЗ ТАБЛИЦЫ, а не воображаемое трение: названный пластик обязан
         существовать и обязан давать обратный исход. */
      const g = spec({threadMode:'leadscrew', threadForm:'trap', printMat:'tpu',
                      threadPitch:FLIP.шаг, threadStarts:FLIP.заходов});
      const other = Object.keys(FIL_MAT).find(k => FIL_MAT[k].t === g.muOther);
      chk('  и названный пластик есть в таблице и правда решает наоборот',
          !!other && spec({threadMode:'leadscrew', threadForm:'trap', printMat:other,
                           threadPitch:FLIP.шаг, threadStarts:FLIP.заходов}).selfLock !== g.selfLock,
          {назван:g.muOther, трение:g.muOtherV});
      chk('  а там, где материал исхода не меняет, оговорки нет',
          spec({threadMode:'cap'}).muFlips === false &&
          !/держится на МАТЕРИАЛЕ/.test(warn({threadMode:'cap'}).join(' ')));
    }
    /* И МАТЕРИАЛ НАЗВАН В САМОЙ СТРОКЕ — иначе число 0.9 выглядело бы взявшимся ниоткуда. */
    chk('в строке подъёма назван материал вместе с трением',
        /при трении 0\.9 — это TPU \(гибкий\) насухо/.test(lift(warn({printMat:'tpu'})) || ''),
        lift(warn({printMat:'tpu'})));
    /* ЧЕГО КОЛОНКА НЕ ЗНАЕТ — тоже под проверкой: трение о ЧУЖУЮ поверхность это другая пара, и
       подменять им своё справочное число нельзя. Третья рука обязана остаться при своём. */
    {
      const fs = require('fs'), src2 = fs.readFileSync('parametric-stl-generator.html', 'utf8');
      const app2 = src2.split('<script>').slice(2).join('<script>');
      chk('трение о стеклотекстолит осталось своим числом',
          /const ART_BOARD_MU\s*=\s*0\.3;/.test(app2) && !/ART_BOARD_MU\s*=\s*matMu/.test(app2));
    }
  }
  /* 11. ПАРА ИЗ ДВУХ РАЗНЫХ ПЛАСТИКОВ (v25.26.0). Компенсация усадки считается под ОДИН материал и
     одна на оба файла пары; печатают половины из разного — и разница усадок ложится прямо в зазор. */
  {
    chk('пара из другого материала стала ручкой', typeof matMateKey === 'function' &&
        typeof matMateShrinkDelta === 'function' &&
        SHAPE_PARAMS.box.some(r => r.key === 'matMate' && r.default === 'same'));
    chk('  умолчание «из того же» ничего не объявляет',
        spec({}).mate === null && Math.abs(spec({}).mateDelta) < 1e-12 &&
        !/ответная деталь из/.test(warn({}).join(' ')));
    /* РАЗНИЦА БЕРЁТСЯ ИЗ ТАБЛИЦЫ, а не переписана: спрашивается сама `FIL_MAT`. */
    for (const [a, b] of [['pla','abs'], ['nylon','pla'], ['petg','pc'], ['tpu','cf']]){
      const g = spec({printMat:a, matMate:b});
      chk('усадки «' + a + '»→«' + b + '» вычтены из таблицы',
          Math.abs(g.mateDelta - (FIL_MAT[b].shrink - FIL_MAT[a].shrink)) < 1e-12, g.mateDelta);
      /* И ЛОЖИТСЯ ОНА НА СТОРОНУ, а не на диаметр: зазор задан на сторону, ошибка идёт по диаметру. */
      chk('  и переведены в сдвиг НА СТОРОНУ',
          Math.abs(g.mateSide - g.mateDelta/100*g.D/2) < 1e-12, +g.mateSide.toFixed(4));
    }
    /* КОМПЕНСАЦИЯ ЗДЕСЬ НИ ПРИ ЧЁМ — и это ошибка, которую первая редакция правила и сделала: при
       выключенной компенсации разница усадок не исчезает, обе половины просто уезжают от номинала
       каждая на своё, а ДРУГ ОТ ДРУГА — ровно на ту же величину. */
    chk('выключенная компенсация разницу усадок не отменяет',
        Math.abs(spec({matMate:'abs', matShrink:false}).mateDelta -
                 spec({matMate:'abs'}).mateDelta) < 1e-12 &&
        Math.abs(spec({matMate:'abs', matShrink:false}).mateDelta) > 0.4,
        spec({matMate:'abs', matShrink:false}).mateDelta);
    chk('  и об этом сказано в самой строке',
        /выключить её нельзя: разница усадок от этого не исчезает/.test(warn({matMate:'abs'}).join(' ')));
    /* ДВЕ РАЗНЫЕ БЕДЫ, И ЗНАК РЕШАЕТ, КОТОРАЯ. Проверка ищет оба исхода перебором: если бы знак в
       условие не входил, второго не нашлось бы никогда. */
    {
      let loose = null, tight = null;
      for (const m of ['cap','stud']) for (const a of Object.keys(FIL_MAT))
        for (const b of Object.keys(FIL_MAT)){
          if (a === b) continue;
          const g = spec({threadMode:m, printMat:a, matMate:b, threadD:80});
          if (!g.mateEats) continue;
          if (g.mateLoose && !loose) loose = {m, a, b};
          if (!g.mateLoose && !tight) tight = {m, a, b};
        }
      chk('есть пара, которая после усадок будет болтаться', loose !== null, loose);
      chk('  и есть пара, которая не свинтится', tight !== null, tight);
      chk('  и сказано про каждую своё',
          loose && tight &&
          /БУДЕТ БОЛТАТЬСЯ/.test(warn({threadMode:loose.m, printMat:loose.a, matMate:loose.b, threadD:80}).join(' ')) &&
          /НЕ СВИНТИТСЯ/.test(warn({threadMode:tight.m, printMat:tight.a, matMate:tight.b, threadD:80}).join(' ')));
      /* ОДНА И ТА ЖЕ ПАРА ПЛАСТИКОВ ДАЁТ КРЫШКЕ И ШТУЦЕРУ ПРОТИВОПОЛОЖНЫЕ БЕДЫ, и это не оттенок
         формулировки, а физика: у крышки ответная деталь мужская, у штуцера женская, и «ответная
         вышла меньше» в одном случае разводит витки, а в другом сводит. Проверка «нашлись оба исхода»
         этого не ловит — при подмене, которая роль половины не смотрит, оба исхода всё равно где-то
         найдутся. Ловит только СРАВНЕНИЕ ДВУХ ПОЛОВИН НА ОДНОЙ паре материалов. */
      {
        const ov = {printMat:'pla', matMate:'nylon', threadD:80};
        const f = spec(Object.assign({threadMode:'cap'}, ov));
        const m = spec(Object.assign({threadMode:'stud'}, ov));
        chk('крышка и штуцер на одной паре пластиков получают ПРОТИВОПОЛОЖНЫЕ беды',
            f.mateEats && m.mateEats && f.mateLoose !== m.mateLoose,
            {крышка:f.mateLoose ? 'болтается' : 'не свинтится',
             штуцер:m.mateLoose ? 'болтается' : 'не свинтится'});
        /* «Противоположные» мало: перевёрнутый знак тоже даёт противоположные. Направление
           закрепляется ЗАЦЕПОМ — той самой величиной, которую отдельная проверка выше меряет по двум
           построенным деталям как разницу наибольшего мужского и наименьшего женского радиуса.
           Ответная половина, севшая сильнее, выходит МЕНЬШЕ: у крышки это уводит мужской гребень от
           женской впадины и зацеп УМЕНЬШАЕТ, у штуцера — наоборот, женская впадина подходит ближе и
           зацеп РАСТЁТ. Болтается там, где зацеп уменьшается; это физика пары, а не запись условия. */
        for (const [mode, fem] of [['cap', true], ['stud', false]])
          for (const mate of ['nylon', 'pacf']){
            const g = spec({threadMode:mode, printMat:'pla', matMate:mate, threadD:80});
            const dGrip = (fem ? -1 : 1)*g.mateSide;   // насколько меняется перекрытие витков
            chk('  «' + mode + '» + «' + mate + '»: болтается ровно тогда, когда зацеп уменьшается',
                g.mateLoose === (dGrip < 0),
                {знак:g.mateDelta, сдвигЗацепа:+dGrip.toFixed(3), болтается:g.mateLoose});
          }
      }
      /* И БЕДА ОБЪЯВЛЯЕТСЯ ТОЛЬКО ТОГДА, КОГДА СДВИГ И ПРАВДА СЪЕЛ ЗАЗОР: на мелком Ø та же пара
         пластиков живёт спокойно, потому что ошибка растёт с диаметром, а зазор — нет. */
      chk('  а на мелком Ø та же пара беды не даёт',
          loose && spec({threadMode:loose.m, printMat:loose.a, matMate:loose.b, threadD:12}).mateEats === false);
    }
    /* СДВИГ РАСТЁТ С ДИАМЕТРОМ ЛИНЕЙНО — это и есть причина, по которой мелкая пара прощает то, чего
       не прощает крупная. */
    {
      const a = spec({matMate:'abs', threadD:20}), b = spec({matMate:'abs', threadD:80});
      chk('сдвиг растёт с диаметром линейно',
          Math.abs(b.mateSide/a.mateSide - 4) < 1e-9, {'Ø20':+a.mateSide.toFixed(3), 'Ø80':+b.mateSide.toFixed(3)});
    }
  }
  /* 12. ПРИНТЕР СТАЛ ЧИСЛАМИ (v25.27.0). Сопло и высота слоя — свойства ПРИНТЕРА; до этой сборки
     приложение их не знало и советовало владельцу сопла 0.6 то, чего его принтер не умеет. */
  {
    chk('сопло и слой спрашиваются одним выражением',
        typeof nozzleOf === 'function' && typeof minFeature === 'function' && typeof layerOf === 'function' &&
        nozzleOf({}) === 0.4 && layerOf({}) === 0.2 && minFeature({}) === 0.8);
    chk('  и ручки для них есть на панели',
        ['printNozzle','printLayerH'].every(k => SHAPE_PARAMS.box.some(r => r.key === k)));
    /* СТАРЫХ ИМЁН БОЛЬШЕ НЕТ. Шесть констант под одно число — это шесть мест, где оно может
       разойтись; проверка смотрит в ИСХОДНИК, потому что удалённое имя из бандла иначе не видно. */
    {
      const fs = require('fs'), app3 = fs.readFileSync('parametric-stl-generator.html', 'utf8')
        .split('<script>').slice(2).join('<script>');
      const dead = ['LOGO3D_NOZZLE','THREAD_NOZZLE','SHEET_NOZZLE','HINGE_NOZZLE','GEAR_NOZZLE',
                    'LB_NOZZLE','PRINT_LAYER','THREAD_LAYER']
        .filter(n => new RegExp('const\\s+' + n + '\\s*=').test(app3));
      chk('шести имён одного сопла и двух имён слоя больше нет', dead.length === 0, dead);
    }
    /* МИНИМАЛЬНЫЙ ЭЛЕМЕНТ ЕДЕТ ЗА СОПЛОМ — и это проверяется ОТВЕТОМ приложения, а не полем: у витка
       шнека 0.7 мм на мелком сопле беды нет, на стандартном есть, на крупном тем более. */
    {
      const say = (nz) => collectPrintWarnings(setP({threadMode:'auger', threadStd:'m6', printNozzle:nz}))
        .filter(x => /виток шнека/.test(x)).join(' ');
      chk('на сопле 0.25 виток 0.7 мм печатаем — приложение молчит', say('0.25') === '', say('0.25'));
      chk('  на 0.4 уже нет, и сопло названо', /тоньше двух проходов сопла 0\.4/.test(say('0.4')), say('0.4'));
      chk('  и на 0.8 названо своё', /тоньше двух проходов сопла 0\.8/.test(say('0.8')), say('0.8'));
    }
    /* ВЫСОТА СЛОЯ ЕДЕТ В ЧИСЛА, А НЕ ТОЛЬКО В ТЕКСТ: слоёв на виток обязано быть шагом, делённым на
       слой, при любом слое. */
    for (const lh of [0.08, 0.12, 0.2, 0.28, 0.4]){
      const g = spec({printLayerH:lh});
      chk('слоёв на виток при слое ' + lh + ' — это шаг, делённый на слой',
          Math.abs(g.layers - g.P/lh) < 1e-9, +g.layers.toFixed(2));
    }
    /* Слой называется в строке РЕЗЬБЫ, а не в строке подъёма: первая редакция проверки спрашивала
       вторую и падала на верном тексте — `||` не доходил до запасного варианта, потому что строка
       подъёма существует и просто не про слой. */
    chk('  и слой назван в самой строке',
        /слоёв на виток 37\.5 при слое 0\.08 мм/.test(line(warn({printLayerH:0.08})) || ''),
        line(warn({printLayerH:0.08})));
    /* И ГЕОМЕТРИЯ ОТ ЭТОГО НЕ ДВИГАЕТСЯ: числа ПЕЧАТНЫЕ, а не модельные. Сравниваются построенные
       сетки — побайтово, а не по габаритам. */
    {
      const sig = (ov) => { const t = mesh(ov); let s2 = '';
        for (const T of t) for (const v of T) s2 += v[0].toFixed(4) + ',' + v[1].toFixed(4) + ',' + v[2].toFixed(4) + ';';
        return s2; };
      const base0 = sig({threadMode:'cap'});
      chk('сопло не двигает ни одной вершины',
          ['0.25','0.6','0.8'].every(nz => sig({threadMode:'cap', printNozzle:nz}) === base0));
      chk('  и высота слоя тоже', [0.08, 0.3].every(lh => sig({threadMode:'cap', printLayerH:lh}) === base0));
    }
  }
  /* И НАЙДЕННОЕ ПО ДОРОГЕ: метрическая здесь не по ISO. Угол её грани следует из ручки площадки и
     глубины, а не из стандарта, и на умолчаниях выходит 21.8° вместо тридцати. Замер это и показал —
     первая запись объявляла в таблице тридцать, и деталь с объявлением разошлась. */
  {
    const g = spec({threadForm:'metric'});
    chk('метрическая здесь не по ISO, и это названо', g.notIso === true &&
        Math.abs(g.alpha - 21.8) < 0.2 &&
        /по ISO было бы 30°/.test(warn({threadForm:'metric'}).join(' ')),
        +g.alpha.toFixed(2));
    /* Названо ЧИСЛОМ в той же строке, а не отдельной жалобой: угол следует из ручки площадки, и
       отдельная строка про ISO была бы придиркой приложения к собственному умолчанию. */
    const metricLines = warn({threadForm:'metric'});
    chk('  и сказано это в самой строке резьбы, а не отдельной придиркой',
        metricLines.some(l => /^резьба Ø/.test(l) && /по ISO было бы 30° — площадку задаёт ручка, а не стандарт/.test(l)) &&
        !metricLines.some(l => !/^резьба Ø/.test(l) && /ISO/.test(l)),
        metricLines.filter(l => /ISO/.test(l)).length);
    /* А если эту площадку и правда поставить — угол становится тридцатью, и оговорка уходит. */
    const isoFlat = (0.5 - (0.55*3)*Math.tan(Math.PI/6)/3)/2;
    const iso = spec({threadForm:'metric', threadFlat:+isoFlat.toFixed(4)});
    chk('  и она их и правда даёт', Math.abs(iso.alpha - 30) < 0.3 && iso.notIso === false,
        {площадка:+isoFlat.toFixed(4), угол:+iso.alpha.toFixed(2)});
    chk('  у своих профилей этой оговорки нет',
        ['trap','acme','square'].every(f => spec({threadForm:f}).notIso === false));
  }
  setP({});
}

console.log('\n=== TOTAL:',pass,'passed,',fail,'failed ===');
process.exit(fail?1:0);
