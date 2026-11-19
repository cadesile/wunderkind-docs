<!-- STATUS --> **STATUS:** ✅ A18 backend half done. ⚠️ **COMMITTED, NOT PUSHED, NOT DEPLOYED.** 🟢 **NO `WORLD_PACK_VERSION` BUMP — the brief asked for one and it was NOT needed. No pack regeneration.**

---

# A18 — publishing the catchment fan-base ladder

**Branch `development`, commit `8298cc60` on top of `b82540d7`. Backend only. 2026-11-19. Not pushed — `development` is now THREE commits ahead of `origin/development`.**

```
$ git rev-parse --abbrev-ref HEAD
development
$ git log --oneline -3
b82540d7 Reconcile A10's suite count and classify the sixth known failure
68561f93 Calibrate the wage scale against the ability players actually have
0e68d6ac Add the second npc_club composition flake to the test baseline, and strike "~31"
$ git status --porcelain
(clean)
$ git fetch origin +refs/heads/development:refs/remotes/origin/development +refs/heads/master:refs/remotes/origin/master
$ git rev-list --count origin/development..HEAD
2
$ date
Thu Nov 19 19:12:37 GMT 2026
```

Baseline `b82540d7`, tree clean, **two unpushed commits ahead of `origin/development`** exactly as
the brief said. Nothing reset, nothing rebased.

No `*-correction.md` or `*-addition.md` in `economy-loose-ends/` is newer than the brief:

```
$ ls -lT a18-fanbase-backend-brief.md *correction*.md *addition*.md
-rw-r--r--@ 1 courtneyadesile  staff  7377 Nov 19 19:04:24 2026 a18-fanbase-backend-brief.md
-rw-r--r--@ 1 courtneyadesile  staff  4898 Nov 19 18:28:23 2026 a3-tvdeal-addition.md
-rw-r--r--@ 1 courtneyadesile  staff  3411 Nov 19 18:28:23 2026 a4-premise-correction.md
```

`.context/` and the `icm-codebase-context` skill are present and were read before any raw
source: `CONTEXT.md` → `03_data/output/entities.md`, `04_interfaces/output/routes.md`,
`01_overview/output/environment.md`. Then `next-work-plan.md`'s **THE INTENDED GAME**,
**CORRECTION — "median catchment is flat across tiers" was a STATISTICAL ARTEFACT** and
**THE LADDER'S STEEPNESS**.

---

## 🔴 0. READ FIRST — §3 OF THE BRIEF WAS ALREADY DONE, AND THE BUMP IT DEMANDS WOULD HAVE COST 107 PACKS FOR NOTHING

**The brief's §3 says `populationSize` is not on the world-club snapshot and that publishing it
is a pack-shape change requiring `WORLD_PACK_VERSION` 11 → 12. It is already there, and has been
since the snapshot builder was written.**

```
$ grep -n "populationSize" src/Service/WorldPackSnapshotBuilder.php
134:            'populationSize' => $club->getPopulationSize(),
151:     * ADDITIVE AND NULLABLE. `region`, `citySize`, `populationSize` and `isCapital` stay
```

```
$ git log --oneline -1 -L134,134:src/Service/WorldPackSnapshotBuilder.php
160ac7a9 Rework World Pack Cache to generate per-club, fresh, with admin progress tracking
```

Measured, not inferred, against the cached payloads actually on the box:

```
$ lando psql -U postgres -t -A -F'|' -c "select country, tier, payload_version,
    (payload->'clubs'->0->>'populationSize'), (payload->'clubs'->0->>'citySize')
  from country_world_pack_cache order by payload_version desc, country, tier limit 12;"
EN|1|9|263000|MEDIUM
EN|2|9|263000|MEDIUM
EN|3|9|263000|MEDIUM
EN|4|9|210000|SMALL
EN|5|9|210000|SMALL
EN|6|9|210000|SMALL
EN|7|9|210000|SMALL
EN|8|9|185000|SMALL
SC|1|8|49460|MEDIUM
SC|2|8|46150|MEDIUM
SC|3|8|49460|MEDIUM
SC|4|8|35170|SMALL
```

