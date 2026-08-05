// Логотип на подставке: дно, спинка снаружи, передний борт.
//
// Every other base shape gets its labels from buildLogoPlateTris, which finds a surface by asking
// outermostFlatPlaneAt for a face PERPENDICULAR TO AN AXIS that covers the whole footprint. The stand has
// neither. Its back panel is raked to whatever angle was asked for — no axis is perpendicular to it — and
// its front lip is perpendicular to Z but is a 14 mm strip inside an 85 mm bounding box, so a label
// centred on the box hangs in mid-air in front of it. Between them that left exactly one usable surface:
// the underside, the one nobody looks at. Which is what «логотипы только снизу» actually was.
//
// So the stand names its surfaces instead of searching for them, as frames — a point, two in-plane axes,
// an outward normal — and the same emitter draws the patch on all three. A raked plane is not a special
// case of anything here; it is this patch with a different basis.
//
// Two things are checked and neither of them is «it renders»: the patch has to be a CLOSED body sitting on
// the surface it names (measured by shooting a ray along the surface normal and finding the host directly
// under the relief), and the frames have to be computed from the same numbers the stand is built from
// rather than measured off the finished mesh — a frame that drifts is a label welded into a wall.
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
// A ring: it has a hole, so the mask has an interior boundary as well as an outer one.
const HM = analyzeLogoImageData(img((x,y)=>{
  const r = Math.hypot(x-0.5, y-0.5);
  return (r < 0.42 && r > 0.22) ? [240,240,240,255] : [0,0,0,0];
}), S).heightmap;

function setup(ov, lg){
  logos.length = 0; boxHoles.length = 0;
  Object.assign(paramState.box, defaultBoxParams(), {psOn:true, logoResolution:120}, ov||{});
  if(lg !== false)
    logos.push(Object.assign({id:1, face:'-Y', u0:0, v0:0, w:30, h:30, depth:0.8, threshold:0.5,
                              invert:false, rotation:0, heightmap:HM, levels:2}, lg||{}));
  return buildTrisForShape('box', paramState.box);
}
// `dot` already exists in the shipping code; these are the test's own, named apart from it.
const d3 = (a,b) => a[0]*b[0]+a[1]*b[1]+a[2]*b[2];
const add = (a,b,k) => [a[0]+b[0]*k, a[1]+b[1]*k, a[2]+b[2]*k];
// Does a ray from `o` along `d` hit any triangle of `tris` within `far`? Used to ask «is the host actually
// under this relief», which is the only question that separates a label from a floating slab.
function hits(tris, o, d, far){
  for(const T of tris){
    const e1=[T[1][0]-T[0][0],T[1][1]-T[0][1],T[1][2]-T[0][2]];
    const e2=[T[2][0]-T[0][0],T[2][1]-T[0][1],T[2][2]-T[0][2]];
    const p=[d[1]*e2[2]-d[2]*e2[1], d[2]*e2[0]-d[0]*e2[2], d[0]*e2[1]-d[1]*e2[0]];
    const det=d3(e1,p); if(Math.abs(det)<1e-12) continue;
    const t0=[o[0]-T[0][0], o[1]-T[0][1], o[2]-T[0][2]];
    const u=d3(t0,p)/det; if(u<0||u>1) continue;
    const q=[t0[1]*e1[2]-t0[2]*e1[1], t0[2]*e1[0]-t0[0]*e1[2], t0[0]*e1[1]-t0[1]*e1[0]];
    const v=d3(d,q)/det; if(v<0||u+v>1) continue;
    const s=d3(e2,q)/det; if(s>1e-6 && s<far) return true;
  }
  return false;
}

console.log('=== три поверхности, и все три замкнуты ===');
{
  let bad = [], n = 0;
  for(const psLogoOn of ['floor','back','lip'])
    for(const depth of [-0.6, 0.8])            // гравировка и выпуклость
      for(const psAngle of [30, 45, 62, 80])
        for(const w of [16, 30, 50]){
          const t = setup({psLogoOn, psAngle}, {w, h:w, depth});
          const m = manifoldCheck(t, 4); n++;
          if(!m.watertight) bad.push({psLogoOn, depth, psAngle, w, open:m.openEdges, bad:m.badEdges});
        }
  chk('все '+n+' сочетаний герметичны', bad.length === 0, bad.slice(0,4));
  chk('подставка без логотипа тоже', manifoldCheck(setup({}, false), 4).watertight);
  chk('и рельеф правда добавился',
      setup({psLogoOn:'back'}).length > setup({}, false).length, [setup({psLogoOn:'back'}).length]);
}

