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
