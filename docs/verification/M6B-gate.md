# M6B Verification Gate

Automated:
1. `git diff --check`
2. `npm run type-check`
3. `npm run lint`
4. `npm test`
5. `npm run verify`
6. `npx expo export --platform android`
7. `npx expo export --platform web`
8. asset validation PASS
9. no runtime MIDI reference
10. no required Pack 1 path missing

Regression contracts:
- input still uses M5A surface/window mapping;
- visual children cannot become independent touch targets;
- target hit radii remain config-driven;
- double-scoring protection intact;
- throw endpoints/seed determinism intact;
- pause/background behavior intact.

Visual smoke on Android emulator/device when available:
- landscape composition;
- drum kit foreground;
- band readable behind projectile corridor;
- projectile visible through arc;
- no missing-image/clipping blocks;
- 3-frame loops visibly change;
- reaction frames anchor correctly.

PASS means ready for M7.
