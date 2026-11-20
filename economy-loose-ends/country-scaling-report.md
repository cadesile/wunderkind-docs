# Country scaling — report

Backend `wunderkind-backend`, branch `development`, measured at `a818a60b` (clean tree). Written in
two halves: §1–§3 were written BEFORE any code (layer census and proposal); the rest is appended as
the work lands.

## 1. The layer, with evidence

**Live country factor (measured, not read off a default).** Live `GET /api/game-config` for EN and SC
(`evidence/country-scaling/gc-{EN,SC}-before.json`, fetched 2026-11-20 18:27 UTC): every
`economyTierBaseline.tiers[]` figure of `turnoverPence`, `wageScaleMicroPence`, `ticketPricePence`
and all nine sponsor-band endpoints is EXACTLY 10.0x larger for EN than SC at every tier — so live
`countryFactorBp('SC')` = 1000 against the baseline's 10000. The local Lando DB is NOT the live
dataset (there SC = 10000), so no figure below is read from it.

**What already passes through the factor** (`grep countryFactorBp|scalePence` in `src/`):
turnover and wage scale (`EconomyScaleResolver`), stored pool wages (`WageModelResolver::scalePoolWagePence`),
ticket price, sponsor bands, season-investment ceiling, NPC club starting balance
(`NpcClubGenerationService:674`, via `scalePence`), and — as CODE — prize and position pot
(`LeaguePayoutResolver::resolve`).

**What does not** (live `world-export-2026-11-20.json`, sha256 `b3dc8f7a…ccda01`, 196 leagues):

| quantity | resolution site | state |
|---|---|---|
| TV pool / per-club TV | `LeagueSizeResolver::derivedTvDealPence` = `pool ÷ clubs` | no factor anywhere. Pool is one value per tier world-wide (EN t1 30,000,000,000 = SC t1) |
| prize money, position pot | `LeaguePayoutResolver::prizeFor/positionPotFor` | factor wired for the NULL (inherited) path only. Every live league carries a non-null override column (`prizeMoneyOverride` EN t1 = SC t1 = 10,000,000,000), which `prizeFor` returns *verbatim, no factor* before the resolver runs |
| parachute | `$league->getParachute() ?? $config->getLeagueParachute()`, published verbatim | no factor; byte-identical schedule per tier (SC t2 `perSeasonPence[0]` 7,202,985,402 = EN t2) |
| youth scholarship | `WageModelResolver::youthScholarshipPenceUnder` | published `youthScholarshipPence` EN t1..4 = 150000/48596/16225/10033 and SC t1..4 IDENTICAL. Cause: the tier-1 `anchor` and the `floor` are absolute pence, and `anchor × avg(tier) ÷ avg(tier 1)` is invariant under a country factor because the factor cancels in the ratio |
| transfer fee | app: `economy/marketValue.ts` = `wage × weeks × 2.5 × age × potential × reputation` | **already scales, by construction** — it is a multiple of the SERVED wage, which the backend prices per country. Nothing to change |

**Money quantities found and deliberately NOT changed** (reason in brackets):
facility `baseCost` / `weeklyUpkeepBase` / land (owner: *"leave facilities for now"*);
account `userStartingBalanceMin/MaxPence`, quiz bonus, stakes, ledger (account-level, no country);
competition/tournament `prizePence`, `entryFeePerRound`, `stadiumPence` (server-authoritative
cross-country competitions with no club country); `ClubSaleValuationService` (a real-money-adjacent
sale of a user's club, not an in-game economy figure); `signOnFeePercent*` (a percentage of a wage,
inherits the scaled wage); `earlyTerminationFee` (derived from the sponsor deal, which scales);
`playerFeeMultiplier` (legacy; the live fee is wage-derived, above); `clubFundingMinimumPence`
(0 = no floor). Sell-on / buyout / severance are app-side multiples of the stored wage
(`useWeeklyTick` severance = wage × 4), so they inherit the wage's scaling.

## 2. Is it authoring or code?

**Code, at resolution time. No re-authoring of 25 countries × 8 tiers.** The admin's TIER DEFAULTS
authors one country-blind ladder per tier and it stays exactly as it is; the factor is applied
where the figure is resolved for publishing. England's factor is exactly 10000 (the baseline is
normalised to parity), so every England figure is multiplied by 10000/10000 and is untouched.

