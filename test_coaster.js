// Подстаканник: круг или квадрат, логотип в кармане СНИЗУ, двухцветная печать через AMS.
//
// The part exists to be printed logo-DOWN, and everything here is a consequence of that. A printer's
// smoothest surface is the first layer, so the artwork goes in a pocket in the BOTTOM face; the second
// colour is the set of plugs that fill that pocket. Which makes this the same problem as the keycap's
// shell/core pair and gives it the same governing rule:
//
//   THE TWO PARTS MUST TOUCH AND NEVER SHARE A CUBIC MILLIMETRE.
//
// A slicer handed two overlapping bodies with different filaments prints both, in both colours, in the
// same place. Watertightness has no opinion about that at all — each part can be perfectly closed and the
// pair still unprintable — so the check that matters is a RAY: shoot it up through the pair and demand
// that the interval of body material and the interval of inlay material never intersect. Everything else
// here is measurement of the tool rather than of the mesh: is the pocket the depth it says, does the inlay
// reach the pocket's ceiling and no further, is the visible outer edge a real circle rather than a
// staircase of grid cells, and is the artwork on the bottom rather than the top.
//
// Run via ./run-all.sh (extraction test).
let pass=0, fail=0;
function chk(n,c,e){if(c){pass++;console.log('  OK  ',n);}else{fail++;console.log('  FAIL',n,e!==undefined?JSON.stringify(e):'');}}

const S = LOGO_HM_SIZE;
function img(fn){
  const d = new Uint8ClampedArray(S*S*4);
  for(let y=0;y<S;y++) for(let x=0;x<S;x++){
    const c = fn((x+0.5)/S,(y+0.5)/S), i=(y*S+x)*4;
    d[i]=c[0]; d[i+1]=c[1]; d[i+2]=c[2]; d[i+3]=c[3];
  }
  return d;
}
// A ring with a cross through it: solid areas, thin areas, and a genuine enclosed counter between the
// ring and the cross — the shape a letter «о» has, and the one that would float if the pair had a gap.
const ART = img((x,y)=>{
  const dx=x-0.5, dy=y-0.5, r=Math.hypot(dx,dy);
  if(r > 0.42) return [0,0,0,0];
  if(r > 0.30) return [240,240,240,255];
  if(Math.abs(dx) < 0.05 || Math.abs(dy) < 0.05) return [240,240,240,255];
  return [0,0,0,0];
});
const HM = analyzeLogoImageData(ART, S).heightmap;

function build(ov, withLogo){
  logos.length = 0; boxHoles.length = 0;
  Object.assign(paramState.box, defaultBoxParams(), {csMode:'round', logoResolution:120}, ov||{});
  if(withLogo !== false)
    logos.push({id:1, face:'-Y', u0:0, v0:0, w:40, h:40, depth:-0.8, threshold:0.5,
                invert:false, rotation:0, heightmap:HM, levels:2});
  return buildTrisForShape('box', paramState.box);
}
const bbox = t => { const lo=[1e9,1e9,1e9], hi=[-1e9,-1e9,-1e9];
  for(const T of t) for(const v of T) for(let k=0;k<3;k++){ if(v[k]<lo[k])lo[k]=v[k]; if(v[k]>hi[k])hi[k]=v[k]; }
  return {lo,hi}; };
// Material intervals along a ray straight up Y at (x,z), counted by DEPTH. `solidRuns` fixes the ray on
// axes (ax+1)%3 and (ax+2)%3 IN THAT ORDER, so a ray up Y is addressed as (z, x) — not (x, z).
function solidRuns(tris, ax, p, q){
  const u=(ax+1)%3, v=(ax+2)%3, hits=[];
  for(const T of tris){ const [a,b,c]=T;
    const d1=(b[u]-a[u])*(q-a[v])-(b[v]-a[v])*(p-a[u]);
    const d2=(c[u]-b[u])*(q-b[v])-(c[v]-b[v])*(p-b[u]);
    const d3=(a[u]-c[u])*(q-c[v])-(a[v]-c[v])*(p-c[u]);
    if(!((d1>=0&&d2>=0&&d3>=0)||(d1<=0&&d2<=0&&d3<=0))) continue;
    const A=(b[u]-a[u])*(c[v]-a[v])-(b[v]-a[v])*(c[u]-a[u]); if(Math.abs(A)<1e-12) continue;
    const w1=((b[u]-p)*(c[v]-q)-(b[v]-q)*(c[u]-p))/A, w2=((c[u]-p)*(a[v]-q)-(c[v]-q)*(a[u]-p))/A;
    const e1=[b[0]-a[0],b[1]-a[1],b[2]-a[2]], e2=[c[0]-a[0],c[1]-a[1],c[2]-a[2]];
    const nrm=[e1[1]*e2[2]-e1[2]*e2[1], e1[2]*e2[0]-e1[0]*e2[2], e1[0]*e2[1]-e1[1]*e2[0]];
    if(Math.abs(nrm[ax])<1e-12) continue;
    hits.push([w1*a[ax]+w2*b[ax]+(1-w1-w2)*c[ax], nrm[ax]<0 ? 1 : -1]);
  }
  hits.sort((A,B)=>A[0]-B[0]);
  const runs=[]; let depth=0, start=null;
  for(const [t0,d] of hits){ const prev=depth; depth+=d;
    if(prev<=0 && depth>0) start=t0;
    else if(prev>0 && depth<=0){ if(start!==null && t0-start > 1e-6) runs.push([start,t0]); start=null; } }
  return runs;
}
const upY = (tris, x, z) => solidRuns(tris, 1, z, x);
const overlap = (A, B) => {   // total length the two sets of intervals share
  let s = 0;
  for(const a of A) for(const b of B) s += Math.max(0, Math.min(a[1],b[1]) - Math.max(a[0],b[0]));
  return s;
};
const covers = (runs, y) => runs.some(r => y > r[0]+1e-9 && y < r[1]-1e-9);

console.log('=== замкнутость: каждая деталь закрыта сама по себе ===');
{
  let bad = [], n = 0;
  for(const csMode of ['round','square'])
    for(const csPart of ['body','ink1'])
      for(const csRim of [0, 2, 5])
        for(const csD of [55, 90, 180])
          for(const csT of [3, 6, 12]){
            const m = manifoldCheck(build({csMode, csPart, csRim, csD, csT}), 4); n++;
            if(!m.watertight) bad.push({csMode, csPart, csRim, csD, csT, open:m.openEdges, bad:m.badEdges});
          }
  chk('все '+n+' сочетаний герметичны', bad.length === 0, bad.slice(0,4));

  // ...including the cases with no artwork at all, where there is no pocket and no grid
  let bareBad = [];
  for(const csMode of ['round','square']) for(const csRim of [0,2]){
    const m = manifoldCheck(build({csMode, csRim}, false), 4);
    if(!m.watertight) bareBad.push({csMode, csRim, open:m.openEdges});
  }
  chk('без логотипа тоже', bareBad.length === 0, bareBad);
  chk('и без логотипа вставки просто нет', build({csPart:'ink1'}, false).length === 0);
}

