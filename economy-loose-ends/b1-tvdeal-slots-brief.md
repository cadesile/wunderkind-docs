<!-- STATUS --> **STATUS:** ✅ B1/B2/B3 — `tvDeal` published resolved, docblock fix, slots correction migration. Executed by the PM session, DEPLOYED 2026-11-19.

---

# TASK — B1/B2/B3: finish taking the league money out of side-effect territory

**Backend only (`wunderkind-backend`), branch `development`, on top of `603ea577`.** Three pieces
batched because all three touch league-money publication and the owner is doing **one**
push–deploy–bump–rewarm cycle. **Commit; do not push.**

⚠️ **PROCESS, AND IT HAS BIT US TWICE TODAY.** The PM session cannot message this session — it is a
CLI session with no channel — so corrections arrive as **files**, relayed by hand, and the last
agent committed before two of them arrived. **Before you implement, and again immediately before
you commit, list `docs/economy-loose-ends/` and read anything named `*-correction.md`,
`*-addition.md` or dated after this brief.** A brief is a snapshot; the directory is current.

## 0. Code state

`git fetch origin` with explicit refspecs; confirm `development` is at **`603ea577`** ("Stop four
numbers being side effects") and **3 commits ahead of `origin/development`** — expected, the owner
is holding the push. Working tree must be clean; if not, stop and report. State branch, hash and
date at the top of your report.

Both repos use ICM: read `.context/CONTEXT.md` and the relevant stage's `output/` before raw source.

**Read first:** `docs/economy-loose-ends/a3-tvdeal-addition.md` (B1's full evidence — every link
already traced read-only, do not re-derive it), `next-work-plan.md`'s review-log entry for
`603ea577`, and `a3-a4-report.md` for what the previous session established.

---

## B1 — `tvDeal` is published as its raw column, and the running game pays £0

**This is the only piece here with a live gameplay consequence. Do it first.**

Full chain in `a3-tvdeal-addition.md`. In short: `syncTvDeal()` is called only from
`LeagueAdminController` (`:95`, `:201`); `LeagueService:82` deliberately skips it, and nothing
calls it later — so a generated league with a `tvPoolPence` and no authored `tvDeal` keeps
`tvDeal = NULL` forever. That is **Scottish tiers 5–8** (pools 3.0bn / 1.0bn / 500m / 120m, all
four `tvDeal` NULL). Both live paths publish the raw column, and the app does
`Math.max(0, league.tvDealPence)` — **so those four tiers earn £0 of TV in a running save.**

**The fix:** resolve at publication, exactly as `603ea577` resolved the payouts, using the existing
`LeagueSizeResolver::derivedTvDealPence()` — it returns null when there is no pool, so it is inert
for all 8 EN tiers and the 184 unpooled leagues.

- `LeagueImportExportService` — `tvDeal` becomes `derivedTvDealPence($l) ?? $l->getTvDeal()`; the
  raw column exports as **`tvDealOverride`**, matching the two keys `603ea577` added. Import treats
  `tvDealOverride` the way it now treats the other two, with the same legacy fallback.
- ⚠️ **`InitializeController` (`:243`) AND `SyncService::buildLeagueSnapshot()` as well** — these
  are where the *game* reads it. **The export alone fixes the gate and leaves the game broken.**

⚠️ **DO NOT add a write to the generation path.** `tvDeal` is also a cache that `syncTvDeal()`
maintains, and `LeagueService:82`'s skip is a deliberate, documented decision (it runs before any
NPC club exists, so size cannot be derived). Resolving at read is additive and reversible; calling
`syncTvDeal()` after generation reverses someone's decision and has its own blast radius. **If you
believe that is the better fix, say so in your report instead of doing it.**

**Pin it:** a test that a pooled league with a NULL column publishes the derived share, and that an
unpooled league with an authored deal publishes that deal unchanged.

---

## B2 — a committed docblock states something false about the deployed box

`migrations/Version20261119090000.php` reads: *"on the deployed box — where `slots` is 0 — it
authors the counts that box is already using."* **The deployed box has EN `slots = 18`, not 0**;
only SC tiers 5–8 are 0 (4 of 200 leagues). The previous session never received the correction and
reasoned from a premise that was the PM session's and was wrong.

⚠️ **The code is correct and must not change.** Its `only where slots = 0` guard makes the
behaviour right regardless. **This is a comment fix.** Correct the claim, state what the deployed
box actually holds, and leave `up()`/`down()` untouched.

---

## B3 — author the 12 leagues whose `slots` disagrees with their real size

**OWNER DECISION, 2026-11-19 — this is settled and you are authorised to implement it.**

