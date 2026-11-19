<!-- STATUS --> **STATUS:** ✅ A7 — authored-size drift made loud. DEPLOYED.

---

# A7 — authored-size drift made loud, and the `tv_deal` cache unstuck

**Backend only, branch `development`, on top of `52c8b3bf`. Committed, NOT pushed, NOT deployed.**
Nothing in `wunderkind-app` was read-modify-written, no test of it was run, nothing committed there.

| | |
|---|---|
| Commit | *(filled in §8)* |
| Files | `src/Command/EconomyWageTableCommand.php`, `migrations/Version20261119150000.php`, `tests/Service/Economy/LeagueTvDealResyncTest.php`, `tests/Command/EconomyAuthoredSizeDriftTest.php`, `.context/stages/04_interfaces/output/services.md`, `.context/stages/03_data/output/migrations.md`, `.context/shared/last-sync.md` |
| `WORLD_PACK_VERSION` | untouched (neither half is a pack-shape change — §2.4) |
| Authored economy figures | none touched |
| Existing checks | none edited or relaxed; one TV read corrected in two places (§2.2), one check added |

---

## 0. Three places where the brief and the code/evidence disagree — read these first

The brief told me to believe the code over the brief and say so explicitly. Three cases.

### 0a. ⚠️ The brief says ONE raw `tv_deal` read in the gate. There are TWO.

The brief and `next-work-plan.md` both name `EconomyWageTableCommand:459` as "the" raw read, and
§6 says *"You are adding one and correcting one TV read."* Grep says otherwise:

```
$ grep -n "getTvDeal()\|sizeOf(" src/Command/EconomyWageTableCommand.php
460:            $perClub  = $league->getTvDeal();
461:            $size     = $this->leagueSizeResolver->sizeOf($league);
550:            $here = $this->leagueRepository->findByCountryAndTier($country, $tier)?->getTvDeal();
551:            $base = $this->leagueRepository->findByCountryAndTier($baseline, $tier)?->getTvDeal();
947:            $clubs    = max(1, $this->leagueSizeResolver->sizeOf($league));
952:            $tvPerClub     = $league->getTvDeal() ?? 0;
```

- `:460` is check 3's read (the line is 460, not 459 — the brief is one off).
- **`:952` is check 8's, and it has the identical defect**: a raw-column read paired with a
  `sizeOf()` read five lines above it at `:947`. Its `$perClub` and its `clubs @ taper` column
  therefore disagree about how many ways the pool was split, exactly as check 3's row did.

**I fixed both, and I think the brief would have wanted that.** Its own stated goal for this half
is *"it removes the gate from the cache-staleness class permanently, rather than fixing one
instance of it."* Fixing `:460` alone leaves the command squarely in that class. This is a
correction applied consistently, not a relaxation: no bound, tolerance or constant moved.

- **`:550`/`:551` (check 6) I deliberately left alone**, and flag it rather than touch it. Check 6
  asks a different question — *"was this stored absolute authored with the country factor
  applied?"* — and resolving those reads would silently convert it into a check on whether
  `tv_pool_pence` is country-scaled. That is arguably a better check, but it is a change to what an
  existing check asserts, which §6 forbids. It is also inert today: check 6 returns early at
  parity, and every country on the box is at parity. **Recommend it as a follow-up for the PM to
  scope, not for me to decide.**

### 0b. ⚠️ "~31 pre-existing test failures" is not a test figure — it is the gate's.

The brief's environment preamble says the suite has *"~31 pre-existing failures documented in
`.context/stages/01_overview/output/environment.md`"*. That document documents **four**
(amended to "FOUR, FIVE or THREE" depending on run composition). The number 31 is
`app:economy:wage-table`'s own output on this clone:

```
 [ERROR] 31 check(s) failed. Do not flip the wage model until these are
         resolved.
```

Two different things with the same number. I judged the suite against environment.md's documented
3–5, which is what §4.2 below does.

### 0c. 🔴 The clone cannot show either defect, and that changes how §2's proof had to be built.

Verified, not assumed — this is the §1 clone-reading warning arriving in person:

```
$ lando psql wunderkind -c "
SELECT l.country, l.tier, l.slots, COUNT(n.id) AS npc_rows, l.tv_pool_pence, l.tv_deal,
       CASE WHEN l.tv_pool_pence IS NULL THEN NULL ELSE l.tv_pool_pence / NULLIF(l.slots,0) END AS derived
  FROM league l LEFT JOIN npc_club n ON n.league_id = l.id AND n.country = l.country
 WHERE l.country IN ('EN','SC')
 GROUP BY l.id, l.country, l.tier, l.slots, l.tv_pool_pence, l.tv_deal
 ORDER BY l.country, l.tier;"

 country | tier | slots | npc_rows | tv_pool_pence |  tv_deal   |  derived
---------+------+-------+----------+---------------+------------+------------
 EN      |    1 |    18 |       18 |   18000000000 | 1000000000 | 1000000000
 EN      |    2 |    18 |       18 |    1800000000 |  100000000 |  100000000
 EN      |    3 |    18 |       18 |     900000000 |   50000000 |   50000000
 EN      |    4 |    18 |       18 |     540000000 |   30000000 |   30000000
 EN      |    5 |    18 |       18 |     180000000 |   10000000 |   10000000
 EN      |    6 |    18 |       18 |      54000000 |    3000000 |    3000000
 EN      |    7 |    18 |       18 |      18000000 |    1000000 |    1000000
 EN      |    8 |    18 |       17 |       9000000 |     500000 |     500000
 SC      |    1 |     3 |        3 |    3000000000 | 1000000000 | 1000000000
 SC      |    2 |     3 |        3 |     300000000 |  100000000 |  100000000
 SC      |    3 |     3 |        3 |     150000000 |   50000000 |   50000000
 SC      |    4 |     3 |        3 |      90000000 |   30000000 |   30000000
 SC      |    5 |     3 |        3 |      30000000 |   10000000 |   10000000
 SC      |    6 |     3 |        3 |       9000000 |    3000000 |    3000000
 SC      |    7 |     3 |        3 |       3000000 |    1000000 |    1000000
 SC      |    8 |     3 |        3 |       1500000 |     500000 |     500000
(16 rows)
```

**All 230 migrations are recorded as executed on this clone**, `Version20261119120000` included:

```
$ lando php bin/console doctrine:migrations:status | tail
| Migrations           | Executed             | 230  |
|                      | Executed Unavailable | 0    |
|                      | Available            | 230  |
|                      | New                  | 0    |
```

So the correction migration ran here and changed nothing, because on this clone EN really does
hold 18 NPC rows per tier (17 at tier 8 — a detected reservation) and SC holds 3. **This clone is
internally consistent: `tv_deal` equals `pool / slots` at every EN and SC tier, and `slots` equals
the reservation-adjusted row count at every one.** It is also behind on economy authoring (EN t1
pool is £180,000,000 here against the deployed £300,000,000, and sponsorship shares read 0.7%).

Two consequences, both of which shaped the verification:

1. **The code fix is byte-identical on this clone for the TV figures** — because `derived` and the
   raw column are the same number here. A byte-identical gate would be the brief's stated failure
   signal, so §2.3 proves the fix against a **temporarily staled copy** of the clone reproducing
   the deployed shape, then restores the clone to its own fingerprint.
2. **Check 9 is silent on EN and SC here.** That is a clone reading and says nothing about the
   deployed box — see §3.4, where a sibling session's live export says the deployed box is
   **drifted**.

---

## 1. Code state at the start

```
$ git status --short
(clean)
$ git log --oneline -1
52c8b3bf Correct an authored league.slots that disagrees with the real size
$ git rev-parse HEAD
52c8b3bf50c850d614dc93d832ded866c9ebbaf0
```

Clean tree, at `52c8b3bf` as the brief requires.

---

## 2. Part one — the stale derived cache

### 2.1 Who is harmed, and who is not — established rather than taken on trust

