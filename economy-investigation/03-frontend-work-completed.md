# Economy overhaul — what the frontend now does

**For the backend and investigation teams.** The counterpart to `01-backend-work-completed.md`.

App: `wunderkind-app`, branch **`new-game-save`**, 14 commits `9fecfca5` → `09d89a54`,
80 files, +16,536/−245. **Unpushed as of 2026-11-13.** Two migrations.

Backend reference throughout: `wunderkind-backend` `development` @ `0486bab1` (2026-11-12).

---

## Read this first

**All thirteen planned steps are implemented.** Suite: **588 suites / 9,990 tests**, all
passing (the branch started at 575/9,786 with six failures). `tsc` clean, `db:generate` clean,
`db:verify-baseline` OK, i18n audit zero.

**The release gate FAILS.** `npx tsx scripts/economy/gate.ts` exits 1 at tiers 7–8. That is a
real finding about the authored configuration, not an app defect, and §7 is about it.

| Step | What | State |
|---|---|---|
| 0 | Design-system ratchet unblocked | done |
| 1 | Config intake + a live bug fixed | done |
| 2 · 2b | One wage implementation · per-season inflation index | done |
| 3 | Headless harness, legacy failure reproduced | done |
| 4 | TV pool, league prize, parachute, NPC clubs paid | done |
| 5 | NPC solvency income term, insolvency in weeks of wages | done |
| 6 | Transfer fee and club valuation follow the wage curve | done |
| 7 | Renewals anchored to salary, relegation clauses | done |
| 8 · 8b | Upkeep tier scaling and decay · **the release gate** | done — **gate fails** |
| 9 | Setup/tick attendance parity | done |
| 10 | Owner season investment | done |

---

## 1. ⚠️ One backend-published value was already changing app behaviour

**`matchdayFoodUptakePercent` moved 40 → 35 and cut every club's food income by 12.5%, with
nothing announcing it.**

The app had declared this key for a long time at a default of 40 and read it in the single
matchday money chain. The backend's economy work started publishing it at **35** on both
`GET /api/game-config` and the sync `gameConfig` block. The app applies the sync block through a
3-way merge in which **the server value wins** — so the change landed from a backend deploy, with
no app release, and no test could see it. The app's own documentation asserted the key was
client-only and untunable, which is exactly why nobody was watching it.

**Resolved** (owner decision): accept 35, and move the app's own default to 35 so an offline or
never-synced device prices the same as a synced one.

**What the backend team should take from this:** every key in the `gameConfig` block is now a
live balance dial with no release gate in front of it. The app has added a watcher —
`MONEY_KEYS` + `diffMoneyKeys` in `gameConfigStore` logs any money-affecting value that changes
between syncs — but it is a **report, not a block**.

**Also fixed:** the sync path applied the `gameConfig` block to memory and never persisted it,
while the `/api/game-config` path did. A sync-delivered value was gone on the next cold start.

---

## 2. The wage model, as the app implements it

`src/economy/wages.ts` is the one implementation. It replaced two copies —
`PlayerBrain.baseContractExpectation` (7 callers) and `finance.calculateWeeklyWage` (1).

**The turnover chain matches yours operation for operation** — not the single-rounded form the
frontend brief quoted, but `WageModelResolver::turnoverPlayerPence`'s actual chain:

```
micro = Math.round(wageScaleMicroPence × ability^(exponentBp/10000))
micro = Math.trunc(micro × reputationModifierBp / 10_000)
pence = Math.trunc(micro / wageScaleUnit)
```

Three integer steps instead of one, so there is **no penny of drift** between an app-priced wage
and a backend-generated stored one. Pinned against your authored figures: ability 90 at tier 1
≈ £299,793/week.

**Four ways to fall back, and `resolveEconomy` reports which**: `no-table` (never synced),
`model-legacy`, `tier-unresolvable` (`resolvable: false` — the shipped state), `no-tier` (the
shared market pool, which has no country or tier to price against). A tier with no authored
turnover means *keep doing what you did before*, never *this division is free*. Asking a shallow
country for a tier it does not have returns null rather than clamping onto its bottom row.

**`legacy` is byte-identical**, pinned at every integer ability 0–100 against the old expressions
re-implemented inline. Two details that look like detail and are not: the draw rolls the
**coefficient**, not the resulting pence; and the strict `<` band boundary is preserved, matching
your tier-walk.

