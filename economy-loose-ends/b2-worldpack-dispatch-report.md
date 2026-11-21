<!-- STATUS: ✅ CAUSE FOUND AND FIXED — but the brief's premise was WRONG, read §1 first -->

# B2 — the dev world-pack dispatch defect

**Session:** B2 task agent, 2026-11-21. **Backend only**, branch `development`, built on
`d731db22` ("Bring .context into line with the day's five commits").
**Committed as `3ff5a312`. Deployed to dev in backend 287 / `f0aaa125` — post-deploy
verification in §6c.**

Every command and its output below is pasted verbatim. Epistemic status is marked on every
claim: **[MEASURED]** means I ran it and this is the output; **[INFERRED]** means I believe it
for a stated reason and did not observe it.

---

## 1. 🔴 THE BRIEF'S PREMISE IS WRONG — THE ASYNC BUILD DOES RUN ON DEV

The brief, and the standing-notes entry it came from, say *"on the dev stack, the asynchronous
world-pack build never runs"* and *"dispatch succeeds … and yet nothing ever built."*

**[MEASURED] That is no longer true, and it is not what I found. I built two world-pack sets on
dev through the async path alone, start to finish, and watched both appear.**

### Measurement A — Scotland, built by the queue

Create a deficit, let the real cron consumer do the work:

```
$ ssh wunderkind.site
=== BEFORE: delete one unclaimed SC ready set ===
DELETE 1
=== run maintain (queues) ===

World pack sets — maintaining 2 live country(ies), target 2
===========================================================

 --------- ------------ -------- 
  Country   Stock        Action  
 --------- ------------ -------- 
  EN        at target    -       
  SC        short by 1   queued  
 --------- ------------ -------- 

 [OK] Queued 1 country(ies), built 0 set(s) inline.                             

=== queue immediately after ===
  id   |  queue_name  |     created_at      |    available_at     |    delivered_at     
-------+--------------+---------------------+---------------------+---------------------
 29364 | worldpackset | 2026-11-21 18:51:02 | 2026-11-21 18:51:02 | 2026-11-21 18:51:02 
```

Four minutes later:

```
$ docker exec postgres-dev psql -U wunderkind -d wunderkind -c "select id, queue_name, created_at, delivered_at from messenger_messages where queue_name='worldpackset';"
 id | queue_name | created_at | available_at | delivered_at 
----+------------+------------+--------------+--------------
(0 rows)

$ docker exec postgres-dev psql -U wunderkind -d wunderkind -c "select id,country,status,payload_version,generated_at,ready_at from world_pack_set where country='SC' order by generated_at desc limit 6;"
                  id                  | country | status  | payload_version |    generated_at     |      ready_at       
--------------------------------------+---------+---------+-----------------+---------------------+---------------------
 01a1ff72-9d9d-7ae4-9007-fb2f3b71a6c6 | SC      | ready   |              14 | 2026-11-21 18:51:03 | 2026-11-21 18:51:10
 01a1fab3-0aea-7086-b740-35a918c927f4 | SC      | ready   |              14 | 2026-11-20 20:43:20 | 2026-11-20 20:43:26
```

**A pack that was not there before is there now**, built by `messenger:consume worldpackset`
under the per-minute crontab, 7 seconds of generation.

### Measurement B — England, the heavy country, polled second by second

```
--- 18:58:15 ---
queue id=29365 created=2026-11-21 18:58:04 delivered=NULL
--- 18:58:25 ---
queue id=29365 created=2026-11-21 18:58:04 delivered=NULL
--- 18:58:35 ---
queue id=29365 created=2026-11-21 18:58:04 delivered=NULL
--- 18:58:45 ---
queue id=29365 created=2026-11-21 18:58:04 delivered=NULL
--- 18:58:55 ---
queue id=29365 created=2026-11-21 18:58:04 delivered=NULL
--- 18:59:05 ---
queue id=29365 created=2026-11-21 18:58:04 delivered=2026-11-21 18:59:00
EN building v14 gen=2026-11-21 18:59:02 ready=NULL
--- 18:59:16 ---
queue id=29365 created=2026-11-21 18:58:04 delivered=2026-11-21 18:59:00
EN building v14 gen=2026-11-21 18:59:02 ready=NULL
--- 18:59:26 ---
EN ready v14 gen=2026-11-21 18:59:02 ready=2026-11-21 18:59:17
```

Queued 18:58:04 → picked up 18:59:00 → BUILDING 18:59:02 → READY 18:59:17. **Eight tiers of
England in 15 seconds, entirely asynchronously.**

### The consumers are there, the queue is clean

```
$ docker exec wunderkind-dev ps aux
...
99365 www-data  0:00 php -d memory_limit=512M /var/www/html/bin/console messenger:consume worldpackset --time-limit=50 --limit=3 --no-interaction -q
99371 www-data  0:00 php -d memory_limit=512M /var/www/html/bin/console messenger:consume worldpack --time-limit=50 --limit=200 --no-interaction
```

