<!-- STATUS --> **STATUS:** ✅ R2 closeout. COMPLETE 2026-11-18.

---

# R2 close-out — step 1 of the gate run (2026-11-18)

Started closing R2 against dev's own data. **Two of the three gate inputs are refreshed and R2 is
verified live; the third needs an admin export, so the gate has not been run.**

## Deploys

| | run | SHA | result |
|---|---|---|---|
| backend `dev` | Deploy Development **276** (`44396354747`) | `459dac4b` | ✅ success — `Version20261118120000` ran |
| app `dev` | OTA **481** (`44396373794`) | `94236541` | ✅ success |

## Inputs refreshed

`game-config-en.LIVE.json` (32,348 bytes) and `starter-config.LIVE.json` (9,346 bytes), both
`HTTP 200` from `api.dev.buildmyclub.co.uk` — public endpoints, no token. The 15 November copies are
kept in `pre-r2-exports/` beside this file, because every figure quoted in `REMAINING-WORK.md` §2
was measured against them.

## ✅ R2 is live, and the derivation's prediction holds to the integer

The first confirmation of any of this against real data rather than a patched export:

| tier | published turnover | = R2 | published `wageScaleMicroPence` | = predicted |
|---|---|---|---|---|
| 1 | 33100000000 | yes | 332484503 | yes |
| 2 | 11400000000 | yes | 331618346 | yes |
| 3 | 3460000000 | yes | 303799192 | yes |
| 4 | 2070000000 | yes | 290519761 | yes |
| 5 | 732000000 | yes | 258711870 | yes |
| 6 | 269000000 | yes | 257021938 | yes |
| 7 | 68600000 | yes | 235402484 | yes |
| 8 | 21500000 | yes | 233303081 | yes |

**Strictly decreasing at every tier**, which is the invariant `app:economy:wage-table`'s check 1
owns and the reason R2 exists rather than candidate C. The wage scale was predicted by arithmetic
on 2026-11-18 and pinned by a unit test against a stubbed squad row; the live resolver now
publishes those same eight integers.

`wageModel` is `turnover`, so `incomeAnchoredWages` still derives ON.

## Two things moved that no one authored, both expected

- **`youthScholarshipPence`: `150000, 53508, 17368, 9849, 3875, 2500, 2500, 2500` →
  `150000, 59663, 19834, 12024, 4710, 2500, 2500, 2500`.** Nobody touched it: the anchor follows
  the average wage, which follows turnover, exactly as the brief said it would. Worth recording
  that **the floor binds at tiers 6–8** — all three sit on `economyYouthScholarshipFloorPence`
  (£25.00), so the ladder has no range left at the bottom and a further turnover change would not
  move them.
- **Ticket prices and sponsor bands are byte-identical**, as designed — R2 deliberately re-derived
  neither.

## ⚠️ One observation to settle, and it is not R2's

**Scotland's ability bands changed between the two exports**, and `leaguePlayerAbilityRanges` is
the only other published key that moved:

```
SC then: 4 tiers — 75-95 / 65-85 / 55-75 / 45-65
SC now : 8 tiers — 40-90 / 30-60 / 20-40 / 15-35 / 10-25 / 10-15 / 5-10 / 2-7
```

✅ **SETTLED: the owner rebuilt Scotland from scratch** (2026-11-18). So this is the first of the
two explanations below and `syncToPyramid()`'s gap-fill property is intact — the re-basing of tiers
1–4 is the destructive-pruning path `e9d81c2a` documents in as many words: *"hand-tuned figures for
a tier that is removed and later re-added come back as the defaults."* Nothing to fix; the lesson
is that **"gap-fill, never overwrite" holds per tier that survives, not per country that is
rebuilt.**

Gaining tiers 5–8 is that same sync doing what it was written for — SC was authored at four tiers
against an eight-tier pyramid. The two explanations considered were: SC's leagues were rebuilt
(correct), or an operator re-authored the bands by hand (not what happened).

