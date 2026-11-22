# Economy overhaul — dev deployment test plan

**Target:** `https://dev.buildmyclub.co.uk` (Hetzner, `/mnt/volume-wkf/wunderkind/dev`, `docker-compose.dev.yml`, service `app`)
**Deployed:** 2026-11-12 21:00–21:03 UTC, GitHub Actions run **43305839156**, conclusion **success**
**Branch:** `dev` at `d565432` (merge of `development` @ `ce43a08`)
**Not on prod:** `master` has none of this work, which this plan exploits — **production is the "before" snapshot.**

Companion document: `01-backend-work-completed.md` (what the work *is*). This one is only *how you prove the box is in the state that document claims.*

---

## 0. How to read this plan

There are three kinds of test here and they are not equally important.

| Phase | Question it answers | If it fails |
|---|---|---|
| **A** | Did the deploy actually land — migrations, schema, columns? | Fix forward; the box is in an unknown state and nothing below means anything. |
| **B** | **Did anything move that was not supposed to move?** | **STOP. Do not merge to `master`.** This is the whole premise of the work: the deploy is meant to be a provable no-op. |

> ⚠️ **On what counts as evidence in Phase B.** Prefer checks that are properties of the CODE
> (a pricing path's gate) or of an **authored** table (`league`, `game_config`,
> `country_profile`) over row counts and sums on the **shared pool** (`player`, `staff`,
> `scout`). The pool is cleared and refilled by ordinary operator action, so a pool checksum
> that differs proves nothing and one that matches proves little. §8 carries a correction where
> this plan originally got that wrong.
| **C** | Do the new surfaces work when an operator switches them on? | A bug here is a bug in an unreleased feature. Log it, keep the switches off, promotion can still go ahead. |

**Phase B is the plan.** A, C and D support it. The brief's hard rule was "ship inert", and inert is a claim about a running box, not about a test suite — 3,002 green tests prove the code is self-consistent, not that *this* database came out the other side unchanged.

Phase C requires **changing live dev config**, so run A and B to completion first, and expect to undo C's changes afterwards (§D). Phase C is also how an operator will rehearse the real rollout; `wunderkind-backend/docs/deploy/economy-rollout.md` is the runbook it rehearses.

---

## 1. Setup

Everything below assumes these in your shell. Nothing in this plan needs the production box except the two key-set diffs in B1/B2, which read public endpoints only.

```bash
DEV=https://dev.buildmyclub.co.uk
PROD=https://www.buildmyclub.co.uk          # the "before" reference — read-only, public endpoints only

# A real dev account with a club. Any test user will do.
TOKEN=$(curl -s -X POST "$DEV/api/login" \
  -H 'Content-Type: application/json' \
  -d '{"email":"...","password":"..."}' | python3 -c 'import sys,json;print(json.load(sys.stdin)["token"])')

CLUB=<club-uuid>                             # from GET /api/club, or the admin club list
AUTH=(-H "Authorization: Bearer $TOKEN" -H "X-Club-Id: $CLUB")
```

Shell on the box, for the SQL and console checks:

```bash
ssh <hetzner>
cd /mnt/volume-wkf/wunderkind/dev
dc() { docker compose -f docker-compose.dev.yml "$@"; }
psql() { dc exec -T db psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -At -c "$1"; }   # creds from .env
console() { dc exec -T app php bin/console "$@"; }
```

Admin UI: `https://dev.buildmyclub.co.uk/admin/login` — a `ROLE_ADMIN` account, separate from the API user provider.

---

## 2. Phase A — the deploy landed

### A1 · The run succeeded and ran migrations

```bash
gh run view 43305839156 --log | grep -A3 "doctrine:migrations:migrate"
```

**Pass:** the step is present and exits 0. Already confirmed: run concluded `success` at 21:03:37 UTC. If a later push to `dev` has superseded it, check the newest run instead — the concurrency group serialises dev and prod deploys, so a queued run is normal, not a failure.

### A2 · All nine economy migrations are recorded as executed

```bash
console doctrine:migrations:list | grep 20261112
```

**Pass:** these are `migrated`, in this order. **Nine were deployed in run 43305839156; `…230000` came later and is expected to be `not migrated` until the next deploy.**

| Version | What it adds |
|---|---|
| `20261112160000` | `country_profile.is_economy_baseline`, `economy_factor_bp` + the partial unique index |
| `20261112160100` | 13 `game_config` economy columns |
| `20261112160200` | `inflation_rate_history` table + its FK/index |
| `20261112170000` | 4 published constants on `game_config` |
| `20261112180000` | `league.tv_pool_pence`, `slots`, `league_position_decrease_percent` + the `slots` backfill |
| `20261112190000` | `game_config.economy_staff_role_bands_pence` |
| `20261112200000` | `game_config.league_parachute`, `league.parachute` |
| `20261112210000` | `game_config.economy_season_investment_base_pence` |
| `20261112220000` | `game_config.economy_youth_scholarship_cap_bp` |
| `20261112230000` | `game_config.economy_youth_scholarship_tier1_pence` + `…_floor_pence` — **added after the first nine deployed; not on the box yet** |

`20261112010000` in the same date range is the country name-pool work, not this.

### A3 · The mapping and the schema agree

```bash
console doctrine:schema:validate
```

**Pass:** `Mapping` says OK, and `Database` reports **only the two known pre-existing items below and nothing economy-related.** Dump them rather than trusting the summary line:

```bash
console doctrine:schema:update --dump-sql
```

**The known baseline on this box (measured 2026-11-12, not a regression):**

```sql
DROP INDEX uq_world_pack_generation_run_one_active_per_country;
CREATE UNIQUE INDEX uq_world_pack_generation_run_one_active_per_country ON world_pack_generation_run (country)
  WHERE ((status)::text = ANY (ARRAY[('pending'::character varying)::text, ('in_progress'::character varying)::text]));
COMMENT ON COLUMN npc_club.land_plot_id IS '';
```

Both are a **DBAL 4 `pg_get_expr` round-trip**: the stored predicate and the mapping's differ only in how the partial index's casts are formatted. Documented in `dbe3644` ("Clear the ORM/database schema drift") and re-noted in `Version20261102121403`'s docblock, which hand-trimmed the same pair out of a generated diff. Pre-dates this work by ten days.

**So the real assertion is a negative one:** no `game_config`, `country_profile`, `league`, or `inflation_rate_history` line appears in that dump. None does — which incidentally validates the approach the `country_profile` partial unique index was written with (spell the predicate exactly as `pg_get_expr` reports it, and it round-trips clean). A new line naming an economy table *would* be a regression; the two above are the floor, not a pass/fail.

### A4 · The new columns exist carrying their inert defaults

```bash
psql "SELECT economy_wage_model, economy_weeks_per_season, inflation_rate_per_season_bp,
             economy_season_investment_base_pence, economy_youth_scholarship_cap_bp,
             matchday_food_uptake_percent, economy_baseline_turnover_pence,
             league_parachute
      FROM game_config;"
```

**Pass, exactly:**

| Column | Expected | Why it matters |
|---|---|---|
| `economy_wage_model` | `legacy` | the master switch, off |
| `economy_weeks_per_season` | `46` | the agreed figure (not 38) |
| `inflation_rate_per_season_bp` | `0` | index stays 1.0 forever |
| `economy_season_investment_base_pence` | `0` | the endpoint is reachable but refuses everything |
| `economy_youth_scholarship_cap_bp` | `5000` | cannot bite under `legacy` regardless |
| `economy_youth_scholarship_tier1_pence` | `0` | after `…230000` lands. 0 = the flat figure stands |
| `economy_youth_scholarship_floor_pence` | `0` | after `…230000` lands |
| `matchday_food_uptake_percent` | `35` | |
| `economy_baseline_turnover_pence` | `[0,0,0,0,0,0,0,0]` | eight zeros, never `[]` — `normaliseTierBpList()` pads to 8. Nothing authored ⇒ nothing resolvable |
| `economy_tier_factors_bp` | `[10000] × 8` | parity at every tier |
| `league_parachute` | `NULL` | not `[]` — see B-note below |

