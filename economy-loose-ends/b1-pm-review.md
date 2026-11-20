<!-- STATUS: 🔴 REVIEWED — DEFECT FOUND. The arithmetic is right; the pot it charges does not hold. Do NOT deploy before §2 is read. -->

# B1 — PM review

**Verdict: DEFECT FOUND. Accept the model, hold the mechanism.**

The ruling is implemented correctly on all three limbs *as arithmetic*, the money units are clean
at every boundary, and no `?? 0` was introduced on a money field. But the thing B1 charges —
`clubStore.transferBudget` — is **not a durable envelope**. It is re-derived from
`balance × transferBudgetPercent` by five separate paths, at least one of which fires every four
weeks by default and one of which fires every tick. **A wage commitment charged for up to 46 weeks
is refunded in full within at most four weeks of game time** (§2). The ruling's limb 3 is therefore
not delivered in live play, and the graduation property the report calls "arithmetically pinned" is
pinned against an assumption about Step 1 that Step 1 does not satisfy (§3).

Reviewed against the code at app `7609125e` (dev head `36087794`), not against the report. Where
report and code disagree I have believed the code and said so.

---

## 1. The three limbs, walked through the code

| limb | ruled | implemented | verdict |
|---|---|---|---|
| existing costs from income | Step 1 commits existing staff + players + maintenance off the top | `setAmpSeasonBudget` → `deriveClubBudget`, untouched by B1 | 🟢 correct, and correctly left alone |
| new hires from the DOF pot | both halves against `transferBudget` | 5 charge sites + `staffHireRefusal` | 🟢 correct in arithmetic, 🔴 see §2 |
| charged remaining season weeks | `weeklySalary × weeksRemainingInSeason`, once | `dofContractCharge` × `weeksRemainingInBudgetSeason` | 🟢 correct |
| then rolling into Step 1 | full-season cost graduates at the next budget | `projectedWagePence` is a **backward-looking ledger sum** | 🔴 see §3 |

**The charge sites are all five the report claims, and I confirmed each one charges what it
tested.** `app/staff/[id].tsx` (three branches), `DofStaffHiringService`, `GameLoop` §14c,
`TransferService.makeAmpBuyerFinanceCallbacks`, and `HireScreen` via `hireLogic.shortfallPence`.
Two of them genuinely did test a budget and charge nothing to it before this change; that catch is
real.

🟢 **The pot is re-read fresh per candidate on both looping paths**, which the docblock on
`StaffHireInput.dofPotPence` demands — `DofStaffHiringService` and `GameLoop` §14c both call
`useClubStore.getState().transferBudget` inside the loop. The `weeksRemaining` figure is hoisted,
correctly: it cannot change inside one weekly pass.

🟢 **`createdWeek` is set at all four derivation sites**, verified in the diff:
`setAmpSeasonBudget` (`currentWeek`), `setNpcSeasonBudgets` and `bootstrapNpcSeasonBudgets` (both
hoisting the global `club.weekNumber`), and `bootstrapAmpSeasonBudget`. It rides on the club blob,
so the "no migration" claim holds.

🟢 **The two season spans are the same length, which the report's design rests on and which I
checked rather than assumed.** `SeasonBudgetService`'s private `weeksPerSeason(tier)` is
`resolveEconomy(config, tier).weeksPerSeason` — the identical value `dofHireCharge` is handed. There
is no second source for the span's *length*. (The 52-week `PROJECTION_SEASON_WEEKS` in the same file
is a different quantity and is not used here.)

---

## 2. 🔴 THE DEFECT — the DOF's pot is re-derived, so the wage commitment does not persist

`dofHireCharge.ts`'s header is explicit about what the design needs:

```
 * ⚠️ **The wage commitment is drawn from the POT but must NEVER be booked to the ledger.** …
 * The pot is a spending ENVELOPE, not cash
```

**`transferBudget` is neither.** It is a percentage of the balance, recomputed from scratch by every
one of these:

| site | trigger | default |
|---|---|---|
| `SeasonTransitionService.ts:5473` `recalculateTransferBudget()` | season boundary | always |
| `GameLoop.ts:4587–4594` → `setBudgetAllocation` | **every tick**, whenever the balance changed | only with AUTO ADJUST on (`budgetAutoAdjust` defaults false) |
| `GameLoop.ts:5851–5863` Chairman auto-balance | **every 4 weeks** | **ON by default** (`chairmanAutoBalanceBudget !== false`) |
| `app/(app)/inbox.tsx:1442` budget-review accept | player accepts the 4-weekly review message | player action |
| `useAutoProgress.ts:58–60` | auto-accepted budget review during auto-progress | with that setting on |

`clubStore.ts:530–551`:

```ts
setBudgetAllocation: (transferPct, facilitiesPct, chairmanPct) => {
  set((state) => {
    …
    transferBudget: Math.floor(allocatableBalancePence(state.club) * (finalTPct / 100)),
```

**No term for what has been spent.** Every draw-down is erased.

**And the Chairman path is worse than neutral — it is driven by the draw-down itself:**

```ts
const transferUtilization  = 1 - transferBudget / nominalTransfer;
const facilitiesUtilization = 1 - facilitiesBudget / nominalFacilities;
if (Math.abs(utilizationGap) > 0.1) { … setBudgetAllocation(newTransferPct, newFacilitiesPct); }
```

Charging the pot *raises* `transferUtilization`, which *widens* the gap, which *triggers* the
rebalance that *restores* the pot. A single mid-season signing of a £5,000/wk player over 40
remaining weeks commits £200,000 against the pot and will, on the next 4-week boundary, very likely
be the reason the pot is reset to a fresh percentage of balance.

### Why this is B1's problem and not a pre-existing one to wave through

