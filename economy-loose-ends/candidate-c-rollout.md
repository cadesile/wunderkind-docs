<!-- STATUS --> **STATUS:** ✅ Candidate C rollout. COMPLETE — became R2.

---

# Candidate C — the authoring run (chosen 2026-11-18)

**What it is.** The re-derived coverage dials (`REMAINING-WORK.md` §2), entered as candidate **C**:
the steeper pyramid, with the bottom two divisions playing in small grounds and holding only the
facilities a bottom-division club plausibly has. Every tier lands at **97.5–97.6% COVERAGE**
against an 85–110% target, no tier insolvent over 30 seasons, and the variant gate **PASSes**.

**Nothing here is app code.** It is backend authoring plus a world regeneration. The app side of
the economy work is already shipped (OTA 480).

---

## ⚠️ STOP — C's turnover table fails the backend's own release gate

Found 2026-11-18 while writing `candidate-c-authoring-prompt.md`, which is where the decision and
the alternatives now live. **Read it before doing anything below.**

`app:economy:wage-table` **check 1** requires `S_tier` to be strictly decreasing down the pyramid
and **check 2** that no shared ability is paid more in the lower division. `S_tier` is derived from
the turnover row, so the turnover ladder and the ability bands jointly decide it — and candidate C's
ladder **fails at tiers 2, 6 and 8**, so the command exits non-zero and blocks the deploy:

| step | max turnover fall the bands allow (Σ ability^k ratio) | candidate C's step | verdict |
|---|---|---|---|
| 1 → 2 | 0.3453 | 0.3455 | fails by 0.06% |
| 5 → 6 | 0.3699 | 0.6006 | **fails** |
| 7 → 8 | 0.3162 | 0.6057 | **fails** |

**And no turnover ladder closes it.** The 85–110% coverage band and checks 1/2 cannot both hold
while the EN bands are `40-90 · 30-60 · 20-40 · 15-35 · 10-25 · 10-15 · 5-10 · 2-7`: they flatten at
the bottom far faster than the income the grounds produce. The checks are not the problem — tiers
5/6 overlap at 10–15 and 7/8 at 5–7, so check 2's "a promoted player takes a pay cut" would be real.

✅ **RESOLVED (owner, 2026-11-18): R2.** The brief to hand an engineer session is
**`r2-economy-authoring-brief.md`** — self-contained, R2's tables already substituted, and it says
the decision is closed. Use it rather than this doc or the prompt for the implementation.

Three resolutions, in the prompt with their numbers: **R1** re-author the bottom bands (tier 6 →
10–20, tier 8 → 4–9) and keep C's turnover — a squad-quality change that also moves staff pay
through `TierBandScaleResolver`; **R2 (recommended)** keep the bands and accept tiers 6 and 8 out of
band on the chain-maximal ladder below; **R3** lowering the wage-curve exponent — ruled out, it
cannot fix tier 7→8 even at k = 1.0.

**R2's ladder, verified (`dials/run.sh cand-c-gatesafe`): PASS, check 1 clean at every tier, no tier
insolvent once FLIPPED, tier-8 balance at season 30 +£810,727.**

| tier | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 |
|---|---|---|---|---|---|---|---|---|
| turnover | £331,000,000 | £114,000,000 | £34,600,000 | £20,700,000 | £7,320,000 | £2,690,000 | £686,000 | £215,000 |
| ×today | 0.85 | 0.95 | 0.97 | 1.04 | 1.04 | 1.15 | 1.18 | 1.30 |
| COVERAGE | 85.2% | 85.4% | 85.2% | 85.2% | 85.0% | **137.5%** | 85.0% | **162.1%** |

Six tiers in band against four today, tier 8 from 535% to 162%, and a far smaller authoring change
than C's (0.85–1.30× against 0.74–2.19×). The cost: the six in-band tiers sit at the 85% floor,
because every point of headroom they take comes out of tiers 6 and 8.

**Everything below is unchanged and still correct, EXCEPT step 1's and step 3's tables, which
depend on that decision.** Steps 2, 4, 5 and 6 hold either way, and step 4 is what makes the gate
pass on solvency in both.

---

## 0. Read this first — the one thing this plan cannot know

`GameConfig::$npcFacilityLevelRanges` is **backend-only and is not published to the app**, so the
exports this derivation ran against cannot say what is authored in it today. What the world export
*does* say is that it disagrees with the code's own defaults:

| tiers 7–8, per club | `NpcClubGenerationService::FACILITY_LEVELS` band 3 says | the Nov-15 world export measures |
|---|---|---|
| stands | `0–1` each → ~2.0 total | **4.89–5.05 total** |
| training pitch | `1–2` | exactly **1.00** at every club |
| physio clinic, club shop, scouting centre | `0–1` (`other`) | exactly **1.00** at every club |

Two explanations, and **the first step is to look at the NPC Clubs admin screen
(`/admin?routeName=admin_npc_clubs_content`) and find out which**:

- **Overrides are authored** per slug for band 3 (several at `1–1`, east/west higher). Then dial 3
  is an authoring edit, as written below.
