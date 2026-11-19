<!-- STATUS: IN PROGRESS — session a23-retire-slots, started 2026-11-19 -->

# A23 — Retire `league.slots`; derive every division size

**Owner ruling, 2026-11-19: "Retire slots."** Following the standing ruling *"there should be
no wiring around the amount of clubs, the finances should be dynamic."*

**Start this in the desktop app.** Backend-led, with an app-side follow-on. cwd
`/Users/courtneyadesile/Documents/WunderkindFactory`, shares this checkout.

## What the owner has decided, and what they accepted

`LeagueSizeResolver`'s docblock (`src/Service/Economy/LeagueSizeResolver.php:20-52`) argues
`slots` must stay authored, because *"a derived divisor moves whenever somebody clicks
Generate"* and `League::$tvDeal` is a key shipped builds read. **The owner has heard that
argument and overridden it.** Implement the decision; do not relitigate it. Record it.

## The measured blast radius — verify this before you start

From the world export (`~/Downloads/wunderkind-world-2026-11-19.json`, 200 leagues, 3,175
clubs). `sizeOf()` derives NPC rows, +1 at the country's bottom division (the reserved player
slot).

| | rows t1-t(n-1) | rows bottom | authored | derived | change |
|---|---|---|---|---|---|
| **EN** | 16 | 15 | 16 | **16** | **none** |
| **SC** | 12 | 11 | 14 | **12** | **14 -> 12 at every tier** |

🟢 **England is unaffected** — the derivation reproduces 16 exactly at all eight tiers.
🔴 **Scotland is wrong at every tier**: each club gets 16.7% less TV than the pool intends and
2/14 of every Scottish pool is paid to nobody.

⚠️ **0 of 200 leagues currently have `slots = 0`**, so the derive path is effectively
unexercised in live data. ⚠️ Slots across all 200 are {10, 14, 16, 18, 20}; **other countries
have NOT been checked against their rows** and are out of scope — but say so in the report
rather than letting it surface later.

## The work

1. **`LeagueSizeResolver::sizeOf()`** — derive always; stop preferring authored `slots`. Keep
   the bottom-tier +1: it is the reserved player slot and England's t8 (15 rows -> 16) depends
   on it. Rewrite the docblock to record the owner's ruling and what was given up.
2. **`EconomyWageTableCommand.php:408-416`** states *"it must never be 'fixed' by making
   `sizeOf()` prefer the row count."* ⚠️ **Rewrite it; do not delete it silently.** That file
   explains the division-size check to whoever next reads a disagreement, and a comment
   contradicting the code is worse than either.
3. **Stop writing the field**: `LeagueAdminController.php:62-63` (form) and
   `LeagueImportExportService.php:260` (import). Decide and state whether the admin input is
   removed or shown read-only.
4. **The column**: prefer leaving `league.slots` in place, unread, over a drop migration —
   shipped builds may still read it, and the owner's scope is correctness now, not schema
   tidiness. If you disagree, argue it in the report rather than acting on it.
5. **App side** — `src/economy/harness/worldExport.ts` has a `slots − 1` -> `rows − 1` ->
   fallback chain, and `src/economy/economyDiagnostics.ts` prints `slots` and the
   `authored ≠ clubs` disagreement. With nothing authored, the DISAGREE row can never fire;
   decide what that check becomes and say so. ⚠️ **A19 is already briefed against the
   division-size check — read `a19-*.md` first and do not collide with it.**

## Constraints

- ICM: read `.context/CONTEXT.md` in each repo first.
- App on `new-game-save`, backend on `development`. Both clean at the time of writing: app
  `3569326b`, backend `9918839c`.
- Baselines: app `npm test` **647 suites / 10,788 passed** (`--listTests` 647), `npx tsc
  --noEmit` zero errors. Backend through Lando; a FULL `phpunit` run OOMs at ~183/3305 in
  `AdminShellCoverageTest`, so use `--filter '/^(?!.*AdminShellCoverage).*$/'` -> 3,233 passing.
- Scratch and notes go OUTSIDE both repos, here in `economy-loose-ends/`. Verbatim output, not
  summaries.
- **Check the blast-radius table yourself** against the export and against dev. The PM session
  made two wrong claims about `slots` before the export corrected them; do not inherit a third.

## Done looks like

Every division size derived, England's figures byte-identical before and after (prove it), and
Scotland's four live tiers moving 14 -> 12. Both suites green at the stated baselines. The
`EconomyWageTableCommand` prohibition rewritten to record the ruling. A note in the report on
the 23 out-of-scope countries that were not checked.
