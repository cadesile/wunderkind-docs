# Economy overhaul — combined backend + frontend review

**Written 2026-11-13, after both halves were implemented.** Reviews
`wunderkind-backend` `development` @ `0486bab1` against `wunderkind-app` `new-game-save` @
`09d89a54` (14 commits, unpushed), and recommends the tweaks needed before the model is flipped.

Companions: `01-backend-work-completed.md`, `03-frontend-work-completed.md`.

---

## The verdict in one table

The app's release gate (`npx tsx scripts/economy/gate.ts`) runs 30 seasons of the complete
economy and **exits 1**. Total cost as a share of turnover, England, dev-authored table:

| scenario | tier 6 | tier 7 | tier 8 |
|---|---|---|---|
| **As measured today** | 92.7% ✅ | **108.5% ❌** | **138.9% ❌** |
| After re-deriving the calibration (§1) | 76.0% ✅ | 91.4% ✅ | **121.8% ❌** |
| After also fixing `west_stand` (§2) — **worse, not better** | 77.8% ✅ | 96.2% ✅ | **133.1% ❌** |

**Re-deriving the calibration fixes tier 7. Nothing fixes tier 8 except raising its turnover or
scaling its upkeep** (§3). Tiers 1–5 are comfortable throughout (63.7% → 78.2%).

> ⚠️ **§2 was a hypothesis and checking it reversed the answer.** An earlier draft of this
> document suggested the stand upkeep anomaly might rescue the bottom of the pyramid. It was
> checked against the live dev API and does the opposite — the correct value is the *higher* one,
> so fixing it removes a hidden subsidy rather than granting one. The table above is the
> corrected version.

---

## 1. ⚠️ The two halves of the published calibration do not match each other

**This is the highest-value fix and it unblocks tier 7 on its own.**

The wage figures in `docs/economy-threshold-review.md` were measured against a development clone
whose tier-1 squad is **33**. The turnover table in `docs/deploy/economy-rollout.md` was derived
against dev's own **26**. The runbook says so itself — *"dev's tier-1 squad is 26 against a
development clone's 33, which alone pushed the top earner 27% over target"* — and the arithmetic
confirms it:

```
tier 1: review bill £4,818,700/wk × 46 = £221,660,200
        against rollout turnover        £388,661,540  = 57%
        against the configured target                   45%
        57 / 45                                       = 1.27
```

So **every wage figure currently quoted is about 27% high relative to the turnover table beside
it.** The app applies no correction — inventing one would be inventing a measurement — but it
means no absolute level in either document can be trusted until both halves come from one run.

**Recommended:** re-run `app:economy:wage-table` against the *current* dev config and re-issue
both tables from that single run, replacing the figures in both documents. Until then, treat
every percentage in this review and in the gate as ±27% on the wage half.

---

## 2. ✅ CONFIRMED on live dev: `west_stand`'s upkeep is a data error — and fixing it costs money

Checked against `GET https://api.dev.buildmyclub.co.uk/api/game-config` (HTTP 200, 22 facility
templates), **not** the app's pre-sync mirror. The live values:

| stand | baseCost | **weeklyUpkeepBase** | matchdayIncome | upkeep ÷ cost |
|---|---|---|---|---|
| north_stand | 25,000,000 | 30,000 | 1,000,000 | 0.00120 |
| east_stand | 19,000,000 | 30,000 | 1,000,000 | 0.00158 |
| south_stand | 25,000,000 | 30,000 | 500,000 | 0.00120 |
| **west_stand** | 19,000,000 | **3,000** | 1,000,000 | **0.00016** |

**It is an error, and the catalogue proves it.** Across all 22 facilities the upkeep-to-cost
ratio runs 0.00120 → 0.00818, median 0.00287. `west_stand` sits at **0.00016 — the lowest in the
catalogue by 7.5×**, against a next-lowest of 0.00120. It is also `east_stand`'s twin in every
other field: same `baseCost` (19,000,000), same `maxLevel`, same `matchdayIncome`. A missing
zero.

**The intended value is 30,000.** The app's mirror is accurate here, so no re-sync is needed.

