<!-- STATUS --> **STATUS:** 🟢 COMPLETE — A30, read-only investigation. 2026-11-20.

# Did A26 / A27 move scout salaries?

## Verdict

**No. Not by one pence, on any of the 5,278 dev scouts.**

`scout.ability` does not reach a single path that produces a scout's wage — not on the
backend, not in the app, not at generation, hire, renewal, ingest or season transition. Every
scout wage in the world is `ScoutWageCalculator(experience)` and nothing else. Measured, not
inferred: **5,278 of 5,278** stored `weekly_salary` values equal that formula on `experience`
exactly, and only **9** coincide with the same formula on `ability` (those 9 are rows where
`ability` happens to equal `experience`).

Neither migration touched the money. `Version20261120100000` (A26) and
`Version20261120120000` (A27) write `scout.judgements` and `scout.ability` only; `grep` for
`weekly_salary` in both finds two comment lines and no SQL.

So the §1 fear in the brief is **unfounded on every path, not just the market path**. OTA 488's
"this change is latent" claim happened to be correct — but it was correct for the wrong reason.
It was justified on `incomeAnchoredWages` being off. **That flag is ON** (resolved below), and
has been all along. The change was inert because `ability` is not wired to a price yet, which is
a different fact that nobody had checked.

**The PM session's hypothesis holds**, and is narrower than the real answer: `marketStore.ts`
anchoring scouts on `experience` is one of *nine* pricing sites, and all nine resolve on
`experience`.

### The one thing to look at on the device

**Office → Staff: a scout's weekly wage is between £26.80 and £40.30, or something is wrong** —
that £13.50-wide window is the whole scout wage band the live config can produce, and
ability-based pricing could not land inside it.

---

## 1. The resolved live config

Resolved through the real chain, not read off a default.

**`incomeAnchoredWages` = `true`, at every tier including tier 0.**

Obtained by fetching the live dev payload myself and running `resolveEconomy()` from
`src/economy/economyConfig.ts` over it under `npx tsx`:

```bash
curl -s "https://api.dev.buildmyclub.co.uk/api/game-config?country=SC" -o game-config-sc.FRESH.json
```

```
bytes:    31277
keys: 179
incomeAnchoredWages: ABSENT
economyTierBaseline.wageModel: 'turnover'
tiers resolvable: [(1, True, 126972564), (2, True, 103152269), (3, True, 94906102), (4, True, 92573014)]
wageMultiplierTiers: [{"maxAbility": 15, "playerMultiplier": 4, "staffMultiplier": 2}, {"maxAbility": 25, "playerMultiplier": 6, "staffMultiplier": 4}, {"maxAbility": 40, "playerMultiplier": 15, "staffMultiplier": 8}, {"maxAbility": 60, "playerMultiplier": 30, "staffMultiplier": 12}]
scoutExperienceMin -> ABSENT
scoutExperienceMax -> ABSENT
scoutWageMin -> ABSENT
scoutWageMax -> ABSENT
scoutJudgementMin -> ABSENT
scoutJudgementMax -> ABSENT
```

The fresh fetch is **31,277 bytes, byte-size-identical to
`deploy-run-2026-11-20/game-config-sc.LIVE.json`** — that saved file is still accurate.

Then through the resolver:

```
{"tier":0,"model":"legacy","fallbackReason":"no-tier","incomeAnchoredWages":true,"wageCurveExponentBp":25000,"wageScaleUnit":1000000,"weeksPerSeason":46,"wageMultiplierTiers":[{"maxAbility":15,"playerMultiplier":4,"staffMultiplier":2},{"maxAbility":25,"playerMultiplier":6,"staffMultiplier":4},{"maxAbility":40,"playerMultiplier":15,"staffMultiplier":8},{"maxAbility":60,"playerMultiplier":30,"staffMultiplier":12}]}
{"tier":1,"model":"turnover","fallbackReason":"none","incomeAnchoredWages":true,...}
{"tier":2,"model":"turnover","fallbackReason":"none","incomeAnchoredWages":true,...}
{"tier":3,"model":"turnover","fallbackReason":"none","incomeAnchoredWages":true,...}
{"tier":4,"model":"turnover","fallbackReason":"none","incomeAnchoredWages":true,...}
```

