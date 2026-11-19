<!-- STATUS --> **STATUS:** ✅ A8. DEPLOYED. Overturned A6 §6: the two money sites never fire, so no save mis-booked money.

---

# REPORT — A8: three fallbacks assumed a single round-robin

**Branch:** `new-game-save`
**Base at start:** `b29cf149` ("Correct the Scottish TV shortfall: 12 recipients at the deepest tier"), clean tree, in sync with `origin/new-game-save`
**Commit produced:** `e03dd6da` — *"Derive pre-fixture home games from the division, not half of it"*. **Not pushed.**
**Date:** 2026-11-19
**Scope:** app only (`wunderkind-app`). No backend work. No authored economy figure touched.

---

## 0. 🟩 HEADLINE — the measurement shrinks the finding, and the brief's framing is wrong

§3 asked which of three possibilities was true, and said plainly that "never fires in practice"
would be a good result. **It is the answer, for the two money sites.**

| site | what it books | does the fallback fire? |
|---|---|---|
| `SeasonTransitionService.ts:1656` | NPC season-1 season tickets — real money, balance + NPC ledger | **No.** Fixtures for *every* league exist before this runs |
| `SeasonTransitionService.ts:2499` | the player's own season-ticket booking — real money | **No.** Fixtures exist at world init *and* at every transition |
| `FinancialProjectionService.ts:222` | the player's financial projection — no money | **Yes**, in one reachable state: a save with no fixtures loaded for the current season |

**So: no shipped save has mis-booked season-ticket money through either of these two sites.**
This was a correctness tidy-up with one real display consequence, not a money fix. I am stating
that as flatly as I can because both the brief and A6's §6 invited the opposite conclusion —
A6 wrote *"this is not a rare branch; it is the season-1 path"*, and that is **not correct**.
The defect was real; its blast radius was not.

⚠️ **This corrects A6's report, not the brief's reading of it.** The brief faithfully relayed
what A6 measured; A6 measured the comment rather than the call graph. `SeasonTransitionService.ts:1655`'s
own comment says *"Fixtures may already be generated at init; fall back … when they aren't"* —
and A6 took "may" as "often do not". The init flow settles it.

---

## 1. Code state

```
$ cd /Users/courtneyadesile/Documents/WunderkindFactory/wunderkind-app
$ git status --short && git log --oneline -1
b29cf149 Correct the Scottish TV shortfall: 12 recipients at the deepest tier

$ git fetch origin new-game-save:refs/remotes/origin/new-game-save
$ git rev-parse HEAD origin/new-game-save
b29cf14961e0c06081b696e4051a0c8646629ec1
b29cf14961e0c06081b696e4051a0c8646629ec1
```

Clean tree, in sync. **No `*-correction.md` or `*-addition.md` in `docs/economy-loose-ends/` is
newer than the brief** (brief 15:41; `a3-tvdeal-addition.md` 10:35, `a4-premise-correction.md` 10:25).

Read before implementing, in the order §1 asked: `game-mechanics.md` §13.6,
`a6-homegames-report.md` §6, `src/__tests__/components/pricingPaneHomeGames.test.ts`,
`next-work-plan.md`'s RULING and A8 sections. The groundwork — `homeGamesForDivisionSize()` and
`FALLBACK_DIVISION_SIZE` in `src/utils/seasonTickets.ts` — was used, not rebuilt. **The
arithmetic is restated nowhere in this change.**

---

## 2. 🔴 §3 FIRST TASK — how often the fallback actually fires, and how I established it

Established by **static control flow**, from the single caller of each site outward. Every line
number below is from the tree at `b29cf149`.

### 2a. Site 1 (`:1656`, NPC season tickets) — ONE caller, and fixtures already exist

`distributeNpcSeasonOneStartIncome` has exactly one production caller:

```
$ grep -rn "distributeNpcSeasonOneStartIncome" src/ --include='*.ts' --include='*.tsx' | grep -v __tests__
src/hooks/useInitFlow.ts:54:import { populateScoutCache, distributeSeasonOneStartIncome, distributeNpcSeasonOneStartIncome } from '@/engine/SeasonTransitionService';
src/hooks/useInitFlow.ts:1266:      void distributeNpcSeasonOneStartIncome();
src/engine/SeasonTransitionService.ts:1586:export async function distributeNpcSeasonOneStartIncome(): Promise<void> {
```

Both the call and the fixture generation live inside `useInitFlow`'s single `finalize()`
function, and the generation comes **first**:

```
$ grep -n "Step N+\|async function finalize" src/hooks/useInitFlow.ts
849:  async function finalize(
857:    // ─── Step N+1: Writing World Data ────────────────────────────────────────
902:    // ─── Step N+2: Generating Fixtures ───────────────────────────────────────
933:    // ─── Step N+3: Initialising Fans ─────────────────────────────────────────
963:    // ─── Step N+4: Setting up Club ───────────────────────────────────────────
1235:    // ─── Step N+5: Finalising ────────────────────────────────────────────────
```

Step N+2 (`useInitFlow.ts:902`) generates **every league's** schedule, not just the player's:

```ts
      fixtureStore.batchGenerateFixturesFromWorldLeagues(
        worldLeagues,          // useWorldStore.getState().leagues — ALL of them
        1,
        ampLeagueId,
        ampClubId,
      );
```

…and its `hasFinalizeStep('fixtures_generated')` recovery branch reloads the same set from
SQLite rather than skipping it. Step N+5 (`:1235`) then distributes the income at `:1266`.

⚠️ **This is the specific thing A6 could not have known from the comment alone**, and it is
worth recording: `wireAmpLeagueAndFixtures` (`worldStore.ts:806`) generates only the **AMP's own**
league during `setFromWorldPack`, which is what makes the comment's worry sound right. The
batch call at step N+2 is a *later* and broader generation, and it is the one that runs before
income. So `countHomeGames(npcFixtures, npcClub.id, 1)` is non-zero for every NPC club.

**Verdict: does not fire in a healthy init.** It remains reachable only if step N+2's
generation produced nothing for a club's league (an empty `clubIds`, or a prior attempt that
marked the checkpoint while its SQLite insert did not land).

### 2b. Site 2 (`:2499`, the player's own booking) — three callers, all after generation

```
$ grep -rn "bookSeasonTicketSales\|seasonTicketBookingFor" src/ --include='*.ts' --include='*.tsx' | grep -v __tests__ | grep -v '^\S*:[0-9]*: \*'
src/components/new-game-setup/applyBuild.ts:73:  const next = seasonTicketBookingFor(1);
src/engine/SeasonTransitionService.ts:1565:  bookSeasonTicketSales(1, weekNumber);
src/engine/SeasonTransitionService.ts:2676:  bookSeasonTicketSales(snapshot.currentSeason + 1, snapshot.weekNumber);
```

- **`:1565`** is inside `distributeSeasonOneStartIncome`, called from the same `finalize()` step
  N+5 as site 1 — after step N+2. Does not fire.
- **`:2676`** is `processFanReactions`' PART 2b, at a season transition. `applySeasonResponse`
  generates the **new season's** fixtures (`SeasonTransitionService.ts:609`,
  `batchGenerateFixturesFromWorldLeagues(..., nextSeason, ...)`) and persists them at `:618`.
  In `performSeasonTransition` that call sits at relative line 164 inside the `server_sync`
  step, while PART 2b runs in `fan_engagement` at relative line ~573 — i.e. the schedule for
  `seasonCovered` is in the store roughly four hundred lines of transition earlier. Does not fire.
  **The existing comment was right about this one; it was only wrong about world init.**
- **`applyBuild.ts:73`** is new-game setup v3's BUILD re-book, and `applySetup.ts:269` states it
  "must follow `useInitFlow.finalize()`". After generation. Does not fire.

**Verdict: does not fire in any of the three flows.**

### 2c. Site 3 (`:222`, the projection) — THIS one fires

`buildProjection` has no ordering guarantee at all: it derives whenever
`fixtures.filter(f => f.season === currentSeason)` is empty, and it is called from eleven
places (`BalanceScreen`, `ClubHealthBanners`, `EconomyWorkingsPanel`, `DofProposalCard`,
`useClubMetrics`, `useAdvanceTournamentCta`, `DofSigningService`, `DofProposalService`,
`npcAffordability`, `SeasonBudgetService`, `AssistantEngine`).

The reachable state is a save whose fixtures are not in memory —
`hydrateFixturesFromSQLite` (`src/db/hydrateFixtures.ts`) returns 0 when SQLite holds no rows
for `currentSeason`, which is the cache-loss / failed-hydrate case that
`GameCacheRepairOverlay` exists for.

**Consequence while it fires:** the count drives **both** `totalHomeIncome`
(`FinancialProjectionService.ts:256`) and the season-ticket lump (`:390`), so such a save was
shown roughly half of each — understating the season-end lump, which
`SeasonBudgetService` then reads to size the budget. No ledger entry, no money moved.

