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
  chk('и тонкая консоль отмечается отдельно',
      collectPrintWarnings(setp({snapT:0.6, snapLen:60})).some(s=>/тоньше 0.8/.test(s)), {});
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

/* ПРИЩЕПКА ДЛЯ ПАКЕТА: две губки на живом шарнире, застёгнутые крючком в прорезь. Первая версия была
   U-образной пружиной — конструкцию я выбрал сам, а заказана была прищепка; это разные вещи, и
   переделка сюда же и записана.

   Проверяется то, что ломается тихо:
     1. РЫЧАГ. Пакет ближе к шарниру — зажим сильнее, и это не мнение, а отношение плеч. Ошибись в
        нём знаком, и приложение будет советовать ровно обратное тому, что нужно.
     2. ТРИ КОНСОЛИ, ОДНА ФОРМУЛА. Губка, крючок и (по-своему) перемычка считаются теми же
        выражениями, что защёлка-консоль и язычок футляра. Разойдись они — одна деталь считалась бы
        по чужой формуле, а все продолжали бы строиться.
     3. ДЛИНА КРЮЧКА ВЫВОДИТСЯ, А НЕ НАЗНАЧАЕТСЯ. Назначенная давала деформацию у корня в семь
        процентов при допустимых двух с половиной — крючок отломился бы на первом застёгивании.
     4. ПРОРЕЗЬ И КРЮЧОК ЗЕРКАЛЬНЫ относительно середины перемычки: после сгиба одно приходит ровно
        на другое. Разъедься они — прищепка не застегнётся, а построится безупречно. */