The reset is pre-existing, and before B1 it was tolerable: the pot only had to survive long enough
to stop one *one-off fee*, and a fee is also booked to the ledger, so the balance records it even
when the pot forgets. B1 makes the pot carry a **season-long recurring commitment that is
deliberately not booked anywhere else** — the report says so in terms ("draws the pot down and
writes no transaction"). A quantity that exists only in a field that is recomputed every four weeks
does not exist. So:

- **Limb 3 is implemented but not delivered.** "Every contract enters through the DOF's pot and
  graduates exactly once" is true for about four weeks, then the entry is refunded.
- **The gate is intermittent.** `staffHireRefusal` is correct, and it constrains hiring only inside
  the window between resets. Hire, wait for the Chairman's nudge, hire again.
- **It is silent.** `spendTransferBudget` is `Math.max(0, state.transferBudget - amount)`, so an
  over-draw clamps at zero and reports nothing.

**This is not an argument against the ruling, and it is not a reason to undo B1.** It is the one
piece of the model that has no home yet: the ruling needs the DOF's pot to be a *ledger* (opening
allocation, minus commitments, carried) rather than a *view* (percentage of today's balance). That
is a real piece of work and it is the natural next task.

---

## 3. 🔴 The graduation property is not what the code does, and the test that "pins" it restates it

The report, and `clubBudget.ts`'s own docblock, say the pot funds the tail of this period and Step 1
funds every period after, *exactly*:

> At the next budget that person is "already part of the club", so their **FULL**
> `weeklySalary × W` becomes a Step 1 committed cost like everybody else's. The two spans abut.

**Step 1 is backward-looking.** `SeasonBudgetService.ts:161–165`:

```ts
projectedWagePence: ledgerSum(currentWeek, weeks,
  (tx) => tx.amount < 0 && tx.category === 'wages'),
```

and `ledgerSum` is `weekNumber > currentWeek - weeks && weekNumber <= currentWeek`. So Step 1
commits **what the club actually paid over the last `weeks` weeks**, not a forward projection of the
current roster.

Work it through for a hire in week `w` of a period beginning at `c`, span `W`:

- the pot charges `salary × (W − (w − c))` — the weeks from `w` to `c+W`;
- at the next budget, the ledger window is exactly `(c, c+W]`, in which this person was paid for
  those same `W − (w − c)` weeks;
- so Step 1 for the NEXT season commits `salary × (W − (w − c))` for them, while they will actually
  cost `salary × W`.

**The hire's first full season is under-committed by `salary × (w − c)`.** A hire in the last week
of a period graduates about 1/46 of their cost. Nothing is charged twice — the report is right about
that — but things *are* free, and the direction is the permissive one. Full graduation arrives one
season later than stated.

**The test does not catch this because it does not measure Step 1.**
`dofHireCharge.test.ts:160–180`:

```ts
// The next budget commits this person for a whole season, as Step 1 does for everyone.
const nextBudgetCommitment = salary * WEEKS;
…
expect(nextBudgetCommitment).toBe(salary * WEEKS);
```

That is a hand-written constant asserted against itself. It restates the claim; it does not test it.
Nothing in the suite joins `dofContractCharge` to `setAmpSeasonBudget`.

⚠️ This is a *pre-existing* property of Step 1, documented at the site ("the committed squad is
largely the same squad… the figure is what the club really paid"), and it is a reasonable proxy. The
defect is that B1 built an exactness claim on top of it, in a docblock and in `.context`, where a
future reader will take it as measured.

---

## 4. Money units — clean, with one pre-existing idiom now load-bearing

I checked the arithmetic at every boundary the change touches, against `CLAUDE.md`'s rule (API
pence; stores pounds; `club.balance`, `transferBudget`, `facilitiesBudget`, `chairmanBudget`,
`landCostPence` are the pence exceptions).

🟢 **Every quantity in the new path is pence, end to end, with no conversion anywhere.**
`transferBudget` is pence (named exception). `Coach.salary` is `// weekly, in pence`
(`types/coach.ts:23`); `MarketCoach`/`MarketScout.salary` is `salary: number; // weekly, in pence`
(`types/market.ts:98`). `calculateStaffSignOnFee` / `calculateStaffBuyout` return pence. So
`dofContractCharge` is pence × weeks = pence, compared against a pence pot. **No `× 100` and no
`/ 100` appears anywhere in B1's diff** — I grepped the added lines for it specifically, given the
`ExcursionService` history.

⚠️ **One pre-existing open-coded `* 100` has become load-bearing, and it is correct.**
`SignPlayerPanel.tsx:454` passes `wage * 100` as `makeAmpBuyerFinanceCallbacks`'s `weeklyWage`.
`wage` is pounds in that panel (`:226 // pounds/week`, and `:258` uses `poundsToPence(wage)` for the
same quantity), so the *value* is right. But until B1 that parameter was taken and ignored — the
comment said so — and a unit error there would have been invisible. It is now real money against the
pot. `CLAUDE.md` says *"Never open-code `* 100`"* and this panel already imports `poundsToPence`
three lines away. **Not a defect; a one-line tidy-up that should ride with the next change to this
file, because the next reader has no reason to trust it.**

🟢 **No `?? 0` was introduced on a money field.** Three `?? 0`s appear in the added lines and all
three are legitimate absences, not census reads:

| site | what the absence means |
|---|---|
| `dofHireCharge.ts:120` `incumbentWeeklySalaryPence ?? 0` | documented optional parameter: "0 or absent on a hire" |
| `HireScreen.tsx:266` `employedAt?.buyoutPence ?? 0` | no current employer ⇒ no poach compensation |
| `app/staff/[id].tsx` / `SignStaffPanel` `club.weekNumber ?? 1` | a week number, not money |

B1 also **removed** three real `(club.balance ?? 0)` reads from the manual staff path, which is the
right direction.

⚠️ **One inconsistency worth a line, not a finding.** `DofStaffHiringService.ts:68` and `GameLoop`
§14c pass `club.weekNumber` bare while the two UI sites pass `club.weekNumber ?? 1`. `Club.weekNumber`
is typed `number` (`types/club.ts:233`) and the store default is `1`, so this is unreachable today —
but `clubStore.ts:663` writes `weekNumber: data.weekNumber` straight from a sync response, and an
undefined there would make `weeksRemaining` **NaN**, which flows to `totalPence: NaN`, passes
`NaN > pot` as `false`, and reaches `spendTransferBudget(NaN)`. The gate would admit everything and
the pot would become NaN. Cheap to close; pick one convention.

---

## 5. 🔴 Part C was done for staff and not for players — the asymmetry is now the other way round

The report is emphatic that doing one and not the other was the trap to avoid:

> ⚠️ **Doing this for staff and not for players would recreate the asymmetry the whole economy
> workstream exists to remove**, so the two paths charge the same way through the same
> `dofContractCharge`.

**The CHARGE is symmetric. The GATE is not.** Every player path still tests only the up-front cash:

| path | gate | charged |
|---|---|---|
| `SignPlayerPanel.tsx:618` | `cost.upfrontCost > transferBudget` | upfront **+ wage × weeksRemaining** |
| `DofProposalService.ts:150` | `cost.upfrontCost > transferBudget` | upfront **+ wage × weeksRemaining** |
| `DofProposalCard.tsx:263` | `cost.upfrontCost > transferBudget` | upfront **+ wage × weeksRemaining** |
| `SignYouthPanel.tsx:148` | `balance >= cost.upfrontCost` — **the balance, not the pot** | upfront **+ scholarship wage × weeksRemaining** |

`contractCost.ts:82`: `upfrontCost = transferFee + signOnFee + agentCommission`. The commission is
drawn separately by `settleAmpAgentCommission` (`TransferService.ts:453`), so the pot's total draw is
`upfrontCost + wageCommitment` against a gate of `upfrontCost`. The wage half — which for a
£5,000/wk signing 40 weeks out is £200,000 — is **ungated on every player path**, and on the youth
path the pot is not consulted at all.

Because `spendTransferBudget` floors at zero, the over-draw is absorbed silently: the club is not
blocked, its pot is wiped, and the confirm screen showed it a number ("UP FRONT £X · BUDGET £Y")
that was not the number being charged. `SignPlayerPanel` even prints the shortfall as
`cost.upfrontCost - transferBudget`, which is now not the shortfall.

This contradicts `dofHireCharge.ts`'s own standard, which I take as the right one:

> the two must agree, because the gate decides whether the move is allowed and this decides what it
> costs.

**Finishing part C on the player paths is small and well-defined** — point those four gates at
`dofContractCharge(...).totalPence` as the staff paths already do — but it should not be assumed
done.

---

## 6. What happens at a season boundary and mid-season — what the code ACTUALLY does today

The brief asked for real behaviour so the owner answers a question about the game rather than about
an abstraction. Here it is.

**Mid-season, a contract ends or a player is sold: nothing returns to the pot.** There is exactly
one path in the app that increases `transferBudget` other than a full re-derivation —
`grantTransferBudget`, called from `OwnerMandateService.ts:214` for negotiated headroom. No sale,
release, sacking, expiry or death credits it. The remainder the club was charged for is simply not
refunded.

**Also: selling does not raise the pot either, which the gate's own docblock says it does.**
`staffHireBudget.ts:50–52` tells the player a refusal is *"always actionable (sell, or raise the
transfer share)"*. Selling books cash to the balance; the pot only sees it at the next
re-derivation. "Raise the transfer share" does work immediately, because `setBudgetAllocation`
recomputes — but that same call restores every commitment already charged (§2). **So the two
remedies the gate offers are: one that does nothing until a reset, and one that *is* a reset.**

