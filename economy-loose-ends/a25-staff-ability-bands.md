<!-- STATUS: 🟢 RULED 2026-11-20 — own per-country/per-tier table, vs player CURRENT ability. Work still parked behind A24. -->

# A25 — Staff ability bands are two flat globals (RULED, work parked behind A24)

⚠️ **This file was written as A24 against a WRONG reading of the owner's ruling.** Asked to
disambiguate, the owner pointed at the **WAGE MULTIPLIER TIERS** admin screen — so *"staff bands
derived like players"* meant the wage bands, and that brief is **`a24-staff-wage-bands.md`**.

**Kept, demoted to A25, because the asymmetry below is real and nobody has ruled on it.** It is
an observation awaiting a decision, not work anyone should start.

## The asymmetry, from source

| | where it lives | shape |
|---|---|---|
| **Players** | `StarterConfig::$leagueAbilityRanges` (`:247`) | **per COUNTRY, per TIER** — `['EN' => DEFAULT_TIER_RANGES, 'SC' => …]` |
| **Staff** | `PoolConfig::$coachAbilityMin` / `Max` (`:202`) | 🔴 **two flat global integers.** Default 40; 4-75 on dev |

**One pair of numbers for every country, every tier, in the whole game** — against a table that
is authored per country and per tier for players.

## And the existing workaround is the other half of the problem

`StarterPackService.php:151-152` sidesteps the flat global by passing the squad's band instead:

```php
// Same $abilityRange as the squad above — a founder's staff are at the founder's level.
$staff = $this->clubGenerator->generateStaff($squadConf, $nationality, $country, $tier, $abilityRange);
```

`StaffGenerationService:59-60` then uses it, falling back to the flat `coachAbilityMin/Max` only
when null. So a founder's staff are drawn from **the PLAYER band for that country and tier**.

🔴 **That band is the squad's POTENTIAL.** A player drawn at potential 24 currently performs far
below it and is priced on current ability; **a staff member has no current/potential split**, so
an ability-24 coach is a 24 from day one. The two sides of every staff-vs-player comparison are
therefore different quantities — the open item already recorded in
`scotland-experiment-2026-11-19.md`.

## What "derived like players" would mean

A staff ability band that is **per country and per tier**, resolved the way
`resolveAbilityRange(leagueAbilityRanges, country, tier)` resolves the player one — replacing
BOTH the flat global pair AND the borrow-the-player-band workaround.

⚠️ **This is not independent of part B.** `EconomyScaleResolver::wageScaleMicroPence()` sums
`ability^k` across a tier's authored band, so the band and the wage scale are one system: change
what band staff are drawn from and you change what the staff wage scale means. **Settle part B
first, or settle them together.** Do not land this alone and assume wages are unaffected.

## ✅ Owner ruling — 2026-11-20

Ruled by the owner after the live `pool_config` row was read. **Both limbs below are settled; do
not re-litigate them.** The work itself stays parked behind A24 — see §"Not independent of part B"
above, which is unchanged.

| question | ruling |
|---|---|
| 1. Does "bands" mean ability bands? | **Already answered before this ruling** — the owner pointed at the WAGE MULTIPLIER TIERS screen, which became `a24-staff-wage-bands.md`. A25 survives only as the ability-band asymmetry. Closed. |
| 2. Equal to the player band, or its own table? | 🟢 **Its own authored table** — per country, per tier, resolved the way `resolveAbilityRange(leagueAbilityRanges, country, tier)` resolves the player one. It replaces **both** the flat `coachAbilityMin/Max` globals **and** the borrow-the-player-band workaround at `StarterPackService.php:151-152`. |
| 3. Fixed here or separately? | 🟢 **Here, in the same change, against player CURRENT ABILITY.** Staff ability is defined as comparable to a player's current ability, not potential. A staff member has no development curve, so the number is what they deliver now. |

### Why its own table, and not the player band

The player band is **potential**. Staff have no current/potential split. Setting the two equal
therefore guarantees that a tier's staff read systematically stronger than the players they work
with, permanently — it bakes the asymmetry in rather than removing it. Its own table is also the
only option that lets a tier's staff be deliberately better or worse than its players.

### Why the quantity question is settled first, not after

Authoring a staff table while "staff ability 50" and "player ability 50" denote different
quantities means authoring against an undefined unit, and the table would be re-authored the moment
the unit was defined. The owner's standing constraint — *correctness before calibration* — puts the
unit first. **Define staff ability against player current ability, then author the band.**

### 🔴 What the live row says, and why the brief understated the problem

Read from `pool_config` on 2026-11-20 (`lando php bin/console dbal:run-sql`):

```
  coach_ability_min   coach_ability_max   coach_age_min   coach_age_max
  4                   75                  38              60
```

So the live global pair is **4–75**, confirming this brief's claim and contradicting the committed
entity defaults of **40–75** (`PoolConfig.php:202`, `:206`). **A fourth instance of the trap** —
after `bondDecayFloor`, `wageMultiplierTiers` and `incomeAnchoredWages`.

The consequence is worse than "one pair for every country and tier": the pair spans 4 to 75, so a
bottom-tier club can be handed a 75 coach and a top-tier club a 4. It is not a band, it is noise
with a range.

### ⚠️ Carried into A24 — the band ceiling

The live `wageMultiplierTiers` top out at **`maxAbility: 60`** (`staffMultiplier` 2/4/8/12 across
15/25/40/60), while `coach_ability_max` is **75**. A coach can therefore be generated above the top
of the band table that A24 is about to price staff wages from. **What the resolution code does with
an ability of 61–75 — clamp, fall through to zero, or throw — was under investigation when this
ruling was made; see `scout-wage-impact-report.md` and its band-ceiling follow-up.** Whoever builds
A25 must not author a band ceiling without knowing the answer.
