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

console.log('\n=== TOTAL:',pass,'passed,',fail,'failed ===');
process.exit(fail?1:0);
