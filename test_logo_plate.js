// Labels / relief on base shapes that have no tessellated face to displace. The cube family moves its
// own grid vertices; a gear, a funnel, a project box or a hook cannot, so the same artwork is emitted
// as its own closed height-field slab standing on the host's surface (buildLogoPlateTris). Checks that
// it stays watertight everywhere, that it lands on the REAL surface rather than the bounding box, and
// that it refuses the places where a slab would be nonsense. Run via ./run-all.sh (extraction test).

let pass=0, fail=0;
function chk(name,cond,extra){ if(cond){pass++;console.log('  OK  ',name);} else {fail++;console.log('  FAIL',name, extra!==undefined?JSON.stringify(extra):'');} }
function vol(t){let v=0;for(const T of t){const a=T[0],b=T[1],c=T[2];v+=(a[0]*(b[1]*c[2]-b[2]*c[1])-a[1]*(b[0]*c[2]-b[2]*c[0])+a[2]*(b[0]*c[1]-b[1]*c[0]))/6;}return v;}
function bbox(t){const lo=[1e9,1e9,1e9],hi=[-1e9,-1e9,-1e9];for(const T of t)for(const p of T)for(let a=0;a<3;a++){lo[a]=Math.min(lo[a],p[a]);hi[a]=Math.max(hi[a],p[a]);}return{lo,hi};}

// Two solid bars, well inside the footprint — a stand-in for lettering, with real filled/empty edges.
function art(){
  const S=LOGO_HM_SIZE, d=new Float32Array(S*S);
  for(let j=0;j<S;j++) for(let i=0;i<S;i++){ const u=i/S, v=j/S;
    d[j*S+i] = ((u>0.15&&u<0.40&&v>0.25&&v<0.70) || (u>0.55&&u<0.85&&v>0.25&&v<0.70)) ? 1 : 0; }
  return d;
}
const MODES = {
  sheet:{sheetShape:'rect'}, thread:{threadMode:'cap'}, hinge:{pipMode:'flat'}, gear:{gearMode:'spur'},
  mount:{mntMode:'lbracket'}, hook:{hookMount:'wall'}, wallorg:{woBack:'cleat'}, pbox:{pbPart:'tray'},
  stand:{psOn:true}, funnel:{fnOn:true},
};
const FACES = ['+X','-X','+Y','-Y','+Z','-Z'];
function setup(ov){
  logos.length=0; boxHoles.length=0;
  Object.assign(paramState.box, defaultBoxParams(), {width:40,height:30,depth:35}, ov);
}
function withLabel(ov, logo){
  setup(ov);
  const plain = buildTrisForShape('box', paramState.box);
  logos.push(Object.assign({face:'+Y',u0:0,v0:0,w:14,h:9,rotation:0,depth:0.8,threshold:0.5,invert:false,heightmap:art()}, logo));
  const withIt = buildTrisForShape('box', paramState.box);
  return {plain, withIt, added: withIt.length - plain.length};
}

console.log('=== every base shape x every face x emboss/engrave stays watertight ===');
{
  let bad=[], placed=0, total=0;
  for(const [nm,ov] of Object.entries(MODES)) for(const face of FACES) for(const depth of [0.8,-0.8]){
    const r = withLabel(ov, {face, depth}); total++;
    if(!manifoldCheck(r.withIt,4).watertight) bad.push(nm+' '+face+' '+depth);
    if(r.added > 0) placed++;
  }
  chk('all '+total+' combinations watertight', bad.length===0, bad.slice(0,6));
  // Not every face of every shape can carry a slab — a funnel is all cone, a gear's ±X is a tooth
  // tip. But a good half of them must, or the feature is theatre.
  chk('a label actually lands somewhere on most shapes', placed >= total*0.3, {placed, total});
}

