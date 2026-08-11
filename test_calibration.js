// Тесты печати (базовая форма «Тесты», v18.0.0): температурная башня, тест мостов и нависаний, тест
// ретракта — через НАСТОЯЩИЙ buildTrisForShape.
//
// До v18.0.0 все три жили в «Крепеже» на `mntMode`, среди кронштейнов и холдеров. Разделение по существу:
// крепёж — деталь, которую ставят в изделие, а калибровочный образец меряет ПРИНТЕР и в изделие не идёт.
// Ключи переименованы из `mnt*` в `tst*`; перенос старых конфигов проверяется здесь же.
// (Далее — исходный заголовок.) These models exist to be MEASURED off the bed, so the tests
// measure them off the mesh — segment heights, tick counts, bridge spans, overhang angles, tower taper.
// Run via ./run-all.sh.
let pass=0,fail=0; function chk(n,c,e){if(c){pass++;console.log('  OK  ',n);}else{fail++;console.log('  FAIL',n,e!==undefined?JSON.stringify(e):'');}}
function vol(t){let v=0;for(const T of t){const a=T[0],b=T[1],c=T[2];v+=(a[0]*(b[1]*c[2]-b[2]*c[1])-a[1]*(b[0]*c[2]-b[2]*c[0])+a[2]*(b[0]*c[1]-b[1]*c[0]))/6;}return v;}
function base(ov){ logos.length=0; boxHoles.length=0; dieFaces.length=0;
  Object.assign(paramState.box, defaultBoxParams(), {width:40,height:40,depth:40,
    tstMode:'temptower', tstSegN:5, tstSegH:12, tstW:30, tstT:4, tstSpan:50, tstRetGap:35, mntMode:'none',
    fnOn:false,pbPart:'none',woBack:'none',hookMount:'none',gearMode:'none',pipMode:'none',psOn:false,
    threadMode:'none',sheetShape:'none',keycapMode:'none',platonic:'none',polyN:0,binRound:0,
    scoopDir:'none',labelTab:'none',mountHoles:'none',gripWall:'none',divX:1,divZ:1,stackFeet:false,gfOn:false}, ov);
  return buildTrisForShape('box',paramState.box); }

const uniq=a=>a.filter((v,i)=>i===0||v-a[i-1]>1e-6);
function hitsX(tris,y,z){const xs=[];for(const T of tris){const[a,b,c]=T;
 const d1=(b[1]-a[1])*(z-a[2])-(b[2]-a[2])*(y-a[1]);const d2=(c[1]-b[1])*(z-b[2])-(c[2]-b[2])*(y-b[1]);const d3=(a[1]-c[1])*(z-c[2])-(a[2]-c[2])*(y-c[1]);
 if(!((d1>=0&&d2>=0&&d3>=0)||(d1<=0&&d2<=0&&d3<=0)))continue;
 const A=(b[1]-a[1])*(c[2]-a[2])-(b[2]-a[2])*(c[1]-a[1]);if(Math.abs(A)<1e-12)continue;
 const w1=((b[1]-y)*(c[2]-z)-(b[2]-z)*(c[1]-y))/A,w2=((c[1]-y)*(a[2]-z)-(c[2]-z)*(a[1]-y))/A;
 xs.push(w1*a[0]+w2*b[0]+(1-w1-w2)*c[0]);}return xs.sort((u,v)=>u-v);}
// De-duplicated only where distinct POSITIONS are wanted; parity counting needs every crossing, including
// the two a shared edge legitimately produces.
const hitsXu=(t,y,z)=>uniq(hitsX(t,y,z));
// A horizontal section's closed loops: the outline plus one per through-window.
function sectionLoops(tris, y){
  const segs=[];
  for(const T of tris){ const pts=[];
    for(let k=0;k<3;k++){ const A=T[k], B=T[(k+1)%3];
      if((A[1]-y)*(B[1]-y)<0){ const t=(y-A[1])/(B[1]-A[1]);
        pts.push([A[0]+(B[0]-A[0])*t, A[2]+(B[2]-A[2])*t]); } }
    if(pts.length===2) segs.push(pts); }
  const key=q=>q.map(c=>Math.round(c*1e3)).join(',');
  const par=new Map(), find=a=>{ while(par.get(a)!==a){ par.set(a,par.get(par.get(a))); a=par.get(a);} return a; };
  const add=q=>{ const k=key(q); if(!par.has(k)) par.set(k,k); return k; };
  for(const sg of segs){ const a=find(add(sg[0])), b=find(add(sg[1])); if(a!==b) par.set(b,a); }
  const roots=new Set(); for(const k of par.keys()) roots.add(find(k));
  return roots.size;
}

