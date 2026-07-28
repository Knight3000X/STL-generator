// Honeycomb wall system (соты): the panel that goes on the wall and the holders that hang in it, through
// the REAL buildTrisForShape pipeline. The claim worth testing is that the two FIT each other, so the tests
// measure a cell's clear opening and a post's across-flats off the meshes and compare them.
// Run via ./run-all.sh.
let pass=0,fail=0; function chk(n,c,e){if(c){pass++;console.log('  OK  ',n);}else{fail++;console.log('  FAIL',n,e!==undefined?JSON.stringify(e):'');}}
function vol(t){let v=0;for(const T of t){const a=T[0],b=T[1],c=T[2];v+=(a[0]*(b[1]*c[2]-b[2]*c[1])-a[1]*(b[0]*c[2]-b[2]*c[0])+a[2]*(b[0]*c[1]-b[1]*c[0]))/6;}return v;}
function base(ov){ logos.length=0; boxHoles.length=0; dieFaces.length=0;
  Object.assign(paramState.box, defaultBoxParams(), {width:40,height:40,depth:40,
    woBack:'hexpanel', woFront:'none', hcAF:25, hcRib:3, hcNX:4, hcNY:3, hcClear:0.3, hcPanelT:0,
    woW:60, woH:60, woT:5, woPegN:2, mntScrewD:4.5, fitTune:0,
    fnOn:false,pbPart:'none',hookMount:'none',mntMode:'none',gearMode:'none',pipMode:'none',psOn:false,
    threadMode:'none',sheetShape:'none',keycapMode:'none',platonic:'none',polyN:0,binRound:0,
    scoopDir:'none',labelTab:'none',mountHoles:'none',gripWall:'none',divX:1,divZ:1,stackFeet:false,gfOn:false}, ov);
  return buildTrisForShape('box',paramState.box); }

const uniq=a=>a.filter((v,i)=>i===0||v-a[i-1]>1e-6);
function hitsY(tris,x,z){const ys=[];for(const T of tris){const[a,b,c]=T;
 const d1=(b[0]-a[0])*(z-a[2])-(b[2]-a[2])*(x-a[0]);const d2=(c[0]-b[0])*(z-b[2])-(c[2]-b[2])*(x-b[0]);const d3=(a[0]-c[0])*(z-c[2])-(a[2]-c[2])*(x-c[0]);
 if(!((d1>=0&&d2>=0&&d3>=0)||(d1<=0&&d2<=0&&d3<=0)))continue;
 const A=(b[0]-a[0])*(c[2]-a[2])-(b[2]-a[2])*(c[0]-a[0]);if(Math.abs(A)<1e-12)continue;
 const w1=((b[0]-x)*(c[2]-z)-(b[2]-z)*(c[0]-x))/A,w2=((c[0]-x)*(a[2]-z)-(c[2]-z)*(a[0]-x))/A;
 ys.push(w1*a[1]+w2*b[1]+(1-w1-w2)*c[1]);}return uniq(ys.sort((u,v)=>u-v));}

// A cell's CLEAR opening across flats: send a ray up the middle of a cell and take the void it passes
// through. The panel is centred, so the middle column's cells sit on a known pitch.
function cellOpening(panel, AF, rib){
  const pitch=AF+rib, B=computeBBox(panel);
  // Sweeping x and taking the biggest void would read the waist between columns, which is wider than a
  // cell. A hexagon's vertical chord is CONSTANT over the width of its flat, so the across-flats is the
  // most common gap, not the largest one.
  const hist=new Map();
  for(let i=1;i<600;i++){
    const x=B.minX+(B.maxX-B.minX)*i/600;
    const ys=hitsY(panel, x, 0);
    // Only intervals at least half the pitch wide can be a cell; a rib is always narrower than that, so
    // the window sorts solid from void without having to reason about which end the ray started inside.
    for(let k=0;k+1<ys.length;k++){
      const gap=ys[k+1]-ys[k];
      if(gap < pitch*0.5 || gap > pitch*1.02) continue;
      const key=Math.round(gap*100); hist.set(key, (hist.get(key)||0)+1); } }
  let best=0, bestN=0;
  for(const [k,v] of hist) if(v>bestN){ bestN=v; best=k/100; }
  return best;
}
// A post's across-flats: the hexagon is built vertex-right, so its FLATS are top and bottom and a vertical
// ray through its centre reads the across-flats directly.
function postAcrossFlats(holder, plateT){
  const B=computeBBox(holder);
  // Only the stretch of Z that is post and nothing else: past the retaining lip at the tip, short of the plate.
  const z0=B.minZ+3.2, z1=B.maxZ-plateT-0.5;
  let best=0;
  for(let i=0;i<=60 && z0<z1;i++){ const z=z0+(z1-z0)*i/60;
    const ys=hitsY(holder, 0, z);
    if(ys.length>=2) best=Math.max(best, ys[ys.length-1]-ys[0]); }
  return best;
}