console.log('=== the plate sits on the REAL surface, not the bounding box ===');
{
  // A project box tray is widest at its FLOOR plate; the walls are several mm inside that. A slab
  // parked on the bounding-box face would float in mid-air with a visible gap.
  setup({pbPart:'tray'});
  const host = buildTrisForShape('box', paramState.box);
  const bb = bboxOfTris(host);
  const plane = outermostFlatPlaneAt(host, 0, +1, 1, 2, [[0,0],[-6,-6],[6,-6],[6,6],[-6,6]]);
  chk('project box: found a flat +X surface', plane !== null, {plane});
  chk('project box: that surface is INSIDE the bounding box face', plane !== null && plane < bb.hi[0] - 0.5,
      {plane, bbHi:bb.hi[0]});
  const r = withLabel({pbPart:'tray'}, {face:'+X', depth:0.8});
  const wb = bbox(r.withIt);
  chk('project box: emboss does not push past the widest part', wb.hi[0] <= bb.hi[0] + 1e-6);
  chk('project box: emboss stands proud of the wall it sits on',
      plane !== null && wb.hi[0] >= plane, {plane, hi:wb.hi[0]});
}

console.log('=== refusals: nowhere flat to sit ===');
{
  // A funnel is a cone all the way round — no face for a flat slab, on any side.
  let any=false;
  for(const face of FACES){ if(withLabel({fnOn:true}, {face}).added > 0) any=true; }
  chk('funnel: refuses every face (all curved)', !any);
  // A gear's ±X and ±Z extremes are tooth tips a couple of mm across. The label's footprint has to be
  // supported all the way to its corners, so those are refused too.
  chk('gear: refuses a tooth-tip face', withLabel({gearMode:'spur'}, {face:'+X'}).added === 0);
  // Dead centre of a gear's flat side is the bore — a slab there would roof over the shaft hole.
  chk('gear: refuses the centre of the side (that is the bore)',
      withLabel({gearMode:'spur'}, {face:'+Y', u0:0, v0:0}).added === 0);
  // ...but off to one side, on the web, it is a perfectly good place for a label.
  const off = withLabel({gearMode:'spur', gearTeeth:40, gearModule:2, gearThick:6},
                        {face:'+Y', u0:22, v0:0, w:9, h:5});
  chk('gear: accepts a label on the web, off the bore', off.added > 0, {added:off.added});
  chk('gear: still watertight with it', manifoldCheck(off.withIt,4).watertight);
}

console.log('=== электрокорпус мнёт СВОЮ стенку, а не носит бляшку ===');
{
  /* Раньше корпус стоял в LOGO_PLATE_MODES, и обёртка клала поверх него плиту: надпись сидела на
     выпуклой площадке, а гравировка была утопленным знаком в поднятой бляшке. Просили обратного —
     чтобы мялось само тело.

     Меряется вмятина против ВЫПУКЛОСТИ той же глубины, а не против гладкой детали: построитель у
     промятой панели другой, и разница с гладкой мерила бы смену построителя, а не рисунок. У одного
     и того же построителя разница только в знаке, и она обязана быть примерно удвоенным объёмом
     рисунка. */
  for (const [part, face] of [['lid','+Y'], ['tray','-Y'], ['tray','+Z'], ['tray','-X'], ['both','+X']]){
    const en = withLabel({pbPart:part}, {face, depth:-0.5});
    const em = withLabel({pbPart:part}, {face, depth:+0.5});
    chk(part + '/' + face + ': вмятина герметична', manifoldCheck(en.withIt,4).watertight);
    chk(part + '/' + face + ': выпуклость герметична', manifoldCheck(em.withIt,4).watertight);
    chk(part + '/' + face + ': вмятина УБАВЛЯЕТ материал против выпуклости',
        vol(en.withIt) < vol(em.withIt) - 1,
        {вмятина:+vol(en.withIt).toFixed(1), выпукло:+vol(em.withIt).toFixed(1)});
  }
  /* А грань, которой у детали наружу нет, по-прежнему уходит в накладку — и об этом сказано вслух.
     Молчаливое исчезновение хуже накладки: у лотка нет верха, и логотип на «+Y» иначе просто пропал бы. */
  const top = withLabel({pbPart:'tray'}, {face:'+Y', depth:-0.5});
  chk('у лотка нет верха — логотип уходит в накладку', vol(top.withIt) > vol(top.plain));
  chk('и герметичность цела', manifoldCheck(top.withIt,4).watertight);
  logos.length = 0;
  Object.assign(paramState.box, defaultBoxParams(), {pbPart:'lid'});
  logos.push({id:1, face:'-Z', u0:0, v0:0, w:12, h:6, depth:-0.5, threshold:0.5,
              invert:false, rotation:0, heightmap:art(), levels:2});
  chk('про грань, которой у детали нет, приложение говорит вслух',
      collectPrintWarnings(paramState.box).some(x => /такой грани нет/.test(x)),
      collectPrintWarnings(paramState.box));
  logos.length = 0;
}
console.log('=== emboss vs engrave: бляшка там, где она осталась ===');
{
  /* Бляшка никуда не делась — ею живут формы, у которых своей сетки под вмятину нет: шестерня,
     резьба, крючок. На них гравировка по-прежнему утопленный знак в поднятой плите, потому что
     вычитания в приложении нет вовсе. */
  const host = {gearMode:'spur', gearTeeth:40, gearModule:2, gearThick:6};
  const em = withLabel(host, {face:'+Y', u0:22, depth:1.2, w:9, h:5});
  const en = withLabel(host, {face:'+Y', u0:22, depth:-1.2, w:9, h:5});
  chk('emboss: watertight', manifoldCheck(em.withIt,4).watertight);
  chk('engrave: watertight', manifoldCheck(en.withIt,4).watertight);
  chk('emboss adds volume',  vol(em.withIt) > vol(em.plain));
  chk('engrave adds volume too (it is a plaque, not a cut)', vol(en.withIt) > vol(en.plain));
  const eb = bbox(en.withIt), pb = bbox(en.plain);
  chk('engrave: plaque stands proud by more than the engraving is deep',
      (eb.hi[1] - pb.hi[1]) > 1.2, {stood:+(eb.hi[1]-pb.hi[1]).toFixed(3), depth:1.2});
  const deep = withLabel(host, {face:'+Y', u0:22, depth:-2.5, w:9, h:5});
  const db = bbox(deep.withIt);
  chk('engrave: deeper engraving thickens the plaque', (db.hi[1]-pb.hi[1]) > (eb.hi[1]-pb.hi[1]));
  chk('engrave deep: watertight', manifoldCheck(deep.withIt,4).watertight);
}

