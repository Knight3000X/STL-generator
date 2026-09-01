// Двустенный подстаканник — two coaxial walls with an air gap, tied by a rim at the top and a floor at the
// bottom. Four closed shells that overlap in volume; the insulating cavity is the region none of them
// reaches, and nothing is drawn to bound it.
//
// That is exactly why the cavity has to be measured rather than assumed. It is not a surface anyone wrote,
// it is a hole in an overlap, and it exists only as long as all four shells stay where they were put. A
// depth-counted ray across the section is the instrument: parity counting would call the inside of an
// overlap hollow and report a cavity where the shells have in fact grown together. Run via ./run-all.sh.
let pass=0, fail=0;
function chk(n,c,e){if(c){pass++;console.log('  OK  ',n);}else{fail++;console.log('  FAIL',n,e!==undefined?JSON.stringify(e):'');}}
function vol(t){let v=0;for(const T of t){const a=T[0],b=T[1],c=T[2];v+=(a[0]*(b[1]*c[2]-b[2]*c[1])-a[1]*(b[0]*c[2]-b[2]*c[0])+a[2]*(b[0]*c[1]-b[1]*c[0]))/6;}return v;}
function setp(ov){ logos.length=0; boxHoles.length=0; dieFaces.length=0;
  Object.assign(paramState.box, defaultBoxParams(), {gfBaseplate:false, mntMode:'cupholder',
    mntCupD:70, mntCupH:80, mntCupGap:4, mntCupWall:1.6, mntCupBase:2.5}, ov); return paramState.box; }
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

console.log('=== сборка ===');
for(const D of [30, 70, 120]) for(const gap of [1.5, 4, 10]) for(const bt of [0, 2.5]){
  const t = mk({mntCupD:D, mntCupGap:gap, mntCupBase:bt}), mc = manifoldCheck(t,4);
  const s = cupHolderSpec(paramState.box);
  chk('Ø'+D+' зазор '+gap+' дно '+bt+': замкнут', mc.watertight && vol(t)>0, {open:mc.openEdges, bad:mc.badEdges});
  chk('Ø'+D+' зазор '+gap+' дно '+bt+': обмотка', minDepth(t,1,0,0)===0 && minDepth(t,0,0.7,0.3)===0);
  chk('Ø'+D+' зазор '+gap+' дно '+bt+': оболочек столько, сколько построено',
      meshComponents(t).length === s.shells, meshComponents(t).length + ' vs ' + s.shells);
}

console.log('=== прослойка есть и она такая, как заказана ===');
for(const D of [40, 70, 100]) for(const gap of [2, 4, 8]) for(const w of [1.2, 2, 3]){
  const t = mk({mntCupD:D, mntCupGap:gap, mntCupWall:w});
  const s = cupHolderSpec(paramState.box);
  // Mid height, off the axis so no vertex line is hit: outer wall, cavity, inner wall, bore, and the
  // mirror image of all three on the far side.
  const runs = solidRuns(t, 0, 0, 0.7);
  chk('Ø'+D+' зазор '+gap+' стенка '+w+': четыре стенки в сечении', runs.length === 4, runs.map(r=>r.map(x=>+x.toFixed(2))));
  if(runs.length === 4){
    chk('Ø'+D+' зазор '+gap+' стенка '+w+': прослойка = зазору',
        Math.abs((runs[1][0]-runs[0][1]) - gap) < 0.05 && Math.abs((runs[3][0]-runs[2][1]) - gap) < 0.05,
        [+(runs[1][0]-runs[0][1]).toFixed(3), +(runs[3][0]-runs[2][1]).toFixed(3)]);
    chk('Ø'+D+' зазор '+gap+' стенка '+w+': обе стенки в свою толщину',
        runs.every(r => Math.abs((r[1]-r[0]) - w) < 0.06), runs.map(r=>+(r[1]-r[0]).toFixed(3)));
    chk('Ø'+D+' зазор '+gap+' стенка '+w+': стакан входит',
        Math.abs((runs[2][0] - runs[1][1]) - (D + 2*s.clr)) < 0.12, +(runs[2][0]-runs[1][1]).toFixed(2));
    chk('Ø'+D+' зазор '+gap+' стенка '+w+': наружный Ø = стакан + две стенки + зазор + две стенки',
        Math.abs((runs[3][1] - runs[0][0]) - 2*s.Ro) < 0.12, +(runs[3][1]-runs[0][0]).toFixed(2));
  }
}

