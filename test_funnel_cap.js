// Threaded cap with something other than a solid top. Both options are the same cone — the cap's top is
// bored to a throat and a separate closed shell stands on it, lower rim buried inside — and they differ
// only in which way it tapers: a FUNNEL opens outward to a wide mouth (screw it on and pour through), a
// SPOUT closes inward to a fine tip (the applicator nozzle of a dye or glue bottle: squeeze and it comes
// out in a stream you can aim). What matters for both is that the passage really does run through to the
// bore, and that the thread underneath is untouched. Run via ./run-all.sh.
let pass=0, fail=0;
function chk(n,c,e){if(c){pass++;console.log('  OK  ',n);}else{fail++;console.log('  FAIL',n,e!==undefined?JSON.stringify(e):'');}}
function vol(t){let v=0;for(const T of t){const a=T[0],b=T[1],c=T[2];v+=(a[0]*(b[1]*c[2]-b[2]*c[1])-a[1]*(b[0]*c[2]-b[2]*c[0])+a[2]*(b[0]*c[1]-b[1]*c[0]))/6;}return v;}
function mk(ov){ logos.length=0; boxHoles.length=0; dieFaces.length=0;
  Object.assign(paramState.box, defaultBoxParams(), {gfBaseplate:false, threadMode:'cap',
    threadD:30, threadPitch:3, threadLen:16, threadTop:'funnel'}, ov);
  return buildTrisForShape('box', paramState.box); }

// Solid intervals along a ray, counted by DEPTH — these are unions of interpenetrating closed shells,
// and crossing parity would call the inside of an overlap hollow.
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
  // A run opens on the transition into positive depth and closes on the transition out of it. Tracking
  // only `depth===0` is not enough: where the ray grazes a facet seam the sorted hits can put an exit
  // before its entry, depth dips NEGATIVE, and the next entry closes a run against a stale start — which
  // reported a 2.5 mm cone wall as 62 mm of solid. Zero-length runs are still dropped: through a facet
  // vertex the depth touches zero for an instant and reports material of no width. That is the probe.
  for(const [t0,d] of hits){ const prev=depth; depth+=d;
    if(prev<=0 && depth>0) start=t0;
    else if(prev>0 && depth<=0){ if(start!==null && t0-start > 1e-6) runs.push([start,t0]); start=null; } }
  return runs;
}
// Widest opening across the part at height y, along X through z = 0.
function boreAt(tris, y){
  const runs = solidRuns(tris, 0, y, 0);
  let gap = 0;
  for(let k=0;k+1<runs.length;k++) gap = Math.max(gap, runs[k+1][0]-runs[k][1]);
  return gap;
}

console.log('=== builds, and only when asked ===');
{ const plain = mk({threadTop:'none'});
  { const __mc = manifoldCheck(plain,4); chk('без воронки крышка не изменилась', __mc.watertight, __mc); }
  for(const D of [1, 8]){                          // below the throat it is not a funnel, it is a hole
    const t = mk({threadFunnelD:D});
    chk('Ø устья '+D+' — воронки нет, крышка та же',
        t.length===plain.length && Math.abs(vol(t)-vol(plain))<1e-9, {tris:t.length, ref:plain.length});
  }
  chk('и «глухая крышка» — тоже та же крышка',
      (()=>{ const t=mk({threadTop:'spout'}), u=mk({threadTop:'none'});
             return u.length===plain.length && t.length!==plain.length; })(), {});
}
for(const [D,H,td,pitch] of [[60,30,30,3],[80,40,30,3],[40,20,20,2],[120,60,50,4],[35,15,30,3],[45,8,30,3]]){
  const t = mk({threadFunnelD:D, threadFunnelH:H, threadD:td, threadPitch:pitch});
  const mc = manifoldCheck(t,4);
  chk('устье '+D+' выс '+H+' резьба '+td+': замкнута', mc.watertight && vol(t)>0,
      {open:mc.openEdges, bad:mc.badEdges});
}