console.log('\n=== прищепка: рычаг, три консоли и зеркальность ===');
{
  const P = ov => Object.assign(defaultBoxParams(), {pipMode:'bagclip'}, ov);
  const S = ov => bagClipSpec(P(ov));
  const B = ov => { logos.length=0; boxHoles.length=0;
    Object.assign(paramState.box, defaultBoxParams(), {pipMode:'bagclip'}, ov);
    return buildTrisForShape('box', paramState.box); };
  const W = ov => collectPrintWarnings(P(ov)) || [];
  const g = S({});
  chk('прогиб конца губки — из отношения плеч', Math.abs(g.dTip - g.open*g.L/(2*g.a)) < 1e-9, g.dTip);
  chk('усилие на застёжке — консольная формула E·w·t³·δ/(4L³)',
      Math.abs(g.Flatch - g.mat.E*g.W*g.T*g.T*g.T*g.dTip/(4*g.L*g.L*g.L)) < 1e-9, g.Flatch);
  chk('усилие на пакете — из равенства моментов', Math.abs(g.Fbag - g.Flatch*g.L/g.a) < 1e-9, g.Fbag);
  /* РЫЧАГ РАБОТАЕТ В ТУ СТОРОНУ. Ошибка знака дала бы приложение, советующее класть пакет подальше. */
  chk('ближе к шарниру — сильнее зажим', S({bagGrip:8}).Fbag > S({bagGrip:40}).Fbag*10,
      {ближе:+S({bagGrip:8}).Fbag.toFixed(1), дальше:+S({bagGrip:40}).Fbag.toFixed(1)});
  chk('и усилие на пакете всегда не меньше, чем на застёжке', g.Fbag >= g.Flatch);
  chk('деформация губки — та же 1.5·δ·t/L², что у защёлки',
      Math.abs(g.jawStrain - 100*1.5*g.dTip*g.T/(g.L*g.L)) < 1e-9, g.jawStrain);
  {
    const sn = snapSpec(Object.assign(defaultBoxParams(), {pipMode:'snap', snapLen:g.L, snapT:g.T,
      snapUndercut:g.dTip, snapTaper:false}));
    chk('  и совпадает с той, по которой посчитана защёлка', Math.abs(g.jawStrain - sn.eps) < 1e-9,
        {прищепка:+g.jawStrain.toFixed(4), защёлка:+sn.eps.toFixed(4)});
  }
  /* ПЕРЕМЫЧКА — числами отдельной формы живого шарнира, чтобы одно приложение не спорило само с собой. */
  {
    const lh = livingHingeSpec(Object.assign(defaultBoxParams(), {lhWebT:g.web, lhWebW:g.webW}));
    chk('деформация перемычки — та же π·t/(2w), что у живого шарнира',
        Math.abs(g.hingeStrain - lh.strain) < 1e-9, {прищепка:+g.hingeStrain.toFixed(4), шарнир:+lh.strain.toFixed(4)});
    chk('и число слоёв считается так же', Math.abs(g.layers - lh.layers) < 1e-9);
  }
  console.log('\n=== прищепка: длина крючка выводится из материала ===');
  chk('деформация крючка — доля от допустимой, а не что вышло',
      Math.abs(g.hookStrain - g.mat.eps*0.8) < 1e-6, {вышло:+g.hookStrain.toFixed(3), доп:g.mat.eps});
  chk('и она ниже допустимой', g.hookStrain < g.mat.eps);
  /* МАТЕРИАЛ ПОВЯЗЧЕ — КРЮЧОК КОРОЧЕ. Жёстко назначенная длина этого не умела бы вовсе. */
  chk('в PETG крючок короче, чем в PLA',
      S({printMat:'petg'}).hookL < S({printMat:'pla'}).hookL - 1,
      {petg:+S({printMat:'petg'}).hookL.toFixed(2), pla:+S({printMat:'pla'}).hookL.toFixed(2)});
  chk('глубже зацеп — длиннее крючок', S({bagBarb:2}).hookL > S({bagBarb:0.5}).hookL + 1);
  chk('и деформация при этом остаётся той же долей',
      Math.abs(S({bagBarb:2}).hookStrain - S({bagBarb:0.5}).hookStrain) < 1e-6);

  console.log('\n=== прищепка: сетка — та деталь, которую посчитали ===');
  for (const ov of [{}, {bagT:4}, {bagL:100}, {bagW:120}, {bagOpen:12}, {bagBarb:2}]){
    const t = B(ov), mc = manifoldCheck(t, 4);
    chk('прищепка '+JSON.stringify(ov)+' герметична (+объём)', mc.watertight && vol(t) > 0,
        {open:mc.openEdges, bad:mc.badEdges});
  }
  {
    const s2 = S({}), t = B({}), b = computeBBox(t);
    chk('ширина сетки — заданная ширина', Math.abs((b.maxX-b.minX) - s2.W) < 0.01, +(b.maxX-b.minX).toFixed(3));
    chk('длина — две губки и перемычка', Math.abs((b.maxZ-b.minZ) - (2*s2.L + s2.webW)) < 0.02,
        {габарит:+(b.maxZ-b.minZ).toFixed(2), ждём:+(2*s2.L + s2.webW).toFixed(2)});
    chk('высота — губка плюс крючок', Math.abs((b.maxY-b.minY) - (s2.T + s2.hookL)) < 0.02,
        {габарит:+(b.maxY-b.minY).toFixed(2), ждём:+(s2.T + s2.hookL).toFixed(2)});
  }
  {
    /* ЗЕРКАЛЬНОСТЬ ПРОВЕРЯЕТСЯ ПО СЕТКЕ, а не по числам в коде: где на самом деле прорезь и где крючок.
       Прорезь ищется как пустота в ближней губке, крючок — как материал выше её толщины. Сумма их
       координат обязана равняться удвоенной середине перемычки: тогда сгиб приводит одно на другое. */
    const s2 = S({}), t = B({}), b = computeBBox(t);
    const zA1 = s2.L, zW1 = s2.L + s2.webW;
    const off = b.minZ;                                   // сетка отцентрована, работаем от края
    const solidAt = (y, z) => {                            // есть ли материал в точке (0, y, z)
      let w2 = 0;
      for(const T of t){ const [a,c,d]=T;
        const d1=(c[0]-a[0])*(z-a[2])-(c[2]-a[2])*(0-a[0]);
        const d2=(d[0]-c[0])*(z-c[2])-(d[2]-c[2])*(0-c[0]);
        const d3=(a[0]-d[0])*(z-d[2])-(a[2]-d[2])*(0-d[0]);
        if(!((d1>=0&&d2>=0&&d3>=0)||(d1<=0&&d2<=0&&d3<=0))) continue;
        const A=(c[0]-a[0])*(d[2]-a[2])-(c[2]-a[2])*(d[0]-a[0]); if(Math.abs(A)<1e-12) continue;
        const w1=((c[0]-0)*(d[2]-z)-(c[2]-z)*(d[0]-0))/A, ww=((d[0]-0)*(a[2]-z)-(d[2]-z)*(a[0]-0))/A;
        const yy=w1*a[1]+ww*c[1]+(1-w1-ww)*d[1];
        if(yy<=y) continue;
        const ny=(c[2]-a[2])*(d[0]-a[0])-(c[0]-a[0])*(d[2]-a[2]);
        w2 += ny>0?1:-1; }
      return w2 !== 0; };
    /* ВЫСОТЫ ТОЖЕ ОТ КРАЯ ГАБАРИТА. Сетка отцентрована по всем трём осям, а толщина губки и высота
       крючка — числа от нуля построителя: щуп на «половине толщины губки» оказался выше всей детали,
       и «прорезь» нашлась на первом же шаге, где материала не было вовсе. */
    const yJaw = b.minY + s2.T/2, yHook = b.minY + s2.T + s2.hookL/2;
    let zSlot = null, zHook = null;
    for(let z = off + 0.5; z < off + zA1; z += 0.1)
      if (!solidAt(yJaw, z)){ zSlot = z; break; }
    for(let z = off + 2*s2.L + s2.webW - 0.5; z > off + zW1; z -= 0.1)
      if (solidAt(yHook, z)){ zHook = z; break; }
    chk('прорезь в ближней губке найдена', zSlot !== null, zSlot);
    chk('крючок на дальней губке найден', zHook !== null, zHook);
    if (zSlot !== null && zHook !== null){
      const mid = off + (zA1 + zW1)/2;
      chk('прорезь и крючок зеркальны относительно середины перемычки',
          Math.abs((zSlot + zHook)/2 - mid) < 0.6,
          {середина:+((zSlot+zHook)/2).toFixed(2), перемычка:+mid.toFixed(2)});
    }
  }
  console.log('\n=== прищепка: пределы названы, умолчание молчит ===');
  chk('на умолчаниях ни одной жалобы',
      !W({}).some(x => /порвётся|плита с канавкой|растянет|сломается|выскользнет|башня/.test(x)), W({}));
  chk('но числа названы', W({}).some(x => /Н на пакете/.test(x)) && W({}).some(x => /крючок застёжки/.test(x)));
  chk('узкая перемычка названа рвущейся',
      W({bagWebW:1.5}).some(x => /растянет наружное волокно/.test(x)), W({bagWebW:1.5}));
  chk('слишком тонкая перемычка — тоже', W({bagWebT:0.1}).some(x => /порвётся/.test(x)));
  chk('слишком толстая — плитой с канавкой', W({bagWebT:1.4}).some(x => /плита с канавкой/.test(x)));
  chk('пакет у самой застёжки назван слабым местом',
      S({bagGrip:40}).Fbag < S({}).Fbag/5, {уместа:+S({bagGrip:40}).Fbag.toFixed(1)});
  chk('и печатать плашмя сказано всегда', W({}).some(x => /ПЛАШМЯ/.test(x)));
}
console.log('\n=== TOTAL:', pass, 'passed,', fail, 'failed ===');
if(fail) process.exitCode = 1;