console.log('=== the artwork controls actually reach the plate ===');
{
  const base = withLabel({pbPart:'tray'}, {face:'-Y', depth:1.0});
  const inv  = withLabel({pbPart:'tray'}, {face:'-Y', depth:1.0, invert:true});
  chk('invert changes the glyph', Math.abs(vol(inv.withIt) - vol(base.withIt)) > 1, // mm³
      {base:+vol(base.withIt).toFixed(1), inv:+vol(inv.withIt).toFixed(1)});
  chk('invert: watertight', manifoldCheck(inv.withIt,4).watertight);
  const big = withLabel({pbPart:'tray'}, {face:'-Y', depth:1.0, w:22, h:14});
  chk('a bigger label puts more material on', vol(big.withIt) > vol(base.withIt));
  chk('bigger: watertight', manifoldCheck(big.withIt,4).watertight);
  for(const rot of [15, 45, 90, 180, 270]){
    const r = withLabel({pbPart:'tray'}, {face:'-Y', depth:1.0, rotation:rot});
    chk(`rotation ${rot}°: watertight`, manifoldCheck(r.withIt,4).watertight);
    chk(`rotation ${rot}°: still placed`, r.added > 0);
  }
  for(const th of [0.2, 0.5, 0.8]){
    const r = withLabel({pbPart:'tray'}, {face:'-Y', depth:1.0, threshold:th});
    chk(`threshold ${th}: watertight`, manifoldCheck(r.withIt,4).watertight);
  }
}

