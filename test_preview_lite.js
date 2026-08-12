// Упрощение показа: тяжёлую импортированную сетку видят упрощённой, а экспортируют полной.
//
// Проверяется РАЗВЕДЕНИЕ двух путей, а не сам алгоритм: упрощение врезано в единственную дверь в
// Three.js, и главное здесь — что экспорт в неё не заходит. Плюс то, ради чего упрощение затевалось:
// силуэт обязан уцелеть, иначе на экране будет не модель, а её обломки.
//
// Run via ./run-all.sh.
let pass=0, fail=0;
function chk(n,c,e){if(c){pass++;console.log('  OK  ',n);}else{fail++;console.log('  FAIL',n,e!==undefined?JSON.stringify(e):'');}}
const bb = t => { const b={x0:1e9,x1:-1e9,y0:1e9,y1:-1e9,z0:1e9,z1:-1e9};
  for(const T of t) for(const v of T){ if(v[0]<b.x0)b.x0=v[0]; if(v[0]>b.x1)b.x1=v[0];
    if(v[1]<b.y0)b.y0=v[1]; if(v[1]>b.y1)b.y1=v[1]; if(v[2]<b.z0)b.z0=v[2]; if(v[2]>b.z1)b.z1=v[2]; } return b; };
function vol(t){let v=0;for(const T of t){const a=T[0],b=T[1],c=T[2];
  v+=(a[0]*(b[1]*c[2]-b[2]*c[1])-a[1]*(b[0]*c[2]-b[2]*c[0])+a[2]*(b[0]*c[1]-b[1]*c[0]))/6;}return Math.abs(v);}

// Шар в N поясов: сетка выпуклая и с известным объёмом, поэтому по ней видно, что уцелело.
function sphere(n, R){
  const out = [], P = (i,j) => { const th = Math.PI*i/n, ph = 2*Math.PI*j/(2*n);
    return [R*Math.sin(th)*Math.cos(ph), R*Math.cos(th), R*Math.sin(th)*Math.sin(ph)]; };
  for(let i=0;i<n;i++) for(let j=0;j<2*n;j++){
    const a=P(i,j), b=P(i+1,j), c=P(i+1,j+1), d=P(i,j+1);
    out.push([a,b,c]); out.push([a,c,d]); }
  return out;
}

console.log('=== мелкую сетку не трогают вовсе ===');
{
  const t = sphere(20, 10);
  chk('меньше бюджета — возвращается ТОТ ЖЕ массив', displayTris(t) === t, t.length);
  chk('и он правда меньше бюджета', t.length < PREVIEW_TRI_BUDGET, t.length);
  chk('пустоту переживает', displayTris([]).length === 0);
  chk('и отсутствие сетки тоже', displayTris(null) === null);
}

console.log('=== тяжёлую упрощают, и силуэт остаётся на месте ===');
{
  const t = sphere(420, 10);                               // ≈ 705 тысяч треугольников
  chk('исходная и правда тяжёлая', t.length > PREVIEW_TRI_BUDGET, t.length);
  const lite = displayTris(t);
  chk('упрощённая уложилась в бюджет', lite.length <= PREVIEW_TRI_BUDGET, lite.length);
  chk('и это не огрызок — хотя бы половина бюджета', lite.length > PREVIEW_TRI_BUDGET*0.25, lite.length);
  const a = bb(t), b = bb(lite);
  const dmax = Math.max(Math.abs(a.x0-b.x0), Math.abs(a.x1-b.x1), Math.abs(a.y0-b.y0),
                        Math.abs(a.y1-b.y1), Math.abs(a.z0-b.z0), Math.abs(a.z1-b.z1));
  chk('габарит уцелел с точностью до клетки', dmax < 0.35, +dmax.toFixed(3));
  chk('объём уцелел в пределах процента',
      Math.abs(vol(lite) - vol(t))/vol(t) < 0.01, {было:+vol(t).toFixed(1), стало:+vol(lite).toFixed(1)});
  chk('повторный вызов отдаёт ТУ ЖЕ упрощённую сетку', displayTris(t) === lite);
  chk('исходную сетку упрощение не тронуло', t.length > PREVIEW_TRI_BUDGET, t.length);
}

console.log('=== экспорт в эту дверь не заходит ===');
{
  /* Главное свойство: `displayTris` врезан в `setMeshTrisGeometry`, а тот работает с Three.js. Если
     упрощение однажды переползёт в общий путь сборки, экспорт начнёт молча отдавать огрызок — поэтому
     проверяется буквально текст: в строителе и в выгрузке вызова быть не должно. */
  const src = typeof buildTrisForShape === 'function' ? buildTrisForShape.toString() : '';
  chk('строитель фигур упрощением не пользуется', src.indexOf('displayTris') < 0);
  const setter = setMeshTrisGeometry.toString();
  chk('а дверь в Three.js — пользуется', setter.indexOf('displayTris') >= 0);
}

console.log('=== потолок импорта и порог предупреждения ===');
{
  chk('потолок поднят до двух миллионов', MAX_IMPORT_TRIS === 2000000, MAX_IMPORT_TRIS);
  chk('порог предупреждения ниже потолка', HEAVY_IMPORT_TRIS < MAX_IMPORT_TRIS,
      [HEAVY_IMPORT_TRIS, MAX_IMPORT_TRIS]);
  // Обе присланные модели обязаны пролезать: ради них потолок и поднимали.
  for(const n of [1368170, 1800848])
    chk(n.toLocaleString('ru')+' треугольников проходит потолок', n <= MAX_IMPORT_TRIS);
  chk('но предупреждение на них срабатывает', 1368170 > HEAVY_IMPORT_TRIS);
}
console.log('=== TOTAL: ' + pass + ' passed, ' + fail + ' failed ===');
if(fail) process.exit(1);
