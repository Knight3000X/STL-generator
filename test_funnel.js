// Funnel (воронка): a straight spout under a cone, built as a constant-thickness shell of revolution,
// through the REAL buildTrisForShape pipeline. Watertight, dimensions, open bore. Run via ./run-all.sh.
let pass=0,fail=0; function chk(n,c,e){if(c){pass++;console.log('  OK  ',n);}else{fail++;console.log('  FAIL',n,e!==undefined?JSON.stringify(e):'');}}
function vol(t){let v=0;for(const T of t){const a=T[0],b=T[1],c=T[2];v+=(a[0]*(b[1]*c[2]-b[2]*c[1])-a[1]*(b[0]*c[2]-b[2]*c[0])+a[2]*(b[0]*c[1]-b[1]*c[0]))/6;}return v;}
function base(ov){ logos.length=0; boxHoles.length=0; dieFaces.length=0;
  Object.assign(paramState.box, defaultBoxParams(), {width:40,height:40,depth:40,
    fnOn:true,fnMouthD:70,fnSpoutD:12,fnSpoutLen:25,fnConeH:45,fnWall:1.6,
    psOn:false,pbPart:'none',woBack:'none',hookMount:'none',mntMode:'none',gearMode:'none',
    pipMode:'none',threadMode:'none',sheetShape:'none',keycapMode:'none',platonic:'none',polyN:0,binRound:0,
    scoopDir:'none',labelTab:'none',mountHoles:'none',gripWall:'none',divX:1,divZ:1,stackFeet:false,gfOn:false}, ov);
  return buildTrisForShape('box',paramState.box); }

console.log('=== watertight across mouth × spout × lengths × wall ===');
for(const md of [20,70,300]) for(const sd of [3,12,60]) for(const sl of [2,25,100]) for(const ch of [4,45,200]) for(const w of [0.8,1.6,5]){
  const t=base({fnMouthD:md,fnSpoutD:sd,fnSpoutLen:sl,fnConeH:ch,fnWall:w}); const mc=manifoldCheck(t,4);
  chk('mouth'+md+' spout'+sd+' L'+sl+' cone'+ch+' wall'+w+' watertight (+vol)', mc.watertight&&vol(t)>0, {wt:mc.watertight,bad:mc.badEdges,open:mc.openEdges});
}

console.log('=== dimensions ===');
{ const b=computeBBox(base({fnMouthD:80,fnSpoutLen:20,fnConeH:50}));
  chk('mouth Ø = fnMouthD', Math.abs((b.maxX-b.minX)-80)<1.5, {x:+(b.maxX-b.minX).toFixed(1)});
  chk('height = spout + cone', Math.abs((b.maxY-b.minY)-70)<0.5, {y:+(b.maxY-b.minY).toFixed(1)}); }
{ // it is a SHELL, not a solid cone: the spout must be bored through by the wall thickness
  const t=base({fnSpoutD:12,fnWall:1.6}); const b=computeBBox(t);
  let minR=1e9; for(const T of t)for(const v of T) if(v[1]<b.minY+0.3) minR=Math.min(minR,Math.hypot(v[0],v[2]));
  chk('spout bore = Ø/2 − wall (shell, not a solid)', Math.abs(minR-4.4)<0.3, {minR:+minR.toFixed(2)}); }
{ const thin=vol(base({fnWall:0.8})), thick=vol(base({fnWall:5}));
  chk('thicker wall → more material', thick>thin, {thin:+thin.toFixed(0),thick:+thick.toFixed(0)}); }
{ const lo=computeBBox(base({fnConeH:20})), hi=computeBBox(base({fnConeH:120}));
  chk('taller cone → taller funnel', (hi.maxY-hi.minY) > (lo.maxY-lo.minY)+90, {}); }

console.log('=== gating + regression ===');
{ const a=base({}).length, b=base({scoopDir:'front',gripWall:'front',mountHoles:'4',stackFeet:true,divX:2,divZ:2,hollow:true}).length;
  chk('box add-ons skipped on a funnel', a===b, {a,b}); }
{ Object.assign(paramState.box, defaultBoxParams(), {width:40,height:40,depth:40,fnOn:false});
  const t=buildTrisForShape('box',paramState.box); const b=computeBBox(t);
  chk('fnOn false → normal cube', manifoldCheck(t,4).watertight && Math.abs((b.maxX-b.minX)-40)<1e-6, {}); }


