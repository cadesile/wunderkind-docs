<!-- STATUS --> **STATUS:** ✅ Harness reference-squad floor. Merged 2026-11-18.

---

# REPORT — The harness and the backend disagree about the tier-7 reference squad

**Task:** `app-harness-squad-size-brief.md`. **Repo:** `wunderkind-app` only; nothing in
`wunderkind-backend` was read for write or touched.

| | |
|---|---|
| Branch | **`harness-reference-squad-floor`**, cut from `dev` @ `a3acb25a` |
| Fix commit | **`b8ce310c`** — "Floor the harness's reference squad, as the backend's resolver does" |
| `.context` commit | **`2523414a`** — "Record the reference-squad floor in .context (eightieth pass)" |
| Pushed | **No.** Both commits are local to that branch |
| Files changed | `src/economy/harness/loadExport.ts` (1 expression + comment), `src/__tests__/economy/loadExport.test.ts` (+2 tests), 3 `.context` files, `CLAUDE.md` (gitignored mirror) |
| Authored figures changed | **none** |

## 1. The change

`src/economy/harness/loadExport.ts`, `loadEconomyExport()`:

```diff
     const squadRow = squadCfg[String(row.tier)];
+    // FLOOR, mirroring `EconomyScaleResolver::referenceSquadSize()`'s `intdiv(min + max, 2)`.
+    // ... (8-line comment: the odd-sum case, tier 7, and the constant-flatness proof)
     const appSquadSize = squadRow
-      ? Math.max(1, Math.round(((squadRow.playerMin ?? 0) + (squadRow.playerMax ?? 0)) / 2))
+      ? Math.max(1, Math.floor(((squadRow.playerMin ?? 0) + (squadRow.playerMax ?? 0)) / 2))
       : (ENGLAND_DEV.find((t) => t.tier === row.tier)?.appSquadSize ?? 20);
```

## 2. The §2 constant, computed both ways

Reproduced with a throwaway script **before** any edit, reading `game-config-en.LIVE.json` and
`starter-config.LIVE.json` from the app repo root. `k = wageCurveExponentBp / 10000 = 2.5`;
`Σ` over `size` integer abilities evenly spaced across the tier's starter-config band.

Verbatim output:

```

=== floored (min+max)/2 ===  k=2.5
tier 1  min/max 24/28  size 26  band 40-90  scale 390404650  turnover 38866154000  => 9782.608696
tier 2  min/max 20/26  size 23  band 30-60  scale 349216683  turnover 12004975700  => 9782.608687
tier 3  min/max 18/24  size 21  band 20-40  scale 312374073  turnover 3557660200  => 9782.608694
tier 4  min/max 17/23  size 20  band 15-35  scale 279418383  turnover 1990900900  => 9782.608681
tier 5  min/max 17/21  size 19  band 10-25  scale 249939558  turnover 707179600  => 9782.608684
tier 6  min/max 16/20  size 18  band 10-15  scale 223570772  turnover 233989900  => 9782.608713
tier 7  min/max 16/19  size 17  band 5-10  scale 199984018  turnover 58278500  => 9782.608687
tier 8  min/max 16/18  size 17  band 2-7  scale 178885951  turnover 16485200  => 9782.608677

=== rounded (min+max)/2 ===  k=2.5
tier 1  min/max 24/28  size 26  band 40-90  scale 390404650  turnover 38866154000  => 9782.608696
tier 2  min/max 20/26  size 23  band 30-60  scale 349216683  turnover 12004975700  => 9782.608687
tier 3  min/max 18/24  size 21  band 20-40  scale 312374073  turnover 3557660200  => 9782.608694
tier 4  min/max 17/23  size 20  band 15-35  scale 279418383  turnover 1990900900  => 9782.608681
tier 5  min/max 17/21  size 19  band 10-25  scale 249939558  turnover 707179600  => 9782.608684
tier 6  min/max 16/20  size 18  band 10-15  scale 223570772  turnover 233989900  => 9782.608713
tier 7  min/max 16/19  size 18  band 5-10  scale 199984018  turnover 58278500  => 10297.894068
tier 8  min/max 16/18  size 17  band 2-7  scale 178885951  turnover 16485200  => 9782.608677
```

**Floored: 9782.608696 at all eight tiers** — the spread is 9782.608677 … 9782.608713, i.e. flat
to ten significant figures (the residue is float noise in the published micro-pence ladder).
**Rounded: tier 7 alone comes out 10297.894068**, 5.27% off, every other tier unmoved.

Tier 7 is the only odd `playerMin + playerMax` in the live table — the sums are
52 / 46 / 42 / 40 / 38 / 36 / **35** / 34 — which is why a whole-table arithmetic defect presented
as exactly one tier.

## 3. Every consumer of the squad size, and what the one-player change does to each

Found by `grep -rn "appSquadSize\|referenceSquadSize"` across `src/` and `scripts/`:

| Consumer | Effect of 18 → 17 at tier 7 |
|---|---|
| `loadExport.ts` → `referenceSquad(band, appSquadSize)` | The priced squad. Feeds `turnoverAvgWeeklyPence` and `legacyAvgWeeklyPence` — **the intended fix**; tier 7's figure was ~5% low |
| `TierFixture.appSquadSize` → `runHarness`'s `squadSizeFor` | The season wage bill at tier 7 (size × avg wage). Moves; shows up as the `bill%` rows below |
| `simulate.ts` `realizedWageShares()` → `seasonBill`, `squadRatio` | The A7 report printed by `gate.ts` and `harness.ts`. `squadRatio` at tier 7 goes 18/23 → 17/23 |
| `driftAgainstFixture()`, field `appSquadSize` | **The finding below** |
| `fixtures.ts` `ENGLAND_DEV` | No change needed — already floored. See §4 |

Nothing outside `src/economy/harness/` and `scripts/economy/` reads either field: this is harness
and reporting only, and no game-engine or store path is involved.

## 4. The fixture consequence — a true drift finding nobody read

`ENGLAND_DEV`'s tier 7 already carries `appSquadSize: 17`, the **floored** value. So the fixture
did *not* disagree with the floored reading and needed no change. But the corollary is the finding:

- `driftAgainstFixture` compares `appSquadSize` against the fixture at a 5% default threshold.
- Fixture 17 vs loader 18 is `|18 − 17| / 17 = 5.88%` — **over** the threshold.
- So the drift table has been emitting a tier-7 `appSquadSize` row **for as long as the bug
  existed**, in a table whose own docblock says "**Any row over the threshold is now a FINDING**,
  not a confirmation". It was a genuine finding, correctly reported, and read as noise.

The fix removes the row. The second new test asserts the loader and the fixture agree on every
tier's squad size, so that channel stays clean enough for the next real row to stand out.

`referenceSquadSize` (23 at tier 7) is a **different quantity** — the squad the backend calibrated
`S_tier` against, not the one the app fields — and is deliberately untouched.

## 5. The two gate runs, verbatim

Command, identical both times:

```bash
npx tsx scripts/economy/variantGate.ts --export game-config-en.LIVE.json \
  --starter-config starter-config.LIVE.json --world world.json --country EN
```

### 5a. COVERAGE — byte-identical

The stated stop condition. COVERAGE has no wage term, so any movement would have meant the squad
size reaches something unmapped. It does not move. The whole "Income composition" block hashes
identically:

```
$ for f in gate-before gate-after; do sed -n '/Income composition/,/REPORTED, NOT A VERDICT/p' $f.txt | md5 -q; done
9b897b546c8b92b1dd1067a6a318724c
9b897b546c8b92b1dd1067a6a318724c
```

Verdict line, both runs:

```
VARIANT GATE: PASS — every tier solvent for 30 seasons once wages follow income
```

### 5b. The complete diff of the two runs

Every line that moved, and nothing else:

```
--- /private/tmp/claude-501/-Users-courtneyadesile-Documents-WunderkindFactory-wunderkind-app/6f8b6feb-fbae-4986-9c8e-6c6bd6b53cdb/scratchpad/gate-before.txt	2026-11-18 20:25:34
+++ /private/tmp/claude-501/-Users-courtneyadesile-Documents-WunderkindFactory-wunderkind-app/6f8b6feb-fbae-4986-9c8e-6c6bd6b53cdb/scratchpad/gate-after.txt	2026-11-18 20:26:32
@@ -39,7 +39,7 @@
   4  | 71.3% |         never | 70.7% |         never | 71.2% |     never |    £173,418,869
   5  | 73.2% |         never | 73.6% |         never | 73.3% |     never |     £56,339,263
   6  | 93.8% |         never | 48.8% |         never | 77.6% |     never |     £30,241,030
-  7  | 115.8% |      season 1 | 45.5% |         never | 80.7% |     never |      £8,602,965
+  7  | 112.7% |      season 1 | 44.2% |         never | 80.7% |     never |      £8,602,965
   8  | 229.6% |      season 1 | 42.9% |         never | 91.7% |     never |      £2,195,975
 
   insolvent once FLIPPED: none
@@ -56,10 +56,10 @@
   4  | 60.0% |  11.3%     | 59.4% |  11.2%     | 60.0% |  11.2%
   5  | 60.0% |  13.2%     | 60.3% |  13.3%     | 60.0% |  13.3%
   6  | 60.0% |  33.8%     | 31.2% |  17.6%     | 60.0% |  17.6%
-  7  | 63.2% |  52.7%     | 24.8% |  20.7%     | 60.0% |  20.7%
+  7  | 60.0% |  52.7%     | 23.6% |  20.7%     | 60.0% |  20.7%
   8  | 60.0% | 169.6%     | 11.2% |  31.7%     | 60.0% |  31.7%
 
-  AUTHORED wage share spans 60.0% - 63.2% (spread 3.2 points).
+  AUTHORED wage share spans 60.0% - 60.0% (spread 0.0 points).
   ⚠️ A FLAT wage share across the pyramid is the authored table being internally
      consistent. If this row is flat, any published "wage calibration mismatch" was
      between two DOCUMENTS, not inside the config.
@@ -73,7 +73,7 @@
   4  | 71.3% |     never |    £171,125,346 || 70.7% |     never |   £176,859,359
   5  | 73.2% |     never |     £56,781,773 || 73.6% |     never |    £55,675,928
   6  | 93.8% |     never |      £4,339,185 || 48.8% |     never |    £69,094,148
-  7  | 115.8% |  season 1 |     -£2,764,331 || 45.5% |     never |    £24,272,886
+  7  | 112.7% |  season 1 |     -£2,211,853 || 44.2% |     never |    £24,825,365
   8  | 229.6% |  season 1 |     -£6,407,884 || 42.9% |     never |    £15,102,051
 
 ── F5.5: first two seasons — MODELLED (wages on authored turnover — NOT what runs today) 
@@ -84,7 +84,7 @@
   4  | £20,100,143 | £11,945,403 |    70.7% | £5,895,312 | £11,790,624 | no
   5  |  £7,034,935 |  £4,243,072 |    73.6% | £1,855,864 | £3,711,729 | no
   6  |  £4,498,398 |  £1,403,935 |    48.8% | £2,303,138 | £4,606,277 | no
-  7  |  £1,484,026 |    £368,085 |    45.5% |   £809,096 | £1,618,192 | no
+  7  |  £1,484,026 |    £349,669 |    44.2% |   £827,512 | £1,655,024 | no
   8  |    £881,850 |     £98,907 |    42.9% |   £503,402 | £1,006,803 | no
   tiers generating rescues in seasons 1-2: none
 
```

