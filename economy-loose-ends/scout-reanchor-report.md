<!-- STATUS --> **STATUS:** 🟢 DONE — scouts re-anchored to the club's own income rate. App only.

# Scout re-anchor — report

**Task:** re-anchor scouts to the club's own income rate, exactly as staff already are.
**Owner ruling:** 2026-11-20, from a device reading of their own club.
**Repo:** `wunderkind-app` only, branch `new-game-save`. Nothing backend, nothing pushed, nothing deployed.
**Measured at:** `9bac0b18` (`npm test` baseline measured in a detached worktree at that commit).

---

## 1. The headline

A scout was band-priced at ingest and **never re-priced again for the life of the save**. Three
sites, one omission, all spelled `club.staff`:

| | file | what it missed |
|---|---|---|
| 1 | `SeasonBudgetService.ts` `snapNpcStaffWages` | the bootstrap pass never saw `club.scouts` |
| 2 | `SeasonBudgetService.ts` `anchorNpcStaffWages` | the transition pass never saw `club.scouts` |
| 3 | `ClubWageScaleService.ts` `npcStaffWagePence` / `ampStaffWagePence` | **the ability shape the reservation is divided across never counted scouts either** |

Site 3 was not in the brief and is the half that actually bounds the bill. Fixing only 1 and 2
would have re-anchored the scout while leaving every coach priced against a denominator missing
it, so the club's bill would still have overshot its own reservation. Detail in §4.

---

## 2. Before / after, measured

Resolved through `resolveEconomy` over the **live EN payload**
(`evidence/scotland-gate-remeasure-2026-11-20/game-config-EN.LIVE.json`, captured 2026-11-20),
never off a repo default. Economy resolved at tier 8: `model turnover · incomeAnchoredWages true ·
weeksPerSeason 46 · wageCurveExponentBp 25000 · wageScaleUnit 1000000 · reputationSpreadBp 0 ·
fallbackReason none`, band table `15/25/40/60 → staffMultiplier 2/4/8/12`.

**The shape is the owner's own club**, reconstructed from their reading and confirmed against it:
12 coaches at ability 3, one scout at ability 21, tier 8, staff reservation **£195,464.00/season =
£4,249.22/wk**.

### The premise, confirmed before changing anything

| | computed here | owner's device reading |
|---|---|---|
| 12 coaches, band | **£868.44/wk** | "~£866/wk" |
| scout, band | **£12,509.76/wk** | "£12,510/wk" |
| scout ÷ same-star coach (ability 4, £148.56) | **84.2×** | "84×" |

Both figures are the **band** — the tier market rate written at ingest. That is what makes them
reproducible from config alone, and it confirms the premise rather than assuming it.

### The change

```
STAFF RESERVATION £195,464.00/season = £4,249.22/wk

BAND (ingest):  coach £72.37 x12 = £868.44 · scout £12,509.76

BEFORE  coach £326.86 x12 = £3,922.32 · scout £12,509.76 (band, untouched)
BEFORE  bill £16,432.08/wk = 3.87x reservation · scout share 76.1% · scout/coach 38.3x

AFTER   coach £29.79 x12 = £357.48 · scout £2,030.63
AFTER   bill £2,388.11/wk = 0.56x reservation · scout share 85.0% · scout/coach 68.2x

SCOUT moved £12,509.76 -> £2,030.63  (-83.8%)
BILL  moved 3.87x -> 0.56x reservation
```

**The bill is now strictly bounded by the reservation and was not before.** The bound is
structural, not calibration: each member is priced `share × a_j^k / (Σa^k + a_j^k)`, and that sums
to strictly less than the share for any roster.

⚠️ **The scout's SHARE goes UP, from 76.1% to 85.0%, and that is expected.** It is the
ability-proportional split, explicitly out of scope — `ClubWageScaleService` divides in proportion
to `ability^2.5`, so a scout at 21 among coaches at 3 takes most of whatever the total is. The
change bounds the bill; it does not and must not make scouts cheap. This is the owner's
calibration question.

---

## 3. 🔴 The brief's AMP premise is wrong, and the code is right

