# Economy Code Review & Live Export Audit — Build My Club (`new-game-save`)

- **Date:** 2026-11-20
- **Repository audited:** `/Users/courtneyadesile/Documents/WunderkindFactory/wunderkind-app` (branch `new-game-save`, HEAD `9bac0b18`, with 5 uncommitted working-tree doc edits under `.context/`)
- **Live exports audited:**
  - `/Users/courtneyadesile/Downloads/wunderkind-config-2026-11-20.json` (`exportedAt: 2026-11-20T21:01:48+00:00`, 3,278 lines — `gameConfig`, `starterConfig`, `poolConfig`)
  - `/Users/courtneyadesile/Downloads/wunderkind-world-2026-11-20.json` (`exportedAt: 2026-11-20T21:01:18+00:00`, 200,907 lines — 25 countries, 196 leagues, 3,127 clubs)
- **Scope:** Part I covers the cold-start architectural & economic audit of the codebase (`.context/` ICM utility, User Club Economy & Balance Allocation, NPC Club Finances/Income/Spending/AI Prioritization, and Codebase Edge Cases/Coupling/Risks). Part II covers the quantitative economic model and defect register from the live `2026-11-20` config and world exports cross-referenced against live engine formulas.

---

# Part I — Cold-Start Architectural & Economic Audit (`new-game-save`)

## 1. `.context` & ICM Utility Audit

### 1.1 Folder Hierarchy & Organization
The `.context/` tree implements a 4-layer Interpretable Context Methodology (ICM) layout totaling **34 markdown files / 480,861 est. tokens** (25,015 lines / ~1.90 MB across `CONTEXT.md`, `shared/`, and `stages/*/output/`):

| Path | Layer / Role | Files & Measured Size (`chars ÷ 4` est. tokens) |
|---|---|---|
| `.context/CONTEXT.md` | Layer 1 — Router & stage index | 1 file · 95 lines (~1,831 tok) |
| `.context/shared/` | Canonical stack, sync history, token metrics | `stack.md` (52L), `last-sync.md` (**5,748L / ~104k tok**), `token-savings.md` (286L), `usage-savings-log.md` (67L), `competition-testing.md` (2L) |
| `stages/01_overview/` | Stack, env, binding tribal rules (`Q4`) | `environment.md` (461L), `tribal-knowledge.md` (600L) · stage load ~25,176 tok |
| `stages/02_architecture/` | Module boundaries, git hotspots | `structure.md` (957L), `git-activity.md` (55L) · stage load ~23,338 tok |
| `stages/03_data/` | Drizzle schema, entities, Zustand state, migrations | `schema.md` (640L), `entities.md` (282L), `state.md` (902L), `migrations.md` (535L) · stage load ~46,118 tok |
| `stages/04_interfaces/` | External API routes, controllers, service history | `routes.md` (775L), `controllers.md` (27L), `services.md` (2,575L) · stage load ~68,195 tok |
| `stages/05_ui/` | Design tokens, patterns, navigation, compliance | `design-system.md` (373L), `design-system-notes.md` (858L), `patterns.md` (2,568L), `navigation.md` (542L), `compliance-review.md` (364L) · stage load ~92,572 tok |
| `stages/06_documentation/` | Hand-written repo doc index | `index.md` (300L) · stage load ~16,677 tok |
| `stages/07_synthesis/` | Live simulation rules, architecture notes, current focus | `overview.md` (50L), `architecture-notes.md` (1,406L), `current-focus.md` (1,474L), **`game-mechanics.md` (3,098L / ~55k tok)** · stage load **~111,498 tok** |

### 1.2 Cold-Start Utility Evaluation
- **What was clear & accurate:**
  - **Architectural map & binding invariants:** `.context/stages/01_overview/output/tribal-knowledge.md` Q4 and `.context/stages/03_data/output/schema.md` immediately surfaced non-obvious rules (pence vs. pounds exceptions, `calendarStore.gameDate` anchor, `players` master table + pointer tables, "pack is a census, not a price list", Drizzle exclusivity/transaction rules).
  - **Recent `new-game-save` economy work:** `.context/stages/07_synthesis/output/game-mechanics.md` §8 ("STEP 3 — the DOF's pot") and `.context/stages/03_data/output/state.md` accurately captured the 2026-11-20 carried DOF wage-commitment ledger (`598ff158` + `9bac0b18`), `resolveEconomy`'s `incomeAnchoredWages` derivation, and the `new-game-setup` v3 setup-flow endpoints.
  - **Dead-code & defect candor:** `game-mechanics.md` §10 ("Register of what does NOT work") saved significant search time by confirming `budgetView.ts`, dead `npcWeeklyIncome*`/`npcAttendance*` config keys, `PYRAMID_DISTRIBUTION_ENABLED = false`, and `GameLoop.ts:1538`'s deliberate `23`-home-game solvency mismatch.
- **Structural degradation & staleness found against raw code:**
  - **Context bloat defeats ICM's premise:** `.context/CONTEXT.md:6-8` promises "only the couple thousand tokens relevant to its task", yet `07_synthesis` alone is **~111.5k tokens** (measured vs. `89.5k` stale in `.context/shared/token-savings.md:21`) and the full stage set is **~367.3k tokens** (vs. `335.1k` reported). Files function as append-only incident diaries/postmortems with struck-through rules and superseded reversals rather than crisp current-state specs.
  - **Broken sync hygiene in `.context/shared/last-sync.md`:** 5,748 lines (~104k tokens), no machine-parseable `<recorded-commit>` header for `SKILL.md`'s staleness check, and **mixed chronological ordering** — earlier passes were prepended at the top (top entry at line 23 is `7609125e`) while the 6 newest commits (`6fb687a0` through `9bac0b18`) were **appended to the bottom** (lines 5600+).
  - **Documentation vs. live code blind spots (requiring raw-source fallback):** `.context/` missed or misstated major live economic behavior/defects that only raw source inspection uncovered:
    1. `game-mechanics.md` describes `financialApproach` as an active negative-feedback brake and `decayCondition(maintenance)` as scaling wear by Facility Manager style — in raw code, **`financialApproach` is unread by any AI** and **`src/engine/GameLoop.ts:3649` calls `decayCondition()` with no arguments** (always `1.35×`).
    2. `game-mechanics.md` §8 states `calculateFacilityUpkeep` scales by `tierFactor × inflationIndex` — in raw code, **every runtime caller** (`src/engine/finance.ts:144`, `src/engine/FinancialProjectionService.ts:231`, `src/utils/npcFinances.ts:75`, `src/stores/facilityStore.ts:82`) omits the `opts` parameter, forcing legacy `base × 1.5^level`.
    3. `game-mechanics.md` §9 does not reveal that **`processAllNpcFinances()` is skipped on Weeks 1–4 and all transfer-window weeks** (`src/game/useWeeklyTick.ts:544-545`), that **`advanceMatchday()` runs before `processAllNpcFinances()`** (`src/engine/SimulationService.ts:1009-1013`), that **`setNpcSeasonBudgets` drops matchday + TV from Season 2+ NPC budgets** (`src/engine/SeasonBudgetService.ts:241`), or that **manager `dividend_draw` credits `club.balance` instead of debiting it** (`src/engine/GameLoop.ts:1353`).
    4. `.context/stages/01_overview/output/tribal-knowledge.md:51-54` still claims "stores hold pounds — except 5 fields", whereas in actual code `financeStore.transactions`, `loanStore`, `club.pricing`, `seasonTickets`, `careerEarnings`, and `player.wage` in-memory are **pence** (only SQLite `players.contract_weekly_wage` stores whole pounds via `penceToPounds` in `src/engine/TransferService.ts:220`).

