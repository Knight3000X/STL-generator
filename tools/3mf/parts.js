// Общее для всех разборщиков. Подключается конкатенацией, поэтому просто объявления.
const fs = require('fs');
function loadParts(path){
  return parseMeshFileParts(fs.readFileSync(path).buffer, path);
}
/* Карта высот сверху: для каждой клетки (X, Y) — наибольшая Z. Растеризацией по треугольникам, а не
   лучом на клетку: у присланных плит бывает 600 тыс. треугольников против 20 тыс. клеток, и перебор
   «каждый треугольник для каждой клетки» тут на три порядка дороже. */
function heightMap(tris, step){
  let x0=1e9,x1=-1e9,y0=1e9,y1=-1e9;
  for(const T of tris) for(const v of T){
    if(v[0]<x0)x0=v[0]; if(v[0]>x1)x1=v[0]; if(v[1]<y0)y0=v[1]; if(v[1]>y1)y1=v[1]; }
  const NX=Math.max(1,Math.ceil((x1-x0)/step)), NY=Math.max(1,Math.ceil((y1-y0)/step));
  const g=new Float32Array(NX*NY).fill(-1e9);
  for(const T of tris){ const A=T[0],B=T[1],C=T[2];
    const ar=(B[0]-A[0])*(C[1]-A[1])-(B[1]-A[1])*(C[0]-A[0]); if(Math.abs(ar)<1e-12) continue;
    const bx0=Math.max(0,Math.floor((Math.min(A[0],B[0],C[0])-x0)/step)),
          bx1=Math.min(NX-1,Math.ceil((Math.max(A[0],B[0],C[0])-x0)/step)),
          by0=Math.max(0,Math.floor((Math.min(A[1],B[1],C[1])-y0)/step)),
          by1=Math.min(NY-1,Math.ceil((Math.max(A[1],B[1],C[1])-y0)/step));
    for(let i=bx0;i<=bx1;i++) for(let j=by0;j<=by1;j++){
      const x=x0+(i+0.5)*step, y=y0+(j+0.5)*step;
      const w1=((B[0]-x)*(C[1]-y)-(B[1]-y)*(C[0]-x))/ar,
            w2=((C[0]-x)*(A[1]-y)-(C[1]-y)*(A[0]-x))/ar, w3=1-w1-w2;
      if(w1<-1e-9||w2<-1e-9||w3<-1e-9) continue;
      const z=w1*A[2]+w2*B[2]+w3*C[2], k=j*NX+i; if(z>g[k]) g[k]=z; }
  }
  return {g:g, x0:x0, y0:y0, x1:x1, y1:y1, step:step, NX:NX, NY:NY};
}
// Верх плиты = САМАЯ ЧАСТАЯ высота. Не средняя и не медиана: у плиты с высокими станциями среднее уезжает
// вверх, а мода стоит там, где стоит ровное поле, — то есть на плите.
function plateTop(m){
  const h = new Map();
  for(const v of m.g) if(v>-1e8){ const k=Math.round(v*20); h.set(k,(h.get(k)||0)+1); }
  let bk=0,bn=-1; for(const [k,n] of h) if(n>bn){ bn=n; bk=k; }
  return bk/20;
}
// Связные области карты, где высота удовлетворяет `pred`. Так находятся станции раскладки.
function blobs(m, pred){
  const {g,NX,NY}=m, seen=new Uint8Array(NX*NY), out=[];
  for(let s=0;s<NX*NY;s++){
    if(seen[s]||!pred(g[s])) continue;
    const st=[s]; seen[s]=1; let i0=1e9,i1=-1e9,j0=1e9,j1=-1e9,hi=-1e9,lo=1e9,n=0;
    while(st.length){ const k=st.pop(), i=k%NX, j=(k-i)/NX; n++;
      if(i<i0)i0=i; if(i>i1)i1=i; if(j<j0)j0=j; if(j>j1)j1=j;
      if(g[k]>hi)hi=g[k]; if(g[k]<lo)lo=g[k];
      for(const q of [i>0?k-1:-1, i<NX-1?k+1:-1, j>0?k-NX:-1, j<NY-1?k+NX:-1])
        if(q>=0 && !seen[q] && pred(g[q])){ seen[q]=1; st.push(q); } }
    out.push({n:n, cx:m.x0+((i0+i1)/2+0.5)*m.step, cy:m.y0+((j0+j1)/2+0.5)*m.step,
              w:(i1-i0+1)*m.step, d:(j1-j0+1)*m.step, hi:hi, lo:lo, area:n*m.step*m.step,
              edge:(i0===0||j0===0||i1===NX-1||j1===NY-1)});
  }
  return out;
}
loadParts(process.argv[2]).then(parts => {
  let tot = 0; for(const p of parts) tot += p.tris.length;
  console.log('деталей: '+parts.length+', треугольников: '+tot);
  parts.forEach((p, i) => { const b = computeBBox(p.tris);
    console.log(String(i).padStart(3)+'  '+String(p.tris.length).padStart(8)+' тр.  '+
      ((b.maxX-b.minX).toFixed(1)+'×'+(b.maxY-b.minY).toFixed(1)+'×'+(b.maxZ-b.minZ).toFixed(1)).padStart(22)+
      '  (X×Y×Z, вверх — Z)  '+(p.name||'(без имени)')); });
}).catch(e => { console.error('не разобралось:', e.message); process.exitCode = 1; });
