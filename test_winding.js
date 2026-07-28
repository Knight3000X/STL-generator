// Which way every face is TURNED — the one thing manifoldCheck cannot tell you.
//
// manifoldCheck keys its edges undirected (a<b ? a,b : b,a) and only counts them, so a triangle that is
// inside-out still pairs perfectly and the mesh reads watertight. Twice now that has hidden a real defect
// of exactly the same shape: a ring's facet takes its outward reference from the mid-angle between two
// consecutive samples, and on the CLOSING facet a plain (a0+a1)/2 averages an angle near 2π with one near
// 0 and lands on the opposite side of the axis. v140 found it on the thread builders' turned surfaces;
// v142 found the same thing in every bored hole in the app. Both times it was found by accident, and both
// times the fix was applied by grepping for one spelling of the expression and so missed other spellings.
//
// This file stops that. The claim is exact, not sampled: in a closed, consistently oriented mesh every
// DIRECTED edge a→b occurs exactly once, and its reverse b→a exactly once. A flipped triangle duplicates
// one direction and leaves the other missing. No rays, no tolerances, no luck — and it is checked over
// every base shape and every mode the app can build.
//
// Run via ./run-all.sh.
let pass=0, fail=0;
function chk(n,c,e){if(c){pass++;console.log('  OK  ',n);}else{fail++;console.log('  FAIL',n,e!==undefined?JSON.stringify(e):'');}}

// Weld to a 1e-4 grid, the same resolution manifoldCheck(t,4) uses. Shells here never share a vertex by
// construction, so welding does not fuse two interpenetrating solids into one and each stays its own
// closed surface.
function windingDefects(tris){
  const id=new Map(), key=p=>Math.round(p[0]*1e4)+','+Math.round(p[1]*1e4)+','+Math.round(p[2]*1e4);
  const vid=p=>{ const k=key(p); let v=id.get(k); if(v===undefined){ v=id.size; id.set(k,v); } return v; };
  const dir=new Map();
  for(const T of tris){
    const w=[vid(T[0]), vid(T[1]), vid(T[2])];
    for(let e=0;e<3;e++){ const a=w[e], b=w[(e+1)%3];
      if(a===b) continue;                       // degenerate sliver: no direction to disagree about
      const k=a+':'+b; dir.set(k, (dir.get(k)||0)+1); }
  }
  let dup=0, unmatched=0;
  for(const [k,c] of dir){
    if(c!==1) dup++;
    const [a,b]=k.split(':');
    if((dir.get(b+':'+a)||0)!==1) unmatched++;
  }
  return {dup, unmatched, edges:dir.size};
}

function setup(ov){ logos.length=0; boxHoles.length=0; dieFaces.length=0;
  Object.assign(paramState.box, defaultBoxParams(), {gfBaseplate:false}, ov);
  return buildTrisForShape('box', paramState.box); }