---

## 2. User Club Economy & Balance Allocation

### 2.1 Storage, Mutation & Persistence (SQLite / Drizzle + Sync / API)
- **Authoritative local balance & ledger:**
  - Live cash lives in `useClubStore` (`src/stores/clubStore.ts:766`, `club.balance`, integer **pence**).
  - Standard mutations flow through `useFinanceStore.addTransaction` (`src/stores/financeStore.ts:37-49`), which: (1) prepends to in-memory `transactions` capped at `MAX_TRANSACTIONS = 364` (`ROLLING_WEEKS = 52`), (2) synchronously calls `useClubStore.getState().addBalance(newTx.amount)` (`src/stores/clubStore.ts:847-855`), and (3) fire-and-forgets `flushInsertTransaction` (`src/db/helpers/flushFinanceToDB.ts:30-35`) → SQLite `transactions` table.
  - **Bypass:** `src/screens/finances/LoansScreen.tsx:151` calls `clubStore.addBalance(poundsToPence(amount))` directly, bypassing `transactions`.
- **SQLite persistence of club state:**
  - `clubStore` flushes via coalesced `flushClubStateToDB` (`src/db/helpers/flushClubStateToDB.ts:83-103`) (batch-coalesced during weekly tick; microtask-coalesced outside) → `saveClubState` → singleton `club_state(id='amp', data JSON)` row.
  - Serialization goes through the explicit allowlist `pickClubState` (`src/db/helpers/pickClubState.ts:10-64`): nested fields on `club` (`balance`, `landCostPence`, `seasonBudget`, `facilitiesPaidPence`, `pricing`, `seasonTickets`, `sponsorContracts`, `investors`) ride automatically; top-level fields (`transferBudget`, `facilitiesBudget`, `chairmanBudget`, their `%` fields, `dofWageCommitmentPence`, `dofWageCommitmentPeriodWeek`, `dofWageCommitments`, `wageBudgetPercent`, `budgetAutoAdjust`, `winBonusTier`) must be explicitly listed. **`minOperatingReservePct` is omitted from `pickClubState` and resets to `10` on every reload.**
- **Sync / API boundary & `new-game-save` funding:**
  - **Pre-game Account Credit (`UserLedger`, server-authoritative, pence):** Separate from `club.balance`. `GET /api/account/ledger` (`src/api/endpoints/accountLedger.ts:40-46`), plot hold/claim `POST /api/plots/{id}/hold|claim` (`src/api/endpoints/plots.ts:56-72`), per-site build `POST /api/club/facilities/{site}` (`src/api/endpoints/clubSetup.ts:53-59`), and club funding `POST /api/club/fund` (`src/api/endpoints/clubSetup.ts:83-91`). At `START GAME`, `applySetup` (`src/components/new-game-setup/applySetup.ts:259-299`) → `applyFacilityBuild` + `applyStartingBalance` (`src/components/new-game-setup/applyBuild.ts:31-122`) reconciles `club.balance` to `fundedPence + season1Tickets` via single delta transactions, then `src/components/new-game-setup/useSetupHost.ts:467` calls `bootstrapSeasonBudgets` (`src/engine/SeasonBudgetService.ts:402-412`).
  - **In-game weekly sync (`POST /api/sync`):** Built by `buildSyncPayload` (`src/game/buildSyncPayload.ts:57-411`) and delivered via `SyncQueue` (`src/api/syncQueue.ts:47-360`). Sends `balance`, `earningsDelta`, `totalCareerEarnings`, `transfers`, `signings` in pence — **except `ledger[]` (`src/game/buildSyncPayload.ts:84-90`), which multiplies every non-`dividend_draw` amount by `100`** (a legacy workaround for backend scaling). On acceptance, `src/api/syncQueue.ts:239` calls `applyServerSync` (reconciles reputation, `Math.max` career earnings, HoF points; **does not overwrite local `balance`**) and persists piggybacked `gameConfig` + `facilityTemplates`. All budget pots, `seasonBudget`, `dofWageCommitments`, loans, sponsors, investors, pricing, and NPC finances are **local SQLite-only**.

### 2.2 Three-Step Budget Model & Role Allocations
Implemented across `src/economy/clubBudget.ts`, `src/economy/dofHireCharge.ts`, `src/economy/staffHireBudget.ts`, and `src/stores/clubStore.ts`:

1. **Step 1 — Guaranteed annual commitments off the top (`club.seasonBudget`):**
   - Derived at season start by `bootstrapAmpSeasonBudget` (`src/engine/SeasonBudgetService.ts:415-480`, from `buildProjection({ horizonWeeks: [52] })`) and at each season transition by `setAmpSeasonBudget` (`src/engine/SeasonBudgetService.ts:138-184`, from last `weeksPerSeason` [46] ledger rows, excluding `NON_RECURRING_INCOME`).
   - `deriveClubBudget` (`src/economy/clubBudget.ts:186-216`): `wageShare = round(income × ratioBp / 10_000)` (default `6_000` bp = 60%, `STAFF_WAGE_SHARE_BP = 2_500` bp = 25% of wage reservation), `wageReservationPence = max(wageShare, wageFloorPence)`, `maintenanceReservationPence = projectedUpkeepPence`.
   - `allocatableBalancePence` (`src/stores/clubStore.ts:598-604`): `max(0, balance - (wageFloorPence + maintenanceReservationPence))`.
2. **Step 2 — Available share & Operating Reserve:**
   - `setBudgetAllocation` (`src/stores/clubStore.ts:1009-1040`) enforces `transferPct + facilitiesPct + chairmanPct <= 100 - minOperatingReservePct` (default `10`, clamped `0–20`), proportionally rescaling all three if exceeded. Defaults: **30% Transfer / 30% Facilities / 5% Chairman** (35% reserve).
3. **Step 3 — Role-by-role Pots & Automation:**

