// Из какого канала картинки читается рельеф.
//
// A logo becomes relief through ONE binary decision per point — `val > threshold` — so everything the
// finished model shows has to already be in the heightmap. Which channel that heightmap comes from is
// therefore the whole game, and getting it wrong does not look like a bug: it looks like a logo that came
// out as its own outline.
//
//   СИЛУЭТ (alpha)  — the shape is where the picture is opaque. Right for text and for a one-colour icon
//                     on a transparent background; it is why letters need no invert guessing.
//   ЯРКОСТЬ (lum)   — the shape is where the picture is light. Right for a drawing with no alpha at all.
//   ДЕТАЛИ (detail) — opaque AND light. Right for a COLOURED icon on a transparent background, which the
//                     other two both flatten: alpha sees one solid silhouette and loses every line inside
//                     it, luminance sees the transparent background as black and merges it with the icon's
//                     own dark parts.
//
// The measure used throughout is not "does it look right" but how much STRUCTURE survives thresholding:
// the number of places where the mask changes value between neighbouring cells. A silhouette has a few
// hundred; the same badge read for detail has thousands. Run via ./run-all.sh.
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
  chk('прозрачность распознана там, где она есть',
      b.stats.hasTransparency && t.stats.hasTransparency && !w.stats.hasTransparency,
      [b.stats.hasTransparency, t.stats.hasTransparency, w.stats.hasTransparency]);
  chk('оба тона представлены, а не один пиксель',
      b.stats.darkFrac > 0.05 && b.stats.darkFrac < 0.95, b.stats.darkFrac);
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
  chk('и не объявляет двух тонов', !b.stats.twoTone, b.stats);
  const solid = img(()=>[128,128,128,255]);
  chk('однотонная непрозрачная не роняет', !!analyzeLogoImageData(solid, S).heightmap);
}

console.log('=== TOTAL: ' + pass + ' passed, ' + fail + ' failed ===');
if(fail) process.exit(1);