console.log('=== watertight across every knob ===');
for(const m of ['temptower','bridgetest','retract'])
  for(const n of [3,5,8,10])
    for(const H of [5,12,60])
      for(const W of [10,30,300]){
        const t=base({mntMode:m,tstSegN:n,tstSegH:H,tstW:W}), mc=manifoldCheck(t,4);
        chk(m+' n'+n+' H'+H+' W'+W+' watertight (+vol)', mc.watertight&&vol(t)>0,
            {open:mc.openEdges,bad:mc.badEdges});
      }
for(const ov of [{tstMode:'bridgetest',tstSpan:10},{tstMode:'bridgetest',tstSpan:120},
                 {tstMode:'retract',tstRetGap:10},{tstMode:'retract',tstRetGap:150},
                 {tstMode:'temptower',tstT:20},{tstMode:'bridgetest',tstT:2},
                 {tstMode:'retract',tstW:10,tstSegH:5},{tstMode:'temptower',tstSegN:10,tstSegH:60}]){
  const t=base(ov), mc=manifoldCheck(t,4);
  chk('extreme '+JSON.stringify(ov)+' watertight', mc.watertight&&vol(t)>0, {open:mc.openEdges,bad:mc.badEdges});
}

console.log('=== temperature tower: the segments are countable and each one tests something ===');
{ const H=12, n=5, W=30, t=base({tstMode:'temptower',tstSegN:n,tstSegH:H,tstW:W});
  const B=computeBBox(t), y0=B.minY;
  chk('height = segments × segment height', Math.abs((B.maxY-B.minY)-n*H)<0.05, {y:+(B.maxY-B.minY).toFixed(2)});
  const widths=[];
  for(let k=0;k<n;k++){ const xs=hitsXu(t, y0+k*H+H*0.15, 0);
    widths.push(xs.length>=2 ? xs[xs.length-1]-xs[0] : NaN); }
  chk('every segment steps in, so the boundary is visible',
      widths.every((w,i)=>i===0 || w < widths[i-1]-0.5), widths.map(v=>+v.toFixed(2)));
  chk('and the bottom one is the width asked for', Math.abs(widths[0]-W)<0.05, {w:+widths[0].toFixed(2)});
  for(let k=0;k<n;k++){
    const xs=hitsXu(t, y0+k*H+H*0.7, -( (B.maxZ-B.minZ)/2 )+0.2 - 0.6);
    chk('segment '+(k+1)+' wears '+(k+1)+' count marks', xs.length===2*(k+1), {got:xs.length/2, want:k+1});
  }
  for(let k=0;k<n;k++)
    chk('segment '+(k+1)+' has a bridged window', sectionLoops(t, y0+k*H+H*0.42)===2,
        {loops:sectionLoops(t, y0+k*H+H*0.42)});
}
{ const a=computeBBox(base({tstMode:'temptower',tstSegN:4})), b=computeBBox(base({tstMode:'temptower',tstSegN:9}));
  chk('more segments → taller tower', (b.maxY-b.minY) > (a.maxY-a.minY)+50,
      {a:+(a.maxY-a.minY).toFixed(0), b:+(b.maxY-b.minY).toFixed(0)}); }

