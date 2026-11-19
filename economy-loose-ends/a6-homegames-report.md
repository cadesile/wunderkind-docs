<!-- STATUS --> **STATUS:** ✅ A6 — home games from the division size. DEPLOYED. ⚠️ Its §6 severity claim was later OVERTURNED by A8 — see that report.

---

# A6 REPORT — stop wiring finances to club counts (the gate, and four more sites)

**Branch `new-game-save`, app only, on top of `b8842812`. Committed, NOT pushed.**
Date: **2026-11-19**. Working tree was clean at start and in sync with `origin/new-game-save`.

```
$ git log --oneline -1 && git status --porcelain && git rev-parse HEAD origin/new-game-save
b8842812 Sample the wage ladder across the tier's own band, not a fixed array
b8842812768c1409ab4e644d184d606cffa33560
b8842812768c1409ab4e644d184d606cffa33560
```

**Commit: `3300fcd1`** on `new-game-save` (not pushed). §13 has the file list.

---

## 0. TL;DR, in the order it matters

1. **The off-by-one is real, fixed, and tested.** Both gates and `flows.ts` now read the
   division's **authored** size and subtract one, through one new helper
   (`homeGamesForLeague`, `src/economy/harness/worldExport.ts`). `WorldExportLeague` declares
   `slots`, which the backend had been emitting all along.
2. **COVERAGE moved, exactly as §4's mechanism predicts** — tiers 1–7 down, tier 8 byte-identical.
   Measured Δ matches predicted Δ (`−matchdayShare / divisionSize`) to within 0.1 point at all
   eight tiers, on two independent input sets. ⚠️ **§4's ABSOLUTE table is not reproducible any
   more** and that is not the fix's doing — §4.2 has the evidence.
3. 🔴 **§5's measurement, which is the owner's decision.** Correcting
   `SeasonBudgetService.ts:526` cuts every NPC club's **season wage budget by 24–30% in England
   and 26–37% in Scotland**. Full per-tier table at §5. Not changed.
4. 🔴 **`PricingPane.tsx:183` WAS a real defect, and worse than the brief suspected.** The `+1`
   is right; the halving is a single-round-robin leftover. It quoted **exactly half** the
   season-ticket price pre-fixtures. Fixed and pinned.
5. 🔴 **THREE MORE SITES, newly found, not in the ruling's inventory**, carrying the identical
   halved fallback — and **two of them book real money**:
   `SeasonTransitionService.ts:1656` (every NPC club's season tickets at world init) and
   `:2499` (the player's own club's), plus `FinancialProjectionService.ts:222`. **Not changed**
   — out of this brief's scope, and two are the same class of real-money decision as §5. §6 has
   them in full. **This is the most important thing in this report after §5.**
6. 🔴 **SCOTLAND'S TV MONEY IS PAID TO NOBODY, and it is live right now.** Found from a device
   reading taken mid-task. Scotland authors 14 slots against **12** actual club rows at every
   tier; TV is divided by the authored 14 and paid to the 12 that exist, so each club gets
   **85.7% of its due (14.3% short)**, and **the sum of what a division's clubs credit themselves
   falls short of the authored pool** — £714,285.80 at tier 7, **£86,600,000.36 across the eight
   tiers per season**, against **£0.00 in England.** §7c. Nothing in A6 touches it; A7 is the right
   instrument and this is its first catch.
7. ⚠️ **So on Scotland this fix moves the gate UP, not down, and at SC tier 8 it makes a number
   worse** (exactly right → 2 high). Stated plainly in §7a. **But the formula is settled on its
   merits and `rows − 1` is NOT the better input**: at EN tier 8 `rows − 1` gives 14 against a
   true 15, breaking precisely where the reserved amp place lives. `slots − 1` is the only
   formula correct in England at all eight tiers. §7b. **Scotland stays 2 high until the authored
   14 is reconciled — the owner's decision, not a defect in this change.**
8. 🔴 **HEADLINE: Scotland has never been gate-measured and cannot be.** Every COVERAGE figure and
   every authored dial in this project comes from England alone, while Scotland is the country the
   owner tests on, the harsher case at every wired site, and the only one with authored-vs-actual
   drift. One authenticated `GET /api/game-config?country=SC` unblocks the whole gate suite. §7d.

A fresh post-migration export arrived mid-task and was used throughout — §1.

---

## 1. The export situation — §0's uncertainty is CLEARED

The brief's §0 said every export on this machine predated the slots migration and told me to
patch one. **A fresh export landed while I was working** and I used it instead:

`/Users/courtneyadesile/Downloads/wunderkind-world-2026-11-19.json` — `exportedAt
2026-11-19T14:15:29+00:00`, 200 leagues, 3,175 clubs. **`dials/patch.mjs`'s EN=16 patch was not
needed and was not used.** Verified myself rather than taken on trust:

```
$ node -e '…'   # authored slots vs actual club rows, per tier
-- EN
  t1 slots=16 rows=16 tvDeal=1875000000 tvDealOverride=1666666666 sponsorCount=6
  t2 slots=16 rows=16 tvDeal=875000000 tvDealOverride=777777777 sponsorCount=5
  t3 slots=16 rows=16 tvDeal=437500000 tvDealOverride=388888888 sponsorCount=5
  t4 slots=16 rows=16 tvDeal=312500000 tvDealOverride=277777777 sponsorCount=4
  t5 slots=16 rows=16 tvDeal=187500000 tvDealOverride=166666666 sponsorCount=4
  t6 slots=16 rows=16 tvDeal=62500000 tvDealOverride=55555555 sponsorCount=4
  t7 slots=16 rows=16 tvDeal=31250000 tvDealOverride=27777777 sponsorCount=3
  t8 slots=16 rows=15 tvDeal=7500000 tvDealOverride=6666666 sponsorCount=3
-- SC
  t1 slots=14 rows=12 tvDeal=2142857142 tvDealOverride=1666666666 sponsorCount=6
  t2 slots=14 rows=12 tvDeal=1000000000 tvDealOverride=777777777 sponsorCount=5
  t3 slots=14 rows=12 tvDeal=500000000 tvDealOverride=388888888 sponsorCount=5
  t4 slots=14 rows=12 tvDeal=357142857 tvDealOverride=277777777 sponsorCount=4
  t5 slots=14 rows=12 tvDeal=214285714 tvDealOverride=214285714 sponsorCount=4
  t6 slots=14 rows=12 tvDeal=71428571 tvDealOverride=71428571 sponsorCount=4
  t7 slots=14 rows=12 tvDeal=35714285 tvDealOverride=35714285 sponsorCount=3
  t8 slots=14 rows=11 tvDeal=8571428 tvDealOverride=8571428 sponsorCount=3
leagues with slots falsy: 0
```

**Confirmed, from the file:**

- **EN = 16 at all eight tiers.** §0's gate is cleared. The live box's value is no longer
  unconfirmed from the app side — this export is the app-side confirmation.
- **SC = 14 at all eight tiers**, including 5–8. The brief's "SC tiers 1–4" is superseded, and
  the old "SC slots = 3" reading was a development-clone artefact, never true here.
- **`slots = 0` appears on 0 of 200 leagues.** So **the deriving fallback is exercised by no
  real data at all.** Its test is a unit test against a synthetic league and nothing else; I am
  not claiming otherwise.
- **The reserved amp place is present at the deepest tier in all four countries I printed** —
  rows are exactly `slots − 1` at tier 8 (EN 15/16, SC 11/14 → see §7, KR 9/10, FR 19/20) and
  `slots` at tiers 1–7, except in Scotland where they are 12 against 14 everywhere.
- **I read `tvDeal`, never `tvDealOverride`.** The override's staleness (EN t1 holds the
  pre-correction 18-way 1,666,666,666) is visible in the dump above, is a backend defect queued
  as A7, and did not enter any figure in this report.

**Scope: England and Scotland only.** KR and FR appear once, above, purely as corroboration that
the reserved-place pattern is not an EN quirk. They are measured nowhere and recommended nowhere.

---

## 2. The defect, confirmed from the generator rather than from the brief

