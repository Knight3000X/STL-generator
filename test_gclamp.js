// Струбцина: скоба, а к ней болт и гайка, которые генератор уже умеет.
//
// Проверяется не «похоже ли на струбцину», а связи, которые ломаются тихо:
//
//   1. ИМЯ `clampW` В ПРОЕКТЕ УЖЕ ЗАНЯТО ХОМУТОМ (`pipMode:'clamp'`), и первая версия спецификации
//      молча читала ЕГО ширину вместо своей. Ни одна проверка такого не увидит: число осмысленное,
//      деталь строится, габарит правдоподобен. Отсюда приставка `gc` и проверка ниже.
//
//   2. ВЫЛЕТ РАСТЁТ ПОД ГНЕЗДО. Короткая губка задвигает ось винта за край, шестигранник оказывается ВНЕ
//      контура, и ушное отсечение сшивает такую «дырку» во что попало: 99 наборов из 486 выходили с
//      открытыми рёбрами.
//
//   3. ГУБКА ЧУТЬ ШИРЕ СКОБЫ, И СКОБА УТОПЛЕНА В НЕЁ. Два тела с общей парой граней дают совпадающие
//      грани, а проверка герметичности их не видит: она сшивает рёбра, а у совпадающей пары все рёбра
//      парны.
//
//   4. ПОВОРОТ ГУБКИ УВОДИТ ЕЁ ВБОК. Ось винта поперёк оси протяжки, поэтому губка строится отдельно и
//      поворачивается на четверть оборота; без сдвига она встаёт РЯДОМ со скобой, а не под ней — и
//      деталь при этом остаётся герметичной и выглядит целой.
//
//   5. КОСЫНКА ДОЛЖНА БЫТЬ В СЕТКЕ, А НЕ В СПЕЦИФИКАЦИИ. Число в расчёте жёсткости и треугольник в
//      контуре — разные вещи, и разойтись они могут молча: приложение отчитается о жёсткости, которой
//      у детали нет. Поэтому косынка щупается ЛУЧОМ — материал в углу есть, когда она заказана, и его
//      там нет, когда не заказана.
//
//   6. КОСЫНКА НЕ ИМЕЕТ ПРАВА ДОЙТИ ДО ГНЕЗДА ПОД ГАЙКУ. Дойдя, она встанет ровно там, где гайка, и
//      контур губки сомкнётся вокруг шестигранника — та самая «дырка», которую ушное отсечение сшивает
//      во что попало.
//
//   7. В ПЕЧАТНУЮ РЕЗЬБУ ОБЯЗАН ВКРУЧИВАТЬСЯ БОЛТ ЭТОГО ЖЕ ГЕНЕРАТОРА. Это единственное, ради чего она
//      существует, и проверить это сверкой формул нельзя: обе стороны считаются по одному профилю, и
//      сверка сошлась бы, даже если бы профиль был неверен целиком. Поэтому строятся ОБЕ детали, и у
//      обеих меряется радиус поверхности в одинаковых (θ, y). Резьба свинчивается при любом ОСЕВОМ
//      смещении — на то она и резьба, — поэтому смещение подбирается, а требуется РАВНОМЕРНОСТЬ зазора:
//      она и означает, что совпали шаг, профиль, глубина и направление витка.
//
// Run: ./run-all.sh

let pass = 0, fail = 0;
function chk(name, cond, extra){
  if (cond) { pass++; console.log('  OK  ', name); }
  else { fail++; console.log('  FAIL', name, extra !== undefined ? JSON.stringify(extra) : ''); }
}
const G  = ov => Object.assign({}, defaultBoxParams(), {mntMode:'gclamp'}, ov || {});
const sp = ov => gclampSpec(G(ov));
const raw = ov => buildGClamp(G(ov));
const W  = ov => collectPrintWarnings(G(ov));
const bbox = t => { const b = {x:[1e9,-1e9], y:[1e9,-1e9], z:[1e9,-1e9]};
  for (const T of t) for (const v of T){
    b.x[0]=Math.min(b.x[0],v[0]); b.x[1]=Math.max(b.x[1],v[0]);
    b.y[0]=Math.min(b.y[0],v[1]); b.y[1]=Math.max(b.y[1],v[1]);
    b.z[0]=Math.min(b.z[0],v[2]); b.z[1]=Math.max(b.z[1],v[2]); } return b; };
/* Луч вдоль Z: ГЛУБИНЫ всех пересечений по возрастанию. Именно все, а не число «входов в материал»:
   тела здесь ВЗАИМОПРОНИКАЮТ, и грань одного, утопленная в другом, — такое же пересечение, как всякое
   другое. Считать их «толщинами» нельзя, зато по их ПОРЯДКУ отлично видно, сращены тела или стоят
   встык. Смещён на сотую: попав точно в диагональ между треугольниками грани, строгий тест отвергает
   оба, и «материала нет» выходит на сплошной плите. */
const rayHitsZ = (tris, x0, y0) => {
  const x = x0 + 0.013, y = y0 + 0.0071; const out = [];
  for (const T of tris){
    const e1 = sub(T[1], T[0]), e2 = sub(T[2], T[0]), d = [0, 0, 1];
    const h = cross(d, e2), a = e1[0]*h[0] + e1[1]*h[1] + e1[2]*h[2];
    if (Math.abs(a) < 1e-12) continue;
    const sv = [x - T[0][0], y - T[0][1], -1e6 - T[0][2]], f = 1/a;
    const u = f*(sv[0]*h[0] + sv[1]*h[1] + sv[2]*h[2]);
    if (u < 1e-9 || u > 1 - 1e-9) continue;
    const q = cross(sv, e1), v = f*(d[0]*q[0] + d[1]*q[1] + d[2]*q[2]);
    if (v < 1e-9 || u + v > 1 - 1e-9) continue;
    const tt = f*(e2[0]*q[0] + e2[1]*q[1] + e2[2]*q[2]);
    if (tt > 1e-9) out.push(tt - 1e6);
  } return out.sort((a, b) => a - b); };
