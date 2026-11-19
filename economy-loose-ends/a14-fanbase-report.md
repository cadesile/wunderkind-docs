<!-- STATUS --> **STATUS:** ✅ A14 app half done. ⚠️ COMMITTED, NOT PUSHED, NOT DEPLOYED. **INERT until the backend publishes `fanBaseSharePercent`.**

---

# A14 — the fan base comes from the plot's population

**Branch `new-game-save`, commit `0964fedc`, on top of `ea92859a`. 2026-11-19. App only. Not pushed.**
Baseline when I started: `ea92859a` ("Curate the CHECKS report"), tree clean, A13's work already in.
`origin/new-game-save` is at `e03dd6da` — two local commits ahead before mine, three after.

```
$ git log -1 --format='%H %ci'
ea92859a1d43e07ec155361fd0a7dcc1002063b6 2026-11-19 17:56:05 +0000
$ git status --porcelain
$ git fetch origin new-game-save
 * branch              new-game-save -> FETCH_HEAD
$ git rev-parse HEAD; git rev-parse origin/new-game-save
ea92859a1d43e07ec155361fd0a7dcc1002063b6
e03dd6da402be55488e11e45c5e8aa750d97cb12
```

No `*-correction.md` or `*-addition.md` in `economy-loose-ends/` is newer than the brief
(`a3-tvdeal-addition.md` 10:35, `a4-premise-correction.md` 10:25, brief 18:26).

`.context/` and the `icm-codebase-context` skill are present and were used: `CONTEXT.md` →
`07_synthesis/output/game-mechanics.md` (§8 matchday, §13.5 shirts) and `next-work-plan.md`'s five
named sections, before any raw source.

---

## 🔴 0. READ THIS FIRST — the figure this whole design was reasoned against is the WRONG ONE

**The brief says (§4.2): *"Today's tier-8 absolute is 100–500 and the ladder gives roughly
1,000–2,000 in a 20,000-population town."*** Those numbers are `DEFAULT_FAN_BASE_RANGES` — the
app's **pre-sync fallback constant**, used only when the backend answers nothing at all.

**The LIVE published `fanBaseRanges` are 14–100× larger:**

```
$ python3 -c "import json; print(json.load(open('starter-config.LIVE.json'))['fanBaseRanges'])"
'1': {min: 700000,  max: 1500000}      '5': {min: 140000, max: 200000}
'2': {min: 500000,  max: 700000}       '6': {min:  60000, max: 100000}
'3': {min: 350000,  max: 600000}       '7': {min:  30000, max:  40000}
'4': {min: 250000,  max: 400000}       '8': {min:  10000, max:  20000}
```

Unchanged since the pre-R2 export (`pre-r2-exports/starter-config.LIVE.json` is byte-equal on this
key), so this is not a recent authoring change.

**Where the wrong figures came from:** `game-mechanics.md` §8's matchday bullet said *"Against
shipped fanbases (tier 8 = 100–500 … tier 1 = 50,000–200,000)"* — it quoted the fallback constant
as if it were the published value. That sentence is the source the plan's **THE BAND LADDER** and
**CORRECTION — 60–70% STANDS** sections reasoned from, and the brief then repeated it. **Corrected
in place** in this commit, with the rule to carry: *read a published value from an export, never
from the fallback constant that shares its name.*

**Three consequences, all material:**

1. **The owner's ladder is a REDUCTION at every tier, not an uplift.** ×0.04 to ×0.21 at each
   England tier's own median club population (§4.2 below). A median tier-1 club goes **1,100,000 →
   73,954 fans** and **£29.7M → £2.0M** of season shirt income. The plan expected a 4–10× rise at
   tier 8; the measured figure is **×0.21**.
2. **The "60–70% stands" argument was computed against the wrong baseline.** It argued the share is
   worth keeping because 60–70% of a million yields £16–19M of shirt income. That is true — but the
   live config *already* pays £29.7M there, so adopting 60–70% **cuts** top-tier shirt income by
   ~£27.7M a season. The conclusion may still be right (see §5.1), but the reason given for it is
   not.
