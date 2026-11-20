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

## In flight when the session ended — ⚠️ CHECK THIS BEFORE TOUCHING EITHER REPO

🟡 **A23 (`a23-retire-slots`) was STILL RUNNING at 00:22 on 2026-11-20**, and its tree state was
changing while this was being written. Do not assume anything below is still true — **verify
first**.

What was observable at handover:

- Its report **exists and reads DONE**: `a23-retire-slots-report.md`. It says England's figures
  are byte-identical before and after (proved by diff), Scotland moves 14 → 12 at every tier,
  and — beyond the brief — **it measured all 25 countries, not just EN and SC**, which closes
  an item the brief had left open.
- 🔴 **Its own report says "Nothing committed — left in the working tree of both repos for
  review."** So the work is NOT on a branch.
- At 00:20 the app held **10 modified files**; minutes later the app tree was **clean** with the
  head unmoved at `c73bf9a8`. **The app-side changes are therefore either reverted, stashed, or
  mid-operation.** The session was live throughout, so this is most likely transient — but it
  is unverified and it is the first thing to check.
- The backend held **18 modified files** at handover, including a deleted
  `EconomyAuthoredSizeDriftTest.php` and an added `EconomyDerivedSizeDriftTest.php`.

**First actions tomorrow, in order:**
1. Check whether A23 is still running, and let it finish if so.
2. Read `a23-retire-slots-report.md` and its evidence in `a23-run-2026-11-19/`.
3. `git status` and `git stash list` in BOTH repos before any other git command. Uncommitted
   work is easy to destroy with a careless `checkout` or `stash`.
4. Only then decide whether to commit it. ⚠️ **It has not been reviewed by the PM session.**

🟢 **A22 (`a22-staff-wages`) is idle and complete.** Diagnosis and part A both done and
recorded. It still holds the full context for part B; archive it only once part B is decided or
re-briefed.

## 🔴 The one decision blocking everything else

**Part B: which source is authoritative for a staff wage?**

Two sources exist and the second silently overwrites the first:

- `tierStaffWeeklyWagePence` — the authored relativity, from `wageMultiplierTiers`
  (staff/player 0.40x-0.67x). Applied at ingest.
- `ampStaffWagePence` -> `clubWageScaleMicroPence` — a **budget-exhausting solver**, applied by
  `anchorAmpStaffWages` (`SeasonBudgetService.ts:481`) on the first season budget, which snaps
  over the first.

**Owner said, 2026-11-19: *"staff wage should come from dof budget, like players."*** ⚠️ **That
instruction was NOT fully resolved and no work was started on it.** What was established before
the session ended:

- 🟢 **There is no player equivalent of `anchorAmpStaffWages`.** Players are never re-priced at
  bootstrap — they keep the wage they were ingested with. Staff are the only ones snapped. So
  *"like players"* unambiguously means **the snap must go**.
- ⚠️ **The pot is NOT resolved.** Today staff wages sit in the wage reservation's 25% share and
  players in the 75%; the **DOF budget is one-off spending only** (transfer fees, agent
  commission, sign-on fees), so player WAGES do not come from it either. Two readings, different
  work: (a) price staff from the authored scale as players are, or (b) budget staff salaries
  against the DOF allocation instead of a separate 25% share. **Ask before building.**

**Part C is blocked behind B:** while a budget-exhausting solver writes the wages, the hiring
gate's allowance and the bill it tests are the same number, so hiring sits permanently within a
few percent of its limit and refuses on rounding.

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