| Role | Assigned Pot & Formula | Exact Spenders & Gates | Automated Economic Behavior |
|---|---|---|---|
| **Director of Football** | `transferBudget` = `max(0, floor(allocatable × transferPct/100) - carriedDofWageCommitmentPence)` (`src/stores/clubStore.ts:756-764`) | Transfer fees, sign-on fees, agent commission, agent access fee, **plus remaining-season wages (`max(0, newWage - incumbentWage) × weeksRemainingInBudgetSeason`)** for new player signings, player auto-renewals, and staff hires/poaches/renewals via `drawDofContractCharge` (`src/stores/clubStore.ts:879-922`). Refunds unspent tail on departure via `releaseDofWageCommitment` (`src/stores/clubStore.ts:923-983`) at 6 choke points (`squadStore`, `coachStore`, `scoutStore`, `src/engine/ampYouthRelease.ts`). *No DOF required for manual signings.* | Auto-renews players (`GameLoop.ts:5504-5675`) & staff (`5813-5951`), auto-hires staff (`src/engine/DofStaffHiringService.ts`), proposes shortlist signings (`src/engine/DofSigningService.ts`, `src/engine/DofBrain.ts`), optional auto-sell (`3107-3248`) & sponsor handling (`366-397`). |
| **Facility Manager** | `facilitiesBudget` = `floor(allocatable × facilitiesPct/100)` (`src/stores/clubStore.ts:985-990`) | **Only** FM auto-repair (`GameLoop.ts:3708-3776`) and FM negotiated upgrade acceptance (`InboxResponseHandlers.ts:434-495`). **Requires FM in post** — completely idle when seat is vacant. Manual facility upgrades from the Facilities screen debit `club.balance` directly, not `facilitiesBudget`. | Auto-repairs below `40 + ability × 0.5` condition (`src/engine/FacilityManagerBrain.ts:86-153`); every 8w proposes 1 discounted upgrade (`normalCost = (level+1)×baseCost`, `UPKEEP_PENALTY_WEIGHT = 20`, `src/engine/FacilityManagerBrain.ts:160-269`). |
| **Chairman** | `chairmanBudget` = `floor(allocatable × chairmanPct/100)` (`src/stores/clubStore.ts:992-997`) | **Only** `ExcursionService.bookExcursion` (`src/engine/ExcursionService.ts:159-257`, `costPerPersonPence × attendeeCount`). *No Chairman required for manual bookings.* | Every 4w shifts ±5% between `transferPct`/`facilitiesPct` if `|utilizationGap| > 0.1` (`GameLoop.ts:5962-5990`); auto-plans excursions (≥4w gap, 50% roll, `GameLoop.ts:5998-6035`); auto-accepts investor offers (`equity <= 15%`) and FM discounts (`>= 10%`); optional season-boundary ticket pricing (`chairmanAutoSetTicketPrice === true`, `src/engine/SeasonBudgetService.ts:330-362`); controls `minOperatingReservePct`. |
| **Manager** | **None** | Zero budget pot or spending cap. | Tactical setup, advisory buy/sell/renewal opinions (`src/engine/ManagerBrain.ts`), youth intake/promotions (`src/engine/YouthPromotionService.ts` — spends raw `club.balance`), guardian requests (`balance >= costPence`). |

### 2.3 Salaries, Weekly Payroll & Transfers
- **Wage pricing (`turnover` vs. `legacy`):**
  - `resolveEconomy` (`src/economy/economyConfig.ts:154-200`): `incomeAnchoredWages` resolves `config.incomeAnchoredWages ?? (baseline?.wageModel === 'turnover')` (live `true` when `wageModel === 'turnover'`).
  - **Players (`src/economy/wages.ts:193-220`):** `marketPence = trunc(trunc(round(wageScaleMicroPence × ability^k) × repBp / 10_000) / wageScaleUnit)`, multiplied by `1 + budgetPremium` (`[1.25, 1.50]` based on `clubScale / tierScale` richness and `formRating` in `[6, 8]` when `appearances > 0`). Negotiation band is `±8%`.
  - **Staff & Scouts (`src/economy/packWages.ts:229-254`, `src/utils/staffWages.ts:159-229`):** Both use `tierStaffWeeklyWagePence(ability, economy)` (`asPlayer × staffMultiplier / playerMultiplier`) for pack/new-tier pricing; renewals mean-revert 50% toward `ampStaffWagePence` (`src/engine/ClubWageScaleService.ts:176-189`, `staffRenewalWagePence`). Player renewals mean-revert 50% with ambition/loyalty/age adjustments via `quoteRenewal` (`src/economy/renewals.ts:44-135`).
- **Weekly payroll tick (`src/engine/GameLoop.ts:1177-1384`, `src/engine/finance.ts:106-164`):**
  - Deducts: active first-team player wages (`× playerWageMultiplier`), coach/key-staff salaries, scout salaries (consolidated into one `wages` transaction), facility upkeep (`upkeep`), loan repayments (`loan_repayment`), optional win bonus (`15%` boosted / `40%` lavish of payroll). **Youth scholar wages are omitted from weekly payroll** because `useSquadStore.players` excludes `role='youth'`.
  - Credits: active `sponsorContracts` weekly payments (`sponsor_income`), home matchday revenue (`computeMatchdayRevenue`: walk-up gate + food on whole crowd + facility matchday income) or away/non-match `nonMatchFacilityIncomePercent` (`matchday_income`).
  - Every 52nd week (`weekNumber % 52 === 0`): pays manager dividend (`5%` of 52-week profit) and investor dividends (`computeInvestorDividends`).
- **Transfers, Valuation, Clauses & Unimplemented Features:**
  - **Valuation (`src/economy/marketValue.ts:44-89`, `src/engine/MarketEngine.ts:42-68`):** Under `turnover`, `round(weeklyWage × weeksPerSeason × 2.5 × ageFactor × potentialMultiplier × repMultiplier)`. Reluctance multipliers `2×–5×` for un-listed NPC players; foreign premiums `1.2×–2.0×`.
  - **Deal settlement (`src/engine/TransferService.ts:98-595`):** 100% upfront cash. Sign-on fee = `round(weeklyWage × 52 × midSignOnPct / 100)` (`src/engine/finance.ts:48-56`); agent commission = `fee × rate%` (paid) or `wage × contractWeeks × rate%` (free); via-agent brokering applies `0.88×` fee / `0.92×` wage / `1.6×` commission / `+12` interest (capped at 2 deals/agent/window).
  - **Absent / Stubbed / Unwired:**
    - **Transfer fee amortization & installments:** Absent (all fees settle 100% upfront).
    - **Sell-on clauses & player release clauses:** Absent (only staff poaching buyout exists).
    - **Player loans (loan-in / loan-out):** Absent (only an unused `'loaned_out'` enum literal in `PlayerStatus`; `loanStore` is bank loans).
    - **Relegation wage-cut clauses:** DB column (`players.relegation_wage_cut_bp`, migration `0021`) and pure math (`src/economy/relegationClause.ts`) exist, but **zero UI, negotiation, or `SeasonTransitionService` wiring calls them**.

---

## 3. NPC Club Finances, Income, Spending & Budgeting

### 3.1 Income Sources & Expense Sinks
- **Persistence:** Balances, facilities, `facilitiesPaidPence`, sponsors, investors, `seasonTickets`, `seasonBudget`, `weeklyIncome`, and `personality.financialApproach` live in `world_clubs.data` JSON; transaction logs live in `npc_club_ledger` (flattened per season by `flattenNpcLedgerForSeason`). Players/staff/scouts are stripped from the blob by `stripClubDataForBlob` and stored in `players`/`staff` tables.
- **Weekly loop (`src/engine/NpcFinanceService.ts:22-169`, `src/utils/npcFinances.ts:44-364`):**
  - Invoked **only inside `SimulationService.runBatchSimulation()`** (`src/engine/SimulationService.ts:1013`), which runs only on match weeks (`weekNumber >= 5 && !isTransferWindowOpen`, `src/game/useWeeklyTick.ts:544-545`). Off-season skip weeks are consolidated by `processNpcOffSeasonLedger` (`src/engine/SeasonTransitionService.ts:1227-1284`).
  - **Income:** `sponsorIncome` (`sumNpcSponsorIncome`) + `matchdayIncome` on home weeks only (`computeMatchdayRevenue` with synthetic condition `100`, no construction closures, **no `fanCount` cap**, no away/non-match income).
  - **Expenses:** `wageBill` (`computeNpcWageBill`: `club.players` + `club.staff`, **excluding `club.scouts`** and ignoring `playerWageMultiplier`) + `upkeep` (`computeNpcFacilityUpkeep`, legacy `base × 1.5^level` with no tier factor or inflation).
