<!-- STATUS: 📋 OWNER RULING, BRIEF READY, NOT STARTED (2026-11-20) -->

# A26 — Give scouts an `ability`, 1–100, derived from experience and judgements

**Owner ruling, 2026-11-20:**

> *"It would help if we added an 'ability' property to scouts, as experience doesn't match 1 to
> one. Let's do this… Add 'ability' value, 1-100, have it driven off experience and judgements,
> to set a single figure, then we'll base wage on that. We'll need to alter the frontend too —
> for now the value will do nothing other than determine salary."*

This supersedes A24's option 1 (*feed `experience` into the band as-is*). The owner picked
option 2: scouts get a real ability.

## 🔴 The conflation is already live in two places — this is a fix, not just an addition

`experience` is **already being used as ability**, and nobody wrote that down as a decision:

| site | what it does |
|---|---|
| `SeasonBudgetService.ts:502` | `ampStaffWagePence(scout.experience ?? 0, economy)` — the season snap prices a scout as if experience were a coach's `coachingAbility` |
| `types/tournament.ts:415` | *"Unifies `Coach.coachingAbility` and `Scout.experience` — both are 'raw 0-100 ability from backend'"* |
| `types/market.ts:76` | `/** Raw 0–100 ability from backend. */ experience: number;` |

The owner is right that they do not match 1:1. **So A26 is not adding an unused field — it is
giving a name to a quantity three sites already assume exists.** Those comments must be
corrected in the same change, or the next reader re-makes the conflation.

## ⚠️ Scope split — read this before starting

The ruling says the value *"will do nothing other than determine salary"*, but scout salary is
**A24**, which is blocked behind part B's budget move (`part-b-resolved-budget-model.md`).
`anchorAmpStaffWages` snaps AMP scouts at `SeasonBudgetService.ts:500-504`, so band pricing wired
today would be overwritten for the owner's own scouts and visible only on market/NPC rows.

**So build it in two phases. Phase 1 is this brief and depends on nothing.**

| phase | what | depends on |
|---|---|---|
| **1 — A26, this brief** | the field: derive, store, publish, ingest, and point the three conflation sites above at it | nothing |
| **2 — A24** | band-based pricing for staff *and* scouts | part B's snap removal |

Phase 1 is worth landing alone: it removes a live conflation, and it makes A24 a smaller change.
**Do not wire the band in phase 1** — it would measure as a no-op on the owner's own scouts,
which is exactly the trap A24 already records.

## The data that exists today

**Backend `Scout`** (`src/Entity/Scout.php`): `experience` (int, unsigned, default 0),
`judgements` (json), `weeklySalary`, `personality`, `nationality`, `dob`, `appearance`.

**`judgements` categories — ⚠️ resolve this first, the two repos disagree:**

- app `ScoutJudgements` (`types/market.ts:65-68`) — **7** keys: `potential`, `mental`,
  `technical`, `physical`, `youth`, `senior`, `personality`
- `PoolConfig.php:241` — *"Min value for all **5** scout judgement categories"*

**Find out which is true before writing the formula** (`GenerateMarketDataCommand.php:582-610`
builds them and is the best evidence). A mean over the wrong key set is a silently wrong number.

## The derivation — a decision, not a lookup

`ability = f(experience, judgements)`, one integer 1–100. The ruling does not fix the weighting,
so **propose one and state it in the brief reply rather than burying it in code.** A reasonable
default is a weighted blend of `experience` and the mean of the judgement categories, but the
split (50/50? 30/70?) is the owner's to confirm — put the number in front of them with a short
table of what it does to a few real scouts.

Constraints that are NOT optional:

- **Deterministic.** Same inputs, same ability, every time. It feeds a wage.
- **Monotonic.** Better experience or better judgements must never lower ability.
  `staffWages.ts:46-50` already states why: *"a non-monotonic wage would make 'hire the better
  scout' sometimes cheaper, which reads as a bug rather than a bargain."*
