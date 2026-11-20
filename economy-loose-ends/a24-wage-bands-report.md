<!-- STATUS: ✅ BUILT, COMMITTED AND VERIFIED — app `9f46bf66`, backend `6c5e4ad5`.
NOT PUSHED, NOT DEPLOYED. App suite GREEN at `598ff158` (655/10,962); backend at the
documented 3-failure baseline, all three named. The 4 earlier app failures did NOT
reproduce and are recorded as machine load — §9. 2026-11-20 -->

# A24 report — staff AND scout wages priced from `wageMultiplierTiers`

**Branches:** app `new-game-save`, backend `development`. **Not pushed. Not deployed.**
**Baselines cut from:** app `930fcde7`, backend `3e1555c5`.

Commands and output below are verbatim. Everything measured is labelled with where it came from.

---

## 0. The short version

| The four rulings | What landed |
|---|---|
| 1. The band table is the pricing rule for staff and scouts | ✅ Scouts now price through **the same function** that prices a coach — `tierStaffWeeklyWagePence(ability, economy)` — at world init and NPC poaching. ⚠️ **Not at the hire market, for either role** — see §6, which is the one place the ruling is not fully implemented and why |
| 2. Scouts price off `scout.ability`, not `experience` | ✅ Both sides. App `fallbackScoutWeeklyWagePence(ability)`, backend `ScoutWageCalculator::weeklyWageFor($ability)`. No new column, no migration — A26/A27's field, as the brief said |
| 3. `weeklySalary` becomes a DERIVATION | ✅ Derived on `prePersist` AND `preUpdate` from the derived ability, read-only in admin, help text rewritten. 5 new functional tests |
| 4. Do NOT fix the three cliffs | ✅ Nothing re-authored. They are now **measured** (§5 — and the brief's figure for one of them is wrong) and printed on device (§7) |

**🔴 The one number to take away.** Moving a median dev scout (ability 29) onto the band takes it
from **£35.00/wk** to **£3,066.93/wk at tier 1** and **£2,236.03/wk at tier 4** — a **64× to 88×**
increase. That is not a calibration opinion, it is what the band says, measured through the real
pricing function on the live SC payload. Reported, not tuned (§5).

---

## 1. Five places I disagree with the brief, said explicitly

Per standing note §3. Each is a thing I checked rather than accepted.

### 1a. 🔴 `PoolConfig.scoutWageMin/Max` does NOT become dead config

The brief, twice, in those words: *"`PoolConfig.scoutWageMin/Max` becomes dead admin config once
scouts price from the band. Say so explicitly in the change and in your report."*

**It doesn't, and the reason is structural rather than an omission.** The band resolves on the
**paying club's tier**. A hire-market scout has no paying club — `GET /api/market/data` serves one
pool row to every country at every tier, which is exactly why `MarketDataService::scalePoolWage()`
exists and why its docblock says *"pool rows cannot be priced at generation"*. So the hire market
has no band to resolve, and the `scoutWageMin/Max` interpolation is still what prices it.

**That is not a scout-specific hole.** A hire-market COACH is the same — `market.ts` maps
`salary: c.weeklySalary` straight through, with no band anywhere near it. So the two roles are
still treated identically, which is the ruling; what is true is that **the band governs world init
and NPC poaching, and the hire market is priced by the backend's tier-blind figure, for staff and
scouts alike.** Stated at the call site, in `PoolConfigController`, on the `Scout` entity, and in
both repos' `.context`. §6 is the remaining-work entry.

### 1b. ⚠️ The brief's "~20% pay cut at ability 24 → 25" is the ratio alone and overstates the wage

Measured through `tierStaffWeeklyWagePence` on the live payload, tier 1:

| edge | ratio step | **measured wage step** |
|---|---|---|
| 14 → 15 | 0.500 → 0.667 (+33%) | £465.59 → £737.64 — **+58.4%** |
| 24 → 25 | 0.667 → 0.533 (−20%) | £2,388.61 → £2,116.21 — **−11.4%** |
| 39 → 40 | 0.533 → 0.400 (−25%) | £6,432.35 → £5,139.49 — **−20.1%** |

`ability^k` keeps rising across the edge and partly offsets the ratio step at 25, and the raise at
15 is nearly double the ratio's. **It is the 39 → 40 edge that costs ~20%, not 24 → 25.** The
cliffs are real; two of the three brief figures are the wrong size. Nothing was changed.

### 1c. ⚠️ `scout-wage-impact-report.md` §5's band placement is off, because it banded with `<=`

§5 reports 49 / 1,696 / 3,364 / 169 scouts in bands 1–4. Its SQL uses `ability <= 15`,
`<= 25`, `<= 40`. **The resolver uses STRICT `<`** (`resolveWageTier`, `multipliersFor` — both
docblocks say so and `band-ceiling-finding.md` §1 states it as a finding). Re-banded the way the
code actually walks: **24 / 1,475 / 3,491 / 288** (§4). The shape of §5's conclusion survives
intact — three bands carry everything, ~66% sit in one band — but the row counts shift by up to
120 scouts per band and the brief told me to use them rather than recompute. I recomputed.

### 1d. ⚠️ "Scouts become tier-aware" is true, and on live SC config it buys 1.372×, not a pyramid

The brief asks what this does to a bottom-tier club's scouting bill. The honest answer has two
halves and the second one matters more:

- Live SC authors **four** tiers whose turnovers sit within 1.37× of each other
  (126.97M / 103.15M / 94.91M / 92.57M, `scout-wage-impact-report.md` §1). So tier-awareness
  itself moves a scout's wage by **1.372×** across the whole authored pyramid (ability 29:
  £3,066.93 at tier 1, £2,236.03 at tier 4).
