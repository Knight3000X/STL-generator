// Из какого канала картинки читается рельеф и на сколько ступеней он режется.
//
// Everything the finished model shows has to already be in the heightmap, so where that map comes from is
// the whole game — and getting it wrong does not look like a bug, it looks like a logo that came out as
// its own outline. There are two separate ways to lose the picture, and this file is in two halves
// because fixing the first one did not fix the second:
//
//   1. THE CHANNEL. Read the wrong one and the tones never reach the map at all.
//   2. THE NUMBER OF STEPS. Read the right channel into a map with every tone in it, then cut it at ONE
//      threshold, and a three-tone emblem still comes out with two of its tones fused. Three tones have
//      three boundaries; one cut can show one of them.
//
//   СИЛУЭТ (alpha)  — the shape is where the picture is opaque. Right for text and for a one-colour icon
//                     on a transparent background; it is why letters need no invert guessing.
//   ЯРКОСТЬ (lum)   — the shape is where the picture is light. Right for a drawing with no alpha at all.
//   ДЕТАЛИ (detail) — opaque AND light. Right for a COLOURED icon on a transparent background, which the
//                     other two both flatten: alpha sees one solid silhouette and loses every line inside
//                     it, luminance sees the transparent background as black and merges it with the icon's
//                     own dark parts.
//
// The measure used throughout is not "does it look right" but how much STRUCTURE survives: the number of
// places where the map changes value between neighbouring cells, and how many DISTINCT heights the tones
// end up at. A silhouette has a few hundred transitions; the same badge read for detail has thousands —
// and three tones at two levels still occupy only two heights, which is the complaint stated as a number.
// The last section builds real bodies, because intermediate heights are new to the mesh and "it looked
// right in the preview" is not an answer about watertightness. Run via ./run-all.sh.
let pass=0, fail=0;
function chk(n,c,e){if(c){pass++;console.log('  OK  ',n);}else{fail++;console.log('  FAIL',n,e!==undefined?JSON.stringify(e):'');}}

const S = LOGO_HM_SIZE;
// A painter for test images: fn(x01,y01) returns [r,g,b,a] with 0..255 components.
function img(fn){
  const d = new Uint8ClampedArray(S*S*4);
  for(let y=0;y<S;y++) for(let x=0;x<S;x++){
    const c = fn((x+0.5)/S, (y+0.5)/S), i=(y*S+x)*4;
    d[i]=c[0]; d[i+1]=c[1]; d[i+2]=c[2]; d[i+3]=c[3];
  }
  return d;
}
// How much structure a heightmap still has once it is cut at `thr` — transitions between neighbours.
function edges(hm, thr){
  thr = thr==null ? 0.5 : thr;
  const m = (i,j) => hm[j*S+i] > thr ? 1 : 0;
  let n = 0;
  for(let j=0;j<S;j++) for(let i=0;i<S;i++){
    if(i+1<S && m(i,j)!==m(i+1,j)) n++;
    if(j+1<S && m(i,j)!==m(i,j+1)) n++;
  }
  return n;
}
const area = (hm,thr) => { let n=0; for(const v of hm) if(v > (thr==null?0.5:thr)) n++; return n/(S*S); };

// A two-tone badge on transparency: the user's case. A light ring, a dark disc inside it, and inside THAT
// two light dots — structure that only survives if the tones are read.
const badge = img((x,y)=>{
  const dx=x-0.5, dy=y-0.5, r=Math.hypot(dx,dy);
  if(r > 0.45) return [0,0,0,0];                       // transparent outside
  if(r > 0.34) return [250,160,20,255];                // light ring
  if(Math.hypot(dx-0.12,dy+0.08) < 0.06) return [250,160,20,255];   // light dot (an eye)
  if(Math.hypot(dx+0.12,dy+0.08) < 0.06) return [250,160,20,255];   // light dot (an eye)
  if(Math.abs(dx) < 0.03 && dy > -0.02 && dy < 0.06) return [250,160,20,255];   // a nose
  if(dy > 0.12 && dy < 0.18 && Math.abs(dx) < 0.18 &&
     Math.floor((dx+0.18)/0.06) % 2 === 0) return [250,160,20,255];             // a row of teeth
  return [74,44,30,255];                               // dark middle
});
// The same drawing with NO transparency: a light figure on a white page.
const onWhite = img((x,y)=>{
  const dx=x-0.5, dy=y-0.5, r=Math.hypot(dx,dy);
  if(r > 0.45) return [255,255,255,255];
  if(r > 0.34) return [30,30,30,255];
  return [255,255,255,255];
});
// One flat colour on transparency: text, or a stencil icon.
const stencil = img((x,y)=>{
  const dx=x-0.5, dy=y-0.5;
  return (Math.hypot(dx,dy) < 0.4 && Math.abs(dx) > 0.08) ? [20,20,20,255] : [0,0,0,0];
});

