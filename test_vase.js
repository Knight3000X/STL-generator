// Vase / lampshade (ваза, абажур): a shell of revolution through four named diameters, optionally
// facetted and twisted, through the REAL buildTrisForShape pipeline. The point of naming only four numbers
// is that the curve between them does the work, so the tests measure the silhouette the spline produced.
// Run via ./run-all.sh.
let pass=0,fail=0; function chk(n,c,e){if(c){pass++;console.log('  OK  ',n);}else{fail++;console.log('  FAIL',n,e!==undefined?JSON.stringify(e):'');}}
function vol(t){let v=0;for(const T of t){const a=T[0],b=T[1],c=T[2];v+=(a[0]*(b[1]*c[2]-b[2]*c[1])-a[1]*(b[0]*c[2]-b[2]*c[0])+a[2]*(b[0]*c[1]-b[1]*c[0]))/6;}return v;}
function base(ov){ logos.length=0; boxHoles.length=0; dieFaces.length=0;
  Object.assign(paramState.box, defaultBoxParams(), {width:40,height:40,depth:40,
    fnOn:true, fnMode:'vase', vaseH:120, vaseBaseD:60, vaseBellyD:95, vaseBellyAt:35,
    vaseNeckD:55, vaseNeckAt:75, vaseMouthD:70, vaseFacets:0, vaseTwist:0, vaseFloor:true, fnWall:2,
    pbPart:'none',woBack:'none',hookMount:'none',mntMode:'none',gearMode:'none',pipMode:'none',psOn:false,
    threadMode:'none',sheetShape:'none',keycapMode:'none',platonic:'none',polyN:0,binRound:0,
    scoopDir:'none',labelTab:'none',mountHoles:'none',gripWall:'none',divX:1,divZ:1,stackFeet:false,gfOn:false}, ov);
  return buildTrisForShape('box',paramState.box); }

// Outer radius at a given fraction of the height, straight off the mesh.
function radiusAt(t, frac){
  const B=computeBBox(t), y=B.minY+(B.maxY-B.minY)*frac;
  let r=0;
  for(const T of t) for(const v of T)
    if(Math.abs(v[1]-y) < (B.maxY-B.minY)*0.006) r=Math.max(r, Math.hypot(v[0],v[2]));
  return r;
}

console.log('=== watertight across facets × twist × floor × wall ===');
for(const fac of [0,3,5,6,8,12,24])
  for(const tw of [0,90,180,-360])
    for(const fl of [true,false]){
      const t=base({vaseFacets:fac,vaseTwist:tw,vaseFloor:fl}), mc=manifoldCheck(t,4);
      chk('граней'+fac+' закрутка'+tw+' дно'+fl+' watertight (+vol)', mc.watertight&&vol(t)>0,
          {open:mc.openEdges,bad:mc.badEdges});
    }
for(const ov of [{fnWall:0.8},{fnWall:8},{vaseH:20},{vaseH:300},{vaseBaseD:10},{vaseBaseD:250},
                 {vaseBellyD:10},{vaseBellyD:300},{vaseMouthD:10},{vaseNeckD:10},
                 {vaseBellyAt:5,vaseNeckAt:15},{vaseBellyAt:85,vaseNeckAt:95},
                 {vaseBellyAt:80,vaseNeckAt:20}]){
  const t=base(ov), mc=manifoldCheck(t,4);
  chk('extreme '+JSON.stringify(ov)+' watertight', mc.watertight&&vol(t)>0, {open:mc.openEdges,bad:mc.badEdges});
}

