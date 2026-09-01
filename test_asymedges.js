// ДВЕНАДЦАТЬ РЁБЕР И ИХ РАДИУСЫ (`asymEdgeSpecs`) — последний из четырёх расчётов, которых не касалась
// ни одна проверка из ста тридцати четырёх файлов.
//
// ЧТО ОН РЕШАЕТ. У коробки двенадцать рёбер, и у каждого свой радиус скругления: верхние, нижние и
// вертикальные задаются тремя ручками. В УГЛУ сходятся ТРИ ребра, и радиус там не может быть больше
// самого мелкого из них — иначе дуги пересеклись бы и оболочка перестала быть замкнутой. Именно это
// `asymEdgeSpecs` и считает: для каждого ребра его собственный радиус и минимум на каждом конце.
//
// ПОЧЕМУ ФАЙЛ ПОЯВИЛСЯ ТОЛЬКО СЕЙЧАС. Скруглённую коробку проверяли и раньше — три файла гоняют её на
// замкнутость, на отсутствие NaN и на объём. Но НИ ОДИН не мерил САМИ РАДИУСЫ: заказали десять,
// получили шесть — все прежние проверки прошли бы. Здесь они меряются по построенной детали.
//
// КАК МЕРИТЬ, И ГДЕ ТУТ ЛОВУШКА. Плоская грань кончается там, где начинается дуга ребра, значит
// радиус — это разница между полугабаритом и границей плоской части. Но мерить надо В СЕРЕДИНЕ
// РЕБРА: у самого угла плоскую часть подрезает уже НАИМЕНЬШИЙ из трёх радиусов, и первая редакция
// этого замера читала «десять» как «шесть», приняв угол за ребро. Ошибка была в измерителе, а деталь
// оказалась права — и то, что она права, здесь и проверяется отдельной строкой.
//
// Run: ./run-all.sh

let pass = 0, fail = 0;
function chk(n, c, e){ if (c){ pass++; console.log('  OK  ', n); }
  else { fail++; console.log('  FAIL', n, e !== undefined ? JSON.stringify(e) : ''); } }

const W_ = 100, H_ = 60, D_ = 80, hw = W_/2, hh = H_/2, hd = D_/2;
const P = (ov) => Object.assign(defaultBoxParams(), {width:W_, height:H_, depth:D_}, ov);
const M = (ov) => buildTrisForShape('box', P(ov));

/* ГРАНИЦА ПЛОСКОЙ ГРАНИ ЧИТАЕТСЯ ПРОФИЛЕМ, А НЕ ТОЧКОЙ. Первая редакция брала окно вокруг середины
   ребра и падала на крупных гранях: при мелком радиусе плоская часть велика, сетка кладёт её одним
   куском, и вершин в середине НЕТ ВОВСЕ — замер читал ноль и объявлял радиус во весь полугабарит.
   Правильно смотреть на всю границу сразу: у каждой строки вершин на плоскости своя дальняя точка,
   и по ним видно обе величины разом. В СЕРЕДИНЕ ребра подрезает СВОЙ радиус — там граница ближе
   всего к оси; У УГЛА подрезает наименьший из трёх — там она дальше всего. Значит минимум по
   строкам даёт собственный радиус ребра, максимум — угловой. Одним замером и то, и другое. */
function faceEdge(t, axis, val, meas, near){
  const rows = new Map();
  for (const T of t) for (const v of T){
    if (Math.abs(v[axis] - val) > 1e-6) continue;
    const k = v[near].toFixed(3);
    rows.set(k, Math.max(rows.get(k) || 0, Math.abs(v[meas])));
  }
  const xs = [...rows.values()];
  return xs.length ? {own: Math.min(...xs), corner: Math.max(...xs), rows: xs.length}
                   : {own: 0, corner: 0, rows: 0};
}

