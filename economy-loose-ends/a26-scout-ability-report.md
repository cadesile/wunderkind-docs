<!-- STATUS: ✅ PHASE 1 BUILT, COMMITTED ON BOTH BRANCHES, NOT PUSHED (2026-11-20) -->

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
| `tests/Service/ScoutAbilityCalculatorTest.php` | **new** — 11 tests, 443 assertions |
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
<<BACKEND_RESULT>>
```

**Three failures are proven pre-existing**, and not by reading the assertions: A23's report
(`a23-retire-slots-report.md` §4) established the same three by stashing its whole change and
re-running on a clean tree earlier today —
`NotificationLogCrudControllerTest::testIndexRowIsClickableToADetailPageShowingTheFullPayload`,
`CompetitionControllerTest::testShowIncludesResultsOnceRoundsAreProcessed`,
`FriendlyResolveSingleMatchTest::testResolvingAnAcceptedChallengeRecordsAFullResult`. The last
asserts a friendly's `narrativePayload` is non-empty; nothing in this change touches friendlies or
narrative content.

**The count reconciles exactly.** A23's measured tree was **3,238**; this change adds
`ScoutAbilityCalculatorTest`'s **11** tests → **3,249**, which is what the run collects. The
brief's stated 3,233 baseline predates A23's +5.

🔴 **`wunderkind_test` is not migration-tracked, and it cost 19 errors before I spotted it.** The
first full run reported **20 errors and 5 failures**; nineteen of the errors were one missing
column (`column "ability" does not exist`) cascading through everything that loads a `Scout`. This
is the third time `environment.md` has had to record this exact failure mode, so I have added this
instance to it, with the commands. Applied by hand, nullable → backfill → `NOT NULL`:

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

<<APP_RESULT>>
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

### ⚠️ What I did NOT verify

- **A real save on dev.** The brief asks for a save where scouts carry a plausible ability and the
  wage charged is unchanged. I did not run the app against dev — I have no device session, and
  nothing here is deployed. The wage claim is instead established **statically and I think more
  strongly**: the only site that would reprice a scout early-returns on a flag the live config
  has off (§5), so no code path exists today that can move a scout's salary.
- **The world-pack rebuild at v12.** The bump is correct and the key is published, but I did not
  force a regeneration and inspect a cached v12 payload. First client request per country/tier
  will rebuild (~2–4s), as the constant's docblock describes.
- **The admin screens in a browser.** The `ability` field is wired read-only and the suite is
  green, but I did not load `/admin` and look at it.
- **`GenerateMarketDataCommand` end to end.** Its `ability` line is covered by the type system and
  the shared calculator's tests, but I did not run the command against a live pool.

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

### Backend `development` — `<<BACKEND_SHA>>`

```
<<BACKEND_FILES>>
```

### App `new-game-save` — `<<APP_SHA>>`

```
<<APP_FILES>>
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
