<!-- STATUS --> **STATUS:**  🟢 LIVE — the queue, the review log and every decision. Start here.

---

# What comes after R2 and the harness fix (2026-11-18)

Two tasks are in flight: the backend finishing R2 to a commit
(`r2-finish-and-commit-brief.md`) and the app's tier-7 squad-size fix
(`app-harness-squad-size-brief.md`). This is the sequencing for everything behind them, grouped by
**what each piece is actually waiting on** rather than by how big it is.

## How sessions report back

Every brief carries this, and it goes in every brief written from here on.

- **Conclusions into `.context`** — `shared/last-sync.md` plus whatever stage the change affects.
  That is this project's own convention, it gets committed with the work, and it is what the next
  agent reads months later.
- **Raw evidence into `docs/economy-loose-ends/<task>-report.md`** — gate tables, test output,
  before/after comparisons, **pasted verbatim: the command and what it printed, never a summary of
  it.** "Tests extended" in place of a run is what left R2 unverifiable for a round.
- ⚠️ **Nothing scratch-shaped goes inside either repository.** No reports, gate dumps, traces,
  working notes or scratch files in `wunderkind-app` or `wunderkind-backend` — they live in this
  folder, which is outside both, and genuinely throwaway work goes in the agent's own scratchpad
  directory.

`.context` carries what is now true; the report file carries what proves it. A task is done when
both exist and the repo state matches them — which is also what makes relaying updates by hand
unnecessary.

## Who owns `.context`

**This session owns `.context` status and review, in both repositories** (owner's instruction,
2026-11-18). That does not change the ICM rule that the acting agent updates the stage its change
affects — it changes who curates the files:

- **An agent may** append its own pass entry to `shared/last-sync.md` and correct the stage text
  its own change makes wrong.
- **An agent may not** restructure a file, prune or rewrite earlier entries, or delete a superseded
  section even when it can see the section is wrong. It **flags** it in its report instead, naming
  the file and what it believes is stale.
- **The review** — after each task's commit lands — reads the entry against the diff, fixes stale
  or superseded text, and keeps the pass numbering honest. The reason for the split is that stale
  confident text is this project's worst documented failure mode, and the agent that just wrote a
  change is the worst-placed reader of whether its own entry is accurate.

**Queued for the next review**, deliberately not done while the backend session has that file
open: `wunderkind-backend/.context/stages/07_synthesis/output/current-focus.md`'s
"Superseded ... the derivation record" section still carries candidate C's figures (£288m, tier-1
base £74,102,400, the old ppm ladder) under a warning label rather than R2's. Labelling it was the
right call mid-task; it should be rewritten once the commit is in, so the file does not hold two
sets of numbers.

---

## Review log

### 2026-11-19 — deployed to dev: both repos, as ONE cut

`gh run 44516901111`. Backend `dev` **`87651a54`** (merge of `development` @ `52c8b3bf`), app
`dev` **`9a8b9663`** (merge of `new-game-save` @ `b8842812`). Work branches restored afterwards:
backend on `development`, app on `new-game-save`.

⚠️ **A backend-only deploy would have broken the dev environment, and nearly did.**
`deploy-dev.yml` triggers on a push to **`dev`**, not `development` — so the earlier push to
`development` deployed nothing, and the deploy needed a merge. Checking that merge found that app
`dev` did **not** contain `4706169b` ("Price the pack on the device"), the app half of
`WORLD_PACK_VERSION` 11. Deploying the backend alone would have served money-free v11 packs to a
build still reading `contractValue ?? 0` — **every player in a new save on a £0 wage**, which
`PlayerConversationService` divides by and `useWeeklyTick` turns into a free release. The
pack-economy plan said "one cut: app and backend together" and it meant it. Both merged and pushed,
app first so device pricing was live before money left the packs.

**Merged `dev` was tested before deploying, because it had to be:** `dev` held **183** commits not
on `development`, so the merge result was code neither branch had run. First full run showed **4**
failures — the three baseline items plus `NpcClubPlaceWeightingTest::testTheLargestTownOutdraws\
TheSmallestInItsOwnBand` ("70 is greater than 72"), which appears in no `development` run.
Isolated: **3/3 pass**. Second full run on the identical tree: **3 failures and that test passed.**
Composition-dependent, exactly as `environment.md`'s amended entry #4 describes.

🔴 **A SECOND npc_club-sensitive composition flake, and this one is probably ours to own.**
Entry #4 documents `NpcClubForeignClubsCitySizeTest` as sensitive to the shared test database's
`npc_club` count. `NpcClubPlaceWeightingTest` now looks sensitive the same way, and the plausible
trigger is the new fixtures landing in this batch — `LeagueSlotsAuthoringTest` and
`LeagueSlotsCorrectionTest` both create and delete `npc_club` rows, and
`WorldPackCarriesNoMoneyTest` and `InitializeLeaguesSponsorCensusTest` arrived with them. **Not a
production defect** — the shipped code is publication paths and two migrations. **Needs adding to
`environment.md`'s baseline on a work branch** (not committed to `dev` directly, which would
diverge it from `development`).

⚠️ **OWNER ACTION OUTSTANDING: `WORLD_PACK_VERSION` 11 invalidates every cached pack. The
worldpacks need regenerating by hand before device testing means anything.**


### 2026-11-19 — B1 + B2 + B3, done in the PM session: ✅ COMMITTED, unpushed

`wunderkind-backend` **`e2c855c6`** (B1+B2) and **`52c8b3bf`** (B3) on `development`, tree clean,
**5 ahead of `origin/development`**. Report: `b1-tvdeal-slots-report.md`.

**Three places my own brief was wrong, all found by doing the work:**

1. **B1 had FOUR publication sites, not three.** `LeagueService:302` builds its own league
   snapshot and had the same omission as the other three.
2. **B3's rule would have corrupted 6 rows.** The brief said target `rows + 1 if bottom tier`,
   from `sizeOf()`. The generator reserves the player's place at the deepest tier on **some boxes
   and not others** — EN reserves on the clone (18/…/17), CA, JP, NG, PL, US and SC do not
   (same count at every tier). The naive rule would write 9 over a correct 8 in five countries and
   **4 over SC's correct 3**. The migration now DETECTS the reservation. **The previous session's
   refusal to overwrite SC's 3 was right for a better reason than it knew.**
3. **"The gate must exit 0" was wrong for this box.** It exits 1 with **31 pre-existing failures**
   on the clone, unchanged by any of this work. "Unchanged" is the bar; "exit 0" is not.

**And a structural blind spot worth remembering:** `app:economy:wage-table` reads
`$league->getTvDeal()` off the entity, not a published surface, so it is **byte-identical before
and after B1** — it cannot see the defect that zeroed a division's TV income. An unchanged gate
is not evidence that nothing moved.

**Verification that was measured rather than claimed:** all four B1 tests proved meaningful by
stashing only the source files and watching them fail with the defect's own messages; B3 proved a
no-op on the clone by `slots`-column md5 identical across migrate → rollback → re-migrate, with
`rows_changed = 0` and the stash dropped on `down()`; `3274 tests, 3 failures`, baseline items
1–3 exactly with item 4 at zero.

⚠️ **On the deployed box B3 changes 12 rows and per-club payout figures rise 12.5% (EN) /
28.6% (SC 1–4). That may breach check 8's `PAYOUT_SHARE` bounds — a finding for the owner, not a
bound to relax.** No payout money moves; `LeaguePayoutResolver` never divides by size.

**Still open, reported not fixed:** `sizeOf()`'s unconditional `+1` is latent for any deriving
league on an unreserved box (inert today — SC 5–8 do reserve).


### 2026-11-19 — A3 + A4 + A3b + A5: ✅ ACCEPTED with two follow-ups, committed, unpushed

`wunderkind-backend` **`603ea577`** "Stop four numbers being side effects" on `development`,
10 files, +1035/−10, tree clean, **3 ahead of `origin/development`**. Report:
`a3-a4-report.md` (759 lines). **No fenced file touched** (`EconomyWageTableCommand`,
`StarterAbilityRangeService`, `EconomyScaleResolver`, `WorldInitializationService`) and
**`WORLD_PACK_VERSION` untouched**, both verified against the diff rather than taken on trust.

**A3's trap is properly pinned — this was the whole risk and it is closed by four named tests:**
`testARoundTripLeavesAnInheritedLeaguesPayoutColumnsNull`,
`testAFreshExportsPayoutsEqualTheResolver`,
`testAnExplicitOverrideSurvivesTheRoundTripAsAnOverride`, and
`testALegacyFileWithoutTheOverrideKeysStillRestoresItsColumns`. Resolved figures ship under the
plain keys, raw under `*Override`, import prefers the override with a documented legacy fallback.

**A4 landed the conservative design and reached it independently.** Authors **only where
`slots = 0`**, after finding SC tier 8 authored at 3 while deriving 4 on its clone and refusing to
overwrite a decision the migration never made. Verified by apply → rollback → re-apply with
`slots_changed = 0` and the stash tables dropped on `down()`.

**A5's diagnosis beat both of my hypotheses.** Not a null coerced to zero and not fixture drift:
`EconomyAdminTest` writes base £100m with a tier-2 ratio of 2× into the **single shared
`game_config` row** via the real admin save and never restores it, so the SE tier-2 fixture
inherited £200m. Cross-test pollution. The test now owns the payout config for its duration.
**It also corrected my brief:** I called baseline #4 "a flake that alternates methods by run
composition"; it showed on a stashed clean tree that identical consecutive commands give 1, 2, 2
and the suite gives 2, **zero**, 2 — so a full run shows three, four or five failures unchanged.
My phrasing invited the wrong inference exactly when you add tests. `environment.md` amended.

#### ⚠️ TWO FOLLOW-UPS, BOTH BECAUSE A RELAY DID NOT REACH IT IN TIME

Neither `a4-premise-correction.md` nor `a3-tvdeal-addition.md` was ever read by the agent — it is
a CLI session with no channel from the PM session, and both had to go through the owner by hand.

**1. A false statement about the deployed box is now committed.**
`Version20261119090000`'s docblock reads *"on the deployed box — where `slots` is 0 — it authors
the counts that box is already using."* The deployed box has EN `slots = 18`, not 0; only SC tiers
5–8 are 0. **The code is right and the record is wrong** — the `only where 0` guard means the
migration behaves correctly regardless. Fix the docblock; do not touch the migration's logic.

**2. `tvDeal` missed the window and is now its own task.** See the `tvDeal` section above. A3 is
committed, so folding it in is no longer a one-file addition to open work.


### 2026-11-19 — A2, the wage ladder samples abilities that exist: ✅ ACCEPTED, committed, unpushed

`wunderkind-app` **`b8842812`** on `new-game-save`, 6 files, +198/−20, tree clean, 2 ahead of
`origin/new-game-save`. Amended twice (`71fd47c7` → `98a5f3ea` → `b8842812`) — **message only,
verified: identical 6 files and identical +198/−20 at each hash.** Report:
`a2-wage-ladder-report.md`.

**Verified independently, not taken from the report:** `tsc` exit 0; 637 suites / 10,652 tests with
`npx jest --listTests` agreeing at 637; the +5 reconciles exactly (one assertion split into two,
four new `wageLadderAbilities` cases); tier-8 band pinned at ≤ 7 plus inverted, single-point and
negative-band cases. **The gate cannot have moved, and this is structural rather than a stash comparison:**
`economyWorkings` has **exactly two importers in the whole tree** —
`components/finances/EconomyWorkingsPanel.tsx` and its own test — and `scripts/economy/` never
references it, directly or transitively. `wages.ts`, `economyConfig.ts` and `wageScaleMicroPence`
are untouched. (The commit also offers a stash md5, `b2e462dd8732084a6b439dbaa2db6862`; the import
graph is the stronger proof and is what I relied on.)

**Its one deviation was correct and my brief was wrong.** I instructed it to put the new caveat
through the translation catalog. `EconomyWorkingsPanel.tsx` has carried a documented
*"Literals, not catalog keys — deliberately, and consistent with `ChecksTab`"* convention since
it was written — confirmed present in `HEAD`'s copy at line 24, so it predates this change and was
not retrofitted. The panel is debug-gated and its two existing caveats are plain English for the
same reason. It raised the conflict, got the owner's call, wrote a literal, and flagged it. **A
brief that contradicts a documented local convention should lose to the convention** — log this as
the pattern.

**`.context` reviewed as owner and approved.** `environment.md`'s green-master bar row folds the
previous row's reconciliation into the new one rather than overwriting it, so the branch's
measurement history survives; `last-sync.md` appends one pass entry and prunes nothing;
`game-mechanics.md` §13's open bullet becomes a ✅ FIXED record that keeps *expected mature
ability* explicitly open. No restructuring, nothing deleted.

**What this does NOT fix, and is now the hook:** the ladder still prices the **potential** band.
The panel says so in as many words. Sampling expected mature ability is queue item #6 and waits on
the reference-squad decision.


### 2026-11-18 — the harness reference-squad floor: ✅ accepted

`harness-reference-squad-floor`, `b8ce310c` (fix + 2 tests) and `2523414a` (`.context`, eightieth
pass), cut from `dev` @ `a3acb25a`, **not pushed and not merged**. Evidence:
`harness-squad-size-report.md`.

