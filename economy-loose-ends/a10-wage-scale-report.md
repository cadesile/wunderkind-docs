<!-- STATUS --> **STATUS:** ✅ A10. ⚠️ COMMITTED, NOT DEPLOYED. ⚠️ Its §0.1 corrected the brief’s formula — read that before trusting any earlier write-up of this chain.

---

# A10 — the wage scale is calibrated against the ability players ACTUALLY have

**Backend only (`wunderkind-backend`), branch `development`, commit `68561f93` on top of
`0e68d6ac`. Committed, NOT pushed. 2026-11-19.**

```
$ git log --oneline -1
0e68d6ac Add the second npc_club composition flake to the test baseline, and strike "~31"
$ git rev-parse HEAD origin/development
0e68d6ac19ef643d59c38c37f7d8e68a526488de
0e68d6ac19ef643d59c38c37f7d8e68a526488de
$ git status --porcelain
(clean)
```

Working tree was clean and in sync with `origin/development` before the change.

**Evidence, verbatim, outside both repos:** `a10-run-2026-11-19/` beside this report —
`gate-before.txt`, `gate-after.txt`, `measure-coverage.txt`, `measure-ladders.txt`,
`measure-generator-truth.txt`, `measure-model-comparison.txt`, `suite-batches/`.

**`*-correction.md` / `*-addition.md` newer than my brief: none.** `a4-premise-correction.md`
(10:25) and `a3-tvdeal-addition.md` (10:35) both predate the brief (16:20). The two files that
*are* newer are `agent-standing-notes.md` (acted on, §9) and `a12-npc-budget-report.md`
(app-side NPC budgets — no overlap).

---

## 0. 🔴 READ THIS FIRST — THREE THINGS IN THE BRIEF ARE WRONG, AND ONE OF THEM MATTERS A LOT

### 0.1 ⚠️ The brief's formula is NOT the generator's, and implementing it literally overshoots by 1.3–2.5×

The brief and `next-work-plan.md` both give the chain as

```
expected current ability  =  potential × abilityTarget(age) × mean(position attribute fractions)
```

and predict it will land bills at **70–85%** of budget, the residual being "the attribute-fraction
term, since the six attributes are drawn inside the cap rather than at it".

**That describes three of the six attributes.** `PlayerGenerationService::buildAttributes()` draws
`pace`, `technical` and `vision` inside the cap at the position fractions — but `power`, `stamina`
and `heart` are **not drawn from the cap at all**. They are computed from height, weight and the
personality matrix, scaled to 100, and then merely *capped*:

```php
$power   = min($cap, max(1, (int) ceil(($physBase * 0.6 + $physMod * 0.4) * 100)));
$stamina = min($cap, max(1, (int) ceil(($stamPhys * 0.5 + $stamMod * 0.5) * 100)));
$heart   = min($cap, max(1, (int) round(($bp->loyalty + $bp->determination + $bp->pressure) / 60.0 * 100)));
```

Measured on the live config, those three land at **54 / 53 / 61** regardless of potential, so for
every tier below about ability 50 they sit **at the cap**, not at a position fraction of it. Three
of six attributes at 1.00 rather than at ~0.57 is not a detail: it is the difference between an
expected ability of 53% of potential and one of 33%.

**Both models implemented and measured** (`measure-model-comparison.txt`), coverage = a real
generated squad's season bill as a share of the tier's authored player budget:

| | EN T1 | EN T4 | EN T8 | SC T1 | SC T4 | SC T8 |
|---|---|---|---|---|---|---|
| **today (band = potentials)** | 24.7% | 30.7% | 32.1% | 20.9% | 29.1% | 32.3% |
| **(A) the brief's formula, literally** | **152.4%** | **189.6%** | **197.7%** | **128.8%** | **179.3%** | **199.0%** |
| **(B) the generator, faithfully — SHIPPED** | 96.3% | 100.3% | 129.7% | 97.3% | 93.9% | 106.8% |

Across all sixteen tiers: today **20.9–34.8%**, model A **128.8–214.4%**, model B **93.6–129.7%**.

So the brief's own §4 red flag — "if you land on ~100%, suspect you fitted the squad to the
target" — is pointed at the wrong model. Implementing the brief literally does not land near 100%;
it lands at **1.3× to 2.1× over budget**, which would bankrupt every club in the game. **I
implemented (B) and I did not tune anything.** §4 argues why ~100% is the derived answer here and
not a symptom of fitting.

### 0.2 ⚠️ It is NOT quite backend-only — there is an app-side mirror of the reference-band sum

§2.3's claim about the shipped runtime is **true and I confirmed it**:
`wunderkind-app/src/economy/clubBudget.ts:226–253` (`clubWageScaleMicroPence`) sums
`input.squadAbilities` — the club's real current abilities — and the device otherwise consumes
`wageScaleMicroPence` without recomputing it. Nothing in the running game needs changing.

**But there is a mirror, and the brief told me to stop and report rather than cross repos, so I
did both — reported it, and did not touch the app.** `wunderkind-app/src/economy/harness/loadExport.ts:89–93`:

```ts
/** Evenly spaced INTEGER abilities across a band, matching the backend's reference squad. */
function referenceSquad(band: { min: number; max: number }, size: number): number[] {
  if (size <= 1) return [Math.round((band.min + band.max) / 2)];
  const span = band.max - band.min;
  return Array.from({ length: size }, (_, i) => Math.round(band.min + (span * i) / (size - 1)));
}
```

Three consequences, all app-side follow-ups (§8):

1. The comment "matching the backend's reference squad" is now **false**.
2. `turnoverAvgWeeklyPence`, built by pricing that squad, is now a figure the backend does not
   define.
3. The invariant that file documents as proof of its floor-vs-round reading —
   *"`wageScaleMicroPence × SUM(ability^k) / turnoverPence` is the resolver's own formula
   rearranged and must be constant across tiers. Floored it is 9782.608696 at all eight"* — **will
   stop being constant.** That constant is `UNIT × wageRatio × (1 − staffShare) / weeks`, and it
   only holds while `SUM` runs over the same abilities the resolver divided by. It now becomes
   `9782.608696 × σ_old/σ_new`, and σ_old/σ_new runs 3.18–4.66 across the tiers (§3.2). **Anything
   asserting 9782.608696 will go red, and it is right to.**

I did not work in `wunderkind-app`. Nothing in it was edited, and `git -C wunderkind-app status`
is untouched by me.

### 0.3 ⚠️ The gate's "bill % turnover" column was never the 28–35% figure

The brief implies the gate shows the shortfall. It does not. `app:economy:wage-table`'s check 4
priced its **own** copy of the reference squad and compared it to the budget, so it read **45.0% at
every tier before and after** — 45% being `wageToTurnover 60% × (1 − staffShare 25%)` by
construction. The 28–35% figure is a *device* measurement of real squads and the gate cannot see
it. §9 specifies the on-device check that makes it visible permanently.

### 0.4 One scoping note, not a disagreement

`next-work-plan.md`'s OWNER CHOSE (b) section ends: *"Do not start it before Scotland's 12-vs-14 is
settled."* A11 is running that diagnosis **now**, concurrently with me, and my brief tasked me to
start. I flag it rather than second-guessing it: **this change does not depend on division size.**
`S_tier` is `playerBudget / (weeks × σ)`, and neither `baselineTurnoverPence` nor σ reads
`league.slots` or a club count. Division size reaches TV and payouts, not the wage scale. The
figures in this report would not move if Scotland turned out to be 12, 14 or 16. ⚠️ The usual
caveat still applies: this box's clone reads **SC slots = 3** (see the gate's own size table), so
every SC *TV and payout* line in both gate dumps is on 3 clubs and is not a verdict — the `S_tier`
and wage lines are unaffected.

---

## 1. What changed

Five source files, one new test support class, three new tests, two stale assertions corrected.

| file | what |
|---|---|
| `src/Service/PlayerGenerationService.php` | **the new source of truth.** Maturation bands lifted out of `buildAbilityTarget()`'s if/elseif into `ABILITY_TARGET_BANDS`, physique draw bounds into consts, and the three personality-driven attributes into `powerFor()` / `staminaFor()` / `heartFor()` — each now called by **both** the random path and the new deterministic one. New public `expectedAbilityTargetForAge()` and `expectedCurrentAbility(potential, age, position)`. |
| `src/Service/Personality/PersonalityGeneratorService.php` | new public `expectedTraits(PersonalityContext)`: the matrix this context produces on average, mould-weighted, pushed through the **real** `applyCorrelations()` and the context's floors. No RNG. |
| `src/Service/Economy/EconomyScaleResolver.php` | `referenceSquadAbilitySum()` now sums expected **current** ability, not the potential band. New public `referenceSquadAbilities()`. Two new collaborators: `PoolConfigRepository`, `PlayerGenerationService`. |
| `src/Command/EconomyWageTableCommand.php` | `squadBillPence()` stops rebuilding the reference squad from the band and reads `referenceSquadAbilities()`. |
| `src/Service/Economy/WageModelResolver.php` | **an integer overflow my change made reachable.** §6. |

**Nothing in §7's do-not list was touched.** No ability band, no turnover row, no
`wageToTurnoverRatio`, no `staffWageShare`, no `wageCurveExponentBp`, no sponsor/TV/payout figure,
no `WORLD_PACK_VERSION`. `git diff` on `src/Entity/`, `migrations/` and `config/` is empty.

### 1.1 §3.4 — nothing was copied, and here is where each input is read from

| input | read from, at runtime |
|---|---|
| maturation bands | `PlayerGenerationService::ABILITY_TARGET_BANDS`, the same const `buildAbilityTarget()` draws inside |
| the prodigy branch | `PRODIGY_BAND` / `PRODIGY_AGE_MIN` / `PRODIGY_AGE_MAX` / `PRODIGY_PERCENT`, same consts, same class |
| the youth ceiling | `PoolConfig::abilityCeilingFractionForAge($age)` — the live DB row, called |
| position attribute fractions | `PlayerGenerationService::POSITION_ATTRIBUTE_FRACTIONS`, unchanged |
| the attribute cap bounds | `capBounds()`, extracted from `randInCap()` and called by it |
| power / stamina / heart | `powerFor()` / `staminaFor()` / `heartFor()`, extracted from `buildAttributes()` and called by it |
| physique draw bounds | `HEIGHT_RANGE` / `GK_HEIGHT_BONUS` / `WEIGHT_RANGE` / `WEIGHT_SPAN`, and `weightFor()` shared with `buildAnchors()` |
| personality | `PersonalityGeneratorService::expectedTraits()`, over `PersonalityMould`'s own weights and the real `applyCorrelations()` |
| squad ages | `PoolConfig::firstTeamAgeRange()` — the live DB row, called |
| position mix | PoolConfig's own `positionWeight{Gk,Def,Mid,Att}` — the same four numbers `WorldPackSnapshotBuilder::distributeByPosition()` divides a squad by |
| squad size | `EconomyScaleResolver::referenceSquadSize($tier)`, unchanged |
| the potential band | `abilityBand($country, $tier)`, unchanged |

**There is no table of numbers in `EconomyScaleResolver`.** Retune a maturation band, a youth
ceiling, a position fraction, a mould weight, the first-team age floor or a position weight and
`S_tier` moves with it. That was §3.4's requirement and it is met without a new shared location —
the shared source is the generator itself, which is where the authoring already lived.

**Where I had to make a judgement rather than read a value:** `expectedTraits()` is an
expectation of a *linearised* pipeline — a correlation whose trigger is a threshold
(`ambition >= 15`) either fires for a mould's whole weight or not at all, where in the real
population it fires for part of it. Measured against 40,000 rolls per age it agrees to within
**4.4%** on all eight traits, all of them erring the same way, slightly high
(`measure-generator-truth.txt`): determination 13.65 against 13.36, loyalty 11.90 against 11.40.
It moves the three attributes that read it by well under a percent, because each divides a sum of
two or three traits by 40 or 60 before scaling. The alternative was a table of "typical" trait values in the economy
service, which is the drift this workstream exists to end.

---

## 2. §3.1 — the two open inputs, decided and justified

### 2.1 The age profile: every integer in `firstTeamAgeRange()`, weighted equally

`PoolConfig::firstTeamAgeRange()` reads **{min: 19, max: 33}** on this box.

**I took the generator's distribution, not a spread across the squad.** `buildAnchors()` draws
`$age = random_int($ageMin, $ageMax)` — *uniform over the integers in the range*. So a uniform
weighting over 19…33 **is** the generator's own distribution, exactly, and no authoring is
involved. The brief suggested "spread ages across it the same way abilities are spread across the
band"; with 33 members over 15 ages that over-weights the endpoints slightly, and it is a
restatement of the distribution rather than the distribution. I used the latter and say so here
as §3.1 asked. (It moves σ by about 1.8% — `measure-model-comparison.txt` has both.)