## 3. Proposal

1. **TV.** `LeagueSizeResolver` gets the `EconomyScaleResolver`; `tvPoolPenceFor(League)` =
   `pool × countryFactorBp ÷ 10000` (one `intdiv`); `derivedTvDealPence` divides THAT, so all seven
   existing publish sites scale through the one function. The four device-facing sites that publish
   the pool itself (`InitializeController`, `LeagueService`, `SyncService`, `WorldOverviewService`)
   switch to the scaled pool so `pool ÷ slots == tvDeal` still holds. The admin export and the
   league admin keep the RAW authored pool (they are the authoring surface and the export must
   round-trip).
2. **Prize and position pot.** Apply the factor to an explicit league column as well as to the
   inherited path. ⚠️ This retires "an override is used verbatim, no country factor". It is the one
   semantic change that needs the owner's eye: measured, no live league holds a *genuine* override —
   the columns are cascaded copies of the country-blind tier defaults — so the verbatim rule is
   exactly what defeats the ruling today. An override becomes a *baseline-country* figure.
3. **Parachute.** A resolver reads ONLY the documented `perSeasonPence` list and multiplies each
   entry; every other key passes through untouched, so the app-owned-schema decision is narrowed
   (one key read), not abandoned. `docs/api/economy-config.md` is amended to say so.
4. **Youth scholarship.** The authored `anchor` and `floor` are multiplied by the country factor
   before the existing floor/ceiling logic runs.
5. **Gate check 6** (`EconomyWageTableCommand`, "TV is a stored absolute") exists to tell an
   operator to hand-author a scaled TV table. With resolution-time scaling that instruction is now
   wrong and it would fire on every scaled country; it is rewritten to compare RESOLVED per-club TV.

Not done, by instruction: facilities, upkeep, ground cost, the staff ability band, DOF pot, scout
write, any re-authoring of values.


---

## 4. The live rows, before

Source: the 2026-11-20 world export (`evidence/world-export-2026-11-20.json`, sha256
`b3dc8f7a4ec1fd8ad6fe7c87e7945cd2ea888b41dc3153f817a4cd8471ccda01`), whose league rows are the
figures the device is served (the export resolves through the same services as
`/api/initialize/leagues`). Extracted for EN and SC into
`evidence/country-scaling/live-leagues-EN-SC.json`. `/api/initialize/leagues` itself needs a JWT and
was not called.

Live factor, from the live `GET /api/game-config` payloads (`gc-EN-before.json`, `gc-SC-before.json`):

```
turnoverPence   t1 33100000000 vs 3310000000  ratio 10.0   (t2 10.0, t3 10.0, t4 10.0)
ticketPricePence t1 8000 vs 800               ratio 10.0
sponsor bands: every endpoint exactly 10.0x
youthScholarshipPence  EN t1..t4 150000 48596 16225 10033
youthScholarshipPence  SC t1..t4 150000 48596 16225 10033     <- IDENTICAL: not scaled
```

## 5. The resolution chain, traced

* **TV.** `InitializeController` / `SyncService::buildLeagueSnapshot` / `LeagueService` →
  `LeagueSizeResolver::derivedTvDealPence` = `intdiv(pool, sizeOf)` — no country term, no
  `EconomyScaleResolver`. Now `tvDealFor()` → `derivedTvDealPence` → `tvPoolPenceFor()` =
  `intdiv(pool × countryFactorBp, 10000)`.
* **Prize / position pot.** `LeaguePayoutResolver::prizeFor` → returned the league's own column
  verbatim when non-null (all 196 live leagues) *before* the resolver's factor was reached. Now
  `scaleExplicit()`.
* **Parachute.** `$league->getParachute() ?? $config->getLeagueParachute()` at three publish sites.
  Now `LeaguePayoutResolver::parachuteFor()`.
* **Youth scholarship.** `WageModelResolver::youthScholarshipPenceUnder`: the factor cancels in
  `anchor × avg(tier) ÷ avg(tier 1)`; the anchor and floor are absolute. Now scaled.