`src/utils/fixtureGenerator.ts`'s `generateRoundRobin`, read in full: it builds `firstLeg` over
`numRounds = n − 1` rounds by the circle method, then

```ts
const secondLeg: GeneratedFixture[] = firstLeg.map((f) => ({
  round: f.round + numRounds,
  homeClubId: f.awayClubId,
  awayClubId: f.homeClubId,
}));
```

Every first-leg fixture is mirrored, so each club meets each other club **once at home**:
**home games = participants − 1**, for every size, with or without the odd-count `'bye'`.

This is now pinned against the generator itself rather than against a number —
`src/__tests__/utils/seasonTickets.test.ts` generates real round-robins at sizes 10/13/14/16/17/20
and asserts every club's home count equals `size − 1`.

**What the gate read instead.** `scripts/economy/variantGate.ts:274` and
`dispersionGate.ts:146`, identically:

```ts
const homeGames = clubCount > 0 ? clubCount : HOME_GAMES;
```

`clubCount` is `cs.length` in `groundsByTier` — the export's **club rows**. So:

| | EN t1–t7 | EN t8 | SC t1–t7 | SC t8 |
|---|---|---|---|---|
| authored `slots` | 16 | 16 | 14 | 14 |
| club rows (`clubCount`) | 16 | 15 | 12 | 11 |
| the gate read | **16** | **15** | **12** | **11** |
| truth (`slots − 1`) | **15** | **15** | **13** | **13** |

⚠️ **Exactly right at tier 8 and nowhere else** — the deepest tier is the one place the rows
already sit one short, because world generation leaves the player a place. That is why a
seven-tier error survived: `clubCount` is correct precisely where anyone would check it.

---

## 3. The change

### 3a. One helper owns the rule

`homeGamesForLeague(league, clubCount, fallback)` in `src/economy/harness/worldExport.ts`:

```ts
export function homeGamesForLeague(
  league: Pick<WorldExportLeague, 'slots'> | null | undefined,
  clubCount: number,
  fallback: number,
): number {
  const slots = league?.slots ?? 0;
  if (slots > 1) return slots - 1;
  if (clubCount > 1) return clubCount - 1;
  return fallback;
}
```

`WorldExportLeague` now declares `slots?: number | null`. It was being emitted all along; nothing
declared it, which is the whole reason three harnesses counted rows instead.

### 3b. The fallback chain, and the choice the brief asked me to state

**`slots − 1` → `rows − 1` → `HOME_GAMES` (23).**

- **`slots − 1`** is the ruling's DERIVED state and the only one that survives a cache regen.
- **`rows − 1`** when nothing is authored. ⚠️ **No `+1` is re-added for the deepest tier anywhere**
  — the reserved place belongs to the box that generated the export, not to the game, and the
  brief's evidence (CA, JP, NG, PL, US, SC holding the same count at every tier on the
  development clone) says the assumption is false in general. In the one country here where rows
  and slots disagree (SC), the authored number still wins; see §7.
- **`HOME_GAMES = 23` stays as the last resort**, reached only when a league authors no size AND
  carries fewer than two rows. **For the record: 23 corresponds to a 24-club division and matches
  nothing on either box** — England authors 16, Scotland 14. Its docblock now says so in all
  three scripts, in place of the old note that called `clubCount` "the real figure".

### 3c. `flows.ts`

`const HOME_GAMES = 23` passed straight through at `:104` and `:163` and `:249`. The world export
was being loaded 160 lines later, at section M, so the load moved **up** to just after the
constant and `homeGamesFor(tier)` replaces the constant at all three call sites. Section M now
reuses the already-loaded `world`/`grounds`/`fin` instead of re-reading and re-parsing a 6.7 MB
file. Behaviour with no `--world` is unchanged: `homeGamesFor` returns 23.

### 3d. `new-game-setup/economy.ts` — `homeGames: 23` → **16**, pinned

This is the one that moves money the player commits. It is **16**, not 15, and the reasoning
matters because it is the one correction here that is *consistent rather than correct*:

**Nothing published reaches that screen.** I checked both payloads the setup host reads:
`economyTierBaseline` exposes `country, source, tierCount, sponsorBandsPence, wageModel,
weeksPerSeason, wageCurveExponentBp, reputationSpreadBp, wageScaleUnit, tiers`, and
`EconomyTierRow` carries `tier, turnoverPence, wageScaleMicroPence, resolvable,
youthScholarshipPence, sponsorBandsPence, ticketPricePence` — **no division size**.
`starter-config.economy` carries none either (`wageModel`…`positionPotTierRatioPpm`; I printed
the whole block). `LeagueSnapshot.clubCount` *is* the authored `slots`, but it does not exist
during setup — the world is not initialised yet, and it is absent from the cached world-pack
league block in any case.

So it follows its two neighbours' established pattern exactly: a **literal**, because
`contract.test.ts` holds that module to type-imports only, **pinned in `economy.test.ts` against
its real source** — and the real source available is the app's own answer for an unpublished
division. That is now stated once, in `src/utils/seasonTickets.ts`:

```ts
export function homeGamesForDivisionSize(divisionSize: number): number {
  return Math.max(0, Math.round(divisionSize) - 1);
}
export const FALLBACK_DIVISION_SIZE = 17;
```

17 = the 16 club rows + the player's club that every pre-fixture fallback in the app already
assumed. So `homeGames` is `homeGamesForDivisionSize(FALLBACK_DIVISION_SIZE)` = **16**, asserted
in `economy.test.ts`, which makes FUND YOUR CLUB and the Finances screen agree in the same
sitting — the exact class of divergence the `ticketPricePence` (1500 vs 2500) and
`seasonTicketHolderPercent` (60 vs 70) comments beside it were written for.

**Honest accounting of what that buys.** 23 → 16 takes the overstatement from **+53% to +6.7% for
England** and from **+77% to +23% for Scotland**. It does not reach zero, and it cannot while no
size is published. ⚠️ **The real fix is a backend one-liner**: publish `slots` on
`economyTierBaseline.tiers[]`, beside the per-tier ticket price the same screen already reads, and
`useSetupHost` wires it in one line the way it wires `ticketPricePence`. Both the constant's
docblock and the test say to delete them when that lands. **Recommended as a small addition to
A7**, which is already in that file.

### 3e. `PricingPane.tsx:183` — VERIFIED as a real defect, and fixed

The brief asked me to establish what `league.clubs` holds before touching this. I did, from all
three writers:

| writer | what it puts in `league.clubs` |
|---|---|
| `worldStore.ts:762` | `bottomLeague.clubIds.map(...)` — NPC clubs only |
| `syncQueue.ts:306` / `syncMutations.ts:55` | `worldLeague.clubIds.flatMap(...)` — NPC clubs only |
| `SeasonTransitionService.buildLeagueSnapshot:640` | `seasonLeague.clubs.filter((slim) => !slim.isAmp)` — **explicitly excludes the player** |

and `fixtureStore.ts` prepends the player to that same list before generating:

```ts
const participants = ampClubId ? [ampClubId, ...league.clubIds] : [...league.clubIds];
const generated = generateRoundRobin(participants);
```

**So the `+1` is correct and the halving is not.** `participants = clubs.length + 1`, and a double
round-robin gives `participants − 1` home games — i.e. `clubs.length`. The old expression returned
`Math.floor(clubs.length / 2)`: **exactly half**, and `calculateSeasonTicketPrice` is linear in
`homeGames`, so **the season-ticket price quoted before fixtures are drawn was half what the
season actually costs.** At 16 club rows it read 8 where the truth is 16.

Fixed to route through `homeGamesForDivisionSize`, with the live `countHomeGames` path untouched
above it. Pinned by `src/__tests__/components/pricingPaneHomeGames.test.ts`.

⚠️ **I deliberately did NOT read the authored `league.clubCount` here**, and the reason is in the
code comment: this fallback only ever runs pre-fixtures, which is exactly the state where
`clubCount` is absent (it is not on the cached world-pack league block), and where both exist it
is the participant list — not the authored number — that the fixtures and therefore every later
`countHomeGames` reading are built from. Reading `slots` here would make the quoted price
disagree with the fixtures drawn thirty seconds later in Scotland, where the two differ by 2.