/* ЧТО ВОРОНКА ГОВОРИТ О СЕБЕ (v25.8.0) — четвёртый разобранный молчун переписи 10.4.

   У воронки есть число, которое решает, напечатается ли она вообще: наклон стенки конуса от вертикали.
   Печатается воронка носиком ВНИЗ, стенка расходится кверху, и каждый слой висит над воздухом; до 45°
   такой навес ложится сам, круче — просит поддержек. Высота конуса при этом крутится от 4 мм, а устье до
   200: низкая широкая воронка строится молча и печатается кашей.

   Проверяется, что числа сняты С ПОСТРОЕННОЙ ДЕТАЛИ, а не назначены рядом с ней:
     1. НАКЛОН — из профиля меша (разрез плоскостью через ось), а не из параметров.
     2. ЁМКОСТЬ — интегралом по ИЗМЕРЕННОМУ внутреннему профилю.
     3. СТЕНКА — разностью наружного и внутреннего радиусов в том же разрезе, включая случай, когда
        построитель урезает её молча.
     4. ПРОСВЕТ — отдельное число: стенка съедает носик с обеих сторон, и на Ø4 от него остаётся
        миллиметр. */
console.log('=== воронка: наклон, ёмкость, просвет ===');
{
  /* РАЗРЕЗ ВДОЛЬ ОСИ — но НЕ через неё саму. Плоскость z = 0 у тела вращения не режет ни одного
     треугольника: сетка вращения строится кольцами, и при угле 0 и π её рёбра ЛОЖАТСЯ на эту плоскость,
     а не пересекают её. Первая запись так и получила пустой профиль. Поэтому плоскость сдвинута на
     треть миллиметра — туда, где не проходит ни одно кольцо, — а радиус берётся как гипотенуза от неё,
     то есть точно, а не «почти». */
  const ZC = 0.37;
  const profile = (tris) => {
    const seg = [];
    for (const T of tris){
      const d = [T[0][2] - ZC, T[1][2] - ZC, T[2][2] - ZC];
      const above = d.filter(x => x > 0).length, below = d.filter(x => x < 0).length;
      if (!above || !below) continue;
      const pts = [];
      for (let k = 0; k < 3; k++){
        const a = T[k], b = T[(k+1)%3], da = d[k], db = d[(k+1)%3];
        if ((da > 0) === (db > 0) || da === db) continue;
        const u = da/(da - db);
        pts.push([a[0] + (b[0]-a[0])*u, a[1] + (b[1]-a[1])*u]);
      }
      if (pts.length === 2) seg.push(pts);
    }
    return seg;
  };
  const radius = x => Math.hypot(x, ZC);      // расстояние до ОСИ, а не до плоскости разреза
  // границы материала на высоте y, со стороны x > 0
  const spanAt = (seg, y) => {
    const xs = [];
    for (const s2 of seg){ const a = s2[0], b = s2[1];
      if ((a[1] > y) !== (b[1] > y)){ const u = (y - a[1])/(b[1] - a[1]);
        const x = a[0] + (b[0]-a[0])*u; if (x > 0) xs.push(x); } }
    xs.sort((p1, q1) => p1 - q1);
    return xs.length >= 2 ? {rin: radius(xs[0]), rout: radius(xs[xs.length-1])} : null;
  };
  const P_ = ov => Object.assign(defaultBoxParams(), {fnOn:true}, ov);
  const W_ = ov => { const p = P_(ov); logos.length = 0; Object.assign(paramState.box, p);
                     return collectPrintWarnings(p) || []; };

  /* Четвёртый набор — С УРЕЗАННОЙ СТЕНКОЙ: на носике Ø4 построитель зажимает её половиной радиуса, и
     сверять там надо не «что заказано», а что вышло. Без этого случая мутация «спецификация не знает про
     зажим» пережила бы сверку по мешу и падала только на тексте. */
  for (const ov of [{}, {fnConeH:20}, {fnMouthD:120, fnConeH:120}, {fnSpoutD:4}]){
    const t = base(ov), f = funnelSpec(P_(ov)), seg = profile(t);
    const bb = computeBBox(t);
    const tag = ' ' + JSON.stringify(ov);
    // 1. НАКЛОН — из профиля
    const yLo = bb.minY + f.sL + f.cH*0.15, yHi = bb.minY + f.sL + f.cH*0.85;
    const a = spanAt(seg, yLo), b = spanAt(seg, yHi);
    chk('профиль снят с меша'+tag, !!a && !!b, {a, b});
    if (a && b){
      const lean = Math.atan2(b.rout - a.rout, yHi - yLo)*180/Math.PI;
      chk('  наклон стенки сходится с расчётом'+tag, Math.abs(lean - f.lean) < 0.6,
          {измерено:+lean.toFixed(2), расчёт:+f.lean.toFixed(2)});
    }
    // 2. ЁМКОСТЬ — интегралом по измеренному внутреннему профилю
    /* Интегрируется ВСЯ высота, без полей у краёв. Первая запись отступала по 0.2 мм сверху и снизу —
       и это стоило 0.7 мл: наверху воронка самая широкая, и двух десятых там хватает на процент с
       лишним. Срез вне материала сам возвращает пусто, так что отступ ничего и не защищал. */
    let V = 0; const N = 2000, y0 = bb.minY, y1 = bb.maxY, dy = (y1 - y0)/N;
    for (let i = 0; i < N; i++){ const sp = spanAt(seg, y0 + (i + 0.5)*dy); if (sp) V += Math.PI*sp.rin*sp.rin*dy; }
    chk('  ёмкость сходится с интегралом по мешу'+tag, Math.abs(V/1000 - f.ml) < f.ml*0.02,
        {измерено:+(V/1000).toFixed(2), расчёт:+f.ml.toFixed(2)});
    // 3. СТЕНКА — разностью радиусов
    const mid = spanAt(seg, bb.minY + f.sL*0.5);
    chk('  толщина стенки в носике — та, что названа'+tag,
        !!mid && Math.abs((mid.rout - mid.rin) - f.w) < 0.05,
        mid && {измерено:+(mid.rout - mid.rin).toFixed(3), названо:+f.w.toFixed(3)});
  }

  // 4. НАКЛОН РЕШАЕТ ПЕЧАТЬ, И ОБ ЭТОМ СКАЗАНО
  chk('низкая широкая воронка объявлена неподъёмной без поддержек',
      W_({fnConeH:10}).some(x => /КРУЧЕ 45/.test(x)), {});
  chk('  а обычная — нет, и сказано, что поддержки не нужны',
      !W_({}).some(x => /КРУЧЕ 45/.test(x)) && W_({}).some(x => /поддержки не нужны/.test(x)), {});
  chk('  наклон назван числом всегда', W_({}).some(x => /отклонена от вертикали на 33°/.test(x)), W_({}));

  // 5. ЁМКОСТЬ И ПРОСВЕТ НАЗВАНЫ
  chk('ёмкость названа в миллилитрах', W_({}).some(x => /входит 62 мл/.test(x)), W_({}));
  chk('зерно считается как треть просвета',
      Math.abs(funnelSpec(P_({})).grain - 2*funnelSpec(P_({})).riS/3) < 1e-12, {});
  chk('узкий носик объявлен заглушкой', W_({fnSpoutD:4}).some(x => /капельница/.test(x)), {});
  chk('  и урезанная стенка тоже', W_({fnSpoutD:4}).some(x => /стенка урезана/.test(x)), {});
  chk('  а на умолчаниях ни того, ни другого',
      !W_({}).some(x => /капельница|стенка урезана/.test(x)), W_({}));

  // 6. ДОЗАТОР: доза выходит заказанная, и сказано, чего она НЕ обещает
  {
    const f = funnelSpec(P_({fnMode:'doser', fnDose:25}));
    chk('дозатор подбирает барабан под дозу', Math.abs(f.got - 25) < 0.05, {получилось:+f.got.toFixed(2)});
    chk('  доза больше — барабан крупнее',
        funnelSpec(P_({fnMode:'doser', fnDose:50})).R > funnelSpec(P_({fnMode:'doser', fnDose:5})).R*1.5, {});
    chk('  и сказано, что доза объёмная, а не весовая',
        W_({fnMode:'doser'}).some(x => /ОБЪЁМНАЯ, а не весовая/.test(x)), {});
    chk('  а размер барабана назван', W_({fnMode:'doser'}).some(x => /барабан подобран ПОД ДОЗУ/.test(x)), {});
  }

  // 7. НА УМОЛЧАНИЯХ НЕ РУГАЕТСЯ, НО ГОВОРИТ
  chk('на умолчаниях приложение не ругается на само себя',
      !W_({}).some(x => /КРУЧЕ|капельница|урезана|полупрозрачной/.test(x)),
      W_({}).filter(x => /КРУЧЕ|капельница|урезана|полупрозрачной/.test(x)));
  chk('  но числа называет', W_({}).length >= 2, W_({}).length);
}

console.log('\n=== TOTAL:',pass,'passed,',fail,'failed ===');
process.exit(fail?1:0);
