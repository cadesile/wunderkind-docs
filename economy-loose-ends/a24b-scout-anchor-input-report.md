<!-- STATUS: ✅ BUILT, COMMITTED AND VERIFIED — app `new-game-save` @ `ac71159b`.
NOT PUSHED, NOT DEPLOYED. ⚠️ This fixes a DEFECT IN DEPLOYED CODE: `9f46bf66` is live on
the dev channel (OTA 491) with both anchor sites still on `experience`. tsc clean;
657 suites / 10,992 passed, +1 suite / +9 against `4113d326`. 2026-11-20 -->

# The income-anchored scout wage was still priced off `experience`

**App `new-game-save` @ `ac71159b`, a separate commit.** Raised by the PM against deployed code, after
`9f46bf66` went out on OTA 491. **Both sites were live. Both are defects. The PM was right and
A24's own report undercounted the pricing sites.**

---

## 1. What A24 missed, and why the miss has a shape worth remembering

A24 traced every path that **computes** a scout's wage and moved them all onto the `ability`
column A26 built: the band (`tierStaffWeeklyWagePence`), the backend `ScoutWageCalculator`, and
the global fallback. It did not ask which rung of `resolveWorldStaffWagePence`'s chain
**outranks** the ones it was changing.

```
salary ?? anchoredPence ?? weeklySalary ?? tierStaffWeeklyWagePence(...) ?? legacy
          ^^^^^^^^^^^^^^
          A24 never looked here
```

`anchoredPence` is the income-anchored figure, and it sits **above** everything A24 touched. Its
two producers were still being handed `experience`:

| site | argument | effect |
|---|---|---|
| `marketStore.setMarketData` → `anchorStaffWages(freshScouts, (s) => s.experience)` | `experience` | **OVERWRITES** the `salary` just resolved at the `market.ts` ingest boundary |
| `GameLoop` §14c staff renewal | `(staff as unknown as { experience?: number }).experience ?? 0` | the renewal **mean-reverts toward** it |

**🔴 Tracing the sites that COMPUTE a quantity is not the same as tracing the sites that DECIDE
it.** That is this workstream's governing defect — two routes to one quantity with nothing saying
which wins — in a new costume, and A24 shipped it.

Neither file appears in `9f46bf66`'s `git show --stat`. The PM confirmed that before asking.

---

## 2. Both were live — the preconditions, checked rather than assumed

`anchorStaffWages` returns the array untouched only when `incomeAnchoredWages` is off or the club
has no `seasonBudget`.

- **`incomeAnchoredWages` resolves TRUE at every tier on live config** — established in
  `scout-wage-impact-report.md` §1 through `resolveEconomy()` over the live payload, and
  re-confirmed by this change's own test (`expect(economy.incomeAnchoredWages).toBe(true)`).
- **A `seasonBudget` exists from the first season transition onward**, which is every market
  refresh and every renewal after the opening season.

So both fire in any save past its first season boundary.

---

## 3. 🔴 Measured, not inferred — and it is a 15.6× error

The curve does not treat these as interchangeable numbers: `staffWagePence` raises its input to
`wageCurveExponentBp / 10_000` = **2.5**. `experience` spans 4–34 on live config; `ability` spans
roughly 7–51.

Measured on a five-coach backroom (abilities 12/18/25/33/41) at tier 4, `wageReservationPence`
£400,000, through the real `ampStaffWagePence`:

```
incomeAnchoredWages: true   model: turnover

ampStaffWagePence(experience 9)  =   2373      (£23.73/wk)
ampStaffWagePence(ability 29)    =  37087     (£370.87/wk)
ampStaffWagePence(experience 34) =  50953     (£509.53/wk)
ampStaffWagePence(ability 47)    =  88590     (£885.90/wk)

MARKET scout salary after setMarketData = 2373   | ingested was 123456
   | anchored(experience 9) = 2373   | anchored(ability 29) = 37087

renewal from 300000 | via experience 9 = 151187 | via ability 29 = 168544
```

| | |
|---|---|
| **Market ingest** | the ingested £1,234.56 was overwritten with **£23.73**, on experience. The ability-correct figure is **£370.87** — **15.6× low** |
| **Renewal** | from £3,000/wk: **£1,511.87** via experience against **£1,685.44** via ability. Mean reversion damps it |

**That 15.6× is the gap `band-ceiling-finding.md` §4 measured — the entire scout wage range
sitting below the entire coach range — reappearing through a path A24 never looked at.** The
renewal's damping is why it would never have been spotted on screen: the market is where it bites,
and the market is the screen the owner reads scout prices off.

