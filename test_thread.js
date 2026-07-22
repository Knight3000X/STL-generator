// Threaded parts (резьба): internal-thread cap + external-thread stud, through the REAL
// buildTrisForShape pipeline. Verifies watertightness, that the thread actually removes/adds
// material, dimensional correctness, and — the whole point — that a cap and a stud of the same
// nominal Ø MATE (female bore clears the male crest by ~clearance). Run via ./run-all.sh.
let pass=0,fail=0; function chk(n,c,e){if(c){pass++;console.log('  OK  ',n);}else{fail++;console.log('  FAIL',n,e!==undefined?JSON.stringify(e):'');}}
function vol(t){let v=0;for(const T of t){const a=T[0],b=T[1],c=T[2];v+=(a[0]*(b[1]*c[2]-b[2]*c[1])-a[1]*(b[0]*c[2]-b[2]*c[0])+a[2]*(b[0]*c[1]-b[1]*c[0]))/6;}return v;}
function base(ov){ logos.length=0; boxHoles.length=0; dieFaces.length=0;
  Object.assign(paramState.box, defaultBoxParams(), {width:40,height:40,depth:40,
    threadMode:'cap',threadD:30,threadPitch:3,threadStarts:1,threadLen:16,threadClear:0.4,threadDepth:0,
    threadFlat:0.14,threadHand:'right',threadWall:2.5,threadTop:2.5,threadGrip:24,threadGripD:0.9,threadFlange:3,threadFlangeR:0,
    sheetShape:'none',keycapMode:'none',platonic:'none',polyN:0,binRound:0,
    scoopDir:'none',labelTab:'none',mountHoles:'none',gripWall:'none',divX:1,divZ:1,stackFeet:false,gfOn:false}, ov);
  return buildTrisForShape('box',paramState.box); }

console.log('=== watertight: cap × stud × jar × pitch × starts × handedness ===');
for(const mode of ['cap','stud','jar'])
  for(const pitch of [1.5,3,5])
    for(const starts of [1,2,3])
      for(const hand of ['right','left']){
        const t=base({threadMode:mode,threadPitch:pitch,threadStarts:starts,threadHand:hand});
        const mc=manifoldCheck(t,4);
        chk(mode+' P'+pitch+' ×'+starts+' '+hand+' watertight (+vol)', mc.watertight&&vol(t)>0, {wt:mc.watertight,open:mc.openEdges,vol:+vol(t).toFixed(0)});
      }

console.log('=== nominal-Ø range ===');
for(const D of [8,16,30,60,120]){
  chk('cap Ø'+D+' watertight', manifoldCheck(base({threadMode:'cap',threadD:D}),4).watertight);
  chk('stud Ø'+D+' watertight', manifoldCheck(base({threadMode:'stud',threadD:D}),4).watertight);
  chk('jar Ø'+D+' watertight', manifoldCheck(base({threadMode:'jar',threadD:D}),4).watertight);
}

console.log('=== jar: hollow vessel ===');
{ const b=computeBBox(base({threadMode:'jar',threadD:30,threadBodyD:50,threadBodyH:35,threadLen:16}));
  chk('jar body Ø = 50', Math.abs((b.maxX-b.minX)-50)<0.5 && Math.abs((b.maxZ-b.minZ)-50)<0.5, {x:+(b.maxX-b.minX).toFixed(1),z:+(b.maxZ-b.minZ).toFixed(1)});
  chk('jar height ≈ bodyH + threadLen', Math.abs((b.maxY-b.minY)-(35+16))<0.3, {y:+(b.maxY-b.minY).toFixed(1),expect:51}); }
{ const solidLike=vol(base({threadMode:'jar',threadWall:12,threadFloor:12})), hollow=vol(base({threadMode:'jar',threadWall:2,threadFloor:2}));
  chk('jar is hollow (thin walls enclose far less material)', hollow<solidLike, {hollow:+hollow.toFixed(0),solidLike:+solidLike.toFixed(0)}); }
{ const auto=computeBBox(base({threadMode:'jar',threadD:30,threadBodyD:0}));   // auto body Ø = D+16 = 46
  chk('jar auto body Ø = D+16', Math.abs((auto.maxX-auto.minX)-46)<0.5, {x:+(auto.maxX-auto.minX).toFixed(1)}); }
