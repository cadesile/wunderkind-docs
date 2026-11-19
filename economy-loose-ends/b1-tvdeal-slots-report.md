<!-- STATUS --> **STATUS:** ✅ B1/B2/B3. DEPLOYED.

---

# REPORT — B1 / B2 / B3, done in the PM session

**Repo:** `wunderkind-backend` · **Branch:** `development` · **Base:** `603ea577` ·
**Date:** 2026-11-19 · **Working tree clean at start and at finish.**

**Two commits, neither pushed. Now 5 ahead of `origin/development`.**

| | |
|---|---|
| `e2c855c6` | Publish tvDeal resolved, so a pooled league stops paying £0 of TV *(B1 + B2)* |
| `52c8b3bf` | Correct an authored league.slots that disagrees with the real size *(B3)* |

---

## 1. B1 — four publication sites, not three

The brief named three. **There are four**: `LeagueImportExportService::export()`,
`InitializeController:243`, `SyncService::buildLeagueSnapshot():826` **and `LeagueService:302`**,
which builds its own league snapshot and had the same omission. All four already resolved
`prizeMoney` / `leaguePositionPot` and published `tvDeal` raw, directly beside them.

`tvDeal` now reads `derivedTvDealPence($l) ?? $l->getTvDeal()` at all four. The export also gains
**`tvDealOverride`** (the raw column) and `import()` prefers it, keyed on **presence not value**,
so a resolved share can never reach a column while a pre-change backup still restores through the
bare key. Third key in that contract after the payout pair.

Corroboration found while working, worth keeping: **`LeagueTierDefaultDiff:103` already states the
rule** — *"tvDeal IS DERIVED WHEN A POOL IS AUTHORED"* — and skips comparing it for exactly that
reason. The codebase already knew; only the publication paths didn't.

### The four new tests were each proved meaningful

Stashing **only** the four source files and re-running made all four fail with the defect's own
messages, then pass with the fix restored:

```
2) LeagueImportExportRoundTripTest::testAPooledLeagueExportsTheDerivedShareNotItsNullColumn
   the export published the raw NULL column instead of the derived per-club share
   Failed asserting that null is identical to 100000.
3) ...testARoundTripLeavesAPooledLeaguesTvDealColumnNull
4) ...testAnUnpooledLeagueExportsItsAuthoredDealUnchanged
1) SyncServiceLeagueTest::testAPooledLeagueWithNoAuthoredDealPublishesTheDerivedShare  (:323)
```

⚠️ **`SyncServiceLeagueTest::testAPooledLeaguePublishesBothFigures` already existed and did NOT
catch this.** Its fixture authors `tvDeal` at exactly the derived figure, so it passed before the
fix and said nothing about it. The uncovered case was a **NULL** column, which is the live one.

### 🔴 `app:economy:wage-table` is structurally blind to this fix

It reads `$league->getTvDeal()` off the entity (`EconomyWageTableCommand:459`), not a published
surface. **Byte-identical before and after**, verified by stashing the four files and diffing two
full runs. *An unchanged gate is not evidence that nothing moved here* — the command cannot see the
defect that zeroed a division's TV income.

**Also recorded:** on this clone the gate **exits 1 with 31 pre-existing check failures**
(sponsorship band at 13 tiers, the bankruptcy ladder traversed in 0.01 weeks, rows 4/5
unreachable), identical before and after my work. **The brief's "must exit 0" was wrong for this
box; "unchanged" is the bar.** Those failures predate `603ea577`.

## 2. B2 — comment only, and provably so

`Version20261119090000`'s docblock claimed *"on the deployed box — where `slots` is 0 — it authors
the counts that box is already using."* Only **4 of 200** rows are 0 there. Corrected, with what
the box actually holds.

```
$ git diff migrations/Version20261119090000.php | grep -E "^[+-]" | grep -vE "^[+-] \*|^\+\+\+|^---"
(no output)
```

**No code line changed.** The `only where 0` guard meant the behaviour was always right.

## 3. 🔴 B3 — the brief's rule was wrong and would have corrupted 6 rows

**This is the finding of the batch.** The brief said to target `rows + 1 if bottom tier`, taken
from `LeagueSizeResolver::sizeOf()`. A dry-run of that rule on the clone:

```
 country | tier | slots | derived
---------+------+-------+---------
 CA      |    8 |     8 |       9
 JP      |    8 |     8 |       9
 NG      |    8 |     8 |       9
 PL      |    8 |     8 |       9
 SC      |    8 |     3 |       4
 US      |    8 |     8 |       9
```

**Cause:** the generator reserves a place for the player at the deepest tier **on some boxes and
not others.**

| | tiers 1–7 rows | deepest-tier rows | reserved? |
|---|---|---|---|
| EN (clone) | 18 | **17** | yes → `slots = 18` correct |
| CA / US / SC (clone) | 8 / 8 / 3 | **8 / 8 / 3** | **no** → `+1` is a phantom club |

So `sizeOf()`'s unconditional `+1` overstates any unreserved country, and **the previous session's
refusal to overwrite SC's authored 3 was right for a better reason than it knew: 3 is correct and
the derived 4 is the bug.**

The migration now **detects** the reservation — `rows + 1` only at the deepest tier *and* only
where it holds exactly one fewer row than the tier above; `rows` otherwise. A single-tier country
cannot demonstrate a reservation and is treated as unreserved.

### Proven a no-op on this clone, not asserted

`slots` column md5, at every stage of migrate → rollback → re-migrate:

```
d56d40bd232d2d31ebe7342f47e76b16   (before, after, after rollback, after re-migrate)
rows_changed against the stash: 0        stash dropped on down(): t
SC tier 8 after rollback: 3              app:economy:wage-table: byte-identical
```

The migration's own `CORRECT_SQL`, run inside a transaction, reported `rows_changed=0`.

`LeagueSlotsCorrectionTest` runs that same constant and covers the reserved shape, the
**unreserved** shape (the row the naive rule broke), the `slots = 0` hands-off case, and
idempotency.

### On the deployed box it will change 12 rows — expect the gate to move

EN tiers 1–8 18 → 16, SC tiers 1–4 18 → 14. Per-club payout figures rise 12.5% / 28.6%. **No
payout money moves** — `LeaguePayoutResolver` never divides by size. What moves is check 8's
arithmetic, the published `clubCount`, and the app's `tvPoolPence / clubCount` cross-check.
⚠️ **That rise may breach check 8's `PAYOUT_SHARE` bounds on the deployed box. If it does, that is
a finding for the owner, not a bound to relax.**

## 4. Tests

`3274 tests, 3 failures` — **baseline items 1, 2 and 3 exactly** (the three empty-content-table
failures), with item **4 contributing zero**, which `environment.md`'s amended entry says it does.
3270 before B3's four tests. No regression at any point.

## 5. Open, reported and deliberately not fixed

1. 🔴 **`sizeOf()`'s unconditional `+1` is a latent defect** for any `slots = 0` league on an
   unreserved box. Inert today: the only deriving leagues are SC tiers 5–8 on the deployed box,
   which *do* reserve. Fixing the resolver is wider than a data correction.
2. **`LeagueSlotsCorrectionTest` runs an unfiltered `UPDATE` against the shared test database**,
   as `LeagueSlotsAuthoringTest` already does. Verified harmless — `wunderkind_test` holds only
   synthetic single-tier countries and **0 rows would change** — but it is a shared-state hazard by
   construction. Filtering the SQL would mean testing a modified copy, which both tests
   deliberately avoid.
3. **A6** (the gate's `homeGames`) and the EN/SC `slots` deploy consequences remain app-side and
   owner-side respectively. Untouched here.
