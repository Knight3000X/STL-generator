// Сдвиг камеры (панорамирование) — ПКМ/СКМ на компьютере, два пальца на телефоне.
//
// The gesture wiring needs a canvas and cannot be run here, but the part that decides WHERE the view goes
// is pure arithmetic and is where panning actually goes wrong. Three things can be subtly off, and all
// three feel like "the controls are strange" rather than like a bug:
//   * the BASIS. Screen-right must be horizontal in the world at every camera elevation, or a sideways
//     drag lifts or sinks the model and panning swims as you orbit;
//   * the SCALE. It has to be proportional to the distance, or panning that feels right zoomed out
//     flings the model off screen zoomed in;
//   * the SIGNS. Dragging right must carry the SCENE right, which is the look-at point going left.
// Each is asserted directly. Run via ./run-all.sh.
let pass=0, fail=0;
function chk(n,c,e){if(c){pass++;console.log('  OK  ',n);}else{fail++;console.log('  FAIL',n,e!==undefined?JSON.stringify(e):'');}}
const near = (a,b,eps) => Math.abs(a-b) < (eps||1e-9);
const dot3v = (a,b) => a[0]*b[0] + a[1]*b[1] + a[2]*b[2];
const len3v = a => Math.hypot(a[0], a[1], a[2]);
const ANGLES = [];
for(const t of [0, 0.3, Math.PI/2, 2.1, Math.PI, 4.4, 5.9])
  for(const p of [0.07, 0.4, Math.PI/2, 2.2, Math.PI-0.07]) ANGLES.push([t,p]);
// The camera's own offset from the target, which is what the orbit places it at.
const eye = (t,p,d) => [d*Math.sin(p)*Math.sin(t), d*Math.cos(p), d*Math.sin(p)*Math.cos(t)];

console.log('=== базис ===');
for(const [t,p] of ANGLES){
  const R = orbitPanDelta(t, p, 100, 45, 600, -1, 0);   // drag left by 1px → target moves along screen-right
  const U = orbitPanDelta(t, p, 100, 45, 600,  0, 1);   // drag down by 1px → target moves along screen-up
  chk('θ='+t.toFixed(2)+' φ='+p.toFixed(2)+': горизонтальный сдвиг не поднимает точку взгляда',
      near(R[1], 0), R[1]);
  chk('θ='+t.toFixed(2)+' φ='+p.toFixed(2)+': оси экрана взаимно перпендикулярны',
      near(dot3v(R,U)/(len3v(R)*len3v(U)), 0, 1e-12), dot3v(R,U));
  // ...and both lie in the plane the camera is looking at: neither may push the target towards or away
  // from the camera, which would change the zoom while panning.
  const e = eye(t,p,100);
  chk('θ='+t.toFixed(2)+' φ='+p.toFixed(2)+': сдвиг не меняет удаления',
      near(dot3v(R,e)/(len3v(R)*100), 0, 1e-12) && near(dot3v(U,e)/(len3v(U)*100), 0, 1e-12),
      [dot3v(R,e), dot3v(U,e)]);
  chk('θ='+t.toFixed(2)+' φ='+p.toFixed(2)+': оси единичной длины после деления на масштаб',
      near(len3v(R)/len3v(U), 1, 1e-12), len3v(R)/len3v(U));
}
{ // the closed form the code leans on, stated once so it cannot drift: screen-right has no φ in it
  const a = orbitPanDelta(1.1, 0.3, 100, 45, 600, 1, 0), b = orbitPanDelta(1.1, 2.6, 100, 45, 600, 1, 0);
  chk('горизонтальная ось не зависит от высоты камеры',
      near(a[0],b[0]) && near(a[1],b[1]) && near(a[2],b[2]), [a,b]);
}

console.log('=== масштаб ===');
{
  const one = orbitPanDelta(0.7, 1.0, 100, 45, 600, 10, 0);
  for(const d of [1, 25, 400, 9000]){
    const s = orbitPanDelta(0.7, 1.0, d, 45, 600, 10, 0);
    chk('d='+d+': сдвиг пропорционален удалению', near(len3v(s), len3v(one)*d/100, 1e-9*d+1e-9),
        {got:len3v(s), want:len3v(one)*d/100}); }
  // A drag of the full viewport height moves the target by exactly the world height the camera shows at
  // the target's own depth — that is what makes "grab and drag" land where the finger says.
  for(const fov of [20, 45, 75]) for(const h of [400, 600, 1400]){
    const full = orbitPanDelta(0.7, 1.0, 250, fov, h, 0, h);
    chk('fov='+fov+' h='+h+': протяжка на всю высоту = видимой высоте',
        near(len3v(full), 2*250*Math.tan(fov*Math.PI/360), 1e-9), len3v(full)); }
  chk('нулевая протяжка ничего не двигает', len3v(orbitPanDelta(0.7,1.0,100,45,600,0,0)) === 0);
  chk('нулевая высота окна не роняет', isFinite(len3v(orbitPanDelta(0.7,1.0,100,45,0,5,5))));
  // linear and additive: two drags equal one drag of the sum, or the scene lags behind the finger
  const a = orbitPanDelta(0.7,1.0,100,45,600, 7, 3), b = orbitPanDelta(0.7,1.0,100,45,600, 5, 11);
  const both = orbitPanDelta(0.7,1.0,100,45,600, 12, 14);
  chk('складывается', near(a[0]+b[0], both[0]) && near(a[1]+b[1], both[1]) && near(a[2]+b[2], both[2]));
}

console.log('=== знаки: сцена идёт за пальцем ===');
// Camera at θ=0, φ=π/2: it sits on +Z looking towards −Z, so world +X is to the right of the screen and
// world +Y is up. Every sign can be read off directly there.
{
  const right = orbitPanDelta(0, Math.PI/2, 100, 45, 600, 20, 0);
  chk('тянем вправо — точка взгляда уходит влево', right[0] < 0 && near(right[1],0) && near(right[2],0), right);
  const down = orbitPanDelta(0, Math.PI/2, 100, 45, 600, 0, 20);
  chk('тянем вниз — точка взгляда уходит вверх', down[1] > 0 && near(down[0],0) && near(down[2],0), down);
  const up = orbitPanDelta(0, Math.PI/2, 100, 45, 600, 0, -20);
  chk('тянем вверх — вниз', up[1] < 0, up);
  const left = orbitPanDelta(0, Math.PI/2, 100, 45, 600, -20, 0);
  chk('тянем влево — вправо', left[0] > 0, left);
  chk('противоположные протяжки гасят друг друга',
      near(right[0]+left[0], 0) && near(down[1]+up[1], 0));
}
{ // turned a quarter turn (camera on +X), screen-right becomes world −Z: the same drag, a different world
  const r = orbitPanDelta(Math.PI/2, Math.PI/2, 100, 45, 600, 20, 0);
  chk('камера сбоку: вправо — это уже другая ось мира', r[2] > 0 && near(r[0], 0, 1e-12), r);
}
{ // looking almost straight down (φ→0): screen-up becomes a horizontal world direction, and screen-right
  // stays horizontal — the case where a basis built from the wrong vectors degenerates
  const u = orbitPanDelta(0.9, 0.07, 100, 45, 600, 0, 10);
  chk('вид почти сверху: сдвиг остаётся конечным и почти горизонтальным',
      isFinite(len3v(u)) && len3v(u) > 0 && Math.abs(u[1])/len3v(u) < 0.08, u);
}

console.log('=== TOTAL: ' + pass + ' passed, ' + fail + ' failed ===');
if(fail) process.exit(1);
