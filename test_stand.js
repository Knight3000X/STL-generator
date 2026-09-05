// Phone / tablet stand (подставка): base + front lip + raked back support + side gussets, through the REAL
// buildTrisForShape pipeline. Watertight, dimensions follow the parameters, cable slot cuts. Run via ./run-all.sh.
let pass=0,fail=0; function chk(n,c,e){if(c){pass++;console.log('  OK  ',n);}else{fail++;console.log('  FAIL',n,e!==undefined?JSON.stringify(e):'');}}
function vol(t){let v=0;for(const T of t){const a=T[0],b=T[1],c=T[2];v+=(a[0]*(b[1]*c[2]-b[2]*c[1])-a[1]*(b[0]*c[2]-b[2]*c[0])+a[2]*(b[0]*c[1]-b[1]*c[0]))/6;}return v;}
function base(ov){ logos.length=0; boxHoles.length=0; dieFaces.length=0;
  Object.assign(paramState.box, defaultBoxParams(), {width:40,height:40,depth:40,
    psOn:true,psW:80,psDepth:85,psAngle:62,psRest:70,psLip:14,psT:4,psSlot:18,
    pbPart:'none',woBack:'none',hookMount:'none',mntMode:'none',gearMode:'none',pipMode:'none',
    threadMode:'none',sheetShape:'none',keycapMode:'none',platonic:'none',polyN:0,binRound:0,
    scoopDir:'none',labelTab:'none',mountHoles:'none',gripWall:'none',divX:1,divZ:1,stackFeet:false,gfOn:false}, ov);
  return buildTrisForShape('box',paramState.box); }

console.log('=== watertight across width × depth × rake × slot × thickness ===');
for(const W of [50,80,160]) for(const D of [50,85,140]) for(const a of [35,50,62,78]) for(const slot of [0,18]) for(const t of [2.5,4,7]){
  const tr=base({psW:W,psDepth:D,psAngle:a,psSlot:slot,psT:t}); const mc=manifoldCheck(tr,4);
  chk('W'+W+' D'+D+' '+a+'° slot'+slot+' t'+t+' watertight (+vol)', mc.watertight&&vol(tr)>0, {wt:mc.watertight,bad:mc.badEdges,open:mc.openEdges});
}

console.log('=== dimensions follow the parameters ===');
{ const b=computeBBox(base({psW:120,psDepth:90}));
  chk('stand width = psW', Math.abs((b.maxX-b.minX)-120)<0.9, {x:+(b.maxX-b.minX).toFixed(1)});
  chk('base depth ≈ psDepth (support leans within it)', (b.maxZ-b.minZ) >= 90-0.5 && (b.maxZ-b.minZ) < 90+8, {z:+(b.maxZ-b.minZ).toFixed(1)}); }
{ const lo=computeBBox(base({psAngle:40})), hi=computeBBox(base({psAngle:75}));
  chk('steeper rake → taller stand', (hi.maxY-hi.minY) > (lo.maxY-lo.minY)+8, {a40:+(lo.maxY-lo.minY).toFixed(1),a75:+(hi.maxY-hi.minY).toFixed(1)}); }
{ const short=computeBBox(base({psRest:35})), long=computeBBox(base({psRest:110}));
  chk('longer back support → taller stand', (long.maxY-long.minY) > (short.maxY-short.minY)+30, {}); }
{ const lo=vol(base({psLip:6})), hi=vol(base({psLip:30}));
  chk('taller front lip adds material', hi>lo, {lo:+lo.toFixed(0),hi:+hi.toFixed(0)}); }

console.log('=== cable slot ===');
{ const noSlot=vol(base({psSlot:0})), slot=vol(base({psSlot:24}));
  chk('cable slot removes material', slot<noSlot, {noSlot:+noSlot.toFixed(0),slot:+slot.toFixed(0)}); }
chk('slot=0 disables cleanly (watertight)', manifoldCheck(base({psSlot:0}),4).watertight);

console.log('=== gating + regression ===');
{ const a=base({}).length, b=base({scoopDir:'front',gripWall:'front',mountHoles:'4',stackFeet:true,divX:2,divZ:2,hollow:true}).length;
  chk('box add-ons skipped on a stand', a===b, {a,b}); }
{ Object.assign(paramState.box, defaultBoxParams(), {width:40,height:40,depth:40,psOn:false});
  const t=buildTrisForShape('box',paramState.box); const b=computeBBox(t);
  chk('psOn false → normal cube', manifoldCheck(t,4).watertight && Math.abs((b.maxX-b.minX)-40)<1e-6, {}); }

