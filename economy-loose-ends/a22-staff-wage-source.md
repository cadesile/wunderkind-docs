<!-- STATUS: ✅ DIAGNOSIS DONE + PART A APPLIED (app `c73bf9a8`). Cause: anchorAmpStaffWages (SeasonBudgetService.ts:481), outside the resolveWorldStaffWagePence chain. Gate fixed: renewals judged on the delta, DOF and player share one check. ⚠️ PART B (which source is authoritative for a staff wage) is an OPEN OWNER DECISION; PART C (gate budget and bill are the same number) stays open behind it. Three claims in this brief were REFUTED — read Corrections before reusing it. -->

# A22 — Find what actually sets staff wages

**Start this in the desktop app** (it could not be started over Remote Control).
Suggested setup: fresh context, cwd `/Users/courtneyadesile/Documents/WunderkindFactory`,
shares this checkout (no worktree).

## The task

**Find what actually sets the weekly wage on the founder's club's staff in a new save.** It is
about **4x what the live configuration directs**, and **no known code path produces the
figure**. Everything below is the PM session's analysis — a starting point to be checked, not
established fact.

## The evidence (device, Moffat Vale, Scotland tier 4, OTA 487)

12 coaches + 1 scout = **GBP 62,373/wk**, against 20 players = **GBP 17,000/wk**. Staff are
3.7x the squad. Per ability, against the app's own published player ladder on the same screen:

| ability | staff, actual | player, authored | ratio |
|---|---|---|---|
| 15 | GBP 2,366 | GBP 807 | 2.93 |
| 19 | GBP 4,143 | GBP 1,457 | 2.84 |
| 24 | GBP 7,048 | ~GBP 2,613 | 2.70 |
| 27 | GBP 9,100 | GBP 3,507 | 2.59 |

## The live config (admin, 2026-11-19)

`wageMultiplierTiers`, exclusive bounds, *"first entry where current ability < Max Ability
wins"*:

| Max Ability | Player x | Staff x | staff/player |
|---|---|---|---|
| 15 | 4 | 2 | 0.500 |
| 25 | 6 | 4 | 0.667 |
| 40 | 15 | 8 | 0.533 |
| 60 | 30 | 12 | 0.400 |

`RAND MIN` 2000, `RAND MAX` 2800. **Every row says a staff member should cost LESS than a
player of equal ability.** ⚠️ These are NOT `GameConfig.php`'s defaults — do not read the
defaults and assume they are live; that error was already made once tonight. Wage model in
force is `turnover`, not `legacy`.

## What has been ruled out

All five rungs of `resolveWorldStaffWagePence` (`wunderkind-app/src/utils/staffWages.ts:110-114`):

| rung | at ability 24 | why ruled out |
|---|---|---|
| 1 `staff.salary` | absent | not on a fresh pack payload |
| 2 `anchoredPence` | skipped | `useInitFlow.ts:350` and `:381` pass `undefined` explicitly |
| 3 `staff.weeklySalary` | absent | backend `WorldPackSnapshotBuilder::buildStaffSnapshot()` (`:241-260`) carries no such key, and `StarterPackService.php:157` serialises the founder's staff through that **same** builder |
| 4 `tierStaffWeeklyWagePence` | ~GBP 1,742 | `wunderkind-app/src/economy/packWages.ts:191-212`, = playerWage x 0.667 |
| 5 `legacyStaffWagePence` | **GBP 24** | `staffWages.ts:64`, `coachingAbility * 100` pence |

**Why rung 4 looks not to be firing** — band arithmetic, not curve fitting: the over-factor is
flat at **4.05-4.40x across the whole `<25` band** (abilities 15, 19, 24) and jumps to
**4.87x** on crossing into `<40` (ability 27). If the multiplier were applied, the config's own
20% ratio step (0.667 -> 0.533) would show up in the wage and the over-factor would stay flat.
It does the opposite. **Check this before building on it.**

## Method

**Start from the DATA, not the code.** The staff list screen renders a persisted wage. Trace
which table and column it reads, then find which writer last set that value in a fresh save.
Working backwards from a known-wrong stored number should beat auditing call sites forwards —
the forward audit is what produced the table above, and it did not find the answer.