- **Tiers 5–8 resolve to `legacy` and the band cannot price them at all**, so a scout at a tier-5+
  club is not band-priced and keeps the global interpolation unchanged. Measured in §5.

So the bottom-tier bill question splits: a tier-4 club's scouts go up ~64×; a tier-5+ club's do
not move. The tier *spread* is the small part of this change; the *level* is the large part.

### 1e. The brief says "the site count is four". It is **six**, and the sixth was free money

`useInitFlow.ts`, `market.ts`, `StaffPoachingService.ts` and the backend calculator — plus:

- **`worldStore.ts`'s `buildWorldLeagueClubs`**, which priced NPC club **staff** off the band and
  gave their **scouts no wage field at all**. That is why `worldMemberSalaryPence` had to fall to
  the global interpolation for a scout while reading `salary` for a coach: two roles the ruling
  says are the same, priced by two different systems, with nothing saying so. Fixed (§3).
- **`useInitFlow.worldStaffToScout`**, a `role='scout'` `WorldStaff`, which was *already* band-priced
  and is the one path that was right. It is the proof the shape is correct rather than invented.

---

## 2. The band ceiling — config, not code, and behaviour-identical

I followed the PM's recommendation, and the cheaper form of it.

**What I did NOT do: edit the live config.** Restoring `maxAbility: null` on the top row is the
owner's admin edit on their box, it is behaviour-identical, and it is theirs to make. What the code
needed was for the contract to stop being false.

**What I did:** stated in both codebases that **the last row is the catch-all whether or not its
`maxAbility` is `null`**, at the three places that previously described it as an accident —
`WageMultiplierTier` (app), `GameConfig::$wageMultiplierTiers` and
`WageModelResolver::multipliersFor()` (backend), plus the inline comment at each trailing return.
The backend docblock's sentence *"lands on the last row by accident rather than by design"* is
replaced by the rule, with the measured reachability (22.34% of staff) and the pointer to
`band-ceiling-finding.md`.

**Which branch a 61+ ability takes after my change, stated plainly as asked: the same one it took
before.** The last row — `playerMultiplier 30` / `staffMultiplier 12` — reached through the
trailing return, because the live table has no `null` row. No multiplier changed; no ability
resolves to a different row. What changed is that the branch is now documented rather than
emergent, so the next reader does not have to decide whether it is a bug.

Pinned by a test that proves the equivalence, which is also the proof the admin edit is safe:

```
  ✓ resolves an ability above the top row onto that row, not to zero or undefined
  ✓ is behaviour-identical to the same table with a null catch-all
  ✓ still prices a 61+ scout above a 60 one, because ability is a factor in its own right
```

**I did not re-band 60–95.** Calibration, unruled, and A29's panel now measures it (§7).

⚠️ **No scout anywhere reaches the catch-all.** Live scout ability tops out at 47 against a top
row at 60, so the 22.34% figure is a STAFF figure. The catch-all flag in the new panel is there
for the coaches, not the scouts.

---

## 3. What changed, file by file

### App (`new-game-save`)

| File | Change |
|---|---|
| `src/utils/staffWages.ts` | `fallbackScoutWeeklyWagePence(ability)` (was `experience`); new `ScoutWageInputs` + **`resolveScoutWagePence(scout, economy?)`** — the one place a scout's wage is decided. Scout docblock rewritten, including the monotonicity claim (§5) |
| `src/stores/worldStore.ts` | NPC club scouts get `salary` at init, band-priced off `ability` — the gap in §1e |
| `src/hooks/useInitFlow.ts` | `worldScoutEntryToScout` takes an economy and prices the founder's own scouts off the band |
| `src/engine/StaffPoachingService.ts` | `worldMemberSalaryPence` reads the scout's own `salary` and no longer re-derives from experience |
| `src/api/endpoints/market.ts` | Routed through `resolveScoutWagePence`; `ability` hoisted and reused; the no-economy limit documented at the site (§1a) |
| `src/types/world.ts` | `WorldScout.salary?` added, with why |
| `src/types/gameConfig.ts` | The catch-all contract (§2) |
| `src/economy/packWages.ts` | `tierStaffWeeklyWagePence` docblock rewritten — prices scouts too, the three cliffs recorded with their live ratios, the catch-all noted. **No arithmetic changed** |
| `src/economy/economyDiagnostics.ts` | +360: the staff & scout valuation panel (§7) |
| `src/components/debug/ChecksTab.tsx` | +19: `STAFF & SCOUT VALUATION — THE BAND`, after `PLAYER VALUATION` |
| `.context/` 2 files | routes.md and schema.md corrected |

