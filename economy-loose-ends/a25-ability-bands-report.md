<!-- STATUS: ✅ DONE 2026-11-20 — staff ability has its own authored per-country/per-tier table. Backend only, committed to `development`, not pushed, not deployed. -->

# A25 — staff ability bands report

Backend only. Branch `development`. **Not pushed and not deployed**, per the brief.

Everything below is verbatim command output, not a summary. Where a figure disagrees with the
ruling doc `a25-staff-ability-bands.md`, §6 says so explicitly.

---

## 0. The symptom on a device — why this change exists

Measured by the owner on **OTA 491, before this change**, creating a new Scottish club at tier 4.
The new-game funding projection:

```
SPONSOR INCOME      +£1k /wk
MATCHDAY (AVG/WK)   +£8k /wk
PLAYER WAGES       -£12k /wk
STAFF WAGES        -£52k /wk     <- 4.3x the entire playing squad
FACILITY UPKEEP    -£13k /wk
                   -£68k net
```

A club whose whole squad costs £12k/wk pays £52k/wk for its backroom, and is insolvent from week
one on staff wages alone. Relayed by the PM session, which traced it to this defect: the founding
club's staff come through `StarterPackService` → `generateStaff`/`generateScouts`, ability is drawn
from the two flat globals (live **4–75**), those do not vary by country or tier, so a bottom-tier
Scottish club draws its coaches from the same ability pool as a tier-1 English club and then pays
the band rate for the ability it got. **High ability at a tiny club is a correct wage for an
incorrect ability** — the "two flat globals mean a tier-8 side's backroom is drawn from the same
pool as a tier-1 side's" problem in the brief, measured on a device.

⚠️ **§12 checks my authored defaults against this screen, and the answer is not a clean yes.**
A25 removes the defect it was chartered to remove, decisively where the pyramid is deep — but on
the live Scottish numbers it does **not** fix this particular club, for reasons that are not the
ability band. Read §12 before treating this screen as fixed.

The same screen on a regenerated tier-4 Scottish club is the before/after that proves (or
disproves) the fix end to end. **I cannot run it** — it is the app, which A25 does not touch and
which another session is working in — so that measurement belongs to whoever next builds a
Scottish club on a pack rebuilt at `WORLD_PACK_VERSION` 14.

---

## 1. The live `pool_config` row, measured first

The brief said to re-measure rather than trust either the entity default or the ruling doc. I did.

```
$ lando php bin/console dbal:run-sql "SELECT coach_ability_min, coach_ability_max, coach_age_min, coach_age_max, scout_experience_min, scout_experience_max FROM pool_config"

 ------------------- ------------------- --------------- --------------- ---------------------- ----------------------
  coach_ability_min   coach_ability_max   coach_age_min   coach_age_max   scout_experience_min   scout_experience_max
 ------------------- ------------------- --------------- --------------- ---------------------- ----------------------
  4                   75                  38              60              4                      34
 ------------------- ------------------- --------------- --------------- ---------------------- ----------------------
```

```
$ lando php bin/console dbal:run-sql "SELECT id, coach_ability_min, coach_ability_max FROM pool_config"

 ---- ------------------- -------------------
  id   coach_ability_min   coach_ability_max
 ---- ------------------- -------------------
  1    4                   75
 ---- ------------------- -------------------
```

🟢 **Confirmed: live 4–75 against an entity docblock and column default of 40–75**
(`PoolConfig.php:202`, `:206`). One row, id 1, so there is no ambiguity about which row
`PoolConfigRepository::getConfig()` reads. `scout_experience_min/max` is 4–34, as the brief said,
and is **out of scope and untouched**.

### 🔴 And a second, bigger instance of the same trap that the ruling doc did not have

I resolved the *player* band the same way instead of trusting its default, and it is also not the
committed value:

```
$ lando php bin/console dbal:run-sql "SELECT league_ability_ranges::jsonb -> 'EN' AS en FROM starter_config"

  {"1": {"max": 90, "min": 40}, "2": {"max": 60, "min": 30}, "3": {"max": 40, "min": 20}, "4": {"max": 35, "min": 15}, "5": {"max": 25, "min": 10}, "6": {"max": 15, "min": 10}, "7": {"max": 10, "min": 5}, "8": {"max": 7, "min": 2}}
```

The committed `StarterConfig::DEFAULT_TIER_RANGES` is **75–95 at tier 1 down to 10–25 at tier 8**.
The live EN row is **40–90 down to 2–7** — a different scale, not a tweak. Same for the player
generation inputs:

```
$ lando php bin/console dbal:run-sql "SELECT player_age_min, player_age_max, player_first_team_age_min, player_potential_min, player_potential_max, player_potential_mean FROM pool_config WHERE id=1"

 ---------------- ---------------- --------------------------- ---------------------- ---------------------- -----------------------
  player_age_min   player_age_max   player_first_team_age_min   player_potential_min   player_potential_max   player_potential_mean
 ---------------- ---------------- --------------------------- ---------------------- ---------------------- -----------------------
  18               33               19                          3                      12                     7
 ---------------- ---------------- --------------------------- ---------------------- ---------------------- -----------------------
```

(`player_potential_min/max` committed defaults are 40/80.) **This mattered to the work**: a staff
default authored against the committed player band would have been on the wrong scale for the row
the game is actually running. It is why the seed is computed *from each country's own authored
band* rather than hardcoded. Count this as the fifth instance of the governing trap, after
`bondDecayFloor`, `wageMultiplierTiers`, `incomeAnchoredWages` and now `league_ability_ranges`.

---

## 2. Scotland's four tiers — and where the ruling doc's claim 3 is and is not true

The ruling said: *25 countries at 8 tiers each, SC at 4 (12/12/12/11 clubs)*, verified against a
world export. **That is true of LIVE and false of this dev box**, and both halves matter.

**Live** (`pre-r2-exports/starter-config.LIVE.json`, the authored player table):

```
countries: 26
AR 8   BE 8   BR 8   CA 8   CO 8   DE 8   EG 8   EN 8   ES 8   FR 8   GH 8
IN 8   IT 8   JP 8   KR 8   MX 8   NG 8   NL 8   PL 8   PT 8   SA 8
SC 4 ['1', '2', '3', '4']
TN 8   TR 8   US 8   WA 8
```

🟢 **Exactly as the ruling said: 26 countries, 25 at eight tiers, SC at four.**

**This dev box**, the same table and the actual `league` rows:

```
$ lando php bin/console dbal:run-sql "SELECT key AS country, (SELECT count(*) FROM jsonb_object_keys(value)) AS tiers FROM starter_config, jsonb_each(league_ability_ranges::jsonb) ORDER BY 2, 1"
  AR 8  BR 8  CA 8  DE 8  EN 8  ES 8  FR 8  IT 8  JP 8  NG 8  NL 8  PL 8  PT 8  SC 8  TR 8  US 8   (16 countries)

$ lando php bin/console dbal:run-sql "SELECT country, count(*) AS tiers, min(tier) AS lo, max(tier) AS hi FROM league GROUP BY country ORDER BY 2 DESC, 1"
  15 countries, every one 8 tiers, lo 1 hi 8 — SC included

$ lando php bin/console dbal:run-sql "SELECT l.tier, count(n.id) AS clubs FROM league l LEFT JOIN npc_club n ON n.league_id = l.id WHERE l.country='SC' GROUP BY l.tier ORDER BY l.tier"
  tier 1..8, 3 clubs each
```

