<!-- STATUS: 📋 OWNER RULING, BRIEF READY, NOT STARTED (2026-11-20) -->

# A27 — the scout age gate has never worked; make it work

**Owner ruling, 2026-11-20:** asked whether scouting accuracy should vary by the player's age —
**"Yes, it should."**

Found by A26 while building scout `ability`; deliberately left alone there because it is a
simulation change needing a ruling, not part of that deliverable.

## 🔴 The defect is bigger than "age does not matter"

```ts
export function ageGateFor(judgements: ScoutJudgements, age: number): number {
  const gate = age < 18 ? judgements?.youth : judgements?.senior;
  return Number.isFinite(gate) ? (gate as number) : 0;
}
```

`youth` and `senior` are **not keys any real scout carries.** `ScoutGenerationService::build()`
writes five — `potential`, `technical`, `physical`, `mental`, `personality` — and it is the only
path that has ever written a persisted scout. All 5,278 scouts on dev have exactly those five.
**So this has returned `0` for every scout since it was written.**

`AGE_GATE_WEIGHT = 0.3`, and the zero feeds two places:

| site | formula | effect of the permanent 0 |
|---|---|---|
| `scoutNoise.ts:135` displayed accuracy | `potential × 0.7 + ageGate × 0.3` | 🔴 **every scout's shown accuracy is 70% of what it should be.** A perfect 100-potential scout displays 70% |
| `scoutNoise.ts:92` the real noise band | `(1 − categoryAccuracy) × spread × (1 − ageGateAccuracy × 0.3)` | 🔴 **the band is never tightened.** Scouts are up to 30% less accurate than designed |

🟢 Display and behaviour agree with each other, so there is no second defect hiding here — both
are simply wrong against the design. Fixing it will make scouts **visibly better**, which the
owner should expect rather than read as inflation.

## The decision, and why I would NOT take the cheap option

**Option A — generate `youth` and `senior` as real judgements.** ✅ **Recommended.**
The app's `ScoutJudgements` type **already declares all seven keys**, and
`GenerateMarketDataCommand::buildScoutJudgements()` already builds seven. Only
`ScoutGenerationService` — the path that matters — writes five.

**Option B — derive the gate from existing keys** (e.g. youth read = `potential`, senior read =
the technical/physical/mental mean). Needs no schema change, no backfill, no pack bump.

🔴 **Option B is self-defeating and the arithmetic proves it.** Displayed accuracy is
`potential × 0.7 + ageGate × 0.3`. Set `ageGate = potential` for under-18s and it collapses to
`potential × 0.7 + potential × 0.3` = **`potential`** — the age gate does literally nothing, for
exactly the players age-sensitivity matters most for. A cheap fix that changes nothing where it
counts is worse than no fix.

**Option C** — a separately authored age-accuracy dial — is more config for a thing the
judgement system already models. Not recommended.

## 🔴 The interaction with what shipped today, and it is the thing to get right

**A26's `ability` formula averages the judgements over KEYS PRESENT:**

```
ability = clamp(1, 100, round(0.7 × experience + 0.3 × judgementMean))
```

Going from five keys to seven **changes `judgementMean` for every scout**, therefore changes
every scout's `ability`, therefore — once A24 lands — changes every scout's WAGE.

⚠️ **This must be a deliberate, measured step, not a side effect.** Specifically:

1. The backfill must be **re-run** after the new keys exist, or stored abilities silently
   disagree with the formula — two sources for one quantity, the defect this workstream exists
   to remove.
2. Measure the ability distribution before and after. It was 11–48 across 5,278 scouts on dev
   after A26. Say what it becomes.
3. ⚠️ **A26 pinned the five-key set in `ScoutGenerationServiceTest`** precisely so the 5-vs-7
   finding could not silently regress. **That pin must be changed deliberately, with the ruling
   quoted in the test**, never deleted or quietly edited — it is doing its job by making this
   change loud.

## Work

**Backend**
1. `ScoutGenerationService::build()` writes `youth` and `senior` alongside the existing five.
   Decide whether they roll from `scoutJudgementMin/Max` like the rest, or get their own bounds.
2. Migration + backfill adding both keys to all 5,278 existing scouts.
3. **Re-run the `ability` backfill afterwards** (§ above).
4. `WORLD_PACK_VERSION` 12 → 13 — judgements ride in the pack. Legitimate: this is ability-shaped
   census content, not money, exactly as the v12 bump was.
5. Update A26's five-key pin, with the ruling quoted.

**App**
6. **Probably nothing.** `ScoutJudgements` already declares seven keys and `ageGateFor` already
   reads them — it starts working the moment the data exists. **Verify rather than assume**, and
   check `scoutNoise.test.ts:119-122`, which pins the malformed-judgements behaviour.

## Verification

- Backend `--filter '/^(?!.*AdminShellCoverage).*$/'`; baseline **3,257**, three known
  pre-existing failures. ⚠️ `wunderkind_test` is NOT migration-tracked — see
  `deploy-run-2026-11-20.md` for the SQL.
- App `npx tsc --noEmit` and `npm test`; baseline **648 / 10,816**, `--listTests` 648.
- **Show the before/after accuracy for a real scout at age 17 and age 25** — that is the thing
  the owner asked for, and the only evidence that it now varies.
- The ability distribution before and after the key change.

## Branches

App `new-game-save`, backend `development`. Both ICM — read `.context/CONTEXT.md` first and
update the stage `output/` you touch. **Do not deploy**; A23 + A26 went out as OTA 488 today and
the owner has not yet confirmed them on device.

## Not established

- Whether `youth`/`senior` should share the other judgements' bounds or get their own.
- What the ability distribution becomes at seven keys.
- Whether anything else reads `ScoutJudgements` expecting exactly five.