### Backend (`development`)

| File | Change |
|---|---|
| `src/Service/ScoutWageCalculator.php` | Interpolates `ability`, not `experience`. `weeklyWageForScout` reads `getAbility()`. Docblock rewritten, including what this figure now is and is not |
| `src/EventSubscriber/ScoutAbilityLifecycleSubscriber.php` | Derives `weeklySalary` too, on both hooks, **from the derived ability** (order load-bearing). The override-vs-derivation paragraph is quoted and corrected rather than deleted |
| `src/Controller/Admin/ScoutCrudController.php` | Wage field read-only; help text no longer promises an override |
| `src/Service/ScoutGenerationService.php` | `setWeeklySalary` moved to AFTER the ability is derived — before, it would have priced at the column floor of 1 |
| `src/Command/GenerateMarketDataCommand.php` | Prices on the ability it already computes |
| `src/Command/BackfillScoutWagesCommand.php` | What `--force` is now for |
| `src/Entity/Scout.php`, `GameConfig.php`, `WageModelResolver.php`, `MarketDataService.php`, `PoolConfigController.php` | Docblocks: the ability input, the derivation, the catch-all contract, and §1a |
| `.context/` 3 files | services.md, schema.md, entities.md corrected |

**No migration. No schema change.** Both columns already existed, so `wunderkind_test`'s
hand-migration trap does not apply to A24 — stated in the subscriber test so the next reader does
not go looking.

---

## 4. The 5,278 dev scouts — before and after, measured

All from the local Lando DB, as `band-ceiling-finding.md` §2's caveat describes.

### The backend column's move (experience-interpolated → ability-interpolated)

```bash
lando php bin/console dbal:run-sql "SELECT count(*) AS n, min(weekly_salary) AS before_lo, round(avg(weekly_salary)) AS before_avg, max(weekly_salary) AS before_hi, round((max(weekly_salary)::numeric/min(weekly_salary)),3) AS before_ratio, min(w_after) AS after_lo, round(avg(w_after)) AS after_avg, max(w_after) AS after_hi, round((max(w_after)::numeric/min(w_after)),3) AS after_ratio FROM (SELECT weekly_salary, round(2500 + 4500.0*LEAST(100,GREATEST(0,ability))/100) AS w_after FROM scout) x"
```
```
  n      before_lo   before_avg   before_hi   before_ratio   after_lo   after_avg   after_hi   after_ratio
  5278   2680        3359         4030        1.504          3040       3810        4615       1.518
```

```bash
lando php bin/console dbal:run-sql "SELECT count(*) AS n, count(*) FILTER (WHERE w_after <> weekly_salary) AS rows_moved, round(100.0*count(*) FILTER (WHERE w_after <> weekly_salary)/count(*),1) AS pct_moved, count(*) FILTER (WHERE w_after > weekly_salary) AS up, count(*) FILTER (WHERE w_after < weekly_salary) AS down, min(w_after-weekly_salary) AS delta_min, round(avg(w_after-weekly_salary)) AS delta_mean, max(w_after-weekly_salary) AS delta_max, round(100.0*(sum(w_after)-sum(weekly_salary))/sum(weekly_salary),2) AS total_bill_pct FROM (SELECT weekly_salary, round(2500 + 4500.0*LEAST(100,GREATEST(0,ability))/100) AS w_after FROM scout) x"
```
```
  n      rows_moved   pct_moved   up     down   delta_min   delta_mean   delta_max   total_bill_pct
  5278   5269         99.8        5261   8      -90         451          990         13.44
```

**99.8% of rows move, and the aggregate barely does: +13.44% on the total bill, +£4.51/wk per
scout.** That is the *tier-blind* half — the hire market — and it is almost a non-event, because
both inputs are 0–100 numbers interpolated across the same £25–£70 window and `ability` is 70%
experience. 8 scouts get *cheaper* (judgement mean below experience). **Every existing row keeps
its stored price until something writes it**; nothing in this change reprices the table, and
`app:backfill-scout-wages --force` was NOT run.

### Band placement across the population, using the real strict-`<` walk

```bash
lando php bin/console dbal:run-sql "SELECT CASE WHEN ability < 15 THEN '1: <15 (staff x2)' WHEN ability < 25 THEN '2: 15-24 (staff x4)' WHEN ability < 40 THEN '3: 25-39 (staff x8)' ELSE '4: 40+ (staff x12)' END AS band, count(*) AS scouts, round(100.0*count(*)/5278,1) AS pct, min(ability) AS ab_lo, max(ability) AS ab_hi FROM scout GROUP BY 1 ORDER BY 1"
```
```
  band                  scouts   pct    ab_lo   ab_hi
  1: <15 (staff x2)      24      0.5    12      14
  2: 15-24 (staff x4)    1475    27.9   15      24
  3: 25-39 (staff x8)    3491    66.1   25      39
  4: 40+ (staff x12)     288     5.5    40      47
```