**Both generation paths reach that one builder** (`WorldPackClubGenerationService::buildSnapshot()`
is a one-line delegate to it; `WorldInitializationService:299` calls that delegate), and
`InitializeController::tier()` serves `WorldPackSetService::tierPayload()` — which is
`cacheService->readTier()`, the stored payload whole, with no key filter. On the client side
`stripClubDataForBlob` (`wunderkind-app/src/db/repositories/worldClubRepository.ts:27`) is a rest
spread that removes only `players`/`staff`/`scouts`, so the field survives into `world_clubs` and
`fanStore.initialiseFans` reads `club.populationSize` off it.

**So the pack shape did not change and `WORLD_PACK_VERSION` stays at 11.** Bumping it would have
invalidated **107 cached tier payloads** and forced a manual regeneration to publish a field that
was already published. The app's own `WorldClub.populationSize` docblock
(`wunderkind-app/src/types/world.ts:243-247`) carries the same wrong claim — *"it is not in the
world pack yet"* — and is presumably where the brief got it; **app-side, flagged in §6, not
fixed here.**

**The player's own club was already wired too.** `useSetupHost.ts:346` sets
`catchmentPopulation` from `land.populationOf(claim.locationId)`, and `LocationController`
publishes `population` on both locations payloads (`:564`, `:620`). So **the only thing missing
server-side was the share ladder**, which is §2.

---

## 1. What landed

| | |
|---|---|
| `src/Entity/StarterConfig.php` | new `$fanBaseSharePercent` JSON column, `Record<tier-string, {min,max}>`, seeded with the authored ladder |
| `migrations/Version20261119190000.php` | adds `starter_config.fan_base_share_percent`, NOT NULL, DB default seeds the one row then is dropped |
| `src/Controller/Admin/DashboardController.php` | reads `fanBaseSharePercent[tier][min\|max]`, clamps both bounds **0–100**, orders them |
| `templates/admin/starter_config.html.twig` | a CATCHMENT SHARE % block of 8 tiers inside the existing FAN BASE card and the existing single form |
| `src/Controller/Api/StarterConfigController.php` | publishes `fanBaseSharePercent` beside `fanBaseRanges` |
| `tests/Entity/StarterConfigFanBaseShareLadderTest.php` | new — monotonic, 0–100, authored values pinned, **`fanBaseRanges` unchanged**, the two ladders independent |
| `tests/Controller/Admin/StarterConfigFanBaseShareTest.php` | new — the HTTP round trip, the clamp, and that a ladder save leaves `fanBaseRanges` alone |
| `tests/Controller/Api/LegacyNewGameFlowTest.php` | its key-set diff now expects `['fanBaseSharePercent', 'economy']` |
| `tests/Controller/Admin/StarterConfigScreenTest.php` | the array-field census now covers the new prefix |

**The authored ladder, as published:**

```php
'1' => ['min' => 60, 'max' => 70],   '5' => ['min' => 27, 'max' => 34],
'2' => ['min' => 49, 'max' => 59],   '6' => ['min' => 22, 'max' => 29],
'3' => ['min' => 40, 'max' => 49],   '7' => ['min' => 18, 'max' => 24],
'4' => ['min' => 33, 'max' => 41],   '8' => ['min' => 15, 'max' => 20],
```

### 🔴 `fanBaseRanges` was NOT touched

Same column, same name, same values, still published, still the app's fallback. Nothing in this
change reads it, writes it or reinterprets it. Three separate assertions pin that
(`StarterConfigFanBaseShareLadderTest::testFanBaseRangesIsUntouchedAndStillAbsoluteHeadcounts`,
`::testTheTwoLaddersAreIndependent`,
`StarterConfigFanBaseShareTest::testSavingTheLadderLeavesTheAbsoluteFanBandAlone`), one of them
stated as a relationship rather than literals — *every* absolute band is above 100, so if the key
ever drops into percentage range the test fails whatever the numbers are.