**At the season boundary the question is moot, because the pot is thrown away.**
`SeasonTransitionService.ts:5473` calls `recalculateTransferBudget()` after the new budget is set,
so next season's pot is `allocatableBalancePence(club) × transferBudgetPercent`, computed fresh.
Any unspent remainder is forgotten and any over-draw is forgiven. 🟢 The *ordering* is right —
`setAmpSeasonBudget` runs at `:5061`, well before `:5473`, so the new pot is derived against the new
committed bill — but nothing carries.

**So the owner's open question has a concrete answer today: the remainder neither returns nor
carries. It evaporates, along with the charge, at the next reset — which is usually sooner than the
season boundary.** That reframes the question: it is not "should the remainder return on a sale?"
but "should the DOF's pot be a carried ledger at all, or stay a live percentage of the balance?" The
first question only has meaning once the second is answered yes.

**One more concrete consequence nobody has flagged.** `weeksRemainingInBudgetSeason` measures
elapsed weeks against `weeksPerSeason` (**46** live) on `club.weekNumber`, which advances one per
tick and maps to 7 real days (`gameDate.ts:11`), i.e. ~52 per calendar year. Whenever a budget
period lasts longer in week numbers than 46 — which an annual football season does — the helper
saturates on its documented floor:

```ts
return Math.max(1, Math.min(span, span - elapsed));
```

