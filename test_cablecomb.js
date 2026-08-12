// Гребёнка кабелей — a bar of keyhole slots, printed flat so that no face of any slot is an overhang.
//
// One number decides whether the part works: the neck. It has to be narrower than the cable (or nothing is
// held) and wide enough to push through (or nothing goes in), and the two limits are a fraction of a
// millimetre apart. So the neck and the pocket are both measured off the mesh, on the SAME ray, and the
// inequality between them is asserted directly rather than inferred from the parameter that produced it.
// Run via ./run-all.sh.
let pass=0, fail=0;
function chk(n,c,e){if(c){pass++;console.log('  OK  ',n);}else{fail++;console.log('  FAIL',n,e!==undefined?JSON.stringify(e):'');}}
function vol(t){let v=0;for(const T of t){const a=T[0],b=T[1],c=T[2];v+=(a[0]*(b[1]*c[2]-b[2]*c[1])-a[1]*(b[0]*c[2]-b[2]*c[0])+a[2]*(b[0]*c[1]-b[1]*c[0]))/6;}return v;}
function setp(ov){ logos.length=0; boxHoles.length=0; dieFaces.length=0;
  Object.assign(paramState.box, defaultBoxParams(), {gfBaseplate:false, mntMode:'cablecomb',
    mntCabD:6, mntCabN:5, mntCabGrip:0.75, mntCabH:12, mntCabScrew:4}, ov); return paramState.box; }
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
/* Луч поперёк планки на высоте z её профиля. Профиль лежит в плоскости XY: с v18.5.1 гребёнка повёрнута
   на четверть, чтобы отверстие под саморез шло спереди назад, и то, что раньше было глубиной по Z, стало
   высотой по Y. Все замеры здесь идут через этот один вход — иначе поворот пришлось бы вписывать в
   каждую проверку по отдельности, и какая-нибудь осталась бы мерить пустоту и молча проходить. */
const across = (t, y) => solidRuns(t, 0, y, 0);
// Widest void in column k at height z of the profile (a ray along X at that z, filtered to the column).
function voidAt(t, s, k, z){
  const runs = across(t, z);
  let best = 0;
  for(let i=0;i+1<runs.length;i++){
    const mid = (runs[i][1] + runs[i+1][0])/2;
    if(Math.abs(mid - s.xAt(k)) < s.colW/2) best = Math.max(best, runs[i+1][0] - runs[i][1]); }
  return best;
}

console.log('=== сборка ===');
for(const D of [2, 6, 16]) for(const n of [1, 5, 12]) for(const sc of [0, 4]){
  const t = mk({mntCabD:D, mntCabN:n, mntCabScrew:sc}), mc = manifoldCheck(t,4);
  chk('Ø'+D+' ×'+n+' винт '+sc+': замкнут', mc.watertight && vol(t)>0, {open:mc.openEdges, bad:mc.badEdges});
  chk('Ø'+D+' ×'+n+' винт '+sc+': обмотка', minDepth(t,1,0.13,0.29)===0 && minDepth(t,0,0.13,0.29)===0);
  chk('Ø'+D+' ×'+n+' винт '+sc+': одна оболочка', meshComponents(t).length === 1, meshComponents(t).length);
}

console.log('=== горловина уже кармана — иначе держать нечем ===');
for(const D of [3, 6, 12]) for(const grip of [0.5, 0.75, 0.9]){
  const t = mk({mntCabD:D, mntCabGrip:grip, mntCabN:4});
  const s = cableCombSpec(paramState.box);
  const zc = s.Hb/2 - s.rp - s.nl;
  let okNeck = 0, okPocket = 0, okBite = 0;
  for(let k=0;k<s.n;k++){
    const neck = voidAt(t, s, k, s.Hb/2 - s.nl/2);      // in the neck, above the pocket
    const pock = voidAt(t, s, k, zc);                   // across the pocket's own centre
    if(Math.abs(neck - s.neck) < 0.03) okNeck++;
    if(Math.abs(pock - 2*s.rp) < 0.06) okPocket++;
    if(neck < D && pock > D) okBite++;                  // pushes past the neck, then cannot come back
  }
  chk('Ø'+D+' хват '+grip+': горловина = доле от Ø', okNeck === s.n, okNeck+'/'+s.n);
  chk('Ø'+D+' хват '+grip+': карман = Ø кабеля + зазор', okPocket === s.n, okPocket+'/'+s.n);
  chk('Ø'+D+' хват '+grip+': кабель проходит горловину и не выходит', okBite === s.n, okBite+'/'+s.n);
  chk('Ø'+D+' хват '+grip+': горловина выходит на кромку',
      voidAt(t, s, 0, s.Hb/2 - 0.05) > s.neck*0.8, voidAt(t, s, 0, s.Hb/2 - 0.05));
}

console.log('=== раскладка ===');
for(const n of [1, 3, 8]) for(const D of [4, 10]){
  // No screw holes for this one: they sit at the bar's mid height, which is inside the pockets' own
  // span, so a ray taken there counts them as slots and the layout reads two columns too many.
  const t = mk({mntCabN:n, mntCabD:D, mntCabScrew:0});
  const s = cableCombSpec(paramState.box), zc = s.Hb/2 - s.rp - s.nl;
  const runs = across(t, zc);
  chk(n+'×Ø'+D+': гнёзд ровно столько, сколько заказано', runs.length === n+1, runs.length + ' интервалов');
  chk(n+'×Ø'+D+': перемычка между гнёздами не тоньше заданной',
      n < 2 || runs.slice(1, n).every(r => r[1]-r[0] >= s.wall - 0.02), runs.map(r=>+(r[1]-r[0]).toFixed(2)));
  // the back of the bar is unbroken — a slot that cut through would let every cable out at once
  const back = across(t, -s.Hb/2 + 0.4);
  chk(n+'×Ø'+D+': задняя кромка сплошная', back.length === 1, back.length);
}

