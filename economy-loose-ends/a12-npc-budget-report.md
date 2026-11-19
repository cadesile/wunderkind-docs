<!-- STATUS --> **STATUS:** ✅ A12. DEPLOYED. `GameLoop:1520` measured but NOT landed — still the owner’s decision.

---

# A12 — NPC budgets stop being built on 23 home games

**Branch `new-game-save`, commit `ea7f8bd2`, on top of `e03dd6da`. Not pushed. 2026-11-19.**

```
$ git log --oneline -1
ea7f8bd2 Count an NPC club's home games; never derive them from the season
$ git status --porcelain
$ git rev-parse HEAD origin/new-game-save     # before my commit
e03dd6da402be55488e11e45c5e8aa750d97cb12
e03dd6da402be55488e11e45c5e8aa750d97cb12
```

Working tree was clean at `e03dd6da` and in sync with `origin/new-game-save`. **CLAUDE.md is
gitignored, so its suite-count row is edited but not in the commit** — that is the project's
one-way mirror, not an omission.

Evidence (verbatim, outside both repos): `docs/economy-loose-ends/a12-run-2026-11-19/` —
`measure.ts`, `measure-output.txt`, `gate-before.txt`, `gate-after.txt`,
`full-suite.FINAL.txt`, `full-suite.HEAD-BASELINE.txt`.

---

## 0. What landed, and what did not

| | status |
|---|---|
| §3 — `SeasonBudgetService.ts:526`, the NPC **budget** | ✅ **LANDED**, counted-then-derived |
| §3b — `GameLoop.ts:1520`, the NPC **solvency verdict** | 🔴 **MEASURED, NOT LANDED** — the gate in your brief was tripped by a wide margin. §3b below. |
| On-device CHECKS line (standing note §1) | ✅ **ADDED**, two lines. §5 below. |

**Nothing was re-authored to offset the reduction.** No turnover figure, no sponsor band, no
ticket price, no `FALLBACK_DIVISION_SIZE`, no `WORLD_PACK_VERSION`.

---

## 1. 🔴 THE DELIVERABLE — before/after, the four tiers you asked for

Every formula below is the app's own: `computeMatchdayRevenue`, `calculateFacilityUpkeep`,
`npcWeeklyIncomePence`, `deriveClubBudget`, `weeksRunway`, `solvencyBand`. Inputs are real —
facility levels, reputation and balance per club from the world exports; ticket prices, sponsor
bands, `weeksPerSeason` and authored turnover from `game-config-en.LIVE.json`.

**Representative club = the median by matchday income of its division.** Two world exports are
reported because they disagree (§2), and they pick a different median club, so each cell carries
both. The percentages are what matters; the absolute levels move with the club picked.

### Weekly income — the figure that feeds the budget

| | home games | weekly income BEFORE | weekly income AFTER | change |
|---|---|---|---|---|
| **EN tier 1** | 23 → **15** | £4,522,079 / £4,499,033 | £4,193,047 / £4,182,898 | **−7.3% / −7.0%** |
| **EN tier 8** | 23 → **15** | £4,099 / £15,089 | £2,824 / £9,989 | **−31.1% / −33.8%** |
| **SC tier 1** | 23 → **13** / **11** | £4,566,797 / £4,492,307 | £4,121,827 / £4,002,089 | **−9.7% / −10.9%** |
| **SC tier 8** | 23 → **13** / **11** | £6,721 / £15,000 | £3,938 / £7,342 | **−41.4% / −51.1%** |

First figure in each cell: `world.json` (2026-11-18 22:00, the newest). Second:
`world.2148.json` (21:48).

### Season budget — what the reduction actually does to spend

