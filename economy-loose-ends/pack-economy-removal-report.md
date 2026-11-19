<!-- STATUS --> **STATUS:** ✅ Pack economy removal (v11). DEPLOYED.

---

# REPORT — Take the economy out of the world pack

**Status: landed in both repos, committed, not pushed.** Two items in §8 could not be done and
are named as not done in "What I could not verify" below — neither is a code gap.

## 0. Code state

| | backend | app |
|---|---|---|
| repo | `wunderkind-backend` | `wunderkind-app` |
| branch | **`development`** | **`new-game-save`** |
| HEAD **before** my work | `714715785525d3cda38fdb06b3918ae30783a279` — 2026-11-18T20:54:34Z | `55be3ff08f904586926b9c8c0737d04ba481790d` — 2026-11-18T22:59:31Z |
| HEAD **after** (my commit) | `bac1228ba024b048aed2a7d7b845afdf8ac2dcd5` — 2026-11-19T00:15:13Z | `4706169bf5e30dbef2887cbb3750e2dffc8b726c` — 2026-11-19T00:15:43Z |
| vs remote before | **ahead 1, behind 0** | **identical to `origin/new-game-save`** |
| vs remote now | ahead 2, behind 0 (nothing pushed) | ahead 1, behind 0 (nothing pushed) |

```
$ git fetch origin development:refs/remotes/origin/development      # backend
$ git rev-list --left-right --count development...origin/development
1	0
$ git log --oneline origin/development..development
71471578 Author the re-derived economy (R2), and amend two of the gate's payout bounds
```

⚠️ **Two deviations from §0's expectations, both benign, both stated rather than worked around:**

1. **The backend's HEAD does not match its remote, and should not.** §0 asked me to "confirm each
   HEAD matches its remote". `development` is **ahead 1** of `origin/development` — the unpushed
   R2 authoring commit `71471578`, which is the commit this task's own §1 refers to ("after the
   R2 authoring bumped `WORLD_PACK_VERSION` to v10"). It is behind by 0, which is the part that
   matters: nothing is missing. `WORLD_PACK_VERSION` read 10 at that commit, confirming it as the
   right base. This is the expected result of the prior task's "commit, do not push".
2. **The backend repo was checked out on `dev`, not `development`.** `dev` was at `459dac4b`
   ("Merge development into dev: the re-derived economy (R2)"). I switched to `development` and
   worked there, per §0. No cherry-picking, no merging.

### The app's `new-game-save` is NOT behind `dev` — the §0 stop condition did not fire

§0 said to stop if it were. It is not, so I proceeded:

```
$ git rev-list --left-right --count new-game-save...dev
2	0
$ git log --oneline new-game-save..dev      # commits in dev that new-game-save lacks
                                            # (empty)
$ git log --oneline dev..new-game-save
55be3ff0 Merge dev into new-game-save: the economy work belongs here
78721502 Repoint .context at the consolidated economy doc
```

The brief described the 2026-11-18 state as "`dev` carries four commits `new-game-save` lacks".
That reconciliation **had already happened** by the time I started, in the merge commit
`55be3ff0` ("Merge dev into new-game-save: the economy work belongs here") — which is also why
the suite count moved (see §8.2). `dev` now carries nothing `new-game-save` lacks. Nothing was
decided for the owner.

---

## 1. What changed

### Backend — `bac1228b`

Money removed from the pack, at the sites §3 listed:

| where | keys removed | file |
|---|---|---|
| league | `tvDeal`, `sponsorPot`, `prizeMoney`, `leaguePositionPot` | `WorldInitializationService::buildLeagueSnapshot()` |
| club | `startingBalance` | `WorldPackSnapshotBuilder::buildClubSnapshot()` |
| club | `land.valuePence` | `WorldPackSnapshotBuilder::buildLandSnapshot()` |
| player | `contractValue`, `agent.commissionRate` | `WorldPackSnapshotBuilder::buildPlayerSnapshot()` (see below) |
| staff | `weeklySalary` | `WorldPackSnapshotBuilder::buildStaffSnapshot()` |

`leaguePositionDecreasePercent` stays — a rule, not an amount. `WORLD_PACK_VERSION` 10 → 11, with
the docblock recording that this is the last bump money ever causes.

