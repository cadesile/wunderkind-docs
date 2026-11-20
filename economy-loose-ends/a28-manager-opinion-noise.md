<!-- STATUS: 📋 OWNER RULING, BRIEF READY, NOT STARTED (2026-11-20) -->

# A28 — the manager's opinion: add coaching ability at 70/30, and widen the noise

**Owner ruling, 2026-11-20:**

> *"I want to make the difference between the real ability and the manager's opinion of the
> player a little bit slightly more varied, so there's slightly more noise essentially… the
> manager's ability is tied to their judgment of a player's ability. Specifically, the field on
> the manager for scouting range… and also coaching ability with a 70-30 split, with 70 scouting
> range, 30 coaching ability, it should drive the accuracy. This is already implemented…"*

**Device evidence (Angus MacDonald, Moffat Vale, OTA 487):** raw current **21**, manager's
opinion **24** (+3). The scout's report on the same screen reads **21** — exact. Two different
systems; this brief is the manager one.

## ⚠️ Correction: the 70/30 is NOT implemented

```ts
export function deriveErrorMargin(scoutingRange, consistency, rand): number {
  const spread   = MAX_NOISE_SPREAD * (1 - clamp01(scoutingRange / 100));
  const variance = 1 - CONSISTENCY_TIGHTEN * normaliseConsistency(consistency);
  return (rand() - 0.5) * spread * variance;
}
```

| the owner's model | reality |
|---|---|
| scouting range drives accuracy | 🟢 **yes** — and it is the ONLY ability that does |
| coaching ability contributes 30% | 🔴 **no.** `coachingAbility` appears **nowhere** in the rating path — 0 occurrences in `PlayerRatingService.ts`, and the 2 in `playerRatingEngine.ts` are both comments |
| a 70/30 split exists | 🔴 **no such split exists** |

🟡 **What probably caused the belief:** there IS a split in this file, `MANAGER_WEIGHT = 0.60`
/ `FACILITY_WEIGHT = 0.40`, but it blends the **manager's read against the club's facility
read**, not two manager attributes. Easy to misremember as the 70/30.

Also live, and not in the owner's model: `consistency` (1–20) tightens the variance by up to
`CONSISTENCY_TIGHTEN = 0.5`, bond shifts the read by up to ±5 points, and morale below 50 drags
it pessimistic by `0.12` per point. **Confirm these stay** — the ruling does not mention them
and they are doing real work.

## 🔴 The trap: the manager and the scouts share ONE spread constant

```ts
import { MAX_NOISE_SPREAD } from '@/engine/scoutNoise';   // playerRatingEngine.ts:24
```

`MAX_NOISE_SPREAD = 20` is **the same constant for the manager's opinion and for every scout's
report.** Turning it up to widen the manager's noise would widen every scout's error band too.

⚠️ **And that fights A27 directly.** A27 fixes the dead age gate, which makes scouts *more*
accurate; A28 wants the manager *less* accurate. Driving both from one number means each change
silently undoes part of the other.

🟢 **So the first piece of work is to give the manager its own constant** —
`MAX_MANAGER_NOISE_SPREAD`, initialised to 20 so the change is a provable no-op — and only then
tune it. Do that before anything else in this brief.

## The change

**1. Accuracy from a 70/30 blend.**

```
managerAccuracy = 0.7 × scoutingRange + 0.3 × coachingAbility      // both 0–100
spread          = MAX_MANAGER_NOISE_SPREAD × (1 − managerAccuracy / 100)
```

⚠️ `deriveErrorMargin` is exported and unit-tested; changing its signature means updating every
caller and test. Take the blended figure as one argument rather than passing both abilities in,
so the formula lives in one named function that can be tested on its own.

**2. More noise.** Raise `MAX_MANAGER_NOISE_SPREAD` above 20. **Do not pick the number alone** —
put a table in front of the owner first, because the current band is narrower than it looks:

At scouting range `r`, error is `(rand − 0.5) × 20 × (1 − r/100) × variance`, and the manager
term then carries only **0.60** of the blend. So a manager on scouting range 50 with average
consistency contributes roughly **±2.2 rating points**, not ±10. **The +3 the owner saw is
already near the top of that range**, which is exactly why it reads as too tight.

Show what 30, 40 and 50 do to that figure, at two or three scouting ranges, before changing it.

## ⚠️ What "more noise" will and will not change