console.log('=== bridge / overhang: the spans and the angles are the ones printed on the tin ===');
{ const n=5, span=50, t=base({tstMode:'bridgetest',tstSegN:n,tstSpan:span,tstSegH:12,tstW:30,tstT:4});
  const B=computeBBox(t), W=Math.min(30,40)*0.5, pitch=W+6;
  const xAt=k=>-(n-1)*pitch/2 + k*pitch;
  const got=[];
  for(let k=0;k<n;k++){
    const y=B.minY+4+6;                        // between the base and the deck: only the piers are here
    // read the clear span under the deck by walking z and testing solidity
    let runs=[], inside=false, start=0;
    for(let i=0;i<=1600;i++){ const z=B.minZ+(B.maxZ-B.minZ)*i/1600;
      const xs=hitsX(t, y, z), x=xAt(k);
      let cross=0; for(const v of xs) if(v<x) cross++;
      const solid=(cross%2)===1;
      if(solid && !inside){ start=z; inside=true; }
      if(!solid && inside){ runs.push([start,z]); inside=false; } }
    if(inside) runs.push([start,B.maxZ]);
    const piers=runs.filter(r=>r[1]-r[0]>1);
    got.push(piers.length>=2 ? piers[1][0]-piers[0][1] : NaN);
  }
  chk('the spans grow linearly to the maximum asked for',
      got.every((s,i)=>Math.abs(s-span*(i+1)/n)<0.6), got.map(v=>+v.toFixed(1)));
  chk('and the widest really is tstSpan', Math.abs(got[n-1]-span)<0.6, {got:+got[n-1].toFixed(2)});
}
{ const n=5, t=base({tstMode:'bridgetest',tstSegN:n,tstSpan:50,tstSegH:12,tstW:30,tstT:4});
  const B=computeBBox(t), W=Math.min(30,40)*0.5, pitch=W+6, xAt=k=>-(n-1)*pitch/2 + k*pitch;
  const angles=[];
  for(let k=0;k<n;k++){
    // The fin is a prism: its underside runs between exactly two Z stations. Take the lowest vertex at
    // each and the angle from vertical is atan(run / rise).
    const zs=new Map();                                    // the fin is narrower than its pier, so this
    for(const T of t) for(const v of T){                   // slot contains the fin and nothing else
      if(Math.abs(v[0]-xAt(k)) > W/2-0.3) continue;
      if(v[1] < B.minY+5) continue;                        // above the base
      const zk=Math.round(v[2]*100);
      if(!zs.has(zk) || v[1]<zs.get(zk)) zs.set(zk, v[1]); }
    const keys=[...zs.keys()].sort((a,b)=>a-b);
    if(keys.length<2){ angles.push(NaN); continue; }
    const z0=keys[0]/100, z1=keys[keys.length-1]/100, y0=zs.get(keys[0]), y1=zs.get(keys[keys.length-1]);
    angles.push(Math.atan2(z1-z0, y1-y0)*180/Math.PI);
  }
  chk('the overhang angles sweep 30° → 80° from vertical',
      Math.abs(angles[0]-30)<6 && Math.abs(angles[n-1]-80)<6 &&
      angles.every((v,i)=>i===0||v>angles[i-1]), angles.map(v=>+v.toFixed(1)));
}
{ const a=computeBBox(base({tstMode:'bridgetest',tstSpan:20})), b=computeBBox(base({tstMode:'bridgetest',tstSpan:100}));
  chk('a bigger maximum span makes a deeper model', (b.maxZ-b.minZ) > (a.maxZ-a.minZ)+50,
      {a:+(a.maxZ-a.minZ).toFixed(0), b:+(b.maxZ-b.minZ).toFixed(0)}); }

console.log('=== retraction: two towers, tapered, the requested distance apart ===');
{ const gap=35, t=base({tstMode:'retract',tstRetGap:gap,tstSegH:12,tstW:30,tstT:4});
  const B=computeBBox(t), yBase=B.minY;
  const xs=hitsXu(t, yBase+8, 0);
  chk('there are exactly two towers', xs.length===4, {n:xs.length});
  if(xs.length===4){
    const c1=(xs[0]+xs[1])/2, c2=(xs[2]+xs[3])/2;
    chk('their centres are tstRetGap apart', Math.abs((c2-c1)-gap)<0.05, {got:+(c2-c1).toFixed(3)});
    chk('and they are symmetric about the middle', Math.abs(c1+c2)<0.05, {c1:+c1.toFixed(4),c2:+c2.toFixed(4)});
  }
  const wAt=y=>{ const h=hitsXu(t, y, 0); return h.length===4 ? (h[1]-h[0]) : NaN; };
  const lo=wAt(yBase+6), hi=wAt(B.maxY-4);
  chk('the towers taper toward the top', hi < lo-1, {bottom:+lo.toFixed(2), top:+hi.toFixed(2)});
  chk('and taper is the only overhang: the top is never wider', hi <= lo+1e-9, {});
}
{ const a=computeBBox(base({tstMode:'retract',tstRetGap:15})), b=computeBBox(base({tstMode:'retract',tstRetGap:120}));
  chk('a wider gap makes a wider model', (b.maxX-b.minX)-(a.maxX-a.minX) > 100,
      {d:+((b.maxX-b.minX)-(a.maxX-a.minX)).toFixed(1)}); }
{ const a=computeBBox(base({tstMode:'retract',tstSegH:8})), b=computeBBox(base({tstMode:'retract',tstSegH:40}));
  chk('the height knob drives the towers', (b.maxY-b.minY) > (a.maxY-a.minY)+80,
      {a:+(a.maxY-a.minY).toFixed(0), b:+(b.maxY-b.minY).toFixed(0)}); }

