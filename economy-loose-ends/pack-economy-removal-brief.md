<!-- STATUS --> **STATUS:** ✅ Pack economy removal — `WORLD_PACK_VERSION` 11. DEPLOYED 2026-11-19.

---

# TASK — Take the economy out of the world pack

**Both repos, one cut.** `wunderkind-backend` on **`development`**, `wunderkind-app` on
**`new-game-save`**. ⚠️ **Economy work does not go on the app's `dev` branch**, whatever the recent
git log there suggests — `dev` already carries economy commits from a past mistake and is a deploy
branch, not where this is authored. The backend stops baking money into packs and the app starts
pricing at
initialisation, and **these must land together** — there is no fallback window by design, so a
backend that has dropped the keys and an app that still reads them would price every squad at zero.
**Commit on each side; do not push.**

## 0. Code state (do first)

`git fetch origin` with explicit refspecs in both repos and confirm each HEAD matches its remote —
**`origin/development` in the backend and `origin/new-game-save` in the app.** State both branches,
full hashes and dates at the top of your report. A report without them is not accepted.

⚠️ **If the app's `new-game-save` is behind `dev`, say so and stop rather than deciding for
yourself.** As of 2026-11-18 `dev` carries four commits `new-game-save` lacks (a harness
reference-squad fix and three `.context` records) and `new-game-save` carries one `dev` lacks. Which
way those reconcile is the owner's call, not a merge you make on the way to this task.

Both repos use ICM: read `.context/CONTEXT.md` and the relevant stage's `output/` before raw source.

## 1. Why

A world pack bakes money. `useInitFlow.ts:244` ingests `wage: wp.contractValue ?? 0` — the
backend's figure verbatim — so whichever wage model priced a pack is what a save runs on for its
whole first season, while `src/economy/wages.ts` prices everything only from the first renewal
onward. **Two sources for one quantity.**

The cost is measured: after the R2 authoring bumped `WORLD_PACK_VERSION` to v10, the Worldpack
Cache screen read **256 tier payloads, 208 stale, 48 at v10** — 81% of the cache invalidated by
authoring a turnover table. Of the last five version bumps, **v6 (sponsor bands), v7 (payout
ladders) and v8 (staff pay) were purely money** and would not have happened under this change.

**The owner's design, 2026-11-18:** the pack becomes *"truly what it needs to be — a test of teams,
players and staff"*. Identities, squads, abilities, facilities, personalities. Everything monetary
is a function of live config, resolved on the device at init.

## 2. Decisions already taken — do not re-open these

| | |
|---|---|
| **Scope** | All money leaves the pack |
| **Determinism** | Draw per contract, RNG seeded from the pack id |
| **Balances** | Derived on device from config — explicitly no new server load |
| **Rollout** | One cut, `WORLD_PACK_VERSION` 10 → 11 |

⚠️ **A recorded constraint is VOID and you will trip over it.**
`wunderkind-app/.context/stages/07_synthesis/output/current-focus.md:491-500` says to avoid
`drawWeeklyWagePence` because *"two devices building the same pack would produce different squads"*.
`8ff2e5fd` made a `WorldPackSet` single-use, claimed by exactly one club and never served twice, so
**that scenario cannot occur** (owner confirmed). `drawWeeklyWagePence` already takes an injected
`rng` (`wages.ts:263`) — seed it from the pack id. **Strike the stale constraint as part of this
work rather than leaving it to mislead the next reader.**

## 3. The money in a pack today — the complete list

| where | key | file |
|---|---|---|
| league | `tvDeal`, `sponsorPot`, `prizeMoney`, `leaguePositionPot` | `WorldInitializationService::buildLeagueSnapshot()` :298-306 |
| club | `startingBalance` | `WorldPackSnapshotBuilder::buildClubSnapshot()` :99 |
| club | `land.valuePence` | `buildLandSnapshot()` :166 |
| player | `contractValue` | `PlayerSnapshotSerializer::serialize()` :63 |
| player | `agent.commissionRate` | `Agent::toSnapshotArray()` :78 |
| staff | `weeklySalary` | `buildStaffSnapshot()` :198 |
| scout | — | **already money-free by design** |

