<!-- STATUS: 🟢 REVIEWED — ACCEPT WITH CAVEATS. The work is correct and independently re-measured. Two report claims are wrong (§5, §6) and one caveat is bigger than stated (§4). -->

# A27 — PM review

**Verdict: ACCEPT WITH CAVEATS. No defect found in the change.**

The migration is correct, idempotent and verbatim where it claims to be. The `ability`
re-derivation did exactly what the report says — I re-derived all 5,278 rows from scratch against
the formula and found **zero disagreements**, and reproduced the distribution to the decimal. The
"the app needed no functional change" claim is true, and I verified it by a method independent of
the one the report used. The `youth`/`senior` roll is defensible and I can now say so from
measurement rather than from reasoning.

The caveats are three: **the fix does not reach any existing save's club or NPC scouts** and the
report understates that (§4); **the "70% of designed" figure is exact only for a club with no
scouting facilities** (§7); and **two factual claims in the report about
`GenerateMarketDataCommand` are wrong** (§6) — harmlessly, but they are repeated in `.context` and
in three code comments.

Reviewed against the code and the live dev database at backend `3e1555c5` / app `6fb687a0`, not
against the report.

---

## 1. The core derivation is correct, and I re-measured it rather than trusting the backfill

The rule as ruled: `ability = clamp(1, 100, round(0.7 × experience + 0.3 × judgementMean))`, **mean
over keys PRESENT**.

I re-derived the column from the raw `judgements` blobs with my own SQL and counted disagreements:

```
$ lando php bin/console dbal:run-sql "SELECT … count(*) … WHERE s.ability <> x.expected …"
 -------------------- ---------------- ----------------------- ------------------
  distinct_keycounts   keycount_range   ability_disagreements   experience_range
 -------------------- ---------------- ----------------------- ------------------
  1                    7-7              0                       4-34
 -------------------- ---------------- ----------------------- ------------------
```

🟢 **Zero disagreements across 5,278 rows.** 🟢 **Exactly one distinct key count in the whole table,
and it is seven** — no row left behind, none double-written, which is the stronger form of the
report's "5,278 of 5,278" claim.

And the distribution, measured independently:

```
 -------- ----------- ------------ -------- -------- --------- -------
  scouts   has_youth   has_senior   min_ab   max_ab   mean_ab   sd_ab
 -------- ----------- ------------ -------- -------- --------- -------
  5278     5278        5278         12       47       29.11     6.76
 -------- ----------- ------------ -------- -------- --------- -------
```

**Matches the report's "after" row to the decimal** — 12–47, mean 29.11, sd 6.76. The narrowing it
attributes to a mean of seven draws having less variance than a mean of five is the right
explanation and the numbers bear it out.

🟢 **The PHP and the SQL genuinely agree, and the agreement is structural rather than lucky.** I
read `ScoutAbilityCalculator::abilityFor()` against the migration's statement line by line: both
clamp `experience` to 1–100 before blending, both treat *no numeric judgements* as "experience is
the whole estimate" rather than averaging against a fabricated zero (`WHEN j.mean IS NULL THEN
GREATEST(1, LEAST(100, s.experience::numeric))`), both clamp the mean into 1–100 before weighting,
both clamp the result, and both round half-away-from-zero — PHP via its exact-integer path
(`(7·e·n + 3·Σj) / 10n`), Postgres via `NUMERIC`. The one divergence is which strings count as
numeric (PHP's `is_numeric` accepts `1e5` and `.5`; the SQL regex does not), which the calculator
already documents as best-effort on a path generation cannot produce.

🟢 **"Verbatim copy of `Version20261120100000`'s SQL" — verified mechanically, not read.** I
extracted the `UPDATE scout s SET ability …` statements from both migrations and compared:

```
100000 count 1 · 120000 count 2
0 verbatim match to a 100000 statement: True
1 verbatim match to a 100000 statement: True
IDENTICAL to first
```

Both the `up()` and the `down()` statement are byte-identical to A26's. The docblock's instruction
to keep them that way is the right call and is currently honoured.

---

## 2. The migration is idempotent, and the one way it is not does not matter

```sql
WHERE NOT jsonb_exists(s.judgements::jsonb, 'youth')
   OR NOT jsonb_exists(s.judgements::jsonb, 'senior')
