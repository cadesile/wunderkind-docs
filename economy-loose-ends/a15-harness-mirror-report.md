<!-- STATUS --> **STATUS:** ✅ A15. ✅ DEPLOYED (re-verified 2026-11-20: an ancestor of `origin/dev`). ⚠️ Its §0.1 corrects the brief's §4 premise and its §0.2 answers §3 with a fourth option the brief did not list — read both before trusting any earlier write-up of this chain.

---

# A15 — the harness's copy of the backend's reference squad is DELETED, not repaired

**App only (`wunderkind-app`), branch `new-game-save`. Committed, NOT pushed. 2026-11-19.**

| | |
|---|---|
| Branch | `new-game-save`, on top of `0964fedc` |
| Commit | **`c65bfa91`** — "Derive the harness's turnover wage from the budget, not from a copy of the squad". Local only |
| Files changed | `src/economy/harness/loadExport.ts`, `src/__tests__/economy/loadExport.test.ts` (+4 tests), `src/__tests__/economy/__fixtures__/starterConfig.json` (+9 lines), `.context/stages/02_architecture/output/structure.md`, `.context/shared/last-sync.md` |
| Authored economy figures changed | **none** |
| `wunderkind-backend` | **read only.** Nothing written, nothing run. A18 was working there throughout |
| `ENGLAND_DEV` / `referenceSquadSize` | **not re-authored** (brief §6) |

**`*-correction.md` / `*-addition.md` newer than my brief: none.** `a4-premise-correction.md` and
`a3-tvdeal-addition.md` both predate it. The only docs-folder files newer than the brief are
`a14-fanbase-report.md` and `a18-fanbase-backend-brief.md`, neither of which touches the wage scale.

---

## 0. 🔴 READ FIRST — THE BRIEF'S §4 PREMISE IS WRONG, AND §3's THREE OPTIONS ARE NOT EXHAUSTIVE

### 0.1 🔴 The invariant does NOT "become constant at a new value". It contains no σ, and it cannot tell a right squad from a wrong one

The brief's acceptance test is:

> 🟢 **If your mirror is correct, the ratio becomes CONSTANT ACROSS ALL EIGHT TIERS AGAIN, at a new
> value. If it does not, the mirror is wrong.**

**The "at a new value" half is false, and the "if it does not, the mirror is wrong" half is a
one-way implication being read as an equivalence.** Substitute the resolver's own definition:

```
scale  = round(playerBudget × UNIT / (weeks × σ))              EconomyScaleResolver.php:301

scale × σ / turnoverPence
     = (playerBudget × UNIT / (weeks × σ)) × σ / turnoverPence
     = UNIT × (playerBudget / turnoverPence) / weeks
     = UNIT × wageToTurnoverRatio × (1 − staffWageShare) / weeks
     = 1,000,000 × 0.60 × 0.75 / 46
     = 9782.608696
```

