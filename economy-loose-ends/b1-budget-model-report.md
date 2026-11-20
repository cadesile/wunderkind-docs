<!-- STATUS: ✅ BUILT AND COMMITTED (app `new-game-save`, 2026-11-20). NOT deployed. Two questions for the owner, one of them new -->

# B1 report — the owner's club budget model, parts B and C

**Built on `new-game-save`. No backend change was needed. Nothing pushed, merged or deployed.**

Gates: `npx tsc --noEmit` clean. `npm test` **651 suites / 10,865 passed** (10,868 collected, 3
skipped), `npx jest --listTests` **651**. Baseline from `CLAUDE.md`'s `new-game-save` row was
650 / 10,832, so this is **+1 suite / +33 tests, and it reconciles exactly** — see "Verification".
The economy gate **has not moved**.

---

## 🔴 Read this first: the brief's central premise is wrong, and it inverts A22's answer

The brief told me to plan around this:

> `incomeAnchoredWages` is **absent from the live published config** and its documented default
> is **false** (`gameConfig.ts:952`). … **So the snap does not run today, and deleting it will
> measure as a no-op on a new save.** … Do not conclude from a flat measurement that you have
> done nothing wrong.

**The snap does run today.** `economyConfig.ts:187`:

```ts
incomeAnchoredWages: config.incomeAnchoredWages ?? (baseline?.wageModel === 'turnover'),
```

**Absent does not mean false — absent *derives*.** That is deliberate and documented at the site
(owner, 2026-11-14: there is no admin surface for a standalone boolean, so `wageModel` carries
it). The `false` the brief cites is a field of `DEFAULT_GAME_CONFIG`, the **pre-sync fallback**,
and it never applies to a payload that synced.

Resolved the live fetch the brief itself cites
(`deploy-run-2026-11-20/game-config-sc.LIVE.json`) through the real `resolveEconomy`:

```
tier 1: model=turnover fallback=none incomeAnchoredWages=true
tier 2: model=turnover fallback=none incomeAnchoredWages=true
tier 3: model=turnover fallback=none incomeAnchoredWages=true
tier 4: model=turnover fallback=none incomeAnchoredWages=true
raw key present: false
baseline.wageModel: turnover
```

The brief warns against reasoning *"the model is legacy, therefore no anchoring"*. The real trap
is the mirror image: **`wageModel === 'turnover'` is precisely what turns anchoring ON**, and the
brief's own note that the wage model IS `turnover` is the evidence against its conclusion rather
than a caveat to it.

### Consequences

1. **Removing the snap is a live behaviour change on a new save, not a no-op.** Expect staff
   wages on a NEW save to move. A FLAT measurement is now the suspicious result.
2. **A22's attribution STANDS** — see the next section.
3. **`anchorAmpStaffWages`'s own A26 comment was wrong too.** It said *"the live
   `economy_wage_model` is `legacy` on every deployed box"*. It is `turnover`. So **the A26
   scout-`ability` change is NOT latent on dev — it is live**, and the phrase "inert on dev today,
   which is what lets phase 1 ship without moving a salary" describes something that did not
   happen. That is an A26 problem, not mine, but it is the same wrong premise a third time and
   someone should check what A26's deploy actually did to scout salaries.
4. `seasonBudgetService.test.ts` carried *"this read decides nothing while the flag is off"* on
   `ClubWageScaleService`. Corrected in place. **Treat every "behind the flag, therefore inert"
   claim about income anchoring in this repo as suspect.**

This is written up at `07_synthesis/output/game-mechanics.md` and in the shared notes folder as
`b1-FINDING-incomeAnchoredWages-is-ON.md`, so it does not have to be rediscovered.

---

## The A22 question, answered

> A22 attributed the owner's very large staff wages to that snap and reproduced a figure to three
> pence. If the flag is off, the snap cannot have run on a save created under this config.
> **Establish what actually writes those salaries.**

**The premise of the question is false, so A22 needs no rescuing: the flag is on, the snap could
run and did, and A22's reproduction is consistent.** Nothing else needs to be hunted for.

The five-rung chain at `staffWages.ts:110-114` resolves, in order:

```ts
return staff.salary                                                   // rung 1
  ?? (anchoredPence && anchoredPence > 0 ? anchoredPence : undefined)  // rung 2
  ?? staff.weeklySalary                                                // rung 3
  ?? (economy ? tierStaffWeeklyWagePence(...) : undefined)             // rung 4
  ?? legacyStaffWagePence(staff.coachingAbility);                      // rung 5
```

