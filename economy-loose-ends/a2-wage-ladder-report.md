<!-- STATUS --> **STATUS:** ✅ A2 — wage ladder samples the tier band. DEPLOYED.

---

# REPORT — A2: make the wage ladder sample abilities that exist

**Repo:** `wunderkind-app` · **Branch:** `new-game-save` · **Commit:** `b8842812` · **Base:** `4706169b` ("Price the pack
on the device"), confirmed **1 commit ahead of `origin/new-game-save`** as the brief expected ·
**Working tree:** clean at start · **Date:** 2026-11-19, 09:33 GMT.

```
$ git rev-parse --abbrev-ref HEAD
new-game-save
$ git rev-parse HEAD
4706169bf5e30dbef2887cbb3750e2dffc8b726c
$ git rev-list --left-right --count origin/new-game-save...HEAD
0	1
$ git status --porcelain
$ date
Thu Nov 19 09:33:15 GMT 2026
```

**Committed, not pushed.** One module, one component, one test file, two `.context` files.

---

## 1. What changed

### `src/economy/economyWorkings.ts`

`WAGE_LADDER_ABILITIES = [10, 20, 40, 60, 80, 95]` is **gone**, replaced by

```ts
export const WAGE_LADDER_RUNGS = 6;
export function wageLadderAbilities(
  band: { min: number; max: number },
  rungs: number = WAGE_LADDER_RUNGS,
): number[]
```

Evenly spaced across `[min, max]`, **both ends included** — the ends are the question the panel
is asked (the cheapest and the dearest player this tier can field). `n` is capped at
`hi - lo + 1`, so a band narrower than six whole points reports fewer, distinct rungs rather
than six with a rounded duplicate. A duplicate row would read as two players priced differently
at the same ability, which is a new wrong answer in place of the old one.

Measured:

| tier | band | rungs reported |
|---|---|---|
| 1 (EN) | 55–95 | 55, 63, 71, 79, 87, 95 |
| 8 (EN) | 2–7 | 2, 3, 4, 5, 6, 7 |

`wageLadder` takes `abilityBand` as a **required** fourth parameter. Required rather than
defaulted on purpose: a default band is the fixed array again under another name, and would be
wrong silently at every tier that is not the default's.

### `src/components/finances/EconomyWorkingsPanel.tsx`

```ts
const abilityBand = resolveAbilityRange(config.leaguePlayerAbilityRanges, saveCountryCode(), tier);
const ladder = wageLadder(economy, reputation, anchoredScale, abilityBand);
```

`saveCountryCode()`, not `''` — a country-blind read falls through to `TIER_DEFAULTS` and would
show a Scottish save England's band with nothing looking wrong. `saveCountry.test.ts` already
forbids the empty country at the engine sites and still passes.

The block's header note now names the band it sampled (`sampled across this tier's own band,
2-7 — …`), so the reader can see the band and the rows at once.

### The potential-band caveat

Added under the ladder, in `WK.warning`:

> These rows price the tier's POTENTIAL band (2-7) — what NPC squads are GENERATED from. Current
> ability is derived below it and grows toward it with age (a device pass read 25% of potential
> at 19, 40-59% at 24, 90% at 31), so a real squad costs well under these rows until it matures.
> Sampling expected MATURE ability instead is the better ladder and waits on the reference-squad
> decision.

⚠️ **This deviates from the brief's §3, with the owner's decision, and the deviation is the one
thing in this report worth a second look.**

The brief said the wording goes through the translation catalog. `EconomyWorkingsPanel.tsx`'s own
header says the opposite, and has since it was written:

> ⚠️ **Literals, not catalog keys — deliberately, and consistent with `ChecksTab`.** Every other
> debug surface in the app is written in plain English for exactly one reason: a diagnostic read
> by the owner and by me is not player-facing copy, and routing it through the catalog would put
> ~40 throwaway keys in front of translators. Anything here that becomes player-facing moves to
> the catalog in the same change that promotes it.

The two existing caveat paragraphs in this same panel — income coverage, and the committed/
maintenance shares — are plain English for that reason. I put the question to the owner before
writing the line and **the answer was: literal, consistent with its neighbours, flag it here.**
So this line is a literal, no catalog key was added, and the panel's single convention holds.
The token audit was still run (§2.3) and is clean. If the panel is ever promoted out of
`debugLoggingEnabled`, all three paragraphs move to the catalog together.

### `.context`

- `07_synthesis/output/game-mechanics.md` — the "Still open after this batch" bullet that read
  *"`WAGE_LADDER_ABILITIES` samples `[10,20,40,60,80,95]` at every tier … A panel fix, deferred"*
  is now a ✅ FIXED record carrying the rungs each tier reports, the country requirement, the
  age/development table, and what remains open (expected mature ability).
- `shared/last-sync.md` — one new pass entry. Nothing restructured, nothing pruned.

---

## 2. Verification

### 2.1 `npx tsc --noEmit`

```
$ node -v
v20.19.6
$ npx tsc --noEmit
TSC_EXIT=0
```

Zero errors, no output.

### 2.2 `npm test` — green, and the COUNT confirmed

```
Test Suites: 637 passed, 637 total
Tests:       3 skipped, 10652 passed, 10655 total
Snapshots:   0 total
Time:        636.927 s
exit=0

$ npx jest --listTests | wc -l
     637
```

637 = 637. No suite silently dropped out of the run.

**The branch row moved, and reconciles exactly.** `new-game-save` read **637 / 10,647** (2026-11-18,
the pack-economy removal) and now reads **637 / 10,652**: no new suite, **+5 tests** — the existing
*"reports every sampled ability"* assertion split into *"samples the band it is given"* plus
*"quotes NOTHING above a tier-8 band"*, and four new `wageLadderAbilities` cases. Corrected in
`01_overview/output/environment.md`'s green-master bar (the owner) and in `CLAUDE.md`'s mirror.
Measured here, not copied: the brief's warning about that row having gone stale six times is why
the reconciliation is written out rather than asserted.

The two directly affected suites, run alone first:

```
PASS src/__tests__/utils/saveCountry.test.ts
PASS src/__tests__/economy/economyWorkings.test.ts

Test Suites: 2 passed, 2 total
Tests:       24 passed, 24 total
```

### 2.3 `npx tsx scripts/i18n/audit-tokens.ts`

```
Checked 3776 t()/translate() calls with templates having placeholders.
Found 0 interpolation mismatches:

Found 0 references to keys absent from the catalog (render literally as the raw key):
```

Zero mismatches, zero absent keys. No catalog key was added or moved (see §1, the caveat line),
so this is a confirmation that nothing was disturbed rather than a check on new work.

### 2.4 The economy gate did not move — byte-identical

Run on the pristine tree (changes stashed, `git status --porcelain` empty) and again with the
change applied, same three inputs:

```
$ npx tsx scripts/economy/variantGate.ts --export game-config-en.json \
    --starter-config starter-config.json --world world.json --country EN

$ md5 -q gate-before.txt gate-after.txt
b2e462dd8732084a6b439dbaa2db6862
b2e462dd8732084a6b439dbaa2db6862
$ diff -q gate-before.txt gate-after.txt
GATE BYTE-IDENTICAL
```

COVERAGE, unchanged either side:

```
tier |     TV | matchday |  shirt | club spon | league spon |  prize | position || COVERAGE
  1  |  35.0% |     3.1% |   4.2% |      0.6% |        1.1% |   0.0% |     0.0% ||  43.9%  <-- outside 85-110%
  2  |  28.0% |    10.3% |   7.4% |      1.8% |        3.0% |   0.0% |     0.0% ||  50.5%  <-- outside 85-110%
  3  |  20.0% |    15.3% |  19.8% |      1.9% |        4.7% |   0.0% |     0.0% ||  61.8%  <-- outside 85-110%
  4  |  15.0% |    26.1% |  24.2% |      3.4% |        6.8% |   0.0% |     0.0% ||  75.5%  <-- outside 85-110%
  5  |  11.0% |    27.4% |  35.7% |      2.2% |        4.5% |   0.0% |     0.0% ||  80.8%  <-- outside 85-110%
  6  |   8.0% |    84.0% |  50.8% |      6.8% |       13.6% |   0.0% |     0.0% || 163.2%  <-- outside 85-110%
  7  |   5.0% |    38.6% |  89.2% |     19.8% |       29.8% |   0.0% |     0.0% || 182.4%  <-- outside 85-110%
  8  |   3.0% |    84.5% | 135.1% |     70.1% |      105.2% |   0.0% |     0.0% || 398.0%  <-- outside 85-110%
```

Those eight failures are the pre-existing state of the gate on these inputs, not something this
change caused — identical on the pristine tree. Structurally it could not have moved: nothing
outside the panel and its own test imports `economyWorkings` at all.

```
$ grep -rn "economyWorkings" --include="*.ts" --include="*.tsx" src/economy src/engine src/utils scripts/
(no matches)
```

---

## 3. What I did NOT touch, as instructed

- `wageScaleMicroPence` — untouched. No authored economy figure changed.
- `src/economy/wages.ts` / `weeklyWageRange` — untouched. Both ladder columns still come from
  that one function, and the test asserting the ladder equals `weeklyWageRange` row for row is
  unchanged and passing.
- `league_ability_ranges` / `TIER_DEFAULTS` — read only.
- `wunderkind-backend` — not entered.
- Nothing pushed.

## 4. Flags for the project-manager session

1. ⚠️ **The caveat line is a literal, not a catalog key.** §1 has the reasoning and the owner's
   decision. This is a deliberate deviation from the brief's §3; everything else in the brief was
   followed as written.

2. ⚠️ **`shared/last-sync.md` has a pass entry with no heading, and I did not fix it.** The
   pack-census pass (`4706169b`) appended its bullets to the **bottom of the file**, under the
   stale `## 2026-10-24 — Club Dashboard rebuild` heading, instead of adding a dated heading at
   the top where the file's newest-first convention puts them. So that pass is unlabelled and
   carries no ordinal, which is why my own entry is numbered **eighty-second** rather than
   eighty-first — the eighty-first is that headingless block. Flagged rather than moved: the
   brief forbids restructuring the file, and this is a ~60-line relocation plus a heading
   invention that belongs to whoever owns the file.

3. **The real answer is still out of scope and the hook is now explicit.** Sampling expected
   MATURE ability instead of the band is the better ladder, it depends on the reference-squad
   re-calibration decision, and it needs exactly one thing: a derived range passed to
   `wageLadder`'s `abilityBand`. Recorded in the function's docblock, in `game-mechanics.md` and
   in the panel's own caveat, so three readers in three places find the same note.

4. **For whoever reads the panel next:** the block header now prints the band
   (`sampled across this tier's own band, 2-7 — …`). If that reads `5-15` on an England save it
   means the country fell through to `TIER_DEFAULTS`, which is a save with no country rather than
   a panel bug.