The rule the owner settled on: **`slots` equals the true division size.** 18 was never anybody's
decision; it is residue from the spoof purge, which took rows down and left `slots` where it was.
True size is `club rows + 1 where the tier is the country's bottom tier` (the generator reserves
one place for the player's club — verified in **25 of 25 countries with zero exceptions**).

**This does NOT settle 16-vs-20.** That is a separate, still-open question about *what to
generate*: choose 20 later, regenerate to 20 rows, author 20, and this rule still holds.

**Measured on the deployed export (`wunderkind-world-2026-11-18 (1).json`), the world partitions
exactly — 184 + 12 + 4 = 200:**

| | `slots` | target | rows | per-club change |
|---|---|---|---|---|
| EN tiers 1–7 | 18 | **16** | 16 | +12.5% |
| EN tier 8 | 18 | **16** | 15 (+1 amp) | +12.5% |
| SC tiers 1–4 | 18 | **14** | 14 | +28.6% |
| 184 others | — | already correct | — | **leave alone** |
| SC tiers 5–8 | 0 | — | — | **`603ea577` owns these — do not touch** |

Compute the target in SQL, as `Version20261119090000` does, so each box authors its own truth —
the clone and the deployed box have different row counts and a hardcoded table would re-price one
of them. Same migration shape: stash what you replace, `down()` restores from the stash.

### ⚠️ B3 IS A BEHAVIOUR CHANGE AND THE PREVIOUS BRIEF WRONGLY PROMISED A NULL DIFF

`sizeOf()` feeds **check 8's per-club arithmetic** (`EconomyWageTableCommand:947` —
`taperSumPpm($clubs)`, `intdiv($positionTotal, $clubs)`, `intdiv($prize, $clubs)`) and the
**published `clubCount`**. Shrinking the divisor **raises per-club payout figures by 12.5% on EN and
28.6% on SC tiers 1–4.**

- **Expect the gate output to move. A null diff on EN would be the surprising result.** Paste
  before and after in full.
- 🔴 **That rise may breach check 8's `PAYOUT_SHARE_MIN/MAX_PCT` or `PAYOUT_SHARE_SPREAD`.** If the
  gate fails, **that is a finding, and you report it.** Do **not** relax a bound, and do **not**
  re-author a payout figure to fit. Those bounds were amended once already during R2 and are not
  yours.
- No payout *money* moves: `LeaguePayoutResolver` never divides by size. What moves is the gate's
  own check, the published `clubCount`, and the app's `tvPool / clubCount` cross-check in
  `seasonFinances.ts`. **We are recalibrating instruments, not the economy** — say so if the report
  needs a one-line summary.

---

## 1. Verification

1. **`app:economy:wage-table` for EN and SC — before and after, pasted in full.** It WILL move
   (B1 changes SC 5–8's TV, B3 changes check 8's divisor). Attribute each movement to its piece.
   A failure is a finding to report, never a bound to adjust.
2. Full `phpunit`. Baseline is the five documented failures — and **read `environment.md`'s amended
   entry #4 first**: identical consecutive runs on a clean tree give three, four or five failures
   with nothing changed. **Re-run two or three times before suspecting your own change**, and
   attribute by stashing, never by assertion.
3. **B1: a pooled league with a NULL column publishes the derived share; an unpooled authored league
   is unchanged.** Assert on all three surfaces — export, `/api/initialize/leagues`, sync snapshot.
4. **B1 round trip: export, re-import, assert `tvDeal`'s raw column is still NULL** on a pooled
   league. Same trap `603ea577` closed for the payouts; it applies identically here.
5. **B3: migrate, roll back, re-migrate.** Assert `down()` restores the 12 authored values from the
   stash and does **not** reset them to 0 — a rollback that turns an authored column into "derive"
   loses decisions the migration never made.

## 2. Reporting, scratch files and `.context`

⚠️ **Nothing scratch-shaped inside either repository.** Your report is
`/Users/courtneyadesile/Documents/WunderkindFactory/docs/economy-loose-ends/b1-tvdeal-slots-report.md`.
Throwaway work goes in your own scratchpad directory. Paste commands and output **verbatim**, never
summarised.

**`.context` status and review are owned by the project-manager session.** Append one pass entry to
`shared/last-sync.md` and correct stage text your change makes wrong — nothing else. Do not
restructure, prune, or delete a superseded section even when it is visibly wrong: **flag it in your
report.**

## 3. Do not

- **Do not push, and do not deploy.** The owner is mid device-test against this environment.
- **Do not pick a division size**, and do not regenerate or purge clubs.
- **Do not touch `WORLD_PACK_VERSION`.** None of this is a pack-shape change; if you think one is,
  stop and report.
- **Do not touch any authored economy figure** — turnover, ratio ladders, sponsor bands, TV pools,
  authored TV deals, ability ranges.
- **Do not edit or relax any check in `EconomyWageTableCommand`.**
- Do not touch SC tiers 5–8's `slots`, or `Version20261119090000`'s logic.
- Do not work in `wunderkind-app`. If the app needs a corresponding change, **stop and report it.**