**Rung 1, `staff.salary`, is what holds the owner's figures, and `anchorAmpStaffWages` is what
wrote it there.** The writer is `updateCoach(coach.id, { salary: anchored })` /
`updateScout(...)` inside the snap, at the season-1 bootstrap, with `anchored =
ampStaffWagePence(ability, economy)` — the budget-exhausting solver. Once written it is
persisted, and rung 1 is unconditional, which is why nothing has moved it since.

Two corrections to how the snap has been described, both of which matter if anyone re-measures:

- **It runs at BOOTSTRAP ONLY, not "at each season boundary".** Both `part-b-resolved-budget-model.md`
  and the brief say it re-solves at every season boundary. The call site was
  `bootstrapSeasonBudgets` (`:456`) and nowhere else; `setAmpSeasonBudget`, the real transition
  path, never called it. The transition path mean-reverts staff wages through
  `staffRenewalWagePence` in `GameLoop` §14c instead. So the owner's staff wages were set **once**,
  in the first week of the save, and have been drifting by renewal since.
- **The owner's existing save will not change, and that part of the brief is right.** `salary` is
  persisted and rung 1 is unconditional, so removing the snap changes what a FUTURE budget would
  write, not what is already written. I could not verify this on device (see "Not verified").

---

## What I built

### Step 3 — `src/economy/dofHireCharge.ts` (new)

The one place that decides what a new contract costs the DOF's pot. Two exports:

- `weeksRemainingInBudgetSeason({ currentWeek, budget, weeksPerSeason })`
- `dofContractCharge({ feePence, weeklySalaryPence, incumbentWeeklySalaryPence?, weeksRemaining })`
  → `{ feePence, wageCommitmentPence, totalPence }`

**Charged at all five sites**, each via `spendTransferBudget(charge.totalPence)`:

| Path | File |
|---|---|
| manual staff renewal / hire / poach | `app/staff/[id].tsx` `handleConfirm`, all three branches |
| automatic staff hiring | `DofStaffHiringService` — pot re-read per candidate |
| DOF staff renewal | `GameLoop` §14c |
| player signing (player's own and DOF auto) | `TransferService.makeAmpBuyerFinanceCallbacks` |
| hire LIST affordability hint | `HireScreen.tsx` via `hireLogic.shortfallPence` |

Three things worth flagging about the implementation:

**⚠️ Only the FEE is booked to the ledger.** The wage commitment draws the pot down and writes no
transaction, because the weekly tick already pays wages out of the balance every week — booking
the remaining-weeks figure would charge the club twice for one contract. The pot is a spending
**envelope**, not cash. Pinned by a source-reading test, because no behavioural test can see a
double charge that is split across a tick boundary.

**⚠️ The transfer path's `weeklyWage` parameter was already there, taken and ignored, commented
`// pence — for future wage-commitment recording`.** That is now wired. Doing staff and not
players would have recreated exactly the asymmetry this workstream exists to remove.

**⚠️ Two paths I found that tested a budget and then charged nothing to it**, both now fixed:
`GameLoop` §14c's staff renewal (the player renewal beside it has spent the pot since
2026-11-16), and `app/staff/[id].tsx`'s three branches, which each carried their own
`(club.balance ?? 0) < fee` test independent of the panel's gate.

### `ClubBudget.createdWeek` — and why a new field was the right answer

**This is the one place I had to make a design decision the ruling does not settle, so it needs
your eyes.**

The ruling says the pot pays *"the remaining weeks of this season"*. **The app had no single
quantity to read that from**, and four candidates that disagree:

| candidate | what it actually is |
|---|---|
| `club.weekNumber` | absolute, never reset — `seasonWeekOf` decomposes it mod 52 |
| `contractBondsLogic.SEASON_WEEKS` / `projection.SEASON_WEEKS` | a **52-week contract year** |
| `economy.weeksPerSeason` | the **46-week playing season**, and what Step 1 annualises wages over |
| the season transition itself | fires on **fixture exhaustion**, not on a week number |

Electing any one of them would have created a second source for a quantity Step 1 already
owns — the governing defect of this whole workstream. So **the budget states its own period
instead**: it begins at `createdWeek` and runs `weeksPerSeason` weeks, which is exactly the span
`deriveClubBudget` annualises the committed bill over. That makes the ruling's own test —
*"existing at the moment the budget is created"* — arithmetically self-consistent rather than
merely stated, and it is pinned by a test that asserts the two spans **abut**: the pot funds the
tail of this period, income funds every period after, so no week is funded twice and no week is
funded by nobody.

