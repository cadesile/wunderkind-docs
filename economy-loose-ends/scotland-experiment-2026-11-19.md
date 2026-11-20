<!-- STATUS: 🟢 THE MAIN FINDINGS FILE for the 2026-11-19 Scotland experiment. Grew all session; read STATE-OF-PLAY-2026-11-20.md first for the summary. Contains: the starter-squad wage discrepancy (CLOSED, timing artefact), the ability-band fallback (CLOSED pending one backend-screen re-read), the sponsor pot (FIXED + DEPLOYED, and re-framed mid-session from mis-attribution to mis-sizing), the FUND YOUR CLUB flat GBP 12,000/wk stand-in (OPEN), the staff wage source (DIAGNOSED by A22, part A FIXED, parts B and C OPEN), the affordability gate (FIXED), and why slots was not dynamic (A23). ⚠️ Several claims in here were REFUTED later in the same file — always read to the end of a section before acting on its opening. -->

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

## ⚠️ TWO CORRECTIONS, from the world export (2026-11-19, 200 leagues / 3,175 clubs)

**1. "It IS dynamic when blank — SC tiers 1-3 prove it" was WRONG.**
**0 of 200 leagues have `slots = 0`.** Every league in the game carries an authored value.
SC t1-t3 read `slots —` on the device because **the app is only sent `slots` for the AMP's own
league** (`economyDiagnostics.ts:265-273` says exactly this) — a missing figure on screen, not
an unset field. Nothing in the live data demonstrates the derive path at all.

**2. "SC t4's 14 was typed when that tier genuinely held 14 clubs" was WRONG.**
`slots` is **14 at every Scottish tier**, and Scotland has **12 rows at t1-t7 and 11 at t8**. It
was never right for any tier. Not stale — never correct.

## What retiring `slots` actually does, measured

`sizeOf()`'s derivation is NPC rows, plus one at the country's bottom division (the reserved
player slot).

| | rows t1-t(n-1) | rows bottom | authored `slots` | derived | change |
|---|---|---|---|---|---|
| **EN** | 16 | 15 | 16 | **16** | 🟢 **none** |
| **SC** | 12 | 11 | 14 | **12** | 🔴 **14 -> 12 at EVERY tier** |

🟢 **England is unaffected.** The derivation reproduces the authored 16 exactly, at all eight
tiers, including the bottom tier's 15 + 1. The thing `LeagueSizeResolver`'s docblock warns about
does not bite in England, because England's authored figure already equals its real size.

🔴 **Scotland is wrong at every tier, not just t4.** Every Scottish division pays `pool/14` to
12 clubs: each club receives **16.7% less** than the pool intends, and **2/14 of every Scottish
TV pool is paid to nobody**. Retiring `slots` fixes all four live tiers at once.

**So within the owner's England-and-Scotland scope, retiring `slots` changes exactly one thing:
Scotland starts being paid correctly.** The backwards-compatibility objection has no victim
here.

⚠️ **It is NOT a no-op outside that scope** — the distribution across all 200 leagues is
{10, 14, 16, 18, 20}, and other countries have not been checked against their rows. Out of
scope, but it should not be discovered later as a surprise.

## The prohibition that has to be rewritten, not ignored

`EconomyWageTableCommand.php:408-416` states the opposite instruction in terms:

> *"`league.slots` is authored on purpose … and **it must never be 'fixed' by making `sizeOf()`
> prefer the row count**."*

**The owner has overridden this deliberately** (ruling 2026-11-19: *"Retire slots"*, following
*"there should be no wiring around the amount of clubs, the finances should be dynamic"*). The
comment must be rewritten to record the decision and why, **not** left contradicting the code —
this file is the one that explains the check to whoever next reads a disagreement.

---

# A22 — WHAT SETS THE FOUNDER'S STAFF WAGES: FOUND AND PINNED (2026-11-19)

**STATUS: CAUSE PROVED. No source changed in either repo. Fix proposed, not applied.**

## The answer

The writer is **not** any rung of `resolveWorldStaffWagePence` at ingest. It is a **later,
unconditional overwrite** on the save's first season budget:

```
src/engine/SeasonBudgetService.ts:455   bootstrapAmpSeasonBudget() -> anchorAmpStaffWages(budget)
src/engine/SeasonBudgetService.ts:481   anchorAmpStaffWages()
src/engine/SeasonBudgetService.ts:497     ampStaffWagePence(coach.coachingAbility, economy)
                                          -> updateCoach(coach.id, { salary: anchored })
src/engine/ClubWageScaleService.ts:176  ampStaffWagePence()
src/engine/ClubWageScaleService.ts:146  staffWagePence()
src/economy/clubBudget.ts:226           clubWageScaleMicroPence()   <- the figure is made here
```