- **Seasonal income, penalties & rescue (`src/engine/SeasonTransitionService.ts`):**
  - **Season 1 init (`distributeNpcSeasonOneStartIncome`, L1608-1727):** Shirt sales (gross minus 40–50% mfg), Season-1-only league sponsor share (scaled off `ampLeague.sponsorPot`), and season tickets. **No Season-1 TV deal** (AMP gets one).
  - **Season 2+ transition:**
    - `distributeNpcSeasonFinances` (L991-1116): TV deal, champion-only `prizeMoney`, tapered `leaguePositionPot`, and `parachutePence` via shared `computeSeasonFinances` (`src/economy/seasonFinances.ts:62-123`). **No Season 2+ league sponsor pot**; promoted/relegated NPCs get their **old** division's TV deal.
    - `evaluateNpcFinancialPromises` (L4499-4739): Sponsor renewal/top-up (to `ceil(maxSponsors/2)`), investor seasonal payouts (tiers 1–3, **no ledger row**), shirt sales, season tickets.
    - Pyramid tax/redistribution: **Disabled** (`PYRAMID_DISTRIBUTION_ENABLED = false`, L1359).
    - Bankruptcy points deductions (`applyBankruptcyDeductions`, L2025-2106): Under `turnover`, weeks-of-wages deficit ladder (`[1,2)→3, [2,4)→6, [4,8)→10, [8,16)→20, 16+→50` pts, `src/economy/insolvency.ts:190-216`).
    - Insolvency rescue (`src/engine/NpcRescueService.ts:97-263`): Runs after deductions for any `balance < 0`. `8%` sugar daddy (`deficit + 40w` outgoings, 20% equity, 5-season investor, 3 free facility levels) vs. `92%` ordinary rescue (`deficit + 12w`, 10% equity, 3-season investor).

### 3.2 NPC Budgeting & AI Spending Prioritization
- **Budget derivation:** Same 60% wage reservation (`75%` players / `25%` staff) + upkeep via `deriveClubBudget` (`src/economy/clubBudget.ts:186-216`). Season-1 bootstrap (`bootstrapNpcSeasonBudgets`, `src/engine/SeasonBudgetService.ts:538-628`) uses `npcWeeklyIncomePence` (sponsors + investors + counted/derived matchday + TV) and snaps staff salaries; Season 2+ (`setNpcSeasonBudgets`, L219-306) erroneously reads `(club.weeklyIncome ?? 0) * weeks` (sponsors + investors only) and mean-reverts staff salaries (`anchorNpcStaffWages`).
- **Action prioritization (`NpcClubBrain.evaluate`, `src/engine/NpcClubBrain.ts:239-254, 370-903`):**
  - Each club gets **one `isFullEvaluation` per season** (`npc_club_review_status`, `src/engine/GameLoop.ts:1815-1827`), and the executor executes **`topAction` alone** (`1` action):
  - **Hard preemptive order:** `CRITICAL` recruit (`<11` available seniors or no GK; bypasses rotation/cooldown; up to 3/wk; waives free-agent runway gate) → `EMERGENCY` recruit (any position below tier-band `formationMin`; 4w out-of-window / 1w in-window per-position cooldown).
  - **Priority table (`ACTION_PRIORITY`):**
    1. **`4` — `sell_facility`:** `weeksRunway < sellFacilityThreshold` (4w, or 2w early / 6w late) & non-stand facility > L0; sheds highest `weeklyUpkeepBase × 1.5^level` for `80%` of `facilitiesPaidPence ?? investedToLevel` (`src/engine/npcFacilitySale.ts`).
    2. **`3` — `sell_player`:** Proactive listing (window open, composite age/OVR/friction/role score `>= 10`), critical runway (`<4w`), surplus (`>= totalMax + 3`), low runway (`<12w`, `16w` late), or **wage bill over reservation** (`weeklyWageBill > weeklyWageReservationPence` → lists highest `wage / OVR`).
    3. **`2` — `recruit_player`:** Non-emergency squad/positional deficit (`seasonProgress < 0.75`). Gated by `npcCanAffordSigning` (`src/engine/npcAffordability.ts:85-117`, balance ≥ fee now AND projected balance ≥ 0 at every horizon up to contract length).
    4. **`1` (insertion tie-break order on single full eval):** `upgrade_facility` (`weeksRunway > 26`, `seasonProgress < 0.5`, `balance >= (level+1)×baseCost`; if FM present, re-selected via `FacilityManagerBrain` gated by `npcFacilitiesBudgetPence`) → `scout_search` → `seek_sponsor` (`runway >= 26`) → `seek_investor` (`tier <= 3`, `runway >= 52`) → `hire_staff` (`runway >= 12`, order: coach → DOF → FM → scout).
  - **Contract renewals & releases (decoupled from `NpcClubBrain`):**
    - Every 4 weeks (`weekNumber % 4 === 1`), `processNpcContractRenewals` (`src/engine/GameLoop.ts:6606-6832`) scores seniors within 25w of expiry against `EXTEND_SCORE_THRESHOLD = 55` (tier-normalised OVR + positional depth + age; star guard `>= 85`), with zero financial/budget check and **no wage repricing**, followed by `processNpcContractExpiry` (enforces `npcSquadFloor`).
    - Pre-season/window safety net `reconcileNpcRosters` (`src/engine/SeasonTransitionService.ts:3163-3397`) tops squads up to **`band.max`** with **zero affordability check** and zero fee.
  - **No explicit budget-split AI:** `financialApproach` (`CONSERVATIVE` / `BALANCED` / `SPECULATIVE`) and `headroomMultiple` (`src/economy/financialApproach.ts:91-97`, `1.05×` / `1.20×` / `1.40×`) are **never read by any NPC decision code**.

---

## 4. Codebase Edge Cases, Coupling & Risk Register

### 4.1 Critical & High Economy / Correctness Defects