console.log('=== рельеф лежит на своей поверхности, а не висит рядом ===');
{
  // The claim «логотип на спинке» means: standing on the relief and looking along the surface's own
  // inward normal, the stand is right there. A patch placed by a frame that drifted from the geometry it
  // names would pass every watertightness check and still be a slab hanging in the air.
  // The cable slot is a hole through the base plate ON PURPOSE, so «дно» genuinely has places with
  // nothing behind them. Turned off here rather than tolerated with a fudge factor: the claim being made
  // is «the frame lies on the surface», and a slot is a fact about the part, not slack in the claim.
  const probe = (which, ov) => { logos.length = 0;
    Object.assign(paramState.box, defaultBoxParams(), {psOn:true, psLogoOn:which}, ov||{});
    const host = buildTrisForShape('box', paramState.box);
    const fr = standLogoFrame(paramState.box, which);
    let on = 0, off = 0;
    for(let a=-0.6; a<=0.6; a+=0.3) for(let b=-0.6; b<=0.6; b+=0.3){
      const o = add(add(fr.o, fr.u, a*fr.halfU), fr.v, b*fr.halfV);
      const p = add(o, fr.n, 0.4);                          // just off the surface, outside
      if(hits(host, p, [-fr.n[0],-fr.n[1],-fr.n[2]], 6)) on++; else off++;
    }
    return {fr, on, off};
  };
  for(const which of ['floor','back','lip']){
    const {fr, on, off} = probe(which, {psSlot:0});
    chk('«'+fr.name+'»: подставка есть прямо под рамкой', off === 0, {на:on, мимо:off});
    chk('«'+fr.name+'»: рамка не выродилась', fr.halfU > 4 && fr.halfV > 2, [fr.halfU, fr.halfV]);
    // the normal is a unit vector — the emitter multiplies depths by it, so a short one shrinks the relief
    chk('«'+fr.name+'»: нормаль единичная', Math.abs(Math.hypot(...fr.n) - 1) < 1e-9, Math.hypot(...fr.n));
    chk('«'+fr.name+'»: оси перпендикулярны нормали',
        Math.abs(d3(fr.u, fr.n)) < 1e-9 && Math.abs(d3(fr.v, fr.n)) < 1e-9, [d3(fr.u,fr.n), d3(fr.v,fr.n)]);
    chk('«'+fr.name+'»: оси единичные и перпендикулярны друг другу',
        Math.abs(Math.hypot(...fr.u)-1) < 1e-9 && Math.abs(Math.hypot(...fr.v)-1) < 1e-9 &&
        Math.abs(d3(fr.u, fr.v)) < 1e-9, [Math.hypot(...fr.u), Math.hypot(...fr.v), d3(fr.u,fr.v)]);
  }
  // ...and the slot really is the reason the floor is not solid everywhere, which is worth saying once:
  // otherwise the `psSlot:0` above reads as a fudge rather than as naming the hole.
  chk('вырез под кабель и правда дырявит дно', probe('floor', {psSlot:24}).off > 0,
      probe('floor', {psSlot:24}).off);
  chk('а спинке и борту он безразличен',
      probe('back', {psSlot:24}).off === 0 && probe('lip', {psSlot:24}).off === 0);
}

console.log('=== спинка правда наклонена, и наружу, а не внутрь ===');
{
  for(const psAngle of [30, 45, 62, 80]){
    Object.assign(paramState.box, defaultBoxParams(), {psOn:true, psAngle});
    const fr = standLogoFrame(paramState.box, 'back');
    // The panel's own rake: its up-the-face axis leans by exactly the angle asked for.
    const lean = Math.atan2(fr.v[1], -fr.v[2]) * 180/Math.PI;
    chk(psAngle+'°: ось спинки под этим углом', Math.abs(lean - psAngle) < 1e-6, lean);
    // ...and the normal points AWAY from the device, which leans on the other face. If it pointed inward
    // the relief would be under the phone: invisible, and the phone would rock on it.
    chk(psAngle+'°: нормаль смотрит назад-вверх', fr.n[2] > 0 && fr.n[1] > 0, fr.n);
    chk(psAngle+'°: нормаль перпендикулярна оси', Math.abs(d3(fr.n, fr.v)) < 1e-9, d3(fr.n, fr.v));
  }
  // the floor looks down and the lip looks forward — the two surfaces a person actually sees
  Object.assign(paramState.box, defaultBoxParams(), {psOn:true});
  chk('дно смотрит вниз', standLogoFrame(paramState.box,'floor').n[1] === -1);
  chk('борт смотрит вперёд', standLogoFrame(paramState.box,'lip').n[2] === -1);
  chk('неизвестная поверхность — это дно (а не пустота)',
      JSON.stringify(standLogoFrame(paramState.box,'нет такой')) ===
      JSON.stringify(standLogoFrame(paramState.box,'floor')));
}

