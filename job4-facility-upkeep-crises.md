# Job 4 — Facility Upkeep Crises (Infrastructure Trade-Offs)

You are implementing a new feature in the Wunderkind Factory React Native app at
`/Users/courtneyadesile/Documents/WunderkindFactory/wunderkind-app`.

**Start by reading `CLAUDE.md` and `.context/CONTEXT.md`** (the stage router — use it to scope
what else you read; do not load the whole `.context/` folder).

**Process:** brainstorm and write a plan before touching code. Get the plan approved. Then
implement. Do not skip to implementation.

---

## The concept

**Hook:** Neglecting facility condition triggers catastrophic pitch or medical failures right before
crucial matchdays.

**Adaptation:** Facilities already have a Condition percentage. When condition falls below ~40%,
weekly maintenance is no longer enough and emergency events fire — e.g. "Pitch flooded: −15% match
performance next home game", or "Hydro pool breakdown: recovery rate reduced by 50% for 3 weeks".

**Over a season:** Balancing stadium expansion, youth upgrades and day-to-day repairs creates
constant friction on weekly cash flow.

**The decision:** Patch degrading facilities on the cheap, or pour capital into permanent upgrades
while risking a squad wage deficit.

**Main risk to design against:** Annoying and punitive. If failures fire without clear advance
warning, players will feel cheated by RNG. Telegraphing — a visible risk indicator that rises before
anything breaks — is a requirement, not a nicety.

---

## Verified codebase findings

These were confirmed by direct inspection. Trust them, but re-verify anything you're about to
depend on heavily.

### This is the smallest of the three remaining jobs

Condition, decay, repair costs, an auto-repair AI and a nag message **all already exist**. The
missing half is consequences: nothing bad happens when condition is low beyond a proportional
reduction in benefits.

### Facility state

`src/stores/facilityStore.ts` (343 lines), `interface FacilityState` (L34–81):
```ts
templates: FacilityTemplate[];        // live from backend, else FALLBACK_FACILITY_TEMPLATES
levels: FacilityLevels;               // Record<slug, number>, 0 = not built
conditions: FacilityConditions;       // Record<slug, number>, 0–100
constructions: FacilityConstruction[];
doubleDecayActive: boolean;           // facility-manager resignation collateral → 2× decay
```
Actions: `setTemplates`, `upgradeLevel`, `startConstruction`, `completeConstruction`,
`updateConstruction`, `getActiveConstruction`, `initAllLevels`, `decayCondition`, `repairFacility`,
`resetCondition`, `persistNow`, `loadFromSQLite`, `maxSquadSize()`, `analyticsUnlocked()`,
`totalWeeklyMaintenance()`, `facilityTier()`.

Helpers: `facilityUpgradeCost(template, currentLevel)` = `(level+1) × baseCost` (L21);
`calculateFacilityUpkeep(template, level)` = `floor(weeklyUpkeepBase × 1.5^level)` (L27).

**Degradation:** `decayCondition()` (L261–274) subtracts
`weeklyDecayRate(lvl, t.decayBase) × (doubleDecayActive ? 2 : 1)` for every built facility, floored
at 0. `weeklyDecayRate` (`src/types/facility.ts:222`) = `decayBase + level`. Called once per tick at
`GameLoop.ts:2902` ("§ 8b. Advance week + facility decay"), deliberately **after** benefits are applied.

**Repair already exists three ways:**
- Manual: `repairFacility(slug)` (L276–297) — cost from `repairFacilityCost()`, posts an `upkeep`
  transaction, sets condition to 100
- Auto: facility-manager auto-repair at `GameLoop.ts:2954–3022` (§ 8c) —
  `FacilityManagerBrain.assessRepairs()` → `resetCondition()` + `addTransaction` +
  `spendFacilitiesBudget`, then a `facility_repair` inbox message
- Nag: `GameLoop.ts:2906–2929` sends inbox `facility-maint-wk{N}` every
  `config.facilityMaintenanceFrequencyWeeks` (default 4) when any built facility is `< 60`;
  `GameLoop.ts:2932–2952` counts `< 80` in the periodic status message

`repairFacilityCost(level, condition, weeklyUpkeepBase)` (`src/types/facility.ts:236`) =
`ceil(floor(weeklyUpkeepBase × 1.5^level) × ((100-condition)/100) × 10)` — pence.

### How condition currently affects the game

`src/engine/facilityEffects.ts` — `FacilityEffects` (L10–44) is a flat bag of 20 totals:
`xpMultiplierTotal`, six `*GrowthMultiplierTotal`, `injuryProbabilityDelta`,
`injuryRecoveryWeeksDelta`, `scoutErrorRangeDelta`, `scoutRevealWeeksDelta`, `cohesionBonusTotal`,
and eight personality `*GrowthTotal`.