| Sev | Domain | Exact File & Symbol | Finding & Impact |
|---|---|---|---|
| **CRITICAL** | AMP Payroll | `src/engine/GameLoop.ts:1352-1357` | Manager `dividend_draw` books **positive** `amount: dividendAmount` into `financeStore.addTransaction`, **crediting** `club.balance` (printing free money) instead of debiting it (contrast `-ip.pence` on line 1378). |
| **CRITICAL** | Persistence | `src/db/helpers/pickClubState.ts:18-63` | `minOperatingReservePct` is omitted from `pickClubState` — Chairman/owner reserve-floor edits reset silently to `10%` on every restart. |
| **CRITICAL** | Season Budgets | `src/engine/SeasonTransitionService.ts:5470-5475` | Overwrites `transferBudgetPercent` with config default every season (bypassing `setBudgetAllocation`, risking `sum > 100 - reserve`) and **never calls `recalculateChairmanBudget()`** (which has zero production callers). |
| **CRITICAL** | NPC Budgets | `src/engine/SeasonBudgetService.ts:241`, `src/engine/SeasonTransitionService.ts:5062,5400` | Season 2+ `setNpcSeasonBudgets` reads `(club.weeklyIncome ?? 0) * weeks` (stale sponsor+investor only), **dropping all matchday & TV income** (~70–85% of revenue), collapsing NPC wage reservations and forcing clubs `CONSERVATIVE` / over-committed. |
| **CRITICAL** | NPC Payroll & Matchday | `src/game/useWeeklyTick.ts:136-138,544-545`, `src/engine/SimulationService.ts:1009-1013` | `processAllNpcFinances()` is skipped on Weeks 1–4 and every transfer-window week (0 wages/upkeep/sponsors), AND `advanceMatchday()` runs **before** `processAllNpcFinances()`, shifting `hasHomeMatch` by +1 round (losing Matchday 1 home gates). |
| **CRITICAL** | NPC Renewals | `src/engine/GameLoop.ts:6661,6734-6741` | `processNpcContractRenewals` writes `seniors`-only back to `npcClub.players` in Zustand (**wiping NPC youth from memory on any renewal**), never calls `quoteRenewal()` (NPC player wages stay frozen forever), and uses drifting `getGameDate(weekNumber)` (L6618). |
| **HIGH** | `new-game-save` Init | `src/hooks/useInitFlow.ts:1224`, `src/components/new-game-setup/applyBuild.ts:110-122`, `src/components/new-game-setup/useSetupHost.ts:467` | `setBudgetAutoAdjust(true)` computes the 3 pots during world init **before** v3 `applyStartingBalance` and `bootstrapSeasonBudgets`. Neither `applySetup` nor `bootstrapSeasonBudgets` recalculates the pots, leaving Week-1 pre-advance pots stale against the pre-funding balance with no Step 1 deductions. |
| **HIGH** | AMP Ledger Cap | `src/stores/financeStore.ts:11,44`, `src/engine/SeasonBudgetService.ts:76-84` | `financeStore.transactions` truncates in-memory at `MAX_TRANSACTIONS = 364`. Active clubs exceed 364 rows/season (8–10 tx/wk × 46w), silently evicting early-season TV deal & season-ticket rows before `setAmpSeasonBudget` sums them. |
| **HIGH** | Rule-0 Bleed (AMP → NPC) | `src/engine/GameLoop.ts:2221`, `src/engine/SeasonTransitionService.ts:1671-1688` | NPC `npcFacilitiesBudgetPence` passes `useClubStore.getState().facilitiesBudgetPercent` (**the user's slider**) instead of `npcClub.facilitiesBudgetPercent`; Season-1 NPC league sponsor scales off `ampLeague.sponsorPot`. |
| **HIGH** | Facility Upkeep & Decay | `src/engine/finance.ts:144`, `src/utils/npcFinances.ts:75`, `src/engine/GameLoop.ts:3649` | All runtime upkeep callers omit `opts`, bypassing `UPKEEP_TIER_FACTOR` and inflation. `GameLoop.ts:3649` calls `decayCondition()` with no args, locking every AMP club to `1.35×` "no FM" decay. |
| **HIGH** | Free NPC Purchases | `src/engine/GameLoop.ts:3179-3204`, `src/engine/InboxResponseHandlers.ts:243-263`, `src/engine/StaffPoachingService.ts:392-448` | AMP → NPC player sales omit `onBuyerFinance`; `poachStaffFromAmp` writes an NPC ledger debit without calling `adjustClubBalance`; `scout_search` (`GameLoop.ts:2383-2531`) neither pays nor detaches from selling NPC clubs. |
| **HIGH** | DOF Pot Bypasses | `app/player/[id].tsx:793-795,1291-1305`, `src/engine/YouthPromotionService.ts:81-127,247`, `src/components/transfers/SignPlayerPanel.tsx:624` | Manual player renewals and youth first-team promotions bypass `drawDofContractCharge`/`transferBudget` (and manual renewal skips `ampPricingArgs()`/`quoteRenewal`). `SignPlayerPanel` treats `overBudget` and negative balance as non-blocking warnings. |
| **HIGH** | Loans & Valuation Loop | `src/screens/finances/LoansScreen.tsx:151`, `src/hooks/useClubMetrics.ts:183-191` | Borrowing adds cash directly to `club.balance` (skipping `transactions`) while `computeClubValuation` does not deduct debt, allowing recursive borrowing up to **1.0×–1.22×** original valuation (2×+ the 50% cap). |
| **HIGH** | Staff Wage Anchoring | `src/engine/ClubWageScaleService.ts:181-205`, `src/engine/SeasonBudgetService.ts:193-210,631-647` | `ampStaffWagePence`/`npcStaffWagePence` omit `scouts` from the denominator (overpricing) AND double-count incumbent ability on existing NPC staff (underpricing). NPC anchored/snapped staff salaries are never written to SQLite `staff`, reverting on restart. |
| **HIGH** | NPC Transfer Pricing & Affordability | `src/engine/npcTransferExecutors.ts:583-589,691-700`, `src/engine/npcFinanceSnapshot.ts:40` | `npcTransferExecutors` omits `economy`/`clubWageScaleMicroPence` (forcing legacy wages) and logs `-wage × 4` instead of `-fee`. `buildNpcAffordabilityBase` uses `sumNpcSponsorIncome || club.weeklyIncome || 0` (omitting matchday/TV and dropping investors when ≥1 sponsor exists). |
| **HIGH** | Payroll & Inbox Gaps | `src/engine/GameLoop.ts:531,4890`, `src/engine/InboxResponseHandlers.ts:434-495`, `src/game/buildSyncPayload.ts:84-90` | Youth scholar wages are never paid in weekly payroll; manual FM upgrade acceptance has no budget/balance check; `buildSyncPayload` multiplies pence ledger entries by `100` (except `dividend_draw`). |

### 4.2 Medium Coupling, Stale-State & Architectural Risks
- **Stale balance & wrong basis in AMP budget automation:** `src/engine/GameLoop.ts:4589` checks pre-tick `club.balance` instead of `clubState.club.balance` (lagging `budgetAutoAdjust` by 1 week). Chairman 4-weekly rebalance (`src/engine/GameLoop.ts:5965-5969`) and `src/screens/profile/staffControlLogic.ts:83-85` compute nominal budgets/reserve off raw `club.balance` instead of `allocatableBalancePence`.
- **UI ↔ Economy coupling & drift:**
  - `src/components/transfers/SignStaffPanel.tsx:112-115` vs. `app/staff/[id].tsx:292,335,382`: `calculateStaffSignOnFee` calls `Math.random()` twice (preview ≠ charged fee), and poaching draws `transferBudget` before an un-awaited `void poachStaff(...)`.
  - `src/screens/finances/InvestorsScreen.tsx:49-62` / `src/screens/finances/backersLogic.ts:8-10`: Buyout math lives only in UI, checks raw balance, and leaves active investor promises un-cancelled.
  - `src/screens/finances/BudgetScreen.tsx:369-375,416-423`: Renders the Reserve block twice when `seasonBudget` exists; `src/economy/budgetView.ts` and `wageBudgetPercent` have no live UI consumer.
  - `src/api/endpoints/clubSetup.ts:67-73`: Server `POST /api/club/fund` upkeep uses `1.5^(level - 1)` vs. client `1.5^level` (1.5× floor divergence during v3 setup).
- **Broken / dead NPC loops & asymmetries:**
  - `src/engine/NpcFinanceService.ts:34` searches `worldLeagues[].clubIds.includes(ampClub.id)` (which excludes `ampClub.id`), so rival insolvency alerts never fire.
  - `src/engine/NpcClubBrain.ts:239-254,888-900`: Single `isFullEval` per season + single `topAction` means any priority `2/3`/emergency action starves facility upgrades, scouting, sponsors, investors, and staff hires for the entire year; `seek_investor` requires `runway >= 52` (exact cap); `upgrade_facility` never checks `maxLevel` in the brain.
  - `src/engine/NpcRescueService.ts:257` stamps `facilitiesPaidPence` to full list cost on free sugar-daddy facility gifts (creating an 80% cash-out pump); `src/engine/SeasonTransitionService.ts:4468-4488,4034-4123` evaluate NPC sponsor/investor promises and season-end manager sackings from synthetic reputation formulas rather than real standings, while mid-season sacking (`src/engine/GameLoop.ts:2703-2735`) passes empty `recentResults: []`.
  - `src/engine/GameLoop.ts:3441-3455` removes a sponsor from `sponsorIds` on week-5 insolvency without removing it from `sponsorContracts`, so payments continue.
  - `src/engine/finance.ts:89-97` (`calculateNetSalePrice`: multiplicative) disagrees with `src/engine/TransferService.ts:501-525` (`makeAmpSellerFinanceCallbacks`: additive on gross) on investor equity cuts during player sales.

---

# Part II — Live Export Economic Audit (`2026-11-20`)

## 5. Executive Summary of Live Exports

The live backend has flipped to **`economyWageModel: "turnover"`** (`wunderkind-config-2026-11-20.json:216`), populated **`bankruptcyDeductionWeeks`** (`:43-69`), enabled **`EN` and `SC`** (`starterConfig.enabledCountries`, `:1105-1108`), and authored **`starterConfig.fanBaseSharePercent`** (`:1145-1178`).

Running the engine's exact recurring-flow math over the live world pack reveals **three severe structural breaks**:
1. **Legacy league financial overrides are still stamped on all 196/196 leagues**, completely masking the R2 turnover-scaled prize/position ladders — creating a **666%–734% income-to-cost windfall in `EN` T7–T8** while **`EN` T1 runs at 55% coverage** (even *with* overrides) and **`SC` T1–T4 run at 41%–50% coverage** without overrides.
2. **Pre-country-factor values leaked into every non-`EN` country**: `tvPoolPence` (`£300M` at T1) and `parachute.perSeasonPence` (`£72.03M` Year 1 at T2) are byte-identical to England across **all 24 non-`EN` countries** — meaning relegation into `SC` T2 pays **£72.03M** (~394× an `SC` T2 club's median starting balance of `£182,630`).
3. **Starting balances and `SC` T3–T4 facilities are severely misaligned with the `turnover` wage bill**: `EN` T1–T4 start with **0.8–2.0 weeks** of wages+upkeep cash on hand, and **`SC` T3–T4** carry Band-2 grounds (22 active facilities, ~17,500 seats in towns of 2,300–10,000 people) whose **upkeep alone** consumes **36.8%–62.6% of authored turnover** — putting clubs like *Inverbervie City* (`SC` T3) at **0.45 weeks** of upkeep-only runway before paying a single player.

---

## 6. Tier-by-Tier Economic Model (`EN` & `SC`)

> **Methodology:** Uses exact codebase formulas: `capacityCalculation = 1250`, `matchdayFoodUptakePercent = 35`, `seasonTicketHolderPercent = 70` (both share and price discount → 79% effective gate face value via `computeSeasonTicketBooking` in `src/utils/seasonTickets.ts:56-66`), `economyWeeksPerSeason = 46`, `60%` wage-to-turnover (`45%` players / `15%` staff), `FALLBACK_FACILITY_TEMPLATES` from `src/types/facility.ts:165-578`, neutral morale (`60`), mid-table position money (`decreasePercent = 5%` fallback since all 196 leagues have `leaguePositionDecreasePercent: null`), and country factor `1.0` (`EN`) vs `0.10` (`SC`, confirmed by `tvDeal = tvPoolPence × 0.10 / clubCount`). **Club sponsors are excluded from the coverage columns** (per-tier scaled sponsors add `~£8.25M` at `EN` T1 down to `£8.6k` at `EN` T8, and `£825k` down to `£14.9k` in `SC`).

### 6.1 England (`EN`, 8 tiers, 127 NPC clubs + 1 AMP slot in T8 → 15 home games/tier)

| Tier | Clubs | Med Balance | Auth Turnover | Wages (60%/yr) | Upkeep Leg/yr *(Wired/yr)* | TV/yr | Matchday (ST+Gate+Food+Fac) | Shirt (Share vs Abs) | Pos Money Mid *(Ovr vs R2)* | Cov% *(Ovr / R2)* | Start Runway (Bal÷WkBill) |
|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| **1** | 16 | £3,685,554 | £331,000,000 | £198,600,000 | £3,619,093 *(£10,857,285)* | £18,750,000 | £26,707,437 | £724k *(£16.3M)* | £65.0M *(£55.4M)* | **55.0% / 50.2%** | **0.84 w** |
| **2** | 16 | £2,087,143 | £114,000,000 | £68,400,000 | £3,278,270 *(£7,867,855)* | £8,750,000 | £17,605,810 | £487k *(£6.68M)* | £52.0M *(£19.1M)* | **110.0% / 64.0%** | **1.34 w** |
| **3** | 16 | £719,224 | £34,600,000 | £20,760,000 | £1,261,373 *(£2,396,609)* | £4,375,000 | £7,504,332 | £268k *(£3.97M)* | £32.5M *(£5.79M)* | **202.7% / 81.4%** | **1.50 w** |
| **4** | 16 | £588,052 | £20,700,000 | £12,420,000 | £1,309,549 *(£2,095,280)* | £3,125,000 | £5,172,657 | £121k *(£2.11M)* | £19.5M *(£3.46M)* | **203.4% / 86.5%** | **1.97 w** |
| **5** | 16 | £363,824 | £7,320,000 | £4,392,000 | £600,688 *(£840,962)* | £1,875,000 | £2,362,794 | £88k *(£884k)* | £6.50M *(£1.22M)* | **216.8% / 111.2%** | **3.35 w** |
| **6** | 16 | £253,227 | £2,690,000 | £1,614,000 | £616,472 *(£739,766)* | £625,000 | £1,868,236 | £42k *(£327k)* | £5.66M *(£450k)* | **367.2% / 133.9%** | **5.22 w** |
| **7** | 16 | £152,329 | £686,000 | £411,600 | £106,950 *(£117,645)* | £312,500 | £217,806 | £27k *(£104k)* | £3.25M *(£115k)* | **734.2% / 129.6%** | **13.51 w** |
| **8** | 15 | £100,957 | £215,000 | £129,000 | £109,020 *(£109,020)* | £75,000 | £195,264 | £15k *(£39k)* | £1.30M *(£36k)* | **666.2% / 135.2%** | **19.51 w** |

### 6.2 Scotland (`SC`, 4 tiers, 47 NPC clubs + 1 AMP slot in T4 → 11 home games/tier, factor `0.10`)

| Tier | Clubs | Med Balance | Auth Turnover | Wages (60%/yr) | Upkeep Leg/yr *(Wired/yr)* | Upkeep % of Turnover | TV/yr | Matchday | Shirt (Share vs Abs) | Pos Money Mid *(Ovr vs R2)* | Cov% *(Ovr / R2)* | Start Runway |
|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| **1** | 12 | £396,933 | £33,100,000 | £19,860,000 | £3,656,043 *(£10,968,136)* | **11.0%** | £2,500,000 | £1,651,393 | £15k *(£1.63M)* | £7.50M *(£6.39M)* | **49.6% / 44.9%** | **0.78 w** |
| **2** | 12 | £182,630 | £11,400,000 | £6,840,000 | £3,401,941 *(£8,164,664)* | **29.8%** | £1,166,667 | £813,344 | £5.1k *(£669k)* | £6.00M *(£2.20M)* | **78.0% / 40.9%** | **0.82 w** |
| **3** | 12 | £54,082 | £3,460,000 | £2,076,000 | £1,273,631 *(£2,419,899)* | **36.8%** | £583,333 | £420,212 | £2.7k *(£397k)* | £3.75M *(£668k)* | **142.0% / 50.0%** | **0.74 w** |
| **4** | 11 | £58,563 | £2,070,000 | £1,242,000 | £1,296,110 *(£2,073,778)* | **62.6%** | £416,667 | £298,972 | £1.8k *(£211k)* | £2.25M *(£399k)* | **116.9% / 44.0%** | **1.06 w** |

**Key structural takeaways:**
- Under `fanBaseSharePercent`, **shirt income drops 80%–99% relative to `fanBaseRanges`** (e.g., `EN` T1 `£16.3M → £724k`; `SC` T1 `£1.63M → £15.5k`) because `fanCount` is now derived from town `populationSize` rather than global headcount bands. That leaves `EN` T1 (`~£111M + ~£8.3M` sponsors = `~£119M`) nearly **£83M/yr short** of its `£202M` wages+upkeep bill even *with* the legacy `£65M` position money override.
- Conversely, if the legacy overrides are removed (R2 column), `EN` T5–T8 remain cleanly solvent (`111%–135%`), while **`EN` T1–T4 drop to `50%–87%`** and **all four `SC` tiers collapse to `41%–50%`** (because facility upkeep has no country factor while turnover/tickets/TV are scaled `0.10×`).

---

## 7. Prioritized Register of Live Export Defects & Code × Config Collisions

### Critical

| # | Defect / Collision | Live Export Evidence | Code / Impact |
|---|---|---|---|
| **C1** | **Unscaled `parachute` & `tvPoolPence` across all 24 non-`EN` countries** | In `wunderkind-world-2026-11-20.json`, all 24 non-`EN` countries carry `EN`'s exact T1 `tvPoolPence` (`£300M`) and T2 `parachute.perSeasonPence` (`[£72,029,854, £48,019,903, £24,009,951]`). In `SC`, T2–T4 parachutes (`£72.0M`, `£21.3M`, `£11.9M` Year 1) are **10× unscaled** and `tvPoolPence / tvDeal = 120.0` (instead of `12.0`). | Relegating into `SC` T2 hands a club **£72.03M** (**394×** median `SC` T2 balance and **6.3×** `SC` T2 authored turnover). Relegating into `SC` T4 pays **£11.95M** (**204×** median `SC` T4 balance). Breaks any promotion/relegation balance in `SC` (and all other non-`EN` leagues). |
| **C2** | **Legacy `prizeMoneyOverride` & `leaguePositionPotOverride` active on 196/196 leagues** | Every single league in `wunderkind-world-2026-11-20.json` has non-null `tvDealOverride`, `prizeMoneyOverride`, and `leaguePositionPotOverride`, plus `leaguePositionDecreasePercent: null`. In `EN` T8, `prizeMoney = £5M` (**23.3×** turnover) and `leaguePositionPot = £2M` (1st takes **£7M = 32.6×** T8 turnover; mid-table takes `£1.3M = 6.0×` turnover). | Completely overrides `gameConfig.economyLeaguePrizeTier1Pence` / `economyPrizeTierRatioPpm`. Creates `666%–734%` coverage in `EN` T7–T8, trivially flooding lower-tier clubs with multi-million surpluses after Season 1. |
| **C3** | **Scotland 4-tier pyramid gets Band-2 facilities with unscaled upkeep** | `SC` T3 (`medBal £54,082`) and `SC` T4 (`medBal £58,563`, bottom division, rep `6–14`) are generated with Band-2 (`T3/T4`) grounds: **22 active facilities** and **13.7–13.8 stand levels** (~17,275 seats in towns of `2,300–10,000` population). | Facility upkeep (`£1.27M–£1.30M/yr` legacy; `£2.07M–£2.42M/yr` if tier-wired) eats **36.8%–62.6% of authored turnover**. Worst cases go negative on upkeep alone in weeks: *Inverbervie City* (`SC` T3: `£12,279` bal vs `£27,367/wk` upkeep = **0.45 wks**; `18,750` seats in a town of `2,300`), *Alva Boys Club* (`SC` T4: `£52,768` bal vs `£29,722/wk` = **1.78 wks**). |
| **C4** | **Starting NPC cash runway < 2 weeks across `EN` T1–T4 & all of `SC`** | `npcClubBalanceRanges` (`wunderkind-config-2026-11-20.json:505-535`) were never raised for the `turnover` wage bill: `EN` T1 starts at `£3.69M` median against `£4.40M/wk` wages+upkeep (**0.84 wks**); `EN` T2 **1.34 wks**; `SC` T1–T4 **0.74–1.06 wks**. | Because TV/position/prize money do not arrive every week (and `EN` T1 / `SC` T1–T4 run structural annual deficits anyway), upper-tier NPCs hit negative cash within Weeks 1–4 before mid-season gate receipts accumulate, triggering immediate distress/insolvency logic. |

### High

| # | Defect / Collision | Live Export Evidence | Code / Impact |
|---|---|---|---|
| **H1** | **`UPKEEP_TIER_FACTOR` & upkeep inflation are 100% dead code in runtime** | `economyWageModel: "turnover"` (`:216`) is live, yet every runtime upkeep caller omits `opts?.tier`: `src/engine/finance.ts:144`, `src/utils/npcFinances.ts:75`, `src/engine/FinancialProjectionService.ts:231`, `src/stores/facilityStore.ts:82,588`, `src/screens/facilities/FacilityCategoryScreen.tsx:100,180`, `src/components/ClubHealthBanners.tsx:118`. | `calculateFacilityUpkeep` (`src/utils/facilityUpkeep.ts:17-31`) falls back to `model: 'legacy'` whenever `opts?.tier` is omitted. Wiring it as currently written (`[3.0, 2.4, 1.9, 1.6, 1.4, 1.2, 1.1, 1.0]` in `src/economy/upkeep.ts:59`) would triple `EN`/`SC` T1 upkeep (`£3.6M → £10.9M/yr`) and charge `SC` T4 (bottom tier!) `1.6×` instead of `1.0×`. |
| **H2** | **4 zero-stand clubs + 100% zero-academy in `EN` T7–T8** | `npcFacilityLevelRanges[3]` (Band 4 = T7–T8, `:820-909`) sets all 4 stands to `0..1` and `youth_academy` / `scouting_center` to `0..0`. In the world pack, **4 clubs have 0 stands (0 capacity → £0 gate, £0 food, £0 season tickets)**: *Littlehampton Vale* & *Exmouth Albion* (`EN` T7), *Ramsgate Borough* & *Swinton Rangers* (`EN` T8). **31/31** `EN` T7–T8 clubs have `youth_academy = 0`. | Zero-stand clubs earn £0 matchday revenue until their AI buys a stand. Zero-academy clubs cannot produce youth intakes in `EN` T7–T8. |
| **H3** | **`gameConfig.squadSizeMin = 25` breaks AMP DOF auto-sell & contradicts `gameConfig.ts` fallback assumptions** | `gameConfig.squadSizeMin: 25, squadSizeMax: 35` (`:1037-1038`) vs `starterConfig.starterPlayerCount: 20` (`:2340`) and `starterConfig.npcSquadConfig` (`:2050-2139`: `playerMax` is `24, 23, 21, 20, 19, 18` for T3–T8). | 1) **AMP:** `src/engine/GameLoop.ts:3118` checks `if (activeSquadSize <= config.squadSizeMin) continue;` — silently disabling DOF auto-selling for any player club with ≤25 players (including a brand-new 20-player club).<br>2) **NPC fallback:** `npcSquadBand` (`src/types/gameConfig.ts:305-342`) assumes globals are `11/25`; while `GameLoop.ts:1765,2045` overrides `squadSizeMin` per tier via `normalizeNpcSquadConfig` (`src/types/gameConfig.ts:252-292`), any save missing `npcSquadConfig` on `GET /api/game-config` falls back to `25`, permanently blocking distress sales in `src/engine/NpcClubBrain.ts:514,666,702` for T3–T8. |
| **H4** | **AMP-only 20% player wage discount (`playerWageMultiplier: 0.8`)** | `gameConfig.playerWageMultiplier: 0.8` (`:924`). | Applied in `calculateWeeklyFinances` (`src/engine/finance.ts:121-123`) and `src/engine/FinancialProjectionService.ts:205` for AMP clubs only — `computeNpcWageBill` (`src/utils/npcFinances.ts:44-66`) ignores it, giving the user an asymmetric 20% structural wage advantage over every NPC club. |
| **H5** | **Season transition silently overrides user `transferBudgetPercent` to `20%`** | `gameConfig.transferBudgetPercent: 20` (`:1062`). | `src/engine/SeasonTransitionService.ts:5471-5472` unconditionally resets `useClubStore.setState({ transferBudgetPercent: configPct })` each season, overwriting the 30% default or any chairman-adjusted allocation down to 20%. |

