<!-- STATUS --> **STATUS:** 🟢 LIVE — A32 report, 2026-11-21. Measured at backend `3ff5a312` / app `46f9d104`.

⚠️ **The app HEAD moved under this session.** The brief named `e4cd7ced`/OTA 493 as deployed and
`97ed9e00` as the branch tip; `46f9d104` (*"Mechanism first, numbers from observed data later —
promoted to a binding rule"*, 21:34) landed while I was measuring. 🟢 Checked: it touches
`tribal-knowledge.md` and `contextDocSync.test.ts` and **none of my four paths**, so nothing here
is reconciled against a stale tree — but it does change what this report owes you, and §5.2 is the
curve that new rule requires.

# A32 — the flat judgement term in a scout's `ability`, and the 65× it buys

**Epistemic key, used on every claim below.**
🟢 **MEASURED** — I ran a command and this is its output.
🟡 **DERIVED** — arithmetic over measured inputs, shown so it can be checked.
🔵 **READ** — taken from code or a doc at a named commit. A citation records where I got a claim,
never that it is true.
⚠️ **INFERRED** — reasoning, not measurement. Weigh accordingly.

---

## 0. The answer in six lines

1. 🟢 **The owner's shape reproduces to the penny.** EN t8, 12 coaches on **£1,141.14/wk** and one
   **ability-19** scout on **£9,740.57/wk** — **£10,881.71 total, 89.5%, 65.6×**. The owner's
   screen read £10,882 / £9,741 / 89.5% / 65×.
2. 🟢 **The brief's `k ≈ 2.5` is right, read from config, not inferred:** EN
   `wageCurveExponentBp = 25000`.
3. 🔴 🟢 **But the brief's §3 mechanism is the WRONG PATH.** The reservation split
   (`ClubWageScaleService`) **never runs on the owner's save** — a fresh save has no
   `seasonBudget`, so `staffWagePence` returns `undefined` at its first guard. What priced that
   scout is the **band**: `tierStaffWeeklyWagePence(19, EN t8)`. Both paths amplify the same
   cause, which is why the misattribution survived; §3 below has the decomposition.
4. 🟢 **The cause is as the brief says: a flat term the band cannot reach** — but it is
   **15.75 points, not ~18** (the live window is 15–90, not the entity default 40/80). It is
   **88.2% of a t8 scout's ability and 34.9% of a t1 scout's**.
5. 🟢 **Nothing in either repository reads a scout's `ability` as a quality figure.** Traced
   forward from every writer and backwards from every consumer: the only consumers are the two
   wage calculators, the admin grid, and serialisation. Scouting accuracy comes from `judgements`
   directly. **So the 70/30 blend is, today, a wage formula wearing a quality formula's name** —
   and that is the single most important thing in this report.
6. 🔴 **Every lever that closes the gap is an owner ruling. I have taken none.** §5 brings you the
   curve the 2026-11-21 mantra asks for. What I shipped is §7: a CHECKS row that states the
   relationship, and three comment corrections — one of which was a live misattribution of this
   very mechanism.

---

## 1. Where the brief was right, wrong, and where I corrected myself

| brief's claim | verdict |
|---|---|
| §2: `ScoutAbilityCalculator` "has no tier term" / scouts need a per-tier band — **PM's own retraction** | 🟢 **The retraction is correct.** `ScoutGenerationService::build()` resolves the banded input through `StaffAbilityRangeService::resolve($country, $tier)`; the parameter is gone, not defaulted. A25's work is intact and I did not re-do it |
| §3: judgements are rolled from the flat global window, whatever the tier | 🟢 **Confirmed**, and it is **seven** values, not five (A27) |
| §3: the window is "40/80 on the entity's defaults" | 🟡 **True of the entity, not of the live row.** 🟢 Measured live: **15/90**, so the flat term is **15.75**, not 18. The class docblock already said 15–90 and was right |
| §3: `0.7 × ~4.5 = ~3` at t8 (band "roughly 2–7") | 🔴 **2–7 is the PLAYER potential band.** 🟢 The live **staff** band at EN t8 is **2–4**, so the banded term is `0.7 × 3 = 2.10` and a t8 coach is 2–4, not 2–7 |
| §3: scout ability ≈ 21 | 🔴 **19.** 🟡 Solved from the owner's own £9,741 and confirmed by reproduction. ⚠️ Worth noting: **`ScoutAbilityCalculator`'s docblock predicted exactly 19** — *"0.7/0.3 gives 61 vs 19"* |
| §3: `k ≈ 2.5`, inferred from a screenshot | 🟢 **Confirmed by reading config:** `wageCurveExponentBp: 25000` |
| §3: "then the SPLIT amplifies it" — `wage = scale × ability^k` over the reservation | 🔴 **Wrong function.** The split cannot run on a fresh save. The power law is real; it is in `turnoverWeeklyPence` under the band rung, not in the reservation split |
| §5 lever 3: *"`scoutNoise.ts` is the single place a scout's ability is turned into noise, so price off a different figure and accuracy is untouched by construction"* | 🔴 **The premise is already satisfied and the lever is therefore not the one it looks like.** 🟢 `scoutNoise.ts` never reads `ability` — it reads `judgements.potential` and `ageGateFor(judgements, age)`. Pricing is *already* decoupled from quality; what is wrong is that the priced figure is not tier-relative |
| §5 lever 4: split the reservation per role | 🔴 **Cannot address the observation at all** — the reservation split is not on the code path that produced it |
| §7: tier 1 is currently sane | 🟢 **Confirmed and it does not regress** under any lever: scout/coach ability 1.07×, wage 1.19× |

---

## 2. What I measured the inputs to be (and how)

🟢 **Live local dev `pool_config`, 2026-11-21.** Verbatim:

```
$ lando psql -A -t -c "SELECT scout_judgement_min, scout_judgement_max, scout_experience_min, scout_experience_max, coach_ability_min, coach_ability_max FROM pool_config LIMIT 1;"
15|90|4|34|4|75

$ lando psql -A -t -c "SELECT staff_ability_ranges::text FROM pool_config LIMIT 1;"   # EN only, reformatted
"EN": {"1": {"max": 55, "min": 29}, "2": {"max": 38, "min": 20}, "3": {"max": 26, "min": 14},
       "4": {"max": 21, "min": 11}, "5": {"max": 15, "min": 8},  "6": {"max": 11, "min": 6},
       "7": {"max": 6,  "min": 3},  "8": {"max": 4,  "min": 2}}

$ lando psql -A -t -c "SELECT cardinality(array(SELECT jsonb_object_keys(judgements::jsonb))) AS keys, count(*) FROM scout GROUP BY 1 ORDER BY 1;"
7|5278

$ lando psql -A -t -c "SELECT min(ability), max(ability), round(avg(ability),2), count(*) FROM scout;"
12|47|29.11|5278
```

🔴 **Read that last line again. The lowest `ability` of any of the 5,278 scouts in the database is
12** — against coaches on 2 at the bottom of England. The floor is not a model; it is in the data.

🟢 **Live EN game-config** (`a30-config-capture-2026-11-21/game-config-en.LIVE.json`, captured
against `api.dev.buildmyclub.co.uk`):

```
wageCurveExponentBp   25000     (k = 2.5)
wageScaleUnit         1000000
reputationSpreadBp    0
weeksPerSeason        46
t8 wageScaleMicroPence  928521647   turnoverPence 21500000
t1 wageScaleMicroPence 1269725639   turnoverPence 33100000000
wageMultiplierTiers   [{15,p4,s2},{25,p6,s4},{40,p15,s8},{60,p30,s12}]
                      → staff/player ratio 0.500 / 0.667 / 0.533 / 0.400
```

⚠️ **One caveat I cannot close.** The local dev `pool_config` is not provably the same row as
`api.dev`'s, and the owner's save came from `api.dev`. **But it does not need to be**: the local
band 2–4 reproduces the owner's three coach wages (£26 / £72 / £149) exactly, which is an
independent confirmation that the remote row holds the same values. 🟡

---

## 3. The reproduction, and the mechanism

Measured through the app's own functions — `resolveEconomy`, `tierStaffWeeklyWagePence`,
`resolveScoutWagePence` — against the live EN capture. Nothing is re-derived by hand. Verbatim:

```
############ 1. THE OWNER'S SHAPE, REPRODUCED ############
EN t8: model=turnover fallback=none k=2.5 scaleMicro=928521647 unit=1000000 repSpreadBp=0
wageMultiplierTiers = [{"maxAbility":15,"playerMultiplier":4,"staffMultiplier":2},{"maxAbility":25,"playerMultiplier":6,"staffMultiplier":4},{"maxAbility":40,"playerMultiplier":15,"staffMultiplier":8},{"maxAbility":60,"playerMultiplier":30,"staffMultiplier":12}]
  coach abilities   4, 4, 4, 4, 4, 4, 3, 3, 2, 2, 2, 2
  coach wages       £148.56, £148.56, £148.56, £148.56, £148.56, £148.56, £72.37, £72.37, £26.26, £26.26, £26.26, £26.26
  12 coaches        £1,141.14/wk
  1 scout, ability 19  £9,740.57/wk
  TOTAL             £10,881.71/wk          (owner's screen: £10,882)
  scout share       89.5%           (owner's screen: 89.5%)
  scout / best coach 65.6x  (£9,740.57 / £148.56)   (owner's screen: 65x)

############ 2. IS THE COACH HALF CORRECT? ############
  t8 turnover £215,000.00/season · wage reservation 60% = £2,804.35/wk
  staff share of that (25%) = £701.09/wk  <- what the budget model reserves for the whole backroom
  20-player starter squad (abilities 2,2,2,2,2,3,3,3,3,3,3,3,3,3,4,4,4,4,5,5) = £3,791.84/wk
  12 coaches / player bill   = 30.1%   (model reserves 25% of the wage pot for staff)
  1 SCOUT  / player bill     = 256.9%
  whole backroom / staff reservation = 15.5x
  coaches only   / staff reservation = 1.6x

############ 3. THE MECHANISM, DECOMPOSED ############
65x = power law (19/4)^2.5 = 49.17x  ×  band-ratio cliff 0.6667/0.5000 = 1.3333x  =  65.57x
  t1: staff band 29-55 (mid 42)  E[scout ability] = 29.40 banded + 15.75 FLAT = 45.15   coach = 42.00   scout/coach ability = 1.07x   flat share of ability = 34.9%
  t8: staff band 2-4 (mid 3)  E[scout ability] = 2.10 banded + 15.75 FLAT = 17.85   coach = 3.00   scout/coach ability = 5.95x   flat share of ability = 88.2%

############ 4. THE LEVERS, MEASURED AT BOTH ENDS ############

  --- EN t8 (staff band 2-4; the comparator coach is ability 3 on £72.37/wk) ---
    TODAY            0.7*exp + 0.3*mean(jud), jud flat 15-90 ability  18  wage    £8,509.07  scout/coach 117.58x  accuracy u18  53% / 18+  53%
    L1 band judgements to the staff band                     ability   3  wage       £72.37  scout/coach   1.00x  accuracy u18   3% / 18+   3%
    L2 weights 100/0 (ability = banded experience)           ability   3  wage       £72.37  scout/coach   1.00x  accuracy u18  53% / 18+  53%
    L3 price off `experience` instead of `ability`           ability   3  wage       £72.37  scout/coach   1.00x  accuracy u18  53% / 18+  53%

  --- EN t1 (staff band 29-55; the comparator coach is ability 42 on £58,062.15/wk) ---
    TODAY            0.7*exp + 0.3*mean(jud), jud flat 15-90 ability  45  wage   £68,992.38  scout/coach   1.19x  accuracy u18  53% / 18+  53%
```

🟢 **£10,881.71 / £9,740.57 / 89.5% / 65.6× against the owner's £10,882 / £9,741 / 89.5% / 65×.**
🟢 The coach multiset `6×ability-4, 2×ability-3, 4×ability-2` is the **unique** multiset of
twelve over the t8 staff band 2–4 that sums to the £1,141.14 the owner's two figures imply —
enumerated rather than guessed:

```
$ python3 -c "
for n4 in range(13):
  for n3 in range(13-n4):
    n2=12-n4-n3
    t=n4*14856+n3*7237+n2*2626       # the measured wages at abilities 4, 3, 2
    if abs(t-114114)<=120: print((n4,n3,n2,t))"
(6, 2, 4, 114114)
```

Exact to the penny, and the only solution within £1.20. 🟡 So the owner's screen is not merely
consistent with this model — **the model recovers their roster.**

### 3.1 The chain, at file and line

🔵 **What writes the owner's scout salary on a fresh save:**

1. `useInitFlow.ts:470` — `resolveScoutAbility(ws.ability, exp, ws.judgements)` → **19**, read
   straight from the pack (`WorldScout.ability`, published since v12).
2. `useInitFlow.ts:478` — `resolveScoutWagePence({ ability, salary: ws.salary }, economy)`.
3. `utils/staffWages.ts:191` — the chain is
   `salary ?? weeklySalary ?? tierStaffWeeklyWagePence(ability, economy) ?? fallback`. A pack
   carries no money (v11) and `buildScoutSnapshot` sends no wage, so **rung 3 governs**.
4. `economy/packWages.ts:229` — `asPlayer × (staffMultiplier / playerMultiplier)`.
5. `economy/wages.ts:195` — `asPlayer = trunc(round(wageScaleMicroPence × ability^k) / unit)`.

🔴 **`ClubWageScaleService.staffWagePence` (`:145`) is NOT on this path.** `:152` returns
`undefined` without `incomeAnchoredWages` **or** a club budget, and `ampStaffWagePence` returns
`undefined` without `club.seasonBudget` — which does not exist before the first season transition
(`packWages.ts` says so in as many words).
⚠️ **And the flag is not the reason, so nobody should go looking there.** 🟢 The EN capture omits
`incomeAnchoredWages` while publishing `wageModel: 'turnover'`, and `economyConfig.ts:214` is
`config.incomeAnchoredWages ?? (baseline?.wageModel === 'turnover')` — so it resolves **true** on
the owner's save. The split is absent for want of a BUDGET, not for want of a flag. 🔵 And by the owner's B1 ruling the AMP club's starting
staff wages are **contracts** and are never re-solved: `anchorAmpStaffWages` was retired on
2026-11-20 for exactly that reason (`SeasonBudgetService.ts:549`). **So £9,740.57 is permanent on
that save.**

### 3.2 Why the ability is 19 and the coach's is 3

🟢 From the measurement above:

```
t1: staff band 29-55 (mid 42)  E[scout ability] = 29.40 banded + 15.75 FLAT = 45.15   coach = 42.00   scout/coach ability = 1.07x   flat share of ability = 34.9%
t8: staff band 2-4   (mid 3)   E[scout ability] =  2.10 banded + 15.75 FLAT = 17.85   coach =  3.00   scout/coach ability = 5.95x   flat share of ability = 88.2%
```

The flat term is **the same 15.75 at every tier**, because all seven judgements roll from the
global `scoutJudgementMin/Max` whatever the club. At t1 the banded term dominates it; at t8 the
banded term is 2.10 and cannot.

### 3.3 Why 5.95× in ability becomes 65.6× in money

🟢 Two factors, both measured:

```
power law   (19/4)^2.5                 = 49.17x
band cliff  ratio(19)/ratio(4) = 0.6667/0.5000 = 1.3333x
product                                  = 65.57x
```

🔴 **The second factor is the authored non-monotonicity `packWages.ts` already documents** — an
ability-19 scout sits in the 0.667 band and an ability-4 coach in the 0.500 band, so the scout
gets a 33% premium *on top of* the curve purely for crossing ability 15. 🔵 That ladder is the
owner's dial and A24 was ruled not to re-author it.

### 3.4 Is the coach half correct? Yes — and that is what makes this a correctness finding

🟢 Verbatim:

```
  staff share of that (25%) = £701.09/wk  <- what the budget model reserves for the whole backroom
  20-player starter squad (abilities 2,2,2,2,2,3,3,3,3,3,3,3,3,3,4,4,4,4,5,5) = £3,791.84/wk
  12 coaches / player bill   = 30.1%   (model reserves 25% of the wage pot for staff)
  1 SCOUT  / player bill     = 256.9%
  whole backroom / staff reservation = 15.5x
  coaches only   / staff reservation = 1.6x

############ 3. THE MECHANISM, DECOMPOSED ############
65x = power law (19/4)^2.5 = 49.17x  ×  band-ratio cliff 0.6667/0.5000 = 1.3333x  =  65.57x
  t1: staff band 29-55 (mid 42)  E[scout ability] = 29.40 banded + 15.75 FLAT = 45.15   coach = 42.00   scout/coach ability = 1.07x   flat share of ability = 34.9%
  t8: staff band 2-4 (mid 3)  E[scout ability] = 2.10 banded + 15.75 FLAT = 17.85   coach = 3.00   scout/coach ability = 5.95x   flat share of ability = 88.2%
```

🟡 **Twelve coaches cost 30.1% of the player bill; one scout costs 256.9% of it.** The budget
model reserves 25% of the wage pot for the whole backroom, and `packWages.ts` records that the
band rung was validated against exactly this relationship (*"~22 players and ~5 staff … roughly
5/22 ≈ 23% … against the 25% that `STAFF_WAGE_SHARE_BP` reserves"*). ⚠️ The owner's 12 coaches are
above the modelled headcount (`starterCoachCount` is 8 live), which explains 30.1% against 25%;
**it explains nothing about 256.9%.** The coach half of this bill is doing what the model says.
The scout is the whole error.

---

## 4. What reads a scout's `ability` — traced in both directions

🟢 **Backwards from every consumer.** Verbatim, backend:

```
$ grep -rn --include='*.php' -E "getAbility\(\)|setAbility\(" src/
src/Entity/Scout.php:147:    public function getAbility(): int { return $this->ability; }
src/Entity/Scout.php:150:    public function setAbility(int $ability): void { $this->ability = max(1, min(100, $ability)); }
src/Controller/Admin/ScoutCrudController.php:157:            ->formatValue(fn ($v, Scout $s) => ['text' => (string) $s->getAbility()]);
src/Command/BackfillScoutAbilitiesCommand.php:107:            if ($ability === $scout->getAbility()) {
src/Command/BackfillScoutAbilitiesCommand.php:117:            $scout->setAbility($ability);
src/Command/GenerateMarketDataCommand.php:342:            $scout->setAbility($ability);
src/Service/MarketDataService.php:124:            'ability'     => $s->getAbility(),
src/Service/ScoutGenerationService.php:148:        $scout->setAbility($ability);
src/Service/ScoutWageCalculator.php:98:        return $this->weeklyWageFor($scout->getAbility(), $config);
src/Service/WorldPackSnapshotBuilder.php:288:            'ability'     => $scout->getAbility(),
src/EventSubscriber/ScoutAbilityLifecycleSubscriber.php:121,129,152 (recompute + write)
```

**One reader that is not a writer, a serialiser or the admin grid: `ScoutWageCalculator`.**

🟢 App side, every `resolveScoutAbility` / `scout.ability` consumer, classified:

| site | what it does with it |
|---|---|
| `utils/staffWages.ts:168` | **WAGE** — the band rung |
| `engine/ClubWageScaleService.ts:196, :219` | **WAGE** — the `ability^k` denominator and the price |
| `engine/SeasonBudgetService.ts:230` | **WAGE** — `anchorScouts` |
| `engine/StaffPoachingService.ts:265` | **WAGE** — poach pricing |
| `stores/marketStore.ts:242` | **WAGE** — `anchorStaffWages` |
| `hooks/useInitFlow.ts:450, :470` · `stores/worldStore.ts:615` · `api/endpoints/market.ts:293` | **INGEST** — resolve and store |
| `components/debug/ChecksTab.tsx` · `economyDiagnostics.ts:1267` | **DIAGNOSTIC** |
| **`engine/scoutNoise.ts`** | 🔴 **does not read it at all** — `applyScoutNoise(actual, accuracy, ageGate, …)` takes `judgements.potential` and `ageGateFor(judgements, age)`; `scoutAccuracyPercent` blends the same two |
| `screens/squad/StaffScreen.tsx:126, :129` · `components/ui/StaffMiniCards.tsx:25` | 🔴 **the stars read `experience`, not `ability`** |
| `engine/TournamentSnapshotBuilder.ts:307` · `engine/npcStaffPoachExecutors.ts:151` | 🔴 **also `experience`** |

🔴 **So: a scout's `ability` is already a wage-only quantity in both repositories.** The 70/30
blend was ruled on as a description of how good a scout is (*"experience doesn't match 1 to one"*)
and nothing in the game reads it that way. **That is the finding that reframes the levers.**

⚠️ **One thing I could not reproduce, and I am flagging rather than resolving it.** The brief's §1
shows `COACH 4★ £149` and `SCOUT 3★ £9,741`. Every staff star surface I traced passes
`ceiling={100}` to `RatingStars`, and `PlayerStarRating` is
`floor(value / ceiling × 10)` half-stars with a floor of one — so abilities 2/3/4 and experience
2–7 all render at **0.5★**, not 2–4★. I cannot produce "4★ vs 3★" from this code path. ⚠️ Most
likely the brief's block is a transcription of a surface I have not identified, and the star
counts in it should not be treated as measured. **The money in it is exact, and that is what the
grievance rests on.** Worth one device look at which screen that was.

---

## 5. The levers — measured, and the curve

### 5.1 All four, at both ends

🟢 Verbatim:

```
############ 4. THE LEVERS, MEASURED AT BOTH ENDS ############

  --- EN t8 (staff band 2-4; the comparator coach is ability 3 on £72.37/wk) ---
    TODAY            0.7*exp + 0.3*mean(jud), jud flat 15-90 ability  18  wage    £8,509.07  scout/coach 117.58x  accuracy u18  53% / 18+  53%
    L1 band judgements to the staff band                     ability   3  wage       £72.37  scout/coach   1.00x  accuracy u18   3% / 18+   3%
    L2 weights 100/0 (ability = banded experience)           ability   3  wage       £72.37  scout/coach   1.00x  accuracy u18  53% / 18+  53%
    L3 price off `experience` instead of `ability`           ability   3  wage       £72.37  scout/coach   1.00x  accuracy u18  53% / 18+  53%

  --- EN t1 (staff band 29-55; the comparator coach is ability 42 on £58,062.15/wk) ---
    TODAY            0.7*exp + 0.3*mean(jud), jud flat 15-90 ability  45  wage   £68,992.38  scout/coach   1.19x  accuracy u18  53% / 18+  53%
    L1 band judgements to the staff band                     ability  42  wage   £58,062.15  scout/coach   1.00x  accuracy u18  42% / 18+  42%
    L2 weights 100/0 (ability = banded experience)           ability  42  wage   £58,062.15  scout/coach   1.00x  accuracy u18  53% / 18+  53%
    L3 price off `experience` instead of `ability`           ability  42  wage   £58,062.15  scout/coach   1.00x  accuracy u18  53% / 18+  53%

############ 5. THE OWNER'S SHAPE UNDER EACH LEVER ############
  TODAY            0.7*exp + 0.3*mean(jud), jud flat 15-90 scout    £8,509.07/wk  bill    £9,650.21/wk  share  88.2%  vs best coach  57.3x
  L1 band judgements to the staff band                     scout       £72.37/wk  bill    £1,213.51/wk  share   6.0%  vs best coach   0.5x
  L2 weights 100/0 (ability = banded experience)           scout       £72.37/wk  bill    £1,213.51/wk  share   6.0%  vs best coach   0.5x
  L3 price off `experience` instead of `ability`           scout       £72.37/wk  bill    £1,213.51/wk  share   6.0%  vs best coach   0.5x
```

🟢 **The decisive column is the last one.** L1 (banding the judgements) takes a t8 scout's
displayed accuracy from **53% to 3%** and a t1 scout's from 53% to 42%. L2 and L3 leave it at
**53% at every tier**, because `scoutNoise.ts` reads `judgements` and the weights do not touch
them. 🔵 That is the trade-off the brief asked to be measured rather than argued.

🟢 **L1, L2 and L3 are numerically identical for a club scout** — all three put ability on the
tier's staff band, so all three give £72.37/wk, a 6.0% share and 0.5× the best coach. They differ
only in what else they move:

```
############ 6. POOL / MARKET SCOUTS — where L2 and L3 differ ############
  The shared pool passes no tier, so experience comes from the untiered window
  PoolConfig.scoutExperienceMin/Max = 4-34 (measured live).
    experience  4:  ability today = 19   under L2/weights-100/0 = 4   (L3 prices off 4 directly)
    experience 19:  ability today = 29   under L2/weights-100/0 = 19   (L3 prices off 19 directly)
    experience 34:  ability today = 40   under L2/weights-100/0 = 34   (L3 prices off 34 directly)
```

🟡 So **L3 (price off `experience`) and L2 (weights to 100/0) diverge only for POOL/MARKET
scouts**, where there is no tier and experience is drawn 4–34. 🔵 A24's recorded reason for moving
the wage input off `experience` was precisely that this window *"could never reach the top band
at all, for no designed reason"* — which is an argument about what the market offers, and it
survives L2 untouched while L3 reopens it.

🔴 **L4 is not applicable.** The reservation split is not on the path that produced the owner's
reading (§3.1). It would bound the damage for NPC clubs and for the AMP club after its first
transition, but it cannot change the number on the owner's screen, and a fix measured against a
path the observation never took is not a fix.

### 5.2 The curve, as the 2026-11-21 mantra requires

🔵 *"Never ask for a number without showing the curve: report the outcome as a function of the
input across the plausible range, at both ends of the pyramid."* The input is the **judgement
weight** `w` (0.3 today). 🟢 Verbatim:

```
######## CURVE A: the judgement weight w, as authored today (ADDITIVE form) ########
   ability = round((1-w) * experience + w * mean(judgements))
   experience = the tier staff band midpoint; mean(judgements) = 52.5 (window 15-90)
   The comparator coach is the band midpoint, priced by the same function.

  EN t1  staff band 29-55  comparator coach ability 42 on £58,062.15/wk
      w     ability        scout wage   scout/coach   flat share of ability   accuracy(u18/18+)
   0.30       45        £68,992.38        1.19x                  35.0%            53% (unchanged at every w)
   0.25       45        £68,992.38        1.19x                  29.2%            53% (unchanged at every w)
   0.20       44        £65,223.12        1.12x                  23.9%            53% (unchanged at every w)
   0.15       44        £65,223.12        1.12x                  17.9%            53% (unchanged at every w)
   0.10       43        £61,580.19        1.06x                  12.2%            53% (unchanged at every w)
   0.05       43        £61,580.19        1.06x                   6.1%            53% (unchanged at every w)
   0.00       42        £58,062.15        1.00x                   0.0%            53% (unchanged at every w)

  EN t8  staff band 2-4  comparator coach ability 3 on £72.37/wk
      w     ability        scout wage   scout/coach   flat share of ability   accuracy(u18/18+)
   0.30       18         £8,509.07      117.58x                  87.5%            53% (unchanged at every w)
   0.25       15         £5,394.22       74.54x                  87.5%            53% (unchanged at every w)
   0.20       13         £2,828.92       39.09x                  80.8%            53% (unchanged at every w)
   0.15       10         £1,468.12       20.29x                  78.8%            53% (unchanged at every w)
   0.10        8           £840.40       11.61x                  65.6%            53% (unchanged at every w)
   0.05        5           £259.53        3.59x                  52.5%            53% (unchanged at every w)
   0.00        3            £72.37        1.00x                   0.0%            53% (unchanged at every w)

######## CURVE A continued: the owner's own shape at each w ########
  (12 coaches on £1,141.14/wk, fixed; only the scout moves)
      w   scout wage/wk      whole bill/wk   scout share   vs best coach
   0.30      £8,509.07          £9,650.21        88.2%           57.3x
   0.25      £5,394.22          £6,535.36        82.5%           36.3x
   0.20      £2,828.92          £3,970.06        71.3%           19.0x
   0.15      £1,468.12          £2,609.26        56.3%            9.9x
   0.10        £840.40          £1,981.54        42.4%            5.7x
   0.05        £259.53          £1,400.67        18.5%            1.7x
   0.00         £72.37          £1,213.51         6.0%            0.5x
```

🟢 **Read the t8 block and the t1 block together.** Every step down in `w` divides the t8 scout's
wage by roughly 1.5–3×, and barely moves t1 at all (1.19× → 1.00×). **There is no value of `w`
that is wrong at the top**, so the choice is not a trade between the two ends — which is the
question the owner would reasonably expect to be asked and the answer is "there isn't one".

### 5.3 A fifth option the brief does not list, and why I did not take it

🟡 The defect is dimensional: `ability` averages a **tier-relative staff-ability figure**
(2–55 across England) with an **absolute accuracy percentage** (15–90 at every tier). Keeping the
owner's weights but applying the judgement term *relative to its own window* removes the flat
term with **no new authored number at all**:

```
judNorm = (mean(judgements) - judMin) / (judMax - judMin)        # 0..1
ability = round(experience × (1 - w + 2·w·judNorm))              # w = 0.3, unchanged
```

A median judge rates exactly their banded experience; the best and worst in the window sit ±30%
either side. 🟢 Measured:

```
   ability = round(experience * (1 - w + 2*w*judNorm)),  judNorm = (mean - 15)/(90 - 15)
   A median-judging scout rates exactly their banded experience; the best and worst
   in the window sit (1±w) either side of it. Tier-relative BY CONSTRUCTION, and
   computable from a stored Scout row alone (the window is global PoolConfig, so the
   backfill, the lifecycle subscriber and generation all still agree).

  tier  band        w=0.3: worst judge / median / best judge   coach   scout(median)/coach
   t1   29-55        29 /  42 /  55   wages    £30,669.28 /    £58,062.15 /   £113,940.10   coach    £58,062.15   1.00x
   t4   11-21        11 /  16 /  21   wages     £1,857.53 /     £6,319.65 /    £12,472.15   coach     £6,319.65   1.00x
   t8   2-4           2 /   3 /   4   wages        £26.26 /        £72.37 /       £148.56   coach        £72.37   1.00x

  The owner's shape under CURVE B (w=0.3, experience 3, median judgements):
    ability 3 · scout £72.37/wk · bill £1,213.51/wk · share 6.0% · vs best coach 0.5x

  CURVE B across the whole English pyramid, median judge, against that tier's coach:
   t1: coach ability 42     £58,062.15/wk | TODAY scout 45     £68,992.38/wk =   1.19x | CURVE B scout 42     £58,062.15/wk =  1.00x
   t2: coach ability 29     £24,915.66/wk | TODAY scout 36     £42,779.31/wk =   1.72x | CURVE B scout 29     £24,915.66/wk =  1.00x
   t3: coach ability 20     £11,318.21/wk | TODAY scout 30     £24,951.46/wk =   2.20x | CURVE B scout 20     £11,318.21/wk =  1.00x
   t4: coach ability 16      £6,319.65/wk | TODAY scout 27     £18,702.19/wk =   2.96x | CURVE B scout 16      £6,319.65/wk =  1.00x
   t5: coach ability 12      £2,069.40/wk | TODAY scout 24     £15,608.40/wk =   7.54x | CURVE B scout 12      £2,069.40/wk =  1.00x
   t6: coach ability  9      £1,032.86/wk | TODAY scout 22     £12,865.61/wk =  12.46x | CURVE B scout  9      £1,032.86/wk =  1.00x
   t7: coach ability  5        £229.49/wk | TODAY scout 19      £8,613.17/wk =  37.53x | CURVE B scout  5        £229.49/wk =  1.00x
   t8: coach ability  3         £72.37/wk | TODAY scout 18      £8,509.07/wk = 117.58x | CURVE B scout  3         £72.37/wk =  1.00x
```

🟢 **It lands a scout's ability on the tier's own staff band at every tier** (t1 29/42/55, t4
11/16/21, t8 2/3/4 — those *are* the authored bands), keeps `ability` monotonic in both inputs,
keeps it deterministic from a stored row alone (the window is global `PoolConfig`, so generation,
the backfill command and the lifecycle subscriber all still agree), and leaves judgements — and
therefore scouting accuracy — untouched.

🔴 **I did not take it, and I want to be explicit about why.** It changes the *functional form* of
a formula the owner approved with measured alternatives in front of them. The brief's instruction
is *"if the honest answer is a lever that needs a ruling, say so and bring it to me rather than
taking it"*, and this is a bigger change than the levers that do need a ruling, not a smaller one.
⚠️ It is also the option I would recommend if asked, because it is the only one that removes the
unit error rather than reducing its coefficient.

### 5.4 My recommendation

🟡 **Order of preference, with the reasoning rather than the conclusion:**

1. **§5.3's relative form.** Removes the cause, authors no number, costs no gameplay.
2. **L2, weights to 100/0** (`ability` = banded experience). Simplest, smallest diff, exactly
   coach-comparable. 🔴 **And it is not the gameplay change the 70/30 ruling assumed** — §4 shows
   nothing reads `ability` as quality, so 100/0 removes a term from a wage and from nothing else.
   ⚠️ Its real cost is a naming one: a field called `ability` would then be `experience` by
   another name, and the reason the owner asked for it (*"experience doesn't match 1 to one"*)
   would be unserved. §5.3 serves it; 100/0 does not.
3. **L3.** Same numbers for club scouts, reopens A24's pool argument.
4. **L1.** Correct-sounding and the measurement is against it: 53% → 3% accuracy at t8.
5. **L4.** Not applicable to this observation.

🔴 **All of 1–4 are yours to rule. I have taken none of them.**

---

## 6. The pack and `WORLD_PACK_VERSION` — answered both ways

🔵 `WorldScout.ability` **is** published: `WorldPackSnapshotBuilder.php:288`, the key that took
`WORLD_PACK_VERSION` 11 → 12.

**For what I shipped:** 🟢 **No regenerate, and no bump. `WORLD_PACK_VERSION` stays 14.** My
change touches no derivation — the app diff is one new diagnostic row plus comments, the backend
diff is a docblock. Existing packs are correct for the code that reads them.

**If you rule a derivation change:** ⚠️ **a regenerate IS required and a bump probably is too.**
🔵 A changed value under an unchanged key is what `WorldPackSnapshotBuilder` itself calls *"a
break"* (its `tier` comment), and A27 — the last change to this derivation — recorded that it
*"needs `app:backfill-scout-abilities --force` behind it and a `WORLD_PACK_VERSION` bump, exactly
as this one did."* 🔴 **The tension to rule on, stated plainly:** `ability` is census, so a bump
for it is not forbidden by the pack-is-a-census rule — but the *reason* for changing it is money,
and your standing rule is that v11 was the last bump money ever caused. **Those two readings give
opposite answers and only you can pick.** ✅ Cost is low either way: B2 rebuilt a full 8-tier
England in 16 seconds tonight. **I have not bumped it.**

🔴 **And there is a third site a weights change must touch, which the brief names two of.**

| site | what it holds |
|---|---|
| `ScoutAbilityCalculator::WEIGHT_EXPERIENCE/WEIGHT_JUDGEMENTS` | the live formula |
| `wunderkind-app/src/utils/scoutAbility.ts` `WEIGHT_EXPERIENCE/WEIGHT_JUDGEMENTS` | the legacy-row mirror |
| **`migrations/Version20261120100000.php:86-87`** | 🔴 **the same arithmetic again, in Postgres NUMERIC** |

🟡 The migration has already run everywhere, so it is historical for existing databases — **but a
fresh database replaying migrations would backfill the OLD abilities**, and only
`app:backfill-scout-abilities --force` would then correct them. **Three implementations of one
quantity.** That is the governing defect of this workstream with one more copy than anybody has
been counting, and it is worth its own small task: the migration should call the calculator or be
documented as frozen-at-v1.

**The app fallback:** 🟢 `fallbackScoutAbility` is **left as it is**, correctly, because I changed
no derivation. If you rule, all three sites move in the same commit — that is the whole point of
`scoutAbility.ts`'s own warning and it is still accurate.

---

## 7. What I shipped

**Everything here is diagnostic or documentation. No pricing, no derivation, no authored number.**

### 7.1 `wunderkind-app/src/economy/economyDiagnostics.ts` — a new CHECKS row

`staffvaluation.scoutband`, **"Scout ability vs the coach band"**, beside the existing ladder row.
It states a relationship, it can fail, it is failing now, and the failure changes what someone
does:

```
t8 · coaches 2–4 (2 sampled) · scouts 19–19 (1 sampled) · scout mid / coach mid 6.33x  ❌ OUTSIDE THE COACH BAND
t1 · coaches 29–55 (2 sampled) · scouts 42–42 (1 sampled) · scout mid / coach mid 1.00x  ✅ inside
```

🔵 **The invariant is A25's ruling, not a tolerance.** A club's scouts and its coaches band off one
authored table, so the comparator is the coaches' own span and **there is no constant to tune.**
⚠️ The coach span is **observed, not read** — `poolConfig.staffAbilityRanges` is backend-only and
is never published, so a device cannot read the band, only its output. A one-coach sample states a
point rather than a range and is reported as thin rather than as a pass; so is a tier carrying no
coach, because an unmeasured invariant must not read as a satisfied one.

**Why this earns its line** (standing notes §2): it is the row that would have caught A32 in one
reading, it reuses the sample the panel already builds so it costs nothing extra, and it will
still be worth printing in six months as the permanent answer to *"is a scout priced like a coach
at this tier?"*. Its docblock says in terms: **do not make it pass by changing what it measures.**

### 7.2 Three comment corrections, each a claim I measured to be false

1. 🔴 **`economyDiagnostics.ts` misattributed this very mechanism.** It said the owner's
   93.5% / 84× came from `ClubWageScaleService` dividing the reservation by `ability^k`. §3.1
   shows the split cannot run on a fresh save; the band priced it. **The proportional split gives
   87.6% and 49.2× on the same ability vector — close enough to look like a confirmation**, which
   is exactly why it survived. Corrected in the docblock and in the on-device `full` text, with
   the earlier £12,510 / £13,376 / 93.5% / 84× figures re-attributed (they are an ability-**21**
   scout through the same band path).
2. 🔴 **`scoutAbility.ts` (app) said *"a real scout carries five"* judgement keys.** False since
   A27 on 2026-11-20. 🟢 Measured: all 5,278 scouts carry exactly seven, none carries five. The
   *rule* it supports — average over the keys present — is right and unchanged; only its evidence
   had moved.
3. 🔴 **`ScoutAbilityCalculator`'s docblock carried the same stale "five"**, plus a line saying
   the banded input comes from *"the club's own `league_ability_ranges` window"* — the **player**
   table, superseded by A25. Both corrected, and A32's measurements recorded beside the 70/30
   ruling with an explicit note that the ruling is **not** the defect and is not to be tidied away.

### 7.3 Tests

Five new cases in `src/__tests__/economy/staffValuationChecks.test.ts`: the owner's own t8 shape
warns and names the tier; a scout inside the span passes; a one-coach sample reports a point; no
comparable tier warns rather than passing; and an absent `ability` is skipped rather than counted
as 0 (which would invert the finding).

---

## 8. Verification

🟢 **Machine state before measuring** (standing notes: check before trusting any timing):

```
$ uptime
21:38  up  3:59, 4 users, load averages: 3.83 3.35 3.31
$ ps -eo pid,ppid,pcpu,etime,comm | awk '$3>50'
(no output — no orphaned busy-loops)
```

🟢 **App typecheck**, at app `97ed9e00` + this change:

```
$ npx tsc --noEmit
(no output)
```

🟢 **Backend PHPUnit**, verbatim. ⚠️ **Scope named beside the figure, as the standing notes
require: `--exclude-filter admin_logs`** — the NARROW, documented exclusion from
`environment.md`, which keeps 71 of that file's 72 tests. 🔴 **This is therefore NOT comparable to
B2's 3,307 at `3ff5a312`**, which excluded the whole `AdminShellCoverageTest` class; do not
reconcile the two. Measured at **backend `3ff5a312` + this change**:

```
$ lando php vendor/bin/phpunit --colors=never --exclude-filter admin_logs
...
Time: 04:52.441, Memory: 932.50 MB

There were 3 failures:

1) App\Tests\Controller\Admin\NotificationLogCrudControllerTest::testIndexRowIsClickableToADetailPageShowingTheFullPayload
The row for this log entry should be present.
Failed asserting that 0 is greater than 0.

/app/tests/Controller/Admin/NotificationLogCrudControllerTest.php:65

2) App\Tests\Controller\Api\CompetitionControllerTest::testShowIncludesResultsOnceRoundsAreProcessed
a freshly generated result must carry a non-empty narrative timeline
Failed asserting that an array is not empty.

/app/tests/Controller/Api/CompetitionControllerTest.php:807

3) App\Tests\Service\Friendly\FriendlyResolveSingleMatchTest::testResolvingAnAcceptedChallengeRecordsAFullResult
Failed asserting that an array is not empty.

/app/tests/Service/Friendly/FriendlyResolveSingleMatchTest.php:110

FAILURES!
Tests: 3376, Assertions: 157887, Failures: 3, PHPUnit Deprecations: 1, PHPUnit Notices: 21, Skipped: 13.
```

🟢 **3,376 tests, 3 failures, and all three are the documented known items #1–#3 BY NAME** —
`environment.md:193-195` lists them as `NotificationLogCrudControllerTest`,
`CompetitionControllerTest`'s narrative timeline, and `FriendlyResolveSingleMatchTest`, all three
"empty content table". ⚠️ Known items **#4 and #5 did not fire**, which `environment.md:232` says
is consistent with the documented three-to-five range rather than evidence either is fixed.
⚠️ **The 157,887 assertions are not a baseline** and no conclusion rests on them; the count and
the named failures are.

🔵 The backend diff is a **docblock**, so it cannot move any of this; the run is a confirmation
that the tree is where the baseline says it is, not an attribution.


### 8.1 ⚠️ The `seasonBudget` reader registry caught me, exactly as the standing notes said it would

🟢 **First full app run: 662 passed / 1 failed.** The failure was
`seasonBudgetService.test.ts` → *"nothing outside the known set reads `seasonBudget` in CODE"*,
with `src/economy/economyDiagnostics.ts` as the single new entry.

🔵 The standing notes record this trap and say *"either register the file deliberately with a
reason, or avoid the annotation"*. 🟢 The mechanism, measured against the guard's own source
(`seasonBudgetService.test.ts:128-131`): it strips **block comments and whole-line `//`
comments** and nothing else. My docblock mentions of `` `seasonBudget` `` were stripped; the one
that was not is the **device-facing `full:` string**, which is a runtime string literal and
therefore code.

🟢 **Fixed by rewording the prose, not by registering the file**, and the reason is recorded at
the site: `economyDiagnostics` **does not read `seasonBudget`** — it asks an injected rate
function, deliberately, because the architecture forbids it the engine import. **A registry that
lists a non-reader is worse than one that misses a reader**, because the next person to read it
learns a false fact about the call graph. The string now says "season budget" in prose.

⚠️ **The transferable half:** the standing note's phrasing is *"reads TYPE ANNOTATIONS, not just
executable code"* — which is true and incomplete. **It also reads string literals**, and a
diagnostic module is mostly string literals. Anyone adding to a CHECKS `full:` block should expect
this.


### 8.2 App suite — green, and it reconciles

🟢 **Run 2, after the fix, at app `46f9d104` + this change.** Verbatim:

```
$ npx jest --listTests | grep -c "__tests__"
663

$ npx jest
Test Suites: 663 passed, 663 total
Tests:       3 skipped, 11174 passed, 11177 total
Snapshots:   0 total
Time:        99.664 s
EXIT=0
```

🟢 **Zero failures, and `--listTests | grep -c "__tests__"` equals the suite count at 663** — the
robust spelling, not `wc -l`, per the standing notes.

🟡 **It reconciles exactly:**

| | suites | tests |
|---|---|---|
| `4bebf8fc` / `97ed9e00` baseline (CLAUDE.md's row) | 663 | 11,168 |
| `+ 46f9d104` (the PM's binding-rule commit) | 663 | **+1** — one row added to `contextDocSync`'s data-driven `MIRRORED_RULE_ANCHORS`; 🟢 that suite reads 49 against its stated 48 |
| `+ this change` | 663 | **+5** — the five new cases in `staffValuationChecks.test.ts` |
| **measured** | **663** | **11,174** ✅ |

No new suite file, which is why the suite count does not move: the new cases went into the
existing `staffValuationChecks.test.ts`.

🟢 **Machine state across that run** (so the duration is not read as a finding):

```
$ uptime   # before
21:47  up  4:08, 4 users, load averages: 6.63 7.05 5.05
$ uptime   # after
21:49  up  4:09, 4 users, load averages: 18.54 10.57 6.62
```

⚠️ **The load rose to 18.54 on 8 cores during the run, so the 99.664 s is not a clean timing and I
am not offering it as one.** It is, however, a **fully green run taken under load**, which is the
strong direction: contention fabricates failures, it does not hide them. 🔵 The standing notes'
caution about load applies to attributing a FAILURE, and there is none to attribute.

⚠️ **Run 1 of the app suite is reported in §8.1 rather than hidden.** It read 662 passed / 1
failed, the failure was the `seasonBudget` reader registry, and the cause was my own device-facing
string. Both runs are kept because a report that shows only the green run teaches nobody the trap.

---

## 9. Things I found that are not mine, listed so they are not rediscovered

1. 🔴 **A THIRD copy of the 70/30 blend**, in `migrations/Version20261120100000.php:86-87`. §6.
   Worth its own small task.
2. 🔴 **`economyDiagnostics.ts` misattributed the mechanism** — fixed, §7.2, but the *reason* it
   survived is worth carrying: the wrong mechanism gave 87.6% / 49.2× against the right one's
   89.5% / 65.6%. **A plausible number from the wrong function reads as a confirmation.** This is
   the standing notes' *"a loud failure next to a plausible culprit is not a diagnosed failure"*
   with the roles swapped: a plausible FIGURE next to the wrong MECHANISM.
3. ⚠️ **The star display cannot produce the brief's "4★ vs 3★"** (§4, last paragraph). Every staff
   star surface I traced passes `ceiling={100}`, which puts abilities 2–4 and experience 2–7 all
   at the 0.5★ floor. Either there is a surface I did not find, or the brief's star counts are a
   transcription artefact. **One device look settles it**, and it matters because "paid 65× a
   coach the UI rates HIGHER" is how the grievance is phrased.
4. ⚠️ **The staff stars read `experience` for a scout and `coachingAbility` for a coach**
   (`StaffScreen.tsx:126`, `StaffMiniCards.tsx:25`) — two different quantities under one ★ column.
   After A26 created `ability` as the comparable figure, that is arguably now the wrong field, but
   changing what a player SEES is not a diagnostic change and I have not touched it.
5. ⚠️ **`CLAUDE.md`'s new MECHANISM-FIRST rule cites the scout floor as "~18-point"**; measured it
   is **15.75**. It is a PM-owned mirror of `tribal-knowledge.md` Q4 — reported, not rewritten.
6. 🔵 **Two prunable worktrees** are listed by `git worktree list` in the app repo, both other
   sessions' scratchpads at `ac71159b`. **Neither is inside the repo**, so jest's collection is
   unaffected (663, measured). Left alone — not mine to prune.
7. ⚠️ **`var/log/` is still unrotated** (3.8 GB `dev.log` + 2.0 GB `.bak`), which is why
   `admin_logs` has to be excluded at all. Owner's call, unchanged.

---

## 10. What I did NOT do, stated so the absence is legible

- **No lever pulled.** `WEIGHT_EXPERIENCE` / `WEIGHT_JUDGEMENTS` untouched in all three copies;
  `scoutJudgementMin/Max` untouched; `ScoutWageCalculator`'s and `resolveScoutWagePence`'s inputs
  untouched; no reservation split per role.
- **No authored number chosen**, and none proposed as a decision — §5 reports the curve.
- **`WORLD_PACK_VERSION` not bumped.** Still 14. No pack regenerated.
- **`fallbackScoutAbility` left as it is**, correctly: nothing it mirrors has moved.
- **No stage `output/` edited** in either repo — one pass entry appended to each
  `.context/shared/last-sync.md`, and the `- **Commit:**` header left alone because status and
  review are the PM's.
- **Nothing pushed, nothing deployed.** No worktree created in either repository.

---

## 11. The one thing to put in front of the owner

> A scout's `ability` is `0.7 × experience + 0.3 × mean(judgements)`. The experience half is drawn
> from your per-tier staff band; the judgement half is not — it comes from one global window at
> every tier, so it adds a flat **15.75 points to every scout in the world**. At the top of
> England that is a third of the figure and nobody notices. At tier 8 it is 88% of it, so a scout
> rates 19 while the coaches beside them rate 2–4 — and because the wage curve is `ability^2.5`,
> that becomes **65× the money**. On your own club: £9,740.57 of a £10,881.71 weekly staff bill.
>
> **The ruling you approved is not the fault and does not need revisiting on its own terms** — it
> even predicted this number in writing ("0.7/0.3 gives 61 vs 19"). What changed is that the wage
> was later priced off `ability`, so a compression of the *ability* ladder became a distortion of
> the *wage* ladder.
>
> **The decision in front of you is smaller than it looks, because nothing in the game reads a
> scout's `ability` as quality.** Scouting accuracy comes from `judgements` directly; the stars
> come from `experience`. So reducing the judgement weight costs **no** scouting accuracy at any
> tier — measured, 53% before and after. Banding the judgements instead *would* cost it: 53% → 3%
> at tier 8.
>
> §5.2 is the curve across the whole range at both ends of the pyramid. **There is no value that
> is wrong at the top**, so this is not a trade between tier 1 and tier 8. §5.3 is a fifth option
> that removes the flat term without authoring any number at all, by applying your 30% relative
> to the judgement window instead of absolutely — it puts a scout's ability exactly on their
> tier's staff band (t1 29/42/55, t4 11/16/21, t8 2/3/4). **That is the one I would recommend if
> asked.** A staff salary is a contract, so whichever you choose lands on **new saves and new
> hires** — the £9,740.57 on your current save is permanent there by your own B1 ruling.

---

## 12. Commits

🟢 **Backend `8b1d9c2c`** on `development`, parent `3ff5a312` — *"A scout's ability carries a flat
15.75-point judgement floor into a power-law wage"*. Two paths, staged by explicit path:
`src/Service/ScoutAbilityCalculator.php`, `.context/shared/last-sync.md`.

🟢 **App `a4e784fe`** on `new-game-save`, parent `46f9d104` — *"CHECKS can now see a scout rated
outside the band its own coaches come from"*. Four paths, staged by explicit path:
`src/economy/economyDiagnostics.ts`, `src/utils/scoutAbility.ts`,
`src/__tests__/economy/staffValuationChecks.test.ts`, `.context/shared/last-sync.md`.

🟢 **Docs `7d18927`** — this report, committed by explicit path in `wunderkind-docs`.

🟢 **All three trees clean after committing** (`git status --porcelain | wc -l` → 0 in each).
🔵 **Nothing pushed. Nothing deployed. No worktree created in either repository.**

⚠️ **Both commits carry the report's own epistemic discipline into their messages**, including the
run-1 registry failure and the load caveat on the timing — so a reader of `git log` alone is not
handed a tidier story than this file tells.

---

## 13. One task I would queue, if it is wanted

**Collapse the third copy of the 70/30 blend** (§6). `migrations/Version20261120100000.php:86-87`
either calls `ScoutAbilityCalculator` or carries a comment saying it is frozen at v1 and that
`app:backfill-scout-abilities --force` is what reconciles a replayed database. 🟡 Small, strictly
a correctness job, and it is the difference between "two sources for one quantity" and three — on
the quantity this whole report is about.

---

# PART TWO — the ruling arrived, and the mechanism shipped

⚠️ **Everything above was written before two owner rulings reached me. Part One is kept
unedited**, because its measurements are what the rulings were made on and a report that quietly
rewrites its own premise teaches nobody. Where Part One's recommendation is superseded, Part Two
says so.

## 14. The two rulings, and what each one settled

🔵 **Ruling A, 2026-11-21, verbatim:** *"Lower tier scouts genuinely worse at judging players is
the expectation."*

🔴 **That inverts §5.** Part One measured lever 1 — banding the judgements per tier — as the lever
whose cost was a gameplay change, and recommended against it on that basis. **The cost is the
point.** And it demotes §5.4's ranking: §5.3's relative form and lever 2 both fix the wage while
leaving a tier-8 scout judging exactly as well as a tier-1 one, which is the behaviour the ruling
says is wrong. **Part One's recommendation is superseded. The measurements are not.**

🔵 **Ruling B, same day, on being offered band numbers:** *we can worry about the bands after
we've tested that the process of matching the scaling to the tier is correctly implemented,
because we can then view the raw data against the scouts' reviews and make a judgment call.*

🟡 So the deliverable is **the mechanism plus the instrument**, and the number is explicitly not
mine and explicitly not now. That is the MECHANISM-FIRST rule applied by the owner to their own
decision: build the relationship, author the number, make it observable first.

## 15. Checking the inference I was handed before acting on it

🔵 The PM's arithmetic, marked by them as inference: judgements banded to roughly 10–20 at tier 8
puts ability *"near 7.6"* and the scout at *"something like 40–45%"* of the bill; banded to the
staff table, *"roughly one-thirteenth"*.

🟢 Measured through the app's own pricing functions against the live EN config:

```
######## 1. CHECKING THE PM'S INFERENCE: judgements banded 10-20 at tier 8 ########
  experience mid 3 · judgement mid 15
  ability = round(0.7*3 + 0.3*15) = round(6.60) = 7     [PM said "near 7.6"]
  wage £601.88/wk · bill £1,743.02/wk · scout share 34.5%     [PM said "40-45%"]
  vs best coach 4.1x

  banded to the STAFF TABLE (2-4): ability 3 · wage £72.37/wk · share 6.0% = 1/16.8 of the bill     [PM said "roughly one-thirteenth"]
  vs best coach 0.49x
```

🟡 **Close, and low in the direction that matters.** Ability 7 not 7.6, share **34.5%** not
40–45%, and one-**16.8th** not one-thirteenth. The PM's conclusion — *"those are very different
gameplay outcomes from the same ruling"* — is confirmed and if anything understated: the spread
between the two candidate bands is 34.5% against 6.0% of the whole staff bill.

## 16. The curve the PM asked for

🟢 Scout share of the staff bill as a function of the tier-8 judgement band, on the owner's own
shape (12 coaches fixed at £1,141.14/wk; only the scout moves). Verbatim:

```
  t8 judgement band   mid   ability    scout wage/wk    share of bill   vs best coach   accuracy u18/18+
       15-90        52.5        18       £8,509.07         88.2%         57.28x       53% /  53%   ← TODAY — flat global, every tier
       40-80          60        20      £11,073.27         90.7%         74.54x       60% /  60%   ← (the entity default, for reference)
       30-70          50        17       £7,376.03         86.6%         49.65x       50% /  50%
       20-60          40        14       £3,404.73         74.9%         22.92x       40% /  40%
       15-45          30        11       £1,863.13         62.0%         12.54x       30% /  30%
       10-30          20         8         £840.40         42.4%          5.66x       20% /  20%
       10-20          15         7         £601.88         34.5%          4.05x       15% /  15%   ← the PM's inference
        5-20        12.5         6         £409.39         26.4%          2.76x       13% /  13%
        5-15          10         5         £259.53         18.5%          1.75x       10% /  10%
        2-10           6         4         £148.56         11.5%          1.00x        6% /   6%
         2-7         4.5         3          £72.37          6.0%          0.49x        5% /   5%   ← the PLAYER potential band at t8
         2-4           3         3          £72.37          6.0%          0.49x        3% /   3%   ← the STAFF ability band at t8 — coach-comparable
```

🟢 And the answer to *"what makes a tier-8 scout cost like a tier-8 coach"*, solved rather than
searched:

```
######## 4. WHAT "COSTS LIKE A TIER-8 COACH" REQUIRES, SOLVED ########
  Target: the scout's wage within ±25% of the ability-3 comparator coach.
    ability  3        £72.37/wk  needs judgement mean   3.0  accuracy   3%  ← within ±25% of a coach
    ability  4       £148.56/wk  needs judgement mean   6.3  accuracy   6%
    ability  5       £259.53/wk  needs judgement mean   9.7  accuracy  10%
    ability  7       £601.88/wk  needs judgement mean  16.3  accuracy  16%
    ability 10     £1,468.12/wk  needs judgement mean  26.3  accuracy  26%
```

🔴 **So the honest answer to the PM's question is uncomfortable and should not be softened:
"costs like a tier-8 coach" and "recognisably able to judge a player" are not both available at
tier 8.** A judgement mean of 3 buys a 3%-accurate scout, and the band that makes a scout cost
like its coaches is the band that makes it nearly blind. ⚠️ That is not an artefact of my
arithmetic — it follows from `ability^2.5` being steep and an EN tier-8 staff band being 2–4
wide. **It is exactly why the owner was right to defer the number to observation**, and §18's
CHECKS row is built to show them the trade rather than describe it.

🟢 **Tier 1, the end that must not regress:**

```
  t1 judgement band   mid   ability    scout wage/wk   scout/coach   accuracy u18/18+
       15-90        52.5        45      £68,992.38         1.19x       53% /  53%   ← TODAY
       29-55          42        42      £58,062.15         1.00x       42% /  42%   ← the STAFF ability band at t1
```

⚠️ **The one regression to be explicit about.** At the shipped default the tier-1 scout's WAGE
improves (1.19× → 1.00× of a coach, which is the goal) and their **judgement mean falls from 52.5
to 42, so displayed accuracy reads 42% instead of 53%.** The ruling spoke about the bottom of the
pyramid and said nothing about the top, so this is a consequence of the default rather than
something asked for. 🟡 **`scoutJudgementBandBp = 12500` holds tier 1's mean at exactly today's
52.5** while still banding every tier below it — 52.5 ÷ 42, derived and not chosen. It is one
field, and §17 is why that matters.

## 17. What I built, and where the owner edits it

### 17.1 The band comes from the table that already exists

🟢 A club scout's judgements now band off `StaffAbilityRangeService::resolve($country, $tier)` —
**the same authored row its `experience` and a coach's `coachingAbility` already come from.**
`ScoutGenerationService::build()` already received `$country` and `$tier` (A25), so the plumbing
was there and this is four lines of resolution plus a helper.

🔵 **I did not add a second table, and the PM asked me to say if I thought that was wrong. I do
not.** A per-country, per-tier judgement grid would be a second authored surface for *"how good
is a person at this tier"* — the defect class this workstream exists to remove — and it would
need 26 countries × 8 tiers of new figures before anything could ship. One source for the band.

🟡 **But one consequence of that choice is worth stating plainly, because it is the cost:** the
staff table is shared, so moving it to make scouts judge differently would move coaches too. That
is what the dial in §17.2 exists to avoid, and it is why the dial is not optional dressing.

### 17.2 The dial, which is the authored part

🔴 **`PoolConfig::$scoutJudgementBandBp`, basis points, shipped at `10000` (= ×1.00).** The
judgement window is `[bp/10000 × band.min, bp/10000 × band.max]`, clamped into 1–100 and ordered.

🟢 **Where the owner edits it:** **Admin → Staff Pool Rules → SCOUT GENERATION → "JUDGEMENT vs
TIER"**, the field immediately under the existing JUDGEMENT min/max pair. Column
`pool_config.scout_judgement_band_bp`.

🟡 **Why 10000 is the shipped default:** it is the only value that needed no new figure to be
authored, and it makes `ability` tier-consistent with a coach's by construction. **It is a
starting point and the report says so in the code**, not a verdict. 12500 is the derived
alternative that holds tier 1 at today's judgement mean (§16).

⚠️ **Tuning it later is a data edit, not a release** — which is the whole of Ruling B's
requirement. Nothing about the band is a literal in the generator.

### 17.3 The untiered pool is deliberately untouched

🟢 A pool scout passes no tier, so it keeps the flat global `scoutJudgementMin/Max` — the same
ruling that left `scoutExperienceMin/Max` alone as the untiered experience window. 🔵 **So that
pair is NOT dead config after A32: it is the untiered band.** A brief once predicted
`scoutWageMin/Max` would become dead config and it did not, for exactly this reason; the same
trap is avoided here on purpose.

🟢 **The complete call graph, measured rather than assumed — there are exactly two callers:**

```
$ grep -rn --include='*.php' "scoutGen->build(" src/
src/Service/WorldPackClubGenerationService.php:148:   $this->scoutGen->build($nationality, $country, $tier);   ← every club scout: BANDED
src/Service/MarketPoolService.php:354:                $this->scoutGen->build($nationality);                   ← the shared pool: UNTIERED
```

### 17.4 Measured on real generation, through the real service

🟢 The migration applied to the dev database (default ×1.00, no operator action), then 400 scouts
built per tier through `ScoutGenerationService` itself — not through a model of it. Verbatim:

```
dial scoutJudgementBandBp = 10000  (x1.0000)
untiered pair: experience 4-34, judgement 15-90

tier  staff band   experience       judgements       ability        wage/wk
t1    29-55        29-55 (m41.6)    29-55 (m42)      32-52 (m41.8)  £39.40-£48.40
t2    20-38        20-38 (m29)      20-38 (m29.1)    22-36 (m29.1)  £34.90-£41.20
t3    14-26        14-26 (m20.1)    14-26 (m20)      15-25 (m20)    £31.75-£36.25
t4    11-21        11-21 (m16.1)    11-21 (m16)      12-20 (m16.1)  £30.40-£34.00
t5    8-15         8-15 (m11.5)     8-15 (m11.5)     8-14 (m11.5)   £28.60-£31.30
t6    6-11         6-11 (m8.2)      6-11 (m8.5)      6-11 (m8.3)    £27.70-£29.95
t7    3-6          3-6 (m4.5)       3-6 (m4.5)       3-6 (m4.5)     £26.35-£27.70
t8    2-4          2-4 (m3.1)       2-4 (m3)         2-4 (m3.1)     £25.90-£26.80

POOL (untiered, no country/tier passed) — must be unchanged:
  experience 4-34 · judgements 15-90 (mean 52.8) · ability 13-45 (mean 29.2)
```

🟢 **Read the `ability` column against the `staff band` column: every tier now lands inside its
own band.** Tier 8 is 2–4 against coaches on 2–4, where it was ~18. Tier 1 is 32–52 inside 29–55.
🟢 **And the pool row is identical to before** — experience 4–34, judgements 15–90, ability 13–45.

⚠️ **The `wage/wk` column is the BACKEND's `Scout::weeklySalary`** (`ScoutWageCalculator`'s
£25–£70 global window), not the app's band price. It is in the table because it is what the
service wrote, and it is not the figure the owner's screen shows. The app-side money is §17.5.

⚠️ **Asymmetry in my evidence, stated rather than glossed:** the AFTER figures above are measured
on real generation; the BEFORE figures in Part One are computed from live config through the same
formula. They are not the same kind of measurement. 🟢 What makes the comparison safe is that the
BEFORE computation **reproduced the owner's device screen to the penny** (§3), and that the old
mechanism is still running on the POOL row above, where judgements read 15–90 exactly as they did
everywhere before.

### 17.5 The owner's own shape, after

🟡 At the shipped default a tier-8 club scout is ability 2–4, so through the app's band rung:

| | scout | 12 coaches | bill | scout share | vs best coach |
|---|---|---|---|---|---|
| **before** | £9,740.57/wk | £1,141.14/wk | £10,881.71/wk | **89.5%** | **65.6×** |
| **after** (ability 3) | £72.37/wk | £1,141.14/wk | £1,213.51/wk | **6.0%** | **0.49×** |

🟢 **Tier 1 does not regress on money: 1.19× → 1.00× of a coach**, which is the relationship A25
intended. The accuracy consequence at tier 1 is §16's one caveat and §17.2's one field.

## 18. The instrument — "view the raw data against the scouts' reviews"

🔵 Ruling B's second half is an observability requirement, and the standing instruction is
explicit that a figure only a device can confirm belongs on the CHECKS tab as a **relationship**.

🟢 **New row: `staffvaluation.scoutjudgement` — "Scout judgement vs the tier it works in".** Per
sampled tier it states the scouts' own judgement mean, the displayed accuracy that follows, the
**error band in raw rating points** a read therefore carries, and the coach ability span of the
same tier for scale:

```
t1 · judgement mean 42.0 (1 scout(s)) · accuracy 42% · read is +/-5.8 of a 0-100 rating · coach ability 42-44  ✅ a read can still rank this division
t8 · judgement mean 3.0 (1 scout(s)) · accuracy 3% · read is +/-9.7 of a 0-100 rating · coach ability 3-5  ❌ THE ERROR BAND IS WIDER THAN THE DIVISION
```

🟡 **The relationship is the last pair, and it is what makes the judgment call possible.** An
error band wider than the whole span of ability in the division means a read there cannot rank
its own players. That may be exactly what "genuinely worse" is meant to buy, or further than
intended — and it is a thing the owner can look at and have an opinion about, where "judgement
mean 3" on its own is not. **The row reports the trade; it does not take a view.**

🟢 It also asserts the ruling itself as a testable statement: **accuracy must not rise as the
pyramid deepens**, and it names any inversion. One tier sampled warns, because the ruling is
about the ladder and one rung cannot show it.

🔴 **Two honesty constraints, written into the row's own `full` text rather than left for a
reader to discover:**

1. ⚠️ **It bounds the error; it does not sample actual reports.** `applyScoutNoise` draws
   `(Math.random() - 0.5) * noise`, so a real read is a draw from this band. Sampling the
   persisted `scouting_reports` would be the stronger measurement and is **not reachable here** —
   those rows are behind the db layer, this module is pinned to the economy and types layers so
   the panel stays reproducible headlessly, and **a fresh save has no reports at all**, which is
   exactly when the owner wants to look. ⚠️ **So if the owner wants true read-versus-truth
   sampling, that is a second, larger job in the db layer and it is not what I built.** Saying so
   is the point.
2. ⚠️ **No facility reduction is applied** — this is the bare-scout band. Facilities narrow it by
   up to 11.5 of the 20, so a club with scouting facilities reads **tighter** than the row says,
   never wider.

🟡 **On earning the line:** this is A32's second row, which is the top of the PM's "one or two".
It reuses the sample the panel already builds and adds one derived field (`judgementMean`) to it.
🔵 I read A31's rework before adding to that section, and the new field follows its rule rather
than a new one: **averaged over the keys PRESENT, never a fixed divisor**, because a pack cached
at v12 or earlier carries five judgement keys and a current one carries seven — a fixed divisor
mis-rates one population by 29% and the other by 40%, and the answer still looks plausible.

⚠️ **A third statement of that mean now exists** (`ScoutAbilityCalculator`, `scoutAbility.ts`, and
this). The first two DERIVE a figure the game prices from and must stay in step; this one derives
nothing and reports what is on the row. Routing it through `scoutAbility.ts` would pull `@/utils`
into a module that `economyDiagnostics.test.ts` pins to the economy and types layers precisely so
the panel can be reproduced against a live config without a device. **A diagnostic that cannot
run without the app cannot check the app.** The reason is recorded at the site.

## 19. The app mirror — answered, and the answer is "no change, by construction"

🟢 **`fallbackScoutAbility` needs no edit, and this is verifiable rather than asserted.**

```
$ grep -n "WEIGHT_EXPERIENCE\|WEIGHT_JUDGEMENTS\|random\|Min\|Max" wunderkind-app/src/utils/scoutAbility.ts
34:const WEIGHT_EXPERIENCE = 0.7;
35:const WEIGHT_JUDGEMENTS = 0.3;
88:    Math.round(WEIGHT_EXPERIENCE * clampedExperience + WEIGHT_JUDGEMENTS * clamp(mean)),
```

🟡 **It mirrors the FORMULA — a weighted blend of values already stored on the row — and carries
no generation range at all.** A32 changed which values get ROLLED, not how they are blended. So a
legacy scout and a freshly generated one of the same experience and judgements still agree, which
is the only property that mirror exists to hold. 🔵 The same is true of
`fallbackScoutWeeklyWagePence` and of `migrations/Version20261120100000.php`'s SQL copy: **all
three copies of the 70/30 blend are untouched and all three remain correct.** §6's finding about
the third copy stands and is still worth its own task — A32 simply does not disturb it.

🟢 **And nothing re-rolls an existing scout.** The complete set of writers:

```
$ grep -rn --include='*.php' "setJudgements" src/ migrations/
src/Entity/Scout.php:131          (the setter)
src/Service/ScoutGenerationService.php:162        ← changed; generation only
src/Command/GenerateMarketDataCommand.php:335     ← a different, untiered population; left alone
```

No migration touches `judgements`, and `app:backfill-scout-abilities` re-DERIVES `ability` from
stored inputs rather than re-rolling them, so there is nothing for it to do either. 🟡 **This
lands on new saves and newly generated scouts** — which, since judgements are a person and not a
price, is the correct and only honest outcome, and it is the same shape as the contract rule for
salaries.

## 20. The pack and `WORLD_PACK_VERSION` — a clear recommendation, not a list

🔴 **Recommendation: bump `WORLD_PACK_VERSION` 14 → 15 in the same change that deploys this.
I have not done it — it is the owner's call — but it is a recommendation and not an option set.**

🟢 **Four things, each verified here rather than inherited.** The PM sent me evidence for this and
I checked all of it; it holds, and one point is stronger than they put it.

**1. Judgements are pack content, so existing sets carry the old scouts.**

```
$ grep -n "'judgements'" wunderkind-backend/src/Service/WorldPackSnapshotBuilder.php
292:            'judgements'  => $scout->getJudgements(),
```
🔵 And `WorldScout` (`wunderkind-app/src/types/world.ts:42`) declares `judgements: ScoutJudgements`
beside `ability`. So a v14 set holds scouts rolled under the flat window, and a save built from
one gets them whatever the generator now does.

**2. The direct precedent says a bump, and says it in the code.** 🔵 `types/world.ts:18-20` on
`ability`: *"carried in the pack since `WORLD_PACK_VERSION` 12 … **v12 forces a rebuild**, so a
current pack always carries it."* Adding the field took a bump; changing the values it derives
from is the same class of change. 🔵 A27 — the last change to this derivation — recorded the same
requirement.

**3. The bump is the MECHANISM, not a marker — and it is stronger than I was told.**

```
$ grep -n -A8 "function countReadyUnclaimed" src/Repository/WorldPack/WorldPackSetRepository.php
142:            ->andWhere('s.payloadVersion = :version')
$ grep -n "payload_version" src/Repository/WorldPack/WorldPackSetRepository.php
61:                        AND payload_version      = :version      ← inside claimOldestReady()
```
🟢 **Both the COUNT and the CLAIM filter on the version.** The PM's note covered the count; the
claim matters more. So a bump makes every v14 set simultaneously uncountable (→ a deficit → the
per-init top-up fills it, the path B2 fixed and proved at 16 seconds for a full 8-tier England)
**and unclaimable**, so a new save cannot be handed an old-scout set even by accident. 🔴 **Without
a bump, old v14 sets stay claimable** and somebody must Regenerate each country by hand and be
sure they caught them all — and a half-regenerated state is precisely the MIXED pack that
invalidated three hours of device testing on 2026-11-20.

**4. The standing rule is not in the way, and the report should say so rather than leave it
hanging.** 🔵 *"v11 is the last bump money will ever cause"* is about MONEY, which was deliberately
moved off the pack so that authoring a price stops being a cache invalidation. 🟡 **Judgements and
ability are census — what a person IS — and legitimately live in the pack, so changing them is
exactly what the version is for.** Part One §6 raised the opposite reading (that the *reason* here
is money) and I am resolving it: the reason is a gameplay ruling about scouting quality, and the
money improvement is a consequence. **No rule is broken by a bump; one is broken by baking a
price in, which this does not do.**

🟢 **If the owner would rather not bump:** the fix still works for every newly generated pack, and
every country must then be Regenerated by hand before testing. ⚠️ Read the pack version indicator
first either way — a `MIXED`/`STALE` reading is a gate, not a footnote.

**So, plainly, for the England-then-Scotland test the owner is planning:** bump and the system
regenerates itself; do not bump and they regenerate by hand, per country, with a MIXED state as
the failure mode. **Regeneration is cheap; a half-regenerated world is not.**

## 21. Verification, Part Two

### 21.1 ⚠️ The documented test-DB trap fired, and the documented check is what caught it

🟢 First full backend run after the change went red in a cluster — F's and E's from about test 500
to 549, where the baseline had one. 🔵 `environment.md:86` names this exact failure mode:
**`wunderkind_test` is NOT migration-tracked** — it is built by `doctrine:schema:create` from
entity metadata, so a migration never reaches it, and *"the suite then fails in ways that look
nothing like your change."* It has happened twice before (2026-11-02, 36 failures; 2026-11-20,
20 errors and 5 failures).

🟢 The page's instruction is *"after adding a column, check `information_schema.columns` in
`wunderkind_test` BEFORE reading a single assertion"*. Done, and that was the whole answer:

```
$ lando psql -A -t -d wunderkind_test -c "SELECT column_name FROM information_schema.columns WHERE table_name='pool_config' AND column_name LIKE 'scout_judgement%';"
scout_judgement_max
scout_judgement_min
```

⚠️ **The run was stopped rather than read.** A suite measuring a schema the entity does not match
is not evidence of anything, and reading its assertions is how 4 errors got attributed to the
wrong cause on 2026-11-20.

🟢 Fixed in the order that page insists on — **nullable → backfill → `NOT NULL` → `SET DEFAULT`**,
because the column is `NOT NULL` with an entity default:

```
$ lando php bin/console dbal:run-sql "ALTER TABLE pool_config ADD COLUMN IF NOT EXISTS scout_judgement_band_bp INT" --env=test
 [OK] 0 rows affected.
$ lando php bin/console dbal:run-sql "UPDATE pool_config SET scout_judgement_band_bp = 10000 WHERE scout_judgement_band_bp IS NULL" --env=test
 [OK] 22 rows affected.
$ lando php bin/console dbal:run-sql "ALTER TABLE pool_config ALTER COLUMN scout_judgement_band_bp SET NOT NULL" --env=test
 [OK] 0 rows affected.
$ lando php bin/console dbal:run-sql "ALTER TABLE pool_config ALTER scout_judgement_band_bp SET DEFAULT 10000" --env=test
 [OK] 0 rows affected.

$ lando php bin/console dbal:run-sql "SELECT column_name, is_nullable, column_default FROM information_schema.columns WHERE table_name='pool_config' AND column_name='scout_judgement_band_bp'" --env=test
  scout_judgement_band_bp   NO            10000
```

🟡 **22 rows**, which is the documented leaked `pool_config` population in that database (A25's
open item 4) — unrelated to this change and left alone.

🟢 And the guard that exists for exactly this, green, so the DB matches the entity including the
default:

```
$ lando php vendor/bin/phpunit --colors=never --filter 'SchemaIsInSync'
OK (1 test, 2 assertions)
```

⚠️ **This is the FOURTH instance on that page and it is a standing trap, not an incident.** Worth
restating for whoever adds the next column: **a new column is two jobs**, the migration and the
test database, and the second has no reminder attached to it. 🔵 The owner's dev and prod
databases ARE migration-tracked, so this affects testing only — `doctrine:migrations:migrate`
applied cleanly to `wunderkind` in 15.4 ms.

### 21.2 ✅ The row that would have caught A32 now confirms the fix

🟡 Worth noting as a property rather than a coincidence. §7.1's `staffvaluation.scoutband` row
asks whether a scout's ability lands inside the span its coaches occupy. Before the change an EN
tier-8 scout was ability 19 against coaches on 2–4 and the row read **❌ OUTSIDE THE COACH BAND**.
🟢 After it, generation puts a tier-8 scout at 2–4 (§17.4) and the same row reads **✅ inside**.

🔵 **That is the instrument and the fix having been built independently** — the row was written
before either ruling arrived, against the invariant A25 stated, and it changes verdict without
being touched. Its docblock says *"do not make this row pass by changing what it measures"*; what
happened instead is that the thing it measures moved.

## 22. What is now true, what is still the owner's, and what I did not do

### 22.1 Shipped

| | |
|---|---|
| **Mechanism** | A club scout's seven judgements band off `StaffAbilityRangeService::resolve($country, $tier)` — the same authored row its experience and a coach's ability come from. The shared pool is untouched. |
| **The authored dial** | `pool_config.scout_judgement_band_bp`, default **10000** (×1.00), editable at **Admin → Staff Pool Rules → SCOUT GENERATION → "JUDGEMENT vs TIER"**. Tuning later is a data edit. |
| **Instrument** | CHECKS row `staffvaluation.scoutjudgement` — judgement mean → accuracy → error band in rating points → against the division's own ability span, with inversions named. |
| **Second instrument** | CHECKS row `staffvaluation.scoutband` (Part One) — a scout's ability against the span its coaches occupy. Read ❌ before, reads ✅ after. |
| **Measured outcome** | Every EN tier's scout ability now lands inside its own staff band (t8 2–4 against coaches 2–4, was ~18). Owner's shape: scout share **89.5% → 6.0%**, **65.6× → 0.49×**. Tier 1 money **1.19× → 1.00×**. |

### 22.2 Still the owner's, and nothing was taken

1. 🔴 **The band number.** Shipped at ×1.00 because that is the only value needing no new figure
   authored. **Deferred by the owner to observation, which is the whole design.**
2. 🔴 **`WORLD_PACK_VERSION`.** §20 recommends **14 → 15** with the mechanism verified. **Not
   bumped.** Still 14.
3. 🔴 **The 70/30 weights.** Untouched in all three copies, and the ruling behind them is
   unaffected — A32 removes the flat term those weights were holding back, it does not reweight
   anything.
4. ⚠️ **The tier-1 accuracy consequence** (52.5 → 42 judgement mean, 53% → 42% displayed). One
   field, `12500`, restores it exactly. **Their call, and they should know it is there.**

### 22.3 Not done, deliberately

- **No second authored table.** §17.1 says why, and names the cost of that choice.
- **No pack regenerated, no version bumped, nothing pushed, nothing deployed.**
- **`fallbackScoutAbility` not edited** — §19 shows why it needs no edit rather than asserting it.
- **No existing scout re-rolled.** Judgements are a person, not a price.
- **`GenerateMarketDataCommand`'s own seven-key builder left alone** — a different, untiered
  population.
- **No stage `output/` edited;** one pass entry appended to each `.context/shared/last-sync.md`.
- **`agent-standing-notes.md` not edited.** §9 and §21.1 hold two entries' worth of material (the
  reader registry reading string literals, and a fourth instance of the test-DB trap) and that
  file is the PM's to curate — task agents append findings, they do not rewrite entries.

### 22.4 The one thing I would say to the owner

> It is implemented and it is measurable. A tier-8 scout is now rated 2–4 like the coaches beside
> it instead of 19, so on your own club the scout goes from £9,741/wk and 89.5% of the bill to
> about £72/wk and 6%. Tier 1 is unchanged in money and now matches its coaches exactly.
>
> **The number is yours and it is one field** — Staff Pool Rules → SCOUT GENERATION → "JUDGEMENT
> vs TIER", shipped at 10000, which means "scouts judge exactly as well as their tier's coaches
> rate". Debug → CHECKS → *Scout judgement vs the tier it works in* shows you what each setting
> buys: at 10000 a tier-8 scout reads a player ±9.7 of a 0–100 rating, which is wider than the
> whole span of ability in that division — **so a tier-8 read is close to uninformative, and that
> may be more than you meant by "genuinely worse".** 12500 would hold tier 1 exactly where it is
> today while still banding everything below it.
>
> **One thing to decide before testing England and Scotland:** world packs carry a scout's
> judgements, so existing sets still hold the old scouts. I recommend bumping
> `WORLD_PACK_VERSION` to 15 in the deploy — the top-up then rebuilds every country on its own,
> and old sets become unclaimable so no save can pick one up by accident. Without it you have to
> Regenerate each country by hand, and a half-regenerated world is the MIXED state that cost
> three hours of testing on the 20th.

### 22.5 ⚠️ One operational finding for the PM: the app's `.context` byte budget is nearly spent

🟢 Measured after appending this pass's entry to `wunderkind-app/.context/shared/last-sync.md`:

```
$ python3 -c "import os,json,glob; base=json.load(open('src/__tests__/db/contextDocSync.baseline.json')); \
  tot=sum(os.path.getsize(f) for f in glob.glob('.context/**/*.md',recursive=True)); \
  print('total',tot,'cap',base['totalBytesCap'],'headroom',base['totalBytesCap']-tot)"
total 1579523 cap 1583911 headroom 4388
```

🔵 `contextDocSync.baseline.json` says the caps *"MAY ONLY EVER SHRINK … Never raise one to make a
commit pass."* 🟡 **So there are about 4.4 KB of headroom left, and a normal pass entry is 2–3 KB.**
The next one or two sessions will fit; the one after that will not, and the ratchet correctly
forbids the easy fix. ⚠️ This is a **PM-owned** decision (the deferred Phase 2 split in
`context-refresh.md`) and I have not touched it — but it is now close enough to bite inside a day,
and the failure mode is a session finishing its work and being unable to record it.

---

# PART THREE — the bump, granted and taken

🔵 **Owner ruling, 2026-11-21: bump `WORLD_PACK_VERSION` to 15.** §20's recommendation was
accepted, so brief §6's *"do not bump it unasked"* is satisfied. 🟢 **Done, in the same commit as
the generator change.** Every claim I was handed was re-verified here rather than inherited.

## 23. It is one site, and the app asserts nothing

🟢 Verified, not assumed:

```
$ grep -rn --include='*.php' "WORLD_PACK_VERSION" src tests migrations | grep -c ""
58 references
$ grep -rn --include='*.php' "WORLD_PACK_VERSION = " src
src/Service/WorldInitializationService.php:277:    public const WORLD_PACK_VERSION = 14;
$ grep -rn --include='*.php' -E "payloadVersion.*14|payload_version.*= *14" src
(no output)
```

🟢 **One literal; all 57 other references read the constant, including every test**, so the suite
follows the bump rather than pinning the old number. No hardcoded duplicate anywhere.

🟢 **And no app-side bump.** `src/economy/worldPackVersion.ts`'s own docblock: *"Nothing gates
behaviour on it. Economy behaviour gates on `wageModel` … `worldPackVersionIsAdvisory.test.ts`
enforces that by reading the import graph."* The app stores the value per tier and reports it.

## 24. 🟢 No backfill is needed, and none is wanted — measured, not reasoned

🔵 The hazard is real and documented: `BackfillPersonalitiesCommand.php:46` says *"Run this BEFORE
bumping `WorldInitializationService::WORLD_PACK_VERSION`."* So the question had to be answered
rather than skipped.

**Answer: no backfill, no ordering constraint, and here is why in three measurements.**

**1. Pack scouts are not database rows at all.** 🟢 `WorldPackClubGenerationService`'s own
docblock: *"Generates every entity one NPC club needs for a world-pack tier build — fresh,
in-memory, never persisted"*, and `grep -n "persist|flush"` over that file returns nothing. They
exist only inside the pack JSON, so the bump regenerating the pack IS how they are replaced.

**2. Every persisted Scout row is a shared-pool row, so the untiered window governs it — and
that window is unchanged.** 🟢 The decisive measurement:

```
$ lando psql -A -t -c "SELECT min(experience), max(experience), count(*) FROM scout;"
4|34|5278
```

🟡 **All 5,278 rows sit inside 4–34, the pool window, with not one above it.** A persisted club
scout would read up to 55 at EN tier 1 and up to 38 at tier 2. So there is no tiered scout in the
table for a backfill to correct. 🔵 This is the same conclusion the v14 entry reached for staff
(*"the `staff` and `scout` TABLES need no backfill at all"*) — reached again independently and
with data this time.

**3. Nothing re-rolls judgements anyway, and `ability` is already right.** 🟢 The complete writer
set is `ScoutGenerationService` (generation) and `GenerateMarketDataCommand` (a different,
untiered population); no migration touches `judgements`. `app:backfill-scout-abilities`
re-DERIVES `ability` from stored experience and judgements — both unchanged for every existing
row — so running it would be a no-op. 🟡 Unlike A27, which changed the KEY SET of stored rows and
therefore genuinely needed `--force` behind it.

## 25. The pool keeps its flat window, mirroring the existing ruling rather than re-ruling it

🟢 **Explicitly: I did not extend the band to the pool.** `PoolConfig::$scoutExperienceMin/Max`
was left untiered *"by ruling"* because a pool scout has no tier to be banded against, and the
identical logic applies to judgements. A pool scout therefore still draws both halves from the
flat globals — pinned by a test that authors a band AND sets the dial to ×0.01, then proves the
pool ignores both.

🟡 **Consequence worth stating:** `scoutJudgementMin/Max` is **not dead config** after A32 — it is
the untiered band, exactly as its experience sibling is. A brief once predicted `scoutWageMin/Max`
would become dead config and it did not, for this same reason.

## 26. Ordering: both halves are in one commit

🔵 The two failure modes were put to me and both are real:

| ordering | failure |
|---|---|
| bump first | every country rebuilds immediately at v15 **with the old flat-judgement scouts baked in**; the version then claims packs are current when they are not, and a second rebuild nobody remembers is needed |
| generator first | new sets stamped **v14 beside the existing v14 sets** — two scout populations under one version number, which the pack indicator cannot distinguish. Worse than MIXED, because MIXED warns |

🟢 **Both are avoided: the constant, the generator, the migration and the admin field are one
commit.** The ordering reasoning is recorded in the v15 docblock and in the migration, so a future
split of this change has to argue with it first.

## 27. What "it worked" looks like on the device

🟢 Read from `describePackVersion` (`src/economy/worldPackVersion.ts:110`) rather than described:

- **`15`** — a single version, which is the good state and what a fresh save after the deploy
  should read.
- **`MIXED: 14, 15`** — tiers were fetched across the deploy. ⚠️ **Reachable if a save is created
  while the deploy is rolling**, because the version arrives once per tier and the tiers are
  fetched in a loop. 🔵 So: let the deploy finish before creating the England save.
- **`pre-5`** — a save built before the field shipped; not expected here.

🟡 **And the owner should not need the admin screen at all.** Old v14 sets stop being claimable,
a deficit appears, and the per-init top-up rebuilds — the path B2 fixed and proved on real traffic
at 16 seconds for a full 8-tier England. ⚠️ If the indicator reads `MIXED` or still shows `14`
after a fresh save, that is the gate failing and is worth stopping on rather than reading the
figures underneath it.

## 28. Verification, Part Three — and how two unexpected failures were attributed

🟢 **Backend, at `3ff5a312` + the generator change + the bump, `--exclude-filter admin_logs`:**

```
Time: 04:54.482, Memory: 950.50 MB
FAILURES!
Tests: 3383, Assertions: 162839, Failures: 3, PHPUnit Deprecations: 1, PHPUnit Notices: 21, Skipped: 13.

1) App\Tests\Controller\Admin\NotificationLogCrudControllerTest::testIndexRowIsClickableToADetailPageShowingTheFullPayload
2) App\Tests\Controller\Api\CompetitionControllerTest::testShowIncludesResultsOnceRoundsAreProcessed
3) App\Tests\Service\Friendly\FriendlyResolveSingleMatchTest::testResolvingAnAcceptedChallengeRecordsAFullResult
```

🟢 **3,383 tests, 3 failures, all three the documented known items #1–#3 by name.** And the count
reconciles exactly: **3,376 at this commit before the change (§8) + 7 new tests = 3,383.**

### 28.1 ⚠️ Two failures appeared, were NOT on the documented list, and were not waved away

🟢 The run before this one returned **5** failures. Two were not items #1–#5:

```
1) App\Tests\Command\SeedLocationsCommandTest::testForceCountryDoesNotSeedOtherCountries
2) App\Tests\Controller\Admin\LocationConfigControllerTest::testSmallGivesWayWhenTheBandsOverlap
```

🔴 **The documented range is "three to five", and it would have been easy and wrong to stop
there.** `environment.md`'s items #4 and #5 are `NpcClubForeignClubsCitySizeTest` and
`NpcClubPlaceWeightingTest` — **neither of these.** The standing notes are explicit: *"Confirm the
three by NAME; a count alone has hidden a sixth failure before."* So these were attributed rather
than absorbed, by four independent checks:

1. 🟢 **They pass in isolation.** `--filter 'SeedLocationsCommandTest|LocationConfigControllerTest'`
   → `OK (31 tests, 126 assertions)`.
2. 🟢 **My change cannot reach them.** `grep -iE "poolconfig|scoutgeneration|scoutJudgement|staffAbility"`
   over both test files returns nothing, and my diff writes `pool_config`,
   `ScoutGenerationService`, `PoolConfigController`, one twig, one test file and one migration —
   none of which touches the `location` table.
3. 🟢 **Their assertions are counts over a SHARED table.**
   `testForceCountryDoesNotSeedOtherCountries` is
   `SELECT COUNT(*) FROM location WHERE country_code <> :c` — the exact shape that the documented
   leaked-row problem in `wunderkind_test` produces (A25's open item 4: 98 leaked `league` rows,
   22 `pool_config` rows, *"a ~7% per-run flake that misattributes itself to whoever runs the
   suite"*).
4. 🟢 **The decisive one: they are gone in this run**, on the same code plus a one-constant bump
   that cannot touch `location`, with the machine quieter (load 2.17 → 2.08 against 4.77 → 7.51
   on the red run). **Same tree, 5 failures then 3** — they join and leave exactly as #4 and #5 do.

🟡 **So: composition-dependent flake in the shared test database, of a documented CLASS but under
two names the list does not carry.** ⚠️ **That is a finding for the PM, not a shrug** — the
"three to five by name" rule only works if the list is complete, and these two are a sixth and
seventh name in the same class. They belong on `environment.md`'s list beside #4 and #5, which is
PM-owned and not mine to edit.

🔵 And note the shape of the near-miss: a count inside the documented range, with two of the names
wrong. **That is the same failure the notes warn about from the other direction** — the count
matched, so nothing would have looked wrong.

### 28.2 App suite — green, and it reconciles

🟢 At app `a4e784fe` + this change:

```
$ npx jest --listTests | grep -c "__tests__"
663

$ npx jest
Test Suites: 663 passed, 663 total
Tests:       3 skipped, 11181 passed, 11184 total
Time:        106.247 s
EXIT=0
```

🟡 **11,174 at `a4e784fe` + 7 new cases = 11,181.** No new suite file, so the suite count holds at
663 and `--listTests | grep -c` equals it.

🟢 **Targeted suite:** `staffValuationChecks.test.ts` **38 passed** (31 at `a4e784fe`, +7).
🟢 **`npx tsc --noEmit`: clean.**
🟢 **Backend targeted:** `ScoutGenerationServiceTest` **20 passed / 5,903 assertions** (13 before,
+7). `SchemaIsInSyncTest` green, so the database matches the entity including the new default.

⚠️ **Load rose to 13.45 by the end of the app run, so the 106.247 s is not a clean timing** and is
not offered as one. A fully green run under rising load is the safe direction: contention
fabricates failures rather than hiding them.

### 28.3 ⚠️ One test's SETUP had to change, and that is a finding rather than a tidy-up

🔴 `ScoutGenerationServiceTest::testTheWageIsDerivedFromTheDerivedAbility` **failed on the first
run of the change, and it was right to.** It authored a single-point band of 5–5 and asserted the
wage was not what ability 5 would cost — a guard that a scout is priced on `ability` and not on
`experience` (A24's ruling). 🟡 With judgements now banded off the same row,
`0.7 × 5 + 0.3 × 5 = 5` exactly, so **`ability` and `experience` coincide on a single-point band**
and the assertion could no longer tell the two apart.

🟢 **Fixed by making the two quantities genuinely differ** — the dial set to ×2.00, so judgements
roll at 10 and ability is `round(0.7×5 + 0.3×10) = 7` — **not by weakening the assertion.** The
guard still bites.

🟢 **And the coincidence is now pinned in its own test**, so nobody later "fixes" the setup back:
`testAtTheDefaultDialASinglePointBandMakesAbilityEqualExperience`. Its comment says that if it
ever fails, judgements have stopped banding off the staff table and the wage guard must be re-read
before anything is changed. 🟡 **A conflation returning and two quantities agreeing because the
band they share has no width are different things**, and the pair of tests is what keeps them
distinguishable.

## 29. Commits, Part Two and Three

🟢 **Backend `f1f3145b`** on `development`, parent `8b1d9c2c` — *"Lower-tier scouts are now
genuinely worse at judging players, and the band is a dial"*. Eight paths, staged by explicit
path: `src/Service/ScoutGenerationService.php`, `src/Service/WorldInitializationService.php`
(the 14 → 15 bump), `src/Entity/PoolConfig.php`,
`src/Controller/Admin/PoolConfigController.php`, `templates/admin/pool_staff_config.html.twig`,
`tests/Service/ScoutGenerationServiceTest.php`, `migrations/Version20261121220000.php` (new),
`.context/shared/last-sync.md`.

🟢 **App `d777e468`** on `new-game-save`, parent `a4e784fe` — *"CHECKS can show what a tier's
scouts can and cannot read, so the band can be ruled on"*. Three paths:
`src/economy/economyDiagnostics.ts`, `src/__tests__/economy/staffValuationChecks.test.ts`,
`.context/shared/last-sync.md`.

🔵 **The generator change and the version bump are in ONE commit, by necessity** — §26.
🔵 **Nothing pushed. Nothing deployed. No worktree created. The probe script used for §17.4's
measurement was under `var/` (gitignored) and has been removed; a copy is in this session's
scratchpad.**

⚠️ **One path I did NOT commit:** `economy-loose-ends/a32-scout-ability-floor.md`, the brief, shows
as modified in `wunderkind-docs`. **That is not my edit** — the PM has been updating it while I
worked. Staged by explicit path throughout, so it is untouched and still theirs.

---

## 30. The whole task, in one table

| | before | after |
|---|---|---|
| EN t8 scout ability | ~18 (banded 2.10 + **flat 15.75**) | **2–4**, inside its coaches' own band |
| EN t8 scout wage | £9,740.57/wk | **£72.37/wk** |
| share of a £10,881.71 staff bill | **89.5%** | **6.0%** |
| vs the best coach beside it | **65.6×** | **0.49×** |
| EN t1 scout vs coach (money) | 1.19× | **1.00×** |
| EN t1 scout accuracy | 53% | 42% ⚠️ one field restores it |
| scout judgements | one flat global window, every tier | the tier's own staff band × an authored dial |
| the band | hardcoded in the generator | `pool_config.scout_judgement_band_bp`, admin-editable |
| observability | none | two CHECKS rows stating relationships that can fail |
| `WORLD_PACK_VERSION` | 14 | **15**, in the same commit |

🔴 **Still the owner's:** the dial's value (shipped ×1.00, deferred to observation by their own
ruling) and the 70/30 weights (untouched). **Nothing was taken.**

---

# PART FOUR — the panel's own prose, superseded in place

🔴 **My own text, falsified by my own fix within hours.** The blocks below were written in
`a4e784fe` while A32 was still an investigation and asserted the flat judgement floor as
**present fact**; `f1f3145b` made them false. Two of the four are rendered on device, and the
owner was about to read Scottish output through them.

⚠️ **The sharpest part is not that the prose went stale — it is that one block contradicted its
own data three lines below it.** The docblock said *"EN t8: 2.10 + 15.75 = 17.85 against a
coach's 3 (88.2%)"* while the row it sits above printed `t8 · coaches 2–3 · scouts 3–4`. 🔵 That
is this workstream's governing defect pointed at a diagnostic: **a comment is a claim, and a
claim next to its own refuting measurement is worse than a claim alone**, because the reader has
to decide which half to believe.

## 31. What changed, block by block

🟢 **Zero executable change. No threshold, no comparator, no status logic touched** — verified:

```
$ git diff -U0 src/economy/economyDiagnostics.ts | grep -E "^[-+]" | grep -vE "^[-+]{3}" \
    | grep -vE "^[-+]\s*(\*|//)" | grep -vE "^[-+]\s*\+ '" | grep -vE "^[-+]\s*$"
NONE — comments and rendered strings only
```

🔵 **Superseded in place, never rewritten or deleted.** The standing note is explicit that the
superseded text is how the next reader tells *"this changed"* from *"this was wrong"*, so each
block now opens with what is true after `f1f3145b` and keeps the original measurement beneath an
explicit **PRE-FIX / NOT CURRENT** heading naming the commit.

| block | what it asserted as current | now |
|---|---|---|
| `judgeStaffValuation` docblock (~:1439) | *"a scout takes most of the bill — £9,740.57/wk of a £10,881.71 staff bill, **89.5%, and 65.6×** … **Whether that is right is the owner's call** (unruled as of 2026-11-21 at `3ff5a312`)"* | ✅ ruled and fixed by `f1f3145b`; figures kept and labelled PRE-FIX; what remains the owner's is **the band's value**, not the split |
| same docblock (~:1452) | *"**Both paths amplify the same cause**, which **is** the flat `0.3 × mean(judgements)` term"* | *"which **was** … removed for club scouts by `f1f3145b`, and still live for the untiered shared pool"* |
| `scoutAbilityVsCoachBandCheck` docblock (~:1672) | header *"── **IT IS FAILING NOW**, AND THE MECHANISM IS MEASURED ──"*, then the 15.75 / 45.15 / 17.85 / 88.2% derivation in the present tense | header *"── ✅ **IT WAS FAILING, AND `f1f3145b` FIXED IT** ──"* + the measured after-state (t8 2–4 against coaches 2–4), then the same derivation under *"THE PRE-FIX STATE, KEPT DELIBERATELY … **Do not read any figure below as current**"* |
| 🔴 same docblock (~:1697) | *"It reports; it does not pick the lever … a t8 scout's displayed accuracy **is 53% today and 3% if banded**"* | **the opposite is now true** — the owner ruled for banding, so **3% is the live figure at t8 and 53% is the superseded one**; the quality cost is the ruling working, not a hypothesis |
| rendered row text (~:1818) | *"🔴 WHY IT FAILS AT THE BOTTOM AND NOT THE TOP … judgements are **NOT** [banded] … `0.3 × mean` **is** a FLAT ~15.75 points at every tier"* | *"✅ WHAT IS TRUE NOW (f1f3145b) …"*, the pool caveat, then *"Judgements **USED TO** roll … **DO NOT READ THOSE AS CURRENT**"* |
| rendered valuation text (~:2093) | *"the FLAT JUDGEMENT TERM … **is** ~15.75 points at EVERY tier, so a t8 scout **rates** 18 … On the owner's own fresh club: £9,740.57 of a £10,881.71 bill, 89.5%"* | *"✅ THE FLAT JUDGEMENT TERM **IS GONE** for a club scout …"* + the band-value hand-off, then the same figures under *"⚠️ PRE-FIX … **NOT CURRENT**"* |

🟢 **One claim in the last block survives and is kept**, because it is still true and was the
Part-One correction: that reading was priced by the **band** and not by the reservation split,
since a fresh save has no season budget. Re-tensed to *"That was priced by the BAND … That half
is still true of a fresh save."*

## 32. The owner's device reading, and what it corroborates

🔵 **Reported to me as measured on the owner's live England save, OTA 494 — their measurement,
not mine:** the scout is **£149/wk of a £2,119 bill, 7.0%, and 1.00× a 4★ coach.**

🟡 **It corroborates the model exactly, which is worth saying.** £149/wk is
`tierStaffWeeklyWagePence(4, EN t8)` = **£148.56** to the penny — so that scout rolled **ability
4**, the top of the t8 staff band, and is priced identically to an ability-4 coach. 🟢 My modelled
figures were £72.37 at ability 3 and £148.56 at ability 4 (§17.5), and 6.0% on a 12-coach shape;
their 7.0% differs only because their new club's coach mix is not the same twelve. ⚠️ **The two
measurements are of different clubs and should not be averaged** — what they agree on is the
mechanism: a t8 scout now lands inside 2–4 and is paid what a coach of the same rating is paid.

## 33. Scope held

🔴 **The judgement row's thresholds and comparator are untouched, as asked.** The concern raised
with me — that comparing a scout's error band to the *coach ability span* may be the wrong
comparator when the question is whether a scout can rank **players** — is noted and **not acted
on**. ⚠️ I think it is a fair objection and worth its own pass: the coach span is a proxy for
"the level of this division", and the honest denominator would be the spread of **player**
ability at that tier. That needs the player sample, which this function does not receive. **A
later conversation, not this change.**

## 34. Verification, Part Four

🟢 **Full app suite, at `d777e468` + this change:**

```
Test Suites: 663 passed, 663 total
Tests:       3 skipped, 11181 passed, 11184 total
Time:        86.193 s
EXIT=0
```

🟡 **11,181 — identical to `d777e468`**, which is what a strings-only change must produce. 🟢 The
four suites that read the panel directly were run first and separately:
`staffValuationChecks` + `economyDiagnostics` **55 passed**, then `checksReportCopy` +
`contextDocSync` **57 passed**. 🟢 `npx tsc --noEmit` clean.

🟢 **`.context` entry kept short and the cap checked rather than assumed:**

```
entry bytes: 1368
total 1580891 cap 1583911 headroom 3020   → within cap
```

🔵 `contextDocSync` 49/49, so the footprint and dated-correction ratchets both still pass.
⚠️ **Headroom is now ~3.0 KB.** The next entry of normal length will not fit, and the baseline
may only shrink. That remains the PM's Phase 2 call — stated again here because it is now one
pass away from blocking a session's ability to record its own work.

🟢 **Commit `13419ec5`** on `new-game-save`, parent `d777e468` — two paths, staged by explicit
path: `src/economy/economyDiagnostics.ts`, `.context/shared/last-sync.md`. **Nothing pushed.**