### ⚠️ It reads as a NON-EVENT on a club with no backroom, and that nearly buried it

The first probe of this reported **the same wage for every input** and looked harmless.
`staffWagePence` normalises the scale so the shape's wages sum to the staff budget, so with
`abilities = [ability]` the scale is `budget / ability^k` and the ability **cancels exactly**.

```
# single-member shape — the degenerate case
ampStaffWagePence(experience 9)  = 217391
ampStaffWagePence(ability 29)    = 217391
ampStaffWagePence(experience 34) = 217391
ampStaffWagePence(ability 47)    = 217391
```

Every test in the new suite therefore seeds a real backroom, and **the degenerate case is pinned
as its own test** so the next reader cannot repeat the mistake:
`the backroom is what makes them differ at all — the degenerate case, pinned`.

---

## 4. The fix — the smallest honest one

| file | change |
|---|---|
| `src/stores/marketStore.ts` | `(s) => s.experience` → `(s) => s.ability`. Plus a note on `anchorStaffWages` that `abilityOf` **means ability**, and that it overwrites an ingest-resolved `salary` — so a pricing change at the boundary does not reach the market unless this passes the same quantity |
| `src/engine/GameLoop.ts` §14c | the scout branch reads `staff.ability ?? 0`. `RenewEntry` now **declares** `coachingAbility?` and `ability?`, and both branches read the declared field — **the `as unknown as {...}` casts are gone**, because the cast is what let the wrong field type-check |

**Nothing else changed.** No wage redesign, no change to what a renewal offers, no change to the
chain's rung order, no backend file (a backend session owns `development`).

⚠️ **The coach argument was already correct** — `coachingAbility` *is* a coach's ability. There is
no third quantity here: both roles now pass the same ability the band and the backend price from.

---

## 5. Proven by mutation, not asserted

`src/__tests__/economy/scoutWageAnchorInput.test.ts` — **9 tests**. Reverting both fixes to
`experience` fails exactly the four that should fail:

```
    ✓ differ by more than 15x on the same scout, because the curve exponent is 2.5
    ✓ the backroom is what makes them differ at all — the degenerate case, pinned
    ✕ anchors on ABILITY, not experience
    ✓ still overwrites the ingested figure — the anchor outranks it, by design
    ✓ leaves the ingested figure alone when nothing is anchorable
    ✓ anchors a COACH on coachingAbility, unchanged
    ✕ passes a scout's `ability` into the anchor
    ✕ no longer reads `experience` there at all
    ✕ drops the `as unknown` casts that let the wrong field type-check
Tests:       4 failed, 5 passed, 9 total
```

Both fixes restored and verified by `grep` afterwards.

The §14c source guard **strips comments**, for the reason
`a24b-dof-player-renewal-report.md` §4b records: the new `RenewEntry` docblock *quotes* the old
cast, so a guard reading prose would assert against the documentation. `not.toMatch(/experience/)`
passes only because the stripper is there.

---

## 6. Corrections to A24's report

1. **The pricing-site count was SIX and is EIGHT** — corrected in
   `a24-wage-bands-report.md` §8 with both new rows marked 🔴 and the lesson in §1.
2. **`4113d326`'s commit message mixes `passed` and `collected`** — it labels the baseline
   `655 / 10,965`, the *collected* figure, while its `+21` arithmetic is on *passed*
   (10,962 + 21 = 10,983). The arithmetic is right, the label is wrong, and `CLAUDE.md` warns
   that exactly this invents a 3-test ghost. Corrected in `a24b-dof-player-renewal-report.md`
   §7 with both columns labelled; **the commit was not amended**, since it is already verified.

---

## 7. What I did NOT do

1. **No backend file touched** — a backend session owns `development`.
2. **No change to the chain's rung order.** `anchoredPence` still outranks the band; that is the
   2026-11-15 ruling and not this fix's to revisit.
3. **`ampStaffWagePence`'s `shape` still counts only COACHES** (`useCoachStore` abilities) —
   scouts are priced out of the staff budget but are absent from the shape it is divided across,
   so a club's scouts are funded from a share computed as though they did not exist. **Flagged,
   not fixed**: it changes every staff wage in the game and the owner has ruled nothing on it.