⚠️ **On dev, SC authors and runs EIGHT tiers with 3 clubs each — not four, and not 12/12/12/11.**
So "SC has 4 tiers" is a property of the live configuration, not of the code or of this database.
This is the divergence `StarterAbilityRangeService`'s own docblock already records ("Scotland is
the case that found it. Its band was authored at four tiers; the pyramid was later rebuilt to
eight").

**What that forced in the design, and it is the better answer anyway.** A hardcoded "SC = 4"
would have been wrong here and a hardcoded 8 wrong on live. The table therefore takes its **depth
from the country's own authored player band**, which `StarterAbilityRangeService::syncToPyramid()`
already keeps in step with the pyramid and which the app's country picker already counts as a
country's depth. One source of truth for depth, not two that can disagree — and **no wiring around
club counts**, as the brief required.

**Proven, not asserted.** The migration's own SQL expression, run unmodified against the LIVE
export:

```
  country   tiers   staff_band
  EN        8       {"1": {"max": 55, "min": 29}, "2": {"max": 38, "min": 20}, "3": {"max": 26, "min": 14}, "4": {"max": 21, "min": 11}, "5": {"max": 15, "min": 8}, "6": {"max": 11, "min": 6}, "7": {"max": 6, "min": 3}, "8": {"max": 4, "min": 2}}
  SC        4       {"1": {"max": 72, "min": 38}, "2": {"max": 64, "min": 34}, "3": {"max": 55, "min": 29}, "4": {"max": 47, "min": 25}}
  WA        8       {"1": {"max": 72, "min": 38}, …, "8": {"max": 15, "min": 8}}
```

🟢 **SC comes out at exactly four tiers on live, with no padded rows.** Pinned in code by
`StaffAbilityRangeServiceTest::testAFourTierCountryIsSeededAtFourTiersAndNotPadded()`.

---

## 3. Ruling limb 2 — the scale, and the measurement that made the default derivable

The ruling: a staff ability is defined **against the player `current_ability` scale**, settled in
this same change. That is what makes a default computable rather than invented — so I measured
what current ability a club player actually lands at.

1,200 generated first-team players per tier, through the real `PlayerGenerationService`, under the
live `pool_config` values from §1 applied in memory (nothing flushed), at
`firstTeamAgeRange() = 19–33`:

```
firstTeamAgeRange = 19-33

== LIVE EN band ==
tier  potential  CA min/avg/max         CA p05/p25/p50/p75/p95             suggested staff band (p05-p95)
1     40-90      3 / 35.7 / 66          9/29/37/44/54                      9-54
2     30-60      2 / 26.1 / 52          6/21/27/33/40                      6-40
3     20-40      2 / 17.6 / 34          4/14/19/22/27                      4-27
4     15-35      1 / 14.7 / 31          3/11/15/18/23                      3-23
5     10-25      1 / 10.4 / 23          2/8/11/13/17                       2-17
6     10-15      1 / 7.5 / 13           2/6/8/9/11                         2-11
7     5-10       1 / 4.5 / 9            1/4/5/6/7                          1-7
8     2-7        1 / 2.7 / 6            1/2/3/3/5                          1-5

== COMMITTED default band ==
tier  potential  CA min/avg/max         CA p05/p25/p50/p75/p95             suggested staff band (p05-p95)
1     75-95      6 / 42.7 / 73          12/37/45/52/60                     12-60
2     65-85      6 / 39.7 / 66          10/34/42/49/56                     10-56
3     55-75      4 / 36 / 65            8/31/38/44/51                      8-51
4     45-65      4 / 31.7 / 54          9/27/34/39/45                      9-45
5     35-55      3 / 25.8 / 48          6/21/28/32/38                      6-38
6     25-45      2 / 20.3 / 37          4/16/21/26/31                      4-31
7     15-35      1 / 14.6 / 30          3/11/15/19/23                      3-23
8     10-25      1 / 10.4 / 21          2/8/11/13/17                       2-17
```

**The relation, on the live table:** `CA p50 / potential midpoint` = 0.569, 0.600, 0.633, 0.600,
0.629, 0.640, 0.667, 0.667 across tiers 1–8. So **current ability ≈ 0.6 × the potential band's
midpoint**, and the p25–p95 body of the distribution spans **0.45× to 0.85×** of it.

That is the seed: `bandFromPlayerBand()` = `[round(0.45 × mid), round(0.85 × mid)]`, clamped into
1–100 and ordered. Against the live table it reproduces the measured p25–p95 to within a point or
two at every tier (tier 1: seed 29–55 against measured 29–54).

### ⚠️ Where it is a fit and not a law, stated plainly

Against the **committed** default band it runs about 10% high at tiers 1–3 (tier 1 seed 38–72
against a measured 37–60), because current ability compresses against high potential —
`PlayerGenerationService::buildAbilityTarget()` makes `abilityTarget` a *fraction* of potential, so
the taller the potential the further below it current ability sits. One linear transform cannot
hold across both scales, and I did not add a second term to force it: that would be fitting a
curve to two authored tables, which is calibration.

**So this is a seed an operator edits, not a verdict on what a tier's staff should be.** A25's
deliverable is the authoring surface, the scale definition, and a default coherent with the
players beside it instead of a flat global that was neither. Choosing the numbers is calibration
and was explicitly out of scope. Recorded in the service docblock, the migration docblock and
`.context`, so the next reader does not mistake the fit for a derivation.

### The band ceiling question the ruling doc flagged as a blocker

The ruling doc said *"Whoever builds A25 must not author a band ceiling without knowing the
answer"* — what the wage resolution does with an ability of 61–75 against `wageMultiplierTiers`
topping out at `maxAbility: 60`. **A24 answered it** (`a24-wage-bands-report.md` §2): an ability
above the top row lands on **that row** via the trailing return, behaviour-identical to a `null`
catch-all, pinned by a test. So authoring above 60 is safe and clamps rather than falling to zero
or throwing. In practice the seeded bands top out at 55 (live EN tier 1) or 72 (committed default
tier 1), and the untiered pool pair still spans 4–75 as before — nothing new reaches 61+ that did
not already.

---

## 4. Before and after, in generated output

### Before

The old code was `random_int($abilityRange['min'], $abilityRange['max'])` with `$abilityRange`
**the squad's player band**, falling back to the flat pair when none was passed. Measured through
the real services before any of my changes (so this is the old code running), the staff draw
reproduced whatever band it was handed, tier for tier:

```
tier  authored band player POTENTIAL (min/avg/max) player CURRENT (min/avg/max) staff ability now
1     75-95         75 / 85.3 / 95              3 / 4.8 / 8                 75 / 84.7 / 95
2     65-85         65 / 74.8 / 85              2 / 4.1 / 7                 65 / 74.5 / 85
3     55-75         55 / 65 / 75                2 / 3.6 / 6                 55 / 65.3 / 75
4     45-65         45 / 54.9 / 65              2 / 3 / 6                   45 / 54.7 / 65
5     35-55         35 / 45.3 / 55              1 / 2.5 / 4                 35 / 44.7 / 55
6     25-45         25 / 34.7 / 45              1 / 1.9 / 4                 25 / 35.2 / 45
7     15-35         15 / 25.2 / 35              1 / 1.4 / 3                 15 / 24.8 / 35
8     10-25         10 / 18.1 / 25              1 / 1.1 / 2                 10 / 17.2 / 25

-- untiered (shared pool) draws, no country/tier --
pool staff ability : 40 / 57.7 / 75
pool scout exp     : 0 / 5.2 / 10
```

⚠️ **Read the two middle columns against the right-hand one — that is the whole defect.** At every
tier, the staff member's ability equals the players' **POTENTIAL** band while the players' own
**CURRENT** ability sits far below it. (The absolute CA figures here are low because this probe
passed no age range and so got `pool_config`'s pool-wide 12–13 window rather than the first-team
one; §3 re-measures at `firstTeamAgeRange()`. The *relation* — staff at potential, players below
it — is the point and is unaffected.) The untiered rows are the test database's own config, which
is why they read 40–75 and 0–10 rather than live's 4–75 and 4–34.

On the **live EN** table, the before/after therefore is:

| tier | live player band (= old staff band) | measured player CA (p25–p95) | **new staff band** |
|---|---|---|---|
| 1 | 40–90 | 29–54 | **29–55** |
| 2 | 30–60 | 21–40 | **20–38** |
| 3 | 20–40 | 14–27 | **14–26** |
| 4 | 15–35 | 11–23 | **11–21** |
| 5 | 10–25 | 8–17 | **8–15** |
| 6 | 10–15 | 6–11 | **6–11** |
| 7 | 5–10 | 4–7 | **3–6** |
| 8 | 2–7 | 2–5 | **2–4** |

A tier-1 EN coach was drawn 40–90 against players delivering 29–54; he is now drawn 29–55.

### After

Through the new code, the real services, 400 draws per tier, under the live row from §1 applied in
memory and the EN staff band the migration actually wrote on dev:

```
tier  resolved band  source                                       coach ability min/avg/max scout experience min/avg/max
1     29-55          poolConfig.staffAbilityRanges                29 / 41.6 / 55           29 / 42.4 / 55
2     20-38          poolConfig.staffAbilityRanges                20 / 29.1 / 38           20 / 28.8 / 38
3     14-26          poolConfig.staffAbilityRanges                14 / 20.2 / 26           14 / 19.8 / 26
4     11-21          poolConfig.staffAbilityRanges                11 / 16.1 / 21           11 / 15.9 / 21
5     8-15           poolConfig.staffAbilityRanges                8 / 11.5 / 15            8 / 11.5 / 15
6     6-11           poolConfig.staffAbilityRanges                6 / 8.5 / 11             6 / 8.5 / 11
7     3-6            poolConfig.staffAbilityRanges                3 / 4.4 / 6              3 / 4.5 / 6
8     2-4            poolConfig.staffAbilityRanges                2 / 3.1 / 4              2 / 3 / 4

-- untiered (shared pool): no country, no tier --
resolved band  : 4-75  source=poolConfig.coachAbilityMin/Max (untiered)
coach ability  : 4 / 40.8 / 75
scout exp      : 4 / 17.9 / 34  (scoutExperienceMin/Max, untouched by ruling)

-- an UNAUTHORED country falls through to DEFAULT_TIER_BANDS, never to zero --
ZZ tier 1: 38-72  source=StaffAbilityRangeService::DEFAULT_TIER_BANDS
ZZ tier 8: 8-15  source=StaffAbilityRangeService::DEFAULT_TIER_BANDS
```

🟢 Every tiered draw lands inside its authored band and reports `poolConfig.staffAbilityRanges`.
🟢 The untiered draw is **unchanged at 4–75** and reports the flat pair — the narrowing is real and
the pool is not disturbed. 🟢 `scoutExperienceMin/Max` still governs an untiered scout at 4–34,
exactly as the ruling required.

### The seed the migration wrote on dev

```
$ lando php bin/console doctrine:migrations:migrate --no-interaction
[notice] Migrating up to DoctrineMigrations\Version20261120150000
[notice] finished in 772.6ms, used 139M memory, 1 migrations executed, 2 sql queries
 [OK] Successfully migrated to version: DoctrineMigrations\Version20261120150000

$ lando php bin/console dbal:run-sql "SELECT key AS country, (SELECT count(*) FROM jsonb_object_keys(value)) AS tiers, value::text AS band FROM pool_config, jsonb_each(staff_ability_ranges::jsonb) WHERE key IN ('EN','SC','TR') ORDER BY 1"
  EN  8  {"1": {"max": 55, "min": 29}, "2": {"max": 38, "min": 20}, "3": {"max": 26, "min": 14}, "4": {"max": 21, "min": 11}, "5": {"max": 15, "min": 8}, "6": {"max": 11, "min": 6}, "7": {"max": 6, "min": 3}, "8": {"max": 4, "min": 2}}
  SC  8  {"1": {"max": 72, "min": 38}, …, "8": {"max": 15, "min": 8}}
  TR  8  {"1": {"max": 72, "min": 38}, …, "8": {"max": 15, "min": 8}}
```

EN seeded from its own live band; SC and TR from the committed default band, because that is what
they author **on this box** (§2) — and at eight tiers, because that is the pyramid they have here.

---

## 5. What changed, and the two judgement calls the brief left to me

### The shape

- **`PoolConfig::$staffAbilityRanges`** — new `json` column, per country, per tier, same shape as
  `StarterConfig::$leagueAbilityRanges`. **I followed the existing authoring pattern rather than
  inventing an entity**: the per-country/per-tier ability table in this backend is a JSON column
  on a singleton config entity with a Twig grid and a POST handler, and A25's table belongs beside
  the pool config it is read with. Real schema, real migration, editable in the admin.
- **`StaffAbilityRangeService`** — new. Resolution with a reported `source`, the seed transform,
  `seedDefaults()` (merge-if-absent) and `syncToPyramid()` (gap-fill up, trim down). Mirrors
  `StarterAbilityRangeService` bullet for bullet; wired at the same three places its player twin
  is (`BootstrapCountryCommand` step 3b, the locations dashboard's Seed-defaults button,
  `LeagueService::createLeaguesForCountry()`), in each case **after** the player band, because the
  staff seed is derived from it.
- **`StaffGenerationService::build()`** — `$abilityRange` **removed**; resolves from
  `($country, $tier)`.
- **`ScoutGenerationService::build()`** — `$abilityRange` **removed**, replaced by
  `($country, $tier)`; the banded input now comes from the staff table. `scoutExperienceMin/Max`
  untouched.
- **`WorldPackClubGenerationService::generateStaff()/generateScouts()`** — `$abilityRange`
  removed; `generateScouts()` gained `($country, $tier)`.