| | season income AFTER | wage **share** (60%) | wage **reservation** | surplus | overCommitted |
|---|---|---|---|---|---|
| **EN t1** | £192,880,161 (−7.3%) | £115,728,096 (−7.3%) | £198,600,000 (**0.0%**) | £5,840,073 → **−£9,295,423** | true → true |
| **EN t8** | £129,893 (−31.1%) | £77,936 (−31.1%) | £129,000 (**0.0%**) | −£26,685 → **−£85,357** | true → true |
| **SC t1** | £189,604,050 (−9.7%) | £113,762,430 (−9.7%) | £198,600,000 (**0.0%**) | £7,668,155 → **−£12,800,445** | true → true |
| **SC t8** | £181,151 (−41.4%) | £108,690 (−41.4%) | £185,497 → £129,000 (**−30.5%**) | £6,364 → **−£65,149** | false → **true** |

*(`world.json` run. The `world.2148.json` run differs in one instructive way: its EN t8 and SC t8
median clubs are NOT over-committed, so the reduction passes straight through to the reservation
at the full −33.8% and −51.1%.)*

### ⚠️ The three things to read off that table

1. **The cut is not flat — it is 4–7× larger at the bottom of the pyramid than the top.** A6
   predicted a flat 24–30% (EN) / 26–37% (SC). The real shape is **−7% at tier 1 and −31–34% at
   tier 8** in England, **−10% and −41–51%** in Scotland. Reason: TV (£136m/season at tier 1) and
   sponsors (£620k/week) dominate a tier-1 club's income and dilute the matchday term almost to
   nothing, while a tier-8 club earns £325/week in sponsors and £4,950 a *season* in TV and is
   therefore almost entirely gate money. **A6's estimate excluded sponsors, which is why it was
   roughly right in the middle and wrong at both ends.**

   🔴 **This is the part that bears on multi-season testing.** The correction lands hardest exactly
   where solvency was already marginal. It is the right number — but if NPC clubs at tiers 7–8 now
   look too poor, §0 of your brief says the lever is **turnover**, and I have not touched it.

2. **At tiers 1–5 the squad's wage CEILING does not move at all.** `wageReservationPence` is
   `max(share, committed bill)`, and those clubs are already `overCommitted` — the variant gate's
   own standing prediction. So the entire income reduction lands on `surplusPence`, turning a
   modest positive into a real negative (EN t1: +£5.8m → −£9.3m per season). **Those clubs will not
   sell players because of this change; they will stop banking money.** The grandfathering /
   `MEAN_REVERSION` path is what converges them, unchanged.

3. **At tiers 7–8 it passes straight through.** Not over-committed, so the ceiling falls the full
   31–51% and the squad is genuinely re-priced smaller from the next renewal onward. That is the
   intended effect of the change, and it is where it is largest.

### Which path each measured club took

**All four took the DERIVED path in my harness**, because a world export carries no fixtures.
On a real save all four take the **COUNTED** path: `useInitFlow`'s step N+2 generates every
league's schedule before any budget is bootstrapped, and `applySeasonResponse` regenerates it
inside `server_sync` at every transition. The derivation is the cache-loss fallback, and it is
pinned to agree with the count (§4). The new CHECKS line (§5) prints which path a live save used.

---

## 2. ⚠️ A premise check — your brief's Scottish figure is defensible, but no local export agrees with §13.6

Believe the code: here it is the data.

```
$ node -e "... rows and slots per tier, three exports ..."
=== ./world.json 2026-11-18T22:00:23+00:00
EN rows {"1":16,...,"8":15}      EN slots {"1":18,...,"8":18}
SC rows {"1":14,...,"8":13}      SC slots {"1":18,"2":18,"3":18,"4":18,"5":0,"6":0,"7":0,"8":0}
=== ../docs/.../world.2148.json 2026-11-18T21:48:38+00:00
EN rows {"1":16,...,"8":15}      EN slots {"1":18,...,"8":18}
SC rows {"1":12,...,"8":11}      SC slots {"1":18,"2":18,"3":18,"4":18,"5":0,"6":0,"7":0,"8":0}
```

Three things follow, and I have recorded all three in §13.6:

1. **No local world export carries the authored 16/14 that §13.6 quotes.** Every one emits
   `slots: 18` for both countries (and `0` for SC tiers 5–8). The 16/14 are what **A7 authored into
   the backend `league` table** on 2026-11-19; no export here post-dates that. Not a contradiction
   — but anyone re-deriving from a local export gets 17 home games, not 15 or 13.
