<!-- STATUS --> **STATUS:** ✅ A3/A4 — resolved payouts in the export, authored `slots`. Landed, DEPLOYED 2026-11-19.

---

# TASK — A3 + A4: stop two numbers being side effects

**Backend only (`wunderkind-backend`), branch `development`, on top of `bac1228b`.** Two
independent fixes batched because both need a deploy, and the owner is about to do exactly one
push–deploy–bump–rewarm cycle. Landing them separately would mean two. **Commit; do not push.**

⚠️ **FIRST PHASE IS READ-ONLY.** Do §0 and §1, then **report and stop** — the owner is reviewing
this brief while you read. Do not edit anything until they approve. If you finish reading and have
no approval yet, say what you found and wait.

## 0. Code state

`git fetch origin` with explicit refspecs; confirm `development` is at **`bac1228b`** ("Take the
economy out of the world pack") and that it is **2 commits ahead of `origin/development`** — that
is expected, the owner is holding the push. State branch, hash and date at the top of your report.

⚠️ **The working tree must be clean when you start.** A previous session shared this checkout; if
anything is dirty, stop and report rather than committing someone else's work.

Both repos use ICM: read `.context/CONTEXT.md` and the relevant stage's `output/` before raw
source.

## 1. Read first, and report what you find

- `docs/economy-loose-ends/next-work-plan.md` — tranches A3 and A4, and the **"What is actually
  startable right now"** section for why these two are batched.
- `docs/economy-loose-ends/r2-closeout-report.md` — the stop-the-line section on division size,
  which is A4's evidence.
- `src/Service/Economy/LeaguePayoutResolver.php` and `LeagueSizeResolver.php` docblocks.
- `src/Service/SyncService.php`'s `buildLeagueSnapshot()` and
  `src/Controller/InitializeController.php`'s `/api/initialize/leagues` — **two places that already
  resolve what A3 needs**. Copy their chain rather than inventing one.

---

## A3 — the world export cannot carry the payout figures

**The defect.** `Version20261118120000` NULLed `league.prize_money` and
`league.league_position_pot` so they inherit from the ppm ladder — the designed state. But the
admin's World → Export (`admin_world_export` → `LeagueImportExportService`) serialises the **raw
column**, so both read **£0** in every export taken since. The app's economy gate reads
`prizeMoney ?? 0` from that export and therefore credits zero prize and zero position money. Every
gate run since has needed a hand-patch; tonight's did.

**The fix.** Emit **resolved** figures — `LeaguePayoutResolver::prizeFor()` / `positionPotFor()`,
the same chain `SyncService` and `/api/initialize/leagues` already use. Include the **resolved
`sponsorPot`** too (the sum of each `LeagueSponsor::rolledValue`, as `SyncService` computes it),
and `sponsorCount`, since the app's gate and `rollLeagueSponsorPot` both want the count.

⚠️ **THE TRAP, AND IT IS THE WHOLE RISK IN THIS TASK: export/import symmetry.** If the export now
writes resolved amounts and the **import** reads them back into `league.prize_money` and
`league_position_pot`, then round-tripping a world **converts every inherit (NULL) into a
per-league override** — permanently freezing the ladder into 196 rows and defeating
`5dc3f51b`'s NULL-means-inherit design, silently and with no error. Decide and state explicitly
how import handles a resolved field: it must not write these columns, or must write NULL for them.
Pin it with a test that exports and re-imports a league and asserts the columns are **still NULL**.

**Out of scope:** publishing payouts on a new endpoint. `/api/initialize/leagues` already does
that; this is only the admin export.

---

## A4 — author `League::$slots`, so the divisor stops being a side effect

**The defect.** `slots` ships as `0`, which `LeagueSizeResolver::sizeOf()` reads as "derive" — it
then returns the live NPC club count (+1 at the bottom tier). So the division size, every club's
matchday, the app gate's `homeGames` and the per-club divisor in `app:economy:wage-table`'s check 8
all follow **however many club rows happen to exist**.

**Measured consequence, 2026-11-18:** a spoof-club purge took England from 20 club rows per tier to
16 and thereby re-priced every division in the world — matchday fell ~20% and six tiers dropped
below the coverage floor — with no economy change authored anywhere.

**The fix, and the landing that changes nothing today.** Author `slots` per league **to each
league's current derived size**, so behaviour is byte-identical on the day it lands and the figure
becomes a *decision* thereafter. A migration in `Version20261118120000`'s shape: stash what it
replaces, write per league, `down()` restores from the stash.

⚠️ **Do not pick a division size.** 16-vs-20 is an open owner decision and is **not yours**;
authoring the current count is precisely what avoids pre-empting it. Make sure the admin can edit
the value afterwards — that is the point of the change. Note `setSlots()` floors at 0 and caps
at 40, and **0 still means derive**, so authoring must write a positive number.

---

---

## A3b — `bankruptcyDeductionTiers` has no tier dimension

**Owner confirmed 2026-11-19 that the insolvency mechanic is intended to be used**, so this is
worth fixing now, while it is still inert and the change is provably safe.

**The defect.** The ladder is authored in flat absolute pence with no tier dimension. Its harshest
band begins at **£40,000.01** of deficit, against a tier-1 weekly wage bill of **£3,238,043**
(`turnover × 0.45 ÷ 46`) — so the entire ladder is traversed in **0.01 weeks**. The bill depends on
nothing but the turnover row, so this reads identically on dev and read *worse* before R2
(£3,801,742/wk). Separately, **rows 4 and 5 can never fire**, being unreachable behind row 3's null
`deficitMax` — pre-existing, and visible in the R2 session's BEFORE gate run.

**Read the existing analysis before designing anything.** `docs/economy-threshold-review.md` §1
carries the full write-up and a **weeks-of-wages** proposal, explicitly **additive — it leaves
`bankruptcyDeductionTiers` untouched** rather than redefining a published key. Attribution detail
is in `docs/economy-loose-ends/r2-finish-report.md` §3 C and D. Implement what §1 proposes; if you
think it is wrong, say so in your report rather than substituting your own design.

⚠️ **Backend half only.** The mechanic itself is client-side and gated by its own flag. Author and
publish the new figure here; if the app needs a corresponding change, **stop and report it** —
another session is working in `wunderkind-app` and must not be crossed.

**Same defect class as the flat youth scholarship and the flat staff role bands**, both already
fixed by adding a tier dimension. This is the third instance and the last one open.

---

## A5 — `WorldOverviewServiceTest::testMoneyIsConvertedToPoundsAndNullsSurvive`

Small, same repo, bundled so it does not need its own session.

**It fails on a clean tree** and is **not** in `environment.md`'s documented baseline — established
by stash during the R2 work, and again during the pack-economy work, both times failing
identically:

```
an unset tier must stay null, not become 0
Failed asserting that 200000000 is null.
```

The assertion's own message states the intent: an unset tier must stay **null**, not become 0. So
either the conversion is coercing a null to zero, or the fixture now supplies a value where the
test expects absence. **Find out which before changing anything** — if the production behaviour is
wrong, the test is right and the code needs the fix; if the fixture drifted, say so explicitly
rather than relaxing the assertion. A test that has been failing for days is a claim nobody has
checked, and the cheap wrong move is to make it pass.

Either way, add it to `environment.md`'s baseline list or remove it from the world — **do not leave
a sixth unexplained failure for the next session to re-diagnose.**

## 2. Verification

1. **`app:economy:wage-table` for EN and the shallow comparison country — must exit 0 and be
   unchanged.** A4 touches check 8's divisor; if the authored slots equal the derived count, the
   output should be identical. **A diff is the proof.** Paste before and after.
2. Full `phpunit`. The documented baseline is five pre-existing failures, one of them
   (`NpcClubForeignClubsCitySizeTest`) a **known flake that alternates methods by run
   composition**, plus `WorldOverviewServiceTest::testMoneyIsConvertedToPoundsAndNullsSurvive`,
   pre-existing but not in the baseline list. Attribute any failure by stashing and re-running —
   do not attribute by assertion.
3. **A3: export a world, re-import it, assert the payout columns are still NULL.** That is the
   round-trip trap and it needs a test, not an inspection.
4. **A3: a fresh export's `prizeMoney` must equal `LeaguePayoutResolver::prizeFor()`** for the same
   league — not merely non-zero.

## 3. Reporting, scratch files and `.context`

⚠️ **Nothing scratch-shaped inside either repository.** Reports, dumps and working notes go in
`/Users/courtneyadesile/Documents/WunderkindFactory/docs/economy-loose-ends/`; yours is
**`a3-a4-report.md`**. Throwaway work goes in your own scratchpad directory.

**`.context` carries what is now true; the report carries what proves it.** Paste commands and
their output **verbatim**, never summarised.

**`.context` status and review are owned by the project-manager session.** Append your own pass
entry to `shared/last-sync.md` and correct stage text your change makes wrong — nothing else. Do
not restructure a file, prune or rewrite earlier entries, or delete a superseded section even when
it is visibly wrong: **flag it in your report instead.**

## 4. Do not

- **Do not push**, and do not deploy. The owner is mid device-test against this environment and a
  deploy would change the world under it.
- **Do not pick a division size**, and do not regenerate or purge clubs.
- **Do not touch any authored economy figure** — turnover, ratio ladders, sponsor bands, TV,
  ability ranges.
- **Do not change `WORLD_PACK_VERSION`.** Neither of these is a pack-shape change; if you think one
  is, stop and report.
- Do not edit or relax any check in `EconomyWageTableCommand`.