Nothing is priced at generation: `WorldPackClubGenerationService::buildPlayer()` lost its
`WageModelResolver::playerWeeklyPence()` call and the "packs hold wages" comment governing it.
I also removed the `$country`/`$tier`/`$clubReputation` plumbing that existed *only* to feed that
call (through `generatePlayers()` and its three callers), and the now-dead `WageModelResolver` and
`LeaguePayoutResolver` injections. Leaving them would be an invitation to put the pricing back.
`generateStaff()` keeps country and tier — `StaffGenerationService` still writes
`staff.weekly_salary` for its non-pack consumers.

**§4.3 confirmed:** no new endpoint. `GET /api/initialize/leagues` already existed, uncached, and
already returned `prizeMoney`/`leaguePositionPot` via `LeaguePayoutResolver` plus `tvDeal`,
`tvPoolPence`, `clubCount`, `parachute`.

### App — `4706169b`

- **`src/economy/packWages.ts`** (new) — the one place a pack row is priced. Never returns 0;
  every fallback it takes is reported.
- **Both ingestion sites**, as §5.5 required: `useInitFlow`'s `worldPlayerToPlayer` (the
  founder's squad) and `playerUtils`' `normalizeRawWorldPlayer` (every NPC). The unit boundary
  was respected — `Player.wage` is pence and nothing is pre-divided; `playerToRow` still does
  the `/100`.
- **Balances** — deleted the pack preference in `worldStore.buildWorldLeagueClubs`. The existing
  `npcStartingBalanceByTier` ladder it always shadowed is now the only source. No new code, no
  endpoint, no server load.
- **Staff** — a tier-aware rung in `resolveWorldStaffWagePence`, below `weeklySalary` and above
  the legacy heuristic. See "The staff rung" below.
- **Sponsor pot** — rolled at init by `rollLeagueSponsorPot`. See §5.8 below.

**§5.6 verified, not rebuilt:** `ensureConfigOrFail()` does gate the flow before the starter pack
is fetched, and `useGameConfigSync` does re-fetch on a no-country fallback. The tier comes from
`startingLeagueTier(config)`. Income anchoring contributes nothing at init by construction
(`ampWageScaleMicroPence` returns `undefined` without a `seasonBudget`) — left as the intended
shape, not filled in.

---

## 2. The three judgement calls worth reviewing

### The player strip happens at the pack boundary, not in the shared serializer

§3 located `contractValue` in `PlayerSnapshotSerializer::serialize()` and `commissionRate` in
`Agent::toSnapshotArray()`. **Neither key could be removed there.** That class is the canonical
shape for `/api/scout/search`, `/api/players/foreign` and `/api/players/youth`, which serve
shared-pool rows priced at SERVE time by `Economy\ServeTimePlayerPricer` — a browse row with no
price is not a browsable player. And §10 forbids re-pricing inside it.

So the money is unset at the pack boundary, in `WorldPackSnapshotBuilder::buildPlayerSnapshot()`,
which is the only seam satisfying both constraints. `Agent::toSnapshotArray()` carries a warning
not to "finish the job" by deleting the key there.

`WorldPackCarriesNoMoneyTest` pins the invariant from the pack side **and** pins that the shared
serializer still prices — so the plausible wrong fix fails a test rather than shipping.

### §5.8 — the money leaves, the count arrives

I reached the §5.8 gap independently before the brief was updated to rule on it: the endpoint
returns **no `sponsorPot`**, so dropping the pack's key alone would have zeroed league
sponsorship. Implemented as ruled:

- backend publishes **`sponsorCount`** (the authored column) and **`sponsorSizes`** (the real
  roster counted off `LeagueSponsor` rows, upper-cased for the app's `CompanySize`, `null` rather
  than `{}` when none are sourced, since the app treats a present value as authoritative);
- the app rolls the pot at init via `rollLeagueSponsorPot` — the same call
  `SeasonTransitionService` already made at every later season boundary. Season 1 was the only
  one taking a server figure.
- **Not `?? 0`.** A league with a genuine `sponsorCount` of 0 still rolls 0, which is a real
  state; a missing count is not tolerated.

