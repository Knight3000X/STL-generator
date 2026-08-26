// Hooks (крючки): a swept-bar hook on a wall plate or a snap-on pipe clip (any Ø), through the REAL
// buildTrisForShape pipeline. Watertight, real hook, mount variants. Run via ./run-all.sh.
let pass=0,fail=0; function chk(n,c,e){if(c){pass++;console.log('  OK  ',n);}else{fail++;console.log('  FAIL',n,e!==undefined?JSON.stringify(e):'');}}
function vol(t){let v=0;for(const T of t){const a=T[0],b=T[1],c=T[2];v+=(a[0]*(b[1]*c[2]-b[2]*c[1])-a[1]*(b[0]*c[2]-b[2]*c[0])+a[2]*(b[0]*c[1]-b[1]*c[0]))/6;}return v;}
function base(ov){ logos.length=0; boxHoles.length=0; dieFaces.length=0;
  Object.assign(paramState.box, defaultBoxParams(), {width:40,height:40,depth:40,
    hookMount:'wall',hookBar:8,hookReach:28,hookDrop:16,hookSweep:230,hookScrewD:4.5,hookPlateW:26,hookPlateH:44,
    hookPipeD:25,hookClipWall:3.5,hookClipW:14,
    mntMode:'none',gearMode:'none',pipMode:'none',threadMode:'none',sheetShape:'none',keycapMode:'none',platonic:'none',polyN:0,binRound:0,
    scoopDir:'none',labelTab:'none',mountHoles:'none',gripWall:'none',divX:1,divZ:1,stackFeet:false,gfOn:false}, ov);
  return buildTrisForShape('box',paramState.box); }

console.log('=== wall hook ===');
for(const bar of [5,8,12]) for(const reach of [16,40]) for(const sd of [0,4.5])
  chk('wall bar'+bar+' reach'+reach+' screw'+sd+' watertight (+vol)', (()=>{const t=base({hookMount:'wall',hookBar:bar,hookReach:reach,hookScrewD:sd});const mc=manifoldCheck(t,4);return mc.watertight&&vol(t)>0;})(), {bar,reach,sd});
for(const sw of [140,200,280]) chk('wall sweep '+sw+'° watertight', manifoldCheck(base({hookSweep:sw}),4).watertight);
{ const noH=vol(base({hookScrewD:0})), withH=vol(base({hookScrewD:5}));
  chk('screw holes remove material from the plate', withH<noH, {noH:+noH.toFixed(0),withH:+withH.toFixed(0)}); }
{ const short=computeBBox(base({hookReach:16})), long=computeBBox(base({hookReach:50}));
  chk('longer reach → deeper hook (Z)', (long.maxZ-long.minZ) > (short.maxZ-short.minZ)+20, {}); }

console.log('=== pipe hook (any Ø) ===');
for(const d of [12,25,50]) for(const bar of [6,10])
  chk('pipe Ø'+d+' bar'+bar+' watertight (+vol)', (()=>{const t=base({hookMount:'pipe',hookPipeD:d,hookBar:bar});const mc=manifoldCheck(t,4);return mc.watertight&&vol(t)>0;})(), {d,bar});
{ // Ring on top (pipe axis X), J-hook hangs straight down below it. The ring top is the highest point (y≈rO),
  //   so a bigger pipe raises maxY cleanly (the hook only pulls minY further down).
  const small=computeBBox(base({hookMount:'pipe',hookPipeD:12})), big=computeBBox(base({hookMount:'pipe',hookPipeD:50}));
  chk('bigger pipe → higher ring top (maxY grows)', (big.maxY) > (small.maxY)+12, {small:+small.maxY.toFixed(1),big:+big.maxY.toFixed(1)}); }
chk('pipe clip is watertight with a thin wall', manifoldCheck(base({hookMount:'pipe',hookPipeD:32,hookClipWall:2.5}),4).watertight);
{ // hook hangs straight DOWN from the ring, and the ring is turned so the pipe runs along Z (its width ≈ the
  //   clip width W); the vertical span is far larger than the pipe-axis span.
  const b=computeBBox(base({hookMount:'pipe',hookPipeD:25,hookClipW:16,hookReach:30,hookDrop:16}));
  chk('hook hangs down; pipe runs along Z (Z span ≈ clip width)', (b.maxY-b.minY) > (b.maxZ-b.minZ)*2 && Math.abs((b.maxZ-b.minZ)-16) < 2, {zSpan:+(b.maxZ-b.minZ).toFixed(1),ySpan:+(b.maxY-b.minY).toFixed(1)}); }