## Places worth looking (a prompt, not a checklist)

- Other writers of a staff salary: `worldStore.ts:586`, `HireScreen.tsx:76`,
  `npcFinances.ts:64` and `:258`, `NpcRescueService.ts:183`, `coachToWorldStaff`
- `coachStore` / `scoutStore` — the founder's coaches may not be `WorldStaff` at all, which
  would explain why the `WorldStaff` chain cannot produce the number
- the new-game setup flow, `wunderkind-app/src/components/new-game-setup/` — `staffWeekly(d, cat)`
  and `ECONOMY_STAND_INS`
- backend `StaffGenerationService`, `WageModelResolver` (`:215`, `:277`, `:526`)

## Constraints

- **Diagnose before changing anything.** No edits to app or backend source until the cause is
  proved and written up. Then propose the fix; do not apply it.
- Both repos clean. App `new-game-save` @ `3569326b`, backend `development` @ `9918839c`.
  Commit nothing without saying what and why.
- Baselines, so a regression is distinguishable from a pre-existing failure: app `npm test` is
  **647 suites / 10,788 passed** (3 skipped, `--listTests` 647), `npx tsc --noEmit` zero errors.
  `nvm use` first; `npm install` needs `--legacy-peer-deps`. Backend runs through Lando; a FULL
  `phpunit` run OOMs at ~183/3305 in `AdminShellCoverageTest`, so use
  `--filter '/^(?!.*AdminShellCoverage).*$/'` -> 3,233 passing.
- **Scratch, notes and evidence go OUTSIDE both repos**, here in `economy-loose-ends/`.
  **Append** to `scotland-experiment-2026-11-19.md`; do not curate, reorder or rewrite what is
  there. Paste verbatim command output, never a summary of it.
- **Do not take the analysis above on trust.** If a rung is wrongly ruled out, or the band
  arithmetic is wrong, say so plainly and show why. Two conclusions in this workstream were
  wrong tonight and were caught exactly this way — one of them the PM session's, about this
  very issue.

## Done looks like

**The exact file and line that produces GBP 7,048 for an ability-24 coach, demonstrated rather
than argued** — a failing test, a node script, or a traced write that reproduces the number.
Appended to the record with its evidence, followed by a proposed fix that is not applied.

Failing to pin it is an acceptable outcome: say exactly what was eliminated and what the next
concrete step is. **Do not guess at a cause.**

## Also in scope, if cheap

`HireScreen.tsx:76` calls `resolveWorldStaffWagePence(staff)` with **no `economy` argument**, so
staff hired through that screen skip rung 4 and land on rung 5's GBP 24/wk. Looks like a real
but separate bug, and it makes wages far too SMALL, so it is not the cause of what was
measured. Confirm and record; do not fix.

## Not in scope

The design question of staff being drawn from the squad's POTENTIAL band
(`StarterPackService.php:151`) while players are priced on current ability; the residual ~172%
income coverage; SC tier 4's `slots 14` against 12 clubs. All three recorded and owned by the
PM session.

---

# ADDED TO SCOPE — review the staff affordability gate (owner, 2026-11-19)

Device, Moffat Vale, renewing coach Babacar Sonko (ability 25): sign-on fee GBP 15,878,
**balance after GBP 42,461,580**, and the gate reads:

> *"Over the staff wage budget — this club cannot carry another salary."*

**RENEW CONTRACT is disabled while the club holds GBP 42m.**

## The gate is arithmetically CORRECT. That is the problem.

| | |
|---|---|
| staff share of the wage budget (25% of 60% of income) | GBP 2,795,719/season = **GBP 60,776/wk** |
| actual staff bill | **GBP 62,373/wk** |
| over by | GBP 1,596/wk — **1.03x** |

It is an INCOME-share gate, not a balance gate, which is the owner's own "balance the books"
design — so a GBP 42m balance is deliberately irrelevant to it. **It is firing because the
staff bill is inflated ~4x by the defect this task exists to find**, and it only just tips
over: 3%.

## 🔴 Tonight's sponsor-pot fix makes this far worse, and it is already deployed