console.log('=== рамка следует за размерами, а не за одним набором чисел ===');
{
  // Every frame is derived from the stand's own parameters, so changing one has to move it. A frame
  // computed once and left behind is the failure this catches.
  const at = (ov, which) => { Object.assign(paramState.box, defaultBoxParams(), {psOn:true}, ov);
                              return standLogoFrame(paramState.box, which); };
  chk('шире подставка — шире рамка дна', at({psW:150},'floor').halfU > at({psW:80},'floor').halfU + 30);
  chk('шире подставка — шире рамка борта', at({psW:150},'lip').halfU > at({psW:80},'lip').halfU + 30);
  chk('выше борт — выше его рамка', at({psLip:40},'lip').halfV > at({psLip:14},'lip').halfV + 12);
  chk('длиннее спинка — длиннее её рамка', at({psRest:140},'back').halfV > at({psRest:70},'back').halfV + 30);
  chk('глубже основание — глубже рамка дна', at({psDepth:200},'floor').halfV > at({psDepth:85},'floor').halfV + 55);
  chk('угол рамку дна не трогает',
      at({psAngle:30},'floor').halfV === at({psAngle:80},'floor').halfV);
  // ...and every frame stays INSIDE the finished part, which is what «на поверхности» has to mean
  for(const which of ['floor','back','lip'])
    for(const ov of [{}, {psW:150}, {psLip:40}, {psRest:140}, {psAngle:35}, {psDepth:200}]){
      const fr = at(ov, which);
      logos.length = 0; const host = buildTrisForShape('box', paramState.box);
      const lo=[1e9,1e9,1e9], hi=[-1e9,-1e9,-1e9];
      for(const T of host) for(const v of T) for(let k=0;k<3;k++){ if(v[k]<lo[k])lo[k]=v[k]; if(v[k]>hi[k])hi[k]=v[k]; }
      let outside = 0;
      for(const a of [-1,1]) for(const b of [-1,1]){
        const c = add(add(fr.o, fr.u, a*fr.halfU), fr.v, b*fr.halfV);
        for(let k=0;k<3;k++) if(c[k] < lo[k]-0.01 || c[k] > hi[k]+0.01) outside++;
      }
      chk('«'+which+'» '+JSON.stringify(ov)+': углы рамки внутри детали', outside === 0, outside);
    }
}