- **Clamped to 1–100**, and the backend column is unsigned — an admin can type anything.

## 🔴 The one architectural decision, and my recommendation

`experience` and `judgements` are **both already in the world pack**, so the app *could* derive
ability on device and no payload would change.

**Do not do that.** It would create a second source for one quantity with nothing saying which
is authoritative — the governing defect this entire workstream exists to remove. **The backend
computes and stores `ability`; the app reads it.** That matches "the backend owns the template".

⚠️ **The cost is a `WORLD_PACK_VERSION` bump, 11 → 12, and it is legitimate.** The pack-is-a-
census rule says v11 was the last bump *money* would cause; `ability` is census, not money, and
the rule explicitly allows ability content to bump (v9 and v10 both did). `buildScoutSnapshot`
currently omits `weeklySalary` **deliberately** to avoid a bump (`staffWages.ts:27-34`) — that
reasoning does not transfer, because a salary is money and this is not. **Say so in the commit**,
or the next reader will think the rule was broken.

## Work, backend

1. `Scout::$ability` — int column, unsigned, 1–100, with the derivation documented on it.
2. **Migration + backfill** for every existing scout from its own `experience` + `judgements`.
3. Set it at generation — `GenerateMarketDataCommand`, and the scout path in
   `StaffGenerationService` / `ClubGenerator` (confirm which actually builds club scouts).
4. Publish it: `MarketDataService.php:127`'s scout serialization, `buildScoutSnapshot`, and the
   starter pack. **Check for others** — `grep -rn "getExperience\|'experience'" src/`.
5. `ScoutCrudController` — expose it, read-only or editable is the owner's call.
6. `WORLD_PACK_VERSION` 11 → 12.

## Work, app

7. `Scout` (`types/market.ts:71`) and `MarketScout` (`:260` area) gain `ability: number`.
   **Correct the two misleading comments** at `:76` and `tournament.ts:415` in the same change.
8. Ingest at every scout site: `useInitFlow.ts:457`, `market.ts:297`,
   `StaffPoachingService.ts:252`, `worldStore`. ⚠️ **`?? 0` is a defect here, not a default** —
   the pack-is-a-census rule in `CLAUDE.md` says so explicitly, and a 0 ability would price a
   scout at the bottom of the band. Fall back to the derivation, never to zero.
9. `SeasonBudgetService.ts:502` — `scout.experience` → `scout.ability`. **This is a behaviour
   change** (scouts will be snapped to a different figure); it is the point of the ruling, but
   call it out rather than letting it look like a rename.
10. A migration for the local SQLite scout table if one is needed — check
    `src/db/repositories/` for how scouts are stored.

## Verification

- Backend: `vendor/bin/phpunit --filter '/^(?!.*AdminShellCoverage).*$/'` (a full run OOMs at
  ~183/3305). Baseline is **3,233 passing**.
- App: `npx tsc --noEmit` clean; `npm test` green **with the suite count confirmed**
  (`npx jest --listTests | wc -l`) against `new-game-save`'s own row in `CLAUDE.md`, and that row
  updated.
- **The economy gate must not move.** `scripts/economy/variantGate.ts` reads config and a world
  export, not scouts' wages — COVERAGE should be byte-identical. If it moves, something priced
  differently than intended; stop and diagnose.
- A real save on dev: scouts carry a plausible ability, nobody is at 0, and the wage they are
  charged is unchanged from before this phase (phase 1 must not move salaries).

## Branches

App `new-game-save`, backend `development`. Both repos are ICM — read `.context/CONTEXT.md`
first, and update the stage `output/` your change touches as part of finishing.

## Not yet established

- The 5-vs-7 judgement category count.
- The weighting. **Put a proposal to the owner; do not pick silently.**
- Whether anything outside the wage path should read `ability` later (the ruling says no, for
  now).