```bash
psql "SELECT count(*) FILTER (WHERE is_economy_baseline) AS baselines,
             count(*) FILTER (WHERE economy_factor_bp <> 10000) AS non_parity
      FROM country_profile;"
```

**Pass: `1 | 0`** — and the `1` is correct, not somebody's half-finished authoring.

`Version20261112160000` ends with `UPDATE country_profile SET is_economy_baseline = true WHERE code = 'EN'`, written as an unconditional UPDATE so a database with no EN row simply gets no baseline. **A baseline with every factor still at 10000 is exactly parity**, because a country's factor is normalised against the baseline row's own value — England divided by England is 1. `non_parity = 0` is therefore the half that carries the inertness claim, and `baselines` should be `1` (or `0` on a database without an EN row). **`2` is impossible** and would mean the partial unique index is gone.

### A5 · Nothing is erroring

```bash
dc logs --since 30m app | grep -iE "critical|emergency|fatal|SQLSTATE" | head
psql "SELECT country, count(*) FROM league WHERE slots = 0 GROUP BY country;"
```

**Pass:** no new errors, and no country that has NPC clubs is left at `slots = 0`. A country with nothing generated yet legitimately stays at 0 — that is the "derive" sentinel, and B4 proves it is harmless.

> ⚠️ **Unrelated but real:** `var/log/dev.log` reached 2.0 GB locally and `DashboardController::logs()` reads it whole with `file()`. On the dev box the same page will OOM once that file is large. Check `dc exec -T app ls -lh var/log/` while you are in there. Out of scope for this work; worth a ticket.

---

## 3. Phase B — the inertness proof

> **The premise being tested:** every migration and every new behaviour defaults to "no change", so a build compiled before any of this exists must see an identical world. Additive keys are allowed. **A changed value under an unchanged key is a break** and must appear in `.context/shared/api-backwards-compatibility.md` — exactly one does (B10).

### B1 · `GET /api/starter-config` grew keys and changed nothing else

Prod is the before-snapshot. Compare **key paths**, not values — the two boxes have independently authored config rows, so values legitimately differ.

```bash
keys() { python3 -c '
import json,sys
def walk(o,p=""):
    if isinstance(o,dict):
        for k,v in o.items(): yield from walk(v,p+"."+k)
    elif isinstance(o,list) and o:
        yield from walk(o[0],p+"[]")
    else: yield p
print("\n".join(sorted(set(walk(json.load(sys.stdin))))))'; }

curl -s "$PROD/api/starter-config" | keys > /tmp/before.txt
curl -s "$DEV/api/starter-config"  | keys > /tmp/after.txt
diff /tmp/before.txt /tmp/after.txt
```

**Pass:** every diff line is a `>` (added). **One `<` line is a failure** — a removed or renamed key.

> **Caveat on using prod as the reference:** `master` is behind `dev` by more than the economy work, so the additions include keys from earlier releases (`clubFundingMinimumPence`, `clubFundingProjectionWeeks`, the whole `leagueAbilityRanges` subtree). That is fine for this test, which only ever asserts *nothing was removed*. If you want a diff that isolates the economy release, take the before-snapshot from a `dev` deploy that predates run 43305839156 rather than from prod.

**Expected additions**, all under `.economy`: `wageModel`, `weeksPerSeason`, `wageToTurnoverRatioBp`, `wageCurveExponentBp`, `staffWageShareBp`, `reputationSpreadBp`, `wageScaleUnit`, `tierFactorsBp[]`, `baselineTurnoverPence[]`, `inflationRatePerSeasonBp`.

### B2 · `GET /api/game-config` — same test, both call shapes

```bash
curl -s "$PROD/api/game-config"           | keys > /tmp/gc-before.txt
curl -s "$DEV/api/game-config"            | keys > /tmp/gc-after.txt
curl -s "$DEV/api/game-config?country=EN" | keys > /tmp/gc-en.txt
diff /tmp/gc-before.txt /tmp/gc-after.txt
diff /tmp/gc-after.txt  /tmp/gc-en.txt
```

**Pass:** the first diff is additions only — `economyTierBaseline` (and its subtree), `inflationRatePerSeasonBp`, `matchdayFoodUptakePercent`, `npcSolvencyThresholds[]`, `dofWageBillThresholdPct[]`, `sponsorWeeklyPence`. **The second diff must be empty**: the key set is identical with and without a country, only values change. That property is what lets the app render one screen from either, and it is the one a careless future edit breaks first.

`/api/game-config` is `PUBLIC_ACCESS` and therefore has no club to infer a country from — hence the explicit `?country=`.

### B3 · Every tier reports `resolvable: false`

```bash
curl -s "$DEV/api/game-config?country=EN" | python3 -c '
import json,sys
t=json.load(sys.stdin)["economyTierBaseline"]
print("country",t["country"],"tierCount",t["tierCount"],"model",t["wageModel"])
for r in t["tiers"]:
    print(r["tier"], r["turnoverPence"], r["wageScaleMicroPence"], r["resolvable"], r.get("youthScholarshipPence"))'
```

**Pass:** `resolvable` is `false` on all eight rows, and `wageModel` is `legacy`. This is the single most informative check in the plan: a `true` here means somebody has authored a turnover table on dev, and the new chain would be live the moment the model flips.

Repeat for `?country=SC`. **Verified live 2026-11-12:** Scotland returns `tierCount: 4` with four `tiers` rows, England and Germany `8` with eight. (The local dev-DB clone used during development had `league_tier_count = 8` for every country including Scotland; the deployed dev box does not. Read the box, not the clone.) The key *paths* are identical either way, which is what B2's second diff pins.

### B4 · No TV deal can have moved

`Version20261112180000` **does** backfill `tv_pool_pence` — it is not left NULL. It authors `slots` from each country's maximum NPC count, then sets `tv_pool_pence = tv_deal × size`, so dividing the pool back by the same size reproduces `tv_deal` **exactly, by construction**. The check is therefore the round-trip identity, not a null count:

```bash
psql "SELECT count(*) AS leagues,
             count(*) FILTER (WHERE tv_pool_pence IS NOT NULL) AS pooled,
             count(*) FILTER (WHERE tv_deal IS NULL AND tv_pool_pence IS NOT NULL) AS bogus_pool,
             count(*) FILTER (
               WHERE tv_deal IS NOT NULL
                 AND tv_pool_pence / GREATEST(slots, 1) <> tv_deal
             ) AS mismatched
      FROM league;"
```

**Pass:** `bogus_pool = 0` and **`mismatched = 0`**. `pooled` equals the number of leagues with a non-null `tv_deal` — that is correct, not a leak: a league with no TV money gets a NULL pool rather than a zero one, because "no TV deal" and "a TV deal of nothing" are different authored states.

```bash
psql "SELECT country, tier, slots, tv_deal, tv_pool_pence
      FROM league WHERE country IN ('EN','SC') ORDER BY country, tier;"
```

**Pass by eye:** `slots` is uniform per country and equals that country's **maximum** NPC count across its tiers — on the development clone England was 18 and Scotland 3, but these are `--clubs-per-tier` artefacts rather than design, so read the figures off the box and check only that they are uniform per country. `tv_pool_pence / slots` is the `tv_deal` each tier was authored with.

> The backfill uses the per-country maximum deliberately. The bottom tier holds one fewer NPC because that seat is the player's, so the maximum *is* the playing size — and using it makes `slots` uniform per country instead of leaving the bottom tier one short. It is a different figure from what the *derive* rule produces for an unauthored league (NPC rows **+1** for the deepest tier); they agree for a properly bootstrapped country and that is the point.

