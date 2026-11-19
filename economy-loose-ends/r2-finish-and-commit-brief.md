<!-- STATUS --> **STATUS:** ✅ R2 finish and commit. COMPLETE 2026-11-18.

---

# TASK — Finish R2 and commit it

**Backend only (`wunderkind-backend`), branch `development`.** This continues the R2 authoring you
have in the working tree at `740f2c8e` (`Version20261118120000`, `WORLD_PACK_VERSION` 9 → 10,
`LeaguePayoutResolverTest` re-pointed, `EconomyBaselineTurnoverAuthoringTest` added). **Commit at
the end. Do not push.**

Your authoring was reviewed and confirmed: the six authored figures match R2 exactly, all eight
`S_tier` values reproduce to the integer through the resolver's own formula and check 1 is clean at
every tier on dev's inputs, the migration's stash/restore shape is right, and your band-3 read
matches an independent measurement of the Nov-15 world export. Three things remain.

---

## 1. §3.3 is ruled: amend check 8's two bounds

**The owner's decision, 2026-11-18.** In `src/Command/EconomyWageTableCommand.php`:

- `PAYOUT_SHARE_MAX_PCT` **50 → 55**
- `PAYOUT_SHARE_SPREAD` **4 → 5**
- `CHAMPION_SHARE_MAX_PCT` stays **100**, and so does every other constant in that file.

⚠️ **This supersedes the previous brief's "do not edit or relax any check", for these two constants
only.** That prohibition exists so an implementer cannot quiet an alarm about their own work; this
is the owner re-setting a bound that was shown to be mis-calibrated, which is a different act. It
does not license touching anything else in the file, and it does not license special-casing a tier.

**Record the reasoning in the constants' docblocks, because the next reader's question is "why 55".**
Both halves of constraint (b) were breached by R2 at tier 1 — 50.38% against the 50% ceiling and a
4.35× spread against the 4× cap — and the cause is isolated:

- **The payout half is innocent and provably so:** prize and pot are a flat **9.29% of turnover at
  both ends** of the pyramid, which is the ladder doing exactly what `5dc3f51b` built it to do.
- **The whole breach is TV's SHARE of a turnover figure that moved beneath it.** `league.tv_deal` is
  an authored absolute; R2 cuts tier-1 turnover 15% and deliberately does not re-derive TV, so TV
  goes 35.0% → 41.1%. A top flight drawing ~41% of its turnover from broadcast is normal, not a
  defect.
- **The 4× spread cap is arbitrary where the bottom division's TV deal is £4,950 a year.** The
  spread is structural — a top flight is broadcast-led and a bottom division is not — so capping the
  ratio of their league income shares was measuring the pyramid, not a mis-authoring.
- **The alternatives were costed and are all worse**, and the docblock should say so in a line:
  raising tier-1 turnover enough to clear 50% needs £334.1m and still fails the spread at 4.31×
  while dropping tier-1 coverage to 84.5%, below the app gate's band; clearing the spread by
  turnover alone needs £366.8m and 77.2% coverage; re-deriving tier-1 TV to hold its 35% share
  clears both checks but drops tier-1 coverage to 79.2%, and holding coverage then forces
  T1 ≈ £290m, which tightens the check-1 chain to T2 ≤ £100.2m and re-opens every tier's figure.

**Then fix the test you wrote to fail by design.**
`LeaguePayoutResolverTest::testR2BreachesCheck8sTvDependentConstraintsAtTierOne()` pins a breach
that is no longer one. **Do not delete it** — rename it and keep both halves of what it measures:
the figures are still 50.4% and 4.34×, and the assertion becomes that they are inside the amended
bounds while remaining above the old ones. A test that only asserted "passes" would not notice the
bounds being moved back.

## 2. Run the tests, and report the output

This is the one thing the review could not check: PHP 8.4 on the host against a `vendor/` that
requires ≥ 8.5, and no `lando` on PATH. Run the full suite in your own environment and **paste the
summary line and any failure** into your report:

- `EconomyBaselineTurnoverAuthoringTest` and `LeaguePayoutResolverTest` in full;
- `ConfigImportExportCoverageTest`, which the previous brief named;
- then the whole suite, so a regression elsewhere in the economy chain surfaces now rather than
  after the commit.

