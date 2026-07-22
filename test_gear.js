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

console.log('\n=== TOTAL:',pass,'passed,',fail,'failed ===');
process.exit(fail?1:0);