console.log('=== watertight: panel and holders across every knob ===');
for(const AF of [10,25,50])
  for(const rib of [1.5,3,6])
    for(const nx of [1,4,9])
      for(const ny of [1,3,7]){
        const t=base({hcAF:AF,hcRib:rib,hcNX:nx,hcNY:ny}), mc=manifoldCheck(t,4);
        chk('panel AF'+AF+' рёбра'+rib+' '+nx+'×'+ny+' watertight (+vol)', mc.watertight&&vol(t)>0,
            {open:mc.openEdges,bad:mc.badEdges});
      }
for(const front of ['hook','shelf','tools','none'])
  for(const AF of [10,25,50])
    for(const n of [1,2,4]){
      const t=base({woBack:'hex',woFront:front,hcAF:AF,woPegN:n}), mc=manifoldCheck(t,4);
      chk('holder '+front+' AF'+AF+' ×'+n+' watertight (+vol)', mc.watertight&&vol(t)>0,
          {open:mc.openEdges,bad:mc.badEdges});
    }
for(const ov of [{hcRib:10},{hcAF:8},{woT:15},{hcPanelT:20},{mntScrewD:0},{hcNX:14,hcNY:14},
                 {woBack:'hex',hcClear:0.05},{woBack:'hex',hcClear:0.8},{woBack:'hex',fitTune:0.5},
                 {woBack:'hex',woPegN:6,hcAF:10}]){
  const t=base(ov), mc=manifoldCheck(t,4);
  chk('extreme '+JSON.stringify(ov)+' watertight', mc.watertight&&vol(t)>0, {open:mc.openEdges,bad:mc.badEdges});
}

console.log('=== the post FITS the cell — that is the whole point of a system ===');
for(const AF of [12,25,40])
  for(const rib of [2,3,5])
    for(const clr of [0.1,0.3,0.6]){
      const open=cellOpening(base({hcAF:AF,hcRib:rib}), AF, rib);
      const post=postAcrossFlats(base({woBack:'hex',woFront:'none',hcAF:AF,hcRib:rib,hcClear:clr,woPegN:1}), 5);
      chk('AF'+AF+' рёбра'+rib+' зазор'+clr+': cell − post = 2 × clearance',
          Math.abs(open-AF)<0.05 && Math.abs((open-post)-2*clr)<0.05,
          {open:+open.toFixed(3), post:+post.toFixed(3), want:+(2*clr).toFixed(2)});
    }
{ // the cell opening is the number the user typed, not the lattice pitch
  for(const AF of [10,18,32]){
    const open=cellOpening(base({hcAF:AF,hcRib:4}), AF, 4);
    chk('hcAF '+AF+' is the CLEAR opening, not the pitch', Math.abs(open-AF)<0.05, {open:+open.toFixed(3)});
  }
}
{ const a=postAcrossFlats(base({woBack:'hex',woFront:'none',hcClear:0.2,fitTune:0,woPegN:1}), 5);
  const b=postAcrossFlats(base({woBack:'hex',woFront:'none',hcClear:0.2,fitTune:0.4,woPegN:1}), 5);
  chk('global fitTune loosens the hex post too', Math.abs((a-b)-0.8)<0.05,
      {tight:+a.toFixed(3), loose:+b.toFixed(3)}); }

