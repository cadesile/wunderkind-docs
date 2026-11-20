<!-- STATUS: ✅ BUILT, COMMITTED AND VERIFIED — app `new-game-save` @ `4113d326`.
NOT PUSHED, NOT DEPLOYED. tsc clean; 656 suites / 10,983 passed, reconciling exactly
(+1 suite / +21) against the clean `598ff158` baseline of 655 / 10,965. 2026-11-20 -->

# The DOF's player renewal priced the wage at nothing

**App `new-game-save` @ `4113d326`, a separate commit from A24's `9f46bf66`.** Raised by B1, confirmed by the PM
against both paths, implemented here.

---

## 1. The defect

`GameLoop.ts` §14b — the DOF's automatic PLAYER renewal:

| | before |
|---|---|
| gate | `useClubStore.getState().transferBudget < signOnFeePence` — **the fee alone** |
| charge | `addTransaction(-signOnFeePence)` + `spendTransferBudget(signOnFeePence)` — **the fee alone** |
| then | `extendContract(player.id, offeredWage, …)` — the wage moves, **nothing charged for it** |

So the DOF could raise a player's wage by any amount at all, and the only thing tested was a
sign-on fee that is a *percentage* of that wage. The STAFF renewal twelve lines below (§14c) has
had the whole machinery since part C of the owner's 2026-11-20 budget ruling:
`weeksRemainingInBudgetSeason`, one `dofContractCharge` feeding both the gate and the charge,
`staffHireRefusal` with a `'fee'`-vs-wages distinction, and a draw of the fee **and** the wage
delta.

**This is the asymmetry part C existed to remove, surviving in renewals.** The 2026-11-16 fix
repaired the fee half and stopped; nothing in the suite could see the other half, because a
fee-only charge is indistinguishable from a correct one whenever the wage delta happens to be
zero — which mean reversion makes the common case.

---

## 2. What changed

### `src/engine/GameLoop.ts` §14b

```ts
const playerRenewalWeeksRemaining = weeksRemainingInBudgetSeason({
  currentWeek: renewalClubState.club.weekNumber ?? 1,
  budget: renewalClubState.club.seasonBudget,
  weeksPerSeason: renewalEconomy.weeksPerSeason,
});
const livePlayer = useSquadStore.getState().players.find((p) => p.id === player.id);
const incumbentWagePence = livePlayer?.wage ?? livePlayer?.contractValue
  ?? player.wage ?? player.contractValue ?? 0;
const playerRenewalCharge = dofContractCharge({
  feePence: signOnFeePence,
  weeklySalaryPence: offeredWage,
  incumbentWeeklySalaryPence: incumbentWagePence,
  weeksRemaining: playerRenewalWeeksRemaining,
});
const playerRenewalRefusal = dofChargeRefusal(
  playerRenewalCharge,
  useClubStore.getState().transferBudget,
);
```

Then the refusal branch (fee vs wages, both in catalog copy), `addTransaction(-signOnFeePence)`
**unchanged**, and `drawDofContractCharge(playerRenewalCharge)` in place of
`spendTransferBudget(signOnFeePence)`.

**It is a DELTA.** The player is already inside the committed wage bill, so only
`offeredWage − current wage` for the weeks left in the budget period is new money.
`dofContractCharge` floors that at zero, so **a renewal at the same wage or less commits nothing
and can never be refused on wages.**

**The incumbent wage comes off the LIVE squad record.** `players` is a pass-level snapshot taken
above the loop; the delta is the mechanism, and a stale incumbent is a wrong charge that still
looks plausible. `wage` then `contractValue` is the documented pair. ⚠️ When NEITHER is present
the incumbent is genuinely unknown and this charges the full wage rather than inventing a zero
delta — over-charging the pot is the safe direction, and a player row carrying no wage at all is
the state `CLAUDE.md`'s pack-is-a-census rule calls a defect rather than a case to accommodate.