2. **England's club ROWS do agree with 16** (15 at tier 8, the reserved place), so England's
   counted and derived figures agree at every tier. Confirmed: 15 both ways.
3. 🔴 **Scotland's club rows moved between two exports twelve minutes apart — 12 → 14.** So a
   counted Scottish figure is **11 or 13 depending on which generation a save came from**. Your
   brief says 12/11; the newest export says 14/13. **I have not tried to resolve which is right —
   that is the open owner decision — and counting makes the code correct either way.** This is the
   strongest argument yet for counting over deriving while 12-vs-14 is open, and it is exactly what
   the new CHECKS line will show on a device in one line.

---

## 3. The change

`src/engine/SeasonBudgetService.ts`, `bootstrapNpcSeasonBudgets`:

```ts
const homeGames = countHomeGames(fixtures, club.id, season)
  || homeGamesForDivisionSize(participantsOfClub[club.id] ?? FALLBACK_DIVISION_SIZE);
```

The existing `leagueOfClub` loop was **extended**, as you asked, rather than a second one added:

```ts
const ampLeagueId = world.ampLeagueId;
const leagueOfClub: Record<string, string> = {};
const participantsOfClub: Record<string, number> = {};
for (const wl of world.leagues ?? []) {
  const participants = (wl.clubIds?.length ?? 0) + (wl.id === ampLeagueId ? 1 : 0);
  for (const cid of wl.clubIds ?? []) {
    leagueOfClub[cid] = wl.id;
    participantsOfClub[cid] = participants;
  }
}
```

No arithmetic is restated. `useFixtureStore.getState()` is reached exactly as the four stores
already in that module are. The old comment — *"Half a club's fixtures are at home. Derived from
the season rather than the tick's hardcoded 23"* — is replaced by one that says why a season
length cannot answer the question, and the guard forbids the old wording returning.

---

## 3b. 🔴 `GameLoop.ts:1520` — MEASURED, NOT LANDED. Your gate was tripped by a wide margin.

Your brief: *"Measure which verdicts flip at EN and SC tier 8 and tier 1. If more than a handful
flip, stop and report rather than landing it."*

**Band flips across every club in the division, counting only `solvencyBand` changes:**

| | `world.json` | `world.2148.json` |
|---|---|---|
| **EN tier 1** | **16 of 16** | **14 of 16** |
| EN tier 8 | 0 of 15 | 0 of 15 |
| **SC tier 1** | **14 of 14** | **12 of 12** |
| SC tier 8 | 0 of 13 | **4 of 11** |

Tier 1 is not a handful; it is every club. Almost all go `healthy → warn`, several
`healthy → crisis`, and two Scottish clubs `healthy → folded`. So I stopped. **The code is
unchanged and the one-line correction is written at the site**, with the figures, so nobody
re-derives it.

### ⚠️ The cause is NOT the home-game count, and that is the finding

A tier-1 club's modelled wage bill plus upkeep sits **within a few percent of its income**. Above
break-even, `weeksRunway` returns its 52-week cap and the band is `healthy` regardless; below it,
runway collapses to single digits. So **any** income reduction at tier 1 flips the whole division
at once. A sensitivity sweep over the modelled wage share makes it visible:

```
EN t1  flips vs modelled wage share   40%:0  50%:0  55%:0  60%:16  65%:11  70%:8
SC t1  flips vs modelled wage share   40%:0  50%:0  55%:0  60%:14  65%:14  70%:1
EN t8  flips vs modelled wage share   40%:0  50%:0  55%:0  60%:0   65%:0   70%:0
SC t8  flips vs modelled wage share   40%:1  50%:3  55%:4  60%:4   65%:7   70%:7
```

Zero flips at 55% of turnover, all of them at 60%. **That knife edge is itself worth your
attention**, independently of this task: it means the tier-1 solvency verdict is currently decided
by whether income exceeds outgoings by a hair, not by any margin the design chose.

