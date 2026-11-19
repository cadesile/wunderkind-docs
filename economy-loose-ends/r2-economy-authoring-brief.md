<!-- STATUS --> **STATUS:** ✅ R2 economy authoring. COMPLETE 2026-11-18.

---

# TASK — Author the re-derived economy (resolution R2)

**Backend only (`wunderkind-backend`), branch `development`.** Authoring data plus a world
regeneration: one migration, the admin screens that already exist, a pack-version bump and a
re-warm. **No app code changes, and the app needs nothing from you.** Commit when the gate passes;
do not push until the owner says so.

**The approach is already decided — do not re-open it.** Three resolutions were derived and
measured on 2026-11-18; the owner chose **R2**. The rejected two are listed in §5 so you can
recognise them, not reconsider them.

---

## 1. Code state (do first)

`git fetch origin` with explicit refspecs, then confirm HEAD equals `origin/development` — it was
`740f2c8e` on 2026-11-18. **State the branch, full commit hash and commit date at the top of your
report.** A report without them is not accepted. The app side is `dev` @ `a3acb25a`, OTA 480, and
stays untouched.

Both repos use ICM: read `.context/CONTEXT.md` and the relevant stage's `output/` before raw
source, and update the stage your change affects as part of finishing the work.

## 2. Read first

- `.context/stages/07_synthesis/output/current-focus.md` — its first section is this task.
- `docs/economy-loose-ends/candidate-c-rollout.md` and `REMAINING-WORK.md` §2 (outside both repos,
  at `/Users/courtneyadesile/Documents/WunderkindFactory/docs/economy-loose-ends/`) — the
  derivation, the tooling that reproduces every figure here, and what it deliberately does not do.
- `src/Service/Economy/LeaguePayoutResolver.php`'s docblock — the authoring contract for the two
  payout ladders, including why parts per million and why NULL means inherit.
- `src/Service/Economy/EconomyScaleResolver.php`'s `wageScaleMicroPence()` — why step 2 is empty.
- `src/Command/EconomyWageTableCommand.php` checks 1, 2, 3, 6, 7 and 8 — the gate you must pass.
- `migrations/Version20261116181000.php` — the shape your migration copies.

## 3. Why this exists

The economy overhaul left the authored turnover table solved against a gate numerator that was
wrong in two directions, and the prize-ladder fix (`5dc3f51b`, landed 2026-11-17) then removed a
large income line from the bottom of the pyramid. Measured consequence: on today's authoring the
app's variant gate goes **PASS → FAIL**, tier 8 insolvent in season 1, and tiers 2 and 3 drop out of
the 85–110% COVERAGE band they were inside. The dials were re-derived against the corrected gate;
R2 is the ladder that satisfies **both** this repo's `app:economy:wage-table` checks **and** as much
of the app's coverage band as is reachable without re-authoring the ability bands.

Against today it brings six tiers into band from four, tier 8 from 535% coverage to 162%, and tier 6
from 192% to 137%.

## 4. The authoring

### Step 1 — the turnover table

`GameConfig::$economyBaselineTurnoverPence`, 8 elements. The Economy admin
(`/admin?routeName=admin_economy`) takes **pounds in and stores pence**
(`baselineTurnoverPounds[]`).

| tier | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 |
|---|---|---|---|---|---|---|---|---|
| **authored turnover** | £331,000,000 | £114,000,000 | £34,600,000 | £20,700,000 | £7,320,000 | £2,690,000 | £686,000 | £215,000 |
| pence | 33100000000 | 11400000000 | 3460000000 | 2070000000 | 732000000 | 269000000 | 68600000 | 21500000 |
| ×today | 0.85 | 0.95 | 0.97 | 1.04 | 1.04 | 1.15 | 1.18 | 1.30 |

⚠️ **This is the BASELINE country's table, not England's.** Every other country is this ×
its `economy_factor_bp`, all at parity today — so authoring it moves every country, and only EN
and the shallow comparison country have been gated. Say so in your report.

⚠️ **The values are not free to round.** Each one is the largest figure that keeps `S_tier`
strictly decreasing (check 1) given the tier above it; they are already rounded DOWN to 3 s.f. so
that the chain survives rounding. **Do not round them again, and do not "tidy" them upward.**

### Step 2 — nothing, deliberately

`wageScaleMicroPence` and the youth scholarship anchor are **derived** from the turnover row
(`S_tier = playerBudget / (weeksPerSeason × Σ ability^k)`), so step 1 moves both. **Do not author
either.** Assert instead: the published scale must come out as

`332484503 · 331618346 · 303799192 · 290519761 · 258711870 · 257021938 · 235402484 · 233303081`