```

🟢 **Row-granular idempotency holds**: a row carrying both keys is untouched, so a partially-applied
run repeats safely without re-rolling anybody's values. That is the property the docblock claims and
it is the one that matters.

⚠️ **It is not key-granular.** The predicate is `OR` while the `SET` writes both keys through `||`,
so a row holding `youth` but not `senior` would have its existing `youth` value **overwritten with a
fresh roll**. That state is unreachable — the only writers set both keys together — so this is a
note, not a finding. Worth knowing before someone hand-patches a single key.

🟢 **The bounds arithmetic is right.** `cfg.lo + floor(random() * (cfg.hi - cfg.lo + 1))::int`
yields `[lo, hi]` inclusive, matching `random_int($min, $max)` at generation. The `LEAST/GREATEST`
wrapper around the `pool_config` read survives a min/max typed the wrong way round, and the
`COALESCE(…, 40)` / `COALESCE(…, 80)` fallback mirrors `PoolConfigRepository::getConfig()` falling
back to `new PoolConfig()`.

🟢 **`random()` is volatile, so it is evaluated per row and per call** — the two keys are therefore
independent of each other, which §3 confirms empirically.

🟢 **The second statement has no guard beyond `j.id = s.id`, which is correct**: it re-derives every
row, including the ones the first statement skipped, so the column agrees with the formula
unconditionally. Idempotent by construction.

🟢 **`down()` is honest.** It strips both keys and re-derives over the remaining five, so the column
is consistent after a rollback; the docblock says plainly that the rolled values are not
recoverable.

🟢 **"No DDL, so `wunderkind_test` needed no hand-application" — correct.** `judgements` is an
existing `json` column; I confirmed the `scout` table's columns and nothing was added. The report is
right that this is the exception to the untracked-test-DB trap rather than a repeal of it.

---

## 3. 🟢 The `youth`/`senior` roll is defensible, and it is now MEASURED, not argued

The brief asked whether rolling from `scoutJudgementMin/Max` manufactures the very correlation the
gate exists to expose. A27 answered it with reasoning in its §3. **The reasoning holds, and the
live data settles it:**

```
 ---------------- ---------------- ------------- ------------ -------------- -------------- ------
  corr_youth_pot   corr_youth_sen   youth_range   youth_mean   mean_abs_gap   n_gap_30plus   n
 ---------------- ---------------- ------------- ------------ -------------- -------------- ------
  0.0018           0.0162           15-90         52.21        24.99          1939           5278
 ---------------- ---------------- ------------- ------------ -------------- -------------- ------