### Medium

| # | Defect / Collision | Live Export Evidence | Code / Impact |
|---|---|---|---|
| **M1** | **`npcClubBalanceRanges[2]` (Tier 3) missing-zero typo** | `wunderkind-config-2026-11-20.json:512-515`: T3 `min: 10,000,000` (`£100k`) vs T4 `min: 50,000,000` (`£500k`). | Confirmed in world pack: `EN` T3 min (`£180,348`) < `EN` T4 min (`£511,009`); `SC` T3 min (`£12,279`) & median (`£54,082`) < `SC` T4 min (`£51,898`) & median (`£58,563`). |
| **M2** | **Inverted regression thresholds** | `regressionLowerThreshold: 10, regressionUpperThreshold: 5` (`:980-981`). | `lower > upper` inversion in live config. |
| **M3** | **`west_stand` upkeep 10× typo (`3,000p` vs `30,000p`)** | `FALLBACK_FACILITY_TEMPLATES` (`src/types/facility.ts:395-403`, mirrored from backend catalogue): `west_stand.weeklyUpkeepBase = 3000` (`£30`), while `north_stand`, `east_stand`, and `south_stand` are all `30000` (`£300`). | Makes West Stand upgrades 10× cheaper to maintain than the other three identical-capacity stands (a Level 10 West Stand costs `£1,730/wk` vs `£17,300/wk` for North/East/South). |
| **M4** | **Dead rows & non-monotonic curves in legacy fallback tables** | `bankruptcyDeductionTiers` (`:16-42`) still has `deficitMax: null` on row 3 (`£5,000.01+ → 10 pts`), leaving rows 4 & 5 (`20 / 50 pts`) unreachable under `legacy` (though inactive under `turnover`, where the newly populated `bankruptcyDeductionWeeks` `:43-69` is valid and contiguous). `wageMultiplierTiers` (`:1063-1084`) staff/player ratio is non-monotonic (`0.50 → 0.67 → 0.53 → 0.40`). | Only fires if `economyWageModel` ever flips back to `legacy` or a tier fails resolution. |