Three consequences, since **SC is the shallow comparison country `app:economy:wage-table` prints
beside EN**:

- its `S_tier` column is now computed on EN's band shape rather than its old compressed one, which
  makes the two countries comparable for the first time — SC takes the same baseline turnover
  ladder (every `economy_factor_bp` is at parity), so check 1 should behave there as it does on EN;
- its rebuilt `league` rows carry NULL prize and position columns, which is the designed state:
  `LeaguePayoutResolver` reads NULL as inherit, so they resolve from the ppm ladder;
- ⚠️ **whether the rebuild ran before or after Deploy 276 decides which facility set its new clubs
  got.** If after, SC's tiers 7–8 already hold band 3's eight-facility, 2,500-seat ground — which
  makes SC a free preview of the regenerated bottom tier, readable straight off the fresh world
  export (`--country SC`). If before, they hold the old 5.0 stand levels like EN's.

EN is untouched either way, so nothing in R2's derivation moves.

## The 21:48 world export — measured, and it answers "do I need to rebuild the teams?"

`wunderkind-world-2026-11-18.json`, `exportedAt 2026-11-18T21:48:38+00:00`, 3,175 clubs across 200
leagues, installed as `world.json` (the 15 November copy is kept as
`pre-r2-exports/world.NOV15.json`).

**YES — the teams have to be rebuilt. The cache rebuild cannot do it.** Band 3 is read by
`NpcClubGenerationService::buildFacilities()` at CLUB GENERATION; a pack is a snapshot of whatever
a club already holds, so `app:worldpack:warm` / `maintain` re-photographs the old ground faithfully.
Measured on this export:

| | EN t7 | EN t8 | SC t7 | SC t8 |
|---|---|---|---|---|
| mean total stand levels | 5.00 | 4.87 | 4.75 | 5.00 |
| seats at cc 1250 | 6,250 | 6,083 | 5,938 | 6,250 |
| facility keys | 17 | 17 | 17 | 17 |

Band 3 would give **2.0 stand levels (2,500 seats) and eight facilities**. Every one of those four
divisions is still pre-migration, **Scotland included** — so the SC rebuild also predates
Deploy 276, and SC is not the free preview it might have been.

**EN's club rows went 20 → 16 per tier** (19 → 15 at tier 8) while the world total barely moved
(3,183 → 3,175, with SC gaining tiers 5–8), which looks like a spoof purge rather than a
regeneration — and a regeneration is what band 3 needs. ⚠️ It also matters to the gate
independently: `homeGames` is the export's own `clubCount`, so a 16-club division prices ~20% less
matchday than the 20-club rows every pinned figure was measured against. Expect COVERAGE to come
in below the pinned table for that reason alone, at every tier.

## ⚠️ NEW BLOCKER — the world export no longer carries the payout figures at all

Prize and position money read **£0 at all eight tiers** in this export, where the 15 November one
had £100,000,000 down to £5,000,000:

```
EN prize:  t1 £100,000,000 -> £0     ...     t8 £5,000,000 -> £0
EN pot:    t1 £100,000,000 -> £0     ...     t8 £2,000,000 -> £0
```

**This is R2 working as designed, not a defect in the authoring.** `Version20261118120000` NULLed
the per-league columns so they inherit from the ppm ladder, exactly as `5dc3f51b` intended — and
the admin export serialises the **raw column**, not the resolved figure. `tvDeal` is unaffected
(£136,000,000 at tier 1, so RESCALE will still read 1.000) because it is a stored absolute.

The consequence is structural: `leagueFinancials()` reads `prizeMoney ?? 0`, so **the gate would
now credit zero prize and zero position money at every tier**, and no amount of re-exporting fixes
it. Four ways out, in the order I would take them:

1. **Patch the resolved figures in for the measurement** — they are deterministic and fully known
   (base £85,166,300 × the ppm ladder: £85,166,300 · £29,332,211 · £8,902,604 · £5,326,130 ·
   £1,883,453 · £692,147 · £176,550 · £55,358), and `dials/patch.mjs` already does exactly this.
   It gets R2 measured today, with the payout line stated as resolver-derived rather than
   export-read.
2. **Make the admin export emit RESOLVED payouts** through `LeaguePayoutResolver` — a small backend
   change, and the one that stops this biting every future gate run. Worth doing regardless of 1.
3. **Publish them**, which the gate's own docblock already names as the real fix: *"a fresh
   authenticated GET /api/initialize/leagues removes the need for it entirely."*
4. Teach the gate to resolve them itself — **not possible today**: the ppm ladder and both tier-1
   bases are not published to the app (verified against this export).

## ⚠️ STOP-THE-LINE — the division size moved 20 → 16, and R2 was solved at 20

Run while the regeneration was in progress, to make the eventual comparison decidable: the live
config + the 21:48 export, with band 3's grounds and the resolved payouts patched in — i.e. **what
the post-regeneration gate run should produce**
(`dials/run.sh predicted-post-regen`). It produces **COVERAGE outside 85–110% at ALL EIGHT
TIERS**:

| tier | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 |
|---|---|---|---|---|---|---|---|---|
| R2 as designed (20-club rows) | 85.2% | 85.4% | 85.2% | 85.2% | 85.0% | 137.5% | 85.0% | 162.1% |
| predicted now (16-club rows) | **83.1%** | **80.5%** | **79.7%** | **78.9%** | **74.1%** | 116.2% | **76.1%** | 136.4% |

Every tier's matchday line is down about 20%, and nothing else moved: tier 1 10.8% → 8.7%, tier 5
45.7% → 34.7%, tier 8 122.3% → 96.5%. **The cause is the club count**, which the Nov-15 export had
at 20 per tier and this one has at 16.

**And it is a real economic change, not a measurement artefact.** `League::$slots` ships as **0,
which means "derive"**, and `LeagueSizeResolver::sizeOf()` then returns the live NPC club count
(+1 at the bottom tier). So the division size — and with it the gate's `homeGames`, every club's
matchday, and the per-club divisor in the backend's own check 8 — **follows however many club rows
exist**. A spoof purge therefore re-prices every division in the world, silently, with no economy
change authored anywhere.

R2's turnover ladder was solved against 20. At 16 it is roughly 17–20% too rich at every tier
except 6 and 8.

**The decision this forces, and it is the owner's:**

1. **Is 16 the intended division size?** If the four clubs per tier that went were spoof rows, then
   16 is the truth and **R2's dial-1 solve has to be re-run at 16** — same formula, same method,
   new `F` values; turnover comes DOWN at six tiers. That is an hour's work and one more
   authoring pass, not a re-derivation from scratch.
2. **Or should the divisions be restored to 20?** Then R2 stands exactly as authored and the
   regeneration simply needs to produce the intended count.
3. **Either way — author `League::$slots` instead of leaving it to derive.** The field exists for
   this and its own docblock says 0 means derive; leaving it derived is what let a club purge
   move the whole economy. Authoring it per league is the difference between "the divisor is a
   decision" and "the divisor is whatever the club table happens to hold today".

⚠️ **Do not read the post-regeneration run as a verdict on R2 until this is settled.** The run will
show six tiers under the floor, and the reason will be the club count rather than the authoring.

## The real run — 22:00 export, regenerated world: ⚠️ VARIANT GATE: FAIL

`dials/run.sh real-2200`, against the live config and the 22:00 export, **with only the payout line
patched** (the export cannot carry it — see the blocker above). Grounds, club counts, turnover, wage
scale, sponsor bands and TV are all real.

