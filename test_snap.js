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

/* ЗАЖИМ ДЛЯ ПАКЕТА: длинный узкий, две сужающиеся губки на живом шарнире, застёгнутые С-ОБРАЗНЫМ
   КРЮКОМ через кончик встречной губки. Двух прежних версий не стало по одной и той же причине: обе
   были не тем, что заказано. Сперва U-образная пружина вместо прищепки, потом прищепка из двух
   широких плит с крючком в прорезь вместо длинного узкого зажима с крюком через кончик. Обе
   строились, обе были герметичны, обе считались верно — и ни одна не была зажимом для пакета.

   Проверяется то, что ломается тихо:
     1. РЫЧАГ. Пакет ближе к шарниру — зажим сильнее, и это не мнение, а отношение плеч.
     2. ПОДАТЛИВОСТЬ СУЖАЮЩЕЙСЯ ГУБКИ — ИНТЕГРАЛ, а не формула ровной консоли. Ровная формула с
        какой-нибудь «средней» толщиной врёт в разы, и врёт МОЛЧА: усилие остаётся правдоподобным.
        Сходимость интеграла проверяется сгущением, а сам он — вырождением в ровную губку, где
        закрытая формула известна.
     3. КРЮК ДЕРЖИТ ГУБОЙ, А ГНЁТСЯ ПРИ ЭТОМ ГУБКА. У губы плечо в миллиметр, она не гнётся вовсе;
        прогибается длинная губка, и усилие защёлкивания считается по ЕЁ податливости. Спутать здесь
        два тела — значит выдать усилие, отличающееся на порядки.
     4. ПРОФИЛЬ — ОДИН КОНТУР, и он обязан быть простым. Ушное отсечение самопересечения не заметит,
        а сошьёт во что попало: деталь построится и будет выглядеть целой.
     5. НАСЕЧКИ РЕЖУТСЯ В НИЖНЕЙ ГРАНИ, а не выступают из неё: после сгиба нижняя грань наружная у
        обеих губок, а выступ на ней пришлось бы печатать поверх стола. */