console.log('=== обод сверху, дно снизу ===');
for(const bt of [0, 2, 5]){
  const t = mk({mntCupBase:bt});
  const s = cupHolderSpec(paramState.box);
  const yTop = s.H/2 - s.rimT/2, yBot = -s.H/2 + Math.max(0.3, bt/2);
  const rim = solidRuns(t, 0, yTop, 0.7);
  chk('дно '+bt+': обод сплошной от стенки до стенки', rim.length === 2, rim.map(r=>r.map(x=>+x.toFixed(2))));
  // The rim's own band is 0.4 mm short of each wall, but the UNION reads from wall to wall: the walls
  // themselves are still there at that height, and the rim bridges what is between them.
  chk('дно '+bt+': обод перекрывает зазор',
      rim.length===2 && Math.abs((rim[0][1]-rim[0][0]) - (s.Ro-s.Ri)) < 0.12,
      rim.length===2 ? +(rim[0][1]-rim[0][0]).toFixed(2) : null);
  const base = solidRuns(t, 0, yBot, 0.7);
  if(bt > 0){
    chk('дно '+bt+': дно сплошное поперёк всей детали', base.length === 1, base.map(r=>r.map(x=>+x.toFixed(2))));
    chk('дно '+bt+': и оно шириной в наружный Ø',
        base.length===1 && Math.abs((base[0][1]-base[0][0]) - 2*s.Ro) < 0.12,
        base.length===1 ? +(base[0][1]-base[0][0]).toFixed(2) : null);
  } else {
    chk('без дна: снизу те же четыре стенки', base.length === 4, base.length);
    chk('без дна: прослойка открыта книзу', base.length===4 && (base[1][0]-base[0][1]) > s.gap - 0.05);
  }
  // whatever the floor, the two walls are one object: a ray up the outer wall runs its whole height
  const col = solidRuns(t, 1, 0.7, s.Ro - s.w/2);
  chk('дно '+bt+': наружная стенка идёт во всю высоту',
      col.length === 1 && Math.abs((col[0][1]-col[0][0]) - s.H) < 1e-6,
      col.map(r=>+(r[1]-r[0]).toFixed(2)));
}

console.log('=== высота и посадка ===');
for(const H of [30, 80, 200]) for(const D of [45, 90]){
  const t = mk({mntCupH:H, mntCupD:D});
  const s = cupHolderSpec(paramState.box);
  let lo=1e9, hi=-1e9; for(const T of t) for(const v of T){ if(v[1]<lo)lo=v[1]; if(v[1]>hi)hi=v[1]; }
  chk('H='+H+' Ø'+D+': высота выдержана', Math.abs((hi-lo) - H) < 1e-6, +(hi-lo).toFixed(3));
  chk('H='+H+' Ø'+D+': отцентрован по высоте', Math.abs(lo+hi) < 1e-9);
  chk('H='+H+' Ø'+D+': обод не толще шестой части высоты', s.rimT <= H/6 + 1e-9, s.rimT);
}

console.log('=== имя и предупреждения ===');
{
  chk('Ø в имени', /Ø70/.test(activeShapeLabel(setp({mntCupD:70}))), activeShapeLabel());
  const w1 = collectPrintWarnings(setp({mntCupGap:9}));
  chk('длинный мост обода назван', w1.some(x=>/мостить/.test(x)), w1);
  // v25.33.0: 0.8 мм — это РОВНО два прохода сопла 0.4, и жаловаться на неё было неправдой.
  // Теперь пол стенки идёт за соплом, и жалоба появляется там, где ручку действительно подняли.
  const w2 = collectPrintWarnings(setp({mntCupWall:0.8}));
  chk('два прохода сопла 0.4 — не повод жаловаться', !w2.some(x=>/прохода сопла/.test(x)), w2);
  const w2a = collectPrintWarnings(setp({mntCupWall:0.5}));
  chk('поднятая стенка названа обоими числами',
      w2a.some(x=>/стенка чашки поднята с 0\.50 до 0\.80 мм соплом 0\.4/.test(x)), w2a);
  const w2b = collectPrintWarnings(setp({mntCupWall:0.8, printNozzle:0.6}));
  chk('пол стенки идёт за соплом, а не за числом 0.8',
      w2b.some(x=>/стенка чашки поднята с 0\.80 до 1\.20 мм соплом 0\.6/.test(x)), w2b);
  chk('и подняли её именно до двух проходов', cupHolderSpec(setp({mntCupWall:0.8, printNozzle:0.6})).w === 1.2);
  const w3 = collectPrintWarnings(setp({mntCupH:15, mntCupBase:10}));
  chk('низкий подстаканник назван', w3.some(x=>/воздушной прослойки/.test(x)), w3);
  const w4 = collectPrintWarnings(setp({}));
  chk('умолчания — молча', !w4.some(x=>/мостить|прохода сопла|прослойки/.test(x)), w4);
  // «0 = без дна» has to mean zero, not "unset" — the v165 lesson, asserted rather than remembered
  chk('ноль означает «без дна»', cupHolderSpec(setp({mntCupBase:0})).bt === 0);
  chk('отсутствие означает умолчание', cupHolderSpec(setp({mntCupBase:undefined})).bt === 2.5);
}

console.log('=== TOTAL: ' + pass + ' passed, ' + fail + ' failed ===');
if(fail) process.exit(1);