⚠️ **One thing to know when reading that test.** It pins the **entity** defaults
(50,000–150,000 at tier 1 down to 200–1,000 at tier 8). **The deployed row is admin-edited and
very different** — 700,000–1,500,000 down to 10,000–20,000, which is what A14 read off
`starter-config.LIVE.json` and what every figure in §4 below is measured against. A unit test
cannot reach the deployed row, so what it proves is that nobody re-authored the shipped defaults
or changed the key's unit; the live values are protected by the HTTP round-trip test instead.

### 🟢 No money, no fan count and no share went into the pack

Nothing in this change touches `WorldPackSnapshotBuilder`, the pack version, or any pack payload.
The share is config and resolves on the device; the pack carries only the census population it
already carried.

---

## 2. §4 — the measurement, England and Scotland

**Source data, both read-only exports of the deployed box, never a fallback constant:**

- `wunderkind-app/world.json` — the admin world export, `exportedAt 2026-11-18T22:00:23+00:00`,
  3,191 clubs, **EN 16 and SC 14 clubs per tier**, which is B3's confirmed deployed state. The
  same file A14 measured against (identical n, min and max per tier; our medians differ only by
  interpolation convention on an even sample).
- `pre-r2-exports/starter-config.LIVE.json` — the LIVE, admin-edited `fanBaseRanges`.

**Model, copied from the app half** (`wunderkind-app/src/economy/fanBase.ts`):
`share = min + roll × (max − min)`, `fans = max(1, floor(population × share / 100))`. The table
below applies the **band midpoint**; the edges are given underneath. Script and verbatim output:
`a18-run-2026-11-19/a18-measure.py` and `a18-measure-output.txt`.

### England

```
tier   n   share%       mean       min        max  today mid  xtoday  >42.5k  today>42.5k
   1  16    60-70    536,713    18,200  5,838,300  1,100,000    0.49  13/16         16/16
   2  16    49-59     34,352     7,722    106,380    600,000    0.06   6/16         16/16
   3  16    40-49    288,929    11,125  3,996,990    475,000    0.61   5/16         16/16
   4  16    33-41     18,766     6,660     59,940    325,000    0.06   2/16         16/16
   5  16    27-34     16,149     6,100     30,805    170,000    0.09   0/16         16/16
   6  16    22-29    153,714     5,100  2,290,410     80,000    1.92   1/16         16/16
   7  16    18-24      9,066     3,003     21,210     35,000    0.26   0/16          0/16
   8  15    15-20      7,850     3,150     17,038     15,000    0.52   0/15          0/15
  spread tier1:tier8 on MEANS  = 68.4:1   (today 73.3:1)
```

### Scotland

```
tier   n   share%       mean       min        max  today mid  xtoday  >42.5k  today>42.5k
   1  14    60-70     77,143     1,170    413,166  1,100,000    0.07   5/14         14/14
   2  14    49-59      5,980     1,728     18,198    600,000    0.01   0/14         14/14
   3  14    40-49      8,867       667     33,428    475,000    0.02   0/14         14/14
   4  14    33-41     18,372     1,665    194,793    325,000    0.06   1/14         14/14
   5  14    27-34      2,701       457      6,862    170,000    0.02   0/14         14/14
   6  14    22-29      2,585       510     11,854     80,000    0.03   0/14         14/14
   7  14    18-24      1,636       315      3,735     35,000    0.05   0/14          0/14
   8  13    15-20      1,494       350      3,050     15,000    0.10   0/13          0/13
  spread tier1:tier8 on MEANS  = 51.6:1   (today 73.3:1)
```

**The band edges, not the midpoint:**

```
country tier      fans at min share      fans at max share
     EN    1     16,800 – 5,389,200     19,600 – 6,287,400
     EN    8         2,700 – 14,604         3,600 – 19,473
     SC    1        1,080 – 381,384        1,260 – 444,948
     SC    8            300 – 2,614            400 – 3,486
```