The brief says `club.staff[]` is *"band-priced at ingest and then overwritten by
`npcStaffWagePence`"*, and asks me to cover the AMP club the same way. **That is true of NPC clubs
and false of the AMP club, and the measurement above proves it:** the owner's 12 coaches read
£868.44/wk, which is the **band** figure to the penny, not an anchored one. If an AMP re-anchor
pass were running, they would not read the band.

**There is no AMP bootstrap or transition re-anchor pass, and its absence is deliberate.**
`anchorAmpStaffWages` existed and was **retired earlier today** under the owner's own B1 ruling
(`part-b-resolved-budget-model.md`), whose retirement docblock is still in
`SeasonBudgetService.ts`:

> *"A staff salary is a CONTRACT, agreed at signing, with exactly the status a player's wage has.
> A committed cost may not be re-derived from the budget that is computed FROM it — the snap was
> that circularity, and it was load-bearing: `deriveClubBudget` floors the wage reservation at
> `projectedWagePence`, so a solver that spent the staff share in full raised the very floor it
> had just read."*

So **adding an AMP re-anchor pass for scouts would reinstate, today, the exact function the owner
ruled out today.** I have not done it. Per the standing notes I am saying so rather than silently
complying.

**What the AMP path does have**, verified by grepping every salary write site: exactly one — the
DOF auto-renew in `GameLoop.ts:5906-5907`, mean-reverting, gated on `dofAutoRenewContracts` and a
contract inside 12 weeks. **Scouts are already covered there** (`ac71159b`, this morning, reading
`ability` not `experience`). So every AMP path that re-prices a staff wage already handles scouts.

**What I did do on the AMP side** is the half that is compatible with the ruling and was still
broken: `ampStaffWagePence`'s **shape**. It read `coachStore` alone, so a *new hire* was quoted a
price derived from a roster missing every scout the club already pays. Fixing a shape re-prices no
existing contract — it only corrects what the next hire costs — so it sits inside the ruling
rather than against it.

### ⚠️ Consequence the owner needs to know

**My change does NOT fix the £12,510 scout on the owner's own club.** Under the B1 ruling that
figure is a contract, and it moves only at renewal, where mean reversion halves the gap each
cycle. The owner has three options and only they can pick:

1. Leave it — it converges over ~3 contract cycles, which is the ruling's own stated answer to a
   club starting over-committed.
2. Extend the ruling to say an **ingested season-1 staff wage is template, not contract** — which
   is the argument the retired function made, quoted at length in that same docblock.
3. Start a new save, where the NPC half of this fix applies from bootstrap.

---

## 4. The second defect, fixed for free — partly

The brief asked me to verify that a re-anchored scout wage cannot go stale. **Confirmed for NPC
clubs, not for the AMP club.**

- **NPC clubs: yes.** A pass that runs at bootstrap and at every transition re-reads config each
  time, so a scout salary cannot carry a dead config scale. This is why Scotland read 10.00× on
  every sampled scout where England read 1.00× — one figure written at world build under whatever
  scale was live then. Pinned by a test that scales the country's money between two transitions
  and requires the salary to move.
- **AMP club: no.** Its scouts are not re-anchored at all (§3), so an AMP scout's wage can still
  be a stale write until its first DOF renewal.

### 🔴 This breaks the CHECKS panel's scout row, and it is not mine to fix

`economyDiagnostics.pickStaffValuationSample` samples **NPC** clubs' `club.scouts` and
`judgeStaffValuation` ratios each scout against the **band**. After this change an NPC scout is on
the club's income-anchored rate, so the band is no longer the governing rate for it — and the panel
will report correct wages as off-band / STALE WRITE.

**This is precisely the OTA 491 defect, for scouts.** `staffValuationChecks.test.ts` already
records the staff version: comparing an `npcStaffWagePence`-written salary to the band *"reported
0.42–0.67 for correct wages on England and 3.65–4.75 on Scotland"*. The fix is the same one —
route the scout row through the injected `NpcStaffRateResolver` the staff row already uses, and
fall back to the band only when no budget is resolvable.

I have **not** touched `economyDiagnostics.ts` or `ChecksTab.tsx`: they belong to the A29 session
and the one-writer-per-file rule applies. Flagged here for the PM to route. It is a small, well-
specified change with an existing pattern to copy.

---

## 5. What changed