`worldStaffToCoach` (`useInitFlow.ts:350`) does price staff on rung 4 at ingest, exactly as the
brief says. **`anchorAmpStaffWages` then throws that figure away.** Its own docblock says so in
terms — *"Snaps, where the season transition mean-reverts"* — and it runs on a brand-new save,
because a brand-new save is precisely the club with no budget that the bootstrap exists for.

The forward call-site audit missed it because it searched `resolveWorldStaffWagePence` call
sites, and this path never calls it. It calls `updateCoach` directly.

## What that function computes, and why it is 4x

`clubWageScaleMicroPence` is a **budget-exhausting solver, not a price**:

```
scale    = weeklyStaffBudget x UNIT / SIGMA        SIGMA = sum of ability^k over the shape
wage(a)  = scale x a^k / UNIT  =  weeklyStaffBudget x a^k / SIGMA
```

So the staff bill **is** the staff wage budget, by construction, distributed across the staff in
proportion to `ability^2.5`. The authored `wageMultiplierTiers` staff/player ratio
(0.40x-0.67x) plays **no part at all**. The staff are 4x the authored figure because the club's
income says they can be, not because anything priced them at 4x.

This is the governing defect of the workstream again, in its exact form: **two sources for one
quantity** — `tierStaffWeeklyWagePence` (authored relativity, rung 4) and
`ampStaffWagePence` (income-exhausting solver, rung 2) — with nothing saying which is
authoritative, and the second silently overwriting the first.

## The demonstration

Live config, `GET /api/game-config?country=SC` + `GET /api/starter-config`, fetched
2026-11-19: SC tier 4 `wageScaleMicroPence` 92,573,014 · `wageCurveExponentBp` 25000
(k = 2.5) · `wageScaleUnit` 1,000,000 · `reputationSpreadBp` 0 · `weeksPerSeason` 46 ·
`wageToTurnoverRatioBp` 6000 · `staffWageShareBp` 2500 · `wageModel` turnover.
`incomeAnchoredWages` is absent from the payload, so `economyConfig.ts:187` derives it as
**true** (`baseline.wageModel === 'turnover'`).

Starter counts confirm the path: `starterManagerCount` 1 + `starterCoachCount` 8 +
`starterDirectorOfFootballCount` 1 + `starterFacilityManagerCount` 1 + `starterChairmanCount` 1
= **12 non-scout staff**, + `starterScoutCount` **1** = the device's "12 coaches + 1 scout".

The model has exactly **one** free unknown: SIGMA, the sum of the 12 coaches' `ability^2.5`,
which only the device holds. So solve it from each measured wage independently. If this is the
writer, all four must give the same SIGMA.

Verbatim, a throwaway jest test run against the app's own `clubWageScaleMicroPence`,
`tierStaffWeeklyWagePence` and `weeklyWageRange` on `new-game-save` (file deleted after the
run; `git status` clean):

```
    reservationPence       = 1118287680
    staffWageBudget/season = 279571920
    staffWageBudget/week   = 6077650.434782608 => GBP 60776.50
    playerWageBudget/week  = 18232951.304347824
    ability 15: measured 236600p -> implied sigma = 21513.2
    ability 19: measured 414300p -> implied sigma = 21510.1
    ability 24: measured 704800p -> implied sigma = 21511.3
    ability 27: measured 910000p -> implied sigma = 21511.0
    mean sigma = 21511.4 spread = 3.1
    ability | measured | rung2 anchored | rung4 authored | player expected | rung5 legacy
    15 | 236600 | 236619 | 53780 | 80670 | 1500
    19 | 414300 | 414277 | 97113 | 145669 | 1900
    24 | 704800 | 704797 | 174149 | 261223 | 2400
    27 | 910000 | 909986 | 187022 | 350666 | 2700
```

**Four independent measurements across two multiplier bands agree on SIGMA to 3.1 parts in
21,511 — 0.014%.** Forward, the solver reproduces every measured wage to within 23 pence,
including the brief's unexplained **GBP 7,048 at ability 24: 704,797p against 704,800p
measured, a 3-pence miss.**

Two checks that the config read is right, not just self-consistent:

- **the player ladder falls out of the same config.** `weeklyWageRange` expected = 80,670 /
  145,669 / 261,223 / 350,666 pence against the screen's authored GBP 807 / 1,457 / ~2,613 /
  3,507. So the ladder on that screen *is* `turnoverWeeklyPence`, and the config in hand is the
  config the device used.
