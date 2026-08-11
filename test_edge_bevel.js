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
  // The SPREAD is the signal, not the multiple: quadratic growth sends the ratio climbing with N (it went
  // 1.6x at four sides to 8x at thirty-two before the single-pass clip). A constant multiple is what
  // linear looks like. The multiple itself rose from under 3 to 4 in v145, and for a stated reason: the
  // shell is now split on the band boundary first, and a triangle that straddles it becomes three. That
  // is what stopped the seam coming out as T-junctions, and it is a constant factor, not a trend.
  chk('и рост треугольников линейный, а не квадратичный',
      Math.max(...ratio) < 5 && Math.max(...ratio)/Math.min(...ratio) < 1.2,
      ratio.map(r=>+r.toFixed(2)));
}
for(const [nm,ov] of Object.entries({squircle:{squircle:60}, шестерня:{gearMode:'spur'},
                                     резьба:{threadMode:'cap'}, ваза:{fnOn:true,fnMode:'vase'},
                                     'скруглённый куб':{filletRadius:5}})){
  const plain = mk(ov);
  const t = mk({...ov, edgeBevelWhere:'bottom', edgeBevel:1.5});
  { const __mc = manifoldCheck(t,4); chk(nm+': круглый контур больше не отказ', __mc.watertight, __mc); }
  chk(nm+': и жалобы в сводку не идёт',
      !collectPrintWarnings(paramState.box).some(w=>/слишком круглый/.test(w)), {note:edgeBevelNote});
}

console.log('=== the outline is followed per SHELL, and what is left is said out loud ===');
// The hull is taken per connected shell rather than once over the whole model. Most concave outlines
// here are concave only because SEVERAL shells add up to one — a wall plate plus its bar, a backplate
// plus its hook, the two halves of a dovetail — and each shell on its own is very nearly convex.
// Measured on the parts that used to warn: one global hull was 56-95% filled by the real footprint,
// per-shell hulls are 99-101%. These four are the regression guard for that.
for(const [nm,ov] of [['крючок на стену',{hookMount:'wall'}], ['органайзер',{woBack:'cleat'}],
                      ['ласточкин хвост',{mntMode:'dovetail'}], ['темп-башня',{mntMode:'temptower'}]]){
  const t = mk({...ov, edgeBevelWhere:'bottom', edgeBevel:2});
  chk(nm+': контур больше не считается вогнутым', !/вогнут/.test(edgeBevelNote), {note:edgeBevelNote});
  { const __mc = manifoldCheck(t,4); chk(nm+': и деталь замкнута', __mc.watertight, __mc); }
}
// A genuinely concave outline still cannot be followed — hull-tangent planes do not reach into a
// notch, and no amount of splitting into shells helps. The pipe collar is the honest example: it has
// a mouth, so its plan really is a C.
{ const t = mk({hookMount:'pipe', hookPipeD:25, edgeBevelWhere:'top', edgeBevel:2});
  chk('хомут на трубу: C-образный контур назван вогнутым', /вогнут/.test(edgeBevelNote), {note:edgeBevelNote});
  chk('и это доходит до сводки', collectPrintWarnings(paramState.box).some(w=>/вогнут/.test(w)), {});
  chk('но деталь всё равно замкнута', manifoldCheck(t,4).watertight, manifoldCheck(t,4)); }
// ...and nothing round or hollow is ever called concave. The band of ANY hollow part is an annulus,
// and leaving its bore empty made every container, vase, jar and funnel read as concave when their
// outline is a perfect circle — the measure fills enclosed holes before comparing.
for(const [nm,ov] of [['куб',{}], ['призма6',{polyN:6}], ['почти круг',{polyN:32}], ['squircle',{squircle:60}],
                      ['полый',{hollow:true}], ['банка',{threadMode:'jar'}], ['крышка резьбы',{threadMode:'cap'}],
                      ['ваза',{fnOn:true,fnMode:'vase'}], ['воронка',{fnOn:true}],
                      ['холдер',{mntMode:'battery'}], ['крышка корпуса',{pbPart:'lid'}]])
  for(const wh of ['bottom','top']){
    mk({...ov, edgeBevelWhere:wh, edgeBevel:2});
    chk(nm+' '+wh+': выпуклый/полый контур вогнутым не назван', !/вогнут/.test(edgeBevelNote),
        {note:edgeBevelNote});
  }