**σ cancels.** A10's own §0.2 says this outright — *"That constant is `UNIT × wageRatio ×
(1 − staffShare) / weeks`"* — and then predicts a new value anyway, which is where the brief
inherited it. A10 changed none of `UNIT`, `wageToTurnoverRatio`, `staffWageShare` or `weeks`, so a
correct mirror restores **exactly 9782.608696**, not a new constant. There is no new value to record,
which disposes of the brief's "do not update the documented constant" warning: the constant was never
going to move.

Two consequences that matter more than the arithmetic:

1. **The invariant is a drift detector, not a derivation check.** It is flat iff the app's `Σ aᵏ`
   equals the σ that produced *that export's* scale. It says nothing about whether either is the
   right squad — price the squad at `a^k × 1000` and it stays flat. So it could never have
   validated a mirror; it could only have noticed the two copies disagreeing, which is what it did.
2. 🔴 **It therefore also never proved `floor` over `round`.** The brief asks that proof to survive.
   It does not need to: the tier-7 split (9782.608696 floored, 10297.894068 rounded) arose because
   the squad SIZE appears on both sides of the division — in the app's `Σ` and in the backend's σ —
   so mis-sizing the app's copy showed up as a mismatch. That is still a true observation about the
   *old* arrangement, but it is weaker than the direct reading, which I took from source:

   ```php
   // src/Service/Economy/EconomyScaleResolver.php:518-543
   public function npcSquadRow(int $tier): array
   {
       $row = $this->starterConfigRepository->getConfig()->getNpcSquadConfig()[(string) $tier] ?? null;
       return is_array($row) ? $row : [];
   }
   private function referenceSquadSize(int $tier): int
   {
       ...
       return max(1, intdiv(min($min, $max) + max($min, $max), 2));
   }
   ```

   `intdiv` truncates, and it reads the **same** `starter_config.npc_squad_config` that
   `GameConfigController.php:301` publishes to the app as `npcSquadConfig`. So
   `Math.floor((playerMin + playerMax) / 2)` is the backend's own expression over the backend's own
   row — not an estimate of it, and not a preference. `round` is not "equally valid"; it is a
   different function from `intdiv`. The proof is stronger after this pass than before it.

### 0.2 🔴 §3's (a) / (b) / (c) are not exhaustive, and the right answer is none of them

**The harness does not need the abilities.** It needs one number per tier —
`turnoverAvgWeeklyPence`, the average weekly wage under the turnover model — and by the identity in
§0.1 that number is

```
turnoverAvgWeeklyPence = playerBudget / (weeks × referenceSquadSize)
```

for **any** σ whatsoever. Every term is published, and the harness already has all of them in hand.
So the mirror is **deleted**, not repaired. Full argument and the rejection of (a), (b) and (c) in §3.

### 0.3 ⚠️ "The economy gate MUST move" — against the only export that exists, it must NOT, and it does not

Brief §5.4 requires the gate to move by roughly A10's 3.18–4.66. **It is the other way round.** The
gate reads an export, and the only exports that exist are pre-A10 (A10 is committed but not deployed,
and I may not run the backend). Against a pre-A10 export the app's figure is *already* correct, so a
correct fix must leave it alone — and it does, to **within one penny at three tiers of eight** (§5.3).

The 3.2–4.7× movement is what the fix **prevents**, and prevention is only demonstrable against a
post-A10 export. I built one by projection (§5.2) and ran the gate four times. Without the fix the
projected export takes the gate to **191–243% wage share, every tier insolvent in season 1**. With
the fix the projected run is **byte-identical** to the pre-A10 run. That is the real acceptance test
and it is stronger than the one in the brief, because it shows the figure is now *invariant* under
exactly the backend change that broke it.

### 0.4 ⚠️ Two factual errors inherited from A10, both checked

- 🔴 **`wageToTurnoverRatioBp` and `staffWageShareBp` are NOT on `GET /api/game-config`.** A10 §9's
  on-device check spec lists both under "`GET /api/game-config?country=XX` — same payload". They are
  not there: the game-config payload has 179 top-level keys and neither is among them, and
  `economyTierBaseline` carries only `country`, `tierCount`, `wageModel`, `weeksPerSeason`,
  `wageCurveExponentBp`, `reputationSpreadBp`, `wageScaleUnit`, `tiers`, `sponsorBandsPence`,
  `source`. They are on the **unauthenticated `GET /api/starter-config`**, inside `economy`
  (`EconomyConfigPublisher::publicBlock()`, lines 113–117). Anyone implementing A10's check must read
  them from there. This pass does.
- ⚠️ **A10's σ_old / S_tier / player-budget columns belong to a box whose
  `starter_config.npc_squad_config` is not the one the live export publishes.** A10 reports EN
  reference-squad sizes 33/30/28/26/26/26/23/22; the live export publishes
  `npcSquadConfig` midpoints 26/23/21/20/19/18/17/17, and the published
  `wageScaleMicroPence` is consistent with the latter to ten significant figures on **both**
  captured exports (§4). A10's figures reproduce exactly at sizes 33 and 22 (σ EN T1 = 1,235,135.71
  at n=33 against 973,893.05 at n=26; σ EN T8 = 1,172.58 at n=22 against 901.51 at n=17 — computed
  below), and its EN T1 budget of £148,950,000 corresponds to a turnover of £331M, which is
  starter-config's `baselineTurnoverPence[0]`, not the 38.87bn pence the export's tier row carries.
  This is the split `fixtures.ts:136-157` already documents — *"[T] measured against a development
  clone whose tier-1 squad is 33; [R] derived against dev's own squad of 26"* — i.e. A10 measured on
  a local Lando DB and the exports came from the deployed dev API. **It does not affect this pass:**
  the only A10 figures I use are the σ_old/σ_new *ratios*, which are a density-weighted average of
  `(rung / E[ability])ᵏ` over the same band and so are near-independent of how many rungs sample it.
  Flagged for the PM in §7, not re-litigated.

---

## 1. The change

`src/economy/harness/loadExport.ts`:

| what | before | after |
|---|---|---|
| `referenceSquad()` | *"Evenly spaced INTEGER abilities across a band, matching the backend's reference squad."* Used for BOTH per-tier averages | renamed **`potentialBandSpread()`** with a docblock saying it is a spread of POTENTIALS and explicitly not the backend's squad. Used for the LEGACY average only |
| `turnoverAvgWeeklyPence` | `Σ weeklyWageRange({ability, economy}).expectedPence / n` over that squad | **`turnoverAverageWeeklyPence()`** — `playerBudget / (weeks × referenceSquadSize)`, with the resolver's own two truncating integer divisions |
| the two dials | not read; `fixtures.ts`'s `WAGE_TO_TURNOVER_BP` / `STAFF_WAGE_SHARE_BP` constants | READ from `starter.economy.wageToTurnoverRatioBp` / `staffWageShareBp`, and **REFUSED** if absent rather than falling back to those constants |
| `weeksPerSeason` | not used in this path | read from `economyTierBaseline`; a zero or absent value is **refused** rather than producing `Infinity` |
| imports | `resolveEconomy`, `weeklyWageRange` | both dropped — the turnover branch no longer prices anybody |
| the floor comment | the `9782.608696` behavioural proof | the backend source, quoted: `intdiv(min + max, 2)` over the same published row (§0.1) |

**Four tests added** to `src/__tests__/economy/loadExport.test.ts`:

1. `refuses a starter-config with no wage:turnover / staff-share dials`
2. `refuses an export with no weeksPerSeason rather than dividing by zero`
3. `DERIVES the turnover average from the authored budget, not from a squad of abilities` — pins the
   figure to the resolver's two `intdiv`s at all eight tiers
4. `puts the reference squad on exactly the authored player share of turnover` — the replacement
   invariant (§4.3)

`src/__tests__/economy/__fixtures__/starterConfig.json` gained the real `economy` block, copied
verbatim from `starter-config.LIVE.json` (the fixture file's own rule: real trimmed responses, not
hand-written shapes). Nine added lines, no reformatting.

---

## 2. ✅ §2 — the comment was false. Fixed, and the function renamed so it cannot read as a mirror again

The brief was right and the code confirms it. `EconomyScaleResolver::referenceSquadAbilitySum()`
now reads, in its own docblock:

> *"until 2026-11-19 this sum was built from potentials while every wage it priced was paid on
> current ability … The fix is to ask the generator what it would actually make. Each member is
> still a rung on an even spread of POTENTIALS across the authored band … and is then mapped
> through `PlayerGenerationService::expectedCurrentAbility()` before being raised to k."*

So the app's function produced the backend's **input** and called itself the backend's **output**.
Renaming it was the point: a comment can be skipped, a name is at every call site. `tsc` confirms
there are exactly two callers left and one of them is gone.

A10 measured how far apart the two now are (its §4.1): EN T1 rung 40 → 25.38 (63.5%), rung 90 →
47.46 (52.7%); EN T8 rung 2 → 1.00 (50.0%), rung 7 → 4.22 (60.2%). **The realised fraction is
neither constant nor monotonic in the rung**, which is also why no scalar correction factor could
have stood in for the mapping.

---

## 3. 🔴 §3 ANSWERED — (a) is infeasible, (b) is unnecessary, (c) is unnecessary, and the mirror is deleted

### 3.1 The quantity, stated precisely

`turnoverAvgWeeklyPence` is *"the average weekly wage a reference-squad player is paid under the
turnover model"*. The resolver DEFINES the scale so that squad costs the authored player budget:

```php
// EconomyScaleResolver.php:282-302 — verbatim
$sigma = $this->referenceSquadAbilitySum($config, $country, $tier);
$weeks = $config->getEconomyWeeksPerSeason();
$wageBudget   = intdiv($turnoverPence * $config->getEconomyWageToTurnoverRatioBp(), self::BP);
$playerBudget = intdiv($wageBudget * (self::BP - $config->getEconomyStaffWageShareBp()), self::BP);
return (int) round(($playerBudget * self::WAGE_SCALE_UNIT) / ($weeks * $sigma));
```

and a member's wage is `trunc(round(scale × aᵏ) / UNIT)` (`WageModelResolver::turnoverPlayerPence`,
mirrored operation-for-operation in `src/economy/wages.ts:193-220`). Summing over the squad:

```
Σ wage(aᵢ)  ≈  scale × Σ aᵏ / UNIT  =  scale × σ / UNIT  =  playerBudget / weeks
```

**The abilities cancel.** The average is `playerBudget / (weeks × referenceSquadSize)` — and the
`turnoverPence` the resolver was handed is the same one it publishes in the tier row
(`EconomyScaleResolver.php:153` assigns `$turnoverPence`, line 162 publishes it, line 163 passes the
same variable to `wageScaleMicroPence()`), so there is no second turnover to get wrong.

### 3.2 Why (a) — reimplement the maturation chain in TS — is not merely undesirable but **infeasible**

The brief calls (a) "the exact duplication this workstream exists to end", which is true but
understates it. **The app does not have the inputs.** `expectedCurrentAbility()` reads, per A10's
own §1.1 table:

| input | where it lives | published to the app? |
|---|---|---|
| `ABILITY_TARGET_BANDS` (maturation) | `PlayerGenerationService` const | **no** |
| `PRODIGY_BAND` / `_AGE_MIN` / `_AGE_MAX` / `_PERCENT` | same class | **no** |
| `PoolConfig::abilityCeilingFractionForAge()` | DB row | **no** |
| `POSITION_ATTRIBUTE_FRACTIONS` | `PlayerGenerationService` const | **no** |
| `capBounds()` | same class | **no** |
| `HEIGHT_RANGE` / `GK_HEIGHT_BONUS` / `WEIGHT_RANGE` / `WEIGHT_SPAN` | same class | **no** |
| `PersonalityGeneratorService::expectedTraits()` + `applyCorrelations()` + mould weights | two services | **no** |
| `PoolConfig::firstTeamAgeRange()` | DB row | **no** |
| PoolConfig position weights | DB row | **no** |

Nine inputs, none of them in the 179 keys of `GET /api/game-config` or the 24 of
`GET /api/starter-config`. So (a) is not "copy a table into TypeScript" — it is *publish nine
backend-private inputs and then copy four services into TypeScript*. It would be a backend change
**and** the duplication, which is strictly worse than (b). Rejected.

### 3.3 Why (b) — the backend publishes the abilities or σ — is RIGHT but not needed for this

(b) is the correct answer to the question *"how does an app-side reader get the backend's reference
squad?"*, and A10 already made `EconomyScaleResolver::referenceSquadAbilities()` public, so it is a
small publish. **It is simply not the question the harness asks.** The harness wants an average
wage, and §3.1 shows that average is independent of the abilities. Asking the backend to publish
them to compute a figure that does not depend on them would add a wire field, a cache-invalidation
surface and a second thing to keep in step, to arrive at the same number.

**(b) remains the right fix for the two things that genuinely do need the abilities**, both flagged
in §7 and neither in my scope: the LEGACY average (§3.5), and restoring a check that the app and
backend agree about the squad at all (§4.4).

### 3.4 Why (c) — invert the published scale to recover σ — is unnecessary

The brief's objection is correct as far as it goes (it makes the invariant true by construction, and
the harness would still lack the abilities), but it is moot: recovering σ requires `playerBudget`,
and once you have `playerBudget` you have the answer directly. σ is an intermediate that the
identity removes. Rejected as redundant rather than as wrong.

### 3.5 The one place the abilities ARE still needed — and I left it, honestly labelled

`legacyAvgWeeklyPence` has no budget anchor to derive from. That absence **is** the failure the
harness exists to demonstrate, so legacy must price a squad, and the only squad this repo can build
is the band spread. So it keeps it — with the label the brief asked for:

> ⚠️ **So `legacyAvgWeeklyPence` prices what the tier's players will EVENTUALLY be worth, not what
> they are worth.** The game pays legacy wages on current ability too, so the figure runs high —
> roughly 1/0.55 before the `wageMultiplierTiers` band jumps, which push the same way. That was
> already true before A10 and A10 did not change it.

**This is a pre-existing defect A10 did not cause and this pass does not fix.** It biases the
harness's legacy figures **upward**, i.e. in the direction of the harness's own conclusion that
legacy is broken. The conclusion does not rest on the level (`fixtures.ts:136-157` already argues it
is a claim about SHAPE), but the bias runs the convenient way and should be recorded as such. Fixing
it needs (b). §7.

### 3.6 ⚠️ What the deletion costs, stated plainly

| lost | why it cannot be kept |
|---|---|
| the turnover average no longer runs through `weeklyWageRange` | there is no squad to run through it; if `src/economy/wages.ts` drifted from `WageModelResolver`, this file would no longer notice |
| it no longer reads `wageCurveExponentBp` or the ability band | both cancel out of the identity |
| the `9782.608696` cross-repo agreement check | nothing app-side can compute σ (§3.2). (§0.1: it could not validate a mirror anyway — only detect disagreement) |

All three are restored by (b) and only by (b). **I did not keep a vestigial copy of the squad to
preserve them**, because a check that is permanently red after a correct backend change is worse
than no check: the next reader deletes it and learns nothing.

---

## 4. 🟢 §4 — THE EIGHT VALUES, BEFORE AND AFTER

Computed by a throwaway probe in my scratchpad (outside both repos) calling the real
`loadEconomyExport()`. `k = 2.5`, `Σ` over `appSquadSize` integer rungs evenly spread across the
tier's starter-config band — the exact expression the file used before this pass.

### 4.1 The retired invariant — `wageScaleMicroPence × Σ(potentialᵏ) / turnoverPence`

```
=== pre-A10 (dev live, 2026-11-19) ===          === post-A10 (PROJECTED) ===
  1  |                     9782.608681            1  |                    38113.043432
  2  |                     9782.608685            2  |                    31206.521713
  3  |                     9782.608708            3  |                    31382.608737
  4  |                     9782.608695            4  |                    31920.652166
  5  |                     9782.608699            5  |                    32311.956549
  6  |                     9782.608697            6  |                    33094.565212
  7  |                     9782.608708            7  |                    35021.739185
  8  |                     9782.608688            8  |                    39580.434764
