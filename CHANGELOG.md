# Changelog

## [Unreleased]

### Added
- **AGENTS.md**: add rule that every code change MUST have a corresponding changelog entry in `CHANGELOG.md` before committing.
- **plan-ver2.md**: REWRITE as the single official prototype plan — real system stays Line Tracer + Color Sensor (from V1–V3); new real features: two-way ACK interaction, SOS, phone speaker; AprilTag/Radar/OpenMV moved to report-only future direction (referencing `PLAN-APRILTAG.md`); sign-language recognition kept as optional P1 stretch; adds WARN-type protocol table, numeric targets/GATE 1–2, 15-day timeline + team split. Deadline 2026-08-20.
- **plan-apriltag.md**: AprilTag runbook (now a future-direction reference doc) — tag family/size, printing & mounting specs, camera calibration + pose scale check, map_config/route_config schemas, GATE 0 test plan, full tooling checklist, specific risks.
- **heritech_robot/src/main.cpp**: firmware now also handles app `ACK` (→ replies `STATUS:resumed`) and `SOS` (→ stop + red LED + buzzer + `STATUS:sos`). Build verified via PlatformIO (uno_r4_wifi).

### Changed
- **heritage-buddy-app/src/lib/bluetooth.ts**: BLE UART discovery retry with backoff (3 attempts) instead of a hard 3.5s delay; register `onDisconnected` only after discovery succeeds so a failed discover no longer kills a live connection.
- **package.json / package-lock.json**: add `@react-native/jest-preset` override + dev dependency for Jest compatibility.
- **.gitignore**: ignore `.vscode/` and `compile_commands.json` (local editor/build artifacts).

### Removed
- **heritech_robot/src/config.h + main.cpp**: remove TEST MODE (auto-simulated `WARN`/`NODE_START` cycle + `TEST_WARN:<type>`/`TEST_NODE` commands + `sendWarn`/`handleTestMode` helpers). Robot now relies solely on real autonomous line-following; node opening is triggered by the existing Color Sensor red detection (3 stable reads) → `NODE_START:<id>`, unchanged.
- **heritech_robot/examples/**: delete `move_20cm` test-mode example sketch.

### Docs
- **CHANGELOG_BLE_FIX.md**: keep detailed write-up of the BLE discovery fix (root cause + before/after).
