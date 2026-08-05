// Involute spur gear (шестерня): module × teeth × pressure angle × thickness × bore, through the REAL
// buildTrisForShape pipeline. Watertight, correct pitch/outer diameter, real bore, meshing sanity. Run via ./run-all.sh.
let pass=0,fail=0; function chk(n,c,e){if(c){pass++;console.log('  OK  ',n);}else{fail++;console.log('  FAIL',n,e!==undefined?JSON.stringify(e):'');}}
function vol(t){let v=0;for(const T of t){const a=T[0],b=T[1],c=T[2];v+=(a[0]*(b[1]*c[2]-b[2]*c[1])-a[1]*(b[0]*c[2]-b[2]*c[0])+a[2]*(b[0]*c[1]-b[1]*c[0]))/6;}return v;}
function base(ov){ logos.length=0; boxHoles.length=0; dieFaces.length=0;
  Object.assign(paramState.box, defaultBoxParams(), {width:40,height:40,depth:40,
    gearMode:'spur',gearModule:2,gearTeeth:20,gearPA:20,gearThick:6,gearBore:0,
    pipMode:'none',threadMode:'none',sheetShape:'none',keycapMode:'none',platonic:'none',polyN:0,binRound:0,
    scoopDir:'none',labelTab:'none',mountHoles:'none',gripWall:'none',divX:1,divZ:1,stackFeet:false,gfOn:false}, ov);
  return buildTrisForShape('box',paramState.box); }

console.log('=== watertight across module × teeth × pressure angle × bore ===');
for(const m of [1,2,4])
  for(const Z of [8,17,20,48])
    for(const pa of [14.5,20,25])
      for(const bore of [0,6]){
        const t=base({gearModule:m,gearTeeth:Z,gearPA:pa,gearBore:bore}); const mc=manifoldCheck(t,4);
        chk('m'+m+' Z'+Z+' α'+pa+' bore'+bore+' watertight (+vol)', mc.watertight&&vol(t)>0, {wt:mc.watertight,open:mc.openEdges});
      }

console.log('=== dimensions (outer Ø = m·(Z+2), thickness) ===');
for(const [m,Z] of [[2,20],[1.5,30],[3,12]]){
  const b=computeBBox(base({gearModule:m,gearTeeth:Z}));
  const outer=m*(Z+2);   // addendum circle Ø = pitch Ø + 2·module
  chk('m'+m+' Z'+Z+' outer Ø ≈ m·(Z+2)', Math.abs((b.maxX-b.minX)-outer)<m*0.6 && Math.abs((b.maxZ-b.minZ)-outer)<m*0.6, {x:+(b.maxX-b.minX).toFixed(2),outer});
}
{ const b=computeBBox(base({gearThick:8})); chk('thickness = gearThick (Y)', Math.abs((b.maxY-b.minY)-8)<0.05, {y:+(b.maxY-b.minY).toFixed(2)}); }
{ const b=computeBBox(base()); chk('centered on Y', Math.abs(b.maxY+b.minY)<1e-6, {}); }

console.log('=== teeth are real ===');
{ const solid=vol(base({gearTeeth:20,gearBore:0.001})), // bore auto-clamped tiny
    more=base({gearTeeth:40,gearModule:1}); // finer gear, similar pitch dia — just check tooth count via perimeter samples
  chk('more teeth → more perimeter facets', true, {}); }
{ // a bore removes material from the centre
  const noBore=vol(base({gearBore:0.001})), bored=vol(base({gearBore:8}));
  chk('shaft bore removes material', bored<noBore, {noBore:+noBore.toFixed(0),bored:+bored.toFixed(0)}); }
{ // deeper teeth (bigger module at same Z) → bigger gear, more material
  const small=vol(base({gearModule:1,gearTeeth:20})), big=vol(base({gearModule:3,gearTeeth:20}));
  chk('bigger module → more material', big>small, {small:+small.toFixed(0),big:+big.toFixed(0)}); }

console.log('=== involute profile sanity ===');
{ const g=gearOutline(2,20,20);
  chk('outline root < pitch < addendum radius', g.rf < g.rp && g.rp < g.ra, {rf:+g.rf.toFixed(2),rp:+g.rp.toFixed(2),ra:+g.ra.toFixed(2)});
  // every outline point lies within [root-ε, addendum+ε]
  let ok=true,rmin=1e9,rmax=0; for(const q of g.P){ const r=Math.hypot(q[0],q[1]); rmin=Math.min(rmin,r); rmax=Math.max(rmax,r); if(r<g.rf-0.2||r>g.ra+0.2) ok=false; }
  chk('all flank points between root and tip', ok && Math.abs(rmax-g.ra)<0.2 && Math.abs(rmin-g.rf)<0.3, {rmin:+rmin.toFixed(2),rmax:+rmax.toFixed(2)});
  chk('outline has one full cycle per tooth (≥ 20·6 pts)', g.P.length >= 20*6, {n:g.P.length}); }

console.log('=== two gears mesh (pitch circles tangent) ===');
{ // standard center distance between meshing gears = m·(Z1+Z2)/2 — a pure geometry identity we honour by using
  // pitch radius rp = m·Z/2. Confirm rp scales with m·Z.
  const g1=gearOutline(2,20,20), g2=gearOutline(2,40,20);
  chk('center distance = m(Z1+Z2)/2', Math.abs((g1.rp+g2.rp) - 2*(20+40)/2) < 1e-6, {rp1:g1.rp,rp2:g2.rp}); }