| Value | Resolved | How obtained |
|---|---|---|
| `incomeAnchoredWages` | **`true`**, tiers 0–4 | `resolveEconomy()` over the live payload. The key is ABSENT from the payload; `economyConfig.ts:187` derives it from `wageModel === 'turnover'` |
| `wageModel` | **`turnover`** | `economyTierBaseline.wageModel` in the live payload; all four SC tiers `resolvable: true` with a non-zero `wageScaleMicroPence` |
| `wageMultiplierTiers` | **`maxAbility` 15/25/40/60 → `staffMultiplier` 2/4/8/12** | Present in the live payload, so it wins over `DEFAULT_GAME_CONFIG`. **Not the committed defaults** (0.5/1.0/2.5/5.0) — the burn the brief warns about, confirmed again |

### ⚠️ Three config facts that are NOT in `game-config` and must be read from the DB

`scoutWageMin` / `scoutWageMax` / `scoutExperienceMin` / `scoutExperienceMax` /
`scoutJudgementMin` / `scoutJudgementMax` live on **`PoolConfig`**, which
`GET /api/game-config` does not publish at all. There is no resolver to run them through; the
only authority is the row:

```bash
lando php bin/console dbal:run-sql "SELECT scout_experience_min, scout_experience_max, scout_wage_min, scout_wage_max, scout_judgement_min, scout_judgement_max FROM pool_config ORDER BY id LIMIT 1"
```
```
  scout_experience_min   scout_experience_max   scout_wage_min   scout_wage_max   scout_judgement_min   scout_judgement_max
  4                      34                     2500             7000             15                    90
```

The app's `FALLBACK_SCOUT_WAGE_MIN_PENCE` / `MAX` (2,500 / 7,000 in
`src/utils/staffWages.ts`) **happen to match the live row today**. That is luck, not
correctness — they are a pre-sync fallback with the same status as
`FALLBACK_FACILITY_TEMPLATES`, and the file says so. Do not cite them as the live band.

### ⚠️ A resolver asymmetry found in passing, unrelated to scouts

`resolveEconomy(config, 0)` returns `incomeAnchoredWages: true` with `model: 'legacy'` and
`fallbackReason: 'no-tier'`, while `legacyEconomyFrom()` hardcodes `incomeAnchoredWages:
false`. Both describe "a caller with no tier", and they disagree. A club with no league
therefore **does** anchor through `ampEconomy()` (which passes `league?.tier ?? 0`) but **does
not** through `legacyEconomyFrom`. Not in scope here and it does not affect this verdict —
flagged for the PM.

---

## 2. Every path that prices a scout

Nine sites. Measured by call graph (`grep` for callers of each calculator, then reading each
call site), not from comments.

### Backend

| Path | Prices on | Does `ability` reach it? |
|---|---|---|
| `Service/ScoutWageCalculator::weeklyWageFor($experience, $config)` | **`experience`**, clamped 0–100, interpolated across `scoutWageMin`→`scoutWageMax` | **No.** The method signature takes an `int $experience`. There is no `ability` parameter and no `PoolConfig` ability key |
| `Service/ScoutGenerationService::build()` :72 | `setWeeklySalary(weeklyWageFor($experience, $cfg))` | **No** — and `setAbility(...)` is called 52 lines later at :124, on the same rolled `$experience` + `$judgements`. Two independent writes; the wage one does not read the ability one |
| `Command/BackfillScoutWagesCommand` :91 | `weeklyWageForScout($scout)` → `$scout->getExperience()` | **No** |
| `Command/GenerateMarketDataCommand` :346 | `weeklyWageFor($experience)` | **No.** :341 sets `ability` separately, from the same inputs |
| `Command/BackfillScoutAbilitiesCommand` :105–117 | writes `ability` **only** | n/a — writes no wage |
| `EventSubscriber/ScoutAbilityLifecycleSubscriber` :93–115 | writes `ability` **only** | n/a — writes no wage |
| `Service/MarketDataService` :123 · `Service/WorldPackSnapshotBuilder` :288 | **serialise** `ability` onto the wire | n/a — serialisation, not pricing |

