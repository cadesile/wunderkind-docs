# `.context` Refresh — Stage 1: Correctness + Ratchet

**Scope decision (owner, 2026-11-20): do Phase 1 + Phase 4 first.** Fix every known factual
error and broken mechanical contract, then put CI in place so the drift cannot come back.
The restructuring work (Phase 2) is deferred and decided stage by stage afterwards.

**Step 0 of execution:** copy this plan to
`/Users/courtneyadesile/Documents/WunderkindFactory/wunderkind-docs/context-review/context-refresh.md`
(plan mode only permits editing the plan file itself).

---

## Context

An external read-only audit of `wunderkind-app`'s `.context/` ICM tree
(`wunderkind-docs/context-review/context-review-agy.md`, `new-game-save` @ `22443e24`) scored the
implementation **5.5 / 10** against its own premise — *"an agent loads only the couple thousand
tokens relevant to its task instead of everything at once."*

The hard part of ICM works: `tribal-knowledge.md` Q4, `design-system.md` and `environment.md`
capture real, non-inferable invariants. What failed is **pruning**. Output files became
append-only diaries, corrections were stacked *below* the wrong sentences instead of replacing
them, and single topics were duplicated across 3–4 files — which is exactly how same-day drift
got in (`dofHireCharge.ts` was documented wrong the day it landed).

This stage of work treats the **correctness** half of that and installs the guard. It does not
attempt the size reduction, except where a fix produces one for free (`last-sync.md`).

### Verified before planning

**Sizes confirmed:** `.context/` is 1,930,071 bytes / 34 `.md` files. `last-sync.md` 429 KB,
`game-mechanics.md` 222 KB, `services.md` 192 KB, `patterns.md` 191 KB, `current-focus.md` 109 KB,
`architecture-notes.md` 99 KB.

**All 7 P0 factual claims CONFIRMED against live source — with two corrections to the audit:**

| Claim | Live truth |
|---|---|
| `game-mechanics.md:890-892` denies a price term in attendance | `src/economy/ticketElasticity.ts:40-57` (`TICKET_ELASTICITY_K = 0.75`, `e^(−k(r−1))`), applied inside the fill at `src/utils/matchdayIncome.ts:309-331`, so it is capacity/`crowdShare`-clamped. **Audit overstates it:** gated on `ticketPriceElasticity ?? (economyTierBaseline?.wageModel === 'turnover')` — conditional, not unconditional. Income peaks at `1/k` = 1.33× advice |
| `:231-232` denies NPC `worldClub.facilities` writes | Two live writers, both via `worldState.updateClub`: `GameLoop.ts:2274` (NPC upgrade path) and `NpcRescueService.ts:196` (sugar-daddy rescue, built by `buySugarDaddyFacilities` `:241-261`). Both raise arbitrary slugs, so `youth_academy` specifically is not guaranteed to move — but "nothing writes it" is false |
| `:1546-1547` `setBudgetAllocation` formula | `clubStore.ts:1009-1042`: percentages clamped 0–100 and scaled so `t+f+c ≤ 100 − minOperatingReservePct`; pots are `floor(allocatableBalancePence × pct/100)`; `allocatableBalancePence` (`:598-604`) = balance − (wage floor + maintenance reservation); transfer pot is `carriedTransferBudgetPence` (`:756-764`), which **additionally** subtracts `carriedDofWageCommitmentPence` |
| `:925-926` NPC ticket price source | `npcFinances.ts:104-157` → `advisedTicketPricePence({ leagueTier: club.tier, … })` (`perTierEconomy.ts:70-82`), the division's published figure; `recommendPricing` is fallback only. NPCs sit at r = 1. **Food is the exception** — still `recommendPricing` (`:99`), the one price the backend doesn't publish |
| `services.md:1081-1117` on `dofHireCharge.ts` | 3 exported functions (`weeksRemainingInBudgetSeason` `:97`, `dofContractCharge` `:121`, `dofSigningDraw` `:180`) + `interface DofContractCharge` `:56`; 5-field return (`feePence`, `wageCommitmentPence`, `totalPence`, `wageWeeklyPence`, `wageWeeksCommitted`) — the last two exist so `dofWageCommitmentRelease` can re-run the arithmetic at the departure week. The draw function is `drawDofContractCharge`, not `spendTransferBudget`. **Audit undercounts: 7 non-test call sites, not 6** — `DofStaffHiringService.ts:149`, `TransferService.ts:437`, `GameLoop.ts:5716`, `GameLoop.ts:5901`, `app/staff/[id].tsx:311,:354,:394` |
| `migrations.md` header "14 migrations, 0000–0013" | **22**, `0000_giant_medusa.sql` → `0021_massive_hitman.sql`, contiguous |
| `migrations.md:93-94` 0007/0008 recoverable | `migrate.ts:97-124` matches only `CREATE TABLE`, `CREATE [UNIQUE] INDEX`, `ALTER TABLE … ADD`; anything else returns `null` and the caller `break`s (`:180-181`). `0007`/`0008` are pure `DROP INDEX`. "Index-only, no table rebuild" is necessary but **not sufficient** — the verb must be one of the three recognised forms. Two in-repo comments already say this (`0006:14`, `0013:47`) |
| `state.md` store counts / dropped tournament tables | 68 files / **66 stores** / **9** `persist()` (`adminMessage`, `auth`, `competitionNotification`, `ownerProfile`, `revealedResults`, `settings`, `setupBriefing`, `onboarding`, `tournamentInbox`). All four tournament tables dropped by `0015_majestic_sunset_bain.sql`; `tournamentMatchResultRepository.ts` no longer exists. The only client-side tournament persistence is `tournamentInboxStore` (AsyncStorage) |