- **`StarterPackService.php:151-152`** — no longer passes the player band; the comment there is
  replaced with what replaced it and why (the band is applied to POTENTIAL, so the squad lands
  below it while a coach handed the same band is at that figure from day one).
- **`WorldInitializationService`**, **`WarmWorldPackClubMessageHandler`** — same, with comments
  rewritten at each call.
- **`WORLD_PACK_VERSION` 13 → 14**, with a v14 entry in the version docblock.
- Admin: a **STAFF ABILITY BANDS** card on the Staff pool screen, built from the countries that
  have `League` rows and each one's real tiers (so a 4-tier country shows four inputs), blank =
  unauthored, save merges over what is stored.

**The parameter is removed rather than defaulted to `null`**, deliberately: a caller that can pass
a band can pass the wrong one, and leaving the hole open is how the workaround survived in the
first place.

### Judgement call 1 — the flat globals: **narrowed, not removed**, and relabelled

The brief asked me to remove them or mark them dead, and say which. **I did neither exactly: I
narrowed them to the untiered population and relabelled them, and I think that is the right answer
rather than a dodge.**

The concern behind the brief is a field that no longer does anything. `coachAbilityMin/Max` still
does something real: it bands the **shared hire-market pool**, which is one row served to every
country at every tier and therefore has no tier to be banded against. Removing it would have
forced an untiered band to be invented somewhere else — a worse outcome than a narrowed field.

**This is the house precedent, not my invention.** `PoolConfigController::saveStaffPoolConfig()`
already records exactly this for `scoutWageMin/Max`: *"A24's brief predicted this pair would become
dead config; it did not, because the pool is one row served to every country and so has no tier to
be banded against."* Same population, same reasoning, same outcome.

So nobody can tune a field that no longer does what it says:

- the entity docblock now opens with a ⚠️ saying the pair **no longer bands a club's staff**, names
  the live 4–75 vs documented 40–75 gap, and points at the new table;
- the admin card carries a visible **"Untiered only"** warning beside the inputs;
- the controller's save has the same note;
- `resolve()` reports the source as `poolConfig.coachAbilityMin/Max (untiered)`, so a diagnostic
  can tell which band it got;
- `StaffAbilityRangeServiceTest` pins it **from both sides** — the authored table wins for a
  tiered call, and the flat pair still wins for an untiered one.

### Judgement call 2 — scouts: the ability input, not the experience window

The brief said to move `ScoutGenerationService`'s **ability** resolution and leave its **experience
window** alone. A scout's `ability` is derived (`ScoutAbilityCalculator`, 70% experience + 30%
judgements), so there is no independent ability resolution to move. I read it as: the **banded
input that determines ability** moves to the staff table, and the flat untiered
`scoutExperienceMin/Max` (4–34 live) stays exactly as it is. That is what I did, and §4's after
run confirms both halves.

⚠️ **One scale conflation remains, and it is pre-existing rather than mine.** The banded figure
lands on `experience`, a years-of-experience axis, while the staff table is defined against player
`current_ability`. The tiered input was *already* a different quantity from `experience` before
A25 — it was player **potential** — so this change makes both sides of the staff comparison agree
without claiming to have settled what the experience axis means. **Open item, flagged not fixed**:
giving a scout's experience its own authored axis, or deriving ability from a banded ability rather
than a banded experience, is a separate ruling. Recorded in the service docblock and `.context`.

---

## 6. Where the ruling doc is wrong, as the brief asked

