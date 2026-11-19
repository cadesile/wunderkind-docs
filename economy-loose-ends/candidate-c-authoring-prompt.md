<!-- STATUS --> **STATUS:** ✅ Candidate C authoring. COMPLETE — became R2.

---

# Author the re-derived economy: turnover, the payout ladders, and the bottom-tier ground

**Backend only, branch `development`. Authoring plus a world regeneration — no app change, and the
app needs nothing from this.** One migration, the admin screens it already has, and a re-warm.
Commit when the gate passes; do not push until the owner says so.

## Code state (do first)

`git fetch origin` with explicit refspecs, then confirm HEAD equals `origin/development` — it was
`740f2c8e` on 2026-11-18. State the branch, full commit hash and commit date at the top of your
report. A report without them is not accepted. The app side is `dev` @ `a3acb25a`, OTA 480, and
stays untouched.

## Read first

- `docs/economy-loose-ends/candidate-c-rollout.md` — the authoring run, step by step.
- `docs/economy-loose-ends/REMAINING-WORK.md` §2 — the derivation, and `dials/run.sh` beside it,
  which reproduces every figure quoted here.
- `.context/stages/07_synthesis/output/current-focus.md`'s first section.
- `src/Service/Economy/LeaguePayoutResolver.php`'s docblock (the authoring contract for the
  ladders), `src/Service/Economy/EconomyScaleResolver.php`'s `wageScaleMicroPence()`,
  `src/Command/EconomyWageTableCommand.php`'s checks 1 and 2, and
  `migrations/Version20261116181000.php` (the shape this migration copies).

---

# 1. ⚠️ THE DECISION THIS PROMPT CANNOT MAKE — resolve it before authoring anything

**Candidate C, as derived, FAILS `app:economy:wage-table` check 1 at tiers 2, 6 and 8.** The
command exits non-zero, so it blocks the deploy. Measured 2026-11-18, from the published config and
the app's gate; not a prediction.

Check 1 requires `S_tier` (micro-pence per unit of ability^k) to be **strictly decreasing** down the
pyramid, and check 2 requires that no ability shared by two adjacent bands is paid more in the lower
one. `S_tier = playerBudget / (weeksPerSeason × Σ ability^k)` is derived from the turnover row, so
the turnover ladder and the ability bands together decide whether it falls. The EN bands are
`40-90 · 30-60 · 20-40 · 15-35 · 10-25 · 10-15 · 5-10 · 2-7`, and:

| step | Σ ability^k ratio (the most turnover may fall by) | candidate C's turnover step | verdict |
|---|---|---|---|
| 1 → 2 | 0.3453 | 0.3455 | fails by 0.06% |
| 5 → 6 | 0.3699 | 0.6006 | **fails** |
| 7 → 8 | 0.3162 | 0.6057 | **fails** |

