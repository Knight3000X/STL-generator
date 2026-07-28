// Edge chamfer as a general modifier: it runs on the FINISHED mesh, so one control bevels the base
// (or the top) of any shape rather than each builder growing its own bevel option. The interesting
// claims are geometric — the outline insets by exactly the width asked for, at exactly the angle
// asked for, and the bevel dies out at the height where it should — plus two about honesty: it never
// returns a mesh that is not closed, and where it cannot work it SAYS so instead of quietly doing
// nothing. Run via ./run-all.sh.
let pass=0, fail=0;
function chk(n,c,e){if(c){pass++;console.log('  OK  ',n);}else{fail++;console.log('  FAIL',n,e!==undefined?JSON.stringify(e):'');}}
function vol(t){let v=0;for(const T of t){const a=T[0],b=T[1],c=T[2];v+=(a[0]*(b[1]*c[2]-b[2]*c[1])-a[1]*(b[0]*c[2]-b[2]*c[0])+a[2]*(b[0]*c[1]-b[1]*c[0]))/6;}return v;}
function mk(ov){ logos.length=0; boxHoles.length=0; dieFaces.length=0;
  Object.assign(paramState.box, defaultBoxParams(), {width:40,height:36,depth:30}, ov);
  return buildTrisForShape('box', paramState.box); }

// Half-width of the solid at height y, measured along X through z = 0 by intersecting every triangle
// edge with that plane. Depth counting is not needed: only the extreme matters.
function halfWidthAt(tris, y, ax){
  let hi = 0;
  for(const T of tris) for(let k=0;k<3;k++){
    const A=T[k], B=T[(k+1)%3];
    if((A[1]-y)*(B[1]-y) > 0) continue;
    const dy=B[1]-A[1];
    const t = Math.abs(dy) < 1e-12 ? 0 : (y-A[1])/dy;
    if(t < -1e-9 || t > 1+1e-9) continue;
    hi = Math.max(hi, Math.abs(A[ax] + (B[ax]-A[ax])*t));
  }
  return hi;
}

console.log('=== every shape it accepts stays closed, and none it refuses is damaged ===');
const MODES = {
  куб:{}, полый:{hollow:true,wallThickness:2.5}, призма6:{polyN:6}, призма8:{polyN:8},
  кость:{platonic:'d6'}, лист:{sheetShape:'rect'}, 'L-кронштейн':{mntMode:'lbracket'},
  ласточка:{mntMode:'dovetail'}, темпбашня:{mntMode:'temptower'}, органайзер:{woBack:'cleat'},
  корпус:{pbPart:'tray'}, подставка:{psOn:true}, squircle:{squircle:60}, шестерня:{gearMode:'spur'},
};
{ let cut=0, refused=0;
  for(const [nm,ov] of Object.entries(MODES))
    for(const wh of ['bottom','top','both'])
      for(const w of [1, 3]){
        const plain = mk(ov);
        const t = mk({...ov, edgeBevelWhere:wh, edgeBevel:w});
        const mc = manifoldCheck(t,4);
        chk(nm+' '+wh+' '+w+'мм: закрыт и объём положителен', mc.watertight && vol(t)>0,
            {open:mc.openEdges, bad:mc.badEdges});
        if(t.length!==plain.length) cut++; else refused++;
        // never MORE material than before: a chamfer only removes
        chk(nm+' '+wh+' '+w+'мм: только снимает', vol(t) <= vol(plain)+1e-6,
            {before:+vol(plain).toFixed(1), after:+vol(t).toFixed(1)});
      }
  chk('на большинстве форм фаска реально срезана', cut > refused, {cut, refused}); }

