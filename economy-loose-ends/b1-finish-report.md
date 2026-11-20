<!-- STATUS: 🟢 DONE — both defects fixed, committed to `new-game-save`, NOT pushed, NOT deployed. Read §2 (what remains untrue) and §8 (a FIFTH ungated path the review did not name) before signing this off. -->

# B1 finish — the DOF's pot becomes a carried ledger, and the player paths get gated

**Task:** finish B1 against `b1-pm-review.md` §2, §3, §5 and §10.
**Branch:** `new-game-save`. **Not pushed, not deployed.**
**Base:** app `930fcde7` ("A29's pass entry, and the pounds column the brief had backwards").

Both defects are fixed. The review's central claims held against the code in every case I
checked, and I say where below. I found **one thing the review missed and one thing it did not
look for**, both in §8.

---

## 1. What was built — the pot is opened, drawn down and carried

### The shape

Two new persisted fields on `clubStore`, and one derivation every path now goes through:

| field | what it holds |
|---|---|
| `dofWageCommitmentPence` | pence. Wage commitments charged to the DOF's pot in the CURRENT budget period **that no transaction records anywhere else** |
| `dofWageCommitmentPeriodWeek` | the `club.seasonBudget.createdWeek` that total belongs to; 0 for a club with no budget yet |

```ts
carriedTransferBudgetPence(state) =
  max(0, floor(allocatableBalancePence(club) × pct/100) − carriedDofWageCommitmentPence(state))
```

`recalculateTransferBudget` and `setBudgetAllocation` are the only two places in the app that
derive `transferBudget` (verified by grep, §9), and **both now call this**. Those two functions
are all five of the review's paths:

| review's path | reaches |
|---|---|
| `SeasonTransitionService:5473` season boundary | `recalculateTransferBudget` |
| `GameLoop:4587` per-tick auto-adjust | `setBudgetAllocation` |
| `GameLoop:5850` Chairman four-weekly rebalance | `setBudgetAllocation` |
| `inbox.tsx:1442` budget-review accept | `setBudgetAllocation` |
| `useAutoProgress.ts:58` auto-accepted review | `setBudgetAllocation` |

So the fix is in two functions rather than five call sites, which is also why a sixth path added
later cannot miss it.

### 🔴 Only the WAGE half is carried, and that is a deliberate limit — read this

The review's own diagnosis says why. A **fee** survived the re-derivation even before this
change, because a fee is *also* booked to the ledger and the balance the percentage is taken of
records it. A **wage commitment** did not, because the ruling deliberately books it nowhere.
So the carried ledger holds exactly the unbooked quantity.

Carrying the fee as well would **over-charge**: spend a fee `F` and the balance already falls by
`F`, so the next re-derivation gives `pct × (B − F)`. Subtracting `F` again on top would charge
the club `F + pct×F` for an `F` fee.

That leaves **the fee's pre-existing partial elasticity exactly as it was before the wage
ruling**: spend `F`, and the next re-derivation hands back `(1 − pct) × F` — about 70% at the
default 30% share. **This is not new, it is not what B1 introduced, and it is not fixed here.**
See §2.

### The new draw action, and why the call sites changed

`spendTransferBudget(charge.totalPence)` was replaced at all five contract-charge sites by:

```ts
drawDofContractCharge({ feePence, wageCommitmentPence }) → { feeDrawnPence, wageCommittedPence, overdrawnPence }
```

It draws both halves off `transferBudget` at once, so the screen is immediately right, and puts
the wage half on the carried ledger so no re-derivation takes it back. `DofContractCharge`
satisfies its input type structurally, so the five sites pass the charge object they already had.

Sites changed: `TransferService.makeAmpBuyerFinanceCallbacks`, `DofStaffHiringService`,
`GameLoop` §14c staff renewal, and `app/staff/[id].tsx`'s three branches (renew / hire / poach).

**Three sites deliberately stay on `spendTransferBudget`**, because each draws pure cash that is
also booked to the ledger: `AgentAccessService:86` (agent access fee),
`TransferService.settleAmpAgentCommission:459` (commission), `GameLoop:5641` (a player renewal's
sign-on fee). I read each one to confirm it books a transaction. All three do.

### Where it persists, and why that is safe

`club_state` — the save's own single-row JSON blob, through the one `pickClubState` whitelist,
read back by `bootstrap`'s `club_state` step.

**This is NOT the `world_clubs.data` hazard `CLAUDE.md` warns about.** That rule is about a value
written into the *world pack's* TEXT blob, where a world re-sync would silently wipe it and no
column makes the ownership visible. `club_state` is the opposite case:

- it is the save's own row, not the world's, and no world sync touches it;
- it has one writer (`flushClubStateToDB`) and one whitelist, which is the thing to pin — and I
  pinned it, in `pickClubState.test.ts`, which already asserts the *exact* field list and
  therefore failed on my change until I updated it deliberately (good design by whoever wrote it);
