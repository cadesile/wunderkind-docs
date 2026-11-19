<!-- STATUS --> **STATUS:** ✅ Superseded. The correction never reached the A3/A4 agent; the defect it describes was fixed as B2.

---

# ⚠️ CORRECTION TO `a3-a4-backend-brief.md` §A4 — read before writing the migration

**Issued by the PM session, 2026-11-19, after the owner asked A6 be confirmed before queueing.**
This supersedes the A4 section of your brief where the two disagree.

**Evidence:** `/Users/courtneyadesile/Downloads/wunderkind-world-2026-11-18 (1).json`,
`exportedAt 2026-11-18T22:00:23+00:00` — 200 leagues, 3,191 clubs, 25 countries. This is an export
of the **deployed dev box**, which is why it disagrees with your local 120-row read.

---

## 1. `slots` is authored at a value that DISAGREES with the real club count

The opposite of a derive bug:

| | authored `slots` | real club rows | `sizeOf()` error |
|---|---|---|---|
| EN tiers 1–7 | 18 | 16 | **+2** |
| EN tier 8 | 18 | 15 (+amp = 16) | **+2** |
| SC tiers 1–4 | 18 | 14 | **+4** |
| SC tiers 5–8 | **0 (derive)** | 13–14 | — |

That is the spoof purge: rows came down, `slots` stayed where it was. So `sizeOf()` returns **18**
for divisions that actually play **16** (EN) or **14** (SC). **Check 8's per-club divisor and the
published `clubCount` are both wrong right now**, and have been since the purge.

## 2. The brief's "landing that changes nothing today" is FALSE for EN and SC

My claim that authoring the current derived size is byte-identical holds only for the **161 leagues
where `slots` and the row count already agree**. For EN and SC it is a **behaviour change — and a
correction.**

⚠️ **So the brief's verification step 1 is wrong as written.** I told you a null gate diff was the
proof. **Expect EN and SC to move, and do not treat that as your own bug.** Paste the before/after
diff and let the PM session adjudicate it. A null diff on EN would now be the surprising result.

## 3. `slots = 0` is only 4 leagues of 200

All four are **`SC` tiers 5, 6, 7 and 8.** Nowhere else in the world. So the derive-state fix is
narrow — and those four are exactly the tiers the owner has been device-testing.

## 4. Your `SC slots = 3` is not reproduced here

This export reads SC = **18** at tiers 1–4 and **0** at tiers 5–8. Never 3. You read 120 league
rows; this export has 200 — so you were almost certainly on your local checkout's database, not the
deployed box. **Your read-only query against the deployed box is what settles it. Report both
numbers side by side; do not reconcile them by picking one.**

## 5. Unchanged

- **Do not pick a division size.** 16-vs-20 is the owner's, still open.
- **Do not "fix" SC.** It is authored data inside that same open decision.
- Do not push, do not deploy.

## 6. Context you do not need to act on

There is a related app-side defect (logged as **A6**, confirmed today): the economy gate's
`homeGames` counts export club rows, so it overstates home games by exactly 1 at tiers 1–7 and is
correct at tier 8, because the generator reserves one place for the player's club at tier 8 — true
in 25 of 25 countries with zero exceptions. **It is app-side, it is not yours, and it is fenced off
from this task.** It is mentioned only so you recognise that `clubCount`, `slots` and
`SeasonBudgetService`'s `round(weeks/2)` are three different answers to one question, and that
authoring `slots` is what gives that question an authority.
