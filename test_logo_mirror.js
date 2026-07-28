// Which way round a label reads. FACE_AXES names each face's two non-normal world axes in ASCENDING
// order, which says nothing about orientation: seen from outside, that frame is left-handed on −X, +Y
// and −Z, and the artwork came out mirrored there (reported on the top of a project-box lid — but it
// was never enclosure-specific). These tests measure the handedness off the REAL mesh rather than
// trusting the table: three separate marks are embossed one at a time, and where they land gives the
// image's right and down directions in world space. Run via ./run-all.sh.
let pass=0, fail=0;
function chk(n,c,e){if(c){pass++;console.log('  OK  ',n);}else{fail++;console.log('  FAIL',n,e!==undefined?JSON.stringify(e):'');}}

// One small square, placed in image coordinates (u right, v DOWN — row 0 is the top of the picture).
function mark(u0,u1,v0,v1){
  const S=LOGO_HM_SIZE, d=new Float32Array(S*S);
  for(let j=0;j<S;j++) for(let i=0;i<S;i++){ const u=(i+0.5)/S, v=(j+0.5)/S;
    d[j*S+i] = (u>u0&&u<u1&&v>v0&&v<v1) ? 1 : 0; }
  return d;
}
const TL = mark(0.06,0.30,0.06,0.30), TR = mark(0.70,0.94,0.06,0.30), BL = mark(0.06,0.30,0.70,0.94);

// Where each face is looked at from: n = outward normal, U = up on screen, R = right on screen
// (R × U = n). The four sides are viewed with the model upright; the top and bottom are viewed from
// the FRONT, looking down / up — the way a lid lies on the print bed.
const FACE = {
  '+X':{n:[1,0,0],  U:[0,1,0]},  '-X':{n:[-1,0,0], U:[0,1,0]},
  '+Y':{n:[0,1,0],  U:[0,0,-1]}, '-Y':{n:[0,-1,0], U:[0,0,1]},
  '+Z':{n:[0,0,1],  U:[0,1,0]},  '-Z':{n:[0,0,-1], U:[0,1,0]},
};
const xcross=(a,b)=>[a[1]*b[2]-a[2]*b[1], a[2]*b[0]-a[0]*b[2], a[0]*b[1]-a[1]*b[0]];
const dot3=(a,b)=>a[0]*b[0]+a[1]*b[1]+a[2]*b[2];
const sub3=(a,b)=>[a[0]-b[0],a[1]-b[1],a[2]-b[2]];
const len3=a=>Math.hypot(a[0],a[1],a[2]);

const MODES = {                       // cube family displaces its own grid; the rest get a plate
  куб:{}, полый:{hollow:true, wallThickness:2.5},
  лист:{sheetShape:'rect'}, крышка:{pbPart:'lid'}, подставка:{psOn:true},
};
function setup(ov){ logos.length=0; boxHoles.length=0; dieFaces.length=0;
  Object.assign(paramState.box, defaultBoxParams(), {width:60,height:60,depth:60,
    pbW:60,pbD:50,pbH:26, sheetThick:5, psW:70,psDepth:70}, ov); }

// Centroid of the material the label PUT PROUD of the unlabelled shape. A set difference against the
// plain build is no good: adding a logo re-tessellates the whole face, so thousands of untouched-but-
// renumbered vertices swamp the mark. Sticking the mark out past the plain silhouette along the face
// normal picks out exactly the emboss, on both the vertex-displacement path and the plate path.
// Returns null where the label was refused, or where it landed on a surface recessed behind the
// silhouette (a plate on a project-box tray) and so never breaks the plane — the caller skips those.
function markCentre(ov, face, hm, rotation){
  const n = FACE[face].n;
  setup(ov);
  const plain = buildTrisForShape('box', paramState.box);
  let hi = -Infinity;
  for(const T of plain) for(const v of T) hi = Math.max(hi, dot3(v, n));
  logos.push({face, u0:0, v0:0, w:26, h:26, rotation:rotation||0, depth:1.6,
              threshold:0.5, invert:false, heightmap:hm});
  const withIt = buildTrisForShape('box', paramState.box);
  let s=[0,0,0], c=0;
  for(const T of withIt) for(const v of T) if(dot3(v, n) > hi + 0.6){ s[0]+=v[0]; s[1]+=v[1]; s[2]+=v[2]; c++; }
  return c>=8 ? [s[0]/c, s[1]/c, s[2]/c] : null;
}
// The image's right and down directions in world space, or null if this shape refuses the label here
// (a plate legitimately declines a face with no flat surface to stand on).
function imageFrame(ov, face, rotation){
  const A=markCentre(ov,face,TL,rotation), B=markCentre(ov,face,TR,rotation), C=markCentre(ov,face,BL,rotation);
  if(!A||!B||!C) return null;
  const right=sub3(B,A), down=sub3(C,A);
  if(len3(right)<2 || len3(down)<2) return null;
  return {right, down};
}
// Signed area of (image-right, image-down) in the on-screen (R, D) basis. Positive = the picture is a
// ROTATION of the artwork; negative = it is a reflection, i.e. mirrored text.
function handedness(fr, face){
  const f=FACE[face], R=xcross(f.U, f.n), D=f.U.map(c=>-c);
  const rx=dot3(fr.right,R)/len3(fr.right), ry=dot3(fr.right,D)/len3(fr.right);
  const dx=dot3(fr.down,R)/len3(fr.down),  dy=dot3(fr.down,D)/len3(fr.down);
  return {det: rx*dy - ry*dx, rx, ry, dx, dy};
}