console.log('=== главное: два филамента не делят объём ===');
{
  const A = build({csPart:'body'}), B = build({csPart:'ink1'});
  const g = coasterSpec(paramState.box);
  let shared = 0, probed = 0, inlayFound = 0, bodyOverInlay = 0;
  for(let x=-20; x<=20; x+=1.3) for(let z=-20; z<=20; z+=1.3){
    const a = upY(A, x, z), b = upY(B, x, z);
    probed++;
    shared += overlap(a, b);
    if(b.length){
      inlayFound++;
      // where there IS a plug, the body must be absent below the pocket ceiling and present above it
      if(covers(a, g.inlay*0.5)) bodyOverInlay++;
    }
  }
  chk('лучей с материалом вставки хватает для вывода', inlayFound > 150, inlayFound);
  chk('общий объём двух филаментов — ноль', shared < 1e-6, shared);
  chk('под пробкой у корпуса пусто', bodyOverInlay === 0, bodyOverInlay);

  // The pair must also TOUCH — a gap is what makes an enclosed counter float away in mid-print.
  let gaps = 0, met = 0;
  for(let x=-20; x<=20; x+=1.3) for(let z=-20; z<=20; z+=1.3){
    const b = upY(B, x, z); if(!b.length) continue;
    const top = Math.max(...b.map(r=>r[1]));
    if(Math.abs(top - g.inlay) > 1e-6) gaps++;
    if(covers(upY(A, x, z), g.inlay + 0.2)) met++;      // body starts right where the plug ends
  }
  chk('пробка ровно по глубину кармана', gaps === 0, gaps);
  chk('и корпус стоит прямо на ней, без зазора', met > 150, met);
  chk('зазора нет намеренно — иначе замкнутый контур буквы повис бы', g.inlay > 0);
}

console.log('=== карман — снизу, а не сверху: ради этого всё и затеяно ===');
{
  const A = build({csPart:'body', csRim:0});
  const g = coasterSpec(paramState.box);
  const bb = bbox(A);
  chk('деталь стоит на нуле', Math.abs(bb.lo[1]) < 1e-9, bb.lo[1]);
  // A point inside the artwork and a point in the field beside it: the first is hollow at the bottom,
  // the second is not. If the pocket were on TOP these two would be identical down here.
  const hole = [0, 0], field = [0, 17.5];     // centre of the cross; just outside the ring
  const rh = upY(A, hole[0], hole[1]), rf = upY(A, field[0], field[1]);
  chk('в рисунке снизу пусто', !covers(rh, g.inlay*0.5), rh);
  chk('рядом с рисунком снизу материал', covers(rf, g.inlay*0.5), rf);
  chk('а сверху материал везде', covers(rh, g.t-0.3) && covers(rf, g.t-0.3), [rh, rf]);
  chk('глубина кармана — ровно заявленная',
      Math.abs(Math.min(...rh.map(r=>r[0])) - g.inlay) < 1e-6, rh);
}

console.log('=== логотип лежит той же стороной, что и на любой другой детали ===');
{
  // «Читается снизу, значит зеркально» — рассуждение, которое звучит убедительно и ошибается дважды.
  // How artwork lands on the −Y face is already decided once, by LOGO_FACE_MAP and the sampling in
  // buildLogoPlateTris, and the coaster has no business having a second opinion: the same logo card on
  // the same face must land the same way round whichever base shape is picked. Measured with an
  // ASYMMETRIC mark, because a ring and a cross look identical in a mirror and prove nothing.
  const mark = img((x,y)=> (x > 0.60 && x < 0.85 && y > 0.15 && y < 0.40) ? [240,240,240,255] : [0,0,0,0]);
  const mhm = analyzeLogoImageData(mark, S).heightmap;
  const card = {id:1, face:'-Y', u0:0, v0:0, w:40, h:40, depth:-0.8, threshold:0.5,
                invert:false, rotation:0, heightmap:mhm, levels:2};

  logos.length = 0; boxHoles.length = 0;
  Object.assign(paramState.box, defaultBoxParams(), {csMode:'round', csRim:0, logoResolution:120});
  logos.push(card);
  const A = buildTrisForShape('box', paramState.box);
  const g = coasterSpec(paramState.box);
  // Where the pocket is: the centroid of the (x,z) points whose bottom is hollow.
  let sx=0, sz=0, n=0;
  for(let x=-19; x<=19; x+=0.7) for(let z=-19; z<=19; z+=0.7)
    if(!covers(upY(A, x, z), g.inlay*0.5)){ sx+=x; sz+=z; n++; }
  chk('карман нашёлся', n > 30, n);
  const cx = sx/n, cz = sz/n;

  // The same card, laid on the −Y face of a plain host by the machinery every other base shape uses.
  const host = [[[-50,0,-50],[50,0,-50],[50,0,50]], [[-50,0,-50],[50,0,50],[-50,0,50]],
                [[-50,10,-50],[50,10,-50],[50,10,50]], [[-50,10,-50],[50,10,50],[-50,10,50]]];
  const plate = buildLogoPlateTris(Object.assign({}, card, {depth:0.8}),
                                   {lo:[-50,0,-50], hi:[50,10,50]}, 0, 120, host);
  chk('плита с тем же логотипом построилась', plate.length > 0, plate.length);
  let px=0, pz=0, pn=0;
  for(const T of plate) for(const v of T) if(v[1] < -0.3){ px+=v[0]; pz+=v[2]; pn++; }   // the raised glyph
  chk('и у неё есть рельеф', pn > 0, pn);

  // Both centroids are measured in the same world axes, so they must agree in SIGN on both axes. A
  // mirrored read flips one of them and this is the check that says so.
  chk('карман в том же квадранте по X, что и обычный рельеф',
      Math.sign(cx) === Math.sign(px/pn) && Math.abs(cx) > 2, {подстаканник:+cx.toFixed(2), плита:+(px/pn).toFixed(2)});
  chk('и по Z',
      Math.sign(cz) === Math.sign(pz/pn) && Math.abs(cz) > 2, {подстаканник:+cz.toFixed(2), плита:+(pz/pn).toFixed(2)});
}

console.log('=== кромка круглая, а не лесенкой из ячеек ===');
{
  // The outer edge is the part a person looks at, so it must come from the outline polygon and not from
  // the logo's cell grid. Measured as the spread of the radius around the rim: a rasterised circle at 120
  // cells over 90 mm would wobble by most of a cell (0.75 mm); a real one wobbles by the chord of its own
  // segments, which is far less.
  // The measure is the SILHOUETTE of the bottom face — the side that is looked at. Its interior is
  // triangulated around the logo window and those vertices sit at every radius, so what is measured is
  // the OUTER ring of vertices, plus the demand that they go all the way round: a rasterised circle would
  // put its rim vertices at a spread of radii, and a partial arc would pass a spread test by saying
  // nothing about most of the edge.
  const A = build({csPart:'body', csMode:'round', csD:90});
  const rimPts = [];
  for(const T of A) for(const v of T){
    if(v[1] > 0.05) continue;                       // the bottom face only — where the grid lives
    const r = Math.hypot(v[0], v[2]);
    if(r > 44) rimPts.push([r, Math.atan2(v[2], v[0])]);
  }
  const rmin = Math.min(...rimPts.map(q=>q[0])), rmax = Math.max(...rimPts.map(q=>q[0]));
  chk('кромка — окружность, а не лесенка', rmax - rmin < 1e-6,
      {rmin:+rmin.toFixed(6), rmax:+rmax.toFixed(6), вершин:rimPts.length});
  chk('и это заявленный радиус', Math.abs(rmax - 45) < 1e-9, rmax);
  // ...all the way round: the biggest angular gap between neighbouring rim vertices is one segment.
  const angs = rimPts.map(q=>q[1]).sort((a,b)=>a-b);
  let gap = angs[0] + 2*Math.PI - angs[angs.length-1];
  for(let i=1;i<angs.length;i++) gap = Math.max(gap, angs[i]-angs[i-1]);
  const seg = coasterSpec(paramState.box).seg;
  chk('и она замкнута кругом', gap < 2*Math.PI/seg + 1e-9, {зазор:+gap.toFixed(5), шаг:+(2*Math.PI/seg).toFixed(5)});
  // The number this beats: rasterising the outline on the logo grid would wobble by most of a cell.
  chk('растеризация дала бы разброс в пол-ячейки',
      (2*(coasterSpec(paramState.box).winHalf + 0.5) / 120) > 0.3,
      +(2*(coasterSpec(paramState.box).winHalf+0.5)/120).toFixed(3));

  const Q = build({csPart:'body', csMode:'square', csD:80, csCorner:12});
  const bq = bbox(Q);
  chk('квадрат — квадратный', Math.abs(bq.hi[0]-40) < 1e-6 && Math.abs(bq.hi[2]-40) < 1e-6, bq.hi);
  // ...with the corners actually cut: a sharp 40×40 corner would be 56.57 from the centre
  let far = 0; for(const T of Q) for(const v of T) far = Math.max(far, Math.hypot(v[0], v[2]));
  chk('углы скруглены', far < Math.hypot(40,40) - 2, far);
  chk('и на радиус, который просили', Math.abs(far - (Math.hypot(28,28) + 12)) < 0.3, far);
}