console.log('=== logoPlate: a plaque under an EMBOSSED label too ===');
{
  // На форме, которая живёт накладкой (шестерня): подложка поднимает всю надпись на свою толщину.
  setup({gearMode:'spur', gearTeeth:40, gearModule:2, gearThick:6});
  const plain = buildTrisForShape('box', paramState.box);
  logos.push({face:'+Y',u0:22,v0:0,w:9,h:5,rotation:0,depth:0.8,threshold:0.5,invert:false,heightmap:art()});
  const noPlate = buildTrisForShape('box', paramState.box);
  paramState.box.logoPlate = 1.5;
  const withPlate = buildTrisForShape('box', paramState.box);
  paramState.box.logoPlate = 0;
  chk('plaque: watertight', manifoldCheck(withPlate,4).watertight);
  chk('plaque adds volume over a bare emboss', vol(withPlate) > vol(noPlate));
  const a = bbox(noPlate), b = bbox(withPlate);
  chk('plaque lifts the whole label by its thickness',
      Math.abs((b.hi[1]-a.hi[1]) - 1.5) < 1e-6, {lift:+(b.hi[1]-a.hi[1]).toFixed(4)});
  chk('bare emboss stands only as proud as its depth',
      Math.abs((a.hi[1] - bbox(plain).hi[1]) - 0.8) < 1e-6,
      {stood:+(a.hi[1]-bbox(plain).hi[1]).toFixed(4)});
}
console.log('=== а где панель мнётся, подложка ни на что не влияет ===');
{
  /* `logoPlate` описывает НАКЛАДКУ, и только её. Где панель мнётся, накладки нет вовсе, и поднимать
     нечего — то же правило, что у подставки с v17.3.0. Проверяется тем, что результат не меняется:
     молчаливое «настройка есть, а толку нет» лучше поймать здесь, чем на печати. */
  setup({pbPart:'lid'});
  logos.push({face:'+Y',u0:0,v0:0,w:14,h:9,rotation:0,depth:-0.8,threshold:0.5,invert:false,heightmap:art()});
  const off = buildTrisForShape('box', paramState.box);
  paramState.box.logoPlate = 1.5;
  const on = buildTrisForShape('box', paramState.box);
  paramState.box.logoPlate = 0;
  chk('на промятой крышке подложка ничего не меняет',
      Math.abs(vol(on) - vol(off)) < 1e-6 && on.length === off.length,
      {off:+vol(off).toFixed(2), on:+vol(on).toFixed(2)});
  chk('и деталь остаётся герметичной', manifoldCheck(on,4).watertight);
}

console.log('=== the cube family is untouched (it displaces its own vertices) ===');
{
  const r = withLabel({}, {face:'+Z', depth:0.8});
  chk('cube: logo still applied by displacement, not a plate', r.added > 0);
  chk('cube: watertight', manifoldCheck(r.withIt,4).watertight);
  chk('cube: no plate mode', !LOGO_PLATE_MODES.has(dominantMode(paramState.box)));
  // a die and a keycap have their own face/legend machinery — they must not get a plate on top
  chk('die is not a plate mode', !LOGO_PLATE_MODES.has('die'));
  chk('keycap is not a plate mode', !LOGO_PLATE_MODES.has('keycap'));
}

console.log('=== degenerate inputs are refused, not crashed on ===');
{
  const bb = {lo:[-20,-15,-17.5], hi:[20,15,17.5]};
  const L = (ov)=>Object.assign({face:'+Y',u0:0,v0:0,w:14,h:9,rotation:0,depth:0.8,threshold:0.5,invert:false,heightmap:art()}, ov);
  chk('no heightmap → nothing', buildLogoPlateTris(L({heightmap:null}), bb, 0, 120).length === 0);
  chk('zero depth → nothing',   buildLogoPlateTris(L({depth:0}), bb, 0, 120).length === 0);
  chk('unknown face → nothing', buildLogoPlateTris(L({face:'nope'}), bb, 0, 120).length === 0);
  chk('sub-millimetre label → nothing', buildLogoPlateTris(L({w:0.2,h:0.2}), bb, 0, 120).length === 0);
  const inner = buildLogoPlateTris(L({face:'-Y-inner'}), bb, 0, 120);
  chk('cavity-floor face falls back to -Y', inner.length > 0 && manifoldCheck(inner,4).watertight);
  // threshold above everything leaves no glyph: nothing at all for an emboss, a blank plaque otherwise
  chk('empty silhouette, no plaque → nothing',
      buildLogoPlateTris(L({threshold:1.5}), bb, 0, 120).length === 0);
  const blank = buildLogoPlateTris(L({threshold:1.5}), bb, 1.5, 120);
  chk('empty silhouette with a plaque → a blank plaque', blank.length > 0 && manifoldCheck(blank,4).watertight);
}

