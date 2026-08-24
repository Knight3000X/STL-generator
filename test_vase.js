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

console.log('=== дно достаёт до стенки НА КАЖДОМ УГЛЕ ===');
{
  /* Круглый диск обязан лежать между внутренней и наружной поверхностью на каждом угле, а у рельефной
     вазы эти границы гуляют навстречу друг другу: внутренняя доходит до максимума на ГРЕБНЕ, наружная
     опускается до минимума в ЛОЖБИНЕ. Замерено на Ø дна 60, стенке 2 и каннелюрах глубиной 3:
     внутренняя 28.61, наружная 27.61 — интервал ПУСТ, круглого дна для такой вазы не существует вовсе.
     Круг любого радиуса либо не достаёт до стенки на гребнях (сквозные щели снизу), либо вылезает
     наружу в ложбинах. Поэтому дно повторяет тот же r(θ), что и оболочка.

     Проверяется по функциям, а не лучом: луч по сетке меряет то же самое, но за минуты, а разрешение по
     углу у него всё равно грубее. Что построенная сетка следует этому контуру, держит проверка «дно не
     торчит наружу» ниже — она как раз лучевая. */
  const fit = (ov) => {
    base(ov);                                   // прогоняем через тот же путь, что и строитель
    const s = vaseSpec(paramState.box);
    const rProf = Math.max(1.2, vaseProfileR(0.02, s.pts)), rBase = rProf - s.wall*0.4;
    let inGap = 1e9, outGap = 1e9;
    for(let k=0;k<1440;k++){ const a=2*Math.PI*k/1440;
      const fl = Math.max(0.6, vaseSectionR(rBase, a, s.nFac, s.rel));
      inGap  = Math.min(inGap,  fl - vaseSectionR(rProf - s.wall, a, s.nFac, s.rel));
      outGap = Math.min(outGap, vaseSectionR(rProf, a, s.nFac, s.rel) - fl); }
    return {inGap, outGap};
  };
  for(const ov of [{}, {vaseRelief:'flute',vaseReliefN:8,vaseReliefD:3},
                   {vaseRelief:'rib',vaseReliefN:12,vaseReliefD:5},
                   {vaseRelief:'lobe',vaseReliefN:5,vaseReliefD:6},
                   {vaseRelief:'lobe',vaseReliefN:5,vaseReliefD:6,vaseReliefSharp:1},
                   {vaseFacets:6}, {vaseFacets:3},
                   {vaseFacets:6,vaseRelief:'flute',vaseReliefD:4},
                   {vaseFacets:5,vaseRelief:'rib',vaseReliefD:9,vaseReliefN:7},
                   {fnWall:8,vaseRelief:'flute',vaseReliefD:3}]){
    const f = fit(ov);
    chk('дно перекрывает стенку '+JSON.stringify(ov),
        f.inGap > 0.05 && f.outGap > 0.05, {in:+f.inGap.toFixed(3), out:+f.outGap.toFixed(3)});
  }
  // И тот самый случай, который был сломан: глубина рельефа БОЛЬШЕ стенки — круглого дна не существует.
  base({vaseRelief:'flute',vaseReliefN:8,vaseReliefD:3});
  const sp = vaseSpec(paramState.box);
  chk('это и есть случай «глубина больше стенки»', sp.rel.depth > sp.wall, {d:sp.rel.depth, w:sp.wall});
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
  /* То же для рельефа — и углы здесь СЧИТАЮТСЯ, а не берутся на глаз. Прежняя версия этой проверки
     зондировала точку 2π/n/2, назвав её ложбиной каннелюры; на деле у каннелюры f = ((1+cos nθ)/2)^e,
     и там cos(nθ) = −1, то есть f = 0 и радиус ПОЛНЫЙ — это гребень. Точка лежала глубоко внутри
     полости, дна там при круглом диске не было, проверка проходила — и закрепляла ровно ту поломку,
     из-за которой у рельефной вазы снизу были сквозные щели. */
  const nR = 12, dR = 5;
  const t2 = base({vaseRelief:'flute', vaseReliefN:nR, vaseReliefD:dR});
  const B2 = computeBBox(t2), s2 = vaseSpec(paramState.box);
  const rProf2 = Math.max(1.2, vaseProfileR(0.02, s2.pts));
  // Ложбина каннелюры — где f = 1, то есть cos(nθ) = 1: θ = 0. Гребень — где f = 0: θ = π/n.
  const valley = 0, crest = Math.PI/nR;
  const outV = vaseSectionR(rProf2, valley, s2.nFac, s2.rel);
  const outC = vaseSectionR(rProf2, crest,  s2.nFac, s2.rel);
  chk('ложбина и гребень посчитаны, а не угаданы', Math.abs((outC - outV) - dR) < 0.01,
      {valley:+outV.toFixed(2), crest:+outC.toFixed(2)});
  const bottomRun = (r, a) => solidRunsY(t2, r*Math.cos(a), r*Math.sin(a))
      .some(([y0,y1]) => y0 < B2.minY+0.05 && y1 < B2.minY+3);
  chk('с каннелюрами: ЗА наружной поверхностью в ложбине дна нет', !bottomRun(outV + 0.6, valley),
      solidRunsY(t2, (outV+0.6)*Math.cos(valley), (outV+0.6)*Math.sin(valley)).map(x=>x.map(v=>+v.toFixed(2))));
  chk('и за наружной на гребне тоже нет', !bottomRun(outC + 0.6, crest));
  /* А ВНУТРИ стенки дно обязано БЫТЬ — на обоих углах. Это и есть починка: круглый диск на гребне до
     стенки не доставал, и снизу были видны сквозные щели. */
  /* Опора берётся от САМОГО НИЖНЕГО ряда профиля, а не от t = 0.02, и точка ставится чуть внутри его
     внутренней поверхности. Первая версия этой проверки промахнулась дважды: у самого низа профиль ещё
     30, а не 30.61, и точка «чуть внутри 28.61» попадала В ТОЛЩУ СТЕНКИ — короткий отрезок там есть
     всегда, потому что ваза расширяется и стенка на этом радиусе быстро кончается. Проверка меряла
     стенку и проходила даже на круглом диске, то есть на самой поломке.

     Здесь же стенки заведомо нет (её внутренняя граница дальше), и всё, что найдено, — это дно. При
     старом круглом диске R = 24.81, и на гребне там ПУСТО. */
  const rB2 = Math.max(1.2, vaseProfileR(0, s2.pts));
  const inV = vaseSectionR(rB2 - s2.wall, valley, s2.nFac, s2.rel);
  const inC = vaseSectionR(rB2 - s2.wall, crest,  s2.nFac, s2.rel);
  chk('в ложбине дно доходит до стенки', bottomRun(inV - 0.4, valley),
      {r:+(inV-0.4).toFixed(2), inner:+inV.toFixed(2)});
  chk('и на ГРЕБНЕ доходит тоже', bottomRun(inC - 0.4, crest),
      {r:+(inC-0.4).toFixed(2), inner:+inC.toFixed(2)});
}