console.log('=== борт, размеры и зажимы ===');
{
  const g = coasterSpec({csMode:'round', csD:90, csT:6, csRim:2, csRimW:4});
  chk('борт поднимается над серединой', g.t - g.topFlat === 2, [g.t, g.topFlat]);
  const A = build({csPart:'body', csRim:2, csRimW:4, csT:6});
  chk('в середине высота меньше', Math.abs(Math.max(...upY(A,0,17.5).map(r=>r[1])) - 4) < 1e-6, upY(A,0,17.5));
  chk('у кромки — полная', Math.abs(Math.max(...upY(A,0,43).map(r=>r[1])) - 6) < 1e-6, upY(A,0,43));
  const flat = build({csPart:'body', csRim:0, csT:6});
  chk('без борта верх ровный',
      Math.abs(Math.max(...upY(flat,0,17.5).map(r=>r[1])) - 6) < 1e-6, upY(flat,0,17.5));

  // Clamps, stated as what they protect rather than as numbers copied from the code.
  chk('карман не съедает всю толщину', coasterSpec({csT:2, csInlay:3}).inlay <= 1, coasterSpec({csT:2, csInlay:3}).inlay);
  chk('борт оставляет место карману',
      (()=>{ const q=coasterSpec({csT:3, csRim:8, csInlay:0.8}); return q.rim + q.inlay < q.t; })(),
      coasterSpec({csT:3, csRim:8, csInlay:0.8}));
  chk('борт не шире половины радиуса',
      coasterSpec({csD:40, csRimW:20}).rimW <= 8, coasterSpec({csD:40, csRimW:20}).rimW);
  chk('окно под рисунок лежит внутри контура',
      (()=>{ for(const csD of [40,90,220]) for(const csMode of ['round','square']){
               const q=coasterSpec({csD, csMode}); if(!(q.artHalf < q.half - 1)) return false; } return true; })());
  chk('у круга окно вписано с запасом',
      (()=>{ const q=coasterSpec({csD:90}); return Math.hypot(q.winHalf,q.winHalf) < q.half; })(),
      coasterSpec({csD:90}));
  chk('мусор на входе не роняет', !!coasterSpec({csD:'', csT:null, csRim:NaN, csInlay:undefined}).size);
  chk('и даёт годную деталь', manifoldCheck(build({csD:'', csT:null, csRim:NaN}), 4).watertight);
}

console.log('=== модель зарегистрирована везде, где это нужно ===');
{
  const p = Object.assign({}, defaultBoxParams(), {csMode:'round'});
  chk('это своя базовая форма', dominantMode(p) === 'coaster', dominantMode(p));
  chk('«нет» возвращает куб', dominantMode(Object.assign({}, defaultBoxParams())) === 'box');
  chk('её группа показывается', sectionRelevant('Подстаканник', 'coaster', false));
  chk('и только ей', !sectionRelevant('Подстаканник', 'box', false) && !sectionRelevant('Подстаканник', 'stand', false));
  chk('чужие группы при ней скрыты',
      !sectionRelevant('Подставка (телефон / планшет)', 'coaster', false) &&
      !sectionRelevant('Воронка', 'coaster', false));
  chk('логотипы при ней доступны — они и делают карман',
      sectionRelevant('Логотипы (рельеф на гранях)', 'coaster', false));
  chk('поиск знает, какой она формы', GROUP_KIND['Подстаканник'] === 'coaster');
  chk('и как её зовут', !!KIND_LABEL.coaster);
  // Every row of the group has to be reachable, or a working control is hidden and nothing says so.
  const rows = SHAPE_PARAMS.box.filter(r => r.group === 'Подстаканник');
  chk('группа не пуста', rows.length >= 6, rows.length);
  for(const r of rows){
    const st = Object.assign({}, defaultBoxParams(), {csMode:'square', csRim:2});
    // Строка со своим `only` живёт под собственным выключателем — её проверяет он, а не эта перепись:
    // «ширина кольца» без включённого кольца обязана быть скрыта, иначе получится холостой ход.
    chk('строка «'+r.key+'» видна на своей подмодели', paramRowRelevant(r, st) || !!r.only, r.key);
  }
  chk('радиус углов не предлагается кругу',
      !paramRowRelevant(rows.find(r=>r.key==='csCorner'), Object.assign({}, defaultBoxParams(), {csMode:'round'})));
  chk('ширина борта прячется при нулевом борте',
      !paramRowRelevant(rows.find(r=>r.key==='csRimW'),
                        Object.assign({}, defaultBoxParams(), {csMode:'round', csRim:0})));
}

console.log('=== пара AMS: вторая модель существует и это именно вставка ===');
{
  logos.length = 0;
  logos.push({id:1, face:'-Y', u0:0, v0:0, w:40, h:40, depth:-0.8, threshold:0.5,
              invert:false, rotation:0, heightmap:HM, levels:2});
  const body = Object.assign({}, defaultBoxParams(), {csMode:'round'});
  const rec = assemblyMate(body);
  chk('у подстаканника есть пара', !!rec, rec);
  chk('пара — первый цвет', !!rec && rec.over.csPart === 'ink1', rec && rec.over);
  chk('и она несёт логотип с собой', !!rec && rec.logos === true, rec && rec.logos);
  const back = assemblyMate(Object.assign({}, defaultBoxParams(), {csMode:'round', csPart:'ink1'}));
  chk('от последнего цвета есть путь обратно', !!back && back.over.csPart === 'body', back && back.over);
  chk('и обратно тоже с логотипом', !!back && back.logos === true);
  chk('пара садится в то же место',
      !!rec && JSON.stringify(rec.seat({},{},{px:3,py:4,pz:5})) === JSON.stringify({px:3,py:4,pz:5}));

  // The second filament must be the plugs and NOTHING else: an inlay that quietly carried a coaster body
  // would print a whole second coaster in the accent colour.
  const A = build({csPart:'body'}), B = build({csPart:'ink1'});
  const bA = bbox(A), bB = bbox(B);
  chk('вставка тонкая', bB.hi[1] - bB.lo[1] < 1.01, bB.hi[1]-bB.lo[1]);
  chk('и мельче подстаканника по площади', (bB.hi[0]-bB.lo[0]) < (bA.hi[0]-bA.lo[0])*0.6,
      [bB.hi[0]-bB.lo[0], bA.hi[0]-bA.lo[0]]);
  chk('вставка не выходит за окно', bB.hi[0] <= coasterSpec(paramState.box).winHalf + 1e-6, bB.hi[0]);
}

