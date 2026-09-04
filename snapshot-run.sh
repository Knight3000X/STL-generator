#!/usr/bin/env bash
# ПОРЯДОК СНЯТИЯ СЛЕПКА, целиком, чтобы его не приходилось вспоминать.
#
#   ./snapshot-run.sh <коммит-ДО> [каталог]
#
# Снимает слепок с ВЫПУЩЕННОГО коммита и с текущего рабочего дерева, потом сверяет их по полям.
# Коммит-ДО — обычно последний выпуск (`git log --oneline main -1`).
#
# ПОЧЕМУ ИМЕННО ТАК. Слепок бесполезен, если снят одним и тем же кодом дважды, и обманчив, если снят
# разными сборками: обе стороны обязаны прийти из ОДНОГО сценария (`snapshot.js`) и разных сборок
# приложения. Отсюда и порядок: библиотека вынимается из каждого `parametric-stl-generator.html`
# отдельно, а сценарий берётся один — текущий.
set -eu
cd "$(dirname "$0")"
BEFORE="${1:-}"
OUT="${2:-/tmp/snapshot}"
if [ -z "$BEFORE" ]; then
  echo "нужен коммит, с которым сверяться: ./snapshot-run.sh <коммит-ДО> [каталог]" >&2
  # ЛОКАЛЬНАЯ `main` здесь не годится: выпуски уезжают прямо в `origin/main`, и локальная отстаёт —
  # эта подсказка сама на том и попалась, назвав v25.45.0 вместо v25.48.0.
  echo "обычно это последний выпуск: $(git log --oneline origin/main -1 2>/dev/null || echo '—')" >&2
  exit 2
fi
mkdir -p "$OUT"
lib_of(){ # <источник html> <куда>
  awk '/<script>/{c++;f=1;next}/<\/script>/{f=0;next} f && c>=2' "$1" | sed '$ { /^init();$/d }' > "$2"
}
echo "== слепок ДО ($BEFORE) =="
git show "$BEFORE:parametric-stl-generator.html" > "$OUT/before.html"
lib_of "$OUT/before.html" "$OUT/before.lib.js"
cat stub_preamble.js "$OUT/before.lib.js" snapshot.js > "$OUT/before.entry.js"
node "$OUT/before.entry.js" part  "$OUT/before-part.txt"
node "$OUT/before.entry.js" extra "$OUT/before-extra.txt"

echo "== слепок ПОСЛЕ (рабочее дерево) =="
lib_of parametric-stl-generator.html "$OUT/after.lib.js"
cat stub_preamble.js "$OUT/after.lib.js" snapshot.js > "$OUT/after.entry.js"
node "$OUT/after.entry.js" part  "$OUT/after-part.txt"
node "$OUT/after.entry.js" extra "$OUT/after-extra.txt"

echo
python3 snapshot-diff.py "$OUT/before-part.txt" "$OUT/after-part.txt" \
                         "$OUT/before-extra.txt" "$OUT/after-extra.txt"