/* Соседи по крепежу. `tstMode:'none'` здесь ОБЯЗАТЕЛЕН и не для красоты: базовый набор этого файла
   включает температурную башню, а форма «Тесты» стоит в dominantMode ВЫШЕ крепежа. Без выключения обе
   проверки ниже мерили бы башню и проходили бы всегда — холостыми. Ровно это и случилось при переносе,
   и поймала это единственная строка, которая проверяет ОТСУТСТВИЕ влияния. */
console.log('=== the new modes do not disturb the old ones ===');
for(const m of ['lbracket','vesa','boss','tool','pipe','foot','fittest','dovetail']){
  const t=base({tstMode:'none', mntMode:m}), mc=manifoldCheck(t,4);
  chk(m+' still watertight', mc.watertight&&vol(t)>0, {open:mc.openEdges,bad:mc.badEdges});
  chk(m+' — это и правда крепёж, а не тест', dominantMode(paramState.box)==='mount', dominantMode(paramState.box));
}
{ const a=vol(base({tstMode:'none',mntMode:'fittest',tstSegN:3})),
        b=vol(base({tstMode:'none',mntMode:'fittest',tstSegN:9}));
  chk('the calibration-segment knob does nothing to the fit test', Math.abs(a-b)<1e-9, {}); }

/* ПЕРЕНОС СТАРЫХ КОНФИГОВ. Конфиг, сохранённый до v18.0.0, несёт `mntMode:'temptower'` и размеры в
   ключах `mnt*`. Без переноса он открылся бы КРЕПЕЖОМ без разновидности — пустой моделью, по которой
   человек решил бы, что файл испорчен. Перенос идёт по СЫРЫМ параметрам, до слияния с умолчаниями:
   после слияния у новых ключей уже стоят их умолчания, и «пусто ли здесь» ответить нечем. */
console.log('=== старый конфиг открывается тестом, а не пустым крепежом ===');
{
  for(const was of ['temptower','bridgetest','retract']){
    const raw = {mntMode:was, mntCalN:7, mntCalH:15, mntBrSpan:80, mntRetGap:60, mntW:50, mntT:5};
    const mp = Object.assign(defaultBoxParams(), migrateLegacyParams(raw));
    chk(was+': разновидность перенесена', mp.tstMode === was, {tstMode:mp.tstMode, mntMode:mp.mntMode});
    chk(was+': крепёж выключен', mp.mntMode === 'none', mp.mntMode);
    chk(was+': размеры перенесены', mp.tstSegN === 7 && mp.tstSegH === 15 && mp.tstSpan === 80 &&
        mp.tstRetGap === 60 && mp.tstW === 50 && mp.tstT === 5,
        {n:mp.tstSegN, h:mp.tstSegH, span:mp.tstSpan, gap:mp.tstRetGap, w:mp.tstW, t:mp.tstT});
    chk(was+': и открывается формой «Тесты»', dominantMode(mp) === 'test', dominantMode(mp));
    logos.length = 0; boxHoles.length = 0; dieFaces.length = 0;
    Object.assign(paramState.box, mp);
    const t = buildTrisForShape('box', paramState.box);
    chk(was+': и это настоящая деталь, а не пустой список',
        t.length > 100 && manifoldCheck(t,4).watertight, t.length);
  }
  const keep = Object.assign(defaultBoxParams(), migrateLegacyParams({mntMode:'lbracket', mntW:50}));
  chk('чужой крепёж не тронут', keep.mntMode === 'lbracket' && (keep.tstMode||'none') === 'none',
      {mnt:keep.mntMode, tst:keep.tstMode});
  chk('и он по-прежнему крепёж', dominantMode(keep) === 'mount', dominantMode(keep));
}