**A ±8% negotiation band** exists because the turnover curve is deterministic and the signing and
renewal screens let the player haggle inside a range. `expected` sits exactly on the curve and
the band is symmetric, so it cannot bias a wage bill.

---

## 3. Inflation: the app stores an index, it does not recompute one

**New table `season_economy`** (migration `0020`): `season` (PK), `inflation_index_bp`,
`rate_per_season_bp`, `recorded_at`.

The obvious implementation — `(1 + rate) ^ seasonsCompleted`, derived on demand — is wrong for
the way you intend the rate to be used. Changes are meant to be rare, deliberate and sometimes
**temporary**. Recomputing would make a bump retroactively reprice every past season, and
removing it would reverse that.

So the index is advanced **one step per season transition** using the rate stored at that moment,
and written down. A temporary bump leaves a permanent step — correct: prices rose that year and
did not un-rise.

- A new save opens at exactly **1.00 whatever the rate is** — the rate applies to the step *into*
  season 2, or a save created while a 5% rate was set would open above your base-year figures.
- **`season` as the primary key is the idempotency.** Season transitions get replayed, and a
  second compound would permanently overstate every derived price with nothing able to detect it.
- `rate_per_season_bp` is stored alongside so a price can be **explained** after the fact.

**What inflates, and what must not:**

| Treatment | Values |
|---|---|
| **Priced once, stored nominal** | wages, transfer fees, sign-on fees, a rolled sponsor amount |
| **Derived at read** | TV, prize and position pots, parachute instalments, sponsor bands, **upkeep**, thresholds |
| **Never** | `club.balance`, `club.landCostPence`, `facility_template.baseCost` and anything derived from it |

`baseCost` is the sharp one: club value is computed *from* it. The valuation picks up inflation
through its **wage-derived** squad and staff terms instead.

---

## 4. TV, prize money, parachutes — and NPC clubs get paid

`computeSeasonFinances` is the one calculation, shared by the user's club and the whole pyramid.

| Line | Who gets it | Ledger category |
|---|---|---|
| TV | **every club, equally** | `tv_deal` |
| Flat `prizeMoney` | **the champion only** | `league_prize` (new) |
| Position pot | everyone, on the existing taper, floored at 0 | `earnings` |
| Parachute | a relegated club | `parachute` (new) |

**Two real gameplay changes.** The flat prize used to be credited to every club whose league had
a `prizeMoney > 0`, with finishing position used only in the description string — most clubs lose
an income line. And **NPC clubs are paid at all**: they received nothing, so the pyramid's
revenue asymmetry was larger in-game than on paper and the lower tiers' insolvency was partly an
artefact of never being paid.

⚠️ **The injection is large and uneven.** TV is ~28 weeks of a tier-1 club's wage bill and ~1.9
weeks of a tier-8 club's. It rescues the top and barely moves the bottom. **The bottom is fixed
by the wage model, not by TV.**

**`tvPoolPence / clubCount` is checked against `tvDeal` and a disagreement is REPORTED, not
resolved** — exactly as publishing the divisor intends. Preferring the pool would overpay a club
reading a stale cached pack; preferring the deal would hide a real re-authoring.

**Parachute parsing is total**, because you serve the block verbatim and never read inside it:
unknown keys ignored (so you can extend the shape with no app release), one bad instalment zeroes
that instalment rather than discarding a taper a club is part-way through, and nothing throws — a
throw would take out a season transition over a mistyped admin field. The schedule is
**snapshotted at relegation**, so a club is paid the deal it went down under.

---

## 5. Solvency, insolvency, valuation, renewals, upkeep

**The NPC solvency verdict saw a third of the picture.** Income was sponsors-only, with a
fallback that was itself sponsors. Matchday, season tickets, investors, the pyramid distribution
— and since the TV change, TV — were all credited but invisible to the verdict that triggers
player sales. It now reads sponsors + matchday + TV, amortised across the season (a lump in a
weekly runway makes a club rich for one week and selling for forty-five), and **counts upkeep**,
which it never did.

Thresholds now come from the published `npcSolvencyThresholds`, where they were inline literals.
A transposed triple is sorted rather than trusted.