console.log('=== радиус каждой группы рёбер — по детали, в середине ребра ===');
for (const [rT, rB, rV] of [[10, 3, 6], [3, 10, 6], [6, 6, 12], [2, 2, 2], [15, 8, 20]]){
  const ov = {filletTop:rT, filletBottom:rB, filletVert:rV}, t = M(ov);
  const R = asymRadiiFromGroups(rT, rB, rV, hw, hh, hd);
  const name = 'верх ' + rT + ' / низ ' + rB + ' / бок ' + rV;
  chk(name + ': замкнута', manifoldCheck(t, 4).watertight);
  const top1 = faceEdge(t, 1, hh, 0, 2), top2 = faceEdge(t, 1, hh, 2, 0);
  const bot  = faceEdge(t, 1, -hh, 0, 2), ver = faceEdge(t, 0, hw, 2, 1);
  chk('  верхнее ребро вдоль Z: r=' + (hw - top1.own).toFixed(2),
      Math.abs((hw - top1.own) - R.rZ['1,1']) < 0.05, {деталь:+(hw - top1.own).toFixed(3), спец:R.rZ['1,1']});
  chk('  верхнее ребро вдоль X: r=' + (hd - top2.own).toFixed(2),
      Math.abs((hd - top2.own) - R.rX['1,1']) < 0.05, {деталь:+(hd - top2.own).toFixed(3), спец:R.rX['1,1']});
  chk('  нижнее ребро: r=' + (hw - bot.own).toFixed(2),
      Math.abs((hw - bot.own) - R.rZ['0,0']) < 0.05, {деталь:+(hw - bot.own).toFixed(3), спец:R.rZ['0,0']});
  chk('  вертикальное ребро: r=' + (hd - ver.own).toFixed(2),
      Math.abs((hd - ver.own) - R.rY['0,0']) < 0.05, {деталь:+(hd - ver.own).toFixed(3), спец:R.rY['0,0']});
  /* И УГЛОВОЙ ПОДРЕЗ ТОЙ ЖЕ ГРАНИ — наименьший из трёх сошедшихся, как и считает расчёт. */
  const S3 = asymEdgeSpecs(R);
  chk('  а у угла верхней грани подрезает ' + (hw - top1.corner).toFixed(2),
      Math.abs((hw - top1.corner) - Math.min(S3.Z[0].ownR, S3.Z[0].rPlus)) < 0.4,
      {деталь:+(hw - top1.corner).toFixed(2), спец:Math.min(S3.Z[0].ownR, S3.Z[0].rPlus)});
}

console.log('\n=== в углу побеждает НАИМЕНЬШИЙ из трёх — то, ради чего расчёт и существует ===');
{
  /* Верх 10, бок 6: у ребра свой радиус десять, а к углу его подрезает шестёрка вертикального. */
  const ov = {filletTop:10, filletBottom:3, filletVert:6}, t = M(ov);
  const R = asymRadiiFromGroups(10, 3, 6, hw, hh, hd), S2 = asymEdgeSpecs(R);
  chk('расчёт: у верхнего ребра свой радиус 10, а на концах 6',
      S2.Z[0].ownR === 10 && Math.abs(S2.Z[0].rPlus - 6) < 1e-9 && Math.abs(S2.Z[0].rMinus - 6) < 1e-9,
      {own:S2.Z[0].ownR, конец:S2.Z[0].rPlus});
  chk('  и у вертикального внизу 3, наверху 6',
      Math.abs(S2.Y[0].rMinus - 3) < 1e-9 && Math.abs(S2.Y[0].rPlus - 6) < 1e-9,
      {низ:S2.Y[0].rMinus, верх:S2.Y[0].rPlus});
  /* И ЭТО ВИДНО НА ДЕТАЛИ: у самого угла плоская часть верхней грани шире, чем в середине ребра,
     ровно потому, что там подрезает МЕНЬШИЙ радиус. */
  const fe = faceEdge(t, 1, hh, 0, 2);
  const mid = hw - fe.own, corner = hw - fe.corner;          // середина ребра 10, угол 6
  chk('на детали у угла подрез мельче, чем в середине ребра',
      Math.abs(mid - 10) < 0.05 && Math.abs(corner - 6) < 0.4 && corner < mid - 1,
      {середина:+mid.toFixed(2), угол:+corner.toFixed(2)});
  /* ОБРАТНЫЙ СЛУЧАЙ: сделать вертикальные КРУПНЕЕ верхних — и подрезать будет уже верхний. */
  const t2 = M({filletTop:4, filletBottom:3, filletVert:14});
  const fe2 = faceEdge(t2, 0, hw, 2, 1);
  const mid2 = hd - fe2.own, corner2 = hd - fe2.corner;      // вертикальное 14, угол 4
  chk('  и наоборот: крупное вертикальное подрезается мелким верхним',
      Math.abs(mid2 - 14) < 0.05 && corner2 < mid2 - 5,
      {середина:+mid2.toFixed(2), угол:+corner2.toFixed(2)});
}