The income basis the share is taken from (GBP 18,638,128) was itself inflated ~GBP 15m by the
league-sponsor defect fixed in app `3569326b` and shipped to dev as **OTA run 487**. With that
money gone:

| | before | after the sponsor fix |
|---|---|---|
| income basis | GBP 18,638,128 | **GBP 3,638,128** |
| staff share | GBP 60,776/wk | **GBP 11,863/wk** |
| staff bill | GBP 62,373/wk | GBP 62,373/wk |
| **over by** | **1.03x** | **5.3x** |

⚠️ **So on the next new save the gate will refuse every staff renewal, not just this one.** The
two defects were cancelling: an inflated income budget was hiding an inflated staff bill. One
is now fixed and the other is not.

## ⚠️ And fixing the staff wages does NOT clear it either

At a quarter of today's wages — i.e. staff priced as the live multipliers direct — the bill is
GBP 15,593/wk against an GBP 11,863/wk share: still **1.31x over**.

**So there is a third thing wrong, and it should be identified rather than assumed.** Candidates,
untested: the 25% staff share of the wage budget is too small; 13 staff (12 coaches + 1 scout)
is too many for a bottom-tier club and the founder's allocation should scale with tier; or the
income basis is still wrong (the residual ~172% coverage, which is out of scope here but would
move this number).

## What the agent should add to the task

1. **Locate the gate** — the copy string *"Over the staff wage budget"* and the check behind it
   — and state exactly which budget figure it compares against and where that figure is built.
2. **Confirm or refute the arithmetic above from the code**, including that balance plays no
   part by design.
3. **Report the three-way interaction** (staff bill, staff share, income basis) with the numbers,
   so the owner can decide which to move. **Do not tune any of them** — the owner's standing
   ruling is correctness before calibration.
4. ⚠️ **Flag immediately if the gate also blocks anything the player cannot recover from** — e.g.
   if it prevents re-signing staff while also allowing them to expire, a club could be unable to
   field required staff with no route back.

## ⚠️ OWNER CORRECTION — two different pots, and the gate is blocking on the wrong question

**Owner, 2026-11-19:** *"The staff contract is tied to dof budget so there should be ample
budget."*

Correct, and it splits the problem in two:

| | pot | amount |
|---|---|---|
| **sign-on fee** GBP 15,878 | DOF — *"transfer fees and agent commission, and the signing-on fees for new contracts and renewals"* | **GBP 12,110,733** |
| recurring salary | the 25% staff share of the wage budget | GBP 60,776/wk |

**The DOF pot is 762x the fee. It is not what refused the renewal.** The block is the recurring
wage gate, which is a different pot — so the analysis above is about the right check, but the
owner's point stands that nothing on that screen tells the player which budget stopped them.

## 🔴 AND THE LIKELY REAL DEFECT: a RENEWAL is not "another salary"

**Babacar Sonko is already on the staff.** He is in the staff list at **GBP 7,709/wk, 2YR**,
ability 25 — one of the 13 already inside the GBP 62,373/wk bill the gate is testing against.

**Renewing him adds nothing.** The wage bill after renewal is the bill before renewal, give or
take the delta between old and new terms. But the gate reads:

> *"Over the staff wage budget — this club cannot carry another salary."*

🔴 **It is treating a renewal as a new hire** — testing `currentBill + newSalary` against the
share, when the club is already paying `currentBill` *including this man*. Refusing the renewal
does not reduce the bill by a penny; it just loses the coach.

⚠️ **If that is what it does, it is a defect independent of everything else in this brief** —
independent of the 4x wage inflation, of the sponsor-pot interaction, and of the staff share
being too small. It would fire on a correctly-priced squad too, on any club at or near its
staff share, and the player has no way to act on it: the only route back under the share is to
let staff expire.

**This is now the first thing to check**, ahead of the three-way interaction above:

1. Does the gate subtract the incumbent's CURRENT salary before testing a renewal, or not?
2. If not, is the same mistake made for player contract renewals, or only staff?
3. What does the gate compare when the delta is NEGATIVE — a renewal on lower terms should
   always be allowed, and may not be.
