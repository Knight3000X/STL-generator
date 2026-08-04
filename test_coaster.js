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
    for(const csPart of ['body','inlay'])
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
  chk('и без логотипа вставки просто нет', build({csPart:'inlay'}, false).length === 0);
}

console.log('=== главное: два филамента не делят объём ===');
{
  const A = build({csPart:'body'}), B = build({csPart:'inlay'});
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
    chk('строка «'+r.key+'» видна на своей подмодели', paramRowRelevant(r, st), r.key);
  }
  chk('радиус углов не предлагается кругу',
      !paramRowRelevant(rows.find(r=>r.key==='csCorner'), Object.assign({}, defaultBoxParams(), {csMode:'round'})));
  chk('ширина борта прячется при нулевом борте',
      !paramRowRelevant(rows.find(r=>r.key==='csRimW'),
                        Object.assign({}, defaultBoxParams(), {csMode:'round', csRim:0})));
}

console.log('=== пара AMS: вторая модель существует и это именно вставка ===');
{
  const body = Object.assign({}, defaultBoxParams(), {csMode:'round'});
  const rec = assemblyMate(body);
  chk('у подстаканника есть пара', !!rec, rec);
  chk('пара — вставка', !!rec && rec.over.csPart === 'inlay', rec && rec.over);
  chk('и она несёт логотип с собой', !!rec && rec.logos === true, rec && rec.logos);
  const back = assemblyMate(Object.assign({}, defaultBoxParams(), {csMode:'round', csPart:'inlay'}));
  chk('от вставки есть путь обратно', !!back && back.over.csPart === 'body', back && back.over);
  chk('и обратно тоже с логотипом', !!back && back.logos === true);
  chk('пара садится в то же место',
      !!rec && JSON.stringify(rec.seat({},{},{px:3,py:4,pz:5})) === JSON.stringify({px:3,py:4,pz:5}));

  // The second filament must be the plugs and NOTHING else: an inlay that quietly carried a coaster body
  // would print a whole second coaster in the accent colour.
  const A = build({csPart:'body'}), B = build({csPart:'inlay'});
  const bA = bbox(A), bB = bbox(B);
  chk('вставка тонкая', bB.hi[1] - bB.lo[1] < 1.01, bB.hi[1]-bB.lo[1]);
  chk('и мельче подстаканника по площади', (bB.hi[0]-bB.lo[0]) < (bA.hi[0]-bA.lo[0])*0.6,
      [bB.hi[0]-bB.lo[0], bA.hi[0]-bA.lo[0]]);
  chk('вставка не выходит за окно', bB.hi[0] <= coasterSpec(paramState.box).winHalf + 1e-6, bB.hi[0]);
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
  const big = mk(90, 80), fits = mk(90, 30);
  chk('о срезанном логотипе предупреждают', big.length === 1, big);
  chk('и называют оба размера', big.length === 1 && /80/.test(big[0]) && /мм/.test(big[0]), big);
  chk('о помещающемся — молчат', fits.length === 0, fits);
  chk('на большем подстаканнике тот же логотип уже помещается', mk(180, 80).length === 0);
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

console.log('=== TOTAL: ' + pass + ' passed, ' + fail + ' failed ===');
if(fail) process.exit(1);
