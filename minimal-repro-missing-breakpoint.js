// Absolute minimal repro: ONE face, ONE corner, with 2 different inset values, checking
// ONLY that face's own triangulation is internally watertight (ignoring the rest of the box).
const R = { rX: {'1,0':4,'1,1':4,'0,0':4,'0,1':4}, rY:{'0,0':4,'0,1':4,'1,0':4,'1,1':4}, rZ:{'1,1':15,'0,1':4,'1,0':4,'0,0':4} };
const hw=50,hh=30,hd=40;
function edgeSpec(axis, s1, s2) {
  let alongHalf, ownR, cornerAt;
  if (axis==='X') { alongHalf=hw; ownR=R.rX[idx(s1)+','+idx(s2)]; cornerAt=(sx)=>cornerMinR(sx,s1,s2,R); }
  else if (axis==='Y') { alongHalf=hh; ownR=R.rY[idx(s1)+','+idx(s2)]; cornerAt=(sy)=>cornerMinR(s1,sy,s2,R); }
  else { alongHalf=hd; ownR=R.rZ[idx(s1)+','+idx(s2)]; cornerAt=(sz)=>cornerMinR(s1,s2,sz,R); }
  return { ownR, rMinus:cornerAt(-1), rPlus:cornerAt(1) };
}
const xSpecs = [[1,1],[1,-1],[-1,1],[-1,-1]].map(([sy,sz])=>edgeSpec('X',sy,sz));
const zSpecs = [[1,1],[1,-1],[-1,1],[-1,-1]].map(([sx,sy])=>edgeSpec('Z',sx,sy));
const allRadiusValues = [4,4,4,4,4,4,4,4,15,4,4,4];
const resolution = 10;
const xPositions = buildFilletAxisPositions(hw, xSpecs, resolution, allRadiusValues);
const zPositions = buildFilletAxisPositions(hd, zSpecs, resolution, allRadiusValues);
// +Y face only: uAxis=0(X),vAxis=2(Z),nAxis=1,nOffset=hh
const insetU = {plus:R.rZ['1,1'], minus:R.rZ['0,1']}; // 15, 4
const insetV = {plus:R.rX['1,1'], minus:R.rX['1,0']}; // 4, 4
const tris = buildFaceAsymFromAxis(0,2,1,hh, hw,hd, [0,1,0], insetU, insetV, xPositions, zPositions);
console.log('face-only tris:', tris.length);
const mc = manifoldCheck(tris, 3);
console.log('face-only manifold (expect OPEN edges around its own outer perimeter, since we only built ONE face — but should be a clean, single-loop boundary, no internal cracks):', JSON.stringify(mc));

// Print boundary loop length to sanity check
const key = (p) => p[0].toFixed(3)+','+p[1].toFixed(3)+','+p[2].toFixed(3);
const edges = new Map();
for (const tri of tris) {
  const k = [key(tri[0]), key(tri[1]), key(tri[2])];
  for (let e = 0; e < 3; e++) {
    const ka = k[e], kb = k[(e+1)%3];
    if (ka === kb) continue;
    const ek = ka < kb ? ka+'|'+kb : kb+'|'+ka;
    edges.set(ek, (edges.get(ek)||0)+1);
  }
}
let openCount=0, badCount=0;
for (const c of edges.values()) { if (c===1) openCount++; else if (c!==2) badCount++; }
console.log('open (expected, perimeter):', openCount, ' bad (UNEXPECTED, real bug):', badCount);