---

## 4. ⚠️ COVERAGE MOVED — and §4's absolute table is no longer reproducible

### 4.1 The measured movement, on the live config + the fresh export

The plain gate command, before and after the change, same inputs both times:

```
$ npx tsx scripts/economy/variantGate.ts --export game-config-en.LIVE.json \
    --starter-config starter-config.LIVE.json --world <2026-11-19 export> --country EN
```

```
$ diff <(coverage block, BEFORE) <(coverage block, AFTER)
2,8c2,8
<   1  |  41.1% |     9.0% |   4.9% |      8.6% |       17.2% |   0.0% |    21.9% || 102.8%
<   2  |  29.5% |    19.4% |   5.9% |      8.7% |       14.5% |   0.0% |    50.9% || 128.8%  <-- outside 85-110%
<   3  |  20.6% |    23.3% |  11.5% |      6.5% |       16.2% |   0.0% |   104.8% || 182.8%  <-- outside 85-110%
<   4  |  14.4% |    30.6% |  10.2% |      7.1% |       14.1% |   0.0% |   105.1% || 181.5%  <-- outside 85-110%
<   5  |  10.6% |    36.5% |  12.1% |      4.7% |        9.4% |   0.0% |    99.1% || 172.3%  <-- outside 85-110%
<   6  |   7.0% |    76.3% |  12.1% |      6.4% |       12.8% |   0.0% |   234.6% || 349.2%  <-- outside 85-110%
<   7  |   4.2% |    40.4% |  15.2% |      7.5% |       11.2% |   0.0% |   528.7% || 607.2%  <-- outside 85-110%
---
>   1  |  41.1% |     8.4% |   4.9% |      8.6% |       17.2% |   0.0% |    21.9% || 102.2%
>   2  |  29.5% |    18.2% |   5.9% |      8.7% |       14.5% |   0.0% |    50.9% || 127.6%  <-- outside 85-110%
>   3  |  20.6% |    21.8% |  11.5% |      6.5% |       16.2% |   0.0% |   104.8% || 181.3%  <-- outside 85-110%
>   4  |  14.4% |    28.6% |  10.2% |      7.1% |       14.1% |   0.0% |   105.1% || 179.6%  <-- outside 85-110%
>   5  |  10.6% |    34.2% |  12.1% |      4.7% |        9.4% |   0.0% |    99.1% || 170.1%  <-- outside 85-110%
>   6  |   7.0% |    71.6% |  12.1% |      6.4% |       12.8% |   0.0% |   234.6% || 344.4%  <-- outside 85-110%
>   7  |   4.2% |    37.9% |  15.2% |      7.5% |       11.2% |   0.0% |   528.7% || 604.7%  <-- outside 85-110%
```

**Tier 8 does not appear in the diff at all.** It is byte-identical, which is the signature the
fix predicts and the single best evidence that it is right: tier 8 is the one tier where the rows
already equalled `slots − 1`.

### 4.2 ⚠️ §4's absolute table cannot be reproduced, and the fix is not why

§4's figures come from `dials/runs/cand-c-authorable`, whose matchday shares (12.4 / 27.9 / 32.1 /
42.3 / 52.5 / 68.1 / 51.1 / 72.8) I confirmed match that run's stored `gate.txt` exactly. I
reproduced that run's dials verbatim (`--exclude 7:$NINE,8:$NINE --stand-band 7:0-1,8:0-1
--wage-scale-follow --turnover 28800000000,…,36100000`) and got a different baseline. **Two of the
run's three inputs have been re-captured since it was taken on 2026-11-18 at 15:41:**

| input | at cand-c-authorable | now |
|---|---|---|
| `game-config-en.LIVE.json` | pre-21:37 capture | re-captured 2026-11-18 21:37; turnover t1 33,100,000,000 vs the run's authored 28,800,000,000 |
| world export | `world.json`, 2026-11-18 22:00 — EN t1 `tvDeal` **13,600,000,000**, `prizeMoney`/`leaguePositionPot` **null** | 2026-11-19 14:15 — EN t1 `tvDeal` **1,875,000,000**, prize and pot **authored** |

The export's tier-1 `tvDeal` fell 7.25×, and the gate's `RESCALE = liveTv1 / exportTv1` multiplies
prize and position money by it — so the position-money column moves from 2.6% of turnover to
18.7%, which is most of the absolute difference. **A control run proves the harness and not the
fix**: the same dials against the OLD `world.json` give 95.1 / 92.4 / 92.0 / 89.3 / 85.0 / 84.9 /
87.3 / 82.3, which is not 97.6/97.5 either.

**So I did not stop, and here is why that is the right call.** The brief's stop condition is for
when the table and the fix disagree about the same inputs. They do not: the inputs moved under
both of us, for reasons that are visible in the files and have nothing to do with home games.
What §4 actually asserts is a **mechanism** — `ΔCOVERAGE = −matchdayShare / divisionSize` — and
that is testable independently of any baseline. **It holds, on both input sets, at all eight
tiers:**

| tier | md share | predicted Δ | measured Δ | | md share | predicted Δ | measured Δ |
|---|---|---|---|---|---|---|---|
| | *(live config, §4.1)* | | | | *(cand-c dials, §4.3)* | | |
| 1 | 9.0% | −0.56 | **−0.6** | | 10.3% | −0.64 | **−0.7** |
| 2 | 19.4% | −1.21 | **−1.2** | | 22.2% | −1.39 | **−1.4** |
| 3 | 23.3% | −1.46 | **−1.5** | | 26.7% | −1.67 | **−1.6** |
| 4 | 30.6% | −1.91 | **−1.9** | | 35.1% | −2.19 | **−2.2** |
| 5 | 36.5% | −2.28 | **−2.2** | | 42.0% | −2.63 | **−2.7** |
| 6 | 76.3% | −4.77 | **−4.8** | | 53.8% | −3.36 | **−3.3** |
| 7 | 40.4% | −2.53 | **−2.5** | | 40.9% | −2.56 | **−2.5** |
| 8 | 82.5% | **0** | **0.0** | | 57.5% | **0** | **0.0** |

Every tier agrees with the prediction to within 0.1 point, and every matchday line falls by
`15/16` = 6.25% exactly where it should. **§4's mechanism is confirmed; its absolute numbers are
stale through no fault of this change, and should not be carried forward as a baseline.**

### 4.3 The cand-c-authorable dials, re-run against the fresh export

Reproduced with the same script `dials/run.sh` uses, writing outside both repos.

```
### before-EN (EN)
tier |     TV | matchday |  shirt | club spon | league spon |  prize | position || COVERAGE
  1  |  47.2% |    10.3% |   5.7% |      9.9% |       19.8% |   0.0% |    18.7% || 111.6%  <-- outside 85-110%
  2  |  33.8% |    22.2% |   6.7% |     10.0% |       16.6% |   0.0% |    18.7% || 107.9%
  3  |  23.7% |    26.7% |  13.2% |      7.4% |       18.6% |   0.0% |    18.7% || 108.2%
  4  |  16.6% |    35.1% |  11.7% |      8.1% |       16.2% |   0.0% |    18.7% || 106.5%
  5  |  12.2% |    42.0% |  13.9% |      5.4% |       10.8% |   0.0% |    18.7% || 103.0%
  6  |   4.9% |    53.8% |   8.6% |      4.5% |        9.0% |   0.0% |    18.7% ||  99.3%
  7  |   4.9% |    40.9% |  17.4% |      8.6% |       12.9% |   0.0% |    18.7% || 103.3%
  8  |   1.4% |    57.5% |  10.8% |      4.0% |        6.0% |   0.0% |    18.7% ||  98.4%

  COVERAGE outside 85-110%: 1