console.log('=== шов: рисунок, доходящий до края заплатки ===');
{
  // The bug this found, stated so it stays found. A wall's side edge is shared with everything meeting
  // that vertical line, so every wall touching it must cut it in the same places — the rule the keycap
  // insert needed in v186. A patch whose mask reaches its own border has three walls on one line: the
  // border wall running the full height, its neighbour along the border stopping at the field, and the
  // interior wall starting there. Two cut lines, one of them missing, and the slab opens.
  //
  // Nothing hit this before because the label plate always sizes its patch to the artwork's own extent,
  // so the transparent margin kept the border clear. A stand's 14 mm front lip clamps the patch SMALLER
  // than the logo, and then the artwork runs off all four sides.
  const fr = {o:[0,0,0], u:[1,0,0], v:[0,1,0], n:[0,0,-1]};
  const run = (N, M, fill, hi, lo) => {
    const mask = new Uint8Array(N*M);
    for(let j=0;j<M;j++) for(let i=0;i<N;i++) if(fill(i,j,N,M)) mask[j*N+i]=1;
    for(let ch=true; ch; ){ ch=false;
      for(let j=0;j+1<M;j++) for(let i=0;i+1<N;i++){
        const a=mask[j*N+i],b=mask[j*N+i+1],c=mask[(j+1)*N+i],d=mask[(j+1)*N+i+1];
        if(a&&d&&!b&&!c){ mask[j*N+i+1]=1; ch=true; } else if(b&&c&&!a&&!d){ mask[j*N+i]=1; ch=true; } } }
    const U=i=>-15+(i/N)*30, V=j=>-6+(j/M)*12;
    return manifoldCheck(reliefSlabTris(mask,N,M,U,V,hi,lo,-0.8,fr), 4);
  };
  chk('рисунок внутри — замкнуто', run(40,20,(i,j,N,M)=>Math.hypot(i-N/2,(j-M/2)*2)<12, 0.8, -0.15).watertight);
  chk('полоса до верхнего и нижнего края', run(40,20,(i,j,N)=>Math.abs(i-N/2)<8, 0.8, -0.15).watertight);
  chk('полоса до левого и правого', run(40,20,(i,j,N,M)=>Math.abs(j-M/2)<4, 0.8, -0.15).watertight);
  chk('половина заплатки', run(40,20,(i,j,N)=>i<N/2, 0.8, -0.15).watertight);
  chk('заплатка залита целиком', run(40,20,()=>true, 0.8, -0.15).watertight);
  chk('рисунок шире заплатки', run(280,120,(i,j,N,M)=>Math.hypot((i-N/2)*30/N,(j-M/2)*12/M)<6, 0.8, -0.15).watertight);
  // ...and the ENGRAVED case, where the field stands ABOVE the glyph and the cut line is the other one
  chk('гравировка: полоса до края', run(40,20,(i,j,N)=>Math.abs(i-N/2)<8, 0.6, 1.2).watertight);
  chk('гравировка: половина заплатки', run(40,20,(i,j,N)=>i<N/2, 0.6, 1.2).watertight);
  chk('гравировка: рисунок шире заплатки',
      run(280,120,(i,j,N,M)=>Math.hypot((i-N/2)*30/N,(j-M/2)*12/M)<6, 0.6, 1.2).watertight);
}

console.log('=== подставка ушла из общей плиты, и это намеренно ===');
{
  chk('подставки нет в LOGO_PLATE_MODES', !LOGO_PLATE_MODES.has('stand'));
  chk('но остальные там остались', LOGO_PLATE_MODES.has('funnel') && LOGO_PLATE_MODES.has('gear'));
  chk('поверхностей ровно три', STAND_LOGO_SURFACES.length === 3, STAND_LOGO_SURFACES);
  const row = SHAPE_PARAMS.box.find(r => r.key === 'psLogoOn');
  chk('в панели есть выбор поверхности', !!row && row.type === 'select', row && row.type);
  chk('и он предлагает ровно их',
      !!row && row.options.map(o=>o.v).join() === STAND_LOGO_SURFACES.join(),
      row && row.options.map(o=>o.v));
  chk('у каждой человеческое имя', !!row && row.options.every(o => o.t && o.t.length > 3));
  chk('по умолчанию — дно (как было)', !!row && row.default === 'floor');
  chk('строка видна только на подставке',
      sectionRelevant('Подставка (телефон / планшет)', 'coaster', false) === false &&
      sectionRelevant('Подставка (телефон / планшет)', 'stand', false) === true);
}