```

**Pre-A10: flat to ten significant figures**, confirming the documented constant independently
(and on *both* captured exports — see §4.2). **Post-A10: not flat**, spanning 31,207–39,580, a
3.19–4.05× lift that is σ_old/σ_new tier by tier, exactly as A10 predicted.

⚠️ **I did not "restore" this to a new constant, and §0.1 explains why there was none to restore.**
With a correct mirror it would read 9782.608696 again — the same value — because the expression
contains no σ. It is retired instead.

### 4.2 The same invariant on BOTH captured exports — which is how §0.4's box split was found

```
=== game-config-en.LIVE.json (app root, dev API) ===
 T1 turnover 33100000000 scale 332484503 n 26 inv 9782.608681
 T2 turnover 11400000000 scale 331618346 n 23 inv 9782.608685
 T3 turnover  3460000000 scale 303799192 n 21 inv 9782.608708
 T4 turnover  2070000000 scale 290519761 n 20 inv 9782.608695
 T5 turnover   732000000 scale 258711870 n 19 inv 9782.608699
 T6 turnover   269000000 scale 257021938 n 18 inv 9782.608697
 T7 turnover    68600000 scale 235402484 n 17 inv 9782.608708
 T8 turnover    21500000 scale 233303081 n 17 inv 9782.608688