**It goes through B1's ledger, not `spendTransferBudget`.** That function clamps at zero and
records nothing, so a wage drawn through it is handed back by the next re-derivation of
`transferBudget` from the balance. `drawDofContractCharge` puts the delta on
`dofWageCommitmentPence`, the carried ledger that survives it. **Drawing the wage without the
ledger would have rebuilt the defect B1 had just fixed.**

**The fee only is booked to the finance ledger.** The weekly tick already pays wages out of the
balance, so a transaction for the remaining-weeks figure would charge the club twice for one
contract — `dofHireCharge`'s note on the pot being a spending ENVELOPE rather than cash.

### `src/economy/staffHireBudget.ts` — new `dofChargeRefusal(charge, pot)`

⚠️ **One line more than "copy the staff path's shape", and the reason is worth stating.** The
staff path computes the charge **twice**: `dofContractCharge(...)` for the charge, then
`staffHireRefusal(...)`, which calls `dofContractCharge` again internally. They agree only
because the arguments are spelled identically at two call sites — and its own comment claims
*"ONE computation feeding both the gate and the charge, so they cannot disagree."*

**Spelling the arguments twice is a convention that looks like that property.**
`dofChargeRefusal` takes the charge OBJECT, so the gate and the charge are the same arithmetic by
construction. `staffHireRefusal` now delegates to it — behaviour-identical, 28 existing tests
green unchanged — which also removes the duplicate computation on the staff side. Role-neutral
despite the file name; the asymmetry it fixes is not about what kind of contract this is.

### i18n

`message.gameLoop.body.dofPlayerRenewalOverWageBudget`, modelled on the staff path's
wage-refusal copy but naming the transfer budget, which is the pot's player-facing name. Via
`manual-overrides.json` → `npm run i18n:apply-overrides -- --only <key> --write` →
`npx tsx scripts/i18n/audit-tokens.ts` (**0 interpolation mismatches, 0 absent keys**; catalog
5,021 → 5,022).

---

## 3. 🔴 The contract-promise branch — DECIDED: left fee-only, deliberately

The second gate, near 5600: `if (useClubStore.getState().transferBudget < promisedSignOnFee) return;`

**Left as a fee-only test, and it is not the hole it looks like.** It is an EARLY-OUT *before*
`offeredWage` is raised to the promised wage — not the gate. Everything it admits falls through
to the full fee-plus-delta gate below, computed on the raised wage, so **the wage is never
ungated on this path either.** Making it delta-aware would mean pricing the same renewal twice —
precisely what `dofChargeRefusal` exists to stop — and it would refuse *here*, silently, in place
of a gate that refuses with an inbox message naming which limit was hit. The cheap test first is
strictly better. Recorded at the site.

⚠️ **Pre-existing and NOT fixed: that `return` is silent.** A user whose club cannot cover a
PROMISED renewal is never told the DOF skipped it. Out of scope for a pricing-symmetry fix —
flagged rather than widened.

---

## 4. 🔴 `renewalTransferBudget.test.ts` — the guard was lying in three ways

The 3 failures on the first full run were real and not flake (128 s, unloaded machine): this is
the **2026-11-16 fix's own guard**, pinning the fee-only shape this change supersedes. Rewritten
with the reasoning kept, per the convention B1 followed when it inverted six tests. 6 tests → 10.

### 4a. Three assertions were superseded — was / is / why

| was | is now | why |
|---|---|---|
| `transferBudget < signOnFeePence` | `dofChargeRefusal(playerRenewalCharge, …transferBudget)` | the gate must see the wage delta too |
| `spendTransferBudget(signOnFeePence)` | `drawDofContractCharge(playerRenewalCharge)` | `spendTransferBudget` clamps and records nothing |
| the fee re-read per player | the POT re-read per player at `dofChargeRefusal` | same property, different call |

The negatives about the raw balance are **untouched**.

### 4b. ⚠️ It read COMMENTS as code — and that is why one assertion "passed"