3. **Today's fan cap effectively never binds above tier ~6.** The largest buildable ground is
   50,000 seats and an Elite club fills 0.85 of it, so anything above **42,500 fans cannot
   constrain attendance at any tier, ever**. Live tier 1 is 700,000–1,500,000 — **26–35× that
   ceiling**. So the demand ceiling the owner designed is, today, dead code above the bottom of the
   pyramid. **The ladder is what switches it on.** That is the strongest argument for the change,
   and it is independent of the shirt money.

**None of this blocks the change**, because the app half is inert until the backend publishes a
ladder. But the ladder's actual numbers should be chosen knowing that the baseline is 14× what the
design assumed.

---

## 1. §1's trap: honoured, and this is why it mattered more than the brief said

A **new key** — `starterConfig.fanBaseSharePercent`, tier-keyed `{min,max}` percentages.
`fanBaseRanges` keeps its unit and its meaning.

**The brief's worst case was understated.** It warned that a live backend "still sending 50,000"
would give a tier-1 share of 50,000%. The live backend sends **700,000**, so the real worst case is
a tier-1 fan base of **700,000% of the catchment** — 7,000,000 fans on a 1,000,000-population plot,
and £189,000,000 of shirt income per season against £331,000,000 of authored tier-1 turnover. On
every club in the game, on the next config sync, with no error anywhere. The key split is the whole
reason that cannot happen, and it is pinned by a test that asserts the absolute key can never reach
the share parameter at either call site.

**Key name — I recommend keeping the brief's `fanBaseSharePercent`.** It names the unit in the key,
which is exactly the property whose absence created the trap, and it sorts next to `fanBaseRanges`
in the admin CRUD. (`fanBaseCatchmentSharePercent` is more precise and worse to type; a neutral
`fanBaseShares` would repeat the original mistake of not naming the unit.) **Backend half must use
this exact string:**

```
starterConfig.fanBaseSharePercent = { "1": {"min":60,"max":70}, …, "8": {"min":5,"max":10} }
```

Percentages (not fractions), `{min,max}` inclusive, string tier keys — identical in shape to
`fanBaseRanges`, so the admin editor and the publisher need no new machinery.

---

## 2. What changed

One resolver, two call sites, one new field on each side of the wire.

| file | change |
|---|---|
| **`src/economy/fanBase.ts`** *(new)* | `resolveStartingFanCount` — the only thing that mints a starting fan count. Holds `DEFAULT_FAN_BASE_RANGES` (moved from `fanStore`) and `REFERENCE_FAN_BASE_SHARE_PERCENT`. |
| `src/stores/fanStore.ts` | `initialiseFans` resolves through it, passing each club's own `populationSize`. Its 500–2,000 per-tier fallback is now a named constant. |
| `src/hooks/useInitFlow.ts` | the AMP club's entry resolves through it, passing `club.catchmentPopulation`. Its **1,000–5,000** fallback is kept distinct from the world clubs' 500–2,000 — the two have always differed and that is behaviour, not an accident to unify. |
| `src/types/api.ts` | `StarterConfig.fanBaseSharePercent?` |
| `src/types/world.ts` | `WorldClub.populationSize?: number \| null` — rides the `world_clubs` JSON blob like `citySize`/`land`, so **no migration**, and `buildWorldLeagueClubs` spreads `...club`, so nothing in the ingest needed touching. |
| `src/types/club.ts`, `src/stores/clubStore.ts` | `Club.catchmentPopulation?` + `setCatchmentPopulation`. Rides the whole-`club` blob in `club_state` (`pickClubState` persists `club` entire), so **no migration**. |
| `src/components/new-game-setup/useLandFlow.ts` | `populationOf(locationId)` — the open DETAIL first, then the loaded LIST row, else null. |
| `src/components/new-game-setup/useSetupHost.ts` | writes the catchment at FOUND CLUB, beside `setLandCost`. |