console.log('=== авто выбирает канал по самой картинке ===');
{
  const b = analyzeLogoImageData(badge, S), w = analyzeLogoImageData(onWhite, S), t = analyzeLogoImageData(stencil, S);
  chk('цветной значок на прозрачном → детали', b.stats.chose === 'detail', b.stats);
  chk('рисунок без прозрачности → яркость', w.stats.chose === 'lum', w.stats);
  chk('одноцветный на прозрачном → силуэт', t.stats.chose === 'alpha', t.stats);
  // ...and the reasons are recorded, not just the verdict
  chk('у цветного размах тонов заметный', b.stats.spread > 0.25, b.stats.spread);
  chk('у одноцветного размаха нет', t.stats.spread < 0.1, t.stats.spread);
  chk('у цветного насчитано больше одного тона', b.stats.tones >= 2, b.stats.tones);
  chk('у одноцветного тон один', t.stats.tones === 1, t.stats.tones);
  chk('прозрачность распознана там, где она есть',
      b.stats.hasTransparency && t.stats.hasTransparency && !w.stats.hasTransparency,
      [b.stats.hasTransparency, t.stats.hasTransparency, w.stats.hasTransparency]);
  chk('решение записано как «тонов больше одного»', b.stats.manyTones === true, b.stats);
}

console.log('=== ради чего всё: внутренняя структура доживает до маски ===');
{
  const alpha = analyzeLogoImageData(badge, S, 'alpha').heightmap;
  const det   = analyzeLogoImageData(badge, S, 'detail').heightmap;
  const eA = edges(alpha), eD = edges(det);
  chk('детали дают заметно больше границ', eD > eA*2, {alpha:eA, detail:eD});
  // The sharper statement, and the one that IS the complaint: strictly INSIDE the silhouette — away from
  // its outline altogether — the alpha mask has nothing at all, while the detail mask has the drawing.
  const inside = (i,j) => Math.hypot(i/S-0.5, j/S-0.5) < 0.30;
  const edgesIn = hm => { const m=(i,j)=>hm[j*S+i]>0.5?1:0; let n=0;
    for(let j=1;j<S-1;j++) for(let i=1;i<S-1;i++){ if(!inside(i,j)||!inside(i+1,j+1)) continue;
      if(m(i,j)!==m(i+1,j)) n++; if(m(i,j)!==m(i,j+1)) n++; } return n; };
  chk('внутри силуэта у «силуэта» нет ни одной границы', edgesIn(alpha) === 0, edgesIn(alpha));
  chk('внутри силуэта у «деталей» есть рисунок', edgesIn(det) > 300, edgesIn(det));
  // the dark middle and the light ring end up on OPPOSITE sides of the threshold
  const at = (hm,x,y) => hm[Math.floor(y*S)*S + Math.floor(x*S)];
  chk('светлое кольцо — над порогом', at(det,0.5,0.10) > 0.5, at(det,0.5,0.10));
  chk('тёмная середина — под порогом', at(det,0.5,0.42) < 0.5, at(det,0.5,0.42));
  chk('прозрачное снаружи — под порогом', at(det,0.02,0.02) < 0.5, at(det,0.02,0.02));
  // ...whereas the silhouette puts ring and middle on the SAME side, which is the whole complaint
  chk('силуэт не различает кольцо и середину',
      (at(alpha,0.5,0.10) > 0.5) === (at(alpha,0.5,0.42) > 0.5), [at(alpha,0.5,0.10), at(alpha,0.5,0.42)]);
  chk('силуэт всё же отличает фон', at(alpha,0.02,0.02) < 0.5, at(alpha,0.02,0.02));
  // and detail covers less of the face than the silhouette — it is the drawing, not its footprint
  chk('детали занимают меньше площади, чем силуэт', area(det) < area(alpha), {det:area(det), alpha:area(alpha)});
}

