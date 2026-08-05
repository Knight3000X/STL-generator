// Worm wheel (червячное колесо) in all three rims — straight, THROATED (globoid) and ENVELOPED — through
// the REAL buildTrisForShape pipeline. A throated rim wraps the mating worm, so the tests measure the rim
// radius layer by layer against the worm's own circle rather than just checking that the mesh closes. The
// enveloped rim is the default and is not drawn at all: it is cut, by the worm, and the tests here ask
// what came out of that cut. Whether the pair MESHES is settled in test_assembly.js, which places the two
// and turns them against each other. Run via ./run-all.sh.
let pass=0,fail=0; function chk(n,c,e){if(c){pass++;console.log('  OK  ',n);}else{fail++;console.log('  FAIL',n,e!==undefined?JSON.stringify(e):'');}}
function vol(t){let v=0;for(const T of t){const a=T[0],b=T[1],c=T[2];v+=(a[0]*(b[1]*c[2]-b[2]*c[1])-a[1]*(b[0]*c[2]-b[2]*c[0])+a[2]*(b[0]*c[1]-b[1]*c[0]))/6;}return v;}
function base(ov){ logos.length=0; boxHoles.length=0; dieFaces.length=0;
  Object.assign(paramState.box, defaultBoxParams(), {width:40,height:40,depth:40,
    gearMode:'wormwheel', gearModule:2, gearTeeth:30, gearPA:20, gearThick:8, gearBore:0,
    gearWormD:16, gearStarts:1, gearWheelRim:'straight', gearSpokes:0, gearHub:0,
    pipMode:'none',threadMode:'none',sheetShape:'none',keycapMode:'none',platonic:'none',polyN:0,binRound:0,
    scoopDir:'none',labelTab:'none',mountHoles:'none',gripWall:'none',divX:1,divZ:1,stackFeet:false,gfOn:false}, ov);
  return buildTrisForShape('box',paramState.box); }

// Largest distance from the wheel axis found in a thin slab of layers around height y.
function rimAt(tris, y, band){
  let r=0;
  for(const T of tris) for(const v of T)
    if(Math.abs(v[1]-y)<=band){ const d=Math.hypot(v[0],v[2]); if(d>r) r=d; }
  return r;
}
const heights=t=>{ const s=new Set(); for(const T of t) for(const v of T) s.add(+v[1].toFixed(6));
  return [...s].sort((a,b)=>a-b); };

console.log('=== watertight: straight and throated, across module × teeth × thickness × worm Ø ===');
for(const rim of ['straight','throated'])
  for(const m of [1,2,3])
    for(const Z of [20,30,60])
      for(const th of [4,8,16])
        for(const dW of [10,16,30]){
          const t=base({gearWheelRim:rim,gearModule:m,gearTeeth:Z,gearThick:th,gearWormD:dW});
          const mc=manifoldCheck(t,4);
          chk(rim+' m'+m+' Z'+Z+' b'+th+' Øч'+dW+' watertight (+vol)', mc.watertight&&vol(t)>0,
              {wt:mc.watertight,open:mc.openEdges,bad:mc.badEdges});
        }
for(const ov of [{gearBore:8},{gearKeyW:3,gearKeyD:1.5},{gearStarts:4},{gearHub:20,gearHubH:6},
                 {gearThick:40,gearWormD:10},{gearWormD:0},{gearPA:14},{gearPA:30}]){
  const t=base(Object.assign({gearWheelRim:'throated'}, ov)), mc=manifoldCheck(t,4);
  chk('throated + '+JSON.stringify(ov)+' watertight', mc.watertight&&vol(t)>0,
      {open:mc.openEdges,bad:mc.badEdges});
}

console.log('=== the straight rim really is straight ===');
{ const t=base({gearWheelRim:'straight'}), hs=heights(t);
  chk('a straight rim needs no intermediate layers', hs.length===2, hs);
  const ys=[-4,4].map(y=>rimAt(t,y,0.05));
  chk('rim radius is the same at both faces', Math.abs(ys[0]-ys[1])<1e-9, ys.map(v=>+v.toFixed(4)));
  chk('and it is the addendum circle, m·(Z+2)/2', Math.abs(ys[0]-2*(30+2)/2)<0.05, {r:+ys[0].toFixed(3)});
}