=== pre-r2-exports/game-config-en.LIVE.json (2026-11-18) ===
 T1 turnover 38866154000 scale 390404650 n 26 inv 9782.608696
 T2 turnover 12004975700 scale 349216683 n 23 inv 9782.608687
 T3 turnover  3557660200 scale 312374073 n 21 inv 9782.608694
 T4 turnover  1990900900 scale 279418383 n 20 inv 9782.608681
 T5 turnover   707179600 scale 249939558 n 19 inv 9782.608684
 T6 turnover   233989900 scale 223570772 n 18 inv 9782.608713
 T7 turnover    58278500 scale 199984018 n 17 inv 9782.608687
 T8 turnover    16485200 scale 178885951 n 17 inv 9782.608677
```

Two exports, two different authored turnover ladders, **the same squad sizes and the same constant**
— so the published scale on each is σ-consistent at n = 26…17. A10's σ_old reproduces only at
n = 33…22. Both exports pass the invariant; A10's box is a third state.

### 4.3 The replacement invariant — `turnoverAvgWeeklyPence × weeks × n / turnoverPence`

```
=== pre-A10 ===                                  === post-A10 (PROJECTED) ===
  1  |  0.44999999                                 1  |  0.44999999
  2  |  0.44999998                                 2  |  0.44999998
  3  |  0.44999993                                 3  |  0.44999993
  4  |  0.45000000                                 4  |  0.45000000
  5  |  0.45000015                                 5  |  0.45000015
  6  |  0.45000107                                 6  |  0.45000107
  7  |  0.45000338                                 7  |  0.45000338
  8  |  0.44999553                                 8  |  0.44999553