**The lesson that shapes execution:** the audit is a reliable map but not a source of truth — two
of its own numbers were wrong. **Every fix is re-verified against live code at execution time,
never copied from the audit or from this plan.**

**Structural claims spot-checked and confirmed:** `06_documentation/CONTEXT.md` is titled
"Stage 05", `07_synthesis/CONTEXT.md` "Stage 06", `last-sync.md` has no `- **Commit:**` header at
the top, 4 `.DS_Store` files sit inside `.context/`, and `.context/CONTEXT.md`'s "Known gaps" still
claims `02_data`/`03_engine` have no home — a correction `CLAUDE.md` already recorded 2026-10-31.

---

## Guardrails from the ICM contract

From reading `.agents/skills/icm-codebase-context/` in full:

- **In-place revision is in-contract.** `stages/03_data/references/revise-not-rewrite.md` says
  re-verify every fact and "update anything the code has since changed"; `03_data/CONTEXT.md:32`
  forbids carrying anything over unverified. The dated "Correction:" stacking is a **local habit
  nothing in the skill asks for** — replacing a superseded claim outright is compliant.
- **Human-authored content is authoritative.** Where it is unclear whether a passage was
  hand-added, keep it and raise it rather than deleting it. This is the main risk in any edit pass.
- **`last-sync.md`: exactly one value is load-bearing** — a single recorded commit SHA, read by
  `git log <recorded-commit>..HEAD --oneline -- . ':!.context' ':!.agents'`. Nothing reads the
  prose, dates or pass ordinals. Rotation isn't contemplated by the skill, but
  `usage-savings-log.md`'s `{{MAX_ENTRIES}}` cap is the methodology's own precedent for it.
- **`schemaDocSync.test.ts` pins `schema.md`**: hardcoded `SCHEMA_DOC` path, every
  `sqliteTable('x')` name present **backticked**, every `tables/*.ts` filename present as
  `` `tables/<file>.ts` ``. Shorten it if needed, never rename or split it, never relax the test.
- **`CLAUDE.md` is a gitignored one-way mirror** of `tribal-knowledge.md` Q4 (binding rules) and
  `environment.md`'s green-master bar (test counts). Fix `.context/` first, then re-mirror.
- **One home per fact; routers hold no content; cross-references are one-way**
  (`_core/conventions.md:41-45,59`).

---

## Work

### 1. Baseline and safety (first, ~30 min)

- `git tag context-refresh-base` on `new-game-save`, so the whole pass reverts in one move.
- Record per-file bytes + the 7 stage load totals to
  `wunderkind-docs/context-review/BASELINE-2026-11-20.md`.
- Create `wunderkind-docs/context-archive/` with a `README.md`: removed ICM history, greppable,
  **never loaded by an agent**, one file per source doc, original date headings kept. Only
  `last-sync.md` uses it in this stage of work; Phase 2 would fill it out.
- Delete the 4 `.DS_Store` files under `.context/`; add `.DS_Store` to `.gitignore` if absent.

### 2. The four simulation/economy errors — `07_synthesis/output/game-mechanics.md`

Replace each wrong passage outright (no annotation beneath it) with the verified truth from the
table above, re-confirmed against code at execution time. Then reconcile the file's internal
contradictions: `:1036` vs `:2376` (`incomeAnchoredWages = true`), `:1557`, and `:2988` (Scotland
config). These are the highest-risk items in the whole audit — an agent reading `:890` concludes
there is no price term and could delete live elasticity wiring.

### 3. `shared/last-sync.md` — restore the contract, cut 429 KB → <25 KB

- Put the template's 3-line machine-readable header back at the top, from
  `.agents/skills/icm-codebase-context/shared/last-sync.md`: `- **Commit:** <sha>` /
  `- **Date:**` / `- **Stages touched this pass:**`, pointing at current `HEAD`.
