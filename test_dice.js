// Dice (правильные многогранники): D4/D6/D8/D12/D20 Platonic solids + D10/D100 trapezohedra, through the
// REAL buildDie / buildTrisForShape pipeline. Watertight body, correct face counts, per-axis fill, and
// per-face raised relief (numbers/logos/text) appended as watertight slabs. Run via ./run-all.sh.
let pass=0,fail=0; function chk(n,c,e){if(c){pass++;console.log('  OK  ',n);}else{fail++;console.log('  FAIL',n,e!==undefined?JSON.stringify(e):'');}}
function vol(t){let v=0;for(const T of t){const a=T[0],b=T[1],c=T[2];v+=(a[0]*(b[1]*c[2]-b[2]*c[1])-a[1]*(b[0]*c[2]-b[2]*c[0])+a[2]*(b[0]*c[1]-b[1]*c[0]))/6;}return v;}
// synthetic round-blob heightmap (no canvas in Node) — stands in for a number/logo silhouette
function blobHM(r){ const N=LOGO_HM_SIZE,h=new Float32Array(N*N); r=r||0.32; for(let y=0;y<N;y++)for(let x=0;x<N;x++){const fx=x/N-0.5,fy=y/N-0.5;h[y*N+x]=(Math.hypot(fx,fy)<r)?1:0;} return h; }
function base(ov){ logos.length=0; boxHoles.length=0; dieFaces.length=0;
  Object.assign(paramState.box, defaultBoxParams(), {width:40,height:40,depth:40,hollow:false,polyN:0,polyRound:0,platonic:'none',
    scoopDir:'none',labelTab:'none',mountHoles:'none',gripWall:'none',divX:1,divZ:1,stackFeet:false,gfOn:false,
    taperXPlus:0,taperYPlusX:0,taperYPlusZ:0}, ov);
  return buildTrisForShape('box',paramState.box); }

const DICE={d4:4,d6:6,d8:8,d10:10,d12:12,d20:20,d100:100};
console.log('=== die bodies watertight + face counts ===');
for(const k in DICE){ const t=base({platonic:k}); const mc=manifoldCheck(t,4);
  chk(k+' watertight (+vol)', mc.watertight&&vol(t)>0, mc);
  chk(k+' face count = '+DICE[k], dieFaceCount(k)===DICE[k], {got:dieFaceCount(k)}); }

console.log('=== per-axis fill (bbox = width×height×depth) ===');
{ const t=base({platonic:'d6',width:30,height:50,depth:70}); const b=computeBBox(t);
  chk('d6 fills 30×50×70', Math.abs((b.maxX-b.minX)-30)<0.01 && Math.abs((b.maxY-b.minY)-50)<0.01 && Math.abs((b.maxZ-b.minZ)-70)<0.01,
      {x:b.maxX-b.minX,y:b.maxY-b.minY,z:b.maxZ-b.minZ}); }
{ const t=base({platonic:'d20'}); const b=computeBBox(t); chk('d20 fills 40mm on every axis', Math.abs((b.maxX-b.minX)-40)<0.5 && Math.abs((b.maxY-b.minY)-40)<0.5, {x:b.maxX-b.minX,y:b.maxY-b.minY}); }

console.log('=== D10 trapezohedron / D100 Zocchihedron are proper ===');
{ const P=diePoly('d10'); chk('d10 has 10 kite faces (all quads)', P.polys.length===10 && P.polys.every(p=>p.length===4), {n:P.polys.length}); }
{ const P=diePoly('d100'); chk('d100 (Zocchihedron) has exactly 100 facets', P.polys.length===100, {n:P.polys.length});
  const sides=P.polys.map(p=>p.length); chk('d100 facets are polygons (pent/hex, not kites)', sides.every(s=>s>=4&&s<=7) && sides.some(s=>s>=5), {min:Math.min(...sides),max:Math.max(...sides)});
  // near-spherical: every vertex roughly equidistant from centre (unit-ish radius spread is tight)
  let rmin=1e9,rmax=0; for(const v of P.verts){ const r=Math.hypot(v[0],v[1],v[2]); rmin=Math.min(rmin,r); rmax=Math.max(rmax,r); }
  chk('d100 is near-spherical (vertex radius spread < 25%)', (rmax-rmin)/rmax < 0.25, {rmin,rmax}); }

