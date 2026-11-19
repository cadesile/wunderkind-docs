<!-- STATUS --> **STATUS:** ✅ CLOSED — on `development` @ `9918839c`, **pushed** (origin matches) and deployed to backend `dev` @ `0e35f196`. Agent session archived 2026-11-19.

---

# A16 — two tests left the shared `game_config` row dirty, and a third paid for it

**Repo:** `wunderkind-backend`. **Branch:** `development`, level with `origin/development` at
`8298cc60` ("Publish the catchment share ladder, and leave the pack version alone"), working tree
clean at the start. **Date:** 2026-11-19. **Test-only change; no production code touched.**

**Fix commit:** `9918839c` — "Make the two economy gate tests put the shared config row back". **Not pushed, not deployed.**

---

## 1. What was wrong, and the one thing the brief got wrong about it

The diagnosis was handed over complete and it holds: `EconomyAuthoredSizeDriftTest:156` and
`EconomyTvCountryScalingGuardTest:113` wrote `38_866_153_952` into the single shared `game_config`
row inside their own `seed()` and never put it back, and
`LegacyNewGameFlowTest::testTheEconomyBlockShipsSwitchedOff` asserts that table is unauthored.

⚠️ **But it was NOT failing in every full run, and `environment.md` never listed it.** The brief
says both. Measured, before any change:

- a single `--filter`ed full run showed the documented **three** failures and
  `testTheEconomyBlockShipsSwitchedOff` **passed** (§3.1);
- `polluter -> reader` on its own **failed** every time (§3.2).

**The reason, and it is the finding worth keeping from this task:**
`tests/Controller/Admin/EconomyAdminTest` sorts between the polluters and the reader
(`Command/Economy*` < `Controller/Admin/Economy*` < `Controller/Api/Legacy*`) and **zeroes the
turnover table through the real admin save**. So the full run was green **by accident of two tests
both abusing the same shared row**. A10 saw the failure because it ran the suite in 20-file
batches, where that accident does not hold.

```
$ lando php vendor/bin/phpunit tests/Controller/Admin/EconomyAdminTest.php
OK (26 tests, 118 assertions)
$ lando php bin/console dbal:run-sql --env=test "SELECT economy_baseline_turnover_pence FROM game_config"
  [0,0,0,0,0,0,0,0]
```

(run with the row dirty beforehand — see §3.2.)

**This makes the defect worse, not better.** The invariant was holding on a coincidence between two
tests that both abuse the row, and either of them moving, being renamed, or being run in a
different batch brings the failure back. **"It passes in a full run" is not evidence that a
shared-row leak is harmless**, and that sentence is now in `environment.md`.