**288 scouts cross a band edge relative to `scout-wage-impact-report.md` §5's `<=` banding**
(§1c). And note what this corrects about §5's own framing: §5 called band 4 "41–60" and said 169
scouts reach it. By the real walk it is **40–59, with 288 scouts in it (5.5%)**, and **none of them
is on the catch-all** — the top row's bound is 60 and the population stops at 47. Band 3 alone
holds **66.1%** of every scout in the world on a single flat multiplier, which is §5's real
headline and survives the correction.

---

## 5. 🔴 What the band actually pays a scout — the number the owner should see first

Measured through the app's own `tierStaffWeeklyWagePence` and `weeklyWageRange`, over the live SC
payload saved at `deploy-run-2026-11-20/game-config-sc.LIVE.json` (31,277 bytes, the fetch
`scout-wage-impact-report.md` §1 confirmed byte-identical). Pence per week.

```
wageMultiplierTiers: [{"maxAbility":15,"playerMultiplier":4,"staffMultiplier":2},{"maxAbility":25,"playerMultiplier":6,"staffMultiplier":4},{"maxAbility":40,"playerMultiplier":15,"staffMultiplier":8},{"maxAbility":60,"playerMultiplier":30,"staffMultiplier":12}]
tier1 model=turnover fallbackReason=none

ability	band<	ratio	t1_band	t2_band	t3_band	t4_band	t5_band	t8_band	t1_asPlayer	t4_asPlayer
12	15	0.500	31669	25728	23671	23089	-(legacy)	-(legacy)	63337	46178
14	15	0.500	46559	37824	34800	33945	-	-	93117	67889
15	25	0.667	73764	59926	55135	53780	-	-	110646	80670
20	25	0.667	151423	123016	113182	110399	-	-	227135	165599
24	25	0.667	238861	194051	178538	174149	-(legacy)	-(legacy)	358292	261223
25	40	0.533	211621	171920	158177	154288	-(legacy)	-(legacy)	396789	289290
29	40	0.533	306693	249156	229238	223603	-(legacy)	-(legacy)	575049	419256
30	40	0.533	333819	271194	249514	243380	-	-	625911	456338
39	40	0.533	643235	522563	480789	468969	-(legacy)	-(legacy)	1206066	879317
40	60	0.400	513949	417531	384153	374709	-(legacy)	-(legacy)	1284872	936773
47	60	0.400	769156	624861	574908	560775	-(legacy)	-(legacy)	1922890	1401938
59	60	0.400	1358000	1103237	1015042	990089	-	-	3395001	2475223
60	60	0.400	1416276	1150580	1058601	1032577	-	-	3540690	2581442
61	60	0.400	1476027	1199122	1103262	1076140	-	-	3690068	2690351
75	60	0.400	2474133	2009981	1849300	1803838	-	-	6185332	4509595
```

### Read it like this

| | old scout wage | band, tier 1 | band, tier 4 | factor |
|---|---|---|---|---|
| worst scout in the world (ability 12) | £26.80/wk | **£316.69** | £230.89 | 8.6–11.8× |
| median scout (ability 29) | £35.00/wk | **£3,066.93** | £2,236.03 | 63.9–87.6× |
| best scout in the world (ability 47) | £40.30/wk | **£7,691.56** | £5,607.75 | 139–191× |

**🟢 This is the ruling working, not a defect.** `band-ceiling-finding.md` §4's headline was that
*the cheapest coach in the game (£41.34/wk) costs more than the most expensive scout (£40.30/wk)*,
with no overlap at all. After this change a scout lands **inside** the coach range (£41.34 –
£7,182.84/wk, mean £1,468.43) — because it is literally the same function on the same scale. The
1.504× scout spread becomes the coaches' spread.

**🔴 And it is a very large move that nobody has signed off on a number for.** Per
CORRECTNESS BEFORE CALIBRATION: this is reported, not tuned. The dial is
`wageMultiplierTiers[].staffMultiplier` and `PoolConfig.scoutWageMin/Max`, both admin edits.

### The cliffs, measured rather than quoted (and §1b's correction)

- **ability 24 → 25: £2,388.61 → £2,116.21/wk, −11.4%.** A scout or coach getting better takes a
  pay cut. (The brief said ~20%; that is the ratio, not the wage.)
- **ability 39 → 40: £6,432.35 → £5,139.49/wk, −20.1%.** This is the ~20% edge.
- **ability 14 → 15: £465.59 → £737.64/wk, +58.4%.** One point, nearly a 60% raise.

Pinned as KNOWN in `scoutWageBands.test.ts`, with a `DO NOT "FIX" THIS TEST` note pointing at the
ruling, so a silent re-authoring is visible in CI and a well-meaning reader does not smooth it.

### ⚠️ Tiers 5–8 are not band-priced at all on live SC config

