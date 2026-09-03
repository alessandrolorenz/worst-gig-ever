# Global Continuation Gate

Before moving from one milestone to the next, confirm:
- current branch and HEAD recorded;
- worktree understood;
- `git diff --check` green;
- project verification green;
- no unplanned scope expansion;
- no credentials/build artifacts committed;
- no Git push performed by the orchestration;
- meaningful deviations have a spec/ADR note;
- next milestone preconditions are actually satisfied.

If a gate fails, fix the current milestone before continuing. Never bury a failure and proceed.
