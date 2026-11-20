<!-- STATUS: ✅ DONE, COMMITTED ON BOTH BRANCHES, NOT DEPLOYED (2026-11-20) -->

# A27 — the scout age gate now works, and scouts are visibly better for it

**Owner ruling, 2026-11-20**, asked whether scouting accuracy should vary by the player's age:
**"Yes, it should."** It now does.

**Branches:** backend `development`, app `new-game-save`. **Committed on both, nothing pushed,
nothing deployed.**

---

## 1. The headline the owner asked for

A real scout from the dev database — `01a0e9cd-b789-76a3-9073-5d53c75bfca0`, **Julio Russo**,
experience 25, judgements `potential 42, technical 68, physical 17, mental 86, personality 56,
youth 79, senior 28`. Chosen because youth 79 against senior 28 makes him genuinely good with
prospects and genuinely poor with established pros — exactly the variation the gate exists to
express.

Figures below are from running the **real** `scoutAccuracyPercent` and `applyScoutNoise` out of
`src/engine/scoutNoise.ts`, not re-derived by hand, with no scouting facilities:

| player age | gate key | gate before | gate after | **displayed accuracy before** | **displayed accuracy after** | error band before | error band after |
|---|---|---|---|---|---|---|---|
| **17** | `youth` | 0 | 79 | **29%** | **53%** | ±6 | **±4** |
| **25** | `senior` | 0 | 28 | **29%** | **38%** | ±6 | **±5** |

- **Before: 29% at both ages.** Identical. The gate was dead, so age could not matter.
- **After: 53% at 17, 38% at 25 — 15 points apart.** Accuracy varies by age, which is the ruling.
- The error band on his potential read tightens from ±6 to ±4 for the 17-year-old. He is now
  measurably better at reading a prospect than a senior, which is what his judgements always said
  and nothing ever acted on.

⚠️ **Tell the owner this before they see it: scouts get visibly BETTER across the board.** That is
the fix landing, not a buff and not inflation. Every scout in the game had been running at 70% of
its designed displayed accuracy with its noise band never tightened; both are now applied as
designed.

---

## 2. What was actually wrong

`ageGateFor()` reads `judgements.youth` for a player under 18 and `judgements.senior` at 18 and
above. `ScoutGenerationService::build()` wrote five keys — `potential`, `technical`, `physical`,
`mental`, `personality` — and is **the only path that has ever written a persisted scout** (the
shared pool and club/world-pack scouts both go through it). All 5,278 scouts on dev carried exactly
those five.

**So the function's `: 0` fallback was the only branch that had ever executed, for every scout in
every save, since the day it was written.** With `AGE_GATE_WEIGHT = 0.3` that fed two places:

| site | formula | effect of the permanent 0 |
|---|---|---|
| `scoutNoise.ts:135`, displayed accuracy | `potential × 0.7 + ageGate × 0.3` | every scout's shown accuracy was **70% of designed** — a perfect 100-potential scout displayed 70% |
| `scoutNoise.ts:92`, the real noise band | `(1 − catAcc) × spread × (1 − ageGateAcc × 0.3)` | the band was **never tightened**; reports up to 30% less accurate than designed |

Display and behaviour agreed with each other, which is precisely why nothing ever looked broken.
There was no second defect hiding behind it.

---

## 3. The decision I was asked to make and state

**`youth` and `senior` roll from the existing `PoolConfig::$scoutJudgementMin/Max` (15–90 on dev).
They get no bounds of their own.** Three reasons, in order of weight:

1. **A separate `scoutAgeGateMin/Max` would be a second config surface for one quantity** — new
   entity fields, a new admin control, a new thing to disagree with the first. That is the governing
   defect of this whole workstream, and the brief was explicit about not creating another one.
2. **A26's 70/30 ruling was measured against judgements drawn from this one flat global range.**
   `ScoutAbilityCalculator`'s docblock records the measurement: tier 1 vs tier 8 at a judgement mean
   of ~52.5 either side, giving a 42-point ability spread. Banding two of seven keys differently
   would move that spread without anything saying so — the owner would have approved one number and
   got another.
3. **The dial already exists.** `scoutJudgementMin/Max` is admin-editable, so if the owner later
   wants age reads generally sharper or blunter, that is a config change, not a code change.

**And they are rolled independently** of each other and of `potential`. This is the part the brief
was right to insist on: deriving `youth` from `potential` collapses the displayed-accuracy blend to
`potential × 0.7 + potential × 0.3` = `potential`, so the gate would do **nothing** for exactly the
under-18s it exists for. A cheap fix that changes nothing where it counts is worse than no fix.
Pinned by `testTheAgeBandJudgementsAreIndependentRollsWithinTheConfiguredBounds()`.

---

## 4. The A26 interaction — the thing I was told to get right