const rayZ = (tris, x, y) => rayHitsZ(tris, x, y).length;
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
    /* НАЛОЖЕНИЕ ПРОВЕРЯЕТСЯ ВЕРШИНАМИ И ПЕРЕСЕЧЕНИЕМ РЁБЕР, а не одной серединной точкой. Середина —
       заманчиво дёшево и неверно: два треугольника могут накладываться УЗКОЙ ПОЛОСОЙ, в которую не
       попадает ни центр того, ни центр другого. Ровно так и вышло: скоба, приставленная к краю губки
       вплотную, давала совпадающие грани полосой в восемь десятых миллиметра — а детектор молчал, и
       мутация прошла насквозь. Вершина внутри чужого треугольника ИЛИ скрещение рёбер покрывают все
       случаи наложения площадей. */
    const segX = (p1,p2,p3,p4) => {
      const d1 = side(p3,p1,p2), d2 = side(p4,p1,p2), d3 = side(p1,p3,p4), d4 = side(p2,p3,p4);
      return ((d1 > 1e-9 && d2 < -1e-9) || (d1 < -1e-9 && d2 > 1e-9)) &&
             ((d3 > 1e-9 && d4 < -1e-9) || (d3 < -1e-9 && d4 > 1e-9)); };
    const over = (A, B) => {
      for (const q of A) if (inside(q, B)) return true;
      for (const q of B) if (inside(q, A)) return true;
      for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++)
        if (segX(A[i], A[(i+1)%3], B[j], B[(j+1)%3])) return true;
      return false; };
    for (let a = 0; a < polys.length; a++) for (let b = a+1; b < polys.length; b++)
      if (over(polys[a], polys[b])){ hits++; if (!where) where = {plane:k, a:list[a], b:list[b]}; }
  }
  return { hits, where };
}

console.log('=== имена не пересекаются с хомутом ===');
{
  /* `clampW` принадлежит ХОМУТУ и имеет своё умолчание. Спецификация струбцины, читавшая его, вела себя
     осмысленно и строила правдоподобную деталь — поймать это можно было только заметив, что «авто» не
     работает. Проверка утверждает и то, и другое: свои имена читаются, чужое не читается. */
  const own = SHAPE_PARAMS.box.filter(r => r.w && r.w.indexOf('gclamp') >= 0);
  chk('у струбцины десять своих строк', own.length === 10, own.map(r => r.key));
  chk('и все они начинаются с gc', own.every(r => /^gc/.test(r.key)), own.map(r => r.key));
  chk('ни одна не зовётся clampW', own.every(r => r.key !== 'clampW'));
  chk('а clampW принадлежит хомуту',
      SHAPE_PARAMS.box.some(r => r.key === 'clampW' && r.w && r.w.indexOf('clamp') >= 0 &&
                                 r.w.indexOf('gclamp') < 0));
  // Чужое значение не должно влиять на струбцину вовсе.
  chk('ширина хомута струбцину не трогает',
      Math.abs(sp({clampW: 55}).W - sp({}).W) < 1e-9, [sp({clampW:55}).W, sp({}).W]);
  chk('а своя — трогает', Math.abs(sp({gcW: 55}).W - 55) < 1e-9, sp({gcW:55}).W);
}

console.log('\n=== вылет растёт под гнездо ===');
{
  const small = sp({gcDepth:15, gcAF:30});
  chk('заказанного вылета не хватило', small.depthCut === true, [small.depthWant, small.depth]);
  chk('и он поднят ровно до потребного',
      Math.abs(small.depth - Math.max(2*small.hexR + 8 - small.T + 2, small.hexR + 8)) < 1e-9, small.depth);
  chk('об этом сказано', W({gcDepth:15, gcAF:30}).some(x => /вылет губок поднят/.test(x)));
  /* У ПОТОЛКА ВЫЛЕТА ДВА СЛАГАЕМЫХ, И ОБА ЖИВЫЕ. Первое — «ось обязана выйти за спинку»: без него на
     мелком болте с крупной гайкой винт встаёт почти вплотную к спинке, и зажимать им нечего. Перебор
     10 500 наборов: слагаемое решало исход в 198 из них, и вот один такой набор. */
  const tight = sp({gcOpen:10, gcDepth:15, gcT:12, gcBolt:4, gcAF:13});
  chk('ось винта выходит за спинку с запасом', tight.reach >= 4 - 1e-9, tight.reach);
  chk('и на других наборах тоже',
      [{}, {gcBolt:4, gcAF:13, gcDepth:15}, {gcT:40, gcBolt:16, gcDepth:15}, {gcT:6, gcAF:40, gcDepth:15}]
        .every(ov => sp(ov).reach >= 4 - 1e-9),
      [{}, {gcBolt:4, gcAF:13, gcDepth:15}, {gcT:40, gcBolt:16, gcDepth:15}, {gcT:6, gcAF:40, gcDepth:15}]
        .map(ov => +sp(ov).reach.toFixed(2)));
  const big = sp({gcDepth:150});
  chk('просторный вылет не трогают', big.depthCut === false && Math.abs(big.depth - 150) < 1e-9);
  chk('и молчат про него', !W({gcDepth:150}).some(x => /вылет губок поднят/.test(x)));
  /* И ГЛАВНОЕ: гнездо целиком внутри губки. Ось не ближе своего радиуса к обоим краям — иначе
     шестигранник вылезает за контур, и ушное отсечение сшивает его во что попало. */
  for (const ov of [{}, {gcDepth:15, gcAF:40, gcT:6}, {gcBolt:16, gcDepth:15}, {gcAF:40, gcT:40}]){
    const g = sp(ov);
    chk('гнездо внутри губки при ' + JSON.stringify(ov),
        g.xA - g.hexR > 1 && g.xA + g.hexR < g.T + g.depth - 1,
        [g.xA - g.hexR, g.xA + g.hexR, g.T + g.depth]);
    chk('  и ось выходит за спинку', g.xA > g.T, [g.xA, g.T]);
  }
}

console.log('\n=== ширина растёт под гайку ===');
{
  const narrow = sp({gcW:10});
  chk('узкую ширину поднимают', narrow.wCut === true, [narrow.wWant, narrow.W]);
  chk('и ровно до гнезда с запасом', Math.abs(narrow.W - 2*(narrow.hexR + 4)) < 1e-9, narrow.W);
  chk('об этом сказано', W({gcW:10}).some(x => /ширина скобы поднята/.test(x)));
  chk('просторную не трогают', sp({gcW:55}).wCut === false);
  /* «0 = АВТО» — потому что ширину диктует гнездо. Поставь умолчанием число, и на любом болте крупнее
     шестёрки оно окажется меньше нужного: приложение станет ругаться на собственные умолчания. */
  chk('умолчание — авто, и оно не ругается', sp({}).wCut === false && !W({}).some(x => /ширина скобы/.test(x)),
      W({}));
  chk('и авто шире минимума', sp({}).W > sp({}).wMin, [sp({}).W, sp({}).wMin]);
  chk('толще болт — шире скоба', sp({gcBolt:16}).W > sp({gcBolt:4}).W + 10);
}