/* ============ КАШПО И ПОДДОН =====================================================================
   Кашпо — та же ваза с дренажом в дне. Поддон — отдельная деталь, размеры которой берутся от вазы.
   Проверяется не «строится ли»: дно с нарисованными, но не прорезанными кружками тоже строится и тоже
   герметично. Меряется луч СКВОЗЬ отверстие, число отверстий, выведенная окружность и то, что поддон
   действительно вмещает вазу — включая гранёную и с рельефом. */

/* Пуст ли столбик В ПЛОСКОСТИ ДНА в точке (x,z). Проверяется принадлежность точке внутри плиты дна, а
   НЕ длина найденного отрезка: первая версия требовала, чтобы отрезок был короче 4 мм, и у самой стенки
   честно врала — там столбик проходит сквозь стенку вазы и тянется вверх на десятки миллиметров, то есть
   материал есть, а предикат отвечал «пусто». Промер диаметра отверстия из-за этого выдал 13.95 вместо 8. */
function floorOpenAt(t, x, z){
  const y=computeBBox(t).minY+0.3;
  return !solidRunsY(t,x,z).some(([y0,y1]) => y0<=y && y1>=y);
}

console.log('=== кашпо: герметичность ===');
for(const n of [1,2,3,6,12])
  for(const d of [3,8,30]){
    const t=base({vaseH:40,vaseDrain:n,vaseDrainD:d}), mc=manifoldCheck(t,4);
    chk('дренаж n'+n+' Ø'+d+' watertight (+vol)', mc.watertight&&vol(t)>0, {open:mc.openEdges,bad:mc.badEdges});
  }
for(const ov of [{vaseDrain:6,vaseDrainD:8,vaseFacets:6},{vaseDrain:6,vaseDrainD:8,vaseRelief:'flute',vaseReliefD:4},
                 {vaseDrain:6,vaseDrainD:8,vaseRelief:'lobe',vaseReliefD:5,vaseTwist:180},
                 {vaseDrain:12,vaseDrainD:8,vaseBaseD:10},{vaseDrain:4,vaseDrainD:8,fnWall:8}]){
  const t=base(Object.assign({vaseH:40},ov)), mc=manifoldCheck(t,4);
  chk('дренаж + '+JSON.stringify(ov)+' watertight', mc.watertight&&vol(t)>0, {open:mc.openEdges,bad:mc.badEdges});
}

console.log('=== дренаж СКВОЗНОЙ, и его столько, сколько просили ===');
{
  const par=Object.assign({},base({vaseDrain:6,vaseDrainD:8})&&paramState.box);
  const sp=vaseSpec(par);
  const rFloor=Math.max(0.6,(Math.max(1.2,vaseProfileR(0.02,sp.pts))-sp.wall*0.4)*sp.facK-sp.rel.depth);
  const dr=vaseDrainSpec(rFloor,6,8);
  const t=base({vaseDrain:6,vaseDrainD:8});
  chk('в центре отверстия дна нет', floorOpenAt(t, dr.rC, 0), dr);
  chk('между отверстиями дно есть', !floorOpenAt(t, dr.rC*Math.cos(Math.PI/6), dr.rC*Math.sin(Math.PI/6)));
  chk('и в самом центре тоже (шесть отверстий — не одно)', !floorOpenAt(t, 0, 0));
  // Обход по окружности отверстий: сколько раз столбик открывается — столько и отверстий.
  const K=720; let opens=0, prev=floorOpenAt(t, dr.rC*Math.cos(-2*Math.PI/K), dr.rC*Math.sin(-2*Math.PI/K));
  for(let i=0;i<K;i++){ const a=2*Math.PI*i/K, o=floorOpenAt(t, dr.rC*Math.cos(a), dr.rC*Math.sin(a));
    if(o && !prev) opens++; prev=o; }
  chk('отверстий по кругу ровно шесть', opens===6, opens);
  // Одно отверстие — по центру, а не на окружности.
  const t1=base({vaseDrain:1,vaseDrainD:10});
  chk('одно отверстие стоит в центре', floorOpenAt(t1,0,0) && vaseDrainSpec(rFloor,1,10).rC===0);
  // Ноль отверстий — сплошное дно.
  const t0=base({vaseDrain:0});
  chk('без дренажа дно сплошное', !floorOpenAt(t0,0,0) && !floorOpenAt(t0, rFloor*0.6, 0));
  // Ширина промежутка вдоль радиуса — это и есть Ø отверстия.
  let lo=null, hi=null;
  for(let i=0;i<=400;i++){ const r=dr.rC-10+20*i/400;
    if(floorOpenAt(t, r, 0)){ if(lo===null) lo=r; hi=r; } }
  chk('ширина промежутка = запрошенный Ø', Math.abs((hi-lo)-8)<0.6, {span:+(hi-lo).toFixed(2)});
}

