<!-- STATUS: findings recorded 2026-11-19, two items CLOSED, two OPEN -->

# Scotland experiment — what the fresh save settled

Factor 0.50 -> 0.10, 8 tiers -> 4, clubs + worldpack caches rebuilt, new device save.
Device readings 2026-11-19 22:15-22:16, OTA published 21:09, channel dev.

## CLOSED — the starter squad wage discrepancy was a timing artefact

Earlier reading: founder's squad priced ~4.8x the live scale (contracts GBP 10,000 / 1,500
against a tier-4 scale that should give GBP 2,102 / 293). Only the PRE-change tier-4 scale fit
both.

Fresh save, Moffat Vale, SC tier 4:

| | |
|---|---|
| Grant Dalgleish, ability 23 | contract **GBP 2.3k/wk** |
| Debug "wage expectation by ability", ability 23 | authored **GBP 2,349** · anchored GBP 2,936 |

The contract sits on the AUTHORED figure. The squad is priced from the live tier scale.
**Not a defect** — the stale pricing was a consequence of moving the dial mid-session, and a
fresh save prices correctly. No task.

## CLOSED (pending one confirmation) — the tier-8 ability fallback

Earlier reading: Starter Pack Check said "20 of 20 players for SC at tier 8" with band 10-25
from `WorldInitializationService::ABILITY_RANGES`, on a country that now has 4 tiers.

Fresh save reads **"sampled across this tier's own band, 15-35"** — tier 4's authored band.
So the fallback is not firing on this save.

⚠️ **Not fully closed.** The 15-35 reading is from the APP's debug pane. The tier-8 request was
read from the BACKEND's Starter Pack Check screen. One re-read of that screen settles whether
the backend still asks for tier 8. The hardcoded 8-row `ABILITY_RANGES` table at
`WorldInitializationService.php:203` is still there either way, and a silent fallback behind an
authored table is still worth retiring.

## OPEN — income coverage 900.4%

Moffat Vale, SC tier 4, from INCOME — MODELLED vs AUTHORED:

```
sponsors /wk x 46                          GBP 0
matchday /wk x 46                     GBP 47,268
season-end lump (TV, prize, shirt..) GBP 18,590,860
= MODELLED season income             GBP 18,638,128
authored turnoverPence (tier)         GBP 2,070,000
COVERAGE modelled / authored               900.4%
```

**The engine pays 9x what the tier table claims**, and 99.7% of it is the season-end lump.

🔴 **The obvious explanation is ruled out.** `LeaguePayoutResolver.php:246-270` applies
`countryFactorBp` to payouts, so TV and prize ARE country-scaled. Both sides of the ratio carry
the 0.10. They still disagree by 9x.

**What is NOT yet known: the composition of that GBP 18,590,860.** TV is GBP 3.6m (from the
division-size row below), so ~GBP 15m is prize money + league sponsor + shirt sales. Shirt
sales are app-side and derived from fan base, which is derived from PLOT POPULATION — and plot
population is not country-scaled. That is the leading candidate and it is untested.

⚠️ **Cross-check that argues against it:** NPC club Linlithgow Caledonian, same tier, same
league, booked "Season shirt sales +GBP 6.5k". If shirt sales were the GBP 15m, that figure
would not be GBP 6.5k. Either the AMP club's plot is very different from an NPC's, or the lump
is mostly prize money. **Next reading: the breakdown of the season-end lump.**

## OPEN — SC tier 4 pays TV into 14 slots with 12 clubs

```
SC t4  slots 14 · clubs 12 · home games 11 · TV GBP 3.6m = pool/14
       DISAGREE: authored 14 != 12 clubs
```

t1-t3 have no authored `slots` and derive correctly. Only t4 carries the stale 14 from the
8-tier ladder.

**Effect:** each tier-4 club receives pool/14 instead of pool/12 — about **14% less TV than the
pool intends**, and 2/14 of the pool is never distributed to anybody.

**Fix is one admin edit:** set SC t4 `league.slots` to 12, or blank it so it derives.

🟢 **The division-size check caught this correctly**, which is worth noting against the A19
brief: the false-pass case is the `slots —` rows, not this one.

## Context, not defects

🟢 **Wage coverage is healthy at every tier** — t1 94.1%, t2 100.0%, t3 92.8%, t4 101.6%
against the authored budget. The wage side of the economy is doing what it is supposed to.
The earlier "economy is struggling with Scotland" verdict does not stand; it was a stale
squad read under a new budget.

