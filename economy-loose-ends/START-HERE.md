# START HERE — economy workstream, as at 2026-11-22 early hours

**Read this file first. It supersedes `HANDOVER-2026-11-21-EOD.md`**, which is the previous day's
copy of this same file and remains accurate for the A30/A31/A32 history, the owner's earlier
rulings, and the falsification table for Scotland. Read it second.

---

## 1. 🔴 YOUR FIRST TASK — every NPC club's season-2 budget records ZERO income

**This is the single highest-value defect open, and it is almost certainly the cause of the
owner's report that "tier accuracy is off."** It was found at 02:30 on 2026-11-22 from a world-club
JSON payload the owner pasted, not from a test. Nothing is fixed. No agent has been briefed on it.

### The evidence, verbatim

Birmingham Forest — **tier 1**, reputation 90.1, balance £149.1M, two investors worth £112.5M per
season, two sponsors at £343.2k/wk, 20,082 season tickets at £16.9M:

```json
"seasonBudget": {
  "season": 2,
  "createdWeek": 45,
  "incomePence": 0,
  "wageReservationPence": 22739167442,
  "wageSharePence": 0,
  "wageFloorPence": 22739167442,
  "maintenanceReservationPence": 159158528,
  "overCommitted": true,
  "surplusPence": -22898325970
}
```

It is literal, not a rounding artefact: `surplusPence` is exactly
`0 − 22,739,167,442 − 159,158,528`. And `wageSharePence: 0` with `wageReservationPence` equal to
`wageFloorPence` **to the penny** means the reservation never derived from income at all — it fell
straight through to the floor, which is the club's existing wage bill.

### The cause, traced to two line numbers in one function

Both of these live inside `performSeasonTransition` (`src/engine/SeasonTransitionService.ts:4802`):

| line | what it does |
|---|---|
| `:5081` | `setNpcSeasonBudgets(nextSeason)` — **reads** `club.weeklyIncome` |
| `:5419` | the season refresh pass — **writes** `club.weeklyIncome` |

`SeasonBudgetService.ts:283` (`setNpcSeasonBudgets`) derives the budget with:

```ts
incomePence: (club.weeklyIncome ?? 0) * weeks,
```

Nothing writes `weeklyIncome` at world build — `:5419` is its **only** writer in the codebase
(`grep -rn "weeklyIncome:" src/engine src/stores`). So:

- **First transition:** the field has never existed. `?? 0` ⇒ `incomePence: 0` for every NPC club
  in the pyramid.
- **Every later transition:** the budget reads the value written one transition ago, so NPC income
  is permanently one season stale.

### ✅ CONFIRMED PYRAMID-WIDE — three clubs, three tiers, one control

Three world-club payloads captured 2026-11-22, all with `"incomePence": 0`, `"wageSharePence": 0`,
`wageReservationPence == wageFloorPence` and `"overCommitted": true`:

| club | tier | `weeklyIncome` | reconciles as |
|---|---|---|---|
| Birmingham Forest | 1 | 278,905,163 | sponsors 34,320,231 + investors 244,584,932 ✅ |
| Derby Forest | 3 | 129,482,029 | sponsors 3,971,815 + investors 125,510,214 ✅ |
| Ormskirk Wednesday | 7 | 45,766 | **no investors at all** — equals its one sponsor exactly ✅ |

🔵 **Ormskirk is the control that rules out the investor question as the cause.** It has
`"investors": []`, so the only input is a single sponsor at `weeklyPaymentPence: 45766` — and its
`weeklyIncome` is exactly that. The field is computed correctly at every tier, with and without
investors. It simply never reaches a budget.

### 🔴 It probably disables NPC STAFF ANCHORING too — check this first

In the same payload, **all eight sampled staff rows read `stored/band 1.00` with
`stored/npc-anchored` between 1.16 and 1.46**, each flagged *"OFF ITS OWN ANCHORED RATE"*. An
earlier save on the same build read 1.01–1.05 with the band *not* governing.

