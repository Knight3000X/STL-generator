// Живой шарнир: a panel with a thin web across it that folds instead of pivoting. Nothing moves against
// anything, so there is no clearance to get right. The whole design is one number — the web — and it is
// governed by the printer's LAYER HEIGHT rather than by any dimension of the part.
//
// Two things decide whether it survives, and both are arithmetic the app should do rather than the user:
// the web has to be a whole small number of layers (one tears on the first fold, six is a plate with a
// groove in it), and folding a band of flat length w and thickness t through half a turn stretches its
// outer fibre by ε = π·t/(2w) — so what lowers the strain is a WIDER band, not a thinner one, which is
// the opposite of most people's first instinct.
//
// The geometric claims are equally sharp: the web must be flush with the BOTTOM face (the groove opens
// upward, the layers run along the fold, and a hinge printed the other way up delaminates), and plates and
// web must be ONE solid — a living hinge that comes apart is not a hinge. Run via ./run-all.sh.
let pass=0, fail=0;
function chk(n,c,e){if(c){pass++;console.log('  OK  ',n);}else{fail++;console.log('  FAIL',n,e!==undefined?JSON.stringify(e):'');}}
function vol(t){let v=0;for(const T of t){const a=T[0],b=T[1],c=T[2];v+=(a[0]*(b[1]*c[2]-b[2]*c[1])-a[1]*(b[0]*c[2]-b[2]*c[0])+a[2]*(b[0]*c[1]-b[1]*c[0]))/6;}return v;}
function setp(ov){ logos.length=0; boxHoles.length=0; dieFaces.length=0;
  Object.assign(paramState.box, defaultBoxParams(), {gfBaseplate:false, pipMode:'living',
    lhT:2.4, lhWebT:0, lhWebW:6, lhLayer:0.2, lhLen:60, lhA:25, lhB:25, lhN:1}, ov);
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
// Panel thickness at a position along Z, on the centre line: the ray runs along Y.
const thickAt = (t, z) => { const r = solidRuns(t, 1, z, 0.31);
  return r.length ? r[r.length-1][1] - r[0][0] : 0; };

console.log('=== builds across the range ===');
for(const T of [1.2,2.4,6]) for(const N of [1,3,8]){
  const m = mk({lhT:T, lhN:N}), mc = manifoldCheck(m,4);
  chk('панель '+T+' мм, сгибов '+N+': замкнута', mc.watertight && vol(m)>0, {open:mc.openEdges, bad:mc.badEdges});
}
for(const ov of [{lhWebT:0.15}, {lhWebT:2}, {lhWebW:0.6}, {lhWebW:30}, {lhLayer:0.05}, {lhLayer:0.5},
                 {lhLen:5}, {lhLen:300}, {lhA:200, lhB:3}, {lhN:12}]){
  const m = mk(ov), mc = manifoldCheck(m,4);
  chk('крайние параметры '+JSON.stringify(ov), mc.watertight && vol(m)>0, {open:mc.openEdges, bad:mc.badEdges});
}

console.log('=== it is ONE solid — a hinge that comes apart is not a hinge ===');
{ const m = mk({}), B = computeBBox(m);
  // A ray straight down the panel, at a height inside the WEB, must meet a single unbroken run: plate,
  // web and plate joined. Two runs would mean the web merely abuts the plates instead of overlapping them.
  const yWeb = B.minY + 0.1;
  const runs = solidRuns(m, 2, 0.31, yWeb);      // ax=2 → (u,v) = (x,y)
  chk('на высоте перемычки панель — один сплошной пролёт', runs.length === 1, {runs:runs.length});
  chk('и он тянется от края до края',
      runs.length === 1 && Math.abs((runs[0][1]-runs[0][0]) - (B.maxZ-B.minZ)) < 0.05,
      {span:runs.length ? +(runs[0][1]-runs[0][0]).toFixed(2) : 0, panel:+(B.maxZ-B.minZ).toFixed(2)});
  // With four folds it must still be one piece, not five.
  const m4 = mk({lhN:4}), B4 = computeBBox(m4);
  chk('и с четырьмя сгибами — по-прежнему одна деталь',
      solidRuns(m4, 2, 0.31, B4.minY+0.1).length === 1, {runs:solidRuns(m4,2,0.31,B4.minY+0.1).length});
}

console.log('=== the web is thin, and it is thin on the RIGHT side ===');
{ const m = mk({}), B = computeBBox(m), s = livingHingeSpec(setp({}));
  chk('створка — полной толщины', Math.abs(thickAt(m, B.minZ + 5) - 2.4) < 0.02,
      {t:+thickAt(m, B.minZ+5).toFixed(2)});
  chk('перемычка — заказанной толщины', Math.abs(thickAt(m, 0) - s.tw) < 0.02,
      {t:+thickAt(m, 0).toFixed(2), want:+s.tw.toFixed(2)});
  // The groove opens UPWARD: the web's underside is flush with the panel's, and the material is missing
  // off the top. Printed the other way up the layers would run across the fold and simply delaminate.
  const webRuns = solidRuns(m, 1, 0, 0.31), plateRuns = solidRuns(m, 1, B.minZ+5, 0.31);
  chk('низ перемычки заподлицо с низом панели', Math.abs(webRuns[0][0] - plateRuns[0][0]) < 1e-9,
      {web:+webRuns[0][0].toFixed(3), plate:+plateRuns[0][0].toFixed(3)});
  chk('а материала не хватает сверху', webRuns[0][1] < plateRuns[0][1] - 1,
      {web:+webRuns[0][1].toFixed(2), plate:+plateRuns[0][1].toFixed(2)});
}
{ // Web thickness is quantised by the LAYER, not by the slider: it is what the printer can actually lay.
  const s2 = livingHingeSpec(setp({lhLayer:0.2, lhWebT:0}));
  chk('по умолчанию перемычка — ровно два слоя', Math.abs(s2.layers - 2) < 1e-9, {layers:s2.layers});
  const s3 = livingHingeSpec(setp({lhLayer:0.3, lhWebT:0}));
  chk('на слое 0.3 — тоже два, но 0.6 мм', Math.abs(s3.layers-2) < 1e-9 && Math.abs(s3.tw-0.6) < 1e-9, {});
  chk('тоньше слоя печатать нечем — и это сказано',
      collectPrintWarnings(setp({lhWebT:0.1, lhLayer:0.3})).some(x=>/тоньше слоя/.test(x)),
      collectPrintWarnings(setp({lhWebT:0.1, lhLayer:0.3})));
  chk('и шесть слоёв — уже не шарнир',
      collectPrintWarnings(setp({lhWebT:1.2, lhLayer:0.2})).some(x=>/не шарнир/.test(x)), {});
}

console.log('=== the strain, and the counter-intuitive way to lower it ===');
// ε = π·t/(2w). Halving the web's THICKNESS halves it; doubling its WIDTH also halves it — and the
// second is the one that keeps the hinge printable, because the thickness is pinned to whole layers.
{ const a = livingHingeSpec(setp({lhWebT:0.4, lhWebW:6}));
  chk('деформация равна π·t/(2w)', Math.abs(a.strain - 100*Math.PI*0.4/12) < 1e-9, {eps:+a.strain.toFixed(2)});
  const wide = livingHingeSpec(setp({lhWebT:0.4, lhWebW:12}));
  chk('вдвое шире перемычка — вдвое меньше деформация', Math.abs(a.strain/wide.strain - 2) < 1e-9, {});
  const thin = livingHingeSpec(setp({lhWebT:0.2, lhWebW:6}));
  chk('вдвое тоньше — тоже вдвое меньше', Math.abs(a.strain/thin.strain - 2) < 1e-9, {});
  chk('но тонкая перемычка упирается в слой, а широкая — нет',
      livingHingeSpec(setp({lhWebT:0.2, lhWebW:6, lhLayer:0.3})).thin &&
      !livingHingeSpec(setp({lhWebT:0.4, lhWebW:12, lhLayer:0.2})).thin, {});
  chk('узкая перемычка отмечается как перегруженная',
      collectPrintWarnings(setp({lhWebW:1})).some(x=>/деформация/.test(x)), {});
  chk('а на умолчаниях предупреждений нет', collectPrintWarnings(setp({})).length === 0,
      collectPrintWarnings(setp({})));
}

console.log('=== the panel is the size it was asked for ===');
{ const B = computeBBox(mk({}));
  chk('длина вдоль оси сгиба', Math.abs((B.maxX-B.minX) - 60) < 1e-9, {});
  chk('толщина панели', Math.abs((B.maxY-B.minY) - 2.4) < 1e-9, {});
  chk('и ширина — створка + перемычка + створка', Math.abs((B.maxZ-B.minZ) - (25+6+25)) < 0.05,
      {got:+(B.maxZ-B.minZ).toFixed(2)});
  const asym = computeBBox(mk({lhA:60, lhB:10}));
  chk('створки задаются по отдельности', Math.abs((asym.maxZ-asym.minZ) - (60+6+10)) < 0.05, {});
  const four = computeBBox(mk({lhN:4}));
  chk('четыре сгиба — четыре перемычки и пять створок',
      Math.abs((four.maxZ-four.minZ) - (25 + 4*6 + 4*25)) < 0.05, {got:+(four.maxZ-four.minZ).toFixed(1)});
  const m4 = mk({lhN:4}), B4 = computeBBox(m4);
  let thin = 0;
  for(let k=0;k<400;k++){ const z = B4.minZ + 0.2 + (B4.maxZ-B4.minZ-0.4)*k/400;
    if(thickAt(m4, z) < 1.0) { thin++; } }
  chk('и тонких участков ровно четыре по счёту', (()=>{ let runs=0, was=false;
      for(let k=0;k<400;k++){ const z = B4.minZ + 0.2 + (B4.maxZ-B4.minZ-0.4)*k/400;
        const is = thickAt(m4, z) < 1.0; if(is && !was) runs++; was = is; } return runs; })() === 4,
      {thinSamples:thin});
}

console.log('=== no triangle is inside-out ===');
for(const [nm,ov] of [['шарнир',{}], ['четыре сгиба',{lhN:4}], ['толстая панель',{lhT:6}],
                      ['широкая перемычка',{lhWebW:20}], ['несимметричный',{lhA:60,lhB:8}]]){
  const m = mk(ov), B = computeBBox(m);
  let worst = 0, at = null;
  for(let k=1;k<12;k++){ const z = B.minZ + (B.maxZ-B.minZ)*(k+0.37)/12;
    for(const x of [0.31, -7.44, 12.83]){ const d = minDepth(m, 1, z, x);
      if(d < worst){ worst = d; at = [+z.toFixed(2), x]; } } }
  chk(nm+': глубина по лучу нигде не уходит в минус', worst===0, {depth:worst, at});
}

console.log('\n=== TOTAL:', pass, 'passed,', fail, 'failed ===');
if(fail) process.exitCode = 1;
