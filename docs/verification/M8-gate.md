# M8 Verification Gate

Automated:
1. `git diff --check`
2. `npm run type-check`
3. `npm run lint`
4. `npm test`
5. `npm run verify`
6. `npx expo export --platform android`
7. `npx expo export --platform web`
8. required art validation PASS
9. audio provenance/runtime contract PASS
10. no runtime MIDI dependency

Native gate when Android tooling exists:
- clean local native build or known-good `npx expo run:android` workflow;
- launches landscape;
- no fatal exception;
- audio native module loads;
- round starts;
- touch target resolution works;
- restart works after complete/ruined.

Do not run EAS.

Visual checklist:
- no graybox character blocks in normal mode;
- no debug target-radius ring in normal mode;
- no missing required asset;
- no obviously stretched characters;
- anchors stable across idle/loop/reaction;
- crowd does not cover HUD/critical targets;
- drum kit preserves central sightline;
- bottle/mug arcs visible;
- hit burst/shards appear at target location;
- dodge/clip does not teleport projectile;
- vocalist blocking reads clearly.

If all objective checks pass: `READY_FOR_OWNER_PLAYTEST`.
Subjective fun/appeal remains unresolved until human observation.
