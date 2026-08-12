// Project box (электрокорпус): tray + drop-in lid, through the REAL buildTrisForShape pipeline.
// Verifies watertightness across sizes/options, that the lid clears the tray cavity (fits), that
// posts/standoffs add material, and that box-mode add-ons are gated off. Run via ./run-all.sh.
let pass=0,fail=0; function chk(n,c,e){if(c){pass++;console.log('  OK  ',n);}else{fail++;console.log('  FAIL',n,e!==undefined?JSON.stringify(e):'');}}
function vol(t){let v=0;for(const T of t){const a=T[0],b=T[1],c=T[2];v+=(a[0]*(b[1]*c[2]-b[2]*c[1])-a[1]*(b[0]*c[2]-b[2]*c[0])+a[2]*(b[0]*c[1]-b[1]*c[0]))/6;}return v;}
function base(ov){ logos.length=0; boxHoles.length=0; dieFaces.length=0;
  Object.assign(paramState.box, defaultBoxParams(), {width:40,height:40,depth:40,
    pbPart:'tray',pbW:80,pbD:60,pbH:30,pbWall:2.4,pbFloor:2.4,pbFlange:1.5,pbScrewD:3,pbPostD:8,pbClear:0.35,
    pbLidT:2.4,pbLipH:5,pbBossNX:0,pbBossNZ:0,pbBossD:6,pbBossH:5,pbBossBore:2.6,
    woBack:'none',hookMount:'none',mntMode:'none',gearMode:'none',pipMode:'none',threadMode:'none',
    sheetShape:'none',keycapMode:'none',platonic:'none',polyN:0,binRound:0,
    scoopDir:'none',labelTab:'none',mountHoles:'none',gripWall:'none',divX:1,divZ:1,stackFeet:false,gfOn:false}, ov);
  return buildTrisForShape('box',paramState.box); }

console.log('=== watertight: part × size × options ===');
for(const part of ['tray','lid','both'])
  for(const size of [{pbW:40,pbD:40,pbH:15},{pbW:80,pbD:60,pbH:30},{pbW:180,pbD:120,pbH:60}])
    for(const opt of [{},{pbBossNX:2,pbBossNZ:2},{pbWall:1.6,pbFlange:0.8,pbScrewD:4}]){
      const t=base(Object.assign({pbPart:part},size,opt)); const mc=manifoldCheck(t,4);
      chk(part+' '+JSON.stringify(size)+' '+JSON.stringify(opt)+' watertight (+vol)',
          mc.watertight&&vol(t)>0, {wt:mc.watertight,open:mc.openEdges,bad:mc.badEdges});
    }

console.log('=== dimensions ===');
{ const b=computeBBox(base({pbPart:'tray',pbW:100,pbD:70,pbH:40}));
  chk('tray outer X = pbW', Math.abs((b.maxX-b.minX)-100)<0.6, {x:+(b.maxX-b.minX).toFixed(1)});
  chk('tray outer Z = pbD', Math.abs((b.maxZ-b.minZ)-70)<0.6, {z:+(b.maxZ-b.minZ).toFixed(1)});
  chk('tray height ≈ pbH', Math.abs((b.maxY-b.minY)-40)<1.5, {y:+(b.maxY-b.minY).toFixed(1)}); }
{ const lo=computeBBox(base({pbPart:'tray',pbH:20})), hi=computeBBox(base({pbPart:'tray',pbH:50}));
  chk('taller walls → taller tray', Math.abs(((hi.maxY-hi.minY)-(lo.maxY-lo.minY))-30)<1.5, {}); }