| claim in `a25-staff-ability-bands.md` | verdict |
|---|---|
| `coachAbilityMin/Max` is 4–75 live against a 40–75 default | 🟢 **Confirmed** (§1) |
| `scoutExperienceMin/Max` is 4–34 live | 🟢 **Confirmed** (§1), and untouched |
| Staff ability is two flat globals; `StarterPackService:151-152` lends the player band | 🟢 **Confirmed**, both fixed |
| The lent band is POTENTIAL, so staff and players are different quantities | 🟢 **Confirmed and measured** (§4's before table) |
| 25 countries at 8 tiers, SC at 4 | 🟡 **True of LIVE, false of this dev box**, where SC authors and runs 8 tiers with 3 clubs each (§2). Neither number is hardcoded as a result |
| 12/12/12/11 clubs in SC | 🟡 **Not reproducible here** — dev SC has 3 clubs per tier at 8 tiers. Not load-bearing for A25: nothing is wired around club counts |
| The band ceiling (61–75 vs `maxAbility: 60`) is an open blocker | 🔴 **Already closed by A24** before A25 started: an ability above the top row lands on that row, pinned by a test. The doc's warning was live when written and is now stale (§3) |
| *"Not independent of part B — settle part B first"* | 🟢 **Honoured by sequencing**: A24 landed first (`6c5e4ad5`). This change touches nothing that turns an ability into money |
| `StarterConfig::$leagueAbilityRanges` default is the live table | 🔴 **Not stated by the doc, but implied by using the default's numbers.** The live EN row is 40–90 … 2–7, not 75–95 … 10–25 (§1). This is why the seed is derived per country rather than hardcoded |

**Wage pricing was not touched.** `ScoutWageCalculator`, `WageModelResolver`,
`wageMultiplierTiers` and `PoolConfig::$scoutExperienceMin/Max` are unmodified:

```
$ git diff --stat HEAD -- src/Service/Economy/ src/Service/ScoutWageCalculator.php
(no output)
```

A staff member's `weeklySalary` does move, because `WageModelResolver::staffWeeklyPence()` takes
ability as an input and the ability changed. That is the pricing rule unchanged applied to a
corrected input, not a repricing — and it is why `WORLD_PACK_VERSION` is bumped.

---

## 7. Backfill — what happens to the staff already in the dev database

**Nothing needs to move, and I ran no backfill.** This is measured, not assumed.

```
$ lando php bin/console dbal:run-sql "SELECT count(*) AS staff, min(coaching_ability) AS lo, max(coaching_ability) AS hi, round(avg(coaching_ability)) AS avg FROM staff"
 ------- ---- ---- -----
  staff   lo   hi   avg
 ------- ---- ---- -----
  9784    4    75   39
 ------- ---- ---- -----

$ lando php bin/console dbal:run-sql "SELECT count(*) AS scouts FROM scout"
  5278

$ lando php bin/console dbal:run-sql "SELECT count(*) AS with_club FROM staff WHERE club_id IS NOT NULL"
  LINE 1: SELECT count(*) AS with_club FROM staff WHERE club_id IS NOT...
  ERROR: column does not exist
```

🔴 **`staff` has no `club_id` column at all.** Every one of those 9,784 rows is a **shared-pool**
row, drawn from the untiered `coach_ability_min/max` — which is exactly the 4–75 the `lo`/`hi`
above show, and which this change leaves alone. The same is true of the 5,278 scouts. **So no
persisted row is made stale by A25 and there is nothing to backfill.**

A **club's** staff exist nowhere but inside cached world packs and starter packs — a generated
staff member is not persisted anywhere (`StarterPackService` persists and consumes nothing, by
design since v11). Those are invalidated by **`WORLD_PACK_VERSION` 13 → 14**, which is in this
commit. ⚠️ **The bump is what delivers the fix**: nothing re-derives a staff member the way
`app:backfill-scout-abilities` re-derives a scout's `ability`, so a pack that is not rebuilt keeps
the old band indefinitely.

**Nothing destructive was run on my own authority, and nothing needs to be.** The one operator
action that follows this commit is rebuilding world packs, which the version bump already forces on
the normal path. If the owner wants the existing `staff`/`scout` pool rows re-rolled for any other
reason, that is a separate decision and I have not taken it.

---

## 8. Verification

### `wunderkind_test` — the trap DID apply this time

This migration adds a column, so the DDL was hand-applied before the suite would pass:

```
$ lando ssh -c "psql -h database -U wunderkind -d wunderkind_test -c \"ALTER TABLE pool_config ADD staff_ability_ranges JSON DEFAULT '{}' NOT NULL\""
ALTER TABLE

$ lando ssh -c "psql -h database -U wunderkind -d wunderkind_test -c \"SELECT staff_ability_ranges FROM pool_config\""
 {}
 …
(22 rows)
```

(⚠️ **22 `pool_config` rows in `wunderkind_test`** — pre-existing pollution, not mine, and
`PoolConfigRepository::getConfig()`'s `ORDER BY id ASC` is what makes it harmless. Noted because
it is the same family of problem as §8.3 below.)

### Static checks

```
$ lando php bin/console lint:container
 [OK] The container was linted successfully: all services are injected with
      values that are compatible with their type declarations.

$ lando php bin/console lint:twig templates/admin/pool_staff_config.html.twig
 [OK] All 1 Twig files contain valid syntax.
```

`lint:container` is the one that matters here: it proves the new `StaffAbilityRangeService` is
autowired into both generation services, `LeagueService`, `BootstrapCountryCommand` and
`LocationDashboardController` without a manual service definition.

### Targeted suites, as the work landed

```
tests/Service/StaffAbilityRangeServiceTest.php        OK (15 tests, 48 assertions)
tests/Service/StaffGenerationServiceTest.php          OK (9 tests, 288 assertions)
tests/Service/ScoutGenerationServiceTest.php          OK (13 tests, 999 assertions)
tests/Service/WorldPackClubGenerationServiceTest.php  OK (8 tests, 30 assertions)
tests/Controller/Admin/PoolConfigControllerTest.php   OK (19 tests, 66 assertions)
LeagueServiceTest + LeagueServiceSponsorRollTest + StarterPackServiceTest + PoolConfigControllerTest
                                                      OK (39 tests, 152 assertions)
```

### Full suite, run ALONE on an idle machine

Same command the 3,271 baseline was measured with (`a24-wage-bands-report.md`:540):

```
$ lando php vendor/bin/phpunit --colors=never --filter '/^(?!.*AdminShellCoverage).*$/'

Tests: 3290, Assertions: 157222, Errors: 1, Failures: 3, PHPUnit Deprecations: 1, PHPUnit Notices: 21, Skipped: 13.
```

#### 🟢 The count reconciles exactly: 3,290 against the 3,271 baseline at `6c5e4ad5` — **+19, all mine**

| test class | before | after | delta |
|---|---|---|---|
| `StaffAbilityRangeServiceTest` (new) | — | 15 | **+15** |
| `PoolConfigControllerTest` | 17 | 19 | **+2** (the grid persists and merges; a transposed pair is ordered) |
| `StaffGenerationServiceTest` | 7 | 9 | **+2** (a tiered build uses the table not the flat pair; an unauthored tier falls through to the defaults) |
| `ScoutGenerationServiceTest` | 13 | 13 | 0 (every case rewritten onto `(country, tier)`, none added) |
| `WorldPackClubGenerationServiceTest` | 8 | 8 | 0 |
| `LeagueServiceTest`, `LeagueServiceSponsorRollTest` | 9, 5 | 9, 5 | 0 |
| | | | **+19 → 3,290** ✅ |

Counted mechanically: `git show HEAD:<file> | grep -c "public function test"` against the same
grep on the working tree.

#### 🟢 The three failures are the documented pre-existing ones, confirmed BY NAME

```
1) App\Tests\Controller\Admin\NotificationLogCrudControllerTest::testIndexRowIsClickableToADetailPageShowingTheFullPayload
2) App\Tests\Controller\Api\CompetitionControllerTest::testShowIncludesResultsOnceRoundsAreProcessed
3) App\Tests\Service\Friendly\FriendlyResolveSingleMatchTest::testResolvingAnAcceptedChallengeRecordsAFullResult
```

Identical, by name and by assertion message, to A24's and A27's runs. Nothing else failed.

#### The run was repeated, and run 2 is the proof of §8.3's diagnosis

```
$ lando php vendor/bin/phpunit --colors=never --filter '/^(?!.*AdminShellCoverage).*$/'   # second run

Tests: 3290, Assertions: 157235, Errors: 1, Failures: 3, PHPUnit Deprecations: 1, PHPUnit Notices: 21, Skipped: 13.
```

| | run 1 | run 2 |
|---|---|---|
| tests | **3,290** | **3,290** |
| failures | the 3 known, by name | the 3 known, by name |
| errors | 1 — `LeaderboardHallOfFameTest`, `(XJ, 4)` | 1 — `LeaderboardHallOfFameTest`, **`(UU, 4)`** |
| assertions | 157,222 | 157,235 |

🟢 **The colliding country code CHANGED between runs — `XJ` then `UU`.** That is only possible if
the code is chosen at random and the leaked set is fixed, which is exactly §8.3's diagnosis. A
regression would collide on the same key every time, or on a key this change creates.

🟢 **And neither run leaked a single row**, which rules me out as a cause of the pollution as well
as of the error. The counts are byte-identical before run 1 and after run 2:

```
$ psql -d wunderkind_test -c "SELECT count(*) FROM league"                              -- 98, both times
$ psql -d wunderkind_test -c "SELECT tier, count(*) FROM league GROUP BY tier ORDER BY tier"
  1|1  2|9  3|14  4|47  5|8  6|6  7|6  8|7                                              -- identical, both times
```

The assertion count differs by 13 because the erroring test aborts at a different point and its
fixtures are randomised; the test count is identical, which is the figure that must reconcile.

**Collision rate, corrected upward from §8.3's estimate.** `LeaderboardHallOfFameTest` calls
`randomCountryCode()` at **two** sites (`:58`, `:125`), so it rolls twice per run: ≈ 48/676 per
roll → **~13.7% per run**, not 7.1%. Two hits in two runs is ~1.9% — unlucky, not systematic, and
the changing key settles it.

🟢 **The leaking class is definitively outside this change's path:**

```
$ grep -n "createLeaguesForCountry\|concludeSeason" tests/Service/LeagueServiceConcludeSeasonIdempotencyTest.php
  (10 matches, all concludeSeason(); createLeaguesForCountry: none)
```

`LeagueService::createLeaguesForCountry()` is the **only** method A25 modified, and that test never
calls it.

#### 8.3 ⚠️ The 1 ERROR is pre-existing test pollution, and here is the proof it is not mine

```
1) App\Tests\Service\LeaderboardHallOfFameTest::testTitlesProduceATierWeightedScoreOnTheLeaderboard
Doctrine\DBAL\Exception\UniqueConstraintViolationException:
  SQLSTATE[23505]: Unique violation: duplicate key value violates unique constraint "uq_league_country_tier"
  DETAIL: Key (country, tier)=(XJ, 4) already exists.
/app/tests/Service/LeaderboardHallOfFameTest.php:78
```

**It is not attributable to A25, and that is demonstrated rather than asserted:**

1. **The test's own docblock documents this exact failure mode**, written long before A25:
   *"The League especially: uq_league_country_tier is UNIQUE (country, tier) over only 676
   two-letter codes, so leaked rows accumulate until unrelated tests start colliding."*
   It picks its country with `chr(random_int(65,90)) . chr(random_int(65,90))`, so it is flaky by
   birthday collision against whatever has leaked.
2. **The colliding row was leaked by a different test class**, named in the data:
   ```
   $ psql -d wunderkind_test -c "SELECT country, tier, name FROM league WHERE country='XJ'"
     XJ | 4 | Idem Test Tier 4

   $ grep -rn "Idem Test Tier" tests/ src/
     tests/Service/LeagueServiceConcludeSeasonIdempotencyTest.php:425
   ```
   One writer, and it is not a class A25 touches.
3. **That class runs AFTER the failing one in the same suite**, so the row cannot have been
   created during this run. `phpunit.dist.xml` sets no `executionOrder`, so order is deterministic
   and alphabetical: `tests/Service/Leaderboard…` precedes `tests/Service/LeagueService…`
   (`d` < `g`). **The row therefore predates this run.**
4. **I never executed that class in any targeted run** before the full one — the only classes I ran
   were the eight listed above.
5. **Neither test touches the method I changed.** Both build leagues with `new League(...)`;
   `LeagueService` appears in `LeaderboardHallOfFameTest` once, inside a comment. The only method
   A25 modified is `LeagueService::createLeaguesForCountry()`, which neither test calls.
6. **It passes in isolation:**
   ```
   $ lando php vendor/bin/phpunit --colors=never --no-coverage tests/Service/LeaderboardHallOfFameTest.php
   OK (4 tests, 13 assertions)
   ```

**Scale of the leak, and why the baseline runs did not hit it:**

```
$ psql -d wunderkind_test -c "SELECT count(*) FROM league"            -- 98
$ psql -d wunderkind_test -c "SELECT tier, count(*) FROM league GROUP BY tier ORDER BY tier"
  1|1   2|9   3|14   4|47   5|8   6|6   7|6   8|7
$ psql -d wunderkind_test -c "SELECT name, count(*) FROM league GROUP BY name ORDER BY 2 DESC LIMIT 3"
  Idem Test Tier 4 | 47
  Test Tier        |  7
  Idem Test Tier 2 |  7
```

The failing test creates a tier-1 and a tier-4 league under one random code, so it collides when
either is taken: **48 of 676 codes ≈ 7.1% per run.** That is exactly why the 3,265 and 3,271
baseline runs came back clean and this one did not — it is a dice roll, not a regression.

🔴 **PROPOSED, NOT DONE — a cleanup I did not take on my own authority.** Deleting the 98 leaked
`league` rows (and the 22 `pool_config` rows) from `wunderkind_test` would remove a ~7% flake that
will keep misattributing itself to whoever runs the suite next. It is a destructive statement
against a database other sessions share, so it is the owner's call. The honest fix in code is for
`LeagueServiceConcludeSeasonIdempotencyTest` to tear its leagues down on failure as
`LeaderboardHallOfFameTest` already tries to — a separate change, and out of A25's scope.

---

## 9. Files changed

```
 M .context/shared/last-sync.md                                  (one appended pass entry, nothing restructured)
 M .context/stages/03_data/output/entities.md                     (the new column, the narrowed pair)
 M .context/stages/03_data/output/migrations.md                   (Version20261120150000)
 M .context/stages/04_interfaces/output/services.md               (new service; staff/scout/starter-pack entries rewritten)
 M src/Command/BootstrapCountryCommand.php                        (step 3b: seed the staff band)
 M src/Controller/Admin/LocationDashboardController.php           (Seed-defaults button seeds both bands)
 M src/Controller/Admin/PoolConfigController.php                  (grid data + save, merge-over-stored, raw UPDATE)
 M src/Entity/PoolConfig.php                                      (staffAbilityRanges; coachAbility* docblocks)
 M src/MessageHandler/WorldPack/WarmWorldPackClubMessageHandler.php
 M src/Service/LeagueService.php                                  (staff syncToPyramid after the player one)
 M src/Service/ScoutGenerationService.php
 M src/Service/StaffGenerationService.php
 M src/Service/StarterPackService.php                             (the :151-152 borrow, removed and explained)
 M src/Service/WorldInitializationService.php                     (callers + WORLD_PACK_VERSION 13 -> 14)
 M src/Service/WorldPackClubGenerationService.php
 M templates/admin/pool_staff_config.html.twig                    (STAFF ABILITY BANDS card + untiered warning)
 M tests/Controller/Admin/PoolConfigControllerTest.php            (+2)
 M tests/Service/LeagueServiceSponsorRollTest.php                 (constructor)
 M tests/Service/LeagueServiceTest.php                            (constructor)
 M tests/Service/ScoutGenerationServiceTest.php                   (rewritten onto (country, tier))
 M tests/Service/StaffGenerationServiceTest.php                   (+2)
 M tests/Service/WorldPackClubGenerationServiceTest.php           (constructor)
?? migrations/Version20261120150000.php
?? src/Service/StaffAbilityRangeService.php
?? tests/Service/StaffAbilityRangeServiceTest.php
```

Staged by explicit path, never `git add -A` — another session shares this checkout. `git status`
showed only these 25 paths, so nothing of theirs was in the tree.

The measurement probes lived in the gitignored `var/a25/` (confirmed with `git check-ignore -v`)
and were deleted after use — nothing scratch-shaped entered either repository.

---

## 10. Out of scope, confirmed untouched

| | |
|---|---|
| **Wage pricing of any kind** | `git diff --stat HEAD -- src/Service/Economy/ src/Service/ScoutWageCalculator.php` → empty. `wageMultiplierTiers` unread and unwritten by this change |
| **`PoolConfig::$scoutExperienceMin/Max`** | Unchanged (4–34 live), still the untiered window, confirmed live in §4's after run |
| **The app repo** | Not opened. No app change is needed — no payload key changes shape, type or meaning |
| **Re-banding / rebalancing** | The seed is a measured derivation of the authored player band, not a tuning choice; §3 states where it is a fit and what that means |
| **Club counts** | Nothing wired around them; depth comes from the authored player band (§2) |

## 11. Open items for the owner

0. 🔴 **A25 does not fix the Scottish new-game screen in §0, and on live numbers makes it ~10%
   worse — see §12.** The ability is now correct; the screen needs two other things that are not
   mine: **SC's authored player band re-authored for a 4-tier pyramid** (it currently carries
   tiers 1–4 of an 8-tier ladder, so Scotland's bottom division is authored as a mid-table English
   one, which sets both the staff seed and the tier scale), and **A24's staff/scout country
   scaling**. A fourth contributor is headcount: live starter counts are 20 players against 13
   staff, `starterCoachCount: 8`. All three are calibration or pricing, so all three are the
   owner's call.