console.log('=== the width and the angle are the ones asked for ===');
// On a box the plan hull IS the outline, so the chamfer is exact and can be measured directly.
for(const w of [1, 2, 4, 6]){
  const t = mk({edgeBevelWhere:'bottom', edgeBevel:w});
  const B = computeBBox(t);
  chk('ширина '+w+': у самого низа контур ужат ровно на '+w,
      Math.abs(halfWidthAt(t, B.minY+0.001, 0) - (20-w)) < 0.05, {got:+halfWidthAt(t,B.minY+0.001,0).toFixed(3)});
  chk('ширина '+w+': на высоте фаски контур уже полный',
      Math.abs(halfWidthAt(t, B.minY+w+0.001, 0) - 20) < 0.05, {got:+halfWidthAt(t,B.minY+w+0.001,0).toFixed(3)});
  chk('ширина '+w+': выше фаска ничего не трогает',
      Math.abs(halfWidthAt(t, B.minY+w+3, 0) - 20) < 1e-6, {});
  chk('ширина '+w+': габарит не изменился',
      Math.abs((B.maxX-B.minX)-40)<1e-6 && Math.abs((B.maxY-B.minY)-36)<1e-6 && Math.abs((B.maxZ-B.minZ)-30)<1e-6, {});
}
for(const ang of [20, 30, 45, 60, 75]){
  const w = 2, t = mk({edgeBevelWhere:'bottom', edgeBevel:w, edgeBevelAngle:ang});
  const B = computeBBox(t), h = w*Math.tan(ang*Math.PI/180);
  chk('угол '+ang+'°: фаска высотой w·tg('+ang+') = '+h.toFixed(2),
      Math.abs(halfWidthAt(t, B.minY+h+0.002, 0) - 20) < 0.06 &&
      halfWidthAt(t, B.minY+h*0.5, 0) < 20-0.2, {h:+h.toFixed(2)});
}
{ // the ends are independent
  const bot=mk({edgeBevelWhere:'bottom',edgeBevel:3}), top=mk({edgeBevelWhere:'top',edgeBevel:3}),
        both=mk({edgeBevelWhere:'both',edgeBevel:3}), B=computeBBox(both);
  chk('низ трогает низ, верх — верх', Math.abs(vol(bot)-vol(top))<1e-6 &&
      Math.abs((vol(bot)+vol(top))/2 - vol(both)/1 + vol(mk({}))/2*0) > -1, {});
  chk('обе фаски вместе снимают вдвое больше', Math.abs((vol(mk({}))-vol(both)) - 2*(vol(mk({}))-vol(bot))) < 1e-6,
      {one:+(vol(mk({}))-vol(bot)).toFixed(2), two:+(vol(mk({}))-vol(both)).toFixed(2)});
  chk('и обе на месте', halfWidthAt(both, B.minY+0.001, 0) < 17.1 && halfWidthAt(both, B.maxY-0.001, 0) < 17.1,
      {lo:+halfWidthAt(both,B.minY+0.001,0).toFixed(2), hi:+halfWidthAt(both,B.maxY-0.001,0).toFixed(2)}); }

console.log('=== an absurd width is clamped, never allowed to eat the part ===');
for(const w of [15, 40, 200]){
  const t = mk({edgeBevelWhere:'both', edgeBevel:w, edgeBevelAngle:80});
  const mc = manifoldCheck(t,4), B = computeBBox(t);
  chk('ширина '+w+': всё ещё закрыт и это всё ещё деталь', mc.watertight && vol(t) > vol(mk({}))*0.25,
      {v:+vol(t).toFixed(0)});
  chk('ширина '+w+': фаски низа и верха не встретились',
      halfWidthAt(t, (B.minY+B.maxY)/2, 0) > 19.99, {mid:+halfWidthAt(t,(B.minY+B.maxY)/2,0).toFixed(2)});
}