console.log('=== gating + regression ===');
{ const a=base({}).length, b=base({scoopDir:'front',gripWall:'front',mountHoles:'4',stackFeet:true,divX:2,divZ:2,hollow:true}).length;
  chk('organizer add-ons skipped on a hook', a===b, {a,b}); }
{ Object.assign(paramState.box, defaultBoxParams(), {width:40,height:40,depth:40,hookMount:'none'});
  const t=buildTrisForShape('box',paramState.box); const b=computeBBox(t);
  chk('hookMount none → normal cube', manifoldCheck(t,4).watertight && Math.abs((b.maxX-b.minX)-40)<1e-6, {}); }


/* ЧТО КРЮЧОК ДЕРЖИТ (v25.4.0) — первый разобранный молчун из переписи 10.4.
   Крючок строился и молчал, а число здесь решающее и на экране его не видно: пруток Ø8 при вылете 28 мм
   и он же при вылете 90 выглядят одинаково разумно, а держат вшестеро по-разному.

   Проверяется НЕ «совпадает ли спецификация сама с собой» — это ничего не значит, — а:
     1. СЕЧЕНИЕ КОРНЯ ВЗЯТО ИЗ СЕТКИ. Момент инерции и крайнее волокно меряются по срезу построенной
        детали в том месте, где корень выходит из пластины, и сверяются с тем, что говорит расчёт.
     2. ПРАВИЛА РЫЧАГА И КУБА. Вдвое длиннее вылет — вдвое меньше держит; вдвое толще пруток — в восемь
        раз больше. Это и есть содержание формулы, и мутация «взял площадь вместо момента» его ломает.
     3. ПЛЕЧО ВЫВЕДЕНО. У J-крючка низ дуги при загибе от 180° приходится ровно на конец стержня, при
        меньшем угле кончик уходит дальше — и плечо становится длиннее.
     4. СЛОИ УЧТЕНЫ, И ЭТО СКАЗАНО. В числе ровно половина прочности, потому что печатается пластиной на
        стол и корень тянется поперёк слоёв.
     5. «МАЛО» — ЭТО МАЛО ДЛЯ ЧЕГО. Порог сравнения свой у каждой роли: два килограмма — беда для крючка
        под куртку и десятикратный запас для прорези под зубную щётку. */
