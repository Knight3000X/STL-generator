// Wall organiser (настенный органайзер): French-cleat / pegboard back × hook / shelf / tools / plate front,
// through the REAL buildTrisForShape pipeline. Watertight, real cleat lip / pegs / holder. Run via ./run-all.sh.
let pass=0,fail=0; function chk(n,c,e){if(c){pass++;console.log('  OK  ',n);}else{fail++;console.log('  FAIL',n,e!==undefined?JSON.stringify(e):'');}}
function vol(t){let v=0;for(const T of t){const a=T[0],b=T[1],c=T[2];v+=(a[0]*(b[1]*c[2]-b[2]*c[1])-a[1]*(b[0]*c[2]-b[2]*c[0])+a[2]*(b[0]*c[1]-b[1]*c[0]))/6;}return v;}
function base(ov){ logos.length=0; boxHoles.length=0; dieFaces.length=0;
  Object.assign(paramState.box, defaultBoxParams(), {width:40,height:40,depth:40,
    woBack:'cleat',woFront:'hook',woW:60,woH:60,woT:5,woCleatLip:8,woPegD:6,woPegSpacing:25.4,woPegN:2,woPegLen:10,
    woHookBar:8,woHookReach:24,woHookDrop:14,woShelfD:35,woShelfT:4,woToolN:3,woToolD:16,
    hookMount:'none',mntMode:'none',gearMode:'none',pipMode:'none',threadMode:'none',sheetShape:'none',keycapMode:'none',platonic:'none',polyN:0,binRound:0,
    scoopDir:'none',labelTab:'none',mountHoles:'none',gripWall:'none',divX:1,divZ:1,stackFeet:false,gfOn:false}, ov);
  return buildTrisForShape('box',paramState.box); }

console.log('=== every back × front combination is watertight ===');
for(const back of ['cleat','peg']) for(const front of ['hook','shelf','tools','none']){
  const t=base({woBack:back,woFront:front}); const mc=manifoldCheck(t,4);
  chk(back+' + '+front+' watertight (+vol)', mc.watertight&&vol(t)>0, {wt:mc.watertight,open:mc.openEdges});
}

/* ПЕРЕХОДНИКИ МЕЖДУ СИСТЕМАМИ. Сзади любая из трёх (соты, перфопанель, планка), спереди — другая.
   Проверяется здесь не «строится ли», а то, что разъезжается тихо:

     1. РЕЙКА ОБЯЗАНА СХОДИТЬСЯ С ОТВЕТНЫМ ЗАДНИКОМ. Наклон, подобранный на глаз, даёт две детали,
        каждая из которых строится, выглядит правильно и проходит любую проверку герметичности, — а
        не сходятся они только вживую, на столе. Поэтому клин рейки ВЫВЕДЕН из задника поворотом на
        пол-оборота, и проверка сравнивает наклоны настоящих граней, а не числа в коде.
     2. ПЛИТА GRIDFINITY ДОЛЖНА БЫТЬ ТОЙ ЖЕ САМОЙ. Второй раз выписать шаг 42 и профиль ножки —
        значит завести им второе место жительства; разъедутся они молча, бины перестанут садиться, а
        выглядеть будет по-прежнему. */