* **Transfer fee** — `wunderkind-app/src/economy/marketValue.ts`: `wage × weeks × 2.5 × age ×
  potential × reputation`, taking the SERVED wage as input. The backend prices that wage by
  country, so the fee already scales; **no change, and the app is not touched**.
* The country factor (`EconomyScaleResolver::countryFactorBp`) is still **not published to the
  app**; the app's `gameConfig.ts` guard is untouched and still passes (nothing in `src/` of the
  app changed).

## 6. The figures after — per tier, EN all eight, SC all four

Method: a scratch harness (`evidence/country-scaling/harness.php`, run through `lando php`) boots
the real kernel in the TEST environment, opens a transaction, sets EN as baseline (10000) and SC
to the live 1000, writes the 12 live league rows from §4 into `league`, resolves every figure
through the production resolvers, prints JSON and ROLLS BACK. Run at `a818a60b` (before, working
tree clean) and again with the change (after). Raw: `before-resolved.json`, `after-resolved.json`.

⚠️ **Youth scholarship is measured on a config that does NOT match live.** The live anchor / floor /
cap are not published, and the harness could not reproduce the live `wageScaleMicroPence`
(tier 1: 48,869,120,733 against live 1,269,725,639), so its absolute youth figures (150000 / 57356 /
19200 / 13400) are the harness's, not live's. What it proves is the MECHANISM on one identical
config: EN unchanged, SC a tenth. The live "before" invariance is the §4 payload comparison.

`before → after`, pence:

| league | TV pool | prize | position pot (1st) | parachute per season | youth scholar /wk |
|---|---|---|---|---|---|
| EN t1 | 30,000,000,000 → **30,000,000,000** | 10,000,000,000 → **10,000,000,000** | 10,000,000,000 → **10,000,000,000** | — → **—** | 150,000 → **150,000** |
| EN t2 | 14,000,000,000 → **14,000,000,000** | 7,500,000,000 → **7,500,000,000** | 8,000,000,000 → **8,000,000,000** | [7,202,985,402, 4,801,990,268, 2,400,995,134] → **[7,202,985,402, 4,801,990,268, 2,400,995,134]** | 57,356 → **57,356** |
| EN t3 | 7,000,000,000 → **7,000,000,000** | 5,000,000,000 → **5,000,000,000** | 5,000,000,000 → **5,000,000,000** | [2,134,596,135, 1,423,064,090, 711,532,045] → **[2,134,596,135, 1,423,064,090, 711,532,045]** | 19,200 → **19,200** |
| EN t4 | 5,000,000,000 → **5,000,000,000** | 3,050,000,000 → **3,050,000,000** | 3,000,000,000 → **3,000,000,000** | [1,194,540,564, 796,360,376, 398,180,188] → **[1,194,540,564, 796,360,376, 398,180,188]** | 13,400 → **13,400** |
| EN t5 | 3,000,000,000 → **3,000,000,000** | 2,550,000,000 → **2,550,000,000** | 1,000,000,000 → **1,000,000,000** | [424,307,748, 282,871,832, 141,435,916] → **[424,307,748, 282,871,832, 141,435,916]** | 5,094 → **5,094** |
| EN t6 | 1,000,000,000 → **1,000,000,000** | 1,500,000,000 → **1,500,000,000** | 870,000,000 → **870,000,000** | [140,393,928, 93,595,952, 46,797,976] → **[140,393,928, 93,595,952, 46,797,976]** | 2,500 → **2,500** |
| EN t7 | 500,000,000 → **500,000,000** | 1,000,000,000 → **1,000,000,000** | 500,000,000 → **500,000,000** | [34,967,076, 23,311,384, 11,655,692] → **[34,967,076, 23,311,384, 11,655,692]** | 2,500 → **2,500** |
| EN t8 | 120,000,000 → **120,000,000** | 500,000,000 → **500,000,000** | 200,000,000 → **200,000,000** | [9,891,092, 6,594,061, 3,297,030] → **[9,891,092, 6,594,061, 3,297,030]** | 2,500 → **2,500** |
| SC t1 | 30,000,000,000 → **3,000,000,000** | 10,000,000,000 → **1,000,000,000** | 10,000,000,000 → **1,000,000,000** | — → **—** | 150,000 → **15,000** |
| SC t2 | 14,000,000,000 → **1,400,000,000** | 7,500,000,000 → **750,000,000** | 8,000,000,000 → **800,000,000** | [7,202,985,402, 4,801,990,268, 2,400,995,134] → **[720,298,540, 480,199,026, 240,099,513]** | 57,356 → **5,735** |
| SC t3 | 7,000,000,000 → **700,000,000** | 5,000,000,000 → **500,000,000** | 5,000,000,000 → **500,000,000** | [2,134,596,135, 1,423,064,090, 711,532,045] → **[213,459,613, 142,306,409, 71,153,204]** | 19,200 → **1,920** |
| SC t4 | 5,000,000,000 → **500,000,000** | 3,050,000,000 → **305,000,000** | 3,000,000,000 → **300,000,000** | [1,194,540,564, 796,360,376, 398,180,188] → **[119,454,056, 79,636,037, 39,818,018]** | 13,400 → **1,340** |

