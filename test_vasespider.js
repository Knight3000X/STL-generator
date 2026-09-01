// КРЕСТОВИНА АБАЖУРА (`vaseSpiderSpec`) — то, чем абажур садится на патрон лампы.
//
// ЗАЧЕМ ЭТОТ ФАЙЛ. Перепись расчётов нашла четыре функции `*Spec`, которых не касалась ни одна
// проверка из ста тридцати четырёх файлов. Первая из них, полка под инструмент, оказалась сломана:
// строила половину заказанных гнёзд молча (v25.28.0). Крестовина — вторая: она держит абажур на
// патроне, ломается она при затяжке кольца, и числа её никто не мерил.
//
// МЕРЯЕТСЯ ПОСТРОЕННОЕ, И МЕРЯЕТСЯ УГЛОМ. Крестовина — это ступица с лучами, и в поперечном разрезе
// у неё три пояса: пустой центр под кольцо патрона, сплошное кольцо ступицы и лучи, между которыми
// пусто. Значит достаточно обойти окружность на трёх радиусах и спросить деталь, есть ли там
// материал: число лучей, их ширина и оба диаметра читаются прямо. Проба ведётся МИМО УЗЛОВ сетки —
// урок полки: на ровных координатах луч считает общее ребро дважды и чётность врёт.
//
// Run: ./run-all.sh

let pass = 0, fail = 0;
function chk(n, c, e){ if (c){ pass++; console.log('  OK  ', n); }
  else { fail++; console.log('  FAIL', n, e !== undefined ? JSON.stringify(e) : ''); } }

const P = (ov) => Object.assign(defaultBoxParams(), {fnOn:true, fnMode:'vase', vaseH:120,
  vaseBaseD:60, vaseBellyD:95, vaseBellyAt:35, vaseFloor:false, vaseSocket:'e27'}, ov);
const SP = (ov) => vaseSpec(P(ov)).spider;
const M  = (ov) => buildTrisForShape('box', P(ov));
const W_ = (ov) => collectPrintWarnings(P(ov));

const OFF = 0.0137;
function insideAt(tris, x, y, z){
  let n = 0;
  for (const T of tris){
    const [a, b, c] = T;
    const d1 = (b[0]-a[0])*(z-a[2]) - (b[2]-a[2])*(x-a[0]);
    const d2 = (c[0]-b[0])*(z-b[2]) - (c[2]-b[2])*(x-b[0]);
    const d3 = (a[0]-c[0])*(z-c[2]) - (a[2]-c[2])*(x-c[0]);
    if (!((d1 >= 0 && d2 >= 0 && d3 >= 0) || (d1 <= 0 && d2 <= 0 && d3 <= 0))) continue;
    const den = d1 + d2 + d3; if (Math.abs(den) < 1e-12) continue;
    if ((d2*a[1] + d3*b[1] + d1*c[1])/den > y) n++;
  }
  return (n % 2) === 1;
}
function yLo(t){ let lo = 1e9; for (const T of t) for (const v of T) lo = Math.min(lo, v[1]); return lo; }
/* Обход окружности радиуса r в плоскости крестовины: возвращает участки материала по углу. Начало
   отсчёта закольцовано — луч, попавший на нулевой градус, иначе считался бы за два. */
function ringRuns(ov, r, step){
  const s = SP(ov), t = M(ov), y = yLo(t) + s.T*0.5 + OFF;
  const N = Math.round(360/(step || 0.5)), hit = [];
  for (let i = 0; i < N; i++){
    const th = (i*360/N + 0.37)*Math.PI/180;
    hit.push(insideAt(t, r*Math.cos(th) + OFF, y, r*Math.sin(th) + OFF/2));
  }
  /* ДВА СЛУЧАЯ, НА КОТОРЫХ ПЕРВАЯ РЕДАКЦИЯ ЭТОГО ЗАМЕРА И СПОТКНУЛАСЬ. Первый: материал по ВСЕЙ
     окружности — тогда «начал» и «кончил» не бывает вовсе, и наивный счётчик отдаёт ноль участков
     там, где кольцо сплошное. Второй: участок, пересекающий нулевой угол, — он начинается в конце
     массива и кончается в начале, и по одному проходу теряется целиком: четыре луча читались как
     три, восемь как семь. Обход закольцован явно. */
  if (hit.every(Boolean)) return {runs:[N], N, frac:[1]};
  if (!hit.some(Boolean)) return {runs:[], N, frac:[]};
  let s0 = 0; while (hit[s0]) s0++;            // начинаем с заведомой пустоты — тогда разрыва нет
  const runs = [];
  let len = 0;
  for (let k = 0; k < N; k++){
    const i = (s0 + k) % N;
    if (hit[i]) len++;
    else if (len){ runs.push(len); len = 0; }
  }
  if (len) runs.push(len);
  return {runs, N, frac: runs.map(k => k/N)};
}

console.log('=== крестовина: три пояса разреза ===');
{
  const s = SP({});
  chk('крестовина посчитана и встаёт', !!s && s.fits === true, s && {arms:s.arms, arm:+s.arm.toFixed(1)});
  chk('центр под кольцо патрона ПУСТ',
      ringRuns({}, s.rBore*0.5, 2).runs.length === 0, ringRuns({}, s.rBore*0.5, 2).runs);
  chk('  кольцо ступицы — сплошное',
      ringRuns({}, (s.rBore + s.rHub)/2, 2).runs.length === 1, ringRuns({}, (s.rBore + s.rHub)/2, 2).runs);
  chk('  а между лучами пусто: их ровно ' + s.arms,
      ringRuns({}, (s.rHub + s.rTop)/2, 1).runs.length === s.arms,
      {найдено:ringRuns({}, (s.rHub + s.rTop)/2, 1).runs.length, спец:s.arms});
}