console.log('\n=== губка встала ПОД скобу, а не рядом ===');
{
  /* Поворот кладёт толщину губки вдоль оси винта, но и уводит её вбок: без сдвига губка встаёт рядом со
     скобой, деталь остаётся герметичной и выглядит целой, а габарит по ширине оказывается ВДВОЕ больше.
     Меряется поэтому именно габарит: он обязан равняться ширине губки, а не сумме двух тел. */
  const s = sp({}), b = bbox(raw({}));
  chk('габарит по ширине — это губка, а не две детали рядом',
      Math.abs((b.y[1] - b.y[0]) - (s.W + 1.2)) < 1e-6, [b.y[1]-b.y[0], s.W + 1.2]);
  chk('габарит по вылету — скоба целиком', Math.abs((b.x[1] - b.x[0]) - (s.T + s.depth)) < 1e-6,
      [b.x[1]-b.x[0], s.T + s.depth]);
  chk('габарит по высоте — просвет и две губки',
      Math.abs((b.z[1] - b.z[0]) - (s.open + 2*s.T)) < 1e-6, [b.z[1]-b.z[0], s.open + 2*s.T]);
  /* СРАЩЕНЫ ИЛИ СТОЯТ ВСТЫК — видно по ПОРЯДКУ пересечений, а не по их числу. У спинки луч встречает
     четыре грани: низ губки, низ скобы, верх губки, верх скобы. Если скоба лишь приставлена, «низ
     скобы» и «верх губки» совпадут; если она отодвинута — поменяются местами и между телами окажется
     щель. Сращены они тогда и только тогда, когда низ скобы лежит ВЫШЕ низа губки и НИЖЕ её верха. */
  const d = rayHitsZ(raw({}), s.T*0.5, 0);
  chk('у спинки луч встречает четыре грани', d.length === 4, d);
  chk('и скоба входит в губку, а не приставлена к ней',
      d[1] > d[0] + 1e-6 && d[1] < d[2] - 1e-6, d);
  chk('  причём ровно на заказанное утопление', Math.abs((d[2] - d[1]) - 0.8) < 1e-6, d[2] - d[1]);
}

console.log('\n=== гнездо под гайку ===');
{
  const s = sp({}), t = raw({});
  /* РАЗМЕР ПОД КЛЮЧ БЕРЁТСЯ ИЗ ТАБЛИЦЫ, А НЕ ИЗ ПРОПОРЦИИ (v24.4.0). Прежняя формула 1.8·Ø ошибалась
     тем сильнее, чем крупнее болт: на умолчании M8 она давала 14.4 против настоящих 13, то есть
     гнездо на полтора миллиметра шире гайки. Гайка в нём проворачивается под нагрузкой — струбцина
     не держит, а строится и выглядит правильно. */
  chk('размер под ключ — из таблицы настоящих гаек, плюс зазор',
      Math.abs(s.af - (nutAF(s.bolt) + 0.25)) < 1e-9, [s.af, nutAF(s.bolt)]);
  chk('и для M8 это 13, а не 14.4', Math.abs(nutAF(8) - 13) < 1e-9, nutAF(8));
  chk('и для M5 это 8, а не 9 — таблица не ложится ни на какую пропорцию',
      Math.abs(nutAF(5) - 8) < 1e-9 && Math.abs(nutAF(6) - 10) < 1e-9, [nutAF(5), nutAF(6)]);
  /* Ø болта у струбцины ЛЮБОЙ от 4 до 16, а таблица знает только стандартный ряд: на девять с
     половиной миллиметров гайки не существует, и честный ответ там — оценка, а не отказ. */
  chk('на нестандартный Ø остаётся оценка по пропорции',
      Math.abs(nutAF(9.5) - 9.5*1.8) < 1e-9, nutAF(9.5));
  chk('а высота гайки тоже из таблицы', Math.abs(nutThk(8) - 6.8) < 1e-9, nutThk(8));
  chk('заданный размер под ключ берётся', Math.abs(sp({gcAF:13}).af - 13.25) < 1e-9, sp({gcAF:13}).af);
  /* РАДИУС ГНЕЗДА — ПО УГЛАМ, А РАЗМЕР ГАЙКИ — ПОД КЛЮЧ, и путать их нельзя: разница в cos 30°, то есть
     гнездо выходит на 13 % уже, гайка в него не лезет, а деталь при этом строится и выглядит правильно.
     Утверждается прямо: удвоенный радиус, умноженный на cos 30°, обязан дать заказанный размер. */
  chk('радиус гнезда берётся по УГЛАМ шестигранника',
      Math.abs(2*s.hexR*Math.cos(Math.PI/6) - s.af) < 1e-9, [2*s.hexR*Math.cos(Math.PI/6), s.af]);
  // ...и это доходит до сетки: ширина дырки поперёк губки равна размеру под ключ.
  {
    const yc2 = (bbox(t).y[0] + bbox(t).y[1])/2;
    let lo = null, hi = null;
    for (let x = s.xA - s.hexR - 1; x <= s.xA + s.hexR + 1; x += 0.02)
      if (rayZ(t, x, yc2) === 2){ if (lo === null) lo = x; hi = x; }
    chk('и в сетке гнездо ровно под ключ', lo !== null && Math.abs((hi - lo) - s.af) < 0.06,
        {дали: hi - lo, надо: s.af});
  }
  /* Щуп берётся от СЕРЕДИНЫ готовой детали, а не от нуля исходного контура: перед выдачей деталь
     центруется по ширине, и координата гнезда уезжает на полширины. Первая версия щупа искала гнездо
     там, где его нет, и уверенно докладывала «материал есть» — то есть ловила бы отсутствие отверстия
     ровно наоборот. Заодно это и утверждение: гнездо обязано сидеть на средней линии скобы. */
  const yc = (bbox(t).y[0] + bbox(t).y[1])/2;
  chk('гнездо сидит на средней линии', Math.abs(yc) < 1e-6, yc);
  /* ГНЕЗДО ВИДНО ПО РАЗНИЦЕ: на оси луч не встречает нижней губки вовсе и проходит только верхнюю —
     две грани; в стороне от оси губка на месте, и граней четыре. Сравнивать с нулём тут нельзя: над
     гнездом всегда есть верхняя губка, и «ноль» означал бы, что струбцины нет. */
  chk('на оси винта нижней губки нет', rayZ(t, s.xA, yc) === 2, rayZ(t, s.xA, yc));
  chk('а в стороне от неё губка цела', rayZ(t, s.xA, yc + s.hexR + 2) === 4,
      rayZ(t, s.xA, yc + s.hexR + 2));
  chk('и по ту сторону оси тоже', rayZ(t, s.xA, yc - s.hexR - 2) === 4);
  /* «Ближе к спинке» — ЗА НОСКОМ КОСЫНКИ: в самой косынке граней шесть, а не четыре, и это правильно
     (косынка — материал в просвете, луч протыкает и её). Проверять надо целость губки, а не отсутствие
     косынки, поэтому щуп отодвинут за неё; заодно ниже утверждается и то, что в косынке их шесть. */
  chk('и ближе к спинке, за носком косынки', rayZ(t, s.T + s.gus + 1, yc) === 4,
      rayZ(t, s.T + s.gus + 1, yc));
  chk('а в самой косынке луч протыкает и её', s.gus > 0 && rayZ(t, s.T + s.gus*0.5, yc) === 6,
      rayZ(t, s.T + s.gus*0.5, yc));
  chk('без косынок у спинки губка цела сразу', rayZ(raw({gcGusset:0}), s.T + 1, yc) === 4,
      rayZ(raw({gcGusset:0}), s.T + 1, yc));
  chk('гнездо не сквозит на всю губку',
      rayZ(t, s.xA - s.hexR - 2, yc) === 4, rayZ(t, s.xA - s.hexR - 2, yc));
  chk('шире гайка — шире гнездо', sp({gcAF:30}).hexR > sp({gcAF:13}).hexR);
}