console.log('=== поверхность берётся с КАРТОЧКИ логотипа, а не одна на всех ===');
{
  /* До v17.1.3 подставка читала только `psLogoOn`, а поле грани на карточке не читала вовсе: список
     менялся, перерисовка шла, рельеф оставался на дне. Проверяется не «поменялась ли сетка» — она
     поменялась бы и от сдвига на миллиметр, — а ГДЕ оказался патч: его центр обязан лечь на начало
     координат той рамки, которую подставка называет этим именем. */
  const d3b = (a,b) => a[0]*b[0]+a[1]*b[1]+a[2]*b[2];
  const centre = t => { const c=[0,0,0]; let n=0;
    for(const T of t) for(const q of T){ c[0]+=q[0]; c[1]+=q[1]; c[2]+=q[2]; n++; }
    return [c[0]/n, c[1]/n, c[2]/n]; };
  const p = Object.assign({}, defaultBoxParams(), {psOn:true, psLogoOn:'floor'});
  const put = face => { logos.length = 0;
    logos.push({id:1, face, u0:0, v0:0, w:26, h:26, depth:0.8, threshold:0.5,
                invert:false, rotation:0, heightmap:HM, levels:2}); };
  const seen = [];
  for (const which of STAND_LOGO_SURFACES){
    put(which);
    const t = standLogoTris(p, 120);
    chk('на «'+which+'» патч построился', t.length > 0, t.length);
    const fr = standLogoFrame(p, which), c = centre(t);
    // расстояние от центра патча до ПЛОСКОСТИ рамки вдоль её нормали — рельеф лежит на ней, а не где-то
    const off = Math.abs(d3b([c[0]-fr.o[0], c[1]-fr.o[1], c[2]-fr.o[2]], fr.n));
    chk('и лёг на поверхность «'+fr.name+'», а не рядом', off < 2.5, +off.toFixed(2));
    chk('и он герметичен', manifoldCheck(t,4).watertight);
    seen.push(c);
  }
  // три поверхности — три РАЗНЫХ места: иначе проверка выше прошла бы и на одной-единственной
  for (let i=0;i<seen.length;i++) for (let j=i+1;j<seen.length;j++)
    chk('«'+STAND_LOGO_SURFACES[i]+'» и «'+STAND_LOGO_SURFACES[j]+'» — разные места',
        Math.hypot(seen[i][0]-seen[j][0], seen[i][1]-seen[j][1], seen[i][2]-seen[j][2]) > 5,
        [seen[i].map(v=>+v.toFixed(1)), seen[j].map(v=>+v.toFixed(1))]);
  // карточка, сохранённая до v17.1.3, несёт ОСЬ — она обязана вести себя ровно как раньше
  for (const axis of ['-Z','+X','+Y']){
    put(axis);
    chk('старая карточка с осью «'+axis+'» падает на psLogoOn',
        standLogoSurface(logos[0], p) === 'floor', standLogoSurface(logos[0], p));
    chk('и на «спинку», если так стоит по умолчанию',
        standLogoSurface(logos[0], Object.assign({}, p, {psLogoOn:'back'})) === 'back');
  }
  // два логотипа — две поверхности сразу, чего одна общая настройка не позволяла в принципе
  {
    logos.length = 0;
    logos.push({id:1, face:'floor', u0:0, v0:0, w:26, h:26, depth:0.8, threshold:0.5, invert:false, rotation:0, heightmap:HM, levels:2});
    logos.push({id:2, face:'back',  u0:0, v0:0, w:26, h:26, depth:0.8, threshold:0.5, invert:false, rotation:0, heightmap:HM, levels:2});
    const t = standLogoTris(p, 120);
    chk('два логотипа на разных поверхностях строятся вместе', t.length > 0);
    chk('и вместе они герметичны', manifoldCheck(t,4).watertight, manifoldCheck(t,4));
    const whole = buildTrisForShape('box', Object.assign({}, p));
    chk('и вся подставка с ними тоже', manifoldCheck(whole,4).watertight, manifoldCheck(whole,4));
  }
  // и карточка предлагает ровно то, на что построитель отзывается
  {
    const st = facesForShape(Object.assign({}, defaultBoxParams(), {psOn:true}));
    chk('на подставке карточка предлагает её поверхности', st.join() === STAND_LOGO_SURFACES.join(), st);
    const box = facesForShape(defaultBoxParams());
    chk('а на кубе — по-прежнему оси', box.join() === ALL_FACES.join(), box);
    chk('у каждой поверхности есть подпись и подписи осей смещения',
        STAND_LOGO_SURFACES.every(f => FACE_LABELS[f] && FACE_LABELS[f].length > 2 &&
                                       FACE_AXIS_LABELS[f] && FACE_AXIS_LABELS[f].length === 2),
        STAND_LOGO_SURFACES.map(f => [FACE_LABELS[f], FACE_AXIS_LABELS[f]]));
  }
  logos.length = 0;
}