console.log('=== lid fits the tray (lip clears the cavity) ===');
{ // The lid lip outer footprint must be smaller than the tray inner cavity by ~2·clearance, so it drops in.
  const W=80,D=60,wall=2.4,flange=1.5,clr=0.35;
  const cavityW=(W-2*flange)-2*wall, cavityD=(D-2*flange)-2*wall;   // inner footprint
  const lid=base({pbPart:'lid',pbW:W,pbD:D,pbWall:wall,pbFlange:flange,pbClear:clr,pbLidT:2.4,pbLipH:6});
  // measure the lip: the widest X extent BELOW the plate (plate is centred; lip hangs to −Y)
  const b=computeBBox(lid); let lipMaxX=-1e9,lipMinX=1e9;
  for(const T of lid) for(const v of T) if(v[1] < b.minY+ (b.maxY-b.minY)*0.4){ if(v[0]>lipMaxX)lipMaxX=v[0]; if(v[0]<lipMinX)lipMinX=v[0]; }
  const lipW=lipMaxX-lipMinX;
  chk('lid lip fits inside tray cavity (with clearance)', lipW < cavityW-0.4 && lipW > cavityW-2.5, {lipW:+lipW.toFixed(2),cavityW:+cavityW.toFixed(2)}); }
{ const plate=computeBBox(base({pbPart:'lid'}));
  chk('lid outer X ≈ wall footprint (pbW − 2·flange)', Math.abs((plate.maxX-plate.minX)-(80-2*1.5))<0.8, {x:+(plate.maxX-plate.minX).toFixed(1)}); }

console.log('=== posts & standoffs add material ===');
{ const none=vol(base({pbBossNX:0,pbBossNZ:0})), grid=vol(base({pbBossNX:2,pbBossNZ:3}));
  chk('PCB standoffs add material', grid>none, {none:+none.toFixed(0),grid:+grid.toFixed(0)}); }
{ const thin=vol(base({pbPostD:6})), thick=vol(base({pbPostD:12}));
  chk('thicker corner posts add material', thick>thin, {thin:+thin.toFixed(0),thick:+thick.toFixed(0)}); }
{ const both=base({pbPart:'both'}); const b=computeBBox(both);
  chk('both parts span wider in X than a single tray', (b.maxX-b.minX) > 80, {x:+(b.maxX-b.minX).toFixed(1)}); }

console.log('=== connector cutouts in the walls ===');
function holed(ov, holes){ const t=base(ov); boxHoles.length=0; for(const h of holes) boxHoles.push(h);
  Object.assign(paramState.box, ov||{}); return buildTrisForShape('box',paramState.box); }
{ // a cutout on each face must stay watertight AND actually remove material from that wall
  for(const face of ['+Z','-Z','+X','-X','-Y']){
    const solid=vol(base({pbW:100,pbD:80,pbH:40}));
    const t=holed({pbW:100,pbD:80,pbH:40},[{id:7,face,u0:0,v0:0,shape:'circle',diameter:10}]);
    const mc=manifoldCheck(t,4);
    chk('cutout on '+face+' watertight + removes material', mc.watertight && vol(t)<solid, {wt:mc.watertight,bad:mc.badEdges});
    boxHoles.length=0; }
}
{ // the real use case: a USB-C port + a barrel jack + a side vent, all at once
  const t=holed({pbW:100,pbD:80,pbH:40},[{id:1,face:'+Z',u0:-20,v0:0,shape:'rrect',portW:9,portH:3.4,cornerR:1.6},
                                          {id:2,face:'+Z',u0:20,v0:0,shape:'circle',diameter:6},
                                          {id:3,face:'-X',u0:0,v0:0,shape:'circle',diameter:12}]);
  const mc=manifoldCheck(t,4);
  chk('multi-port enclosure (USB-C + jack + vent) watertight', mc.watertight && vol(t)>0, {wt:mc.watertight,bad:mc.badEdges,open:mc.openEdges});
  boxHoles.length=0; }
{ const solid=vol(base({pbPart:'lid',pbW:100,pbD:80,pbH:40}));
  const t=holed({pbPart:'lid',pbW:100,pbD:80,pbH:40},[{id:9,face:'+Y',u0:0,v0:0,shape:'circle',diameter:12}]);
  chk('top-face cutout lands on the lid', manifoldCheck(t,4).watertight && vol(t)<solid, {});
  boxHoles.length=0; }

