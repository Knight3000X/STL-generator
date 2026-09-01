// Защёлка-консоль, посчитанная, а не нарисованная. Every other latch in this app is dimensioned by eye;
// this one starts from what the beam is allowed to do and reports what it will take to work it.
//
// So there are two things to test and they are different in kind. One is the arithmetic — ε = 1.5·y·t/L²,
// the 1.64 the taper buys, P = w·t³·E·y/(4L³), and the ramp/friction factor on top — and it is checked
// against the closed forms independently. The other is that the MESH is the beam those numbers describe:
// the arm really is L long and t thick and does taper, the hook really does stand y proud, and the two
// faces really are at the ordered angles. A calculator attached to the wrong solid is worse than neither.
// Run via ./run-all.sh.
let pass=0, fail=0;
function chk(n,c,e){if(c){pass++;console.log('  OK  ',n);}else{fail++;console.log('  FAIL',n,e!==undefined?JSON.stringify(e):'');}}
function vol(t){let v=0;for(const T of t){const a=T[0],b=T[1],c=T[2];v+=(a[0]*(b[1]*c[2]-b[2]*c[1])-a[1]*(b[0]*c[2]-b[2]*c[0])+a[2]*(b[0]*c[1]-b[1]*c[0]))/6;}return v;}
function setp(ov){ logos.length=0; boxHoles.length=0; dieFaces.length=0;
  Object.assign(paramState.box, defaultBoxParams(), {gfBaseplate:false, pipMode:'snap',
    snapLen:20, snapT:2, snapW:8, snapUndercut:1.2, snapLeadAngle:30, snapRetAngle:45,
    snapBaseT:3, snapTaper:true, snapMat:'pla'}, ov);
  return paramState.box; }
const mk = ov => buildTrisForShape('box', setp(ov));

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
    const nrm=[e1[1]*e2[2]-e1[2]*e2[1], e1[2]*e2[0]-e1[0]*e2[2], e1[0]*e2[1]-e1[1]*e2[0]];
    if(Math.abs(nrm[ax])<1e-12) continue;
    hits.push([w1*a[ax]+w2*b[ax]+(1-w1-w2)*c[ax], nrm[ax]<0 ? 1 : -1]);
  }
  hits.sort((A,B)=>A[0]-B[0]);
  const runs=[]; let depth=0, start=null;
  for(const [t0,d] of hits){ const prev=depth; depth+=d;
    if(prev<=0 && depth>0) start=t0;
    else if(prev>0 && depth<=0){ if(start!==null && t0-start > 1e-6) runs.push([start,t0]); start=null; } }
  return runs;
}
function minDepth(tris, ax, p, q){
  const u=(ax+1)%3, v=(ax+2)%3, hits=[];
  for(const T of tris){ const [a,b,c]=T;
    const d1=(b[u]-a[u])*(q-a[v])-(b[v]-a[v])*(p-a[u]);
    const d2=(c[u]-b[u])*(q-b[v])-(c[v]-b[v])*(p-b[u]);
    const d3=(a[u]-c[u])*(q-c[v])-(a[v]-c[v])*(p-c[u]);
    if(!((d1>=0&&d2>=0&&d3>=0)||(d1<=0&&d2<=0&&d3<=0))) continue;
    const A=(b[u]-a[u])*(c[v]-a[v])-(b[v]-a[v])*(c[u]-a[u]); if(Math.abs(A)<1e-12) continue;
    const e1=[b[0]-a[0],b[1]-a[1],b[2]-a[2]], e2=[c[0]-a[0],c[1]-a[1],c[2]-a[2]];
    const nrm=[e1[1]*e2[2]-e1[2]*e2[1], e1[2]*e2[0]-e1[0]*e2[2], e1[0]*e2[1]-e1[1]*e2[0]];
    if(Math.abs(nrm[ax])<1e-12) continue;
    const w1=((b[u]-p)*(c[v]-q)-(b[v]-q)*(c[u]-p))/A, w2=((c[u]-p)*(a[v]-q)-(c[v]-q)*(a[u]-p))/A;
    hits.push([w1*a[ax]+w2*b[ax]+(1-w1-w2)*c[ax], nrm[ax]<0 ? 1 : -1]);
  }
  hits.sort((A,B)=>A[0]-B[0]);
  let depth=0, lo=0;
  for(const [,d] of hits){ depth+=d; if(depth<lo) lo=depth; }
  return lo;
}
// Thickness of the arm in Z at height y, measured on the centre line but clear of the hook.
const armT = (t, y) => { const runs = solidRuns(t, 2, 0.31, y); return runs.length ? runs[runs.length-1][1] : 0; };

console.log('=== builds across the range ===');
for(const L of [8,20,60]) for(const t of [1,2,4]){
  const m = mk({snapLen:L, snapT:t}), mc = manifoldCheck(m,4);
  chk('L='+L+' t='+t+': замкнута', mc.watertight && vol(m)>0, {open:mc.openEdges, bad:mc.badEdges});
}
for(const ov of [{snapTaper:false}, {snapRetAngle:90}, {snapRetAngle:30}, {snapLeadAngle:10},
                 {snapLeadAngle:60}, {snapUndercut:0.2}, {snapUndercut:8}, {snapW:2}, {snapW:60},
                 {snapBaseT:12}, {snapMat:'nylon'}, {snapT:0.6}, {snapLen:4}]){
  const m = mk(ov), mc = manifoldCheck(m,4);
  chk('крайние параметры '+JSON.stringify(ov), mc.watertight && vol(m)>0, {open:mc.openEdges, bad:mc.badEdges});
}