### App

| Path | Prices on | Does `ability` reach it? |
|---|---|---|
| `stores/marketStore.ts` :214 — `anchorStaffWages(scouts, (s) => s.experience)` | **`experience`** → `ampStaffWagePence` | **No.** The PM's hypothesis, confirmed verbatim. Coaches at :210 pass `(c) => c.coachingAbility`; scouts pass `experience` |
| `stores/marketStore.ts` :469 — `hireScout` | copies `salary: marketScout.salary` | **No.** `ability: marketScout.ability` is copied on the adjacent line as a **field**, never as a price input |
| `hooks/useInitFlow.ts` — `worldScoutEntryToScout` | `salary: fallbackScoutWeeklyWagePence(exp)` | **No.** `ability: resolveScoutAbility(...)` sits on the next line, again as a field |
| `utils/staffWages.ts` — `fallbackScoutWeeklyWagePence(experience)` | **`experience`**, clamped 0–100 across 2,500→7,000 | **No.** Formula-identical mirror of the backend's, by design |
| `engine/GameLoop.ts` :5716–5719 — DOF staff renewal | **`experience`** for a non-coach: `(staff as {experience?: number}).experience ?? 0` | **No** |
| `engine/SeasonBudgetService.ts` :204, :642 — `anchorNpcStaffWages` / `snapNpcStaffWages` | `member.coachingAbility ?? 0` over `club.staff` | **No** — and NPC scouts are not in `club.staff` at all (`utils/npcFinances.ts:40`: *"NPC `club.scouts` are still absent from this sum"*) |
| `economy/packWages.ts` :191 — `tierStaffWeeklyWagePence(ability, economy)` | its parameter is *named* `ability` | **No.** Its only non-test caller is `staffWages.ts:113`, which passes `staff.coachingAbility` — a `WorldStaff`, never a `Scout`. A scout cannot enter this function |
| `engine/finance.ts` :135 · `FinancialProjectionService.ts` :209 · `screens/squad/StaffScreen.tsx` :160 · `hooks/useClubMetrics.ts` | sum `s.salary` | **No** — read-back of an already-set figure |

**Everything that produces a scout wage resolves on `experience`. Nothing resolves on
`ability`.**

Corroborating the trace from the other direction, `ScoutAbilityCalculator`'s own docblock says
the pricing wiring is **future** work, not current:

> *"**Because A24 will price a scout's wage off `ability`**, that is a live risk rather than a
> historical note"*

A24 is queued, not shipped. Until it lands, `ability` is a published, stored, displayed number
with no monetary consequence.

---

## 3. Quantification — closed, not computed

`ability` reaches no pricing path, so there is no before/after wage to compute. The evidence
that closes it is the stored data itself.

```bash
lando php bin/console dbal:run-sql "SELECT count(*) AS total, count(*) FILTER (WHERE weekly_salary = ROUND(2500 + (7000-2500) * LEAST(100,GREATEST(0,experience))::numeric / 100)) AS matches_formula_on_experience, count(*) FILTER (WHERE weekly_salary = ROUND(2500 + (7000-2500) * LEAST(100,GREATEST(0,ability))::numeric / 100)) AS matches_formula_on_ability FROM scout"
```
```
  total   matches_formula_on_experience   matches_formula_on_ability
  5278    5278                            9
```

```bash
lando php bin/console dbal:run-sql "SELECT count(*) AS experience_values_with_more_than_one_wage FROM (SELECT experience FROM scout GROUP BY experience HAVING count(DISTINCT weekly_salary) > 1) x"
```
```
  experience_values_with_more_than_one_wage
  0
```