⚠️ **`rollLeagueSponsors()` is still called at both pack-build sites, for its side effect only.**
The pot left the payload, but the call mutates each `LeagueSponsor::$rolledValue`, which is
country-wide server state `SyncService.php:815` sums for an existing save. Deleting the call to
tidy away a now-unused variable would have left every sponsor rolled at 0 on the sync surface — a
different bug in a different payload. Both call sites say so in a comment.

### The staff rung (§5.7)

The chain was `salary ?? anchored ?? weeklySalary ?? ability × 100`. With `weeklySalary` gone and
`anchored` structurally unavailable at init, `ability × 100` would have become the answer for
every staff member in the pyramid.

The backend's own `turnoverStaffPence` could not be mirrored: it needs role bands,
`economyWageToTurnoverRatioBp` and `economyStaffWageShareBp`, none of which are published to the
app. So the rung derives from what *is* in hand — the tier's authored scale applied as if to a
player of that ability, times the authored `staffMultiplier / playerMultiplier` ratio for that
ability band. That ratio is the only published statement of what a staff member is worth relative
to a player, and it is the relationship the legacy model already used.

**It lands where the budget model says it should**, which is how I checked the shape was right: at
the shipped multipliers the ratio is 1.0 across the mid band, so a tier-8 club with ~22 players
and ~5 staff spends ~23% of its player bill on staff — against the 25% `STAFF_WAGE_SHARE_BP`
reserves and the variant gate validates. It returns `undefined` for an unauthored tier, so an
unauthored backend behaves exactly as before.

---

## 3. Two bugs found on the way — both would have been silent

### `computeNpcWageBill` would have reported a zero player wage bill for every club

`npcFinances.computeNpcWageBill` summed only `p.contractValue` — the **legacy alias**. It worked
by accident: a priced pack row carried `contractValue` through `normalizeRawWorldPlayer`'s spread.
After v11 an ingested NPC has `wage` and no `contractValue` at all, so **every club in the pyramid
would have reported a player wage bill of 0 for a whole session** — then silently started working
again after a restart, because `playerFromRow` populates both fields off the one column.

Not cosmetic: `buildNpcAffordabilityBase` is built on this function, and its own docblock records
what too low a wage bill does — the gate "consistently believed clubs were richer than they were
and waved through signings that drained them". Fixed to `wage ?? contractValue`, the idiom
`GameLoop`, `MarketEngine` and `playerMapper` already use. `PyramidNewsService` had the identical
read and the identical fix.

### `seededRng`'s first draw is nearly seed-independent

Seeding the per-contract draw exposed this. Measured across six player-id seeds:

| seed | 1st draw | 2nd draw |
|---|---|---|
| `pack-wage-L-p1` | 0.6405019552912563 | 0.7531991512514651 |
| `pack-wage-L-p2` | 0.6416646125726402 | 0.0253104467410594 |
| `pack-wage-L-p3` | 0.6412770601455122 | 0.9346066815778613 |
| `pack-wage-L-p4` | 0.6424397174268961 | 0.2067179770674556 |
| `pack-wage-L-p5` | 0.6420521649997681 | 0.1160142119042575 |
| `pack-wage-L-p6` | 0.6432148222811520 | 0.3881255073938519 |

A spread of 0.003 on the first draw; properly uniform on the second. `hashId` maps near-identical
strings to near-identical seeds and one step does not decorrelate them.

Taken straight this **would have defeated the per-contract draw** — every player in a squad landing
on the same point of the ±8% band — while still producing plausible, non-zero wages, which is
exactly why it would never have been noticed. `packWages.ts` discards two opening draws and
records the measurement. The guard test `draws per contract rather than once per squad` is what
caught it, and it fails without the fix.

⚠️ **The same bias affects `seededRng`'s other callers** — `clubIdentity`'s
`npc-identity-<clubId>` and every appearance fallback, where the first draw makes a visible
choice. **Deliberately not changed:** it would re-roll the identity and face of every club and
person in every existing save. Flagged for its own pass, recorded in both `.context` entries.

---

## 4. Guards (§6)

**New, backend — `tests/Service/WorldPackCarriesNoMoneyTest.php`** (5 tests, 2,231 assertions).
A recursive scan over the real club payload (club → land, players → agent, staff, scouts) and the
league payload, with two independent checks: a literal list of the nine keys v11 removed, and a
suffix scan (`*Pence`, `*Balance`, `*Salary`, `*Wage`, `*Money`, `*Pot`, `*Price`, `*Fee`,
`*Cost`, `*Budget`, `*Deal`, `*Value`, `*Rate`) so a key nobody has thought of yet also fails.
It also pins the opposite direction — that the shared serializer still prices for browse.

