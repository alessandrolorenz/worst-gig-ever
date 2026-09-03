# M7 Verification Gate

Automated:
1. `git diff --check`
2. `npm run type-check`
3. `npm run lint`
4. `npm test`
5. `npm run verify`
6. `npx expo export --platform android`
7. `npx expo export --platform web`

Required behavior tests:
- same seed → same performer interaction schedule;
- `none` preserves original trajectory behavior;
- `dodge` does not resolve/remove target;
- `clip` does not resolve/remove target;
- clip deflection stays within fairness bounds;
- target remains hittable after dodge/clip;
- eventual miss consumes exactly one integrity;
- eventual player hit scores exactly once;
- vocalist special event triggers exactly once;
- pause freezes gameplay timing;
- frame-rate independence remains within existing contracts.

Visual smoke when available:
- observe at least one dodge and clip;
- reaction reads as animation, not teleportation;
- projectile remains visually trackable;
- band reactions do not hide target corridor.

PASS means ready for M8.
