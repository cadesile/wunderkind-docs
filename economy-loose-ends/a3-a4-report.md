<!-- STATUS --> **STATUS:** ✅ A3/A4 — resolved payouts, authored `slots`. DEPLOYED.

---

# A3 + A4 (+ A3b, A5) — phase 1 read-only report

**Branch `development`, HEAD `bac1228b`, 2026-11-19 00:15:02 +0000.** Working tree clean, exactly
2 commits ahead of `origin/development` and 0 behind — the expected held-push state. **Nothing has
been edited.** This is the §0 + §1 report the brief stops for.

Both repos' ICM: `.context/CONTEXT.md` read; all seven stages in `wunderkind-backend/.context`
are populated, so no warm was needed.

---

## 0. Code state, verbatim

```
$ git status
On branch development
Your branch is ahead of 'origin/development' by 2 commits.
  (use "git push" to publish your local commits)

nothing to commit, working tree clean

$ git fetch origin 'refs/heads/development:refs/remotes/origin/development' 'refs/heads/master:refs/remotes/origin/master'
(no output)

$ git log -1 --format='%H%n%h%n%ad%n%s' --date=iso
bac1228ba024b048aed2a7d7b845afdf8ac2dcd5
bac1228b
2026-11-19 00:15:02 +0000
Take the economy out of the world pack; WORLD_PACK_VERSION 10 -> 11

$ git rev-list --left-right --count origin/development...HEAD
0	2

$ git log --oneline origin/development..HEAD
bac1228b Take the economy out of the world pack; WORLD_PACK_VERSION 10 -> 11
71471578 Author the re-derived economy (R2), and amend two of the gate's payout bounds
```

---

## A3 — the trap is real, and the key name is the whole decision

**The defect is confirmed as described.** `LeagueImportExportService::export()` serialises the raw
columns (`src/Service/LeagueImportExportService.php:46-47`):

```php
'prizeMoney'           => $l->getPrizeMoney(),
'leaguePositionPot'    => $l->getLeaguePositionPot(),
```

**The trap is confirmed, and it is already armed** — `importLeagues()` writes both columns straight
back from the row (`:149-152`):

```php
if (array_key_exists('prizeMoney', $row))
    $league->setPrizeMoney($row['prizeMoney'] !== null ? (int) $row['prizeMoney'] : null);
if (array_key_exists('leaguePositionPot', $row))
    $league->setLeaguePositionPot($row['leaguePositionPot'] !== null ? (int) $row['leaguePositionPot'] : null);
```

So emitting resolved figures under those two keys without touching import would, on the next
round trip, convert all 196 inherits into per-league overrides exactly as the brief predicts.

### Two constraints that between them pick the shape

**1. The gate reads the key `prizeMoney`, and it is in the app.** Confirmed read-only in
`wunderkind-app` (branch `new-game-save`):

```
scripts/economy/variantGate.ts:330:    prize: FINISH === 1 ? Math.round((league?.prizeMoney ?? 0) * RESCALE) : 0,
scripts/economy/dispersionGate.ts:204:      prize: finish === 1 ? Math.round((league?.prizeMoney ?? 0) * RESCALE) : 0,
```

So "add the resolved figure under a new key and leave `prizeMoney` alone" **does not fix A3** — it
would need an app change, which is out of scope and another session's checkout. The resolved figure
has to arrive under the existing name.

**2. A mapped column must keep a key named after its property.** `LeagueImportExportRoundTripTest::testEveryMappedColumnIsExported`
is a reflection drift guard (`tests/Service/LeagueImportExportRoundTripTest.php:73-97`): every
`ORM\Column` property must appear in the export under its own property name. It checks presence,
not value — so `prizeMoney` may hold the resolved figure, but the key cannot be dropped or renamed.

### Recommended shape, and the explicit answer the brief asks for

- **Export:** `prizeMoney` / `leaguePositionPot` carry the **resolved** figures, via
  `LeaguePayoutResolver::prizeFor()` / `positionPotFor()` with one `GameConfig` fetched once —
  the chain `SyncService::buildLeagueSnapshot()` (`src/Service/SyncService.php:832-833`) and
  `InitializeController::leagues()` (`src/Controller/InitializeController.php:40-41` of that
  method) already use. Two **new** keys, `prizeMoneyOverride` and `leaguePositionPotOverride`,
  carry the raw nullable columns so the export stays a faithful backup.
- **Import — stated explicitly, as the brief requires: it must NOT write a resolved field.**
  Import reads only the `*Override` keys, verbatim, `null` → `NULL`. The resolved `prizeMoney` /
  `leaguePositionPot` keys are **ignored on import**, so a round trip leaves an inheriting league's
  columns NULL.
- **Legacy files keep working, keyed on presence not value.** When `prizeMoneyOverride` is absent
  the row predates this change, and import falls back to the legacy `prizeMoney` key. Every new
  export always emits the override key (even as `null`), so the fallback can only ever fire for a
  pre-change file — a resolved figure is never written to a column. This is the same
  `array_key_exists` idiom the file already uses for `trophy`/`trophyImage`.

**Why not simply ignore `prizeMoney` on import outright:** it would silently drop genuine overrides
out of an old backup. There are none in the world today — `LeaguePayoutResolver`'s docblock records
that all 24 eight-tier countries held a byte-identical ladder — but a backup an admin committed
months ago is exactly the case the `trophyImage` fallback exists for.