- Move all but the latest ~10 passes to `context-archive/shared-last-sync-history.md`.
- Drop the hand-maintained pass ordinals — the file's own head matter admits they duplicate across
  merges and are unreliable, and nothing reads them.

This is the one size win in this stage of work, and it's free: it falls out of fixing the header.

### 4. Routing and entrypoint drift

- **`.context/CONTEXT.md`**: fix `../shared/...` → `shared/...` (L68-69) and L31; delete the three
  stale "Known gaps" bullets (the deleted `docs/wunderkind-app-context*.md`, and the
  `02_data`/`03_engine` claim); collapse the 10-line 2026-10-08 self-correction block into the rule
  it corrects.
- **Stage contracts**: fix the H1s in `06_documentation/CONTEXT.md` and `07_synthesis/CONTEXT.md`;
  repoint the broken vendored `references/*` and `_core/*` links at
  `.agents/skills/icm-codebase-context/...`; fix `05_ui/CONTEXT.md:24` ("~250 lines", 5 `TYPE`
  steps — actually 373 lines / 7 steps).
- **`CLAUDE.md` re-mirror, one-way from `.context/`**: add the 10 binding rules present in
  `tribal-knowledge.md` Q4 but missing from the mirror (tournament rollout, eleven-available-bodies,
  fortnightly NPC injury decrement, `EMERGENCY` vs `CRITICAL`, `GameLoop` rotation bypass,
  `npcSquadBand`, per-`(club, POSITION)` emergency backoff, `clearEmergencyCooldowns()` placement,
  `squadAvailability.ts` predicate, `starter_config.league_ability_ranges` outlier) plus
  `environment.md:50-67`'s two 2026-11-20 test warnings. Unify the repo count to **46/47** (source:
  `portedRepositoryArchitecture.test.ts:471`) across `tribal-knowledge.md`, `CLAUDE.md`,
  `schema.md`, `structure.md`. Drop the dead `assets/Components/location_new_game/INTEGRATION.md`
  path from both `CLAUDE.md:370` and `environment.md:220`.
- **Reverse-drift repair**: `environment.md:42` currently says the A28 rows "are recorded in
  `CLAUDE.md` and are not reproduced here", which inverts the one-way rule. Move that content into
  `environment.md`, then re-mirror.
- Delete or relocate the orphaned `shared/competition-testing.md` (3 lines, zero inbound refs).
- `GEMINI.md` does **not** exist in this checkout — the audit read a local copy. No action; note it
  in the report rather than inventing the file.

### 5. Data / migration / CI / service falsehoods

- `migrations.md`: header 14 → 22; fix the 0007/0008 recovery claim per the live
  `extractMigrationStatements` shape rules; fix the `0014`/`0015`/`0016` ordering and the `0014`
  text mis-pasted onto `0016`; add the missing `0017`/`0018`.
- `services.md:1081-1117`: fix the `dofHireCharge.ts` section (3 exports, 5-field return,
  `drawDofContractCharge` at 7 sites). Narrow edit only — the file's 192 KB bloat is Phase 2.
- `state.md`: fix the store counts to 68/66/9 and **delete the dropped-tournament-tables section**
  (`:237-257`) — it currently tells agents four non-existent tables are live and names a deleted
  repository.
- `environment.md:439-446`: correct the Sentry source-map upload workflow and record Node 22 on the
  OTA jobs.
- `index.md:13`: fix the false "never a query layer" claim about `src/db/drizzle/README.md`.

### 6. The guard — `src/__tests__/db/contextDocSync.test.ts`

