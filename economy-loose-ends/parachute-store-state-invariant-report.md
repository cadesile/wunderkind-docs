# `store_state.parseable` on `parachute_state` — report

Branch `new-game-save`. Session: A32-sibling (parachute clear).

## 1. The diagnosis: HELD on the player club, WRONG on one point about the NPC half

Verified line by line.

| Claim in the brief | Verdict |
|---|---|
| `:785` and `:797` write `setStoreState(PARACHUTE_STATE_KEY, '')` | ✅ confirmed, both sites, `PARACHUTE_STATE_KEY = 'parachute_state'` at `:719` |
| `setStoreState` writes the value through unchanged | ✅ confirmed, **on both of its paths**. Direct: `.values({ key, value, … }).onConflictDoUpdate({ set: { value: sql`excluded.value` … } })` — no normalisation, no delete-on-empty. Batched (`_storeStateBatchDepth > 0`): `_pendingStoreState.set(key, value)` and the flush inserts it verbatim. An empty string survives both |
| The invariant is one predicate, `json_valid(value) = 0` | ✅ confirmed, `storeState.ts` `detectUnparseableStoreState` |
| `json_valid('')` is 0, so `''` trips it | ✅ |
| Promotion ran `:797` | ✅ consistent with tier 8 → tier 7 (`nextTier < currentTier`) |
| Only these two sites can write a non-JSON value | ⚠️ **substantially confirmed, with one residual noted below** |

### The indirect-path audit the brief asked for

All ten `setStoreState` call sites outside the repository and the tests:

- `utils/storage.ts:60` — the Zustand persist adapter. `value` is whatever `persist` hands
  `setItem`, i.e. its own `JSON.stringify` output. Never empty.
- `db/bootstrap.ts:733` — `JSON.stringify(state)`.
- `economy/worldPackVersion.ts:102`, `engine/agentWindowUsage.ts:90` — `JSON.stringify`.
- `hooks/useInitFlow.ts:1711` — `encodeStarter`, which is a bare `JSON.stringify` (`:182-184`).
- `SeasonTransitionService.ts` `:442`, `:555`, `:1100`, `:5032` — `JSON.stringify`.
- `SeasonTransitionService.ts:4826` — `String(snapshot.finalPosition)`. `finalPosition` is typed
  `number` (non-optional, `:226`), so this is a JSON number for every value except `NaN` /
  `±Infinity`, which would serialise to `"NaN"` / `"Infinity"` and trip the check. **Not
  observed, not fixed, not in scope** — recorded here so it is not rediscovered as a mystery.
  The rewritten docblock now forbids it by rule rather than blessing it by name.

### 🔴 Correction: `npc_parachute_state` does NOT share the defect

The brief asked me to check it and fix it if it did. It does not, and the reason is worth
stating because it is also the argument for the fix shape chosen below.

`npc_parachute_state` is **one row holding a map** of `clubId -> ParachuteState`. It has exactly
one writer, `:1100`, `setStoreState(NPC_PARACHUTE_STATE_KEY, JSON.stringify(nextParachutes))`.
Clearing an NPC club's entitlement is **deleting its entry from the map** — `npcParachuteStep`
returns `next: undefined` meaning "remove the entry" — so the worst value this key can ever hold
is `'{}'`, which is valid JSON. Its reader (`loadNpcParachutes`) guards with `if (!raw) return {}`
and a `typeof === 'object'` check.

So the NPC half **already represents "no entitlement" as absence**, and has since it was written.
The player's half was the odd one out. That asymmetry is the single strongest argument for
option 1 below: it makes the two halves agree, which is the rule this module already holds for
the finance arithmetic.

## 2. Fix shape chosen: **(1) clear by deleting the row**

`removeStoreState(key)` already exists in `storeStateRepository.ts:139` (a plain
`db.delete(storeState).where(eq(storeState.key, key))`) and has eleven existing callers, so this
needs no new helper in the repository.

**Why it is behaviour-preserving, which is the condition the brief set.** The reader is
`getStoreState`, which returns `rows[0]?.value ?? null` — `null` for a missing row. Every reader
of this key opens with a falsy guard:

- `resolveAmpParachute`'s read path: `const raw = await getStoreState(…); if (!raw) return undefined;`
- `bootstrap.ts`'s `blobLoad`: `const raw = await getStoreState(key); if (!raw) return null;`

`''` and `null` are both falsy, so **a missing row and a blank row are already indistinguishable
to every reader in the codebase.** The three states the brief named behave identically to today:
no entitlement (`undefined`, now from an absent row rather than a blank one), a live entitlement
(unchanged — still `JSON.stringify(state)`), and a malformed one (unchanged — `parseParachute`
degrades, warns, and the entitlement is dropped).

`parachute_state` has exactly one reader in the whole of `src/` outside the tests. It is not in
`STORE_STATE_WIPE_EXCLUSIONS` and nothing enumerates store keys expecting it to be present.

**The batching hazard, checked rather than assumed.** `removeStoreState` does *not* consult
`_pendingStoreState`, so in principle a delete inside an open batch could be resurrected by the
flush of a pending set for the same key. It cannot happen here, for two independent reasons:
`performSeasonTransition` is called from `SeasonEndOverlay` / `SeasonRecoveryModal`, **outside**
the weekly-tick batch that `GameLoop.ts:513` opens; and `resolveAmpParachute` runs once per
transition, so no pending `parachute_state` value can exist to be flushed over the delete. No
change to `removeStoreState` was needed and none was made.