```bash
lando php bin/console dbal:run-sql "SELECT count(*) AS scouts, min(experience) AS exp_min, max(experience) AS exp_max, min(ability) AS ab_min, max(ability) AS ab_max, min(weekly_salary) AS wage_min, max(weekly_salary) AS wage_max, count(DISTINCT weekly_salary) AS distinct_wages FROM scout"
```
```
  scouts   exp_min   exp_max   ab_min   ab_max   wage_min   wage_max   distinct_wages
  5278     4         34        12       47       2680       4030       31
```

Read it together and the wage is a **bijection with `experience`**: 31 distinct experience
values (4…34 inclusive) produce exactly 31 distinct wages, no experience value maps to two
wages, the extremes are exactly `ScoutWageCalculator(4) = 2,680` and
`ScoutWageCalculator(34) = 4,030`, and all 5,278 rows match. `ability` spans 12–47 — a
different, wider range — and if it were an input anywhere, the distinct-wage count could not be
31 and `matches_formula_on_experience` could not be 5,278.

**And the migrations did not reprice:**

```bash
grep -n "weekly_salary" migrations/Version20261120120000.php migrations/Version20261120100000.php
```
```
migrations/Version20261120100000.php:64: * `scout.weekly_salary` both keep a DB default of 0 beside their entity's `default => 0`, and
migrations/Version20261120100000.php:104:        // `experience` and `weekly_salary`.
```

Two comments, zero SQL. Both migrations' `addSql` blocks write `judgements` and `ability` only,
and **neither touches `experience`** — which is the actual reason the wages could not move even
in principle.

**Direction and magnitude: zero, both ways, for every row.**

---

## 4. The `?? 0` on `ampStaffWagePence(abilityOf(s) ?? 0, economy)`

**Reachable as a value; unreachable as a price. It cannot put a scout on £0.**

The nullish branch fires whenever `abilityOf(s)` is `undefined` — for a scout, whenever
`MarketScout.experience` is absent at runtime. The type says `number`, but
`parseMarketData` casts wire JSON, so an older or malformed payload can land `undefined` there.
So yes: `0` can be passed.

It cannot price anything, because it is caught twice:

- `ClubWageScaleService.ts:150` — `staffWagePence` opens
  `if (!economy.incomeAnchoredWages || !(abilityOf > 0)) return undefined;`. Ability 0 returns
  `undefined` before any arithmetic.
- `marketStore.ts:89` — `return anchored && anchored > 0 ? { ...s, salary: anchored } : s;`.
  `undefined` leaves the row's authored `salary` untouched.

The same `?? 0` appears at `GameLoop.ts:5716–5719` on the renewal path, and is guarded the same
way plus once more: `staffRenewalWagePence(existing, 0)` has
`if (anchored <= 0) return existing;` (`renewals.ts:175`).

**It is still a defect by the letter of the pack-is-a-census rule** — `?? 0` on a value that
determines a wage — and the honest reading is that it is *latent*: three separate guards keep it
inert, and a future change to any one of them (A24 touching `staffWagePence`'s `abilityOf > 0`
guard is the obvious candidate) turns it into a scout priced at the bottom of the band.
`resolveScoutAbility` / `ensureScoutAbility` in `utils/scoutAbility.ts` are the correct pattern
and are already used at the ingest boundaries; `anchorStaffWages` predates them.
**Reported, not fixed, per brief.**

---

## 5. Post-A27 scout `ability` distribution (deliverable for A24)

All 5,278 dev scouts, current column state.