console.log('=== тона растянуты, иначе порог нечем резать ===');
{
  // Two tones a hair apart: 0.45 and 0.55 of the range. Un-stretched they both sit on one side of a 50%
  // threshold and the picture reads as a blank; stretched to the full range they separate.
  const faint = img((x,y)=>{
    const inside = Math.hypot(x-0.5,y-0.5) < 0.4;
    if(!inside) return [0,0,0,0];
    return y < 0.5 ? [115,115,115,255] : [140,140,140,255];
  });
  const d = analyzeLogoImageData(faint, S, 'detail').heightmap;
  const at = (hm,x,y) => hm[Math.floor(y*S)*S + Math.floor(x*S)];
  chk('близкие тона разведены по краям диапазона',
      at(d,0.5,0.3) < 0.1 && at(d,0.5,0.7) > 0.9, [at(d,0.5,0.3), at(d,0.5,0.7)]);
  chk('и порог 50% их разделяет', edges(d) > 200, edges(d));
  chk('всё за прозрачным осталось нулём', at(d,0.02,0.02) === 0, at(d,0.02,0.02));

  // ...and the range is set by PERCENTILES, not by the extremes. An exporter's antialiasing leaves a few
  // near-white and near-black pixels along every edge; if those set the ends of the range, the two tones the
  // picture is actually made of get squeezed into the middle of it and land on the SAME side of the
  // threshold — the drawing vanishes and the logo comes out as its silhouette again.
  const speckled = img((x,y)=>{
    const dx=x-0.5, dy=y-0.5;
    if(Math.hypot(dx,dy) > 0.45) return [0,0,0,0];
    if(Math.hypot(dx-0.30,dy) < 0.012) return [255,255,255,255];   // a stray highlight
    if(Math.hypot(dx+0.30,dy) < 0.012) return [3,3,3,255];         // a stray dark speck
    return y < 0.5 ? [150,150,150,255] : [180,180,180,255];        // the two tones that are really there
  });
  const sp = analyzeLogoImageData(speckled, S, 'detail').heightmap;
  chk('крапины по паре пикселей не задают диапазон',
      at(sp,0.5,0.3) < 0.5 && at(sp,0.5,0.7) > 0.5, [at(sp,0.5,0.3), at(sp,0.5,0.7)]);
  chk('и светлое остаётся половиной значка, а не всем значком', area(sp) < 0.40, area(sp));
}

console.log('=== прозрачное — ноль, чем бы оно ни было закрашено ===');
{
  // PNG keeps the colour of a fully transparent pixel, and exporters routinely leave WHITE there rather
  // than black. Luminance alone therefore reads the background as the brightest thing in the picture: with
  // no alpha gate the relief floods the entire face and the logo is a hole in it. The test images above
  // cannot catch this — their transparent pixels are black, which is already zero.
  const ghost = img((x,y)=>{
    const dx=x-0.5, dy=y-0.5, r=Math.hypot(dx,dy);
    if(r > 0.45) return [255,255,255,0];        // transparent, but white underneath
    if(r > 0.34) return [250,160,20,255];
    return [74,44,30,255];
  });
  const at = (hm,x,y) => hm[Math.floor(y*S)*S + Math.floor(x*S)];
  const g = analyzeLogoImageData(ghost, S, 'detail').heightmap;
  chk('цвет из-под прозрачного не просачивается', at(g,0.02,0.02) === 0, at(g,0.02,0.02));
  chk('и не заливает грань', area(g) < 0.35, area(g));
  chk('а сам рисунок на месте', at(g,0.5,0.10) > 0.5 && at(g,0.5,0.42) < 0.5, [at(g,0.5,0.10), at(g,0.5,0.42)]);
}