expected = ratio × (1 − staffShare) = 6000 × (10000 − 2500)/1e8 = 0.45
```

**Flat at the authored player share on both exports, identically.** The residual is the
`Math.round` to whole pence on a figure that is £124 at tier 8, not a modelling error.

### 4.4 ⚠️ Is this "true by construction"? Yes — and that is the honest status

The brief rejects (c) for making the invariant true by construction. **This invariant has the same
property and I am not going to pretend otherwise.** What it still catches: reading the wrong
turnover row, the wrong ratio or share, the wrong `weeksPerSeason`, or mis-sizing the squad. What it
can no longer catch, because nothing app-side can: the app and the backend disagreeing about what
the reference squad *is*. **That check now requires (b) and exists nowhere.** It is the single most
important item in §7.

---

## 5. §5 — VERIFICATION

### 5.1 `npx tsc --noEmit`

```
$ npx tsc --noEmit
$ echo $?
0
```

Clean.

### 5.2 The projected post-A10 export — what it is, and what it is not

A10 is committed and not deployed, and I may not run the backend (A18 was in it), so no post-A10
export exists. I made one by multiplying each EN tier's `wageScaleMicroPence` by A10's measured
σ_old/σ_new — 3.896, 3.190, 3.208, 3.263, 3.303, 3.383, 3.580, 4.046 — and changing **nothing else**:

```
1 scale 332484503 -> 1295359624      5 scale 258711870 -> 854525307
2 scale 331618346 -> 1057862524      6 scale 257021938 -> 869505216
3 scale 303799192 ->  974587808      7 scale 235402484 -> 842740893
4 scale 290519761 ->  947965980      8 scale 233303081 -> 943944266
```

⚠️ **This is a PROJECTION, not a measurement**, and it lives in my scratchpad, not in either repo.
Its one approximation: A10's ratios were measured at squad sizes 33…22 and the live export is 26…17
(§0.4). The ratio is `Σ rungᵏ / Σ E(rung)ᵏ` over the same band, i.e. a density-weighted mean of
`(rung/E)ᵏ`, so changing how many rungs sample the band moves it only at the coarsest bands (EN T8
is six integers). **Nothing in my conclusion depends on the ratios' exact values** — only on their
being far from 1, which A10 measured directly.

### 5.3 The gate, four runs — ⚠️ the direction is the OPPOSITE of what brief §5.4 expects, and that is the point

`npx tsx scripts/economy/gate.ts --export <cfg> --starter-config starter-config.LIVE.json --country EN`

**(A) pre-A10 export, BEFORE my change** — the state on `dev` today:

```
tier |  wages |  upkeep |  total | first insolvent | final balance
  1  |  60.0% |   10.8% |  70.8% |           never |   £2,900,883,759
  2  |  60.0% |    9.5% |  69.5% |           never |   £1,043,747,419
  3  |  60.0% |   12.4% |  72.4% |           never |     £286,626,128
  4  |  60.0% |    8.9% |  68.9% |           never |     £193,320,405
  5  |  60.0% |   11.9% |  71.9% |           never |      £61,774,658
  6  |  60.0% |   14.6% |  74.6% |           never |      £20,459,481
  7  |  60.0% |   26.6% |  86.6% |           never |       £2,767,420
  8  |  60.0% |   44.9% | 104.9% |        season 1 |        -£317,962
