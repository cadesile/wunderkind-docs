<!-- STATUS: ✅ OWNER RULING — PART B RESOLVED, NOTHING BUILT (2026-11-20) -->

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

## ⚠️ Three things the ruling does not settle

**1. A recurring cost out of a one-off pot.** Step 3 is described on screen as *"one-off
spending, from the balance"*, and the DOF's card says transfer fees. A wage is a weekly promise,
not a one-off. So: does the DOF pot pay the **remainder of this season's** wage at signing and
the cost moves into Step 1 next season? Or does it reserve the full contract? `staffHireBudget`'s
own docblock already names this — *"a hire costs two unlike things and one budget cannot answer
for both"* — and it is the same question for new PLAYER wages, which the ruling puts in the same
pot. **Ask before building.** My reading: the hire is charged the season's remaining weeks from
the DOF pot and rolls into Step 1 at the next budget, because that is what makes "existing at
budget creation" the clean test the ruling states. Unconfirmed.

**2. The DOF card's copy.** It currently reads *"transfer fees and agent commission, and on the
signing-on fees for new contracts and renewals"* — no mention of wages, player or staff. If the
pot's job widens, the copy has to say so, through the i18n catalogue.

**3. Which scout ability drives the band.** See A24.
