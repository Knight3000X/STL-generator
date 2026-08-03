// Шаблон шага резьбы — ЗУБ. A spine with one blade per STANDARD pitch inside the requested range; two things
// have to be right and neither shows in a preview: the spacing of the teeth on each blade (that is what the
// tool reads) and their depth (that is what makes a right-pitch blade seat instead of rock).
//
// The LAYOUT of those blades — stacked rather than side by side, the clear space under each one, the
// internal finger, the shared spacing parameter — is test_gauges2.js. This file is about the tooth form and
// nothing else, so the two do not restate each other.
//
// Both are measured off the mesh, and the depth is checked against 0.5413·P — the ISO H1, which here is not
// a constant copied in but the consequence of the profile the blade is cut to: crest flat P/8, root flat
// P/4, 60° flanks. If the flanks drift off 60° the depth stops agreeing with the formula, so one number
// catches the whole tooth form. Run via ./run-all.sh.
let pass=0, fail=0;
function chk(n,c,e){if(c){pass++;console.log('  OK  ',n);}else{fail++;console.log('  FAIL',n,e!==undefined?JSON.stringify(e):'');}}
function vol(t){let v=0;for(const T of t){const a=T[0],b=T[1],c=T[2];v+=(a[0]*(b[1]*c[2]-b[2]*c[1])-a[1]*(b[0]*c[2]-b[2]*c[0])+a[2]*(b[0]*c[1]-b[1]*c[0]))/6;}return v;}
function setp(ov){ logos.length=0; boxHoles.length=0; dieFaces.length=0;
  Object.assign(paramState.box, defaultBoxParams(), {gfBaseplate:false, mntMode:'pitchgauge',
    mntPitchMin:0.7, mntPitchMax:2, mntT:4}, ov); return paramState.box; }
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
// Every mesh vertex belonging to level k's blade, as (x, z). Blades hang off the RIGHT of the spine and
// each one owns a band of z, so both coordinates have to be asked about.
function bladePts(t, s, k){
  const out = [];
  for(const T of t) for(const v of T)
    if(v[0] > s.hs/2 && v[2] > s.zAt(k) - 1e-6 && v[2] < s.zAt(k) + s.bl + 1e-6) out.push([v[0], v[2]]);
  return out;
}
// A ray straight across level k's teeth, at `frac` of the way up the tooth from tip to root.
const toothRuns = (t, s, k, frac) => solidRuns(t, 0, 0, s.zAt(k) + s.td(s.list[k])*frac)
  .filter(r => (r[0]+r[1])/2 > s.hs/2);

console.log('=== список шагов ===');
{
  const s = pitchGaugeSpec(setp({mntPitchMin:0.7, mntPitchMax:2}));
  chk('по умолчанию 0.7…2 — восемь стандартных шагов',
      JSON.stringify(s.list) === JSON.stringify([0.7,0.75,0.8,1,1.25,1.5,1.75,2]), s.list);
  chk('шаги строго стандартные', s.list.every(v=>ISO_PITCHES.indexOf(v) >= 0), s.list);
  chk('шаги идут по возрастанию', s.list.every((v,i)=>i===0 || v > s.list[i-1]), s.list);
  const wide = pitchGaugeSpec(setp({mntPitchMin:0.3, mntPitchMax:3.5}));
  chk('весь ряд помещается', wide.n === ISO_PITCHES.length, wide.n);
  const none = pitchGaugeSpec(setp({mntPitchMin:0.85, mntPitchMax:0.95}));
  chk('пустой промежуток не даёт пустой шаблон', none.n === 1 && none.empty, none.list);
  chk('и подставлен ближайший стандартный', none.list[0] === 0.8, none.list);
  const rev = pitchGaugeSpec(setp({mntPitchMin:2, mntPitchMax:0.5}));
  chk('перевёрнутый промежуток не роняет', rev.n >= 1, rev.list);
}