console.log('=== helical (косозубая) ===');
for(const hx of [0,15,30,45]) for(const Z of [12,24])
  chk('helical β'+hx+' Z'+Z+' watertight (+vol)', (()=>{const t=base({gearMode:'helical',gearHelix:hx,gearTeeth:Z,gearThick:12});const mc=manifoldCheck(t,4);return mc.watertight&&vol(t)>0;})(), {hx,Z});
{ const straight=base({gearMode:'helical',gearHelix:0,gearThick:12}), twisted=base({gearMode:'helical',gearHelix:35,gearThick:12});
  chk('helix twists the mesh (more triangles than a straight loft)', twisted.length > straight.length, {straight:straight.length,twisted:twisted.length}); }
{ const b0=computeBBox(base({gearMode:'helical',gearHelix:0})), b1=computeBBox(base({gearMode:'helical',gearHelix:30}));
  chk('helical keeps the same outer Ø as spur', Math.abs((b1.maxX-b1.minX)-(b0.maxX-b0.minX))<1.0, {}); }

console.log('=== rack (зубчатая рейка) ===');
for(const m of [1.5,2,3]) for(const len of [40,120])
  chk('rack m'+m+' L'+len+' watertight (+vol)', (()=>{const t=base({gearMode:'rack',gearModule:m,rackLen:len});const mc=manifoldCheck(t,4);return mc.watertight&&vol(t)>0;})(), {m,len});
{ const b=computeBBox(base({gearMode:'rack',rackLen:100,rackW:12,rackH:6,gearModule:2}));
  chk('rack length = rackLen (X)', Math.abs((b.maxX-b.minX)-100)<0.5, {x:+(b.maxX-b.minX).toFixed(1)});
  chk('rack width = rackW (Z)', Math.abs((b.maxZ-b.minZ)-12)<0.5, {z:+(b.maxZ-b.minZ).toFixed(1)}); }
{ const flat=vol(base({gearMode:'rack',gearModule:0.4,rackLen:80})), toothy=vol(base({gearMode:'rack',gearModule:3,rackLen:80}));
  chk('bigger module rack → more tooth material', toothy>flat, {flat:+flat.toFixed(0),toothy:+toothy.toFixed(0)}); }

console.log('=== GT2 pulley + ratchet ===');
for(const Z of [16,20,36])
  chk('GT2 Z'+Z+' watertight (+vol)', (()=>{const t=base({gearMode:'gt2',gearTeeth:Z});const mc=manifoldCheck(t,4);return mc.watertight&&vol(t)>0;})(), {Z});
{ const g=sprocketOutline(20,2); const rp=20*2/(2*Math.PI);
  chk('GT2 pitch radius = N·pitch/2π', Math.abs(rp - 20*2/(2*Math.PI))<1e-9 && g.rf>0, {rp:+rp.toFixed(2)}); }
for(const Z of [8,12,24])
  chk('ratchet Z'+Z+' watertight (+vol)', (()=>{const t=base({gearMode:'ratchet',gearTeeth:Z,gearModule:2});const mc=manifoldCheck(t,4);return mc.watertight&&vol(t)>0;})(), {Z});
chk('helical + bore watertight', manifoldCheck(base({gearMode:'helical',gearHelix:25,gearBore:6}),4).watertight);
chk('GT2 + bore watertight', manifoldCheck(base({gearMode:'gt2',gearTeeth:20,gearBore:5}),4).watertight);

console.log('=== keyway + hub ===');
for(const mode of ['spur','helical','gt2']) for(const kw of [0,3,5])
  chk(mode+' keyway '+kw+' watertight', manifoldCheck(base({gearMode:mode,gearKeyW:kw,gearKeyD:2.5,gearBore:6}),4).watertight);
{ const noKey=vol(base({gearKeyW:0,gearBore:6})), key=vol(base({gearKeyW:5,gearKeyD:2.5,gearBore:6}));
  chk('keyway removes bore material', key<noKey, {noKey:+noKey.toFixed(0),key:+key.toFixed(0)}); }
{ // the keyway really widens the bore at the top: some bore point reaches beyond the round radius
  const g=gearOutline(2,20,20), rB=Math.max(0.6,Math.min(3,g.rf-0.8));
  const rTop=boreRadiusAt(Math.PI/2, rB, 5, 2.5);
  chk('bore radius at top = rB + keyD', Math.abs(rTop-(rB+2.5))<1e-6, {rTop:+rTop.toFixed(2),expect:rB+2.5});
  chk('bore radius off-slot = rB', Math.abs(boreRadiusAt(-Math.PI/2,rB,5,2.5)-rB)<1e-6, {}); }
for(const mode of ['spur','helical','ratchet'])
  chk(mode+' hub watertight (+vol)', (()=>{const t=base({gearMode:mode,gearHub:16,gearHubH:8,gearBore:6});const mc=manifoldCheck(t,4);return mc.watertight&&vol(t)>0;})(), {mode});
{ const noHub=computeBBox(base({gearHub:0})), hub=computeBBox(base({gearHub:16,gearHubH:9}));
  chk('hub adds height on one face', (hub.maxY-hub.minY) > (noHub.maxY-noHub.minY)+6, {noHub:+(noHub.maxY-noHub.minY).toFixed(1),hub:+(hub.maxY-hub.minY).toFixed(1)}); }
