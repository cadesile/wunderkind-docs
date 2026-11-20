# economy-loose-ends — index

**Scratch, briefs, reports and evidence for the economy work. Outside both repositories on
purpose** (owner's rule: nothing scratch-shaped inside `wunderkind-app` or `wunderkind-backend`).

**Every file carries a `**STATUS:**` line at the top.** This index is the map; the status line on
each file is the truth.

> 🟢 **Tracked and committed** in the `wunderkind-docs` repo as of 2026-11-19 — 190 files.
> (This warning used to say the folder was untracked; that was true when written and is not now.)

---

## 🟢 Start here

| file | what it is |
|---|---|
| **`STATE-OF-PLAY-2026-11-20.md`** | 🔴 **READ THIS FIRST.** Where everything stands at the end of the 2026-11-19 session: what shipped, what is committed but not deployed, what is sitting UNCOMMITTED in the working trees, the one open owner decision, and the six claims made that session which were later refuted. Written so a fresh agent needs nothing from that conversation. |
| **`scotland-experiment-2026-11-19.md`** | The main findings file for the Scotland experiment — the longest single record of that session. Read the state-of-play first for the summary. |
| **`next-work-plan.md`** | **The live queue, the review log, and every decision taken.** ~2,700 lines, newest sections at the bottom before Tranche D. Its **POST-SETTLE** section indexes all parked work. |
| `agent-standing-notes.md` | Conventions every agent brief references. Read with any brief. |
| `dev-test-checklist-2026-11-19.md` | What to test on dev after today's releases. |

---

## ✅ Finished this session (was: Active) — all sessions archived or idle

| task | brief | state |
|---|---|---|
| **A11** — why Scotland holds 12 clubs, not 14 | `a11-scotland-12-vs-14-brief.md` → `a11-scotland-report.md` | ✅ ANSWERED (C): a full NPC-club regeneration replaced every EN/SC row twice without touching `slots`; NOT the worldpack rebuild. Diagnosis only, no code changed. PM: four plan corrections flagged in §7 |
| **A14** — fan base from plot population (app half) | `a14-fanbase-catchment-brief.md` | app-only; backend half not yet written |
| **A23** — retire `league.slots`, derive every division size | `a23-retire-slots.md` → `a23-retire-slots-report.md` | ✅ DONE, both repos, **uncommitted**. EN byte-identical (diff proved); SC 14 → 12 at every tier. ⚠️ **All 25 countries measured, 24 unchanged** — the "23 unchecked" item is closed, not deferred. ⚠️ **Two brief premises were wrong**, both corrected in the report §1 and §3.2 — in particular the app never read `slots`, so the CHECKS division-size row is still live and **A19 needs LESS re-scoping than its own note says** |

---

## 📋 Open — ruled on, nothing built

| task | brief | state |
|---|---|---|
| **part B** — which source is authoritative for a staff wage | `scotland-experiment-2026-11-19.md` | 🔴 **THE BLOCKER.** `anchorAmpStaffWages` overwrites every AMP staff salary from a budget solver. Half-ruled: the snap goes. Unruled: which pot pays — **ask the owner before building** |
| **A24** — staff wages derived like players', not from the band ladder | `a24-staff-wage-bands.md` | 📋 Owner ruling + diagnosis done, nothing built. ⚠️ **Blocked behind part B** — changing rung 4 is a no-op while rung 1 is snapped |
| **A25** — staff ability bands are two flat globals | `a25-staff-ability-bands.md` | 🟡 **PARKED, unruled.** Was written as A24 against a wrong reading of the owner's ruling; the asymmetry is real, the decision is not taken |

---

## ⚠️ Committed but NOT deployed

Both sit on their work branches, unpushed. **Neither is on dev.**

| task | commits | branch |
|---|---|---|
| **A10** — wage scale calibrated on real ability | `68561f93`, `b82540d7` | `development` |
| **A13** — CHECKS report curated | `ea92859a` | `new-game-save` |

---

## ✅ Deployed to dev, 2026-11-19

| task | what it did |
|---|---|
| Pack economy removal | money out of world packs; `WORLD_PACK_VERSION` 11 |
| A2 | wage ladder samples the tier's own band |
| A3 / A4 | resolved payouts in the export; authored `slots` |
| B1 / B2 / B3 | `tvDeal` published resolved; slots correction migration |
| A6 | home games from the division size, not a literal |
| A7 | gate TV reads resolved; `tv_deal` resync; **check 9** |
| A8 | three single-round-robin fallbacks |
| A12 | NPC budgets count real home fixtures |

⚠️ **Two reports contradict each other and the later one wins:** A8 overturned **A6 §6**'s severity
claim — the two money sites never fire, so no save ever mis-booked season-ticket money.

⚠️ **A10's §0.1 corrected the expected-ability formula** that earlier write-ups (including
`next-work-plan.md` before that date) stated wrongly. Trust A10's version.

---

## 📋 Historical — complete, kept as evidence

R2 authoring and closeout (`r2-*`), candidate-C (`candidate-c-*`), the harness squad-size fix
(`app-harness-squad-size-brief.md`, `harness-squad-size-report.md`), and the two device passes
(`device-pass-*.md`).

**Superseded, kept so the record is honest:** `a3-tvdeal-addition.md` and
`a4-premise-correction.md` — both written for an agent that had already finished; the work they
describe landed as B1 and B2 instead.

`REMAINING-WORK.md` is the older, broader backlog. `next-work-plan.md` supersedes it for economy
work; it still holds the go-live prerequisites.

---

## 📁 Evidence directories

| | |
|---|---|
| `dials/` | the gate-run harness — `patch.mjs`, `run.sh`, `runs/`. `cand-c-authorable` is the R2-state baseline. |
| `pre-r2-exports/` | world exports from before R2 |
| `r2-run-2026-11-18/`, `pack-economy-run-2026-11-18/`, `a10-run-2026-11-19/`, `a12-run-2026-11-19/`, `a23-run-2026-11-19/` | verbatim run output kept with its task |