console.log('=== the panel is a real honeycomb, not a plate with dents ===');
{ const t=base({hcAF:25,hcRib:3,hcNX:4,hcNY:3}), B=computeBBox(t);
  chk('the panel is thin: thickness = woT', Math.abs((B.maxZ-B.minZ)-5)<1e-9, {z:+(B.maxZ-B.minZ).toFixed(3)});
  const solid=5*(B.maxX-B.minX)*(B.maxY-B.minY);
  chk('most of it is holes', vol(t) < solid*0.65, {frac:+(vol(t)/solid).toFixed(3)});
  chk('but it is not mostly air either', vol(t) > solid*0.15, {frac:+(vol(t)/solid).toFixed(3)}); }
{ const thin=vol(base({hcRib:1.5})), thick=vol(base({hcRib:6}));
  chk('thicker ribs → more material', thick>thin*1.5, {thin:+thin.toFixed(0),thick:+thick.toFixed(0)}); }
{ const a=computeBBox(base({hcNX:2,hcNY:2})), b=computeBBox(base({hcNX:8,hcNY:2}));
  chk('more columns → wider panel', (b.maxX-b.minX) > (a.maxX-a.minX)+80,
      {a:+(a.maxX-a.minX).toFixed(0), b:+(b.maxX-b.minX).toFixed(0)});
  const c=computeBBox(base({hcNX:2,hcNY:8}));
  chk('more rows → taller panel', (c.maxY-c.minY) > (a.maxY-a.minY)+80,
      {a:+(a.maxY-a.minY).toFixed(0), c:+(c.maxY-c.minY).toFixed(0)}); }
{ const withS=vol(base({mntScrewD:5})), noS=vol(base({mntScrewD:0}));
  chk('the frame carries screw holes, and "0 = без" removes them', withS<noS, {withS:+withS.toFixed(0),noS:+noS.toFixed(0)}); }

console.log('=== the holder hangs: posts on the lattice pitch, a lip on the top one ===');
{ const AF=25, rib=3, n=3, t=base({woBack:'hex',woFront:'none',hcAF:AF,hcRib:rib,woPegN:n,woH:120});
  const B=computeBBox(t), zPost=B.minZ+3.2;   // past the retaining lip, so only the posts are here
  const bands=[]; let cur=null;
  for(let i=0;i<=800;i++){ const y=B.minY+(B.maxY-B.minY)*i/800;
    const solid=hitsY(t, 0, zPost).filter(v=>v>y).length%2===1;
    if(solid && !cur) cur={a:y}; if(!solid && cur){ cur.b=y; bands.push(cur); cur=null; } }
  if(cur){ cur.b=B.maxY; bands.push(cur); }
  chk('there are '+n+' posts', bands.length===n, {n:bands.length});
  if(bands.length===n){
    const mids=bands.map(b=>(b.a+b.b)/2);
    const steps=mids.slice(1).map((m,i)=>Math.abs(m-mids[i]));
    chk('and they sit one lattice pitch apart', steps.every(v=>Math.abs(v-(AF+rib))<0.15),
        steps.map(v=>+v.toFixed(2)));
  }
  // The retaining lip lives at the post's far tip, so the holder is TALLER there than mid-post.
  const one=base({woBack:'hex',woFront:'none',hcAF:AF,hcRib:rib,woPegN:1,hcClear:0.3});
  const OB=computeBBox(one);
  const spanAt=z=>{ const ys=hitsY(one, 0, z); return ys.length>=2 ? ys[ys.length-1]-ys[0] : 0; };
  chk('the top post carries a retaining lip at its tip', spanAt(OB.minZ+0.8) > spanAt(OB.minZ+3.4)+0.8,
      {tip:+spanAt(OB.minZ+0.8).toFixed(2), shaft:+spanAt(OB.minZ+3.4).toFixed(2)});
}
{ const shallow=base({woBack:'hex',hcPanelT:5}), deep=base({woBack:'hex',hcPanelT:18});
  const a=computeBBox(shallow), b=computeBBox(deep);
  chk('the post reaches through the panel thickness it is told about',
      (b.maxZ-b.minZ) > (a.maxZ-a.minZ)+12, {a:+(a.maxZ-a.minZ).toFixed(1), b:+(b.maxZ-b.minZ).toFixed(1)}); }

console.log('=== the old organiser backs are untouched ===');
for(const bk of ['cleat','peg'])
  for(const fr of ['hook','shelf','tools','none']){
    const t=base({woBack:bk,woFront:fr}), mc=manifoldCheck(t,4);
    chk(bk+' + '+fr+' still watertight', mc.watertight&&vol(t)>0, {open:mc.openEdges,bad:mc.badEdges});
  }
{ const a=vol(base({woBack:'cleat',hcAF:10})), b=vol(base({woBack:'cleat',hcAF:50}));
  chk('the honeycomb knobs do nothing to the cleat back', Math.abs(a-b)<1e-9, {}); }

console.log('\n'+(fail?'FAILED':'ALL PASSED')+': '+pass+' passed, '+fail+' failed');
if(fail) process.exitCode=1;