Four blocks moved, all at tier 7, all wage-side — which is the fix working:

| Row | Before | After |
|---|---|---|
| AUTHORED `bill%` | 115.8% | **112.7%** |
| MODELLED `bill%` | 45.5% | **44.2%** |
| AUTHORED balance | −£2,764,331 | **−£2,211,853** |
| MODELLED balance | £24,272,886 | **£24,825,365** |
| F5.5 MODELLED s1 bill | £368,085 | **£349,669** |
| AUTHORED wage share | 63.2% | **60.0%** |
| MODELLED wage share | 24.8% | **23.6%** |

Unmoved, and worth noting: the **FLIPPED** column (80.7%, balance £8,602,965) does not move at
all, because FLIPPED anchors wages to modelled income rather than to the authored turnover the
reference squad prices. Tier 7's insolvency-on-AUTHORED verdict ("season 1") also stands — the
fix narrows the gap, it does not close it, and that remains the backend's R2 authoring question.

### 5c. ⚠️ The confirmation hiding in the wage-share row

```
-  AUTHORED wage share spans 60.0% - 63.2% (spread 3.2 points).
+  AUTHORED wage share spans 60.0% - 60.0% (spread 0.0 points).
```

The gate prints its own reading of that row directly underneath:

> ⚠️ A FLAT wage share across the pyramid is the authored table being internally consistent. If
> this row is flat, any published "wage calibration mismatch" was between two DOCUMENTS, not
> inside the config.

So the 3.2-point spread the gate has been reporting **was this bug**, not a property of the
backend's numbers — tier 7 was the only tier off 60.0%, by exactly the squad-size error. The gate
was attributing the app's arithmetic mistake to the authored config. That is independent
corroboration of floor being correct, from a figure the brief did not predict would move, and it
is the strongest single piece of evidence in this report after the §2 constant.

## 6. `tsc` and the suite

```
$ npx tsc --noEmit ; echo "tsc exit=$?"
tsc exit=0
```

(One intermediate failure, fixed before commit: the new test first read
`EN.npcSquadConfig!['7']!.playerMin`, which `tsc` rejects — the declared type is the normalized
`NpcSquadTierConfig[]`, while the **wire** shape the loader actually reads is a dict of
`playerMin`/`playerMax` keyed by tier. The test now casts exactly as `loadExport.ts` does, with a
comment saying why, and asserts the wire values `16`/`19` so the cast cannot silently read
nothing.)

```
$ npm test   # full suite, this branch
Test Suites: 636 passed, 636 total
Tests:       3 skipped, 10629 passed, 10632 total
Snapshots:   0 total
Time:        403.645 s
Ran all test suites.

$ npx jest --listTests | wc -l
     636
```

636 = 636: the suite count is confirmed, not just the absence of failures. 0 `FAIL` lines in the
log, 636 `PASS` lines.

### 6a. ⚠️ The green-master bar's `dev` row was stale a sixth time

`CLAUDE.md` / `environment.md` had `dev` at **635 / 10,602**. Rather than derive the baseline by
subtracting this branch's two tests, I **stashed the two source files and ran the full suite on
the clean tree**:

```
$ git stash push -- src/economy/harness/loadExport.ts src/__tests__/economy/loadExport.test.ts
$ npx jest --listTests | wc -l
     636
$ npm test
Test Suites: 636 passed, 636 total
Tests:       3 skipped, 10627 passed, 10630 total
```

So `dev` @ `a3acb25a` is **636 / 10,627**, and this branch is exactly that plus 2 tests, no new
suite. **Measuring rather than subtracting is the only reason the staleness was caught** — a
derived baseline would have matched the branch perfectly and concealed it.

The reason this row went stale is a *new* one worth recording, and it is in `environment.md`: the
row was **correct when written** (2026-11-16, at the `new-game-save` → `dev` merge commit) and went
stale because `dev` subsequently received the income-truth batch (`86a6410f`…`a3acb25a`). The five
previous stalings were all "nobody re-measured as work landed"; this one is "the row's commit
stopped being the branch tip", which a dated row is supposed to make visible and does not.

Also now stated in `environment.md`, because it cost time here: **each row's headline test figure
is the PASSED count and `collected` is 3 higher** (the 3 skipped tests). The table used both
conventions without saying so — `dev`'s 10,602 against `economy-income-truth`'s 10,627 with
"10,630 collected" beside it — and comparing one against the other manufactures a 3-test
discrepancy that looks exactly like drift.