**"Tests extended" is not "tests pass", and the commit is conditional on the second.**

## 3. The commit condition, revised

The previous brief made committing conditional on `app:economy:wage-table` exiting 0. **That
condition is unreachable on your box and is hereby replaced**, because your finding 1 established
why: the local Lando box has an unauthored turnover table, a £10m tier-1 TV deal, different squad
midpoints and out-of-band sponsor bands, and `scripts/pull-prod-db.sh` is forbidden.

**Commit when all three of these hold:**

1. The full test suite passes.
2. §1 is done — bounds amended, docblocks carrying the reasoning, the renamed test green.
3. You run `app:economy:wage-table` locally anyway and, in the report, **attribute every remaining
   failure line to a named input divergence**, each with the local value and dev's. A failure you
   cannot attribute that way is a finding: stop and report it instead of committing.

Commit message in this repo's style — what changed and why, the figures, and the traps worth
carrying forward (the `create_missing` fallback, that band 3 is tiers 7–8 together with no country
dimension, and that the bump alone does not reach existing NPC clubs). End it with:

```
Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
```

**Do not push.** Say in your report that the commit is local and name its hash.

---

## Still deferred, and not yours to do here

- **Step 6 — regenerate the bottom two tiers, `app:worldpack:maintain`, and hand back
  `GET /api/game-config?country=EN`, `GET /api/starter-config` and a world export.** It needs a box
  whose inputs are dev's, so it is a deploy-time action, not part of this commit. Keep the note in
  `current-focus.md` saying so.
- **The app-side tier-7 squad-size divergence.** The review found that the backend floors the
  reference squad (`intdiv`, so dev's tier 7 is 17) while the app's `loadExport.ts` uses
  `Math.round` and gets 18, which makes the app harness's tier-7 wage figure about 5% low. COVERAGE
  is unaffected — it has no wage term. **It is an app fix and is being routed separately; change no
  app code.**
- **Re-authoring the bottom ability bands** (tier 6 → 10–20, tier 8 → 4–9), which is the only thing
  that would bring tiers 6 and 8 into the coverage band. It stays open as a BALANCE decision.

## Report back with

Write it to **`docs/economy-loose-ends/r2-authoring-report.md`** — see the rule below — and include:

- Branch, full hash and date, as before; then the new commit's hash.
- **The test output (§2) and the annotated gate output (§3) pasted verbatim** — the command and
  what it printed, not a summary of it. "Tests extended" instead of a run is what left this
  unverifiable last round.
- The diff of the two constants and their docblocks.
- Which `.context` stages you touched this time.

## Where your working notes and evidence go

⚠️ **Scratch files, reports, gate dumps, traces and working notes NEVER go inside
`wunderkind-backend` or `wunderkind-app`.** They go in
`/Users/courtneyadesile/Documents/WunderkindFactory/docs/economy-loose-ends/`, which is outside
both repositories and is the shared workspace for this work. One file per task,
`<task>-report.md`; yours is `r2-authoring-report.md`. Anything genuinely throwaway goes in your
own scratchpad directory, not in a repo and not in that folder.

The split is: **`.context` carries what is now true, the report file carries what proves it.**
Raw evidence has no business in a stage's `output/`, and a repo should not accumulate a trail of
run logs.

## `.context` — write your entry, but do not curate the file

The ICM convention stands: update the stage your change affects as part of finishing the work, and
add your pass entry to `shared/last-sync.md` in that file's existing format.

**But `.context` status and review are owned by the project-manager session, not by you.** So:
append your own entry and edit the stage text your change makes wrong — nothing else. Do not
restructure a file, do not prune or rewrite earlier entries, and do not delete a superseded
section even when you can see it is now wrong. **Flag it instead**, in your report, with the file
and what you believe is stale; the review picks it up. (Your current `current-focus.md` has exactly
one of these already — the "Superseded ... the derivation record" section whose figures are
candidate C's rather than R2's. Leaving it labelled rather than rewriting it was the right call;
the cleanup is queued for after your commit, so that we are not both editing that file at once.)