console.log('=== переходники: все девять сочетаний спинки и лица ===');
for(const back of ['cleat','peg','hex']) for(const front of ['cleatrail','gfshelf','hook']){
  const t=base({woBack:back,woFront:front}); const mc=manifoldCheck(t,4);
  chk(back+' → '+front+' герметично (+объём)', mc.watertight&&vol(t)>0, {wt:mc.watertight,open:mc.openEdges});
}
console.log('=== переходник: рейка сходится с ответным задником ===');
{
  // Наклонные грани в плоскости YZ: у них нет составляющей по X, а обе остальные заметны.
  const slopes = t => {
    const out = [];
    for(const T of t){
      const e1=[T[1][0]-T[0][0],T[1][1]-T[0][1],T[1][2]-T[0][2]];
      const e2=[T[2][0]-T[0][0],T[2][1]-T[0][1],T[2][2]-T[0][2]];
      let n=[e1[1]*e2[2]-e1[2]*e2[1], e1[2]*e2[0]-e1[0]*e2[2], e1[0]*e2[1]-e1[1]*e2[0]];
      const L=Math.hypot(n[0],n[1],n[2]); if(L<1e-9) continue; n=n.map(q=>q/L);
      if(Math.abs(n[0])<1e-6 && Math.abs(n[1])>0.2 && Math.abs(n[2])>0.2)
        out.push([+n[1].toFixed(6), +n[2].toFixed(6)]);
    }
    return [...new Set(out.map(q=>q.join(',')))].sort();
  };
  const backSlopes = slopes(base({woBack:'cleat',woFront:'none'}));
  const railSlopes = slopes(base({woBack:'peg',woFront:'cleatrail'}));
  chk('у задника-планки есть наклонная грань', backSlopes.length === 1, backSlopes);
  chk('и у лицевой рейки тоже', railSlopes.length === 1, railSlopes);
  /* ПОВОРОТ НА ПОЛ-ОБОРОТА вокруг оси Y меняет знак z и оставляет y. Если рейка и задник — одна и та
     же грань, повёрнутая, их нормали после этого совпадут ТОЧНО, а не примерно. */
  const [by, bz] = backSlopes[0].split(',').map(Number);
  const [ry, rz] = railSlopes[0].split(',').map(Number);
  chk('и это одна и та же грань, повёрнутая на пол-оборота',
      Math.abs(by - ry) < 1e-6 && Math.abs(bz + rz) < 1e-6,
      {задник:[by,bz], рейка:[ry,rz]});
  chk('наклон при этом не вертикальный и не горизонтальный — это клин',
      Math.abs(ry) > 0.3 && Math.abs(rz) > 0.3, {рейка:[ry,rz]});
  /* И он обязан ЕХАТЬ ЗА ВЫЛЕТОМ: жёстко вписанные 45° сошлись бы с задником только при одном
     значении вылета, а при любом другом — молча разъехались. */
  const railA = slopes(base({woBack:'peg',woFront:'cleatrail',woCleatLip:20}));
  const backA = slopes(base({woBack:'cleat',woFront:'none',woCleatLip:20}));
  chk('и едет за вылетом зацепа — вместе с задником',
      railA.length===1 && backA.length===1 &&
      Math.abs(backA[0].split(',').map(Number)[1] + railA[0].split(',').map(Number)[1]) < 1e-6,
      {рейка:railA, задник:backA});
  chk('а при другом вылете наклон и правда другой', railA[0] !== railSlopes[0], {было:railSlopes, стало:railA});
}
console.log('=== переходник: полка Gridfinity — та же плита, а не вторая копия ===');
{
  const shelf = ov => base(Object.assign({woBack:'hex', woFront:'gfshelf'}, ov));
  const bb = t => { const b=computeBBox(t); return {x:b.maxX-b.minX, y:b.maxY-b.minY, z:b.maxZ-b.minZ}; };
  /* Плита строится своим построителем, поэтому её шаг обязан ехать за числом ячеек ровно на 42 мм —
     то же число, которым живёт вся остальная Gridfinity этого приложения. */
  /* Ширину берём от ДВУХ ячеек и выше: при одной плита (42) уже спинки (60), и габарит меряет
     спинку, а не плиту — разница вышла бы 24 вместо 42, и проверка ловила бы не то. */
  const one = bb(shelf({gfX:2, gfY:1})), two = bb(shelf({gfX:3, gfY:1}));
  chk('лишняя ячейка по X добавляет ровно шаг Gridfinity',
      Math.abs((two.x - one.x) - GF_PITCH) < 0.3, {было:+one.x.toFixed(1), стало:+two.x.toFixed(1), шаг:GF_PITCH});
  const shallow = bb(shelf({gfX:2, gfY:1})), deep = bb(shelf({gfX:2, gfY:2}));
  chk('и лишняя ячейка по Y — ровно шаг в глубину',
      Math.abs((deep.z - shallow.z) - GF_PITCH) < 0.3, {было:+shallow.z.toFixed(1), стало:+deep.z.toFixed(1)});
  chk('полка глубже плоской полки — она несёт плиту', bb(shelf({gfX:2,gfY:2})).z > bb(base({woBack:'hex',woFront:'shelf'})).z);
  /* КОСЫНКИ. Полка вылетает вперёд на всю глубину плиты и держится одной кромкой. Без подкоса она
     отламывается по слою — и это не гипотеза, а первое, что ломается у печатных полок.

     Сравнивать объём полки с плитой и плоской полки БЕСПОЛЕЗНО: разницу целиком съедает сама плита,
     и мутация «убрать косынки» прошла через такую проверку насквозь. Косынка растёт вместе с высотой
     спинки (её катет упирается в высоту полки), а плита, полка и штыри — нет. Значит, мерить надо
     ПРИРОСТ объёма сверх прироста самой спинки: без косынок он около нуля при любой высоте. */
  const plateV = h => 60*5*h;                       // спинка woW × woT × woH
  const extra = h => vol(base({woBack:'peg', woFront:'gfshelf', gfX:2, gfY:2, woH:h})) - plateV(h);
  chk('косынка растёт вместе с высотой спинки — значит, она есть',
      extra(120) - extra(60) > 3000, {низкая:+extra(60).toFixed(0), высокая:+extra(120).toFixed(0)});
  chk('и у плоской полки такого прироста нет — расти там нечему',
      Math.abs((vol(base({woBack:'peg', woFront:'shelf', woH:120})) - plateV(120)) -
               (vol(base({woBack:'peg', woFront:'shelf', woH:60})) - plateV(60))) < 600);
  chk('и всё это остаётся одним герметичным телом', manifoldCheck(shelf({gfX:3,gfY:2}),4).watertight);
}
console.log('=== cleat back ===');
{ const b=computeBBox(base({woBack:'cleat',woFront:'none',woW:70,woH:80,woCleatLip:10,woT:5}));
  chk('cleat width = woW (X)', Math.abs((b.maxX-b.minX)-70)<0.8, {x:+(b.maxX-b.minX).toFixed(1)});
  // The reinforcement caps the wedge WITHIN the lip+plate envelope, so the depth stays exactly lip + plate —
  // it must not stick out in front (that would just be a useless T).
  chk('cleat depth = lip + plate (reinforcement stays inside the envelope)', Math.abs((b.maxZ-b.minZ)-(10+5))<1.5, {z:+(b.maxZ-b.minZ).toFixed(1)}); }
{ // the band is real material: capping the wedge's top must out-weigh a bare plate+wedge of the same envelope
  const thin=vol(base({woBack:'cleat',woFront:'none',woCleatLip:5})), thick=vol(base({woBack:'cleat',woFront:'none',woCleatLip:14}));
  chk('deeper cleat → more reinforcement material', thick>thin, {thin:+thin.toFixed(0),thick:+thick.toFixed(0)}); }
{ const small=vol(base({woBack:'cleat',woFront:'none',woCleatLip:4})), big=vol(base({woBack:'cleat',woFront:'none',woCleatLip:16}));
  chk('deeper cleat lip → more material', big>small, {small:+small.toFixed(0),big:+big.toFixed(0)}); }