console.log('=== no face reads the artwork mirrored ===');
let placed=0, refused=0;
for(const [nm,ov] of Object.entries(MODES))
  for(const face of ['+X','-X','+Y','-Y','+Z','-Z']){
    const fr = imageFrame(ov, face);
    if(!fr){ refused++; continue; }
    placed++;
    const h = handedness(fr, face);
    chk(nm+' '+face+': не зеркалится', h.det > 0.5,
        {det:+h.det.toFixed(2), right:[+h.rx.toFixed(2),+h.ry.toFixed(2)], down:[+h.dx.toFixed(2),+h.dy.toFixed(2)]});
  }
// All six faces of the cube family plus both paths have to be in there — the refusals are the honest
// ones (a hollow container has no +Y face, a flat panel has no real sides, a plate declines a surface
// it cannot stand on), so the bar is what the shapes above actually offer, not a round number.
chk('на чём-то метки вообще встали', placed >= 15, {placed, refused});

console.log('=== ...and on EVERY face it reads the right way up ===');
// The top and the bottom were what the report was about: a lid label has to read with the model's
// front edge at the bottom of the picture, not upside down and not back to front. The two SIDES were
// a second defect found while fixing that one — FACE_AXES gives them u = Y, so a label laid out with
// its width along u ran up the side of the box instead of across it. Both are settled by deriving
// each face's map from how that face is looked at, so all six now hold the same claim.
for(const [nm,ov] of Object.entries(MODES))
  for(const face of ['+X','-X','+Y','-Y','+Z','-Z']){
    const fr = imageFrame(ov, face);
    if(!fr) continue;
    const h = handedness(fr, face);
    chk(nm+' '+face+': текст стоит прямо', h.rx > 0.93 && h.dy > 0.93,
        {right:[+h.rx.toFixed(2),+h.ry.toFixed(2)], down:[+h.dx.toFixed(2),+h.dy.toFixed(2)]});
  }

console.log('=== the two sides read alike, and the width runs ACROSS them ===');
{ const a=imageFrame({}, '+X'), b=imageFrame({}, '-X');
  if(a&&b){ const ha=handedness(a,'+X'), hb=handedness(b,'-X');
    chk('+X и −X одинаково ориентированы', Math.abs(ha.rx-hb.rx)<0.08 && Math.abs(ha.ry-hb.ry)<0.08,
        {plus:[+ha.rx.toFixed(2),+ha.ry.toFixed(2)], minus:[+hb.rx.toFixed(2),+hb.ry.toFixed(2)]}); }
  else chk('±X метки встали', false, {}); }
{ // On a turned face the artwork's WIDTH runs along the face's v axis, not its u axis. A wide, short
  // label must therefore come out wide and short on the side of the box — the whole point of the fix.
  setup({});
  logos.push({face:'+X', u0:0, v0:0, w:30, h:8, rotation:0, depth:1.6,
              threshold:0.5, invert:false, heightmap:TL});
  const t = buildTrisForShape('box', paramState.box);
  setup({});
  const plainHi = (()=>{ let m=-Infinity; for(const T of buildTrisForShape('box',paramState.box)) for(const v of T) m=Math.max(m,v[0]); return m; })();
  let dy=0, dz=0;
  { let loY=Infinity,hiY=-Infinity,loZ=Infinity,hiZ=-Infinity;
    for(const T of t) for(const v of T) if(v[0] > plainHi+0.6){
      loY=Math.min(loY,v[1]); hiY=Math.max(hiY,v[1]); loZ=Math.min(loZ,v[2]); hiZ=Math.max(hiZ,v[2]); }
    dy=hiY-loY; dz=hiZ-loZ; }
  chk('на +X ширина 30 идёт поперёк (по Z), а не вверх', dz > dy*1.5, {along_Z:+dz.toFixed(1), along_Y:+dy.toFixed(1)});
  chk('и логотипы очищены для следующей проверки', (logos.length=0)===0, {}); }

console.log('=== rotation turns the text the same way everywhere ===');
// The flip is applied to the face offsets BEFORE the logo's own rotation, so "поворот" is not
// backwards on the faces that needed flipping.
{ const turn=[];
  for(const face of ['+X','-X','+Y','-Y','+Z','-Z']){
    const a=imageFrame({}, face, 0), b=imageFrame({}, face, 90);
    if(!a||!b) continue;
    const h0=handedness(a,face), h9=handedness(b,face);
    // image-right after a 90° turn should sit where image-down was (one consistent sign for all faces)
    turn.push({face, s: Math.sign(h9.rx*h0.dx + h9.ry*h0.dy), m: Math.abs(h9.rx*h0.dx + h9.ry*h0.dy)});
  }
  chk('поворот 90° везде совпал с направлением «вниз» картинки', turn.every(t=>t.m>0.9),
      turn.map(t=>t.face+':'+t.m.toFixed(2)));
  chk('и крутит в одну и ту же сторону на всех гранях',
      turn.length>0 && turn.every(t=>t.s===turn[0].s), turn.map(t=>t.face+':'+t.s)); }

console.log('=== the labels are still watertight where they land ===');
for(const [nm,ov] of Object.entries(MODES))
  for(const face of ['+Y','-Z','-X']){
    setup(ov);
    logos.push({face,u0:0,v0:0,w:26,h:26,rotation:0,depth:-1.0,threshold:0.5,invert:false,heightmap:TL});
    const t=buildTrisForShape('box', paramState.box);
    chk(nm+' '+face+' гравировка watertight', manifoldCheck(t,4).watertight, {});
  }

console.log('\n'+(fail?'FAILED':'ALL PASSED')+': '+pass+' passed, '+fail+' failed');
if(fail) process.exitCode=1;