### 2d. Not inflating it — the honest summary

**One reachable display defect; two dead branches corrected on principle.** The fallbacks are
kept, as §3 instructed: they cover a real timing/hydration gap, and now they answer correctly
when they are used.

---

## 3. The change

```
$ git show --stat e03dd6da
 .context/shared/last-sync.md                       |  46 +++
 .context/stages/01_overview/output/environment.md  |   2 +-
 .../stages/07_synthesis/output/game-mechanics.md   |  43 ++-
 .../components/pricingPaneHomeGames.test.ts        |  64 +++-
 .../engine/SeasonTransitionService.test.ts         |  13 +-
 .../engine/roundRobinHomeGameFallbacks.test.ts     | 415 +++++++++++++++++++++
 src/engine/FinancialProjectionService.ts           |  28 +-
 src/engine/SeasonTransitionService.ts              |  49 ++-
 8 files changed, 627 insertions(+), 33 deletions(-)
```

All three sites now read:

```ts
countHomeGames(…) || homeGamesForDivisionSize(<size>)
```

### 3a. ⚠️ The `+1` question, settled PER SITE — and site 1 needed a change the brief did not anticipate

The brief warned not to assume `leagueSizeById` behaves like `league.clubs`. It does exclude the
player — but **unconditionally adding `+1` there would have been wrong**, and so was leaving it
alone.

`leagueSizeById` is built from `worldStore.leagues[].clubIds`. Both writers exclude the player's
own club:

```
$ grep -n "clubIds" src/stores/worldStore.ts | sed -n '6,12p'
943:          const clubIds = leagueData.clubs.map((c) => c.id);     # from the pack, which
952:            clubIds,                                             # RESERVES the player's place
1134:        // AMP is excluded from clubIds (it is the player's own club, not an NPC).
1147:            clubIds:        l.clubs.filter((c) => !c.isAmp).map((c) => c.clubId),
```

So the division's participant count is **`clubIds.length` for every league except the AMP's own,
where it is `clubIds.length + 1`** — world generation reserves one place at the player's tier, so
that league has one fewer row than its authored size while every other league has its full
complement. A flat `+1` would have given every NPC club in every other division one home game
too many; no `+1` leaves the player's own division's NPC clubs one short. The fix keys off
`worldStore.ampLeagueId`, which tracks the player's league through promotion and relegation
(`applySeasonUpdate` re-derives it from the `isAmp` flag) rather than assuming the deepest tier:

```ts
  const ampLeagueId     = worldState.ampLeagueId;
  const leagueSizeById  = new Map<string, number>();
  for (const l of worldState.leagues) {
    const participants = l.clubIds.length + (l.id === ampLeagueId ? 1 : 0);
    for (const cid of l.clubIds) leagueSizeById.set(cid, participants);
  }
```

Sites 2 and 3 read `leagueStore.league.clubs`, which the guard test already documents as
excluding the player, so both keep an **unconditional** `+1` — matching what A6 did in
`PricingPane.tsx`. Each of the three decisions has its own test (§4).

### 3b. The misleading comments are gone, and the guard now forbids them

All three comments asserting a single round-robin were removed and replaced with the reason the
count is `size − 1`. **The guard enforces this**, and it immediately proved its worth: my first
pass at those replacement comments quoted the old wording and the halved expression verbatim as
historical context, and the new assertion failed on my own change:

```
  ✕ no longer claims a single round-robin in a comment
  ● SeasonTransitionService (NPC + AMP season tickets) pre-fixture home games › …
  ● FinancialProjectionService (the player’s projection) pre-fixture home games › …
Tests:       3 failed, 8 passed, 11 total
```

I reworded the comments rather than weakening the guard.

---

## 4. Verification (§6)

### 4a. `tsc`

```
$ npx tsc --noEmit
$ echo $?
0
```

Zero errors, no output.

### 4b. `npm test` — green, with the COUNT confirmed

```
$ nvm use && npm test
Test Suites: 639 passed, 639 total
Tests:       3 skipped, 10685 passed, 10688 total
Snapshots:   0 total
Time:        237.097 s, estimated 316 s
Ran all test suites.
EXIT=0

$ npx jest --listTests | wc -l
     639
```

**Reconciles exactly against this branch's previous row (638 / 10,664, A6):** +1 suite
(`roundRobinHomeGameFallbacks.test.ts`, 13 tests) and +8 tests in the extended
`pricingPaneHomeGames.test.ts` guard (3 → 11). 13 + 8 = 21; 10,664 + 21 = 10,685. ✅