console.log('=== per-face relief (numbers/logos) appended, watertight ===');
{ // one relief on one face
  base({platonic:'d6'}); const plain=buildTrisForShape('box',paramState.box).length;
  dieFaces.push({id:nextDieId++,face:0,src:'text',depth:1.5,sizeFrac:0.55,rotation:0,invert:false,threshold:0.5,heightmap:blobHM()});
  const t=buildTrisForShape('box',paramState.box); const mc=manifoldCheck(t,4);
  chk('d6 + 1 face relief watertight', mc.watertight, mc);
  chk('relief adds material (mesh grows, +vol)', t.length>plain && vol(t)>0, {plain,now:t.length});
}
console.log('=== relief on EVERY face (auto-number style) for each die ===');
for(const k in DICE){
  base({platonic:k});
  for(let f=0;f<DICE[k];f++) dieFaces.push({id:nextDieId++,face:f,src:'text',depth:1.2,sizeFrac:0.5,rotation:(f*37)%360,invert:false,threshold:0.5,heightmap:blobHM(0.3)});
  const t=buildTrisForShape('box',paramState.box); const mc=manifoldCheck(t,4);
  chk(k+' relief on all '+DICE[k]+' faces watertight', mc.watertight, mc);
}
console.log('=== relief + taper, + rounded dims ===');
{ base({platonic:'d8',taperXPlus:8}); dieFaces.push({id:nextDieId++,face:2,src:'text',depth:1.2,sizeFrac:0.5,rotation:0,invert:false,threshold:0.5,heightmap:blobHM()});
  chk('d8 relief + taper watertight', manifoldCheck(buildTrisForShape('box',paramState.box),4).watertight); }
{ base({platonic:'d10'}); for(let f=0;f<10;f++) dieFaces.push({id:nextDieId++,face:f,src:'text',depth:1,sizeFrac:0.45,rotation:0,invert:false,threshold:0.5,heightmap:blobHM(0.28)});
  chk('d10 relief on all 10 faces watertight', manifoldCheck(buildTrisForShape('box',paramState.box),4).watertight); }
{ base({platonic:'d100',width:50,height:50,depth:50}); for(let f=0;f<20;f++) dieFaces.push({id:nextDieId++,face:f*3,src:'text',depth:0.8,sizeFrac:0.55,rotation:0,invert:false,threshold:0.5,heightmap:blobHM(0.3)});
  chk('d100 partial relief watertight', manifoldCheck(buildTrisForShape('box',paramState.box),4).watertight); }

console.log('=== NEGATIVE depth engraves (recessed) and stays watertight; volume drops below flat body ===');
for(const k of ['d6','d8','d12','d20','d100']){
  base({platonic:k}); const flat=vol(buildTrisForShape('box',paramState.box));
  dieFaces.length=0; for(let f=0;f<DICE[k];f++) dieFaces.push({id:nextDieId++,face:f,src:'text',depth:-1.0,sizeFrac:0.5,rotation:0,invert:false,threshold:0.5,heightmap:blobHM(0.3)});
  const t=buildTrisForShape('box',paramState.box); const mc=manifoldCheck(t,4);
  chk(k+' engraved (neg depth) watertight', mc.watertight, mc);
  chk(k+' engraving removes material (vol < flat body)', vol(t) < flat, {flat,engraved:vol(t)});
}
{ base({platonic:'d20'}); const flat=vol(buildTrisForShape('box',paramState.box));
  dieFaces.length=0; dieFaces.push({id:nextDieId++,face:0,src:'text',depth:1.2,sizeFrac:0.5,rotation:0,invert:false,threshold:0.5,heightmap:blobHM(0.3)});
  chk('d20 emboss (pos depth) adds material (vol > flat body)', vol(buildTrisForShape('box',paramState.box)) > flat, {}); }
