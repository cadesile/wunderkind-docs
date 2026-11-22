# Job 2 — Guardian Contract Demands (Academy Leverage)

You are implementing a new feature in the Wunderkind Factory React Native app at
`/Users/courtneyadesile/Documents/WunderkindFactory/wunderkind-app`.

**Start by reading `CLAUDE.md` and `.context/CONTEXT.md`** (the stage router — use it to scope
what else you read; do not load the whole `.context/` folder).

**Process:** brainstorm and write a plan before touching code. Get the plan approved. Then
implement. Do not skip to implementation.

---

## The concept

**Hook:** A 15-year-old wonderkid's parent threatens to pull their kid to a rival academy unless
you guarantee a first-team pathway.

**Adaptation:** High-potential youth intake players (potential ≥ 80) come with high-ambition
Guardians. During youth enrolment, parents can demand specific clause conditions — e.g. "must make
5 first-team appearances by age 17", or "upgrade the Training Pitch to Level 3 within 20 weeks".

**Over a season:** Breaking a Guardian promise doesn't just lose the player to free agency — the
Guardian goes to the local press, denting Fan Happiness and local Reputation.

**The decision:** Cave to an overbearing parent to retain an elite prospect, risking dressing-room
tension, or cut them loose to preserve club authority.

**Main risk to design against:** Too heavy to build. Complex promise tracking for non-first-team
players will bloat state if it isn't tied cleanly to the existing `GamePromise` structures.

---

## Verified codebase findings

These were confirmed by direct inspection. Trust them, but re-verify anything you're about to
depend on heavily — the codebase moves.

### ⚠️ The blocking prerequisite: guardians are never created in production

This is the single most important finding. **`guardianStore.guardians` is empty at runtime.**

- `generateGuardiansForPlayer(player)` (`src/engine/GuardianEngine.ts:46`) and
  `guardianStore.addGuardians` have **zero production callers** — only tests.
- `src/stores/marketStore.ts` imports `useGuardianStore`, `ApiGuardian` and `Guardian` but never
  references them beyond the imports. `app/(tabs)/_layout.tsx:74` imports `ApiGuardian` unused.
- The backend **does** ship guardians: `ApiGuardian` (`src/types/api.ts:63`), surfaced on market
  players at `src/api/endpoints/market.ts:194` (`guardians: p.guardians ?? []`). Nothing maps them
  into the store.
- Consequence: `processGuardianTick` (`GuardianEngine.ts:276`, called from `GameLoop.ts:4268`)
  currently produces nothing at all.

**Youth intake is the natural attach point** and there is currently no guardian creation there.
Wiring this up is step one of the job.

### Guardian model

`src/types/guardian.ts`:
```ts
export interface Guardian {
  id: string;
  playerId: string;
  firstName: string;
  lastName: string;      // always matches player surname
  gender: 'male' | 'female';
  demandLevel: number;   // 1–10, mutable
  loyaltyToClub: number; // 0–100, mutable
  ignoredRequestCount: number;
}
```

`src/stores/guardianStore.ts` — flat `guardians: Guardian[]`. API: `addGuardians`,
`removeGuardiansForPlayer`, `updateGuardian`, `getGuardiansForPlayer`, `getWorstGuardian`
(highest demandLevel, lowest loyalty breaks ties), `clearAll`. Persisted via
`src/db/bootstrap.ts:118` under key `'guardian-store'`; also in `SaveGameService.ts:30`.

`generateGuardiansForPlayer` produces 80% male+female pair, 10% single, 10% same-sex pair;
`demandLevel = 1 + rand(0..9)`, `loyaltyToClub = 50`. It deliberately does **not** write to the store.

### How guardian inbox messages work today

Two paths in `GuardianEngine.ts:305-375`, both plain `InboxMessage` with **no `actions` array** —
they use the generic binary `requiresResponse` accept/reject rail (rendered as CONVINCE/IGNORE):