On the first run after the change, `expect(RENEWAL).toMatch(/transferBudget < signOnFeePence/)`
**passed** — not because the gate was still there, but because the rewritten reasoning at that
site *quotes* the pre-fix shape, per this project's rewrite-don't-delete convention.

**A source guard that matches prose asserts against the documentation, and starts passing the
moment somebody deletes the explanation.** Comments are stripped in both guards now. My own new
suite hit the identical trap on its first run.

### 4c. ⚠️ It sliced a FIXED 12,000 characters, so it was shrinking its own coverage

`SRC.slice(start, start + 12_000)` from the `14a` landmark. Adding the reasoning above pushed
`category: 'contract_extension'` past the window, so *"still records the fee in the ledger"*
failed for **having run out of file**, not for anything about the code. It is landmark-bounded at
both ends now.

🟢 **For the PM — this generalises.** A fixed-width source slice silently protects less every time
someone adds a comment above it. It failed loudly here only because a real assertion happened to
fall off the end. **Other guards using a fixed window are worth a sweep**; not done here, flagged
rather than widened.

### 4d. 🔴 Rewriting those three nearly dropped the file's actual point — PM's catch

The PM asked, before this was committed, whether the 2026-11-16 property still had an
assertion: **that a renewal's fee is charged against the DOF pot and not against `club.balance`.**
It did not, on the charge side, and the gap is exactly the kind this workstream exists to remove.

The old `spendTransferBudget(signOnFeePence)` named the fee and the pot **in one string.** Its
replacement names only `playerRenewalCharge`, so "the fee reaches the pot" became implicit in how
that object is BUILT — and nothing asserted it. A `feePence: 0` would have passed all nine tests
in that file **and all seventeen** in the new suite, putting the 2026-11-16 defect back in a new
shape: the fee charged *nowhere*, rather than charged to the balance.

Closed by `charges the SIGN-ON FEE to the pot — the 2026-11-16 property, pinned explicitly`, and
**proven to bite by mutation** rather than asserted:

```bash
# feePence: signOnFeePence  →  feePence: 0, then run the guard, then restore
```
```
    ✓ tests the whole charge against `transferBudget`
    ✓ does the same on the promise-driven path
    ✓ no longer gates either fee on the raw balance
    ✓ gates the WAGE, not just the fee — the 2026-11-20 half
    ✓ draws the fee AND the wage commitment, through the ledger door
    ✕ charges the SIGN-ON FEE to the pot — the 2026-11-16 property, pinned explicitly
    ✓ still records the fee in the ledger
    ✓ records the FEE ONLY as a transaction, never the wage commitment
    ✓ reads it from the store at the gate rather than hoisting it
    ✓ reads the INCUMBENT WAGE per player too, off the live squad record
Tests:       1 failed, 9 passed, 10 total
```

**The only one of the ten that catches it.** `feePence: signOnFeePence` restored and verified.

**Superseding a shape is legitimate; superseding the property the shape was protecting is how a
guard quietly stops guarding.**

### 4e. Which of the original 6 properties survive, and where

| original property | holds? | test |
|---|---|---|
| gate reads `transferBudget`, not the balance | ✅ | `tests the whole charge against transferBudget` |
| same on the promise path | ✅ assertion unchanged | `does the same on the promise-driven path` |
| neither fee gated on the raw balance | ✅ assertion unchanged | `no longer gates either fee on the raw balance` |
| the pot is drawn down | ✅ | `draws the fee AND the wage commitment, through the ledger door` |
| **the FEE is what the pot is charged** | ✅ **newly explicit (4d)** | **`charges the SIGN-ON FEE to the pot`** |
| the fee is recorded in the ledger | ✅ | `still records the fee in the ledger` |
| the pot is re-read per player | ✅ | `reads it from the store at the gate rather than hoisting it` |

---

## 5. Tests added