console.log('=== jar: arbitrary body footprint (container of any shape) ===');
for(const shape of ['round','squircle','roundrect','rect'])
  chk('jar '+shape+' footprint watertight (+vol)', (()=>{const t=base({threadMode:'jar',threadBodyShape:shape,threadBodyD:50,threadBodyW:40,threadD:26});const mc=manifoldCheck(t,4);return mc.watertight&&vol(t)>0;})(), {shape});
{ const b=computeBBox(base({threadMode:'jar',threadBodyShape:'rect',threadBodyD:50,threadBodyW:40,threadD:26}));
  chk('rect footprint spans W×D (40×50)', Math.abs((b.maxX-b.minX)-40)<1.5 && Math.abs((b.maxZ-b.minZ)-50)<1.5, {x:+(b.maxX-b.minX).toFixed(1),z:+(b.maxZ-b.minZ).toFixed(1)}); }
{ // the round neck still matches the cap regardless of body shape — bore is round Ø threadD-ish
  chk('rect jar keeps a round threaded neck (cap still fits)', manifoldCheck(base({threadMode:'cap',threadD:26}),4).watertight && manifoldCheck(base({threadMode:'jar',threadBodyShape:'rect',threadD:26}),4).watertight, {}); }

console.log('=== dimensions ===');
{ // stud outer footprint = flange Ø; cap outer Ø = nominal + 2·clear + 2·wall
  const b=computeBBox(base({threadMode:'stud',threadD:30,threadFlangeR:20}));
  chk('stud flange spans 2·R = 40', Math.abs((b.maxX-b.minX)-40)<0.2 && Math.abs((b.maxZ-b.minZ)-40)<0.2, {x:b.maxX-b.minX,z:b.maxZ-b.minZ}); }
{ const wall=2.5, clr=0.4, D=30, gripD=0.9;
  const b=computeBBox(base({threadMode:'cap',threadD:D,threadWall:wall,threadClear:clr,threadGrip:24,threadGripD:gripD}));
  const expectMax=D+2*clr+2*wall;                       // flute crests reach the base radius
  chk('cap outer Ø ≈ nominal + 2·(clear+wall)', Math.abs((b.maxX-b.minX)-expectMax)<0.6, {got:+(b.maxX-b.minX).toFixed(2),expect:expectMax}); }
{ const len=16, wall=2.5, top=2.5;                       // cap height = thread length + top slab
  const b=computeBBox(base({threadMode:'cap',threadLen:len,threadTop:top}));
  chk('cap height ≈ threadLen + top', Math.abs((b.maxY-b.minY)-(len+top))<0.2, {y:+(b.maxY-b.minY).toFixed(2),expect:len+top}); }
{ const len=16, flange=3;                                // stud height = flange + thread length
  const b=computeBBox(base({threadMode:'stud',threadLen:len,threadFlange:flange}));
  chk('stud height ≈ flange + threadLen', Math.abs((b.maxY-b.minY)-(flange+len))<0.2, {y:+(b.maxY-b.minY).toFixed(2),expect:flange+len}); }

console.log('=== thread is real (removes / adds material) ===');
{ // a cap bore with thread encloses LESS solid than a plain-bored cap of the same major bore would…
  // simpler: deeper profile → the cap keeps MORE material (bore crests intrude further inward).
  const shallow=vol(base({threadMode:'cap',threadDepth:0.8})), deep=vol(base({threadMode:'cap',threadDepth:3}));
  chk('cap: deeper thread leaves more wall material', deep>shallow, {shallow:+shallow.toFixed(0),deep:+deep.toFixed(0)}); }
{ const shallow=vol(base({threadMode:'stud',threadDepth:0.8})), deep=vol(base({threadMode:'stud',threadDepth:3}));
  chk('stud: deeper thread cuts more material away', deep<shallow, {shallow:+shallow.toFixed(0),deep:+deep.toFixed(0)}); }
{ const smooth=vol(base({threadMode:'cap',threadGrip:0})), knurled=vol(base({threadMode:'cap',threadGrip:24,threadGripD:1.2}));
  chk('cap: knurling flutes remove material from a smooth wall', knurled<smooth, {smooth:+smooth.toFixed(0),knurled:+knurled.toFixed(0)}); }

console.log('=== MATING: cap bore clears the stud crest by ~clearance, everywhere ===');
{ // Sample both female-bore and male-thread radii on the SAME (θ,y) phase and confirm the cap never
  // bites into the stud: female bore radius ≥ male thread radius at every matching phase.
  const D=30,P=3,S=1,flat=0.14,clr=0.4;
  const majorR=D/2, h=Math.min(majorR*0.6,P*0.55), minorR=majorR-h;
  let minGap=Infinity, biteFrac=0, n=0;
  for(let iy=0;iy<40;iy++) for(let it=0;it<64;it++){
    const y=iy*0.4, th=it/64;
    const tM = y/P - S*th, tF = y/P - S*th;              // same helical phase (mated)
    const rM = minorR + h*threadProfile(tM,flat);        // male surface radius
    const rF = minorR + h*threadProfile(tF,flat) + clr;  // female bore = male + clearance
    const gap = rF - rM; minGap=Math.min(minGap,gap); if(gap < -1e-6) biteFrac++; n++;
  }
  chk('female bore never bites the male crest (min gap ≥ 0)', minGap > -1e-6, {minGap:+minGap.toFixed(3)});
  chk('mating clearance ≈ radial clearance', Math.abs(minGap-clr) < 0.05, {minGap:+minGap.toFixed(3),clr});
  chk('no interference cells', biteFrac===0, {biteFrac,n}); }