```ts
{
  id: uuidv7(), type: 'guardian', week: weekNumber,
  subject: template.title, body,
  isRead: false,
  requiresResponse: !template.noInteract,
  entityId: player.id,
  metadata: { templateSlug, guardianIds: string[], worstGuardianId, costPence? },
}
```

- Spike path: hardcoded slug `'guardian_low_morale_concern'` when `player.morale < 30`.
- Regular path: `useEventStore.getState().getWeightedRandomTemplate(EventCategory.GUARDIAN, week)`;
  cap `max(1, activePlayers/5)` per week, 25% per-slot roll, loyalty-based suppression
  (≥90 → 6.25%, ≥70 → 12.5%).
- `costPence` only for `FINANCIAL_SLUGS = { 'guardian_request_financial_gift',
  'guardian_request_travel_upgrade' }` via `calculateGuardianCost()`.
- Auto-manager branch: `ManagerBrain.handleGuardianRequest(...)` resolves it without ever adding
  the message to the inbox.
- Demand decay: every 4 weeks, guardians with loyalty ≥ 70 lose 1 demandLevel.

`ReactionHandler.handleGuardianResponse(message, response)` (`src/engine/ReactionHandler.ts:43`)
reads only `message.metadata` + `message.entityId` — there is no per-option effect payload. It
applies loyalty/demand/morale deltas, `ignoredRequestCount`, sibling penalties (surname match), and
`clubStore.addBalance(-costPence)` + a `guardian_payment` transaction.

Dispatcher: `resolveInboxResponse(message, response)` at
`src/engine/InboxResponseHandlers.ts:299` — the single entry point used by both
`app/(tabs)/inbox.tsx` and `src/components/EventQueueOverlay.tsx`.

### Youth intake

Repository `src/db/repositories/youthRepository.ts`: `getPendingIntakeForClub`,
`getYouthSquadForClub`, `markAsPendingIntake`, `acceptIntakePlayer(db, playerId, clubId, appearance?)`,
`rejectIntakePlayer`, `promoteYouthPlayer`, `releaseYouthPlayer`, `batchApplyAmpYouthIntake`,
`batchMutateYouthIntakeScaffold`.

- `pending_intake_club_id` is the pending marker. Accept clears it and inserts a `player_club` row
  (`club_type 'amp'`, `role 'youth'`). Reject clears it, sets `is_youth=0`, and inserts a
  `player_free_transfer` row with reason `'youth_rejected'`.
- **Decision UI:** `src/components/YouthPane.tsx` → `YouthIntakePane` (line 53). "SCOUT & ENROL"
  opens `YouthEnrolmentModal`; "PASS" calls `rejectIntakePlayer` directly (`handleRejectIntake`,
  line 57).
- **`src/components/YouthEnrolmentModal.tsx:43` `handleEnrol()`** → `acceptIntakePlayer(...)`.
  Currently only an avatar picker + stats card. **This is the obvious insertion point for a
  guardian contract demand.**
- Hook: `src/hooks/db/useYouth.ts` — `usePendingIntake()` / `useYouthSquad()`, both returning
  `[rows, refresh]`. Call the refresh after accept/reject.
- Whole pane is gated on `facilityStore.levels['youth_academy'] >= 1`.
- **Generation:** `SeasonTransitionService.generateYouthIntake(currentSeason, weekNumber?)`
  (~line 1847), invoked ~line 3088. NPC equivalent `generateNpcYouthIntake` (~line 1955).
  Config: `youthIntakeByFacilityLevel: [2,3,5,7,10,15]`, `youthMinAge`/`youthMaxAge` (12–15).
- **Recently added (Job 1):** `players.academy_club_id` is stamped at intake *generation* for both
  AMP and NPC academies and is never cleared. Use it if you need "this club produced them".
  Deliberately excluded from `UPSERT_UPDATE_SET` in `playerRepository.ts` so routine upserts
  can't null it.

### Promise system (reuse this, don't reinvent)