`src/__tests__/economy/dofPlayerRenewalCharge.test.ts` — **17 tests**, four groups: the charge is a
delta (same wage → 0, lower wage → 0 not negative, only the rise × weeks, incumbent 0 → full
wage); `dofChargeRefusal` (fee first, wages second, agrees with `staffHireRefusal` across seven
pot values); the commitment lands on the carried ledger; and §14b's own shape.

§14b is a few hundred lines inside `runWeeklyTick` behind a dozen stores, so its behaviour is
pinned at the two seams it is made of plus a source read — the pattern `dofHireCharge.test.ts`
and `dressingRoomLogic.test.ts` already use, and for the same reason.

`src/__tests__/engine/renewalTransferBudget.test.ts` — 6 → **10** (§4).

---

## 6. Out of scope, as instructed

1. **What a renewal OFFERS** — `quoteRenewal`, the promised-wage floor and mean reversion: untouched.
2. **B1's committed files** beyond the one draw call in `GameLoop.ts` §14b: untouched.
3. **The refund-on-sale question**: not re-ruled.
4. **The fee's partial elasticity**: untouched.
5. **The promise branch's silent `return`** (§3) and **the fixed-width-slice sweep** (§4c): both
   flagged, neither done.

---

## 7. Verification

Run **alone** on a free machine, on the exact tree that was committed.

```bash
npx tsc --noEmit; echo "tsc exit=$?"
npx jest --listTests | wc -l
npx jest
```
```
tsc exit=0
listTests:      656
Test Suites: 656 passed, 656 total
Tests:       3 skipped, 10983 passed, 10986 total
Time:        167.009 s
```

✅ **Green, and the counts reconcile exactly** against the clean baseline this session's own
re-run established at `598ff158` (**655 suites / 10,962 passed, 10,965 collected** — A24 + B1,
measured alone):

⚠️ **Both columns below are PASSED, not collected.** `CLAUDE.md` warns that mixing the two
conventions invents a 3-test discrepancy that looks like drift, and the commit message for
`4113d326` does exactly that — it labels the baseline `655 / 10,965`, which is the *collected*
figure, while its `+21` arithmetic is on *passed* (10,962 + 21 = 10,983). The arithmetic is
right and the label is wrong; corrected here rather than by amending a verified commit.

| | suites | **passed** | collected | delta (passed) |
|---|---|---|---|---|
| baseline `598ff158` | 655 | **10,962** | 10,965 | — |
| **`4113d326`** | **656** | **10,983** | 10,986 | **+1 suite / +21 tests** |

**+21, itemised:** `dofPlayerRenewalCharge.test.ts` is new with **17**, and
`renewalTransferBudget.test.ts` went **6 → 10** (+4). No other test file gained or lost a test;
`staffHireBudget.ts`'s own 28 are green unchanged, which is the evidence that
`staffHireRefusal`'s delegation to `dofChargeRefusal` is behaviour-identical.

⚠️ **Why "run alone" is stated rather than assumed.** Three app suites on this machine assert
wall clocks and retry budgets and fail when it is loaded — `db/clientRecovery.test.ts`,
`screens/tournamentHubRender.test.tsx`, `db/health/runner.test.ts`, each green in isolation. The
same suite measured **2,825 s** sharing the machine with a phpunit run and **151 s** alone, an
18.7× difference. Full account in `a24-wage-bands-report.md` §9. A red suite here would have
stopped the owner's dev deploy, so it was measured on an idle machine deliberately.

**Not run:** the backend suite. This change is app-only — no backend file is touched — and the
backend was separately confirmed green-to-baseline earlier in the session (3,271 tests, exactly
the documented three failures, all named).

---

## 8. Process

- **Nothing pushed, nothing deployed, nothing merged, no branch switched.** The owner's dev
  deploy is the PM's.
- Staged by **explicit path**, never `git add -A`.
- A24's commit `9f46bf66` was **not amended**; this is a separate commit.