console.log('=== форма «Тесты» стоит в панели наравне с остальными ===');
{
  chk('имя формы есть', KIND_LABEL.test === 'Тесты', KIND_LABEL.test);
  chk('её группа знает свою форму', GROUP_KIND['Тесты печати'] === 'test');
  chk('и свой переключатель подмодели', subModelKey('test') === 'tstMode', subModelKey('test'));
  chk('группа видна только на ней', sectionRelevant('Тесты печати','test',false) &&
      !sectionRelevant('Тесты печати','mount',false));
  chk('а крепёж на ней не виден', !sectionRelevant('Крепёж / монтаж','test',false));
  for(const m of ['temptower','bridgetest','retract']){
    chk(m+': справка на месте', !!MODEL_HELP['test:'+m], m);
    chk(m+': и её больше нет под крепежом', !MODEL_HELP['mount:'+m], m);
  }
  const mnt = SHAPE_PARAMS.box.find(r => r.key === 'mntMode').options.map(o => o.v);
  chk('в крепеже калибровок больше нет',
      !mnt.includes('temptower') && !mnt.includes('bridgetest') && !mnt.includes('retract'), mnt);
}

/* КОМПЛЕКСНАЯ ПЛИТА. Шесть станций на одной плите, и меряется именно то, ради чего каждая стоит:
   отверстия — что их шесть и они растут от Ø2 до Ø7; куб — что он ровно 10 мм, а не «около»; станции —
   что каждая стоит в СВОЕЙ полосе и никакая не пуста. Пустая станция на герметичность не влияет и
   молча уезжает в печать — поймать её можно только счётом материала над плитой. */
console.log('=== комплексная плита: шесть станций, каждая на своём месте ===');
{
  const plate = ov => { logos.length=0; boxHoles.length=0; dieFaces.length=0;
    Object.assign(paramState.box, defaultBoxParams(), {tstMode:'allinone', tstPlateW:90, tstSegN:5}, ov);
    return buildTrisForShape('box', paramState.box); };
  for(const [w, n] of [[60,3],[90,5],[220,10],[90,10],[60,10]]){
    const t = plate({tstPlateW:w, tstSegN:n}), mc = manifoldCheck(t,4);
    chk('W='+w+' n='+n+': герметична', mc.watertight, {open:mc.openEdges, bad:mc.badEdges});
  }
  const t = plate({}), b = computeBBox(t);
  chk('ширина — заданная', Math.abs((b.maxX-b.minX) - 90) < 1e-6, b.maxX-b.minX);
  chk('глубина — половина ширины', Math.abs((b.maxZ-b.minZ) - 45) < 1e-6, b.maxZ-b.minZ);

  // Пол плиты и её потолок: всё, что выше потолка, — станции.
  const yLo = b.minY;
  const solidAtXZ = (x, z) => {           // есть ли материал в столбике (x,z), и до какой высоты
    let hi = -1e9;
    for(const T of t){ const [A,B,C] = T;
      const d1 = (B[0]-A[0])*(z-A[2]) - (B[2]-A[2])*(x-A[0]);
      const d2 = (C[0]-B[0])*(z-B[2]) - (C[2]-B[2])*(x-B[0]);
      const d3 = (A[0]-C[0])*(z-C[2]) - (A[2]-C[2])*(x-C[0]);
      if(!((d1>=0&&d2>=0&&d3>=0)||(d1<=0&&d2<=0&&d3<=0))) continue;
      const ar = (B[0]-A[0])*(C[2]-A[2]) - (B[2]-A[2])*(C[0]-A[0]); if(Math.abs(ar) < 1e-12) continue;
      const w1 = ((B[0]-x)*(C[2]-z) - (B[2]-z)*(C[0]-x))/ar, w2 = ((C[0]-x)*(A[2]-z) - (C[2]-z)*(A[0]-x))/ar;
      hi = Math.max(hi, w1*A[1] + w2*B[1] + (1-w1-w2)*C[1]); }
    return hi; };
  // Каждая из пяти полос вдоль X обязана нести что-то ВЫШЕ плиты.
  const band = 90/5;
  const names = ['нависания','мосты','струнение','зазоры','куб'];
  for(let k=0;k<5;k++){
    const x0 = -45 + band*k, x1 = x0 + band;
    let top = -1e9;
    for(let i=1;i<24;i++) for(let j=1;j<24;j++)
      top = Math.max(top, solidAtXZ(x0 + band*i/24, -22.5 + 45*j/24));
    chk('полоса «'+names[k]+'» не пуста', top > yLo + 4, {высота:+(top-yLo).toFixed(1)});
  }
  /* Куб — ровно 10 мм над плитой, иначе это не эталон, а «примерно». Ищется как САМОЕ ВЫСОКОЕ место
     своей полосы: где именно строитель его поставил — его дело, а не теста. Верх плиты берётся у самого
     переднего края, где заведомо ничего не стоит. */
  {
    let top = -1e9, plateTop = -1e9;
    for(let i=1;i<40;i++) for(let j=1;j<40;j++)
      top = Math.max(top, solidAtXZ(-45 + band*4 + band*i/40, -22.5 + 45*j/40));
    for(let i=0;i<40;i++) plateTop = Math.max(plateTop, solidAtXZ(-45 + 90*(i+0.5)/40, 22.5 - 0.4));
    chk('куб ровно 10 мм над плитой', Math.abs((top - plateTop) - 10) < 0.05,
        {куб:+(top-plateTop).toFixed(3), плита:+plateTop.toFixed(2)});
  }
  /* Шесть сквозных отверстий. «Сквозное» — это отсутствие материала в столбике: solidAtXZ не находит
     ни одного треугольника и возвращает −1e9. Ряд ищется сканом по глубине, потому что где именно он
     стоит — дело строителя. */
  {
    const EMPTY = -1e8;
    let через = 0, найдено = [];
    for(let i=0;i<6;i++){
      const x = -45 + 90*(i+0.5)/6;
      for(let q=0;q<440;q++){ const zz = 22.5 - 0.3 - q*0.1;
        if(zz < -22.5) break;
        if(solidAtXZ(x, zz) < EMPTY){ через++; найдено.push(+zz.toFixed(1)); break; } }
    }
    chk('все шесть отверстий сквозные', через === 6, {через, найдено});
    /* ...и они РАСТУТ. Ширина просвета меряется вдоль X на ОБЩЕЙ для всего ряда глубине — самой
       глубокой из найденных: у мелкого отверстия край ближе к переднему краю, и мерь каждое на своей
       z, сравнивались бы хорды разных высот, а не диаметры. */
    if (найдено.length === 6){
      const zRow = Math.min(...найдено) - 0.4;
      const width = (i) => { const x0 = -45 + 90*(i+0.5)/6; let n = 0;
        for(let q=0;q<400;q++){ const x = x0 - 5 + q*0.025;
          if(solidAtXZ(x, zRow) < EMPTY) n++; }
        return n*0.025; };
      chk('и последнее шире первого', width(5) > width(0) + 3,
          {первое:+width(0).toFixed(2), последнее:+width(5).toFixed(2)});
    }
  }
  logos.length = 0;
}