console.log('=== окружность отверстий ВЫВЕДЕНА, а не выбрана ===');
{
  /* Условие: до края дна и до соседа остаётся поровну. Проверяется на самом определении — оба запаса
     при выданном rC обязаны сойтись, — и на следствии: любое ДРУГОЕ положение окружности даёт отверстие
     не больше. Коэффициент «0.55 от радиуса» на трёх отверстиях терял бы половину диаметра. */
  const R=30, e=2.0;
  for(const n of [2,3,6,12]){
    const dr=vaseDrainSpec(R,n,1000);
    const capEdge=2*(R-dr.rC-e), capNb=2*dr.rC*Math.sin(Math.PI/n)-e;
    chk('n'+n+': запас до края и до соседа сошлись', Math.abs(capEdge-capNb)<1e-9,
        {capEdge:+capEdge.toFixed(3), capNb:+capNb.toFixed(3)});
    chk('n'+n+': выданный предел — это он и есть', Math.abs(dr.cap-capEdge)<1e-9, {cap:dr.cap});
    // Ни одно другое положение не даёт большего отверстия.
    let best=0; for(let i=1;i<400;i++){ const rc=R*i/400;
      best=Math.max(best, Math.min(2*(R-rc-e), 2*rc*Math.sin(Math.PI/n)-e)); }
    chk('n'+n+': это максимум по положению', dr.cap >= best-1e-6, {cap:+dr.cap.toFixed(3), best:+best.toFixed(3)});
    /* И «0.55 от радиуса» действительно хуже — но не везде одинаково, и врать об этом не нужно: при
       двух-трёх отверстиях разница мала (27.0 против 23.0), а при двенадцати наивный коэффициент
       упирается в соседа и теряет треть диаметра. Сравнение стоит там, где оно что-то значит. */
    const naive=Math.min(2*(R-0.55*R-e), 2*0.55*R*Math.sin(Math.PI/n)-e);
    chk('n'+n+': выведенная окружность не хуже наивного 0.55R', dr.cap > naive-1e-9,
        {cap:+dr.cap.toFixed(2), naive:+naive.toFixed(2)});
    if(n>=12) chk('n'+n+': и заметно лучше — наивный упирается в соседа', dr.cap > naive*1.4,
                  {cap:+dr.cap.toFixed(2), naive:+naive.toFixed(2)});
  }
  chk('одно отверстие — весь радиус минус запас', Math.abs(vaseDrainSpec(30,1,1000).cap-2*(30-2))<1e-9);
  chk('на крошечном дне дренажа не бывает', vaseDrainSpec(1.5,6,8).n===0);
}

console.log('=== предел Ø и абажур названы вслух ===');
{
  const p1=Object.assign({},base({vaseDrain:6,vaseDrainD:40})&&paramState.box);
  chk('о срезанном Ø сказано', collectPrintWarnings(p1).some(w=>/дренаж: просили/.test(w)), collectPrintWarnings(p1));
  const p2=Object.assign({},base({vaseDrain:6,vaseDrainD:8})&&paramState.box);
  chk('в пределах — молчит', !collectPrintWarnings(p2).some(w=>/дренаж/.test(w)));
  const p3=Object.assign({},base({vaseDrain:6,vaseDrainD:8,vaseFloor:false})&&paramState.box);
  chk('дренаж у абажура назван отдельно', collectPrintWarnings(p3).some(w=>/абажур/.test(w)), collectPrintWarnings(p3));
  const t3=base({vaseDrain:6,vaseDrainD:8,vaseFloor:false});
  chk('и дна у абажура правда нет', floorOpenAt(t3,0,0));
}

console.log('=== дренаж не трогает силуэт ===');
{
  const B0=computeBBox(base({})), B1=computeBBox(base({vaseDrain:6,vaseDrainD:8}));
  chk('габарит не изменился', Math.abs((B1.maxX-B1.minX)-(B0.maxX-B0.minX))<1e-9 &&
      Math.abs((B1.maxY-B1.minY)-(B0.maxY-B0.minY))<1e-9);
  chk('материала стало меньше', vol(base({vaseDrain:6,vaseDrainD:8})) < vol(base({}))*0.9999);
  chk('и чем больше отверстий, тем меньше',
      vol(base({vaseDrain:12,vaseDrainD:8})) < vol(base({vaseDrain:3,vaseDrainD:8})));
}

