# M25 — final device validation

**This is the current device-validation authority for Worst Gig Ever.**

It supersedes the M24D checklist, which was never executed and must not be
reported as passed. See "M24 closure" below.

Every box here is **PENDING OWNER**. Nothing in this file may be ticked by
anyone but the owner, on a physical device, against the build named below.
Automated results live in the milestone report and are deliberately not
repeated as if they were device evidence.

## The build under test

| | |
| --- | --- |
| APK | `build-out/worst-gig-ever-friends.apk` |
| Version | 1.3.0 (versionCode 8) |
| Package | `com.worstgigever.app` |
| SHA-256 | `27d6556db641f9f700032cddc127c0decfd3f15474f15bd8d408aaffd8bb2d81` |
| Commit | `f29e824` |
| Signing | Debug keystore — test distribution only |
| Metro required | No |

Full identity: `build-out/worst-gig-ever-friends.txt`.

## Why this replaced M24D

M24's formal physical validation was deliberately **not** run before M25.
Validating a build and then immediately changing the first screen, the title
screen and the results screen would have produced evidence about a build that
no longer exists. The device pass was therefore deferred to this one, after the
polish landed. M24's feature work is complete and its automated gates pass;
what was outstanding was always the physical pass, and this is it.

---

## First launch

Install onto a device with **no previous version of the app**, or uninstall
first. A save file left over from 1.2.0 already holds a language and will
correctly skip the chooser, which is the wrong starting condition for this
section.

- [ ] the language screen appears **before** the story
- [ ] nothing readable flashes before the language screen
- [ ] English selection works
- [ ] pt-BR selection works
- [ ] the story is in the selected language from its **first** panel
- [ ] the selection persists after a cold start (force-stop, reopen)
- [ ] the language chooser does **not** return on the second launch
- [ ] the language control on the title still changes the language
- [ ] the language control in the pause overlay still changes the language

Cold-start script, once per language:

```
choose Português -> story appears in Portuguese -> kill the app
  -> reopen -> no chooser -> still Portuguese
choose English   -> story appears in English    -> kill the app
  -> reopen -> no chooser -> still English
```

## Progression clarity

- [ ] the locked Custom Setlist line is visible on the title before completion
- [ ] it is clear that completing the full show is what unlocks it
- [ ] the locked line is **not** pressable and opens nothing
- [ ] the builder cannot be reached by any other route while locked
- [ ] after the show is survived, the locked line is gone and the button is there
- [ ] the two are never both on screen

## Art

- [ ] the corrected character backgrounds appear correctly in play
- [ ] no owner art has reverted to the old edges
- [ ] no visible halo or background fragment on the four corrected vocalist frames
- [ ] the vocalist reads consistently across her frames

The four frames the owner corrected are `vocalist_blocking`,
`vocalist_dodge`, `vocalist_hit_reaction` and `vocalist_loop_a`.
`vocalist_idle` and `vocalist_loop_b` were **not** part of that pass and
still carry their original edges — worth a specific look, since idle and loop_a
alternate during ambient motion.

- [ ] idle / loop_a / loop_b do not visibly differ in edge quality while animating

## Beer statistic

- [ ] the count starts at zero on every attempt
- [ ] it increments only when the drummer actually drinks a mug
- [ ] a mug smashed far away does not increment it
- [ ] a mug that gets through does not increment it
- [ ] the count is displayed correctly on the stage results
- [ ] retrying a stage restarts its count at zero
- [ ] the full-show total is correct across the run
- [ ] a ruined show does not report a show total
- [ ] the number is believable against what you remember drinking

## Custom setlist

- [ ] 11 tracks are offered
- [ ] the row preview plays the song
- [ ] preview does not accidentally choose the song
- [ ] choosing does not accidentally start a preview
- [ ] a chosen song can still be previewed
- [ ] four unique songs can be selected; a duplicate is refused
- [ ] Stage 2 custom music remains fun
- [ ] a complete custom run works end to end
- [ ] the saved setlist persists across a cold start
- [ ] the preview stops before the setlist preloads

## Regression

- [ ] the official show is unchanged — timing, difficulty, feel
- [ ] no DEV audition UI anywhere
- [ ] no audio overlap or double music
- [ ] no crash across a full run of both shows
- [ ] English layout: nothing clipped or overlapping
- [ ] pt-BR layout: nothing clipped or overlapping
- [ ] the results screen fits with the unlock banner, the setlist line and the
      beer line all present at once (finish a custom show for the first time)

## Sign-off

| | |
| --- | --- |
| Device | |
| Android version | |
| Date | |
| Result | |
| Notes | |