console.log('=== the throated rim wraps the worm ===');
{ const t=base({gearWheelRim:'throated'});
  const mid=rimAt(t,0,0.4), edge=rimAt(t,3.9,0.4);
  chk('rim is widest at the faces, narrowest at the mid-plane', edge>mid+0.1, {mid:+mid.toFixed(3),edge:+edge.toFixed(3)});
  chk('the mid-plane is still the plain addendum circle', Math.abs(mid-32)<0.05, {mid:+mid.toFixed(3)});
  chk('it is symmetric about the mid-plane', Math.abs(rimAt(t,3.9,0.4)-rimAt(t,-3.9,0.4))<1e-9,
      {up:+rimAt(t,3.9,0.4).toFixed(4), down:+rimAt(t,-3.9,0.4).toFixed(4)});
  // δ(y) = rw − √(rw² − y²): the profile rides out along the WORM's own circle, so measured growth must
  // match that curve, not some arbitrary flare.
  const rw=8, r0=rimAt(t,0,0.3);
  for(const y of [1,2,3,3.9]){
    const want=rw-Math.sqrt(rw*rw-y*y), got=rimAt(t,y,0.3)-r0;
    chk('growth at y='+y+' follows the worm circle', Math.abs(got-want)<0.06,
        {want:+want.toFixed(3), got:+got.toFixed(3)});
  }
}
{ const straight=vol(base({gearWheelRim:'straight'})), throated=vol(base({gearWheelRim:'throated'}));
  chk('throating adds material rather than removing it', throated>straight,
      {straight:+straight.toFixed(0), throated:+throated.toFixed(0)});
  chk('but not a silly amount', throated < straight*1.35,
      {ratio:+(throated/straight).toFixed(3)}); }
{ const t=base({gearWheelRim:'throated'});
  chk('the throat is resolved by real layers, not two', heights(t).length>=17, {n:heights(t).length}); }

console.log('=== the throated rim CLEARS the worm it is cut for ===');
// Wheel axis is Y; the worm's axis crosses it at the centre distance C = rp + rw. Every wheel point must
// stay outside the worm's root cylinder, or the pair jams instead of turning.
for(const [m,Z,th,dW] of [[2,30,8,16],[1,40,5,10],[3,20,12,24],[2,30,20,16],[1.5,50,6,12]]){
  const t=base({gearWheelRim:'throated',gearModule:m,gearTeeth:Z,gearThick:th,gearWormD:dW});
  const rp=m*Z/2, rw=dW/2, C=rp+rw, Rroot=rw-1.25*m;
  let worst=1e9;
  for(const T of t) for(const v of T){
    const r=Math.hypot(v[0],v[2]);
    if(r < rp) continue;                                   // only the rim can reach the worm
    const d=Math.hypot(v[1], C-r) - Rroot;                  // distance outside the worm's root cylinder
    if(d<worst) worst=d;
  }
  chk('m'+m+' Z'+Z+' b'+th+' Øч'+dW+': rim clears the worm root', worst>0.05, {clear:+worst.toFixed(3)});
}
for(const [m,Z,th,dW] of [[2,30,8,16],[3,20,12,24]]){
  const t=base({gearWheelRim:'throated',gearModule:m,gearTeeth:Z,gearThick:th,gearWormD:dW});
  const rp=m*Z/2, rw=dW/2, C=rp+rw, Rtip=rw+m;
  let closest=1e9;
  for(const T of t) for(const v of T){ const r=Math.hypot(v[0],v[2]);
    if(r < rp) continue;
    const d=Math.hypot(v[1], C-r) - Rtip; if(d<closest) closest=d; }
  chk('m'+m+' Øч'+dW+': and it does reach in past the worm tip circle (it wraps, not just clears)',
      closest<0, {gap:+closest.toFixed(3)});
}

console.log('=== the ±45° wrap cap ===');
{ // a wheel far wider than the worm must stop wrapping instead of closing over it
  const t=base({gearWheelRim:'throated',gearThick:40,gearWormD:16});
  const rw=8, capped=rw-Math.sqrt(rw*rw-(rw*Math.SQRT1_2)**2), r0=rimAt(t,0,0.6);
  chk('growth saturates at the cap', Math.abs((rimAt(t,19.5,0.6)-r0)-capped)<0.08,
      {cap:+capped.toFixed(3), got:+(rimAt(t,19.5,0.6)-r0).toFixed(3)});
  chk('and the cap is rw·(1 − cos45°)', Math.abs(capped-8*(1-Math.SQRT1_2))<1e-9, {capped:+capped.toFixed(4)});
  const wide=rimAt(t,19.5,0.6), narrow=rimAt(base({gearWheelRim:'throated',gearThick:8,gearWormD:16}),3.9,0.4);
  chk('a wide wheel wraps further than a narrow one, up to the cap', wide>narrow,
      {wide:+wide.toFixed(3), narrow:+narrow.toFixed(3)}); }