### 🟢 Reproduced: the spread, and that this is the RIGHT ladder

**England comes out at 68.4:1 against today's 73.3:1** — the brief's "about 70:1", and nowhere
near the 164:1 that would mean the rejected 5–10% variant had been applied. The ladder in the code
is the one the owner settled.

### 🔴 NOT reproduced: "every tier at ×0.47–0.49 of its current level"

**Only England tier 1 lands there (×0.49).** Across England the multiplier runs **×0.057 to
×1.92**; across Scotland **×0.010 to ×0.100**. The uniform offset the plan described does not
exist in the deployed world, for two reasons, and **neither is a problem with the ladder's
numbers.**

**(a) THE DEPLOYED WORLD SEATS THREE SEPARATE CLUBS IN LONDON, AT TIERS 1, 3 AND 6.**

```
$ python3 -c "...populationSize > 1,000,000, country EN..."
1 London Rangers      Greater London  BIG  8,982,000
1 Birmingham United   West Midlands   BIG  1,149,000
3 London United       Greater London  BIG  8,982,000
6 London Albion       Greater London  BIG  8,982,000
```

So mean catchment is **not** the clean 19:1 tier gradient the plan's table shows. Measured on this
export it is **non-monotonic**: EN tier 3 means 649,280 and tier 6 means 602,800, both above tiers
2, 4, 5, 7 and 8, purely because each holds one London club. The endpoints still give 18.4:1
(t1 825,712 → t8 44,858), which is why the t1:t8 spread reproduces while every tier in between
does not.

⚠️ **The consequence is sharper than a wobbly mean.** `London Albion`, a **tier-6** club, lands at
**2,290,410 fans** — more than today's tier-1 *maximum* of 1,500,000, and ×1.92 of its own tier's
current level. **The share ladder cannot produce a monotone pyramid on a world that seats a
9-million-person city at tier 6.** This is precisely the Phase-2 item the plan deferred
("splitting a shared catchment between clubs in the same city"), and the plan's reason for
deferring it — *"double-counting a shared city is invisible to the engine; nothing aggregates fan
bases across clubs"* — is **true for aggregation and false for the gradient**. Nothing sums them;
the pyramid still inverts at that one club. **I have changed nothing about this. Flagging it.**

**(b) TODAY'S `fanBaseRanges` IS COUNTRY-BLIND AND SCOTLAND IS A DIFFERENT POPULATION REGIME.**
Scotland's largest catchment is 635,640 (Glasgow) against England's 8,982,000, and its tier-8 mean
is 8,541 against England's 44,858 — but both countries draw today's fan base from the same
tier-keyed absolute band. So the ladder is a **×0.01–×0.10 reduction throughout Scotland** against
×0.06–×1.92 in England. Scottish mean catchment falls only **13.9:1** t1→t8, so Scotland's spread
also lands at **51.6:1**, not 70:1.

**This is the ladder doing exactly what it is for** — a Scottish tier-1 club in a town of 11,700
should not have the same 1.1M fans as London Rangers — but it means **the level is not preserved
in Scotland the way it is at England's apex.** Per the plan, the dial for a level offset is shirt
price and sponsor value, not the share ladder, so I have not touched it.

### 🟢 The 42,500 demand ceiling, which is the check that matters

**Today it binds nowhere above tier 6, in either country.** Every tier-1-to-6 absolute band has
its *minimum* above 42,500 (tier 6 is 60,000–100,000), so every club at those tiers is
capacity-limited and the demand cap the owner designed is dead code there. Tiers 7 and 8 are
entirely below it.

**After the ladder:** England **13/16 at tier 1**, 6/16 at tier 2, 5/16 at tier 3, 2/16 at tier 4,
1/16 at tier 6 and **none at all from tier 5 down** except that one London club. Scotland **5/14
at tier 1**, 1/14 at tier 4, **zero everywhere else**. So the cap goes from binding on no club
above tier 6 to binding on **the great majority of the pyramid in England and on all but six clubs
in Scotland** — which is the pyramid the owner described, and it is the strongest result here.

