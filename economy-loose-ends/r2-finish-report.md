<!-- STATUS --> **STATUS:** ✅ R2 finish. COMPLETE.

---

# R2 finish — report (2026-11-18)

**Branch `development`, commit `740f2c8e7ae988653dbe883376aaaf0baad2d102`, dated 2026-11-18
(12:34:17Z).** Unchanged; `origin/development` is still at the same commit.

**New commit hash: none. I did not commit, and §4 is why.** §1 and §2 of the brief are done in
full; two of the three commit conditions cannot be met as written on this box, and the brief's own
instruction for that case is to stop and report.

---

## 1. §1 — check 8's two bounds, amended

`src/Command/EconomyWageTableCommand.php`. The **only** two non-comment lines changed in the file:

```diff
-    private const PAYOUT_SHARE_MAX_PCT = 50;
+    private const PAYOUT_SHARE_MAX_PCT = 55;
-    private const PAYOUT_SHARE_SPREAD = 4;
+    private const PAYOUT_SHARE_SPREAD = 5;
```

Verified unchanged beside them: `PAYOUT_SHARE_MIN_PCT = 10`, `CHAMPION_SHARE_MAX_PCT = 100`,
`PAYOUT_FLATNESS_TOLERANCE_PP = 0.5`. No check body was touched and no tier is special-cased.

Both constants' docblocks now carry the reasoning, in the form the brief asked for: that the payout
half is innocent and provably so (flat **9.29% of turnover at both ends**, with the flatness check
passing at 0.0065pp against 0.5pp); that the whole breach is **TV's share of a turnover figure that
moved beneath it** (`league.tv_deal` is an authored absolute, R2 cuts tier-1 turnover 15%, so TV
goes 35.0% → 41.1% with no TV figure changing); that the 4× cap was **measuring the pyramid rather
than a mis-authoring**, since EN tier 8's TV deal is £4,950 a year; and the four costed
alternatives (£334.1m still fails the spread at 4.31× and drops coverage to 84.5%; £366.8m gives
77.2% coverage; re-deriving tier-1 TV clears both but drops coverage to 79.2%, and holding coverage
forces T1 ≈ £290m, tightening the check-1 chain to T2 ≤ £100.2m and re-opening every tier). The
`PAYOUT_SHARE_MAX_PCT` docblock also records that this was the owner re-setting a mis-calibrated
bound, not an implementer quieting an alarm about their own work.

**The test is renamed, not deleted.**
`testR2BreachesCheck8sTvDependentConstraintsAtTierOne` →
**`testR2SitsInsideCheck8sAmendedBoundsAndWouldHaveBreachedTheOldOnes`**. It still pins both
figures (tier 1 at **50.38%**, spread **4.34×**) and now asserts each is *inside* the amended bound
**and still above the old one**, with a failure message pointing at the constant to revisit. A test
that only asserted "passes" would go green again the moment somebody moved the bounds back; this
one fails.

The stale cross-reference in `testTheAuthoredLadderMeetsEveryConstraintItAloneControls`' docblock
was updated too, so constraint (b) is now explicitly documented as *not* asserted there.

## 2. §2 — test output

**Targeted, all green:**

```
EconomyBaselineTurnoverAuthoringTest + LeaguePayoutResolverTest
OK (30 tests, 228 assertions)

ConfigImportExportCoverageTest
OK (20 tests, 635 assertions)

tests/Service/Economy/ + ConfigImportExportCoverageTest (after all edits)
OK (196 tests, 2525 assertions)
```

All 30 by name, including the renamed test, in `r2-run-2026-11-18/` — every one a `✔`.

**Full suite — it does NOT pass, and it does not pass at `740f2c8e` either:**

```
with my changes:   Tests: 3249, Assertions: 153776, Failures: 6
clean tree @ 740f2c8e: Tests: 3241, Assertions: 153740, Failures: 5
```

(+8 tests = 7 new in `EconomyBaselineTurnoverAuthoringTest`, +1 from splitting the old acceptance
test in two.)