```bash
lando php bin/console dbal:run-sql "SELECT count(*) AS n, min(ability) AS min, percentile_disc(0.01) WITHIN GROUP (ORDER BY ability) AS p01, percentile_disc(0.25) WITHIN GROUP (ORDER BY ability) AS p25, percentile_disc(0.5) WITHIN GROUP (ORDER BY ability) AS median, percentile_disc(0.75) WITHIN GROUP (ORDER BY ability) AS p75, percentile_disc(0.99) WITHIN GROUP (ORDER BY ability) AS p99, max(ability) AS max, round(avg(ability),2) AS mean, round(stddev_pop(ability),2) AS sd FROM scout"
```
```
  n      min   p01   p25   median   p75   p99   max   mean    sd
  5278   12    16    24    29       35    42    47    29.11   6.76
```

**Band placement against the live `wageMultiplierTiers` (15 / 25 / 40 / 60):**

```bash
lando php bin/console dbal:run-sql "SELECT CASE WHEN ability <= 15 THEN '1: <=15 (staffMult 2)' WHEN ability <= 25 THEN '2: 16-25 (staffMult 4)' WHEN ability <= 40 THEN '3: 26-40 (staffMult 8)' WHEN ability <= 60 THEN '4: 41-60 (staffMult 12)' ELSE '5: >60 (NO BAND)' END AS band, count(*) AS scouts, round(100.0*count(*)/5278,1) AS pct, min(ability) AS ab_lo, max(ability) AS ab_hi FROM scout GROUP BY 1 ORDER BY 1"
```
```
  band                      scouts   pct    ab_lo   ab_hi
  1: <=15 (staffMult 2)     49       0.9    12      15
  2: 16-25 (staffMult 4)    1696     32.1   16      25
  3: 26-40 (staffMult 8)    3364     63.7   26      40
  4: 41-60 (staffMult 12)   169      3.2    41      47
```

**What A24 should take from this:**

- **Three bands carry everything; the top band is nearly empty.** 95.8% of scouts sit in bands
  2 and 3. Only 169 scouts (3.2%) reach band 4, and **no scout anywhere in the world reaches
  `maxAbility` 60** — the top of band 4 is unoccupied by 13 points, and the fifth, unbanded
  region above 60 is unreachable.
- **A 2 → 12 staffMultiplier ladder is being asked to separate a population spanning 12–47.**
  The band edges at 15 and 25 are doing almost all of the work, and the 26–40 band alone holds
  63.7% of the world — a single flat multiplier across nearly two-thirds of all scouts.
- `sd` is 6.76 against a 35-point observed range: the distribution is tight and unimodal around
  29, not spread across the ladder the bands assume.

### The A26 → A27 move, measured

A24 "cannot price anything off a stale distribution", so here is exactly how stale A26's was.
A26's 5-key ability is reconstructible: the current blob's seven keys minus A27's `youth` and
`senior` are precisely A26's five.

```bash
lando php bin/console dbal:run-sql "SELECT count(*) AS n, count(*) FILTER (WHERE ability_a27 = ability_now) AS a27_reproduces_column, round(avg(ability_a26),2) AS mean_a26, round(avg(ability_now),2) AS mean_now, round(avg(ability_now-ability_a26),3) AS mean_delta, min(ability_now-ability_a26) AS delta_min, max(ability_now-ability_a26) AS delta_max, count(*) FILTER (WHERE ability_now <> ability_a26) AS rows_moved FROM (SELECT m.id, m.ability_now, GREATEST(1,LEAST(100,ROUND(0.7*m.experience+0.3*m.mean5))) AS ability_a26, GREATEST(1,LEAST(100,ROUND(0.7*m.experience+0.3*m.mean7))) AS ability_a27 FROM (SELECT sc.id, sc.experience::numeric AS experience, sc.ability AS ability_now, (SELECT AVG(e.value::numeric) FROM jsonb_each_text(sc.judgements::jsonb) AS e(key,value) WHERE e.key IN ('potential','technical','physical','mental','personality')) AS mean5, (SELECT AVG(e.value::numeric) FROM jsonb_each_text(sc.judgements::jsonb) AS e(key,value)) AS mean7 FROM scout sc) m) d"
```
```
  n      a27_reproduces_column   mean_a26   mean_now   mean_delta   delta_min   delta_max   rows_moved
  5278   5278                    29.13      29.11      -0.023       -5          5           4061
```