console.log('=== цветов столько, сколько тонов в логотипе ===');
{
  // Two was never a property of the coaster — it was a property of a relief cut at ONE threshold. A real
  // emblem is painted in three or four flat colours, and each of them can have its own part and its own
  // filament. They all sit in the SAME pocket at the SAME depth: on a part printed face-down the colours
  // tile a plane, they are not stacked by height.
  const shield = img((x,y)=>{
    const dx=Math.abs(x-0.5), dy=y-0.5;
    if(dx > 0.45 || dy < -0.45 || dy > 0.45) return [0,0,0,0];
    if(dx > 0.36 || dy > 0.36) return [192,32,48,255];
    if(dx > 0.30 || dy > 0.30) return [16,16,16,255];
    return [48,48,48,255];
  });
  const an = analyzeLogoImageData(shield, S, 'auto', 3);
  const card = {id:1, face:'-Y', u0:0, v0:0, w:40, h:40, depth:-0.6, threshold:0.5,
                invert:false, rotation:0, heightmap:an.heightmap, levels:3, chan:an.stats.chose};
  const mk = (csPart) => { logos.length = 0; boxHoles.length = 0;
    Object.assign(paramState.box, defaultBoxParams(), {csMode:'round', csPart, logoResolution:140});
    logos.push(card); return buildTrisForShape('box', paramState.box); };

  chk('трёхтоновый логотип даёт три краски', coasterInks(card).levels.length === 3,
      coasterInks(card).levels);
  chk('и фон остаётся цветом самого подстаканника', coasterInks(card).bg === true);
  // A binary logo still asks for exactly one accent — the old behaviour, unchanged.
  chk('двоичный логотип — одна краска',
      coasterInks({heightmap:HM, levels:2, chan:'alpha'}).levels.length === 1);
  // ...and a picture with NO transparency has no background to leave alone, so its darkest tone is a
  // colour like any other. Nothing in the numbers can tell those two apart, which is why `chan` is carried.
  const noAlpha = analyzeLogoImageData(img((x,y)=> y<0.33?[20,20,20,255]:y<0.66?[128,128,128,255]:[240,240,240,255]),
                                       S, 'lum', 3);
  chk('без прозрачности тёмный тон — тоже краска',
      coasterInks({heightmap:noAlpha.heightmap, levels:3, chan:'lum'}).levels.length === 3,
      coasterInks({heightmap:noAlpha.heightmap, levels:3, chan:'lum'}).levels);
  chk('и фон там не заявляется', coasterInks({heightmap:noAlpha.heightmap, levels:3, chan:'lum'}).bg === false);

  const parts = {}; let holes = [];
  for(const q of ['body','ink1','ink2','ink3']){
    parts[q] = mk(q);
    const m = manifoldCheck(parts[q], 4);
    if(!m.watertight) holes.push({q, open:m.openEdges, bad:m.badEdges});
  }
  chk('все четыре детали герметичны', holes.length === 0, holes);
  for(const q of ['ink1','ink2','ink3']) chk(q+' не пуст', parts[q].length > 200, parts[q].length);
  chk('несуществующий цвет — пустая деталь', mk('ink5').length === 0);

  // The claim that matters, now over every PAIR: no two filaments may share a cubic millimetre.
  const names = ['body','ink1','ink2','ink3'];
  let worst = 0, seen = {};
  for(let x=-20; x<=20; x+=1.1) for(let z=-20; z<=20; z+=1.1){
    const runs = names.map(nm => upY(parts[nm], x, z));
    for(let a=0;a<names.length;a++){
      if(runs[a].length) seen[names[a]] = (seen[names[a]]||0) + 1;
      for(let b=a+1;b<names.length;b++) worst = Math.max(worst, overlap(runs[a], runs[b]));
    }
  }
  chk('каждый цвет где-то есть', names.every(nm => (seen[nm]||0) > 40), seen);
  chk('ни одна пара деталей не делит объём', worst < 1e-6, worst);
  // ...and every accent sits at the same depth, flush with the coaster's bottom
  for(const q of ['ink1','ink2','ink3']){
    const bb = bbox(parts[q]);
    chk(q+' лежит в том же кармане', Math.abs(bb.lo[1]) < 1e-9 &&
        Math.abs(bb.hi[1] - coasterSpec(paramState.box).inlay) < 1e-6, [bb.lo[1], bb.hi[1]]);
  }

  // The chain: body → цвет 1 → цвет 2 → цвет 3 → back to the body. Walking it must reach every part
  // exactly once, or a colour is unreachable from the panel and the model is a lie.
  logos.length = 0; logos.push(card);
  const walk = [], seenParts = new Set();
  let cur = 'body';
  for(let i=0;i<10;i++){
    const m = assemblyMate(Object.assign({}, defaultBoxParams(), {csMode:'round', csPart:cur}));
    if(!m) break;
    cur = m.over.csPart; if(seenParts.has(cur)) break;
    seenParts.add(cur); walk.push({name:m.name, to:cur});
  }
  chk('цепочка обходит все цвета и возвращается',
      walk.map(w=>w.to).join() === 'ink1,ink2,ink3,body', walk.map(w=>w.to));
  chk('и у каждого звена человеческое имя',
      walk.every(w => w.name && w.name.length > 5), walk.map(w=>w.name));
  chk('имя называет номер цвета', walk[1].name.indexOf('2') >= 0, walk[1].name);
  logos.length = 0;
}

