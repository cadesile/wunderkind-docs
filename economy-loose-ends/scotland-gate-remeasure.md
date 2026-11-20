<!-- STATUS: 🟢 MEASUREMENT. No code changed in either repo. Nothing tuned, nothing fixed. -->

# Scotland's gate-income coverage, re-measured against the 2026-11-20 world export

**Task:** re-measure Scotland's gate-income coverage against the export taken today, and say
whether the two figures the workstream carries (**643–1188%** and **~172% at SC t4**) are real.

**Date:** 2026-11-20, 16:42–16:56. **Measurement only** — no code in `wunderkind-app` or
`wunderkind-backend` was changed, nothing was staged, committed or deployed, and no database was
written to. Standing rule honoured: **correctness before calibration.** Nothing below is a
recommendation to tune anything.

---

## 0. The headline, before the working

| | SC t1 | SC t2 | SC t3 | SC t4 |
|---|---|---|---|---|
| **carried in the handover** (8-tier export, 2026-11-18/19 inputs) | 643.0% | 793.6% | 1187.8% | 1141.7% |
| **the gate as it stands, new export** | 616.0% | 729.4% | 1056.0% | 1010.6% |
| 🟢 **CORRECTED — TV resolved the way the game resolves it** | **146.5%** | **225.4%** | **377.2%** | **424.0%** |

England, the control, same inputs, same run:

| | t1 | t2 | t3 | t4 | t5 | t6 | t7 | t8 |
|---|---|---|---|---|---|---|---|---|
| gate as it stands | 102.0% | 127.3% | 180.9% | 179.7% | 169.0% | 349.2% | 598.2% | 814.2% |
| 🟢 **CORRECTED** | **47.6%** | **61.6%** | **82.6%** | **89.7%** | **98.5%** | **163.3%** | **183.7%** | **265.1%** |

Three statements follow, and they are the report:

1. **643–1188% was not real.** Neither is 616–1056%. Both were produced by a gate that takes its
   TV line from `ENGLAND_DEV`, a **hardcoded fixture in the app repo**, for every country — the
   exact failure this workstream has now paid for five times. The number to carry is
   **146.5% / 225.4% / 377.2% / 424.0%**.
2. **Scotland is still badly outside the 85–110% band, and England is now outside it in the other
   direction at the top.** Scotland over-pays 1.5–4.2x its authored ladder; England under-pays at
   t1–t3 and over-pays from t6 down.
3. **The whole of Scotland's excess sits in three league-money fields** — TV, prize and position —
   and they are authored **identically for Scotland and England** while every other input in
   Scotland's economy, the turnover ladder included, is exactly **one tenth** of England's.
   It is a **data state on the dev box**, not a code defect, and it is **not** about pyramid depth.

---

## 1. What was run, verbatim

Pristine tree, so the two uncommitted files another session has open in `wunderkind-app`
(`src/engine/GameLoop.ts`, `src/stores/marketStore.ts`, plus an untracked test) could not reach
the run:

```
$ cd /Users/courtneyadesile/Documents/WunderkindFactory/wunderkind-app
$ git rev-parse --abbrev-ref HEAD; git rev-parse --short HEAD
new-game-save
4113d326
$ git status --porcelain
 M src/engine/GameLoop.ts
 M src/stores/marketStore.ts
?? src/__tests__/economy/scoutWageAnchorInput.test.ts
$ git archive HEAD | tar -x -C <scratch>/pristine    # + node_modules symlinked
```

⚠️ **Two other sessions were editing this checkout throughout the pass.** At 16:42 the app tree
held 3 modified files; by 16:57 it held 15, and `wunderkind-backend` held 10. The gate ran from
`git archive HEAD`, so **no working-tree edit by any session could reach it** — the run is at
`4113d326` exactly. This is also why nothing here was staged or committed in either code repo.

Inputs, fetched today at 16:42–16:43:

```
$ curl -s "https://api.dev.buildmyclub.co.uk/api/game-config?country=SC" -o game-config-SC.LIVE.json
[http 200 bytes 31277]
$ curl -s "https://api.dev.buildmyclub.co.uk/api/game-config?country=EN" -o game-config-EN.LIVE.json
[http 200 bytes 32437]
$ curl -s "https://api.dev.buildmyclub.co.uk/api/starter-config"         -o starter-config.LIVE.json
[http 200 bytes 9469]
```

```
$ shasum -a 256 docs/economy-loose-ends/evidence/world-export-2026-11-20.json
b3dc8f7a4ec1fd8ad6fe7c87e7945cd2ea888b41dc3153f817a4cd8471ccda01
$ shasum -a 256 game-config-SC.LIVE.json game-config-EN.LIVE.json starter-config.LIVE.json
d386086421f8539d5cd3b55211d5b20b07f5dab34686043efb246bcd38eaf9e9  game-config-SC.LIVE.json
0b0bde9f052b7424e30870081c352c772f1cc38152df4902cd058d7a383e94d4  game-config-EN.LIVE.json
879c079837e4cac861f809b2893d7f8e21c41baedfc268ec8d67c0d3b626d55d  starter-config.LIVE.json
```

```
$ npx tsx scripts/economy/variantGate.ts \
    --export game-config-SC.LIVE.json \
    --starter-config starter-config.LIVE.json \
    --world docs/economy-loose-ends/evidence/world-export-2026-11-20.json \
    --country SC
```
…and the same with `--export game-config-EN.LIVE.json --country EN`.

**The live SC config has moved since the 09:44 copy in `deploy-run-2026-11-20/` by exactly one
field**, which is the deploy landing and nothing else:

```
$ diff <(normalised 16:42 SC config) <(normalised 09:44 SC config)
69c69
<  "bondDecayFloor": 20,
---
>  "bondDecayFloor": 50,
```

### The loaded-machine lesson, discharged

Load average was **52.08** at the start of this pass and 20–22 at the end — eight cores. That
invalidates a timing measurement; it does not touch this one, and that was verified rather than
asserted. The gate is seeded (`seededRng(20261113)`) and the coverage table is pure arithmetic:

```
$ uptime
16:54  up  3:20, 1 user, load averages: 22.21 27.47 28.10
$ diff variantGate-SC.repeat.txt variantGate-SC.2026-11-20-TVCORRECTED.txt && echo "REPEAT RUN BYTE-IDENTICAL"
REPEAT RUN BYTE-IDENTICAL
$ md5 -q variantGate-SC.repeat.txt variantGate-SC.2026-11-20-TVCORRECTED.txt
23bf1e72de6c148d1b6db252ee64dfcc
23bf1e72de6c148d1b6db252ee64dfcc
```

---

## 2. Resolution chain for every input, with the row it came from