`src/types/promise.ts`:
```ts
type PromisePartyType = 'amp_club'|'player'|'investor'|'sponsor'|'npc_club'|'npc_manager'|'staff'|'fan_group';
type PromiseType = 'investment_contract'|'sponsorship_contract'|'player_gametime'|'staff_ultimatum'|'fan_commitment'|'player_contract';
type PromiseConditionType = 'promotion'|'league_position'|'appearances_pct'|'tier_reached'|'avoid_relegation'
  |'signings_count'|'facility_improvements'|'fan_events_hosted'|'fan_morale_above'|'contract_extension';
type PromiseStatus = 'active'|'fulfilled'|'failed'|'voided';
```
`GamePromise` carries `id, createdAtSeason, createdAtWeek, type, partyA, partyB, description,
offer, condition, successOutcome[], failureOutcome[], status, lastEvaluatedSeason?, resolvedAtWeek?,
cycleCount?, progressValue?, reason?, deadlineWeek?, escalationStage?: 'conversation'|'final'`.

Note `PromiseConditionType` already has `facility_improvements` — which maps directly onto the
"upgrade the Training Pitch to Level 3" demand. `appearances_pct` is close to "5 appearances by
age 17" but not identical; decide whether to extend the union or express it differently, and say
which in your plan.

Key machinery:
- `src/engine/PromiseProgressService.ts` — `recordFacilityImprovement` (:53), `recordSquadAddition`
  (:68), `recordFanEventHosted` (:78), `recordContractExtension` (:92)
- `src/engine/PromiseOutcomeService.ts` — `applyOutcomeEffect` (:21), `applyPromiseOutcome` (:118),
  `resolvePromise` (:228), `voidPromise` (:269)
- `src/utils/promiseUtils.ts` — `isPromiseDueForEvaluation`, `buildConditionSummary`,
  `buildGametimePromise`, `buildFanPromise`, `buildStaffConversationPromise`
- Weekly evaluation sites in `GameLoop.ts` §11h (:3954) and §11i (:3973); season-end in
  `SeasonTransitionService.evaluateFinancialPromises` (:2376)

### Fans, press, reputation

- `src/engine/FanEngine.ts` — `calculateScore(currentWeek)` (baseline 50, each event's `impact`
  decays 10%/week unless `isPermanent`), `getTier(score)`. `FanEventType` union in
  `src/types/fans.ts`. Add events via `useFanStore.getState().addEvent({...})`.
- `fanStore.updateMorale(clubId, delta)` / `updateSentiment(clubId, delta)` — direct per-club numbers.
- **`clubStore.setReputation(delta)` takes a DELTA, not an absolute.** It applies the league
  reputation cap itself. (This bit me during Job 1.)
- `src/engine/PressEngine.ts` currently has **zero mechanical effect** — press messages are pure
  flavour. If you want the Guardian's press threat to bite, you are adding that capability, not
  using an existing one. Coordinate with Job 3, which covers press consequences directly.

---

## Multi-option decisions: the established pattern

`InboxMessage` has **no `options`/`choices` field**. Two response mechanisms exist:
(a) binary `requiresResponse` → ACCEPT/REJECT, (b) `actions: {label, action}[]` handled by a switch
in the UI. Anything richer is bespoke per overlay branch.

