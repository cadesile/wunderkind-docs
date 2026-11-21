# `.context` (ICM) Read-Only Codebase Audit — `wunderkind-app`

- **Repository:** `/Users/courtneyadesile/Documents/WunderkindFactory/wunderkind-app`
- **Branch / Commit:** `new-game-save` @ `22443e24` (`2026-11-20`, clean working tree)
- **Audit Mode:** Strictly read-only — zero modifications to `wunderkind-app` or `.context/`
- **Total `.context/` Footprint:** **1,923,446 bytes (~480,862 est. tokens)** across 34 Markdown files (+ 4 untracked `.DS_Store` files = 36,880 bytes)

---

## Executive Summary

`.context/CONTEXT.md` states the core ICM premise: *"so an agent loads only the couple thousand tokens relevant to its task instead of everything at once."*

In practice, `.context/` has grown into an **append-only engineering diary**: single stage output files now cost **25k–55k tokens** (`game-mechanics.md` 222 KB, `services.md` 192 KB, `patterns.md` 191 KB, `current-focus.md` 109 KB, `architecture-notes.md` 99 KB), and `.context/shared/last-sync.md` alone is **422 KB (~105.6k tokens)** while breaking the `SKILL.md` staleness-check header format. Across the repository, multi-file duplication and the habit of appending dated *"Correction:"* paragraphs beneath stale statements instead of editing in place have introduced **hard factual contradictions against live code**—even inside files updated on `2026-11-20`.

---

## Summary Table: All `.context` Files & Root Agent Entrypoints