**Why `populationOf` is a lookup and not a value.** `PlotClaim` carries town, region and prices but
**no population**, so the claim cannot answer it. And the read happens inside `onCreateGame`'s
`useCallback`, several steps after the town was picked — a field on the returned object would be
captured when the callback was created and could be stale. `populationOf` reads refs, so it cannot
be. It is keyed on `claim.locationId` rather than the draft's pick, so it is the town actually
bought: `takeHold` walks a candidate list and the server adjudicates, so the two can differ.

**`TIER_FILL` untouched.** Verified by diff: nothing in this commit reaches `matchdayIncome.ts`.

---

## 3. The pinned behaviour for a club with NO population

**An unknown catchment takes the ABSOLUTE band** — the number the game had before catchments
existed. `null`, absent, `0`, negative, `NaN` and `Infinity` all count as unknown.

Rejected alternatives, and why:

- **0 fans** — silently removes the club from the shirt economy (`shirtSalesFor` returns 0) *and*
  caps every attendance at nothing. A club that cannot sell a ticket, with no error.
- **a synthesised population** (from `citySize`, say) — the "generate a fallback" this codebase
  forbids, and `citySize` is itself absent on older clubs.
- **refuse to initialise** — world init is checkpointed and non-fatal here; a refusal would leave a
  save with no fan records at all.

This is the **normal** case, not an edge: every world pack written before the backend publishes
`populationSize` carries none, and `WorldClub.land` is legitimately null for clubs in towns that
were never seeded. The share path additionally **floors at 1 fan**, so a tiny town cannot round to
zero.

---

## 4. Verification

### 4.1 🔴 The fallback is byte-identical — the deliverable

The legacy expression is transcribed **literally** into `src/__tests__/economy/fanBase.test.ts`
from the code that was replaced (deliberately duplicated, not imported — a shared helper would
move with the implementation and prove nothing), and compared across **every tier × both call
sites' fallback bands × three range ladders × 101 rolls**:

```ts
const legacyDraw = (range, roll) => Math.floor(range.min + roll * (range.max - range.min + 1));
```

It passes for `DEFAULT_FAN_BASE_RANGES`, for the live England ladder, and for `{}` (the
per-tier-fallback path). Both paths also consume **exactly one `random()` call**, asserted — so a
whole league's interleaved draws stay aligned whichever path each club takes, which is what makes
the fallback identical for a division rather than for one club at a time.

**One deliberate divergence, for safety, which cannot fire on the live config:** a *malformed*
published band (`max < min`, non-numeric, non-finite) is now ignored rather than used. Every live
band is well-formed, so no live behaviour differs.

### 4.2 The measured change — fan base and season shirt income

Script: `a14-run-2026-11-19/measure.ts`, run from the app dir so the `@/` alias resolves. Inputs
all real — `starter-config.LIVE.json`, `game-config-en.LIVE.json`, `world.json` (3,191 clubs,
exported 2026-11-18 22:00). Formulas are the app's own: `resolveStartingFanCount`, `shirtSalesFor`,
`publishedShirtPricePence`, at the fan store's seeded morale 60 and the manufacturing midpoint.