`tvDeal` reaches clients through **`POST /api/sync`** (`SyncService.php:817`) and the world-pack snapshot, not through a REST league endpoint — so B9's sync capture is where you see the published figure. Confirm the `tvDeal` in that payload matches the `tv_deal` column for the club's league.

### B5 · The youth scholarship is still the flat £250

```bash
curl -s "$DEV/api/game-config?country=EN" | python3 -c '
import json,sys
print({r["tier"]: r.get("youthScholarshipPence") for r in json.load(sys.stdin)["economyTierBaseline"]["tiers"]})'
```

**Pass:** every tier publishes the *same* figure, and it equals `game_config.youth_scholarship_wage_pence` (`25000` = £250 unless an operator has authored otherwise — check the column, do not assume the default). This is the defect that was fixed, and it had two halves — the resolved figure used to *invert* at the bottom (1.97× an average tier-8 wage) and was a rounding error at the top (0.19% of an average tier-1 wage). The whole mechanism — the tier-1 anchor, the floor and the cap — is gated on `economyWageModel == turnover`, so **all eight tiers must still read identically on this box**, and that identity is the inertness proof. `testTheCapCannotBiteUnderTheLegacyModel` and `testAZeroAnchorIsTheOldBehaviourExactly` pin it from the other side.

Once the model is flipped and an anchor authored, this check inverts: the eight figures must then all *differ* (or sit on the floor), and none may exceed half that tier's average first-team wage. The gate command's check 5 is the machine-readable version.

### B6 · Sponsor bands equal the raw config columns

```bash
curl -s "$DEV/api/game-config?country=EN" | python3 -c '
import json,sys;print(json.load(sys.stdin)["economyTierBaseline"]["sponsorBandsPence"])'
psql "SELECT small_sponsor_min, small_sponsor_max, medium_sponsor_min, medium_sponsor_max,
             large_sponsor_min, large_sponsor_max FROM game_config;"
```

**Pass:** the published bands are byte-identical to the columns.

> ⚠️ **Sponsor bands are the one thing here NOT gated on `economyWageModel`.** They scale the moment a `country_profile.economy_factor_bp` is set, because a factored country that paid full sponsorship while paying a fifth of the wages was a different game, not a cheaper one. A4 proved no factor is set — that is the only reason this check passes. Setting a factor therefore demands a `WORLD_PACK_VERSION` bump, not just a model flip.

### B7 · Inflation is off and has no history

```bash
psql "SELECT count(*) FROM inflation_rate_history;"
```

**Pass:** `0`, and `inflation_rate_per_season_bp = 0` from A4. The table is append-only audit; an empty table and a zero rate mean the index is exactly 1.0 at every season, so nothing it multiplies has moved.

### B8 · The season-investment endpoint exists and refuses everything

```bash
curl -s "${AUTH[@]}" "$DEV/api/club/season-investment" | python3 -m json.tool
```

**Pass:** `200` with `ceilingPence: 0`, `remainingPence: 0`, `investedPence: 0`, `creditClubPence: 0`, `countryFactorBp: 10000`, `tierFactorBp: 10000`, and `season` equal to this club's concluded-season count + 1.

```bash
curl -s -o /dev/null -w '%{http_code}\n' -X POST "${AUTH[@]}" \
  -H 'Content-Type: application/json' -d '{"amountPence":100}' \
  "$DEV/api/club/season-investment"
```

**Pass:** `422` `above_season_ceiling`. The feature ships *reachable but unreachable* — a zero base means every amount is above the ceiling.

### B9 · Sync is unchanged except for additions

Capture a sync payload a current build would send and compare the response against prod's for the same payload shape. The important assertions:

```bash
curl -s -X POST "${AUTH[@]}" -H 'Content-Type: application/json' \
  -d @sync-payload.json "$DEV/api/sync" | python3 -c '
import json,sys
d=json.load(sys.stdin)
print("balance", d.get("club",{}).get("balance"))
print("currentSeason", d.get("club",{}).get("currentSeason"))
print("economy keys", sorted(k for k in d.get("gameConfig",{}) if k.startswith(("economy","inflation","matchday","npcSolv","dofWage","sponsorWeekly"))))'
```

**Pass:** `club.balance` and `club.currentSeason` come back exactly as sent — the device is authoritative over both, and `SyncService::process()` overwrites them absolutely. If either changed, something server-side started writing a mirrored field, which is the class of bug that silently eats a player's money.

**Also pass:** the six `clientBlock` keys are present. Both sync branches (club present / absent) publish through the same `EconomyConfigPublisher::clientBlock()`, which is what `SyncServiceGameConfigParityTest` pins — but confirm on the box that the live branch really carries them.

### B10 · The one deliberate break, bounded

```bash
curl -s -X POST "${AUTH[@]}" -H 'Content-Type: application/json' \
  -d '{"amountPence":5000000}' "$DEV/api/club/fund" | python3 -c '
import json,sys;print(json.load(sys.stdin)["projection"])'
```

**Expected:** `facilityUpkeepPerWeekPence` and `facilityUpkeepPence` are **exactly 1.5×** what prod returns for the same club state — `FacilityCostCalculator::weeklyUpkeep()` moved from `base × 1.5^(level-1)` to `base × 1.5^level`, aligning the server with the charge the app actually makes.

**Pass:** the ratio is 1.5 to the penny, **and no other key in `projection` differs**, and the request still succeeds at the same stake (the floor is `starterConfig.clubFundingMinimumPence`, which this does not feed). Logged at `.context/shared/api-backwards-compatibility.md`, row 2026-11-12. It is the only value change in the release.

### B11 · World packs were not invalidated

```bash
psql "SELECT count(*) FROM country_world_pack_cache;"
```
Admin → Dashboard → **`staleWorldPacks`**.

**Pass:** the count is unchanged and `staleWorldPacks` is whatever it was before the deploy (likely 0). `WORLD_PACK_VERSION` was deliberately **not** bumped, because nothing in a pack's *content* changed while the model is `legacy`. The cache is TTL-less and gated on that constant alone, which is exactly why C12 pairs a model flip with a bump in the same pass.

### B12 · Scout wages (pre-existing backfill, confirm it ran)

```bash
psql "SELECT count(*) FROM scout WHERE weekly_salary = 0;"
```

**Pass:** `0`, or a count that only covers scouts created since the deploy. `app:backfill-scout-wages` runs on every deploy and acts only on rows at 0. Not part of this work — but a scout reading as free is the gap that made running-cost projections understate a wage bill, so it is worth one line.

---

## 4. Phase C — the new surfaces, exercised

Phase C **writes to dev config.** Note the before-values of everything you touch; §D undoes it. Run it in this order — later items depend on earlier ones.

### C1 · The admin screen loads

Admin → **World → Economy** (`/admin/economy`).

**Pass:** the page renders with the wage-model selector, the eight-row tier factor and turnover table, the staff role bands, the country list with its baseline radio, and the inflation panel. No stack trace, no blank money field rendering as `0`.

> This screen's blank-field handling is not cosmetic: a cleared contract-value field previously repriced every generated player to about 1/2400 of value. `parseMoneyToPence()` now treats non-numeric input as `null` rather than `0`. Try saving with a field cleared and confirm the stored value is untouched rather than zeroed.

### C2 · Move the baseline country, twice

Set baseline → **EN**, save. Then → **DE**, save. Then back to **EN**.

```bash
psql "SELECT code, is_economy_baseline, economy_factor_bp FROM country_profile WHERE is_economy_baseline;"
```

**Pass:** exactly one row each time, no error.

> **Why this test is here explicitly.** The obvious implementation — `UPDATE country_profile SET is_economy_baseline = (code = :code)` — fails roughly half the time, because Postgres evaluates a **non-deferrable partial unique index per row during the UPDATE**, and partial uniques cannot be declared `DEFERRABLE`. The shipped code clears all then sets one inside a single `transactional()`. If this test ever starts failing intermittently, that is the regression.