**A hire in the last several weeks of a season is charged one week's wage.** The floor is right in
principle ("free if you wait long enough is a hole rather than a discount") but it is doing more work
than its docblock expects: it is not a last-week edge case, it is a predictable end-of-season window.
Exactly how wide needs one measurement on a device — the span between consecutive `createdWeek`
values — and that is a good candidate for a CHECKS line (`createdWeek 100 · week 149 · span 46 ·
remaining 1 — SATURATED`).

---

## 7. What is genuinely retired, verified independently

🟢 **`anchorAmpStaffWages` is gone.** `grep` across `src/` and `app/` leaves four references and all
four are intended:

| site | what it is |
|---|---|
| `SeasonBudgetService.ts:483` | the `RETIRED 2026-11-20` docblock keeping the overruled argument |
| `dofHireCharge.test.ts:295,308,309` | two pins asserting the function and its call are absent |

No live caller. The overruled reasoning is kept verbatim as the brief asked, and the record carries
the `incomeAnchoredWages` correction with it — which is the most durable place that correction now
lives (§9).

⚠️ **`anchorNpcStaffWages` and `snapNpcStaffWages` are not retired**, and the report is right to
flag that the circularity argument applies to NPC clubs just as much. Open, correctly not acted on.

⚠️ **`weeklyStaffWageBudgetPence` now has no production caller.** Only
`__tests__/economy/staffHireBudget.test.ts` imports it. Its docblock's rationale is sound but it is
attached to the wrong symbol: what survives in production is `staffWageBudgetPence`, used by
`economyWorkings.ts:192` and by the variant gate. The per-week helper is kept alive by tests alone.
Harmless; worth knowing before someone "proves" it is dead code.

🟢 **The i18n work checks out.** `screen.budget.spends.transferDof` is present in
`locales/en/translations.json`, `locales/en/provenance.json` and
`scripts/i18n/manual-overrides.json`, with `entryCount: 5017` in the catalogue's own `_meta`,
matching the report's 5,016 → 5,017. `transferFull` survives in `manual-overrides.json:2191` and has
no call site left, exactly as described.

🟢 **The economy gate claim stands as reported.** The 13 files B1 touches are not in the gate's
import closure, which I confirmed by reading the gate's imports rather than by re-running it — this
checkout is shared with a session committing app code, so a run today would not be attributable.

---

## 8. What I could not verify, and why

- **Nothing on a device.** The brief for B1 called a real save *"the only honest test"*; it has not
  been run, and §2 is precisely the kind of finding a device would have surfaced in one season.
- **Test counts not re-run.** The report claims 651 suites / 10,865 at `7609125e`. I did not re-run
  the suite: this checkout is shared with the A29 session, which is actively writing
  `ChecksTab.tsx` and `economyDiagnostics.ts`, so a run would measure its work alongside B1's and I
  would be unable to attribute a difference. The report's own reconciliation (+1 suite / +33 tests,
  itemised by file) is internally consistent and A27 independently re-measured the same numbers at
  `6fb687a0`, which is corroboration from a change that could not have moved them.