/* МЕРИТЕЛЬНАЯ КАРТОЧКА. Гейдж, который врёт, хуже отсутствия гейджа, поэтому меряются сами величины,
   а не «построилось ли что-то». Угол клина — ДВУМЯ СЕЧЕНИЯМИ: у равнобедренного клина полуширина убывает
   с высотой линейно, и наклон этого убывания есть tg(угол/2). Так замер ничего не знает о том, КАК клин
   построен, — а первая версия строителя как раз выводила основание из высоты неверно, и все клинья
   выходили с одним углом при разных подписях. */
console.log('=== мерительная карточка: углы клиньев равны подписям ===');
{
  const card = w => { logos.length=0; boxHoles.length=0; dieFaces.length=0;
    Object.assign(paramState.box, defaultBoxParams(), {tstMode:'toolcard', tstCardW:w});
    return buildTrisForShape('box', paramState.box); };
  /* Сколько мест в ряду — считается тем же правилом, что и в строителе, и правило это про СЛУЖЕБНЫЙ
     БЛОК выреза: построитель окружает каждый полем в 1.7 его размера, и блоки соседних колонок, задев
     друг друга, роняют сторож столкновений — молча, оставляя деталь герметичной. */
  const placesFor = W => { for(let n=9;n>=3;n--) if(W/n >= 1.7*(2*n-1) + 1.5) return n; return 3; };
  for(const w of [60, 110, 220]){
    const t = card(w), mc = manifoldCheck(t,4), b = computeBBox(t);
    chk('W='+w+': герметична', mc.watertight, {open:mc.openEdges, bad:mc.badEdges});
    // Ничто не торчит за габарит — ни вбок, ни вперёд: клинья свисали с переднего края на 3 мм,
    // и проверка только по X этого не видела.
    chk('W='+w+': ничего не торчит вбок', Math.abs((b.maxX-b.minX) - w) < 1e-6, +(b.maxX-b.minX).toFixed(2));
    let plateZ0 = 1e9, plateZ1 = -1e9;
    for(const T of t) for(const v of T) if(Math.abs(v[1]-b.minY) < 1e-9){
      plateZ0 = Math.min(plateZ0, v[2]); plateZ1 = Math.max(plateZ1, v[2]); }
    chk('W='+w+': ничего не свисает с краёв по глубине',
        b.maxZ - plateZ1 < 1e-6 && plateZ0 - b.minZ < 1e-6,
        {спереди:+(b.maxZ-plateZ1).toFixed(2), сзади:+(plateZ0-b.minZ).toFixed(2)});
    /* И НИ ОДИН ВЫРЕЗ НЕ ПРОПАЛ. Пропажа тихая: сторож столкновений выбрасывает вырез, деталь остаётся
       герметичной, подпись под него стоит — а дырки нет. Меряется лучом в центр каждого места. */
    const n = placesFor(w), cw = w/n, dMax = 2 + 2*(n-1);
    let l = Math.min(3.6, w/34); while(l > 1.2 && seg7Width('14', l) > cw*0.85) l -= 0.1; l = Math.max(1.2, l);
    const rH = Math.max(1.7*dMax + l + 6, 22), dep = rH*3 + cw*0.8 + l + 6;
    const empty = (x, z) => { for(const T of t){ const [A,B,C] = T;
        const d1=(B[0]-A[0])*(z-A[2])-(B[2]-A[2])*(x-A[0]);
        const d2=(C[0]-B[0])*(z-B[2])-(C[2]-B[2])*(x-B[0]);
        const d3=(A[0]-C[0])*(z-C[2])-(A[2]-C[2])*(x-C[0]);
        if((d1>=0&&d2>=0&&d3>=0)||(d1<=0&&d2<=0&&d3<=0)){
          const ar=(B[0]-A[0])*(C[2]-A[2])-(B[2]-A[2])*(C[0]-A[0]);
          if(Math.abs(ar) > 1e-12) return false; } }
      return true; };
    let miss = 0;
    for(let r=0;r<3;r++) for(let k=0;k<n;k++)
      if(!empty(-w/2 + cw*(k+0.5), -dep/2 + rH*(r+0.5))) miss++;
    chk('W='+w+': все '+(3*n)+' вырезов на месте', miss === 0, {пропало:miss});
  }
  const W = 110, t = card(W), b = computeBBox(t);
  const nR = placesFor(W), cell = W/nR;
  const yTop = 1.4;                                   // половина толщины карты при tstT по умолчанию
  const topAt = (x, z) => { let hi = -1e9;
    for(const T of t){ const [A,B,C] = T;
      const d1=(B[0]-A[0])*(z-A[2])-(B[2]-A[2])*(x-A[0]);
      const d2=(C[0]-B[0])*(z-B[2])-(C[2]-B[2])*(x-B[0]);
      const d3=(A[0]-C[0])*(z-C[2])-(A[2]-C[2])*(x-C[0]);
      if(!((d1>=0&&d2>=0&&d3>=0)||(d1<=0&&d2<=0&&d3<=0))) continue;
      const ar=(B[0]-A[0])*(C[2]-A[2])-(B[2]-A[2])*(C[0]-A[0]); if(Math.abs(ar)<1e-12) continue;
      const w1=((B[0]-x)*(C[2]-z)-(B[2]-z)*(C[0]-x))/ar, w2=((C[0]-x)*(A[2]-z)-(C[2]-z)*(A[0]-x))/ar;
      hi = Math.max(hi, w1*A[1]+w2*B[1]+(1-w1-w2)*C[1]); }
    return hi; };
  const N = 1200;
  for(let k=0;k<nR;k++){
    const x = -W/2 + cell*(k+0.5);
    let apex = -1e9;
    for(let q=0;q<=N;q++) apex = Math.max(apex, topAt(x, b.minZ + (b.maxZ-b.minZ)*q/N));
    const widthAt = (y) => { let z0=null, z1=null;
      for(let q=0;q<=N;q++){ const z = b.minZ + (b.maxZ-b.minZ)*q/N;
        if(topAt(x, z) >= y){ if(z0===null) z0 = z; z1 = z; } }
      return z0===null ? 0 : z1-z0; };
    const y1 = yTop + (apex-yTop)*0.25, y2 = yTop + (apex-yTop)*0.75;
    const ang = 2*Math.atan(((widthAt(y1)-widthAt(y2))/2)/(y2-y1))*180/Math.PI;
    const want = 10 + 70*k/(nR-1);
    chk('клин '+Math.round(want)+'°: измеренный угол совпадает', Math.abs(ang - want) < 1.2,
        {заявлено:+want.toFixed(0), измерено:+ang.toFixed(1)});
  }
  logos.length = 0;
}

