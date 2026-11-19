<!-- STATUS --> **STATUS:** ✅ CLOSED — see `a17-shared-projection-report.md`. ⚠️ **§2 and §3's stated mechanism is measurably false** (there was never a break-even cliff, and `weeksRunway` did count seasonal money); the recommended shape was implemented anyway and the report says why. Agent session archived 2026-11-19.

---

# TASK — A17: one projection, shared by the player's chart and every NPC decision

**App only (`wunderkind-app`), branch `new-game-save`.** **Commit; do not push.**

⚠️ **Read `agent-standing-notes.md` with this brief.**

## 🟥 0. THE OWNER'S INSTRUCTION, VERBATIM — it is the whole task

> *"the runway guide… seem to be reporting incorrectly or only reporting when teams were literally
> at a cliff edge where we need to be more accurate with the projections, because if we're using the
> same projection mechanic for displaying estimated balance in, say, 52 weeks as the user sees, the
> same projections need to be used for the NPC clubs as well as the NPC staff on the user's game,
> so that the decision making is mirrored."*

**Decision-making must be mirrored.** What the player is shown and what an NPC decides on are to be
the same arithmetic.

⚠️ **CALIBRATION IS EXPLICITLY NOT THE FIX HERE.** The owner has accepted that levels will be tuned
later — sponsors, TV, top-end salaries — but **ruled that accuracy comes first.** **Do not propose
or make any change to an authored economy figure in this task.**

## 1. Code state

`git fetch origin` with explicit refspecs; confirm `new-game-save` is in sync and the tree is clean,
or stop and report. ⚠️ **Another agent may have just finished here — check `git log` and report
anything you did not expect.** State branch, hash and date at the top of your report.

ICM: read `.context/CONTEXT.md` and the relevant stage's `output/` first — this is simulation
behaviour, so **`07_synthesis/output/game-mechanics.md`** is the stage that owns it.

**Read before implementing:** `next-work-plan.md`'s **OWNER DIRECTION — one projection**, **NOW THE
LIVE DECISION — the tier-1 knife edge**, and **A12 CLOSED** (its §3b sweep is the evidence base).

## 2. The defect — FOUR implementations of one quantity

| | where | shape |
|---|---|---|
| ✅ | **`buildProjection`** (`src/engine/FinancialProjectionService.ts`), **11 callers**, all player-facing or AMP | projects **balance at each horizon**, including season-end lumps (`seasonEndIncome`, `extraSeasonsIncome`, `perSeasonRecurringLump`) |
| 🔴 | `src/economy/npcSolvency.ts` — `weeksRunway` / `solvencyBand`, **the NPC brain's verdict** | `balance ÷ weekly deficit`, `: 52` when there is no deficit |
| 🔴 | `src/utils/npcClubDebugAssessment.ts:77` | hand-rolled copy |
| 🔴 | `src/engine/npcTransferExecutors.ts:177` | a **fourth** inline copy, deciding whether a club sells |

**All three NPC copies share `netOutflow > 0 ? floor(balance / netOutflow) : 52`.**

**Two consequences, both measured:**

1. **The cliff.** Above break-even there is no deficit, so runway returns its 52-week cap and reads
   `healthy` regardless of margin; a pound below, it collapses to single digits. A12's sweep: **zero
   verdict flips at a 55% wage share, all sixteen at 60%.**
2. **The pessimism.** `weeksRunway` ignores season-end lumps entirely, so a club with prize money and
   TV landing in six weeks reads as nearly insolvent **today**. `buildProjection` counts them.

⚠️ `npcClubDebugAssessment`'s own comment records that this duplication **has already produced a
bug** — it *"overstated `weeksRunway` on this screen."* That is the third-order cost of four copies.

## 3. 🔴 THE RECOMMENDED SHAPE — keep the OUTPUT, replace the DERIVATION

**Do not change what the brain consumes.** `npcSolvencyThresholds` is **published backend config**
(weeks: `[warn, crisis, folded]`, default `[4, 12, 26]`), and `solvencyBand` is read in several
places. Changing the *units* would silently re-interpret a published figure — the exact defect class
this workstream exists to end.

**So: runway stays "weeks", and the bands stay as they are. Only how the number is reached changes:**

```
weeksRunway = the horizon at which the projected balance first crosses zero
              (interpolated between horizons; capped at 52 as today)
```