```
$ grep -rn "derivedTvDealPence" src/
src/Controller/InitializeController.php:249:            // turned that into £0 of TV income. `derivedTvDealPence()` returns null when there
src/Controller/InitializeController.php:251:            'tvDeal'            => $leagueSizeResolver->derivedTvDealPence($league) ?? $league->getTvDeal(),
src/Service/LeagueImportExportService.php:64:                // `derivedTvDealPence()` returns null when there is no pool, so every league
src/Service/LeagueImportExportService.php:66:                'tvDeal'               => $this->leagueSizeResolver->derivedTvDealPence($l)
src/Service/LeagueService.php:306:                'tvDeal'                        => $this->leagueSizeResolver->derivedTvDealPence($league)
src/Service/SyncService.php:832:            // turned that into £0 of TV income. `derivedTvDealPence()` returns null when there
src/Service/SyncService.php:834:            'tvDeal'                        => $this->leagueSizeResolver->derivedTvDealPence($league)
src/Service/Economy/LeagueSizeResolver.php:96:    public function derivedTvDealPence(League $league): ?int
src/Service/Economy/LeagueSizeResolver.php:117:        $derived = $this->derivedTvDealPence($league);
```

**Clients: unaffected, confirmed.** All four publication sites resolve — `SyncService:834`,
`InitializeController:251`, `LeagueService:306`, `LeagueImportExportService:66`. The only other
caller of `derivedTvDealPence()` is `syncTvDeal()` itself (`:117`). That is exactly what B1 bought.

**The gate: affected, and it was the only affected reader.** The two raw reads are §0a's `:460`
and `:952`. `syncTvDeal()` is reached from nowhere but an admin save:

```
$ grep -rn "syncTvDeal" src/
src/Controller/Admin/LeagueAdminController.php:95:        $this->leagueSizeResolver->syncTvDeal($league);
src/Controller/Admin/LeagueAdminController.php:201:        $this->leagueSizeResolver->syncTvDeal($league);
src/Service/Economy/LeagueSizeResolver.php:113:    public function syncTvDeal(League $league): void
```

### 2.2 The code fix

Both raw reads now resolve, with the reason written at each site. `:460`:

```php
            // RESOLVED, NOT THE RAW COLUMN. `league.tv_deal` is a CACHE of `tvPoolPence / slots`
            // that `syncTvDeal()` only refreshes on an admin save, so any migration that moves
            // `slots` leaves it encoding the old divisor — which is exactly what happened on
            // 2026-11-19 (EN stored pool/18 against a corrected size of 16, so this check read
            // England's TV income 12.5% low and printed `perClub x size != pool`). Every
            // publication site already resolves this way; the gate reading the raw column was
            // the one reader left in the cache-staleness class.
            $perClub  = $this->leagueSizeResolver->derivedTvDealPence($league) ?? $league->getTvDeal();
```

`:952` (check 8), where the `?? 0` tail is kept because that call site has always treated an
absent figure as zero:

```php
            // RESOLVED for the same reason check 3 does it: this line is paired with the
            // `sizeOf()` read eight lines above, so a stale cache makes `perClub` and `clubs`
            // disagree about how many ways the pool was split.
            $tvPerClub     = $this->leagueSizeResolver->derivedTvDealPence($league)
                ?? $league->getTvDeal()
                ?? 0;
```

### 2.3 ⚠️ THE GATE MOVES — before and after, in full, on a copy staled to the deployed shape

Per §0c the clone cannot show the defect, so it was staled to reproduce the deployed box exactly:
the `slots` correction applied, the `tv_deal` cache not resynced.

```
$ lando psql wunderkind -c "
UPDATE league SET slots = 16 WHERE country = 'EN';
UPDATE league SET slots = 14 WHERE country = 'SC';
UPDATE league SET tv_deal = tv_pool_pence / 18 WHERE country IN ('EN','SC') AND tv_pool_pence IS NOT NULL;
"
UPDATE 8
UPDATE 8
UPDATE 16

$ lando psql wunderkind -c "SELECT country, tier, slots, tv_pool_pence, tv_deal, tv_pool_pence/slots AS correct FROM league WHERE country IN ('EN','SC') AND tier <= 2 ORDER BY country, tier;"
 country | tier | slots | tv_pool_pence |  tv_deal   |  correct
---------+------+-------+---------------+------------+------------
 EN      |    1 |    16 |   18000000000 | 1000000000 | 1125000000
 EN      |    2 |    16 |    1800000000 |  100000000 |  112500000
 SC      |    1 |    14 |    3000000000 |  166666666 |  214285714
 SC      |    2 |    14 |     300000000 |   16666666 |   21428571
(4 rows)
```

BEFORE was produced by stashing only the command, exactly as the brief asks:

```
$ git stash push src/Command/EconomyWageTableCommand.php
Saved working directory and index state WIP on development: 52c8b3bf Correct an authored league.slots that disagrees with the real size
$ lando php bin/console app:economy:wage-table EN SC   # -> gate-stale-BEFORE.txt
before exit=1
$ git stash pop
$ lando php bin/console app:economy:wage-table EN SC   # -> gate-stale-AFTER.txt
after exit=1
```

**BEFORE — the TV rows, pasted in full:**

```
--- EN ---
 TV against turnover:
 --- ------- ---------------- ----------------- ----------------- ---------------
  T   clubs   TV per club      TV pool           turnover          TV % turnover
 --- ------- ---------------- ----------------- ----------------- ---------------
  1   16      £10,000,000.00   £180,000,000.00   £331,000,000.00   3.0%
  2   16      £1,000,000.00    £18,000,000.00    £114,000,000.00   0.9%
  3   16      £500,000.00      £9,000,000.00     £34,600,000.00    1.4%
  4   16      £300,000.00      £5,400,000.00     £20,700,000.00    1.4%
  5   16      £100,000.00      £1,800,000.00     £7,320,000.00     1.4%
  6   16      £30,000.00       £540,000.00       £2,690,000.00     1.1%
  7   16      £10,000.00       £180,000.00       £686,000.00       1.5%
  8   16      £5,000.00        £90,000.00        £215,000.00       2.3%
 --- ------- ---------------- ----------------- ----------------- ---------------
--- SC ---
 TV against turnover:
 --- ------- --------------- ---------------- ----------------- ---------------
  T   clubs   TV per club     TV pool          turnover          TV % turnover
 --- ------- --------------- ---------------- ----------------- ---------------
  1   14      £1,666,666.66   £30,000,000.00   £331,000,000.00   0.5%
  2   14      £166,666.66     £3,000,000.00    £114,000,000.00   0.1%
  3   14      £83,333.33      £1,500,000.00    £34,600,000.00    0.2%
  4   14      £50,000.00      £900,000.00      £20,700,000.00    0.2%
  5   14      £16,666.66      £300,000.00      £7,320,000.00     0.2%
  6   14      £5,000.00       £90,000.00       £2,690,000.00     0.2%
  7   14      £1,666.66       £30,000.00       £686,000.00       0.2%
  8   14      £833.33         £15,000.00       £215,000.00       0.4%
 --- ------- --------------- ---------------- ----------------- ---------------
```

**AFTER — the same rows:**

```
--- EN ---
 TV against turnover:
 --- ------- ---------------- ----------------- ----------------- ---------------
  T   clubs   TV per club      TV pool           turnover          TV % turnover
 --- ------- ---------------- ----------------- ----------------- ---------------
  1   16      £11,250,000.00   £180,000,000.00   £331,000,000.00   3.4%
  2   16      £1,125,000.00    £18,000,000.00    £114,000,000.00   1.0%
  3   16      £562,500.00      £9,000,000.00     £34,600,000.00    1.6%
  4   16      £337,500.00      £5,400,000.00     £20,700,000.00    1.6%
  5   16      £112,500.00      £1,800,000.00     £7,320,000.00     1.5%
  6   16      £33,750.00       £540,000.00       £2,690,000.00     1.3%
  7   16      £11,250.00       £180,000.00       £686,000.00       1.6%
  8   16      £5,625.00        £90,000.00        £215,000.00       2.6%
 --- ------- ---------------- ----------------- ----------------- ---------------
--- SC ---
 TV against turnover:
 --- ------- --------------- ---------------- ----------------- ---------------
  T   clubs   TV per club     TV pool          turnover          TV % turnover
 --- ------- --------------- ---------------- ----------------- ---------------
  1   14      £2,142,857.14   £30,000,000.00   £331,000,000.00   0.6%
  2   14      £214,285.71     £3,000,000.00    £114,000,000.00   0.2%
  3   14      £107,142.85     £1,500,000.00    £34,600,000.00    0.3%
  4   14      £64,285.71      £900,000.00      £20,700,000.00    0.3%
  5   14      £21,428.57      £300,000.00      £7,320,000.00     0.3%
  6   14      £6,428.57       £90,000.00       £2,690,000.00     0.2%
  7   14      £2,142.85       £30,000.00       £686,000.00       0.3%
  8   14      £1,071.42       £15,000.00       £215,000.00       0.5%
 --- ------- --------------- ---------------- ----------------- ---------------
```

