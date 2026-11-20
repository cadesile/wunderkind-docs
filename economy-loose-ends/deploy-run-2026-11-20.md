<!-- STATUS: 🏗️ IN PROGRESS — app committed, backend pending A26 (2026-11-20) -->

# Deploy run, 2026-11-20 — A23 + A26 to dev

**Owner instruction: deploy to dev once A26 lands.** Running record.

## State

| | app (`new-game-save`) | backend (`development`) |
|---|---|---|
| **A26** | ✅ `39b3c884` | ⏳ pending — full suite re-running after two self-caught bugs |
| **A23** | ✅ `4ea3c5be` | ⏳ waiting on A26's commit; 14 files + staged `EconomyDerivedSizeDriftTest.php` |

App tree clean. Both local `dev` branches level with `origin/dev`.

## 🔴 `wunderkind_test` is NOT migration-tracked — run these before any backend suite

Third recorded instance of this trap. ⚠️ **It cost 4 errors, not the 19 first reported** — A26
corrected itself after comparing its own two runs (20 errors before the column, 16 after; the
other 16 were a new constructor argument). The 19 came from pattern-matching the 2026-11-02
incident, where 35 of 36 errors had one cause.

🔴 **That correction changes the practical lesson, and for the worse.** 2026-11-02 was a wall of
identical red, which is what `environment.md` trained people to look for. This time the missing
column was a MINORITY of the noise and would have been easy to dismiss as fallout from the real
bug. **Check `information_schema.columns` for your new column regardless of how the failures
look.**

**Order matters, the column is `NOT NULL`.** Also in the backend's `environment.md`.

```bash
lando php bin/console dbal:run-sql "ALTER TABLE scout ADD COLUMN IF NOT EXISTS ability INT" --env=test
```

```bash
lando php bin/console dbal:run-sql "UPDATE scout s SET ability = GREATEST(1, LEAST(100, ROUND(CASE WHEN j.mean IS NULL THEN GREATEST(1, LEAST(100, s.experience::numeric)) ELSE 0.7 * GREATEST(1, LEAST(100, s.experience::numeric)) + 0.3 * GREATEST(1, LEAST(100, j.mean)) END))) FROM (SELECT sc.id, (SELECT AVG(e.value::numeric) FROM jsonb_each_text(sc.judgements::jsonb) AS e(key, value) WHERE e.value ~ '^-?[0-9]+(\.[0-9]+)?$') AS mean FROM scout sc) AS j WHERE j.id = s.id" --env=test
```

```bash
lando php bin/console dbal:run-sql "UPDATE scout SET ability = 1 WHERE ability IS NULL" --env=test
```

```bash
lando php bin/console dbal:run-sql "ALTER TABLE scout ALTER COLUMN ability SET NOT NULL" --env=test
```

```bash
lando php bin/console dbal:run-sql "ALTER TABLE scout ALTER ability SET DEFAULT 1" --env=test
```

⚠️ The middle two are no-ops on an empty test DB — run them anyway so a seeded one is handled.

## ⚠️ A schema fact the owner should know

A26's migration originally ended `DROP DEFAULT`, copying `Version20261119190000`. That
precedent applies to a column whose **entity declares no default**, where the DB default IS the
drift. `Scout::$ability` declares `default => 1`, so dropping it was drift the other way, and
`SchemaIsInSyncTest` caught it. **The rule is "the DB must match the entity", not "always drop
the default"** — now written into the migration's docblock.

⚠️ **The migration had already run**, so the corrected default was applied to the dev and test
databases **by hand**. The migration is correct for any fresh run; dev's schema matches it
because someone made it match. Recorded so a future schema mismatch on dev is not a mystery.

## ✅ APP HALF: GREEN, measured on the COMMITTED tree

Run by the PM session after `39b3c884` (A26) and `4ea3c5be` (A23) were both in, so this is a
clean-HEAD figure, not the working-tree one A26 had to report.

```
npx tsc --noEmit                 exit 0, zero errors
Test Suites:  648 passed, 648 total
Tests:        3 skipped, 10816 passed, 10819 total
npx jest --listTests | wc -l     648
```

**Reconciles exactly** against A23's 647 / 10,802 / 10,805: +1 suite, +14 tests
(`scoutAbility.test.ts` 13, plus one case in `bootstrap.test.ts`). Confirms A26's working-tree
figure was right.

### 🟢 England economy gate: byte-identical

```
$ diff a23-run-2026-11-19/variantGate-EN.AFTER.txt deploy-run-2026-11-20-gate-EN.txt
   (empty)
```

Same invocation A23 used. A23's AFTER was itself byte-identical to its BEFORE, so **England is
provably unmoved by A23 AND by A26.** Output kept as `deploy-run-2026-11-20-gate-EN.txt`.

⚠️ My md5 (`a56bc740…`) does not match the hashes A26 quoted (`c5941b30…` / `aff1aacd…`); those
came from its own invocation with different arguments, so the two are not comparable. **The
diff against A23's recorded run is the proof, not the hash.**

⚠️ **Scotland is still not gate-covered** — no SC-resolved config export exists. Unchanged from
A23's report; the device CHECKS line is the confirmation.

## Verification gate — nothing is pushed until all of this passes

1. Backend suite on the combined tree, `--filter '/^(?!.*AdminShellCoverage).*$/'` (a full run
   OOMs at ~183/3305). Expected **3,257** (was quoted as 3,249, then 3,252, as A26 added
   coverage — take the figure from its final report, not from here). Three failures are
   proven pre-existing (A23 stashed the whole change and re-ran to confirm).
2. ✅ **DONE** — app suite 648 / 10,816, `--listTests` 648, `tsc` clean, England gate
   byte-identical. See the section above.
3. Economy gate measured and any movement explained. A26 proved in a throwaway worktree that
   the movement belongs to A23, not itself — HEAD `c5941b30…` and HEAD+A26 `c5941b30…` are
   byte-identical, the full tree is `aff1aacd…`.

## Then

Merge `development` → `dev` and `new-game-save` → `dev`, push both, and report the OTA build
number and short SHA.

## What lands on the dev box

- **Scotland 14 → 12** at every tier; per-club TV, sponsor and prize all rise. England unmoved.
- **`WORLD_PACK_VERSION` 11 → 12** — every cached pack invalidated and re-fetched.
- **Staff renewals possible again** (`c73bf9a8`).
- **Scouts carry a derived ability**, 70/30 experience to judgement mean. **No salary moves** —
  that is A24, still blocked behind part B.
- CHECKS line confirming A23: `SC t4  divisor 12 · clubs 12 · home games 11`.