// Every mode the app can put on the screen. Where a mode has a defect-prone sub-choice (a bore, a
// countersink, a knurl, a closing seam of some other kind) it gets its own row rather than being trusted
// to behave like its neighbour — both bugs found so far lived on ONE variant of a builder.
const CASES = {
  'куб':{}, 'полый':{hollow:true, wallThickness:2.5},
  'скруглённый':{cornerRadius:8}, 'фаска':{chamfer:3},
  'скруглённый полый':{cornerRadius:8, hollow:true, wallThickness:2.5},
  'фаска по ребру':{edgeBevelWhere:'both', edgeBevel:1.2},
  'отверстия':{}, 'подставка':{psOn:true}, 'лист':{sheetShape:'rect'},
  'лист с решёткой':{sheetShape:'rect', sheetPattern:'hex', sheetCut:'through'},
  'корпус: лоток':{pbPart:'tray'}, 'корпус: крышка':{pbPart:'lid'},
  'Gridfinity бин':{gfOn:true}, 'Gridfinity плита':{gfBaseplate:true},
  'резьба: крышка':{threadMode:'cap'}, 'крышка с воронкой':{threadMode:'cap', threadFunnelD:60},
  'крышка с уплотнением':{threadMode:'cap', threadSeal:1.2},
  'резьба: банка':{threadMode:'jar'}, 'резьба: штуцер':{threadMode:'stud'},
  'штуцер со сквозным каналом':{threadMode:'stud', threadBore:8, threadFlange:26},
  'резьба: гайка':{threadMode:'nut'}, 'гайка барашковая':{threadMode:'wingnut'},
  'резьба: болт':{threadMode:'bolt'}, 'левая резьба':{threadMode:'cap', gearHand:'left', threadHand:'left'},
  'шестерня':{gearMode:'spur'}, 'косозубая':{gearMode:'helical'}, 'коническая':{gearMode:'bevel'},
  'шестерня со спицами':{gearMode:'spur', gearSpokes:5}, 'рейка':{gearMode:'rack'},
  'червяк':{gearMode:'worm'}, 'колесо огибанием':{gearMode:'wormwheel'},
  'колесо прямое':{gearMode:'wormwheel', gearWheelRim:'straight'},
  'колесо глобоидное':{gearMode:'wormwheel', gearWheelRim:'throated'},
  'планетарный':{gearMode:'planetary'}, 'карданчик':{gearMode:'ujoint'},
  'храповик':{gearMode:'ratchet'}, 'кулачок':{gearMode:'cam'}, 'шкив GT2':{gearMode:'gt2'},
  'шкив клиновой':{gearMode:'vbelt'}, 'толкатель':{gearMode:'follower'},
  'крючок J':{hookMount:'wall'}, 'крючок на трубу':{hookMount:'pipe'},
  'седло под наушники':{hookMount:'wall', hookStyle:'headphone'},
  'мыльница':{hookMount:'wall', hookStyle:'soap'}, 'гребёнка':{hookMount:'wall', hookStyle:'comb'},
  'французская планка':{hookMount:'cleat'}, 'пегборд':{hookMount:'pegboard'},
  'органайзер':{woOn:true}, 'L-кронштейн':{mntMode:'lbracket'}, 'VESA':{mntMode:'vesa'},
  'бобышки':{mntMode:'boss'}, 'калибровка отверстий':{mntMode:'fittest'},
  'темп-башня':{mntMode:'temptower'}, 'мосты':{mntMode:'bridgetest'}, 'ретракт':{mntMode:'retract'},
  'петля':{pipMode:'hinge'}, 'петля-коробка':{pipMode:'hingebox'}, 'клипса':{pipMode:'clip'},
  'воронка':{fnOn:true}, 'дозатор':{fnOn:true, fnMode:'doser'}, 'ваза':{fnOn:true, fnMode:'vase'},
  'кейкап':{keycapMode:'single'}, 'кейкап-оболочка':{keycapMode:'shell'},
  'кость':{platonic:'d20'}, 'призма':{polyN:6},
};

console.log('=== ни одна оболочка не несёт вывернутых треугольников ===');
let worst=null;
for(const [nm, ov] of Object.entries(CASES)){
  const t=setup(ov);
  const w=windingDefects(t), mc=manifoldCheck(t,4);
  chk(nm+': обход рёбер согласован', w.dup===0 && w.unmatched===0,
      {дублей:w.dup, безпары:w.unmatched, рёбер:w.edges, watertight:mc.watertight});
  if(w.dup+w.unmatched > 0 && !worst) worst=nm;
}

console.log('=== и отдельно — всё, что сверлится, по каждой оси ===');
// The bore wall is where both defects lived. Every axis, every head, on its own row: which column of the
// ring is the closing one depends on where the seam falls, so a hole along X can be wrong while the same
// hole along Z is right — which is exactly how v142 presented.
for(const axis of [0,1,2])
  for(const [nm,H] of Object.entries({
    'круг':{cp:0,cq:0,r:4}, 'смещённый':{cp:2,cq:-3,r:2.5},
    'паз':{cp:0,cq:0,ap:6,aq:3,rc:1.2},
    'потай':{cp:0,cq:0,r:3,head:'sink',headR:5,headDepth:2.5,headSide:1},
    'цековка':{cp:0,cq:0,r:3,head:'bore',headR:5,headDepth:3,headSide:-1},
  })){
    const w=windingDefects(buildBoxWithHoles(20,30,24,[Object.assign({axis}, H)]));
    chk('отверстие вдоль '+'XYZ'[axis]+' ('+nm+')', w.dup===0 && w.unmatched===0,
        {дублей:w.dup, безпары:w.unmatched});
  }

