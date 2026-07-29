// Калибр go/no-go — two rings and two plugs on one plate. The only thing that can really be wrong here is
// which diameter goes where, and it is exactly the thing that cannot be seen in a preview: on a ±0.1 mm
// tolerance the GO and NO-GO of a pair differ by 0.2 mm. So every diameter is measured OFF THE MESH and
// checked against the limit it is supposed to be, not against the nominal it was derived from.
//
// A shaft is checked through rings — GO bore = the shaft's upper limit, NO-GO bore = its lower. A hole is
// checked with plugs and the two swap over — GO plug = the hole's lower limit, NO-GO plug = its upper.
// Crosswise, and a gauge with the pair the wrong way round passes every geometric check but accepts every
// part it should reject. Run via ./run-all.sh.
let pass=0, fail=0;
function chk(n,c,e){if(c){pass++;console.log('  OK  ',n);}else{fail++;console.log('  FAIL',n,e!==undefined?JSON.stringify(e):'');}}
function vol(t){let v=0;for(const T of t){const a=T[0],b=T[1],c=T[2];v+=(a[0]*(b[1]*c[2]-b[2]*c[1])-a[1]*(b[0]*c[2]-b[2]*c[0])+a[2]*(b[0]*c[1]-b[1]*c[0]))/6;}return v;}
function setp(ov){ logos.length=0; boxHoles.length=0; dieFaces.length=0;
  Object.assign(paramState.box, defaultBoxParams(), {gfBaseplate:false, mntMode:'gauge',
    mntGaugeD:8, mntGaugeTol:0.1, mntGaugeH:12, mntT:4}, ov); return paramState.box; }
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
// Widest chord of the void at column k, on the plate's mid plane — the bore, measured rather than trusted.
function boreAt(t, s, k, y){
  let best = 0;
  for(let i=-40;i<=40;i++){
    const z = i*0.05, runs = solidRuns(t, 0, y, z);
    for(let r=0;r+1<runs.length;r++){
      const mid = (runs[r][1] + runs[r+1][0])/2;
      if(Math.abs(mid - s.xAt(k)) < s.pitch/3) best = Math.max(best, runs[r+1][0] - runs[r][1]); } }
  return best;
}
// Widest chord of the plug at column k, taken above the plate.
function pinAt(t, s, k, y){
  let best = 0;
  for(let i=-40;i<=40;i++){
    const z = i*0.05;
    for(const r of solidRuns(t, 0, y, z))
      if(Math.abs((r[0]+r[1])/2 - s.xAt(k)) < s.pitch/3) best = Math.max(best, r[1]-r[0]); }
  return best;
}

console.log('=== сборка ===');
for(const d of [4, 8, 20, 50]) for(const tol of [0.05, 0.1, 0.4]){
  const t = mk({mntGaugeD:d, mntGaugeTol:tol}), mc = manifoldCheck(t,4);
  chk('Ø'+d+' ±'+tol+': замкнут', mc.watertight && vol(t)>0, {open:mc.openEdges, bad:mc.badEdges});
  chk('Ø'+d+' ±'+tol+': обмотка', minDepth(t,1,0.9,0)===0 && minDepth(t,0,0,0.9)===0);
  chk('Ø'+d+' ±'+tol+': плита и две пробки', meshComponents(t).length === 3, meshComponents(t).length);
}