### ⚠️ But fixing it makes the bottom of the pyramid WORSE

This document's earlier draft had it the other way round. Correcting `west_stand` removes a
hidden subsidy that three-quarters of a small club's stand upkeep was quietly enjoying:

| | tier 6 | tier 7 | tier 8 |
|---|---|---|---|
| `west_stand = 3,000` (today) | 76.0% ✅ | 91.4% ✅ | 121.8% ❌ |
| `west_stand = 30,000` (correct) | 77.8% ✅ | **96.2%** ✅ | **133.1%** ❌ |

So it is still worth fixing — a 10× error on a live catalogue row is worth fixing on its own
terms — but **it is not a route to solvency, and tier 7 gets uncomfortably tight (96.2%) when it
lands.** Sequence it with §3 rather than before it.

## 3. `weeklyUpkeepBase` is the last unscaled absolute in the economy

Independent of §2, and the structural version of the same point.

The wage share swings **1.5×** across the pyramid (54.5% → 80.3%); the upkeep share swings
**5.5×** (9.2% → 58.6%). Wages are doing exactly what the turnover model designed them to do.
Upkeep is a flat pence figure with no tier term at all — precisely the class your own
`economy-threshold-review.md` identifies as decoupling the moment a country factor or the wage
model moves. It is in that document's "reviewed and deliberately left alone" list, scoped out
because facilities "pay real account credit".

That scoping was right for `base_cost`. It does not hold for `weekly_upkeep_base`, which is a
recurring operating cost measured against turnover, not a purchase.

The app now applies a tier factor of its own (1.0 at the bottom tier, rising up the pyramid), but
it cannot scale *downward* without breaking §4.

**This is now the PRIMARY fix, not a fallback** — §2 turned out to make the problem worse, and
§1 does not reach tier 8.

With the calibration re-derived AND `west_stand` corrected, tier 8 needs one of:

- **turnover raised ~33%**, £164,852 → about **£219,400** a season; or
- **upkeep scaled to ~0.53×** at tier 8.

**Recommended, in preference order:**
1. **Raise the bottom tiers' authored turnover.** It is one number on a screen you already have,
   it needs no code, and it is the figure the whole wage ladder is derived from — so it is the
   lever with the fewest downstream surprises.
2. **A backend tier factor on `weekly_upkeep_base`**, if the turnover figures are considered
   correct as authored. It would duplicate the app's factor and the two would need keeping in
   step, which is why it is second.
3. Do **not** solve it by lowering wages: the wage share is already doing what the turnover model
   designed it to do, and it is the half that is internally consistent.

---

## 4. `POST /api/club/fund`'s projection will under-read once the model flips

You aligned that projection to `base × 1.5^level` to match the app. The app's upkeep now carries
a tier factor, **anchored at 1.0 at the bottom tier specifically so FOUND CLUB stays exact** —
the projection is read in the bottom division, by a player committing real account credit.

Above the bottom tier the two diverge by that factor (up to 3× at tier 1). It does not affect
FOUND CLUB today. It will matter if the projection is ever reused for an existing club.

**Recommended:** no change now; note it on the endpoint so it is not discovered later.

---

## 5. Publish `bankruptcyDeductionWeeks` — the app will read it

Your `economy-threshold-review.md` §1 asks what the app does with overlapping rows. **Answered:
first-match-wins, in array order**, exactly as the column docblock documents. So on the live
five-row table **rows 4 and 5 can never fire** — any deficit ≥ 500,001p matches row 3 first and
the harshest reachable penalty is 10 points.

The app has implemented your own recommendation — a weeks-of-wages ladder with non-overlapping
bounds — as an **app constant**, because you declined to publish the key until the shape was
agreed. The shape is now agreed and shipping:

```json
[{ "weeksMin": 1,  "weeksMax": 2,    "points": 3  },
 { "weeksMin": 2,  "weeksMax": 4,    "points": 6  },
 { "weeksMin": 4,  "weeksMax": 8,    "points": 10 },
 { "weeksMin": 8,  "weeksMax": 16,   "points": 20 },
 { "weeksMin": 16, "weeksMax": null, "points": 50 }]
```

