<!-- STATUS --> **STATUS:** ✅ DONE — committed on `new-game-save`, not pushed. **Read §2 first: two of the brief's premises are measurably false, and that is the finding.**

---

# A17 — one projection, shared by the player's chart and every NPC decision

**Repo:** `wunderkind-app`. **Branch:** `new-game-save`, base `c65bfa91` ("Derive the harness's
turnover wage from the budget, not from a copy of the squad" — A15), working tree clean at the
start. **Date:** 2026-11-19. **Not pushed, not deployed.**

⚠️ **One unexpected thing in `git log`, as the brief asked:** `origin/new-game-save` is **level
with** local `c65bfa91`. A15's commit is on the remote. That is outside my scope and I changed
nothing about it, but the brief said to report anything unexpected.

**Evidence:** `a17-run-2026-11-19/` — `measure.ts`, `measure-output.txt`, `gate-before.txt`,
`gate-after.txt`.

---

## 1. The headline, in four sentences

There were **four** hand-written runways, not three plus a good one: the brief missed
`ampWeeksRunway`, **the player's own DOF**, which was the same `balance / netOutflow` expression
and lump-blind. They now all reach **one** derivation, `runwayWeeks` in the new
**`src/economy/projection.ts`** — the week the projected balance first crosses zero, over the same
`projectBands` the player's chart is drawn from.

**The brain's verdict does not move by a single week on any of 460 club-readings across two world
exports**, because `min(52, balance / deficit)` was *already* smooth at break-even and
`npcSolvency` was *already* counting seasonal money. **What moves is the fire-sale discount: 188
of 238 clubs change tier, and every EN and SC tier-1 club stops fire-saling at 25–50% off** —
because that copy could not see £136,000,000 of TV a season.

---

## 2. 🔴 TWO OF THE BRIEF'S PREMISES ARE FALSE. I believed the code.

Both appear in the brief's §2, in `next-work-plan.md`'s "OWNER DIRECTION — one projection", and in
"NOW THE LIVE DECISION — the tier-1 knife edge". I implemented §3's recommended shape anyway —
it is right for other reasons, below — but **the stated mechanism is not what was wrong, and two
downstream expectations that rest on it will not be met.**

### 2a. ❌ "The cliff." There is no discontinuity at break-even. Never was.

> *"Above break-even there is no deficit, so runway returns its 52-week cap and reads `healthy`
> regardless of margin; a pound below, it collapses to single digits."* — brief §2
> *"A club £1 either side of the line reads 52 weeks or 8."* — plan

`min(52, floor(balance / deficit))` is **continuous at break-even.** As the deficit falls towards
zero, `balance / deficit` rises without bound and the cap takes over *smoothly*; it does not jump.
Measured on A12's own median EN tier-1 club (balance £4,538,646, outgoings £4,399,349/wk):

```
  deficit/wk        runway   band        (negative = surplus)
     -£122,730       52    healthy     ← A12's "before"
           -£1       52    healthy
            £0       52    healthy
            £1       52    healthy     ← a penny below break-even: still 52, not 8
       £10,000       52    healthy
       £87,282       52    healthy     ← balance/52: the cap stops binding HERE
       £90,000       50    healthy
      £120,000       37    healthy
      £174,563       26    healthy     ← balance/26: the healthy→warn threshold
      £174,564       25    warn
      £206,302       22    warn        ← A12's "after"
    £1,000,000        4    crisis
```

**The transition the measurements kept hitting is at `deficit = balance / 26` — an ordinary band
threshold, not a cliff**, and the one that makes a reading go from 52 to 22 is a £329,032/wk income
step (A12's home-game correction), not a pound.

🔴 **The real fragility is narrowness, and it is a BALANCE-SIZE question, not an arithmetic one.**
A tier-1 club's balance (£4.54m) is worth **1.08 weeks** of its own weekly income (£4.19m). So a
weeks-denominated runway has almost no resolution there: *every* deficit from £0 to £87,282/wk
(0–2.1% of income) reads exactly 52, and anything past £174,563/wk (4.2%) is already `warn`. The
entire informative range is four percent of income wide. **Any income change larger than that
clears the whole band in one step** — which is precisely what A12 observed and attributed to a
cliff. Emergent, not authored, in the plan's own vocabulary.

### 2b. ❌ "The pessimism." `weeksRunway` does not ignore season-end lumps.

> *"`weeksRunway` ignores season-end lumps entirely, so a club with prize money and TV landing in
> six weeks reads as nearly insolvent today."* — brief §2

It does not, and the module says so in its own header: `npcWeeklyIncomePence` takes
`seasonalPence` and divides it by `weeksPerSeason`, so **TV is inside the income term the brain's
runway is computed from**, amortised. The amortisation is deliberate, documented, and — see §4 —
**the alternative is catastrophic.** The two copies that genuinely could not see TV are the
executor's and the dashboard's.

### 2c. ⚠️ A fourth copy the brief did not list — and it is the PLAYER's

> *"`buildProjection`, 11 callers, all player-facing… The player sees the good one."* — brief §2

The player's **chart** does. The player's **DOF** did not: `ampWeeksRunway`
(`FinancialProjectionService`) read one band's `weeklyNet`, then computed
`netOutflow > 0 ? balance / netOutflow : 52` — lump-blind and *uncapped*. It feeds `DofBrain`'s
wage-ceiling bands, `DofSigningService` (twice) and `PlayerConversationService`. So the player's
own Director of Football was judging the club's finances on a different reading from the screen
beside it. That is now `runwayWeeks` over the chart's own inputs.

### 2d. ⚠️ A consequence for the plan's own live example: **Prestwick will not change**

`next-work-plan.md`'s device section says of Prestwick (income £1,800/wk, wages £1,900/wk, runway
52+): *"it is exactly the reading A17 is fixing… because the measure divides by a deficit rather
than projecting a balance."*

🔴 **Projecting a balance gives the identical answer.** £54,200 against a £100/wk deficit crosses
zero in week 542 either way; the **cap** is what makes it read 52, and the brief's §3 explicitly
keeps the cap ("capped at 52 as today"). The only things that would change Prestwick's verdict are
raising or removing the cap, or banding on something other than weeks — **both owner calls, both
out of scope here** (§3's published-config constraint).

🟢 **One half of that paragraph IS fixed, and it is the half that matters on a device.** It also
notes the reading *"excludes facility upkeep"*. The **brain** counted upkeep already; the **NPC
debug dashboard the owner read Prestwick off did not.** That screen now shows the brain's own
figures — investors, amortised matchday, TV, and upkeep subtracted — so Prestwick's dashboard
runway will move (down, by its upkeep). The assessment also now returns the brain's `band`,
resolved from the published thresholds; the screen's colour-coding still uses its own three
literals, which are demoted to that job alone — surfacing the band as a row would need a new
translation key and I judged that outside this task.

---

## 3. What changed

### 3a. New: `src/economy/projection.ts` — the pure core, with the runway in it

`projectBands`, `ProjectionInputs`/`ProjectionOverrides`/`ProjectionBand`, `SEASON_WEEKS`,
`MAX_HORIZON_WEEKS` and `affordabilityHorizons` **moved** out of
`src/engine/FinancialProjectionService.ts`, which imports ten Zustand stores at module load.
**That import graph is exactly why the copies existed:** `npcSolvency.ts` documents itself as
*"Pure and store-free, so the harness can drive it"*, so it could not import the one function it
needed. The brief's §4 names `shirtSales.ts` as the precedent and this follows it.

`FinancialProjectionService` **re-exports** all of them, so its eleven callers are untouched.

The new function:

```ts
export function runwayWeeks(inputs: ProjectionInputs, cap = SEASON_WEEKS): number
```

**The balance is piecewise linear and only ever jumps UP** (at the season boundary and each
anniversary inside the cap). So it walks the segments in order and solves the first one that
reaches zero — fractional, interpolated, no week-by-week loop, **at most two or three
`projectBands` calls for a 52-week cap.** That matters: the solvency pass runs for every club in
the pyramid, ~1,100 a tick. The segment-opening balances come from `projectBands` itself, so the
runway and the chart cannot disagree about a lump's size or its timing.

### 3b. `npcSolvency.ts` — delegates; keeps its signature and its output

`weeksRunway(balance, income, outgoings, cap)` is unchanged in shape and still returns a **floored
whole number** (every threshold it is compared against is an integer, and `${runway}wks` is printed
in the brain's decision logs). It now has **no arithmetic of its own**. `npcSolvencyThresholds`
and the bands are untouched, per §3 and §9 of the brief.

**Added:** `npcSolvencyAssessment(inputs, thresholds, cap)` — the one place the verdict's *inputs*
are assembled as well as its arithmetic, returning `{weeklyIncomePence, weeklyOutgoingsPence,
weeksRunway, band}`.

### 3c. `GameLoop.ts` — `assessNpcSolvency`, built once for the pass

The per-club verdict block became a closure next to the existing `leagueOfClub` map, reading the
LIVE club on each call. It is also **handed to `createNpcTransferExecutors` as
`weeksRunwayFor`**, which is what makes the executor stop deriving its own.

⚠️ **`NPC_HOME_GAMES_PER_SEASON = 23` and its comment block are untouched** (§7). The closure takes
the figure as a parameter; the literal and the owner's recorded decision are where they were.

### 3d. `npcTransferExecutors.ts` — the copy deleted

```diff
-  const weeklyIncomeNpc   = sumNpcSponsorIncome(sellLive) || sellLive.weeklyIncome || 0;
-  const weeklyWageBillNpc = computeNpcWageBill(sellLive);
-  const netOutflowNpc     = Math.max(0, weeklyWageBillNpc - weeklyIncomeNpc);
-  const weeksRunwayNpc    = Math.min(netOutflowNpc > 0 ? Math.floor(sellLive.balance / netOutflowNpc) : 52, 52);
+  const weeksRunwayNpc = weeksRunwayFor(sellLive);
```

### 3e. `npcClubDebugAssessment.ts` — the copy deleted, and the screen now mirrors the brain

`assessNpcFinance(club, season)` takes the season shape (templates, weeks, home games, the
division's TV, the published thresholds) and calls `npcSolvencyAssessment`. It returns a new
`band` field. The file's header promises *"not a prettier parallel calculation"*; it now keeps
that promise by calling the engine's function instead of restating it. Its three duplicated
threshold literals are demoted to colour-coding only; the band itself comes back on the
assessment, resolved from the published thresholds.

⚠️ The dashboard passes `46` / `23` to mirror `GameLoop`'s reserved locals — **deliberately
mirrored rather than corrected**, because this screen's job is to show what the brain sees, and
the guard test in §5 fails if the two drift.

### 3f. `ampWeeksRunway` — the player's DOF, on the chart's own inputs

`buildProjection`'s store-reading body is extracted as `buildProjectionInputs()`;
`buildProjection` is now `projectBands(inputs, overrides)` over it, and
`ampWeeksRunway()` is `runwayWeeks(buildProjectionInputs().inputs)`.

🟢 **The player's chart cannot move**, by construction: same inputs, same `projectBands`, same
overrides path. Brief §5.2 satisfied structurally rather than by measurement.

⚠️ **`ampWeeksRunway`'s own value DOES change**, in two ways, and this is the one change I cannot
measure from a world export (it needs a live save): it now **counts the season-end lump** the chart
already showed (more optimistic near a boundary — the owner's stated intent), and it is **capped at
52** where it was unbounded. Every consumer compares it against 4 / 8 / 12 / 16 weeks, so the cap
is inert at the decision.

---

## 4. 🔴 THE MEASUREMENT

`a17-run-2026-11-19/measure.ts`, structured after A12's so the two are comparable: the same
`game-config-en.LIVE.json`, the same two world exports, the same modelled wage bill
(`WAGE_TO_TURNOVER_BP` = 60% of authored turnover — **a model**, because packs are a census and no
export carries NPC squads). The OLD expressions are inlined **verbatim from `c65bfa91`** and run
side by side with the new ones on identical inputs.

### 4a. The brain's verdict: ZERO change, every club, every tier, both exports

```
tier  n   BRAIN VERDICT (old → new)                     FIRE-SALE DISCOUNT TIER (old → new)
  1   16  healthy 16             → healthy 16              25-50% 16                  → normal 16
  2   16  healthy 3 warn 3 crisis 10 → healthy 3 warn 3 crisis 10  25-50% 16          → 20-35% 10 normal 6
  3   16  healthy 10 warn 5 crisis 1 → healthy 10 warn 5 crisis 1  25-50% 16          → 20-35% 1 normal 15
  4   16  healthy 14 warn 2      → healthy 14 warn 2       25-50% 16                  → normal 16
  5   16  healthy 15 warn 1      → healthy 15 warn 1       20-35% 13 25-50% 3         → normal 16
  6   16  healthy 16             → healthy 16              20-35% 16                  → normal 16
  7   16  healthy 15 warn 1      → healthy 15 warn 1       normal 16                  → normal 16
  8   15  healthy 15             → healthy 15              normal 15                  → normal 15
  EN TOTAL: brain-verdict flips 0, fire-sale-tier flips 96
```
(SC, same export: 0 brain flips of 111 clubs, 92 fire-sale-tier flips. The 21:48 export: 0 and 96
for EN, 0 and 80 for SC.)

**0 verdict flips across 460 club-readings.** That is the direct consequence of §2a and §2b: on the
brain's own inputs the projection crossing and `balance / deficit` are **the same number**, because
the amortised income term leaves no lump inside the horizon to be timed differently.

⚠️ **So the brief's §5.1 deliverable — "which verdicts change per tier" — is a table of zeroes, and
that is the honest answer rather than a failed measurement.** The owner's instruction is satisfied
by the decision-making now being mirrored; it did not need the verdict to move, and it is better
that it did not.

### 4b. The fire-sale discount: 188 of 238 clubs change tier — including every tier-1 club

`runSellPlayerAction` discounts a listed player by **25–50% when runway < 4**, **20–35% when
runway < 12**, 5–15% otherwise. On the old copy (sponsors only, no investors, no matchday, no TV,
no upkeep):

| | old | new |
|---|---|---|
| **EN tier 1, all 16 clubs** | **25–50% off** | **5–15% off** (normal) |
| EN tier 6, all 16 | 20–35% off | normal |
| SC tier 1, all 14 | **25–50% off** | normal |
| SC tier 2 | 25–50% × 14 | 20–35% × 9, 25–50% × 4, normal × 1 |

A tier-1 club was discounting its players by up to half **while the brain that listed them read
`healthy`**, on a copy that could not see the £136m/season TV deal paid into the same club. This is
the behaviour change the task actually buys, and it is large.

### 4c. ⚠️ What got WORSE — the brief asked, and there is a real answer

Per-club direction of the fire-sale runway, newest export:

```
EN   better 124  same 1  WORSE 2   worst: Ashton-under-Lyne Robins (t8) −8w
SC   better 109  same 0  WORSE 2   worst: Kilwinning Rovers (t7) −1w
```

**4 clubs of 238 read worse, and the cause is upkeep.** The old copy subtracted the wage bill
only; the brain subtracts facility maintenance too. A deep-tier club whose ground eats its
revenue — exactly the case `npcSolvency`'s own comment was written about — therefore reads 8 weeks
shorter now. **That is a correction, not a regression**, and it is the movement in the other
direction the brief predicted (though for a different reason than it gave).

### 4d. 🔴 THE TIMED VARIANT — the literal reading of "mirror the chart" folds the top of the pyramid

`buildProjection` places the player's season-end money **at the boundary**. Doing the same for
NPC clubs — taking TV out of weekly income and giving it to `seasonEndIncome` — is what a literal
"use the same projections" implies. Measured:

```
EN tier 1  week  1/46:  folded 16        SC tier 1  week  1/46:  folded 14
EN tier 1  week 23/46:  folded 16        SC tier 1  week 23/46:  folded 14
EN tier 1  week 44/46:  folded 16        SC tier 1  week 44/46:  folded 14
EN tier 8  week  1/46:  healthy 15       SC tier 8  week  1/46:  healthy 13
```

**Every tier-1 club in both countries, `folded`, in every week of the season.** TV is ~70% of a
tier-1 NPC club's weekly income (£2.96m/wk of £4.19m); without it the club is £3.17m/wk short
against a £4.54m balance, so the projected balance crosses zero **inside two weeks** and the lump
lands in week 45. The crossing happens long before the money arrives — which is *arithmetically
correct* and *catastrophic as a verdict*, and it would fire-sale all sixteen squads in week 1.

🔴 **So the amortisation stays, and this is the one place the two sides are intentionally not
identical.** It is recorded at the site, in `game-mechanics.md` and here. **Whether an NPC club's
seasonal money is smoothed or timed is an owner-level design question** — it is really a question
about whether NPC balances are allowed to go deeply negative mid-season — and it is not an
arithmetic one. The derivation is shared either way, which is what the owner asked for.

### 4e. A12's §3b sweep re-run: IDENTICAL under both derivations

```
EN t1 (23 → 15 home games)      OLD  40%:0  50%:0  55%:0  60%:16  65%:11  70%:8
                                NEW  40%:0  50%:0  55%:0  60%:16  65%:11  70%:8
SC t1 (23 → 13 home games)      OLD  40%:0  50%:0  55%:0  60%:14  65%:14  70%:1
                                NEW  40%:0  50%:0  55%:0  60%:14  65%:14  70%:1
EN t8                           OLD/NEW  all zero
SC t8 (23 → 11, 21:48 export)   OLD/NEW  40%:1  50%:3  55%:4  60%:4  65%:7  70%:7
```

---

## 5. 🔴 §7 — `GameLoop.ts:1520`. UNTOUCHED, and the answer is NO.

The brief: *"Report what your change does to A12's 16/16 flip figure — if a smooth measure makes
correcting it safe, that is the single most useful sentence in your report."*

🔴 **It does nothing to it. The flip figure is unchanged, and correcting `NPC_HOME_GAMES_PER_SEASON`
is no safer than it was yesterday.** §4e is the proof: the sweep is identical under both
derivations, so the 0→16 jump was never an artefact of the arithmetic. **A smooth measure cannot
help, because the measure was already smooth** (§2a).

What actually produces the 16/16 is §2a's narrowness: a tier-1 balance worth one week of turnover
leaves a four-percent-of-income window between "52 weeks" and `warn`, and the home-game correction
is a 7.3% income step that clears it in one move. **The levers that would change that are the
balance, the cap, or banding on margin rather than weeks** — the first is calibration (frozen), the
second and third are the published-config constraint the brief forbids touching. **So the decision
on line 1520 is still exactly where A12 left it, with the same figures.** The asymmetry A12
deliberately left (budget 15/11, verdict 23) also still stands, in the same safe direction.

---

## 6. Verification

### 6a. `tsc`

```
$ npx tsc --noEmit
$ echo $?
0
```

### 6b. `npm test` — suite COUNT confirmed

```
$ npx jest --listTests | wc -l
     647
$ npx jest
Test Suites: 647 passed, 647 total
Tests:       3 skipped, 10786 passed, 10789 total
```

**BASELINE-MEASURED-HERE**

The brief's known-environment figure of 646 / 10,772 is `dev`; this is `new-game-save`.
⚠️ `CLAUDE.md`'s table has no row for this tree at this commit — flagged for the PM in §7.

**One pre-existing guard needed repointing, not weakening:** `npcRescue.test.ts` source-reads
`GameLoop.ts` for `sumNpcSponsorIncome(npcLive) + sumNpcInvestorIncome(npcLive)`, and the term
moved into `assessNpcSolvency`, where the parameter is `club`. The regex now matches either name —
**the defect it guards is the `||`, not the identifier** — and I confirmed it still fails when the
`||` shape is reintroduced.

### 6c. §6.3 — the smoothness test. ⚠️ It passes BEFORE the change too, and I am saying so.

`src/__tests__/economy/oneRunwayImplementation.test.ts` asserts that a club a penny either side of
break-even reads the same runway, that the curve never moves more than a week for a penny of
deficit anywhere on it, and that it is monotone. **The brief calls this "the whole point of the
task"; per §2a it was already true of the code being replaced.** The test is still worth having —
it fails for any derivation that branches on the *sign* of the net flow rather than projecting a
balance — but it is a **property pin, not a regression test for a live defect**, and the comment at
the site says exactly that. Reporting it as a passing regression test would have been false.

### 6d. §6.4 — the season-end-lump test, which DOES distinguish old from new

A club with £100,000, a £10,000/wk deficit and £1,000,000 of TV landing in week 6 reads **52 weeks
/ `healthy`**; the same club with the money landing in week 20 reads **10 weeks / `crisis`**. Plus
the NPC-side pair: a £20m/season TV deal takes a club from `crisis` (4 weeks) to `healthy`
(>26 weeks) through the income term, and upkeep moves a comfortable club to 20 weeks.

### 6e. §6.5 — the "exactly one implementation" guard

Names all five files (`npcSolvency`, `npcClubDebugAssessment`, `npcTransferExecutors`,
`FinancialProjectionService`, `GameLoop`, plus `NpcClubDashboard` for the mirrored constants),
strips comments — every one of those files discusses the old expression in prose — and asserts no
`balance / netOutflow` or `netOutflow > 0 ?` survives in code outside the core, that each site
reaches the shared function, and that only `projection.ts` declares the arithmetic.

**Verified to bite:** re-adding `netOutflow > 0 ? Math.floor(b / netOutflow) : 52` to
`npcClubDebugAssessment.ts` fails it.

### 6f. §6.6 — the economy gate is byte-identical

```
$ npx tsx scripts/economy/variantGate.ts --export game-config-en.LIVE.json \
    --starter-config starter-config.LIVE.json --world world.json --country EN
$ cmp gate-before.txt gate-after.txt && echo BYTE-IDENTICAL
BYTE-IDENTICAL
$ md5 -q gate-before.txt gate-after.txt
c5941b3008fe9cfa6b881ef22235f48e
c5941b3008fe9cfa6b881ef22235f48e
```

Attributed by **stashing and re-running**, per the standing notes, not by inspection.

⚠️ **This is NOT the md5 A12 recorded** (`24f2d74db39fccd15f349316fadedd62`). Attributed per commit:

```
ea7f8bd2  24f2d74db39fccd15f349316fadedd62
ea92859a  24f2d74db39fccd15f349316fadedd62
0964fedc  24f2d74db39fccd15f349316fadedd62   ← A14, fan base: gate unmoved
c65bfa91  c5941b3008fe9cfa6b881ef22235f48e   ← A15, harness wage derivation: gate MOVED
```

**It moved at A15, which A15's own `last-sync` entry states** (*"moves by one penny at three
tiers"*). Expected, pre-existing, and not mine — recorded here only because A12's hash is the one
written down and the next agent to compare will be puzzled.

### 6g. Tick cost

**The verdict's own cost is unchanged** — the per-club pass computes exactly what it computed
before, through one function instead of inline, and `runwayWeeks` adds at most two or three
`projectBands` calls of pure arithmetic per club. No new statements: everything it reads was
already loaded, and the per-club league lookup is still the map built once for the pyramid.

⚠️ **One site gets slightly more expensive, bounded and deliberately:** the fire-sale discount now
computes the brain's full income term (including `computeNpcMatchdayIncome`) instead of summing
sponsors. That runs **per queued sale**, not per club, so it is bounded by the number of sales in a
tick. The alternative was keeping a cheaper copy that disagrees, which is the whole defect.

### 6h. Standing note §1 — no CHECKS line added, on purpose

Nothing in this task needed a figure only a device could give: the measurement is entirely offline,
from the live config and two world exports. And **the instrument this change improves is itself a
debug screen** — the NPC Club Dashboard now shows the brain's own figures rather than a parallel
calculation, which is what the Prestwick reading (§2d) will be re-read off. Per standing note §2,
adding a line to an already-heavy report to say the same thing would not earn it.

---

## 7. `.context`

- **`07_synthesis/output/game-mechanics.md`** — "NPC solvency" gains a **ONE RUNWAY** subsection
  carrying §2's corrections, the 0-flip / 188-flip measurement, the timed-variant result and the
  knife-edge note; the amortisation paragraph now cites the measurement rather than asserting it.
- **`shared/last-sync.md`** — one pass entry appended.

**Flagged, not restructured** (the PM's call):

1. **`next-work-plan.md`'s "NOW THE LIVE DECISION — the tier-1 knife edge"** states the break-even
   cliff as the mechanism and offers *"(ii) make the verdict degrade smoothly"* as the fix. Per §2a
   the measure was already smooth, so **(ii) as written has already been done and changes nothing.**
   The section's conclusion (the verdict is emergent, not authored) survives; its mechanism does
   not.
2. **The same plan's Prestwick paragraph** predicts A17 fixes that reading. Per §2d it does not —
   only its upkeep half does. Worth correcting before the next device pass sets an expectation.
3. **`game-mechanics.md:1676`** still quotes the pre-2026-11-13 formula as the current one in its
   opening lines before the ✅ that supersedes it. I left the historical line alone and added
   below it rather than editing a superseded section.
4. **`CLAUDE.md`'s suite-count table has no `new-game-save` row at `c65bfa91`** — the nearest is
   640 / 10,704 at `e03dd6da`+A12. **BASELINE-ROW**

---

## 8. What I did not do

- **No authored economy figure changed, and no dial proposed** (§0, §9).
- **`npcSolvencyThresholds`' units and the band boundaries are untouched** (§3, §9).
- **`GameLoop.ts:1520` untouched**, comment block intact (§7, §9) — and §5 says the correction is
  no safer.
- **Nothing in `wunderkind-backend`** (A16 was working there).
- **Not pushed, not deployed.**
- **No scratch file inside either repository.** Harness and outputs are in
  `a17-run-2026-11-19/`; the throwaway probe stayed in my scratchpad.
- Docs folder listed before committing: nothing matching `*-correction.md` / `*-addition.md` is
  newer than this brief (`a4-premise-correction.md` and `a3-tvdeal-addition.md` both predate it).
  `a16-test-pollution-report.md` and `a19-checks-false-pass-brief.md` landed since and touch
  neither this code nor these premises.

---

## 9. The one thing I would put in front of the owner

**The decision-making is now mirrored, and the brain's verdict did not move — but the runway is a
measure with almost no resolution where it is being asked the hardest question.** A tier-1 club's
balance is worth **one week** of its turnover, so between "fine" and "warn" there is a four-percent
window, and *every* club in the division sits in it at once. That is why one income change flipped
sixteen clubs, and it will do so again on the next one.

**Nothing in this task could fix that**, because the fix is either the balances (calibration,
frozen) or the unit (`npcSolvencyThresholds` is published in weeks). ⚠️ **But it is now the single
thing standing between a multi-season balance run and a meaningful result**, and it is cheap to
state as a choice: *should an NPC club's financial health be measured in weeks of runway, or as a
margin against its own turnover?* The second has resolution everywhere the design puts clubs near
break-even, which the owner says is most of the pyramid.