**England byte-identical, all eight tiers, every quantity** — `json.dumps(sort_keys=True)` of the
EN half of `before-resolved.json` equals that of `after-resolved.json` (`True`).

**EN ÷ SC after, per Scottish tier** (target 10.0000):

| tier | TV pool | prize | pot | parachute s1 | youth |
|---|---|---|---|---|---|
| t1 | 10.0000 | 10.0000 | 10.0000 | — | 10.0000 |
| t2 | 10.0000 | 10.0000 | 10.0000 | 10.0000 | 10.0010 |
| t3 | 10.0000 | 10.0000 | 10.0000 | 10.0000 | 10.0000 |
| t4 | 10.0000 | 10.0000 | 10.0000 | 10.0000 | 10.0000 |

(Parachute tier 1 has none authored. Youth t2 = 10.0010: 57356 ÷ 10 rounds to 5735 by `intdiv`.)
Per-club TV = pool ÷ clubs is unchanged arithmetic on the scaled pool (SC t1: 3,000,000,000 ÷ 12 =
250,000,000, against 2,500,000,000 before).

## 7. Solvency, before and after — THE EXPECTED CONSEQUENCE, NOT A REGRESSION

Facilities, upkeep and ground cost are out of scope by the owner's ruling and were not touched. So
Scottish clubs now collect a tenth of the league money and still pay England-scale upkeep.

Instrument: `scripts/economy/variantGate.ts` from an app `git archive HEAD` (`9bac0b18`) in a
scratch dir, plus a scratch patch (`evidence/country-scaling/gate-patch/variantGate.scratch.ts`)
that (a) takes TV from the export's own league row and sets `RESCALE = 1` (the "TVCORRECTED"
correction, `scotland-gate-remeasure.md` §3) and (b) multiplies the export's `tvDeal`, `prizeMoney`,
`leaguePositionPot` and parachute by `LEAGUE_MONEY_BP/10000` — the same ×0.1 the backend now
produces (§6 shows the resolver outputs are exactly that). **Validated both ways:**

* the patch at 10000 is byte-identical to the unpatched gate on the lines it does not touch, and
  the patched BEFORE at 6th place reproduces §11's published 267.4 / 506.1 / 955.3 / 1003.7%;