- **SIGMA 21,511 over 12 coaches implies a mean ability of ~20.0**, inside SC tier 4's authored
  `leagueAbilityRanges` band of 15-35. It is a plausible squad, not a fitted constant.

## Corrections to the brief

**1. The brief's rung-4 band arithmetic reached the right conclusion by the wrong route.**
"The over-factor would stay flat if the multiplier were applied" is not a valid test — a
*banded* multiplier applied to a *smooth* curve produces a step, so a step in the over-factor is
what rung 4 firing would look like. The reason rung 4 is not the writer is simpler and now
measured: rung 4 gives 174,149p at ability 24 and the device shows 704,800p. **Do not reuse
the band-arithmetic argument.**

**2. Rungs 1-5 were all correctly eliminated, and that was not enough.** The brief's elimination
table is sound. The figure comes from a path that does not go through that function.

**3. `HireScreen.tsx:76` is NOT a bug. Refuted.** `resolveWorldStaffWagePence(staff)` with no
`economy` cannot reach rung 5 there, because `worldStore.ts:585` writes `s.salary` on every
`WorldStaff` at world ingest, so rung 1 always wins. `generateNpcChairman`
(`npcManagerGeneration.ts:155-168`) sets `salary` explicitly for the one generator that would
otherwise fall through, and documents why. The missing argument is dead weight at that call
site, not a GBP 24/wk wage. **Nothing to fix.**

**4. "After the sponsor fix the bill stays at GBP 62,373, so the gate is 5.3x over" is wrong
for a NEW save.** The bill is a *function of* the income basis. Cut the income to GBP 3,638,128
and `anchorAmpStaffWages` writes staff wages about a fifth the size, and the bill lands back on
the share. The brief's 5.3x figure holds only for the **existing** save, whose salaries are
already persisted and are never re-anchored (the bootstrap runs once). That save is stuck; the
next one is not.

## The affordability gate

**The gate does NOT treat a renewal as a new hire. The brief's "likely real defect" is
refuted by the code.** `SignStaffPanel.tsx:138` passes `weeklySalaryPence: isRenewal ? 0 :
salary`, and `staffHireBudget.ts:66-68`'s own comment states the intent: *"a `renewal` is exempt
from the WAGE test — refusing to renew a contract the club is already paying would not reduce
the bill, it would only lose the person."*

**But the exemption does not work, and the reason is the finding above.** With the salary zeroed,
`staffHireRefusal` still evaluates
`after = max(0, currentWeeklyStaffWagePence) + 0 > weekly`, i.e. **it tests the club's whole
existing bill against the share.** Device: 62,373 > 60,776, so `'wages'`, so RENEW CONTRACT is
disabled. The exemption removes the delta but leaves the absolute test, which a renewal cannot
influence by any amount.

**And the bill can never be comfortably under the share, because the same solver writes both.**
Bill ≡ share, plus or minus two shape distortions in `ampStaffWagePence`:

- **self-double-counting** pushes the bill DOWN: the shape is `[...coachAbilities, ability]`, so
  a coach already in the store is counted twice in SIGMA when priced.
- **scouts excluded from the shape** pushes it UP: `ampStaffWagePence` builds SIGMA from
  `coachStore` only, so every scout's wage is added on top of a denominator that does not
  contain it.

Measured with the app's own solver over a synthetic 12-coach set (verbatim):

```
    coach bill WITHOUT self-double-count = 6077651 (= the share exactly, by construction)
    coach bill WITH self-double-count    = 5538903
    scout added on top, outside the shape = 368389
    staff BILL /wk  =  5907292 => GBP 59072.92
    staff SHARE /wk =  6077650 => GBP 60776.50
    bill / share    =  0.9720
```

The exact residual needs the 13 real abilities and only the device has them — my set gives
0.972x where the device measured 1.026x. **The point is the magnitude, not the sign: the bill
sits within a few percent of the share forever, so this gate is permanently on a knife edge and
will refuse on rounding.** That is the "third thing wrong" the brief asked to have identified
rather than assumed: it is not the 25% share being too small, nor 13 staff being too many. It is
that **the gate's budget and the wage bill it tests are computed from the same number**, so the
test is close to `x > x`.

Answers to the brief's four questions:

1. **Does it subtract the incumbent before testing a renewal?** It zeroes the *new* salary,
   which is equivalent and correct in intent. It then tests the absolute bill anyway, which
   defeats it.
