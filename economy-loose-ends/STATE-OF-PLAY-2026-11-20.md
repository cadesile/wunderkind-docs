<!-- STATUS: handover, written 2026-11-20 00:20. Read this first. -->

# State of play — written at the end of the 2026-11-19 session

**Purpose: tomorrow should need nothing from that conversation.** Everything below is either
committed or named with the file that holds it.

## Shipped to dev

| | |
|---|---|
| **App OTA run 487**, `e039d3ea` on `dev` | The league-sponsor per-club divide (`3569326b`). The ONLY behaviour change deployed on 2026-11-19. |
| Backend `dev` @ `0e35f196` | Deployed earlier that day; nothing new since. |

## Committed but NOT deployed

**App `new-game-save` @ `c73bf9a8`** — one commit ahead of `dev`. A staff renewal is judged on
the wage delta, not the absolute bill, and the player / DOF-hiring / DOF-renewal paths all share
one gate. Verified here: clean commit, full suite 647 / 10,802 green.

## Where the two sessions ended — VERIFIED 2026-11-20 00:30, both idle

🟢 **A23 (`a23-retire-slots`) — DONE, and its work is INTACT but UNCOMMITTED.**

Verified directly, not taken from its report:

| | |
|---|---|
| app `new-game-save` | head `c73bf9a8` (A22's), **10 modified files** uncommitted |
| backend `development` | head `9918839c`, **18 modified files** uncommitted, incl. a deleted `EconomyAuthoredSizeDriftTest.php` and an added `EconomyDerivedSizeDriftTest.php` |
| stashes | two, both OLD and unrelated (`master`, `competition`) — **not A23's** |

⚠️ **An earlier draft of this file said the app tree had gone clean and the work might be
reverted or stashed. That was wrong** — it was a transient moment while the session was
mid-operation. Re-measured with both sessions idle, all 28 files are present.

What it did: England's figures byte-identical before and after (proved by diff), Scotland
14 → 12 at every tier, and **it measured all 25 countries rather than the two the brief
scoped**, which closes an item the brief left open. Evidence in `a23-run-2026-11-19/`.
It also **corrected its own report**: the app test delta is **+2**, not the +14 first written —
the other +12 are A22's commit, which it re-ran the combined tree to confirm (647 / 10,802,
tsc clean).

🔴 **Nothing of A23's is committed, by its own choice, for review.** It has NOT been reviewed by
the PM session.

**First actions tomorrow:**
1. `git status` in both repos before any other git command — 28 uncommitted files are easy to
   destroy with a careless `checkout`, `stash` or branch switch.
2. Read `a23-retire-slots-report.md` and the evidence in `a23-run-2026-11-19/`.
3. Review, then decide whether to commit. It touches TV money in every country, so England
   coming out byte-identical is the claim to check first.

🟢 **A22 (`a22-staff-wages`) — idle and complete.** Diagnosis and part A both done, part A
committed at `c73bf9a8` and verified. It still holds the full context for part B; archive it
only once part B is decided or re-briefed.

## 🔴 Two owner rulings recorded late, NEITHER started

**1. *"staff wage should come from dof budget, like players"*** (2026-11-19) — ✅ **RESOLVED
2026-11-20** by the owner's full budget ruling. See the part B section below and
`part-b-resolved-budget-model.md`. The snap goes; **new** staff come from the DOF pot while
**existing** staff are committed from income alongside players and maintenance.

**2. *"I would like staff bands to be derived like players"*** (2026-11-20) — **DISAMBIGUATED
by the owner the same day: the WAGE MULTIPLIER TIERS, not ability bands.** Recorded in
`a24-staff-wage-bands.md`, with the diagnosis done and nothing built.

The finding: under the `turnover` model the band ladder is **dead for players and live for
staff**. `legacyMultiplier()` is never called on the app's player path, and the backend prices
turnover staff from a budget share — so `tierStaffWeeklyWagePence` (`packWages.ts:205-209`) is
the **only consumer of `wageMultiplierTiers` left on the turnover path in either repo**. The
live staff/player ratio also falls non-monotonically across the bands (0.500 / 0.667 / 0.533 /
0.400), which by arithmetic gives a coach a ~20% pay CUT for crossing ability 25 — unverified
on device, and probably masked today by part B's snap.