Also: the sixth-failure record lived in `.context/shared/last-sync.md` (A10's entry), **not** in
`environment.md`, whose known-failures list has only items #1-#5.

---

## 2. The fix, and why this shape

**In the polluters, per §1 of the brief. `LegacyNewGameFlowTest` was not touched.**

Both files **stash `economyBaselineTurnoverPence` in `setUp()` and restore it in `tearDown()`.**

**Why restore rather than stop persisting.** Stopping was considered and rejected on the code:
`seed()` has to flush the rest of its fixtures anyway, the managed `GameConfig` is in the same unit
of work, and `EconomyAuthoredSizeDriftTest::seed()` ends with `$em->clear()`, so an unflushed
in-memory value would not survive to the `CommandTester` run at all. The table is genuinely needed
— without one no tier resolves and `app:economy:wage-table` short-circuits before the checks these
files exist for. So the right discipline is the one `WorldOverviewServiceTest` already names in its
docblock: **own the row for the duration and put it back.**

**Why `tearDown()` and not the end of each test.** ⚠️ **PHPUnit runs `tearDown()` after a FAILED
assertion too**, so the row goes back exactly when something has already gone wrong — which is when
a dirty shared row costs the most, because the next failure is then someone else's to attribute.
An inline restore at the end of a test method is the happy-path shape and skips on the first failed
assertion. Proof that this one does not: §3.4.

```php
    protected function setUp(): void
    {
        self::bootKernel();

        $this->shippedTurnoverPence = self::getContainer()
            ->get(GameConfigRepository::class)
            ->getConfig(flush: true)
            ->getEconomyBaselineTurnoverPence();

        $this->purge();
    }

    protected function tearDown(): void
    {
        $this->restoreTurnoverTable();
        $this->purge();

        parent::tearDown();
    }

    /** Put the shared turnover table back, whatever happened to the test. */
    private function restoreTurnoverTable(): void
    {
        if ($this->shippedTurnoverPence === []) {
            return; // setUp() never got as far as stashing it; nothing authored, nothing to undo.
        }

        $em = self::getContainer()->get(EntityManagerInterface::class);
        $em->clear();

        self::getContainer()
            ->get(GameConfigRepository::class)
            ->getConfig(flush: true)
            ->setEconomyBaselineTurnoverPence($this->shippedTurnoverPence);

        $em->flush();
    }
```

**It restores what it found, not a hardcoded `[0,...]`** — deliberately. If a file arrives with the
row already dirty it hands back the same dirty row, and the reader's failure then still points at
whoever wrote it rather than being silently absorbed here.

⚠️ **The change is 86 lines, not the ~20 the brief expected** — almost all of it the docblock
explaining why the restore sits in `tearDown()`, which is the part a future reader would otherwise
"simplify" back into the bug.

---

## 3. Verification — every command and its output, verbatim

### 3.0 The row before anything (brief §3.5)

**It was clean, as A10 left it. Nothing had run since.**

```
$ lando php bin/console dbal:run-sql --env=test "SELECT economy_baseline_turnover_pence FROM game_config"
 ---------------------------------
  economy_baseline_turnover_pence
 ---------------------------------
  [0,0,0,0,0,0,0,0]
 ---------------------------------
```

### 3.1 Before: full run (brief §3.1) — THREE failures, not four

```
$ lando php vendor/bin/phpunit --filter '/^(?!.*AdminShellCoverage).*$/'
...
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
Tests: 3233, Assertions: 155818, Failures: 3, PHPUnit Deprecations: 1, PHPUnit Notices: 21, Skipped: 13.
```

**The reader is not among them.** §1 explains why; §3.2 is the composition that does fail.

### 3.2 Before: the pollution and the failure, reproduced

The polluter alone leaves the row dirty:

```
$ lando php vendor/bin/phpunit tests/Command/EconomyAuthoredSizeDriftTest.php
OK (14 tests, 49 assertions)
$ lando php bin/console dbal:run-sql --env=test "SELECT economy_baseline_turnover_pence FROM game_config"
  [38866153952,0,0,0,0,0,0,0]
```

and the reader then fails on exactly the diagnosed diff:

```
$ lando php vendor/bin/phpunit --filter testTheEconomyBlockShipsSwitchedOff tests/Controller/Api/LegacyNewGameFlowTest.php

1) App\Tests\Controller\Api\LegacyNewGameFlowTest::testTheEconomyBlockShipsSwitchedOff
the turnover table must be unauthored
Failed asserting that two arrays are identical.
--- Expected
+++ Actual
@@ @@
 Array &0 [
-    0 => 0,
+    0 => 38866153952,
     1 => 0,
     2 => 0,
     3 => 0,

/app/tests/Controller/Api/LegacyNewGameFlowTest.php:113

FAILURES!
Tests: 1, Assertions: 5, Failures: 1.
```

And with the fix stashed, from a verified-clean row, `polluter -> reader` in one run:

```
$ git stash push tests/Command/EconomyAuthoredSizeDriftTest.php tests/Command/EconomyTvCountryScalingGuardTest.php
$ lando php bin/console dbal:run-sql --env=test "UPDATE game_config SET economy_baseline_turnover_pence = '[0,0,0,0,0,0,0,0]'"
$ lando php vendor/bin/phpunit tests/Command/EconomyAuthoredSizeDriftTest.php tests/Command/EconomyTvCountryScalingGuardTest.php tests/Controller/Api/LegacyNewGameFlowTest.php
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
/app/tests/Controller/Api/LegacyNewGameFlowTest.php:113

FAILURES!
Tests: 35, Assertions: 138, Failures: 1.
$ lando php bin/console dbal:run-sql --env=test "SELECT economy_baseline_turnover_pence FROM game_config"
  [38866153952,0,0,0,0,0,0,0]
$ git stash pop
```

### 3.3 After: both polluters, both orders (brief §3.3)

With the fix in place, from a clean row:

```
$ lando php bin/console dbal:run-sql --env=test "SELECT economy_baseline_turnover_pence FROM game_config"
  [0,0,0,0,0,0,0,0]

$ lando php vendor/bin/phpunit tests/Command/EconomyAuthoredSizeDriftTest.php tests/Command/EconomyTvCountryScalingGuardTest.php
OK (22 tests, 61 assertions)
$ lando php bin/console dbal:run-sql --env=test "SELECT economy_baseline_turnover_pence FROM game_config"
  [0,0,0,0,0,0,0,0]

$ lando php vendor/bin/phpunit tests/Command/EconomyAuthoredSizeDriftTest.php tests/Command/EconomyTvCountryScalingGuardTest.php tests/Controller/Api/LegacyNewGameFlowTest.php
OK (35 tests, 138 assertions)

$ lando php vendor/bin/phpunit tests/Controller/Api/LegacyNewGameFlowTest.php tests/Command/EconomyAuthoredSizeDriftTest.php tests/Command/EconomyTvCountryScalingGuardTest.php
OK (35 tests, 138 assertions)
$ lando php bin/console dbal:run-sql --env=test "SELECT economy_baseline_turnover_pence FROM game_config"
  [0,0,0,0,0,0,0,0]
```

### 3.4 🔴 The restore survives a test failing mid-run (brief §3.4)

`self::fail(...)` injected into `testAReservedBottomTierIsNotReportedAsDrift` **after** its
`seed()` call — so the row was dirty at the moment the test died. **Scratchpad patch, reverted
immediately, never committed** (`grep -c "FORCED FAILURE"` on the committed file: `0`).

```
$ lando php vendor/bin/phpunit tests/Command/EconomyAuthoredSizeDriftTest.php tests/Command/EconomyTvCountryScalingGuardTest.php tests/Controller/Api/LegacyNewGameFlowTest.php

There was 1 failure:

1) App\Tests\Command\EconomyAuthoredSizeDriftTest::testAReservedBottomTierIsNotReportedAsDrift
FORCED FAILURE — A16 scratchpad proof only, never committed.

/app/tests/Command/EconomyAuthoredSizeDriftTest.php:265

FAILURES!
Tests: 35, Assertions: 136, Failures: 1.
$ lando php bin/console dbal:run-sql --env=test "SELECT economy_baseline_turnover_pence FROM game_config"
  [0,0,0,0,0,0,0,0]
```

**The forced failure was the only failure — the reader after it still passed — and the row was
clean afterwards.** That is the property an inline restore would not have.

### 3.5 After: full run (brief §3.2) — the documented three

```
$ lando php vendor/bin/phpunit --filter '/^(?!.*AdminShellCoverage).*$/'
...
There were 3 failures:

1) App\Tests\Controller\Admin\NotificationLogCrudControllerTest::testIndexRowIsClickableToADetailPageShowingTheFullPayload
2) App\Tests\Controller\Api\CompetitionControllerTest::testShowIncludesResultsOnceRoundsAreProcessed
3) App\Tests\Service\Friendly\FriendlyResolveSingleMatchTest::testResolvingAnAcceptedChallengeRecordsAFullResult

FAILURES!
Tests: 3233, Assertions: 155870, Failures: 3, PHPUnit Deprecations: 1, PHPUnit Notices: 21, Skipped: 13.
```

(failure bodies identical to §3.1 and reproduced in full in the raw log.)

**Items #1, #2, #3 of the documented baseline, and nothing else.** Items #4 and #5 did not appear
in either run, which is within the documented three-to-five range.

### 3.6 The row at the end (brief §3.5)

```
$ lando php bin/console dbal:run-sql --env=test "SELECT economy_baseline_turnover_pence FROM game_config"
  [0,0,0,0,0,0,0,0]
```

**Clean before the task and clean after it.** The one point it was left dirty was the stashed
pre-fix run in §3.2, which was reset explicitly before the after-run.

---

## 4. The baseline record (brief §4)

`.context/stages/01_overview/output/environment.md`:

- **The sixth failure is NOT listed, because it is not a known failure — it was a defect and it is
  fixed.** The known-failures list stays at items #1-#5 and the three-to-five range. A short note
  now says the sixth was a defect fixed the same day, that it was never a flake that stopped
  appearing, and ⚠️ **what to conclude if that assertion ever fails again: it is someone's
  pollution, and the thing to find is whoever wrote the row.**
- The §1 finding is recorded: the full run had been hiding it because `EconomyAdminTest` zeroes the
  row in between, so **"it passes in a full run" is not evidence that a shared-row leak is
  harmless.**
- **New subsection: `AdminShellCoverageTest` OOM-kills a full run** at ~183/3,305, exit 137,
  identically on a clean tree, with the `--filter '/^(?!.*AdminShellCoverage).*$/'` workaround and
  the resulting clean count of 3,233. It was not recorded anywhere; it cost two sessions a
  full-suite run.

One pass entry appended to `.context/shared/last-sync.md`.

---

## 5. 🟡 For the PM

1. ⚠️ **`environment.md` had an unterminated ```` ```bash ```` fence**, so the **entire**
   known-failures section — items #1-#5, the three-to-five range, the "it is NOT ~31" warning —
   rendered as a literal code block, and the `TEST_TOKEN` paragraph belonging to that block sat
   orphaned after it. **Closing the fence and moving those four lines back is the only structural
   edit made here**, and it was made because an unreadable baseline is precisely what §4 of the
   brief is protecting. Flagged rather than hidden; revert it if you would rather own it.
2. ⚠️ **`EconomyAdminTest` still does not restore `game_config`** — already noted in
   `environment.md`, and this task found that its leak is now **load-bearing by accident** (§1).
   It is the next polluter and it deserves its own task.
3. `WorldOverviewServiceTest` restores `game_config` **inline, before its assertions** rather than
   in `tearDown()`. Safe today only because the restore sits in a helper that returns before
   anything asserts. It is the happy-path shape, not the failure-safe one.
4. Nothing superseded was deleted.

---

## 6. Scope

- `LegacyNewGameFlowTest` untouched; its assertion unchanged.
- No production code touched. No authored economy figure touched.
- Nothing written in `wunderkind-app` (A17 is there). Nothing scratch-shaped written in either
  repository.
- Not pushed. Not deployed.

---

## 7. The commit

`9918839c81bdfda1d2b378a801f59c2dd49ebb50` on `development`, directly on top of `8298cc60`.
**Not pushed.** Files changed:

```
tests/Command/EconomyAuthoredSizeDriftTest.php     | 43 +++++++++
tests/Command/EconomyTvCountryScalingGuardTest.php | 43 +++++++++
.context/stages/01_overview/output/environment.md
.context/shared/last-sync.md
```