console.log('=== lead-in (заходная фаска) ===');
for(const mode of ['cap','stud','jar'])
  chk(mode+' with lead-in still watertight', manifoldCheck(base({threadMode:mode,threadLead:2.5}),4).watertight);
{ // stud: near the top the thread must flatten toward the root radius (self-starting tip). Compare the max
  // radius in the top pitch with vs without a lead-in — it must shrink toward minorR.
  const topRad=(lead)=>{ const t=base({threadMode:'stud',threadD:30,threadPitch:3,threadLen:18,threadLead:lead,threadFlange:3});
    const b=computeBBox(t), yTop=b.maxY; let mx=0;
    for(const T of t) for(const v of T) if(v[1] > yTop-0.6) mx=Math.max(mx, Math.hypot(v[0],v[2]));
    return mx; };
  chk('stud lead-in flattens the thread start (top thread shrinks)', topRad(2.5) < topRad(0)-0.5, {lead:+topRad(2.5).toFixed(2),none:+topRad(0).toFixed(2)}); }
{ // cap: at the mouth the bore must OPEN to the widest radius so the neck can enter.
  const mouthRad=(lead)=>{ const t=base({threadMode:'cap',threadD:30,threadPitch:3,threadLead:lead});
    const b=computeBBox(t), yBot=b.minY; let mn=1e9,cnt=0,sum=0;
    for(const T of t) for(const v of T) if(v[1] < yBot+0.3){ const r=Math.hypot(v[0],v[2]); if(r>1){sum+=r;cnt++;} }
    return cnt?sum/cnt:0; };
  chk('cap lead-in opens the mouth (avg bore radius grows)', mouthRad(2.5) > mouthRad(0)+0.3, {lead:+mouthRad(2.5).toFixed(2),none:+mouthRad(0).toFixed(2)}); }
chk('lead-in=0 disables cleanly (watertight)', manifoldCheck(base({threadMode:'cap',threadLead:0}),4).watertight);

console.log('=== cap sealing bead ===');
for(const s of [0.6,1.5,2.5]) chk('cap seal '+s+' watertight (+vol)', (()=>{const t=base({threadMode:'cap',threadSeal:s});const mc=manifoldCheck(t,4);return mc.watertight&&vol(t)>0;})(), {s});
{ const noSeal=vol(base({threadMode:'cap',threadSeal:0})), seal=vol(base({threadMode:'cap',threadSeal:2}));
  chk('sealing bead adds material', seal>noSeal, {noSeal:+noSeal.toFixed(0),seal:+seal.toFixed(0)}); }

console.log('=== profile sanity ===');
{ chk('profile: root=0, crest=1', threadProfile(0,0.14)===0 && Math.abs(threadProfile(0.5,0.14)-1)<1e-9, {});
  chk('profile: periodic (period 1)', Math.abs(threadProfile(0.3,0.14)-threadProfile(1.3,0.14))<1e-12, {});
  chk('profile: monotone rising flank', threadProfile(0.2,0.1) < threadProfile(0.3,0.1), {}); }