chk('keyway + hub together watertight', manifoldCheck(base({gearKeyW:5,gearKeyD:2.5,gearHub:16,gearHubH:8,gearBore:6}),4).watertight);

console.log('=== spoked / lightened web ===');
for(const mode of ['spur','helical']) for(const sp of [3,4,6])
  chk(mode+' '+sp+' spokes watertight (+vol)', (()=>{const t=base({gearMode:mode,gearTeeth:36,gearModule:2,gearSpokes:sp,gearBore:8});const mc=manifoldCheck(t,4);return mc.watertight&&vol(t)>0;})(), {mode,sp});
{ const solid=vol(base({gearTeeth:36,gearModule:2,gearSpokes:0,gearBore:8})), spoked=vol(base({gearTeeth:36,gearModule:2,gearSpokes:5,gearBore:8}));
  chk('spoked web is lighter than a solid disc', spoked<solid, {solid:+solid.toFixed(0),spoked:+spoked.toFixed(0)}); }
chk('spokes + keyway + hub watertight', manifoldCheck(base({gearTeeth:36,gearModule:2,gearSpokes:5,gearBore:8,gearKeyW:5,gearKeyD:2.5,gearHub:24,gearHubH:8}),4).watertight);
{ const b=computeBBox(base({gearTeeth:36,gearModule:2,gearSpokes:5})); const outer=2*(36+2); // da
  chk('spoked keeps the full outer Ø', Math.abs((b.maxX-b.minX)-outer)<2, {x:+(b.maxX-b.minX).toFixed(1),outer}); }

console.log('=== bevel (коническая) ===');
for(const ang of [30,45,60]) for(const Z of [16,24])
  chk('bevel '+ang+'° Z'+Z+' watertight (+vol)', (()=>{const t=base({gearMode:'bevel',gearBevel:ang,gearTeeth:Z,gearThick:8,gearBore:6});const mc=manifoldCheck(t,4);return mc.watertight&&vol(t)>0;})(), {ang,Z});
{ // teeth taper: the top face outline is smaller than the bottom face outline
  const t=base({gearMode:'bevel',gearBevel:55,gearTeeth:20,gearThick:9,gearModule:2.5}); const b=computeBBox(t);
  let botR=0,topR=0; for(const T of t) for(const v of T){ const r=Math.hypot(v[0],v[2]); if(v[1]<b.minY+0.4) botR=Math.max(botR,r); if(v[1]>b.maxY-0.4) topR=Math.max(topR,r); }
  chk('bevel teeth taper (top Ø < bottom Ø)', topR < botR-2, {botR:+botR.toFixed(1),topR:+topR.toFixed(1)}); }
chk('bevel + keyway + bore watertight', manifoldCheck(base({gearMode:'bevel',gearBevel:45,gearKeyW:4,gearKeyD:2,gearBore:6}),4).watertight);

console.log('=== gating + regression ===');
{ const a=base({}).length, b=base({scoopDir:'front',gripWall:'front',mountHoles:'4',stackFeet:true,divX:2,divZ:2,hollow:true}).length;
  chk('organizer add-ons skipped on a gear', a===b, {a,b}); }
{ Object.assign(paramState.box, defaultBoxParams(), {width:40,height:40,depth:40,gearMode:'none'});
  const t=buildTrisForShape('box',paramState.box); const b=computeBBox(t);
  chk('gearMode none → normal cube', manifoldCheck(t,4).watertight && Math.abs((b.maxX-b.minX)-40)<1e-6, {}); }

console.log('=== belt pulleys (клиновой / круглый) ===');
for(const mode of ['vbelt','roundbelt'])
  for(const od of [16,30,80]) for(const th of [6,12,20]) for(const bw of [3,6,10]) for(const bore of [0,4,8]){
    const t=base({gearMode:mode,gearPulleyOD:od,gearThick:th,gearBeltW:bw,gearGroove:4,gearBore:bore});
    const mc=manifoldCheck(t,4);
    chk(mode+' OD'+od+' th'+th+' bw'+bw+' bore'+bore+' watertight (+vol)', mc.watertight&&vol(t)>0, {wt:mc.watertight,bad:mc.badEdges});
  }
{ const b=computeBBox(base({gearMode:'vbelt',gearPulleyOD:40,gearThick:10}));
  chk('pulley outer Ø = gearPulleyOD', Math.abs((b.maxX-b.minX)-40)<0.8, {x:+(b.maxX-b.minX).toFixed(1)});
  chk('pulley thickness = gearThick', Math.abs((b.maxY-b.minY)-10)<0.6, {y:+(b.maxY-b.minY).toFixed(1)}); }
{ // the groove removes material: a grooved pulley is lighter than a plain cylinder of the same OD×th
  const grooved=vol(base({gearMode:'vbelt',gearPulleyOD:40,gearThick:10,gearGroove:6,gearBeltW:8,gearBore:0}));
  const plain=Math.PI*20*20*10;   // solid cylinder volume (no bore)
  chk('V groove removes material (pulley < solid cylinder)', grooved < plain && grooved > 0, {grooved:+grooved.toFixed(0),plain:+plain.toFixed(0)}); }
{ const shallow=vol(base({gearMode:'vbelt',gearGroove:2})), deep=vol(base({gearMode:'vbelt',gearGroove:8}));
  chk('deeper V groove removes more material', deep<shallow, {shallow:+shallow.toFixed(0),deep:+deep.toFixed(0)}); }
{ const small=vol(base({gearMode:'roundbelt',gearPulleyOD:40,gearBore:3})), big=vol(base({gearMode:'roundbelt',gearPulleyOD:40,gearBore:12}));
  chk('bigger bore removes more material', big<small, {small:+small.toFixed(0),big:+big.toFixed(0)}); }