2. **Same mistake for player renewals?** No. `staffHireRefusal` has exactly two callers,
   `SignStaffPanel.tsx:136` and `DofStaffHiringService.ts:102`. Player contracts do not use it.
3. **A renewal on LOWER terms?** Also refused. `isRenewal` discards the salary before the
   comparison, so a reduction is indistinguishable from a no-op and both fail the absolute test.
4. **Unrecoverable?** ⚠️ **Not strictly, and the inconsistency is its own defect.** DOF
   auto-renewal (`GameLoop.ts:5675-5757`, section 14c) tests **only the balance against the
   sign-on fee** — it never calls `staffHireRefusal`. So on the founder's club, which starts
   with `dofAutoRenewContracts: true`, the DOF renews staff the player is forbidden to renew.
   The player's own route back under the share is to let staff expire; the DOF's is not gated at
   all. The two paths were made to share one function for exactly this reason and only one of
   them does.

## Proposed fix — NOT APPLIED

Three separable changes. The first is the defect; the other two are consequences worth
recording.

**A. `staffHireRefusal` must test the DELTA on a renewal, not the absolute bill.**
`src/economy/staffHireBudget.ts:67-74`. Add an explicit `isRenewal` (or
`incumbentWeeklySalaryPence`) to `StaffHireInput` and skip the wage test outright for a renewal,
or test `currentBill - incumbentSalary + newSalary`. Zeroing the salary at the call site is not
enough and should stop being the mechanism — it reads as if it works. Give
`DofStaffHiringService` and section 14c the same function so the player and the DOF cannot
disagree about what is affordable.

**B. The staff wage source needs ONE authority named.** Either
`tierStaffWeeklyWagePence` prices staff and anchoring only mean-reverts toward it (the shape
players already have — `staffRenewalWagePence` exists and does this), or
`ampStaffWagePence` prices them and `tierStaffWeeklyWagePence` is retired. What must not
survive is `anchorAmpStaffWages` snapping over a freshly authored figure with no record of
which one is meant to be true. **Recommendation: keep rung 4 as the price and make anchoring
mean-revert, never snap** — it is the only option under which the authored
`wageMultiplierTiers` relativity means anything, and it is the owner's standing "correctness
before calibration" reading.

**C. Whatever B decides, the gate's budget and the bill must stop being the same number.**
While a budget-exhausting solver writes the wages, no share-based gate can say anything. This is
calibration and therefore the owner's call, so it is recorded and not proposed.

Two shape bugs in `ampStaffWagePence` (`ClubWageScaleService.ts:176-190`) fall out of B and
should be fixed with it whichever way it goes: the shape double-counts a member who is already
in `coachStore`, and it omits `scoutStore` entirely while scouts are paid from the same share.

## Housekeeping

- **No file changed in either repo by this task.** `wunderkind-app` `git status` clean on
  `new-game-save`. Two throwaway jest files were created under
  `src/__tests__/economy/` to run the figures above and were deleted; the output is quoted
  verbatim above.
- `wunderkind-backend` has three modified files
  (`EconomyWageTableCommand.php`, `Economy/LeagueSizeResolver.php`,
  `LeagueSizeResolverTest.php`) — **not mine.** That is the sibling `slots` session's work in
  progress, left untouched.
- Scratch and the two live config exports are in
  `/private/tmp/claude-501/-Users-courtneyadesile-Documents-WunderkindFactory/6fc3bf75-7117-4c9f-b028-fc8d14f19cbd/scratchpad/`
  (`cfg-sc.json`, `starter-config.json`, `prove-output.txt`, `prove2-output.txt`). Session
  scratch, so not durable — the figures that matter are quoted above.
- `POST /api/initialize/starter` is 401 without a token, so the staff payload was not read off
  the wire. It did not need to be: the backend source at `development` @ `9918839c`
  (`WorldPackSnapshotBuilder::buildStaffSnapshot`, `StarterPackService.php:156-158`) carries no
  `weeklySalary`, and the solver reproduces the device to 3 pence without it.

---

# A22 PART A — APPLIED (owner approved, 2026-11-19)

**App `new-game-save` @ `c73bf9a8`**, "A staff renewal is judged on the wage delta, not the bill
it is part of". Parts B and C remain proposed and untouched.

## What changed

