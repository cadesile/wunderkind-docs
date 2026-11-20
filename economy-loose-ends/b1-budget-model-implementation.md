<!-- STATUS: 📋 BRIEF READY, NOT STARTED. Covers part B AND part C (2026-11-20) -->

# B1 — implement the owner's budget model (parts B and C together)

**The ruling is settled and quoted in full at `part-b-resolved-budget-model.md`. Read that
first.** This brief is how to build it.

| | who pays | covers |
|---|---|---|
| **Step 1 — committed from income** | the main salary pot, off the balance | **existing** staff + **existing** players + facility maintenance |
| **Step 2 — available to spend** | what Step 1 leaves | owner sets the share; rest is operating reserve |
| **Step 3 — the DOF's pot** | the DOF budget | transfer fees, agent commission, signing-on fees, **new player wages, new staff wages** |

"Existing" = **on the books the moment the budget is created**. A new hire is charged
`weeklySalary × weeksRemainingInSeason` against the DOF pot, once, then rolls into Step 1 at the
next budget. Every contract enters through the DOF's pot and graduates to committed income
exactly once.

**Parts B and C are one task.** Part C — the hiring gate testing the DOF pot instead of the 25%
wage share — is meaningless without B, and B leaves the gate testing a pot that no longer
governs. Do them together.

## 🟢 Step 1 already works. Do not rebuild it.