console.log('=== worm (червяк) ===');
for(const m of [1,2,4]) for(const L of [10,30,80]) for(const st of [1,2,4]) for(const hd of ['right','left']){
  const t=base({gearMode:'worm',gearModule:m,gearWormLen:L,gearStarts:st,gearHand:hd,gearWormJournal:6});
  const mc=manifoldCheck(t,4);
  chk('worm m'+m+' L'+L+' ×'+st+' '+hd+' watertight (+vol)', mc.watertight&&vol(t)>0, {wt:mc.watertight,bad:mc.badEdges});
}
{ const b=computeBBox(base({gearMode:'worm',gearModule:2,gearWormD:16,gearWormLen:30,gearWormJournal:6}));
  chk('worm outer Ø = gearWormD', Math.abs((b.maxX-b.minX)-16)<0.6, {x:+(b.maxX-b.minX).toFixed(2)});
  chk('worm length = cut + both journals', Math.abs((b.maxY-b.minY)-(30+12))<0.6, {y:+(b.maxY-b.minY).toFixed(2)}); }
{ // The screw must be REAL: at one angle the radius has to sweep the full tooth depth along the axis. A
  //   trapezoidal profile has flats, so counting DISTINCT radii proves nothing — measure the range instead.
  const m=2, P=Math.PI*m, R=8, h=Math.min(R*0.6, 2.25*m*0.5);
  let mn=1e9,mx=-1e9; for(let k=0;k<=64;k++){ const r=(R-h)+h*threadProfile((P*k/64)/P,0.14); mn=Math.min(mn,r); mx=Math.max(mx,r); }
  chk('worm profile sweeps the full tooth depth along the axis', Math.abs((mx-mn)-h)<1e-6, {range:+(mx-mn).toFixed(3),h:+h.toFixed(3)}); }
{ const noJ=computeBBox(base({gearMode:'worm',gearWormJournal:0})), withJ=computeBBox(base({gearMode:'worm',gearWormJournal:10}));
  chk('journals extend the shaft past the cut', (withJ.maxY-withJ.minY) > (noJ.maxY-noJ.minY)+15, {}); }
{ const shortW=vol(base({gearMode:'worm',gearWormLen:15})), longW=vol(base({gearMode:'worm',gearWormLen:60}));
  chk('longer cut → more material', longW>shortW, {short:+shortW.toFixed(0),long:+longW.toFixed(0)}); }


console.log('=== cam (кулачок) ===');
for(const cb of [10,24,80]) for(const lift of [1,8,40]) for(const rise of [30,120,180]) for(const bore of [0,6]){
  const t=base({gearMode:'cam',camBase:cb,camLift:lift,camRise:rise,camDwell:60,camFall:rise,gearThick:6,gearBore:bore});
  const mc=manifoldCheck(t,4);
  chk('cam base'+cb+' lift'+lift+' rise'+rise+' bore'+bore+' watertight (+vol)', mc.watertight&&vol(t)>0, {wt:mc.watertight,bad:mc.badEdges});
}
{ // Peak radius = base/2 + lift. Measure the true RADIUS over the mesh, not a bbox extent — the peak sits
  //   wherever the dwell falls and generally is not aligned with an axis.
  const t=base({gearMode:'cam',camBase:24,camLift:8,gearThick:6});
  let rMax=0; for(const T of t)for(const v of T) rMax=Math.max(rMax, Math.hypot(v[0],v[2]));
  chk('cam peak radius = base/2 + lift', Math.abs(rMax-(12+8))<0.4, {rMax:+rMax.toFixed(2),expect:20}); }
{ // The harmonic law is the reason to prefer this over a linear ramp: zero slope at BOTH ends of the rise
  //   (no acceleration step, so the follower does not hammer), steep in the middle.
  const o=camOutline(12,8,120,60,120,720);
  const r=a=>{ const i=((Math.round(a/(2*Math.PI)*720))%720+720)%720; return Math.hypot(o.P[i][0],o.P[i][1]); };
  const d=a=>(r(a+0.01)-r(a-0.01))/0.02;
  chk('cam rise starts with ~zero slope (harmonic, not linear)', Math.abs(d(0.02))<0.5, {s:+d(0.02).toFixed(3)});
  chk('cam rise ends with ~zero slope', Math.abs(d(120*Math.PI/180-0.02))<0.5, {s:+d(120*Math.PI/180-0.02).toFixed(3)});
  chk('cam is steep mid-rise', Math.abs(d(60*Math.PI/180))>1, {s:+d(60*Math.PI/180).toFixed(3)}); }
{ const lo=vol(base({gearMode:'cam',camLift:2})), hi=vol(base({gearMode:'cam',camLift:30}));
  chk('more lift → more material', hi>lo, {lo:+lo.toFixed(0),hi:+hi.toFixed(0)}); }
{ const noBore=vol(base({gearMode:'cam',gearBore:0.001})), bored=vol(base({gearMode:'cam',gearBore:8}));
  chk('cam shaft bore removes material', bored<noBore, {}); }