**Why not (2), the `'null'` sentinel.** It is valid JSON, but it is **truthy**, so it would fall
straight through `if (!raw)` into `JSON.parse(raw)` → `null` → reading `state.schedule` off
`null` → `TypeError` → the outer `catch` → `console.warn` and `undefined`. The outcome is the
same but it reaches it by throwing, and it would print a warning on every season after a
promotion. Making it clean would mean editing the reader to special-case the sentinel — which is
more change than option 1, for a representation the NPC half does not use.

**Why not (3), widening the invariant.** Agreed with the brief's instinct, and the argument is
sharper than "it tolerates more": the tolerance would be aimed at **exactly the value a real
failure produces**. The docblock names "a half-written value … an interrupted restore" as what
this check is for, and an empty or truncated row is the canonical shape of one. Teaching
`store_state.parseable` to ignore `''` would retire the check's most likely true positive in
order to accommodate one writer that had no need to write `''` in the first place.

## 3. What changed

- `src/engine/SeasonTransitionService.ts` — a `clearAmpParachute()` helper calling
  `removeStoreState`, used at both former `''` sites; `removeStoreState` added to the import.
  The helper exists so the reason lives in one docblock rather than in two comments that can
  drift apart.
- `src/db/health/checks/storeState.ts` — the false enumeration replaced with a **rule**: *a value
  written to `store_state` is a JSON document, and the only way to say "nothing" is to remove the
  key*. It says why it is a rule and not a count, and names the enumeration's failure so the next
  person does not reintroduce one.
- `src/__tests__/engine/parachuteWiring.test.ts` — the three `toBe('')` assertions that pinned the
  defect are gone. In their place: `expectStoreStateParses()`, which runs the invariant's own
  question (`JSON.parse` standing in for `json_valid`) over every row of the mocked store, and
  `expectNoEntitlement()`, which additionally asserts the key is **absent**. Applied after each
  of the three state changes — relegated, promoted, neither — plus the malformed-schedule path,
  which shares the clear and is the one that fires while something is already wrong. The corrupt
  stored-state case is untouched and still covers injected corruption.

## 4. Measured figures

Working checkout (shared), branch `new-game-save`, on top of `13419ec55df76d2c01413feabd645565b9786558`.

```
npx tsc --noEmit                      -> clean, exit 0

npx jest --listTests | wc -l          -> 663
npx jest --listTests | grep -c __tests__ -> 663      (both forms agree; no warning lines)

Test Suites: 663 passed, 663 total
Tests:       3 skipped, 11181 passed, 11184 total
Snapshots:   0 total
Time:        187.604 s

LOAD_BEFORE: load averages: 2.92 2.44 2.38
LOAD_AFTER:  load averages: 16.40 8.72 4.99
```

**ZERO failures.** The suite COUNT is confirmed: `--listTests` is 663 and the run reports 663.
The headline figure is the PASSED count, 11,181; 11,184 is collected, 3 higher, which is the
3 skipped.

**Attribution.** No session was running jest, phpunit or a build at start (checked by `ps` —
only VS Code, the Claude helpers and the `wunderkind-mcp` servers). The 2.92 start load is that
background set; the 16.40 finish load is this run's own 663-suite fan-out and is self-inflicted.
There were no failures, so there is no failure for load to explain either way.

**My delta is +0 suites / +0 tests, by construction** — no `it()` or `describe()` block was added
or removed; only the assertions inside six existing tests changed. `parachuteWiring.test.ts` runs
21 tests before and after.

The branch's last recorded row (A31's hand-over) is 663 / 11,168 at `925d40a5`. This tree is three
commits later (`a4e784fe`, `d777e468`, `13419ec5` — the scout-floor/CHECKS work), so the +13 tests
are theirs, not this change's. ⚠️ I did not re-measure at `925d40a5` to prove that split; the
claim rests on this change adding no test, which the diff shows directly.

## 5. Flagged, not fixed

- **`String(snapshot.finalPosition)`** at `SeasonTransitionService.ts:4826` is the one remaining
  writer that is JSON only because its input happens to be a finite number. Typed `number`, so a
  `NaN` would need a defect upstream — but it would surface here as this same `major` invariant,
  on `transition_final_position_s<n>`, and would be read as corruption rather than as arithmetic.
- **`removeStoreState` does not consult the write batch**, while `setStoreState` does. Harmless
  for this change (argued in §2) but it is a latent resurrection hazard for any key that is both
  set and removed inside one `beginStoreStateWriteBatch()` span: the delete runs immediately, the
  pending set flushes afterwards, and the row comes back. The three
  `seasonTransitionRepository.ts:122-124` cleanup removes are the closest thing to a live
  instance; they are safe today only because `performSeasonTransition` runs outside the
  weekly-tick batch. Unowned, out of scope, worth a one-line batch-aware guard if anyone is in
  that file.
- **`npx jest --listTests | wc -l` agreed with `grep -c` here (663 both).** A31 reported it
  reading 668 against a real 663 because it counts jest's warning lines. No warnings were emitted
  on this run; the two forms are not reliably interchangeable.
