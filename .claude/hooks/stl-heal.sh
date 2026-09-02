#!/bin/bash
# САМОЛЕЧЕНИЕ РАБОЧЕЙ КОПИИ — КОПИЯ, ЖИВУЩАЯ ВНЕ РЕПОЗИТОРИЯ.
#
# В репозитории такой хук уже есть (.claude/hooks/session-start.sh), и у него неустранимый изнутри
# изъян: снимок ФС окружения сделан на v22.5.1, а каталога .claude в том коммите НЕТ ВОВСЕ. Откат
# сносит хук вместе со всем остальным — и лечить откат становится некому. Поэтому та же работа
# продублирована ЗДЕСЬ, где отката нет.
#
# Ничего не решает сам: перематывает только ВПЕРЁД, только чистое дерево, только свою же ветку.
set -uo pipefail
R=/home/user/STL-generator
cd "$R" 2>/dev/null || exit 0
git rev-parse --git-dir >/dev/null 2>&1 || exit 0
[ -n "$(git status --porcelain 2>/dev/null)" ] && { echo "stl-heal: дерево не чистое — не трогаю"; exit 0; }
b="$(git symbolic-ref --quiet --short HEAD 2>/dev/null)" || exit 0
[ -n "$b" ] || { echo "stl-heal: HEAD отсоединён — не трогаю"; exit 0; }
git fetch --quiet origin "$b" 2>/dev/null || { echo "stl-heal: origin/$b недоступен"; exit 0; }
here="$(git rev-parse HEAD 2>/dev/null)"; there="$(git rev-parse FETCH_HEAD 2>/dev/null)"
[ -n "$here" ] && [ -n "$there" ] || exit 0
if [ "$here" = "$there" ]; then
  echo "stl-heal: $b на уровне origin (${here:0:7})"
elif git merge-base --is-ancestor "$here" "$there" 2>/dev/null; then
  git checkout --quiet -B "$b" "$there" 2>/dev/null \
    && echo "stl-heal: $b перемотана ${here:0:7} → ${there:0:7} — контейнер вернулся из снимка" \
    || echo "stl-heal: перемотать не удалось — оставляю ${here:0:7}"
else
  echo "stl-heal: локальная $b не предок origin/$b — не трогаю (${here:0:7})"
fi
# ОТМЕТКА ДЛЯ СТОРОЖА. Хранится вне репозитория: внутри её снесло бы тем же откатом.
git rev-parse HEAD > /root/.claude/stl-head-stamp 2>/dev/null
exit 0