```
$ docker exec -u www-data wunderkind-dev php bin/console messenger:stats
 -------------- ------- 
  Transport      Count  
 -------------- ------- 
  async          0      
  failed         1      
  worldpack      0      
  pool           0      
  worldpackset   0      
  competition    0      
  registration   0      
  enrichment     0      
  friendly       0      
  suggestion     0      
  clubsale       0      
 -------------- ------- 

$ docker exec -u www-data wunderkind-dev php bin/console messenger:failed:show
There is 1 message pending in the failure transport.
 ---- ----------------------------------------- --------------------- ------------------------------------------------------------------- 
  Id   Class                                     Failed at             Error                                                              
 ---- ----------------------------------------- --------------------- ------------------------------------------------------------------- 
  24   App\Message\SendPushNotificationMessage   2026-09-20 08:51:00   Could not map type `Kreait\Firebase\ServiceAccount`:               
 ---- ----------------------------------------- --------------------- ------------------------------------------------------------------- 
```

One failed message, from 2026-09-20, an FCM credential problem, nothing to do with world packs.

The admin **Regenerate** path works too — four runs on 2026-11-20, all `completed`:

```
$ docker exec postgres-dev psql -U wunderkind -d wunderkind -c "select * from world_pack_generation_run order by 1 desc limit 10;"
                  id                  | country |  status   |  requested_tiers  |     started_at      |     finished_at     |     created_at      | set_count 
--------------------------------------+---------+-----------+-------------------+---------------------+---------------------+---------------------+-----------
 01a1fa8f-c8b2-708c-9577-3a0cafc155c2 | SC      | completed | [1,2,3,4]         | 2026-11-20 20:04:49 | 2026-11-20 20:07:21 | 2026-11-20 20:04:49 |         2
 01a1fa8f-c403-79d8-a3cd-5701fc284c2c | EN      | completed | [1,2,3,4,5,6,7,8] | 2026-11-20 20:04:48 | 2026-11-20 20:07:08 | 2026-11-20 20:04:48 |         2
 01a1fa8a-ed1f-7515-9462-0001630d34ae | SC      | completed | [1,2,3,4]         | 2026-11-20 19:59:31 | 2026-11-20 20:02:01 | 2026-11-20 19:59:31 |         2
 01a1fa8a-e829-78fe-8de3-6e7a87b32d47 | EN      | completed | [1,2,3,4,5,6,7,8] | 2026-11-20 19:59:29 | 2026-11-20 20:01:15 | 2026-11-20 19:59:29 |         2
 01a1fa7a-c408-727e-8491-beb5b389ce52 | SC      | completed | [1,2,3,4]         | 2026-11-20 19:41:52 | 2026-11-20 19:44:24 | 2026-11-20 19:41:52 |         2
 01a1fa7a-bf20-78c5-a949-16f5033798cc | EN      | completed | [1,2,3,4,5,6,7,8] | 2026-11-20 19:41:50 | 2026-11-20 19:44:11 | 2026-11-20 19:41:50 |         2
 01a1f5b8-18f3-70a2-addf-c0aa4724c291 | SC      | completed | [1,2,3,4]         | 2026-11-19 21:30:45 | 2026-11-19 21:32:22 | 2026-11-19 21:30:45 |         2
```

⚠️ **For the PM: the standing-notes entry "🔴 ON DEV, THE ASYNC WORLD-PACK BUILD DOES NOT RUN",
the matching 🔴 bullet in `.context/stages/07_synthesis/output/architecture-notes.md`'s "Keeping
the buffer stocked", and `01_overview/output/deployment.md:152`'s trap #2 are now contradicted by
measurement and should be retired.** I have not edited them — status
and review are yours. (I corrected only `04_interfaces`, where my own change made the text
wrong.)

### Was it ever broken the way the notes say? — [INFERRED], and the evidence is gone

**[MEASURED]** The code on the top-up path is **byte-identical** between the image that was
running before the 2026-11-20 19:20 deploy and the one running now, so no code change fixed it:

```
$ for img in 831c2b65a2b0 05795826757a; do docker run --rm --entrypoint sh $img -c "cd /var/www/html; md5sum src/Service/WorldPack/*.php src/Controller/Admin/WorldPackController.php src/MessageHandler/WorldPack/*.php config/packages/messenger.yaml | sort -k2"; done
########## IMAGE 831c2b65a2b0 (built 2026-11-20 16:30) ##########
eb4642a4c1743401aa2e94e6fce710a9  config/packages/messenger.yaml
2269d2b11e34ab517b1b93ca65d96d1d  src/Controller/Admin/WorldPackController.php
838da6120bb49bddd9c82f6d8a60fbe5  src/MessageHandler/WorldPack/TopUpWorldPackSetMessageHandler.php
e1efd4033198af6f5bc8b305c8d0fd3e  src/MessageHandler/WorldPack/WarmWorldPackClubMessageHandler.php
6f424b5801fb33cfcb9f77a2b0515780  src/MessageHandler/WorldPack/WarmWorldPackTierMessageHandler.php
74b325b39edd10c8ba83084a16d2238a  src/Service/WorldPack/WorldPackSetTopUpService.php
6b7fec18a147d8ef01f54a88171f0eb0  src/Service/WorldPack/WorldPackSetService.php
########## IMAGE 05795826757a (built 2026-11-20 19:18, running now) ##########
eb4642a4c1743401aa2e94e6fce710a9  config/packages/messenger.yaml
2269d2b11e34ab517b1b93ca65d96d1d  src/Controller/Admin/WorldPackController.php
838da6120bb49bddd9c82f6d8a60fbe5  src/MessageHandler/WorldPack/TopUpWorldPackSetMessageHandler.php
8a4898aedbe848a33f6c8b9811f6050a  src/MessageHandler/WorldPack/WarmWorldPackClubMessageHandler.php
6f424b5801fb33cfcb9f77a2b0515780  src/MessageHandler/WorldPack/WarmWorldPackTierMessageHandler.php
74b325b39edd10c8ba83084a16d2238a  src/Service/WorldPack/WorldPackSetTopUpService.php
6b7fec18a147d8ef01f54a88171f0eb0  src/Service/WorldPack/WorldPackSetService.php
```