⚠️ **Age 19 is not a rounding detail.** `abilityCeilingFractionForAge(19)` returns 0.20 (the youth
ceiling band is "under 20"), and the generator applies it as `min(target, rand(0.10, 0.20))`. So a
19-year-old lands near **15%** of his potential, not 45%. Measured over the real generator: age 19
= **0.113** of potential, age 20–21 = 0.363, 22–25 = 0.547, 26–33 = 0.662. One of fifteen ages
carries a seventh of the ability — including it is what makes the profile honest.

### 2.2 ⚠️ Ages are AVERAGED PER MEMBER, not paired with the potential spread

A spread of ages laid alongside the spread of potentials makes the oldest member always the most
talented. **The generator does not do that** — age and potential are independent draws — and
`ability^2.5` is convex enough that the spurious correlation inflates σ on its own. So each
potential rung costs the **mean** of what it would cost across the age-and-position profile, which
is the independent joint the generator actually produces. 33 rungs × 15 ages × 4 positions = 1,980
cells per tier, memoised per (country, tier) as before.

### 2.3 The prodigy branch: WEIGHTED at 5%, not excluded

`0.05 × midpoint(0.85, 0.95) + 0.95 × midpoint(ordinary band)` inside the 18–23 window, then the
youth ceiling as a final `min()` over whichever branch ran — the same order
`buildAbilityTarget()` applies it in, so the ceiling cannot be bypassed.

**Why weighted rather than excluded:** prodigies are a real part of the population the wage scale
has to pay for, and excluding them understates ages 20–23 by about 2% of potential. Weighting
keeps the figure deterministic, which exclusion also would, so determinism is not the
tie-breaker — fidelity is. On this box the window overlaps the first-team range at ages 19–23
only, and at 19 the ceiling dominates the branch entirely.

### 2.4 No RNG anywhere in the chain — pinned by test

`random_int()`, `mt_rand()` and `PersonalityMould::pick()` are unreachable from
`wageScaleMicroPence()`. `testTheReferenceSquadIsDeterministic` re-resolves on **40 fresh
resolvers** with the Mersenne Twister re-seeded differently each time and asserts the squads and
both `S_tier` values are identical — fresh resolvers, so the per-request memoisation cannot make a
drawing chain look stable.

---

## 3. 🔴 §4 — THE MEASURED RESULT, PER TIER, UNTUNED

### 3.1 What a real generated squad now costs, against the budget it is calibrated to

40 clubs per tier generated through the real `PlayerGenerationService` with the tier's band as
`$potentialRange` and `firstTeamAgeRange()` as `$ageRange` — exactly as
`WorldPackClubGenerationService::generatePlayers()` does. Coverage = season bill ÷ authored player
budget. Verbatim in `measure-coverage.txt`.

| | band (POTENTIAL) | σ_old | σ_new | σ_old/σ_new | S_tier before | S_tier after | **coverage before → after** |
|---|---|---|---|---|---|---|---|
| EN T1 | 40–90 | 1,235,135.71 | 317,026.54 | 3.896 | 262.1609 | 1,021.3793 | 24.4% → **95.0%** |
| EN T2 | 30–60 | 438,669.89 | 137,499.40 | 3.190 | 254.2270 | 811.0707 | 29.6% → **94.3%** |
| EN T3 | 20–40 | 148,505.83 | 46,296.15 | 3.208 | 227.9225 | 731.1154 | 31.0% → **99.3%** |
| EN T4 | 15–35 | 89,949.91 | 27,564.68 | 3.263 | 225.1253 | 734.6358 | 30.1% → **98.2%** |
| EN T5 | 10–25 | 37,397.69 | 11,323.19 | 3.303 | 191.4789 | 632.4072 | 32.3% → **106.6%** |
| EN T6 | 10–15 | 14,777.17 | 4,367.58 | 3.383 | 178.0802 | 602.5129 | 32.3% → **109.4%** |
| EN T7 | 5–10 | 3,864.78 | 1,079.66 | 3.580 | 173.6417 | 621.5740 | 31.9% → **114.2%** |
| EN T8 | 2–7 | 1,172.58 | 289.83 | 4.046 | 179.3699 | 725.6891 | 30.6% → **123.8%** |
| SC T1 | 75–95 | 2,222,212.56 | 476,866.61 | 4.660 | 145.7126 | 679.0250 | 21.0% → **97.8%** |
| SC T2 | 65–85 | 1,478,788.34 | 368,125.83 | 4.017 | 75.4143 | 302.9446 | 24.5% → **98.6%** |
| SC T3 | 55–75 | 969,209.42 | 276,151.22 | 3.510 | 34.9231 | 122.5699 | 27.2% → **95.3%** |
| SC T4 | 45–65 | 596,210.30 | 184,589.98 | 3.230 | 33.9645 | 109.7026 | 30.0% → **97.0%** |
| SC T5 | 35–55 | 364,876.65 | 114,757.35 | 3.180 | 19.6255 | 62.4001 | 30.9% → **98.4%** |
| SC T6 | 25–45 | 198,732.02 | 61,805.69 | 3.215 | 13.2416 | 42.5773 | 32.3% → **103.9%** |
| SC T7 | 15–35 | 79,546.02 | 24,344.78 | 3.267 | 8.4365 | 27.5660 | 31.9% → **104.2%** |
| SC T8 | 10–25 | 31,732.96 | 9,596.74 | 3.307 | 6.6280 | 21.9164 | 30.6% → **106.8%** |

**Headline: coverage goes from 20–34% to 93–124%.** `S_tier` rose **3.18× to 4.66×**, against the
brief's predicted ~2.4×. σ_old, σ_new and both `S_tier` columns are exact; the coverage
columns are a 40-club sample per tier and move about ±2 points between runs (compare
`measure-coverage.txt` against `measure-model-comparison.txt`, which sampled independently).

### 3.2 ⚠️ This is ABOVE the brief's 70–85% band, and it is not because I tuned anything

Three independent reasons, each checkable:

1. **The 70–85% prediction came from the wrong formula.** It assumed the attribute-fraction term
   discounts all six attributes. It discounts three (§0.1). The brief's literal model lands at
   **128.8–214.4%**, not 70–85%; no implementation of that formula could have produced the predicted
   band.