🟢 Squad pricing model reads **TURNOVER**, not LEGACY. Pack version 11, single, advisory only.

⚠️ **The squad-pricing check cannot see the founder's club.** `worldPackResults` calls
`fingerprintWorldPack(clubs)` over world-pack clubs only — 228 players at t4, against the
wage-coverage block's 20.7 x 12 = 248. The ~20-player gap is exactly the AMP squad. **The one
squad that was mispriced is the one this check is blind to**, which is why the aggregate looked
clean throughout. Worth closing.

⚠️ **Unexplained, needs the owner:** Moffat Vale balance **GBP 30,118,784** at season 1 week 1,
tier 4; NPC Linlithgow in the same league holds **GBP 427.4k**. A 70x gap. If that GBP 30m is
the funding chosen in the new-game flow then it is not a defect — but it needs saying, because
every ratio measured from the AMP club is measured against it.

---

# RESOLVED — the 900% is the whole division's sponsor pot, paid to one club

**Confirmed from source, 2026-11-19.** `src/engine/FinancialProjectionService.ts:362`:

```ts
const totalSeasonEndIncome = Math.max(0, tvDeal + leagueSponsorPot + estimatedPosPrize
  + shirtNet + seasonTicketIncome - seasonTaxPence);
```

and `:243`:

```ts
const leagueSponsorPot = league?.sponsorPot ?? 0;
```

**`sponsorPot` is a DIVISION-WIDE figure.** `rollLeagueSponsorPot`
(`src/utils/leagueFinances.ts:57-74`) sums a draw for every sponsor in the league:

```ts
for (const [size, count] of Object.entries(league.sponsorSizes)) {
  for (let i = 0; i < count; i++) total += randInt(bandConfig[band.min], bandConfig[band.max]);
}
return total;
```

**So every club's forecast credits itself the entire division's sponsorship.**

## This is the SAME defect the file directly beneath it documents fixing

`:247-265` is a long comment removing the flat champion's prize for precisely this reason:

> *"this expression used to add it for every club unconditionally … a mid-table tier-8 club was
> forecasting the whole division's pot. `SeasonBudgetService` sizes the season budget from this
> lump, so the error reached the club's wage share and surplus, not just a screen."*

**`leagueSponsorPot` is that same shape and was left in, two lines above the comment.**

## The arithmetic matches

| | |
|---|---|
| AMP (Moffat Vale) modelled season income | GBP 18,638,128 — **900.4%** of authored |
| NPC (Linlithgow) seasonal, amortised | 7,763,975 p/wk x 46 = GBP 3,573,429 — **172%** |
| difference | **~GBP 15m**, and 99.7% of the AMP lump is the season-end term |

The NPC path does not carry it: `npcSolvency.ts:109` sets `seasonEndIncome: 0` deliberately
(seasonal money is amortised into `weeklyIncome`, documented at `:85-96`). **That is why the AMP
reads 900% and an NPC in the same league reads 172%** — the gap is almost exactly the pot.

## It is not just a screen

The AMP budget pane reads **income (basis) GBP 18,638,128 -> wage share allowed GBP 11,182,877**.
`SeasonBudgetService` sizes the budget off this lump, so an inflated pot inflates the wage
share by roughly GBP 9m. **Every wage, transfer and surplus decision the club makes in season 1
is sized against money it will never receive.**

## What still needs deciding (owner)

The champion's-prize fix chose to credit **nothing** rather than invent a share. The same choice
is open here: credit nothing, credit `pot / clubCount`, or credit only the club's own signed
sponsors (which the club already tracks separately — the AMP shows SPONSORS (1), GBP 223/wk, and
the weekly line reads GBP 0). ⚠️ **Crediting a share would be a new mechanic**, exactly the
objection recorded against doing it for the prize.

**The 172% residual is a separate, smaller question** and is a backend authoring one: even
without the pot, the engine pays ~1.7x the authored tier turnover.

---

# The player picks the starting balance against a hardcoded wage bill

**Owner, 2026-11-19:** *"During the new-game-save process the user can select starting
balance."* So the GBP 30m is a choice, not a defect — **but the figures that choice is made
against are not all real.**

## `starterSquadWagesPence` is never published

`src/components/new-game-setup/economy.ts:63`:

