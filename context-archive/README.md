# `.context` archive

Removed ICM history from `wunderkind-app/.context/`.

**No agent ever loads this folder.** It is here so that pruning `.context/` does not destroy
anything, and so a human can still grep for how a decision was reached. `.context/` holds
current state only; this holds what current state replaced.

## Rules

- One file per source doc, named `<stage>-<file>-history.md` (e.g.
  `shared-last-sync-history.md`, `07_synthesis-architecture-notes-history.md`).
- Each entry keeps its original date heading and text verbatim — no summarising, no re-editing.
  A summarised postmortem is a worse postmortem.
- Newest first within a file, so the most recently archived material is at the top.
- Nothing in `.context/` links here. Cross-references are one-way out of `.context/`
  (`_core/conventions.md:59`), and a pointer into the archive would pull an agent back into the
  tokens the pruning removed.
- This is not the place for anything still true. If a passage describes how the code works
  today, it belongs in a `.context/` stage output, however old the passage is.

## Why it exists

A read-only audit (`../context-review/context-review-agy.md`, 2026-11-20) found `.context/` had
become an append-only engineering diary: 1.93 MB, with corrections stacked *beneath* the wrong
sentences instead of replacing them. Current state and history had the same home, so reading
either one cost both. Splitting them is the fix; deleting the history is not.

## Contents

| File | Source | Archived |
|---|---|---|
| `shared-last-sync-history.md` | `.context/shared/last-sync.md` — 110 of its 114 passes | 2026-11-20 |
| `stray-competition-testing.md` | `.context/shared/competition-testing.md` (whole file) | 2026-11-20 |
| `07_synthesis-current-focus-history.md` | `…/output/current-focus.md` (whole file, 109 KB of shipped changelog) | 2026-11-20 |
| `07_synthesis-architecture-notes-history.md` | `…/output/architecture-notes.md` — the pre-hub tournament history | 2026-11-20 |