console.log('=== it is a FUNNEL: the passage goes right through to the bore ===');
{ const t = mk({threadFunnelD:60, threadFunnelH:30}), B = computeBBox(t);
  // a ray straight down the axis must meet no material at all
  const axis = solidRuns(t, 1, 0, 0);
  chk('по оси сквозной проход — материала нет', axis.length===0, {runs:axis.length});
  // and the opening narrows from the mouth down to the throat, then opens again into the threaded bore
  const mouth = boreAt(t, B.maxY-0.5), mid = boreAt(t, B.maxY-15), throat = boreAt(t, B.minY+18.5);
  chk('устье равно заказанному Ø', Math.abs(mouth-60) < 60*0.02, {mouth:+mouth.toFixed(2)});
  chk('к горлу проход сужается', mid < mouth-5 && mid > 0, {mid:+mid.toFixed(2), mouth:+mouth.toFixed(2)});
  chk('и горло уже устья', throat > 0 && throat < mouth, {throat:+throat.toFixed(2)});
}
{ // the mouth follows its parameter
  const ds=[40,60,90].map(D=>{ const t=mk({threadFunnelD:D, threadFunnelH:25});
    const B=computeBBox(t); return boreAt(t, B.maxY-0.5); });
  // Tolerance scales with the diameter: the cone is facetted at the segment count the THREAD needs, so
  // a wide mouth on a small thread is a coarse polygon and its chord falls short of the true circle.
  chk('устье следует за параметром', [40,60,90].every((D,i)=>Math.abs(ds[i]-D) < D*0.02),
      ds.map(v=>+v.toFixed(1)));
  const hs=[10,30,60].map(H=>{ const B=computeBBox(mk({threadFunnelD:60, threadFunnelH:H})); return B.maxY-B.minY; });
  chk('высота следует за параметром', hs[1]-hs[0] > 18 && hs[2]-hs[1] > 28, hs.map(v=>+v.toFixed(1)));
}

console.log('=== the thread underneath is untouched ===');
{ const plain = mk({threadTop:'none'}), fun = mk({threadFunnelD:60, threadFunnelH:30});
  const pb = computeBBox(plain), fb = computeBBox(fun);
  // the threaded skirt keeps its diameter; only the top grows
  chk('юбка с резьбой того же Ø', Math.abs((pb.maxX-pb.minX) - 35.75) < 0.5 &&
      (fb.maxX-fb.minX) > (pb.maxX-pb.minX), {plain:+(pb.maxX-pb.minX).toFixed(2), fun:+(fb.maxX-fb.minX).toFixed(2)});
  // the bore itself is the same size at the same height above the cap's bottom
  const bp = boreAt(plain, pb.minY+4), bf = boreAt(fun, fb.minY+4);
  chk('расточка под резьбу не изменилась', Math.abs(bp-bf) < 0.05, {plain:+bp.toFixed(3), fun:+bf.toFixed(3)});
  // and it still knows what it mates with
  chk('пара в сборке — по-прежнему банка', (assemblyMate(paramState.box)||{}).name === 'Банка', {});
}
{ // a jar built from the same parameters still seats on it
  const p = mk({threadFunnelD:60, threadFunnelH:30}) && paramState.box;
  const plan = assemblyPlacement(p, null);
  chk('банка встаёт под крышку-воронку', plan && manifoldCheck(plan.tris,4).watertight, {});
  const A = computeBBox(buildTrisForShape('box', p));
  const Bb = computeBBox(plan.tris.map(T=>T.map(v=>[v[0]+plan.px, v[1]+plan.py, v[2]+plan.pz])));
  const ov = Math.min(A.maxY,Bb.maxY) - Math.max(A.minY,Bb.minY);
  chk('и заходит на глубину резьбы', ov > 5, {overlap:+ov.toFixed(2)});
}

