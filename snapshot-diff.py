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
            m = re.match(r'  (\S+?):? ?(.*)', line.rstrip('\n'))
            if m: rec[m.group(1).rstrip(':')] = m.group(2)
    if cur is not None: d[cur] = rec
    return d

def compare(a, b, tag):
    A, B = load(a), load(b)
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

if len(sys.argv) < 3:
    print(__doc__); raise SystemExit(2)
ok = compare(sys.argv[1], sys.argv[2], 'слепок part')
if len(sys.argv) >= 5:
    ok = compare(sys.argv[3], sys.argv[4], 'слепок extra') and ok
print()
print('ГЕОМЕТРИЯ И ТЕКСТЫ НЕ ТРОНУТЫ' if ok else 'ВНИМАНИЕ: тронуто то, что трогать не собирались')