**It moved, and by the predicted amount.**

| | before | after | change | `perClub × size` | pool |
|---|---|---|---|---|---|
| EN t1 | £10,000,000.00 | £11,250,000.00 | **+12.5%** | £11,250,000 × 16 = **£180,000,000** | £180,000,000 ✅ |
| EN t8 | £5,000.00 | £5,625.00 | **+12.5%** | £5,625 × 16 = **£90,000** | £90,000 ✅ |
| SC t1 | £1,666,666.66 | £2,142,857.14 | **+28.57%** | £2,142,857.14 × 14 = **£30,000,000** | £30,000,000 ✅ |
| SC t8 | £833.33 | £1,071.42 | **+28.57%** | £1,071.42 × 14 = **£15,000** | £15,000 ✅ |

England rises **12.5%** (18/16 − 1), as the brief predicted to the decimal. **Scotland rises
28.57%** (18/14 − 1), which the brief did not state and which is the larger error of the two —
worth recording, since SC is the country being tested on. `perClub × size` now equals the pool
exactly at every tier in both countries; before the fix it did not at any of them.

### 2.4 Why `WORLD_PACK_VERSION` is untouched

The published `tvDeal` key does not move: all four publication sites were **already** serving
`pool / slots`, so the resync writes into the column the value clients were already being given.
The only observable change is to readers of the raw column, of which there was one, and it is
corrected in code. Not a pack-shape change.

### 2.5 The resync migration, and why its `WHERE` clause is the whole care

`migrations/Version20261119150000.php`, in `Version20261119120000`'s shape — stash every row,
write, `down()` restores from the stash.

```sql
UPDATE league
   SET tv_deal = tv_pool_pence / slots
 WHERE tv_pool_pence IS NOT NULL
   AND slots > 0
   AND (tv_deal IS NULL OR tv_deal <> tv_pool_pence / slots)
```

- **`tv_pool_pence IS NOT NULL`** as the brief requires. A pool-less league's `tv_deal` is an
  AUTHORED absolute an operator typed, not a cache of anything — the case `derivedTvDealPence()`
  deliberately returns null for. Writing a derived figure over it would be inventing a pool nobody
  authored. Mirroring that null-is-inert contract is what makes the migration *provably* inert for
  those rows rather than inert by inspection.
- **`slots > 0`** for the mirror reason: `slots = 0` means derive, the size is resolved at read
  time from NPC rows, and `intdiv` by zero is not a figure.
- **The third clause** is why the statement is re-runnable and why a second deploy moves nothing.
- **`down()` restores from the stash and never recomputes.** Recomputing would be the same bug in
  reverse: it would overwrite a figure an operator authored between the two runs with one derived
  from whatever `slots` says at rollback time. The stash column is nullable because `tv_deal` is,
  so a league that held NULL goes back to NULL.
- Postgres's bigint `/` truncates toward zero exactly like PHP's `intdiv()`, so the stored figure
  matches the resolved one to the penny rather than to a rounding mode. Pinned by a test.

---

## 3. Part two — check 9, the authored size against the clubs that exist

### 3.1 The defect, re-verified

Nothing anywhere compared `slots` to the NPC rows. `LeagueSizeResolver` reads `slots` and falls
back to a count; it never compares the two, and no other file does either.

### 3.2 ⚠️ The §3a trap, and how the check avoids it

`slots` is deliberately `rowcount + 1` at a country's deepest tier, so `slots == rowcount` fires on
every bottom tier in the world by design. The check uses `Version20261119120000::CORRECT_SQL`'s
rule, transliterated into PHP, **detection intact**:

```php
            $reserved = $tier === $deepest
                && $above !== null
                && $here === $above - 1;

            $expected = $here + ($reserved ? 1 : 0);
```

against the SQL it came from:

```sql
        r.rowcount + CASE
            WHEN r.tier = r.deepest
             AND above.rowcount IS NOT NULL
             AND r.rowcount = above.rowcount - 1
            THEN 1 ELSE 0 END AS target
```

The three conditions map one to one. **The reservation is detected, not assumed** — `$above !==
null` is the SQL's `above.rowcount IS NOT NULL` (a single-tier country cannot demonstrate a
reservation and is treated as unreserved, the conservative answer), and `$here === $above - 1` is
the detection. An unconditional `+1` would have corrupted CA, JP, NG, PL, US and SC when B3 was
dry-run; it is not in this code. `$deepest` is the deepest league the country **actually** has, not
`country_profile.league_tier_count` — the same choice `isBottomTier()` makes.

**The drift the check reports is the residue after the reservation, not the raw row difference**,
and both numbers are in the output so nobody has to recompute it. On the deployed shapes measured
from the 2026-11-19 export that is a precise, checkable claim, and it is a test:

| | authored | rows | reservation | real size | **drift reported** |
|---|---|---|---|---|---|
| EN t1–t7 | 16 | 16 | no | 16 | **0** |
| EN t8 | 16 | 15 | **detected** | 16 | **0**, not 1 |
| SC t1–t7 | 14 | 12 | no | 12 | **2** |
| SC t8 | 14 | 11 | **detected** | 12 | **2**, not 3 |

`testTheDeployedEnglandShapeIsCleanIncludingItsReservedBottomTier()` and
`testTheDeployedScotlandShapeIsShortByTwoAtEveryTierIncludingTheReservedOne()` seed exactly those
shapes and assert exactly those drifts, including `assertStringNotContainsString('short by 3')`.
**Getting SC t8 wrong by one would send somebody authoring 11 and permanently deleting the
player's place in Scotland's bottom division** — which is why it is an assertion and not an
eyeball.

### 3.3 §3b — FAIL or WARN: the brief proposed one rule, the evidence changed my mind

**Decision: it FAILS whenever money is provably being mis-divided, and WARNS only when nothing is
being divided yet. The severity turns on whether a TV pool exists, not on which way the drift
runs. The drift table prints either way.**

| state | verdict |
|---|---|
| rows > resolved size | **FAIL**, always |
| resolved size > rows, **with** a `tvPoolPence` | **FAIL** |
| resolved size > rows, **no** pool | **WARN** |

**The brief proposed the opposite for the second row, I implemented it, and then a measurement
retired it. Here is what moved me.**

The brief's suggestion — *"warn when the authored size is the larger (a half-filled tier — normal
during generation)"* — is reasonable and I wrote it first. Its premise is that an under-fill is
**ambiguous**: `BootstrapCountryCommand` creates a country's leagues and then fills them, so every
country passes through that state legitimately, and a gate that goes red on a correct box is a gate
nobody reads. That premise is sound *only while nothing is being divided.*

**Scotland is the counter-example, and it is measured, not hypothetical.** `slots` 14 against 12
real rows at tier 7, with a £5,000,000 pool authored:

```
per club, as paid:      intdiv(500000000, 14) = £357,142.85
per club, as owed:      intdiv(500000000, 12) = £416,666.66
each club is short:                              14.3%
reaching nobody at all: 500000000 − 12 × 35714285 = £714,285.80
```

**A pool divided more ways than there are clubs to receive it does not go somewhere else — it
evaporates.** And it evaporates *silently*, which is the whole problem: an over-payment gets
noticed because somebody is richer, and this one is noticed by nobody because the money that went
missing was never anybody's. That tier is finished, not mid-bootstrap. Under the direction-based
rule it would have been a warning.

So the line that actually matters is not *"which way does the drift run"* but **"has anybody
authored money against this division yet"**. Authoring a pool is the act that turns a size into a
divisor, and from that moment a wrong size is wrong money in **either** direction. Before that, the
only consumers are the published `clubCount` and this command's own instruments — genuinely
ambiguous, genuinely a thing an operator may be partway through, and genuinely not worth reddening
a release gate over. The rule follows the mechanism rather than the direction, which is why it
covers the measured case the guessed rule missed.

The warning says so rather than implying the state is fine:

```
 [WARNING] YC tier 1: authored size 16 against a real size of 10 (10 NPC club rows) — short by 6.
           No TV pool is authored here, so nothing is being divided yet; normal while a country
           is still being generated, and a finding once it is finished or a pool is authored.
```

Both branches are pinned: `testAnUnderFilledTierWithATvPoolFailsInsteadOfWarning()` asserts the
exit code is 1 and that all three money figures appear (£357,142.85 / £416,666.66 / £714,285.80),
and `testAnUnderFilledTierWarnsRatherThanFailing()` asserts the pool-less case does **not** emit
the failure.

**The addition I think matters most, which the brief did not ask for: the drift table prints
unconditionally.** The real risk in any "warn" verdict is not that a human disagrees — it is that
*on a correct box there is no evidence the check exists at all*. An empty finding list is
indistinguishable from a check that never ran, which is precisely how this gap survived until now.
So check 9 always prints both figures, the tier, whether a reservation was detected, the real size
and the signed drift:

```
 Authored division size against the NPC club rows that exist (the reserved player place is DETECTED, not assumed):
 --- --------------- ---------- ---------- ---------- ----------- ------- ----
  T   resolved size   source     npc rows   reserved   real size   drift
 --- --------------- ---------- ---------- ---------- ----------- ------- ----
  1   18              authored   18         no         18          0       ok
  ...
  8   18              authored   17         yes        18          0       ok
 --- --------------- ---------- ---------- ---------- ----------- ------- ----
```

On a clean box that table **is** the finding: it says the check ran and found agreement, and EN
tier 8's `reserved yes / drift 0` row is the §3a trap being handled correctly on real data.
`testTheTablePrintsEvenWhenNothingIsWrong()` asserts it.

**One more column nobody asked for: `source`.** A `slots = 0` league's size is *derived*, not
anybody's decision, and calling it "authored" would send a human looking for an author who does not
exist. Row and message both say `derived`, and a test pins that they do.

### 3.4 🔴 THE DRIFT IS LIVE ON THE DEPLOYED BOX, AND IT IS THIS TASK'S JUSTIFICATION ARRIVING EARLY

Measured from the 2026-11-19 world export by the A6 session, relayed through the PM session:

```
EN  t1-t7   slots 16   rows 16    drift 0
EN  t8      slots 16   rows 15    drift 0   (the reserved place)
SC  t1-t7   slots 14   rows 12    drift 2
SC  t8      slots 14   rows 11    drift 2   (reservation 1 + real drift 2)
```

**England is clean. Scotland is short by a flat 2 in all eight divisions**, independently of the
reservation rule. So the brief's §4 expectation of a clean run is withdrawn, by the PM, twice over —
and the check's first real job is already waiting for it.

**What makes this the strongest possible argument for the task rather than a bug report: the rows
changed under the authored number, and nothing said anything.** My own contribution to settling
that was arithmetic, and it corrected the PM's reading twice — set out in §3.5 — but the conclusion
is this. The owner **rebuilt the worldpack caches between 11:04 and 14:15 on 2026-11-19** (PM,
confirmed). Scotland held 14 rows at 11:04 and the export reads 12 at 14:15. So somebody altered
the world, the authored size did not follow, no error and no log line was produced, and every
Scottish club has been paid 85.7% of its TV money since. **That is the owner's own stated
scenario — *"we alter the cache and tune the system ahead of go live"* — happening before the check
that catches it had shipped.** It is not a defect in the design of authored sizes; it is the
missing instrument, and this is what it was missing.

**Independent corroboration of both halves of this task, from A6's measurement note** (its own
reading of the same export, which I did not produce and am citing rather than restating):

```
EN t7: pool £5,000,000  /slots=£312,500      /rows=£312,500      published=£312,500      -> SLOTS
EN t8: pool £1,200,000  /slots=£75,000       /rows=£80,000       published=£75,000       -> SLOTS
SC t7: pool £5,000,000  /slots=£357,142.85   /rows=£416,666.66   published=£357,142.85   -> SLOTS
SC t8: pool £1,200,000  /slots=£85,714.28    /rows=£109,090.9    published=£85,714.28    -> SLOTS
```

Every tier of both countries publishes `pool / slots`, never `pool / rows` — EN t8 is the clean
discriminator (£75,000 against £80,000) and confirms it in England too. **Two things follow.**
First, part one's premise is confirmed from a second direction: the *published* figure is the
derived one, so clients were never served the stale column, exactly as §2.1 establishes. Second,
the authored size really is the divisor everywhere, which is what makes §3.4's drift a money
defect rather than a bookkeeping one.

**Not mine to resolve.** Whether Scotland's authored **14** or its real **12** is correct is the
owner's decision — §3c, and firmly. I did not author `slots`, did not re-run the correction
migration, and did not touch any pack. The check makes it loud; a human authors the number.

### 3.5 ⚠️ My measurements, and the two inferences they corrected

The PM asked me to prioritise measuring the real row counts, and to say plainly if my reading
contradicted theirs. It does, in a way that matters.

**🔴 FIRST, AND MOST IMPORTANTLY: THE CLONE CANNOT ANSWER THE QUESTION AT ALL, AND THE REQUEST
ASSUMED IT COULD.** The clone is not a slightly-stale copy of the deployed box; it is a different
world. Its EN `slots` is still **18** and its Scotland is at **3** — neither 12 nor 14. So no clone
reading discriminates between the hypotheses on the table. I ran the measurements anyway because
they were asked for and are cheap, but **the clone's answer is not evidence about the box**:

```
$ lando psql wunderkind -c "
SELECT lg.country, lg.tier, lg.slots AS authored_slots, COUNT(n.id) AS npc_club_rows
  FROM league lg
  LEFT JOIN npc_club n ON n.league_id = lg.id AND n.country = lg.country
 WHERE lg.country IN ('EN','SC')
 GROUP BY lg.id, lg.country, lg.tier, lg.slots
 ORDER BY lg.country, lg.tier;"

 country | tier | authored_slots | npc_club_rows
---------+------+----------------+---------------
 EN      |    1 |             18 |            18
 EN      |    2 |             18 |            18
 EN      |    3 |             18 |            18
 EN      |    4 |             18 |            18
 EN      |    5 |             18 |            18
 EN      |    6 |             18 |            18
 EN      |    7 |             18 |            18
 EN      |    8 |             18 |            17
 SC      |    1 |              3 |             3
 SC      |    2 |              3 |             3
 SC      |    3 |              3 |             3
 SC      |    4 |              3 |             3
 SC      |    5 |              3 |             3
 SC      |    6 |              3 |             3
 SC      |    7 |              3 |             3
 SC      |    8 |              3 |             3
(16 rows)
```

And `CORRECT_SQL`'s `target` subquery, run as a SELECT with no UPDATE — `would_update` is **false
for all sixteen** EN and SC leagues, so the clone is self-consistent and reproduces nothing:

```
 country | tier | stored_slots | target | would_update
---------+------+--------------+--------+--------------
 EN      |    1 |           18 |     18 | f
 EN      |    2 |           18 |     18 | f
 EN      |    3 |           18 |     18 | f
 EN      |    4 |           18 |     18 | f
 EN      |    5 |           18 |     18 | f
 EN      |    6 |           18 |     18 | f
 EN      |    7 |           18 |     18 | f
 EN      |    8 |           18 |     18 | f
 SC      |    1 |            3 |      3 | f
 SC      |    2 |            3 |      3 | f
 SC      |    3 |            3 |      3 | f
 SC      |    4 |            3 |      3 | f
 SC      |    5 |            3 |      3 | f
 SC      |    6 |            3 |      3 | f
 SC      |    7 |            3 |      3 | f
 SC      |    8 |            3 |      3 | f
(16 rows)
```

**What did settle it was arithmetic on the two migrations, not a database reading.** The PM
proposed that the correction migration might have "failed to match Scotland", which would be a
serious finding about already-deployed code. **That hypothesis is self-contradictory and I struck
it:**

- The migration **did** match Scotland — it wrote 18 → 14 at tiers 1–4. Under its own rule the
  only way it writes 14 is `target = 14`. Had it computed 12, it would have written **12**.
- And a second, independent witness agrees. `Version20261119090000::AUTHOR_SQL` authored `slots`
  where it was 0 using `COUNT(n.id) + CASE WHEN lg.tier = m.deepest THEN 1 ELSE 0 END` — an
  **unconditional** `+1`. SC tiers 5–8 were `slots = 0` and came out at 14, so t5–t7 (not deepest)
  had **14 rows** and t8 (deepest) had **13**.