- **NPC upgrade drift** — the explanation `game-mechanics.md` §13.3 already favours, since NPC
  clubs paid a flat £200,000 for any upgrade at any level until 2026-11-16 and now pay the
  player's price. Then the stand band needs **no edit at all** and dial 3 is just "regenerate",
  with the drift engine already switched off.

Both can be true at once. **Read the screen before editing it**, and write down what was there —
that figure is the one input to this derivation that nobody has.

---

## 1. The authoring, in order

### Step 1 — turnover (Economy admin, `/admin?routeName=admin_economy`, country EN)

`baselineTurnoverPounds`, one row per tier. This is the only money table that is typed in; the
rest of step 1 follows from it.

| tier | today | **candidate C** | ×today |
|---|---|---|---|
| 1 | £388,661,540 | **£288,000,000** | 0.74 |
| 2 | £120,049,757 | **£99,500,000** | 0.83 |
| 3 | £35,576,602 | **£30,100,000** | 0.85 |
| 4 | £19,909,009 | **£18,000,000** | 0.90 |
| 5 | £7,071,796 | **£6,360,000** | 0.90 |
| 6 | £2,339,899 | **£3,820,000** | 1.63 |
| 7 | £582,785 | **£596,000** | 1.02 |
| 8 | £164,852 | **£361,000** | 2.19 |

Spread tier 1 ÷ tier 8 goes 2,357× → **798×**.

### Step 2 — nothing, and that is the point

**`wageScaleMicroPence` is DERIVED, not authored.** `EconomyScaleResolver::wageScaleMicroPence()`
computes `S_tier = playerBudget / (weeksPerSeason × Σ ability^k)` from the turnover row, so step 1
moves it by exactly `T_new / T_old`. The youth scholarship anchor follows the average wage, so it
moves too. Staff pay does **not** — `TierBandScaleResolver` scales the role bands off the ability
ranges, not off turnover.

What the resolver will publish, so a mismatch is visible rather than inferred:

| tier | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 |
|---|---|---|---|---|---|---|---|---|
| today | 390404650 | 349216683 | 312374073 | 279418383 | 249939558 | 223570772 | 199984018 | 178885951 |
| **after step 1** | 289291653 | 289438820 | 264287736 | 252625879 | 224782444 | 364990262 | 204518776 | 391732150 |

⚠️ **Three warnings on the Economy screen are EXPECTED, and they are the real cost of this
candidate.** `EconomyAdminController::buildPreview()` warns when a tier's scale does not fall:
*"Tier 2 pays MORE per unit of ability than tier 1"*, and the same at **tier 6** and **tier 8**.
That is correct and deliberate — the new turnover ladder (798×) is far flatter than the ability
bands it is divided by (tier 1 spans 10–95, tier 8 spans 2–7), so the per-ability RATE inverts
while the wage itself does not. Average authored wage per player per week still falls
monotonically: **£144,482 · £56,427 · £18,696 · £11,739 · £4,366 · £2,768 · £432 · £277**.
The consequence to accept deliberately: **a promoted club's renewals get cheaper per unit of
ability.** The alternative is re-opening `league_ability_ranges`, which the backend has just
re-authored (`e9d81c2a`, gap-fill only, EN untouched) — out of scope here.

### Step 3 — the prize and position ladders (Economy admin)

The ppm ladder authored by `5dc3f51b` **is today's turnover ladder normalised to tier 1**, so
step 1 invalidates it. Re-derive both to the new ladder:

- `economy_league_prize_tier1_pence` = `economy_league_position_pot_tier1_pence` =
  **7410240000** (£74,102,400 = `0.2573 × £288,000,000`, down from £100,000,000)
- `economy_prize_tier_ratio_ppm` = `economy_position_pot_tier_ratio_ppm` =
  **`[1000000, 345486, 104514, 62500, 22083, 13264, 2069, 1253]`**

Which pays, per club: £74,102,400 · £25,601,342 · £7,744,738 · £4,631,400 · £1,636,403 ·
£982,894 · £153,318 · £92,850 — a flat 0.2573× of each tier's own turnover, which is the property
`5dc3f51b` exists to hold. Parts per million, not basis points, for the reason that commit gives:
tier 8 is 1,253 ppm = 12.5 bp.

### Step 4 — the bottom-tier ground and facility set (NPC Clubs admin)

Band **3 of `npcFacilityLevelRanges`, which is tiers 7 AND 8 together** —
`getBandIndexForTier()` keys on the absolute tier number (1–2, 3–4, 5–6, 7–8), so a country with
fewer than seven tiers is untouched by this, and a 7-tier country's tier 7 is included.

- **Stands** (`north_stand`, `south_stand`, `east_stand`, `west_stand`): `min 0, max 1`, which is
  already the code default — see §0 before editing. A 2,500-seat ground at `capacityCalculation`
  1250.
- **Excluded** (`min 0, max 0`, which `buildFacilities()` reads as "this band does not hold it"),
  nine slugs: `scouting_center`, `scout_fleet`, `imaging_suite`, `player_wellbeing`,
  `nutrition_centre`, `technical_zone`, `youth_academy`, `trial_pitch`, `car_park`.

