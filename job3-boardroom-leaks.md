# Job 3 — The Boardroom Leaks (Media & Morale Drama)

You are implementing a new feature in the Wunderkind Factory React Native app at
`/Users/courtneyadesile/Documents/WunderkindFactory/wunderkind-app`.

**Start by reading `CLAUDE.md` and `.context/CONTEXT.md`** (the stage router — use it to scope
what else you read; do not load the whole `.context/` folder).

**Process:** brainstorm and write a plan before touching code. Get the plan approved. Then
implement. Do not skip to implementation.

---

## The concept

**Hook:** Disgruntled staff or benchwarmers leak internal club friction to the press.

**Adaptation:** When dressing-room cohesion or staff morale falls below 30%, a "Boardroom Leak"
incident fires via the inbox. A local journalist asks for a public statement regarding dressing-room
unrest or a staff pay dispute.

**Over a season:** Responding aggressively ("find the mole") tanks dressing-room morale further,
while diplomatically backing the staff costs financial bonuses or fan standing if results don't
improve.

**The decision:** Protect your budget and throw staff under the bus, or take a public reputation hit
to shelter your squad.

**Main risk to design against:** Exploitable. If one dialogue option always minimises damage it
becomes a memory check, not a choice. The right answer must depend on state the player has to
read — who leaked, current cohesion, results trend, budget headroom — not on memorising the
best button.

---

## Verified codebase findings

These were confirmed by direct inspection. Trust them, but re-verify anything you're about to
depend on heavily.

### ⚠️ The key gap: press events currently do nothing

`src/engine/PressEngine.ts` is pure flavour. **There are no morale, fan-sentiment or reputation
deltas anywhere in the press path.** There is no leak concept, no source attribution, and no
coupling to `dressingRoomHealth`. Giving press consequences is the substance of this job.

```ts
evaluatePressEvents(templates, formData: FormData, context: PressContext, season, weekNumber): PressEventResult[]
```
Pure — no store access, no side effects. Matches `EventCategory.PRESS` templates whose
`firingConditions` (`PressFiringConditions {type, threshold}`) match one of: `consecutiveLosses`,
`consecutiveWins`, `unbeatenRun`, `leaguePosition`, `relegationZone`, `goalDifference`.
Substitutes `{clubName} {managerName} {position} {streak}`. Returns
`{ template, resolvedBody, conditionKey: '{slug}:season{N}:week{W}' }`.

**Firing:** `src/engine/GameLoop.ts:4114` (step 12b). Dedupe is **seasonal** —
`${slug}:season${season}` via `usePressEventStore.hasFired/markFired` — so each press condition
fires at most once per season. Emits `type: 'press'`, id `press-${slug}-s${season}-wk${week}`,
`metadata: { systemType: 'press_event', templateSlug, conditionKey }`.

`src/stores/pressEventStore.ts` is just `firedKeys: string[]` + `hasFired`/`markFired`/`reset()`.
Reset by `SeasonTransitionService.ts:3314` and `resetAllStores`. **Note it is also reused for
*player* event dedupe** (`GameLoop.ts` 4162, 4215, 4777) and by `SeasonTransitionService`
(2295, 2668) — don't assume every key in it is a press key.

### Dressing room health (the trigger signal — already computed)

`src/types/interaction.ts:122`:
```ts
export interface DressingRoomHealth {
  cohesion: number;            // 0–100, density of positive relationships
  tension: number;             // 0–100, proportion of negative relationships
  squadMoraleAverage: number;
  cliques: Clique[];
  lastComputedWeek: number;
}
```
Stored as `dressingRoomHealth: DressingRoomHealth | null` in `src/stores/interactionStore.ts:13`,
written only by `updateDressingRoomHealth`. Computed in
`SocialGraphEngine.computeDressingRoomHealth(players, cliques, weekNumber)`
(`src/engine/SocialGraphEngine.ts:285`) — pairwise over active players using
`getPlayerPlayerBondValue` from `bondStore`: `cohesion = positivePairs/totalPairs*100`,
`tension = pairs with bond < -10 / totalPairs*100`. Fewer than 2 active players returns
`{cohesion: 50, tension: 0}`.

Called once weekly from `processSocialGraph()` (`GameLoop.ts:4001`, step 12). **Currently read by
exactly one place** — `src/components/PerformancePane.tsx:534`. Persisted in `bootstrap.ts:337`.