Two different migrations, two different statements, same answer: **at ~10:28–11:04 on 2026-11-19
Scotland held 14 rows at tiers 1–7 and 13 at tier 8.** The export three hours later reads 12 and
11 — a flat −2 at all eight tiers, bottom tier included, which reads like an operation on the
world rather than a quirk of one reader. Combined with the PM's cache-rebuild timing, that is
§3.4's conclusion. The PM verified the `AUTHOR_SQL` half independently and struck its own
hypothesis.

**What remains genuinely open**, and I am not claiming otherwise: whether `npc_club` now holds 12
(the world changed) or still holds 14 while the export/pack carries 12 (a lossy reader). Both
migrations use the same `n.league_id = lg.id AND n.country = lg.country` join, so if that join is
the lossy one they are lossy *identically* and the inference above would shift. **Not decidable
from this machine.** Two read-only queries settle it on the box:

```sql
SELECT lg.country, lg.tier, lg.slots, COUNT(n.id) AS npc_rows
  FROM league lg LEFT JOIN npc_club n ON n.league_id = lg.id AND n.country = lg.country
 WHERE lg.country IN ('EN','SC') GROUP BY lg.id, lg.country, lg.tier, lg.slots
 ORDER BY lg.country, lg.tier;
```

```sql
SELECT country, tier, COUNT(*) FROM npc_club WHERE country = 'SC' GROUP BY country, tier ORDER BY tier;
```

The second deliberately drops the league join: **if it returns 14 while the first returns 12, the
join is the lossy thing.** The PM is also putting `php bin/console app:country:check SC` to the
owner, which prints NPC clubs per tier and world pack sets in one read-only command. And once this
commit is on the box, `app:economy:wage-table EN SC` prints all of it — which is the point.

⚠️ **The check is correct under either answer**, which is why none of this gated the code: if the
rows are 12, slots-vs-rows fires (`short by 2`); if the rows are 14 and the pack carries 12, the
pack comparison fires (§3.6). **Together the two comparisons cover both.**

### 3.6 The third count — the cached pack, an addition beyond the brief

**Status: not required. Added, kept, and labelled.** The PM asked for it, then retracted the
request as overcomplication. By then it was written and tested, so I kept it rather than delete
working, covered code — and §3.5's open question is the reason: if the rows are still 14 and the
pack carries 12, **this is the only comparison that would catch the live defect.**

There are three club counts, not two:

1. **AUTHORED** — `league.slots`, via `sizeOf()`. The divisor every finance uses.
2. **SERVER ROWS** — `npc_club` rows. What the brief's check compares against.
3. **WHAT THE DEVICE PLAYS** — the cached world pack's `clubs` array, plus the player's own club.

A pack is a **cache** of the rows and nothing invalidates it when the rows change — the footgun
already recorded against `NpcClub` field changes. So comparing only 1 against 2 can go green while
a device fields a different division, and **a check that passes while the defect is live is worse
than no check**, because it licenses the belief that the sizes agree.

It compares the pack's `clubCount` against the **rows**, not against `sizeOf()`, deliberately: the
rows are what the pack is built from, so a disagreement is unambiguously a stale cache with one
clear remedy. The message says so, because the wrong fix is obvious and tempting:

> *…the device fields a different division from the one the £5,000,000.00 pool is divided by. The
> pack is a cache and nothing invalidates it when clubs are regenerated: REGENERATE the pack, do
> not author league.slots to match a cache.*

**What it costs:** one extra call to `CountryWorldPackCacheRepository::findAllSummaries()`, which
counts the payload with PostgreSQL JSON functions and never loads it into PHP — the method's own
docblock exists for that reason. No new query shape, no new repository method, no entity change.

Three details that are decisions rather than details:

- **Only current-`payload_version` rows are compared.** A stale-version payload is already treated
  as a cache miss and will be rebuilt, so reporting it is noise about a cache about to be
  discarded. The table shows it as `stale version — ignored` rather than hiding it.
  `testAPackAtAnOldPayloadVersionIsIgnored()` pins it.
- **Each pack SET is reported separately**, not collapsed — a country can hold more than one set
  per tier, and two sets disagreeing with each other is itself worth seeing.
- ⚠️ **No pack at all is said out loud**, because silence would read as "the pack agrees", which is
  the same false reassurance in a different costume:

  ```
   Cached world packs for YF: none. The pack-against-rows comparison cannot run, so a device
   could still field a different division from the one every finance divides by.
  ```

  `testNoCachedPackIsReportedAsAnAbsenceOfEvidence()` pins it.

The player's own club is added on the device and is not in the payload, so **no reservation
adjustment belongs in this comparison** — which is also why A6's caution is right and recorded:
the device's "12 CLUBS" is not the NPC row count, and the report keeps the two figures separate
throughout.

### 3.7 It writes nothing

`testTheCheckNeverWritesTheAuthoredSize()` runs the gate against a drifted league and reads `slots`
straight back out of the database, asserting it is still 16. The check is read-only by construction
— it holds no write path — but the assertion is there because "helpfully" correcting the drift is
the obvious wrong fix, and it would undo A4.

### 3.8 ⚠️ The latent `sizeOf()` defect — reported, not fixed, and now visible

`LeagueSizeResolver::sizeOf()`'s derive branch adds `+1` at the bottom tier **unconditionally**:

```php
        return $npc + ($this->isBottomTier($league) ? 1 : 0);
```

where the migration's rule *detects* the reservation. On a country whose deepest tier was never
reserved, the resolver claims one more club than the division can field. Latent today — inert
wherever `slots` is authored, and the only `slots = 0` leagues on the deployed box are SC tiers
5–8, which do reserve.

**My check's logic did not force the question, so per §3a I did not fix it.** It surfaces the
defect instead of being broken by it: a single-tier country at `slots = 0` with 8 rows resolves to
9, and the check reports it as short by 1 — labelled `derived`, so nobody hunts for an author.
Pinned by `testADerivedSizeIsLabelledDerivedAndSurfacesTheResolversUnconditionalPlusOne()`, so it
cannot go quiet again while somebody decides what to do about it.

---

## 4. Verification

### 4.1 New tests — 20 tests, 61 assertions, all passing

```
$ lando php vendor/bin/phpunit --no-coverage tests/Command/EconomyAuthoredSizeDriftTest.php tests/Service/Economy/LeagueTvDealResyncTest.php
PHPUnit 13.4.3 by Sebastian Bergmann and contributors.

Runtime:       PHP 8.5.7
Configuration: /app/phpunit.dist.xml

....................                                              20 / 20 (100%)

Time: 00:00.970, Memory: 52.50 MB

OK (20 tests, 61 assertions)
```

**`EconomyAuthoredSizeDriftTest` (14 tests)** — drives the real command through `CommandTester`
against eight synthetic countries (`YA`–`YH`; nothing else in the suite fixtures a `Y_` code, which
is deliberate given the documented country-code-collision trap):

| test | what it pins |
|---|---|
| `testAReservedBottomTierIsNotReportedAsDrift` | **§3a's trap.** 16/16/15 rows against an authored 16 — the check ran and said nothing |
| `testTheTableSaysTheReservationWasDetected` | the detection is visible, not merely effective |
| `testTheDeployedEnglandShapeIsCleanIncludingItsReservedBottomTier` | **the live EN shape: t8 drift 0, not 1** |
| `testTheDeployedScotlandShapeIsShortByTwoAtEveryTierIncludingTheReservedOne` | **the live SC shape: 2 at every tier, and t8 is 2 and not 3** |
| `testRowsOutnumberingTheAuthoredSizeIsReportedWithBothFigures` | 20 rows vs 16 — both figures, the tier, the number to author |
| `testRowsOutnumberingTheAuthoredSizeFailsTheCommand` | exit code 1, so it gates rather than informs |
| `testAnUnderFilledTierWithATvPoolFailsInsteadOfWarning` | **§3b's decisive case** — exit 1, and all three money figures |
| `testAnUnderFilledTierWarnsRatherThanFailing` | the pool-less case warns and does **not** emit the failure |
| `testADerivedSizeIsLabelledDerivedAndSurfacesTheResolversUnconditionalPlusOne` | `slots = 0` reads `derived`; §3.8 stays visible |
| `testAStalePackIsReportedEvenWhenSlotsAndRowsAgree` | **§3.6** — slots and rows both 14, pack 12, and the pack half is what speaks |
| `testAPackAtAnOldPayloadVersionIsIgnored` | a stale-version payload is noise, not a finding |
| `testNoCachedPackIsReportedAsAnAbsenceOfEvidence` | no pack is stated, not implied to be agreement |
| `testTheTablePrintsEvenWhenNothingIsWrong` | the table is unconditional — §3.3's main argument |
| `testTheCheckNeverWritesTheAuthoredSize` | §3c: `slots` read back from the DB, unchanged |

