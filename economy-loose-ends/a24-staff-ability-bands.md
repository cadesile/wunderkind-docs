<!-- STATUS: 📋 OWNER RULING RECORDED, NOT STARTED, READING NEEDS CONFIRMING (2026-11-20) -->

# A24 — Staff ability bands derived per country and tier, like players

**Owner ruling, 2026-11-20: *"I would like staff bands to be derived like players."***

⚠️ **My reading, to confirm before anyone builds it:** *bands* = **ABILITY bands, not wage
bands.** If the owner meant the wage multiplier bands, this brief is the wrong one — that is
part B in `scotland-experiment-2026-11-19.md`.

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

## Open questions for the owner

1. **Confirm "bands" = ability bands.** If it means wage bands, this is the wrong brief.
2. **Should the staff band EQUAL the player band for that tier, or be its own authored table?**
   Equal is simpler and is what the workaround already approximates; its own table is what
   "derived like players" most literally describes, and it is the only option that lets a tier's
   staff be better or worse than its players.
3. **Does the potential/current mismatch get fixed here or separately?** Even a correct per-tier
   staff band leaves a coach priced at face value against players priced below their potential.