| input | resolved through | live value read | source |
|---|---|---|---|
| authored turnover per tier (the COVERAGE denominator) | `GET /api/game-config?country=SC` → `economyTierBaseline.tiers[].turnoverPence`, refused by `loadExport.ts:assertCountryResolved` unless `economyTierBaseline.country` matches | SC **3,310,000,000 / 1,140,000,000 / 346,000,000 / 207,000,000** pence; EN **33,100,000,000 / 11,400,000,000 / 3,460,000,000 / 2,070,000,000 / 732,000,000 / 269,000,000 / 68,600,000 / 21,500,000** | live row, `economyTierBaseline.source: "country"` |
| how deep the ladder is | same block, `tierCount` | **SC 4**, **EN 8** | live row |
| stadium capacity | `standSeatsPerLevel(template)` (`src/utils/stadiumCapacity.ts:26`) → `template.seatsPerLevel` if set, else `liveConfig().capacityCalculation`; `registerConfigSource` feeds the gate the live config so `liveConfig()` is not `DEFAULT_GAME_CONFIG` | **all four `*_stand` templates carry `seatsPerLevel: null`**, so every stand resolves at `capacityCalculation` = **1250** (not the app default 1000) | live `facilityTemplates` + live `capacityCalculation` |
| — and NOT from `baseCost` | `baseCost` is 25,000,000 / 19,000,000 pence; `baseCost / 1250` would seat 20,000 / 15,200 per level instead of 1250 | — | CLAUDE.md binding rule, honoured |
| home games per division | `homeGamesForLeague(clubCount, isDeepest, 23)` over the export's **club rows** — `slots` is `null` in this export (retired 2026-11-19) | SC t1–t3: 12 rows, not deepest → **11**; SC t4: 11 rows, deepest → size 12 → **11**. EN t1–t7 → **15**; t8 15 rows, deepest → **15** | export club rows |
| ticket price | `publishedTicketPricePence(tier, cfg)` — the published ladder wins in both modes | SC **£8 / £6 / £4.50 / £3.50**; EN **£80 / £60 / £45 / £35 / £28 / £22 / £16 / £14** | live `economyTierBaseline.tiers[].ticketPricePence` |
| ticket-price elasticity | **derived**, not defaulted: `undefined` passed through `registerConfigSource`, so it follows `wageModel` as the live game has since 2026-11-14 | `ticketPriceElasticity` **absent** from the live payload; `economy.wageModel` = **`turnover`** → **ON** | `GET /api/starter-config` → `economy.wageModel` |
| season tickets | `seasonTicketHolderPercent` | **70** | live config |
| food uptake | `matchdayFoodUptakePercent` | **35** | live config |
| sponsor bands | `sponsorBandConfigForTier(…, tier, cfg)` — the per-tier published rows, not the six flat keys | SC t1 small 7,302,960–10,693,620 … (per-tier rows present at all four tiers) | live `economyTierBaseline.tiers[].sponsorBandsPence` |
| league sponsor count | export `sponsorCount` (a count, not an amount) | SC **6 / 5 / 5 / 4** | export league rows |
| fan base (shirt line) | `starter.fanBaseRanges[tier]` — keyed by **tier alone**, no country level | t1 700k–1.5m … t8 10k–20k | `GET /api/starter-config` |
| wage anchor | `incomeAnchoredWages` **absent** from the live payload → derives from `wageModel === 'turnover'` → **TRUE**; this is the FLIPPED column | — | the 2026-11-20 correction, re-verified here |
| position taper | `leaguePositionDecreasePercent` | **10** (not the code's `?? 5`), so a 10th-place finish takes `1 − 0.10 × 9` = **0.10** of the first-place pot | live config, both countries |
| **TV per club** | 🔴 **this is where the carried figure broke — see §3** | — | — |

---

## 3. 🔴 Why 643–1188% was not real: the gate's TV line is England's fixture

`src/economy/harness/loadExport.ts:292`:

```ts
const prior = ENGLAND_DEV.find((t) => t.tier === row.tier);
tiers.push({
  …
  // TV is per-league, not in game-config; carried from the fixture and flagged by the drift
  // table if it has moved. A live league payload would supply it; this export cannot.
  tvPerClubPence: prior?.tvPerClubPence ?? 0,
```

`ENGLAND_DEV` is a hardcoded table in `src/economy/harness/fixtures.ts:87`, headed *"England,
dev, 2026-11-13"*. So **every country the gate measures is credited England's TV money**, and
Scotland's authored turnover ladder is a tenth of England's. At SC t1 that is
£136,000,000 of TV against £33,100,000 of authored turnover — **410.9% from one line** — and
it is reported as "TV" with no indication that it is another country's number.

It is worse than a wrong line, because the fixture also sets the rescale the prize and position
lines are multiplied by. `variantGate.ts` computes

```ts
const exportTv1 = fin.find((l) => l.tier === 1)?.tvDeal ?? 0;   // the export's own league row
const liveTv1   = TIERS.find((t) => t.tier === 1)?.tvPerClubPence ?? 0;  // ← the FIXTURE
const RESCALE   = exportTv1 > 0 ? liveTv1 / exportTv1 : 1;
```

so the fixture's England figure propagates into **three** of the seven income lines. The run as
it stands says so itself:

```
  · Prize and position money are rescaled by 5.440x — the tier-1 tvDeal ratio
    between the world export and live. THIS IS THE WEAKEST INPUT IN THE RUN
```

**The export's league money is not stale, and the rescale is not warranted at all.**
`LeagueImportExportService.php:66,93-97` resolves it through the same services the device is
served by:

```php
'tvDeal'            => $this->leagueSizeResolver->derivedTvDealPence($l) ?? $l->getTvDeal(),
…
// Same chain as `SyncService::buildLeagueSnapshot()` and `/api/initialize/leagues`.
'prizeMoney'        => $this->leaguePayoutResolver->prizeFor($l, $config),
'leaguePositionPot' => $this->leaguePayoutResolver->positionPotFor($l, $config),
```

and `/api/initialize/leagues` (`InitializeController.php:251,254-255,258`) publishes those same
three expressions. The app pays TV from exactly that field — `seasonFinances.ts:79`
`inflate(Math.max(0, league.tvDealPence), idx)`, fed from `leagueRecords[].tvDeal`. **So the
export's league rows ARE the device's figures**, and the only correct source for the gate's TV
line is the export it was already handed.

Internal consistency of the export confirms it, against the backend's own invariant
`tvDeal = intdiv(tvPoolPence, clubCount)`:

| | pool (pence) | divisor | export `tvDeal` | check |
|---|---|---|---|---|
| SC t1 | 30,000,000,000 | 12 | 2,500,000,000 | ✅ exact |
| SC t4 | 5,000,000,000 | 12 (11 rows + the player's place) | 416,666,666 | ✅ exact |
| EN t1 | 30,000,000,000 | 16 | 1,875,000,000 | ✅ exact |
| EN t8 | 120,000,000 | 16 (15 rows + the player's place) | 7,500,000 | ✅ exact |

### The corrected run

One change, in a **scratch copy outside both repos** (`git archive` extract in the session
scratchpad — no repo file touched). Kept as
`evidence/scotland-gate-remeasure-2026-11-20/variantGate.SCRATCH-PATCH.diff`:

```diff
-const TIERS: readonly TierFixture[] = loaded.tiers;
+const TIERS: readonly TierFixture[] = loaded.tiers.map((t) => ({
+  ...t,
+  tvPerClubPence: fin.find((l) => l.tier === t.tier)?.tvDeal ?? 0,
+}));
```

`RESCALE` then falls out at **exactly 1.000x** by construction, because `liveTv1` and `exportTv1`
become the same number — so prize and position stop being multiplied by England's fixture too.
The run prints it:

```
  · Prize and position money are rescaled by 1.000x — the tier-1 tvDeal ratio
```

(A second scratch block was added to print each income line in exact pence; it computes nothing,
it only widens the printed precision. It is in the same diff.)

**Scotland, corrected** (`variantGate-SC.2026-11-20-TVCORRECTED.txt`):

```
tier |     TV | matchday |  shirt | club spon | league spon |  prize | position || COVERAGE
  1  |  75.5% |    10.0% |   4.9% |      8.6% |       17.2% |   0.0% |    30.2% || 146.5%  <-- outside 85-110%
  2  | 102.3% |    23.8% |   5.9% |      8.7% |       14.5% |   0.0% |    70.2% || 225.4%  <-- outside 85-110%
  3  | 168.6% |    30.0% |  11.5% |      6.5% |       16.2% |   0.0% |   144.5% || 377.2%  <-- outside 85-110%
  4  | 201.3% |    46.4% |  10.2% |      7.1% |       14.1% |   0.0% |   144.9% || 424.0%  <-- outside 85-110%

  COVERAGE outside 85-110%: 1, 2, 3, 4
```

**England, the control, corrected** (`variantGate-EN.2026-11-20-TVCORRECTED.txt`):

```
tier |     TV | matchday |  shirt | club spon | league spon |  prize | position || COVERAGE
  1  |   5.7% |     8.2% |   4.9% |      8.6% |       17.2% |   0.0% |     3.0% ||  47.6%  <-- outside 85-110%
  2  |   7.7% |    17.9% |   5.9% |      8.7% |       14.5% |   0.0% |     7.0% ||  61.6%  <-- outside 85-110%
  3  |  12.6% |    21.5% |  11.5% |      6.5% |       16.2% |   0.0% |    14.5% ||  82.6%  <-- outside 85-110%
  4  |  15.1% |    28.8% |  10.2% |      7.1% |       14.1% |   0.0% |    14.5% ||  89.7%
  5  |  25.6% |    33.1% |  12.1% |      4.7% |        9.4% |   0.0% |    13.7% ||  98.5%
  6  |  23.2% |    76.4% |  12.1% |      6.4% |       12.8% |   0.0% |    32.3% || 163.3%
  7  |  45.6% |    31.4% |  15.2% |      7.5% |       11.2% |   0.0% |    72.9% || 183.7%
  8  |  34.9% |   102.2% |  18.1% |      6.7% |       10.1% |   0.0% |    93.0% || 265.1%

  COVERAGE outside 85-110%: 1, 2, 3, 6, 7, 8
```

Exact pence behind both tables (the scratch precision block):

```
── SCRATCH: income lines in PENCE (exact), plus authored turnover ───────  [SC]
tier | turnoverPence |            tv |      matchday |         shirt | clubSponsors | leagueSponsors |         prize |      position |         TOTAL
  1  |    3310000000 |    2500000000 |     331141947 |     163350000 |    285011055 |      570022110 |             0 |    1000000000 |    4849525112
  2  |    1140000000 |    1166666666 |     271569008 |      66924000 |     99041341 |      165068902 |             0 |     800000000 |    2569269917
  3  |     346000000 |     583333333 |     103960394 |      39657750 |     22363431 |       55908578 |             0 |     500000000 |    1305223486
  4  |     207000000 |     416666666 |      96035414 |      21128250 |     14597862 |       29195723 |             0 |     300000000 |     877623915

── SCRATCH: income lines in PENCE (exact), plus authored turnover ───────  [EN]
  1  |   33100000000 |    1875000000 |    2710353844 |    1633500000 |   2850110550 |     5700221100 |             0 |    1000000000 |   15769185494
  2  |   11400000000 |     875000000 |    2036544656 |     668250000 |    990413416 |     1650689027 |             0 |     800000000 |    7020897099
  3  |    3460000000 |     437500000 |     742461381 |     396734250 |    223634318 |      559085795 |             0 |     500000000 |    2859415744
  4  |    2070000000 |     312500000 |     595724968 |     211175250 |    145978622 |      291957243 |             0 |     300000000 |    1857336083
  5  |     732000000 |     187500000 |     242269594 |      88357500 |     34391917 |       68783833 |             0 |     100000000 |     721302844
  6  |     269000000 |      62500000 |     205583700 |      32683200 |     17154472 |       34308943 |             0 |      87000000 |     439230315
  7  |      68600000 |      31250000 |      21570450 |      10395000 |      5127407 |        7691111 |             0 |      50000000 |     126033968
  8  |      21500000 |       7500000 |      21975700 |       3900600 |      1447738 |        2171608 |             0 |      20000000 |      56995646
```

---

## 4. What Scotland's excess actually is: the same league money, a tenth of the turnover

Line up Scotland against England at the tiers both have, in pence:

| line, t1 | Scotland | England | SC ÷ EN |
|---|---|---|---|
| authored turnover | 3,310,000,000 | 33,100,000,000 | **0.100** |
| shirt | 163,350,000 | 1,633,500,000 | **0.100** |
| club sponsors | 285,011,055 | 2,850,110,550 | **0.100** |
| league sponsors | 570,022,110 | 5,700,221,100 | **0.100** |
| ticket price | 800 | 8,000 | **0.100** |
| **position pot** | 1,000,000,000 | 1,000,000,000 | **1.000** |
| **prize (1st place)** | 10,000,000,000 | 10,000,000,000 | **1.000** |
| **TV pool** | 30,000,000,000 | 30,000,000,000 | **1.000** |
| **TV per club** | 2,500,000,000 | 1,875,000,000 | **1.333** (same pool ÷ 12 vs ÷ 16) |

Every Scottish input that the economy chain scales is at 0.100. The three **league-money** fields
are at parity — and TV per club is *above* England's, because Scotland divides the same pool
between 12 clubs instead of 16.

The mechanism is in the resolver. `EconomyScaleResolver.php:153`:

```php
$turnoverPence = intdiv($baselineTurnover * $countryFactorBp, self::BP);
```

England t1 turnover is the baseline array's own 33,100,000,000, so
**`countryFactorBp('SC')` = 1000** (0.1) — which is where Scotland's tenth comes from.
`LeaguePayoutResolver::resolve()` applies the *same* factor (`:246,269-270`), so Scotland's prize
and position **should** also be a tenth. They are not, and the export shows why:

```
== SC
  t1 prize=10000000000 prizeOverride=10000000000 posPot=10000000000 posPotOverride=10000000000
== EN
  t1 prize=10000000000 prizeOverride=10000000000 posPot=10000000000 posPotOverride=10000000000

--- how many leagues world-wide carry non-null overrides ---
  tvDealOverride            196 of 196
  prizeMoneyOverride        196 of 196
  leaguePositionPotOverride 196 of 196
--- distinct leaguePositionPot by tier across ALL 196 leagues ---
  tier 1 [10000000000] distinct 1
  tier 2 [8000000000]  distinct 1
  …
  tier 8 [200000000]   distinct 1
```

`prizeFor()` and `positionPotFor()` both begin `$explicit = $league->getPrizeMoney(); if
($explicit !== null) return $explicit;` — **so on this box the country factor never runs for
either payout.** All 196 leagues carry a frozen per-league override, every country's is the
baseline-country figure, and the resolver is bypassed in all 196 cases.

🔴 **This directly contradicts the backend's own documentation of the same field.**
`LeagueImportExportService.php:103-108`:

> *"Null here means "inherit", which is the state of all 196 leagues today, and round-tripping
> must leave it null rather than freezing the ladder into 196 per-league overrides."*

The state of all 196 leagues today is the opposite of that. The file's own import path explains
how it could happen without anybody deciding to: `:218-221` reads `tvDealOverride` when present
and **falls back to writing the resolved `tvDeal` into the raw column** for a file written before
the override keys existed — and both 2026-11-15 and 2026-11-18 exports are such files. A
re-import of one into the rebuilt dev box is sufficient to freeze the ladder. I did **not** verify
that this is what happened; I verified only the resulting state. ⚠️ **Not my call to fix.**

For sizing only, the arithmetic if those two payout overrides were null and the country factor
applied — **a derived scenario, not a measurement of the live box**:

| | SC t1 | SC t2 | SC t3 | SC t4 |
|---|---|---|---|---|
| measured today | 146.5% | 225.4% | 377.2% | 424.0% |
| payouts resolved at `countryFactorBp` 1000 | 119.3% | 162.2% | 247.2% | 293.5% |

Still outside the band at every tier, because the **TV pool** is a per-league authored column with
**no country-factor path in code at all** (`derivedTvDealPence` is `intdiv(pool, clubCount)` and
nothing else), and it is authored identically for all 25 countries.

---

## 5. Verdict on the ~172% at SC t4: 🔴 real, and larger now — but not re-measurable by this instrument

**What the 172% was.** `scotland-experiment-2026-11-19.md:150` — one NPC club, Linlithgow, SC t4,
on a device save: `7,763,975 p/wk × 46 = GBP 3,573,429`, against authored turnover £2,070,000 =
**172.6%**. It is the **NPC weekly-income projection**, not the gate. Those are different
instruments measuring different subsets, and conflating them is how the two figures came to
"not reconcile".

**The subset.** `npcSolvency.ts:60-67` is `sponsor + matchday × homeGames / weeks + seasonal /
weeks`, and `seasonalPence` is **`league.tvDeal` and nothing else** — every caller passes exactly
that (`GameLoop.ts:1579`, `SeasonBudgetService.ts:598`, `NpcClubDashboard.tsx:115`,
`ChecksTab.tsx:367`). No prize, no position, no league sponsor pot, no shirts; `weeksRunway`
pins `seasonEndIncome: 0` deliberately. So the comparable slice of the gate is
**TV + matchday + club sponsors**, and nothing else.

| | SC t1 | SC t2 | SC t3 | **SC t4** |
|---|---|---|---|---|
| TV + matchday + club sponsors, today | 94.1% | 134.8% | 205.1% | **254.7%** |
| pence | 3,116,153,002 | 1,537,277,015 | 709,657,158 | **527,299,942** |
| England's same slice at the same tier | 22.5% | 34.2% | 40.6% | **50.9%** |

**Verdict: the residual is real, it is still a Scotland-specific backend authoring matter exactly
as recorded, and it has grown — the comparable figure at SC t4 is ~255%, not ~172%.** The growth
is attributable and single-cause: A23's divisor change raised SC t4 TV per club from
**299,000,000** (pool 5,382,000,000 ÷ 18) to **416,666,666** (pool 5,000,000,000 ÷ 12), **+39.4%**,
while the authored turnover ladder did not move. TV alone is now **201.3%** of SC t4's authored
turnover.

⚠️ **The 172% itself cannot be re-measured here and has not been.** It was one named NPC club's
projection in a running save — its own ground, its own rolled sponsors, its own fan base. I have
no save and no device. The 254.7% is the gate's tier-average over the export's 11 real SC t4
grounds. They are close enough in construction to compare and **not** close enough for the
difference between them to be read as a change in any one club.

---

## 6. Where each number differs from the handover's, and which of the three causes it is

The brief asked these be kept apart. They are, and **all three are present**:

### (a) A 4-tier pyramid versus 8 — **smaller than assumed, and the stated mechanism is wrong**

🔴 **Correction to the handover.** §9.5 says the 643–1188% figure "priced a 4-tier ladder against
an 8-tier world: its 'tier 4' is the BOTTOM of the authored ladder but a MID-table division in the
export". That is not what the gate does. **The gate's tier set comes from the live config's
`economyTierBaseline.tiers`, which held 4 tiers for Scotland on 2026-11-19 as it does today**, and
its grounds come from `groundsByTier(world, 'SC')` — the SC t4 league's own club rows, in both
exports. It never priced a mid-table division as t4.

What the 8-tier world actually changed is one flag and one count:
`deepestTierForCountry` returned **8**, so SC t4 was not the deepest tier and home games were
`clubCount − 1` = **13** off 14 rows; today it is the deepest, 11 rows + the player's place = 12,
so **11**. That is the whole of the pyramid-depth effect, and it moves the matchday line only —
which is 10.0–46.4% of a 146.5–424.0% total. **The 8-tier/4-tier mismatch was a real input defect
and a small one.** It is not why the number was wrong.

### (b) A config or world value that has since changed — **the move from 643–1188% to 616–1056%**

Entirely this, and almost entirely one value. Scotland's TV pool was re-authored and the divisor
retired between the exports:

| | 2026-11-18 export | 2026-11-20 export |
|---|---|---|
| SC t1 `tvPoolPence` | 244,800,000,000 | **30,000,000,000** |
| SC t1 `tvDeal` | 13,600,000,000 (÷ 18 `slots`) | **2,500,000,000** (÷ 12 club rows) |
| SC t4 `tvDeal` | 299,000,000 | **416,666,666** |
| SC `slots` | 18 | **null** (retired) |
| SC leagues | 8 | **4** |
| SC club rows | 14/14/14/14/14/14/14/13 | **12/12/12/11** |

Via `RESCALE` (6.347x → 5.440x) that re-pricing alone moved the position line by the factor
0.857 at every tier — e.g. SC t3 position 917.1% → 786.1%, which is exactly 6.347 ÷ 5.440. The
rest of the 643→616 move is the matchday line following 13 home games → 11.

⚠️ Note what this means for the handover's reading of the old number: the fixture's
13,600,000,000 and the 2026-11-18 export's 13,600,000,000 **agreed**, so on 2026-11-19 the gate's
TV line happened to be right for Scotland by coincidence. The re-authoring is what pulled them
apart — and so the 2026-11-19 run's TV line was correct while today's as-it-stands run's is
8.16x too high. **The old 643–1188% was wrong for a different reason than today's 616–1056%.**

### (c) A measurement method that was wrong before — **the move from 616–1056% to 146.5–424.0%**

All of it, and it is §3: the gate's TV line is England's hardcoded `ENGLAND_DEV` fixture for every
country, and that fixture also sets the multiplier applied to prize and position. **This is the
governing lesson of the workstream in its purest form** — a repo default standing in for a value
the live payload supplies — and it is the fifth time it has been paid for. It also means every
**non-England** figure the variant gate has ever printed carries it. England's own runs are
affected too, via `RESCALE` 7.253x on prize and position: the control's t1 reads 102.0% as the
gate stands and **47.6%** once TV comes from the league rows.

⚠️ **England's corrected t1–t3 are now UNDER the band** (47.6% / 61.6% / 82.6%) where the carried
figures read 102.0% / 127.3% / 180.9%. That is a change in the control, and it is not something
this task was asked to resolve. Flagging it, not acting on it.

---

## 7. The export against the documentation

**On the census rule — not breached, and checked rather than assumed.**

The owner's note is right that the export carrying money is a `LeagueImportExportService`
round-trip artefact. Scanning every key in the file for money shapes, there is exactly one on a
club and six on a league, and nothing else:

```
top-level keys: ['version', 'exportedAt', 'leagues', 'clubs']        (no players, so no wages)
--- money-shaped keys under clubs ---
   clubs.balance (int)
--- money-shaped keys under leagues ---
   leagues.tvDeal · tvDealOverride · tvPoolPence · prizeMoney · prizeMoneyOverride
   leagues.leaguePositionPot · leaguePositionPotOverride · parachute · sponsorCount (a COUNT)
balance: nonzero 3127 of 3127, distinct 3127
```

Traced to the device, per field:

| field | reaches the **world pack**? | reaches the device another way? |
|---|---|---|
| `clubs.balance` | ❌ no — `WorldPackSnapshotBuilder::buildClubSnapshot()` has no money key at all, and `buildLandSnapshot`'s `valuePence` was removed 2026-11-18 ("the last money left on a club") | not in any payload I found |
| `tvDeal`, `tvPoolPence`, `prizeMoney`, `leaguePositionPot`, `parachute` | ❌ no — `WorldInitializationService::buildLeagueSnapshot()` (the pack) carries only `leaguePositionDecreasePercent`, annotated *"A RULE, NOT AN AMOUNT — which is why this one survived v11 and the four money keys beside it did not"* | ✅ **yes**, via `GET /api/initialize/leagues` (`InitializeController.php:245-258,283`) and `SyncService::buildLeagueSnapshot()` — **deliberately**, documented at `WorldInitializationService.php:848-853`: *"ADDITIVE, and ADDED HERE RATHER THAN TO THE WORLD PACK… This snapshot is built per sync, so it costs nothing."* |
| `sponsorCount` | ✅ a count, which the rule permits | ✅ with `sponsorSizes`; **no** `sponsorPot` on `/api/initialize/leagues` |

🟢 **So: nothing else in the export is money that reaches the device *pack*.** Five league money
fields do reach the device, through the per-sync league payload the rule and the code both name as
their intended home. The rule is intact.

Two documentation inaccuracies found while checking, both minor and neither a breach:

1. The binding rule's illustration — *"which is why `GET /api/initialize/leagues` publishes
   `sponsorCount`/`sponsorSizes` and no pot"* — is true of the **sponsor** pot only. That endpoint
   publishes `prizeMoney`, `leaguePositionPot`, `tvDeal`, `tvPoolPence` and `parachute`. And
   `SyncService::buildLeagueSnapshot():836` **does** publish `'sponsorPot' => (int) $sponsorPot`,
   so the sponsor pot reaches the device by that other route. Worth one sentence in the rule.
2. `src/__tests__/economy/packIsACensus.test.ts` pins the *second* half of the rule only — "a
   priced pack row is never free", "an already-priced row keeps its price", determinism. **No test
   in it asserts that a pack carries no money field.** The strongest half of the rule is unpinned.

Three further contradictions, outside the census question:

3. **`LeagueImportExportService.php:103-108` is factually wrong about the live box** — "null…
   is the state of all 196 leagues today" against 196/196 non-null on all three override columns.
   §4. This one has teeth: it is the reason Scotland is paid England's payouts.
4. **The stale `tvDealOverride` columns disagree with the derived share by the retired divisor.**
   SC t1 override is 2,142,857,142 = 30,000,000,000 ÷ **14**; SC t4 is 357,142,857 = 5,000,000,000
   ÷ **14**. The derived figure wins in the export and on the device (`derivedTvDealPence(…) ??
   getTvDeal()`), so this is inert **today** — but a league whose pool is ever cleared would fall
   back to a 14-club share in a 12-club division.
5. **The handover's "All 25 other countries are 8 tiers" is off by one.** The export holds **25
   countries in total**: Scotland at 4 tiers and **24** others at 8. 24 × 8 + 4 = 196 ✅.
   (`starter-config.leagueAbilityRanges` carries **26** country keys — `GH` is authored there and
   has no leagues in the export.)

---

## 8. What I could NOT measure, and why

Stated plainly, and left unmeasured rather than estimated:

1. 🔴 **The ~172% itself.** It was one NPC club's projection in a running device save. No save, no
   device, and `GET /api/initialize/leagues` is authenticated:
   ```
   == https://api.dev.buildmyclub.co.uk/api/initialize/leagues
   http 401 bytes 44
   {"code":401,"message":"JWT Token not found"}
   ```
   §5 gives the gate's comparable slice (254.7% at SC t4) and says why it is a comparison and not
   a reproduction.
2. **`country_profile.economy_factor_bp` for SC, as a row.** I have no database access and no
   endpoint publishes it. The **value** is established arithmetically — SC turnover is exactly
   0.100 of the baseline array at all four tiers, and `EconomyScaleResolver.php:153` is
   `intdiv(baselineTurnover × countryFactorBp, 10000)`, so the resolved factor is 1000bp — but I
   did not read the row.
3. **Whether the 196 frozen payout overrides came from re-importing a pre-override export.**
   `:218-221` makes it mechanically sufficient and both earlier export files are of that vintage.
   I verified the **state**, not the cause. Needs the admin audit log or the box's history.
4. **Everything the variant gate does not model**, unchanged from previous runs and restated
   because the coverage figure is a FLOOR on income: `investor_income`,
   `pyramid_distribution`, `win_bonus`, `fan_initiative`, `manufacturing`, `dividend_draw`,
   `tournament_prize`, `guardian_payment`; transfers, matchday variance, injury load; and the
   insolvency ladder has no effects in the sim.
5. **Nothing on device.** No OTA was installed, no save was opened, no CHECKS panel was read.
   Every figure here is the headless gate over the live config, the live starter-config and the
   16:33 export.
6. **The prize column reads 0.0% at every tier in every run above** — correct, not missing: the
   gate credits the flat first-place prize only at `--position 1`, and all runs here are at the
   default 10th. The position pot is the tapered line and it is credited.

---

## 9. Files

| | |
|---|---|
| this report | `docs/economy-loose-ends/scotland-gate-remeasure.md` |
| the four gate runs, verbatim | `evidence/scotland-gate-remeasure-2026-11-20/variantGate-{SC,EN}.2026-11-20-{NEW,TVCORRECTED}.txt` |
| the scratch patch, as a diff | `evidence/scotland-gate-remeasure-2026-11-20/variantGate.SCRATCH-PATCH.diff` |
| the live configs as fetched at 16:42 | `evidence/scotland-gate-remeasure-2026-11-20/{game-config-SC,game-config-EN,starter-config}.LIVE.json` |
| the export measured | `evidence/world-export-2026-11-20.json` (unmodified, sha256 `b3dc8f7a…`) |

`NEW` = the gate exactly as it stands in `wunderkind-app` at `4113d326`.
`TVCORRECTED` = the same gate with TV taken from the export's league rows. **Carry the
`TVCORRECTED` numbers.**

---
---

# Second pass — 2026-11-20, 17:10: reconciling the device's 934.5% against this report's 424.0%

Added on request after the owner's device data from **OTA 491** (`Muirkirk Violet`, SC t4,
season 1) arrived. **§1–§9 above are unchanged and stand on their own evidence.** Same
boundaries: no code changed in either repo, nothing tuned, nothing staged or committed, no
database written.

🟢 **Headline: the device and this report do not disagree about any input. They disagree about
one ASSUMPTION — where the modelled club finishes — and it is worth 5x on the largest income
line in Scotland. Reconciled below to within 0.1 of a percentage point.**

And the uncomfortable half of that: **the position convention this report's first pass used is
the wrong one for Scotland**, so §0's Scottish figures under-credit position money by 5x against
the convention the device's own projection uses. Corrected table at the end of §11.

### The device's code is the code read here — confirmed, not assumed

```
$ gh run list --workflow eas-update-dev.yml -L 4 --json number,headSha,status,createdAt
[{"createdAt":"2026-11-20T16:28:38Z","headSha":"db8b56d6f53521e2c3226a42a16217dabe43f746","number":491,…},
 {"createdAt":"2026-11-20T11:45:05Z","headSha":"36087794…","number":490,…},
 {"createdAt":"2026-11-20T10:44:48Z","headSha":"1ff6fd56…","number":489,…},
 {"createdAt":"2026-11-20T09:52:44Z","headSha":"fe4217f6…","number":488,…}]
```

**OTA 491 is `db8b56d6`.** My measured tree is `4113d326`, which is **not** an ancestor of it —
but every file this section reasons from is byte-identical across the two:

```
$ for f in …; do git diff --quiet 4113d326 db8b56d6 -- "$f" && echo "SAME $f" || echo "DIFFERS $f"; done
SAME     src/engine/FinancialProjectionService.ts
SAME     src/utils/leagueFinances.ts
SAME     src/economy/perTierEconomy.ts
SAME     src/economy/seasonFinances.ts
SAME     src/economy/npcSolvency.ts
SAME     src/utils/npcFinances.ts
SAME     src/stores/clubStore.ts
SAME     src/economy/harness/loadExport.ts
```

So the "the device runs code I have not measured" caveat is **discharged** for everything below.

---

## 10. Q1 — Scotland's TV ladder is **not** authored above England's, and nothing is scaling it up

The device's two columns are exactly the export's `tvDeal`, and the export's `tvDeal` is
`intdiv(tvPoolPence, clubCount)`. The **pool** is the authored figure, and it is authored
**identically**:

```
t1  pool SC=30000000000 EN=30000000000 same=True | tvDeal SC=2500000000 (GBP 25.00m) EN=1875000000 (GBP 18.75m) ratio=1.333333
t2  pool SC=14000000000 EN=14000000000 same=True | tvDeal SC=1166666666 (GBP 11.67m) EN= 875000000 (GBP  8.75m) ratio=1.333333
t3  pool SC= 7000000000 EN= 7000000000 same=True | tvDeal SC= 583333333 (GBP  5.83m) EN= 437500000 (GBP  4.38m) ratio=1.333333
t4  pool SC= 5000000000 EN= 5000000000 same=True | tvDeal SC= 416666666 (GBP  4.17m) EN= 312500000 (GBP  3.12m) ratio=1.333333
```

and across all 196 leagues in all 25 countries there is **exactly one distinct pool per tier**
(§7). The 1.333333 is not an authoring decision about Scotland at all — it is **16 ÷ 12**, the
club-count ratio, and it appears at every tier to six decimal places because that is all it is.

🔴 **The answer to "or is something scaling it?" is the reverse of the question: nothing is, and
that is the defect.** `derivedTvDealPence()` is `intdiv(pool, clubCount)` and consults no country
factor; the pool is a per-league authored column with **no country-factor path anywhere in the
code**. Turnover and the wage scale do go through one — `EconomyScaleResolver.php:153`,
`intdiv($baselineTurnover * $countryFactorBp, 10000)` — and land at exactly 0.100:

```
== EN  country EN  source country  tierCount 8
  t1 turnoverPence=33100000000  wageScaleMicroPence=1269725639
  t4 turnoverPence=2070000000   wageScaleMicroPence=925730138
== SC  country SC  source country  tierCount 4
  t1 turnoverPence=3310000000   wageScaleMicroPence=126972564
  t4 turnoverPence=207000000    wageScaleMicroPence=92573014

ratio SC/EN per tier:  tier  turnover   wageScale
   t1  0.100000  0.100000
   t2  0.100000  0.100000
   t3  0.100000  0.100000
   t4  0.100000  0.100000
```

**So the owner's 13x decomposes exactly: 1.3333 from the divisor × 10.0 from the country factor
the TV pool never applies.** Said plainly, as asked: **Scotland's TV is not authored above
England's. One mechanism (`countryFactorBp`) scales Scotland's turnover and wages to a tenth and
is not reachable from the TV pool, and a second (the club-count divide) hands a 12-club league a
larger per-club share of the same money than a 16-club one.** Whether the pool should be
country-scaled is an owner decision; that it currently *cannot* be is a code fact. **Not fixed,
not tuned.**

This is the same shape as §4's finding about prize and position, and it is now three of three:
every league-money field in Scotland is at England parity, by three different routes — frozen
per-league overrides (prize, position) and no country-factor path at all (the TV pool).

---

## 11. Q2 — the reconciliation: one differing input, and it is the finishing position

### What the device's lump actually contains

The PM's note describes it as "(TV, prize, shirt)". That is not what the code sums.
`FinancialProjectionService.ts:371`:

```ts
const totalSeasonEndIncome = Math.max(0, tvDeal + leagueSponsorPot + estimatedPosPrize
  + shirtNet + seasonTicketIncome - seasonTaxPence);
```

**Five terms, and there is no flat prize term at all** — it was removed deliberately
(`:258-277`: *"`league.prizeMoney` is the division's flat champion's prize, and this expression
used to add it for every club unconditionally… the forecast was the one caller that never got
the change"*). `seasonTaxPence` is gated off (`PYRAMID_DISTRIBUTION_ENABLED` is false). So the
£19,196,031 is **TV + league-sponsor share + position money + shirt + season tickets**.

### The £15m is position money, at mid-table of a 12-club division

`FinancialProjectionService.ts:282-284`:

```ts
const estimatedPosition = divisionSize ? Math.ceil(divisionSize / 2) : 5;
const posMultiplier = Math.max(0, 1 - (posDecPct / 100) * (estimatedPosition - 1));
const estimatedPosPrize = Math.round(positionPot * posMultiplier);
```

SC t4's division is 12 (11 NPC rows + the player's place — the export's own count, §2), so
`estimatedPosition = ceil(12/2) = 6`, and with `leaguePositionDecreasePercent = 10` the
multiplier is `1 − 0.10 × 5 = 0.5`:

> **3,000,000,000 × 0.5 = 1,500,000,000 pence = £15,000,000**

**That is the device's season-end lump almost entirely, and it is the one line this report
treated differently.** §0–§9 ran the gate at its default `--position 10`, i.e. multiplier
`1 − 0.10 × 9 = 0.10`, giving £3,000,000.

Re-running the corrected gate at the device's own convention — `--position 6` for a 12-club
Scottish division — reproduces the device's figure exactly
(`evidence/…/variantGate-SC.TVCORRECTED-pos6.txt`):

```
tier | turnoverPence |            tv |      matchday |         shirt | clubSponsors | leagueSponsors |         prize |      position |         TOTAL
  4  |     207000000 |     416666666 |      96035414 |      21128250 |     14597862 |       29195723 |             0 |    1500000000 |    2077623915
```

`position = 1500000000` — **the device's £15,000,000, to the penny.**

### The full reconciliation, line by line

| line | device, `Muirkirk Violet` SC t4 | gate at `--position 6`, SC t4 | note |
|---|---|---|---|
| TV | £4,166,667 | **£4,166,667** | identical — same `tvDeal` |
| position | £15,000,000 | **£15,000,000** | identical once the position convention matches |
| matchday × 46 | £148,877 | £960,354 | **the ground** — see below |
| sponsors (club), weekly × 46 | £0 | £145,979 | **Q4** — see §13 |
| shirt + league-sponsor share + season tickets | £29,364 *(combined, inside the lump)* | £21,128 + £291,957 = £313,085 | fan base and sponsor share of a founding club |
| **total season income** | **£19,344,908** | **£20,776,239** | |
| authored turnover | £2,070,000 | £2,070,000 | identical (§12) |
| **COVERAGE** | **934.5%** | **1003.7%** | |

Residual: **69.2 percentage points = £1,432,440.** It is fully accounted for:

```
gate   matchday + shirt + clubSponsors + leagueSponsors = 96,035,414 + 21,128,250 + 14,597,862 + 29,195,723 = 160,957,249 p = £1,609,572
device matchday + everything-but-TV-and-position                                                              = £148,877 + £29,364  = £  178,241
difference                                                                                                                            = £1,431,331  →  69.1 points
```

**69.1 against the 69.2 observed — the two instruments agree to 0.1 of a percentage point.**

That remaining £1.4m is not a disagreement about an input, it is a difference in the **club**: the
device's is a founding club on starter facilities (`defaultFacilities` gives it four stands at
level 1 — 4 × 1 × 1250 = **5,000 seats**) with a founding fan base and no sponsor contracts,
while the gate averages `computeMatchdayRevenue` over the export's **11 real SC t4 NPC grounds**.
The gate is measuring the division; the device is measuring one new club in it. Both are correct
answers to different questions, and the gate's is the higher one.

### 🔴 So the first pass's Scottish figures used the wrong mid-table

`--position 10` is the gate's default and it is mid-table in a **16-club** English division
(`ceil(16/2) = 8`, close enough). In a **12-club** Scottish division mid-table is **6th**, and
10th is fourth from bottom. **Every Scottish gate run in this workstream, this report's §0
included, has priced position money at 0.10 of the pot where the device prices it at 0.50.**
That is a fourth measurement-convention defect in the Scottish numbers, alongside the three in
§6, and it is mine.

Scotland, corrected TV **and** at the device's own mid-table convention
(`variantGate-SC.TVCORRECTED-pos6.txt`):

```
tier |     TV | matchday |  shirt | club spon | league spon |  prize | position || COVERAGE
  1  |  75.5% |    10.0% |   4.9% |      8.6% |       17.2% |   0.0% |   151.1% ||  267.4%  <-- outside 85-110%
  2  | 102.3% |    23.8% |   5.9% |      8.7% |       14.5% |   0.0% |   350.9% ||  506.1%  <-- outside 85-110%
  3  | 168.6% |    30.0% |  11.5% |      6.5% |       16.2% |   0.0% |   722.5% ||  955.3%  <-- outside 85-110%
  4  | 201.3% |    46.4% |  10.2% |      7.1% |       14.1% |   0.0% |   724.6% || 1003.7%  <-- outside 85-110%
```

England, the control, at **its** own mid-table (`ceil(16/2) = 8`)
(`variantGate-EN.TVCORRECTED-pos8.txt`):

```
tier |     TV | matchday |  shirt | club spon | league spon |  prize | position || COVERAGE
  1  |   5.7% |     8.2% |   4.9% |      8.6% |       17.2% |   0.0% |     9.1% ||  53.7%  <-- outside 85-110%
  2  |   7.7% |    17.9% |   5.9% |      8.7% |       14.5% |   0.0% |    21.1% ||  75.6%  <-- outside 85-110%
  3  |  12.6% |    21.5% |  11.5% |      6.5% |       16.2% |   0.0% |    43.4% || 111.5%  <-- outside 85-110%
  4  |  15.1% |    28.8% |  10.2% |      7.1% |       14.1% |   0.0% |    43.5% || 118.7%  <-- outside 85-110%
  5  |  25.6% |    33.1% |  12.1% |      4.7% |        9.4% |   0.0% |    41.0% || 125.9%  <-- outside 85-110%
  6  |  23.2% |    76.4% |  12.1% |      6.4% |       12.8% |   0.0% |    97.0% || 228.0%  <-- outside 85-110%
  7  |  45.6% |    31.4% |  15.2% |      7.5% |       11.2% |   0.0% |   218.7% || 329.5%  <-- outside 85-110%
  8  |  34.9% |   102.2% |  18.1% |      6.7% |       10.1% |   0.0% |   279.1% || 451.1%  <-- outside 85-110%
```

### The three Scottish numbers the workstream now holds, and which to carry

| figure | what it is | carry it? |
|---|---|---|
| **267.4 / 506.1 / 955.3 / 1003.7%** | corrected TV, modelled club at each division's own mid-table — the convention the device's projection uses | 🟢 **yes — this is the comparable figure** |
| 146.5 / 225.4 / 377.2 / 424.0% (§0) | the same, at the gate's default 10th place | only against England at 10th; it is not mid-table in Scotland |
| 254.7% at SC t4 (§5) | **a different slice entirely** — TV + matchday + club sponsors, which is all `npcSolvency.ts` sums, and it contains **no position money at all** | only against the 172% NPC figure. ⚠️ **Do not read it against 934.5%** |

**So the workstream does not have two irreconcilable Scottish numbers.** It has one measurement
under two position conventions and one deliberately narrower slice, and §5's verdict on the
~172% is unaffected because that comparison never included position money on either side.

---

## 12. Q3 — `turnoverPence` for SC t4 is £2,070,000, confirmed against the live row

```
== SC country SC source country tierCount 4
  t4 turnoverPence=207000000    (GBP 2,070,000.00) wageScaleMicroPence=92573014  resolvable=True youthScholarshipPence=10033 ticketPricePence=350
```

**207,000,000 pence = £2,070,000.** Read from `GET /api/game-config?country=SC` at 16:42 today,
`economyTierBaseline.source: "country"`, `country: "SC"` — so it is the country-resolved row and
not the const fallback (`loadExport.ts:assertCountryResolved` refuses the fallback outright). The
device read the right figure. It is exactly 0.100 of England's t4 **2,070,000,000**, and the wage
scale confirms the same factor independently: **92,573,014 vs 925,730,138**.

---

## 13. Q4 — sponsors at £0: 🔴 an asymmetry, not a founding-club artefact

Taking the non-benign reading first, as asked, and it is the one the code supports.

**The NPC side is unconditional.** `npcFinances.ts:192-200`, run at world init:

```ts
export function generateNpcSponsorContracts(clubId, _clubName, tier, reputation, maxSponsors, sponsorConfig) {
  const count = Math.max(1, Math.round((reputation / 100) * maxSponsors));
```

`Math.max(1, …)` — **every NPC club starts season 1 with at least one priced sponsor contract**,
and the docblock says it is priced *"with the same `computeSponsorOffer` formula AMP clubs use,
so NPC and AMP clubs are directly comparable at equal reputation"*. Its income is read by
`sumNpcSponsorIncome` (`:170-172`) and credited from week 1 (`GameLoop.ts:1573`,
`SeasonBudgetService.ts:593`). An NPC Scottish t4 club at 237,969 p/wk is that working as
designed.

**The player's side has no equivalent.** `clubStore.ts:483` initialises:

```ts
    sponsorContracts: [],
```

and across the whole of `src/` the **only** writer is `addSponsorContract` (`clubStore.ts:1046-1051`),
whose only non-test caller is `InboxResponseHandlers.ts:158` — the player **accepting an
inbox offer**. The projection reads that same array (`FinancialProjectionService.ts:123`,
`(club.sponsorContracts ?? []).reduce((sum, c) => sum + c.weeklyPayment, 0)`), so an empty array
is £0, correctly.

🔴 **And the authored intent exists but is wired to nothing.** `starter_config` publishes
`starterSponsorTier: "SMALL"` (`StarterConfigController.php:90`, default set at
`StarterConfig.php:195`, admin-editable at `DashboardController.php:754`). In the app it appears
**once**, as a type declaration:

```
=== starterSponsorTier consumers (app) ===
src/types/api.ts:24:  starterSponsorTier: string;    // 'SMALL' | 'MEDIUM' | 'LARGE'
```

**Nothing reads it.** So "the founding club starts with a SMALL sponsor" is authored, published,
admin-editable — and never happens.

**Verdict: both readings are true and the asymmetric one is the load-bearing half.** The £0 is
not permanent (an inbox offer can arrive and be accepted), so it is *a* founding-club artefact;
but there is **no code path that gives the founding club a starting sponsor**, while every NPC in
its division is guaranteed one, so it is **also an asymmetry in the starting state** — and it is
an asymmetry in the direction that makes the player's club poorer than every club it is measured
against, during exactly the season when `SeasonBudgetService` sizes its budget.

⚠️ **One thing I could not distinguish, and it would be a second and different defect.** The
2026-11-19 device pass recorded *"the AMP shows SPONSORS (1), GBP 223/wk, and the weekly line
reads GBP 0"*. If the owner's club currently shows a non-zero sponsor count while the weekly line
reads £0, that is **not** the empty-array case above — `SponsorsScreen.tsx:32` reads the same
array, so a populated list with £0 income means the row's `weeklyPayment` is zero or absent. The
field names diverge across the two sides — AMP `SponsorContract.weeklyPayment` (`types/club.ts:81`)
versus NPC `weeklyPaymentPence` — which is precisely the silently-zero read shape the census rule
exists to catch (`?? 0` on a money field). **Deciding which of the two the owner is seeing needs
the device: the SPONSORS count on the Finances → Sponsors screen.** Not guessed here.

---

## 14. What this second pass could NOT measure

1. **Which of the two sponsor readings the owner's club shows.** §13's last paragraph names the
   one on-device check that settles it (the SPONSORS count beside the £0 weekly line). Everything
   else in §13 is from the source and applies to OTA 491 exactly.
2. **The £29,364 split** between shirt, league-sponsor share and season tickets in the device's
   lump. The PM's figures give the combined total only, and all three depend on the club's own
   fan base, morale and attendance history, none of which I have. It is 0.15% of the lump and it
   does not move the reconciliation, which closes to 0.1 of a point without it.
3. **Whether `countryFactorBp` SHOULD apply to the TV pool.** §10 establishes that it cannot
   today. Whether it ought to is the owner's decision, and this report takes no position.
4. Everything in §8 still stands: no save, no device, no database, `/api/initialize/leagues` 401,
   and the gate's income floor excludes `investor_income`, `pyramid_distribution`, `win_bonus`
   and the rest.

**New evidence files**, alongside those in §9:

| | |
|---|---|
| Scotland at its own mid-table | `evidence/scotland-gate-remeasure-2026-11-20/variantGate-SC.TVCORRECTED-pos6.txt` |
| England at its own mid-table | `evidence/scotland-gate-remeasure-2026-11-20/variantGate-EN.TVCORRECTED-pos8.txt` |

---
---

# Third pass — 2026-11-20, 17:35: is the TV pool country-blind, and does 1/10 fix it?

Added on request. **§1–§14 above are unchanged.** Same boundaries: no code changed in either
repo, nothing tuned, nothing staged or committed, no database written. The `--league-money-divisor`
flag used in §17 lives only in the scratch `git archive` extract and is in the published diff.

🟢 **The hypothesis is confirmed, and §10 already said so independently: the pool is one
country-blind figure per tier, and Scotland's larger per-club share is `16 ÷ 12`.** §15 names the
column, the authoring table and the resolver.

🔴 **But the answers to questions 2 and 3 are both wider than the hypothesis, and in the
direction that matters for a ruling:**

- **TV is not the only country-blind money. Four quantities are**, by two different mechanisms —
  and one of them is a **cost**, not an income. §16.
- **A 1/10 on the league money does NOT land my figures near 100%, and should not be expected
  to — because England is not near 100% either.** It lands Scotland on England's own curve,
  which is the real test of "Scotland should be 1/10 of England's economy". The device's 99.93%
  is arithmetic on one founding club whose matchday is negligible, not a confirmation of the
  factor. §17.
- 🔴 **And at 1/10 the modelled Scottish club goes insolvent at every tier**, because facility
  upkeep is England-scale and country-blind too. `VARIANT GATE: FAIL — tiers 1, 2, 3, 4 still
  insolvent once wages follow income`. §17.

---

## 15. Q1 — confirmed: the pool is authored once, per tier, with no country dimension

**The column.** `League::$tvPoolPence` — `league.tv_pool_pence`, `bigint nullable`
(`src/Entity/League.php:62`). Its docblock states the design outright:

> *"The league's whole TV money for a season, in pence, split equally across its clubs. **THE
> AUTHORED VALUE.** `tvDeal` is derived from it; this is what an operator sets."*

**The authoring table.** `GameConfig::$leagueTierDefaults` (`src/Entity/GameConfig.php:2535`) —
a single array on the single GameConfig row, **keyed by tier as a string and by nothing else**:

```php
    private array $leagueTierDefaults = [
        '1' => ['promotionSpots' => null, 'tvDeal' => 1_000_000_000, 'prizeMoney' => 1_000_000_000, 'leaguePositionPot' => 1_000_000_000, …, 'tvPoolPence' => null, …],
        '2' => ['promotionSpots' => 2,    'tvDeal' =>   100_000_000, …],
        …
        '8' => ['promotionSpots' => 2,    'tvDeal' =>       500_000, …],
    ];
```

**The accessor takes a tier and no country:** `getLeagueTierDefaultsForTier(int $tier)`
(`:2579`). **And generation copies it verbatim, with no factor** —
`LeagueService::generateLeaguesForCountry()`:

```php
            $defaults = $this->gameConfigRepository->getConfig()->getLeagueTierDefaultsForTier($tier);
            $league   = new League($country, $tier, sprintf('League %d', $tier));
            …
            $league->setTvPoolPence($defaults['tvPoolPence']);
```

`$country` is in scope on the line above and is never consulted for any money field.

**The resolver.** `LeagueSizeResolver::derivedTvDealPence($league)` = `intdiv(pool, clubCount)`,
and that is the whole of it — no country term, no `EconomyScaleResolver` dependency. It is the
expression `LeagueImportExportService:66`, `SyncService::buildLeagueSnapshot():834` and
`InitializeController:245` all publish, so the device, the export and the admin round-trip all
read the same number.

**The live rows, every tier, both countries** (`tvDeal` = the published per-club share,
`tvPoolPence` = the authored pool):

| tier | EN pool | SC pool | same? | EN `tvDeal` (÷16) | SC `tvDeal` (÷12) | SC ÷ EN |
|---|---|---|---|---|---|---|
| 1 | 30,000,000,000 | 30,000,000,000 | ✅ | 1,875,000,000 | 2,500,000,000 | 1.333333 |
| 2 | 14,000,000,000 | 14,000,000,000 | ✅ | 875,000,000 | 1,166,666,666 | 1.333333 |
| 3 | 7,000,000,000 | 7,000,000,000 | ✅ | 437,500,000 | 583,333,333 | 1.333333 |
| 4 | 5,000,000,000 | 5,000,000,000 | ✅ | 312,500,000 | 416,666,666 | 1.333333 |
| 5 | 3,000,000,000 | — | — | 187,500,000 | — | — |
| 6 | 1,000,000,000 | — | — | 62,500,000 | — | — |
| 7 | 500,000,000 | — | — | 31,250,000 | — | — |
| 8 | 120,000,000 | — | — | 7,500,000 | — | — |

and across all 196 leagues in all 25 countries:

```
--- tvPoolPence distinct by tier across all 196 leagues ---
  tier 1 distinct 1 [30000000000]
  tier 2 distinct 1 [14000000000]
  …
  tier 8 distinct 1 [120000000]
```

**The exact ratio is 1.333333 at every tier, to six decimal places** — not the 1.330/1.330/1.318/1.355
the rounded device display suggests. There is no authoring difference to explain; it is `16/12`.
🟢 **The "Scotland's TV is authored above England's" framing was wrong, and this report's §10
reached the same conclusion from the export before the hypothesis arrived.**

### The precise answer to "is there a country dimension that is simply set equal?"

**Both halves are true, and the fix differs depending on which you call the defect — so neither
should be described without the other:**

- 🟢 **At the storage level a country dimension EXISTS.** `tvPoolPence` is a column on `League`,
  and a `League` row is `(country, tier)`. All 196 rows can hold 196 different pools today, and
  `LeagueAdminController:60` lets an operator set one per league by hand. **So "scale Scotland's
  pool to a tenth" needs no migration** — it is 4 league rows, or one admin pass.
- 🔴 **At the authoring level it does NOT.** `leagueTierDefaults` is keyed by tier alone, so
  "Apply defaults" (`LeagueAdminController:203`) and every future `generateLeaguesForCountry`
  call **overwrite any per-league scaling back to the country-blind figure.** A hand-edit to the
  4 Scottish rows is therefore not durable against the next generate or apply-defaults.

So it is not "a dimension set equal" and not "a dimension missing" — it is **a per-country column
fed by a country-blind authoring table, with nothing scaling between them.** ⚠️ Which of those
two to change is the owner's call and this report takes no position.

---

## 16. Q2 — where a country scale WOULD be applied: a full census

`EconomyScaleResolver::countryFactorBp($country)` (`:178-190`) is the one country factor, read
from `country_profile.economy_factor_bp` over the baseline country's. Every call site in the
backend:

```
$ grep -rn "countryFactorBp\|scalePence(\|combinedFactorBp" src/ | grep -v EconomyScaleResolver.php
src/Service/Economy/WageModelResolver.php:499:        return $this->scaleResolver->scalePence($storedPence, $country, $tier);
src/Service/Economy/TicketPriceResolver.php:94,103
src/Service/Economy/SponsorBandResolver.php:128,135,136
src/Service/Economy/LeaguePayoutResolver.php:246,269
src/Service/Economy/SeasonInvestmentService.php:255
src/Controller/Admin/EconomyAdminController.php:464,466     (display only)
src/Command/EconomyWageTableCommand.php:940,1661            (reporting only)
```

| quantity | resolver | country-scaled? | live SC ÷ EN |
|---|---|---|---|
| authored turnover | `EconomyScaleResolver::resolve():153` | 🟢 yes | **0.100000** |
| wage scale (`wageScaleMicroPence`) | same, `:282-301` | 🟢 yes | **0.100000** |
| a stored wage | `WageModelResolver:499` → `scalePence` | 🟢 yes | — |
| ticket price | `TicketPriceResolver:94-103` | 🟢 yes | **0.1000** (800 vs 8000) |
| sponsor bands | `SponsorBandResolver:128-136` | 🟢 yes | **0.100000** (§18) |
| season-investment ceiling | `SeasonInvestmentService:255` | 🟢 yes | — (feature ships at 0) |
| **champion's prize** | `LeaguePayoutResolver::prizeFor` | ⚠️ path exists, **defeated by data** | **1.000000** |
| **league position pot** | `LeaguePayoutResolver::positionPotFor` | ⚠️ path exists, **defeated by data** | **1.000000** |
| 🔴 **TV pool** | `LeagueSizeResolver::derivedTvDealPence` | ❌ **no path at all** | **1.000000** (per club 1.333) |
| 🔴 **parachute** | none — `League::getParachute() ?? GameConfig::getLeagueParachute()` | ❌ **no path at all** | **1.000000** |
| 🔴 **facility upkeep + build cost** | none — `facilityTemplates.weeklyUpkeepBase` / `baseCost` | ❌ **no path at all** | **1.000000** |

**So the owner's "TV deal, prize money etc" splits into two different problems, and it matters
which, because the remedies are unrelated:**

- **Prize and position already have the country factor wired** (`LeaguePayoutResolver::resolve()`
  applies `countryFactorBp` at `:246,269-270`). They come out at parity **only** because all 196
  leagues carry a non-null raw override and `prizeFor()`/`positionPotFor()` return it before the
  resolver runs — §4. **Clearing those two override columns is sufficient for prize and
  position**, with no code change at all.
- **TV pool and parachute have no country factor to defeat.** Giving them one is a code change,
  not a data change.

### Parachute, measured — the quantity nobody had checked

```
  EN t2 {"seasons": 3, "perSeasonPence": [7202985402, 4801990268, 2400995134]}
  SC t2 {"seasons": 3, "perSeasonPence": [7202985402, 4801990268, 2400995134]}
  EN t3 {"seasons": 3, "perSeasonPence": [2134596135, 1423064090, 711532045]}
  SC t3 {"seasons": 3, "perSeasonPence": [2134596135, 1423064090, 711532045]}
  EN t4 {"seasons": 3, "perSeasonPence": [1194540564, 796360376, 398180188]}
  SC t4 {"seasons": 3, "perSeasonPence": [1194540564, 796360376, 398180188]}

--- distinct parachute schedules per tier across all 196 leagues ---
  tier 1 … tier 8:  distinct 1 (every tier)
```

**Byte-identical, and one schedule per tier world-wide.** A Scottish club relegated from t2
receives `7,202,985,402` pence = **£72,029,854** in its first season down — against a t3 authored
turnover of **£3,460,000**, i.e. **2,081% of the division's whole authored turnover, in one
payment.** `seasonFinances.ts` pays it (`parachutePence`), so it is live. It is absent from §0's
coverage table because the gate reports parachutes in its own F5.4 block rather than in the
coverage sum — which is why it had not been noticed. ⚠️ **Flagged, not fixed.**

### 🔴 And the cost side is country-blind too — which §17 shows is load-bearing

```
$ sha256 of facilityTemplates, SC payload vs EN payload
sha256 SC 790cdb504f67f3f6…
sha256 EN 790cdb504f67f3f6…
IDENTICAL
money-shaped template keys: ['baseCost', 'weeklyUpkeepBase']
```

**All 22 facility templates are byte-identical between the two payloads.** So a Scottish club
pays England's `weeklyUpkeepBase` and England's `baseCost` out of a tenth-scale turnover. The
gate has been printing the consequence all along and it was read as a Scottish quirk rather than
as this: at SC t4, upkeep on the AUTHORED arm is **104.8% of the tier's whole authored
turnover** (§3's SC table), against 28.8%-ish shapes in England. **Any 1/10 applied to the income
side alone therefore lands on an unscaled cost base** — §17.

---

## 17. Q3 — re-run with the league money at 1/10: it does **not** land near 100%

### The instrument

One scratch flag, `--league-money-divisor N`, dividing **only** the three league-money lines the
export carries (`tvDeal`, `prizeMoney`, `leaguePositionPot`) before anything reads them. Turnover,
wages, ticket price, sponsor bands, shirts and grounds are untouched — they are already
country-scaled. Proven a no-op at `N = 1`:

```
$ npx tsx scripts/economy/variantGate.ts … --country SC          # divisor defaults to 1
$ diff sanity.txt variantGate-SC.2026-11-20-TVCORRECTED.txt && echo "…"
DIVISOR-1 RUN BYTE-IDENTICAL TO THE EARLIER TVCORRECTED RUN
```

### Scotland, league money ÷ 10 (`variantGate-SC.SCALED10-pos6.txt`, `…-pos10.txt`)

```
── at the division's own mid-table, 6th of 12 ──
tier |     TV | matchday |  shirt | club spon | league spon |  prize | position || COVERAGE
  1  |   7.6% |    10.0% |   4.9% |      8.6% |       17.2% |   0.0% |    15.1% ||  63.4%  <-- outside 85-110%
  2  |  10.2% |    23.8% |   5.9% |      8.7% |       14.5% |   0.0% |    35.1% ||  98.2%
  3  |  16.9% |    30.0% |  11.5% |      6.5% |       16.2% |   0.0% |    72.3% || 153.2%  <-- outside 85-110%
  4  |  20.1% |    46.4% |  10.2% |      7.1% |       14.1% |   0.0% |    72.5% || 170.3%  <-- outside 85-110%

── at the gate's default 10th place ──
  1  |   7.6% |    10.0% |   4.9% |      8.6% |       17.2% |   0.0% |     3.0% ||  51.3%  <-- outside 85-110%
  2  |  10.2% |    23.8% |   5.9% |      8.7% |       14.5% |   0.0% |     7.0% ||  70.1%  <-- outside 85-110%
  3  |  16.9% |    30.0% |  11.5% |      6.5% |       16.2% |   0.0% |    14.5% ||  95.4%
  4  |  20.1% |    46.4% |  10.2% |      7.1% |       14.1% |   0.0% |    14.5% || 112.4%  <-- outside 85-110%
```

### The four scenarios side by side, Scotland

| scenario | t1 | t2 | t3 | t4 |
|---|---|---|---|---|
| as measured (§11), mid-table 6th | 267.4% | 506.1% | 955.3% | 1003.7% |
| **TV pool ÷ 10 only** (the literal hypothesis), 6th | 199.4% | 414.0% | 803.5% | 822.5% |
| **TV + prize + position ÷ 10**, 6th | **63.4%** | **98.2%** | **153.2%** | **170.3%** |
| TV + prize + position ÷ 10, 10th | 51.3% | 70.1% | 95.4% | 112.4% |
| *England, the control, at its own mid-table (8th of 16)* | *53.7%* | *75.6%* | *111.5%* | *118.7%* |

(The TV-only row is exact arithmetic on the pence table in §3 — TV is a purely additive term in
the coverage sum — and the ÷10 rows are the gate's own output above.)

**Three findings, in order of importance:**

1. 🔴 **TV alone is nowhere near enough.** 199.4–822.5% at mid-table. The hypothesis as stated
   ("the pool is the one input that never got the memo") understates it, because the position pot
   is the **larger** of the two parity lines at every Scottish tier below t1 — 724.6% against
   TV's 201.3% at t4. **Any ruling that scales the pool and leaves the prize/position overrides
   frozen moves about a fifth of the error.**
2. 🟢 **With all three at a tenth, Scotland lands on England's curve** — 63.4/98.2/153.2/170.3%
   against England's 53.7/75.6/111.5/118.7%, each country at its own mid-table. Still 1.2–1.4x
   England's, and that residual is fully attributable: **1.333** from the TV divisor (12 clubs vs
   16) and the shallower pyramid's higher position multiplier (0.5 vs 0.3). **That is what
   "Scotland should be 1/10 of England's economy" looks like when it is measured rather than
   asserted, and it is a good outcome for the hypothesis.**
3. 🔴 **It does not land near 100%, and the device's 99.93% is not evidence that it does.**
   England is not near 100% at any tier either (47.6–89.7% at 10th), so "near 100%" was never the
   target the correction should be judged against. The 99.93% is arithmetic on **one founding
   club** whose matchday is £148,877 — 0.8% of its income — so its coverage is almost purely
   `lump ÷ turnover`, and `lump ÷ 10 ≈ turnover` at that one tier for that one club. The gate's
   clubs are the export's real NPC grounds, earning 6.5x that matchday, so the same correction
   lands them where England is instead. **A single club's coverage crossing 100% is a coincidence
   of its ground, not a calibration result.** The order-of-magnitude half of the hypothesis is
   solidly confirmed; the "99.93%" half should not be carried as a finding.

### 🔴 And the correction tips every Scottish tier insolvent

The coverage table is not the gate's verdict. At league money ÷ 10:

```
tier | AUTHORED              | MODELLED              | FLIPPED
     | bill% | insolvent     | bill% | insolvent     | bill% | insolvent | balance @ s30
  1  | 95.1% |         never | 149.9% |      season 1 | 115.3% |  season 1 |    -£96,466,482
  2  | 137.8% |      season 1 | 140.3% |      season 1 | 139.2% |  season 1 |   -£131,617,075
  3  | 133.7% |      season 1 |  87.3% |         never | 108.1% |  season 1 |    -£12,913,292
  4  | 164.8% |      season 1 |  96.7% |         never | 121.5% |  season 1 |    -£22,742,358

  insolvent once FLIPPED: 1, 2, 3, 4
…
VARIANT GATE: FAIL — tiers 1, 2, 3, 4 still insolvent once wages follow income
```

against `VARIANT GATE: PASS — every tier solvent for 30 seasons` on the unscaled run. The
upkeep column says why:

```
     |      AUTHORED      |      MODELLED      |      FLIPPED
tier | wages | upkeep     | wages | upkeep     | wages | upkeep
  1  | 60.0% |  35.1%     | 94.6% |  55.3%     | 60.0% |  55.3%
  2  | 60.0% |  77.8%     | 61.1% |  79.2%     | 60.0% |  79.2%
  3  | 60.0% |  73.7%     | 39.2% |  48.1%     | 60.0% |  48.1%
  4  | 60.0% | 104.8%     | 35.2% |  61.5%     | 60.0% |  61.5%
```

**Wages scale with the country factor; upkeep does not** (§16 — the facility templates are
byte-identical across the two payloads). Take the England-scale league money away from a
Scottish club and the England-scale ground is still there, so 60% wages plus 48–79% upkeep
exceeds 100% of income at every tier. ⚠️ **This is exactly the "size of the correction is the
kind of thing that must not be quietly applied" case: the income-side 1/10 is right by the
owner's stated intent and insufficient on its own.** Not applied, not briefed, not tuned — the
cost side is the owner's to rule on alongside it.

---

## 18. Q4 — sponsor money IS country-scaled on the backend; the country-blind path is in the app

**The backend scales it.** `SponsorBandResolver::bandFor()` (`:128-136`):

```php
        $countryFactorBp = $country === '' ? self::BP : $this->scaleResolver->countryFactorBp($country);
        …
            intdiv($lo * $ratioBp * $countryFactorBp, self::BP * self::BP),
            intdiv($hi * $ratioBp * $countryFactorBp, self::BP * self::BP),
```

and the live rows prove it is working — every published SC per-tier band is **exactly 0.100000**
of England's at the same tier:

| | SC t1 | EN t1 | SC t4 | EN t4 |
|---|---|---|---|---|
| small min | 7,302,960 | 73,029,600 | 1,210,830 | 12,108,307 |
| large max | 104,328,000 | 1,043,280,000 | 17,297,582 | 172,975,824 |

🟢 **So `sponsorCount`-derived money does NOT have the TV pool's problem.** `sponsorCount` itself
is country-blind (it comes from the same `leagueTierDefaults`), but it is a **count** — the
census rule's own distinction — and the amount each sponsor pays is country-scaled. The gate's
own figures agree: club and league sponsorship come out at an identical share of turnover in both
countries (8.6% and 17.2% at t1, §3), which is what correct scaling looks like.

🔴 **The country-blind sponsor path is in the app, as a fallback.** The six **flat** keys are
byte-identical in both payloads and equal to **England tier 1**:

```
== SC FLAT sponsor keys:              == EN FLAT sponsor keys:
   smallSponsorMin    73029600           smallSponsorMin    73029600
   smallSponsorMax   106936200           smallSponsorMax   106936200
   mediumSponsorMin  106936200           mediumSponsorMin  106936200
   mediumSponsorMax  174749400           mediumSponsorMax  174749400
   largeSponsorMin   326025000           largeSponsorMin   326025000
   largeSponsorMax  1043280000           largeSponsorMax  1043280000
```

`sponsorBandConfigForTier` (`perTierEconomy.ts:168-203`) prefers the published per-tier rows and
falls back to these per band half; `sponsorBandsForTier` (`:98-107`) falls back first to
`economyTierBaseline.sponsorBandsPence` (the country's **tier-1** block) and then returns
`undefined`, at which point the flat keys win. `rollLeagueSponsorPot`'s own docblock names the
trigger: *"`tier` is optional so an older stored league without it keeps working; absent, this
resolves to the flat keys exactly as before."*

**The magnitude, measured:** the flat keys are **60.3136x** SC t4's own published band
(`326,025,000 ÷ 5,405,494 = 60.3136`; `73,029,600 ÷ 1,210,830 = 60.3137`;
`1,043,280,000 ÷ 17,297,582 = 60.3136` — the same factor on all three sizes, since the flat keys
are exactly EN t1 and SC t4's band is EN t1 ÷ 60.31). So a stored Scottish t4 league that reaches
the fallback rolls its sponsor pot at **60x**. I have **no evidence that the live device reaches
it** — §11's reconciliation closes to 0.1 of a point with the correctly-scaled bands, which is
positive evidence that it does **not**. Recorded as a live hazard with a measured magnitude, not
as an observed defect.

One stale docblock while I was there: `SponsorBandResolver.php:47` says *"`countryFactorBp` is
10000 for every country in the shipped state, so every rolled value is byte-identical to what it
was."* `countryFactorBp('SC')` is **1000** on this box, and the published SC bands are a tenth —
so that paragraph describes a state that ended when Scotland's factor was set.

---

## 19. What this third pass could NOT measure

1. **`country_profile.economy_factor_bp` as a row, still** — no DB access, no endpoint. Its
   value is established arithmetically at **1000 for SC** from three independent quantities now
   (turnover, wage scale and sponsor bands all at exactly 0.100000), but the row is unread.
2. **Whether the 196 frozen prize/position overrides came from a pre-override re-import.** §8.3
   unchanged — the state is measured, the cause is not.
3. **Whether the device ever reaches the app's flat-key sponsor fallback.** §18 gives the
   trigger and the 60.3x magnitude; §11's reconciliation is evidence against it on the owner's
   current save, and settling it in general needs the stored `LocalLeague` rows on a device.
4. **The right size of any cost-side correction.** §17 establishes that an income-side 1/10 alone
   makes every Scottish tier insolvent in the FLIPPED column, and that facility upkeep is the
   unscaled term. It does **not** establish what upkeep should be, and this report does not model
   a scaled-upkeep scenario — that is calibration, and the standing rule is correctness first.
5. Everything in §8 and §14 still stands.

**New evidence files**, alongside §9's and §14's:

| | |
|---|---|
| Scotland, league money ÷ 10, at mid-table | `evidence/scotland-gate-remeasure-2026-11-20/variantGate-SC.SCALED10-pos6.txt` |
| Scotland, league money ÷ 10, at 10th | `evidence/scotland-gate-remeasure-2026-11-20/variantGate-SC.SCALED10-pos10.txt` |
| the scratch patch, all three hunks | `evidence/scotland-gate-remeasure-2026-11-20/variantGate.SCRATCH-PATCH.diff` |

---
---

# Fourth pass — 2026-11-20, 18:10: the tier ladder, and breaking the 99.93%

Added on request. **§1–§19 above are unchanged.** Read-only: no code changed in either repo,
nothing tuned, nothing staged or committed, no database written.

**Three answers, and the middle one is the one that matters:**

1. 🟢 **The mechanism A25 reports is real** and I confirm it independently from live config:
   Scotland's bottom division is authored as **rung 4 of an 8-rung ladder** in every quantity I
   can read — ability band, turnover, TV pool, position pot, prize, parachute. §20, §21.
2. 🔴 **But A25's two figures do not reproduce, and their stated 44x does not follow from their
   own numbers.** `scaleFor('SC',4)` is **38.5%**, not 64.7%; against `scaleFor('EN',8)` = 6.9%
   (which reproduces exactly) that is **5.56x**, not 44x. 64.7% is `55/85` — the *const
   fallback* for **both** tiers, which fires only when a country has no authored band, and
   Scotland does have one. §23. **Treat the mechanism as confirmed and the magnitude as not
   yet established.**
3. 🔴 **The 99.93% breaks.** It is not a reconciliation. The ×0.1 cancels out of it entirely, so
   it is a statement about *England's rung 4* with Scotland's divisor; and it exists **only
   because** Scotland's bottom division is authored at rung 4 — the very thing A25 reports as
   wrong. **Two errors, and one of them is load-bearing for the other.** §22.

---

## 20. Q3 — authored tier count per country, from the export alone

Independent of anything the backend says about itself:

```
--- authored tiers per country, FROM THE EXPORT (league rows) ---
  AR n=8 … BE n=8 … BR n=8 … CA n=8 … CO n=8 … DE n=8 … EG n=8 … EN n=8 …
  ES n=8 … FR n=8 … IN n=8 … IT n=8 … JP n=8 … KR n=8 … MX n=8 … NG n=8 …
  NL n=8 … PL n=8 … PT n=8 … SA n=8 …
  SC  n=4 tiers=[1, 2, 3, 4]
  TN n=8 … TR n=8 … US n=8 … WA n=8 …

total leagues 196 = 24x8 + 4 = 196
```

and `starter-config.leagueAbilityRanges` agrees — **Scotland is the only country whose tier keys
are `[1, 2, 3, 4]`**; the other 25 keys (including `GH`, which has no leagues) all carry 1–8.
🟢 **So "Scotland's four tiers are tiers 1–4 of an eight-tier ladder" is confirmed from the
export, not taken from the backend's report of itself.** It also corrects §7's note: 24 countries
are 8 tiers in the league rows, 25 in the ability table.

---

## 21. Q1 — is my method sensitive to the rung? Yes, and in the opposite direction to the worry

### The denominator is literally drawn from rung 4

`EconomyScaleResolver::resolve():152-153`:

```php
        $baselineTurnover = $config->getEconomyBaselineTurnoverPence()[$effectiveTier - 1] ?? 0;
        $turnoverPence    = intdiv($baselineTurnover * $countryFactorBp, self::BP);
```

`getEconomyBaselineTurnoverPence()` is the **8-entry** array
`[33.1bn, 11.4bn, 3.46bn, 2.07bn, 732m, 269m, 68.6m, 21.5m]`, indexed by `tier - 1`. Scotland's
tier 4 therefore reads **index 3**, and the live row confirms it to the penny:
`2,070,000,000 × 0.1 = 207,000,000`. **So the coverage denominator in §0, §11 and §17 is
England's rung-4 turnover scaled by the country factor — it is not a bottom-division figure.**

Bottom division against bottom division, every authored quantity, from live config and the export:

| quantity | **SC t4** (Scotland's bottom) | **EN t8** (England's bottom) | SC ÷ EN |
|---|---|---|---|
| ability band | **15–35** | **2–7** | — |
| authored `turnoverPence` | 207,000,000 | 21,500,000 | **9.63x** |
| ticket price | 350 | 1,400 | 0.25x |
| youth scholarship | 10,033 | 2,500 | 4.01x |
| sponsor band, small min | 1,210,830 | 701,084 | 1.73x |
| sponsor band, large max | 17,297,582 | 10,015,488 | 1.73x |
| `tvPoolPence` | 5,000,000,000 | 120,000,000 | **41.67x** |
| `tvDeal` per club | 416,666,666 | 7,500,000 | **55.56x** |
| `prizeMoney` | 3,050,000,000 | 500,000,000 | 6.10x |
| `leaguePositionPot` | 3,000,000,000 | 200,000,000 | **15.00x** |
| parachute, season 1 | 1,194,540,564 | 9,891,092 | **120.77x** |
| `sponsorCount` | 4 | 3 | 1.33x |

🔴 **Scotland's bottom division is authored as a mid-table English one in every money quantity
there is** — and a club in it fields players of ability 15–35 where England's bottom division
fields 2–7. ⚠️ The `wageScaleMicroPence` ratio of 0.10x in the same comparison is **not** a wage
ratio and must not be read as one: it is pence per unit of `ability^k`, and SC t4's band
midpoint is 25 against EN t8's 4.5, so σ absorbs the difference. The per-player **wage** follows
turnover, at 9.63x.

### But the ratio is not inflated by this — it is deflated

Coverage is `income(tier) ÷ turnover(tier)`, and **both sides are read at the same rung**, so the
rung error cancels out of the ratio. What it changes is *which point on the coverage curve* a
country's bottom division sits at — and England's own measured curve rises steeply down the
ladder:

```
England, corrected TV, at 10th:  47.6  61.6  82.6  89.7  98.5 163.3 183.7 265.1   (span 5.6x)
England, corrected TV, at 8th:   53.7  75.6 111.5 118.7 125.9 228.0 329.5 451.1   (span 8.4x)
```

So the two comparisons my report invites are these, and they are not the same question:

| comparison | at each country's own mid-table | at 10th |
|---|---|---|
| **rung for rung** — SC t4 vs EN t4 | 1003.7% vs 118.7% = **8.45x** | 424.0% vs 89.7% = 4.73x |
| **bottom vs bottom** — SC t4 vs EN t8 | 1003.7% vs 451.1% = **2.22x** | 424.0% vs 265.1% = 1.60x |

🟢 **The answer to your question: my figures are not comparing against the wrong rung in a way
that inflates them. Reading Scotland's bottom division at rung 4 places it LOW on a rising curve,
so it makes Scotland's coverage look BETTER than a true bottom division would.** The
country-blindness gap I measured (8.45x rung-for-rung) shrinks to 2.22x when stated
bottom-to-bottom, because England's own bottom division is itself at 451%. **The tier-ladder
error masks part of the pool problem rather than adding to it.**

### And A25's own mechanism is orthogonal to my numerator and denominator

`TierBandScaleResolver::scaleFor` is a **staff-wage band scalar**. The variant gate's turnover
wage model does not read it, or `wageMultiplierTiers`, or an ability band at all — `loadExport.ts`
says so in its own header: *"the turnover average no longer exercises `weeklyWageRange`, no longer
reads `wageCurveExponentBp` or the ability band."* Its average is
`playerBudget ÷ (weeks × referenceSquadSize)`, every term published.

🟢 **So A25's finding cannot move a single figure in my coverage tables** — not one percentage
point. It lands entirely on the **cost** side, where it compounds with §16's unscaled facility
upkeep and §17's insolvency result: a Scottish bottom-division club pays staff priced off a
mid-table English band *and* England-scale ground upkeep, out of income the owner wants cut to a
tenth. **That is where the two findings meet, and it is the solvency column, not the coverage
table.**

---

## 22. Q2 — the 99.93% breaks. It is a coincidence, and one of the two errors causes it

Your arithmetic reproduces exactly, so there is nothing wrong with the sums:

```
lump 1,919,603,100 p ; /10 = 191,960,310 p (GBP 1,919,603)
  + matchday 14,887,700 p  =>  206,848,010 p  /  turnover 207,000,000  =  99.9266%
```

Four steps break it.

### (1) The ×0.1 cancels, so the 99.93% is not about Scotland at all

The proposed `/10` on the numerator and `countryFactorBp('SC') = 1000` in the denominator are the
**same factor**. Cancel them and the identical statement is:

```
  lump / EN-t4 baseline turnover = 1,919,603,100 / 2,070,000,000 = 92.7344%
```

**It is a statement about rung 4 of the England-scale ladders, with Scotland's club-count divisor
and position multiplier.** It would read the same for any country factor whatsoever, including
1.0. A figure that is invariant under the very quantity being proposed cannot be evidence for
that quantity's value.

### (2) The target was never 100%, because England is not at 100%

My measured England t4 is **89.7%** at 10th and **118.7%** at its own mid-table — **uncorrected,
no 1/10 anywhere.** England's tier 4 already sits either side of 100%. So "Scotland-at-1/10
lands at 99.93%" is the same information as "Scotland-at-1/10 lands where England's tier 4 is",
which §17 already reported from the gate (63.4/98.2/153.2/170.3% against England's
53.7/75.6/111.5/118.7%). **The precision adds nothing; it is England's rung-4 figure wearing a
Scottish label.**

### (3) The residual 1.58x is two unrelated factors multiplying to 1.00

```
SC t4  tv 416,666,666  pos 1,500,000,000  core lump 1,916,666,666      (pool/12, 6th of 12 -> x0.5)
EN t4  tv 312,500,000  pos   900,000,000  core lump 1,212,500,000      (pool/16, 8th of 16 -> x0.3)
SC core / EN core = 1.5808   (tv part 1.3333, pos part 1.6667)
```

England's rung 4 is at 0.586 of turnover on the lump alone; × 1.5808 = 0.927; plus a founding
club's matchday, which is **0.8% of its income** against the gate's ~11%, and the total crosses
1.00. **A club-count ratio, a position-taper ratio and one atypical ground. Nothing in that
product is a calibration result.**

### (4) The clincher — the 99.93% exists only because Scotland's bottom is at rung 4

The turnover ladder falls far faster down the rungs (33.1bn → 21.5m, **1,540x**) than the league
money does (pool 30bn → 120m, **250x**; position pot 10bn → 200m, **50x**). That is why coverage
rises down the ladder, and the rung-4-to-rung-8 step alone is worth:

```
  EN rung4 89.7% / 118.7%   vs   EN rung8 265.1% / 451.1%   ->   rung choice worth 3.0x / 3.8x
```

**So if Scotland's bottom division were authored as a bottom division — which is what A25's
finding says it should be — the same income ÷ 10 would land it roughly 3 to 3.8x higher, nowhere
near 100%.** The two errors are not independent: the pool's country-blindness pushes Scottish
coverage up, the rung-4 authoring pulls it back down, and at tier 4 with a founding club's
negligible matchday they happen to cross at 1.00.

🔴 **Verdict, plainly, as asked: I can break it, and the owner should not rule on it.** What
survives is the direction — the league money is country-blind, an income-side 1/10 brings
Scotland onto England's curve (§17), and that part is measured and solid. What does not survive
is "99.93% proves the factor is right": it is where a steeply rising curve happens to cross a
line, at one tier, for one ground, under a tier ladder that is itself in question. ⚠️ **And §17's
other result still stands over all of it: at income ÷ 10 the gate FAILS with all four Scottish
tiers insolvent, because upkeep is not scaled.**

---

## 23. A25's figures, checked — the mechanism holds, the magnitude does not

`a818a60b` is in my checkout (another session committed it during this pass; backend HEAD moved
`6c5e4ad5` → `a818a60b`). I verified that it does **not** change any line §1–§19 cites: of ten
cited backend files, eight are byte-identical across the two commits, and the two that differ
(`LeagueService.php`, `WorldInitializationService.php`) change neither the money-copy block in
`generateLeaguesForCountry` nor one value of the `ABILITY_RANGES` const.

`TierBandScaleResolver::scaleFor($country, $tier)` (`:54-71`) is
`min(1.0, midpoint($country,$tier) / midpoint($country, ANCHOR_TIER))` with `ANCHOR_TIER = 1`,
and `midpoint()` (`:88-98`) takes the authored `league_ability_ranges` row when its `min > 0`,
else `WorldInitializationService::ABILITY_RANGES[$tier]`. Evaluated against the **live**
starter-config fetched at 16:42:

```
  scaleFor(SC,4) = 0.384615 = 38.5%   [authored 15-35 / authored 40-90]
  scaleFor(EN,8) = 0.069231 =  6.9%   [authored  2-7  / authored 40-90]
  scaleFor(SC,2) = 0.692308 = 69.2%   [authored 30-60 / authored 40-90]
  scaleFor(SC,3) = 0.461538 = 46.2%   [authored 20-40 / authored 40-90]
  scaleFor(EN,4) = 0.384615 = 38.5%   [authored 15-35 / authored 40-90]

  SC t4 / EN t8 ratio = 5.56x
```

| | A25's report | measured here, live config |
|---|---|---|
| `scaleFor('EN', 8)` | 6.9% | 🟢 **6.9%** — reproduces exactly (4.5 ÷ 65) |
| `scaleFor('SC', 4)` | 64.7% | 🔴 **38.5%** (25 ÷ 65) |
| ratio between them | **44x** | 🔴 **5.56x** — and A25's own two figures divide to **9.35x**, not 44x |

**Where 64.7% comes from, exactly:**

```
  CONST[4] mid 55 / CONST[1] mid 85 = 0.6470588 = 64.7%   <-- exact match
```

🔴 **64.7% is `ABILITY_RANGES[4]` over `ABILITY_RANGES[1]` — the const fallback for *both*
tiers.** That branch fires only when the country has no authored band with `min > 0`, and
Scotland **does** have one (`leagueAbilityRanges.SC.4 = {min: 15, max: 35}`, §20). So A25's two
numbers were taken from **different precedence branches of the same function** — EN t8 from the
authored row, SC t4 from the hardcoded fallback. Against a config where Scotland is unauthored
their figure is right; against the live box it is not.

⚠️ **Marked as A25's claim, checked, not as my result.** I did not run their harness and cannot
see how they invoked it — a deliberate test double would explain it entirely. What I can say is
that **38.5% vs 6.9% is what the live box gives**, and the headline to carry is **5.56x**, not
44x. 🟢 **The mechanism they found is nonetheless real and important**, and §21's table confirms
it far more broadly than the band alone — note in particular that `scaleFor('EN',4)` is
**identical** to `scaleFor('SC',4)`, because Scotland's rung 4 *is* England's rung 4.

---

## 24. What this fourth pass could NOT measure

1. **"Scotland's bottom division authored at rung 8" as a measurement.** No such config exists,
   and building one would be a model, not a measurement. §22's 3.0x/3.8x is the measured
   rung-4-to-rung-8 step on **England's own** coverage curve, which is the honest bound; the
   matchday and shirt terms of a hypothetical Scottish rung-8 division are not computed at all.
2. **How A25 invoked `scaleFor`.** §23 identifies the expression their 64.7% equals and the
   precedence branch it belongs to. Whether that came from a test double, a stale config or a
   slip is theirs to say, and I have not assumed.
3. **Whether the 44x refers to a different pair of quantities** than the two figures quoted to
   me. It does not follow from those two, and I did not go looking for a pair it would fit.
4. **Anything on the staff cost side in numbers.** §21 establishes that A25's mechanism cannot
   move my coverage tables and that it lands in the solvency column instead. Quantifying it
   there needs the staff wage bill per country and tier, which is A25's measurement, not mine.
5. Everything in §8, §14 and §19 still stands: no save, no device, no database,
   `/api/initialize/leagues` 401, and the gate's income remains a floor.