Verified independently rather than accepted: the gate's COVERAGE block is **byte-identical** to a
pre-fix baseline run of my own; `ENGLAND_DEV`'s tier 7 already carried the floored `appSquadSize:
17`, so their "no second defect" claim holds; and the five lines that moved are all tier 7, all in
the direction a smaller reference squad implies. `.context` edits are in the right files — the
green-master bar was updated in `01_overview/output/environment.md`, which **owns** it, not only in
the gitignored `CLAUDE.md` mirror — and no earlier entry was curated.

**Two things came back the other way, and both are mine to own:**

1. ⚠️ **The brief had the direction wrong.** I wrote that the app's tier-7 wage figure was "about
   5% low"; it was about 5% **high**, and the agent corrected it in the code comment. The gate
   confirms them: flooring drops tier-7 `bill%` from 115.8% to 112.7%.
2. ⚠️ **The 3.2-point AUTHORED wage-share spread was this bug, not a config property** — it
   flattens to a dead 60.0% at every tier. I had pinned "spread 3.2 points" as an expectation in
   `r2-economy-authoring-brief.md` §5 and `candidate-c-rollout.md`, so the backend session was
   about to validate R2 against a figure that is an app defect. **Both corrected 2026-11-18**, with
   the value now stated per checkout (0.0 with `b8ce310c`, 3.2 without, and the 63.2% is tier 7
   alone either way). This is the failure mode this project treats as the worst one, and it was in
   my own document.

**Action it creates: merge `harness-reference-squad-floor` into `dev` before tranche B1's gate
run**, so there is one answer to what the wage-share row should read rather than two. The app's
main checkout is currently sitting on that branch rather than on `dev` — worth knowing before
anyone runs anything there.

### 2026-11-18 — R2's backend authoring: ✅ accepted, committed and merged

`71471578` on `development`, merged to `dev` as `459dac4b` (`--no-ff`). **Neither repo is pushed:**
backend `dev` is 2 commits ahead of `origin/dev`, app `dev` is 4. Evidence:
`r2-finish-report.md` and `r2-run-2026-11-18/`.

Verified rather than accepted: the gate file's only non-comment change is the two constants —
`PAYOUT_SHARE_MIN_PCT`, `CHAMPION_SHARE_MAX_PCT` and `PAYOUT_FLATNESS_TOLERANCE_PP` are untouched,
no check body moved, no tier special-cased. I diffed the two full-suite artefacts myself: the
baseline and the post-change run fail in **the same five classes**, and the only asymmetry is a
second method of `NpcClubForeignClubsCitySizeTest`, the class they showed to be non-deterministic.
No regression.

**Both unmeetable commit conditions were amended, not waived** — condition 1 to "no regression
against a full-suite baseline at `740f2c8e`", condition 3 to allow "a named pre-existing defect
shown independent of R2". The session stopped and reported rather than reading the rule
generously, which is what made the amendment a decision instead of a drift.

**Three corrections made in review, all of them the kind the owner/agent split exists for:**

1. **Finding 4 was labelled NEW and is not.** `bankruptcyDeductionTiers`' collapse is already in
   the same file's 2026-11-12 "Still open" paragraph and analysed in
   `docs/economy-threshold-review.md` §1. Re-labelled, with the genuinely additive part named: the
   tier-1 measurement, and the proof that the bill is a function of the turnover row alone, which
   is what made those ten gate lines attributable.
2. **The queued cleanup is done.** `current-focus.md`'s superseded derivation record no longer
   holds candidate C's tables under a warning label — the header now states R2's figures and marks
   everything below as the record of what was ruled out.
3. **`NpcClubForeignClubsCitySizeTest` is now written down as a known flake.** An intermittent
   failure nobody has recorded is indistinguishable from a regression the next time it fires, and
   it came within one test of masking this one.

**Both pushed 2026-11-18 on the owner's go-ahead.** Backend `dev` → `459dac4b`, Deploy Development
run **276**; app `dev` → `94236541`, OTA **481**. R2's migration runs on that deploy; the authoring
still reaches no world until the bottom two tiers are regenerated and the packs re-warmed, **which
the owner is doing manually** rather than it being tranche B1 work.

📌 **`dev` is an isolated environment on both repos and the owner is its only tester**
(2026-11-18), so a dev deploy is a test step with no blast radius, not a release — the care belongs
to `master`, which reaches the store build and the production APK. **To fold into both repos'
`.context` on the next pass:** app `01_overview/output/environment.md`'s deployment section and
backend `01_overview/output/deployment.md`. It is in session memory meanwhile, but memory is not
the repos' record.

## THE QUEUE (2026-11-19) — one agent at a time, in this order

Sequential, not parallel: both working trees are shared, so two writing sessions collide. Finish,
close, open the next.

⚠️ **Not everything here is an implementation, and scoping them all as builds would be a mistake** —
an agent sent to "fix" the investor line would change something before anyone knows what is wrong.
Each item below says which it is. **A brief is written when its agent starts, not now**: today
proved briefs go stale within hours (the `sponsorPot` ruling in the pack brief was wrong by the
time the agent reached it, and the device pass changed what the gate's verdict even means).

| # | work | type | gate |
|---|---|---|---|
| 1 | ~~**A3 + A4 + A3b + A5**~~ | implement | ✅ **DONE 2026-11-19, `603ea577`, accepted** — two follow-ups: the migration docblock's false deployed-box claim, and `tvDeal` (below) |
| 2 | **The £92.3M investor line** | **investigate** | none — read-only, start any time |
| 3 | **`seasonTicketHolderPercent` 70 vs 613 sold on a 2,500 ground** | **investigate** | none |
| 4 | ~~**A2 — the wage ladder samples abilities that cannot exist**~~ | implement | ✅ **DONE 2026-11-19, `98a5f3ea`, accepted** — shipped the authored-band interim; mature-ability sampling stays open under #6 |
| 5 | **The white screen on back from an NPC club** | **investigate** | parked by owner; repro recorded |
| 6 | **Wage scale calibrated on potential, paid on ability (~3× gap)** | **owner decision**, then implement | needs the rest of the device pass |
| 7 | **Division size — 16 or 20** | **owner decision** | owner testing at 16 |
| 8 | **Country ability factor — two dials, not one** | **owner decision**, then implement | after #7; decision note recorded above |
| 9 | **A3b — `bankruptcyDeductionTiers` has no tier dimension** | implement (backend authoring) | worth doing only if insolvency is reachable — #6 decides that |
| 10 | **`seededRng` first-draw bias in identity/appearance** | implement, **after a decision** | fixing it re-rolls the face of every person in every existing save |
| 11 | **`WorldOverviewServiceTest` — pre-existing failure, not in the baseline** | implement (small) | none |
| 12 | **Push, deploy, bump, re-warm, re-check** | **operational** | after #1 and after the device pass |
| 13 | §5 deferred mechanics (shirt accrual, `club_shop`, responsive fan base, …) | implement | after the economy is calibrated |
| 15 | ~~**B1 `tvDeal` / B2 docblock / B3 slots correction**~~ | implement | ✅ **DONE 2026-11-19, `e2c855c6` + `52c8b3bf`** — done in the PM session; `sizeOf()`'s `+1` left open |
| **14** | **🔴 A6 — three sources disagree on home games per season; `SeasonBudgetService` is 53% high at 16 clubs** | **implement** | **after #7 (division size) and #1 (A4 authors the authority). Ranked above #4 and #6: it biases COVERAGE at seven of eight tiers, so it should land before any further dial authoring.** |

**Two of these can run while a backend agent works**, because they are app-side and read-only:
#2 and #3. Everything else waits its turn.

## ⚠️ What is actually startable right now (2026-11-18, evening)

**Both working trees are occupied.** The pack-economy session holds `wunderkind-backend` (16 paths
dirty on `development`) and `wunderkind-app` (6 paths dirty on `new-game-save`), uncommitted. Until
it commits, **no other code work can start in either checkout** — a second session there risks a
stash, checkout or branch switch landing under it. A worktree would dodge that, but for a change
this interleaved it is cleaner to wait.

So the critical path has exactly two lanes tonight:

1. **The pack-economy session commits** (C1 below, in flight). Everything in tranche A unblocks the
   moment it does.
2. **The device pass** — `device-pass-2026-11-18.md`, and specifically **row H**. It needs no
   checkout, only a build, so it runs in parallel with everything. It is also the highest-leverage
   thing left: it decides whether the bottom tier is genuinely broken or only looks broken to a
   model with no upkeep term in its coverage metric, and rows E and G capture the save-state
   figures neither repo can derive.

**Three decisions are parked on the owner and nothing proceeds past them:**

- **Division size — 16 or 20?** The purge took EN from 20 club rows per tier to 16, and because
  `League::$slots` is 0 (= derive), that re-priced every division: matchday fell ~20% and six tiers
  dropped below the coverage floor. Owner is testing at 16 before deciding. Whichever way it goes,
  **A4 should land** so the divisor stops being a side effect.
- **Tier-8 solvency** — gated on row H. If NPCs really are being rescued, it is one more authoring
  pass (upkeep down, or a floor under the stand band rather than a 0–1 coin flip, since dial 3 was
  sized on the mean of a random draw rather than its worst plausible outcome).
- **`development` is 1 commit ahead of `origin/development`.** The R2 work reached the remote
  through `dev`, so nothing is missing, but that branch itself is unpushed.

## Tranche A — unblocked the moment the pack work commits

Both are app-side, both are in `REMAINING-WORK.md` §4, and neither touches a file the harness fix
or R2 touches, so they can run alongside.

### A1. The pyramid tax base is unfiltered — a blocker, not a tidy-up

`applyPyramidTaxAndRedistribution` (`src/engine/SeasonTransitionService.ts`) sums the ledger whole,
so it would tax the owner's opening balance and funding as profit. `NON_RECURRING_INCOME`
(`src/engine/SeasonBudgetService.ts:110`) already names those categories and is already applied to
the budget's realised income — just not to the tax. **This is the standing blocker on ever
re-enabling the pyramid distribution** (`PYRAMID_DISTRIBUTION_ENABLED` is `false`), so it is worth
closing while the mechanic is off and the change is provably inert.

### A2. `WAGE_LADDER_ABILITIES` samples abilities that cannot exist

`src/economy/economyWorkings.ts:23` samples `[10, 20, 40, 60, 80, 95]` at every tier, while tier
8's authored band is 2–7 — so every row of the tier-8 wage table in the Economy Workings panel is
off the end of the band, which is why it reads £3,199.88/wk for an "ability 20" player who cannot
be generated there. Sample the tier's own band instead. ⚠️ **Do not "fix" it by re-authoring
`wageScaleMicroPence`** — the scale is calibrated against the band, and R2 has just re-derived it.
Display-only.

### A3. The world export cannot carry the payout figures — a blocker on every future gate run

`Version20261118120000` NULLed `league.prize_money` and `league.league_position_pot` so they
inherit from the ppm ladder, which is the design. But the admin's World → Export serialises the
**raw column**, so both read £0 in every export taken since, and `leagueFinancials()` reads
`prizeMoney ?? 0` — the gate credits zero prize and zero position money unless someone patches them
back in by hand. Make the export emit **resolved** figures through `LeaguePayoutResolver`. Small,
and it is the difference between a gate run being reproducible and being an exercise in remembering
what to patch. The longer-term version is what the gate's own docblock already asks for: publish
them on `GET /api/initialize/leagues`.

### A3b. `bankruptcyDeductionTiers` has no tier dimension — place it, it was unowned

Raised by the R2 session as unplaced, and it was right: this lived in the review log and in
`docs/economy-threshold-review.md` §1 but appeared in no tranche, which is how a known defect
quietly becomes nobody's.

The harshest band begins at a flat **£40,000.01** of deficit against a tier-1 weekly wage bill of
**£3,238,043** (`turnover × 0.45 ÷ 46`), so the ladder is traversed in **0.01 weeks** — and the
bill depends on nothing but the turnover row, so it reads identically on dev and read **worse**
before R2 (£3,801,742/wk). Rows 4 and 5 of the column are separately unreachable behind row 3's
null `deficitMax`, pre-existing and visible in the R2 session's BEFORE run.

**Same defect class as the flat youth scholarship and the flat staff role bands**, both already
fixed by giving them a tier dimension — this is the third instance and the only one still open.
It is client-side and gated by its own flag, so it is safe to leave until the device pass says
whether insolvency is reachable at all; the weeks-of-wages proposal is in
`economy-threshold-review.md` §1. Attribution detail: `r2-finish-report.md` §3 C and D.

### A4. Author `League::$slots`, so the divisor stops being a side effect

`slots` ships as 0, which `LeagueSizeResolver::sizeOf()` reads as "derive" — it then returns the
live NPC club count. So the division size, every club's matchday, the gate's `homeGames` and the
per-club divisor in the backend's own check 8 all follow however many club rows happen to exist,
and a spoof purge re-priced every division in the world tonight with no economy change authored
anywhere. Authoring it per league makes the divisor a decision. **Do this whatever the club count
settles at.**

#### ⚠️ Two corrections to the above, from the backend agent's phase-1 read (2026-11-19)

**1. "`slots` ships as 0" is true of the deployed box, not of this checkout.** The agent's `psql`
read found `slots` **authored and non-zero on all 120 league rows** locally — England 18, most
others 8 or 16. So the premise holds only where the figure was never authored. A read-only query
against the deployed box is authorised to establish which state it is in; that answer decides
whether A4 is a migration or a no-op there.

**2. Authoring `slots` does NOT fix the app gate's `homeGames`, and my brief wrongly said it did.**
Two different divisors were conflated. `LeagueSizeResolver::sizeOf()` feeds check 8 and
`/api/initialize/leagues`. The app's economy gate never reads it — `worldExport.ts`'s
`groundsByTier()` sets `clubCount: cs.length` by **counting club rows in the export**, and that is
what became `homeGames` and moved COVERAGE ~20% after the purge. Teaching the harness to use the
authored size instead of counting rows is a **separate app-side task**, not part of A4, and is not
yet briefed or queued.

#### 🔴 OPEN DEFECT, unconfirmed on the deployed box — `SC` has `slots = 3` on every tier

Surfaced incidentally by the same read. England is 18; most countries are 8 or 16. **Three is not a
plausible division size**, and it looks like a leftover from Scotland's four-tier era, before the
rebuild. If it is real, the backend currently believes Scottish divisions hold three clubs, which
feeds **check 8's per-club divisor** and the **published `clubCount`** — and Scotland is exactly
what the owner has been device-testing, so it would have been distorting Scottish per-club payouts
throughout that session.

**Status:** reported, deliberately **not fixed** — it is authored data and the division-size
question is an open owner decision (Tranche D). Do not let an agent "correct" it in passing.

### 🔴 A6 — CONFIRMED 2026-11-19 against the live export — three sources disagree on "home games per season"

Found while verifying my own A4 correction. **Not briefed, not queued, not given to either running
agent** — both are fenced off from the gate and from `SeasonBudgetService`.

**Ground truth, established from the fixture generator.** `src/utils/fixtureGenerator.ts`'s
`generateRoundRobin` is a **double** round-robin — `secondLeg` mirrors every first-leg fixture at
`round + numRounds` — so each club plays **(division size − 1)** home games. Division size is
`clubIds.length + 1` for the player's own league (`fixtureStore.ts:102`/`:135` prepend the amp club,
and only for the amp league) and `clubIds.length` for every other league. This is the same `+1 at the
bottom tier` that `LeagueSizeResolver::sizeOf()` already models backend-side.

**The three answers:**

| source | figure | at a 16-club division |
|---|---|---|
| `scripts/economy/variantGate.ts:274` | `clubCount` — export club rows | 16 |
| `src/engine/SeasonBudgetService.ts:527` | `round(weeksPerSeason / 2)` | 23 |
| `src/engine/GameLoop.ts:1520` | hardcoded `23` | 23 |
| **truth** | **division size − 1** | **15** |

**1. The gate is off by one at seven of eight tiers.** `clubCount` is exactly right for the player's
starting division, because the amp club joins it — and **one game too many everywhere else**, since
no amp club joins those. That is ~5–6% of matchday income, at every tier but one, biased the same
way. Matchday is a major income line, so **COVERAGE is overstated by a few percent at those tiers**,
and the R2 turnover ladder was derived against it. Not enough to invalidate R2 on its own, but it is
a systematic one-directional bias, and it should be corrected before any further dial authoring.
⚠️ Assumes export club rows per tier equal that league's NPC `clubIds` list — verify before acting.

**2. `SeasonBudgetService` is the one with real money in it, and it is worse.** `round(weeks / 2)` is
23 at the authored 46 weeks — correct only for a **24-club** division. At a 16-club division it is
**53% too high** (23 vs 15), and it feeds `npcWeeklyIncomePence` → `deriveClubBudget`, which sets
NPC squad wage spend. Its own comment claims it is "derived from the season rather than the tick's
hardcoded 23 so a tier whose season is not 46 weeks still gets a coherent split" — but a season
length cannot tell you a division size, so deriving it from weeks was never going to be right.

**3. `GameLoop.ts:1520`'s 23 is the least urgent of the three**, and deliberately so: its comment
scopes it to spreading seasonal money for the solvency *verdict* — *"no money moves through them"*.
Worth aligning for consistency, but it is not mispricing anything.

**Why this is the same defect class as everything else this month:** one quantity, three sources,
none of them the authority. The authority should be the division size — which is exactly what A4 is
about authoring. **A6 is the reason A4 matters**, far more than the export-row story in my original
brief.

---

#### CONFIRMATION (owner asked for it before queueing; run 2026-11-19 on the 22:00 export)

Source: `wunderkind-world-2026-11-18 (1).json`, `exportedAt 2026-11-18T22:00:23+00:00` —
200 leagues, 3,191 clubs, 25 countries.

**1. The reserved amp slot is real and universal — 25 of 25 countries, zero exceptions.** Tier 8
holds **exactly one fewer club row** than tier 7 in every single country (EN 16→15, FR 20→19,
KR 10→9, SC 14→13, …). The world generator leaves one place open at the player's starting tier.
That is what makes the gate's figure right at tier 8 and wrong above it, and it is why the error
hides: `clubCount` is correct precisely where you would naturally check it.

So, confirmed: **the gate overstates home games by exactly 1 at tiers 1–7 and is exactly right at
tier 8.** The caveat in my first write-up (whether export rows equal the league's club list) is
answered — the export matches clubs to leagues by `(country, tier)`, which is the same key
`groundsByTier()` uses, so the gate's `clubCount` IS the row count, with no indirection.

**2. Magnitude, measured against the R2 gate run (`dials/runs/cand-c-authorable`), EN, 16 rows.**
Relative overstatement of COVERAGE is `matchdayShare / rows`:

| tier | matchday share | COVERAGE as the gate reports it | A6-corrected | Δ |
|---|---|---|---|---|
| 1 | 12.4% | 97.6% | 96.8% | −0.8 |
| 2 | 27.9% | 97.5% | 95.8% | −1.7 |
| 3 | 32.1% | 97.5% | 95.5% | −2.0 |
| 4 | 42.3% | 97.6% | 95.0% | −2.6 |
| 5 | 52.5% | 97.5% | 94.3% | −3.2 |
| 6 | 68.1% | 97.6% | 93.4% | −4.2 |
| 7 | 51.1% | 97.5% | 94.4% | −3.1 |
| 8 | 72.8% | 97.6% | **97.6%** | **0** |

**3. The verdict is narrower and sharper than I first claimed. R2 survives A6 intact** — every
corrected tier stays well inside the 85–110% band, so nothing authored needs to change on A6's
account and no tier crosses a boundary.

**What A6 actually destroys is the FLATNESS.** R2 was derived as a chain-maximal ladder specifically
to give **uniform** coverage, and it delivers 97.5–97.6% across all eight tiers — a 0.1-point
spread. Corrected for A6 that becomes **93.4–97.6%, a 4.2-point spread that slopes with matchday
share**, because matchday is 12% of tier-1 income and 73% of tier-8's. The ladder is still good; it
is no longer *flat*, and flatness was the property it was built for.

**So the ranking stands, for a better reason than I gave it.** Not "coverage goes out of band" — it
does not. Rather: **any future turnover re-derivation should happen after A6, or it will be tuned
against a matchday line that is 6.25% too generous at seven of eight tiers**, and will re-introduce
exactly the tilt R2 removed. That is the argument for landing A6 before dial authoring, and it is
the whole of it.

#### The same export also corrects TWO MORE of my own claims about A4

**4. `slots = 0` is far rarer than my brief assumed — 4 leagues of 200**, all of them
**`SC` tiers 5, 6, 7 and 8**. Everywhere else `slots` is authored non-zero, matching what the
backend agent found. So A4 is a four-row fix on this export, not a world-wide migration — but those
four rows are **Scottish tiers 5–8, which is exactly where the owner has been testing.**

**5. 🔴 A4's "landing that changes nothing today" is FALSE for EN and SC, and my brief said it was
safe.** Authored `slots` already disagrees with the real row count:

| | authored `slots` | real club rows | divisor error |
|---|---|---|---|
| EN tiers 1–7 | 18 | 16 | **+2** |
| EN tier 8 | 18 | 15 (+amp = 16) | **+2** |
| SC tiers 1–4 | 18 | 14 | **+4** |
| SC tiers 5–8 | 0 (derive) | 13–14 | — |

That is the spoof purge: it took rows down and left `slots` where it was. So `sizeOf()` returns
**18** for divisions that actually play **16** (EN) or **14** (SC) — check 8's per-club divisor and
the published `clubCount` are both wrong *right now*, in the opposite direction from a derive bug.
**Authoring slots to the current derived size is therefore NOT a no-op for EN or SC — it is a
behaviour change, and a correction.** The brief's claim that the diff proves safety holds only for
the 161 leagues where the two already agree. ⚠️ **The backend agent is implementing A4 on my false
premise — this needs to reach it.**

**6. The agent's `SC slots = 3` is NOT reproduced here**, and this export contradicts it: SC reads
**18** at tiers 1–4 and **0** at tiers 5–8. The agent read 120 league rows; this export has 200. So
the two are **different database states** — most likely its local checkout's DB against the deployed
box. Its read-only query on the deployed box is what settles which is live; until then,
`SC = 3` is unconfirmed and **this export is evidence against it.**

## Tranche B — waits on R2 being committed and deployed

### B1. ✅ DONE 2026-11-18 — and the gate FAILS, for located input reasons

R2 deployed (Deploy Development 276), the bottom two tiers regenerated and the packs rebuilt, and
the gate run against the 22:00 export with only the payout line patched (A3 is why). Band 3 is
live: EN tiers 7–8 hold eight facilities at ~2 and ~1.3 stand levels. **`VARIANT GATE: FAIL` —
tier 8 insolvent in season 1 with a rescue, and seven of eight tiers outside the coverage band.**
Both causes are inputs rather than the authoring: the 16-club divisions (−20% matchday everywhere)
and a light tier-8 stand draw (1.27 levels against the band midpoint's 2.0). Full numbers and the
two findings that generalise — coverage-in-band is not solvency, and dial 3 was sized on the mean
of a random draw rather than its worst plausible outcome — are in `r2-closeout-report.md`.

**The owner is leaving the teams at 16 and testing on device**, so the next move is the re-pinned
device sheet (`device-pass-2026-11-18.md`), not another authoring pass. Tier-8 solvency and any
re-solve of dial 1 at 16 clubs wait on row H of that sheet.

### B1-prior. The procedure, kept because it is the one to repeat

**What the gate run entails, concretely.** The gate takes three files, all of them **gitignored and
local-only** in the app repo root — refreshing them is not a commit, it is overwriting three
files — and they must all be taken **after** the regeneration and re-warm, from the same moment,
because a world export older than the config is exactly what hid the landed prize ladder from
every run before this.

```bash
curl -s 'https://api.dev.buildmyclub.co.uk/api/game-config?country=EN' -o game-config-en.LIVE.json
```

```bash
curl -s 'https://api.dev.buildmyclub.co.uk/api/starter-config' -o starter-config.LIVE.json
```

Both endpoints are `PUBLIC_ACCESS` in `security.yaml`, so no token is involved. The third,
`world.json`, is **not** a public endpoint: it is the admin's World → Export action
(`admin_world_export`, a streamed download through `LeagueImportExportService`), so it comes from a
signed-in admin session rather than curl, saved into the app repo root under that name.

```bash
npx tsx scripts/economy/variantGate.ts --export game-config-en.LIVE.json --starter-config starter-config.LIVE.json --world world.json --country EN
```

Three things to read in the output before anything else:

- **`Prize and position money are rescaled by 1.000x`** — on a fresh export this should be exactly
  1.000, and it is the line that says the world export and the live config agree about TV. Anything
  else means the two files came from different moments.
- **The COVERAGE table against the pinned expectation** in `r2-economy-authoring-brief.md` §5, and
  the wage-share row, which on an app checkout at `94236541` or later is dead-flat 60.0%.
- **The ground it measured.** Tier 7–8 stand levels should now be ~2.0 per club rather than ~4.9;
  if they are still ~4.9, the regeneration has not reached those clubs and every bottom-tier figure
  in the run is the old world.

No patching is involved and `dials/run.sh` is not used — the whole point of this run is that the
authoring IS the input. If the export's shape is wrong the gate refuses rather than guessing
(`WorldExportRefused`), which is the failure to expect if the admin export format has drifted.

**The backend half, now unblocked:** `app:economy:wage-table` could not give a verdict on the local
Lando box, whose turnover table is unauthored. Against dev's own data it can, so run it there too —
it is the check that owns strictly-decreasing `S_tier` and the amended payout bounds, and R2 has
never been measured against real data by either gate.

Regenerate the bottom two tiers (band 3 reaches no existing NPC club until then),
`app:worldpack:maintain`, then take a fresh `GET /api/game-config?country=EN`,
`GET /api/starter-config` and a world export and run the app's variant gate against them with no
patching. **This is the step that actually closes R2** — everything verified so far was measured by
patching the Nov-15 exports. The pinned expectation is in `r2-economy-authoring-brief.md` §5.

### B2. Re-pin the device sheet, again

R2 moves four of the sheet's rows and leaves three alone. Named by what they assert, since the
sheet is in neither repo:

| row | after R2 |
|---|---|
| A — tier-8 ticket £14 | **unchanged** (the ticket ladder is untouched) |
| D — shirt price £7.88 | **unchanged** (it follows the ticket price) |
| E — season-1 shirt sales | **unchanged** gross, but the ledger around it moves |
| B — parachutes | **re-pin**: 60% of the division relegated INTO, so tier 8 → ~£129,000 (was £98,911), tier 3 → ~£18.06m (was £21,345,961) |
| F — the Budget card | **re-pin**: the whole income/wage/surplus chain moves |
| G — squad wages | **re-pin**: bottom-tier authored wages rise about 30% at tier 8 |
| C — NPC rescues | still expect zero, and still do not read zero as healthy |

### B3. Re-measure §4 Q3 rather than investigate it

A tier-8 NPC's income being ~2.4× expected was traced to matchday and stand levels, which is
exactly what R2's band-3 change halves. Re-measure before spending anything on it; it may simply
be gone.

## Tranche C — waits on the device pass, which is the owner's

The device pass (`REMAINING-WORK.md` §1) is the gate for the largest remaining piece of work, and
rows E and G are the only way to capture save-state inputs that cannot be derived from either repo
(`fanCount`, `morale`, the prices actually charged, per-player ability and wage).

### C1. ⏳ IN FLIGHT 2026-11-18 — the economy leaves the pack entirely

Started ahead of the device pass on the owner's direction, and scoped wider than this entry
originally had it: not just contract values but **all money** out of the pack, resolved at init on
the device. Brief: `pack-economy-removal-brief.md`. Plan: `~/.claude/plans/…noble-petal.md`.
Backend 16 paths, app 6, nothing committed yet. Two rulings were made mid-flight — `sponsorPot`
stays server-side and arrives resolved on `/api/initialize/leagues` (my first ruling was wrong and
the implementing session caught it), and the principle sharpened from "money is resolved, never
cached" to **derived-vs-drawn, resolved by whoever owns the thing**.

**Closes `C2` as a side effect**: with the pack no longer carrying `startingBalance`, the
`startingBalance`-vs-`balance` question stops having two sources to choose between.

The original framing, kept because it is why this matters:

### C1-prior. Move contract values out of the worldpack — the big one — ✅ **DONE 2026-11-18**

**Shipped in both repos, one cut** (backend `WORLD_PACK_VERSION` 10 → 11). ALL money left the
pack, not just contract values; the app prices every ingested squad at init from published
config. Report: `pack-economy-removal-report.md`.

⚠️ **The pointer below was stale and is corrected here.** It said the constraints were in
*"`REMAINING-WORK.md`'s PARKED section"*, which does not exist and never did — `REMAINING-WORK.md`
has no PARKED section. The record was, and is, in the app's
`.context/stages/07_synthesis/output/current-focus.md` (its PARKED 2026-11-14 block, now marked
SHIPPED).

**And one of the two constraints it repeats was VOID.** "It must use
`weeklyWageRange().expectedPence` plus a seeded jitter rather than `drawWeeklyWagePence`, or two
devices building the same pack produce different squads" — that scenario cannot occur: `8ff2e5fd`
made a `WorldPackSet` single-use, claimed by exactly one club and never served twice (owner
confirmed). The shipped code uses `drawWeeklyWagePence` with its injected `rng` seeded from the
pack id plus the player id. The constraint is struck in `current-focus.md`.

The other constraint was real and was met: the country-resolved config fetch is a hard
prerequisite, and `ensureConfigOrFail()` already gates the flow before the starter pack is
fetched.

**The original entry, for the reasoning:** `useInitFlow.ts:241` ingests
`wage: wp.contractValue ?? 0`, the backend's figure verbatim, so whichever wage model priced a
pack is what a save runs on in season 1 while `wages.ts` prices everything only from the first
renewal onward. **Two sources for one quantity**, which is the shape of nearly every economy
defect found this month — and it is why an economy change today forces a pack regeneration, which
is the thing the pack cache exists to avoid. Owner-parked on "post testing".

### C2. §4 Q1 — `startingBalance` vs `balance` on the world pack

One look at a live `/api/initialize` payload settles it, and it blocks any decision about NPC
starting balances. Cheap, but it needs a real payload.

## Decision note — country factors and ability bands (owner, 2026-11-19)

Worked out during the device pass, recorded so it does not have to be derived a third time.

**How it behaves today.** The wage bill is **budget-anchored, not ability-anchored**:
`wageScaleMicroPence` is solved as `playerBudget ÷ (weeks × Σ ability^k)` and
`referenceSquadAbilitySum` already reads `abilityBand(country, tier)`. So a squad's total cost is
its share of *its own country's* turnover, and ability only decides how that pot is distributed
inside the squad. A tier-8 Scottish player earns half what an English one of the same ability
earns, because Scotland is a 50% economy — and that is the intended behaviour.

**The proposal: scale the ability bands by the same country percentage**, so generated players'
ability matches the money. ✅ **The arithmetic works and leaves wages unchanged.** Halve the bands
and σ falls by `0.5^2.5 = 0.177`, the solved scale rises 5.66× against a halved budget (net 2.83×
England's), and a Scottish ability-2.5 player earns `2.83 × 9.88` against an English ability-5
player's `55.9` — exactly half, as before. **You cannot break the wage total by changing bands.**

**Therefore the ability factor need not equal the economy factor**, and probably should not. A 50%
economy does not mean 50% players — 0.5 would put a Scottish top flight at roughly English tier 4.
Two dials for two questions: `economy_factor_bp` sets the money, a separate country ability factor
sets the quality, and the wage scale reconciles them automatically.

⚠️ **What the band change is NOT neutral about: the ability number is absolute.** Wages are
league-relative; ability is 0–100 across the whole game. After the change a Scottish tier-8 player
*is* a 2.5, and is capped lower for his whole career. It is a statement about how good a nation's
football is, not about what it pays.

**Narrowed by the owner, 2026-11-19: a save is single-country.** Players are siloed into one
country's pyramid, and interaction with clubs outside it is via **tournaments**, not league play —
so the cross-border blast radius is much smaller than it first appears, and this warning is about
*competitive* comparison rather than everyday economics. Two places still need checking before the
change, because both reach outside the silo: **cross-border Cup matches**, which resolve on true
ability, and the **foreign-transfer pool** (`player_foreign_transfer` — 207 rows on the owner's
2026-11-19 save), which prices an incoming foreign player on the *browsing* club's country and
tier. A scaled-down nation's players arriving in a 100% economy is the case to think through.

⚠️ **Orthogonal to the potential-vs-ability finding.** Scaling bands does not touch the fact that
the band describes POTENTIAL while players are paid on an ability derived below it; the ~3× gap
survives the change unchanged. Two different problems in one table.

**The current state is the one combination nobody chose:** Scotland's rebuild gave it England's
exact bands against a 50% economy — identical players on half the money. Manual for now; revisit
with R1 below.

## ✅ EN `slots` — SETTLED 2026-11-19 (owner asked; PM traced every consumer first)

### DECISION: author EN `slots = 16`, SC tiers 1–4 `= 14`. Track the real count, always.

**The question was never "16 or 18".** 18 is nobody's decision — it is residue from the spoof
purge. `slots` is the authored division size; the row count is what generation produced. The two
disagreeing is the defect, whatever the number. So the rule is: **`slots` equals the real size.**
That settles this without touching 16-vs-20, which is a separate question about *what to generate*
— choose 20 later and you regenerate to 20 rows and author 20, and this rule still holds.

### ⚠️ FIRST, A CORRECTION TO MY OWN EARLIER CLAIM, WHICH WAS WRONG

I told the owner this had been *"distorting Scottish per-club payouts throughout your entire test
session."* **That is false, and the cause is that I asserted it before tracing the consumers.**

`LeaguePayoutResolver::prizeFor()` / `positionPotFor()` **never divide by league size** — both
resolve from an authored tier-1 pence figure and a ratio ppm by tier and country, and `sizeOf`
appears nowhere in that class. **No payout, anywhere, depends on `slots`.**

### What `sizeOf()` ACTUALLY feeds — all ten call sites traced

| consumer | real money? | affected by EN's +2? |
|---|---|---|
| `LeagueSizeResolver::derivedTvDealPence` — `tvDeal = intdiv(tvPool, size)` | **YES** | **no** — needs `tvPoolPence`, and **EN has none; `tvDeal` is authored directly at all 8 tiers** |
| `EconomyWageTableCommand:947` — check 8's `taperSumPpm`, `intdiv($positionTotal, $clubs)`, `intdiv($prize, $clubs)` | no | **yes** — the release gate computes per-club payouts against a division size that does not exist |
| `EconomyWageTableCommand:461` — check 3/6's TV table | no | yes (reported size only) |
| `SyncService:845`, `InitializeController:251`, `LeagueService:318` — published `clubCount` | no | **yes** |
| app `seasonFinances.ts:82–91` — cross-checks `tvPool / clubCount` against `tvDeal` | no | **yes** — a false divisor corrupts the integrity check itself |
| 3 admin screens | no | yes (display) |

**So for EN the error moves no money at all.** It corrupts the **release gate's own check**, the
**published `clubCount`**, and the **app's integrity cross-check** — i.e. three things whose whole
job is to tell us when something is wrong. That is a weaker claim than I made and a sufficient
reason to fix it: **our instruments are miscalibrated, not our economy.**

**Where `slots` DOES move money: SC tiers 5–8 only**, the four leagues carrying `tvPoolPence`
(3.0bn / 1.0bn / 500m / 120m) with `tvDeal` derived from it. Those are the `slots = 0` rows, so
their TV followed the live club count — the purge really did move it. **A4's migration fixes
exactly these four**, which makes it better targeted than my "insufficient" review said.

### Consequence for implementation

Authoring EN 16 / SC 14 is a **behaviour change** (check 8's output and published `clubCount` both
move) and therefore **not** something A4's no-op migration should absorb. It is a second, separate
migration with the owner's decision recorded against it. **The `slots = 0` work stands as built.**

## 🔴 ALSO FOUND WHILE TRACING THIS — `tvDeal` HAS A3's DEFECT AND A3 DOES NOT COVER IT

From the same export, SC tiers 5–8: **`tvPoolPence` is set and `tvDeal` is `None`.** `syncTvDeal()`
writes the derived per-club share onto the column, but the admin export serialises the **raw**
column — the identical mechanism A3 is fixing for `prizeMoney` and `leaguePositionPot` (both also
`None` on all 16 EN/SC rows in that export, which is A3's defect confirmed in the wild).

**So the app receives NO TV figure for Scottish tiers 5–8, and the gate credits them £0 of TV.**
A3's brief names two fields. **This is a third, with the same cause and the same fix**, and it is
live on the tiers the owner is testing. ⚠️ **Must reach the backend agent while A3 is open** —
it is a one-line addition to the work in flight, and a separate task if it lands after.

## 🔴 A4 AS BUILT DOES NOT FIX THE DEPLOYED DEFECT (PM review, 2026-11-19)

**The migration is safe. It is also insufficient, and the two facts are the same fact.**

`Version20261119090000` writes **only where `slots = 0`** — the right call, and the agent reached
it independently by finding SC tier 8 authored at 3 while deriving 4 on its clone, then refusing to
overwrite somebody's decision. That conservatism is what makes the migration a genuine no-op.

**But `slots = 0` is not the deployed defect.** From the 22:00 export of the deployed box:

| | authored `slots` | real club rows | divisor error | does the migration touch it? |
|---|---|---|---|---|
| EN tiers 1–8 | 18 | 16 (15 at t8) | **+2** | **no — skipped, `slots ≠ 0`** |
| SC tiers 1–4 | 18 | 14 | **+4** | **no — skipped** |
| SC tiers 5–8 | 0 | 13–14 | derive | yes |

So on the deployed box the migration authors **four SC rows** and leaves the **+2 on every England
tier and +4 on SC tiers 1–4 exactly as they are.** `sizeOf()` goes on returning 18 for divisions
that play 16 and 14. The purge damage is untouched.

**The migration's docblock asserts the opposite and is wrong on a point of fact:** *"on the deployed
box — where `slots` is 0 — it authors the counts that box is already using."* The deployed box has
EN `slots = 18`, not 0. The agent never received the PM correction (`a4-premise-correction.md`) and
never ran the authorised read-only query — its report says *"I have not touched the deployed box"*
— so it reasoned from the brief's premise, which was mine and was wrong. **No code is wrong
because of it; a durable record is.** Fix the docblock before this lands.

**Why the remainder is NOT an agent task.** Correcting EN from 18 to 16 *is* an economic change —
it moves check 8's per-club divisor and the published `clubCount` — and 16-vs-20 is the owner's
open decision. An agent authoring 16 would be pre-empting it; an agent authoring 18 would be
blessing stale purge damage. **It belongs in Tranche D, below, and nowhere else.**

## ✅ DEPLOY CONFIRMED FROM A FRESH EXPORT — 2026-11-19

`~/Downloads/wunderkind-world-2026-11-19.json`, 200 leagues, taken after run `44516901111`. This
is the confirmation the deploy log could not give (it prints no UPDATE counts).

**The correction migration matched rows. EN is 16.**

```
EN  slots = 16  at all eight tiers   (was 18)
SC  slots = 14  at all eight tiers   (was 18)
leagues with slots = 0:  0 of 200
leagues with prizeMoney > 0: 200 of 200
```

**Three things this settles:**

1. **A6's blocking gate is cleared.** Relayed to the running agent, with the instruction to measure
   against the real export rather than a patched copy.
2. **A3's export fix works.** `prizeMoney` and `leaguePositionPot` are non-zero in all 200 leagues.
   They read £0 in every export taken between `Version20261118120000` and A3, which is what forced a
   hand-patch on every gate run; that is over.
3. **🟩 Scotland's `slots = 3` is CLOSED — it was never real.** All eight Scottish tiers read 14.
   The 3 was a stale development-clone artefact, as the A4 note suspected but could not prove. **The
   Tranche D item asking the owner to decide Scotland's size is withdrawn; there is nothing to
   decide.** It also retires the latent `sizeOf()` `+1` concern: with no league at `slots = 0`
   anywhere, the deriving branch is unreachable on this box.

**Authored division sizes, EN and SC** — uniform across all eight tiers in both, which confirms
these were authored deliberately rather than produced by the derivation (the derive rule would have
left the bottom tier one short):

| | slots | true home games (`size − 1`) |
|---|---|---|
| EN | 16 | 15 |
| SC | 14 | 13 |

⚠️ **Scope, owner 2026-11-19: "don't worry about any leagues and countries other than England and
Scotland."** The export carries 25 countries at sizes from 10 to 20; they are recorded nowhere here
on purpose. **Do not gate, measure or report on them.**

**This sharpens the wired-`23` inventory below.** A hardcoded 23 home games is **53% high for
England (23 vs 15)** and **77% high for Scotland (23 vs 13)** — and Scotland is the country being
tested on, so every wired site reads worse there than the England figures in the inventory suggest.

## 🟨 FOUND IN THAT EXPORT — division size moves TV income (EN/SC scope)

⚠️ **Scoped down 2026-11-19 on the owner's instruction: "don't worry about any leagues and countries
other than England and Scotland."** An earlier draft of this section led with a 2x spread across all
25 countries (KR at 10 slots to FR at 20). **That framing is withdrawn** — those countries are not in
scope and the gate should not be run for them. What follows is the England/Scotland case only, which
is the real one and is much smaller.

**The mechanism still holds.** The TV pool is authored identically for both countries at every tier,
and `tvDeal` is now correctly derived as `pool / slots` (B1). So the authored division size sets
per-club TV income:

| | slots | tier-1 pool | tier-1 `tvDeal` |
|---|---|---|---|
| EN | 16 | £300,000,000 | £18,750,000 |
| SC | 14 | £300,000,000 | £21,428,571 (**+14.3%**) |

**A Scottish club earns 14.3% more TV than an English club at the same tier, from no authored
difference.** That is the whole effect in scope — a real tilt, not a 2x one, and it applies at all
eight tiers because both pools are flat across countries.

**Why it still matters even at 14.3%.** Scotland is the country the owner tests on, so every device
reading taken on a Scottish save carries this tilt. And the direction is the awkward one: the
*shallower* league is the *richer* one per club.

**Owner decision, folded into the 16-vs-20 item:** is a smaller division meant to be richer per club?
It is defensible — a nationally negotiated pool split fewer ways is how real TV money behaves. But
EN and SC having byte-identical pools is placeholder authoring, and if the two countries are ever
meant to differ economically, that belongs on the **pool**, leaving size free as a gameplay choice.
**Until then, anyone editing `slots` for either country is editing its TV income too.**

## 🔴 DEVICE FINDING 2026-11-19 — SC t7 shows 12 CLUBS while its TV is divided 14 ways

**Observed by the owner on device**, Scotland tier 7: the league header reads **"12 CLUBS"** and the
season-finances panel reads **TV DEAL £357,143**.

Both figures check out against the 2026-11-19 export, which is what makes this a real finding rather
than a display bug:

```
SC t7  tvPoolPence = 500000000   slots = 14
       intdiv(500000000, 14) = 35714285  ->  £357,142.85  ->  displayed £357,143  ✓
       prizeMoney  = 1000000000         ->  LEAGUE WINNER £10,000,000           ✓