console.log('=== invert (engrave-look silhouette) still watertight; empty threshold falls back ===');
{ base({platonic:'d6'}); dieFaces.push({id:nextDieId++,face:0,src:'text',depth:1.2,sizeFrac:0.5,rotation:0,invert:true,threshold:0.5,heightmap:blobHM()});
  chk('d6 inverted relief watertight', manifoldCheck(buildTrisForShape('box',paramState.box),4).watertight); }

console.log('=== dieFaces ignored when no die active (regression) ===');
{ dieFaces.length=0; dieFaces.push({id:nextDieId++,face:0,src:'text',depth:1.5,sizeFrac:0.5,rotation:0,invert:false,threshold:0.5,heightmap:blobHM()});
  const cube=base({polyN:0}); // base() clears dieFaces, so re-add after
  dieFaces.push({id:nextDieId++,face:0,src:'text',depth:1.5,sizeFrac:0.5,rotation:0,invert:false,threshold:0.5,heightmap:blobHM()});
  const t=buildTrisForShape('box',paramState.box); const bb=computeBBox(t);
  chk('plain cube unaffected by dieFaces', manifoldCheck(t,4).watertight && Math.abs((bb.maxX-bb.minX)-40)<1e-6, {}); }
dieFaces.length=0;

console.log('=== slicing works on a die ===');
{ const t=base({platonic:'d20',width:80,height:80,depth:80}); const {frags}=sliceMeshIntoFragments(t,45,45,45);
  let ok=frags.length>1; for(const f of frags) if(!manifoldCheck(f.tris,4).watertight) ok=false;
  chk('d20 slices into watertight fragments', ok, {n:frags.length}); }

console.log('=== opposite-face-sum numbering (fairness standard) ===');
for(const [k,n,sumC] of [['d6',6,7],['d8',8,9],['d10',10,9],['d12',12,13],['d20',20,21]]){
  const G=dieFaceGeometry(k,1,1,1), c=G.faces.map(f=>f.c), val=dieOppositeSumNumbering(k,n).map(Number);
  let ok=true; for(let i=0;i<n;i++){ let bj=-1,bd=1e9; for(let j=0;j<n;j++){ if(j===i)continue; const dx=c[j][0]+c[i][0],dy=c[j][1]+c[i][1],dz=c[j][2]+c[i][2],d=dx*dx+dy*dy+dz*dz; if(d<bd){bd=d;bj=j;} } if(val[i]+val[bj]!==sumC) ok=false; }
  const st=(k==='d10')?0:1, set=new Set(val); let all=true; for(let v=st;v<st+n;v++) if(!set.has(v)) all=false;
  chk(k+' opposite faces sum to '+sumC+' + all values present', ok&&all, {val});
}
console.log('=== D4 apex-read corner numbering structure ===');
{ const P=diePoly('d4'), sets=P.polys.map(poly=>poly.map(i=>i+1).sort().join('')).sort();
  chk('d4 faces carry {123,124,134,234}', JSON.stringify(sets)===JSON.stringify(['123','124','134','234']), {sets});
  const cnt={}; for(const poly of P.polys) for(const i of poly) cnt[i+1]=(cnt[i+1]||0)+1;
  chk('d4 each number appears on 3 faces', [1,2,3,4].every(x=>cnt[x]===3), cnt); }