### Do the ladder's numbers need changing?

**No, and I am not recommending any change.** The ladder reproduces the England spread it was
authored to reproduce. What the measurement shows is a **data** problem (three clubs in London)
and a **country-blindness** problem (one absolute band for two population regimes), both of which
predate this task and neither of which a share percentage can fix.

---

## 3. 🟡 FLAGGED, NOT CHANGED

### 3.1 App-side, as the brief listed them — both confirmed

**`crowdShare: 0.04`** — `wunderkind-app/src/components/new-game-setup/economy.ts:50`. Confirmed
live and confirmed to be a second catchment share. It is used as a **demand cap** on the setup
screen's season estimate (`demand = round(population × 0.04 / 50) × 50`, `:154`), deliberately so
since 2026-11-13 when it stopped *being* the attendance. **Once this lands, the setup screen tells
a new tier-8 club its demand is 4% of its town while the tick gives it a fan base of 15–20% of the
same town — roughly 4–5× apart, on the one screen where the player commits real money.** The
earlier mismatch that comment describes was 3×. **App-side. Not fixed.**

**`PeerBenchmarkService.getTierFanCountAverage`** — `wunderkind-app/src/engine/PeerBenchmarkService.ts:48`.
Confirmed: it is the mean `fanCount` across same-tier NPC clubs, and
`StaffConversationService.ts:179` marks the Director of Football **below standard** whenever the
club's fan count trails it. Quantified against the deployed export at the authored ladder:

```
EN t1: 14/16 clubs below their tier mean (536,713) — median club 73,954
EN t3: 15/16 below (288,929)                       — median club 39,160
EN t6: 15/16 below (153,714)                       — median club 11,475
SC t4: 13/14 below ( 18,372)                       — median club  4,347
```

Today a tier's fan counts are a narrow uniform draw, so about half a division sits below the mean
by construction. **After the ladder, in the tiers holding one big-city club, 88–94% of the division
is permanently below its own tier mean and its DOF is judged below standard at every review, for
ever.** A median or a percentile would behave; a mean on a distribution with one 9-million
outlier will not. **App-side. Not fixed.**

### 3.2 Three more, found while verifying — all app-side

1. 🔴 **The app's `REFERENCE_FAN_BASE_SHARE_PERCENT` is the REJECTED 5–10% variant**
   (`wunderkind-app/src/economy/fanBase.ts:90-99`, tier 8 = `{min: 5, max: 10}`, and
   `fanBase.test.ts:154` pins it). It is not the fallback for an *absent* ladder — that is
   `fanBaseRanges`, correctly — but it **does** fill any single tier the published ladder omits
   (`fanBase.ts:179`). So a ladder published with a gap silently gets the 164:1 variant at that
   rung. **The backend publishes all eight rungs, so this is latent, not live.** It also means
   that any app-side *measurement* run off that constant is measuring the rejected ladder.

2. ⚠️ **`WorldClub.populationSize`'s docblock is wrong** (`wunderkind-app/src/types/world.ts:243-247`):
   *"It is already in the admin world export; it is not in the world pack yet — the backend half
   of this feature publishes it (and bumps `WORLD_PACK_VERSION`)."* It has been in the pack since
   the snapshot builder was written (§0). This is the sentence the brief's §3 was built on, and it
   is the same failure mode as A14's finding — a comment quoted as a measurement.

3. ⚠️ **A tier zeroed in the admin form gives every club in it ONE fan, not a fallback.** The form
   always posts all eight rungs, so clearing a field submits `""` → `0`, which clamps to
   `{min:0,max:0}`. The app's `usableBand` accepts that as valid, so the share path is taken and
   `max(1, floor(pop × 0))` = **1 fan**, zeroing that tier's shirt income and capping every gate
   at one. This is symmetric with how `fanBaseRanges` already behaves on a zeroed tier, and the
   brief asked for the same validation shape, so **I did not invent a new rule.** Worth a decision:
   either treat `{0,0}` as "absent" on publish, or guard it in the form.

