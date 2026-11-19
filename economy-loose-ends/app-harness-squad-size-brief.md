<!-- STATUS --> **STATUS:** ✅ Harness reference-squad floor. Merged to `dev` 2026-11-18.

---

# TASK — The harness and the backend disagree about the tier-7 reference squad

**App only (`wunderkind-app`), branch cut from `dev` (`a3acb25a`).** A one-line behaviour fix in
the economy harness, plus a test and a `.context` update. **Commit on your own branch; do not
push.** Nothing in `wunderkind-backend` is yours to touch.

## 0. Background, for someone who has not seen this work

The Wunderkind Factory is a football management game in two repos under
`/Users/courtneyadesile/Documents/WunderkindFactory`: **`wunderkind-app`** (React Native / Expo —
the game engine, offline-first, your repo) and **`wunderkind-backend`** (Symfony + PostgreSQL,
which owns the game TEMPLATE: the authored economy dials, world generation and sync).

**Both repos use ICM.** `.context/CONTEXT.md` is the source of truth and routes you to the stage
you need: read it, and the relevant stage's `output/`, before raw source, and update the stage your
change affects as part of finishing the work. `.agents/skills/icm-codebase-context/SKILL.md` has
how to maintain it.

The economy has been through a long re-authoring. The app carries a headless economy simulation in
`src/economy/harness/` driven by `scripts/economy/variantGate.ts`, and that gate is the release
check on the economy's authored numbers: it reports COVERAGE (modelled income ÷ authored turnover)
per tier against an 85–110% target, plus solvency over 30 seasons. The backend half of that work —
a re-authored turnover ladder, re-derived payout ladders and a smaller bottom-tier ground — is
being finished in the backend repo by someone else. **None of it is in scope here, and no authored
figure changes in this task.**

Reviewing that backend work turned up one input the two repos disagree about, and that is what you
are fixing. It is small and has no economy consequence, but it lives in the file every wage figure
the gate prints comes from, so it wants a test rather than a quiet edit.

