<!-- STATUS: ✅ PHASE 1 COMPLETE — committed on both branches (app 39b3c884, backend 54525433), NOT pushed, NOT deployed (2026-11-20) -->

# A26 phase 1 — report: scouts have a real `ability`, 1–100

**Brief:** `a26-scout-ability.md`. **Branches:** app `new-game-save`, backend `development`.
**Not pushed, not deployed, not merged.**

Phase 1 is **the field only**: derive, store, publish, ingest, and point the three sites that
already conflated `experience` with ability at the new field. **No wage is wired to it** — that is
A24, blocked behind part B — and **no salary moves in this change.**

---

## 1. The two questions the brief left open

### 1.1 The judgement key count: 5 or 7? **Both repos were right, about different populations.**

The brief framed this as a stale comment. It is not — **it is live in code, and there are two
builders writing two different key sets**:

| builder | keys | writes a persisted `Scout`? |
|---|---|---|
| `ScoutGenerationService::build()` (`:72-77`) | **5** — `potential`, `technical`, `physical`, `mental`, `personality` | **Yes — and it is the ONLY path that ever has** |
| `GenerateMarketDataCommand::buildScoutJudgements()` (`:596-611`, keys at `:164`) | **7** — the five above plus `youth`, `senior` | No |

`MarketPoolService::generateScouts()` delegates to `ScoutGenerationService`, and so does
`WorldPackClubGenerationService::generateScouts()` — so both the shared pool and every club scout
come through the five-key path. Measured on the live dev box:

```
SELECT count(*), (SELECT count(*) FROM jsonb_object_keys(judgements::jsonb))
  FROM scout GROUP BY 2;

  n      keys
  5278   5        ← every scout, no exceptions
```

**So `PoolConfig.php:241`'s "5 scout judgement categories" is correct for every scout that
exists**, and the app's seven-key `ScoutJudgements` type is correct only for
`GenerateMarketDataCommand`'s population, which is not in the `scout` table.