## 7. `.context` updated

Per §4b — own entry appended, stage text my change makes wrong corrected, nothing else curated.

| File | Change |
|---|---|
| `shared/last-sync.md` | 2026-11-18 defect entry marked **✅ FIXED in place**, not deleted. New **eightieth pass** entry in the file's format |
| `02_architecture/output/structure.md` | The `harness/` entry now states the floor, the invariant, and the general rule: where `loadExport.ts` mirrors a backend function, a plausible local idiom is a defect |
| `01_overview/output/environment.md` | Green-master bar: `dev` corrected, this branch's row added, the passed/collected convention stated |
| `CLAUDE.md` | Re-mirrored from `environment.md` (one-way). **Gitignored, so not in either commit** |

## 8. Flagged for the project-manager review, not acted on

1. **`.context/stages/07_synthesis/output/game-mechanics.md` is left modified and uncommitted** in
   the working tree. It is the project-manager session's own seventy-ninth-pass edit, present
   before this task started, and is not mine to commit. **`shared/last-sync.md` necessarily
   carries that session's seventy-ninth-pass entry**, which was also uncommitted — the eightieth
   pass entry sits above it in the same file and refers to it, so the two could not be separated
   without rewriting the file, which §4b forbids. Commit `2523414a` therefore contains an entry
   this session did not author. Flagged rather than worked around.
2. **`fixtures.ts`'s header is now partly stale, and I did not touch it.** It says "The turnover
   table is UNAUTHORED on every deployed backend — it ships as eight zeros", and the test
   `loads all eight tiers, none skipped — dev has the table authored` plus every gate run above
   show that is no longer true for EN on dev. The same header's "**When an operator authors the
   real table, re-derive this file from it — do not hand-edit it**" has also come due. Out of
   scope here (no authored figure may change), but it is the next reader's trap.
3. **`referenceSquadSize` has no cross-repo invariant and no test.** `appSquadSize` now has both.
   The fixture's values (33/30/28/26/26/26/23/22) come from a development clone's calibration that
   `fixtures.ts`'s own `CALIBRATION_MISMATCH_FACTOR` block says is mismatched with the turnover
   ladder. If the backend publishes the figure `S_tier` was calibrated against, that is the other
   half of this defect class — two values of the same shape where only one side is authoritative.
4. **The gate's tier-7 AUTHORED verdict is still "insolvent, season 1"** (112.7%, down from
   115.8%). This fix moves it 3.1 points and no further; it is not a contribution to the R2
   authoring question, and should not be read as one.

---

## Appendix A — gate run BEFORE the fix, verbatim