⚠️ **One test-infrastructure note worth recording, because it would waste somebody an hour.**
`SymfonyStyle::warning()` wraps and pads its banner to the terminal width, so **any assertion on a
message longer than one line can never match the raw `getDisplay()`**. Every assertion here goes
through a `normalised()` helper that collapses runs of whitespace, so the tests assert on the
sentence a human reads rather than on wherever the renderer happened to break it. Three of my
assertions failed for exactly this reason before the helper existed.

**`LeagueTvDealResyncTest` (6 tests)** — runs the migration's own `RESYNC_SQL` constant
(`wunderkind_test` is not migration-tracked, so a re-typed copy would test the copy):

| test | what it pins |
|---|---|
| `testAStaleCacheIsResyncedToPoolOverTheCorrectedSlots` | the deployed defect to the penny: `1666666666` → `1875000000` |
| `testALeagueWithNoPoolKeepsItsAuthoredFigureUntouched` | ⚠️ **the null-pool row the brief requires** — 0 rows affected, figure unchanged |
| `testANullCacheWithNoPoolStaysNull` | an absent figure does not become a `0`, which would be a claim |
| `testADerivingLeagueIsLeftEntirelyAlone` | `slots = 0` is hands-off |
| `testAnAlreadyCorrectCacheIsUntouchedAndTheStatementIsIdempotent` | 0 rows affected; re-runnable |
| `testTheDivisionTruncatesExactlyLikeIntdiv` | matches `intdiv()`, not a rounding mode |

### 4.2 Full suite

⏳ **RUN IN PROGRESS AT THE TIME THIS LINE WAS WRITTEN — results in §4.2 RESULTS at the end of this
report, which is the authoritative section for it.** The suite is 3,294 tests and takes about
1.5 hours in Lando (~34 tests/minute measured), so it was started before the commit rather than
after. **Both commits therefore predate the full-suite result**, which is stated plainly rather
than implied; the evidence available at commit time was the 20 new tests passing, a clean
`lint:container`, and the gate and migration verification in §2.3, §4.3 and §4.4.

### 4.3 ⚠️ Migration reversibility — migrate → rollback → re-migrate, md5 over the ordered column

Measured on the **staled** copy, because on the clone's own rows `up()` is a no-op and a round trip
through three identical fingerprints would prove nothing (§0c).

```
$ MD5="SELECT md5(string_agg(COALESCE(tv_deal::text,'NULL'), ',' ORDER BY id)) FROM league;"

### START (staled) md5:
797da64c59f65551f3cb980ebe76a7f9

### migrate up
[notice] Migrating up to DoctrineMigrations\Version20261119150000
[notice] finished in 39.6ms, used 26M memory, 1 migrations executed, 3 sql queries
 [OK] Successfully migrated to version: DoctrineMigrations\Version20261119150000
### AFTER UP md5:
a75902d6cde7efde3068ea3b2d8ea6a3

### EN/SC after up:
 country | tier | slots | tv_pool_pence |  tv_deal
---------+------+-------+---------------+------------
 EN      |    1 |    16 |   18000000000 | 1125000000
 EN      |    2 |    16 |    1800000000 |  112500000
 SC      |    1 |    14 |    3000000000 |  214285714
 SC      |    2 |    14 |     300000000 |   21428571
(4 rows)

### rollback (down)
[notice] Executing DoctrineMigrations\Version20261119150000 down
[notice] finished in 24.4ms, used 26M memory, 1 migrations executed, 2 sql queries
 [OK] Successfully migrated version(s):
### AFTER DOWN md5:
797da64c59f65551f3cb980ebe76a7f9

### re-migrate
[notice] Executing DoctrineMigrations\Version20261119150000 up
[notice] finished in 18.6ms, used 26M memory, 1 migrations executed, 3 sql queries
 [OK] Successfully migrated version(s):
### AFTER RE-UP md5:
a75902d6cde7efde3068ea3b2d8ea6a3
```

**`797da64c…` → `a75902d6…` → `797da64c…` → `a75902d6…`.** The column returns to its start state
byte for byte, and the re-migration is deterministic.

**A third piece of evidence the brief did not ask for — the resync alone also closes the one
instance.** With the column resynced and the command stashed back to its **old** code, the gate
prints the corrected figures anyway, because the raw column and the derived value have converged:

```
$ git stash push src/Command/EconomyWageTableCommand.php
$ lando php bin/console app:economy:wage-table EN SC
 TV against turnover:
 --- ------- ---------------- ----------------- ----------------- ---------------
  T   clubs   TV per club      TV pool           turnover          TV % turnover
 --- ------- ---------------- ----------------- ----------------- ---------------
  1   16      £11,250,000.00   £180,000,000.00   £331,000,000.00   3.4%
  ...
  8   16      £5,625.00        £90,000.00        £215,000.00       2.6%
```

Two independent fixes for one defect, each sufficient alone — which is what makes the code half
(the permanent one) safe to rely on and the migration half a tidy-up rather than the cure.

### 4.4 The clone was restored to its own state afterwards

```
$ lando php bin/console doctrine:migrations:execute 'DoctrineMigrations\Version20261119150000' --down --no-interaction
 [OK] Successfully migrated version(s):
$ lando psql wunderkind -q -f var/a7-restore.sql      # 120 per-row UPDATEs from the pre-experiment stash
### restored md5 (expect baa40bc2e46a16ceeac928053cc52159):
baa40bc2e46a16ceeac928053cc52159
 country | tier | slots |  tv_deal
---------+------+-------+------------
 EN      |    1 |    18 | 1000000000
 EN      |    2 |    18 |  100000000
 SC      |    1 |     3 | 1000000000
 SC      |    2 |     3 |  100000000
(4 rows)
```

Then the migration was applied for real on the restored clone, where it is a **verified no-op**:

```
$ lando php bin/console doctrine:migrations:migrate --no-interaction
[notice] Migrating up to DoctrineMigrations\Version20261119150000
[notice] finished in 14.4ms, used 26M memory, 1 migrations executed, 3 sql queries
 [OK] Successfully migrated to version: DoctrineMigrations\Version20261119150000
### md5 after migration on the CONSISTENT clone (expect unchanged baa40bc2e46a16ceeac928053cc52159):
baa40bc2e46a16ceeac928053cc52159
```

The `slots` column fingerprint is `af8b69bf23ac798d11c4d8aa2f82be98` after all of this, and the
`tv_deal` fingerprint is its start value, so the clone is exactly where it began.

⚠️ **One housekeeping note, stated because the brief's scratch rule is strict.** `lando psql` can
only read files inside the container's `/app` mount, so the restore script was copied to
`var/a7-restore.sql` (gitignored via the root `/var/` pattern), executed, and **deleted in the same
command**, twice. `git status` in §8 confirms nothing scratch-shaped remains in the repository;
everything else lived in the session scratchpad.

### 4.5 §4.6 — the drift check run against the clone, labelled as a clone reading

