<!-- STATUS --> **STATUS:** ✅ A12 — NPC budgets count real home fixtures. Landed `ea7f8bd2`, DEPLOYED 2026-11-19.

---

# TASK — A12: NPC budgets are built on 23 home games. Correct them.

**App only (`wunderkind-app`), branch `new-game-save`, on top of `e03dd6da`.** No backend work —
**another agent (A10) is in `wunderkind-backend` right now; do not cross into it.**
**Commit; do not push.**

## 🟥 0. THIS IS AN AUTHORISED ECONOMIC CHANGE, NOT A TIDY-UP

**The owner authorised this on 2026-11-19**, having deferred it three times, specifically so it
lands **before** development freezes for multi-season testing.

⚠️ **It reduces every NPC club's income and therefore its squad spend.** That is the intended
effect, not a regression. **Do not soften it, do not compensate for it elsewhere, and do not
re-author any economy figure to offset it.** If NPC clubs end up looking too poor, the lever is
turnover — an authored dial, settled against the gate — **not** the home-game count. Say so in your
report if you see it; do not act on it.

**Scope: England and Scotland only** for all measurement and reporting.

## 1. Code state

`git fetch origin` with explicit refspecs; confirm `new-game-save` is at **`e03dd6da`** and in sync.
Working tree clean, or stop and report. State branch, hash and date at the top of your report.

ICM: read `.context/CONTEXT.md` and the relevant stage's `output/` first.

**Read before implementing:**
1. `.context/stages/07_synthesis/output/game-mechanics.md` **§13.6** — the home-games rule, the
   counting traps, and the two sites recorded there as outstanding. **This task closes them.**
2. `docs/economy-loose-ends/next-work-plan.md` — the **RULING** section, and
   **"PLAN (owner) — freeze development, then multi-season testing"** for why this is urgent now.
3. `docs/economy-loose-ends/a8-roundrobin-report.md` §3a — how the `+1` was settled per site, and
   why `ampLeagueId` rather than "the deepest tier" is the right key.

---

## 2. The defect

`src/engine/SeasonBudgetService.ts:526`:

```ts
const homeGames = Math.max(1, Math.round(weeks / 2));   // = 23
```

Its comment claims this derives from the season *"so a tier whose season is not 46 weeks still gets
a coherent split"* — and that is a real improvement on a bare literal. **But a season length cannot
tell you a division size.** 23 is right only for a 24-club division.

| | true home games | this reads | error |
|---|---|---|---|
| England, 16 clubs | 15 | 23 | **+53%** |
| Scotland, 12 clubs | 11 | 23 | **+109%** |

**It feeds real money**: `npcWeeklyIncomePence` adds `(matchday × homeGames) / weeks`
(`src/economy/npcSolvency.ts:63`), which flows into `deriveClubBudget` and sets every NPC club's
squad wage spend, **every season**. Multi-season testing would measure NPC financial drift against
this wrong input.

---

## 3. The change — COUNT first, derive only as fallback

⚠️ **Do not simply swap 23 for 15.** That replaces one wired number with another and gets Scotland
wrong.

**Apply the ruling's own order:**

1. **COUNTED** — `countHomeGames(fixtures, club.id, season)` from `@/utils/seasonTickets`.
   `SeasonBudgetService` does not import the fixture store today but can reach it exactly as it
   reaches the others (`useFixtureStore.getState()`); it already pulls `useWorldStore`,
   `useLeagueStore`, `useFacilityStore` and `useFanStore` this way.
2. **DERIVED** — `homeGamesForDivisionSize(participants)` when no fixtures exist for that club.
   Both helpers already exist and are pinned against `generateRoundRobin`; **do not restate the
   arithmetic.**

⚠️ **`participants` is the trap, and A8 already solved it.** `worldStore.leagues[].clubIds`
**excludes the player's own club**, and world generation reserves a place **only in the player's own
league**. So `participants = clubIds.length + (league.id === ampLeagueId ? 1 : 0)` — keyed off
`worldStore.ampLeagueId`, which tracks the player through promotion and relegation. A flat `+1`
gives every NPC club in every other division one home game too many. **`bootstrapNpcSeasonBudgets`
already builds a `leagueOfClub` map; extend that loop rather than writing a second one.**

**Counting fixtures also sidesteps an open question**: Scotland's authored size (14) disagrees with
its real divisions (12), and that is unresolved. **A counted 11 is correct either way.** Say in your
report which path each measured club took.

### 3b. `src/engine/GameLoop.ts:1520` — `NPC_HOME_GAMES_PER_SEASON = 23`

Also wired, and also named in §13.6. Its comment scopes it to spreading seasonal money for the
**solvency verdict**: *"no money moves through them."*

**Fix it for consistency with the ruling — but establish the behavioural impact first and report
it.** The verdict drives NPC transfers and rescue behaviour, so "no money moves" is not the same as
"nothing changes". **Measure which verdicts flip at EN and SC tier 8 and tier 1. If more than a
handful flip, stop and report rather than landing it** — that would be a gameplay change needing the
owner, and it can be split out.

---

## 4. Verification

1. `npx tsc --noEmit` clean.
2. `npm test` green **with the suite COUNT confirmed** (`npx jest --listTests | wc -l`). Correct
   `CLAUDE.md`'s branch row and `.context`'s green-master bar if it moves; **trust your own
   measurement over what is written there.**
3. **🔴 THE MEASUREMENT THE OWNER NEEDS — a before/after table of NPC season budgets** at **EN tier
   1, EN tier 8, SC tier 1, SC tier 8**: a representative club's weekly income and resulting
   budget, before and after. **This is the deliverable, not the diff.** The owner has authorised a
   reduction without yet seeing its size.
4. **Tests pinning the counted path and the derived path separately**, plus the `ampLeagueId` `+1`
   decision. A8's §4c took thirteen tests for three sites; this site moves real money.
5. **The economy gate must be byte-identical** — `variantGate.ts` does not read these modules. If it
   moves you have changed something unintended.

## 5. Reporting, scratch files and `.context`

⚠️ **Nothing scratch-shaped inside either repository.** Your report is
`/Users/courtneyadesile/Documents/WunderkindFactory/docs/economy-loose-ends/a12-npc-budget-report.md`.
Paste commands and output **verbatim**.

**`.context` status and review are owned by the project-manager session.** Append **one** pass entry
to `shared/last-sync.md` and update **§13.6**, which lists these two sites as outstanding. Nothing
else. Do not restructure or prune: **flag it in your report.**

## 6. Do not

- Do not push. Do not deploy.
- **Do not work in `wunderkind-backend` — A10 is in that repo right now.**
- **Do not re-author any economy figure to offset the reduction** (§0).
- **Do not restate the home-games arithmetic** — route through the existing helpers.
- **Do not land §3b if more than a handful of solvency verdicts flip** — report instead.
- Do not change `WORLD_PACK_VERSION`.

Before you commit, list `docs/economy-loose-ends/` for any `*-correction.md` or `*-addition.md`
newer than this brief.