```
$ npx tsx scripts/economy/variantGate.ts --export game-config-en.LIVE.json --starter-config starter-config.LIVE.json --world world.json --country EN
============================================================================================
THE VARIANT GATE — authored turnover vs the income the engine pays
SOURCE: EN · 8 tiers · 30 seasons · REAL grounds from the world export
Modelled club finishes 10th — pass --position to change it
capacityCalculation 1250 (from the export, NOT the app default) · ticketPriceElasticity ON (derived from wageModel) · ticket price PUBLISHED per tier, 80-14 GBP (the price the live game charges, both modes)
BOTH runs use the same wage model, upkeep, renewals and seed. Only the revenue line differs.
============================================================================================

── Income composition, season 1, as a share of AUTHORED turnover ───────
   COVERAGE = modelled income / authored turnover. TARGET 85-110% at every tier.
   Outside that band the wage anchor and the revenue model disagree about what a
   division is worth: under 85% every club is poorer than its own wage bill assumes,
   over 110% the authored turnover has stopped being the thing wages are priced from.
tier |     TV | matchday |  shirt | club spon | league spon |  prize | position || COVERAGE
  1  |  35.0% |     9.2% |   4.2% |      7.3% |       14.7% |   0.0% |     2.6% ||  73.0%  <-- outside 85-110%
  2  |  28.0% |    23.1% |   5.6% |      8.3% |       13.8% |   0.0% |     6.7% ||  85.4%
  3  |  20.0% |    27.2% |  11.2% |      6.3% |       15.7% |   0.0% |    14.1% ||  94.4%
  4  |  15.0% |    38.3% |  10.6% |      7.3% |       14.7% |   0.0% |    15.1% || 101.0%
  5  |  11.0% |    47.3% |  12.5% |      4.9% |        9.7% |   0.0% |    14.1% ||  99.5%
  6  |   8.0% |   111.1% |  14.0% |      7.3% |       14.7% |   0.0% |    37.2% || 192.2%  <-- outside 85-110%
  7  |   5.0% |   124.0% |  17.8% |      8.8% |       13.2% |   0.0% |    85.8% || 254.6%  <-- outside 85-110%
  8  |   3.0% |   365.0% |  23.7% |      8.8% |       13.2% |   0.0% |   121.3% || 534.9%  <-- outside 85-110%

  COVERAGE outside 85-110%: 1, 6, 7, 8
  ⚠️ REPORTED, NOT A VERDICT. The verdict still follows the FLIPPED column below —
     coverage says whether the revenue model and the authored ladder agree about a
     division, which is a different question from whether a club stays solvent.

── N6: THE THREE VERDICTS ──────────────────────────────────────────────
  AUTHORED   = today: the gate credits authored turnover and budgets off it too
  MODELLED   = the problem: real income, wages still anchored to authored turnover
  FLIPPED    = Option 1: real income, wages anchored to THAT income

tier | AUTHORED              | MODELLED              | FLIPPED
     | bill% | insolvent     | bill% | insolvent     | bill% | insolvent | balance @ s30
  1  | 63.6% |         never | 87.1% |         never | 64.9% |     never |  £2,989,178,718
  2  | 69.7% |         never | 81.7% |         never | 71.4% |     never |    £878,942,622
  3  | 67.2% |         never | 71.2% |         never | 67.6% |     never |    £326,141,156
  4  | 71.3% |         never | 70.7% |         never | 71.2% |     never |    £173,418,869
  5  | 73.2% |         never | 73.6% |         never | 73.3% |     never |     £56,339,263
  6  | 93.8% |         never | 48.8% |         never | 77.6% |     never |     £30,241,030
  7  | 115.8% |      season 1 | 45.5% |         never | 80.7% |     never |      £8,602,965
  8  | 229.6% |      season 1 | 42.9% |         never | 91.7% |     never |      £2,195,975

  insolvent once FLIPPED: none
  ⚠️ Read the FLIPPED column over the whole run, not season 1. `renewalTurnoverRate`
     converges a re-anchored bill over about three seasons, which is the
     grandfathering decision — a club over-committed in season 1 is expected.

── The same bill, split — wages vs upkeep (season 1) ───────────────────
     |      AUTHORED      |      MODELLED      |      FLIPPED
tier | wages | upkeep     | wages | upkeep     | wages | upkeep
  1  | 60.0% |   3.6%     | 82.2% |   4.9%     | 60.0% |   4.9%
  2  | 60.0% |   9.7%     | 70.3% |  11.4%     | 60.0% |  11.4%
  3  | 60.0% |   7.2%     | 63.6% |   7.6%     | 60.0% |   7.6%
  4  | 60.0% |  11.3%     | 59.4% |  11.2%     | 60.0% |  11.2%
  5  | 60.0% |  13.2%     | 60.3% |  13.3%     | 60.0% |  13.3%
  6  | 60.0% |  33.8%     | 31.2% |  17.6%     | 60.0% |  17.6%
  7  | 63.2% |  52.7%     | 24.8% |  20.7%     | 60.0% |  20.7%
  8  | 60.0% | 169.6%     | 11.2% |  31.7%     | 60.0% |  31.7%

  AUTHORED wage share spans 60.0% - 63.2% (spread 3.2 points).
  ⚠️ A FLAT wage share across the pyramid is the authored table being internally
     consistent. If this row is flat, any published "wage calibration mismatch" was
     between two DOCUMENTS, not inside the config.

── The two original verdicts, for reference ────────────────────────────
     |      AUTHORED REVENUE       ||      MODELLED REVENUE
tier | bill% | insolvent | balance || bill% | insolvent |        balance
  1  | 63.6% |     never |  £4,249,601,024 || 87.1% |     never | £1,098,545,171
  2  | 69.7% |     never |  £1,089,904,246 || 81.7% |     never |   £562,500,263
  3  | 67.2% |     never |    £350,135,150 || 71.2% |     never |   £290,151,252
  4  | 71.3% |     never |    £171,125,346 || 70.7% |     never |   £176,859,359
  5  | 73.2% |     never |     £56,781,773 || 73.6% |     never |    £55,675,928
  6  | 93.8% |     never |      £4,339,185 || 48.8% |     never |    £69,094,148
  7  | 115.8% |  season 1 |     -£2,764,331 || 45.5% |     never |    £24,272,886
  8  | 229.6% |  season 1 |     -£6,407,884 || 42.9% |     never |    £15,102,051

── F5.5: first two seasons — MODELLED (wages on authored turnover — NOT what runs today) 
tier |   s1 income |     s1 bill | s1 bill% | s1 balance | s2 balance | rescue?
  1  | £283,626,345 | £233,196,925 |    87.1% | £36,618,172 | £73,236,345 | no
  2  | £102,469,624 | £72,029,853 |    81.7% | £18,750,009 | £37,500,018 | no
  3  | £33,577,139 | £21,345,947 |    71.2% | £9,671,708 | £19,343,417 | no
  4  | £20,100,143 | £11,945,403 |    70.7% | £5,895,312 | £11,790,624 | no
  5  |  £7,034,935 |  £4,243,072 |    73.6% | £1,855,864 | £3,711,729 | no
  6  |  £4,498,398 |  £1,403,935 |    48.8% | £2,303,138 | £4,606,277 | no
  7  |  £1,484,026 |    £368,085 |    45.5% |   £809,096 | £1,618,192 | no
  8  |    £881,850 |     £98,907 |    42.9% |   £503,402 | £1,006,803 | no
  tiers generating rescues in seasons 1-2: none

── F5.5: first two seasons — FLIPPED — incomeAnchoredWages ON, WHAT THE GAME RUNS TODAY 
tier |   s1 income |     s1 bill | s1 bill% | s1 balance | s2 balance | rescue?
  1  | £283,626,345 | £170,175,807 |    64.9% | £99,639,291 | £199,278,581 | no
  2  | £102,469,624 | £61,481,775 |    71.4% | £29,298,087 | £58,596,175 | no
  3  | £33,577,139 | £20,146,283 |    67.6% | £10,871,372 | £21,742,744 | no
  4  | £20,100,143 | £12,060,086 |    71.2% | £5,780,629 | £11,561,258 | no
  5  |  £7,034,935 |  £4,220,961 |    73.3% | £1,877,975 | £3,755,951 | no
  6  |  £4,498,398 |  £2,699,039 |    77.6% | £1,008,034 | £2,016,069 | no
  7  |  £1,484,026 |    £890,415 |    80.7% |   £286,766 |   £573,531 | no
  8  |    £881,850 |    £529,110 |    91.7% |    £73,199 |   £146,398 | no
  tiers generating rescues in seasons 1-2: none
  ⚠️ `bill%` is the WHOLE recurring bill (player + staff wages + upkeep) over MODELLED
     income — not a wage share, and not comparable to the authored-revenue columns.
  ⚠️ Every cost here is a FLOOR: no transfers, no matchday variance, no injury load,
     and the balance starts at ZERO rather than at the club's authored opening cash.

── F5.4: relegation, two seasons, with the parachute ───────────────────
w(0) = the bill carried down · target = the same ratio at the new tier
from→to |       w(0) |     w(s1) |     w(s2) | parachute s1 | s1 balance | s2 balance
   1→2   | £233,196,924 | £179,474,567 | £143,659,663 |  £72,029,854 | -£4,975,089 | £1,854,775
   2→3   | £72,029,854 | £55,135,223 | £43,872,136 |  £21,345,961 |  -£212,123 | £3,723,521
   3→4   | £21,345,961 | £18,212,443 | £16,123,430 |  £11,945,406 | £13,833,106 | £25,773,422
   4→5   | £11,945,405 | £9,377,963 | £7,666,334 |   £4,243,077 | £1,900,049 | £4,097,368
   5→6   | £4,243,078 | £3,296,698 | £2,665,779 |   £1,403,939 | £2,605,639 | £5,374,218
   6→7   | £1,403,939 | £1,052,517 |  £818,235 |     £349,671 |   £781,180 | £1,680,084
   7→8   |   £349,671 |  £266,084 |  £210,360 |      £98,911 |   £714,676 | £1,452,107
  ⚠️ The bill ALWAYS converges — w(k) approaches the target geometrically from
     above, by construction. A negative balance here is an income problem at the
     destination tier, never a wage spiral.

── What the substitution changed ───────────────────────────────────────
  insolvent on AUTHORED revenue: 7, 8
  insolvent on MODELLED revenue: none
  ✅ pass only once income is modelled: tiers 7, 8

── Caveats that travel with this verdict ───────────────────────────────
  · A FLOOR on income. Not modelled, and so absent from every figure above:
      investor_income — investor performance bonuses, re-rolled each season
      pyramid_distribution — the pyramid payout
      win_bonus — per-result bonus
      fan_initiative · dividend_draw · tournament_prize · guardian_payment
  · The insolvency ladder has NO EFFECTS in this sim: a negative balance is recorded
    and the run continues. "Insolvent in season N" means the arithmetic goes negative,
    not that the club is wound up or deducted points.
  · Transfers, matchday variance and the player's own decisions are absent.
  · Prize and position money are rescaled by 1.000x — the tier-1 tvDeal ratio
    between the world export and live. THIS IS THE WEAKEST INPUT IN THE RUN; a fresh
    authenticated GET /api/initialize/leagues removes the need for it entirely.
  · AUTHORED and MODELLED both anchor wages to AUTHORED turnover — that mismatch is
    the thing being measured. Only FLIPPED anchors them to the income it credits.

============================================================================================
VARIANT GATE: PASS — every tier solvent for 30 seasons once wages follow income
  no diagnosis: every tier pays its bills on modelled revenue too, so this run is
  not itself an argument for flipping the flag.
============================================================================================
```