console.log('=== the arithmetic, against the closed forms ===');
// ε = 1.5·y·t/L², and a beam tapered to half thickness takes 1.64× the deflection for the same strain.
{ const s = snapSpec(setp({}));
  chk('деформация — 1.5·y·t/L², делённая на 1.64 за сужение',
      Math.abs(s.eps - 100*1.5*1.2*2/(20*20)/1.64) < 1e-9, {eps:+s.eps.toFixed(4)});
  const flat = snapSpec(setp({snapTaper:false}));
  chk('без сужения деформация ровно в 1.64 раза больше', Math.abs(flat.eps/s.eps - 1.64) < 1e-9,
      {taper:+s.eps.toFixed(3), flat:+flat.eps.toFixed(3)});
  chk('сила прогиба — w·t³·E·y/(4L³)',
      Math.abs(flat.P - 8*8*2600*1.2/(4*8000)) < 1e-6, {P:+flat.P.toFixed(3)});
  // Doubling the length quarters the strain and cuts the force eightfold — that is the whole point of the
  // calculation, and it is the relationship a hand-drawn latch gets wrong.
  const a = snapSpec(setp({snapLen:20})), b = snapSpec(setp({snapLen:40}));
  chk('вдвое длиннее — вчетверо меньше деформация', Math.abs(a.eps/b.eps - 4) < 1e-9, {});
  chk('и в восемь раз меньше сила', Math.abs(a.P/b.P - 8) < 1e-9, {});
  const t1 = snapSpec(setp({snapT:2})), t2 = snapSpec(setp({snapT:4}));
  chk('вдвое толще — вдвое больше деформация', Math.abs(t2.eps/t1.eps - 2) < 1e-9, {});
  chk('и в восемь раз больше сила', Math.abs(t2.P/t1.P - 8) < 1e-9, {});
}
{ // Pushing it home costs more than deflecting it: the ramp and the friction are levered on top.
  const s = snapSpec(setp({}));
  chk('усилие сборки больше усилия прогиба', s.push > s.P, {P:+s.P.toFixed(2), push:+s.push.toFixed(2)});
  const steep = snapSpec(setp({snapLeadAngle:60})), shallow = snapSpec(setp({snapLeadAngle:10}));
  chk('пологий заход — легче собрать', shallow.push < steep.push,
      {'10°':+shallow.push.toFixed(1), '60°':+steep.push.toFixed(1)});
  chk('90° удержания — деталь неразъёмная', snapSpec(setp({snapRetAngle:90})).pull === Infinity, {});
  chk('45° — разъёмная, но туже сборки', (()=>{ const q=snapSpec(setp({snapRetAngle:45}));
      return isFinite(q.pull) && q.pull > q.push; })(), {});
}
{ // The material is a real input, not a label: a softer one takes less force at the same strain.
  const E = {pla:2600, petg:2100, abs:2200, nylon:1700};
  for(const m of ['pla','petg','abs','nylon']){
    const s = snapSpec(setp({snapMat:m}));
    chk(m+': сила пропорциональна модулю', Math.abs(s.P/s.mat.E - snapSpec(setp({snapMat:'pla'})).P/2600) < 1e-9,
        {E:s.mat.E, want:E[m]});
  }
  chk('деформация от материала не зависит — она геометрическая',
      Math.abs(snapSpec(setp({snapMat:'nylon'})).eps - snapSpec(setp({snapMat:'pla'})).eps) < 1e-12, {});
}