These clubs **have** season budgets, so `npcStaffWagePence` should be the governing rate. The
likely chain: `incomePence: 0` ⇒ the budget yields no anchored rate ⇒ `anchorNpcStaffWages` leaves
every row at its band price. **Unverified — the PM inferred it from the two payloads and did not
read `anchorNpcStaffWages`'s null path.** If it holds, the zero-income defect is the root of both
symptoms and fixing it closes the staff drift for free.

### Why the field itself is NOT the bug

`weeklyIncome: 278905163` on that club reproduces `:5419`'s formula exactly:

- sponsors `17,004,438 + 17,315,793` = **34,320,231**
- investors `(9,624,973,896 + 1,625,932,996) ÷ 46` = **244,584,932**
- total = **278,905,163** ✅

The computation is correct. It simply arrives ~340 lines after the budget that needed it.

### Why this is the tier-accuracy defect

Income-anchored wages are the mechanism that separates tiers — a club's wage scale follows its own
income. With `incomePence: 0` the anchor is dead from season 2 onward and the reservation just
re-asserts whatever the club already paid, so nothing pulls the divisions apart. It also explains
`overCommitted: true` on a club holding £149M, and the `[FAIL]` wage-coverage rows at t7/t8 in the
owner's CHECKS payloads.

### Before you fix it

- **Check whether the AMP club has the same ordering problem.** `setAmpSeasonBudget` runs in the
  same transition. NOT checked — I ran out of session.
- **Show the curve, don't ask for a number.** Per the standing mantra, report what the corrected
  income does to wage reservations at both ends of the pyramid before anything is tuned.
- A fix that reorders two calls inside a 700-line transition needs a test that pins the ORDER, not
  just the output — otherwise it silently regresses the next time the function is edited.

---

## 2. What this PM session did, so you can calibrate how much to trust this file

Same role as the previous day: **project manager and coordinator, not implementer.** The owner
restated it at the start (*"PM — brief agents"*). Every line of application and backend code
committed on 2026-11-21 and 2026-11-22 came from an agent session. The PM edited documentation,
`.context` and this folder only, and ran the deploys on explicit instruction.

**What the PM did:** briefed and sequenced A33 (parachute) and the world-pack cache session;
re-briefed A34 mid-flight after the owner corrected its premise; verified every agent commit
against the repo rather than accepting its report; read four device CHECKS payloads and a world-club
JSON against the code; found the zero-income defect in §1.

### 🔴 Where this PM was wrong, in order

Five of these. Four were caught by the owner, one by the PM itself. **This matters for how you read
the rest of the file.**

1. **Read a CHECKS payload as a clean result before reading the pack-version line that invalidates
   it.** The panel reported `MIXED: 14, 15`; everything below that row was measuring two world
   generations at once. The pack line is the gate on the whole panel — read it first, every time.
2. **Claimed the player-valuation misses were post-transition NPC re-anchoring.** Wrong:
   `SeasonBudgetService.ts:207` types the anchoring payload as
   `Partial<Pick<WorldClub, 'staff' | 'scouts'>>`. **NPC player wages are never re-anchored.** The
   real contributor is that nothing re-prices a squad when a club changes tier, while the
   comparator resolves `expected` at the club's CURRENT tier — so after promotion/relegation the
   row's verdicts stop being trustworthy. Still unfixed; see §4.
3. **Claimed sponsor/investor deals were being paid despite unmet conditions.** Wrong:
   `src/types/promise.ts` shows a promise is a forward commitment evaluated at `bySeasonOffset`,
   not a precondition. Paying while a promise is pending is correct.
4. **Suspected `sumNpcInvestorIncome(club)` was booking a season lump as a weekly rate** because
   some call sites omit the `weeksPerSeason` argument. Wrong: the default is `46`, the same value.
   No double-count. Do not re-discover this.
5. **Briefed A34 on an inverted premise** — "investor income is missing from the player's club" —
   when the AMP club *starts without investors*. The owner corrected it; the session was stopped
   mid-turn and re-briefed. See §4.

