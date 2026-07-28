// Vase / lampshade (ваза, абажур): a shell of revolution through four named diameters, optionally
// facetted and twisted, through the REAL buildTrisForShape pipeline. The point of naming only four numbers
// is that the curve between them does the work, so the tests measure the silhouette the spline produced.
// Run via ./run-all.sh.
let pass=0,fail=0; function chk(n,c,e){if(c){pass++;console.log('  OK  ',n);}else{fail++;console.log('  FAIL',n,e!==undefined?JSON.stringify(e):'');}}
function vol(t){let v=0;for(const T of t){const a=T[0],b=T[1],c=T[2];v+=(a[0]*(b[1]*c[2]-b[2]*c[1])-a[1]*(b[0]*c[2]-b[2]*c[0])+a[2]*(b[0]*c[1]-b[1]*c[0]))/6;}return v;}
function base(ov){ logos.length=0; boxHoles.length=0; dieFaces.length=0;
  Object.assign(paramState.box, defaultBoxParams(), {width:40,height:40,depth:40,
    fnOn:true, fnMode:'vase', vaseH:120, vaseBaseD:60, vaseBellyD:95, vaseBellyAt:35,
    vaseNeckD:55, vaseNeckAt:75, vaseMouthD:70, vaseFacets:0, vaseTwist:0, vaseFloor:true, fnWall:2,
    pbPart:'none',woBack:'none',hookMount:'none',mntMode:'none',gearMode:'none',pipMode:'none',psOn:false,
    threadMode:'none',sheetShape:'none',keycapMode:'none',platonic:'none',polyN:0,binRound:0,
    scoopDir:'none',labelTab:'none',mountHoles:'none',gripWall:'none',divX:1,divZ:1,stackFeet:false,gfOn:false}, ov);
  return buildTrisForShape('box',paramState.box); }

// Outer radius at a given fraction of the height, straight off the mesh.
function radiusAt(t, frac){
  const B=computeBBox(t), y=B.minY+(B.maxY-B.minY)*frac;
  let r=0;
  for(const T of t) for(const v of T)
    if(Math.abs(v[1]-y) < (B.maxY-B.minY)*0.006) r=Math.max(r, Math.hypot(v[0],v[2]));
  return r;
}

console.log('=== watertight across facets × twist × floor × wall ===');
for(const fac of [0,3,5,6,8,12,24])
  for(const tw of [0,90,180,-360])
    for(const fl of [true,false]){
      const t=base({vaseFacets:fac,vaseTwist:tw,vaseFloor:fl}), mc=manifoldCheck(t,4);
      chk('граней'+fac+' закрутка'+tw+' дно'+fl+' watertight (+vol)', mc.watertight&&vol(t)>0,
          {open:mc.openEdges,bad:mc.badEdges});
    }
for(const ov of [{fnWall:0.8},{fnWall:8},{vaseH:20},{vaseH:300},{vaseBaseD:10},{vaseBaseD:250},
                 {vaseBellyD:10},{vaseBellyD:300},{vaseMouthD:10},{vaseNeckD:10},
                 {vaseBellyAt:5,vaseNeckAt:15},{vaseBellyAt:85,vaseNeckAt:95},
                 {vaseBellyAt:80,vaseNeckAt:20}]){
  const t=base(ov), mc=manifoldCheck(t,4);
  chk('extreme '+JSON.stringify(ov)+' watertight', mc.watertight&&vol(t)>0, {open:mc.openEdges,bad:mc.badEdges});
}

console.log('=== the silhouette hits the diameters it was given ===');
{ const t=base({vaseBaseD:60,vaseBellyD:95,vaseBellyAt:35,vaseNeckD:55,vaseNeckAt:75,vaseMouthD:70});
  const B=computeBBox(t);
  chk('height is what was asked', Math.abs((B.maxY-B.minY)-120)<0.05, {h:+(B.maxY-B.minY).toFixed(2)});
  chk('the widest point is the belly Ø', Math.abs((B.maxX-B.minX)-95)<0.6, {x:+(B.maxX-B.minX).toFixed(2)});
  for(const [frac,want,label] of [[0.005,30,'foot'],[0.35,47.5,'belly'],[0.75,27.5,'neck'],[0.995,35,'mouth']]){
    const r=radiusAt(t, frac);
    chk('at the '+label+' the radius is the one named', Math.abs(r-want)<1.2, {r:+r.toFixed(2), want});
  }
}
{ // the control heights move the features
  const low=base({vaseBellyAt:15}), high=base({vaseBellyAt:70});
  const rl=radiusAt(low,0.15), rh=radiusAt(high,0.70);
  chk('the belly sits where it is placed', Math.abs(rl-47.5)<1.5 && Math.abs(rh-47.5)<1.5,
      {low:+rl.toFixed(1), high:+rh.toFixed(1)}); }
{ // between control points it is a CURVE, not a straight cone: the midpoint departs from the chord
  const t=base({vaseBaseD:40,vaseBellyD:100,vaseBellyAt:50,vaseNeckD:40,vaseNeckAt:99,vaseMouthD:40});
  const rMid=radiusAt(t, 0.25), chord=(20+50)/2;
  chk('the profile bulges away from the straight line between controls', Math.abs(rMid-chord)>1.0,
      {mid:+rMid.toFixed(2), chord}); }