**The scout block is your worked example.** It ships no wage; the app derives one from `experience`
via `fallbackScoutWeeklyWagePence` (`staffWages.ts:46-50`), mirroring the backend's
`ScoutWageCalculator`. This task is that pattern applied to the rest.

`leaguePositionDecreasePercent` is a *rule*, not an amount — it stays. The ticket ladder is already
published-only and in no pack.

## 4. Backend

1. **Drop the money keys** at the sites in §3.
2. **Stop computing them at generation.** `WorldPackClubGenerationService::buildPlayer()` :188-195
   loses its `WageModelResolver::playerWeeklyPence()` call — and the *"packs hold wages"* comment at
   :187 that governs it. `StaffGenerationService` keeps writing `staff.weekly_salary` for its
   non-pack consumers; it simply stops reaching the pack.
3. **`GET /api/initialize/leagues` needs NO work** — it already exists, is uncached, and already
   returns `prizeMoney`/`leaguePositionPot` resolved through `LeaguePayoutResolver` plus `tvDeal`,
   `tvPoolPence`, `clubCount` and `parachute` (`InitializeController.php:212-279`). Do not build a
   new endpoint.
4. **`WORLD_PACK_VERSION` 10 → 11**, with the docblock recording that this is the last bump money
   ever causes.

## 5. App

