# Execute M13 — Rhythm MVP Candidate

Read M13 and all prior reached rhythm-pivot specs.

Tasks:

1. Run the complete automated gate.
2. If Android tooling is available, run the known-good local native validation workflow.
3. Fix only objective defects needed to make the existing candidate runnable/readable.
4. Do not tune BPM, timing windows, target speed, spawn cadence, hitboxes, or integrity based on your own judgement.
5. Create/update a physical-playtest checklist using M13 questions.
6. Record exact device/emulator/build facts.
7. Stop at `READY_FOR_RHYTHM_PLAYTEST`.

Run `docs/verification/M13-gate.md`.

If green, local commit:

`chore: prepare M13 rhythm MVP playtest candidate`

Do not push.
Do not run EAS.