```ts
starterSquadWagesPence: 1_200_000,   // GBP 12,000/wk, flat
```

`economyOf()` (`:78-83`) lays published `starter-config.economy` keys over the stand-ins — so a
published value WOULD win. **The backend publishes no such key**: `starterSquadWagesPence`
appears nowhere in `wunderkind-backend/src/`. Checked against `seasonTicketHolderPercent`,
which does appear in `GameConfigController:223` and `SyncService:369`, to confirm the search
was looking in the right places.

**So FUND YOUR CLUB models every starter squad in every country at every tier as
GBP 12,000/wk.**

## What it costs

`weeklyRows` (`:199`) feeds `playerWages` straight from it, and `fundingFloorWeeks: 13` turns
those rows into the minimum funding the player is advised to put in.

| | |
|---|---|
| modelled, SC tier 4 | GBP 12,000/wk |
| actual, Moffat Vale | **GBP 17,000/wk** (device, PLAYER WAGES) |
| actual, SC tier 1 | GBP 14.0m season / 46 = **GBP 304,000/wk** |

**~40% understated at the tier the save actually starts in, and ~25x understated a few rungs
up** — and a country at a 1.00 factor rather than Scotland's 0.10 is another order again. The
number cannot be right across 25 countries, because it does not vary.

⚠️ **The screen is already careful about this class of error.** `homeGames` and
`ticketPricePence` each carry a long comment about a stand-in that mismodelled *"the one screen
where the player commits real money"* — 53% and 40% respectively. **This is the third instance
and the largest, and it is the only one with no note against it.**

## Also noticed in passing

`SyncService.php:461` serves `seasonTicketHolderPercent => 60` in its fallback branch while the
live config serves **70** (device CHECKS). Same fallback branch the GameConfig checklist already
flags as the easy one to miss. Low impact, one line.

---

# Staff cost 2.7x a player of the same ability, against an authored 1.2x

**Owner, 2026-11-19:** *"Looks like staff wages aren't scaling… Staff v players is massive."*
Moffat Vale, SC tier 4: **12 coaches + 1 scout = GBP 62,373/wk** against **20 players =
GBP 17,000/wk**. Staff are **3.7x the squad**.

## The authored multipliers say staff should cost roughly the SAME as a player

`GameConfig.php:2862-2865`, `wageMultiplierTiers`:

| maxAbility | playerMultiplier | staffMultiplier | staff / player |
|---|---|---|---|
| 25 | 0.5 | 0.6 | **1.2** |
| 50 | 1.0 | 1.0 | **1.0** |
| 75 | 2.5 | 2.0 | **0.8** |
| null | 5.0 | 4.0 | **0.8** |

`tierStaffWeeklyWagePence` (`src/economy/packWages.ts:191-212`) prices a staff member as
`weeklyWageRange(ability).expectedPence x (staffMultiplier / playerMultiplier)` — so at every
ability in the game, a staff member is authored to cost **0.8x to 1.2x** an equal-ability
player.

## The device shows 2.7x

Read off the staff list against the debug pane's own player ladder, same club, same tier:

| ability | staff, actual | player, authored | ratio |
|---|---|---|---|
| 15 | GBP 2,366 | GBP 807 | **2.93** |
| 19 | GBP 4,143 | GBP 1,457 | **2.84** |
| 24 | GBP 7,048 | ~GBP 2,610 | **2.70** |
| 27 | GBP 9,100 | GBP 3,507 | **2.59** |

**Consistently ~2.3x higher than the 1.2 the config authors.**

## What is ruled out, and what is not

🔴 **Not a stale baked salary.** `resolveWorldStaffWagePence` (`src/utils/staffWages.ts:110-114`)
takes `staff.weeklySalary` at rung 3, AHEAD of the tier rung — but
`WorldPackSnapshotBuilder::buildStaffSnapshot()` (`:241-260`) carries no `weeklySalary`, and
`StarterPackService:157` serialises the founder's staff through that same builder. Rung 3 is
empty on both paths.

🔴 **Not a missing `economy` argument.** Both init sites pass it
(`useInitFlow.ts:350`, `:381`), so the tier rung is reachable.

⚠️ **NOT PINNED: which rung actually produces GBP 7,048.** At the authored 1.2 ratio an
ability-24 staff member should cost ~GBP 3,132. The observed figure is 2.25x that, and static
reading did not settle where it comes from. **A device reading of one staff member's resolved
salary against `tierStaffWeeklyWagePence` for the same ability would settle it in one step.**