strictly decreasing, which is what makes check 1 pass. Staff and scout pay do **not** move —
`TierBandScaleResolver` reads the ability bands, not turnover.

### Step 3 — the prize and position ladders

`5dc3f51b`'s ppm ladder IS the old turnover ladder normalised to tier 1, so step 1 invalidates it.
Re-derive both tables as the NEW ladder normalised to tier 1, and both tier-1 bases as
`0.2573 × T1`:

- `economy_league_prize_tier1_pence` = `economy_league_position_pot_tier1_pence` =
  **8516630000** (£85,166,300, down from £100,000,000)
- `economy_prize_tier_ratio_ppm` = `economy_position_pot_tier_ratio_ppm` =
  **`[1000000, 344411, 104532, 62538, 22115, 8127, 2073, 650]`**

Keep everything that commit established: parts per million, not basis points (tier 8 is 650 ppm =
6.5 bp); NULL = inherit; the country factor applied once and never through `scalePence()`; and the
split-the-money division that keeps one truncation per figure.

### Step 4 — the bottom-tier ground and facility set

`GameConfig::$npcFacilityLevelRanges`, **band 3 = tiers 7 AND 8** (`getBandIndexForTier()` keys on
the absolute tier, so a country with fewer than seven tiers is untouched). The column has **no
country dimension**.