1. 🟡 **The seed's numbers are a seed.** They are coherent with the players at each tier by
   construction, not chosen. If a tier's staff should be deliberately better or worse than its
   players — which the ruling notes is the whole point of having a separate table — that is now a
   grid an operator edits, and it is calibration.
2. 🟡 **A scout's banded input is still `experience`, not an ability** (§5, judgement call 2).
   Pre-existing, improved but not resolved; needs its own ruling.
3. 🟡 **World packs must be rebuilt** for the new bands to reach a device. The
   `WORLD_PACK_VERSION` 13 → 14 bump forces that on the normal path; no backfill of any table is
   needed (§7).
4. 🔴 **`wunderkind_test` has 98 leaked `league` rows and 22 `pool_config` rows** causing a ~7%
   per-run flake that misattributes itself to whoever runs the suite (§8.3). Cleanup proposed, not
   performed.

---

## 12. 🔴 Does A25 fix the Scottish screen in §0? **No — and here are the numbers**

The PM session asked me to check my authored defaults against the device evidence rather than let
A25 ship looking fixed. It does not fix that club, and on the live numbers it makes that one
screen marginally worse. This section is the disclosure; it changes no numbers.

### The measurement

A25 changes exactly one input to a staff wage: the **ability**. `staffWeeklyPence()` is
`(role band base × tier scale) × staffMultiplier(ability)`, and A25 touches only the last factor —
so the ratio of staff bills before and after **is** the ratio of expected `staffMultiplier`.
Computed through the real `WageModelResolver::multipliersFor()` over every integer in each band,
with the LIVE `wageMultiplierTiers` (`maxAbility` 15/25/40/60 → `staffMultiplier` 2/4/8/12) and the
LIVE authored player bands:

```
OLD flat global band 4-75  ->  mean staffMultiplier 8.528  (every club, every tier, every country)

ctry tier  player band    A25 staff band old mult    new mult    change in staff bill
EN   1     40-90          29-55          8.528       10.370      +21.6%  (x1.22)
EN   2     30-60          20-38          8.528       6.947       -18.5%  (x0.81)
EN   3     20-40          14-26          8.528       4.462       -47.7%  (x0.52)
EN   4     15-35          11-21          8.528       3.273       -61.6%  (x0.38)
EN   5     10-25          8-15           8.528       2.250       -73.6%  (x0.26)
EN   6     10-15          6-11           8.528       2.000       -76.5%  (x0.23)
EN   7     5-10           3-6            8.528       2.000       -76.5%  (x0.23)
EN   8     2-7            2-4            8.528       2.000       -76.5%  (x0.23)

SC   1     75-95          38-72          8.528       11.771      +38.0%  (x1.38)
SC   2     65-85          34-64          8.528       11.226      +31.6%  (x1.32)
SC   3     55-75          29-55          8.528       10.370      +21.6%  (x1.22)
SC   4     45-65          25-47          8.528       9.391       +10.1%  (x1.10)

TierBandScaleResolver::scaleFor (midpoint(tier) / midpoint(tier 1)), unchanged by A25:
  EN tier 8: mid 4.5 / mid 65.0 = 0.0692
  SC tier 4: mid 55.0 / mid 85.0 = 0.6471
```

### What that says

🟢 **Where the pyramid is deep, A25 works and works hard.** EN tiers 2–8 see the staff bill fall
**18% to 77%**, and EN tier 1 rises 21.6% — which is the point: a top-flight backroom *should* cost
more than a flat global average, and a tier-8 one much less. That is the chartered defect, removed.

🔴 **For Scotland it does the opposite, at every tier, including tier 4: +10.1%.** So the §0 screen
will not come out right from this change, and I am saying so rather than letting the tier table's
existence imply it.

### Why — and it is not the ability band