Both suite-count rows corrected — `CLAUDE.md`'s `new-game-save` row and
`.context/stages/01_overview/output/environment.md`'s green-master bar.

⚠️ The run prints *"A worker process has failed to exit gracefully"*. **Pre-existing, not
introduced here** — `src/__tests__/engine/projectionMatchesTick.test.ts`, which imports the same
two engine modules and predates this change, prints the same warning when run alone.

### 4c. A test per site, and all thirteen verified RED against the old code

`src/__tests__/engine/roundRobinHomeGameFallbacks.test.ts` — **one `describe` per site**, as §6.3
required, because three sites failed identically when nothing pinned them individually.

Every assertion is **cross-source**: it runs the site once with fixtures giving exactly
`divisionSize − 1` home games (COUNTED) and once with none (DERIVED), and requires the two to
agree. Nothing restates the arithmetic. Each site also gets the halved figure fed in explicitly,
so a regression has to assert that half a season equals a whole one — and each gets a `+1` test,
because a wrong `+1` is as bad as the halving.

```
$ npx jest src/__tests__/engine/roundRobinHomeGameFallbacks.test.ts
PASS src/__tests__/engine/roundRobinHomeGameFallbacks.test.ts
  SITE 1 — NPC season-1 season tickets (distributeNpcSeasonOneStartIncome)
    ✓ falls back to FALLBACK_DIVISION_SIZE when the club is in no known league
    a club in a league the player is NOT in — participants are its rows
      ✓ DERIVES the same price pre-fixtures that it COUNTS once fixtures exist (4 ms)
      ✓ no longer books HALF a season — the old fallback is now visibly wrong (1 ms)
    a club in the PLAYER’S league — participants are its rows PLUS the player
      ✓ counts the player as a participant: rows + 1, so rows home games (1 ms)
      ✓ is one home game HIGHER than ignoring the player would give (2 ms)
  SITE 2 — the player’s own season tickets (seasonTicketBookingFor)
    ✓ DERIVES the same price pre-fixtures that it COUNTS once fixtures exist (1 ms)
    ✓ no longer books HALF a season
    ✓ keeps the `+1`: the division is the club ROWS plus the player (1 ms)
    ✓ falls back to FALLBACK_DIVISION_SIZE with no league snapshot at all
  SITE 3 — the player’s financial projection (buildProjection)
    ✓ DERIVES the same season-end lump pre-fixtures that it COUNTS once fixtures exist (1 ms)
    ✓ no longer projects HALF a season of home games (1 ms)
    ✓ keeps the `+1`: the division is the club ROWS plus the player
    ✓ falls back to FALLBACK_DIVISION_SIZE with no league snapshot at all

Test Suites: 1 passed, 1 total
Tests:       13 passed, 13 total
```

**Red check** — the same file against the pre-change modules, by stashing only the two engine
files:

```
$ git stash push -- src/engine/SeasonTransitionService.ts src/engine/FinancialProjectionService.ts
--- stashed; running against the OLD code ---
    ✕ falls back to FALLBACK_DIVISION_SIZE when the club is in no known league (1 ms)
      ✕ DERIVES the same price pre-fixtures that it COUNTS once fixtures exist (4 ms)
      ✕ no longer books HALF a season — the old fallback is now visibly wrong (1 ms)
      ✕ counts the player as a participant: rows + 1, so rows home games (1 ms)
      ✕ is one home game HIGHER than ignoring the player would give (1 ms)
      ✕ DERIVES the same price pre-fixtures that it COUNTS once fixtures exist (1 ms)
    ✕ no longer books HALF a season (1 ms)
    ✕ keeps the `+1`: the division is the club ROWS plus the player
    ✕ falls back to FALLBACK_DIVISION_SIZE with no league snapshot at all
    ✕ DERIVES the same season-end lump pre-fixtures that it COUNTS once fixtures exist (1 ms)
    ✕ no longer projects HALF a season of home games (1 ms)
    ✕ keeps the `+1`: the division is the club ROWS plus the player (1 ms)
    ✕ falls back to FALLBACK_DIVISION_SIZE with no league snapshot at all
Test Suites: 1 failed, 1 total
Tests:       13 failed, 13 total
$ git stash pop
```

**13/13 red before, 13/13 green after.** No vacuous test in the file.

### 4d. The guard now reads all four files (§4.2)