| file | change |
|---|---|
| `src/engine/ClubWageScaleService.ts` | `npcStaffWagePence` takes `scouts` in its `Pick` and counts `club.scouts` in the ability shape; `ampStaffWagePence` counts `scoutStore`'s scouts. Abilities resolved through `resolveScoutAbility`, never `?? 0`. |
| `src/engine/SeasonBudgetService.ts` | new `anchorScouts()` shared by both passes, parameterised by the pricing rule (snap at bootstrap, mean-revert at transition); both passes now return `AnchoredRosters` (`Partial<Pick<WorldClub,'staff'\|'scouts'>>`) and both call sites spread it whole. Dead `useScoutStore` import removed (flagged by A30). `resolveEconomy` hoisted out of the per-member map in `anchorNpcStaffWages`. |
| `src/__tests__/engine/scoutReanchor.test.ts` | **new**, 13 tests. |

Two deliberate non-changes:

- **The `incomeAnchoredWages` gate was NOT added to `anchorNpcStaffWages`** when I hoisted the
  economy out of its map. `snapNpcStaffWages` has it and the transition pass does not; adding it
  would have changed that pass's behaviour rather than just its shape. `npcStaffWagePence` already
  returns `undefined` with the flag off, so the gate is redundant either way.
- **The self-append in the shape was left alone.** Each member is priced with its own `a^k` added
  to the denominator a second time — correct for a hire (not yet on the roster), a double-count for
  an incumbent being re-anchored. It is why the bill lands at 0.56× rather than 1.00× (an
  exact-roster denominator gives exactly £4,249.22 = 1.00×). **This is pre-existing behaviour for
  coaches**, it moves every staff wage in the game, and it is a calibration decision. Flagged, not
  taken.

### The test, and why it is shaped this way

13 tests, every one naming `scouts` explicitly, because this defect exists precisely because a
roster was spelled `club.staff` and nobody noticed the other array.

**Mutation-tested both halves** rather than trusting that they would fail:

| mutation | result |
|---|---|
| shape drops scouts (both functions) | **3 failed** / 10 passed |
| both passes drop scouts | **6 failed** / 7 passed |
| restored | 13 passed |

⚠️ **Three cases passed vacuously on the first run and I caught it only by mutating.** The
bootstrap club had no sponsors, so its derived reservation was zero, every anchored rate came back
`undefined`, and `expect(salary).toBe(expected)` passed as `undefined === undefined`. Fixed by
giving the fixture real sponsor income and asserting `expect(expected).toBeGreaterThan(0)` before
every cross-source comparison. **The general lesson: a cross-source assertion against a function
that returns `undefined` on a bad fixture is a test that cannot fail.** Noted in the test file.

The fixture carries the **live EN tier-8 row verbatim** (`turnoverPence 21_500_000`,
`wageScaleMicroPence 928_521_647`), so the test itself reproduces the owner's device figures —
£72.37, £12,509.76 and the 84×. A fixture invented for the test could not have.

---

## 6. Verification

- `npx tsc --noEmit` — **clean**.
- Full `npm test`, run **alone** in a detached worktree. Counts and reconciliation below.
- `uptime` checked before measuring; no orphaned busy-loops (`ps` for >50% CPU returned nothing).

### Counts — measured myself, both in detached worktrees, serialised

| tree | `--listTests` | suites | tests | time | failures |
|---|---|---|---|---|---|
| **baseline** `9bac0b18`, pristine | 659 | 659 passed | **11,057 passed** / 11,060, 3 skipped | 533.6 s | **0** |
| **`9bac0b18` + this change** | 660 | 660 passed | **11,070 passed** / 11,073, 3 skipped | 239.5 s | **0** |

✅ **Reconciles exactly: +1 suite / +13 tests** — `scoutReanchor.test.ts` (13) and nothing else.
11,057 + 13 = 11,070.

My baseline figure matches `environment.md`'s green-master row for `9bac0b18` (659 / 11,057)
independently, so there is no stale-baseline risk here. I measured it rather than quoting it,
per the standing note.