`a27_reproduces_column = 5278` — the reconstruction is exact for every row, so these deltas are
measured, not modelled.

```bash
lando php bin/console dbal:run-sql "SELECT count(*) AS n, count(*) FILTER (WHERE b26 <> b27) AS crossed_a_band, count(*) FILTER (WHERE b27 > b26) AS moved_up, count(*) FILTER (WHERE b27 < b26) AS moved_down FROM (...)"
```
```
  n      crossed_a_band   moved_up   moved_down
  5278   448              210        238
```

**The aggregate is a non-event and the per-row picture is not.** Mean ability moved by −0.023 —
nothing. But **4,061 of 5,278 scouts (77%) changed ability individually**, by up to ±5 points,
and **448 (8.5%) crossed a `wageMultiplierTiers` band edge** (210 up, 238 down).

So: had A24 already been live, A27's migration would have silently repriced 8.5% of the world's
scouts by a whole multiplier step, in both directions, with a mean wage change of approximately
zero — i.e. **invisible in any aggregate check and invisible in a wage-bill total.** That is the
precise shape of defect this workstream keeps paying for, and the reason the permanent check
below is worth its line.

---

## 6. `scoutExperienceMin/Max` = 4–34: it compresses the wage band to 30% of its range

**It bears directly on the answer, and the brief's suspicion is correct.**

