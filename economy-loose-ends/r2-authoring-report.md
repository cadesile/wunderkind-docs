<!-- STATUS --> **STATUS:** ✅ R2 authoring. COMPLETE.

---

# R2 authoring — report (2026-11-18)

**Branch `development`, commit `740f2c8e7ae988653dbe883376aaaf0baad2d102`, dated 2026-11-18
(12:34:17Z).** HEAD equals `origin/development` after `git fetch`. The app side (`dev` @ `a3acb25a`,
OTA 480) was not touched.

**R2 is authored in the working tree. Nothing is committed and nothing is pushed.** The brief makes
committing conditional on `app:economy:wage-table` exiting 0, and it does not — for three reasons,
none of which is the authoring itself. They are §3 below, and the third one needs an owner decision.

---

## 1. What was done

| step | state |
|---|---|
| 1. Turnover table | ✅ authored by migration |
| 2. Nothing (derived) | ✅ nothing authored; asserted instead, see §3.2 |
| 3. Prize + position ladders | ✅ authored by migration |
| 4. Band 3 ground + facility set | ✅ authored by migration |
| 5. The migration | ✅ `Version20261118120000`, `down()` verified as an exact round-trip |
| 6. Regenerate, bump, re-warm | ⚠️ **bump done (9 → 10); regeneration and re-warm NOT run** — see §5 |
| 7. Gates | ⚠️ gate run, does not exit 0 — §3 |
| Tests | ✅ `LeaguePayoutResolverTest` extended, `EconomyBaselineTurnoverAuthoringTest` added, `ConfigImportExportCoverageTest` passes |

Files: `migrations/Version20261118120000.php`, `src/Service/WorldInitializationService.php`
(`WORLD_PACK_VERSION` 9 → 10), `tests/Service/Economy/LeaguePayoutResolverTest.php`,
`tests/Service/Economy/EconomyBaselineTurnoverAuthoringTest.php`, plus three `.context` files (§6).

The migration follows `Version20261116181000`'s shape: one transaction, everything it replaces
stashed into `economy_r2_pre_authoring_backup` first, one `addSql` per key, `down()` restoring from
the stash. The per-league columns and `league_tier_defaults` are deliberately **not** re-nulled —
`Version20261116181000` already cleared them and NULL = inherit picks the new ladder up by itself.

---

## 2. What band 3 of `npcFacilityLevelRanges` held BEFORE, verbatim

Read from the authored column before any edit (the admin screen at
`/admin?routeName=admin_npc_clubs_content` renders this same column):

```json
{"kinetic_lab":{"min":0,"max":1},"scouting_center":{"min":1,"max":1},"zenith_sanctuary":{"min":0,"max":0},
 "club_shop":{"min":1,"max":1},"museum":{"min":0,"max":0},"youth_academy":{"min":0,"max":1},
 "training_pitch":{"min":1,"max":1},"north_stand":{"min":1,"max":1},"strength_suite":{"min":0,"max":0},
 "east_stand":{"min":1,"max":2},"physio_clinic":{"min":1,"max":1},"neuro_shed":{"min":0,"max":0},
 "technical_zone":{"min":0,"max":1},"hydro_pool":{"min":0,"max":0},"south_stand":{"min":1,"max":1},
 "tactical_room":{"min":0,"max":1},"advanced_scouting":{"min":0,"max":1},"west_stand":{"min":1,"max":2},
 "biometric_hub":{"min":0,"max":0}}
```

**This settles the open question in `candidate-c-rollout.md` §0: overrides ARE authored.** The four
stands give a mean total of **5.0** levels (1 + 1 + 1.5 + 1.5), which is what the Nov-15 world export
measured (4.89–5.05) against a code default of `0-1` per stand that would give 2.0. So the
discrepancy was **not** the NPC upgrade drift `game-mechanics.md` §13.3 describes, and **the stand
half of step 4 is a real change, not a no-op** — contrary to the brief's "if no stand override is
authored, the stand half is already correct".

Two things followed from reading it that the brief could not have specified:

- **Six of the nine exclusions had no band-3 entry at all** (`scout_fleet`, `imaging_suite`,
  `player_wellbeing`, `nutrition_centre`, `trial_pitch`, `car_park`). `buildFacilities()` falls back
  to `FACILITY_LEVELS` band 3's `other` range of `0-1` for a slug with no override, so simply
  "excluding" them by omission would have left all six still built. Every `jsonb_set` therefore
  passes `create_missing = true`, and all nine are written explicitly as `0-0`.
- **Three keys in the column match no active `facility_template` row** — `kinetic_lab`,
  `zenith_sanctuary`, `neuro_shed`. They are inert and were left exactly as found rather than
  cleaned up.

After the migration, the 22 active templates leave a band-3 club exactly **eight** facilities: four
small stands (`0-1`), `training_pitch` 1-1, `physio_clinic` 1-1, `club_shop` 1-1, `tactical_room`
0-1 — as the brief predicts.