console.log('=== сборка ===');
for(const lo of [0.35, 0.7, 1.25]) for(const hi of [1, 2, 3.5]){
  if(hi < lo) continue;
  const t = mk({mntPitchMin:lo, mntPitchMax:hi}), mc = manifoldCheck(t,4);
  chk(lo+'…'+hi+': замкнут', mc.watertight && vol(t)>0, {open:mc.openEdges, bad:mc.badEdges});
  chk(lo+'…'+hi+': обмотка', minDepth(t,1,0.13,0.29)===0 && minDepth(t,2,0.13,0.29)===0);
  // Spine, one blade per pitch, and the raised strokes of the digits: every one an independent closed
  // shell sunk into its neighbour. Interpenetrating volumes, never a shared face.
  const sp = pitchGaugeSpec(paramState.box);
  let bars = 0; for(const v of sp.list) bars += seg7BarsXZ(fmtNum(v), 0, 0, sp.digit).length;
  chk(lo+'…'+hi+': хребет, лепестки и штрихи цифр', meshComponents(t).length === 1 + sp.n + bars,
      meshComponents(t).length + ' vs ' + (1 + sp.n + bars));
}

console.log('=== шаг зубьев, снятый с меша ===');
for(const lo of [0.4, 0.7]) for(const hi of [1.5, 3]){
  const t = mk({mntPitchMin:lo, mntPitchMax:hi});
  const s = pitchGaugeSpec(paramState.box);
  let okPitch = 0, okCount = 0, okDepth = 0;
  for(let k=0;k<s.n;k++){
    const pk = s.list[k], td = s.td(pk), nT = s.nTeeth(pk);
    const runs = toothRuns(t, s, k, 0.5);              // half a tooth up: cuts every tooth of this blade
    if(runs.length === nT) okCount++;
    if(runs.length >= 3){
      let worst = 0;
      for(let i=0;i+1<runs.length;i++){
        const step = (runs[i+1][0]+runs[i+1][1])/2 - (runs[i][0]+runs[i][1])/2;
        worst = Math.max(worst, Math.abs(step - pk)); }
      if(worst < 0.01) okPitch++;
    }
    // Depth: the tooth tips sit on the level's own line and the roots one depth above it. 0.5413·P falls
    // out of the 60° flanks, so a wrong flank angle shows up here without the angle being measured.
    const pts = bladePts(t, s, k);
    let zMin = 1e9; for(const q of pts) zMin = Math.min(zMin, q[1]);
    if(Math.abs(zMin - s.zAt(k)) < 1e-6 && Math.abs(td - 0.5413*pk) < 1e-9) okDepth++;
  }
  chk(lo+'…'+hi+': шаг зубьев = заявленному', okPitch === s.n, okPitch+'/'+s.n);
  chk(lo+'…'+hi+': число зубьев на лепестке', okCount === s.n, okCount+'/'+s.n);
  chk(lo+'…'+hi+': глубина зуба = 0.5413·P', okDepth === s.n, okDepth+'/'+s.n);
}

console.log('=== профиль зуба ===');
{
  const t = mk({mntPitchMin:1.5, mntPitchMax:1.5});
  const s = pitchGaugeSpec(paramState.box), pk = s.list[0], td = s.td(pk);
  // Width of a tooth measured at two heights gives the flank angle without trusting any single vertex:
  // over a rise of Δz the tooth narrows by 2·Δz·tan(30°), which is the 60° included angle.
  const width = frac => {
    const runs = toothRuns(t, s, 0, frac);
    const mid = runs[Math.floor(runs.length/2)];
    return mid ? mid[1]-mid[0] : NaN; };
  const w1 = width(0.2), w2 = width(0.8), rise = td*0.6;
  chk('фланки идут под 60°', Math.abs((w2 - w1) - 2*rise*Math.tan(Math.PI/6)) < 0.02,
      {w1:+w1.toFixed(3), w2:+w2.toFixed(3), want:+(2*rise*Math.tan(Math.PI/6)).toFixed(3)});
  chk('вершина зуба — площадка P/8', Math.abs(w1 - (pk/8 + 2*td*0.2*Math.tan(Math.PI/6))) < 0.02,
      {w1:+w1.toFixed(3), want:+(pk/8 + 2*td*0.2*Math.tan(Math.PI/6)).toFixed(3)});
}