### after-EN (EN)
tier |     TV | matchday |  shirt | club spon | league spon |  prize | position || COVERAGE
  1  |  47.2% |     9.7% |   5.7% |      9.9% |       19.8% |   0.0% |    18.7% || 110.9%  <-- outside 85-110%
  2  |  33.8% |    20.8% |   6.7% |     10.0% |       16.6% |   0.0% |    18.7% || 106.5%
  3  |  23.7% |    25.1% |  13.2% |      7.4% |       18.6% |   0.0% |    18.7% || 106.6%
  4  |  16.6% |    32.9% |  11.7% |      8.1% |       16.2% |   0.0% |    18.7% || 104.3%
  5  |  12.2% |    39.3% |  13.9% |      5.4% |       10.8% |   0.0% |    18.7% || 100.3%
  6  |   4.9% |    50.4% |   8.6% |      4.5% |        9.0% |   0.0% |    18.7% ||  96.0%
  7  |   4.9% |    38.3% |  17.4% |      8.6% |       12.9% |   0.0% |    18.7% || 100.8%
  8  |   1.4% |    57.5% |  10.8% |      4.0% |        6.0% |   0.0% |    18.7% ||  98.4%

  COVERAGE outside 85-110%: 1
```

**The verdict does not change on either input set: `VARIANT GATE: PASS`, "insolvent once FLIPPED:
none", both before and after. I relaxed no check and edited no band.** The out-of-band tier 1 in
this pair is the stale-dials artefact described in §4.2, present identically before and after.

**The flatness finding stands and is now sharper.** §4 predicted a tilt sloping with matchday
share; measured, the spread across tiers 1–7 widens from 12.3 points to 14.9 on these dials, and
every single movement is in the same direction with magnitude proportional to matchday share. The
argument for landing A6 before any further turnover re-derivation is unchanged and, if anything,
better supported: a re-derivation taken now would be tuned against a matchday line **6.25% too
generous at seven of England's eight tiers** — and, from §7, **8.3% too mean at seven of
Scotland's**, in the opposite direction.

### 4.4 ⚠️ Scotland's gate cannot be run — promoted to §7d

Not a limitation of this task's verification but a standing gap in the project's calibration, so it
is written up as a headline finding in **§7d**: no Scottish COVERAGE figure has ever existed, the
harness refuses to invent one, and one authenticated `GET /api/game-config?country=SC` is all it
takes. **§4's instruction to measure Scotland's COVERAGE cannot be satisfied from the app side.**
§5 is where Scotland IS measured, and it needs no such export.

---

## 5. 🔴 `SeasonBudgetService.ts:526` — MEASURED, NOT CHANGED. This is the owner's decision.

**Unchanged in the commit.** `git diff` touches neither `SeasonBudgetService.ts` nor `GameLoop.ts`.

### 5a. What it does today

```ts
const weeks = weeksPerSeason(club.tier ?? 8);
// Half a club's fixtures are at home. Derived from the season rather than the tick's
// hardcoded 23 so a tier whose season is not 46 weeks still gets a coherent split.
const homeGames = Math.max(1, Math.round(weeks / 2));
```

At the authored 46 weeks that is **23**. It feeds `npcWeeklyIncomePence` → `deriveClubBudget`,
which sets every NPC club's **season wage budget** (`wageSharePence` = 60% of season income) and,
through `snapNpcStaffWages`, its staff pay. The comment's reasoning is internally coherent and
still wrong: **a season length cannot tell you a division size**, and `weeksPerSeason` is config
that has no relationship to `slots`.

| | England | Scotland |
|---|---|---|
| authored `slots` | 16 | 14 |
| true home games | **15** | **13** |
| what it reads | 23 | 23 |
| overstatement | **+53.3%** | **+76.9%** |
| matchday component if corrected | **−34.8%** | **−43.5%** |

Those four figures are exact and config-independent — they are pure ratios `(slots−1)/23`.

### 5b. What correcting it would do to real NPC budgets

Measured with the live engine functions (`computeMatchdayRevenue`, `advisedTicketPricePence`,
`recommendPricing`, `getClubReputationTier`, `calculateFacilityUpkeep`, `npcWeeklyIncomePence`,
`deriveClubBudget`) over **every real NPC club in the 2026-11-19 export**, per tier, mean per club:

```
SeasonBudgetService NPC bootstrap — EN, weeksPerSeason 46
  WIRED  homeGames = max(1, round(weeks / 2)) = 23
  sponsorPence = 0 and investorPence = 0 (a world export carries neither), so the
  ABSOLUTE budgets below are FLOORS and the % change is an UPPER BOUND on the real one.

tier | slots | n  | matchday/game (mean) |   budget NOW |  budget at size-1 |      delta |    delta%
  1  |    16 | 16 |           £2,408,804 |  £44,491,489 |       £32,929,232 | £-11,562,257 |   -26.0%
  2  |    16 | 16 |           £1,518,857 |  £26,210,232 |       £18,919,717 | £-7,290,516 |   -27.8%
  3  |    16 | 16 |             £639,891 |  £11,455,491 |        £8,384,016 | £-3,071,475 |   -26.8%
  4  |    16 | 16 |             £502,197 |   £8,805,321 |        £6,394,774 | £-2,410,546 |   -27.4%
  5  |    16 | 16 |             £246,593 |   £4,527,989 |        £3,344,340 | £-1,183,648 |   -26.1%
  6  |    16 | 16 |             £156,757 |   £2,538,243 |        £1,785,811 |  £-752,432 |   -29.6%
  7  |    16 | 16 |              £29,088 |     £588,914 |          £449,292 |  £-139,622 |   -23.7%
  8  |    16 | 15 |              £13,720 |     £234,342 |          £168,484 |   £-65,858 |   -28.1%
```

```
SeasonBudgetService NPC bootstrap — SC, weeksPerSeason 46
  WIRED  homeGames = max(1, round(weeks / 2)) = 23

tier | slots | n  | matchday/game (mean) |   budget NOW |  budget at size-1 |      delta |    delta%
  1  |    14 | 12 |           £2,409,198 |  £46,104,072 |       £31,648,886 | £-14,455,187 |   -31.4%
  2  |    14 | 12 |           £1,620,857 |  £28,367,822 |       £18,642,682 | £-9,725,140 |   -34.3%
  3  |    14 | 12 |             £615,334 |  £11,491,606 |        £7,799,603 | £-3,692,003 |   -32.1%
  4  |    14 | 12 |             £492,709 |   £8,942,234 |        £5,985,983 | £-2,956,251 |   -33.1%
  5  |    14 | 12 |             £243,334 |   £4,643,719 |        £3,183,717 | £-1,460,002 |   -31.4%
  6  |    14 | 12 |             £161,994 |   £2,664,084 |        £1,692,122 |  £-971,962 |   -36.5%
  7  |    14 | 12 |              £23,479 |     £538,291 |          £397,419 |  £-140,872 |   -26.2%
  8  |    14 | 11 |              £15,560 |     £266,159 |          £172,798 |   £-93,361 |   -35.1%