console.log('\n=== зажим: радиус не больше того, что даёт деталь ===');
{
  /* Радиус, заказанный больше половины наименьшего габарита, УРЕЗАЕТСЯ — иначе дуги пересекутся и
     плоская грань выродится в лезвие. Проверяется и числом расчёта, и построенной деталью. */
  const R = asymRadiiFromGroups(999, 999, 999, hw, hh, hd);
  chk('верхний радиус урезан до 0.98 наименьшего полугабарита',
      Math.abs(R.rX['1,1'] - Math.min(hw, hh, hd)*0.98) < 1e-9, R.rX['1,1']);
  chk('  а вертикальный — по ширине и глубине, высота ему не помеха',
      Math.abs(R.rY['0,0'] - Math.min(hw, hd)*0.98) < 1e-9, R.rY['0,0']);
  const t = M({filletTop:999, filletBottom:999, filletVert:999});
  chk('  и такая деталь всё ещё замкнута', manifoldCheck(t, 4).watertight);
  /* МЕЛКИЙ РАДИУС ПРИРАВНИВАЕТСЯ К ОСТРОМУ РЕБРУ: дуга тоньше десятой доли миллиметра — это не
     скругление, а численно хрупкая лапша. */
  const Rs = asymRadiiFromGroups(0.05, 0.05, 0.05, hw, hh, hd);
  chk('радиус мельче 0.1 мм приравнен к острому ребру',
      Rs.rX['1,1'] === 0 && Rs.rY['0,0'] === 0 && Rs.rZ['1,1'] === 0, Rs.rX['1,1']);
}

console.log('\n=== одно ребро не трогает соседей ===');
{
  /* Двенадцать радиусов независимы, и это проверяется тем, что смена ОДНОЙ группы двигает ровно
     свою границу и оставляет остальные на месте. */
  const a = M({filletTop:10, filletBottom:3, filletVert:6});
  const b = M({filletTop:16, filletBottom:3, filletVert:6});
  const topA = hw - faceEdge(a, 1, hh, 0, 2).own, topB = hw - faceEdge(b, 1, hh, 0, 2).own;
  const botA = hw - faceEdge(a, 1, -hh, 0, 2).own, botB = hw - faceEdge(b, 1, -hh, 0, 2).own;
  const verA = hd - faceEdge(a, 0, hw, 2, 1).own, verB = hd - faceEdge(b, 0, hw, 2, 1).own;
  chk('крупнее верхние — двигается только верх',
      Math.abs(topA - 10) < 0.05 && Math.abs(topB - 16) < 0.05 &&
      Math.abs(botA - botB) < 0.05 && Math.abs(verA - verB) < 0.05,
      {верх:[+topA.toFixed(2), +topB.toFixed(2)], низ:[+botA.toFixed(2), +botB.toFixed(2)],
       бок:[+verA.toFixed(2), +verB.toFixed(2)]});
}

console.log('\n=== TOTAL:', pass, 'passed,', fail, 'failed ===');
if (fail) process.exitCode = 1;