console.log('=== the cone has a real wall, and the cap can still be gripped ===');
{ for(const wall of [1.5, 2.5, 4]){
    const t = mk({threadFunnelD:60, threadFunnelH:30, threadWall:wall}), B = computeBBox(t);
    // Across the mouth rim there is material, an opening, and material again. Measured as TOTAL solid
    // along the ray rather than as a run count: where the ray grazes a facet seam the depth counter
    // splits one wall into two touching pieces, which says nothing about the part.
    const runs = solidRuns(t, 0, B.maxY-0.4, 0);
    const solid = runs.reduce((s,r)=>s+(r[1]-r[0]), 0);
    chk('стенка '+wall+': у устья материал по обе стороны', runs.length>=2, {runs:runs.length});
    chk('стенка '+wall+': суммарно две стенки заказанной толщины', Math.abs(solid-2*wall) < 0.5,
        {solid:+solid.toFixed(2), want:2*wall});
  }
  const knurled = mk({threadFunnelD:60, threadGrip:24}), smooth = mk({threadFunnelD:60, threadGrip:0});
  chk('насечка на юбке работает и с воронкой', vol(knurled) < vol(smooth), {});
}

console.log('=== the SPOUT: it tapers the other way, and stays open to the tip ===');
// The whole point of the spout is the tip, and the trap is the wall. Hold the wall at the cap's 2.5 mm and
// a 3 mm tip has no passage left at all — it is a solid point that looks right in the preview and prints
// as a plug. So the wall tapers with the cone, and what is measured here is the hole at the end.
for(const [D,H] of [[3,35],[6,35],[10,50],[2,20],[6,120],[20,15]]){
  const t = mk({threadTop:'spout', threadSpoutD:D, threadSpoutH:H});
  const mc = manifoldCheck(t,4);
  chk('носик Ø'+D+' длиной '+H+': замкнут', mc.watertight && vol(t)>0, {open:mc.openEdges, bad:mc.badEdges});
  const B = computeBBox(t);
  const runs = solidRuns(t, 0, B.maxY-0.6, 0);
  const bore = (runs.length>=2) ? runs[1][0]-runs[0][1] : 0;
  chk('носик Ø'+D+': на кончике есть проход', bore > 0.5, {bore:+bore.toFixed(2)});
  // ...and it is a wall on each side of that passage, not one solid lump
  chk('носик Ø'+D+': и стенка по обе стороны прохода', runs.length>=2, {runs:runs.length});
}
{ const t = mk({threadTop:'spout', threadSpoutD:6, threadSpoutH:35}), B = computeBBox(t);
  chk('по оси носика сквозной проход — материала нет', solidRuns(t,1,0,0).length===0, {});
  // it NARROWS: wide where it leaves the cap, fine at the tip — the opposite of the funnel
  const low = boreAt(t, B.maxY-33), high = boreAt(t, B.maxY-1.5);
  chk('к кончику проход сужается', high > 0 && high < low-2, {low:+low.toFixed(2), high:+high.toFixed(2)});
  const outerAt=y=>{ const r=solidRuns(t,0,y,0); return r.length ? r[r.length-1][1]-r[0][0] : 0; };
  chk('и снаружи носик тоже сужается', outerAt(B.maxY-1) < outerAt(B.maxY-30), 
      {tip:+outerAt(B.maxY-1).toFixed(2), base:+outerAt(B.maxY-30).toFixed(2)});
  chk('кончик — заказанного Ø', Math.abs(outerAt(B.maxY-0.35)-6) < 1.0, {tip:+outerAt(B.maxY-0.35).toFixed(2)});
}
{ // the tip diameter is a knob, and the length is a separate one
  const tips=[3,6,12].map(D=>{ const t=mk({threadTop:'spout', threadSpoutD:D});
    const B=computeBBox(t), r=solidRuns(t,0,B.maxY-0.35,0); return r.length ? r[r.length-1][1]-r[0][0] : 0; });
  chk('Ø кончика следует за параметром', tips[0]<tips[1]-1.5 && tips[1]<tips[2]-3, tips.map(v=>+v.toFixed(2)));
  const hs=[15,35,80].map(H=>{ const B=computeBBox(mk({threadTop:'spout', threadSpoutH:H})); return B.maxY-B.minY; });
  chk('длина следует за параметром', hs[1]-hs[0] > 18 && hs[2]-hs[1] > 43, hs.map(v=>+v.toFixed(1)));
}
{ // the thread underneath is as untouched as it is under the funnel
  const plain = mk({threadTop:'none'}), sp = mk({threadTop:'spout'});
  const pb = computeBBox(plain), sb = computeBBox(sp);
  chk('под носиком юбка с резьбой та же', Math.abs((pb.maxX-pb.minX)-(sb.maxX-sb.minX)) < 1e-9,
      {plain:+(pb.maxX-pb.minX).toFixed(2), spout:+(sb.maxX-sb.minX).toFixed(2)});
  chk('и расточка под резьбу та же', Math.abs(boreAt(plain, pb.minY+4)-boreAt(sp, sb.minY+4)) < 0.05, {});
  chk('пара в сборке — по-прежнему банка', (assemblyMate(paramState.box)||{}).name === 'Банка', {});
}
{ // a spout no narrower than the throat is not a spout, and is refused rather than drawn as a stub
  const plain = mk({threadTop:'none'}), wide = mk({threadTop:'spout', threadSpoutD:40});
  chk('кончик шире горла — носика нет', wide.length===plain.length, {tris:wide.length, ref:plain.length});
}