console.log('=== PCB board presets ===');
for(const board of ['pi4','pizero','uno','nano','esp32'])
  for(const s of [{pbW:100,pbD:75,pbH:35},{pbW:160,pbD:110,pbH:50}]){
    const t=base(Object.assign({pbPart:'tray',pbBoard:board},s)); const mc=manifoldCheck(t,4);
    chk(board+' '+JSON.stringify(s)+' watertight (+vol)', mc.watertight&&vol(t)>0, {wt:mc.watertight,bad:mc.badEdges});
  }
{ const none=vol(base({pbPart:'tray',pbW:160,pbD:110,pbH:40,pbBoard:'none'}));
  for(const b of ['pi4','uno','nano'])
    chk(b+' preset adds standoffs', vol(base({pbPart:'tray',pbW:160,pbD:110,pbH:40,pbBoard:b}))>none, {}); }
{ // the Uno's four holes are famously NOT a rectangular grid — the preset must preserve that
  const h=PCB_BOARDS.uno.holes, xs=new Set(h.map(q=>q[0].toFixed(2))), zs=new Set(h.map(q=>q[1].toFixed(2)));
  chk('Uno preset keeps its irregular (non-grid) pattern', xs.size>2 || zs.size>2, {xs:xs.size,zs:zs.size}); }
{ // a board bigger than the enclosure must degrade safely (standoffs outside the post ring are dropped)
  const t=base({pbPart:'tray',pbW:60,pbD:45,pbH:25,pbBoard:'pi4'});
  chk('oversized board degrades safely', manifoldCheck(t,4).watertight && vol(t)>0, {}); }
{ const grid=vol(base({pbPart:'tray',pbW:160,pbD:110,pbBoard:'none',pbBossNX:2,pbBossNZ:2}));
  const preset=vol(base({pbPart:'tray',pbW:160,pbD:110,pbBoard:'pi4',pbBossNX:2,pbBossNZ:2}));
  chk('preset overrides the manual grid', Math.abs(preset-grid)>1, {grid:+grid.toFixed(0),preset:+preset.toFixed(0)}); }

console.log('=== gating + regression ===');
{ const a=base({}).length, b=base({scoopDir:'front',gripWall:'front',mountHoles:'4',stackFeet:true,divX:2,divZ:2,hollow:true}).length;
  chk('box add-ons skipped on a project box', a===b, {a,b}); }
{ Object.assign(paramState.box, defaultBoxParams(), {width:40,height:40,depth:40,pbPart:'none'});
  const t=buildTrisForShape('box',paramState.box); const b=computeBBox(t);
  chk('pbPart none → normal cube', manifoldCheck(t,4).watertight && Math.abs((b.maxX-b.minX)-40)<1e-6, {}); }