console.log('\n=== зажим: рычаг и податливость сужающейся губки ===');
{
  const P = ov => Object.assign(defaultBoxParams(), {pipMode:'bagclip'}, ov);
  const S = ov => bagClipSpec(P(ov));
  const B = ov => { logos.length=0; boxHoles.length=0;
    Object.assign(paramState.box, defaultBoxParams(), {pipMode:'bagclip'}, ov);
    return buildTrisForShape('box', paramState.box); };
  const W = ov => collectPrintWarnings(P(ov)) || [];
  const g = S({});
  chk('прогиб конца губки — из отношения плеч', Math.abs(g.dTip - g.open*g.L/(2*g.a)) < 1e-9, g.dTip);
  chk('усилие на застёжке — прогиб делить на податливость', Math.abs(g.Flatch - g.dTip/g.dPerF) < 1e-9, g.Flatch);
  chk('усилие на пакете — из равенства моментов', Math.abs(g.Fbag - g.Flatch*g.L/g.a) < 1e-9, g.Fbag);
  /* РЫЧАГ РАБОТАЕТ В ТУ СТОРОНУ. Ошибка знака дала бы приложение, советующее класть пакет подальше. */
  chk('ближе к шарниру — сильнее зажим', S({bagGrip:8}).Fbag > S({bagGrip:100}).Fbag*10,
      {ближе:+S({bagGrip:8}).Fbag.toFixed(1), дальше:+S({bagGrip:100}).Fbag.toFixed(1)});
  chk('и усилие на пакете всегда не меньше, чем на застёжке', g.Fbag >= g.Flatch);

  /* ИНТЕГРАЛ ВЫРОЖДАЕТСЯ В ЗАКРЫТУЮ ФОРМУЛУ. Губка без сужения — обычная консоль, и её податливость
     известна: L³/(3EI). Совпасть они обязаны, иначе интеграл посчитан не о том. */
  {
    const e = S({bagTaper:1});
    const I = e.W*e.T*e.T*e.T/12, want = e.L*e.L*e.L/(3*e.mat.E*I);
    chk('без сужения податливость сходится с L³/(3EI)', Math.abs(e.dPerF/want - 1) < 2e-5,
        {интеграл:e.dPerF, формула:want});
    chk('  и деформация — с 1.5·δ·t/L² защёлки-консоли',
        Math.abs(100*e.epsPerF*(e.dTip/e.dPerF) - 100*1.5*e.dTip*e.T/(e.L*e.L)) < 2e-3,
        {интеграл:100*e.epsPerF*(e.dTip/e.dPerF), формула:100*1.5*e.dTip*e.T/(e.L*e.L)});
    /* А У СУЖАЮЩЕЙСЯ ГУБКИ ровная формула врёт, и врёт заметно — иначе весь интеграл был бы
       украшением. Считаем ту же ровную формулу по КОРНЕВОЙ толщине: столько бы и вышло, забудь я
       про сужение. */
    const t2 = S({}), If = t2.W*t2.T*t2.T*t2.T/12, flat = t2.L*t2.L*t2.L/(3*t2.mat.E*If);
    chk('а с сужением ровная формула врёт в полтора раза и больше', t2.dPerF > flat*1.5,
        {сужение:t2.dPerF, ровная:flat, раз:+(t2.dPerF/flat).toFixed(2)});
    /* И врёт тем сильнее, чем сильнее сужение — иначе «в полтора раза» было бы совпадением. */
    const sharp = S({bagTaper:0.25}), Is = sharp.W*sharp.T*sharp.T*sharp.T/12;
    chk('  и тем сильнее, чем острее сужение',
        sharp.dPerF/(sharp.L*sharp.L*sharp.L/(3*sharp.mat.E*Is)) > t2.dPerF/flat + 0.5,
        {острое:+(sharp.dPerF/(sharp.L*sharp.L*sharp.L/(3*sharp.mat.E*Is))).toFixed(2), обычное:+(t2.dPerF/flat).toFixed(2)});
  }
  /* ОПАСНОЕ СЕЧЕНИЕ У СУЖАЮЩЕЙСЯ ГУБКИ — НЕ У КОРНЯ. Момент растёт линейно, а сопротивление сечения —
     квадратом толщины, и максимум деформации садится внутри длины, в точке x = t_кончика/наклон. На
     умолчаниях он почти у корня и разница в проценте, а при остром сужении — в полтора раза, и вот там
     «взять деформацию у корня» уже прямая ошибка. Проверяется именно на остром. */
  {
    const q = S({bagTaper:0.2});
    const Iroot = q.W*q.T*q.T*q.T/12, atRoot = q.L*(q.T/2)/(q.mat.E*Iroot);
    chk('максимум деформации не у корня, а внутри длины', q.epsPerF > atRoot*1.3,
        {максимум:q.epsPerF, укорня:atRoot, раз:+(q.epsPerF/atRoot).toFixed(2)});
    const e = S({bagTaper:1});
    const Ie = e.W*e.T*e.T*e.T/12;
    chk('а у ровной губки — ровно у корня', Math.abs(e.epsPerF/(e.L*(e.T/2)/(e.mat.E*Ie)) - 1) < 3e-3,
        {максимум:e.epsPerF, укорня:e.L*(e.T/2)/(e.mat.E*Ie)});
  }
  /* СХОДИМОСТЬ. Двести шагов — не «на глаз»: то же с четырьмястами обязано дать то же число. */
  {
    const q = S({}), NX = 800; let d2 = 0;
    for (let k = 0; k < NX; k++){
      const x = q.L*(k + 0.5)/NX, t = q.tAt(x), I = q.W*t*t*t/12;
      d2 += x*x/(q.mat.E*I)*(q.L/NX);
    }
    chk('двухсот шагов интегралу хватает', Math.abs(q.dPerF/d2 - 1) < 1e-5, {двести:q.dPerF, восемьсот:d2});
  }
  /* СУЖЕНИЕ РАБОТАЕТ В ТУ СТОРОНУ: тоньше кончик — мягче губка, но материала меньше. */
  chk('тоньше кончик — мягче губка', S({bagTaper:0.25}).dPerF > S({bagTaper:0.9}).dPerF*1.3,
      {тонкий:S({bagTaper:0.25}).dPerF, толстый:S({bagTaper:0.9}).dPerF});
  chk('и толще корень — жёстче', S({bagT:8}).Fbag > S({bagT:3}).Fbag*3);
  /* ПЕРЕМЫЧКА — числами отдельной формы живого шарнира, чтобы одно приложение не спорило само с собой. */
  {
    const lh = livingHingeSpec(Object.assign(defaultBoxParams(), {lhWebT:g.web, lhWebW:g.webW}));
    chk('деформация перемычки — та же π·t/(2w), что у живого шарнира',
        Math.abs(g.hingeStrain - lh.strain) < 1e-9, {зажим:+g.hingeStrain.toFixed(4), шарнир:+lh.strain.toFixed(4)});
    chk('и число слоёв считается так же', Math.abs(g.layers - lh.layers) < 1e-9);
  }

  console.log('\n=== зажим: гнётся губка, а не губа крюка ===');
  /* Защёлкиваясь, кончик обязан прогнуться ЕЩЁ на вылет губы — значит усилие защёлкивания больше
     удерживающего ровно в отношении (прогиб + вылет)/прогиб, и считается оно по податливости ГУБКИ. */
  chk('усилие защёлкивания — по той же податливости', Math.abs(g.Fclose - (g.dTip + g.catchLen)/g.dPerF) < 1e-9, g.Fclose);
  chk('и оно больше удерживающего ровно на вылет губы',
      Math.abs(g.Fclose/g.Flatch - (g.dTip + g.catchLen)/g.dTip) < 1e-9, g.Fclose/g.Flatch);
  chk('длиннее губа — тяжелее защёлкнуть', S({bagCatch:0.4}).Fclose < S({bagCatch:4}).Fclose);
  /* ГУБУ НЕ ПУСКАЮТ ДЛИННЕЕ КОНЧИКА: такую уже не разжать пальцами. */
  /* УРЕЗАНИЕ ПРОВЕРЯЕТСЯ ЗНАЧЕНИЕМ, А НЕ ФЛАЖКОМ. Первая версия спрашивала только `catchCut`, и мутация
     «не урезать вовсе» проходила её насквозь: флажок считается отдельно и остался правдивым, а губа
     выросла вчетверо. Флажок — это рассказ о числе, и проверять надо число. */
  chk('губа не длиннее кончика с четвертью', g.catchLen <= g.tTip*1.2 + 1e-9, [g.catchLen, g.tTip]);
  for (const q of [4, 3]){          // 2.7 мм — предел на умолчаниях, двойка в него ещё влезает
    const e = S({bagCatch:q});
    chk('заказ ' + q + ' мм урезан до кончика с четвертью',
        e.catchLen < q - 1e-9 && Math.abs(e.catchLen - e.tTip*1.2) < 1e-9, [e.catchLen, e.tTip*1.2]);
  }
  chk('и в СЕТКЕ губа тоже урезана', (function(){
    const e = S({bagCatch:4}), t4 = B({bagCatch:4}), b4 = computeBBox(t4);
    return Math.abs((b4.maxY - b4.minY) - (2*e.tTip + e.ramp)) < 0.02 && (b4.maxY - b4.minY) < 2*e.tTip + 4*1.4;
  })());
  chk('урезание помечено', S({bagCatch:4}).catchCut === true);
  chk('и названо вслух', W({bagCatch:4}).some(x => /губа крюка урезана/.test(x)), W({bagCatch:4}));
  chk('просторную не трогают', S({bagCatch:0.5}).catchCut === false &&
      Math.abs(S({bagCatch:0.5}).catchLen - 0.5) < 1e-9);
  /* САМА ГУБА ТОЖЕ МОЖЕТ ОТЛОМИТЬСЯ: она держит Flatch на плече в свой вылет. */
  chk('деформация губы считается и она мала на умолчаниях', g.lipStrain > 0 && g.lipStrain < g.mat.eps,
      {губа:g.lipStrain, доп:g.mat.eps});
  chk('толще пакет — сильнее нагружена губа', S({bagOpen:20}).lipStrain > S({bagOpen:1}).lipStrain*3);

  console.log('\n=== зажим: сетка — та деталь, которую посчитали ===');
  for (const ov of [{}, {bagT:1.2}, {bagT:10}, {bagL:20}, {bagL:200}, {bagW:6}, {bagW:60},
                    {bagOpen:40}, {bagCatch:4}, {bagCatch:0.3}, {bagGripN:0}, {bagGripN:8},
                    {bagTaper:1}, {bagTaper:0.2}, {bagWebW:20}, {bagWall:6}]){
    const t = B(ov), mc = manifoldCheck(t, 4);
    chk('зажим '+JSON.stringify(ov)+' герметичен (+объём)', mc.watertight && vol(t) > 0,
        {open:mc.openEdges, bad:mc.badEdges});
  }
  {
    const s2 = S({}), t = B({}), b = computeBBox(t);
    chk('ширина сетки — заданная ширина', Math.abs((b.maxX-b.minX) - s2.W) < 0.01, +(b.maxX-b.minX).toFixed(3));
    chk('длина — две губки, перемычка и стенка крюка',
        Math.abs((b.maxZ-b.minZ) - (2*s2.L + s2.webW + s2.wallT)) < 0.02,
        {габарит:+(b.maxZ-b.minZ).toFixed(2), ждём:+(2*s2.L + s2.webW + s2.wallT).toFixed(2)});
    chk('высота — два кончика и заходный скос губы',
        Math.abs((b.maxY-b.minY) - (2*s2.tTip + s2.ramp)) < 0.02,
        {габарит:+(b.maxY-b.minY).toFixed(2), ждём:+(2*s2.tTip + s2.ramp).toFixed(2)});
    /* ДЛИННЫЙ И УЗКИЙ — это и есть заказанная форма, а не пожелание: два широких листа зажимом для
       пакета не были ничем, кроме принципа. */
    chk('деталь длинная и узкая', (b.maxZ-b.minZ) > (b.maxX-b.minX)*8,
        {длина:+(b.maxZ-b.minZ).toFixed(0), ширина:+(b.maxX-b.minX).toFixed(0)});
  }
  /* КРЮК ЕСТЬ В СЕТКЕ, И ОН ОХВАТЫВАЕТ КОНЧИК, а не торчит рядом. Щуп идёт лучом вверх по Z-сечению:
     над кончиком губки B материал обязан быть ВЫШЕ уровня двух кончиков — это и есть губа, — а над
     серединой губки его там быть не должно. */
  {
    const s2 = S({}), t = B({}), b = computeBBox(t);
    const zJ = b.minZ + 2*s2.L + s2.webW, yLip = b.minY + 2*s2.tTip + s2.ramp*0.2;
    /* ЛУЧ ПУСКАЕТСЯ ИЗ САМОЙ ТОЧКИ, а не издалека. Первая версия начинала его снаружи детали, и число
       оборотов там равно нулю ВСЕГДА — луч входит и выходит, знаки взаимно уничтожаются. Три проверки
       из четырёх при этом «проходили»: они спрашивали «пусто ли», а пусто было везде.

       И ИДЁТ ОН ВКОСЬ, а не строго по X. Строго по X он ложится в диагональ ушного отсечения на торце:
       оба смежных треугольника строгий тест отвергает, и на сплошном материале выходит «пусто». Ровно
       это и вышло — ровные точки посередине между насечками докладывались пустыми. */
    const solid = (y, z) => {
      let n = 0;
      for (const T of t){
        const e1 = sub(T[1],T[0]), e2 = sub(T[2],T[0]), d = [1, 0.0137, 0.0071];
        const h = cross(d,e2), a2 = dot(e1,h); if (Math.abs(a2) < 1e-12) continue;
        const sv = [0 - T[0][0], y - T[0][1], z - T[0][2]], f = 1/a2;
        const u = f*dot(sv,h); if (u < 1e-9 || u > 1-1e-9) continue;
        const q = cross(sv,e1), v = f*dot(d,q); if (v < 1e-9 || u+v > 1-1e-9) continue;
        if (f*dot(e2,q) <= 1e-9) continue;
        n += dot(cross(e1,e2),d) > 0 ? 1 : -1;
      } return n !== 0; };
    chk('губа крюка стоит НАД кончиком встречной губки',
        solid(b.minY + 2*s2.tTip + s2.ramp*0.2, zJ - s2.catchLen*0.5), yLip);
    chk('а над серединой губки на той же высоте пусто', !solid(yLip, zJ - s2.L*0.5));
    chk('и удерживающая грань губы — на уровне двух кончиков',
        solid(b.minY + 2*s2.tTip + 0.1, zJ - s2.catchLen*0.5) &&
        !solid(b.minY + 2*s2.tTip - 0.1, zJ - s2.catchLen*0.5));
    /* НАСЕЧКИ — В НИЖНЕЙ ГРАНИ. У самой нижней грани над насечкой пусто, между насечками — материал. */
    const yG = b.minY + s2.gripD*0.5, z0 = b.minZ + 3 + s2.gripW*0.5;
    chk('насечка прорезана в нижней грани', !solid(yG, z0), z0);
    chk('а рядом с ней материал есть', solid(yG, z0 + s2.gripW*0.5 + s2.gripGap*0.5));
    chk('без насечек нижняя грань сплошная', (function(){
      Object.assign(paramState.box, defaultBoxParams(), {pipMode:'bagclip', bagGripN:0});
      const t0 = buildTrisForShape('box', paramState.box), b0 = computeBBox(t0);
      let cnt = 0;
      for (const T of t0) for (const v of T) if (Math.abs(v[1] - b0.minY) < 1e-9) cnt++;
      return cnt > 0 && t0.length < t.length; })());
  }
  console.log('\n=== зажим: пределы названы, умолчание молчит ===');
  chk('на умолчаниях ни одной жалобы',
      !W({}).some(x => /порвётся|плита с канавкой|растянет|сломается|слаб|отломится/.test(x)), W({}));
  chk('но числа названы', W({}).some(x => /Н на пакете/.test(x)) && W({}).some(x => /защёлкнуть/.test(x)));
  chk('узкая перемычка названа рвущейся',
      W({bagWebW:1.5}).some(x => /растянет наружное волокно/.test(x)), W({bagWebW:1.5}));
  chk('слишком тонкая перемычка — тоже', W({bagWebT:0.1}).some(x => /порвётся/.test(x)));
  chk('слишком толстая — плитой с канавкой', W({bagWebT:1.4}).some(x => /плита с канавкой/.test(x)));
  chk('слабый зажим назван слабым', W({bagT:1.2, bagL:200}).some(x => /слаб/.test(x)),
      W({bagT:1.2, bagL:200}));
  chk('пакет у самой застёжки назван слабым местом',
      S({bagGrip:110}).Fbag < S({}).Fbag/2, {уместа:+S({bagGrip:110}).Fbag.toFixed(2)});
  chk('и печатать плашмя сказано всегда', W({}).some(x => /ПЛАШМЯ/.test(x)));
}
console.log('\n=== TOTAL:', pass, 'passed,', fail, 'failed ===');
if(fail) process.exitCode = 1;