**The bankruptcy ladder — your open question, answered.** The app resolves
`bankruptcyDeductionTiers` **first-match-wins, in array order**, exactly as your column docblock
documents. So on the live five-row table **rows 4 and 5 can never fire**: any deficit ≥ 500,001p
matches row 3 first and the harshest reachable penalty is 10 points. Under `turnover` the ladder
is now **weeks of the club's own wage bill**, non-overlapping, every row reachable — your own
recommendation. It is an **app constant** because you declined to publish
`bankruptcyDeductionWeeks` until the shape was agreed; **if you publish it with that shape, the
app will switch to reading it.**

**The transfer fee inverted, and worse than the brief described.** Measured against your table:

| | wage | old fee | = seasons of his own wages |
|---|---|---|---|
| tier 1, ability 90 | £299,793/wk | £4.5M | **0.3** |
| tier 7, ability 8 | £452/wk | £400k | 19.2 |
| tier 8, ability 4 | £75/wk | £200k | **58.0** |

The best player in the game cost four months of his own salary while a lower-league squad player
cost a working lifetime — a ~190× spread, in both directions, because a linear fee and a `^2.5`
wage curve diverge by construction. The fee is now a multiple of wages, holding that ratio
constant everywhere. **Taking the wage as an input is what keeps foreign and pool players
isolated**: you already priced their wage for the requesting club, so the fee inherits it and the
app never re-prices a figure you have priced.

**Renewals are anchored to the existing salary** (both paths priced from ability alone, so a
squad's bill snapped to market the week contracts rolled over, removing the entire
post-relegation transition). A renewal now lands between what the player earns and what they are
worth; a relegated club converges over about three contract cycles.

**Relegation clauses** (migration `0021`, `players.relegation_wage_cut_bp`, nullable). The player
may dispute; whether they do is deterministic, so the club can predict who will object before
deciding whether to enforce.

**Upkeep scales with tier** — the axis that was missing entirely — **and inflates**. See §7.2 for
the one that bites.

---

## 6. Setup/tick parity, and the owner investment

**The setup screen promised a sell-out where the tick pays 35%.** The season-1 estimate used a
population *demand* model while the weekly tick uses a *fill* model — nearly 3× apart, on the one
screen where the player commits real account credit. The estimate now derives attendance the way
the tick does, with population surviving as a **cap** (your own shape: fanbase is a cap, not a
driver). Bridged by `setupMatchesTick`, agreeing to within a seat across five ground sizes.

