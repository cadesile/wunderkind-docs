<!-- STATUS --> **STATUS:** ✅ A10 — wage scale calibrated on real ability. Landed `68561f93`+`b82540d7`. ⚠️ COMMITTED, NOT PUSHED, NOT DEPLOYED.

---

# TASK — A10: calibrate the wage scale against ability players ACTUALLY have

**Backend only (`wunderkind-backend`), branch `development`, on top of `0e68d6ac`.** No app work —
the app consumes `wageScaleMicroPence` and needs no change (§2.3). **Commit; do not push.**

## 🟥 0. SCOPE AND STANDING RULES

**England and Scotland only** for all measurement and reporting (owner, 2026-11-19).

⚠️ **This task reprices every squad in the game.** It is the one change today that deliberately
moves authored economic output. Read §4 before touching anything: the acceptance criterion is a
*range*, and landing exactly on target is a reason for suspicion, not celebration.

## 1. Code state

`git fetch origin` with explicit refspecs; confirm `development` is at **`0e68d6ac`** and in sync.
Working tree clean, or stop and report. State branch, hash and date at the top of your report.

ICM: read `.context/CONTEXT.md` and the relevant stage's `output/` before raw source.

**Read before implementing:** `docs/economy-loose-ends/next-work-plan.md`'s section
**"OWNER DECISION 2026-11-19 — the wage curve is PARKED"** and its sub-section **"OWNER CHOSE (b)"**.
They carry the decision, the rejected alternative, and the scoping this brief implements. Do not
re-derive them.

---

## 2. The defect

`EconomyScaleResolver::wageScaleMicroPence()` computes

```
S_tier = playerBudget x WAGE_SCALE_UNIT / (weeks x sigma)
```

and a player's wage is then `S_tier × (CURRENT ability)^k`.

**But sigma is built from the wrong quantity.** `referenceSquadAbilitySum()` spreads the **authored
ability band** across the reference squad:

```php
$band = $this->abilityBand($country, $tier);
...
$sum += ((int) round($band['min'] + $span * $i / ($size - 1))) ** $k;
```

**The authored band is a POTENTIAL range.** Current ability is derived *below* it and grows toward
it with age — device-measured ratios run from 25% at 19 to 90% at 31.

**So the denominator is built from potentials and the numerator from current ability.** Both errors
push the same way: a larger sigma makes `S_tier` smaller, and a current ability below potential
makes the wage smaller again. Measured wage bills land at **~28–35%** of the budget they are
nominally calibrated against.

### 2.3 Why this is backend-only

The app's club-anchored scale (`src/economy/clubBudget.ts:241`) already sums
`input.squadAbilities` — the club's **real** current abilities. **The app is already doing it the
right way.** Only the backend's authored tier scale uses the potential band, and the app consumes
that value without recomputing it. ⚠️ **Confirm this for yourself and say so in your report** — if
you find any app-side mirror of the reference-band sum, stop and report rather than crossing repos.

---

## 3. The change — and nothing here needs inventing

**Every input already exists in the generator.** Reach them; do not copy their values into the
economy service (§3.4).

| input | where it already lives |
|---|---|
| maturation fraction by age | `PlayerGenerationService::buildAbilityTarget()` — ≤21: 0.30–0.60 · 22–25: 0.60–0.85 · ≥26: 0.85–1.00 · plus a 5% prodigy branch at 18–23 |
| a further age cap | `PoolConfig::abilityCeilingFractionForAge($age)` |
| the attribute→ability step | `PlayerGenerationService::buildAttributes()` — `cap = floor(abilityTarget × potential)`, six attributes drawn at position fractions, **ability = their mean** |
| squad ages | `PoolConfig::firstTeamAgeRange()`, as `WorldPackClubGenerationService:66` uses for NPC squads |
| squad size | `EconomyScaleResolver::referenceSquadSize($tier)` (already used) |
| the potential band | `abilityBand($country, $tier)` (already used) |

So:

```
expected current ability  =  potential  ×  abilityTarget(age)  ×  mean(position attribute fractions)
```

**Build the reference squad as today — potentials spread evenly across the band — then map each
member to its EXPECTED CURRENT ABILITY before raising it to `k`.**

### 3.1 🔴 The one genuinely open input: the squad's age profile

