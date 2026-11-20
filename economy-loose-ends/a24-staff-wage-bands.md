<!-- STATUS: 📋 RULED ON TWICE, DIAGNOSIS DONE, NOTHING BUILT. UNBLOCKED BY PART B (2026-11-20) -->

# A24 — Staff and scout salaries priced from the wage band

⚠️ **This brief was rewritten twice on 2026-11-20. Read the ruling block below, not the title
of any earlier version.** First reading (ability bands) was wrong and is parked at
`a25-staff-ability-bands.md`. Second reading recommended RETIRING the `Staff ×` column; the
owner's follow-up ruling **keeps it and makes it the rule**. The diagnosis in between stands —
it is what made the ruling precise.

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

## ✅ The owner's ruling (2026-11-20, second pass)

> *"In terms of the cost of staff and the expectations on salary, they should be using that wage
> band… to calculate the estimated salary based on the staff ability. This should all be the same
> for scouts as well. Scouts and staff should be essentially treated the same in terms of salary
> and signing."*

**The band table stays and becomes the pricing rule for staff AND scouts.** My earlier
recommendation — derive the ratio from `STAFF_WAGE_SHARE_BP` and retire the column — is
**overruled**. Recorded so it is not re-proposed.

Budget side: `part-b-resolved-budget-model.md`. Existing staff are committed from income;
**new** staff and scout salaries come from the DOF's pot. That resolution is what unblocks this
brief.

## 🔴 Scouts are a THIRD pricing system, and the ruling retires it

Not previously recorded. There are three ways a wage is priced today:

| | priced by | tier-aware? | shape |
|---|---|---|---|
| **Players** | `turnoverWeeklyPence` — the authored tier curve | ✅ yes | smooth `ability^k` |
| **Coaches** | `tierStaffWeeklyWagePence` — curve × band ratio | ✅ yes | smooth, with **3 cliffs** |
| **Scouts** | `fallbackScoutWeeklyWagePence` — `PoolConfig.scoutWageMin/Max` | 🔴 **NO** | flat straight line, £2,500–£7,000 |

A scout's wage is a linear interpolation on `experience` (0–100) across a **global** band. A
tier-1 scout and a tier-8 scout of the same experience cost **exactly the same**. Nothing about
the club, the country or the division enters it. The ruling ends that: scouts price like staff,
so they become tier-aware for the first time.

⚠️ **The site count is four, not one** — `useInitFlow.ts:457`, `market.ts:297`,
`StaffPoachingService.ts:252`, plus the backend's `ScoutWageCalculator`. The app mirror is
deliberately formula-identical to the backend so a backfilled scout and a generated one agree;
**that parity has to be kept or deliberately broken in the same change**, not quietly dropped.

⚠️ **`PoolConfig.scoutWageMin/Max` becomes dead admin config** once scouts price from the band.
Say so explicitly in the change — a live-looking admin field nothing reads is the defect class
this workstream exists to remove.

## ❓ The one thing to ask before building: which scout number drives the band

The band resolves on **ability**. Coaches have `coachingAbility`. Scouts have `experience`,
documented as 0–100 — the same scale, but **not the same quantity**. Three options:

1. **Feed `experience` into the band as-is.** Simplest; "scouts and staff treated the same"
   most literally. A 60-experience scout costs what a 60-ability coach costs.
2. **Give scouts an ability and price on that**, leaving experience as a scouting-effectiveness
   stat. Cleanest conceptually, biggest change.
3. **Map experience → an effective ability.** Avoids 2's schema work, adds a conversion nobody
   will remember exists — and this codebase already has a rule against exactly that shape
   ("potential is 0–100 in data, end to end. No conversion at any boundary").

My reading is **option 1**, because the ruling says *treated the same* and both are 0–100.
Option 3 I would argue against on the project's own stated rule.

## ⚠️ The cliffs become the owner's decision, not a defect to fix quietly

The three discontinuities above are a direct consequence of pricing from a band ladder, which is
now the ruling. **The codebase already states the principle they violate**, in
`staffWages.ts:46-50`, about scouts:

> deterministic and monotonic on purpose … a non-monotonic wage would make "hire the better
> scout" sometimes cheaper, which reads as a bug rather than a bargain

Under this ruling scouts move ONTO the ladder that is non-monotonic — so that comment's warning
becomes live for the role it was written about. **This is not a reason to overturn the ruling.**
It is a reason to put one question to the owner with real numbers: at ability 24 → 25 a coach
takes a ~20% pay cut for improving. Smoothing it needs only a monotonic staff ratio across the
four rows (e.g. 0.40 / 0.45 / 0.50 / 0.55) — **an admin edit, not a code change**, which is the
cheapest possible fix and keeps the owner's dial.

⚠️ Still arithmetic off the admin screen, **not measured on device.** Confirm on a real save
first — part B's snap may be masking it entirely today.

## Order of work

1. **Part B's budget move** — `anchorAmpStaffWages` out, DOF pot in. Without it this is a no-op.
2. **A24 pricing** — staff and scouts from the band.
3. **Part C** — the gate tests the DOF pot.

## Guards that will move

- `packWages.ts:176-187` argues the current derivation at length. **Rewrite it, don't delete
  it** — it records why the ratio was chosen.
- `staffWages.ts:20-56` — the scout docblock above, including the monotonicity claim.
- `src/__tests__/economy/packIsACensus.test.ts`.
- `grep -rn "tierStaffWeeklyWagePence\|fallbackScoutWeeklyWagePence" src/` before changing.

## Not yet established

- Whether the backend's `legacy` staff path still runs anywhere live.
- The three cliffs are arithmetic, not a device measurement.
- Whether the backend's `ScoutWageCalculator` moves in the same change or the app diverges
  first.

---

## 🔴 Carried forward from A26, 2026-11-20 — read before designing this

A26's scout `ability` work (backend `54525433`, `c05d54a7`; app `39b3c884`) landed the field
this task will price from. Three consequences:

### 1. 🟢 `ability` is now a true function of its inputs on every write

`ScoutAbilityLifecycleSubscriber` hooks **`prePersist` AND `preUpdate`**. A24 can price a wage
off `scout.ability` without caring how the row got there — generation, admin edit, import. The
`preUpdate` half exists because an admin can edit `experience`/`judgementsJson` while `ability`
is read-only, so without it an edit left the derived figure stale. **Under this task that would
have been a wrong wage.**

### 2. ⚠️ `weeklySalary` does NOT re-derive, deliberately — and THIS TASK IS WHERE THAT BREAKS

`Scout::$weeklySalary` is excluded from the subscriber because its admin help says it is *"set
by hand here only to override one scout"*. The distinction A26 drew, and it is the right one:

> **The test is whether a field is an OVERRIDE or a DERIVATION — not whether it happens to be
> derived at generation time.**

🔴 **A24 changes which side of that line `weeklySalary` sits on.** The moment a staff or scout
wage is priced from the band, the wage stops being an override and becomes a derivation. So this
task must decide, explicitly:

- does `weeklySalary` get the same `preUpdate` treatment `ability` just got, and
- does the admin help text stop promising an override?

**Leaving it as-is is a decision too, and a defensible one** (an operator may genuinely want to
pin one scout's wage) — but then the band is not the only source for a wage and this workstream's
governing defect is back. **Whichever way, say so in the change.** It has been written down at
the subscriber and in `services.md` so it is a decision rather than a discovery.

### 3. `app:backfill-scout-abilities --force` is now only for a formula change or raw-SQL rows

Ordinary edits re-derive themselves. If A24 retunes the 70/30 weighting, `--force` is the only
route — the migration is applied and cannot be re-run.