✅ **The regeneration worked.** Band 3 is live in the world: EN tier 7 is 2.06 stand levels and
**8 facility keys**, tier 8 is 1.27 and 8; SC tier 7 is 1.71 and 8, tier 8 is 2.31 and 8. Before the
rebuild all four were ~5.0 levels and 17 keys.

| tier | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 |
|---|---|---|---|---|---|---|---|---|
| COVERAGE | 83.1% | 81.0% | 80.4% | 78.0% | 74.2% | 119.4% | 77.1% | **105.4%** |
| FLIPPED bill% | 64.1% | 69.8% | 69.3% | 73.5% | 76.7% | 84.1% | 83.3% | **102.6%** |
| s1 balance | +£98.7m | +£27.9m | +£8.5m | +£4.3m | +£1.3m | +£510k | +£88k | **−£5,973** |

**Tier 8 is insolvent in season 1 and generates a rescue.** Seven tiers are outside the coverage
band. Two input-level causes compound, and **neither is the authoring**:

1. **The 16-club divisions** cut matchday ~20% at every tier (the stop-the-line item above).
2. **Tier 8's stand draw came in light: 1.27 total levels, 1,583 seats, against the 2.0 / 2,500 the
   band's midpoint implies.** Band 3 rolls `random_int(0, 1)` per stand, so 2.0 is the MEAN of 60
   draws across 15 clubs, not a floor.

### The finding worth keeping, independent of which way the club count goes

**Coverage in band and solvency are different questions, and tier 8 now demonstrates it: 105.4%
coverage — the only tier INSIDE the band — while insolvent at 102.6% of income.** Coverage has no
upkeep term. Upkeep is what breaks it: ~£96,500 a season against £226,568 of income is **42.6%**,
against the 32.2% the derivation assumed at an income of £348k.

And the mechanism generalises: **upkeep does not fall with a light stand draw, but income does.** A
band whose MEAN leaves the bottom tier at 32% upkeep leaves it at 43% on an unlucky roll, and the
difference is the division's solvency. **Dial 3 has to be sized on the worst plausible draw, not
the mean** — the derivation treated 2.0 as if it were deterministic, and that was wrong in kind,
not just in degree.

### What each option now implies

- **Restore the divisions to 20** — matchday rises ~25%, tier-8 income goes to roughly £262k and
  upkeep to ~37%, so the bill lands near 97%: solvent, but thin, and it fixes the six tiers under
  the floor at the same time. One action, both problems.
- **Keep 16** — then dial 1 must be re-solved at 16 AND tier-8 upkeep has to come down (two or
  three more facilities, or a stand floor rather than a 0–1 band), because at 16 clubs the bottom
  tier has no solvency headroom at all.

Either way, **author `League::$slots`**, and consider making band 3's stands `1–1` rather than
`0–1` so the bottom tier's ground stops being a coin flip per stand.

## What is left to close R2

1. **`world.json` — the admin's World → Export** (`admin_world_export`), which needs a signed-in
   session rather than curl, saved to the app repo root. **It is mandatory, not a nicety:** the
   payout ladder is NOT published to the app (confirmed — no `prize`, `positionPot` or `Ppm` key
   appears in the game-config export), so the gate reads prize and position money from
   `world.json` and nowhere else.
2. **Confirmation that tiers 7–8 were regenerated before that export is taken.** Band 3 reaches no
   existing NPC club until then, so an export taken first carries the old 4.89 stand levels and
   every bottom-tier figure in the run would describe the world R2 replaced.
3. Then the gate run itself, against the pinned table in `r2-economy-authoring-brief.md` §5, and
   `app:economy:wage-table` on the dev box — the backend check that could never be run on the local
   Lando box.

⚠️ **Running the gate with the current `world.json` would be worse than not running it.** That file
is from 15 November: it carries the pre-`5dc3f51b` prize ladder (£5,000,000 at tier 8 against
R2's £92,850) and the pre-regeneration grounds, so it would measure the new turnover against the
old world and the numbers would look like findings.