console.log('=== the silhouette hits the diameters it was given ===');
{ const t=base({vaseBaseD:60,vaseBellyD:95,vaseBellyAt:35,vaseNeckD:55,vaseNeckAt:75,vaseMouthD:70});
  const B=computeBBox(t);
  chk('height is what was asked', Math.abs((B.maxY-B.minY)-120)<0.05, {h:+(B.maxY-B.minY).toFixed(2)});
  chk('the widest point is the belly Ø', Math.abs((B.maxX-B.minX)-95)<0.6, {x:+(B.maxX-B.minX).toFixed(2)});
  for(const [frac,want,label] of [[0.005,30,'foot'],[0.35,47.5,'belly'],[0.75,27.5,'neck'],[0.995,35,'mouth']]){
    const r=radiusAt(t, frac);
    chk('at the '+label+' the radius is the one named', Math.abs(r-want)<1.2, {r:+r.toFixed(2), want});
  }
}
{ // the control heights move the features
  const low=base({vaseBellyAt:15}), high=base({vaseBellyAt:70});
  const rl=radiusAt(low,0.15), rh=radiusAt(high,0.70);
  chk('the belly sits where it is placed', Math.abs(rl-47.5)<1.5 && Math.abs(rh-47.5)<1.5,
      {low:+rl.toFixed(1), high:+rh.toFixed(1)}); }
{ // between control points it is a CURVE, not a straight cone: the midpoint departs from the chord
  const t=base({vaseBaseD:40,vaseBellyD:100,vaseBellyAt:50,vaseNeckD:40,vaseNeckAt:99,vaseMouthD:40});
  const rMid=radiusAt(t, 0.25), chord=(20+50)/2;
  chk('the profile bulges away from the straight line between controls', Math.abs(rMid-chord)>1.0,
      {mid:+rMid.toFixed(2), chord}); }

console.log('=== it is a shell, and the floor is a floor ===');
{ const solidish=vol(base({fnWall:8})), thin=vol(base({fnWall:0.8}));
  chk('a thicker wall is more material', solidish>thin*2, {thin:+thin.toFixed(0),thick:+solidish.toFixed(0)});
  const B=computeBBox(base());
  const outerVol=Math.PI*Math.pow(47.5,2)*120;
  chk('and it is nowhere near solid', vol(base()) < outerVol*0.35, {v:+vol(base()).toFixed(0)}); }
{ const withFloor=vol(base({vaseFloor:true})), open=vol(base({vaseFloor:false}));
  chk('the floor adds material', withFloor>open, {withFloor:+withFloor.toFixed(0),open:+open.toFixed(0)});
  chk('and switching it off is what makes a lampshade', withFloor-open > 1000,
      {d:+(withFloor-open).toFixed(0)}); }

console.log('=== facets and twist ===');
{ const round=computeBBox(base({vaseFacets:0})), hex=computeBBox(base({vaseFacets:6}));
  chk('a facetted vase is inscribed in the round one', (hex.maxX-hex.minX) <= (round.maxX-round.minX)+1e-6,
      {round:+(round.maxX-round.minX).toFixed(2), hex:+(hex.maxX-hex.minX).toFixed(2)});
  chk('and holds less', vol(base({vaseFacets:6})) < vol(base({vaseFacets:0})), {}); }
{ // more facets converge on the circle
  const vs=[3,6,12,24].map(n=>vol(base({vaseFacets:n})));
  const rnd=vol(base({vaseFacets:0}));
  chk('more facets → closer to round', vs[0]<vs[1] && vs[1]<vs[2] && vs[2]<vs[3] && vs[3]<rnd*1.001,
      vs.map(v=>+v.toFixed(0))); }
{ // twist has to actually turn the section: compare the widest direction low down vs high up
  const dirAt=(t,frac)=>{ const B=computeBBox(t), y=B.minY+(B.maxY-B.minY)*frac;
    let best=0, ang=0;
    for(const T of t) for(const v of T) if(Math.abs(v[1]-y)<(B.maxY-B.minY)*0.006){
      const r=Math.hypot(v[0],v[2]); if(r>best){ best=r; ang=Math.atan2(v[2],v[0]); } }
    return ang; };
  const straight=base({vaseFacets:6,vaseTwist:0}), turned=base({vaseFacets:6,vaseTwist:180});
  const dS=Math.abs(dirAt(straight,0.15)-dirAt(straight,0.85));
  const dT=Math.abs(dirAt(turned,0.15)-dirAt(turned,0.85));
  chk('without twist the section keeps its orientation', dS < 0.2, {d:+dS.toFixed(3)});
  chk('with twist it turns', dT > 0.2, {d:+dT.toFixed(3)}); }
{ const a=vol(base({vaseFacets:6,vaseTwist:0})), b=vol(base({vaseFacets:6,vaseTwist:360}));
  chk('twisting does not change how much it holds, much', Math.abs(a-b) < a*0.05,
      {a:+a.toFixed(0), b:+b.toFixed(0)}); }
{ const t=base({vaseFacets:0,vaseTwist:270});
  chk('twist on a round vase is a no-op, not a defect', manifoldCheck(t,4).watertight &&
      Math.abs(vol(t)-vol(base({vaseFacets:0,vaseTwist:0})))<1e-9, {}); }

