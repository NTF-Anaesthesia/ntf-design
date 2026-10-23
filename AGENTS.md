# ntf-design

The NTF Anaesthesia design kit (see README.md). Rules:

- Follow DESIGN.md and DESIGN-APP.md; keep `/v1/` backward compatible (breaking changes go in a new `/v2/`).
- Static files only: no build step, no secrets, no data. Plain British English, no emoji.
- Check a change in `public/v1/specimen.html` at 390 px before merging.

## Private notes and repo layout

Private notes: `NTF-Anaesthesia/ntf-hub-attach-always` (private, org members only). At the start of a session attach it
(`add_repo`) and read its `AGENTS.md`; save lasting notes there, never here. Repo layout: one repo per app or app
group, public code plus a `-private` pair; this repo has no pair (no notes or data); notes go in the hub. A new app
gets its own repo (test in ntf-hub-attach-always `hub/new-repo.md`), never a folder here.