**And no turnover ladder closes it**: solving for the largest turnover at every tier that keeps
`S_tier` strictly decreasing drives tier 6 to 137% coverage and tier 8 to 162%, both outside the
85–110% band. **The 85–110% band and checks 1/2 cannot both hold with the bands as authored** — the
bands flatten at the bottom (tier 6 keeps tier 5's floor, tier 8 drops to 2–7) far faster than the
income the grounds produce. The checks are right: "a promoted player takes a pay cut" is a real
defect, and tiers 5/6 overlap at 10–15 and 7/8 at 5–7, so check 2 would fire too.

Three resolutions. **The owner picks; this prompt does not.**

### R1 — re-author the bottom ability bands, keep candidate C's turnover

Candidate C stands exactly as `candidate-c-rollout.md` has it, and the gate passes, if the bands
become about:

| tier | today | needed | Σ ratio achieved (needs >) |
|---|---|---|---|
| 6 | 10–15 | **10–20** | 0.616 (> 0.601) |
| 8 | 2–7 | **4–9** | 0.677 (> 0.606) |

plus nudging tier-2 turnover 0.1% (£99,500,000 → £99,400,000) for the 1→2 hair.

⚠️ **This is a squad-quality change, not an economy one.** Bottom-division players get materially
better; `league_ability_ranges` also feeds player generation, scouting, match results, and — since
`5157fbfb`/`740f2c8e` — **staff and scout pay through `TierBandScaleResolver`'s band midpoints**, so
staff wages at tiers 6 and 8 rise with it. It also moves what `WAGE_LADDER_ABILITIES` is measured
against (`REMAINING-WORK.md` §4 Q5). Out of scope for an economy authoring run unless the owner
says otherwise.

### R2 — keep the bands, accept tiers 6 and 8 out of band (RECOMMENDED)

The chain-maximal ladder: every tier as rich as check 1 allows, which is the ladder that leaves
tiers 6 and 8 least far out. **Verified — `dials/run.sh cand-c-gatesafe`:**

| tier | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 |
|---|---|---|---|---|---|---|---|---|
| turnover | £331,000,000 | £114,000,000 | £34,600,000 | £20,700,000 | £7,320,000 | £2,690,000 | £686,000 | £215,000 |
| ×today | 0.85 | 0.95 | 0.97 | 1.04 | 1.04 | 1.15 | 1.18 | 1.30 |
| COVERAGE | 85.2% | 85.4% | 85.2% | 85.2% | 85.0% | **137.5%** | 85.0% | **162.1%** |

Check 1 passes at every tier, `VARIANT GATE: PASS`, no tier insolvent once FLIPPED, tier-8 balance
at season 30 **+£810,727**. Against today that is six tiers brought into band from four, tier 8 from
535% to 162%, and tier 6 from 192% to 137%. It is also a much smaller authoring change —
0.85×–1.30× against candidate C's 0.74×–2.19× — so bottom-tier starting wages rise 1.15–1.30×
rather than 2.19×.

Its cost, stated plainly: **the six in-band tiers sit at the 85% floor**, because every point of
headroom given to them is taken from tiers 6 and 8. A later income correction pushes them under.
The variant that keeps them mid-band (97.5%) instead puts tier 6 at ~157% and tier 8 at ~185%; say
in your report which the owner chose.

### R3 — lower `economyWageCurveExponentBp` — RULED OUT, do not propose it

It helps at tier 6 (feasible around k ≤ 1.25, from 2.5 today) and **cannot fix tier 7→8 even at
k = 1.0**: Σ8/Σ7 is 0.567 against the 0.606 needed. Recorded so nobody re-derives it.

**If the owner has not answered, stop here and report.** Do not author a table that fails the gate,
and do not "fix" a check-1 failure by editing the check.

---

# 2. The authoring

Steps 2 and 4–6 are identical under R1 and R2; steps 1 and 3 take that choice's tables.

## Step 1 — the turnover table

`GameConfig::$economyBaselineTurnoverPence`, an 8-element array, **pounds in, pence stored** on the
Economy screen (`/admin?routeName=admin_economy`, `baselineTurnoverPounds[]`). ⚠️ **It is the
BASELINE country's table, not England's** — every other country is this × its
`economy_factor_bp`, all at parity today, so authoring it moves every country and only EN has been
gated. Say so in the report.

- **R1:** `£288,000,000 · £99,400,000 · £30,100,000 · £18,000,000 · £6,360,000 · £3,820,000 ·
  £596,000 · £361,000`
- **R2:** the table in §1 above.

## Step 2 — nothing, deliberately

`wageScaleMicroPence` and the youth scholarship anchor are **derived** from the turnover row, so
step 1 moves both. **Do not author either.** Assert the published scale against the prediction
instead — under R2 it is `332484503 · 331618346 · 303799192 · 290519761 · 258711870 · 257021938 ·
235402484 · 233303081`, strictly decreasing, which is what makes check 1 pass. Staff and scout pay
do **not** move: `TierBandScaleResolver` reads the ability bands, not turnover.

## Step 3 — the prize and position ladders

`5dc3f51b`'s ppm ladder IS the old turnover ladder normalised to tier 1, so step 1 invalidates it.
Re-derive both tables as the new ladder normalised to tier 1, and both tier-1 bases as
`0.2573 × T1`:

- **R1:** base **7410240000** pence (£74,102,400); ladder
  `[1000000, 345139, 104514, 62500, 22083, 13264, 2069, 1253]` (tier 2 is the 0.1%-nudged
  £99,400,000; recompute it if the owner nudges a different tier instead).
- **R2:** base **8516630000** pence (£85,166,300); ladder
  `[1000000, 344411, 104532, 62538, 22115, 8127, 2073, 650]`.

Keep everything else that commit established: parts per million (tier 8 is 650 ppm = 6.5 bp, so
basis points cannot hold it), NULL = inherit, the country factor applied once and never through
`scalePence()`, and the split-the-money division.

## Step 4 — the bottom-tier ground and facility set

`GameConfig::$npcFacilityLevelRanges`, **band 3 = tiers 7 AND 8** (`getBandIndexForTier()` keys on
the absolute tier, so a country with fewer than seven tiers is untouched), and the column has **no
country dimension**.

⚠️ **Read the NPC Clubs screen (`/admin?routeName=admin_npc_clubs_content`) and report what is
authored there TODAY before changing it.** That figure is the one input the derivation could not
see — the column is not published to the app, and the Nov-15 world export measures 4.89 total stand
levels per tier-8 club against a band-3 default of `0-1` per stand that would give 2.0. Either
overrides are authored, or it is the NPC upgrade drift `game-mechanics.md` §13.3 describes (flat
£200,000 per upgrade until 2026-11-16, now the player's price). **If no stand override is authored,
step 4's stand half is already correct and only the exclusions are new.**

- stands `north_stand`, `south_stand`, `east_stand`, `west_stand`: `min 0, max 1`.
- excluded (`min 0, max 0`, which `buildFacilities()` skips), nine slugs: `scouting_center`,
  `scout_fleet`, `imaging_suite`, `player_wellbeing`, `nutrition_centre`, `technical_zone`,
  `youth_academy`, `trial_pitch`, `car_park`.

Leaves eight facilities: four small stands, a training pitch, a physio clinic, a club shop, a
tactical room. **This is load-bearing, not tidying** — without it tier 8's upkeep is 40.7% of income
against a 60% wage share and the gate fails on solvency.

## Step 5 — the migration

One migration, in `Version20261116181000`'s shape, because that is how this repo moves authored
data: stash what it replaces in a backup table (`economy_baseline_turnover_pence`, both ratio
tables, both tier-1 bases, `npc_facility_level_ranges`), write the new values, and make `down()`
restore from the stash. One `addSql` per key, never a whole-row overwrite — that commit's note about
dropping a trophy or a parachute schedule applies here too.

## Step 6 — regenerate, bump, re-warm

Existing NPC clubs keep the facilities they have, so step 4 reaches nothing until the bottom two
tiers are regenerated. Then `WorldInitializationService::WORLD_PACK_VERSION` **9 → 10** (packs bake
facilities, wages, `tvDeal` and the payout figures) and `app:worldpack:maintain` restocks; the
hourly sweep is the backstop, not the plan. A save already running keeps its own world.

## Step 7 — the gates

1. `app:economy:wage-table` for **EN and the shallow country it shows beside it**. It must exit 0.
   Checks to watch, and why each is at risk here: **1 and 2** (§1 — the reason this run has a
   decision in it), **3** (TV as a share of turnover: TV does not move and turnover does, so tier
   1's share goes 35% → 41% under R2), **6** (is the TV table country-scaled), **7** (club + league
   sponsorship inside 8–30% of turnover: R2 lands tier 1 at 25.8% and tier 8 at 16.8%, both inside,
   but it is the check the sponsor ratios were authored against and they are deliberately NOT being
   re-derived — `REMAINING-WORK.md` §2f.4 says why), and **8** (`checkLeaguePayouts`, which step 3
   moves). **Paste the whole table and every warning into the report.**
2. Tests: extend `LeaguePayoutResolverTest` for the new base and ladder, and add a test that pins
   the published `economyTierBaseline.tiers[].turnoverPence` against the authored table and the
   derived `wageScaleMicroPence` as strictly decreasing. `ConfigImportExportCoverageTest` must still
   pass.

# 3. Report back with

- Branch, full hash, date; which resolution the owner chose.
- **What `npcFacilityLevelRanges` held before you touched it**, verbatim.
- The full `app:economy:wage-table` output for both countries, before and after.
- `GET /api/game-config?country=EN`, `GET /api/starter-config` and a fresh world export, so the
  app-side gate can be re-run against real authoring rather than patched exports. Expected from
  that run under R2: `COVERAGE outside 85-110%: 6, 8`, a flat 60.0% AUTHORED wage share,
  `insolvent once FLIPPED: none`, `VARIANT GATE: PASS`. **A tier leaving the band that §1 does not
  predict, the 60.0% row going non-flat, or upkeep above ~35% of income at any tier is a finding,
  not calibration.**
- The migration's name, and confirmation that `down()` restores from the stash on a clone.
- Anything you had to decide that this prompt did not cover, named as such.

# 4. Do not

- **Author `wageScaleMicroPence` or the youth scholarship by hand.** They are derived; writing them
  makes the chain disagree with itself. `REMAINING-WORK.md` §4 Q5 has the standing warning.
- **Touch `league_ability_ranges` unless the owner chose R1**, and then only tiers 6 and 8.
- **Re-derive the sponsor ratios or the TV table.** Deliberate; §2f.4 and §2f.5 give the reasoning,
  including that a flat sponsor share would price a bottom-tier club's sponsorship at £194k a year.
- **Lower the tier-8 upkeep factor.** It is anchored at 1.0 there because `POST /api/club/fund`'s
  projection is read at FOUND CLUB.
- Flip `PYRAMID_DISTRIBUTION_ENABLED`, or touch parachutes, the position taper, inflation or the
  season-investment ceiling.
- Edit or relax any check in `EconomyWageTableCommand`, or make a check pass by special-casing a
  tier.
- Change any app code, cherry-pick between branches, run `scripts/pull-prod-db.sh`, or push.
