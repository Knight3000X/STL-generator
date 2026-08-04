# Версии

Номер версии не пишется руками — он **считается** из этого реестра, и приложение показывает то, что
посчиталось. Строка в шапке и `APP_VERSION` в коде обязаны совпасть с последней строкой таблицы;
`test_version.js` это проверяет на каждом прогоне.

## Что считается чем

| разряд | когда растёт | пример |
|---|---|---|
| **мажорный** | добавлена новая **базовая форма** | подстаканник, воронка, шестерня |
| **минорный** | добавлена новая **разновидность** базовой формы или отдельная возможность | червячное колесо у шестерни, ступени рельефа у логотипа |
| **патч** | доработки и исправления | цвет логотипа, оформление панели, починенный шов |

Как в semver: мажорный обнуляет минорный и патч, минорный обнуляет патч.

**Мажорный разряд — это счётчик базовых форм.** Их сегодня ровно столько, сколько строк в `KIND_LABEL`,
и тест сверяет одно с другим: реестр, разошедшийся с кодом, перестаёт быть реестром.

## Как пополнять

Последняя строка описывает сборку, которая ещё не в истории, и хеша у неё быть не может — она и есть тот
коммит, который сейчас делается. Поэтому порядок такой: **выпуская следующую версию, сначала проставьте
настоящий хеш предыдущей строке**, потом добавьте свою со словами `(эта сборка)`. Пытаться вписать себе
собственный хеш бессмысленно: он меняется от любого `--amend`, и реестр начинает врать тише, чем если бы
хеша не было вовсе.

## История

Каждый коммит проекта, от первого. `kind` — по правилу выше, `версия` — состояние после этого коммита.