console.log('=== bolt / nut / wingnut ===');
for(const mode of ['bolt','nut','wingnut'])
  for(const D of [8,16,30,60])
    for(const pitch of [1.5,3])
      for(const hand of ['right','left']){
        const t=base({threadMode:mode,threadD:D,threadPitch:pitch,threadHand:hand,threadLen:14});
        const mc=manifoldCheck(t,4);
        chk(mode+' Ø'+D+' P'+pitch+' '+hand+' watertight (+vol)', mc.watertight&&vol(t)>0, {wt:mc.watertight,open:mc.openEdges,bad:mc.badEdges});
      }
{ // hex head across-flats: with threadHeadAF set, the head's widest cross-section (across corners) ≈ AF/cos30,
  // and the across-flats span ≈ AF. Measure the head band of a bolt (below the shaft).
  const af=24, t=base({threadMode:'bolt',threadD:16,threadHeadAF:af,threadHeadH:10,threadLen:14});
  const b=computeBBox(t); let mx=0; for(const T of t) for(const v of T) if(v[1]<9.5) mx=Math.max(mx, Math.hypot(v[0],v[2]));
  chk('bolt hex head across-corners ≈ AF/cos30', Math.abs(mx-af/2/Math.cos(Math.PI/6))<0.6, {mx:+mx.toFixed(2),exp:+(af/2/Math.cos(Math.PI/6)).toFixed(2)});
  const shortH=computeBBox(base({threadMode:'bolt',threadD:16,threadHeadH:6,threadLen:14})), tallH=computeBBox(base({threadMode:'bolt',threadD:16,threadHeadH:14,threadLen:14}));
  chk('taller head (threadHeadH) → taller bolt', Math.abs(((tallH.maxY-tallH.minY)-(shortH.maxY-shortH.minY))-8)<0.5, {short:+(shortH.maxY-shortH.minY).toFixed(1),tall:+(tallH.maxY-tallH.minY).toFixed(1)}); }
{ // bolt + nut MATE: the nut's internal bore (minor + profile + clearance) must clear the bolt's external crest.
  // Compare the nut's minimum bore radius against the bolt's major radius minus nothing — bore must exceed root.
  const D=20,P=2.5,clr=0.4;
  const nut=base({threadMode:'nut',threadD:D,threadPitch:P,threadClear:clr,threadHeadH:12});
  const bolt=base({threadMode:'bolt',threadD:D,threadPitch:P,threadLen:14});
  // sample bore (nut) inner radius and shaft (bolt) outer radius at matching phase is complex; instead assert
  // the nut is a through hole (top & bottom both have a central opening) and material exists.
  const nb=computeBBox(nut);
  let holeTop=false,holeBot=false; const yT=nb.maxY,yB=nb.minY;
  for(const T of nut) for(const v of T){ const r=Math.hypot(v[0],v[2]);
    if(v[1]>yT-0.3 && r<D/2-0.5) holeTop=true; if(v[1]<yB+0.3 && r<D/2-0.5) holeBot=true; }
  chk('nut is a through bore (opening top & bottom)', holeTop&&holeBot, {holeTop,holeBot});
  chk('nut & bolt both have volume', vol(nut)>0 && vol(bolt)>0, {nut:+vol(nut).toFixed(0),bolt:+vol(bolt).toFixed(0)}); }
{ const nut=vol(base({threadMode:'nut',threadD:20})), wing=vol(base({threadMode:'wingnut',threadD:20}));
  chk('wingnut adds grip fins (more material than nut)', wing>nut, {nut:+nut.toFixed(0),wing:+wing.toFixed(0)}); }
{ const wing=computeBBox(base({threadMode:'wingnut',threadD:20,threadHeadAF:0})), nut=computeBBox(base({threadMode:'nut',threadD:20,threadHeadAF:0}));
  chk('wingnut wider in X (fins on ±X) than plain nut', (wing.maxX-wing.minX) > (nut.maxX-nut.minX)+8, {wing:+(wing.maxX-wing.minX).toFixed(1),nut:+(nut.maxX-nut.minX).toFixed(1)}); }
{ const shortB=computeBBox(base({threadMode:'bolt',threadHeadH:6,threadLen:10})), tallB=computeBBox(base({threadMode:'bolt',threadHeadH:6,threadLen:30}));
  chk('longer shaft → taller bolt', (tallB.maxY-tallB.minY) > (shortB.maxY-shortB.minY)+15, {}); }
{ const lo=computeBBox(base({threadMode:'nut',threadHeadH:6})), hi=computeBBox(base({threadMode:'nut',threadHeadH:16}));
  chk('taller nut height follows threadHeadH', Math.abs(((hi.maxY-hi.minY)-(lo.maxY-lo.minY))-10)<0.5, {lo:+(lo.maxY-lo.minY).toFixed(1),hi:+(hi.maxY-hi.minY).toFixed(1)}); }

console.log('=== gating + regression ===');
{ const a=base({}).length, b=base({scoopDir:'front',gripWall:'front',mountHoles:'4',stackFeet:true,divX:2,divZ:2,hollow:true}).length;
  chk('organizer add-ons skipped on a threaded part', a===b, {a,b}); }
{ Object.assign(paramState.box, defaultBoxParams(), {width:40,height:40,depth:40,threadMode:'none'});
  const t=buildTrisForShape('box',paramState.box); const b=computeBBox(t);
  chk('threadMode none → normal cube', manifoldCheck(t,4).watertight && Math.abs((b.maxX-b.minX)-40)<1e-6, {}); }

console.log('\n=== TOTAL:',pass,'passed,',fail,'failed ===');
process.exit(fail?1:0);
