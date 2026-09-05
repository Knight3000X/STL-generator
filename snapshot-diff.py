#!/usr/bin/env python3
"""Сверка двух слепков ПО ПОЛЯМ, а не побайтово.

Побайтовое сравнение отвечает только «одинаково или нет», и на правке с намерением оно бесполезно:
различий тысячи, и среди них надо разглядеть незаказанные. Поэтому записи разбираются на поля, и
итог читается так: «сетка, форма, спецификации, предупреждения — по нулю; разошлись расход и
толщина». Правка, которая ничего не должна была задеть, обязана дать ноль везде.

Внутри поля «печать» разбор идёт ещё на шаг — по подполям (расход, толщина, мост, пятно, поворот,
советы. Именно так поймался сдвиг 208 замеров пролёта, который иначе утонул бы в трёх тысячах
изменившихся строк расхода.

  python3 snapshot-diff.py ДО-part ПОСЛЕ-part [ДО-extra ПОСЛЕ-extra]
"""
import sys, re

FIELDS = ['сетка', 'форма', 'спец', 'печать', 'тексты']

def load(path):
    d = {}; cur = None; rec = {}
    for line in open(path, encoding='utf-8'):
        if not line.startswith('  '):
            if cur is not None: d[cur] = rec
            cur = line.rstrip('\n'); rec = {}
        else:
            # ИМЯ ПОЛЯ БЕРЁТСЯ ЖАДНО. Нежадное `(\S+?):?` съедает по одной букве: ключами становятся
            # «с», «ф», «с», «п», «т», поля «сетка» и «спец» схлопываются в одно, а искомых имён нет
            # вовсе — и сверялка на ЛЮБОЙ паре отвечает «различий нет». Так она и была написана при
            # переносе в репозиторий, и первый же настоящий прогон это показал: слепки различались на
            # два миллиметра запаса, а отчёт был по нулям.
            m = re.match(r'  (\S+): ?(.*)', line.rstrip('\n'))
            if m: rec[m.group(1).rstrip(':')] = m.group(2)
    if cur is not None: d[cur] = rec
    return d

def compare(a, b, tag):
    A, B = load(a), load(b)
    # СТОРОЖ ПРОТИВ «ВСЕГДА ЗЕЛЁНОГО». Сверялка, которая по любой паре отвечает «различий нет», хуже
    # отсутствующей: она выдаёт зелёный свет, ничего не проверив. Разбор считается состоявшимся, только
    # если в записях нашлись ИМЕННО ТЕ поля, которые мы собираемся сравнивать.
    known = sum(1 for r in A.values() for f in FIELDS if f in r)
    if not A or not known:
        raise SystemExit(f'{tag}: разбор не нашёл ни одного известного поля в «{a}» — '
                         f'сверять нечего, и молчать об этом нельзя')
    missing = [k for k in A if k not in B]
    added   = [k for k in B if k not in A]
    per = {f: [] for f in FIELDS}
    for k in A:
        if k not in B: continue
        for f in FIELDS:
            if A[k].get(f) != B[k].get(f): per[f].append(k)
    print(f'=== {tag}: было {len(A)}, стало {len(B)}; пропало {len(missing)}, добавилось {len(added)} ===')
    for f in FIELDS:
        mark = '' if not per[f] else ('   ← ' + ('ТАК И ЗАДУМАНО?' if f == 'печать' else 'ЭТО НЕ ДОЛЖНО БЫЛО МЕНЯТЬСЯ'))
        print(f'  {f:8s} изменилось у {len(per[f]):5d} наборов{mark}')
    if per['печать']:
        sub = {}
        for k in per['печать']:
            for o, n in zip(A[k]['печать'].split(' | '), B[k]['печать'].split(' | ')):
                if o != n:
                    name = o.split(' ')[0]
                    sub[name] = sub.get(name, 0) + 1
        print('   внутри «печать»:', ', '.join(f'{k}×{v}' for k, v in sorted(sub.items(), key=lambda x: -x[1])))
    for f in ['сетка', 'форма', 'спец', 'тексты']:
        for k in per[f][:3]:
            print(f'   {f} у «{k}»'); print('      было :', A[k][f][:130]); print('      стало:', B[k][f][:130])
    if missing: print('   ПРОПАЛИ:', missing[:5])
    if added:   print('   добавились:', added[:5])
    return not (missing or per['сетка'] or per['форма'] or per['спец'] or per['тексты'])

def self_test():
    """Сверялка обязана НАЙТИ различие там, где оно есть.

    Инструмент, который по любой паре отвечает «различий нет», хуже отсутствующего: он выдаёт зелёный
    свет, ничего не проверив, и правка уезжает в выпуск с чувством, что она проверена. Так и вышло при
    переносе в репозиторий: имя поля разбиралось НЕЖАДНЫМ `(\S+?):?`, оно съедало по одной букве,
    ключами становились «с», «ф», «с», «п», «т» — и сверка молчала на любой паре. Поймал это первый же
    настоящий прогон: слепки различались на два миллиметра запаса, а отчёт был по нулям.
    """
    import tempfile, os
    a = ('умолчания\n  сетка: 12:aaa\n  форма: куб\n  спец: X=1\n'
         '  печать: расход 1/2г/3ч | пятно 10/5\n  тексты: тихо\n')
    b = a.replace('пятно 10/5', 'пятно 10/7')
    d = tempfile.mkdtemp()
    pa, pb = os.path.join(d, 'a.txt'), os.path.join(d, 'b.txt')
    open(pa, 'w', encoding='utf-8').write(a); open(pb, 'w', encoding='utf-8').write(b)
    A, B = load(pa), load(pb)
    ok = True
    if list(A.keys()) != ['умолчания']:
        print('САМОПРОВЕРКА: разбор не нашёл запись:', list(A.keys())); ok = False
    missing = [f for f in FIELDS if f not in A['умолчания']]
    if missing:
        print('САМОПРОВЕРКА: разбор потерял поля:', missing); ok = False
    elif A['умолчания']['печать'] == B['умолчания']['печать']:
        print('САМОПРОВЕРКА: различие в «печать» не замечено'); ok = False
    if A.get('умолчания', {}).get('сетка') != '12:aaa':
        print('САМОПРОВЕРКА: поле «сетка» разобрано неверно:', A.get('умолчания', {}).get('сетка')); ok = False
    print('самопроверка сверялки: ' + ('в порядке' if ok else 'ПРОВАЛЕНА'))
    raise SystemExit(0 if ok else 1)

if len(sys.argv) == 2 and sys.argv[1] == '--self-test':
    self_test()
if len(sys.argv) < 3:
    print(__doc__); raise SystemExit(2)
ok = compare(sys.argv[1], sys.argv[2], 'слепок part')
if len(sys.argv) >= 5:
    ok = compare(sys.argv[3], sys.argv[4], 'слепок extra') and ok
print()
print('ГЕОМЕТРИЯ И ТЕКСТЫ НЕ ТРОНУТЫ' if ok else 'ВНИМАНИЕ: тронуто то, что трогать не собирались')
