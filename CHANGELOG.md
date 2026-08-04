# Changelog

## [Unreleased]

### Added
- **AGENTS.md**: add rule that every code change MUST have a corresponding changelog entry in `CHANGELOG.md` before committing.

### Changed
- **heritage-buddy-app/src/lib/bluetooth.ts**: BLE UART discovery retry with backoff (3 attempts) instead of a hard 3.5s delay; register `onDisconnected` only after discovery succeeds so a failed discover no longer kills a live connection.
- **package.json / package-lock.json**: add `@react-native/jest-preset` override + dev dependency for Jest compatibility.
- **.gitignore**: ignore `.vscode/` and `compile_commands.json` (local editor/build artifacts).

### Removed
- **heritech_robot/examples/**: delete `move_20cm` test-mode example sketch.

### Docs
- **CHANGELOG_BLE_FIX.md**: keep detailed write-up of the BLE discovery fix (root cause + before/after).
