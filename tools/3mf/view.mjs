/* Снимок STL с трёх ракурсов. Three.js берётся ИЗ САМОГО ГЕНЕРАТОРА — она там уже лежит инлайном ради
   офлайновости страницы, и тащить вторую копию значило бы смотреть не тем движком, которым показывает
   страница. Загрузчик STL свой: r128 идёт без загрузчиков, а разобрать бинарный STL — двадцать строк.
   Запуск: node tools/3mf/view.mjs FILE.stl OUT.png [ширина] [высота] [X0 X1 Y0 Y1]

   Окно вырезается ПЛОСКОСТЯМИ ОТСЕЧЕНИЯ, а не выбрасыванием треугольников. Выбрасывать нельзя: у плиты
   дно — пара треугольников во всю деталь, и по любому признаку «попал ли в окно» они либо тянут кадр
   обратно к полному габариту, либо исчезают вместе с плитой, оставляя висеть одни станции. */
import { chromium } from '/tmp/claude-0/-home-user-STL-generator/4f14327a-0b0f-5dcc-bfdf-fc2e448c7233/scratchpad/node_modules/playwright/index.mjs';
import fs from 'fs';

const [stl, out, W = '1200', H = '440', ...win] = process.argv.slice(2);
const box = win.length === 4 ? win.map(Number) : null;
const html = fs.readFileSync('parametric-stl-generator.html', 'utf8');
const m = html.match(/<script>([\s\S]*?)<\/script>/);          // первый <script> — это инлайновая Three.js
const three = m[1];
const data = fs.readFileSync(stl).toString('base64');
const WIN = box ? JSON.stringify(box) : 'null';

const page = `<!doctype html><html><head><meta charset="utf-8"><style>
body{margin:0;background:#12161c;display:flex}canvas{display:block}</style></head><body>
<script>${three}<\/script>
<script>
const b64 = "${data}";
const bin = Uint8Array.from(atob(b64), c => c.charCodeAt(0));
const dv = new DataView(bin.buffer);
const n = dv.getUint32(80, true), pos = new Float32Array(n*9);
for(let i=0;i<n;i++){ const o = 84 + i*50;
  for(let v=0;v<3;v++) for(let k=0;k<3;k++) pos[i*9+v*3+k] = dv.getFloat32(o+12+v*12+k*4, true); }
const geo = new THREE.BufferGeometry();
geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
geo.computeVertexNormals(); geo.computeBoundingBox();
const bb = geo.boundingBox, c = bb.getCenter(new THREE.Vector3()), sz = bb.getSize(new THREE.Vector3());
geo.translate(-c.x, -c.y, -c.z);
const R = Math.max(sz.x, sz.y, sz.z);
// Z у 3MF — вверх, у сцены вверх Y: кладём деталь так, как она стоит на столе.
const win = ${WIN};
// Отсечение задаётся в координатах ДЕТАЛИ, а меш уже сдвинут в ноль и положен на бок, поэтому плоскости
// считаются от исходного центра и по осям сцены: X детали → X сцены, Y детали → −Z сцены.
const clip = [];
if (win){
  clip.push(new THREE.Plane(new THREE.Vector3( 1,0,0), -(win[0]-c.x)));
  clip.push(new THREE.Plane(new THREE.Vector3(-1,0,0),  (win[1]-c.x)));
  clip.push(new THREE.Plane(new THREE.Vector3(0,0,-1), -(win[2]-c.y)));
  clip.push(new THREE.Plane(new THREE.Vector3(0,0, 1),  (win[3]-c.y)));
}
const mat = new THREE.MeshPhongMaterial({color:0x9aa8b8, specular:0x202830, shininess:18,
  side:THREE.DoubleSide, clippingPlanes:clip, clipShadows:false});
const mesh = new THREE.Mesh(geo, mat);
mesh.rotation.x = -Math.PI/2;
const cw = win ? win[1]-win[0] : sz.x, cd = win ? win[3]-win[2] : sz.y;
const cx = win ? (win[0]+win[1])/2 - c.x : 0, cz = win ? -((win[2]+win[3])/2 - c.y) : 0;
const S = Math.max(cw, cd, sz.z) * 0.60;
const views = [[1.1,0.85,1.1], [0,1,0.0001], [0,0.16,1]];
const w = ${W}/views.length, h = ${H};
for(const [dx,dy,dz] of views){
  const sc = new THREE.Scene(); sc.background = new THREE.Color(0x11151a);
  sc.add(new THREE.HemisphereLight(0xdfe8f2, 0x1a2430, 0.55));
  const dl = new THREE.DirectionalLight(0xffffff, 0.85); dl.position.set(1.0,1.7,1.1); sc.add(dl);
  const dl2 = new THREE.DirectionalLight(0x9fc0e0, 0.30); dl2.position.set(-1.4,0.4,-1.1); sc.add(dl2);
  sc.add(mesh.clone());
  const cam = new THREE.OrthographicCamera(-S, S, S*h/w, -S*h/w, -R*8, R*8);
  cam.position.set(cx + dx*R, dy*R, cz + dz*R); cam.lookAt(cx, 0, cz);
  const rn = new THREE.WebGLRenderer({antialias:true});
  rn.localClippingEnabled = true;
  rn.setSize(w, h); rn.render(sc, cam); document.body.appendChild(rn.domElement);
}
document.title = 'ready';
<\/script></body></html>`;

const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
  args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
const pg = await browser.newPage({ viewport: { width: +W, height: +H } });
await pg.setContent(page, { waitUntil: 'load' });
await pg.waitForFunction(() => document.title === 'ready', null, { timeout: 30000 });
await pg.screenshot({ path: out });
await browser.close();
console.log('снимок: ' + out);