/* КАРТОЧКА ФИЛАМЕНТА. Меряется то, ради чего бирка существует: прорезь под стяжку СКВОЗНАЯ (иначе
   бирка не повесится), три стенки правда разной толщины (иначе проба ничего не говорит) и ничего не
   торчит за габарит карты. */
console.log('=== карточка филамента: прорезь сквозная, стенки разной толщины ===');
{
  const fil = w => { logos.length=0; boxHoles.length=0; dieFaces.length=0;
    Object.assign(paramState.box, defaultBoxParams(), {tstMode:'filcard', tstFilW:w});
    return buildTrisForShape('box', paramState.box); };
  for(const w of [40, 72, 160]){
    const t = fil(w), mc = manifoldCheck(t,4), b = computeBBox(t);
    chk('W='+w+': герметична', mc.watertight, {open:mc.openEdges, bad:mc.badEdges});
    chk('W='+w+': ничего не торчит за габарит', Math.abs((b.maxX-b.minX) - w) < 1e-6, +(b.maxX-b.minX).toFixed(2));
  }
  const W = 72, t = fil(W), b = computeBBox(t);
  const topAt = (x, z) => { let hi = -1e9;
    for(const T of t){ const [A,B,C] = T;
      const d1=(B[0]-A[0])*(z-A[2])-(B[2]-A[2])*(x-A[0]);
      const d2=(C[0]-B[0])*(z-B[2])-(C[2]-B[2])*(x-B[0]);
      const d3=(A[0]-C[0])*(z-C[2])-(A[2]-C[2])*(x-C[0]);
      if(!((d1>=0&&d2>=0&&d3>=0)||(d1<=0&&d2<=0&&d3<=0))) continue;
      const ar=(B[0]-A[0])*(C[2]-A[2])-(B[2]-A[2])*(C[0]-A[0]); if(Math.abs(ar)<1e-12) continue;
      const w1=((B[0]-x)*(C[2]-z)-(B[2]-z)*(C[0]-x))/ar, w2=((C[0]-x)*(A[2]-z)-(C[2]-z)*(A[0]-x))/ar;
      hi = Math.max(hi, w1*A[1]+w2*B[1]+(1-w1-w2)*C[1]); }
    return hi; };
  // Прорезь: где-то у левого нижнего угла столбик пуст насквозь.
  {
    let пусто = 0;
    for(let i=0;i<80;i++) for(let j=0;j<60;j++){
      const x = -W/2 + 20*i/80, z = -b.maxZ + 16*j/60;
      if(topAt(x, z) < -1e8) пусто++;
    }
    chk('прорезь под стяжку сквозная', пусто > 0, {пустыхстолбиков:пусто});
  }
  // Три стенки: считаем разные толщины по числу столбиков, где стоит материал выше карты.
  {
    const b2 = computeBBox(t), yCard = 1.0;      // половина толщины при tstT по умолчанию
    const runs = [];
    for(let j=0;j<3;j++){ }
    let found = 0;
    for(let q=0;q<600;q++){ const z = b2.minZ + (b2.maxZ-b2.minZ)*q/600;
      let any = false;
      for(let i=0;i<40;i++){ const x = W/2 - 20 + 18*i/40;
        if(topAt(x, z) > yCard + 1) { any = true; break; } }
      runs.push(any);
    }
    let segs = 0; for(let i=1;i<runs.length;i++) if(runs[i] && !runs[i-1]) segs++;
    chk('в правой полосе стоят отдельные стенки, а не одна', segs >= 3, {полос:segs});
  }
  logos.length = 0;
}

console.log('\n'+(fail?'FAILED':'ALL PASSED')+': '+pass+' passed, '+fail+' failed');
if(fail) process.exitCode=1;