- no migration is needed because the blob is whatever that whitelist returns.

A save written before this change has neither key. `setState` is a partial merge, so both default
to 0 and the pot reads as its full opening allocation — **the truthful reading**: whatever that
save committed was already refunded by the defect being fixed, so there is nothing to carry.
Pinned, including explicitly against `NaN`, which would pass every `>` comparison as false and
un-gate the whole economy.

### Graduation: a STALE PERIOD, not a `clear()` call

The brief asked for the carried figure to clear *at exactly* the point Step 1 picks the cost up.
Rather than calling a clear on the transition path, the carried total **only counts while its
stored period matches the club's current `seasonBudget.createdWeek`**.

`createdWeek` is written by the same call that derives the new budget (`deriveClubBudget` via
`setAmpSeasonBudget`), which *is* the moment the hire stops being "new". So:

- it cannot clear **early** (free money) — a balance change, a rebalance, a share move and a new
  budget for the same period week all leave it counting; pinned;
- it cannot clear **late** (double-counted) — the period identity changes in the same call that
  Step 1 reads;
- **no future transition path can forget to clear it**, which a `clear()` would require.

Pinned through the real `setAmpSeasonBudget` in the real transition order
(`setAmpSeasonBudget` at `:5061` before `recalculateTransferBudget` at `:5473`), rather than
against a hand-set budget that would not notice if `createdWeek` stopped being written.

### The Chairman's self-refunding loop is broken

The review's sharpest finding: the rebalance computes `1 − transferBudget / nominalTransfer`, so
charging the pot *raised* utilization, which widened the gap, which triggered the rebalance that
*restored* the pot. **The draw-down caused its own refund.**

It can still read a drawn-down pot as "the transfer side needs more room" and nudge the share up
5 points — which is a legitimate answer, not a refund. What is now guaranteed, and pinned: the
pot at the new share is `new opening − the whole commitment`. The club gains the extra share and
nothing else.

### An over-draw is visible

`reportDofOverdraw` fires `captureWarning('DOF pot over-drawn', { action, requestedPence, potPence, overdrawnPence })`
from **both** `spendTransferBudget` and `drawDofContractCharge`, and `drawDofContractCharge`
returns the figure so a caller or a test can assert on it.

A warning rather than a throw or a refusal, because every caller is *past* its gate when it
draws — the database write has committed — and the gate and the draw are priced by the same
`dofContractCharge`, so **a non-zero over-draw means a gate is wrong, not that a club
overspent.** ⚠️ `captureWarning` is dev-builds-only (`warningsAreCaptured()`), which is where it
is read (the owner tests the `dev` channel); a production over-draw is still silent. Say the word
and it becomes `captureHandledFault`, which reaches production.

The floor at zero stays, so the pot never reads as a negative figure — but the over-draw is **no
longer forgiven**, because the commitment stays on the ledger at full size and holds the pot at
zero for the rest of the period. Pinned.

---

## 2. ⚠️ What remains untrue — read this before believing the mechanism is complete

**1. A FEE is still partially refunded by a re-derivation.** `(1 − pct) × F`, about 70% at the
default share. Pre-existing, not introduced by B1, and unchanged here. Making it durable means
**freezing the opening allocation per budget period** instead of deriving it live. That is a
bigger change with two consequences the owner has not been asked to rule on: mid-season income
would stop raising the pot, and moving the transfer share would stop working until the next
period. I did not make that call. **If the owner wants it, it is a small change to
`carriedTransferBudgetPence` plus one snapshot field** — the carried-ledger scaffolding is what
makes it small.

**2. §3's graduation property is still false, and the carried ledger cannot fix it.** I measured
it rather than restating it, and **the review is right**:

```
Step 1 commits  = SALARY × (WEEKS − elapsed)     ← what the club actually paid
The pot charged = SALARY × (WEEKS − elapsed)     ← identical
A full season   = SALARY × WEEKS                 ← what they will actually cost
Shortfall       = SALARY × elapsed, exactly
```

Driven through the real `setAmpSeasonBudget` over a real ledger, in
`dofPotLedger.test.ts`'s "Step 1 is backward-looking" block. A hire in the last week of a period
graduates **one week** of their cost; that is now a passing, measuring test rather than prose.

The under-commitment is a property of Step 1's own derivation — `projectedWagePence` is a ledger
sum of what the club paid — which the owner ruled correct and which B1 was right to leave alone.
Making it forward-looking would change the committed bill of **every club in the game**, which is
a re-ruling, not a fix. **The direction is the permissive one and it closes a season later.**

**3. The test that "pinned" the property is replaced.** It asserted
`expect(salary * WEEKS).toBe(salary * WEEKS)` — a hand-written constant against itself. It is gone,
replaced by a comment saying what is actually true and a pointer to the measurement.
`.context`'s two now-wrong claims are flagged for the PM in §10.

---

## 3. ⚠️ THE OPEN QUESTION — which way my implementation behaves

