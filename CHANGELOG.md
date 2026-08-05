# Changelog

## [Unreleased]

### Added
- **AGENTS.md**: add rule that every code change MUST have a corresponding changelog entry in `CHANGELOG.md` before committing.
- **plan-ver2.md**: REWRITE as the single official prototype plan — real system stays Line Tracer + Color Sensor (from V1–V3); new real features: two-way ACK interaction, SOS, phone speaker; sign-language recognition kept as optional P1 stretch; adds WARN-type protocol table, numeric targets/GATE 1–2, 15-day timeline + team split. Deadline 2026-08-20.
- **heritech_robot/src/main.cpp**: firmware now also handles app `ACK` (→ replies `STATUS:resumed`) and `SOS` (→ stop + red LED + buzzer + `STATUS:sos`). Build verified via PlatformIO (uno_r4_wifi).

### Added
- **TEST-INTERACTION.md**: full robot↔app interaction test list covering all features — preparation & room setup, BLE connect/reconnect, full tour flow, two-way `WARN:person`→ACK loop (incl. 10s timeout / auto-resume, PIR cooldown), SOS (app hold-≥2s, physical switch long-press, `RESUME` without tour reset, offline SOS), `WARN:turn_*` toasts (app-side testable via BLE UART terminal), legacy sensors (switch/gesture/voice/ALL_DONE), safety edge cases (BLE-loss auto-stop mid-run, mid-ACK drop, reconnect), speaker/TTS verification, and per-metric measurement tables (ACK <3s, banner <1s, SOS <2s, timeout 10s±1s, node accuracy) with GATE 1/2 pass criteria.
- **heritech_robot/src/main.cpp + state_machine.\* + config.h**: two-way ACK interaction & SOS on real firmware — `WARN:person` (PIR) replaces `ALARM`; robot pauses in FOLLOW_LINE → new `WAIT_ACK` state, waits `ACK` max 10s (`WARN_ACK_TIMEOUT_MS`) then auto-resumes + `STATUS:auto_resumed`; PIR suppressed while already `WAIT_ACK`; long-press ≥2s (`SOS_HOLD_MS`) on the Miniature Switch → SOS (stop + red LED + buzzer + `STATUS:sos`) vs short press → `SWITCH_PRESS`; new `RESUME` command to continue after SOS without resetting the tour (unlike `START`); safety `motors.stop()` on BLE disconnect so the robot never keeps running with a stale speed command.
- **heritage-buddy-app/src/components/robot-interaction-overlay.tsx**: new global overlay mounted in root layout that listens for `WARN:`/`STATUS:` BLE messages on every screen — full-screen `WARN:person` banner (mascot + TTS + big "Đã hiểu / Tiếp tục" ACK + "Dừng lại" STOP buttons), transient `WARN:turn_*` toast, `STATUS` confirmation toasts, SOS flow (fixed hold-≥2s button → `SOS`, banner → `RESUME`), 10.5s app-side fallback banner dismiss if BLE drops mid-loop.

### Changed
- **plan-ver2.md**: drop AprilTag/Radar entirely — Line Tracer + Color Sensor is the official sole navigation architecture, no future-direction section (removes references to `PLAN-APRILTAG.md`, which was never committed); `WARN:person` (PIR) replaces `ALARM` as the ACK pause source; SOS = long-press ≥2s on the existing Miniature Switch + app button; explicit ACK semantics table (person pauses + 10s `WARN_ACK_TIMEOUT_MS` timeout → `STATUS:auto_resumed`; turn warnings announce-only at the junction, `WARN:node` dropped as redundant with `NODE_START`); add BLE-loss auto-stop safety (`motors.stop()` on disconnect); fix dashboard polling 2s vs <5s target contradiction; reorder stages — software & interaction first, movement second; feature freeze from 17/08; fix section numbering.
- **heritage-buddy-app/src/lib/bluetooth.ts**: BLE UART discovery retry with backoff (3 attempts) instead of a hard 3.5s delay; register `onDisconnected` only after discovery succeeds so a failed discover no longer kills a live connection.
- **heritage-buddy-app/src/store/robot.ts**: add `activeWarn`, `robotStatus`, `sosActive` + setters.
- **heritage-buddy-app/src/types/robot.ts**: add `WARN:<type>` / `STATUS:<state>` to robot→app commands and `ACK` / `SOS` / `RESUME` to app→robot commands; add `WarnType`, `RobotStatusType`.
- **heritage-buddy-app/src/hooks/use-robot-connection.ts**: parse `WARN:`/`STATUS:` messages so they no longer log as unknown commands.
- **heritage-buddy-app/server/index.js**: add `/* global __dirname */` header to fix ESLint `no-undef`.
- **package.json / package-lock.json**: add `@react-native/jest-preset` override + dev dependency for Jest compatibility.
- **.gitignore**: ignore `.vscode/` and `compile_commands.json` (local editor/build artifacts).

### Removed
- **heritech_robot/src/config.h + main.cpp**: remove TEST MODE (auto-simulated `WARN`/`NODE_START` cycle + `TEST_WARN:<type>`/`TEST_NODE` commands + `sendWarn`/`handleTestMode` helpers). Robot now relies solely on real autonomous line-following; node opening is triggered by the existing Color Sensor red detection (3 stable reads) → `NODE_START:<id>`, unchanged.
- **heritech_robot/examples/**: delete `move_20cm` test-mode example sketch.

### Docs
- **CHANGELOG_BLE_FIX.md**: keep detailed write-up of the BLE discovery fix (root cause + before/after).
- **PLAN-BLE-FIX.md**: new fix plan for the current BLE discovery timeout (robot connects but `UART service not found`) — 4 hypotheses (H1 blocking poll in old firmware / H2 discovery too early / H3 Android GATT cache / H4 monitor_speed mismatch), prioritized fixes per layer (firmware non-blocking poll + debug loop-time log, app 500ms settle delay + larger backoff + auto-retry, GATT cache runbook, `monitor_speed` 115200→9600), test matrix (10 connects, reconnect, reboot) and Definition of Done (≥9/10 success, discovery <3s).
