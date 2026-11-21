# `.context` refresh — outcome report

- **Repo:** `wunderkind-app`, branch `new-game-save`, from `ec949536` (tag `context-refresh-base`)
- **Date:** 2026-11-20
- **Scope executed:** Phase 1 (correctness) + Phase 4 (the CI ratchet) of
  [`context-refresh.md`](./context-refresh.md). The size/restructuring half is deferred and listed
  at the end.
- **Acting on:** [`context-review-agy.md`](./context-review-agy.md), an external read-only audit
  that scored the tree **5.5 / 10**.

---

## 1. The audit was a reliable map, not a source of truth

Every P0 claim was re-verified against live code before anything was edited. **All 7 held** — and
**two of the audit's own numbers were wrong:**

| Audit said | Actually |
|---|---|
| `drawDofContractCharge` has **6** call sites | **7** — `app/staff/[id].tsx` has three separate calls, not one |
| Ticket elasticity is live on `turnover` | Live but **conditional**: `ticketPriceElasticity ?? (economyTierBaseline?.wageModel === 'turnover')`, so OFF on a legacy or never-synced template |

A third claim needed narrowing: the audit said NPC facility writes mean NPC academy levels change,
which is true, but neither writing path *targets* `youth_academy` — one picks on the facility
manager's reasoning, the other on upkeep cost, so any academy movement is incidental.

**This is the operating rule for the deferred phases too: verify at execution time, never copy a
figure from a report.** Three other audit items turned out to be non-issues — `GEMINI.md` does not
exist in this checkout, and `assets/Components/…` / `docs/economy-loose-ends/…` are not dead paths
but live paths in the **parent workspace**, one level above the repo.

## 2. The seven factual errors, fixed