console.log('=== канал можно выбрать руками, и он переживает сохранение ===');
{
  for(const mode of ['alpha','lum','detail']){
    const r = analyzeLogoImageData(badge, S, mode);
    chk('режим «'+mode+'» слушается', r.stats.chose === mode, r.stats.chose);
    chk('режим «'+mode+'» даёт непустую карту', r.heightmap.length === S*S && area(r.heightmap) > 0.01,
        area(r.heightmap));
  }
  chk('«авто» — не отдельный канал, а решение',
      analyzeLogoImageData(badge, S, 'auto').stats.chose !== 'auto');
  // the list the panel offers is the list the analyser understands
  const opts = LOGO_SRC_OPTIONS.map(o => o.v);
  chk('панель предлагает ровно те каналы, что есть', opts.join() === 'auto,detail,alpha,lum', opts);
  for(const o of LOGO_SRC_OPTIONS){
    chk('«'+o.v+'» подписан по-человечески', !!o.t && o.t.length > 3, o.t);
    if(o.v !== 'auto')
      chk('«'+o.v+'» — настоящий канал', analyzeLogoImageData(badge, S, o.v).stats.chose === o.v);
  }
}

console.log('=== старое поведение сохранено там, где оно было правильным ===');
{
  // Text is drawn opaque on a transparent canvas ON PURPOSE, so that alpha carries the shape and no invert
  // has to be guessed. Nothing here may change that.
  const t = analyzeLogoImageData(stencil, S);
  chk('одноцветный значок читается по силуэту', t.stats.chose === 'alpha');
  chk('и invert для него не нужен', t.suggestedInvert === false);
  const w = analyzeLogoImageData(onWhite, S);
  chk('светлый рисунок на белом просит invert', w.suggestedInvert === true, w.suggestedInvert);
  const dark = img((x,y)=> Math.hypot(x-0.5,y-0.5) < 0.4 ? [20,20,20,255] : [255,255,255,255]);
  chk('тёмный рисунок на белом — тоже (фон светлее)', analyzeLogoImageData(dark, S).suggestedInvert === true);
  const lightOnBlack = img((x,y)=> Math.hypot(x-0.5,y-0.5) < 0.4 ? [240,240,240,255] : [10,10,10,255]);
  chk('светлый на чёрном — без invert', analyzeLogoImageData(lightOnBlack, S).suggestedInvert === false);
  // an empty picture must not throw or divide by zero
  const blank = img(()=>[0,0,0,0]);
  const b = analyzeLogoImageData(blank, S);
  chk('пустая картинка не роняет', !!b.heightmap && b.heightmap.length === S*S);
  chk('и не объявляет тонов', !b.stats.manyTones && b.stats.tones === 0, b.stats);
  const solid = img(()=>[128,128,128,255]);
  chk('однотонная непрозрачная не роняет', !!analyzeLogoImageData(solid, S).heightmap);
}