**The pattern, unchanged from yesterday and now confirmed twice over:** this PM's verification of
*committed code* was reliable; its *hypotheses about causes* were not, roughly one in four. **Treat
a claim in this folder as sound where it cites a file and line, and as a guess where it reasons
from symptoms.** Every §1 claim above cites a line and was checked.

---

## 3. State of the world

### Shipped and verified on device

| | status |
|---|---|
| Scout ability floor (A32) | ✅ **Confirmed on an NPC club.** Ashford (t7): scout rates 5 among coaches 6/6/4/3/3/3 — inside the span. Before the fix the flat ~15.75-point judgement term put a t8 scout above every coach beside it. |
| Scout *cost* | ✅ **Owner's words, 2026-11-22: "There is no issue with the cost of scouts, that issue has been resolved."** |
| Staff anchoring | ✅ 6 of 8 sampled NPC staff at `stored/npc-anchored` 1.01–1.05 after one season — mean-reversion behaving as designed. The two outliers (0.93, 1.10) are within that convergence; one sample cannot distinguish them from an unreached club, and the panel says so. |
| Scout judgement band | ✅ Live and observable: 44% / 25% / 14% / 4% down the pyramid at the shipped dial default of `10000`. |
| A full season | ✅ Completed end to end. Transition passes ran, promotion resolved, save intact. |

### Branches — ALL PUSHED as at this handover

| repo | branch | head | note |
|---|---|---|---|
| `wunderkind-app` | `new-game-save` | `48b19c34` | A33's parachute fix |
| `wunderkind-backend` | `development` | `5f1aff4f` | world-pack rebuild reporting |
| `wunderkind-docs` | `master` | this commit | 17+ commits of reports and briefs |

**Last deploy: OTA 495 (`201384a9`), backend run #288.** Neither `48b19c34` nor `5f1aff4f` is
deployed — they are on work branches only. Deploying means merging the work branch into `dev` and
pushing; the owner does it.

### Closed today

- **A33 — `parachute_state` invariant.** `48b19c34`. The parachute clear wrote an empty string;
  `json_valid('')` is 0, so an ordinary promotion tripped a `major` invariant against an intact
  save. Now deletes the row. `npc_parachute_state` never shared the defect. 663 suites / 11,181
  tests, zero failures, `tsc` clean. PM-verified against the repo: 3 files, the service, the
  invariant docblock and the test.
- **World-pack cache rebuild.** `5f1aff4f` (backend). **Conclusion: the backend rebuild works.** It
  cannot serve a v14 payload at v15 — the claim and the per-row read both filter on version. The
  `MIXED` state is **app-side**: `src/economy/worldPackVersion.ts`'s module cache survives "Start
  New Game" and save-loads. 🔴 **Practical consequence for the owner: fully restart the app before
  a fresh save; "Start New Game" alone may not clear it.** The backend change makes the rebuild
  report what it cleared and what it spared. PHPUnit 3,316 tests, 3 failures, all baseline #1–#3 by
  name. Report: `mixed-pack-version-report.md`.

---

## 4. Open items, in the order the PM would take them

1. 🔴 **The zero-income defect — §1.** Everything else is smaller.
2. 🔴 **A34 — the NPC investor lump.** The owner's ruling, verbatim: *"NPC clubs that start with
   investors should receive that lump sum at game start."* The AMP `Investor`
   (`src/types/market.ts:178`) carries `investmentAmount` in pence **and** `seasonalPaymentPence`.
   The NPC `NpcInvestorContract` (`src/types/world.ts:91`) carries only the seasonal payment —
   **there is no investment-amount field at all.** So an NPC seeded with two investors at
   `equityTaken: 20` each has given away 40% of itself and received nothing. The lump is not paid
   late; it was never modelled. NPC investors are seeded on device at world build
   (`src/stores/worldStore.ts:642`, `generateNpcInvestorContracts`) — correct, since the pack
   carries no money. Reuse the AMP derivation rather than authoring a new number, store the amount
   on the contract as optional for backward compatibility (the `equityTaken` pattern,
   `world.ts:103-112`), and show the per-tier starting-balance curve before anyone rules on it.
   **A34 had uncommitted work in `economyDiagnostics.ts`, `worldStore.ts` and a new
   `worldStore.investorSeed.test.ts` when the session was wound down — check
   `a34-investor-asymmetry-readonly-finding.md` for what it established and whether that work
   landed.**