console.log('=== зубья не срослись, хребет сплошной ===');
for(const lo of [0.5, 1]){
  const t = mk({mntPitchMin:lo, mntPitchMax:2.5});
  const s = pitchGaugeSpec(paramState.box);
  for(let k=0;k<s.n;k++){
    const runs = toothRuns(t, s, k, 0.5);
    chk(lo+'…2.5, уровень '+k+': между зубьями просвет', runs.length >= 3, runs.length);
    chk(lo+'…2.5, уровень '+k+': зубьев столько, сколько посчитано',
        runs.length === s.nTeeth(s.list[k]), runs.length + ' vs ' + s.nTeeth(s.list[k]));
  }
  const spine = solidRuns(t, 2, 0, 0);                 // fore and aft down the spine's own line
  chk(lo+'…2.5: хребет сплошной', spine.length === 1, spine);
}

console.log('=== шаг подписан у своего уровня ===');
for(const lo of [0.35, 0.7]) for(const hi of [1.5, 3.5]){
  const t = mk({mntPitchMin:lo, mntPitchMax:hi});
  const s = pitchGaugeSpec(paramState.box);
  let stamped = 0, fits = 0;
  for(let k=0;k<s.n;k++){
    const txt = fmtNum(s.list[k]);
    // Laid flat on the spine, reading across it: the spine is a handle and a handle is wide enough for
    // digits anyway, so nothing has to be turned.
    let found = 0, bars = seg7BarsXZ(txt, -seg7Width(txt, s.digit)/2, s.zAt(k) + s.digit + 0.5, s.digit);
    for(const b of bars){
      const x = b[0] + (b[1]-b[0])*0.37, z = b[2] + (b[3]-b[2])*0.29;
      // Off-centre on purpose: the middle of a box face sits on the diagonal between its two triangles,
      // and a ray through a shared edge is counted twice and reads as no crossing at all.
      const runs = solidRuns(t, 1, z, x);
      if(runs.length === 1 && runs[0][1] > s.t/2 + 0.5 && runs[0][0] < -s.t/2 + 1e-6) found++; }
    if(found === bars.length) stamped++;
    // ...and the label belongs ON the spine, within its width and within its own level
    if(seg7Width(txt, s.digit) + 3 <= s.hs && s.digit + 0.5 <= s.rowH) fits++;
  }
  chk(lo+'…'+hi+': каждый шаг подписан', stamped === s.n, stamped+'/'+s.n);
  chk(lo+'…'+hi+': подписи умещаются на хребте', fits === s.n, fits+'/'+s.n);
  chk(lo+'…'+hi+': хребет шире самой длинной подписи',
      s.hs >= Math.max(...s.list.map(v=>seg7Width(fmtNum(v), s.digit))) + 3 - 1e-9, s.hs);
  chk(lo+'…'+hi+': подпись ниже уровня', s.digit + 0.5 <= s.rowH + 1e-9, {digit:s.digit, rowH:s.rowH});
}

console.log('=== имя и предупреждения ===');
{
  chk('диапазон и число в имени', /0\.7…2 мм, 8 шт\./.test(activeShapeLabel(setp({mntPitchMin:0.7, mntPitchMax:2}))),
      activeShapeLabel());
  chk('род резьбы в имени', /наружной/.test(activeShapeLabel(setp({mntPitchKind:'ext'}))) &&
      /внутренней/.test(activeShapeLabel(setp({mntPitchKind:'int'}))), activeShapeLabel());
  const w1 = collectPrintWarnings(setp({mntPitchMin:0.85, mntPitchMax:0.95}));
  chk('пустой промежуток назван', w1.some(x=>/стандартного шага/.test(x)), w1);
  const w2 = collectPrintWarnings(setp({mntPitchMin:0.35, mntPitchMax:1}));
  chk('слишком мелкий зуб назван', w2.some(x=>/зуб шага/.test(x)), w2);
  const w3 = collectPrintWarnings(setp({mntPitchMin:1, mntPitchMax:2, mntGaugeGap:10}));
  chk('нормальный шаблон — молча', !w3.some(x=>/зуб шага|стандартного шага|просвет/.test(x)), w3);
}

console.log('=== TOTAL: ' + pass + ' passed, ' + fail + ' failed ===');
if(fail) process.exit(1);