```

**So the pool is provably divided by 14 while twelve clubs exist to receive it.**

**The money that disappears.** At twelve clubs the share would be £416,667. Each club gets £357,143 —
**14.3% short** — and **£714,286 of the £5,000,000 pool is paid to nobody at all.** A pool divided by
more clubs than exist does not redistribute; it evaporates. That is a stronger argument for A7's
check than anything in A7's brief.

### 🟨 There are THREE counts, not two — and A7 as briefed compares the wrong pair

1. **Authored** — `league.slots`. SC t7 = 14.
2. **Server rows** — `npc_club` rows. What A7's check compares against.
3. **What the device plays** — the world pack's club payload plus the player's own club. **12.**

**Counts 1 and 2 probably AGREE here**, which is the uncomfortable part. Evidence: comparing resolved
`tvDeal` against the raw `tv_deal` column across all sixteen EN and SC leagues —

| | raw column implies | state |
|---|---|---|
| EN t1–t8 | 18 clubs | **STALE** (corrected 18 → 16) |
| SC t1–t4 | 18 clubs | **STALE** (corrected 18 → 14) |
| SC t5–t8 | 14 clubs | **already correct** |

SC t7 is in that last group, and `Version20261119120000` only updates where `slots <> target` — so it
left SC t7 alone, which implies **the server had 14 rows there at migration time.** The disagreement
is therefore most likely **pack-vs-rows**, not slots-vs-rows.

**Consequence: A7's check as briefed would report SC t7 CLEAN while the defect is live.** A check
that passes over a live defect is worse than no check, because it licenses the belief that the sizes
agree. A7 has been told to consider comparing against the pack's `clubCount` too
(`CountryWorldPackCacheRepository` already exposes it per payload), or — if that is the wrong service
boundary — to ship the narrow check and say prominently that it does not cover the pack.

⚠️ **The migration-time row count above is INFERRED from the TV cache, not measured.** A7 has been
told to measure the real `npc_club` counts for EN and SC per tier and that its measurement beats this
inference.

### 🔴 It also undermines A6's premise, and A6 has been held

A6 is replacing `homeGames = clubCount` with `homeGames = slots − 1`. For SC t7 that is **13**, where
a 12-club double round-robin gives **11** — and the code being replaced gave **12**. **The fix would
be two games high where the old code was one high.**

The formula `size − 1` is still right. What is now in doubt is whether `slots` is a trustworthy
*input*. Those are different claims and both A6's brief and this plan conflated them. A6 has been
told to stop before committing and produce a `slots` vs row-count table for all eight tiers of EN and
SC — that table is now the fact everything else depends on.

**Open, and the owner's:** whether the authored 14 or the real 12 is correct for SC t7. Neither agent
may decide it; both have been told so explicitly.

## ✅ MEASURED 2026-11-19 — Scotland is short by 2 everywhere; England is clean

The A6 agent measured `slots` against `npc_club` rows from the 2026-11-19 export. **This supersedes
the "three counts" reasoning in the section above: my inference that SC t7 had 14 rows was WRONG.
The rows are 12. The disagreement is slots-vs-rows after all, and the pack is not implicated.**

```
EN  t1-t7   slots 16   rows 16   drift 0
EN  t8      slots 16   rows 15   drift 1   <- NOT drift: the reserved amp place
SC  t1-t7   slots 14   rows 12   drift 2
SC  t8      slots 14   rows 11   drift 3   <- reservation 1 + real drift 2
```

**England is clean at every tier. Scotland is short by a flat 2 in all eight divisions**, independent
of the reservation rule — which the `CORRECT_SQL` detection decomposes correctly in both countries.

### The money, with the direction stated correctly

⚠️ **The A6 report's first draft called this a 16.7% "overpayment". It is an UNDERPAYMENT** — the
correction has been relayed. Verified arithmetic, SC tier 7:

```
pool                £5,000,000
paid per club       £357,142.85   (pool / slots 14)   <- what the device shows
owed per club       £416,666.66   (pool / rows  12)
clubs receive 85.7% of what they are owed  -> 14.3% short
the true share is 16.7% higher than the paid one
TOTAL PAID OUT      £4,285,714.20  across 12 clubs
PAID TO NOBODY      £714,285.80
```

**Across all eight Scottish tiers this is £86,600,000.36 per season** (verified; the per-tier table
is in A6's report §7c). ⚠️ **Stated precisely, because the obvious objection is right:** nobody
actually distributes the pool — each club independently credits itself `pool ÷ slots`. So the exact
claim is that **the sum of what a division's clubs credit themselves falls short of the authored
pool**, which is the design intent for that division's total TV money. The model no longer adds up.

### 🟩 THE ENGLAND CONTROL — the same calculation, same code, £0.00

Run identically for England (A6's addition, independently verified here):

```
EN season shortfall = £0.00      (every tier: recipients == slots, sum credited == pool exactly)
SC season shortfall = £86,600,000.36
```

**This is the cleanest confirmation available that the defect is the authored drift and nothing
else**, and it pre-empts the obvious objection — "is this just how the TV model works?" No: the
model is exact wherever `slots` matches reality. England's pools are all divisible by 16 and every
penny is credited.

⚠️ **Two counting traps, both of which caught a first pass. Recorded so the next one does not
repeat them:**
1. **Recipients at the deepest tier are `rows + 1`, not `rows`.** The player's club sits in that
   division and credits itself the same `tvDeal` —
   `SeasonTransitionService::distributeSeasonOneStartIncome` books it as a `tv_deal` transaction.
   Using rows understates the credited sum by exactly one share.
2. **16.7% is the owed-vs-paid ratio, not an overpayment.** Clubs receive 85.7% of their due —
   14.3% short. The 16.7% is how much *higher* the owed share is than the paid one. A pool divided by more clubs than exist
simply does not get distributed, and that is the sharpest statement of the defect.

### TV is divided by `slots`, confirmed by a clean discriminator

England's tier 8 settles it, because there `slots` and rows genuinely differ (16 vs 15, the
reservation):

```
EN t8  pool £1,200,000  /slots=£75,000  /rows=£80,000  published=£75,000  -> SLOTS
SC t7  pool £5,000,000  /slots=£357,143 /rows=£416,667 published=£357,143 -> SLOTS
```

So the behaviour is uniform and correct-as-designed; England is simply unharmed by it because its
`slots` happens to be right.

### 🟩 The formula question is SETTLED on its own merits — `slots − 1`, not `rows − 1`

Worth recording because it is decided by evidence rather than by the ruling. At **EN t8** the rows
are 15 but the true division is 16 (the player takes the reserved place), so `rows − 1` gives **14**
against a true **15**. **`slots − 1` is the only formula correct in England at all eight tiers,
including the reserved bottom tier; `rows − 1` breaks precisely where the reservation lives.**

**A6 proceeds on `slots − 1` (commit `3300fcd1`, not pushed).** England goes from +1 to **0** at all
eight tiers. Scotland goes to +2, and stays there until the authored 14 is reconciled — accepted
deliberately, for three reasons: the formula is right and only the input is wrong; Scotland's gate
cannot be measured today at all (see below); and on the real-money sites Scotland still improves from
a wired **23** to **13** against a true 11, which is most of the distance.

### 🔴 THE GATE HAS NO CORRECT OPTION IN SCOTLAND, AND THAT IS THE REAL FINDING

In Scotland the money and the fixtures **already disagree, live**, and no choice of gate input
reconciles them:

- `slots − 1` (13) agrees with the money the backend actually pays, and misses the fixtures by 2.
- `rows − 1` (11) agrees with the fixtures, and contradicts the TV line printed in its own run.

**Only authoring 12, or generating 2 more Scottish clubs per tier, resolves it.** That is the owner's
decision — Tranche D's 16-vs-20 item, now with a measured live consequence attached rather than a
hypothetical one.

### 🔴 NEW — Scotland has never been gate-measured, and cannot be today

`loadExport.assertCountryResolved` refuses an EN-resolved config with `--country SC`, and **all three
game-config blocks on this machine are England's.** So **no Scottish COVERAGE figure has ever
existed** — every coverage number in this plan, including R2's calibration, is England's alone.

**Unblocking it needs one authenticated `GET /api/game-config?country=SC`**, captured and kept. That
is a small task with a large consequence: Scotland is the country the owner tests on, and its economy
has never been through the gate.

## 🔴 UNRESOLVED — Scotland lost 2 clubs per tier in a three-hour window

**(B) "the migration failed to match Scotland" is STRUCK.** Two independent migration statements put
Scotland at 14 rows that morning, and the arithmetic is airtight.

**Witness 1 — the correction migration.** `Version20261119120000` writes `target`, and it demonstrably
matched Scotland: tiers 1–4 went 18 → 14. Under its own rule the only way it writes 14 is
`target = 14`. Had it computed 12, it would have written 12.

**Witness 2 — the authoring migration, which is the stronger one.** `Version20261119090000`'s
`AUTHOR_SQL` (verified by reading it) authors where `slots = 0` using:

```sql
COUNT(n.id) + CASE WHEN lg.tier = m.deepest THEN 1 ELSE 0 END AS derived
```

— an **unconditional** `+1` at the deepest tier. SC tiers 5–8 were `slots = 0` and came out at 14, so:

| | rule | implies |
|---|---|---|
| SC t5–t7 (not deepest) | `slots = rows` | **rows were 14** |
| SC t8 (deepest) | `slots = rows + 1` | **rows were 13** |

Two different migrations, two different statements, **the same answer: Scotland held 14 rows at tiers
1–7 and 13 at tier 8 at ~10:28–11:04 on 2026-11-19.** The world export taken at ~14:15 reads **12 and
11** — a uniform drop of exactly **2 per tier, the reserved bottom tier included**, in about three
hours.

### The two live possibilities

- **🔴 (C) The rows actually changed, between 11:04 and 14:15.** A flat −2 across all eight tiers,
  bottom tier included, reads like a deletion pass over `npc_club`, not like a filter.
  ⚠️ **The owner rebuilt the worldpack caches inside exactly that window.** If that is the cause,
  **this is the first live instance of precisely the drift A7 exists to catch** — the cache was
  altered, the authored size did not follow, nothing told anybody, and the money went wrong. That is
  the owner's own stated scenario arriving before the check shipped: a vindication of the ruling
  rather than a defect in it.
- **(A) The export is lossy.** Still open. Both migrations use the same
  `n.league_id = lg.id AND n.country = lg.country` join, so if that join is what drops rows they are
  lossy *identically* — `npc_club` could hold more than 14 while the export shows fewer.

### How to settle it — one read-only command on the deployed box

```
php bin/console app:country:check SC
```

`CheckCountryContentCommand` prints **NPC clubs per tier** and **world pack sets** in one table. If it
reports 14 per tier, the export is lossy — (A). If it reports 12, the rows really were deleted — (C).
Run it for EN as the control.

A7 also supplied two raw SQL alternatives; the second deliberately drops the league join, so if it
returns 14 while the joined query returns 12, the join is located precisely as the lossy thing.

⚠️ **The local clone cannot discriminate any of this.** A7 measured it: Scotland reads **3** there and
England's `slots` is still **18**, so the clone predates both corrections and is a different world.
Its `would_update` is false for all sixteen EN/SC leagues — self-consistent, and therefore silent on
the question.

### What this does NOT change

- **A6's formula.** `slots − 1` remains the only option correct in England at all eight tiers.
- **A7's part one.** England's eight tiers storing an 18-club TV figure is directly verified.
- **The £714,285.80.** Whatever the cause, the tier-7 pool is divided 14 ways among 12 clubs on the
  owner's device and the remainder reaches nobody.

### A7's design decisions arising from this, accepted

- **Severity is pool-gated, not direction-gated.** `rows < slots` **with a pool** is a FAIL, not a
  warning — the brief's suggested "fewer rows is benign, it's mid-bootstrap" asymmetry is wrong, and
  Scotland is the counter-example that proves it.
- **The reservation decomposition is pinned by test** on the measured shapes: EN t8 reports drift
  **0**, not 1; SC t8 reports drift **2**, not 3.
- **The pack comparison is KEPT**, beyond the brief. It was written and tested before the retraction
  arrived, it is cheap, and **if (A) is true it is the only comparison that would have caught this.**

## 🟩 RULING (owner, 2026-11-19) — no finance may be wired to a club count

> *"The number of clubs in a country league tiers is something that can change, as we alter the
> cache and tune the system ahead of go live, so there should be no wiring around the amount of
> clubs, the finances should be dynamic."*

⚠️ **Scope, owner 2026-11-19: England and Scotland only.** The rule itself is general — no finance
may be wired to a club count anywhere — but all gating, measurement and reporting is EN and SC.
EN is 16 clubs (15 home games), SC is 14 (13). A wired `23` is 53% high for England and **77% high
for Scotland**, the country being tested on.

**This is a standing design rule, not a task.** It governs every piece below that touches a
division size, and it supersedes any brief that says otherwise.

### What it means, precisely — three tiers of correctness

Everything that scales with the size of a division falls into one of three states. Only the first
two are acceptable.

| | state | how it reads the size | where it is right |
|---|---|---|---|
| ✅ | **COUNTED** | counts the actual fixture list — `countHomeGames(fixtures, clubId)` (`src/utils/seasonTickets.ts:84`) | anywhere fixtures exist |
| ✅ | **DERIVED** | `divisionSize − 1`, from the one authored number | init, gates, NPC bootstrap — before fixtures exist |
| 🔴 | **WIRED** | a literal, or a count of whatever club rows happen to exist | nowhere |

**COUNTED already exists and is already used**, at `SeasonTransitionService.ts:1655` and `:2498`
and `PricingPane.tsx:183`. The rule is not a new invention — it is the existing correct pattern
made mandatory, and the reference implementation is in the repo.

### The violation inventory — verified 2026-11-19, not inferred

**Backend: clean.** `grep -rn "homeGames\|HOME_GAMES\|home_games" src --include="*.php"` returns
**nothing**. No backend money multiplies by a home-game count; it works from authored turnover.
The backend's only size dependency is `LeagueSizeResolver::sizeOf()`, which is the authored
number — so the backend is already compliant and needs no work for this rule.

**App: six sites, three distinct faults.**

🔴 **WIRED to a literal `23`:**
- `src/engine/GameLoop.ts:1520` — `const NPC_HOME_GAMES_PER_SEASON = 23;`. Its own comment scopes
  it to the solvency verdict and says *"no money moves through them"* — so this is the least
  harmful of the three, but it is still a literal where a derivation belongs.
- `src/components/new-game-setup/economy.ts:11` — `homeGames: 23` in `ECONOMY_STAND_INS`. This one
  **does** move money the player commits: it is what FUND YOUR CLUB projects a season from. The
  block's own docblock calls these *"stand-ins until starter-config publishes them"* — so the
  intended destination is already recorded; nothing has walked it.
- `scripts/economy/flows.ts:68` — `const HOME_GAMES = 23;` passed straight through at `:104`.

🔴 **WIRED to the wrong axis** (the calendar, not the division):
- `src/engine/SeasonBudgetService.ts:526` — `Math.max(1, Math.round(weeks / 2))` → **23**. Its
  comment is explicit that this is a deliberate improvement on *"the tick's hardcoded 23"*, and it
  is — but half a 46-week season is not the same quantity as one fewer than the division size. At a
  16-club division the truth is 15 and this reads 23: **53% high, feeding real NPC budgets.**
  Halving the calendar is only ever right by coincidence.

🔴 **WIRED to a club-row count, off by one** (this is A6):
- `scripts/economy/variantGate.ts:274` and `dispersionGate.ts:146` —
  `const homeGames = clubCount > 0 ? clubCount : HOME_GAMES;`. A double round-robin gives
  `size − 1` home games, not `size`. One game high at every tier.

⚠️ **One more, found while taking this inventory and NOT yet confirmed:**
`PricingPane.tsx:183`'s pre-fixture fallback reads
`(league.clubs.length ?? 16) + 1` then `Math.floor((numClubs − 1) / 2)` — which at 16 gives **8**
where a 17-club double round-robin gives **16**. If `league.clubs` excludes the player's club
(which `fixtureStore.ts:102` prepending `ampClubId` suggests) then the `+1` is right and the halving
is a single-round-robin assumption left behind — **halving the season-ticket price quoted before
fixtures are drawn.** This needs verifying against `generateRoundRobin` before it is called a
defect; it is on the live path for a real purchase decision, so it wants verifying early.

### What the rule does NOT mean, and this matters

**It does not mean the division size itself goes back to being derived from club rows.** That is
the opposite of dynamic — it is the defect A4 just fixed, and `LeagueSizeResolver`'s own docblock
argues the case at length and correctly:

> *"a derived divisor moves whenever somebody clicks Generate… deriving it from a live NPC count
> means adding two clubs to a tier silently re-prices that tier's TV money for every existing
> build, as a side effect of an unrelated admin action."*

So the rule separates cleanly into two questions that had been tangled together:

1. **How big is a division?** — **AUTHORED.** `league.slots`. It is a design decision, 16-vs-20 is
   the owner's, and it must not move because somebody regenerated a cache.
2. **How do finances get there?** — **DERIVED, from that one number.** Never a literal, never a row
   count, never half the calendar. This is the ruling.

Authored size and dynamic finance are not in tension; the tension only appears if you conflate
"the size can change" with "the size should follow the rows". It can change — by someone
**authoring** a different number, which is exactly the tuning the owner describes. Then every
finance follows, with no pack bump and no code change. **That is the rule's payoff, and it is
directly testable the same way the pack-economy change was: edit one `slots` value on dev and
confirm every downstream figure moves.**

### 🔴 The gap this exposes — authored size can silently disagree with reality

The rule's weak point is now the one thing nothing checks. `grep -rni "slots" src --include="*.php"`
turned up **no comparison anywhere between authored `slots` and the actual NPC club rows.**

So: regenerate England's cache at 20 clubs per tier against `slots = 16` and the world pays
16-club money to a 20-club division — TV divided 16 ways and handed to 20 clubs, check 8's divisor
wrong by 25%, `clubCount` published wrong — **silently, with no error and no log line.** That is
precisely the scenario the owner describes doing ("as we alter the cache and tune the system"), and
it is the one case authored-size handles worse than derived-size did.

**The fix is not to go back to deriving.** It is to make the drift loud: a check that compares
`sizeOf()` against the real NPC row count per league and fails, or at minimum warns, when they
disagree. `app:economy:wage-table` is the natural home — it is already the release gate and
already resolves both numbers. Queued as **A7** below.

### Consequences for the queue

- **A6 is the first piece of this rule, not a standalone off-by-one.** Its brief is widened
  accordingly — see `a6-homegames-brief.md`.
- **A7 (new): the drift check.** Backend. Blocks nothing, but it is what makes the authored size
  safe to tune, so it should land before the next cache regen.
- **Tranche D's 16-vs-20 decision gets cheaper, not more urgent.** Once A6 and A7 land, changing a
  division size is editing one authored number and watching the finances follow. The decision stops
  needing a code change to execute, which is the right order: build the mechanism, then decide.


## A7 — make authored-size drift loud (backend)

**Backend only. Blocks nothing; blocks the owner from tuning safely.** Created by the 2026-11-19
ruling, which it is the second half of: A6 makes the finances dynamic, A7 makes the one number they
all read trustworthy.

**The defect.** Nothing anywhere compares authored `league.slots` against the NPC club rows that
actually exist. Verified: `grep -rni "slots" src --include="*.php"` finds no such comparison.

**The consequence, in the owner's own scenario.** Regenerate England's cache at 20 clubs per tier
while `slots = 16` and the world pays 16-club money to a 20-club division — the TV pool divided 16
ways and handed to 20 clubs, `app:economy:wage-table` check 8's per-club divisor wrong by 25%, and
`clubCount` published wrong to every client. **Silently. No error, no warning, no log line.** The
owner has stated they will be altering caches to tune ahead of go-live, so this is not a
hypothetical — it is the next thing that happens.

⚠️ **Scope: EN and SC.** The check may be written generally — it costs nothing to compare every
league — but **only EN and SC disagreements are findings.** Do not report, investigate or fix drift
in the other 23 countries, and do not fail the gate on them.

**The fix.** A check in `app:economy:wage-table` — it is already the release gate, it already
resolves `sizeOf()` (`:461`, `:947`), and it already has the NPC repository in reach. Compare the
authored size against the real row count per league and report every disagreement with both
figures and the tier.

⚠️ **Decide and state in the report whether it FAILS or WARNS.** There is a real argument each way
and it is not obvious: failing makes the gate red on a box mid-bootstrap, where disagreement is
expected and harmless; warning risks the thing nobody reads. **A defensible suggestion to evaluate,
not a requirement:** warn when the authored size is the larger (a half-filled tier, which is normal
during generation) and fail when the rows outnumber the slots (money is provably being divided too
few ways). If the evidence points elsewhere, say so.

⚠️ **Do not "fix" a disagreement by writing `slots`, and do not make `sizeOf()` prefer the rows.**
Either would reintroduce exactly the defect `LeagueSizeResolver`'s docblock exists to prevent —
*"a derived divisor moves whenever somebody clicks Generate"* — and would undo A4. The authored
number stays authoritative; this task only makes its drift visible so a human can author a new one.

**Expected result on the current dev box:** after `52c8b3bf`'s correction migration, EN should now
read 16 against 16 rows and SC tiers 1–4 should read 14 against 14 — **so a clean run is the
expected outcome, and a disagreement is itself a finding worth stopping for.** That makes this task
cheap to verify and makes it double as confirmation that the correction migration actually matched
rows, which the deploy log does not show (it prints no UPDATE counts).


### A7, second half — the derived TV cache went stale the moment slots changed (MY defect)

Found in the same export, and **I caused it.** B3's correction migration changed `slots` and did not
resync the figure derived from it.

**The evidence, from the fresh export:**

```
EN t1  tvPoolPence     = 30000000000
EN t1  tvDeal          =  1875000000   = pool ÷ 16   ← resolved, CORRECT
EN t1  tvDealOverride  =  1666666666   = pool ÷ 18   ← the RAW COLUMN, STALE
```

`tvDealOverride` is B1's faithful export of the stored `league.tv_deal` column. It still encodes the
old 18-club division, in all 200 leagues.

**Why it matters, and it is not cosmetic.** `syncTvDeal()` runs **only** on an admin save
(`LeagueAdminController:95`/`:201`) — confirmed by grep, and the comments at
`InitializeController:245` and `SyncService:828` both say so explicitly. Nothing re-ran it. So:

- **Every publication path is fine.** All four sites resolve `derivedTvDealPence() ?? getTvDeal()`,
  which is precisely why B1 was worth doing — the stale cache is invisible to clients.
- **The release gate is NOT fine.** `EconomyWageTableCommand:459` reads `$league->getTvDeal()` — the
  raw column — and `:460` reads the *corrected* `sizeOf()`. **The gate is pairing an 18-way TV share
  with a division size of 16.** Its TV checks (3 and 6) are reading England's TV income **12.5% low**,
  and the row it prints is internally inconsistent: `perClub × size ≠ pool`.

**This is also the sharpest possible illustration of the ruling.** A finance was wired — not to a
literal, but to a *cached* club count — and the cache outlived the number it was derived from.

**The fix, both halves, and state the reasoning for each:**

1. **Make the gate resolve, like everything else does.** `EconomyWageTableCommand:459` becomes
   `derivedTvDealPence($league) ?? $league->getTvDeal()`. This removes the gate from the
   cache-staleness class permanently and is the half that actually matters.
2. **Resync the column**, since it is a published cache and other readers may appear. A migration in
   the shape of `Version20261119120000`: stash, write `intdiv(pool, slots)` where a pool exists,
   `down()` restores. ⚠️ **Only where `tv_pool_pence IS NOT NULL`** — a league with no pool keeps its
   authored per-club figure untouched, which is what makes the change provably inert for those rows.

⚠️ **Expect the gate to MOVE on this one, and that is correct.** I previously recorded that B1 left
the gate byte-identical and called the gate "structurally blind to B1". That was true then and is the
same blindness causing this. Fixing it will shift England's TV share up 12.5% in the gate's own
arithmetic. **A byte-identical gate after this change means you have not fixed it.**

⚠️ **Do not resync by making `sizeOf()` read club rows**, and do not drop the column. The authored
size stays authoritative; see the ruling.

## A8 — three fallbacks assume a SINGLE round-robin, and they book real money (app)

**Surfaced by A6, which correctly left them alone — they were outside its named scope.** Verified by
reading all three, 2026-11-19.

**The defect, and it is one root cause in three places:**

| site | what it books |
|---|---|
| `src/engine/SeasonTransitionService.ts:1656` | **NPC season-ticket sales** |
| `src/engine/SeasonTransitionService.ts:2499` | **the player's own season-ticket booking** |
| `src/engine/FinancialProjectionService.ts:222` | the player's financial projection |

Each computes its fallback as `Math.floor((numClubs - 1) / 2)`, and the comments state the
assumption outright — *"half the rounds at home"* at `:2496`, *"round-robin gives (n-1) games total,
half at home"* at `FinancialProjectionService`. **That is a single round-robin.**

`generateRoundRobin` produces a **double** round-robin (`secondLeg` mirrors every first-leg fixture),
so each club plays `n - 1` home games, not `(n - 1) / 2`. **All three fallbacks are about half the
true figure:**

| | true home games | fallback gives |
|---|---|---|
| EN, 16 clubs | 15 | **7** |
| SC, 12 clubs | 11 | **5** |

**This is the same defect A6 fixed in `PricingPane.tsx`** — the brief named that one file, so A6 fixed
it and reported the rest rather than widening its own scope. Correct behaviour, and the reason these
are a task rather than a surprise.

⚠️ **Severity is bounded but real, and must be established before anything is changed.** All three are
`||` fallbacks behind `countHomeGames(fixtures, …)`, so they fire only when fixtures are not loaded —
`:2496`'s own comment says fixtures are loaded at transition but *"at world init they may not be
yet"*. **So the first task is to measure how often the fallback actually fires**, not to fix the
arithmetic. If it only fires at world init, this under-books one season's opening figures; if it
fires at transition, it under-books every season.

⚠️ **Do not fix by removing the fallback.** It exists for a real timing gap. Fix the arithmetic
(`n - 1`, with the reservation handled as A6 established — see the EN t8 argument), and keep the
fallback.

**Relationship to the ruling:** these are **WIRED to the wrong formula** rather than to a literal — a
fourth flavour the original inventory missed, and the one with the most real money behind it.

## ⚠️ CORRECTION — "~31 pre-existing test failures" is WRONG, and it is my error

**Caught by the A7 agent, 2026-11-19.** I have written "~31 pre-existing failures" into agent
briefs. **31 is `app:economy:wage-table`'s own failed-CHECK count**, not a test figure:

```
 [ERROR] 31 check(s) failed. Do not flip the wage model until these are resolved.