The established pattern for a 3-option decision (used by staff ultimatums, fan ultimatums, player
contract ultimatums, and the Owner's Mandate) is:

1. Add a member to `OverlayEventType` (`src/stores/eventOverlayStore.ts:3`)
2. Add an entry to `OVERLAY_TO_INBOX_TYPE` (`src/utils/overlayMessaging.ts:7`) — it's an exhaustive
   `Record`, so omitting it is a compile error
3. Add to `DEDICATED_BUTTON_TYPES` (`src/components/EventQueueOverlay.tsx:50`) so the generic
   accept/reject footer doesn't double up, and to `NON_DISMISSABLE_TYPES` (:40) if the decision
   must not be skippable, and `NON_SUPPRESSIBLE_OVERLAY_TYPES` (`overlayMessaging.ts:32`)
4. Add a button branch in `EventQueueOverlay.tsx` (see the `staff_ultimatum` branch ~line 1041 for
   the exact idiom: dynamic `await import('@/engine/YourService')`, args from `msg.metadata`,
   `useInboxStore.getState().respond(msg.id, ...)`, then
   `if (remaining <= 1) useEventOverlayStore.getState().reset()`)
5. Put the resolution logic in its own service module, mirroring `StaffUltimatumService`

**Gotcha:** `inboxStore.addMessage` dedupes by `id` and **silently no-ops** on a duplicate. If a
message can legitimately be re-raised, either vary the id or guard the UI so a second emit can't
be requested.

---

## Conventions that will trip you up

- **No migrations.** `MIGRATIONS: string[]` is intentionally empty. Add new columns/tables directly
  to `CREATE_SCHEMA` in `src/db/schema.ts` and bump `SCHEMA_VERSION` (currently 12) to force a
  wipe. Never write `ALTER TABLE`. `MIGRATION_TABLE_NAMES` auto-derives from `CREATE_SCHEMA`, so
  new tables are picked up by `clearAllClubData()` and save/load for free.
- **Player storage:** ALL player data lives in the `players` table and only there. Relational tables
  are pointer/state only. Never construct a player from another table or a serialised blob.
- **Money:** backend uses pence; local stores use whole pounds — except `clubStore.transferBudget`
  and `facilitiesBudget`, which are pence. Use `penceToPounds`/`poundsToPence` at the boundary.
- **Age:** always derive from `dateOfBirth` + `useCalendarStore.getState().gameDate` via
  `computePlayerAge` / `playerAge`. Never use `getGameDate(weekNumber)` for a *current* age — it
  drifts every season. `averageSquadAge(players, gameDate)` exists in `src/utils/gameDate.ts`.
- **UUIDs:** `uuidv7()` from `src/utils/uuidv7.ts`, not uuid/v4.
- **React keys:** `.id` + index fallback; never a name.
- **Tables:** use `SortableTable` (`src/components/ui/SortableTable.tsx`) with `flex` columns.
  Never fixed `width` on row cells.
- **Navigation:** `router.push`, never `router.replace`, when going from a stack screen to a tab.
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
`db.runAsync` not mocked. `ResultsEngine.test.ts` is additionally **flaky** — it's a 200-iteration
random win-rate test that fails roughly 1 run in 3, on unmodified code.

Capture your own baseline first:
```bash
nvm use && npx jest --silent 2>&1 | grep -E "^FAIL|Tests:" | sort -u
```
Compare against it at the end. If a suite you touched starts failing, `git stash` your change and
re-run that suite to prove whether it was already broken.

Two checks worth running that `tsc` won't give you:
```bash
# Validate CREATE_SCHEMA against real SQLite (catches SQL syntax/arity errors)
node -e "const t=require('fs').readFileSync('src/db/schema.ts','utf8');require('fs').writeFileSync('/tmp/s.sql',t.match(/export const CREATE_SCHEMA = \`([\s\S]*?)\`;/)[1])" && sqlite3 /tmp/s.db < /tmp/s.sql && echo OK

# Bundle the app — catches import cycles and bad paths tsc cannot see
nvm use && npx expo export --platform ios --output-dir /tmp/exportcheck
```

Write unit tests for the pure logic (demand generation, condition evaluation, outcome application).
Follow the mocking style in `src/__tests__/engine/StaffUltimatumService.resolution.test.ts`.

**Avoid random-sample assertions.** Where an effect is small, pin `Math.random` and sweep it rather
than sampling — see `src/__tests__/engine/ResultsEngine.motivation.test.ts` for the idiom.

---

## Definition of done

- Guardians are actually created and persisted for youth intake players (the prerequisite above)
- High-potential prospects raise a contract demand at enrolment with a real multi-option decision
- Accepted demands become tracked `GamePromise` records evaluated on the existing weekly/season cadence
- Breaking one has consequences beyond losing the player — fan and reputation effects included
- `tsc` clean; new tests pass; full-suite failures unchanged from your captured baseline
- Report honestly what you did and did not verify (E2E in the simulator needs the Lando backend and
  `npm run proxy`; say so if you didn't run it)