console.log('\n=== про болт с гайкой сказано ===');
{
  chk('печатать их отдельно — сказано всегда',
      W({}).some(x => /раздел «Резьба».*«болт» и «гайка»/.test(x)), W({}));
  chk('и назван нужный диаметр', W({gcBolt:12}).some(x => /Ø12/.test(x)), W({gcBolt:12}));
  chk('и почему не печатать резьбу в скобе', W({}).some(x => /срывает по слоям/.test(x)));
  chk('тонкое сечение названо', W({gcT:6, gcBolt:16}).some(x => /разогнётся раньше/.test(x)));
  chk('а достаточное — нет', !W({gcT:20, gcBolt:8}).some(x => /разогнётся/.test(x)));
}

console.log('\n=== вся область значений ===');
{
  let bad = 0, worst = null, cop = 0, copAt = null, n = 0;
  for (const open of [10, 50, 200])
    for (const depth of [15, 40, 150])
      for (const T of [6, 12, 40])
        for (const w of [0, 10, 60])
          for (const bolt of [4, 8, 16])
            for (const af of [0, 40]){
              const ov = {gcOpen:open, gcDepth:depth, gcT:T, gcW:w, gcBolt:bolt, gcAF:af};
              const tr = raw(ov), m = manifoldCheck(tr, 6); n++;
              if (!m.watertight || meshVolume(tr) <= 0){ bad++; if (!worst) worst = {ov, open:m.openEdges, bad:m.badEdges}; }
              const c = coplanarPairs(tr);
              if (c.hits){ cop++; if (!copAt) copAt = {ov, hits:c.hits, where:c.where}; }
            }
  chk('486 наборов герметичны', bad === 0 && n === 486, worst || n);
  chk('и ни в одном нет совпадающих граней', cop === 0, copAt);
}