`computeFacilityEffects(templates, effectiveLevels)` (L65) sums
`gameplayEffects[key + 'PerLevel'] × effectiveLevels[slug]` per template.

**Condition enters only via `effectiveLevels`**, computed once per tick at `GameLoop.ts:256–268`:
```ts
const eff = (slug) => underConstructionSlugs.has(slug) ? 0
  : (levels[slug] ?? 0) * ((conditions[slug] ?? 100) / 100);
```
Note facilities under construction contribute **zero** — an existing precedent for temporarily
zeroing a facility's benefits.

Downstream in `GameLoop.ts`: `tacticalBoost = 1 + cohesionBonusTotal` (L462) multiplies total coach
performance; `calculateWeeklyXP(xpMultiplierTotal, totalCoachPerformance, config.baseXP)` (L466);
`calculateInjuryProbability(injuryProbabilityDelta, config.baseInjuryProbability)` (L469);
`calculateInjuryDuration(tier, injuryRecoveryWeeksDelta)` (L538). Reputation:
`calculateReputationDelta(templates, levels, conditions)` in FormulaEngine applies condition itself.

So today, low condition is a smooth linear taper on benefits. There is no cliff, no event, no
match-day effect.

### ⚠️ activeEffectStore: exists, but has exactly one consumer

`ActiveEffect` (`src/types/narrative.ts:168`):
```ts
export interface ActiveEffect {
  id: string;
  slug: string;
  affectedEntityId: string;
  ticksRemaining: number;
  tickEffect?: StatChange;
  completionEventSlug: string;
  startedAt: string;
}
```
`src/stores/activeEffectStore.ts` (51 lines): `effects[]`, `addEffect`, `removeEffect(id)`,
`decrementAllTicks()` (returns effects that hit 0 and drops them), `getEffectsForEntity`, `clearAll`.

- **Created** only by `SimulationService.createActiveEffect(slug, entityId, durationConfig)`
  (`SimulationService.ts:1470–1481`)
- **Expired** by `processActiveEffects()` (`SimulationService.ts:990–993`) →
  `decrementAllTicks()` → `triggerCompletionEvent(effect)` (L995), which pushes a narrative message
- **Consumed** by exactly one reader: `SimulationService.ts:625–632`, attendance bonuses, matched by
  the convention `tickEffect.target === 'club' && tickEffect.field === 'attendance_bonus'`
- Persisted at `bootstrap.ts:120` / `:289` (key `active-effect-store`),
  `SaveGameService.ts:86`, reset in `resetAllStores.ts:60`

**There is no consumer applying an active effect to match strength.** That's the gap for a temporary
match penalty. The generic machinery (create/tick/expire/persist) is done; you're adding readers.

### Where a match penalty can be injected

`src/engine/ResultsEngine.ts`:
```ts
export interface SimTeam {
  xi: Player[];
  playingStyle: PlayingStyle;
  managerAbility: number;
  managerMotivation?: number;   // added in Job 1
  lowUrgency?: boolean;         // added in Job 1
}
static simulate(home, away, tacticalMatrix, styleInfluence = {}, ampSide = false, matchTemplates?): MatchResult
private static calculateDominance(team, opponent, matrix, styleInfluence): number   // ~L306
```

`calculateDominance` is the **single team-strength funnel**: sums
`SelectionService.calculateScore(p)` over the XI, then applies the style boost (≤ +10%), the
tactical-matrix multiplier, the manager boost (now motivation-scaled), a low-urgency sharpness
multiplier, and a personality multiplier (±5%).

**There is still no home-advantage or venue term at all.** Job 1 established the pattern for adding
a modifier here: extend `SimTeam` with an optional field defaulting to neutral, so no call-site
signature changes ripple, and add a regression test proving the neutral default reproduces current
numbers exactly. Follow that — see `src/__tests__/engine/ResultsEngine.motivation.test.ts`.

Call site: `ResultsEngine.simulate(...)` at `SimulationService.ts:~204`, immediately after
`ampIsHome`/`ampIsAway` are computed (L200–203). `getSimTeam` (L822) already applies a per-player
multiplier (`getMotivationPerformanceMultiplier`) — precedent for a condition-based debuff at team
assembly instead.

Three candidate injection points, in order of leverage:
(a) `GameLoop.ts` §8b around L2902, after `decayCondition()` — detect the crisis and create the effect
(b) `SimulationService.ts:~204` — read `activeEffectStore` before `simulate` and pass a modifier
(c) `ResultsEngine.calculateDominance` — the only place team strength is multiplied

### Injury / recovery (the medical-failure lever)