```
$ npx tsx .../a14-run-2026-11-19/measure.ts

── 1. REAL populationSize per country/tier (admin world export) ──
country tier    n        min       p25    median       p75         max
EN      1     16     28,000    88,483   113,776   685,000   8,982,000
EN      8     15     18,000    26,000    41,000    61,000      97,365
SC      1     14      1,800     6,500    14,000   148,280     635,640
SC      8     13      2,000     4,700     8,800     9,500      17,430

── 2. TODAY (tier-absolute, country-blind) ──
tier   fans min      fans max   shirt price   season shirts @min   season shirts @max
  1     700,000     1,500,000           £45          £18,900,000          £40,500,000
  8      10,000        20,000            £8              £47,280              £94,560

── 3. AFTER (catchment × reference share ladder) ──
tier  share%      population        fans min     fans max   shirts @min      shirts @max   multiple (mid)
  1  60–70%     small  20,000        12,000       13,999       £324,000         £377,955      0.012×
  1  60–70%    medium 100,000        60,000       69,999     £1,620,000       £1,889,955      0.059×
  1  60–70%  large  1,000,000       600,000      699,999    £16,200,000      £18,899,955      0.591×
  8   5–10%     small  20,000         1,000        1,999         £4,728           £9,448      0.100×
  8   5–10%    medium 100,000         5,000        9,999        £23,640          £47,272      0.500×
  8   5–10%  large  1,000,000        50,000       99,999       £236,400         £472,792      5.000×

── 4. AFTER, at each country/tier's own MEDIAN population ──
country tier   median pop     fans now (mid)   fans new (mid)   multiple   shirts now (mid)   shirts new (mid)      delta
EN      1      113,776        1,100,000           73,954      0.067×        £29,700,000         £1,996,740   £-27,703,260
EN      8       41,000           15,000            3,075      0.205×            £70,920            £14,539       £-56,381
SC      1       14,000        1,100,000            9,100      0.008×        £29,700,000           £245,700   £-29,454,300
SC      8        8,800           15,000              660      0.044×            £70,920             £3,120       £-67,800

── 5. EVERY TIER (England), at that tier's own median population ──
tier   median pop   share%    fans now (mid)   fans new (mid)   multiple      shirts now        shirts new
  1      113,776   60–70%       1,100,000           73,954     0.067×       £29,700,000        £1,996,740
  2       58,500   52–61%         600,000           33,052     0.055×       £12,150,000          £669,296
  3       88,000   44–53%         475,000           42,680     0.090×        £7,213,350          £648,138
  4       36,000   36–44%         325,000           14,400     0.044×        £3,839,550          £170,122
  5       55,000   29–36%         170,000           17,875     0.105×        £1,606,500          £168,919
  6       45,000   21–27%          80,000           10,800     0.135×          £594,240           £80,222
  7       44,580   13–19%          35,000            7,133     0.204×          £189,000           £38,520
  8       41,000    5–10%          15,000            3,075     0.205×           £70,920           £14,539

── 6. The attendance-cap binding threshold (capacityCalculation = 1250) ──
level 1, Local       capacity   5,000  × fill 0.35  → binds below 1,750 fans
level 5, National    capacity  25,000  × fill 0.7  → binds below 17,500 fans
level 10, Elite      capacity  50,000  × fill 0.85  → binds below 42,500 fans
```

⚠️ **Shirt price is read from the ENGLAND config**, the only per-country export in hand. The
backend resolves the ticket ladder per country, so the **Scottish money columns are indicative**;
the **Scottish fan columns are exact** (both ladders are keyed on tier alone, with no country
level — a fact `loadExport.ts` already warns about).

**Reading it, honestly and without tuning:**

- **The multiple is a cut at every tier, 0.04×–0.21×.** The brief asked for the multiple and said
  to let it be whatever it is. It is this.
- **The ladder is what makes the demand cap live.** Today a median tier-1 club's 1,100,000 fans sit
  **26× above** the 42,500 ceiling; after, 73,954 — still above, so a *median* top-tier club stays
  capacity-limited, while a tier-1 club in a 60,000 town (EN tier 1's p25 is 88,483, and SC tier 1's
  median is **14,000**) becomes genuinely demand-limited. **A bigger plot starts to matter.** That
  is the mechanic the owner described, and it does not exist today at any tier above the bottom.
- **It restores the pyramid's *catchment* gradient and flattens its *tier* gradient.** EN tier 3's
  median town (88,000) is bigger than EN tier 2's (58,500), so after the change a median tier-3
  club out-supports a median tier-2 one (42,680 vs 33,052 fans). Shirt **money** still falls with
  tier (£648k vs £669k) only because the shirt price falls with tier too — a thin margin. This is
  the owner's stated intent ("a lower-league big-city club plausibly has more latent support"), but
  it means **fan base alone no longer ranks the pyramid**, and anything that assumes it does will
  change behaviour (see §5.2).