⚠️ **HEAD moved to `22443e24` while the run was in flight** ("The docs stop saying the owner has
not been asked about the refund"). That commit is **`.context/` markdown only — zero `.ts`/`.tsx`
files**: `git show --name-only --format='' 22443e24 | grep -cE '\.tsx?$'` returns **0**. The
`seasonBudget` reader registry walks `src` only, so nothing in the suite can see it. The
measurement above therefore holds at the commit being committed onto, and `npx tsc --noEmit` was
re-run clean on `22443e24` + this change.

### 🔴 The first changed-tree run failed, and the failure was real

`seasonBudgetService.test.ts` → *"nothing outside the known set reads `seasonBudget` in CODE"*.
**Not load flake — the reader-registry guard, exactly as the standing notes warn:** it strips
comments and nothing else, so a `ClubBudget` fixture in a test registers as a code reference.
`scoutReanchor.test.ts` is now on that list with its reason, and it belongs there on the merits —
it asserts what the budget *decides*, which wage a scout is paid. One run cost, and the note is
the reason it took minutes rather than an hour.

### On the machine

`uptime` and a `ps` sweep for >50% CPU processes were taken before each run; no orphaned
busy-loops. Load averages are recorded beside every run. The first changed run was contended
(load 10.6 → 12.0, another session at ~120% CPU) and the clean re-run above was taken at 6.3 →
8.5 on 8 cores. ⚠️ **Neither figure is quoted as a timing result** — the 533.6 s baseline and the
239.5 s changed run are not comparable and the difference is load, not this change. **The COUNT is
what is being reconciled**, and the standing notes' measured position is that contention moves
timing, never a count.

---

## 7. What this does NOT fix

Stated explicitly, as the brief asked.

1. **The scout on the owner's own club still costs £12,510/wk.** §3. It is a contract under the B1
   ruling and only moves at renewal. This fix reaches NPC clubs and new saves.
2. **A scout still takes most of a poor club's staff share** — 85.0% after, up from 76.1%. That is
   the ability-proportional split and it is the owner's calibration question, not this change's.
3. **The AMP club's coaches are not income-anchored either.** They read the band (£868.44/wk
   against a £4,249.22/wk reservation — 20% of it). Nothing here changes that; it is the same
   retired-pass consequence, and it means the AMP club's staff bill is not bounded by its
   reservation in either direction.
4. **The CHECKS panel's scout row will now misreport.** §4. Needs a one-line routing change in
   another session's file.
5. **`computeNpcWageBill` still omits scouts** (`npcFinances.ts:64` — `club.staff` only). A fourth
   site with the same spelling, found while tracing this one. So an NPC club's **projected wage
   bill, its budget floor and its solvency verdict all exclude its scouts' wages**, which are now a
   re-anchored, nonzero cost. Out of scope here — it changes every NPC budget in the pyramid and
   deserves its own measurement — but it is the next thing in this family and it is unowned.
6. **The band ceiling, `wageMultiplierTiers`, the 70/30 ability formula and the backend** —
   untouched, as instructed.
7. 🔴 **A re-anchored NPC salary does not survive a reload — and this is PRE-EXISTING, affecting
   coaches identically.** Traced in code while checking that my write persists; **not reproduced on
   a device**, so treat the mechanism as verified and the on-device consequence as inferred. The
   chain: both passes write through `worldStore.updateClub`, whose only flush is `upsertClubs`, and
   `worldClubRepository.stripClubDataForBlob` deletes `players`, `staff` **and** `scouts` before
   writing the blob — they are canonical in the `staff` + `staff_club` tables. Those tables are
   written by `batchAssignStaffToClub` / `batchUpsertStaffEntities` at **ingest only**
   (`worldStore.ts:726`, `useInitFlow.ts:1132`); nothing in the flush path touches them. Meanwhile
   `seasonBudget` *is* in the blob and therefore does persist, so on reload
   `bootstrapSeasonBudgets` skips the club as already-budgeted and never re-snaps.
   **Net: an NPC club's staff and scout wages are income-anchored in-session and back on the band
   after every reload**, partially re-converging at each season transition and losing that too.
   This bounds the real-world value of both passes — mine and the coaches' — and it is unowned.
   Fixing it is a persistence change (write the roster rows back, or stop persisting
   `seasonBudget` without them), needs its own measurement, and is the single highest-value item
   this task turned up.