console.log('=== три тона нельзя показать двумя уровнями ===');
{
  // The user's shield, measured off the real PNG: a near-black outline (luma 0.06, 14% of the opaque
  // pixels), a grey panel (0.19, 46%) and red (0.32, 39%), all on transparency. Three tones means three
  // boundaries, and ONE threshold can show at most one of them — which is why the printed model was its
  // own outline even after the detail channel was added. The threshold also lands catastrophically here:
  // stretched over p10..p90 the grey panel normalises to 0.509, a thousandth above a 50% cut, so grey and
  // red fuse and the only thing left "off" is the thin outline.
  const shield = img((x,y)=>{
    const dx=Math.abs(x-0.5), dy=y-0.5;
    if(dx > 0.45 || dy < -0.45 || dy > 0.45) return [0,0,0,0];
    if(dx > 0.36 || dy > 0.36) return [192,32,48,255];    // red border          luma 0.320
    if(dx > 0.30 || dy > 0.30) return [16,16,16,255];     // near-black outline  luma 0.063
    return [48,48,48,255];                                // grey panel          luma 0.188
  });
  const two = analyzeLogoImageData(shield, S, 'detail', 2);
  const three = analyzeLogoImageData(shield, S, 'detail', 3);
  const at = (hm,x,y) => hm[Math.floor(y*S)*S + Math.floor(x*S)];
  // Probed along the middle row, where all three bands are present: |dx| > 0.36 red, 0.30..0.36 outline,
  // below that the panel, beyond 0.45 the transparent background.
  const P = {out:[0.98,0.5], red:[0.90,0.5], outline:[0.83,0.5], panel:[0.5,0.5]};
  const v = (r,k) => at(r.heightmap, P[k][0], P[k][1]);

  chk('три тона распознаны как три', three.stats.tones === 3, three.stats.tones);
  chk('и авто выбирает по ним «детали»', analyzeLogoImageData(shield, S).stats.chose === 'detail');
  // Sanity on the probes themselves: at two levels they are what the old code produced, or the points are
  // not where this test claims they are.
  chk('точки замера стоят на своих полосах',
      v(two,'out') === 0 && v(two,'panel') > 0 && v(two,'red') === 1,
      [v(two,'out'), v(two,'outline'), v(two,'panel'), v(two,'red')]);

  // The complaint, stated so it does not depend on luck. Three tones have three pairs, and a single cut
  // can put at most ONE pair on opposite sides — the other two fuse whatever the proportions happen to be.
  // (WHICH pair survives is luck: on this drawing the panel normalises to 0.487 and separates from the
  // red; on the user's real shield the same panel lands at 0.509 and fuses with it instead. That is the
  // argument against thresholding a three-tone picture at all, not a property worth asserting.)
  const heights = (r, cut) => new Set([v(r,'outline'), v(r,'panel'), v(r,'red')]
                                        .map(h => cut ? (h > 0.5 ? 1 : 0) : +h.toFixed(6))).size;
  chk('одним порогом три тона дают только две высоты — два тона обязаны слиться',
      heights(two, true) === 2, [v(two,'outline'), v(two,'panel'), v(two,'red')]);
  chk('тремя ступенями — три высоты, сливаться нечему',
      heights(three, false) === 3, [v(three,'outline'), v(three,'panel'), v(three,'red')]);
  // At three they are three different heights, and the background is still flush.
  const hs = [v(three,'out'), v(three,'outline'), v(three,'panel'), v(three,'red')];
  chk('на трёх — три разные высоты', new Set(hs.map(h=>h.toFixed(3))).size === 4, hs);
  chk('фон заподлицо', hs[0] === 0, hs[0]);
  chk('темнее — ниже, светлее — выше', hs[0] < hs[1] && hs[1] < hs[2] && hs[2] < hs[3], hs);
  chk('самый светлый тон — на полную глубину', hs[3] === 1, hs[3]);
  chk('уровни равномерны по высоте',
      Math.abs((hs[2]-hs[1]) - (hs[3]-hs[2])) < 1e-6 && Math.abs(hs[1] - 1/3) < 1e-6, hs);

  // Levels come from the picture's own tones, not from slicing the range evenly. The proof: ask for six.
  const six = analyzeLogoImageData(shield, S, 'detail', 6);
  chk('шесть ступеней у трёхтоновой картинки не выдумываются', six.stats.tones <= 4, six.stats.tones);
  chk('и высот ровно столько, сколько тонов',
      new Set(Array.from(six.heightmap).map(h=>h.toFixed(3))).size === six.stats.tones + 1,
      six.stats.tones);
  // The floor of that claim: a picture with ONE tone answers one however many levels are demanded, and a
  // picture with two answers two. Otherwise «ступеней» would be a promise the geometry cannot keep and the
  // model would grow ledges that are not in the artwork.
  const flat1 = img((x,y)=> Math.hypot(x-0.5,y-0.5) < 0.4 ? [20,20,20,255] : [0,0,0,0]);
  const flat2 = img((x,y)=> Math.hypot(x-0.5,y-0.5) > 0.4 ? [0,0,0,0]
                                                          : (y < 0.5 ? [10,10,10,255] : [245,245,245,255]));
  for(const lv of [3,4,5,6]){
    const a = analyzeLogoImageData(flat1, S, 'detail', lv), b = analyzeLogoImageData(flat2, S, 'detail', lv);
    const hs = m => [...new Set(Array.from(m).map(v=>v.toFixed(4)))].sort();
    chk('одноцветному просили '+lv+' — получил 1', a.stats.tones === 1 && hs(a.heightmap).join()==='0.0000,1.0000',
        [a.stats.tones, hs(a.heightmap)]);
    chk('двухтоновому просили '+lv+' — получил 2',
        b.stats.tones === 2 && hs(b.heightmap).join()==='0.0000,0.5000,1.0000',
        [b.stats.tones, hs(b.heightmap)]);
  }

  // Загрузка сама ставит столько ступеней, сколько тонов: иначе про них надо ЗНАТЬ, а жалоба была
  // именно на то, что по умолчанию видно не всё.
  chk('загрузка предлагает три ступени', analyzeLogoImageData(shield, S).suggestedLevels === 3,
      analyzeLogoImageData(shield, S).suggestedLevels);
  chk('одноцветному ступени не навязываются', analyzeLogoImageData(stencil, S).suggestedLevels === 2);
  chk('рисунку без прозрачности — тоже', analyzeLogoImageData(onWhite, S).suggestedLevels === 2);
  chk('пустой картинке — тоже', analyzeLogoImageData(img(()=>[0,0,0,0]), S).suggestedLevels === 2);

  // The detection rule itself had to change, and this is why. The user's real shield spans only 0.216 of
  // luminance between its 10th and 90th percentiles — under the old «размах > 0.25» it was declared
  // single-toned and auto sent it to the silhouette channel. Tones are counted now, not measured as a
  // range: three tight but clean bands are three tones however narrow the band they sit in.
  const tight = img((x,y)=>{
    if(Math.hypot(x-0.5,y-0.5) > 0.45) return [0,0,0,0];
    return y < 0.36 ? [40,40,40,255] : y < 0.68 ? [66,66,66,255] : [92,92,92,255];  // 0.157 / 0.259 / 0.361
  });
  const tg = analyzeLogoImageData(tight, S);
  chk('узкий диапазон тонов — прежнее правило бы его не заметило', tg.stats.spread < 0.25, tg.stats.spread);
  chk('...а тона всё равно сосчитаны', tg.stats.tones === 3, tg.stats.tones);
  chk('...и канал выбран по ним', tg.stats.chose === 'detail', tg.stats.chose);
  chk('...и ступеней предложено три', tg.suggestedLevels === 3, tg.suggestedLevels);
}