console.log('\n=== растр текста заполняет свой квадрат, а не лежит в нём полоской ===');
{
  /* Пропорции применялись ДВАЖДЫ. Строка рисуется в квадратный растр по своим пропорциям и занимает
     узкую полосу по высоте; панель под неё делается с ТЕМ ЖЕ отношением сторон — и полоса ужимается
     ещё раз. Замер: «EDORA» на грани куба выходила 32,6 × 1,2 мм, отношение 26,9 при истинных 5,2 —
     сплющенная ровно в aspect раз, на любой грани, а не только на подставке, где это заметили.

     Загруженная картинка этого не знает: при загрузке она растягивается на весь квадрат, и отношение
     сторон панели её как раз восстанавливает. Текст теперь живёт по тому же правилу — растр обрезается
     по чернилам, — а само правило вынесено в чистую функцию, чтобы спросить его можно было без
     браузера. Отношение берётся из ТОГО ЖЕ прямоугольника: пока источников два, найдётся способ
     применить их оба.

     Эталон считается ЗДЕСЬ ЖЕ перебором, а не берётся как «0,8 делить на 0,12»: непрерывный идеал в
     растре не живёт, полоса 0,12 высоты при 256 пикселях это 30 пикселей, а не 30,7, и сверка с
     идеалом превращается в подбор допуска. Две отвергнутые редакции отступа именно так и выглядели
     правдоподобно. */
  const ref = (a, S) => { let x0=S, x1=-1, y0=S, y1=-1;
    for (let j = 0; j < S; j++) for (let i = 0; i < S; i++)
      if (a[j*S+i] > 0.5){ if(i<x0)x0=i; if(i>x1)x1=i; if(j<y0)y0=j; if(j>y1)y1=j; }
    return x1 < x0 ? null : {x:x0, y:y0, w:x1-x0+1, h:y1-y0+1}; };
  const mk = (S, x0, x1, y0, y1) => { const a = new Float32Array(S*S);
    for (let j = 0; j < S; j++) for (let i = 0; i < S; i++){
      const u = (i+0.5)/S, v = (j+0.5)/S;
      a[j*S+i] = (u >= x0 && u <= x1 && v >= y0 && v <= y1) ? 1 : 0; }
    return a; };
  for (const S of [64, 128, 256, 512]){
    for (const [name, box] of [['полоса', [0.10,0.90,0.44,0.56]],
                               ['столбик', [0.44,0.56,0.10,0.90]],
                               ['квадрат', [0.20,0.80,0.20,0.80]],
                               ['у края',  [0.00,0.30,0.70,1.00]]]){
      const a = mk(S, ...box), r = ref(a, S), got = inkBoxOfRaster(a, S, 0, 0.25);
      chk('рамка чернил точна: ' + name + ' при растре ' + S,
          !!got && got.x===r.x && got.y===r.y && got.w===r.w && got.h===r.h, {got, надо:r});
      chk('и отношение — это её же стороны: ' + name + ' при ' + S,
          !!got && Math.abs(got.aspect - got.w/got.h) < 1e-12, got && got.aspect);
    }
  }
  chk('пустой растр обрезать нечем', inkBoxOfRaster(new Float32Array(64*64), 64, 0, 0.25) === null);
  /* Обратная полярность: чернила ТЕМНЕЕ фона. Функция сравнивает с ЗАДАННЫМ фоном, а не ищет максимум,
     поэтому обе полярности ей одинаковы — иначе она сломалась бы на инвертированной картинке. */
  const S2 = 128, inv = new Float32Array(S2*S2).fill(1);
  for (let j = 0; j < S2; j++) for (let i = 0; i < S2; i++){
    const u = (i+0.5)/S2, v = (j+0.5)/S2;
    if (u >= 0.20 && u <= 0.80 && v >= 0.30 && v <= 0.50) inv[j*S2+i] = 0; }
  const invBox = inkBoxOfRaster(inv, S2, 1, 0.25);
  chk('тёмные чернила на светлом фоне ищутся так же',
      !!invBox && Math.abs(invBox.aspect - 3) < 0.15, invBox && +invBox.aspect.toFixed(2));
  chk('а с неверно названным фоном рамка выходит другой',
      (() => { const b2 = inkBoxOfRaster(inv, S2, 0, 0.25); return !b2 || b2.w !== invBox.w; })());
}

console.log(`\n=== TOTAL: ${pass} passed, ${fail} failed ===`);
process.exit(fail ? 1 : 0);