```

- **`corr(youth, potential) = 0.0018`** — no manufactured correlation with `potential`. This is the
  thing Option B would have made 1.0, collapsing the displayed-accuracy blend to `potential` for
  exactly the under-18s the gate exists for. A27's refusal of Option B was right and the data shows
  the cost of having taken it.
- **`corr(youth, senior) = 0.0162`** — the two age bands are independent of each other, so a scout
  can genuinely be good with prospects and poor with pros.
- **Mean |youth − senior| = 25.0 points, and 1,939 of 5,278 scouts (36.7%) differ by 30 points or
  more.** This is the strongest evidence that the fix delivers something the owner will actually
  see: over a third of the scout population now reads materially differently by player age.
- **The range is exactly 15–90**, i.e. the dev `scoutJudgementMin/Max` — the shared bounds are
  applied as described.
- **`youth_mean = 52.21`**, against the ~52.5 judgement mean that `ScoutAbilityCalculator`'s
  docblock records the 70/30 split as having been measured at. So A27's second reason for not giving
  the new keys their own bounds — that the owner approved a weighting measured against this one flat
  range — is supported rather than merely asserted.

🟢 **All three of A27's reasons stand.** Sharing the bounds avoids a second config surface, preserves
the measured tier spread, and leaves the owner a dial that already exists and is admin-editable.

---

## 4. ⚠️ THE CAVEAT THE REPORT UNDERSTATES — the fix does not reach any existing save's club or NPC scouts

The report frames the surviving five-key case as exceptional:

> It is now genuinely exceptional — a pack cached at v12 or earlier, or a hand-edited blob

**"A pack cached at v12 or earlier" is every save that already exists, and nothing ever re-ingests
it.** `worldPackVersion.ts`'s own header is explicit:

> · **Nothing gates behaviour on it.** … · **Equality only.**

It is advisory. There is no re-sync, no pack migration, no upgrade path. A save holds the world blob
it was initialised with for its whole life.

**So, by population:**

| population | source | keys after A27 |
|---|---|---|
| shared pool / hireable scouts | **live fetch** via `api/endpoints/market.ts:303-304` | 🟢 **seven**, on every save, immediately |
| club scouts on a NEW save | `ScoutGenerationService::build()` into a fresh pack | 🟢 seven |
| **club scouts already in an existing save** | world blob from a v12 pack, via `worldScoutToScout` (`useInitFlow.ts:451`) | 🔴 **five — permanently** |
| **NPC club scouts in an existing save** | same world blob; read by `NpcScoutingService.ts:169` | 🔴 **five — permanently** |
| poached NPC *staff*-shaped scouts | `worldStaffToScout` (`useInitFlow.ts:390`) | seven, but **all identical** |

Two consequences the owner needs before they look at their save:

1. **On the owner's current Moffat Vale save, the scouts on the payroll will not improve.** Their
   judgements came from a v12 pack. The gate will still return 0 for them, forever. The
   *market* will be full of visibly better scouts they could hire. That is a confusing pairing to
   meet unwarned, and it is the opposite of the §1 headline's "scouts get visibly better across the
   board".
2. **NPC scouting accuracy is also unchanged on existing saves**, so for one season the player's
   newly-hired pool scouts are better than every NPC's — a real competitive asymmetry, introduced by
   a fix rather than by design.

⚠️ **And the `worldStaffToScout` legacy path is the Option-B collapse, already live.** It writes
`judgements: { potential: ability, …, youth: ability, senior: ability, … }` — seven keys, all the
same number. `ageGateFor` then returns `potential`, so displayed accuracy is
`potential × 0.7 + potential × 0.3 = potential` and **the age gate does nothing** for a poached
NPC staff-shaped scout. This is pre-existing and not A27's to fix, but it is exactly the arithmetic
A27's §3 uses to reject Option B, live in the codebase, and `StaffPoachingService` reaches it.

🟢 **The `: 0` fallback is therefore correctly kept and correctly annotated.** A27's instinct here is
right; what needs correcting is the characterisation of how rare the case is. The annotation says
"they always arrive on a *current* pack", which is true and is the whole point — most packs in
existence are not current.

**Recommendation:** this is a CHECKS line, per standing note §1. One line printing the judgement-key
count across the save's scouts would answer "did the fix reach me?" permanently:
`scouts 23 · 7-key 4 · 5-key 19 — AGE GATE DEAD FOR 19`. I have not added it — A29 is writing
`ChecksTab.tsx` — so it is flagged here for whoever owns that file next.

---

## 5. 🟢 "The app needed no functional change" — TRUE, verified independently

The report says it diffed out every comment line and found nothing left. I did not accept the
method; I used a real TypeScript parser instead. Both revisions of all four changed files were run
through `esbuild` with `--minify-whitespace` (which strips comments and preserves code) and
compared:

```
IDENTICAL after comment strip: src___tests___engine_scoutNoise.test.ts
IDENTICAL after comment strip: src_engine_scoutNoise.ts
IDENTICAL after comment strip: src_types_market.ts
IDENTICAL after comment strip: src_types_world.ts
```

🟢 **Byte-identical after a parser removes the comments.** The app diff is comment-only. The claim
holds.

🟢 **And the "it already worked" premise holds too**, checked at the pre-A27 revision rather than
the post:

```
$ git show 6fb687a0^:src/engine/scoutNoise.ts | grep -A3 "export function ageGateFor"
export function ageGateFor(judgements: ScoutJudgements, age: number): number {
  const gate = age < 18 ? judgements?.youth : judgements?.senior;
  return Number.isFinite(gate) ? (gate as number) : 0;
}
```

and `ScoutJudgements` at the same revision already declared
`'potential' | 'mental' | 'technical' | 'physical' | 'youth' | 'senior' | 'personality'`. **So the
app really did begin working the moment the data existed** — the `age < 18` split, the two key
reads, the type, and the two i18n rows were all already there.

🟢 **The headline figures reconcile against the real functions.** With no facilities,
`scoutAccuracyPercent` reduces to `potential × 0.7 + ageGate × 0.3`; for Julio Russo (potential 42,
youth 79, senior 28) that is 29.4 → **29%** before, 53.1 → **53%** at 17, and 37.8 → **38%** at 25.
Exactly as reported.

🟢 **Both consumers are reached.** `ScoutingService.ts:452-460` (the player's own scouting) and
`NpcScoutingService.ts:169` (the NPCs') both call `ageGateFor`, so the fix is symmetric between the
player and the world — on a current pack.

---

## 6. 🔴 Two factual claims in the report are wrong. Believe the code.

Both concern `GenerateMarketDataCommand`, and both are repeated beyond the report.

**(a) It DOES write the scout table.** The report's §10(4) says *"it does not write the scout
table"*. `src/Command/GenerateMarketDataCommand.php`:

```
330:            $scout = new Scout($name);
348:            $this->em->persist($scout);
```

`new Scout(...)` + `persist` is the `scout` table. So the claim repeated in four places — the
report, `ScoutGenerationService`'s new comment (*"the only path that has ever written a persisted
scout"*), `ScoutAbilityCalculator`'s docblock, and the backend `.context` — is **wrong about the
code**. It happens to be **right about the dev population**: every one of the 5,278 rows carried
exactly five keys before A27, which it could not have done had this command's seven-key scouts been
in the table. So the command has not been run against dev. The statement should be
*"the only path that has written the scouts currently in the table"*, which is defensible, rather
than *"the only path that has ever written a persisted scout"*, which is not.

**(b) It writes the SAME seven keys, not a different set.** The report calls it *"the one place
where a *different* seven-key set is authored"*. `GenerateMarketDataCommand.php:164`:

```php
private const SCOUT_JUDGEMENT_KEYS = ['potential', 'mental', 'technical', 'physical', 'youth', 'senior', 'personality'];
```

Identical to what `ScoutGenerationService::build()` now writes. **This is better news than the
report gives itself** — after A27 both writers of the table produce the same key set, so the
5-vs-7 disagreement is genuinely closed rather than merely contained.

⚠️ **But what differs is the bounds and the correlation structure, and that is a live second config
surface.** `buildScoutJudgements` ignores `PoolConfig` entirely — baseline `random_int(30, 70)`,
specialised `random_int(60,85) + random_int(0,15)`, plus an experience bonus — and its
`SCOUT_SPECIALIZATIONS` table contains `['potential', 'youth']` and `['senior', 'technical']`, which
**deliberately correlate the age bands with the other judgements**. A scout from this command can
therefore have `youth ≈ potential`, i.e. the Option-B collapse A27's §3 rejected. Pre-existing, not
A27's to fix, and exactly the one-quantity-two-sources pattern this workstream exists to remove.
**Worth its own small item: point `buildScoutJudgements` at `scoutJudgementMin/Max`.**

⚠️ **One comment A27 left stale.** `GenerateMarketDataCommand.php:338` still reads *"Note this path
writes SEVEN judgement keys where that one writes five"*. That one now writes seven too.

---

## 7. ⚠️ The "70% of designed accuracy" figure is exact only with no scouting facilities

Stated flatly in the report, the migration docblock, the brief and `.context`:

> displayed accuracy (`scoutAccuracyPercent`, `potential × 0.7 + ageGate × 0.3`) was **70% of its
> designed value** for every scout

`scoutNoise.ts`'s actual function is not that formula:

```ts
const base = clamp01(potential * (1 - AGE_GATE_WEIGHT) + ageGate * AGE_GATE_WEIGHT);
const bandFactor = effectiveNoiseSpread(noiseReduction) / MAX_NOISE_SPREAD;
return Math.round(clamp01(1 - (1 - base) * bandFactor) * 100);
```

It reduces to `potential × 0.7 + ageGate × 0.3` **only when `noiseReduction` is 0** — i.e. a club
with no scouting facilities, which is the configuration the report measured in and says so. For a
club that has invested in scouting, `bandFactor < 1`, the displayed figure sat closer to its designed
value, and the age gate's marginal effect on the displayed number is damped by the same factor.

So the defect was real everywhere and **largest for clubs with no scouting facilities** — which is
most clubs, so the headline is a fair summary. It is the universal quantifier that is wrong, and it
is repeated in five places. Worth a clause ("with no scouting facilities") so the next person
measuring on an equipped club does not think they have found a second defect.

---

## 8. The pack bump is legitimate, and the `ability`-moves note is the right call

🟢 **12 → 13 is correct and census-shaped.** Two more per-scout 0–100 accuracy ratings on the same
scale as the existing five. No amount enters the pack. The census rule bans prices from the pack; it
does not freeze the census, and v9/v10/v12 are the precedents. The reasoning is recorded in
`WORLD_PACK_VERSION`'s own docblock and in the commit message, which is the right place for it.

🟢 **`scouts[].ability` moving under an unchanged key is correctly declared rather than hidden**, and
the docblock's contrast with v12's note — that re-pointing `scouts[].tier` at `ability` *would* be a
break — is the right distinction: the figure's definition and type are unchanged, its inputs grew.

🟢 **The migration-not-command ordering argument is sound.** Writing the keys without re-deriving
`ability` in the same migration would have left the column disagreeing with the formula that owns it
for however long the gap lasted. Putting both statements in one migration means the column is never
in that state. The `--force` backfill reporting **0 of 5278** behind it is the end-to-end proof, and
my own re-derivation (§1) is a second, independent one.

---

## 9. What a scout generated between the code change and the migration looks like

Asked explicitly in the brief. The answer is clean, because of how the two halves are packaged:

- **Code and migration are in the same commit** (`3e1555c5`), so there is no deploy window in which
  the code writes seven keys while the migration has not run.
- **Pool scouts** (the `scout` table — I confirmed it has no `club_id`, so it is the shared market
  only) generated after the code change carry seven keys at birth. The migration's
  `NOT jsonb_exists` guard skips them, and the unconditional second statement re-derives their
  `ability` to the same value `ScoutGenerationService` already stored. **No double-roll, no
  disagreement** — and the 0-of-5,278 backfill plus my zero disagreements confirm no such row is
  inconsistent.
- **Club scouts are never in this table.** `WorldPackClubGenerationService::generateScouts()` calls
  `$this->scoutGen->build()` and hands the entities to `buildSnapshot()`; they are serialised into
  the pack, not persisted. So they need no migration and get seven keys from the code change alone on
  any pack built after the deploy. 🟢 **The migration's scope is exactly right** — it covers
  precisely the population that is persisted.
- **The one path that can still produce a five-key scout is a world blob or pack cached before the
  deploy** — see §4. Nothing in the backend can produce one any more.

---

## 10. What I did not verify

- **The backend suite was not re-run.** The report claims 3,265 with the three known pre-existing
  failures, reconciling as +1 against 3,264 at `c05d54a7`. I did not re-run it: I verified the
  structural basis of the +1 instead (`testJudgementsAreTheFiveAuthoritativeKeys` →
  `…TheSevenAuthoritativeKeys` is a **rename**, so it adds nothing, and
  `testTheAgeBandJudgementsAreIndependentRollsWithinTheConfiguredBounds` is the one addition —
  both confirmed in the diff). Given that I have independently re-measured the data the suite would
  be asserting about, a 40-minute run was the wrong use of the time.
- **Nothing on a device.** The two new rows on the scout profile card ("Judges youth" / "Judges
  seniors") are reasoned to appear by themselves — `profileLogic.ts`'s `SCOUT_JUDGEMENTS` lists all
  seven, `judgementKind()` classifies them as `'ageBand'`, and both i18n keys exist — but not
  observed.
- **The A26 five-key pin's handling** I read and accept: renamed, not deleted, with the ruling quoted
  and the reason for the change recorded in its own docblock. It did its job.

---

## 11. ✅ `.context` facts the PM asked for

🟢 **The app's `.context` is correct and complete for A27.**
`07_synthesis/output/game-mechanics.md:478-516` carries the fix in present tense, the defect in past
tense, the measured before/after table, the shared-bounds decision and the still-live `: 0` fallback.
Nothing there needs correcting except the facilities clause in §7.

🔴 **One backend `.context` file is now wrong as present-tense current-state text, and A27 missed
it.** `wunderkind-backend/.context/stages/03_data/output/entities.md` ~line 571:

> ⚠️ **`judgements` has TWO key sets and the five-key one is the only one in this table.**
> `ScoutGenerationService::build()` writes `potential`/`technical`/`physical`/`mental`/`personality`
> … all 5,278 rows on dev carry exactly those five. … `PoolConfig.php`'s "5 scout judgement
> categories" comment is therefore correct for this table

Every clause of that is now false. A27 updated `03_data/output/migrations.md` and
`04_interfaces/output/services.md` and left `entities.md` behind. **I have not touched it** — per
standing note §3 it is the PM's to curate. (The five-key mentions in both repos'
`shared/last-sync.md` are dated historical pass entries and are correctly historical; leave them.)

🔴 **And a code comment it endorsed is now stale.** `wunderkind-backend/src/Entity/PoolConfig.php`:

```
241:    /** Min value for all 5 scout judgement categories. Default: 40 */
245:    /** Max value for all 5 scout judgement categories. Default: 80 */
```

These two fields now govern **seven** categories. I am read-only and have not changed them; this is
a one-line fix that should ride with whatever touches that entity next, and `entities.md` must stop
citing them as evidence when it does.

**I have appended nothing to `shared/last-sync.md` in either repo.** A review is not a pass.

---

## 12. ⭐ What the OWNER is accepting along with this change

1. **You asked whether scouting accuracy should vary by the player's age. It now does, and the
   variation is large and real.** Over a third of the scouts in the game (1,939 of 5,278) are now at
   least 30 points better at one age band than the other, and the average gap is 25 points. That is
   not a token implementation of your ruling — it is the thing you asked for, measurable.

2. **Scouts get visibly better, and that is the fix landing, not a buff.** Every scout in the game
   had been running at roughly 70% of its designed displayed accuracy with its error band never
   tightened — for as long as the feature has existed. Both are now applied as designed. If a scout
   you know suddenly reads 53% where it read 29%, nothing was inflated; a dead branch started
   running.

3. **🔴 You will NOT see this on your current save, for the scouts you already employ.** Your save
   holds a world pack from before this change, and nothing re-downloads it. The scouts on your
   payroll — and every NPC club's scouts — keep their five keys and their dead age gate for the life
   of that save. **What you WILL see is a hireable market full of noticeably better scouts**, because
   the market is fetched live. That mismatch is the most likely thing to look like a bug and is not
   one. **The honest test of this change is a fresh save.**

4. **No wage moved anywhere.** A27 traced every live wage path that could see a scout's ability and
   they all read `experience`, not `ability` — the backend's `ScoutWageCalculator`, the app's
   income-anchored staff pricing (which builds its shape from `coachingAbility`, which a scout does
   not have), and the scout market anchoring. I spot-checked that conclusion and it holds. **A24 is
   the change that will point a wage at `ability`**, and the distribution it will be pricing against
   is 12–47, mean 29.1 — which is now verified twice over.

5. **Every scout's `ability` moved, by a point or two, in both directions.** Range 11–48 → 12–47,
   mean 29.13 → 29.11. That is the mean of seven draws being slightly more stable than the mean of
   five, nothing more, and it is sanctioned under an unchanged pack key rather than slipped through.

6. **A rollback loses the rolled values.** `down()` restores a consistent `ability` column but the
   `youth`/`senior` figures are not recoverable — re-running `up()` rolls fresh ones. True of every
   generated figure in this schema; worth knowing it applies here.

7. **Nothing has been seen running on a device**, and nothing is deployed.

---

## 13. One finding A27 left behind, repeated here so it is not lost

🔴 **`marketStore.ts:216` anchors a scout's wage on `experience` through a parameter named
`abilityOf`**, whose downstream parameter in `ClubWageScaleService` is named `ability`. A27 found it,
correctly declined to fix it (changing it moves a live wage, outside its scope), and it is a fourth
site of the experience-as-ability conflation beyond the three A26 named. It matters more than a
naming slip because the two quantities have genuinely different ranges — **I confirmed on dev that
`experience` is 4–34 across all 5,278 rows while `ability` is 12–47** — so the anchored wage curve is
being fed career length on an ability-shaped scale. **A24 should re-point it in the same change that
prices the wage off `ability`, and should expect scout market wages to move when it does.**

⚠️ **A second observation for A24, from the same measurement.** `ScoutAbilityCalculator`'s docblock
justifies the 70/30 split with *"tier 1 (exp 40-90) against tier 8 (exp 2-7) … a 42-point spread"*.
**No scout in the dev `scout` table has experience above 34**, and that table has no club column —
it is the shared pool only. The 42-point spread lives entirely among club scouts, which are generated
into the world pack and never persisted here. So the spread the owner approved **cannot be observed
in the database at all**, only in a pack. That is not a defect, but it means any A24 calibration done
against this table will be calibrating against the bottom half of the intended range.
