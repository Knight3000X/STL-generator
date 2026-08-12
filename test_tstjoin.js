// Замок образцов — зубья по краям, чтобы собирать плиту как пазл.
//
// Проверяется НЕ то, что построилось, а то, что СТЫКУЕТСЯ: зуб одной плитки кладётся в гнездо соседней и
// меряется, налезли ли они друг на друга и не болтается ли соединение. Это делается на сечении обеих
// плиток общей плоскостью — ровно так же, как их сложит на столе рука.
//
// Run via ./run-all.sh.
let pass=0, fail=0;
function chk(n,c,e){if(c){pass++;console.log('  OK  ',n);}else{fail++;console.log('  FAIL',n,e!==undefined?JSON.stringify(e):'');}}
function vol(t){let v=0;for(const T of t){const a=T[0],b=T[1],c=T[2];v+=(a[0]*(b[1]*c[2]-b[2]*c[1])-a[1]*(b[0]*c[2]-b[2]*c[0])+a[2]*(b[0]*c[1]-b[1]*c[0]))/6;}return v;}
function build(ov){ logos.length=0; boxHoles.length=0; dieFaces.length=0;
  Object.assign(paramState.box, defaultBoxParams(), ov);
  return buildTrisForShape('box', paramState.box); }
const JOINED = ['radius','chamfer','overhang','bridge','sphere','fit','dim','wall'];

/* Отрезки, занятые деталью, на луче вдоль оси `ax`. `cu` и `cv` — координаты по двум ОСТАЛЬНЫМ осям, в
   порядке (ax+1)%3, (ax+2)%3. Первая версия пыталась вывести их из имён «y» и «z» выражением с двумя
   вложенными тернарниками и переставляла их местами — оба замера молча возвращали пустоту. */
function runsAx(tris, ax, cu, cv){
  const AX = ax;
  const hits=[];
  const u=(AX+1)%3, v=(AX+2)%3, P=cu, Q=cv;
  for(const T of tris){ const [a,b,c]=T;
    const d1=(b[u]-a[u])*(Q-a[v])-(b[v]-a[v])*(P-a[u]);
    const d2=(c[u]-b[u])*(Q-b[v])-(c[v]-b[v])*(P-b[u]);
    const d3=(a[u]-c[u])*(Q-c[v])-(a[v]-c[v])*(P-c[u]);
    if(!((d1>=0&&d2>=0&&d3>=0)||(d1<=0&&d2<=0&&d3<=0))) continue;
    const A=(b[u]-a[u])*(c[v]-a[v])-(b[v]-a[v])*(c[u]-a[u]); if(Math.abs(A)<1e-12) continue;
    const e1=[b[0]-a[0],b[1]-a[1],b[2]-a[2]], e2=[c[0]-a[0],c[1]-a[1],c[2]-a[2]];
    const nrm=[e1[1]*e2[2]-e1[2]*e2[1], e1[2]*e2[0]-e1[0]*e2[2], e1[0]*e2[1]-e1[1]*e2[0]];
    if(Math.abs(nrm[AX])<1e-12) continue;
    const w1=((b[u]-P)*(c[v]-Q)-(b[v]-Q)*(c[u]-P))/A, w2=((c[u]-P)*(a[v]-Q)-(c[v]-Q)*(a[u]-P))/A;
    hits.push([w1*a[AX]+w2*b[AX]+(1-w1-w2)*c[AX], nrm[AX]<0?1:-1]);
  }
  hits.sort((A,B)=>A[0]-B[0]);
  const out=[]; let d=0, s=null;
  for(const [x,q] of hits){ const pr=d; d+=q;
    if(pr<=0&&d>0) s=x; else if(pr>0&&d<=0){ if(s!==null&&x-s>1e-9) out.push([s,x]); s=null; } }
  return out;
}
const runsX = (t, y, z) => runsAx(t, 0, y, z);             // луч вдоль X при (Y=y, Z=z)
const runsZ = (t, x, y) => runsAx(t, 2, x, y);             // луч вдоль Z при (X=x, Y=y)
const bbox = t => { const b={x0:1e9,x1:-1e9,y0:1e9,y1:-1e9,z0:1e9,z1:-1e9};
  for(const T of t) for(const v of T){ if(v[0]<b.x0)b.x0=v[0]; if(v[0]>b.x1)b.x1=v[0];
    if(v[1]<b.y0)b.y0=v[1]; if(v[1]>b.y1)b.y1=v[1]; if(v[2]<b.z0)b.z0=v[2]; if(v[2]>b.z1)b.z1=v[2]; } return b; };