**That single substitution gives all three properties at once** — smooth either side of break-even,
season-end lumps counted, and identical in kind to what the player is shown.

⚠️ **If you conclude a different shape is better, say so in your report and STOP** rather than
implementing it. The published-config constraint above is the thing to argue against, and it is the
owner's call.

## 4. ⚠️ THE IMPLEMENTATION CONSTRAINT — this is the real difficulty

**`buildProjection` reads TEN Zustand stores and filters the whole fixture list, for ONE club.**
`BalanceScreen`'s own comment says so and memoises it accordingly.

🔴 **It cannot be called ~1,100 times per tick.** The NPC solvency pass runs for every club in the
pyramid, and `GameLoop` already builds `leagueOfClub` once precisely to avoid ~50 linear scans.

**So: extract a PURE CORE** — the horizon arithmetic, taking a club's figures as arguments and
reading no stores — and have **the player's chart and all three NPC paths** call it.

- ⚠️ **Do not point NPC code at `buildProjection` as it stands.**
- ⚠️ **Do not leave a fourth copy behind.** The point of the task is that there is one.
- The pure core belongs where the harness can reach it without the store graph, as
  `src/economy/shirtSales.ts` documents for itself (§"depend on nothing but their arguments").

## 5. 🔴 MEASURE IT — this changes NPC behaviour and the owner has not seen by how much

**The deliverable is a measurement, not a diff.**

1. **Which verdicts change, per tier, for EN and SC** — `healthy`/`warn`/`crisis`/`folded` counts
   before and after. ⚠️ **Expect movement in BOTH directions**: the cliff removal should *reduce*
   spurious crisis readings, and the lump accounting should *improve* clubs awaiting season-end
   money. **A result showing only improvement is suspicious — look for what got worse.**
2. **The player's own chart must not move** unless you can explain exactly why. It already uses the
   good path; if extracting the core changes a single number on `BalanceScreen`, that is a
   regression in the extraction, not an improvement.
3. **Re-run A12's sensitivity sweep** (its §3b) against the new measure and report the table. **If
   the cliff is gone, flips should no longer jump from 0 to 16 between 55% and 60%.**

## 6. Verification

1. `npx tsc --noEmit` clean.
2. `npm test` green **with the suite COUNT confirmed** (`npx jest --listTests | wc -l`).
3. **A test pinning the smoothness**: two clubs a pound either side of break-even must produce
   adjacent runway values, not 52 and single digits. **That test is the whole point of the task.**
4. **A test that season-end lumps are counted** — a club insolvent weekly but with prize money
   landing inside the horizon must not read `folded`.
5. **A guard that there is exactly ONE implementation.** A source-reading test, as
   `pricingPaneHomeGames.test.ts` does for home games — naming all four files, so a fifth copy
   cannot appear quietly.
6. **The economy gate must be byte-identical.** `variantGate.ts` does not read these modules.

## 7. Report, do not change

- **`GameLoop.ts:1520`'s `NPC_HOME_GAMES_PER_SEASON = 23`.** It is bundled with this decision by the
  owner and is **still not yours**. ⚠️ **Report what your change does to A12's 16/16 flip figure** —
  if a smooth measure makes correcting it safe, that is the single most useful sentence in your
  report, but **do not correct it.**
- Any authored economy figure (§0).

## 8. Reporting, scratch files and `.context`

⚠️ **Nothing scratch-shaped inside either repository.** Your report is
`/Users/courtneyadesile/Documents/WunderkindFactory/wunderkind-docs/economy-loose-ends/a17-shared-projection-report.md`.
Paste commands and output **verbatim**.

Append **one** pass entry to `.context/shared/last-sync.md` and update **game-mechanics.md** — the
solvency verdict is simulation behaviour and belongs there. **Flag anything you would have
restructured.**

## 9. Do not

- Do not push. Do not deploy.
- **Do not change any authored economy figure, or propose a dial** (§0).
- **Do not change `npcSolvencyThresholds`' units or the band boundaries** (§3).
- **Do not touch `GameLoop.ts:1520`** (§7).
- **Do not leave more than one implementation standing** (§4).
- Do not work in `wunderkind-backend`.

Before you commit, list the docs folder for any `*-correction.md` or `*-addition.md` newer than this
brief.
