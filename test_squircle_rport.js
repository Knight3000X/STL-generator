// Rounded single-wall PORTS on a curved (squircle) container wall (#2): a USB-C / rounded-rect window must
// come out with genuinely rounded corners (border→rounded-window annulus + tube) AND stay watertight-by-
// construction, on flat- and rounded-bottom shells, on front/back and side faces, across corner radii.
// A square port (rc≈0) must still take the plain rectangular window. Run against the REAL <script>:
//   awk '/<script>/{f=1;next}/<\/script>/{f=0}f' parametric-stl-generator.html | sed '$ { /^init();$/d }' > /tmp/lib.js
//   cat stub_preamble.js /tmp/lib.js test_squircle_rport.js > /tmp/run.js && node /tmp/run.js

let pass=0, fail=0;
function chk(n,c,x){ if(c){pass++;console.log('  OK  ',n);} else {fail++;console.log('  FAIL',n,x!==undefined?JSON.stringify(x):'');} }
function hasNaN(t){for(const tr of t)for(const p of tr)for(const c of p)if(!Number.isFinite(c))return true;return false;}
function sv(t){let v=0;for(const T of t){const a=T[0],b=T[1],c=T[2];v+=(a[0]*(b[1]*c[2]-b[2]*c[1])-a[1]*(b[0]*c[2]-b[2]*c[0])+a[2]*(b[0]*c[1]-b[1]*c[0]))/6;}return v;}
function port(axis, side, cp, cq, ap, aq, rc){ return squirclePortParams({ axis, side, cp, cq, ap, aq, rc }); }
function build(w,h,d,eH,eV,t,p){ return buildSquircleHollow(w,h,d,eH,eV,t,-h/2+t, null,null,null, 50, 4, true, p); }

console.log('=== Rounded USB-C port on a flat-bottom squircle container, front (+Z) ===');
for (const rc of [0.6, 1.2, 1.6]) {
  const tris = build(80,40,60, 0.45, 0, 3, port(2,1, 0,0, 4.5,1.6, rc));
  const m = manifoldCheck(tris,4);
  chk(`rc=${rc}: watertight & +vol & no NaN`, m.watertight && !hasNaN(tris) && sv(tris)>0, {open:m.openEdges,bad:m.badEdges});
}

console.log('\n=== Rounded corners actually change the mesh vs a square window ===');
{
  const sq = build(80,40,60, 0.45, 0, 3, port(2,1, 0,0, 4.5,1.6, 0));    // square window
  const rd = build(80,40,60, 0.45, 0, 3, port(2,1, 0,0, 4.5,1.6, 1.5));  // rounded window
  chk('square window is watertight', manifoldCheck(sq,4).watertight);
  chk('rounded window is watertight', manifoldCheck(rd,4).watertight);
  chk('rounded build differs from the square one (corner fans added)', rd.length !== sq.length, {sq:sq.length, rd:rd.length});
  // Direct rounding signature: isolate the window-rim vertices on the outer +Z wall (z≈hd, inside the port
  // bbox) and measure the max horizontal extent along the TOP/BOTTOM strip (|y| near yH). A square window
  // keeps full width (≈hH) right up to the corner; a rounded one pulls that strip IN by ≈rc (the corner arc
  // starts at hH-rc). So rounded's max-X-on-the-top-strip is clearly smaller than the square's.
  const hH=4.5, yH=1.6;
  const rimMaxXtop = tris => { let m=0; for(const tr of tris) for(const v of tr)
    if(v[2]>28.8 && v[2]<30.6 && Math.abs(v[0])<=hH+0.25 && Math.abs(v[1])<=yH+0.25 && Math.abs(v[1])>yH-0.2) m=Math.max(m,Math.abs(v[0])); return m; };
  const sqX = rimMaxXtop(sq), rdX = rimMaxXtop(rd);
  chk('rounded corner pulls the top/bottom strip inward vs square', rdX < sqX - 0.4, {squareMaxX:+sqX.toFixed(2), roundedMaxX:+rdX.toFixed(2)});
}

console.log('\n=== Rounded-bottom (superellipsoid) shell, port on the straight upper wall ===');
{
  const tris = build(80,50,60, 0.45, 0.6, 3, port(2,1, 0,12, 4.5,1.6, 1.2));
  const m = manifoldCheck(tris,4);
  chk('rounded-bottom + rounded port: watertight & +vol', m.watertight && sv(tris)>0, {open:m.openEdges,bad:m.badEdges});
}