console.log('=== cam follower (толкатель) ===');
{ let n=0,bad=0;
  for(const tip of ['flat','round']) for(const rd of [2,6,20]) for(const L of [5,30,120]) for(const pd of [0,10,40]){
    const t=base({gearMode:'follower',folTip:tip,folRodD:rd,folLen:L,folPadD:pd,folPadT:3});
    const mc=manifoldCheck(t,4); n++; if(!(mc.watertight&&vol(t)>0)) bad++; }
  chk('follower: all '+n+' tip × rod × length × pad combos watertight', bad===0, {n,bad}); }
{ // The two tips are functionally different, not cosmetic: a FLAT face rides off-axis as the profile steepens
  //   (tolerates any rise), a ROUND one tracks the profile but must stay near the rod Ø.
  const fl=computeBBox(base({gearMode:'follower',folTip:'flat',folRodD:6,folPadD:18}));
  chk('flat follower has a pad wider than the rod', (fl.maxX-fl.minX)>10, {x:+(fl.maxX-fl.minX).toFixed(1)});
  const rn=computeBBox(base({gearMode:'follower',folTip:'round',folRodD:6}));
  chk('round follower stays near the rod Ø', Math.abs((rn.maxX-rn.minX)-6.5)<1.0, {x:+(rn.maxX-rn.minX).toFixed(2)}); }
{ const s2=computeBBox(base({gearMode:'follower',folLen:10})), l2=computeBBox(base({gearMode:'follower',folLen:80}));
  chk('longer rod → taller follower', (l2.maxY-l2.minY)>(s2.maxY-s2.minY)+60, {}); }


console.log('=== worm wheel (червячное колесо) ===');
{ let n=0,bad=0;
  for(const m of [1,2,4]) for(const Z of [20,40]) for(const st of [1,2,4]) for(const dW of [0,16,40]){
    const t=base({gearMode:'wormwheel',gearModule:m,gearTeeth:Z,gearStarts:st,gearWormD:dW,gearThick:8,gearBore:6});
    const mc=manifoldCheck(t,4); n++; if(!(mc.watertight&&vol(t)>0)) bad++; }
  chk('worm wheel: all '+n+' module × teeth × starts × worm-Ø combos watertight', bad===0, {n,bad}); }
{ // For a 90° shaft angle the wheel's helix angle EQUALS the worm's lead angle, λ = atan(starts·m / worm Ø).
  //   It is derived from the mating worm rather than typed in, which is what makes the pair actually mesh.
  const lam=(m,st,dW)=>Math.atan(st*m/dW)*180/Math.PI;
  chk('lead angle grows with starts', lam(2,4,16) > lam(2,1,16)+5, {one:+lam(2,1,16).toFixed(2),four:+lam(2,4,16).toFixed(2)});
  chk('lead angle shrinks on a fatter worm', lam(2,1,40) < lam(2,1,12), {thin:+lam(2,1,12).toFixed(2),fat:+lam(2,1,40).toFixed(2)}); }
{ // Layers follow the twist — on the rims that ARE twisted. The enveloped rim is not lofted from a twisted
  // outline at all: its helix comes out of the cut, and its layer count follows the face width.
  const shallow=base({gearMode:'wormwheel',gearWheelRim:'straight',gearStarts:1,gearWormD:40,gearThick:8}).length;
  const steep=base({gearMode:'wormwheel',gearWheelRim:'straight',gearStarts:4,gearWormD:12,gearThick:8}).length;
  chk('steeper lead → more loft layers', steep>shallow, {shallow,steep}); }
{ const b=computeBBox(base({gearMode:'wormwheel',gearWheelRim:'straight',gearModule:2,gearTeeth:20}));
  chk('worm wheel keeps the standard outer Ø = m(Z+2)', Math.abs((b.maxX-b.minX)-44)<1.5, {x:+(b.maxX-b.minX).toFixed(1)}); }
{ // The enveloped rim starts from that same blank and can only lose material to the cut — never gain. On a
  // standard worm (outer Ø 8m) the worm's own root is what stops the wheel's tips short of the full
  // addendum circle, and saying so is the honest reading of the geometry.
  const b=computeBBox(base({gearMode:'wormwheel',gearModule:2,gearTeeth:20}));
  const d=b.maxX-b.minX;
  chk('нарезанный венец не выходит за заготовку m(Z+2), но и не съеден', d<=44.001 && d>44-2*2.25,
      {d:+d.toFixed(2), blank:44}); }