console.log('\n=== косынки жёсткости ===');
{
  /* КОСЫНКА ЕСТЬ В СЕТКЕ. Щуп бьёт вдоль Z в точку внутреннего угла — на полпути между спинкой и
     носком косынки. С косынкой материал там есть, без неё в этой точке просвет. Точка берётся ВЫШЕ
     губки и НИЖЕ верхнего плеча, то есть в самом просвете, где кроме косынки быть нечему. */
  const cornerHit = (ov, frac) => {
    const s = sp(ov), t = raw(ov), b = bbox(t);
    const x = s.T + Math.max(0.4, sp({gcGusset:8}).gus*frac), y = (b.y[0] + b.y[1])/2;
    return rayHitsZ(t, x, y);
  };
  {
    const withG = cornerHit({gcGusset:8}, 0.5), noG = cornerHit({gcGusset:0}, 0.5);
    chk('с косынкой в углу материал есть', withG.length > noG.length, [withG.length, noG.length]);
  }
  // ...и ровно там, где она кончается, его снова нет
  {
    const s = sp({gcGusset:8}), t = raw({gcGusset:8}), b = bbox(t), y = (b.y[0] + b.y[1])/2;
    const zsIn  = rayHitsZ(t, s.T + s.gus*0.5, y);
    const zsOut = rayHitsZ(t, s.T + s.gus + 1.5, y);
    chk('за носком косынки материала уже нет', zsIn.length > zsOut.length, [zsIn.length, zsOut.length]);
    chk('и без косынки в той же точке его нет', rayHitsZ(raw({gcGusset:0}), s.T + s.gus*0.5, y).length === zsOut.length,
        [rayHitsZ(raw({gcGusset:0}), s.T + s.gus*0.5, y).length, zsOut.length]);
  }
  /* КОСЫНКИ ДВЕ, СВЕРХУ И СНИЗУ. Одна — половина работы: раскрывается скоба обоими углами. Меряется
     по ВЫСОТЕ материала в углу: с двумя косынками просвет там сужен с обеих сторон. */
  {
    const s = sp({gcGusset:8}), t = raw({gcGusset:8}), b = bbox(t), y = (b.y[0] + b.y[1])/2;
    const zs = rayHitsZ(t, s.T + s.gus*0.5, y);
    const gap = [];                               // просветы между последовательными пересечениями
    for (let i = 0; i + 1 < zs.length; i++) gap.push(zs[i+1] - zs[i]);
    const clear = Math.max(...gap);
    /* На половине косынки каждая из них съедает половину своей длины, а сама скоба утоплена в губку
       на GC_SINK — просвет отсчитывается от её низа, а не от верха губки. */
    const want = s.open + GC_SINK - 2*(s.gus*0.5);
    chk('просвет у спинки сужен обеими косынками', Math.abs(clear - want) < 0.05, [clear, want]);
  }
  /* ОБЪЁМ РАСТЁТ ВМЕСТЕ С КОСЫНКОЙ, и растёт как ПЛОЩАДЬ треугольника — с квадратом. Проверка на
     монотонность одна поймала бы и «косынка нарисована вдвое меньше заказанной». */
  {
    const v = g => meshVolume(raw({gcGusset:g}));
    const s4 = sp({gcGusset:4}), s8 = sp({gcGusset:8});
    const d4 = v(4) - v(0), d8 = v(8) - v(0);
    chk('объём растёт с косынкой', d4 > 0 && d8 > d4, [d4, d8]);
    chk('и ровно как два треугольника на ширину скобы',
        Math.abs(d8 - 2*(s8.gus*s8.gus/2)*s8.W) < 1e-6 && Math.abs(d4 - 2*(s4.gus*s4.gus/2)*s4.W) < 1e-6,
        [d8, 2*(s8.gus*s8.gus/2)*s8.W]);
  }

  /* УРЕЗАНИЕ. Три ограничителя, и каждый настоящий: гнездо под гайку, просвет и вылет губки. */
  chk('умолчание — косынка восемь миллиметров', Math.abs(sp({}).gus - 8) < 1e-9, sp({}).gus);
  chk('ноль — это «без косынок»', sp({gcGusset:0}).gus === 0 && sp({gcGusset:0}).gusCut === false);
  /* КОСЫНКА НЕ ДОХОДИТ ДО ГНЕЗДА — инвариант по всей области, а не на одном наборе: там, где места нет
     вовсе, косынка обязана стать нулём, а не отрицательной и не «сколько просили». */
  {
    let viol = null, zero = 0, n = 0;
    for (const open of [10, 50, 200]) for (const depth of [15, 40, 150]) for (const T of [6, 12, 40])
      for (const bolt of [4, 8, 16]) for (const g of [1, 8, 40]){
        const q = sp({gcOpen:open, gcDepth:depth, gcT:T, gcBolt:bolt, gcGusset:g}); n++;
        if (q.gus === 0) zero++;
        if (!(q.gus >= 0 && (q.gus === 0 || q.T + q.gus <= q.xA - q.hexR + 1e-9)) && !viol)
          viol = {open, depth, T, bolt, g, gus:q.gus, xA:q.xA, hexR:q.hexR};
      }
    chk('косынка нигде не доходит до гнезда под гайку', viol === null, viol);
    chk('и там, где ей нет места, она ровно ноль', zero > 0 && zero < n, [zero, n]);
  }
  chk('и не дают съесть просвет', sp({gcOpen:10, gcGusset:40}).gus <= 10*0.35 + 1e-9,
      sp({gcOpen:10, gcGusset:40}).gus);
  chk('урезание помечено', sp({gcGusset:40}).gusCut === true);
  chk('и названо вслух', W({gcGusset:40}).some(x => /косынка урезана с/.test(x)), W({gcGusset:40}));
  chk('просторную косынку не трогают', sp({gcGusset:4}).gusCut === false);
  chk('просвет у спинки назван', W({}).some(x => /у самой спинки просвет из-за косынок/.test(x)), W({}));
  chk('без косынок про просвет молчат', !W({gcGusset:0}).some(x => /просвет из-за косынок/.test(x)));

  /* ЖЁСТКОСТЬ РАСТЁТ, ПРОЧНОСТЬ НЕТ, и это не оговорка, а следствие: на губке момент растёт от нуля к
     корню и косынка переносит опасное сечение на свой носок, а в СПИНКЕ момент постоянен по всей
     длине — сила приложена параллельно ей. Опасное сечение спинки — её середина, куда косынка не
     достаёт. Проверка требует ровно этого, а не «стало лучше». */
  {
    const s0 = sp({gcGusset:0}), s8 = sp({gcGusset:8}), s17 = sp({gcGusset:17});
    /* Точную величину пришпиливает численный интеграл ниже; здесь — что связь монотонна и заметна. */
    chk('косынка поднимает жёсткость', s8.k > s0.k*1.2 && s17.k > s8.k*1.5, [s0.k, s8.k, s17.k]);
    chk('и не поднимает прочность', Math.abs(s8.Pmax - s0.Pmax) < 1e-9, [s0.Pmax, s8.Pmax]);
    chk('и это сказано вслух',
        W({}).some(x => /прочности она НЕ добавляет вовсе/.test(x) && /посередине спинки/.test(x)), W({}));
    /* СПИНКА ОПАСНЕЕ ГУБКИ ВСЕГДА, и это утверждение, а не наблюдение на умолчаниях: момент у них один
       и тот же, а сечение спинки тоньше на отступ скобы от кромки. Отношение обязано выйти ровно
       (T/(T−GC_OFF))² — если бы кто-то сравнял сечения или перепутал их местами, здесь бы упало. */
    {
      let viol = null, n = 0;
      for (const open of [10, 50, 200]) for (const depth of [15, 150]) for (const T of [6, 12, 40])
        for (const bolt of [4, 16]) for (const g of [0, 40]){
          const q = sp({gcOpen:open, gcDepth:depth, gcT:T, gcBolt:bolt, gcGusset:g}); n++;
          if (!(q.sSpine > q.sArm) && !viol) viol = {open, depth, T, bolt, g, sSpine:q.sSpine, sArm:q.sArm};
        }
      chk('спинка опаснее губки во всех ' + n + ' наборах', viol === null, viol);
      const q0 = sp({gcT:12, gcGusset:0});
      chk('и ровно в (T/(T−отступ))² раз',
          Math.abs(q0.sSpine/q0.sArm - Math.pow(12/(12 - GC_OFF), 2)) < 1e-9,
          [q0.sSpine/q0.sArm, Math.pow(12/(12 - GC_OFF), 2)]);
    }
  }
  /* РАСЧЁТ ИДЁТ ПО МАТЕРИАЛУ, а не по одному зашитому пластику. Модуль двигает жёсткость, допустимая
     деформация — предельное усилие, и это РАЗНЫЕ числа: нейлон мягче PLA и прочнее его втрое. */
  {
    const pla = sp({gcMat:'pla'}), pet = sp({gcMat:'petg'}), nyl = sp({gcMat:'nylon'});
    chk('модуль двигает жёсткость', pla.k > pet.k && pet.k > nyl.k, [pla.k, pet.k, nyl.k]);
    chk('а допустимая деформация — предельное усилие', nyl.Pmax > pet.Pmax && pet.Pmax > pla.Pmax,
        [pla.Pmax, pet.Pmax, nyl.Pmax]);
    chk('жёсткость идёт ровно с модулем',
        Math.abs(pla.k/pet.k - 2600/2100) < 1e-9, [pla.k/pet.k, 2600/2100]);
    chk('материал назван в предупреждении', W({gcMat:'nylon'}).some(x => /скоба \(нейлон\)/.test(x)),
        W({gcMat:'nylon'}));
    chk('«как у печати» берёт материал печати',
        Math.abs(sp({gcMat:'auto', printMat:'abs'}).k - sp({gcMat:'abs'}).k) < 1e-9);
  }
  /* ЖЁСТКОСТЬ ПРОВЕРЯЕТСЯ ОТНОШЕНИЕМ, А НЕ «БОЛЬШЕ-МЕНЬШЕ»: потерянный множитель «больше» не нарушает.
     Ширина входит в оба момента инерции линейно и БОЛЬШЕ НИ ВО ЧТО — ни в вылет, ни в просвет, — так
     что вдвое шире обязано дать ровно вдвое жёстче. Толщина такой чистой связи не даёт: от неё зависят
     и просвет, и плечо, поэтому куб на ней не проверить, и притворяться нечего. */
  {
    const a = sp({gcW:30, gcGusset:0}), b2 = sp({gcW:60, gcGusset:0});
    chk('вдвое шире скоба — ровно вдвое жёстче', Math.abs(b2.k/a.k - 2) < 1e-9, b2.k/a.k);
    chk('и ровно вдвое прочнее', Math.abs(b2.Pmax/a.Pmax - 2) < 1e-9, b2.Pmax/a.Pmax);
    const c = sp({gcDepth:40, gcGusset:0}), d = sp({gcDepth:80, gcGusset:0});
    chk('длиннее вылет — мягче, и заметно', c.k/d.k > 2.5, [c.k, d.k, c.k/d.k]);
  }
  /* И САМА ФОРМУЛА РАСКРЫТИЯ — ЧИСЛЕННЫМ ИНТЕГРАЛОМ, написанным здесь заново. Закрытая форма
     2L³/(3EI) + L²h/(EI) получена интегрированием M²/(2EI) по контуру рамы; здесь тот же интеграл
     берётся по шагам, и совпасть они обязаны. Потерянная двойка на две губки или L² вместо L³ так
     ловятся, а сверкой формулы с самой собой — нет. */
  {
    const num = ov => {
      const s = sp(ov), E = s.mat.E, L = s.Lc - s.gus, h = s.hc - 2*s.gus, N = 4000;
      let d = 0;
      for (let i = 0; i < N; i++){ const x = L*(i + 0.5)/N; d += 2*(x*x)/(E*s.Ia)*(L/N); }  // две губки
      for (let i = 0; i < N; i++) d += (s.Lc*s.Lc)/(E*s.Is)*(h/N);                          // спинка
      return 1/d;
    };
    for (const ov of [{gcGusset:0}, {gcGusset:8}, {gcOpen:120, gcDepth:90, gcT:8, gcGusset:6}]){
      const got = sp(ov).k, want = num(ov);
      chk('раскрытие сходится с численным интегралом ' + JSON.stringify(ov),
          Math.abs(got/want - 1) < 2e-6, [got, want]);
    }
  }

  /* ОБЛАСТЬ ЗНАЧЕНИЙ С КОСЫНКАМИ. Косынка — лишние два угла в контуре, и контур обязан остаться
     простым: ушное отсечение самопересечение не заметит, а сошьёт во что попало. */
  {
    let bad = 0, worst = null, cop = 0, copAt = null, n = 0;
    for (const g of [0, 1, 8, 40])
      for (const open of [10, 200])
        for (const depth of [15, 150])
          for (const T of [6, 40])
            for (const bolt of [4, 16])
              for (const w of [0, 60]){
                const ov = {gcGusset:g, gcOpen:open, gcDepth:depth, gcT:T, gcBolt:bolt, gcW:w};
                const tr = raw(ov), m = manifoldCheck(tr, 6); n++;
                if (!m.watertight || meshVolume(tr) <= 0){ bad++; if (!worst) worst = {ov, open:m.openEdges, bad:m.badEdges}; }
                const c = coplanarPairs(tr);
                if (c.hits){ cop++; if (!copAt) copAt = {ov, hits:c.hits, where:c.where}; }
              }
    chk('128 наборов с косынками герметичны', bad === 0 && n === 128, worst || n);
    chk('и ни в одном нет совпадающих граней', cop === 0, copAt);
  }
  /* И ГНЕЗДО ПОД ГАЙКУ ОСТАЛОСЬ СКВОЗНЫМ во всех них: косынка, дошедшая до гнезда, замкнула бы контур
     губки вокруг шестигранника. Щуп бьёт по оси винта — там обязана быть дырка. */
  for (const ov of [{gcGusset:40, gcOpen:200, gcDepth:15, gcBolt:16}, {gcGusset:40, gcT:40},
                    {gcGusset:8, gcDepth:150}, {gcGusset:40, gcOpen:10}]){
    const s = sp(ov), t = raw(ov), b = bbox(t);
    chk('гнездо сквозное при ' + JSON.stringify(ov), rayZ(t, s.xA, (b.y[0] + b.y[1])/2) === 2,
        rayZ(t, s.xA, (b.y[0] + b.y[1])/2));
  }
}

