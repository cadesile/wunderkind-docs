# economy-loose-ends

Briefs, reports, decisions and evidence for the Wunderkind Factory **economy** workstream.

**Start at [`INDEX.md`](./INDEX.md)**, then [`next-work-plan.md`](./next-work-plan.md) — the live
queue, review log and every decision taken.

## Why this lives outside the code repositories

Owner's standing rule: **nothing scratch-shaped inside `wunderkind-app` or `wunderkind-backend`.**
Reports, dumps and working notes go here; `.context/` in each code repo carries what is *now true*,
and these files carry *what proves it*.

Moved here from `docs/economy-loose-ends` on 2026-11-19 so the record is version-controlled.
⚠️ **The old path is a symlink to this folder**, so absolute paths in existing briefs still
resolve. Agent briefs written from now on should use this path directly.

## Conventions

- **Every file opens with a `**STATUS:**` line** — active, committed-but-undeployed, deployed, or
  historical. Read it before trusting a file's contents: some reports were later overturned, and
  the status line says which won.
- **One brief and one report per task**, named `<task>-brief.md` / `<task>-report.md`.
- **Verbatim output, never summarised.** Run output belongs in a `<task>-run-<date>/` directory
  beside its report.
- [`agent-standing-notes.md`](./agent-standing-notes.md) is read with every agent brief.