console.log('=== multiple reliefs per face (D4 corner style) watertight ===');
{ base({platonic:'d4'}); const G=dieFaceGeometry('d4',20,20,20); dieFaces.length=0;
  for(let f=0;f<4;f++){ const face=G.faces[f], pts=G.polys[f];
    for(let cnr=0;cnr<3;cnr++){ const q=pts[cnr];
      const du=(q[0]-face.c[0])*face.u[0]+(q[1]-face.c[1])*face.u[1]+(q[2]-face.c[2])*face.u[2];
      const dv=(q[0]-face.c[0])*face.v[0]+(q[1]-face.c[1])*face.v[1]+(q[2]-face.c[2])*face.v[2];
      dieFaces.push({id:nextDieId++,face:f,src:'text',depth:-0.3,sizeFrac:0.28,rotation:0,invert:false,threshold:0.5,offU:du/face.r*0.56,offV:dv/face.r*0.56,heightmap:blobHM(0.3)}); } }
  const t=buildTrisForShape('box',paramState.box); const mc=manifoldCheck(t,4);
  chk('d4 with 3 reliefs/face (12 total) watertight', mc.watertight, mc); dieFaces.length=0; }

console.log('=== raised rounded frame (валик) around die faces ===');
for(const k of ['d6','d8','d12','d20']){ const t=base({platonic:k,dieBead:0.8,width:40,height:40,depth:40}); const mc=manifoldCheck(t,4);
  chk(k+' bead frame watertight (+vol)', mc.watertight && vol(t)>0, mc); }
{ const plain=vol(base({platonic:'d6'})), beaded=vol(base({platonic:'d6',dieBead:0.9}));
  chk('bead adds material (raised frame)', beaded>plain, {plain,beaded}); }
{ base({platonic:'d20'}); dieFaces.length=0;
  for(let f=0;f<20;f++) dieFaces.push({id:nextDieId++,face:f,src:'text',depth:-0.3,sizeFrac:0.5,rotation:0,invert:false,threshold:0.5,heightmap:blobHM(0.3)});
  paramState.box.dieBead=0.8;
  chk('bead + engraved numbers watertight', manifoldCheck(buildTrisForShape('box',paramState.box),4).watertight); dieFaces.length=0; }
chk('bead + taper watertight', manifoldCheck(base({platonic:'d8',dieBead:0.7,taperXPlus:8}),4).watertight);
{ // tiny faces auto-skip the bead: still watertight, no crash
  chk('d100 with bead watertight (mostly skipped)', manifoldCheck(base({platonic:'d100',dieBead:0.8,width:44,height:44,depth:44}),4).watertight); }