---

## 3. Why the gate does not exit 0

Full output, both countries, before and after: `r2-run-2026-11-18/wage-table.BEFORE.txt` and
`wage-table.AFTER.txt` in this folder. **BEFORE: 18 failures. AFTER: 31.** Both exit 1.

That count is misleading on its own, and the reason is §3.1.

### 3.1 ⚠️ The local Lando box is not the dev box — four economy inputs diverge

This is the headline finding. The BEFORE run's 18 failures are all *"baselineTurnoverPence is 0 —
the turnover model cannot price this tier"*: **the local box has no turnover authored at all**,
where the brief's "today" is £388.7m … £164,852. Pulling the thread found four divergences:

| input | this box | dev / the derivation |
|---|---|---|
| `economy_baseline_turnover_pence` | `[0,0,0,0,0,0,0,0]` | £388.7m … £164,852 |
| `starter_config.npc_squad_config` midpoints | 33, 30, 28, 26, 26, 26, 23, 22 | **26, 23, 21, 20, 19, 18, 17, 17** |
| `league.tv_deal` tier 1 | £10,000,000 (3.0% of turnover) | £136,000,000 (35.0%) |
| sponsor bands | tier 1 0.7%, tier 8 53.8% of turnover | inside the agreed 8–30% |

(`economyTicketPriceTier1Pence` is also 0 here against a live 8000.) The dev squad row is not a
guess: it is the only row that reproduces the live published scale `390404650 … 178885951` —
recorded in `REMAINING-WORK.md` §2f.1 against `game-config-en.LIVE.json` — from the live authored
turnover, to the integer, through the resolver's own formula.

`scripts/pull-prod-db.sh` is forbidden by the brief, so **the local gate cannot be made to exit 0
whatever is authored**, and its sponsorship and bankruptcy failures are box state, not R2. Of the
31 AFTER failures, 2 are pre-existing `bankruptcyDeductionTiers` defects, 16 are sponsor-band, and
3 are checks 1/2 — see §3.2.