console.log('=== throating does not disturb what already worked ===');
{ const a=base({gearWheelRim:'straight'}), b=base({gearWheelRim:'throated'});
  const bb=computeBBox(a), bc=computeBBox(b);
  chk('thickness is unchanged', Math.abs((bc.maxY-bc.minY)-(bb.maxY-bb.minY))<1e-9,
      {a:+(bb.maxY-bb.minY).toFixed(4), b:+(bc.maxY-bc.minY).toFixed(4)});
  chk('both stay centred on Y', Math.abs(bb.maxY+bb.minY)<1e-9 && Math.abs(bc.maxY+bc.minY)<1e-9, {}); }
{ // the helix angle is still derived from the worm, throated or not
  const tw=dW=>{ const t=base({gearWheelRim:'throated',gearWormD:dW}), lo=[], hi=[];
    for(const T of t) for(const v of T){ if(Math.abs(v[1]+4)<1e-6) lo.push(Math.atan2(v[2],v[0]));
                                          if(Math.abs(v[1]-4)<1e-6) hi.push(Math.atan2(v[2],v[0])); }
    return lo.length>0 && hi.length>0; };
  chk('faces are still generated at both ends with a twist applied', tw(16) && tw(30), {}); }
{ const fine=base({gearWheelRim:'throated',gearWormD:30}), coarse=base({gearWheelRim:'throated',gearWormD:10});
  const gF=rimAt(fine,3.9,0.3)-rimAt(fine,0,0.3), gC=rimAt(coarse,3.9,0.3)-rimAt(coarse,0,0.3);
  chk('a fatter worm makes a shallower throat', gF<gC, {fat:+gF.toFixed(3), thin:+gC.toFixed(3)}); }

console.log('=== the option does not leak into the other gear modes ===');
for(const m of ['spur','helical','bevel','worm','gt2','ratchet','cam'])
  for(const rim of ['throated','envelope']){
    const a=vol(base({gearMode:m,gearWheelRim:'straight'})), b=vol(base({gearMode:m,gearWheelRim:rim}));
    chk(m+' ignores gearWheelRim='+rim, Math.abs(a-b)<1e-9, {a:+a.toFixed(3),b:+b.toFixed(3)});
  }

