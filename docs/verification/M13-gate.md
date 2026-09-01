# M13 Verification Gate

Automated:
1. `git diff --check`
2. `npm run type-check`
3. `npm run lint`
4. `npm test`
5. `npm run verify`
6. `npx expo export --platform android`
7. `npx expo export --platform web`

Native when available:
- clean local Android build or known-good run workflow;
- app launches in landscape;
- no fatal exception;
- audio native module loads;
- round starts;
- pad taps are recognized;
- target taps are recognized;
- simultaneous/rapid alternating interaction does not crash;
- pause/resume works;
- background auto-pause works;
- vocalist event preserves Groove;
- both terminal outcomes restart cleanly.

Regression:
- no EAS command run;
- no remote mutation;
- no audio sync dependency added;
- no MIDI runtime dependency;
- deterministic tests green.

If all objective checks pass:
`READY_FOR_RHYTHM_PLAYTEST`

Do not auto-tune subjective values afterward.
