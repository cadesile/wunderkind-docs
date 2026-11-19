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