| № | коммит | разряд | версия | что сделано |
|---:|---|---|---|---|
| 1 | `0932161` | мажорный | **1.0.0** | Initial commit: parametric STL generator |
| 2 | `6464a9e` | патч | **1.0.1** | feat: raise hollow-container logo detail cap to 300 |
| 3 | `5d0bf5d` | патч | **1.0.2** | docs: add run-all.sh and sync README/PROGRESS with the real flat layout |
| 4 | `fd0fe37` | патч | **1.0.3** | perf: stop mobile freeze when resizing a fully-filleted hollow container |
| 5 | `b6e30be` | минорный | **1.1.0** | feat: apply parameter/logo edits only on a "Подтвердить" button (staged edits) |
| 6 | `bc3cbc4` | минорный | **1.2.0** | feat: wall bulge (скругление стенок) on the solid cube, logo-compatible |
| 7 | `0e35f39` | патч | **1.2.1** | feat: wall bulge phase 2 — combine with corner rounding + hollow/rim |
| 8 | `d2e409a` | патч | **1.2.2** | feat: wall bulge cavity-follow — inner cavity mirrors the bulge, thickness preserved |
| 9 | `fe50f42` | патч | **1.2.3** | Merge: docs sync, apply-button, and wall bulge (with fillet, hollow/rim, cavity-follow) |
| 10 | `d295d86` | минорный | **1.3.0** | feat: squircle / superellipse cross-section (the real "wall rounding") |
| 11 | `06dc8db` | минорный | **1.4.0** | feat: superellipsoid — optional vertical rounding of the squircle (rounded top/bottom edges) |
| 12 | `2253758` | патч | **1.4.1** | Merge: squircle / superellipsoid cross-section |
| 13 | `c14cb0a` | патч | **1.4.2** | feat: logos emboss onto the squircle / superellipsoid curved wall |
| 14 | `2e84fe5` | минорный | **1.5.0** | feat: squircle as a hollow container and a rim/tray (logos included) |
| 15 | `74dbb18` | патч | **1.5.1** | Merge: squircle logos + squircle hollow container / tray (#3) |
| 16 | `46932ee` | патч | **1.5.2** | fix: logos on the top/pole no longer smear into radial spikes |
| 17 | `95127bc` | патч | **1.5.3** | Merge: fix logo spike distortion on tops/poles (#4) |
| 18 | `5ebca5f` | патч | **1.5.4** | perf: denser emboss grid for squircle logos (smoother edges) |
| 19 | `80a1c31` | патч | **1.5.5** | Merge: denser emboss grid for squircle logos (#5) |
| 20 | `1d8604d` | патч | **1.5.6** | feat: raise logo detail ceiling to 500 |
| 21 | `bd9dd6e` | патч | **1.5.7** | perf: zone-densify the squircle logo grid (cheap high detail) |
| 22 | `595560d` | патч | **1.5.8** | Merge: logo detail to 500 + zone-densified squircle grid (#6) |
| 23 | `cfa5912` | минорный | **1.6.0** | feat: squircleV rounds the container bottom (superellipsoid lower half) |
| 24 | `a926191` | патч | **1.6.1** | feat: Cartesian pole cap on the rounded bottom (bottom logos work) |
| 25 | `4815b0f` | патч | **1.6.2** | Merge: rounded container bottom + pole cap for bottom logos (#7) |
| 26 | `5d5d29c` | патч | **1.6.3** | fix: three bugs found by a seeded 800-combo fuzz sweep + live-app smoke test |
| 27 | `ea6bdf1` | патч | **1.6.4** | Merge: fuzz-found geometry/check fixes (#8) |
| 28 | `4f717c6` | минорный | **1.7.0** | feat: multiple models (assembly) — add, configure, place, merge-export |
| 29 | `6b19b7e` | патч | **1.7.1** | Merge pull request #9 from Knight3000X/claude/review-completed-work-6dp3iw |
| 30 | `216b057` | патч | **1.7.2** | docs: sync stale test counts in PROGRESS.md (457 total, +multi_model row) |
| 31 | `7e12f30` | патч | **1.7.3** | feat: split squircle vertical rounding into independent top / bottom |
| 32 | `be72b3c` | патч | **1.7.4** | feat: zonal logo grid on the flat hollow container / rim tray |
| 33 | `671810d` | патч | **1.7.5** | docs: record lattice-floor scope decision (flat-open hollow only) |
| 34 | `61d1fa7` | минорный | **1.8.0** | feat: run the watertight check in a Web Worker (non-blocking diagnostic) |
| 35 | `3376f77` | патч | **1.8.1** | feat: separate control for the fillet axial-grid density (filletAxisRes) |
| 36 | `318221c` | патч | **1.8.2** | docs: record CSG decision (not implemented, by design) and close the task list |
| 37 | `2fe3250` | патч | **1.8.3** | refactor: drop ASCII STL export (Binary only) |
| 38 | `a4b9fcb` | патч | **1.8.4** | refactor: merge the two logo-detail sliders into one shared control |
| 39 | `d7cd1c4` | минорный | **1.9.0** | feat: shape presets bar (one-click rounding/mode bundles) |
| 40 | `6691f24` | минорный | **1.10.0** | feat: save/load the whole assembly as JSON config |
| 41 | `5e9849f` | минорный | **1.11.0** | feat: text as relief (reuses the logo heightmap pipeline) |
| 42 | `2d3ff76` | минорный | **1.12.0** | feat: one-click lid companion model for the active container |
| 43 | `63f85c2` | минорный | **1.13.0** | feat: watertight cylindrical through-holes on the plain solid box |
| 44 | `5abc111` | патч | **1.13.1** | feat: rounded lattice-floor rib profile (per-vertex height field) |
| 45 | `77ba345` | патч | **1.13.2** | feat: cavity-floor logos on the lattice floor (solid patch + emboss) |
| 46 | `558aab4` | патч | **1.13.3** | fix: floor logo on lattice fills only the relief SHAPE, not the whole square |
| 47 | `e3f630c` | патч | **1.13.4** | build: inline Three.js r128 so the 3D preview works offline (no CDN) |
| 48 | `9960f88` | патч | **1.13.5** | build: inline IBM Plex fonts (WOFF2 data-URI) — file is fully offline, 0 external requests |
| 49 | `c88d87d` | минорный | **1.14.0** | feat: installable PWA — add to home screen / desktop, offline |
| 50 | `0e66291` | патч | **1.14.1** | ci: GitHub Pages deploy workflow (auto-publish on every push to main) |
| 51 | `71db26c` | патч | **1.14.2** | fix: depth-0 cavity-floor logo still shows on the lattice (flush inlay) |
| 52 | `704fd03` | патч | **1.14.3** | fix(pwa): network-first HTML so deploys reach installed apps |
| 53 | `39c1aa7` | патч | **1.14.4** | ci: mirror every push to the self-hosted git server |
| 54 | `6864569` | патч | **1.14.5** | fix: overlapping through-holes on one axis no longer leak |
| 55 | `110ca49` | минорный | **1.15.0** | feat: dark theme (light/dark toggle, system default, persisted) |
| 56 | `d7c11c7` | минорный | **1.16.0** | feat: hole shapes — circle + rounded rectangle (USB-C / slot / rect) |
| 57 | `68297c8` | минорный | **1.17.0** | feat: single-wall ports on a hollow container (USB-C in an enclosure) |
| 58 | `e991166` | патч | **1.17.1** | feat: holes/ports on a corner-filleted box (rounded box + USB-C) |
| 59 | `91b50c2` | патч | **1.17.2** | feat: single-wall port on a hollow squircle (window in the curved wall) |
| 60 | `02050c9` | патч | **1.17.3** | fix: logo-free hollow/rim shell no longer explodes with the detail slider |
| 61 | `00981be` | минорный | **1.18.0** | feat: countersink & counterbore holes (recessed screw-head seats) |
| 62 | `4f563df` | патч | **1.18.1** | fix(pwa): reliably deliver new builds (bump cache, no-store HTML, update prompt) |
| 63 | `a4c7cb3` | патч | **1.18.2** | feat: single-wall port on a rounded-bottom (superellipsoid) hollow container |
| 64 | `7b0744f` | патч | **1.18.3** | fix: TYPE-C hole keeps its width/height when moved between faces |
| 65 | `9532b1d` | патч | **1.18.4** | feat: fill enclosed logo counters solid on the lattice floor (no net inside) |
| 66 | `143e30b` | минорный | **1.19.0** | feat: CSG boolean engine (BSP union/subtract/intersect, watertight) |
| 67 | `163cb3d` | патч | **1.19.1** | fix: enclosed logo counters on the lattice stay OPEN (no net), not filled |
| 68 | `ef42700` | патч | **1.19.2** | Remove presets panel (#7); record CSG-unviable-for-#2 finding |
| 69 | `fc5ae61` | патч | **1.19.3** | Group box parameters into collapsible categories (#6) |
| 70 | `d9a0c16` | патч | **1.19.4** | Disable auto-mirror workflow on push (manual dispatch only) |
| 71 | `599e1fa` | минорный | **1.20.0** | Add top-outer chamfer to the hollow container (#5) |
| 72 | `98712b6` | патч | **1.20.1** | Rounded (USB-C) ports on curved squircle walls (#2) |
| 73 | `14cfd65` | мажорный | **2.0.0** | Extruded-silhouette logo as a standalone assembly model (#8) |
| 74 | `eb5543a` | патч | **2.0.1** | Multiple holes on the squircle container at once |
| 75 | `a72fc0a` | патч | **2.0.2** | Fix invisible/degenerate port on rounded-bottom squircle (user report) |
| 76 | `e7d12c5` | патч | **2.0.3** | Draggable preview height on mobile |
| 77 | `2f206cf` | патч | **2.0.4** | Logo W/H proportions lock + fold long UI help texts away |
| 78 | `2fcdc40` | минорный | **2.1.0** | Live preview replaces the Подтвердить button; heavy models defer to a stale badge |
| 79 | `e2a6c87` | минорный | **2.2.0** | Snap-clip lid: bump ridges on the container + windows in the lid skirt |
| 80 | `0b855a8` | минорный | **2.3.0** | Flip-lid hinge with a filament pin (+ Откидная крышка) |
| 81 | `356a4bd` | минорный | **2.4.0** | Stacking feet (штабелируемость) |
| 82 | `c04b290` | минорный | **2.5.0** | Cavity dividers (organizer grid) + lightweight slab shells |
| 83 | `a81368c` | минорный | **2.6.0** | Connector presets + hole patterns (grid / circle array) |
| 84 | `b268f46` | минорный | **2.7.0** | Print weight/time estimate in the stats panel |
| 85 | `0a45fe8` | минорный | **2.8.0** | Import an arbitrary SVG shape as a hole contour |
| 86 | `1116eab` | минорный | **2.9.0** | Undo/redo for model parameters + one-click ventilation preset |
| 87 | `27f0876` | патч | **2.9.1** | Dividers now work over the lattice net floor |
| 88 | `8333a63` | минорный | **2.10.0** | QR code as a 3D pattern (self-contained encoder) |
| 89 | `95a514b` | минорный | **2.11.0** | Procedural surface textures (ribs / dots / triangular honeycomb) |
| 90 | `2548fc0` | минорный | **2.12.0** | Print-readiness checks + auto-orientation (roadmap complete) |
| 91 | `51063ab` | патч | **2.12.1** | Collapsible panel sections + full debug pass (2 bugs fixed) |
| 92 | `23c719a` | патч | **2.12.2** | Cleanup per owner's picks: drop CSG + mirror.yml, merge lid buttons, merge rim into hollow |
| 93 | `1a916e5` | минорный | **2.13.0** | 45-degree edge chamfer on hole rims (edgeCh) |
| 94 | `c4cdc30` | минорный | **2.14.0** | Gridfinity-compatible bin (gfOn / gfX / gfY / gfU) |
| 95 | `614fd81` | минорный | **2.15.0** | 3MF export: each visible model as a separate object |
| 96 | `d0c078e` | минорный | **2.16.0** | Drag models in the scene (move mode) |
| 97 | `9677138` | патч | **2.16.1** | De-flake test_hollow_resolution perf check (1000 -> 2000ms) |
| 98 | `28f58b6` | минорный | **2.17.0** | Lattice floor detail slider + Gridfinity stacking lip & magnet pockets |
| 99 | `ce16602` | патч | **2.17.1** | Sync documentation with the implemented feature set |
| 100 | `7affd7f` | минорный | **2.18.0** | Scoop ramp on the cavity floor (organizer feature #1) |
| 101 | `024d07a` | минорный | **2.19.0** | Label tab shelf (organizer feature #2) |
| 102 | `9212436` | минорный | **2.20.0** | Mounting ears with countersunk holes (organizer feature #3) |
| 103 | `a88527c` | мажорный | **3.0.0** | Gridfinity baseplate model (organizer feature #4) |
| 104 | `56f4d2d` | минорный | **3.1.0** | Finger-grip ridges (organizer feature #5 — block complete) |
| 105 | `8d0aa03` | минорный | **3.2.0** | Lattice floor: multiple hole patterns (diamond/square/triangle/hex) |
| 106 | `5bebaaf` | минорный | **3.3.0** | Lattice on side walls (through-hole net) with 4 patterns |
| 107 | `07d8301` | минорный | **3.4.0** | Model slicer: split a mesh into watertight fragments by size |
| 108 | `ff73eab` | патч | **3.4.1** | Fix tray rim: uniform wall height under a top tilt |
| 109 | `95b2a33` | патч | **3.4.2** | Fix: top/bottom tilt no longer changes the model's Height |
| 110 | `cc17bba` | мажорный | **4.0.0** | Add polyhedron shape: N-gon prism + Platonic solids (part 1) |
| 111 | `429c494` | патч | **4.0.1** | Polyhedron part 2a: logos and holes on N-gon faces |
| 112 | `c12e937` | патч | **4.0.2** | Polyhedron part 2b: through-hole lattice floor on the N-gon container |
| 113 | `bb283fa` | патч | **4.0.3** | Polyhedron part 2c: internal dividers on the N-gon container |
| 114 | `c03f53e` | патч | **4.0.4** | Polyhedron part 2d: through-hole lattice on the N-gon side walls |
| 115 | `3000f2c` | минорный | **4.1.0** | Dice: rename Platonic solids to D4/D8/D12/D20, add D10/D100 + per-face relief |
| 116 | `18029c3` | минорный | **4.2.0** | D100: replace trapezohedron with a real spherical Zocchihedron (100 facets) |
| 117 | `fefb012` | патч | **4.2.1** | Dice: negative depth now engraves symbols (recessed) instead of always raised |
| 118 | `ec3bdcf` | патч | **4.2.2** | Default all logos / text / die numbers to recessed (−0.2 mm engrave) |
| 119 | `d2416ce` | патч | **4.2.3** | Dice auto-number: underline rotation-ambiguous digits (6/9, and D100 pairs) |
| 120 | `e47da3d` | патч | **4.2.4** | Dice: fix mirrored digits + add separate face-detail control (dieResolution) |
| 121 | `82630a4` | патч | **4.2.5** | Dice auto-number: standard layouts — opposite faces sum to N+1, apex-read D4 |
| 122 | `9dd883a` | минорный | **4.3.0** | Bin container (full-size rounded-rect + wall net) and crisper die-face relief |
| 123 | `db811fb` | патч | **4.3.1** | Dice: crisp glyph relief (cell-lattice patch) + numbers oriented bottom-to-corner |
| 124 | `638356c` | патч | **4.3.2** | D4 crisp glyph patches (sector split) + factory number orientation |
| 125 | `492ffdb` | патч | **4.3.3** | Show build version next to the STL-ГЕНЕРАТОР header |
| 126 | `c053b95` | мажорный | **5.0.0** | Keycaps: parametric caps with MX/Choc stems, legend, and two-colour AMS mode |
| 127 | `94d361e` | минорный | **5.1.0** | Keycap profiles dropdown: Cherry / OEM / SA / MDA / XDA / DSA + rows R1-R4 |
| 128 | `3f8f5b8` | патч | **5.1.1** | Keycap presets: dish depth 0; legend rotated 180 degrees |
| 129 | `786ce0e` | минорный | **5.2.0** | Import STL/OBJ meshes with live rescaling (basis for scan-based grips) |
| 130 | `2b5df0a` | мажорный | **6.0.0** | Die face bead frame (валик) + flat perforated sheet/panel |
| 131 | `052592d` | минорный | **6.1.0** | Dice vertex studs (ornate look) + sheet raised-texture mode (grip pads) |
| 132 | `f12157a` | минорный | **6.2.0** | Sheet: arbitrary outline from an imported SVG contour |
| 133 | `ec1a02c` | патч | **6.2.1** | Grip texture full-coverage (whole outline) + round-basket recipe verified |
| 134 | `3d1c512` | минорный | **6.3.0** | Squircle container: full lattice walls + floor (clean round basket, no slicer errors) |
| 135 | `6bc6bbc` | патч | **6.3.1** | Squircle net: fix ragged wall/floor lattice (anti-alias the ring grid) |
| 136 | `e1dd251` | патч | **6.3.2** | Squircle net v64: seamless commensurate wall + full-coverage floor |
| 137 | `443d063` | патч | **6.3.3** | Squircle wall net v65: resolve rib thickness so thin-rib patterns connect |
| 138 | `7edd0b2` | патч | **6.3.4** | Sheet grip texture + net: rib-aware sampling (v66) |
| 139 | `2d84169` | патч | **6.3.5** | Sheet back chamfer + collapse-by-default UI panel (v67) |
| 140 | `b2a801c` | минорный | **6.4.0** | UI: tabbed panel + parameter search + mode-relevance hiding (v68) |
| 141 | `392ab1b` | минорный | **6.5.0** | UI: dedicated always-visible base-shape picker (v69) |
| 142 | `10f2d2a` | патч | **6.5.1** | UI: fix initial tab filtering (v70) |
| 143 | `7bc5c51` | патч | **6.5.2** | UI fix: base-shape detail groups were hidden (v71) |
| 144 | `9946007` | патч | **6.5.3** | UI: all panel sections collapsed by default, state remembered (v72) |
| 145 | `a36c78e` | мажорный | **7.0.0** | Add threaded parts: screw cap + stud (v73) |
| 146 | `fe4865a` | минорный | **7.1.0** | Threaded jar mode: hollow vessel with an external-threaded neck (v74) |
| 147 | `fac425b` | патч | **7.1.1** | Thread lead-in chamfer for self-starting threads (v75) |
| 148 | `85db834` | мажорный | **8.0.0** | Print-in-place hinge — new base shape (v76) |
| 149 | `2272d36` | минорный | **8.1.0** | Print-in-place: mounting holes, hinged box, snap clip (v77) |
| 150 | `1b8b7d5` | минорный | **8.2.0** | Print-in-place: cable tie + split clamp (v78, roadmap #2 complete) |
| 151 | `04a5155` | мажорный | **9.0.0** | Involute spur gear — new base shape (v79, roadmap #3 start) |
| 152 | `8d23d06` | минорный | **9.1.0** | Gears: helical, rack, GT2 pulley, ratchet (v80, roadmap #3 complete) |
| 153 | `62ade36` | мажорный | **10.0.0** | Mounts & fasteners: L-bracket, VESA, heat-set bosses (v81, roadmap #4) |
| 154 | `70830f8` | минорный | **10.1.0** | TPMS lattice infill: gyroid / Schwarz-P / diamond (v82, roadmap #5 complete) |
| 155 | `b5d5544` | минорный | **10.2.0** | Optional extensions: gear keyway + hub, TPMS density gradient (v83) |
| 156 | `f6e2255` | минорный | **10.3.0** | Optional extension: tool-holder mount (v84) |
| 157 | `4ef0733` | минорный | **10.4.0** | Optional: threaded container of any footprint + pipe standoff bracket (v85) |
| 158 | `ff17fd4` | минорный | **10.5.0** | Optional: spoked/lightened gear web + bevel (conical) gear (v86) |
| 159 | `bce7928` | мажорный | **11.0.0** | Optional: hooks — wall-mount and pipe-clip (any Ø) (v87) |
| 160 | `3c42e38` | патч | **11.0.1** | Polish: TPMS shape, cap sealing bead, tidier pipe-hook neck (v88) |
| 161 | `f713133` | патч | **11.0.2** | Add roadmap v2 to IDEAS.md (new functional classes + cross-cutting features) |
| 162 | `da4903e` | мажорный | **12.0.0** | Roadmap v2 A: wall organiser — French cleat / pegboard (v89) |
| 163 | `bd6e89b` | минорный | **12.1.0** | Roadmap v2 C: hex bolt + nut + wingnut on the thread engine (v90) |
| 164 | `a500451` | мажорный | **13.0.0** | Roadmap v2 B: project box enclosure — tray + drop-in lid (v91) |
| 165 | `cfbb936` | патч | **13.0.1** | Hook/organiser refinements: 135° cleat, top-pin lip, rounded tips, flipped hooks (v92) |
| 166 | `ac78371` | патч | **13.0.2** | Pipe hook: side-exit hook + snap latch on the saddle ring (v93) |
| 167 | `0b786cb` | минорный | **13.1.0** | Roadmap v2 D: belt pulleys — V-belt + round-belt (v94) |
| 168 | `1ada86b` | патч | **13.1.1** | Pipe hook: ring-on-top, J-hook hangs straight down (v95) |
| 169 | `d8a7ad1` | патч | **13.1.2** | Pipe hook: remove latch, turn the collar 90° (pipe axis → Z) (v96) |
| 170 | `a58453f` | патч | **13.1.3** | Roadmap: add the v96 review punch list (bugs + refinements) |
| 171 | `c4da06d` | патч | **13.1.4** | Fix all five blocking bugs from the v96 review (v97) |
| 172 | `cc3355a` | патч | **13.1.5** | Clamshell: 45° self-supporting gussets under the hinge tongues (v98) |
| 173 | `8fdf590` | патч | **13.1.6** | Clamshell: hinge tongues become 45° wedges instead of square blocks (v99) |
| 174 | `c8371ea` | патч | **13.1.7** | Review refinements batch: cleat reinforcement, pin barb, collar mouth, keyways (v100) |
| 175 | `f57dc35` | минорный | **13.2.0** | Project box takes connector cutouts; L-bracket ribs, hole count, countersinks (v101) |
| 176 | `2847d5c` | минорный | **13.3.0** | Separable hinges, Z-up export, view gizmo, cleat reinforcement fix (v102) |
| 177 | `da1fffb` | минорный | **13.4.0** | PCB board presets for the enclosure; fix the view gizmo on mobile (v103) |
| 178 | `8d5c855` | мажорный | **14.0.0** | Phone/tablet stand base shape; reconcile the roadmap with the code (v104) |
| 179 | `dd276c8` | минорный | **14.1.0** | Cable gland thread mode + one global fit-tolerance slider (v105) |
| 180 | `e3844f0` | минорный | **14.2.0** | Furniture foot / glide as a mount mode (v106) |
| 181 | `94a0f8a` | минорный | **14.3.0** | Fit-clearance calibration print (v107) |
| 182 | `95789c7` | минорный | **14.4.0** | Worm for a worm drive (v108) |
| 183 | `b1535b8` | минорный | **14.5.0** | Cam with a harmonic profile (v109) |
| 184 | `793acde` | минорный | **14.6.0** | Drywall anchor + dovetail slide (v110, theme C) |
| 185 | `93d2a3d` | минорный | **14.7.0** | Cam follower — completes the cam pair (v111) |
| 186 | `41ad57c` | минорный | **14.8.0** | Worm wheel — completes the worm drive (v112) |
| 187 | `2b1c912` | мажорный | **15.0.0** | Funnel base shape + fix the base-shape picker needing two clicks (v113) |
| 188 | `fb7c841` | минорный | **15.1.0** | Planetary gearset — the roadmap's "wow" item (v114) |
| 189 | `4d3e35a` | минорный | **15.2.0** | Registration pins on slicer cuts + fix cap triangulation with holes (v115) |
| 190 | `689923b` | патч | **15.2.1** | Slicer: fix curved cross-sections coming apart at the seams (v116) |
| 191 | `0118360` | патч | **15.2.2** | Remove the TPMS lattice feature (v117) |
| 192 | `ec3b4e3` | патч | **15.2.3** | Slicer: close out the remaining curved-section defects (v118) |
| 193 | `fdeedb1` | минорный | **15.3.0** | Labels on any base shape — top-5 item #2 (v119) |
| 194 | `fdb8b8d` | патч | **15.3.1** | Roadmap: strike the project-box logo item, closed by v119 |
| 195 | `50412ab` | минорный | **15.4.0** | Universal joint (карданчик), print-in-place — v120 |
| 196 | `4be3fda` | минорный | **15.5.0** | Globoid (throated) worm wheel — v121 |
| 197 | `1f33aba` | патч | **15.5.1** | Fix four reported bugs: dovetail socket, L-bracket holes, planetary mesh, stand slot — v122 |
| 198 | `2c4a8ec` | минорный | **15.6.0** | Rotary-drum doser on the funnel base shape — v123 |
| 199 | `bd4a6f2` | минорный | **15.7.0** | Calibration prints: temperature tower, bridge/overhang, retraction — v124 |
| 200 | `11594ef` | минорный | **15.8.0** | Honeycomb wall system: panel + hex-tab holders — v125 |
| 201 | `ba1b931` | патч | **15.8.1** | Run the test battery in parallel: ~30 min to 3m40s |
| 202 | `8279af2` | минорный | **15.9.0** | Battery holder for AA / AAA / 18650 and the rest — v126 |
| 203 | `ca35765` | минорный | **15.10.0** | Derived hooks (v127) and vase / lampshade (v128) |
| 204 | `a49c8a3` | патч | **15.10.1** | Labels read mirrored on three faces out of six — v129 |
| 205 | `cf259ed` | минорный | **15.11.0** | Edge chamfer as a general modifier — v130 |
| 206 | `d7935e6` | минорный | **15.12.0** | Assembly preview: the mate, placed where it would sit — v131 |
| 207 | `1f78667` | патч | **15.12.1** | Edge chamfer takes round footprints: all half-spaces in one pass — v132 |
| 208 | `b0a2403` | минорный | **15.13.0** | Panel search reaches every base shape — v133 |
| 209 | `effc1d8` | патч | **15.13.1** | Labels on the side faces stop lying on their side — v134 |
| 210 | `ebb031c` | патч | **15.13.2** | Hook + pipe: the builder publishes its own datum — v135 |
| 211 | `537495d` | минорный | **15.14.0** | Tray + lid and Gridfinity bin + baseplate: the pair list is complete — v136 |
| 212 | `b9046ee` | патч | **15.14.1** | Both open items closed, plus a code and documentation review — v137 |
| 213 | `e6a75db` | патч | **15.14.2** | Pipe hook: the defect was mine, not the builder's — v138 |
| 214 | `b790518` | патч | **15.14.3** | Edge chamfer follows each shell's own outline; hollow parts finally get one — v139 |
| 215 | `a64711e` | минорный | **15.15.0** | Threaded cap with a pouring funnel, hook plate centred, inverted seam column fixed — v140 |
| 216 | `a683354` | патч | **15.15.1** | The worm wheel is no longer drawn — it is CUT, and the pair finally turns — v141 |
| 217 | `943a137` | патч | **15.15.2** | Doser hopper leaked round its own floor, and every bore in the app had an inverted column — v142 |
| 218 | `7eb6039` | патч | **15.15.3** | Stopped grepping for inverted triangles and wrote the detector; it found seventeen more — v143 |
| 219 | `e0ac697` | минорный | **15.16.0** | It was never a funnel — it was an applicator spout — v144 |
| 220 | `d41da81` | патч | **15.16.1** | IDEAS: the jar/hex-panel chamfer note was stale — remeasured across 30 shapes |
| 221 | `758a2a0` | патч | **15.16.2** | The chamfer stopped going silent: 26 shapes of 30 get cut, the other four say why — v145 |
| 222 | `deecd1c` | патч | **15.16.3** | Code and documentation review: one real hole, one badly stale README — v146 |
| 223 | `9245d94` | минорный | **15.17.0** | Latches on the clamshell case, with an adjustable count — v147 |
| 224 | `5795e22` | минорный | **15.18.0** | Cycloidal reducer — and the profile had to be enveloped, not drawn — v148 |
| 225 | `2d6fb44` | патч | **15.18.1** | IDEAS: write down the v3 roadmap of new shapes |
| 226 | `697c831` | минорный | **15.19.0** | Roadmap written down; lead screw done, bevel pair NOT finished — v149 |
| 227 | `7c74dc7` | минорный | **15.20.0** | Conjugate bevel pair finished — and it is conjugate by measurement, not by looks — v150 |
| 228 | `28366cb` | минорный | **15.21.0** | Neck adapter: two different threads back to back — and one key that held two fields — v151 |
| 229 | `fee6034` | минорный | **15.22.0** | Auger: the same helical surface, a different profile — v152 |
| 230 | `850d792` | минорный | **15.23.0** | Corkscrew — and under it the first path in this app that leaves a plane — v153 |
| 231 | `586b221` | минорный | **15.24.0** | Hose barb — group B closed — v154 |
| 232 | `ac453b4` | минорный | **15.25.0** | Cantilever snap-fit, sized rather than drawn — v155 |
| 233 | `c263402` | минорный | **15.26.0** | Print-in-place ball joint — v156 |
| 234 | `48936ea` | минорный | **15.27.0** | Print-in-place chain — and three guesses at where the links catch — v157 |
| 235 | `eb6dfd4` | минорный | **15.28.0** | Living hinge: one part, one dimension, one counter-intuitive rule — v158 |
| 236 | `ca31d6d` | минорный | **15.29.0** | v159 — телескопическая труба; группа C дорожной карты закрыта |
| 237 | `145a13f` | патч | **15.29.1** | WIP v160 — экструдер произвольного контура вдоль Y |
| 238 | `dc40a89` | минорный | **15.30.0** | v160 — экструдер произвольного контура вдоль Y; мальтийский механизм |
| 239 | `9e1b86a` | минорный | **15.31.0** | v161 — роторы Roots; группа A дорожной карты закрыта |
| 240 | `20ea8b0` | минорный | **15.32.0** | v162 — калибр go/no-go |
| 241 | `6b6427a` | минорный | **15.33.0** | v163 — шаблон радиусов |
| 242 | `70a6b5d` | минорный | **15.34.0** | v164 — шаблон шага резьбы; группа D дорожной карты закрыта |
| 243 | `4172749` | минорный | **15.35.0** | v165 — гребёнка кабелей |
| 244 | `df8315a` | минорный | **15.36.0** | v166 — держатель на кромку (монитор / дефлектор) |
| 245 | `065a9e6` | минорный | **15.37.0** | v167 — двустенный подстаканник; группа E дорожной карты закрыта |
| 246 | `773fb4e` | минорный | **15.38.0** | v168 — лофт между разными контурами; дорожная карта пройдена полностью |
| 247 | `0fcdf00` | патч | **15.38.1** | v169 — перекрывающиеся треугольники в крышках; цифры на шаблонах |
| 248 | `c4a3354` | патч | **15.38.2** | BUGS.md: пять групп «печати в сборе» привязаны к кубу вместо петли |
| 249 | `0973362` | патч | **15.38.3** | v170 — пять групп «печати в сборе» вернулись к петле |
| 250 | `0c2980c` | минорный | **15.39.0** | v171 — сдвиг камеры в предпросмотре |
| 251 | `a798be3` | минорный | **15.40.0** | v172: настройки показывают только то, что относится к выбранной подмодели |
| 252 | `c2ed27b` | минорный | **15.41.0** | v173: выбор разновидности вынесен из аккордеона наверх, плиткой |
| 253 | `a6224b8` | патч | **15.41.1** | v174: заголовок называет разновидность, своё отделено от общего |
| 254 | `415ac69` | минорный | **15.42.0** | v175: справка по выбранной модели и всплывающие подсказки у параметров |
| 255 | `8ca4eff` | патч | **15.42.1** | IDEAS: чехлы для телефонов сняты, план по UI закрыт |
| 256 | `a1cc4c2` | минорный | **15.43.0** | v176: шаблон шага стопкой + вариант для гаек, шаблон диаметров, общий просвет |
| 257 | `a0925c8` | патч | **15.43.1** | v177: кромка шаблона резьбы выгнута, зубцы наклонены под руку резьбы |
| 258 | `e5cf7d7` | патч | **15.43.2** | v178: наклон зубцов со знаком, разлёт ±3° — минус мерит левую резьбу |
| 259 | `48eeae9` | патч | **15.43.3** | v179: чаша кейкапа в одной плоскости — Cherry и OEM снова похожи на себя |
| 260 | `50398fe` | минорный | **15.44.0** | v180: 18 профилей кейкапов, 6 рядов и собственный ряд пробела |
| 261 | `fe268a6` | минорный | **15.45.0** | v181: стабилизаторы — на широкой клавише три стема вместо одного |
| 262 | `497c2dd` | патч | **15.45.1** | v182: расстояние стабилизаторов у 2.25u и 2.75u исправлено |
| 263 | `fc033fb` | патч | **15.45.2** | v183: юнит 19.05 мм, MT3 исправлен по независимым источникам |
| 264 | `9867a5d` | патч | **15.45.3** | v184: общая справка снизу убрана, у кейкапа — порядок печати через AMS |
| 265 | `a36fadd` | патч | **15.45.4** | v185: вставка с легендой больше не пустая плита |
| 266 | `9dbbe91` | патч | **15.45.5** | v186: вставка AMS обходит стем — два объекта больше не делят объём |
| 267 | `2a8a41d` | патч | **15.45.6** | v187: цветной логотип перестал выходить одним контуром |
| 268 | `6957577` | минорный | **15.46.0** | v188: три тона нельзя показать двумя уровнями — ступенчатый рельеф логотипа |
| 269 | `a043ac2` | мажорный | **16.0.0** | v189: подстаканник — логотип снизу, два цвета через AMS |
| 270 | `45ef29d` | минорный | **16.1.0** | v190: у подстаканника столько цветов, сколько тонов в логотипе |
| 271 | `0949988` | минорный | **16.2.0** | v191: логотип на подставке — спинка и передний борт |
| 272 | `9c8d648` | минорный | **16.3.0** | v192: свет в предпросмотре и настройки слайсера в справке |
| 273 | `5e746a1` | патч | **16.3.1** | v193: оформление страницы |
| 274 | `d93f289` | патч | **16.3.2** | формат версии v1.2.3 и объёмная надпись STL в шапке |
| 275 | `afc0aa1` | патч | **16.3.3** | VERSION.md: последняя строка не может нести собственный хеш |
| 276 | `cdba202` | патч | **16.3.4** | панель не съезжает от появления полосы прокрутки |
| 277 | `2a5884b` | патч | **16.3.5** | карман подстаканника: шаг сетки в миллиметрах, а не числом ячеек |
| 278 | `868aaf6` | минорный | **16.4.0** | цвета деталей читаются с картинки; логотип ограничен своей формой, а не кубом |
| 279 | `60f1f04` | патч | **16.4.1** | 3MF несёт цвет каждой детали, а не только геометрию |
| 280 | `0d726f1` | патч | **16.4.2** | 3MF: детали AMS-сборки уходят частями одного объекта, каждая со своим филаментом |
| 281 | `85f1407` | патч | **16.4.3** | две детали одного тела больше не делят филамент; вставка кейкапа рождается своим цветом |
| 282 | `723092f` | минорный | **16.5.0** | цветная печать логотипа (AMS) на любой базовой форме, а не только на подстаканнике |
| 283 | `(эта сборка)` | патч | **16.5.1** | двухцветная игральная кость: цифры уходят отдельной деталью со своим филаментом |