console.log('\n=== вентрешётка в стенке ===');
{
  /* Решётка это ОКНО в плите стенки плюс отдельные перемычки, каждая своим замкнутым телом. Проверяется
     не «строится ли» — герметичной вышла бы и стенка, в которой окно не прорезалось вовсе (ровно такая
     ошибка тут и случилась: у ±X стенок первая ось окна ВЕРТИКАЛЬНАЯ, у ±Z горизонтальная, и перепутанные
     местами ap/aq просто не резали ничего). Поэтому меряется ОБЪЁМ и положение перемычек. */
  const none = base({pbVent:'none'});
  for (const face of ['-Z','+Z','-X','+X']) for (const dir of ['vert','horiz']) {
    const t = base({pbVent:face, pbVentDir:dir, pbVentW:40, pbVentH:16, pbVentN:7, pbVentBar:1.6});
    const mc = manifoldCheck(t,4);
    chk('решётка '+face+' '+dir+': герметична', mc.watertight, {open:mc.openEdges, bad:mc.badEdges});
    chk('решётка '+face+' '+dir+': стенка правда прорезана', vol(t) < vol(none) - 300,
        {c:+(vol(t)-vol(none)).toFixed(0)});
  }
  // перемычек ровно на одну меньше, чем щелей, и каждая — отдельная коробка в 12 треугольников
  const t2 = base({pbVent:'-Z', pbVentN:2}), t7 = base({pbVent:'-Z', pbVentN:7});
  chk('каждая лишняя щель добавляет ровно одну перемычку', t7.length - t2.length === 12*5,
      {d:t7.length - t2.length});
  /* Перемычка ТОНЬШЕ стенки и утоплена. Вровень её лицевая грань легла бы в ту же плоскость, что и лицо
     стенки, и на перекрытии у краёв окна две плоские грани совпали бы ПЛОЩАДЬЮ — это не проникновение, а
     лишние треугольники на общем ребре, которых manifoldCheck не видит (он сшивает рёбра ненаправленно).

     Меряется набором ПЛОСКОСТЕЙ поперёк стенки в зоне окна: их должно быть ровно четыре — лицо стенки,
     лицо перемычки, тыл перемычки, тыл стенки, — и обе средние обязаны стоять строго внутри с зазором.
     Готовый лоток центрируется по габариту, поэтому отсчёт идёт от габарита, а не от сырых координат. */
  {
    const t = base({pbVent:'-Z', pbVentW:40, pbVentH:16, pbVentN:7, pbVentBar:1.6});
    const b = computeBBox(t);
    const wall = 2.4, Dw = 60 - 2*1.5, zOuter = -Dw/2;
    const cv = ((2.4 - Math.min(2.4*0.6, 1.0)) + 30)/2 - (b.maxY - b.minY)/2;
    const zs = new Set();
    for (const T of t) for (const q of T)
      if (Math.abs(q[0]) < 16 && Math.abs(q[1] - cv) < 9.5 && q[2] < zOuter + wall + 0.6)
        zs.add(+q[2].toFixed(4));
    const arr = [...zs].sort((x,y) => x - y);
    chk('поперёк стенки в окне ровно четыре плоскости', arr.length === 4, arr);
    chk('крайние две — это сама стенка',
        arr.length === 4 && Math.abs(arr[0] - zOuter) < 1e-6 && Math.abs(arr[3] - (zOuter + wall)) < 1e-6, arr);
    chk('перемычка утоплена с обеих сторон, а не вровень',
        arr.length === 4 && arr[1] > arr[0] + 0.1 && arr[2] < arr[3] - 0.1,
        arr.length === 4 ? [+(arr[1]-arr[0]).toFixed(3), +(arr[3]-arr[2]).toFixed(3)] : arr);
    /* Сколько перемычек НА САМОМ ДЕЛЕ. Разница числа треугольников между двумя настройками этого не
       говорит: лишняя перемычка, приписанная к обеим, разницу не меняет. Считаются РЁБРА перемычек —
       различные x на их собственной плоскости: у семи щелей шесть перемычек и двенадцать таких x. */
    const barZ = arr[1], xs = new Set();
    for (const T of t) for (const q of T)
      if (Math.abs(q[2] - barZ) < 1e-6 && Math.abs(q[1] - cv) < 9.5) xs.add(+q[0].toFixed(4));
    chk('перемычек ровно на одну меньше, чем щелей', xs.size === 2*(7 - 1), {x:xs.size});
    /* И каждая ЗАХОДИТ в раму окна. Ровно по краю мало: тела тогда лишь касаются, а касание по грани это
       не объединение, а два тела, между которыми ноль материала. */
    let along = 0;
    for (const T of t) for (const q of T)
      if (Math.abs(q[2] - barZ) < 1e-6 && Math.abs(q[0]) < 16) along = Math.max(along, Math.abs(q[1] - cv));
    chk('перемычка заходит в раму, а не упирается в край окна', along > 16/2 + 0.2, +along.toFixed(2));
  }
  // щель не может стать тоньше того, что пропечатается: толщина перемычки зажимается тем, что осталось
  {
    /* Спецификация теперь отдаёт СПИСОК решёток — по одной на каждую выбранную стенку: одна решётка это
       не вентиляция, воздуху нужен и приток, и отток. Здесь мерится одна, поэтому берётся первая. */
    const g = pboxVentSpec({pbVent:'-Z', pbVentN:24, pbVentBar:6, pbVentW:40, pbVentH:16})[0];
    chk('щель не тоньше 0.8 мм даже при 24 щелях и толстой перемычке', g.slot >= 0.8 - 1e-9, g.slot);
    chk('и перемычка при этом ужалась, а не окно', g.bar < 6, g.bar);
    const t = base({pbVent:'-Z', pbVentN:24, pbVentBar:6});
    chk('и такое всё ещё герметично', manifoldCheck(t,4).watertight);
  }
  // окно шире стенки зажимается по стенке, а не вылезает
  {
    const t = base({pbVent:'-Z', pbVentW:999, pbVentH:999});
    { const __mc = manifoldCheck(t,4); chk('окно во всю стенку: герметично', __mc.watertight, __mc); }
    chk('и рама всё-таки осталась', vol(t) > 0, vol(t)|0);
    /* Габарит — вот что ловит окно, не зажатое по стенке: контур, который шире грани, уводит вершины
       кольцевого стежка ЗА корпус, а герметичность этого не видит (manifoldCheck сшивает рёбра и на
       вывернутые лоскуты не смотрит). */
    const bn = computeBBox(none), bv = computeBBox(t);
    chk('и габарит корпуса от неё не вырос',
        Math.abs(bv.maxX-bn.maxX)<1e-6 && Math.abs(bv.minX-bn.minX)<1e-6 &&
        Math.abs(bv.maxZ-bn.maxZ)<1e-6 && Math.abs(bv.minZ-bn.minZ)<1e-6 &&
        Math.abs(bv.maxY-bn.maxY)<1e-6 && Math.abs(bv.minY-bn.minY)<1e-6,
        {none:bn, vent:bv});
    const tiny = base({pbVent:'-Z', pbW:24, pbD:22, pbH:10});
    { const __mc = manifoldCheck(tiny,4); chk('крошечный корпус с решёткой: герметичен', __mc.watertight, __mc); }
  }
  // по умолчанию решётки нет, и на крышке её тоже нет
  // предупреждения говорят то, что иначе замечаешь уже на столе
  {
    base({pbVent:'-Z', pbVentN:24, pbVentBar:6});
    const w1 = collectPrintWarnings(paramState.box);
    chk('ужатая перемычка — сказано', w1.some(x => /перемычка ужата/.test(x)), w1);
    base({pbVent:'-Z', pbVentDir:'horiz'});
    chk('горизонтальные щели — сказано про мосты',
        collectPrintWarnings(paramState.box).some(x => /мостами/.test(x)));
    /* СКВОЗНЯК проверяется отдельно и первым: одна решётка это не вентиляция — тёплый воздух упирается в
       глухие стенки и остаётся внутри. Приложение обязано сказать это вслух, иначе корпус выйдет исправным
       и бесполезным. */
    base({pbVent:'-Z', pbVentDir:'vert', pbVentN:7, pbVentBar:1.6});
    chk('одна решётка — сказано, что нужен и приток, и отток',
        collectPrintWarnings(paramState.box).some(x => /приток/.test(x)),
        collectPrintWarnings(paramState.box));
    for(const v of ['ZZ','XX','all']){
      base({pbVent:v, pbVentDir:'vert', pbVentN:7, pbVentBar:1.6});
      chk(v+': про приток больше не говорится',
          collectPrintWarnings(paramState.box).every(x => !/приток/.test(x)));
      const g = pboxVentSpec(paramState.box);
      chk(v+': решёток столько, сколько стенок', g.length === (v === 'all' ? 4 : 2), g.length);
      chk(v+': все грани разные', new Set(g.map(q=>q.face)).size === g.length, g.map(q=>q.face));
    }
    /* И РЕЖЕТСЯ ли вторая решётка на самом деле — предупреждения об этом не знают. Мерится объёмом:
       две решётки обязаны убрать примерно вдвое больше материала, чем одна. */
    {
      const vol = t => { let v = 0; for(const T of t){ const a=T[0],b=T[1],c=T[2];
        v += (a[0]*(b[1]*c[2]-b[2]*c[1]) - a[1]*(b[0]*c[2]-b[2]*c[0]) + a[2]*(b[0]*c[1]-b[1]*c[0]))/6; }
        return Math.abs(v); };
      base({pbVent:'none'});   const v0 = vol(buildTrisForShape('box', paramState.box));
      base({pbVent:'-Z'});     const v1 = vol(buildTrisForShape('box', paramState.box));
      base({pbVent:'ZZ'});     const v2 = vol(buildTrisForShape('box', paramState.box));
      base({pbVent:'all'});    const v4 = vol(buildTrisForShape('box', paramState.box));
      chk('одна решётка убирает материал', v1 < v0 - 1, {без:+v0.toFixed(0), одна:+v1.toFixed(0)});
      chk('сквозняк убирает примерно вдвое больше',
          Math.abs((v0 - v2) - 2*(v0 - v1)) < (v0 - v1)*0.15,
          {одна:+(v0-v1).toFixed(0), две:+(v0-v2).toFixed(0)});
      chk('четыре стенки убирают больше двух', (v0 - v4) > (v0 - v2) + 1,
          {две:+(v0-v2).toFixed(0), четыре:+(v0-v4).toFixed(0)});
      chk('и деталь при этом остаётся герметичной',
          manifoldCheck(buildTrisForShape('box', paramState.box), 4).watertight);
    }
    base({pbVent:'ZZ', pbVentDir:'vert', pbVentN:7, pbVentBar:1.6});
    chk('а на разумных настройках и сквозняке решётка молчит',
        collectPrintWarnings(paramState.box).every(x => !/вентрешётк/.test(x)),
        collectPrintWarnings(paramState.box));
    base({pbVent:'none'});
    chk('и без решётки молчит тоже',
        collectPrintWarnings(paramState.box).every(x => !/вентрешётк/.test(x)));
  }
  /* Решётка живёт в стенке ЛОТКА; у крышки стенок нет. Раньше на крышке она молча не строилась и
     предупреждений при этом не было — включил, ничего не изменилось, никто не сказал. */
  {
    const lidNo = base({pbPart:'lid', pbVent:'none'}), lidYes = base({pbPart:'lid', pbVent:'-Z'});
    chk('на крышке решётки нет', lidYes.length === lidNo.length, {no:lidNo.length, yes:lidYes.length});
    base({pbPart:'lid', pbVent:'-Z'});
    chk('и про это сказано вслух',
        collectPrintWarnings(paramState.box).some(x => /только на лотке/.test(x)),
        collectPrintWarnings(paramState.box));
    chk('спека на крышке пуста', pboxVentSpec({pbPart:'lid', pbVent:'-Z'}) === null);
  }
  /* Размеры корпуса считаются в ОДНОМ месте. Раньше построитель брал min(W,D)/4, а предупреждение
     пересчитывало по вставленным Ww/Dw, и на маленьком корпусе с толстой стенкой выходило 5 против 4,25:
     предупреждение говорило про деталь, которой не строилось. Проверяется на той самой настройке. */
  {
    const p3 = {pbW:20, pbD:20, pbH:30, pbWall:8, pbFlange:1.5};
    const d = pboxDims(p3);
    chk('толщина стенки зажата по НАРУЖНОМУ габариту', Math.abs(d.wall - 5) < 1e-9, d.wall);
    chk('и пролёт стенки считается от него же', Math.abs(d.Ww - 17) < 1e-9 && Math.abs(d.Dw - 17) < 1e-9, [d.Ww, d.Dw]);
    const t = base(Object.assign({pbPart:'tray', pbVent:'-Z'}, p3));
    { const __mc = manifoldCheck(t,4); chk('и корпус на этой настройке строится герметичным', __mc.watertight, __mc); }
  }
  chk('по умолчанию решётки нет', base({}).length === none.length);
  chk('строка есть и она про стенки',
      SHAPE_PARAMS.box.filter(r => r.key && r.key.indexOf('pbVent') === 0).length >= 6);
  chk('и настройки решётки видны только когда она включена',
      SHAPE_PARAMS.box.filter(r => r.key === 'pbVentN')[0].only.pbVent.indexOf('-Z') >= 0);
  base({});
}