console.log('=== плотность кармана задана в миллиметрах, а не числом ячеек ===');
{
  // The pocket's edges are the whole point of the part, and the thing that limits them is the NOZZLE.
  // «Детализация логотипов» used to be read here as a cell COUNT across the window, and it defaults to
  // 50: on a 90 mm coaster that is a 1.17 mm cell — a staircase you can see across the room. The same 50
  // is 0.8 mm on a 40 mm cube, so one number cannot mean both «cells across a face» and «edge quality».
  /* Логотип обязателен: карман существует только под ним, а с v17.6.0 окно ещё и растёт вслед за его
     размером — спрашивать густоту у спецификации без рисунка значит спрашивать про карман, которого
     нет. Логотип берётся во всю деталь, чтобы окно упёрлось в её собственный предел и размеры окна
     сравнивались между диаметрами честно. */
  const cell = (csD, res) => {
    logos.length = 0;
    logos.push({id:1, face:'+Z', u0:0, v0:0, w:csD, h:csD, depth:-0.6, threshold:0.5,
                invert:false, rotation:0, heightmap:HM, levels:2});
    Object.assign(paramState.box, defaultBoxParams(), {csMode:'round', csD});
    const g = coasterSpec(paramState.box);
    return 2*(g.winHalf + 0.5) / coasterGridN(g, res); };

  for(const csD of [45, 90, 140])
    chk('Ø'+csD+' при умолчании слайдера: ячейка около 0.35 мм',
        Math.abs(cell(csD, 50) - 0.35) < 0.03, +cell(csD, 50).toFixed(3));
  chk('это втрое мельче прежнего (окно / 50)',
      cell(90, 50) < (2*(coasterSpec({csMode:'round', csD:90}).winHalf + 0.5) / 50) / 3,
      {теперь:+cell(90,50).toFixed(3), было:+(2*(coasterSpec({csMode:'round',csD:90}).winHalf+0.5)/50).toFixed(3)});
  chk('и мельче сопла 0.4', cell(90, 50) < 0.4, +cell(90,50).toFixed(3));

  // The slider is a QUALITY MULTIPLIER now: raising it makes the cell finer, it does not set the count.
  chk('слайдер выше — ячейка мельче', cell(90, 160) < cell(90, 50), [cell(90,50), cell(90,160)]);
  chk('слайдер ниже — крупнее', cell(90, 20) > cell(90, 50), [cell(90,20), cell(90,50)]);
  // The ceiling is a real number, not a shrug: past it the set runs into the high hundreds of thousands of
  // triangles and the preview stops being live. It is named once, in the source, and read here.
  chk('но не бесконечно: есть потолок по числу ячеек',
      coasterGridN(coasterSpec({csMode:'round', csD:90}), 5000) <= COASTER_MAX_CELLS,
      coasterGridN(coasterSpec({csMode:'round', csD:90}), 5000));
  /* Потолок меряется на РИСУНКЕ ВО ВСЮ ДЕТАЛЬ: окно теперь растёт под рисунок, и на маленьком логотипе
     потолок недостижим вовсе — не потому, что его нет, а потому, что карман мал. */
  const bigSpec = (() => { logos.length = 0;
    Object.assign(paramState.box, defaultBoxParams(), {csMode:'round', csD:90});
    logos.push({id:1, face:'+Z', u0:0, v0:0, w:76, h:76, depth:-0.6, threshold:0.5,
                invert:false, rotation:0, heightmap:HM, levels:2});
    return coasterSpec(paramState.box); })();
  /* На УМОЛЧАНИИ слайдера запас есть даже у рисунка во всю деталь — это и проверяется. Выше по
     слайдеру потолок берётся, и так и задумано: он на то и потолок. Раньше сюда ставили 100, но окно
     тогда было втрое меньше и до потолка оттуда было далеко. */
  chk('и на умолчании слайдера до потолка есть запас',
      coasterGridN(bigSpec, 50) < COASTER_MAX_CELLS, coasterGridN(bigSpec, 50));
  chk('и пол, чтобы мелкий подстаканник не стал плоским пятном',
      coasterGridN(coasterSpec({csMode:'round', csD:40}), 1) >= 48,
      coasterGridN(coasterSpec({csMode:'round', csD:40}), 1));
  chk('мусор вместо слайдера не роняет',
      coasterGridN(coasterSpec({csMode:'round', csD:90}), undefined) > 48 &&
      coasterGridN(coasterSpec({csMode:'round', csD:90}), NaN) > 48);

  // Bigger coaster, more cells — the cell size is what stays put, not the count.
  chk('на большем подстаканнике ячеек больше',
      coasterGridN(coasterSpec({csMode:'round', csD:140}), 50) >
      coasterGridN(coasterSpec({csMode:'round', csD:55}), 50));

  // ...and all of the above is about a helper. What ships is the MESH, so the cell is measured off it.
  // Checking the helper alone let the build quietly go on using the old number — the first mutation I
  // tried (call site reverted, helper untouched) passed every check above.
  //
  // The measure has to look at the LATTICE, and the lattice is no longer every x in the mesh: the
  // mosaic's vertices are slid onto the artwork's own boundary (mosaicWarp), so a vertex near an edge
  // sits anywhere within half a cell of it. A vertex away from any boundary does not move at all, and a
  // whole column of them shares one x — so an x that occurs MANY times is a lattice line, and one that
  // occurs a handful of times is a slid vertex. The cell is the commonest gap between lattice lines.
  // …measured on a SOLID disc rather than on the ring-and-cross above: a shape that is mostly boundary
  // has few unwarped vertices to read the lattice off, and the artwork is not what is under test here.
  const SOLID = analyzeLogoImageData(img((x,y)=>Math.hypot(x-0.5,y-0.5) < 0.4 ? [240,240,240,255] : [0,0,0,0]), S).heightmap;
  const meshCell = (csD) => {
    logos.length = 0; boxHoles.length = 0;
    Object.assign(paramState.box, defaultBoxParams(), {csMode:'round', logoResolution:120, csD, csPart:'ink1'});
    logos.push({id:1, face:'-Y', u0:0, v0:0, w:40, h:40, depth:-0.8, threshold:0.5,
                invert:false, rotation:0, heightmap:SOLID, levels:2});
    const t = buildTrisForShape('box', paramState.box);
    const seen = new Map();
    for(const T of t) for(const v of T){ const x = +v[0].toFixed(4); seen.set(x, (seen.get(x)||0)+1); }
    // A lattice line carries a whole column of unwarped vertices and turns up over a thousand times; a
    // slid vertex turns up a handful. The cut is relative, so it does not depend on the grid's size.
    const top = Math.max(...[...seen.values()]);
    const lattice = [...seen].filter(([,n]) => n >= top*0.25).map(([x]) => x).sort((a,b)=>a-b);
    const tally = new Map();
    for(let i=1;i<lattice.length;i++){ const d = +(lattice[i]-lattice[i-1]).toFixed(3);
      if(d > 1e-3) tally.set(d, (tally.get(d)||0)+1); }
    let best = 0, bestN = 0;
    for(const [d,n] of tally) if(n > bestN){ bestN = n; best = d; }
    return best;
  };
  const mc = meshCell(90);
  chk('в построенном меше шаг сетки тоже около 0.35 мм', Math.abs(mc - 0.35) < 0.03, +mc.toFixed(4));
  // Допуск в две тысячных, а не в одну: измеренный шаг берётся из решётки координат, округлённой до
  // тысячных (toFixed(3) выше), так что сам по себе он несёт ошибку в половину этой тысячной.
  chk('и он совпадает с тем, что обещает coasterGridN',
      Math.abs(mc - cell(90, 50)) < 2e-3, {меш:+mc.toFixed(4), помощник:+cell(90,50).toFixed(4)});
  chk('на меньшем подстаканнике шаг тот же, а не мельче',
      Math.abs(meshCell(55) - mc) < 0.03, +meshCell(55).toFixed(4));

  // The big sizes are where a spread argument list overflows the stack — `push(...arr)` passes every
  // triangle as an argument, and the field slab of a 220 mm coaster is tens of thousands of them. It
  // crashed here before, on exactly the size someone would try after liking a small one.
  for(const csD of [180, 220]){
    let threw = false, t = [];
    try { t = build({csD, csPart:'body'}); } catch(e){ threw = true; }
    chk('Ø'+csD+' строится, а не роняет стек', !threw && t.length > 1000, threw ? 'исключение' : t.length);
    chk('Ø'+csD+' герметичен', !threw && manifoldCheck(t, 4).watertight);
  }
}

