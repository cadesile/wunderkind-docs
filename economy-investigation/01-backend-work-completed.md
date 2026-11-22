# Economy overhaul — what the backend now does

**For the frontend and investigation teams, to build the frontend prompt from.**

Backend: `wunderkind-backend`, branch `development`, merged to `dev` 2026-11-12.
14 commits, `7175766` → `ce43a08`. Nine migrations.

---

## Read this first: it is deployed and OFF

Everything below is **live on the dev backend with the wage model still OFF.** Turning it on is a
separate operator action with its own runbook
(`wunderkind-backend/docs/deploy/economy-rollout.md`).

**You can build and ship against the new keys before anyone flips the switch**, and the switch
does not need the app to be ready. That is the point of the whole design.

### Dev state as of 2026-11-13 — read this table, not the prose below it

Calibration has started on dev, so this is no longer the pristine post-deploy state the rest of
this document was written against.

| | state | does it move a value you read? |
|---|---|---|
| `economyWageModel` | **`legacy`** — off | no. **No wage, fee or player price has moved anywhere** |
| Country factors | all parity (`10000`) | no |
| Inflation | `0` | no |
| Season-investment ceiling | `0` | no — every request is refused |
| **Turnover table** | **AUTHORED** | only the preview block: `resolvable` is now `true` and `turnoverPence` / `wageScaleMicroPence` are populated. **No price follows from it while the model is `legacy`** |
| Youth scholarship anchor | **AUTHORED** (£1,500 tier 1, £25 floor) | no — gated on the model, so every tier still publishes `25000` |
| **TV table** | **RE-AUTHORED** | **YES — `tvDeal` has changed on every league. See §5.** |

**One value you already read has changed: `tvDeal`.** Everything else is still additive keys and
unchanged figures. §5 has the before/after table and why it had to move.

The reason the distinction is sharp: almost everything here is gated on `economyWageModel`, so
authoring config changes nothing until the model flips. `league.tv_deal` is the exception — it is
a stored absolute an operator types in, with no model gate in front of it.

### The one rule that governs every money figure

> **Every money value the backend publishes is BASE-YEAR. The app applies inflation.**

The backend stores and publishes only `inflationRatePerSeasonBp` — a rate, never an index,
never an inflated value. Nothing on the server is stored inflated and no world pack carries an
index (the pack cache is keyed `(country, tier)` with no season dimension, so an inflated pack
would be wrong for every save at a different season).

The app compounds the index over its club's season count.

---

## 1. Why any of this exists

Clubs ran out of money over many seasons because **wages were not tied to revenue**. A wage was
`ability × random(2000..2800) × tierMultiplier` — a number with no relationship to what a club
earns.

The overhaul builds one economy model the app runs:

- wages anchored to a configured per-tier **turnover**
- a **country factor** so a cheaper country is cheaper on both sides of the ledger
- an **inflation rate** the app applies
- TV money as a **pool** split across a league rather than a per-club figure

**The backend is a data pool.** It generates leagues, clubs, players and staff, and publishes
configuration. The active world runs entirely in the app. The backend cannot pay a club
anything — there is no income loop here.

---

## 2. What the app now receives

### `GET /api/starter-config` → new `economy` block

Public, pre-credentials, **country-agnostic**. Baseline values and factor tables only — there
is no club to resolve a country from.

```json
"economy": {
  "wageModel": "legacy",
  "weeksPerSeason": 46,
  "wageToTurnoverRatioBp": 6000,
  "wageCurveExponentBp": 25000,
  "staffWageShareBp": 2500,
  "reputationSpreadBp": 0,
  "wageScaleUnit": 1000000,
  "tierFactorsBp": [10000, 10000, 10000, 10000, 10000, 10000, 10000, 10000],
  "baselineTurnoverPence": [0, 0, 0, 0, 0, 0, 0, 0],
  "inflationRatePerSeasonBp": 0
}
```

### `POST /api/sync` → `gameConfig`, and `GET /api/game-config`

Both gain the **same six keys**, from one builder, so either surface gives the same contract:

| key | type | shipped | meaning |
|---|---|---|---|
| `economyTierBaseline` | object | see below | the **resolved** per-tier table for this club's country |
| `inflationRatePerSeasonBp` | int | `0` | rate per season, basis points. 250 = 2.5%, compounded |
| `matchdayFoodUptakePercent` | int | `35` | share of the crowd that buys food |
| `npcSolvencyThresholds` | int[] | `[4,12,26]` | **weeks in deficit** at which an NPC club escalates: warn, crisis, folded |
| `dofWageBillThresholdPct` | float[] | `[0.40,0.50,0.60,0.70]` | wage-bill-to-turnover ratios at which a DoF objects, as **fractions** |
| `sponsorWeeklyPence` | int | `0` | ⚠️ a sponsor's **weekly** payment — see §6 |

`GET /api/game-config` is public and has no club, so it takes an **optional `?country=`**.
Omitting it — which every current build does — resolves at parity and reports
`economyTierBaseline.country: null`. That is a complete, usable table, not an error.

### `economyTierBaseline`

```json
{
  "country": "EN",
  "tierCount": 8,
  "wageModel": "legacy",
  "weeksPerSeason": 46,
  "wageCurveExponentBp": 25000,
  "reputationSpreadBp": 0,
  "wageScaleUnit": 1000000,
  "sponsorBandsPence": {
    "small":  { "min": 5600000,  "max": 8200000  },
    "medium": { "min": 8200000,  "max": 13400000 },
    "large":  { "min": 25000000, "max": 80000000 }
  },
  "tiers": [
    {
      "tier": 1,
      "turnoverPence": 0,
      "wageScaleMicroPence": 0,
      "resolvable": false,
      "youthScholarshipPence": 25000
    }
  ]
}
```

Four things to get right here:

- **`tiers` has exactly `tierCount` rows, and row *i* is tier *i+1*.** A four-tier country gets
  four rows. Tier indexes are *not* stretched across an eight-rung scale.
- **`resolvable: false` means the operator has not authored this tier's turnover yet** — which
  is the shipped state for every tier. It exists because a bare `turnoverPence: 0` cannot tell
  "unauthored" apart from "genuinely worth nothing". Treat unresolvable as *"keep doing whatever
  you did before"*, never as "this division is free".
- **There is no country factor in this block, deliberately.** The figures are already resolved
  for the club's country. Publishing a factor would invite applying it a second time to
  something already scaled.
- `wageScaleMicroPence` is **pence × 1,000,000** — see below.

---

## 3. Pricing a wage (the formula the app implements)

```
weeklyPence = round(
    wageScaleMicroPence
  × ability ^ (wageCurveExponentBp / 10000)
  × reputationModifier
  / wageScaleUnit
)
```

`reputationModifier = 1 + (clubReputation − 50) / 50 × reputationSpreadBp / 10000`, which is a
flat `1.0` at the shipped `reputationSpreadBp = 0`.

**Why micro-pence.** `S_tier` for a bottom division is a *fraction of a penny* per unit of
`ability^k`. Rounded to pence it would quantise every wage in the division to a handful of
values, and at a small country factor would round to zero and make every player free. Divide by
`wageScaleUnit` **last**, after the ability term.

**The reputation modifier redistributes, it does not inflate.** The calibration is derived at
reputation 50, so a non-zero spread moves money between a tier's clubs rather than raising the
tier's total bill. Worth knowing because the obvious reading of "reputation raises wages" is the
opposite.

> **Open question for the frontend team.** This division of labour — backend publishes a scale
> and an exponent, app does the `pow()` — was derived by the backend, not handed down. If you
> would rather receive a **per-ability lookup table** and do no exponentiation, say so: that is
> a cheap change now and an expensive one after the app is built against this.

### A worked table

England, with a candidate turnover ladder, live ability bands and squad sizes. This is what
`app:economy:wage-table EN` prints:

| tier | squad | band | S_tier (p) | min /wk | mid /wk | max /wk |
|---|---|---|---|---|---|---|
| 1 | 33 | 40-90 | 390.40 | £39,506 | £132,984 | **£299,999** |
| 2 | 30 | 30-60 | 362.61 | £17,875 | £49,257 | £101,115 |
| 3 | 28 | 20-40 | 336.79 | £6,025 | £16,602 | £34,081 |
| 4 | 26 | 15-35 | 312.81 | £2,726 | £9,775 | £22,670 |
| 5 | 26 | 10-25 | 290.54 | £919 | £3,994 | £9,079 |
| 6 | 26 | 10-15 | 269.85 | £853 | £1,641 | £2,352 |
| 7 | 23 | 5-10 | 250.64 | £140 | £447 | £793 |
| 8 | 22 | 2-7 | 232.79 | £13 | **£127** | £302 |

