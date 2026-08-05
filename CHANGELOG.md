# Changelog

## [Unreleased]

### Added
- **AGENTS.md**: add rule that every code change MUST have a corresponding changelog entry in `CHANGELOG.md` before committing.
- **plan-ver2.md**: REWRITE as the single official prototype plan — real system stays Line Tracer + Color Sensor (from V1–V3); new real features: two-way ACK interaction, SOS, phone speaker; sign-language recognition kept as optional P1 stretch; adds WARN-type protocol table, numeric targets/GATE 1–2, 15-day timeline + team split. Deadline 2026-08-20.
- **heritech_robot/src/main.cpp**: firmware now also handles app `ACK` (→ replies `STATUS:resumed`) and `SOS` (→ stop + red LED + buzzer + `STATUS:sos`). Build verified via PlatformIO (uno_r4_wifi).

### Changed
- **plan-ver2.md**: drop AprilTag/Radar entirely — Line Tracer + Color Sensor is the official sole navigation architecture, no future-direction section (removes references to `PLAN-APRILTAG.md`, which was never committed); `WARN:person` (PIR) replaces `ALARM` as the ACK pause source; SOS = long-press ≥2s on the existing Miniature Switch + app button; explicit ACK semantics table (person pauses + 10s `WARN_ACK_TIMEOUT_MS` timeout → `STATUS:auto_resumed`; turn warnings announce-only at the junction, `WARN:node` dropped as redundant with `NODE_START`); add BLE-loss auto-stop safety (`motors.stop()` on disconnect); fix dashboard polling 2s vs <5s target contradiction; reorder stages — software & interaction first, movement second; feature freeze from 17/08; fix section numbering.
- **heritage-buddy-app/src/lib/bluetooth.ts**: BLE UART discovery retry with backoff (3 attempts) instead of a hard 3.5s delay; register `onDisconnected` only after discovery succeeds so a failed discover no longer kills a live connection.
- **package.json / package-lock.json**: add `@react-native/jest-preset` override + dev dependency for Jest compatibility.
- **.gitignore**: ignore `.vscode/` and `compile_commands.json` (local editor/build artifacts).

### Removed
- **heritech_robot/src/config.h + main.cpp**: remove TEST MODE (auto-simulated `WARN`/`NODE_START` cycle + `TEST_WARN:<type>`/`TEST_NODE` commands + `sendWarn`/`handleTestMode` helpers). Robot now relies solely on real autonomous line-following; node opening is triggered by the existing Color Sensor red detection (3 stable reads) → `NODE_START:<id>`, unchanged.
- **heritech_robot/examples/**: delete `move_20cm` test-mode example sketch.

### Docs
- **CHANGELOG_BLE_FIX.md**: keep detailed write-up of the BLE discovery fix (root cause + before/after).