`ScoutAbilityCalculator` blends `0.7 × experience + 0.3 × mean(judgements)`, and **the mean is
taken over the keys PRESENT**. Five keys to seven therefore moves every scout's judgement mean,
every scout's `ability`, and — once A24 lands — every scout's **wage**.

**Handled as one deliberate step, three ways:**

**a) The re-derivation is IN the migration, not behind it.** `Version20261120120000` writes the two
keys and re-derives `ability` for every row in the same migration, using SQL copied verbatim from
A26's `Version20261120100000`. Writing the keys alone would have left the stored `ability`
disagreeing with the formula that owns it — one quantity, two sources, nothing saying which is
right. The column is never in that state for a moment.

**b) The backfill was re-run anyway, and it is the proof.**

```
app:backfill-scout-abilities --force --dry-run  →  0 of 5278 scout(s) would have ability re-derived
app:backfill-scout-abilities --force            →  0 of 5278 scout(s) had ability re-derived
```

**0 of 5,278** is the end-to-end check that the migration's Postgres `NUMERIC` arithmetic and
`ScoutAbilityCalculator`'s PHP integer path agree on every row with the new seven-key judgements —
the same check A26 used, and the thing that caught a 6-row floating-point disagreement last time.

**c) The distribution, before and after, measured on dev:**

| | scouts | min | max | mean | sd |
|---|---|---|---|---|---|
| **before** (5 keys, after A26) | 5,278 | **11** | **48** | 29.13 | 6.90 |
| **after** (7 keys, A27) | 5,278 | **12** | **47** | 29.11 | 6.76 |

**The movement is small and it is explainable, which is the reassuring part.** The two new keys are
drawn from the same 15–90 distribution as the other five, so the *mean* barely moves (29.13 →
29.11). The *spread* narrows slightly (sd 6.90 → 6.76, range 11–48 → 12–47) because a mean of seven
draws has less variance than a mean of five — the judgement half of the blend got marginally more
stable. No scout moved by more than a point or two.

**d) A26's five-key pin was changed deliberately, with the ruling quoted.**
`ScoutGenerationServiceTest::testJudgementsAreTheFiveAuthoritativeKeys()` is now
`…testJudgementsAreTheSevenAuthoritativeKeys()`. It was **not** deleted and **not** quietly edited:
its docblock now records that it held five keys until this ruling, quotes the ruling, says it was
changed *on* the ruling rather than because it was in the way, and restates what it still guards —
that a key change here moves every ability and every wage, so it needs `--force` and a pack bump
behind it. It did its job: A27 could not land without coming through it.

**e) Does the moved `ability` move any LIVE wage? No — and I resolved this rather than assuming
it.** Prompted by the PM session's correction that `incomeAnchoredWages` is **ON**, not off
(`economyConfig.ts:187` resolves `config.incomeAnchoredWages ?? (baseline?.wageModel ===
'turnover')`, and the live baseline is `turnover`), I traced every live wage path that could see a
scout's ability, through the code rather than through a default:

- **Backend.** `ScoutWageCalculator::weeklyWageFor()` interpolates on **`experience`** only
  (`weeklyWageForScout()` passes `$scout->getExperience()`). A27 does not touch `experience`.
- **App, income-anchored staff pricing.** `staffWagePence` *is* live (the flag resolves true), but
  `ampStaffWagePence` / `npcStaffWagePence` build the `shape` array from **`coachingAbility`**
  only — `useCoachStore`'s coaches and `club.staff`, both filtered on `a > 0`. A `Scout` has no
  `coachingAbility`, so **no scout's ability is in that shape**, and scouts sit in the pack's own
  `scouts[]` array rather than `staff[]`.
- **App, scout market anchoring.** `marketStore.ts:214-217` anchors fresh scout wages via
  `anchorStaffWages(…, (s) => s.experience)` — it passes **`experience`**, not `ability`.

**So A27 moves no wage anywhere today.** A24 remains the change that points a scout wage at
`ability`, and when it lands the distribution recorded above is what it will be pricing against.

🔴 **A FINDING I DID NOT FIX, BECAUSE IT IS A24's, AND IT SHOULD NOT BE LOST.**
`marketStore.ts:216` passes a scout's `experience` into a parameter named **`abilityOf`**, whose
downstream parameter in `ClubWageScaleService` is named **`ability`**. That is the
experience-as-ability conflation A26 exists to remove, still live in the scout market anchoring
path — a fourth site beyond the three A26 named. It matters more than a naming slip, because the
two quantities now have genuinely different ranges: pool-scout `experience` is 4-34 on dev while
`ability` is 12-47, so the anchored wage curve is being fed career length on an ability-shaped
scale. **A24 should re-point this at `ability` in the same change that prices the wage off it**,
and should expect scout market wages to move when it does. I left it alone deliberately: changing
it would move a live wage, which is outside A27's scope and is exactly the kind of quiet
side-effect this brief told me not to create.

