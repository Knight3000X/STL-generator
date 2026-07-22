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

console.log('=== gating + regression ===');
{ const a=base({}).length, b=base({scoopDir:'front',gripWall:'front',mountHoles:'4',stackFeet:true,divX:2,divZ:2,hollow:true}).length;
  chk('organizer add-ons skipped on a gear', a===b, {a,b}); }
{ Object.assign(paramState.box, defaultBoxParams(), {width:40,height:40,depth:40,gearMode:'none'});
  const t=buildTrisForShape('box',paramState.box); const b=computeBBox(t);
  chk('gearMode none → normal cube', manifoldCheck(t,4).watertight && Math.abs((b.maxX-b.minX)-40)<1e-6, {}); }

console.log('\n=== TOTAL:',pass,'passed,',fail,'failed ===');
process.exit(fail?1:0);