console.log('=== валик по рёбрам, а не рамка на гранях ===');
{
  // A frame inset into each face put TWO parallel ridges on every shared edge, with a groove between
  // them: three lines where a die has one. A die's edge is one feature, so it gets one bead sitting ON
  // the edge — which is measurable, not a matter of taste, because a ridge on the edge line is at most
  // its own radius away from it and an inset frame is much further.
  const KEYQ = q => Math.round(q[0]*100)+'|'+Math.round(q[1]*100)+'|'+Math.round(q[2]*100);
  for (const k in DICE){
    const G = dieFaceGeometry(k, 15, 15, 15);
    const V = new Set(); for (const poly of G.polys) for (const q of poly) V.add(KEYQ(q));
    const E = dieUniqueEdges(G.polys).length;
    // every edge is shared by exactly two faces, so drawing one per face would be twice this
    chk(k+': рёбра посчитаны по Эйлеру (V−E+F=2)', V.size - E + G.polys.length === 2,
        {V:V.size, E, F:G.polys.length});
  }
  // Watertight is the honest test of «no coincident surfaces»: rounded caps, or ends meeting exactly at
  // a vertex, both make two tubes share edges rather than interpenetrate, and that is what this catches.
  let bad = [];
  for (const k in DICE) for (const r of [0.3, 0.6, 1, 1.5, 2, 3]){
    const t = base({platonic:k, dieBead:r, width:30, height:30, depth:30});
    if (!manifoldCheck(t, 4).watertight) bad.push(k+'@'+r);
  }
  chk('все кости × все радиусы валика герметичны', bad.length === 0, bad);

  // …and the bead really is ON the edges: everything that stands proud of the die's own surface is within
  // one bead radius (plus the stud's) of an EDGE LINE. An inset frame would sit far from every edge.
  {
    const r = 1.2, half = 15;
    const t = base({platonic:'d6', dieBead:r, width:30, height:30, depth:30});
    const G = dieFaceGeometry('d6', half, half, half);
    const edges = dieUniqueEdges(G.polys);
    const distToSeg = (p, a, b) => {
      const d=[b[0]-a[0],b[1]-a[1],b[2]-a[2]], L2=d[0]*d[0]+d[1]*d[1]+d[2]*d[2];
      let u=((p[0]-a[0])*d[0]+(p[1]-a[1])*d[1]+(p[2]-a[2])*d[2])/L2;
      u=Math.max(0,Math.min(1,u));
      return Math.hypot(p[0]-(a[0]+d[0]*u), p[1]-(a[1]+d[1]*u), p[2]-(a[2]+d[2]*u));
    };
    let outside = 0, far = 0, worst = 0;
    for (const T of t) for (const q of T){
      if (Math.max(Math.abs(q[0]), Math.abs(q[1]), Math.abs(q[2])) <= half + 1e-6) continue;
      outside++;
      let best = Infinity;
      for (const [ea, eb] of edges) best = Math.min(best, distToSeg(q, ea, eb));
      if (best > r*1.2 + 1e-6) far++;
      worst = Math.max(worst, best);
    }
    chk('над поверхностью кости вообще что-то есть', outside > 100, outside);
    chk('и всё это сидит на рёбрах, а не отступя внутрь граней', far === 0,
        {far, worst: +worst.toFixed(3), tol: +(r*1.2).toFixed(3)});
  }
  // The stud closes the joint, so it has to be wider than the tube it caps.
  {
    const r = 1.2, t = base({platonic:'d6', dieBead:r, width:30, height:30, depth:30});
    chk('шарик в вершине шире валика', bboxOfTris(t).hi[0] > 15 + r + 1e-3,
        {gabarit: +bboxOfTris(t).hi[0].toFixed(3), want: 15 + r});
  }
}