Both agreed targets land: ~£300k/week for the top tier-1 earner, ~£100-130/week for an average
tier-8 player. Nothing is authored yet, so **these are a projection, not what the API returns
today.**

---

## 4. `wageModel` — `legacy` or `turnover`

`legacy` (shipped) prices a wage as `ability × random(contractValueRandMin..Max) ×
tierMultiplier` — what priced every row in the world so far. It is a **supported mode**, not
dead code.

`turnover` anchors each tier's scale to a configured share of that tier's turnover.

**Read `wageModel` and branch on it.** The key is in both `economyTierBaseline` and the public
`economy` block.

### Two populations, priced differently — this affects what the app sees

| population | priced | consequence for the app |
|---|---|---|
| World-pack club players and staff | **at generation**, stored in the pack | a pack holds the wages it was built with; flipping the model requires a cache rebuild server-side |
| Market-pool players, coaches, scouts | **at serve time** | `GET /api/market/data`, `/api/players/foreign`, `/api/scout/search` return figures priced for *your* club |

So the same pool player can be quoted a different `contractValue` to two clubs in different
countries or tiers. **That is correct and deliberate** — a wage demand is what *this* club has
to pay.

- **Pool players** are fully re-priced from the ability curve.
- **Pool coaches and scouts** are scaled by the country × tier factor only, because their pay
  comes from bands the turnover model has no opinion about.
- `GET /api/market/data` is now `Cache-Control: private` — its body varies by caller.

**The paying club's country, not the player's nationality.** A Brazilian at an English tier-1
club is paid English tier-1 money.

**Tiers are resolved server-side.** `/api/market/data` and `/api/scout/search` take no tier
parameter — they set a price, and a client-supplied price anchor would be a client-supplied
discount. `/api/players/foreign` keeps its `country` parameter because there it *selects* which
players to show.

---

## 5. TV money is now a pool

Published on **three uncached payloads**: the sync league snapshot,
`GET /api/initialize/leagues`, and the season pyramid from `POST /api/league/conclude-season`.

| key | meaning |
|---|---|
| `tvDeal` | **the PER-CLUB share, in pence** — unchanged in name and meaning |
| `tvPoolPence` | the league's whole TV money for a season. The authored value. |
| `clubCount` | what the pool was divided by |

`tvDeal = intdiv(tvPoolPence, clubCount)`, and `clubCount` is published so the app can *check*
the arithmetic rather than trust it. `tvDeal` was deliberately **not** re-interpreted as the
pool, because current builds read it as one club's money.

### ⚠️ UPDATE 2026-11-13: `tvDeal` has now moved on dev, and `tvPoolPence` is no longer null

The paragraph that used to sit here said a null pool derives nothing and `tvDeal` keeps the figure
it always had. **That was true at deploy and is no longer true on dev**, where the TV table has
since been re-authored across all 25 countries as part of calibrating the turnover model.

**This is the one thing in this document that changes a value you are already reading.** Same key,
same units, same meaning — a different number:

| tier | `tvDeal` before (pence) | `tvDeal` now (pence) | now, in money |
|---|---|---|---|
| 1 | `50000000000` | `13600000000` | £136,000,000 |
| 2 | `30000000000` | `3360000000` | £33,600,000 |
| 3 | `20000000000` | `712000000` | £7,120,000 |
| 4 | `15080000000` | `299000000` | £2,990,000 |
| 5 | `8070000000` | `77800000` | £778,000 |
| 6 | `5005000000` | `18700000` | £187,000 |
| 7 | `3000000000` | `2910000` | £29,100 |
| 8 | `1000000000` | `495000` | £4,950 |

Why it had to move: the old figures were **102%–3,674% of a club's entire season turnover** once
the turnover ladder was authored — tier 1 was £500,000,000 per club against a £388,661,540
turnover. TV alone exceeding all revenue makes the wage model meaningless, and the backend gate
refuses to let the model be flipped while that holds. The new figures are 35% of turnover at tier
1 down to 3% at tier 8.

**`tvPoolPence` is now populated on all 196 leagues**, as `tvDeal × slots`. It was already
populated at deploy, in fact — the migration backfilled it so that `tvPoolPence / slots` exactly
reproduced the then-current `tvDeal`. The null-pool paragraph was wrong about that too.