- `FormulaEngine.calculateInjuryProbability(delta, base)` (`:29`) = `max(0, base - delta)`
- `FormulaEngine.calculateInjuryDuration(tier, injuryRecoveryWeeksDelta)` (`:62`) =
  `max(1, round(randomInRange - delta))`
- AMP injury rolls: `GameLoop.ts:518–541` (respects a max-injured cap via `slotsAvailable`),
  `setPlayerInjury(id, { severity, weeksRemaining, injuredWeek })`
- NPC injuries every 2 weeks: `GameLoop.ts:564–615` — note `calculateInjuryDuration(tier, 0)` at
  L612, i.e. NPCs get no facility recovery benefit
- Recovery countdown: `tickInjuries()` at `GameLoop.ts:2556`, implemented in
  `squadStore.ts:353–372`
- Facilities feeding this: `physio_clinic` (`injuryProbabilityDeltaPerLevel: 0.01`,
  `injuryRecoveryWeeksDeltaPerLevel: 0.25`) and `hydro_pool`
  (`injuryRecoveryWeeksDeltaPerLevel: 0.5`)

### Facility templates

Source of truth is the backend via `setTemplates`; offline fallback is
`FALLBACK_FACILITY_TEMPLATES` (`src/types/facility.ts:78–220`). There is no
`src/constants/facilities.ts`. The `facility_config` SQLite table
(`schema.ts:446`, accessors `facilityRepository.ts:116–133`) is key/value and currently holds only
`double_decay_active` — **not** the templates.

| slug | category | maxLevel | decayBase | gameplayEffects |
|---|---|---|---|---|
| `main_stand` | STADIUM | 5 | 1.5 | none (capacity/income only) |
| `north_stand` | STADIUM | 5 | 1.5 | none |
| `away_stand` | STADIUM | 3 | 1.5 | none |
| `technical_zone` | TRAINING | 5 | 2.0 | `xpMultiplierPerLevel: 0.1`, `technicalGrowthMultiplierPerLevel: 0.05` |
| `strength_suite` | TRAINING | 5 | — | `powerGrowthMultiplierPerLevel: 0.06`, `technicalGrowthMultiplierPerLevel: 0.02` |
| `physio_clinic` | MEDICAL | — | — | `injuryProbabilityDeltaPerLevel: 0.01`, `injuryRecoveryWeeksDeltaPerLevel: 0.25`; also drives `maxSquadSize()` = `10 + lvl×3` |
| `hydro_pool` | MEDICAL | — | — | `injuryRecoveryWeeksDeltaPerLevel: 0.5` |
| `tactical_room` | TRAINING | — | — | `cohesionBonusPerLevel: 0.04` |
| `scouting_center` | SCOUTING | — | — | `scoutErrorRangeDeltaPerLevel: 5`, `scoutRevealWeeksDeltaPerLevel: 0.25`; also gates `analyticsUnlocked()` |

**Known inconsistency worth fixing or at least not tripping over:** the stadium view at
`app/(tabs)/facilities.tsx:1120` uses `['north_stand','south_stand','east_stand','west_stand']`
while `FALLBACK_FACILITY_TEMPLATES` defines `main_stand`, `north_stand`, `away_stand`.

### The BUILD tab UI (telegraphing lives here)

`app/(tabs)/facilities.tsx` (1293 lines). Tabs `TRAINING | MEDICAL | SCOUTING | STADIUM` (L77–87).
`FacilitiesScreen()` L1087; card list L1229/L1273 passing `condition={conditions[template.slug] ?? 100}`.

The facility card (props L201–213) already renders:
- `conditionColor(pct)` L105 — ≥60 teal, ≥30 orange, <30 red
- Condition % text L437 and a fill bar L440
- `benefitLabel(slug, level)` L100 with `LEVEL_BENEFIT_LABELS` L91–98 (hardcoded client-side
  strings, not derived from `gameplayEffects`)
- **A repair button already exists** (L456–463, `REPAIR £X`), gated by
  `needsRepair = level > 0 && condition < 100` (L239) and `canAffordRepair` (L236); confirmation
  modal L524–546 → `confirmRepair()` L298
- Upgrade button L472 → modal L481 → `confirmUpgrade()` L252

This card is where a rising failure-risk indicator belongs — it is the answer to the "feels like
cheating RNG" risk.

---

## Overlay / inbox patterns

`InboxMessage` has **no `options`/`choices` field**. Two mechanisms: (a) binary `requiresResponse` →
ACCEPT/REJECT, (b) `actions: {label, action}[]` handled by a switch in the UI.