/* ============ РЕЛЬЕФ СЕЧЕНИЯ (каннелюры / валики / лепестки) =======================================
   Радиус, зависящий от угла. Проверяется не «строится ли» — построится и герметичная ваза, у которой
   рельеф ушёл наружу за названный габарит, а внутрь не прорезался вовсе. Меряется:
     • габарит: рельеф обязан только УБАВЛЯТЬ радиус, иначе названный Ø перестаёт что-либо значить;
     • глубина: она обязана быть В СЕТКЕ, а не только в формуле;
     • стенка: рельеф вычитается снаружи и изнутри одинаково, значит толщина не меняется;
     • излом: лепесток от валика отличается НЕ глубиной, а тем, что в ложбине у него угол, а не касание;
     • предел: глубже стенки резать нечего, и срезанная глубина обязана быть названа вслух. */

// Радиусы в тонком слое на доле высоты: наружный максимум и внутренний минимум сразу.
function radiiAt(t, frac){
  const B=computeBBox(t), y=B.minY+(B.maxY-B.minY)*frac, tol=(B.maxY-B.minY)*0.006;
  let mx=0, mn=1e9;
  for(const T of t) for(const v of T) if(Math.abs(v[1]-y)<tol){
    const r=Math.hypot(v[0],v[2]); if(r>mx)mx=r; if(r<mn)mn=r; }
  return {mx, mn};
}
// Угол наружного гребня в слое: наибольший радиус по угловым корзинам.
function crestAngle(t, frac, bins){
  const B=computeBBox(t), y=B.minY+(B.maxY-B.minY)*frac, tol=(B.maxY-B.minY)*0.006;
  const best=new Float64Array(bins);
  for(const T of t) for(const v of T) if(Math.abs(v[1]-y)<tol){
    const a=Math.atan2(v[2],v[0]), i=((Math.round(a/(2*Math.PI)*bins)%bins)+bins)%bins;
    const r=Math.hypot(v[0],v[2]); if(r>best[i]) best[i]=r; }
  let bi=0; for(let i=1;i<bins;i++) if(best[i]>best[bi]) bi=i;
  return bi/bins*2*Math.PI;
}
// Луч вдоль Y через точку (x,z): чем занят столбик. (p→Z, q→X при ax=1.)
function solidRunsY(tris, x, z){
  const ax=1, u=2, v=0, p=z, q=x, hits=[];
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
    else if(prev>0 && depth<=0){ if(start!==null && t0-start>1e-6) runs.push([start,t0]); start=null; } }
  return runs;
}

console.log('=== рельеф: герметичность по всему диапазону ===');
// Развёртка гоняется на НИЗКОЙ вазе (H40): проверяется здесь сшивка оболочки, а она не зависит от того,
// сколько слоёв профиля их между собой разделяет, — а вот считается такая ваза втрое быстрее.
for(const kind of ['flute','rib','lobe'])
  for(const n of [2,3,8,48])
    for(const sh of [0,0.5,1])
      for(const fl of [true,false]){
        const t=base({vaseH:40,vaseRelief:kind,vaseReliefN:n,vaseReliefD:3,vaseReliefSharp:sh,vaseFloor:fl});
        const mc=manifoldCheck(t,4);
        chk(kind+' n'+n+' острота'+sh+' дно'+fl+' watertight (+vol)', mc.watertight&&vol(t)>0,
            {open:mc.openEdges,bad:mc.badEdges});
      }