**I verified the guard can fail**, since one that cannot is worthless. Re-adding
`startingBalance` to `buildClubSnapshot`:

```
1) App\Tests\Service\WorldPackCarriesNoMoneyTest::testAClubSnapshotCarriesNoMoneyAnywhereInIt
club.startingBalance is a money key v11 removed — see this test's docblock before re-adding it
Failed asserting that an array does not contain 'startingBalance'.
```

Reverted, and green again (`OK (5 tests, 2231 assertions)`).

**New, backend — `tests/Controller/InitializeLeaguesSponsorCensusTest.php`** (4 tests): the count
is published, `sponsorSizes` counts the real roster with app-cased keys, it is `null` rather than
empty when no sponsors are sourced, and the endpoint still publishes no pot.

**New, app — `src/__tests__/economy/packIsACensus.test.ts`** (16 tests). §6 was right that
**nothing anywhere asserted an ingested player's wage.** It covers: a priced row is never free; an
ingested pack player has a non-zero wage; a 22-man unpriced squad has no £0 contract anywhere; a
degenerate input still prices; an already-priced row keeps its price (both the serve-time and the
SQLite case); determinism and per-contract variation; the band; and the staff rung including
monotonicity and the unauthored-backend fall-through.

### Tests changed deliberately, with the reason written into each