* the AFTER at 6th place reproduces §17's published 63.4 / 98.2 / 153.2 / 170.3% **and its
  insolvency table to the pound** (−£96,466,482 / −£131,617,075 / −£12,913,292 / −£22,742,358 —
  t4 differs by £1 from §17's −£22,742,358, a single-pence floor in the scratch multiply).

SC, modelled club finishing 10th (the gate's default), verbatim from `g-before.txt` / `g-after.txt`:

```
BEFORE  VARIANT GATE: PASS — every tier solvent for 30 seasons once wages follow income
tier |     TV | matchday |  shirt | club spon | league spon |  prize | position || COVERAGE
  1  |  75.5% |    10.0% |   4.9% |      8.6% |       17.2% |   0.0% |    30.2% || 146.5%
  2  | 102.3% |    23.8% |   5.9% |      8.7% |       14.5% |   0.0% |    70.2% || 225.4%
  3  | 168.6% |    30.0% |  11.5% |      6.5% |       16.2% |   0.0% |   144.5% || 377.2%
  4  | 201.3% |    46.4% |  10.2% |      7.1% |       14.1% |   0.0% |   144.9% || 424.0%
tier | FLIPPED bill% | insolvent | balance @ s30
  1  |  83.9% | never | £233,533,518
  2  |  94.5% | never |  £42,382,925
  3  |  79.5% | never |  £80,086,708
  4  |  84.7% | never |  £40,257,641

AFTER   VARIANT GATE: FAIL — tiers 1, 2, 3, 4 still insolvent once wages follow income
tier |     TV | matchday |  shirt | club spon | league spon |  prize | position || COVERAGE
  1  |   7.6% |    10.0% |   4.9% |      8.6% |       17.2% |   0.0% |     3.0% ||  51.3%
  2  |  10.2% |    23.8% |   5.9% |      8.7% |       14.5% |   0.0% |     7.0% ||  70.1%
  3  |  16.9% |    30.0% |  11.5% |      6.5% |       16.2% |   0.0% |    14.5% ||  95.4%
  4  |  20.1% |    46.4% |  10.2% |      7.1% |       14.1% |   0.0% |    14.5% || 112.4%
tier | FLIPPED bill% | insolvent | balance @ s30
  1  | 128.3% | season 1 | -£144,466,482
  2  | 170.9% | season 1 | -£170,017,075
  3  | 137.3% | season 1 | -£36,913,292
  4  | 153.2% | season 1 | -£37,142,359
```

At the gate's default 10th place all four Scottish tiers go from solvent to insolvent; at 6th place
(`g-before6.txt` / `g-after6.txt`) the same, with the AFTER matching §17. **Cause, from the gate's
own split:** the wage anchor scales with the country and facility upkeep does not (e.g. SC t2
AFTER: wages 85.6% + upkeep 110.9% of income). This is the known, accepted consequence. **Nothing was
backed out, upkeep was not scaled, and nothing was tuned to compensate.** The next decision is the
owner's.

## 8. Anything that still does not scale, and why it was left

| quantity | why left |
|---|---|
| facility `baseCost`, `weeklyUpkeepBase`, land, ground cost | **owner: "leave facilities for now"** — and it is what makes §7 insolvent |
| account `userStartingBalanceMin/MaxPence`, quiz bonus, stakes, ledger | account-level; no club country exists at the point they are granted |
| competition / tournament `prizePence`, `entryFeePerRound`, `stadiumPence` | server-authoritative cross-country competitions; no club country |
| `ClubSaleValuationService` | valuation of a user's club for sale — not the in-game economy |
| `signOnFeePercentMin/Max` | a percentage of a wage — inherits the scaled wage |
| `earlyTerminationFee` | derived from the sponsor deal, which scales |
| `playerFeeMultiplier` (5,000,000) | legacy; live fee is wage-derived (§5) |
| `clubFundingMinimumPence` | 0 = no floor |
| severance, buyouts, sell-on | app-side multiples of the stored wage — inherit it |
| `league.tv_deal` STORED cache | written by `syncTvDeal()` on an admin save. A cache written BEFORE this change holds the unscaled derivation for a factored country, so the gate's cache check will flag SC rows until they are re-saved. Never read by a device while a pool exists. |
| admin league editor + league export `tvPoolPence`, `parachute`, `*Override` | deliberately RAW: the authoring surface must show and round-trip what was authored |
| `WorldOverviewService` cache | admin overview, 1-hour TTL; shows scaled figures after the cache expires |
| staff ability band (`a818a60b`), DOF pot (app), stale scout write | out of scope by instruction |

## 9. Behaviour changes worth the owner's eye

1. **An explicit league prize / position-pot override is no longer "verbatim, no country factor".**
   It is a baseline-country figure. Measured: no live league holds a genuine hand-authored override
   (196 of 196 are cascaded copies of the tier default), so nothing hand-authored is moved; but the
   admin's per-league override field now means "baseline terms", and a future genuinely
   hand-authored Scottish override must be typed in England's terms.
2. **The backend now reads one key inside `parachute`** (`perSeasonPence`). `docs/api/economy-config.md`
   is amended.
3. **Gate check 6 now means the opposite of what it did.** It used to tell an operator to
   re-author a scaled TV table; doing that now would scale twice.
4. **The pool is authored once, in England's terms.** The admin's TIER DEFAULTS screen is unchanged;
   a pre-scaled per-country pool would be scaled twice (check 6 reports it).

## 10. Tests

Machine confirmed quiet first (the eight orphaned load processes were killed by the owner; top CPU
was macOS background work only; load average still decaying 4–5 at the start of both runs). Both
runs were alone, `--colors=never`, through Lando, same test DB, serially. Raw output:
`evidence/country-scaling/suite-c11c7f2d.txt` and `suite-a818a60b.txt`.

⚠️ **ONE TEST CASE HAD TO BE EXCLUDED FROM BOTH RUNS, and it is environmental.**
`AdminShellCoverageTest::testThePageIsOnTheRedesignedShell"admin_logs"` renders
`DashboardController::logs()`, which does `file($logPath)` on `var/log/dev.log`. That file is
**4,108,724,354 bytes** (last written 17:01, before this session) against a **3.828 GiB** Lando
container, so PHP is SIGKILLed (**exit 137**) at test ~189 and the suite dies with no summary.
Reproduced three times, and in that file alone. My change touches nothing on that path. I did not
delete or move the log (not mine). Both runs used `--exclude-filter admin_logs`; **PM decision
needed**: rotate `dev.log` (and the 2.1 GB `dev.log.2026-11-12.bak`), and consider capping the
read in `logs()`.

| | commit | collected/run | failures | errors | wall-clock |
|---|---|---|---|---|---|
| **BASELINE, measured here** | `a818a60b` (git archive, own autoloader — verified it resolves the OLD source) | **3,359** | 3 | 1 | 292 s (04:49.8) |
| **THIS CHANGE** | `c11c7f2d` | **3,366** | 3 | 1 | 301 s (04:57.6) |

**Reconciliation, exact: 3,359 + 7 = 3,366.**
`CountryScalingTest` +6 (new), `LeaguePayoutResolverTest` +2 (one test replaced by one, plus two
parachute tests: net +2), `EconomyTvCountryScalingGuardTest` −1 (8 tests → 7). 6 + 2 − 1 = **+7**. ✅

**The three known failures, confirmed BY NAME, identical in both runs:**
1. `NotificationLogCrudControllerTest::testIndexRowIsClickableToADetailPageShowingTheFullPayload`
2. `CompetitionControllerTest::testShowIncludesResultsOnceRoundsAreProcessed`
3. `FriendlyResolveSingleMatchTest::testResolvingAnAcceptedChallengeRecordsAFullResult`

**The one error, in both runs, attributed:** `LeaderboardHallOfFameTest` — baseline
`::testSyncAllClubsMirrorsTheScoreOntoTheClub`, mine `::testTitlesProduceATierWeightedScoreOnTheLeaderboard`
(a different method each time). `UniqueConstraintViolation uq_league_country_tier, Key (country,
tier)=(AE, 4)`. The test draws `randomCountryCode()`; `wunderkind_test` holds a leaked
`league(AE, 4, "Idem Test Tier 4")` created 2026-11-17 09:28 by
`LeagueServiceConcludeSeasonIdempotencyTest`, and the draw collided with it. It passes alone
(4/4). It is a **pre-existing random collision** that fails a different method each run, not
something this change adds — and it was present at baseline. Cleaning the leaked row would remove it.

⚠️ **The pinned baseline does NOT reproduce.** The brief and the standing notes pin **3,290 at
`a818a60b`**; measured here, `a818a60b` runs **3,359**. I do not know the cause of the 69-test gap
(a different counting convention, or a different checkout state when 3,290 was taken). Reconciling
against 3,290 would have shown a spurious +76, which is why the baseline was re-measured at the
same commit rather than trusted. **Whoever owns that figure should re-check it.**

Not run: the app suite (nothing in the app repo changed; `gameConfig.ts`'s "do not publish the
factor" guard is unaffected).
