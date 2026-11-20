<!-- STATUS: ✅ BUILT, COMMITTED, NOT PUSHED — app `new-game-save` @ b8ee4594 (2026-11-20) -->

# A29 report — a CHECKS panel that samples real players and shows ability → wage → band

**Commit:** `b8ee4594` on `new-game-save` (app only). Not pushed, not deployed.
**Baseline it was cut from:** `6fb687a0`, clean tree.

| File | Change |
|---|---|
| `src/economy/economyDiagnostics.ts` | +418 lines: `pickValuationSample`, `judgeValuation`, `playerValuationChecks`, the three constants, `stableHash` |
| `src/components/debug/ChecksTab.tsx` | +21 lines: the data gather and one new section, `PLAYER VALUATION — SAMPLED ROWS`, placed directly after `WAGE COVERAGE` |
| `src/__tests__/economy/playerValuation.test.ts` | new suite, 26 tests |

---

## 1. 🔴 TWO PLACES THE CODE CONTRADICTS THE BRIEF

Per standing note §3 — believe the code, say so explicitly rather than silently picking one.

### 1a. The brief has the units the wrong way round, and the real shape is worse than it says

The brief's trap 2:

> **Units.** `Player.wage` is PENCE. `playerMapper.ts:207` divides by 100 for display.

`playerMapper.ts:207` is the **write** path, not display:

```
src/db/mappers/playerMapper.ts:206    // Player.wage is pence → DB stores whole pounds
src/db/mappers/playerMapper.ts:207    contract_weekly_wage:   Math.round((player.wage ?? 0) / 100),
```

The read path is `:86`, and it multiplies:

```
src/db/mappers/playerMapper.ts:85     // DB stores whole pounds → Player.wage is pence
src/db/mappers/playerMapper.ts:86     wage:             (row.contract_weekly_wage ?? 0) * 100,
src/db/mappers/playerMapper.ts:87     contractValue:    (row.contract_weekly_wage ?? 0) * 100,
```

So **`players.contract_weekly_wage` is whole POUNDS, not pence.** The brief's table says
"stored wage | the ingested/contracted `wage`, in pence" — true of `Player.wage`, false of the
column. `Player.wage` is pence only because the mapper multiplies it back up.

**This is load-bearing for the panel, not a pedantic correction.** Every wage that survives a
save/load round trip is quantised to the pound, so a wage priced at £566.37/wk reads back as
£566.00 and a figure sitting exactly on a band edge can land one pound outside it for no reason
at all. That is why `VALUATION_STORAGE_TOLERANCE_PENCE` (£1) exists and why the panel says so in
its own `full` text. Without it the panel would warn at random on edge cases and be ignored.

It is also a **lossy** round trip that nothing in the brief or `CLAUDE.md`'s money rule mentions:
sub-pound precision in a wage is destroyed on the first save. At tier 8, where the turnover model
prices a CA-4 player at £57.24/wk, that is a ~1% quantisation on every wage in the division.
**Raised, not changed** — changing a column's meaning is not an A29 decision. It belongs on the
PM's list as its own question.

### 1b. The brief says the pack row carries the wage; for an NPC it does not, and that changed where I sampled from