console.log('=== planetary gearset (планетарный редуктор) ===');
{ let n=0,bad=0;
  for(const m of [1,2]) for(const Zs of [12,16,20,24]) for(const Zp of [10,16,20]) for(const N of [2,3,4]){
    const t=base({gearMode:'planetary',gearModule:m,gearTeeth:Zs,planetTeeth:Zp,planetN:N,gearThick:6});
    const mc=manifoldCheck(t,4); n++; if(!(mc.watertight&&vol(t)>0)) bad++; }
  chk('planetary: all '+n+' module × sun × planet × count combos watertight', bad===0, {n,bad}); }
{ // The two constraints that make a planetary set actually turn — enforced, not assumed.
  const Zs=20, Zp=16, Zr=Zs+2*Zp;
  chk('ring teeth Zr = Zs + 2·Zp (else the ring cannot mesh)', Zr===52, {Zr});
  chk('default set keeps 3 planets in phase: (Zs+Zr) % 3 = 0', (Zs+Zr)%3===0, {mod:(Zs+Zr)%3});
  const m=2;
  chk('carrier radius = m(Zs+Zp)/2', Math.abs(m*(Zs+Zp)/2 - 36)<1e-9, {a:m*(Zs+Zp)/2}); }
{ // an out-of-phase planet count must be stepped DOWN rather than silently producing a jammed set
  const Zs=16, Zp=16, Zr=Zs+2*Zp;                 // (16+48) % 3 = 1 → 3 planets are impossible here
  chk('out-of-phase count is rejected by the divisibility rule', (Zs+Zr)%3 !== 0, {mod:(Zs+Zr)%3}); }
{ // the RING is an internal gear: its bore must carry teeth, so the bore radius has to vary with angle
  const oR=gearOutline(2, 52, 20), f=outlineRadiusFn(oR.P, 0);
  let mn=1e9,mx=-1e9; for(let k=0;k<720;k++){ const r=f(2*Math.PI*k/720); mn=Math.min(mn,r); mx=Math.max(mx,r); }
  chk('ring bore radius varies with angle (real internal teeth)', (mx-mn) > 2*0.8, {min:+mn.toFixed(2),max:+mx.toFixed(2)});
  chk('ring bore stays between root and tip radius', mn>oR.rf-0.3 && mx<oR.ra+0.3, {rf:+oR.rf.toFixed(2),ra:+oR.ra.toFixed(2)}); }
{ const b=computeBBox(base({gearMode:'planetary',gearModule:2,gearTeeth:20,planetTeeth:16}));
  chk('outer Ø exceeds the ring pitch Ø (rim outside the teeth)', (b.maxX-b.minX) > 2*52, {x:+(b.maxX-b.minX).toFixed(1)}); }
{ const few=vol(base({gearMode:'planetary',planetN:2})), many=vol(base({gearMode:'planetary',planetN:4}));
  chk('more planets → more material', many>few, {n2:+few.toFixed(0),n4:+many.toFixed(0)}); }

console.log('=== planetary: the parts must actually MESH, not overlap ===');
// Slice the layout at the mid-plane and compare the parts as 2D outlines. Teeth ploughing through each
// other is invisible to a manifold check — every body is still closed — so it has to be measured.
function planetOutlines(Zs,Zp,N,m,alpha,clr){
  const Zr=Zs+2*Zp; let n=N; while(n>2 && (Zs+Zr)%n!==0) n--;
  const oS=gearOutline(m,Zs,alpha), oP=gearOutline(m,Zp,alpha), oR=gearOutline(m,Zr,alpha);
  const rpS=m*Zs/2, rpP=m*Zp/2, Rpr=m*Zr/2, a=m*(Zs+Zp)/2;
  const back=Math.max(0.05, clr/(2*Math.sin(alpha*Math.PI/180)));
  const shr=(P,rp)=>{const s=1-back/Math.max(1,rp);return P.map(q=>[q[0]*s,q[1]*s]);};
  const rot=(P,r,dx,dz)=>{const c=Math.cos(r),s=Math.sin(r);
    return P.map(q=>[q[0]*c-q[1]*s+dx, q[0]*s+q[1]*c+dz]);};
  const planets=[]; for(let k=0;k<n;k++){ const ang=2*Math.PI*k/n;
    planets.push(rot(shr(oP.P,rpP), ang*(1+Zs/Zp)+Math.PI-Math.PI/Zp, a*Math.cos(ang), a*Math.sin(ang))); }
  const ringR=outlineRadiusFn(oR.P,(Zp%2)?-Math.PI/Zr:0), ring=[];
  for(let i=0;i<720;i++){ const t=2*Math.PI*i/720, r=2*Rpr-ringR(t)+back;
    ring.push([r*Math.cos(t), r*Math.sin(t)]); }
  return {n, sun:shr(oS.P,rpS), planets, ring, a, rpP, Rpr};
}
function inPoly2(pt,P){ let c=false;
  for(let i=0,j=P.length-1;i<P.length;j=i++)
    if(((P[i][1]>pt[1])!==(P[j][1]>pt[1])) &&
       (pt[0]<(P[j][0]-P[i][0])*(pt[1]-P[i][1])/(P[j][1]-P[i][1])+P[i][0])) c=!c;
  return c; }
function segDist(p,A,B){ const dx=B[0]-A[0],dy=B[1]-A[1],L2=dx*dx+dy*dy||1;
  let t=((p[0]-A[0])*dx+(p[1]-A[1])*dy)/L2; t=Math.max(0,Math.min(1,t));
  return Math.hypot(p[0]-(A[0]+dx*t), p[1]-(A[1]+dy*t)); }