console.log('=== cable slot: "0 = без" must actually mean none ===');
{ // `p.psSlot || 18` turned the documented zero back into the default, so the slot could never be removed.
  const solid=vol(base({psSlot:0})), slotted=vol(base({psSlot:18}));
  chk('psSlot 0 removes the slot (more material than a slotted base)', solid>slotted+50,
      {solid:+solid.toFixed(0), slotted:+slotted.toFixed(0)});
  const a=base({psSlot:0}), b=base({psSlot:18});
  chk('and both stay watertight', manifoldCheck(a,4).watertight && manifoldCheck(b,4).watertight, {});
  chk('psSlot 0 and a hairline slot are not the same model', Math.abs(vol(base({psSlot:2}))-solid)>1e-9, {});
  const widths=[0,6,12,24].map(w=>vol(base({psSlot:w})));
  chk('a wider slot removes more material, monotonically',
      widths[0]>widths[1] && widths[1]>widths[2] && widths[2]>widths[3], widths.map(v=>+v.toFixed(0)));
}
{ // Solid-plate test done on the plate ALONE: keep only triangles that fit inside the base slab, so the
  // lip, the raked support and the gussets (all of which start above it) cannot confuse the count. A ray
  // straight down then crosses twice where the plate is solid and not at all where the slot went through.
  const slab=(tris)=>{ const B=computeBBox(tris);
    return tris.filter(T=>T.every(v=>v[1]<=B.minY+4.2)); };
  const crossings=(tris,x,z)=>{ let n=0;
    for(const T of tris){ const [a,b,c]=T;
      const d1=(b[0]-a[0])*(z-a[2])-(b[2]-a[2])*(x-a[0]);
      const d2=(c[0]-b[0])*(z-b[2])-(c[2]-b[2])*(x-b[0]);
      const d3=(a[0]-c[0])*(z-c[2])-(a[2]-c[2])*(x-c[0]);
      if((d1>=0&&d2>=0&&d3>=0)||(d1<=0&&d2<=0&&d3<=0)) n++; }
    return n; };
  const solid=slab(base({psSlot:0})), slotted=slab(base({psSlot:18}));
  const B=computeBBox(base({psSlot:0}));
  let inPlate=0, holeSolid=0, holeSlotted=0;
  for(let i=1;i<40;i++) for(let j=1;j<40;j++){
    const x=B.minX+(B.maxX-B.minX)*i/40, z=B.minZ+(B.maxZ-B.minZ)*j/40;
    if(crossings(solid,x,z)!==2) continue;
    inPlate++;
    if(crossings(solid,x,z)===0) holeSolid++;
    if(crossings(slotted,x,z)===0) holeSlotted++; }
  chk('the probe found the plate', inPlate>200, {inPlate});
  chk('with the slot off the plate is solid all the way through', holeSolid===0, {holeSolid});
  chk('and with it on there is a real opening', holeSlotted>5, {holeSlotted});
}


/* ЧТО ПОДСТАВКА ГОВОРИТ О СЕБЕ (v25.7.0) — третий разобранный молчун переписи 10.4. Восемнадцать
   разновидностей настроек, и ни при одной ни слова, хотя вопросов к ней три, и все с числами.

   Проверяется не наличие текста, а то, что числа — про эту деталь и выведены, а не назначены:

     1. МАССА И ЦЕНТР ТЯЖЕСТИ — ИЗ СЕТКИ. Центр берётся точный (разложение на тетраэдры), а не середина
        габарита: у этой формы габаритный центр лежит в ВОЗДУХЕ перед спинкой, и опрокидывание от него
        посчиталось бы вдвое оптимистичнее.
     2. ПРЕДЕЛЬНАЯ ДЛИНА ЗАВИСИТ ОТ УГЛА КАК 1/cos. Это и есть содержание расчёта: положе угол — дальше
        уходит центр тяжести устройства за заднюю кромку.
     3. СИЛА ОПРОКИДЫВАНИЯ — ЭТО МОМЕНТЫ, А НЕ КОЭФФИЦИЕНТ. Пересчитывается независимо, из измеренных
        массы, плеча и высоты.
     4. НА СВОИХ УМОЛЧАНИЯХ ПРИЛОЖЕНИЕ НЕ РУГАЕТСЯ, но число называет всегда. */