```

`.context/stages/01_overview/output/environment.md` documents **three to five** test failures,
varying by run composition. Two different things that happened to share a number.

🔴 **Why it mattered:** an agent taking that number at face value could have dismissed up to 31
genuine test failures as pre-existing — the exact failure the "attribute by stashing, never by
reading the assertion" rule exists to prevent. **Do not repeat the figure in any future brief.**
Say "three to five, per `environment.md`, and attribute anything else by stashing."

Also corrected by A7: **`EconomyWageTableCommand`'s check-3 raw read is at `:460`, not `:459`.**

## ⚠️ CORRECTION — the gate had TWO stale `tv_deal` reads, not one

My A7 brief and this plan both named one. A7's grep found two with the identical defect — a raw
column read paired with a `sizeOf()` read a few lines away:

| line | check | disposition |
|---|---|---|
| `:460` | check 3 | **fixed** |
| `:952` | check 8 | **fixed** — `sizeOf()` at `:947`, same defect |
| `:550`/`:551` | check 6 | **deliberately left**, and rightly |

Fixing both was the right call and it is the brief's own stated goal — *"removes the gate from the
cache-staleness class permanently, rather than fixing one instance of it."* Fixing `:460` alone
would have left the command in that class.

**Check 6 was correctly declined.** It asks a different question — *"was this stored absolute
authored with the country factor applied?"* — and resolving its reads would silently convert it
into a check on whether `tv_pool_pence` is country-scaled. That is a change to what an existing
check asserts, which the brief forbids. It is inert today (check 6 returns early at parity, and
every country is at parity). **Queued below as a scoping question, not an agent task.**

## A9 — publish the authored division size on `economyTierBaseline.tiers[]`

**A6's suggestion, seconded by A7, out of scope for both.** If the backend published each tier's
authored size in the config block the app already fetches, the app could delete
`FALLBACK_DIVISION_SIZE` and `new-game-setup`'s `homeGames` stand-in outright, rather than
deriving or approximating them.

**That is the ruling's end state**: one authored number, published once, read everywhere, with no
fallback left to drift. It would also close A8's three sites properly rather than fixing their
arithmetic.

⚠️ **It is a published-payload change**, so it needs deciding on that basis — not a pack-shape
change (no `WORLD_PACK_VERSION` bump), but a new key in a published contract. **Scope it before
briefing it**, and settle whether check 6 (above) folds into the same piece of work.

## ✅ A6 AND A7 BOTH CLOSED — 2026-11-19, nothing pushed

**App, `new-game-save`, 3 commits** — `3300fcd1` (code), `ddb0b991` + `b29cf149` (docs).
`tsc` clean; 638 suites, 10,664 passed, exit 0.

**Backend, `development`, 3 commits** — `a2697867` (gate + `Version20261119150000` + 702 lines of
tests), `f5eb9e75` (`.context`), `0e68d6ac` (test baseline).
Full suite: **3,294 tests, 156,181 assertions, 3 failures, 10m23s** — baseline items #1–#3 by name
and by assertion; #4 did not fire, which is its documented composition-dependent behaviour. Tree
clean, 3 ahead of origin.

**Neither is pushed and neither is deployed.** Both work branches are intact.

### What each closed

| | |
|---|---|
| A6 | `slots − 1` in both gates + `flows.ts`; the FUND YOUR CLUB stand-in; `PricingPane`'s halving fallback |
| A7 | both stale `tv_deal` reads resolved (`:460` **and** `:952`); `Version20261119150000` resyncs the column where a pool exists; **check 9** compares authored size against NPC rows **and** the cached pack |

### Two disciplines worth keeping, both from A7

1. **It committed at 495/3294 and said so**, rather than letting section order imply the suite had
   passed before it committed. The run came out clean; the ordering was still its call and it put it
   on the record.
2. **It distinguished "I did not stash" from "there was nothing to stash for"**, and only claimed
   the second. Precisely the distinction that makes a green suite trustworthy.

### My two brief errors, now fixed at source

Both were caught by A7 and are struck **in `environment.md` itself**, not only here — so no future
agent can inherit them from `.context`:

- **"~31 pre-existing failures"** is the *gate's* failed-check count. The suite baseline is
  **three to five**. Judging a run against 31 would silently absorb ~27 real failures.
- **`NpcClubPlaceWeightingTest`** is now baseline item **#5**, with the note that absent is not
  fixed. (The brief told A7 to do this; it did it only in its report on the first pass, noticed, and
  flagged the miss rather than quietly folding it in.)

### Still unresolved, and it needs the deployed box

Whether Scotland's `npc_club` holds **12** or **14**. A7's 20 new tests exercise check 9 against
synthetic fixtures and **cannot** speak to the live world; the clone is a different world entirely.
**`php bin/console app:country:check SC`** settles it, with A7's two SQL queries as the fallback.
Nothing is blocked on the answer — check 9 is correct under either.

### Incidental, and a good sign

The gate's failed-check count is **31 before and 31 after** on the clone — correct, not inert: the
sizes agree at all sixteen EN/SC tiers there, so check 9's tables appear and no finding does. On a
deliberately staled copy the same code produced sixteen findings. None of the 31 is A7's and none
moved.

## ✅ DEPLOYED TO DEV — 2026-11-19 15:28, A6 + A7

Both repos cut to `dev` as one change, work branches restored and clean.

| | branch | merge | run | result |
|---|---|---|---|---|
| app | `new-game-save` → `dev` | `bf5a9ece` | `44552928361` | ✅ EAS OTA, 7m23s |
| backend | `development` → `dev` | `c10a0a10` | `44554477957` | ✅ deploy, 3m24s |

**Pre-push verification on the MERGED trees, not just the work branches:**
- App: `tsc` exit 0; the four affected suites green (93 tests).
- Backend: full suite **3,294 tests, 156,137 assertions, 3 failures** — `environment.md` baseline
  items #1–#3 by name. Identical to the run on `development`, so the 184-commit `dev` divergence
  introduced nothing.

**Migration applied:**
```
[notice] Migrating up to DoctrineMigrations\Version20261119150000
[notice] finished in 19.9ms, used 20M memory, 1 migrations executed, 3 sql queries
 [OK] Successfully migrated to version: DoctrineMigrations\Version20261119150000
```

⚠️ **This deploy should be INVISIBLE on device.** The resync writes `tv_deal = pool ÷ slots` into
the stored column; clients already receive the *resolved* figure from the four publication sites, so
no published number moves. **If a TV figure does change on the next device pass, that is a finding
and wants chasing** — it would mean a publication path reads the raw column after all.

⚠️ **It does NOT regenerate packs or clubs**, so the Scotland 12-vs-14 question is exactly as open as
it was. `app:country:check SC` still settles it.

**What the box gains:** the gate stops reading a stale TV cache (both reads), and `check 9` exists to
catch authored-size drift from the next cache rebuild onward.

## ✅ DEVICE PASS 2026-11-19 15:47 — £1 wages EXPLAINED, and a test-validity warning

**Scottish save, tier 8, from the debug panel. Three findings.**

### 1. 🟢 £1 wages are arithmetically correct — and my legacy-model hypothesis was WRONG

I suggested the device had fallen back to the legacy wage model. **It had not.** The panel reports
`Economy block resolved for a country: country SC`, `Wage model: turnover`,
`Resolved model (AMP club, tier 8): turnover · scale 116,651,541 micropence`, `8 tier(s); 8
resolvable`. The turnover model is resolving for Scotland correctly.

**Scotland's tier-8 scale is exactly half England's** (116,651,541 against 233,303,081) — a country
factor of 0.5. The resulting ladder:

| current ability | weekly wage | displays |
|---|---|---|
| 1 | £1.16 | **£1** |
| 2 | £6.59 | £7 |
| 3 | £18.18 | £18 |
| 5 | £65.21 | £65 |
| 7 | £151.22 | £151 |

**£1 is ability 1.** The observed tier-8 mean of **1,899 pence** corresponds to a mean ability of
~3.0, which is exactly what a 2–7 **potential** band produces once current ability is derived below
it. Everything reconciles; nothing is broken.

### 🔴 But the curve is the finding: a 7× ability range gives a 130× wage range

`wageCurveExponentBp = 25000` (k = 2.5) means the bottom of a tier's band is **nearly free**.
Ability 1 costs £1.16/wk against ability 7's £151.22. At a tier whose band is 2–7, a young player
below his band costs essentially nothing to employ.

**This is the authored curve doing exactly what it says**, not a defect — but whether a 130:1 spread
inside one division is wanted is an owner decision, and it belongs with the **open wage
re-calibration item** (potential-vs-ability, the ~3× gap). ⚠️ **Do not "fix" it by moving
`wageScaleMicroPence`** — that reprices every squad in the game. The lever, if one is wanted, is `k`.

### 2. 🔴 THE TEST SAVE IS NOT A CLEAN SUBJECT — `Pack version: MIXED: 10, 11`

> *"tiers were fetched across a backend deploy, so this world is not one generation"*

This save straddles the 11:40 deploy: some tiers came from v10 packs (money baked in), some from
v11 (money stripped). The panel calls it advisory, and it probably is harmless — the app code is
uniformly v11 and ignores pack money keys regardless of the version it finds — **but it means
figures read on this save cannot be attributed cleanly to either generation.**

⚠️ **This refines the answer I gave the owner on rebuilding.** The worldpack *cache* does not need
rebuilding — nothing today bumped `WORLD_PACK_VERSION`. But **a fresh save should be started**, so
every tier is fetched from one generation. That is a different action from a cache rebuild and it is
the one that matters for test validity.

### 3. 🟨 A THIRD independent source puts Scotland at 12 clubs

`World pack contents: 95 club(s)` = **12 × 7 + 11**, and the per-tier lines read `12 club(s)` at
tiers 1–7 and `11 club(s)` at tier 8 — matching the reserved place exactly.

So the device's own pack, the world export, and the league table all say 12. Only the two migrations
say 14. **That moves the odds toward (C) — the rows really changed during the cache rebuild — and
away from (A).** ⚠️ **It does not settle it**: if the pack generator and the export share the same
lossy join, both would be wrong identically. `app:country:check SC` remains the discriminator.

## ✅ A8 CLOSED — and it SHRANK the finding. No money was ever mis-booked.

**App, `new-game-save`, commit `e03dd6da`, not pushed.** `tsc` clean; **639 suites / 10,685 tests**
green; economy gate **byte-identical**, as required. Tree clean.

### 🔴 THE CORRECTION — A6 was wrong, and so was every relay of it including mine

A6's §6 said of the two season-ticket sites: *"this is not a rare branch; it is the season-1 path."*
**That is not correct.** A8 measured the call graph instead of reading the comment:

| site | books | fires? |
|---|---|---|
| `SeasonTransitionService.ts:1656` | NPC season-1 season tickets — **real money** | **No.** `useInitFlow`'s step N+2 generates every league's schedule before step N+5 distributes income |
| `SeasonTransitionService.ts:2499` | the player's own booking — **real money** | **No.** Fixtures exist at world init *and* at every transition (`applySeasonResponse` generates inside `server_sync`) |
| `FinancialProjectionService.ts:222` | the projection — **no money** | **Yes**, in one reachable state: a save whose fixtures failed to hydrate |

**So no shipped save has mis-booked season-ticket money.** This was a correctness tidy-up with one
real *display* consequence, not a money fix.

⚠️ **How the error happened, and it is worth remembering: A6 measured the comment, not the call
graph.** `SeasonTransitionService:1655`'s own comment says *"Fixtures may already be generated at
init; fall back … when they aren't"* — A6 read "may" as "often do not". **A comment is a claim, not
a measurement.** The same root cause as the "half the rounds at home" comments this very task
existed to delete.

**A8 corrected `.context` itself** — `game-mechanics.md` §13.6 now carries A6's claim struck through
with the correction and attribution, rather than quietly overwritten. Nothing for the PM to fix.

### 🟩 The one real consequence that remains

`FinancialProjectionService:222` fires when a save's fixtures are not in memory — the cache-loss case
`GameCacheRepairOverlay` exists for. The count drives **both** `totalHomeIncome` and the
season-ticket lump, so such a save was shown roughly **half** of each. `SeasonBudgetService` then
reads that lump to size the budget. **No ledger entry; no money moved.**

### 🟨 A `+1` subtlety nobody anticipated, and the brief got it wrong too

The brief warned not to assume `leagueSizeById` behaves like `league.clubs`. It was righter than it
knew: **both a flat `+1` and no `+1` would have been wrong at site 1.**

`leagueSizeById` is built from `worldStore.leagues[].clubIds`, which excludes the player's club. But
world generation reserves a place **only in the player's own league**, so that league has one fewer
row than its authored size while every other league has its full complement. A flat `+1` would have
given every NPC club in every other division one home game too many.

A8 keyed off `worldStore.ampLeagueId`, which tracks the player's league **through promotion and
relegation** rather than assuming the deepest tier:

```ts
const participants = l.clubIds.length + (l.id === ampLeagueId ? 1 : 0);
```

**This is the reservation rule appearing for the fourth time today** — in the slots migration, in the
EN t8 formula argument, in check 9's drift decomposition, and now here. Each time it has been the
thing that makes a naive fix wrong.

### Still open from A8, unchanged

- `SeasonBudgetService.ts:526` and `GameLoop.ts:1520` — the owner's; both move NPC money.
- **`FALLBACK_DIVISION_SIZE = 17`** is wrong for both countries in scope (EN 16, SC 12). **A9** is
  the real fix.

## 🟩 OWNER DECISION 2026-11-19 — the wage curve is PARKED, and the direction is set

> *"I expected this, but as long as the curve, the mechanics are working, we can tweak later
> (using potential in the calculation)."*

**The 130:1 wage spread inside a division is accepted as working-as-authored and deferred.** Not a
defect, not a blocker. ⚠️ **Nobody is to "fix" it in passing** — it is now a deliberate, recorded
state.

### The direction, and why *how* potential enters is the whole decision

The owner named **potential** as the lever. There are two very different ways to use it and they
have opposite consequences, so this needs settling before anyone briefs it.

**First, the actual defect, verified in `EconomyScaleResolver` 2026-11-19.** The scale's denominator
and the player's numerator measure **different quantities**:

```php
// referenceSquadAbilitySum() — the DENOMINATOR
$band = $this->abilityBand($country, $tier);   // the authored band = a POTENTIAL range
...
$sum += ((int) round($band['min'] + $span * $i / ($size - 1))) ** $k;

// S_tier = playerBudget x UNIT / (weeks x sigma)
```

and the wage is then `S_tier × (CURRENT ability)^k`. **The reference squad is built from potentials;
real players are priced on current ability, which sits below it.** Both ends push the same way — a
larger sigma makes S_tier smaller, and a smaller ability makes the wage smaller again — which is
why measured wage bills land at ~28–35% of the budget they are nominally calibrated to.

**So the two options:**

| | change | effect | objection |
|---|---|---|---|
| **(a) price on potential** | wage = `S × potential^k` | numerator matches denominator | a 16-year-old prospect earns like a star. Footballing nonsense |
| **(b) build the reference squad from EXPECTED CURRENT ability** | fix sigma, leave the wage on current ability | levels rise to the authored budget; a player is paid for what he **is** | needs an age/development model to say what "expected current" is |

### 🟩 OWNER CHOSE (b), 2026-11-19 — and the scoping says it is CHEAPER than it looks

> *"b is what the implementation should be"*

**Nothing needs inventing. The maturation model already exists, fully authored**, in
`PlayerGenerationService::buildAbilityTarget()` — verified 2026-11-19:

| age | `abilityTarget` |
|---|---|
| ≤ 21 | 0.30 – 0.60 |
| 22 – 25 | 0.60 – 0.85 |
| ≥ 26 | 0.85 – 1.00 |
| 18–23, 5% of them | 0.85 – 0.95 (prodigy) |

plus a further cap from `abilityCeilingFractionForAge($age)` in the pool config.

**And the chain below it is authored too.** `buildAttributes()` sets
`$cap = floor(abilityTarget × potential)`, draws each of six attributes inside that cap at
position-specific fractions, and takes **current ability as their mean** (capped at potential). So:

```
expected current ability  =  potential  ×  abilityTarget  ×  mean(position attribute fractions)
```

Every term on the right is already in the code. **This turns (b) from "build an age/development
model" into "make `referenceSquadAbilitySum` use the expected-ability the generator already
implies instead of raw potential"** — a one-source-for-one-quantity consistency fix, the same shape
as every other fix landed today.

⚠️ **Do NOT re-derive these numbers into the economy service.** If the bands move, the scale must
move with them; reach the generator's own values (or publish them once) rather than copying the
table. Copying it is how the two halves drifted in the first place.

**The one genuinely new input:** the reference squad currently has a **size**
(`referenceSquadSize($tier)`) but **no age profile**, and expected ability depends on age. An age
distribution must be authored or taken from whatever the generator uses to age a squad. **That is
the only open design question in (b)**, and it is small.

**Rough expected effect, to sanity-check the result against:** if a realistic squad averages
`abilityTarget ≈ 0.7`, sigma computed on expected ability rather than potential shrinks by
`0.7^2.5 ≈ 0.41`, so `S_tier` and every wage rise by about **2.4×**. Measured bills at 28–35% of
budget would land near **70–85%** — most of the gap, not all of it, with the remainder being the
attribute-fraction term above. ⚠️ **If an implementation lands exactly on 100%, be suspicious** —
that would suggest the reference squad was fitted to the target rather than derived.

**(b) was the one to scope, and is now chosen.** It keeps the semantics right and corrects the level, and it is what A2's
brief deferred as *"sampling expected mature ability… depends on an open owner decision"*. A blend —
paying partly for potential, as real contracts do — is a legitimate third option but it is a design
change, not a calibration fix, and should be decided separately.

⚠️ **Whatever is chosen reprices every squad in the game**, so it is one cut, app and backend
together, with a full gate re-run. It also moves the **cost** side of COVERAGE, so R2's calibration
must be re-read afterwards rather than assumed to survive. **Do not start it before Scotland's
12-vs-14 is settled** — recalibrating against a division whose size is in doubt wastes the work.

## 🟩 PLAN (owner, 2026-11-19) — freeze development, then multi-season testing

> *"Once we get the major issue resolved and deployed, we'll freeze development and focus on
> multiple seasons testing."*

**The major issue = A10 (the wage scale) and Scotland's 12-vs-14.** After those land and deploy,
development freezes and testing moves to long runs.

### ⚠️ What multi-season testing will specifically exercise — and what is still wrong inside it

A freeze is only as good as what is inside it. These are the open items that **season-over-season
play is exactly the thing that would surface**, so landing them after the freeze means re-running
the tests:

- 🔴 **`SeasonBudgetService.ts:526` — the strongest candidate to settle BEFORE the freeze.** It
  derives NPC home games as half the season (**23**) rather than from the division: **53% high in
  England, 77% high in Scotland.** It feeds `npcWeeklyIncomePence` → `deriveClubBudget` → every NPC
  club's squad spend, **every season**. Multi-season testing is precisely what would reveal NPC
  financial drift — and it would be measuring drift against a known-wrong input. **This is an owner
  decision that has been deferred three times; it should be made before, not during, the long runs.**
- 🟨 **Promotion and relegation move the player between leagues**, which changes which league is the
  amp league. A8's fix keys off `worldStore.ampLeagueId` precisely so it tracks that — **and
  multi-season play is its first real test.** Worth watching home-game counts and season-ticket
  prices across a promotion.
- 🟨 **The insolvency mechanic.** The bankruptcy ladder was re-dimensioned this month and is still
  effectively untested; it only fires after sustained deficit, so a long run is where it first bites.
- 🟨 **Scotland's TV shortfall compounds.** £86,600,000.36 per season unpaid across the pyramid, so
  by season five it is a materially different world.

### Open investigations that long runs would answer cheaply

Worth watching for rather than chasing now: the **£92.3M investor line**, **`seasonTicketHolderPercent`
70 against 613 sold**, and the **`seededRng` identity bias**. None justifies a task of its own yet;
all three are the sort of thing several seasons of play either reproduces or retires.

### What a freeze should NOT include

⚠️ **Do not freeze before the economy numbers the testing will measure are the ones you intend to
ship.** A10 changes every wage; Scotland changes every Scottish club's TV. Freezing with either
unresolved means the long runs measure a world that is about to change anyway.

## 🟩 STANDING INSTRUCTION (owner, 2026-11-19) — device data becomes a CHECK

> *"If there is any specific data we need on the device, certain queries that would represent
> valuable on device checks. Add them to the checks process. Add that as a note for all agents."*

**Recorded in `docs/economy-loose-ends/agent-standing-notes.md` §1, which every future brief must
reference.** Relayed to A10 and A12 mid-task.

**The rule:** when a task depends on a figure only a device can confirm — or an agent finds itself
writing *"the owner should check X"* — **X goes into the CHECKS tab**
(`src/components/debug/ChecksTab.tsx`), not into prose. A check is a permanent answer; a report
sentence is read once.

**The cost that justifies it, from today.** A Scottish division paid TV **fourteen ways to twelve
clubs**. Three agents and this session spent hours triangulating it from a world export, a
screenshot and two migrations. **One line — authored size against actual clubs against
fixture-derived home games — would have shown it immediately.**

⚠️ **Adding a check is in scope for any task whose findings justify one**; no separate brief needed.
But it must **earn its line** (see A13) — one or two focused lines, stating a *relationship* that
can fail, never a new section of numbers.

## A13 — the CHECKS report has outlived half its checks

> *"create a task to clean up checks, and some of the 'checks' have been completed. We don't want
> the output to be too heavy."*

**Brief written: `a13-checks-cleanup-brief.md`. App-only. Not started.**

**The surface:** `ChecksTab.tsx` (718 lines) over `db/diagnostics.ts` (2,652),
`economyDiagnostics.ts` (142) and `worldPackDiagnostics.ts` (102).

**What is dead.** The section labels `D4`, `D8`, `D12`, `D13`, `D14`, `A3`, `A5`, `A6`, `B2`, `B3`
are task IDs from a finished workstream, and several checks still print **go/no-go verdicts for
decisions already taken**:

```
clearAllClubData wall-clock (A6): 357ms
  under the ~500ms bar — A6 does NOT proceed

