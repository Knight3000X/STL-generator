// Накладка на головку ключа. Держит НАТЯГ — у головки ни канавки, ни выступа, зацепиться не за что, —
// поэтому меряется именно посадка: полость обязана быть шире головки ровно на зазор, и ни на сколько
// больше. И верх обязан быть открыт: родное отверстие ключа должно остаться доступным, иначе накладку
// нельзя надеть, не сняв ключ с кольца.
// Run via ./run-all.sh.
let pass=0, fail=0;
function chk(n,c,e){if(c){pass++;console.log('  OK  ',n);}else{fail++;console.log('  FAIL',n,e!==undefined?JSON.stringify(e):'');}}
function vol(t){let v=0;for(const T of t){const a=T[0],b=T[1],c=T[2];
  v+=(a[0]*(b[1]*c[2]-b[2]*c[1])-a[1]*(b[0]*c[2]-b[2]*c[0])+a[2]*(b[0]*c[1]-b[1]*c[0]))/6;}return Math.abs(v);}
function build(ov){ logos.length=0; boxHoles.length=0; dieFaces.length=0;
  // Режим называется ЯВНО в каждой проверке: с v18.20.0 умолчание — половинки, и молчаливая опора на
  // умолчание превратила бы замеры чехла в замеры не той детали (они и превратились: «полость 16» → 4).
  Object.assign(paramState.box, defaultBoxParams(), {mntMode:'keycover'}, ov);
  return buildTrisForShape('box', paramState.box); }
const bb = t => { const b={x0:1e9,x1:-1e9,y0:1e9,y1:-1e9,z0:1e9,z1:-1e9};
  for(const T of t) for(const v of T){ if(v[0]<b.x0)b.x0=v[0]; if(v[0]>b.x1)b.x1=v[0];
    if(v[1]<b.y0)b.y0=v[1]; if(v[1]>b.y1)b.y1=v[1]; if(v[2]<b.z0)b.z0=v[2]; if(v[2]>b.z1)b.z1=v[2]; } return b; };
// Ширина материала на луче вдоль X при (y,z) — по нему видно и стенки, и полость между ними.
function runsX(tris, y, z){
  const h=[];
  for(const T of tris){ const [a,b,c]=T;
    const d1=(b[1]-a[1])*(z-a[2])-(b[2]-a[2])*(y-a[1]);
    const d2=(c[1]-b[1])*(z-b[2])-(c[2]-b[2])*(y-b[1]);
    const d3=(a[1]-c[1])*(z-c[2])-(a[2]-c[2])*(y-c[1]);
    if(!((d1>=0&&d2>=0&&d3>=0)||(d1<=0&&d2<=0&&d3<=0))) continue;
    const A=(b[1]-a[1])*(c[2]-a[2])-(b[2]-a[2])*(c[1]-a[1]); if(Math.abs(A)<1e-12) continue;
    const e1=[b[0]-a[0],b[1]-a[1],b[2]-a[2]], e2=[c[0]-a[0],c[1]-a[1],c[2]-a[2]];
    const nx=e1[1]*e2[2]-e1[2]*e2[1]; if(Math.abs(nx)<1e-12) continue;
    const w1=((b[1]-y)*(c[2]-z)-(b[2]-z)*(c[1]-y))/A, w2=((c[1]-y)*(a[2]-z)-(c[2]-z)*(a[1]-y))/A;
    h.push([w1*a[0]+w2*b[0]+(1-w1-w2)*c[0], nx<0?1:-1]); }
  h.sort((p,q)=>p[0]-q[0]);
  const out=[]; let d=0,s=null;
  for(const [x,q] of h){ const pr=d; d+=q; if(pr<=0&&d>0)s=x; else if(pr>0&&d<=0){ if(s!==null&&x-s>1e-9)out.push([s,x]); s=null; } }
  return out;
}

console.log('=== строится и герметична на всех разумных числах ===');
for(const W of [12, 23, 45]) for(const T of [1.5, 2.4, 5]) for(const cap of [false, true]){
  const t = build({mntKcMode:'sleeve', mntKcW:W, mntKcT:T, mntKcH:28, mntKcCap:cap}), mc = manifoldCheck(t, 4);
  chk('W'+W+' T'+T+(cap?' с крышкой':' без крышки')+': герметична', mc.watertight && vol(t) > 0,
      {open:mc.openEdges, bad:mc.badEdges});
}

console.log('=== посадка: полость шире головки ровно на зазор ===');
for(const W of [16, 30]) for(const T of [2, 4]) for(const clr of [0, 0.25, 0.6]){
  const t = build({mntKcMode:'sleeve', mntKcW:W, mntKcT:T, mntKcH:30, mntKcClr:clr, mntKcWall:1.6});
  const b = bb(t);
  // луч поперёк устья, у самого низа: встретит левую стенку, полость, правую стенку
  const r = runsX(t, b.y0 + 1.5, 0);
  chk('W'+W+' T'+T+' зазор '+clr+': две стенки и полость между ними', r.length === 2, r.length);
  if(r.length !== 2) continue;
  const cav = r[1][0] - r[0][1];
  chk('W'+W+' T'+T+' зазор '+clr+': полость = головка + два зазора',
      Math.abs(cav - (W + 2*clr)) < 0.02, {надо:+(W+2*clr).toFixed(2), есть:+cav.toFixed(2)});
  chk('W'+W+' T'+T+' зазор '+clr+': стенка заданная',
      Math.abs((r[0][1]-r[0][0]) - 1.6) < 0.02, +(r[0][1]-r[0][0]).toFixed(2));
  chk('W'+W+' T'+T+' зазор '+clr+': габарит = головка + зазоры + две стенки',
      Math.abs((b.x1-b.x0) - (W + 2*clr + 3.2)) < 0.02, +(b.x1-b.x0).toFixed(2));
}