for(const ov of [{vaseRelief:'rib',vaseReliefD:3,vaseTwist:360},{vaseRelief:'lobe',vaseReliefD:6,vaseReliefN:5,vaseTwist:-180},
                 {vaseRelief:'flute',vaseReliefD:3,vaseFacets:6},{vaseRelief:'rib',vaseReliefD:2,vaseFacets:5,vaseTwist:90},
                 {vaseRelief:'flute',vaseReliefD:60},{vaseRelief:'lobe',vaseReliefD:3,fnWall:8},
                 {vaseRelief:'rib',vaseReliefD:3,vaseBellyD:10,vaseNeckD:10},{vaseRelief:'flute',vaseReliefD:3,vaseH:20}]){
  const t=base(Object.assign({vaseH:40},ov)), mc=manifoldCheck(t,4);
  chk('крайний случай '+JSON.stringify(ov)+' watertight', mc.watertight&&vol(t)>0, {open:mc.openEdges,bad:mc.badEdges});
}

console.log('=== названный диаметр остаётся габаритом ===');
{
  const plain=base({}), B0=computeBBox(plain), w0=B0.maxX-B0.minX;
  for(const kind of ['flute','rib','lobe'])
    for(const d of [1,4,10]){
      const B=computeBBox(base({vaseRelief:kind,vaseReliefN:12,vaseReliefD:d}));
      chk(kind+' d'+d+': ваза не вылезла за свой Ø', (B.maxX-B.minX) <= w0+0.05,
          {plain:+w0.toFixed(2), relief:+(B.maxX-B.minX).toFixed(2)});
    }
  // И не «съёжилась вся»: гребень обязан ДОСТАВАТЬ до габарита, а не остановиться под ним.
  for(const kind of ['rib','lobe']){
    const B=computeBBox(base({vaseRelief:kind,vaseReliefN:12,vaseReliefD:4}));
    chk(kind+': гребень достаёт до габарита', (B.maxX-B.minX) > w0-0.6,
        {plain:+w0.toFixed(2), relief:+(B.maxX-B.minX).toFixed(2)});
  }
}

console.log('=== глубина есть в СЕТКЕ, а не только в формуле ===');
{
  const wall=2;
  for(const kind of ['flute','rib','lobe'])
    for(const d of [1.5,4]){
      const t=base({vaseRelief:kind,vaseReliefN:12,vaseReliefD:d,fnWall:wall,vaseFloor:false});
      const r=radiiAt(t,0.5);
      // В одном слое живут и наружная поверхность (от R−d до R), и внутренняя (от R−wall−d до R−wall):
      // размах между ними — это ровно стенка плюс глубина рельефа.
      chk(kind+' d'+d+': размах слоя = стенка + глубина', Math.abs((r.mx-r.mn)-(wall+d))<0.25,
          {span:+(r.mx-r.mn).toFixed(2), want:wall+d});
    }
  const flat=radiiAt(base({fnWall:wall,vaseFloor:false}),0.5);
  chk('без рельефа размах слоя — это просто стенка', Math.abs((flat.mx-flat.mn)-wall)<0.15,
      {span:+(flat.mx-flat.mn).toFixed(2)});
  // Рельеф всегда убавляет материал, поэтому объём обязан упасть.
  const v0=vol(base({vaseFloor:false})), v1=vol(base({vaseRelief:'flute',vaseReliefN:12,vaseReliefD:4,vaseFloor:false}));
  chk('с каннелюрами объём меньше гладкого', v1<v0*0.999, {v0:+v0.toFixed(0), v1:+v1.toFixed(0)});
}