```

**(B) pre-A10 export, AFTER my change** — `diff` against (A), in full:

```
13,15c13,15
<   5  |  60.0% |   11.9% |  71.9% |           never |      £61,774,658
<   6  |  60.0% |   14.6% |  74.6% |           never |      £20,459,481
<   7  |  60.0% |   26.6% |  86.6% |           never |       £2,767,420
---
>   5  |  60.0% |   11.9% |  71.9% |           never |      £61,774,308
>   6  |  60.0% |   14.6% |  74.6% |           never |      £20,459,150
>   7  |  60.0% |   26.6% |  86.6% |           never |       £2,767,107
54c54
<       tier 5 turnoverAvgWeeklyPence: fixture 399700 vs live 376887 (5.7%)
---
>       tier 5 turnoverAvgWeeklyPence: fixture 399700 vs live 376888 (5.7%)
57c57
<       tier 6 turnoverAvgWeeklyPence: fixture 166700 vs live 146195 (12.3%)
---
>       tier 6 turnoverAvgWeeklyPence: fixture 166700 vs live 146196 (12.3%)
60c60
<       tier 7 turnoverAvgWeeklyPence: fixture 44739 vs live 39475 (11.8%)
---
>       tier 7 turnoverAvgWeeklyPence: fixture 44739 vs live 39476 (11.8%)
```

**Three tiers move by one penny.** Every check keeps its verdict; every band, insolvency and drift
row is unchanged. That one penny is the whole claim of §3.1 made visible: the derived figure and the
priced figure **are the same quantity**, differing only where `playerBudget / (weeks × n)` rounds up
and `Σ trunc(round(scale·aᵏ)/UNIT) / n` rounds down.

**(C) projected post-A10 export, BEFORE my change** — the deploy blocker:

```
tier |  wages |  upkeep |  total | first insolvent | final balance
  1  | 233.8% |   10.8% | 244.5% |        season 1 | -£14,353,484,364
  2  | 191.4% |    9.5% | 200.9% |        season 1 |  -£3,450,132,550
  3  | 192.5% |   12.4% | 204.9% |        season 1 |  -£1,088,516,216
  4  | 195.8% |    8.9% | 204.6% |        season 1 |    -£649,873,211
  5  | 198.2% |   11.9% | 210.0% |        season 1 |    -£241,668,703
  6  | 203.0% |   14.6% | 217.6% |        season 1 |     -£94,925,300
  7  | 214.8% |   26.6% | 241.4% |        season 1 |     -£29,090,634
  8  | 242.8% |   44.9% | 287.7% |        season 1 |     -£12,105,829

  FAIL  wageModel flip at season 10 causes no cascade (tiers 1, 2, 3, 4, 5, 6)
      tier 1 turnoverAvgWeeklyPence: fixture 13289193 vs live 48520836 (265.1%)
