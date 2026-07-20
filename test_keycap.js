// Keycaps (кейкапы): parametric cap with MX/Choc stems, dish, legend from the first logo card, and the
// AMS two-colour shell/core pair. Watertight in every mode through the REAL pipeline. Run via ./run-all.sh.
let pass=0,fail=0; function chk(n,c,e){if(c){pass++;console.log('  OK  ',n);}else{fail++;console.log('  FAIL',n,e!==undefined?JSON.stringify(e):'');}}
function vol(t){let v=0;for(const T of t){const a=T[0],b=T[1],c=T[2];v+=(a[0]*(b[1]*c[2]-b[2]*c[1])-a[1]*(b[0]*c[2]-b[2]*c[0])+a[2]*(b[0]*c[1]-b[1]*c[0]))/6;}return v;}
function blobHM(r){ const N=LOGO_HM_SIZE,h=new Float32Array(N*N); r=r||0.3; for(let y=0;y<N;y++)for(let x=0;x<N;x++){const fx=x/N-0.5,fy=y/N-0.5;h[y*N+x]=(Math.hypot(fx,fy)<r)?1:0;} return h; }
function base(ov, withLegend){
  logos.length=0; boxHoles.length=0; dieFaces.length=0;
  if(withLegend) logos.push({id:nextLogoId++,face:'+Y',u0:0,v0:0,w:8,h:8,depth:1,threshold:0.5,invert:false,rotation:0,heightmap:blobHM(),previewUrl:null});
  Object.assign(paramState.box, defaultBoxParams(), {keycapMode:'single',keySizeU:1,keyH:9,keyTaper:2.4,keyRound:1.8,
    keyWall:1.3,keyPlate:1.8,keyDish:1,keyLegendDepth:0.6,keyStem:'mx',keyStemTol:0.1}, ov);
  return buildTrisForShape('box',paramState.box); }

console.log('=== single-colour cap: sizes / stems / dish ===');
for(const u of [1,1.5,2,6.25]){ const t=base({keySizeU:u}); const mc=manifoldCheck(t,4);
  chk('cap '+u+'u (MX) watertight (+vol)', mc.watertight&&vol(t)>0, mc); }
chk('cap choc stem watertight', manifoldCheck(base({keyStem:'choc'}),4).watertight);
chk('cap no stem watertight', manifoldCheck(base({keyStem:'none'}),4).watertight);
chk('cap flat top (dish 0) watertight', manifoldCheck(base({keyDish:0}),4).watertight);
{ const b=computeBBox(base({keySizeU:1})); chk('1u footprint ≈18.2mm', Math.abs((b.maxX-b.minX)-18.2)<0.2 && Math.abs(b.minY-0)<1e-6, {w:b.maxX-b.minX,y0:b.minY}); }
{ const noStem=vol(base({keyStem:'none'})), mx=vol(base({keyStem:'mx'}));
  chk('MX stem adds material', mx>noStem, {noStem,mx}); }

console.log('=== legend from the first logo card ===');
chk('single + engraved legend watertight', manifoldCheck(base({},true),4).watertight);
chk('single + embossed legend (neg depth) watertight', manifoldCheck(base({keyLegendDepth:-0.5},true),4).watertight);
{ const plain=vol(base({keyDish:0})), eng=vol(base({keyDish:0},true));
  chk('engraved legend removes material', eng<plain, {plain,eng}); }

console.log('=== AMS pair: shell (through legend) + core (plugs) ===');
chk('shell with through legend watertight', manifoldCheck(base({keycapMode:'shell'},true),4).watertight);
chk('shell without legend watertight (solid top)', manifoldCheck(base({keycapMode:'shell'}),4).watertight);
chk('core insert watertight', manifoldCheck(base({keycapMode:'core'},true),4).watertight);
chk('core without legend watertight (plain slab)', manifoldCheck(base({keycapMode:'core'}),4).watertight);
{ const shell=vol(base({keycapMode:'shell'},true)), solid=vol(base({keycapMode:'shell'}));
  chk('through legend removes material from shell', shell<solid, {shell,solid}); }
{ const core=vol(base({keycapMode:'core'},true)), slab=vol(base({keycapMode:'core'}));
  chk('legend plugs add material to core', core>slab, {core,slab}); }
chk('shell choc watertight', manifoldCheck(base({keycapMode:'shell',keyStem:'choc'},true),4).watertight);
chk('shell 2u watertight', manifoldCheck(base({keycapMode:'shell',keySizeU:2},true),4).watertight);

console.log('=== keycap overrides other box modes; organizer add-ons gated ===');
{ const a=base({}).length, b=base({scoopDir:'front',gripWall:'front',mountHoles:'4',stackFeet:true,divX:2,divZ:2,hollow:true}).length;
  chk('scoop/grip/ears/feet/dividers skipped on keycap', a===b, {a,b}); }
{ const t=base({platonic:'d20',polyN:6,binRound:5}); const b=computeBBox(t);
  chk('keycap wins over die/poly/bin (footprint still ≈18.2)', Math.abs((b.maxX-b.minX)-18.2)<0.2, {w:b.maxX-b.minX}); }
console.log('=== regression: keycapMode none → normal cube ===');
{ logos.length=0; Object.assign(paramState.box, defaultBoxParams(), {width:40,height:40,depth:40,keycapMode:'none'});
  const t=buildTrisForShape('box',paramState.box); const b=computeBBox(t);
  chk('cube unaffected', manifoldCheck(t,4).watertight && Math.abs((b.maxX-b.minX)-40)<1e-6, {}); }

console.log('\n=== TOTAL:',pass,'passed,',fail,'failed ===');
process.exit(fail?1:0);