2. **The number was never fitted to.** The target was not an input to anything. The reference
   squad is the band mapped through the generator's own functions, and the only judgement calls
   were the age profile (§2.1, taken from `random_int`'s own bounds) and the prodigy weighting
   (§2.3, 5% because the generator says 5%). Turning any dial to reach 85% would have meant
   choosing an age profile or a trait expectation *because* of its output, which I did not do.
3. **Coverage ≈ 100% is what the turnover model MEANS.** `S_tier` is defined as whatever makes a
   representative squad cost the configured share of turnover. A real squad costing ~100% of that
   share is the model working. 70–85% would mean the model still structurally underpays — the
   same defect, smaller.

**What remains is a real residual and it runs the right way.** `x^2.5` is convex, so a real squad
costs more than a squad of expected players: `E[a^k] > E[a]^k`. The reference squad prices
*representative players*, deliberately (correcting it needs the variance of the draw, which is a
different model). The residual is small where the band is wide and large where it is a handful of
integers, which is exactly the pattern in the table: **EN T1 97.1%, EN T8 123.8%**. At EN
tier 8 a member's expected ability is 1.0–4.2, so a single integer step is a 2.4× cost step.

### 3.3 🔴 Three things the owner should look at, which this change surfaced rather than caused

- **EN tiers 6, 7, 8 now overshoot (115%, 117%, 124%).** Those clubs would spend more on player
  wages than the 45% of turnover authored for them. The cause is the convexity residual on a
  band of five integers or fewer, plus the generator's `max(1, floor(cap × minFrac))` floor, which
  lifts a tier-8 player to 50–60% of his potential where a tier-1 player sits at 53–63%. **It is a
  band-authoring question, not a scale question** — and it is the same tier-6/tier-8 narrowness
  already queued in Tranche D as "The ability bands (R1)".
- **Gate checks 1 and 2 now FAIL at EN tiers 4, 7 and 8** (§5.1). Real, derived, not a regression.
- **The gate's `min / mid / max /wk` columns price the ability BAND, i.e. potentials.** After this
  change they read £103k–£785k/wk at EN tier 1 while a real tier-1 player earns **£92k**. They are
  "what this tier's players will eventually be worth", which is the same thing the app already
  labels "eventual". I did not add a current-ability column, because §7 scopes me to what σ is
  computed over; it is named as a follow-up in §8.

---

## 4. §5.5 — the wage ladder, before and after, for a REAL player

Verbatim in `measure-ladders.txt`. The ladder rows are **current** ability; the band shown is the
tier's **potential** band, so the top rows are players who have fully realised an elite potential
and are correspondingly rare.

### EN tier 8 — band 2–7, reference squad 22. S_tier 179.3699 → 725.6891 (×4.046)

| current ability | before /wk | after /wk |
|---|---|---|
| 2 | £10.14 | £41.05 |
| 3 | £27.96 | £113.12 |
| 4 | £57.39 | £232.22 |
| 5 | £100.27 | £405.67 |
| 6 | £158.17 | £639.92 |
| 7 | £232.53 | £940.79 |

**Real generated squads (40 clubs, 872 players), mean current ability 2.71:**
mean weekly wage **£29.22 → £118.24**; season bill **30.3% → 122.6%** of a £96,750 budget.

### EN tier 1 — band 40–90, reference squad 33. S_tier 262.1609 → 1,021.3793 (×3.896)

| current ability | before /wk | after /wk |
|---|---|---|
| 40 | £26,528.82 | £103,356.32 |
| 47 | £39,702.02 | £154,679.12 |
| 54 | £56,176.20 | £218,862.55 |
| 61 | £76,189.05 | £296,832.63 |
| 69 | £103,678.98 | £403,933.42 |
| 76 | £132,008.52 | £514,305.34 |
| 83 | £164,536.86 | £641,035.81 |
| 90 | £201,453.24 | £784,862.05 |

**Real generated squads (40 clubs, 1,343 players), mean current ability 35.96:**
mean weekly wage **£24,238.86 → £94,434.64**; season bill **25.1% → 97.9%** of a £148,950,000
budget.

### SC tier 8 — band 10–25, reference squad 22. S_tier 6.6280 → 21.9164 (×3.307)

| current ability | before /wk | after /wk |
|---|---|---|
| 10 | £20.95 | £69.30 |
| 12 | £33.06 | £109.32 |
| 14 | £48.60 | £160.72 |
| 16 | £67.87 | £224.42 |
| 19 | £104.29 | £344.86 |
| 21 | £133.94 | £442.91 |
| 23 | £168.15 | £556.01 |
| 25 | £207.12 | £684.88 |

**Real generated squads (40 clubs, 881 players), mean current ability 10.70:**
mean weekly wage **£31.18 → £103.12**; season bill **32.7% → 108.0%** of a £96,750 budget.

### SC tier 1 — band 75–95, reference squad 33. S_tier 145.7126 → 679.0250 (×4.660)

| current ability | before /wk | after /wk |
|---|---|---|
| 75 | £70,982.32 | £330,779.75 |
| 78 | £78,294.91 | £364,856.65 |
| 81 | £86,041.82 | £400,957.47 |
| 84 | £94,231.32 | £439,120.77 |
| 86 | £99,940.88 | £465,727.51 |
| 89 | £108,886.01 | £507,412.05 |
| 92 | £118,295.07 | £551,258.54 |
| 95 | £128,175.81 | £597,303.11 |

**Real generated squads (40 clubs, 1,338 players), mean current ability 43.10:**
mean weekly wage **£20,765.01 → £96,765.58**; season bill **21.5% → 100.0%** of a £148,950,000
budget.

### 4.1 What the reference squad now looks like

The members themselves, so the derivation is inspectable (full lists in `measure-coverage.txt`):

| | potential rung → expected current ability |
|---|---|
| EN T1 | 40 → 25.38 (63.5%) · 65 → 39.88 (61.3%) · 90 → 47.46 (52.7%) |
| EN T8 | 2 → 1.00 (50.0%) · 5 → 2.79 (55.8%) · 7 → 4.22 (60.2%) |
| SC T1 | 75 → 43.32 (57.8%) · 85 → 46.16 (54.3%) · 95 → 48.56 (51.1%) |
| SC T8 | 10 → 6.14 (61.4%) · 18 → 11.11 (61.7%) · 25 → 15.78 (63.1%) |

The realised fraction **falls as potential rises**, because `power`, `stamina` and `heart` stop
being capped once the cap passes ~55. That is the generator's behaviour, not an artefact: measured
on real squads, EN tier 1's mean ability/potential is 0.549 against EN tier 3's 0.591.

---

## 5. §5 — verification

### 5.1 The gate, before and after, EN and SC — in full

`gate-before.txt` and `gate-after.txt` are appended verbatim in §10 and filed in
`a10-run-2026-11-19/`. ⚠️ **`gate-after.txt` was re-generated after the overflow fix of §6 and
after every test change, and is byte-identical** — `diff` is empty. That is the check on §6's
claim that folding the reputation modifier into the rounding step changes nothing at the shipped
spread of 0, where `repBp` is 10000.

**What moved, and why it is the right direction and magnitude:**

| line | before | after | reading |
|---|---|---|---|
| `S_tier` (EN) | 262.16 … 179.37 | 1,021.38 … 725.69 | ×3.90 to ×4.05 — §4's predicted ×2.4 was derived from the wrong formula (§0.1); the measured σ ratio is 3.18–4.66 |
| `S_tier` (SC) | 145.71 … 6.63 | 679.03 … 21.92 | ×3.18 to ×4.66 |
| `min/mid/max /wk` | — | ×3.2–×4.7 | priced at the BAND, i.e. potentials — see §3.3 |
| `bill % turnover` | 45.0% | **45.0%** | unchanged **and correct**: check 4's definition is "the squad S_tier was calibrated against costs the configured share", and both sides moved together. It read 143–182% until I stopped the command rebuilding the squad from the band (§5.2) |
| `squad wages /wk` | £3,238,043 (EN T1) | £12,615,420 | the same ×3.9 |
| failed checks | **31** | **37** | +6, all of them checks 1 and 2 |

**The six new findings, all real:**

```
 * EN tier 4: S_tier (734.6358) is not LOWER than tier 3 (731.1154) — a lower division pays more per unit of ability.
 * EN tier 7: S_tier (621.5740) is not LOWER than tier 6 (602.5129) — a lower division pays more per unit of ability.
 * EN tier 8: S_tier (725.6891) is not LOWER than tier 7 (621.5740) — a lower division pays more per unit of ability.
 * EN: ability 20 is paid MORE at tier 4 than at tier 3 — a promoted player takes a pay cut.
 * EN: ability 35 is paid MORE at tier 4 than at tier 3 — a promoted player takes a pay cut.
 * EN: ability 10 is paid MORE at tier 7 than at tier 6 — a promoted player takes a pay cut.
```

⚠️ **I read what they assert before judging them, as §5 asked.** EN tier 8 **already failed check
1 before this change** (179.37 against tier 7's 173.64). Tiers 4 and 7 were marginal before — tier
4 sat 1.2% under tier 3 — and the recalibration flipped them, because σ no longer scales smoothly
with the band once the generator's integer floors (`max(1, floor(cap × minFrac))`) bite at small
caps. **The authored band ladder, not the scale, is what makes `S_tier` non-monotonic**: EN tiers
3→4 step 20–40 → 15–35 (almost no change) while the squad drops 28 → 26, and EN tiers 6→7→8 are
10–15 → 5–10 → 2–7, where a one-integer band step is a 2.4× cost step. **I did not tune the bands
to clear it** (§7 forbids it and §4 forbids tuning), and it lands in the same place as §3.3's
first bullet: Tranche D's "ability bands (R1)" decision.

The 25 findings that persisted unchanged (bankruptcy ladder range, sponsorship share band, the two
unreachable deduction rows) are all pre-existing and none of them reads `S_tier` in a way this
change moved.

### 5.2 ⚠️ The gate had its own third copy of the reference squad, and I removed it

Before any of the above, `squadBillPence()` in `EconomyWageTableCommand` spread the band evenly and
priced that. That was a **second** statement of what a reference squad is (a third counting the
app harness in §0.2), and it passed only because the resolver said the same two lines. With the
resolver's squad no longer the band, the command's copy reported **143–182%** — a drift that was
its own and nothing else's, which is precisely what its own comment warned against. So
`EconomyScaleResolver::referenceSquadAbilities()` is public and the command reads it. The check
keeps its full meaning — it still prices member by member through the real
`WageModelResolver::turnoverPlayerPence()` — and can no longer disagree with the thing it checks.

`turnoverPlayerPence()`'s `$ability` parameter widened from `int` to `int|float` for that: a
reference member's figure is an average over sixty age-and-position cells, not an attribute, and
rounding 1.4 to 1 at EN tier 8 would move σ by a third. The real pricing path still passes an int.

### 5.3 §5.3 — a test pinning `S_tier` to a hand-computed value

`EconomyScaleResolverTest::testSTierIsPinnedToAHandComputedReferenceSquad`. The reference squad is
deliberately collapsed to **one member, one age, one position**, because the shipped shape (22–33
rungs × 15 ages × 4 positions) is correct but not hand-checkable, and a pin nobody can verify is a
pin nobody will fix. The whole derivation is in the test's docblock as arithmetic:

```
potential          band 100-100, squad size 1                                  = 100
abilityTarget(26)  >=26 band 0.85-1.00, midpoint; outside 18-23; no ceiling    = 0.925
cap                floor(0.925 x 100)                                          = 92
pace       MID 0.30-0.70 -> lo max(1,floor(27.6))=27, hi ceil(64.4)=65, mid    = 46
technical  MID 0.50-1.00 -> lo floor(46)=46,          hi ceil(92)=92,    mid   = 69
vision     MID 0.50-1.00 -> same                                               = 69
height             midpoint of 163-203, no GK bonus                            = 183
weight             71 + floor(normalise(183,163,211) x 15) = 71 + floor(6.25)  = 77
power              ceil((0.4380631 x 0.6 + (13.650+13.450)/40 x 0.4) x 100)    = 54
stamina            ceil((0.4786036 x 0.5 + (13.650+10.750+9.800)/60 x 0.5)x100)= 53
heart              round((11.900+13.650+10.750)/60 x 100)                      = 61
currentAbility     (46+69+69+54+53+61)/6 = 352/6                            = 58.666...

playerBudget = 100,000,000 x 0.60 x 0.75             = 45,000,000 pence
sigma        = (352/6)^2.5                           ~ 26,362.04
S_tier       = 45,000,000 x 10^6 / (46 x sigma)      ~ 37,111,000 micro-pence = 37.11 pence
```

The test asserts `expectedCurrentAbility(100, 26, MID) === 352/6` exactly, then `S_tier` against
that arithmetic, then the readable `37.11` pence — and, for the record, the **old** calibration's
`9.78` pence for the same member priced at his potential of 100. **3.8× in one number, on a case a
human can check on paper.** The eight trait expectations it leans on are pinned separately rather
than re-asserted here.

### 5.4 §5.4 — a determinism test

`testTheReferenceSquadIsDeterministic` — §2.4. Plus
`testEveryReferenceMemberSitsBelowItsPotentialRung`, which fails the moment a member comes out at
or above its rung: that is the defect this replaced, and it would come back silently as merely a
slightly low `S_tier`.

### 5.5 Two existing assertions that pinned the OLD calibration, corrected

As §5 anticipated:

1. `testTheWageScaleMakesTheReferenceSquadCostItsShareOfTurnover` reconstructed σ from the band
   40–90 and compared the bill to the budget. It passed because the resolver did the same thing;
   both were wrong. It now reconstructs from `referenceSquadAbilities()` — so it still asserts the
   **definition** the test is named after, and additionally asserts the squad is nothing like the
   band (`max(squad) < 40`). The band spread was pinning the old calibration, not the property.
2. `testTheWageScaleCarriesSubPennyPrecision` asserted `S_tier < WAGE_SCALE_UNIT * 1000` — an
   upper bound of 1,000 pence, a proxy for "small" and not the precision the test is named after.
   It went red on the fourfold rise. It now asserts the genuine claim: `S_tier` is **not** a whole
   number of pence, so the sub-penny headroom is doing something.

⚠️ **`AbilityRangeParityTest` did NOT move.** The brief expected it to; it asserts that the
published band and the pricing band are the same table, and this change does not touch either.

**Two further groups moved, and both needed a judgement rather than a new number:**

3. **`EconomyBaselineTurnoverAuthoringTest`** pins `EXPECTED_SCALE` — the eight `S_tier` figures —
   and asserts the ladder is strictly decreasing. The figures are **re-baselined** (the old row is
   kept in the const's docblock so the size of the move is readable), because they are an *output*
   of the authored turnover row, the authored bands and the squad row the test itself authors —
   nothing was tuned to reach them, and the test's purpose (nothing else would notice if the
   authored turnover row were quietly re-rounded) is unchanged.
   🔴 **The monotonicity test is INVERTED, and that is the most important line in this report.**
   It now asserts `S_tier` rises at tiers **6 and 8** with that test's inputs — i.e. it records
   the breach rather than asserting a property that no longer holds. Three things are true at
   once: the breach is real (a promoted player can take a pay cut at those rungs); it is the
   authored band ladder that gives, not the scale, and re-authoring a band was explicitly out of
   scope; and **the alarm is still live** — `app:economy:wage-table` check 1 reports every breach
   and exits 1, so the deploy gate still refuses. The test's docblock says to flip it back the
   moment the bands are re-authored. I did not leave a red test and I did not silence the gate.
4. **`YouthScholarshipCapTest`** — four failures, and the cause is worth reading. The cap is
   `min(flat £250, capBp × averageFirstTeamWage)`, and it existed because a flat £250 scholar
   out-earned a tier-8 professional on £127. **Wages rose ~3.6× at tier 7, so the flat figure
   stopped being the outlier there and the `min()` now leaves it alone — the inversion the cap
   was built to patch has been fixed at the source for tier 7.** Only tier 8, band 2–7, is still
   narrow enough to need it. So tier 7 moved from the "cap bites" list into the "authored figure
   survives untouched" list, with that reason written in.
   ⚠️ **The file's `TURNOVER` fixture was also swapped from the step-5 CANDIDATE ladder to the
   authored R2 one**, and that is not cosmetic: the candidate sits 1.27–1.49× above R2, and the
   cap's crossover moved up *through* the candidate's tier-8 figure and stopped just short of
   R2's — the candidate puts tier 8's cap at £254.97 (the flat figure wins, so the cap is inert
   and the file's whole first property becomes untestable) while R2 puts it at £201.39 (the cap
   bites). Pinning the mechanism against a ladder nobody authored was the accident.

### 5.6 The full suite — and ⚠️ a pre-existing environment failure I had to work around

**The whole-suite run is being OOM-killed on this box, on a clean tree, before and after my
change.** Attributed the documented way — stash, re-run — not by reading an assertion:

```
$ lando php bin/phpunit --no-coverage            # WITH my change
.............................................................   61 / 3297 (  1%)
.............................................................  122 / 3297 (  3%)
.............................................................  183 / 3297 (  5%)
....
EXIT=137

$ git stash push -u -m "a10-wip"
$ git status --porcelain
(clean)
$ lando php bin/phpunit --no-coverage            # CLEAN TREE, same box, same minute
.............................................................   61 / 3294 (  1%)
.............................................................  122 / 3294 (  3%)
.............................................................  183 / 3294 (  5%)
....
EXIT=137
$ git stash pop
```

Identical kill point on an identical clean tree. The cause is the Docker VM, not the code:

```
$ docker inspect wunderkindbackend_appserver_1 --format '{{.State.OOMKilled}} {{.HostConfig.Memory}}'
true 0
$ docker stats --no-stream --format "{{.Name}} {{.MemUsage}}"
wunderkindbackend_appserver_1 11.15MiB / 3.828GiB
$ vm_stat | head -2
Mach Virtual Memory Statistics: (page size of 16384 bytes)
Pages free:                                     4107.
```

3.83 GiB for the whole VM with ~64 MB free on the host, and `OOMKilled: true`. A7 completed 3,294
tests earlier today, so this is new **today** and plausibly contention — A11 is running in a second
worktree of this repo against the same box and the same shared `wunderkind_test` database. ⚠️
**Worth adding to `environment.md` by the PM: judge a `137` as an environment result, not a test
result.** I have not edited `environment.md`'s baseline section — that is the PM's.

**So I ran the suite in 20-file batches instead**, 386 files, each a separate process. Per-batch
output in `suite-batches/`, summary in `suite-batches/_summary.txt`. Result in §5.7.

### 5.7 Suite result against the documented three-to-five

**FOUR failures, ZERO errors. 3,225 of the suite's 3,297 tests executed; the other 72 are one
file that cannot run on this box — reconciled exactly in §5.8.** Three failures are the documented
list; the fourth is pre-existing and **not** documented, and §5.9 classifies it. Per-batch output
in `suite-batches/`.

```
TOTAL tests=3225 assertions=155695 failures=4 errors=0

batch-003  App\Tests\Controller\Admin\NotificationLogCrudControllerTest::testIndexRowIsClickableToADetailPageShowingTheFullPayload
batch-005  App\Tests\Controller\Api\CompetitionControllerTest::testShowIncludesResultsOnceRoundsAreProcessed
batch-005  App\Tests\Controller\Api\LegacyNewGameFlowTest::testTheEconomyBlockShipsSwitchedOff
batch-014  App\Tests\Service\Friendly\FriendlyResolveSingleMatchTest::testResolvingAnAcceptedChallengeRecordsAFullResult
```

| failure | verdict |
|---|---|
| `NotificationLogCrudControllerTest` | documented **#1** — empty content table |
| `CompetitionControllerTest`, narrative timeline | documented **#2** — empty content table |
| `FriendlyResolveSingleMatchTest` | documented **#3** — empty content table |
| `LegacyNewGameFlowTest::testTheEconomyBlockShipsSwitchedOff` | ⚠️ **NOT in the documented list, and not mine. A genuine sixth baseline item** — §5.9 proves which, and it is not a stale test |

Documented failures **#4** (`NpcClubForeignClubsCitySizeTest`) and **#5**
(`NpcClubPlaceWeightingTest`) did not fire in this run — both are the composition flakes
`environment.md` says join and leave the list by themselves, so three-of-five is a legal reading.

The undocumented one, verbatim, and the attribution:

```
$ lando php vendor/bin/phpunit --filter testTheEconomyBlockShipsSwitchedOff tests/Controller/Api/LegacyNewGameFlowTest.php
the turnover table must be unauthored
Failed asserting that two arrays are identical.
--- Expected
+++ Actual
@@ @@
 Array &0 [
-    0 => 0,
+    0 => 38866153952,
     1 => 0,
...
Tests: 1, Assertions: 5, Failures: 1.

$ git stash push -u -m a10
$ git status --porcelain
(clean)
$ lando php vendor/bin/phpunit --filter testTheEconomyBlockShipsSwitchedOff tests/Controller/Api/LegacyNewGameFlowTest.php
Tests: 1, Assertions: 5, Failures: 1.          # IDENTICAL on a clean tree
$ git stash pop
```

`38,866,153,952` is not a figure this change produces — nothing here writes config.
⚠️ **The stash-and-rerun above was run while the shared row happened to be dirty, so it proves
only that the failure is not mine.** §5.9 is the stronger proof, and it identifies the writer and
the ordering.

**One file cannot complete at all, and it is the environment**: `AdminShellCoverageTest` is
OOM-killed on its own, nine tests in, **identically on a clean tree**:

```
$ lando php bin/phpunit --no-coverage tests/Controller/Admin/AdminShellCoverageTest.php
.........                                   # killed, exit 137
$ git stash push -u -m a10
$ lando php bin/phpunit --no-coverage tests/Controller/Admin/AdminShellCoverageTest.php
.........                                   # killed, exit 137 — IDENTICAL
$ git stash pop
```

Everything else in its batch runs green when the batch is split (33 + 55 + six of seven files
individually, all OK). ⚠️ **Nothing in `tests/Controller/` reads the wage scale except
`LegacyNewGameFlowTest`** — `grep -rln "wageScale\|S_tier\|turnoverPlayerPence\|economyTierBaseline" tests/Controller/`
returns that one file — so the un-runnable file is not economy-sensitive.

---

### 5.8 🔴 THE COUNT RECONCILED — 3,225 + 72 = 3,297, exactly

**The 3,294 reference was the figure BEFORE this change.** This change adds three tests, so the
suite is **3,297**, which is not an inference — it is what PHPUnit itself enumerates:

```
$ lando php bin/phpunit --no-coverage --list-tests | grep -c "^ - "
3297
```

So the gap against the batched 3,225 is **72, not 69**. Each of the three candidates was checked
rather than reasoned about. Full working in `suite-batches/_reconciliation.txt`, the enumeration in
`suite-batches/_list-all-tests.txt`.

**Candidate 1 — files no batch picked up. Ruled out, and 386 is the real count:**

```
$ find tests -name "*Test.php" | wc -l                               386
files listed across the 20 batches                                   386
distinct files across the 20 batches                                 386
in a batch but not on disk                                        (none)
on disk but in no batch                                           (none)
test classes in --list-tests whose file path could not be resolved (none)
*Test.php files on disk with zero tests listed                     (none)
```

**Candidate 2 — skipped tests counted differently. Ruled out, and it matches A7 exactly:**
`batch-011` 6 + `batch-014` 2 + `batch-018` 1 + `batch-019` 4 = **13**, which is A7's single-run
`Skipped: 13` to the test. Batched and single runs agree.

**Candidate 3 — a batch that reported zero rather than failing loudly. This is the whole gap, and
it is one file.** Planned-vs-reported, per batch, planned taken from `--list-tests` mapped class →
file:

| batch | planned | reported | delta |
|---|---|---|---|
| 001, 003–020 (19 batches) | 3,084 | 3,084 | **+0 each** |
| **002** | **213** | **0** | **−213 (OOM-killed, exit 137)** |

**Every batch except 002 reported exactly its planned count.** Batch 002's 20 files were then
re-run split, which recovered all but one:

| | result |
|---|---|
| `batch-002a`, 7 files | killed — re-run one file at a time |
| └ `WarmPoolConfiguredRolesTest` | OK, 4 |
| └ `WarmPoolTierOptionTest` | OK, 5 |
| └ `ActiveCompetitionCrudPageTest` | OK, 22 |
| └ `AdminMessageCrudPageTest` | OK, 5 |
| └ `AdminMessagePushChannelTest` | OK, 5 |
| └ **`AdminShellCoverageTest`** | 🔴 **OOM-killed, 0 of 72** |
| └ `AdminStatsControllerTest` | OK, 12 |
| `batch-002b`, 7 files | OK, 33 |
| `batch-002c`, 6 files | OK, 55 |

```
suite planned, from --list-tests                   3297
reported, 20 batches with 002 at zero              3084
reported, batch-002 recovery runs                  + 141
reported grand total                               = 3225
AdminShellCoverageTest, OOM-killed, 0 of             72
3225 + 72                                          = 3297   EXACT
```

**So the structural reason the 72 do not run is `AdminShellCoverageTest`, and it is the
environment, not the batching**: it is OOM-killed on its own, nine tests in, **identically on a
clean tree** (§5.7's stash-and-rerun). ⚠️ It is also not economy-sensitive —
`grep -rln "wageScale\|S_tier\|turnoverPlayerPence\|economyTierBaseline" tests/Controller/`
returns only `LegacyNewGameFlowTest`. Nothing else is unaccounted for: the only batch that
reported zero is the one that exited 137, and its planned 213 splits exactly into 141 recovered
plus 72 un-runnable.

### 5.9 🔴 THE UNDOCUMENTED FAILURE CLASSIFIED — a genuine baseline item, NOT a stale test

Full working in `legacy-newgame-flake-attribution.txt`.

**It is a genuine baseline item.** It looks like it should be stale — R2
(`Version20261118120000`) authored the turnover table deliberately, so an assertion that the table
is unauthored reads like a pre-R2 relic. **It is not, because `wunderkind_test` is not
migration-tracked** (`environment.md`), so R2's authoring never reaches it, and the shipped default
really is zeros:

```
$ grep -n 'economyBaselineTurnoverPence' src/Entity/GameConfig.php
1552:    // THE EXCEPTION IS `economyBaselineTurnoverPence`, WHICH SHIPS AS ZEROS AND IS NOT A
1589:     * SHIPS AS ZEROS, which is an unauthored table rather than a free world
1595:    private array $economyBaselineTurnoverPence = [0, 0, 0, 0, 0, 0, 0, 0];
```

**It is an order-dependent flake, and I found the writer.** Two tests put that exact literal into
the *shared* `game_config` row inside their own `seed()` and never restore it:

```
$ grep -rn '38866153952\|38_866_153_952' src/ tests/ migrations/
tests/Command/EconomyAuthoredSizeDriftTest.php:156:   $config->setEconomyBaselineTurnoverPence([38_866_153_952, 0, 0, 0, 0, 0, 0, 0]);
tests/Command/EconomyTvCountryScalingGuardTest.php:113: $config->setEconomyBaselineTurnoverPence([38_866_153_952, 0, 0, 0, 0, 0, 0, 0]);
tests/Service/Economy/LeaguePayoutResolverTest.php:73: 38866153952, 12004975671, 3557660225, 1990900941,
```

(The third is a plain `TestCase` over stubs and writes nothing.) Proved three ways, starting from a
row verified clean:

| run | result |
|---|---|
| the reader **alone** | **OK (1 test, 5 assertions)** |
| **polluter → reader**, one invocation | **FAILS** — `+ 0 => 38866153952`; row left dirty |
| **reader → polluter**, after resetting the row | **OK (27 tests, 126 assertions)** |

The row was then restored to the `[0,0,0,0,0,0,0,0]` it was found at, and verified.

⚠️ **It is deterministic, not random, and that makes it worse than #4 and #5.** Default order is
alphabetical and `tests/Command/Economy*` sorts before `tests/Controller/Api/Legacy*`, so the
polluter always runs first in a full run. **It will now fail in every full run.** It is new because
both polluting files landed today with A7 — `EconomyAuthoredSizeDriftTest` is named in A7's own
`last-sync` entry — which is why A7's 3,294-test run reported three failures and not four.

**The fix belongs in the polluters, not in `LegacyNewGameFlowTest`.** The reader asserts a real
invariant and its docblock names the mistake it exists to catch: *"shipping a non-zero inflation
rate or an authored turnover table by accident, which would change what every existing save derives
without anyone choosing it."* That is worth keeping. The two `tests/Command/Economy*` files need
the row for their own run and should put it back, or stop persisting it. **Not fixed here** — this
pass was told not to change code.

---

## 6. ⚠️ An integer overflow my change made reachable, and fixed

`EconomyAuthoredSizeDriftTest` went red with

```
TypeError: intdiv(): Argument #1 ($num1) must be of type int, float given
/app/src/Service/Economy/WageModelResolver.php:168
```

`turnoverPlayerPence()` read:

```php
$micro = (int) round($scale->wageScaleMicroPence * $shape);
$micro = intdiv($micro * $this->reputationModifierBp($clubReputation, $config), self::BP);
```

Instrumented, on the synthetic country `YA` at tier 1:

```
DBG YA t1 ability=75 scaleMicro=57382319332 shape=48713.929 micro=2795318227664039 repBp=10000
```

`2,795,318,227,664,039 × 10,000 = 2.8e19`, past `PHP_INT_MAX` (9.22e18), so the product silently
became a float and `intdiv()` raised. **It was always within a factor of ~1.3 of that ceiling**;
the fourfold rise in `S_tier` pushed it over, and a steep synthetic tier went first. Fixed by
folding the reputation modifier into the same rounding step:

```php
$micro = (int) round(
    $scale->wageScaleMicroPence * $shape * $this->reputationModifierBp($clubReputation, $config) / self::BP,
);
```

**The two forms agree exactly at the shipped reputation spread of 0**, where `repBp` is 10000 and
`intdiv(m × 10000, 10000) === m`; with a spread configured they can differ by at most one
micro-pence, a millionth of a penny. The chain still rounds exactly once and `WageModelLegacyParityTest`
is unaffected.

---

## 6b. 🔴 TWO MORE THINGS THE CHANGE SURFACED — one a defect I did NOT fix, one a property

### 6b.1 🔴 `averageFirstTeamWagePence()` is now wrong by 3.0–4.6×, and I left it alone

`WageModelResolver::averageFirstTeamWagePence()` prices **the mid of the ability band**:

```php
$band = $this->scaleResolver->abilityBand($country, $tier);
$mid  = (int) round(((int) $band['min'] + (int) $band['max']) / 2);
return $this->turnoverPlayerPence($mid, $country, $tier, $reputation, $config);
```

Its own docblock insists on **"ONE DEFINITION, because three things now depend on agreeing about
it: the scholarship ladder, the scholarship cap, and the gate command's inversion check."** It was
*accidentally* right before this change — the reference squad **was** the band, so the band mid
approximated the squad mean to within a few percent. It no longer is. Measured
(`measure-average-wage.txt`); `refMean` is the true mean wage over the reference squad, which is
invariant by construction because the squad's bill equals the budget:

| | band mid | band-mid wage BEFORE | band-mid wage AFTER | **true refMean (both)** | after ÷ truth |
|---|---|---|---|---|---|
| EN T1 | 65 | £89,299.98 | £347,912.83 | £98,122.52 | **3.55×** |
| EN T4 | 25 | £7,035.16 | £22,957.36 | £7,788.45 | **2.95×** |
| EN T8 | 5 | £100.27 | £405.67 | £95.59 | **4.24×** |
| SC T1 | 85 | £97,060.91 | £452,306.76 | £98,122.52 | **4.61×** |
| SC T4 | 55 | £7,619.60 | £24,610.68 | £7,788.45 | **3.16×** |
| SC T8 | 18 | £91.10 | £301.26 | £95.59 | **3.15×** |

**It is the same defect, in a second place**: a figure named "average first-team wage" computed from
the potential band. The consequence is concrete — the youth scholarship cap is now ~3–4× more
generous than the average it is supposed to be a share of, and the gate's inversion check compares
a scholarship against an inflated average and passes trivially.

⚠️ **I did not fix it**, and the reason is §7 of the brief: *"You are changing what sigma is
computed over and nothing else."* Fixing it changes the youth scholarship ladder, which is an
authored economic lever the owner has been calibrating, and that is the owner's call rather than a
side effect of this task. The fix itself is small — average the squad
`EconomyScaleResolver::referenceSquadAbilities()` already returns, which is the figure check 4
prices anyway — so it is a clean follow-up with the numbers above as its before/after.

### 6b.2 ⚠️ `S_tier` now depends on `PoolConfig::$playerAgeMax`, which ships at 13

`firstTeamAgeRange()` is `[playerFirstTeamAgeMin, max(playerFirstTeamAgeMin, playerAgeMax)]`, and
`playerAgeMax`'s **entity default is 13** — it is mostly the youth pool's upper bound. So on the
raw defaults the range collapses to **{19, 19}**, and 19 is the single age at which the youth
ability ceiling still binds, at 20% of potential. A reference squad built from that is twenty-odd
youth-ceilinged nineteen-year-olds, and `S_tier` comes out about **58×** the figure the deployed
pool (19–33) produces.

**This is not a defect, and it is worth saying why**: a box whose pool really is configured that way
also *generates* squads that way, because `WorldPackClubGenerationService::generatePlayers()` reads
the same range. The scale follows the generator — which is the whole point of the change. But it
does mean `S_tier` is now sensitive to a column that previously did not reach it, so it is recorded
here and in `tests/Support/ReferenceSquadDoubles.php`, whose doubles carry the deployed range so
that no unit test pins a figure from the collapsed case by accident.

---

## 7. What I did NOT do

- **No app work.** `wunderkind-app` was read only (§0.2).
- **No band, turnover, ratio, staff-share, `k`, sponsor, TV or payout figure changed**; no
  migration; no `WORLD_PACK_VERSION`.
- **No tuning to a coverage target.** §3.2.
- **No gate column added** for a real player's wage, and no band re-authoring to clear the three
  monotonicity failures — both named in §8 instead.
- **No `.context` restructuring.** One pass entry appended to `shared/last-sync.md`; the three
  stage passages my change falsifies corrected in place (§8.1).
- **Not pushed. Not deployed.**

---

## 8. Follow-ups — flagged, not done

| # | where | what |
|---|---|---|
| 1 | 🔴 **app** `src/economy/harness/loadExport.ts:89` | `referenceSquad()` mirrors the old band spread; its comment is now false, `turnoverAvgWeeklyPence` is undefined by the backend, and the `9782.608696` cross-tier invariant it documents **will break** (§0.2). Needs the backend's squad, or an explicit "this is the band, not the squad" rename. |
| 2 | 🔴 **owner** | EN tiers 6–8 overshoot at 115–124% (§3.3) and `S_tier` is non-monotonic at EN 4, 7, 8 (§5.1). Both point at the same authored-band narrowness already queued in Tranche D as "The ability bands (R1)". |
| 3 | 🔴 **backend** `WageModelResolver::averageFirstTeamWagePence()` | Now 3.0–4.6× above the real average because it prices the potential band's mid (§6b.1). Feeds the youth scholarship ladder, the scholarship cap and the gate's inversion check. **Deliberately not fixed** — it moves an authored lever, which is the owner's call. |
| 4 | **app** CHECKS tab | The check specified in §9. |
| 5 | **backend** gate | `min/mid/max /wk` price the potential band; a current-ability column would stop the owner reading £347k/wk as a tier-1 wage (§3.3). Out of §7's scope today. |
| 6 | **PM / `.context`** | `shared/last-sync.md:545–546` says *"`wageScaleMicroPence` is calibrated against the tier's authored ability band … so it is only meaningful inside it."* That was true when written and is now superseded. It sits inside a historical pass entry, so I left it and flag it here rather than rewriting the log. |
| 7 | 🔴 **backend tests** `EconomyAuthoredSizeDriftTest:156`, `EconomyTvCountryScalingGuardTest:113` | Both write `38_866_153_952` into the SHARED `game_config` row and never restore it, which makes `LegacyNewGameFlowTest::testTheEconomyBlockShipsSwitchedOff` fail in **every** full run from now on (default order puts them first). **A genuine new baseline item, not a stale test** — §5.9 proves it three ways. The fix belongs here, not in the reader. Not fixed: this pass was told not to change code |
| 8 | **PM / `.context`** | `environment.md` should gain (a) the `137` OOM rule — judge it as an environment result, not a test result (§5.6, §5.8) — including that `AdminShellCoverageTest`'s 72 tests cannot run on this box at all, and (b) the item above as the sixth known failure, with the note that unlike #4 and #5 it is **deterministic** rather than a composition flake |

### 8.1 `.context` edits made

- `stages/04_interfaces/output/services.md` — three passages corrected: the reference-squad
  paragraph under `EconomyScaleResolver` (now names the age and position inputs and says the band
  is potentials); the "what `wageScaleMicroPence` is calibrated AGAINST" block (now gives the
  mapped member ranges — EN T1 25.4–47.5, EN T8 1.0–4.2); and check 4's description in the gate
  section (no longer builds its own squad; checks 1 and 2 now fail at EN 4, 7, 8).
- `shared/last-sync.md` — **one** pass entry appended. Nothing restructured, pruned or deleted.

---

## 9. 🔴 ON-DEVICE CHECK SPEC — the measured wage bill against its authored budget

Per `agent-standing-notes.md` §1 and the PM's follow-up. **I did not add it: the CHECKS tab is
app-side and I am backend-only.** Specified here to be implemented without me. It earns its line
by §2's test — it would still be worth printing in six months, because it is the only thing that
notices the scale drifting away from its own calibration again.

**One line per tier, in the existing per-tier economy block of
`src/economy/economyDiagnostics.ts` (surfaced by `src/components/debug/ChecksTab.tsx`).**

**Figures, all already available on device:**

| name | source |
|---|---|
| `meanWeeklyWagePence` | already printed — the save's own mean over the tier's players (`tier 8 mean weekly wage 1,899 pence across 183 player(s)`) |
| `playerCount` | already printed alongside it |
| `squadSize` | the tier's mean squad size in the save: `playerCount / clubCount` for that tier |
| `turnoverPence` | `economyTierBaseline.tiers[t].turnoverPence` from `GET /api/game-config?country=XX` |
| `wageToTurnoverRatioBp` | same payload |
| `staffWageShareBp` | same payload |
| `weeksPerSeason` | same payload |

**The relationship to assert** — one division, stated as a ratio, not three numbers:

```
playerBudgetPence   = turnoverPence x wageToTurnoverRatioBp/10000 x (10000 - staffWageShareBp)/10000
measuredBillPence   = meanWeeklyWagePence x squadSize x weeksPerSeason
coverage            = measuredBillPence / playerBudgetPence
```

**Printed as** (one line per tier, the whole point being that the ratio is on the line):

```
T8  mean wage 1,899p x 20.3 players x 46 wks = £17,718 season bill
    vs player budget £19,350  ->  coverage 91.6%  OK      [expect 85-115%]
```

**What counts as a failure:**

| coverage | verdict | meaning |
|---|---|---|
| **< 60%** | 🔴 **FAIL** | the scale is calibrated against a different quantity from the one being paid. This is the state the game was in from launch until 2026-11-19 — it would have read **21–35%** and said so on the first boot anyone opened the tab. |
| **60–85%** | ⚠️ **WARN** | under-spending; either the squad is young (a save full of 19-year-olds legitimately reads low) or the calibration has drifted. |
| **85–115%** | ✅ **OK** | the authored band. Every tier should land here on a mature save after this change; §3.1 measures 93–124% on freshly generated squads. |
| **> 115%** | ⚠️ **WARN** | over-spending. Expected at EN tiers 6–8 today for the reason in §3.3; it should become a FAIL once the bands are re-authored. |
| **> 150%** | 🔴 **FAIL** | clubs are structurally insolvent on wages alone. |

**Two things the implementer must get right or the line lies:**

1. ⚠️ **`squadSize` must be the save's real mean squad size for that tier, not
   `npcSquadConfig`'s midpoint.** The backend's reference squad uses the midpoint and the app's
   real squads are thinned, so using the authored figure would print a coverage that is 15–20%
   optimistic and would never fail. `a10` measured this gap on the backend side; the app's own
   `appSquadSize / referenceSquadSize` ratio in `harness/simulate.ts:442` is the same gap.
2. ⚠️ **It must use the tier the players are actually in**, not the club's authored tier, on a save
   where a club has been promoted or relegated.

**Why it is worth a line:** the owner's Scottish save printed `tier 8 mean weekly wage 1,899
pence` this afternoon with nothing to compare it to. Against a £19,350 budget on a 20-player
squad, 1,899p is 91.6% — fine. Before this change the same save would have read about 470p, which
is **23%**, and the line would have said FAIL. That is a months-old calibration gap visible in one
line, on the first boot, without a world export or an agent.

---

## 10. Appendix — the gate, verbatim

**`gate-before.txt` — `lando php bin/console app:economy:wage-table EN SC` at `0e68d6ac`, exit 1.**

### BEFORE

```

Economy wage table
==================

 [WARNING] The live wage model is "legacy". This table is what "turnover" WOULD 
           pay — nothing generated so far was priced this way.                  

 ---------------------- ------------------------------------------------------------ 
  wage model             legacy                                                      
  weeks per season       46                                                          
  wage : turnover        60.00%                                                      
  staff share of wages   25.00%                                                      
  curve exponent k       2.5000                                                      
  reputation spread      0.00%                                                       
  priced at reputation   50 (the calibration anchor)                                 
  baseline country       resolving at parity (either the baseline, or none flagged)  
 ---------------------- ------------------------------------------------------------ 

EN
--

 --- ------- ------- ------------ ------------ ------------ ------------- ----------------- ----------------- 
  T   squad   band    S_tier (p)   min /wk      mid /wk      max /wk       turnover          bill % turnover  
 --- ------- ------- ------------ ------------ ------------ ------------- ----------------- ----------------- 
  1   33      40-90   262.1609     £26,528.82   £89,299.98   £201,453.24   £331,000,000.00   45.0%            
  2   30      30-60   254.2270     £12,532.12   £34,534.48   £70,892.42    £114,000,000.00   45.0%            
  3   28      20-40   227.9225     £4,077.20    £11,235.44   £23,064.14    £34,600,000.00    45.0%            
  4   26      15-35   225.1253     £1,961.78    £7,035.16    £16,315.27    £20,700,000.00    45.0%            
  5   26      10-25   191.4789     £605.50      £2,632.09    £5,983.71     £7,320,000.00     45.0%            
  6   26      10-15   178.0802     £563.13      £1,085.11    £1,551.82     £2,690,000.00     45.0%            
  7   23      5-10    173.6417     £97.06       £314.32      £549.10       £686,000.00       45.0%            
  8   22      2-7     179.3699     £10.14       £100.27      £232.53       £215,000.00       45.0%            
 --- ------- ------- ------------ ------------ ------------ ------------- ----------------- ----------------- 

 TV against turnover:
 --- ------- ---------------- ----------------- ----------------- --------------- 
  T   clubs   TV per club      TV pool           turnover          TV % turnover  
 --- ------- ---------------- ----------------- ----------------- --------------- 
  1   18      £10,000,000.00   £180,000,000.00   £331,000,000.00   3.0%           
  2   18      £1,000,000.00    £18,000,000.00    £114,000,000.00   0.9%           
  3   18      £500,000.00      £9,000,000.00     £34,600,000.00    1.4%           
  4   18      £300,000.00      £5,400,000.00     £20,700,000.00    1.4%           
  5   18      £100,000.00      £1,800,000.00     £7,320,000.00     1.4%           
  6   18      £30,000.00       £540,000.00       £2,690,000.00     1.1%           
  7   18      £10,000.00       £180,000.00       £686,000.00       1.5%           
  8   18      £5,000.00        £90,000.00        £215,000.00       2.3%           
 --- ------- ---------------- ----------------- ----------------- --------------- 

 Absolute-pence thresholds against this country's wage bills:
 --- ----------------- -------------- ------------------------ ------------------------ 
  T   squad wages /wk   mid wage /wk   weeks to harshest band   scholarship : mid wage  
 --- ----------------- -------------- ------------------------ ------------------------ 
  1   £3,238,043.29     £89,299.98     0.01                     0.00x                   
  2   £1,115,217.28     £34,534.48     0.04                     0.01x                   
  3   £338,478.10       £11,235.44     0.12                     0.02x                   
  4   £202,499.87       £7,035.16      0.20                     0.04x                   
  5   £71,608.54        £2,632.09      0.56                     0.09x                   
  6   £26,315.05        £1,085.11      1.52                     0.23x                   
  7   £6,710.76         £314.32        5.96                     0.50x                   
  8   £2,103.17         £100.27        19.02                    0.50x                   
 --- ----------------- -------------- ------------------------ ------------------------ 

 Sponsorship against authored turnover (the APP's gate owns COVERAGE — this is the sponsorship lines only):
 ---- --------------- ------------ ----------------- ------- --------------- -------- 
  T    club sponsors   league pot   turnover          share   sponsor ratio   ticket  
 ---- --------------- ------------ ----------------- ------- --------------- -------- 
  T1   £2,185,500.00   £0.00        £331,000,000.00   0.7%    10000 bp        £0.00   
  T2   £2,185,500.00   £0.00        £114,000,000.00   1.9%    10000 bp        £0.00   
  T3   £669,440.00     £0.00        £34,600,000.00    1.9%    10000 bp        £0.00   
  T4   £669,440.00     £0.00        £20,700,000.00    3.2%    10000 bp        £0.00   
  T5   £156,360.00     £0.00        £7,320,000.00     2.1%    10000 bp        £0.00   
  T6   £156,360.00     £0.00        £2,690,000.00     5.8%    10000 bp        £0.00   
  T7   £115,640.00     £0.00        £686,000.00       16.9%   10000 bp        £0.00   
  T8   £115,640.00     £0.00        £215,000.00       53.8%   10000 bp        £0.00   
 ---- --------------- ------------ ----------------- ------- --------------- -------- 

 League payouts against authored turnover (POSITION is the FIRST-PLACE amount; the division pays the taper multiple of it):
 ---- ---------------- ---------------- --------------- ------- ----------------- ----------------- ------------------- ---------- ---------- 
  T    prize            position (1st)   clubs @ taper   x pot   tv pool           league total      league turnover     per club   champion  
 ---- ---------------- ---------------- --------------- ------- ----------------- ----------------- ------------------- ---------- ---------- 
  T1   £85,166,300.00   £85,166,300.00   18 @ 10%        5.50x   £180,000,000.00   £733,580,950.00   £5,958,000,000.00   12.3%      51.5%     
  T2   £29,332,210.54   £29,332,210.54   18 @ 10%        5.50x   £18,000,000.00    £208,659,368.51   £2,052,000,000.00   10.2%      51.5%     
  T3   £8,902,603.67    £8,902,603.67    18 @ 10%        5.50x   £9,000,000.00     £66,866,923.85    £622,800,000.00     10.7%      51.5%     
  T4   £5,326,130.06    £5,326,130.06    18 @ 10%        5.50x   £5,400,000.00     £40,019,845.39    £372,600,000.00     10.7%      51.5%     
  T5   £1,883,452.72    £1,883,452.72    18 @ 10%        5.50x   £1,800,000.00     £14,042,442.68    £131,760,000.00     10.7%      51.5%     
  T6   £692,146.52      £692,146.52      18 @ 10%        5.50x   £540,000.00       £5,038,952.38     £48,420,000.00      10.4%      51.5%     
  T7   £176,549.73      £176,549.73      18 @ 10%        5.50x   £180,000.00       £1,327,573.24     £12,348,000.00      10.8%      51.5%     
  T8   £55,358.09       £55,358.09       18 @ 10%        5.50x   £90,000.00        £449,827.58       £3,870,000.00       11.6%      51.5%     
 ---- ---------------- ---------------- --------------- ------- ----------------- ----------------- ------------------- ---------- ---------- 

 Authored division size against the NPC club rows that exist (the reserved player place is DETECTED, not assumed):
 --- --------------- ---------- ---------- ---------- ----------- ------- ---- 
  T   resolved size   source     npc rows   reserved   real size   drift       
 --- --------------- ---------- ---------- ---------- ----------- ------- ---- 
  1   18              authored   18         no         18          0       ok  
  2   18              authored   18         no         18          0       ok  
  3   18              authored   18         no         18          0       ok  
  4   18              authored   18         no         18          0       ok  
  5   18              authored   18         no         18          0       ok  
  6   18              authored   18         no         18          0       ok  
  7   18              authored   18         no         18          0       ok  
  8   18              authored   17         yes        18          0       ok  
 --- --------------- ---------- ---------- ---------- ----------- ------- ---- 

 Cached world pack club counts against the NPC club rows they were built from (a pack is a cache; nothing invalidates it when clubs are regenerated):
 --- ---------- ------------ ---------- ------------------ ---- 
  T   set        pack clubs   npc rows   payload v              
 --- ---------- ------------ ---------- ------------------ ---- 
  1   01a1ee92   18           18         9 (will rebuild)   ok  
  2   01a1ee92   18           18         9 (will rebuild)   ok  
  3   01a1ee92   18           18         9 (will rebuild)   ok  
  4   01a1ee92   18           18         9 (will rebuild)   ok  
  5   01a1ee92   18           18         9 (will rebuild)   ok  
  6   01a1ee92   18           18         9 (will rebuild)   ok  
  7   01a1ee92   18           18         9 (will rebuild)   ok  
  8   01a1ee92   17           17         9 (will rebuild)   ok  
 --- ---------- ------------ ---------- ------------------ ---- 

SC
--

 --- ------- ------- ------------ ------------ ------------ ------------- ----------------- ----------------- 
  T   squad   band    S_tier (p)   min /wk      mid /wk      max /wk       turnover          bill % turnover  
 --- ------- ------- ------------ ------------ ------------ ------------- ----------------- ----------------- 
  1   33      75-95   145.7126     £70,982.32   £97,060.91   £128,175.81   £331,000,000.00   45.0%            
  2   30      65-85   75.4143      £25,688.39   £36,737.25   £50,234.35    £114,000,000.00   45.0%            
  3   28      55-75   34.9231      £7,834.65    £11,895.87   £17,012.42    £34,600,000.00    45.0%            
  4   26      45-65   33.9645      £4,613.77    £7,619.60    £11,569.34    £20,700,000.00    45.0%            
  5   26      35-55   19.6255      £1,422.29    £2,665.94    £4,402.77     £7,320,000.00     45.0%            
  6   26      25-45   13.2416      £413.79      £959.64      £1,798.74     £2,690,000.00     45.0%            
  7   23      15-35   8.4365       £73.51       £263.63      £611.40       £686,000.00       45.0%            
  8   22      10-25   6.6280       £20.95       £91.10       £207.12       £215,000.00       45.0%            
 --- ------- ------- ------------ ------------ ------------ ------------- ----------------- ----------------- 

 TV against turnover:
 --- ------- ---------------- ---------------- ----------------- --------------- 
  T   clubs   TV per club      TV pool          turnover          TV % turnover  
 --- ------- ---------------- ---------------- ----------------- --------------- 
  1   3       £10,000,000.00   £30,000,000.00   £331,000,000.00   3.0%           
  2   3       £1,000,000.00    £3,000,000.00    £114,000,000.00   0.9%           
  3   3       £500,000.00      £1,500,000.00    £34,600,000.00    1.4%           
  4   3       £300,000.00      £900,000.00      £20,700,000.00    1.4%           
  5   3       £100,000.00      £300,000.00      £7,320,000.00     1.4%           
  6   3       £30,000.00       £90,000.00       £2,690,000.00     1.1%           
  7   3       £10,000.00       £30,000.00       £686,000.00       1.5%           
  8   3       £5,000.00        £15,000.00       £215,000.00       2.3%           
 --- ------- ---------------- ---------------- ----------------- --------------- 

 Absolute-pence thresholds against this country's wage bills:
 --- ----------------- -------------- ------------------------ ------------------------ 
  T   squad wages /wk   mid wage /wk   weeks to harshest band   scholarship : mid wage  
 --- ----------------- -------------- ------------------------ ------------------------ 
  1   £3,238,043.31     £97,060.91     0.01                     0.00x                   
  2   £1,115,217.28     £36,737.25     0.04                     0.01x                   
  3   £338,478.11       £11,895.87     0.12                     0.02x                   
  4   £202,499.86       £7,619.60      0.20                     0.03x                   
  5   £71,608.56        £2,665.94      0.56                     0.09x                   
  6   £26,315.06        £959.64        1.52                     0.26x                   
  7   £6,710.75         £263.63        5.96                     0.50x                   
  8   £2,103.12         £91.10         19.02                    0.50x                   
 --- ----------------- -------------- ------------------------ ------------------------ 

 Sponsorship against authored turnover (the APP's gate owns COVERAGE — this is the sponsorship lines only):
 ---- --------------- ------------ ----------------- ------- --------------- -------- 
  T    club sponsors   league pot   turnover          share   sponsor ratio   ticket  
 ---- --------------- ------------ ----------------- ------- --------------- -------- 
  T1   £2,185,500.00   £0.00        £331,000,000.00   0.7%    10000 bp        £0.00   
  T2   £2,185,500.00   £0.00        £114,000,000.00   1.9%    10000 bp        £0.00   
  T3   £669,440.00     £0.00        £34,600,000.00    1.9%    10000 bp        £0.00   
  T4   £669,440.00     £0.00        £20,700,000.00    3.2%    10000 bp        £0.00   
  T5   £156,360.00     £0.00        £7,320,000.00     2.1%    10000 bp        £0.00   
  T6   £156,360.00     £0.00        £2,690,000.00     5.8%    10000 bp        £0.00   
  T7   £115,640.00     £0.00        £686,000.00       16.9%   10000 bp        £0.00   
  T8   £115,640.00     £0.00        £215,000.00       53.8%   10000 bp        £0.00   
 ---- --------------- ------------ ----------------- ------- --------------- -------- 

 League payouts against authored turnover (POSITION is the FIRST-PLACE amount; the division pays the taper multiple of it):
 ---- ---------------- ---------------- --------------- ------- ---------------- ----------------- ----------------- ---------- ---------- 
  T    prize            position (1st)   clubs @ taper   x pot   tv pool          league total      league turnover   per club   champion  
 ---- ---------------- ---------------- --------------- ------- ---------------- ----------------- ----------------- ---------- ---------- 
  T1   £85,166,300.00   £85,166,300.00   3 @ 10%         2.70x   £30,000,000.00   £345,115,310.00   £993,000,000.00   34.8%      51.5%     
  T2   £29,332,210.54   £29,332,210.54   3 @ 10%         2.70x   £3,000,000.00    £111,529,178.99   £342,000,000.00   32.6%      51.5%     
  T3   £8,902,603.67    £8,902,603.67    3 @ 10%         2.70x   £1,500,000.00    £34,439,633.57    £103,800,000.00   33.2%      51.5%     
  T4   £5,326,130.06    £5,326,130.06    3 @ 10%         2.70x   £900,000.00      £20,606,681.22    £62,100,000.00    33.2%      51.5%     
  T5   £1,883,452.72    £1,883,452.72    3 @ 10%         2.70x   £300,000.00      £7,268,775.06     £21,960,000.00    33.1%      51.5%     
  T6   £692,146.52      £692,146.52      3 @ 10%         2.70x   £90,000.00       £2,650,942.12     £8,070,000.00     32.8%      51.5%     
  T7   £176,549.73      £176,549.73      3 @ 10%         2.70x   £30,000.00       £683,234.00       £2,058,000.00     33.2%      51.5%     
  T8   £55,358.09       £55,358.09       3 @ 10%         2.70x   £15,000.00       £219,824.93       £645,000.00       34.1%      51.5%     
 ---- ---------------- ---------------- --------------- ------- ---------------- ----------------- ----------------- ---------- ---------- 

 Authored division size against the NPC club rows that exist (the reserved player place is DETECTED, not assumed):
 --- --------------- ---------- ---------- ---------- ----------- ------- ---- 
  T   resolved size   source     npc rows   reserved   real size   drift       
 --- --------------- ---------- ---------- ---------- ----------- ------- ---- 
  1   3               authored   3          no         3           0       ok  
  2   3               authored   3          no         3           0       ok  
  3   3               authored   3          no         3           0       ok  
  4   3               authored   3          no         3           0       ok  
  5   3               authored   3          no         3           0       ok  
  6   3               authored   3          no         3           0       ok  
  7   3               authored   3          no         3           0       ok  
  8   3               authored   3          no         3           0       ok  
 --- --------------- ---------- ---------- ---------- ----------- ------- ---- 

 Cached world pack club counts against the NPC club rows they were built from (a pack is a cache; nothing invalidates it when clubs are regenerated):
 --- ---------- ------------ ---------- ------------------ ---- 
  T   set        pack clubs   npc rows   payload v              
 --- ---------- ------------ ---------- ------------------ ---- 
  1   01a1ea4c   3            3          8 (will rebuild)   ok  
  2   01a1ea4c   3            3          8 (will rebuild)   ok  
  3   01a1ea4c   3            3          8 (will rebuild)   ok  
  4   01a1ea4c   3            3          8 (will rebuild)   ok  
  5   01a1ea4c   3            3          8 (will rebuild)   ok  
  6   01a1ea4c   3            3          8 (will rebuild)   ok  
  7   01a1ea4c   3            3          8 (will rebuild)   ok  
  8   01a1ea4c   3            3          8 (will rebuild)   ok  
 --- ---------- ------------ ---------- ------------------ ---- 

PROBLEMS
--------

 * EN tier 8: S_tier (179.3699) is not LOWER than tier 7 (173.6417) — a lower division pays more per unit of ability.
 * EN: ability 5 is paid MORE at tier 8 than at tier 7 — a promoted player takes a pay cut.
 * EN: ability 7 is paid MORE at tier 8 than at tier 7 — a promoted player takes a pay cut.
 * EN tier 1: the harshest bankruptcy band (£40,000.01) is reached in 0.01 weeks of unpaid wages (£3,238,043.29/wk) — the ladder has no range left here.
 * EN tier 2: the harshest bankruptcy band (£40,000.01) is reached in 0.04 weeks of unpaid wages (£1,115,217.28/wk) — the ladder has no range left here.
 * EN tier 3: the harshest bankruptcy band (£40,000.01) is reached in 0.12 weeks of unpaid wages (£338,478.10/wk) — the ladder has no range left here.
 * EN tier 4: the harshest bankruptcy band (£40,000.01) is reached in 0.20 weeks of unpaid wages (£202,499.87/wk) — the ladder has no range left here.
 * EN tier 5: the harshest bankruptcy band (£40,000.01) is reached in 0.56 weeks of unpaid wages (£71,608.54/wk) — the ladder has no range left here.
 * EN tier 1: club + league sponsorship is 0.7% of authored turnover (£2,185,500.00 of £331,000,000.00) — outside the agreed 8-30% band.
 * EN tier 2: club + league sponsorship is 1.9% of authored turnover (£2,185,500.00 of £114,000,000.00) — outside the agreed 8-30% band.
 * EN tier 3: club + league sponsorship is 1.9% of authored turnover (£669,440.00 of £34,600,000.00) — outside the agreed 8-30% band.
 * EN tier 4: club + league sponsorship is 3.2% of authored turnover (£669,440.00 of £20,700,000.00) — outside the agreed 8-30% band.
 * EN tier 5: club + league sponsorship is 2.1% of authored turnover (£156,360.00 of £7,320,000.00) — outside the agreed 8-30% band.
 * EN tier 6: club + league sponsorship is 5.8% of authored turnover (£156,360.00 of £2,690,000.00) — outside the agreed 8-30% band.
 * EN tier 8: club + league sponsorship is 53.8% of authored turnover (£115,640.00 of £215,000.00) — outside the agreed 8-30% band.
 * EN: the tier-8 sponsorship share (53.8%) is more than 3x the tier-1 share (0.7%).
 * SC tier 1: the harshest bankruptcy band (£40,000.01) is reached in 0.01 weeks of unpaid wages (£3,238,043.31/wk) — the ladder has no range left here.
 * SC tier 2: the harshest bankruptcy band (£40,000.01) is reached in 0.04 weeks of unpaid wages (£1,115,217.28/wk) — the ladder has no range left here.
 * SC tier 3: the harshest bankruptcy band (£40,000.01) is reached in 0.12 weeks of unpaid wages (£338,478.11/wk) — the ladder has no range left here.
 * SC tier 4: the harshest bankruptcy band (£40,000.01) is reached in 0.20 weeks of unpaid wages (£202,499.86/wk) — the ladder has no range left here.
 * SC tier 5: the harshest bankruptcy band (£40,000.01) is reached in 0.56 weeks of unpaid wages (£71,608.56/wk) — the ladder has no range left here.
 * SC tier 1: club + league sponsorship is 0.7% of authored turnover (£2,185,500.00 of £331,000,000.00) — outside the agreed 8-30% band.
 * SC tier 2: club + league sponsorship is 1.9% of authored turnover (£2,185,500.00 of £114,000,000.00) — outside the agreed 8-30% band.
 * SC tier 3: club + league sponsorship is 1.9% of authored turnover (£669,440.00 of £34,600,000.00) — outside the agreed 8-30% band.
 * SC tier 4: club + league sponsorship is 3.2% of authored turnover (£669,440.00 of £20,700,000.00) — outside the agreed 8-30% band.
 * SC tier 5: club + league sponsorship is 2.1% of authored turnover (£156,360.00 of £7,320,000.00) — outside the agreed 8-30% band.
 * SC tier 6: club + league sponsorship is 5.8% of authored turnover (£156,360.00 of £2,690,000.00) — outside the agreed 8-30% band.
 * SC tier 8: club + league sponsorship is 53.8% of authored turnover (£115,640.00 of £215,000.00) — outside the agreed 8-30% band.
 * SC: the tier-8 sponsorship share (53.8%) is more than 3x the tier-1 share (0.7%).
 * bankruptcyDeductionTiers row 4 has deficitMax null behind another unbounded row — under first-match-wins it can never be reached.
 * bankruptcyDeductionTiers row 5 has deficitMax null behind another unbounded row — under first-match-wins it can never be reached.

 [ERROR] 31 check(s) failed. Do not flip the wage model until these are         
         resolved.
```

**`gate-after.txt` — the same command with the change, exit 1.**

### AFTER

```

Economy wage table
==================

 [WARNING] The live wage model is "legacy". This table is what "turnover" WOULD 
           pay — nothing generated so far was priced this way.                  

 ---------------------- ------------------------------------------------------------ 
  wage model             legacy                                                      
  weeks per season       46                                                          
  wage : turnover        60.00%                                                      
  staff share of wages   25.00%                                                      
  curve exponent k       2.5000                                                      
  reputation spread      0.00%                                                       
  priced at reputation   50 (the calibration anchor)                                 
  baseline country       resolving at parity (either the baseline, or none flagged)  
 ---------------------- ------------------------------------------------------------ 

EN
--

 --- ------- ------- ------------ ------------- ------------- ------------- ----------------- ----------------- 
  T   squad   band    S_tier (p)   min /wk       mid /wk       max /wk       turnover          bill % turnover  
 --- ------- ------- ------------ ------------- ------------- ------------- ----------------- ----------------- 
  1   33      40-90   1,021.3793   £103,356.32   £347,912.83   £784,862.05   £331,000,000.00   45.0%            
  2   30      30-60   811.0707     £39,981.75    £110,176.76   £226,170.96   £114,000,000.00   45.0%            
  3   28      20-40   731.1154     £13,078.58    £36,040.35    £73,983.67    £34,600,000.00    45.0%            
  4   26      15-35   734.6358     £6,401.77     £22,957.36    £53,240.50    £20,700,000.00    45.0%            
  5   26      10-25   632.4072     £1,999.84     £8,693.16     £19,762.72    £7,320,000.00     45.0%            
  6   26      10-15   602.5129     £1,905.31     £3,671.34     £5,250.42     £2,690,000.00     45.0%            
  7   23      5-10    621.5740     £347.47       £1,125.16     £1,965.58     £686,000.00       45.0%            
  8   22      2-7     725.6891     £41.05        £405.67       £940.79       £215,000.00       45.0%            
 --- ------- ------- ------------ ------------- ------------- ------------- ----------------- ----------------- 

 TV against turnover:
 --- ------- ---------------- ----------------- ----------------- --------------- 
  T   clubs   TV per club      TV pool           turnover          TV % turnover  
 --- ------- ---------------- ----------------- ----------------- --------------- 
  1   18      £10,000,000.00   £180,000,000.00   £331,000,000.00   3.0%           
  2   18      £1,000,000.00    £18,000,000.00    £114,000,000.00   0.9%           
  3   18      £500,000.00      £9,000,000.00     £34,600,000.00    1.4%           
  4   18      £300,000.00      £5,400,000.00     £20,700,000.00    1.4%           
  5   18      £100,000.00      £1,800,000.00     £7,320,000.00     1.4%           
  6   18      £30,000.00       £540,000.00       £2,690,000.00     1.1%           
  7   18      £10,000.00       £180,000.00       £686,000.00       1.5%           
  8   18      £5,000.00        £90,000.00        £215,000.00       2.3%           
 --- ------- ---------------- ----------------- ----------------- --------------- 

 Absolute-pence thresholds against this country's wage bills:
 --- ----------------- -------------- ------------------------ ------------------------ 
  T   squad wages /wk   mid wage /wk   weeks to harshest band   scholarship : mid wage  
 --- ----------------- -------------- ------------------------ ------------------------ 
  1   £3,238,043.30     £347,912.83    0.01                     0.00x                   
  2   £1,115,217.22     £110,176.76    0.04                     0.00x                   
  3   £338,478.10       £36,040.35     0.12                     0.01x                   
  4   £202,499.89       £22,957.36     0.20                     0.01x                   
  5   £71,608.57        £8,693.16      0.56                     0.03x                   
  6   £26,315.12        £3,671.34      1.52                     0.07x                   
  7   £6,710.74         £1,125.16      5.96                     0.22x                   
  8   £2,103.08         £405.67        19.02                    0.50x                   
 --- ----------------- -------------- ------------------------ ------------------------ 

 Sponsorship against authored turnover (the APP's gate owns COVERAGE — this is the sponsorship lines only):
 ---- --------------- ------------ ----------------- ------- --------------- -------- 
  T    club sponsors   league pot   turnover          share   sponsor ratio   ticket  
 ---- --------------- ------------ ----------------- ------- --------------- -------- 
  T1   £2,185,500.00   £0.00        £331,000,000.00   0.7%    10000 bp        £0.00   
  T2   £2,185,500.00   £0.00        £114,000,000.00   1.9%    10000 bp        £0.00   
  T3   £669,440.00     £0.00        £34,600,000.00    1.9%    10000 bp        £0.00   
  T4   £669,440.00     £0.00        £20,700,000.00    3.2%    10000 bp        £0.00   
  T5   £156,360.00     £0.00        £7,320,000.00     2.1%    10000 bp        £0.00   
  T6   £156,360.00     £0.00        £2,690,000.00     5.8%    10000 bp        £0.00   
  T7   £115,640.00     £0.00        £686,000.00       16.9%   10000 bp        £0.00   
  T8   £115,640.00     £0.00        £215,000.00       53.8%   10000 bp        £0.00   
 ---- --------------- ------------ ----------------- ------- --------------- -------- 

 League payouts against authored turnover (POSITION is the FIRST-PLACE amount; the division pays the taper multiple of it):
 ---- ---------------- ---------------- --------------- ------- ----------------- ----------------- ------------------- ---------- ---------- 
  T    prize            position (1st)   clubs @ taper   x pot   tv pool           league total      league turnover     per club   champion  
 ---- ---------------- ---------------- --------------- ------- ----------------- ----------------- ------------------- ---------- ---------- 
  T1   £85,166,300.00   £85,166,300.00   18 @ 10%        5.50x   £180,000,000.00   £733,580,950.00   £5,958,000,000.00   12.3%      51.5%     
  T2   £29,332,210.54   £29,332,210.54   18 @ 10%        5.50x   £18,000,000.00    £208,659,368.51   £2,052,000,000.00   10.2%      51.5%     
  T3   £8,902,603.67    £8,902,603.67    18 @ 10%        5.50x   £9,000,000.00     £66,866,923.85    £622,800,000.00     10.7%      51.5%     
  T4   £5,326,130.06    £5,326,130.06    18 @ 10%        5.50x   £5,400,000.00     £40,019,845.39    £372,600,000.00     10.7%      51.5%     
  T5   £1,883,452.72    £1,883,452.72    18 @ 10%        5.50x   £1,800,000.00     £14,042,442.68    £131,760,000.00     10.7%      51.5%     
  T6   £692,146.52      £692,146.52      18 @ 10%        5.50x   £540,000.00       £5,038,952.38     £48,420,000.00      10.4%      51.5%     
  T7   £176,549.73      £176,549.73      18 @ 10%        5.50x   £180,000.00       £1,327,573.24     £12,348,000.00      10.8%      51.5%     
  T8   £55,358.09       £55,358.09       18 @ 10%        5.50x   £90,000.00        £449,827.58       £3,870,000.00       11.6%      51.5%     
 ---- ---------------- ---------------- --------------- ------- ----------------- ----------------- ------------------- ---------- ---------- 

 Authored division size against the NPC club rows that exist (the reserved player place is DETECTED, not assumed):
 --- --------------- ---------- ---------- ---------- ----------- ------- ---- 
  T   resolved size   source     npc rows   reserved   real size   drift       
 --- --------------- ---------- ---------- ---------- ----------- ------- ---- 
  1   18              authored   18         no         18          0       ok  
  2   18              authored   18         no         18          0       ok  
  3   18              authored   18         no         18          0       ok  
  4   18              authored   18         no         18          0       ok  
  5   18              authored   18         no         18          0       ok  
  6   18              authored   18         no         18          0       ok  
  7   18              authored   18         no         18          0       ok  
  8   18              authored   17         yes        18          0       ok  
 --- --------------- ---------- ---------- ---------- ----------- ------- ---- 

 Cached world pack club counts against the NPC club rows they were built from (a pack is a cache; nothing invalidates it when clubs are regenerated):
 --- ---------- ------------ ---------- ------------------ ---- 
  T   set        pack clubs   npc rows   payload v              
 --- ---------- ------------ ---------- ------------------ ---- 
  1   01a1ee92   18           18         9 (will rebuild)   ok  
  2   01a1ee92   18           18         9 (will rebuild)   ok  
  3   01a1ee92   18           18         9 (will rebuild)   ok  
  4   01a1ee92   18           18         9 (will rebuild)   ok  
  5   01a1ee92   18           18         9 (will rebuild)   ok  
  6   01a1ee92   18           18         9 (will rebuild)   ok  
  7   01a1ee92   18           18         9 (will rebuild)   ok  
  8   01a1ee92   17           17         9 (will rebuild)   ok  
 --- ---------- ------------ ---------- ------------------ ---- 

SC
--

 --- ------- ------- ------------ ------------- ------------- ------------- ----------------- ----------------- 
  T   squad   band    S_tier (p)   min /wk       mid /wk       max /wk       turnover          bill % turnover  
 --- ------- ------- ------------ ------------- ------------- ------------- ----------------- ----------------- 
  1   33      75-95   679.0250     £330,779.75   £452,306.76   £597,303.11   £331,000,000.00   45.0%            
  2   30      65-85   302.9446     £103,192.14   £147,576.22   £201,795.07   £114,000,000.00   45.0%            
  3   28      55-75   122.5699     £27,497.33    £41,751.03    £59,708.61    £34,600,000.00    45.0%            
  4   26      45-65   109.7026     £14,902.12    £24,610.68    £37,368.03    £20,700,000.00    45.0%            
  5   26      35-55   62.4001      £4,522.25     £8,476.49     £13,998.83    £7,320,000.00     45.0%            
  6   26      25-45   42.5773      £1,330.54     £3,085.66     £5,783.75     £2,690,000.00     45.0%            
  7   23      15-35   27.5660      £240.21       £861.43       £1,997.75     £686,000.00       45.0%            
  8   22      10-25   21.9164      £69.30        £301.26       £684.88       £215,000.00       45.0%            
 --- ------- ------- ------------ ------------- ------------- ------------- ----------------- ----------------- 

 TV against turnover:
 --- ------- ---------------- ---------------- ----------------- --------------- 
  T   clubs   TV per club      TV pool          turnover          TV % turnover  
 --- ------- ---------------- ---------------- ----------------- --------------- 
  1   3       £10,000,000.00   £30,000,000.00   £331,000,000.00   3.0%           
  2   3       £1,000,000.00    £3,000,000.00    £114,000,000.00   0.9%           
  3   3       £500,000.00      £1,500,000.00    £34,600,000.00    1.4%           
  4   3       £300,000.00      £900,000.00      £20,700,000.00    1.4%           
  5   3       £100,000.00      £300,000.00      £7,320,000.00     1.4%           
  6   3       £30,000.00       £90,000.00       £2,690,000.00     1.1%           
  7   3       £10,000.00       £30,000.00       £686,000.00       1.5%           
  8   3       £5,000.00        £15,000.00       £215,000.00       2.3%           
 --- ------- ---------------- ---------------- ----------------- --------------- 

 Absolute-pence thresholds against this country's wage bills:
 --- ----------------- -------------- ------------------------ ------------------------ 
  T   squad wages /wk   mid wage /wk   weeks to harshest band   scholarship : mid wage  
 --- ----------------- -------------- ------------------------ ------------------------ 
  1   £3,238,043.32     £452,306.76    0.01                     0.00x                   
  2   £1,115,217.26     £147,576.22    0.04                     0.00x                   
  3   £338,478.15       £41,751.03     0.12                     0.01x                   
  4   £202,499.84       £24,610.68     0.20                     0.01x                   
  5   £71,608.56        £8,476.49      0.56                     0.03x                   
  6   £26,315.09        £3,085.66      1.52                     0.08x                   
  7   £6,710.76         £861.43        5.96                     0.29x                   
  8   £2,103.19         £301.26        19.02                    0.50x                   
 --- ----------------- -------------- ------------------------ ------------------------ 

 Sponsorship against authored turnover (the APP's gate owns COVERAGE — this is the sponsorship lines only):
 ---- --------------- ------------ ----------------- ------- --------------- -------- 
  T    club sponsors   league pot   turnover          share   sponsor ratio   ticket  
 ---- --------------- ------------ ----------------- ------- --------------- -------- 
  T1   £2,185,500.00   £0.00        £331,000,000.00   0.7%    10000 bp        £0.00   
  T2   £2,185,500.00   £0.00        £114,000,000.00   1.9%    10000 bp        £0.00   
  T3   £669,440.00     £0.00        £34,600,000.00    1.9%    10000 bp        £0.00   
  T4   £669,440.00     £0.00        £20,700,000.00    3.2%    10000 bp        £0.00   
  T5   £156,360.00     £0.00        £7,320,000.00     2.1%    10000 bp        £0.00   
  T6   £156,360.00     £0.00        £2,690,000.00     5.8%    10000 bp        £0.00   
  T7   £115,640.00     £0.00        £686,000.00       16.9%   10000 bp        £0.00   
  T8   £115,640.00     £0.00        £215,000.00       53.8%   10000 bp        £0.00   
 ---- --------------- ------------ ----------------- ------- --------------- -------- 

 League payouts against authored turnover (POSITION is the FIRST-PLACE amount; the division pays the taper multiple of it):
 ---- ---------------- ---------------- --------------- ------- ---------------- ----------------- ----------------- ---------- ---------- 
  T    prize            position (1st)   clubs @ taper   x pot   tv pool          league total      league turnover   per club   champion  
 ---- ---------------- ---------------- --------------- ------- ---------------- ----------------- ----------------- ---------- ---------- 
  T1   £85,166,300.00   £85,166,300.00   3 @ 10%         2.70x   £30,000,000.00   £345,115,310.00   £993,000,000.00   34.8%      51.5%     
  T2   £29,332,210.54   £29,332,210.54   3 @ 10%         2.70x   £3,000,000.00    £111,529,178.99   £342,000,000.00   32.6%      51.5%     
  T3   £8,902,603.67    £8,902,603.67    3 @ 10%         2.70x   £1,500,000.00    £34,439,633.57    £103,800,000.00   33.2%      51.5%     
  T4   £5,326,130.06    £5,326,130.06    3 @ 10%         2.70x   £900,000.00      £20,606,681.22    £62,100,000.00    33.2%      51.5%     
  T5   £1,883,452.72    £1,883,452.72    3 @ 10%         2.70x   £300,000.00      £7,268,775.06     £21,960,000.00    33.1%      51.5%     
  T6   £692,146.52      £692,146.52      3 @ 10%         2.70x   £90,000.00       £2,650,942.12     £8,070,000.00     32.8%      51.5%     
  T7   £176,549.73      £176,549.73      3 @ 10%         2.70x   £30,000.00       £683,234.00       £2,058,000.00     33.2%      51.5%     
  T8   £55,358.09       £55,358.09       3 @ 10%         2.70x   £15,000.00       £219,824.93       £645,000.00       34.1%      51.5%     
 ---- ---------------- ---------------- --------------- ------- ---------------- ----------------- ----------------- ---------- ---------- 

 Authored division size against the NPC club rows that exist (the reserved player place is DETECTED, not assumed):
 --- --------------- ---------- ---------- ---------- ----------- ------- ---- 
  T   resolved size   source     npc rows   reserved   real size   drift       
 --- --------------- ---------- ---------- ---------- ----------- ------- ---- 
  1   3               authored   3          no         3           0       ok  
  2   3               authored   3          no         3           0       ok  
  3   3               authored   3          no         3           0       ok  
  4   3               authored   3          no         3           0       ok  
  5   3               authored   3          no         3           0       ok  
  6   3               authored   3          no         3           0       ok  
  7   3               authored   3          no         3           0       ok  
  8   3               authored   3          no         3           0       ok  
 --- --------------- ---------- ---------- ---------- ----------- ------- ---- 

 Cached world pack club counts against the NPC club rows they were built from (a pack is a cache; nothing invalidates it when clubs are regenerated):
 --- ---------- ------------ ---------- ------------------ ---- 
  T   set        pack clubs   npc rows   payload v              
 --- ---------- ------------ ---------- ------------------ ---- 
  1   01a1ea4c   3            3          8 (will rebuild)   ok  
  2   01a1ea4c   3            3          8 (will rebuild)   ok  
  3   01a1ea4c   3            3          8 (will rebuild)   ok  
  4   01a1ea4c   3            3          8 (will rebuild)   ok  
  5   01a1ea4c   3            3          8 (will rebuild)   ok  
  6   01a1ea4c   3            3          8 (will rebuild)   ok  
  7   01a1ea4c   3            3          8 (will rebuild)   ok  
  8   01a1ea4c   3            3          8 (will rebuild)   ok  
 --- ---------- ------------ ---------- ------------------ ---- 

PROBLEMS
--------

 * EN tier 4: S_tier (734.6358) is not LOWER than tier 3 (731.1154) — a lower division pays more per unit of ability.
 * EN tier 7: S_tier (621.5740) is not LOWER than tier 6 (602.5129) — a lower division pays more per unit of ability.
 * EN tier 8: S_tier (725.6891) is not LOWER than tier 7 (621.5740) — a lower division pays more per unit of ability.
 * EN: ability 20 is paid MORE at tier 4 than at tier 3 — a promoted player takes a pay cut.
 * EN: ability 35 is paid MORE at tier 4 than at tier 3 — a promoted player takes a pay cut.
 * EN: ability 10 is paid MORE at tier 7 than at tier 6 — a promoted player takes a pay cut.
 * EN: ability 10 is paid MORE at tier 7 than at tier 6 — a promoted player takes a pay cut.
 * EN: ability 5 is paid MORE at tier 8 than at tier 7 — a promoted player takes a pay cut.
 * EN: ability 7 is paid MORE at tier 8 than at tier 7 — a promoted player takes a pay cut.
 * EN tier 1: the harshest bankruptcy band (£40,000.01) is reached in 0.01 weeks of unpaid wages (£3,238,043.30/wk) — the ladder has no range left here.
 * EN tier 2: the harshest bankruptcy band (£40,000.01) is reached in 0.04 weeks of unpaid wages (£1,115,217.22/wk) — the ladder has no range left here.
 * EN tier 3: the harshest bankruptcy band (£40,000.01) is reached in 0.12 weeks of unpaid wages (£338,478.10/wk) — the ladder has no range left here.
 * EN tier 4: the harshest bankruptcy band (£40,000.01) is reached in 0.20 weeks of unpaid wages (£202,499.89/wk) — the ladder has no range left here.
 * EN tier 5: the harshest bankruptcy band (£40,000.01) is reached in 0.56 weeks of unpaid wages (£71,608.57/wk) — the ladder has no range left here.
 * EN tier 1: club + league sponsorship is 0.7% of authored turnover (£2,185,500.00 of £331,000,000.00) — outside the agreed 8-30% band.
 * EN tier 2: club + league sponsorship is 1.9% of authored turnover (£2,185,500.00 of £114,000,000.00) — outside the agreed 8-30% band.
 * EN tier 3: club + league sponsorship is 1.9% of authored turnover (£669,440.00 of £34,600,000.00) — outside the agreed 8-30% band.
 * EN tier 4: club + league sponsorship is 3.2% of authored turnover (£669,440.00 of £20,700,000.00) — outside the agreed 8-30% band.
 * EN tier 5: club + league sponsorship is 2.1% of authored turnover (£156,360.00 of £7,320,000.00) — outside the agreed 8-30% band.
 * EN tier 6: club + league sponsorship is 5.8% of authored turnover (£156,360.00 of £2,690,000.00) — outside the agreed 8-30% band.
 * EN tier 8: club + league sponsorship is 53.8% of authored turnover (£115,640.00 of £215,000.00) — outside the agreed 8-30% band.
 * EN: the tier-8 sponsorship share (53.8%) is more than 3x the tier-1 share (0.7%).
 * SC tier 1: the harshest bankruptcy band (£40,000.01) is reached in 0.01 weeks of unpaid wages (£3,238,043.32/wk) — the ladder has no range left here.
 * SC tier 2: the harshest bankruptcy band (£40,000.01) is reached in 0.04 weeks of unpaid wages (£1,115,217.26/wk) — the ladder has no range left here.
 * SC tier 3: the harshest bankruptcy band (£40,000.01) is reached in 0.12 weeks of unpaid wages (£338,478.15/wk) — the ladder has no range left here.
 * SC tier 4: the harshest bankruptcy band (£40,000.01) is reached in 0.20 weeks of unpaid wages (£202,499.84/wk) — the ladder has no range left here.
 * SC tier 5: the harshest bankruptcy band (£40,000.01) is reached in 0.56 weeks of unpaid wages (£71,608.56/wk) — the ladder has no range left here.
 * SC tier 1: club + league sponsorship is 0.7% of authored turnover (£2,185,500.00 of £331,000,000.00) — outside the agreed 8-30% band.
 * SC tier 2: club + league sponsorship is 1.9% of authored turnover (£2,185,500.00 of £114,000,000.00) — outside the agreed 8-30% band.
 * SC tier 3: club + league sponsorship is 1.9% of authored turnover (£669,440.00 of £34,600,000.00) — outside the agreed 8-30% band.
 * SC tier 4: club + league sponsorship is 3.2% of authored turnover (£669,440.00 of £20,700,000.00) — outside the agreed 8-30% band.
 * SC tier 5: club + league sponsorship is 2.1% of authored turnover (£156,360.00 of £7,320,000.00) — outside the agreed 8-30% band.
 * SC tier 6: club + league sponsorship is 5.8% of authored turnover (£156,360.00 of £2,690,000.00) — outside the agreed 8-30% band.
 * SC tier 8: club + league sponsorship is 53.8% of authored turnover (£115,640.00 of £215,000.00) — outside the agreed 8-30% band.
 * SC: the tier-8 sponsorship share (53.8%) is more than 3x the tier-1 share (0.7%).
 * bankruptcyDeductionTiers row 4 has deficitMax null behind another unbounded row — under first-match-wins it can never be reached.
 * bankruptcyDeductionTiers row 5 has deficitMax null behind another unbounded row — under first-match-wins it can never be reached.

 [ERROR] 37 check(s) failed. Do not flip the wage model until these are         
         resolved.
```

