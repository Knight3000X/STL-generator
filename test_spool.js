// Держатель катушки филамента: роликовый блок на подшипниках, стойка под пруток, настенный кронштейн.
//
// Первая деталь набора, которая обслуживает не изделие, а САМ ПРИНТЕР, — и первая, у которой размеры
// диктует покупная катушка. Отсюда и то, что здесь проверяется: не «похоже ли на держатель», а связи,
// которые ломаются тихо.
//
//   1. СОВПАДАЮЩИЕ ГРАНИ. Держатель складывается из плит и цилиндров, поставленных друг на друга, и
//      сложить их ЗАПОДЛИЦО — самая естественная ошибка: основание и стойка стоят на одном нуле, палец
//      и буртик начинаются с одного торца. Проверка герметичности этого НЕ ВИДИТ вовсе: она сшивает
//      рёбра, а у совпадающей пары все рёбра парны. Поэтому здесь стоит отдельный поиск треугольников
//      в одной плоскости, накладывающихся по площади, — и он ловил обе ошибки, пока их не убрали.
//
//   2. ПОДШИПНИК, СКРЕБУЩИЙ ПО СТОЛУ. Заказан просвет под ободом, но подшипник висит НИЖЕ обода, и при
//      пологом развале упирается в стол первым. Молча выдать такой блок — худший ответ: держатель
//      собран, катушка на нём, и не крутится. Катушка поднимается, и об этом сказано вслух.
//
//   3. РАЗНОС РОЛИКОВ СЧИТАЕТСЯ, А НЕ ЗАДАЁТСЯ. Он обязан следовать из диаметра катушки: при заданном
//      разносе смена катушки на другой диаметр меняла бы глубину посадки, и никто бы этого не заметил.
//
//   4. САМОРЕЗ ПОД ПАЛЬЦЕМ. buildBoxWithHoles ВЫБРАСЫВАЕТ отверстие, налезающее на соседнее, — молча,
//      ради герметичности. Пока плита была квадратной, оба самореза кронштейна попадали под палец и
//      исчезали: панель говорила «2», а в детали было ноль.
//
// Run: ./run-all.sh (или см. заголовок test_clock.js)

let pass = 0, fail = 0;
function chk(name, cond, extra){
  if (cond) { pass++; console.log('  OK  ', name); }
  else { fail++; console.log('  FAIL', name, extra !== undefined ? JSON.stringify(extra) : ''); }
}
const SP = ov => Object.assign({}, defaultBoxParams(), {spMode:'roller'}, ov || {});
const raw = ov => buildSpoolHolder(SP(ov));
const W = ov => collectPrintWarnings(SP(ov));
function ship(ov){ logos.length = 0; boxHoles.length = 0; dieFaces.length = 0;
  Object.assign(paramState.box, defaultBoxParams(), {spMode:'roller'}, ov || {});
  return buildTrisForShape('box', paramState.box); }
/* Луч вверх из точки (x, z): сколько раз он протыкает тело. Через отверстие он не протыкает ни разу,
   через плиту — дважды. Считать «сколько треугольников добавилось» тут нельзя: у плиты БЕЗ отверстий
   сетка строится другим путём и их не меньше, а больше.

   ЛУЧ СМЕЩЁН НА СОТУЮ МИЛЛИМЕТРА, и это не мелочь, а условие работоспособности. Пущенный точно из
   центра прямоугольной грани, он попадает ровно в ДИАГОНАЛЬ между двумя её треугольниками; строгий
   тест «внутри треугольника» отвергает оба, и проверка отвечает «материала нет» на сплошной плите.
   Именно так она и ответила с первого раза. Нестрогий тест хуже: он засчитал бы ребро дважды, и чётность
   поехала бы в другую сторону. Сотая доля миллиметра лежит внутри любого отверстия, какое здесь бывает. */
