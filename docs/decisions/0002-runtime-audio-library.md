# ADR 0002 — Runtime audio library: expo-audio

- Status: Accepted
- Date: 2026-08-30
- Milestone: M0–M2 fast track

## Context

M2 requires an audio module supporting preload, music play/pause/resume, stop/restart, one-shot SFX, and cleanup on unmount (AGENTS.md rule 11). The template ships **no audio package at all** — neither `expo-av` nor `expo-audio` was installed. React Native has no built-in audio playback, so the existing stack cannot satisfy the requirement (AGENTS.md rule 18 is met).

## Decision

Add `expo-audio` (0.4.9, MIT) as the runtime audio library. It was installed with `npx expo install expo-audio` so the version matches Expo SDK 53, and it registered its config plugin in `app.json`.

`expo-av` was rejected: it is deprecated in SDK 53 and slated for removal, so choosing it would mean a forced migration during or shortly after the MVP.

No MIDI runtime dependency is added (AGENTS.md rule 10). The `.mid` file is provenance only.

## Consequences

- The package is installed but **not yet imported**. The audio service is written in M4 slice 6; nothing in this bootstrap plays sound.
- `expo-audio` includes native code, so the existing development client must be rebuilt (`npm run build:dev`, or a new EAS dev build) before audio is exercised on a device. Metro-only reloads will not pick it up. JS bundling already succeeds for both android and web exports.
- Audio lifecycle (stop/release on pause, quit, restart, unmount) is a required M4 review point, not something the library handles automatically.