| File | Size (Lines) | Purpose | Accuracy Status | Cold-Start Value | Key Findings |
|---|---:|---|---|---|---|
| `CLAUDE.md` | 35.7 KB (435 L) | Auto-loaded root brief & binding-rule mirror (gitignored) | **Partial Drift** | **High** | Omits 10 rules from `tribal-knowledge.md` Q4; has 6 `new-game-save` test rows not mirrored back to `environment.md` (reverse drift); misses 2026-11-20 test warnings; stale repo count (`45/46` vs `46/47`); dead `assets/Components/...` path. |
| `AGENTS.md` | 2.0 KB (38 L) | Thin ICM pointer for generic agents (gitignored) | **Accurate** | **Medium** | Clean pointer block matching `CLAUDE.md:4-41`. |
| `GEMINI.md` | 2.9 KB (57 L) | Local Gemini working brief (gitignored) | **Stale** | **Low** | Lines 48–54 still claim only "four non-negotiables" owned solely by `CLAUDE.md`—contradicting `.context/CONTEXT.md:39-58` and `tribal-knowledge.md` Q4's 20+ binding rules. |
| `.context/CONTEXT.md` | 7.3 KB (95 L) | Layer-1 ICM router & stage index | **Partial Drift** | **High** | Broken relative links (`../shared/last-sync.md`, `../shared/token-savings.md` at L68–69); stale "Known gaps" claiming deleted `docs/wunderkind-app-context*.md` still exist (L85–87) and `03_engine` has no home (L93–95). |
| `.context/shared/stack.md` | 3.5 KB (52 L) | Canonical tech stack & dev environment | **Partial Drift** | **High** | SDK/RN/Node/Drizzle versions accurate; falsely claims `main: "expo-router/entry"` (actual `package.json:4`: `"main": "index.js"`); omits `src/bootstrap/`, `src/economy/`, `src/i18n/`, `src/__tests__/`. |
| `.context/shared/competition-testing.md` | 0.2 KB (3 L) | Stray Symfony console commands | **Stale** | **Low** | Orphaned 3-line backend scratchpad from `2026-09-28`; zero inbound references anywhere in `.context/`. |
| `.context/shared/last-sync.md` | 422.5 KB (5,748 L) | Staleness anchor & chronological pass log | **Stale** | **Low** | **~105.6k tokens** (22% of `.context/`); breaks `SKILL.md:53` (no top-level `- **Commit:**` header; first is L150); split-brain ordering (prepended at top, appended at bottom); 8 of last 20 commits missing by SHA. |
| `.context/shared/token-savings.md` | 21.6 KB (286 L) | Load-scope token estimates | **Stale** | **Low** | Last measured `2026-11-15/16`; claims `Everything = 335,077` vs actual **367,268** (+9.6%) and `07_synthesis = 89,503` vs **111,498** (+24.6%, now the largest stage); excludes 454 KB of `.context/shared/`. |
| `.context/shared/usage-savings-log.md` | 10.1 KB (67 L) | Task-level token savings log | **Partial Drift** | **Low** | Arithmetic sum valid (15 rows = `1,430,299`), but out of chronological order (L31 `2026-11-15` above `2026-09-19`), stale `GameLoop.ts` line count (5,900 vs 6,995), and stale claim (L47–54) that game-loop internals have no stage. |
| `.context/stages/*/CONTEXT.md` (7 files) | 16.5 KB (303 L) | Layer-2 vendored stage authoring contracts | **Partial Drift** | **Low** | Wrong stage titles in `06_documentation/CONTEXT.md:1` (`Stage 05`) & `07_synthesis/CONTEXT.md:1` (`Stage 06`); broken relative links to skill-only `references/*`/`_core/*`; `05_ui/CONTEXT.md:24` cites outdated `~250 lines` & 5 `TYPE` steps. |
| `.context/stages/01_overview/output/environment.md` | 38.0 KB (462 L) | Commands, branching, OTA, green-master bar | **Partial Drift** | **High** | Strong operational reference, but omits all 7 `i18n:*` scripts; Sentry OTA upload docs (L439, L446) contradict live workflows; omits Node 22 on OTA workflows; dead `assets/Components/location_new_game/INTEGRATION.md` path (L220). |
| `.context/stages/01_overview/output/tribal-knowledge.md` | 47.8 KB (600 L) | Canonical BINDING rules (Q4) & historical traps | **Partial Drift** | **High** | Highest-leverage invariant doc in `.context/`, but stale repo count at L145/152 (`45/46` vs actual `46/47` at `portedRepositoryArchitecture.test.ts:471`) and Q5 (L552) contradicts `index.md:276` on worklist status. |
| `.context/stages/02_architecture/output/structure.md` | 77.7 KB (957 L) | Module & directory map | **Stale** | **Medium** | Almost every file count is stale (`src/__tests__/`: 247 vs **659**; `src/economy/`: 24 vs **35**; `src/screens/`: 57 vs **86**; `src/api/`: 26 vs **42**); misses `src/bootstrap/`, `src/engine/reputation/`, `src/hooks/db/`, `src/components/new-game-setup/` (32 files), `teletext/`; cites deleted `app/club/[id].tsx` 4× and falsely claims `SeasonEndTeletext` is unused (L895–897). |
| `.context/stages/02_architecture/output/git-activity.md` | 2.8 KB (55 L) | Commit hotspot map | **Stale** | **Low** | 1,269 commits stale (last full run `2026-09-22`); does not even list `src/economy/` (#2 non-test hotspot at 87 touches in last 150 commits) and still claims recent focus is the `competition` branch merge. |
| `.context/stages/03_data/output/schema.md` | 48.9 KB (640 L) | SQLite / Drizzle table catalog | **Partial Drift** | **Medium** | All 57 tables present (test-guarded), but stale repo count (`45/46` vs `46/47`), omits `idx_players_pending_intake`, lists removed v11 `world_clubs.land.valuePence` as live, describes dead `save_games` as active, and embeds 75 lines of Android SIGSEGV postmortem inside `tables/players.ts`. |
| `.context/stages/03_data/output/migrations.md` | 38.7 KB (535 L) | Drizzle migration log & recovery rules | **Stale** | **Medium** | Header claims "14 migrations `0000`–`0013`" (actual: **22**, `0000`–`0021`); **factually wrong** `extractMigrationStatements` recovery claim for `0007`/`0008` (L93–94); `0015` before `0014`; `0014` text mis-pasted onto `0016` (L372–373); `0017`/`0018` omitted; misses `migrate.ts` WAL/leak invariants. |
| `.context/stages/03_data/output/entities.md` | 19.3 KB (282 L) | Core domain entity shapes | **Partial Drift** | **Medium** | Clear player/staff pointer summary, but stale on A24 & A27 (still claims scout wage wiring & 7-key `ScoutJudgements` unlanded); omits `ClubBudget.createdWeek`, `player_youth_pool`, `player_rating`, and 20 of 34 `src/types/*.ts` files. |
| `.context/stages/03_data/output/state.md` | 64.3 KB (902 L) | Zustand stores & persistence boundaries | **Stale** | **Low** | Wrong store counts (`56` / `7 of 65` / `4` vs actual **68 files / 66 stores**, **9** `persist()` total); double-classifies `ownerProfileStore`; misclassifies manual-AsyncStorage `gameConfigStore`; misses 13 stores; claims dropped `0015` tournament tables still exist (L237–257); false claim that nothing else writes `store_state` (L368–378). |
| `.context/stages/04_interfaces/output/routes.md` | 66.2 KB (775 L) | Backend HTTP endpoint catalog & contracts | **Partial Drift** | **Medium** | Misses `POST /api/account/delete` and `GET`/`POST /api/club/kit-identity`; lists deleted `tournaments.ts` as "NOT deletable" (L24); self-contradicts on Tournament Hub endpoints (L25 vs L158–169); stale claim on `DofStaffHiringService` tier gate (L16); misses v11 `InitLeague` fields (`sponsorCount`/`sponsorSizes`/`packVersion`). |
| `.context/stages/04_interfaces/output/controllers.md` | 1.6 KB (27 L) | Request-triggering hooks/handlers map | **Stale** | **Low** | 2 of 12 listed files deleted (`useAvailableTournaments.ts`, `TournamentRegistrationService.ts`), 2 are dead code (`marketMutations.ts`, `syncMutations.ts`), and 55+ real request-triggering files are missing. |
| `.context/stages/04_interfaces/output/services.md` | 191.8 KB (2,575 L) | Service-layer contracts & history | **Stale** | **Low** | >85% chronological dev-diary/postmortems; misses **33/35 `src/economy/`** (94.3%) and **49/110 `src/engine/`** (44.5%); **today's** `dofHireCharge.ts` section (L1081–1117) is already wrong on exports, return shape, and `drawDofContractCharge`; retains deleted pre-hub tournament/push prose (L213–250, L631–635). |
| `.context/stages/05_ui/output/design-system.md` | 44.8 KB (373 L) | Authoritative UI tokens & primitive rules | **Partial Drift** | **High** | 100% exact on all 30 `WK` colors, `SURFACE`, `OUTCOME`, `TYPE` (7 steps), `SPACING`, `BORDER_WIDTH`, `ICON_SIZE`, shadows. Drift: omits 4 `theme.ts` exports (`PODIUM_COLOUR`, `CARD_COLOUR`, `CHART_SERIES`, `traitColor`), says "five-step" (L11) & "`hero` is the one exception" (L142–143), wrong `Button` variant (`accent` vs `'yellow'`). |
| `.context/stages/05_ui/output/design-system-notes.md` | 57.9 KB (858 L) | Token rationale & sprite engineering | **Stale** | **Medium** | 69.4% is unique sprite engineering (§7); cites deleted `app/club/[id].tsx` (3×), wrong filename `stadiumLevelCache.ts`, removed hue tokens (`WK.yellow`, `WK.tealDark`, `WK.border`), and contradicts live code on `facility=`, `<Rect>` vs `<Path>`, `surrounds`, and `Pressable`. |
| `.context/stages/05_ui/output/navigation.md` | 38.8 KB (542 L) | Expo Router tree, drawer & Back-FAB | **Stale** | **Medium** | Misses primary setup route `app/(pre-game)/setup.tsx` and `app/(app)/office/assistant.tsx`; cites deleted `useCrossClubEarnings.ts` & `TournamentMatchScreen`; wrong `OwnerIdentityCard` target (`profile.tsx` vs `/setup?mode=profile`); removed hue tokens; dead Back-FAB routes. |
| `.context/stages/05_ui/output/patterns.md` | 191.4 KB (2,623 L) | UI component patterns & screen notes | **Partial Drift** | **Low** | Only **13.3%** is reusable UI patterns (60% screen changelogs, 25.2% postmortems); verbatim internal duplicates (L1452 vs L1491; L2473 vs L2524); `RatingStars` buried inside `## The boot splash` (L1596–1672); live advice for deleted `DecisionScreen` (L1567–1572). |
| `.context/stages/05_ui/output/compliance-review.md` | 24.2 KB (364 L) | Design-system audit & ratchet baselines | **Stale** | **Low** | Behind live `designSystemSource.test.ts` (post-`NEW_GAME_SETUP_DEFERRED` exemption); lists deleted `MotivationFlame.tsx`, deleted `app/club/[id].tsx`, fixed `DevelopmentChart.tsx`, and already-localized `CANCEL`/`BACK`/`SAVE` strings as open findings. |
| `.context/stages/06_documentation/output/index.md` | 54.4 KB (300 L) | Repo markdown documentation index | **Partial Drift** | **Medium** | Falsely says `src/db/drizzle/README.md` is "never a query layer" (L13); malformed table row (L28); lists deleted `untranslated-strings-audit.md` (L126); omits `npc-club-profile-integration.md`, `jest/drizzleTestHarness/README.md`, `2026-09-26-centralized-staff-sqlite-poaching-design.md`, and 36 `.superpowers/sdd/*.md` files. |
| `.context/stages/07_synthesis/output/overview.md` | 3.6 KB (50 L) | One-page architectural orientation | **Partial Drift** | **High** | Crisp cold-start entry, but omits `src/economy/`, `src/stores/`, `src/bootstrap/`, `src/i18n/`; calls `src/engine/` "flat"; points binding rules to `CLAUDE.md`; cites deleted `docs/superpowers/plans/`. |
| `.context/stages/07_synthesis/output/game-mechanics.md` | 222.0 KB (3,098 L) | Live simulation & economy rules | **Partial Drift** | **Medium** | Latest `2026-11-20` DOF/scout commits landed, **but** contains 4 hard factual errors (denies live `ticketElasticity`, denies NPC `facilities` writes, wrong `setBudgetAllocation` formula, wrong NPC ticket price source), internal contradictions, 12 stale line refs, and omits `SelectionService`/`ResultsEngine`. |
| `.context/stages/07_synthesis/output/architecture-notes.md` | 98.7 KB (1,406 L) | Cross-cutting subsystem notes | **Stale** | **Low** | 52% is a Nov 1 crash/boot diary; wrong i18n count (`~2,600` vs `5,022`), misses `tournamentHttp.ts` in `withLang()`, wrong `zustandStorage` list (`authStore` vs `revealedResultsStore`), contradicts `game-mechanics.md` on `assessYouthPlayer` & `npcContractRenewalEngine`. |
| `.context/stages/07_synthesis/output/current-focus.md` | 108.6 KB (1,474 L) | Active workstreams & open issues | **Stale** | **Low** | Verbatim 45-line duplicate (`:3-47` & `:554-596`); broken chronology (`2026-11-15` spliced into Sep 2026 at L1425); zero coverage of active Nov 16–20 A12–A28/B1 workstream; stale test (`538/9,048` vs `659/11,057`) & i18n (`4,624` vs `5,022`) counts. |

---

## 1. Structure & Routing Efficiency

### 1.1 Complete `.context` Directory Tree & Entrypoints

- **Root agent entrypoints (all gitignored):**
  - `CLAUDE.md` — 35,747 bytes / 435 lines
  - `AGENTS.md` — 2,029 bytes / 38 lines
  - `GEMINI.md` — 2,864 bytes / 57 lines
  - `.cursorrules` / `.github/copilot-instructions.md` — not present
- **`.context/` tree (34 `.md` files = 1,923,446 B; 4 `.DS_Store` files = 36,880 B):**

```text
.context/
├── .DS_Store                               (10,244 B)
├── CONTEXT.md                              ( 7,326 B,    95 L)  ← Layer-1 Router
├── shared/
│   ├── competition-testing.md              (   242 B,     3 L)  ← Orphaned backend scratchpad
│   ├── last-sync.md                        (422,481 B, 5,748 L) ← Bloated log; missing top commit
│   ├── stack.md                            ( 3,547 B,    52 L)
│   ├── token-savings.md                    (21,591 B,   286 L)
│   └── usage-savings-log.md                (10,062 B,    67 L)
└── stages/
    ├── .DS_Store                           (10,244 B)
    ├── 01_overview/
    │   ├── CONTEXT.md                      ( 4,056 B,    71 L)
    │   └── output/
    │       ├── environment.md              (38,018 B,   462 L)
    │       └── tribal-knowledge.md         (47,760 B,   600 L)
    ├── 02_architecture/
    │   ├── CONTEXT.md                      ( 1,984 B,    41 L)
    │   └── output/
    │       ├── git-activity.md             ( 2,846 B,    55 L)
    │       └── structure.md                (77,650 B,   957 L)
    ├── 03_data/
    │   ├── .DS_Store                       ( 8,196 B)
    │   ├── CONTEXT.md                      ( 2,318 B,    43 L)
    │   └── output/
    │       ├── entities.md                 (19,311 B,   282 L)
    │       ├── migrations.md               (38,741 B,   535 L)
    │       ├── schema.md                   (48,901 B,   640 L)
    │       └── state.md                    (64,329 B,   902 L)
    ├── 04_interfaces/
    │   ├── CONTEXT.md                      ( 2,251 B,    42 L)
    │   └── output/
    │       ├── controllers.md              ( 1,610 B,    27 L)
    │       ├── routes.md                   (66,214 B,   775 L)
    │       └── services.md                 (191,834 B, 2,575 L)
    ├── 05_ui/
    │   ├── .DS_Store                       ( 8,196 B)
    │   ├── CONTEXT.md                      ( 2,310 B,    35 L)
    │   └── output/
    │       ├── compliance-review.md        (24,231 B,   364 L)
    │       ├── design-system-notes.md      (57,870 B,   858 L)
    │       ├── design-system.md            (44,820 B,   373 L)
    │       ├── navigation.md               (38,769 B,   542 L)
    │       └── patterns.md                 (191,415 B, 2,623 L)
    ├── 06_documentation/
    │   ├── CONTEXT.md                      ( 1,402 B,    33 L)
    │   └── output/
    │       └── index.md                    (54,436 B,   300 L)
    └── 07_synthesis/
        ├── CONTEXT.md                      ( 2,190 B,    38 L)
        └── output/
            ├── architecture-notes.md       (98,745 B, 1,406 L)
            ├── current-focus.md            (108,646 B, 1,474 L)
            ├── game-mechanics.md           (221,964 B, 3,098 L)
            └── overview.md                 ( 3,576 B,    50 L)
```

### 1.2 Cold-Start Progressive Disclosure Hop & Token Costs

| Target Knowledge | Entry → Hops (Gemini / Agents) | Entry → Hops (Claude) | Files Required | Bytes / ~Tokens Traversed | Signal-to-Noise Verdict |
|---|---|---|---:|---:|---|
| **DB Invariants** (`players`, repos, `withSafeTransaction`, `pickClubState`) | `GEMINI.md` → `CONTEXT.md` → `tribal-knowledge.md` + `schema.md` + `state.md` (**3 hops**) | `CLAUDE.md` → `schema.md` + `state.md` (**2 hops**) | 3–5 | 149–171 KB (~37–43k tok) | **Medium** — rules clear in Q4/`CLAUDE.md`, but locking/concurrency rules absent from `03_data`. |
| **Economy Constants & Wage Pricing** | Entry → `CONTEXT.md` → `game-mechanics.md` (§8, §12, §13) + `services.md` (**3 hops**) | Same (**3 hops**) | 3–4 | 232–457 KB (~58–114k tok) | **Very Low** — no constants table; 222 KB file has struck-out claims and live contradictions (`ticketElasticity`, `incomeAnchoredWages`). |
| **DOF Budget / Pot Rules** | Entry → `CONTEXT.md` → `game-mechanics.md` + `state.md` + `services.md` (**3–4 hops**) | Same (**3 hops**) | 3–5 | 296–488 KB (~74–122k tok) | **Low** — buried mid-file under stale formula (`:1546`); `services.md:1081-1117` contradicts live `dofHireCharge.ts`. |
| **AMP vs NPC Simulation Rules** | Entry → `CONTEXT.md` → `game-mechanics.md` + `architecture-notes.md` (**3–4 hops**) | Same (**3–4 hops**) | 4–5 | 331–364 KB (~83–91k tok) | **Very Low** — no AMP-vs-NPC matrix; `SelectionService` perceived-vs-true rule lives *only* in `architecture-notes.md:535-565`, not `game-mechanics.md`. |

### 1.3 Broken, Circular, and Misleading Links / Mirror Parity Failures

- **Broken relative paths in `.context/CONTEXT.md`:**
  - `.context/CONTEXT.md:68-69`: writes `` `../shared/last-sync.md` `` and `` `../shared/token-savings.md` `` — resolves to `<repo-root>/shared/` (non-existent), not `.context/shared/`.
  - `.context/CONTEXT.md:31`: writes `../shared/stack.md` (relative to `stages/01_overview/`, inconsistent with the router's own location; compare L84 `shared/stack.md`).
- **Stale "Known gaps" in `.context/CONTEXT.md`:**
  - `.context/CONTEXT.md:85-87`: says `docs/wunderkind-app-context*.md` were "recommended for deletion, not deleted" — all 3 were deleted `2026-11-02` (`tribal-knowledge.md:590`, `index.md:196`).
  - `.context/CONTEXT.md:93-95`: says `02_data` and `03_engine` are still uncreated and refers to `CLAUDE.md`'s old table — `03_data` covers data and `CLAUDE.md:425-431` was corrected `2026-10-31` when `game-mechanics.md` landed.
- **Wrong stage numbers & broken skill-relative links in `.context/stages/*/CONTEXT.md`:**
  - `06_documentation/CONTEXT.md:1`: `# Stage 05: Documentation — Index Existing Docs`
  - `07_synthesis/CONTEXT.md:1`: `# Stage 06: Synthesis — Cross-Stage Overview`
  - Broken vendored links (targets only exist under `.agents/skills/icm-codebase-context/`): `01_overview/CONTEXT.md:12,26,71` (`references/stack-signals.md`, `setup/questionnaire.md`), `03_data/CONTEXT.md:10` (`references/revise-not-rewrite.md`), `04_interfaces/CONTEXT.md:11` (`../03_data/references/revise-not-rewrite.md`), `05_ui/CONTEXT.md:11` (`_core/conventions.md`).
  - `05_ui/CONTEXT.md:24`: claims `design-system.md` is `~250 lines` and cites a 5-step `TYPE` scale (actual: 373 L / 44.8 KB, 7 steps); severely under-describes `patterns.md` (3 topics vs 35 sections / 191 KB).
- **Circular / contradictory pointer:** `03_data/output/entities.md:277-282` correctly states there are no tournament tables in SQLite and points to `state.md`, whose section at `03_data/output/state.md:237-257` falsely claims those 4 dropped tables still exist.
- **Mirror parity breakdown (`tribal-knowledge.md` / `environment.md` ↔ `CLAUDE.md` ↔ `GEMINI.md`):**
  - `GEMINI.md:48,52-54` still says *"The four non-negotiables... are stated in full in `CLAUDE.md`, which is the single source for them"* — directly contradicting `.context/CONTEXT.md:39-58` and missing ~16+ binding rules added since.
  - `CLAUDE.md:43-303` omits **10 binding rules** present in `tribal-knowledge.md` Q4: Tournament rollout (`L225-242`), eleven-available-bodies rule (`L298-309`), fortnightly NPC injury decrement (`L311-316`), `EMERGENCY` vs `CRITICAL` tiers (`L318-336`), `GameLoop` rotation bypass (`L338-346`), `npcSquadBand` (`L348-363`), per-`(club, POSITION)` emergency backoff (`L365-371`), `clearEmergencyCooldowns()` placement (`L373-379`), `squadAvailability.ts` predicate (`L381-389`), and the `starter_config.league_ability_ranges` outlier (`L510-539`).
  - `environment.md:42` explicitly admits **reverse-direction drift**: *"The A28 rows are recorded in `CLAUDE.md` and are not reproduced here"*, violating the one-way `.context/` → `CLAUDE.md` rule; meanwhile `CLAUDE.md` omits `environment.md:50-67`'s two critical `2026-11-20` test warnings (`THREE TO FIVE FAILURES` is the backend's; loaded machine fabricates failures).
- **Dead external / drop paths cited as live:**
  - `assets/Components/location_new_game/INTEGRATION.md` (`CLAUDE.md:370`, `environment.md:220`) — `assets/Components/` does not exist in this repo.
  - `assets/Components/{AvatarV3,avatar16,trophy16,stadium-v3,facilitiesV2}` (`structure.md:420-696`) — do not exist.
  - `docs/economy-loose-ends/dof-pot-refund-report.md` (`CLAUDE.md:328`, `environment.md:42`) — lives outside this repo in the parent workspace.

---

## 2. Accuracy & Drift Detection (Evidence by Stage)

### 2.1 Stage `07_synthesis` & Economy / Simulation Rules

#### Hard Factual Errors in `07_synthesis/output/game-mechanics.md` (3,098 L / 222.0 KB)
1. **Ticket Price Elasticity falsely denied (`game-mechanics.md:890-892`):**
   - Doc: *"There is NO price term in attendance. Raising the ticket price raises gate income linearly… A price elasticity would belong here and does not exist."*
   - Code (`src/economy/ticketElasticity.ts:40-57` & `src/utils/matchdayIncome.ts:308-332`): Elasticity **exists and is live** whenever `wageModel === 'turnover'` (`const elasticityOn = liveCfg.ticketPriceElasticity ?? (liveCfg.economyTierBaseline?.wageModel === 'turnover')`), applying `e^(-0.75 * (r - 1))` inside `calculateAttendanceCount`.
2. **NPC `worldClub.facilities` writes falsely denied (`game-mechanics.md:231-232`):**
   - Doc §5: *"NPC academy levels never change after world init — nothing in the codebase writes `worldClub.facilities` after `buildWorldLeagueClubs`."*
   - Code (`src/engine/GameLoop.ts:2275-2276, 2292-2310`) & Doc §13.3 (`:2728`) & §9 (`:2363`): `GameLoop.ts` mutates `npcClub.facilities` on `upgrade_facility` and `sell_facility`, and `NpcRescueService` upgrades 3 facility levels on rescue.
3. **Wrong `setBudgetAllocation` formula (`game-mechanics.md:1546-1547`):**
   - Doc: *"`transferBudget`, `facilitiesBudget` and `chairmanBudget` are pence, recomputed as `balance × pct/100` by `setBudgetAllocation`."*
   - Code (`src/stores/clubStore.ts:598-603, 1033-1035`): Computed from `allocatableBalancePence(state.club)` (`max(0, balance - (wageFloorPence + maintenanceReservationPence))`), and `transferBudget` additionally subtracts `carriedDofWageCommitmentPence` via `carriedTransferBudgetPence(...)`.
4. **Wrong NPC ticket price source (`game-mechanics.md:925-926, 2546`):**
   - Doc: Claims NPC ticket prices come from `recommendPricing` / `TIER_BASE_PRICES`.
   - Code (`src/utils/npcFinances.ts:104, 153`): Calls `advisedTicketPricePence({ leagueTier, ... })` (`src/economy/perTierEconomy.ts`), which reads published per-tier `ticketPricePence` first.
5. **Internal contradictions in `game-mechanics.md`:**
   - `:1035-1038` & `:2376` still state `incomeAnchoredWages` is OFF, contradicting `:1738-1748` & `:2743-2756` (live `economyConfig.ts:187` derives `true` on `turnover`).
   - `:1557` says `The row above says "Contract renewals never touch it"`, contradicting `:1551` (updated in `22443e24`).
   - `:2988-2994` claims Scotland has never been captured/measured, contradicting `:1742` and `:1815` (measured against `game-config-sc.LIVE.json`).
   - Overruled `slots` prose (`:2925-2995`) remains inline ahead of its override.
6. **Stale §10 "Register of what does NOT work" (`:2529-2590`):**
   - 6 rows (`:2548-2556`) are already **FIXED** (`processNpcContractExpiry`, `processNpcContractRenewals`, foreign-pool wipe, `DofBrain` position-cooldown, `chairmanAuto*`, `HarnessOptions.rng`).
   - `:2559-2590` dumps `ManagerBrain` i18n catalog migration notes inside §10.
   - `src/economy/relegationClause.ts` has **zero non-test callers** (dead code) and is missing from §10.
7. **12 verified drifted `file:line` citations in `game-mechanics.md`:** `GameLoop.ts:1573` (`:324`), `:1895` (`:2406`, actual `:1576`), `:3103-3104` (`:2023`), `:5415` (`:1553`), `:6175` & `:6222-6233` (`:2042, 2046`); `SeasonTransitionService.ts:1656, 2499, 2828, 3896` (`:3036, 2043, 2044`); `gameConfig.ts:763-781, 1371-1373` (`:2544-2546`); `NpcClubBrain.ts:418-499` (`:2227`); `npcTransferExecutors.ts:256` (`:2233`).
8. **Recent `2026-11-20` commit verification (`new-game-save`):** `9bac0b18`, `7b56c6c8`, `ac71159b`, `4113d326`, `598ff158`, `9f46bf66`, `6fb687a0`, `0c52ec6c`, `4719b469`, `4ea3c5be`, `39b3c884` ARE reflected in `game-mechanics.md` (landed in `22443e24`), subject to the residual contradictions above.

#### Drifts in `07_synthesis/output/overview.md`, `architecture-notes.md`, `current-focus.md`
- **`overview.md` (50 L):**
  - `:17-18` cites `CLAUDE.md` as BINDING rule owner instead of `tribal-knowledge.md` Q4.
  - `:33-38` omits `src/economy/`, `src/stores/`, `src/hooks/`, `src/bootstrap/`, `src/i18n/`, and calls `src/engine/` "flat" (has `reputation/` and `youth/`).
  - `:40-43` cites `docs/superpowers/` plans (only `docs/superpowers/specs/` remains; `plans/` was pruned `2026-11-02`).
- **`architecture-notes.md` (1,406 L / 98.7 KB):**
  - `:190-193`: cites `CLAUDE.md` as the one home for the i18n rule.
  - `:226`: claims `"~2,600 entries"` in `locales/en/translations.json` (actual: **5,022**).
  - `:233-239`: claims exactly 3 endpoints call `withLang()` — misses `src/api/tournamentHttp.ts:3,44,48`.
  - `:595-600`: puts `authStore` (actually `secureAuthStorage`) in the 5-store `zustandStorage` list instead of `revealedResultsStore`.
  - `:638-653`: contradicts `game-mechanics.md` by claiming `ManagerBrain.assessYouthPlayer` and `npcContractRenewalEngine.ts` were left untouched (both fixed `2026-11-10`).
  - `:399-592`: "Player star ratings" misses `2026-11-20` A28 changes (`MAX_MANAGER_NOISE_SPREAD = 40`, `MAX_BOND_BIAS = 12`, `bondDecayFloor = 20`).
- **`current-focus.md` (1,474 L / 108.6 KB):**
  - Verbatim 45-line merge duplicate: `## SHIPPED 2026-11-11 — the DOF raises more proposals, and you can see why` appears at `:3-47` AND `:554-596` (with diverged `chairmanAuto*` paragraphs).
  - Broken chronology: `:1420-1423` still calls the Cup/Tournament system "the newest, least structurally settled part of the app", followed immediately by a `2026-11-15` section (`:1425`) spliced into `2026-09` history (`:1457`).
  - Zero coverage of the active `2026-11-16..20` workstream (`A12`, `A17`, `A23`, `A24`, `A26`, `A27`, `A28`, `B1` DOF pot ledger & refund).
  - Stale counts & paths: tests `538 / 9,048` (`:66`) & `549 / 9,276` (`:99`) vs actual **659 / 11,057**; i18n `4,624` (`:67`) & `4,714` (`:100`) vs **5,022**; deleted `TournamentMatchResultScreen` (`:1392`) and `docs/superpowers/plans/` (`:1469`).

---

### 2.2 Stage `04_interfaces` (`routes.md`, `controllers.md`, `services.md`)

- **`services.md` (2,575 L / 191.8 KB):**
  - **Same-day drift on `src/economy/dofHireCharge.ts` (`services.md:1081-1117`, dated `2026-11-20`):**
    - Claims "Two exports" — code (`dofHireCharge.ts:180`) has **three** (`dofSigningDraw`).
    - Claims 3-field return `{ feePence, wageCommitmentPence, totalPence }` — code (`dofHireCharge.ts:56-80,138-145`) returns **5 fields** (adds `wageWeeklyPence`, `wageWeeksCommitted`).
    - Claims "all five sites draw `spendTransferBudget(charge.totalPence)`" — code (`DofStaffHiringService.ts:145-160`, `GameLoop.ts:5705-5716,5901`, `TransferService.ts:432-437`, `app/staff/[id].tsx:259-394`) has **6 sites** and all call **`drawDofContractCharge(...)`** (explicitly forbidding `spendTransferBudget`).
  - **Transport inaccuracies (`services.md:5-7,57-64`):** claims 3 `auth.ts` bypasses (actual: 2 in `auth.ts` + `telemetry.ts` + `tournamentHttp.ts`) and 1 non-10s timeout (actual: **8** — `initialize/starter` 60s, `initialize/league/:tier` 60s, `initialize/leagues` 30s, `scout/search` 30s, `conclude-season` 30s, `players/youth` 15s, `scout/foreign-clubs` 15s, `telemetry` 6s).
  - **Retained deleted pre-hub prose (`services.md:213-250, 631-635`):** still documents deleted `TournamentRegistrationService.ts`, `RegisterControls`, `tournaments.ts`, and `saveTournamentMatchResult()` in present tense; L192–194 claims `PushInboxService.ingestMatchResultEvent` "still runs" (actual `PushInboxService.ts:21-26`: zero producers).
  - **Deleted/moved UI paths cited:** `app/club/[id].tsx` (`L1067,1689`), `HireStaffSheet.tsx` (`L1032`), `StaffBondsSection.tsx` (`L1050`), `StaffProfileOverlay.tsx` (`L1018,1030`).
- **`routes.md` (775 L / 66.2 KB):**
  - Lists deleted `src/api/endpoints/tournaments.ts` as "NOT deletable" (`L24`).
  - Lists uncalled dead file `src/api/endpoints/marketData.ts` as active (`L18`).
  - Self-contradicts on Tournament Hub endpoints (`L25` says 3 endpoints/ETag don't exist; `L158-169` says they do).
  - Claims `DofStaffHiringService` has no tier gate (`L16`) — gated since `2026-11-06` (`src/engine/DofStaffHiringService.ts:38-46,84`).
  - `L637-639` attributes `tvPoolPence`/`clubCount`/`parachute` to `GET /api/initialize/leagues` (`InitLeague` in `src/api/endpoints/initialize.ts:35-89` does not type them; meanwhile it omits v11 fields `trophy`, `sponsorCount`, `sponsorSizes`, and `InitLeagueTierResponse.data.packVersion` at `:133`).
  - `L34` still locates `syncCountries()` in `app/_layout.tsx` (moved to `src/bootstrap/useGlobalDataSync.ts:44`); `L424` groups `/enrichment-quota` under `accountLedger.ts` (lives in `src/api/endpoints/locations.ts:229-231`).
- **`controllers.md` (27 L / 1.6 KB):**
  - 2 of 12 listed files deleted (`src/hooks/useAvailableTournaments.ts`, `src/engine/TournamentRegistrationService.ts`).
  - 2 of 12 listed files are dead code with zero callers (`src/api/mutations/marketMutations.ts`, `src/api/mutations/syncMutations.ts`) and L14's `(see services.md)` pointer goes nowhere.
  - Mislabels `useAuthFlow`, `useGameConfigSync`, `useInitFlow` under "React Query hooks" (they do not use TanStack Query).

---

### 2.3 Stage `03_data` (`schema.md`, `migrations.md`, `entities.md`, `state.md`)

- **`schema.md` (640 L / 48.9 KB):**
  - All 57 SQLite tables across 12 files in `src/db/drizzle/tables/*.ts` are present (guarded by `schemaDocSync.test.ts:37-50`).
  - Stale repository count (`L11-17,515`): claims `45 of 46` ported and cites `portedRepositoryArchitecture.test.ts:460` / `:468`; actual is **46 of 47** (`seasonEconomyRepository.ts` added in migration `0020`), asserted at `:461` and `:471`.
  - Incomplete schema-barrel allowlist (`L20-21`): names 2 non-repo files; actual `BARREL_IMPORT_ALLOWLIST` (`portedRepositoryArchitecture.test.ts:344-363`) has **10** (`client.ts`, `migrate.ts`, `schema.ts`, `seedCheckpoints.ts`, and 6 `db/health/checks/*` files).
  - Omits partial index `idx_players_pending_intake` (`src/db/drizzle/tables/players.ts:110-112`, migration `0018`).
  - Lists removed backend-v11 `world_clubs.land.valuePence` as live (`L435-454`, removed in `src/types/world.ts:274-290`); omits `world_clubs` keys `populationSize`, `seasonBudget`, `cohesion`, and `club_state` keys `landCostPence`, `catchmentPopulation`, `facilitiesPaidPence`, `seasonBudget`, `tutorialCompletedAt`.
  - Describes dead `save_games` table as active (`L505-506`); real saves are JSON trees in `bmc_saves/slot_N/` (`SaveGameService.ts:61-68`).
  - Cites removed `ingestMatchResultEvent` (`L629`).
- **`migrations.md` (535 L / 38.7 KB):**
  - Header (`L16-20`) claims "Fourteen migrations, `0000`–`0013`" — actual is **22 migrations (`0000`–`0021`)** in `src/db/drizzle/migrations/meta/_journal.json`.
  - **Factually wrong recovery claim (`L93-94`):** states `0007` and `0008` (`DROP INDEX`) are recovery candidates under `extractMigrationStatements`; actual `src/db/migrate.ts:97-124` returns `null` for `DROP INDEX` / `DROP TABLE` (only `CREATE TABLE`, `CREATE [UNIQUE] INDEX`, and `ALTER TABLE ... ADD` are recoverable).
  - Scrambled ordering & paste error: `0015` (`L314-335`) precedes `0014` (`L337-352`), and `L372-373` (describing `0014` `player_rating`) is pasted onto the end of `0016` (`facility_site_config.surrounds`).
  - `0017` (`scout_shortlist.passed_until_week`) and `0018` (`idx_players_pending_intake`) are skipped with a 3-line placeholder (`L420-422`).
  - `L32-37` still says `competition`/`dev` carry divergent migration numbers despite `L18-20` noting they levelled at `64fb01f2`.
  - `L530` places `useDatabaseResetGate()` in `app/_layout.tsx` (lives in `src/db/boot/useDatabaseResetGate.ts`); `L520` says `db:verify-baseline` diffs `0001` (diffs `journal.entries[0]` = `0000_giant_medusa.sql`).
- **`entities.md` (282 L / 19.3 KB):**
  - Stale on **A24** (`L157-158`) and **A27** (`L189-199`) — both landed `2026-11-20` (`Scout.ability` prices scout wages; `ScoutGenerationService` now writes all 7 `ScoutJudgements` keys at `WORLD_PACK_VERSION` 13).
  - Player tree (`L12-31`) omits `player_youth_pool` and `player_rating`; staff diagram (`L95-105`) omits `'npc_scout'` and `staff_transfers`.
  - Omits `ClubBudget` / `ClubBudget.createdWeek` (`src/economy/clubBudget.ts:116-183`), `WorldClub.land` / `populationSize`, `Club.landCostPence` / `catchmentPopulation` / `facilitiesPaidPence` / `cupTrophies` / `facilityUpgrades` / `tutorialCompletedAt`.
  - 20 of 34 `src/types/*.ts` files have zero coverage.
- **`state.md` (902 L / 64.3 KB):**
  - Contradictory counts: `L3` says 56 stores, `L11` says 7 of 65 use `persist()` + `zustandStorage`, `L122,126` say 4 use `zustandStorage`, `L175` says `STORE_MAP` has ~40 entries. Actual (`src/stores/*.ts`): **68 files / 66 Zustand stores**, **9 `persist()` total** (5 `zustandStorage`: `adminMessageStore`, `competitionNotificationStore`, `revealedResultsStore`, `settingsStore`, `tournamentInboxStore`; 1 `createSecureAuthStorage`: `authStore`; 3 plain `AsyncStorage`: `onboardingStore`, `ownerProfileStore`, `setupBriefingStore`), 3 manual-AsyncStorage (`gameConfigStore`, `languageStore`, `telemetryStore`), and `STORE_MAP` has **30 entries** (`SaveGameService.ts:126-163`).
  - Double-classifies `ownerProfileStore.ts` (`L16` & `L60` — actually plain `AsyncStorage` only) and misclassifies `gameConfigStore.ts` (`L58-60` — manual AsyncStorage, no `persist()`).
  - 13 real store files completely absent (`attendanceStore`, `excursionStore`, `forecastStore`, `leagueHistoryStore`, `loanStore`, `narrativeStore`, `promiseStore`, `scoutingDirectiveStore`, `bootDiagnosticsStore`, `cacheRepairStore`, `npcTransferCacheStore`, `perfProbeStore`, `tickProgressStore`).
  - `L237-257` still claims dropped `0015` tournament tables & `tournamentMatchResultRepository.ts` exist.
  - `L368-378` falsely claims nothing else writes `store_state` (6 writer families call `setStoreState`: `zustandStorage`, `bootstrap.ts` 14 `simpleBlobs` + 7 partialized blobs, `SeasonTransitionService.ts` 6 key families, `useInitFlow.ts`, `agentWindowUsage.ts`, `worldPackVersion.ts`).
  - `L415` still places `syncCountries()` in `app/_layout.tsx` (moved to `src/bootstrap/useGlobalDataSync.ts:44`).
  - *Confirmed accurate details:* `minOperatingReservePct` still missing from `pickClubState.ts` (`L188-193`); `clubStore` has exactly 71 `flushClubStateToDB()` calls (`L860`); DOF pot ledger 3 fields match `pickClubState.ts:22,44` (`L200-235`); `ACTIVE_SLOT = 1` matches `SaveGameService.ts:9,95-113`.

---

### 2.4 Stage `05_ui` (`design-system.md`, `design-system-notes.md`, `navigation.md`, `patterns.md`, `compliance-review.md`)

- **`design-system.md` (373 L / 44.8 KB):**
  - 100% exact on all 30 `WK` colors, `SURFACE`, `OUTCOME`, all 7 `TYPE` steps, `SPACING`, `BORDER_WIDTH`, `ICON_SIZE`, `pixelShadow`/`pressedShadow`, `withAlpha`, `mix`.
  - Missing `theme.ts` exports: `PODIUM_COLOUR`, `CARD_COLOUR`, `CHART_SERIES`, `traitColor` (completely absent), plus `SCRIM_MODAL`, `SCRIM_FULLSCREEN`, `TIER_COLOUR`, `arcadeBevel` omitted from L14–16 & §8 Quick Reference.
  - Internal contradictions: `L11` says "five-step type scale" (7 documented at L120–132); `L142-143` says "`hero` is the one exception" right below `L135-136` listing 3 tight steps (`caption`, `figure`, `hero`).
  - `L257` gives `Button` variant `'accent'` (actual `src/components/ui/Button.tsx:6`: `'yellow' | 'green' | 'orange' | 'red' | 'blue' | 'teal' | 'matchAction' | 'dangerOutline'`).
  - `L251` quotes stale "385 gold text sites across 122 files"; 29 of 56 files in `src/components/ui/` are unmentioned.
- **`design-system-notes.md` (858 L / 57.9 KB):**
  - `L55` claims 22 files still do `WK.<token> + 'NN'` (fixed to `0`, `designSystemSource.test.ts:191`).
  - `L86,410,429,695,700,733` still cite removed hue tokens (`WK.yellow`, `WK.tealDark`, `WK.border`, `WK.tealCard`); `L86` says only `PixelDialog` uses 4px accent border (`RandomiseDialog` & `RandomClubDialog` also do).
  - `L146,762-778` claim `Pressable` trigger was "never isolated" (isolated to NativeWind `wrap-jsx.js` and tested in `pressableStyleCallback.test.ts`).
  - `L383,701,721` cite deleted `app/club/[id].tsx`; `L655` writes wrong filename `stadiumLevelCache.ts` (actual: `src/components/splash/splashLevelCache.ts:184`).
  - `L608` vs `L617` self-contradict on `surrounds`; `L669-670` (`<Rect>`) contradicts `L195` (`<Path>`); `L719` falsely says `facility=` is never passed (passed in `FacilityCategoryScreen.tsx:660`, `FacilitySpriteTile.tsx:37`, `BuildSteps.tsx:226`).
  - `L841-858` appends an unrelated `leagueStore` trophy-normalization note.
- **`navigation.md` (542 L / 38.8 KB):**
  - Route tree (`L12-47`) misses **`app/(pre-game)/setup.tsx`** (the primary setup route since `2026-10-19`) and **`app/(app)/office/assistant.tsx`** (wired at `menu.ts:89`).
  - `L99-100` claims `OwnerIdentityCard` links to `profile.tsx` (actual `OwnerIdentityCard.tsx:60`: `'/(pre-game)/setup?mode=profile'`).
  - `L112-115` cites deleted `useCrossClubEarnings()` / "TOTAL CAREER EARNINGS" (replaced by `useAccountBalance()` / "BANK BALANCE").
  - `L248` cites deleted `TournamentMatchScreen` (`matches/[matchId].tsx:16-27` opens `MatchUXOverlay` directly).
  - `L252` says 2 screens named History (misses `transfers/history`, `menu.ts:143`); `L268` vs `L305` say 7 vs 8 menu sections (`menu.ts` has 8); `L380` omits `'tournamentUnread'` badge (`menu.ts:29,199`).
  - `L146-147,518` cite removed hue tokens (`WK.yellow`, `WK.tealMid`, `WK.tealBackground`); `L419-427` cite deleted/redirected Back-FAB routes (`results/[fixtureId]`) and unused `useDisableDrawerSwipeOnFocus` (0 screen callers).
- **`patterns.md` (2,623 L / 191.4 KB):**
  - Verbatim internal duplicates: NativeWind `Pressable` root cause repeated at `L1452-1468` & `L1491-1525`; `VALUING`/`NOT VALUED` badge rule repeated at `L2473-2477` & `L2524-2527`.
  - Misfiled blocks: 77 lines of `RatingStars`/`player_rating` buried inside `## The boot splash` (`L1596-1672`); deleted `DecisionScreen` sizing advice (`L1567-1572`) under `## Custom bordered/filled buttons`.
  - Stale refs: deleted `MotivationFlame` (`L1593`), "planned, not yet built" owner-balance strip (`L2513-2514`).
- **`compliance-review.md` (364 L / 24.2 KB):**
  - Behind live `src/__tests__/constants/designSystemSource.test.ts` (scans 1,082 files vs claimed 997, with `NEW_GAME_SETUP_DEFERRED` exemption):

| Rule | `compliance-review.md` (2026-11-09) | Live `designSystemSource.test.ts` baseline | Live incl. deferred `new-game-setup/` |
|---|---:|---:|---:|
| `proseFloor` | 26 | **17** | 35 (+18) |
| `rawModal` | 40 | **40** | 42 (+2) |
| `goldBorder` | 100 | **94** | 109 (+15) |
| `toneBorder` | 148 | **140** | 158 (+18) |
| `rawHex` | 91 | **73** | 84 (+11) |
| `goldLabel` | 123 | **122** | 122 |

  - Lists deleted `app/club/[id].tsx` (`L68`), deleted `ui/MotivationFlame.tsx` (`L125`), fixed `ui/DevelopmentChart.tsx` (`L136-137`, now uses `CHART_SERIES`), and already-localized `CANCEL`/`BACK`/`SAVE`/`CLOSE`/`AVAILABLE` strings (`L173-180`, only `ArchetypeBadge.tsx:17-19` remains) as open findings.

---

### 2.5 Stages `01_overview`, `02_architecture`, `06_documentation`, and `.context/shared/`

- **`.context/shared/stack.md`:** `L39` falsely claims `main: "expo-router/entry"` (`package.json:4` is `"main": "index.js"`, which runs `initSentry()` first); `L10-12` omits `src/bootstrap/`, `src/economy/`, `src/i18n/`, `src/__tests__/`; `L28-32` omits `.superpowers/`.
- **`.context/shared/last-sync.md`:** 422.5 KB / 5,748 lines / 111 `##` headings. Has **no top-level `- **Commit:**` header** (first `- **Commit:**` is at `L150` for `e03dd6da`), breaking `SKILL.md:53`. Dual-ended chronology (`2026-11-20` entries at `L23` AND `L5675`). 8 of the last 20 commits on `new-game-save` are absent by SHA (`22443e24`, `6fb687a0`, `0c52ec6c`, `4719b469`, `4ea3c5be`, `39b3c884`, `3569326b`, `def110a8`).
- **`01_overview/output/environment.md`:**
  - Commands table (`L15-26`) omits all 7 `i18n:*` scripts (`package.json:19-25`).
  - Sentry OTA upload docs (`L439,446`) are wrong: `SENTRY_AUTH_TOKEN` was removed from `eas update` in `.github/workflows/eas-update-{dev,prod}.yml:37-99` and moved to separate `expo export --source-maps` + `sentry-expo-upload-sourcemaps` steps.
  - Undocumented CI Node mismatch: OTA workflows run **Node 22** (`eas-update-{dev,prod}.yml:25`), while `eas-build-prod.yml:33` runs Node `20.19.6`.
  - Stale `L335` ("451 non-merge commits since `9a4cc4cf`", from `2026-10-25`).
- **`01_overview/output/tribal-knowledge.md`:**
  - `L145,152,155`: `45/46` repos & wrong test line numbers (`:460`/`:468` vs actual `46/47` at `:461`/`:471`).
  - `L552` contradicts `index.md:276` & `index.md:82` on `data-path-review-worklist.md` status.
- **`02_architecture/output/structure.md`:**
  - Massively stale file counts across almost every directory:
    - `src/__tests__/`: claimed 247 (`L823`) vs actual **659**
    - `src/economy/`: claimed 24 (`L29`) vs actual **35** (28 top + 7 harness)
    - `src/engine/`: claimed 99 + 1 subdir (`L144,159`) vs actual **104 + 2 subdirs = 110** (omits `src/engine/reputation/` & `youth/youthIntakeRule.ts`)
    - `src/engine/GameLoop.ts`: claimed ~5,500 lines (`L146`) vs actual **6,995 lines**
    - `src/stores/`: 67 (`L265`) vs **68**; `src/db/`: 96 (`L280`) vs **155** (107 `.ts/.tsx/.js`); `src/db/repositories/`: 46 (`L320`) vs **47**
    - `src/api/`: 26 (`L335`) vs **42**; `src/components/`: 293 (`L358`) vs **334** `.ts/.tsx` (348 total); `matchux/`: 14 (`L749`) vs **21**
    - `src/screens/`: 57 (`L792`) vs **86**; `src/hooks/`: 39 (`L796`) vs **55** (39 + 16 in `db/`); `src/utils/`: 107 (`L804`) vs **114**; `src/constants/`: 10 vs **12**; `src/types/`: 30 vs **34**
  - Cites deleted `app/club/[id].tsx` 4× (`L614,618,625,657`); falsely claims `SeasonEndTeletext.tsx` is unused and `SeasonEndOverlay.tsx` is 1,169+ lines (`L894-897` — actual `SeasonEndOverlay.tsx` is 704 lines and imports `SeasonEndTeletext` at `:42`).
- **`02_architecture/output/git-activity.md`:**
  - Last full refresh was `2026-09-22` (**1,269 commits ago**). Actual last 150 commits (`2026-11-11..11-20`): `src/__tests__/` (198), `src/engine/` (121), **`src/economy/` (87 — #2 non-test, completely absent from doc!)**, `src/components/` (80), `src/db/` (37), `src/types/` (33), `src/utils/` (33), `src/stores/` (29), `src/screens/` (27). Still claims recent focus is the `competition` branch merge (`L35-48`).
- **`06_documentation/output/index.md`:**
  - `L13` falsely describes `src/db/drizzle/README.md` as *"never a query layer — repositories keep hand-written SQL"* (contradicts `README.md:1-19` and `index.md:53`).
  - `L28` has a malformed markdown table row (unescaped `|` in summary column).
  - `L126` lists deleted `docs/i18n/untranslated-strings-audit.md` as live while `L249` records it was pruned `2026-11-02`.
  - Self-contradictions: `stage1-health-engine.md` (`L74` "ALL EIGHT" vs `L282` "7 of 8" vs `L209-210,292` "1–5 of 8"); `data-path-review-worklist.md` (`L82` "none fixed" vs `L276` "7, 11, D2 fixed").

---

## 3. Coverage Gaps (Blind Spots)

### 3.1 Database Schemas, Locking, Hydration, Cache Repair & Migrations
- **Concurrency & transaction primitives (`src/db/client.ts`, `src/db/transaction.ts`):** Completely undocumented in Stage `03_data` — `runExclusive` serial write queue + 30s stuck-queue watchdog (`client.ts:775,940-1056`), `runDrizzleExclusive` (`:1568`), `runDrizzleTransaction` (`:1632`, `insideDrizzleTransaction` no-retry & original-error restoration), `runBulkWrite`/`bulkChunkSize` (500-row cap, `SQLITE_MAX_VARIABLE_NUMBER = 32766`, `:1682-1778`), `withSafeTransaction` (`transaction.ts:56`), `withMaintenanceLock` (`client.ts:910-930`, bidirectional deadlock ban checked in `portedRepositoryArchitecture.test.ts:692-749`), `AppState` background write gate (`BACKGROUND_PARK_MAX_MS = 10_000`, `:1072-1151`), and connection pragmas (`WAL`, `busy_timeout=5000`, `cache_size=-16000`, `PRAGMA optimize`, `retiredHandles` GC-pinning).
- **Migrator & seed runtime invariants (`src/db/migrate.ts`, `src/db/versionGate.ts`, `src/db/seeds.ts`):** Undocumented `PRAGMA journal_mode=WAL` on the transient sync handle (because Drizzle's sync session leaks connections without `finalizeSync()`), `_inFlight`/`_succeeded` singleton preventing Fast Refresh handle leaks (`migrate.ts:215-315`), `Platform.OS === 'web'` short-circuit (`:209`), `VERSIONS_SUPERSEDED_BY_MIGRATION` (`'21'`, `'22'`, `'23'`, `versionGate.ts:23-36`), and two-lane seeds (`ONE_TIME_SEEDS` checkpointed in `db_seed_checkpoints` vs `ALWAYS_SEEDS`, `seeds.ts:71-120`).
- **End-to-end boot & SQLite hydration order:** Neither `02_architecture` (which omits `src/bootstrap/` entirely) nor `03_data` documents the boot pipeline: `app/_layout.tsx` module scope → `useDatabaseResetGate` → `useMigrationGate` → `useOwnedDatabase` → `useWorldInit` (`setDatabase` → `versionNeedsWipe` → `runPendingSeeds` → `runBootHealthCheck` → `loadAllStoresFromSQLite` → `setupWriteBackSubscribers` → `verifyGameCacheIntegrity` → `setStoresHydrated(true)` → `runCacheIntegrityPass`) in parallel with `useGlobalDataSync`.
- **Cache integrity & self-repair (`src/db/cacheIntegrity.ts`, `src/db/cacheRepair.ts`, `src/stores/cacheRepairStore.ts`):** Completely undocumented (`ROW_PROBES`, `BLOB_KEYS`, AMP-scoped staff probes, dependency-ordered reload + offline fixture regeneration, shared between cold boot and `SaveGameService.loadGame`).
- **Save-slot isolation & wipe exclusions (`SaveGameService.ts`, `storeKeys.ts`, `resetAllStores.ts`):** Undocumented on-disk layout (`${FileSystem.documentDirectory}bmc_saves/slot_N/{meta.json,stores/,sqlite/}`, atomic `tmp_slot_N`/`bak_slot_N`), `STORE_STATE_WIPE_EXCLUSIONS`, `INIT_CHECKPOINT_WIPE_EXCLUSIONS` (`wk:init:amp_starter`), `INIT_CHECKPOINT_PREFIX` (`wk:init:`), and `clearAllClubData()` single-flight `clearInFlight` + unbatched fallback.
- **Schema details:** `idx_players_pending_intake`'s load-bearing `WHERE` clause (`players.ts:110-112`); camelCase SQL columns in `achievements` and `promotion_history` (`tables/misc.ts:16-34`).

### 3.2 Offline / Sync Boundaries & External Interfaces
- **No unified Offline-vs-Online Matrix exists in `.context/`.**
- **100% local-only saves:** `04_interfaces` never states there are zero cloud save upload/download endpoints (`SaveGameService.ts` is purely local).
- **Offline cold-start & non-blocking club reconciliation:** `src/bootstrap/useInitialRoute.ts:120-224` routes offline from durable local state, runs `checkClub()` unawaited after navigation (`404` `reason: 'club_not_found' | 'club_not_owned'` in `src/api/endpoints/club.ts:29-55`), handles 401 via shared single-flight `refreshAuthToken()` (`client.ts:115-150`), and 403 via non-destructive `signOutKeepingData` (guarded by `signInInFlight`).
- **Undocumented live endpoints:**
  - `POST /api/account/delete` (`src/api/endpoints/auth.ts:227-247`, called from `app/(pre-game)/hub.tsx:145`; bypasses `apiRequest`, 10s timeout, raw Bearer header).
  - `GET /api/club/kit-identity` & `POST /api/club/kit-identity` (`src/api/endpoints/clubKitIdentity.ts:8-18`; fired best-effort on every `syncQueue.processNext()`).
- **Undocumented `syncQueue` / `concludeSeasonOutbox` / `syncCursor` behaviors:** `syncQueue.ts` `postClubKitIdentity` sidecar (`L225`), 403 `authBlocked` pause + `resumeAfterAuth()`, `MAX_RETAINED_WEEKS = 52`, non-403 4xx drop, 3s retry timer, multi-save `isCurrentClub` guard, `(clubId, weekNumber)` dedupe, piggybacked `gameConfig`/`facilityTemplates`/`achievements`/`syncedFixtureIds`, and initialization inside `src/game/useWeeklyTick.ts:338-341` (not `app/_layout.tsx`); `concludeSeasonOutbox.ts` `[5s, 30s, 120s]` backoff, `AppState 'active'` foreground drain, out-of-order 5xx bypass.
- **World-init resumable checkpoints:** `useInitFlow.ts` AsyncStorage `INIT_KEY.*` checkpoints and `withNetworkRetry` (retries status-0 `'network'` only, never `'timeout'`).
- **55+ request-triggering files missing from `controllers.md`:** `src/bootstrap/` (2), `src/hooks/` (6+), `src/stores/` (7), `src/engine/` (8+), `src/game/useWeeklyTick.ts`, `src/components/` (15, incl. v3 setup & `SeasonInvestmentCard`), `app/` & `src/screens/` (8).

### 3.3 User (AMP) vs. NPC Simulation Logic
- **No consolidated AMP-vs-NPC divergence matrix.**
- **`SelectionService.ts` (0 mentions in `game-mechanics.md`):** AMP selects its XI on perceived `player_rating` (`selectionScore(p, true)`), while NPCs select on true `overallRating`. `game-mechanics.md:573` still implies `player_rating` is UI-only.
- **`ResultsEngine.ts` (0 mentions in `game-mechanics.md` & `services.md`):** Match dominance, home advantage, playing-style attribute bonuses, `OUT_OF_POSITION_PENALTY = 0.8`, `getCohesionMatchModifiers`, `distributeCards`.
- **Youth scholarship wage divergence:** `ResolvedEconomy.youthScholarshipPence` (`src/economy/economyConfig.ts:195-198`) resolves per-tier `row.youthScholarshipPence` (used by `packWages.ts:140` & `EconomyWorkingsPanel.tsx:149`), while `SignYouthPanel.tsx:141` still reads flat `config.youthScholarshipWagePence`.
- **49 of 110 `src/engine/` files** have zero coverage in `services.md` (including `SeasonBudgetService`, `PlayerRatingService`, `ClubWageScaleService`, `NpcFinanceService`, `NpcRescueService`, `BoardUltimatumService`, `StaffConsensus`, `PlayerConversationService`, `FormulaEngine`, `SquadPowerIndex`).

### 3.4 Economy Constants & Modules (`src/economy/`)
- `src/economy/` (35 files: 28 top-level + 7 `harness/`) is the **#2 non-test commit hotspot**, yet:
  - Absent from `overview.md` and `stack.md`.
  - **33 of 35 files (94.3%)** have zero mention in `services.md`.
  - **19+ of 28 top-level files** are missing from `structure.md`.
  - `game-mechanics.md` has no consolidated constants table and omits live rules/formulas for:
    - `src/economy/seasonInvestment.ts` (owner seasonal capital injection cap & gating)
    - `src/economy/marketValue.ts` (wage-to-market-value conversion under `turnover`)
    - `src/economy/perTierEconomy.ts` (`advisedTicketPricePence`, per-tier sponsor bands)
    - `src/economy/financialApproach.ts` (`APPROACH_BANDS`, `nextFinancialApproach`, `headroomMultiple`)
    - `src/economy/inflation.ts` (`INFLATION_INDEX_BASE_BP`, `advanceInflationIndexBp`, `inflate`)
    - `src/economy/wages.ts` budget/form/negotiation constants (`NEGOTIATION_BAND_PCT = 0.08`, `WAGE_PREMIUM_FLOOR = 0.25`, `WAGE_PREMIUM_CEILING = 0.50`, `RICHNESS_FULL_RATIO = 2`, `FORM_BASE_RATING = 6`, `FORM_FULL_RATING = 8`)
    - `src/economy/relegationClause.ts` (dead/uncalled module missing from §10).

### 3.5 Directory, Route, UI & Documentation Blind Spots
- **Undocumented directories in `structure.md`:** `src/bootstrap/` (6), `src/components/new-game-setup/` (32), `src/hooks/db/` (16), `src/components/teletext/` (7), `src/screens/profile/` (5), `src/components/status-sprite/` (4), `star-sprite/` (3), `bond-sprite/` (3), `event-queue/` (3), `dressing-room/` (2), `performance/` (2), `club-card/` (1), `src/engine/reputation/` (2), `src/__tests__/{bootstrap,constants,economy,i18n}/`, `app/(pre-game)/{clubs,profile,setup}.tsx`, `src/i18n/{applyLanguageChange,plural,pseudolocale}.ts`, `src/game/syncFixtureMapper.ts`.
- **Undocumented live routes in `navigation.md`:** `app/(pre-game)/setup.tsx` and `app/(app)/office/assistant.tsx`.
- **Undocumented `theme.ts` exports in `design-system.md`:** `PODIUM_COLOUR`, `CARD_COLOUR`, `CHART_SERIES`, `traitColor` (+ `SCRIM_MODAL`, `SCRIM_FULLSCREEN`, `TIER_COLOUR`, `arcadeBevel` missing from Quick Reference).
- **Undocumented repo docs in `06_documentation/output/index.md`:** `docs/design-briefs/npc-club-profile-integration.md`, `docs/superpowers/specs/2026-09-26-centralized-staff-sqlite-poaching-design.md`, `jest/drizzleTestHarness/README.md`, `src/db/drizzle/DEVICE_TEST_PLAN.md` (table row), and 36 `.superpowers/sdd/*.md` files.

---

## 4. Signal-to-Noise & Token Efficiency

### 4.1 Exact Token Measurements vs. `token-savings.md`

Codebase baseline (`src/` + `app/`): **1,755 files / 15.76 MB (~3.94M tokens)**; non-test codebase: **1,096 files / 10.20 MB (~2.55M tokens)**. Total `.context/**/*.md` is **1.92 MB (~480,862 tokens = 18.9% of the entire non-test source tree)**.

| Load Scope | Claimed (`token-savings.md`, `2026-11-15`) | Actual Bytes | Actual Est. Tokens (`wc -c` ÷ 4) | Drift |
|---|---:|---:|---:|---:|
| **Everything** (router + `stack.md` + 7× `CONTEXT.md` + all `output/*.md`) | 335,077 | 1,469,070 B | **367,268** | **+32,191 (+9.6%)** |
| Router only (`.context/CONTEXT.md`) | 1,832 | 7,326 B | **1,832** | 0 |
| `01_overview` | 20,436 | 100,707 B | **25,177** | **+4,741 (+23.2%)** |
| `02_architecture` | 21,604 | 93,353 B | **23,338** | **+1,734 (+8.0%)** |
| `03_data` | 44,272 | 184,473 B | **46,118** | **+1,846 (+4.2%)** |
| `04_interfaces` | 67,354 | 272,782 B | **68,196** | +842 (+1.3%) |
| `05_ui` | 91,540 | 370,288 B | **92,572** | +1,032 (+1.1%) |
| `06_documentation` | 16,678 | 66,711 B | **16,678** | 0 |
| **`07_synthesis`** *(now #1 largest, overtaking `05_ui`)* | 89,503 | 445,994 B | **111,498** | **+21,995 (+24.6%)** |
| **Unaccounted `.context/shared/`** (`last-sync`, `token-savings`, `usage-savings-log`, `competition-testing`) | *(excluded)* | 454,376 B | **113,594** | `last-sync.md` alone = **105,620 tok** |

### 4.2 Root Causes of Bloat & Noise
1. **Append-only dev diaries & incident postmortems masquerading as reference docs:**
   - `shared/last-sync.md`: **422.5 KB / 5,748 L** — larger than 6 of the 7 stages, yet missing the 3-line header required by `SKILL.md:53`.
   - `04_interfaces/output/services.md`: **191.8 KB / 2,575 L** — **74.1%** under dated/pass/audit H2s, **>85%** including dated H3s, ~1,400 lines off-stage.
   - `05_ui/output/patterns.md`: **191.4 KB / 2,623 L** — only **13.3%** (9 sections / 25 KB) is reusable cross-screen UI patterns; **60.0%** is screen-specific changelogs; **25.2%** is incident postmortems (308 L `Boot splash` saga).
   - `07_synthesis/output/architecture-notes.md`: **98.7 KB / 1,406 L** — **52%** (733 L) is a Nov 1 crash/boot diary including same-day superseded fixes + 86 L of deleted pre-hub tournament history.
   - `07_synthesis/output/current-focus.md`: **108.6 KB / 1,474 L** — holds months of `SHIPPED` history already duplicated in `last-sync.md`, plus a 45-line verbatim merge duplicate.
   - `03_data/output/schema.md:89-163`: 75 lines of Android native SIGSEGV postmortem wedged inside `tables/players.ts`.
   - `03_data/output/state.md:454-470, 795-821`: UI `PixelPicker`, i18n keys, and `CAT_BADGE_CONFIG` badge notes inside data-layer state docs.
2. **Inline *"Correction:"* archaeology:** Repeatedly appending *"Correction, YYYY-MM-DD — the previous sentence here was wrong"* without editing the wrong sentence (`schema.md`, `migrations.md`, `state.md`, `routes.md`, `game-mechanics.md`, `design-system-notes.md`) causes cold-start agents to read and trust superseded rules at the top of a section.
3. **Cross-stage & intra-stage duplication (direct driver of drift):**
   - DOF budget/pot rules in 4 files (`services.md`, `game-mechanics.md`, `state.md`, `last-sync.md`) → `services.md` drifted the same day.
   - Perceived star ratings in 4 files (`tribal-knowledge.md`, `patterns.md`, `architecture-notes.md`, `game-mechanics.md`) → `patterns.md` hid them inside `Boot splash` and `architecture-notes.md` missed A28.
   - `Pressable` bug in 3 files (`design-system.md`, `design-system-notes.md`, `patterns.md`) + verbatim back-to-back duplicate in `patterns.md` (`L1452` vs `L1491`).
   - `player_rating`, `season_economy`, `relegation_wage_cut_bp`, `transfers` club IDs, `db_repair_ledger`, `surrounds`, and `WorldStaff` dual-shape each repeated across 2–3 files inside Stage `03_data`.

### 4.3 Highest-Value `.context` Files (and Why)
1. **`01_overview/output/tribal-knowledge.md` (Q4) & `CLAUDE.md`:** High-leverage, failure-preventing invariants (0–100 potential, pence/pounds exceptions, single `gameDate` anchor, `players` single source of truth, cohesion qualitative guard, `i18n:extract` ban, pack-is-a-census, Drizzle exclusivity/transaction/no-yield rules) impossible to infer from types alone.
2. **`05_ui/output/design-system.md`:** Exact 100% match on `WK`, `TYPE`, `SURFACE`, `OUTCOME`, `SPACING`, `BORDER_WIDTH`, `ICON_SIZE`, and shadow tokens in a compact 373-line spec.
3. **`01_overview/output/environment.md`:** Prevents immediate operational mistakes (`--legacy-peer-deps`, Node `20.19.6`, OTA channel/env/runtimeVersion traps, stale `.env.example`, green-master suite-count verification, loaded-machine flake warning).
4. **`.context/CONTEXT.md` + `07_synthesis/output/overview.md` + `shared/stack.md`:** Only ~14 KB (~3.6k tokens) combined and deliver an effective initial map once minor omissions (`src/economy/`, `index.js`) are patched.

---

## 5. Prioritized Recommendations (Report Only)

### P0 — Fix Dangerous Factual Errors & Broken Mechanical Contracts
1. **Fix the 4 hard simulation/economy errors in `07_synthesis/output/game-mechanics.md`:** correct `:890-892` (`ticketElasticity` live on `turnover`), `:231-232` (NPC `worldClub.facilities` mutated by `GameLoop`/rescue), `:1546-1547` (`allocatableBalancePence` minus carried DOF commitment), `:925-926` (`advisedTicketPricePence`), and reconcile `:1036`/`:2376` (`incomeAnchoredWages = true`), `:1557`, and `:2988` (Scotland config).
2. **Repair `.context/shared/last-sync.md` & cap its size:** restore a 3-line machine-readable `- **Commit:** <sha>` / `- **Date:**` / `- **Stages touched:**` header at line 1 per `SKILL.md:53`, and rotate/archive older passes (keeping only the latest ~10) so staleness checks don't sit atop a 105k-token file.
3. **Fix broken routing & entrypoint drift:**
   - Rewrite `GEMINI.md:48-54` to point to `tribal-knowledge.md` Q4 (retiring the "four non-negotiables in `CLAUDE.md`" text).
   - Re-sync `CLAUDE.md` one-way from `tribal-knowledge.md` Q4 & `environment.md` (add the 10 missing rules + `2026-11-20` test warnings; unify `46/47` repos across `tribal-knowledge.md`, `CLAUDE.md`, `schema.md`, `structure.md`).
   - Fix `.context/CONTEXT.md:68-69` (`shared/...` not `../shared/...`), fix stage titles in `06_documentation/CONTEXT.md` & `07_synthesis/CONTEXT.md`, remove the 4 `.DS_Store` files, and delete/relocate orphaned `.context/shared/competition-testing.md`.
4. **Fix high-risk data/migration/CI/service falsehoods:**
   - Fix `migrations.md:93-94` (`0007`/`0008` `DROP INDEX` not recoverable), header count (`14` → `22`), `0014`/`0015`/`0016` ordering & paste error, and add `0017`/`0018`.
   - Fix or remove `services.md:1081-1117` (`dofHireCharge.ts` → 3 exports, 5 fields, 6 sites calling `drawDofContractCharge`).
   - Update `environment.md:439-446` for the actual Sentry source-map upload workflow & Node 22 on OTA jobs; fix `index.md:13` ("never a query layer").

### P1 — Split Oversized Monoliths & Enforce Single Ownership (~60–70% Token Reduction)
5. **Split `07_synthesis/output/game-mechanics.md` (222 KB) by domain** (with owner approval on filenames):
   - `economy-reference.md`: consolidated constants table + wage/budget/DOF/pricing/inflation/investment formulas covering all `src/economy/` modules.
   - `simulation-rules.md`: `ResultsEngine`, `SelectionService`, development, injuries, youth, scouting, bonds, reputation, plus an explicit **AMP vs. NPC Matrix**.
   - Prune §10's 6 already-fixed rows + misplaced `ManagerBrain` i18n block, add dead `relegationClause.ts`, and archive §13.* pass archaeology.
6. **De-bloat `04_interfaces/output/services.md` (192 KB) & rewrite `controllers.md`:**
   - Remove chronological postmortems, deleted pre-hub tournament/push prose (`L213-250,631-635`), and off-stage game-mechanics prose (point to `07_synthesis`); replace with a compact module-responsibility index covering all `src/api/`, `src/economy/` (35), and `src/engine/` (110) files.
   - Rewrite `controllers.md` around real client request triggers (`src/bootstrap/`, `useWeeklyTick.ts`, `src/hooks/`, `src/stores/`, `src/components/new-game-setup/`), removing deleted files and flagging dead code (`marketMutations.ts`, `syncMutations.ts`, `marketData.ts`).
7. **Prune `05_ui/output/patterns.md` (191 KB) & split `design-system-notes.md` (58 KB):**
   - Keep only the ~9 reusable cross-screen patterns (~25 KB) in `patterns.md`; delete verbatim duplicates (`L1452`/`L1491`, `L2473`/`L2524`), dead `DecisionScreen`/`MotivationFlame` snippets, misplaced `RatingStars`, and multi-hundred-line incident logs.
   - Extract §7 Sprites (69% of `design-system-notes.md`) into a dedicated `sprites.md` after fixing its 6 factual contradictions, and drop duplicated token/Pressable sections.
8. **Trim `07_synthesis/output/current-focus.md` (109 KB → <10 KB) & `architecture-notes.md` (99 KB):**
   - Keep only genuinely active/open work in `current-focus.md` (remove verbatim duplicate `L554-596`, archive Sep–Nov 15 shipped items already in `last-sync.md`, add the active Nov 16–20 economy/perception/DOF workstream).
   - Archive the 733 lines of Nov 1 crash diary & deleted pre-hub tournament history in `architecture-notes.md`, and fix its 5 factual drifts (`5,022` i18n keys, `tournamentHttp.ts` `withLang()`, `revealedResultsStore`, `assessYouthPlayer`/`npcContractRenewalEngine`).

### P2 — Close High-Risk Coverage Blind Spots
9. **Add a concise DB Runtime & Lifecycle doc in Stage `03_data`:** Document `runExclusive` / `runDrizzleTransaction` / `withMaintenanceLock` / `AppState` write-parking / `runBulkWrite`, the `migrate.ts` WAL/leak singleton, the ordered boot hydration sequence (`useDatabaseResetGate` → `useWorldInit` → `useGlobalDataSync`), `cacheIntegrity`/`cacheRepair`, and `bmc_saves/slot_N/` + `STORE_STATE_WIPE_EXCLUSIONS`. Rewrite `state.md` with an accurate 68-file store table and delete the dropped `0015` tournament tables section.
10. **Add an Offline vs. Online & Transport Matrix to `04_interfaces/output/routes.md`:** Add `POST /api/account/delete`, `GET`/`POST /api/club/kit-identity`, v11 `InitLeague` fields, all 8 non-10s timeouts, 401 refresh / 403 sign-out rules, `syncQueue` (52-week cap, 403 pause, kit-identity sidecar, `useWeeklyTick` init), `concludeSeasonOutbox`, `useInitFlow` checkpoints, and local-only saves. Remove deleted `tournaments.ts` and resolve internal contradictions.

### P3 — Refresh Structural Snapshots & Preventive Hygiene
11. **Refresh stale reference docs:**
    - `navigation.md`: add `app/(pre-game)/setup.tsx` & `app/(app)/office/assistant.tsx`, replace `useCrossClubEarnings`/`TournamentMatchScreen`, purge removed `WK.*` hue tokens and dead Back-FAB routes.
    - `design-system.md`: add `PODIUM_COLOUR`, `CARD_COLOUR`, `CHART_SERIES`, `traitColor` (+ `SCRIM_*`/`TIER_COLOUR`/`arcadeBevel` in §8); fix "five-step" / "`hero` is the one exception" / `Button` variants.
    - `compliance-review.md`: replace the stale `2026-10-24` audit with a compact pointer to `designSystemSource.test.ts` (documenting `NEW_GAME_SETUP_DEFERRED`).
    - `structure.md` & `git-activity.md`: add `src/bootstrap/`, all 35 `src/economy/` files, `src/components/new-game-setup/`, `src/hooks/db/`, `src/engine/reputation/`; refresh `git-activity.md` for `2026-11`; stop maintaining fragile hand-typed file counts.
    - `index.md`, `entities.md`, `stack.md`, `overview.md`, `token-savings.md`: add missing files/types, fix `index.md:28` broken table row, fix `main: "index.js"`, and re-measure all 7 stages + shared overhead.
12. **Adopt two low-cost doc invariants going forward:**
    - **Edit current-state files in place** — never leave superseded rules live above a dated *"Correction:"* paragraph; keep history strictly in git or a rotated log.
    - **Replace brittle hand-typed counts & line numbers with symbol names and test-file pointers** (mirroring how `schemaDocSync.test.ts` already keeps `schema.md`'s 57 table names 100% accurate).