| file | change |
|---|---|
| `src/economy/staffHireBudget.ts` | `StaffHireInput` gains `incumbentWeeklySalaryPence`; the wage test becomes `currentBill - incumbent + newSalary`, and a refusal now needs **two** conditions |
| `src/components/transfers/SignStaffPanel.tsx` | passes the real salary plus the incumbent's stored wage, instead of `isRenewal ? 0 : salary` |
| `src/engine/DofStaffHiringService.ts` | passes `incumbentWeeklySalaryPence: 0` explicitly — it only ever hires |
| `src/engine/GameLoop.ts` (section 14c) | the DOF's auto-renewal now calls `staffHireRefusal` instead of `club.balance < signOnFee` |
| `src/__tests__/economy/staffHireBudget.test.ts` | +9 tests (14 -> 23) |
| i18n | one new key, `message.gameLoop.body.dofStaffRenewalOverWageBudget`, merged with `--only ... --write` |

## The one design decision inside part A

A bare delta test is **not** sufficient, and this is the part worth remembering. With
`after = currentBill - incumbent + newSalary`, a renewal on the SAME terms gives
`after === currentBill`, which still fails a bare `after > weekly` on an over-allowance club —
the original defect moved rather than fixed. And a renewal on LOWER terms gives
`after < currentBill`, where refusing is perverse: the club is stopped from reducing the very
bill it is refused for.

So the rule is **`after > weekly && after > currentBill`** — a move is refused on wages only
when it both raises the bill and leaves it over the allowance. *You may not make it worse.*
Standing still and getting cheaper are always allowed; a renewal onto higher terms that breaks
the allowance is still refused, so this is not a blanket exemption.

**The mechanism deliberately stopped being "zero the salary at the call site".** That read as if
it worked and did not, and the comment above the old call site asserted in plain words that
renewals were "exempt from the WAGE test" — which was false for as long as it had existed. Both
the field and that comment now say the same thing.

## Player/DOF parity, and why it is pinned by a source read

Section 14c tested the **raw balance against the sign-on fee and nothing else** — no wage test
at all. So the DOF renewed staff the player was forbidden to renew, and charged the fee against
money `allocatableBalancePence` exists to ring-fence. All three paths — player
(`SignStaffPanel`), DOF hiring (`DofStaffHiringService`), DOF renewing (14c) — now call the one
function.

That is pinned by a **source-reading test**, on the same reasoning as
`dressingRoomLogic.test.ts`: there is no way to assert "these three paths ask the same question"
from their outputs, and the failure being guarded is a fourth caller quietly growing its own
affordability test — which is precisely how the panel's defect survived. ⚠️ Per that test's own
lesson, **a source-reading test protects exactly the files it names**, so a new staff-spend path
means adding it to that list in the same change.

Behaviour change worth noting: 14c's fee test is now **stricter**, against allocatable balance
rather than raw. That is the parity the owner approved, not a side effect.

## ⚠️ WHAT PART A DOES NOT FIX — stated plainly

**Renewals work. HIRING is still on the knife edge measured above, and for the same reason it
always was: the allowance and the bill are the same number.**

A hire's resulting bill always exceeds the current one, so the second condition is trivially
true and the hire test reduces to the `after > weekly` it has always been. On a new save
`anchorAmpStaffWages` distributes the entire staff share across the staff, so the bill sits
within a few percent of the allowance permanently and the gate is close to `x > x`. An
over-allowance club therefore still cannot hire, on a correctly-priced squad as much as on this
one.

**That is part C and it stays open.** It cannot be fixed by moving this gate; it needs part B's
decision about which source for a staff wage is authoritative. Both are the owner's to make and
neither was touched.

## Verification

- `npx tsc --noEmit` — **zero errors.**
- `npx tsx scripts/i18n/audit-tokens.ts` — **0 interpolation mismatches, 0 absent keys**, over
  3,777 call sites.
- `npx jest --listTests | wc -l` — **647**, equal to the baseline suite count.
- `npm test` — **647 suites, 10,797 passed, 3 skipped, 10,803 collected.** Baseline was
  10,788 passed; +9 is exactly this change's new tests, no suite added.
- ⚠️ **3 failures, and they are NOT this change.** All three are in
  `src/__tests__/economy/variantGate.test.ts`, on `homeGamesForLeague`, whose signature the
  sibling `a23-retire-slots` session changed in `src/economy/harness/worldExport.ts` while this
  work was in flight. That file and `scripts/economy/{variantGate,flows,dispersionGate}.ts` were
  uncommitted in the shared checkout and are **not in this commit** — the brief said to leave
  them alone, and the test they break is theirs to update. The four suites that cover this
  change (`staffHireBudget`, `spendGateArchitecture`, `seasonBudgetService`, plus the panel) run
  **63 passed, 0 failed**.
- `git status` after committing shows only the sibling's four files still modified.