⚠️ **`sponsorWeeklyPence` is wired behind a `> 0` guard.** It publishes defaulting to 0 ("the
mechanic is off"), and the setup overlay strips `undefined` but not `0` — wiring it naively would
silently zero season-1 sponsor income. This is the exact failure your own
`EconomyConfigPublisher` docblock warns about.

**Owner season investment** is built, and ships unreachable (ceiling 0). The important part:

⚠️ **A replayed POST returns `creditClubPence` again**, so neither flag is a safe discriminator —
applying on every response double-credits, applying only on `invested` loses the player's money
when a response is lost before the credit. **The ledger is the marker**: `transactions` already
carries a `season` column, so the idempotency record and the `SUM(transactions) === club.balance`
invariant are the same fact. The `GET` is the reconciler. The call waits for
`concludeSeasonOutbox` to drain, because until the archive lands the season count is stale.

The app computes **no local ceiling anywhere** — it is never told a country factor, so any local
derivation is wrong by construction.

---

## 7. ⚠️ What needs a decision from your side

### 7.1 The release gate fails at tiers 7–8, and upkeep is the driver

30 seasons, complete economy, England dev table:

| tier | wages | upkeep | total | solvent? |
|---|---|---|---|---|
| 1 | 54.5% | 9.2% | 63.7% | yes |
| 3 | 61.6% | 12.0% | 73.6% | yes |
| 5 | 65.9% | 12.3% | 78.2% | yes |
| 6 | 78.7% | 16.4% | 95.1% | barely |
| **7** | 80.0% | **29.0%** | **109.1%** | **no — season 1** |
| **8** | 80.3% | **50.9%** | **131.1%** | **no — season 1** |

**The wage share swings 1.5× across the pyramid; the upkeep share swings 5.5×.** Wages are doing
what they were designed to do. `weeklyUpkeepBase` is a **flat absolute with no tier term** — the
last unscaled figure in the economy, and precisely the class your own threshold review says
decouples. At tier 8 it is **half of the club's entire turnover**.

Two ways out, both yours:

1. **Raise the bottom tiers' authored turnover.** Tier 8 is £164,852/season — about £3,584/week
   against a £1,822 ground and a £2,159 payroll.
2. **Scale `weeklyUpkeepBase` by tier**, or let the app move its tier-factor baseline up the
   pyramid — which re-breaks the fund-projection alignment in 7.2.

### 7.2 `POST /api/club/fund`'s projection will under-read once the model flips

You aligned it to `base × 1.5^level`. The app's upkeep now carries a tier factor **anchored at
1.0 at the bottom tier**, specifically so the FOUND CLUB projection — read in the bottom
division — stays exactly right. Above the bottom tier the two diverge by that factor.

### 7.3 The two halves of your published calibration do not match each other

Found by running the harness. The wage figures in `docs/economy-threshold-review.md` were
measured against a development clone whose tier-1 squad is **33**; the turnover table in
`docs/deploy/economy-rollout.md` was derived against dev's own **26**. Your runbook says that
alone pushed figures 27% over target:

```
tier 1: review bill £4,818,700/wk × 46 = £221,660,200
        against rollout turnover £388,661,540 = 57%, target 45%.  57/45 = 1.27
```

The app applies no correction — that would be inventing a measurement. But **the absolute levels
in 7.1 are overstated by about that much**, and dividing it out puts tier 7 near 73%
(comfortable) and tier 8 near 98% (marginal). So the honest statement is *"tier 8 does not clear
its costs and tier 7 is uncertain"*, not *"the bottom two tiers are broken"*. **Re-deriving both
halves from one authoring run is a precondition for trusting any of these levels.**

### 7.4 The realized wage share will not be the configured 45%

`S_tier` is calibrated so a *reference squad* costs the configured share. The app fields squads
from `npcSquadConfig`, **0.69–0.79 of your reference squad at every tier**. Measured realized
player share runs 40.9% (tier 1) to 60.2% (tier 8) against a 45% target.

Per the owner: **do not change `npcSquadConfig`**. Whether your reference sizes
(33/30/28/26/26/26/23/22) should be recalibrated toward the app's real squads
(~26/23/21/20/19/18/17/17) is a **backend follow-up**.

### 7.5 Seven of eight legacy wage figures in the harness are inferred

Only tier 8's (£480/wk) is stated outright in your docs. The CLI lists every inferred figure.
They need confirming from a live `GET /api/game-config` before the gate's legacy arm is trusted.

### 7.6 NPC clubs have no condition state and no proactiveness

Decision 8 asks upkeep to decay "faster when an NPC club's proactiveness is low". `proactive` is
a **facility-manager tier belonging to the user's club**. NPC clubs have neither trait nor
condition — their grounds pass a synthetic 100 and are permanently pristine. Honouring it needs
two pieces of state that do not exist; recorded as a scoped follow-up, not half-built.

---

## 8. What the app deliberately does NOT do

- **Never looks for or applies a country factor.** Your resolved table is already this country's
  money.
- **Never re-prices market, foreign or scout-search figures.**
- **Does not pin `wageModel` per save** (owner decision). An operator flipping the model on a live
  world re-prices every running save's *assets* at once while its *liabilities* converge through
  renewals. Accepted, unmitigated; the gate's cascade scenarios size it (no cascade at either the
  flip or a +20% scale).
- **Does not treat `sponsorWeeklyPence` as convertible with the sponsor bands.**
- **NPC club valuations keep the legacy squad term**, because a fee is anchored to the paying
  club's economy and resolving that from the AMP league would price ~50 NPC squads at the user's
  tier.

---

## Reference

| | |
|---|---|
| App branch | `new-game-save`, `9fecfca5` → `09d89a54` (14 commits, unpushed) |
| Migrations | `0020_overjoyed_whiplash` (`season_economy`), `0021_massive_hitman` (`players.relegation_wage_cut_bp`) |
| Economy module | `wunderkind-app/src/economy/` |
| Harness · gate | `npx tsx scripts/economy/harness.ts` · `scripts/economy/gate.ts` |
| App-side rules | `.context/stages/07_synthesis/output/game-mechanics.md` §8, §9 |
| Config + endpoint contract | `.context/stages/04_interfaces/output/routes.md` |