**What you should do:** nothing, if you read `tvDeal` and treat it as per-club pence. It is still
authored config that an operator can change, which is the point of this section — do not hardcode
or cache these figures, and prefer deriving nothing from them yourself.

> ⚠️ **Cached world packs lag behind this.** `tvDeal` is baked into every cached pack payload, and
> the version gate does not notice a config-only change. On dev, 60 of 200 packs are on the
> current version and still serving the OLD figure, so for now **a pack read and a live read can
> disagree about `tvDeal` by orders of magnitude.** A pack rebuild is in hand. If you see two
> different TV figures for the same league, that is this, not a bug in your code.

**Not** added to the cached world-pack league block — that surface is version-gated and a key
there would invalidate every country's cache for no benefit.

### Where `clubCount` comes from

Not from counting. A `League` row is a **template shared by every save** in its country and
tier — on 2026-11-12 England tier 8 had **147 real player clubs** pointing at one row. The
18-club table a player sees is assembled on the device. So the size is **authored**
(`league.slots`, with 0 meaning "derive from NPC rows + the player's slot").

---

## 6. ⚠️ Two unit traps

**`sponsorWeeklyPence` is WEEKLY. The six sponsor bands are PER SEASON.**

`smallSponsorMin`/`Max`, `mediumSponsorMin`/`Max`, `largeSponsorMin`/`Max` are a league
sponsor's **season total**, rolled at pack-build time and summed into `sponsorPot`.
`sponsorWeeklyPence` is a **per-week payout**. **They are not convertible by dividing by a
season length** — they describe different deals.

**`dofWageBillThresholdPct` is fractions (0.40), the economy block is basis points (6000).**
Deliberate: basis points exist where a figure is a link in an integer chain ending in pence,
while these are only ever compared against a ratio.

### Prefer the resolved figures over the flat ones

Two keys now have a per-country or per-tier counterpart. **Prefer the resolved one; keep the
flat one as the fallback.**

| flat (unchanged) | prefer | why |
|---|---|---|
| `smallSponsorMin`… (6 keys) | `economyTierBaseline.sponsorBandsPence` | the flat keys are country-agnostic, so offers rolled from them would disagree with the server's `sponsorPot` by exactly the country factor |
| `youthScholarshipWagePence` | `economyTierBaseline.tiers[].youthScholarshipPence` | see below |

**The youth scholarship was a real bug, at both ends.** The flat £250/week is **1.97× an average
England tier-8 wage** under the turnover model — a thirteen-year-old out-earning an average
professional — *and* **0.19% of an average tier-1 wage**, a rounding error. One absolute figure
cannot be right across a wage ladder that spans **1,047×**.

So `tiers[].youthScholarshipPence` is now derived in three steps: **anchored** at tier 1 (an
operator authors what a scholar costs at the top), then every lower tier is the same proportion
of its own average first-team wage; **floored**, because a pure proportion reaches £1.43 by tier
8 and free is a different mechanic from cheap; and **capped** at half an average professional's
wage, applied last so it always wins.

**Nothing for you to reproduce — read the key and charge it.** None of the three inputs is
published; they are authoring knobs. A worked ladder, anchored at £1,500 with a £25 floor:

| tier | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 |
|---|---|---|---|---|---|---|---|---|
| `youthScholarshipPence` | `150000` | `55473` | `18714` | `11039` | `4511` | `2500` | `2500` | `2500` |
| % of an average pro | 1.1% | 1.1% | 1.1% | 1.1% | 1.1% | 1.5% | 5.6% | 19.7% |

⚠️ **Today every tier publishes `25000`**, because all of this is gated on the turnover model and
every deployed box is on `legacy`. The per-tier key is currently £250 eight times over — it
starts differing the day the model is flipped, which is the day to be reading it rather than the
flat one. Build against the key now and nothing changes for you on flip day.

---

## 7. New endpoint: owner season investment

`GET`/`POST /api/club/season-investment`. **Full contract:
`wunderkind-backend/docs/api/season-investment.md`.**

The owner's account balance is separate from the club's. Once a season they may gift from it
into a club, up to a ceiling that scales with country and tier.

### Two things the app must get right

**1. `creditClubPence` is an INSTRUCTION, not a report.**