B2: how the pool scan reaches players: bare SCAN of players — expected on 3.50.3,
    settled by D14
```

**A check whose own text says the question is settled has finished its job.**

**The bar the brief sets:** a check earns its line if it can **fail in a way that changes what
someone does**. Everything else is either a standing fact (keep, but collapse) or retired.

⚠️ **It is a CURATION task, not a deletion task.** Losing a standing invariant to save three lines
is far worse than leaving one stale check in. ⚠️ **COPY EVERYTHING must stay complete** — collapsing
the default view must not lose detail from the clipboard, since pasting into a bug report is the
tab's whole purpose.

**It also ADDS the three checks today proved were missing:**
1. 🔴 **Division size three ways, per league** — `slots` vs actual clubs vs fixture-derived home
   games vs the TV divisor. The Scotland defect in one line.
2. **The wage-model reality check** — measured mean wage against the tier's authored player budget,
   as a ratio. It has sat at ~28–35% for months with nobody seeing it as a number; A10 is expected
   to move it to ~70–85%. **A10 has been asked to spec this.**
3. **NPC budget inputs** — weekly income split into sponsor / matchday / seasonal, with the
   home-game count **and how it was obtained**. **A12 has been asked to add this.**

## ✅ A12 CLOSED — and the cut is NOT flat. It lands hardest where solvency is already marginal.

**App, `new-game-save`, commit `ea7f8bd2`, not pushed.** `tsc` clean; **640 suites / 10,704 tests**;
economy gate **byte-identical** (same md5 A8 recorded). Tree clean.

NPC budgets now **count real home fixtures**, falling back to the derived size only when a save has
none. On a real save every club takes the COUNTED path — `useInitFlow` step N+2 generates every
league's schedule before any budget is bootstrapped.

### 🔴 THE MEASUREMENT — and A6's estimate was wrong at both ends

| | home games | weekly income change |
|---|---|---|
| EN tier 1 | 23 → **15** | **−7.3%** |
| EN tier 8 | 23 → **15** | **−31.1%** |
| SC tier 1 | 23 → **11** | **−10.9%** |
| SC tier 8 | 23 → **11** | **−51.1%** |

**The cut is 4–7× larger at the bottom of the pyramid than the top**, where A6 had predicted a flat
24–37%. **Reason: A6's estimate excluded sponsors.** A tier-1 club's TV (£136m/season) and sponsors
(£620k/week) dilute the matchday term almost to nothing; a tier-8 club earns £325/week in sponsors
and £4,950 a *season* in TV, so it is almost entirely gate money.

**What it actually does to spend:**
- **Tiers 1–5: the wage CEILING does not move at all.** `wageReservationPence` is
  `max(share, committed bill)` and those clubs are already `overCommitted`. The whole reduction
  lands on **surplus** — EN t1 goes from +£5.8m to **−£9.3m** a season. **They will not sell
  players; they will stop banking money.**
- **Tiers 7–8: it passes straight through.** Not over-committed, so the ceiling falls the full
  31–51% and squads are genuinely re-priced smaller from the next renewal.

⚠️ **This lands hardest exactly where solvency was already marginal, and that bears directly on
multi-season testing.** It is the right number. If tier 7–8 NPC clubs now look too poor, the lever
is **turnover**, settled against the gate — not the home-game count.

### 🔴 `GameLoop.ts:1520` — MEASURED, NOT LANDED. The gate was tripped by a wide margin.

| | flips |
|---|---|
| **EN tier 1** | **16 of 16** |
| **SC tier 1** | **14 of 14** |
| EN tier 8 | 0 of 15 |

Almost all `healthy → warn`, several `healthy → crisis`, **two Scottish clubs `healthy → folded`.**
A12 stopped, as instructed. The one-line correction is written at the site with the figures so
nobody re-derives it.

### 🔴🔴 THE REAL FINDING — tier-1 solvency sits on a knife edge, and this change did not cause it

A tier-1 club's modelled wage bill plus upkeep sits **within a few percent of its income**. Above
break-even `weeksRunway` returns its 52-week cap and the band is `healthy` regardless; below it,
runway collapses to single digits. **So ANY income reduction at tier 1 flips the whole division at
once.** A12's sensitivity sweep over the modelled wage share:

```
EN t1  flips vs wage share   40%:0  50%:0  55%:0  60%:16  65%:11  70%:8
SC t1  flips vs wage share   40%:0  50%:0  55%:0  60%:14  65%:14  70%:1
EN t8  flips vs wage share   40%:0  50%:0  55%:0  60%:0   65%:0   70%:0
```

**Zero flips at 55%, all of them at 60%.** The tier-1 solvency verdict is currently decided by
whether income exceeds outgoings by a hair, not by any margin the design chose. ⚠️ **This is an
owner-level fragility in its own right, independent of A12**, and multi-season testing will walk
straight into it. It belongs with the `SeasonBudgetService` family of decisions.

⚠️ **Stated limit:** the wage bill is **modelled** at 60% of authored turnover, because no world
export carries NPC squads (packs are a census). It is the right ballpark — the backend derives
`wageScaleMicroPence` from the same turnover — but it is a model, which is why A12 gave a sweep
rather than one number.

### The asymmetry deliberately left behind

The budget now uses 15/11 while the solvency verdict still uses 23, so the brain's **runway** test
reads optimistic income while its **wage** test reads the corrected allowance. **Temporary, and
strictly the safer direction** — a brain selling on an optimistic runway sells *less*, not more.
Recorded at both sites and in §13.6.

## 🟩 DESIGN PHILOSOPHY (owner, 2026-11-19) — the dials are meant to move

> *"I think it will need testing and tweaking in terms of income levels and salaries etc, facility
> maintenance costs etc. All of which is configurable in the admin, which is the entire point, we
> want these things to shift, so we can create challenges in game for the owners to 'balance the
> books'."*

**Financial pressure is a design goal, not a defect.** A club that comfortably covers its costs is
a club with nothing to manage. The admin-configurable dials — turnover, the wage-to-turnover ratio,
the staff share, facility upkeep, ticket and sponsor bands — exist precisely so difficulty can be
authored and shifted.

⚠️ **This changes how to read a coverage figure, and it is worth stating because several open items
now read differently.** A squad bill at or slightly above its budget is not automatically wrong.
The question is never "is this number uncomfortable" but:

### 🔴 The distinction that matters: AUTHORED pressure vs EMERGENT artifact

| | |
|---|---|
| **Authored** | somebody turned a dial, the number moved, the game got harder. **Keep, tune, ship.** |
| **Emergent** | the number came out of a formula's side effect — convexity on a narrow band, a stale constant, a wrong divisor. **Fix, then author the pressure deliberately if it is wanted.** |

**Both produce a hard game. Only one is controllable.** An emergent artifact cannot be tuned down
without changing code, so it silently removes a dial from the owner's hands — the opposite of the
stated intent.

**Live example, from A10.** EN tiers 6, 7 and 8 now price squads at **109%, 114% and 124%** of
their authored wage budget. That is real pressure — and the owner may well want tier-8 clubs
scraping by. **But nobody authored it.** It falls out of `x^2.5` convexity on a band of five
integers or fewer (`E[a^k] > E[a]^k`), so the overshoot is a function of **how narrow the band is**,
not of any difficulty setting. Widen the band for unrelated reasons and the difficulty moves with
it, uncontrollably. **The fix is the R1 band-authoring item already in Tranche D; the pressure, if
wanted, then comes from the wage-to-turnover ratio where it can be dialled.**

**Standing guidance for every economy task from here:** when a figure comes out uncomfortable, say
whether it is authored or emergent before proposing anything. Agents should not "fix" pressure that
the owner may have wanted, and should not leave an artifact in place because it happens to feel
right.

### The tier-1 solvency knife edge, re-read in this light

A12 found zero verdict flips at a 55% wage share and all sixteen at 60%. **That is emergent, not
authored** — the band is decided by whether income beats outgoings by a hair. The owner may want
tier-1 clubs under pressure; what they cannot want is a verdict that is binary on a rounding error,
because it cannot be tuned, only tripped.

## 🟩 INCOME LEVERS (owner, 2026-11-19) — one already exists and is switched OFF

> *"we could add a new facility 'media centre' that creates income… Or we could increase the income
> for the club shop. If NPC clubs are designed to manage their own balance, it will also act as a
> good test."*

### 🔴 `nonMatchFacilityIncomePercent` is built, published, admin-editable — and set to **0**

```php
// GameConfig.php:1305
private int $nonMatchFacilityIncomePercent = 0;
public function setNonMatchFacilityIncomePercent(int $v): static { ... max(0, min(100, $v)) ... }
```

It is edited in the admin (`DashboardController:399`), published to the device
(`GameConfigController:158`), and already consumed at **both** income sites —
`GameLoop.ts:1208` and `SeasonTransitionService.ts:1174`.

**So "increase the income for the club shop" needs no code at all.** The Club Shop already earns
`matchdayIncome: 200000` (£2,000) per home game at level 1 with a 0.8 multiplier and £200/week
upkeep. What it does **not** earn is anything on the ~31 non-match weeks of a 46-week season —
because the dial that would pay it is zero.

**This is the authored-pressure lever in its purest form:** one admin field, no deploy, no pack
bump, and it moves every income facility at once. ⚠️ **It also moves NPC clubs**, since both call
sites serve them too — which is exactly the balance test the owner wants.

### On a "media centre" — ⚠️ CORRECTED

An earlier draft of this section called it *"a new facility template, not a dial"*. **That was
wrong, and the owner corrected it: facility rows are already creatable and editable in the admin,
and the Club Shop is one of them.** So a media centre is an admin action too, not a build.

**Which means the entire income side is already tunable with no deploy**: facility rows on one
side, `nonMatchFacilityIncomePercent` on the other. ⚠️ **That makes the sequencing caution below
MORE important, not less.** When every lever is one field away, the cheapest response to any
uncomfortable number is to tune it — and tuning away a symptom whose cause is in code leaves the
cause in place, still untunable, now hidden behind income that was added to mask it.

Before reaching for either, the existing dial answers the prior question for free: *does more non-match income
actually fix what looks wrong?* If turning `nonMatchFacilityIncomePercent` to 20–30 relieves the
tier 6–8 squeeze, the problem was income. If it does not, a media centre would not have either,
and the real cause is the band narrowness A10 identified.

⚠️ **Also note the §5 deferred list already carries "a `club_shop` effect that earns nothing"** —
worth confirming whether that refers to this same zeroed dial before anyone treats it as a separate
defect.

### NPC self-management as a test — good, but TWO things currently confound it

1. **The solvency verdict is binary on a rounding error** (A12: zero flips at 55% wage share, all
   sixteen at 60%). A balance test against a verdict that can only be tripped, not tuned, measures
   the knife edge rather than the clubs.
2. **A12 deliberately left an asymmetry**: the NPC budget now counts real home games (15/11) while
   the solvency verdict still uses 23. Safe in direction — an optimistic runway sells *less* — but
   it means the brain's income test and its wage test currently disagree. **Settle `GameLoop:1520`
   before trusting a multi-season balance run.**

### ⚠️ Sequencing — measure, then add income

Adding an income source to a system still being measured cannot be evaluated: it would **mask** the
emergent artifacts rather than fix them, and an artifact hidden behind new income is still
untunable. **A10 and the Scotland question first; then turn the dial that exists; then build new
content if the dial proves income was the right lever.**

## 🟩 SEQUENCING DECISION (owner, 2026-11-19) — correctness before calibration

> *"Your point about tuning levers to fix an issue doesn't resolve the underlying problem when
> there's potentially code issues… I'm not going to tune anything now until we know the economy
> implementation is working as expected, and then we can start reviewing what the income values
> look like."*

**No dial moves until the implementation is verified.** This is now a standing rule, and it binds
agents too: ⚠️ **no task may propose re-authoring an economy figure to relieve a symptom.** If a
number looks wrong, say whether it is authored or emergent (see the DESIGN PHILOSOPHY section) and
stop there.

### 🔴 THE EXIT CRITERION — what "working as expected" has to mean

Otherwise this boundary is a feeling. The implementation is correct when **every economic quantity
has exactly one source, and a device can prove it.** Concretely:

| | item | state |
|---|---|---|
| 1 | **Wage scale calibrated on real ability** (A10) + its app-harness mirror | implemented, **not committed**; mirror is a follow-up (A14) |
| 2 | **Scotland's division size settled** — authored 14 vs actual 12 | A11, briefed, not started |
| 3 | **`GameLoop:1520`** — the budget counts 15/11 while the verdict still uses 23 | measured by A12, **not landed**, owner's |
| 4 | **The tier-1 solvency knife edge** — binary on a rounding error | diagnosed, undecided |
| 5 | **No home-game figure wired to a literal** | ✅ closed by A6, A8, A12 |
| 6 | **No finance reading a stale cache** | ✅ closed by A7 (both gate reads + the resync) |
| 7 | **Authored size published, app fallbacks deleted** (A9) | queued, not briefed |
| 8 | **The CHECKS tab can verify 1–7 on a device** (A13) | running |

⚠️ **Item 8 is the one that makes the rest checkable.** Without it, "the economy is working" is an
assertion from a report rather than something readable off a live save. **The freeze should happen
at this boundary, not before it** — multi-season testing against an unverified implementation
measures the implementation, not the balance.

### What comes AFTER the boundary, in order

1. **Read the income values** — with the CHECKS tab, on a real save, with the levers still at
   their current settings. ⚠️ **Measure before moving anything**, so there is a baseline to compare
   against.
2. **`nonMatchFacilityIncomePercent`** (currently 0) is the first dial to try, because it is one
   field, reversible, and moves player and NPC clubs alike.
3. **Facility rows** — new or edited — as content, once the dial has shown whether income is the
   right lever at all.
4. **The ability bands (R1)** — the tier 6–8 overshoot is band narrowness, and it is the one
   authored figure whose correction is a *fix* rather than a tune.

## 🟩 THE INTENDED GAME (owner, 2026-11-19) — read every economy finding against this

**The pyramid gradient is a DESIGN GOAL.** Most income concentrates at the top; solvency gets
harder the further down you go; **the very bottom is held up by investment and by owners trying to
climb** — as in real football.

**The player's arc is multi-club.** Start small with a modest account budget → build the club up →
**sell it** → reinvest dividends and sale proceeds into a larger club with a **larger plot**, hence
**larger catchment → larger fan base → bigger stadium → larger attendances**. Much of this machinery
exists; the plot-population-to-fans link does not (below).

### 🟢 What this CONFIRMS as working-as-designed

- **A12's finding that the home-games correction cuts 4–7× harder at the bottom** (−7% at tier 1,
  −31–51% at tier 8) is **the intended gradient**, not a defect. Do not "fix" it.
- **Tiers 6–8 pricing squads at 109–124% of their wage budget** is *consistent* with "held up by
  investment" — a bottom-tier club spending beyond its own means is the mechanic, not a bug.
  ⚠️ **But it must be AUTHORED pressure.** Today it is convexity on a narrow band (A10 §3.3), so it
  is emergent and cannot be dialled. Fix the bands; then author the squeeze where it can be tuned.

### 🔴 What this turns into a CONTRADICTION

**The top of the pyramid is not comfortable, and the design says it should be.** A12 measured a
tier-1 club's wage bill plus upkeep sitting **within a few percent of its income** — any reduction
at all flips the whole division (0 flips at a 55% wage share, 16 at 60%).

**If income is meant to concentrate at the top, a tier-1 club living hand-to-mouth is the gradient
inverted at its own apex.** This was already logged as a fragility; **against the stated design it
is a defect.** It moves up the list accordingly, and it is one of the two open items only the owner
can settle.

### 🔴 THE PRECISE GAP — plot population reaches the land flow but never reaches the fan base

Traced 2026-11-19. **Both halves exist; the wire between them does not.**

| | |
|---|---|
| plot carries population | ✅ `useLandFlow.ts:329` — `population`, `landPence`, `plotCount`, `capacity.plots` |
| NPC clubs carry a city size | ✅ `world.ts:238` `citySize: BIG/MEDIUM/SMALL`, "derived from population rank" |
| city size affects something | ✅ but only a *surrounds score* (`clubSurrounds.ts:62`) |
| **fan base is driven by…** | 🔴 **TIER.** `fanStore.ts:112` picks from `starterConfig.fanBaseRanges` keyed on tier, ± promotion/relegation |

### ⚠️ CORRECTED 2026-11-19 — the plot caps NEITHER, and the architecture is already right

An earlier draft of this section said *"a bigger plot buys more stadium CAPACITY but not more
FANS."* **The first half is wrong**, and the owner's suspicion that the implementation mistakenly
targeted stadium capacity is **not borne out by the code.** Traced in full:

```
calculateEffectiveCapacity(templates, levels, conditions, constructions)   // matchdayIncome.ts:53
  → sums the LEVELS of every `*_stand` facility. No plot term anywhere.