```

The wage column is 60.0% → 191–243%, i.e. the **player** share 45% → 143–182% — **the same
143–182% A10 §5.2 measured when the backend's own second copy of the squad was priced against the
new scale.** Independent arrival at the same figure from the other side of the wire. Every tier
insolvent in season 1, and a check that passed in (A) now FAILs.

**(D) projected post-A10 export, AFTER my change:**

```
$ diff gate.AFTER.newexport.txt gate.AFTER.oldexport.txt
(no output)
IDENTICAL
```

**Byte-identical to (B).** `turnoverAvgWeeklyPence` is now completely immune to the recalibration —
correctly, because A10 changed no authored budget, no squad size and no `weeksPerSeason`, and those
are now the only things the figure depends on.

### 5.4 §5.5 — `turnoverAvgWeeklyPence`, before and after, and what it now means

Pre-A10 export, pence/week:

| tier | before (priced) | after (derived) | Δ |
|---|---|---|---|
| 1 | 12,454,013 | 12,454,013 | 0 |
| 2 | 4,848,771 | 4,848,771 | 0 |
| 3 | 1,611,801 | 1,611,801 | 0 |
| 4 | 1,012,500 | 1,012,500 | 0 |
| 5 | 376,887 | 376,888 | +1 |
| 6 | 146,195 | 146,196 | +1 |
| 7 | 39,475 | 39,476 | +1 |
| 8 | 12,372 | 12,372 | 0 |

**What it meant before:** *"the mean of `weeklyWageRange` over a squad of 26 players spread evenly
across potentials 40–90, priced with the published scale."* After A10 that sentence names a
population the backend does not have, and the number would have been 3.2–4.7× the authored budget.

**What it means now:** *"the authored player budget for this tier, divided by the playing weeks and
by the size of the squad the backend calibrated against."* It is the same number it has always been
on a pre-A10 export (±1 penny), and it is the only reading that survives the recalibration.

**`legacyAvgWeeklyPence` is unchanged** at every tier — same function, same band, same squad size.

### 5.5 `npm test`

```
$ npx jest --listTests | wc -l
     646