⚠️ **Stated limit of this measurement.** The wage bill is **modelled**, at
`WAGE_TO_TURNOVER_BP` = 60% of authored turnover, because no world export carries NPC squads
(packs are a census; wages are priced on device). It is the harness's own model of a tier's squad
cost and the right ballpark — the backend derives `wageScaleMicroPence` from the same turnover —
but it is a model, which is why the sweep is here rather than one number.

### What landing §3 alone leaves behind, deliberately

The budget now uses 15/11–13 and the verdict still uses 23, so the brain's **runway** test reads an
optimistic income while its **wage** test reads the corrected, lower allowance off
`club.seasonBudget`. The asymmetry is temporary and strictly the safer direction: a brain selling
on an optimistic runway sells **less**, not more. It is recorded at both sites and in §13.6.

---

## 4. Verification

### 4a. `tsc`

```
$ npx tsc --noEmit
TSC CLEAN
```

Zero errors (the echo fired, so the exit was 0).

### 4b. `npm test`, with the suite COUNT confirmed

```
$ npx jest --listTests | wc -l
     640
$ npm test
Test Suites: 640 passed, 640 total
Tests:       3 skipped, 10704 passed, 10707 total
Time:        270.152 s
```

**Baseline re-measured here rather than taken from the row** (CLAUDE.md's own warning says to
trust your own measurement): at `e03dd6da` with my new test file present but the fix stashed,
638 passed / 2 failed suites, 12 failed tests — so the baseline without my file is
**639 suites / 10,685 passed, 10,688 collected, `--listTests` 639.** That matches CLAUDE.md's
`new-game-save` row exactly: **the row was correct and current.** Both rows updated to
640 / 10,704, reconciled as +1 suite (12 tests) and +7 in the extended guard.

### 4c. Tests pinning the counted path, the derived path and the `+1` — separately

New: `src/__tests__/engine/npcSeasonBudgetHomeGames.test.ts`, 12 tests in three describes.

- **COUNTED** (4): scales with the games actually drawn; 23 is strictly richer than 15; ignores
  another season's fixtures; ignores another club's home fixtures.
- **DERIVED** (4): derived equals counted; strictly poorer than 23; a smaller division derives a
  smaller budget; `FALLBACK_DIVISION_SIZE` for a club in no known league.
- **The `+1`, keyed off `ampLeagueId`** (4): counts the player in the AMP's own league (rows + 1);
  one home game richer there than ignoring the player; **does NOT add the player to any other
  league** — the same rows in a non-AMP league derive strictly less, and equal their own counted
  figure; and **the `+1` follows the player through promotion** when `ampLeagueId` moves.

Every assertion is cross-source (counted vs derived), per A8's shape. **Verified against the
defect:** with only the one line reverted, **11 of 12 fail**.

```
$ npx jest src/__tests__/engine/npcSeasonBudgetHomeGames.test.ts   # one line reverted
Tests:       11 failed, 1 passed, 12 total
```

⚠️ **The one survivor is structural and I am not hiding it.** *"DERIVES the same budget
pre-fixtures that it COUNTS once fixtures exist"* compares two figures that are the same constant
under the defect, so it cannot distinguish them. The very next test pins the reduction, and I added
an explicit `< the-23-figure` assertion to the other four tests that had the same weakness.

### 4d. The source guard now reads a FIFTH file

`pricingPaneHomeGames.test.ts`'s own standing note says to add a new site in the same change. Done
— `SeasonBudgetService.ts` joins the `describe.each`, plus four assertions for its own defect
shape (`round(weeks / 2)` is **not** a halved division size, so none of the existing patterns would
have caught it), that it counts first, and that the `+1` is keyed off `ampLeagueId`.