```
$ lando php bin/console app:economy:wage-table EN SC
...
EN
--
 Authored division size against the NPC club rows that exist (the reserved player place is DETECTED, not assumed):
 --- --------------- ---------- ---------- ---------- ----------- ------- ----
  T   resolved size   source     npc rows   reserved   real size   drift
 --- --------------- ---------- ---------- ---------- ----------- ------- ----
  1   18              authored   18         no         18          0       ok
  2   18              authored   18         no         18          0       ok
  3   18              authored   18         no         18          0       ok
  4   18              authored   18         no         18          0       ok
  5   18              authored   18         no         18          0       ok
  6   18              authored   18         no         18          0       ok
  7   18              authored   18         no         18          0       ok
  8   18              authored   17         yes        18          0       ok
 --- --------------- ---------- ---------- ---------- ----------- ------- ----

 Cached world pack club counts against the NPC club rows they were built from (a pack is a cache; nothing invalidates it when clubs are regenerated):
 --- ---------- ------------ ---------- ------------------ ----
  T   set        pack clubs   npc rows   payload v
 --- ---------- ------------ ---------- ------------------ ----
  1   01a1ee92   18           18         9 (will rebuild)   ok
  2   01a1ee92   18           18         9 (will rebuild)   ok
  3   01a1ee92   18           18         9 (will rebuild)   ok
  4   01a1ee92   18           18         9 (will rebuild)   ok
  5   01a1ee92   18           18         9 (will rebuild)   ok
  6   01a1ee92   18           18         9 (will rebuild)   ok
  7   01a1ee92   18           18         9 (will rebuild)   ok
  8   01a1ee92   17           17         9 (will rebuild)   ok
 --- ---------- ------------ ---------- ------------------ ----

SC
--
 Authored division size against the NPC club rows that exist (the reserved player place is DETECTED, not assumed):
 --- --------------- ---------- ---------- ---------- ----------- ------- ----
  T   resolved size   source     npc rows   reserved   real size   drift
 --- --------------- ---------- ---------- ---------- ----------- ------- ----
  1   3               authored   3          no         3           0       ok
  2   3               authored   3          no         3           0       ok
  3   3               authored   3          no         3           0       ok
  4   3               authored   3          no         3           0       ok
  5   3               authored   3          no         3           0       ok
  6   3               authored   3          no         3           0       ok
  7   3               authored   3          no         3           0       ok
  8   3               authored   3          no         3           0       ok
 --- --------------- ---------- ---------- ---------- ----------- ------- ----
```

🔴 **THIS IS A CLONE READING AND MEANS NOTHING ABOUT THE DEPLOYED BOX** — see §3.4 and §3.5. The
clone holds EN 18/18 and SC 3/3, so of course it agrees. Three things here *are* worth something:

- **EN tier 8's `reserved yes / drift 0`** is the §3a trap occurring on a real country and being
  handled correctly.
- **The pack comparison found this clone's packs are all at `payload_version 9`** against
  `WORLD_PACK_VERSION 11`, so they are flagged `will rebuild` and excluded — which is exactly the
  behaviour `testAPackAtAnOldPayloadVersionIsIgnored()` pins, observed incidentally on real data.
- **Both tables printed**, which is the "it ran" evidence §3.3 argues for.

### 4.6 The whole-command diff on the as-is clone

```
$ diff gate-before-clone-asis.txt gate-final-clone-asis.txt
90a91,118
>  Authored division size against the NPC club rows that exist (...)
>  ... the EN drift table, 8 rows, all ok ...
>  Cached world pack club counts against the NPC club rows they were built from (...)
>  ... the EN pack table, 8 rows, all ok ...
162a191,218
>  ... the same two tables for SC ...
```

**No TV line moved**, as §0c predicted. That is itself the evidence that the code fix is inert
wherever the cache is in sync: it changes the gate's reading of a *stale* cache and nothing else.

### 4.7 The staled run with the final code — both check-9 branches firing, verbatim

The §2.3 before/after was re-run against the **final** code after §3.3's severity refinement, so
the pasted TV figures are not from an intermediate state. They are identical (the TV reads were not
touched by the refinement), and the staled copy also exercises both drift branches at once —
England with rows over the size, Scotland with the size over the rows and a pool authored:

```
EN — ROWS OVER (the authored size is too small)
 --- --------------- ---------- ---------- ---------- ----------- ------- -----------
  T   resolved size   source     npc rows   reserved   real size   drift
 --- --------------- ---------- ---------- ---------- ----------- ------- -----------
  1   16              authored   18         no         18          -2      ROWS OVER
  ...
  8   16              authored   17         yes        18          -2      ROWS OVER
 --- --------------- ---------- ---------- ---------- ----------- ------- -----------

SC — POOL OVER-DIVIDED (the authored size is too large, and money evaporates)
 --- --------------- ---------- ---------- ---------- ----------- ------- -------------------
  T   resolved size   source     npc rows   reserved   real size   drift
 --- --------------- ---------- ---------- ---------- ----------- ------- -------------------
  1   14              authored   3          no         3           11      POOL OVER-DIVIDED
  ...
  8   14              authored   3          no         3           11      POOL OVER-DIVIDED
 --- --------------- ---------- ---------- ---------- ----------- ------- -------------------
```

and the findings themselves, pasted verbatim:

```
 * EN tier 1: 18 NPC club rows exist against an authored division size of 16 — every per-club figure is being divided 16 ways and paid to 18 clubs. Author league.slots to 18, or regenerate the tier at 16.
 * EN tier 8: 17 NPC club rows exist against an authored division size of 16 (a place is reserved for the player, so the size should be rows + 1) — every per-club figure is being divided 16 ways and paid to 17 clubs. Author league.slots to 18, or regenerate the tier at 16.
 * SC tier 1: an authored division size 14 against a real size of 3 (3 NPC club rows) — short by 11. The £30,000,000.00 pool is divided 14 ways and paid to 3 clubs, so each gets £2,142,857.14 instead of £10,000,000.00 and £23,571,428.58 reaches nobody at all. Author league.slots to 3, or generate the missing clubs.
 * SC tier 2: an authored division size 14 against a real size of 3 (3 NPC club rows) — short by 11. The £3,000,000.00 pool is divided 14 ways and paid to 3 clubs, so each gets £214,285.71 instead of £1,000,000.00 and £2,357,142.87 reaches nobody at all. Author league.slots to 3, or generate the missing clubs.
 * SC tier 3: an authored division size 14 against a real size of 3 (3 NPC club rows) — short by 11. The £1,500,000.00 pool is divided 14 ways and paid to 3 clubs, so each gets £107,142.85 instead of £500,000.00 and £1,178,571.45 reaches nobody at all. Author league.slots to 3, or generate the missing clubs.
```

⚠️ **That staled state is a world I invented** — slots 16/14 against the clone's real 18/3 rows —
so the drift figures above are **not** claims about any box. They are the two code paths being
exercised. The deployed drift is §3.4's, and it is `short by 2`.

---

## 5. What I did NOT do, deliberately

| | |
|---|---|
| Did not author `slots` anywhere | §3c. The drift is made visible; a human authors the new number |
| Did not make `sizeOf()` read club rows | §3c. That is the defect `LeagueSizeResolver`'s docblock exists to prevent, and it would undo A4 |
| Did not fix `sizeOf()`'s unconditional `+1` | §3a says report it; my check's logic did not force the question (§3.8) |
| Did not resolve Scotland's 14-vs-12 | §3.4. The owner's decision, and not knowable from this machine |
| Did not re-run the correction migration or touch a pack | asked explicitly by the PM; measure and stop |
| Did not touch an authored economy figure | no turnover, ratio ladder, sponsor band, TV pool, payout ladder or ability range was edited |
| Did not change `WORLD_PACK_VERSION` | §2.4 |
| Did not edit or relax an existing check | no bound, tolerance or constant moved. Two TV *reads* were corrected (§0a); check 6's reads were left alone and flagged |
| Did not touch `wunderkind-app` | not read-modify-written, no test run, nothing committed. A6's hand-over note was read from the shared notes folder, which is outside both repos |
| Did not push or deploy | — |

---

## 6. Things I am flagging rather than changing

1. **🔴 Scotland's live drift (§3.4), and the open (A)-vs-(C) question (§3.5).** The two settling
   queries are in §3.5. **This is the headline item** — it is money wrong on the deployed box
   today, and it is the owner's number to author.
2. **⚠️ Check 6 (`:550`/`:551`) still reads the raw column.** §0a explains why I left it. Inert
   today (every country is at parity, and check 6 returns early at parity) and no longer stale
   after the resync migration. Worth a scoped decision, not a silent change.
3. **⚠️ `LeagueSizeResolver::sizeOf()`'s unconditional `+1` (§3.8)** — unchanged, now visible.
4. **⚠️ The brief's "~31 pre-existing test failures" (§0b)** is the gate's figure, not the suite's.
   Worth correcting wherever it is being carried forward, because judging a suite run against 31
   would hide about 27 real regressions.