```

```
$ npx jest
Test Suites: 646 passed, 646 total
Tests:       3 skipped, 10772 passed, 10775 total
Snapshots:   0 total
DONE exit=0
```

**646 suites, matching `--listTests` exactly, and ZERO failures** — better than the documented
three-to-five baseline, and the `db/bulkWrite.test.ts` load flake A14 hit did not recur.

**Reconciled:** A14's pass (the commit immediately before mine, `0964fedc`) recorded
**646 suites / 10,767 passed, 10,771 collected, 3 skipped**. I added **4** tests and no suite, so
10,775 collected is +4 on 10,771 ✓ and the suite count is unchanged ✓. ⚠️ **A14's passed/collected
pair does not self-reconcile** — 10,767 passed + 3 skipped is 10,770, not the 10,771 it also states,
so one of its two numbers is out by one and my +4 reads as +5 against the passed figure alone. My
own run is internally consistent (10,772 + 3 = 10,775). Flagged rather than assumed:
`CLAUDE.md`'s green-master bar has no `new-game-save` row at this commit, and per the standing notes
I trust my own measurement over the table.

⚠️ `CLAUDE.md`'s table reads **640 / 10,704** for `new-game-save` at `e03dd6da` + A12. That is three
commits behind HEAD (A11's Scottish TV fix, A13's checks cleanup, A14's fan-base catchment have
landed since), so it is not stale in the misleading direction — but it is not this branch's figure
either. **646 / 10,772 at `0964fedc` + this pass.**

---

## 6. What I did NOT do

- **No work in `wunderkind-backend`.** Read only — `EconomyScaleResolver.php`,
  `EconomyConfigPublisher.php`, `GameConfigController.php`, `StarterConfig.php` and A10's probe
  scripts. No file written, no command run, no `lando` invocation.
- **No `ENGLAND_DEV` re-authoring**, including its `referenceSquadSize` column, which §0.4 shows is a
  record of a different box. Brief §6. Flagged in §7 instead.
- **No authored economy figure changed.** No band, turnover row, ratio, staff share, `k`, sponsor,
  TV or payout value; no migration; no `WORLD_PACK_VERSION`.
- **No CHECKS line added.** A10 §9's check is a real follow-up, but its stated source for two of its
  seven inputs is wrong (§0.4) and `agent-standing-notes.md` §2 says the report is already too heavy
  with A13 mid-cleanup. Adding an unbriefed check on a corrected spec is a task, not a side effect.
- **No fix to `realizedWageShares()`'s argument bug** (§7). One word, but out of scope and it changes
  a reported column in every gate run anyone compares against.
- **No `.context` restructuring.** One pass entry appended to `shared/last-sync.md`; one stage
  passage corrected in place (§8).
- **Not pushed. Not deployed.**

---

## 7. 🔴 FLAGGED, NOT ACTED ON

| # | where | what |
|---|---|---|
| 1 | 🔴 **backend** | **The only cross-repo agreement check on the reference squad no longer exists** (§4.4). Publishing `EconomyScaleResolver::referenceSquadAbilities()` per tier in `economyTierBaseline.tiers[]` — already public as of A10 — restores it, and also fixes #2. This is option (b), and it is the one thing (b) is genuinely needed for. |
| 2 | ⚠️ **app** `loadExport.ts` | `legacyAvgWeeklyPence` prices the POTENTIAL band, so it runs high — biased toward the harness's own conclusion that legacy is broken (§3.5). Pre-existing, not caused by A10. Needs #1. |
| 3 | 🔴 **A10 / PM** | A10 §9's check spec sources `wageToTurnoverRatioBp` and `staffWageShareBp` from `GET /api/game-config`. **They are not there** — they are on the public `starter-config` `economy` block (§0.4). Anyone implementing that check from the spec as written will find two of its seven inputs missing. |
| 4 | ⚠️ **PM** | A10's σ_old, `S_tier` and player-budget columns are measured on a box with `npc_squad_config` midpoints 33…22 and turnover from `baselineTurnoverPence`; both captured exports publish 26…17 and the tier rows' own turnover (§0.4, §4.2). The *ratios* are sound. The absolute columns should not be quoted as the live configuration. |
| 5 | ⚠️ **app** `scripts/economy/gate.ts:173` | `realizedWageShares()` is called with **no argument**, so it defaults to `ENGLAND_DEV` and the "A7: realized player-wage share" block — and its `app squad / reference squad` column — reports the hardcoded fixture **even on a `--export` run**. It printed 40.9–60.2% in every run above while the live export's own figure is a flat 45.0%. One word (`realizedWageShares(TIERS)`), but it changes a column people diff. |
| 6 | ⚠️ **app** `fixtures.ts:66-67` | `WAGE_TO_TURNOVER_BP` / `STAFF_WAGE_SHARE_BP` are app constants duplicating published config, and `simulate.ts`'s `incomeAnchoredAvgWeekly()` and `realizedWageShares()` both use them rather than the export. Same defect class as the one this pass closed, one layer up. |
| 7 | ⚠️ **PM / `.context`** | `shared/last-sync.md:272-278` and `:377-380` state the `9782.608696` invariant as the proof of the floor reading. Both sit inside historical pass entries, so I left them and flag them rather than rewriting the log — §0.1 supersedes the reasoning, and `structure.md` now carries the correction. |

---

## 8. `.context` edits made

- `stages/02_architecture/output/structure.md` — the `loadExport.ts` warning box corrected in place:
  the floor reading is now sourced to `intdiv` and the published `npcSquadConfig` row rather than to
  the invariant, and a new paragraph records that the `9782.608696` invariant is retired, why it
  could never have validated a mirror, and what the turnover average is now derived from. Nothing
  pruned or restructured; the surrounding entries are untouched.
- `shared/last-sync.md` — **one** pass entry appended.

**Would have restructured, did not:** the two historical `last-sync.md` passages in §7 #7.