3. **The hire screen displays the wrong field for scouts.** `src/screens/office/HireScreen.tsx:220-224`
   — `getAbility` reads `(item.data as MarketScout).experience`, and the comment above it
   (*"Both already 0–100"*) is false for one of the two sources. It is safe for poachable NPC staff
   (`:103` sets `experience`, `ability` and all seven judgements to the same `coachingAbility`) but
   **wrong for the generated free-agent pool at `:245`**, where `experience` is career length
   (4–34) and `ability` is derived. Owner's screenshot: two scouts both displaying "4" at £27 and
   £149. The wage is correct; the number beside it is not. Standing owner ruling, 2026-11-20: a
   scout's ability is the derived `ability`, **never** `experience`.
4. **Coach wages flatten above ability ~5 on the hire screen.** Unexplained. Abilities 2/3/4 land
   at £26/£72/£149, which tracks `ability^2.5` almost exactly; 5, 7, 13 and 14 all sit at £43–47
   where the curve says a 13 should be in the thousands. Coaches read `coachingAbility`, so item 3
   does not account for it. **Hypothesis only, unverified: the list may merge free agents with
   poachable NPC staff carrying their current anchored salary rather than an asking price.** Eleven
   rows is not evidence — measure it.
5. **Tier-1 facilities look un-tiered.** Birmingham Forest (t1) has `north_stand: 9` and
   `east_stand: 7` but `training_pitch: 0`, `physio_clinic: 0`, `strength_suite: 0`,
   `technical_zone: 0`, `scouting_center: 0`, `advanced_scouting: 0`, `scout_fleet: 0`,
   `museum: 0` — while running `hydro_pool: 5` and a `biometric_hub: 2`. Advanced facilities
   present, foundational ones absent. If facility levels roll per-facility with no tier floor, then
   facilities do not express tier at all — a second, player-visible route to "tier accuracy is
   off", and it feeds upkeep (that club reserves only £1.59M of maintenance for a season).
   **Not investigated. Start at whatever seeds `facilities` in `worldStore`'s world build.**
   ⚠️ **Sharpened 2026-11-22 by a third payload.** Tier COUNT does scale — Ormskirk Wednesday (t7)
   carries only 8 facility keys, the rest absent rather than zero, while t1 and t3 carry all 22. So
   the defect is not "facilities ignore tier" but **within-key zeros at the top**: Ormskirk (t7) has
   `training_pitch: 1` and `physio_clinic: 1`, while Birmingham (t1) has `training_pitch: 0` and
   Derby (t3) has `training_pitch: 0` and `scouting_center: 0`. A tier-7 club has a training pitch
   that the champion does not. Whatever rolls a level for a key that EXISTS appears to have no tier
   floor, even though the key set does.

13. **One extreme valuation outlier, worth its own look.** `t3 · Beeston Albion · Tobias Quirk DEF`,
    CA 4: **stored £8.00/wk against expected £303.69 — ratio 0.03.** Every other sub-band outlier in
    that payload sits between 0.39 and 1.21; this is an order of magnitude below the next worst. For
    comparison, the same CA 4 at t8 (`Swinton Rangers · Charlie Northumberland`) stored £314 against
    expected £297 and passed. So it is not a tier-scaling artefact — two clubs, same ability, 39×
    apart in what was written. ⚠️ `£8.00/wk` is close enough to a floor to be worth checking against
    `packWages`'s fallback chain (`ABSOLUTE_FLOOR_PENCE`, the scholarship wage) before assuming the
    curve produced it.