⚠️ **Those new assertions strip comments before matching, and that is load-bearing.** The
corrected site deliberately **quotes its own defect** — *"This was `Math.max(1, Math.round(weeks /
2))` = 23"* — which is exactly the prose a future reader needs and exactly what a naive source
match flags. It failed on my first run for that reason. **Match the code, never the prose about
it**; a guard that fires on a comment is a guard people disable.

`seasonBudgetService.test.ts`'s exact-readers list gained the new file. That failure was the guard
working as designed — it is the only thing that fired in the whole suite.

### 4e. The economy gate is BYTE-identical

```
$ npx tsx scripts/economy/variantGate.ts --export game-config-en.LIVE.json \
    --starter-config starter-config.LIVE.json --world world.json --country EN
$ cmp gate-before.txt gate-after.txt && echo BYTE-IDENTICAL
BYTE-IDENTICAL
$ md5 -q gate-before.txt gate-after.txt
24f2d74db39fccd15f349316fadedd62
24f2d74db39fccd15f349316fadedd62
```

Both exit 1 on the pre-existing tier-8 verdict. **The same md5 A8 recorded**, as it must be:
`variantGate.ts` reads config and a world export, not these modules.

---

## 5. The on-device CHECKS line (standing note §1)

Added as a small change, two lines, in a new `NPC BUDGET — HOME GAMES (A12)` section.
`npcHomeGamesChecks` is a pure function in `src/economy/economyDiagnostics.ts` (keeping that
module's store-free discipline); `ChecksTab.tsx` reads the live stores and calls it, sampling the
first club of the **AMP's own league**, because that is the division carrying the reserved-place
`+1` and therefore the one a wrong participant count shows up in first.

**Row 1 states a relationship and can FAIL:**

```
NPC home games (tier 8, "Daventry Orient")
  participants 16 · counted 15 · derived 15 · using 15 (COUNTED from fixtures)        → pass
  participants 14 · counted 11 · derived 13 · using 11 (COUNTED from fixtures)
      — DISAGREE: the division this club plays in is not the size the world says it is → FAIL
```

*(Both rows above are the format, constructed from §1's measured figures — not captured device
output.)*

That second line is the Scottish drift three agents triangulated by hand, in one row. It is `info`
rather than `pass` when there are no fixtures, because with none the two figures are the same
number by construction and there is nothing to compare — reporting that as a pass would be a lie.

**Row 2 is the income split the budget is built from**, labelled with the count it used. Shown
here with the EN tier-8 figures from §1, as an illustration of the format rather than as captured
device output — I have no device:

```
NPC weekly income (the budget's input)
  2,824p/wk = sponsor 325 + matchday 2,392 (7,334/game × 15 ÷ 46) + seasonal 108
            · season budget 129,893p
```

⚠️ **I am aware of §2's bar.** Two lines, both worth printing in six months: row 1 is a permanent
invariant over a number that has now been wrong five times, and row 2 attributes a drift during
multi-season testing to a line rather than to "the economy". I added nothing else, and I did not
touch the existing sections — A13 owns that.

---

## 6. Flagged, not acted on

1. 🔴 **§13.6 is now a changelog, not a rule.** Three of its five STILL-WIRED bullets are struck
   through, mine is a fourth, and the section runs well past a page. Consolidating it is a pruning
   decision and belongs to the PM session. I only struck my bullet and corrected what my change
   made wrong, per the brief.
2. **`GameLoop`'s `NPC_WEEKS_PER_SEASON = 46` is also wired** and I left it alone — out of scope,
   and unlike the home-game count it happens to match the published `weeksPerSeason` for every tier
   in the live config. `SeasonBudgetService` already reads the real figure per tier. Worth a line in
   the register, not a task.
3. **The tier-1 solvency knife edge** (§3b): wage bill + upkeep within a few percent of income at
   tier 1, so the verdict is decided by a hair rather than by a designed margin. That is upstream of
   both 23s and would survive fixing either. It is the thing I would look at before a long
   multi-season run, ahead of §3b itself.
4. **Scotland 12-vs-14 is now demonstrably a *moving* number**, not just a disputed one (§2) —
   two exports twelve minutes apart. Whatever A11 concludes, that may be worth knowing.