Costs nothing to add: `seasonBudget` rides on the `club` blob, so **no migration**. Set at all
four derivation sites (AMP and NPC, bootstrap and transition), asserted by source read. Optional,
because pre-2026-11-20 saves have none — absent charges a **full season**, the conservative read,
which is also exactly what Step 1 will commit at the next budget, so it can never under-charge.

⚠️ I found a related pre-existing defect and **did not fix it** (out of scope):
`FinancialProjectionService:241` is `Math.max(0, SEASON_WEEKS - currentWeek)` with the comment
*"currentWeek resets to 1 each season"*. `club.weekNumber` does **not** reset, so that expression
is 0 for every save past week 52. It is a separate question from this change and
`projection.ts:196` suggests the 0 case was at least thought about.

### Part C — the gate

`staffHireRefusal` tests the DOF pot. Its input type **lost** `allocatablePence`, `budget` and
`currentWeeklyStaffWagePence` and **gained** `dofPotPence` + `weeksRemainingInSeason`. Still two
tests, still in that order, so "cannot afford the fee" stays distinguishable from "cannot afford
the wage" — *"two tests against one pot, not one test"*, as the ruling puts it.

🟢 **`c73bf9a8`'s delta logic survives**, reached more directly: the charge is the wage delta over
the remaining weeks, floored at zero, so same-or-lower terms commit nothing and always pass. The
club's whole existing staff bill is **no longer an input at all**, which is what finally makes a
refusal actionable — the old allowance and the bill it was compared against were derived from the
same number, so a club at its share could never hire or renew at any price (the knife edge in
`scotland-experiment-2026-11-19.md`). That test is no longer close to `x > x`; it is money set
aside and drawn down.

⚠️ **`STAFF_WAGE_SHARE_BP` survives, as you required**, with a note at its definition and two
tests that fail if someone deletes `weeklyStaffWageBudgetPence` or re-points the gate at it.

⚠️ **ONE DELIBERATE BEHAVIOUR REVERSAL you should know about.** A club with no `seasonBudget` used
to be **exempt** from the wage test, on purpose — no reservation to take a 25% share of before the
first transition. The pot needs no reservation (`allocatableBalancePence` returns the whole
balance pre-transition), so the exemption has no reason left, and **the opening weeks are the ones
that most needed gating**: 19 coaches and 4 scouts at £16,191/wk is exactly what it let through.
So the first season is now gated where it was not. If you would rather the opening weeks stayed
open, that is a one-line change and I will make it.

### `anchorAmpStaffWages` — retired

Function and call gone. The argument it was built on is kept verbatim at its old site under a
`RETIRED 2026-11-20` heading, as the brief asked: it argues for snapping rather than
mean-reverting at bootstrap, and that argument is still sound about bootstrap-vs-transition —
what the ruling rejects is its **premise**, that a starting staff wage is template data free to
be re-solved at all. The record also carries the `incomeAnchoredWages` correction, so the next
reader does not inherit the wrong premise.

⚠️ **`anchorNpcStaffWages` and `snapNpcStaffWages` are NOT retired.** They price NPC clubs, which
have no director of football and no pot for a hire to come out of, so Step 3 has nothing to say
about them. **Whether the ruling extends to NPC clubs is a question I did not answer**, and the
circularity argument applies to them just as much. Flagged, not acted on.

### The DOF card's copy

Widened through the catalogue, as a **new key** `screen.budget.spends.transferDof`:

> "Spends this on transfer fees and agent commission, on the signing-on fees for new contracts
> and renewals, and on the wages of every new player and new member of staff for the rest of the
> season."

A new key rather than an edit, because `apply-overrides` is additive-only and *"never overwrites a
differing value"* — editing `transferFull` in place would not have propagated. `transferFull` is
left intact and is now orphaned; there is a comment at the call site saying so. Merged with
`npm run i18n:apply-overrides -- --only screen.budget.spends.transferDof --write` (5,016 → 5,017
entries) and `npx tsx scripts/i18n/audit-tokens.ts` reports **0 mismatches, 0 missing keys**.

### Step 1 — untouched, as instructed

---

## ❓ Two questions for the owner