The brief's table sources `stored wage` from "the ingested/contracted `wage`". Since v11 a world
pack carries **no money at all** (`CLAUDE.md`'s pack-is-a-census rule), so the figure the panel
compares is not ingested — it is **computed on the device at init** by
`packWages.packPlayerWeeklyWagePence`, a seeded draw from `weeklyWageRange`'s own band.

That is what makes the panel's band check correct rather than arbitrary, and it is the reason I
did not use a fixed ratio band — see §3.

---

## 2. What it reads, and why not SQLite directly

The brief says "samples real `players` rows" and names `players.current_ability` /
`players.potential`. **It reads exactly those two columns, through the store that mirrors them.**

`ChecksTab` passes `Object.values(useWorldStore.getState().clubs)`. `worldStore.loadClubs()`
rebuilds `club.players[]` from the `players` table via `playerClubRepository
.getAllNpcPlayersForHydration()` and `playerFromRow`, and `playerFromRow` sets:

```
src/db/mappers/playerMapper.ts:59     const base = row.current_ability ?? 0;
src/db/mappers/playerMapper.ts:82     overallRating:    base,
src/db/mappers/playerMapper.ts:83     potential:        row.potential ?? 0,
```

So `overallRating` **is** `players.current_ability`, unmodified. Nothing in the panel's path
touches `playerRatingStore`, `player_rating`, or `derivePerceivedRating` — trap 1 satisfied by
construction, and `grep` over the new code confirms no import of either.

**Why the store rather than a query.** Tier 1 is an NPC division: the player's own club is at
whatever tier he started at, so a tier-spread sample has to come from the NPC population, and
the store already holds all ~3,500 of those rows hydrated from the exact columns the brief names.
Reading them again from SQLite would mean a new repository function, an `await`, and a RUN CHECKS
button — the four sections above this one are deliberately pure store reads for that reason
(`ChecksTab`: *"Pure reads off the live stores — no I/O, so these need no button and are always
current"*). It costs no query and matches the shape of its neighbours.

**What that means for the AMP's own squad:** `worldStore.clubs` is the NPC population, so the
owner's own players are **not** in this sample. Deliberate — they are the one squad he can
already read on screen, and the value of this panel is the tier spread. Flagged here rather than
quietly scoped out.

---

## 3. The band is the model's own range, not a fixed ratio — and that is the one design call worth reviewing

The brief says `warn` only on "a ratio outside a band you state". I state a band, but it is not a
constant, and this is a deliberate departure worth the PM's eye.

A fixed ratio band would be wrong under one model or the other, because the two scatter
differently and **legitimately**:

- **turnover** — `packPlayerWeeklyWagePence` takes a seeded draw from `NEGOTIATION_BAND_PCT`
  (±8%) either side of the curve. A correctly-priced player lands in `[0.92, 1.08]`.
- **legacy** — `drawWeeklyWagePence` rolls the **coefficient** between `contractValueRandMin` and
  `…Max` (2,000–2,800 on the live EN export). A correctly-priced player scatters roughly
  `[0.83, 1.17]` around the midpoint `weeklyWageRange` reports as `expectedPence`.

So the test is membership of `[minPence, maxPence]` — the model's own range, widened by £1 for
§1a's storage quantisation. The ratio is still printed beside it, because it is the number the
owner asked for, but it does not decide the status. A band of 0.92–1.08 would have cried wolf on
every legacy-priced player in the game, which is the live state (`wageModel: legacy` on the real
EN export), and the standing note's §1 bar is a check whose failure changes what someone does.

Constants, at the top of the section as instructed:

```
src/economy/economyDiagnostics.ts   VALUATION_SAMPLE_TIERS            = [1, 3, 5, 8]
src/economy/economyDiagnostics.ts   VALUATION_PLAYERS_PER_TIER        = 4
src/economy/economyDiagnostics.ts   VALUATION_STORAGE_TOLERANCE_PENCE = 100
```

**Status semantics, as instructed:** `pass` whenever it could read and price the row, `warn` when
a wage is outside its model's band or there is nothing in the store to read, and **no code path
emits `fail`** — asserted directly:

```
  it('emits no `fail` for any input — including the ones that have nothing to read', () => {
```

---

## 4. 🔴 THE PANEL'S REAL OUTPUT

What follows is `asText('PLAYER VALUATION — SAMPLED ROWS', playerValuationChecks(...))` — the
clipboard text, verbatim, byte for byte as the owner will paste it.

### What produced it, stated plainly

Rendered **off-device**, because there is no live save in this checkout to read. The inputs are
as real as they can be without a phone in hand:

- **config**: `src/__tests__/economy/__fixtures__/gameConfig.en.json` — the real trimmed
  dev-backend EN export the harness tests already run on (`loadExport.test.ts`: *"real trimmed
  responses from the dev backend, not hand-written shapes"*). `country: EN`,
  `wageModel: legacy`, all 8 tiers authored, `wageCurveExponentBp: 25000`,
  `reputationSpreadBp: 0`, `contractValueRandMin/Max: 2000/2800`.
- **abilities**: the real per-tier ranges from `__fixtures__/starterConfig.json`
  (`leagueAbilityRanges.EN`, t1 40–90 … t8 2–7), rolled deterministically.
- **wages**: priced by `packWages.packPlayerWeeklyWagePence` — the exact function that prices
  every NPC squad on a real device at init — then put through the whole-pound round trip of §1a.
- **world shape**: 8 tiers × 12 clubs × 22 players = 2,112 players, close to the live ~3,500.

**So this is the real pricing path over the real published config, and it is not a photograph of
the owner's save.** The abilities and club names are generated; everything that does arithmetic
is the game's own code. A device run against a live save remains the only thing that can confirm
the figures on *his* save, and that is now one copy-paste rather than a screenshot.

The render script is scratch and is **not** in the repo (deleted before the commit; `git status`
confirmed clean) — it lives at
`/private/tmp/claude-501/-Users-courtneyadesile-Documents-WunderkindFactory/f62d35c2-6ded-4361-8590-c5125502dd84/scratchpad/a29/render.ts`.

### A. The real EN export as published — `wageModel: legacy`

```text
PLAYER VALUATION — SAMPLED ROWS
  [PASS] Player valuation sample (16 players, tiers 1/3/5/8): Stored wage vs what `weeklyWageRange` says this ability should earn at this tier.
    Ability is RAW `players.current_ability`, never the perceived `player_rating`.
    Expected is the tier MARKET rate — no club wage scale passed, so no budget premium.
    IN BAND = inside the model’s own [min, max]: ±8% negotiation under turnover, the
    full coefficient spread under legacy. ±£1 allowed for whole-pound storage.
    Sample is SEEDED (stable per save), 4/tier from tiers 1/3/5/8 — the same players every run, so two runs compare.
    t1 · EN T1 Club 0 (rep 94) · Novak E. AM
      CA 41 · pot 48 · band ability < 60 → ×30 · rand 2000–2800 (IN FORCE)
      stored £31,623.00/wk · expected £29,520.00/wk [£24,600.00–£34,440.00] legacy (model-legacy) → ratio 1.07  IN BAND
    t1 · EN T1 Club 3 (rep 93) · Vargas O. ST
      CA 74 · pot 77 · band ability < 60 → ×30 · rand 2000–2800 (IN FORCE)
      stored £47,841.00/wk · expected £53,280.00/wk [£44,400.00–£62,160.00] legacy (model-legacy) → ratio 0.90  IN BAND
    t1 · EN T1 Club 6 (rep 93) · Haugen T. CM
      CA 68 · pot 80 · band ability < 60 → ×30 · rand 2000–2800 (IN FORCE)
      stored £55,570.00/wk · expected £48,960.00/wk [£40,800.00–£57,120.00] legacy (model-legacy) → ratio 1.14  IN BAND
    t1 · EN T1 Club 9 (rep 91) · Dalgleish Q. GK
      CA 50 · pot 57 · band ability < 60 → ×30 · rand 2000–2800 (IN FORCE)
      stored £31,500.00/wk · expected £36,000.00/wk [£30,000.00–£42,000.00] legacy (model-legacy) → ratio 0.88  IN BAND
    t3 · EN T3 Club 0 (rep 64) · Vargas G. ST
      CA 29 · pot 41 · band ability < 40 → ×15 · rand 2000–2800 (IN FORCE)
      stored £9,722.00/wk · expected £10,440.00/wk [£8,700.00–£12,180.00] legacy (model-legacy) → ratio 0.93  IN BAND
    t3 · EN T3 Club 3 (rep 70) · Okafor F. RW
      CA 38 · pot 56 · band ability < 40 → ×15 · rand 2000–2800 (IN FORCE)
      stored £11,782.00/wk · expected £13,680.00/wk [£11,400.00–£15,960.00] legacy (model-legacy) → ratio 0.86  IN BAND
    t3 · EN T3 Club 6 (rep 71) · Novak U. AM
      CA 26 · pot 27 · band ability < 40 → ×15 · rand 2000–2800 (IN FORCE)
      stored £9,091.00/wk · expected £9,360.00/wk [£7,800.00–£10,920.00] legacy (model-legacy) → ratio 0.97  IN BAND
    t3 · EN T3 Club 9 (rep 66) · Rossi K. LB
      CA 38 · pot 60 · band ability < 40 → ×15 · rand 2000–2800 (IN FORCE)
      stored £15,350.00/wk · expected £13,680.00/wk [£11,400.00–£15,960.00] legacy (model-legacy) → ratio 1.12  IN BAND
    t5 · EN T5 Club 0 (rep 45) · Dalgleish A. GK
      CA 19 · pot 43 · band ability < 25 → ×6 · rand 2000–2800 (IN FORCE)
      stored £2,925.00/wk · expected £2,736.00/wk [£2,280.00–£3,192.00] legacy (model-legacy) → ratio 1.07  IN BAND
    t5 · EN T5 Club 3 (rep 48) · Rossi S. LB
      CA 13 · pot 31 · band ability < 15 → ×4 · rand 2000–2800 (IN FORCE)
      stored £1,317.00/wk · expected £1,248.00/wk [£1,040.00–£1,456.00] legacy (model-legacy) → ratio 1.06  IN BAND
    t5 · EN T5 Club 6 (rep 46) · Rossi C. LB
      CA 15 · pot 16 · band ability < 25 → ×6 · rand 2000–2800 (IN FORCE)
      stored £2,201.00/wk · expected £2,160.00/wk [£1,800.00–£2,520.00] legacy (model-legacy) → ratio 1.02  IN BAND
    t5 · EN T5 Club 9 (rep 43) · Novak M. AM
      CA 24 · pot 35 · band ability < 25 → ×6 · rand 2000–2800 (IN FORCE)
      stored £3,017.00/wk · expected £3,456.00/wk [£2,880.00–£4,032.00] legacy (model-legacy) → ratio 0.87  IN BAND
    t8 · EN T8 Club 0 (rep 8) · Vargas O. ST
      CA 3 · pot 18 · band ability < 15 → ×4 · rand 2000–2800 (IN FORCE)
      stored £242.00/wk · expected £288.00/wk [£240.00–£336.00] legacy (model-legacy) → ratio 0.84  IN BAND
    t8 · EN T8 Club 3 (rep 10) · Novak E. AM
      CA 3 · pot 11 · band ability < 15 → ×4 · rand 2000–2800 (IN FORCE)
      stored £261.00/wk · expected £288.00/wk [£240.00–£336.00] legacy (model-legacy) → ratio 0.91  IN BAND
    t8 · EN T8 Club 6 (rep 13) · Okafor V. RW
      CA 6 · pot 9 · band ability < 15 → ×4 · rand 2000–2800 (IN FORCE)
      stored £523.00/wk · expected £576.00/wk [£480.00–£672.00] legacy (model-legacy) → ratio 0.91  IN BAND
    t8 · EN T8 Club 9 (rep 11) · Novak U. AM
      CA 7 · pot 8 · band ability < 15 → ×4 · rand 2000–2800 (IN FORCE)
      stored £780.00/wk · expected £672.00/wk [£560.00–£784.00] legacy (model-legacy) → ratio 1.16  IN BAND
  [PASS] Tier 1 valuation (4 player(s)): ratio 0.88–1.14 (mean 0.99) · legacy (model-legacy) · all in band
  [PASS] Tier 3 valuation (4 player(s)): ratio 0.86–1.12 (mean 0.97) · legacy (model-legacy) · all in band
  [PASS] Tier 5 valuation (4 player(s)): ratio 0.87–1.07 (mean 1.00) · legacy (model-legacy) · all in band
  [PASS] Tier 8 valuation (4 player(s)): ratio 0.84–1.16 (mean 0.95) · legacy (model-legacy) · all in band
```

### B. The same export with the one switch flipped to `turnover`

```text
PLAYER VALUATION — SAMPLED ROWS
  [PASS] Player valuation sample (16 players, tiers 1/3/5/8): Stored wage vs what `weeklyWageRange` says this ability should earn at this tier.
    Ability is RAW `players.current_ability`, never the perceived `player_rating`.
    Expected is the tier MARKET rate — no club wage scale passed, so no budget premium.
    IN BAND = inside the model’s own [min, max]: ±8% negotiation under turnover, the
    full coefficient spread under legacy. ±£1 allowed for whole-pound storage.
    Sample is SEEDED (stable per save), 4/tier from tiers 1/3/5/8 — the same players every run, so two runs compare.
    t1 · EN T1 Club 0 (rep 94) · Novak E. AM
      CA 41 · pot 48 · band ability < 60 → ×30 · rand 2000–2800 (not in force — the curve prices this)
      stored £43,455.00/wk · expected £42,021.79/wk [£38,660.05–£45,383.53] turnover → ratio 1.03  IN BAND
    t1 · EN T1 Club 3 (rep 93) · Vargas O. ST
      CA 74 · pot 77 · band ability < 60 → ×30 · rand 2000–2800 (not in force — the curve prices this)
      stored £174,892.00/wk · expected £183,905.31/wk [£169,192.89–£198,617.73] turnover → ratio 0.95  IN BAND
    t1 · EN T1 Club 6 (rep 93) · Haugen T. CM
      CA 68 · pot 80 · band ability < 60 → ×30 · rand 2000–2800 (not in force — the curve prices this)
      stored £158,501.00/wk · expected £148,863.17/wk [£136,954.12–£160,772.22] turnover → ratio 1.06  IN BAND
    t1 · EN T1 Club 9 (rep 91) · Dalgleish Q. GK
      CA 50 · pot 57 · band ability < 60 → ×30 · rand 2000–2800 (not in force — the curve prices this)
      stored £64,881.00/wk · expected £69,014.44/wk [£63,493.28–£74,535.60] turnover → ratio 0.94  IN BAND
    t3 · EN T3 Club 0 (rep 64) · Vargas G. ST
      CA 29 · pot 41 · band ability < 40 → ×15 · rand 2000–2800 (not in force — the curve prices this)
      stored £13,681.00/wk · expected £14,147.18/wk [£13,015.41–£15,278.95] turnover → ratio 0.97  IN BAND
    t3 · EN T3 Club 3 (rep 70) · Okafor F. RW
      CA 38 · pot 56 · band ability < 40 → ×15 · rand 2000–2800 (not in force — the curve prices this)
      stored £25,954.00/wk · expected £27,805.70/wk [£25,581.24–£30,030.16] turnover → ratio 0.93  IN BAND
    t3 · EN T3 Club 6 (rep 71) · Novak U. AM
      CA 26 · pot 27 · band ability < 40 → ×15 · rand 2000–2800 (not in force — the curve prices this)
      stored £10,619.00/wk · expected £10,767.33/wk [£9,905.94–£11,628.72] turnover → ratio 0.99  IN BAND
    t3 · EN T3 Club 9 (rep 66) · Rossi K. LB
      CA 38 · pot 60 · band ability < 40 → ×15 · rand 2000–2800 (not in force — the curve prices this)
      stored £29,431.00/wk · expected £27,805.70/wk [£25,581.24–£30,030.16] turnover → ratio 1.06  IN BAND
    t5 · EN T5 Club 0 (rep 45) · Dalgleish A. GK
      CA 19 · pot 43 · band ability < 25 → ×6 · rand 2000–2800 (not in force — the curve prices this)
      stored £4,063.00/wk · expected £3,932.95/wk [£3,618.31–£4,247.59] turnover → ratio 1.03  IN BAND
    t5 · EN T5 Club 3 (rep 48) · Rossi S. LB
      CA 13 · pot 31 · band ability < 15 → ×4 · rand 2000–2800 (not in force — the curve prices this)
      stored £1,563.00/wk · expected £1,522.97/wk [£1,401.13–£1,644.81] turnover → ratio 1.03  IN BAND
    t5 · EN T5 Club 6 (rep 46) · Rossi C. LB
      CA 15 · pot 16 · band ability < 25 → ×6 · rand 2000–2800 (not in force — the curve prices this)
      stored £2,198.00/wk · expected £2,178.02/wk [£2,003.78–£2,352.26] turnover → ratio 1.01  IN BAND
    t5 · EN T5 Club 9 (rep 43) · Novak M. AM
      CA 24 · pot 35 · band ability < 25 → ×6 · rand 2000–2800 (not in force — the curve prices this)
      stored £6,624.00/wk · expected £7,052.82/wk [£6,488.59–£7,617.05] turnover → ratio 0.94  IN BAND
    t8 · EN T8 Club 0 (rep 8) · Vargas O. ST
      CA 3 · pot 18 · band ability < 15 → ×4 · rand 2000–2800 (not in force — the curve prices this)
      stored £26.00/wk · expected £27.88/wk [£25.65–£30.11] turnover → ratio 0.93  IN BAND
    t8 · EN T8 Club 3 (rep 10) · Novak E. AM
      CA 3 · pot 11 · band ability < 15 → ×4 · rand 2000–2800 (not in force — the curve prices this)
      stored £27.00/wk · expected £27.88/wk [£25.65–£30.11] turnover → ratio 0.97  IN BAND
    t8 · EN T8 Club 6 (rep 13) · Okafor V. RW
      CA 6 · pot 9 · band ability < 15 → ×4 · rand 2000–2800 (not in force — the curve prices this)
      stored £151.00/wk · expected £157.74/wk [£145.12–£170.36] turnover → ratio 0.96  IN BAND
    t8 · EN T8 Club 9 (rep 11) · Novak U. AM
      CA 7 · pot 8 · band ability < 15 → ×4 · rand 2000–2800 (not in force — the curve prices this)
      stored £250.00/wk · expected £231.91/wk [£213.36–£250.46] turnover → ratio 1.08  IN BAND
  [PASS] Tier 1 valuation (4 player(s)): ratio 0.94–1.06 (mean 1.00) · turnover · all in band
  [PASS] Tier 3 valuation (4 player(s)): ratio 0.93–1.06 (mean 0.99) · turnover · all in band
  [PASS] Tier 5 valuation (4 player(s)): ratio 0.94–1.03 (mean 1.00) · turnover · all in band
  [PASS] Tier 8 valuation (4 player(s)): ratio 0.93–1.08 (mean 0.98) · turnover · all in band
```

### C. `turnover` with every tier `resolvable: false` — the SHIPPED state, trap 5

```text
PLAYER VALUATION — SAMPLED ROWS
  [PASS] Player valuation sample (16 players, tiers 1/3/5/8): Stored wage vs what `weeklyWageRange` says this ability should earn at this tier.
    Ability is RAW `players.current_ability`, never the perceived `player_rating`.
    Expected is the tier MARKET rate — no club wage scale passed, so no budget premium.
    IN BAND = inside the model’s own [min, max]: ±8% negotiation under turnover, the
    full coefficient spread under legacy. ±£1 allowed for whole-pound storage.
    Sample is SEEDED (stable per save), 4/tier from tiers 1/3/5/8 — the same players every run, so two runs compare.
    t1 · EN T1 Club 0 (rep 94) · Novak E. AM
      CA 41 · pot 48 · band ability < 60 → ×30 · rand 2000–2800 (IN FORCE)
      stored £31,623.00/wk · expected £29,520.00/wk [£24,600.00–£34,440.00] legacy (tier-unresolvable) → ratio 1.07  IN BAND
    t1 · EN T1 Club 3 (rep 93) · Vargas O. ST
      CA 74 · pot 77 · band ability < 60 → ×30 · rand 2000–2800 (IN FORCE)
      stored £47,841.00/wk · expected £53,280.00/wk [£44,400.00–£62,160.00] legacy (tier-unresolvable) → ratio 0.90  IN BAND
    t1 · EN T1 Club 6 (rep 93) · Haugen T. CM
      CA 68 · pot 80 · band ability < 60 → ×30 · rand 2000–2800 (IN FORCE)
      stored £55,570.00/wk · expected £48,960.00/wk [£40,800.00–£57,120.00] legacy (tier-unresolvable) → ratio 1.14  IN BAND
    t1 · EN T1 Club 9 (rep 91) · Dalgleish Q. GK
      CA 50 · pot 57 · band ability < 60 → ×30 · rand 2000–2800 (IN FORCE)
      stored £31,500.00/wk · expected £36,000.00/wk [£30,000.00–£42,000.00] legacy (tier-unresolvable) → ratio 0.88  IN BAND
    t3 · EN T3 Club 0 (rep 64) · Vargas G. ST
      CA 29 · pot 41 · band ability < 40 → ×15 · rand 2000–2800 (IN FORCE)
      stored £9,722.00/wk · expected £10,440.00/wk [£8,700.00–£12,180.00] legacy (tier-unresolvable) → ratio 0.93  IN BAND
    t3 · EN T3 Club 3 (rep 70) · Okafor F. RW
      CA 38 · pot 56 · band ability < 40 → ×15 · rand 2000–2800 (IN FORCE)
      stored £11,782.00/wk · expected £13,680.00/wk [£11,400.00–£15,960.00] legacy (tier-unresolvable) → ratio 0.86  IN BAND
    t3 · EN T3 Club 6 (rep 71) · Novak U. AM
      CA 26 · pot 27 · band ability < 40 → ×15 · rand 2000–2800 (IN FORCE)
      stored £9,091.00/wk · expected £9,360.00/wk [£7,800.00–£10,920.00] legacy (tier-unresolvable) → ratio 0.97  IN BAND
    t3 · EN T3 Club 9 (rep 66) · Rossi K. LB
      CA 38 · pot 60 · band ability < 40 → ×15 · rand 2000–2800 (IN FORCE)
      stored £15,350.00/wk · expected £13,680.00/wk [£11,400.00–£15,960.00] legacy (tier-unresolvable) → ratio 1.12  IN BAND
    t5 · EN T5 Club 0 (rep 45) · Dalgleish A. GK
      CA 19 · pot 43 · band ability < 25 → ×6 · rand 2000–2800 (IN FORCE)
      stored £2,925.00/wk · expected £2,736.00/wk [£2,280.00–£3,192.00] legacy (tier-unresolvable) → ratio 1.07  IN BAND
    t5 · EN T5 Club 3 (rep 48) · Rossi S. LB
      CA 13 · pot 31 · band ability < 15 → ×4 · rand 2000–2800 (IN FORCE)
      stored £1,317.00/wk · expected £1,248.00/wk [£1,040.00–£1,456.00] legacy (tier-unresolvable) → ratio 1.06  IN BAND
    t5 · EN T5 Club 6 (rep 46) · Rossi C. LB
      CA 15 · pot 16 · band ability < 25 → ×6 · rand 2000–2800 (IN FORCE)
      stored £2,201.00/wk · expected £2,160.00/wk [£1,800.00–£2,520.00] legacy (tier-unresolvable) → ratio 1.02  IN BAND
    t5 · EN T5 Club 9 (rep 43) · Novak M. AM
      CA 24 · pot 35 · band ability < 25 → ×6 · rand 2000–2800 (IN FORCE)
      stored £3,017.00/wk · expected £3,456.00/wk [£2,880.00–£4,032.00] legacy (tier-unresolvable) → ratio 0.87  IN BAND
    t8 · EN T8 Club 0 (rep 8) · Vargas O. ST
      CA 3 · pot 18 · band ability < 15 → ×4 · rand 2000–2800 (IN FORCE)
      stored £242.00/wk · expected £288.00/wk [£240.00–£336.00] legacy (tier-unresolvable) → ratio 0.84  IN BAND
    t8 · EN T8 Club 3 (rep 10) · Novak E. AM
      CA 3 · pot 11 · band ability < 15 → ×4 · rand 2000–2800 (IN FORCE)
      stored £261.00/wk · expected £288.00/wk [£240.00–£336.00] legacy (tier-unresolvable) → ratio 0.91  IN BAND
    t8 · EN T8 Club 6 (rep 13) · Okafor V. RW
      CA 6 · pot 9 · band ability < 15 → ×4 · rand 2000–2800 (IN FORCE)
      stored £523.00/wk · expected £576.00/wk [£480.00–£672.00] legacy (tier-unresolvable) → ratio 0.91  IN BAND
    t8 · EN T8 Club 9 (rep 11) · Novak U. AM
      CA 7 · pot 8 · band ability < 15 → ×4 · rand 2000–2800 (IN FORCE)
      stored £780.00/wk · expected £672.00/wk [£560.00–£784.00] legacy (tier-unresolvable) → ratio 1.16  IN BAND
  [PASS] Tier 1 valuation (4 player(s)): ratio 0.88–1.14 (mean 0.99) · legacy (tier-unresolvable) · all in band
  [PASS] Tier 3 valuation (4 player(s)): ratio 0.86–1.12 (mean 0.97) · legacy (tier-unresolvable) · all in band
  [PASS] Tier 5 valuation (4 player(s)): ratio 0.87–1.07 (mean 1.00) · legacy (tier-unresolvable) · all in band
  [PASS] Tier 8 valuation (4 player(s)): ratio 0.84–1.16 (mean 0.95) · legacy (tier-unresolvable) · all in band
```

Note `legacy (tier-unresolvable)` on every line: the reason is printed, the figure is still
priced, and nothing is zero. That is the whole of trap 5, visible.

### D. The degenerate inputs

```text
PLAYER VALUATION — SAMPLED ROWS (no config in the store)
  [WARN] Player valuation sample: no config in the store — nothing can be priced, so nothing can be compared
PLAYER VALUATION — SAMPLED ROWS (config, but no world hydrated)
  [WARN] Player valuation sample: no players in tiers 1/3/5/8 — no world built yet, not hydrated, or this country has none of those tiers
PLAYER VALUATION — SAMPLED ROWS (a row with no ability and no wage)
  [PASS] Player valuation sample (1 players, tiers 1): Stored wage vs what `weeklyWageRange` says this ability should earn at this tier.
    Ability is RAW `players.current_ability`, never the perceived `player_rating`.
    Expected is the tier MARKET rate — no club wage scale passed, so no budget premium.
    IN BAND = inside the model’s own [min, max]: ±8% negotiation under turnover, the
    full coefficient spread under legacy. ±£1 allowed for whole-pound storage.
    Sample is SEEDED (stable per save), 4/tier from tiers 1/3/5/8 — the same players every run, so two runs compare.
    t1 · Bare FC · Bare Row CM
      CA — · pot — · band — (no ability on the row)
      stored — (no wage on the row — NOT zero: the field is absent) · expected — (unpriceable: no ability to price from)
  [PASS] Tier 1 valuation (1 player(s)): no priced player in this tier’s sample · legacy (model-legacy) · nothing to compare
```

### What the output says about the economy

**Nothing yet, and that is the correct answer at this stage.** Every sampled wage is in band
under both models, which confirms the instrument reads correctly — pack-priced squads land inside
the band they were drawn from, as they must. The panel's value starts the first time it is run
against a save whose wages came from somewhere other than `packWages`: a renewal, a transfer, an
ingested row, a multi-season tick. Per the owner's standing constraint, this makes the truth
visible; it tunes nothing.

One thing the real figures do show, which the owner may want to look at and which is **not** a
defect in this panel: at tier 8 under `turnover` the curve prices a CA-4 player at **£57.24/wk**
and a CA-6 at **£157.74/wk** — a 2.75× jump for two points of ability at the bottom of the
pyramid, from `wageCurveExponentBp: 25000` (k = 2.5) acting on a 2–7 ability range. Under
`legacy` the same two players are £384 and £576. Raised, not acted on.

---

## 5. Two things the first render caught in the panel itself

Both are fixed in the commit and both have a regression test. Recording them because each is the
kind of defect that would have made the panel quietly useless rather than visibly broken.

**5a. The pick landed on the same squad slot in every club.** The first render returned **four
goalkeepers, from four different clubs, at every one of the four tiers.** Player ids are uuidv7 —
time-ordered — so ordering a squad by id orders it by creation order, i.e. by squad slot; even
spacing over 12 equal-sized squads then aligns on slot 0. A sample that is always four
goalkeepers is not a tier sample. Fixed by ordering within a club by `stableHash(player.id)`
(FNV-1a, local to this module), which breaks the alignment and leaves the pick exactly as
reproducible. The club spread, which the even spacing buys, is untouched.

**5b. A `full` on each per-tier row put the whole table into the clipboard five times.** 16
players × 3 lines, once in the summary and once more per tier — ~250 lines for one section,
against a standing note (§2) that says the CHECKS output is already too heavy. The table is now
in the summary's `full` exactly once; the tier rows carry only their compact `detail`. Nothing is
lost, because `asText` takes `full ?? detail` and every sampled player is in the summary — pinned
by a test from both ends.

I also changed a line that read `· all in band` on a tier where nothing could be priced. An
instrument must not report agreement where there was nothing to agree about; it now reads
`· nothing to compare`.

---

## 6. Verification, verbatim

### `npx tsc --noEmit`

```
$ npx tsc --noEmit
$ echo $?
0
```

Clean — no output, which is what this repo's clean looks like (there is no lint script).

### `npm test`

```
$ nvm use
Now using node v20.19.6 (npm v10.8.2)

$ npx jest --listTests | wc -l
     652

$ npx jest
...
PASS src/__tests__/economy/playerValuation.test.ts
A worker process has failed to exit gracefully and has been force exited. This is likely caused by tests leaking due to improper teardown. Try running with --detectOpenHandles to find leaks. Active timers can also cause this, ensure that .unref() was called on them.

Test Suites: 652 passed, 652 total
Tests:       3 skipped, 10891 passed, 10894 total
Snapshots:   0 total
Time:        468.665 s
Ran all test suites.
```

### Reconciliation of the delta

`CLAUDE.md`'s `new-game-save` row reads **651 suites / 10,865 tests** at B1, measured 2026-11-20,
with 10,868 collected and 3 skipped — and `--listTests` 651. My branch tip `6fb687a0` is one
commit past that row's tree (the age-gate docs commit), which touched no test.

| | suites | passed | collected | skipped | `--listTests` |
|---|---|---|---|---|---|
| Baseline (`CLAUDE.md`, B1) | 651 | 10,865 | 10,868 | 3 | 651 |
| This change | 652 | 10,891 | 10,894 | 3 | 652 |
| **Delta** | **+1** | **+26** | **+26** | 0 | **+1** |

✅ **Reconciles exactly.** The one new suite is
`src/__tests__/economy/playerValuation.test.ts` and it contains exactly **26** tests — counted
from its own run above, `Tests: 26 passed, 26 total`. No existing suite gained or lost a test;
no existing test file was edited.

The `--listTests` count equals the suite count, so nothing was silently uncollected.

**"A worker process has failed to exit gracefully" is pre-existing and documented** as such on
both of `CLAUDE.md`'s preceding `new-game-save` rows, where it is recorded as run-ordering
dependent and reproducing with none of the relevant change's code loaded. It is not new here.

### Backend

Untouched. App-only change, so the three known backend failures did not arise and no backend
command was run.

---

## 7. 🔴 RAISED, NOT BUILT

### 7a. Staff and scouts in the same panel — the brief's own open question

**The brief is right that the answer is probably yes, and right that it is not what was asked
for.** I built the player panel.

What I can add from the code, which strengthens the case: `resolveWageTier` returns
`staffMultiplier` alongside `playerMultiplier` on the **same** `wageMultiplierTiers` row — both
are already in hand everywhere this panel runs, and the live EN export authors them (×2/×4/×8/×12
against the players' ×4/×6/×15/×30). And `clubBudget`'s `STAFF_WAGE_SHARE_BP` (2,500) carves the
staff pot out of the same turnover the player budget comes from, so a staff panel is the other
half of a quantity this one only shows one side of. The staff-vs-player gap this workstream has
already chased by screenshot is exactly a ratio between the two.

**My recommendation:** a sibling `staffValuationChecks` over the same sample machinery, when A24
needs it — not an extension of this panel. A staff row has a different band column and a
different budget, and merging them would make one section that answers two questions, which §2's
bar argues against.

### 7b. The lossy pounds round trip (§1a) deserves its own look

Sub-pound wage precision is destroyed on first save. ~1% quantisation at tier 8, where
`turnover` prices players in the £57–£160/wk range. Not an A29 decision and not a bug in this
panel; a question about the column.

### 7c. The tier-8 curve steepness (§4) is the first thing this panel surfaced

£57.24 → £157.74 for CA 4 → 6. Information for the owner, flagged per the correctness-before-
calibration constraint and not touched.

---

## 8. `.context` — one pass entry appended, nothing restructured

Appended one entry to `wunderkind-app/.context/shared/last-sync.md` per standing note §3.
Nothing pruned, nothing reorganised.

**Flagged for the PM rather than edited:**

1. **`CLAUDE.md`'s `new-game-save` row needs a new line for this change** (652 / 10,891). It is
   a one-way mirror of
   `.context/stages/01_overview/output/environment.md`'s "The green-master bar", so the
   `.context/` copy is the one to change first. I did not touch either — the branch-table rows
   are the PM's curation call and that file has gone stale six times from exactly this kind of
   well-meant edit.
2. **No stage text is made wrong by this change.** `07_synthesis/output/game-mechanics.md` §12
   (the economy design reference) describes the model, not the diagnostics; `05_ui` describes the
   design system and this adds no new component. The CHECKS tab's own documentation is in its
   file docblocks, which I extended in place.
3. **The §1a unit fact has no `.context` home.** The pounds-vs-pence split of
   `players.contract_weekly_wage` is stated only in `playerMapper.ts`'s own comments and in
   `transferDashboardLogic.ts:93`. `CLAUDE.md`'s money rule enumerates the pence exceptions on
   the *store* side and says nothing about this column — and that rule's own text says *"the
   enumeration is the fragile part of this rule and has already gone stale once"*. A one-line
   addition to `03_data/output/schema.md` or to the money rule itself would be worth it. **The
   PM's call, not mine** — it is a BINDING rule and the §3 convention puts that squarely with the
   project-manager session.