The star rating is **presentation only** — `PlayerStarRating.tsx` converts 0–100 to 1–5 stars,
and the design rule in `CLAUDE.md` is deliberate: *"the user is not meant to distinguish a
70-potential prospect from a 90 one."* So small extra noise may not move the star display at
all, while the number beside it moves. **Say which of the two the owner wants to see change** —
the brief assumes the number.

⚠️ `player_rating` is recomputed once per weekly tick and **persisted**. Widening the spread
makes the manager's opinion move more week to week, not just differ more from the truth. That
is probably wanted, but it is a second effect and the owner has not been asked about it.

## ✅ Third ruling, 2026-11-20 — the bond bias

> *"If the manager has a positive relationship with the player, let's use that to increase how
> highly the player is regarded… I think that weighting already exists, but let's increase it.
> Same in reverse. If the player and the manager have a bad relationship, the manager's
> perceived rating should be reduced greater."*

🟢 **This one DOES already exist**, unlike the 70/30:

```ts
export const MAX_BOND_BIAS = 5;
export function mapBondToBias(bond) {
  return (Math.max(-100, Math.min(100, bond)) / 100) * MAX_BOND_BIAS;
}
```

Bond runs −100…+100 and maps linearly to ±5 rating points, **symmetric**. It enters as
`manager = base + managerError + bias − penalty`.

⚠️ **It is damped the same way the noise is.** That ±5 carries only `MANAGER_WEIGHT` 0.60 into
the result, so the strongest possible relationship in the game moves the manager's opinion by
**±3 rating points** — about a third of a star. That is almost certainly why it does not read
as doing anything.

### 🔴 The caveat that could waste the whole change

The docblock on `mapBondToBias` states it, and it is load-bearing:

> *on a fresh save the manager has no bond with anyone (`BondSeedService` seeds a player's
> assigned coach, and **a manager is never an assignable coach**), so this term is silent until
> guardian events, promises, excursions or youth promotions start building the graph.*

**So on a young save the bias is 0 for every player, and raising `MAX_BOND_BIAS` changes
nothing at all.** Multiplying zero by a bigger number is still zero.

**Before tuning it, measure the bond distribution on the dev save** — how many of the owner's
players have a non-zero manager bond, and how large. If the answer is "none", the real work is
whether a manager should build bonds at all, which is a different and larger question than the
one asked. **Report that before changing the constant.**

### ❓ Symmetric or not — needs one word from the owner

*"reduced greater"* reads two ways, and they are different changes:

1. **Symmetric** — raise `MAX_BOND_BIAS`, so both directions grow equally. Simplest, and what
   *"same in reverse"* suggests.
2. **Asymmetric** — a negative bond bites harder than a positive one lifts, e.g. ±8 up and −12
   down. Defensible: a falling-out is usually more vivid than a good relationship, and it makes
   the mechanic feel sharper without inflating ratings across the squad.

My reading is **symmetric** (option 1), because *"same in reverse"* is the clearer half of the
sentence. **Ask before building** — it is one word and it changes the shape of the function.

## Guards

- `src/__tests__/engine/PlayerRatingService.test.ts` and the engine's own tests pin the current
  weights; the suite asserts `MANAGER_WEIGHT + FACILITY_WEIGHT === 1`.
- The draw order in `derivePerceivedRating` is **load-bearing** — manager first, facility second
  — because `makeRatingRandom(playerId, weekNumber)` is seeded. Adding a draw, or reordering,
  re-rolls every existing perceived rating.
- The perceived current/potential pair is blended with one shared error so the two stay
  coherent. Keep that.

## Verification

- App `npx tsc --noEmit`; `npm test` with the count confirmed. Baseline **648 / 10,816**,
  `--listTests` 648.
- **Step 1 (the new constant at 20) must be a byte-identical no-op** — prove it before tuning.
- A before/after table for a real squad, not a synthetic one: true current against perceived, at
  the current spread and the proposed one.

## Branch

App `new-game-save` — app-only, no backend half. ICM: read `.context/CONTEXT.md` first and
update `07_synthesis/output/game-mechanics.md`, which documents this model.

## Not established

- Whether consistency and morale stay as they are.
- Whether the bond bias is symmetric or asymmetric (above).
- **The bond distribution on the dev save** — the blocker for the bond half.
- The new spread value.
- Whether the owner wants the STAR display to move or only the number.