console.log('=== ступени — это высоты, а не порог ===');
{
  const shield = img((x,y)=>{
    const dx=Math.abs(x-0.5), dy=y-0.5;
    if(dx > 0.45 || dy < -0.45 || dy > 0.45) return [0,0,0,0];
    if(dx > 0.36 || dy > 0.36) return [192,32,48,255];
    if(dx > 0.30 || dy > 0.30) return [16,16,16,255];
    return [48,48,48,255];
  });
  const hm = analyzeLogoImageData(shield, S, 'detail', 3).heightmap;
  // A stepped logo's height IS its value, so the geometry must multiply rather than threshold. Both
  // readings are checked here against the shipping predicate, not against a copy of it.
  chk('logoStepped считает ступенчатым всё, что выше двух',
      !logoStepped({levels:2}) && !logoStepped({}) && logoStepped({levels:3}) && logoStepped({levels:6}));
  const steppedDepth = (val, depth) => val * depth;
  chk('средний тон даёт среднюю глубину', Math.abs(steppedDepth(2/3, -0.6) + 0.4) < 1e-9);
  chk('фон даёт ноль', steppedDepth(0, -0.6) === 0);
  // ...and nothing lands between levels: every sampled height is one of the m+1 allowed ones
  const allowed = new Set([0, 1/3, 2/3, 1].map(x=>x.toFixed(6)));
  let stray = 0; for(const h of hm) if(!allowed.has(h.toFixed(6))) stray++;
  chk('промежуточных высот нет', stray === 0, stray);

  // The step, not the depth, is what has to clear a layer — three levels sharing 0.2 mm is 0.067 mm each.
  chk('шаг ступени — глубина, делённая на число ступеней', Math.abs(0.6/3 - LOGO_STEP_MM) < 1e-9);
  if(typeof collectPrintWarnings === 'function' && typeof logos !== 'undefined'){
    const saved = logos.slice();
    const mk = (levels, depth) => ({face:'+Z', u0:0, v0:0, w:20, h:20, depth, threshold:0.5, levels});
    logos.length = 0; logos.push(mk(3, -0.2));
    const shallow = collectPrintWarnings({}).filter(t => t.indexOf('ступень рельефа') === 0);
    logos.length = 0; logos.push(mk(3, -0.6));
    const okDeep = collectPrintWarnings({}).filter(t => t.indexOf('ступень рельефа') === 0);
    logos.length = 0; logos.push(mk(2, -0.05));
    const notStepped = collectPrintWarnings({}).filter(t => t.indexOf('ступень рельефа') === 0);
    logos.length = 0; for(const l of saved) logos.push(l);
    chk('о слишком мелкой ступени предупреждают', shallow.length === 1, shallow);
    chk('и называют нужную глубину', shallow.length === 1 && shallow[0].indexOf('0.6 мм') > 0, shallow);
    chk('при достаточной глубине молчат', okDeep.length === 0, okDeep);
    chk('на двух уровнях эта проверка вообще не про них', notStepped.length === 0, notStepped);
  }
}