console.log('=== крючок говорит, сколько держит ===');
{
  const G = 9.80665;
  /* СЕЧЕНИЕ БЕРЁТСЯ ИЗ СЕТКИ ТОЧНО, а не пробами по клеткам. Первая запись сеяла точки и спрашивала у
     каждой «внутри ли»; на трёх диаметрах это считалось минутами — миллионы лучей против трёх тысяч
     треугольников. Здесь режется сам меш: треугольник, пересекающий плоскость, даёт отрезок, а отрезки
     складываются по Грину в площадь, центр тяжести и момент инерции. Ошибки выборки нет вовсе;
     остаётся только огранка — та самая, ради которой всё и меряется.

     Направление отрезка берётся из НОРМАЛИ треугольника, а не из порядка вершин: контур сечения обязан
     обходиться так, чтобы материал оставался слева, иначе площадь выйдет со знаком минус, а момент —
     бессмысленным. Для нормали (nx, ny) это касательная (−ny, nx). */
  const sectionAt = (tris, zc) => {
    const seg = [];
    for (const T of tris){
      const d = [T[0][2] - zc, T[1][2] - zc, T[2][2] - zc];
      const above = d.filter(x => x > 0).length, below = d.filter(x => x < 0).length;
      if (!above || !below) continue;                      // не пересекает плоскость
      const pts = [];
      for (let k = 0; k < 3; k++){
        const a = T[k], b = T[(k+1)%3], da = d[k], db = d[(k+1)%3];
        if ((da > 0) === (db > 0) || da === db) continue;
        const u = da/(da - db);
        pts.push([a[0] + (b[0]-a[0])*u, a[1] + (b[1]-a[1])*u]);
      }
      if (pts.length !== 2) continue;
      const e1 = [T[1][0]-T[0][0], T[1][1]-T[0][1], T[1][2]-T[0][2]];
      const e2 = [T[2][0]-T[0][0], T[2][1]-T[0][1], T[2][2]-T[0][2]];
      const nx = e1[1]*e2[2] - e1[2]*e2[1], ny = e1[2]*e2[0] - e1[0]*e2[2];
      const tx = -ny, ty = nx;                             // материал слева
      const p0 = pts[0], p1 = pts[1];
      const dir = (p1[0]-p0[0])*tx + (p1[1]-p0[1])*ty;
      seg.push(dir >= 0 ? [p0, p1] : [p1, p0]);
    }
    if (!seg.length) return null;
    let A = 0, Sy = 0, Iy = 0;
    for (const s2 of seg){
      const a = s2[0], b = s2[1], dx = b[0] - a[0];
      A  += 0.5*(a[0]*b[1] - b[0]*a[1]);                   // ∮ (x dy − y dx)/2
      Sy += -(a[1]*a[1] + a[1]*b[1] + b[1]*b[1])/6*dx;     // ∮ (−y²/2) dx = ∫∫ y dA
      Iy += -(a[1]+b[1])*(a[1]*a[1] + b[1]*b[1])/12*dx;    // ∮ (−y³/3) dx = ∫∫ y² dA
    }
    if (!(A > 1e-9)) return null;
    const yc = Sy/A, I = Iy - A*yc*yc;                     // перенос оси в центр тяжести
    let c = 0;
    for (const s2 of seg) c = Math.max(c, Math.abs(s2[0][1]-yc), Math.abs(s2[1][1]-yc));
    return {A, I, c, W: I/c};
  };

  const P = ov => Object.assign(defaultBoxParams(), {hookMount:'wall', hookStyle:'bar'}, ov);
  const W_ = ov => collectPrintWarnings(P(ov)) || [];

  /* ДИАМЕТРОВ ТРИ, И ВОСЬМЁРКИ ОДНОЙ БЫЛО БЫ МАЛО. На Ø8 момент сопротивления круга и его же ПЛОЩАДЬ
     совпадают до знака: πd³/32 = πd²/4 ровно при d = 8. Мутация «взял площадь вместо момента» на этом
     диаметре проходит сквозь сверку сечения незамеченной — поймал её тогда только закон куба. Точка
     вырожденная и попалась в умолчании; проверка идёт по трём диаметрам. */
  for (const d of [5, 8, 12]){
    const t = base({hookMount:'wall', hookStyle:'bar', hookBar:d, hookReach:28});
    const sp = hookSpec(P({hookBar:d, hookReach:28}));
    /* Срез берётся там, где корень уже вышел из пластины, но дуга ещё не вернулась в эту же плоскость:
       J-крючок при 230° проходит один и тот же z дважды, и срез посередине поймал бы два сечения. */
    const bb = computeBBox(t);
    const sec = sectionAt(t, bb.minZ + 6);
    chk('Ø'+d+': сечение корня взято из СЕТКИ, а не из спецификации', !!sec, sec);
    if (!sec) continue;
    /* Многогранник вписан в окружность, поэтому измеренное чуть МЕНЬШЕ круглого — и это единственное
       расхождение, которое здесь допустимо: грани дают около процента по диаметру и втрое больше по
       моменту сопротивления. Допуск и сторона расхождения названы обе. */
    /* Допуск ОДИН ПРОЦЕНТ, и это не придирка: расчёт знает про огранку — он считает тот самый
       многогранник, который кладёт построитель, — так что расходиться им больше не на чем. Пока в
       расчёте стоял круг, срез был на девять процентов меньше на Ø5, и разница шла в опасную сторону:
       обещали прочность, которой в детали нет. Слабый допуск это бы и пропустил. */
    chk('  и оно сходится с тем, из чего считается «держит»',
        Math.abs(sec.W - sp.Weff) < sp.Weff*0.01,
        {Ø:d, измерено:+sec.W.toFixed(2), расчёт:+sp.Weff.toFixed(2)});
    /* И то же число, пересчитанное из ИЗМЕРЕННОГО сечения, даёт тот же вес — с точностью того же
       расхождения. Это и есть проверка «спецификация про эту деталь, а не про соседнюю». */
    const kgMeas = sp.sigma*sec.W/sp.arm/G;
    chk('  вес, пересчитанный из измеренного сечения, тот же',
        Math.abs(kgMeas - sp.kg) < sp.kg*0.01, {Ø:d, измерено:+kgMeas.toFixed(2), сказано:+sp.kg.toFixed(2)});
  }
  const sp = hookSpec(P({hookBar:8, hookReach:28}));

  // 2. ПРАВИЛА РЫЧАГА И КУБА
  const kg = ov => hookSpec(P(ov)).kg;
  chk('вдвое длиннее вылет — вдвое меньше держит',
      Math.abs(kg({hookReach:60})*2 - kg({hookReach:30})) < 1e-9,
      {'30':+kg({hookReach:30}).toFixed(3), '60':+kg({hookReach:60}).toFixed(3)});
  /* ЗАКОН КУБА — при ОДНОЙ И ТОЙ ЖЕ ОГРАНКЕ. Ø5 и Ø6 построитель режет одинаково, на двенадцать
     граней, и тогда отношение точное: (6/5)³. Через границу огранки (Ø12 идёт уже 24 гранями) закон
     только приблизительный, и требовать там точной восьмёрки значило бы требовать от детали того, чем
     она не является, — что и показала мутация, когда расчёт научился считать многогранник. */
  chk('в полтора раза толще пруток — в куб раз больше (куб, а не площадь)',
      Math.abs(kg({hookBar:6})/kg({hookBar:5}) - Math.pow(6/5, 3)) < 1e-9,
      {'5':+kg({hookBar:5}).toFixed(3), '6':+kg({hookBar:6}).toFixed(3),
       отношение:+(kg({hookBar:6})/kg({hookBar:5})).toFixed(4)});
  chk('  а через границу огранки — приблизительно, и это честнее точного',
      Math.abs(kg({hookBar:12})/kg({hookBar:6}) - 8) < 8*0.1 &&
      Math.abs(kg({hookBar:12})/kg({hookBar:6}) - 8) > 1e-6,
      +(kg({hookBar:12})/kg({hookBar:6})).toFixed(3));

  // 3. ПЛЕЧО ВЫВЕДЕНО ИЗ ЗАГИБА
  chk('при загибе от 180° плечо равно вылету',
      Math.abs(hookSpec(P({hookSweep:230, hookReach:28})).arm - 28) < 1e-9,
      hookSpec(P({hookSweep:230})).arm);
  chk('  а при меньшем угле кончик уходит дальше, и плечо растёт',
      hookSpec(P({hookSweep:150, hookReach:28})).arm > 28 + 1,
      +hookSpec(P({hookSweep:150})).arm.toFixed(2));
  chk('  ровно на drop·sin(угол)',
      Math.abs(hookSpec(P({hookSweep:150, hookReach:28, hookDrop:16})).arm
               - (28 + 16*Math.sin(150*Math.PI/180))) < 1e-9, {});

  // 4. СЛОИ
  chk('в числе учтена ПОЛОВИНА прочности — за слои',
      Math.abs(sp.kg - (sp.allow*0.5*sp.Weff/sp.arm/G)) < 1e-9, {kg:+sp.kg.toFixed(3)});
  chk('  и об этом сказано вслух', W_({}).some(x => /СЛОИ/.test(x) && /половина прочности/.test(x)), W_({}));
  chk('  и про стену, за которую расчёт не отвечает, тоже',
      W_({}).some(x => /за стену и дюбель/.test(x)), W_({}));
  chk('  а на трубе речь идёт о трубе, а не о стене',
      W_({hookMount:'pipe'}).some(x => /за трубу/.test(x) && /разожмётся/.test(x)),
      W_({hookMount:'pipe'}));

  // 5. «МАЛО» — ЭТО МАЛО ДЛЯ ЧЕГО
  chk('число названо человеку', W_({}).some(x => /крючок держит/.test(x)), W_({}));
  chk('тонкий пруток объявлен слабым для куртки',
      W_({hookBar:4}).some(x => /этого мало/.test(x)), W_({hookBar:4}));
  chk('  а восьмёрка при вылете 28 — нет', !W_({}).some(x => /этого мало/.test(x)), W_({}));
  chk('щётке тех же полутора килограммов ХВАТАЕТ — порог свой у каждой роли',
      !W_({hookStyle:'brush'}).some(x => /этого мало/.test(x)) &&
      hookSpec(P({hookStyle:'brush'})).kg < 2, +hookSpec(P({hookStyle:'brush'})).kg.toFixed(2));
  chk('у седла наушников запас назван многократным',
      W_({hookStyle:'headphone'}).some(x => /запас здесь многократный/.test(x)),
      W_({hookStyle:'headphone'}));
  chk('мыльница честно говорит, что считана по худшему месту',
      W_({hookStyle:'soap'}).some(x => /САМОМУ ХУДШЕМУ/.test(x)), W_({hookStyle:'soap'}));

  // МАТЕРИАЛ — тот же выбор, что у всей остальной упругости
  chk('PETG держит больше PLA — материал берётся из общего выбора',
      hookSpec(P({printMat:'petg'})).kg > hookSpec(P({printMat:'pla'})).kg*1.2,
      {pla:+hookSpec(P({printMat:'pla'})).kg.toFixed(2), petg:+hookSpec(P({printMat:'petg'})).kg.toFixed(2)});
}

console.log('\n=== TOTAL:',pass,'passed,',fail,'failed ===');
process.exit(fail?1:0);
