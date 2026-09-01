# M10 Verification Gate

Automated:

1. `git diff --check`
2. `npm run type-check`
3. `npm run lint`
4. `npm test`
5. `npm run verify`
6. `npx expo export --platform android`
7. `npx expo export --platform web`

Required rhythm tests:

- beat interval derives from BPM, not frame count;
- first 2 beats are count-in and never scored;
- PERFECT at 0 ms error;
- +/-90 ms boundary is PERFECT;
- >90 and <=180 ms is GOOD;
- >180 ms is not a hit;
- one beat cannot score twice;
- extra pad taps do not create negative score;
- missed beat resets rhythm streak;
- missed beat does not reduce Show Integrity;
- pause does not advance/judge beats;
- vocalist event continues beat progression;
- identical elapsed-time/tap schedule produces identical rhythm results at different tick sizes.

Regression:

- target/bottle hit tests unchanged;
- defense score behavior unchanged;
- input coordinate mapping unchanged;
- current target arcs unchanged.

Visual smoke when available:

- pad pulse visible at phone/emulator scale;
- pad alignment sits on the intended cymbal;
- pulse does not intercept touch events;
- stage-light overlay does not make pulse unreadable.

PASS means ready for M11.