`t5_band` and `t8_band` are `-(legacy)`: live SC authors four tiers, so `resolveEconomy` drops to
`legacy` below tier 4 and `tierStaffWeeklyWagePence` returns `undefined` by design rather than
guessing. **A scout at a tier-5+ club therefore keeps the global interpolation and does not move
at all.** This is the shipped state for most of the pyramid, which is why the panel in §7 prints
the model and the fallback reason on every row. Not an A24 decision — it is which tiers the owner
has authored turnover for.

---

## 6. ⚠️ What I did NOT do, and why

1. **The hire market is not band-priced, for staff OR scouts.** §1a. It needs the paying club's
   tier, which lives in `clubStore` — **explicitly out of this task's scope** by the brief's own
   file list, because a sibling task owns B1's budget mechanism there. This is the remaining half
   of ruling 1 and it needs the PM to sequence it. Documented at the call site rather than left
   silent.
2. **I did not reorder the STAFF chain.** `resolveWorldStaffWagePence` is still
   `salary ?? anchored ?? weeklySalary ?? band ?? legacy`, so a market-sourced staff member still
   takes the backend's authored figure above the band. I built the scout chain to **match it rung
   for rung** rather than inventing a different ordering, because the ruling is that the two roles
   are treated the same — but it means ruling 1 is implemented at world init and poaching and not
   at the market, for both. Changing it is the same decision as item 1.
3. **I did not re-author any multiplier, ratio, or band edge.** Ruling 4.
4. **I did not re-band 60–95 or touch the live `wageMultiplierTiers` row.** §2.
5. **I did not run `app:backfill-scout-wages --force`.** It would reprice all 5,278 dev scouts'
   stored `weekly_salary` by §4's delta. That is a data change on the owner's box and theirs to
   make; the new figure only applies to rows written from now on.
6. **I did not touch any of the seven files the brief fenced off.** Verified: `git status` shows
   none of them in my staged paths (§9).
7. **I did not chase the `starter_config.league_ability_ranges` divergence** that
   `band-ceiling-finding.md` §3 flagged, or the `legacyEconomyFrom` / `resolveEconomy(config, 0)`
   `incomeAnchoredWages` disagreement that `scout-wage-impact-report.md` §1 flagged. Both still
   open, both still the PM's.
8. **`WorldScout` still synthesizes no contract fields.** A poached scout's buyout falls to the
   minimum-weeks floor because there is no `contractEndWeek` on the shape. **Unchanged behaviour**,
   not a gap A24 opened — noted at the site rather than widened.

---

## 7. The CHECKS panel — `STAFF & SCOUT VALUATION — THE BAND`

Placed directly after A29's `PLAYER VALUATION — SAMPLED ROWS`, following the shape that report
established: a deterministic sample, `warn` at worst, no `?? 0` on a money field, and the
per-row table in `full` (the clipboard) rather than on screen.

**Three rows on screen**, which is the §2 proportionality bar:

1. **`Wage band ladder`** — the authored `staff ×` / `player ×` ratio per band and whether it is
   monotonic, plus whether the top row is a `null` catch-all. ⚠️ **It warns right now, on live
   config**, and both halves of the failure change what someone does: smoothing the ratio and
   restoring the `null` are each an admin edit, not a release. This is the line that is still
   worth printing in six months, because it states a relationship nothing else on the device
   exposes.
2. **`Staff valuation`** — band range, `stored/band` ratio range, a count with no wage on the row,
   and a count resolving through the catch-all.
3. **`Scouts valuation`** — the same, which is how the owner sees §5's repricing rather than being
   told about it.

Per sampled row, in the paste: `ability → band < N · staff/player ×r`, the stored wage, what the
band says, what a *player* of that ability earns at the same tier, and the ratio. A row with no
wage prints *"NOT zero: the field is absent"*; a stored 0 is called out as a free contract.

What it reads and why: `worldStore.clubs[].staff` / `.scouts`, rehydrated from the canonical
`staff` + `staff_club` tables on every boot — a pure store read, so no button and no query, same
as its neighbours. The AMP's own staff are not in the sample, for A29's reason: the tier spread is
the value.

It prices through `tierStaffWeeklyWagePence` **imported directly**, not reimplemented and not
injected, so the panel cannot drift from the pricing path without the pricing path moving.

---

## 8. Parity: kept, and both mirrors moved together

`fallbackScoutWeeklyWagePence` ↔ `ScoutWageCalculator::weeklyWageFor` is still
formula-identical — `min + (max − min) × clamp(0,100,x) / 100` — and **both sides changed `x`
from `experience` to `ability` in the same change**. So the parity the brief told me to keep or
break deliberately is **kept**, and the pair has been demoted from "the rule" to "the last rung /
the hire-market figure" on both sides, with the reason written at each.

Asserted rather than claimed:

```
  ✓ mirrors the backend ScoutWageCalculator exactly, on the same input
```
and backend-side, the regression guard that catches the wrong 0–100 number being fed in:
```
  ✓ Scout overload reads the entity's own ability   (sets experience 50, ability 30; asserts 30 and NOT 50)
```

