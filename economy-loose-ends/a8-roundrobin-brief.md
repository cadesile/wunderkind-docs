<!-- STATUS --> **STATUS:** ✅ A8 — three single-round-robin fallbacks. Landed `e03dd6da`, DEPLOYED 2026-11-19.

---

# TASK — A8: three fallbacks assume a single round-robin, and two book real money

**App only (`wunderkind-app`), branch `new-game-save`, on top of `b29cf149`.** No backend work.
**Commit; do not push.**

## 🟥 0. SCOPE — ENGLAND AND SCOTLAND ONLY (owner, 2026-11-19)

> *"don't worry about any leagues and countries other than England and Scotland."*

Deployed sizes: **EN 16** clubs (15 home games), **SC 12** clubs (11 home games — authored as 14,
which is a live drift the owner is deciding; see §5). Do not measure or report other countries.

## 1. Code state

`git fetch origin` with explicit refspecs; confirm `new-game-save` is at **`b29cf149`** and **in sync
with origin**. Working tree must be clean; if not, stop and report. State branch, hash and date at
the top of your report.

Both repos use ICM: read `.context/CONTEXT.md` and the relevant stage's `output/` first.

**Read before implementing, in this order:**
1. `wunderkind-app/.context/stages/.../game-mechanics.md` **§13.6** — A6 recorded this task's root
   cause there, with the rule and the counting traps. **Do not re-derive it.**
2. `docs/economy-loose-ends/a6-homegames-report.md` **§6** — A6 named these three sites and why it
   left them.
3. `src/__tests__/components/pricingPaneHomeGames.test.ts` — its header documents the defect, the
   `+1` reasoning, and **names your three sites explicitly as deliberately not asserted.**
4. `docs/economy-loose-ends/next-work-plan.md`'s **RULING** and **A8** sections.

⚠️ **The groundwork is already built — use it, do not rebuild it.** A6 added
`homeGamesForDivisionSize(divisionSize)` and `FALLBACK_DIVISION_SIZE` to `src/utils/seasonTickets.ts`
and pinned the arithmetic against `generateRoundRobin` itself in
`src/__tests__/utils/seasonTickets.test.ts`. **Route all three sites through that helper.** Writing
the maths again anywhere is the one thing this task must not produce.

---

## 2. The defect

Three sites compute their fallback as `Math.floor((numClubs - 1) / 2)`, and their comments state the
assumption outright — *"half the rounds at home"*, *"round-robin gives (n-1) games total, half at
home"*. **That is a single round-robin.** `generateRoundRobin` produces a **double** round-robin, so
each club meets every other once at home: **`size - 1`**, not half.

| site | what it books | fallback gives | truth (EN / SC) |
|---|---|---|---|
| `src/engine/SeasonTransitionService.ts:1656` | **NPC season-ticket sales** | `(size-1)/2` | 15 / 11 |
| `src/engine/SeasonTransitionService.ts:2499` | **the player's own season-ticket booking** | `(size-1)/2` | 15 / 11 |
| `src/engine/FinancialProjectionService.ts:222` | the player's financial projection | `(size-1)/2` | 15 / 11 |

**This is the same defect A6 fixed in `PricingPane.tsx`.** `calculateSeasonTicketPrice` is linear in
home games, so the two season-ticket sites book **roughly half** the money they should whenever the
fallback fires.

⚠️ **Note the two sites use different size sources** — `:1656` reads `leagueSizeById`, `:2499` reads
`league?.clubs?.length`. Establish for **each** whether its source includes the player's club before
you apply a `+1`; A6's guard test documents that `league.clubs` excludes it at all three writing
sites, but **do not assume `leagueSizeById` behaves the same.** Getting the `+1` wrong is as bad as
the halving.

---

## 3. 🔴 FIRST TASK: MEASURE HOW OFTEN THE FALLBACK ACTUALLY FIRES

**Do this before changing any arithmetic, and report it.**

