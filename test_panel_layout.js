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

console.log('=== высота страницы на телефоне ===');
{
  /* `100vh` is defined as the viewport with the browser's bars HIDDEN. A phone lays the page out with it
     while the bars are still on screen, so the body comes out taller than what can be seen — and since
     the body does not scroll, the bottom of the panel is unreachable until something forces a re-layout.
     Switching apps and back is such a thing, which is why «сворачивание и разворачивание решают проблему».

     `dvh` is that height as it actually is. Both lines have to be there and IN THAT ORDER: the vh one is
     the fallback for anything that does not know dvh, and a browser that does know it takes the later
     declaration. One without the other is either the bug or a blank page on an old browser. */
  const pairOK = (r, unit) => {
    if (!r) return false;
    const hs = [...r.body.matchAll(/height\s*:\s*([^;]+)/g)].map(m => m[1].trim());
    const iv = hs.findIndex(v => v.endsWith(unit + 'vh'));
    const id = hs.findIndex(v => v.endsWith(unit + 'dvh'));
    return iv >= 0 && id > iv;
  };
  // the body has two rules — the reset (`html,body{height:100%}`) and its own; the one that names the
  // viewport height is the one under test
  const body = R.find(r => /(^|,)\s*body\s*$/.test(r.sel) && /100vh/.test(r.body));
  chk('высота body объявлена', !!body, body && body.body.slice(0, 60));
  chk('и это dvh поверх vh, а не один vh', pairOK(body, '100'), body && body.body.slice(0, 120));
  const vp = R.find(r => /#viewport-wrap/.test(r.sel) && /height\s*:/.test(r.body));
  chk('высота превью на телефоне объявлена', !!vp, vp && vp.body.slice(0, 60));
  chk('и она тоже в dvh поверх vh', pairOK(vp, '46'), vp && vp.body.slice(0, 120));
}

console.log('=== ни один заголовок раздела не встречается дважды ===');
{
  /* Группа параметров получает свой аккордеон автоматически, по имени. Но у некоторых групп место на
     странице уже НАПИСАНО разметкой — у «Логотипов» там карточки, кнопки загрузки и справка. Тогда
     генератор делал ВТОРОЙ раздел с тем же самым заголовком, свёрнутый, и складывал строки туда.

     Чем это кончается, известно поимённо: переключатель «Цветная печать логотипа (AMS)» лежал во втором
     разделе, пользователь открывал первый, не находил его и сообщал, что цветной печати на подставке
     нет. Она была; не было способа её найти.

     Проверяется по разметке, потому что это свойство разметки: имя, объявленное статическим разделом
     (`data-relkey`), обязано быть либо не групповым вовсе, либо иметь у себя место для строк
     (`data-hostgroup`) — тогда второй раздел не создаётся. Браузер для этого не нужен. */
  const attr = (re) => { const out = new Set(); let m;
    while ((m = re.exec(HTML))) out.add(m[1]); return out; };
  const relkeys = attr(/data-relkey="([^"]+)"/g);
  const hosts   = attr(/data-hostgroup="([^"]+)"/g);
  const groups  = new Set();
  for (const m of HTML.matchAll(/\{group:'([^']+)'/g)) groups.add(m[1]);
  chk('группы параметров нашлись', groups.size > 20, groups.size);
  chk('статические разделы нашлись', relkeys.size > 3, [...relkeys].slice(0,4));
  // имя, которое есть И у статического раздела, И среди групп параметров, обязано иметь хост
  const clash = [...relkeys].filter(k => groups.has(k) && !hosts.has(k));
  chk('у каждого статического раздела, совпадающего с группой, есть место для её строк',
      clash.length === 0, clash);
  // и наоборот: хост без такой группы — мёртвая разметка
  const orphan = [...hosts].filter(k => !groups.has(k));
  chk('и нет мест для строк, которых не существует', orphan.length === 0, orphan);
  // сам переключатель цветной печати обязан жить в группе, у которой есть это место
  chk('строка цветной печати попадёт к карточкам логотипов',
      /\{group:'Логотипы \(рельеф на гранях\)', key:'logoAms'/.test(HTML) &&
      hosts.has('Логотипы (рельеф на гранях)'));
  /* Атрибут сам по себе ничего не делает — по нему должно приниматься РЕШЕНИЕ. Само решение вынесено из
     обхода DOM в `paramGroupHostName` именно затем, чтобы его можно было спросить здесь: панель батарея
     построить не может, а функцию — может. (Что панель после этого действительно одна, а «+ Цвет 1 (AMS)»
     включается и создаёт деталь, проверено отдельно в headless Chromium.) */
  const hostList = [...hosts];
  for (const g of hostList)
    chk('строки «'+g+'» уходят в готовое место, а не во второй раздел',
        paramGroupHostName(g, hostList) === g, paramGroupHostName(g, hostList));
  chk('а группа без готового места заводит свой раздел',
      paramGroupHostName('Размеры', hostList) === null, paramGroupHostName('Размеры', hostList));
}

console.log('=== TOTAL: ' + pass + ' passed, ' + fail + ' failed ===');
if(fail) process.exit(1);
