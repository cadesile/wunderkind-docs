<!-- STATUS: ✅ OWNER RULING — PART B RESOLVED INCL. THE CHARGING MODEL. BUILDABLE. NOTHING BUILT (2026-11-20) -->

# Part B resolved — which pot pays for staff

**Owner ruling, 2026-11-20.** This closes the decision that was blocking A24, the gate fix's
part C, and the `anchorAmpStaffWages` question. Quoted so nobody re-litigates it:

> *"Existing staff who are already part of the club at the point that the budget is created
> should come from the main salary pot that is taken essentially out of the entire balance. So
> it's like a guaranteed fee that we have to pay. Staff, players, and facility maintenance costs
> should all come out of that, and then from there we derive the budget for new signings. Now,
> when hiring new staff, the money and the cost for that should come out of the director of
> football's budget, as he is responsible for the transfer budget, new player wages and new
> staff wages."*
>
> *"In terms of the cost of staff and the expectations on salary, they should be using that wage
> band… to calculate the estimated salary based on the staff ability. This should all be the
> same for scouts as well. Scouts and staff should be essentially treated the same in terms of
> salary and signing."*

## The model, stated once

| | who pays | what it covers |
|---|---|---|
| **Step 1 — committed from income** | the main salary pot, off the top of the balance | **existing** staff + **existing** players + facility maintenance. A guaranteed cost, no decision |
| **Step 2 — available to spend** | what Step 1 leaves | the owner sets the share; the rest is operating reserve |
| **Step 3 — the DOF's pot** | the DOF budget | transfer fees, agent commission, signing-on fees, **new player wages, and new staff wages** |

**The test of whether someone is "existing" is the moment the budget is created**, not their
contract type. A coach on the books when the season budget is derived is Step 1; the same coach
hired a week later is Step 3.

## 🟢 Step 1 already works this way — do not rebuild it

From the owner's device (Moffat Vale, SC tier 4, 08 May 2027):

```
WAGES         £2,600,592   contracts already signed - players and staff
MAINTENANCE     £798,002   keeping the ground standing
TOTAL COMMITTED £3,398,594  of £37,384,666 income
```

Players, staff and maintenance, committed together, off the top. **That is the owner's model
already on screen.** The work is in Step 3 and in pricing, not here.

## 🔴 What this overturns

**1. `anchorAmpStaffWages` goes.** `SeasonBudgetService:456` re-solves every AMP staff salary
from a budget-exhausting solver at each season boundary (A22 reproduced it to 3 pence). Under
this ruling a staff salary is a **contract**, agreed at signing from the band — the same status a
player's wage has. A committed cost is not re-derived from the budget that is supposed to be
*computed from it*. The snap is the circularity.

**2. The gate stops testing the wrong pot.** `staffHireBudget.ts` tests a new salary against
`wageReservationPence × STAFF_WAGE_SHARE_BP / weeks` — a share of the wage reservation. Under
this ruling a new hire is **the DOF's pot**, so that is what the gate must test. This is part C,
and it is now unblocked.

⚠️ `STAFF_WAGE_SHARE_BP` (25%) does not disappear — it still describes what share of the
committed bill is staff, which the variant gate validates. But it stops being the **allowance**
a hire is checked against.

**3. A24 reverses.** I had recommended retiring the `Staff ×` column and deriving the ratio from
`STAFF_WAGE_SHARE_BP`. **The owner wants the band table used.** See `a24-staff-wage-bands.md`.

## ✅ How a recurring wage comes out of a one-off pot — RULED, 2026-11-20

**Owner, asked directly, confirmed: the DOF's pot pays the new hire's REMAINING WEEKS OF THIS
SEASON, and the cost then rolls into Step 1 at the next budget.**

So a hire is charged `weeklySalary × weeksRemainingInSeason` against the DOF pot, once. At the
next season budget that person is "already part of the club", so their full-season wage becomes
a Step 1 committed cost like everybody else's. **This is what makes "existing at the moment the
budget is created" the clean, self-consistent test the ruling states** — every contract enters
through the DOF's pot and graduates to committed income exactly once.

⚠️ **It applies to new PLAYER wages too**, which the ruling puts in the same pot — so this is
not a staff-only mechanic and the transfer path must charge the same way.

⚠️ **The sign-on FEE stays a separate, genuinely one-off charge.** `staffHireBudget`'s docblock
is still right that *"a hire costs two unlike things"* — what changes is that both now come from
the DOF's pot rather than the fee from allocatable balance and the salary from a 25% wage share.
**Two tests against one pot**, not one test.

⚠️ **Not yet decided: what happens to the pot mid-season when a contract ENDS or a player is
sold.** Does the unspent remainder return to the DOF? Nobody has asked. Flagging it because the
"charge the remaining weeks" model makes it a real question that the old model did not have.

## ⚠️ Two things the ruling still does not settle

**1. The DOF card's copy.** It currently reads *"transfer fees and agent commission, and on the
signing-on fees for new contracts and renewals"* — no mention of wages, player or staff. If the
pot's job widens, the copy has to say so, through the i18n catalogue.

**2. Which scout ability drives the band.** See A24.