console.log('=== it is a shell, and the floor is a floor ===');
{ const solidish=vol(base({fnWall:8})), thin=vol(base({fnWall:0.8}));
  chk('a thicker wall is more material', solidish>thin*2, {thin:+thin.toFixed(0),thick:+solidish.toFixed(0)});
  const B=computeBBox(base());
  const outerVol=Math.PI*Math.pow(47.5,2)*120;
  chk('and it is nowhere near solid', vol(base()) < outerVol*0.35, {v:+vol(base()).toFixed(0)}); }
{ const withFloor=vol(base({vaseFloor:true})), open=vol(base({vaseFloor:false}));
  chk('the floor adds material', withFloor>open, {withFloor:+withFloor.toFixed(0),open:+open.toFixed(0)});
  chk('and switching it off is what makes a lampshade', withFloor-open > 1000,
      {d:+(withFloor-open).toFixed(0)}); }

console.log('=== facets and twist ===');
{ const round=computeBBox(base({vaseFacets:0})), hex=computeBBox(base({vaseFacets:6}));
  chk('a facetted vase is inscribed in the round one', (hex.maxX-hex.minX) <= (round.maxX-round.minX)+1e-6,
      {round:+(round.maxX-round.minX).toFixed(2), hex:+(hex.maxX-hex.minX).toFixed(2)});
  chk('and holds less', vol(base({vaseFacets:6})) < vol(base({vaseFacets:0})), {}); }
{ // more facets converge on the circle
  const vs=[3,6,12,24].map(n=>vol(base({vaseFacets:n})));
  const rnd=vol(base({vaseFacets:0}));
  chk('more facets → closer to round', vs[0]<vs[1] && vs[1]<vs[2] && vs[2]<vs[3] && vs[3]<rnd*1.001,
      vs.map(v=>+v.toFixed(0))); }
{ // twist has to actually turn the section: compare the widest direction low down vs high up
  const dirAt=(t,frac)=>{ const B=computeBBox(t), y=B.minY+(B.maxY-B.minY)*frac;
    let best=0, ang=0;
    for(const T of t) for(const v of T) if(Math.abs(v[1]-y)<(B.maxY-B.minY)*0.006){
      const r=Math.hypot(v[0],v[2]); if(r>best){ best=r; ang=Math.atan2(v[2],v[0]); } }
    return ang; };
  const straight=base({vaseFacets:6,vaseTwist:0}), turned=base({vaseFacets:6,vaseTwist:180});
  const dS=Math.abs(dirAt(straight,0.15)-dirAt(straight,0.85));
  const dT=Math.abs(dirAt(turned,0.15)-dirAt(turned,0.85));
  chk('without twist the section keeps its orientation', dS < 0.2, {d:+dS.toFixed(3)});
  chk('with twist it turns', dT > 0.2, {d:+dT.toFixed(3)}); }
{ const a=vol(base({vaseFacets:6,vaseTwist:0})), b=vol(base({vaseFacets:6,vaseTwist:360}));
  chk('twisting does not change how much it holds, much', Math.abs(a-b) < a*0.05,
      {a:+a.toFixed(0), b:+b.toFixed(0)}); }
{ const t=base({vaseFacets:0,vaseTwist:270});
  chk('twist on a round vase is a no-op, not a defect', manifoldCheck(t,4).watertight &&
      Math.abs(vol(t)-vol(base({vaseFacets:0,vaseTwist:0})))<1e-9, {}); }

console.log('=== the funnel and the doser are untouched ===');
{ const f=base({fnMode:'funnel'}), d=base({fnMode:'doser'});
  chk('funnel still builds', manifoldCheck(f,4).watertight && vol(f)>0, {});
  chk('doser still builds', manifoldCheck(d,4).watertight && vol(d)>0, {});
  const a=vol(base({fnMode:'funnel',vaseH:20,vaseFacets:3})), b=vol(base({fnMode:'funnel',vaseH:300,vaseFacets:24}));
  chk('the vase knobs do nothing to the funnel', Math.abs(a-b)<1e-9, {}); }

console.log('\n'+(fail?'FAILED':'ALL PASSED')+': '+pass+' passed, '+fail+' failed');
if(fail) process.exitCode=1;