**One footgun to document rather than design away:** an operator hand-editing a new export to force
an override will reach for the obvious `prizeMoney` key and be ignored. The override key needs a
comment at the emit site saying which one is authoritative.

### `sponsorPot` — the brief asks for a key the gate does not read

`sponsorCount` is **already exported** (`:48`) and is what the gate uses:

```
scripts/economy/variantGate.ts:279:  // league-sponsor row off the same bands club sponsors use. `sponsorCount` is in the export.
scripts/economy/variantGate.ts:282:    sponsorCount: league?.sponsorCount ?? 0,
scripts/economy/dispersionGate.ts:201:        sponsorCount: league?.sponsorCount ?? 0,
```

The gate **rolls the pot itself** off the published bands; no gate or app path reads a `sponsorPot`
from the export. So that half of A3 is already satisfied by the key that is there, and a resolved
`sponsorPot` would be a new export-only key nothing consumes. It is also **asymmetric**:
`LeagueSponsor` rows are not in the export at all, so a clear-then-import restores no sponsors and
a `sponsorPot` would read N before and 0 after — pre-existing, but a resolved `sponsorPot` is the
first thing that would make it visible. **Recommend adding it only if the owner wants it for human
inspection**, clearly labelled derived-and-not-restored. Flagging rather than deciding.

---

## A4 — ⚠️ the premise does not hold on this clone, and that changes the landing

**`slots` is already authored on all 120 league rows here**, not 0:

```
$ psql -d wunderkind -c "SELECT l.country, COUNT(*) AS leagues, SUM(CASE WHEN l.slots > 0 THEN 1 ELSE 0 END) AS authored, MIN(l.slots), MAX(l.slots) FROM league l GROUP BY l.country ORDER BY l.country;"
 country | leagues | authored | min_slots | max_slots
---------+---------+----------+-----------+-----------
 AR      |       8 |        8 |        16 |        16
 BR      |       8 |        8 |        16 |        16
 CA      |       8 |        8 |         8 |         8
 DE      |       8 |        8 |        18 |        18
 EN      |       8 |        8 |        18 |        18
 ES      |       8 |        8 |        16 |        16
 FR      |       8 |        8 |        16 |        16
 IT      |       8 |        8 |        18 |        18
 JP      |       8 |        8 |         8 |         8
 NG      |       8 |        8 |         8 |         8
 NL      |       8 |        8 |        16 |        16
 PL      |       8 |        8 |         8 |         8
 PT      |       8 |        8 |        16 |        16
 SC      |       8 |        8 |         3 |         3
 US      |       8 |        8 |         8 |         8
(15 rows)
```

This is the local-clone/deployed-box divergence `.context` already records: the stop-the-line
measured **16 club rows per EN tier on the deployed box**, this clone has **18**. So A4's
"slots ships as 0" is true of the box the owner measured, not of this checkout.

**And authored does not equal derived — SC tier 8 proves it:**

```
$ psql -d wunderkind -c "SELECT l.country, l.tier, l.slots, COUNT(n.id) AS npc_rows, COUNT(n.id) + CASE WHEN l.tier = m.deepest THEN 1 ELSE 0 END AS derived FROM league l JOIN (SELECT country, MAX(tier) AS deepest FROM league GROUP BY country) m ON m.country = l.country LEFT JOIN npc_club n ON n.league_id = l.id WHERE l.country IN ('EN','SC') GROUP BY l.country, l.tier, l.slots, m.deepest ORDER BY l.country, l.tier;"
 country | tier | slots | npc_rows | derived
---------+------+-------+----------+---------
 EN      |    1 |    18 |       18 |      18
 EN      |    2 |    18 |       18 |      18
 EN      |    3 |    18 |       18 |      18
 EN      |    4 |    18 |       18 |      18
 EN      |    5 |    18 |       18 |      18
 EN      |    6 |    18 |       18 |      18
 EN      |    7 |    18 |       18 |      18
 EN      |    8 |    18 |       17 |      18
 SC      |    1 |     3 |        3 |       3
 SC      |    2 |     3 |        3 |       3
 SC      |    3 |     3 |        3 |       3
 SC      |    4 |     3 |        3 |       3
 SC      |    5 |     3 |        3 |       3
 SC      |    6 |     3 |        3 |       3
 SC      |    7 |     3 |        3 |       3
 SC      |    8 |     3 |        3 |       4
(16 rows)
```