`pricingPaneHomeGames.test.ts` grew from 3 tests to 11: its header's instruction — *"If one of
them is corrected, add it to this file in the same change"* — is discharged, and the header now
says so and warns the next person about a fifth site. Per sibling file it asserts the helper is
used, that the halving is gone **in all three spellings it was written in**, and that no comment
claims a single round-robin; plus two assertions that `SeasonTransitionService` still tries
`countHomeGames` first at both bookings.

```
$ npx jest src/__tests__/components/pricingPaneHomeGames.test.ts
Tests:       11 passed, 11 total
```

⚠️ **One stale pinned expectation found and corrected.**
`src/__tests__/engine/SeasonTransitionService.test.ts:1662` read
`const HOME_GAMES = 8; // … falls back to floor(((16+1)-1)/2) = 8 in every test` — it **pinned
the defect as intended behaviour**, which A6 had already flagged. It now reads
`homeGamesForDivisionSize(FALLBACK_DIVISION_SIZE)`, derived rather than restated, with the reason
written in. That suite: 81 passed, 3 skipped, 84 total.

### 4e. The economy gate is BYTE-identical (§6.4)

Same inputs both runs, with only the two engine files stashed between them:

```
$ npx tsx scripts/economy/variantGate.ts --export game-config-en.LIVE.json \
    --starter-config starter-config.LIVE.json --world world.json --country EN
```

```
$ diff gate-before.txt gate-after.txt && echo IDENTICAL
IDENTICAL
$ cmp gate-before.txt gate-after.txt && echo BYTE-IDENTICAL
BYTE-IDENTICAL
$ md5 -q gate-before.txt gate-after.txt
24f2d74db39fccd15f349316fadedd62
24f2d74db39fccd15f349316fadedd62
```

Both runs exit 1 with `VARIANT GATE: FAIL — tiers 8 still insolvent once wages follow income`
and COVERAGE 81.0 / 79.7 / 79.3 / 77.3 / 73.8 / 121.8 / 76.9 / 111.5%. **That verdict is
pre-existing and unchanged by this pass** — as it must be: `variantGate.ts` reads config and a
world export, not these modules.

---

## 5. Report, do not change (§5)

Nothing in this section was touched.

### 5a. `SeasonBudgetService.ts:526` and `GameLoop.ts:1520` — the owner's, citing A6

Both still wired, both left alone. Citing A6's measurement rather than re-measuring, per §5:

- **`SeasonBudgetService.ts:526`** — `Math.max(1, Math.round(weeks / 2))` = 23, feeding
  `npcWeeklyIncomePence` → `deriveClubBudget`. A6: *"Correcting it cuts every NPC club's season
  wage budget by 24–30% in England and 26–37% in Scotland."* A season length cannot tell you a
  division size.
- **`GameLoop.ts:1520`** — `NPC_HOME_GAMES_PER_SEASON = 23` for the NPC solvency verdict. No
  ledger entry, but the band drives the NPC brain, so every club reads healthier than it is.

A hardcoded 23 is a 24-club division: **+53% on England (15), +77% on Scotland (11 real / 13
authored).**

### 5b. ⚠️ `FALLBACK_DIVISION_SIZE = 17` is wrong for both countries in scope — the consequence

Not re-authored, as instructed. The consequence, stated:

**17 is nobody's division.** England authors **16** (→ 15 home games) and Scotland **14** (→ 13,
against 12 real clubs → 11). The constant yields **16 home games** — one too many for England,
three too many for Scotland against its authored size, five against its real one.

**Where that now lands, after this change — and it is a smaller surface than it looks:**

- Sites 1–3 reach the constant **only when their size source is missing entirely** (no league
  snapshot, or a club in no known league). With a league snapshot present they use
  `rows + 1`, which is the participant list the fixtures are actually built from — the
  deliberate choice A6 made in `PricingPane.tsx` and the one I mirrored. So the constant is a
  last resort at all three, not the normal path.
- `src/components/new-game-setup/economy.ts` (A6) uses `FALLBACK_DIVISION_SIZE − 1` = 16 as its
  stand-in, because no published division size reaches the new-game screen at all. **That one
  is always the constant**, so it is one game high in England and five high in Scotland.

⚠️ **The direction matters and it is not symmetric.** Over-stating home games over-states
matchday income and season-ticket price. Where it reaches a *projection* or a *quote* that is a
display overstatement; it does not reach a ledger at any of the three sites in this pass,
because the ledger paths are COUNTED. The real fix is **A9** — publishing the authored size on
`economyTierBaseline.tiers[]` — which deletes the constant. The helper's own doc comment already
says *"the honest statement is that this is consistent, not correct"*, which remains accurate.

