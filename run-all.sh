#!/usr/bin/env bash
#
# Runs the entire geometry test battery against the REAL <script> extracted from
# parametric-stl-generator.html (not a re-transcription), so the tests catch bugs in
# the code that actually ships. Automates the per-file recipes documented in each
# test's own header. Requires only Node.js.
#
#   ./run-all.sh          # run everything, print a per-file + grand total
#
# Exit status is non-zero if any check fails or any file errors out.

set -u
cd "$(dirname "$0")"

HTML=parametric-stl-generator.html
if [ ! -f "$HTML" ]; then
  echo "error: $HTML not found (run from the repo root)" >&2
  exit 2
fi

TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT
LIB="$TMP/lib.js"
LIB_STUBBED="$TMP/lib_stubbed.js"

# 1) Extract the page's MAIN <script> body (the 2nd script block — the 1st is the inlined Three.js
#    library, which the Node geometry tests don't need), dropping the final init() call (no DOM in Node).
awk '/<script>/{c++;f=1;next}/<\/script>/{f=0;next} f && c>=2' "$HTML" | sed '$ { /^init();$/d }' > "$LIB"

# 2) test_debounce_flow.js exercises the debounce/token wiring, so it needs the real
#    regenerate()/applyRotationOnly() swapped for call counters.
node -e '
  const fs = require("fs");
  let s = fs.readFileSync(process.argv[1], "utf8");
  s = s.replace(/function regenerate\(\) \{[\s\S]*?\n\}\n/, "function regenerate(){__regenerateCalls++;}\n");
  s = s.replace(/function applyRotationOnly\(\) \{[\s\S]*?\n\}\n/, "function applyRotationOnly(){__rotateOnlyCalls++;}\n");
  fs.writeFileSync(process.argv[2], s);
' "$LIB" "$LIB_STUBBED"

total_pass=0
total_fail=0
failed_files=()

run() {  # run <label> <node-entry-file>
  local label="$1" input="$2" out rc summary p f
  out="$(node "$input" 2>&1)"; rc=$?
  summary="$(printf '%s\n' "$out" | grep -iE 'passed,.*failed' | tail -1)"
  p="$(printf '%s' "$summary" | grep -oE '[0-9]+ passed' | grep -oE '[0-9]+')"; p=${p:-0}
  f="$(printf '%s' "$summary" | grep -oE '[0-9]+ failed' | grep -oE '[0-9]+')"; f=${f:-0}
  total_pass=$((total_pass + p))
  total_fail=$((total_fail + f))
  if [ "$rc" -ne 0 ] || [ "$f" -ne 0 ] || [ -z "$summary" ]; then
    failed_files+=("$label")
    printf '  FAIL  %-30s %s\n' "$label" "${summary:-<no summary; exit=$rc>}"
    printf '%s\n' "$out" | tail -6 | sed 's/^/          | /'
  else
    printf '  ok    %-30s %s\n' "$label" "$summary"
  fi
}

# Self-contained: carries its own copies of the functions under test.
run test_logo_zone.js "test_logo_zone.js"

# Extraction tests: real <script> + DOM stubs, then the test appended.
for t in test_rim_box.js test_hollow_taper.js test_hollow_resolution.js \
         test_hollow_inner_logo.js test_rounded_fillet.js test_fillet_logo.js \
         test_fillet_logo_hollow.js test_lattice_floor.js test_wall_bulge.js test_squircle.js test_holes.js test_e2e_full.js \
         test_shell_resolution.js test_chamfer.js test_squircle_rport.js test_logo3d.js test_clips.js test_hinge.js test_stack.js test_dividers.js test_hole_patterns.js test_svg_hole.js test_qr.js test_textures.js test_print_check.js test_gridfinity.js test_3mf.js test_scoop.js test_labeltab.js test_mount.js test_baseplate.js; do
  cat stub_preamble.js "$LIB" "$t" > "$TMP/run.js"
  run "$t" "$TMP/run.js"
done

# Debounce/token wiring + staged-parameters (Подтвердить) flow: use the counter-stubbed library.
cat stub_preamble.js "$LIB_STUBBED" test_debounce_flow.js > "$TMP/run_deb.js"
run test_debounce_flow.js "$TMP/run_deb.js"
cat stub_preamble.js "$LIB_STUBBED" test_apply_button.js > "$TMP/run_apply.js"
run test_apply_button.js "$TMP/run_apply.js"
cat stub_preamble.js "$LIB_STUBBED" test_multi_model.js > "$TMP/run_mm.js"
run test_multi_model.js "$TMP/run_mm.js"
cat stub_preamble.js "$LIB_STUBBED" test_undo.js > "$TMP/run_undo.js"
run test_undo.js "$TMP/run_undo.js"

# 12-radius asym primitive tests: run against asym-12-radius.js (the source the
# in-page buildAsymRoundedBox was ported from).
for t in test-uniform-and-mixed.js test-3radius-variant.js; do
  cat asym-12-radius.js "$t" > "$TMP/run_asym.js"
  run "$t" "$TMP/run_asym.js"
done

echo
echo "=================================================================="
printf 'GRAND TOTAL: %d passed, %d failed\n' "$total_pass" "$total_fail"
if [ "${#failed_files[@]}" -ne 0 ]; then
  printf 'files with failures: %s\n' "${failed_files[*]}"
  exit 1
fi
echo "all green"