console.log('=== крупная цифра на треугольной грани остаётся чёткой ===');
{
  // «Размер %» меряется от ОПИСАННОГО радиуса, а у треугольника он вдвое больше вписанного, поэтому
  // штатные 55 % на d20 просили патч шире самой грани. Прежде это замечалось постфактум и построение
  // молча уходило на смещение радиальной сетки — оттуда и рваные, размытые цифры на скриншоте.
  const wideBar = () => { const N=LOGO_HM_SIZE, h=new Float32Array(N*N);
    for(let y=0;y<N;y++) for(let x=0;x<N;x++){ const fx=x/N-0.5, fy=y/N-0.5;
      h[y*N+x] = (Math.abs(fx) < 0.46 && Math.abs(fy) < 0.17) ? 1 : 0; } return h; };
  const setup = (kind) => { base({platonic:kind, width:42, height:42, depth:42}); dieFaces.length=0;
    dieFaces.push({id:nextDieId++, face:0, src:'text', depth:-0.2, sizeFrac:0.55, rotation:0,
                   invert:false, threshold:0.5, offU:0, offV:0, heightmap:wideBar()});
    return buildTrisForShape('box', paramState.box); };
  const G20 = dieFaceGeometry('d20', 21, 21, 21), f20 = G20.faces[0];
  const t20 = setup('d20');
  chk('d20 с крупной цифрой герметична', manifoldCheck(t20,4).watertight, manifoldCheck(t20,4));
  // The discriminator between the two paths is the WALL of the pocket: a cell patch cuts it perpendicular
  // to the face, the displaced radial grid can only ramp between neighbouring grid points. Ramps are what
  // «нечёткость» looks like, so they are what gets counted.
  const wallsOf = (tris, n) => { let w=0;
    for(const T of tris){
      const u=[T[1][0]-T[0][0],T[1][1]-T[0][1],T[1][2]-T[0][2]], v=[T[2][0]-T[0][0],T[2][1]-T[0][1],T[2][2]-T[0][2]];
      const c=[u[1]*v[2]-u[2]*v[1], u[2]*v[0]-u[0]*v[2], u[0]*v[1]-u[1]*v[0]], L=Math.hypot(c[0],c[1],c[2]);
      if(L<1e-12) continue;
      if(Math.abs((c[0]*n[0]+c[1]*n[1]+c[2]*n[2])/L) < 0.02) w++;
    }
    return w; };
  chk('карман нарезан отвесными стенками, а не пандусами', wallsOf(t20, f20.n) > 100, wallsOf(t20, f20.n));
  // …and the clamp takes only what it must: the glyph keeps most of the size that was asked for.
  {
    const nC = dieGlyphCells(G20.faces.length, dieResolution);
    const to2 = q => [dot(sub(q, f20.c), f20.u), dot(sub(q, f20.c), f20.v)];
    const fitted = buildDieGlyphPatch(f20, dieFaces[0], nC, false, G20.polys[0].map(to2));
    const raw    = buildDieGlyphPatch(f20, dieFaces[0], nC, false, null);
    const spanOf = pch => { const xs = pch.ring.map(q=>q[0]); return Math.max(...xs) - Math.min(...xs); };
    chk('патч построен в обоих случаях', !!fitted && !!raw);
    chk('и подрезан, раз без подрезки не влезал', spanOf(fitted) < spanOf(raw),
        {fitted:+spanOf(fitted).toFixed(2), raw:+spanOf(raw).toFixed(2)});
    chk('но подрезан по надобности, а не вдвое', spanOf(fitted) > spanOf(raw)*0.85,
        {fitted:+spanOf(fitted).toFixed(2), raw:+spanOf(raw).toFixed(2)});
  }
  // A square face has room for anything ever asked for, so nothing there may change.
  {
    const t6 = setup('d6');
    const G6 = dieFaceGeometry('d6', 21, 21, 21), f6 = G6.faces[0];
    const nC = dieGlyphCells(G6.faces.length, dieResolution);
    const to2 = q => [dot(sub(q, f6.c), f6.u), dot(sub(q, f6.c), f6.v)];
    const fitted = buildDieGlyphPatch(f6, dieFaces[0], nC, false, G6.polys[0].map(to2));
    const raw    = buildDieGlyphPatch(f6, dieFaces[0], nC, false, null);
    chk('на квадратной грани подрезка не срабатывает',
        fitted && raw && fitted.tris.length === raw.tris.length &&
        Math.abs(fitted.ring[0][0] - raw.ring[0][0]) < 1e-9,
        {fitted: fitted && fitted.tris.length, raw: raw && raw.tris.length});
    chk('и куб тоже герметичен', manifoldCheck(t6,4).watertight);
    chk('и у него тоже отвесные стенки', wallsOf(t6, f6.n) > 100, wallsOf(t6, f6.n));
  }
  dieFaces.length=0;
}