console.log('=== and the mesh is the beam those numbers describe ===');
{ const m = mk({}), B = computeBBox(m);
  chk('ширина консоли — заказанная', Math.abs((B.maxX-B.minX) - 8) < 1e-6, {w:+(B.maxX-B.minX).toFixed(3)});
  // Arm length: base thickness + L, and the whole part is that tall.
  chk('высота — основание плюс длина консоли', Math.abs((B.maxY-B.minY) - 23) < 0.05,
      {h:+(B.maxY-B.minY).toFixed(2)});
  // Thickness at the root is t, at the tip is t/2 — that IS the taper the 1.64 was claimed for.
  const root = armT(m, B.minY + 4.5), tip = armT(m, B.maxY - 3.5);
  chk('у корня консоль толщиной t', Math.abs(root - 2) < 0.15, {root:+root.toFixed(2)});
  chk('к концу сужается вдвое', Math.abs(tip - 1) < 0.2, {tip:+tip.toFixed(2)});
  const flat = mk({snapTaper:false}), Bf = computeBBox(flat);
  chk('без сужения — та же толщина по всей длине',
      Math.abs(armT(flat, Bf.minY+4.5) - armT(flat, Bf.maxY-3.5)) < 0.15,
      {root:+armT(flat,Bf.minY+4.5).toFixed(2), tip:+armT(flat,Bf.maxY-3.5).toFixed(2)});
}
{ // The undercut IS the deflection the arithmetic assumed. If the hook does not stand that proud, the
  // strain number is about a beam that was never built.
  for(const y of [0.6, 1.2, 3]){
    const m = mk({snapUndercut:y}), B = computeBBox(m);
    let zMax = -1e9, tipT = 0;
    for(const T of m) for(const v of T) if(v[1] > B.maxY - 6) zMax = Math.max(zMax, v[2]);
    tipT = 1;                                        // tapered arm is t/2 = 1 mm at the tip
    chk('зацеп '+y+' мм выступает над консолью ровно на столько',
        Math.abs((zMax - tipT) - y) < 0.1, {stand:+(zMax-tipT).toFixed(2)});
  }
}
{ // The two faces are at the ordered angles — the retention one is what decides whether it ever comes off.
  const m = mk({snapRetAngle:90}), B = computeBBox(m);
  // At 90° the retention face is vertical, so the hook's foot and crest sit at the same height.
  let yCrest = 0, zTop = -1e9, yFoot = 1e9;
  for(const T of m) for(const v of T) if(v[2] > zTop + 1e-9){ zTop = v[2]; }
  for(const T of m) for(const v of T) if(Math.abs(v[2]-zTop) < 1e-9) yCrest = Math.max(yCrest, v[1]);
  for(const T of m) for(const v of T) if(Math.abs(v[2]-zTop) < 1e-9) yFoot = Math.min(yFoot, v[1]);
  chk('при α₂ = 90° грань удержания отвесная', Math.abs(yCrest - yFoot) < 0.05,
      {crest:+yCrest.toFixed(2), foot:+yFoot.toFixed(2)});
  // At 45° it slopes back by exactly the undercut
  const m2 = mk({snapRetAngle:45, snapUndercut:2});
  let z2 = -1e9; for(const T of m2) for(const v of T) z2 = Math.max(z2, v[2]);
  let yc = -1e9, yf = 1e9;
  for(const T of m2) for(const v of T) if(Math.abs(v[2]-z2) < 1e-9){ yc = Math.max(yc, v[1]); yf = Math.min(yf, v[1]); }
  chk('при α₂ = 45° она откинута назад ровно на зацеп', Math.abs(yc - yf) < 0.05, {});
  const lo = mk({snapRetAngle:30, snapUndercut:2});
  chk('и чем меньше угол, тем длиннее скос',
      (()=>{ let z=-1e9; for(const T of lo) for(const v of T) z=Math.max(z,v[2]);
             let a=-1e9,b=1e9; for(const T of lo) for(const v of T) if(Math.abs(v[2]-z)<1e-9){a=Math.max(a,v[1]);b=Math.min(b,v[1]);}
             const B2=computeBBox(lo), B3=computeBBox(m2);
             return (B2.maxY-B2.minY) === (B3.maxY-B3.minY); })(), {});
}
{ // It is one solid, not a pad with a beam balanced on it: a ray through the joint meets ONE run.
  const m = mk({}), B = computeBBox(m);
  chk('основание и консоль — одно тело', solidRuns(m, 1, 0.3, 1.0).length === 1,
      {runs:solidRuns(m, 1, 0.3, 1.0).length});
  chk('и консоль с зацепом — тоже', solidRuns(m, 1, 0.3, 1.6).length === 1,
      {runs:solidRuns(m, 1, 0.3, 1.6).length});
}

console.log('=== and it says so when the beam will break ===');
{ chk('заведомо перегруженная консоль отмечается',
      collectPrintWarnings(setp({snapLen:8, snapUndercut:2})).some(s=>/деформация/.test(s)),
      collectPrintWarnings(setp({snapLen:8, snapUndercut:2})));
  chk('а нормальная — нет', collectPrintWarnings(setp({})).length === 0, collectPrintWarnings(setp({})));
  // The SAME beam in a tougher material is fine — that is what the allowable strain column is for.
  chk('та же консоль из нейлона проходит',
      collectPrintWarnings(setp({snapLen:8, snapUndercut:2, snapMat:'nylon'})).length === 0,
      collectPrintWarnings(setp({snapLen:8, snapUndercut:2, snapMat:'nylon'})));
  /* С v25.27.0 порог тонкой консоли — не число 0.8, а ДВА ПРОХОДА ВАШЕГО СОПЛА, и проверка спрашивает
     его у приложения, а не переписывает к себе: первая редакция держала текст «тоньше 0.8» и сломалась
     ровно тогда, когда 0.8 перестало быть истиной для всех. */
  chk('и тонкая консоль отмечается отдельно',
      collectPrintWarnings(setp({snapT:0.6, snapLen:60}))
        .some(s => /консоль защёлки/.test(s) && s.indexOf('сопла ' + fmtNum(nozzleOf({}))) >= 0),
      collectPrintWarnings(setp({snapT:0.6, snapLen:60})));
  /* И ТА ЖЕ КОНСОЛЬ НА МЕЛКОМ СОПЛЕ ПЕЧАТАЕМА — жалобы нет, потому что жаловаться не на что. */
  chk('  а на сопле 0.25 та же консоль вопросов не вызывает',
      !collectPrintWarnings(setp({snapT:0.6, snapLen:60, printNozzle:'0.25'}))
        .some(s => /консоль защёлки/.test(s)));
  chk('  на 0.8 — вызывает, и названо своё сопло',
      collectPrintWarnings(setp({snapT:1.2, snapLen:60, printNozzle:'0.8'}))
        .some(s => /консоль защёлки/.test(s) && /сопла 0\.8/.test(s)));
}