console.log('=== цветная печать (AMS) на подставке ===');
{
  /* «+ Цвет N (AMS)» на подставке до v17.1.4 давал модель из НУЛЯ треугольников — молча. Общий блок
     цветной наклейки перехватывал управление и искал плоскость, перпендикулярную оси; у спинки такой
     нет, поиск возвращал пусто, и пусто уходило в модель. Теперь подставка разбирает свой логотип на
     цвета сама, своими же названными рамками.

     Меряется не «непусто ли»: цвета обязаны ЗАМОСТИТЬ карман — их лица в сумме дают ровно площадь
     рисунка, и ни одно не лежит на другом. Рисунок поэтому диск: его площадь известна точно. */
  const RAD = 0.42;
  const three = (() => { const h = new Float32Array(S*S);
    for(let j=0;j<S;j++) for(let i=0;i<S;i++){
      const x=(i+0.5)/S-0.5, y=(j+0.5)/S-0.5, r=Math.hypot(x,y);
      h[j*S+i] = r<0.18 ? 1 : (r<0.30 ? 0.66 : (r<RAD ? 0.33 : 0)); }
    return h; })();
  const putAms = (face, WLOG) => { logos.length = 0; boxHoles.length = 0;
    logos.push({id:1, face, u0:0, v0:0, w:WLOG, h:WLOG, depth:-0.6, threshold:0.5, invert:false,
                rotation:0, heightmap:three, levels:4, chan:'detail',
                tones:['#101010','#404040','#BB1828']}); };
  const P = ov => Object.assign({}, defaultBoxParams(), {psOn:true}, ov);
  // площадь граней, смотрящих по нормали рамки и лежащих на заданном от неё отступе
  const faceArea = (t, n, at) => { let a = 0;
    for(const T of t){
      const u=[T[1][0]-T[0][0],T[1][1]-T[0][1],T[1][2]-T[0][2]];
      const v=[T[2][0]-T[0][0],T[2][1]-T[0][1],T[2][2]-T[0][2]];
      const c=[u[1]*v[2]-u[2]*v[1], u[2]*v[0]-u[0]*v[2], u[0]*v[1]-u[1]*v[0]], L=Math.hypot(c[0],c[1],c[2]);
      if(L<1e-12 || (c[0]*n[0]+c[1]*n[1]+c[2]*n[2])/L < 0.999) continue;
      if(Math.abs(T[0][0]*n[0]+T[0][1]*n[1]+T[0][2]*n[2] - at) > 1e-5) continue;
      a += L/2; }
    return a; };
  for (const face of STAND_LOGO_SURFACES){
    /* Размер рисунка — под саму поверхность. Передний борт это полоска 14 мм высотой, и логотип 30 мм
       на нём ОБРЕЗАЕТСЯ рамкой; это правильно, но тогда диск перестаёт быть диском, и сверять его
       площадь с π r² уже нечестно. Поэтому на каждой поверхности берётся то, что на ней помещается. */
    const fr0 = standLogoFrame(P({}), face);
    const WLOG = Math.min(fr0.halfU, fr0.halfV)*2*0.9;
    putAms(face, WLOG);
    const inks = logoInks(logos[0]);
    chk(face+': тонов у рисунка три', inks.levels.length === 3, inks.levels.length);
    const body = buildTrisForShape('box', P({logoAms:'body'}));
    chk(face+': тело с карманом герметично', manifoldCheck(body,4).watertight, manifoldCheck(body,4));
    const parts = [];
    for (let k = 1; k <= inks.levels.length; k++) parts.push(buildTrisForShape('box', P({logoAms:'ink'+k})));
    chk(face+': ни один цвет не пуст', parts.every(t => t.length > 0), parts.map(t=>t.length));
    chk(face+': каждый цвет — замкнутое тело', parts.every(t => manifoldCheck(t,4).watertight),
        parts.map(t => manifoldCheck(t,4).openEdges));
    /* Цветная деталь — ТОЛЬКО пробки. Считать треугольники тут нельзя: у мелкой поверхности подставка
       дешевле сетки пробки. Меряется ГАБАРИТ — пробки обязаны уместиться в пятно логотипа, а не
       раскинуться на всю подставку. */
    const bb = t => { const lo=[1e9,1e9,1e9], hi=[-1e9,-1e9,-1e9];
      for(const T of t) for(const q of T) for(let a=0;a<3;a++){ lo[a]=Math.min(lo[a],q[a]); hi[a]=Math.max(hi[a],q[a]); }
      return Math.max(hi[0]-lo[0], hi[1]-lo[1], hi[2]-lo[2]); };
    const bodySpan = bb(body);
    chk(face+': цвет не тащит за собой подставку',
        parts.every(t => bb(t) < Math.max(WLOG*1.6, bodySpan*0.5)),
        {цвета:parts.map(t=>+bb(t).toFixed(1)), подставка:+bodySpan.toFixed(1), рисунок:+WLOG.toFixed(1)});
    // и вместе они дают ровно площадь рисунка — ни нахлёста, ни щелей
    const fr = standLogoFrame(P({}), face);
    const at = fr.o[0]*fr.n[0] + fr.o[1]*fr.n[1] + fr.o[2]*fr.n[2];
    const sum = parts.reduce((a,t) => a + faceArea(t, fr.n, at + 1.2), 0);
    const truth = Math.PI*(RAD*WLOG)*(RAD*WLOG);
    chk(face+': цвета замостили рисунок целиком', Math.abs(sum/truth - 1) < 0.03,
        {сумма:+sum.toFixed(1), рисунок:+truth.toFixed(1)});
    // …и ровно тот же ответ со стороны ТЕЛА: дно его кармана и лица пробок — одна площадь
    chk(face+': и это ровно дно кармана в теле',
        Math.abs(sum - faceArea(body, fr.n, at + 0.6)) < Math.max(1, sum*0.03),
        {пробки:+sum.toFixed(1), карман:+faceArea(body, fr.n, at + 0.6).toFixed(1)});
    // цвета, которого у рисунка нет, не существует — а не «есть, но пустой»
    chk(face+': четвёртого цвета нет', buildTrisForShape('box', P({logoAms:'ink4'})).length === 0);
  }
  /* Пробка обязана ЗАЙТИ за дно кармана, а не упереться в него: касание по грани — это не объединение,
     между телами ноль материала, и слайсер получает щель ровно по контуру рисунка. */
  {
    putAms('back', 30);
    const fr = standLogoFrame(P({}), 'back');
    const at = fr.o[0]*fr.n[0] + fr.o[1]*fr.n[1] + fr.o[2]*fr.n[2];
    const t = buildTrisForShape('box', P({logoAms:'ink1'}));
    let deep = Infinity;
    for(const T of t) for(const q of T) deep = Math.min(deep, q[0]*fr.n[0]+q[1]*fr.n[1]+q[2]*fr.n[2]);
    chk('пробка уходит за дно кармана, а не упирается в него', deep < at + 0.6 - 0.1,
        {дно:+(at+0.6).toFixed(2), пробка:+deep.toFixed(2)});
  }
  /* ВЫПУКЛЫЙ логотип с цветом: у приложения на этот случай своё правило — бляшка не нужна, пробкой
     становится сама надпись. Подставка обязана вести себя так же, а не заводить своё. */
  {
    logos.length = 0;
    logos.push({id:1, face:'back', u0:0, v0:0, w:30, h:30, depth:0.8, threshold:0.5, invert:false,
                rotation:0, heightmap:three, levels:4, chan:'detail', tones:['#101010','#404040','#BB1828']});
    const body = buildTrisForShape('box', P({logoAms:'body'}));
    const p1 = buildTrisForShape('box', P({logoAms:'ink1'}));
    chk('выпуклый + цвет: тело герметично', manifoldCheck(body,4).watertight, manifoldCheck(body,4));
    chk('выпуклый + цвет: пробка есть и замкнута',
        p1.length > 0 && manifoldCheck(p1,4).watertight, [p1.length, manifoldCheck(p1,4)]);
    // и она стоит НАД поверхностью, а не в кармане — это и есть «пробкой становится сама надпись»
    const fr = standLogoFrame(P({}), 'back');
    const at = fr.o[0]*fr.n[0] + fr.o[1]*fr.n[1] + fr.o[2]*fr.n[2];
    let high = -Infinity;
    for(const T of p1) for(const q of T) high = Math.max(high, q[0]*fr.n[0]+q[1]*fr.n[1]+q[2]*fr.n[2]);
    /* И стоит ровно на СВОЮ глубину над поверхностью. «Выше нуля» тут мало: бляшка, поднятая под неё,
       тоже дала бы «выше», просто вместе с плитой вокруг — а её-то на выпуклом логотипе и не должно
       быть. Меряется точное превышение. */
    chk('и стоит ровно на свою высоту над поверхностью, без бляшки под ней',
        Math.abs((high - at) - 0.8) < 0.05, +(high-at).toFixed(2));
  }

  // цепочка «+ Цвет N» и группировка в 3MF подставку знают
  putAms('back', 30);
  const chain = ['body','ink1','ink2','ink3'].map(a => { const sp = assemblyMate(Object.assign({}, defaultBoxParams(), {psOn:true, logoAms:a})); return sp && sp.name; });
  chk('кнопка ведёт по цепочке цветов', chain[0] && chain[1] && chain[2] && chain[3], chain);
  chk('тело и цвет уходят в 3MF одним объектом',
      mfBodyKey({params:Object.assign({}, defaultBoxParams(), {psOn:true, logoAms:'body'}), px:0,py:0,pz:0,rx:0,ry:0,rz:0}) ===
      mfBodyKey({params:Object.assign({}, defaultBoxParams(), {psOn:true, logoAms:'ink1'}), px:0,py:0,pz:0,rx:0,ry:0,rz:0}));
  logos.length = 0;
}

