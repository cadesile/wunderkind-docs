<!-- STATUS --> **STATUS:** 🟢 COMPLETE — A30 follow-up, read-only. 2026-11-20.
Companion to `scout-wage-impact-report.md`.

# The wage-multiplier band ceiling, and the flat scout wage

Four questions from the PM, answered by call graph and by row count.

## Summary

1. **An ability of 61–75 clamps to the last band (×30 player / ×12 staff) on both sides,
   identically.** It does not throw, zero or go undefined. But it clamps through a *fallback
   branch whose own comments on both sides say the table is supposed to have a `null` catch-all
   and does not* — the backend's docblock calls it landing on the last row **"by accident rather
   than by design."** The live table replaced the committed `null` catch-all with a numeric `60`.
2. **Richly reachable. 2,186 of 9,784 staff (22.34%) sit at or above ability 60** and resolve on
   that accidental branch. For players it is currently 15 rows (0.23%) — but `potential` reaches
   90, so players grow into it.
3. **Yes, and worse than at ability 60: the authored player bands reach 90–95.** Every one of the
   26 live countries has a tier whose max exceeds 60. EN and SC tier 1 are both 40–90 against a
   band table that stops at 60.
4. **Confirmed, and the exact phrasing matters.** A scout's wage is *perfectly ordered* by
   experience (corr = 1.0000) — it is not noise. What is flat is the **magnitude**: the entire
   scout quality range is worth **£13.50/wk**, a **1.504×** spread from worst to best. On the same
   dev box, coaches span **173.8×**. **The cheapest coach in the game (£41.34/wk) costs more than
   the most expensive scout in the game (£40.30/wk).**

---

## 1. What an ability of 61–75 actually does

Both sides walk the band list and return the last row when nothing matches. The structure is
the same in each, and so is the hole.

### The contract the code expects

`src/types/gameConfig.ts:48` (app):

```ts
export interface WageMultiplierTier {
  /** Upper ability bound (exclusive). null = catch-all for the highest tier. */
  maxAbility: number | null;
  playerMultiplier: number;
  staffMultiplier: number;
}
```

`src/Entity/GameConfig.php:2862` (backend):

```
 * Tiers are evaluated in order; the first entry whose maxAbility > entity's currentAbility wins.
 * A null maxAbility means "all remaining" (i.e. the default/highest tier).
```

And the **committed default has that catch-all** (`GameConfig.php:2870`):

```php
private array $wageMultiplierTiers = [
    ['maxAbility' => 25,   'playerMultiplier' => 0.5, 'staffMultiplier' => 0.6],
    ['maxAbility' => 50,   'playerMultiplier' => 1.0, 'staffMultiplier' => 1.0],
    ['maxAbility' => 75,   'playerMultiplier' => 2.5, 'staffMultiplier' => 2.0],
    ['maxAbility' => null, 'playerMultiplier' => 5.0, 'staffMultiplier' => 4.0],  // ← catch-all
];
```

### What the live table is

```bash
lando php bin/console dbal:run-sql "SELECT wage_multiplier_tiers FROM game_config ORDER BY id LIMIT 1"
```
```
  [{"maxAbility":15,"playerMultiplier":4.0,"staffMultiplier":2.0},{"maxAbility":25,"playerMultiplier":6.0,"staffMultiplier":4.0},{"maxAbility":40,"playerMultiplier":15.0,"staffMultiplier":8.0},{"maxAbility":60,"playerMultiplier":30.0,"staffMultiplier":12.0}]
```

**Four rows, and the last one is `maxAbility: 60`, not `null`.** The admin edit that set
15/25/40/60 replaced the catch-all with a bounded row. There is no `null` row in the live table.

### The app path

`src/types/gameConfig.ts:55`:

```ts
/** Resolve the correct tier for a given ability value. */
export function resolveWageTier(
  tiers: WageMultiplierTier[],
  ability: number,
): WageMultiplierTier {
  for (const tier of tiers) {
    if (tier.maxAbility === null || ability < tier.maxAbility) return tier;
  }
  // Fallback: last tier (should always have a null catch-all)
  return tiers[tiers.length - 1] ?? { maxAbility: null, playerMultiplier: 1.0, staffMultiplier: 1.0 };
}
```

Callers (non-test): `wages.ts:224` (`legacyMultiplier`), `packWages.ts:205`
(`tierStaffWeeklyWagePence`), `harness/loadExport.ts:282`, `economyDiagnostics.ts:778`.

### The backend path

`src/Service/Economy/WageModelResolver.php:505`:

```
    /**
     * The `wageMultiplierTiers` walk.
     *
     * STRICT `<`, PRESERVED. A player exactly on a boundary falls into the band above — with
     * the live bands (15/25/40/60) an ability-15 player gets x6, not x4. Every row in the world
     * was priced that way.
     *
     * The trailing `end($tiers)` fallback is also kept: the live table has no null catch-all
     * row, so an ability at or above the last `maxAbility` falls out of the loop and lands on
     * the last row by accident rather than by design. Changing that would re-price every elite
     * player.
     */
    public function multipliersFor(int $ability, ?GameConfig $config = null): array
    {
        $tiers = ($config ?? $this->gameConfigRepository->getConfig())->getWageMultiplierTiers();

        foreach ($tiers as $tier) {
            if (($tier['maxAbility'] ?? null) === null || $ability < $tier['maxAbility']) {
                return [...];
            }
        }

        $last = end($tiers);

        return [
            'player' => (float) ($last['playerMultiplier'] ?? self::FALLBACK_MULTIPLIER),
            'staff'  => (float) ($last['staffMultiplier'] ?? self::FALLBACK_MULTIPLIER),
        ];
    }
```

### The answer

| | |
|---|---|
| Ability 61–75 returns | The **last row**: `playerMultiplier 30`, `staffMultiplier 12` |
| Mechanism | Loop exhausts (no `null` row, `61 < 60` false) → trailing fallback |
| Throws? | No |
| Zero / undefined multiplier? | No. `FALLBACK_MULTIPLIER` is not reached either — the last row exists and has both keys |
| App and backend agree? | **Yes, exactly.** Same walk, same strict `<`, same trailing fallback |

**Two things worth stating plainly rather than filing as detail:**

- **Strict `<` means ability exactly 60 also lands on the fallback**, not on the 41–60 row by
  match. The band reading "41–60" is really 41–59 by comparison; 60 arrives through the
  accident. Same multiplier either way, so there is no visible seam — which is why it has gone
  unnoticed.
- **It is not a cliff, it is a kink.** The multiplier stops escalating but the wage formula is
  `ability × coefficient × multiplier`, so a 75-ability coach still costs more than a
  60-ability one. The defect is that the **ladder stops**: the 2→4→8→12 staff progression that
  separates the pyramid's tiers goes flat across the top 15 ability points, so the gap between a
  good coach and an elite one is compressed to whatever the linear `ability` term provides.

**Both repos already document the condition.** This is not an undiscovered defect — it is a
known, deliberately preserved one, and the backend docblock explains why nobody has changed it
("would re-price every elite player"). What was *not* established until now is how reachable it
is, which is §2.

---

## 2. Is it reachable in live data? — Yes, heavily, for staff

```bash
lando php bin/console dbal:run-sql "SELECT count(*) AS staff_rows, min(coaching_ability) AS ab_min, max(coaching_ability) AS ab_max, count(*) FILTER (WHERE coaching_ability > 60) AS above_60, count(*) FILTER (WHERE coaching_ability >= 60) AS at_or_above_60, round(100.0*count(*) FILTER (WHERE coaching_ability >= 60)/count(*),2) AS pct_at_or_above_60 FROM staff"
```
```
  staff_rows   ab_min   ab_max   above_60   at_or_above_60   pct_at_or_above_60
  9784         4        75       2059       2186             22.34
```

```bash
lando php bin/console dbal:run-sql "SELECT count(*) AS players, min(current_ability) AS ca_min, max(current_ability) AS ca_max, count(*) FILTER (WHERE current_ability > 60) AS ca_above_60, count(*) FILTER (WHERE current_ability >= 60) AS ca_at_or_above_60, round(100.0*count(*) FILTER (WHERE current_ability >= 60)/count(*),2) AS ca_pct_60plus, min(potential) AS pot_min, max(potential) AS pot_max, count(*) FILTER (WHERE potential > 60) AS pot_above_60, count(*) FILTER (WHERE potential >= 60) AS pot_at_or_above_60, round(100.0*count(*) FILTER (WHERE potential >= 60)/count(*),2) AS pot_pct_60plus FROM player"
```
```
  players   ca_min   ca_max   ca_above_60   ca_at_or_above_60   ca_pct_60plus   pot_min   pot_max   pot_above_60   pot_at_or_above_60   pot_pct_60plus
  6482      1        69       10            15                  0.23            3         90        1091           1120                 17.28
```

| Population | At/above 60 | Share | Verdict |
|---|---|---|---|
| `staff.coaching_ability` | **2,186** of 9,784 | **22.34%** | **Live defect.** Nearly a quarter of all staff price on the accidental branch |
| `player.current_ability` | 15 of 6,482 | 0.23% | Reachable but rare **today** |
| `player.potential` | 1,120 of 6,482 | 17.28% | Not a wage input — but see below |