---

## 8. AMP Starter Club Economics (`EN` T8 vs `SC` T4)

From `starterConfig` (`wunderkind-config-2026-11-20.json:1100-2350`):
- **Default facilities (8 at Level 1):** 4 stands (`north/east/south/west_stand`) + `physio_clinic` + `training_pitch` + `scouting_center` + `youth_academy` → **5,000 seats**, weekly upkeep = **`£3,982/wk` (`£183,195/yr`)** unwired (`£6,372/wk` in `SC` T4 if `UPKEEP_TIER_FACTOR` were wired).
- **Upkeep vs. division turnover:** In **`EN` T8** (`£215,000` authored turnover), the starter 8-facility bundle alone costs **85.2% of authored turnover** (`£183.2k / £215k`) — nearly double the typical `EN` T8 NPC club's `£109k/yr` upkeep (because `EN` T8 NPCs have 0 academy, 0 scouting center, and 0–1 stands). In **`SC` T4** (`£2.07M` turnover), the same starter ground is only **8.8%** of turnover (and `£183k/yr` vs `SC` T4 NPCs' `£1.30M/yr` — a massive **7× upkeep advantage** for an `SC` human player over `SC` T4 NPCs).
- **Starting capital mismatch:** `starterConfig.startingBalance` is `£100,000` (25.1 weeks of starter upkeep alone before paying 20 players + 8 coaches + 4 key staff + 1 scout), whereas `userStartingBalanceMinPence..MaxPence` is **`£10,000,000–£20,000,000`** (`:2342-2343`, with `clubFundingMinimumPence: 0` `:1103`) — **46×–93×** `EN` T8 annual turnover.

---

## 9. Global 25-Country Pack Hygiene Summary

- **Ability band split:** Only **14/26** countries in `starterConfig.leagueAbilityRanges` carry the recalibrated `40–90 .. 2–7` ladder (`AR, BR, CA, DE, EN, ES, FR, IT, JP, NG, NL, PT, SC, US`). The remaining **12 countries** (`BE, CO, EG, GH, IN, KR, MX, PL, SA, TN, TR, WA`) still carry the legacy `75–95 .. 10–25` ladder.
- **Unscaled `tvDeal` on non-`EN` countries:** Except for `SC` (`0.10×`), all other 23 non-`EN` countries carry `EN`-scale `£300M` T1 `tvPoolPence` and `£100M` T1 `prizeMoney` (giving `KR`, which only has 79 clubs / 10 per tier, a `£30M` T1 `tvDeal` — higher than England's `£18.75M`).
- **Global zero-stand clubs:** Isolated to `EN` only (`4 / 3,127` clubs globally: 2 in `EN` T7, 2 in `EN` T8).