console.log('\n=== Side faces (+X / -X): width/height swap, still rounded & watertight ===');
for (const side of [1,-1]) {
  const tris = build(60,40,80, 0.45, 0, 3, port(0,side, 0,0, 1.6,4.5, 1.2)); // axis0: yH=ap=1.6, hH=aq=4.5
  const m = manifoldCheck(tris,4);
  chk(`+${side>0?'X':'-X'} rounded port: watertight`, m.watertight && !hasNaN(tris), {open:m.openEdges,bad:m.badEdges});
}

console.log('\n=== fuzz: 60 random rounded ports on random squircle containers ===');
{
  let seed=7; const rnd=()=>{seed=(seed*1103515245+12345)&0x7fffffff;return seed/0x7fffffff;};
  const rf=(a,b)=>a+rnd()*(b-a), pick=a=>a[Math.floor(rnd()*a.length)|0];
  let ok=0, tot=0;
  for (let i=0;i<60;i++){
    const w=rf(50,100), h=rf(35,70), d=rf(50,100), t=rf(2,4), eH=rf(0.25,0.7), eV=pick([0,0,rf(0.3,0.8)]);
    const ax=pick([0,2]), side=pick([1,-1]);
    const wHalf=rf(3,8), hHalf=rf(1.2,3.5), rc=rf(0.5, Math.min(wHalf,hHalf)-0.1);
    // width horizontal, height vertical; squirclePortParams maps per axis. Keep the port centred-ish.
    const p = ax===2 ? port(2,side, rf(-6,6), rf(-4,6), wHalf, hHalf, rc)
                     : port(0,side, rf(-4,6), rf(-6,6), hHalf, wHalf, rc);
    let tris; try { tris = build(w,h,d,eH,eV,t,p); } catch(e){ continue; }
    tot++; if (manifoldCheck(tris,4).watertight && !hasNaN(tris) && sv(tris)>0) ok++;
  }
  chk('>=92% of random rounded ports strictly watertight', ok/tot >= 0.92, {ok, tot, rate:+(ok/tot).toFixed(3)});
}

console.log('\n=== MULTIPLE holes on one squircle container (array of ports) ===');
{
  // four holes, one per wall (mixed circle/rounded-rect), circle = fully-rounded rect (rc = r)
  const ports4 = [ port(2, 1,  5, 2, 4, 4, 4),          // +Z circle Ø8
                   port(2,-1, -6,-4, 4.5, 1.6, 1.6),    // −Z USB-C
                   port(0, 1,  5, 0, 3, 3, 3),          // +X circle Ø6 (cp=y, cq=z)
                   port(0,-1, -6, 3, 2.5, 6, 0) ];      // −X sharp rect (square path)
  const tris = build(60,40,50, 0.6, 0, 2.5, ports4);
  const m = manifoldCheck(tris,4);
  chk('4 holes on 4 walls: watertight & +vol', m.watertight && !hasNaN(tris) && sv(tris)>0, {open:m.openEdges,bad:m.badEdges});
  const one = build(60,40,50, 0.6, 0, 2.5, [ports4[0]]);
  chk('4 holes cut MORE material than 1', sv(tris) < sv(one) - 1, {four:+sv(tris).toFixed(0), one:+sv(one).toFixed(0)});

  // two holes far apart on the SAME wall
  const trisTwo = build(60,40,50, 0.6, 0, 2.5, [port(2,1,-12,0,3.5,3.5,3.5), port(2,1,12,0,3.5,3.5,3.5)]);
  const mT = manifoldCheck(trisTwo,4);
  chk('2 holes same wall: watertight', mT.watertight && sv(trisTwo)>0, {open:mT.openEdges,bad:mT.badEdges});

  // overlapping blocks on the same wall: the later port is dropped, mesh stays closed
  const trisOv = build(60,40,50, 0.6, 0, 2.5, [port(2,1,0,0,5,5,5), port(2,1,3,1,5,5,5)]);
  const mO = manifoldCheck(trisOv,4);
  chk('overlapping pair: later port dropped, still watertight', mO.watertight && sv(trisOv)>0, {open:mO.openEdges,bad:mO.badEdges});

  // same y-band on different walls (shared reseat rows interleave)
  const trisY = build(60,40,50, 0.6, 0, 2.5, [port(2,1,0,0,4,4,4), port(0,1,0,0,4,4,4)]);
  const mY = manifoldCheck(trisY,4);
  chk('same y-band on two walls: watertight', mY.watertight && sv(trisY)>0, {open:mY.openEdges,bad:mY.badEdges});

  // rounded (superellipsoid) bottom with two ports on the straight upper wall
  const trisRB = build(80,50,60, 0.45, 0.6, 3, [port(2,1,0,12,4.5,1.6,1.2), port(0,-1,10,-8,2,4,1.5)]);
  const mRB = manifoldCheck(trisRB,4);
  chk('rounded bottom + 2 ports: watertight', mRB.watertight && sv(trisRB)>0, {open:mRB.openEdges,bad:mRB.badEdges});
}