✅ **Ruled on again the same day: the band table STAYS and becomes the pricing rule for staff
and scouts.** My recommendation to retire the `Staff ×` column is **overruled** — do not
re-propose it. 🔴 **Scouts are a third pricing system** (`fallbackScoutWeeklyWagePence`, a flat
tier-blind £2,500-£7,000 line on `experience`, 4 sites + the backend's `ScoutWageCalculator`);
the ruling retires it and makes scouts tier-aware for the first time.

⚠️ **A24 still cannot be built before part B's budget move**: `anchorAmpStaffWages` overwrites
rung 1, so changing rung 4 would measure as a no-op on the AMP staff screen.

⚠️ My first reading of this ruling — ABILITY bands — **was wrong**. That brief is demoted to
`a25-staff-ability-bands.md` and parked; the asymmetry it describes (staff ability is two flat
globals against a per-country per-tier table for players) is real but unruled.

## ✅ Part B is RESOLVED — the owner ruled on the budget model

**Full ruling, quoted: `part-b-resolved-budget-model.md`. Read it before touching staff money.**

| | who pays | covers |
|---|---|---|
| **Step 1 — committed from income** | the main salary pot, off the balance | **existing** staff + **existing** players + facility maintenance |
| **Step 2 — available to spend** | what Step 1 leaves | owner sets the share; rest is operating reserve |
| **Step 3 — the DOF's pot** | the DOF budget | transfer fees, agent commission, signing-on fees, **new player wages, new staff wages** |

The test for "existing" is **the moment the budget is created**, not the contract type.

🟢 **Step 1 already works this way on device** — `WAGES … players and staff` + `MAINTENANCE`
→ `TOTAL COMMITTED`. Do not rebuild it. The work is Step 3 and pricing.

**What it overturns:**

1. 🔴 **`anchorAmpStaffWages` goes.** A staff salary is a CONTRACT agreed from the band, not a
   figure re-solved each season from the budget that is supposed to be computed from it. The
   snap is a circularity.
2. 🔴 **The hiring gate tests the wrong pot.** `staffHireBudget.ts` checks a new salary against
   `wageReservationPence × STAFF_WAGE_SHARE_BP / weeks`. Under the ruling a hire is the DOF's
   pot. **Part C is unblocked.** `STAFF_WAGE_SHARE_BP` survives as a description of the
   committed split, not as the allowance.
3. 🔴 **A24 reverses.** I recommended retiring the `Staff ×` column; the owner keeps it and
   makes it the pricing rule for staff **and scouts**.

⚠️ **Three things the ruling does NOT settle — ask before building:**

✅ **One of the three is now ruled too (2026-11-20): the DOF pot pays a new hire's REMAINING
WEEKS OF THIS SEASON, then the cost rolls into Step 1 at the next budget.** Applies to new
player wages as well. The sign-on fee stays a separate one-off charge — **two tests against one
pot.** ⚠️ New question nobody has asked: does unspent remainder return to the pot when a
contract ends or a player is sold mid-season?

⚠️ **Still open:**

- **The DOF card's copy** says transfer fees only — needs widening, via the i18n catalogue.
- **Which scout number drives the band** — see A24. My reading is `experience` as-is.

## Open, recorded, nothing started

| | where |
|---|---|
| Residual income coverage ~172% at SC t4 even after the sponsor fix — backend authoring | `scotland-experiment-2026-11-19.md` |
| FUND YOUR CLUB models every starter squad at a flat GBP 12,000/wk; `starterSquadWagesPence` is never published | same |
| Founder's staff drawn from the squad's POTENTIAL band while players are priced on current ability | same |
| A19 — re-scope after A23 lands; retiring `slots` removes the case it was written for | `a19-checks-false-pass-brief.md` |
| Backend Starter Pack Check screen needs ONE re-read to close the tier-8 ability question | `scotland-experiment-2026-11-19.md` |

## ⚠️ Claims from this session that were later REFUTED — do not reuse

1. *"It is dynamic when `slots` is blank — SC tiers 1-3 prove it."* **False.** 0 of 200 leagues
   have `slots = 0`; the app is only sent `slots` for the AMP's own league.
2. *"SC t4's 14 was typed when that tier held 14 clubs."* **False.** It is 14 at every Scottish
   tier against 12 rows. Never correct, not stale.
3. *The staff band-arithmetic argument* (a flat over-factor would prove the multiplier applied).
   **Invalid reasoning**, right conclusion by the wrong route.
4. *`HireScreen.tsx:76` is a bug.* **No.** `worldStore.ts:585` writes `s.salary` at ingest, so
   rung 1 always wins there.
5. *"After the sponsor fix the staff bill stays put, so the gate is 5.3x over."* **Only for the
   EXISTING save.** The bill is a function of income; a new save re-anchors and lands back on
   the share.
6. *The sponsor pot was a mis-ATTRIBUTION.* **No — a mis-SIZING.** Every club is paid that
   amount deliberately; the amount itself was division-scale.

**Six corrections in one session.** The pattern worth carrying: every one was caught by
measuring against live data or source rather than against defaults or intuition.