So the measurement half already exists and runs weekly. You are adding the consequence half.

### Staff morale (the other trigger signal)

Morale lives on `Coach.morale`, mutated only via `useCoachStore.getState().updateMorale(id, delta)`
(clamps 0–100, persists through `upsertStaffMember`). `setLowMoraleFlags()` sets `isLowMorale`
(<40) and `effectiveCoachingAbility = ability * 0.5`.

Weekly writers in `GameLoop.ts`: 3045/3050 (facility capacity/condition → facility manager), 3061
(`assessQualityExpectationMorale`). Plus `StaffConversationService` constants
(`IGNORE_MORALE_PENALTY -10`, `CONCEDE_MORALE_BOOST 15`, `PAYOFF_SUCCESS_MORALE 15`,
`PAYOFF_BACKFIRE_MORALE -10`, threshold `CONVERSATION_MORALE_THRESHOLD 20`, cooldown 10 weeks) and
`PromiseOutcomeService.applyOutcomeEffect`.

`Coach` also carries escalation state you should not collide with: `ultimatumPending`,
`lastUltimatumResolvedWeek`, `conversationPending`, `lastConversationResolvedWeek`,
`conversationRefireWeek`, and (added in Job 1) `motivation`, `lowUrgencyUntilWeek`,
`mandateVerdictPending`, `resignationPendingWeek`.

Coach personality traits are available as `coach.personality.<trait>` on the same 8-trait 1–20
`PersonalityMatrix` as players — useful for deciding who leaks and how they react.

### The existing escalation precedent — study this before designing

`src/engine/StaffConversationService.ts` → `src/engine/StaffUltimatumService.ts` is a fully built
two-stage escalation with three resolutions, and is the closest analogue to what you're building.
Read both before you design. Key pieces:

- `runWeeklyStaffReviews(weekNumber)`, `resolveConversationIgnore/PayOff/Concede`,
  `payOffCostFor(coach)`, `hasActiveStaffPromiseOfCondition(...)`
- `fireUltimatumFromFailedPromise(promise, weekNumber)` — the only entry point for ultimatums
- `resolveConcedeAndPromise` / `resolveCompromise` / `resolveReject`, with role-specific punishment
  (facility_manager pauses constructions + `setDoubleDecayActive(true)`; DoF −15 fan sentiment;
  manager −10 morale on loyal players)

Its three-button UI lives in `src/components/EventQueueOverlay.tsx:1041`. Parallel patterns exist
for `fan_ultimatum` (`FanConversationService`) and `player_contract_ultimatum`
(`PlayerConversationService`).

**Design tension to resolve in your plan:** low staff morale already triggers a
`staff_conversation`. A Boardroom Leak on the same signal risks double-firing on one cause. Decide
explicitly whether a leak is a *third* escalation stage, a parallel track with its own cooldown, or
gated on `dressingRoomHealth` (squad-side) while conversations stay staff-side. State the choice
and why.

### Fans and reputation

- `src/engine/FanEngine.ts` — `calculateScore(currentWeek)` (baseline 50, each event's `impact`
  decays 10%/week unless `isPermanent`), `calculateTargetScore(week, target)` filtering by
  `FanImpactTarget` (`'manager' | 'owner' | 'players'`), `getTier(score)`.
- `FanEventType` union in `src/types/fans.ts`: `match_win | match_loss | match_draw | player_sold |
  player_sold_favorite | facility_upgrade | system_bonus | system_penalty | trophy_won | promoted |
  relegated`. `system_penalty` / `system_bonus` are the generic hooks.
- Add via `useFanStore.getState().addEvent({...})`. Direct numbers via
  `fanStore.updateMorale(clubId, delta)` / `updateSentiment(clubId, delta)`.
- **`clubStore.setReputation(delta)` takes a DELTA, not an absolute.** It applies the league
  reputation cap itself. (This bit me during Job 1 — I passed an absolute and it would have added
  ~52 reputation.)
- `financeStore.addTransaction({ amount, category, description, weekNumber })` — amount in pence,
  negative = expense. `FinancialCategory` is a closed union in `src/types/finance.ts`; reuse an
  existing member if one fits (e.g. `staff_ultimatum_compromise`, `staff_conversation_payoff`)
  rather than adding one.

---

## Multi-option decisions: the established pattern