**`potential` does not price anything** — I checked rather than assumed. Every player wage call
passes `current_ability`: `ServeTimePlayerPricer.php:71`
(`turnoverPlayerPence($player->getCurrentAbility(), ...)`), `MarketPoolService.php:202`,
`GenerateMarketDataCommand.php:457`. The admin preview and `EconomyWageTableCommand` pass band
min/mid/max. Nothing passes `potential`.

**But 17.28% of players have the headroom to grow past 60 inside a save**, and `potential` tops
out at 90. So the player side is not safe, it is *early* — the band ceiling becomes reachable for
players as a save matures, and it is already fully reachable for the 22.34% of staff who are
generated above it on day one.

**Live `pool_config` confirms the generation window the PM read:**

```bash
lando php bin/console dbal:run-sql "SELECT coach_ability_min, coach_ability_max, scout_experience_min, scout_experience_max FROM pool_config ORDER BY id LIMIT 1"
```
```
  coach_ability_min   coach_ability_max   scout_experience_min   scout_experience_max
  4                   75                  4                      34
```

And the PM's default-drift observation is correct — `src/Entity/PoolConfig.php:202,206`:

```php
    private int $coachAbilityMin = 40;
    private int $coachAbilityMax = 75;
```

**Committed `coachAbilityMin` is 40; live is 4.** The config-default lesson again, a fifth time:
a coach floor read off the repo would be off by 36 points. `coachAbilityMax` happens to agree at
75 — which is exactly the trap, since one of the pair matching invites trusting the other.

**Generation deliberately overshoots the band table.** `coach_ability_max` is 75 against a
`maxAbility` ceiling of 60: the generator can produce 15 ability points the pricing ladder has
no row for.

---

## 3. Player bands — the ceiling is breached in every country

**Source discipline matters here, because there are two tables of nearly the same name and one
of them is gone.** `game_config.league_player_ability_ranges` was **dropped**
(`Version20261113160000`) after being found to be a second independently-authored table nothing
on the server read, disagreeing with the real one at every England tier. The published key is now
served from the authored table — `GameConfigController.php:198`:

```
            // SERVED FROM starter_config.league_ability_ranges, the table that actually prices
            // and generates players — NOT from the game_config column of nearly the same name,
            // which had no server-side consumer and disagreed with it at every England tier.
```

So the authority is the live API payload (served from `starter_config` through
`EconomyConfigPublisher`). Read off the fetch recorded in the companion report:

```
LIVE DEV API (authoritative for the published table):
  EN [(1, 40, 90), (2, 30, 60), (3, 20, 40), (4, 15, 35), (5, 10, 25), (6, 10, 15), (7, 5, 10), (8, 2, 7)]
  SC [(1, 40, 90), (2, 30, 60), (3, 20, 40), (4, 15, 35)]

countries with a tier max > 60: 26 of 26
[('AR', 90), ('BE', 95), ('BR', 90), ('CA', 90), ('CO', 95), ('DE', 90), ('EG', 95), ('EN', 90), ('ES', 90), ('FR', 90), ('GH', 95), ('IN', 95), ('IT', 90), ('JP', 90), ('KR', 95), ('MX', 95), ('NG', 90), ('NL', 90), ('PL', 95), ('PT', 90), ('SA', 95), ('SC', 90), ('TN', 95), ('TR', 95), ('US', 90), ('WA', 95)]

GLOBAL max authored ability: 95
EN tiers whose max exceeds 60: [(1, 40, 90)]
SC tiers whose max exceeds 60: [(1, 40, 90)]
```

**Yes — and by much more than the staff ceiling.**

| | |
|---|---|
| EN tier 1 | **40–90** — top 30 points above the band ceiling |
| SC tier 1 | **40–90** — same |
| EN tier 2 / SC tier 2 | 30–**60** — max sits exactly on the ceiling, so with strict `<` it lands on the fallback too |
| Countries with a tier max > 60 | **26 of 26 — all of them** |
| Global authored max | **95** (BE, CO, EG, GH, IN, KR, MX, PL, SA, TN, TR, WA tier 1) |

So the band table's top row is authored to 60 while the player generator is authored to 90–95 in
every country in the game. **35 of the 95 authored ability points — the top 37% of the player
scale — have no band row.** That the live `current_ability` max is only 69 today reflects which
countries have been generated on this box, not a limit in the authoring.

### ⚠️ Caveat on the row counts, stated rather than buried