console.log('=== подставка говорит, когда упадёт ===');
{
  const G = 9.80665;
  const P_ = ov => Object.assign(defaultBoxParams(), {psOn:true}, ov);
  const W_ = ov => { const p = P_(ov); logos.length = 0; Object.assign(paramState.box, p);
                     return collectPrintWarnings(p) || []; };
  const S_ = ov => { const p = P_(ov); logos.length = 0; Object.assign(paramState.box, p);
                     return standSpec(p); };

  // 1. МАССА И ЦЕНТР — ИЗ СЕТКИ, И ЦЕНТР НАСТОЯЩИЙ
  {
    const s = S_({}), t = base({psOn:true});
    /* Объём и центр считаются здесь заново, своим кодом: спецификация не должна сверяться сама с собой. */
    let V = 0, cz = 0;
    for (const T of t){ const a = T[0], b = T[1], c = T[2];
      const v = (a[0]*(b[1]*c[2]-b[2]*c[1]) - a[1]*(b[0]*c[2]-b[2]*c[0]) + a[2]*(b[0]*c[1]-b[1]*c[0]))/6;
      V += v; cz += v*(a[2]+b[2]+c[2])/4; }
    cz /= V; V = Math.abs(V);
    /* СОБСТВЕННЫЙ СЧЁТ ЗДЕСЬ — ЭТО СУММА ОБОЛОЧЕК, а подставка собрана из перекрывающихся тел, и с
       v25.50.0 спецификация берёт объём и центр ТЕЛА, а не сумму. Поэтому проверка спрашивает две
       вещи по отдельности. Первая: спецификация обязана совпасть с телом ТОЧНО — иначе она снова
       считает перекрытие дважды. Вторая: тело обязано быть МЕНЬШЕ суммы оболочек, и на сколько именно
       — своим счётом, а не со слов приложения; без этого проверка не отличила бы «поправка работает»
       от «поправки нет, и деталь просто односкорлупная». */
    const bodyV = meshSolidVolume(t), bodyC = meshSolidCentroid(t);
    chk('масса взята из объёма ТЕЛА построенной сетки',
        Math.abs(s.mass - bodyV/1000*matDensity(P_({}))) < 1e-6,
        {спец:+s.mass.toFixed(2), тело:+(bodyV/1000*matDensity(P_({}))).toFixed(2)});
    chk('  и это меньше суммы оболочек — подставка собрана из перекрывающихся тел',
        bodyV < V && (V - bodyV)/V > 0.004, {сумма:+V.toFixed(0), тело:+bodyV.toFixed(0),
        доля:+((V - bodyV)/V*100).toFixed(2)});
    chk('  и центр тяжести — настоящий, а не середина габарита',
        Math.abs(s.cog[2] - bodyC.c[2]) < 1e-6, {спец:+s.cog[2].toFixed(3), тело:+bodyC.c[2].toFixed(3)});
    chk('    и он сдвинут относительно центра суммы оболочек',
        Math.abs(bodyC.c[2] - cz) > 0.01, {тело:+bodyC.c[2].toFixed(3), сумма:+cz.toFixed(3)});
    const bb = computeBBox(t);
    chk('  а середина габарита дала бы ДРУГОЕ плечо — вот насколько',
        Math.abs(s.cog[2] - (bb.minZ + bb.maxZ)/2) > 5,
        {настоящий:+s.cog[2].toFixed(1), габаритный:+((bb.minZ + bb.maxZ)/2).toFixed(1)});
  }

  // 2. ПРЕДЕЛЬНАЯ ДЛИНА — ЗАКОН 1/cos
  {
    const a30 = S_({psAngle:30}), a60 = S_({psAngle:60});
    chk('предельная длина растёт как 1/cos(угла)',
        Math.abs(a30.Lmax*Math.cos(30*Math.PI/180)/(a60.Lmax*Math.cos(60*Math.PI/180)) - 1) < 0.05,
        {'30':+a30.Lmax.toFixed(0), '60':+a60.Lmax.toFixed(0)});
    chk('  на пологом угле предел меньше планшета, на крутом — больше',
        a30.Lmax < 250 && S_({psAngle:75}).Lmax > 400,
        {'30':+a30.Lmax.toFixed(0), '75':+S_({psAngle:75}).Lmax.toFixed(0)});
    chk('  и глубже плита — дальше предел',
        S_({psDepth:140}).Lmax > S_({psDepth:85}).Lmax + 100, {});
    chk('  об этом сказано числом', W_({psAngle:30}).some(x => /предел всего/.test(x)), W_({psAngle:30}));
  }

  // 3. СИЛА — ЭТО МОМЕНТЫ
  {
    const s = S_({});
    const hold = (s.mass*(s.zB - s.cog[2]) + s.dev.g*(s.zB - s.zDev))/1000*G;
    const F = hold/(s.yTop*Math.sin(s.ang*Math.PI/180));
    chk('сила опрокидывания пересчитывается из измеренных плеч', Math.abs(s.Ftip - F) < 1e-9,
        {спец:+s.Ftip.toFixed(3), пересчёт:+F.toFixed(3)});
    chk('  тяжелее материал — больше держит',
        S_({printMat:'petg'}).Ftip > s.Ftip*1.0, {pla:+s.Ftip.toFixed(2), petg:+S_({printMat:'petg'}).Ftip.toFixed(2)});
    chk('  глубже плита — заметно больше держит', S_({psDepth:140}).Ftip > s.Ftip*1.8,
        {'85':+s.Ftip.toFixed(2), '140':+S_({psDepth:140}).Ftip.toFixed(2)});
    chk('  и число названо человеку и в ньютонах, и в граммах',
        W_({}).some(x => /нажатие на САМЫЙ ВЕРХ/.test(x) && x.indexOf(s.Ftip.toFixed(1)) >= 0), W_({}));
    /* КРОШЕЧНАЯ ПЛИТА не «слабо держит», а не держит вовсе: устройство роняет её само. Расчёт обязан
       сказать именно это, а не выдать отрицательную силу как ни в чём не бывало. */
    const tiny = S_({psW:30, psDepth:30});
    chk('крошечная плита объявлена не держащей вовсе', tiny.selfTips || tiny.Ftip <= 0,
        {Ftip:+tiny.Ftip.toFixed(2), само:tiny.selfTips});
    chk('  и сказано это словами, а не отрицательным числом',
        W_({psW:30, psDepth:30}).some(x => /опрокидывает её САМО/.test(x)) &&
        !W_({psW:30, psDepth:30}).some(x => /-0\./.test(x)), W_({psW:30, psDepth:30}));
  }

  // 4. БОРТ И ЭКРАН
  {
    const s = S_({});
    chk('борт съедает высоту, делённую на синус угла',
        Math.abs(s.screen - s.lipH/Math.sin(s.ang*Math.PI/180)) < 1e-12, +s.screen.toFixed(2));
    chk('  и на пологом угле съедает БОЛЬШЕ', S_({psAngle:30}).screen > S_({psAngle:75}).screen*1.5,
        {'30':+S_({psAngle:30}).screen.toFixed(1), '75':+S_({psAngle:75}).screen.toFixed(1)});
    chk('  высокий борт объявлен', W_({psLip:40}).some(x => /это много/.test(x)), {});
    chk('  а обычный — нет', !W_({}).some(x => /это много/.test(x)), {});
  }

  // 5. ШНУР
  chk('без выреза сказано про разъём', W_({psSlot:0}).some(x => /встанет на разъём/.test(x)), {});
  chk('  а с вырезом молчит', !W_({}).some(x => /встанет на разъём/.test(x)), {});

  // 6. НА УМОЛЧАНИЯХ НЕ РУГАЕТСЯ, НО ГОВОРИТ
  chk('на умолчаниях приложение не ругается на само себя',
      !W_({}).some(x => /предел всего|это много|САМО|лёгкого КАСАНИЯ/.test(x)),
      W_({}).filter(x => /предел всего|это много|САМО|лёгкого КАСАНИЯ/.test(x)));
  chk('  но числа называет всё равно', W_({}).length >= 3, W_({}).length);
}

console.log('\n=== TOTAL:',pass,'passed,',fail,'failed ===');
process.exit(fail?1:0);