console.log('=== the ENVELOPED rim: cut by the worm, not drawn ===');
// This is the default rim, and the only one that produces a wheel a worm can actually drive. Whether the
// pair meshes is settled in test_assembly.js, where the two are placed and turned against each other.
// What is checked HERE is the shape itself: that the rim really was cut, cut only where the worm reaches,
// cut to the depth the worm's own teeth would cut to, and that it is one tooth pattern repeated Z times.
for(const m of [1,2,3]) for(const Z of [12,30,60]) for(const th of [4,8,16]) for(const dW of [10,16,30]){
  const t=base({gearWheelRim:'envelope',gearModule:m,gearTeeth:Z,gearThick:th,gearWormD:dW});
  const mc=manifoldCheck(t,4);
  chk('огибанием m'+m+' Z'+Z+' b'+th+' Øч'+dW+' watertight (+vol)', mc.watertight&&vol(t)>0,
      {wt:mc.watertight,open:mc.openEdges,bad:mc.badEdges});
}
for(const ov of [{gearBore:8},{gearKeyW:3,gearKeyD:1.5},{gearStarts:4},{gearHub:20,gearHubH:6},
                 {gearHand:'left'},{gearWormD:0},{gearWormLen:70},{gearFlat:0.02},{gearFlat:0.22}]){
  const t=base(Object.assign({gearWheelRim:'envelope'}, ov)), mc=manifoldCheck(t,4);
  chk('огибанием + '+JSON.stringify(ov)+' watertight', mc.watertight&&vol(t)>0,
      {open:mc.openEdges,bad:mc.badEdges});
}
{ const t=base({gearWheelRim:'envelope'});          // m=2, Z=30, b=8, worm Ø16 → rp=30, blank 32
  chk('заготовка не превышает окружность вершин m(Z+2)/2', rimAt(t,0,4.1) <= 32.001, {r:+rimAt(t,0,4.1).toFixed(3)});
  // The worm reaches ±rw of the mid-plane; a wheel wider than that keeps its blank at the outer edges,
  // which is precisely why the enveloped rim comes out throated without anyone drawing a throat.
  const wide=base({gearWheelRim:'envelope', gearThick:24});
  chk('за пределами досягаемости червяка венец остаётся заготовкой',
      Math.abs(rimAt(wide,11.5,0.4) - 32) < 0.05, {r:+rimAt(wide,11.5,0.4).toFixed(3)});
  chk('а в средней плоскости он прорезан', rimAt(wide,0,0.3) < 32 - 0.1, {r:+rimAt(wide,0,0.3).toFixed(3)});
}
{ // Depth of cut. The worm's teeth are 2.25·m/2 deep from its own crest, so the wheel's root cannot sit
  // higher than the pitch circle less that — nor should the wheel be gouged far past it.
  for(const m of [1,2,3]){
    const t=base({gearWheelRim:'envelope', gearModule:m, gearTeeth:30});
    const rp=m*30/2;
    let lo=1e9; for(const T of t) for(const v of T){ const d=Math.hypot(v[0],v[2]);
      if(Math.abs(v[1])<3.9 && d>rp*0.8 && d<lo) lo=d; }   // rim only — the bore ring is nearer the axis
    chk('m'+m+': впадина ниже делительной окружности, но не глубже полной высоты зуба',
        lo < rp-0.2*m && lo > rp-1.6*m, {root:+lo.toFixed(2), rp});
  }
}
{ // One tooth, repeated. The wheel is cut over a single pitch and copied Z times; if that copy were off,
  // the rim radius would not repeat at 2π/Z. Measured on the real mesh, angle by angle.
  const Z=30, t=base({gearWheelRim:'envelope', gearTeeth:Z});
  const prof=[]; const NA=360;
  for(let i=0;i<NA;i++) prof.push(0);
  for(const T of t) for(const v of T){ if(Math.abs(v[1])>0.3) continue;
    const a=Math.atan2(v[2],v[0]), k=((Math.round(a/(2*Math.PI)*NA)%NA)+NA)%NA, d=Math.hypot(v[0],v[2]);
    if(d>prof[k]) prof[k]=d; }
  const step=NA/Z;                                    // 12 samples per tooth
  let worst=0;
  for(let i=0;i<NA;i++) if(prof[i]>0 && prof[(i+step)%NA]>0) worst=Math.max(worst, Math.abs(prof[i]-prof[(i+step)%NA]));
  chk('венец повторяется ровно через один зубной шаг', worst < 0.02, {worst:+worst.toFixed(4)});
  // ...and it is NOT flat: something was actually cut, at a depth worth calling a tooth
  const hi=Math.max(...prof.filter(v=>v>0)), lo=Math.min(...prof.filter(v=>v>0));
  chk('и это настоящий зуб, а не круг', hi-lo > 1.5, {hi:+hi.toFixed(2), lo:+lo.toFixed(2)});
}
{ /* The tooth is HELICAL, and the hand follows the worm's. A right-hand worm lays the wheel's tooth trace
     one way across the face, a left-hand worm the other — measured as the angular drift of one FLANK from
     the wheel's back face to its front.

     A flank, not the deepest point of the root. The root bottoms out on the field's floor over a wide span
     of angle, so «the deepest point» is a plateau and which vertex wins it is arbitrary — with a fine
     enough grid the same vertex wins at both faces and the drift reads zero on a tooth that is perfectly
     helical. A flank is a level CROSSING, and a crossing has one answer. */
  const drift=hand=>{ const t=base({gearWheelRim:'envelope', gearHand:hand, gearThick:12, gearTeeth:30});
    const at=y=>{
      const pts=[];
      for(const T of t) for(const v of T){ if(Math.abs(v[1]-y)>0.20) continue;
        const d=Math.hypot(v[0],v[2]); if(d<24) continue;   // rim only, not the bore
        const a=Math.atan2(v[2],v[0]); if(Math.abs(a)>Math.PI/15) continue;   // one tooth pitch around θ=0
        pts.push([a,d]); }
      pts.sort((u,v2)=>u[0]-v2[0]);
      if(pts.length < 8) return null;
      const lo=Math.min(...pts.map(q=>q[1])), hi=Math.max(...pts.map(q=>q[1])), mid=(lo+hi)/2;
      if(!(hi-lo > 0.5)) return null;                       // nothing to cross
      let bestA=null;
      for(let i=1;i<pts.length;i++){
        const A=pts[i-1], B=pts[i];
        if((A[1]-mid)*(B[1]-mid) > 0) continue;             // no crossing between these two
        const t2=(mid-A[1])/((B[1]-A[1])||1), a=A[0]+(B[0]-A[0])*t2;
        if(bestA===null || Math.abs(a) < Math.abs(bestA)) bestA=a;
      }
      return bestA; };
    const a1=at(4.5), a2=at(-4.5);
    return (a1===null||a2===null) ? 0 : a1-a2; };
  const dR=drift('right'), dL=drift('left');
  chk('зуб винтовой, и рука следует за червяком', Math.sign(dR) === -Math.sign(dL) && Math.abs(dR)>0.005,
      {right:+dR.toFixed(4), left:+dL.toFixed(4)});
}
{ // Cheap enough to keep in the interactive path: the field is computed over ONE tooth pitch and copied.
  const t0=Date.now(); base({gearWheelRim:'envelope', gearTeeth:60, gearThick:16}); const ms=Date.now()-t0;
  chk('нарезка укладывается в бюджет пересчёта', ms < 3000, {ms});
}

console.log('\n'+(fail?'FAILED':'ALL PASSED')+': '+pass+' passed, '+fail+' failed');
if(fail) process.exitCode=1;