console.log('=== no triangle is inside-out ===');
// A watertight check only pairs edges; it says nothing about which way a face looks. The closing facet
// of every turned surface used to take its outward reference from (th(i)+th(i+1))/2, and th() wraps at
// 2π — so on that ONE column the reference landed on the far side of the axis and the triangles came out
// inverted. The seam sits at θ=0, i.e. on the +X axis, which is exactly where these rays cross it.
// A depth counter over correctly wound shells can never go negative: it would mean leaving material the
// ray was never inside. Checked on the funnel cap and on the two other builders that shared the bug.
function minDepth(tris, ax, p, q){
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
  let depth=0, lo=0;
  for(const [,d] of hits){ depth+=d; if(depth<lo) lo=depth; }
  return lo;
}
for(const [nm,ov] of [['крышка-воронка',{threadFunnelD:60, threadFunnelH:30}],
                      ['крышка без воронки',{threadTop:'none'}],
                      ['крышка с носиком',{threadTop:'spout'}],
                      ['штуцер со сквозным каналом',{threadMode:'stud', threadBore:8, threadFlange:26}],
                      ['гайка',{threadMode:'nut'}]]){
  const t = mk(ov), B = computeBBox(t);
  let worst = 0, at = null;
  // Deliberately off-round offsets. A ray sent exactly along z = 0 passes through the vertex column at
  // θ = 0 and is handed both facets that share that edge, so a correct wall reads as two exits — the
  // probe's artefact, not the part's. Every seam facet is about a millimetre wide, so a ray a fraction of
  // one off the axis still crosses it and the inverted column is still caught.
  for(let k=1;k<12;k++){ const y = B.minY + (B.maxY-B.minY)*(k+0.37)/12;
    for(const z of [0.31, -0.44, 0.83]){ const d = minDepth(t, 0, y, z);
      if(d < worst){ worst = d; at = [+y.toFixed(2), z]; } } }
  chk(nm+': глубина по лучу нигде не уходит в минус', worst===0, {depth:worst, at});
}

console.log('\n'+(fail?'FAILED':'ALL PASSED')+': '+pass+' passed, '+fail+' failed');
if(fail) process.exitCode=1;