**Live SC authors `75-95 / 65-85 / 55-75 / 45-65`: tiers 1–4 of an EIGHT-tier ladder.** Scotland's
**bottom** division is authored as a mid-table English one (45–65 potential, against EN tier 4's
15–35 and EN tier 8's 2–7). A staff band derived from that input is high because the input says the
division is strong. The seed is faithful to the authored table — which is the ruling — so it cannot
come out small while the table says that.

The same input drives the other half of the bill independently of A25:
`TierBandScaleResolver::scaleFor` scales the role band to **6.9% for EN tier 8** but **64.7% for
SC tier 4**. Two *bottom* divisions, a 9.4x gap in the base before any multiplier. Compounded with
the multipliers above, a SC tier-4 staff member costs `0.647 × 9.391` against an EN tier-8 one's
`0.069 × 2.000` — a **44x** difference between two clubs that are each the bottom of their country.

### Three causes, and only one was mine

| cause | whose | status |
|---|---|---|
| Staff ability drawn from two flat globals, 4–75, regardless of country or tier | **A25** | ✅ **Fixed.** Ability now tracks the authored per-country/per-tier table |
| **SC's authored PLAYER band treats its bottom tier as an 8-tier ladder's 4th**, which sets both the staff seed and the tier scale | **owner — calibration of the player table** | 🔴 **Open.** Re-authoring it would move every Scottish player's generation and pricing too, so it is explicitly not mine to touch |
| **Staff/scout wages appear not to be country-scaled**, so the same ability costs the same in SC as in EN despite SC's wage scale being a tenth of EN's | **A24 — pricing** | 🟡 Being measured there. Not mine; conflating the two is how one of us would hide the other's symptom |

And a fourth contributor that is neither ability nor price: **headcount.** Live starter counts are
`starterPlayerCount` **20** against `manager 1 + coach 8 + chairman 1 + DoF 1 + facilityManager 1 +
scout 1` = **13 staff**. Thirteen backroom staff for a twenty-player tier-4 club will dominate the
wage bill at any correct ability or price. Flagged, not touched — `starterCoachCount: 8` looks like
a figure nobody has revisited, and changing it is calibration.

### What would actually prove it either way

The §0 screen on a regenerated tier-4 Scottish club, on a pack rebuilt at `WORLD_PACK_VERSION` 14.
**I cannot run it** — it is the app, which A25 does not touch. My prediction, stated now so it can
be checked rather than claimed afterwards: **staff wages on that screen will go UP by roughly a
tenth, not down**, and the club will still be insolvent from week one. The Scottish screen needs
the SC player band re-authored for a 4-tier pyramid and A24's country scaling; A25 is a necessary
part of that and not a sufficient one.

---

## 13. The record: A25 touched no app file, and the app work is A24's

Two sessions — the DOF-pot refund session and then the PM — asked A25 to set aside, and then to
**revert**, uncommitted work in `wunderkind-app`'s `src/economy/economyDiagnostics.ts` and
`src/__tests__/economy/staffValuationChecks.test.ts`, on the belief that it was A25's and was
blocking a deploy.

**It is not A25's. A25 never wrote a file in the app repo.** The revert was declined, because a
path-level `git checkout` would have destroyed roughly **309 uncommitted insertions belonging to
two other sessions** — A24's `staffValuationChecks` rework and the DOF-pot session's own
`dofPotChecks` block are in the same file — with no stash to recover from in a shared checkout.

🟢 **Both sessions subsequently verified the attribution themselves and retracted.** The PM
confirmed `a818a60b` holds 25 paths and zero `.ts` files and withdrew the instruction in terms
(*"That was a destructive instruction issued on an inference"*); the DOF-pot session independently
checked the diff, found A24's markers, and also warned against the restore before the retraction
reached it. Recorded here not as blame — the inference each made was a reasonable one — but because
the evidence and the near-miss should outlive the exchange.

### The evidence

```
$ cd wunderkind-backend && git show --name-only --format='' a818a60b | grep -c '\.ts$'
0
```
A25's only commit is **25 paths, all `wunderkind-backend`** — PHP, one Twig template, four
`.context` files. No TypeScript, no app-repo path.

```
$ cd wunderkind-app && git diff | grep -c "staffAbilityRanges\|StaffAbilityRange\|A25"
0
$ cd wunderkind-app && git diff | grep -c "A24"
3
```
**Zero** references to A25's work anywhere in the app repo's uncommitted diff. The file's own added
comments name their author: *"and, since A24, a scout — so this panel cannot drift from the pricing
path"*, *"Since A24 this is the..."*. It modifies `staffValuationChecks` and adds the flagged
`import { npcStaffWagePence } from '@/engine/ClubWageScaleService'` at diff line 12. That matches
the A24 session's charter — it repriced staff and scout wages off the wage band and is still open in
the app repo.

```
$ cd wunderkind-app && git status --porcelain | wc -l
32
```
⚠️ **And the app tree is not one session's workspace.** It holds 32 in-flight paths from several
sessions at once — the DOF refund's own `dofPotRefund.test.ts`, `dofPotLedger.ts`, `dofHireCharge`,
`DofStaffHiringService`; youth promotion; transfers; four stores; the PM's own
`.context/stages/01_overview/output/environment.md`. A `git checkout ac71159b -- <path>` aimed at
"A25's files" in that tree would have been an unrecoverable delete of work belonging to whoever
actually wrote it, with no stash to fall back on (project rule: never stash in a shared checkout).

### What was done instead

- **Nothing in the app repo was modified.** Every A25 action there was read-only (`git status`,
  `git diff`, `ls`).
- **A protective backup was written**, because two sessions were operating on the false premise and
  a third might: `docs/economy-loose-ends/app-economyDiagnostics-SAFETY-PATCH.diff`, outside both
  code repos, with provenance, the two known failures and application instructions. It is additive
  and destroys nothing.
  ⚠️ **Its first header was itself wrong, and the fix is worth recording as the same class of
  error.** It was labelled as A24's work — but `git diff <path>` is path-level, so capturing "A24's
  work" captured *every* writer's hunks in those paths. The file has **two** other authors: A24's
  `staffValuationChecks` rework and `npcStaffWagePence` import (9 references), and the DOF-pot
  session's `dofPotChecks` block (~line 295). Applying the patch whole, once either owner has
  committed, would reintroduce or conflict with the other's hunks. The header now names both
  authors and warns against a blind `git apply`. The precise shape of the original mistake —
  attributing a whole path to one author because one author's marker was in it — is the same
  inference that started this exchange.
- **Both sessions were told**, with this evidence, that A25 does not hold the file and that the
  owner is the idle `A24 — staff + scout wages from the band` session.

### The scoping question, answered directly

The PM asked: *"If you believed the app change was required to make the backend table usable, say
so and I will scope it properly as its own task."*

**No app change is required.** §10 and the `WORLD_PACK_VERSION` 13 → 14 note already say so and it
is not a convenience claim: no payload key changes shape, type or meaning. `staff[].coachingAbility`,
`staff[].scoutingRange`, `staff[].weeklySalary` and `scouts[].experience`/`ability` take different
*values* for the same club, under the field names and types the app already reads. The app needs a
pack rebuilt at v14 and nothing else. The one app-side thing A25 **would** benefit from is a CHECKS
row surfacing the resolved staff band and its source — genuinely useful, genuinely optional, and
correctly someone else's task.

**Nothing in this section affects commit `a818a60b`**, which is backend-only and stands as verified
in §8.

---

## 14. Corroboration from the app side (A24's measurements, not mine)

Reported by the A24 session after reading §12, measured independently in the app repo. It reaches
the same asymmetry from the other direction, and it closes the one question §12 could not answer
from the backend: whether the Scottish screen is a code defect or a config-authoring fact.

- **`resolveEconomy` (`economyConfig.ts:154`) takes no country parameter at all.** Country reaches
  app-side pricing only through the stored `economyTierBaseline`.
- **The wage band is exactly linear in the country scale** — EN/SC = **10.000** at every ability and
  every tier (EN synthesised as SC×10 from the PM's figures).
- **`npcStaffWagePence` is exactly invariant to it** — EN/SC = **1.000** — because it is a share of
  the club's own money.

🟢 **So §12's "every SC tier rises while EN tiers 2–8 fall 18–77%" is the same defect seen through
`multipliersFor()`: a quantity that scales with the country sitting against one that does not.**
Two independent measurements, two codebases, one asymmetry.

And the part that matters for what to do next: **the cause is a config-authoring fact, not a code
defect.** Live SC authors tiers 1–4 of an eight-tier ladder, so its bottom division is authored as
a mid-table English one, with `TierBandScaleResolver::scaleFor` at 64.7% for SC tier 4 against 6.9%
for EN tier 8. **No amount of app-side or backend-side code work fixes that** — the authored table
has to change, which is the owner's calibration call. A24 is not touching pricing for the same
reason A25 did not touch the band values: unruled.

### ⚠️ A testing rule, not three incidents

A24's observation, and it is worth stating as a rule because it has now cost this workstream three
separate findings:

1. The CHECKS panel's England reading of **1.00 on scouts was a FALSE PASS** — a coincidence of
   England being the country tested first.
2. A second non-England country exposed something England could not (A24's record).
3. **This report's §12** — the tier-ladder divergence is invisible in England, whose eight authored
   tiers match its eight real ones. It only appears in a country whose authored depth and pyramid
   depth differ, which on the live row is Scotland alone.

**The rule: England is the worst country to test a per-country mechanism against, because it is the
one whose authored config is complete and whose depth is the default.** A check that passes on
England has demonstrated almost nothing about country-scaling; a per-country or per-tier change is
not verified until it has been measured on a country that is *not* eight-tier, *not* fully authored,
or *not* the scale anchor. Scotland is currently the only live country that is any of those, which
makes it the mandatory second case rather than an edge case.

This also explains the §2 confusion in retrospect: the ruling doc's "SC at 4 tiers" was measured on
live, the dev box has SC at 8, and nobody noticed the two disagreed because every England-based
check passed on both.