console.log('=== ступенчатый рельеф всё ещё даёт замкнутое тело ===');
{
  // Until now a logo moved a grid vertex to one of exactly TWO heights, and every mesh test in the battery
  // was written against that. Intermediate heights are new, and "it looked right in the preview" is not an
  // answer about a mesh — so the same shield is built into real bodies and the edges are counted.
  const shield = img((x,y)=>{
    const dx=Math.abs(x-0.5), dy=y-0.5;
    if(dx > 0.45 || dy < -0.45 || dy > 0.45) return [0,0,0,0];
    if(dx > 0.36 || dy > 0.36) return [192,32,48,255];
    if(dx > 0.30 || dy > 0.30) return [16,16,16,255];
    return [48,48,48,255];
  });
  const maps = {}; for(const lv of [2,3,4,6]) maps[lv] = analyzeLogoImageData(shield, S, 'detail', lv).heightmap;
  const put = (lv, face, depth, ov) => {
    logos.length = 0; boxHoles.length = 0;
    Object.assign(paramState.box, defaultBoxParams(),
                  {width:40, height:30, depth:35, logoResolution:200}, ov || {});
    logos.push({id:1, face, u0:0, v0:0, w:20, h:20, depth, threshold:0.5, invert:false,
                rotation:0, heightmap:maps[lv], levels:lv});
    return buildTrisForShape('box', paramState.box);
  };
  const VARIANTS = {
    сплошной:{}, полый:{hollow:true}, скруглённый:{cornerRadius:4},
    squircle:{squircle:60}, наклонный:{taperXp:6, taperZp:-4},
  };
  let checked = 0, holes = [];
  for(const lv of [3, 4, 6])
    for(const face of ['+Z','-X','+Y'])
      for(const depth of [-0.6, 0.9])
        for(const vn in VARIANTS){
          const m = manifoldCheck(put(lv, face, depth, VARIANTS[vn]), 4);
          checked++;
          if(!m.watertight) holes.push({lv, face, depth, vn, open:m.openEdges, bad:m.badEdges});
        }
  chk('ступенчатый рельеф герметичен во всех '+checked+' сочетаниях', holes.length === 0, holes.slice(0,4));

  // ...and it is genuinely stepped in the SOLID, not just in the heightmap: the logo's own footprint must
  // reach three distinct depths where a two-level one reaches two. Measured off the vertices, since that
  // is what a slicer sees.
  // `half` bounds the window: 8 mm is strictly INSIDE the shield (it reaches ±9), so only its own three
  // tones are in view; 9.9 mm takes in the transparent corners too and adds the untouched face.
  const relief = (lv, half) => {
    const tris = put(lv, '+Z', -0.6, {});
    const zFace = paramState.box.depth/2, seen = new Set();
    for(const T of tris) for(const p of T)
      if(Math.abs(p[0]) < half && Math.abs(p[1]) < half && p[2] > zFace - 0.75 && p[2] <= zFace + 1e-6)
        seen.add((zFace - p[2]).toFixed(3));
    return seen;
  };
  const r2 = relief(2, 8), r3 = relief(3, 8), r3all = relief(3, 9.9);
  chk('на двух уровнях три тона дают в теле две глубины', r2.size === 2, [...r2].sort());
  chk('на трёх — три, по одной на тон', r3.size === 3, [...r3].sort());
  chk('и это ровно те высоты, что в карте',
      ['0.200','0.400','0.600'].every(d => r3.has(d)), [...r3].sort());
  chk('за краем рисунка грань не тронута', r3all.has('0.000') && r3all.size === 4, [...r3all].sort());

  // The two places that read the map as a MASK rather than a height: the standalone extruded silhouette
  // and the second-colour insert. Both want the whole footprint, so a stepped map must not lose its lower
  // levels to a 50% threshold the way a height reading would.
  const stepped = {id:1, face:'+Z', u0:0, v0:0, w:20, h:20, depth:-0.6, threshold:0.5,
                   invert:false, rotation:0, heightmap:maps[3], levels:3};
  const flat = Object.assign({}, stepped, {heightmap:maps[2], levels:2});
  const fill = m => { let n=0; for(const c of m) if(c) n++; return n/m.length; };
  const mS = buildLogoSilhouetteMask(stepped, 128), mF = buildLogoSilhouetteMask(flat, 128);
  chk('силуэт ступенчатого — не пуст', !!mS);
  chk('силуэт берёт весь отпечаток, а не верхний уровень',
      !!mS && !!mF && fill(mS) > fill(mF)*1.5, {ступенчатый:mS&&+fill(mS).toFixed(3), плоский:mF&&+fill(mF).toFixed(3)});
  chk('и это близко к доле непрозрачного', !!mS && Math.abs(fill(mS) - 0.81) < 0.06, mS && +fill(mS).toFixed(3));

  // The other mask reader: the lattice floor fills a solid patch under a logo so the artwork does not fall
  // through the net. It asks the same question — where IS the logo — and on a stepped map the answer is
  // every level, not the ones above half.
  {
    Object.assign(paramState.box, defaultBoxParams(), {width:40, height:30, depth:35});
    const maskOf = (lg) => { logos.length = 0; logos.push(lg);
      return buildCombinedLogoMaskFns(q => q)['+Z']; };   // no taper, so the frame is the flat face
    const fS = maskOf(stepped), fFl = maskOf(flat);
    const z = paramState.box.depth/2;
    // Measured against the artwork's OWN footprint over the same sample points, not against the flat
    // map — "more than the flat one" is satisfied by a threshold cut too (0.73 of 0.85), and the claim
    // being made is that no level is left out at all.
    let onS = 0, onF = 0, foot = 0, tot = 0;
    for(let a=-9.5; a<=9.5; a+=0.25) for(let b=-9.5; b<=9.5; b+=0.25){
      const p=[a,b,z]; tot++;
      if(fS(0,0,p)) onS++;
      if(fFl(0,0,p)) onF++;
      if(sampleHeightmap(maps[3], (a+10)/20, 1-(b+10)/20) > 1e-4) foot++;
    }
    chk('патч под ступенчатым логотипом — РОВНО отпечаток', onS === foot,
        {маска:+(onS/tot).toFixed(4), отпечаток:+(foot/tot).toFixed(4)});
    chk('он не пустой и не вся плита', onS/tot > 0.6 && onS/tot < 0.95, +(onS/tot).toFixed(4));
    chk('а у плоской карты патч — только верхний тон', onF < foot*0.5,
        {плоский:+(onF/tot).toFixed(4), отпечаток:+(foot/tot).toFixed(4)});
  }
}