## The structural half, which is separate and does not need the above

`StarterPackService.php:151-152`:

```php
// Same $abilityRange as the squad above — a founder's staff are at the founder's level.
$staff = $this->clubGenerator->generateStaff($squadConf, $nationality, $country, $tier, $abilityRange);
```

**The founder's staff are drawn from the squad's ability band — but that band is the squad's
POTENTIAL.** A player drawn at potential 24 has a CURRENT ability far below it (the debug pane's
own note: *"25% of potential at 19, 40-59% at 24, 90% at 31"*), and is priced on current ability.
**A staff member has no current/potential split** — ability 24 is ability 24, priced at face
value, from day one.

🔴 **So even at a correct 1.2 ratio the staff bill would still dwarf a young squad's**, because
the two sides of the comparison are not the same quantity. That is a design question, not a
bug: either staff need a maturity curve, or the founder's staff should be drawn against the
squad's EXPECTED CURRENT ability rather than its potential band.

⚠️ **And the headcount compounds both:** 13 staff to 20 players at the bottom tier of the
smallest ladder in the game.

---

# CORRECTION — the sponsor pot is not a mis-attribution. It is a mis-SIZING.

**I framed the GBP 15m as "the whole division's pot credited to one club by mistake," and asked
the owner to choose a fix on that basis. The framing was wrong.** Recorded in full because the
owner answered the wrong question.

## Every club is PAID a sponsorPot-sized amount, deliberately, on both paths

- **AMP**, `SeasonTransitionService.ts:864-865`:
  `addTransaction({ amount: Math.round(sponsorPot), category: 'league_sponsor' })`
- **Season 1**, `:1527-1528`: the same, as *"Season 1 league sponsor"*.
- **Every NPC**, `:1658-1663`: `ampSponsorPot x (ampTier / npcTier)`, credited per club, with
  its own docblock at `:1589-1597` describing the tier scaling as intended behaviour.

**So the forecast including it is CORRECT** — it matches what the tick actually pays.
`src/__tests__/engine/projectionMatchesTick.test.ts` exists to keep those two in step, and it
passes today because they agree.

🔴 **Removing the term from the forecast alone would make the forecast understate real income
by ~GBP 15m and break that test — the opposite error, and a worse one**, because the money
would still land while the club planned without it.

## The real defect: a per-club payment sized by a division-wide sum

`rollLeagueSponsorPot` (`src/utils/leagueFinances.ts:65-74`) sums one draw **per sponsor in the
division**:

```ts
for (const [size, count] of Object.entries(league.sponsorSizes)) {
  for (let i = 0; i < count; i++) total += randInt(bandConfig[band.min], bandConfig[band.max]);
}
```

and `sponsorCount` is a per-DIVISION field on `leagueTierDefaults`
(`GameConfig.php:2523-2534`), not a per-club one.

**So the amount is division-scale and the payment is per-club.** Every club in the division
receives the whole division's sponsorship, every season.

## The choice that actually needs making — and it is NOT the prize's choice

The prize was genuinely a forecast-only bug: the tick had been champion-only since the economy
overhaul and only the forecast missed the change. **Here the tick and the forecast agree, so
there is no "the tick is already right" option.** Changing this changes money the club
receives.

1. **Divide at the payment** — each club gets `pot / clubCount`. Smallest change, keeps the
   authored sponsor list meaningful, and the division's total sponsorship stays what the bands
   say. ⚠️ Must change the tick AND the forecast together, or `projectionMatchesTick` fails.
2. **Re-author `sponsorCount` as per-club.** No code change; the bands then describe one
   club's sponsors. ⚠️ But `:1658`'s tier scaling already treats the AMP's pot as a baseline
   to scale from, which only makes sense for a division figure.
3. **Credit nothing** — delete the league sponsor line entirely, from both the tick and the
   forecast. Largest behaviour change; removes a season-1 income line the NPC start-income
   pass also depends on.

⚠️ **Whichever is chosen, forecast and tick must move in the same commit.**

---

# DONE — league sponsorship divided by club count (app `3569326b`)

**Owner's ruling: divide by club count.** Implemented on `new-game-save`, all four payment
sites in one commit.