console.log('=== каннелюры и валики — разные вещи ===');
{
  /* При остроте 0.5 они и правда одно и то же с точностью до поворота на полпериода: (1−cos)/2 — это
     (1+cos)/2, сдвинутый на π/n. Разница появляется, когда пик становится УЗКИМ: у каннелюр узким
     становится ЖЁЛОБ (материал почти везде на габарите), у валиков — ГРЕБЕНЬ (материал почти везде
     утоплен). Поэтому меряется при остроте 0.9, а не 0.5 — иначе проверять было бы нечего. */
  const share = kind => {
    let hi=0, all=0;
    for(let i=0;i<3600;i++){ const a2=i/3600*2*Math.PI; all++;
      if(vaseReliefR(30,a2,{kind,n:8,sharp:0.9,depth:4}) > 30-0.4) hi++; }
    return hi/all;
  };
  // Числа посчитаны, а не выбраны на глаз: при e = 8^0.8 ≈ 5.28 порог f < 0.1 держится там, где
  // (1+cos8θ)/2 < 0.646, то есть на 0.594 окружности у каннелюр и на 0.089 у валиков.
  chk('у каннелюр на габарите больше половины окружности', share('flute')>0.5, share('flute'));
  chk('у валиков — меньше пятой части', share('rib')<0.2, share('rib'));
  chk('и разница между ними кратная', share('flute') > 5*share('rib'),
      {flute:+share('flute').toFixed(3), rib:+share('rib').toFixed(3)});
  // И это видно на сетке: узкие жёлоба уносят меньше материала, чем всё, кроме узких гребней.
  const vF=vol(base({vaseRelief:'flute',vaseReliefN:8,vaseReliefD:4,vaseReliefSharp:0.9,vaseFloor:false}));
  const vR=vol(base({vaseRelief:'rib',  vaseReliefN:8,vaseReliefD:4,vaseReliefSharp:0.9,vaseFloor:false}));
  chk('с каннелюрами материала больше, чем с валиками', vF > vR*1.05, {vF:+vF.toFixed(0), vR:+vR.toFixed(0)});
  // А при 0.5 они совпадают по объёму — и это не совпадение, а то же самое с поворотом.
  const hF=vol(base({vaseRelief:'flute',vaseReliefN:8,vaseReliefD:4,vaseReliefSharp:0.5,vaseFloor:false}));
  const hR=vol(base({vaseRelief:'rib',  vaseReliefN:8,vaseReliefD:4,vaseReliefSharp:0.5,vaseFloor:false}));
  chk('при остроте 0.5 это одна форма с поворотом', Math.abs(hF-hR) < Math.abs(hF)*0.002,
      {hF:+hF.toFixed(0), hR:+hR.toFixed(0)});
}

console.log('=== стенка под рельефом не меняется ===');
{
  // Ровно та гарантия, которую даёт строитель: рельеф вычитается одинаково из наружного и внутреннего
  // профиля, поэтому их разность — стенка — не зависит от угла.
  const wall=2;
  for(const kind of ['flute','rib','lobe']){
    const rel={kind, n:9, sharp:0.3, depth:3};
    let worst=0;
    for(let i=0;i<720;i++){ const a=i/720*2*Math.PI;
      worst=Math.max(worst, Math.abs((vaseReliefR(30,a,rel)-vaseReliefR(30-wall,a,rel))-wall)); }
    chk(kind+': толщина не зависит от угла', worst<1e-12, {worst});
  }
}

console.log('=== сколько гребней просили, столько и вышло ===');
{
  for(const n of [3,6,12]){
    const t=base({vaseRelief:'rib',vaseReliefN:n,vaseReliefD:4,vaseFloor:false,fnWall:2});
    const B=computeBBox(t), y=B.minY+(B.maxY-B.minY)*0.5, tol=(B.maxY-B.minY)*0.006, bins=n*12;
    const best=new Float64Array(bins);
    for(const T of t) for(const v of T) if(Math.abs(v[1]-y)<tol){
      const a=Math.atan2(v[2],v[0]), i=((Math.round(a/(2*Math.PI)*bins)%bins)+bins)%bins;
      const r=Math.hypot(v[0],v[2]); if(r>best[i]) best[i]=r; }
    let peaks=0; for(let i=0;i<bins;i++){
      const pv=best[(i-1+bins)%bins], cv=best[i], nx=best[(i+1)%bins];
      if(cv>pv && cv>=nx) peaks++; }
    chk('валиков по кругу ровно '+n, peaks===n, {peaks});
  }
}

