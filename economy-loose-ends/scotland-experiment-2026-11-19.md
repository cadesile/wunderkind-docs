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