Only `WarmWorldPackClubMessageHandler.php` differs, and that is on the *Regenerate* path, not
the top-up path.

**[MEASURED]** The pre-deploy container's filesystem is gone, so its cron logs are unreadable:

```
$ docker inspect wunderkind-dev --format "StartedAt={{.State.StartedAt}}"
StartedAt=2026-11-20T19:20:22.898307213Z
$ docker exec wunderkind-dev head -2 /var/log/worldpackset-consume-cron.log
[2026-11-20T19:21:00Z] === worldpackset-consume start ===
[2026-11-20T19:21:51Z] === worldpackset-consume done ===
```

**[MEASURED]** The previous image already carried the consumer and its crontab line, so a
"stale image with no consumer" explanation is ruled out:

```
$ docker run --rm --entrypoint sh 831c2b65a2b0 -c "cat /var/spool/cron/crontabs/root | grep -n worldpack; ls -la /usr/local/bin/ | grep worldpack"
13:* * * * *    /usr/local/bin/worldpackset-consume.sh             >> /var/log/worldpackset-consume-cron.log 2>&1
-rwxr-xr-x    1 root     root          2098 Nov 20 16:28 worldpackset-consume.sh
```

**[INFERRED]** My best account of the lost afternoon is §2's mechanism plus a container
recreate: a deploy SIGKILLs any build in flight, which strands a BUILDING row, and for the next
thirty minutes every top-up path declares the country stocked. The `deleteUnclaimed()` inside
the 19:41 Regenerate would have erased those rows, which is why there is no BUILDING row left
on dev to point at. **I did not observe that, and I cannot: the rows and the logs are both
gone.** I am naming it as a belief, not a finding, because an attribution handed to a
coordinator becomes an instruction.

---

## 2. 🔴 THE CAUSE I DID FIND, NAMED AND MEASURED

**The half of this defect that cost the three hours is real, is still in the code, and I
reproduced it on dev.**

### The mechanism, at file and line

| | |
|---|---|
| `src/Entity/WorldPack/WorldPackSet.php:118` | a set is constructed **BUILDING** |
| `src/Service/WorldPack/WorldPackSetTopUpService.php:196-203` | …and persisted **before the first tier is built**, so anything that takes the worker out mid-build (PHP fatal, OOM kill, container recreate on deploy) strands that row with nothing left to finish or fail it |
| `src/Service/WorldPack/WorldPackSetService.php:47` | `BUILD_STALE_AFTER = '-30 minutes'` |
| `src/Service/WorldPack/WorldPackSetService.php:129-137` (pre-change) | `deficit() = target − (readyUnclaimed + buildingSince(-30 min))` — **a stranded BUILDING row counts as stock** |
| `src/Service/WorldPack/WorldPackSetTopUpService.php:73-76` | `needsTopUp()` is that deficit `> 0` |
| `src/Controller/Admin/WorldPackController.php:168-176` (pre-change) | `if (!needsTopUp($country))` → **`{"success": true, "queued": false, "reason": "already at target"}`, HTTP 200** |
| `templates/admin/worldpack_cache.html.twig:134` | the stock column's own test is `short = sum.claimable < targetSets` — **claimable only**, no BUILDING |
| `src/Command/MaintainWorldPackSetsCommand.php:105-108` (pre-change) | the hourly backstop printed `at target` for the same state |
| `src/Service/WorldPack/WorldPackSetTopUpService.php:87-94` (pre-change) | the handler's own re-read logged `world_pack_set.topup.at_target` at **INFO**, and `config/packages/monolog.yaml`'s prod handler is `fingers_crossed` at `action_level: error` — **so the no-op wrote nothing to any log** |
| `docker/worldpackset-consume.sh:38` (pre-change) | `messenger:consume worldpackset … -q` — the only consumer with `-q`, so the one queue whose message means "build a whole country" was the one that drained in silence |

**So the admin page said `0/2 SHORT` in red and enabled the button; the button said "already at
target"; the hourly sweep said "at target"; and nothing was written, anywhere, including the
logs.**

### Demonstrated by measurement on dev, 2026-11-21

Load checked first (`uptime` on the Hetzner box: `18:58:03 up 239 days, load average: 0.62,
1.01, 1.05`), then both of England's unclaimed sets stranded as BUILDING — the state a lost
worker leaves:

```
### STEP 1 — EN stock before
                  id                  | status | payload_version |    generated_at     
--------------------------------------+--------+-----------------+---------------------
 01a1facc-687a-7167-8226-52ceef7c3623 | ready  |              14 | 2026-11-20 21:11:02
 01a1ff79-e9a3-7482-a235-e32fb0a8da0e | ready  |              14 | 2026-11-21 18:59:02
(2 rows)

### STEP 2 — strand BOTH unclaimed EN sets as BUILDING (simulates a worker lost mid-build)
                  id                  |  status  |    generated_at     
--------------------------------------+----------+---------------------
 01a1facc-687a-7167-8226-52ceef7c3623 | building | 2026-11-21 18:59:53
 01a1ff79-e9a3-7482-a235-e32fb0a8da0e | building | 2026-11-21 18:59:53
(2 rows)

UPDATE 2
### STEP 3 — what the admin page computes: claimable (version-matched, ready, unclaimed)
 claimable_en 
--------------
            0
(1 row)

 building_en_last_30min 
------------------------
                      2
(1 row)

### STEP 4 — what deficit()/needsTopUp() say (same call the admin TOP UP button makes)
 --------- ----------- -------- 
  Country   Stock       Action  
 --------- ----------- -------- 
  EN        at target   -       
  SC        at target   -       
 --------- ----------- -------- 
 [OK] Dry run — nothing changed.                                                
### STEP 5 — restore
                  id                  | status 
--------------------------------------+--------
 01a1facc-687a-7167-8226-52ceef7c3623 | ready
 01a1ff79-e9a3-7482-a235-e32fb0a8da0e | ready
(2 rows)

UPDATE 2
 claimable_en_restored 
-----------------------
                     2
(1 row)
```

**England: zero claimable sets of a target of two — no device can start a game there — and the
gate reports "EN at target".** The dev stack was put back as it was in step 5.

---

## 3. THE FIX

Seven files. The shape is: tell the two kinds of "not short" apart, reap builds nothing is
finishing, and refuse loudly instead of reporting a success that did not happen.