4. **NPC club scouts (`club.scouts`) are never re-anchored at a season transition.**
   `anchorNpcStaffWages` and `snapNpcStaffWages` iterate `club.staff` only. A `role='scout'`
   `WorldStaff` entry carries a real `coachingAbility` and is fine; the dedicated `WorldScout`
   roster keeps its init-time band price for the life of the save. **Flagged, not fixed** —
   pre-existing, and giving NPC scouts a re-anchor is a behaviour change, not a symmetry fix.

---

## 8. Verification

⚠️ **Verified in an ISOLATED `git worktree` at `4113d326` plus only this change's four files, not
in the shared checkout.** A third session (the DOF-pot-refund task) began editing
`src/economy/dofHireCharge.ts` and `src/stores/clubStore.ts` part-way through the first full run —
both of which this change's tests import (`dofContractCharge`) or drive
(`drawDofContractCharge`). That run was measuring their half-finished work alongside this change
and no failure in it would have been attributable either way, so it was killed. In the worktree
those two files sit at **this session's own committed versions**, which is what makes the counts
below mean something.

```bash
git worktree add --detach "$WT" 4113d326
# node_modules symlinked; marketStore.ts, GameLoop.ts and the two test files copied in
npx tsc --noEmit; echo "tsc exit=$?"
npx jest --listTests | wc -l
npx jest
```
```
tsc exit=0
listTests:      657
Test Suites: 657 passed, 657 total
Tests:       3 skipped, 10992 passed, 10995 total
Time:        370.906 s
```

✅ **Green, and the counts reconcile exactly** against `4113d326`'s measured
**656 suites / 10,983 passed, 10,986 collected**:

| | suites | **passed** | collected | delta (passed) |
|---|---|---|---|---|
| `4113d326` | 656 | 10,983 | 10,986 | — |
| **this change** | **657** | **10,992** | **10,995** | **+1 suite / +9 tests** |

**+9, itemised:** `scoutWageAnchorInput.test.ts` is new with **9**. The
`seasonBudgetService.test.ts` edit adds **no test** — it registers one new path in an existing
exhaustive list (see below). Both columns are labelled, per `CLAUDE.md`'s warning about mixing
`passed` and `collected`.

### ⚠️ The first isolated run failed one test and I could not name it — recorded rather than smoothed

```
Test Suites: 1 failed, 656 passed, 657 total
Tests:       1 failed, 3 skipped, 10991 passed, 10995 total
Time:        715.625 s
FAIL src/__tests__/db/youthRepository.test.ts
```

**I never learned which test it was.** The run's `grep` filter captured `FAIL` and the summary
lines and dropped the `●` detail, so the name did not reach the file — the same position the
aborted backend run left me in, and the honest answer is that I do not know rather than an
inference from the suite's name. The filter was fixed for the re-run.

What is known: the suite passes **53/53 alone**; **715 s against 151 s idle**, so the machine was
loaded (the refund session was working); nothing in this change reaches youth persistence; and
**it did not reproduce on the clean re-run above.**

🟢 **So `youthRepository.test.ts` is a FIFTH load-sensitive suite on this box**, joining
`db/clientRecovery.test.ts`, `screens/tournamentHubRender.test.tsx` and `db/health/runner.test.ts`
(see `a24-wage-bands-report.md` §9). Five suites, four runs, no two agreeing on which — and every
clean-machine run green. ⚠️ Stated as a pattern, **not** as an attribution of that specific
failing test, which remains unnamed.

### `seasonBudgetService.test.ts` — a registry caught the new suite, correctly

The first run in the shared checkout failed `every reader of 'seasonBudget' is accounted for ›
nothing outside the known set reads 'seasonBudget' in CODE`. That test walks `src/**`, strips
comments, and asserts the exact set of files mentioning `seasonBudget` — **including test
files**. `scoutWageAnchorInput.test.ts` seeds a `seasonBudget` fixture, so it belongs in the list.

Registered with its reason, in the file's own per-entry convention: why it seeds a budget (it is
the only other precondition for `anchorStaffWages` firing), and **why it seeds a five-coach
backroom** (§3's degenerate case — a single-member shape makes the ability cancel exactly, which
is what made the first probe of this defect read flat). **Not a test added; a path registered.**

---

## 9. Process

- **Nothing pushed, nothing deployed, nothing merged, no branch switched.**
- **App repo only.** No backend file touched — a backend session owns `development`.
- Staged by **explicit path**. The shared checkout held another session's uncommitted edits to
  `dofHireCharge.ts` and `clubStore.ts` throughout; **neither is in this commit.**
- `9f46bf66` and `4113d326` were **not amended**.