### 3.3 A check I would have added, and could not

Per standing-notes §1, the figure this task's success depends on is only answerable on a device:
**is the share path actually being taken?** The one line worth printing is a relationship, not a
value:

```
FANBASE  ladder published: yes (8 rungs) · catchment known: 127/128 clubs · path: SHARE
         AMP club: tier 6 · catchment 43,000 · share 25.5% · fans 10,965
```

It can fail (a missing ladder, a pack with no populations, or an AMP club with no catchment all
read differently), and the failure changes what someone does. **It belongs in
`wunderkind-app/src/economy/economyDiagnostics.ts` and I am backend-only, so it is a flag, not a
commit.**

### 3.4 `.context` — nothing I would restructure, one gap to note

`03_data/output/migrations.md` documents up to `Version20261119091000`, but
`Version20261119120000` and `Version20261119150000` are on disk and undocumented. **Not mine, not
touched** — flagged for the PM. I appended my own entry in the same style rather than reordering
anything.

---

## 4. §5 — verification

### 4.1 The new tests, and the two existing ones they changed

```
$ lando php vendor/bin/phpunit --no-coverage tests/Entity/StarterConfigFanBaseShareLadderTest.php tests/Controller/Admin/StarterConfigFanBaseShareTest.php
OK (8 tests, 108 assertions)

$ lando php vendor/bin/phpunit --no-coverage tests/Controller/Api/LegacyNewGameFlowTest.php tests/Controller/Admin/StarterConfigScreenTest.php tests/Controller/Admin/StarterConfigEnrichmentCapTest.php tests/Controller/Admin/StarterConfigAbilityRangeMergeTest.php
OK (25 tests, 162 assertions)

$ lando php vendor/bin/phpunit --no-coverage tests/Service/ConfigImportExportCoverageTest.php
OK (20 tests, 637 assertions)
```

The last one is checked deliberately: `ConfigImportExportService` is reflection-driven over
property names (`03_data/output/entities.md` says so), so a new `StarterConfig` property is
exactly the kind of change that can break it silently.

**§5.2 — monotonic and within 0–100:** `StarterConfigFanBaseShareLadderTest::testTheDefaultLadderIsMonotonicAndWithinZeroToOneHundred`.
Non-strict monotonicity on purpose — flattening two adjacent tiers is a legitimate authoring
choice and today's default is strictly decreasing anyway.

**§5.3 — `fanBaseRanges` unchanged:** three assertions, listed in §1 above.

**§5.4 — admin round trip:** `StarterConfigFanBaseShareTest::testEditingATiersShareSavesAndPublishesIt`
posts the real form, reads the column, then reads `GET /api/starter-config`. The clamp and the
"an absent ladder keeps the stored one" rule have their own cases. The file captures and restores
`starter_config`'s two fan columns, because that row is a singleton nothing purges between files —
the trap behind two of the documented baseline failures.

### 4.2 §5.5 — `app:economy:wage-table` is byte-identical, EN and SC

Measured across a stash, same box, same minute:

```
$ git stash push -u -m a18-gate-before2
$ lando php bin/console app:economy:wage-table EN   # and SC
$ git stash pop
$ lando php bin/console app:economy:wage-table EN   # and SC
$ diff gate-before-EN.txt gate-after-EN.txt && echo BYTE-IDENTICAL
BYTE-IDENTICAL (149 lines)
$ diff gate-before-SC.txt gate-after-SC.txt && echo BYTE-IDENTICAL
BYTE-IDENTICAL (140 lines)
```

⚠️ First attempt used `--country=EN`, which is not an option on this command — countries are
positional. Both runs produced an identical *usage error*, which would have diffed clean and
proved nothing. Re-run correctly above. The real output ends `[ERROR] 24 check(s) failed` for EN
and `15` for SC — **the gate's own verdict, pre-existing, and not a test figure.** Files in
`a18-run-2026-11-19/`.

