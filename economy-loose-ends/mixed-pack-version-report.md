# `Pack version: MIXED: 14, 15` on a freshly rebuilt cache — what actually happened

2026-11-22. Backend `development` @ `f1f3145b`, app `new-game-save`.

## Verdict first

**The admin rebuild is not the cause, and there is no backend path that can serve a v14
payload to a save started after the v15 deploy.** The `MIXED: 14, 15` row is produced on the
device, by a module-level cache in the app that `Start New Game` does not reset. The world the
owner tested was one generation — 127 clubs, 2,994 players, 1,445 staff, all v15. The CHECKS
row was a false alarm, and it cost a test cycle exactly as if it had been true.

That said, two things are worth fixing and one of them is backend:

1. **The rebuild's reporting was incomplete** — it cleared the country's unclaimed stock,
   spared the claimed ones (correctly), and said nothing about either. The only evidence the
   operator had was the cache table still listing rows at the old payload version after the run
   read `COMPLETED`, which is precisely what was read as "some v14 elements persisted". **Fixed
   here** (see §5).
2. **The app's `worldPackVersion` module cache survives a new game.** Not fixed here — it is
   app-side and needs the PM's call (§4, §7).

---

## 1. What the admin rebuild actually does

`POST /admin/worldpack-cache/regenerate-country`
(`src/Controller/Admin/WorldPackController.php::regenerateCountry`) →
`WorldPackGenerationOrchestrator::startRun($country, $tiers, $setCount)`.

Answers to the questions asked, in order:

- **Scope.** Per COUNTRY, every tier that has a `League` row for it, `setCount` sets (default
  `StarterConfig::$worldPackSetTarget`, 2). Tiers with no league are filtered out silently:

  ```php
  $tiers = array_values(array_filter(
      $tiers,
      fn(int $tier): bool => $this->leagueRepository->findByCountryAndTier($country, $tier) !== null,
  ));
  ```

- **Delete-and-regenerate, not regenerate-over.** `startRun` calls
  `WorldPackSetService::deleteUnclaimed($country)` first, then builds fresh `WorldPackSet` rows.
  Payload rows are FK'd to the set with `onDelete: 'CASCADE'`
  (`src/Entity/CountryWorldPackCache.php`), so clearing a set takes its tier rows with it. It
  never edits a payload row in place.

- **Per-set, not per-tier.** One `WorldPackGenerationTierRun` per *(set × tier)*, one
  `WarmWorldPackTierMessage` each on the `worldpack` transport; the tier handler fans out one
  message per NPC club; `WorldPackTierAssemblyService::maybeAssemble()` folds a tier's clubs
  into a payload once they are all terminal, `maybeReadySet()` flips the set to `ready`.

- **`WORLD_PACK_VERSION` gates BOTH paths, and at two granularities.**

  Write — `WorldPackCacheService::replaceWithPayload()` stamps every row it writes:
  ```php
  $entry = new CountryWorldPackCache($set, $tier, $payload, WorldInitializationService::WORLD_PACK_VERSION);
  ```
  and the payload's own client-visible copy is a compile-time constant
  (`WorldInitializationService::buildLeagueSnapshot`, `:467`):
  ```php
  'packVersion'                   => self::WORLD_PACK_VERSION,
  ```
  with `src/Service/WorldInitializationService.php:316`:
  ```php
  public const WORLD_PACK_VERSION = 15;
  ```

  Read — twice. The claim filters on the SET's version
  (`WorldPackSetRepository::claimOldestReady`, inside the single atomic UPDATE):
  ```sql
  WHERE country              = :country
    AND status               = :ready
    AND payload_version      = :version
    AND claimed_by_club_id  IS NULL
    AND starter_pack_json   IS NOT NULL
  ```
  and the per-tier read filters again on the ROW's own version
  (`WorldPackCacheService::readTier`):
  ```php
  return $row !== null && $row->getPayloadVersion() === WorldInitializationService::WORLD_PACK_VERSION
      ? $row->getPayload()
      : null;
  ```

## 2. Where a v14 row survives the rebuild — and why it is still never served