- **Scotland is hit hardest** — its towns are an order of magnitude smaller (SC tier 1 median
  14,000 vs EN 113,776), so a Scottish top-tier club lands at 9,100 fans, ×0.008 of today. A
  country-blind share ladder over country-specific populations means **Scotland's whole pyramid
  re-prices far more than England's.** If that is not wanted, the lever is a country level on the
  share ladder (`fanBaseRanges` has none either) — a backend decision, not an app one.

### 4.3 `tsc` and the suite

```
$ nvm use && node -v
v20.19.6
$ npx tsc --noEmit; echo "EXIT=$?"
EXIT=0

$ npx jest
Test Suites: 1 failed, 645 passed, 646 total
Tests:       1 failed, 3 skipped, 10767 passed, 10771 total
Snapshots:   0 total
Time:        227.719 s
$ npx jest --listTests | wc -l
     646
```

**COUNT confirmed: 646 suites, `--listTests` agrees.** A13's recorded baseline on this branch was
**643 / 10,735 passed** (`.context/shared/last-sync.md`), so this is **+3 suites and +33 tests** (10,738 collected → 10,771), which is
exactly what I added. ⚠️ `CLAUDE.md`'s table still says 640 / 10,704 for `new-game-save` — that
row predates A13 and is stale again; I have not edited it (it is a one-way mirror of
`environment.md`, which is the PM's to update).

**The one failure is a load flake, not this change:**

```
● queue wait is measured separately from execution › attributes waiting to the queue…
    expect(received).toBeLessThan(expected)
    Expected: < 100
    Received:   112
      at src/__tests__/db/bulkWrite.test.ts:217:27

$ npx jest src/__tests__/db/bulkWrite.test.ts
PASS src/__tests__/db/bulkWrite.test.ts
Tests:       19 passed, 19 total
```

A wall-clock assertion with a 100ms threshold, missed by 12ms under full-suite parallelism. This
commit touches no write path, no transaction and no repository. (A13's pass recorded the same class
of one-off, on `tournamentHubRender`.)

### 4.4 Tests added

| file | covers |
|---|---|
| `src/__tests__/economy/fanBase.test.ts` (18 tests) | **the byte-identical fallback** (§4.1), the share path, the empty/null ladder, `fanBaseRanges`-is-never-a-share, the no-population decision across 6 input shapes, "never 0 or NaN" across 162 input combinations, the 1-fan floor, malformed bands, the reference ladder's monotonicity, and the one-`random()`-call budget. |
| `src/__tests__/stores/fanBaseCatchment.test.ts` (12 tests) | `initialiseFans` on both paths, the 500–2,000 world fallback, **two clubs in the same tier 50× apart because their towns are**, the mixed pack (some clubs with a population, some without), `clubStore.setCatchmentPopulation`, and **source guards** on all three wiring sites. |
| `src/__tests__/components/new-game-setup/landPopulation.test.tsx` (3 tests) | `populationOf` against the real hook — list row, detail preferred over list row, null for an unenriched and for an unseen town. |

⚠️ **The source guards strip comments before matching** (the same lesson A12 recorded): the files
they read deliberately explain the defect they avoid, and a guard that fires on prose about the
code is a guard people delete. And per the `dressingRoomLogic` precedent now in CLAUDE.md: **a
source-reading guard protects exactly the files it names**, so a third call site for the starting
fan count means a third entry in `CALL_SITES` **in the same change**. That is written at the top of
the file.

### 4.5 The economy gate is BYTE-IDENTICAL

```
$ npx tsx scripts/economy/variantGate.ts --export game-config-en.LIVE.json \
    --starter-config starter-config.LIVE.json --world world.json --country EN > gate-after.txt
exit=1
$ git stash push -- src   # revert to ea92859a's modules
$ npx tsx scripts/economy/variantGate.ts … > gate-before.txt
exit_before=1
$ git stash pop
$ cmp gate-before.txt gate-after.txt && echo BYTE-IDENTICAL
BYTE-IDENTICAL
$ md5 -q gate-before.txt gate-after.txt
24f2d74db39fccd15f349316fadedd62
24f2d74db39fccd15f349316fadedd62
```

**The same md5 A8 and A12 recorded**, as it must be: the gate reads config and a world export, not
these modules. Both runs exit 1 on the pre-existing tier-8 verdict.

---

## 5. Report, do not change

### 5.1 ⚠️ The ladder's own numbers are now a decision with a measured price on it

The design said *"60–70% stands"* on the grounds that it is worth £16–19M of shirt income at a
million population. It is — but the live config already pays **£29.7M** there, so adopting it
**cuts** top-tier shirt income by ~£27.7M a season, about **8.4% of tier 1's £331M authored
turnover**. §13.2's coverage work is measuring solvency against income that includes that line.

**I have not tuned anything toward a target** (the brief forbids it, correctly). What I would put
to the owner is that the two arguments for 60–70% point in opposite directions once the baseline is
right:

- **for it** — it is what makes the demand cap bind for small-town clubs at every tier, which is
  the whole multi-club arc, and it is the only mechanism in the game that makes a plot pay.
- **against it** — it removes ~£27.7M a season from a tier-1 club that A12 already measured as
  living within a few percent of its income, and the plan's own **THE INTENDED GAME** section calls
  a hand-to-mouth apex "the gradient inverted at its own apex".

The two are reconcilable by moving the ladder (a higher tier-1 share) or by moving the shirt price
ladder, and **neither needs the app** — both are backend-authored. **Nothing happens until someone
authors `fanBaseSharePercent`**, which is exactly the decoupling §0 of the brief asked for.

### 5.2 🔴 Something DOES aggregate fan bases across clubs — the brief said stop and report

**`PeerBenchmarkService.getTierFanCountAverage(tier)`** (`src/engine/PeerBenchmarkService.ts:48`)
takes the **mean fan count across same-tier clubs**, and it is **live and reachable**:
`StaffConversationService.reviewDirectorOfFootball` (`:179`) judges the DOF below standard whenever
the club's own fan base trails that mean, and hands them a three-fan-events promise. Traced, not
inferred: one production caller, plus two test mocks.

**The shared-catchment deferral survives it.** A *mean* of per-club figures never double-counts a
city the way a national *total* would: two Glasgow clubs each with 600,000 fans raise the mean, and
that is consistent with the model saying each of them has that support. I found **no sum of fan
counts anywhere** — every other reader is a single-club lookup (`FansScreen`, `PricingPane`,
`SimulationService`, both shirt sites, `calculateAttendanceCount`).

**But the plan's stated precondition — "nothing aggregates fan bases across clubs" — is false as
written**, and the consequence of *this* change reaches it. Today every club in a tier draws from
one absolute band, so trailing the tier mean is close to a coin flip. With catchment-driven fan
bases the mean is set by the division's big-town clubs, and a small-town club trails it
**permanently** — so its DOF is judged below standard at **every** review, forever. That is a
review-threshold question (a share of the mean, a percentile, or peers of comparable catchment),
not a fan-base one. **Unaddressed, out of scope, and it will show up as "my DOF is always angry" on
the first device pass after the ladder is published.** Recorded in `game-mechanics.md` §8.

### 5.3 ⚠️ `crowdShare: 0.04` is a second, already-live catchment→demand share

`src/components/new-game-setup/economy.ts` caps the setup screen's season-1 attendance estimate at
`round(population × 0.04 / 50) × 50` — a **flat 4% share ladder for a brand-new (tier-8) club**,
live today, duplicated from nothing and bridged to the tick by
`src/__tests__/engine/setupMatchesTick.test.ts`.

Two things follow. **It corroborates the owner's tier-8 band**: an independent earlier decision put
a new club's reach at 4%, against the owner's 5–10%. And **it will disagree with the tick** the day
the ladder is published — the estimate would cap at 4% while the tick caps at 5–10%, i.e. the
estimate under-promises, which is the safe direction on the one screen where the player commits
real account credit, but it is still drift on the exact parity that `setupMatchesTick.test.ts`
exists to protect. **The right fix when the backend half lands:** the estimate reads the tier's own
share. Not done here — the brief scopes this task to `fanStore`'s draw and forbids touching
authored economy figures.

### 5.4 ⚠️ Three economy scripts model shirts from `fanBaseRanges` with no population term

`scripts/economy/variantGate.ts:128`, `scripts/economy/dispersionGate.ts:76` and
`scripts/economy/flows.ts:96` each take `fanBaseRanges[tier]`'s midpoint as the fan count for the
shirt line. **Correct today, and wrong the day the backend publishes a ladder** — they would keep
crediting absolute headcounts while the game credits a share of a catchment, and `dispersionGate`
feeds the season total back into next season's finishing position, so the error would move every
club's modelled league position and with it the Gini. They need the ladder **and a population
assumption** (the gate has no club-level population today; `world.json` carries one per club, so
the input exists). **Left untouched deliberately**, because the brief requires the gate to be
byte-identical and it is (§4.5). **This is the follow-up with a deadline on it: it must land with
the backend half, not after.**

### 5.5 Flagged for the PM, not acted on

- **`game-mechanics.md` §8's fan-band figures were wrong** (§0). Corrected in place rather than
  restructured, with the correction marked and dated beside the original claim, per the standing
  note. The surrounding bullet is now long; whether it should be split is the PM's call.
- **`CLAUDE.md`'s suite-count table is stale for `new-game-save`** (says 640 / 10,704; A13 measured
  643 / 10,735 and this pass measures 646 / 10,767). It is a one-way mirror of
  `environment.md`'s "green-master bar", so I have not touched either. **Sixth staleness, same
  direction** as the one that file already warns about.