All three sit behind `countHomeGames(fixtures, …)` as `||` fallbacks, so they only fire when fixtures
are not loaded. `SeasonTransitionService:2496`'s own comment says fixtures *are* loaded at transition
but *"at world init they may not be yet"*.

**So the blast radius is unknown and it changes what this task is worth:**
- If it fires only at world init, this mis-books one season's opening figures.
- If it fires at transition, it mis-books **every** season, for every NPC club.

Find out which, and say how you established it. **If it turns out the fallback never fires in
practice, say so plainly — that is a perfectly good result and it would make this a correctness
tidy-up rather than a money fix.** Do not inflate the finding to justify the task.

⚠️ **Do not remove the fallback.** It exists for a real timing gap. Fix the arithmetic and keep it.

---

## 4. The change

1. Route all three through `homeGamesForDivisionSize`, each with the correct size source and `+1`
   decision established per §2.
2. **Extend `pricingPaneHomeGames.test.ts`'s guard to cover all four files**, as its own header
   instructs — *"a source-reading test protects exactly the file it names."* Leaving your three
   uncovered reproduces the exact gap that let them survive A6.
3. Remove or correct the three misleading comments. A comment asserting a single round-robin is how
   this survived; leaving them is leaving the trap armed.

---

## 5. Report, do not change

- **`src/engine/SeasonBudgetService.ts:526`** (`round(weeks / 2)` → 23) and
  **`src/engine/GameLoop.ts:1520`** (`NPC_HOME_GAMES_PER_SEASON = 23`). Both are the owner's — the
  first moves real NPC budgets. **A6 already measured them; cite that rather than re-measuring.**
- ⚠️ **`FALLBACK_DIVISION_SIZE = 17`** is itself a wired guess (16 rows + the player). England's real
  division is **16** and Scotland's is **12**, so the constant is wrong for both. **Report the
  consequence; do not re-author it.** The real fix is **A9** — publishing the authored size on
  `economyTierBaseline.tiers[]` — which is queued and not yours.
- **Scotland's authored 14 against 12 real clubs** is an open owner decision. Your change must be
  correct under either answer; say so.

## 6. Verification

1. `npx tsc --noEmit` clean.
2. `npm test` green **with the suite COUNT confirmed** (`npx jest --listTests | wc -l`). Correct
   `CLAUDE.md`'s branch row and `.context`'s green-master bar if it moves, and **trust your own
   measurement over what is written there** — that row has gone stale repeatedly.
3. **A test per site** asserting `size - 1`, not a single shared one. Three sites failed the same way
   because nothing pinned them individually.
4. **The economy gate must NOT move.** `variantGate.ts` does not read these modules, so COVERAGE must
   be byte-identical. If it moves, you changed something you did not intend.

## 7. Reporting, scratch files and `.context`

⚠️ **Nothing scratch-shaped inside either repository.** Your report is
`/Users/courtneyadesile/Documents/WunderkindFactory/docs/economy-loose-ends/a8-roundrobin-report.md`.
Throwaway work goes in your own scratchpad directory. Paste commands and output **verbatim**.

**`.context` status and review are owned by the project-manager session.** Append **one** pass entry
to `shared/last-sync.md` and correct stage text your change makes wrong — game-mechanics §13.6 lists
these three as outstanding and should record them as closed. Nothing else. Do not restructure, prune
or delete a superseded section: **flag it in your report.**

## 8. Do not

- Do not push. Do not deploy.
- **Do not change `SeasonBudgetService` or `GameLoop`** (§5).
- **Do not re-author `FALLBACK_DIVISION_SIZE`** or any authored economy figure.
- **Do not remove a fallback** (§3).
- **Do not restate the home-games arithmetic** anywhere — route through the helper.
- Do not work in `wunderkind-backend`.

Before you commit, list `docs/economy-loose-ends/` for any `*-correction.md` or `*-addition.md` newer
than this brief. Briefs in this project have been superseded mid-task more than once.