- **`FinancialProjectionService:241`.** The report flags
  `Math.max(0, SEASON_WEEKS - currentWeek)` with a comment claiming `currentWeek` resets each season
  as a pre-existing defect it did not fix. I did not chase it. It is out of B1's scope and should be
  its own item.

---

## 9. ✅ Two housekeeping facts the PM asked for

**1. `b1-FINDING-incomeAnchoredWages-is-ON.md` does not exist. Confirmed.**

```
$ find /Users/courtneyadesile/Documents/WunderkindFactory -name "b1-FINDING*"
(no output)
```

Not in `docs/economy-loose-ends/`, not in the shared side-session notes folder (which holds only
`a30-scout-wage-impact-NOTE.md`), not anywhere under `WunderkindFactory`. **Three documents point at
it** and all three pointers are dead:

| file | line |
|---|---|
| `HANDOVER-2026-11-20-EOD.md` | 176 — the §10 index row, *"the correction, standalone"* |
| `STATE-OF-PLAY-2026-11-20.md` | 119 — *"Full write-up: …"* |
| `b1-budget-model-implementation.md` | 66 — *"Full write-up: …"* |

`b1-budget-model-report.md:67` additionally claims it was written *"in the shared notes folder"*,
which is also not so.

**Where the correction actually survives, in descending durability:**

1. 🟢 **`wunderkind-app/src/engine/SeasonBudgetService.ts:483`** — in the retired function's
   docblock, in code, with the resolver line quoted. This is the copy that cannot rot unread.
2. 🟢 **`wunderkind-app/.context/stages/07_synthesis/output/game-mechanics.md` §1623–1640** —
   present-tense, correct.
3. **`b1-budget-model-report.md`** §"Read this first" — the fullest prose account, with the
   four-tier resolution output.
4. **`b1-budget-model-implementation.md`** — the corrected header block above the struck original.
5. **App commit `7609125e`'s message.**

**Recommendation: delete the row from the handover's §10 index and repoint the two
"Full write-up" lines at `b1-budget-model-report.md`.** Nothing is lost — there was never a
standalone file to lose.

**⚠️ And a process fact that is more useful than the index fix.** The correct resolution was
**already recorded, dated, device-confirmed and test-pinned four days earlier**:

```
$ git log --oneline -1 --format="%h %ad %s" --date=short \
    -S "An absent key does not resolve false" -- .context/stages/07_synthesis/output/game-mechanics.md
4d75a15e 2026-11-16 Record what the income-truth batch invalidates
```

`game-mechanics.md` §13.4 has carried *"⚠️ CORRECTED 2026-11-16 — this entry was itself the trap it
warned about"*, with the resolver line and *"A device confirms it: the Economy Workings panel reads
'income-anchored wages ON'"*, since 2026-11-16. And the derivation is pinned by
`src/__tests__/types/economyConfigIntake.test.ts:99` —
*"income-anchoring DERIVES from wageModel, with an explicit key still winning"* — since 2026-11-14.

So the three wrong assertions on 2026-11-20 were not made for want of evidence. They were made
**without reading the stage file whose own header says to read it before changing simulation
behaviour**. The governing lesson in the handover is right but understated: it is not only "resolve
it through the resolver" — it is "`game-mechanics.md` already answers most of these, check there
first".

**2. `.context` stage text B1 makes wrong: none found.** I grepped both repos' `.context` for
`STAFF_WAGE_SHARE_BP`, `anchorAmpStaffWages`, `staffHireRefusal` and `allocatablePence`.
`04_interfaces/output/services.md:1109–1115` and `07_synthesis/output/game-mechanics.md:1578–1622`
are both updated and accurate for what B1 built. **I have appended nothing and changed nothing in
`.context`.**

