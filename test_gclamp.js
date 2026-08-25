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
  chk('у струбцины шесть своих строк', own.length === 6, own.map(r => r.key));
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
  chk('гнездо шестигранное и шире номинала на зазор',
      Math.abs(s.af - (s.bolt*1.8 + 0.25)) < 1e-9, [s.af, s.bolt*1.8]);
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
  chk('и ближе к спинке', rayZ(t, s.T + 1, yc) === 4, rayZ(t, s.T + 1, yc));
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

console.log('\n=== через настоящий путь приложения ===');
{
  logos.length = 0; boxHoles.length = 0; dieFaces.length = 0;
  Object.assign(paramState.box, G({}));
  const t = buildTrisForShape('box', paramState.box);
  chk('строится то же тело', Math.abs(meshVolume(t) - meshVolume(raw({}))) < 1e-6);
  chk('и герметично', manifoldCheck(t, 6).watertight);
  chk('имя называет просвет, вылет и болт',
      /струбцина 50 мм, вылет \d+, болт M8/.test(activeShapeLabel()), activeShapeLabel());
  chk('справка есть и говорит про печать плашмя',
      !!MODEL_HELP['mount:gclamp'] && /ПЛАШМЯ/.test(MODEL_HELP['mount:gclamp'].how));
}

console.log(`\n=== TOTAL: ${pass} passed, ${fail} failed ===`);
process.exit(fail ? 1 : 0);