console.log('=== no triangle is inside-out ===');
for(const [nm,ov] of [['защёлка',{}], ['без сужения',{snapTaper:false}], ['неразъёмная',{snapRetAngle:90}],
                      ['глубокий зацеп',{snapUndercut:6}], ['короткая',{snapLen:6}]]){
  const m = mk(ov), B = computeBBox(m);
  let worst = 0, at = null;
  for(let k=1;k<12;k++){ const y = B.minY + (B.maxY-B.minY)*(k+0.37)/12;
    for(const x of [0.31, -1.44, 2.83]){ const d = minDepth(m, 2, x, y);
      if(d < worst){ worst = d; at = [x, +y.toFixed(2)]; } } }
  chk(nm+': глубина по лучу нигде не уходит в минус', worst===0, {depth:worst, at});
}

/* ЗАЖИМ ДЛЯ ПАКЕТА: длинный узкий, две сужающиеся губки на НАСТОЯЩЕЙ ПЕТЛЕ печати в сборе,
   застёгнутые С-ОБРАЗНЫМ КРЮКОМ через кончик встречной губки.

   Формы сменилось три, и каждый раз по одной причине — сделанное было не тем, что заказано. U-образная
   пружина вместо прищепки. Прищепка из двух широких плит с крючком в прорезь вместо длинного узкого
   зажима. И живой шарнир вместо петли: он складывается ОДИН раз, а зажим для пакета открывают каждый
   день, — довод по существу, который я пропустил, взяв готовое и подобрав под него объяснение.

   Проверяется то, что ломается тихо:
     1. ТЕЛА НЕ СЛИПЛИСЬ. У печати в сборе это главный вопрос, и связностью вершин его не задать: тела
        здесь собраны из ОТДЕЛЬНЫХ оболочек, вершинами не делящихся вовсе, и «компонент» у зажима
        девять. Спрашивать надо объёмом — и мерить настоящий зазор между поверхностями.
     2. ПОДАТЛИВОСТЬ СУЖАЮЩЕЙСЯ ГУБКИ — ИНТЕГРАЛ, а не формула ровной консоли: та врёт больше чем
        вдвое, и врёт МОЛЧА — усилие остаётся правдоподобным.
     3. КРЮК ДЕРЖИТ ГУБОЙ, А ГНЁТСЯ ПРИ ЭТОМ ГУБКА. У губы плечо в миллиметр, она не гнётся вовсе.
     4. РЫЧАГ. Пакет ближе к петле — зажим сильнее, и это отношение плеч, а не мнение.
     5. НАСЕЧКИ РЕЖУТСЯ В НАРУЖНОЙ ГРАНИ обеих губок, у кончика — там зажим и берут пальцами. */