### C3 · Author a turnover table, and watch prices NOT move

In the admin, author `economyBaselineTurnoverPence` for all eight tiers with the live England figures, set EN's factor to `10000`, save. Then:

```bash
curl -s "$DEV/api/game-config?country=EN" | python3 -c '
import json,sys
for r in json.load(sys.stdin)["economyTierBaseline"]["tiers"]:
    print(r["tier"], r["turnoverPence"], r["wageScaleMicroPence"], r["resolvable"])'
for EP in /api/market/data /api/players/foreign /api/scout/search; do
  echo "== $EP"; curl -s "${AUTH[@]}" "$DEV$EP" | python3 -c '
import json,sys;d=json.load(sys.stdin)
ps=d.get("players") or d.get("pool") or []
print([(p.get("wage"), p.get("value")) for p in ps[:5]])'
done
```

**Pass:** `resolvable` is now `true` on all eight rows — **and every wage and value on all three surfaces is identical to before.** This is the second-most-important check in the plan. Resolvability and application are separate switches; a price that moves here means something reads the turnover table without checking `economyWageModel`.

### C4 · The gate command

```bash
console app:economy:wage-table EN SC
echo "exit: $?"
console app:economy:wage-table EN --reputation=80
```

**Pass:** exit `0`. The command runs five checks and exits non-zero if any fails:

1. `S_tier` strictly decreasing across tiers.
2. No ability earning more at a lower tier than the one above it.
3. TV per club as a share of that tier's baseline turnover (sanity, not a hard bound).
4. The squad wage bill against its own definition — the check that caught a 2.5% drift from summing continuous abilities where `Player::$currentAbility` is an `int`.
5. The absolute-pence thresholds (`npcSolvencyThresholds`, `dofWageBillThresholdPct`) against what a tier's squad actually costs.

A failure here is **not** a code bug — it is the gate doing its job on an unfinished table. `docs/deploy/economy-rollout.md` §3 lists each failure and what to author to clear it. **Do not flip the wage model while this command exits non-zero.**

### C5 · Season investment, the full matrix

Set `economySeasonInvestmentBasePence` to `5000000` (£50,000) in the admin. Ensure the test user's `UserLedger` balance exceeds the ceiling.

```bash
SI="$DEV/api/club/season-investment"
J=(-H 'Content-Type: application/json')

curl -s "${AUTH[@]}" "$SI" | python3 -m json.tool                                    # C5a
curl -s -X POST "${AUTH[@]}" "${J[@]}" -d '{"amountPence":1000000}'  "$SI"           # C5b
curl -s -X POST "${AUTH[@]}" "${J[@]}" -d '{"amountPence":1000000}'  "$SI"           # C5c
curl -s -X POST "${AUTH[@]}" "${J[@]}" -d '{"amountPence":2000000}'  "$SI"           # C5d
curl -s -X POST "${AUTH[@]}" "${J[@]}" -d '{"amountPence":999999999}' "$SI"          # C5e
curl -s -X POST "${AUTH[@]}" "${J[@]}" -d '{"amountPence":0}'        "$SI"           # C5f
curl -s -X POST "${AUTH[@]}" "${J[@]}" -d '{"amountPence":"abc"}'    "$SI"           # C5g
curl -s -X POST "${AUTH[@]}" "${J[@]}" -d '{}'                       "$SI"           # C5h
```

| | Expect | Body |
|---|---|---|
| C5a | `200` | `ceilingPence` = base × countryFactor × tierFactor × inflationIndex, `remainingPence` equal to it, `investedPence: 0`, `creditClubPence: 0` |
| C5b | `200` | `invested: true`, `creditClubPence: 1000000`, `remainingPence` reduced |
| C5c | `200` | **`invested: false`**, `investedPence: 1000000`, `creditClubPence: 1000000` — the idempotent replay, which must carry the original figure so a client that lost the first response can still seed its balance |
| C5d | `409` | `already_invested_this_season`, with the amount already given |
| C5e | `422` | `above_season_ceiling`, with the ceiling |
| C5f | `400` | `invalid_amount` |
| C5g | `400` | `amount_required` |
| C5h | `400` | `amount_required` |

Then:

```bash
psql "SELECT type, source_kind, source_ref, amount_pence FROM user_ledger
      WHERE source_kind = 'season_investment' ORDER BY created_at DESC LIMIT 5;"
```

**Pass:** exactly **one** row for this `(club, season)`, `amount_pence` negative, `source_ref` = `<clubId>:<season>`, enforced by `uq_user_ledger_backend_source` on `(source_kind, source_ref, type)`.

### C6 · Two investments at once

```bash
for i in 1 2 3 4 5; do
  curl -s -o /dev/null -w '%{http_code} ' -X POST "${AUTH[@]}" "${J[@]}" \
    -d '{"amountPence":500000}' "$SI" &
done; wait; echo
```

Use a **different club** (or clear the ledger row from C5 first).

**Pass:** at most one `200 invested:true`; the rest are `200 invested:false` or `409`. Exactly one ledger row. `UserLedgerService::append()` takes a per-user advisory lock for the duration of its transaction, so the friendly pre-check cannot fork the chain.

### C7 · `creditClubPence` really is an instruction

**Pass:** `club.balance` in the database is **unchanged** after C5b. The device owns the balance; the server debits the ledger and *tells the client what to add*. A server-side write here would be overwritten by the next sync anyway — which is precisely why the instruction shape exists.

```bash
psql "SELECT balance FROM club WHERE id = '$CLUB';"   # same before and after C5b
```

### C8 · Season number comes from the backend, not the request

```bash
psql "SELECT count(*) FROM season_record WHERE club_id = '$CLUB';"
```

**Pass:** the `season` in every response is that count **+ 1**, and there is no way to pass a season in. A claimed season would both raise the ceiling (it grows with the inflation index) and unlock a window the club never played.

### C9 · TV pool derivation

Every league with a TV deal already has a pool (B4). So this test **re-authors** one: pick a league, note `tvDeal`, `tvPoolPence` and `slots`, then change the pool in the league admin.