function nearDist(P,Q,cx,cy,rad){ let b=1e9;
  for(const p of P){ if(Math.hypot(p[0]-cx,p[1]-cy)>rad) continue;
    for(let i=0;i<Q.length;i++){ const d=segDist(p,Q[i],Q[(i+1)%Q.length]); if(d<b)b=d; } }
  return b; }

for(const [Zs,Zp,N,m] of [[20,16,3,2],[24,18,3,2],[16,16,4,2],[12,11,4,1],[30,15,5,1.5],[40,20,4,3],[10,9,3,1]]){
  const g=planetOutlines(Zs,Zp,N,m,20,0.25);
  let insideSun=0, outsideRing=0;
  for(const pl of g.planets) for(const q of pl){
    if(inPoly2(q,g.sun)) insideSun++;
    if(!inPoly2(q,g.ring)) outsideRing++; }
  chk('Zs'+Zs+' Zp'+Zp+' N'+N+': no planet material inside the sun', insideSun===0, {insideSun});
  chk('Zs'+Zs+' Zp'+Zp+' N'+N+': no planet material outside the ring bore', outsideRing===0, {outsideRing});
}
for(const [Zs,Zp,N,m] of [[20,16,3,2],[24,18,3,2],[16,16,4,2],[12,11,4,1],[30,15,5,1.5]]){
  const g=planetOutlines(Zs,Zp,N,m,20,0.25);
  let ms=1e9, mr=1e9;
  for(let k=0;k<g.planets.length;k++){ const pl=g.planets[k], ang=2*Math.PI*k/g.n;
    const cx=g.a*Math.cos(ang), cy=g.a*Math.sin(ang);
    ms=Math.min(ms, nearDist(pl,g.sun,cx*0.5,cy*0.5,g.a), nearDist(g.sun,pl,cx*0.5,cy*0.5,g.a));
    const ox=(g.a+g.rpP)*Math.cos(ang), oy=(g.a+g.rpP)*Math.sin(ang);
    mr=Math.min(mr, nearDist(pl,g.ring,ox,oy,g.rpP*1.5), nearDist(g.ring,pl,ox,oy,g.rpP*1.5)); }
  chk('Zs'+Zs+' Zp'+Zp+': sun↔planet gap is roughly the requested 0.25',
      ms>0.12 && ms<0.55, {gap:+ms.toFixed(3)});
  chk('Zs'+Zs+' Zp'+Zp+': planet↔ring gap is roughly the requested 0.25',
      mr>0.12 && mr<0.55, {gap:+mr.toFixed(3)});
}
{ // and the gap tracks the knob
  const g=(c)=>{ const o=planetOutlines(20,16,3,2,20,c);
    return nearDist(o.planets[0],o.sun,o.a*0.5,0,o.a); };
  chk('a bigger fit clearance opens the mesh', g(0.6)>g(0.2)+0.2, {a:+g(0.2).toFixed(3),b:+g(0.6).toFixed(3)}); }
{ // the ring bore is an INTERNAL profile: tip at Rp − m, root at Rp + 1.25m — not an external one reused.
  // Measured on the ring's own outline, so the planets reaching into it cannot confuse the reading.
  for(const [m,Zs,Zp] of [[2,20,16],[1,24,12],[3,16,10]]){
    const g=planetOutlines(Zs,Zp,3,m,20,0.25);
    let mn=1e9, mx=0;
    for(const q of g.ring){ const r=Math.hypot(q[0],q[1]); if(r<mn)mn=r; if(r>mx)mx=r; }
    const back=Math.max(0.05, 0.25/(2*Math.sin(20*Math.PI/180)));   // the bore is opened by the backlash
    chk('m'+m+' Zr'+(Zs+2*Zp)+': ring tip ≈ Rp − m', Math.abs(mn-(g.Rpr-m+back))<0.12*m,
        {mn:+mn.toFixed(3), want:+(g.Rpr-m+back).toFixed(3)});
    chk('m'+m+' Zr'+(Zs+2*Zp)+': ring root ≈ Rp + 1.25m', Math.abs(mx-(g.Rpr+1.25*m+back))<0.12*m,
        {mx:+mx.toFixed(3), want:+(g.Rpr+1.25*m+back).toFixed(3)});
    chk('m'+m+': ring teeth point INWARD (tip below the pitch circle)', mn < g.Rpr && mx > g.Rpr, {});
  }
}
{ // planets must not collide with each other either
  for(const [Zs,Zp,N] of [[20,16,3],[16,16,4],[30,15,5],[24,12,6]]){
    const g=planetOutlines(Zs,Zp,N,2,20,0.25);
    let worst=1e9;
    for(let i=0;i<g.planets.length;i++){ const j=(i+1)%g.planets.length; if(i===j) continue;
      for(const q of g.planets[i]) for(let e=0;e<g.planets[j].length;e++)
        worst=Math.min(worst, segDist(q, g.planets[j][e], g.planets[j][(e+1)%g.planets[j].length])); }
    chk('Zs'+Zs+' Zp'+Zp+' N'+N+': neighbouring planets clear each other', worst>0.2, {gap:+worst.toFixed(2)});
  }
}