console.log('=== острота меняет ФОРМУ, а не глубину ===');
{
  const wide=[], narrow=[];
  for(let i=0;i<2000;i++){ const a=i/2000*2*Math.PI;
    wide.push(vaseReliefF('rib',8,0.1,a)); narrow.push(vaseReliefF('rib',8,0.9,a)); }
  const share=arr=>arr.filter(f=>f>0.5).length/arr.length;
  chk('острый гребень уже пологого', share(narrow) < share(wide)*0.5,
      {narrow:+share(narrow).toFixed(3), wide:+share(wide).toFixed(3)});
  chk('но размах остаётся 0..1 у обоих',
      Math.abs(Math.max(...wide)-1)<1e-9 && Math.abs(Math.max(...narrow)-1)<1e-9 &&
      Math.min(...wide)>=0 && Math.min(...narrow)<1e-6);
  chk('острота 0.5 — это чистый приподнятый косинус', Math.abs(vaseReliefExp(0.5)-1)<1e-12, vaseReliefExp(0.5));
  chk('и она монотонна', vaseReliefExp(0)<vaseReliefExp(0.5) && vaseReliefExp(0.5)<vaseReliefExp(1));
}

console.log('=== лепесток отличается ИЗЛОМОМ, а не глубиной ===');
{
  /* У валика ложбина — гладкий минимум косинуса: производная там ноль, и на малом шаге радиус почти не
     меняется. У лепестка ложбина — модуль косинуса, то есть УГОЛ: на том же шаге радиус уходит линейно.
     Это и есть разница между «волна» и «лепесток», и она измеряется, а не описывается словами. */
  const n=8, d=1e-4;
  const valRib = 2*Math.PI/n/2;            // ложбина валика: cos(nθ) = −1
  const valLobe = 2*Math.PI/n/2;           // ложбина лепестка: cos(nθ/2) = 0
  const slope=(kind,v)=>Math.abs(vaseReliefF(kind,n,0.5,v+d)-vaseReliefF(kind,n,0.5,v))/d;
  // Сравнивается ОТНОШЕНИЕ: у гладкого минимума конечная разность падает вместе с шагом, у излома нет,
  // поэтому абсолютный порог был бы порогом на выбранный шаг, а не на форму.
  chk('у валика в ложбине касание (наклон падает вместе с шагом)', slope('rib',valRib) < 0.01, slope('rib',valRib));
  chk('у лепестка в ложбине излом (наклон конечный)', slope('lobe',valLobe) > 1, slope('lobe',valLobe));
  chk('и разница между ними — на три порядка', slope('lobe',valLobe) > 300*slope('rib',valRib),
      {lobe:slope('lobe',valLobe), rib:slope('rib',valRib)});
}

console.log('=== закрутка крутит рельеф ===');
{
  const n=6;
  for(const tw of [90,180,-120]){
    const t=base({vaseRelief:'rib',vaseReliefN:n,vaseReliefD:4,vaseTwist:tw,vaseFloor:false});
    const lo=crestAngle(t,0.1,n*24), hi=crestAngle(t,0.9,n*24);
    const step=2*Math.PI/n;
    // Гребень стоит там, где cos(n·(a+twist·f)) = 1, то есть с высотой уезжает на −twist·Δf.
    const want=-(tw*Math.PI/180)*0.8;
    const wrap=x=>{ let y=(x%step+step)%step; return Math.min(y, step-y); };
    chk('закрутка '+tw+'°: гребень уехал на своё', wrap(hi-lo-want)<step*0.12,
        {lo:+lo.toFixed(3), hi:+hi.toFixed(3), want:+want.toFixed(3)});
  }
  const straight=base({vaseRelief:'rib',vaseReliefN:n,vaseReliefD:4,vaseTwist:0,vaseFloor:false});
  const step=2*Math.PI/n, wrap=x=>{ let y=(x%step+step)%step; return Math.min(y, step-y); };
  chk('без закрутки гребень стоит вертикально',
      wrap(crestAngle(straight,0.9,n*24)-crestAngle(straight,0.1,n*24))<step*0.06);
}