```

**England: every NPC club's season wage budget falls 24–30%. Scotland: 26–37%.** That is the
economic change, and it is the owner's to make or refuse.

⚠️ **Four caveats, all of which make the table a bound rather than a point estimate.** Stated
because a decision taken off an unqualified number is worse than one taken off a qualified one.

1. **`sponsorPence` and investor income are 0** — a world export carries neither contract list.
   Real income is higher, so the **absolute budgets are floors** and the **percentages are upper
   bounds** on the real fall. The real fall is smaller in proportion to how much of an NPC's
   income is sponsorship.
2. **`projectedWagePence` is 0**, for the same reason (no squads in an export), so
   `wageSharePence` is reported rather than `wageReservationPence`. That is the right column
   anyway: the reservation is `max(share, committed wage)`, and the wage floor does not move — so
   correcting this can only make `overCommitted` **more** common, never less. A club already
   paying more than 60% of a 23-game income would simply be flagged.
3. **Scotland's absolute £ figures are priced through the EN-resolved config** (the only one on
   this machine, §4.4), because `advisedTicketPricePence` reads the published per-tier price. Its
   **delta percentages are the trustworthy part**; read its absolute columns as indicative. The
   exact, config-free Scottish figure is the **−43.5%** matchday component in §5a.
4. **`computeNpcMatchdayIncome` and `computeNpcFacilityUpkeep` were reproduced, not imported.**
   `src/utils/npcFinances.ts` imports `useFanStore`, which pulls react-native into the chain and
   tsx cannot transform it (`react-native/index.js:27 ERROR: Unexpected "typeof"`). The
   reproduction calls the same five functions with the same arguments and fan morale 60, which is
   `npcFinances`' own default (`getFanState(id)?.morale ?? 60`) and what any export-only run would
   read regardless. The measurement script is in my scratchpad and is not committed.

### 5c. `GameLoop.ts:1520` — mentioned for completeness, left alone

```ts
// A season is 46 playing weeks and half a club's fixtures are at home. Both are used ONLY to
// spread seasonal money across the season for the verdict — no money moves through them.
const NPC_WEEKS_PER_SEASON = 46;
const NPC_HOME_GAMES_PER_SEASON = 23;
```

Verified at the call site (`:1933`): it feeds `npcWeeklyIncomePence` → `npcWeeksRunway` → the
solvency band on the `NpcClubSnapshot`. **The comment is accurate that no ledger entry is written
through it.** One precision worth adding, because it is the reason this is not *quite* harmless:
the band it produces drives the NPC brain's decisions, so a 53% (England) / 77% (Scotland)
overstatement of income makes every NPC club read **healthier than it is** — fewer sales, fewer
folds, more signings waved through. No money moves; behaviour does.

⚠️ It also hardcodes `NPC_WEEKS_PER_SEASON = 46` where `SeasonBudgetService` reads the same figure
from config — so the two disagree the moment a tier's season length is authored away from 46.
Noted, not changed.

---

## 6. 🔴 THREE MORE SITES — found while verifying §3e, NOT in the ruling's inventory

This is the main thing this task turned up that nobody had. `PricingPane.tsx:183`'s halved
fallback is **not unique** — the same expression appears at three more places, and **two of them
book real money**. Found by grepping the derivation rather than the literal.

| site | expression | what it decides | money? |
|---|---|---|---|
| `src/engine/SeasonTransitionService.ts:1656` | `countHomeGames(...) \|\| Math.floor(((leagueSizeById.get(id) ?? 17) - 1) / 2)` | **every NPC club's season-ticket revenue**, credited to its balance and written to the ledger at world init | 🔴 **YES** |
| `src/engine/SeasonTransitionService.ts:2499` | `countHomeGames(...) \|\| Math.floor((((league?.clubs?.length ?? 16) + 1) - 1) / 2)` | **the player's own club's** season-ticket booking (`bookSeasonTicketSales`) | 🔴 **YES** |
| `src/engine/FinancialProjectionService.ts:222` | `Math.floor((numClubs - 1) / 2)`, with the comment *"round-robin gives (n-1) games total, half at home"* | the Finances projection shown to the player | no |

**All three are the same single-round-robin assumption**, and `FinancialProjectionService`'s own
comment states it out loud, which is how I found the family. In each case the primary path is
`countHomeGames` — the ruling's ✅ COUNTED pattern, correctly used — and only the `||` fallback is
wrong. ⚠️ **Note what that means for the ruling's inventory: it cites `SeasonTransitionService.ts:1655`
and `:2498` as the reference implementation for COUNTED. Lines 1655 and 2498 are indeed correct.
Lines 1656 and 2499 are the defect.** The two sit on consecutive lines of the same statement.

**How often does the fallback fire?** At **world init**, which is precisely when season-1 tickets
are booked — `:1655`'s own comment says so: *"Fixtures may already be generated at init; fall back
to a league-size home-game estimate when they aren't."* So this is not a rare branch; it is the
season-1 path whenever the booking runs before fixtures.

**Magnitude:** `Math.floor(size / 2)` against `size − 1` is **half**, so season-1 season-ticket
revenue is roughly **half** what a full season of home games is worth — for every NPC club in the
world and for the player's club.

⚠️ **NOT CHANGED, deliberately.** Two of the three move real money, which puts them in exactly the
category §5 reserves for the owner, and none is named in this brief. `SeasonTransitionService.test.ts:1662`
also *pins the current behaviour* (`// no league object → homeGames falls back to floor(((16+1)-1)/2) = 8
in every test`), so correcting it is a test-expectations change as well as an economic one.

🔴 **Recommended as A6b, and it should rank above the rest of the queue**: it is the same defect
class as A6, at twice the magnitude, on the real-money path, with the fix already written and
tested (`homeGamesForDivisionSize`) and the three call sites named. **One of them affects the
player's own club directly.** `src/__tests__/components/pricingPaneHomeGames.test.ts` names all
three in its header so whoever takes A6b finds them.

⚠️ **And the guard's own limitation, stated because this project has been bitten by it before:**
that test reads `PricingPane.tsx` and only `PricingPane.tsx`. A source-reading test protects
exactly the files it names — the lesson of the cohesion guard, which read `MoralePane.tsx` while
`AssistantScreen.tsx` broke the same rule for as long as the guard existed. **Whoever fixes a
sibling site must add it to that file in the same change.**

---

## 7. ⚠️ Scotland — measured against the device, and the formula question settled

**Revised 2026-11-19 after a device reading.** The owner's device showed Scotland tier 7 as a
**12-club** table paying a TV deal of **£357,143**, which is `£5,000,000 ÷ 14`. That is the
authored `slots`, not the division that exists. It put this task's core premise — that `slots` is
a trustworthy *input* — in doubt, so I measured it before anything else landed. The formula
(`size − 1`) and the input (`slots`) are separate claims and the brief conflated them.

### 7a. `slots` vs actual club ROWS, both countries, all eight tiers

Read through `groundsByTier()` → `clubCount`, which is the gate's own input, and
`leagueFinancials()` → `slots`. `participants` accounts for `fixtureStore` prepending `ampClubId`
**for the amp league only** — the deepest tier, where every new game starts. `TRUE = participants − 1`.

```
=== EN === (deepest tier = 8, the player's starting division)
tier | slots | rows | drift | OLD code | NEW code | participants | TRUE | OLD err | NEW err
  1  |    16 |   16 |     0 |       16 |       15 |           16 |   15 |      +1 |      +0
  2  |    16 |   16 |     0 |       16 |       15 |           16 |   15 |      +1 |      +0
  3  |    16 |   16 |     0 |       16 |       15 |           16 |   15 |      +1 |      +0
  4  |    16 |   16 |     0 |       16 |       15 |           16 |   15 |      +1 |      +0
  5  |    16 |   16 |     0 |       16 |       15 |           16 |   15 |      +1 |      +0
  6  |    16 |   16 |     0 |       16 |       15 |           16 |   15 |      +1 |      +0
  7  |    16 |   16 |     0 |       16 |       15 |           16 |   15 |      +1 |      +0
  8  |    16 |   15 |     1 |       15 |       15 |           16 |   15 |      +0 |      +0

=== SC === (deepest tier = 8, the player's starting division)
tier | slots | rows | drift | OLD code | NEW code | participants | TRUE | OLD err | NEW err
  1  |    14 |   12 |     2 |       12 |       13 |           12 |   11 |      +1 |      +2
  2  |    14 |   12 |     2 |       12 |       13 |           12 |   11 |      +1 |      +2
  3  |    14 |   12 |     2 |       12 |       13 |           12 |   11 |      +1 |      +2
  4  |    14 |   12 |     2 |       12 |       13 |           12 |   11 |      +1 |      +2
  5  |    14 |   12 |     2 |       12 |       13 |           12 |   11 |      +1 |      +2
  6  |    14 |   12 |     2 |       12 |       13 |           12 |   11 |      +1 |      +2
  7  |    14 |   12 |     2 |       12 |       13 |           12 |   11 |      +1 |      +2
  8  |    14 |   11 |     3 |       11 |       13 |           12 |   11 |      +0 |      +2
```

**The drift is Scotland-only and uniform.** Two reading notes, both load-bearing:

- ⚠️ **The `1` at EN t8 is NOT drift** — it is the reserved amp place (15 rows in a 16-slot
  division; the player takes the 16th). `participants` is 16 and `TRUE` is 15, which `slots − 1`
  gives exactly. SC t8's `3` decomposes the same way: reservation 1 + real drift 2. **So Scotland's
  drift is a flat 2 in all eight divisions**, independent of the reservation rule.
- **The change is strictly better in England and strictly worse in Scotland.** England goes **+1 → 0
  at all eight tiers**. Scotland goes **+1 → +2** at tiers 1–7, and at **tier 8 — the division every
  Scottish new game starts in — from exactly right (11) to 2 high.** Stated plainly because it is
  the one place this change makes a number worse than it found it.

### 7b. 🟩 The formula is settled on its merits, and `rows − 1` is NOT the better input

The obvious response to 7a is "then read the rows, which match Scotland's fixtures". **It is wrong,
and the same table disproves it: at EN t8 `rows = 15` while the true division is 16, so `rows − 1`
gives 14 against a true 15.** `rows − 1` breaks precisely where the reservation lives — the
player's own starting division, in the country every COVERAGE figure to date was measured in.

**`slots − 1` is the only formula correct in England at all eight tiers, the reserved bottom tier
included.** That settles the formula question independently of Scotland, and it is why reverting to
a row count was never the answer. Three supporting reasons for keeping it:

1. **England goes +1 → 0 at every tier**, and England is where every measured COVERAGE number
   lives.
2. **Scotland's gate harm is currently unconsumable** — §7d: no Scottish COVERAGE number can be
   produced at all today, so a gate 2 high in Scotland is a theoretical harm.
3. **On the real-money sites it is a large net improvement even in Scotland.**
   `new-game-setup/economy.ts` goes from a wired **23** to **13** against a true 11 — still 2 high,
   but holding the whole change to avoid an **18%** residual error would leave a **109%** one in
   place.

### 7c. 🔴 What this exposes is bigger than A6: Scotland's TV model does not add up

**This is live on the owner's device and nothing in A6 touches it.** TV is divided by the authored
`slots` in **both** countries at every tier — confirmed from the export, with EN t8 as the clean
discriminator (£75,000 by slots vs £80,000 by rows; published £75,000). In England `slots` equals
the rows, so it is harmless. In Scotland it is not.

⚠️ **Stated precisely, because the obvious objection has to survive.** Nobody distributes the pool.
Each club independently credits itself `pool ÷ slots` — the AMP club at
`SeasonTransitionService.distributeSeasonOneStartIncome` (`addTransaction({ category: 'tv_deal' })`,
reading `league.tvDeal`), every NPC club through `leagueRecords[…].tvDeal`. So the claim is not that
money is taken from somewhere: it is that **the sum of what a division's clubs credit themselves
falls short of the authored pool.** The pool is the design intent for that division's total TV
money, and in Scotland the model no longer adds up to it.

**Recipients are `rows + 1` at the deepest tier**, because the player's club sits in that division
and credits itself the same per-club share. The reservation changes who fills the twelfth seat, not
how many seats there are.

```
=== SC === (deepest tier 8: the player sits there and credits itself the same tvDeal)
tier | rows | recipients | pool         | share/club  | sum credited  | SHORTFALL vs pool
  1  |   12 |         12 | £300,000,000.00 | £21,428,571.42 | £257,142,857.04 |    £42,857,142.96
  2  |   12 |         12 | £140,000,000.00 | £10,000,000.00 | £120,000,000.00 |    £20,000,000.00
  3  |   12 |         12 | £70,000,000.00 | £5,000,000.00 | £60,000,000.00 |    £10,000,000.00
  4  |   12 |         12 | £50,000,000.00 | £3,571,428.57 | £42,857,142.84 |     £7,142,857.16
  5  |   12 |         12 | £30,000,000.00 | £2,142,857.14 | £25,714,285.68 |     £4,285,714.32
  6  |   12 |         12 | £10,000,000.00 | £714,285.71 | £8,571,428.52 |     £1,428,571.48
  7  |   12 |         12 | £5,000,000.00 | £357,142.85 | £4,285,714.20 |       £714,285.80
  8  |   11 |         12 | £1,200,000.00 |  £85,714.28 | £1,028,571.36 |       £171,428.64
  SC SEASON SHORTFALL TOTAL: £86,600,000.36

=== EN === (same calculation, for contrast)
  every tier: recipients == slots, sum credited == pool
  EN SEASON SHORTFALL TOTAL: £0.00
```

> ⚠️ **Corrected 2026-11-19.** This table first read **£86,685,714.64**, treating tier 8 as having
> **11** recipients. It has **12**: the 11 NPC clubs *plus the player's own club*, which sits in that
> division and credits itself the same `tvDeal` — verified at `distributeSeasonOneStartIncome`,
> not assumed. The error was exactly one tier-8 share, £85,714.28. ⚠️ The earlier note also called
> this a **16.7% overpayment**, which is the wrong direction: 16.7% is how much *higher* the owed
> share is than the paid one. Both corrections came from the project-manager session.

**Per club: each Scottish club receives 85.7% of its due — 14.3% short.** Each gets `pool ÷ 14`
where the division it actually plays in would give `pool ÷ 12`. **England's shortfall is £0.00 at
every tier**, which is the cleanest available confirmation that the whole defect is the authored
drift and nothing else.

**Scotland's gate will remain 2 games high until the authored 14 is reconciled, and that is the
owner's decision, not a defect in this change.** The gate has **no correct option** in Scotland,
because the money and the fixtures already disagree there:

- **`slots − 1` (13)** → the gate's matchday agrees with the money the backend actually pays, and
  misses the fixtures the generator will draw by 2 games;
- **`rows − 1` (11)** → it agrees with the fixtures and contradicts the TV line *in its own run*,
  which is divided by 14.

**Only authoring 12, or generating 14 clubs, resolves it.** That is Tranche D's 16-vs-20 item, now
with a measured live consequence, and **A7's drift check is exactly the right instrument — this is
its first real catch.** I added no reconciliation of my own.

### 7d. 🔴 HEADLINE FINDING — Scotland has never been gate-measured, and cannot be

Not a footnote about my verification. **No Scottish COVERAGE figure has ever existed**, and none
can be produced on this machine:

```
$ npx tsx scripts/economy/variantGate.ts --export <game-config-en…> … --country SC
ExportRefused [Error]: export is resolved for EN, not SC — refusing rather than measuring the
wrong country.
    at assertCountryResolved (src/economy/harness/loadExport.ts:81:11)
```

The guard is correct and I did not defeat it: measuring England's authored turnover against
Scotland's grounds is the exact fiction it exists to prevent.

**What it would take**, and it is small: one authenticated **`GET /api/game-config?country=SC`**,
saved beside the existing three as `game-config-sc.LIVE.json`. All three configs on this machine
(`game-config-en.LIVE.json`, `…AUTHORED.json`, `…json`) carry
`economyTierBaseline.country === 'EN'`; `~/Downloads` holds world exports only. With that one file
the whole gate suite runs for Scotland unchanged — `--country SC` is already plumbed through
`variantGate`, `dispersionGate` and `flows`.

⚠️ **Why this matters more than it looks.** Scotland is **the country the owner tests on**, it is
the harsher case at every wired site (77% vs 53% on a hardcoded 23), it is the only country with
authored-vs-actual drift, and **every COVERAGE number and every authored dial in this project has
been derived from England alone.** Scotland's turnover ladder has never been checked against the
income its own grounds and 12-club divisions produce. That is a real gap in the calibration, not a
gap in this task's verification.

---

## 8. Verification

### 8a. Typecheck — clean

```
$ nvm use && npx tsc --noEmit; echo "tsc exit=$?"
Now using node v20.19.6 (npm v10.8.2)
tsc exit=0
```

### 8b. `npm test` — green, and the suite COUNT confirmed

```
$ npm test
Test Suites: 638 passed, 638 total
Tests:       3 skipped, 10664 passed, 10667 total
Snapshots:   0 total
Time:        379.538 s, estimated 577 s
EXIT=0

$ npx jest --listTests | wc -l
     638
```

**638 suites / 10,664 passed (10,667 collected, 3 skipped), `--listTests` = 638.** No failures.

**It reconciles exactly against the branch's previous row** (637 / 10,652, 2026-11-18): **+1 suite**
(`pricingPaneHomeGames.test.ts`) and **+12 tests** — 4 in `variantGate.test.ts`, 4 in
`seasonTickets.test.ts`, 1 in `new-game-setup/economy.test.ts`, 3 in the new file. Nothing else
moved, which is the point of checking: a run that silently collected fewer files would look
identical in the summary line.

`CLAUDE.md`'s `new-game-save` row and `.context/stages/01_overview/output/environment.md`'s
green-master bar are updated to this measurement.

### 8c. The gate, before and after

§4.1 (live config) and §4.3 (cand-c dials) above. **It moved, as §4 requires** — tiers 1–7 down by
`matchdayShare / 16`, tier 8 byte-identical. Scotland could not be run (§4.4). Full gate output for
both EN runs is in my scratchpad; §4 quotes the COVERAGE blocks verbatim and the diff verbatim.

**Verdict unchanged on both runs: `VARIANT GATE: PASS`, "insolvent once FLIPPED: none".** No gate
check or band was relaxed or edited.

### 8d. `flows.ts` runs, and its home-game count is now per division

```
$ npx tsx scripts/economy/flows.ts --export game-config-en.LIVE.json \
    --starter-config starter-config.LIVE.json --world <2026-11-19 export> --country EN
── G: sources as a share of turnover ───────────────────────────────────
tier |     TV | matchday | sponsors |  prize | UNATTRIBUTED
  1  |  41.1% |     4.8% |     8.6% |   0.0% |        40.5%
  2  |  29.5% |    10.9% |    16.7% |   0.0% |        37.1%
  3  |  20.6% |    25.3% |    25.4% |   0.0% |        17.2%
  4  |  14.4% |    35.3% |    42.5% |   0.0% |        -2.4%
  5  |  10.6% |    57.0% |    28.3% |   0.0% |        -8.0%
  6  |   7.0% |   116.3% |    77.1% |   0.0% |      -112.5%
  7  |   4.2% |   212.8% |   219.8% |   0.0% |      -352.0%
  8  |   2.3% |   339.4% |   701.4% |   0.0% |      -961.3%
```

(Those shares are `flows.ts`'s own pre-existing picture against the re-authored config — the
matchday line is now 15/23 of what the constant gave it. This report makes no claim about them;
`flows.ts` is a diagnostic that "proposes nothing, changes nothing".)

### 8e. Tests added

| file | what it pins |
|---|---|
| `src/__tests__/economy/variantGate.test.ts` | `homeGamesForLeague`: **`size − 1` from authored `slots`** at EN 16 and SC 14; **unchanged at the deepest tier** (16 slots / 15 rows → 15); **the absent/0 fallback** (`{slots:0}`, `{}`, `undefined`, `{slots:null}` → `rows − 1`, with **no `+1` re-added**); the last-resort branch |
| `src/__tests__/utils/seasonTickets.test.ts` | `homeGamesForDivisionSize` **against `generateRoundRobin` itself** at sizes 10/13/14/16/17/20, for every club not just the first; that it is never half the rounds; `FALLBACK_DIVISION_SIZE` |
| `src/__tests__/components/new-game-setup/economy.test.ts` | the stand-in equals `homeGamesForDivisionSize(FALLBACK_DIVISION_SIZE)`, and is explicitly **not 23** |
| `src/__tests__/components/pricingPaneHomeGames.test.ts` (new) | the pane routes through the helper, keeps `countHomeGames` as the live path, and **no longer halves** |

⚠️ **The absent/`slots = 0` fallback is tested and NOTHING ELSE.** 0 of 200 leagues in the real
export read `slots = 0`, so that branch is exercised by a synthetic league in a unit test and by
no real data at all. The `slots − 1` path, by contrast, is exercised by two real authored values
(16 and 14). I am not claiming more coverage than that.

### 8f. The dispersion gate — run as a matched pair, and a pre-existing OOM found

`dispersionGate.ts` carries the same fix, so it was run before and after on identical inputs. The
"before" was produced by restoring `HEAD`'s copies of the only two files it loads that I touched,
running, then restoring mine (md5-verified identical afterwards, and `git diff --stat` printed
mid-script to prove the swap).

```
$ diff dispersion-EN-BEFORE.txt dispersion-EN-AFTER.txt
10,16c10,16
<   1  | £35,736,933,271 | £42,402,640,628 | £43,733,987,758 |    1.03 | 0.031 |         —
…
>   1  | £35,717,875,589 | £42,379,319,198 | £43,708,011,263 |    1.03 | 0.031 |         —
…
36c36
<   5  |         0.007 |        0.006 |   -0.001   (n=16 vs 16)
---
>   5  |         0.009 |        0.007 |   -0.002   (n=16 vs 16)
```

**Tiers 1–7 move; tier 8 is absent from the diff entirely** — the same signature as the variant
gate, which is the strongest confirmation available that the change does what it says.
Movements are small (≤0.14%) because this gate measures the *spread* across clubs of one tier and
matchday scales every club of a tier equally; only tier 5's Gini shifts, by 0.002. **The verdict is
unchanged: `K(b): PASS`.**

⚠️ **OUT OF SCOPE, FOUND HERE, NOT FIXED — `dispersionGate.ts` cannot run at Node's default
heap.** At default it dies after 458 s:

```
FATAL ERROR: Ineffective mark-compacts near heap limit Allocation failed - JavaScript heap out of
memory
[99690:0x888400000] 457837 ms: Mark-Compact 1824.2 (2082.7) -> 1809.9 (2079.5) MB …
```

**This is PRE-EXISTING, not mine** — proved by the paired run above, where both arms needed
`NODE_OPTIONS=--max-old-space-size=8192` and both then completed with exit 0. It is the same heap
class `variantGate.ts`'s own memoisation comment records ("the third run tipped it into a 1.8GB
heap death before a single line of output"); `dispersionGate` has no equivalent cache. **Anyone
running it needs the heap flag, and that is not written down anywhere.** Flagged for the
project-manager session; `dials/run.sh` only invokes `variantGate`, so nothing automated is
affected.

---

## 9. What I did NOT do, and why — the audit of the brief's constraints

| constraint | status |
|---|---|
| Do not push | ✅ not pushed; `git log origin/new-game-save` still at `b8842812` |
| Do not touch `wageScaleMicroPence`, any authored economy figure, `economyTierBaseline`, `league_ability_ranges` | ✅ none appear in the diff |
| Do not change `SeasonBudgetService` or `GameLoop` | ✅ neither is in `git status`; §5 is measurement only, from a scratchpad script |
| Do not relax or edit any gate check or band | ✅ no check or band touched; both gates still PASS |
| Do not work in `wunderkind-backend` | ✅ not opened |
| Do not re-add a `+1` for the deepest tier | ✅ nowhere; asserted negatively in `variantGate.test.ts` |
| Nothing scratch-shaped in either repo | ✅ all measurement scripts, gate runs and patched inputs live in my scratchpad; this report lives in `docs/economy-loose-ends/` |

**Also deliberately not done**, and each is a judgement I am stating rather than hiding:

- **I did not re-run `dials/run.sh` to regenerate `runs/cand-c-authorable`.** It would overwrite a
  stored baseline other reports cite, and §4.2 explains why its inputs no longer exist.
- **I did not force the Scottish gate past `assertCountryResolved`** (§4.4).
- **I did not fix the three sibling halvings** (§6), nor `GameLoop`'s hardcoded `46` (§5c), nor
  the dispersion heap limit (§8f). All reported, none touched.
- **I did not read the authored `clubCount` in `PricingPane`** (§3e), and the reason is in the
  code comment, not just here.

## 10. Where the brief and the code disagreed

Two places, both stated above and neither silently complied with:

1. **§0's export situation is obsolete** (§1). Resolved by a fresh export, not by patching.
2. **§5b's suspicion about `PricingPane` was right about the halving and understated the family.**
   It framed it as one possible defect; it is a confirmed defect with **three more instances**, two
   of which book real money (§6). The ruling's inventory of six sites is really **nine**:

   | | site | state |
   |---|---|---|
   | 1 | `variantGate.ts:274` | ✅ fixed |
   | 2 | `dispersionGate.ts:146` | ✅ fixed |
   | 3 | `flows.ts:68` | ✅ fixed |
   | 4 | `new-game-setup/economy.ts:11` | ✅ fixed (consistent, not correct — §3d) |
   | 5 | `PricingPane.tsx:183` | ✅ fixed |
   | 6 | `SeasonBudgetService.ts:526` | 🔴 measured, owner's (§5) |
   | 7 | `GameLoop.ts:1520` | 🔴 left, per brief (§5c) |
   | 8 | `SeasonTransitionService.ts:1656` | 🔴 **NEW** — real NPC money (§6) |
   | 9 | `SeasonTransitionService.ts:2499` | 🔴 **NEW** — the player's own club (§6) |
   | 10 | `FinancialProjectionService.ts:222` | 🔴 **NEW** — projection only (§6) |

   Ten, counting them all. **Five fixed, five outstanding, three of which nobody had.**

3. **One wording correction to the ruling's own text**, for the project-manager session: it names
   `SeasonTransitionService.ts:1655` and `:2498` as the ✅ COUNTED reference implementation. That
   is right about those two lines and the lines immediately after them — `:1656` and `:2499` — are
   two of the 🔴 WIRED sites. Worth saying because citing a line as the exemplar when its own
   fallback is a defect is how this hid.

## 11. `.context`

Per the brief, I appended **one** pass entry to `.context/shared/last-sync.md` and corrected the
stage text this change makes wrong. Nothing restructured, nothing pruned, nothing deleted.

- `shared/last-sync.md` — one new pass entry at the top.
- `stages/01_overview/output/environment.md` — green-master bar, `new-game-save` row, re-measured.
- `CLAUDE.md` — the same row, as the one-way mirror of the above.
- `stages/07_synthesis/output/game-mechanics.md` — the home-game derivation recorded where the
  simulation's live rules live, with the outstanding sites named.

**Flagged, not touched** (project-manager session's call):

- `next-work-plan.md`'s ruling section: the inventory is six sites; it is ten (§10). Its
  `PricingPane` entry is marked "NOT yet confirmed" and is now confirmed as a defect, fixed.
- `next-work-plan.md`'s A6 section: the §4 COVERAGE table's absolute figures are no longer
  reproducible (§4.2). The mechanism is confirmed; the numbers should not be carried forward.
- Its Tranche D bullet says "EN reads 18 against 16 real rows, SC tiers 1–4 read 18 against 14".
  Post-migration this is **EN 16 against 16 (✅ agreed) and SC 14 against 12 at every tier** (§7).
- `useSetupHost.ts:196`'s comment says `ticketPricePence` is "still not published"; its own later
  section says it is (since 2026-11-15). Pre-existing, one line, not mine to fix mid-task.
- **A7 should gain one app-side item**: publish the authored division size on
  `economyTierBaseline.tiers[]` so `new-game-setup`'s stand-in can be deleted (§3d).

---

## 12. Brief compliance notes

**§0a (scope: England and Scotland only).** The brief gained §0a at 14:21, after I first read it;
I had already received the same instruction and complied. KR and FR appear exactly once in this
report, in §1's verbatim dump, as corroboration that the reserved-place pattern at the deepest
tier is not an England quirk. Neither is measured, neither is recommended, and no gate was run for
either.

**§0.3 ("report BOTH readings", unpatched and patched export).** Superseded by §1: a fresh
post-migration export arrived, so `patch.mjs` was not used and there is no patched reading to
report. For the record, and arithmetically rather than from a run I did not do: against the stale
2026-11-18 export (EN `slots = 18`, 16 club rows at tiers 1–7) this fix would read **17** home
games where the old code read 16 — i.e. on a stale export the correction *raises* the figure,
because the authored size is 2 ahead of the rows, which is the same authored-vs-rows drift
Scotland still shows live (§7). **I did not run the gate on the stale export after the change**,
because the instruction to do so existed only while no fresh export did.

**§0.4 ("do not claim the live value; state that it is UNCONFIRMED").** No longer applicable, and
I am saying so rather than repeating a caveat that has been discharged: §1's dump IS the app-side
confirmation, read from a 2026-11-19 14:15 export. EN = 16 at all eight tiers. A7 will confirm it
server-side, which is a different and still-useful check — it compares `slots` to the rows, which
is where Scotland fails.

**§6.2 (`CLAUDE.md` and `environment.md` corrected if the count moves).** It moved; both are
updated, and I trusted my own measurement over what was written there.

---

## 13. Commit

**Three commits on `new-game-save`, not pushed.** `3300fcd1` is the change; the other two are
documentation only, added after the device reading in §7 and after the project-manager session's
arithmetic correction to §7c.

```
b29cf149 Correct the Scottish TV shortfall: 12 recipients at the deepest tier
ddb0b991 Record Scotland's slots-vs-rows drift, and why rows-1 is not the fix
3300fcd1 Derive home games from the authored division size, never a club count
```

`ddb0b991` and `b29cf149` touch `.context/shared/last-sync.md` and
`.context/stages/07_synthesis/output/game-mechanics.md` only. Re-confirmed after each:
`npx tsc --noEmit` exit 0; after `ddb0b991` also `npx jest --listTests | wc -l` = 638 and the five
affected suites green (111 tests). **The full 638 / 10,664 run in §8b was taken against
`3300fcd1`'s tree, which is byte-identical in every code file** — so it stands for all three, and
the project-manager session agreed not to re-run jest for a prose change.

`3300fcd1`'s own file list:

```
 .context/shared/last-sync.md                           |  ++
 .context/stages/01_overview/output/environment.md       |  ++
 .context/stages/07_synthesis/output/game-mechanics.md   |  ++
 CLAUDE.md                                               |  ++
 scripts/economy/dispersionGate.ts                       |  ++
 scripts/economy/flows.ts                                |  ++
 scripts/economy/variantGate.ts                          |  ++
 src/__tests__/components/new-game-setup/economy.test.ts |  ++
 src/__tests__/components/pricingPaneHomeGames.test.ts   |  ++ (new)
 src/__tests__/economy/variantGate.test.ts               |  ++
 src/__tests__/utils/seasonTickets.test.ts               |  ++
 src/components/finances/PricingPane.tsx                 |  ++
 src/components/new-game-setup/economy.ts                |  ++
 src/economy/harness/worldExport.ts                      |  ++
 src/utils/seasonTickets.ts                              |  ++
```

Checked immediately before committing: **no `*-correction.md` or `*-addition.md` in
`docs/economy-loose-ends/` is newer than the brief.** The only two (`a3-tvdeal-addition.md`,
`a4-premise-correction.md`) are from 10:25 and 10:35 and belong to other tasks. The brief itself
was revised at 14:21 — §0a only, already complied with (§12). `a7-slots-drift-brief.md` (14:30) is
another task's brief, not a correction to this one.

---

## 14. The one thing to read if you read nothing else

**§5 is the decision, §6 is the surprise, and §7c is the one that is costing money today.**

§5: correcting `SeasonBudgetService` cuts every NPC club's season wage budget by **24–30% in
England and 26–37% in Scotland**. That is the owner's call and the table is what to call it from.

§6: three sites nobody had inventoried carry the same halved derivation, and **two of them book
real season-ticket money** — for every NPC club in the world and for the player's own club — at
world init, which is exactly when their fallback fires. The magnitude there is **half a season**,
not one game. The fix is already written and tested in this commit; it just has not been applied
to them, because they were not in the brief and two are the owner's to decide.

§7c: **Scotland's TV model does not add up — the sum of what a division's clubs credit themselves
falls £86,600,000.36 per season short of the authored pools, against £0.00 in England.** Each club
takes `pool ÷ 14` in a division of 12. It is live on the device, it predates this task, and no
choice of input inside A6 can fix it — only authoring 12, or generating 14 clubs, can. Scotland's
gate stays 2 games high until then, and §7b is why that is still the right formula to have landed.

And §7d, which is the cheapest item on this list: **one authenticated
`GET /api/game-config?country=SC`** would let Scotland be gate-measured for the first time.