### 5c. Scotland's authored 14 vs 12 real clubs — this change is correct under either answer

It is, and here is why, precisely: **none of the three sites reads the authored size.** They
read a counted fixture list first, then a participant list (`clubIds`, `league.clubs`) which is
built from the clubs that actually exist, then the constant. So whichever way the owner
reconciles 14-vs-12, these three sites follow the clubs the generator will actually draw
fixtures for, and need no edit. The A7 drift is upstream of them.

---

## 6. 🟡 OUT OF SCOPE — flagged, not changed

1. 🔴 **`SeasonTransitionService.ts:4511` has NO fallback at all.** The *transition-time* NPC
   season-ticket booking (in `evaluateNpcFinancialPromises`) is
   `const npcHomeGames = countHomeGames(npcFixtures, npcClub.id, seasonTicketSeason);` with no
   `||` branch. Same quantity as site 1, opposite failure mode: a club with no loaded fixtures
   books **zero** season tickets rather than a derived figure. Per §2b the fixtures are generated
   earlier in the same transition, so this is as dead as site 1 is — but it is the one place in
   this family where the degraded answer is 0 rather than half, and it is now the only
   home-game read in `SeasonTransitionService` not routed through the helper. Worth a one-line
   follow-up, not worth re-opening this task.
2. 🟩 **`src/screens/facilities/FacilityCategoryScreen.tsx` is a false lead — checked, and clean.**
   It appears in a `countHomeGames` grep, but only as an import:
   `grep -n "countHomeGames\|homeGames"` on that file returns **line 27 and nothing else**, so
   `countHomeGames` (and `calculateSeasonTicketPrice` beside it) are **unused imports** with no
   call site and therefore no fallback. Nothing to fix; worth recording so the next person
   hunting a fifth site does not spend the same ten minutes. (Removing the dead import is a
   tidy-up nobody asked for, so I left it.)
3. `scripts/economy/variantGate.ts` FAILs on tier 8 (`tiers 8 still insolvent once wages follow
   income`) and COVERAGE is outside 85–110% at all eight tiers. Pre-existing, byte-identically
   unchanged by this pass, and entirely a separate thread of work.

---

## 7. `.context` (§7)

Exactly what §7 permits, and nothing else. **Nothing restructured, nothing pruned, no superseded
section deleted.**

1. **One pass entry appended** — `.context/shared/last-sync.md`, *"2026-11-19 (eighty-fourth
   pass) — three fallbacks that assumed a single round-robin"*. (A7 appended to the
   eighty-third entry rather than opening its own, so eighty-fourth is the next free ordinal on
   this branch.)
2. **`07_synthesis/output/game-mechanics.md` §13.6** — its *"STILL WIRED, and five of them"*
   list now reads *"five when A6 wrote this, TWO now"*; the three fixed entries are struck
   through with the fix and, importantly, **with the measurement that corrects A6's
   blast-radius claim**, since §13.6 is where the next reader will look. The conditional-`+1`
   finding is recorded there too.
3. **`01_overview/output/environment.md`** green-master bar — `new-game-save` row to 639 /
   10,685 with the reconciliation, previous row preserved inline.
4. **`CLAUDE.md`** — same row, as the one-way mirror it declares itself to be.

**Flagged for the project-manager session, not acted on:** §13.6 is now a long section carrying
A6's original inventory, A7's drift findings and this pass's strike-throughs, and reads as three
layers of history over one rule. It is accurate; it is no longer short. Whether it wants
condensing is a `.context` review decision, which is yours.

---

## 8. Compliance with §8 "Do not"

| instruction | status |
|---|---|
| Do not push / deploy | ✅ committed `e03dd6da` on `new-game-save`, not pushed |
| Do not change `SeasonBudgetService` / `GameLoop` | ✅ untouched — reported in §5a |
| Do not re-author `FALLBACK_DIVISION_SIZE` or any authored figure | ✅ untouched — consequence in §5b |
| Do not remove a fallback | ✅ all three kept, arithmetic corrected |
| Do not restate the home-games arithmetic | ✅ all three route through `homeGamesForDivisionSize`; the tests assert DERIVED == COUNTED rather than a number |
| Do not work in `wunderkind-backend` | ✅ not opened |
| Nothing scratch-shaped inside either repo | ✅ report here; gate output + suite log in the session scratchpad |