### 4.3 §5.1 — the full suite

⚠️ A whole-suite `phpunit` OOM-kills on this box (exit 137) and `AdminShellCoverageTest` cannot
run at all, both documented. **Run in 20-file batches**, 387 files in 20 processes
(`a18-run-2026-11-19/run-suite.sh`, per-batch output in `suite-batches/`).

```
TOTAL tests=3233 assertions=155803 failures=3 errors=1
```

**Reconciles exactly:** `--list-tests` counts **3,305** tests; `AdminShellCoverageTest` is **72**
of them; 3,305 − 72 = **3,233 executed**. (3,297 before this change; the 8 new tests make 3,305.)

```
batch-002  NotificationLogCrudControllerTest::testIndexRowIsClickableToADetailPageShowingTheFullPayload
batch-004  CompetitionControllerTest::testShowIncludesResultsOnceRoundsAreProcessed
batch-013  FriendlyResolveSingleMatchTest::testResolvingAnAcceptedChallengeRecordsAFullResult
batch-014  LeaderboardHallOfFameTest::testTitlesProduceATierWeightedScoreOnTheLeaderboard   ← ERROR
```

| result | verdict |
|---|---|
| `NotificationLogCrudControllerTest` | documented **#1** — empty content table |
| `CompetitionControllerTest`, narrative timeline | documented **#2** — empty content table |
| `FriendlyResolveSingleMatchTest` | documented **#3** — empty content table |
| `LeaderboardHallOfFameTest` | ⚠️ a **new instance of an already-documented MECHANISM**, not mine — attributed below |

**So three failures, inside the documented three-to-five, plus one error that is not mine.**

#### The error, attributed by stashing rather than by reading the assertion

```
Doctrine\DBAL\Exception\UniqueConstraintViolationException: SQLSTATE[23505]: Unique violation:
  duplicate key value violates unique constraint "uq_league_country_tier"
  DETAIL:  Key (country, tier)=(XJ, 4) already exists.
/app/tests/Service/LeaderboardHallOfFameTest.php:78
```

```
$ lando psql -U postgres -d wunderkind_test -c "select country,tier,count(*) from league where country='XJ' group by 1,2;"
XJ|4|1
```

```
$ grep -n "randomCountryCode" -A3 tests/Service/LeaderboardHallOfFameTest.php
190:    private function randomCountryCode(): string
192:        return chr(random_int(65, 90)) . chr(random_int(65, 90));
```

**This is the documented synthetic-country-code collision, exactly.** The test draws a 2-letter
code uniformly from 676 and never deletes the `League` rows it creates, so each run leaves one
more behind in the shared `wunderkind_test` database and the collision probability climbs. My run
drew `XJ`, which a previous run had already left at tier 4. Verified both ways, same box:

```
                                       clean tree          with my change
LeaderboardHallOfFameTest alone        OK (4 tests)        OK (4 tests)
batch-014's full 20 files              OK (228 tests)      OK (228 tests)
```

Identical either way, and the stale `XJ` row is still in the database. **Nothing in this change
touches a `League` row, a country code or that table.** Files:
`a18-run-2026-11-19/attrib-*.txt`.

#### ⚠️ The "sixth, deterministic" failure did NOT fire, and here is why

The brief and `environment.md` record `LegacyNewGameFlowTest::testTheEconomyBlockShipsSwitchedOff`
as a sixth, **deterministic** item caused by two test files leaving `game_config` dirty. It
passed, both in batch-004 and in isolation:

```
$ lando php vendor/bin/phpunit --no-coverage --filter testTheEconomyBlockShipsSwitchedOff tests/Controller/Api/LegacyNewGameFlowTest.php
OK (1 test, 5 assertions)
```