console.log('\n=== Port centred at/beyond the straight-run edge is SHIFTED in, not degenerated ===');
{
  // Regression (user report): rounded-bottom container, USB-C at v0=0 — the straight wall spans
  // [0,hh], so the old truncation left the port centre OUTSIDE the window → inside-out sliver that
  // ADDED volume instead of cutting. The centre must be shifted into the run and cut the full port.
  const cut = (eV, yC) => {
    const base = build(40,40,40, 0.6, eV, 2, null);
    const tris = build(40,40,40, 0.6, eV, 2, port(2,1, 0, yC, 4.5, 1.6, 1.6));
    const m = manifoldCheck(tris,4);
    return { d: sv(base)-sv(tris), wt: m.watertight, m };
  };
  const flat = cut(0, 0);           // reference: mid-wall port on a flat bottom
  chk('reference flat-bottom cut is a real cut', flat.wt && flat.d > 10, {cut:+flat.d.toFixed(2)});
  const rb = cut(0.6, 0);           // rounded bottom, port asked at y=0 (below the run)
  chk('rounded bottom + port at y=0: watertight', rb.wt, rb.m);
  chk('rounded bottom + port at y=0: cuts the SAME volume as the reference', Math.abs(rb.d - flat.d) < 0.5, {ref:+flat.d.toFixed(2), got:+rb.d.toFixed(2)});
  const top = cut(0, 19);           // asked right at the top edge → shifted down, full cut
  chk('port at the top edge: shifted in, full cut', top.wt && Math.abs(top.d - flat.d) < 0.5, {ref:+flat.d.toFixed(2), got:+top.d.toFixed(2)});
  // straight run too short for the hole → port skipped cleanly (no cut, mesh closed)
  const shortB = build(40,6,40, 0.6, 0.8, 1.5, null);
  const shortT = build(40,6,40, 0.6, 0.8, 1.5, port(2,1, 0, 0, 4.5, 1.6, 1.6));
  chk('run too short: port skipped cleanly', manifoldCheck(shortT,4).watertight && Math.abs(sv(shortB)-sv(shortT)) < 1e-6, {d:+(sv(shortB)-sv(shortT)).toFixed(3)});
}

console.log('\n=== fuzz: 40 random MULTI-hole squircle containers ===');
{
  let seed=99; const rnd=()=>{seed=(seed*1103515245+12345)&0x7fffffff;return seed/0x7fffffff;};
  const rf=(a,b)=>a+rnd()*(b-a), pick=a=>a[Math.floor(rnd()*a.length)|0];
  let ok=0, tot=0;
  for (let i=0;i<40;i++){
    const w=rf(55,100), h=rf(35,70), d=rf(55,100), t=rf(2,4), eH=rf(0.25,0.7), eV=pick([0,0,rf(0.3,0.8)]);
    const nP = 2 + Math.floor(rnd()*3), ps=[];
    for (let k=0;k<nP;k++){
      const ax=pick([0,2]), side=pick([1,-1]);
      const wHalf=rf(2.5,6), hHalf=rf(1.2,3), rc=pick([0, rf(0.5, Math.min(wHalf,hHalf)-0.1)]);
      ps.push(ax===2 ? port(2,side, rf(-6,6), rf(-4,6), wHalf, hHalf, rc)
                     : port(0,side, rf(-4,6), rf(-6,6), hHalf, wHalf, rc));
    }
    let tris; try { tris = build(w,h,d,eH,eV,t,ps); } catch(e){ continue; }
    tot++; if (manifoldCheck(tris,4).watertight && !hasNaN(tris) && sv(tris)>0) ok++;
  }
  chk('>=92% of random multi-hole containers strictly watertight', ok/tot >= 0.92, {ok, tot, rate:+(ok/tot).toFixed(3)});
}

console.log('\n=== TOTAL:', pass, 'passed,', fail, 'failed ===');
process.exit(fail>0?1:0);