That leaves a bottom-division club with **eight** facilities: four small stands, a training pitch,
a physio clinic, a club shop and a tactical room.

⚠️ **The override is keyed by BAND, not by tier, so the nine exclusions reach tier 7 as well.**
Candidate C was derived with six at tier 7 and nine at tier 8; it was then **re-solved in the
authorable form** (nine at both) and that is what the table in step 1 holds — tier 7 moves
£602,000 → £596,000, a 1% difference, and everything else is identical. Nothing needs a per-tier
override dimension.

⚠️ **This column has no country dimension either.** Band 3 is every 8-tier country's bottom two
divisions. That is almost certainly right — it is a statement about what a bottom-division club
is, not about England — but it is not an England-only edit, and the gate has only been run on EN.

### Step 5 — regenerate, bump, re-warm

Existing NPC clubs keep the facilities they already have, so step 4 reaches nothing until the
bottom two tiers are regenerated. Then `WORLD_PACK_VERSION` **9 → 10** (packs bake facilities,
wages, `tvDeal` and the payout figures) and `app:worldpack:maintain` restocks; the hourly sweep is
the backstop, not the plan.

⚠️ **A save already in progress keeps its own world.** Nothing here reaches a live save's NPC
grounds, and `club.personality.financialApproach` and the rest of the save-owned state stay the
save's (the BINDING rule in the app's `CLAUDE.md`).

### Step 6 — the gate, twice

1. **Backend:** `app:economy:wage-table` — five checks, exits non-zero. Check 6 is the one that
   matters here (`league.tv_deal` against turnover), since turnover moved and TV did not.
2. **App:** take a fresh `GET /api/game-config?country=EN`, `GET /api/starter-config` and a world
   export, then run the gate against them directly — no patching, because by then the authoring IS
   the input:

```bash
npx tsx scripts/economy/variantGate.ts --export game-config-en.LIVE.json --starter-config starter-config.LIVE.json --world world.json --country EN
```

**Pinned expectation.** Candidate C, verified 2026-11-18 by patching the Nov-15 exports
(`docs/economy-loose-ends/dials/run.sh`, run `cand-c-authorable`):

| tier | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 |
|---|---|---|---|---|---|---|---|---|
| COVERAGE | 97.6% | 97.5% | 97.5% | 97.6% | 97.5% | 97.6% | 97.5% | 97.6% |
| FLIPPED bill% | 64.9% | 72.0% | 68.7% | 72.9% | 75.1% | 81.2% | 81.3% | 91.9% |
| upkeep ÷ income | 4.9% | 12.0% | 8.7% | 12.9% | 15.1% | 21.2% | 21.3% | 32.4% |

plus `COVERAGE outside 85-110%: none`, a **flat 60.0%** AUTHORED wage share (⚠️ the "spread 3.2
points" this said was an APP bug, not a config property — see `r2-economy-authoring-brief.md`'s
correction; on a checkout with `b8ce310c` the spread is 0.0, and
on `dev` as it stands it is 3.2 with the 63.2% at tier 7 alone),
`insolvent once FLIPPED: none`, and `VARIANT GATE: PASS`. The three arms — AUTHORED,
MODELLED and FLIPPED — agree within about 2 points at every tier, which they have never done
before.

**A real run will not match this exactly**, and the differences are known rather than worrying: the
patched run holds the Nov-15 *drifted* grounds everywhere above tier 6, the fan base and ticket
ladder as exported, and `RESCALE` at 1.000×. **COVERAGE moving by a point is calibration; a tier
leaving the band, the 60.0% row going non-flat, or upkeep above ~35% of income at any tier is a
finding.**

---

## 2. What this does not do

- **It does not re-enable the pyramid distribution.** `PYRAMID_DISTRIBUTION_ENABLED` stays false,
  and its tax base is still unfiltered (`REMAINING-WORK.md` §4 Q4) — a blocker, not optional work.
- **It does not touch the sponsor ratios or TV**, deliberately: §2f says why, and chasing a flat
  sponsor share would price a bottom-tier club's sponsorship at £194k a year.
- **It does not answer whether the bottom tier should be this poor.** £361,000 is about the floor
  the upkeep curve allows: a plausible eight-facility ground costs £110k–£145k a season to run,
  and the tier factor is anchored at 1.0 at tier 8 on purpose, because `POST /api/club/fund`'s
  projection is read at FOUND CLUB. Going below that floor means `weeklyUpkeepBase` itself.
- **It is a day-one measurement.** The gate holds a ground fixed for 30 seasons, so it cannot show
  the grounds drifting back up now that NPCs pay the player's upgrade price. Re-measure a
  played-in world after several seasons — that is the only thing that confirms step 4 holds.
- **It cannot price the gameplay cost of step 4.** A bottom-division NPC club with no
  `youth_academy` has no youth intake, and none with a `scouting_center` changes how NPCs scout.
  Those are world-generation decisions, not economy ones, and they are the owner's call.
