<!-- STATUS: 📋 OWNER RULING RECORDED + DIAGNOSIS DONE, NOTHING BUILT (2026-11-20) -->

# A24 — Staff wages derived like players', not from the band ladder

**Owner ruling, 2026-11-20: *"I would like staff bands to be derived like players"*** — asked
whether that meant ability bands or wage bands, the owner pointed at the **WAGE MULTIPLIER
TIERS** admin screen. So this is about `wageMultiplierTiers[].staffMultiplier`.

(The ability-band asymmetry I first wrote this brief against is a different, real thing. It is
parked at `a25-staff-ability-bands.md` and nobody has ruled on it.)

## The live table, from the owner's screenshot

| Tier | Max Ability (exclusive) | Player × | Staff × | **staff/player ratio** |
|---|---|---|---|---|
| 1 | 15 | 4 | 2 | **0.500** |
| 2 | 25 | 6 | 4 | **0.667** |
| 3 | 40 | 15 | 8 | **0.533** |
| 4 | 60 | 30 | 12 | **0.400** |

`contractValueRandMin/Max` = 2000 / 2800. These are the dev values, not `GameConfig.php`'s
committed defaults — the defaults are 0.5/1.0/2.5/5.0 against 0.6/1.0/2.0/4.0, a different
table entirely. **Read the live config, never the entity's defaults.** (I got this wrong once
already this workstream.)

## 🔴 The finding: under `turnover`, these bands are dead for players and live for staff

Verified in both repos.

| | player path | staff path |
|---|---|---|
| **Backend, `turnover`** | authored tier curve — `wageScaleMicroPence × ability^k` | `staffBudgetPerWeekPence()` — a share of turnover (`WageModelResolver:541`) |
| **Backend, `legacy`** | `multipliersFor()['player']` | `multipliersFor()['staff']` (`:277`) |
| **App, `turnover`** | `turnoverWeeklyPence()` — the same curve; `legacyMultiplier()` is **never called** | 🔴 `tierStaffWeeklyWagePence()` **multiplies by `staffMultiplier / playerMultiplier`** (`packWages.ts:205-209`) |

**So `tierStaffWeeklyWagePence` is the only consumer of the band ladder left on the turnover
path in either repository.** Everywhere else the ladder is vestigial legacy. A staff wage is the
tier's player curve with a stepped authored ratio bolted on; a player wage is the curve alone.
That IS the asymmetry the owner is pointing at, stated precisely.

⚠️ The ratio is also **not monotonic and mostly falling** — 0.500 → 0.667 → 0.533 → 0.400. Since
`asPlayer` rises smoothly with `ability^k`, one ability point across a boundary swamps it:

- **ability 14 → 15**: ratio 0.500 → 0.667, a **+33% raise** for one point
- **ability 24 → 25**: ratio 0.667 → 0.533, a **−20% pay cut** for getting better
- **ability 39 → 40**: ratio 0.533 → 0.400, a **−25% pay cut** for getting better

Arithmetic from the live values above, not measured on device — **worth confirming on a real
save before it is quoted as a defect**, because the snap in part B may be masking it entirely
(see below). Players have no such cliffs anywhere on the curve.

## ⚠️ This cannot be built before part B, and the reason is specific

Part B (`scotland-experiment-2026-11-19.md`) is *which source is authoritative for a staff
wage*. Today `SeasonBudgetService:456` `anchorAmpStaffWages()` **overwrites every AMP staff
salary** from a budget-exhausting solver at season boundaries — A22 reproduced it to 3 pence.

`tierStaffWeeklyWagePence` is rung **4** of the five-rung chain in `staffWages.ts:110-114`, and
rung 1 is `staff.salary`, which that snap writes. **So for the AMP's own staff the band ratio is
overwritten before anyone sees it.** Changing rung 4 alone would move NPC staff wages and the
first-week AMP figure and then be erased at the first season transition.

**Order: part B first (does the snap go, and which pot pays), then A24.** Building A24 first
would produce a change that measures as a no-op on the screen the owner is looking at.

## What "derived like players" would mean concretely

Two shapes, and this is a design decision, not a reading of the code:

1. **Ratio from the budget share, not from an authored column.** `STAFF_WAGE_SHARE_BP` (25%)
   already states what fraction of the wage bill is staff, and the backend's turnover path
   already prices staff from it. Deriving the app's rung the same way makes the two agree and
   retires the staff column outright. `packWages.ts:176-187` already argues the ratio lands at
   ~23% against that 25% — so this is close to a no-op on the mid band *by construction*, and
   removes the three cliffs.
2. **Keep an authored staff relativity, but as one smooth factor rather than a band ladder.**
   Preserves the owner's ability to say "staff are worth 0.5 of a player" without introducing
   discontinuities.

Shape 1 is what "derived like players" most literally describes and is the one I would take.
Shape 2 is the smaller change and keeps a dial the owner currently has.

**Either way the `Staff ×` column stops being read on the turnover path, so say in the change
whether the admin column is being retired or left for `legacy` only** — leaving a live-looking
admin field that nothing reads is the exact defect class this workstream exists to remove.

## Guards that will move

- `packWages.ts`'s own docblock (`:176-187`) argues the current derivation at length. Rewrite
  it, don't delete it — it records why the ratio was chosen.
- `src/__tests__/economy/packIsACensus.test.ts` pins device-side pricing.
- Anything asserting `tierStaffWeeklyWagePence` output. Check before changing:
  `grep -rn "tierStaffWeeklyWagePence" src/`

## Not yet established

- Whether the backend's `legacy` staff path still runs anywhere live, which decides if the
  column can be deleted rather than just unread.
- The three cliffs above are arithmetic, not a device measurement.