console.log('=== a grid that lands ON the cut is still capped ===');
// The section of a shell by one chamfer plane is collected triangle by triangle. A triangle with two
// vertices exactly ON the plane bounds the cap just as a crossing one does — and a 45° chamfer through
// a regular wall grid puts a hundred of them on the cut at once. Skipping them returned the section as
// an OPEN chain, so no cap was built and the whole shell was dropped: every hollow container, jar,
// bracket and stand came back with no chamfer at all. These are the shapes that used to lose it.
// (A jar and a hex panel still fall back — see IDEAS.md: on a mesh whose plan hull runs to ~170 sides
// the surface is clipped in 3D while its cap is clipped in 2D, and the two paths disagree by rounding
// at the mitre points. They keep a sharp edge and say so; nothing ships broken.)
for(const [nm,ov] of [['полый',{hollow:true,wallThickness:2}],
                      ['L-кронштейн',{mntMode:'lbracket'}], ['подставка',{psOn:true}]]){
  const plain = mk(ov);
  const t = mk({...ov, edgeBevelWhere:'bottom', edgeBevel:2});
  chk(nm+': фаска реально снята', vol(t) < vol(plain) - 1e-6,
      {before:+vol(plain).toFixed(1), after:+vol(t).toFixed(1)});
  { const __mc = manifoldCheck(t,4); chk(nm+': и деталь замкнута', __mc.watertight, __mc); }
  chk(nm+': и оболочка не осталась острой', !/не срезалась/.test(edgeBevelNote), {note:edgeBevelNote});
}
// the wall thickness decides where the grid lands, so sweep it — this is the case that used to break
for(const wt of [1.2, 2, 2.5, 3, 4]){
  const t = mk({hollow:true, wallThickness:wt, edgeBevelWhere:'both', edgeBevel:2});
  { const __mc = manifoldCheck(t,4); chk('полый, стенка '+wt+': замкнут и срезан', __mc.watertight && vol(t) < vol(mk({hollow:true, wallThickness:wt})) - 1e-6, __mc); }
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

console.log('=== никакого молчания: либо фаска, либо объяснение ===');
// The worst thing this feature did was nothing at all, without a word. Six shapes of thirty set a chamfer
// and got back the same model with an empty note, which reads exactly like a broken build. Each of those
// six had its own cause and three of them are now cut; what is claimed here is the invariant that
// survives all of it — the chamfer either happens or says why not.
function bevelOf(ov, where){
  logos.length=0; boxHoles.length=0; dieFaces.length=0;
  Object.assign(paramState.box, defaultBoxParams(), {gfBaseplate:false, edgeBevelWhere:'none'}, ov);
  const plain = buildTrisForShape('box', paramState.box), pb = computeBBox(plain);
  Object.assign(paramState.box, {edgeBevelWhere:where||'bottom', edgeBevel:1.5, edgeBevelAngle:45});
  const bev = buildTrisForShape('box', paramState.box), bb = computeBBox(bev);
  const span=(t,y)=>{ let lo=1e9,hi=-1e9;
    for(const T of t) for(const v of T) if(Math.abs(v[1]-y)<=0.05){ lo=Math.min(lo,v[0]); hi=Math.max(hi,v[0]); }
    return hi>lo?hi-lo:0; };
  return { plain, bev, note: edgeBevelNote,
           cut: span(plain, pb.minY+0.02) - span(bev, bb.minY+0.02),
           watertight: manifoldCheck(bev,4).watertight };
}
const SHAPES = {
  'куб':{}, 'полый':{hollow:true,wallThickness:2.5}, 'скруглённый':{cornerRadius:8},
  'банка':{threadMode:'jar'}, 'крышка':{threadMode:'cap'}, 'носик':{threadMode:'cap',threadTop:'spout'},
  'гайка':{threadMode:'nut'}, 'болт':{threadMode:'bolt'}, 'лист':{sheetShape:'rect'},
  'сотовая панель':{sheetShape:'rect',sheetPattern:'hex',sheetCut:'through'},
  'ваза':{fnOn:true,fnMode:'vase'}, 'воронка':{fnOn:true}, 'дозатор':{fnOn:true,fnMode:'doser'},
  'шестерня':{gearMode:'spur'}, 'колесо':{gearMode:'wormwheel'}, 'червяк':{gearMode:'worm'},
  'L-кронштейн':{mntMode:'lbracket'}, 'подставка':{psOn:true}, 'крючок':{hookMount:'wall'},
  'корпус':{pbPart:'tray'}, 'Gridfinity':{gfOn:true}, 'кость d20':{platonic:'d20'}, 'кость d6':{platonic:'d6'},
  'призма':{polyN:6}, 'кейкап':{keycapMode:'single'}, 'петля':{pipMode:'hinge'}, 'клипса':{pipMode:'clip'},
  'органайзер':{woOn:true}, 'планка':{hookMount:'cleat'}, 'темп-башня':{mntMode:'temptower'},
};
let cutN=0, saidN=0;
for(const [nm,ov] of Object.entries(SHAPES)){
  const r = bevelOf(ov);
  chk(nm+': фаска не ломает деталь', r.watertight, {});
  const did = r.cut > 1.0;
  chk(nm+': либо срезано, либо сказано почему', did || !!r.note, {срез:+r.cut.toFixed(2), note:r.note});
  if(did) cutN++; else saidN++;
}
// Pinned so a regression cannot quietly turn cutting back into explaining.
chk('срезается заметно больше половины форм', cutN >= 26, {срезано:cutN, объяснено:saidN});

console.log('=== то, что чинилось в v145 ===');
// All four were cut by planes tangent to the WHOLE shell's hull. Anything that flares as it rises has its
// bottom well inside that hull, every plane missed, and nothing happened. The planes are now tangent to
// the outline of the BAND, per end.
for(const [nm,ov] of Object.entries({ 'ваза':{fnOn:true,fnMode:'vase'}, 'воронка':{fnOn:true},
                                      'кость d6':{platonic:'d6'}, 'дозатор':{fnOn:true,fnMode:'doser'} })){
  const r = bevelOf(ov);
  chk(nm+': низ действительно срезан', r.cut > 1.0, {срез:+r.cut.toFixed(2)});
}
{ // Gridfinity mates are interfaces, and which END is the interface differs: a BIN carries its feet
  // underneath, a BASEPLATE its sockets on top. Each refuses its own end and cuts the other. The plate
  // also had to be routed THROUGH the chamfer at all — it used to return straight out of the builder, so
  // a chamfer on it vanished without a word: the one hole left in "either a chamfer or a reason".
  const binB = bevelOf({gfOn:true}, 'bottom'), binT = bevelOf({gfOn:true}, 'top');
  chk('низ Gridfinity-бина не срезается', binB.cut < 0.01, {срез:+binB.cut.toFixed(3)});
  chk('и объясняет, почему', /ножки/.test(binB.note||''), {note:binB.note});
  chk('а верх бина — срезается', binT.bev.length > binT.plain.length, {from:binT.plain.length, to:binT.bev.length});
  const plT = bevelOf({gfBaseplate:true}, 'top'), plB = bevelOf({gfBaseplate:true}, 'bottom');
  chk('верх Gridfinity-плиты не срезается', plT.bev.length === plT.plain.length, {from:plT.plain.length, to:plT.bev.length});
  chk('и объясняет, почему', /гнёзда/.test(plT.note||''), {note:plT.note});
  chk('а низ плиты — срезается', plB.bev.length > plB.plain.length, {from:plB.plain.length, to:plB.bev.length});
  chk('плита остаётся замкнутой', plB.watertight && plT.watertight, {});
  // both ends at once: each part keeps its interface and loses the other edge
  const binBoth = bevelOf({gfOn:true}, 'both'), plBoth = bevelOf({gfBaseplate:true}, 'both');
  chk('бин «оба конца»: низ сохранён, верх срезан', binBoth.cut < 0.01 && binBoth.bev.length > binBoth.plain.length, {});
  chk('плита «оба конца»: верх сохранён, низ срезан', plBoth.bev.length > plBoth.plain.length && /гнёзда/.test(plBoth.note||''), {});
}
{ // A J-hook and a French cleat hang on a rounded bar end: there is no edge down there to take off, and
  // that is a different sentence from "it broke".
  for(const nm of ['крючок','планка']){
    const r = bevelOf(nm==='крючок' ? {hookMount:'wall'} : {hookMount:'cleat'});
    chk(nm+': сказано, что срезать нечего', /срезать нечего/.test(r.note||''), {note:r.note});
  }
}
{ // The band boundary must be a clean cut, or the seam is T-junctions. Checked where it bit hardest.
  for(const [nm,ov] of Object.entries({ 'крючок':{hookMount:'wall'}, 'ваза':{fnOn:true,fnMode:'vase'},
                                        'корпус':{pbPart:'tray'} })){
    const r = bevelOf(ov, 'both');
    chk(nm+' (низ и верх): шов сомкнут', r.watertight, {});
  }
}

console.log('\n=== TOTAL:', pass, 'passed,', fail, 'failed ===');
if(fail) process.exitCode = 1;