## Appendix B — gate run AFTER the fix, verbatim

```
$ npx tsx scripts/economy/variantGate.ts --export game-config-en.LIVE.json --starter-config starter-config.LIVE.json --world world.json --country EN
============================================================================================
THE VARIANT GATE — authored turnover vs the income the engine pays
SOURCE: EN · 8 tiers · 30 seasons · REAL grounds from the world export
Modelled club finishes 10th — pass --position to change it
capacityCalculation 1250 (from the export, NOT the app default) · ticketPriceElasticity ON (derived from wageModel) · ticket price PUBLISHED per tier, 80-14 GBP (the price the live game charges, both modes)
BOTH runs use the same wage model, upkeep, renewals and seed. Only the revenue line differs.
============================================================================================

── Income composition, season 1, as a share of AUTHORED turnover ───────
   COVERAGE = modelled income / authored turnover. TARGET 85-110% at every tier.
   Outside that band the wage anchor and the revenue model disagree about what a
   division is worth: under 85% every club is poorer than its own wage bill assumes,
   over 110% the authored turnover has stopped being the thing wages are priced from.
tier |     TV | matchday |  shirt | club spon | league spon |  prize | position || COVERAGE
  1  |  35.0% |     9.2% |   4.2% |      7.3% |       14.7% |   0.0% |     2.6% ||  73.0%  <-- outside 85-110%
  2  |  28.0% |    23.1% |   5.6% |      8.3% |       13.8% |   0.0% |     6.7% ||  85.4%
  3  |  20.0% |    27.2% |  11.2% |      6.3% |       15.7% |   0.0% |    14.1% ||  94.4%
  4  |  15.0% |    38.3% |  10.6% |      7.3% |       14.7% |   0.0% |    15.1% || 101.0%
  5  |  11.0% |    47.3% |  12.5% |      4.9% |        9.7% |   0.0% |    14.1% ||  99.5%
  6  |   8.0% |   111.1% |  14.0% |      7.3% |       14.7% |   0.0% |    37.2% || 192.2%  <-- outside 85-110%
  7  |   5.0% |   124.0% |  17.8% |      8.8% |       13.2% |   0.0% |    85.8% || 254.6%  <-- outside 85-110%
  8  |   3.0% |   365.0% |  23.7% |      8.8% |       13.2% |   0.0% |   121.3% || 534.9%  <-- outside 85-110%

  COVERAGE outside 85-110%: 1, 6, 7, 8
  ⚠️ REPORTED, NOT A VERDICT. The verdict still follows the FLIPPED column below —
     coverage says whether the revenue model and the authored ladder agree about a
     division, which is a different question from whether a club stays solvent.

── N6: THE THREE VERDICTS ──────────────────────────────────────────────
  AUTHORED   = today: the gate credits authored turnover and budgets off it too
  MODELLED   = the problem: real income, wages still anchored to authored turnover
  FLIPPED    = Option 1: real income, wages anchored to THAT income

tier | AUTHORED              | MODELLED              | FLIPPED
     | bill% | insolvent     | bill% | insolvent     | bill% | insolvent | balance @ s30
  1  | 63.6% |         never | 87.1% |         never | 64.9% |     never |  £2,989,178,718
  2  | 69.7% |         never | 81.7% |         never | 71.4% |     never |    £878,942,622
  3  | 67.2% |         never | 71.2% |         never | 67.6% |     never |    £326,141,156
  4  | 71.3% |         never | 70.7% |         never | 71.2% |     never |    £173,418,869
  5  | 73.2% |         never | 73.6% |         never | 73.3% |     never |     £56,339,263
  6  | 93.8% |         never | 48.8% |         never | 77.6% |     never |     £30,241,030
  7  | 112.7% |      season 1 | 44.2% |         never | 80.7% |     never |      £8,602,965
  8  | 229.6% |      season 1 | 42.9% |         never | 91.7% |     never |      £2,195,975

  insolvent once FLIPPED: none
  ⚠️ Read the FLIPPED column over the whole run, not season 1. `renewalTurnoverRate`
     converges a re-anchored bill over about three seasons, which is the
     grandfathering decision — a club over-committed in season 1 is expected.

── The same bill, split — wages vs upkeep (season 1) ───────────────────
     |      AUTHORED      |      MODELLED      |      FLIPPED
tier | wages | upkeep     | wages | upkeep     | wages | upkeep
  1  | 60.0% |   3.6%     | 82.2% |   4.9%     | 60.0% |   4.9%
  2  | 60.0% |   9.7%     | 70.3% |  11.4%     | 60.0% |  11.4%
  3  | 60.0% |   7.2%     | 63.6% |   7.6%     | 60.0% |   7.6%
  4  | 60.0% |  11.3%     | 59.4% |  11.2%     | 60.0% |  11.2%
  5  | 60.0% |  13.2%     | 60.3% |  13.3%     | 60.0% |  13.3%
  6  | 60.0% |  33.8%     | 31.2% |  17.6%     | 60.0% |  17.6%
  7  | 60.0% |  52.7%     | 23.6% |  20.7%     | 60.0% |  20.7%
  8  | 60.0% | 169.6%     | 11.2% |  31.7%     | 60.0% |  31.7%

  AUTHORED wage share spans 60.0% - 60.0% (spread 0.0 points).
  ⚠️ A FLAT wage share across the pyramid is the authored table being internally
     consistent. If this row is flat, any published "wage calibration mismatch" was
     between two DOCUMENTS, not inside the config.

── The two original verdicts, for reference ────────────────────────────
     |      AUTHORED REVENUE       ||      MODELLED REVENUE
tier | bill% | insolvent | balance || bill% | insolvent |        balance
  1  | 63.6% |     never |  £4,249,601,024 || 87.1% |     never | £1,098,545,171
  2  | 69.7% |     never |  £1,089,904,246 || 81.7% |     never |   £562,500,263
  3  | 67.2% |     never |    £350,135,150 || 71.2% |     never |   £290,151,252
  4  | 71.3% |     never |    £171,125,346 || 70.7% |     never |   £176,859,359
  5  | 73.2% |     never |     £56,781,773 || 73.6% |     never |    £55,675,928
  6  | 93.8% |     never |      £4,339,185 || 48.8% |     never |    £69,094,148
  7  | 112.7% |  season 1 |     -£2,211,853 || 44.2% |     never |    £24,825,365
  8  | 229.6% |  season 1 |     -£6,407,884 || 42.9% |     never |    £15,102,051

── F5.5: first two seasons — MODELLED (wages on authored turnover — NOT what runs today) 
tier |   s1 income |     s1 bill | s1 bill% | s1 balance | s2 balance | rescue?
  1  | £283,626,345 | £233,196,925 |    87.1% | £36,618,172 | £73,236,345 | no
  2  | £102,469,624 | £72,029,853 |    81.7% | £18,750,009 | £37,500,018 | no
  3  | £33,577,139 | £21,345,947 |    71.2% | £9,671,708 | £19,343,417 | no
  4  | £20,100,143 | £11,945,403 |    70.7% | £5,895,312 | £11,790,624 | no
  5  |  £7,034,935 |  £4,243,072 |    73.6% | £1,855,864 | £3,711,729 | no
  6  |  £4,498,398 |  £1,403,935 |    48.8% | £2,303,138 | £4,606,277 | no
  7  |  £1,484,026 |    £349,669 |    44.2% |   £827,512 | £1,655,024 | no
  8  |    £881,850 |     £98,907 |    42.9% |   £503,402 | £1,006,803 | no
  tiers generating rescues in seasons 1-2: none

── F5.5: first two seasons — FLIPPED — incomeAnchoredWages ON, WHAT THE GAME RUNS TODAY 
tier |   s1 income |     s1 bill | s1 bill% | s1 balance | s2 balance | rescue?
  1  | £283,626,345 | £170,175,807 |    64.9% | £99,639,291 | £199,278,581 | no
  2  | £102,469,624 | £61,481,775 |    71.4% | £29,298,087 | £58,596,175 | no
  3  | £33,577,139 | £20,146,283 |    67.6% | £10,871,372 | £21,742,744 | no
  4  | £20,100,143 | £12,060,086 |    71.2% | £5,780,629 | £11,561,258 | no
  5  |  £7,034,935 |  £4,220,961 |    73.3% | £1,877,975 | £3,755,951 | no
  6  |  £4,498,398 |  £2,699,039 |    77.6% | £1,008,034 | £2,016,069 | no
  7  |  £1,484,026 |    £890,415 |    80.7% |   £286,766 |   £573,531 | no
  8  |    £881,850 |    £529,110 |    91.7% |    £73,199 |   £146,398 | no
  tiers generating rescues in seasons 1-2: none
  ⚠️ `bill%` is the WHOLE recurring bill (player + staff wages + upkeep) over MODELLED
     income — not a wage share, and not comparable to the authored-revenue columns.
  ⚠️ Every cost here is a FLOOR: no transfers, no matchday variance, no injury load,
     and the balance starts at ZERO rather than at the club's authored opening cash.

── F5.4: relegation, two seasons, with the parachute ───────────────────
w(0) = the bill carried down · target = the same ratio at the new tier
from→to |       w(0) |     w(s1) |     w(s2) | parachute s1 | s1 balance | s2 balance
   1→2   | £233,196,924 | £179,474,567 | £143,659,663 |  £72,029,854 | -£4,975,089 | £1,854,775
   2→3   | £72,029,854 | £55,135,223 | £43,872,136 |  £21,345,961 |  -£212,123 | £3,723,521
   3→4   | £21,345,961 | £18,212,443 | £16,123,430 |  £11,945,406 | £13,833,106 | £25,773,422
   4→5   | £11,945,405 | £9,377,963 | £7,666,334 |   £4,243,077 | £1,900,049 | £4,097,368
   5→6   | £4,243,078 | £3,296,698 | £2,665,779 |   £1,403,939 | £2,605,639 | £5,374,218
   6→7   | £1,403,939 | £1,052,517 |  £818,235 |     £349,671 |   £781,180 | £1,680,084
   7→8   |   £349,671 |  £266,084 |  £210,360 |      £98,911 |   £714,676 | £1,452,107
  ⚠️ The bill ALWAYS converges — w(k) approaches the target geometrically from
     above, by construction. A negative balance here is an income problem at the
     destination tier, never a wage spiral.

── What the substitution changed ───────────────────────────────────────
  insolvent on AUTHORED revenue: 7, 8
  insolvent on MODELLED revenue: none
  ✅ pass only once income is modelled: tiers 7, 8

── Caveats that travel with this verdict ───────────────────────────────
  · A FLOOR on income. Not modelled, and so absent from every figure above:
      investor_income — investor performance bonuses, re-rolled each season
      pyramid_distribution — the pyramid payout
      win_bonus — per-result bonus
      fan_initiative · dividend_draw · tournament_prize · guardian_payment
  · The insolvency ladder has NO EFFECTS in this sim: a negative balance is recorded
    and the run continues. "Insolvent in season N" means the arithmetic goes negative,
    not that the club is wound up or deducted points.
  · Transfers, matchday variance and the player's own decisions are absent.
  · Prize and position money are rescaled by 1.000x — the tier-1 tvDeal ratio
    between the world export and live. THIS IS THE WEAKEST INPUT IN THE RUN; a fresh
    authenticated GET /api/initialize/leagues removes the need for it entirely.
  · AUTHORED and MODELLED both anchor wages to AUTHORED turnover — that mismatch is
    the thing being measured. Only FLIPPED anchors them to the income it credits.

============================================================================================
VARIANT GATE: PASS — every tier solvent for 30 seasons once wages follow income
  no diagnosis: every tier pays its bills on modelled revenue too, so this run is
  not itself an argument for flipping the flag.
============================================================================================
```
