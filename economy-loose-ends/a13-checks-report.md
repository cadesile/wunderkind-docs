<!-- STATUS --> **STATUS:** ✅ A13. ✅ DEPLOYED (re-verified 2026-11-20: an ancestor of `origin/dev`).

---

# A13 — the CHECKS report, curated

**Branch `new-game-save`, commit `ea92859a`, 2026-11-19. App only. Not pushed.**
Baseline when I started: `ea7f8bd2`, tree clean (A12's work already in).

> *"create a task to clean up checks, and some of the 'checks' have been completed. We don't
> want the output to be too heavy."*

Two jobs, and both are done: **four checks retired, five sections collapsed, two checks added.**
The screen's default view lost a third of its lines. **The clipboard got longer.**

---

## 0. 🔴 Premise corrections — three, and the second one changed the design

**The standing instruction is to believe the code over the brief. Three places where they
disagreed:**

### 0.1 The brief's own line counts were stale (harmless)

`ChecksTab.tsx` was **763** lines, not 718, and `economyDiagnostics.ts` was **224**, not 142 —
A12 and A10's work had landed in the hours between the brief being written and my starting. No
consequence, but it is why my "before" figures do not match §1 of the brief.

### 0.2 ⚠️ A10 §9's spec names two keys the app does not receive

§3b told me to look for the wage-ratio spec in `a10-wage-scale-report.md` before designing my
own. It is there, it is good, and **its source table is wrong on one row.** It lists:

| name | source (per §9) |
|---|---|
| `wageToTurnoverRatioBp` | `GET /api/game-config?country=XX` — "same payload" |
| `staffWageShareBp` | same payload |

**Neither reaches the app.** The backend publishes them on
`EconomyConfigPublisher::publicBlock()` — the *unauthenticated, country-agnostic* endpoint — and
the app's `EconomyTierBaseline` has no field for either. `src/economy/clubBudget.ts:42` already
said so, at the site, in as many words:

> *"It mirrors the backend's `wageToTurnoverRatioBp`, which is 6,000 — but that key is not
> published to the app, and the only copy in the tree was `WAGE_TO_TURNOVER_BP` inside the
> harness fixtures, where no runtime code could reach it."*

**What I did instead of complying:** used the app's own `DEFAULT_WAGE_BUDGET_RATIO_BP` (6,000)
and `STAFF_WAGE_SHARE_BP` (2,500) — the single source the whole app budgets on, and the same
60% × 75% = **45% of turnover** that A10 §5.1 measures the backend gate against. The arithmetic
is identical to §9's. **The clipboard line states which it used**, so nobody is ever misled into
thinking the device confirmed a server-published figure. If those keys are ever published,
swap the two constants for them and nothing else changes.

### 0.3 §3a's `slots` is not fully available on device, and pretending otherwise would have been worse

The brief's example line is `EN t8 slots 16 · clubs 15 (+amp = 16) · home games 15 · TV £75,000 = pool/16`.

The app's runtime `WorldLeague` **carries no authored size at all.** `FALLBACK_DIVISION_SIZE`'s
own comment says to *"delete it the moment the backend publishes the authored division size"*,
and that has not happened. What *is* on the wire is **`clubCount`**, and `src/types/api.ts:303`
describes it as exactly the figure §3a wants:

> `/** What the pool was divided by: the league's authored `slots`. */`

and two lines above:

> *"`clubCount` is published so a client can CHECK that arithmetic rather than trust it."*

**Nothing checked it.** So the check is real — but `clubCount` and `tvPoolPence` ride **only the
three uncached payloads** (sync snapshot, `/api/initialize/leagues`, `conclude-season`). They
reach `leagueStore` for the player's own league and are **absent on a pack-sourced league**.

**Design consequence, and it is the most important decision in this task:** a `null` is never
treated as a disagreement. Had I let a missing figure read as a mismatch, the row would have
failed on every boot for every league but one, and been ignored inside a week — which is the
precise failure mode §2 exists to prevent. `slots` prints `—` where it is not published, and
**the `clubs` vs `home games` pair is checkable on every league** — which is the pair that
catches a division whose fixtures were built for a different size.

---

## 1. The structural change everything else rests on (§2b)

**The problem:** `asText` built the clipboard from the same `detail` string the rows rendered.
So shortening `detail` to tidy the screen would have shortened the paste too — **silently**,
with nothing failing, no test noticing, and the loss surfacing only the next time someone needed
a figure that was no longer there. That is the one outcome this tab cannot afford.

**The fix, in two parts:**

1. **`CheckResult` gains an optional `full`.** The screen renders `detail`; the clipboard takes
   `full ?? detail`. A collapsed row carries a one-line summary *and* the unabridged text. A row
   without `full` — almost all of them — is unchanged in both places.
2. **The report's assembly moved out of the component** into
   `src/components/debug/checksReport.ts`. `ChecksTab.tsx` is now the renderer over
   `buildChecksReport()`. The text is the product here, so it belongs somewhere it can be
   tested and diffed; it could not be, inside a component body. **No measurement changed in the
   move** — the section list, the order and every row's content went across verbatim.

**This is what made the whole task safe**, and it is why §2b is satisfied by construction rather
than by care.

### Proof that nothing was lost (§4.4)

Both reports below were rendered by the **same harness** against the **same fixture database**,
once with the tree stashed (BEFORE) and once with it restored (AFTER).

| | BEFORE | AFTER | |
|---|---|---|---|
| **screen** (default view) | **109 lines**, 93 rows | **71 lines**, 55 rows | **−35% / −41%** |
| **clipboard** (COPY EVERYTHING) | **109 lines** | **115 lines** | **+6 — it GREW** |

The clipboard is longer than the screen for the first time, which is the whole point.

**Token-level check.** Every token in the BEFORE clipboard, tested for presence in the AFTER
clipboard:

```
=== tokens in BEFORE clipboard absent from AFTER clipboard ===
MISSING: -
```

A bare hyphen, a punctuation artefact of the tokeniser. **Every pragma name, every pragma value,
every object name, every label and every figure survives.** The only deliberate removals:

```
A3 rule                before:1 after:0
A3 input               before:1 after:0
64MB                   before:1 after:0
```

— which are the two retirements in §2, and are meant to be gone.

**Permanent guard:** `src/__tests__/components/checksReportCopy.test.ts` (9 tests) holds the
contract from both ends — that `full` reaches the clipboard, that a row without `full` is
unaffected, that a fully-collapsed section loses nothing, and that a section which has not run
is skipped rather than printed as an empty heading.

---

## 2. 🔴 Every retirement, with its one-line justification (§4.5)

**Four. Each was a verdict on a decided question; none was an invariant.** I checked each
against the code before acting, and in two cases the "gate" also asserted something — so the
assertion stayed and only the verdict went, which the brief called the real work of this task.

| retired | what it was | why the task is done |
|---|---|---|
| `size.a3Rule` — *"A3 rule: 64MB cache justified?"* | printed whether the DB exceeded ~100MB, to decide A3's `cache_size` | the `cache_size` decision is taken (`CACHE_SIZE_KIB = -16_000`, set in `client.ts`); the size it read off is **still printed** by `size.database` |
| `size.largestObject` — *"A3 input: 2x largest object"* | 2× the heaviest object in pages, as an input to that same decision | labelled an *input* to a decision already made; the object weights it derived from are **still in the clipboard** via `size.objects` |
| `b2.poolAbsorbed` — *"how the pool scan reaches players"* | reported bare-scan vs index-driven, plus the full EXPLAIN plan (2 lines of every report) | its status was a **hardcoded `'info'`** — it could not fail under any plan — and its own text read *"settled by D14"*. **Its assertable half, `b2.droppedIndexUnused`, is KEPT** |
| the A5/A6 **verdict sentences** in `d8.restore` / `d8.wipe` | *"OVER the ~3s bar — A5 proceeds"*, *"under the ~500ms bar — A6 does NOT proceed"* | go/no-go calls on two decided items. ⚠️ **The measurement and BOTH thresholds stayed** — a 3s restore or a 500ms wipe still WARNs, which matters during multi-season testing. Only the verdict went |

**On `b2.poolAbsorbed`, because it is the one that needed the most care.** It shipped as a
`warn`, warned on the first device run, and *that warn did its job*: the D14 counterfactual
re-created `idx_players_position`, re-ANALYZEd, re-planned, and got a byte-identical plan — so
the bare scan is ANALYZE's choice, not the migration's drop. It was downgraded to `info` on
2026-10-12 to record that. At that point it had no threshold left to assert. **`hasBareScanOf`
is kept exported and tested** with a note saying why: it is the correct primitive for reading a
plan, the distinction it draws is easy to get wrong by hand, and the next plan check should use
it rather than re-derive it.

### What I did NOT retire, and said so instead

- **`b3.noTempBTree`** — carries a `B3:` label but **can FAIL**, and a failure means the market
  search is materialising its sort, i.e. an index is missing or a migration did not apply. Kept;
  only the `B3:` prefix dropped from the label.
- **`b2.droppedIndexUnused`** — can FAIL, and a failure means migration 0008 did not apply. Kept.
- **Every migration check (`m0006`–`m0009`), the pool partition, the orphan-pointer counts, the
  seed checkpoints, `foreign_keys`, `journal_mode`, `busy_timeout`.** All invariants, untouched.
- **Task IDs removed from section titles only** (`PRAGMAS (D4)` → `PRAGMAS`, `SIZING (D12)` →
  `SIZING`, and so on). **Every check `id` is unchanged** — ids are machine keys, referenced from
  the ledger, bug reports and tests, and renaming them would have broken the traceability the
  labels were there to provide.

---

## 3. Collapsed, not deleted (§2b) — five sections

Each keeps a one-line `detail` for the screen and the unabridged text in `full`.

| section | before | after (screen) |
|---|---|---|
| **PRAGMAS** | 12 rows reciting constants | **1 row** naming whatever differs from a value the app sets |
| **Boot timeline** | ~30 `123ms phase` lines in one unreadable row | **phase count, time to last, three slowest steps** |
| **SIZING per-object** | 12 rows, one per object | **1 row**, heaviest three named |
| **SIZING per-table** (dbstat-absent fallback) | 12 rows | **1 row**, same shape |
| **WRITE COST** exec + queue | up to 12 rows each + a truncation line | **every slow label keeps its own row**; quiet ones merge into one |

**WRITE COST collapses by STATUS, not by rank — and that is a deliberate improvement.** The old
code printed the twelve worst *averages*, so a genuinely slow label could be pushed out of sight
by faster ones that merely had worse averages. Now severity decides whether a label gets a row:
anything at or over `SLOW_WRITE_MS` keeps one, the rest merge. **The actionable half stays loud.**

### ⚠️ One self-correction worth recording

My first cut of `EXPECTED_PRAGMAS` guessed expected values for `mmap_size`, `cache_spill`,
`journal_size_limit` and `secure_delete`. The harness immediately reported:

```
[·] Recorded pragmas (12): 2 differ from expected: mmap_size null (expected 0), cache_spill 3871 (expected 1)
```

**A check crying wolf about a value nobody chose is exactly what this task exists to remove.** I
narrowed it to the only two values this app actually sets — `cache_size` (`CACHE_SIZE_KIB`, set
in `client.ts`) and `synchronous` (FULL by default, restored to FULL by the latency probe) — and
wrote the rule into the source: **do not add a row there without a site that sets it.** It now
reads `all as expected for this build`, and a drift in either — a pragma-lab session without a
relaunch, a handle swap that did not re-apply the cache — is a real finding.

---

## 4. 🟩 Added (§3)

### 4a. 🔴 `divisionSizeChecks` — division size three ways, one line per league

**The highest-value addition, and the one with a measured cost behind it.** Four readings of one
quantity, each from a different place; each disagreeing pair is a different defect:

- **`slots`** — the authored size, which *is* the TV divisor (`clubCount`).
- **`clubs`** — participants that exist: `clubIds.length`, **plus one only for the player's own
  league** (world generation reserves the player's place there and every writer excludes the AMP
  from `clubIds` — a flat `+1` would be wrong, which A8's handover note establishes).
- **`home games`** — counted from the real fixture list. A double round-robin gives `size − 1`,
  so `homeGames + 1` is the size the fixtures believe in.
- **the TV arithmetic** — `tvPool / slots` against the published per-club `tvDeal`.

It FAILS on any disagreement among the figures in hand, names the offending leagues on the
screen line, gives each a row of its own, and puts the **whole table** in the clipboard. A
missing figure is never a disagreement (§0.3).

11 tests in `src/__tests__/economy/divisionSizeChecks.test.ts`, including Scotland as it actually
was:

```
SC t7   slots 14 · clubs 12 · home games 11 · TV £3,571 = pool/14   DISAGREE: authored 14 ≠ 12 clubs
```

### 4b. `wageCoverageChecks` — the measured bill against its authored budget

To A10 §9's spec and its bands, with §0.2's correction. One line per tier:

```
Tier 8 wage coverage: mean 1,899p × 20.3 players × 46 wks = £17.7k season bill
                      vs budget £19.4k → coverage 91.6%
```

| coverage | verdict |
|---|---|
| < 60% | 🔴 **FAIL** — the scale is calibrated against a different quantity from the one being paid |
| 60–85% | ⚠️ WARN — under-spending; a young squad reads low legitimately |
| 85–115% | ✅ PASS — the authored band |
| > 115% | ⚠️ WARN — over-spending |
| > 150% | 🔴 **FAIL** — structurally insolvent on wages alone |

Both of A10's "get this right or the line lies" warnings are honoured and tested: **squad size is
the save's counted `players / clubs`**, never `npcSquadConfig`'s midpoint (A10 measured that gap
at 15–20% optimistic, and a test halves a squad to prove the ratio follows); and clubs are
bucketed by **current** tier, so a promoted club counts in the division it now plays in. A tier
with `resolvable: false` has no budget to divide by and reports as `info`, not as a failure.

12 tests in `src/__tests__/economy/wageCoverageChecks.test.ts`, built *backwards* from a target
coverage so each test states the ratio it means rather than a wage that happens to produce it.
The bands are pinned as values, because a band that silently widened would turn a FAIL into a
PASS and that is the one change nobody would notice from the output.

**Where the per-tier mean wage went.** It used to sit in WORLD PACK with nothing beside it. It is
now *inside* this block, against the budget it is meant to cover. A10 §9: the owner's Scottish
save printed `tier 8 mean weekly wage 1,899 pence` with nothing to compare it to; before the
recalibration the same save read ~470p, which is **23%**, and this line would have said FAIL on
the first boot anyone opened the tab.

### 4c. NPC budget inputs — ⚠️ already there, not duplicated

§3c asked for weekly income split into sponsor / matchday / seasonal with the home-game count
used. **A12 added exactly that** in `ea7f8bd2` — `npc.weeklyIncome`:

```
[·] NPC weekly income (the budget's input): 48,206p/wk = sponsor 21,000 + matchday 19,456
    (81,667/game × 11 ÷ 46) + seasonal 7,750 · season budget 2,217,476p
```

The brief said to check `git log` and the current code before building it. I did; it is complete
and obeys §2's bar. **Nothing added.**

---

## 5. Verification (§4)

### `npx tsc --noEmit`

```
$ npx tsc --noEmit
$ echo $?
0
```

Clean. No output.

### `npm test`, with the suite COUNT confirmed

```
$ npx jest --listTests | wc -l
     643

$ npx jest
Test Suites: 643 passed, 643 total
Tests:       3 skipped, 10735 passed, 10738 total
```

**Fully green.** `--listTests` 643 equals the suite count, so nothing was silently uncollected.

**Reconciliation against the branch baseline.** `CLAUDE.md` records `new-game-save` at **640
suites / 10,704 passed** (10,707 collected) at `e03dd6da` + A12. This pass adds **three suites**
(`checksReportCopy`, `divisionSizeChecks`, `wageCoverageChecks`) → 643, and **+31 tests** → 10,735.
That reconciles exactly. ⚠️ Per `CLAUDE.md`'s own warning I measured rather than trusted the row;
in this case the row was accurate.

### ⚠️ One flake, attributed rather than assumed

An intermediate full run showed `src/__tests__/screens/tournamentHubRender.test.tsx` failing
(1 test). I attributed it by **stashing and re-running**, as the standing notes require:

```
$ git stash -u -q && npx jest src/__tests__/screens/tournamentHubRender.test.tsx
Test Suites: 1 passed, 1 total
Tests:       19 passed, 19 total
$ git stash pop -q && npx jest src/__tests__/screens/tournamentHubRender.test.tsx
Test Suites: 1 passed, 1 total
Tests:       19 passed, 19 total
```

Passes in isolation on **both** trees; my change touches no tournament code; **it did not recur
in the final full run**, which is green. An ordering/parallelism flake, not this change.

### The five test failures that WERE mine, and how I treated them

The collapses broke five assertions that pinned the old one-row-per-label and one-row-per-pragma
contracts. **I rewrote each to the new contract while preserving the statement it was making**,
rather than deleting them — e.g. *"leaves an ordinary write as a measurement with no verdict"*
now asserts the label is absent from its own row, `info` on the quiet row, **and present in
`full`**. Two new tests were added where the old contract no longer had an equivalent:
that a slow label can never be crowded out by a quiet one, and that a truncation is still
admitted. One architecture test (`worldPackVersion`) pins which files may import that module;
the extraction moved the import one file along and the allowlist was updated with the reason.

---

## 6. BEFORE — the full report, verbatim

⚠️ **Scope of these dumps.** They render the **seven sections a harness can produce** — WRITE
COST, DATABASE, PRAGMAS, SIZING, PLAYER POOLS, BLOB WEIGHT, INIT CHECKPOINTS. ECONOMY, DIVISION
SIZE, WAGE COVERAGE, NPC BUDGET, WORLD PACK, BOOT and RESTORE/WIPE TIMING read live stores and
need a device; `b2`/`b3` need the Drizzle connection alongside the raw handle, which is why they
show as `could not run` here and appear on neither side. **Every collapse and every retirement in
§2 and §3 is inside the seven**, so the comparison covers all of them. The fixture is a fresh
harness database plus a synthetic week of write traffic (18 quiet labels, two slow, one very
slow, six queue waits and one 13.6s wait), identical on both sides.

### 6.1 BEFORE — screen (109 lines)

```
WRITE COST — THIS SESSION
  [PASS] Write queue depth (now): idle — nothing waiting to write
  [·] Writes this session: 21 write(s) across 21 label(s), 2294 row(s) total
  [FAIL] exec · store_state.set: avg 3600ms · worst 3600ms · 1 call(s) · 1 row(s)
  [WARN] exec · players.batchUpsert: avg 2100ms · worst 2100ms · 1 call(s) · 1580 row(s)
  [WARN] exec · fixtures.insert: avg 1400ms · worst 1400ms · 1 call(s) · 380 row(s)
  [·] exec · repo.label17: avg 56ms · worst 56ms · 1 call(s) · 27 row(s)
  [·] exec · repo.label16: avg 53ms · worst 53ms · 1 call(s) · 26 row(s)
  [·] exec · repo.label15: avg 50ms · worst 50ms · 1 call(s) · 25 row(s)
  [·] exec · repo.label14: avg 47ms · worst 47ms · 1 call(s) · 24 row(s)
  [·] exec · repo.label13: avg 44ms · worst 44ms · 1 call(s) · 23 row(s)
  [·] exec · repo.label12: avg 41ms · worst 41ms · 1 call(s) · 22 row(s)
  [·] exec · repo.label11: avg 38ms · worst 38ms · 1 call(s) · 21 row(s)
  [·] exec · repo.label10: avg 35ms · worst 35ms · 1 call(s) · 20 row(s)
  [·] exec · repo.label9: avg 32ms · worst 32ms · 1 call(s) · 19 row(s)
  [·] exec · (more): 9 further label(s) not shown — worst averages first
  [WARN] queue · transactions.insert: avg 13588ms · worst 13588ms · 1 call(s) — WAITING, not executing
  [·] queue · repo.label5: avg 90ms · worst 90ms · 1 call(s) — WAITING, not executing
  [·] queue · repo.label4: avg 80ms · worst 80ms · 1 call(s) — WAITING, not executing
  [·] queue · repo.label3: avg 70ms · worst 70ms · 1 call(s) — WAITING, not executing
  [·] queue · repo.label2: avg 60ms · worst 60ms · 1 call(s) — WAITING, not executing
  [·] queue · repo.label1: avg 50ms · worst 50ms · 1 call(s) — WAITING, not executing
  [·] queue · repo.label0: avg 40ms · worst 40ms · 1 call(s) — WAITING, not executing

DATABASE
  [WARN] SQLite version: 3.53.2 (ledger assumes 3.50.3)
  [PASS] Connection churn (retired handles / statements caught in flight): 0 handle(s) retired this session (one at boot is ordinary), nothing caught in flight
  [·] json_valid(): available (returned 1)
  [·] json_extract(): available (returned 1)
  [·] json_each(): available (returned 3)
  [·] -> operator: available (returned 1)
  [PASS] Bind-parameter ceiling: 32766 as expected
  [FAIL] Migrations: __drizzle_migrations unreadable — no such table: __drizzle_migrations
  [PASS] idx_npc_scout_player is UNIQUE: unique
  [PASS] One scout record per player: no duplicate player_id
  [·] No blank cooldown placeholder rows: none
  [PASS] Four duplicate indexes dropped: all four gone
  [PASS] The UNIQUE indexes that replaced them survive: all four present and unique
  [PASS] Five prefix-redundant indexes dropped: all five gone
  [PASS] Their covers, and idx_ppb_b, survive: all five covers present, idx_ppb_b present
  [PASS] players(current_ability) index added: idx_players_current_ability present
  [WARN] searchTransferMarket: could not run — Cannot read properties of undefined (reading 'bind')
  [WARN] queryNpcSearchPool: could not run — Cannot read properties of undefined (reading 'bind')
  [PASS] npc_club_review_needs action_data parses: 0 row(s), all parse

PRAGMAS
  [PASS] foreign_keys is OFF: 0 — as required
  [WARN] journal_mode: memory — expected wal
  [PASS] busy_timeout: 5000
  [·] synchronous: 2
  [·] cache_size: -16000
  [·] temp_store: 0
  [·] wal_autocheckpoint: 1000
  [·] auto_vacuum: 0
  [·] page_size: 4096
  [·] page_count: 209
  [·] freelist_count: 12
  [·] mmap_size: null
  [·] cache_spill: 3871
  [·] journal_size_limit: -1
  [·] secure_delete: 0

SIZING
  [·] Database size: 0.8 MB (209 pages x 4096 B)
  [·] Dead space (freelist): 0.0 MB (12 pages) — not reclaimed, auto_vacuum is off by default
  [·] A3 rule: 64MB cache justified?: no — database is 0.8 MB, so the 16MB cap applies
  [·] Per-object method: dbstat (real page weight)
  [·] world_clubs: 0.0 MB across 1 page(s)
  [·] uq_push_inbox_source: 0.0 MB across 1 page(s)
  [·] uq_player_youth_pool_player: 0.0 MB across 1 page(s)
  [·] uq_player_rating_player: 0.0 MB across 1 page(s)
  [·] transfers: 0.0 MB across 1 page(s)
  [·] transactions: 0.0 MB across 1 page(s)
  [·] tournament_save_index: 0.0 MB across 1 page(s)
  [·] store_state: 0.0 MB across 1 page(s)
  [·] staff_transfers: 0.0 MB across 1 page(s)
  [·] staff_club: 0.0 MB across 1 page(s)
  [·] staff: 0.0 MB across 1 page(s)
  [·] season_transition_steps: 0.0 MB across 1 page(s)
  [·] A3 input: 2x largest object: 2 pages (0.0 MB) for "world_clubs"
  [·] wk.db: 0.0 MB
  [·] wk.db-wal: 0.0 MB
  [·] wk.db-shm: 0.0 MB

PLAYER POOLS
  [·] Pool totals: players 0 | club 0 | free 0 | foreign 0 | listed 0 | retired 0
  [PASS] Every player is in exactly one pool: no players outside the partition
  [PASS] No player is in two pools at once: none
  [PASS] Every listed player has a club row: none
  [PASS] player_club rows point at a real player: no orphans
  [PASS] player_free_transfer rows point at a real player: no orphans
  [PASS] player_foreign_transfer rows point at a real player: no orphans
  [PASS] player_transfer_list rows point at a real player: no orphans
  [PASS] scout_shortlist rows point at a real player: no orphans

BLOB WEIGHT
  [·] AMP first team blobs: 0 player(s) | development_log 0 B (max 0 B) | appearance_data 0 B
  [·] players table blobs: 0 row(s) | development_log 0.0 MB | appearance_data 0.0 MB
  [·] development_log within 52 snapshots: no player has a development_log yet

INIT CHECKPOINTS
  [·] One-time seeds applied: 0 of 17 checkpointed
    pending: 0001_scout_shortlist_is_shortlisted_backfill, staff_club_centralization_backfill, staff_club_amp_corruption_cleanup, staff_club_ghost_hire_cleanup_2026_09_29, 0002_players_assigned_coach_id_backfill, 0001_npc_club_ledger_backfill, 0001_promises_blob_migration, 0002_free_agency_season_backfill, sprite_staff_avatar_config_backfill, sprite_agents_avatar_config_backfill, sprite_staff_body_size_backfill, sprite_agents_body_size_backfill, sprite_player_appearance_backfill, sprite_player_avatar_extras_backfill, sprite_staff_avatar_extras_backfill, sprite_agents_avatar_extras_backfill, players_is_youth_age_floor_2026_10_19
    an EMPTY table is expected right after a restore — checkpoints are export-excluded, so every one-time seed re-runs on the next boot
  [·] Always-run seeds (never checkpointed): 4 run every boot by design
    player_club_amp_stray_club_id_repair_2026_10_24, player_foreign_transfer_clubbed_player_cleanup_2026_10_06, player_pool_exclusivity_repair_2026_11_04, player_stranded_no_pool_recovery_2026_10_11
  [·] Init checkpoints present: none
  [PASS] fixtures_generated matches the fixtures table: checkpoint unset, 0 fixture(s)
  [·] Starter squad recovery copy: ABSENT — a wipe would strand this account
```

### 6.2 BEFORE — clipboard, COPY EVERYTHING (109 lines)

Byte-identical to the screen above, because before this change `asText` read the same `detail`
the rows rendered. **That identity is the defect §1 fixes.**

---

## 7. AFTER — the full report, verbatim

### 7.1 AFTER — screen (71 lines)

```
WRITE COST — THIS SESSION
  [PASS] Write queue depth (now): idle — nothing waiting to write
  [·] Writes this session: 21 write(s) across 21 label(s), 2294 row(s) total
  [FAIL] exec · store_state.set: avg 3600ms · worst 3600ms · 1 call(s) · 1 row(s)
  [WARN] exec · players.batchUpsert: avg 2100ms · worst 2100ms · 1 call(s) · 1580 row(s)
  [WARN] exec · fixtures.insert: avg 1400ms · worst 1400ms · 1 call(s) · 380 row(s)
  [·] exec · under 1000ms (18): repo.label17 56ms · repo.label16 53ms · repo.label15 50ms
  [WARN] queue · transactions.insert: avg 13588ms · worst 13588ms · 1 call(s) — WAITING, not executing
  [·] queue · under 2000ms (6): repo.label5 90ms · repo.label4 80ms · repo.label3 70ms

DATABASE
  [WARN] SQLite version: 3.53.2 (ledger assumes 3.50.3)
  [PASS] Connection churn (retired handles / statements caught in flight): 0 handle(s) retired this session (one at boot is ordinary), nothing caught in flight
  [·] json_valid(): available (returned 1)
  [·] json_extract(): available (returned 1)
  [·] json_each(): available (returned 3)
  [·] -> operator: available (returned 1)
  [PASS] Bind-parameter ceiling: 32766 as expected
  [FAIL] Migrations: __drizzle_migrations unreadable — no such table: __drizzle_migrations
  [PASS] idx_npc_scout_player is UNIQUE: unique
  [PASS] One scout record per player: no duplicate player_id
  [·] No blank cooldown placeholder rows: none
  [PASS] Four duplicate indexes dropped: all four gone
  [PASS] The UNIQUE indexes that replaced them survive: all four present and unique
  [PASS] Five prefix-redundant indexes dropped: all five gone
  [PASS] Their covers, and idx_ppb_b, survive: all five covers present, idx_ppb_b present
  [PASS] players(current_ability) index added: idx_players_current_ability present
  [WARN] searchTransferMarket: could not run — Cannot read properties of undefined (reading 'bind')
  [WARN] queryNpcSearchPool: could not run — Cannot read properties of undefined (reading 'bind')
  [PASS] npc_club_review_needs action_data parses: 0 row(s), all parse

PRAGMAS
  [PASS] foreign_keys is OFF: 0 — as required
  [WARN] journal_mode: memory — expected wal
  [PASS] busy_timeout: 5000
  [·] Recorded pragmas (12): all as expected for this build

SIZING
  [·] Database size: 0.8 MB (209 pages x 4096 B)
  [·] Dead space (freelist): 0.0 MB (12 pages) — not reclaimed, auto_vacuum is off by default
  [·] Per-object method: dbstat (real page weight)
  [·] Heaviest objects (12): world_clubs 0.0 MB · uq_push_inbox_source 0.0 MB · uq_player_youth_pool_player 0.0 MB
  [·] wk.db: 0.0 MB
  [·] wk.db-wal: 0.0 MB
  [·] wk.db-shm: 0.0 MB

PLAYER POOLS
  [·] Pool totals: players 0 | club 0 | free 0 | foreign 0 | listed 0 | retired 0
  [PASS] Every player is in exactly one pool: no players outside the partition
  [PASS] No player is in two pools at once: none
  [PASS] Every listed player has a club row: none
  [PASS] player_club rows point at a real player: no orphans
  [PASS] player_free_transfer rows point at a real player: no orphans
  [PASS] player_foreign_transfer rows point at a real player: no orphans
  [PASS] player_transfer_list rows point at a real player: no orphans
  [PASS] scout_shortlist rows point at a real player: no orphans

BLOB WEIGHT
  [·] AMP first team blobs: 0 player(s) | development_log 0 B (max 0 B) | appearance_data 0 B
  [·] players table blobs: 0 row(s) | development_log 0.0 MB | appearance_data 0.0 MB
  [·] development_log within 52 snapshots: no player has a development_log yet

INIT CHECKPOINTS
  [·] One-time seeds applied: 0 of 17 checkpointed
    pending: 0001_scout_shortlist_is_shortlisted_backfill, staff_club_centralization_backfill, staff_club_amp_corruption_cleanup, staff_club_ghost_hire_cleanup_2026_09_29, 0002_players_assigned_coach_id_backfill, 0001_npc_club_ledger_backfill, 0001_promises_blob_migration, 0002_free_agency_season_backfill, sprite_staff_avatar_config_backfill, sprite_agents_avatar_config_backfill, sprite_staff_body_size_backfill, sprite_agents_body_size_backfill, sprite_player_appearance_backfill, sprite_player_avatar_extras_backfill, sprite_staff_avatar_extras_backfill, sprite_agents_avatar_extras_backfill, players_is_youth_age_floor_2026_10_19
    an EMPTY table is expected right after a restore — checkpoints are export-excluded, so every one-time seed re-runs on the next boot
  [·] Always-run seeds (never checkpointed): 4 run every boot by design
    player_club_amp_stray_club_id_repair_2026_10_24, player_foreign_transfer_clubbed_player_cleanup_2026_10_06, player_pool_exclusivity_repair_2026_11_04, player_stranded_no_pool_recovery_2026_10_11
  [·] Init checkpoints present: none
  [PASS] fixtures_generated matches the fixtures table: checkpoint unset, 0 fixture(s)
  [·] Starter squad recovery copy: ABSENT — a wipe would strand this account
```

### 7.2 AFTER — clipboard, COPY EVERYTHING (115 lines)

**Longer than the screen, and longer than the whole BEFORE report.** The collapsed rows are
expanded here — this is what a paste into a bug report now carries.

```
WRITE COST — THIS SESSION
  [PASS] Write queue depth (now): idle — nothing waiting to write
  [·] Writes this session: 21 write(s) across 21 label(s), 2294 row(s) total
  [FAIL] exec · store_state.set: avg 3600ms · worst 3600ms · 1 call(s) · 1 row(s)
  [WARN] exec · players.batchUpsert: avg 2100ms · worst 2100ms · 1 call(s) · 1580 row(s)
  [WARN] exec · fixtures.insert: avg 1400ms · worst 1400ms · 1 call(s) · 380 row(s)
  [·] exec · under 1000ms (18): repo.label17 avg 56ms · worst 56ms · 1 call(s) · 27 row(s)
    repo.label16 avg 53ms · worst 53ms · 1 call(s) · 26 row(s)
    repo.label15 avg 50ms · worst 50ms · 1 call(s) · 25 row(s)
    repo.label14 avg 47ms · worst 47ms · 1 call(s) · 24 row(s)
    repo.label13 avg 44ms · worst 44ms · 1 call(s) · 23 row(s)
    repo.label12 avg 41ms · worst 41ms · 1 call(s) · 22 row(s)
    repo.label11 avg 38ms · worst 38ms · 1 call(s) · 21 row(s)
    repo.label10 avg 35ms · worst 35ms · 1 call(s) · 20 row(s)
    repo.label9 avg 32ms · worst 32ms · 1 call(s) · 19 row(s)
    repo.label8 avg 29ms · worst 29ms · 1 call(s) · 18 row(s)
    repo.label7 avg 26ms · worst 26ms · 1 call(s) · 17 row(s)
    repo.label6 avg 23ms · worst 23ms · 1 call(s) · 16 row(s)
    repo.label5 avg 20ms · worst 20ms · 1 call(s) · 15 row(s)
    repo.label4 avg 17ms · worst 17ms · 1 call(s) · 14 row(s)
    repo.label3 avg 14ms · worst 14ms · 1 call(s) · 13 row(s)
    repo.label2 avg 11ms · worst 11ms · 1 call(s) · 12 row(s)
    repo.label1 avg 8ms · worst 8ms · 1 call(s) · 11 row(s)
    repo.label0 avg 5ms · worst 5ms · 1 call(s) · 10 row(s)
  [WARN] queue · transactions.insert: avg 13588ms · worst 13588ms · 1 call(s) — WAITING, not executing
  [·] queue · under 2000ms (6): repo.label5 avg 90ms · worst 90ms · 1 call(s)
    repo.label4 avg 80ms · worst 80ms · 1 call(s)
    repo.label3 avg 70ms · worst 70ms · 1 call(s)
    repo.label2 avg 60ms · worst 60ms · 1 call(s)
    repo.label1 avg 50ms · worst 50ms · 1 call(s)
    repo.label0 avg 40ms · worst 40ms · 1 call(s)

DATABASE
  [WARN] SQLite version: 3.53.2 (ledger assumes 3.50.3)
  [PASS] Connection churn (retired handles / statements caught in flight): 0 handle(s) retired this session (one at boot is ordinary), nothing caught in flight
  [·] json_valid(): available (returned 1)
  [·] json_extract(): available (returned 1)
  [·] json_each(): available (returned 3)
  [·] -> operator: available (returned 1)
  [PASS] Bind-parameter ceiling: 32766 as expected
  [FAIL] Migrations: __drizzle_migrations unreadable — no such table: __drizzle_migrations
  [PASS] idx_npc_scout_player is UNIQUE: unique
  [PASS] One scout record per player: no duplicate player_id
  [·] No blank cooldown placeholder rows: none
  [PASS] Four duplicate indexes dropped: all four gone
  [PASS] The UNIQUE indexes that replaced them survive: all four present and unique
  [PASS] Five prefix-redundant indexes dropped: all five gone
  [PASS] Their covers, and idx_ppb_b, survive: all five covers present, idx_ppb_b present
  [PASS] players(current_ability) index added: idx_players_current_ability present
  [WARN] searchTransferMarket: could not run — Cannot read properties of undefined (reading 'bind')
  [WARN] queryNpcSearchPool: could not run — Cannot read properties of undefined (reading 'bind')
  [PASS] npc_club_review_needs action_data parses: 0 row(s), all parse

PRAGMAS
  [PASS] foreign_keys is OFF: 0 — as required
  [WARN] journal_mode: memory — expected wal
  [PASS] busy_timeout: 5000
  [·] Recorded pragmas (12): synchronous 2
    cache_size -16000
    temp_store 0
    wal_autocheckpoint 1000
    auto_vacuum 0
    page_size 4096
    page_count 209
    freelist_count 12
    mmap_size null
    cache_spill 3871
    journal_size_limit -1
    secure_delete 0

SIZING
  [·] Database size: 0.8 MB (209 pages x 4096 B)
  [·] Dead space (freelist): 0.0 MB (12 pages) — not reclaimed, auto_vacuum is off by default
  [·] Per-object method: dbstat (real page weight)
  [·] Heaviest objects (12): world_clubs 0.0 MB across 1 page(s)
    uq_push_inbox_source 0.0 MB across 1 page(s)
    uq_player_youth_pool_player 0.0 MB across 1 page(s)
    uq_player_rating_player 0.0 MB across 1 page(s)
    transfers 0.0 MB across 1 page(s)
    transactions 0.0 MB across 1 page(s)
    tournament_save_index 0.0 MB across 1 page(s)
    store_state 0.0 MB across 1 page(s)
    staff_transfers 0.0 MB across 1 page(s)
    staff_club 0.0 MB across 1 page(s)
    staff 0.0 MB across 1 page(s)
    season_transition_steps 0.0 MB across 1 page(s)
  [·] wk.db: 0.0 MB
  [·] wk.db-wal: 0.0 MB
  [·] wk.db-shm: 0.0 MB

PLAYER POOLS
  [·] Pool totals: players 0 | club 0 | free 0 | foreign 0 | listed 0 | retired 0
  [PASS] Every player is in exactly one pool: no players outside the partition
  [PASS] No player is in two pools at once: none
  [PASS] Every listed player has a club row: none
  [PASS] player_club rows point at a real player: no orphans
  [PASS] player_free_transfer rows point at a real player: no orphans
  [PASS] player_foreign_transfer rows point at a real player: no orphans
  [PASS] player_transfer_list rows point at a real player: no orphans
  [PASS] scout_shortlist rows point at a real player: no orphans

BLOB WEIGHT
  [·] AMP first team blobs: 0 player(s) | development_log 0 B (max 0 B) | appearance_data 0 B
  [·] players table blobs: 0 row(s) | development_log 0.0 MB | appearance_data 0.0 MB
  [·] development_log within 52 snapshots: no player has a development_log yet

INIT CHECKPOINTS
  [·] One-time seeds applied: 0 of 17 checkpointed
    pending: 0001_scout_shortlist_is_shortlisted_backfill, staff_club_centralization_backfill, staff_club_amp_corruption_cleanup, staff_club_ghost_hire_cleanup_2026_09_29, 0002_players_assigned_coach_id_backfill, 0001_npc_club_ledger_backfill, 0001_promises_blob_migration, 0002_free_agency_season_backfill, sprite_staff_avatar_config_backfill, sprite_agents_avatar_config_backfill, sprite_staff_body_size_backfill, sprite_agents_body_size_backfill, sprite_player_appearance_backfill, sprite_player_avatar_extras_backfill, sprite_staff_avatar_extras_backfill, sprite_agents_avatar_extras_backfill, players_is_youth_age_floor_2026_10_19
    an EMPTY table is expected right after a restore — checkpoints are export-excluded, so every one-time seed re-runs on the next boot
  [·] Always-run seeds (never checkpointed): 4 run every boot by design
    player_club_amp_stray_club_id_repair_2026_10_24, player_foreign_transfer_clubbed_player_cleanup_2026_10_06, player_pool_exclusivity_repair_2026_11_04, player_stranded_no_pool_recovery_2026_10_11
  [·] Init checkpoints present: none
  [PASS] fixtures_generated matches the fixtures table: checkpoint unset, 0 fixture(s)
  [·] Starter squad recovery copy: ABSENT — a wipe would strand this account
```

---

## 8. Files

| file | before | after | |
|---|---|---|---|
| `src/components/debug/ChecksTab.tsx` | 763 | **458** | renderer only |
| `src/components/debug/checksReport.ts` | — | **485** | NEW — the report as data |
| `src/db/diagnostics.ts` | 2,652 | **2,749** | +97, almost all retirement/collapse rationale |
| `src/economy/economyDiagnostics.ts` | 224 | **496** | +272, the two new checks |

Tests: `checksReportCopy.test.ts` (9), `divisionSizeChecks.test.ts` (11),
`wageCoverageChecks.test.ts` (12) new; `diagnostics.test.ts`,
`writeMetricsDiagnostics.test.ts`, `worldPackVersion.test.ts` updated.

**`diagnostics.ts` grew while its output shrank**, and that is intentional: a retired check
leaves a comment explaining what it measured, which task it served and why that task is done, so
nobody re-adds it in six months. `b2.poolAbsorbed`'s note is nineteen lines for a two-line row.

---

## 9. `.context`

Appended **one** pass entry to `.context/shared/last-sync.md`. Corrected stage text this change
made wrong, nothing more — **no restructuring or pruning**, per §5:

- `07_synthesis/output/architecture-notes.md` — the boot-timeline paragraph named
  `ChecksTab.tsx` as `getBootTimeline()`'s consumer (now `checksReport.ts`) and the row as
  *"Splash stadium renders"*. ⚠️ **That second error was already stale before I arrived** — the
  row was renamed when the splash started drawing all four site sprites. Corrected both, and
  noted the timeline row is now collapsed with the full trace in `full`.
- `02_architecture/output/structure.md` — same consumer correction.
- `05_ui/output/patterns.md` — noted both splash rows are assembled in `checksReport.ts` and the
  per-level list is collapsed.

### 🔴 Flagged for the PM, not acted on

1. **Three diagnostic probes have NO callers anywhere in `src/`:**
   `runIndexCounterfactualProbe` (D14), `runAnalyzePlanProbe` (D10), `runVacuumIntoProbe` (D9).
   Their module docs describe them as TOOLS buttons behind a confirmation; `grep -rn` across
   `src/` finds references only inside `diagnostics.ts` itself and its test. **They cost the
   report nothing** — they are not in it, which is why retiring them was outside this pass's
   scope — but someone should decide whether TOOLS lost its buttons or they were never wired.
   They are ~250 lines of `diagnostics.ts`.
2. **`b2.poolAbsorbed`'s retirement leaves nothing printing the pool query's plan on a device.**
   I judged that correct (the D14 probe answers it properly, with the index present and
   statistics rebuilt for it, which the retired row could not). Worth knowing it is a real,
   deliberate loss of visibility rather than a free win.
3. **`game-mechanics.md` §13.6 now carries three layers of history over one rule** — A6's
   inventory, A7's drift, A8's strike-throughs. A8's handover flagged this too. Accurate;
   condensing is the PM's call.
4. **`FALLBACK_DIVISION_SIZE = 17`** is still the app's only answer when no authored size is in
   hand, and `divisionSizeChecks` will print `slots —` for every pack-sourced league until the
   backend publishes one. The natural home named in the code is
   `economyTierBaseline.tiers[].slots`, beside the per-tier ticket price the same screens already
   read. **Publishing it would turn the new check's best row from two-way into three-way on every
   league**, which is the single change that would most increase its value.

---

## 10. Scope discipline

- **Nothing scratch-shaped written inside either repository.** The BEFORE/AFTER harness lives in
  my scratchpad; `node_modules` was symlinked there so jest could resolve from outside the repo.
- **No check's measurement changed.** Retired, collapsed, added. The one thing that came close —
  WRITE COST collapsing by status rather than rank — changes which rows are *shown*, not what any
  figure measures, and every figure still reaches the clipboard.
- **Did not work in `wunderkind-backend`** (read two files to verify §0.2). **Did not change
  `WORLD_PACK_VERSION`. Did not push. Did not deploy.**