/* ВВОДЫ ПОД ПРОВОДКУ. Механика раскладки по граням та же, что у решётки, поэтому и проверяется то же:
   сколько граней заказано, столько отверстий и прорезано. Мерится объёмом — предупреждения о том, что
   отверстие ДЕЙСТВИТЕЛЬНО прорезано, не знают ничего. */
console.log('=== вводы под проводку ===');
{
  const vol = t => { let v = 0; for(const T of t){ const a=T[0],b=T[1],c=T[2];
    v += (a[0]*(b[1]*c[2]-b[2]*c[1]) - a[1]*(b[0]*c[2]-b[2]*c[0]) + a[2]*(b[0]*c[1]-b[1]*c[0]))/6; }
    return Math.abs(v); };
  base({pbCable:'none'}); const v0 = vol(buildTrisForShape('box', paramState.box));
  base({pbCable:'-Z', pbCableD:8, pbCableN:1}); const v1 = vol(buildTrisForShape('box', paramState.box));
  base({pbCable:'ZZ', pbCableD:8, pbCableN:1}); const v2 = vol(buildTrisForShape('box', paramState.box));
  base({pbCable:'all', pbCableD:8, pbCableN:1}); const v4 = vol(buildTrisForShape('box', paramState.box));
  chk('один ввод убирает материал', v1 < v0 - 0.5, {без:+v0.toFixed(0), один:+v1.toFixed(0)});
  chk('два ввода убирают примерно вдвое больше',
      Math.abs((v0 - v2) - 2*(v0 - v1)) < (v0 - v1)*0.2, {один:+(v0-v1).toFixed(1), два:+(v0-v2).toFixed(1)});
  chk('четыре — больше двух', (v0 - v4) > (v0 - v2) + 0.5);
  chk('и деталь остаётся герметичной',
      manifoldCheck(buildTrisForShape('box', paramState.box), 4).watertight);
  // столько отверстий, сколько заказано на стенку
  for(const n of [1, 3]){
    base({pbCable:'-Z', pbCableD:6, pbCableN:n});
    const g = pboxCableSpec(paramState.box);
    chk('на стенке ровно '+n+' ввод(а)', g[0].cs.length === n, g[0].cs.length);
    chk('и они разложены ровно, а не от края',
        Math.abs(g[0].cs.reduce((a,b)=>a+b, 0)) < 1e-6, g[0].cs.map(v=>+v.toFixed(2)));
  }
  // Ø и высота слушаются, и отверстие не съедает дно
  for(const d of [4, 20]) for(const y of [2, 200]){
    base({pbCable:'-Z', pbCableD:d, pbCableN:1, pbCableY:y, pbH:40});
    const g = pboxCableSpec(paramState.box);
    if(!g) continue;
    chk('Ø '+d+' высота '+y+': Ø заказанный', Math.abs(g[0].d - d) < 1e-9, g[0].d);
    chk('Ø '+d+' высота '+y+': ось не выходит за стенку',
        g[0].cy - d/2 > 0 && g[0].cy + d/2 < 40, +g[0].cy.toFixed(2));
  }
  base({pbCable:'-Z', pbCableD:30, pbCableN:8});
  chk('когда не влезает — сказано, а не построено молча',
      collectPrintWarnings(paramState.box).some(x => /вводы/.test(x)),
      collectPrintWarnings(paramState.box));
  base({pbPart:'lid', pbCable:'ZZ'});
  chk('на крышке вводов нет, и это сказано',
      collectPrintWarnings(paramState.box).some(x => /вводы: у крышки/.test(x)));
  // решётка и вводы уживаются на одной стенке
  base({pbCable:'ZZ', pbCableD:6, pbCableN:2, pbCableY:6, pbVent:'ZZ', pbH:40});
  chk('вводы и решётка на одной стенке — деталь цела',
      manifoldCheck(buildTrisForShape('box', paramState.box), 4).watertight);
}

console.log('\n=== TOTAL:',pass,'passed,',fail,'failed ===');
process.exit(fail?1:0);