It survives in exactly one place, by design: **a CLAIMED set**. `deleteUnclaimed()` spares
them, because a device mid-initialisation still has tiers to fetch from its set. Those sets keep
their payload rows at whatever version they were built at, so after the 14 → 15 bump a FINISHED
rebuild genuinely leaves v14 rows in `country_world_pack_cache`. The admin screen lists them
(it badges them `STALE`), and the hourly `app:worldpack:maintain` prunes them once the claim is
older than `StarterConfig::$worldPackClaimedRetentionDays` (default 7 days).

**Those rows are unreachable twice over.** A stale set cannot be claimed (the claim's
`payload_version = :version` above, and `countReadyUnclaimed()` likewise), and even inside a set
a stale ROW is not served (`readTier` returns `null`, and `InitializeController::tier()` then
builds that tier inline at the current version and deliberately does not cache it).

So: the thing the owner saw — v14 rows still present after a rebuild — is real and visible. The
thing it implies — a device being handed v14 content — cannot happen.

The other candidates in the brief were checked and ruled out:

- *A payload keyed in a way the rebuild does not enumerate* — no. Rows are reached only through
  their set (`findForSetAndTier`); the old `(country, tier)` lookup was deleted and the entity
  carries the reason.
- *A rebuild scoped to one country while the app pulls tiers from elsewhere* — no. The app
  fetches tiers for `club.country` only, and `tier()` reads them out of that club's own claimed
  set.
- *A job reporting completion on enqueue* — see §3.
- *A sibling of `3ff5a312`'s dishonest TOP UP* — see §3.

## 3. Is the success message honest?

**The regenerate's own reporting is honest about completion, and was dishonest by omission
about the clear.**

- Honest about completion: the admin JS does not treat the 200 as "done". It polls
  `/admin/worldpack-cache/run-status/{country}` and renders per-tier, per-club progress until
  the run reaches a terminal status, showing `COMPLETED` / `COMPLETED WITH ERRORS` / `FAILED`.
  This is *not* the `3ff5a312` flaw: that was the TOP UP button answering
  `success: true, queued: false, reason: already at target` for a country with nothing
  claimable. The regenerate never claimed work was finished on enqueue.
- Dishonest by omission about the clear: `startRun` called `deleteUnclaimed()` and threw the
  count away, and the response carried nothing about the sets it had spared. An operator who
  presses REGENERATE, watches it go `COMPLETED`, and then sees rows at the old version in the
  table below has been told nothing that distinguishes "spared on purpose, never served" from
  "missed". That is the gap this report's fix closes, and it is the gap that produced *"it is
  disappointing even after rebuilding the cache via the UI, that some v14 elements persisted."*

## 4. The real cause of `MIXED: 14, 15`

App-side, `src/economy/worldPackVersion.ts`. The module keeps an in-memory mirror of the save's
version set:

```ts
let cached: PackVersionState = EMPTY;
```

It is hydrated in exactly one place — `src/db/bootstrap.ts:573`, `await loadPackVersion()`,
which runs once per app boot — and reset in exactly one place, `__resetPackVersionCache()`,
which is a test seam with no production caller (verified: `grep` over `src/` and `app/` finds
only the definition and `__tests__`).

`recordPackVersion` merges into that cache and persists the merged array:

```ts
if (cached.versions.includes(version)) return;
const versions = [...cached.versions, version].sort((a, b) => a - b);
cached = { versions, mixed: versions.length > 1 };
await setStoreState(WORLD_PACK_VERSION_KEY, JSON.stringify(versions));
```

And `Start New Game` (`app/(pre-game)/hub.tsx:65`) does this and only this:

```ts
async function startNewGame() {
  const { token, refreshToken } = useAuthStore.getState();
  await clearAllClubData();
  if (token) useAuthStore.getState().setTokens(token, refreshToken ?? '');
  router.replace('/(pre-game)/setup?mode=newClub' as never);
}
```