Scout wages interpolate on `experience` across a **0–100** scale — the ceiling is a hardcoded
constant in both repos (`ScoutWageCalculator::EXPERIENCE_SCALE = 100`,
`staffWages.ts`'s `EXPERIENCE_SCALE = 100`), and both docblocks assert *"experience is
documented as a 0–100 score"*. Generation draws it from `scoutExperienceMin/Max` = **4–34**.

A field read as a 0–100 score is being populated from what reads as a career-years window. The
consequence is arithmetic:

| | |
|---|---|
| Authored wage band | £25.00 → £70.00 /wk (`scoutWageMin/Max` 2,500 / 7,000) |
| Wage band **actually reachable** | £26.80 → £40.30 /wk |
| Span authored | £45.00 |
| Span in use | £13.50 |
| **Fraction of the band the game can reach** | **30.0%** |

```bash
lando php bin/console dbal:run-sql "SELECT min(weekly_salary) AS lowest_wage_pence, max(weekly_salary) AS highest_wage_pence, max(weekly_salary)-min(weekly_salary) AS span_used_pence, 7000-2500 AS span_authored_pence, round(100.0*(max(weekly_salary)-min(weekly_salary))/(7000-2500),1) AS pct_of_band_used FROM scout"
```
```
  lowest_wage_pence   highest_wage_pence   span_used_pence   span_authored_pence   pct_of_band_used
  2680                4030                 1350              4500                  30.0
```

**£70.00/wk is unreachable.** It would need experience 100; the generator's ceiling is 34, so
the most experienced scout in the world costs £40.30 — 58% of the authored top. The entire
upper 70% of the band is dead config. The world's best scout costs **1.50×** the world's worst,
against the **2.80×** the band was authored to express.

Two further consequences worth recording:

- **Every scout in the dev DB sits inside the global 4–34 window** (`exp_min 4`, `exp_max 34`),
  including club scouts. `ScoutGenerationService::build()` bands experience off
  `league_ability_ranges` *only when an `$abilityRange` is passed*; on this data nothing passed
  one, so the tier separation its docblock describes as the fix for the rating-33-scout defect
  is **not present in this population**. That may be correct for SC (4 tiers) or may be a
  second finding — out of scope here, flagged.
- This is also why `ability` tops out at 47 rather than near 100: at 70% weight on an
  experience capped at 34, the arithmetic ceiling is `0.7 × 34 + 0.3 × 90 ≈ 51`.
  `ScoutAbilityCalculator`'s docblock predicts *"no pool scout reaches above ~48"* and the
  measured max is **47**. The formula is behaving exactly as documented; the window is what
  caps the scale.

**The fix is an admin edit to `PoolConfig` (`scoutExperienceMin/Max`), not a code change** — and
it would move every scout wage in the world, because the wage interpolates on the number the
window produces. Establishing that consequence is this report's scope; the edit is the owner's
call.

---

## 7. A permanent check worth adding — described, NOT built

A29 owns `ChecksTab.tsx` and `economyDiagnostics.ts` this wave, so per brief I have written
nothing. **Routing note for the PM.** One line, earning its place by §2's standard — it states
a relationship, it can fail, and the failure changes what someone does:

```
SCOUT PRICE INPUT · wages 31 distinct over exp 4-34 · ability 12-47 · priced on EXPERIENCE — AGREE
```

What it should assert, in one line: that the hired scouts' `salary` values reproduce
`fallbackScoutWeeklyWagePence(experience)` for every row, and print the `ability` range beside
them. It **fails the moment any scout's wage stops being a pure function of experience** — which
is exactly the event A24 will cause deliberately, and would also catch it happening by accident.
At that point the line should be updated to assert the band relationship instead, and the
failure is the prompt to do so.

Why it earns a permanent line rather than living in this report: this is the fourth time in one
day a pricing input has been asserted from a comment or a default and been wrong, and §5 shows
the one shape of scout repricing that **no aggregate or wage-bill check can see** — 8.5% of the
world moving a band step in both directions for a mean change of −0.02. A per-row relationship
is the only thing that catches it.

---

## 8. Brief vs code

Per standing note §3, stated explicitly rather than silently reconciled.

- **The brief's §1 premise — that A26/A27 may have moved scout salaries under a live anchoring
  regime — is half right and half wrong, and the half that is wrong is load-bearing.** Income
  anchoring *is* on (§1 confirms it independently, through the resolver). But `ability` is not
  wired to any price, so the exposure was zero. The brief invited me to accept that anchoring
  being on implied a wage impact; the code says those are two separate questions.
- **OTA 488's "latent" claim was right by accident.** Its stated justification —
  `incomeAnchoredWages` being off — was false when it was written. Worth recording as the
  fourth instance of the config-default lesson, and a sharper variant of it: *a correct
  conclusion from a false premise is not a measurement.*
- **The PM's hypothesis is confirmed and was too narrow**, as §2 shows — `marketStore.ts:214`
  is one of nine sites, not the only path.
- **Minor, unrelated, not fixed:** `SeasonBudgetService.ts:46` imports `useScoutStore` and
  never uses it in the file body. Dead import.

---

## Appendix — provenance

- **Read-only throughout.** No app or backend source changed; nothing committed, pushed or
  deployed. The only files written are this report.
- **No writes to the dev database.** Every `dbal:run-sql` above is a `SELECT`. The two
  `0 rows affected` results in my session were `WITH`-prefixed statements that
  `dbal:run-sql` does not treat as queries; each was re-run in subquery form and is quoted
  above in the form that returned data.
- **Did not touch** `src/components/debug/ChecksTab.tsx` or `src/economy/economyDiagnostics.ts`
  (A29's files this wave).
- Context read first: `wunderkind-app/.context/CONTEXT.md`,
  `wunderkind-backend/.context/CONTEXT.md`, `agent-standing-notes.md`, the app's `CLAUDE.md`
  binding rules.
- Scratch (resolver script, fresh config fetch):
  `/private/tmp/claude-501/-Users-courtneyadesile-Documents-WunderkindFactory/649cc626-0db7-437a-84cd-bd48db37d7b6/scratchpad/`
- Backend commands via Lando (`lando start` was required — the stack was down). Database is the
  local Lando dev DB, 5,278 scouts, matching the figure in `deploy-run-2026-11-20.md`.
