// Держатель на кромку — one constant cross-section: a hook over an edge, a tray coming back forward.
//
// The section is drawn as a POLYLINE and then given thickness, which is new machinery (ribbonXZ) and has
// exactly one way of going quietly wrong: at a corner, the naive offset — the average of the two segment
// normals — is short by cos(half angle), so a right-angled bend necks down to 0.71 of the wall it was
// asked for. That is 2.1 mm where 3 was ordered, at the one place the part is loaded hardest, and nothing
// about the preview would say so. So the wall is measured ON the bends, not only on the straights.
// Run via ./run-all.sh.
let pass=0, fail=0;
function chk(n,c,e){if(c){pass++;console.log('  OK  ',n);}else{fail++;console.log('  FAIL',n,e!==undefined?JSON.stringify(e):'');}}
function vol(t){let v=0;for(const T of t){const a=T[0],b=T[1],c=T[2];v+=(a[0]*(b[1]*c[2]-b[2]*c[1])-a[1]*(b[0]*c[2]-b[2]*c[0])+a[2]*(b[0]*c[1]-b[1]*c[0]))/6;}return v;}
function setp(ov){ logos.length=0; boxHoles.length=0; dieFaces.length=0;
  Object.assign(paramState.box, defaultBoxParams(), {gfBaseplate:false, mntMode:'edgeclip',
    mntClipT:20, mntClipW:3, mntClipBack:25, mntClipFront:20, mntClipTray:16,
    mntClipLip:8, mntClipWide:40}, ov); return paramState.box; }
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
// Distance from a point to the nearest edge of a closed 2D loop — the honest way to ask how thick a
// ribbon is at a bend, where no axis-aligned ray measures the wall perpendicular to itself.
function distToLoop(P, p){
  let best = Infinity;
  for(let i=0;i<P.length;i++){ const a=P[i], b=P[(i+1)%P.length];
    const ex=b[0]-a[0], ez=b[1]-a[1], L2=ex*ex+ez*ez;
    let t = L2>0 ? ((p[0]-a[0])*ex + (p[1]-a[1])*ez)/L2 : 0;
    t = Math.max(0, Math.min(1, t));
    best = Math.min(best, Math.hypot(p[0]-a[0]-t*ex, p[1]-a[1]-t*ez)); }
  return best;
}

console.log('=== сборка ===');
for(const T of [1.5, 20, 60]) for(const w of [1.6, 3, 6]) for(const wd of [12, 40]){
  const t = mk({mntClipT:T, mntClipW:w, mntClipWide:wd}), mc = manifoldCheck(t,4);
  chk('кромка '+T+', стенка '+w+', ширина '+wd+': замкнут', mc.watertight && vol(t)>0, {open:mc.openEdges, bad:mc.badEdges});
  chk('кромка '+T+', стенка '+w+', ширина '+wd+': обмотка', minDepth(t,1,0.13,0.29)===0 && minDepth(t,0,0.13,0.29)===0);
  chk('кромка '+T+', стенка '+w+', ширина '+wd+': одна оболочка', meshComponents(t).length === 1, meshComponents(t).length);
}

console.log('=== челюсть и полка, снятые с меша ===');
for(const T of [3, 20, 45]) for(const td of [10, 16, 30]){
  const t = mk({mntClipT:T, mntClipTray:td});
  const s = edgeClipSpec(paramState.box);
  // The part is centred on its own bounding box, so nothing here is measured from an absolute position:
  // gaps and midpoints are what the assertions use, and both survive any translation.
  let z0=1e9, z1=-1e9; for(const T2 of t) for(const v of T2){ if(v[2]<z0)z0=v[2]; if(v[2]>z1)z1=v[2]; }
  const zAt = zz => z0 + (zz + s.w/2);            // builder Z (path coordinates) → mesh Z
  // Two sections, because the two numbers do not live at the same height. The jaw is only its full width
  // ABOVE the bite's taper — below that it is deliberately narrower, which is what makes the clip grip —
  // so reading it low would report the taper as an error in the jaw.
  const runs = solidRuns(t, 0, 0, zAt(s.zTray + s.lh*0.6));
  const top  = solidRuns(t, 0, 0, zAt(s.bk*0.85));
  chk('кромка '+T+', полка '+td+': сечение над полкой — три стенки', runs.length === 3, runs.map(r=>r.map(x=>+x.toFixed(2))));
  chk('кромка '+T+', полка '+td+': сечение у корня — две лапы', top.length === 2, top.map(r=>r.map(x=>+x.toFixed(2))));
  if(top.length === 2)
    chk('кромка '+T+', полка '+td+': челюсть = толщине кромки',
        Math.abs((top[1][0] - top[0][1]) - T) < 0.05, +(top[1][0]-top[0][1]).toFixed(3));
  if(runs.length === 3)
    chk('кромка '+T+', полка '+td+': просвет полки = заказанной глубине',
        Math.abs((runs[2][0] - runs[1][1]) - td) < 0.05, +(runs[2][0]-runs[1][1]).toFixed(3));
  // Inside the jaw there is only the bridge over the top, and it is one wall thick. The X to probe at is
  // taken from the section just measured, not from a formula.
  const xJaw = top.length===2 ? (top[0][1] + top[1][0])/2 : 0;
  const inJaw = solidRuns(t, 2, xJaw, 0);
  chk('кромка '+T+', полка '+td+': в челюсти только перемычка', inJaw.length === 1, inJaw.length);
  chk('кромка '+T+', полка '+td+': перемычка в одну стенку',
      inJaw.length===1 && Math.abs((inJaw[0][1]-inJaw[0][0]) - s.w) < 0.05,
      inJaw.length===1 ? +(inJaw[0][1]-inJaw[0][0]).toFixed(3) : null);
}