console.log('=== поддон ===');
for(const ov of [{},{vaseBaseD:10},{vaseBaseD:250},{vaseSaucerH:3},{vaseSaucerH:60},{vaseSaucerGap:0.2},
                 {vaseSaucerGap:5},{vaseSaucerLift:0},{vaseSaucerLift:10},{fnWall:0.8},{fnWall:8},
                 {vaseBaseD:10,fnWall:8},{vaseBaseD:10,vaseSaucerLift:10}]){
  const t=base(Object.assign({vasePart:'saucer'},ov)), mc=manifoldCheck(t,4);
  chk('поддон '+JSON.stringify(ov)+' watertight (+vol)', mc.watertight&&vol(t)>0, {open:mc.openEdges,bad:mc.badEdges});
}
{
  const t=base({vasePart:'saucer',vaseBaseD:60,vaseSaucerGap:0.8,fnWall:2,vaseSaucerH:12});
  const B=computeBBox(t);
  chk('наружный Ø = Ø дна + 2·зазор + 2·стенка', Math.abs((B.maxX-B.minX)-(60+1.6+4))<0.3,
      {d:+(B.maxX-B.minX).toFixed(2)});
  chk('высота = высота борта', Math.abs((B.maxY-B.minY)-12)<0.05, {h:+(B.maxY-B.minY).toFixed(2)});
  /* Внутренний просвет — минимум радиуса ВЫШЕ бобышек. `radiiAt` здесь не годится: у поддона вершины
     стоят только на четырёх высотах (дно, верх дна, верх бобышки, борт), а её окно в 0.6 % высоты между
     ними просто ни во что не попадает и возвращает 1e9. */
  const sc0=vaseSaucerSpec(paramState.box), B0=computeBBox(t);
  let inner=1e9;
  for(const T of t) for(const v of T) if(v[1] > B0.minY+sc0.wall+sc0.lift+0.5)
    inner=Math.min(inner, Math.hypot(v[0],v[2]));
  chk('внутренний Ø = Ø дна + 2·зазор', Math.abs(2*inner-(60+1.6))<0.4, {inner:+(2*inner).toFixed(2)});
  chk('и он БОЛЬШЕ дна вазы — иначе она не встанет', 2*inner > 60, {inner:+(2*inner).toFixed(2)});
}
{
  /* Поддон круглый, а ваза может быть гранёной и с рельефом. Проверяется не «похоже влезает», а то, что
     САМАЯ ДАЛЁКАЯ точка дна вазы всё ещё внутри просвета поддона — для всех форм сразу. */
  const sc=vaseSaucerSpec(Object.assign({},base({vasePart:'saucer'})&&paramState.box));
  for(const ov of [{},{vaseFacets:6},{vaseFacets:3},{vaseRelief:'rib',vaseReliefD:4,vaseReliefN:12},
                   {vaseRelief:'lobe',vaseReliefD:6,vaseReliefN:5}]){
    const t=base(ov), B=computeBBox(t);
    let rBot=0; for(const T of t) for(const v of T) if(v[1]<B.minY+1.0) rBot=Math.max(rBot, Math.hypot(v[0],v[2]));
    chk('дно вазы '+JSON.stringify(ov)+' влезает в поддон', rBot < sc.rIn, {rBot:+rBot.toFixed(2), rIn:+sc.rIn.toFixed(2)});
  }
}
{
  // Бобышки: их три, они ниже борта и внутри стенки.
  const sc=vaseSaucerSpec(Object.assign({},base({vasePart:'saucer'})&&paramState.box));
  chk('бобышка не выше борта', sc.wall+sc.lift <= sc.H-0.5+1e-9, sc);
  chk('и внутри стенки', sc.padC+sc.padR <= sc.rIn-1.0+1e-9, sc);
  /* Дно кольца обязано лежать СТРОГО между его радиусами: совпавшая с кольцом грань — запрещённый
     случай, и здесь он проверяется как УСЛОВИЕ. Проверять его по сетке нечем: у диска и у кольца разное
     число сегментов, вершины не совпадают, и совпавшие поверхности не сварились бы — `manifoldCheck`
     на них смолчал бы, а слайсер получил бы нулевую толщину. */
  chk('дно поддона не совпадает ни с одной гранью кольца', sc.rIn < sc.rFloor && sc.rFloor < sc.rOut, sc);
  const t=base({vasePart:'saucer'}), B=computeBBox(t);
  // Столбиков ровно три: обход по окружности бобышек, считаем участки, где материал выше уровня дна.
  const K=720, yTest=B.minY+sc.wall+sc.lift*0.5;
  const solidAt=(x,z)=>solidRunsY(t,x,z).some(([y0,y1])=>y0<=yTest && y1>=yTest);
  let runs=0, prev=solidAt(sc.padC*Math.cos(-2*Math.PI/K), sc.padC*Math.sin(-2*Math.PI/K));
  for(let i=0;i<K;i++){ const a=2*Math.PI*i/K, o=solidAt(sc.padC*Math.cos(a), sc.padC*Math.sin(a));
    if(o&&!prev) runs++; prev=o; }
  // Число записано ЧИСЛОМ, а не через ту же константу: проверка, сверяющаяся сама с собой, переживает
  // любую правку этой константы и ничего о ней не сообщает.
  chk('бобышек ровно три', runs===3, runs);
  chk('и три — не «побольше»: три точки задают плоскость, четвёртая качается', VASE_LIFT_N===3, VASE_LIFT_N);
  chk('без них поддон легче', vol(base({vasePart:'saucer',vaseSaucerLift:0})) < vol(t));
  // Просили выше борта — обрезано и названо.
  const p4=Object.assign({},base({vasePart:'saucer',vaseSaucerH:3,vaseSaucerLift:8})&&paramState.box);
  chk('о срезанной подставке сказано', collectPrintWarnings(p4).some(w=>/подставки поддона/.test(w)),
      collectPrintWarnings(p4));
  const small=vaseSaucerSpec(Object.assign({},base({vasePart:'saucer',vaseBaseD:10,vaseSaucerGap:0.2})&&paramState.box));
  chk('на крошечном поддоне бобышка ужалась вместе с ним', small.padC+small.padR <= small.rIn-1.0+1e-9, small);
  chk('и осталась печатаемой', small.padR >= 1.2, small.padR);
}
{
  // Поддон не зависит от того, что нарисовано выше дна.
  const a=vol(base({vasePart:'saucer'})), b=vol(base({vasePart:'saucer',vaseH:300,vaseBellyD:300,
    vaseMouthD:250,vaseFacets:12,vaseRelief:'lobe',vaseReliefD:9,vaseTwist:270,vaseDrain:8}));
  chk('поддону безразличен силуэт вазы над дном', Math.abs(a-b)<1e-9, {a,b});
  const c=vol(base({vasePart:'saucer',vaseBaseD:100}));
  chk('но не Ø её дна', Math.abs(c-a)>1, {a,c});
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

/* ================================ АВТОПОЛИВ ========================================================
   Резервуаром служит сама ваза, а внутрь на устье вешается второй горшок с фитильной ножкой. Проверяется
   не «похоже ли на горшок», а связи, которые ломаются тихо:

   1. ШИРИНА МЕРЯЕТСЯ ПО САМОМУ УЗКОМУ МЕСТУ, а не по устью. У вазы с шейкой устье шире горла, и горшок,
      скроенный по устью, в неё просто не пролезет — понять это можно будет только с деталью в руках.

   2. НОЖКА НЕ ШИРЕ ДНА, В КОТОРОМ СТОИТ. Иначе «кольцо» дна выворачивается наизнанку: отверстие больше
      контура, а ушное отсечение сошьёт из этого тело замкнутое, объёмное и бессмысленное. Проверка
      герметичности пропустит — она сшивает рёбра, а рёбра там парны.

   3. ДРЕНАЖ СТАВИТСЯ, ТОЛЬКО ЕСЛИ ЕМУ ЕСТЬ ГДЕ СТОЯТЬ. Шесть дырок вплотную друг к другу на дне Ø8
      ломают само построение: мосты в отверстия начинают пересекаться, и дно выходит с открытыми рёбрами.

   4. СОВПАДАЮЩИЕ ГРАНИ. Дно, ободок и конус сходятся торцами, и сложить их заподлицо — самое
      естественное, что можно сделать. Проверка герметичности этого не видит вовсе.                  */
console.log('\n=== автополив: ширина по самому узкому месту ===');
{
  const IN = ov => Object.assign({vasePart:'inner'}, ov || {});
  const sp = ov => vaseInnerSpec(Object.assign({}, paramState.box,
    {fnOn:true, fnMode:'vase', vaseH:120, vaseBaseD:60, vaseBellyD:95, vaseBellyAt:35,
     vaseNeckD:55, vaseNeckAt:75, vaseMouthD:70, vaseFacets:0, vaseTwist:0, fnWall:2,
     vaseRelief:'none', vaseReliefD:0}, IN(ov)));
  const wide = sp({});
  chk('горшок уже самого узкого места', wide.rTop < wide.rNarrow, [wide.rTop, wide.rNarrow]);
  chk('и уже устья тоже, потому что шейка ещё уже',
      wide.rTop < wide.rMouth - 2, [wide.rTop, wide.rMouth]);
  chk('уже шейка — уже горшок', sp({vaseNeckD:35}).rTop < wide.rTop - 8,
      [sp({vaseNeckD:35}).rTop, wide.rTop]);
  chk('огранка тоже ужимает горшок', sp({vaseFacets:6}).rTop < wide.rTop, [sp({vaseFacets:6}).rTop, wide.rTop]);
  chk('и рельеф, врезанный внутрь, — тоже',
      sp({vaseRelief:'flute', vaseReliefD:4}).rTop < wide.rTop,
      [sp({vaseRelief:'flute', vaseReliefD:4}).rTop, wide.rTop]);
  chk('конус расширяется кверху — и вставляется, и печатается', wide.rBot < wide.rTop, [wide.rBot, wide.rTop]);
  chk('ободок шире устья изнутри — на нём горшок и висит',
      wide.rLip > wide.rMouth - 2, [wide.rLip, wide.rMouth]);
  /* У ГОРШКА ЕСТЬ МИНИМАЛЬНАЯ ШИРИНА. Ваза с горлом в десять миллиметров дала бы иглу, у которой
     стенка и канал сходятся в одну точку; радиус поднимается до внятного, а о том, что в эту вазу
     горшок теперь не пролезет, говорится вслух. */
  const thin = sp({vaseNeckD:10, vaseMouthD:10, vaseBellyD:10, vaseBaseD:10});
  chk('в узкую вазу горшок не влезает — и это помечено', thin.wide === false, thin.rTopWant);
  chk('но иглой он не становится', thin.rTop >= thin.wall + 4, [thin.rTop, thin.wall]);
  chk('и просторная ваза этим флагом не помечена', wide.wide === true);
}

console.log('\n=== автополив: резервуар и фитильная ножка ===');
{
  const IN = ov => Object.assign({}, paramState.box, {fnOn:true, fnMode:'vase', vasePart:'inner',
    vaseH:120, vaseBaseD:60, vaseBellyD:95, vaseBellyAt:35, vaseNeckD:55, vaseNeckAt:75,
    vaseMouthD:70, vaseFacets:0, vaseTwist:0, fnWall:2, vaseRelief:'none', vaseReliefD:0}, ov || {});
  const sp = ov => vaseInnerSpec(IN(ov));
  const auto = sp({});
  /* «Примерно пятая часть» — это ДОЛЯ, а не число. Проверять её на одной высоте бессмысленно: там
     доля и константа неотличимы, и подстановка «26.4» прошла бы молча. Нужны две высоты. */
  chk('авто-резервуар — примерно пятая часть высоты',
      Math.abs(auto.water - 120*0.22) < 1e-9, auto.water);
  chk('и на другой вазе — та же ДОЛЯ, а не то же число',
      Math.abs(sp({vaseH:200}).water - 200*0.22) < 1e-9, sp({vaseH:200}).water);
  chk('то есть выше ваза — глубже резервуар', sp({vaseH:200}).water > auto.water + 10);
  chk('и помечен как авто', auto.waterAuto === true && auto.waterCut === false);
  chk('заказанный берётся как есть', Math.abs(sp({vaseWater:40}).water - 40) < 1e-9);
  chk('выше половины вазы не поднимается', sp({vaseWater:400}).water <= 60 + 1e-9, sp({vaseWater:400}).water);
  chk('и об урезании сказано', sp({vaseWater:400}).waterCut === true);
  chk('глубже резервуар — мельче горшок', sp({vaseWater:40}).depth < auto.depth, [sp({vaseWater:40}).depth, auto.depth]);
  chk('выше ваза — глубже горшок', sp({vaseH:200}).depth > auto.depth + 50);
  // Ножка идёт от дна горшка почти до дна резервуара, но НЕ упирается в него: воде надо затечь.
  chk('ножка не достаёт до дна резервуара', auto.legLen < auto.water + 6, [auto.legLen, auto.water]);
  chk('и не короче самого резервуара', auto.legLen > auto.water, [auto.legLen, auto.water]);
  chk('ножка заказанного диаметра', Math.abs(2*sp({vaseWick:20}).rWick - 20) < 1e-9);
  chk('шире дна ей быть негде', sp({vaseWick:40}).wickCut === true && 2*sp({vaseWick:40}).rWick < 40);
  chk('и урезана она до места, которое есть',
      Math.abs(sp({vaseWick:40}).rWick - sp({vaseWick:40}).rWickMax) < 1e-9);
  /* А ЕСЛИ МЕСТА НЕТ ВОВСЕ, НОЖКИ НЕ БУДЕТ. Это не отказ строить: горшок остаётся горшком, только
     поливать его придётся сверху, — и об этом сказано, а не оставлено выясняться на подоконнике. */
  const tiny = sp({vaseNeckD:10, vaseMouthD:10, vaseBellyD:10, vaseBaseD:10});
  chk('на узкой вазе ножки нет', tiny.hasWick === false, tiny.rWickMax);
  chk('и горшком он всё равно считается негодным', tiny.fits === false);
  chk('а на просторной ножка есть', auto.hasWick === true);
}

console.log('\n=== автополив: сетка ===');
{
  const mk = ov => base(Object.assign({vasePart:'inner', vaseWater:0, vaseWick:12, vaseInnerDrain:6}, ov || {}));
  const t = mk({});
  chk('строится через настоящий путь приложения', t.length > 0);
  chk('и герметично', manifoldCheck(t, 6).watertight, manifoldCheck(t, 6));
  chk('и объём положительный', vol(t) > 0, vol(t));
  chk('это не сама ваза', Math.abs(vol(t) - vol(base({vasePart:'body'}))) > 1000,
      [vol(t), vol(base({vasePart:'body'}))]);
  chk('и не поддон', Math.abs(vol(t) - vol(base({vasePart:'saucer'}))) > 1000);
  /* КАНАЛ ФИТИЛЯ ПРОТКНУТ НАСКВОЗЬ — от низа ножки до верха горшка. Луч по оси не должен встретить
     ничего: ни дна, ни ножкиного донышка, которого там быть не должно. */
  const rayHits = (tris, x0, z0) => { const x = x0 + 0.013, z = z0 + 0.0071; let n = 0;
    for (const T of tris){
      const e1 = sub(T[1], T[0]), e2 = sub(T[2], T[0]), d = [0, 1, 0];
      const h = cross(d, e2), a = e1[0]*h[0] + e1[1]*h[1] + e1[2]*h[2];
      if (Math.abs(a) < 1e-12) continue;
      const sv = [x - T[0][0], -1e6 - T[0][1], z - T[0][2]], f = 1/a;
      const u = f*(sv[0]*h[0] + sv[1]*h[1] + sv[2]*h[2]);
      if (u < 1e-9 || u > 1 - 1e-9) continue;
      const q = cross(sv, e1), v = f*(d[0]*q[0] + d[1]*q[1] + d[2]*q[2]);
      if (v < 1e-9 || u + v > 1 - 1e-9) continue;
      if (f*(e2[0]*q[0] + e2[1]*q[1] + e2[2]*q[2]) > 1e-9) n++;
    } return n; };
  chk('канал фитиля сквозной', rayHits(t, 0, 0) === 0, rayHits(t, 0, 0));
  /* ОТВЕРСТИЕ В ДНЕ ШИРЕ КАНАЛА, НО УЖЕ НАРУЖНОГО ДИАМЕТРА НОЖКИ — обе границы настоящие. Уже канала,
     и дно полезет в него кольцевым уступом, за который цепляется шнур; шире наружного, и между дном и
     ножкой останется щель прямо в резервуар: горшок будет течь, оставаясь при этом герметичной сеткой.
     Щупается лучом сразу за наружной стенкой ножки — там дно обязано быть. */
  {
    const sp2 = vaseInnerSpec(Object.assign({}, paramState.box, {fnOn:true, fnMode:'vase', vasePart:'inner',
      vaseH:120, vaseBaseD:60, vaseBellyD:95, vaseNeckD:55, vaseMouthD:70, fnWall:2,
      vaseWick:12, vaseWater:0, vaseInnerDrain:0}));
    const t0 = mk({vaseInnerDrain:0});
    const rOut = sp2.rWick + sp2.wall;
    chk('дно смыкается с наружной стенкой ножки', rayHits(t0, rOut + 0.25, 0) === 2,
        rayHits(t0, rOut + 0.25, 0));
    chk('а внутри канала дна нет', rayHits(t0, sp2.rWick - 0.25, 0) === 0,
        rayHits(t0, sp2.rWick - 0.25, 0));
  }
  /* ОБОДОК САДИТСЯ В СТЕНКУ КОНУСА, А НЕ РЯДОМ С НЕЙ. Выйди его внутренний радиус за наружную
     поверхность конуса — и ободок повиснет свободным кольцом: сетка останется замкнутой и объёмной,
     а деталь распадётся на два тела, ничем не соединённых. */
  {
    const sp3 = vaseInnerSpec(Object.assign({}, paramState.box, {fnOn:true, fnMode:'vase', vasePart:'inner',
      vaseH:120, vaseBaseD:60, vaseBellyD:95, vaseNeckD:55, vaseMouthD:70, fnWall:2}));
    chk('ободок заходит внутрь стенки конуса', sp3.rLipIn < sp3.rTop - 0.3, [sp3.rLipIn, sp3.rTop]);
    chk('но не сквозь неё', sp3.rLipIn > sp3.rTop - sp3.wall, [sp3.rLipIn, sp3.rTop - sp3.wall]);
  }
  chk('а стенка ножки на месте', rayHits(t, 7.4, 0) > 0, rayHits(t, 7.4, 0));
  chk('шире ножка — шире канал', rayHits(mk({vaseWick:24}), 7.4, 0) === 0,
      rayHits(mk({vaseWick:24}), 7.4, 0));
  // Дренажные отверстия: есть, когда есть место, и нет, когда места нет.
  chk('дренаж добавляет треугольников', mk({vaseInnerDrain:6}).length > mk({vaseInnerDrain:0}).length,
      [mk({vaseInnerDrain:0}).length, mk({vaseInnerDrain:6}).length]);
  chk('и он не ломает герметичность', manifoldCheck(mk({vaseInnerDrain:12}), 6).watertight);
  chk('а на тесном дне его не ставят вовсе',
      mk({vaseWick:24, vaseInnerDrain:12}).length === mk({vaseWick:24, vaseInnerDrain:0}).length,
      [mk({vaseWick:24, vaseInnerDrain:0}).length, mk({vaseWick:24, vaseInnerDrain:12}).length]);
  chk('и деталь при этом остаётся герметичной',
      manifoldCheck(mk({vaseWick:24, vaseInnerDrain:12}), 6).watertight);
  // Ободок выступает над кромкой конуса, а не заканчивается с ним заподлицо.
  const B = computeBBox(t);
  const topR = (() => { let r = 0; const y = B.maxY - 0.5;
    for (const T of t) for (const v of T) if (v[1] > y) r = Math.max(r, Math.hypot(v[0], v[2]));
    return r; })();
  chk('наверху остаётся один ободок', topR > 30, topR);
  chk('и это он определяет габарит', Math.abs(topR - Math.max(B.maxX, -B.minX)) < 0.6,
      [topR, Math.max(B.maxX, -B.minX)]);
}

/* СОВПАДАЮЩИЕ ГРАНИ. Дно, ободок и конус сходятся торцами, и сложить их заподлицо — самое естественное,
   что можно сделать; канал ножки и отверстие в дне — соосны, и приравнять их радиусы тоже. Проверка
   герметичности не видит НИ ТОГО, НИ ДРУГОГО: она сшивает рёбра, а у совпадающей пары все рёбра парны.
   Пять таких дефектов нашлись при разработке ПЕРЕБОРОМ — и это ровно тот случай, когда чинить дефект без
   сторожа бессмысленно: следующая правка вернёт его молча. */
function coplanarPairs(tris){
  const key = T => { const n = cross(sub(T[1],T[0]), sub(T[2],T[0])), L = vlength(n);
    if (L < 1e-12) return null;
    let u = [n[0]/L, n[1]/L, n[2]/L];
    if (u[0] < -1e-9 || (Math.abs(u[0]) < 1e-9 && (u[1] < -1e-9 || (Math.abs(u[1]) < 1e-9 && u[2] < 0))))
      u = [-u[0], -u[1], -u[2]];
    const d = u[0]*T[0][0] + u[1]*T[0][1] + u[2]*T[0][2];
    return u.map(q => Math.round(q*1e4)/1e4).join(',') + '|' + Math.round(d*1e3)/1e3; };
  const by = new Map();
  tris.forEach((T, i) => { const k = key(T); if (!k) return;
    if (!by.has(k)) by.set(k, []); by.get(k).push(i); });
  let hits = 0, where = null;
  for (const [k, list] of by){
    if (list.length < 2) continue;
    const u = k.split('|')[0].split(',').map(Number);
    const ax = Math.abs(u[0]) < 0.9 ? [1,0,0] : [0,1,0];
    const e1 = cross(u, ax), L1 = vlength(e1), E1 = e1.map(q => q/L1), E2 = cross(u, E1);
    const P = T => T.map(v => [v[0]*E1[0]+v[1]*E1[1]+v[2]*E1[2], v[0]*E2[0]+v[1]*E2[1]+v[2]*E2[2]]);
    const polys = list.map(i => P(tris[i]));
    const side = (q,a,b) => (b[0]-a[0])*(q[1]-a[1]) - (b[1]-a[1])*(q[0]-a[0]);
    const inside = (q,T) => { const d1=side(q,T[0],T[1]), d2=side(q,T[1],T[2]), d3=side(q,T[2],T[0]);
      return (d1>1e-9&&d2>1e-9&&d3>1e-9) || (d1<-1e-9&&d2<-1e-9&&d3<-1e-9); };
    const mid = T => [(T[0][0]+T[1][0]+T[2][0])/3, (T[0][1]+T[1][1]+T[2][1])/3];
    for (let a = 0; a < polys.length; a++) for (let b = a+1; b < polys.length; b++)
      if (inside(mid(polys[a]), polys[b]) || inside(mid(polys[b]), polys[a])){
        hits++; if (!where) where = {plane:k, a:list[a], b:list[b]}; }
  }
  return { hits, where };
}
/* СОВПАДАЮЩИЕ ЦИЛИНДРЫ — ОТДЕЛЬНАЯ БЕДА, и поиск по плоскостям её не видит. Канал фитильной ножки и
   отверстие в дне СООСНЫ; приравняй им радиусы — и на всей общей высоте совпадут две цилиндрические
   поверхности. Ни одна плоскость при этом не совпадает, рёбра парны, объём верен.

   Ловится это лучом: две совпадающие поверхности дают ДВА ПЕРЕСЕЧЕНИЯ НА ОДНОМ И ТОМ ЖЕ РАССТОЯНИИ, то
   есть оболочку нулевой толщины. Лучи пускаются вдоль всех трёх осей — вертикальный вдоль оси вращения
   параллелен стенкам и о них ничего не скажет, — и из точек, сдвинутых на иррациональные доли
   миллиметра: попав ровно в ребро, луч даёт двойной счёт и на исправной детали. */
function zeroThickHits(tris){
  const axes = [[0,1,2],[1,0,2],[2,0,1]];      // ось луча и две поперечные
  let hits = 0, where = null;
  for (const [ax, u, v] of axes){
    for (let i = -4; i <= 4; i++) for (let j = -4; j <= 4; j++){
      const O = [0,0,0], D = [0,0,0];
      D[ax] = 1;
      O[ax] = -1e5;
      O[u] = i*7.3 + 0.137; O[v] = j*5.9 + 0.211;
      const ts = [];
      for (const T of tris){
        const e1 = sub(T[1], T[0]), e2 = sub(T[2], T[0]);
        const h = cross(D, e2), a = e1[0]*h[0] + e1[1]*h[1] + e1[2]*h[2];
        if (Math.abs(a) < 1e-12) continue;
        const sv = [O[0]-T[0][0], O[1]-T[0][1], O[2]-T[0][2]], f = 1/a;
        const uu = f*(sv[0]*h[0] + sv[1]*h[1] + sv[2]*h[2]);
        if (uu < 1e-9 || uu > 1 - 1e-9) continue;
        const q = cross(sv, e1), vv = f*(D[0]*q[0] + D[1]*q[1] + D[2]*q[2]);
        if (vv < 1e-9 || uu + vv > 1 - 1e-9) continue;
        const tt = f*(e2[0]*q[0] + e2[1]*q[1] + e2[2]*q[2]);
        if (tt > 1e-9) ts.push(tt);
      }
      ts.sort((a, b) => a - b);
      for (let k = 1; k < ts.length; k++)
        if (ts[k] - ts[k-1] < 1e-6){ hits++; if (!where) where = {ax, u:O[u], v:O[v], t:ts[k]}; }
    }
  }
  return { hits, where };
}
console.log('\n=== автополив: совпадающих граней нет ни в одном наборе ===');
{
  const mk = ov => base(Object.assign({vasePart:'inner'}, ov || {}));
  chk('на умолчаниях их нет', coplanarPairs(mk({})).hits === 0, coplanarPairs(mk({})).where);
  chk('и оболочек нулевой толщины тоже', zeroThickHits(mk({})).hits === 0, zeroThickHits(mk({})).where);
  chk('и на широкой ножке', zeroThickHits(mk({vaseWick:24})).hits === 0, zeroThickHits(mk({vaseWick:24})).where);
  chk('и без дренажа', zeroThickHits(mk({vaseInnerDrain:0})).hits === 0, zeroThickHits(mk({vaseInnerDrain:0})).where);
  /* ПЕРЕБОР ПО ВСЕЙ ОБЛАСТИ. Каждая из найденных при разработке поломок жила ровно в одном углу:
     дно с ободком совпадали ВСЕГДА, игла на узкой вазе — только при горле в десять миллиметров, а
     дренаж ломал построение только на тесном дне. Одной точки не хватило бы ни для одной. */
  let bad = 0, badAt = null, cop = 0, copAt = null, n = 0;
  for (const H of [30, 120, 300])
    for (const wick of [6, 12, 40])
      for (const water of [0, 40, 400])
        for (const neck of [10, 55, 120])
          for (const drain of [0, 6, 12])
            for (const fac of [0, 6]){
              const ov = {vaseH:H, vaseWick:wick, vaseWater:water, vaseNeckD:neck,
                          vaseInnerDrain:drain, vaseFacets:fac};
              const tr = mk(ov); n++;
              const m = manifoldCheck(tr, 6);
              if (!m.watertight || vol(tr) <= 0){ bad++; if (!badAt) badAt = {ov, open:m.openEdges, bad:m.badEdges}; }

            }
  chk('486 наборов герметичны', bad === 0 && n === 486, badAt || n);
  /* ДВА ДЕТЕКТОРА ГОНЯЮТСЯ ПО ОТОБРАННЫМ УГЛАМ, а не по всей области, и это осознанный размен. Поиск по
     плоскостям квадратичен внутри каждой плоскости, лучевой стоит трёх осей на восемьдесят лучей по
     десять тысяч треугольников — на 486 наборах любой из них делает тест вторым по медленности во всей
     батарее, а каждая мутация платит ту же цену. Герметичность, наоборот, дёшева, и её проверяет весь
     перебор целиком.

     Углы отобраны там, где тела сходятся ИНАЧЕ, чем в середине области: тесное дно, широкая ножка, нет
     дренажа и полный дренаж, вырожденно узкая ваза, мелкая и высокая, переполненный резервуар, огранка.
     Все пять дефектов, найденных при разработке, жили ровно в таких углах. */
  let z = 0, zAt = null;
  for (const ov of [{}, {vaseWick:24}, {vaseWick:40}, {vaseInnerDrain:0}, {vaseInnerDrain:12},
                    {vaseNeckD:10, vaseMouthD:10, vaseBellyD:10, vaseBaseD:10},
                    {vaseH:30}, {vaseH:300}, {vaseWater:400}, {vaseFacets:6}]){
    const tr = mk(ov);
    const c = coplanarPairs(tr);
    if (c.hits){ z++; if (!zAt) zAt = {ov, совпалиГрани:c.hits, where:c.where}; }
    const h = zeroThickHits(tr);
    if (h.hits){ z++; if (!zAt) zAt = {ov, нулеваяТолщина:h.hits, where:h.where}; }
  }
  chk('и в десяти углах нет ни совпадающих граней, ни нулевой толщины', z === 0, zAt);
}

console.log('\n=== автополив: сказано то, чего не видно ===');
{
  const W = ov => collectPrintWarnings(Object.assign({}, paramState.box,
    {fnOn:true, fnMode:'vase', vasePart:'inner', vaseH:120, vaseBaseD:60, vaseBellyD:95,
     vaseNeckD:55, vaseMouthD:70, fnWall:2}, ov || {}));
  chk('про дренаж в самой вазе сказано всегда',
      W({}).some(x => /дренажных отверстий быть не должно/.test(x)), W({}));
  chk('и про хлопчатобумажный шнур', W({}).some(x => /синтетика воду не тянет/.test(x)));
  chk('про урезанный резервуар', W({vaseWater:400}).some(x => /резервуар урезан/.test(x)));
  chk('а про неурезанный — молчат', !W({vaseWater:40}).some(x => /резервуар урезан/.test(x)));
  chk('про урезанную ножку', W({vaseWick:40}).some(x => /ножка урезана/.test(x)));
  chk('про отсутствующую ножку',
      W({vaseNeckD:10, vaseMouthD:10, vaseBellyD:10, vaseBaseD:10}).some(x => /её НЕТ/.test(x)));
  chk('про горшок, который не пролезет',
      W({vaseNeckD:10, vaseMouthD:10, vaseBellyD:10, vaseBaseD:10}).some(x => /НЕ пролезет/.test(x)));
  chk('про слишком мелкий горшок', W({vaseH:30}).some(x => /это уже не горшок/.test(x)), W({vaseH:30}));
  chk('а на нормальной вазе про мелкость молчат', !W({}).some(x => /это уже не горшок/.test(x)));
  // Ничего из этого не звучит на самой вазе и на поддоне.
  const body = ov => collectPrintWarnings(Object.assign({}, paramState.box,
    {fnOn:true, fnMode:'vase', vasePart:'body', vaseH:120, fnWall:2}, ov || {}));
  chk('на самой вазе про автополив не говорят',
      !body({}).some(x => /резервуар|фитил|шнур/.test(x)), body({}));
}

console.log('\n'+(fail?'FAILED':'ALL PASSED')+': '+pass+' passed, '+fail+' failed');
if(fail) process.exitCode=1;