`schemaDocSync.test.ts` is the only reason `schema.md`'s 57 table names are still 100% accurate.
Everything that drifted had no test. New suite, same spirit, same header instruction ("if this is
red, update the document — do not relax the assertions"):

1. **`last-sync.md` header** — a `- **Commit:** <sha>` bullet in the first 12 lines, and that SHA
   resolves (`git cat-file -e`). This is the one value the staleness check consumes.
2. **No dead paths** — every repo-relative path cited in `.context/**/*.md` exists on disk. This
   alone would have caught `assets/Components/...`, `app/club/[id].tsx`,
   `useAvailableTournaments.ts`, `TournamentMatchScreen` and `tournamentMatchResultRepository.ts`.
   Needs a conservative path-extraction regex plus a small allowlist for intentionally-cited
   deleted files; the allowlist must carry a reason per entry, like
   `portedRepositoryArchitecture.test.ts` does.
3. **Stage title parity** — each `.context/stages/NN_name/CONTEXT.md` H1 begins `Stage NN`.
4. **Mirror parity** — `CLAUDE.md`'s BINDING block is a whitespace-normalised match for
   `tribal-knowledge.md` Q4, so the one-way mirror cannot silently diverge again. Skip (don't fail)
   when `CLAUDE.md` is absent, since it's gitignored and won't exist in CI or a fresh clone.
5. **No `.DS_Store`** under `.context/`.
6. **Size ratchet, set loose** — every `.context/**/output/*.md` under a cap seeded at **today's
   largest file + 5%**, and a total-footprint cap seeded the same way. It only ever ratchets down.
   This makes the deferred Phase 2 measurable and stops the tree growing while it waits.
7. **Anti-diary guard** — no output file gains *more* dated `Correction:` / `Corrected YYYY-MM-DD`
   annotations than it has today (per-file baseline counts committed in the test). The habit that
   caused the drift then fails CI instead of accumulating.

Assertions 4, 6 and 7 are seeded from current state deliberately: a guard that fails on day one
gets disabled, and a ratchet that starts where you are still stops you going backwards.

### 7. Write the two doc invariants into `.context/CONTEXT.md`'s "Writing to this folder"

- **Edit current-state files in place.** Never leave a superseded rule live above a dated
  "Correction:" paragraph — history belongs in git or `wunderkind-docs/context-archive/`.
- **Name symbols and test files, never hand-typed counts or line numbers.** This is what keeps
  `schema.md` accurate and what made `structure.md`'s every file count stale.

### 8. Close the loop

Per `SKILL.md` step 5: update `last-sync.md` (new `HEAD`, date, stages touched) and re-measure
`token-savings.md` for the stages touched — **including the `shared/` row the file omits entirely**,
which is why its headline understates reality by ~10% (113k tokens unaccounted for).

Write the outcome report to `wunderkind-docs/context-review/context-refresh-report.md`: what was
fixed with evidence, the two audit claims that were themselves wrong, before/after measurements,
and the Phase 2 backlog with the recommended order.

---

## Verification

- `npx tsc --noEmit` clean.
- `npm test` green **with the suite count confirmed** — `npx jest --listTests | wc -l` against
  `new-game-save`'s own row (659 / 11,057 at `9bac0b18`); a run that silently collects fewer files
  looks identical to a green one in the summary line. Expect **+1 suite** for `contextDocSync`.
- `npx jest schemaDocSync contextDocSync` green specifically — `schemaDocSync` proves the
  `schema.md` edits didn't break the backticked-table-name contract.
- Staleness check actually works again:
  `git log $(sed -n 's/^- \*\*Commit:\*\* //p' .context/shared/last-sync.md | head -1)..HEAD --oneline -- . ':!.context' ':!.agents'`
  returns a sane, short list rather than failing to find a commit.
- `find .context -name '*.md' | xargs wc -c` against the baseline — expect ~1.93 MB → **~1.52 MB**,
  effectively all of it from `last-sync.md`.
- **Cold-start spot-check, the only test that matters for ICM:** in a fresh session ask "how does an
  NPC decide a ticket price?" and "how many migrations are there?" and confirm the answers now come
  back right. Both are currently answered wrongly from `.context/`.

## Deferred — Phase 2, decided stage by stage afterwards

In the order I'd recommend, cheapest-value-first:

1. **`07_synthesis` split** (~1–2 sessions) — `game-mechanics.md` 222 KB → `simulation-rules.md`
   (incl. the missing **AMP vs NPC matrix**, `SelectionService`, `ResultsEngine`) +
   `economy-reference.md` (constants table covering all 35 `src/economy/` modules);
   `current-focus.md` 109 KB → <10 KB; `architecture-notes.md` 99 KB → ~30 KB.
2. **`03_data` + new `db-runtime.md`** (~2 sessions) — the largest coverage hole: `runExclusive`
   and its watchdog, `runDrizzleTransaction`, `withMaintenanceLock`'s bidirectional deadlock ban,
   `runBulkWrite`, the `AppState` write gate, `migrate.ts`'s WAL/leak singleton, the boot hydration
   chain, `cacheIntegrity`/`cacheRepair`, `bmc_saves/slot_N/`.
3. **`05_ui` prune** (~1–1.5 sessions) — `patterns.md` 191 KB → ~25 KB, extract `sprites.md`.
4. **`04_interfaces` rewrite** (~2 sessions, defer longest) — `services.md` + `controllers.md`
   across 145 files, plus the offline-vs-online transport matrix. Note this one needs
   `.context/CONTEXT.md:34` retargeted first, since the router currently *instructs* `services.md`
   to keep a per-change diary.
5. **Hygiene** (~half a session) — `stack.md`'s `main: "index.js"`, `index.md`, `structure.md`,
   `git-activity.md`, `usage-savings-log.md`, and the skill package's own stale duplicate stages
   (`stages/05_documentation/`, `stages/06_synthesis/`).

Each would tighten the Phase 4 ratchet as it lands.
