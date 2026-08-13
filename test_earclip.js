// Триангулятор крышек — the piece every non-star-shaped part in the app now stands on, and the piece whose
// failure the existing battery could not see.
//
// `manifoldCheck` pairs edges undirected, so it passes a cap made of OVERLAPPING triangles as readily as a
// correct one. `minDepth` counts a ray's depth and never goes negative over such a cap either. Both said
// "watertight" while the Maltese cross's bore, the Roots housing's throat, the cable comb and both gauge
// plates carried flaps you could see the moment they were rendered.
//
// What sees it is arithmetic on the cap itself, and it is cheap:
//   * the triangles' signed areas must SUM to the loop's own area — outer less holes;
//   * every one of them must be POSITIVE, because the working loop is normalised counter-clockwise and an
//     ear is a left turn. A negative triangle is the sign that no ear was found and something got clipped
//     anyway. That single count is what caught all five artefacts at once — 21 on the cross, 89 on the
//     Roots housing, 16 on the cable comb;
//   * n vertices must give n−2 triangles, which is what says nothing was skipped or emitted twice;
//   * every centroid must land in the material, which is what says a hole was not paved over.
// Run via ./run-all.sh.
let pass=0, fail=0;
function chk(n,c,e){if(c){pass++;console.log('  OK  ',n);}else{fail++;console.log('  FAIL',n,e!==undefined?JSON.stringify(e):'');}}
function setp(ov){ logos.length=0; boxHoles.length=0; dieFaces.length=0;
  Object.assign(paramState.box, defaultBoxParams(), {gfBaseplate:false}, ov); return paramState.box; }
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
const inLoop = (P, p) => { let inside=false;
  for(let i=0,n=P.length,j=n-1;i<n;j=i++)
    if((P[i][1]>p[1])!==(P[j][1]>p[1]) &&
       p[0] < (P[j][0]-P[i][0])*(p[1]-P[i][1])/(P[j][1]-P[i][1])+P[i][0]) inside=!inside;
  return inside; };
// Run the extruder's own front end — normalise, bridge, ear-clip — and report on the cap it produced.
function capReport(loops){
  const clean = loops.map(P=>{ const q=[];
    for(const v of P){ const l=q[q.length-1]; if(!l || Math.abs(l[0]-v[0])>1e-9 || Math.abs(l[1]-v[1])>1e-9) q.push(v); }
    while(q.length>1 && Math.abs(q[0][0]-q[q.length-1][0])<1e-9 && Math.abs(q[0][1]-q[q.length-1][1])<1e-9) q.pop();
    return q; }).filter(P=>P.length>=3);
  const L = clean.map((P,i)=>{ const wantCCW=(i===0), isCCW=loopArea2(P)>=0;
    return wantCCW===isCCW ? P : P.slice().reverse(); });
  let want = 0; for(const P of L) want += loopArea2(P)/2;
  const flat = bridgeHolesXZ(L[0], L.slice(1)), tri = earClipXZ(flat);
  let got = 0, neg = 0, outside = 0, sliver = 0;
  for(const t of tri){ const A=flat[t[0]], B=flat[t[1]], C=flat[t[2]];
    const a = ((B[0]-A[0])*(C[1]-A[1]) - (B[1]-A[1])*(C[0]-A[0]))/2;
    got += a;
    if(a < -1e-9) neg++;
    if(Math.abs(a) < 1e-9) sliver++;
    const c = [(A[0]+B[0]+C[0])/3, (A[1]+B[1]+C[1])/3];
    if(!inLoop(L[0], c) || L.slice(1).some(H=>inLoop(H, c))) outside++; }
  return {want, got, neg, outside, sliver, tris: tri.length, pts: flat.length,
          err: Math.abs(got-want)/Math.max(1e-9, Math.abs(want))};
}
function audit(name, loops, y1){
  const r = capReport(loops);
  chk(name + ': площадь крышки = площади контура', r.err < 1e-9, {want:+r.want.toFixed(4), got:+r.got.toFixed(4)});
  chk(name + ': ни одного вывернутого треугольника', r.neg === 0, r.neg);
  chk(name + ': ни одного вырожденного', r.sliver === 0, r.sliver);
  chk(name + ': ни один не лёг мимо материала', r.outside === 0, r.outside);
  chk(name + ': n вершин дали n−2 треугольника', r.tris === r.pts - 2, r.tris + ' / ' + (r.pts-2));
  const t = extrudePolyYTris(loops, 0, y1 || 3), mc = manifoldCheck(t, 4);
  chk(name + ': призма замкнута', mc.watertight, {open:mc.openEdges, bad:mc.badEdges});
  chk(name + ': обмотка призмы', minDepth(t, 1, 0.13, 0.29) === 0 && minDepth(t, 0, 0.13, 0.29) === 0);
  return r;
}
const rev = P => P.slice().reverse();
const circ = (r, n, cx, cz) => { const P=[];
  for(let i=0;i<n;i++){ const a=2*Math.PI*i/n; P.push([(cx||0)+r*Math.cos(a), (cz||0)+r*Math.sin(a)]); } return P; };