For a decision overlay (e.g. "emergency repair now at 3× cost, or play the match on a flooded
pitch"):
1. Add a member to `OverlayEventType` (`src/stores/eventOverlayStore.ts:3`)
2. Add an entry to `OVERLAY_TO_INBOX_TYPE` (`src/utils/overlayMessaging.ts:7`) — exhaustive
   `Record`, so omitting it is a compile error
3. Add to `DEDICATED_BUTTON_TYPES` (`src/components/EventQueueOverlay.tsx:50`), plus
   `NON_DISMISSABLE_TYPES` (:40) / `NON_SUPPRESSIBLE_OVERLAY_TYPES` (`overlayMessaging.ts:32`) if
   it must not be skippable
4. Add a button branch in `EventQueueOverlay.tsx` — copy the `staff_ultimatum` idiom at ~line 1041
5. Put resolution logic in its own service module

Existing overlay types already include `construction_problem` and `construction_suspended` — check
whether either fits before adding a new one.

**Gotcha:** `inboxStore.addMessage` dedupes by `id` and **silently no-ops** on a duplicate. For a
recurring weekly crisis, make sure the id varies per occurrence or you'll lose events.

---

## Conventions that will trip you up

- **No migrations.** `MIGRATIONS: string[]` is intentionally empty. Add columns/tables directly to
  `CREATE_SCHEMA` in `src/db/schema.ts` and bump `SCHEMA_VERSION` (currently 12) to force a wipe.
  Never `ALTER TABLE`. `MIGRATION_TABLE_NAMES` auto-derives, so new tables are picked up by
  `clearAllClubData()` and save/load for free.
- **`clubStore.setReputation(delta)` takes a DELTA, not an absolute.** (This bit me during Job 1.)
- **Money:** backend pence, local stores whole pounds — except `clubStore.transferBudget` /
  `facilitiesBudget` which are pence. Facility costs are pence throughout.
- **Batch writes.** SimulationService collects into arrays and flushes once — never `set()` per
  entity in hot loops.
- **UUIDs:** `uuidv7()` from `src/utils/uuidv7.ts`.
- **React keys:** `.id` + index fallback; never a name.
- **Tables:** `SortableTable` with `flex` columns; never fixed `width` on row cells.
- **Text components:** `PixelText` (titles ≥10px), `BodyText` (names/descriptions),
  `VT323Text` (data rows).

---

## Verification

```bash
nvm use && npx tsc --noEmit
```

**Test baseline — do not assume all-green.** Roughly 11–12 suites fail from pre-existing stale mocks
(`youthRepository`, `bootstrap`, `transactionRepository`, `matchResultRepository`,
`DevelopmentService`, `DofBrain`, `DofSigningService`, `FacilityManagerBrain`, `TransferService`,
`pyramidNewsContent`, `npcContracts`). Most fail with `runExclusive is not a function` or
`db.runAsync` not mocked. Note `FacilityManagerBrain.test.ts` is **already failing** — you will be
working next to it, so establish its baseline before you touch anything nearby.
`ResultsEngine.test.ts` is additionally **flaky** — a 200-iteration random win-rate test that fails
roughly 1 run in 3 on unmodified code.

Capture your own baseline first:
```bash
nvm use && npx jest --silent 2>&1 | grep -E "^FAIL|Tests:" | sort -u
```
Compare at the end. If a suite you touched starts failing, `git stash` your change and re-run it to
prove whether it was already broken.

Also run, since `tsc` won't catch these:
```bash
# Bundle — catches import cycles and bad paths
nvm use && npx expo export --platform ios --output-dir /tmp/exportcheck
```

**Required regression test:** if you add a term to `calculateDominance`, prove the neutral default
reproduces today's numbers *exactly*. Pin `Math.random` to several fixed values and assert identical
scorelines with and without the new field — see
`src/__tests__/engine/ResultsEngine.motivation.test.ts`. Do not use random win-rate sampling for
small effects; it is too noisy and will flake.

**Test the anti-frustration property:** assert that a crisis cannot fire without the warning state
having been observable for N weeks first. That is the test that proves the design isn't cheating RNG.

---

## Definition of done

- Condition below a threshold produces discrete, named crisis events — not just a linear taper
- At least one match-day consequence and one medical/recovery consequence, wired through
  `activeEffectStore` (giving it real consumers) or an equivalent justified mechanism
- Clear advance telegraphing on the BUILD tab card: the player can see risk rising and act before
  anything breaks
- Emergency repair is a meaningful cash-flow trade-off against planned upgrades
- `tsc` clean; new tests pass, including the neutral-default regression test and the
  anti-frustration test; full-suite failures unchanged from your captured baseline
- Report honestly what you did and did not verify (E2E in the simulator needs the Lando backend and
  `npm run proxy`; say so if you didn't run it)
