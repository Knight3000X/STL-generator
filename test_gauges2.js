// Шаблон диаметров стойками — и просвет, который он делит с шаблоном радиусов.
//
// Стойка меряет отверстие тем, что в него входит, и меряет ТОЛЬКО если она цилиндр: конус покажет не
// размер отверстия, а глубину, на которую вы его надвинули. Поэтому здесь каждая стойка проверяется
// хордой поперёк себя на трёх высотах — сотые доли миллиметра, одинаковые сверху донизу.
//
// Хорда, а не диаметр через ось: луч вдоль оси правильной призмы с чётным числом граней идёт по ребру
// между двумя гранями и считается либо обеими, либо ни одной — та же вырожденность, из-за которой не
// читался центр грани у куба. Хорда на известном отступе e равна 2·√(r²−e²), говорит о диаметре ровно
// столько же и не спотыкается ни о какую вершину.
//
// Шаблон шага резьбы гребёнкой снят в v17.7.2 — его заменил многогранник (`test_polygauge.js`), и
// проверки гребёнки ушли вместе с ней. Запускается через ./run-all.sh.
let pass=0, fail=0;
function chk(n,c,e){if(c){pass++;console.log('  OK  ',n);}else{fail++;console.log('  FAIL',n,e!==undefined?JSON.stringify(e):'');}}
const near = (a,b,eps) => Math.abs(a-b) < (eps||1e-6);

const DEF = {}; for(const sk in SHAPE_PARAMS) for(const r of SHAPE_PARAMS[sk]) if(DEF[r.key]===undefined) DEF[r.key]=r.default;
const build = over => buildTrisForShape('box', Object.assign({}, DEF, {shape:'box'}, over));
const bbox = tris => { const lo=[1e9,1e9,1e9], hi=[-1e9,-1e9,-1e9];
  for(const T of tris) for(const v of T) for(let i=0;i<3;i++){ if(v[i]<lo[i])lo[i]=v[i]; if(v[i]>hi[i])hi[i]=v[i]; }
  return {lo, hi}; };
const wt = tris => { const m = manifoldCheck(tris, 4); return m.watertight; };

// Solid intervals along a ray, counted by DEPTH — parity cannot tell an inverted shell from a solid one.
// Axis `ax`; the ray is fixed at (p, q) on axes (ax+1)%3 and (ax+2)%3 IN THAT ORDER, which for a ray up Y
// means (z, x) and not (x, z).
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
const rayY = (tris, x, z) => solidRuns(tris, 1, z, x);     // straight up, at (x, z)
const rayX = (tris, y, z) => solidRuns(tris, 0, y, z);     // across, at (y, z)
const rayZ = (tris, x, y) => solidRuns(tris, 2, x, y);     // fore and aft, at (x, y)