🔴 **CORRECTED 2026-11-20, AFTER THIS CHANGE DEPLOYED: THE COUNT WAS WRONG. It is EIGHT, and
two of them were still on `experience` in shipped code.** The PM found them by grepping for what
still reads scout `experience`; this report had said six and named the four from the brief plus
two it found itself. **It missed the INCOME-ANCHORED path entirely** — which is the one rung that
sits ABOVE everything A24 changed, so missing it meant A24's pricing was being overwritten on the
live market. Full account and fix: `a24b-scout-anchor-input-report.md`.

| site | prices from |
|---|---|
| `worldStore.buildWorldLeagueClubs` (NPC clubs) | **band**, on `ability` |
| `useInitFlow.worldScoutEntryToScout` (founder's own) | **band**, on `ability` |
| `useInitFlow.worldStaffToScout` (`role='scout'` staff) | **band** (already was) |
| `StaffPoachingService.worldMemberSalaryPence` | the scout's own `salary`, written at init off the band |
| `market.ts` (hire market) | backend `weeklySalary` — §1a |
| backend `ScoutWageCalculator` | `scoutWageMin/Max` on `ability` — the hire-market figure |
| 🔴 `marketStore.setMarketData` → `anchorStaffWages` | **was `experience`**, now `ability`. OVERWRITES the `market.ts` figure above, so it outranked A24 entirely |
| 🔴 `GameLoop` §14c staff renewal anchor | **was `experience`**, now `ability`. The renewal mean-reverts toward it |

⚠️ **The lesson, and it is the workstream's own governing one in a new costume.** A24 traced every
path that *computes* a scout's wage and moved them all onto `ability`. It did not ask which rung
of `resolveWorldStaffWagePence`'s chain OUTRANKS the ones it was changing — and the answer was
`anchoredPence`, whose two producers were still being handed `experience`. **Tracing the sites
that compute a quantity is not the same as tracing the sites that decide it.**

---

## 9. Verification

### ⚠️ First, and it shaped every figure below: another session was writing this same checkout

My brief says *"You are the only writer in this checkout right now."* **That is not true**, and
I found it the first time I typechecked:

```
src/stores/clubStore.ts(510,5): error TS2304: Cannot find name 'captureWarning'.
```

```bash
git show HEAD:src/stores/clubStore.ts | grep -c "captureWarning"   # → 0
git diff --stat src/stores/clubStore.ts src/db/helpers/pickClubState.ts
```
```
 src/db/helpers/pickClubState.ts |   8 ++
 src/stores/clubStore.ts         | 238 +++++++++++++++++++++++++++++++++++++++-
```

By the time I finished, the working tree held uncommitted edits to **`clubStore.ts`,
`GameLoop.ts`, `dofHireCharge.ts`, `SignPlayerPanel.tsx`, `SignYouthPanel.tsx`,
`DofProposalService.ts`, `DofStaffHiringService.ts`, `TransferService.ts`,
`DofProposalCard.tsx`, `app/staff/[id].tsx`, the three i18n files** and a new
`src/__tests__/economy/dofPotLedger.test.ts`. That is precisely the B1 budget task the brief
fenced me out of, mid-flight. **None of it is mine.** 🟢 **For the PM: two sessions are writing
`new-game-save` in one checkout concurrently.**

**So I verified in an isolated `git worktree` at `930fcde7` with only my 13 app files copied in**,
rather than measuring a tree containing someone else's half-finished change and attributing it to
A24. That is also why §9's figures are trustworthy and why the `clubStore` error is absent from
them.

### App — `npx tsc --noEmit` and `npm test`, in the isolated worktree

```bash
git worktree add --detach "$SCRATCH/a24-verify" HEAD      # 930fcde7
# ...13 files copied in, node_modules symlinked...
npx tsc --noEmit; echo "tsc exit=$?"
npx jest --listTests | wc -l
```
```
tsc exit=0
     654
```

```bash
npx jest    # in the isolated worktree
```
```
Test Suites: 2 failed, 652 passed, 654 total
Tests:       4 failed, 3 skipped, 10920 passed, 10927 total
Time:        2825.428 s
```

**The count reconciles exactly.** A29's row measured this branch at **652 suites / 10,891 passed,
10,894 collected**. This run is **654 / 10,927 collected — +2 suites / +33 tests**, and all 33 are
mine: `scoutWageBands.test.ts` (14) and `staffValuationChecks.test.ts` (19). No third-party suite
gained or lost a test; `staffWages.test.ts` was edited but not lengthened.

### ✅ RESOLVED — the 4 failures did NOT reproduce. The cause was machine load

**The clean re-run, at `598ff158` (A24 + B1), with nothing else running on the machine:**

```bash
npx jest --listTests | wc -l
npx jest
```
```
listTests:   655
Test Suites: 655 passed, 655 total
Tests:       3 skipped, 10962 passed, 10965 total
Time:        151.095 s
```

**Zero failures.** `db/clientRecovery.test.ts` and `screens/tournamentHubRender.test.tsx` both
pass.

### 🔴 The decisive number is the WALL CLOCK, not the pass/fail

| run | conditions | time | result |
|---|---|---|---|
| A24 alone, isolated worktree | **sharing the machine with the 3,271-test phpunit run and a `tsc`** | **2,825 s** | 4 failures in 2 suites |
| pristine HEAD, same worktree | phpunit still running | 1,331 s | green |
| **A24 + B1, real checkout, nothing else running** | **alone** | **151 s** | ✅ **green** |

**151 s against 2,825 s is 18.7×, on the same suite and the same machine.** That is not an
inference about test ordering — it is a direct measurement of how starved the first run was, and
it is the mechanism for every failure seen today, because **every one of them is a clock**:

- `reopen budget › still gives up on a file that genuinely will not open` —
  `expect(mockOpen.mock.calls.length).toBeLessThanOrEqual(5)` read **9**. A retry budget.
- `db/health/runner.test.ts` (B1's run, at `598ff158`) — a **150 ms** wall-clock tripwire read
  **207 ms**.

Run the clock 18.7× slower and a timeout-driven retry fires more often and a 150 ms budget blows.

⚠️ **I first wrote this up as load-induced flake, then retracted that when the pristine-HEAD run
came back green, because a green control run is evidence against the easy reading.** The retraction
was right at the time: what was missing was the timing column, and the pristine run had phpunit
still running too — so it was never the clean control I treated it as. **The conclusion the
evidence supports is "these suites are load-sensitive and this machine was loaded," not "ordering."**
Ordering only decides *which* clock-sensitive suite becomes the casualty on a given run.

**Three suites are load-sensitive and each passes in isolation.** Across four runs today, no two
agreed on which failed:

| suite | seen failing in | in isolation |
|---|---|---|
| `src/__tests__/db/clientRecovery.test.ts` | A24's contaminated run (2 tests) | ✅ passes |
| `src/__tests__/screens/tournamentHubRender.test.tsx` | A24's contaminated run (2 tests) | ✅ passes |
| `src/__tests__/db/health/runner.test.ts` | B1's run at `598ff158` (1 test) | ✅ passes |

**No bisect was needed and none was run.** A24's pricing change cannot plausibly reach any of
them — `clientRecovery` imports only `expo-sqlite` and `@/db/client`.

### ✅ The counts reconcile across three independent runs

| | suites | collected | vs previous |
|---|---|---|---|
| A29 baseline (`930fcde7`) | 652 | 10,894 | — |
| A24 alone | 654 | 10,927 | **+2 suites / +33** — `scoutWageBands` (14) + `staffValuationChecks` (19) |
| **A24 + B1 (`598ff158`)** | **655** | **10,965** | +1 suite / +38, B1's |

🟢 **And it cross-checks against B1's own run of the same tree.** B1 reported 10,961 tests with one
failure: `10,961 passed + 1 failed + 3 skipped = 10,965 collected` — **identical to this run's
collected total**, two independent runs differing only by B1's one load casualty.

**⚠️ `598ff158` is A24 + B1 together, so `655 / 10,962` is not an A24 figure.** A24's own is
`654 / 10,924 passed`, and it was only ever measured on the contaminated run. Updating
`CLAUDE.md`'s `new-game-save` row and `environment.md`'s green-master bar is **left to the PM** —
per standing note §3, and because that table has gone stale six times from well-meant edits.

### ✅ Backend — ran to completion, exactly the documented baseline

```bash
lando php vendor/bin/phpunit --colors=never --filter '/^(?!.*AdminShellCoverage).*$/'
```
```
Time: 05:39.785, Memory: 811.50 MB

There were 3 failures:

1) App\Tests\Controller\Admin\NotificationLogCrudControllerTest::testIndexRowIsClickableToADetailPageShowingTheFullPayload
The row for this log entry should be present.
Failed asserting that 0 is greater than 0.
/app/tests/Controller/Admin/NotificationLogCrudControllerTest.php:65

2) App\Tests\Controller\Api\CompetitionControllerTest::testShowIncludesResultsOnceRoundsAreProcessed
a freshly generated result must carry a non-empty narrative timeline
Failed asserting that an array is not empty.
/app/tests/Controller/Api/CompetitionControllerTest.php:807

3) App\Tests\Service\Friendly\FriendlyResolveSingleMatchTest::testResolvingAnAcceptedChallengeRecordsAFullResult
Failed asserting that an array is not empty.
/app/tests/Service/Friendly/FriendlyResolveSingleMatchTest.php:110

FAILURES!
Tests: 3271, Assertions: 157033, Failures: 3, PHPUnit Deprecations: 1, PHPUnit Notices: 21, Skipped: 13.
```

🟢 **All three failures are the documented pre-existing ones, confirmed BY NAME** —
`NotificationLogCrudControllerTest`, `CompetitionControllerTest`,
`FriendlyResolveSingleMatchTest`. **Nothing else failed, so nothing is attributable to A24** and no
stash-and-rerun was needed.

🟢 **The count reconciles exactly: 3,271 against the documented 3,265 baseline — +6, which is
mine.** `ScoutAbilityLifecycleSubscriberTest` +5, `ScoutGenerationServiceTest` +1;
`ScoutWageCalculatorTest` renamed its cases without changing its count.

**5m 40s, run alone.** The earlier aborted run reached ~14% with one unnamed `F` at test 428 and
no summary to name it from; `NotificationLogCrudControllerTest` sorts early enough to be that `F`,
which is consistent — **but that remains an inference and the clean run above is the result.**

⚠️ **The `wunderkind_test` migration trap did not apply.**
`git show --name-only HEAD | grep migrations/` is empty for `6c5e4ad5`: A24 priced off two columns
that already existed, so there was no schema change to hand-apply.

### What IS verified

| | |
|---|---|
| `npx tsc --noEmit`, isolated worktree, my files only | ✅ **exit 0** |
| `npx tsc --noEmit`, working tree, after the final docblock pass | ✅ **exit 0** |
| `npx jest --listTests \| wc -l` | **654** = 652 + my 2 |
| The 4 suites my change actually touches, run together | ✅ **4 passed / 58 tests** (`staffWages`, `packIsACensus`, `scoutWageBands`, `staffValuationChecks`) |
| `php -l` on all 11 changed backend source files + 3 test files | ✅ no syntax errors |
| App suite at pristine HEAD, for attribution | ✅ 652 / 10,891, green |
| **App suite at `598ff158` (A24 + B1), run ALONE** | ✅ **655 / 10,962 passed, 10,965 collected, zero failures, 151 s** |
| **Backend suite, run ALONE to completion** | ✅ **3,271 tests, 157,033 assertions, the documented 3 failures and nothing else** |

---

## 10. For the PM

**Blocking, or close to it:**

1. **🔴 Two sessions are writing `new-game-save` in one checkout.** B1 has now committed on top of
   A24 (`4c3f45eb`). My brief said I was the only writer; it was wrong, and it cost a full suite
   run plus a pristine-HEAD run to work around. Worth fixing in the briefs, not just here.
2. **✅ CLOSED — the 4 app failures did not reproduce** (§9). The clean run at `598ff158` is
   green, 655/10,962, in **151 s against 2,825 s** for the contaminated run. Three suites are
   load-sensitive and each passes in isolation: `db/clientRecovery.test.ts`,
   `screens/tournamentHubRender.test.tsx`, `db/health/runner.test.ts`. No bisect needed.
   ⚠️ **Still yours: `CLAUDE.md`'s `new-game-save` row and `environment.md`'s green-master bar.**
   `655 / 10,962` is A24 **+ B1**; A24's own figure is `654 / 10,924 passed` and was only ever
   measured on the contaminated run.
   🟢 **Worth a line in `environment.md` on its own account:** the three suites above assert wall
   clocks and retry budgets, so a loaded machine fails them and the failure names a different
   suite each time. That is most of what the "three to five failures" baseline has been.
3. **✅ CLOSED — the backend suite ran to completion**, 3,271 tests, **exactly the documented
   three failures, all confirmed by name** (§9). Nothing attributable to A24.

**Decisions that are the owner's, with the numbers to make them on:**

4. **The scout repricing is 64–88× at the median** (§5). Correct per the ruling, un-calibrated by
   instruction. The dials are `wageMultiplierTiers[].staffMultiplier` and
   `PoolConfig.scoutWageMin/Max`, both admin edits.
5. **The three cliffs**, now measured rather than quoted, and **two of the brief's three figures
   were the wrong size** (§1b). Smoothing is an admin edit; the CHECKS panel warns on them today.
6. **The band ceiling's `null`.** Restoring it in live config is behaviour-identical, proven by
   test, and is an admin edit. The code no longer depends on the accident either way.
7. **`wageMultiplierTiers` tops out at 60 against a world authored to 95.** Not A24's to re-band.

**Work A24 identified and did not do:**

8. **The hire market is not band-priced, for staff OR scouts** (§1a, §6.1–6.2) — the remaining half
   of ruling 1. Needs `clubStore`, which this brief fenced off for B1. **Your sequencing call.**
9. **`app:backfill-scout-wages --force` has not been run** (§6.5). Until it is, dev scouts' stored
   `weekly_salary` keeps the experience-derived figure; only rows written from now on get the new
   one. +13.44% on the total bill if run (§4).
10. **`PoolConfig.scoutWageMin/Max` is NOT dead config** — the brief said it would be, twice (§1a).
    Corrected in both repos' `.context` and at four code sites.

**Carried forward, still nobody's:**

11. `starter_config.league_ability_ranges` diverges between the Lando box and the live dev API
    (`band-ceiling-finding.md` §3).
12. `resolveEconomy(config, 0)` and `legacyEconomyFrom()` disagree on `incomeAnchoredWages`
    (`scout-wage-impact-report.md` §1).
13. `players.contract_weekly_wage` is whole POUNDS, so every wage is quantised to the pound on
    save/load — A29 raised it; still open.
14. **`scout-wage-impact-report.md` §5's band counts are off** (`<=` vs the resolver's strict `<`).
    I did not edit that file — superseded-section edits are yours (§1c has the corrected figures).