| site | club count it derives from |
|---|---|
| `FinancialProjectionService:243` (forecast) | `leagueTableSize(league.clubs, club.id)` |
| `SeasonTransitionService:859` (AMP, season N) | `league.clubCount` |
| `SeasonTransitionService:1523` (AMP, season 1) | `leagueTableSize(league.clubs, ampClubId)` |
| `SeasonTransitionService:1658` (every NPC, season 1) | the `leagueSizeById` participants map already built in that function |

**No club count is wired** — each site derives its own, per the owner's 2026-11-19 ruling.
`leagueSponsorPerClubPence` (`src/utils/leagueFinances.ts`) is the one place the divide is
spelled, with the measurement and the "every caller divides, or none does" constraint in its
docblock.

🟢 **`sponsorPot` keeps its meaning as the DIVISION total** — persisted that way, shown to the
player by `LeagueScreen` as `SPONSORSHIP POT`, and used by the NPC pass as a tier-scaling
baseline. The divide is at payment.

🟢 **Fallback is `FALLBACK_DIVISION_SIZE`, not the whole pot**, so an unknown division size
cannot silently restore the defect. Pinned by its own test.

## Verification

- `npx tsc --noEmit` — zero errors.
- `npm test` — **647 suites / 10,788 passed**, 3 skipped, `--listTests` 647 (agrees).
- One test changed, deliberately and with the reason in the test:
  `SeasonTransitionService.test.ts`'s *"credits sponsor pot for next season"* asserted the raw
  pot. It is now two tests — the share, and the fallback.
- ⚠️ **The branch row did not reconcile.** It read 640 / 10,704 at `e03dd6da` + A12; the
  shared-runway work and everything after was never re-measured, so +7 suites / +84 tests are
  unattributed. Recorded as unattributed in `environment.md` rather than explained away.

⚠️ **NOT deployed and NOT seen on device.** Next save on dev should read coverage far below
900.4% at SC tier 4 — but ~172% rather than ~100%, because the residual (the engine paying
~1.7x the authored tier turnover even without the pot) is a separate, open, backend authoring
question.

---

# STAFF — status, and a correction to my own claim

**Not fixed, not briefed, no task started.** Investigated only. Recorded at `f229a66`.

## 🟢 Established and not in doubt

Moffat Vale, SC tier 4: **12 coaches + 1 scout = GBP 62,373/wk** against **20 players =
GBP 17,000/wk**. Staff are **3.7x the squad**. Per ability, against the debug pane's own player
ladder on the same screen: 15 -> 2.93x, 19 -> 2.84x, 24 -> 2.70x, 27 -> 2.59x.

**The observation is solid. The comparison I drew it against is not.**

## ⚠️ CORRECTION — "an authored 1.2x" is the PHP DEFAULT, not necessarily the live value

I read `wageMultiplierTiers` from `GameConfig.php:2862-2865` and called the 1.2 ratio
"authored". **Those are the entity's defaults.** `wageMultiplierTiers` is editable in the admin
(`DashboardController:461` writes it), and the owner has been tuning the economy all week, so
the live dev value may be nothing like the default.

🔴 **So "the device pays 2.3x what the config authors" is NOT established.** What is
established is that the device pays 2.7x a player of equal ability. Whether that is a defect or
simply what the live multipliers say is **unknown**, and I should not have stated it as the
former.

## What the rung analysis DOES settle

Every rung of `resolveWorldStaffWagePence` is now accounted for, and **none of them can produce
GBP 7,048 at ability 24 from the default multipliers**:

| rung | at ability 24 | why |
|---|---|---|
| 1 `staff.salary` | absent | not on a fresh pack payload |
| 2 anchored | skipped | `useInitFlow:350/:381` pass `undefined` |
| 3 `staff.weeklySalary` | absent | `buildStaffSnapshot` carries none; starter pack uses the same builder |
| 4 `tierStaffWeeklyWagePence` | ~GBP 3,132 | `asPlayer(24) x 0.6/0.5` |
| 5 `legacyStaffWagePence` | **GBP 24** | `coachingAbility * 100` pence |

**The most likely reading is now that rung 4 IS firing and the live `staffMultiplier` is simply
larger than the default** — which would make this a tuning value, not a bug.

⚠️ **One unchecked path remains:** `HireScreen.tsx:76` calls `resolveWorldStaffWagePence(staff)`
with **no `economy` argument**, so staff hired through that screen skip rung 4 and fall to
legacy's GBP 24. That is a real inconsistency regardless of the multipliers — but it produces
wages far too SMALL, not too large, so it is not the cause of what was measured.