Measured on the owner's device (Moffat Vale, SC t4): `WAGES £2,600,592 — contracts already
signed, players and staff` + `MAINTENANCE £798,002` → `TOTAL COMMITTED £3,398,594 of
£37,384,666 income`. Players, staff and maintenance, committed together, off the top. **That is
the owner's model already on screen.** The work is Step 3 and the gate.

## 🔴🔴 THIS SECTION WAS WRONG. The snap RUNS. Correction below, original kept beneath it.

**Written by the PM session, corrected by B1 the same day, 2026-11-20.**

```ts
// economyConfig.ts:187 — the comment at the site says it outright
// "Absent — today's state — derives."
incomeAnchoredWages: config.incomeAnchoredWages ?? (baseline?.wageModel === 'turnover'),
```

**Absent does not mean false — absent DERIVES.** The live baseline's `wageModel` is `turnover`,
so `incomeAnchoredWages` resolves **TRUE** at every tier. B1 proved it by resolving the very
live fetch this brief cites through the real `resolveEconomy`.

**My error, stated so it is not repeated:** I read `DEFAULT_GAME_CONFIG`'s documented
*"Default false"* plus the key's absence from the payload, and concluded false. That default is
the **pre-sync fallback** and never applies to a payload that synced. I even noted that
`wageModel` IS `turnover` — which was the evidence AGAINST my conclusion, and I wrote it up as a
caveat to it.

> **The lesson, which this workstream has now paid for three times in one day** (`bondDecayFloor`
> 20-vs-50, `wageMultiplierTiers` defaults-vs-live, and this): **never read a config value off a
> repo's default. Resolve it through the resolver the game actually uses.**

### What follows from the correction

1. Removing the snap **is a live behaviour change on a new save.** A flat measurement is the
   suspicious result, not the expected one.
2. **A22's attribution STANDS.** The snap ran and wrote rung 1; nothing else needs hunting.
3. 🔴 **A26 made the same wrong claim and shipped on it.** Its "no salary moves, the change is
   latent" rested on *"the live wage model is legacy"* — it is `turnover`. **A26's scout-ability
   change went out in OTA 488 and is LIVE, not latent.** Someone must check what it did to scout
   salaries on the owner's save.
4. Treat **every** "behind the flag, therefore inert" claim about income anchoring in this repo
   as suspect until re-resolved.

Full write-up: `b1-FINDING-incomeAnchoredWages-is-ON.md`.

---

## ~~ORIGINAL, WRONG — kept so the correction has something to correct~~

`anchorAmpStaffWages` (`SeasonBudgetService.ts:456`, defined `:484`) is the thing the ruling
retires. Its first statement is:

```ts
if (!economy.incomeAnchoredWages) return;
```

`incomeAnchoredWages` is **absent from the live published config** and its documented default is
**false** (`gameConfig.ts:952`). I verified this against a live fetch of
`/api/game-config?country=SC`, saved at `deploy-run-2026-11-20/game-config-sc.LIVE.json`.

> **So the snap does not run today, and deleting it will measure as a no-op on a new save.**

⚠️ Note `economyTierBaseline.wageModel` IS `turnover` — so do **not** reason "the model is
legacy, therefore no anchoring". That reasoning was used once in this workstream and was wrong
on the premise while right on the conclusion. **The gate is the `incomeAnchoredWages` flag, and
nothing else.**

### What that means for the work, concretely

1. **Removing the snap is correct and should still be done** — it is a circularity (a committed
   cost re-derived from the budget computed from it), and it is a landmine that arms itself the
   day `incomeAnchoredWages` is flipped on. That flip is planned: `variantGate`'s FLIPPED column
   is the evidence for it.
2. **Do not expect the owner's staff-wage numbers to change.** Staff `salary` is **persisted in
   the save**. A save created while the flag was on keeps those figures forever; removing the
   snap changes what a FUTURE budget would write, not what is already written.
3. ⚠️ **A22's diagnosis needs re-checking as part of this.** A22 attributed the owner's large
   staff wages to this snap and reproduced a figure "to 3 pence". If the flag is off, the snap
   cannot have run on a save created under this config — so either the flag was on when that
   save was made, or something else writes those salaries. **Establish which before concluding
   the work is done.** The five-rung chain is `staffWages.ts:110-114`; rung 1 is `staff.salary`,
   which is whatever the save already holds.

## The work

### 1. Retire the snap

Delete `anchorAmpStaffWages` and its call at `:456`. A staff salary becomes a **contract**,
agreed at signing, with the same status a player's wage has. **Keep the docblock's reasoning
somewhere** — it argues for snapping rather than mean-reverting at bootstrap, and a future
reader deserves the ruling that overruled it, not silence.

### 2. Charge a new hire's remaining season weeks to the DOF pot

Both hire paths, and they must agree:
- `SignStaffPanel.tsx` (the manual path; `:138` zeroes the salary on a renewal deliberately)
- `DofStaffHiringService` (the automatic path)

A hire costs **two unlike things against one pot**: the one-off sign-on fee, and
`weeklySalary × weeksRemainingInSeason`. `staffHireBudget.ts`'s docblock already states the
"two unlike things" principle — it stays true, what changes is that both now come from the DOF's
budget rather than from allocatable balance and a 25% wage share respectively.

⚠️ **The ruling puts NEW PLAYER wages in the same pot.** The transfer path must charge the same
way. Do not do staff only and leave players inconsistent — that recreates the asymmetry this
whole workstream exists to remove.

### 3. The gate (part C) tests the DOF pot

`staffHireBudget.ts` currently tests a new salary against
`wageReservationPence × STAFF_WAGE_SHARE_BP / weeks`. Under the ruling it tests the DOF pot.

🟢 **Keep `c73bf9a8`'s delta logic** — a renewal is judged on the wage delta, with
`after > currentBill` so same-or-lower terms always pass. That fix is deployed and correct;
only the budget it compares against changes.

⚠️ `STAFF_WAGE_SHARE_BP` (25%) **does not disappear.** It still describes what share of the
committed bill is staff, which the variant gate validates. It stops being the *allowance a hire
is checked against*. Say so where it is defined, or someone will delete it.

### 4. The DOF card's copy

It reads *"transfer fees and agent commission, and on the signing-on fees for new contracts and
renewals"* — no mention of wages. The pot's job is widening, so the copy must say so. **Through
the i18n catalogue** — `CLAUDE.md`'s rule is absolute: never hardcode a user-facing string, use
`npm run i18n:apply-overrides -- --only <key> --write`, and run
`npx tsx scripts/i18n/audit-tokens.ts` afterwards.

## ❓ One thing the owner has NOT been asked

**When a contract ends or a player is sold mid-season, does the unspent remainder return to the
DOF's pot?** Charging remaining-weeks-up-front creates this question; the old model did not have
it. **Raise it, do not answer it.**

## Verification

- App `npx tsc --noEmit`; `npm test` with the count confirmed. **Take the baseline from
  `CLAUDE.md`'s `new-game-save` row** — A28 is moving it today, so do not use a number from this
  brief.
- **The economy gate must not move** unless you can say exactly why.
- **A real save on dev**, which for this change is the only honest test: create a new game, check
  Step 1 shows players + staff + maintenance, hire a staff member mid-season and confirm the
  charge against the DOF pot is `weeklySalary × weeksRemaining` plus the fee, then confirm that
  at the next season budget that person appears in Step 1 instead.
- ⚠️ **Also test with `incomeAnchoredWages` ON**, since that is the configuration the snap
  removal actually affects, and the one the project is heading for.

## Standing constraints

- The owner's rule: **correctness before calibration** — *"I'm not going to tune anything until
  we know the economy implementation is working as expected."* Change no authored figure.
- Branches: app `new-game-save`, backend `development` (most of this is app-side).
- Both repos are ICM — read `.context/CONTEXT.md` first; update the stage `output/` you touch.
- **Do not deploy.** OTA 488 went out today and is not yet confirmed on device.
- ⚠️ **A28 is live in the app repo right now** (`SeasonBudgetService.ts` is NOT in its set, but
  confirm before starting). A27 and A29 are queued behind it too.

## Not established

- Whether unspent remainder returns to the pot (above).
- Whether A22's attribution of the large staff wages survives the `incomeAnchoredWages` finding.
- What the owner's existing save does when its staff wages stop being re-derived — nothing, as
  far as I can tell, since they are already persisted, but confirm rather than assume.