console.log('\n=== печатная резьба вместо гнезда под гайку ===');
{
  /* УМОЛЧАНИЕ НЕ ТРОНУТО. Оговорка про срыв витков по слоям осталась верной, и резьба добавлена рядом,
     а не вместо: гайка прочнее, а гайки под рукой может не быть. */
  chk('умолчание — гнездо под гайку', sp({}).nutMode === 'hex', sp({}).nutMode);
  chk('и деталь при умолчании прежняя',
      Math.abs(meshVolume(raw({})) - meshVolume(raw({gcNut:'hex'}))) < 1e-9);
  chk('резьба включается выбором', sp({gcNut:'thread'}).nutMode === 'thread');

  /* ШАГ — ИЗ ТАБЛИЦЫ ISO 261, а не из формулы: формулы для шага не существует. */
  for (const [d, P] of [[3, 0.5], [4, 0.7], [5, 0.8], [6, 1], [8, 1.25], [10, 1.5], [12, 1.75], [16, 2]]){
    if (d < 4) continue;                                   // Ø болта у струбцины начинается с четырёх
    chk('M' + d + ' — крупный шаг ' + P, Math.abs(sp({gcNut:'thread', gcBolt:d}).pitch - P) < 1e-9,
        sp({gcNut:'thread', gcBolt:d}).pitch);
    chk('и он не «угадан»', sp({gcNut:'thread', gcBolt:d}).pitchGuessed === false);
  }
  {
    const q = sp({gcNut:'thread', gcBolt:9.5});
    chk('у нестандартного Ø шаг берётся у ближайшего стандартного', Math.abs(q.pitch - 1.5) < 1e-9, q.pitch);
    chk('и это помечено как оценка', q.pitchGuessed === true);
    chk('и сказано вслух', W({gcNut:'thread', gcBolt:9.5}).some(x => /шаг ближайшего стандартного/.test(x)),
        W({gcNut:'thread', gcBolt:9.5}));
    chk('у стандартного про оценку молчат', !W({gcNut:'thread', gcBolt:8}).some(x => /ближайшего стандартного/.test(x)));
    chk('заданный вручную шаг сильнее таблицы', Math.abs(sp({gcNut:'thread', gcBolt:8, gcPitch:2.5}).pitch - 2.5) < 1e-9);
    chk('и «угаданным» уже не считается', sp({gcNut:'thread', gcBolt:9.5, gcPitch:1.25}).pitchGuessed === false);
  }

  /* ГЛАВНОЕ: БОЛТ ГЕНЕРАТОРА В НЕЁ ВКРУЧИВАЕТСЯ. Меряются ОБЕ поверхности, а не сверяются формулы. */
  {
    // радиус поверхности в (θ, y): луч из оси наружу, первое пересечение
    const radiusAt = (tris, th, y) => {
      const d = [Math.cos(th), 0, Math.sin(th)]; let best = Infinity;
      for (const T of tris){
        const e1 = sub(T[1], T[0]), e2 = sub(T[2], T[0]);
        const h = cross(d, e2), a = dot(e1, h); if (Math.abs(a) < 1e-12) continue;
        const sv = [-T[0][0], y - T[0][1], -T[0][2]], f = 1/a;
        const u = f*(sv[0]*h[0] + sv[1]*h[1] + sv[2]*h[2]); if (u < 0 || u > 1) continue;
        const q = cross(sv, e1), v = f*(d[0]*q[0] + d[1]*q[1] + d[2]*q[2]); if (v < 0 || u + v > 1) continue;
        const t = f*(e2[0]*q[0] + e2[1]*q[1] + e2[2]*q[2]); if (t > 1e-9 && t < best) best = t;
      } return best; };
    /* Углы щупа СДВИНУТЫ на треть грани. Ровно кратные числу граней ложатся точно в рёбра сетки, оба
       смежных треугольника строгий тест отвергает, и «поверхности здесь нет» выходит на сплошной
       резьбе — первая версия щупа так и докладывала наружный Ø вместо канала. */
    const ANG = k => 2*Math.PI*(k + 0.37)/13;
    const boltOf = (D, P) => {
      const bp = Object.assign({}, defaultBoxParams(), {shape:'box', threadMode:'bolt', threadD:D, threadPitch:P,
        threadLen:20, threadClear:0.4, threadLead:0, printShrink:false});
      const all = buildTrisForShape('box', bp);
      // стержень: отбрасываем головку — она шире резьбы и щуп упирался бы в неё
      const keep = all.filter(T => T.every(v => Math.hypot(v[0], v[2]) < D/2 + 0.35));
      let lo = 1e9, hi = -1e9;
      for (const T of keep) for (const v of T){ if (v[1] < lo) lo = v[1]; if (v[1] > hi) hi = v[1]; }
      return {tris: keep, y0: lo + 2, y1: hi - 2};
    };
    /* Зазор МЕЖДУ ПОВЕРХНОСТЯМИ при лучшем осевом смещении. Смещение подбирается потому, что резьба
       свинчивается при любом: важен не сдвиг, а РАВНОМЕРНОСТЬ. Неравномерный зазор означает разошедшийся
       шаг, профиль, глубину или направление витка — то есть пару, которая не свинтится. */
    const worstGap = (D, P, clr) => {
      const sleeve = threadSleeveTris(0, 12, D, P, D/2 + 1.6, clr, 0.14);
      const B = boltOf(D, P), pts = [];
      for (let k = 0; k < 13; k++){ const th = ANG(k);
        for (let j = 0; j <= 6; j++){ const ys = 3 + 6*j/6;
          const rf = radiusAt(sleeve, th, ys); if (isFinite(rf)) pts.push([th, ys, rf]); } }
      let best = Infinity;
      for (let m = 0; m < 60; m++){ const dlt = P*m/60;
        let mx = 0, ok = true;
        for (const [th, ys, rf] of pts){
          let yb = null;
          for (let q = -40; q <= 40; q++){ const c = ys + dlt + q*P; if (c > B.y0 && c < B.y1){ yb = c; break; } }
          if (yb === null){ ok = false; break; }
          const rm = radiusAt(B.tris, th, yb); if (!isFinite(rm)){ ok = false; break; }
          mx = Math.max(mx, Math.abs(rf - rm - clr)); }
        if (ok && mx < best) best = mx; }
      return {worst: best, pts: pts.length};
    };
    const fit = worstGap(8, 1.25, 0.4);
    chk('болт генератора M8×1.25 вкручивается: зазор ровно 0.4 по всей резьбе',
        fit.pts > 60 && fit.worst < 0.09, fit);
    /* ОТРИЦАТЕЛЬНЫЙ КОНТРОЛЬ: болт ДРУГОГО шага не влезает ни при каком смещении. Без него проверка
       выше не значит ничего — «нашлось смещение» само по себе не новость. */
    const bad = (() => {
      const sleeve = threadSleeveTris(0, 12, 8, 1.25, 8/2 + 1.6, 0.4, 0.14);
      const B = boltOf(8, 1.75), pts = [];
      for (let k = 0; k < 13; k++){ const th = ANG(k);
        for (let j = 0; j <= 6; j++){ const ys = 3 + 6*j/6;
          const rf = radiusAt(sleeve, th, ys); if (isFinite(rf)) pts.push([th, ys, rf]); } }
      let best = Infinity;
      for (let m = 0; m < 60; m++){ const dlt = 1.75*m/60;
        let mx = 0, ok = true;
        for (const [th, ys, rf] of pts){
          let yb = null;
          for (let q = -40; q <= 40; q++){ const c = ys + dlt + q*1.75; if (c > B.y0 && c < B.y1){ yb = c; break; } }
          if (yb === null){ ok = false; break; }
          const rm = radiusAt(B.tris, th, yb); if (!isFinite(rm)){ ok = false; break; }
          mx = Math.max(mx, Math.abs(rf - rm - 0.4)); }
        if (ok && mx < best) best = mx; }
      return best; })();
    chk('а болт с другим шагом не влезает ни при каком смещении', bad > 0.3, bad);
  }

  /* ВТУЛКА СИДИТ В ГУБКЕ, А НЕ ВИСИТ В ОТВЕРСТИИ. Сидит она тем, что снаружи ШИРЕ отверстия; будь она
     уже, деталь осталась бы герметичной, а резьба вывалилась бы вместе с болтом. */
  {
    const s = sp({gcNut:'thread'});
    chk('втулка шире отверстия в губке', s.sleeveR > s.bolt/2 + GC_FIT/2 + 1, [s.sleeveR, s.bolt/2]);
    chk('и место под неё считается от НЕЁ, а не от шестигранника',
        Math.abs(s.socketR - s.sleeveR) < 1e-9 && Math.abs(sp({}).socketR - sp({}).hexR) < 1e-9,
        [s.socketR, s.sleeveR, sp({}).socketR, sp({}).hexR]);
    // ...и это доходит до габаритов: под резьбу гнездо у́же, значит и скоба у́же
    chk('под резьбу скоба у́же, чем под гайку', s.W < sp({}).W - 1, [s.W, sp({}).W]);
    /* И ось винта уезжает ДАЛЬШЕ от спинки: гнездо у́же, а губка той же глубины — освободившееся место
       достаётся вылету. Прежняя запись этой проверки была «или reach меньше, или depth не больше» и
       проходила через второе всегда: она не утверждала ничего. */
    chk('и ось винта дальше от спинки, чем при гнезде под гайку', s.reach > sp({}).reach + 1,
        [s.reach, sp({}).reach]);
  }
  /* ОТВЕРСТИЕ В ГУБКЕ ПОД РЕЗЬБУ — КРУГЛОЕ, А ПОД ГАЙКУ — ШЕСТИГРАННОЕ. Радиальным щупом их не
     различить, поэтому щуп УГЛОВОЙ: у шестигранника угол дотягивается до af/√3, а грань — только до
     af/2, у круга же во все стороны одно и то же. */
  {
    const s = sp({}), t = raw({}), yc = (bbox(t).y[0] + bbox(t).y[1])/2;
    const reach = (tris, ov, ang) => { const q = sp(ov);
      let r = 0; for (let x = 0.1; x < q.hexR + q.sleeveR + 4; x += 0.02){
        if (rayZ(tris, q.xA + x*Math.cos(ang), yc + x*Math.sin(ang)) === 2) r = x; else if (r > 0) break; }
      return r; };
    const hexCorner = reach(t, {}, Math.PI/6), hexFlat = reach(t, {}, 0);
    chk('у гнезда под гайку угол дальше грани', hexCorner > hexFlat + 0.5, [hexCorner, hexFlat]);
    const tt = raw({gcNut:'thread'});
    const rc = reach(tt, {gcNut:'thread'}, Math.PI/6), rf = reach(tt, {gcNut:'thread'}, 0);
    chk('а у отверстия под резьбу во все стороны одинаково', Math.abs(rc - rf) < 0.12, [rc, rf]);
  }

  /* ОБЕ ОГОВОРКИ СКАЗАНЫ: и почему гнездо остаётся умолчанием, и что печатается эта резьба лёжа. */
  chk('про срыв витков по слоям сказано',
      W({gcNut:'thread'}).some(x => /СРЫВАЕТ ПО СЛОЯМ/.test(x)), W({gcNut:'thread'}));
  chk('и про печать лёжа тоже',
      W({gcNut:'thread'}).some(x => /печатается эта резьба ЛЁЖА/.test(x)));
  chk('а при гнезде про гайку говорят по-прежнему',
      W({}).some(x => /болт и гайку печатайте тем же генератором/.test(x)));
  chk('и не поминают печатную резьбу как сделанную',
      !W({}).some(x => /печатная резьба вместо гнезда/.test(x)));

  /* ОБЛАСТЬ ЗНАЧЕНИЙ. Втулка ПЕРЕСЕКАЕТ губку объёмом, и любое касание гранью всплыло бы совпадающей
     парой, а промах мимо материала — дырой. */
  {
    let bad = 0, worst = null, cop = 0, copAt = null, n = 0;
    for (const bolt of [4, 8, 16])
      for (const T of [6, 40])
        for (const open of [10, 200])
          for (const g of [0, 40])
            for (const pit of [0, 0.5, 3]){
              const ov = {gcNut:'thread', gcBolt:bolt, gcT:T, gcOpen:open, gcGusset:g, gcPitch:pit};
              const tr = raw(ov), m = manifoldCheck(tr, 6); n++;
              if (!m.watertight || meshVolume(tr) <= 0){ bad++; if (!worst) worst = {ov, open:m.openEdges, bad:m.badEdges}; }
              const c = coplanarPairs(tr);
              if (c.hits){ cop++; if (!copAt) copAt = {ov, hits:c.hits, where:c.where}; }
            }
    chk('72 набора с печатной резьбой герметичны', bad === 0 && n === 72, worst || n);
    chk('и ни в одном нет совпадающих граней', cop === 0, copAt);
  }
}