console.log('=== верх открыт, если не просили крышку ===');
for(const H of [20, 40]){
  const open = build({mntKcMode:'sleeve', mntKcH:H, mntKcCap:false}),
        capd = build({mntKcMode:'sleeve', mntKcH:H, mntKcCap:true});
  const covered = t => { const b = bb(t);
    for(const T of t) if(T.every(v => Math.abs(v[1] - b.y1) < 1e-6)){
      const xs = T.map(v=>v[0]), zs = T.map(v=>v[2]);
      if(Math.min(...xs) <= 0 && Math.max(...xs) >= 0 && Math.min(...zs) <= 0 && Math.max(...zs) >= 0) return true; }
    return false; };
  chk('H'+H+': без крышки верх открыт', !covered(open));
  chk('H'+H+': с крышкой закрыт', covered(capd));
  chk('H'+H+': крышка прибавляет высоту на свою стенку',
      Math.abs(((bb(capd).y1-bb(capd).y0) - (bb(open).y1-bb(open).y0)) - 1.6) < 0.02,
      {без:+(bb(open).y1-bb(open).y0).toFixed(2), с:+(bb(capd).y1-bb(capd).y0).toFixed(2)});
  // надевается не на всю высоту: родное отверстие ключа должно остаться снаружи
  chk('H'+H+': по умолчанию надевается не на всю головку', keyCoverSpec(paramState.box).deep < H - 1,
      keyCoverSpec(paramState.box).deep);
}

console.log('=== имя и предупреждения ===');
{
  chk('размеры головки в имени', /23×25×2.4/.test(activeShapeLabel(Object.assign(paramState.box,
      defaultBoxParams(), {mntMode:'keycover'}))), activeShapeLabel());
  chk('и режим тоже', /половинками/.test(activeShapeLabel()), activeShapeLabel());
  chk('справка на месте', !!MODEL_HELP['mount:keycover']);
  const S = keyCoverSpec(Object.assign(defaultBoxParams(), {mntMode:'keycover', mntKcClr:0.9}));
  chk('слишком большой зазор виден спецификации', S.loose);
  const S2 = keyCoverSpec(Object.assign(defaultBoxParams(), {mntMode:'keycover', mntKcClr:0}));
  chk('нулевой зазор виден тоже', S2.tight);
}
/* ПОЛОВИНКИ ПОД СКЛЕЙКУ. Их две, они одинаковы, лежат плашмя и у каждой карман на ПОЛОВИНУ толщины
   головки: сойдясь на ключе, они смыкаются по его кромке. Карман нужен для совмещения при склейке, а не
   для держания — держит клей, и поэтому в посадку попадать не нужно. */
console.log('=== две половины под склейку ===');
for(const W of [16, 30]) for(const H of [20, 34]) for(const T of [1.6, 3]){
  const t = build({mntKcMode:'halves', mntKcW:W, mntKcH:H, mntKcT:T, mntKcWall:1.6});
  const mc = manifoldCheck(t, 4);
  chk('W'+W+' H'+H+' T'+T+': герметичны', mc.watertight && mc.badEdges === 0,
      {open:mc.openEdges, bad:mc.badEdges});
  /* «Две» считаются ПРОСВЕТОМ, а не оболочками: каждая половинка сложена из подложки и бортика, которые
     пересекаются, и `meshComponents` насчитает четыре куска на две детали. Луч поперёк подложек встречает
     две полосы материала с пустотой между ними — вот это и есть две половинки. */
  chk('W'+W+' H'+H+' T'+T+': их ровно две', runsX(t, bb(t).y0 + 0.5, 0).length === 2,
      runsX(t, bb(t).y0 + 0.5, 0).length);
  const b = bb(t);
  chk('W'+W+' H'+H+' T'+T+': толщина = подложка + полтолщины головки',
      Math.abs((b.y1-b.y0) - (1.6 + T/2)) < 0.02, +(b.y1-b.y0).toFixed(2));
  // карман: луч поперёк одной половинки на уровне бортика встретит бортик, карман, бортик
  const oneX = -(W + 3.2 + 4)/2;
  const r = runsX(t, b.y1 - 0.2, 0).filter(q => q[1] < 0);
  chk('W'+W+' H'+H+' T'+T+': у половинки бортик и карман', r.length === 2, r.length);
  if(r.length === 2) chk('W'+W+' H'+H+' T'+T+': карман по ширине головки',
      Math.abs((r[1][0] - r[0][1]) - (W + 0.5)) < 0.06, +(r[1][0]-r[0][1]).toFixed(2));
  void oneX;
}
{
  // Половинки печатаются ПЛАШМЯ: они шире, чем высоки, — иначе слои легли бы поперёк отрыва.
  const t = build({mntKcMode:'halves', mntKcW:23, mntKcH:25, mntKcT:2.4});
  const b = bb(t);
  chk('половинки лежат плашмя', (b.y1-b.y0) < (b.z1-b.z0)/3, {толщина:+(b.y1-b.y0).toFixed(2), высота:+(b.z1-b.z0).toFixed(2)});
  chk('и стоят рядом, а не друг на друге', (b.x1-b.x0) > (b.z1-b.z0), {ширина:+(b.x1-b.x0).toFixed(1)});
}

console.log('=== TOTAL: ' + pass + ' passed, ' + fail + ' failed ===');
if(fail) process.exit(1);