const rect = (w, d, cx, cz) => [[(cx||0)-w/2,(cz||0)-d/2],[(cx||0)+w/2,(cz||0)-d/2],
                               [(cx||0)+w/2,(cz||0)+d/2],[(cx||0)-w/2,(cz||0)+d/2]];

console.log('=== простые случаи ===');
audit('квадрат', [rect(40,40)]);
audit('квадрат с расточкой', [rect(40,40), rev(circ(8,48))]);
audit('кольцо', [circ(30,96), rev(circ(12,64))]);
audit('Г-образный контур', [[[0,0],[30,0],[30,10],[10,10],[10,30],[0,30]]]);

console.log('=== много отверстий подряд ===');
for(const k of [1,2,4,8]){
  const holes = []; for(let i=0;i<k;i++) holes.push(rev(circ(3, 24, -((k-1)/2)*10 + i*10, 0)));
  audit(k + ' отверстий в ряд', [rect(10*k+16, 24)].concat(holes));
}
{ // The bridge into a hole is only valid against the holes ALREADY sewn in unless it is tested against the
  // ones still queued. A tiny hole tucked behind a big one is the case that exposes it.
  const loops = [rect(80, 40), rev(circ(12, 64, 10, 0)), rev(circ(1.6, 16, -6, 0)), rev(circ(1.6, 16, -12, 8))];
  audit('мелкие отверстия за крупным', loops);
}

console.log('=== контуры, которым нужен именно триангулятор ===');
{ // a comb: deep parallel slots, every one of them making the outline non-star-shaped
  const P = [[-50,-12],[50,-12],[50,12]];
  for(let k=4;k>=0;k--){ const x=-40+k*20; P.push([x+3,12],[x+3,-4],[x-3,-4],[x-3,12]); }
  P.push([-50,12]);
  audit('гребёнка с пятью прорезями', [P]);
}
{ // a star with deep reflex notches, plus a bore
  const P=[]; for(let i=0;i<40;i++){ const a=2*Math.PI*i/40, r=(i%2 ? 12 : 30);
    P.push([r*Math.cos(a), r*Math.sin(a)]); }
  audit('звезда с расточкой', [P, rev(circ(4, 32))]);
}
{ // collinear runs and repeated points — both of which stall a naive ear sweep
  const P = [[0,0],[10,0],[20,0],[30,0],[30,10],[30,10],[15,10],[15,20],[0,20],[0,10]];
  audit('коллинеарные участки и повторы', [P]);
}