console.log('=== отверстия под саморез ===');
for(const sc of [3, 5]){
  const t = mk({mntCabScrew:sc});
  const s = cableCombSpec(paramState.box);
  const runs = across(t, 0.001);
  const holes = [];
  for(let i=0;i+1<runs.length;i++) holes.push([(runs[i][1]+runs[i+1][0])/2, runs[i+1][0]-runs[i][1]]);
  const ends = holes.filter(h => Math.abs(Math.abs(h[0]) - s.xScrew) < 0.3);
  chk('Ø'+sc+': два отверстия по краям', ends.length === 2, holes.map(h=>[+h[0].toFixed(1), +h[1].toFixed(2)]));
  chk('Ø'+sc+': их диаметр', ends.length===2 && ends.every(h=>Math.abs(h[1]-sc) < 0.06), ends.map(h=>+h[1].toFixed(3)));
  const bare = mk({mntCabScrew:0}), sb = cableCombSpec(paramState.box);
  const bruns = across(bare, 0.001);
  let nearEnd = 0;
  for(let i=0;i+1<bruns.length;i++)
    if(Math.abs(Math.abs((bruns[i][1]+bruns[i+1][0])/2) - sb.xScrew) < 1.5) nearEnd++;
  chk('без винтов у торцов сплошной металл', nearEnd === 0, nearEnd);
}

/* САМОРЕЗ ИДЁТ СПЕРЕДИ НАЗАД. Это и была жалоба: отверстие шло сверху вниз, и привинтить планку можно
   было только к горизонтальной поверхности снизу — то есть почти никуда.

   Мерится двумя лучами через ось отверстия. Вдоль Z материала нет вовсе — это «насквозь». Вдоль Y
   пустота ТОЖЕ есть (луч идёт сквозь тот же цилиндр, только поперёк), и первая версия этой проверки на
   ней и споткнулась, потребовав сплошного металла. Отличает вертикальное отверстие от горизонтального
   не наличие пустоты, а то, ЗАКРЫТА ли она: у горизонтального сверху и снизу остаётся планка во всю
   высоту, у вертикального её нет. */
console.log('=== отверстие идёт спереди назад, а не сверху вниз ===');
for(const sc of [3, 4, 6]){
  const t = mk({mntCabScrew:sc}), s = cableCombSpec(paramState.box);
  for(const sg of [-1, 1]){
    const nm = 'Ø'+sc+' '+(sg<0?'левое':'правое');
    chk(nm+': вдоль Z насквозь', solidRuns(t, 2, sg*s.xScrew, 0).length === 0,
        solidRuns(t, 2, sg*s.xScrew, 0));
    const down = solidRuns(t, 1, 0, sg*s.xScrew);
    chk(nm+': сверху вниз отверстие наружу не выходит', down.length === 2 &&
        Math.abs(down[0][0] + s.Hb/2) < 1e-6 && Math.abs(down[1][1] - s.Hb/2) < 1e-6, down);
    chk(nm+': и то, что оно там прошло, — ровно его Ø',
        down.length === 2 && Math.abs((down[1][0] - down[0][1]) - sc) < 1e-6,
        down.length === 2 ? +(down[1][0]-down[0][1]).toFixed(3) : down);
  }
  // ...и габарит повернулся вместе с отверстием: высота — по кабелю, глубина — заданная толщина планки.
  const b = computeBBox(t);
  chk('Ø'+sc+': высота планки = Hb', Math.abs((b.maxY-b.minY) - s.Hb) < 1e-6, +(b.maxY-b.minY).toFixed(3));
  chk('Ø'+sc+': глубина планки = заданная толщина', Math.abs((b.maxZ-b.minZ) - s.H) < 1e-6, +(b.maxZ-b.minZ).toFixed(3));
  chk('Ø'+sc+': длина не тронута', Math.abs((b.maxX-b.minX) - s.W) < 1e-6, +(b.maxX-b.minX).toFixed(3));
}
/* Пазы открыты ВВЕРХ. После поворота кабель кладут сверху, а не проталкивают вбок, и это ровно то, что
   делает планку пригодной на стенку. Луч вдоль Y через центр гнезда обязан выйти на волю. */
{
  const t = mk({mntCabN:4, mntCabD:6}), s = cableCombSpec(paramState.box);
  const zc = s.Hb/2 - s.rp - s.nl;
  let open = 0;
  for(let k=0;k<s.n;k++){
    const runs = solidRuns(t, 1, 0, s.xAt(k));          // вдоль Y в центре колонки
    if(runs.every(r => r[1] <= zc + 1e-6)) open++;      // выше центра кармана материала нет
  }
  chk('все гнёзда открыты вверх', open === s.n, open+'/'+s.n);
}

console.log('=== имя и предупреждения ===');
{
  chk('число и калибр в имени', /5×Ø6/.test(activeShapeLabel(setp({mntCabN:5, mntCabD:6}))), activeShapeLabel());
  const w1 = collectPrintWarnings(setp({mntCabGrip:0.95}));
  chk('слишком широкая горловина названа', w1.some(x=>/держать не будет/.test(x)), w1);
  const w2 = collectPrintWarnings(setp({mntCabGrip:0.4}));
  chk('слишком узкая горловина названа', w2.some(x=>/не продавить/.test(x)), w2);
  const w3 = collectPrintWarnings(setp({mntCabGrip:0.75}));
  chk('нормальная — молча', !w3.some(x=>/горловина/.test(x)), w3);
}

console.log('=== TOTAL: ' + pass + ' passed, ' + fail + ' failed ===');
if(fail) process.exit(1);