console.log('=== шаблон диаметров: стойки и есть размер ===');
for(const o of [{}, {mntPinN:2}, {mntPinN:20}, {mntPinStart:0.8, mntPinStep:0.1},
                {mntPinStart:20, mntPinStep:5}, {mntGaugeGap:0}, {mntGaugeGap:20}, {mntPinH:60}]){
  const over = Object.assign({mntMode:'pingauge'}, o);
  const tris = build(over);
  chk('стойки '+JSON.stringify(o)+': водонепроницаемы', wt(tris), manifoldCheck(tris,4));
}
{
  const p = Object.assign({}, DEF, {mntMode:'pingauge'});
  const s = pinGaugeSpec(p), tris = build({mntMode:'pingauge'});
  chk('диаметры идут по возрастанию', s.ds.every((d,i)=>i===0||d>s.ds[i-1]), s.ds);
  chk('шаг диаметров тот, что задан', s.ds.every((d,i)=>i===0||near(d-s.ds[i-1], s.dd, 1e-9)), s.ds);
  const b = bbox(tris), base = b.lo[1];
  // Measure each post across its own middle: a chord through the axis has to be the declared diameter, at
  // every height. This is what a cylinder buys and a cone does not — a cone measures the depth you pushed to.
  for(let k=0;k<s.n;k++){
    // OFF the axis by a known fraction of the radius. A ray straight down the axis of an even-sided prism
    // runs along the edge between two facets and is counted by both or by neither — the same degeneracy
    // that made a box's face centre unreadable. A chord at offset e is 2·√(r²−e²), which is just as much a
    // statement about the diameter and has no vertex to trip over.
    const r = s.ds[k]/2, e = r*0.37, chord = 2*Math.sqrt(r*r - e*e);
    for(const f of [0.2, 0.5, 0.9]){
      const y = base + s.t + s.H*f;
      const runs = rayX(tris, y, s.zPin + e);   // across the post row at this height
      const hit = runs.filter(rn => rn[0] < s.xAt(k) + r && rn[1] > s.xAt(k) - r);
      chk('стойка '+k+' на высоте '+f+': ровно одно тело', hit.length === 1, runs);
      if(hit.length !== 1) continue;
      // the facet count is finite, so the printed chord is a hair under the true one — never over
      const got = hit[0][1]-hit[0][0];
      chk('стойка '+k+' на высоте '+f+': Ø = ' + fmtNum(s.ds[k]) + ' (хорда ' + chord.toFixed(2) + ')',
          got <= chord + 1e-6 && got > chord - Math.max(0.03, chord*0.01), {got, chord});
    }
  }
  // ...and there is clear space between neighbours, which is what the spacing parameter is for
  for(const gap of [2, 6, 14]){
    const sg = pinGaugeSpec(Object.assign({}, DEF, {mntGaugeGap:gap}));
    const tg = build({mntMode:'pingauge', mntGaugeGap:gap});
    const bg = bbox(tg);
    for(let k=1;k<sg.n;k++){
      const xMid = (sg.xAt(k-1) + sg.xAt(k))/2, y = bg.lo[1] + sg.t + sg.H*0.5;
      const runs = rayZ(tg, xMid, y);       // fore and aft between two posts, above the plate
      chk('зазор '+gap+': между стойками '+(k-1)+' и '+k+' пусто', runs.length === 0, runs);
    }
    chk('зазор '+gap+': шаг не меньше Ø + зазора', sg.pitch >= sg.dMax + gap - 1e-9, sg.pitch);
  }
  const thin = collectPrintWarnings(Object.assign({}, DEF, {shape:'box', mntMode:'pingauge', mntPinStart:0.9}));
  chk('тонкая первая стойка — предупреждение есть', thin.some(w => w.indexOf('тоньше') >= 0), thin);
  const tall = collectPrintWarnings(Object.assign({}, DEF, {shape:'box', mntMode:'pingauge', mntPinStart:2, mntPinH:40}));
  chk('высокая тонкая стойка — предупреждение есть', tall.some(w => w.indexOf('отломится') >= 0), tall);
}

console.log('=== просвет — один параметр на оба шаблона ===');
{
  for(const v of [0, 3, 25, 40, 100, -5, null]){
    const g = gaugeGap({mntGaugeGap: v});
    chk('просвет '+v+' → '+g+' в пределах', g >= 0 && g <= 40, g);
  }
  chk('без параметра — умолчание', gaugeGap({}) === 4, gaugeGap({}));
  // both read it, and both answer to it
  const grows = (mode, key) => {
    const a = bbox(build(Object.assign({mntMode:mode}, {mntGaugeGap:1})));
    const b = bbox(build(Object.assign({mntMode:mode}, {mntGaugeGap:15})));
    return (b.hi[key]-b.lo[key]) > (a.hi[key]-a.lo[key]) + 10;
  };
  chk('шаблон радиусов слушает просвет', grows('radgauge', 0));
  chk('шаблон диаметров слушает просвет', grows('pingauge', 0));
}


console.log('=== TOTAL: ' + pass + ' passed, ' + fail + ' failed ===');
if(fail) process.exit(1);