6. **The player-valuation comparator is only valid pre-transition.** `economyDiagnostics.ts:975`
   resolves `expected` at the club's current tier via `resolveEconomy(config, sample.tier)`, but
   nothing re-prices a squad when a club changes tier — `SeasonTransitionService` has no wage term.
   So after one season, promoted clubs read low and relegated clubs read high. ⚠️ The PM noted that
   tier 1 reading 4/4 low is **more than tier movement alone should produce**, so there is likely a
   second contributor. Do not close this on the tier-movement explanation alone.
7. **The `MIXED` pack row should refuse to report, not warn.** It is advisory and nothing gates on
   it, which is exactly the state in which every comparator below it reports confidently into
   nonsense. The PM lost a payload to this. ⚠️ `worldPackDiagnostics.ts` and `ChecksTab.tsx` have
   had several writers this week — keep any change minimal and say what you touched.
8. **The judgement row's comparator uses the wrong denominator.** It compares scout error to the
   **coach** ability span when the honest denominator is **player** ability spread. A32 agreed.
   Unruled by the owner. A real pass, not a tweak.
9. **`.context` byte headroom is ~3.0 KB.** PM-owned. The cheapest fix is pruning
   `.context/shared/last-sync.md`. **Offered to the owner and not authorised** — do not do it
   unasked.
10. **Backend `environment.md` is missing two test failure names:**
    `SeedLocationsCommandTest::testForceCountryDoesNotSeedOtherCountries` and
    `LocationConfigControllerTest::testSmallGivesWayWhenTheBandsOverlap` (leaked `location` row
    class).
11. **A third copy of the 70/30 scout blend** lives in
    `migrations/Version20261120100000.php:86-87` and backfills old abilities on a fresh DB.
12. **`sumNpcInvestorIncome`'s `weeksPerSeason = 46` default** is a hardcoded season length —
    the same smell as the five tiers-are-flexible violations, one axis over. Flagged, not fixed.

### Unruled owner dials — do not pick these yourself

`scoutJudgementBandBp` (12500 would hold EN t1 at its old accuracy); the 70/30 experience/judgement
weights; the ability-proportional split; authored turnover vs modelled (824% adrift at EN t8); the
non-monotonic wage-multiplier ladder; the band ceiling authored at 60 against a documented `null`.

---

## 5. Conventions that held and should keep holding

- **Agents do not push and do not deploy.** The owner does both. The PM pushed on 2026-11-22 only
  on the owner's explicit instruction to "push to relevant branches".
- **One writer per file per repository.** Stage by explicit path. **Never restore or commit a path
  you did not author.** The PM broke a near-miss version of this once and it is recorded in
  `agent-standing-notes.md`.
- **Reports and evidence live outside both repos**, here, verbatim — not summarised.
- **Never raise `contextDocSync.baseline.json` caps** to make a commit pass. They may only shrink.
- **This app's test baseline is ZERO failures on an idle machine.** The backend's documented three-
  to-five is a *different repository's* and has caused real regressions to be dismissed here.
  Confirm the suite COUNT, not just that nothing failed — `npx jest --listTests | wc -l`.
- **Count suites with `grep -c`, never `wc -l`** on anything that may lack a trailing newline.
- **Never hand a peer a list produced by `head`/`tail`.** The PM shipped a truncated 8-of-12 file
  list to a session once; it caught it.
- **MECHANISM FIRST, NUMBERS FROM OBSERVED DATA LATER.** The owner's development mantra, now a
  binding rule in `tribal-knowledge.md` Q4 and pinned by `contextDocSync.test.ts`. Ship the
  relationship with the number authored and observable; tune from data later.
- **The owner's own club balance is never a health signal** — it is whatever they chose to invest
  at club creation. Read solvency off the BUDGET panel's ratios.
- **Read the pack-version row before anything beneath it.** New today, and it cost a payload.