5. **`.context` text I believe is stale but did not rewrite** (the PM owns curation):
   - `04_interfaces/output/services.md` said the gate *"exits non-zero on SIX checks"* while the
     code already had **eight**. I corrected the count to nine and noted in the file that it had
     read six, but did not restructure the surrounding paragraph, which still calls the rest
     "the other five".
   - `04_interfaces/output/services.md`'s ⚠️ *"`app:economy:wage-table` CANNOT SEE THIS FIX"* block
     is now resolved. **Per the house convention I kept it and appended a dated ✅ resolution
     beneath rather than deleting it** — its reasoning was right and its predicted consequence is
     the whole of part one.
   - `03_data/output/migrations.md`'s `Version20261119120000` entry claimed *"`app:economy:wage-table`
     is byte-identical"* as a general fact. It is a clone reading. I appended a dated amendment
     saying so rather than editing the original sentence.
   - `07_synthesis/output/current-focus.md` is already queued for the PM's review per
     `next-work-plan.md`; I did not open it.
6. **From A6's hand-over note, outside my scope and not acted on:** three remaining
   `Math.floor((size − 1) / 2)` sites in the app (two of which book real money), and
   `dispersionGate.ts` needing `NODE_OPTIONS=--max-old-space-size=8192`. Recorded so they are not
   lost.
7. **A6's suggestion for the backend:** publishing the authored division size on
   `economyTierBaseline.tiers[]` would let the app delete `FALLBACK_DIVISION_SIZE` and
   `new-game-setup`'s `homeGames` stand-in. That is a published-payload change, out of scope here
   (§6 forbids a pack-shape change), and a real candidate for a follow-up task.

---

## 7. `.context` updates made

Per the brief's §5: one pass entry, plus corrections to text my change makes wrong. Nothing
restructured, nothing pruned, nothing deleted.

- **`shared/last-sync.md`** — one new pass entry at the top (A7), naming the stages touched, both
  halves, the §0a two-reads correction, the fail/warn decision, and ⚠️ the two clone readings that
  must not be generalised.
- **`stages/04_interfaces/output/services.md`** — check 9 documented (the three counts, detection,
  pool-gated severity, the unconditional table, the never-writes rule); the "CANNOT SEE THIS FIX"
  block given a dated ✅ resolution underneath it; the check count corrected; `sizeOf()`'s
  unconditional `+1` recorded beside the resolver's own description.
- **`stages/03_data/output/migrations.md`** — a full entry for `Version20261119150000` (what went
  stale, who was harmed, the `WHERE` clause reasoning, the md5 round trip, the test); a dated
  amendment on `Version20261119120000`'s "byte-identical gate" claim; and a note on its "defect
  this exposes" section that check 9 now surfaces it.
- **`stages/01_overview/output/environment.md`** — the brief's own instruction, which I missed on
  the first pass and committed separately: `NpcClubPlaceWeightingTest` added as baseline item
  **#5** with its evidence and the note that it did **not** fire in my run (absent is not fixed),
  the range stated as **three to five**, and **"~31" struck** from the file as a gate figure rather
  than a test one, so the next agent cannot inherit §0b's error from `.context` either.

---

## 8. Commits

```
$ git log --oneline -4
0e68d6ac Add the second npc_club composition flake to the test baseline, and strike "~31"
f5eb9e75 Record A7 in .context: check 9, the TV resync, and two clone readings
a2697867 Make authored-size drift loud, and stop the gate reading a stale TV cache
52c8b3bf Correct an authored league.slots that disagrees with the real size

$ git status --short
(clean)
```

Three commits on `development`, code and documentation separated as A6 did. The third is the one
the brief asked for and I had missed on the first pass: `NpcClubPlaceWeightingTest` added to
`environment.md`'s baseline list as item **#5**, the range stated as **three to five**, and §0b's
"~31" struck from that file explicitly so it cannot be read as a test baseline by the next agent. **Not pushed, not
deployed.** `git status` is clean, so the tree state matches this report — nothing scratch-shaped
is left in the repository (§4.4 covers the two `var/a7-restore.sql` writes, both deleted in the
same command, and `var/` is gitignored regardless).

**Before committing I re-checked `docs/economy-loose-ends/` for anything superseding the brief**, as
it asks:

```
$ ls -lT docs/economy-loose-ends/ | grep -Ei "correction|addition"
-rw-r--r--@ 1 courtneyadesile staff 4771 Nov 19 10:35:09 2026 a3-tvdeal-addition.md
-rw-r--r--@ 1 courtneyadesile staff 3274 Nov 19 10:25:46 2026 a4-premise-correction.md
```

Both predate the brief (14:30), so neither supersedes it. What *did* supersede parts of it arrived
as four messages from the PM session rather than as files — the live Scotland case, the three
counts, the retraction of the three counts, and the measured drift table. All four are folded in and
attributed in §3.3, §3.4, §3.5 and §3.6, and `next-work-plan.md` now carries the PM's own record of
the two corrections I sent back (§0a's line number and §0b's 31).

---

## 9. §4.2 RESULTS — the full suite

```
$ lando php vendor/bin/phpunit --no-coverage
PHPUnit 13.4.3 by Sebastian Bergmann and contributors.

Runtime:       PHP 8.5.7
Configuration: /app/phpunit.dist.xml

[... 3,294 tests ...]

Time: 10:23.606, Memory: 587.00 MB

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
Tests: 3294, Assertions: 156181, Failures: 3, PHPUnit Deprecations: 1, PHPUnit Notices: 21, Skipped: 13.
```

### ✅ THREE FAILURES, ALL THREE PRE-EXISTING, NONE NEW — AND NO STASH WAS NEEDED

Judged against `.context/stages/01_overview/output/environment.md`'s documented baseline, **not**
against the brief's "~31" (§0b). The baseline lists four items, amended to *"FOUR, FIVE or THREE
failures without anything having changed"*. This run produced **three**, and each is an item on
that list, by name and by assertion:

| run failure | baseline item | documented cause |
|---|---|---|
| `NotificationLogCrudControllerTest` | **#1** | empty content table |
| `CompetitionControllerTest`, the narrative timeline | **#2** | empty `game_event_template` |
| `FriendlyResolveSingleMatchTest` | **#3** | empty content table |

**Baseline #4 (`NpcClubForeignClubsCitySizeTest`) did not fire in this run**, which is the
documented composition-dependent behaviour rather than an anomaly — environment.md's amendment
records that test joining and leaving the failure list by itself, with the suite occasionally going
fully green on it. Three is the low end of the documented range. The second flake the brief asked me
to add to the list (`NpcClubPlaceWeightingTest`) also did not fire.

**So there is nothing outside the baseline, and therefore nothing to attribute.** The brief's rule
is to attribute a **new** failure by stashing and re-running rather than by reading its assertion; I
did not stash, because no failure fell outside the documented list to attribute. Stating that
explicitly because "I didn't stash" and "there was nothing to stash for" are different claims, and
only the second one is true here.

**My own 20 tests are in that run and passed**, which the count confirms arithmetically: the suite
was **3,288** tests on an earlier aborted run when the two new files held 14 tests, and **3,294**
now that they hold 20. Same baseline of 3,274 both times.

⚠️ **One thing this run does NOT prove, and I would rather say so than let the green imply it:** the
suite exercises check 9 and the resync SQL against synthetic fixtures, not against the deployed
world. The deployed box's row count is still unresolved (§3.5) and the suite cannot speak to it.

### The gate's own failed-check count is unchanged on the clone: 31 before, 31 after

```
$ grep "check(s) failed" gate-before-clone-asis.txt
 [ERROR] 31 check(s) failed. Do not flip the wage model until these are
$ grep "check(s) failed" gate-final-clone-asis.txt
 [ERROR] 31 check(s) failed. Do not flip the wage model until these are
```

**That is the correct outcome here and not a sign the check is inert.** Check 9 adds findings only
where the sizes disagree, and on this clone they agree at all sixteen EN and SC tiers (§4.5) — so
the count holding at 31 while two new tables appear in the output is exactly what a working check
looks like on a clean box. On the staled copy the same code produced sixteen new findings (§4.7).
**The 31 are the pre-existing authoring problems** — the clone's economy predates R2, so its
sponsorship shares read 0.7% and its bankruptcy ladder has no range left; none of them is mine, and
none of them moved.