`InboxMessage` has **no `options`/`choices` field**. Two mechanisms exist: (a) binary
`requiresResponse` → ACCEPT/REJECT, (b) `actions: {label, action}[]` handled by a switch in the UI.
Anything richer is bespoke per overlay branch.

For a 3-option decision (the shape a press statement wants), the established pattern is:

1. Add a member to `OverlayEventType` (`src/stores/eventOverlayStore.ts:3`)
2. Add an entry to `OVERLAY_TO_INBOX_TYPE` (`src/utils/overlayMessaging.ts:7`) — exhaustive
   `Record`, so omitting it is a compile error
3. Add to `DEDICATED_BUTTON_TYPES` (`src/components/EventQueueOverlay.tsx:50`), plus
   `NON_DISMISSABLE_TYPES` (:40) and `NON_SUPPRESSIBLE_OVERLAY_TYPES` (`overlayMessaging.ts:32`)
   if the decision must not be skippable
4. Add a button branch in `EventQueueOverlay.tsx` — copy the `staff_ultimatum` idiom at ~line 1041:
   dynamic `await import('@/engine/YourService')`, args from `msg.metadata`,
   `useInboxStore.getState().respond(msg.id, ...)`, then
   `if (remaining <= 1) useEventOverlayStore.getState().reset()`
5. Put resolution logic in its own service module

Consider making option effects **data-driven** (a constants file mapping option → effects) rather
than branching in the service. The Owner's Mandate does this in
`src/constants/mandateDialogue.ts` and it made the outcomes far easier to test and rebalance —
directly relevant to your "must not be exploitable" risk.

**Gotcha:** `inboxStore.addMessage` dedupes by `id` and **silently no-ops** on a duplicate.

**`systemType` is a convention inside `metadata`, not a typed field.** Existing values include
`press_event`, `staff_final_resignation`, `staff_ultimatum_kept/_broken`, `dof_signing`,
`mandate_agreed`, `mandate_press_leak`, etc.

---

## Conventions that will trip you up

- **No migrations.** `MIGRATIONS: string[]` is intentionally empty. Add columns/tables directly to
  `CREATE_SCHEMA` in `src/db/schema.ts` and bump `SCHEMA_VERSION` (currently 12) to force a wipe.
  Never `ALTER TABLE`. `MIGRATION_TABLE_NAMES` auto-derives, so new tables are picked up by
  `clearAllClubData()` and save/load for free.
- **Batch writes.** Never call individual `set()` per entity in hot loops — collect and flush once.
- **Store caps:** `interactionStore.records` 500, `groupSessionLog` 100, `financeStore.transactions`
  364. Respect them if you add to these stores.
- **Money:** backend pence, local stores whole pounds — except `clubStore.transferBudget` /
  `facilitiesBudget` which are pence.
- **UUIDs:** `uuidv7()` from `src/utils/uuidv7.ts`.
- **React keys:** `.id` + index fallback; never a name.
- **Tables:** `SortableTable` with `flex` columns; never fixed `width` on row cells.
- **Navigation:** `router.push`, never `router.replace`, from a stack screen to a tab.
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
`db.runAsync` not mocked. `ResultsEngine.test.ts` is additionally **flaky** — a 200-iteration random
win-rate test that fails roughly 1 run in 3 on unmodified code.

Note `pyramidNewsContent.test.ts` fails 17/17 with `pyramidNewsRepository.existsForWeek is not a
function` — a stale mock, unrelated to press.

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

**Test the anti-exploit property explicitly.** The headline risk is a dominant option. Write tests
asserting that no single response minimises damage across all states — i.e. for at least two
distinct game states, the lowest-total-cost option differs. That is the test that proves the design
works.

**Avoid random-sample assertions.** Where an effect is small, pin `Math.random` and sweep it — see
`src/__tests__/engine/ResultsEngine.motivation.test.ts` for the idiom.

---

## Definition of done

- Leaks fire off real signals (`dressingRoomHealth` and/or staff morale) with sensible cooldowns,
  without double-firing against the existing staff-conversation escalation
- A multi-option press response with genuinely state-dependent trade-offs — no dominant option
- Press events now have mechanical consequences (morale / fans / reputation / finance), where they
  had none
- Attribution: the player can tell who leaked and why, so the choice is informed
- `tsc` clean; new tests pass, including the anti-exploit test; full-suite failures unchanged from
  your captured baseline
- Report honestly what you did and did not verify (E2E in the simulator needs the Lando backend and
  `npm run proxy`; say so if you didn't run it)