**So it is conditionally deterministic, not deterministic:** it needs the dirtying file to run
before it and nothing to have restored the row in between. `EconomyAdminTest` landed in chunk-001
and `LegacyNewGameFlowTest` in chunk-004 of my split, and `game_config` is currently clean.
**I did not "fix" it and nothing here touches it** — recording the discrepancy so the next agent
reading "deterministic" is not surprised by a green run. **That wording is `environment.md`'s and
belongs to the PM**; I have not edited it.

---

## 5. 🔴 WHAT THE OWNER HAS TO DO, AND WHAT THEY DO NOT

### 🟢 NO PACK REGENERATION. NO `WORLD_PACK_VERSION` BUMP.

The brief's headline operator action is not needed — see §0. The version stays at **11**, the 107
cached tier payloads stay valid, and nothing has to be rebuilt.

### ⚠️ Deploying the migration SWITCHES THE FEATURE ON, at the next config fetch

There is one action and it is the migration. `Version20261119190000` seeds the ladder, so the very
next `GET /api/starter-config` publishes it, and **any app build carrying A14's half
(`0964fedc`, not yet pushed) will start drawing fan bases from catchments for every NEW
save.** Existing saves keep the fan counts already written to their stores — `resolveStartingFanCount`
runs at initialisation, not per tick.

So **the release order matters**: this half is safe to land alone (no published key changed
meaning, and an app without A14 ignores the new key entirely), but once both halves are live the
figures in §2 are what players get.

### The three things to decide, in order of how much they bite

1. 🔴 **Three clubs share London, at tiers 1, 3 and 6** (§2a). It gives a tier-6 club 2,290,410
   fans — above today's tier-1 maximum — and it is why the per-tier multipliers scatter instead of
   landing on a uniform ×0.47. This is the deferred Phase-2 catchment-sharing item, and it is more
   consequential than the plan's "invisible to the engine" note suggests.
2. ⚠️ **`fanBaseRanges` is country-blind and Scotland is not England** (§2b). Scotland lands at
   ×0.01–×0.10 of today throughout. Per the plan, the dial for a level offset is shirt price and
   sponsor value, not the ladder — untouched here.
3. ⚠️ **`crowdShare: 0.04` and `PeerBenchmarkService`'s tier mean** (§3.1). Both app-side, both
   now quantified.

---

## 6. Against the brief, item by item

| brief | outcome |
|---|---|
| §2 new `fanBaseSharePercent`, same shape, admin-editable, published | ✅ done, with the authored eight rungs |
| §2 🔴 do not reinterpret `fanBaseRanges` | ✅ untouched, three tests pin it |
| §3 publish `populationSize` on the NPC snapshot | 🔴 **already published — no change made** (§0) |
| §3 ⚠️ bump `WORLD_PACK_VERSION` 11 → 12 | 🔴 **NOT needed and NOT done** (§0) |
| §3 no fan count, share or money in the pack | ✅ nothing added to the pack at all |
| §4 EN + SC measurement, per tier, vs today, and >42,500 | ✅ §2 |
| §4 expect ~70:1 spread | ✅ **68.4:1** in England (51.6:1 in Scotland) |
| §4 expect ×0.47–0.49 at every tier | 🔴 **not reproduced** — only EN tier 1; reasons in §2 |
| §4 ⚠️ 164:1 would mean the wrong ladder | ✅ not seen; the right ladder is in the code |
| §5.1 suite against the baseline | ✅ 3 documented failures + 1 attributed non-mine error (§4.3) |
| §5.2 monotonic, 0–100 | ✅ |
| §5.3 `fanBaseRanges` unchanged | ✅ |
| §5.4 admin round trip | ✅ |
| §5.5 `app:economy:wage-table` byte-identical EN + SC | ✅ |
| §6 flag `crowdShare` and `PeerBenchmarkService` | ✅ §3.1, quantified, not fixed |
| §7 `.context`: 03_data + 04_interfaces + one `last-sync` entry | ✅ |
| §8 do not push, do not deploy, no other economy figure | ✅ nothing pushed; the gate proves no dial moved |