---

## 5. The app needed nothing, and verifying that was the work

**No functional app change.** Checked rather than assumed:

- `ScoutJudgements` already declared all seven keys as a `Partial`.
- `ageGateFor` already read both, with the `age < 18` split already correct.
- Every ingest path passes `judgements` through **wholesale** — `useInitFlow`,
  `api/endpoints/market.ts`, `marketStore`. **No key whitelist anywhere**, so two more keys simply
  arrive. Backend serializers (`WorldPackSnapshotBuilder`, `MarketDataService`) likewise pass the
  array through with no key list.
- `profileLogic.ts`'s `SCOUT_JUDGEMENTS` already lists all seven and filters on `!= null`, and
  `judgementKind()` already classifies `youth`/`senior` as `'ageBand'` — so **the two new rows
  appear on the scout profile card by themselves.**
- ⚠️ **The i18n keys already existed**, and this was the one real chance of a silent break: a row
  that auto-appears with no catalog entry renders the raw key to the player.
  `screen.staffProfile.scout.row.youth` = "Judges youth" and `…senior` = "Judges seniors" are both
  present. **No catalog change, so no `i18n:apply-overrides` run.**

**What did change in the app: four docblocks that described the defect as live.** Left alone they
would have become documentation of the losing side of a disagreement between the two repos — the
exact pattern this workstream exists to remove, and the thing that bit three times today.
`scoutNoise.ts`'s `ageGateFor`, `types/market.ts`'s `ScoutJudgements`, `types/world.ts`'s
`WorldScout.judgements`, and the "malformed judgements" describe block in `scoutNoise.test.ts`.

⚠️ **`scoutNoise.test.ts:119-122` is KEPT and annotated.** A five-key blob was *every scout in the
game* until today, so that case was the normal path, not an edge one. It is now genuinely
exceptional — a pack cached at v12 or earlier, or a hand-edited blob — which is exactly when a
silent `NaN` is hardest to trace: it survives `Math.max/min` and binds to SQLite as NULL, failing
`scouting_reports.accuracy_percent NOT NULL`. **The `: 0` fallback stays load-bearing; what changed
is that it is no longer the only branch.** Its annotation says not to delete it on the grounds that
the keys now always arrive — they always arrive on a *current* pack.

---

## 6. The pack bump, and why it is not the census rule being broken

**`WORLD_PACK_VERSION` 12 → 13**, as the brief anticipated. Judgements ride in the world pack, so a
pack cached at v12 carries five keys and would keep the feature dead on any device it reached.
**The bump is what actually delivers the fix.**

**Legitimate under the pack-is-a-census rule:** two more per-scout accuracy ratings on the 0–100
scale the other five already use is **ability-shaped census content, not money** — the same class as
the v12 `ability` bump, and as v9 (scout experience banded) and v10. No amount enters the pack. The
census rule bans prices from the pack; it does not freeze the census. Said in the commit message so
nobody reads this as the rule being bent.

One thing worth flagging plainly: **`scouts[].ability` moves on this bump under an unchanged key.**
That is sanctioned here rather than a break — the figure's definition and type are unchanged, its
inputs grew — and it is recorded that way in `WORLD_PACK_VERSION`'s own docblock, beside v12's note
that re-pointing `scouts[].tier` at `ability` *would* be a break.

---

## 7. Migration notes worth carrying forward

**No DDL.** `scout.judgements` is a `json` column, so `Version20261120120000` is a **data migration
only**. ⚠️ It therefore needed **no hand-application to the untracked `wunderkind_test` database**,
unlike A26's column add — which is the exception to that trap, not a repeal of it.

Three things recorded in the migration's own docblock so they are not "tidied" later:

- ⚠️ **`jsonb_exists(x, 'key')` instead of the `?` operator, and not as a style choice.** DBAL's SQL
  parser treats a bare `?` as a positional bind placeholder, so the operator form reaches Postgres
  as `… jsonb $1 'youth'` and the migration dies on a syntax error. **This cost a failed first
  run** — worth knowing for any future jsonb migration in this repo.
- **It is not reproducible.** `random()` rolls each scout's two values, exactly as `random_int()`
  does at generation. Guarded by `NOT jsonb_exists(…)` on both keys, so it is idempotent and a
  partial run can be repeated without re-rolling anyone's values.
- **It normalises `judgements` key order** (the `jsonb` round-trip needed for `||` sorts keys
  alphabetically). Nothing reads these by position: the mean is order-independent, the app selects
  by name, and the only key-order assertion anywhere checks a freshly built entity and never touches
  the database.

`down()` strips both keys and re-derives `ability` over the remaining five, so the column still
agrees with the formula after a rollback. The rolled values themselves are not recoverable, which is
true of every generated figure in this schema.

---

## 8. Verification

