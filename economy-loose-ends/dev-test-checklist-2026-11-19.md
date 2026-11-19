<!-- STATUS --> **STATUS:**  🟢 CURRENT — the dev test checklist.

---

# What to test on dev — the 2026-11-19 releases

Two deploys landed today. Everything below is on dev now.

| cut | app | backend |
|---|---|---|
| 11:40 | `9a8b9663` — v11 pack economy, A2 wage ladder | `87651a54` — resolved payouts, authored slots, slots correction, tvDeal resolved |
| 15:24 | `bf5a9ece` — A6 home games | `c10a0a10` — A7 gate TV reads + `tv_deal` resync + check 9 |

---

## 🔴 1. MUST PASS — these would each be a serious regression

**1.1 No player anywhere on a £0 wage.**
The v11 change took wages out of the world pack and prices them on the device instead. A £0 contract
means the app and backend halves are out of step. Check your own squad **and** open two or three NPC
clubs. ⚠️ **This is the single highest-value check on the list** — a £0 wage breaks severance
(`wage × 4` = free release) and contract talks (division by wage).

**1.2 Scottish tiers 5–8 show a TV deal.**
✅ **Already confirmed at tier 7 — £357,143.** Worth a glance at 5, 6 and 8 too. These four tiers
earned **£0** of TV before today; the pool existed but the per-club figure had never been written.

**1.3 Nothing about TV changed between the two deploys today.**
The 15:24 backend deploy resynced the stored `tv_deal` column. Clients already receive the
*resolved* figure, so **no TV number should have moved.** ⚠️ **If one did, that is a finding** — it
would mean a publication path reads the raw column, contradicting what was established today. Say so
rather than assuming it is fine.

**1.4 A brand-new save starts coherently.**
Squad wages plausible and non-zero, NPC clubs holding balances from the config ladder, and the first
weekly tick deducting a sane wage bill.

---

## 🟡 2. SHOULD HAVE CHANGED — confirm the fixes actually landed

**2.1 Economy Workings → the tier's wage table.**
At tier 8 the rungs should now read roughly **2, 3, 4, 5, 6, 7** — sampled from that tier's own
authored band — rather than the old fixed **10 / 20 / 40 / 60 / 80 / 95**, none of which a tier-8
player can ever have. There should also be a line saying the band is a **potential** range.
⚠️ **The figures will still look too high** — see §4.1. That is expected, not a new bug.

**2.2 FUND YOUR CLUB — the season projection.**
Previously modelled **23** home games. Now derives from the division: **15** in England, **13** in
Scotland on the authored size. Gate income in the projection should drop by roughly **35–43%**.
⚠️ **This is the screen where you commit real money**, so it is the most consequential of the "should
have changed" items — a projection that still assumes 23 is a failed fix.

**2.3 Season-ticket price on the Pricing screen, BEFORE fixtures are drawn.**
The pre-fixture fallback was halving the home-game count, so the quoted price was exactly half.
It should now be roughly **double** what it previously showed. ⚠️ **Once fixtures load the number
should be unchanged** — that path counted real fixtures and was always correct. A change *after*
fixtures load means the fix went too far.

**2.4 League table club counts.**
England should read **16 CLUBS** at every tier. Scotland reads **12**. (Scotland's authored size is
14 — that mismatch is §3.1 below, not a display fault.)

---

## 🟢 3. KNOWN WRONG — do not report these as new, they are already tracked

**3.1 🔴 Scotland pays TV 14 ways to 12 clubs.** Every Scottish club receives **85.7%** of its due —
14.3% short — and **£86,600,000.36 per season across the eight tiers** is credited to nobody. The
authored size says 14, the divisions hold 12. **Whether 14 or 12 is correct is your decision**, and
it is the one open question blocking the rest. Settle it with `php bin/console app:country:check SC`
on the box.

**3.2 NPC club budgets still assume 23 home games.** `SeasonBudgetService` derives home games as half
the season rather than from the division — **53% high in England, 77% high in Scotland**. Deliberately
untouched: correcting it cuts the matchday component of every NPC club's income by about a third,
which is an economic change and yours to decide.

**3.3 Three more fallbacks still halve the home-game count** — NPC season-ticket sales, your own
season-ticket booking, and the financial projection. **A8 is running on these now.**

**3.4 Scotland has never been gate-measured at all.** Every COVERAGE figure and every authored dial
in this project derives from **England alone**. Unblocking it needs one authenticated
`GET /api/game-config?country=SC` saved as `game-config-sc.LIVE.json`.

---

## 4. Expected oddities — correct behaviour that looks wrong

**4.1 The wage table reads about 3× too high.** It prices the **potential** band, not current
ability. Real squads sit well below it and mature toward it with age. Known calibration gap, not a
new defect, and re-calibrating it is an open decision.

**4.2 Scotland's per-club TV is higher than England's at the same tier** — £21.4M against £18.75M at
tier 1. The pools are authored identically and the divisor is the division size, so a smaller league
is richer per club. Working as built; whether it *should* be is part of the 16-vs-20 decision.

---

## 5. If you want one pass rather than a full sweep

Start a **new Scottish save at tier 8** and check, in order:

1. no £0 wages in your squad or two NPC squads *(1.1)*
2. the FUND YOUR CLUB projection, before committing *(2.2)*
3. the season-ticket price on Pricing before fixtures are drawn *(2.3)*
4. the Economy Workings wage table *(2.1)*
5. advance one week and confirm the wage bill is sane *(1.4)*

That exercises both halves of v11, both of today's app fixes, and the one screen where money is
actually committed.