The server debits the owner's ledger. It **cannot** credit `club.balance` — the device owns that
column and `SyncService::process()` overwrites it absolutely on every sync, so a server-side
credit would vanish at the next sync with no authority left to repair it from.

**A client that ignores `creditClubPence` takes the player's money and gives them nothing.**

**2. The season is not a parameter and cannot be one.**

It comes from the backend's own count of concluded `SeasonRecord` rows. `club.currentSeason` is
device-mirrored, so a client that could name its season would both raise its own ceiling (the
ceiling grows with the inflation index) and unlock windows it never played.

Conclude a season → get a new window. No rollover; skipping is allowed.

### Response and errors

Both verbs return the same shape, so one code path renders the screen:

```json
{
  "invested": false, "season": 3, "investedPence": 0,
  "ceilingPence": 10000000, "remainingPence": 10000000, "balancePence": 184000000,
  "countryFactorBp": 10000, "tierFactorBp": 10000, "tier": 4,
  "creditClubPence": 0
}
```

| status | `error` | when |
|---|---|---|
| `400` | `amount_required` | missing or not whole pence |
| `400` | `invalid_amount` | zero or negative |
| `402` | `insufficient_credit` | carries `balancePence`, `requiredPence` |
| **`409`** | **`already_invested_this_season`** | a *different* amount for a season already invested in — carries `investedPence`, `season` |
| **`422`** | **`above_season_ceiling`** | over the ceiling — carries `amountPence`, `ceilingPence`, `season` |

**The two bold codes are new.** Both are **unreachable while the base ceiling is 0**, which is
the shipped state — so they can be built for before they can occur.

Idempotent on `(club, season)`: the same amount twice returns `200 invested: false` with the
original figure and no second debit.

---

## 8. Parachute payments

`parachute` on the same three uncached league payloads, resolved `league ?? gameConfig`
**whole-value** (a league override replaces the global entirely; it is not merged key by key).

**The backend serves this verbatim and does not read inside it.** No schema, no validation. The
backend cannot pay a club anything, so any structure it imposed would be a second opinion about
a schedule only the app can execute.

**So the app owns this shape.** The agreed starting point, documented but not enforced:

```json
{ "seasons": 3, "perSeasonPence": [550000000, 450000000, 200000000] }
```

Add keys freely — extending it needs no backend change at all. `null` today on every league,
meaning "no scheme configured" rather than an empty one to pay out.

---

## 9. One behaviour change to existing responses

**`POST /api/club/fund` → `projection.facilityUpkeepPerWeekPence` and
`projection.facilityUpkeepPence` rose exactly 50%.**

The server used `base × 1.5^(level−1)` while the app charges `base × 1.5^level`, so the server's
projection was 1.5× under the real charge. Same keys, changed values — logged as a deliberate
break. Nothing gates or refuses on the figure; it is a warning the funding screen renders.

**Everything else is additive.** No key was removed, renamed or retyped, and no request field
became required. `?country=` on `/api/game-config` is optional and omitting it is the previous
behaviour plus the new keys.

---

## 10. Three things still open

| | |
|---|---|
| **The wage formula's division of labour** | Backend publishes a scale + exponent; the app does the `pow()`. Derived by the backend — say now if you want a lookup table instead. |
| **`bankruptcyDeductionTiers`** | Two of its five rows **cannot fire** under the first-match-wins rule the backend documents, and the whole ladder is traversed in under half a week of unpaid wages at the top five tiers. **Needs an app-team answer: how does the app actually resolve overlapping rows?** The backend cannot tell. Analysis + a weeks-of-wages proposal in `wunderkind-backend/docs/economy-threshold-review.md`. |
| **Turning it on** | Nothing is authored. The operator procedure is `wunderkind-backend/docs/deploy/economy-rollout.md`, and the hard gate is that per-club TV currently exceeds any plausible tier-1 turnover, so the TV table must be re-authored first. |

---

## Reference

| what | where (in `wunderkind-backend`) |
|---|---|
| Every published key, with units and traps | `docs/api/economy-config.md` |
| Owner season investment | `docs/api/season-investment.md` |
| Threshold review + open findings | `docs/economy-threshold-review.md` |
| Operator rollout procedure | `docs/deploy/economy-rollout.md` |
| The gate command | `php bin/console app:economy:wage-table EN SC` |
| Admin screen | World → Economy |