console.log('=== настоящие детали приложения ===');
{ const p = setp({gearMode:'geneva', genevaRole:'cross', genevaSlots:4, genevaCenter:40,
                  genevaPinD:5, genevaThick:5, genevaBase:3, genevaBore:5, genevaGap:0.35});
  const s = genevaSpec(p);
  audit('мальтийский крест', [genevaCrossOutline(s), rev(circleXZ(s.rB, 64))], s.tC);
  const prof = genevaDriverProfile(s), lock=[];
  for(let i=0;i<GENEVA_M;i++){ const a=2*Math.PI*i/GENEVA_M; lock.push([prof[i]*Math.cos(a), prof[i]*Math.sin(a)]); }
  audit('запирающий диск', [lock, rev(circleXZ(s.rB, 64))], s.tC);
  // A cross whose slot bottom reaches further in than the bore is not a hole-in-a-polygon at all — the two
  // loops CROSS, and no triangulator can be asked to sort that out. c = 30 with 3 slots is exactly that
  // case: the slot is rounded on its own half width, so it reaches rin − w, not rin.
  for(const n of [3, 6, 12]) for(const c of [30, 50]){
    const s2 = genevaSpec(setp({gearMode:'geneva', genevaRole:'cross', genevaSlots:n, genevaCenter:c}));
    audit(n + '-пазовый крест, c=' + c, [genevaCrossOutline(s2), rev(circleXZ(s2.rB, 64))], s2.tC);
    chk(n + '-пазовый крест, c=' + c + ': расточка не режет паз', s2.rB < s2.rin - s2.w,
        {rB:+s2.rB.toFixed(2), slotFloor:+(s2.rin - s2.w).toFixed(2)}); }
}
{ const s = rootsSpec(setp({gearMode:'roots', rootsPart:'housing', rootsLobes:2, rootsCenter:40,
                            rootsThick:12, rootsBore:5, rootsWall:3, rootsGap:0.35}));
  const dx = -s.c/2;
  audit('корпус Roots', [figure8XZ(s.Rh+s.wall, s.c).map(q=>[q[0]+dx,q[1]]),
                         rev(figure8XZ(s.Rh, s.c).map(q=>[q[0]+dx,q[1]]))], s.L);
  audit('ротор Roots', [rootsProfile(s), rev(circleXZ(s.rB, 64))], s.L);
}

{ // every remaining place the extruder is called, so no call site is audited only by the weak checks
  const g = goNoGoSpec(setp({mntMode:'gauge', mntGaugeD:8, mntGaugeTol:0.1, mntGaugeH:12, mntT:4}));
  const rcc = Math.min(4, g.D/4), plate = [], arc = (cx,cz,r,a0,a1,k) => {
    for(let i=0;i<=k;i++){ const a=a0+(a1-a0)*i/k; plate.push([cx+r*Math.cos(a), cz+r*Math.sin(a)]); } };
  arc(g.W/2-rcc, g.D/2-rcc, rcc, 0, Math.PI/2, 8);
  for(const k of [3,1]) arc(g.xAt(k), g.D/2, g.mark, 0, -Math.PI, 12);
  arc(-g.W/2+rcc, g.D/2-rcc, rcc, Math.PI/2, Math.PI, 8);
  arc(-g.W/2+rcc, -g.D/2+rcc, rcc, Math.PI, 3*Math.PI/2, 8);
  arc( g.W/2-rcc, -g.D/2+rcc, rcc, 3*Math.PI/2, 2*Math.PI, 8);
  audit('плита калибра go/no-go', [plate, rev(circleXZ(g.boreGo/2, 48, g.xAt(0), 0)),
                                   rev(circleXZ(g.boreNo/2, 48, g.xAt(1), 0))], g.t);

  const c = cableCombSpec(setp({mntMode:'cablecomb', mntCabD:6, mntCabN:5, mntCabGrip:0.75,
                                mntCabH:12, mntCabScrew:4}));
  const CP = [], zc = c.Hb/2 - c.rp - c.nl, a1 = Math.acos(Math.max(-1, Math.min(1, (c.neck/2)/c.rp)));
  CP.push([-c.W/2,-c.Hb/2],[c.W/2,-c.Hb/2],[c.W/2,c.Hb/2]);
  for(let k=c.n-1;k>=0;k--){ const xc=c.xAt(k), zJ=zc+c.rp*Math.sin(a1), K=Math.max(24,Math.round(c.rp*8));
    CP.push([xc+c.neck/2,c.Hb/2],[xc+c.neck/2,zJ]);
    for(let i=1;i<=K;i++){ const a=a1-(Math.PI+2*a1)*i/K; CP.push([xc+c.rp*Math.cos(a), zc+c.rp*Math.sin(a)]); }
    CP.push([xc-c.neck/2,c.Hb/2]); }
  CP.push([-c.W/2,c.Hb/2]);
  /* Отверстий под саморез в этом контуре БОЛЬШЕ НЕТ: с v18.23.0 саморезы вынесены в проушины по торцам,
     отдельными телами, и `xScrew` лежит уже за краем планки. Контур с дырками здесь не пропал — его
     держит плита калибра выше; а контур гребёнки ценен другим: полторы сотни вершин, из них половина на
     пяти вогнутых карманах подряд, — на таком ушное отсечение и спотыкается. */
  audit('гребёнка кабелей', [CP], c.H);

  const e = edgeClipSpec(setp({mntMode:'edgeclip', mntClipT:20, mntClipW:3, mntClipBack:25,
                               mntClipFront:20, mntClipTray:16, mntClipLip:8, mntClipWide:40}));
  const h = e.w/2, xb = -h, xf = e.T + h, xl = e.T + e.w + e.td + h;
  audit('сечение держателя', [ribbonXZ([[xb+e.bite,0],[xb,e.bk*0.55],[xb,e.bk],[xf,e.bk],[xf,e.zTray],
                                        [xl,e.zTray],[xl,e.zTray+e.lh]], e.w)], e.wd);
}