> *does unspent remainder return to the pot when a contract ends or a player is sold mid-season?*

**My implementation does NOT refund. Nothing credits the carried ledger back.** Sell a player,
sack a coach, let a contract expire: the commitment stays on the ledger at full size until the
budget period rolls, at which point it graduates and the pot opens fresh. I implemented no refund
rule, on purpose — that is the owner's call, not mine.

**Both answers are now a small change, which is what the brief asked for:**

| if the owner rules | the change |
|---|---|
| **no refund** (what it does today) | nothing |
| **refund the unspent remainder** | one new action beside `drawDofContractCharge` — `releaseDofWageCommitment(weeklySalaryPence × weeksStillRemaining)` — subtracting from `dofWageCommitmentPence` with the same stale-period guard, called from the sale / sacking / expiry paths |

The ledger is a single signed total against a period, so a release is a subtraction from it. ⚠️
The release must be floored at zero *and* must re-read the period, or a sale after the period
rolled would credit a commitment that has already graduated — free money. That is the one trap in
the easy version.

**Before the carried ledger neither answer had meaning**, exactly as the review says: the
remainder evaporated at the next reset, usually sooner than the season boundary. It now persists,
so the question is answerable.

---

## 4. Part 2 — the four player paths, gated

One new pricing function, `dofSigningDraw`, in `economy/dofHireCharge.ts` beside the charge it
reuses:

```ts
dofSigningDraw({ upfrontPence, weeklyWagePence, weeksRemaining }) → DofContractCharge
```

It takes `contractCost.upfrontCost` (fee + sign-on + agent commission) because **the pot is drawn
twice for a signing** — `makeAmpBuyerFinanceCallbacks` takes `transferFee + signOnFee` plus the
wage, and `settleAmpAgentCommission` takes the commission separately — so the gate must price the
sum. Pinned by a test that reconstructs both calls and asserts the equality.

| path | was | now |
|---|---|---|
| `SignPlayerPanel.tsx:618` | `cost.upfrontCost > transferBudget` | `signingDraw.totalPence > transferBudget` |
| `DofProposalService.ts:150` | `cost.upfrontCost > transferBudget` | `draw.totalPence > transferBudget`, and the refusal string now names both halves |
| `DofProposalCard.tsx:263` (`isProposalAffordable`) | `cost.upfrontCost > transferBudget` | `draw.totalPence > transferBudget` |
| **`DofProposalCard.tsx:109`** | `cost.upfrontCost > transferBudget` | `signingDraw.totalPence > transferBudget` — **see §8, the review did not name this one** |
| `SignYouthPanel.tsx:148` | `balance >= cost.upfrontCost` — the **balance** | `transferBudget >= signingDraw.totalPence` |

### Display, which was showing a number that was not the number being charged

- `SignPlayerPanel`'s shortfall was `cost.upfrontCost - transferBudget`. Now
  `signingDraw.totalPence - transferBudget`, and the notice names the up-front half, the wage
  half and the excess separately (new key `component.signPlayerPanel.overBudgetBody`).
- The COST summary gains a **WAGES TO SEASON END** row whenever there is one, on both the adult
  and the youth panel — the figure players were never shown.
- `DofProposalCard`'s warning said *"The upfront cost is more than the transfer budget"*, which
  stopped being true. New key `component.dofProposalCard.overBudget` names both halves.
- The youth panel's refusal gains the same breakdown.

⚠️ **`component.dofProposalCard.text.8` and `component.signPlayerPanel.text.43` now have no call
site**, like `screen.budget.spends.transferFull` before them. Left in the catalogue, flagged here.

### The money rule, §4 of the review

`SignPlayerPanel` held its wage in POUNDS and passed `wage * 100` at three sites — correct in
value, open-coded against *"never open-code `* 100`"*, and load-bearing since B1 made that
parameter real money against the pot. **All three are now `poundsToPence(wage)`**; the file
imported it three lines away. `wage * 100` no longer appears in the file, and a test asserts that.

### The two NaN paths, §4 of the review

`DofStaffHiringService:68` and `GameLoop` §14c passed `club.weekNumber` bare while the UI sites
used `?? 1`. An undefined there makes `weeksRemaining` NaN → `totalPence` NaN → `NaN > pot` is
**false** → the gate admits everything and the pot becomes NaN. Both now use `?? 1`, with the
reason at the site. A week number is not money, so this is not a `?? 0`-on-money defect.

---

## 5. Tests

**New suite: `src/__tests__/economy/dofPotLedger.test.ts` — 27 tests.** About PERSISTENCE, not
arithmetic (`dofHireCharge.test.ts` already pins what a contract costs). Every test drives the
**real store actions the five paths call**, not the helper they share:

- the commitment survives `setBudgetAllocation`, `recalculateTransferBudget`, and twelve
  alternating rounds of both;