console.log('=== с зубьями образцы остаются герметичными ===');
for(const m of JOINED) for(const n of [3, 8, 14]){
  const t = build({tstMode:m, tstN:n, tstJoin:true}), mc = manifoldCheck(t, 4);
  chk(m+' N='+n+': герметичен', mc.watertight && vol(t) > 0, {open:mc.openEdges, bad:mc.badEdges});
  /* Оболочка тут НЕ одна, и требовать одну было бы неверно: образец собран из пересекающихся коробок, а
     каждая цифра подписи — это семь отдельных брусков. Считать надо не куски, а направленные рёбра. */
}

console.log('=== выключенный замок не меняет НИ ОДНОГО треугольника ===');
for(const m of JOINED){
  const a = build({tstMode:m}), b = build({tstMode:m, tstJoin:false});
  chk(m+': умолчание и явное «нет» — одно и то же', a.length === b.length && vol(a).toFixed(6) === vol(b).toFixed(6));
}

console.log('=== сторона округляется вверх до целого числа шагов ===');
for(const m of JOINED) for(const n of [3, 9]){
  const t = build({tstMode:m, tstN:n, tstJoin:true}), b = bbox(t);
  /* Вылет вычитается ОДИН раз, а не два: гнёзда врезаны внутрь и габарит не расширяют — наружу торчат
     только зубья, и только с «плюсовых» кромок. Первая версия теста вычитала два и требовала кратности
     от числа на 4 мм меньше нужного. */
  const W = b.x1 - b.x0 - 4, D = b.z1 - b.z0 - 4;
  chk(m+' N='+n+': ширина кратна шагу', Math.abs(W/20 - Math.round(W/20)) < 1e-6, +W.toFixed(3));
  chk(m+' N='+n+': глубина кратна шагу', Math.abs(D/20 - Math.round(D/20)) < 1e-6, +D.toFixed(3));
}

/* Границы САМОЙ ПЛИТЫ, а не габарита. Фигуры образца свешиваются за её край — у скруглений габарит по Z
   на 10 мм шире плиты, — и первая версия теста брала центр зуба от габарита, промахиваясь мимо плиты на
   те же 10 мм. Плита ищется лучом на половине её толщины: выше неё стоят фигуры, ниже нет ничего. */
function plateOf(tris, p){
  const b = bbox(tris), yMid = b.y0 + tstPlateT(p)/2;
  /* Луч пускается У САМОГО УГЛА, а не через середину: зубья сидят на сетке с полушага от края, и середина
     стороны у иных размеров приходится ровно на зуб. Первая версия мерила по z = 0 и на плите глубиной
     60 попадала точно в средний зуб, отчего «ширина плиты» выходила на вылет зуба больше настоящей, а
     стык — впритык без зазора. У угла зубьев не бывает никогда. */
  const rx = runsX(tris, yMid, b.z0 + 1), rz = runsZ(tris, b.x0 + 1, yMid);
  return {yMid, x0:rx[0][0], x1:rx[rx.length-1][1], z0:rz[0][0], z1:rz[rz.length-1][1]};
}

/* ГЛАВНОЕ: две плитки СТЫКУЮТСЯ. Правая плитка сдвигается на ширину плиты и должна встать зубом в гнездо
   соседки. Меряется сечением обеих на половине толщины, лучом вдоль X через центр зуба: материал двух
   плиток не должен пересекаться (иначе не сложить) и не должен расходиться больше зазора (иначе
   болтается). Никакой арифметики раскладки тест не повторяет — и шаг, и центр зуба берутся из сетки.  */