console.log('\n=== край цифры идёт по рисунку, а не по клеткам ===');
{
  /* Ячейка размером с пиксель делает край цифры ступенчатым по построению, и ДЛИНА края это меряет: у
     растрового круга контур равен 8r при любой мелкости сетки, против положенных 2πr ≈ 6.28r — на 27 %
     длиннее. Отсюда и «нечёткость» на крупных цифрах: не размытость, а лесенка.

     Меряется ОБЕ половины — карман в грани и цветная пробка, которая в него ложится: обе читают один и
     тот же warp, и если бы читали разный, двухцветная кость печаталась бы со щелью по контуру цифры. */
  const N=LOGO_HM_SIZE, RAD=0.4;
  const disc=new Float32Array(N*N);
  for(let y=0;y<N;y++)for(let x=0;x<N;x++){ const fx=(x+0.5)/N-0.5, fy=(y+0.5)/N-0.5;
    disc[y*N+x] = Math.hypot(fx,fy) < RAD ? 1 : 0; }
  base({platonic:'d6', width:42, height:42, depth:42});
  const asg = {id:nextDieId++, face:0, src:'text', depth:1.2, sizeFrac:0.5, rotation:0,
               invert:false, threshold:0.5, offU:0, offV:0, heightmap:disc};
  dieFaces.push(asg);
  const G = dieFaceGeometry('d6', 21, 21, 21), f = G.faces[0];
  const nC = dieGlyphCells(G.faces.length, dieResolution);
  const d3 = (a,b) => a[0]*b[0]+a[1]*b[1]+a[2]*b[2];
  const nrm = T => { const u=[T[1][0]-T[0][0],T[1][1]-T[0][1],T[1][2]-T[0][2]],
                           v=[T[2][0]-T[0][0],T[2][1]-T[0][1],T[2][2]-T[0][2]];
    const c=[u[1]*v[2]-u[2]*v[1], u[2]*v[0]-u[0]*v[2], u[0]*v[1]-u[1]*v[0]], L=Math.hypot(c[0],c[1],c[2]);
    return L<1e-12 ? null : [c[0]/L,c[1]/L,c[2]/L]; };
  // контур верхней площадки: рёбра ровно с ОДНИМ треугольником, смотрящим по нормали грани, на высоте depth
  const outline = tris => {
    const key=(A,B)=>{const a=A.map(q=>q.toFixed(4)).join(','), b=B.map(q=>q.toFixed(4)).join(',');
      return a<b ? a+'|'+b : b+'|'+a; };
    const cnt=new Map();
    for(const T of tris){ const n=nrm(T); if(!n || d3(n,f.n) < 0.999) continue;
      const off = d3([T[0][0]-f.c[0], T[0][1]-f.c[1], T[0][2]-f.c[2]], f.n);
      if(Math.abs(off - asg.depth) > 1e-6) continue;
      for(let e=0;e<3;e++){ const k=key(T[e],T[(e+1)%3]); cnt.set(k,(cnt.get(k)||0)+1); } }
    let peri=0;
    for(const [k,c] of cnt) if(c===1){ const [a,b]=k.split('|').map(q=>q.split(',').map(Number));
      peri += Math.hypot(a[0]-b[0], a[1]-b[1], a[2]-b[2]); }
    return peri;
  };
  const S0 = Math.max(1, (asg.sizeFrac||0.55)*f.r*2*0.9);
  const truth = 2*Math.PI*RAD*S0;
  const pocket = buildDieGlyphPatch(f, asg, nC, false, null);
  const plug   = buildDieGlyphPatch(f, asg, nC, true,  null);
  chk('патч построен в обеих половинах', !!pocket && !!plug);
  const pPocket = outline(pocket.tris), pPlug = outline(plug.tris);
  chk('контур цифры нашёлся', pPocket > truth*0.5, +pPocket.toFixed(2));
  chk('и идёт по окружности, а не лесенкой (лесенка это 1.27)', pPocket/truth < 1.10,
      {периметр:+pPocket.toFixed(2), истинный:+truth.toFixed(2), отношение:+(pPocket/truth).toFixed(3)});
  chk('и не короче истинного — срезать углы тоже нельзя', pPocket/truth > 0.97, +(pPocket/truth).toFixed(3));
  chk('цветная пробка идёт по той же линии', Math.abs(pPlug - pPocket) < 1e-6,
      {пробка:+pPlug.toFixed(4), карман:+pPocket.toFixed(4)});
  const whole = buildTrisForShape('box', paramState.box);
  chk('кость с такой цифрой герметична', manifoldCheck(whole,4).watertight, manifoldCheck(whole,4));
  dieFaces.length=0;
}

console.log('\n=== TOTAL:',pass,'passed,',fail,'failed ===');
process.exit(fail?1:0);