`clearAllClubData()` deletes the `store_state` ROW (`DELETE FROM store_state WHERE key NOT IN
(...)`, and `world_pack_version` is not in `STORE_STATE_WIPE_EXCLUSIONS`), but it does **not**
re-run `bootstrap.ts`, so `loadPackVersion()` is not called again, and nothing resets `cached`.

**The sequence, end to end:**

1. App boots with the previous save loaded. `loadPackVersion()` → `cached = { versions: [14] }`.
2. Owner presses Start New Game. The DB row goes; `cached` is still `[14]`.
3. The init loop fetches eight tiers from a backend serving 15 and calls
   `recordPackVersion(15)` per tier (`useInitFlow.ts:1505`).
4. First call merges: `cached = { versions: [14, 15], mixed: true }`, and **writes `[14,15]` into
   the NEW save's `store_state`** — so it persists, and survives a restart.
5. CHECKS reads `packVersionState()` and prints
   `MIXED: 14, 15 — tiers were fetched across a backend deploy`.

The row's own wording is what made it convincing: it describes a real failure mode that did not
occur here. Every tier of that world came from one v15 generation.

**There is a second way in, and it is the same hole.** `loadPackVersion()` hangs off
`loadAllStoresFromSQLite`'s tail, and `SaveGameService`'s load-from-slot path deliberately does
not call that function — its own comment at `src/engine/SaveGameService.ts:871` says so, and
lists two other derived caches that had to be hydrated by hand there for exactly this reason:

```ts
// Derived in-memory caches. These are NOT part of hydrateAllStoresFromSQLite
// — they hang off loadAllStoresFromSQLite's tail, which this path does not
// call, so both were silently skipped on every load-from-slot. The ability
// ceiling one is a pre-existing bug fixed here alongside the new rating
// cache: without it a restored save showed the PREVIOUS game's tier
// ceilings, and therefore the wrong stars, until the next advance.
```

`loadPackVersion()` is a third item on that list and was never added. So **loading a save from
a slot also leaves the previous save's pack versions in memory**, and the next tier fetch merges
into them. Same defect, same path, already diagnosed once for a different cache.

## 5. The backend fix (committed on `development`, NOT pushed, NOT deployed)

Minimal and about truthfulness, not behaviour — the rebuild's mechanics were already correct,
so changing them to fit the report would have been wrong.

- `WorldPackSetService::countClaimed(string $country): int` — new, delegates to
  `WorldPackSetRepository::countByStatus(..., CLAIMED)`.
- `WorldPackGenerationOrchestrator::startRun()` now captures what the clear did and returns
  `clearedSets` and `keptClaimedSets` alongside `run`/`sets`/`requestedSets`, and logs both on
  `world_pack_set.generate.started`.
- `WorldPackController::regenerateCountry()` returns both, plus a `note` naming the current pack
  version and stating that a spared set's rows are never served and are pruned by
  `app:worldpack:maintain`. Purely additive — `success`, `runId`, `requestedSets`,
  `startedSets` and `partial` are unchanged, so no client sees a shape change.
- `templates/admin/worldpack_cache.html.twig` renders the note above the per-tier progress and
  re-emits it on every poll (the panel's `innerHTML` is replaced wholesale each tick, so a note
  appended once would survive exactly until the first poll).
- `tests/Service/WorldPack/WorldPackRegenerateReportTest.php` — new, 2 tests: the run reports
  every unclaimed set it removed and every claimed set it spared (both measured against the DB
  immediately before the call, not assumed), the spared set survives with its old
  `payload_version` intact, and a spared stale set is not claimable.

## 6. How the owner verifies this from the device

The backend change is reporting only, so the device-side check is about the *diagnostic*, not
about the world. **The MIXED row will keep appearing until the app-side cache reset lands**, and
the way to tell it apart from a genuine mixed world is to remove step 1 of §4:

1. **Fully close and relaunch the app** (not background — kill it, so the JS context goes and
   `cached` starts at `EMPTY`).
2. From the hub, start a new England save without loading any existing save first.
3. Debug → CHECKS.