The reference squad has a **size** but **no ages**, and expected ability depends on age.

**Take the generator's own distribution** — `firstTeamAgeRange()` — rather than authoring a new one,
and spread ages across it the same way abilities are spread across the band. **State your choice and
its justification explicitly in the report.** If you conclude a different profile is better, say why
rather than substituting it silently.

⚠️ **The prodigy branch is a 5% random event.** A *deterministic* reference squad cannot contain a
random one. Either weight it (0.05 × the prodigy target + 0.95 × the normal one for ages 18–23) or
exclude it — **decide, justify, and say which.** Do not call `random_int` anywhere in this chain:
`S_tier` must be reproducible.

### 3.4 ⚠️ DO NOT COPY THE TABLES

If the age bands move, the scale must move with them. Reach the generator's values, or publish them
once and read them. **Copying the numbers into `EconomyScaleResolver` is how the two halves drifted
in the first place** and it is the specific failure this whole workstream exists to end. If reaching
them cleanly is awkward, **say so and propose where the shared source belongs** rather than
duplicating.

---

## 4. 🔴 ACCEPTANCE — a range, and exactness is a RED FLAG

**Expected effect:** if a realistic squad averages `abilityTarget ≈ 0.7`, sigma shrinks by
`0.7^2.5 ≈ 0.41`, so `S_tier` and every wage rise by roughly **2.4×**. Bills at 28–35% of budget
should land near **70–85%**.

⚠️ **The remaining gap is EXPECTED** — it is the attribute-fraction term, since the six attributes
are drawn *inside* the cap rather than at it.

⚠️ **If your implementation lands on ~100%, treat it as a defect and investigate before reporting
success.** That would suggest the reference squad was fitted to the target rather than derived from
the generator. **Report the measured ratio per tier for EN and SC and let it be whatever it is.**
Do not tune to hit a number — tuning the reference squad to a target is exactly the circularity this
replaces.

## 5. Verification

1. **`app:economy:wage-table` for EN and SC, before and after, pasted in full.** It MUST move
   substantially. Walk through what moved and confirm the direction and rough magnitude match §4.
2. **Full `vendor/bin/phpunit`.** Baseline is **three to five** failures per
   `.context/stages/01_overview/output/environment.md` — ⚠️ **NOT "~31", which is the gate's own
   failed-check count, not a test figure.** Attribute anything outside the documented list by
   **stashing and re-running**, never by reading the assertion.
3. **A test pinning `S_tier` against a hand-computed expected value** for one tier, so the chain is
   checkable by a human without running the generator.
4. **A test that `referenceSquadAbilitySum` is deterministic** — same inputs, same answer, no RNG.
5. **Report the per-tier wage ladder before and after** for EN and SC tier 8 and tier 1, so the
   owner can see what a real player's wage becomes.

⚠️ **Expect `AbilityRangeParityTest` and any wage-related gate check to move.** Read what each
asserts before concluding it is a regression — some pin the *old* calibration.

## 6. Reporting, scratch files and `.context`

⚠️ **Nothing scratch-shaped inside either repository.** Your report is
`/Users/courtneyadesile/Documents/WunderkindFactory/docs/economy-loose-ends/a10-wage-scale-report.md`.
Throwaway work goes in your own scratchpad. Paste commands and output **verbatim**.

**`.context` status and review are owned by the project-manager session.** Append **one** pass entry
to `shared/last-sync.md` and correct stage text your change makes wrong. Nothing else. Do not
restructure, prune or delete a superseded section: **flag it in your report.**

## 7. Do not

- Do not push. Do not deploy.
- **Do not change the authored ability bands, turnover, the wage-to-turnover ratio, the staff share,
  `k` (`wageCurveExponentBp`), or any sponsor/TV/payout figure.** You are changing *what sigma is
  computed over* and nothing else.
- **Do not tune the reference squad to hit a coverage or budget target** (§4).
- **Do not change `WORLD_PACK_VERSION`.** This is not a pack-shape change.
- **Do not work in `wunderkind-app`.**
- Do not use RNG anywhere in the scale chain (§3.1).

Before you commit, list `docs/economy-loose-ends/` for any `*-correction.md` or `*-addition.md`
newer than this brief.
