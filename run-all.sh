#!/usr/bin/env bash
#
# Runs the entire geometry test battery against the REAL <script> extracted from
# parametric-stl-generator.html (not a re-transcription), so the tests catch bugs in
# the code that actually ships. Automates the per-file recipes documented in each
# test's own header. Requires only Node.js.
#
#   ./run-all.sh            # run everything, print a per-file + grand total
#   ./run-all.sh -j 1       # one at a time (deterministic CPU load, easier profiling)
#   ./run-all.sh -j 8       # override the worker count (default: nproc)
#
# Every test file is an independent Node process over its own bundle, so they are run
# CONCURRENTLY, one per core. Output is still printed in declaration order and the
# totals are unchanged — only the wall clock differs.
#
# Exit status is non-zero if any check fails or any file errors out.

set -u
cd "$(dirname "$0")"

JOBS="$( (command -v nproc >/dev/null && nproc) || echo 4 )"
while [ $# -gt 0 ]; do
  case "$1" in
    -j) JOBS="$2"; shift 2 ;;
    -j*) JOBS="${1#-j}"; shift ;;
    *) echo "usage: $0 [-j N]" >&2; exit 2 ;;
  esac
done
[ "$JOBS" -ge 1 ] 2>/dev/null || JOBS=1

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

# ---- job list -------------------------------------------------------------------------------------
labels=()
n=0
add() {  # add <label> <file...>   — concatenate the parts into this job's own bundle
  local label="$1"; shift
  labels+=("$label")
  cat "$@" > "$TMP/entry_$n.js"
  n=$((n+1))
}

# Self-contained: carries its own copies of the functions under test.
add test_logo_zone.js test_logo_zone.js

# Extraction tests: real <script> + DOM stubs, then the test appended. Ordered LONGEST FIRST, by measured
# time: with a fixed pool, total wall time is bounded below by the single longest file, so starting it last
# leaves three idle cores waiting on it. Re-sort this list if the timings in the summary line drift.
for t in test_thread.js test_battery.js test_hook_styles.js test_vase.js test_slice.js test_funnel.js test_squircle.js test_wormwheel.js test_poly.js test_funnel_cap.js test_winding.js test_cycloidal.js test_leadscrew.js test_bevelpair.js test_neck_adapter.js test_auger.js test_corkscrew.js test_barb.js test_snap.js test_balljoint.js test_chain.js test_livinghinge.js test_telescope.js test_geneva.js test_roots.js test_gauge.js test_radgauge.js \
          test_logo_plate.js test_gear.js test_hollow_inner_logo.js test_doser.js test_hollow_resolution.js \
          test_dice.js test_keycap.js test_squircle_rport.js test_mount_fastener.js test_lattice_floor.js \
          test_logo3d.js test_lattice_walls.js test_calibration.js test_fillet_logo_hollow.js \
          test_wall_bulge.js test_assembly.js test_edge_bevel.js test_param_search.js test_sheet.js test_logo_mirror.js test_e2e_full.js test_rim_box.js test_ujoint.js \
          test_fillet_logo.js test_hollow_taper.js test_stand.js test_pip_hinge.js test_scoop.js \
          test_honeycomb.js test_mount.js test_dividers.js test_shell_resolution.js test_holes.js \
          test_grip.js test_stack.js test_rounded_fillet.js test_chamfer.js test_labeltab.js test_qr.js \
          test_textures.js test_pbox.js test_gridfinity.js test_hook.js test_clips.js test_hole_patterns.js \
          test_hinge.js test_print_check.js test_wallorg.js test_svg_hole.js test_baseplate.js \
          test_import.js test_3mf.js; do
  add "$t" stub_preamble.js "$LIB" "$t"
done

# Debounce/token wiring + staged-parameters (Подтвердить) flow: use the counter-stubbed library.
for t in test_debounce_flow.js test_apply_button.js test_multi_model.js test_undo.js; do
  add "$t" stub_preamble.js "$LIB_STUBBED" "$t"
done

# 12-radius asym primitive tests: run against asym-12-radius.js (the source the
# in-page buildAsymRoundedBox was ported from).
for t in test-uniform-and-mixed.js test-3radius-variant.js; do
  add "$t" asym-12-radius.js "$t"
done

# ---- run them, JOBS at a time --------------------------------------------------------------------
cat > "$TMP/worker.sh" <<'WORKER'
#!/usr/bin/env bash
i="$1"; tmp="$2"
s=$(date +%s%N)
node "$tmp/entry_$i.js" > "$tmp/out_$i.txt" 2>&1
rc=$?
e=$(date +%s%N)
printf '%s %s\n' "$rc" "$(( (e-s)/1000000 ))" > "$tmp/rc_$i"
WORKER
chmod +x "$TMP/worker.sh"

seq 0 $((n-1)) | xargs -P "$JOBS" -I{} "$TMP/worker.sh" {} "$TMP"

# ---- report, in declaration order ----------------------------------------------------------------
total_pass=0
total_fail=0
failed_files=()
wall_ms=0
slowest=""
slowest_ms=0

for i in $(seq 0 $((n-1))); do
  label="${labels[$i]}"
  out="$(cat "$TMP/out_$i.txt")"
  read -r rc ms < "$TMP/rc_$i"
  wall_ms=$((wall_ms + ms))
  if [ "$ms" -gt "$slowest_ms" ]; then slowest_ms=$ms; slowest=$label; fi
  summary="$(printf '%s\n' "$out" | grep -iE 'passed,.*failed' | tail -1)"
  p="$(printf '%s' "$summary" | grep -oE '[0-9]+ passed' | grep -oE '[0-9]+')"; p=${p:-0}
  f="$(printf '%s' "$summary" | grep -oE '[0-9]+ failed' | grep -oE '[0-9]+')"; f=${f:-0}
  total_pass=$((total_pass + p))
  total_fail=$((total_fail + f))
  if [ "$rc" -ne 0 ] || [ "$f" -ne 0 ] || [ -z "$summary" ]; then
    failed_files+=("$label")
    printf '  FAIL  %-30s %6ss  %s\n' "$label" "$((ms/100))e-1" "${summary:-<no summary; exit=$rc>}"
    printf '%s\n' "$out" | tail -6 | sed 's/^/          | /'
  else
    printf '  ok    %-30s %6s  %s\n' "$label" "$(printf '%d.%01ds' $((ms/1000)) $(((ms%1000)/100)))" "$summary"
  fi
done

echo
echo "=================================================================="
printf 'GRAND TOTAL: %d passed, %d failed   (%d files, %d workers, %ds of CPU, slowest %s at %ds)\n' \
  "$total_pass" "$total_fail" "$n" "$JOBS" "$((wall_ms/1000))" "$slowest" "$((slowest_ms/1000))"
if [ "${#failed_files[@]}" -gt 0 ]; then
  echo "failed files: ${failed_files[*]}"
  exit 1
fi
echo "all green"
