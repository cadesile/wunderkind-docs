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
| **`HANDOVER-2026-11-20-EOD.md`** | 🔴🔴 **READ THIS FIRST — the entry point.** End of 2026-11-20, written for a FRESH session. What is live, what is committed but not deployed, the baselines, the four operational traps, every owner ruling made that day, and the five things that need the owner rather than an agent. **Opens with the one correction that must survive: `incomeAnchoredWages` is ON, and three documents said otherwise.** |
| `STATE-OF-PLAY-2026-11-20.md` | ⚠️ **SUPERSEDED** by the file above — it describes the START of 2026-11-20. Kept for history. Where everything stands at the end of the 2026-11-19 session: what shipped, what is committed but not deployed, what is sitting UNCOMMITTED in the working trees, the one open owner decision, and the six claims made that session which were later refuted. Written so a fresh agent needs nothing from that conversation. |
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
| **part B** — which pot pays for staff | **`part-b-resolved-budget-model.md`** | ✅ **RESOLVED 2026-11-20, owner ruling quoted.** Existing staff + players + maintenance committed from income; **new** staff and player wages from the DOF's pot. `anchorAmpStaffWages` goes. Step 1 already works this way — don't rebuild it. ⚠️ 2 sub-questions still open (DOF card copy, scout ability), listed in the file |
| **A24** — staff AND scout salaries priced from the wage band | `a24-staff-wage-bands.md` | 📋 Ruled on twice, diagnosis done, nothing built. **The band table stays** — my "retire the column" recommendation is overruled. 🔴 Scouts are a third, tier-blind pricing system the ruling retires. ⚠️ Needs part B's budget move first |
| **part C** — the hiring gate tests the DOF pot, not the 25% share | `part-b-resolved-budget-model.md` | 🟢 **UNBLOCKED** by part B. The gate's delta fix is already committed at `c73bf9a8` (app, **not deployed**); this changes which budget it tests |
| **A25** — staff ability bands are two flat globals | `a25-staff-ability-bands.md` | 🟡 **PARKED, unruled.** Was written as A24 against a wrong reading of the owner's ruling; the asymmetry is real, the decision is not taken |

---

## ⚠️ Committed but NOT deployed

🔴 **CORRECTED 2026-11-20 — this table was STALE. A10 and A13 are BOTH already on dev.**
Verified with `git merge-base --is-ancestor`: backend `68561f93` is an ancestor of `dev`
(merge `0e35f196`), app `ea92859a` is an ancestor of `dev` (merge `e039d3ea`). Both local `dev`
branches are level with `origin/dev` (0 ahead, 0 behind). The old table said neither was on dev;
that was wrong and would have had somebody re-deploying work that already shipped.

**Actually awaiting deploy:**

| task | commits | branch | state |
|---|---|---|---|
| **gate delta fix** | `c73bf9a8` | `new-game-save` | the only app commit not on `dev` |
| **A23** — retire `slots` | — | both | ✅ PM-reviewed (`a23-pm-review.md`), **uncommitted**, waiting on A26 to clear the trees |
| **A26** — scout ability | — | both | 🏗️ in progress |

**Owner instruction, 2026-11-20: deploy to dev once A26 lands.** Sequence in
`a23-pm-review.md` §4 and below.

### The deploy sequence, when A26 reports

1. A26 commits its own paths; confirm nothing of A23's was swept in (`git show --stat`).
2. Commit A23's paths.
3. Re-run BOTH suites on the combined tree — this is the first run where A23's figures can be
   confirmed, and the first where A26's can. Backend baseline 3,233 (+5 from A23); app baseline
   647 / 10,788 at `3569326b`, 10,802 with A22 + A23.
4. `npx tsc --noEmit` clean; economy gate measured and any movement explained.
5. Merge `development` → `dev` (backend) and `new-game-save` → `dev` (app). Push both.
6. Report the OTA build number and short SHA
   (`gh run list --workflow eas-update-dev.yml -L 3 --json number,headSha`) so the device can be
   checked against it.

⚠️ **What this deploy changes on the owner's dev box, to expect rather than discover:**

- **Scotland moves 14 → 12** at every tier. TV, sponsor and prize per-club figures all rise
  (SC t4 tvDeal £3,571,428.57 → £4,166,666.66). England does not move at all.
- **`WORLD_PACK_VERSION` 11 → 12**, so every cached pack is invalidated and re-fetched.
- **Staff renewals become possible again** — `c73bf9a8` judges a renewal on the wage delta.
- The CHECKS line to confirm A23 on device: `SC t4  divisor 12 · clubs 12 · home games 11`.

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