⚠️ **FIRST: open `/admin?routeName=admin_npc_clubs_content` and report, verbatim, what band 3 holds
today — before you change it.** That is the one input the derivation could not see (the column is
not published to the app), and the Nov-15 world export measures **4.89 total stand levels** per
tier-8 club against a band-3 code default of `0-1` per stand that would give 2.0. Either overrides
are authored, or it is the NPC upgrade drift `game-mechanics.md` §13.3 describes (NPCs paid a flat
£200,000 per upgrade until 2026-11-16; they now pay the player's price). **If no stand override is
authored, the stand half of this step is already correct and only the exclusions are new.**

- stands `north_stand`, `south_stand`, `east_stand`, `west_stand`: `min 0, max 1`
- excluded — `min 0, max 0`, which `buildFacilities()` skips — nine slugs: `scouting_center`,
  `scout_fleet`, `imaging_suite`, `player_wellbeing`, `nutrition_centre`, `technical_zone`,
  `youth_academy`, `trial_pitch`, `car_park`

That leaves eight facilities: four small stands, a training pitch, a physio clinic, a club shop and
a tactical room.

⚠️ **This step is load-bearing, not tidying.** Without it tier 8's upkeep is 40.7% of income against
a 60% wage share and the run fails on solvency. With it, 32.2%.

### Step 5 — the migration

One migration, in `Version20261116181000`'s shape, because that is how this repo moves authored
data: stash what it replaces in a backup table (`economy_baseline_turnover_pence`, both ratio
tables, both tier-1 bases, `npc_facility_level_ranges`), write the new values, and make `down()`
restore from the stash. **One `addSql` per key, never a whole-row overwrite** — that commit's note
about silently dropping a trophy or a parachute schedule applies here too.

### Step 6 — regenerate, bump, re-warm

Existing NPC clubs keep the facilities they already have, so step 4 reaches nothing until the
bottom two tiers are regenerated. Then `WorldInitializationService::WORLD_PACK_VERSION` **9 → 10**
(packs bake facilities, wages, `tvDeal` and the payout figures) and `app:worldpack:maintain`
restocks; the hourly sweep is the backstop, not the plan. A save already running keeps its own
world and is not reached by any of this.

### Step 7 — the gates

**`app:economy:wage-table`, for EN and the shallow country it prints beside it. It must exit 0.**
Paste the whole table and every warning into your report. The checks at risk here, and why:

| check | why it is at risk |
|---|---|
| **1** S_tier strictly decreasing | the whole reason this ladder is shaped as it is — it must be clean at every tier |
| **2** no shared ability paid more below | tiers 5/6 overlap at 10–15 and 7/8 at 5–7, so an inversion would be real |
| **3** TV as a share of turnover | TV does not move and turnover does: tier 1 goes 35% → 41% |
| **6** is the TV table country-scaled | turnover moved under it |
| **7** sponsorship 8–30% of turnover | R2 lands tier 1 at 25.8% and tier 8 at 16.8%, both inside — and the sponsor ratios are deliberately NOT being re-derived |
| **8** `checkLeaguePayouts` | step 3 moves both ladders |

**Tests:** extend `LeaguePayoutResolverTest` for the new base and ladder; add a test pinning the
published `economyTierBaseline.tiers[].turnoverPence` against the authored table and asserting the
derived `wageScaleMicroPence` is strictly decreasing. `ConfigImportExportCoverageTest` must still
pass.

## 5. Pinned expectation — what the app's gate must then say

Verified 2026-11-18 by patching the Nov-15 exports
(`docs/economy-loose-ends/dials/run.sh cand-c-gatesafe`). Hand back a fresh
`GET /api/game-config?country=EN`, `GET /api/starter-config` and a world export so this can be
re-run against real authoring:

| tier | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 |
|---|---|---|---|---|---|---|---|---|
| COVERAGE | 85.2% | 85.4% | 85.2% | 85.2% | 85.0% | **137.5%** | 85.0% | **162.1%** |
| FLIPPED bill% | 64.9% | 72.0% | 68.7% | 72.8% | 75.0% | 81.4% | 81.2% | 92.2% |
| upkeep ÷ income | 4.9% | 12.0% | 8.7% | 12.8% | 15.0% | 21.4% | 21.2% | 32.2% |

plus `COVERAGE outside 85-110%: 6, 8`, a **flat 60.0%** AUTHORED wage share (see the correction
below for the spread),
`insolvent once FLIPPED: none`, `VARIANT GATE: PASS`, and a tier-8 balance at season 30 of
**+£810,727**.

⚠️ **CORRECTION, 2026-11-18 — the wage-share SPREAD figure in this brief was wrong, and which
value is right depends on the app checkout you run the gate from.** Every table in this document
said "spread 3.2 points", which is what the gate printed at the time. That 3.2 was **an app bug,
not a property of the authored config**: `loadExport.ts` sized the harness's reference squad with
`Math.round` where the backend's `EconomyScaleResolver::referenceSquadSize()` floors, so England
tier 7 — the only tier with an odd `playerMin + playerMax` — priced a squad the backend does not
have, and the gate reported the app's arithmetic error as a finding about the backend's numbers.
Fixed in `harness-reference-squad-floor` (`b8ce310c`), which is not yet merged to `dev`.

So, when you run the app gate in §5:

- **on an app checkout that includes `b8ce310c`:** expect `AUTHORED wage share spans 60.0% -
  60.0% (spread 0.0 points)` — dead flat, which that row's own caveat reads as the authored table
  being internally consistent;
- **on `dev` as it stands today, without the fix:** expect the old `60.0% - 63.2% (spread 3.2
  points)`, with the 63.2% at **tier 7 only**.

Either way the figure to check is that **every tier except possibly tier 7 reads exactly 60.0%**.
A non-60.0% figure at any other tier is the finding; tier 7's 63.2% is a known app defect with a
fix in flight. Nothing about R2's authoring changes this, and no other pinned figure in §5 moves.

**Tiers 6 and 8 being outside the band is the expected, accepted outcome of R2 — not a failure.**
A real run will differ a little (the patched run holds the Nov-15 drifted grounds above tier 6 and
the fan base as exported). **Calibration: COVERAGE moving by a point. A finding: a tier leaving the
band that this table does not predict, the 60.0% row going non-flat, or upkeep above ~35% of income
at any tier.**

## 6. Report back with

- Branch, full hash, date.
- **What band 3 of `npcFacilityLevelRanges` held before you touched it**, verbatim.
- The full `app:economy:wage-table` output for both countries, before and after.
- The three exports above.
- The migration's name, and confirmation that `down()` restores from the stash on a clone.
- Which `.context` stages you updated.
- Anything you had to decide that this brief did not cover, named as such.

## 7. Do not

- **Do not re-open the choice of resolution.** Two were rejected: re-authoring the bottom ability
  bands (tier 6 → 10–20, tier 8 → 4–9) would let every tier sit in the coverage band, but it is a
  squad-quality change that also moves staff and scout pay through `TierBandScaleResolver`;
  lowering `economyWageCurveExponentBp` cannot fix tier 7→8 even at k = 1.0. If you believe R2 is
  wrong, say so in the report and stop — do not implement a different one.
- **Do not author `wageScaleMicroPence` or the youth scholarship by hand.** They are derived;
  writing them makes the chain disagree with itself.
- **Do not touch `starter_config.league_ability_ranges`.**
- **Do not re-derive the sponsor ratios or the TV table.** Deliberate — a flat sponsor share would
  price a bottom-tier club's sponsorship at £194k a year. `REMAINING-WORK.md` §2f.4 and §2f.5.
- **Do not lower the tier-8 upkeep factor.** It is anchored at 1.0 there because
  `POST /api/club/fund`'s projection is read at FOUND CLUB.
- Do not flip `PYRAMID_DISTRIBUTION_ENABLED`, or touch parachutes, the position taper, inflation or
  the season-investment ceiling.
- **Do not edit or relax any check in `EconomyWageTableCommand`**, and do not make a check pass by
  special-casing a tier.
- Do not change app code, cherry-pick between branches, run `scripts/pull-prod-db.sh`, or push.
