// #8: standalone extruded-silhouette logo model. A logo's image is thresholded into a binary
// silhouette on an N×N cell grid and extruded into its own watertight solid (buildLogoExtrudeTris),
// exposed through buildTrisForShape('box', {logo3d:true, ...}) with the artwork in the global
// logos[] (mirrors the app: the model record's logos[0] is loaded into the globals when active).
// Run against the REAL <script>:
//   awk '/<script>/{c++;f=1;next}/<\/script>/{f=0;next} f && c>=2' parametric-stl-generator.html | sed '$ { /^init();$/d }' > /tmp/lib.js
//   cat stub_preamble.js /tmp/lib.js test_logo3d.js > /tmp/run.js && node /tmp/run.js

let pass = 0, fail = 0;
function check(name, cond, extra) {
  if (cond) { pass++; console.log('  OK  ', name); }
  else { fail++; console.log('  FAIL', name, extra!==undefined?JSON.stringify(extra):''); }
}
function hasNaN(tris) { for (const tri of tris) for (const p of tri) for (const c of p) if (!Number.isFinite(c)) return true; return false; }
function sv(t){let v=0;for(const T of t){const a=T[0],b=T[1],c=T[2];v+=(a[0]*(b[1]*c[2]-b[2]*c[1])-a[1]*(b[0]*c[2]-b[2]*c[0])+a[2]*(b[0]*c[1]-b[1]*c[0]))/6;}return v;}
function bbox(tris){ const lo=[1e9,1e9,1e9], hi=[-1e9,-1e9,-1e9];
  for (const tr of tris) for (const p of tr) for (let a=0;a<3;a++){ lo[a]=Math.min(lo[a],p[a]); hi[a]=Math.max(hi[a],p[a]); }
  return {lo,hi}; }

// Synthetic heightmaps (LOGO_HM_SIZE×LOGO_HM_SIZE, values 0..1).
function makeHM(fn){ const s=LOGO_HM_SIZE, hm=new Float32Array(s*s);
  for(let y=0;y<s;y++)for(let x=0;x<s;x++) hm[y*s+x]=fn((x+0.5)/s,(y+0.5)/s); return hm; }
const hmCircle = makeHM((u,v)=> (Math.hypot(u-0.5,v-0.5) < 0.35 ? 1 : 0));        // filled disc
const hmRing   = makeHM((u,v)=>{ const r=Math.hypot(u-0.5,v-0.5); return (r<0.4 && r>0.2) ? 1 : 0; }); // annulus (hole!)
const hmTwo    = makeHM((u,v)=> (Math.hypot(u-0.25,v-0.5)<0.15 || Math.hypot(u-0.75,v-0.5)<0.15) ? 1 : 0); // two islands
const hmGrad   = makeHM((u,v)=> u);                                               // left-to-right ramp
const hmEmpty  = makeHM(()=>0);                                                    // nothing above threshold

function mkLogo(hm, over){ return Object.assign({ id:1, face:'+Z', u0:0, v0:0, w:30, h:30, depth:1.5,
  threshold:0.5, invert:false, rotation:0, heightmap:hm }, over); }
function setLogo3d(logo, over){
  logos.length = 0; if (logo) logos.push(logo);
  Object.assign(paramState.box, { logo3d:true, width:40, height:3, depth:40 }, over);
}

console.log('=== Filled disc: watertight extrusion with expected proportions ===');
{
  setLogo3d(mkLogo(hmCircle));
  const tris = buildTrisForShape('box', paramState.box);
  const mc = manifoldCheck(tris, 4);
  check('no NaN', !hasNaN(tris));
  check('watertight', mc.watertight, mc);
  check('positively oriented (volume > 0)', sv(tris) > 0);
  const b = bbox(tris);
  check('thickness = height param', Math.abs((b.hi[1]-b.lo[1]) - 3) < 1e-9, b);
  check('footprint stays inside width×depth', b.hi[0]<=20+1e-9 && b.lo[0]>=-20-1e-9 && b.hi[2]<=20+1e-9 && b.lo[2]>=-20-1e-9, b);
  // disc of radius 0.35 of a 40-mm span → radius 14 mm; grid quantisation keeps it within a cell or so
  check('disc diameter ≈ 28 mm', Math.abs((b.hi[0]-b.lo[0]) - 28) < 1.5, {dx: b.hi[0]-b.lo[0]});
  // volume ≈ π·14²·3 ≈ 1847 mm³ (cell quantisation → a few % tolerance)
  const vol = sv(tris);
  check('volume ≈ π r² t', Math.abs(vol - Math.PI*14*14*3) < 0.05*Math.PI*14*14*3, {vol});
}