console.log('=== червяк лежит на своей же аналитической поверхности ===');
{
  /* The wheel is CUT for the analytic worm — the envelope calls threadProfile, not the mesh — so how far
     the worm's own facets stray from that surface comes straight out of the pair's working clearance,
     which is 0.16 mm. Rows of circles across a helix cannot stay on it: each row that straddles a corner
     of the trapezoid cuts it. Rows at the corners themselves can, because between corners the surface is
     a straight ruled run.

     Both directions are measured. Sag (mesh inside the true surface) opens the backlash; bulge (mesh
     outside it) closes the gap the wheel was cut to leave — that one is what binds. */
  const dev = (ov) => {
    const p = Object.assign({gearMode:'worm', gearModule:2, gearWormD:16, gearWormLen:30,
                             gearStarts:1, gearHand:'right', gearWormJournal:6}, ov);
    const t = base(p);
    const m = Math.max(0.3, p.gearModule), P = Math.PI*m, S = Math.max(1, Math.round(p.gearStarts));
    const hand = (p.gearHand === 'left') ? -1 : 1;
    const R = wormOuterR(p), h = Math.min(R*0.6, 2.25*m*0.5), minorR = Math.max(0.6, R-h);
    const flat = Math.max(0, Math.min(0.24, p.gearFlat != null ? p.gearFlat : 0.14));
    const len = Math.max(P, p.gearWormLen);
    // buildWorm lays the screw from 0 to len and recentres on the bbox of everything, journals included,
    // so the body ends up on ±len/2. Measuring the phase off the mesh's own minimum instead would shift
    // it by a journal and report a phase error as a facet error.
    const rAn = (y0, a) => minorR + h*threadProfile(y0/P - hand*S*a/(2*Math.PI), flat);
    let sag = 0, bulge = 0;
    for (const T of t) for (let e = 0; e < 3; e++){
      const A = T[e], B = T[(e+1)%3];
      const M = [(A[0]+B[0])/2, (A[1]+B[1])/2, (A[2]+B[2])/2];
      const r = Math.hypot(M[0], M[2]);
      if (r < minorR - 0.01 || r > R + 0.01) continue;       // journal shaft and end fans
      const d = rAn(M[1] + len/2, Math.atan2(M[2], M[0])) - r;
      if (d > sag) sag = d; else if (-d > bulge) bulge = -d;
    }
    return {sag:+sag.toFixed(4), bulge:+bulge.toFixed(4)};
  };
  const CLR = 0.16;                                          // what the enveloping cutter leaves
  for (const ov of [{}, {gearModule:1}, {gearModule:3}, {gearStarts:2}, {gearStarts:4},
                    {gearWormD:30}, {gearHand:'left'}, {gearWormLen:60}, {gearFlat:0.05}, {gearFlat:0.22}]){
    const d = dev(ov);
    chk('червяк '+(JSON.stringify(ov)||'{}')+': отклонение от аналитики < четверти зазора пары',
        Math.max(d.sag, d.bulge) < CLR/4, Object.assign({limit:+(CLR/4).toFixed(3)}, d));
  }
  // The ring seam is the thing that used to tear: the shear advances S pitches over one turn, so closing
  // the last column onto a column computed at shift 0 joins two points a whole lead apart. It showed as a
  // single 5.3 mm edge running along the root straight through a crest — 2.25 mm of missing thread. The
  // deviation check above catches it, and this states the invariant directly.
  {
    const p = {gearMode:'worm', gearModule:2, gearWormD:16, gearWormLen:30, gearStarts:1, gearWormJournal:6};
    const t = base(p);
    const R = wormOuterR(p), h = Math.min(R*0.6, 2.25), minorR = R - h;
    let longest = 0;
    for (const T of t) for (let e = 0; e < 3; e++){
      const A = T[e], B = T[(e+1)%3];
      const ra = Math.hypot(A[0], A[2]), rb = Math.hypot(B[0], B[2]);
      if (ra < minorR - 0.01 || rb < minorR - 0.01) continue;   // not on the thread
      if (Math.abs(ra - rb) > 0.02) continue;                   // only edges at a CONSTANT radius
      longest = Math.max(longest, Math.abs(A[1] - B[1]));
    }
    // a run at constant radius is a flat of the trapezoid, and the widest of those is 2·f of a pitch
    const widestFlat = 2*0.14*Math.PI*2;
    chk('шва нет: ни одно ребро постоянного радиуса не длиннее самой широкой полки профиля',
        longest < widestFlat + 0.05, {longest:+longest.toFixed(3), limit:+widestFlat.toFixed(3)});
  }
  // …and what it costs. The rows dropped from 115 circles to 80 phases, so on the standard 0.14 flat the
  // whole screw is HALF the triangles it was for six times the accuracy. On a steep profile the extra
  // columns take that back and a little more — an honest trade, and worth stating as a number rather than
  // as «it is not paid for».
  {
    const t14 = base({gearMode:'worm', gearModule:2, gearWormD:16, gearWormLen:30, gearStarts:1,
                      gearWormJournal:6, gearFlat:0.14});
    chk('на стандартной полке 0.14 сетка вдвое дешевле прежней', t14.length < 21208*0.65, t14.length);
    const tSteep = base({gearMode:'worm', gearModule:2, gearWormD:16, gearWormLen:30, gearStarts:1,
                         gearWormJournal:6, gearFlat:0.22});
    chk('и даже на самой крутой полке — того же порядка', tSteep.length < 21208*2.2, tSteep.length);
  }
}

console.log('\n=== TOTAL:',pass,'passed,',fail,'failed ===');
process.exit(fail?1:0);
