// Панель не должна дёргаться от появления полосы прокрутки.
//
// The panel has a FIXED width. When its content grows past the viewport a scrollbar appears, and a classic
// (non-overlay) scrollbar takes its width OUT OF THE CONTENT BOX — so every row inside re-flows. Open one
// group and the whole panel jumps sideways; close it and it jumps back. It happens on desktop and on
// Android alike, and reads as the page being unfinished more loudly than anything it is actually doing.
//
// The fix is `scrollbar-gutter: stable`: the space is reserved whether or not there is anything to scroll,
// so the content box no longer depends on how much content there is. It costs 8 px once.
//
// WHAT THIS FILE CAN AND CANNOT CHECK. It cannot measure a layout — there is no browser in the battery.
// What it can do is state the invariant over the STYLESHEET, and that turns out to be the useful half:
// the defect is not «the panel is wrong», it is «a container scrolls and nobody reserved its gutter», and
// that is a property of the CSS, checkable by reading it. Every scrolling container has to answer for
// itself, so adding a second scrolling pane later cannot quietly reintroduce the same jump.
//
// (Measured separately in headless Chromium: with the rule the panel's clientWidth is 363 px whether or
// not it overflows; without it the width depends on the content. Headless uses OVERLAY scrollbars, so the
// original jump does not reproduce there — which is precisely why the check lives here and not in a
// screenshot comparison that would pass on a machine where the bug cannot happen.)
//
// Run via ./run-all.sh (reads the page source itself).
let pass=0, fail=0;
function chk(n,c,e){if(c){pass++;console.log('  OK  ',n);}else{fail++;console.log('  FAIL',n,e!==undefined?JSON.stringify(e):'');}}

const fs = require('fs');
const HTML = fs.readFileSync('parametric-stl-generator.html', 'utf8');
// The page's own stylesheet — the LAST <style>, since the first carries the inlined fonts.
const i = HTML.lastIndexOf('<style>'), j = HTML.indexOf('</style>', i);
const CSS = HTML.slice(i + 7, j);

// Split into rules. Comments are stripped FIRST — leaving them in makes the selector of the rule that
// follows a comment read as «/* ---- panel ---- */ #panel», which matches nothing and quietly excuses the
// very rule under test. And @media wrappers are unwrapped rather than skipped: the panel has a second
// rule inside one, and a stylesheet where half the rules are invisible to the check is worse than none.
function rules(css){
  const flat = css.replace(/\/\*[\s\S]*?\*\//g, '').replace(/@media[^{]*\{/g, '');
  const out = [];
  const re = /([^{}]+)\{([^{}]*)\}/g;
  let m;
  while ((m = re.exec(flat))){
    const sel = m[1].trim().replace(/\s+/g, ' ');
    if (sel) out.push({sel, body: m[2]});
  }
  return out;
}
const R = rules(CSS);
const allWithSel = s => R.filter(r => r.sel === s);
const decl = (body, prop) => {
  const m = new RegExp('(?:^|;)\\s*' + prop + '\\s*:\\s*([^;]+)').exec(body);
  return m ? m[1].trim() : null;
};

console.log('=== таблица стилей читается ===');
{
  chk('правила нашлись', R.length > 100, R.length);
  chk('и среди них есть панель', R.some(r => /(^|,)\s*#panel\b/.test(r.sel)));
}

console.log('=== у каждого прокручиваемого контейнера зарезервирован жёлоб ===');
{
  // Anything that can grow a scrollbar: overflow / overflow-y set to auto or scroll. `hidden` cannot
  // scroll and `visible` cannot either, so neither is asked to reserve anything.
  const scrollers = R.filter(r => {
    for (const p of ['overflow', 'overflow-y']){
      const v = decl(r.body, p);
      if (v && /\b(auto|scroll)\b/.test(v)) return true;
    }
    return false;
  });
  chk('прокручиваемые контейнеры найдены', scrollers.length >= 1, scrollers.map(r => r.sel));
  for (const r of scrollers){
    const g = decl(r.body, 'scrollbar-gutter');
    chk('«' + r.sel + '» резервирует место под полосу', !!g && /stable/.test(g), g);
    // `both-edges` would pad the left as well and the panel would stop lining up with its own title
    // block. The gutter is on the scrolling edge only, on purpose.
    chk('«' + r.sel + '» — только со стороны полосы, не с обеих',
        !!g && !/both-edges/.test(g), g);
  }
}

console.log('=== ширина панели задана один раз и в одном месте ===');
{
  // The jump was only visible BECAUSE the width is fixed: a fluid panel would have absorbed the scrollbar.
  // So the two facts belong together, and if the width ever stops being fixed this check says so rather
  // than leaving a reserved gutter nobody needs.
  // There are TWO #panel rules: the desktop one and a mobile override inside a media query. The width is
  // fixed on the desktop side — which is what made the jump visible there — and fluid on mobile, where the
  // scrollbar still takes its width out of a 100 % box. So the width is checked where it is fixed, and the
  // gutter is required of the rule that declares the scrolling.
  const panels = allWithSel('#panel');
  chk('правил для панели два: настольное и мобильное', panels.length === 2, panels.length);
  const scrolling = panels.find(r => /\b(auto|scroll)\b/.test(decl(r.body, 'overflow-y') || ''));
  chk('прокрутку объявляет одно из них', !!scrolling);
  const w = scrolling && decl(scrolling.body, 'width');
  const mw = scrolling && decl(scrolling.body, 'min-width');
  chk('у него фиксированная ширина', !!w && /^\d+px$/.test(w), w);
  chk('и min-width её подпирает', !!mw && mw === w, [w, mw]);
  chk('поэтому полоса и съедала содержимое — жёлоб на месте',
      !!scrolling && /stable/.test(decl(scrolling.body, 'scrollbar-gutter') || ''),
      scrolling && decl(scrolling.body, 'scrollbar-gutter'));
  // ...and the mobile override must not take the gutter away again
  const mobile = panels.find(r => r !== scrolling);
  chk('мобильное правило жёлоб не отменяет',
      !mobile || !/scrollbar-gutter/.test(mobile.body), mobile && mobile.body.slice(0,80));
  // ...and the scrollbar is a CLASSIC one here (its width is styled), which is what takes layout space.
  const bar = R.find(r => /#panel::-webkit-scrollbar\b/.test(r.sel));
  chk('полоса стилизована, то есть не накладная', !!bar, bar && bar.sel);
  chk('и её ширина названа', !!bar && !!decl(bar.body, 'width'), bar && decl(bar.body, 'width'));
}

console.log('=== TOTAL: ' + pass + ' passed, ' + fail + ' failed ===');
if(fail) process.exit(1);