console.log('\n=== число лучей — то, что заказано ===');
for (const n of [2, 3, 4, 6, 8]){
  const s = SP({vaseSpiderN:n});
  const r = ringRuns({vaseSpiderN:n}, (s.rHub + s.rTop)/2, 1);
  chk('лучей заказано ' + n + ' — на детали ' + r.runs.length, r.runs.length === s.arms && s.arms === n,
      {деталь:r.runs.length, спец:s.arms});
}

console.log('\n=== диаметры: под кольцо патрона и по ступице ===');
for (const [k, d] of [['e27', 40], ['e14', 28]]){
  const s = SP({vaseSocket:k});
  chk('патрон ' + k + ': расчётное отверстие Ø' + d, Math.abs(2*s.rBore - d) < 1e-9, 2*s.rBore);
  /* Кромка отверстия ищется поиском по радиусу: где материал начинается, там и стенка бора. */
  let rIn = 0;
  for (let r = 2; r < s.rHub; r += 0.05) if (ringRuns({vaseSocket:k}, r, 8).runs.length > 0){ rIn = r; break; }
  chk('  и деталь открыта ровно до него (' + (2*rIn).toFixed(2) + ' мм)',
      Math.abs(2*rIn - d) < 0.6, {деталь:+(2*rIn).toFixed(2), спец:d});
}

console.log('\n=== ширина луча у ступицы — то число, которым он ломается ===');
for (const w of [4, 6, 10]){
  const s = SP({vaseSpiderW:w});
  if (!s.fits) continue;
  const r = ringRuns({vaseSpiderW:w}, s.rHub + 0.4, 0.25);
  /* Доля окружности, занятая одним лучом, переводится в ширину по хорде у ступицы. */
  const arcFrac = r.runs.length ? r.runs[0]/r.N : 0;
  const chord = 2*(s.rHub + 0.4)*Math.sin(Math.PI*arcFrac);
  chk('луч шириной ' + w + ' мм у ступицы вышел ' + chord.toFixed(2),
      Math.abs(chord - s.armNarrow) < 0.6, {деталь:+chord.toFixed(2), спец:+s.armNarrow.toFixed(2)});
}

console.log('\n=== толщина крестовины и её место ===');
{
  const s = SP({}), t = M({}), lo = yLo(t);
  /* Проба на ЗАДАННОЙ высоте: первая редакция звала общий обход, а тот считает высоту сам — и
     «подошва на столе» проверяла ту же плоскость, что и всё остальное, то есть ничего. */
  const solidAt = (y) => { const r = (s.rBore + s.rHub)/2;
    for (let a = 0; a < 360; a += 5){ const th = (a + 0.37)*Math.PI/180;
      if (insideAt(t, r*Math.cos(th) + OFF, y, r*Math.sin(th) + OFF/2)) return true; }
    return false; };
  chk('крестовина стоит подошвой на столе', solidAt(lo + 0.2));
  /* Толщина: выше T материала на этом радиусе быть не должно — стенка абажура там дальше по радиусу. */
  const yTest = lo + s.T + 1.5;
  let any = false;
  for (let a = 0; a < 360; a += 5){ const th = (a + 0.37)*Math.PI/180, r = (s.rBore + s.rHub)/2;
    if (insideAt(t, r*Math.cos(th) + OFF, yTest, r*Math.sin(th) + OFF/2)) any = true; }
  chk('  и выше своей толщины её нет', !any, {высота:+(s.T + 1.5).toFixed(1)});
}

console.log('\n=== когда крестовина НЕ встаёт — это сказано ===');
{
  chk('широкий луч не оставляет вылета', SP({vaseSpiderW:14}).fits === false);
  chk('  и об этом сказано числом',
      W_({vaseSpiderW:14}).some(x => /крестовина не встала: у основания остаётся/.test(x)),
      W_({vaseSpiderW:14}));
  chk('крупный патрон в узкое основание не лезет', SP({vaseSocket:'custom', vaseSocketD:100}).fits === false);
  chk('  и названо, каким основание должно быть',
      W_({vaseSocket:'custom', vaseSocketD:100}).some(x => /основание должно быть шире Ø/.test(x)));
  /* И НЕ ВСТАВШЕЙ КРЕСТОВИНЫ В ДЕТАЛИ НЕТ ВОВСЕ — иначе жалоба была бы об одном, а деталь о другом. */
  const s = SP({vaseSpiderW:14});
  chk('  и в детали её тогда нет',
      ringRuns({vaseSpiderW:14}, (s.rHub + s.rTop)/2, 2).runs.length === 0);
  /* У ВАЗЫ С ДНОМ КРЕСТОВИНЫ НЕ БЫВАЕТ: она для абажура, и приложение это говорит. */
  chk('вазе с дном крестовина не положена', SP({vaseFloor:true}) === null);
  chk('  и сказано, что выключить', W_({vaseFloor:true}).some(x => /это абажур, выключите/.test(x)),
      W_({vaseFloor:true}));
}

console.log('\n=== замкнутость с крестовиной ===');
for (const ov of [{}, {vaseSpiderN:2}, {vaseSpiderN:8}, {vaseSocket:'e14'}, {vaseSpiderT:8},
                  {vaseSpiderW:14}, {vaseFacets:6}, {vaseTwist:30}]){
  const t = M(ov);
  chk('замкнута ' + JSON.stringify(ov), manifoldCheck(t, 4).watertight, ov);
}

console.log('\n=== TOTAL:', pass, 'passed,', fail, 'failed ===');
if (fail) process.exitCode = 1;