console.log('=== глубина по умолчанию — на ступень, а не на весь рельеф ===');
{
  // 0.2 mm has always been the depth a plain logo arrives at. On a stepped one that number has to mean the
  // STEP, or the extra levels are given away for free: three of them sharing 0.2 mm sit 0.067 mm apart and
  // print as one plateau — the very complaint that started this, arriving by a different road.
  chk('без ступеней — как было', logoDefaultDepth(2) === -LOGO_STEP_MM, logoDefaultDepth(2));
  for(const lv of [3,4,5,6])
    chk(lv+' ступеней → шаг остаётся 0.2 мм',
        Math.abs(Math.abs(logoDefaultDepth(lv))/lv - LOGO_STEP_MM) < 1e-9, logoDefaultDepth(lv));
  chk('и это утоплено, а не выпукло', logoDefaultDepth(3) < 0, logoDefaultDepth(3));
  // ...and the depth it hands out is exactly the one the print warning stops complaining at
  if(typeof collectPrintWarnings === 'function' && typeof logos !== 'undefined'){
    const saved = logos.slice(); logos.length = 0;
    logos.push({face:'+Z', u0:0, v0:0, w:20, h:20, depth:logoDefaultDepth(4), threshold:0.5, levels:4});
    const said = collectPrintWarnings({}).filter(t => t.indexOf('ступень рельефа') === 0);
    logos.length = 0; for(const l of saved) logos.push(l);
    chk('умолчание не спорит с предупреждением', said.length === 0, said);
  }
}

console.log('=== TOTAL: ' + pass + ' passed, ' + fail + ' failed ===');
if(fail) process.exit(1);