| test | what changed |
|---|---|
| `PlayerSnapshotShapeConsolidationTest` | `contractValue` removed from `LEGACY_WORLDPACK_KEYS`. ⚠️ Its docblock says these arrays are historical records that must never be edited — I added a block saying the rule was broken on purpose, once, why this is not the breaking change the rule exists to stop, and that it is **not a precedent**. `LEGACY_BROWSE_KEYS` is untouched and still contains the key. `testBothPathsAgreeOnEveryKeyExceptGuardians` → `…AndThePrice`, still an exact assertion so a *third* divergence fails. |
| `WorldPackLandSnapshotTest` | `startingBalance` out of the club key list (plus an explicit `assertArrayNotHasKey`); three `valuePence` assertions inverted rather than deleted — including `testAPlotOverrideBeatsTheTownValue` → `testAPricedPlotStillPutsNoPriceInThePack`, because a priced plot is the fixture most likely to put a price back. |
| `StarterPackServiceTest:270` | `testGeneratedPlayersCarryAWage` → `…CarryNoWageBecauseTheDevicePricesThem`. The old test's real content — that the founder's squad follows the same model as its division — is now structural rather than dependent on two call sites passing the same arguments. |
| `WorldPackClubGenerationServiceTest:148` | `testGeneratePlayersSetsContractValue` → `…LeavesThemUnpricedForTheDeviceToPrice`, asserting the 0 default *because* it is never serialised and never read. |
| `WorldInitializationAgentAssignmentTest` | agent shape asserted as the shared shape **minus one named key**, so it still fails if the shared shape changes otherwise. (Not in §6's list; a real consequence.) |
| `WorldInitializationTierPackAgentTest` | pack agent key list loses `commissionRate`. (Not in §6's list; same cause.) |
| `npcFinances.test.ts:122` | *"treats missing contractValue as 0"* asserted the defect. Replaced by two tests for the real contract (`wage` first, legacy alias still honoured) plus one keeping the only assertion still worth making, named as a degenerate input. |

### ⚠️ `LegacyNewGameFlowTest:37-48` needed no change, and I did not change it

§6 listed it. It passes untouched, and should: both its `startingBalance` assertions are the
**AMP's own club balance** from `GET /api/starter-config` and `POST /api/club/initialize`'s
`starterBundle` — config and club-creation surfaces, not pack content. §5.9 says as much ("the
player's own club already works this way… `starterConfig.startingBalance`"). Weakening a
compatibility test to match a list would have removed a real guard. Flagging rather than acting.

---

## 5. Verification

### §8.1 Backend — full `phpunit`

```
Tests: 3258, Assertions: 156025, Failures: 6, PHPUnit Deprecations: 1, PHPUnit Notices: 21, Skipped: 13
```

**Six failures; none is mine.** `environment.md` records a baseline of four pre-existing failures,
and insists a failure be checked the way #4 was checked — stash and re-run. I did that.

| # | failure | verdict |
|---|---|---|
| 1 | `NotificationLogCrudControllerTest` | documented baseline #1 (empty content table) |
| 2 | `CompetitionControllerTest`, narrative timeline | documented baseline #2 |
| 5 | `FriendlyResolveSingleMatchTest` | documented baseline #3 |
| 4 | `NpcClubForeignClubsCitySizeTest::testFindForeignClubsHandlesDefaultCitySizeFields` | documented baseline #4 (environmental, shared DB) |
| 3 | `NpcClubForeignClubsCitySizeTest::testFindForeignClubsReturnsCitySizeFields` | **same class, second method — the baseline names only one of the two.** Same environmental cause, and the two *alternate* by run composition: stashed-in-isolation, #4 failed and #3 passed; with my changes in isolation, #3 failed and #4 passed. My change touches no `NpcClub` repository query. |
| 6 | `WorldOverviewServiceTest::testMoneyIsConvertedToPoundsAndNullsSurvive` | **pre-existing but NOT in the baseline list.** Established by stash: with all my changes stashed it fails identically (`an unset tier must stay null, not become 0 / Failed asserting that 200000000 is null`). See "Flagged, not fixed". |

```
$ git stash push -u -m "pack-economy backend WIP"
$ lando php bin/phpunit --no-coverage tests/Repository/NpcClubForeignClubsCitySizeTest.php \
      tests/Service/WorldOverviewServiceTest.php
2) App\Tests\Service\WorldOverviewServiceTest::testMoneyIsConvertedToPoundsAndNullsSurvive
an unset tier must stay null, not become 0
Failed asserting that 200000000 is null.
Tests: 12, Assertions: 31, Failures: 2.
$ git stash pop
```

The 28 test files touching any changed surface, plus the two new ones, run green together:
`OK (222 tests, 5781 assertions)`.

**`app:economy:wage-table` unchanged — byte-identical, not asserted:**

```
$ diff wage-table-before.txt wage-table-after.txt      # (no output)
65c0ebfe8c2e50e95257ef2920306cbf  wage-table-before.txt
65c0ebfe8c2e50e95257ef2920306cbf  wage-table-after.txt
```

Both dumps are in `pack-economy-run-2026-11-18/`. "Before" was produced by stashing my changes.

### §8.2 App — `tsc` and `npm test`

```
$ npx tsc --noEmit
(no output, exit 0)

$ npx jest --listTests | wc -l
     637

$ npm test
Test Suites: 637 passed, 637 total
Tests:       3 skipped, 10647 passed, 10650 total
Time:        174.85 s
```

**Suite COUNT confirmed: 637 = 637.** The figure reconciles exactly rather than being accepted on
trust: `dev` was 636 / 10,629, this branch is that tree (via the `55be3ff0` merge) plus **one
suite** (`packIsACensus.test.ts`) and **18 tests** — 16 there, net +2 in `npcFinances.test.ts`
where one assertion became three. 636 + 1 = 637; 10,629 + 18 = 10,647. ✓

`CLAUDE.md`'s branch row and its owner doc
(`.context/stages/01_overview/output/environment.md`'s green-master bar) are both updated. Note
**`CLAUDE.md` is gitignored in this repo** (its own header says so), so that edit is deliberately
not in the commit — the tracked home is `.context`, and the mirror is one-way.

### §8.3 The economy gate did not move — byte-identical

```
$ npx tsx scripts/economy/variantGate.ts \
    --export   docs/economy-loose-ends/r2-run-2026-11-18/game-config-en.LOCAL.json \
    --starter-config docs/economy-loose-ends/r2-run-2026-11-18/starter-config.LOCAL.json \
    --world    docs/economy-loose-ends/pre-r2-exports/world.2148.json \
    --country EN

$ diff gate-before.txt gate-after.txt      # (no output)
f81d5b80421ff5dd82c63025888cb438  gate-before.txt
f81d5b80421ff5dd82c63025888cb438  gate-after.txt
```

Identical, as §8.3 requires — the gate reads config and a world export, not packs. "Before" was
produced by stashing my changes and re-running the same command. Both dumps are in
`pack-economy-run-2026-11-18/`.

⚠️ **The absolute COVERAGE figures in those dumps are not comparable to `r2-closeout-report.md`'s
table**, because I paired the R2 `LOCAL` config exports with the only world export available here
(`pre-r2-exports/world.2148.json`, a pre-R2 ground). That mismatch is why COVERAGE reads 59.8% →
1593.2% rather than the closeout's 83.1% → 105.4%. It does not affect the check being made: §8.3
asks whether **my change** moves the gate, and the identical invocation on both trees answers that
exactly. Judging the economy itself needs the matching world export.

### §8.5 The payoff — demonstrated as a test

§8.5 called this "directly testable", so I made it a test rather than only a device observation.
`packIsACensus.test.ts` → `THE PAYOFF: re-authoring an economy figure needs no pack rebuild`:
the **same pack row**, not regenerated and not re-fetched, prices differently once the tier's
authored scale moves (3× the scale → ~3× the wage), and the staff rung follows. No
`WORLD_PACK_VERSION` bump, no regeneration.

---

## 6. What I could not verify

**§8.4 — a real save on dev.** Not done, and not doable from here without breaking §10. It needs
the app running against a dev backend that carries v11, and v11 is committed-not-pushed, so
`api.dev.buildmyclub.co.uk` is still serving v10 packs with money in them. Pointing the app at the
local Lando backend instead would need a device or emulator session. **This is the one check that
can only be done by the owner**, and it is the check that matters most: a new tier-8 game, squad
wages plausible and non-zero, **no player on a £0 contract**, NPC balances from the config ladder,
and a sane wage bill on the first weekly tick. The unit guards cover the pricing arithmetic and
the never-zero guarantee; they cannot cover the real payload shape end to end.

**§8.5 on dev** — the no-bump demonstration against a real re-authoring on dev has the same
blocker. It is proven as a test (above), which is the part that does not need a deploy.

---

## 7. Flagged, not fixed

Per §9 I did not restructure, prune or rewrite earlier `.context` entries, and did not delete
superseded sections — the superseded pricing ruling and the parked item are both left in place,
marked, with the new rule above them.

1. **`WorldOverviewServiceTest::testMoneyIsConvertedToPoundsAndNullsSurvive` is a fifth
   pre-existing failure missing from `environment.md`'s known-failures list.** Established by
   stash, not assumed. The list is dated 2026-11-16 and the R2 authoring landed after it, so the
   baseline is one entry stale — and `NpcClubForeignClubsCitySizeTest` should name **both** its
   methods, since which one fails alternates with run composition. I left the list alone: it is
   `01_overview` text that my change did not make wrong, and §9 gives `.context` status to the
   project-manager session.
2. **`seededRng`'s first-draw bias reaches `clubIdentity` and every appearance fallback** (§3
   above). Not changed, because fixing it would re-roll the identity and face of every club and
   person in every existing save. Wants a deliberate pass with that cost accepted.
3. **`worldStore.setFromWorldPack` is dead for the live init flow.** Nothing outside
   `worldStore` and tests calls it (`useInitFlow` uses `hydrateWorldFromPersistedLeagues`). I
   updated its types for v11 rather than deleting it, since removal is a separate decision.
4. **The brief's §6 list named `LegacyNewGameFlowTest:37-48`**, which needed no change (§4
   above) — a different `startingBalance` from the pack's.

## 8. Files

Reports and dumps live here, outside both repos, as §9 requires. Scratch work stayed in the
session scratchpad.

- `pack-economy-removal-report.md` — this file
- `pack-economy-run-2026-11-18/wage-table-{before,after}.txt`
- `pack-economy-run-2026-11-18/gate-{before,after}.txt`

I also fixed §7.13's two stale pointers, in `next-work-plan.md` and `device-pass-2026-11-18.md`:
both said the record was in "`REMAINING-WORK.md`'s PARKED section", which does not exist —
`REMAINING-WORK.md` has no PARKED section at all. Both now point at
`wunderkind-app/.context/stages/07_synthesis/output/current-focus.md`, and both note the item has
shipped. `next-work-plan.md`'s copy also repeated the **void** `drawWeeklyWagePence` constraint,
which is now struck there too.