```

**`plotCount` appears only in land browsing and filtering** (`landFilters.ts`, `useLandFlow.ts`,
`newGameSetup`). The `plots` in `components/facility-sprites/*` are **sprite layout rectangles** and
have nothing to do with land. **Nothing anywhere lets a plot limit how big a stadium can be.**

**And the demand ceiling the owner wants already exists**, in `calculateAttendanceCount`
(`matchdayIncome.ts`):

```ts
const uncapped = Math.min(Math.round(capacity), Math.round(capacity * fill));
if (opts.fanCount === undefined) return uncapped;
return Math.min(uncapped, Math.max(0, Math.round(opts.fanCount)));   // ← the demand cap
```

So the shape is **exactly** the intended one: build any stadium you like; `fanCount` decides whether
you can fill it; over-build and you carry the upkeep on empty seats. `SeasonTransitionService:2513`
already applies the same idea to season tickets (`seatCap = min(capacity, expectedAttendance)`).

### 🔴 So the gap is ONE WIRE, not a redesign

`opts.fanCount` is fed from `fanStore`, which draws from **tier-based `fanBaseRanges`**
(`fanStore.ts:112`) — **not from the plot's population.** That single substitution is the whole
change:

| already built | missing |
|---|---|
| stadium size free of the plot ✅ | `population` → fan base ❌ |
| `fanCount` as a hard demand ceiling ✅ | an authored catchment→fans curve ❌ |
| empty seats still cost upkeep ✅ | |
| season tickets capped by demand ✅ | |

**The punishing player decision the owner describes — an expensive stadium in a small town — is
already enforced by the engine the moment `fanCount` reflects the plot.** Until then every club's
ceiling is its tier, so the decision has no teeth.

**This is a feature task, not a calibration one**, and it belongs after the correctness boundary —
but it should be briefed knowing both halves already exist and the work is the join, plus whatever
authored curve maps catchment to fans.

### Adjacent, now more important than it looked

The **£92.3M investor line** open investigation is no longer a curiosity: **investment propping up
the bottom of the pyramid is a core mechanic**, so the investor machinery is load-bearing for the
intended game and deserves a proper look rather than a note.

## 🟩 SCOPED (owner, 2026-11-19) — plot population drives the fan base. Sharing deferred.

> *"whatever plot is associated with whatever club is the population size that they are able to
> pull from, and that's it. It's as simple as that."*

**Phase 1, now:** one club, one plot, one population. Its catchment is that plot's population.
**Phase 2, explicitly deferred:** splitting a shared catchment between clubs in the same city —
*"you can have multiple teams in the Scottish League that are in Glasgow… population is 1 million,
so the potential fan base is split 50-50."*

### 🟢 The simple version is SAFE to ship, and here is why

Double-counting a shared city is **invisible to the engine**: every club computes its own
`fanCount` independently and **nothing aggregates fan bases across clubs**. Two Glasgow clubs each
claiming the full million costs nothing today, because no code ever sums them.

⚠️ **The condition to watch:** if anything is ever built that *does* aggregate — a national
attendance figure, a TV-audience model, a league-wide fan report — **phase 2 stops being optional**
on that day. Record it there rather than rediscovering it.

### 🔴 THE ONE DECISION THAT CANNOT BE DEFERRED — the conversion rate

**Population is a catchment, not a fan base.** A city of a million does not yield a million fans; a
big-city club might draw 50,000. **So there must be a reach factor, and it is not optional detail —
it is what preserves the pyramid.**

Without one, a tier-8 club on a 1,000,000 plot gets a 1,000,000 fan base and out-draws a tier-1
club in a small town — **the exact gradient inversion the owner's design is built to avoid.**

So the shape is:

```
fanCount  =  plot population  ×  reach(reputation or tier)
```

and **`reach()` is the authored dial.** ⚠️ Note it must interact with the *existing* `TIER_FILL`
term in `calculateAttendanceCount`, which already scales fill by reputation tier — **reach and fill
must not both encode "a small club draws fewer people" or the pyramid gets squared.** Decide which
owns it.

### 🟢 GOOD NEWS — the data already exists on both sides

| | |
|---|---|
| player's plot | ✅ `population` on the land row (`useLandFlow.ts:329`) |
| **NPC clubs** | ✅ **`NpcClub::$populationSize` is a real int** (`NpcClub.php:80`), with `citySize` derived alongside it |
| admin export | ✅ `populationSize` already present (`worldExport.ts:30`) |
| **app runtime** | 🔴 `WorldClub` carries only `citySize` (`world.ts:238`) — **the number is not published to the device** |

**So nothing needs generating.** The backend already holds a population figure per NPC club; it
simply is not in the world pack's club snapshot. ⚠️ **Population is a census fact, not money, so it
belongs in the pack** — consistent with the pack-is-a-census principle, and it would need a
`WORLD_PACK_VERSION` bump.

### The work, in order

1. **Publish `populationSize`** on the NPC club snapshot (backend, small, pack-version bump).
2. **Author `reach()`** — the owner's decision, and the only real design work here.
3. **Feed `fanCount` from population × reach** instead of `fanBaseRanges` (`fanStore.ts:112`),
   for the player's club and NPC clubs alike.
4. Phase 2 (shared catchments) only when something aggregates.

## 🟩 DECIDED (owner, 2026-11-19) — reuse `fanBaseRanges`, reinterpreted as a SHARE of catchment

> *"how big the fan base is in terms of what's pulled from that population and how it is impacted
> by the tier. We should be able to use the same existing mechanics, but allow for larger scaling."*

### The change is ONE UNIT, not a new system

`fanStore.ts:8` already holds exactly the right shape — tier-keyed, min/max, randomly drawn:

```ts
const DEFAULT_FAN_BASE_RANGES: Record<string, { min: number; max: number }> = {
  '1': { min: 50000, max: 200000 },   …   '8': { min: 100, max: 500 },
};
const fanCount = Math.floor(range.min + Math.random() * (range.max - range.min + 1));
```

**Reinterpret those numbers as a SHARE of the plot's population instead of an absolute headcount.**
Same config key, same tier keying, same admin field, same random draw. Only the unit changes, and
magnitude now comes from the catchment — which is the "larger scaling" the owner asked for.

```
fanCount = plot population × share(tier)      // share drawn from fanBaseRanges[tier]
```

### 🟢 And it does NOT double-count with `TIER_FILL` — they are different quantities on different axes

This was the trap flagged earlier; checking the code resolves it:

| | keyed on | answers |
|---|---|---|
| `fanBaseRanges[tier]` | **league tier** | how many people in the catchment **support** this club |
| `TIER_FILL[reputationTier]` | **reputation** (`Local`/`Regional`/`National`/`Elite`) | what share of them **turn up** on the day |

**Support and turnout are genuinely separate**, and they are already on separate axes — so
`TIER_FILL` stays exactly as it is (0.35 → 0.85), unchanged. ⚠️ **Do not fold one into the other**;
keeping them apart is what stops the pyramid being squared.

### 🔴 The one number still to author — how steeply the share falls by tier

⚠️ **It cannot be flat.** A flat share would give a tier-8 club in Glasgow the same proportion as a
tier-1 one — 50,000 fans at tier 8 — which inverts the gradient the whole design rests on.

**A starting ladder can be DERIVED from today's absolutes rather than invented**, which is the safe
way to introduce this: today's ranges span ~500:1 from tier 1 to tier 8, and plausible catchments
span perhaps 50:1, so the share ladder carries the remaining ~10:1.

| tier | today's absolute | implied share of catchment |
|---|---|---|
| 1 | 50,000 – 200,000 | ~5% – 20% |
| 8 | 100 – 500 | ~0.5% – 2.5% |

**Derived this way, a typical club lands near its current fan base on day one** — so the change
introduces the *mechanic* without immediately repricing every club, and the ladder can then be
tuned deliberately. ⚠️ **Verify the real population spread before fixing the ladder**; the 50:1
assumption above is an estimate, and `NpcClub::$populationSize` holds the real distribution.

### Still deferred, unchanged

Splitting a shared catchment between clubs in one city (the Glasgow case). Safe to defer because
nothing aggregates fan bases across clubs.

## A14 — fan base from catchment (owner: pick it up now; `new-game-save`)

> *"this work will mean retiring the existing fan base bands that come from the back-end system…
> NPC clubs are tied to plots and have associated population data as well… this is work that's
> relevant to the new game save branch in particular."*

### 🟢 VERIFIED — the data foundation is solid, and better than earlier notes said

`NpcClub` (2026-11-19):

```php
#[ORM\Index(name: 'idx_npc_club_land_plot', columns: ['land_plot_id'])]
#[ORM\UniqueConstraint(name: 'uniq_npc_club_land_plot', columns: ['land_plot_id'], …)]
private int $populationSize = 0;          // bigint
private CitySize $citySize = CitySize::MEDIUM;
```

- **Every NPC club is seated on a real `LandPlot`**, and the constraint is **UNIQUE** — no two NPC
  clubs share a plot. The docblock records why: a prior version counted plots without linking them,
  so a player could claim a plot the catalogue already reported as taken.
- **`region`, `citySize`, `populationSize` and `isCapital` are DERIVED from the linked location**,
  set at generation and re-synced by `app:npc-clubs:link-locations`. The docblock calls them *"a
  cache of the town's facts, not a second opinion about them"* — kept as columns precisely so a
  cached world pack can read them.

**So nothing needs generating or backfilling.** The population figure is real, maintained, and
already has a re-sync command.

### 🟨 This REFINES the deferred phase 2

The unique index means **the Glasgow case is not two clubs on one plot** — it cannot happen. It is
two clubs on *different plots in the same population centre*. So splitting a catchment is a
question about **towns/locations**, not plots, and would key off the location link rather than
`land_plot_id`. Still deferred; now correctly framed.

### 🔴 ONE DECISION — "retiring the bands" must not retire the DIAL

Retiring the **absolute headcounts** is right. ⚠️ **But do not retire the published key itself.**
`starterConfig.fanBaseRanges` is backend-authored and admin-editable; if the share ladder becomes a
hardcoded app constant, **a lever leaves the owner's hands** — directly against the standing
principle that *"we want these things to shift."*

**Keep the key, change its unit** (absolute headcount → share of catchment). Same admin field, same
tier keying, same draw. That is the minimal change and it preserves the dial.

### ⚠️ SEQUENCING — it moves the baseline the correctness boundary is measuring

`fanCount` caps attendance → matchday income → NPC budgets, COVERAGE, solvency. **Landing this
while A10 is uncommitted and Scotland is unresolved moves the baseline underneath both.**

**The mitigation is already in the design:** derive the share ladder from today's absolutes so a
typical club lands near its current fan base on day one. **Then the mechanic lands without
repricing the world, and the ladder is tuned deliberately afterwards.** ⚠️ **Require a measured
before/after fan-base and matchday-income delta as the deliverable** — if it is not near-inert,
say so before committing.

### The work, in order

1. **Backend** — publish `populationSize` on the NPC club snapshot. Census fact, not money, so it
   belongs in the pack; needs a `WORLD_PACK_VERSION` bump.
2. **App** — `fanStore.ts:112` feeds `fanCount` from `population × share(tier)` instead of the
   absolute range; `WorldClub` gains the number alongside `citySize`.
3. **The player's own club** — the plot's `population` from `useLandFlow`.
4. ⚠️ **`TIER_FILL` untouched.** Support and turnout stay separate.

**Blocked on repo contention, not on design:** A13 is on `new-game-save` now, and the backend half
needs A10 out of the way.

## 🟩 THE BAND LADDER (owner, 2026-11-19) — percentages as STARTING values, and where the trap is

> *"the bands go from being absolute numbers ranges to percentage ranges… these percentages act as
> sort of starting guiding values and can vary based on plot population size… tier 8 could be
> between 5 and 10%, and then you get to the higher scale and it's between 60 or 70%."*

### 🟢 The "starting value, then it evolves" model is already how this works

`fanStore` already carries `promotionIncrease: 0.10` and `relegationDecrease: 0.05`, and fan count
moves with sentiment and morale through the save. **So the share only ever sets season 1**, and the
save owns it from there — which is exactly CLAUDE.md's binding rule *"the backend owns the TEMPLATE;
a save owns what evolves inside it."* No new concept, and the ownership question is already settled.

### 🔴 THE TRAP — a share too high makes the whole mechanic INERT

The fan cap only does anything when it falls **below** what the ground would otherwise draw.
Attendance is `min(capacity, capacity × fill, fanCount)`, so with `capacityCalculation = 1250` and
four stands:

| stand level | capacity | × fill | **fanCount must be under this to bind** |
|---|---|---|---|
| 1 (Local, 0.35) | 5,000 | 1,750 | 1,750 |
| 5 (National, 0.70) | 25,000 | 17,500 | 17,500 |
| 10 (Elite, 0.85) | 50,000 | 42,500 | 42,500 |

**Maximum possible stadium is 50,000 seats.** So any fan base above ~42,500 can never constrain
anything, at any tier, ever.

### What the illustrative ladder produces

| population | tier 8 @ 5–10% | tier 1 @ 60–70% |
|---|---|---|
| 1,000,000 (Glasgow) | 50,000 – 100,000 | **600,000 – 700,000** |
| 100,000 | 5,000 – 10,000 | **60,000 – 70,000** |
| 20,000 (small town) | 1,000 – 2,000 ✅ | 12,000 – 14,000 |

🟢 **Tier 8 at 5–10% is well judged.** In a 20,000 town it gives 1,000–2,000 against a binding
threshold of 1,750 — it bites exactly where it should. In Glasgow it does not bind, which is
defensible: a lower-league big-city club plausibly has more latent support than its small ground
holds.

🔴 **Tier 1 at 60–70% is the problem, and it is the opposite of what the design wants.** It exceeds
42,500 for any population above ~65,000 — so at the top of the pyramid **the catchment stops
mattering entirely** and capacity alone decides. That undercuts the multi-club arc at precisely the
point the player has money to act on it: *earn → buy a bigger plot → bigger catchment* buys nothing
if every tier-1 fan base already exceeds the largest buildable stadium.

**For the plot to stay meaningful at the top, the tier-1 share must keep the cap binding for
modest populations.** `share × 100,000 < 42,500` → **under ~42%**. Something like **25–35%** keeps a
100,000-population tier-1 club demand-limited while a 1,000,000 one is capacity-limited — which is
the distinction worth having.

⚠️ **This is a ladder-shape finding, not a counter-proposal.** The owner's own caveat — *"100% of a
population of a city isn't going to all like a football team"* — points the same way. **The
authoring rule to carry: set each tier's share so the cap still binds at that tier's SMALLER
plausible populations.** A share that never binds is a dial with nothing on the other end.

### Also worth setting deliberately

**Today's tier-8 absolute is 100–500 fans.** The illustrative ladder gives 1,000–2,000 in a small
town — a **4–10× increase**. That is a real economic change, not a re-expression, so the
near-inert migration path recorded under A14 does **not** hold for this ladder. **Either accept the
uplift deliberately and measure it, or derive the ladder from today's absolutes first and tune
afterwards.** Do not let it arrive unnoticed.

## ⚠️ CORRECTION (2026-11-19) — 60–70% STANDS. The catchment is NOT irrelevant at the top.

**My "tier 1 at 60–70% makes the catchment stop mattering" argument was wrong**, and the owner's
counter is right on both counts. I had treated `fanCount` as *only* an attendance cap. It is also a
direct income driver, and that is live code, not design intent.

### 🟢 Shirt income is LINEAR in fan count, and it IS booked

`shirtSales.ts:111`:

```ts
grossPence = Math.round(fanCount * (morale / 100)) * price
```

and `SeasonTransitionService.ts:1534–1545` calls it and credits **"Season shirt sales"** to the
club's ledger. Not harness-only — I checked, having assumed otherwise.

**So the share choice is worth real money even where the attendance cap never binds.** At the
tier-1 shirt price of £45 and morale 60:

| population | 60–70% | 25–35% |
|---|---|---|
| 1,000,000 | **£16,200,000 – £18,900,000** | £6,750,000 – £9,450,000 |
| 300,000 | £4,860,000 – £5,670,000 | £2,025,000 – £2,835,000 |
| 100,000 | £1,620,000 – £1,890,000 | £675,000 – £945,000 |

**At a million population the share choice is worth about £10,000,000 a season** — and 60–70%
puts shirt income on a par with the entire tier-1 TV deal (£18,750,000). Against £331,000,000 of
authored turnover that is ~5%, which is material without being absurd.

**So a bigger plot pays at the top through merchandise even when every seat is already sold.** The
multi-club arc holds. **60–70% stands.**

### 🔴 But ONE of the two mechanisms does not exist yet

> *"If the number of fans greatly outsizes the stadium capacity… it should increase the willingness
> of the fans to pay more for the tickets."*

**That feedback is not implemented.** Ticket elasticity runs on `r = price / advised` → attendance
(`k = 0.75`): pricing above advised costs you attendance **regardless of how much unmet demand
exists**. A club with 600,000 fans and a 50,000 ground is penalised for raising prices exactly as
hard as a club with 2,000 fans and the same ground.

⚠️ **So the half of the owner's reasoning that justifies a high share through PRICING is a feature
that still needs building**; the half that justifies it through SHIRTS is live today. **Record it as
the gap it is** — a demand-to-price-tolerance term, where excess demand over effective capacity
raises the price a club can charge without losing turnout.

### Noted, not opened

Raising a stadium's maximum level is backend-tunable (`FacilityTemplate.maxLevel`, admin CRUD, and
CLAUDE.md's binding rule says the app must never hardcode a cap). **Owner has explicitly deferred
it.** It would also move the 42,500 binding threshold, so revisit the ladder if it ever changes.

## 🅿️ PARKED (owner, 2026-11-19) — demand-driven ticket pricing, and the currency theme behind it

> *"Having the price be increased or capable of being increased based on population size and the
> number of fans and so on is extra functionality that we'll park for now, because there are other
> features around ticket pricing that I'd like to look into that could be governed off the plot as
> well. Because certain areas of the world would cost more regardless… when we start to look into
> currencies and things like that."*

**Parked deliberately, not forgotten.** Ticket pricing stays governed by tier
(`advisedTicketPricePence`, keyed on league tier and reputation). The demand-to-price-tolerance
term identified above is **not** a defect and should not be "fixed" in passing.

**Why parking it is the right call:** it would be the second of three overlapping changes to the
same function, and the third — regional pricing off the plot — is the one with the most design
weight. Doing them separately means pricing moves three times.

### ⚠️ ONE ARCHITECTURAL FLAG, so it is not a surprise later

**Currencies would not be a dial.** CLAUDE.md carries a BINDING rule — *"Money: the API speaks
pence; stores hold pounds"* — with a named exception list the rule itself calls *"the fragile part
of this rule, and it has already gone stale once"*. That rule is a **single-currency assumption
baked across both repositories**: every pence/pound boundary, every `penceToPounds()` call, every
authored economy figure, and the pack-is-a-census pricing chain.

⚠️ **QUALIFIED by the owner, same day — my warning above was overstated under their design.**

> *"The underlying economic values are always going to be stored in pounds, and we will use a
> currency conversion possibly on the device."*

**Storage stays single-currency; conversion is a presentation concern at the device edge.** On that
design the binding rule **survives intact** — nothing in the pence/pounds chain changes, and no
authored economy figure is restated. It is a display layer over a single stored truth, not a
re-denomination of the economy.

**It is also a shape this codebase already uses twice**, which is the reassuring part: potential is
0–100 in data with the 1–5 stars *"presentation only and deliberately lossy"*, and `player_rating`
is a perceived read over a stored truth. **Store the truth, convert at the edge** is an established
convention here, not a new risk.

### 🟢 The display boundary ALREADY EXISTS and is already currency-parameterised

> *"even the device stores everything in pounds and pence. The currency conversion would
> essentially be at the display layer, similar to translations."*

Measured 2026-11-19 — all four formatters in `src/utils/currency.ts` **already take a symbol**:

```ts
export const formatCurrency       = (pence: number, symbol: string = DEFAULT_CURRENCY_SYMBOL)
export const formatCurrencyWhole  = (pence: number, symbol: string = DEFAULT_CURRENCY_SYMBOL)
export const formatCurrencyCompact= (pence: number, symbol: string = DEFAULT_CURRENCY_SYMBOL)
export const formatCurrencyShort  = (pence: number, symbol: string = DEFAULT_CURRENCY_SYMBOL)
```

**247 call sites already route through them** (176 + 35 + 33 + 3). So the architecture the owner
describes is ~90% built: pence in storage, one boundary, symbol at the edge — the exact shape of
`t()` for strings.

⚠️ **The leak to audit, whenever this is picked up: 52 bare `toLocaleString()` calls.** Some are
dates and counts, but any that format MONEY bypass the boundary and would simply not convert —
precisely the failure the i18n rule exists to prevent for strings (*"never hardcode one inline"*).

**So the prep work, if ever wanted, is one audit and it is useful regardless of currency:** every
user-facing money value goes through `src/utils/currency.ts`. It would be enforced the same way
i18n is — a source-reading guard, as `pricingPaneHomeGames.test.ts` does for home games. **Small,
and it pays for itself even if currencies never ship.**

**So: a separate project, deferred by the owner, and NOT an architectural threat to the money
rule** — provided the "always stored in pounds" half holds. ⚠️ **That is the condition to watch.**
The moment a converted value is persisted rather than displayed, the binding rule's fragile
exception list is back in play.

**Regional pricing WITHOUT currencies is a smaller, separable step** — a plot-derived multiplier on
`advisedTicketPricePence`, in the same units — and is probably the right first move if the theme is
picked up before currencies are settled.

## 🅿️ POST-SETTLE — the consolidated parked list

**An INDEX, not a second copy.** Each item points at the section holding its detail; amend there,
not here. Added 2026-11-19 because the parked work had grown past the point where it could be
remembered.

**"Post-settle" means after BOTH:** the eight-item correctness boundary (see **SEQUENCING
DECISION**) *and* the multi-season testing that follows the freeze. ⚠️ **Nothing here is a defect.**
Each is a deliberate deferral, and an agent that "fixes" one mid-economy is moving a number the
owner is trying to measure.

### Ticket pricing — three overlapping changes to one function, deliberately batched

| | detail in |
|---|---|
| **Demand → price tolerance.** Excess demand over effective capacity should raise what fans will pay. Today elasticity is `r = price / advised` → attendance (`k = 0.75`) and ignores unmet demand entirely | **CORRECTION — 60–70% STANDS** |
| **Regional pricing off the plot.** *"certain areas of the world would cost more regardless"* — a plot-derived multiplier on `advisedTicketPricePence`, same units. **Separable from currency and the right first move** | **PARKED — demand-driven ticket pricing** |
| **Currency conversion.** Display-layer only; pence stays the stored truth, as translations are to strings | same |

⚠️ **Order matters**: pricing moves three times if these land separately. The owner's note that
they overlap is the reason they are batched here.

### Currency and translations — both partly built, both knowingly incomplete

> *"we don't want to throw in currency conversion on top of an already unstable ground… similar
> with the translation system. The translation system is partly implemented, and I know that there's
> gaps in there, but we can worry about that post-settle."*

- **Currency: ~90% built already.** All four formatters in `src/utils/currency.ts` take a symbol and
  247 call sites route through them. **The gap is 52 bare `toLocaleString()` calls** that bypass the
  boundary. ⚠️ **That audit is worth doing even if currencies never ship** — a money value skipping
  the formatter is a formatting inconsistency today. Detail: **PARKED**, "display boundary ALREADY
  EXISTS".
- **Translations: known gaps, owner-acknowledged.** Enforced by CLAUDE.md's binding rule and
  `scripts/i18n/audit-tokens.ts`. **Treat holes as gaps, not defects.**

### Fan base — the deferred half

**Shared catchments.** Two clubs in one town splitting a population (the Glasgow case). Safe to
defer because **nothing aggregates fan bases across clubs** — and `uniq_npc_club_land_plot` means it
is a *town/location* question, never two clubs on one plot. ⚠️ **It stops being optional the day
anything aggregates** — a national attendance figure, a TV-audience model, a league-wide fan report.
Detail: **SCOPED — plot population drives the fan base**.

### Facilities and capacity

**Raising a stadium's maximum level.** Backend-tunable (`FacilityTemplate.maxLevel`, admin CRUD).
⚠️ **It moves the 42,500 fan-cap binding threshold**, so the share ladder wants revisiting if it
changes. Detail: **CORRECTION — 60–70% STANDS**.

### Backend gate

**Check 6 (`EconomyWageTableCommand:550`/`:551`).** A7 deliberately left it: resolving its reads
would silently convert what it asserts into a check on whether `tv_pool_pence` is country-scaled.
Arguably better, but a change to an existing check's meaning. **Scope it; do not let an agent take
it in passing.** Detail: **CORRECTION — the gate had TWO stale `tv_deal` reads**.

### Mechanics never built (the old §5 list)

Expected-value prize money · weekly shirt accrual · a `club_shop` effect that earns nothing (⚠️
**confirm this is not just `nonMatchFacilityIncomePercent = 0`** — see **INCOME LEVERS**) · a fan
base that responds to form · shirt elasticity · splitting `seasonTicketHolderPercent` · a
cost-of-sales ledger category. **New mechanics, not calibration** — after the economy is calibrated,
not during.

### Watch during multi-season testing rather than chasing now

The **£92.3M investor line** (⚠️ raised in importance: investment propping up the bottom of the
pyramid is a core mechanic) · **`seasonTicketHolderPercent` 70 against 613 sold** · the
**`seededRng` identity bias**. None justifies a task; long runs reproduce or retire all three.

---

### ⚠️ NOT post-settle — these are before the boundary, and must not drift into this list

**A14** (fan base from catchment — owner: *"we may as well pick it up"*) · **A11** (Scotland
12-vs-14) · **A9** (publish the authored division size) · **`GameLoop:1520`** · **the tier-1
solvency knife edge** · **the R1 ability bands** (the tier 6–8 overshoot is a *fix*, not a tune) ·
**the two test files poisoning the shared `game_config` row**.

## 📍 NEXT WORK — the plan as of 2026-11-19 18:40

### 🔴 THE BLOCKER NOBODY HAS SCHEDULED: A15 must land before A10 deploys

**A10 is committed and cannot safely ship on its own.** It changed what σ is computed over, and the
app's economy harness keeps **its own copy** of the reference squad
(`src/economy/harness/loadExport.ts`, `referenceSquad()`), plus an invariant asserting
`wageScaleMicroPence × SUM(ability^k) / turnoverPence` is the constant **9782.608696** at all eight
tiers. A10 measured that σ_old/σ_new now runs **3.18–4.66**, so that constant is no longer constant.

**Deploy A10 without fixing the harness and the app's economy gate goes red** — on a correct change.
A10 found it, reported it, and correctly did not cross repos.

> **A15 — app harness mirror.** App-only. Update `referenceSquad()` to match the backend's new
> expected-ability squad, and replace the invariant with one that still holds. ⚠️ **The comment
> "matching the backend's reference squad" is currently FALSE** — that is the tell.

### The critical path to the correctness boundary

| # | step | repo | state |
|---|---|---|---|
| 1 | **A15** — harness mirror | app | **not started — blocks step 2** |
| 2 | **Deploy A10 + A13** to dev | both | blocked by 1 |
| 3 | **Device verification** of the new wage scale on a fresh save | — | owner |
| 4 | **A14 backend half** — publish `populationSize` + the share-ladder key | backend | brief not written |
| 5 | **A9** — publish the authored division size | backend + app | queued |
| 6 | **Freeze → multi-season testing** | — | after 1–5 and the decisions below |

### 🟡 Small and independent — can fill any gap

> **A16 — the test polluters.** Backend, ~20 lines. `EconomyAuthoredSizeDriftTest:156` and
> `EconomyTvCountryScalingGuardTest:113` write `38_866_153_952` into the shared `game_config` row
> and never restore it, so `LegacyNewGameFlowTest` now fails in **every** full run. ⚠️ **The fix
> belongs in the polluters, not the reader** — the reader asserts a real invariant. Until it lands,
> every agent judges the suite against a baseline that is wrong by one.

### 🔴 Blocked on the OWNER, not on engineering

| | |
|---|---|
| **Scotland 12 vs 14** | A11 is diagnosing. **The decision is yours either way** — and `app:country:check SC` on the box still settles it fastest |
| **`GameLoop:1520`** | measured by A12: **16/16 EN and 14/14 SC tier-1 verdicts flip**, two Scottish clubs `healthy → folded` |
| **The tier-1 knife edge** | zero flips at a 55% wage share, all of them at 60%. ⚠️ **Against THE INTENDED GAME this is a defect, not a fragility** — the apex of the pyramid should not be marginal |
| **The R1 ability bands** | the tier 6–8 overshoot (109/114/124%) is band narrowness. A *fix*, not a tune |

### Why this order

**A15 before everything** because it is the only thing standing between a finished change and a
deployable one, and because a red gate on a correct change costs more to diagnose later than to
prevent now.

**A9 after A14's backend half**, not before: both add a published field, and `FALLBACK_DIVISION_SIZE`
now has **five** consumers (`PricingPane`, `new-game-setup/economy`, `SeasonTransitionService` ×2,
`SeasonBudgetService`). One payload change and one deploy beats two.

**The owner decisions do not block steps 1–2**, so they can be taken while A15 runs.

## 🟩 DECIDED (owner, 2026-11-19) — `GameLoop:1520` BUNDLES with the tier-1 knife edge

**Not corrected alone.** The two become one piece of work, and the knife-edge decision gates both.

**Why, in one line:** A12 proved the home-game count is not the cause — **zero verdict flips at a
55% wage share, all sixteen at 60%** — so correcting `GameLoop` would not create the problem, it
would **reveal** one, in a world that is about to change underneath it.

**What correcting it alone would have done:** 16/16 English and 14/14 Scottish tier-1 verdicts flip,
several to crisis, two Scottish clubs to `folded`. ⚠️ **`folded` is NOT terminal** —
`NpcRescueService` fires: *"new chairman, investor, debt cleared"*, the rescuer takes a stake, and
the club is *"punished for the season it was insolvent and then rescued."* **That is the owner's own
"held up by investment" mechanic — firing at TIER 1**, which is the gradient inverted at its apex.

**The asymmetry accepted in the meantime**, documented at both sites and in `.context`: the NPC
budget counts real fixtures (15/11) while the solvency verdict still assumes 23, so a brain reads an
optimistic runway against a corrected wage allowance. **Strictly the safer direction** — a brain
selling on an optimistic runway sells *less*, not more.

---

## 🔴 NOW THE LIVE DECISION — the tier-1 knife edge

**A12's sweep, flips vs the modelled wage share:**

```
EN t1   40%:0  50%:0  55%:0  60%:16  65%:11  70%:8
SC t1   40%:0  50%:0  55%:0  60%:14  65%:14  70%:1
EN t8   40%:0  50%:0  55%:0  60%:0   65%:0   70%:0
SC t8   40%:1  50%:3  55%:4  60%:4   65%:7   70%:7
```

### The mechanism — it is a DISCONTINUITY, not a calibration

`weeksRunway` is balance ÷ weekly deficit. **Above break-even there is no deficit**, so runway
returns its **52-week cap** and the band reads `healthy` regardless of how thin the margin is.
**One pound below break-even it collapses to single digits.** A club £1 either side of the line
reads 52 weeks or 8.

**So the verdict has a cliff exactly at break-even** — and tier 1 happens to sit on it, with a
modelled wage bill plus upkeep within a few percent of income.

### 🔴 Why this is structurally wrong for THIS game specifically

**The owner's design deliberately puts clubs near break-even** — *"the further down you get, the
harder it is to remain solvent… the very bottom is held up by investment."* **A solvency measure
that cliffs at break-even is therefore wrong wherever the design is working as intended.** SC t8
already shows it: 4 flips at 60%, 7 at 70%.

**This is not a tier-1 problem. Tier 1 is just where it was noticed.**

### The two candidate fixes

| | | |
|---|---|---|
| **(i) Calibration** | give tier-1 clubs margin — raise turnover, or lower the wage-to-turnover ratio | ⚠️ **moves the symptom, not the cliff.** The cliff still bites wherever a club sits near the line, which the design *requires* at the bottom |
| **(ii) Model** | make the verdict degrade smoothly — runway that accounts for margin size rather than only its sign | **fixes it everywhere**, and is the one consistent with the intended game |

**(ii) is the recommendation**, with (i) available afterwards as a deliberate dial if the top of the
pyramid should also be more comfortable. ⚠️ **Do not do (i) alone** — it would make tier 1 read
healthy while leaving the same trap armed at every tier the design wants under pressure.

⚠️ **Stated limit on all of the above:** A12's wage bill is **modelled** at 60% of authored turnover,
since no world export carries NPC squads. Right ballpark, but a model — which is why it gave a sweep
rather than a single number. **A10's wage change will move these figures**, so re-measure after it
deploys rather than deciding the exact threshold from this table.

## ✅ A11 ANSWERED — (C), measured. And my framing sent three sessions into the wrong subsystem.

**It was never "Scotland lost 2 clubs."** It was a **full NPC-club regeneration at an
operator-typed count**, twice. `NpcClubGenerationService::generateClubs(count, tier, country,
deleteExisting: true)` deletes every row for a (country, tier), creates exactly the count given,
and **never reads or writes `league.slots`**. Its only callers are the admin generate form and
`app:country:bootstrap` — both operator-driven, neither linked to the authored size, no warning
when they disagree.

### The evidence nobody had: there are FIVE world exports, not one

Everyone triangulated from the 11-19 file alone. Counted directly across all five (verified by the
PM, 2026-11-19):

```
11-12 12:38   total 3167   SC [18,18,18,17,0,0,0,0]   EN [18×7,17]
11-15 20:47   total 3183   SC [18,18,18,17,0,0,0,0]   EN [20×7,19]
11-18 21:48   total 3175   SC [12×7,11]               EN [16×7,15]
11-18 22:00   total 3191   SC [14×7,13]               EN [16×7,15]   ← +16 in TWELVE minutes
11-19 14:15   total 3175   SC [12×7,11]               EN [16×7,15]
```

**Scotland went 12 → 14 → 12, and England 18 → 20 → 16, across routine operator regenerations.**
A11's club-NAME diff: **kept = 0 in all sixteen EN+SC divisions** — every English club was replaced
too, at an unchanged count, which is why England moving went unnoticed. Only EN and SC appear on
either side; the other 23 countries are untouched.

### 🔴 TWO CORRECTIONS TO THIS PLAN, both mine, both load-bearing

1. **"The owner rebuilt the worldpack caches in that window" is TRUE AND A RED HERRING.**
   **No worldpack path touches `npc_club`.** A11 traced the orchestrator, both message handlers,
   the assembly service, `WorldPackCacheService`, `WorldPackSetTopUpService`,
   `app:worldpack:warm`, `app:worldpack:maintain` and `StarterPackPoolWarmService` — every raw
   statement hits `world_pack_*` / `country_world_pack_cache` only. **I asserted the timing
   coincidence as the leading hypothesis and propagated it to three sessions.**

2. **(A) "the export is lossy" was ARITHMETICALLY IMPOSSIBLE, not merely unlikely.** The export
   uses `npcClubRepository->findAll()` — no join, no filter, no cap — and serialises each club's own
   `country`/`tier` columns. So export-count ≥ joined-count **always**, and a joined 14 against an
   unjoined 12 cannot happen. ⚠️ **`app:country:check SC` was NEVER a discriminator** — it groups on
   the same columns with no join. **I recommended it to the owner three times.** The PACK is the one
   that can under-count (`findByLeagueWithLand` is `league_id` only) and it did not fire here
   (pack 95 = export 95).

### 🔴 THE REAL DEFECT — two operator inputs, nothing connecting them

`league.slots` is authored in one place; the generator's count is typed in another. **Nothing
reconciles them, and nothing warns.** The £86,600,000/season mis-division is simply what happens
when the two drift — and they will drift again on the next regeneration.

**A11's proposal, NOT made:** `generateClubs` warns when the resulting count disagrees with an
authored `slots` where the league has a pool — at the point of regeneration rather than only at the
gate, **reusing `EconomyWageTableCommand::checkAuthoredSizeAgainstRows()` or
`Version20261119120000::CORRECT_SQL`** (A7's note forbids a third implementation). Plus three
columns in `CheckCountryContentCommand`'s NPC table: slots / unjoined / joined. ⚠️ Deliberately
**not** a new app CHECKS line — check 9 and the pack comparison already cover the relationship,
A13 is trimming that output, and the missing instrument is backend-side.

### 🔴🔴 THE RESERVED PLACE IS UNENFORCED — sixth appearance of this rule today, first as a risk

The deepest tier holding one fewer club reconciles perfectly in every era — **but NO CODE PRODUCES
IT.** `generateClubs` persists exactly `$count`; `BootstrapCountryCommand` passes a flat
`--clubs-per-tier` to every tier; the admin form is a free-text count. Nothing deletes or converts
an `npc_club` when a player's club is created. **The operator types N−1 at the bottom tier, by
hand, every time.**

`LeagueSizeResolver` and `AUTHOR_SQL` both **compensate for a reservation that nothing creates.**
⚠️ **If an operator ever types the same count at the deepest tier, every size calculation in the
economy is off by one** — silently, and in the direction that over-fills a division.

### Still the owner's, unchanged

**Scotland at 12 or 14.** Now cleanly framed: it is not a diagnosis question, it is *what count do
you want*, authored in `slots` **and** typed into the generator — which today are two unconnected
inputs.

## 🟩 OWNER DIRECTION (2026-11-19) — one projection, shared by the player and every NPC decision

> *"I'm not too worried about the solvency and the cliff edge for the tier one clubs. It's more
> important that we focus on fixes like the runway guide, which seem to be reporting incorrectly or
> only reporting when teams were literally at a cliff edge… if we're using the same projection
> mechanic for displaying estimated balance in, say, 52 weeks as the user sees, the same projections
> need to be used for the NPC clubs as well as the NPC staff on the user's game, so that the
> decision making is mirrored."*

**This supersedes the "two candidate fixes" framing above.** The knife edge is not a model to
design — it is **a model that already exists and is not being used.**

### 🔴 THERE ARE FOUR RUNWAY IMPLEMENTATIONS. The player sees the good one.

| | where | shape |
|---|---|---|
| ✅ | **`buildProjection`** (`FinancialProjectionService`), **11 callers**, all player-facing or AMP | projects **balance at each horizon** — 1, 4, 12, 52 weeks — including season-end lumps (`seasonEndIncome`, `extraSeasonsIncome`, `perSeasonRecurringLump`) |
| 🔴 | `npcSolvency.ts` — `weeksRunway` / `solvencyBand`, **the NPC brain's verdict** | `balance ÷ weekly deficit`, `: 52` when there is no deficit |
| 🔴 | `npcClubDebugAssessment.ts:77` | hand-rolled copy of the same formula |
| 🔴 | `npcTransferExecutors.ts:177` | a **fourth** inline copy, deciding whether a club sells |

**All three NPC copies share `netOutflow > 0 ? floor(balance / netOutflow) : 52`.** That ternary
**is** the cliff — replicated by hand in three places. ⚠️ `npcClubDebugAssessment`'s own comment
records that this duplication has **already produced a bug**: it *"overstated `weeksRunway` on this
screen."*

### 🟢 Why this makes the knife edge a side effect rather than a project

`buildProjection` **has no cliff.** It computes a balance at each horizon, so a club £1 above
break-even and one £1 below produce almost identical projections — smoothly different, as they
should be. It also counts **season-end lumps** that `weeksRunway` ignores entirely, which is why the
NPC verdict is both cliff-edged *and* pessimistic: a club with prize money and TV landing in six
weeks reads as nearly insolvent today.

**So adopting the player's projection for NPC decisions fixes the cliff, fixes the pessimism, and
mirrors the decision-making — in one change.** That is the owner's instruction and the project's
governing principle (*one source for one quantity*) arriving at the same answer.

### ⚠️ The implementation constraint, which is the whole difficulty

`buildProjection` reads **ten Zustand stores** and filters the fixture list for **one** club —
`BalanceScreen`'s own comment says so, and memoises it. **It cannot be called ~1,100 times a tick.**

**So the work is to extract a pure core** — the horizon arithmetic, fed a club's figures — and have
the player's chart and all three NPC paths call *that*. ⚠️ **Not to point NPC code at
`buildProjection` as it stands**, and ⚠️ **not to leave a fourth copy behind.**

### Calibration is explicitly NOT the fix here

> *"if it means that we have to increase the value of sponsors or increase the size of the TV deal…
> maybe it means bringing players' salaries down at the very top by 10-20%… we will tune it to match
> that."*

**Tuning is accepted as the eventual answer for the LEVELS**, and comes after the correctness
boundary. ⚠️ **But it is not the answer for the cliff**, and the owner has set the priority
explicitly: **accuracy of the projection first.** An agent must not propose a dial here.

## 🔴 A14 CLOSED — and it INVALIDATES the baseline this plan reasoned from

**App, `new-game-save`, commit `0964fedc`, not pushed.** `fanCount` is now
`catchment × share(tier)` behind a new `fanBaseSharePercent` key with a **byte-identical fallback**;
646 suites / 10,767 green, `tsc` clean, economy gate byte-identical.

### The error, verified by the PM

**Every fan-base figure in the sections above came from `DEFAULT_FAN_BASE_RANGES` — the app's
pre-sync FALLBACK constant — not from the published config.** The live values are **14–100× larger**:

| tier | **LIVE published** | app fallback (what we used) |
|---|---|---|
| 1 | **700,000 – 1,500,000** | 50,000 – 200,000 |
| 8 | **10,000 – 20,000** | 100 – 500 |

Unchanged since before R2, so not recent drift. **The source was `game-mechanics.md` §8**, which
quoted the fallback as if it were shipped; the plan and then the brief repeated it. **A14 corrected
`.context` in place.**

⚠️ **THE RULE TO CARRY: read a published value from an export, never from the fallback constant that
shares its name.** This is the second time today a figure was taken from the wrong source of the
same name — the first was "~31 failures", which was the gate's check count.

### 🔴 Three consequences, all material

1. **The owner's ladder is a REDUCTION at every tier, not an uplift.** At each England tier's own
   median club population it is **×0.04 to ×0.21**. A median tier-1 club: **1,100,000 → 73,954
   fans**, and season shirt income **£29.7M → £2.0M**. The plan predicted a 4–10× *rise* at tier 8;
   measured is **×0.21**.
2. **"60–70% STANDS" was argued against the wrong baseline.** It reasoned that 60–70% of a million
   yields £16–19M of shirt income and is therefore worth keeping. True — **but the live config
   already pays £29.7M there**, so the ladder *cuts* top-tier shirt income by about **£27.7M a
   season**. ⚠️ **The conclusion may still be right; the reason given for it is not.**
3. 🟢 **The surviving argument, and it is the strongest one — independent of shirt money.** The
   largest buildable ground is 50,000 seats and an Elite club fills 0.85 of it, so **anything above
   42,500 fans cannot constrain attendance at any tier, ever.** Live tier 1 is 700,000–1,500,000 —
   **26–35× that ceiling.** So **the demand ceiling the owner designed is dead code above roughly
   tier 6 today. The ladder is what switches it on.**

### 🔴 THE DECISION THIS RE-OPENS

The ladder was chosen believing it was roughly neutral. **It is a large reduction.** The question is
now explicit: **should a tier-1 club have ~74,000 fans against a 50,000-seat ground, or
~1,100,000?** The first makes the catchment mechanic live and cuts shirt income ~93%; the second
keeps today's income and leaves the demand ceiling inert.

⚠️ **Nothing is blocked.** The app half is inert until a ladder is published, so the numbers can be
chosen deliberately before the backend half is written.

### 🔴 §5.2 — something DOES aggregate fan bases, and the plan's precondition was FALSE as written

`PeerBenchmarkService.getTierFanCountAverage(tier)` takes the **mean fan count across same-tier
clubs**, and it is live: `StaffConversationService.reviewDirectorOfFootball` judges the DOF below
standard whenever the club trails that mean.

🟢 **The shared-catchment deferral survives** — a *mean* never double-counts a city the way a
national *total* would, and A14 found **no sum of fan counts anywhere**.

🔴 **But the consequence of this change reaches it.** Today every club in a tier draws from one
band, so trailing the mean is near a coin flip. With catchment-driven fan bases the mean is set by
the division's big-town clubs, and **a small-town club trails it permanently — its DOF judged below
standard at every review, forever.** A review-threshold question (a share of the mean, a percentile,
or peers of comparable catchment), not a fan-base one. ⚠️ **It will present as "my DOF is always
angry" on the first device pass after a ladder is published.**

### 🟢 §5.3 — an independent decision already corroborates the tier-8 band

`new-game-setup/economy.ts` caps the setup screen's season-1 attendance at **`population × 0.04`** —
a flat 4% reach for a brand-new tier-8 club, live today. **An earlier, independent decision put a
new club's reach at 4% against the owner's 5–10%.** ⚠️ It will disagree with the tick once a ladder
is published (estimate 4% vs tick 5–10%) — the safe direction on the screen where real credit is
committed, but still drift on the parity `setupMatchesTick.test.ts` exists to protect. **Fix when
the backend half lands: the estimate reads the tier's own share.**

## 🔴 MEASURED — "keep today's numbers as percentages" is ARITHMETICALLY IMPOSSIBLE

> *"the bands become percentages of the population of those towns, so we keep today's numbers
> essentially in a sense… which could create scenarios where a club has a much smaller fan base
> than another team in the same tier, but that's the design, that's the way football works."*

**The design is right. The level cannot be preserved.** Measured from the 2026-11-19 export and
`starter-config.LIVE.json` (England):

| tier | median town | live fan range | **share that would preserve it** |
|---|---|---|---|
| 1 | 70,500 | 700,000 – 1,500,000 | **993% – 2,128%** |
| 2 | 58,600 | 500,000 – 700,000 | **853% – 1,195%** |
| 3 | 67,750 | 350,000 – 600,000 | **517% – 886%** |
| 4 | 69,600 | 250,000 – 400,000 | **359% – 575%** |
| 5 | 51,000 | 140,000 – 200,000 | **275% – 392%** |
| 6 | 41,138 | 60,000 – 100,000 | **146% – 243%** |
| 7 | 40,486 | 30,000 – 40,000 | 74% – 99% |
| 8 | 42,000 | 10,000 – 20,000 | 24% – 48% |

**Above tier 7, today's fan base exceeds the club's entire town — by up to 21×.** No percentage
ladder can reproduce it, because a share over 100% is not a share.

### 🔴 The real finding: median catchment is FLAT across tiers

**40,000 – 70,500 at every tier.** Plot assignment is not correlated with league position, so
today's steep tier ladder is doing **all** the work and catchment is doing **none**. That is
precisely the defect — a tier-1 club in a 17,000 town has the same 700,000 fans as one in a city of
nearly nine million.

### 🟢 Which is why the owner's design delivers exactly what they described

**Within tier 1 alone, catchments span 17,000 to 8,982,000 — a 528× range.** Under a share ladder,
tier-1 clubs would range from roughly **10,000 to 5,400,000 fans** at a 60% share. *"A club has a
much smaller fan base than another team in the same tier"* is not a side effect of this change — it
**is** the change, and nothing else produces it.

**The tier ladder still sets the general level** (because median catchment is flat); **catchment
sets the spread within a tier.** Both halves do the job they should.

### The ceiling that follows

The largest buildable ground is 50,000 seats and an Elite club fills 0.85 of it, so **42,500 fans is
the point above which attendance stops being demand-limited.** At a 60% share that is a catchment of
**~71,000** — so under this ladder, *only clubs in towns above ~71,000 can ever fill a maximum
stadium*, and the median tier-1 town (70,500) sits almost exactly on that line.

⚠️ **That is a remarkably well-placed threshold, and it is a coincidence, not a calibration.** It
should be checked deliberately rather than relied on.

### So the decision, restated with real numbers

**Not "74,000 or 1,100,000" — 1,100,000 is unreachable.** The question is the share, knowing:

- a **100%** tier-1 share gives the median club **70,500** fans (and A14 measured 73,954, which is
  the same answer)
- the owner's **60–70%** gives the median club **42,300 – 49,350** — straddling the 42,500 ceiling
- either way, a big-city tier-1 club still reaches millions and a small-town one gets thousands

⚠️ **Whatever is chosen, top-tier shirt income falls hard** — it is linear in fan count, so a median
tier-1 club goes from £29.7M to roughly £1.1M–£2.0M a season. **That is the price of the mechanic,
and it is now a known price rather than a surprise.** The owner has already said levels will be
tuned afterwards; sponsors, TV and shirt price are the dials for it.

## ⚠️ CORRECTION — "median catchment is flat across tiers" was a STATISTICAL ARTEFACT

**The owner is right: NPC club generation already ties plot size to tier.** My previous section used
the **median** on a heavily skewed distribution and concluded there was no correlation. There is a
strong one, visible in the **mean** and in the count of genuine cities:

| tier | n | **mean** | median | max | clubs > 200k |
|---|---|---|---|---|---|
| 1 | 16 | **797,612** | 70,500 | 8,982,000 | **5 / 16** |
| 2 | 16 | **687,948** | 58,600 | 8,982,000 | 2 / 16 |
| 3 | 16 | 102,477 | 67,750 | 685,000 | 1 / 16 |
| 4 | 16 | 148,106 | 69,600 | 1,149,000 | 2 / 16 |
| 5 | 16 | 58,846 | 51,000 | 258,000 | 1 / 16 |
| 6 | 16 | 47,518 | 41,138 | 164,000 | 0 / 16 |
| 7 | 16 | 46,427 | 40,486 | 147,373 | 0 / 16 |
| 8 | 15 | 42,070 | 42,000 | 91,000 | 0 / 15 |

**Mean catchment falls 19× from tier 1 to tier 8, and every club over 200,000 sits in tiers 1–5.**
The medians are flat because most clubs at every tier are in modest places — **the cities are the
tail, and the tail is what the top tiers have.**

⚠️ **The lesson, and it is the third source-of-truth error today: a median answers "what is typical",
not "is there a relationship". On a skewed distribution it will hide exactly the correlation you are
testing for.**

⚠️ **Also a vocabulary correction from the owner: a plot is not a "town".** Plots are towns *and*
cities — Manchester is a plot. Calling them towns is what made a 70,500 median look like the whole
story.

## 🟢 So "we keep today's numbers essentially" is TRUE — for the clubs that justify them

At a **65%** share, per club rather than per tier:

| tier | today (uniform band) | smallest club | mean club | largest club |
|---|---|---|---|---|
| 1 | 700k – 1,500k | **11,050** | 518,448 | **5,838,300** |
| 2 | 500k – 700k | 14,300 | 447,166 | 5,838,300 |
| 3 | 350k – 600k | 8,125 | 66,610 | 445,250 |
| 4 | 250k – 400k | 13,650 | 96,269 | 746,850 |
| 5 | 140k – 200k | 10,140 | 38,250 | 167,700 |
| 8 | 10k – 20k | 10,140 | 27,345 | 59,150 |

**Tier 1's mean lands at 518,448 against today's 700k–1,500k — the same order of magnitude.** The
big-city clubs land *near or above* today's band; the small-town ones collapse from 700,000 to
11,050.

**That is not a side effect. It is the entire point.** Today a tier-1 club in a place of 17,000 has
the same 700,000 fans as one in a city of nearly nine million. The ladder is what tells them apart.

### What this changes about the decision

- **The level is broadly preserved where it was ever justified.** My earlier claim that top-tier
  shirt income collapses ~93% was computed from the median and is **wrong for the clubs that earn
  it** — a mean tier-1 club keeps roughly £14M of the £29.7M, and a big-city one *gains*.
- **The 42,500 demand ceiling now does real work across the pyramid**: mean tier-5 (38,250) and
  tier-8 (27,345) clubs sit below it and are genuinely demand-limited, while tier-1 cities are
  capacity-limited. **That is the pyramid the owner described, falling out of one ladder.**
- **60–70% looks well-judged on this evidence**, not generous — it was 100% that needed arguing
  against, and only because of a statistic I misread.

## 🔴 THE LADDER'S STEEPNESS — catchment already supplies a 19:1 gradient

**Owner confirmed tier 1 at 60–70%, same config shape as today (per-tier `{min,max}` ranges).**
Before the rest of the ladder is authored, one measured fact changes what the lower rungs should be.

```
catchment already falls   19:1 across the pyramid   (797,612 → 42,070 mean)
today's fan ladder falls  73:1
```

**So a steep share ladder applies the tier effect TWICE** — once through the catchments that
generation already assigns by tier, and again through the share.

| ladder | resulting spread | t1 mean | t8 mean | vs today |
|---|---|---|---|---|
| flat **65%** | **19:1** | 518,448 | 27,345 | t1 ×0.47, t8 ×1.82 |
| **60–70% → 15–20%** | **70:1** | 518,448 | 7,362 | t1 ×0.47, **t8 ×0.49** |
| **60–70% → 5–10%** (first proposal) | **164:1** | 518,448 | 3,155 | t1 ×0.47, t8 ×0.21 |

### 🟢 The recommendation: **60–70% at tier 1, 15–20% at tier 8**

**It reproduces today's pyramid shape almost exactly — 70:1 against 73:1** — while catchment
supplies the within-tier spread that is the point of the change. **Shape preserved, variation
added.**

⚠️ **5–10% at tier 8 is not wrong, but it is a deliberate steepening to 164:1 — 2.2× today's
pyramid.** That may be wanted; it should be chosen knowingly rather than inherited from a figure
picked before the catchment gradient was measured.

### The one thing no ladder fixes, and it is not a defect

**Every option lands at ×0.47 of today's level at tier 1**, because mean catchment × a sub-100%
share is simply smaller than today's authored band. **A share above 100% is meaningless**, so this
is the price of making fan bases catchment-plausible at all.

🟢 **It is a clean, uniform offset** — roughly halved across the pyramid on the 15–20% ladder (×0.47
at tier 1, ×0.49 at tier 8). ⚠️ **The dial for it is shirt price and sponsor value, not the share
ladder** — and the owner has already said levels get tuned after correctness. **Do not distort the
ladder to recover the level.**

### Config shape — unchanged, as the owner asked

```
fanBaseSharePercent: Record<tier, { min: number, max: number }>
```

Identical in form to `fanBaseRanges`, admin-editable per tier, drawn the same way. ⚠️ **A NEW key,
never a reinterpretation of the old one** — the app half (`0964fedc`) already falls back to
`fanBaseRanges` byte-identically when this key is absent, which is what makes the backend half
safe to land on its own.

## ✅ A15 CLOSED — the mirror is DELETED, not repaired. And it corrected the brief on four points.

**App, `new-game-save`, commit `c65bfa91`, not pushed.** `tsc` clean, **646 suites / 10,772 green**.
The harness no longer keeps a copy of the backend's reference squad at all: **the turnover wage is
derived from the authored budget.** **A10 is unblocked app-side.**

**§3's (a)/(b)/(c) were not exhaustive.** The right answer was a fourth option the PM did not
consider — *delete the duplicate rather than synchronise it*, which is the workstream's own
principle applied properly.

### 🔴 0.1 — the invariant acceptance test was WRONG, and the error came from A10 via the brief

The brief said a correct mirror makes the ratio *"constant at a new value"*. **σ cancels
algebraically:**

```
scale × σ / turnoverPence
  = (playerBudget × UNIT / (weeks × σ)) × σ / turnoverPence
  = UNIT × wageToTurnoverRatio × (1 − staffWageShare) / weeks
  = 1,000,000 × 0.60 × 0.75 / 46
  = 9782.608696
```

**A10 changed none of those four terms, so a correct mirror restores EXACTLY 9782.608696.** There
was never a new value to record. ⚠️ **A10's §0.2 predicted `9782.608696 × σ_old/σ_new` after
stating the correct formula two lines earlier; the brief inherited it and built an acceptance test
on it.** Both are wrong and are corrected here.

**Two consequences that matter more than the arithmetic:**

1. **The invariant is a DRIFT DETECTOR, not a derivation check.** It is flat iff the app's `Σ aᵏ`
   equals the σ that produced *that export's* scale — price the squad at `a^k × 1000` and it stays
   flat. **It could never have validated a mirror**; it could only notice two copies disagreeing,
   which is exactly what it did.
2. 🔴 **It therefore never proved `floor` over `round`** for the squad size, which `loadExport.ts`
   has claimed in a comment since it was written. **That reasoning needs re-establishing on other
   grounds, or retiring.**

### 🔴 0.3 — "the gate MUST move" was backwards

The gate reads an **export**, and every export that exists is **pre-A10** (A10 is committed, not
deployed). Against a pre-A10 export the app's figure is **already correct**, so a correct fix must
leave it **unchanged** — and it does, to within one penny at three tiers of eight.

**The 3.2–4.7× movement is what the fix PREVENTS.** A15 demonstrated it properly by projecting a
post-A10 export and running the gate four times:

| | projected post-A10 export |
|---|---|
| **without** the fix | **191–243% wage share — every tier insolvent in season 1** |
| **with** the fix | **byte-identical to the pre-A10 run** |

⚠️ **That is a stronger acceptance test than the brief's**, because it shows the figure is now
*invariant under exactly the backend change that broke it*. **Adopt this pattern for any future
app/backend mirror work.**

### The lesson, and it is the fourth of its kind today

**A10 stated the correct formula and then contradicted it in the next sentence; the PM propagated
the contradiction into a brief and made it an acceptance criterion.** Three agents have now caught
a PM error by checking rather than complying. ⚠️ **An acceptance test inherited from a report is
not evidence — derive it.**

## ✅ A18 CLOSED — ladder published. And the measurement exposes a problem the ladder cannot fix.

**Backend, `development`, commit `8298cc60`, not pushed.** `fanBaseSharePercent` published,
`fanBaseRanges` untouched and pinned by three tests, `app:economy:wage-table` byte-identical.

### 🟢 No pack bump, and none was needed — my brief was wrong

`populationSize` has been in `WorldPackSnapshotBuilder::buildClubSnapshot()` since that builder was
written — **verified against cached payloads at versions 8 and 9.** `WORLD_PACK_VERSION` stays at
**11**. ⚠️ **Bumping 11 → 12 as my brief demanded would have invalidated 107 cached tier payloads to
publish a field already there.** **No worldpack regeneration is needed before testing.**

⚠️ The app's `WorldClub::populationSize` docblock says otherwise and is wrong — flagged app-side.

### 🟢 Reproduced: the spread

**England 68.4:1 against today's 73.3:1** — the intended shape, and nowhere near the 164:1 that
would mean the rejected 5–10% variant. **The ladder in the code is the one the owner settled.**

### 🔴 NOT reproduced: my "×0.47–0.49 at every tier". Actual range ×0.06 to ×1.92.

```
England     tier  share%        mean fans   today mid   xtoday   >42.5k  (today)
               1  60-70           536,713   1,100,000     0.49    13/16    16/16
               2  49-59            34,352     600,000     0.06     6/16    16/16
               3  40-49           288,929     475,000     0.61     5/16    16/16
               4  33-41            18,766     325,000     0.06     2/16    16/16
               5  27-34            16,149     170,000     0.09     0/16    16/16
               6  22-29           153,714      80,000     1.92     1/16    16/16
               7  18-24             9,066      35,000     0.26     0/16     0/16
               8  15-20             7,850      15,000     0.52     0/15     0/15
```

**My error:** I computed the ×0.47 from *mean catchment per tier* and assumed those means formed a
smooth gradient. **They do not.** Mean catchment per tier is dominated by whichever few large cities
happen to sit in it, and that placement is effectively random — England tier 3 has a 3,996,990 plot,
tier 6 has 2,290,410. **My "catchment falls 19:1" was true of the endpoints and false of everything
between them.**

### 🔴 THE REAL FINDING — the resulting pyramid is NON-MONOTONIC

On these means, **tier 6 (153,714) would outdraw tier 2 (34,352), and tier 3 (288,929) would
outdraw everything below tier 1.** A tier-6 club with four times the support of a tier-2 club is not
a calibration artefact the ladder can absorb — **it is what happens when catchment is noisy rather
than graded, and the share ladder is monotonic over it.**

⚠️ **This is the owner's premise meeting its limit.** *"NPC clubs already have a tier structure
based on the plot sizes"* is true **across the pyramid as a whole** and **not reliably tier by
tier**. The 19:1 endpoint gradient is real; the rung-to-rung ordering is not.

### 🔴 Scotland collapses — ×0.01 to ×0.10, spread 51.6:1

```
Scotland    tier  mean fans   today mid   xtoday   >42.5k  (today)
               1     77,143   1,100,000     0.07     5/14    14/14
               2      5,980     600,000     0.01     0/14    14/14
               8      1,494      15,000     0.10     0/13     0/13
```

Scottish catchments are genuinely small, so **every Scottish division becomes demand-constrained** —
only 5 clubs in the country clear 42,500. **That may be exactly right for Scotland**, but it is a
far larger change than England's and it lands on the country the owner tests on.

### 🟢 The check that matters IS working

`>42.5k` falls from **16/16 at every England tier 1–6 today** to 13/6/5/2/0/1. **The demand ceiling
stops being dead code and starts binding** — which was the strongest argument for the whole change
and is now demonstrated rather than argued.

### 🔴 THE DECISION THIS FORCES

**Not the ladder — the ladder is right.** The question is whether plot assignment should grade by
tier reliably:

| | |
|---|---|
| **Accept it** | a big-city tier-6 club genuinely outdrawing a small-town tier-2 club is *realistic football*, and the owner has said as much. The pyramid's **income** gradient still holds through TV, prize money and sponsors; only **support** is noisy |
| **Tighten generation** | make plot assignment correlate with tier properly, so the rung ordering holds. **That is a generation change, not an economy one**, and nothing in this workstream has touched it |

⚠️ **Do not attempt to fix this by re-authoring the share ladder.** A ladder steep enough to
overcome a 4,000,000-person plot at tier 3 would flatten the top of the pyramid to nothing. **The
noise is in the catchments, not the shares.**

## 🟩 DECIDED (owner, 2026-11-19) — the noisy pyramid is ACCEPTED

**A big-city tier-6 club outdrawing a small-town tier-2 club is accepted as realistic**, and plot
assignment is **not** being changed to grade reliably by tier.

**Why it holds:** support is now noisy, but **income still grades properly** — TV, prize money and
sponsor bands are all authored per tier and untouched by this. A well-supported low-tier club is
rich in *gate and merchandise*, not in *distribution*, which is how real football behaves.

⚠️ **Standing consequence for anyone who meets this later:** a non-monotonic fan-base ladder is
**the expected state, not a defect.** Do not "fix" it by steepening `fanBaseSharePercent` — a ladder
steep enough to overcome a 4,000,000-person plot at tier 3 would flatten the top of the pyramid to
nothing. **The variance is in the catchments by design.**

⚠️ **Two things to watch on the first device pass**, both app-side and both already flagged by A14:
- **`PeerBenchmarkService`** judges a club against its tier's **mean** fan count. With noisy
  catchments a small-catchment club trails that mean **permanently**, so its DOF is judged below
  standard at every review. **This decision makes that certain rather than likely.**
- **Scotland is demand-constrained almost everywhere** — only 5 clubs in the country clear 42,500.
  That is the harshest instance of the accepted behaviour and it is the country being tested on.

## 🔴 DEVICE PASS 2026-11-19 20:26 — the new check reports OK on 7 of its 8 real failures

Fresh Scottish save, OTA published 19:57, pack version 11, backend migration applied.

### 🔴 THE FINDING — "slots —" is treated as OK, and it means *unknown*

The new DIVISION SIZE check flagged **SC t8 only**:

```
SC t1  slots — · clubs 12 · home games 11 · TV £21.4m   OK
...
SC t8  slots 14 · clubs 12 · home games 11 · TV £86k = pool/14   DISAGREE
```

**Every one of the eight tiers is dividing by 14 against 12 clubs.** Verified against the authored
pools:

| tier | shown | pool ÷ 14 | pool ÷ 12 | divisor in use |
|---|---|---|---|---|
| 1 | £21,400,000 | £21,428,571 | £25,000,000 | **14** |
| 4 | £3,600,000 | £3,571,429 | £4,166,667 | **14** |
| 8 | £86,000 | £85,714 | £100,000 | **14** |

**The full £86,600,000.36 per season is still unpaid, across all eight tiers.** The check catches
**one of eight** because the app only holds an authored `slots` for the AMP tier; elsewhere it
reads `—` and the check scores that as agreement.

⚠️ **This is a false PASS in the one instrument built to prevent exactly this defect**, and it is
more dangerous than having no check: a reader sees seven OKs and concludes seven tiers are sound.

**The fix is a third state, not a tighter comparison.** `slots` unknown is **UNKNOWN**, not OK —
and it should say which divisor the published `tvDeal` implies, since that is derivable without
`slots` at all: `pool ÷ tvDeal` gives 14 at every tier here, against 12 clubs, with no authored
value needed. ⚠️ **Queued as A19.** The same trap applies to any check comparing against a value
the device may not hold.

### 🟢 A10's wage scale landed, and the coverage check A10 specified is live

```
Resolved scale (AMP, tier 8): 464,260,823 micropence   (was 116,651,541 — ×3.98)
Tier 8 mean weekly wage:      8,088 pence              (was 1,899 — ×4.26)
```

**Coverage against the authored budget, which was the whole point:**

| tier | coverage |
|---|---|
| 1–5 | **97.3% – 100.2%** |
| 6 | 111.2% |
| 7 | 109.8% |
| 8 | **132.1%** (WARN) |

**That is 28–35% before this change.** The tier 6–8 overshoot is the band-narrowness effect A10
predicted (109/114/124% for England) and the owner has already accepted as the R1 ability-band
question — **not a new defect.**

⚠️ **The PM's estimate of "~£3 for a £1 player, mean ~4,500p" was low** — the real figures are ~£5
and 8,088p. The estimate came from the ×2.4 in the A10 brief; the measured scale moved ×3.98.

### 🟢 A12 confirmed live, with the path visible

```
NPC home games (tier 8): participants 12 · counted 11 · derived 11 · using 11 (COUNTED from fixtures)
```

**Counted and derived agree, and the counted path is the one in use** — exactly what A12 designed
and what its brief asked to be made visible.

### ⚠️ No FANBASE line — the share path is unverifiable on device

A18 specified one (its §3.3) and could not add it from the backend. **So we cannot tell from this
report whether `fanCount` is coming from the catchment or from the fallback band.** ⚠️ **It belongs
with A19** — both are app-side CHECKS work and both are about making a path visible rather than
inferring it.

### ⚠️ Boot and write costs rose — watch, do not chase

`seeds_done` 1,665ms → **3,091ms**; `players.upsertWithClubs` avg 940ms → **1,175ms** (worst
1,852ms); `players.upsertWithForeign` **1,274ms** (WARN). Squad counts also rose (2,124 → 2,159
players). **One sample, a different world, and the player count moved — not evidence of a
regression.** Worth a second reading before anyone investigates.

## A19 — the division-size check passes on seven of its eight real failures (app)

**Briefed: `a19-checks-false-pass-brief.md`. Queued behind A17.**

Three pieces, all app-side CHECKS work:

1. 🔴 **The false pass.** `slots` unknown is scored as OK, so the check flags 1 of 8 real
   failures. Needs a third state (UNKNOWN, not scored as a pass) **and** a divisor derived from
   `pool / tvDeal`, which needs no authored `slots` and answers the question at every tier.
2. **The FANBASE line** A18 specified and could not add from the backend — today there is no way to
   tell on device whether `fanCount` came from the catchment or the fallback band.
3. 🟡 **`REFERENCE_FAN_BASE_SHARE_PERCENT` is the rejected 5-10% variant** and fills any rung the
   published ladder omits. Latent, since the backend publishes all eight.

⚠️ **Not in scope: Scotland 12-vs-14 itself.** The check exists to make it visible; fixing it is the
owner's decision.

## 🔴 DEVICE PASS 2026-11-19 20:34 — the authored turnover table disagrees with the authored payouts by 46×

Aberdeen Victoria, SC tier 8, season 1, fresh save. **The coverage line A10 specified earned its
keep on its first run.**

### 🟢 FIRST — the catchment fan base is CONFIRMED LIVE

```
FANS  36,696
```

Aberdeen's catchment is ~200,000 and the tier-8 share is 15–20%, so **36,696 is the share path, not
the fallback band** (which would have given 10,000–20,000 flat). ⚠️ **This is also the
non-monotonic pyramid arriving as predicted and accepted**: a tier-8 club with 36,696 fans because
it sits in a real city.

### 🔴 THE FINDING — authored turnover £107,500 against £5,000,000 of authored prize money

```
INCOME — MODELLED vs AUTHORED
  sponsors /wk × 46                      £0
  matchday /wk × 46                      £220,491
  season-end lump (TV, prize, shirts)    £1,199,455
  = MODELLED season income               £1,419,946
  authored turnoverPence (tier)          £107,500
  COVERAGE modelled ÷ authored           1320.9%
```

**Verified against the authored data for SC tier 8:**

| authored figure | value | × the tier's turnover |
|---|---|---|
| **turnover** | **£107,500** | — |
| `prizeMoney` | **£5,000,000** | **46×** |
| `leaguePositionPot` | **£2,000,000** | **19×** |
| `tvDeal` | £85,714 | 0.8× |

**The league winner at Scottish tier 8 receives forty-six times the tier's entire authored annual
turnover.** The turnover table is what the wage scale is calibrated from; the payout ladder is what
the engine actually pays. **They are not the same economy.**

⚠️ **This is not new today.** Those payouts predate all of this month's work. **What is new is that
it is visible** — the coverage line found a months-old authoring inconsistency on its first device
run, which is the strongest possible argument for the standing "device data becomes a CHECK" rule.

### 🔴 AND IT MAKES A10's WAGE FIX MOOT FOR A REAL CLUB

```
anchored microPence      3,690,692,227
anchored ÷ authored      795%
```

**Income-anchored wages scale a club's pay to its own income.** The club's modelled income is 13×
its authored turnover, so anchoring pays **795% of the authored scale** — the tier-8 ladder reads
£33–£752 anchored against £26–£602 authored.

⚠️ **So A10 corrected the authored scale, and anchoring immediately overrides it.** The authored
figure is now right and is not what a real club pays. **This is one defect, not two: the authored
turnover is too low, and every consequence follows from that.**

🔴 **It also explains the CHECKS tab's 97–132% coverage reading differently from this screen.** That
check prices the *authored* budget; this one prices what the engine *pays*. Both are correct and
they measure different things — **and nothing reconciles them today.**

### ⚠️ Sponsor income is £0 — question, not conclusion

The device shows `sponsors /wk × 46 = £0` and `SPONSOR INCOME £0`, while the league carries
**`sponsorCount` 3**. Either no sponsor has been rolled for this club yet in season 1, or the
sponsor chain is not reaching an AMP club. **Worth one check before it is called anything.**

### 🟢 The budget machinery itself reads coherently

```
income (basis)        £1,419,946      maintenance    £398,303
wage share allowed    £851,967        surplus        £169,676
wage floor (committed) £158,943       over-committed no
COMMITTED ÷ income    39.2%           MAINTENANCE ÷ income  28.1%
```

**Not over-committed, positive surplus, maintenance under the ~40% bar.** The club is solvent and
the shares behave as designed — the numbers feeding them are the problem, not the arithmetic.

### What this does NOT change

⚠️ **Do not re-author anything in response to this.** The owner's standing rule is correctness
before calibration, and this is a calibration finding of exactly the kind that rule exists to
sequence. **It belongs with the R1 ability bands and the turnover review, after the correctness
boundary.**


---

## 🟢 NPC TIER-8 FINANCES — the catchment mechanic confirmed a second way

Two clubs, **same division, same season, same ticket price:**

| | season tickets | revenue | price each | wk income | wk wages | net |
|---|---|---|---|---|---|---|
| **Dalkeith** | **919** | £50,000 | £54.41 | £3,500 | £1,500 | **+£2,000** |
| **Prestwick** | **307** | £17,000 | £55.37 | £1,800 | £1,900 | **−£100** |

**A 3× difference in volume at an identical price — so it is fan base alone.** Dalkeith sits beside
Edinburgh; Prestwick is a small town. **Before today both would have drawn from the same tier-wide
band and sold roughly the same number.** This is the clearest confirmation the mechanic is live, and
it is on NPC clubs rather than the player's.

🟢 **It is also the intended pyramid behaving:** two clubs in one division with materially different
support, and the smaller one under real financial pressure.

### ⚠️ Prestwick is the knife-edge case, and the runway still reads 52+

Wages (£1,900) exceed weekly income (£1,800). **The runway is not wrong** — £54,200 against a
£100/week deficit is genuinely 542 weeks, capped at 52 — **but it is exactly the reading A17 is
fixing**: a club whose costs exceed its income displays as comfortably healthy, because the measure
divides by a deficit rather than projecting a balance. ⚠️ **It also excludes facility upkeep**,
which on the player's own club was the largest weekly line (−£9k against −£1k of player wages), so
the real position is worse than income minus wages.

**This is a good case to re-measure once A17 lands** — it is the cleanest live example of the
defect.

### ⚠️ The player's club has NO sponsor; both NPC clubs do

Dalkeith **£65/week**, Prestwick **£75/week**, one sponsor each. The AMP club shows
`SPONSOR INCOME £0` and `sponsors /wk × 46 = £0`. ⚠️ **Either the player is meant to find their own
sponsor, or the sponsor roll does not reach an AMP club.** **One check settles it; do not assume
either way.**

## 🔴 THE STRUCTURAL FINDING — half the economy is country-scaled and half is not

**The projection is not missing anything. The authored turnover is.**

```
prizeMoney / leaguePositionPot / tvPoolPence   IDENTICAL in EN, SC, KR, FR — every country
  tier 1   £100,000,000 / £100,000,000 / £300,000,000
  tier 8   £5,000,000   / £2,000,000   / £1,200,000

economyTierBaseline.turnoverPence              COUNTRY-SCALED
  EN tier 8  £215,000        SC tier 8  £107,500   (×0.5)
```

**One half of the economy carries a country factor and the other half does not.** That is not a
typo in one row — it is two authoring systems that were never reconciled.

### Why it has never been caught

**The gate's entire job is `modelled income ÷ authored turnover`, and it has only ever been pointed
at England.** A6 established that **no Scottish COVERAGE figure has ever existed** — the harness
refuses a country it has no resolved config for, and all three configs on this machine are
England's. **So the one instrument that measures this has never measured the country the owner
tests on.**

### What it does to the wage scale

```
authored turnover (SC t8)     £107,500
modelled season income        £1,419,946        COVERAGE 1320.9%
anchored ÷ authored scale     795%
```

The wage scale derives from turnover. **Income-anchored wages then scale pay to what the club
actually earns — so anchoring silently repairs the calibration at runtime.** A10 corrected the
authored scale this afternoon and **anchoring overrides it for every real club.**

🔴 **The deepest version of this:** the economy has been calibrated against a number that does not
describe the game, and **income-anchoring has been hiding that for as long as it has been on.** The
game plays acceptably; the calibration beneath it is meaningless. That is why the wage gap looked
like a wage problem for months.

### The three layers, in order

1. **The projection is correct.** The club really will earn ~£1.42M. Nothing on that screen is wrong.
2. **The authored turnover is wrong** — by 13× in Scotland, and by an unmeasured amount in England.
3. **The cause is structural** — payouts uncountry-scaled, turnover country-scaled — **not a bad row.**

### What follows, and what does not

⚠️ **Do not re-author anything yet.** This is a calibration finding and the owner's standing rule is
correctness first. But it reframes two queued items:

- **The turnover review** is no longer "are the numbers right" but **"should payouts carry the
  country factor, or should turnover drop it?"** — a design question with one correct answer per
  country, not a table of tuned figures.
- **Capturing a Scottish game-config** (A6's §7d, already flagged) stops being a convenience and
  becomes **the prerequisite for measuring any of this.** Until the gate can read Scotland, the
  country the owner tests on is unmeasured.

⚠️ **And it raises a question about England that nobody has asked:** England's COVERAGE reads ~97%
after R2, with a £5,000,000 tier-8 prize against £215,000 of authored turnover. **Either the gate's
modelled income does not count prize money the way the device does, or the two disagree there
too.** **That is checkable and should be checked before any re-authoring.**

## 🟩 OWNER FRAMING (2026-11-19) — the ladder's DEPTH is a country property, and the economy cannot express it

> *"Scotland is an example of a country that needs a smaller ladder as there are fewer large
> population cities. This is expected plan for the system. Giving us the potential to have tiers
> even larger than 10 for countries like USA. But the economy doesn't currently know how to scale
> the finances for smaller countries."*

**This supersedes "Scotland's turnover is wrong" as the frame.** It is not a bad row; the model has
no way to say what the owner wants to say.

### 🟢 What already exists — more than expected

**Per-country ladder depth is real.** `EconomyScaleResolver::tierCountFor($country)` reads
`CountryProfile::getLeagueTierCount()`, and `resolve()` clamps to it:

```php
$effectiveTier = max(1, min(min($tierCount, self::MAX_TIERS), $tier));
```

Its own docblock anticipates this exactly — *"Asking a 4-tier country for tier 7 is a caller bug"*
— and elsewhere refers to *"a shallow country at a low factor"*. **Scotland was in fact generated
with 4 tiers as recently as 2026-11-15** (world exports read `SC [18,18,18,17,0,0,0,0]`), so the
shape has been used.

### 🔴 THREE THINGS THAT BLOCK IT

**1. `MAX_TIERS = 8` is a hard cap.** USA at 12 tiers is blocked by one constant — tiers 9–12 would
all clamp onto row 8 and four divisions would share one set of economics.

**2. Truncation leaves a shallow country's bottom division far too rich.** The ladder is England's
eight rows scaled by a single factor. A 4-tier Scotland taking rows 1–4:

| | authored turnover |
|---|---|
| 4-tier Scotland's **bottom** division (row 4 × 0.5) | **£10,350,000** |
| today's 8-tier Scotland bottom (row 8 × 0.5) | £107,500 |

**A 4-tier country's lowest division would be authored at 96× what it is now.** The ladder must
**compress**, not truncate — and nothing today can express that.

**3. 🔴 A single multiplier moves the FLOOR as well as the CEILING, and that is the deeper error.**

```
England   £331,000,000 → £215,000     1540:1 over 7 rungs
Scotland  = England × 0.5, every rung
```

**A semi-professional club in Scotland does not cost half what a semi-professional club in England
costs.** Pitch upkeep, travel, part-time wages are roughly the same money. What differs is the
**ceiling** — the Scottish top flight is a fraction of the Premier League — **not the floor.**

**So the country factor should taper: strong at the top, weak or absent at the bottom.** One scalar
cannot say that, and today's £107,500 bottom tier is the floor having been dragged down with the
ceiling.

### 🔴 And payouts carry no country factor at all

`prizeMoney`, `leaguePositionPot` and `tvPoolPence` live on **league rows**, authored identically in
all 25 countries (£5,000,000 at every tier 8). **They are not in `GameConfig` or `StarterConfig` at
all**, so there is no ladder for them to scale with. That is the 46× mismatch already recorded —
**and under this framing it is the same defect, not a separate one.**

### What the model needs to express

Three independent country properties, where today there is one scalar and a fixed eight rows:

| | | today |
|---|---|---|
| **depth** | how many tiers | ✅ `leagueTierCount`, capped at 8 |
| **ceiling** | what the top tier is worth | ⚠️ conflated into `countryFactorBp` |
| **shape** | how value decays to the floor | 🔴 England's decay, truncated |

**And payouts derived from the same three**, rather than authored flat per league.

⚠️ **This is a design task, not a calibration one**, and it is larger than anything currently
queued. **It belongs after the correctness boundary** — but it reframes the turnover review from
*"tune these numbers"* to *"give the model the three knobs it needs"*, which is a different and
better question.

## Tranche D — owner decisions, not engineering

- ✅ ~~**The authored `slots` that disagree with the real club count**~~ — **RESOLVED 2026-11-19.**
  B3's correction migration landed and the fresh export confirms EN 16 and SC 14 at all eight tiers.
  What remains of this item is the genuine design question below, with the distortion removed:
- 🔴 **Division size, 16 vs 20 — and it now carries a TV consequence nobody authored.** EN and SC
  are authored with identical TV pools, so `tvDeal = pool ÷ slots` makes size a lever on per-club TV
  income: Scotland at 14 earns **+14.3%** against England at 16, at every tier. So this is no longer
  only a fixture-list and matchday question. **Decide whether a smaller division is meant to be
  richer per club**, and if not, differentiate the two pools instead and leave size free as a
  gameplay choice. Figures in the TV-income section above.
- ~~**Scotland's `slots = 3`**~~ — **WITHDRAWN 2026-11-19, nothing to decide.** The fresh export
  reads 14 at all eight Scottish tiers; the 3 was a stale development-clone artefact and was never
  true on the deployed box. See the deploy-confirmation section above.
- **The ability bands (R1).** Tier 6 → 10–20 and tier 8 → 4–9 is the only thing that brings tiers 6
  and 8 into the coverage band. It is a squad-quality change and it moves staff and scout pay
  through `TierBandScaleResolver`'s band midpoints. Decide it on its own merits, not to satisfy a
  coverage target.
- **Go-live prerequisites** (`REMAINING-WORK.md` §6): master/dev sync on both repos, the forced
  restart of all saves on the plot model, legacy-club credit tested end to end, pack-version
  hashing instead of the manual `WORLD_PACK_VERSION`, a decision on supporting old builds, and DB
  compaction (~26 MB of freelist in 38.4 MB).
- **§5 deferred mechanics** — expected-value prize, weekly shirt accrual, a `club_shop` effect that
  earns nothing, a fan base that responds to form, shirt elasticity, splitting
  `seasonTicketHolderPercent`, a cost-of-sales ledger category. New mechanics, not calibration;
  they belong after the economy is calibrated, not during.

## What I would deliberately not start yet

- Anything that re-opens a turnover, sponsor, TV or payout figure. R2 is one coherent set; changing
  one of them before B1 has measured the set makes the measurement worthless.
- The `spendGate` consolidation branch (`REMAINING-WORK.md` §6). It is unblocked by the
  income-truth batch but still waiting on device results, and it touches the same files as C1.
- Any new economy mechanic from §5.