5. **Two ingestion sites, not one**: `useInitFlow.ts:244` (the player's club) and
   `playerUtils.ts:64`'s `normalizeRawWorldPlayer` (every NPC). Both price through
   `weeklyWageRange`/`drawWeeklyWagePence` with `resolveEconomy(config, tier)`.
   ⚠️ **Unit boundary**: `Player.wage` is pence; `playerToRow` divides by 100
   (`playerMapper.ts:207`) because the column is whole pounds.
6. **The prerequisite is already met — verify, don't rebuild.** `ensureConfigOrFail()` gates the
   flow at `useInitFlow.ts:1672` before the starter pack is fetched, and re-fetches when the stored
   block is a no-country fallback (`useGameConfigSync.ts:73-76`). The tier is available via
   `startingLeagueTier(config)` (`perTierEconomy.ts:127`).
   ⚠️ **Income anchoring cannot contribute at init**: `ClubWageScaleService.ampWageScaleMicroPence`
   returns `undefined` without a `seasonBudget`, which does not exist before the first season
   transition. Init prices from the tier's authored scale; anchoring takes over at renewal. That is
   the intended shape, not a gap to fill.
7. **Staff.** Both init sites (`useInitFlow.ts:281`/`:311`, `worldStore.ts:566`) call
   `resolveWorldStaffWagePence` with no anchored figure, so the chain is
   `salary ?? weeklySalary ?? ability × 100`. With `weeklySalary` gone it falls to that legacy
   heuristic — **give it a proper tier-aware rung instead of letting `ability × 100` become the
   silent answer.**
8. **League money.** The app sources it from `/api/initialize/leagues`
   (`useInitFlow.ts:1493-1509` upserts `tvDeal`/`sponsorPot`/`prizeMoney`/`leaguePositionPot` from
   that endpoint, and `:823-827` re-hydrates from the persisted row).

   ✅ **RULED 2026-11-18, after the §5.8 check found the gap — implement this, do not re-derive it.**
   `/api/initialize/leagues` returns **no `sponsorPot`** (verified against
   `InitializeController.php:233-262`: id, tier, name, country, promotionSpots, reputationTier,
   tvDeal, prizeMoney, leaguePositionPot, tvPoolPence, clubCount, parachute, trophy). So dropping
   `sponsorPot` from the pack with no other change would zero league sponsorship.

   ⚠️ **CORRECTED, same day — the first version of this ruling was wrong, and the implementing
   session caught it.** It said the device should roll the pot at init from `sponsorCount` + the
   bands. That would have created a second source for the quantity it was meant to unify:
   `LeagueSponsor::rolledValue` is a **persisted column** (`SponsorBandResolver::rollLeagueSponsors()`
   sets it per row), and **`SyncService::buildLeagueSnapshot()` sums those rows into `sponsorPot` on
   every sync**. A device that rolled its own pot would disagree with what sync reports, forever.

   **So: the roll stays server-side; only the pack KEY goes.** `/api/initialize/leagues` returns a
   **resolved** `sponsorPot` — the sum of the persisted `rolledValue`s, exactly as `SyncService`
   already computes it — alongside the `prizeMoney`/`leaguePositionPot` it already resolves. Not a
   cached pack value, so no `WORLD_PACK_VERSION` bump; the same figure sync reports, so no
   divergence. **The app does not roll at init.** `rollLeagueSponsorPot`
   (`src/utils/leagueFinances.ts:57`) stays what it is: the season-transition re-roll, a different
   event.

   **The principle this refines, which is worth carrying into §7's records.** "Money is resolved,
   never cached" was too blunt. The test is not *is it money?* but **was it derived, or was it
   drawn — and who owns the thing it belongs to?** A figure derived from dials (a wage from ability
   × scale) can be recomputed anywhere and always agrees. A figure that was *drawn* is a fact from
   the moment it is rolled, and only its owner may hold it. The existing authority boundary already
   decides who that is: **the device owns club state, the backend owns world data.** So a squad's
   wages resolve on the device (club state, synced up) and a league's sponsor pot resolves on the
   backend (world data, synced down). Neither is cached in a pack; neither gets a second source.

   ⚠️ **Do not let it fall through to `?? 0` instead.** `useInitFlow.ts:800` records what happened
   last time this field hard-zeroed: *"season-1 position prizes paid at full pot for every finishing
   position."* The fix is to supply the count, not to tolerate the absence.
9. **Balances — the ladder is already written.** `worldStore.ts:590-593` reads
   `startingBalance ?? npcStartingBalanceByTier[tier] ?? …`. Delete the pack preference and the
   existing tier-scaled config ladder takes over. No endpoint, no server load. The player's own club
   already works this way (`useAuthFlow.ts:167` reads `starterConfig.startingBalance`).

## 6. The guards — the most important section

⚠️ **`?? 0` is the defect, and it is currently pinned as CORRECT.** The ingest filter at
`useInitFlow.ts:905-919` rejects players for zero attributes, missing potential and a bad
personality — it does **not** check `contractValue`. And `npcFinances.test.ts:122` asserts "treats
missing contractValue as 0". Meanwhile `wages.ts:243-246` states *"a wage of 0 is the one answer
that must never be produced silently"* and `staffWages.test.ts:86-90` pins "treats a 0 wage as
absent, not as a free scout". **The player ingest path is the one place lacking the principle the
rest of the codebase states.** The harm is concrete: `PlayerConversationService.ts:133` divides by
the wage (0 floors to 1 → an enormous ratio) and `useWeeklyTick.ts:820` makes severance `wage × 4`
(0 ⇒ a free release).

**Add two guards:**
- backend: a test asserting **no pack payload carries any money key** — the invariant this change
  buys, and what stops money creeping back one key at a time;
- app: a test over `worldPlayerToPlayer` pricing. **Nothing anywhere currently asserts an ingested
  player wage.**

**Change these deliberately, with the reason written into the test — never silently:**
`PlayerSnapshotShapeConsolidationTest`'s `LEGACY_WORLDPACK_KEYS` (⚠️ its docblock says these arrays
are historical records that must never be edited to match new output — this change makes that
deliberately untrue, so say so there), `WorldPackLandSnapshotTest`'s club key list,
`StarterPackServiceTest:270` (*"a generated player must be priced"*),
`WorldPackClubGenerationServiceTest:148`, `LegacyNewGameFlowTest:37-48`, `npcFinances.test.ts:122`.

## 7. Record the rules