console.log('=== край рельефа идёт по рисунку, а не по клеткам ===');
{
  /* Тот же замер, что у подстаканника и у наклейки: у РАСТРОВОГО круга контур равен 8r при любой мелкости
     сетки, против положенных 2πr ≈ 6.28r — на 27 % длиннее, и весь избыток и есть ступеньки. Диск взят
     именно потому, что его периметр известен точно, и вопрос — насколько близко к нему подходит мозаика. */
  const RAD = 0.4, W = 40;
  const DISC = analyzeLogoImageData(img((x,y)=>Math.hypot(x-0.5,y-0.5) < RAD ? [240,240,240,255] : [0,0,0,0]), S).heightmap;
  const p = Object.assign({}, defaultBoxParams(), {psOn:true, psLogoOn:'floor'});
  logos.length = 0; boxHoles.length = 0;
  logos.push({id:1, face:'-Y', u0:0, v0:0, w:W, h:W, depth:0.8, threshold:0.5,
              invert:false, rotation:0, heightmap:DISC, levels:2});
  const t = standLogoTris(p, 160);
  // дно смотрит в −Y, значит лицо рельефа — самая нижняя плоскость из тех, что смотрят туда же
  const nrm = T => { const u=[T[1][0]-T[0][0],T[1][1]-T[0][1],T[1][2]-T[0][2]],
                           v=[T[2][0]-T[0][0],T[2][1]-T[0][1],T[2][2]-T[0][2]];
    const c=[u[1]*v[2]-u[2]*v[1], u[2]*v[0]-u[0]*v[2], u[0]*v[1]-u[1]*v[0]], L=Math.hypot(c[0],c[1],c[2]);
    return L<1e-12 ? null : [c[0]/L,c[1]/L,c[2]/L]; };
  let ymin = 1e9;
  for(const T of t){ const n=nrm(T); if(!n || n[1] > -0.999) continue; ymin = Math.min(ymin, T[0][1]); }
  const key=(A,B)=>{const a=A.map(q=>q.toFixed(4)).join(','), b=B.map(q=>q.toFixed(4)).join(',');
    return a<b ? a+'|'+b : b+'|'+a; };
  const cnt = new Map();
  for(const T of t){ const n=nrm(T); if(!n || n[1] > -0.999 || Math.abs(T[0][1]-ymin) > 1e-6) continue;
    for(let e=0;e<3;e++){ const k=key(T[e],T[(e+1)%3]); cnt.set(k,(cnt.get(k)||0)+1); } }
  let peri=0;
  for(const [k,n] of cnt) if(n===1){ const [a,b]=k.split('|').map(q=>q.split(',').map(Number));
    peri += Math.hypot(a[0]-b[0], a[1]-b[1], a[2]-b[2]); }
  const truth = 2*Math.PI*RAD*W;
  chk('контур рельефа нашёлся', peri > truth*0.5, +peri.toFixed(2));
  chk('и идёт по окружности, а не лесенкой (лесенка это 1.27)', peri/truth < 1.12,
      {периметр:+peri.toFixed(2), истинный:+truth.toFixed(2), отношение:+(peri/truth).toFixed(3)});
  chk('и не короче истинного — срезать углы тоже нельзя', peri/truth > 0.97, +(peri/truth).toFixed(3));
  chk('патч остался замкнутым', manifoldCheck(t,4).watertight, manifoldCheck(t,4));
  logos.length = 0;
}

console.log('=== TOTAL: ' + pass + ' passed, ' + fail + ' failed ===');
if(fail) process.exit(1);