The §2 and §4 counts come from the **local Lando dev DB**; the config in §1/§3 comes from the
**remote dev API** (`api.dev.buildmyclub.co.uk`). They are not guaranteed to be the same dataset,
and on one table they demonstrably are not: local `starter_config.league_ability_ranges` has SC
at 75–95 / 65–85 / 55–75 / 45–65, while the live API serves SC as 40–90 / 30–60 / 20–40 / 15–35.

They **do** agree on scouts (5,278, matching `deploy-run-2026-11-20.md`'s figure for the dev
box), so I am treating the Lando counts as representative. **The percentages above should be
re-confirmed against the remote box before being quoted to the owner as exact live figures.**
The *conclusions* do not depend on it — the authored windows (`coach_ability_max` 75, tier-1 max
90) overshoot a ceiling of 60 on either dataset, and that is a config-vs-config fact, not a
row-count one. I did not chase the `starter_config` divergence; it is out of scope and may be
nothing more than a local box that has not been re-seeded. **Flagged for the PM.**

---

## 4. Scout wages: confirmed, and the precise wording

The reading in the companion report is confirmed. Exact figures, since this is going to the
owner.

```bash
lando php bin/console dbal:run-sql "SELECT round(corr(ability, weekly_salary)::numeric,4) AS corr_ability_wage, round(corr(experience, weekly_salary)::numeric,4) AS corr_experience_wage, round((max(weekly_salary)::numeric/min(weekly_salary)),3) AS wage_ratio_best_worst FROM scout"
```
```
  corr_ability_wage   corr_experience_wage   wage_ratio_best_worst
  0.9265              1.0000                 1.504
```

```bash
lando php bin/console dbal:run-sql "SELECT count(*) AS staff, min(weekly_salary) AS wage_lo, round(avg(weekly_salary)) AS wage_avg, max(weekly_salary) AS wage_hi, round((max(weekly_salary)::numeric/GREATEST(1,min(weekly_salary))),1) AS ratio_best_worst FROM staff WHERE weekly_salary > 0"
```
```
  staff   wage_lo   wage_avg   wage_hi   ratio_best_worst
  9784    4134      146843     718284    173.8
```

### Say it this way — "flat" is right about money and wrong about order

**Not flat in direction.** The wage is a perfect function of experience (`corr = 1.0000`,
exactly — the bijection established in the companion report) and correlates 0.9265 with
`ability`. Better scouts do cost more, always, with no exceptions. Calling it "random" or
"uncorrelated with quality" would be wrong and the owner would be right to push back.

**Flat in magnitude, and severely so.** The whole thing fits in £13.50/wk:

| | Scouts | Coaches / staff |
|---|---|---|
| Cheapest | **£26.80** /wk | £41.34 /wk |
| Average | **£35.00** /wk | £1,468.43 /wk |
| Most expensive | **£40.30** /wk | £7,182.84 /wk |
| Worst → best ratio | **1.504×** | **173.8×** |
| Span | **£13.50** | £7,141.50 |

**The headline, and it is exact: the cheapest coach in the game (£41.34/wk) costs more than the
most expensive scout in the game (£40.30/wk).** There is no overlap at all — the entire scout
wage range sits below the entire coach wage range.

### And quality is largely invisible to the price

Because `ability` blends in a 30% judgement component that the wage never sees, scouts of very
different quality carry identical wages:

```bash
lando php bin/console dbal:run-sql "SELECT weekly_salary, experience, count(*) AS scouts, min(ability) AS ab_lo, max(ability) AS ab_hi, max(ability)-min(ability) AS ab_spread FROM scout GROUP BY weekly_salary, experience HAVING count(*) > 50 ORDER BY weekly_salary LIMIT 8"
```
```
  weekly_salary   experience   scouts   ab_lo   ab_hi   ab_spread
  2680            4            182      12      26      14
  2725            5            178      13      25      12
  2770            6            177      13      27      14
  2815            7            158      15      26      11
  2860            8            150      15      28      13
  2905            9            169      17      28      11
  2950            10           176      15      30      15
  2995            11           169      19      30      11
```

```bash
lando php bin/console dbal:run-sql "SELECT max(ab_spread) AS worst_ability_spread_at_one_wage, round(avg(ab_spread),1) AS mean_ability_spread_at_one_wage FROM (SELECT max(ability)-min(ability) AS ab_spread FROM scout GROUP BY weekly_salary) x"
```
```
  worst_ability_spread_at_one_wage   mean_ability_spread_at_one_wage
  16                                 12.9
```