| Document | Was | Is |
|---|---|---|
| `game-mechanics.md` | "There is **NO** price term in attendance… A price elasticity would belong here and does not exist" | `src/economy/ticketElasticity.ts`, `e^(−k(r−1))` at `k = 0.75`, income peaking at `1/k` = 1.33× advice, applied **inside the fill** at `matchdayIncome.ts:309-331` so it is capacity- and `crowdShare`-clamped, gated as above |
| `game-mechanics.md` | "nothing in the codebase writes `worldClub.facilities` after `buildWorldLeagueClubs`" | `GameLoop.ts:2274` (NPC upgrade, gated on the club's *live* balance) and `NpcRescueService.ts:196` (sugar-daddy rescue, 3 levels cheapest-upkeep-first) |
| `game-mechanics.md` | pots are `balance × pct/100` | `floor(allocatableBalancePence × scaled pct/100)` — shares scaled to leave `minOperatingReservePct` (10), base is the balance **less the season's wage floor + maintenance reservation**, and the transfer pot alone subtracts `carriedDofWageCommitmentPence` |
| `game-mechanics.md` | NPCs priced at "textbook `recommendPricing`" | `advisedTicketPricePence` on the club's **own division tier** (published figure); `recommendPricing` is fallback only, and **food is the one real exception** |
| `services.md` | `dofHireCharge.ts` has 2 exports, a 3-field return, and all five sites call `spendTransferBudget` | **3 exported functions**, a **5-field** return, and **7** sites calling `clubStore.drawDofContractCharge`. The §14a/§14c player-vs-staff renewal attributions were **swapped** |
| `migrations.md` | "Fourteen migrations exist, `0000`–`0013`"; `0007`/`0008` recoverable by `extractMigrationStatements` | **22**, `0000`–`0021`. `0007`/`0008` are pure `DROP INDEX`, and the extractor matches only `CREATE TABLE` / `CREATE [UNIQUE] INDEX` / `ALTER TABLE … ADD`, bailing out on anything else — so **"index-only, no rebuild" is necessary but not sufficient; the verb must match** |
| `state.md` | 56 stores, 7 of 65 persisting, four tournament tables live | **68 files / 66 stores / 9 `persist()`**. The tournament tables were dropped by `0015`, along with the repository the section named as their writer |

### Structural and routing repairs

- **`last-sync.md`'s machine-readable header was missing entirely** — the first `- **Commit:**`
  bullet sat at line 150, so the staleness check
  (`git log <recorded-commit>..HEAD -- . ':!.context' ':!.agents'`) had been **skipping silently**.
  Restored at the top and verified to resolve and run.
- Stage contracts titled "Stage 05" (`06_documentation`) and "Stage 06" (`07_synthesis`) fixed;
  six broken vendored `references/*` and `_core/*` links repointed at
  `.agents/skills/icm-codebase-context/…`.
- Router: `../shared/…` → `shared/…`, three stale "Known gaps" bullets removed (the deleted
  generator dumps; the claim that `02_data`/`03_engine` have no home, which `CLAUDE.md` had
  corrected on 2026-10-31), and a 10-line self-correction block collapsed into the rule it
  corrects.
- The orphaned `shared/competition-testing.md` (3 lines of backend Symfony commands, zero inbound
  references) moved to the archive.
- `.DS_Store` ×4 deleted.

### The mirror

**`CLAUDE.md` regained 10 binding rules it had never carried** — tournament rollout,
eleven-available-bodies, the single availability predicate, the fortnightly NPC injury decrement,
EMERGENCY vs CRITICAL, the rotation bypass, the per-`(club, POSITION)` backoff,
`clearEmergencyCooldowns()` placement, `npcSquadBand`, and the `league_ability_ranges` outlier —
plus the two 2026-11-20 test warnings (the backend's "three to five failures" baseline does not
apply here; a loaded machine fabricates failures).

**The reverse-direction drift is repaired at the source.** `environment.md` had been *admitting* it
in its own text: *"The A28 rows are recorded in `CLAUDE.md` and are not reproduced here."* Both rows
are now in the owner, where the one-way rule requires them.

### The count that drifted twice

The ported-repository figure read **45/46** in five places at once. It is **46/47**
(`portedRepositoryArchitecture.test.ts:471`; the only unported file is the dead
`saveGameRepository`). Fixed in `tribal-knowledge.md`, `CLAUDE.md`, `schema.md`, `index.md`,
`src/db/drizzle/README.md` and `docs/drizzle/drizzle-migration-status.md`.

⚠️ **This is the second time that same count drifted across that same set of files.**
`drizzle-migration-status.md`'s own register, item 28, records the first occurrence being fixed on
2026-10-20 — including the note that all four sites were updated to "state the expectation rather
than just the number, so the next repository does not re-create the drift". It re-created it
anyway. **Careful editing demonstrably does not hold; only a test does.** That is the argument for
§4 below, made by the repo's own history rather than by assertion.

### Two further errors found while working

Neither was in the audit:

- `TYPE` is a **seven**-step scale (`label`…`hero`), not five — wrong in both `design-system.md`
  and the `05_ui` stage contract.
- "`hero` is the one exception" to the line-height rule is wrong: **three** steps set line height
  equal to size (`caption` 16/16, `figure` 28/28, `hero` 38/38), and `design-system.md`'s own text
  two lines above already said `caption` was tight.
- `environment.md` documented the **broken** Sentry configuration as the fix. `eas update` uploads
  no source maps; the token on that step was exactly the silent-skip that left every production JS
  stack reading `index.android.bundle [Line 1, column 4492429]`. What actually runs is a second
  `expo export --source-maps` of the same commit with the same `EXPO_PUBLIC_*` values (that
  identity is the whole safety property) followed by `sentry-expo-upload-sourcemaps`, which now
  fails the job when the token is missing. Also recorded: OTA workflows run **Node 22** while the
  build pins **20.19.6**.
- `index.md` claimed `src/db/drizzle/README.md` says the directory is "never a query layer". That
  README's own title is "Drizzle schema, migrations & query layer".

## 3. `last-sync.md`: 429 KB → 33 KB

| | Before | After |
|---|---:|---:|
| `shared/last-sync.md` | 429,106 B / 5,836 lines / 112 passes | 33 KB / 4 passes |
| `shared/` as a whole | ~116,000 est. tokens | **18,701** |
| `.context/` total | 1,930,071 B | **1,558,108 B** |

All 112 passes are accounted for: 4 retained, 108 verbatim in
`../context-archive/shared-last-sync-history.md`.

Two things were dropped rather than kept. **Pass ordinals** — hand-maintained, branch-relative,
duplicated on every merge between two branches that both recorded passes, and read by nothing; the
file's own head matter admitted they were unreliable. And **the pretence of an ordering**: that
file was *prepended* to for its first ~60 passes and *appended* to thereafter, so a pass's position
never meant what it looked like. The live file now states that only its tail is trustworthy as
"newest", and new passes go at the bottom.

## 4. The ratchet: `src/__tests__/db/contextDocSync.test.ts`

`schemaDocSync.test.ts` is the only reason `schema.md`'s 57 table names never drifted. Everything
that drifted had no test. So, 46 assertions in the same spirit, with the same header instruction
(*"if this test is red, update the document — do not relax the assertions"*):

1. `last-sync.md` carries a `- **Commit:** <sha>` bullet near the top, **and that SHA resolves**
   (`git cat-file -e`). A SHA from an unfetched branch makes the staleness check skip just as
   silently as a missing header.
2. Every `.context/stages/NN_name/CONTEXT.md` H1 begins `Stage NN`.
3. No `.DS_Store` under `.context/`.
4. One distinctive anchor per mirrored binding rule must appear in **both** `tribal-knowledge.md`
   Q4 and `CLAUDE.md` — the owner asserted first, since a rule missing there has no tracked home at
   all. Skipped, not failed, when `CLAUDE.md` is absent (it is gitignored, so it legitimately will
   not exist in CI or a fresh clone).
5. Footprint ratchet: a total cap and a per-file cap.
6. **Dead-path resolution** — every backticked repo-relative path cited anywhere in `.context/` or
   `CLAUDE.md` must resolve in the repo **or in the parent workspace**.
7. **No new dated `Correction:` annotations** in stage output, per file.

Assertions 5–7 are **ratchets against a committed baseline**
(`contextDocSync.baseline.json`), not absolutes, because the tree is mid-remediation: they permit
what is there and fail anything new. A guard that goes red the day it lands gets deleted; a ratchet
that starts where you are still stops you going backwards. The baselines carry a `_README` saying
they may only ever shrink. The known-missing-paths list has a second assertion keeping it honest —
**an entry that starts resolving again must leave the list**, so it cannot become a place real
breakage hides.

**Every assertion was mutation-tested.** Each was made to fail on purpose before being trusted:
header broken, stage title reverted, a `.DS_Store` created, a mirrored rule deleted, a dead path
cited, a dated correction appended. The first attempt at the mirror mutation *passed* — renaming
`npcSquadBand` to `npcSquadBandX` left the anchor as a substring — which was a flaw in the mutation,
not the test; a genuine deletion of the rule fails it correctly.

## 5. Two invariants now written into `.context/CONTEXT.md`

- **Edit current-state files in place.** Never leave a superseded claim live above a dated
  "Correction:" paragraph — that is how nearly every error above survived, because the wrong
  sentence stayed first on the page. This is *in*-contract: the skill's own `revise-not-rewrite.md`
  says to "update anything the code has since changed", and the dated-correction habit is a local
  one that nothing in the methodology asks for.
- **Name symbols and test files, never hand-typed counts or line numbers.** Write the `grep`, point
  at the test that asserts the number, and where a figure must be written down, date it and say
  what measured it.

## 6. Verification

- `npx tsc --noEmit` — **clean**.
- `npx jest contextDocSync` — **46/46 green**, each assertion separately proven to fail when
  violated.
- Staleness check re-run end to end from the restored header: resolves, and returns an empty list.
- Footprint re-measured against `BASELINE-2026-11-20.md`.
- `npm test` — **661 suites / 11,116 passed, 3 skipped, 11,119 collected, zero failures**, 247.0 s.
  `npx jest --listTests | wc -l` = **661**, equal to the suite count, so nothing was silently
  uncollected.
- **It reconciles exactly**, which the suite-count discipline exists for:

  | | suites | tests |
  |---|---:|---:|
  | baseline at `9bac0b18` (quoted in `environment.md`) | 659 | 11,057 |
  | `ec949536` — `scoutReanchor.test.ts` | +1 | +13 |
  | this pass — `contextDocSync.test.ts` | +1 | +46 |
  | **measured** | **661** | **11,116** |

  The 6 lines `ec949536` added to `seasonBudgetService.test.ts` are assertions inside an existing
  test, not new blocks, which is why that commit is +13 and not more. `environment.md`'s row and
  its `CLAUDE.md` mirror both carry the new figure, owner first.
- ⚠️ **Two caveats on that run, stated rather than buried.** It was taken **in the working
  checkout**, not in a detached worktree at a named commit with suites serialised, which is what
  `environment.md`'s own warning asks for; the machine was otherwise idle and the run came in
  faster than its 322 s estimate, but it is not the gold-standard measurement. And "a worker
  process has failed to exit gracefully" appears again — the same pre-existing,
  run-ordering-dependent warning already recorded on this branch, not something this pass
  introduced.

## 7. What is deliberately NOT done

The size problem itself. `game-mechanics.md` (229 KB), `services.md` (193 KB), `patterns.md`
(191 KB), `current-focus.md` (109 KB) and `architecture-notes.md` (99 KB) are untouched as
structures — only wrong sentences inside them were replaced. Loading `07_synthesis` still costs
~114k tokens, and it is now the largest stage, having overtaken `05_ui`.

Still open, in the order recommended in `context-refresh.md`:

1. **`07_synthesis` split** — `simulation-rules.md` (with the missing **AMP-vs-NPC matrix**,
   `SelectionService`, `ResultsEngine`) + `economy-reference.md` (a constants table over all 35
   `src/economy/` modules, 33 of which are currently unmentioned anywhere).
2. **`03_data` + a new `db-runtime.md`** — the largest coverage hole: `runExclusive` and its
   watchdog, `withMaintenanceLock`'s bidirectional deadlock ban, `runBulkWrite`, the `AppState`
   write gate, `migrate.ts`'s WAL/leak singleton, the boot hydration chain,
   `cacheIntegrity`/`cacheRepair`, `bmc_saves/slot_N/`.
3. **`05_ui` prune** — `patterns.md` to ~25 KB, extract `sprites.md`.
4. **`04_interfaces` rewrite** — `services.md` + `controllers.md` across 145 files, plus the
   offline-vs-online transport matrix. Needs `.context/CONTEXT.md`'s services row retargeted first,
   since the router currently *instructs* `services.md` to keep a per-change diary.
5. **Hygiene** — `stack.md`'s `main: "index.js"`, `structure.md`'s file counts (drop them),
   `git-activity.md` (1,269 commits stale), and the skill package's own stale duplicate stages
   (`stages/05_documentation/`, `stages/06_synthesis/`).

Each should tighten the baseline in `contextDocSync.baseline.json` as it lands. Revert the whole
pass with `git reset --hard context-refresh-base`.

---

# Phase 2.1 — the `07_synthesis` split (same day)

Run after the owner chose it over the `db-runtime.md` doc. Scope: the first deferred item from §7.

## 1. What `game-mechanics.md` became

| | Before | After |
|---|---:|---:|
| `game-mechanics.md` | 229,038 B / 3,098 lines | **1,857 B redirect stub** |
| `simulation-rules.md` | — | **128 KB** (`§0`–`§7b`, `§9`–`§11`, new `§A`) |
| `economy-reference.md` | — | **158 KB** (`§8`, `§12`, `§13`, new `§E`) |
| `current-focus.md` | 108,646 B | **8,672 B** |
| `architecture-notes.md` | 98,745 B | 95,442 B |
| `overview.md` | 3,576 B | 4,700 B |
| **stage `07_synthesis` total** | 435,121 B | **413,077 B** — *while adding ~30 KB of new reference* |

**Sections were MOVED, not rewritten.** The ICM contract treats human-authored content as
authoritative, so the split is structural and the prose inside each section is untouched. The only
rewrites are the two new sections and the specific factual errors named below.

**Why a stub rather than a rename:** ~45 source-code comments and a dozen `.context/` documents
cite `game-mechanics.md §N`. Section numbers were **deliberately not renumbered**, so every one of
those citations still resolves — `§8`/`§12`/`§13` to the economy file, everything else to the
simulation file. Renaming would have meant 45 source-file comment edits for no gain; the stub costs
1.8 KB and tells a reader which file to open. It carries its own deletion condition.

## 2. The two artefacts that did not exist anywhere

**`§A` — the AMP-vs-NPC divergence matrix.** The audit called this the single most-requested missing
artefact. `SelectionService.ts` and `ResultsEngine.ts` — the XI picker and the match engine, between
them the whole of what happens on a Saturday — had **zero mentions** in `.context/`. §A now carries
50+ rows (quantity · AMP · NPC · where enforced · **deliberate or artefact**), the five-pass picker,
the dominance chain, and the fact that **there is no home advantage anywhere in the engine** (zero
grep hits; readers assume it exists).

§A.6 collects the **nine artefacts** — divergences nobody chose. The two sharpest:

- **NPC player morale is discarded at the sim boundary.** `morale: 50` is hardcoded on every NPC
  player entering the sim, so the `moraleFactor` term is always exactly 1.0 — while the engine
  elsewhere moves that morale. NPC selection *and* dominance are morale-blind.
- 🔴 **~~Investor income is counted when deciding whether an NPC club is broke, and never credited
  to its bank.~~ WITHDRAWN — this claim was WRONG; see Phase 2.2 §2 below.** It is credited, as a
  season lump. I verified that `computeNpcWeeklyFinances` omits investor income (true) and did not
  verify the stronger claim that nothing else credits it (false) — the omission is correct because
  the cash is seasonal.

None is fixed. Several change balance, so none should be tidied without a ruling.

**`§E` — the `src/economy/` constants table, module index and contradiction register.** 35 files,
the #2 non-test commit hotspot, **33 of them documented nowhere**. §E gives every governing
constant with its file, a per-module index with callers, the six formulas worth stating in full, and
nine live contradictions. The sharpest:

- 🔴 **Two modules read the same tier table by incompatible keys, and each one's comment calls the
  other wrong.** `economyConfig.tierRowFor` uses `tiers[tier - 1]`; `perTierEconomy.tierRow` uses
  `.find(r => r.tier === leagueTier)` — and `perTierEconomy`'s comment says *"match on `row.tier`,
  never index arithmetic, or Scotland's tier 4 reads England's"*. They agree **only while the
  published array is dense, 1-based and ordered**, and `resolveEconomy` has ~20 callers.
- 🔴 **The 60%/25% budget dials exist in three places and the modules disagree on whether they may
  be trusted.** `harness/loadExport.ts` **refuses to run** rather than use the app's copies;
  `economyDiagnostics.ts` uses them as truth and says so. If the backend ever authors anything
  else, the gate and the CHECKS panel will disagree about every tier and only the gate will say so.
- **Three dead modules** (`relegationClause.ts`, `newSaveEconomyGuard.ts`, `budgetView.ts`) and one
  dead export (`financialApproach.headroomMultiple`) — two with live prose describing them in the
  present tense. `newSaveEconomyGuard` exists solely to warn when a new save resolves to the legacy
  model, so **the defect it was built to surface cannot currently be surfaced.**

Both sections were produced by delegated source reads and then **spot-verified against code before
publication** — the dead modules, the tier-row contradiction, the `morale: 50` hardcode and the
investor-income omission were each confirmed directly.

## 3. 🔴 A BINDING rule was narrowed — owner first, then mirror

"Perception decides WHO plays, **never HOW WELL they play**" is **not exactly true**, and the loose
wording hid a real path. Verified in code:

1. `CohesionEngine.computeMatchdaySquad` sets `perceived = clubType === 'amp'` (`:84`) and uses it
   for both the XI and the rotation sort — so perception decides **which 18** are in the matchday
   squad.
2. `computeCohesionFromSquad` counts bonded/friction pairs over **exactly that 18**.
3. `ResultsEngine.calculateDominance:393-399` then applies
   `score *= passAccuracyMultiplier; score /= errorRateMultiplier`.

So a misperception can move the cohesion multiplier on the whole team score. The rule now reads
**"perception decides WHO plays. It never scales a chosen player's contribution"** — which is
exactly true, and the direct half is enforced by **signature**: `calculateScore(player)` takes no
`perceived` parameter and `ResultsEngine` does not import `playerRatingStore`.

⚠️ **This is not a defect to go and fix, and it is flagged for the owner rather than changed.**
`CohesionEngine.ts:81-83` makes the correct argument for `perceived` belonging there — the matchday
squad has to be the one the club would actually name, or cohesion models a dressing room that never
takes the field. Both readings are defensible; which one is wanted is an owner's call. What was not
defensible was stating the rule absolutely while the path existed.

Updated in `tribal-knowledge.md` Q4 first, then re-mirrored to `CLAUDE.md`, per the one-way rule.

## 4. `current-focus.md` 109 KB → 9 KB

It is now an **index of open work**, not a changelog. It had a verbatim 45-line duplicate of its own
opening, a `2026-11-15` section spliced in below September's, and **zero coverage of the A12–A28/B1
economy workstream that was this branch's actual live work**. It now names the five open threads —
country scaling (which blocks the deploy), the unverified-on-device B1/A27, new-game-setup v3, the
parked items and the unowned defects — and **points at
`economy-loose-ends/HANDOVER-2026-11-20-EOD.md`**, which owns that effort, rather than rebuilding
its index. Old contents verbatim in `../context-archive/07_synthesis-current-focus-history.md`.

## 5. `architecture-notes.md` — five drifts fixed, ~600 lines flagged rather than cut

| Was | Is |
|---|---|
| i18n catalogue "~2,600 entries" | **5,029**, counted |
| `withLang()` on "exactly three endpoints" | **Four** — it missed `tournamentHttp.ts`, which wraps *every* tournament path, the largest body of server-rendered text in the app |
| `zustandStorage` used by "the 5 stores", listing `authStore` | **8** stores, and **`authStore` is not one** — it passes `createSecureAuthStorage`, so "it calls `persist()`" does not imply "it is in `store_state`" (9 persist, 8 reach `store_state`) |
| `assessYouthPlayer` "deliberately excluded" from tier-relative scoring | It **was** made tier-relative on 2026-11-10, after the absolute threshold meant a local club's max score was ~24 against a bar of 50 — **the bottom half of the pyramid released 100% of its academy intake by arithmetic** |
| `npcContractRenewalEngine` "almost certainly has the identical bug", left untouched | The suspicion was right; **fixed the same day**, now scoring tier-normalised ability |

The `assessYouthPlayer` entry is worth keeping in mind as a reasoning error rather than a typo: it
argued that because `potential` is a binding global 0–100 scale, its threshold must be absolute.
`potential` **is** still global in data — what changed is that the *verdict* is relative to squad
standard, and the hidden-gem concern was protected a different way (reputation sets the **spread**
of misjudgement, never a direction). **"The scale is global" does not imply "the threshold must be
absolute."**

⚠️ **The ~600-line boot/crash diary was flagged, not cut.** It mixes live invariants ("the navigator
must stay mounted", "a native crash does not carry your last JS breadcrumbs") with spent narrative,
and one subsection states **current** behaviour while sitting below the stale sections it corrects.
Archiving by line count would have deleted load-bearing rules, so the section now carries an
explicit triage note saying what the work is and why it was not done blind. Only the pre-hub
tournament history (8 KB, fully superseded) was archived.

## 6. Verification

- `npx tsc --noEmit` — **clean**.
- `npx jest contextDocSync schemaDocSync` — **48/48 green**.
- **The ratchet tightened, which is the point:** per-file cap **240,489 → 204,051 B**, total cap
  **1,627,131 → 1,583,911 B**, and `knownMissingPaths` **shrank 40 → 38**. Four external citations
  were *qualified* (`wunderkind-backend/…`, `../docs/…`) rather than added to the allowlist — the
  discipline that list exists to enforce. `schemaDocSync` passing confirms the `03_data` edits did
  not break the backticked-table-name contract.
- `.context/` across both of today's passes: **1,930,071 B → 1,508,487 B** (482,517 → ~377,000 est.
  tokens, **−22%**), **while gaining ~30 KB of new reference**. `07_synthesis` is no longer the
  largest stage; `05_ui` is, and `patterns.md` (194 KB) is now the largest single file in the tree.

## 7. Still deferred

In the order I would take them: the **`03_data` DB-runtime doc** (the largest remaining coverage
hole — locking, hydration, cache repair, save-slot isolation), the **`05_ui` prune**
(`patterns.md` 194 KB → ~25 KB, extract `sprites.md`), the **`04_interfaces` rewrite**
(`services.md` + `controllers.md` across 145 files, plus the transport matrix), and
**`architecture-notes.md`'s boot-diary triage**. Each should tighten the baseline as it lands.