**Pass:**
- `tvDeal` becomes `intdiv(pool, slots)` — floored, never rounded up, so the shares can never sum above the pool.
- With `slots = 0` and no NPC clubs, **nothing derives** and the authored `tvDeal` stands. A clamped divisor of 1 would publish an entire pool as one club's share.
- With `slots = 0` and clubs present, the size derives as NPC rows, **+1 for the deepest existing tier** (the player's slot) — and "deepest" means the deepest league that actually **exists**, not `country_profile.league_tier_count`. A declared depth of 8 with four leagues built would otherwise hand the extra slot to a tier nobody can be placed in.
- **Every other league's `tvDeal` is untouched.**

### C10 · Parachute passthrough

Author an arbitrary nested block on one league, including a key the backend has never heard of, and a mis-typed one (`"seasons": "three"`).

**Pass:** it round-trips **byte-identical** through the API. Nothing is validated, normalised, or converted to pence. The one deliberate transformation is `[]` → `null`, so clearing a league override restores the global rather than switching parachutes off for that league.

### C11 · Inflation

Set `inflationRatePerSeasonBp` to e.g. `200` (2%), save.

**Pass:**
- a row is appended to `inflation_rate_history` (append-only; nothing is updated in place);
- the season ceiling in C5a grows by the compounded index;
- the index is compounded **in integers** and the season is bounded to 200, so no overflow and no float drift.

### C12 · The turn-on rehearsal (optional, destructive to dev's generated data)

Only once C4 exits 0. Follow `docs/deploy/economy-rollout.md` §5–6 in order:

1. Flip `economyWageModel` → `turnover` for the authored country.
2. **Bump `WORLD_PACK_VERSION` in the same pass.** Per-country world-pack rows are priced **at generation and stored**; without the bump, every existing pack keeps its legacy prices while market-pool rows — priced at **serve time** — move immediately, and the two populations disagree.
3. `console app:worldpack:warm` (or the admin's warm action).
4. Watch Admin → Dashboard → `staleWorldPacks` reach **0**.
5. Re-read `GET /api/market/data`, `GET /api/players/foreign` and `GET /api/scout/search` — the three serve-time-priced surfaces — and confirm wages moved as the gate table predicted.

**Pass:** staleWorldPacks returns to 0, and prices match `app:economy:wage-table` for the same country/tier/ability. A mismatch means a generation path is not routed through `WageModelResolver` — the thing that collapsing four copies of the wage arithmetic was meant to make impossible.

> **This step is irreversible in practice.** Flipping the model back restores serve-time pricing, but every pack generated while it was on keeps the prices it was generated with until regenerated. On dev that is fine. On prod it is the one-way door the runbook opens with.

---

## 5. Phase D — putting dev back

| Changed in | Undo |
|---|---|
| C2 | clear the baseline (zero baselines is a legal state) |
| C3 | blank `economyBaselineTurnoverPence`, or leave it — `resolvable: true` is harmless under `legacy` and B3 is the check that notices |
| C5 | set `economySeasonInvestmentBasePence` back to `0`; **leave the ledger rows** — `UserLedger` is append-only and backend-owned; deleting history to tidy a test is worse than the row |
| C9 | blank `tvPoolPence`; restore the original `tvDeal` and `slots` from the figures you noted |
| C10 | blank the parachute field (→ `null`) |
| C11 | set the rate back to `0`; **leave `inflation_rate_history`** — it is audit |
| C12 | not reversible for already-generated packs; regenerate the country if dev's data matters |

---

## 6. Hard stops — do not promote `dev` → `master` if

1. **Any Phase B check fails.** The release's entire claim is "deploying changes nothing".
2. Any `<` line appears in a B1/B2 key diff — a removed, renamed or retyped key.
3. `B2`'s with-country / without-country key sets differ.
4. Any tier reports `resolvable: true` **and** a price on `/api/market/data`, `/api/players/foreign` or `/api/scout/search` has moved (B3 + C3 together).
5. Any league where `tv_pool_pence / slots <> tv_deal` (B4) — the pool backfill re-priced a tier's TV money.
6. `club.balance` or `club.currentSeason` comes back from `/api/sync` different from what was sent (B9).
7. More than one ledger row exists for a `(club, season)` pair (C5, C6).
8. `doctrine:schema:validate` reports a difference (A3).
9. `app:economy:wage-table` exits non-zero **and** `economyWageModel` is `turnover`.

Items 1–8 are regressions. Item 9 is an operator state, not a code defect — but it is the state in which the economy is live against a table that has not passed its own gate, which is the failure mode the gate exists to prevent.

---

## 7. Executed — results from the dev box, 2026-11-12

Everything in Phase A and Phase B that could be run **without minting a credential and without writing a byte** has been run against `root@204.168.207.171`, `/mnt/volume-wkf/wunderkind/dev`. Every database query below was a `SELECT`; the two console commands (`migrations:list`, `schema:validate`/`schema:update --dump-sql`) are read-only. **No row on the dev box was modified.**

### Phase A

| ID | Result |
|---|---|
| A1 | **PASS** — run 43305839156 `success`, 21:03:37 UTC |
| A2 | **PASS** — all nine economy migrations `migrated`, every one stamped `2026-11-12 21:03:30`, total runtime 0.055s. `Version20261112010000` in the same date range is the country name-pool work |
| A3 | **PASS against the known baseline** — `Mapping: OK`. `Database` reports the two pre-existing `pg_get_expr` items (§A3) and **nothing from any economy table** |
| A4 | **PASS** — `legacy` / `46` / `0` / `0` / `5000` / `35`, `youth_scholarship_wage_pence = 25000`, `tier_factors_bp = [10000]×8`, `turnover = [0]×8`, `league_parachute = NULL`, `w2t = 6000`, `curve = 25000`, `staff share = 2500`, `rep spread = 0`, `sponsor_weekly = 0`. Staff role bands seeded as `StaffGenerationService` used them. **26 countries, 1 baseline (EN), 0 non-parity factors** |
| A5 | **PASS** — no new errors. `slots` backfilled for all 25 countries that have leagues, **`zero_slots = 0` everywhere**, and uniform within each country (KR 10 … FR 20) |

### Phase B

| ID | Result |
|---|---|
| **B1** | **PASS** — `starter-config` 272 → 472 key paths, **zero removals**; all ten `.economy.*` keys present |
| **B2** | **PASS** — `game-config` 311 → 334 key paths, **zero removals**. Key paths identical with and without `?country=`, and identical across EN / SC / DE |
| **B3** | **PASS** — `resolvable: false` on every tier of EN, SC and DE; `turnoverPence` and `wageScaleMicroPence` all `0`; `wageModel: legacy`, `weeksPerSeason: 46`, `wageScaleUnit: 1000000` |
| **B4** | **PASS, exactly** — 196 leagues, 196 with a `tv_deal`, 196 pooled, **`bogus_pool = 0`, `mismatched = 0`**. The round-trip identity holds for every league on the box |
| **B4c** | **PASS** — `league_position_decrease_percent` and `parachute` NULL on all 196 rows; no league carries an override |
| **B5** | **PASS** — `youthScholarshipPence` = `25000` at every tier of every country probed, one distinct value, no inversion |
| **B6** | **PASS** — bands published as `5600000/8200000`, `8200000/13400000`, `25000000/80000000`: the raw columns, and A4 confirms no factor is set to scale them |
| **B7** | **PASS** — rate `0` **and** `inflation_rate_history` empty (0 rows) |
| **B8** | **PARTIAL** — the data half verified: investment base `0`, factors at parity, **0 `season_investment` ledger rows**, so the ceiling is 0 for every club and `invest()` refuses before any write. The HTTP half (200 shape, 422 code) is **not run** — see below |
| **B9** | **NOT RUN** — see below |
| **B10** | **PASS, measured** — computed both formulas over real `club_facility` × `facility_template` rows: 9 clubs with upkeep, facilities spanning levels 1–6. New ÷ old is **1.4999989 – 1.5000014**, at most **1.5 pence** off exactly 1.5× — the deviation is per-row `round()` and nothing else. Exactly the logged break, no wider |
| **B11** | **PASS** — 200 cached packs: 140 at `payload_version 3`, 60 at `4`. `WORLD_PACK_VERSION` is still `4`, and **0 packs regenerated since 21:00 UTC**. The stale backlog is a pre-existing artefact of the 2026-11-09 bump, unchanged by this deploy — which is the point: the economy work invalidated nothing |
| **B12** | **PASS** — **0 unpriced** (of 12,550 at the time). The `0 unpriced` is the assertion; the count is a pool figure that has since changed by operator action — see §8's correction — and is not a baseline |

### Phase C

| ID | Result |
|---|---|
| **C4** | **PASS (the command works; the gate correctly refuses)** — `app:economy:wage-table EN SC` on the dev box exits **1** with 16 problems: 12 × "baselineTurnoverPence is 0 — the turnover model cannot price this tier" and 4 × the `bankruptcyDeductionTiers` unreachable-row finding. That is the gate doing its job on an unauthored table, not a defect — and it is hard-stop item 9's "operator state, not a code defect" |
| **C3** | **PASS, run on the dev-DB clone** — see below. The dev box itself could not be written to |
| C1, C2, C9–C11 | **NOT RUN** — need an admin session |
| C5–C8 | **NOT RUN** — need a JWT |
| C12 | **NOT RUN** — irreversible; needs explicit sign-off |

**The gate also machine-reports the `bankruptcyDeductionTiers` defect** that `docs/economy-threshold-review.md` argues in prose: rows 4 and 5 both carry `deficitMax: null` behind another unbounded row, so under the first-match-wins rule its own docblock states they can never be reached. Still open for the app team — this is now a line of command output rather than a paragraph.

### C3, run against the dev-DB clone

The dev box rejects writes under this session's permissions, so C3 was run on the local clone instead — same code, real data, migrations applied in 213ms. The rollout doc's proposed England ladder (§2 of `docs/deploy/economy-rollout.md`) was authored, the gate re-run, then everything reverted.

**The inertness half passed exactly.** With the turnover table authored *and then even with `economyWageModel` flipped to `turnover`*, both checksums came back byte-identical to the before-state. (This run was on an idle local clone with no other writer, so the pool half is trustworthy here in a way it is not on a live box — see the correction in §8.)

| | before | after revert |
|---|---|---|
| `player` count : Σ `contract_value` | `6412 : 2662489028` | `6412 : 2662489028` |
| `league` count : Σ `tv_deal` | `120 : 17917500000` | `120 : 17917500000` |

Nothing is re-priced until generation runs, which is the claim the whole release rests on.

**And the ladder's calibration, measured rather than argued.** Checks 1–4 all pass on it:

- **`S_tier` strictly decreasing** — EN 390.14 → 227.09, SC 216.84 → 8.39.
- **No ability inversions** across tiers.
- **TV is 0.6%–2.0% of baseline turnover** at every tier — sane, and the figure step 4 of the runbook demands be re-authored is already in range.
- **The squad bill is 45.0% of turnover at every tier, exactly** — 60% wage:turnover × 75% after the 25% staff share. Check 4 confirms the definition holds to the penny.
- Top tier-1 earner **£299,793/wk**, average tier-8 player **£126.94/wk** — against the agreed targets of ~£300,000 and ~£100.

**Check 5 fails, and it is the real finding:** the harshest `bankruptcyDeductionTiers` band is **£40,000.01**, which a tier-1 wage bill of £4,818,699.91/week passes in **0.01 weeks**. Tiers 1–5 all reach it inside a week. That is the absolute-pence-versus-weeks-of-wages problem `docs/economy-threshold-review.md` proposes a fix for — now with numbers.

---

### A defect in the gate command, found by running it

The same run reported two problems that **no authoring action could clear**:

```
EN tier 8: the youth scholarship (£250.00/wk) is MORE than an average first-team wage (£126.94/wk).
SC tier 8: the youth scholarship (£250.00/wk) is MORE than an average first-team wage (£115.34/wk).
```

The command prices its entire table through the turnover model while the live setting is still `legacy` — that is its purpose, since the runbook says get the gate to exit 0 *before* flipping the switch. But it asked for the scholarship through `youthScholarshipPence()`, which is gated on the **live** model and so returned the flat £250, then compared that against a turnover wage.

Flipping the model locally proved it: **16 problems under `legacy`, 14 under `turnover`, and the diff was exactly those two lines.** The cap bites once the model is on (tier 8's worst wage is £12.84, so the cap resolves to £6.42). So the gate was blocking the flip on a problem that only existed until the flip happened, and an operator following the runbook would never have reached zero.

**Fixed in `dcd935b`.** `youthScholarshipPenceUnder()` takes the model as an argument and `youthScholarshipPence()` delegates to it, so the cap still has one implementation. The live path is untouched — the published figure is still the flat £250 under `legacy`, which the existing inertness tests pin, and four new tests cover the preview, both directions of the explicit model, and that the two entry points agree whenever the named model matches the live one. After the fix the gate reports **14 under `legacy`, an identical problem set to the `turnover` run** — the verdict no longer depends on the live setting, which is the property a preview must have.

**This fix is not yet on the dev box.** It changes a console command and adds a service method; no published value moves.

---

### And the finding behind the finding: the scholarship was wrong at the OTHER end too

Clearing the false alarm above exposed the real one. The cap only ever asked *"is the scholarship
too high?"*, so nothing ever looked at tier 1 — where £250/week against an average first-team
wage of £132,892 is **0.19%**. Not a cheap academy; a rounding error. A flat figure cannot be
right across a ladder spanning **1,047×**, so the first pass fixed the half that threw an error
and declared the rest fine.

`51de01a` makes the scholarship an anchored ladder: an operator authors what a scholar costs at
**tier 1**, every lower tier is the same proportion of its own average wage, with a **floor**
under it and the **cap** on top applied last.

**Two candidate scalings were modelled on real data before anything was written, and one is a
trap** — scaling by `S_tier` is the obvious-looking choice and is 6.9× *worse* than the defect:

| scaled by | top-to-bottom spread | tier-8 scholarship, anchored at £1,500 | vs an average tier-8 pro (£127) |
|---|---|---|---|
| `S_tier` | **1.72×** | £873.11 | **6.9× — worse than the original bug** |
| worst first-team wage | 3,075× | £0.49 | effectively free |
| average first-team wage | 1,047× | £1.43 | effectively free |

Hence the floor. Anchored at £1,500 with a £25 floor, the gate's own output now reads
`scholarship : mid wage` of **0.01× at tiers 1–5, 0.02× at 6, 0.06× at 7 and 0.20× at 8** — the
inversion is gone and the top is no longer negligible.

**The cap's anchor moved from the tier's WORST first-team wage to its AVERAGE,** deliberately.
England tier 8's cheapest professional earns **£12.84/week** — ability 2 at the bottom of a 2–7
band through a 2.5 exponent — so half of it is £6.42: the old rule produced a *free* scholar, not
a cheap one. Safe to redefine rather than replace, because the cap is gated on `turnover` and has
therefore never applied to a published figure on any box.

**New open finding (§2b of `economy-threshold-review.md`): that £12.84 is itself worth a look.**
Tier 8's within-band wage spread is **22.9×** against 5.7× at tier 7 and 7.6× at tier 1, purely
because a band starting at ability **2** sits where `ability^2.5` is near zero. Nothing is wrong
with the arithmetic; the input is `leaguePlayerAbilityRanges`. It matters because **any rule
phrased as a share of "the cheapest professional at the tier" is anchored to an artefact** —
which is exactly the mistake the first cap made. Recommendation: anchor rules to the tier
*average* (now done everywhere that mattered), and treat raising tier 8's band floor as a
deliberate calibration decision rather than a side effect, since it would re-price tier 8
wholesale and need a `WORLD_PACK_VERSION` bump.

**Both commits are inert on any deployed box** — everything is gated on `economyWageModel =
turnover`, and both new columns default to 0.

### Two expectations in this plan were wrong, and are corrected above

1. **A4 predicted zero baseline countries. It is one, and that is correct.** `Version20261112160000` seeds EN as the baseline deliberately. A baseline at factor 10000 *is* parity, because every country's factor is normalised against the baseline row's own value — the inertness claim rests on `non_parity = 0`, which holds.
2. **A3 predicted a clean `schema:validate`. It reports a difference, and that difference pre-dates this work by ten days** — the DBAL 4 `pg_get_expr` cast-formatting round-trip on `uq_world_pack_generation_run_one_active_per_country`, plus one empty column comment. The useful assertion is that no economy table appears in the dump, and none does.

### Three findings worth passing on

- **Scotland is a genuinely 4-tier country on this box** (`league_tier_count = 4`, four `league` rows, `tierCount: 4` on the API). The development clone had 8 for every country. The brief's "Scotland 1–4" holds against the deployed data; any Scotland tier-5–8 figure quoted during development was quoting the clone.
- **Ghana declares 8 tiers and has 0 leagues built** — the only country in that state, and the live instance of the case `LeagueSizeResolverTest::testTheBottomTierIsTheDEEPESTEXISTINGONE` pins. Harmless today (no league, nothing to divide), but it is why "deepest tier" must mean the deepest league that exists rather than the declared depth.
- **England tier 8 has 17 NPC rows against 18 elsewhere, and Scotland tier 4 has 17 against 18** — the missing seat is the player's, in both countries, at whichever tier is actually the bottom. That is the shape the whole derivation assumes, confirmed on real data rather than argued from the generator's flags.

### What is left, and why I did not run it

**B8 (HTTP) and B9 both need a credential or a live device.**

- Minting a JWT on the box (`lexik:jwt:generate-token`) was **blocked by this session's permission classifier.** I did not work around it.
- **B9 cannot be faked read-only.** `POST /api/sync` is a write — a synthetic payload would overwrite a real club's state, which is the one thing a test of device authority must not do. No sync has reached the box since the deploy (0 since 21:00 UTC), and the stored `sync_record` payloads are partial (`form` only), so there is no post-deploy traffic to inspect either.

Two ways to close them:

```bash
# Either: approve a token and I run both
ssh root@204.168.207.171 'cd /mnt/volume-wkf/wunderkind/dev && \
  docker compose -f docker-compose.dev.yml exec -T app \
  php bin/console lexik:jwt:generate-token <your-dev-email>'

# Or: B8 alone, from your own session — read-only, and the POST is refused at the ceiling
TOKEN=...; CLUB=01a1c258-c585-7c36-bbff-30cbebdeefa0        # Aviemore, SC tier 4, season 1
AUTH=(-H "Authorization: Bearer $TOKEN" -H "X-Club-Id: $CLUB")
curl -s "${AUTH[@]}" https://dev.buildmyclub.co.uk/api/club/season-investment
curl -s -o /dev/null -w '%{http_code}\n' -X POST "${AUTH[@]}" \
  -H 'Content-Type: application/json' -d '{"amountPence":100}' \
  https://dev.buildmyclub.co.uk/api/club/season-investment     # expect 422
```

That club is a deliberate pick: a 4-tier country (so the tier clamp is exercised), `season_record` count 0 (so `season` must come back `1`), and an owner ledger balance of £46,959,368.94 — far above any amount you would test with, so a `422 above_season_ceiling` cannot be a disguised `402 insufficient_credit`.

B9 is best closed by **running the app against dev once** and diffing the response, rather than by curl.

---

## 8. Calibration run on dev — 2026-11-13

Phase C continued past the plan's scope, because the user asked for the economy to be calibrated
rather than only tested. **The dev box is no longer in the pristine post-deploy state the Phase B
evidence in §7 describes.** This section is the record of what changed and what it broke.

### What is now authored on dev

| setting | value | inert? |
|---|---|---|
| `economy_youth_scholarship_tier1_pence` | `150000` (£1,500/wk) | yes — gated on the model |
| `economy_youth_scholarship_floor_pence` | `2500` (£25/wk) | yes |
| `economy_baseline_turnover_pence` | the re-derived ladder below | yes — gated on the model |
| `league.tv_deal` / `tv_pool_pence` | re-authored, all 196 leagues | **NO — this moved a published value** |
| `economy_wage_model` | **still `legacy`** | — |

**Verified inert — but read the correction below before relying on the checksums.**

Before writing the turnover table I traced every pricing path — player generation, staff
generation, browse serve-time, pool serve-time — and confirmed each gates on `model ===
TURNOVER` **before** reading the turnover table. After writing it, these matched the
before-state exactly: `player 11317 : 4793643893`, `staff 74465 : 9303748716`,
`scout 12550 : 42123880`, `npc_club 3167 : 300419504202`, and the md5 of all 200 pack payloads.

> ⚠️ **CORRECTION, 2026-11-13: three of those five checksums were never a valid baseline, and
> this plan leaned on them too hard.**
>
> `player`, `staff` and `scout` are the **shared pool**, which is volatile by design: two admin
> buttons clear it outright (`DashboardController:1640-1642`, `PoolConfigController:165,330-331`)
> and `MarketPoolService::ensurePool()` refills it toward `pool_config`'s targets. Within hours
> of the run above an operator regenerated it — **player 11,317 → 480, staff 74,465 → 788, scout
> 12,550 → 200**, the last being exactly `scout_pool_target`. Nothing was wrong; that is what the
> table is for.
>
> The individual comparisons were still sound — taken minutes apart with no admin action in
> between — but they were presented as durable proof of inertness and they are not. A later
> reader diffing these numbers against a live box will find them different and conclude something
> broke.
>
> **The evidence that does hold up**, and which any re-run should lead with:
>
> 1. **The code-level gating**, path by path, as described above. This is the real proof: it is a
>    property of the code rather than of a snapshot.
> 2. **The published-API key-set diffs** (B1/B2), identical throughout.
> 3. **`npc_club`** — 3,167 → 3,183, up slightly through normal activity and never cleared. This
>    is the world-pack population, the one the economy actually prices, and it is the only one of
>    the five row-count checks worth quoting.
>
> Pool checksums are fine as a same-minute before/after on a quiet box. They are not an inertness
> proof, and nothing in Phase B should rest on them.

### The re-derived turnover ladder

The rollout doc's figures were calibrated against a development clone whose squad sizes differ
from the box (tier 1: 33 against dev's 26), which put the top earner **27% over target**. Derived
afresh against dev's live `npcSquadConfig` and `leagueAbilityRanges`:

| tier | band | squad | turnover | `S_tier` | min /wk | mid /wk | max /wk |
|---|---|---|---|---|---|---|---|
| 1 | 40–90 | 26 | £388,661,540 | 390.40 | £39,506.17 | £132,983.68 | **£300,000.00** |
| 2 | 30–60 | 23 | £120,049,757 | 349.22 | £17,214.64 | £47,437.98 | £97,380.74 |
| 3 | 20–40 | 21 | £35,576,602 | 312.37 | £5,587.91 | £15,398.48 | £31,610.03 |
| 4 | 15–35 | 20 | £19,909,009 | 279.42 | £2,434.91 | £8,731.82 | £20,250.00 |
| 5 | 10–25 | 19 | £7,071,796 | 249.94 | £790.37 | £3,435.70 | £7,810.61 |
| 6 | 10–15 | 18 | £2,339,899 | 223.57 | £706.99 | £1,362.30 | £1,948.24 |
| 7 | 5–10 | 17 | £582,785 | 199.98 | £111.79 | £362.00 | £632.40 |
| 8 | 2–7 | 17 | £164,852 | 178.89 | £10.11 | **£100.00** | £231.91 |

Both agreed targets hit exactly. **I validated my reconstruction of the formula against the box
first** — all eight `S_tier` values and every wage matched to the penny before anything was
derived from it.

**The rollout doc's derivation method was wrong**, which is why the first attempt failed. It
specified a geometric **turnover** ladder; against dev's bands that gives an `S_tier` which rises
again at tiers 7–8 plus four ability inversions, because the bands are not geometrically spaced so
σ collapses faster than turnover at the bottom. Making **`S_tier`** the geometric sequence and
inverting to turnover fixes both checks *structurally*: check 1 **is** "`S_tier` decreasing", and a
shared ability earns more wherever `S` is higher, so check 2 follows automatically. Runbook
corrected.

### The TV table — the one published value that moved

Old figures were **102%–3,674% of turnover** once the ladder was authored (tier 1: £500,000,000
per club against £388,661,540). Re-authored at shares tracking real football:

| tier | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 |
|---|---|---|---|---|---|---|---|---|
| share | 35% | 28% | 20% | 15% | 11% | 8% | 5% | 3% |
| per club | £136.0m | £33.6m | £7.12m | £2.99m | £778k | £187k | £29.1k | £4,950 |

Applied to all 196 leagues across 25 countries. **The B4 round-trip identity survived**:
`null_deal 0`, `null_pool 0`, **`mismatched 0`** — each pool computed from that league's own
`slots`, which matters because `slots` spans five distinct values (KR 10, BE 14, EN 18, FR 20).

**Log this as a deliberate break if it reaches prod.** Same key, same units, changed value on a
deployed endpoint — the category `.context/shared/api-backwards-compatibility.md` exists for. It
is operator config movement rather than a code change, so it is not logged there for dev, but the
distinction stops mattering the moment the app ships against it.

### Gate: 25 → 13 problems, and the remaining 13 are not backend-owned

Every TV problem cleared. Checks 1, 2, 3, 4 and the scholarship half of 5 all pass. What is left
is **only** the bankruptcy ladder — 9 × "harshest band reached in under a week" and 4 × the
unreachable-rows finding — which is client-side, gated by `bankruptcyDeductionsEnabled`, and is
the open question for the app team.

### Device validation — the strongest evidence here, with one confound

Tested against the **existing shipped frontend on a real device** after the TV re-authoring: the
economics behave noticeably more stably.

**What that does establish.** The wage model is still `legacy`, so no wage, fee or player price has
moved — **the TV table is the only thing that changed for that build.** So this is direct evidence
that the old figures were genuinely breaking club finances in the app, not merely failing a
backend gate. Tier 1 paying £500,000,000 per club per season against a £388,661,540 turnover is
more TV income than a club's entire revenue, and the client's finance model was absorbing that.
The gate's check 3 called it "meaningless"; the device agrees.

**What it does not establish.** The turnover wage model is unexercised — it is gated off, so none
of §8's ladder was under test. Treat this as validating the TV fix only.

> ⚠️ **The observation is confounded until the packs are rebuilt, and it is worth knowing which
> figure you were actually testing.** A device can currently reach *three different* `tvDeal`
> values for the same league depending on path: `13600000000` (£136m) from a live read,
> `2000000000` (£20m) from one of the 60 current-version-but-stale packs, or `50000000000` (£500m)
> if anything cached the pre-calibration live figure. If the run went through a world pack it may
> have been reading £20m rather than the £136m authored. **Re-test after the rebuild** to know
> which figure produced the improvement — and if £20m is what felt stable, that is a signal the
> 35% share may be too high rather than too low.

### ⚠️ Two findings from the calibration

**1. Cached packs were already 25× stale, and the version gate cannot see it.** `tvDeal` is baked
into all 200 pack payloads. EN tier 1's pack read `"tvDeal":2000000000` (£20m) against a column of
£500m — *before* any of this work, from an earlier re-authoring that never invalidated the cache.
140 packs are below the current `WORLD_PACK_VERSION` and self-heal; **60 are on the current version
and silently stale** (AR, BR, DE, EN, ES, FR, IT × 8 tiers, SC × 4). A config-only change never
moves the version, so nothing flags them. Rebuild is with the user. Runbook now carries the
warning and both remedies.

**2. TV does not scale with the country factor — now guarded.** `league.tv_deal` is the one money
figure the factor chain never reaches: it is a stored absolute an operator types in. Set a factor
to 2000 and turnover, wages and sponsorship all drop to a fifth while TV stays at 100% — clubs
paying a fifth of the wages on full baseline TV. It cannot be fixed by scaling in code, because
the server cannot distinguish a deliberately generous TV deal from an unscaled one. **Check 3
cannot catch it either** — it fails only above 100% of turnover, so a country at factor 0.5 sits
at twice its intended share and still passes.

Fixed in **`c6fba41`** as the gate's **check 6**: compares each factored country's TV against the
baseline's times its factor and reports the figure to author. Silent at parity (every country
today) and silent with no baseline flagged; 2% tolerance so a table rounded to significant figures
is not a failure. Eight tests, including one asserting that check 3 stays quiet on the case check 6
catches — so nobody concludes they are redundant and deletes the new one.

---

## 8. Sign-off

| ID | Check | Result | Notes |
|---|---|---|---|
| A1 | Deploy run succeeded, migrations step ran | **☑** | run 43305839156 = success |
| A2 | Nine economy migrations recorded | **☑** | all nine at 21:03:30 |
| A3 | `doctrine:schema:validate` clean | **☑** | mapping OK; only the known pre-existing drift |
| A4 | New columns carry inert defaults | **☑** | 1 baseline (EN, seeded), 0 non-parity |
| A5 | No new errors; `slots` backfilled | **☑** | zero_slots = 0 across 25 countries |
| **B1** | `starter-config` key diff = additions only | **☑** | verified live — §7 |
| **B2** | `game-config` key diff = additions only; country-invariant key set | **☑** | verified live — §7 |
| **B3** | Every tier `resolvable: false`, model `legacy` | **☑** | verified live — §7 |
| **B4** | `tv_pool_pence / slots == tv_deal` for every league; no pool without a deal | **☑** | 196/196, mismatched = 0 |
| **B5** | Youth scholarship identical at every tier, = `youth_scholarship_wage_pence` | **☑** | verified live — §7 |
| **B6** | Sponsor bands = raw columns; no country factor set | **☑** | both halves verified — §7 |
| **B7** | Inflation rate 0; history empty | **☑** | both halves verified — §7 |
| **B8** | Investment GET returns ceiling 0; POST 422 | **◐** | data half proven; HTTP half needs a token |
| **B9** | Sync returns device balance/season verbatim; six keys added | ☐ | needs a live sync — cannot be faked read-only |
| **B10** | Facility upkeep exactly 1.5×; nothing else moved | **☑** | measured 1.4999989-1.5000014, max 1.5p off |
| **B11** | World-pack cache not invalidated; `staleWorldPacks` unchanged | **☑** | 140 v3 / 60 v4, 0 regenerated since deploy |
| B12 | No scout at wage 0 | **☑** | 0 unpriced; the pool count is not a baseline — §8 |
| C1 | Admin World → Economy renders; blank field ≠ 0 | ☐ | needs an admin session |
| C2 | Baseline moves repeatedly without error | ☐ | needs an admin session; the partial-unique trap |
| C3 | Turnover authored ⇒ resolvable, prices still static | **☑** | run on the clone (§7) **and on dev** (§8) — checksums identical both times |
| C4 | `app:economy:wage-table EN SC` runs; gate verdict understood | **☑** | §7 unauthored; §8 calibrated — 25 → 13, all 13 client-side |
| C5 | Investment matrix: 200/200/409/422/400/400 | ☐ | needs a JWT |
| C6 | Concurrent investments ⇒ one debit | ☐ | needs a JWT |
| C7 | `club.balance` untouched server-side | ☐ | needs a JWT |
| C8 | Season from `SeasonRecord` count + 1 | ☐ | needs a JWT |
| C9 | Pool splits floored; identity holds after re-authoring | **☑** | 196 leagues re-authored, `mismatched 0` — §8 |
| C10 | Parachute round-trips verbatim; `[]` → null | ☐ | needs an admin session; unit-tested |
| C11 | Inflation appends history; ceiling grows | ☐ | needs an admin session + a JWT for the ceiling |
| C12 | Turn-on rehearsal; `staleWorldPacks` → 0 | ◐ | calibration done (§8); model NOT flipped; pack rebuild with the user |

| C13 | TV re-authored; `tvDeal` moved; break understood | **☑** | §8 — the one published value that moved |
| C14 | TV country-factor guard (check 6) | **☑** | `c6fba41`, 8 tests — §8 |
| C15 | Device test against the shipped app | **☑** | economics more stable; confounded by stale packs — §8 |
| C16 | World-pack rebuild after the TV change | ☐ | **with the user**; 60 of 200 packs silently stale — §8 |

**Legend:** ☑ verified, ◐ partially verified, ☐ outstanding. §7 carries the evidence for every ticked row.

**Local suite:** **3,006 tests, 152,410 assertions, 3 failures** after the `dcd935b` fix (four tests added). The same three pre-existing failures, verified by stashing the branch before any of this work began — a notification-log admin row, a competition narrative timeline, and a friendly-match result. None economy-related.