console.log('=== мосты не пересекают ничего ===');
// Every bridge is a segment of the sewn ring that was not in either original loop. None of them may cross
// an edge of any loop, and each must run through material.
for(const loops of [[rect(80,40), rev(circ(12,64,10,0)), rev(circ(1.6,16,-6,0)), rev(circ(1.6,16,-12,8))],
                    [circ(30,96), rev(circ(6,32,10,0)), rev(circ(6,32,-10,0)), rev(circ(3,24,0,14))]]){
  const L = loops.map((P,i)=>{ const wantCCW=(i===0), isCCW=loopArea2(P)>=0; return wantCCW===isCCW ? P : rev(P); });
  const ring = bridgeHolesXZ(L[0], L.slice(1));
  const orig = new Set();
  for(const P of L) for(let i=0;i<P.length;i++){ const q=P[(i+1)%P.length];
    orig.add([P[i][0],P[i][1],q[0],q[1]].map(v=>v.toFixed(6)).join(',')); }
  let crossings = 0, outside = 0, bridges = 0;
  for(let i=0;i<ring.length;i++){ const a=ring[i], b=ring[(i+1)%ring.length];
    if(orig.has([a[0],a[1],b[0],b[1]].map(v=>v.toFixed(6)).join(','))) continue;
    if(Math.abs(a[0]-b[0])<1e-9 && Math.abs(a[1]-b[1])<1e-9) continue;
    bridges++;
    const mid = [(a[0]+b[0])/2, (a[1]+b[1])/2];
    if(!inLoop(L[0], mid) || L.slice(1).some(H=>inLoop(H, mid))) outside++;
    for(const P of L) for(let j=0;j<P.length;j++)
      if(segCrossXZ(a, b, P[j], P[(j+1)%P.length])) crossings++; }
  chk(loops.length-1 + ' отверстий: мосты найдены', bridges >= 2*(loops.length-1), bridges);
  chk(loops.length-1 + ' отверстий: ни один мост не пересекает контур', crossings === 0, crossings);
  chk(loops.length-1 + ' отверстий: каждый мост идёт по материалу', outside === 0, outside);
}

console.log('=== семисегментные цифры ===');
// Each bar is its own closed box; what matters is that the bars of one glyph OVERLAP in volume instead of
// butting against one another, or the glyph is not one piece and the mesh is not watertight.
for(const ch of '0123456789.'){
  const bars = seg7BarsXZ(ch, 0, 0, 6), tris = [];
  for(const b of bars) for(const T of boxSpanTris(b[0], b[1], 0, 1, b[2], b[3])) tris.push(T);
  const mc = manifoldCheck(tris, 4);
  chk("'" + ch + "': штрихи замкнуты и не делят рёбер", mc.watertight, {open:mc.openEdges, bad:mc.badEdges});
}
{
  chk('ширина растёт с числом знаков', seg7Width('1', 5) < seg7Width('12', 5) &&
      seg7Width('12', 5) < seg7Width('1.25', 5));
  chk('точка уже цифры', seg7Width('..', 5) < seg7Width('11', 5));
  chk('высота масштабирует ширину', Math.abs(seg7Width('123', 10) - 2*seg7Width('123', 5)) < 1e-9);
  chk('число форматируется без хвостов', fmtNum(1) === '1' && fmtNum(1.5) === '1.5' && fmtNum(0.75) === '0.75');
  chk("'8' — самый полный знак", SEG7['8'].length === 7);
  chk("'1' — самый бедный", SEG7['1'].length === 2);
}

console.log('=== TOTAL: ' + pass + ' passed, ' + fail + ' failed ===');
if(fail) process.exit(1);