What R2 *did* fix on this box, visibly: the payout-flatness failure (*"prize + position money is
7.12pp … and 10.91pp … the ratio tables no longer track the turnover ladder"*) appears when the
turnover is authored without step 3 and is **gone** after it. That is step 3 working.

### 3.2 `S_tier` depends on the SQUAD ROW as well as the ability bands

`EconomyScaleResolver::referenceSquadAbilitySum()` sums `ability^k` over a reference squad whose
SIZE is `npcSquadConfig`'s midpoint. So the turnover ladder, `league_ability_ranges` **and the squad
sizes** decide check 1 jointly. Nothing in the brief, the rollout doc or `REMAINING-WORK.md` records
this, and it is why the brief's asserted scale did not reproduce here at first.

- On the **dev squad row**, R2 publishes exactly
  `332484503 · 331618346 · 303799192 · 290519761 · 258711870 · 257021938 · 235402484 · 233303081`,
  strictly decreasing — **precisely the brief's assertion, to the integer.** Pinned through the real
  resolver by `EconomyBaselineTurnoverAuthoringTest`.
- On the **local row**, the same authored turnover gives tier 8 at 179.3699 against tier 7's
  173.6417, so check 1 fails and check 2 reports abilities 5 and 7. Those three AFTER failures are
  the squad row, not the ladder.

**R2 is sound.** But if the dev squad row is ever retuned, check 1 is back in play with no turnover
edit at all — worth recording as a dependency.

### 3.3 ⚠️ R2 breaches check 8's TV-dependent constraint at tier 1 — owner decision

This one is real on dev and the brief did not predict it. Constraint (b) of `checkLeaguePayouts()`
holds `TV + position + prize` per average club inside **10–50%** of authored turnover, and caps the
tier-1/tier-8 spread at **4x**. R2 cuts tier-1 turnover 15% (£388.7m → £331m) and deliberately does
not re-derive TV, so with dev's TV table:

| | tier 1 | tier 8 |
|---|---|---|
| TV alone, as % of turnover | 35.0% → **41.1%** | 3.0% → 2.3% |
| TV + position + prize | **50.4%** (ceiling 50%) | 11.6% |

spread **4.34x** against the 4x limit. The brief anticipated the TV share moving (check 3, "tier 1
goes 35% → 41%") but not that the same move carries check 8's combined figure over its ceiling.

**The payout ladder is innocent**: prize + position is a flat **9.29%** of turnover at both ends,
and constraint (d) passes with 0.0065pp of spread against a 0.5pp tolerance. The only levers are the
TV table and the turnover table, and the brief forbids re-deriving TV (§7), relaxing any check (§7)
and special-casing a tier (§7). So I did none of those: it is pinned as a failing-by-design
expectation in `LeaguePayoutResolverTest::testR2BreachesCheck8sTvDependentConstraintsAtTierOne()`,
with the attribution asserted, so it cannot be rediscovered as a surprise.

**This needs your call.** The options I can see — all out of scope for me — are to accept tier 1 at
50.4%, to widen check 8's band, or to let the TV table move after all.

---

## 4. The migration, and `down()`

**`migrations/Version20261118120000.php`** — *"Author resolution R2: the re-derived baseline
turnover ladder, both payout ratio tables and tier-1 bases re-derived onto it, and band 3 of
npcFacilityLevelRanges cut to a bottom-division ground of eight facilities — stashing everything
replaced."*

**`down()` confirmed as an exact round-trip on this box**, not by inspection: ran `up`, then `down`,
then `up` again. After `down()` the turnover row, both ratio tables (`[1000000,309000,…,424]`) and
both tier-1 bases (`10000000000`) were back, `north_stand` was `1-1`, `east_stand` `1-2`,
`scouting_center` `1-1`, **`car_park` was back to ABSENT** (the key `up()` created is removed,
because the whole column is restored from the stash), and `economy_r2_pre_authoring_backup` was
dropped.

---

## 5. What I did NOT do, and why

- **Step 6's regeneration and `app:worldpack:maintain` were not run.** Regenerating the bottom two
  tiers is destructive (`deleteExisting`), and on this box it would generate clubs from the four
  divergent inputs in §3.1 against world data that is not dev's — no useful signal, some risk. The
  `WORLD_PACK_VERSION` bump IS done. **The regeneration still has to happen on whichever box the
  authoring ships to, or step 4 reaches no existing NPC club.**
- **The three exports are local-box exports, not the pinned-expectation inputs.**
  `r2-run-2026-11-18/game-config-en.LOCAL.json` and `starter-config.LOCAL.json` are attached and do
  confirm the authoring publishes (`economyTierBaseline.tiers[0].turnoverPence` = 33100000000), but
  their `wageScaleMicroPence`, TV, ticket and sponsor blocks carry this box's divergent inputs, so
  running the app's `variantGate.ts` against them would measure the box, not R2. I did not produce a
  world export for the same reason. **The §5 pinned expectation cannot be checked from here.**
- **I did not touch** `starter_config.league_ability_ranges`, `npc_squad_config`, the sponsor
  ratios, the TV table, the tier-8 upkeep factor, `PYRAMID_DISTRIBUTION_ENABLED`, parachutes, the
  position taper, inflation, the season-investment ceiling, any check in `EconomyWageTableCommand`,
  or any app code. No cherry-picks, no `pull-prod-db.sh`, no push.

**Full test suite: 3249 tests, 5 failures — all five reproduce at `740f2c8e` with my changes
stashed**, so they are pre-existing and unrelated (`NotificationLogCrudControllerTest`,
`CompetitionControllerTest`, `NpcClubForeignClubsCitySizeTest`, `FriendlyResolveSingleMatchTest`,
`WorldOverviewServiceTest`). Economy and config tests: 196 tests, 2521 assertions, all green.

---

## 6. `.context` stages updated

- **`03_data/output/migrations.md`** — full entry for `Version20261118120000`, including the
  verbatim before-state of band 3 and the `create_missing` trap.
- **`07_synthesis/output/current-focus.md`** — the "NEXT … candidate C is chosen" section is
  replaced by a landed record with the three findings; its stale candidate-C "what it asks for"
  paragraph is explicitly flagged as superseded, with R2's real tables given.
- **`shared/last-sync.md`** — an entry for this pass.

(That file and `current-focus.md` already had uncommitted edits from the derivation session; I added
to them rather than rewriting them.)

---

## 7. Decisions I had to make that the brief did not cover

1. **The tolerance in `testTheAuthoredLadderPutsEveryTierAtTier1sShareOfItsOwnTurnover`.** It was a
   flat 0.05%, and R2's tier 8 lands 0.0698% off the 0.2573x target — because the ratio there is
   **650 ppm**, whose exact value is 649.547, so a single ppm of rounding is 0.15% of the figure.
   The authored 650 is the correct 3 s.f. value. I made the tolerance per-tier (half a ppm at that
   rung, floored at the old 0.05%) rather than widening it globally. **No gate check was touched**,
   and the gate's own flatness check passes with 0.0065pp against 0.5pp.
2. **I re-pointed the whole of `LeaguePayoutResolverTest` onto R2** rather than adding a parallel
   set of R2 tests, so the file pins what is actually authored. The superseded 2026-11-13 ladder
   survives as `LEGACY_TURNOVER`, used only by the historical regression test.
3. **I did not re-null the per-league columns or `league_tier_defaults`** (see §1).
4. **I left the three dead facility keys alone** (see §2).
5. **I left `kinetic_lab` at `0-1` in band 3.** It is not one of the brief's nine exclusions and has
   no active template, so it is inert — but if a `kinetic_lab` template is ever activated, band 3
   would gain a ninth facility.