## The one reading that settles it

**The live `wageMultiplierTiers` for this config** — admin economy screen, or
`php bin/console app:economy:wage-table`. If `staffMultiplier / playerMultiplier` is ~2.7 at
the low band, the system is doing exactly what it is told and the question becomes whether the
owner wants that ratio. If it is 1.2, there is a real defect and the rung analysis above says
it is not in the chain.

## 🟢 The structural half stands on its own, whatever the multipliers say

`StarterPackService.php:151-152` draws the founder's staff from the SQUAD's ability band — and
that band is the squad's **POTENTIAL**. A staff member has no current/potential split, so an
ability-24 coach is priced at 24 from day one, while an ability-24-POTENTIAL player is priced
on a current ability well below it. **Even at a ratio of 1.0 the staff bill would outweigh a
young squad's**, because the two sides are not the same quantity. That is a design question —
staff need a maturity curve, or the draw should target expected current ability — and it does
not depend on anything above.

## The curve SHAPE says rung 4 is not what priced these staff

Before reading the admin, the four device figures already constrain the answer.

`tierStaffWeeklyWagePence` is `playerWage(ability) x bandConstant`. **A multiplier cannot change
the shape of a curve** — so if that rung fired, the staff wages would have the player curve's
own exponent (`k = 2.5`, shown on the device's RESOLVED ECONOMY pane) and the staff/player ratio
would be **piecewise CONSTANT**, stepping only at a band boundary.

Neither holds:

| check | expected if rung 4 fired | observed |
|---|---|---|
| implied exponent | 2.5, the player curve | **~2.17-2.37**, flatter |
| ratio across the 25/26 band boundary | a STEP (default 1.2 -> 1.0, a 17% drop) | smooth drift, 2.70 -> 2.59, ~4% |

Default-band prediction, stated so it can be checked: `staff(24)/staff(27)` would be
`(p24 x 1.2)/(p27 x 1.0)` = **0.893**. Observed is `7048/9100` = **0.774**.

⚠️ **Four points, and a per-role base RANGE would add draw noise, so the exponent is indicative
rather than fitted.** The negative result is the robust part: **no step at the boundary, and a
flatter curve than the player ladder.** A band multiplier can produce neither.

🔴 **So the admin's multipliers probably will NOT explain the 2.7x** — whatever they read, a
multiplier cannot produce this shape. The likelier source is upstream, with an ability curve of
its own: `staffWages.ts:9-10` describes the backend's `StaffGenerationService` as *"a per-role
base range scaled by `wageMultiplierTiers[].staffMultiplier`, resolved on ability"* — a per-role
RANGE, which is a different shape by construction.

**That path is supposed to be closed** (it writes `staff.weekly_salary`, and
`buildStaffSnapshot` does not send it), so if it is what priced these staff, the question
becomes how they reached the device without going through the pack snapshot. **Still worth
reading the multipliers** — a ratio near 2.7 with no band step would overturn all of the above
in one look.

## 🔴 CONFIRMED — the live multipliers say staff should be CHEAPER than players

Owner read the admin, 2026-11-19. **The live `wageMultiplierTiers` is nothing like the PHP
defaults** — different boundaries and different values — which is exactly why the earlier
correction was needed. It makes the case stronger, not weaker.

| Tier | Max Ability (exclusive) | Player x | Staff x | staff/player |
|---|---|---|---|---|
| 1 | 15 | 4 | 2 | **0.500** |
| 2 | 25 | 6 | 4 | **0.667** |
| 3 | 40 | 15 | 8 | **0.533** |
| 4 | 60 | 30 | 12 | **0.400** |

`RAND MIN` 2000, `RAND MAX` 2800.

**Every row says a staff member costs LESS than a player of the same ability** — 0.40x to
0.67x. The device pays **2.6-2.9x**.

| ability | band | cfg ratio | player (authored) | expected | actual | over by |
|---|---|---|---|---|---|---|
| 15 | <25 | 0.667 | GBP 807 | GBP 538 | **GBP 2,366** | **4.40x** |
| 19 | <25 | 0.667 | GBP 1,457 | GBP 971 | **GBP 4,143** | **4.27x** |
| 24 | <25 | 0.667 | GBP 2,613 | GBP 1,742 | **GBP 7,048** | **4.05x** |
| 27 | <40 | 0.533 | GBP 3,507 | GBP 1,870 | **GBP 9,100** | **4.87x** |

## The band structure is invisible in the data, which is the proof

The over-factor sits at **4.05-4.40x across the whole `<25` band** and jumps to **4.87x** the
moment ability crosses into `<40`. That jump is the config's own 20% ratio step
(0.667 -> 0.533) **failing to appear in the wage** — if the multiplier were being applied, the
over-factor would be flat across the boundary and the WAGE would step down. It is the other way
round.

🔴 **So `tierStaffWeeklyWagePence` is not what prices these staff.** This is no longer an
inference from curve shape (recorded above, and it held): it is visible in the band arithmetic.

## Status

**A confirmed defect, not a tuning value.** Staff are paid roughly **4x what the live
configuration directs**, and the configuration's own ability bands have no effect on what they
are paid. ⚠️ **Where the figure DOES come from is still unknown** — all five rungs of
`resolveWorldStaffWagePence` were accounted for and none produces it.

⚠️ **One more thing the admin screen shows that is worth recording separately:** its formula is
`contractValue = currentAbility x rand(min,max) x playerMultiplier` — the LEGACY generation
formula. So `wageMultiplierTiers` is doing double duty: legacy `contractValue` generation on the
backend, and the staff/player ratio inside the turnover model on the device. One table, two
models, and the device reports `wage model: turnover`.

---

# Why SC t4's `slots` is not dynamic — it is deliberate, and the gap is elsewhere

**Owner, 2026-11-19:** *"'Fix the SC tier 4 slots to 12' why is this not happening
dynamically?"*

**It IS dynamic when `slots` is blank.** SC tiers 1-3 carry no `slots` and resolve correctly
from actual clubs — that is the `0 means derive` idiom, and the device CHECKS show those three
rows agreeing. Only t4 has an authored value, and it is stale.

## Why the field exists at all

`LeagueSizeResolver`'s own docblock (`src/Service/Economy/LeagueSizeResolver.php:20-52`) gives
three reasons, measured on dev 2026-11-12:

1. **A `club`-row count is meaningless server-side.** Player clubs live in the save, not on the
   server. Counting them would give England tier 8 a divisor of **148**.
2. **The NPC-rows+1 rule is right for 9 of 15 bootstrapped countries and wrong for 6**, because
   NPC counts are an artefact of how a country was bootstrapped
   (`BootstrapCountryCommand --clubs-per-tier` defaults to 8), not a declared size.
3. 🔴 **The fatal one:** *"a derived divisor moves whenever somebody clicks Generate.
   `League::$tvDeal` is a key shipped builds read, and deriving it from a live NPC count means
   adding two clubs to a tier silently re-prices that tier's TV money for every existing build…
   a backwards-compatibility break with no author."*

⚠️ **That third reason is in direct tension with the owner's own standing ruling** — *"there
should be no wiring around the amount of clubs, the finances should be dynamic"* (2026-11-19).
Both positions are defensible and **this is the owner's to settle, not something to quietly
resolve by blanking the field.**

## The actual gap: nothing revalidates `slots` when a ladder is rebuilt

Only **two** writers set it, and neither is a rebuild:

| writer | what it is |
|---|---|
| `LeagueAdminController.php:63` | the admin league form — blank/empty stores 0 |
| `LeagueImportExportService.php:260` | CSV / league import |

**So SC t4's 14 was typed or imported when that tier genuinely held 14 clubs, under the 8-tier
ladder.** Rebuilding Scotland to 4 tiers with 12 clubs changed the clubs and left the authored
number untouched, because **no rebuild path reads or clears `slots`.**

🔴 **This is not a Scotland problem and a one-off edit does not end it.** Any country whose
ladder is re-shaped keeps whatever `slots` it was last given, and the only thing that notices is
the device CHECKS screen after a save is built — i.e. after the wrong TV money has already been
paid.

## The three options, for the owner

1. **Blank SC t4 now** (one admin edit) and accept that it will recur on the next re-shape.
2. **Warn at the source** — have the rebuild / Generate path flag a `slots` that disagrees with
   the clubs it just created. Keeps reason 3 intact; makes the staleness loud instead of
   silent. **Smallest change that actually ends the class.**
3. **Retire `slots`** and derive everywhere, per the owner's ruling — which accepts reason 3's
   consequence: TV money moves under shipped builds when an operator adds clubs.