**1. (The brief's) When a contract ends or a player is sold mid-season, does the unspent remainder
return to the DOF's pot?** Not answered, as instructed. Where it bites concretely: the wage delta
is **floored at zero**, so a renewal on *lower* terms is free rather than crediting the pot, and a
contract that ends in week 20 of a 46-week period leaves 26 weeks of pot that the club has been
charged for and will not spend. If the answer is "yes it returns", the floor comes off
`dofContractCharge` and a release/sale/expiry site has to grant the remainder back — a real piece
of work, not a tweak.

**2. (New, and the ruling is genuinely ambiguous here) Which season is "this season"?** I resolved
it as "the budget's own 46-week period from `createdWeek`" for the reasons above, and I think that
is the only self-consistent reading. But a player reading the DOF card will think of the season
they can see in the fixture list, and those are not the same thing once `weekNumber` drifts off
the 52-week grid. If the owner means the visible football season, the remainder should come from
the fixture list instead and `createdWeek` becomes a different field.

---

## Verification

**`npx tsc --noEmit`** — clean.

**`npm test`** — 651 suites / 10,865 passed, 10,868 collected, 3 skipped. `--listTests` **651**.
Baseline 650 / 10,832 (10,835 collected) from `CLAUDE.md`'s `new-game-save` row.

✅ **Reconciles exactly: +1 suite / +33 tests.**

| | suites | tests |
|---|---|---|
| `dofHireCharge.test.ts` (new) | +1 | +24 |
| `staffHireBudget.test.ts` (rewritten for the pot) | 0 | +5 (23 → 28) |
| `DofStaffHiringService.test.ts` (pot charging) | 0 | +4 (20 → 24) |
| **total** | **+1** | **+33** |

`seasonBudgetService.test.ts` (reader registry) and `DofProposalService.test.ts` (the player-wage
charge) both changed without changing count.

⚠️ *"A worker process has failed to exit gracefully"* appears on this run. It is pre-existing and
run-ordering-dependent — `CLAUDE.md`'s own `new-game-save` row records it on the baseline run.

**The economy gate — NOT MOVED.** It reports `GATE: FAIL — 5 check(s)`. I verified this is
pre-existing rather than assuming it: I extracted a pristine `git archive HEAD` to a scratch
directory, symlinked `node_modules`, and ran `scripts/economy/gate.ts` there. **Byte-identical
verdict, the same 5 named checks.** Independently, the gate's whole import closure is
`harness/{fixtures,loadExport,simulate}` + `economy/{inflation,shirtSales,upkeep}` +
`utils/{matchdayIncome,seasonTickets,stadiumCapacity}` + two type modules — **none of the 13
files this change touches**.

**No authored figure was changed.** No backend change; `wunderkind_test` untouched, so its
migration-tracking hazard did not arise.

### Not verified

- ⚠️ **No on-device test.** The brief calls a real save on dev *"the only honest test"* for this
  change, and I have not done it: the three things it asks for (Step 1 showing players + staff +
  maintenance, a mid-season hire charging `weeklySalary × weeksRemaining` + fee against the pot,
  and that person appearing in Step 1 at the next budget) each need a save advanced across a
  season boundary, and **I was told not to deploy**. Everything above is static analysis and
  jest. The graduation property in particular is pinned arithmetically and not observed.
- ⚠️ **Not tested with `incomeAnchoredWages` explicitly ON**, as the brief asks — because it
  turns out to be on already, so the normal path *is* that configuration. What is untested is the
  opposite arm: an explicit `incomeAnchoredWages: false` in the payload.
- **That the owner's existing save does nothing when the snap goes.** Reasoned (rung 1 is
  unconditional and `salary` is persisted), not observed.
- Whether the ruling should extend to NPC staff pricing.

### Files changed (app only, 13 + catalogue)

`src/economy/dofHireCharge.ts` (new) · `src/economy/clubBudget.ts` · `src/economy/staffHireBudget.ts` ·
`src/engine/SeasonBudgetService.ts` · `src/engine/DofStaffHiringService.ts` ·
`src/engine/TransferService.ts` · `src/engine/GameLoop.ts` ·
`src/components/transfers/SignStaffPanel.tsx` · `src/screens/office/HireScreen.tsx` ·
`src/screens/office/hireLogic.ts` · `src/screens/finances/BudgetScreen.tsx` ·
`app/staff/[id].tsx` · `scripts/i18n/manual-overrides.json` + `locales/en/{translations,provenance}.json` ·
tests `economy/dofHireCharge.test.ts` (new), `economy/staffHireBudget.test.ts`,
`engine/DofStaffHiringService.test.ts`, `engine/seasonBudgetService.test.ts`,
`engine/DofProposalService.test.ts` · `.context/stages/04_interfaces/output/services.md`,
`.context/stages/07_synthesis/output/game-mechanics.md`, `.context/shared/last-sync.md`