**Recommended:** publish it on the `gameConfig` block. The app will switch to reading it with no
behaviour change, and the ladder becomes tunable without an app release — which is the whole
argument for the rest of that block. `bankruptcyDeductionTiers` stays for `legacy`.

---

## 6. Decide the reference squad sizes

`S_tier` is calibrated so a *reference squad* costs the configured share. The app fields squads
from `npcSquadConfig` — **0.69–0.79 of your reference squad at every tier**:

| | t1 | t2 | t3 | t4 | t5 | t6 | t7 | t8 |
|---|---|---|---|---|---|---|---|---|
| your reference | 33 | 30 | 28 | 26 | 26 | 26 | 23 | 22 |
| app's actual | 26 | 23 | 21 | 20 | 19 | 18 | 17 | 17 |

Realized player-wage share runs 40.9% (tier 1) to 60.2% (tier 8) against a 45% target. Per the
owner, **`npcSquadConfig` is not to change**.

**Recommended:** recalibrate the reference squad toward the app's real sizes, in the same pass as
§1. Doing both at once is cheaper than doing either twice.

---

## 7. Smaller items

| # | Item | Action |
|---|---|---|
| 7.1 | **`matchdayFoodUptakePercent` 40 → 35 already changed live behaviour** — a 12.5% food-income cut from a backend deploy, with no app release and nothing announcing it | Accepted; app default now 35. **Treat every `gameConfig` money key as a live dial with no release gate.** The app logs changes but does not block them |
| 7.2 | **NPC clubs have no condition state and no proactiveness**, so decision 8's "decay faster when an NPC club's proactiveness is low" is unbuildable | App-side follow-up; needs new NPC state. Not blocking |
| 7.3 | **Seven of eight legacy per-tier wage averages are inferred** in the app's harness fixture — only tier 8's £480/wk is stated in your docs | Confirm from a live `GET /api/game-config`; the gate's legacy arm depends on them |
| 7.4 | **`sponsorWeeklyPence` defaults to 0** and the setup overlay strips `undefined` but not `0` | Handled app-side behind a `> 0` guard. Flagging because the same trap applies to any future zero-defaulted money key |
| 7.5 | **`tvDeal` re-authored on dev** (tier 1 £500M → £136M) with cached packs potentially stale | App checks `tvPoolPence / clubCount` against `tvDeal` and **reports** a disagreement rather than picking one. Watch for those warnings after a pack rebuild |

---

## 8. What the gate already proves

Not everything is a finding. Under `turnover`, with the complete economy:

- **Tiers 1–6 are solvent across 30 seasons**, 63.7% → 95.5% of turnover.
- **The legacy failure is still reproduced** (tiers 4–8 insolvent), so the gate is measuring the
  real game rather than a model of it.
- **Flipping `wageModel` at season 10 causes no cascade** — no previously-solvent tier goes
  under. The same for a +20% wage-scale change, except at tier 6, which is the marginality above
  seen from another angle.
- **The inflation index is monotonic and non-retroactive**, and a 10% inflation spell bankrupts
  nobody in tiers 1–6.

---

## 9. Recommended order

1. **Re-derive both calibration halves from one `app:economy:wage-table` run** (§1), and settle
   the reference squad sizes in the same pass (§6).
2. **Raise the bottom tiers' authored turnover** (§3) — tier 8 by roughly a third. This is the
   only lever that reaches tier 8.
3. **Fix `west_stand.weekly_upkeep_base` to 30,000** (§2) — confirmed on dev, and worth doing on
   its own terms, but it makes tiers 7–8 tighter so it belongs after step 2. **Re-run the app's
   gate** afterwards.
4. **Publish `bankruptcyDeductionWeeks`** (§5) — independent, can land any time.
5. Then flip `economyWageModel`, per your own runbook (bump `WORLD_PACK_VERSION`, warm packs,
   watch `staleWorldPacks` reach 0).

**Nothing in this list is an app code change.** The app side is complete and green; what remains
is authored data and one published key.