10. **Rewrite the two-sided pricing ruling**,
    `wunderkind-backend/.context/stages/01_overview/output/tribal-knowledge.md:185-193` — *"generated
    populations are priced once at generation and stored"* becomes: nothing is priced at generation;
    everything is priced at read. Carry `architecture-notes.md:243-247` with it.
11. **Extend the BINDING rule**,
    `wunderkind-app/.context/stages/01_overview/output/tribal-knowledge.md:423-430`: **the pack is a
    census, not a price list.** Re-mirror into `CLAUDE.md` — one-way, `.context` wins.
12. **Record the ability-band outlier**, as the owner asked: `starter_config.league_ability_ranges`
    stays backend-authored because band and wage scale are one system —
    `EconomyScaleResolver::wageScaleMicroPence()` sums `ability^k` across that tier's authored band —
    and `AbilityRangeParityTest` already pins the published table as *derived* from it,
    directionally. Note the wrinkle: the app's engine reads the published
    `leaguePlayerAbilityRanges` (`NpcClubBrain.ts:563`, `GameLoop.ts:1534`,
    `SeasonTransitionService.ts:3228`) while the harness refuses it (`loadExport.ts:112` throws);
    the parity test is what makes both safe.
13. **Fix two stale pointers** — `next-work-plan.md:274` and `device-pass-2026-11-18.md:108` both say
    "REMAINING-WORK.md's PARKED section" and do not resolve. The record is at
    `wunderkind-app/.context/stages/07_synthesis/output/current-focus.md:472-503`.

## 8. Verification

1. **Backend**: full `phpunit` green, including the updated shape tests and the new
   no-money-in-a-pack guard. `app:economy:wage-table` unchanged — this touches no authored figure.
2. **App**: `npx tsc --noEmit` clean; `npm test` green with the suite **COUNT** confirmed
   (`npx jest --listTests | wc -l` equals it), and `CLAUDE.md`'s branch row updated if it moves.
3. **The economy gate must not move.** `scripts/economy/variantGate.ts` reads config and a world
   export, not packs, so COVERAGE must be **byte-identical** before and after. If it moves,
   something priced differently than intended — stop and report.
4. **A real save on dev**: new tier-8 game; squad wages plausible and non-zero, **no player on a £0
   contract**, NPC balances coming from the config ladder, and a sane wage bill on the first weekly
   tick.
5. **Demonstrate the payoff**: re-author one turnover value on dev and confirm **no
   `WORLD_PACK_VERSION` bump and no regeneration** is needed for it to reach a new save. That is the
   whole point of the change and it is directly testable.

## 9. Reporting, scratch files and `.context`

⚠️ **Nothing scratch-shaped goes inside either repository.** Reports, traces, gate dumps and working
notes live in `/Users/courtneyadesile/Documents/WunderkindFactory/docs/economy-loose-ends/`, which is
outside both repos. Yours is **`pack-economy-removal-report.md`**. Throwaway work goes in your own
scratchpad directory.

**`.context` carries what is now true; the report file carries what proves it.** Paste commands and
their output **verbatim** — not a summary. "Tests extended" in place of a run has already cost this
project a round.

**`.context` status and review are owned by the project-manager session.** Append your own pass
entry to `shared/last-sync.md` and correct stage text your change makes wrong — §7 above is
explicitly in scope. Do **not** restructure a file, prune or rewrite earlier entries, or delete a
superseded section even when it is visibly wrong: flag it in your report instead.

## 10. Do not

- **Do not land one repo without the other.** There is no fallback window; the cut is atomic.
- **Do not build a new endpoint** — `/api/initialize/leagues` already does the job.
- **Do not add server load.** The owner's explicit constraint: balances and wages derive on device
  from config already in hand.
- **Do not touch `starter_config.league_ability_ranges`** or any authored economy figure — no
  turnover, no ratio ladder, no sponsor band, no TV.
- **Do not re-price inside `PlayerSnapshotSerializer`** — it is shared with other surfaces, and
  `architecture-notes.md:243-247` forbids it.
- Do not push, and do not cherry-pick between branches.