console.log('=== глубже стенки резать нечего, и об этом сказано ===');
{
  const p1=Object.assign({},base({vaseRelief:'flute',vaseReliefD:60,fnWall:2})&&paramState.box);
  const sp=vaseSpec(p1);
  chk('глубина срезана до предела', sp.rel.depth===sp.rel.cap && sp.rel.cap<sp.rel.want, sp.rel);
  chk('и предел положителен', sp.rel.cap>0, sp.rel.cap);
  chk('о срезке сказано вслух', collectPrintWarnings(p1).some(w=>/рельеф вазы/.test(w)), collectPrintWarnings(p1));
  const p2=Object.assign({},base({vaseRelief:'flute',vaseReliefD:2,fnWall:2})&&paramState.box);
  chk('в пределах — молчит', !collectPrintWarnings(p2).some(w=>/рельеф вазы/.test(w)));
  chk('и глубина отдана как просили', Math.abs(vaseSpec(p2).rel.depth-2)<1e-9);
  // Огранка ужимает стенку, значит и предел под рельеф обязан ужаться вместе с ней.
  const cRound=vaseSpec(Object.assign({},base({vaseRelief:'flute',vaseReliefD:60})&&paramState.box)).rel.cap;
  const cFac=vaseSpec(Object.assign({},base({vaseRelief:'flute',vaseReliefD:60,vaseFacets:4})&&paramState.box)).rel.cap;
  chk('у гранёной предел меньше, чем у круглой', cFac < cRound*0.95, {cRound:+cRound.toFixed(2), cFac:+cFac.toFixed(2)});
  // И при срезанной глубине внутри всё ещё есть просвет — иначе ваза перестала бы быть сосудом.
  const t=base({vaseRelief:'flute',vaseReliefD:60,fnWall:2,vaseFloor:false});
  chk('внутри остался просвет', radiiAt(t,0.5).mn>0.3, radiiAt(t,0.5).mn);
}

console.log('=== угловая сетка кратна и граням, и гребням ===');
{
  const sp=(ov)=>vaseSpec(Object.assign({},base(ov)&&paramState.box));
  const a=sp({vaseRelief:'rib',vaseReliefN:7,vaseReliefD:3});
  chk('кратна ДВУМ периодам рельефа (гребень и ложбина оба в сетке)', a.seg%14===0, a.seg);
  chk('и выборок на гребень не меньше восьми', a.seg/7>=8, a.seg/7);
  const b=sp({vaseRelief:'rib',vaseReliefN:7,vaseReliefD:3,vaseFacets:6});
  chk('с гранями — кратна обоим', b.seg%14===0 && b.seg%6===0, b.seg);
  const c=sp({vaseFacets:6});
  chk('без рельефа правило про грани не изменилось', c.seg%6===0 && c.seg/6>=2, c.seg);
  const d=sp({vaseRelief:'rib',vaseReliefN:48,vaseReliefD:3,vaseFacets:23});
  chk('сетка не взрывается на неудобных числах', d.seg<=VASE_SEG_MAX*1.2 && d.seg%96===0, d.seg);
  /* Требование «восемь выборок на гребень» видно только там, где оно СВЯЗЫВАЕТ: у большой вазы угловая
     сетка и так под три сотни и перекрывает его сама. Поэтому мера берётся на мелкой вазе с частым
     рельефом — там правило и работает, и его отмена сразу видна. */
  const e=sp({vaseBaseD:10,vaseBellyD:10,vaseNeckD:10,vaseMouthD:10,vaseRelief:'rib',vaseReliefN:24,vaseReliefD:1});
  chk('на мелкой вазе выборок на гребень всё равно восемь', e.seg/24>=8, {seg:e.seg, per:e.seg/24});
}