const hitsAt = (tris, x0, z0) => {
  const x = x0 + 0.013, z = z0 + 0.0071;
  let n = 0;
  for (const T of tris){
    const e1 = sub(T[1], T[0]), e2 = sub(T[2], T[0]), d = [0, 1, 0];
    const h = cross(d, e2), a = e1[0]*h[0] + e1[1]*h[1] + e1[2]*h[2];
    if (Math.abs(a) < 1e-12) continue;
    const sv = [x - T[0][0], -1e6 - T[0][1], z - T[0][2]], f = 1/a;
    const u = f*(sv[0]*h[0] + sv[1]*h[1] + sv[2]*h[2]);
    if (u < 1e-9 || u > 1 - 1e-9) continue;
    const q = cross(sv, e1);
    const v = f*(d[0]*q[0] + d[1]*q[1] + d[2]*q[2]);
    if (v < 1e-9 || u + v > 1 - 1e-9) continue;
    if (f*(e2[0]*q[0] + e2[1]*q[1] + e2[2]*q[2]) > 1e-9) n++;
  }
  return n;
};
/* Насколько далеко от оси уходит тело на высоте y. Меряется по РЁБРАМ, пересекающим плоскость, а не по
   вершинам: у трубы вершины только на двух торцах, и на середине пальца их нет ни одной. */
const spanAt = (tris, y) => {
  let r = 0;
  for (const T of tris) for (let i = 0; i < 3; i++){
    const a = T[i], b = T[(i+1)%3];
    if ((a[1] - y)*(b[1] - y) > 0) continue;
    const d = b[1] - a[1]; if (Math.abs(d) < 1e-12) continue;
    const u = (y - a[1])/d;
    r = Math.max(r, Math.hypot(a[0] + u*(b[0]-a[0]), a[2] + u*(b[2]-a[2])));
  }
  return r;
};
const bbox = t => { const b = {x:[1e9,-1e9], y:[1e9,-1e9], z:[1e9,-1e9]};
  for (const T of t) for (const v of T){
    b.x[0]=Math.min(b.x[0],v[0]); b.x[1]=Math.max(b.x[1],v[0]);
    b.y[0]=Math.min(b.y[0],v[1]); b.y[1]=Math.max(b.y[1],v[1]);
    b.z[0]=Math.min(b.z[0],v[2]); b.z[1]=Math.max(b.z[1],v[2]); } return b; };

/* СОВПАДАЮЩИЕ ГРАНИ. Треугольники группируются по ПЛОСКОСТИ (нормаль с приведённым знаком + смещение),
   и внутри группы ищется пара, накладывающаяся по площади. Знак нормали приводится нарочно: у пары
   «одно тело кончилось, другое началось» нормали противоположны, и без приведения они попали бы в
   разные группы — то есть проверка искала бы всё, кроме того, ради чего написана. */