- **`next-work-plan.md`'s "DECIDED — reuse `fanBaseRanges`, reinterpreted as a SHARE" is now
  superseded** by the brief's §1 (a new key). Both are in the folder and they disagree; the brief
  won, and the code follows the brief. Worth a status marker on that section so the next reader
  does not implement the retired decision.
- **No `WORLD_PACK_VERSION` bump here**, as instructed — the backend half owns it, and it is needed:
  `populationSize` is a census fact that belongs in the pack, and a cached pack will not have it.

### 5.6 What the backend half has to do

1. publish **`starterConfig.fanBaseSharePercent`** — tier-keyed `{min,max}` **percentages**, admin-editable, exactly the shape of `fanBaseRanges`. ⚠️ Leave `fanBaseRanges` alone and publishing: it is the fallback this app half relies on.
2. publish **`populationSize`** on the world pack's club snapshot (it is already on `NpcClub` and in the admin export; `WorldClub.populationSize` is now there to receive it) and **bump `WORLD_PACK_VERSION`**.
3. decide whether the share ladder needs a **country** level (§4.2 — Scotland re-prices an order of magnitude harder than England under a country-blind ladder).

No CHECKS line added. The one figure this task would want on a device — a club's fan base beside
its town's population — is only meaningful *after* the backend half exists; before then it would
print a fan base and a blank, and §2 of the standing notes says a check must earn its line. **It is
the right check to add with the backend half**, as one row: `population 113,776 · share 62% ·
fans 70,541 · cap binds below 42,500 → CAPACITY-LIMITED`.

---

## 6. Files

| path | |
|---|---|
| `a14-run-2026-11-19/measure.ts` | the measurement, app formulas, real inputs |
| `a14-run-2026-11-19/measure-output.txt` | its output, verbatim |
| `a14-run-2026-11-19/gate-before.txt`, `gate-after.txt` | identical, md5 `24f2d74d…` |
| `a14-run-2026-11-19/full-suite.AFTER.txt`, `full-suite.summary.txt` | the full run |

Commit `0964fedc` on `new-game-save`. **Not pushed.**