- it survives the Chairman nudging the share UP, which is the self-refunding loop;
- it accumulates across signings;
- a fee is **not** carried, and is reflected only through the balance;
- graduation: clears on a new period, not on a balance change, not on a re-derived budget for the
  same period week, and clears across a **real** `setAmpSeasonBudget` in the transition's own order;
- a pre-budget commitment (period 0) is carried and graduates at the first real budget;
- over-draw is reported, is not forgiven, and holds the pot at zero;
- it round-trips through a `club_state` blob, is in the whitelist, and an older save reads as
  "nothing committed" rather than NaN;
- **Step 1 is measured** — see §2.2.

**`dofHireCharge.test.ts` 24 → 33.** `dofSigningDraw` arithmetic including the two-call equality;
four source pins that every player path prices its gate through it, no longer compares
`upfrontCost` against the pot, that the youth path tests the pot and not the balance, that the
shortfall is against the whole draw, and that `wage * 100` is gone. The self-restating assertion
is removed.

⚠️ **A source-reading pin that reads its own documentation is worth nothing, and I hit this.**
Each file now quotes the comparison it used to make, verbatim, so the next reader knows what was
wrong — and my first version of these pins **passed on prose**. Worse, the pre-existing
`spendTransferBudget` pin in this suite was *already* passing on a comment rather than on a call.
There is now one `sourceWithoutComments(path)` helper, stripping block and line comments, used by
every pin that asserts an expression is ABSENT. Pins that assert presence match `name(` rather
than `name`.

**`DofStaffHiringService.test.ts` 24 → 25.** One test that the automatic pass puts the wage half
somewhere a rebalance cannot refund — and the one assertion in the change that shows **both**
carriers at once: the fee reaches the next derivation only through the balance (so the opening
allocation falls by 30% of the fee, not by the fee), while the wage is subtracted in full.

⚠️ Its `beforeEach` did not reset the ledger, so the figures drifted upward through the file as
each test inherited the previous one's hires — cumulative is correct behaviour for a commitment,
which is exactly why the reset belongs in the harness. Fixed there.

**`pickClubState.test.ts` 4 → 5.** It asserts the *exact* persisted field list and so **failed on
my change until I updated it deliberately** — which is the guard working. 20 → 22 fields, plus a
test that both halves of the ledger persist and why the period without the total would be worse
than losing both.

---

## 6. 🔴 Verification — and why the test count cannot be attributed today

**`npx tsc --noEmit`: clean.** Verbatim in §9.

### The count

`CLAUDE.md`'s `new-game-save` row reads **651 suites / 10,865 tests** (B1, at `7609125e`). It is
stale: A29 has since taken it to **652 / 10,891**, and `npx jest --listTests | wc -l` at a clean
`930fcde7` before I started gave **652**, which corroborates A29's figure.

⚠️ **For most of this task A24 was writing UNCOMMITTED work in this same checkout**, so a run
would have measured its work alongside mine. **A24 then committed (`9f46bf66`) immediately before
I did, so the tree is clean at my commit and the count IS attributable after all.** The
intermediate, unattributable runs are kept in §9 because one of them is what found my two
registry failures.

**`npm test` at `598ff158`: 655 suites / 10,961 passed**, 10,965 collected, 3 skipped,
`npx jest --listTests | wc -l` = **655**.

✅ **Reconciles exactly:**

