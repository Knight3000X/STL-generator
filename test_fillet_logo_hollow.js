// Fillet + logo compatibility on the ROUNDED HOLLOW / TRAY (Phase 2): logo relief on the outer walls
// and the cavity/pocket floor of a filleted hollow container or tray must stay watertight, and the
// clamp must keep every logo inside the flat region (outer walls inset by the outer radii, cavity floor
// by the inner radii). Exercises the real buildTrisForShape routing (buildRoundedHollow /
// buildSharpRimHollow with per-face dispFns + zone densification).
// Run against the real file:
//   awk '/<script>/{f=1;next}/<\/script>/{f=0}f' parametric-stl-generator.html \
//     | sed '$ { /^init();$/d }' > /tmp/lib.js
//   cat stub_preamble.js /tmp/lib.js test_fillet_logo_hollow.js > /tmp/run.js && node /tmp/run.js

let pass=0, fail=0;
function chk(name,cond,extra){ if(cond){pass++;console.log('  OK  ',name);} else {fail++;console.log('  FAIL',name, extra!==undefined?JSON.stringify(extra):'');} }
function hasNaN(t){for(const tr of t)for(const p of tr)for(const c of p)if(!Number.isFinite(c))return true;return false;}
function synthHM(){ const N=LOGO_HM_SIZE, hm=new Float32Array(N*N);
  for(let y=0;y<N;y++)for(let x=0;x<N;x++){ const fx=x/N-0.5, fy=y/N-0.5, r=Math.hypot(fx,fy);
    hm[y*N+x]=((r>0.28&&r<0.40)||(Math.abs(fx-fy)<0.06&&r<0.42))?1:0; } return hm; }
const HM=synthHM();
function base(ov){
  Object.assign(paramState.box,{width:60,height:60,depth:60,hollow:false,rim:false,wallThickness:4,rimHeight:20,filletSeg:6,
    filletRadius:0,filletTop:0,filletBottom:0,filletVert:0,filletInnerFloor:0,filletInnerVert:0,filletInnerLip:0,
    taperXPlus:0,taperXMinus:0,taperZPlus:0,taperZMinus:0,taperYPlusX:0,taperYPlusZ:0,taperYMinusX:0,taperYMinusZ:0},ov);
  logos.length=0;
}
function addLogo(ov, clamp){ const l=Object.assign({id:nextLogoId++,face:'+X',u0:0,v0:0,w:14,h:14,depth:1.5,threshold:0.5,invert:false,rotation:0,heightmap:HM,previewUrl:null},ov); logos.push(l); if(clamp) clampLogoToFace(l); return l; }
function wt(name, boxOv, logoOvs, clamp){
  base(boxOv); for(const o of (logoOvs||[{}])) addLogo(o, clamp);
  const tris=buildTrisForShape('box',paramState.box); const mc=manifoldCheck(tris,5);
  chk(name, !hasNaN(tris)&&mc.watertight, {open:mc.openEdges, bad:mc.badEdges});
}

const HOLLOW={hollow:true,filletTop:10,filletBottom:10,filletVert:10,filletInnerFloor:10,filletInnerVert:10,filletInnerLip:0};
const TRAY  ={rim:true,rimHeight:20,filletTop:10,filletBottom:10,filletVert:10,filletInnerFloor:8,filletInnerVert:8,filletInnerLip:0};

console.log('=== rounded HOLLOW + logo (outer walls / cavity floor) ===');
wt('hollow +X wall',   HOLLOW, [{face:'+X',u0:-4,v0:0,w:14,h:14}]);
wt('hollow +Z engraved',HOLLOW,[{face:'+Z',u0:0,v0:-6,w:16,h:16,depth:-1.2}]);
wt('hollow -Y bottom', HOLLOW, [{face:'-Y',u0:0,v0:0,w:16,h:16}]);
wt('hollow cavity floor',HOLLOW,[{face:'-Y-inner',u0:0,v0:0,w:14,h:14}]);
wt('hollow wall+floor', HOLLOW, [{face:'+X',u0:-4,v0:0,w:12,h:12},{face:'-Y-inner',u0:0,v0:0,w:12,h:12}]);
wt('hollow rolled lip', {hollow:true,filletTop:8,filletBottom:8,filletVert:8,filletInnerFloor:8,filletInnerVert:8,filletInnerLip:5}, [{face:'-Z',u0:0,v0:-6,w:14,h:14}]);

console.log('=== rounded TRAY + logo (outer walls / pocket floor) ===');
wt('tray +X wall',     TRAY, [{face:'+X',u0:0,v0:-6,w:16,h:16}]);
wt('tray pocket floor',{rim:true,rimHeight:20,filletTop:10,filletBottom:10,filletVert:10,filletInnerFloor:6,filletInnerVert:6,filletInnerLip:0},[{face:'-Y-inner',u0:0,v0:0,w:14,h:14}]);
wt('tray rotated',     TRAY, [{face:'-Z',u0:0,v0:-6,w:14,h:14,rotation:30}]);

console.log('=== clamp keeps logo in the flat region (oversize/edge, watertight) ===');
wt('hollow +X oversize',   HOLLOW, [{face:'+X',w:200,h:200,u0:99,v0:99}], true);
wt('hollow +Z oversize',   HOLLOW, [{face:'+Z',w:200,h:200,u0:-99,v0:99}], true);
wt('hollow -Y oversize',   HOLLOW, [{face:'-Y',w:200,h:200}], true);
wt('hollow floor oversize',HOLLOW, [{face:'-Y-inner',w:200,h:200}], true);
wt('tray +X oversize',     TRAY,   [{face:'+X',w:200,h:200,v0:99}], true);
wt('tray floor oversize',  TRAY,   [{face:'-Y-inner',w:200,h:200}], true);
wt('tray rotated oversize',TRAY,   [{face:'+X',w:200,h:200,rotation:35,v0:-99}], true);

console.log('=== no regression: fillet without logo, logo without fillet ===');
wt('hollow fillet no logo', HOLLOW, []);
wt('hollow logo no fillet', {hollow:true}, [{face:'+X',u0:0,v0:0,w:16,h:16}]);
wt('tray fillet no logo',   TRAY, []);

console.log('=== fuzz regressions (extreme params found by the seeded sweep) ===');
// Fillets 11+12 on a 24 mm-tall hollow leave a 1 mm flat strip; the old 1 mm clamp floor pushed the
// logo into the edge cylinders (4 open edges). The honest clamp shrinks it to nothing instead.
wt('extreme fillets + micro logo (clamp has no 1mm floor)',
  {width:102,height:24,depth:43,hollow:true,wallThickness:6.4,filletSeg:4,filletTop:11,filletBottom:12,filletVert:10},
  [{face:'-Z',u0:7,v0:0,w:16,h:4,rotation:45,depth:-1.5}], true);
// Hairline seam split (~2e-15) amplified by taper landed EXACTLY on a toFixed rounding boundary and the
// old string-keyed manifoldCheck reported 24 fake open edges; tolerance welding must stay clean.
wt('rounded hollow + taper: no knife-edge false opens',
  {width:25,height:65,depth:93,hollow:true,wallThickness:3.9,filletSeg:7,filletTop:2,filletBottom:2,filletVert:8,taperXPlus:-18},
  []);

console.log('\n=== TOTAL:', pass, 'passed,', fail, 'failed ===');