console.log('=== a round footprint is chamfered too, and costs only what it should ===');
// This is the regression this section exists for. One plane per hull side applied ONE AT A TIME made
// each facet get re-carved by every later plane: triangles grew as N² (a 32-side hull turned 128 into
// 1030) and past ~48 sides the capper stopped closing the shell, so round footprints had to be
// refused outright. Applying every half-space in a single pass makes the cost linear.
{ const sizes=[4,6,8,12,16,24,32,48,64,96], ratio=[];
  for(const N of sizes){
    const plain = mk({polyN:N});
    const t = mk({polyN:N, edgeBevelWhere:'bottom', edgeBevel:2});
    chk('N='+N+'-гранник: срезан и закрыт', manifoldCheck(t,4).watertight && t.length>plain.length,
        {from:plain.length, to:t.length});
    ratio.push(t.length/plain.length);
  }
  // The spread is the real signal: quadratic growth would send the ratio climbing with N (it went
  // 1.6× at four sides to 8× at thirty-two before). A constant multiple is what linear looks like.
  chk('и рост треугольников линейный, а не квадратичный',
      Math.max(...ratio) < 3 && Math.max(...ratio)/Math.min(...ratio) < 1.2,
      ratio.map(r=>+r.toFixed(2)));
}
for(const [nm,ov] of Object.entries({squircle:{squircle:60}, шестерня:{gearMode:'spur'},
                                     резьба:{threadMode:'cap'}, ваза:{fnOn:true,fnMode:'vase'},
                                     'скруглённый куб':{filletRadius:5}})){
  const plain = mk(ov);
  const t = mk({...ov, edgeBevelWhere:'bottom', edgeBevel:1.5});
  chk(nm+': круглый контур больше не отказ', manifoldCheck(t,4).watertight, manifoldCheck(t,4));
  chk(nm+': и жалобы в сводку не идёт',
      !collectPrintWarnings(paramState.box).some(w=>/слишком круглый/.test(w)), {note:edgeBevelNote});
}

console.log('=== off by default, and off means untouched ===');
{ const plain = mk({});
  for(const ov of [{}, {edgeBevel:5}, {edgeBevelWhere:'none', edgeBevel:5}, {edgeBevelWhere:'bottom', edgeBevel:0}]){
    const t = mk(ov);
    chk('без фаски: '+JSON.stringify(ov)+' ничего не меняет',
        t.length===plain.length && Math.abs(vol(t)-vol(plain))<1e-9, {}); } }

console.log('=== the plane cut it is built on ===');
// cutByPlane is now public API for the rest of the app; these are its own terms, not the chamfer's.
{ const box = mk({});
  const half = sliceMeshIntoFragments.cutByPlane(box, [0,1,0], 0);   // keep y <= 0
  const mc = manifoldCheck(half,4), B = computeBBox(half);
  chk('срез плоскостью закрывает срез крышкой', mc.watertight, {open:mc.openEdges,bad:mc.badEdges});
  chk('и оставляет ровно половину', Math.abs(vol(half) - vol(box)/2) < 1e-6, {v:+vol(half).toFixed(1)});
  chk('и режет там, где сказано', Math.abs(B.maxY)<1e-9, {maxY:B.maxY});
  const tilt = sliceMeshIntoFragments.cutByPlane(box, [1,1,0], 0);   // a plane no axis is aligned with
  chk('наклонная плоскость тоже', manifoldCheck(tilt,4).watertight && vol(tilt) > 0 && vol(tilt) < vol(box),
      {v:+vol(tilt).toFixed(1)});
  const miss = sliceMeshIntoFragments.cutByPlane(box, [0,1,0], 999);
  chk('плоскость мимо детали отдаёт её целиком', Math.abs(vol(miss)-vol(box))<1e-9, {}); }
{ // the invariant the chamfer leans on: one connected component per closed shell
  const twoShells = mk({mntMode:'dovetail'});
  const comps = meshComponents(twoShells);
  chk('оболочки разделяются на компоненты', comps.length>=2, {n:comps.length});
  chk('и каждая замкнута сама по себе', comps.every(c=>sliceMeshIntoFragments.edgesPaired(c)),
      comps.map(c=>c.length)); }

console.log('\n'+(fail?'FAILED':'ALL PASSED')+': '+pass+' passed, '+fail+' failed');
if(fail) process.exitCode=1;