console.log('=== дно не торчит наружу ===');
{
  /* Дно — диск ВНУТРИ оболочки. Огранка ужимает стенку в середине грани в cos(π/N) раз, рельеф вычитает
     глубину — и диск, посчитанный по круглому профилю, вылезал наружу воротником. `manifoldCheck` на это
     не жалуется и не может: два пересекающихся замкнутых тела герметичны по построению. Меряется лучом:
     СНАРУЖИ стенки, у самого дна, материала быть не должно. */
  const N=6, mid=Math.PI/N, wallR=30*Math.cos(Math.PI/N);   // Ø дна 60 → стенка в середине грани
  const t=base({vaseFacets:N});
  const B=computeBBox(t);
  for(const r of [wallR+0.5, wallR+2, 29.5]){
    const runs=solidRunsY(t, r*Math.cos(mid), r*Math.sin(mid));
    const atFloor=runs.some(([y0,y1]) => y0 < B.minY+0.05 && y1 < B.minY+3);
    chk('гранёная: на R='+r.toFixed(1)+' (стенка '+wallR.toFixed(2)+') дна нет', !atFloor,
        runs.map(x=>x.map(v=>+v.toFixed(2))));
  }
  // Внутри стенки дно обязано БЫТЬ — иначе «починка» просто выкинула бы его.
  const inside=solidRunsY(t, (wallR-2)*Math.cos(mid), (wallR-2)*Math.sin(mid));
  chk('а внутри стенки дно на месте', inside.some(([y0,y1]) => y0 < B.minY+0.05 && y1-y0 > 1.0),
      inside.map(x=>x.map(v=>+v.toFixed(2))));
  // То же для рельефа: канавка режет стенку внутрь, и диск обязан уйти вместе с ней.
  const t2=base({vaseRelief:'flute',vaseReliefN:12,vaseReliefD:5});
  const B2=computeBBox(t2);
  const valley=2*Math.PI/12/2;   // ложбина каннелюры при vaseReliefN=12
  const rV=30-5+0.6;
  const runs2=solidRunsY(t2, rV*Math.cos(valley), rV*Math.sin(valley));
  chk('с каннелюрами: в ложбине у дна снаружи пусто',
      !runs2.some(([y0,y1]) => y0 < B2.minY+0.05 && y1 < B2.minY+3), runs2.map(x=>x.map(v=>+v.toFixed(2))));
}

console.log('=== рельеф не трогает того, чего не касается ===');
{
  const a=vol(base({fnMode:'funnel',vaseRelief:'rib',vaseReliefD:6,vaseReliefN:9}));
  const b=vol(base({fnMode:'funnel'}));
  chk('воронке рельеф вазы безразличен', Math.abs(a-b)<1e-9, {a,b});
  const c=vol(base({vaseRelief:'none',vaseReliefD:6})), d0=vol(base({}));
  chk('«рельеф: нет» — это точно прежняя ваза', Math.abs(c-d0)<1e-9, {c,d0});
  const e=vol(base({vaseRelief:'rib',vaseReliefD:0})), f=vol(base({}));
  chk('нулевая глубина — тоже', Math.abs(e-f)<1e-9, {e,f});
}

console.log('=== the funnel and the doser are untouched ===');
{ const f=base({fnMode:'funnel'}), d=base({fnMode:'doser'});
  chk('funnel still builds', manifoldCheck(f,4).watertight && vol(f)>0, {});
  chk('doser still builds', manifoldCheck(d,4).watertight && vol(d)>0, {});
  const a=vol(base({fnMode:'funnel',vaseH:20,vaseFacets:3})), b=vol(base({fnMode:'funnel',vaseH:300,vaseFacets:24}));
  chk('the vase knobs do nothing to the funnel', Math.abs(a-b)<1e-9, {}); }

console.log('\n'+(fail?'FAILED':'ALL PASSED')+': '+pass+' passed, '+fail+' failed');
if(fail) process.exitCode=1;