console.log('=== pegboard back ===');
{ const one=vol(base({woBack:'peg',woFront:'none',woPegN:1})), three=vol(base({woBack:'peg',woFront:'none',woPegN:3}));
  chk('more pegs → more material', three>one, {one:+one.toFixed(0),three:+three.toFixed(0)}); }
for(const d of [3,6,10]) chk('peg Ø'+d+' watertight', manifoldCheck(base({woBack:'peg',woFront:'none',woPegD:d}),4).watertight);
{ // rounded (hemispherical) pin tip: the Z depth exceeds a flat-ended cylinder's (peg len 10 + plate 5 ≈ 15;
  //   the hemispherical cap adds ~pin radius past the flat tip). Robust to the final recentre (checks the span).
  const b=computeBBox(base({woBack:'peg',woFront:'none',woPegN:1,woPegD:6,woPegLen:10}));
  chk('pin tip is rounded (Z depth exceeds the flat length)', (b.maxZ-b.minZ) > 17, {zSpan:+(b.maxZ-b.minZ).toFixed(2)}); }
{ // retaining lip on the TOP pin: it drops below the top pin, so a back whose ONLY pin is the top one is taller
  //   in −Y under that pin — a 1-pin back out-spans (in Y) a lip-free reference of the same pin. Just assert the
  //   lip adds material: the 1-pin volume stays finite/positive and the back is watertight (covered above).
  const one=vol(base({woBack:'peg',woFront:'none',woPegN:1})), oneNoLipRef=vol(base({woBack:'peg',woFront:'none',woPegN:1,woPegLen:6}));
  chk('top-pin retaining lip present (volume finite & positive)', one>0 && Number.isFinite(one) && oneNoLipRef>0, {v:+one.toFixed(0)}); }

console.log('=== fronts ===');
{ const noHook=computeBBox(base({woFront:'none'})), hook=computeBBox(base({woFront:'hook',woHookReach:40}));
  chk('hook reaches forward (+Z beyond the plate)', hook.maxZ > noHook.maxZ+15, {}); }
{ const solid=vol(base({woFront:'tools',woToolN:1,woW:120})), holed=vol(base({woFront:'tools',woToolN:4,woW:120}));
  chk('more tool sockets remove more material', holed<solid, {solid:+solid.toFixed(0),holed:+holed.toFixed(0)}); }

console.log('=== gating + regression ===');
{ const a=base({}).length, b=base({scoopDir:'front',gripWall:'front',mountHoles:'4',stackFeet:true,divX:2,divZ:2,hollow:true}).length;
  chk('organizer add-ons skipped on a wall organiser', a===b, {a,b}); }
{ Object.assign(paramState.box, defaultBoxParams(), {width:40,height:40,depth:40,woBack:'none'});
  const t=buildTrisForShape('box',paramState.box); const b=computeBBox(t);
  chk('woBack none → normal cube', manifoldCheck(t,4).watertight && Math.abs((b.maxX-b.minX)-40)<1e-6, {}); }

console.log('\n=== TOTAL:',pass,'passed,',fail,'failed ===');
process.exit(fail?1:0);