**Expected:** `Pack version: 15` — a single value, no MIXED, no advisory. If it reads `15`
after a cold launch and `MIXED: 14, 15` when a v14 save was loaded first in the same session,
that is this defect, confirmed on the device, and it is the app's cache rather than the backend.

A genuinely mixed world would read MIXED on a cold launch too.

To see the backend change: admin → World Pack Cache → REGENERATE on a country that currently
holds a claimed set. The panel now opens with e.g. *"Cleared 2 unclaimed set(s). Kept 1 claimed
set(s) — … Their payload rows stay in the cache table at the version they were built at and are
NEVER served: the claim and the per-row read both filter on pack version 15."*

## 7. The app's CHECKS panel under a MIXED pack — opinion, NOT implemented

Asked for, so: **yes, with one change to the proposal.**

A world assembled across a version boundary is the state in which every comparator below that
row reports confidently into nonsense — that part of the brief is right, and it is the same
defect class as the five "frozen measurement" entries on the tiers-are-flexible register:
a number measured against something that does not govern it.

But the fix is not "refuse to report under MIXED", because **this incident is a MIXED row that
was wrong**. Refusing would have blanked a whole CHECKS payload that was, in fact, measuring one
coherent generation — a strictly worse outcome than the warning we got. A diagnostic that can
false-positive must not be given a veto.

What I would do instead, in order:

1. **Fix the cause first** — so MIXED means what it says. Two sites, both already known to the
   codebase: call `__resetPackVersionCache()` (promoted out of the test seam) from
   `clearAllClubData()`, beside the `store_state` wipe it already does, AND `await
   loadPackVersion()` in `SaveGameService`'s load-from-slot path, in the same `try` block that
   already hand-hydrates `abilityCeiling` / `playerRatings` / `playerMarketState` for exactly
   this reason. Without this, any gating built on top of MIXED inherits a false positive.
2. **Then** make the row loud rather than advisory — the comparators below it rendered dimmed
   with a single banner, so the numbers are still readable (they are often the evidence someone
   needs) but nobody reads a verdict off them by accident.
3. Leave `worldPackVersionIsAdvisory.test.ts`'s rule intact for *behaviour* — nothing in the
   game should gate on pack version. This is presentation of a diagnostic, which is a different
   question, and the test reads the import graph, so step 2 must be written not to make
   `worldPackDiagnostics.ts` import it.

`src/economy/worldPackDiagnostics.ts` has had three writers this week; step 1 does not touch it
at all, and step 2 touches `checksReport.ts` rather than it. **Not implemented — PM's call.**

## 8. Test run

`lando php vendor/bin/phpunit --no-coverage --colors=never --filter '/^(?!.*AdminShellCoverage).*$/'`
on `development` + this change. Verbatim output: `mixed-pack-phpunit-run.txt` in this folder.

```
Time: 07:37.537, Memory: 931.50 MB

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
Tests: 3316, Assertions: 162244, Failures: 3, PHPUnit Deprecations: 1, PHPUnit Notices: 21, Skipped: 13.
```

**All three match the documented baseline by name** —
`.context/stages/01_overview/output/environment.md`'s "Known test failures": #1
`NotificationLogCrudControllerTest`, #2 `CompetitionControllerTest`'s narrative timeline, #3
`FriendlyResolveSingleMatchTest`, all three "empty content table". #4
(`NpcClubForeignClubsCitySizeTest`) and #5 (`NpcClubPlaceWeightingTest`) are the two
composition-dependent ones that come and go; neither appeared in this run, which is why the
baseline is stated as a range of three to five rather than a number. **Three is the bottom of
that range, so this run is clean against it.**

The two new tests in `WorldPackRegenerateReportTest` are in the 3,316. Run on their own
alongside the rest of the world-pack suite:

```
PHPUnit 13.4.3 by Sebastian Bergmann and contributors.
Runtime:       PHP 8.5.7
Configuration: /app/phpunit.dist.xml

.....................                                             21 / 21 (100%)

Time: 00:17.223, Memory: 159.00 MB

OK (21 tests, 115 assertions)
```

`lando php bin/console lint:container` and `lint:twig` on the edited template both pass.