| failure | mine | HEAD |
|---|---|---|
| `NotificationLogCrudControllerTest::testIndexRowIsClickableToADetailPage…` | ✗ | ✗ |
| `CompetitionControllerTest::testShowIncludesResultsOnceRoundsAreProcessed` | ✗ | ✗ |
| `FriendlyResolveSingleMatchTest::testResolvingAnAcceptedChallengeRecordsAFullResult` | ✗ | ✗ |
| `WorldOverviewServiceTest::testMoneyIsConvertedToPoundsAndNullsSurvive` | ✗ | ✗ |
| `NpcClubForeignClubsCitySizeTest::testFindForeignClubsHandlesDefaultCitySizeFields` | ✗ | ✗ |
| `NpcClubForeignClubsCitySizeTest::testFindForeignClubsReturnsCitySizeFields` | ✗ | — |

**The one asymmetry is a demonstrated flake, not a regression.** Three identical isolated runs of
`NpcClubForeignClubsCitySizeTest` on the same tree gave **1, 1 and 2** failures, with the failing
method alternating between the two. The class is non-deterministic independently of this change.

**And the migration cannot have influenced any test.** `config/packages/doctrine.yaml` sets
`dbname_suffix: '_test%env(default::TEST_TOKEN)%'`, so tests run against `wunderkind_test`;
`Version20261118120000` ran against `wunderkind`. Confirmed directly:
`wunderkind_test.game_config.economy_baseline_turnover_pence` is still `[0,0,0,0,0,0,0,0]`.

So: **no regression is introduced**, proven against a full-suite baseline — but the suite does not
pass, which is commit condition 1 as written.

## 3. §3.3 — the annotated gate output

`app:economy:wage-table`, both countries, exit **1**, **31 failure lines**. Full output:
`r2-run-2026-11-18/wage-table.AFTER.txt`. Every line, attributed:

### A. Checks 1 and 2 — 3 lines, EN only → `npc_squad_config` divergence

- *EN tier 8: S_tier (179.3699) is not LOWER than tier 7 (173.6417)*
- *EN: ability 5 is paid MORE at tier 8 than at tier 7*
- *EN: ability 7 is paid MORE at tier 8 than at tier 7*

| | local | dev |
|---|---|---|
| `starter_config.npc_squad_config` reference midpoints | **33, 30, 28, 26, 26, 26, 23, 22** | **26, 23, 21, 20, 19, 18, 17, 17** |

Dev's row is established, not assumed: it is the only row that reproduces the live published scale
`390404650 … 178885951` (`REMAINING-WORK.md` §2f.1, against `game-config-en.LIVE.json`) from live
authored turnover, to the integer. Under it, R2 publishes the brief's asserted scale exactly and
`S_tier` falls at every tier — which `EconomyBaselineTurnoverAuthoringTest` pins through the real
resolver and which is green. The local row is flat across tiers 4–6, which is what breaks the
7→8 step.

### B. Sponsorship — 16 lines, EN and SC → sponsor-band divergence

EN and SC tiers 1–6 and 8 (14 lines), plus *"the tier-8 sponsorship share (53.8%) is more than 3x
the tier-1 share (0.7%)"* for each country (2 lines).

| | local | dev |
|---|---|---|
| club + league sponsorship, tier 1 | **0.7%** of turnover (£2,185,500) | **25.8%** under R2 (29.7% before it) |
| club + league sponsorship, tier 8 | **53.8%** of turnover (£115,640) | **16.8%** under R2 (10.0% before it) |
| `sponsorBandsPence` large band | £250,000 – £800,000 | not this |

Dev's figures are the R2 brief §7's pinned expectation and `REMAINING-WORK.md` §2f.4; both ends sit
inside the agreed 8–30% there. The local bands are orders of magnitude too small at the top, which
is why the share collapses to 0.7% against a £331m turnover.

### C. The harshest bankruptcy band — 10 lines → ⚠️ NOT a divergence. A finding.

EN and SC tiers 1–5: *"the harshest bankruptcy band (£40,000.01) is reached in 0.01 weeks of unpaid
wages (£3,238,043.29/wk) — the ladder has no range left here."*

**This is the one group I cannot attribute to an input divergence, and under the brief's rule that
is why I stopped.** It is not R2's doing, and R2 slightly *improves* it:

- The weekly bill the check divides by is `turnover × 0.45 / 46` — **it depends on nothing but the
  turnover row.** Not the squad midpoints, not TV, not the sponsor bands. At tier 1:
  `£331m × 0.45 ÷ 46 = £3,238,043/wk`, which is exactly the figure printed.
- So it will read **identically on dev** after R2, and it already reads **worse** there before R2:
  `£388,661,539 × 0.45 ÷ 46 = £3,801,742/wk`.
- The cause is `bankruptcyDeductionTiers` being flat **pence absolutes with no tier dimension** —
  the harshest band begins at `deficitMin 4000001` (£40,000.01) — against weekly wage bills in the
  millions. Any authored turnover trips it at the top of the pyramid.
- It was absent from my BEFORE run only because turnover was unauthored there, so there was no bill
  to measure.

This is the same shape of defect as the flat youth scholarship (a flat £250, 1.97× an average
tier-8 wage and 0.19% of a tier-1 one) and the flat staff role bands, both already fixed by giving
them a tier dimension. **It is in no R2 brief and is nobody's action yet.**

### D. `bankruptcyDeductionTiers` rows 4 and 5 unreachable — 2 lines → pre-existing

*"row 4 / row 5 has deficitMax null behind another unbounded row — under first-match-wins it can
never be reached."* Present in the BEFORE run with turnover unauthored, so unrelated to R2. The
column really is malformed: row 3 is `deficitMin 500001, deficitMax null`, so rows 4 (£10,000.01)
and 5 (£40,000.01) can never match. Worth noting that the band group C complains about is one of
these unreachable rows.

**3 + 16 + 10 + 2 = 31.** ✓

One thing the local box cannot show: **the amended bounds never fire here**, because this box's
tier-1 TV deal is £10m rather than £136m, so its TV+payout share is ~3–12% rather than 11.6–50.4%.
The amendment's effect is pinned by the renamed unit test instead, which is the only place it can be
checked without dev's TV table.

## 4. Why I did not commit

The brief's three conditions:

| condition | met? |
|---|---|
| 1. The full test suite passes | ❌ — 5 failures on a clean tree at `740f2c8e`, one class non-deterministic. No regression from this change (§2), but it does not pass. |
| 2. §1 done, docblocks carrying the reasoning, renamed test green | ✅ |
| 3. Every remaining gate failure attributed to a named input divergence, with local and dev values | ❌ — 21 of 31 yes (§3 A and B). **10 cannot be** (§3 C): they are turnover-driven and would read identically on dev. 2 more are pre-existing (§3 D). |

> *"A failure you cannot attribute that way is a finding: stop and report it instead of
> committing."*

Group C is exactly that, so I stopped. I could also have read the rule as satisfied in spirit —
nothing is unexplained, and R2 causes none of it — but the brief replaced one unreachable condition
rather than letting me improvise around it, so I am not improvising around this one either.

**What I think should happen** (your call, and I did not act on it): condition 1 becomes
"no regression against a full-suite baseline at `740f2c8e`", which is demonstrated; condition 3
gains "or to a named pre-existing defect shown independent of R2", which group C and group D are.
On that reading all three hold and the commit can go ahead as drafted. I have the commit message
ready and will commit on your word.

## 5. `.context` stages touched this time

- **`04_interfaces/output/services.md`** — check 8's documented bounds corrected to 10–55% and 5×,
  with the reasoning and what was deliberately *not* touched.
- **`07_synthesis/output/current-focus.md`** — finding 3 marked ruled and the amendment recorded;
  **new finding 4** for the bankruptcy ladder; the commit status rewritten to say which conditions
  are unmet and why.
- **`shared/last-sync.md`** — an entry for this pass, carrying finding 4.

(`03_data/output/migrations.md` was updated in the previous pass and needed nothing here.)

## 6. Unchanged from the previous report

Step 6 (regenerate the bottom two tiers, `app:worldpack:maintain`, the three exports) remains
deferred as a deploy-time action, and `current-focus.md` still says so. I changed no app code, so
the tier-7 `intdiv`/`Math.round` squad-size divergence is untouched and still routed separately.
The bottom ability bands are untouched. Nothing is pushed.