| | suites | tests |
|---|---|---|
| clean `930fcde7` before I started | 652 | 10,891 (A29's, which `--listTests` 652 corroborates) |
| A24's `9f46bf66` | +2 | +32 |
| **mine, `598ff158`** | **+1** | **+38** |
| **total** | **655** | **10,961** |

My +1 suite is `dofPotLedger.test.ts`. My +38 tests: `dofPotLedger.test.ts` (27),
`dofHireCharge.test.ts` (+9), `DofStaffHiringService.test.ts` (+1), `pickClubState.test.ts` (+1).
The two architecture registries I updated changed no test counts.

⚠️ **`CLAUDE.md`'s `new-game-save` row (651 / 10,865) is stale by two changes.** It is a one-way
mirror of `01_overview/output/environment.md`, so the `.context/` copy changes first — **left to
the PM**, as A29 also flagged, because that table has gone stale six times from well-meant edits.

### The one failure, and it is not a logic failure

```
FAIL src/__tests__/db/health/runner.test.ts (34.541 s)
  ● §3 the budget, at the ceiling fixture › runs the boot pass inside 150 ms — a TRIPWIRE, not a device figure
    expect(received).toBeLessThan(expected)
    Expected: < 150
    Received:   207
```

A **wall-clock tripwire**, and the machine was running a second full jest suite plus A24's work
when it fired. It passes in isolation on a quiet machine:

```
$ npx jest src/__tests__/db/health/runner.test.ts
    ✓ runs the boot pass inside 150 ms — a TRIPWIRE, not a device figure (203 ms)
Test Suites: 1 passed, 1 total
Tests:       20 passed, 20 total
```

It also **passed** inside the earlier full run on this same code. I touched nothing in the health
pass. ⚠️ The test's own docblock says it *"catches an order-of-magnitude regression between two
harness runs and claims nothing about the device"* — 207 against 150 is not an order of
magnitude, it is machine load, and the honest reading is that **this tripwire is sensitive to a
loaded machine**, which is worth the PM knowing since agents are told to attribute failures.

⚠️ **The documented three-to-five-failure baseline did not appear** — this run had exactly one
failure in 655 suites, and that one is the tripwire above. Either the baseline has been repaired
or it is run-order dependent. **Worth re-measuring on a quiet tree**, independently of my change,
because "three to five failures" is what agents attribute against.

### 🔴 No device test. Nobody has seen B1 or this running.

**What the owner should check on a real save, in order of how much it would tell us:**

1. **Sign a player mid-season, note the transfer budget, then advance four or five weeks past a
   Chairman budget rebalance.** Before this change the budget would be back up. It must now stay
   down by the wage commitment. **This is the whole fix in one observation.**
2. **Then advance to a season boundary.** The pot should open fresh at the full percentage, and
   the committed bill in Step 1 should have risen. That is graduation.
3. **Force-quit and reload after a signing.** The budget must be the same figure. That is the
   persistence.
4. **Try to sign a £5,000/wk player 40 weeks out on a pot of about £150,000.** It should now
   warn and name £200,000 of wages. Before, it said nothing.
5. **Try a youth scholarship with an empty transfer budget and a healthy balance.** SIGN SCHOLAR
   should now be disabled. Before, it was allowed.

**The opening weeks of a new save are now tighter than before in one more way than §10.3
described** — the youth path is gated for the first time. That is intended and is item 2 of the
review's §10, but it is the change most likely to feel like a regression.

---

## 7. Scope boundary — A24

**Checked before starting:** `git status` was **clean**. A24's work appeared in the tree while I
was implementing.

I have touched **none** of A24's files. Verified by diffing every file we might share:

- A24's: `src/economy/packWages.ts`, `src/utils/staffWages.ts`, `src/economy/economyDiagnostics.ts`,
  `src/components/debug/ChecksTab.tsx`, `src/engine/StaffPoachingService.ts`,
  `src/api/endpoints/market.ts`, `src/hooks/useInitFlow.ts`, `src/stores/worldStore.ts`,
  `src/types/gameConfig.ts`, `src/types/market.ts`, `src/types/world.ts`,
  `src/__tests__/utils/staffWages.test.ts`, plus three new test files.
- **Mine: 19 modified + 1 new, listed in §9. No intersection.**
- The three shared-risk files (`locales/en/translations.json`, `locales/en/provenance.json`,
  `scripts/i18n/manual-overrides.json`) and `src/engine/GameLoop.ts` — I pasted each diff and
  **every line in them is mine.** A24 has not touched them yet; a later addition to the i18n
  files is additive and will not conflict.

⚠️ **I therefore added NO CHECKS line**, although the standing notes' §1 would normally require
one for "the owner should check X" in §6 above, and the review's §6 proposes a good one
(`createdWeek 100 · week 149 · span 46 · remaining 1 — SATURATED`). `ChecksTab.tsx` and
`economyDiagnostics.ts` are A24's territory in this brief and it has uncommitted work in both.
**Recommended for the PM to assign once A24 lands**, two lines:

```
DOF POT   opening £X · committed £Y · pot £Z · period wk 100 — CARRIED
SEASON    createdWeek 100 · week 149 · span 46 · remaining 1 — SATURATED
```

The first would have made the original defect visible in one glance; the second is the
measurement §6 of the review asks for.

---

## 8. 🔴 Two things the review did not catch

### 8.1 A FIFTH ungated comparison, in a file the review audited

`DofProposalCard.tsx` has **two** up-front-only comparisons, not one. The review names `:263`
(`isProposalAffordable`, the accept-time pre-gate). There is another at **`:109`** — `overBudget`
in the card component itself, which drives the budget row's colour and the warning text the user
reads.

So the card could show a deal **in budget, in black, with no warning**, and then the accept would
have charged the wage commitment on top. I found it because a source-reading pin failed, not by
reading the review — which is the argument for the pins. Both are fixed; both are in the table in
§4.

### 8.2 ⚠️ A PLAYER RENEWAL commits a new wage against no gate and no charge — NOT FIXED

`GameLoop:5641`, the DOF's automatic player-renewal pass, tests and charges **the sign-on fee
only**. It then calls `extendContract(player.id, offeredWage, ...)` with a renewed wage that may
be **higher** than the old one — and nothing prices the delta, against the pot or anything else.

The staff renewal path a few hundred lines above it charges exactly that delta, through
`dofContractCharge`'s `incumbentWeeklySalaryPence`. **So the asymmetry part C exists to remove
survives in renewals, pointing the same permissive way**: staff renewals are charged the wage
delta, player renewals are not.

**I did not fix it, deliberately.** My brief's Part 2 names four paths and this is not one of
them; a renewal is not a "new wage" on the ruling's literal words, though the staff path's treatment
of the delta argues it should be. Charging it would make every automatic player renewal more
expensive, which is a pricing change the owner has not been asked about. **This is the next item
in this family and it is small** — the same `dofContractCharge` call with the incumbent wage, and
`drawDofContractCharge` instead of `spendTransferBudget`.

### 8.3 Where the review was right, checked rather than taken

- §2's five derivation paths: **all five, and no sixth.** `grep` for every write to
  `transferBudget` outside the store returns only reads (`DofSigningService`, `DofBrain`,
  `npcClubDebugAssessment`).
- §2's `spendTransferBudget` silence: confirmed, and it was `Math.max(0, …)` exactly as quoted.
- §5's four player paths and the three `makeAmpBuyerFinanceCallbacks` callers: confirmed, and the
  commission really is drawn separately, so the pot's total draw really is `upfrontCost + wage`.
- §3's backward-looking Step 1: **measured**, see §2.2.
- §6's "nothing returns to the pot": confirmed — `grantTransferBudget` is the only non-derivation
  increase and its one caller is `OwnerMandateService:214`. I left it wiped by re-derivation and
  documented why: a grant is negotiated headroom, the opposite direction from a commitment, and
  it has no claim on being carried.

---

## 9. Commands and output, verbatim

### Before

```
$ git branch --show-current
new-game-save
$ git log --oneline -3
930fcde7 A29's pass entry, and the pounds column the brief had backwards
b8ee4594 The CHECKS tab reads a real player's wage and asks if the model agrees
6fb687a0 The age gate starts working, so the docs stop describing a dead branch
$ git status --short
(no output — clean)
$ npx jest --listTests | wc -l
     652
```

### Every write to `transferBudget` outside the store — the completeness check for §1

```
$ grep -rn "transferBudget:" src app | grep -v __tests__ | grep -v "transferBudgetPercent"
src/stores/clubStore.ts:57:  transferBudget: number;
src/stores/clubStore.ts:437:    transferBudget: 0,
src/stores/clubStore.ts:691:        set((state) => ({ transferBudget: carriedTransferBudgetPence(state) }));
src/stores/clubStore.ts:699:        set((state) => ({ transferBudget: Math.max(0, state.transferBudget - requested) }));
src/stores/clubStore.ts:717:          transferBudget: Math.max(0, s.transferBudget - fee - wage),
src/stores/clubStore.ts:724:      grantTransferBudget: (amount) => { set((state) => ({ transferBudget: state.transferBudget + Math.max(0, amount) })); flushClubStateToDB(); },
src/utils/npcClubDebugAssessment.ts:71:  transferBudget: number;
src/engine/DofSigningService.ts:453:      transferBudget:          currentTransferBudget,
src/engine/DofSigningService.ts:942:    transferBudget:          clubState.transferBudget ?? 0,
src/engine/DofBrain.ts:15:  transferBudget: number;            // pence — from clubStore
```

The last four are reads into a projection or a brain input. The two derivations are `:691` and
`setBudgetAllocation`.

### What still draws the pot as pure cash

```
$ grep -rn "spendTransferBudget(" src app | grep -v __tests__
src/engine/DofStaffHiringService.ts:145:        // ⚠️ **`drawDofContractCharge`, not `spendTransferBudget(totalPence)`.** The pot is
src/engine/AgentAccessService.ts:86:  club.spendTransferBudget(feePence);
src/engine/TransferService.ts:459:  useClubStore.getState().spendTransferBudget(agentCommissionPence);
src/engine/GameLoop.ts:5641:          useClubStore.getState().spendTransferBudget(signOnFeePence);
app/staff/[id].tsx:260:  // `spendTransferBudget(charge.totalPence)`: the fee half is also a ledger transaction so the
```

Three live calls, all pure fees, all booked to the ledger. The other two lines are comments.

### Typecheck

```
$ nvm use && npx tsc --noEmit
Now using node v20.19.6 (npm v10.8.2)
(no output)
```

### i18n

```
$ npm run i18n:apply-overrides -- --only component.signPlayerPanel.overBudgetBody --only component.signPlayerPanel.seasonWagesLabel --only component.signYouthPanel.overBudgetBody --write
manual-overrides.json: 3315 entries
catalog:               5017 entries
missing from catalog:  3 → component.signPlayerPanel.overBudgetBody, component.signPlayerPanel.seasonWagesLabel, component.signYouthPanel.overBudgetBody
value conflicts:       1 → common.watch
  (conflicts are NEVER changed by this script — resolve them deliberately)
Adding 3 key(s):
  + component.signPlayerPanel.overBudgetBody = "This deal draws {amount} from the transfer budget — {upfront} up front plus {wages} of wages to the end of the season, {excess} more than the budget."
  + component.signPlayerPanel.seasonWagesLabel = "WAGES TO SEASON END"
  + component.signYouthPanel.overBudgetBody = "This scholarship draws {amount} from the transfer budget — {upfront} up front plus {wages} of wages to the end of the season."
✓ catalog 5017 → 5020 entries.

$ npm run i18n:apply-overrides -- --only component.dofProposalCard.overBudget --write
Adding 1 key(s):
  + component.dofProposalCard.overBudget = "This draws more from the transfer budget than it holds — {upfront} up front plus {wages} of wages to the end of the season."
✓ catalog 5020 → 5021 entries.

$ npx tsx scripts/i18n/audit-tokens.ts
Checked 3779 t()/translate() modified calls with templates having placeholders.
Found 0 interpolation mismatches:
Found 0 references to keys absent from the catalog (render literally as the raw key):
```

⚠️ The `common.watch` value conflict is **pre-existing** and untouched — the script never changes
a conflict, and `--only` did not include it.

`entryCount` 5,017 → 5,021 (+4), matching A29's 5,017 in the catalogue's own `_meta`.

### 🔴 Two architecture registries my change moved — both guards working

The full run's ONLY two failures were deliberate-registry guards, and one of them is a
**good** result:

**`spendGateArchitecture.test.ts`** keeps a `NOT_YET_MIGRATED` worklist of *"sites still
answering affordability against a raw balance — SHRINKS ONLY"*. Its entry read:

```
'src/components/transfers/SignYouthPanel.tsx':
  'Youth signing upfront cost. Should draw on the DoF pot like every other signing.',
```

That is **exactly** what §4 did to it, so the test failed because the list no longer matched.
**The entry is removed and the worklist is one shorter**, with a note recording what cleared it.
This test had the youth-path debt written down before the review found it.

**`seasonBudgetService.test.ts`** keeps an exact registry of every file that reads
`seasonBudget`, each with a note on whether it DECIDES or DISPLAYS, because *"a new entry is a
new place the budget decides something, and that is always worth a moment's thought rather than
a green tick."* My change adds six readers — the four gate paths plus two test files — and each
is listed with why, the four gate paths marked DECIDERS. ⚠️ The list is sorted, so position
matters; appending them failed a second time.

⚠️ **That registry already strips comments before matching**, with a note saying *"a guard that
fires on prose is a guard people disable"* — the same lesson I hit independently in §5. It is the
right pattern and the player-gate pins now follow it.

### The suites I touched, run individually

```
$ npx jest src/__tests__/economy/dofPotLedger.test.ts
Test Suites: 1 passed, 1 total
Tests:       27 passed, 27 total

$ npx jest src/__tests__/economy/dofHireCharge.test.ts
Test Suites: 1 passed, 1 total
Tests:       33 passed, 33 total

$ npx jest src/__tests__/engine/DofStaffHiringService.test.ts
Test Suites: 1 passed, 1 total
Tests:       25 passed, 25 total

$ npx jest src/__tests__/db/pickClubState.test.ts
Test Suites: 1 passed, 1 total
Tests:       5 passed, 5 total

$ npx jest src/__tests__/economy/dofHireCharge.test.ts src/__tests__/economy/staffHireBudget.test.ts src/__tests__/engine/DofStaffHiringService.test.ts
Test Suites: 3 passed, 3 total
Tests:       76 passed, 76 total
```

All seven suites I touched, together, after the two registry fixes:

```
$ npx tsc --noEmit && echo "TSC CLEAN" && npx jest \
    src/__tests__/economy/dofPotLedger.test.ts src/__tests__/economy/dofHireCharge.test.ts \
    src/__tests__/economy/staffHireBudget.test.ts src/__tests__/economy/spendGateArchitecture.test.ts \
    src/__tests__/engine/DofStaffHiringService.test.ts src/__tests__/engine/seasonBudgetService.test.ts \
    src/__tests__/db/pickClubState.test.ts
TSC CLEAN
Test Suites: 7 passed, 7 total
Tests:       138 passed, 138 total
```

`staffHireBudget.test.ts` (28) needed no change: it tests `staffHireRefusal`, which prices through
`dofContractCharge` and is unaffected by where the draw is carried.

### My files — the complete set

```
 M app/staff/[id].tsx
 M locales/en/provenance.json
 M locales/en/translations.json
 M scripts/i18n/manual-overrides.json
 M src/__tests__/db/pickClubState.test.ts
 M src/__tests__/economy/dofHireCharge.test.ts
 M src/__tests__/economy/spendGateArchitecture.test.ts
 M src/__tests__/engine/DofStaffHiringService.test.ts
 M src/__tests__/engine/seasonBudgetService.test.ts
 M src/components/inbox/DofProposalCard.tsx
 M src/components/transfers/SignPlayerPanel.tsx
 M src/components/transfers/SignYouthPanel.tsx
 M src/db/helpers/pickClubState.ts
 M src/economy/dofHireCharge.ts
 M src/engine/DofProposalService.ts
 M src/engine/DofStaffHiringService.ts
 M src/engine/GameLoop.ts
 M src/engine/TransferService.ts
 M src/stores/clubStore.ts
?? src/__tests__/economy/dofPotLedger.test.ts
```

### The full run

⚠️ **Read §6 before this number.** A24 has uncommitted work in this checkout, and the tree moved
*during* the run — the first full run collected 656 suites and reported 655, because A24's
scratch file `a24measure.tmp.test.ts` changed mid-run. **A number from this tree is not
attributable to me and I am not presenting it as if it were.**

The run that found my two registry failures, before I fixed them:

```
$ npm test
Test Suites: 2 failed, 653 passed, 655 total
Tests:       2 failed, 3 skipped, 10960 passed, 10965 total
Time:        1804.548 s
FAIL src/__tests__/economy/spendGateArchitecture.test.ts (9.862 s)
FAIL src/__tests__/engine/seasonBudgetService.test.ts (28.267 s)
```

**Those two were the only failures in the whole run, both were mine, and both are fixed** — each
verified individually and then all seven touched suites together, above. ⚠️ Note what this run
does *not* show: the documented three-to-five-failure baseline did not appear, so this tree is
greener than `environment.md` describes, which is worth the PM knowing independently of my change.

### The final run, at my commit, on a clean tree

```
$ git log --oneline -3
598ff158 The director of football's pot starts remembering what it spent
9f46bf66 Staff and scout wages priced from the wage band, on ability
930fcde7 A29's pass entry, and the pounds column the brief had backwards
$ git status --short
(no output — clean)
$ npx jest --listTests | wc -l
     655
$ npm test
Test Suites: 1 failed, 654 passed, 655 total
Tests:       1 failed, 3 skipped, 10961 passed, 10965 total
Time:        1116.089 s
FAIL src/__tests__/db/health/runner.test.ts (34.541 s)
```

The single failure is the wall-clock tripwire analysed in §6, which passes in isolation.

### After

```
$ git show --stat HEAD
commit 598ff158 (amended from 4c3f45eb — the `.context` entry’s test-count paragraph was corrected once the tree went clean)
    The director of football's pot starts remembering what it spent
 .context/shared/last-sync.md                       | 104 +++++
 app/staff/[id].tsx                                 |  11 +-
 locales/en/provenance.json                         |  16 +
 locales/en/translations.json                       |   6 +-
 scripts/i18n/manual-overrides.json                 |   4 +
 src/__tests__/db/pickClubState.test.ts             |  22 +-
 src/__tests__/economy/dofHireCharge.test.ts        | 188 ++++++++-
 src/__tests__/economy/dofPotLedger.test.ts         | 440 +++++++++++++++++++++
 .../economy/spendGateArchitecture.test.ts          |   8 +-
 src/__tests__/engine/DofStaffHiringService.test.ts |  41 ++
 src/__tests__/engine/seasonBudgetService.test.ts   |  21 +
 src/components/inbox/DofProposalCard.tsx           |  52 ++-
 src/components/transfers/SignPlayerPanel.tsx       |  49 ++-
 src/components/transfers/SignYouthPanel.tsx        |  51 ++-
 src/db/helpers/pickClubState.ts                    |   8 +
 src/economy/dofHireCharge.ts                       |  49 +++
 src/engine/DofProposalService.ts                   |  29 +-
 src/engine/DofStaffHiringService.ts                |  16 +-
 src/engine/GameLoop.ts                             |  10 +-
 src/engine/TransferService.ts                      |  10 +-
 src/stores/clubStore.ts                            | 238 ++++++++++-
 21 files changed, 1327 insertions(+), 46 deletions(-)
```

**21 paths, staged by explicit name, never `git add -A`.** None of A24's files are in it; its
`9f46bf66` landed separately and first.

---

## 10. ⚠️ For the PM — `.context` text this change makes wrong

I have **appended one pass entry to `.context/shared/last-sync.md`** and changed nothing else, per
the standing notes. Three things need curating and I have not touched them:

1. **`game-mechanics.md:1593–1595`** — *"**The pot is a spending envelope, not cash.** Pinned by
   `dofHireCharge.test.ts`."* The review flagged this as false. **It is now TRUE**, and pinned by
   `dofPotLedger.test.ts` rather than by `dofHireCharge.test.ts` — the second half of the sentence
   is what needs updating, not the first.
2. **`game-mechanics.md:1578–1580`** — *"The two spans abut, so no week is funded twice and no
   week is funded by nobody."* The first half holds. **The second half is still false** and is now
   *measured* false (§2.2). This is the one that most needs rewriting, because a future reader
   will take an exactness claim in a stage file as measured.
3. **`dofHireCharge.ts`'s own header** makes the same abutting claim. I left the header's ruling
   intact and added nothing contradicting it, because correcting a docblock about Step 1 from
   inside the pot's module seemed like the wrong place — flagging instead.

Also for the PM: **§8.2 above is a real finding and is not in the review.** It belongs on the
loose-ends list.