console.log('=== зуб входит в гнездо: не заедает и не болтается ===');
for(const m of ['radius','overhang','wall','fit']) for(const clr of [0.1, 0.25, 0.6]){
  const A = build({tstMode:m, tstN:8, tstJoin:true, tstJoinClr:clr});
  const P = plateOf(A, paramState.box), step = P.x1 - P.x0;
  const B = A.map(T => T.map(v => [v[0] + step, v[1], v[2]]));
  const zc = P.z0 + 20/2;                                  // центр первого зуба: полшага от ближней кромки
  const ra = runsX(A, P.yMid, zc), rb = runsX(B, P.yMid, zc);
  const endA = ra[ra.length-1][1], begB = rb[0][0];
  chk(m+' зазор '+clr+': плитки не налезают', endA <= begB + 1e-9,
      {край_A:+endA.toFixed(3), край_B:+begB.toFixed(3)});
  chk(m+' зазор '+clr+': и не расходятся больше зазора', begB - endA <= clr + 1e-6, +(begB-endA).toFixed(4));
  chk(m+' зазор '+clr+': зуб вообще вышел за кромку', endA > P.x1 + 1, +(endA - P.x1).toFixed(2));
}
/* А ВОТ ЭТО — то, ради чего замок ласточкин хвост, а не прямоугольный шип: в плоскости стола он ДЕРЖИТ.
   Кончик зуба шире корня, поэтому вытащить плитку вбок нельзя, только поднять. */
console.log('=== зуб держит: кончик шире корня ===');
for(const ang of [5, 15, 30]) for(const jd of [3, 6]){
  const t = build({tstMode:'radius', tstN:8, tstJoin:true, tstJoinAng:ang, tstJoinD:jd, tstJoinW:5});
  const P = plateOf(t, paramState.box), zc = P.z0 + 10;
  const wid = x => { for(const r of runsZ(t, x, P.yMid)) if(r[0] <= zc && r[1] >= zc) return r[1] - r[0];
                     return 0; };
  const wRoot = wid(P.x1 + 0.05), wTip = wid(P.x1 + jd - 0.05);
  const want = 5 + 2*jd*Math.tan(ang*Math.PI/180);
  chk('развал '+ang+'° вылет '+jd+': кончик шире корня', wTip > wRoot + 0.1,
      {корень:+wRoot.toFixed(2), кончик:+wTip.toFixed(2)});
  chk('развал '+ang+'° вылет '+jd+': корень — заданная ширина', Math.abs(wRoot - 5) < 0.08, +wRoot.toFixed(3));
  chk('развал '+ang+'° вылет '+jd+': кончик — ширина по развалу', Math.abs(wTip - want) < 0.08,
      {есть:+wTip.toFixed(3), надо:+want.toFixed(3)});
}
console.log('=== линейке и башне замок не предлагается ===');
{
  const rows = SHAPE_PARAMS.box.filter(r => r.key && r.key.indexOf('tstJoin') === 0);
  chk('пять ручек замка', rows.length === 5, rows.length);
  for(const r of rows){
    chk(r.key+': линейки нет в списке', r.w.indexOf('ruler') < 0, r.w);
    chk(r.key+': башни нет в списке', r.w.indexOf('tower') < 0, r.w);
  }
  const a = build({tstMode:'ruler', tstJoin:true}), b = build({tstMode:'ruler'});
  chk('линейка с зубьями и без — одно и то же', a.length === b.length);
  const c = build({tstMode:'tower', tstJoin:true}), d = build({tstMode:'tower'});
  chk('башня с зубьями и без — одно и то же', c.length === d.length);
}
console.log('=== TOTAL: ' + pass + ' passed, ' + fail + ' failed ===');
if(fail) process.exit(1);