console.log('=== стенка не худеет на изгибах ===');
// The whole reason ribbonXZ mitres. Walk the path's own corner points and ask how far each is from the
// outline: half a wall, everywhere, bends included. An averaged normal reads 0.71·w/2 at a right angle.
for(const w of [2, 3, 5]) for(const T of [6, 20]){
  const s = edgeClipSpec(setp({mntClipW:w, mntClipT:T}));
  const h = s.w/2, xb = -h, xf = s.T + h, xl = s.T + s.w + s.td + h;
  const path = [[xb + s.bite, 0], [xb, s.bk*0.55], [xb, s.bk], [xf, s.bk], [xf, s.zTray],
                [xl, s.zTray], [xl, s.zTray + s.lh]];
  const loop = ribbonXZ(path, s.w);
  let worst = 0, at = -1;
  for(let i=1;i+1<path.length;i++){                              // the corners, not the ends
    const d = distToLoop(loop, path[i]);
    if(Math.abs(d - s.w/2) > worst){ worst = Math.abs(d - s.w/2); at = i; } }
  chk('стенка '+w+', кромка '+T+': на всех изгибах полстенки', worst < 0.02, {worst:+worst.toFixed(4), corner:at, half:s.w/2});
  // and on the straights too, which is the easy half
  let straight = 0;
  for(let i=0;i+1<path.length;i++){
    const m = [(path[i][0]+path[i+1][0])/2, (path[i][1]+path[i+1][1])/2];
    if(Math.abs(distToLoop(loop, m) - s.w/2) < 0.02) straight++; }
  chk('стенка '+w+', кромка '+T+': и на прямых участках', straight === path.length-1, straight+'/'+(path.length-1));
}

console.log('=== прищепка зажимает ===');
for(const T of [2, 20, 50]){
  const t = mk({mntClipT:T});
  const s = edgeClipSpec(paramState.box);
  let z0=1e9, z1=-1e9; for(const T2 of t) for(const v of T2){ if(v[2]<z0)z0=v[2]; if(v[2]>z1)z1=v[2]; }
  const zAt = zz => z0 + (zz + s.w/2);
  // The jaw is narrower low down than it is at the root: the clip has to be spread to go on, which is the
  // only thing holding it there. Both readings are taken where the FRONT leg exists, or there is no jaw
  // to measure — below the tray the section is a single leg and the probe returns nothing at all.
  const mouth = solidRuns(t, 0, 0, zAt(s.zTray + s.w));
  const wide  = solidRuns(t, 0, 0, zAt(s.bk*0.85));
  chk('кромка '+T+': у устья челюсть уже, чем у корня',
      mouth.length >= 2 && wide.length >= 2 && (mouth[1][0]-mouth[0][1]) < (wide[1][0]-wide[0][1]) - 0.05,
      {mouth: mouth.length>=2 ? +(mouth[1][0]-mouth[0][1]).toFixed(2) : null,
       root:  wide.length>=2  ? +(wide[1][0]-wide[0][1]).toFixed(2)  : null});
  chk('кромка '+T+': поджим не больше 2 мм', s.bite <= 2 + 1e-9 && s.bite > 0, s.bite);
}

console.log('=== ширина ===');
for(const wd of [10, 40, 120]){
  const t = mk({mntClipWide:wd});
  let lo=1e9, hi=-1e9; for(const T of t) for(const v of T){ if(v[1]<lo)lo=v[1]; if(v[1]>hi)hi=v[1]; }
  chk('ширина '+wd+' выдержана', Math.abs((hi-lo) - wd) < 1e-6, +(hi-lo).toFixed(3));
  chk('ширина '+wd+' отцентрована', Math.abs(lo+hi) < 1e-9);
}

console.log('=== имя и предупреждения ===');
{
  chk('толщина кромки в имени', /кромку \(20 мм\)/.test(activeShapeLabel(setp({mntClipT:20}))), activeShapeLabel());
  const w1 = collectPrintWarnings(setp({mntClipT:0.8}));
  chk('нечего зажимать — сказано', w1.some(x=>/зажимать нечего/.test(x)), w1);
  const w2 = collectPrintWarnings(setp({mntClipW:1.3}));
  chk('тонкая стенка названа', w2.some(x=>/разожмётся/.test(x)), w2);
  const w3 = collectPrintWarnings(setp({mntClipTray:5}));
  chk('мелкая полка названа', w3.some(x=>/полка/.test(x)), w3);
  const w4 = collectPrintWarnings(setp({}));
  chk('умолчания — молча', !w4.some(x=>/зажимать|разожмётся|полка/.test(x)), w4);
}

console.log('=== TOTAL: ' + pass + ' passed, ' + fail + ' failed ===');
if(fail) process.exit(1);