console.log('=== крест-накрест: кольца и пробки ===');
for(const d of [6, 12, 30]) for(const tol of [0.08, 0.25]){
  const t = mk({mntGaugeD:d, mntGaugeTol:tol});
  const s = goNoGoSpec(paramState.box);
  const yP = -(s.t+s.H)/2 + s.t/2, yPin = -(s.t+s.H)/2 + s.t + s.H/2;
  const bGo = boreAt(t, s, 0, yP), bNo = boreAt(t, s, 1, yP);
  const pGo = pinAt(t, s, 2, yPin), pNo = pinAt(t, s, 3, yPin);
  chk('Ø'+d+' ±'+tol+': проходное кольцо = верхний предел вала',
      Math.abs(bGo - (d+tol)) < 0.05, {bGo:+bGo.toFixed(3), want:d+tol});
  chk('Ø'+d+' ±'+tol+': непроходное кольцо = нижний предел вала',
      Math.abs(bNo - (d-tol)) < 0.05, {bNo:+bNo.toFixed(3), want:d-tol});
  chk('Ø'+d+' ±'+tol+': проходная пробка = нижний предел отверстия',
      Math.abs(pGo - (d-tol)) < 0.05, {pGo:+pGo.toFixed(3), want:d-tol});
  chk('Ø'+d+' ±'+tol+': непроходная пробка = верхний предел отверстия',
      Math.abs(pNo - (d+tol)) < 0.05, {pNo:+pNo.toFixed(3), want:d+tol});
  // ...and the crosswise relation itself, stated once as an inequality so a matched-pair mistake shows up
  // even if both members drifted together.
  chk('Ø'+d+' ±'+tol+': кольцо GO шире кольца NO-GO, пробка GO уже пробки NO-GO',
      bGo > bNo + tol && pGo < pNo - tol, {bGo:+bGo.toFixed(3), bNo:+bNo.toFixed(3), pGo:+pGo.toFixed(3), pNo:+pNo.toFixed(3)});
  // the two that must NOT pass are the two the back edge is notched over
  const marks = solidRuns(t, 0, yP, s.D/2 - s.mark*0.5);
  chk('Ø'+d+' ±'+tol+': задняя кромка надрезана над непроходными', marks.length === 3, marks.length);
  chk('Ø'+d+' ±'+tol+': надрезы стоят над колонками 1 и 3', marks.length === 3 &&
      Math.abs((marks[0][1]+marks[1][0])/2 - s.xAt(1)) < 0.2 &&
      Math.abs((marks[1][1]+marks[2][0])/2 - s.xAt(3)) < 0.2,
      marks.map(r=>r.map(x=>+x.toFixed(2))));
}

console.log('=== пробки стоят на плите, а не рядом с ней ===');
for(const d of [8, 24]){
  const t = mk({mntGaugeD:d});
  const s = goNoGoSpec(paramState.box);
  for(const k of [2,3]){
    const col = solidRuns(t, 1, 0.9, s.xAt(k));       // along Y, just off the plug's own axis
    chk('Ø'+d+' колонка '+k+': плита и пробка — один сплошной кусок', col.length === 1, col.map(r=>r.map(x=>+x.toFixed(2))));
    chk('Ø'+d+' колонка '+k+': высота пробки', col.length===1 && Math.abs((col[0][1]-col[0][0]) - (s.t+s.H)) < 1e-6,
        col.length===1 ? +(col[0][1]-col[0][0]).toFixed(3) : null);
  }
  // and the ring columns are plate ONLY — a plug over a bore would make the gauge useless
  for(const k of [0,1]){
    const col = solidRuns(t, 1, 0.9, s.xAt(k));
    chk('Ø'+d+' колонка '+k+': над кольцом ничего не стоит', col.length === 0, col.length);
  }
}

console.log('=== предупреждения ===');
{
  const w1 = collectPrintWarnings(setp({mntGaugeD:8, mntGaugeTol:0.03}));
  chk('слишком тонкий допуск назван', w1.some(x=>/допуск/.test(x)), w1);
  const w2 = collectPrintWarnings(setp({mntGaugeD:1.4, mntGaugeTol:0.45}));
  chk('слишком тонкая пробка названа', w2.some(x=>/пробка/.test(x)), w2);
  const w3 = collectPrintWarnings(setp({mntGaugeD:10, mntGaugeTol:0.2}));
  chk('нормальный калибр — молча', !w3.some(x=>/допуск|пробка/.test(x)), w3);
  chk('допуск не может съесть номинал', goNoGoSpec(setp({mntGaugeD:6, mntGaugeTol:9})).pinGo > 0);
}

console.log('=== имя ===');
chk('назван', /калибр/i.test(activeShapeLabel(setp({}))), activeShapeLabel());

console.log('=== TOTAL: ' + pass + ' passed, ' + fail + ' failed ===');
if(fail) process.exit(1);