**At any single wage point, scouts span 12.9 ability points on average and up to 16** — against a
total observed ability range of 35 (12–47). So **roughly 37% of the entire scout quality scale is
invisible to the price.** Two scouts both costing £26.80/wk can be 14 ability points apart; at
£29.50/wk, 15 points apart.

And by ability band, the overlap is near-total at the bottom three:

```bash
lando php bin/console dbal:run-sql "SELECT CASE WHEN ability<=15 THEN '1 <=15' WHEN ability<=25 THEN '2 16-25' WHEN ability<=40 THEN '3 26-40' ELSE '4 41+' END AS ability_band, count(*) AS scouts, min(weekly_salary) AS wage_lo, round(avg(weekly_salary)) AS wage_avg, max(weekly_salary) AS wage_hi FROM scout GROUP BY 1 ORDER BY 1"
```
```
  ability_band   scouts   wage_lo   wage_avg   wage_hi
  1 <=15         49       2680      2719       2950
  2 16-25        1696     2680      2921       3580
  3 26-40        3364     2680      3558       4030
  4 41+          169      3760      3965       4030
```

Bands 1, 2 and 3 all start at exactly **£26.80** — the game's worst scout and a mid-table
26–40-ability scout can cost the identical amount.

### Why, in one line, for the owner

Scout wages interpolate `experience` across the £25.00–£70.00 band **on a hardcoded 0–100
scale** (`ScoutWageCalculator::EXPERIENCE_SCALE = 100`, mirrored in `staffWages.ts`), but
generation draws experience from `scout_experience_min/max` = **4–34**. So only 30% of the
authored band is reachable, £70.00 is unreachable by construction, and the ladder the band was
authored to express never happens.

**The fix is an admin edit to `scout_experience_min/max`, not code** — and it would move every
scout wage in the game, because the wage interpolates on exactly that number. Scope here is
establishing the consequence; the edit is the owner's call.

---

## 5. What this means for A24, in one place

A24 is about to price staff wages off `wageMultiplierTiers`. Before it does:

- **The band table has no catch-all row.** Anything above 60 lands on the last row through a
  fallback both codebases describe as accidental. 22.34% of staff are already there. If A24
  touches that walk, it must decide deliberately whether the top row is a catch-all — and either
  restoring `null` or adding rows above 60 **re-prices every elite player and ~2,186 staff**.
- **The ladder is authored to 60 and the world is authored to 95.** The top 37% of the player
  ability scale and the top 15 points of the coach scale have no band.
- **Scouts cannot be priced off this table as-is in any meaningful way**: their entire ability
  range (12–47) falls in bands 1–4 with 95.8% inside bands 2 and 3, and their current wage
  spread is 1.5× against coaches' 173.8×. Moving scouts onto the band is a **repricing of the
  whole scout population**, not a refinement — see §5 of the companion report for the
  distribution and the 8.5% band-crossing A27 already caused.

No check was built (A29 owns `ChecksTab.tsx` / `economyDiagnostics.ts`). The check described in
§7 of the companion report would also catch a scout wage leaving the experience bijection, which
is the moment A24 lands. **A second check is worth considering and I have not designed it:** one
line asserting that the highest `maxAbility` in `wageMultiplierTiers` is `null`, or is at least
`coach_ability_max` and the global authored player max. It can fail, it fails right now, and the
failure is exactly the decision A24 has to make.

---

## Appendix — provenance

- **Read-only.** No app or backend source changed. Nothing committed, pushed or deployed.
- **No database writes.** Every `dbal:run-sql` above is a `SELECT`.
- **Did not touch** `src/components/debug/ChecksTab.tsx` or `src/economy/economyDiagnostics.ts`.
- Config figures: the live dev API fetch recorded in `scout-wage-impact-report.md` §1
  (`api.dev.buildmyclub.co.uk`, 31,277 bytes) plus `game_config` / `pool_config` /
  `starter_config` rows from the local Lando DB. **Row counts are Lando**; the divergence
  between the two on `starter_config.league_ability_ranges` is stated in §3 rather than
  smoothed over.
- Code paths read, not inferred: `src/types/gameConfig.ts:48,55`, `src/economy/wages.ts:26,224`,
  `src/economy/packWages.ts:205`, `src/Service/Economy/WageModelResolver.php:43,505-537`,
  `src/Entity/GameConfig.php:2812-2874`, `src/Entity/PoolConfig.php:202-206`,
  `src/Controller/Api/GameConfigController.php:196-203`, `src/Service/ServeTimePlayerPricer.php:71`,
  `src/Service/MarketPoolService.php:202`, `src/Command/GenerateMarketDataCommand.php:457,541`.