console.log('\n=== Ring (silhouette with a through-hole) ===');
{
  setLogo3d(mkLogo(hmRing), { width:50, depth:50, height:2 });
  const tris = buildTrisForShape('box', paramState.box);
  const mc = manifoldCheck(tris, 4);
  check('ring watertight', mc.watertight && !hasNaN(tris), mc);
  const vol = sv(tris);
  // annulus 0.2..0.4 of 50 mm → radii 10..20 → area π(400−100)=300π, thickness 2
  check('ring volume ≈ 300π·2', Math.abs(vol - 300*Math.PI*2) < 0.06*300*Math.PI*2, {vol});
}

console.log('\n=== Two disconnected islands stay a single watertight STL ===');
{
  setLogo3d(mkLogo(hmTwo), { width:60, depth:30, height:4 });
  const tris = buildTrisForShape('box', paramState.box);
  const mc = manifoldCheck(tris, 4);
  check('islands watertight & +vol', mc.watertight && sv(tris) > 0, mc);
}

console.log('\n=== Threshold and invert are honoured ===');
{
  setLogo3d(mkLogo(hmGrad, { threshold:0.75 }));      // ramp: right quarter only
  const hiT = sv(buildTrisForShape('box', paramState.box));
  setLogo3d(mkLogo(hmGrad, { threshold:0.25 }));      // right three quarters
  const loT = sv(buildTrisForShape('box', paramState.box));
  check('lower threshold ⇒ more material', loT > hiT*2, {hiT, loT});
  setLogo3d(mkLogo(hmGrad, { threshold:0.75, invert:true })); // inverted: left quarter
  const inv = sv(buildTrisForShape('box', paramState.box));
  check('invert flips which side survives', Math.abs(inv - hiT) < 0.15*hiT, {hiT, inv});
  const b = bbox(buildTrisForShape('box', paramState.box));
  check('inverted ramp material is on the LEFT', b.hi[0] < 0, b);
}

console.log('\n=== Rotation ===');
{
  setLogo3d(mkLogo(hmGrad, { threshold:0.6, rotation:90 }), { width:40, depth:40, height:3 });
  const tris = buildTrisForShape('box', paramState.box);
  const mc = manifoldCheck(tris, 4);
  const b = bbox(tris);
  // the surviving strip must now span full X but only part of Z
  check('rotated 90°: watertight', mc.watertight, mc);
  check('rotated 90°: strip flips axes', (b.hi[0]-b.lo[0]) > 35 && (b.hi[2]-b.lo[2]) < 25, b);
}

console.log('\n=== Empty silhouette / missing artwork fall back to a solid plate ===');
{
  setLogo3d(mkLogo(hmEmpty));
  const t1 = buildTrisForShape('box', paramState.box);
  check('empty silhouette → solid plate, watertight', manifoldCheck(t1,4).watertight && Math.abs(sv(t1) - 40*40*3) < 1e-6, {vol: sv(t1)});
  setLogo3d(null); // no logo at all
  const t2 = buildTrisForShape('box', paramState.box);
  check('no artwork → solid plate, watertight', manifoldCheck(t2,4).watertight && Math.abs(sv(t2) - 40*40*3) < 1e-6, {vol: sv(t2)});
}

console.log('\n=== logo3d flag off ⇒ ordinary box path unaffected ===');
{
  logos.length = 0;
  Object.assign(paramState.box, { logo3d:false, width:40, height:3, depth:40 });
  const tris = buildTrisForShape('box', paramState.box);
  check('plain box still built (12 tris... or grid) & watertight', manifoldCheck(tris,4).watertight && Math.abs(sv(tris) - 40*3*40) < 1e-6, {vol: sv(tris)});
  paramState.box.logo3d = false;
}

console.log('\n=== Fuzz: random blobs at random sizes stay watertight ===');
{
  let ok = 0; const RUNS = 30;
  let seed = 1234; const rnd = () => (seed = (seed*1103515245 + 12345) % 2147483648) / 2147483648;
  for (let r = 0; r < RUNS; r++) {
    const blobs = []; const nB = 1 + Math.floor(rnd()*4);
    for (let b=0;b<nB;b++) blobs.push({x:0.2+rnd()*0.6, y:0.2+rnd()*0.6, r:0.05+rnd()*0.25});
    const hm = makeHM((u,v)=> blobs.some(bl => Math.hypot(u-bl.x,v-bl.y) < bl.r) ? 1 : 0);
    setLogo3d(mkLogo(hm, { rotation: Math.floor(rnd()*360)-180 }),
      { width: 5+rnd()*80, depth: 5+rnd()*80, height: 0.4+rnd()*10 });
    const tris = buildTrisForShape('box', paramState.box);
    const mc = manifoldCheck(tris, 4);
    if (mc.watertight && !hasNaN(tris) && sv(tris) > 0) ok++;
    else console.log('    fuzz fail @', r, mc);
  }
  check(`fuzz: ${ok}/${RUNS} watertight`, ok === RUNS);
}

logos.length = 0; paramState.box.logo3d = false;
console.log(`\n=== TOTAL: ${pass} passed, ${fail} failed ===`);
process.exit(fail ? 1 : 0);