function coplanarHits(tris){
  const key = T => {
    const n = cross(sub(T[1],T[0]), sub(T[2],T[0])), L = vlength(n);
    if (L < 1e-12) return null;
    let u = [n[0]/L, n[1]/L, n[2]/L];
    if (u[0] < -1e-9 || (Math.abs(u[0]) < 1e-9 && (u[1] < -1e-9 || (Math.abs(u[1]) < 1e-9 && u[2] < 0))))
      u = [-u[0], -u[1], -u[2]];
    const d = u[0]*T[0][0] + u[1]*T[0][1] + u[2]*T[0][2];
    return u.map(x => Math.round(x*1e4)/1e4).join(',') + '|' + Math.round(d*1e3)/1e3;
  };
  const by = new Map();
  tris.forEach((T, i) => { const k = key(T); if (!k) return;
    if (!by.has(k)) by.set(k, []); by.get(k).push(i); });
  let hits = 0, where = null;
  for (const [k, list] of by){
    if (list.length < 2) continue;
    const u = k.split('|')[0].split(',').map(Number);
    const ax = Math.abs(u[0]) < 0.9 ? [1,0,0] : [0,1,0];
    const e1 = cross(u, ax), L1 = vlength(e1), E1 = e1.map(x => x/L1), E2 = cross(u, E1);
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

console.log('=== три разновидности строятся и герметичны ===');
{
  for (const mode of ['roller','axle','wall']){
    const t = raw({spMode:mode}), m = manifoldCheck(t, 6);
    chk('«'+mode+'» строится', t.length > 0, t.length);
    chk('  и герметична', m.watertight, {open:m.openEdges, bad:m.badEdges});
    chk('  и объём положительный', meshVolume(t) > 0, meshVolume(t));
    chk('  и совпадающих граней нет', coplanarHits(t).hits === 0, coplanarHits(t).where);
  }
  chk('без режима держателя не строится вовсе', dominantMode(SP({spMode:'none'})) !== 'spool');
  chk('а с режимом — это он', dominantMode(SP({})) === 'spool', dominantMode(SP({})));
}

console.log('\n=== разнос роликов СЧИТАЕТСЯ из диаметра катушки ===');
{
  /* Связь, ради которой держатель вообще параметрический. Ролики стоят на луче под углом развала от оси
     катушки, поэтому расстояние между ними растёт вместе с диаметром — линейно и с известным
     коэффициентом. Задай разнос числом, и смена катушки Ø200 на Ø300 незаметно изменила бы посадку. */
  const s2 = spoolSpec(SP({spD:200})), s3 = spoolSpec(SP({spD:300}));
  chk('шире катушка — шире разнос', s3.zB > s2.zB, {['200']:+s2.zB.toFixed(1), ['300']:+s3.zB.toFixed(1)});
  const want = (r, bd, v) => (r + bd/2)*Math.sin(v*Math.PI/180);
  chk('и разнос — ровно L·sin θ', Math.abs(s2.zB - want(100, s2.bearD, 30)) < 1e-9, s2.zB);
  chk('круче развал — шире разнос', spoolSpec(SP({spVee:45})).zB > spoolSpec(SP({spVee:15})).zB);
  /* И ВЫШЕ ось подшипника — против первого впечатления. Подшипник лежит на луче длиной L от оси
     катушки, и при развале в ноль он был бы ровно под ней, в самом низу; чем угол больше, тем он
     ближе к горизонту, то есть ВЫШЕ. Отсюда и цена крутого развала: катушка садится глубже, а блок
     растёт. Я успел записать в предупреждение обратное, и поймала это здешняя проверка. */
  chk('и ВЫШЕ ось подшипника', spoolSpec(SP({spVee:45})).yB > spoolSpec(SP({spVee:30})).yB,
      [spoolSpec(SP({spVee:30})).yB, spoolSpec(SP({spVee:45})).yB]);
  chk('и выше сам блок', spoolSpec(SP({spVee:45})).hp > spoolSpec(SP({spVee:30})).hp);
  chk('а совет в предупреждении говорит именно это',
      W({spVee:12, spClear:0}).some(x => /Круче развал — подъём меньше, но блок выше и шире/.test(x)),
      W({spVee:12, spClear:0}));
  // ...и всё это доходит до сетки, а не остаётся в спецификации
  const wide = bbox(raw({spD:300})).z, narrow = bbox(raw({spD:200})).z;
  chk('и блок под большую катушку ШИРЕ', (wide[1]-wide[0]) > (narrow[1]-narrow[0]) + 40,
      [+(narrow[1]-narrow[0]).toFixed(1), +(wide[1]-wide[0]).toFixed(1)]);
}

console.log('\n=== подшипник не скребёт по столу ===');
{
  /* Заказан просвет под ободом; подшипник висит ниже обода на L·cos θ, и при пологом развале упирается
     в стол первым. Тогда катушка поднимается — и это ОБЪЯВЛЕНО. Проверяется и то, и другое: подъём
     без объявления был бы обманом, объявление без подъёма — пустой тревогой. */
  const flat = spoolSpec(SP({spVee:12, spClear:0}));
  chk('на пологом развале катушка поднята', flat.lifted > 1, flat.lifted);
  chk('и ровно настолько, чтобы подшипник крутился',
      Math.abs((flat.yB - flat.bearD/2) - 1.5) < 1e-9, flat.yB - flat.bearD/2);
  chk('чем положе развал, тем больше подъём',
      spoolSpec(SP({spVee:10, spClear:0})).lifted > flat.lifted,
      [flat.lifted, spoolSpec(SP({spVee:10, spClear:0})).lifted]);
  chk('и об этом сказано', W({spVee:12, spClear:0}).some(x => /упёрся бы в стол/.test(x)),
      W({spVee:12, spClear:0}));
  const ok = spoolSpec(SP({spVee:45, spClear:10}));
  chk('на крутом развале поднимать нечего', ok.lifted === 0, ok.lifted);
  chk('и тревоги нет', !W({spVee:45, spClear:10}).some(x => /упёрся бы/.test(x)), W({spVee:45, spClear:10}));
  // ...и в сетке низ блока действительно на нуле, а подшипник выше стола
  const t = raw({spVee:12, spClear:0}), b = bbox(t);
  chk('блок стоит на столе, а не парит', Math.abs(b.y[0] - (-(b.y[1]-b.y[0])/2)) < 1e-6, b.y);
}

console.log('\n=== про две штуки сказано, и только там, где их две ===');
{
  chk('роликовый блок печатается парой', W({spMode:'roller'}).some(x => /ДВЕ штуки/.test(x)));
  chk('стойка тоже', W({spMode:'axle'}).some(x => /ДВЕ штуки/.test(x)));
  chk('а кронштейн — нет', !W({spMode:'wall'}).some(x => /ДВЕ штуки/.test(x)), W({spMode:'wall'}));
}

console.log('\n=== ложе под пруток ===');
{
  /* Паз, а не отверстие: отверстие пришлось бы мостить над пустотой. Отсюда и проверка — паз обязан
     быть ОТКРЫТ ВВЕРХ, то есть между его стенками на самом верху стойки материала нет. */
  const s = spoolSpec(SP({spMode:'axle'}));
  chk('паз шире прутка ровно на зазор', Math.abs(s.slotW - (s.rodD + 0.4)) < 1e-9, s.slotW);
  chk('и пруток ложится на дно осью на заказанной высоте',
      Math.abs((s.slotFloor + s.rodD/2 + 0.2) - s.yRod) < 1e-9, [s.slotFloor, s.yRod]);
  chk('ось прутка — это Ø/2 плюс просвет',
      Math.abs(s.yRod - (s.D/2 + s.clear)) < 1e-9, s.yRod);
  // Открытость паза — по сетке: на самом верху стойки, между стенками, тела быть не должно.
  const t = raw({spMode:'axle'}), b = bbox(t), yTop = b.y[1];
  const near = t.filter(T => T.every(v => v[1] > yTop - 0.5));
  chk('наверху стойки два рога, а не сплошная кромка', near.length > 0,  near.length);
  const zs = near.flat().map(v => v[2]).sort((a,c) => a-c);
  const gap = (() => { let g = 0; for (let i=1;i<zs.length;i++) g = Math.max(g, zs[i]-zs[i-1]); return g; })();
  chk('  и между ними просвет шириной с паз', Math.abs(gap - s.slotW) < 1e-6, {gap, slot:s.slotW});
  chk('толще пруток — шире паз', spoolSpec(SP({spMode:'axle', spRodD:20})).slotW > s.slotW);
  const hOf = ov => { const b = bbox(raw(ov)); return b.y[1] - b.y[0]; };
  chk('выше катушка — выше стойка',
      hOf({spMode:'axle', spD:300}) > hOf({spMode:'axle', spD:200}) + 45,
      [+hOf({spMode:'axle', spD:200}).toFixed(1), +hOf({spMode:'axle', spD:300}).toFixed(1)]);
}

console.log('\n=== саморезы кронштейна не попадают под палец ===');
{
  /* buildBoxWithHoles выбрасывает отверстие, налезающее на соседнее, молча. Пока плита была квадратной,
     оба самореза попадали под палец и исчезали: панель говорила «2», а в детали было ноль. Считаются
     они по ПРИРОСТУ треугольников — каждое отверстие добавляет свою постоянную порцию. */
  const at = n => raw({spMode:'wall', spHoleN:n}).length;
  const step = at(2) - at(1);
  chk('каждый саморез добавляет своё отверстие', step > 0, step);
  chk('и их ровно столько, сколько заказано',
      at(3) - at(2) === step && at(4) - at(3) === step,
      [at(2)-at(1), at(3)-at(2), at(4)-at(3)]);
  const s = spoolSpec(SP({spMode:'wall'}));
  /* И отверстие ПРОТКНУТО НАСКВОЗЬ, а не только посчитано. Луч вверх из центра самореза не должен
     встретить ничего; он же без отверстий протыкает плиту дважды. */
  chk('луч сквозь саморез не встречает материала',
      hitsAt(raw({spMode:'wall', spHoleN:2}), 0, -s.screwQ) === 0,
      hitsAt(raw({spMode:'wall', spHoleN:2}), 0, -s.screwQ));
  /* Без саморезов плита и МЕНЬШЕ: рядов держать не надо, и она не растёт впустую. Поэтому щупается
     не та же точка, а СВОЙ ряд каждой плиты — иначе проверка мерила бы воздух за краем и «проходила»
     на любой поломке. */
  const s0 = spoolSpec(SP({spMode:'wall', spScrewD:0}));
  chk('а «0 = без отверстий» — и вправду без',
      hitsAt(raw({spMode:'wall', spScrewD:0}), 0, -s0.screwQ) === 2,
      hitsAt(raw({spMode:'wall', spScrewD:0}), 0, -s0.screwQ));
  chk('и плита без саморезов не растит рядов под них', s0.plateH < s.plateH, [s0.plateH, s.plateH]);
  /* ...а сама плита цела. Щуп берётся ПОПЕРЁК ряда саморезов — у края по X, где на пути нет ни пальца,
     ни упорного пояска (он шире пальца на пять миллиметров и легко ловится по дороге), ни зенковки.
     Ровно два пересечения — низ и верх плиты — и значит, отверстия проделаны там, где заказаны, а не
     всюду. */
  const xEdge = s.plateW/2 - 4;
  chk('а сама плита цела', hitsAt(raw({spMode:'wall', spHoleN:2}), xEdge, 0) === 2,
      hitsAt(raw({spMode:'wall', spHoleN:2}), xEdge, 0));
  chk('  и щуп для этого и вправду мимо пальца с пояском', xEdge > s.fingerR + 5, [xEdge, s.fingerR + 5]);
  chk('ряд саморезов стоит ЗА пальцем', s.screwQ > s.fingerR + s.headR, [s.screwQ, s.fingerR]);
  chk('и не свисает с плиты', s.screwQ + s.hMargin <= s.plateH/2 + 1e-9, [s.screwQ, s.plateH/2]);
  chk('плита вытянута, а не квадратна', s.plateH > s.plateW, [s.plateW, s.plateH]);
}

console.log('\n=== палец кронштейна ===');
{
  const s = spoolSpec(SP({spMode:'wall'}));
  chk('палец тоньше ступицы', 2*s.fingerR < s.hubD, [2*s.fingerR, s.hubD]);
  chk('и полый — сплошной весил бы вчетверо больше',
      s.fingerRI > 1.5 && s.fingerRI < s.fingerR, [s.fingerRI, s.fingerR]);
  chk('шире ступица — толще палец', spoolSpec(SP({spMode:'wall', spHubD:80})).fingerR > s.fingerR);
  chk('шире катушка — длиннее палец', spoolSpec(SP({spMode:'wall', spW:120})).fingerL > s.fingerL);
  // Упорный поясок: у самого конца пальца тело ШИРЕ, чем в середине.
  const t = raw({spMode:'wall'}), b = bbox(t);
  const yMid = b.y[0] + (b.y[1] - b.y[0])*0.6, yEnd = b.y[1] - 0.7;
  chk('на конце пальца поясок шире самого пальца', spanAt(t, yEnd) > spanAt(t, yMid) + 3,
      [+spanAt(t, yMid).toFixed(1), +spanAt(t, yEnd).toFixed(1)]);
  chk('и в середине палец ровно своего радиуса',
      Math.abs(spanAt(t, yMid) - s.fingerR) < 1e-6, [spanAt(t, yMid), s.fingerR]);
}

console.log('\n=== призма вдоль X по невыпуклому контуру ===');
{
  /* Отдельная машинка, на которой стоит ложе: у «П» центроид лежит В ПАЗУ, то есть вне тела, и нормаль
     боковой грани, взятая от центроида, вывернула бы стенки паза наизнанку. Здесь это и проверяется —
     на самой букве «П», а не на детали, где ошибку было бы видно только по объёму. */
  const U = [[0,-10],[0,10],[20,10],[20,3],[6,3],[6,-3],[20,-3],[20,-10]];
  const t = prismXPolyTris(U, 0, 5), m = manifoldCheck(t, 6);
  chk('«П» замкнута', m.watertight, {open:m.openEdges, bad:m.badEdges});
  chk('и объём положительный, а не вывернутый', meshVolume(t) > 0, meshVolume(t));
  // Объём считается руками: площадь «П» на толщину.
  const area = 20*20 - 14*6;
  chk('и он равен площади контура на толщину', Math.abs(meshVolume(t) - area*5) < 1e-6,
      {дали:meshVolume(t), надо:area*5});
  chk('обход в другую сторону даёт то же тело',
      Math.abs(meshVolume(prismXPolyTris(U.slice().reverse(), 0, 5)) - area*5) < 1e-6);
  chk('совпадающих граней в ней нет', coplanarHits(t).hits === 0, coplanarHits(t).where);
  chk('вырожденный контур не строит ничего', prismXPolyTris([[0,0],[1,1]], 0, 1).length === 0);
}

console.log('\n=== вся область значений ===');
{
  let bad = 0, worst = null, cop = 0, copAt = null, n = 0;
  for (const mode of ['roller','axle','wall'])
    for (const D of [60, 200, 400])
      for (const t of [2, 12])
        for (const clear of [0, 60])
          for (const extra of [{}, {spVee:10}, {spVee:60}, {spBearD:8}, {spBearD:40}, {spRodD:4},
                               {spRodD:30}, {spHubD:10}, {spHubD:120}, {spW:20}, {spW:120},
                               {spScrewD:0}, {spHoleN:4}, {spAxleD:20}]){
            const ov = Object.assign({spMode:mode, spD:D, spT:t, spClear:clear}, extra);
            const tr = raw(ov), m = manifoldCheck(tr, 6); n++;
            if (!m.watertight || meshVolume(tr) <= 0){ bad++; if (!worst) worst = {ov, open:m.openEdges, bad:m.badEdges}; }
            const c = coplanarHits(tr);
            if (c.hits){ cop++; if (!copAt) copAt = {ov, hits:c.hits, where:c.where}; }
          }
  chk('504 набора герметичны', bad === 0 && n === 504, worst || n);
  chk('и ни в одном нет совпадающих граней', cop === 0, copAt);
}

console.log('\n=== через настоящий путь приложения ===');
{
  const t = ship({spMode:'roller'});
  chk('строится то же тело', t.length > 0 && manifoldCheck(t, 6).watertight, t.length);
  chk('и это держатель, а не куб', Math.abs(meshVolume(t) - meshVolume(raw({spMode:'roller'}))) < 1e-6);
  chk('имя модели называет разновидность и катушку',
      /держатель катушки: ролики \(Ø200×68\)/.test(activeShapeLabel()), activeShapeLabel());
  ship({spMode:'wall', spHubD:80});
  chk('и меняется вместе с ними', /кронштейн/.test(activeShapeLabel()), activeShapeLabel());
}

console.log(`\n=== TOTAL: ${pass} passed, ${fail} failed ===`);
process.exit(fail ? 1 : 0);