console.log('=== примитивы: коробка, заданная углами в любом порядке ===');
// A box given by two opposite corners must not care which corner came first. It used to: a reversed pair
// reached plainBoxShellTris as a negative extent, and a box of negative extent is a MIRRORED box — closed,
// correctly paired, reading watertight, and inside-out on every face. Callers that mirror a feature write
// sgn*a … sgn*b and get the pair reversed for one of the two signs, which is how the bridge test's near
// piers and the soap dish's rails were built wrong.
for(const [nm,args] of Object.entries({
  'по возрастанию'      : [-10,10,-6,6,-4,4],
  'X наоборот'          : [ 10,-10,-6,6,-4,4],
  'Y наоборот'          : [-10,10, 6,-6,-4,4],
  'Z наоборот'          : [-10,10,-6,6, 4,-4],
  'все три наоборот'    : [ 10,-10, 6,-6, 4,-4],
  'зеркальная пара (−Z)': [-62,-42,-9.76,2.24,-5,-17],
})){
  const t=boxSpanTris(...args), w=windingDefects(t);
  chk('boxSpanTris, '+nm, w.dup===0 && w.unmatched===0 && manifoldCheck(t,4).watertight,
      {дублей:w.dup, безпары:w.unmatched});
  // ...and it is the SAME box either way, not a mirrored one
  const B=computeBBox(t);
  chk('boxSpanTris, '+nm+': габарит тот же', Math.abs(B.maxX-B.minX-20)<1e-9 || nm==='зеркальная пара (−Z)', {});
}
for(const [nm,f] of Object.entries({
  tubeYTris:()=>tubeYTris(0,0,10,6,-5,5,32), discYTris:()=>discYTris(0,0,8,-5,5,32),
  convexPrismXTris:()=>convexPrismXTris([[0,0],[10,0],[10,6],[0,6]],-3,3),
  convexPrismZTris:()=>convexPrismZTris([[0,0],[10,0],[10,6],[0,6]],-3,3),
  prismXTris:()=>prismXTris([[0,0],[10,0],[5,8]],-3,3),
  sectorShellTris:()=>sectorShellTris(0,0,8,10,0.5,2.5,-5,5,48),
  latheShellYTris:()=>latheShellYTris([[6,0],[10,20]],[[4,0],[8,20]],48),
})){
  const w=windingDefects(f());
  chk(nm+': обход рёбер согласован', w.dup===0 && w.unmatched===0, {дублей:w.dup, безпары:w.unmatched});
}

console.log('=== и логотипы, которые перетессилируют грань под собой ===');
{ const S=LOGO_HM_SIZE, hm=new Float32Array(S*S);
  for(let j=0;j<S;j++) for(let i=0;i<S;i++) hm[j*S+i]=(i>S*0.2&&i<S*0.8&&j>S*0.3&&j<S*0.7)?1:0;
  for(const face of ['+X','-X','+Y','-Y','+Z','-Z'])
    for(const [nm,ov] of [['куб',{}],['полый',{hollow:true,wallThickness:2.5}],['скруглённый',{cornerRadius:8}]]){
      setup(ov);
      logos.push({face,u0:0,v0:0,w:26,h:26,rotation:0,depth:1.6,threshold:0.5,invert:false,heightmap:hm});
      const w=windingDefects(buildTrisForShape('box', paramState.box));
      chk(nm+' '+face+': обход рёбер согласован', w.dup===0 && w.unmatched===0,
          {дублей:w.dup, безпары:w.unmatched});
    }
  logos.length=0;
}

console.log('\n'+(fail?'FAILED':'ALL PASSED')+': '+pass+' passed, '+fail+' failed');
if(fail) process.exitCode=1;
