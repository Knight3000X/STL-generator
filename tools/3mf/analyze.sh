#!/usr/bin/env bash
#
# Разбор присланного 3MF/STL/OBJ ГЕНЕРАТОРОМ ЖЕ. Импорт живёт в parametric-stl-generator.html, и
# отдельная реализация разбора здесь была бы второй правдой: она бы читала файлы, которые генератор не
# читает, и молчала бы о том, на чём он спотыкается. Поэтому бандл собирается ровно так же, как для
# батареи, — из настоящего <script> страницы.
#
#   tools/3mf/analyze.sh parts   FILE                     — список деталей: имя, треугольники, габарит
#   tools/3mf/analyze.sh map     FILE PART [NX] [NY] [X0 X1 Y0 Y1]  — карта высот сверху, псевдографикой
#   tools/3mf/analyze.sh feat    FILE PART [ШАГ]          — выступы, сквозные отверстия и карманы списком
#   tools/3mf/analyze.sh profile FILE PART x|y ФИКС A0 A1 [ШАГ]  — профиль поверхности вдоль прямой
#
#   tools/3mf/analyze.sh dump    FILE PART OUT.stl [X0 X1 Y0 Y1] — выгрузить в STL, чтобы посмотреть
#
# PART — номер детали из `parts` (с нуля).
#
# ВВЕРХ У 3MF — ЭТО Z. Импорт осей не переставляет (как и у STL), поэтому все замеры здесь по Z, а X и Y —
# это стол. Ошибиться тут стоит целой раскладки: «высота 50» окажется глубиной плиты.
set -u
cd "$(dirname "$0")/../.."
CMD="${1:?usage: analyze.sh parts|map|feat|profile FILE ...}"; shift
FILE="${1:?нужен путь к файлу}"; shift

TMP="$(mktemp -d)"; trap 'rm -rf "$TMP"' EXIT
awk '/<script>/{c++;f=1;next}/<\/script>/{f=0;next} f && c>=2' parametric-stl-generator.html \
  | sed '$ { /^init();$/d }' > "$TMP/lib.js"
cat stub_preamble.js "$TMP/lib.js" "tools/3mf/$CMD.js" > "$TMP/entry.js"
exec node --max-old-space-size=6144 "$TMP/entry.js" "$FILE" "$@"