⚠️ **Two things in `.context` are now wrong because of what *this review* found, not because B1
left them stale — they are for the PM to curate, and I have not touched them:**

- `game-mechanics.md:1593–1595` states *"**The pot is a spending envelope, not cash.** Pinned by
  `dofHireCharge.test.ts`."* Per §2 it is neither, and the test pins the arithmetic rather than the
  persistence.
- `game-mechanics.md:1578–1580` states *"The two spans abut, so no week is funded twice and no week
  is funded by nobody."* Per §3 the second half does not hold.

---

## 10. ⭐ What the OWNER is accepting along with this change

This is the section to read if you read only one.

1. **Your ruling is implemented, and for roughly four weeks at a time it is live.** A new hire is
   priced exactly as you ruled — sign-on fee plus the salary's remaining weeks of the season,
   against the director of football's budget, two tests against one pot. Then the Chairman's
   four-weekly budget rebalance (on by default), or a budget-review message you accept, or the
   season boundary, recomputes that pot from your balance and **hands the committed money back**.
   Nothing warns you. **The model is right; the pot it spends is not yet a pot.** Making it one —
   an allocation that is carried and drawn down, rather than a live percentage of the balance — is
   the work this change has turned into the next obvious task.

2. **The hiring gate tightened for staff and did not tighten for players.** Staff hires, renewals
   and poaches are now checked against the fee *and* the season's remaining wages. A player signing,
   a DOF proposal and a youth scholarship are still waved through on the up-front cash alone, while
   being charged the wages too. On a big signing that is a six-figure charge the confirm screen did
   not mention. Youth scholarships don't check the pot at all.

3. **You will be gated in the opening weeks of a new save where you were not before**, deliberately.
   That is what stops 19 coaches and 4 scouts at £16,191/wk. B1 offers to reverse it in one line if
   you would rather the first season stayed open; **my advice is to keep it**, because the opening
   weeks are when the committed bill is set for everything after.

4. **Staff wages on a NEW save will move, because `anchorAmpStaffWages` is gone and it was running.**
   Your existing Moffat Vale save will not change — staff `salary` is persisted and is read first,
   unconditionally. A flat measurement on a new save is the suspicious result, not the expected one.

5. **A hire late in a season is nearly free.** The charge is measured against a 46-week playing
   season on a clock that runs ~52 weeks to the year, so in the last several weeks of each season
   the "remaining weeks" figure bottoms out at one. You could use that deliberately; you should know
   it is there rather than discover it.

6. **Nobody refunds anything.** Sell a player, sack a coach, let a contract expire — the money the
   pot was charged for the rest of their season does not come back. Nor does selling raise the pot
   mid-season, although the hiring refusal tells you to try it. Both follow from point 1 and both
   stop being questions once the pot is a carried ledger.

7. **A new hire's first full season is under-committed in Step 1**, by however much of the season had
   already run when they signed. Step 1 reads last season's actual wage payments, so somebody signed
   in week 40 enters next season's committed bill at about six weeks of their cost, not forty-six.
   They graduate fully a season later. Not a large number per hire; it points the wrong way, and the
   report describes it as exact when it is not.

8. **None of this has been seen running.** No device test, no save advanced across a season boundary.
   Everything above is read off the code.

---

## 11. The two corrections B1 made to its own brief — both upheld

- 🟢 **`incomeAnchoredWages` resolves TRUE.** Verified at `economyConfig.ts:187` and against the
  pin at `economyConfigIntake.test.ts:105`. B1 is right and the brief was wrong. See §9 for the fact
  that this was already on the record.
- 🟢 **The snap ran at BOOTSTRAP only, not at every season boundary.** Verified: the deleted call sat
  in `bootstrapAmpSeasonBudget` and nowhere else; `setAmpSeasonBudget` never called it. Both
  `part-b-resolved-budget-model.md` and the brief say "at each season boundary" and both are wrong.
  **The ruling document should be corrected on this point**, because its 🔴 section 1 argues from the
  false premise — though the conclusion it reaches is unaffected.