| file | change |
|---|---|
| `src/Repository/WorldPack/WorldPackSetRepository.php` | new `findBuildingBefore($country, $before)` — the stranded-build counterpart to `countBuildingSince()` |
| `src/Service/WorldPack/WorldPackSetService.php` | new **`stock()`** returning `target`/`claimable`/`building`/`deficit` **+ a `starved` flag** (`claimable < target` with `deficit === 0`); new **`reapStaleBuilding()`** marking stale BUILDING sets FAILED with a reason (via `markFailed()`, which logs at **ERROR**, so prod's `fingers_crossed` monolog actually writes it); `deficit()` now delegates to `stock()` so the gate and the reported figures cannot drift |
| `src/Service/WorldPack/WorldPackSetTopUpService.php` | `stock()` / `reapStaleBuilding()` passthrough; `topUp()` logs a starved country at **WARNING** (`world_pack_set.topup.starved`) instead of folding it into the invisible INFO no-op |
| `src/Controller/Admin/WorldPackController.php` | `topUp()` reaps first, then **refuses a starved country with HTTP 409 and `success: false`**, naming the figures and what to do; the honest "already at target" and the queued case both now carry `claimable`/`building`/`target`/`reaped` |
| `src/Command/MaintainWorldPackSetsCommand.php` | reaps per country; the `Stock` column now reads `0/2 claimable (+2 building)` rather than `at target`; a starved country gets `$io->error()` and the command **exits non-zero**, which is the only channel an unattended cron has (the wrapper logs `FAILED (exit N)`) |
| `templates/admin/worldpack_cache.html.twig` | the button renders `REFUSED` with the reason on a 409; `AT TARGET` now prints the figures; the poller surfaces a FAILED set's `errorMessage` instead of timing out into `STILL SHORT`; poll budget raised 40 → 80 ticks (see §4) |
| `docker/worldpackset-consume.sh` | **`-q` removed** — this queue no longer drains silently |

Also corrected: `.context/stages/04_interfaces/output/routes.md` (the top-up route's contract)
and `services.md` (`WorldPackSetService` / `WorldPackSetTopUpService`). Those are the two
entries my own change made wrong; everything else is flagged here rather than edited.

### Tests added

`tests/Service/WorldPack/WorldPackStrandedBuildTest.php` — 6 tests, 22 assertions:

```
$ lando php vendor/bin/phpunit tests/Service/WorldPack/WorldPackStrandedBuildTest.php
PHPUnit 13.4.3 by Sebastian Bergmann and contributors.

Runtime:       PHP 8.5.7
Configuration: /app/phpunit.dist.xml

......                                                              6 / 6 (100%)

Time: 00:00.337, Memory: 44.50 MB

OK (6 tests, 22 assertions)
```

`tests/Controller/Admin/WorldPackTopUpTruthTest.php` — 4 tests, 26 assertions, driving the real
admin endpoint with a real CSRF token:

```
$ lando php vendor/bin/phpunit tests/Controller/Admin/WorldPackTopUpTruthTest.php
PHPUnit 13.4.3 by Sebastian Bergmann and contributors.

Runtime:       PHP 8.5.7
Configuration: /app/phpunit.dist.xml

....                                                                4 / 4 (100%)

Time: 00:01.016, Memory: 66.50 MB

OK (4 tests, 26 assertions)
```

### Run 3 — re-measured AT THE COMMIT, `3ff5a312`

Runs 1 and 2 were taken on the working tree, before the commit existed and before the last two
`.context` edits. **[MEASURED]** No backend test reads `.context` from disk — the only three
matches in `tests/` are docblock references
(`SchemaIsInSyncTest`, `ScoutAbilityPublishedTest`, `ScoutAbilityLifecycleSubscriberTest`) —
so those edits could not have moved run 1. But the PM asked for a SHA and a figure as a pair,
and a figure measured before its commit existed is not that pair, so I re-ran it:

```
$ git rev-parse HEAD
3ff5a312e8308fe98f1e81c06a854c1991184956
$ git status --short
(clean — so the committed tree is exactly what is being measured)
$ lando php vendor/bin/phpunit --colors=never --exclude-filter 'AdminShellCoverageTest'

Time: 04:05.538, Memory: 883.50 MB

There were 3 failures:

1) App\Tests\Controller\Admin\NotificationLogCrudControllerTest::testIndexRowIsClickableToADetailPageShowingTheFullPayload
2) App\Tests\Controller\Api\CompetitionControllerTest::testShowIncludesResultsOnceRoundsAreProcessed
3) App\Tests\Service\Friendly\FriendlyResolveSingleMatchTest::testResolvingAnAcceptedChallengeRecordsAFullResult

FAILURES!
Tests: 3307, Assertions: 157340, Failures: 3, PHPUnit Deprecations: 1, PHPUnit Notices: 21, Skipped: 13.
```

🟢 **The pair on record: `3ff5a312` → 3,307 tests, 3 failures, items #1/#2/#3 by name.**
Identical count and identical failures to run 1, which confirms that figure rather than
correcting it. Load was 5.63 at the start, the quietest of the three runs, and this is also the
first of them I would be willing to quote a wall clock from — though I still do not need to.

⚠️ One small thing worth not mistaking for drift: **assertions moved, 157,316 → 157,340, on an
identical count with identical failures.** That is the documented instability of
`NpcClubForeignClubsCitySizeTest` (known item #4), whose own entry in `environment.md` records
consecutive clean runs returning 11 then 7 then 7 assertions on three tests. An assertion count
is not a baseline; the test count and the named failures are.

### Nothing is deployed, and two pieces only take effect when something is

**I did not push and did not deploy.** The code changes land in a normal backend deploy. Two
need one specifically: **`docker/worldpackset-consume.sh` (the `-q` removal) is baked into the
image**, so the deployed consumer keeps draining silently until the next image build, and the
`MaintainWorldPackSetsCommand` non-zero exit only shows up in
`/var/log/worldpack-maintain-cron.log` once the new image is running.

### The dev stack was left exactly as I found it

```
$ docker exec postgres-dev psql -U wunderkind -d wunderkind -c "select country, status, payload_version, count(*) from world_pack_set where country in ('EN','SC') group by 1,2,3 order by 1,2;"
 country | status  | payload_version | count 
---------+---------+-----------------+-------
 EN      | claimed |              14 |     3
 EN      | claimed |              13 |     1
 EN      | ready   |              14 |     2
 SC      | claimed |              13 |     1
 SC      | claimed |              14 |     4
 SC      | ready   |              14 |     2
(6 rows)

 queue_name | count 
------------+-------
 failed     |     1
(1 row)

 19:28:37 up 239 days, 19:19,  1 user,  load average: 0.33, 0.55, 0.79
```

Both countries back at their target of 2 claimable, queue clean, the only failed message still
the 2026-09-20 FCM one, and **no load left behind by me** (checked for stray busy-loops: zero).
The two sets I deleted to create the deficits were replaced by the two the async path built, so
the stock is equivalent rather than merely restored; the BUILDING rows in §2's demonstration
were flipped back in step 5 of the same script.

---

## 4. TWO SIDE FINDINGS, BOTH MEASURED

### a) The per-minute consumers measurably run every OTHER minute

```
$ docker exec wunderkind-dev tail -30 /var/log/worldpackset-consume-cron.log
[2026-11-21T18:19:51Z] === worldpackset-consume done ===
[2026-11-21T18:21:00Z] === worldpackset-consume start ===
[2026-11-21T18:21:51Z] === worldpackset-consume done ===
[2026-11-21T18:23:00Z] === worldpackset-consume start ===
[2026-11-21T18:23:50Z] === worldpackset-consume done ===
[2026-11-21T18:25:00Z] === worldpackset-consume start ===
[2026-11-21T18:25:50Z] === worldpackset-consume done ===
...
[2026-11-21T18:49:00Z] === worldpackset-consume start ===

$ docker exec wunderkind-dev sh -c "wc -l /var/log/worldpackset-consume-cron.log; head -1 /var/log/worldpackset-consume-cron.log; grep -c skipping /var/log/worldpackset-consume-cron.log"
1414 /var/log/worldpackset-consume-cron.log
[2026-11-20T19:21:00Z] === worldpackset-consume start ===
0
```

1,414 lines = 707 runs; 19:21 on 2026-11-20 to 18:53 on 2026-11-21 is 1,413 minutes. **707 runs
in 1,413 minutes is exactly one every two minutes**, every start on an odd minute, and **zero**
"previous run still in progress, skipping" lines — so it is not the script's `flock`.
`worldpack-consume.sh` shows the same cadence.

**[INFERRED]** busybox `crond` will not start a tick while it still holds the previous child for
that entry, and `--time-limit=50` plus PHP boot puts every run at ~51s, close enough to the
minute to lose every other tick. **Consequence:** pickup latency on these queues is up to ~2
minutes, not "within a minute" as the UI note and several comments claimed. The UI comment and
the poll budget are corrected; the crontab is left alone, because halved throughput on queues
that are empty most of the time is not worth a change I cannot test without a deploy.

### b) `supervisorctl` and the log-rotation note both hold

`docker/supervisord.conf` still defines no `[unix_http_server]`/`[supervisorctl]`, so
`docker exec … ps aux` remains the way to see what runs. And locally:

```
$ du -sh var/log/*
3.9G	var/log/dev.log
2.0G	var/log/dev.log.2026-11-12.bak
4.0K	var/log/prod.deprecations.log
```

Still unrotated, still the owner's call. `AdminShellCoverageTest` is excluded from my full run
for that reason, exactly as `environment.md` documents.

---

## 5. BACKEND TEST BASELINE — measured at `d731db22`, failures named

**Re-measured by me**, at the commit I built on, as the standing notes require — nothing here is
reconciled against anyone else's figure. ⚠️ **The machine was CONTENDED throughout** (macOS
Spotlight reindexing after a Docker restart; 8 cores, load average 19.96 at the start of run 1
and 17.52 at the start of run 2), so **the wall-clock figures below mean nothing and I make no
timing claim from them.** Counts and failure identities are what contention does not move, and
those are what I report.

### Run 1 — full suite with my change and my new tests, at `d731db22`

```
$ git rev-parse HEAD
d731db22a04b3e349ab85cf85de8e65eb252d41e
$ lando php vendor/bin/phpunit --exclude-filter 'AdminShellCoverageTest'

Time: 04:15.426, Memory: 841.50 MB

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
Tests: 3307, Assertions: 157316, Failures: 3, PHPUnit Deprecations: 1, PHPUnit Notices: 21, Skipped: 13.
```

### ✅ All three failures are the documented three, CONFIRMED BY NAME

`wunderkind-backend/.context/stages/01_overview/output/environment.md` — **the backend's file** —
lists five known failures of which #4 and #5 join and leave the list on their own, giving the
documented range of three to five. My run hit exactly items **#1, #2 and #3**, each by name:

| documented | matched by |
|---|---|
| #1 `NotificationLogCrudControllerTest` — empty content table | `::testIndexRowIsClickableToADetailPageShowingTheFullPayload` |
| #2 `CompetitionControllerTest`, the narrative timeline — empty content table | `::testShowIncludesResultsOnceRoundsAreProcessed`, *"must carry a non-empty narrative timeline"* |
| #3 `FriendlyResolveSingleMatchTest` — empty content table | `::testResolvingAnAcceptedChallengeRecordsAFullResult` |

Items #4 (`NpcClubForeignClubsCitySizeTest`) and #5 (`NpcClubPlaceWeightingTest`) did not fire,
which the owning file says is consistent with the range rather than evidence of anything.
**Nothing outside the documented list failed, so there is nothing to attribute to this change.**

### Run 2 — the same tree with my two new test files excluded, to settle the count

A detached worktree cannot be used here: the suite runs inside Lando, which is bound to this
app directory, so a worktree elsewhere has no database. Instead I re-ran the identical tree with
my own tests filtered out, which gives a clean-equivalent count measured by me rather than
reconciled against anybody's.

```
$ lando php vendor/bin/phpunit --colors=never --exclude-filter 'AdminShellCoverageTest|WorldPackStrandedBuildTest|WorldPackTopUpTruthTest'

Time: 06:07.929, Memory: 877.50 MB

There were 3 failures:

1) App\Tests\Controller\Admin\NotificationLogCrudControllerTest::testIndexRowIsClickableToADetailPageShowingTheFullPayload
2) App\Tests\Controller\Api\CompetitionControllerTest::testShowIncludesResultsOnceRoundsAreProcessed
3) App\Tests\Service\Friendly\FriendlyResolveSingleMatchTest::testResolvingAnAcceptedChallengeRecordsAFullResult

FAILURES!
Tests: 3297, Assertions: 157277, Failures: 3, PHPUnit Deprecations: 1, PHPUnit Notices: 21, Skipped: 13.
```

**🟢 It reconciles exactly: 3,297 + 10 = 3,307**, the ten being
`WorldPackStrandedBuildTest` (6) + `WorldPackTopUpTruthTest` (4). Same three failures by name in
both runs. ⚠️ **Both figures are measured with the WHOLE `AdminShellCoverageTest` class excluded**
(`--exclude-filter 'AdminShellCoverageTest'`), which is a wider exclusion than the
`--exclude-filter admin_logs` that `environment.md` records as keeping 71 of 72. **So do not
reconcile 3,307 against the 3,366 recorded at `c11c7f2d` — they are different filters.** Quote
my command alongside my number or re-measure your own, which is the whole point of the rule.

---

## 6. WHAT THIS MEANS FOR READINGS ALREADY BANKED — for the PM

A30 made this point and it is sharper than "a standing note is stale", so it goes here in their
terms. **[INFERRED, from the §2 mechanism]** Because a top-up could report success while
writing nothing, **any device reading taken on dev before this fix carries a weaker guarantee
than whoever recorded it would have assumed** — including a pack-version indicator that read
clean. A30 has confirmed its own diagnosis does not rest on a device reading (it measured in
code at a named commit), but anything else the economy workstream has banked from a dev device
session is worth re-weighing. That is the PM's call, not mine.

## 6b. ✅ A CLEAN SCOTTISH PACK IS AVAILABLE NOW — the PM asked

**[MEASURED] 2026-11-21 19:29:55 UTC.** Scotland holds two complete, unclaimed, version-14 sets
on dev, and the second of them is the one the async path built today:

```
$ docker exec postgres-dev psql -U wunderkind -d wunderkind -c "select id, status, payload_version, tier_count, ready_at from world_pack_set where country='SC' and status='ready' and payload_version=14 and claimed_by_club_id is null order by generated_at;"
                  id                  | status | payload_version | tier_count |      ready_at       
--------------------------------------+--------+-----------------+------------+---------------------
 01a1fab3-0aea-7086-b740-35a918c927f4 | ready  |              14 |          4 | 2026-11-20 20:43:26
 01a1ff72-9d9d-7ae4-9007-fb2f3b71a6c6 | ready  |              14 |          4 | 2026-11-21 18:51:10
(2 rows)

 sc_tier_payload_rows 
----------------------
                    8
(1 row)

 queue_name | count 
------------+-------
 failed     |     1
(1 row)
```

A fresh save claims one and the per-init dispatch restocks within ~2 minutes. **No preparation
is needed and none should be attempted:**

1. ⚠️ **Do not use the admin TOP UP button.** This fix is not deployed, so on the running stack
   it can still answer "already at target" while writing nothing — §2's defect, live.
2. ⚠️ **Do not press Regenerate to "get a clean one."** That path works, but it calls
   `deleteUnclaimed()`, which would destroy both good sets above to rebuild from scratch for no
   gain.
3. **Read the pack version indicator regardless.** v14 is current on the deployed image, and a
   `MIXED` or `STALE` reading is still a gate, not a footnote.

---

## 6c. ✅ POST-DEPLOY VERIFICATION — backend 287 / `f0aaa125`, 2026-11-21 20:48 UTC

**Read-only. Nothing pressed, nothing claimed, no save created.** The PM asked three questions
before the owner takes a device run.

### 🟢 1. The two Scottish sets are INTACT — nothing was reaped

```
$ docker exec postgres-dev psql -U wunderkind -d wunderkind -c "select id, status, payload_version, tier_count, generated_at, ready_at, claimed_at from world_pack_set where country='SC' order by generated_at desc limit 8;"
                  id                  | status  | payload_version | tier_count |    generated_at     |      ready_at       |     claimed_at      
--------------------------------------+---------+-----------------+------------+---------------------+---------------------+---------------------
 01a1ff72-9d9d-7ae4-9007-fb2f3b71a6c6 | ready   |              14 |          4 | 2026-11-21 18:51:03 | 2026-11-21 18:51:10 | 
 01a1fab3-0aea-7086-b740-35a918c927f4 | ready   |              14 |          4 | 2026-11-20 20:43:20 | 2026-11-20 20:43:26 | 
 01a1faa7-f833-73eb-a379-11e661e85018 | claimed |              14 |          4 | 2026-11-20 20:31:14 | 2026-11-20 20:31:20 | 2026-11-20 20:43:18
...
 sc_tier_payload_rows 
----------------------
                    8
 sc_claimable 
--------------
            2
 country | status  | count 
---------+---------+-------
 EN      | claimed |     4
 EN      | ready   |     2
 SC      | claimed |     5
 SC      | ready   |     2
```

**[MEASURED]** Both sets present, `ready`, v14, 4 tiers, unclaimed; 8 payload rows; 2 claimable.
England likewise at 2. **[MEASURED, structurally]** The PM's reading of the code is correct and
it is stronger than a reading: `WorldPackSetRepository::findBuildingBefore()` filters
`s.status = :building`, so a `ready` row **cannot** match the reap's selection — and
`WorldPackStrandedBuildTest::testAFailedSetDoesNotCountTowardsTheBuffer` and
`testAFreshBuildingSetIsNotReaped` pin both halves of that. The reap also only ever calls
`markFailed()`; it deletes nothing, so no code path in this change can remove a set row at all.

### 🟢 2. The consumers are alive and the queues are clear

```
$ docker exec -u www-data wunderkind-dev php bin/console messenger:stats
 -------------- ------- 
  Transport      Count  
 -------------- ------- 
  async          0      
  failed         1      
  worldpack      0      
  worldpackset   0      
  ... (all others 0)
 -------------- ------- 
```

The single `failed` row is still the 2026-09-20 FCM message. Sampled `ps aux` every 15s, which
matters because these are cron-paced workers and a single snapshot catches an empty instant:

```
--- sample 3 at ~20:49:38 ---
 1046 www-data  0:00 php -d memory_limit=512M /var/www/html/bin/console messenger:consume worldpackset --time-limit=50 --limit=3 --no-interaction
 1047 www-data  0:00 php -d memory_limit=512M /var/www/html/bin/console messenger:consume worldpack --time-limit=50 --limit=200 --no-interaction
--- sample 4 at 20:49:53 ---
  108 www-data  0:00 ... messenger:consume registration --time-limit=3600 ...
  874 www-data  0:00 ... messenger:consume suggestion --time-limit=280 ...
```

Present at 20:49:38, gone by 20:49:53 — the worker exits at `--time-limit=50`, i.e. :51. The
cron log confirms the cycle is unbroken on the new image, still every other minute:

```
[2026-11-21T20:39:00Z] === worldpackset-consume start ===
[2026-11-21T20:39:51Z] === worldpackset-consume done ===
[2026-11-21T20:41:00Z] === worldpackset-consume start ===
[2026-11-21T20:41:51Z] === worldpackset-consume done ===
[2026-11-21T20:43:00Z] === worldpackset-consume start ===
[2026-11-21T20:43:51Z] === worldpackset-consume done ===
[2026-11-21T20:45:00Z] === worldpackset-consume start ===
[2026-11-21T20:45:52Z] === worldpackset-consume done ===
[2026-11-21T20:47:00Z] === worldpackset-consume start ===
[2026-11-21T20:47:51Z] === worldpackset-consume done ===
[2026-11-21T20:49:00Z] === worldpackset-consume start ===
[2026-11-21T20:49:51Z] === worldpackset-consume done ===
```

### 🟢 3. The image WAS rebuilt — every piece is live, with one not-yet-exercised

```
$ docker inspect wunderkind-dev --format 'StartedAt={{.State.StartedAt}}  ImageID={{.Image}}'
StartedAt=2026-11-21T20:36:18.615797027Z  ImageID=sha256:2eaa579d24d0b957063f7b5c2545ce1484ae2325f4b550bfcd454d67d5205dd8
ImageCreated=2026-11-21T20:34:59.797571286Z

$ docker exec wunderkind-dev grep -n "messenger:consume worldpackset" /usr/local/bin/worldpackset-consume.sh
43:if $PHP "$CONSOLE" messenger:consume worldpackset --time-limit=50 --limit=3 --no-interaction; then

$ docker exec wunderkind-dev grep -c "NOT \`-q\`" /usr/local/bin/worldpackset-consume.sh
1
$ docker exec wunderkind-dev grep -c "starved" /var/www/html/src/Service/WorldPack/WorldPackSetService.php
3
$ docker exec wunderkind-dev grep -c "starved" /var/www/html/src/Controller/Admin/WorldPackController.php
2
$ docker exec wunderkind-dev grep -c "reapStaleBuilding" /var/www/html/src/Command/MaintainWorldPackSetsCommand.php
1
$ docker exec wunderkind-dev grep -c "REFUSED" /var/www/html/templates/admin/worldpack_cache.html.twig
1
```

**A fresh image was built at 20:34:59 and the container started from it at 20:36:18**, so the
PM's open question is answered: **nothing of this change is inert.** The deployed consumer
script carries no `-q`, and the behaviour is visible rather than merely present — the cron log
now runs ~708 bytes per run against ~115 before, because the Symfony banner `-q` used to
suppress is back in it.

⚠️ **One piece is live but has not executed yet, and it is not a problem.** The maintain sweep
is hourly at :20 and the container started at 20:36, so:

```
$ docker exec wunderkind-dev grep maintain /var/spool/cron/crontabs/root
20 * * * *   /usr/local/bin/worldpack-maintain.sh               >> /var/log/worldpack-maintain-cron.log   2>&1
$ docker exec wunderkind-dev tail -14 /var/log/worldpack-maintain-cron.log
tail: can't open '/var/log/worldpack-maintain-cron.log': No such file or directory
```

The missing log is the expected consequence of a 20:36 start, not a fault. **First run is
21:20 UTC**, and that is when the reap, the `0/2 claimable (+2 building)` Stock column and the
non-zero exit get their first unattended exercise. Both countries are at target, so the
expected output is a clean sweep with `reaped 0`.

`uptime` on the host at the time of these reads: `20:48:41 up 239 days, load average: 0.08,
0.29, 0.35`.

---

## 7. FLAGGED, NOT EDITED

1. **`agent-standing-notes.md`**, the 🔴 "ON DEV, THE ASYNC WORLD-PACK BUILD DOES NOT RUN"
   entry — contradicted by §1. Retire or rewrite.
2. **`.context/stages/07_synthesis/output/architecture-notes.md`**, the 🔴 bullet under
   "Keeping the buffer stocked" — same claim, same correction.
3. **`.context/stages/01_overview/output/deployment.md:152`** — the heading
   *"### 2. On the dev stack the async world-pack build does not run at all"*, and the section
   under it. Trap **#1** in that same file (the rebuild sparing CLAIMED sets) is unaffected by
   anything here and stands.
4. **Log rotation on the dev container and locally** — 3.9 GB + 2.0 GB, owner's call,
   unchanged since 2026-11-20.
5. **The standing notes' report path disagrees with my brief.** The notes say reports go to
   `/Users/courtneyadesile/Documents/WunderkindFactory/docs/economy-loose-ends/`; my brief said
   `wunderkind-docs/economy-loose-ends/`. Both directories exist; the notes themselves live in
   `wunderkind-docs/`, so I followed the brief. Worth settling in one place.