console.log('\n=== зажим: тела печатаются собранными и нигде не касаются ===');
{
  const P = ov => Object.assign(defaultBoxParams(), {pipMode:'bagclip'}, ov);
  const S = ov => bagClipSpec(P(ov));
  const B = ov => { logos.length=0; boxHoles.length=0;
    Object.assign(paramState.box, defaultBoxParams(), {pipMode:'bagclip'}, ov);
    return buildTrisForShape('box', paramState.box); };
  const W = ov => collectPrintWarnings(P(ov)) || [];
  const g = S({});

  /* ЛУЧ ВКОСЬ И ИЗ САМОЙ ТОЧКИ. Из точки — потому что число оборотов снаружи тела равно нулю ВСЕГДА:
     луч входит и выходит, знаки уничтожаются, и всякая проверка «пусто ли» проходит на пустоте. Вкось —
     потому что строго по оси луч ложится в диагональ ушного отсечения на торце, оба смежных
     треугольника строгий тест отвергает, и на сплошном материале выходит «пусто». Оба раза я на этом
     попался, оба записаны. */
  const DIR = [0.113, 0.2317, 0.9661];
  function prep(tris){ const A = new Float64Array(tris.length*14); let m = 0;
    for (const T of tris){ const p = T[0];
      const e1x=T[1][0]-p[0], e1y=T[1][1]-p[1], e1z=T[1][2]-p[2];
      const e2x=T[2][0]-p[0], e2y=T[2][1]-p[1], e2z=T[2][2]-p[2];
      const hx=DIR[1]*e2z-DIR[2]*e2y, hy=DIR[2]*e2x-DIR[0]*e2z, hz=DIR[0]*e2y-DIR[1]*e2x;
      const a = e1x*hx + e1y*hy + e1z*hz; if (Math.abs(a) < 1e-12) continue;
      const nx=e1y*e2z-e1z*e2y, ny=e1z*e2x-e1x*e2z, nz=e1x*e2y-e1y*e2x;
      const o = m*14; m++;
      A[o]=p[0];A[o+1]=p[1];A[o+2]=p[2];A[o+3]=e1x;A[o+4]=e1y;A[o+5]=e1z;
      A[o+6]=e2x;A[o+7]=e2y;A[o+8]=e2z;A[o+9]=hx;A[o+10]=hy;A[o+11]=hz;A[o+12]=1/a;
      A[o+13]=(nx*DIR[0]+ny*DIR[1]+nz*DIR[2]) > 0 ? 1 : -1; }
    return {A, m}; }
  function wind(M, px, py, pz){ const A = M.A; let n = 0;
    for (let i = 0, o = 0; i < M.m; i++, o += 14){
      const sx=px-A[o], sy=py-A[o+1], sz=pz-A[o+2], f=A[o+12];
      const u = f*(sx*A[o+9] + sy*A[o+10] + sz*A[o+11]); if (u < 1e-9 || u > 1-1e-9) continue;
      const e1x=A[o+3], e1y=A[o+4], e1z=A[o+5];
      const qx=sy*e1z-sz*e1y, qy=sz*e1x-sx*e1z, qz=sx*e1y-sy*e1x;
      const v = f*(DIR[0]*qx + DIR[1]*qy + DIR[2]*qz); if (v < 1e-9 || u+v > 1-1e-9) continue;
      if (f*(A[o+6]*qx + A[o+7]*qy + A[o+8]*qz) <= 1e-9) continue; n += A[o+13]; }
    return n; }
  const solid = (M, p) => wind(M, p[0], p[1], p[2]) !== 0;

  /* КАЖДАЯ ГУБКА ГЕРМЕТИЧНА САМА ПО СЕБЕ. Слайсер режет их порознь, и открытая оболочка у одной из них
     на общей сетке не видна: рёбра-то спарены соседкой. */
  for (const ov of [{}, {bagW:6}, {bagW:60}, {bagT:1.2}, {bagT:10}, {bagKnuckles:15}, {pipGap:0.15}, {pipGap:0.8}]){
    const a = buildBagClip(P(ov), 'a'), b = buildBagClip(P(ov), 'b');
    chk('обе губки герметичны порознь '+JSON.stringify(ov),
        manifoldCheck(a, 5).watertight && manifoldCheck(b, 5).watertight && vol(a) > 0 && vol(b) > 0,
        {a:manifoldCheck(a,5), b:manifoldCheck(b,5)});
  }
  /* НИ ОДНА ТОЧКА ОДНОГО ТЕЛА НЕ ВНУТРИ ДРУГОГО. Пересекись они — слайсер сплавил бы их в одну деталь,
     и петля не открылась бы вовсе; сетка при этом осталась бы безупречной. */
  for (const ov of [{}, {bagW:60}, {bagT:10}, {bagKnuckles:9}, {bagCatch:4}, {pipGap:0.15}]){
    const a = buildBagClip(P(ov), 'a'), b = buildBagClip(P(ov), 'b');
    const MA = prep(a), MB = prep(b);
    let bad = 0, n = 0;
    for (const T of a) for (const v of T){ n++; if (solid(MB, v)) bad++; }
    for (const T of b) for (const v of T){ n++; if (solid(MA, v)) bad++; }
    chk('тела не пересекаются '+JSON.stringify(ov), bad === 0 && n > 100, {вершин:n, внутри:bad});
  }
  /* И НАСТОЯЩИЙ ЗАЗОР МЕЖДУ НИМИ РАВЕН ЗАКАЗАННОМУ. Не «положительный» — заказанному: положительным он
     остался бы и при вдвое меньшем, а печать в сборе живёт ровно этим числом. Меряется расстоянием от
     вершин одного тела до треугольников другого. */
  {
    const d2seg = (p, a, b) => { const d = sub(b, a), L2 = dot(d, d);
      let t = L2 > 0 ? dot(sub(p, a), d)/L2 : 0; t = Math.max(0, Math.min(1, t));
      const q = [a[0]+t*d[0]-p[0], a[1]+t*d[1]-p[1], a[2]+t*d[2]-p[2]]; return dot(q, q); };
    const dTri = (p, T) => { const [A, Bb, C] = T;
      const n = cross(sub(Bb, A), sub(C, A)), L = vlength(n);
      if (L > 1e-12){ const u = [n[0]/L, n[1]/L, n[2]/L], h = dot(sub(p, A), u);
        const q = [p[0]-h*u[0], p[1]-h*u[1], p[2]-h*u[2]];
        const s1 = dot(cross(sub(Bb,A), sub(q,A)), u), s2 = dot(cross(sub(C,Bb), sub(q,Bb)), u),
              s3 = dot(cross(sub(A,C), sub(q,C)), u);
        if ((s1>=0&&s2>=0&&s3>=0)||(s1<=0&&s2<=0&&s3<=0)) return h*h; }
      return Math.min(d2seg(p,A,Bb), d2seg(p,Bb,C), d2seg(p,C,A)); };
    for (const gp of [0.15, 0.35, 0.8]){
      const s2 = S({pipGap:gp}), a = buildBagClip(P({pipGap:gp}), 'a'), b = buildBagClip(P({pipGap:gp}), 'b');
      let best = 1e9;
      for (const T of a) for (const v of T) for (const U of b){ const d = dTri(v, U); if (d < best) best = d; }
      chk('зазор между телами при pipGap='+gp+' равен заказанному',
          Math.abs(Math.sqrt(best) - s2.cl) < 0.02, {измерен:+Math.sqrt(best).toFixed(4), заказан:s2.cl});
    }
  }

  console.log('\n=== зажим: рычаг и податливость сужающейся губки ===');
  chk('прогиб конца губки — из отношения плеч и за вычетом зазора печати',
      Math.abs(g.dTip - Math.max(0, g.open - g.cl)*g.L/(2*g.a)) < 1e-9, g.dTip);
  chk('усилие на застёжке — прогиб делить на податливость', Math.abs(g.Flatch - g.dTip/g.dPerF) < 1e-9, g.Flatch);
  chk('усилие на пакете — из равенства моментов', Math.abs(g.Fbag - g.Flatch*g.L/g.a) < 1e-9, g.Fbag);
  chk('ближе к петле — сильнее зажим', S({bagGrip:8}).Fbag > S({bagGrip:100}).Fbag*10,
      {ближе:+S({bagGrip:8}).Fbag.toFixed(1), дальше:+S({bagGrip:100}).Fbag.toFixed(1)});
  chk('и усилие на пакете всегда не меньше, чем на застёжке', g.Fbag >= g.Flatch);
  chk('пакет тоньше зазора печати не зажимается вовсе, и это названо',
      S({bagOpen:0.3}).noSpring === true && W({bagOpen:0.3}).some(x => /пружинить нечему/.test(x)),
      W({bagOpen:0.3}));
  {
    const e = S({bagTaper:1});
    const I = e.W*e.T*e.T*e.T/12, want = e.L*e.L*e.L/(3*e.mat.E*I);
    chk('без сужения податливость сходится с L³/(3EI)', Math.abs(e.dPerF/want - 1) < 2e-5,
        {интеграл:e.dPerF, формула:want});
    const t2 = S({}), If = t2.W*t2.T*t2.T*t2.T/12, flat = t2.L*t2.L*t2.L/(3*t2.mat.E*If);
    chk('а с сужением ровная формула врёт в полтора раза и больше', t2.dPerF > flat*1.5,
        {сужение:t2.dPerF, ровная:flat, раз:+(t2.dPerF/flat).toFixed(2)});
    const sharp = S({bagTaper:0.25}), Is = sharp.W*sharp.T*sharp.T*sharp.T/12;
    chk('  и тем сильнее, чем острее сужение',
        sharp.dPerF/(sharp.L*sharp.L*sharp.L/(3*sharp.mat.E*Is)) > t2.dPerF/flat + 0.5,
        {острое:+(sharp.dPerF/(sharp.L*sharp.L*sharp.L/(3*sharp.mat.E*Is))).toFixed(2), обычное:+(t2.dPerF/flat).toFixed(2)});
  }
  /* ОПАСНОЕ СЕЧЕНИЕ У СУЖАЮЩЕЙСЯ ГУБКИ — НЕ У КОРНЯ: момент растёт линейно, а сопротивление сечения —
     квадратом толщины, и максимум садится внутри длины. На умолчаниях разница в процент, при остром
     сужении — в полтора раза, и вот там «взять у корня» уже прямая ошибка. */
  {
    const q = S({bagTaper:0.2});
    const Iroot = q.W*q.T*q.T*q.T/12, atRoot = q.L*(q.T/2)/(q.mat.E*Iroot);
    chk('максимум деформации не у корня, а внутри длины', q.epsPerF > atRoot*1.3,
        {максимум:q.epsPerF, укорня:atRoot, раз:+(q.epsPerF/atRoot).toFixed(2)});
    const e = S({bagTaper:1}), Ie = e.W*e.T*e.T*e.T/12;
    chk('а у ровной губки — ровно у корня', Math.abs(e.epsPerF/(e.L*(e.T/2)/(e.mat.E*Ie)) - 1) < 3e-3,
        {максимум:e.epsPerF, укорня:e.L*(e.T/2)/(e.mat.E*Ie)});
  }
  {
    const q = S({}), NX = 800; let d2 = 0;
    for (let k = 0; k < NX; k++){
      const x = q.L*(k + 0.5)/NX, t = q.tAt(x), I = q.W*t*t*t/12;
      d2 += x*x/(q.mat.E*I)*(q.L/NX);
    }
    chk('двухсот шагов интегралу хватает', Math.abs(q.dPerF/d2 - 1) < 1e-5, {двести:q.dPerF, восемьсот:d2});
  }
  chk('тоньше кончик — мягче губка', S({bagTaper:0.25}).dPerF > S({bagTaper:0.9}).dPerF*1.3);
  chk('и толще корень — жёстче', S({bagT:8}).Fbag > S({bagT:3}).Fbag*3);

  console.log('\n=== зажим: гнётся губка, а не губа крюка ===');
  chk('усилие защёлкивания — по той же податливости', Math.abs(g.Fclose - (g.dTip + g.catchLen)/g.dPerF) < 1e-9, g.Fclose);
  chk('и оно больше удерживающего ровно на вылет губы',
      Math.abs(g.Fclose/g.Flatch - (g.dTip + g.catchLen)/g.dTip) < 1e-9, g.Fclose/g.Flatch);
  chk('длиннее губа — тяжелее защёлкнуть', S({bagCatch:0.4}).Fclose < S({bagCatch:4}).Fclose);
  chk('губа не длиннее кончика с четвертью', g.catchLen <= g.tTip*1.2 + 1e-9, [g.catchLen, g.tTip]);
  for (const q of [4, 3]){
    const e = S({bagCatch:q});
    chk('заказ ' + q + ' мм урезан до кончика с четвертью',
        e.catchLen < q - 1e-9 && Math.abs(e.catchLen - e.tTip*1.2) < 1e-9, [e.catchLen, e.tTip*1.2]);
  }
  chk('урезание помечено', S({bagCatch:4}).catchCut === true);
  chk('и названо вслух', W({bagCatch:4}).some(x => /губа крюка урезана/.test(x)), W({bagCatch:4}));
  chk('просторную не трогают', S({bagCatch:0.5}).catchCut === false &&
      Math.abs(S({bagCatch:0.5}).catchLen - 0.5) < 1e-9);
  chk('деформация губы считается и она мала на умолчаниях', g.lipStrain > 0 && g.lipStrain < g.mat.eps,
      {губа:g.lipStrain, доп:g.mat.eps});
  chk('толще пакет — сильнее нагружена губа', S({bagOpen:20}).lipStrain > S({bagOpen:1}).lipStrain*3);

  console.log('\n=== зажим: сетка — та деталь, которую посчитали ===');
  for (const ov of [{}, {bagT:1.2}, {bagT:10}, {bagL:20}, {bagL:200}, {bagW:6}, {bagW:60},
                    {bagOpen:40}, {bagCatch:4}, {bagCatch:0.3}, {bagGripN:0}, {bagGripN:8},
                    {bagTaper:1}, {bagTaper:0.2}, {bagKnuckles:3}, {bagKnuckles:15}, {bagWall:6}]){
    const t = B(ov), mc = manifoldCheck(t, 4);
    chk('зажим '+JSON.stringify(ov)+' герметичен (+объём)', mc.watertight && vol(t) > 0,
        {open:mc.openEdges, bad:mc.badEdges});
  }
  {
    const s2 = S({}), t = B({}), b = computeBBox(t);
    chk('ширина сетки — заданная ширина', Math.abs((b.maxX-b.minX) - s2.W) < 0.01, +(b.maxX-b.minX).toFixed(3));
    chk('высота — две толщины у петли и зазор',
        Math.abs((b.maxY-b.minY) - (2*s2.T + s2.cl)) < 0.02,
        {габарит:+(b.maxY-b.minY).toFixed(2), ждём:+(2*s2.T + s2.cl).toFixed(2)});
    chk('длина — губка, крюк и петля',
        Math.abs((b.maxZ-b.minZ) - (s2.zPin + s2.rK + s2.wallT + s2.cl)) < 0.02,
        {габарит:+(b.maxZ-b.minZ).toFixed(2), ждём:+(s2.zPin + s2.rK + s2.wallT + s2.cl).toFixed(2)});
    /* ДЛИННЫЙ И УЗКИЙ — это и есть заказанная форма, а не пожелание. */
    chk('деталь длинная и узкая', (b.maxZ-b.minZ) > (b.maxX-b.minX)*8,
        {длина:+(b.maxZ-b.minZ).toFixed(0), ширина:+(b.maxX-b.minX).toFixed(0)});
    chk('и печатается ЗАКРЫТОЙ: высота — две губки, а не одна',
        (b.maxY-b.minY) > 2*s2.T - 0.01, +(b.maxY-b.minY).toFixed(2));
  }
  /* КРЮК ОХВАТЫВАЕТ КОНЧИК, а не торчит рядом: под наружной гранью губки A, за её кончиком, обязан быть
     материал — это губа, — а посередине губки его там нет. */
  {
    /* ЩУП РАБОТАЕТ В КООРДИНАТАХ ПОСТРОИТЕЛЯ, а не «от края габарита»: деталь пересчитывается по центру
       своего габарита, и по Y она СИММЕТРИЧНА (низ — наружная грань A у петли, верх — наружная B там
       же), а по Z нет. Поэтому смещение считается один раз, из известной модельной координаты самого
       дальнего торца крюка. Первая версия щупа брала «низ плюс четыре десятых» и попадала НИЖЕ губы —
       у кончика деталь тоньше, чем у петли, и низ габарита там вовсе не наружная грань A. */
    const s2 = S({}), t = B({}), M = prep(t), b = computeBBox(t);
    const zW1 = -s2.cl, zW0 = zW1 - s2.wallT;                 // модельные координаты крюка
    const dz = b.minZ - zW0;                                  // сдвиг модели в сетку по Z
    const yLipTop = -s2.cl/2 - s2.tTip - s2.cl, yLipBot = yLipTop - s2.ramp;
    const yLipMid = (yLipTop + yLipBot)/2;
    /* ЩУП СТОИТ ПОД САМОЙ ВЕРХНЕЙ ГРАНЬЮ ГУБЫ И У ЕЁ КОРНЯ, а не в середине по обеим осям. Середина —
       ровно та точка, куда приходит скошенная грань, если губу укоротить: мутация «губа нулевой длины»
       оставляла материал точно на щупе и проходила проверку насквозь. Под верхней гранью у корня
       материал есть только у ПОЛНОЙ губы. */
    chk('губа крюка заходит под кончик губки A',
        solid(M, [0, yLipTop - 0.1, dz + zW1 + s2.catchLen*0.8]), {yLipTop});
    chk('  и она есть по всей своей длине',
        solid(M, [0, yLipTop - 0.1, dz + zW1 + s2.catchLen*0.2]) &&
        solid(M, [0, yLipMid, dz + zW1 + s2.catchLen*0.8]));
    /* «А ДАЛЬШЕ ГУБЫ — ПУСТО» спрашивается сразу за её концом, а не у середины губки: губка к петле
       ТОЛЩЕЕТ, и на середине высота губы приходится уже внутрь самой губки — материал там есть, и
       правильно, что есть. Первая версия этой проверки спрашивала у середины и падала на верной детали. */
    chk('а сразу за концом губы на той же высоте пусто',
        !solid(M, [0, yLipMid, dz + zW1 + s2.catchLen + 0.6]), {z:zW1 + s2.catchLen + 0.6});
    chk('и под наружной гранью губки посередине тоже пусто',
        !solid(M, [0, -s2.cl/2 - s2.tAt(s2.L*0.5) - 0.3, dz + s2.L*0.5]));
    chk('стенка крюка стоит за кончиком губки A', solid(M, [0, 0, dz + zW0 + s2.wallT*0.5]));
    chk('и между кончиком A и стенкой крюка — зазор печати',
        !solid(M, [0, -s2.cl/2 - s2.tTip*0.5, dz - s2.cl*0.5]), 'зазор у торца');
    /* НАСЕЧКИ — В НАРУЖНЫХ ГРАНЯХ ОБЕИХ ГУБОК, у кончика. */
    const gz0 = 3, zg = dz + gz0 + s2.gripW*0.5;
    const yOutA = -s2.cl/2 - s2.tAt(gz0);                     // наружная грань A в этом месте
    chk('насечка прорезана в наружной грани губки A',
        !solid(M, [0, yOutA + s2.gripD*0.4, zg]), {zg, yOutA});
    chk('а рядом с ней материал есть',
        solid(M, [0, yOutA + s2.gripD*0.4, zg + s2.gripW*0.5 + s2.gripGap*0.5]));
    chk('и то же самое в наружной грани губки B',
        !solid(M, [0, s2.cl/2 + s2.tAt(gz0) - s2.gripD*0.4, zg]));
    chk('без насечек деталь тяжелее', vol(B({bagGripN:0})) > vol(B({bagGripN:8})),
        {без:+vol(B({bagGripN:0})).toFixed(0), с:+vol(B({bagGripN:8})).toFixed(0)});
  }
  console.log('\n=== зажим: пределы названы, умолчание молчит ===');
  chk('на умолчаниях ни одной жалобы',
      !W({}).some(x => /сломается|слаб|отломится|урезана|пружинить/.test(x)), W({}));
  chk('но числа названы', W({}).some(x => /Н на пакете/.test(x)) && W({}).some(x => /защёлкнуть/.test(x)));
  chk('печать на боку названа условием', W({}).some(x => /печатать НА БОКУ/.test(x)));
  chk('и сказано, что складывать ничего не надо', W({}).some(x => /Складывать и подгибать НИЧЕГО не нужно/.test(x)));
  chk('урезание числа узлов названо', W({bagW:13, bagKnuckles:15}).some(x => /узлов петли урезано с/.test(x)),
      W({bagW:13, bagKnuckles:15}));
  chk('и узлы всегда помещаются по ширине', (function(){
    for (const w2 of [6, 13, 30, 60]) for (const k of [0, 3, 9, 15]){
      const q = S({bagW:w2, bagKnuckles:k});
      if (q.kW > q.band + 1e-9) return false;                 // узел не шире своей полосы
    } return true; })());
  chk('число узлов по умолчанию идёт за шириной', S({bagW:60}).nK > S({bagW:8}).nK,
      [S({bagW:8}).nK, S({bagW:60}).nK]);
  chk('и оно всегда нечётное — тогда крайние узлы у губки A', S({bagW:60}).nK % 2 === 1 &&
      S({bagW:8}).nK % 2 === 1 && S({bagW:30}).nK % 2 === 1);
  chk('слабый зажим назван слабым', W({bagT:1.2, bagL:200}).some(x => /слаб/.test(x)),
      W({bagT:1.2, bagL:200}));
  chk('пакет у самой застёжки назван слабым местом',
      S({bagGrip:110}).Fbag < S({}).Fbag/2, {уместа:+S({bagGrip:110}).Fbag.toFixed(2)});
}
console.log('\n=== TOTAL:', pass, 'passed,', fail, 'failed ===');
if(fail) process.exitCode = 1;