**SC tier 8 is authored 3 but derives 4** (3 NPC rows + the player's slot). So "author `slots` to
each league's derived size" would **change** SC tier 8 from 3 to 4 — a real behaviour change, in
the one tranche whose whole promise is "byte-identical on the day it lands".

### Two consequences for the implementation

1. **The migration must write only where `slots = 0`.** An already-authored value is somebody's
   decision; overwriting it with a live club count is precisely the side effect A4 exists to
   abolish. This also makes the landing byte-identical on every box, which hardcoding cannot.
2. **The derived size must be computed in SQL at migration time, not hardcoded**, for the same
   divergence reason — the figure differs between this clone and the box, and the migration has to
   author whatever *its own* box currently derives. The derivation is expressible exactly as the
   query above (NPC rows per `league_id`, +1 where `tier = MAX(tier)` for that country, mirroring
   `LeagueSizeResolver::isBottomTier()`'s "deepest existing row" rule). Clamp with
   `LEAST(derived, 40)` and skip `derived = 0`, because raw SQL bypasses `League::setSlots()`'s
   floor-at-0/cap-at-40 and 0 still means derive.

### ⚠️ §2.1's verification cannot prove A4 on this clone

Because the migration writes nothing where `slots` is already authored, **it is a complete no-op
here** — so an unchanged `app:economy:wage-table` diff locally proves the command still runs, not
that A4 is correct. The proof has to be either a test that seeds a `slots = 0` league and asserts
the SQL authors its derived size, or the diff taken on the deployed dev box. I would write the test
and state the local diff for what it is. **I have not touched the deployed box** — the brief says
the owner is mid device-test against it; say the word if you want the read-only query run there.

**Editability is already satisfied, no work needed:** `LeagueAdminController:62-63` reads `slots`
from the quick-edit dialog and `templates/admin/_league_dialogs.html.twig:52` is the input, with
placeholder `derive` and blank → 0.

---

## A3b — ⚠️ the backend half is already built; what is missing is the authoring

**This is the finding that most changes the task.** §1's weeks-of-wages proposal was not left as a
proposal — `docs/economy-threshold-review.md:370` is headed **"Implemented 2026-11-13 —
`Version20261113120000`"**, and the code bears it out:

```
src/Entity/GameConfig.php:1019:    private ?array $bankruptcyDeductionWeeks = null;
src/Service/Economy/EconomyConfigPublisher.php:89:  'bankruptcyDeductionWeeks'  => $config->getBankruptcyDeductionWeeks(),
migrations/Version20261113120000.php:53:  $this->addSql('ALTER TABLE game_config ADD bankruptcy_deduction_weeks JSON DEFAULT NULL');
templates/admin/game_config.html.twig:533:  <label for="bankruptcyDeductionWeeks">Deficit Ladder in WEEKS of wages (JSON)</label>
src/Command/EconomyWageTableCommand.php:1162:  'bankruptcyDeductionWeeks row %d sits behind an unbounded row — it can never be reached.'
```

Column, publisher, admin textarea, setter normalisation and gate check 5 all exist. The column
**ships `null`**, and null means "the app uses its own ladder". So the remaining backend work is
**one authoring migration**, not a design or a build — which matches the brief's own words,
"author and publish the new figure here".

The five rows §1 specifies are already canonical under `normaliseDeductionWeeks()`, whose contract
is contiguity — `weeksMin` of each row equals `weeksMax` of the one before
(`src/Entity/GameConfig.php`, the docblock at :1009-1015). The proposed ladder
(1→2, 2→4, 4→8, 8→16, 16→null) satisfies that exactly, so it will store unaltered and gate check 5
should report it clean. **I think §1 is right and have no substitute design to offer.**

**Do not touch `bankruptcyDeductionTiers`**, including its unreachable rows 4 and 5: §1 calls that
"a value change and therefore not made here", the brief calls the proposal "explicitly additive",
and the review records that `bankruptcyDeductionTiers` "remains the ladder for `legacy`". The
unreachable rows stop mattering under the weeks ladder because it is contiguous by construction.

⚠️ **The one thing to confirm before authoring, and it is not inert.** Authoring the column flips
every client from its own built-in constant to the server's ladder. §1 says "the shape was agreed
with the app team… the rows above are what both sides implement", so it *should* be a no-op — but
that is a claim, not a measurement, and it is the kind that has been wrong before. It needs the
app's constant read and compared, read-only, in `wunderkind-app`. **If they differ, authoring is a
live behaviour change and I will stop and report rather than land it.** No app edit either way.

---

## A5 — ⚠️ diagnosed with certainty: neither of the brief's two hypotheses. It is cross-test leakage.

Reproduced on a clean tree:

```
$ lando php vendor/bin/phpunit --no-coverage --filter testMoneyIsConvertedToPoundsAndNullsSurvive tests/Service/WorldOverviewServiceTest.php
PHPUnit 13.4.3 by Sebastian Bergmann and contributors.

Runtime:       PHP 8.5.7
Configuration: /app/phpunit.dist.xml

F                                                                   1 / 1 (100%)

Time: 00:01.581, Memory: 46.50 MB

There was 1 failure:

1) App\Tests\Service\WorldOverviewServiceTest::testMoneyIsConvertedToPoundsAndNullsSurvive
an unset tier must stay null, not become 0
Failed asserting that 200000000 is null.

/app/tests/Service/WorldOverviewServiceTest.php:159

FAILURES!
Tests: 1, Assertions: 5, Failures: 1.
```

**The mechanism.** `WorldOverviewService:97` deliberately resolves the figure rather than reading
the column:

```php
// RESOLVED through LeaguePayoutResolver, so an inherited tier reads as
// the figure it will actually pay rather than as an unauthored dash.
'prizeMoney'        => self::pence($this->leaguePayoutResolver->prizeFor($league)),
```

The test seeds SE tier 2 with NULL money columns and calls it "unfunded". Under NULL-means-inherit
that league is not unset — it inherits. `self::pence()` is `intdiv($value, 100)`.

**Where 200000000 comes from — exactly.** The shared test database's `game_config`:

```
$ psql -d wunderkind_test -c "SELECT economy_league_prize_tier1_pence AS prize_base, economy_league_position_pot_tier1_pence AS pot_base, economy_prize_tier_ratio_ppm AS prize_ratio FROM game_config;"
 prize_base  |  pot_base   |                          prize_ratio
-------------+-------------+---------------------------------------------------------------
 10000000000 | 10000000000 | [1000000,2000000,1000000,1000000,1000000,1000000,1000000,424]
(1 row)
```

`10_000_000_000 pence × 2_000_000 ppm / 1e6 = 2e10 pence`, and `intdiv(2e10, 100)` =
**200,000,000**. The figure is accounted for to the penny.

**Whose values those are.** Not the shipped defaults — the entity ships
`economyLeaguePrizeTier1Pence = 0` (`src/Entity/GameConfig.php:2071`) and a flat parity ladder
(`:2141`), and base 0 makes the resolver return null, which is why the test ever passed. They are
`EconomyAdminTest`'s, written through the real admin save and never restored:

```
tests/Controller/Admin/EconomyAdminTest.php:324:  self::assertSame(2000000, $this->config()->getEconomyPrizeTierRatioPpm()[1], 'stored exactly as typed');
tests/Controller/Admin/EconomyAdminTest.php:305:  self::assertSame(10_000_000_000, $this->config()->getEconomyLeaguePrizeTier1Pence());
tests/Controller/Admin/EconomyAdminTest.php:283:  'prizeTierRatioPpm'       => [1 => '309000', 7 => '424'],
```

The DB row is the **union of those writes**: tier 2 = 2000000 from the resolved-payout-card test,
tier 8 = 424 from the index-safety test, base 1e10 from the bases test. `wunderkind_test` is not
migration-tracked (`environment.md`), so this state is not a migration's doing — it is persisted
test residue, which is why it fails **identically every time and in isolation** rather than
alternating like the `NpcClubForeignClubsCitySizeTest` flake.

**So, answering the brief's question directly: the production behaviour is right, the assertion's
intent is right, and `WorldOverviewServiceTest`'s own fixture is innocent.** The conversion does
not coerce null to zero, and this test's fixture has not drifted. A *different* test's unrestored
write to the single shared `game_config` row is the cause.

**The fix I would make — and it is not relaxing the assertion.** Make
`WorldOverviewServiceTest` own the payout config for its duration: stash the two bases and both
ratio ladders in `seededOverview()`, set the bases to 0 (the shipped "unauthored" state the
assertion is actually about), and restore in the teardown. That is **precisely the discipline this
test already applies to `CountryProfile` live statuses** for the same shared-database reason —
`tests/Service/WorldOverviewServiceTest.php:61-63`: *"PLAYABLE IS NOW THE COUNTRY PROFILE'S LIVE
STATUS… so isolating this test means owning the set of live profiles for its duration."* The test
simply never learned it had to own the economy config too, which it did not when it was written.

Making `EconomyAdminTest` restore what it writes is the broader fix and would stop this recurring
for the next reader of that row, but it touches a test that is not mine to re-scope in this
tranche. **Flagging it rather than doing it** — say if you want it in.

Either way it leaves `environment.md`'s baseline list, because it becomes a passing test rather
than a documented failure.

---

## What I have not done

- Nothing edited. No commit, no push, no deploy.
- No `app:economy:wage-table` run yet — §2's before/after pair should be captured either side of
  one edit session, not separated by an approval gate.
- No full `phpunit` run yet, for the same reason.
- No query against the deployed dev box, and no write of any kind to `wunderkind-app`.
- No `.context` edits — those come with the work, per §3.

## The three things I need from you

1. **A3's key names** — `prizeMoneyOverride` / `leaguePositionPotOverride` for the raw columns,
   with the resolved figures taking `prizeMoney` / `leaguePositionPot`. Approve or rename.
2. **A4** — agreement that the migration writes only where `slots = 0` and computes in SQL, so
   SC tier 8 keeps its authored 3 rather than being moved to 4. And whether to read the deployed
   box.
3. **A3b** — whether to author the ladder given the backend is already built, and whether I may
   read the app's built-in constant (read-only) to confirm the no-op claim first.

---
---

# PHASE 2 — implemented, after the owner's four rulings

**Approved 2026-11-19**, and these are the four decisions the work was built on:

| # | decision | taken |
|---|---|---|
| A3 keys | Resolved on the existing keys + new `*Override` for the raw columns | as recommended |
| A4 rule | Write **only where `slots = 0`**, computed in SQL | as recommended — SC tier 8 keeps its authored 3 |
| A3b | Read the app's constant read-only first, then author | as recommended |
| A4 proof | A test running the migration's own SQL; state the local diff honestly | as recommended |

## A3b's gate, discharged first — the app's ladder is byte-identical

The condition on authoring was that the app's own constant match. Read read-only from
`wunderkind-app` (branch `new-game-save`, no edit made), `src/economy/insolvency.ts`:

```
export const BANKRUPTCY_WEEKS_LADDER: readonly BankruptcyWeeksTier[] = [
  { weeksMin: 1,  weeksMax: 2,    points: 3  },
  { weeksMin: 2,  weeksMax: 4,    points: 6  },
  { weeksMin: 4,  weeksMax: 8,    points: 10 },
  { weeksMin: 8,  weeksMax: 16,   points: 20 },
  { weeksMin: 16, weeksMax: null, points: 50 },
] as const;
```

Byte-identical to §1's five rows, so authoring moves no client's behaviour. The same file settles
the intent explicitly (`:30-39`):

```
 * ── THE LADDER IS NOW A DEFAULT, NOT A CONSTANT (changed 2026-11-14) ──────────────────────
 *
 * The backend proposed publishing `bankruptcyDeductionWeeks` and deliberately did not, because a
 * key is worth nothing until a client consumes it and the shape should be agreed first. It now
 * publishes the key — as `null` — so the client half exists: `resolveWeeksLadder` reads it when
 * it is a valid ladder and falls back to `BANKRUPTCY_WEEKS_LADDER` otherwise.
 *
 * **While the published value stays null the behaviour is byte-identical to before**, which is
 * the property the tests pin. Once a real ladder is published the mechanic becomes tunable
 * without an app release, which is the whole argument for the rest of the config block.
```

So authoring is not merely safe, it is the step the app was built waiting for. **A3b cleared, and
no app change is needed.**

## What landed

| file | what |
|---|---|
| `src/Service/LeagueImportExportService.php` | A3 — resolved payouts out, `*Override` keys in, import reads only the overrides |
| `migrations/Version20261119090000.php` | A4 — author `league.slots` where 0, computed in SQL, stash + exact `down()` |
| `migrations/Version20261119091000.php` | A3b — author `bankruptcy_deduction_weeks`, stash + exact `down()` |
| `tests/Service/LeagueImportExportRoundTripTest.php` | A3 — 4 new tests incl. the round-trip trap and resolver equality |
| `tests/Service/Economy/LeagueSlotsAuthoringTest.php` | A4 — new, runs the migration's own SQL |
| `tests/Service/WorldOverviewServiceTest.php` | A5 — the test now owns the payout config |

`WORLD_PACK_VERSION` is **unchanged at 11**. Neither migration is a pack-shape change.

## §2.1 — `app:economy:wage-table EN SC`, before and after

⚠️ **The brief asks for "must exit 0 and be unchanged". Exit 0 is not achievable on this clone and
was not achievable before I touched anything** — the command exits 1 with **31 pre-existing
failures** on a clean tree at `bac1228b`. That is consistent with `r2-closeout-report.md`, which
already records this as "the backend check that could never be run on the local Lando box". The
failures are input-level (16-vs-18 club rows, sponsor bands against R2 turnover, and the bankruptcy
pence ladder), not authoring.

**So the achievable half of §2.1 is "unchanged", and that is proven exactly.** Both runs captured
with the two migrations applied / not applied:

```
$ lando php bin/console app:economy:wage-table EN SC   # BEFORE, clean tree @ bac1228b
exit=1
$ lando php bin/console app:economy:wage-table EN SC   # AFTER, both migrations applied
exit=1

$ diff before.txt after.txt
(no differences)
```

**Byte-identical, zero lines of difference.** Both runs end:

```
 [ERROR] 31 check(s) failed. Do not flip the wage model until these are
         resolved.
```

Two things that follow, and both were predicted:

1. **A4's authoring is invisible here because it wrote nothing** — see below. So this diff shows
   check 8's divisor is unmoved and the command still runs; it is NOT the proof that the authoring
   is correct. That proof is `LeagueSlotsAuthoringTest`.
2. **A3b's authoring added no gate line**, which means check 5 reads the new weeks ladder as clean
   — no gaps, no overlaps, no unreachable rows, an unbounded final row. The seven pre-existing
   bankruptcy problems are all about `bankruptcyDeductionTiers`, which is deliberately untouched,
   so they survive and should.

The seven surviving bankruptcy lines, for the record — these are the pence ladder and remain open
by design:

```
 * EN tier 1: the harshest bankruptcy band (£40,000.01) is reached in 0.01 weeks of unpaid wages (£3,238,043.29/wk) — the ladder has no range left here.
 * EN tier 2: the harshest bankruptcy band (£40,000.01) is reached in 0.04 weeks of unpaid wages (£1,115,217.28/wk) — the ladder has no range left here.
 * EN tier 3: the harshest bankruptcy band (£40,000.01) is reached in 0.12 weeks of unpaid wages (£338,478.10/wk) — the ladder has no range left here.
 * EN tier 4: the harshest bankruptcy band (£40,000.01) is reached in 0.20 weeks of unpaid wages (£202,499.87/wk) — the ladder has no range left here.
 * EN tier 5: the harshest bankruptcy band (£40,000.01) is reached in 0.56 weeks of unpaid wages (£71,608.54/wk) — the ladder has no range left here.
 * bankruptcyDeductionTiers row 4 has deficitMax null behind another unbounded row — under first-match-wins it can never be reached.
 * bankruptcyDeductionTiers row 5 has deficitMax null behind another unbounded row — under first-match-wins it can never be reached.
```

## The two migrations, applied locally — what they actually did

```
$ lando php bin/console doctrine:migrations:migrate --no-interaction
[notice] Migrating up to DoctrineMigrations\Version20261119091000
[notice] finished in 106ms, used 26M memory, 2 migrations executed, 6 sql queries

 [OK] Successfully migrated to version: DoctrineMigrations\Version20261119091000
```

**A4 wrote nothing, exactly as predicted** — every row still matches its own stash:

```
$ psql -d wunderkind -c "SELECT COUNT(*) AS rows_changed FROM league l JOIN league_slots_pre_authoring_backup b ON b.league_id = l.id WHERE l.slots <> b.slots;"
 rows_changed
--------------
            0
(1 row)
```

**A3b authored the ladder, and it stored unaltered** by `normaliseDeductionWeeks()` — which is the
check that the proposed rows were already canonical:

```
$ psql -d wunderkind -c "SELECT bankruptcy_deduction_weeks FROM game_config;"
 [{"weeksMin":1,"weeksMax":2,"points":3},{"weeksMin":2,"weeksMax":4,"points":6},{"weeksMin":4,"weeksMax":8,"points":10},{"weeksMin":8,"weeksMax":16,"points":20},{"weeksMin":16,"weeksMax":null,"points":50}]
(1 row)
```

## §2.3 and §2.4 — A3's round trip and resolver equality

```
$ lando php vendor/bin/phpunit --no-coverage tests/Service/LeagueImportExportRoundTripTest.php
PHPUnit 13.4.3 by Sebastian Bergmann and contributors.

Runtime:       PHP 8.5.7
Configuration: /app/phpunit.dist.xml

..........                                                        10 / 10 (100%)

Time: 02:59.842, Memory: 157.00 MB

OK (10 tests, 84 assertions)
```

Four are new:

- **`testARoundTripLeavesAnInheritedLeaguesPayoutColumnsNull()`** — §2.3, the trap. Exports a
  league with NULL payout columns, re-imports it, asserts both columns are **still NULL**. It also
  asserts the export was carrying a non-null resolved figure first, so it cannot pass vacuously on
  a box with no authored ladder.
- **`testAFreshExportsPayoutsEqualTheResolver()`** — §2.4, equality against
  `LeaguePayoutResolver::prizeFor()` / `positionPotFor()`, not merely non-zero.
- **`testAnExplicitOverrideSurvivesTheRoundTripAsAnOverride()`** — a real override must not be
  flattened into an inherit by the new keys.
- **`testALegacyFileWithoutTheOverrideKeysStillRestoresItsColumns()`** — strips the `*Override`
  keys to simulate a pre-change backup and asserts the fallback restores the override.

## A4's proof — `LeagueSlotsAuthoringTest`

```
$ lando php vendor/bin/phpunit --no-coverage tests/Service/Economy/LeagueSlotsAuthoringTest.php
PHPUnit 13.4.3 by Sebastian Bergmann and contributors.

Runtime:       PHP 8.5.7
Configuration: /app/phpunit.dist.xml

....                                                                4 / 4 (100%)

Time: 00:29.622, Memory: 44.50 MB

OK (4 tests, 10 assertions)
```

It executes **the migration's own statement**, read off `Version20261119090000::AUTHOR_SQL` after
requiring the file by path — migrations are deliberately not autoloaded
(`config/packages/doctrine_migrations.yaml`), and `wunderkind_test` is not migration-tracked, so
the migration cannot otherwise be reached and a re-typed copy of the SQL would be testing the copy.
The four properties pinned:

1. **Every resolved size is unchanged** after authoring, including the bottom tier's `+1`
   (16/16/15 NPC rows → sizes 16/16/16, before and after).
2. **An authored value is never overwritten, even when it disagrees with the count** — seeded in
   the exact SC tier-8 shape (authored 3, derives 4) and asserted to stay 3.
3. **An empty non-bottom tier is left deriving** at 0, because authoring a 0 would author nothing
   while looking like a decision.
4. **A club whose country disagrees with its league's is not counted**, mirroring
   `NpcClubRepository::countsByLeagueForCountry()`'s own country filter — a join on `league_id`
   alone would author a divisor one club too large.

## A5 — fixed at the cause, and the assertion was not touched

```
$ lando php vendor/bin/phpunit --no-coverage tests/Service/WorldOverviewServiceTest.php
PHPUnit 13.4.3 by Sebastian Bergmann and contributors.

Runtime:       PHP 8.5.7
Configuration: /app/phpunit.dist.xml

.........                                                           9 / 9 (100%)

Time: 00:20.717, Memory: 46.50 MB

OK (9 tests, 22 assertions)
```

`seededOverview()` now stashes both tier-1 payout bases, sets them to 0 — the shipped
"unauthored" state the assertion is actually about — and restores them, which is precisely the
discipline the test already applied to the live `CountryProfile` statuses. **The assertion text and
strictness are unchanged**; only the fixture's ownership of shared state changed.

⚠️ **`EconomyAdminTest` still does not restore `game_config` after writing to it through the admin
save.** That is the upstream cause and it will catch the next test that depends on an unauthored
economy. Flagged in `environment.md` with the general rule — `game_config` and `starter_config` are
single shared rows and a test depending on their contents must own them — but **not fixed**, since
re-scoping that test is outside this tranche. Say if you want it.

## `.context` — appended, not restructured

Per §3, a pass entry on `shared/last-sync.md` plus corrections only where this change makes stage
text wrong:

- **`shared/last-sync.md`** — one new entry at the top, newest-first as the file is ordered.
- **`01_overview/output/environment.md`** — the known-failures baseline now records the fifth,
  unlisted failure as **fixed**, with its cause, so nobody re-diagnoses it; plus the general
  shared-row lesson and the standing `EconomyAdminTest` caveat.
- **`03_data/output/migrations.md`** — both new migrations documented in the file's existing style.
- **`04_interfaces/output/services.md`** — `LeagueImportExportService`'s entry now states that the
  export's `prizeMoney` is **not** the column and that only the `*Override` keys are read on
  import.

Nothing restructured, nothing pruned, no earlier entry rewritten.

### One thing flagged rather than changed, per §3

`next-work-plan.md`'s queue row 9 gates A3b on "worth doing only if insolvency is reachable — #6
decides that". The owner's 2026-11-19 confirmation supersedes that gate and the brief says so, but
the queue row still reads the old way. **Not edited** — that file is the project-manager session's,
and §3 says to flag superseded text rather than correct it.

## Reversibility — both `down()` paths exercised, not assumed

Both migrations claim an exact rollback from a stash. That was tested rather than trusted, by
rolling both back and re-applying.

**The stashes captured what they claim:**

```
$ psql -d wunderkind -c "SELECT (SELECT COUNT(*) FROM league_slots_pre_authoring_backup) AS slots_stash_rows, (SELECT COUNT(*) FROM league) AS league_rows, (SELECT COUNT(*) FROM bankruptcy_weeks_pre_authoring_backup) AS weeks_stash_rows, (SELECT bankruptcy_deduction_weeks IS NULL FROM bankruptcy_weeks_pre_authoring_backup ORDER BY id LIMIT 1) AS stashed_was_null;"
 slots_stash_rows | league_rows | weeks_stash_rows | stashed_was_null
------------------+-------------+------------------+------------------
              120 |         120 |                1 | t
(1 row)
```

All 120 league rows stashed, and the weeks stash holds the pre-authoring **NULL** — which is why
A3b's `down()` deliberately has no `COALESCE`: NULL is that column's own meaningful state.

**A3b rolled back:**

```
$ lando php bin/console doctrine:migrations:migrate 'DoctrineMigrations\Version20261119090000' --no-interaction
 [OK] Successfully migrated to version: DoctrineMigrations\Version20261119090000

$ psql -d wunderkind -c "SELECT bankruptcy_deduction_weeks IS NULL AS restored_to_null FROM game_config;"
 restored_to_null
------------------
 t
```

**A4 rolled back, and the authored values came back from the stash rather than being reset to 0:**

```
$ lando php bin/console doctrine:migrations:migrate 'DoctrineMigrations\Version20261118120000' --no-interaction
 [OK] Successfully migrated to version: DoctrineMigrations\Version20261118120000

$ psql -d wunderkind -c "SELECT SUM(CASE WHEN slots > 0 THEN 1 ELSE 0 END) AS authored, (SELECT slots FROM league WHERE country='SC' AND tier=8) AS sc_t8 FROM league;"
 authored | sc_t8
----------+-------
      120 |     3
(1 row)

$ psql -d wunderkind -c "SELECT to_regclass('league_slots_pre_authoring_backup') AS slots_tbl, to_regclass('bankruptcy_weeks_pre_authoring_backup') AS weeks_tbl;"
 slots_tbl | weeks_tbl
-----------+-----------
           |
(1 row)
```

All 120 still authored and **SC tier 8 still 3**, both stash tables dropped. That is the property
that matters: a rollback must not reset an authored column to "derive", which would lose decisions
the migration never made.

**Re-applied, leaving the box in the landed state:**

```
$ lando php bin/console doctrine:migrations:migrate --no-interaction
 [OK] Successfully migrated to version: DoctrineMigrations\Version20261119091000

$ psql -d wunderkind -c "SELECT (SELECT COUNT(*) FROM league l JOIN league_slots_pre_authoring_backup b ON b.league_id=l.id WHERE l.slots<>b.slots) AS slots_changed, (SELECT bankruptcy_deduction_weeks IS NOT NULL FROM game_config) AS weeks_authored, (SELECT slots FROM league WHERE country='SC' AND tier=8) AS sc_t8;"
 slots_changed | weeks_authored | sc_t8
---------------+----------------+-------
             0 | t              |     3
(1 row)
```

## §2.2 — the full suite, and the one failure that needed attributing

```
$ lando php bin/phpunit --no-coverage
............................................................. 3233 / 3266 ( 98%)
.................................                             3266 / 3266 (100%)

Time: 10:50.374, Memory: 533.00 MB

There were 5 failures:

1) App\Tests\Controller\Admin\NotificationLogCrudControllerTest::testIndexRowIsClickableToADetailPageShowingTheFullPayload
The row for this log entry should be present.
Failed asserting that 0 is greater than 0.

2) App\Tests\Controller\Api\CompetitionControllerTest::testShowIncludesResultsOnceRoundsAreProcessed
a freshly generated result must carry a non-empty narrative timeline
Failed asserting that an array is not empty.

3) App\Tests\Repository\NpcClubForeignClubsCitySizeTest::testFindForeignClubsReturnsCitySizeFields
expected the persisted club to appear in findForeignClubs results
Failed asserting that null is not null.

4) App\Tests\Repository\NpcClubForeignClubsCitySizeTest::testFindForeignClubsHandlesDefaultCitySizeFields
Failed asserting that null is not null.

5) App\Tests\Service\Friendly\FriendlyResolveSingleMatchTest::testResolvingAnAcceptedChallengeRecordsAFullResult
Failed asserting that an array is not empty.

Tests: 3266, Assertions: 156067, Failures: 5, PHPUnit Deprecations: 1, PHPUnit Notices: 21, Skipped: 13.
```

✅ **`WorldOverviewServiceTest` is NOT in that list — A5 is fixed, confirmed in a full run.** None
of the 14 new tests failed.

Failures 1, 2 and 5 are baseline items #1, #2 and #3 verbatim (empty content tables). **3 and 4 are
both methods of baseline #4, where the documented baseline has only one** — so by the brief's rule
that was attributed by stashing rather than by assertion, because my new `LeagueSlotsAuthoringTest`
creates and deletes `npc_club` rows and that test is documented as sensitive to the shared
database's `npc_club` count.

**First, the cheap check: the Repository suite alone, where none of my tests run.**

```
$ lando php vendor/bin/phpunit --no-coverage tests/Repository          # WITH my changes
Tests: 39, Assertions: 88, Failures: 2, PHPUnit Deprecations: 1.

$ git stash push -u -m "a3-a4-attribution-probe"
$ lando php vendor/bin/phpunit --no-coverage tests/Repository          # CLEAN tree
Tests: 39, Assertions: 92, Failures: 1, PHPUnit Deprecations: 1.
```

⚠️ **That looked like my change: 2 with, 1 without.** It is not. Repeating the identical command on
the still-stashed clean tree shows the count is simply not stable:

```
CLEAN isolated run 1: Tests: 3, Assertions: 11, Failures: 1.
CLEAN isolated run 2: Tests: 3, Assertions: 7,  Failures: 2.
CLEAN isolated run 3: Tests: 3, Assertions: 7,  Failures: 2.
CLEAN Repository suite run 1: Tests: 39, Assertions: 88, Failures: 2, PHPUnit Deprecations: 1.
CLEAN Repository suite run 2: OK, but there were issues! Tests: 39, Assertions: 96, PHPUnit Deprecations: 1.
CLEAN Repository suite run 3: Tests: 39, Assertions: 88, Failures: 2, PHPUnit Deprecations: 1.
```

**On a clean tree, with nothing changing between runs, the same test gives 1, then 2, then 2 —
and the Repository suite gives 2, then ZERO, then 2.** So `testFindForeignClubsReturnsCitySizeFields`
joins and leaves the list by itself and the whole suite can go green. The stash was then popped and
all ten paths restored.

**Conclusion: 5 failures is the baseline in a different mood, not a regression.** The baseline
entry understated this — it said "alternates methods by run composition", which invites exactly
the wrong inference when the composition *has* changed because you added tests.
`environment.md`'s entry #4 has been amended with the measured runs above and the instruction to
re-run two or three times on the same tree before suspecting a change.

---

## The commit

```
$ git log --oneline -3
603ea577 Stop four numbers being side effects: resolved payouts, authored slots
bac1228b Take the economy out of the world pack; WORLD_PACK_VERSION 10 -> 11
71471578 Author the re-derived economy (R2), and amend two of the gate's payout bounds

$ git status --short
(clean)

$ git rev-list --count origin/development..HEAD
3
```

**Committed, not pushed.** `development` is now 3 ahead of `origin/development`, holding the two
commits the owner was already holding plus this one. Nothing deployed, nothing pushed, and the
deployed dev box was never touched or queried.

## Against the brief's "Do not" list

| instruction | status |
|---|---|
| Do not push, do not deploy | ✅ committed only; 3 ahead, unpushed; no deploy |
| Do not pick a division size | ✅ A4 authors the current derived count; 16-vs-20 untouched |
| Do not regenerate or purge clubs | ✅ none generated or deleted |
| Do not touch any authored economy figure | ✅ turnover, ratio ladders, sponsor bands, TV, ability ranges all untouched — proven by the byte-identical gate diff |
| Do not change `WORLD_PACK_VERSION` | ✅ unchanged at 11; neither migration is a pack-shape change |
| Do not edit or relax any check in `EconomyWageTableCommand` | ✅ file untouched |
| Backend only; do not cross into `wunderkind-app` | ✅ two files read read-only (`insolvency.ts`, the gate scripts); **no app file written** |
| Nothing scratch-shaped inside either repository | ✅ `git status --porcelain` is empty; this report lives here, throwaway work in the session scratchpad |

## Open items handed back

1. **`EconomyAdminTest` does not restore `game_config`.** The upstream cause of A5, still live, and
   it will catch the next test that depends on an unauthored economy. Flagged in `environment.md`
   with the general rule; not fixed, as re-scoping that test is outside this tranche.
2. **`next-work-plan.md` queue row 9** still gates A3b on "worth doing only if insolvency is
   reachable — #6 decides that", superseded by the owner's 2026-11-19 confirmation. Not edited —
   that file is the project-manager session's, and §3 says to flag rather than correct.
3. **A4's real effect is still unmeasured on the deployed box.** It writes nothing here, so what it
   will author there is known only by derivation (EN at 16/tier per the stop-the-line). The
   read-only query was offered and declined for this pass; worth running before or just after the
   deploy so the authored figures are recorded rather than inferred.
4. **The gate cannot reach exit 0 on this clone**, and has not been able to for longer than this
   work. 31 failures at `bac1228b`: the 16-vs-18 club-row divergence, sponsor bands against R2
   turnover, three wage-inversion lines at tiers 7–8, and the seven bankruptcy pence-ladder lines.
   None are this tranche's, and `r2-closeout-report.md` already names the box as the only place
   that check means anything. **It is worth deciding whether the local gate run is evidence at all,
   rather than re-discovering it every time.**
