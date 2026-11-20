<!-- STATUS: ✅ DEPLOYED TO DEV TWICE — OTA 488 and 489, 2026-11-20 -->

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
$ diff a23-run-2026-11-19/variantGate-EN.AFTER.txt deploy-run-2026-11-20/variantGate-EN.AFTER.txt
   (empty)
```

Same invocation A23 used. A23's AFTER was itself byte-identical to its BEFORE, so **England is
provably unmoved by A23 AND by A26.** Output kept as `deploy-run-2026-11-20/variantGate-EN.AFTER.txt`.

⚠️ My md5 (`a56bc740…`) does not match the hashes A26 quoted (`c5941b30…` / `aff1aacd…`); those
came from its own invocation with different arguments, so the two are not comparable. **The
diff against A23's recorded run is the proof, not the hash.**

### 🟢 Scotland IS gate-coverable after all — the blocker was ONE missing file

A23's report, and mine after it, said Scotland could not be gated because no SC-resolved config
export existed. **It is one HTTP GET.** `loadExport`'s own refusal message says so and nobody
followed it:

```bash
curl -s "https://api.dev.buildmyclub.co.uk/api/game-config?country=SC" -o game-config-sc.LIVE.json
```

`starter-config.LIVE.json` needs no SC variant — it carries `leagueAbilityRanges` for **both**
countries. The world export already holds all 25. **So Scotland was one file away from being
gated for the whole workstream.** Saved here as `deploy-run-2026-11-20/game-config-sc.LIVE.json`.

### ✅ What the Scotland gate says about A23 — measured BEFORE and AFTER

Run in a throwaway worktree at `39b3c884` (A26 in, A23's app half out) against the same inputs:

| tier | matchday BEFORE | matchday AFTER | everything else |
|---|---|---|---|
| 1 | 11.4% | **9.7%** | identical |
| 2 | 28.9% | **24.4%** | identical |
| 3 | 36.3% | **30.8%** | identical |
| 4 | 54.4% | **46.1%** | identical |

🟢 **A23's app half moves the matchday column and NOTHING else.** TV, shirt, club sponsor,
league sponsor, prize and position are byte-identical. That is home games going 13 → 11 —
exactly what the change claims, and no side effects. Coverage barely moves (644.8% → 643.0% at
t1).

⚠️ TV does not move here because the app-side gate reads the **published** `tvDeal` off the
2026-11-19 world export, which predates the backend half. A23's divisor change shows once the
backend deploys and a fresh export is taken.

### 🔴 Scotland's absolute coverage is 643–1188% — but DO NOT act on that number yet

The gate reports COVERAGE outside 85–110% at **all four** tiers, with TV at 410% and league
position at 191–920% of authored turnover. **Pre-existing: identical before and after A23, so
neither A23 nor A26 causes any of it.**

🔴 **The inputs are mismatched and that alone could explain it.** Measured:

- the 2026-11-19 world export holds **SC at 8 tiers** (1–8)
- today's `game-config?country=SC` baseline holds **4 tiers**

So the gate priced a 4-tier ladder against an 8-tier world: its "tier 4" is the BOTTOM of the
authored ladder but a MID-table division in the export, with mid-table grounds and gates. That
is the obvious candidate for a 920% position figure.

**Before anyone treats this as a finding, re-run with a world export taken from the rebuilt dev
box.** It also does not reconcile with the ~172% at SC t4 already on the open list, which is a
second reason to distrust it. Evidence kept as `variantGate-SC.{BEFORE,AFTER}-A23.txt`.

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


---

## ✅ DEPLOYED, 2026-11-20

All three gate conditions passed before anything was pushed.

| | result |
|---|---|
| **Backend suite**, combined tree | **3,257 tests**, 3 failures — the three proven pre-existing by A23's stash-and-rerun. Reconciles exactly: A23's 3,238 + 11 + 3 + 5 |
| **App suite**, committed tree | **648 / 10,816 passed**, 10,819 collected, 3 skipped, `--listTests` 648, `tsc` zero errors |
| **Economy gate** | England byte-identical to A23's recorded run. Scotland measured for the first time: A23's app half moves the matchday column only |

### Commits

| repo | work | commit |
|---|---|---|
| backend | A26 scout ability | `54525433` |
| backend | A23 retire slots | `7ac99686` |
| backend | **merged to `dev`** | **`d1cf0734`** |
| app | A26 scout ability | `39b3c884` |
| app | A23 retire slots (app half) | `4ea3c5be` |
| app | **merged to `dev`** | **`fe4217f6`** |

**OTA run 488**, head `fe4217f6`. The splash and debug header show the build number and short
SHA — look for `488 fe4217f`.

### On device, to confirm

1. **A23** — CHECKS: `SC t4  divisor 12 · clubs 12 · home games 11`. This is the ONLY
   confirmation Scotland's 14 → 12 landed; it is still outside gate coverage for a before/after.
2. **A26** — scouts carry an ability, 1–100, distinct from experience. Dev box measured at
   5,278 scouts spanning 11–48, none at the floor.
3. **No salary should move.** If one has, that is a regression.
4. Pack version 12 — every cached pack re-fetched on first launch.

### ⚠️ Two things that are deployed but LATENT

1. **A26's `SeasonBudgetService` fix does nothing today.** `anchorAmpStaffWages` early-returns
   unless income anchoring is on, which derives from `wageModel === 'turnover'`, and the live
   `economy_wage_model` is `legacy`. The corrected figure bites when anchoring is switched on —
   the same release A24 lands. **It will read as a new bug if it surprises somebody.**
2. **A23's TV change is backend-side.** The app gate reads the published `tvDeal`, so Scotland's
   per-club TV only moves once a fresh world export is taken from this deploy.

### 🔴 Found during this run, needs an owner ruling, NOT deployed as a fix

**`ageGateFor` reads the `youth` and `senior` judgements, which no real scout carries.** All
5,278 have the five-key set. So it has returned 0 for every scout since it was written, and
**the age distinction in scouting accuracy has never happened.** A26 annotated it and left it
alone, correctly — it is a simulation change. See `a26-scout-ability-report.md`.

### Not verified

No real save on dev, no forced v12 pack rebuild inspected, no browser check of the admin field,
and no test persisting a `Scout` through Doctrine to prove the lifecycle subscriber fires
(registration and `lint:container` are verified; the behaviour is not).


---

## Later the same day — committed, NOT deployed

| repo | work | commit | state |
|---|---|---|---|
| backend | `bond_decay_floor` 50 → 20 | `d8376d94` | ✅ suite green (3,257, three known failures) |
| app | A28 part 1 — manager noise decoupled from scouts | `4719b469` | proven no-op (3,840-case grid) |
| app | A28 part 2 — spread 40, `MAX_BOND_BIAS` 12 | `0c52ec6c` | 650 / 10,832, `--listTests` 650 |

### ✅ Both deployed to dev, 2026-11-20 (second deploy of the day)

| repo | `dev` merge | carries |
|---|---|---|
| app | **`1ff6fd56`** — ✅ **OTA run 489, success** | A28 both parts, and the MANAGER PERCEPTION CHECKS row |
| backend | **`52490221`** | the bond-decay-floor change |
| backend | **`c7c32027`** (third push) | A26's `preUpdate` subscriber — `c05d54a7`, 3,264 tests |

⚠️ **The backend half is a formality on this box.** `bond_decay_floor` was already 20 in the dev
DATABASE — the migration ran when it was written. Pushing stops `dev` and `development` drifting
apart; it changes nothing the owner will see.

⚠️ **`bond_decay_floor` is already 20 on the dev DATABASE** — the migration ran there when it
was written. The commit records it; the dev box does not need the deploy to have the new floor.
The APP changes do need one.

### 🔴 The test database is not migration-tracked — FOURTH instance, and I caused this one

`doctrine:migrations:migrate --env=test` fails with *"relation admin already exists"*, so a
schema change must be applied to `wunderkind_test` by hand. A26 recorded this three times today
and I wrote it into this very file — then ran the suite without doing it and spent a run finding
out. `SchemaIsInSyncTest` failed, plus one unrelated-looking error
(`LeaderboardHallOfFameTest`) which **vanished once the DB was fixed** — so a half-migrated test
DB produces failures that do not point at the cause.

For this change:

```bash
lando php bin/console dbal:run-sql "ALTER TABLE game_config ALTER bond_decay_floor SET DEFAULT 20" --env=test
```

```bash
lando php bin/console dbal:run-sql "UPDATE game_config SET bond_decay_floor = 20 WHERE bond_decay_floor = 50" --env=test
```

**The general lesson, now paid for four times: after ANY schema change, apply it to
`wunderkind_test` by hand BEFORE running the suite, and do not try to attribute failures until
you have.**

### 🔴 Open finding from A28, needs an owner ruling

**`PERCEIVED_MIN` is 1 and the manager's error is symmetric, so near the floor the pessimistic
half of the draw truncates and the manager reads systematically HIGH.** Measured over the real
`leagueAbilityRanges` at scouting range 20: a true-ability-2 player reads **+1.42 high**, with
**44% of weeks clamped** at 1 — against +0.57 and 36% at the old spread.

Confined to tiers 7–8 (true ability under ~10) and negligible from tier 6 up. **Pre-existing;
spread 40 makes it 3–5× larger where it applies.**

✅ **OWNER RULED, 2026-11-20: *"that is fine."*** Accepted, not a defect. Do not "fix" the
truncation, add an asymmetric draw at the floor, or lower `PERCEIVED_MIN` to compensate —
the floor is deliberate (a rating of exactly 0 reads as "no data", not "very bad") and the
owner has seen the measured figures and accepted them. **Recorded so it is not reopened as a
bug by someone who rediscovers the skew.**

### Two documentation figures A28 found wrong

The docblock arguing for the decay-floor change cited seeded bonds topping out at 45 and organic
growth of 2/week. Live: `SEED_COACH_POSITIVE_RANGE` is **[10, 35]** (45 appears nowhere in
`BondSeedService`) and `bondOrganicGrowthDelta` is **5**/week. **The conclusion held; the stated
reasons did not.** Recorded, not fixed.


### OTA 489 — the day's second app deploy

`gh run list` reports **489 success**, head `1ff6fd56`. Splash shows `489 1ff6fd5`.

**On device, to confirm:** CHECKS → **MANAGER PERCEPTION**. It prints the live
`bondDecayFloor` read from the synced config (expect **20**) and how many bond rows sit at or
below it — the manager-bond count nobody could measure from source, because it exists only on
the device.

---

## 🔴 Two operational traps found on 2026-11-20 — both cost real time

### 1. `wunderkind_test` is not migration-tracked (fourth instance, above)

### 2. A background wait loop that can never match, and the session looks busy forever

**Symptom:** `archive_session` refuses with *"still has live work"* while the session itself
honestly reports idle. Both statements are true.

**Cause (A26, self-diagnosed):** `until grep -qE "…" out.txt; do sleep N; done` loops started as
background tasks to wait on long backend runs. **The patterns could never match, so they looped
forever.** Seven of them, spinning since 09:30.

🔴 **Why the patterns could not match — the bit worth keeping.** PHPUnit colourises each FIELD
of its summary line separately:

```
^[[37;41mTests: 3257^[[0m^[[37;41m, Assertions: 156378^[[0m^[[37;41m, Failures: 3^[[0m…
```

So `^Tests: ` fails (the line starts with an escape) **and** `Tests: [0-9]+, Assertions` fails
too — there is `\e[0m\e[37;41m` between the `3257` and the comma. An unanchored pattern is NOT
safe. Reading greps got away with it only where a `.*` happened to span the escapes.

**Rules:**
- Pass **`--colors=never`** to phpunit whenever the output will be machine-read, or strip ANSI
  before matching.
- **Never trust an unanchored grep against a colourised summary line.**
- When a session will not archive and claims idle, check the process table:
  `ps aux | grep "[s]leep"`. A stuck background task is invisible from inside the session.

⚠️ **"Still has live work" and "I am idle" can BOTH be honest.** The session sees its own
conversation state; the harness sees its processes. Do not assume a refusal means the session
is lying or that the tool is wrong.

---

## 🟢 The scout `ability` subscriber — a test request that found a defect

I asked A26 to close the one gap it had flagged: nothing proved
`ScoutAbilityLifecycleSubscriber` actually fires, only that it was registered. I asked for an
UPDATE case specifically, since generation-time tests never reach that path.

**The UPDATE case could not pass as specified, and that was the finding.** The subscriber was
`prePersist` ONLY, and the behaviour was *documented* as deliberate — an admin edit does not
re-derive, with `app:backfill-scout-abilities --force` as the remedy.

🔴 **But `ScoutCrudController` makes `experience` and `judgementsJson` EDITABLE while `ability`
is read-only.** So an operator could move an input and leave the derived figure stale, with
nothing recording that the two disagree. **Under A24 that is a wrong wage.** Expecting an
operator to remember a command is not a mechanism.

**Fixed:** a `preUpdate` hook. `ability` is now a true function of its inputs on every write, and
the read-only intent is **enforced** rather than merely presented — an `ability` written by any
route is corrected on flush.

### The principle that came out of it, worth reusing

`weeklySalary` was deliberately NOT given the same treatment: its admin help says it is *"set by
hand here only to override one scout"*, so auto-recomputing it would destroy the override that
is its purpose.

> **The test is whether a field is an OVERRIDE or a DERIVATION — not whether it happens to be
> derived at generation time.**

✅ **Verified non-vacuous:** with the two listener attributes disabled, all 7 new tests fail.
A26 checked that rather than assuming it, which is the whole point of adding them.
