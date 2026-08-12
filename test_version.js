// Номер версии считается из реестра, а не набирается руками.
//
// A version anyone can type says nothing. This one is arithmetic over VERSION.md, where every commit in
// the project is filed under one of three headings, and the rule for the headings is the user's:
//
//   мажорный — новая БАЗОВАЯ ФОРМА (подстаканник, воронка, шестерня);
//   минорный — новая разновидность формы или отдельная возможность;
//   патч     — доработки и исправления.
//
// Two things are checked, and only the second is interesting. The first is that the ledger adds up: each
// row's version must follow from the previous one and its own heading, and the last row must be what the
// application shows. The second ties the ledger to the CODE — under this rule the major digit is not a
// tally of releases, it is a COUNT OF BASE SHAPES, so it has to equal the number of base shapes the app
// actually has. A ledger that has drifted from the code has stopped being a ledger and become a number.
//
// Run via ./run-all.sh (extraction test — it reads VERSION.md from the repo root itself).
let pass=0, fail=0;
function chk(n,c,e){if(c){pass++;console.log('  OK  ',n);}else{fail++;console.log('  FAIL',n,e!==undefined?JSON.stringify(e):'');}}

const fs = require('fs');
const LEDGER = fs.readFileSync('VERSION.md', 'utf8');
const KIND = {'мажорный':'major', 'минорный':'minor', 'патч':'patch'};
// Rows look like: | 273 | `5e746a1` | патч | **16.3.1** | v193: оформление страницы |
const rows = [];
for (const line of LEDGER.split('\n')){
  const m = /^\|\s*(\d+)\s*\|\s*`([^`]+)`\s*\|\s*(мажорный|минорный|патч)\s*\|\s*\*\*(\d+\.\d+\.\d+)\*\*\s*\|\s*(.*?)\s*\|$/.exec(line);
  if (m) rows.push({n:+m[1], hash:m[2], kind:KIND[m[3]], version:m[4], subject:m[5]});
}

console.log('=== реестр читается и он не пуст ===');
{
  chk('строки нашлись', rows.length > 200, rows.length);
  chk('нумерация сплошная', rows.every((r,i) => r.n === i+1),
      rows.findIndex((r,i) => r.n !== i+1));
  chk('у каждой строки есть, что сделано', rows.every(r => r.subject.length > 5),
      (rows.find(r => r.subject.length <= 5)||{}).n);
  chk('разряды только из трёх известных', rows.every(r => !!r.kind));
  // the ledger has to describe THIS build, or it describes some other one
  chk('последняя строка — сборка, которая ещё не в истории',
      rows[rows.length-1].hash.indexOf('эта сборка') >= 0, rows[rows.length-1].hash);
  chk('у всех остальных настоящие хеши',
      rows.slice(0,-1).every(r => /^[0-9a-f]{7,40}$/.test(r.hash)),
      (rows.slice(0,-1).find(r => !/^[0-9a-f]{7,40}$/.test(r.hash))||{}).hash);
}

console.log('=== арифметика сходится строка за строкой ===');
{
  // Recomputed from scratch: the version column is an OUTPUT, so a hand-edited number must not survive.
  let maj = 0, min = 0, pat = 0;
  const wrong = [];
  for (const r of rows){
    if (r.kind === 'major'){ maj++; min = 0; pat = 0; }
    else if (r.kind === 'minor'){ min++; pat = 0; }
    else pat++;
    const want = maj + '.' + min + '.' + pat;
    if (want !== r.version) wrong.push({n:r.n, было:r.version, надо:want});
  }
  chk('каждая версия следует из предыдущей и своего разряда', wrong.length === 0, wrong.slice(0,3));
  chk('первый коммит — мажорный, он и есть первая базовая форма',
      rows[0].kind === 'major' && rows[0].version === '1.0.0', rows[0]);
  chk('счётчики совпали с последней строкой',
      maj + '.' + min + '.' + pat === rows[rows.length-1].version, [maj, min, pat]);
}

console.log('=== приложение показывает то, что посчиталось ===');
{
  const last = rows[rows.length-1].version;
  chk('APP_VERSION в формате v1.2.3', /^v\d+\.\d+\.\d+$/.test(APP_VERSION), APP_VERSION);
  chk('и это ровно последняя строка реестра', APP_VERSION === 'v' + last, [APP_VERSION, last]);
  // The service worker's cache key has to move with it or an installed app keeps serving the old build —
  // the two have always had to be bumped together, and now one of them is derived.
  const sw = fs.readFileSync('sw.js', 'utf8');
  const m = /const CACHE_VERSION = '([^']+)'/.exec(sw);
  chk('у service worker есть версия кэша', !!m, m && m[1]);
  chk('и она несёт тот же номер', !!m && m[1].indexOf(last) >= 0, m && m[1]);
}

console.log('=== мажорный разряд — это счётчик базовых форм ===');
{
  // The claim that makes the number mean something. Every base shape the app offers has a name in
  // KIND_LABEL — that is what the panel, the search and the help all read — so the count of names is the
  // count of base shapes, and the rule says the major digit is exactly that.
  const shapes = Object.keys(KIND_LABEL);
  const majors = rows.filter(r => r.kind === 'major');
  chk('базовых форм столько же, сколько мажорных шагов',
      shapes.length === majors.length, {формы:shapes.length, мажорных:majors.length});
  chk('и мажорный разряд версии — это их число',
      +APP_VERSION.slice(1).split('.')[0] === shapes.length,
      {версия:APP_VERSION, форм:shapes.length});
  chk('у каждой формы есть человеческое имя',
      shapes.every(k => KIND_LABEL[k] && KIND_LABEL[k].length > 2), shapes);
  // ...and each of those shapes is reachable — a name for a shape nobody can pick would inflate the digit
  const reach = {box:{}, die:{platonic:'d6'}, keycap:{keycapMode:'single'}, sheet:{sheetShape:'rect'},
                 thread:{threadMode:'cap'}, hinge:{pipMode:'flat'}, gear:{gearMode:'spur'},
                 mount:{mntMode:'lbracket'}, hook:{hookMount:'wall'}, wallorg:{woBack:'cleat'},
                 pbox:{pbPart:'tray'}, stand:{psOn:true}, funnel:{fnOn:true}, coaster:{csMode:'round'},
                 baseplate:{gfBaseplate:true}, logo3d:{logo3d:true}, litho:{ltMode:'flat'},
                 test:{tstMode:'temptower'}};
  const D = defaultBoxParams();
  for (const k of shapes){
    chk('«'+KIND_LABEL[k]+'» можно выбрать', !!reach[k], k);
    if (reach[k])
      chk('«'+KIND_LABEL[k]+'» действительно даёт этот режим',
          dominantMode(Object.assign({}, D, reach[k])) === k,
          dominantMode(Object.assign({}, D, reach[k])));
  }
}

console.log('=== реестр не разошёлся с историей репозитория ===');
{
  /* Реестр объявляет, что каждая его строка — выпуск, и что выпусков ровно столько, сколько коммитов,
     кроме поимённо названных исключений. Проверить это можно только у git, поэтому тест сюда и ходит:
     без такой сверки строка теряется молча — ровно так и потерялся `2b0b1e9`, и заметили это через
     двенадцать сборок, вручную.

     Хеши сверяются ПО ПОРЯДКУ: реестр — это последовательность, и строка, уехавшая на другое место,
     врёт не меньше, чем пропавшая. */
  // Коммиты без строки, с причиной — см. «Чего реестр НЕ обещает». Пять последних — разбор присланных
  // образцов: оснастка и заметки, приложения не трогают вовсе, а значит и выпуском не являются.
  const EXCEPT = ['2b0b1e9', '798f027', '0aa7a39', 'f658c57', 'af9a014', '5de9a4a'];
  let hist = null;
  try {
    hist = require('child_process')
      .execSync('git log --reverse --format=%h HEAD', {cwd: process.cwd(), encoding: 'utf8', stdio: ['ignore','pipe','ignore']})
      .trim().split('\n').filter(Boolean);
  } catch (e) { hist = null; }
  if (!hist) {
    chk('история репозитория доступна (без неё эту проверку делать нечем)', false, 'git недоступен');
  } else {
    const led = rows.map(r => r.hash).filter(h => h.indexOf('эта сборка') < 0);
    const short = hist.map(h => h.slice(0, 7));
    chk('все хеши реестра есть в истории',
        led.every(h => short.includes(h.slice(0, 7))),
        led.filter(h => !short.includes(h.slice(0, 7))).slice(0, 3));
    // порядок: позиции строк в истории обязаны строго возрастать
    const pos = led.map(h => short.indexOf(h.slice(0, 7)));
    chk('и идут в том же порядке, что в истории',
        pos.every((v, i) => i === 0 || v > pos[i-1]),
        pos.findIndex((v, i) => i > 0 && v <= pos[i-1]));
    // и наоборот: коммит без строки обязан быть назван исключением
    const ls = new Set(led.map(h => h.slice(0, 7)));
    const last = short[short.length - 1];               // последний — это «эта сборка», строки у него ещё нет
    const orphan = short.filter(h => !ls.has(h) && h !== last && EXCEPT.indexOf(h) < 0);
    chk('коммитов без строки, кроме названных исключений, нет', orphan.length === 0, orphan.slice(0, 5));
    chk('и названные исключения правда есть в истории',
        EXCEPT.every(h => short.includes(h)), EXCEPT.filter(h => !short.includes(h)));
    chk('исключение объяснено в самом реестре',
        EXCEPT.every(h => LEDGER.indexOf(h) >= 0), EXCEPT.filter(h => LEDGER.indexOf(h) < 0));
  }
}

console.log('=== правило записано там, где его прочтут ===');
{
  // The rule lives in one place and everything else points at it. If the wording goes, the next person
  // has a number with no definition and starts guessing.
  for (const word of ['мажорн', 'минорн', 'патч', 'базовая форма', 'разновидност'])
    chk('в VERSION.md сказано про «'+word+'»', LEDGER.toLowerCase().indexOf(word) >= 0);
  chk('и про то, что номер считается, а не пишется', /счита/i.test(LEDGER));
  chk('таблица правил стоит выше истории',
      LEDGER.indexOf('Что считается чем') < LEDGER.indexOf('## История'));
}

console.log('=== TOTAL: ' + pass + ' passed, ' + fail + ' failed ===');
if(fail) process.exit(1);