console.log('\n=== через настоящий путь приложения ===');
{
  logos.length = 0; boxHoles.length = 0; dieFaces.length = 0;
  Object.assign(paramState.box, G({}));
  const t = buildTrisForShape('box', paramState.box);
  chk('строится то же тело', Math.abs(meshVolume(t) - meshVolume(raw({}))) < 1e-6);
  chk('и герметично', manifoldCheck(t, 6).watertight);
  chk('имя называет просвет, вылет и болт',
      /струбцина 50 мм, вылет \d+, болт M8/.test(activeShapeLabel()), activeShapeLabel());
  chk('и косынку, когда она есть', /косынка 8/.test(activeShapeLabel()), activeShapeLabel());
  Object.assign(paramState.box, G({gcNut:'thread'}));
  chk('и печатную резьбу с её шагом', /резьба ×1.25/.test(activeShapeLabel()), activeShapeLabel());
  chk('и такая деталь строится и герметична',
      manifoldCheck(buildTrisForShape('box', paramState.box), 6).watertight);
  Object.assign(paramState.box, G({}));
  chk('а при гнезде про резьбу молчит', !/резьба ×/.test(activeShapeLabel()), activeShapeLabel());
  Object.assign(paramState.box, G({gcGusset:0}));
  chk('а без косынок молчит про неё', !/косынка/.test(activeShapeLabel()), activeShapeLabel());
  chk('и строится, и герметична', manifoldCheck(buildTrisForShape('box', paramState.box), 6).watertight);
  chk('справка говорит про печатную резьбу как про выбор',
      /ПЕЧАТНАЯ РЕЗЬБА есть выбором рядом с гнездом/.test(MODEL_HELP['mount:gclamp'].what));
  chk('справка говорит про косынки',
      /КОСЫНК/.test(MODEL_HELP['mount:gclamp'].what) || /КОСЫНК/.test(MODEL_HELP['mount:gclamp'].how));
  chk('справка есть и говорит про печать плашмя',
      !!MODEL_HELP['mount:gclamp'] && /ПЛАШМЯ/.test(MODEL_HELP['mount:gclamp'].how));
}

console.log(`\n=== TOTAL: ${pass} passed, ${fail} failed ===`);
process.exit(fail ? 1 : 0);