Background docs, outside both repos, in `docs/economy-loose-ends/`: `REMAINING-WORK.md` (the
economy backlog; §2 is the dial derivation) and `dials/run.sh` (a wrapper that patches copies of
the gate's inputs — not needed here, but it shows how the gate is invoked). The app's own
`.context/shared/last-sync.md` already carries this defect as an open entry dated **2026-11-18**.

## 1. The defect

`src/economy/harness/loadExport.ts` sizes the reference squad for each tier with

```ts
Math.max(1, Math.round(((squadRow.playerMin ?? 0) + (squadRow.playerMax ?? 0)) / 2))
```

The backend's `EconomyScaleResolver::referenceSquadSize()` does the same thing with
`intdiv(min + max, 2)` — a **floor**. The two disagree for any tier whose `playerMin + playerMax`
is odd. Today that is exactly one tier: **England tier 7**, whose published `npcSquadConfig` row is
`playerMin` 16, `playerMax` 19, so the backend uses **17** and the app uses **18**.

It matters because the harness builds `turnoverAvgWeeklyPence` by pricing a reference squad of that
size through `weeklyWageRange`. At tier 7 the app therefore prices a squad the backend does not
have, and that figure comes out about **5% low**.

## 2. The proof — reproduce it before you change anything

`wageScaleMicroPence × Σ(ability^k) ÷ turnoverPence` must be **constant across tiers**. It is the
backend resolver's own formula rearranged, where `Σ` runs over `size` abilities evenly spaced
across the tier's authored band — each rounded to an integer, because `Player::$currentAbility` is
an int — and `k` is `economyTierBaseline.wageCurveExponentBp / 10000` (2.5). Computed from
`game-config-en.LIVE.json` and `starter-config.LIVE.json` in the app repo root:

| squad size | result |
|---|---|
| **floored** `(min+max)/2` | **9782.608696 at all eight tiers**, flat to ten significant figures |
| rounded | tier 7 alone comes out **10297.894068**, 5.3% off; every other tier matches |

That is what establishes floor as the CORRECT behaviour rather than a preference — the floored
reading reproduces the published `wageScaleMicroPence` ladder exactly, and the rounded one cannot.
Reproduce it with a throwaway script first and keep the numbers for your report.

## 3. What to do

1. Read `.context/CONTEXT.md`, then `.context/stages/02_architecture/output/structure.md`'s
   `src/economy/` section (it maps the harness's seven files) and the 2026-11-18 entry in
   `.context/shared/last-sync.md` that describes this defect.
2. **Find every consumer of the squad size before changing it.** `appSquadSize` goes onto the
   `TierFixture` and is also compared against `ENGLAND_DEV`'s own
   `appSquadSize`/`referenceSquadSize` by `driftAgainstFixture`. Work out what a one-player change
   at tier 7 does to the drift report and to anything else reading those fields. **If the
   hardcoded fixture also disagrees with the floored value, say so and fix it in the same change** —
   a fixture that disagrees with the loader is the same class of defect, and that file's own
   docblock says any drift row is now a finding rather than a confirmation.
3. Make the change: floor, not round, with a short comment naming the backend function it mirrors
   and why — an odd `playerMin + playerMax` is the only case where they differ, and a reference
   squad the backend does not have prices a wage the game will never pay.
4. **Pin it with a test** in `src/__tests__/economy/`: the tier-7 row must size to 17, and the test
   should say in one line what it protects. If any existing test asserts 18, it is wrong and
   should move.
5. **Prove no gate verdict moves.** Run, before and after:

   ```bash
   npx tsx scripts/economy/variantGate.ts --export game-config-en.LIVE.json --starter-config starter-config.LIVE.json --world world.json --country EN
   ```

   Every COVERAGE figure must be **byte-identical** — COVERAGE has no wage term, so if it moves,
   **stop and report**: that means the squad size reaches something nobody has mapped. The
   wage-side figures (`bill%`, the season-1 bill rows) MAY move at tier 7, and that is the fix
   working. Report the before/after for both.
6. `npx tsc --noEmit` and `npm test`, both clean. **Confirm the suite COUNT, not just that nothing
   failed** — a run that silently collects fewer files looks identical in the summary line.
   `npx jest --listTests | wc -l` should equal the suite count; compare against your branch's row
   in `CLAUDE.md`'s table and correct that row if it moves (it has gone stale five times, so trust
   your own measurement over the number written there). `nvm use` first — Node 20.19.6 — and
   `npm install --legacy-peer-deps` if you need it.
7. Update `.context`: mark the 2026-11-18 `last-sync.md` entry **fixed rather than deleting it**,
   add your own pass entry in that file's format, and update
   `02_architecture/output/structure.md`'s harness entry if it describes this behaviour.

## 4. Done looks like

The app and the backend agree on the reference squad size at every tier; a test fails if that
regresses; the gate's COVERAGE table is unchanged and you can show it; `tsc` and the suite are
clean with the count confirmed; `.context` is updated.

Commit on your own branch with a message in this repo's style — what changed, why, the
constant-flatness proof, and the fixture consequence if there was one — ending with:

```
Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
```

**Do not push.**

## 4a. Where your report, notes and evidence go

⚠️ **Scratch files, reports, gate dumps, traces and working notes NEVER go inside `wunderkind-app`
or `wunderkind-backend`.** They go in
`/Users/courtneyadesile/Documents/WunderkindFactory/docs/economy-loose-ends/`, which is outside
both repositories and is the shared workspace for this work. One file per task; yours is
**`harness-squad-size-report.md`**. Anything genuinely throwaway — the script you write to
reproduce §2, for instance — goes in your own scratchpad directory, not in a repo and not in that
folder.

The split is: **`.context` carries what is now true, the report file carries what proves it.**

Put in the report: the branch and commit hash, the §2 constant computed both ways, **the two gate
runs pasted verbatim** (command and output, not a summary) with the COVERAGE rows shown identical
and the tier-7 wage rows before and after, and the `tsc` and `npm test` output including the suite
count.

## 4b. `.context` — write your entry, but do not curate the file

The ICM convention stands: update the stage your change affects, and add your pass entry to
`shared/last-sync.md` in that file's existing format, marking the 2026-11-18 defect entry fixed
rather than deleting it.

**But `.context` status and review are owned by the project-manager session, not by you.** Append
your own entry and correct the stage text your change makes wrong — nothing else. Do not
restructure a file, prune or rewrite earlier entries, or delete a superseded section even when you
can see it is wrong. **Flag it in your report instead**, with the file and what you believe is
stale, and the review picks it up.

## 5. Out of scope

- **Do not touch `wunderkind-backend` at all.** Its floored reading is the correct one and the
  published `wageScaleMicroPence` ladder is not in question.
- **Do not change any authored economy figure** — not `wageScaleMicroPence`, not the turnover
  table, not `npcSquadConfig`, not the ability bands.
- Do not refactor the harness beyond this fix, and do not re-run or re-derive any economy
  calibration.