console.log('=== цвет каждой детали берётся из самой картинки ===');
{
  // The relief only ever carried a HEIGHT, so a three-tone emblem arrived as three identical grey discs
  // and remembering which was which was the person's problem. The picture already knows: each level's
  // colour is the mean of the pixels that landed on it.
  const shield = img((x,y)=>{
    const dx=Math.abs(x-0.5), dy=y-0.5;
    if(dx > 0.45 || dy < -0.45 || dy > 0.45) return [0,0,0,0];
    if(dx > 0.36 || dy > 0.36) return [200,30,40,255];    // красный
    if(dx > 0.30 || dy > 0.30) return [20,20,20,255];     // почти чёрный
    return [60,60,60,255];                                // серый
  });
  const an = analyzeLogoImageData(shield, S, 'auto', 3);
  chk('цвета тонов сосчитаны', Array.isArray(an.toneColors) && an.toneColors.length === 3, an.toneColors);
  const near = (hex, r,g,b) => { const n = parseInt(hex.slice(1),16);
    return Math.abs((n>>16&255)-r) < 12 && Math.abs((n>>8&255)-g) < 12 && Math.abs((n&255)-b) < 12; };
  chk('самый тёмный тон — почти чёрный', near(an.toneColors[0], 20,20,20), an.toneColors[0]);
  chk('средний — серый', near(an.toneColors[1], 60,60,60), an.toneColors[1]);
  chk('светлый — красный, а не серый', near(an.toneColors[2], 200,30,40), an.toneColors[2]);
  chk('и это НЕ оттенки серого', an.toneColors[2] !== an.toneColors[1], an.toneColors);

  const card = {id:1, face:'-Y', u0:0, v0:0, w:40, h:40, depth:-0.6, threshold:0.5,
                invert:false, rotation:0, heightmap:an.heightmap, levels:3,
                chan:an.stats.chose, tones:an.toneColors};
  const ink = coasterInks(card);
  // The alignment is the whole trick and it is off by one if you look away: `tones` is indexed by TONE,
  // while the distinct heights include the BACKGROUND when the picture has transparency. Drop the
  // background first, then take colours by position in what is left. Done the other way round, every
  // part wears its neighbour's colour and the last one falls off the end into the fallback grey — which
  // is exactly what the first version of this did.
  chk('цветов столько же, сколько красок', ink.colors.length === ink.levels.length, [ink.colors, ink.levels]);
  chk('фон не съел первый цвет', ink.colors[0] === an.toneColors[0], [ink.colors[0], an.toneColors[0]]);
  chk('и последний не свалился в запасной серый', ink.colors[2] === an.toneColors[2], ink.colors);
  chk('запасного цвета вообще нет в списке', !ink.colors.includes('#b9c5cd'), ink.colors);

  // ...and it reaches the model that gets added, which is the only place it does any good
  logos.length = 0; logos.push(card);
  const walk = [];
  let cur = 'body';
  for(let i=0;i<6;i++){
    const m = assemblyMate(Object.assign({}, defaultBoxParams(), {csMode:'round', csPart:cur}));
    if(!m) break; cur = m.over.csPart; if(cur === 'body') break;
    walk.push(m.color);
  }
  chk('каждое звено цепочки несёт свой цвет', walk.join() === ink.colors.join(), [walk, ink.colors]);
  chk('возврат к подстаканнику цвета не навязывает',
      !assemblyMate(Object.assign({}, defaultBoxParams(), {csMode:'round', csPart:'ink3'})).color);

  // A logo with no tones recorded must not break the chain — old saved configs have no `tones` at all.
  const bare = Object.assign({}, card); delete bare.tones;
  const bi = coasterInks(bare);
  chk('без записанных цветов краски всё равно есть', bi.levels.length === 3, bi.levels.length);
  chk('и цвет подставляется запасной', bi.colors.every(c => /^#[0-9a-f]{6}$/.test(c)), bi.colors);
  logos.length = 0;
}

console.log('=== логотип ограничен своей формой, а не кубом, который не строится ===');
{
  // «Не могу сделать логотип больше»: the size was clamped against BOX_FACE_DIMS — the cube's 40 mm
  // faces — on a 90 mm disc that is not a cube at all. 40/2 − 1.5 = 18.5 half, so 37 mm was the ceiling
  // whatever the coaster's size. Two sets were being confused: who BUILDS the relief, and who decides
  // how big it may be.
  const grown = (ov) => { logos.length = 0;
    Object.assign(paramState.box, defaultBoxParams(), ov);
    const hm = new Float32Array(S*S); hm.fill(1);
    const lg = {id:1, face:'-Y', u0:0, v0:0, w:80, h:80, depth:-0.6, threshold:0.5,
                invert:false, rotation:0, heightmap:hm, levels:2};
    logos.push(lg); clampLogoToFace(lg); return lg.w; };
  chk('на подстаканнике Ø90 логотип растёт дальше 37 мм', grown({csMode:'round', csD:90}) === 80,
      grown({csMode:'round', csD:90}));
  chk('и на Ø160 тоже', grown({csMode:'round', csD:160}) === 80);
  // The same set answers for the stand, which lost it when the stand left LOGO_PLATE_MODES in v191.
  chk('на подставке — тоже (её сломало v191)', grown({psOn:true, psW:120}) === 80, grown({psOn:true, psW:120}));
  chk('на воронке как было', grown({fnOn:true}) === 80);
  // ...and the cube itself still measures against its own faces, which is the case the clamp exists for
  chk('куб по-прежнему меряет себя', grown({}) === 37, grown({}));
  chk('и растёт вместе со своей гранью', grown({width:200, depth:200}) === 80, grown({width:200, depth:200}));

  chk('множество «сам решает границы» шире, чем «строит плитой»',
      LOGO_OWN_BOUNDS.size === LOGO_PLATE_MODES.size + 2, [LOGO_OWN_BOUNDS.size, LOGO_PLATE_MODES.size]);
  chk('и включает обе формы со своей машинерией',
      LOGO_OWN_BOUNDS.has('coaster') && LOGO_OWN_BOUNDS.has('stand'));
  chk('а строит плитой их по-прежнему не он',
      !LOGO_PLATE_MODES.has('coaster') && !LOGO_PLATE_MODES.has('stand'));
  logos.length = 0;
}

console.log('=== о срезанном логотипе говорят вслух ===');
{
  // Clipping is silent by nature — the card still says 60 mm while the pocket is 44 — so the only place
  // it can be noticed before a part is printed is here.
  const mk = (csD, w) => { logos.length = 0;
    Object.assign(paramState.box, defaultBoxParams(), {csMode:'round', csD});
    logos.push({id:1, face:'-Y', u0:0, v0:0, w, h:w, depth:-0.8, threshold:0.5,
                invert:false, rotation:0, heightmap:HM, levels:2});
    return collectPrintWarnings(paramState.box).filter(t => /шире окна/.test(t)); };
  // 80 мм на Ø90 ПОМЕЩАЮТСЯ с v17.7.1: карман доходит до самого края, и предел рисунку — 87 мм, а не 70.
  // Чтобы поймать обрезку, логотип должен быть шире детали.
  const big = mk(90, 100), fits = mk(90, 80);
  chk('о срезанном логотипе предупреждают', big.length === 1, big);
  chk('и называют оба размера', big.length === 1 && /100/.test(big[0]) && /мм/.test(big[0]), big);
  chk('о помещающемся — молчат', fits.length === 0, fits);
  chk('на большем подстаканнике тот же логотип уже помещается', mk(180, 100).length === 0);
  logos.length = 0;
}

console.log('=== справка объясняет, почему логотипом вниз ===');
{
  const h = MODEL_HELP.coaster;
  chk('справка есть', !!h && !!h.what && !!h.how, h);
  chk('и говорит про печать вниз', /вниз/i.test(h.how), h.how);
  chk('порядок печати через AMS расписан', Array.isArray(h.steps) && h.steps.length >= 5, h && h.steps && h.steps.length);
  chk('в нём есть 3MF', h.steps.some(s => /3MF/.test(s)));
  chk('и продувочная башня', h.steps.some(s => /башн/i.test(s)));
  chk('материал предложен', Array.isArray(h.mat) && h.mat.length > 0, h.mat);
}

console.log('=== край мозаики идёт по рисунку, а не по клеткам ===');
{
  /* A mosaic of square cells has a staircase for an edge by construction, and the length of that edge is
     the measure of it: a rasterised circle's outline is 8r long however fine the raster, against the
     2πr ≈ 6.28r it should be — 27 % too long, and every bit of that excess is a visible step.

     So the test is a DISC, whose perimeter is known exactly, and the question is how close the mosaic's
     own outline comes to it. Not «does it look smoother».  */
  const RAD = 0.4, W = 40;
  const DISC = analyzeLogoImageData(img((x,y)=>Math.hypot(x-0.5,y-0.5) < RAD ? [240,240,240,255] : [0,0,0,0]), S).heightmap;
  logos.length = 0; boxHoles.length = 0;
  Object.assign(paramState.box, defaultBoxParams(), {csMode:'round', csD:70, csT:6, csRim:0, csInlay:0.8, csPart:'ink1'});
  logos.push({id:1, face:'-Y', u0:0, v0:0, w:W, h:W, depth:-0.8, threshold:0.5,
              invert:false, rotation:0, heightmap:DISC, levels:2});
  const t = buildTrisForShape('box', paramState.box);
  const g = coasterSpec(paramState.box);
  // the outline of the plug's top face: edges belonging to exactly ONE top-facing triangle
  const key = (A,B) => { const a2=A.map(v=>v.toFixed(4)).join(','), b2=B.map(v=>v.toFixed(4)).join(',');
    return a2 < b2 ? a2+'|'+b2 : b2+'|'+a2; };
  const cnt = new Map();
  for (const T of t){
    const u=[T[1][0]-T[0][0],T[1][1]-T[0][1],T[1][2]-T[0][2]], v=[T[2][0]-T[0][0],T[2][1]-T[0][1],T[2][2]-T[0][2]];
    const c=[u[1]*v[2]-u[2]*v[1], u[2]*v[0]-u[0]*v[2], u[0]*v[1]-u[1]*v[0]], L=Math.hypot(c[0],c[1],c[2]);
    if (L < 1e-12 || c[1]/L < 0.999) continue;                       // top-facing only
    if (Math.abs(T[0][1] - g.inlay) > 1e-6) continue;
    for (let e=0;e<3;e++){ const k = key(T[e], T[(e+1)%3]); cnt.set(k, (cnt.get(k)||0)+1); }
  }
  let peri = 0;
  for (const [k,n] of cnt) if (n === 1){ const [a2,b2] = k.split('|').map(q=>q.split(',').map(Number));
    peri += Math.hypot(a2[0]-b2[0], a2[1]-b2[1], a2[2]-b2[2]); }
  const truth = 2*Math.PI*(RAD*W);
  const ratio = peri / truth;
  chk('контур пробки нашёлся', peri > truth*0.5, +peri.toFixed(2));
  chk('и он идёт по окружности, а не лесенкой (лесенка это 1.27)', ratio < 1.10,
      {периметр:+peri.toFixed(2), истинный:+truth.toFixed(2), отношение:+ratio.toFixed(3)});
  chk('и не короче истинного — срезать углы тоже нельзя', ratio > 0.97, +ratio.toFixed(3));
  logos.length = 0;
}

console.log('=== цветная печать идёт СВОИМ ключом, а не общим ===');
{
  /* Подстаканник — форма со своим переключателем детали (`csPart`), своей цепочкой «+ пара» и своим
     построителем пробок. Общая машинка цветной печати (`logoAms`) ему не адресована, и пока панель
     предлагала её рядом, она выигрывала трижды: цепочка «+ Цвет N» ставила logoAms вместо csPart,
     ядро строило обычное тело, а обёртка поверх возвращала общие пробки — ПУСТЫЕ, потому что искать
     плоскость под наклейку на уже промятом подстаканнике нечего. На экране это выглядело как четыре
     модели по нулю треугольников.

     Все проверки этого файла ходили по csPart и мимо дефекта: геометрия была цела, сломан был ПУТЬ. */
  const row = SHAPE_PARAMS.box.find(r => r.key === 'logoAms');
  chk('общая строка цветной печати на подстаканнике скрыта',
      !paramRowRelevant(row, Object.assign({}, defaultBoxParams(), {csMode:'round'})));
  chk('а на обычном кубе показана', paramRowRelevant(row, Object.assign({}, defaultBoxParams())));
  const mk = (over) => { logos.length = 0; boxHoles.length = 0;
    Object.assign(paramState.box, defaultBoxParams(), {csMode:'round', csD:90}, over);
    logos.push({id:1, face:'+Z', u0:0, v0:0, w:40, h:40, depth:-0.6, threshold:0.5,
                invert:false, rotation:0, heightmap:HM, levels:2});
    return buildTrisForShape('box', paramState.box); };
  /* Даже если общий ключ пришёл из старого сохранённого проекта, подстаканник обязан строиться, а не
     исчезать: свою разновидность он решает своим ключом. */
  const plain = mk({});
  chk('подстаканник вообще строится', plain.length > 0, plain.length);
  for (const v of ['body', 'ink1', 'ink2']){
    const t = mk({logoAms:v});
    chk('общий ключ «' + v + '» подстаканник не обнуляет', t.length === plain.length,
        {было:plain.length, стало:t.length});
  }
  chk('а свой ключ даёт настоящие пробки, и это не тело', (() => {
    const ink = mk({csPart:'ink1'});
    return ink.length > 0 && ink.length !== plain.length; })());
  // и цепочка «+ пара» ведёт по csPart даже при выставленном общем ключе
  const m = assemblyMate(Object.assign({}, defaultBoxParams(), {csMode:'round', csPart:'body', logoAms:'body'}));
  chk('цепочка ведёт по своему ключу, а не по общему',
      !!m && m.over.csPart === 'ink1' && m.over.logoAms === undefined, m && m.over);
}

console.log('=== окно кармана идёт по контуру детали, а не квадратом ===');
{
  /* Квадрат, вписанный в круг, съедал треть диаметра: на Ø90 логотип упирался в 55 мм и дальше не
     пускался. Предел теперь один — сама деталь. */
  logos.length = 0;
  const bare = coasterSpec(Object.assign({}, defaultBoxParams(), {csMode:'round', csD:90}));
  chk('ПРЕДЕЛ окна доходит почти до борта', bare.maxArt > bare.innerHalf - 2,
      {maxArt:bare.maxArt, innerHalf:bare.innerHalf});
  chk('и это заметно больше прежней трети диаметра', 2*bare.maxArt > 70, +(2*bare.maxArt).toFixed(1));
  /* А само окно растёт ПОД РИСУНОК, а не всегда до предела: карман до борта на Ø90 это вчетверо больше
     клеток, чем нужно логотипу в 30 мм, и столько же лишнего времени на каждом подстаканнике. */
  const specFor = w => { logos.length = 0;
    Object.assign(paramState.box, defaultBoxParams(), {csMode:'round', csD:90});
    logos.push({id:1, face:'+Z', u0:0, v0:0, w, h:w, depth:-0.6, threshold:0.5,
                invert:false, rotation:0, heightmap:HM, levels:2});
    return coasterSpec(paramState.box); };
  const small = specFor(30), big = specFor(90);
  chk('маленькому рисунку — маленькое окно', small.winHalf < bare.maxArt - 5, small.winHalf);
  chk('большому — до самого предела', Math.abs(big.artHalf - bare.maxArt) < 1.5, {big:big.artHalf, предел:bare.maxArt});
  chk('и клеток у маленького меньше', coasterGridN(small, 50) < coasterGridN(big, 50),
      {мал:coasterGridN(small,50), бол:coasterGridN(big,50)});
  const g = big;
  const mk = (w, over) => { logos.length = 0; boxHoles.length = 0;
    Object.assign(paramState.box, defaultBoxParams(), {csMode:'round', csD:90, logoResolution:40}, over || {});
    logos.push({id:1, face:'+Z', u0:0, v0:0, w, h:w, depth:-0.6, threshold:0.5,
                invert:false, rotation:0, heightmap:HM, levels:2});
    return buildTrisForShape('box', paramState.box); };
  for (const w of [30, 50, 70]){
    const t = mk(w);
    chk('логотип ' + w + ' мм строится и герметичен', manifoldCheck(t, 4).watertight, w);
  }
  /* Больший рисунок обязан занимать БОЛЬШЕ кармана. Раньше сверх предела он просто переставал расти,
     и «шире окна» было единственным ответом. */
  const a1 = meshVolume(mk(30)), a2 = meshVolume(mk(70));
  chk('и больший рисунок правда снимает больше материала', a2 < a1, {'30':+a1.toFixed(0), '70':+a2.toFixed(0)});
  // квадратный подстаканник тоже не ограничен вписанным квадратом меньшего размера
  logos.length = 0;
  const sq = coasterSpec(Object.assign({}, defaultBoxParams(), {csMode:'square', csD:90}));
  chk('у квадратного предел тоже почти у борта', sq.maxArt > sq.innerHalf - 2, {maxArt:sq.maxArt, innerHalf:sq.innerHalf});
}

console.log('=== кольцо у края одним из цветов рисунка ===');
{
  const mk = (over) => { logos.length = 0; boxHoles.length = 0;
    Object.assign(paramState.box, defaultBoxParams(), {csMode:'round', csD:90, logoResolution:40}, over || {});
    logos.push({id:1, face:'+Z', u0:0, v0:0, w:40, h:40, depth:-0.6, threshold:0.5,
                invert:false, rotation:0, heightmap:HM, levels:2});
    return buildTrisForShape('box', paramState.box); };
  const off = mk({}), on = mk({csRingInk:1, csRingW:1.5, csRingGap:1.5});
  chk('кольцо герметично', manifoldCheck(on, 4).watertight);
  chk('и оно УБАВЛЯЕТ материал у тела — это карман, а не бугор', meshVolume(on) < meshVolume(off),
      {без:+meshVolume(off).toFixed(1), с:+meshVolume(on).toFixed(1)});
  /* Кольцо обязано попасть в ПРОБКУ своего цвета: иначе карман под него есть, а печатать его нечем. */
  const plugOff = mk({csPart:'ink1'}), plugOn = mk({csRingInk:1, csPart:'ink1'});
  chk('и попадает в пробку своего цвета', plugOn.length > plugOff.length,
      {без:plugOff.length, с:plugOn.length});
  chk('пробка с кольцом герметична', manifoldCheck(plugOn, 4).watertight);
  // шире кольцо — больше материала снято
  const wide = mk({csRingInk:1, csRingW:3, csRingGap:1.5});
  chk('шире кольцо — глубже карман', meshVolume(wide) < meshVolume(on),
      {узкое:+meshVolume(on).toFixed(1), широкое:+meshVolume(wide).toFixed(1)});
  // отступ двигает кольцо, а не только меняет его размер
  const far = mk({csRingInk:1, csRingW:1.5, csRingGap:8});
  chk('отступ двигает кольцо', Math.abs(meshVolume(far) - meshVolume(on)) > 1,
      {близко:+meshVolume(on).toFixed(1), далеко:+meshVolume(far).toFixed(1)});
  chk('без кольца настройки ширины и отступа ничего не меняют',
      Math.abs(meshVolume(mk({csRingW:3, csRingGap:5})) - meshVolume(off)) < 1e-6);
  // строки панели
  const row = SHAPE_PARAMS.box.find(r => r.key === 'csRingInk');
  chk('переключатель кольца есть и по умолчанию выключен', !!row && row.default === '0', row && row.default);
  const wRow = SHAPE_PARAMS.box.find(r => r.key === 'csRingW');
  chk('ширина прячется, когда кольца нет',
      !paramRowRelevant(wRow, Object.assign({}, defaultBoxParams(), {csMode:'round', csRingInk:'0'})));
  chk('и показана, когда есть',
      paramRowRelevant(wRow, Object.assign({}, defaultBoxParams(), {csMode:'round', csRingInk:'2'})));
}

console.log('=== отступ кольца отсчитывается от КРАЯ ДЕТАЛИ ===');
{
  /* До v17.7.1 предел карману ставил борт — деталь верхней грани, — и кольцо уезжало внутрь вместе с
     карманом: заказанные 1.5 мм от края превращались в 5.6, а по краю оставался видимый шов между
     пояском и полем. Борт и карман живут на разных гранях и не встречаются нигде. */
  const spec = over => { logos.length = 0;
    Object.assign(paramState.box, defaultBoxParams(), {csMode:'round', csD:78.8, csT:6, csInlay:0.8}, over||{});
    logos.push({id:1, face:'-Y', u0:0, v0:0, w:50, h:50, depth:-0.8, threshold:0.5,
                invert:false, rotation:0, heightmap:HM, levels:2});
    return coasterSpec(paramState.box); };
  const g = spec({csRingInk:3, csRingW:1.5, csRingGap:1.5});
  chk('кольцо ровно там, где просили', Math.abs(g.ringEdge - 1.5) < 1e-9, g.ringEdge);
  chk('и его не пришлось урезать', !g.ringTrimmed, {ringR:g.ringR, want:g.half - g.ringGap - g.ringW/2});
  chk('ширина борта на это больше не влияет',
      Math.abs(spec({csRingInk:3, csRingW:1.5, csRingGap:1.5, csRimW:20}).ringR - g.ringR) < 1e-9,
      {узкий:g.ringR, широкий:spec({csRingInk:3, csRingW:1.5, csRingGap:1.5, csRimW:20}).ringR});
  chk('и карман доходит до самого края', Math.abs(g.half - g.winHalf - COASTER_EDGE_WALL) < 1e-9,
      {winHalf:g.winHalf, half:g.half});
  // Больший отступ двигает кольцо ВНУТРЬ на ту же величину — линейно, без зажимов.
  const g8 = spec({csRingInk:3, csRingW:1.5, csRingGap:8});
  chk('отступ 8 мм — это 8 мм', Math.abs(g8.ringEdge - 8) < 1e-9, g8.ringEdge);
  // Ближе, чем поясок плюс нахлёст, краску не пустить — об этом говорят вслух.
  const tight = spec({csRingInk:3, csRingW:1.5, csRingGap:0});
  chk('слишком близко к краю — зажато и сказано', tight.ringTrimmed, tight.ringEdge);
  chk('и зажато ровно до предела кармана',
      Math.abs(tight.ringR + tight.ringW/2 - tight.maxArt) < 1e-9, {ringR:tight.ringR, maxArt:tight.maxArt});
  // Ставим тело и убеждаемся, что карман действительно вышел на край, а кольцо попало в свою пробку.
  logos.length = 0;
  Object.assign(paramState.box, defaultBoxParams(), {csMode:'round', csD:78.8, csT:6, csInlay:0.8,
    csRingInk:3, csRingW:1.5, csRingGap:1.5, logoResolution:40});
  logos.push({id:1, face:'-Y', u0:0, v0:0, w:50, h:50, depth:-0.8, threshold:0.5,
              invert:false, rotation:0, heightmap:HM, levels:2});
  const body = buildTrisForShape('box', paramState.box);
  chk('тело с кольцом у края герметично', manifoldCheck(body, 4).watertight, manifoldCheck(body, 4));
  logos.length = 0;
}

console.log('=== TOTAL: ' + pass + ' passed, ' + fail + ' failed ===');
if(fail) process.exit(1);