**Consequence for the formula, and it is the reason this mattered:** the mean is taken **over the
keys the row actually has**, never a fixed list. A hardcoded `/7` would have divided five stored
values by seven and **under-rated every real scout by ~29%** — silently, because the result is
still a plausible-looking number. Pinned on both sides
(`ScoutAbilityCalculatorTest::testMeansOverTheKeysPresentNotAFixedDivisor`,
`scoutAbility.test.ts`'s "means over the keys present").

### 1.2 The weighting: **0.7 experience / 0.3 judgements**, confirmed by the owner 2026-11-20

```
ability = clamp(1, 100, round(0.7 × experience + 0.3 × mean(judgements present)))
```

**The argument that decided it is BANDING, not scale.** `experience` is tier-banded —
`ScoutGenerationService.php:51-52` draws it from the club's own `league_ability_ranges` window
when one is passed. **`judgements` are not**: `:72-77` rolls all five from the flat global
`PoolConfig::$scoutJudgementMin/Max` (15–90 on dev), with no band in sight, at every tier.

So every point of weight given to judgements is a point taken away from tier separation. **That
is a documented bug, not a hypothetical**: the docblock at `ScoutGenerationService.php:35-40`
records a rating-33 scout standing in a tier-8 squad of rating-2-7 coaches and taking **£2,230/wk
of a £4,308 wage bill**, because `ClubWageScaleService` splits a club's wage reservation across
its staff *in proportion to ability*. Banding the experience is what fixed it — and **because A24
will price a scout's wage off `ability`, a judgement-heavy blend would route straight around that
band and re-open it.**

Measured, EN club scouts, tier 1 (exp 40–90) vs tier 8 (exp 2–7), judgement mean ~52.5 at both:

| weighting | tier 1 | tier 8 | spread |
|---|---|---|---|
| 0.3 exp / 0.7 judge | 56 | 38 | 18 |
| 0.5 / 0.5 | 59 | 29 | 30 |
| **0.7 / 0.3 (chosen)** | **61** | **19** | **42** |

Real pool scouts (all 5,278 are config-capped at experience 4–34, so these are deliberately green):

| name | exp | judgement mean | 0.7/0.3 | 0.5/0.5 | 0.3/0.7 |
|---|---|---|---|---|---|
| Aarón Díaz | 4 | 75.4 | 25 | 40 | 54 |
| Adrien Bernard | 4 | 42.8 | 16 | 23 | 31 |
| Adebayo Gwandu | 34 | 37.8 | 35 | 36 | 37 |
| Afonso Sousa | 34 | 55.8 | 41 | 45 | 49 |
| Alexandre Cunha | 34 | 57.6 | 41 | 46 | 51 |

**Measured result of the backfill across all 5,278 dev scouts: ability 11–48, mean 29.1, and
nobody at the floor.**

⚠️ **The accepted consequence, recorded as a separate open item rather than fixed here:** because
the shared pool's experience window is 4–34, **no pool scout reaches above ~48**. The top of the
1–100 scale belongs to tier-1 club scouts (up to ~90). That is a `scoutExperienceMin/Max` config
question, not a formula one, and the PM has carried it as its own item.

The weighting is recorded **in the code** as an owner decision with its reasoning and date, so
nobody tidies it later: `ScoutAbilityCalculator`'s class docblock and the docblock on
`WEIGHT_EXPERIENCE`/`WEIGHT_JUDGEMENTS`.

---

## 2. What was built

### Backend (`development`)

| file | what |
|---|---|
| `src/Service/ScoutAbilityCalculator.php` | **new** — the canonical formula. Deterministic, monotonic in both inputs, clamped 1–100, mean over keys present, and **exact integer arithmetic** (see §3) |
| `src/Entity/Scout.php` | `$ability` int unsigned, **default 1 not 0**, with the derivation and the read-only decision documented on it |
| `migrations/Version20261120100000.php` | **new** — adds the column **and derives every existing row inside `up()`** |
| `src/Command/BackfillScoutAbilitiesCommand.php` | **new** — `app:backfill-scout-abilities`, `--dry-run` / `--force`, for re-derivation after a formula or config change |
| `src/EventSubscriber/ScoutAbilityLifecycleSubscriber.php` | **new** — derives on `prePersist` so no creation path can forget it |
| `src/Service/ScoutGenerationService.php` | sets `ability` from the experience + judgements just rolled; documents that the five keys are authoritative and that judgements are **not** banded |
| `src/Command/GenerateMarketDataCommand.php` | same, on the seven-key path |
| `src/Service/MarketDataService.php` | publishes `ability` on `GET /api/market/data` |
| `src/Service/WorldPackSnapshotBuilder.php` | publishes `ability` in `buildScoutSnapshot()` |
| `src/Service/WorldInitializationService.php` | `WORLD_PACK_VERSION` **11 → 12**, with the census-vs-money argument written out |
| `src/Controller/Admin/ScoutCrudController.php` | `ability` on index **and** forms, **read-only** (`disabled`, so a hand-crafted POST cannot set it either) |
| `src/Repository/ScoutRepository.php` | corrected a comment that said "Scout carries only `experience`" |
| `tests/Service/ScoutAbilityCalculatorTest.php` | **new** — 11 tests, 443 assertions: the four committed properties, the 5-vs-7 mean, the `?? 0` ban, and the exact-.5 parity regression |
| `tests/Service/ScoutAbilityPublishedTest.php` | **new** — 5 tests: `ability` reaches BOTH the market payload and the world pack, carries the **stored** figure rather than a re-derivation, `experience` and `ability` are published as distinct numbers, `tier` is still derived from `experience`, and the pack still carries **no** wage |
| `tests/Service/ScoutGenerationServiceTest.php` | +3 — generation actually wires the calculator, never leaves a scout at the floor, and writes exactly the five authoritative judgement keys |
| `tests/Service/WorldPackClubGenerationServiceTest.php` | constructor arg |
| `tests/Service/WorldInitializationTierPackAgentTest.php` | the pinned scout-snapshot key list gains `ability` |

**Three decisions worth flagging:**

**(a) The backfill is IN the migration, not behind it — a deliberate departure from
`scout.weekly_salary`'s pattern.** That column landed `DEFAULT 0` with a backfill command behind
it, and its own migration called the default "the only safe default for a migration but also a
lie". For `ability` a zero is worse than a lie: it is **not a legal value** (the clamp floor is 1)
and **A24 will price a wage off this column**, so any window where every scout read 0 would price
the whole world at the bottom of the band. One `UPDATE`, every row, inside `up()`.
`app:backfill-scout-abilities` is therefore a **no-op on a migrated box, and that is the expected
result.**

**(b) `up()` rather than `postUp()`, departing from `api-backwards-compatibility.md`'s checklist
point 5.** Postgres has transactional DDL, so `ADD COLUMN ... DEFAULT 1` → `UPDATE` → `DROP
DEFAULT` commits as one unit and is *more* atomic than a `postUp()` pass, which would leave a
window at the floor. `postUp()` is right when the DDL must commit before the DML can see it; it
does not here.

**(c) The lifecycle subscriber is the net under the generation sites, not a replacement for
them.** Both generation paths set `ability` explicitly — reading those files should show where the
figure comes from. The subscriber catches the **admin create form** (which cannot set `ability` by
design) and any future path nobody has written. It is unconditional, which is safe *because the
formula is deterministic*: re-deriving a scout `ScoutGenerationService` just derived gives the
identical figure. (Contrast `PersonalityLifecycleSubscriber`, which must check `isDefault()`
because its generator rolls.) **prePersist only — an admin edit does not re-derive**, exactly as
it does not for `weeklySalary`; `--force` is the documented path and the admin help text says so.

### App (`new-game-save`)

| file | what |
|---|---|
| `src/utils/scoutAbility.ts` | **new** — `fallbackScoutAbility`, `resolveScoutAbility`, `ensureScoutAbility` |
| `src/types/market.ts` | `ability: number` on `Scout` and `MarketScout`; `ScoutJudgements` becomes `Partial`; **corrected** the `experience` comments |
| `src/types/world.ts` | `ability?: number` on `WorldScout`; `judgements` **unified onto `ScoutJudgements`** instead of restating a stricter key set |
| `src/types/tournament.ts` | **corrected** `TournamentSnapshotStaff.ability`'s comment |
| `src/api/endpoints/market.ts` | `RawScout.ability`, resolved at the boundary |
| `src/hooks/useInitFlow.ts` | `worldScoutEntryToScout` resolves it; `scoutToWorldScout` carries it; `worldStaffToScout` uses the staff member's own `coachingAbility` |
| `src/screens/office/HireScreen.tsx` | same `coachingAbility` case |
| `src/stores/marketStore.ts` | reads the already-resolved figure straight through |
| `src/db/bootstrap.ts`, `src/db/cacheRepair.ts` | **both SQLite rehydrations** normalise through `ensureScoutAbility` |
| `src/engine/SeasonBudgetService.ts` | **the behaviour change** — `scout.experience` → `scout.ability` |
| `src/engine/scoutNoise.ts`, `src/engine/NpcScoutingService.ts` | partial-judgement handling, behaviour preserved exactly (see §4) |
| `src/__tests__/utils/scoutAbility.test.ts` | **new** — 13 tests, pinned against the backend's own figures |
| `src/__tests__/db/bootstrap.test.ts` | the scout-hydration case now asserts the derivation; **+1 case** for "already has an ability" |

**No SQLite migration was needed, and it is worth knowing why.** A scout is persisted as a JSON
blob in `staff.data`, so a new field needs no schema change — **but** a blob written before today
has no `ability` key, and `parseStaffRow` casts the parsed JSON straight to `Scout` without
checking, so the typed `number` would be `undefined` at runtime. A world-pack refetch cannot
reach those rows: they live in the save, not the pack. Hence `ensureScoutAbility` at both
hydration points; the next write-through persists the resolved figure, so **a save self-heals on
first load**.

**`src/utils/scoutAbility.ts` is a formula MIRROR, and I want it on the record as the one piece of
this change that is a second copy of something.** It is the same status as the existing
`fallbackScoutWeeklyWagePence` (which mirrors `ScoutWageCalculator` for the same class of row),
its docblock says so in full, and its test pins it against the backend's figures — but if the
weighting ever changes, **both sides must change in one commit**. The alternatives were `?? 0` (a
defect by the pack-is-a-census rule, and it would price legacy scouts at the bottom of A24's band)
or a hardcoded midpoint (which would price a weak and a strong scout identically).

### The `WORLD_PACK_VERSION` bump, 11 → 12

Stated in the commit message and in the constant's docblock, because the brief is right that the
next reader will otherwise think the census rule was broken. **It was not.** v11's rule is that
*money* will never cause another bump. `ability` is **census, not money** — what a scout *is*, the
same class of content as the player and staff abilities the pack has always carried — and v9
(scout experience banded) and v10 (ability/facility content) were both bumps of exactly this kind.

`buildScoutSnapshot`'s deliberate omission of `weeklySalary` is **not** a precedent against it,
and the reasoning does not transfer: a salary is money and resolves on the device from live
config; **an ability cannot be resolved from config, because it is per-row data, not a dial.** The
one real alternative — deriving on device from the `experience` and `judgements` already in the
pack — is the one the brief rules out, and correctly: it would be a second source for one quantity
with nothing saying which is authoritative.

`scouts[].tier` **stays derived from `experience`** deliberately. Re-pointing it at `ability`
would be a changed value under an unchanged key, i.e. a break by
`api-backwards-compatibility.md`'s own definition.

---

## 3. 🔴 The one thing that went wrong, and it is the governing defect in miniature

**PHP and the migration's SQL disagreed about the same scout.**

`0.7` and `0.3` are not representable in binary floating point, so PHP's
`0.7 * $e + 0.3 * $m` accumulates error, while the migration's Postgres `NUMERIC` arithmetic is
exact decimal. On inputs whose true result is **exactly k.5**, the error decides the rounding —
and `app:backfill-scout-abilities --force --dry-run` reported **6 of 5,278 scouts would change**
immediately after the migration had just written them.

```
exp   jmean   exact    SQL gave
33    38.0    34.5     35          ← PHP's float blend gave 34
25    50.0    32.5     33
20    75.0    36.5     37
```

Six rows out of 5,278 is small. **The defect is not:** one quantity, two implementations,
silently divergent, with nothing saying which is right — precisely what this workstream exists to
remove. So it was removed rather than tolerated. The calculator now multiplies through by the
weights' denominator and divides **once**:

```
ability = round( (7·e·n + 3·Σj) / 10n )
```

A single IEEE division of exact integers is correctly rounded, so a true quotient of *k*.5 arrives
as exactly *k*.5 (every *k*.5 below 2⁵² is representable) and `round()`'s half-away-from-zero then
matches Postgres exactly. The error only ever came from the intermediate products, which this path
never forms.

**Verified end to end:** `app:backfill-scout-abilities --force --dry-run` now reports **0 of 5,278**.
Pinned by `ScoutAbilityCalculatorTest::testRoundsExactHalvesTheSameWayTheMigrationSqlDoes()` and
mirrored in `scoutAbility.test.ts`, both using the real divergent rows. The app's mirror uses the
plain float expression and is pinned against the same cases — it agrees on all of them, because
`Math.round` is also half-up and the JS error happens to fall the same way on these inputs; **the
test is there so a future input where it does not fail loudly.**

### 3.1 Two further bugs in my own change, caught only by the full suite

Both were invisible to every smaller run, which is the argument for the full gate.

**(a) `SchemaIsInSyncTest::testOrmMappingMatchesTheMigratedDatabase` failed**, with
`ALTER TABLE scout ALTER ability SET DEFAULT 1` outstanding. My migration ended with
`DROP DEFAULT`, copied from `Version20261119190000`'s shape — **but that precedent applies to a
column whose ENTITY DECLARES NO DEFAULT**, where the DB default is itself the drift.
`Scout::$ability` declares `options: ['default' => 1]`, so dropping it is the drift in the other
direction. `scout.experience` and `scout.weekly_salary` both keep a DB default of 0 beside their
entity's `default => 0`; this column now follows them. **The rule is "the DB must match the
entity", not "always drop the default"** — now written into the migration docblock so the next
person copying that precedent sees when it does and does not apply. The migration was
uncommitted, so I corrected it rather than adding a second one, and applied the default to the dev
and test databases by hand since it had already run.

**(b) 16 errors across `ScoutGenerationServiceTest` and `WorldPackClubGenerationServiceTest`** —
both instantiate `ScoutGenerationService` by hand, and I had added a fifth constructor argument.
Three call sites updated.

### 3.2 A gap in my own testing, closed

I had tested the calculator thoroughly but **never that generation actually wires it** — a scout
could have been left at the column's floor of 1 and every test would still have passed. Three
cases added to `ScoutGenerationServiceTest`:

- `testAbilityIsDerivedFromTheRolledExperienceAndJudgements` — the stored figure is exactly what
  the calculator derives for that scout's own inputs;
- `testAGeneratedScoutIsNeverLeftAtTheAbilityFloor` — 25 iterations, none at 1, which is the
  A26 invariant that matters (an unbackfilled floor is indistinguishable from a derived 1);
- `testJudgementsAreTheFiveAuthoritativeKeys` — pins §1.1 so the 5-vs-7 finding cannot quietly
  regress.

---

## 4. 🔴 A live defect found and deliberately NOT fixed: the scout age gate has always been 0

Making `ScoutJudgements` honestly `Partial` made the compiler point at five sites, and one of them
is a real bug that has been live since it was written.

**`ageGateFor()` (`src/engine/scoutNoise.ts`) returns 0 for every scout in the game.** It reads
`judgements.youth` for an under-18 and `judgements.senior` otherwise, then guards with
`Number.isFinite(gate) ? gate : 0`. **Neither key exists on any real scout** — that is §1.1's
finding. So the `: 0` branch is the only one that has ever run.

**What that means in play:** `scoutAccuracyPercent` blends `judgements.potential` with the age gate
at `AGE_GATE_WEIGHT`, so that weight is being applied to a constant zero — every scout's report
accuracy is driven by `potential` alone, scaled down. The age distinction the design intends, a
youth specialist reading a 16-year-old better than a senior scout would, **does not happen at
all.** `NpcScoutingService` passes the same zero into `applyScoutNoise` for every NPC read.

**Why I left it:** fixing it changes scouting accuracy for every player in every save. That is a
simulation behaviour change, and phase 1's explicit constraint is that it must not move any
existing number. It also needs a ruling I cannot make — what should the gate fall back to when the
key is absent? The five keys present offer no obvious substitute for "youth" vs "senior", so the
real options are *the backend starts writing all seven* or *the gate is redesigned around the five*.

**What I did instead:** annotated `ageGateFor` with the full finding and why it is preserved,
recorded it in `game-mechanics.md` §7 (where `ageGate` was named as a parameter with no hint that
it was dead), and flagged it here. **This is the most consequential thing in this report that is
not part of the deliverable.**

The other four compiler hits were handled with behaviour preserved exactly: `NpcScoutingService`'s
two reads (`technical`/`physical`/`mental` and `personality` are all keys that DO arrive, so the
`?? 0` never fires in practice), and two test fixtures.

---

## 5. The three conflation sites

| site | before | after |
|---|---|---|
| `SeasonBudgetService.ts:503` | `ampStaffWagePence(scout.experience ?? 0, economy)` | `ampStaffWagePence(scout.ability ?? 0, economy)` |
| `types/tournament.ts:415` | *"Unifies `Coach.coachingAbility` and `Scout.experience`"* | corrected to `Scout.ability`, with what the old claim broke |
| `types/market.ts:76` | *"Raw 0–100 ability from backend."* on `experience` | corrected on both `Scout` and `MarketScout` |

### ⚠️ The brief contradicts itself here, and this is how I resolved it

Brief step 9 says the `SeasonBudgetService` change **is a behaviour change** and "scouts will be
snapped to a different figure". Brief §Verification says "the wage they are charged is **unchanged**
from before this phase (phase 1 must not move salaries)". Both cannot be true if the snap runs.

**They are both satisfiable, because the snap does not run today.** `anchorAmpStaffWages`
early-returns on `if (!economy.incomeAnchoredWages) return;`, and `incomeAnchoredWages` derives
from `baseline?.wageModel === 'turnover'` (`economyConfig.ts:187`). Measured on the live dev box:

```
SELECT economy_wage_model FROM game_config LIMIT 1;   →   legacy
```

So the corrected figure is **latent**: it takes effect when income anchoring is switched on — the
same release A24 prices staff and scouts off the band — and until then **not one salary moves**.
Flipping that flag is now one change with two visible effects, which is deliberate and is written
at the site, because the old pairing was simply wrong rather than untuned.

**I did not wire the wage multiplier bands.** That is A24.

---

## 6. Verification

### Backend — `vendor/bin/phpunit --filter '/^(?!.*AdminShellCoverage).*$/'`

```
Tests: 3257, Assertions: 156378, Failures: 3, PHPUnit Deprecations: 1, PHPUnit Notices: 21, Skipped: 13.
```

**Zero errors, and the only three failures are the pre-existing ones.** 3,241 passing.

```
```

**Three failures are proven pre-existing**, and not by reading the assertions: A23's report
(`a23-retire-slots-report.md` §4) established the same three by stashing its whole change and
re-running on a clean tree earlier today —
`NotificationLogCrudControllerTest::testIndexRowIsClickableToADetailPageShowingTheFullPayload`,
`CompetitionControllerTest::testShowIncludesResultsOnceRoundsAreProcessed`,
`FriendlyResolveSingleMatchTest::testResolvingAnAcceptedChallengeRecordsAFullResult`. The last
asserts a friendly's `narrativePayload` is non-empty; nothing in this change touches friendlies or
narrative content.

**The count reconciles exactly**, which this repo's notes say to verify rather than assume:

| | tests |
|---|---|
| A23's measured tree | 3,238 |
| `ScoutAbilityCalculatorTest` (new) | +11 |
| `ScoutGenerationServiceTest` (3 added) | +3 |
| `ScoutAbilityPublishedTest` (new) | +5 |
| **measured** | **3,257** ✓ |

The brief's stated 3,233 baseline predates A23's +5.

🔴 **`wunderkind_test` is not migration-tracked, and that is the third instance `environment.md`
now records.** The first full run reported **20 errors and 5 failures**. The full attribution,
measured rather than assumed:

| cause | cost | mine? |
|---|---|---|
| `ScoutGenerationService` gained a constructor argument; two test classes instantiate it by hand | **16 errors** | yes (§3.1b) |
| `scout.ability` missing from `wunderkind_test` | **4 errors** | yes, the second half of adding a column |
| `SchemaIsInSyncTest` — the migration's `DROP DEFAULT` | 1 failure | yes (§3.1a) |
| `WorldInitializationTierPackAgentTest` — the pinned snapshot key list | 1 failure | yes, expected: I added a key |
| `NotificationLog`, `Competition`, `Friendly` | 3 failures | **no — pre-existing, proven by A23** |

⚠️ **I first wrote this up as "19 of the 20 errors were the missing column", and that was wrong.**
I pattern-matched `environment.md`'s 2026-11-02 precedent (35 of 36 errors from one missing column)
instead of comparing my own two runs: adding the column took the run from 20 errors to 16, so it
was **4**. Corrected here and in `environment.md`, which now carries the caveat explicitly,
because a postmortem whose numbers come from the shape of the last incident rather than from the
runs is worse than none. **The practical lesson is the one that survives: this failure mode does
not always look like a wall of identical red**, so check `information_schema.columns` for your new
column regardless of how the failures look.

Applied by hand, nullable → backfill → `NOT NULL` → `SET DEFAULT`:

```bash
lando php bin/console dbal:run-sql "ALTER TABLE scout ADD COLUMN IF NOT EXISTS ability INT" --env=test
# backfill with the same arithmetic as the migration (see environment.md for the full UPDATE), then:
lando php bin/console dbal:run-sql "UPDATE scout SET ability = 1 WHERE ability IS NULL" --env=test
lando php bin/console dbal:run-sql "ALTER TABLE scout ALTER COLUMN ability SET NOT NULL" --env=test
lando php bin/console dbal:run-sql "ALTER TABLE scout ALTER ability SET DEFAULT 1" --env=test
```

⚠️ **That last line is required too**, and is the fix for §3.1(a): the entity declares
`default => 1`, so a test DB without it fails `SchemaIsInSyncTest`.

**Anyone else running this suite needs those three commands**, or they will see the same wall of
red and read it as my change breaking everything.

### App

```
$ npx tsc --noEmit
(zero errors)

$ npx jest --listTests | wc -l
648

Test Suites: 648 passed, 648 total
Tests:       3 skipped, 10816 passed, 10819 total
```

`CLAUDE.md`'s `new-game-save` row updated from 647 / 10,788 to the measured figure.

### The economy gate — **byte-identical, and proven rather than argued**

The brief says COVERAGE must not move. In the working tree it **does** move: tier 8 comes into
range and the output hash changes. **That is A23's uncommitted work, not this change**, and
because the PM asked me to measure rather than assume, I did it in a throwaway `git worktree` at
HEAD so neither repo was disturbed:

```
gate at HEAD                         c5941b3008fe9cfa6b881ef22235f48e   COVERAGE outside: 1-8
gate at HEAD + this change applied   c5941b3008fe9cfa6b881ef22235f48e   COVERAGE outside: 1-8   ← identical
gate in the full working tree        aff1aacd58783c49e174f5b1abef5055   COVERAGE outside: 1-7
```

**HEAD and HEAD-plus-this-change are byte-identical.** That is the gate check the brief asked for,
and it passes. The third line is A23's effect and is theirs to report. Consistent with the
mechanism: `variantGate.ts` imports `src/economy/harness/worldExport` and `.../flows` — both files
A23 modified — and **none** of the files this change touches.

Invocation:
`npx tsx scripts/economy/variantGate.ts --export game-config-en.LIVE.json --starter-config starter-config.LIVE.json --world world.json --country EN`

### Dev-box data checks

```
after the migration, all 5,278 scouts:
  min ability 11, max 48, mean 29.1, at-floor(≤1) 0        ← nobody at 0, nobody at the floor

app:backfill-scout-abilities --force --dry-run
  0 of 5278 scout(s) would have ability re-derived          ← PHP agrees with the SQL
```

**The backfill command was exercised for real, not just asserted.** I set one scout
(`01a0e9cd-…`, experience 25, ability 34) down to the floor of 1 and ran the command's default
(non-`--force`) path:

```
app:backfill-scout-abilities --dry-run    1 of 1 scout(s) would have ability re-derived
  → the row still read 1 afterwards                        ← --dry-run really writes nothing
app:backfill-scout-abilities              1 of 1 scout(s) had ability re-derived
  → the row read 34 again                                  ← exactly its original figure
```

That is the command's whole purpose (find rows at the floor, derive them, leave everything else
alone) verified end to end, and it confirms the floor-sentinel filter selects correctly. The dev
box is back to 5,278 scouts at 11–48, none at the floor, and `--force --dry-run` reports 0 again.

### ⚠️ What I did NOT verify

- **A real save on dev.** The brief asks for a save where scouts carry a plausible ability and the
  wage charged is unchanged. I did not run the app against dev — I have no device session, and
  nothing here is deployed. The wage claim is instead established **statically and I think more
  strongly**: the only site that would reprice a scout early-returns on a flag the live config
  has off (§5), so no code path exists today that can move a scout's salary.
- **The world-pack rebuild at v12.** The bump is correct and the key is published, but I did not
  force a regeneration and inspect a cached v12 payload. First client request per country/tier
  will rebuild (~2–4s), as the constant's docblock describes.
- **The admin screens in a browser.** The `ability` field is wired read-only and
  `lint:container` passes, but I did not load `/admin` and look at it.
- **`GenerateMarketDataCommand` end to end.** Its `ability` line is covered by the shared
  calculator's tests, but I did not run the command against a live pool.
- ~~**The lifecycle subscriber firing on an admin create.**~~ **CLOSED 2026-11-20 — see §10.**
  Originally shipped verified by wiring rather than behaviour, which was a defensible call and
  the wrong one; the review that reopened it also changed the design.

---

## 7. Things in the brief that turned out to be wrong or incomplete

1. **The 5-vs-7 question is not a stale comment — it is two live builders** (§1.1). The brief
   points at `GenerateMarketDataCommand.php:582-610` as "the best evidence", and it is evidence for
   the *seven*-key set; the decisive evidence is that it is **not the builder that writes the
   table**, plus the dev-box key count.
2. **The brief's own step 9 and its Verification section contradict each other** (§5). Resolved by
   measuring the live `wageModel`.
3. **A fourth publish site exists** that the brief's list misses: `MarketController.php:216`
   (`GET /api/market/legacy`). ⚠️ **I deliberately did not add `ability` there.** It is an
   explicitly frozen backward-compat endpoint whose scout shape already omits `weeklySalary`
   (added to the main path a fortnight ago), so the precedent is clear that it stays as it is.
   Flagging rather than silently skipping, since the brief says "published on every
   scout-carrying payload".
4. **A fifth site the brief does not mention:** `ScoutRepository::getPoolBreakdown()`'s docblock
   asserted "Scout carries only `experience` — there is no rating or reputation field", which this
   change falsifies. Corrected. The query itself is a DQL field list and needed no change.
5. **`buildScoutSnapshot`'s `weeklySalary` reasoning is now partly superseded** — it argues that
   "adding a key is a payload shape change … which invalidates every country's pack", and this
   change does exactly that for `ability`. The *conclusion* for `weeklySalary` still holds (money
   leaves the pack by the census rule), but the *argument* now has a counterexample, so I noted
   the distinction at the site rather than leaving a reader to find the apparent contradiction.
6. **The brief's "check `src/db/repositories/` for a scout migration"** — there is none to write;
   scouts are a JSON blob (§2). But the blob has its own legacy problem the brief does not
   anticipate, which is what `ensureScoutAbility` exists for.
7. **`ScoutWageCalculator` interpolates wage on `experience / 100`**, so a pool scout (max 34)
   only ever reaches 34% of the £25–70/wk band. Found in passing, **not touched** — the PM has
   carried it to A24.

---

## 8. Commits

Both on their own branch. **Nothing pushed, nothing deployed, nothing merged.**

⚠️ **Both working trees held A23's unreviewed, uncommitted work, interleaved with mine.** Every
path was staged explicitly — no `git add -A`, no `git commit -a` — and for the five backend and
three app `.context`/doc files that A23 had *also* modified, I staged **only my own hunks**
(`git apply --cached` per hunk, and for the two `last-sync.md` files, where my entry landed
adjacent to A23's and shared a hunk, by writing the intended blob to the index with
`git hash-object` + `git update-index`). **The index was the only thing touched; A23's working-tree
changes are untouched and still uncommitted.**

Two notes for the PM's reconciliation:

- **`src/db/bootstrap.ts`, `src/db/cacheRepair.ts` and `src/Service/WorldInitializationService.php`
  contained only MY changes**, not A23's — their A23 edits must already be committed. The
  attribution list was a guess on those three, and acting on it would have dropped my work.
- **`tests/Command/EconomyDerivedSizeDriftTest.php` (A23's) was already staged** when I started.
  Since a `.context` commit has to come from the index, I unstaged it, committed, then
  **re-staged it** — its staged blob was byte-identical to the worktree, so A23's state is exactly
  as I found it. `src/Service/Economy/WageModelResolver.php` is **not** mine; left alone.

### Backend `development` — `54525433`

22 files, +1,276 / −10.

```
.context/shared/last-sync.md                       |  32 ++++
.context/stages/01_overview/output/environment.md  |  58 ++++++
.context/stages/03_data/output/entities.md         |  35 +++-
.context/stages/03_data/output/migrations.md       |  56 ++++++
.context/stages/04_interfaces/output/services.md   |  48 +++++
migrations/Version20261120100000.php               | 111 +++++++++++
src/Command/BackfillScoutAbilitiesCommand.php      | 133 +++++++++++++
src/Command/GenerateMarketDataCommand.php          |  10 +-
src/Controller/Admin/ScoutCrudController.php       |  37 +++-
src/Entity/Scout.php                               |  33 ++++
.../ScoutAbilityLifecycleSubscriber.php            |  64 +++++++
src/Repository/ScoutRepository.php                 |   8 +-
src/Service/MarketDataService.php                  |   8 +
src/Service/ScoutAbilityCalculator.php             | 210 +++++++++++++++++++++
src/Service/ScoutGenerationService.php             |  22 ++-
src/Service/WorldInitializationService.php         |  26 ++-
src/Service/WorldPackSnapshotBuilder.php           |  12 ++
tests/Service/ScoutAbilityCalculatorTest.php       | 205 ++++++++++++++++++++
tests/Service/ScoutAbilityPublishedTest.php        | 116 ++++++++++++
tests/Service/ScoutGenerationServiceTest.php       |  54 ++++++
.../WorldInitializationTierPackAgentTest.php       |   6 +-
.../Service/WorldPackClubGenerationServiceTest.php |   2 +
```

### App `new-game-save` — `39b3c884`

21 files, +626 / −29. A23's backend-half commit `4ea3c5be` landed cleanly on top of it afterwards.

```
.context/shared/last-sync.md                       |  49 ++++++++
.context/stages/01_overview/output/environment.md  |   2 +-
.context/stages/03_data/output/entities.md         |  49 ++++++++
.../stages/07_synthesis/output/game-mechanics.md   |  24 ++++
src/__tests__/db/bootstrap.test.ts                 |  33 ++++-
src/__tests__/engine/StaffConsensus.test.ts        |   4 +
src/__tests__/engine/npcScouting.test.ts           |   4 +
src/__tests__/utils/scoutAbility.test.ts           | 140 +++++++++++++++++++++
src/api/endpoints/market.ts                        |  14 +++
src/db/bootstrap.ts                                |   7 +-
src/db/cacheRepair.ts                              |   6 +-
src/engine/NpcScoutingService.ts                   |  13 +-
src/engine/SeasonBudgetService.ts                  |  20 ++-
src/engine/scoutNoise.ts                           |  18 ++-
src/hooks/useInitFlow.ts                           |  12 ++
src/screens/office/HireScreen.tsx                  |   4 +
src/stores/marketStore.ts                          |   3 +
src/types/market.ts                                |  69 ++++++++--
src/types/tournament.ts                            |  13 +-
src/types/world.ts                                 |  41 ++++--
src/utils/scoutAbility.ts                          | 130 +++++++++++++++++++
```

(`CLAUDE.md` is gitignored, so its updated row is not in the commit.)

---

## 9. What phase 2 (A24) inherits

- `ability` is on every scout, published on `GET /api/market/data` and in the world pack at v12,
  and ingested everywhere — **including a resolution path for legacy saves**.
- `SeasonBudgetService` already reads `scout.ability`. **Switching `wageModel` to `turnover` is
  what makes it bite**, and it will move scout salaries when it does (§5). That should be
  expected, not treated as a regression.
- The one open item from this phase: **the pool's experience window (4–34) caps a pool scout at
  ~48 ability**, so pool scouts will price in the bottom half of any band driven by this figure.
  A `PoolConfig` decision, already with the PM.
- The one open defect: **`ageGateFor` has always returned 0** (§4). Not A24's business, but it is
  in scouting and somebody should own it.


---

## 10. Addendum (2026-11-20, same day): the subscriber gap closed, and the design corrected

§6 listed one gap I'd judged not worth a 25-minute suite re-run: **no test persisted a `Scout`
through Doctrine to prove `ScoutAbilityLifecycleSubscriber` actually fires.** Registration was
verified, behaviour was not.

**The PM reopened it on A24's account, and that reframing is what makes it right.** The argument
is not about this task: A24 prices staff and scout WAGES off `ability`, so a scout written outside
the generation path with a stale or defaulted figure becomes a wrong wage, discovered far from its
cause and long after. *"Registration is verified, behaviour isn't"* is an acceptable gap right up
until a money path reads the field. It is also, as they pointed out, the exact shape this
workstream keeps finding: **two routes to one quantity where only one is actually exercised** — I
had proved the calculator and proved the registration, and nothing proved the wire.

### 🔴 Writing the test changed the design, not just the coverage

The requested UPDATE case **could not pass as specified.** The subscriber was `prePersist` only,
and §2(c) of this report *documented* that an admin edit deliberately did not re-derive, with
`app:backfill-scout-abilities --force` as the path.

Checking `ScoutCrudController` settled it against my original reasoning: **`experience` (`:174`)
and `judgementsJson` (`:199`) are both EDITABLE while `ability` is read-only.** So an admin could
move an input and leave the derived figure stale, with nothing in the schema or the UI saying the
two now disagree — and under A24 that is a wrong wage. Leaving it to a remembered command is not a
mechanism.

**So the subscriber gained a `preUpdate` hook.** `ability` is now a true function of its inputs at
all times. A side effect worth having: the read-only intent is **enforced** rather than merely
presented — an `ability` written by any route is corrected on flush, not ignored.

⚠️ **`weeklySalary` is deliberately NOT treated the same way, and the asymmetry is principled.**
Its own admin help text says it is *"set by hand here only to override one scout"* — an
intentional override, which auto-recomputation would destroy. `ability` is intentionally not
overridable, so it must be recomputed. **The test is whether a field is an OVERRIDE or a
DERIVATION**, not whether it happens to be derived at generation. Recorded at the subscriber and
in `services.md`, because the inconsistency looks like an oversight otherwise.

Implementation note: a changed field in `preUpdate` does not stick on its own (the unit of work
has already computed its changeset), so the hook calls `recomputeSingleEntityChangeSet()`. It
early-returns when the derived figure already matches — the common case — which skips the
recompute entirely; a recompute does not re-fire `preUpdate`, so neither path loops.

### The tests, and proof they are not vacuous

`tests/EventSubscriber/ScoutAbilityLifecycleSubscriberTest.php` — 7 cases through a real flush:
the admin create path; the derived value **as it lands in the database** rather than on the object;
`experience` changing on update; `judgements` changing on update; a hand-written `ability` being
corrected; an unrelated update leaving `ability` alone; and the no-judgements fallback to
experience rather than to zero.

**Verified non-vacuous:** with the two `AsDoctrineListener` attributes disabled, **all 7 fail**.
That was the entire point of the exercise, so it was checked rather than assumed.

### Four statements this made false, all corrected

The admin field's help text, the admin `indexFields()` docblock,
`BackfillScoutAbilitiesCommand`'s docblock (it claimed `--force` was needed after an edit), and
the `services.md` / `entities.md` entries. **`--force` is now only for a FORMULA change or rows
written by raw SQL**, not for an admin edit.

### Verification

Test DB checked first, per the procedure this report put into `environment.md` — `bond_decay_floor`
default 20 and `scout.ability` default 1 both present, `SchemaIsInSyncTest` and
`LeaderboardHallOfFameTest` green — so nothing here is attributed to a half-migrated schema.
Baseline had moved to `d8376d94`.

```
Tests: 3264, Assertions: 156399, Failures: 3, PHPUnit Deprecations: 1, PHPUnit Notices: 21, Skipped: 13.
```

**Zero errors; the three failures are the same pre-existing trio.** Count reconciles exactly:
3,257 + 7 new = **3,264**.

```
```

Commit: `c05d54a7` on `development`. Not pushed.

### Postscript: what was actually holding this session open

The PM's archive attempts were being refused with "still has live work" twice after I reported
idle. **The cause was mine:** seven `until grep …; do sleep N; done` background loops, started to
wait on the long suite runs, whose grep patterns **could never match** — so they span-looped for
over an hour.

PHPUnit colourises each *field* of its summary line separately, so the raw bytes are
`\e[37;41mTests: 3257\e[0m\e[37;41m, Assertions: …`. `^Tests: ` fails because the line starts
with an escape, **and the unanchored `Tests: [0-9]+, Assertions` fails too**, because
`\e[0m\e[37;41m` sits between `3257` and the comma. I had assumed the unanchored one was safe; it
was not. The reading greps elsewhere in this report worked only because their `.*` happens to span
the escapes.

**Pass `--colors=never` when machine-reading PHPUnit output, or strip ANSI before matching.** And
note the honest gap in the loop: the work really was finished when I reported idle, and a stuck
background task is invisible from inside the session — `ps aux | grep "[s]leep"` is the check.
