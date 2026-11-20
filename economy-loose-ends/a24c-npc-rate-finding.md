<!-- STATUS: 🟢 MEASURED, READ-ONLY ON PRICING. Diagnostics changed, NO pricing changed —
the owner has not ruled. Not committed yet. 2026-11-20 -->

# Two rates, one comparator, and a false pass in England

Answers to the PM's device-CHECKS questions from OTA 491 (England and Scotland saves). **Every
figure below is measured through the real pricing functions on the live SC payload. No pricing
was changed.**

---

## 0. The answer in one table

| | writes a non-scout NPC staff salary | writes an NPC scout salary |
|---|---|---|
| at world build | `resolveWorldStaffWagePence` → the band (`worldStore.ts:587`) | `resolveScoutWagePence` → the band (`worldStore.ts:614`) |
| then overwritten by | 🔴 `snapNpcStaffWages` at **bootstrap** (`SeasonBudgetService.ts:614`) and `anchorNpcStaffWages` at **every transition** (`:282`), both → `npcStaffWagePence` | **nothing — ever** |
| scales with the country? | ❌ **NO** — measured **EN/SC = 1.000** | ✅ yes, at the moment it is written |
| so a stored row is | the club's own income share, country-blind | a band figure **frozen at build-time scale** |

**Both observations come out of that one table**, and neither is a mispriced wage:

- **England, scouts 1.00** — the build-time config and the current config agree. ⚠️ **A FALSE
  PASS**, and it is the second time a non-England country has exposed what England could not.
- **Scotland, scouts exactly 10.00** — the build-time scale was 10× the current SC scale.
- **Staff 0.42–0.67 (EN) and 3.65–4.75 (SC)** — the SAME income-share figure against a
  comparator that is itself 10× smaller in Scotland. That is the ×10, not a second defect.

---

## 1. Which scale does each path resolve against, and is `country` in it?

### `resolveEconomy` has NO country parameter — `src/economy/economyConfig.ts:154`

```ts
export function resolveEconomy(config: GameConfig, tier: number): ResolvedEconomy {
  const baseline = config.economyTierBaseline ?? null;
  const row = tierRowFor(baseline?.tiers, tier);
```

**Country is not an argument anywhere in the app's pricing path.** It enters ONLY through
`config.economyTierBaseline`, which the device fetched with `?country=`. So every app-side wage
is "country-scaled" exactly as far as the stored config block is the right country's — and no
further.

### The scout write path, and it IS country-aware

`src/stores/worldStore.ts:614` → `resolveScoutWagePence({ ability, … }, packEconomy)`, where
`packEconomy = resolveEconomy(config, leagueData.tier)` (`:465`) and `config` is the synced,
country-resolved block. → `tierStaffWeeklyWagePence` → `weeklyWageRange`, which is **exactly
linear in `wageScaleMicroPence`**:

```
--- tier 1  SC scale=126972564 EN scale=1269725640
ab 33: band SC=423636  EN=4236366  (EN/SC=10.000)
ab 43: band SC=615802  EN=6158019  (EN/SC=10.000)
ab 66: band SC=1797338 EN=17973378 (EN/SC=10.000)
ab 72: band SC=2234092 EN=22340923 (EN/SC=10.000)
--- tier 4  SC scale=92573014 EN scale=925730140
ab 33: band SC=308864  EN=3088645  (EN/SC=10.000)   … same at every ability
```

🔴 **So the 10.00 is NOT country-blindness in the write path. It is a STALE WRITE.** A scout's
salary is written once at world build and **never re-priced** — nothing re-anchors
`club.scouts` — while the panel's comparator resolves against the config the device holds *now*.
Because the band is exactly linear in the scale, **the ratio IS the scale change**: 10.00 is
"this was written against a scale ten times the current one."

### The backend's `ScoutWageCalculator` takes no country at all — and that is by design

```php
public function weeklyWageFor(int $ability, ?PoolConfig $config = null): int
```

`PoolConfig::$scoutWageMin/Max` is a single global pair; there is no country parameter and no
country-scaled variant. **Stated plainly because the PM asked for it plainly.** It is not the
defect here, for two reasons: a country factor IS applied on the way out by
`MarketDataService::scalePoolWage()` (whose docblock says pool rows "cannot be priced at
generation" because one row is served to every country), and **pack scouts never carry that
figure at all** — `buildScoutSnapshot` sends no wage, so an NPC club scout is priced on device.

### 🟢 The legacy-pack confound is ELIMINATED, not assumed away

The Scottish pack is legacy-priced and the panel rightly FAILs on it. That cannot explain the
scout ratio: under `legacy`, `tierStaffWeeklyWagePence` returns `undefined` by design and a scout
falls to `fallbackScoutWeeklyWagePence`, measured **3,985–5,740p** across these abilities — which
against the SC band is **0.002–0.01**, not 10.00. A legacy-priced write cannot produce 10.00. The
stored figure must be a **turnover band figure at 10× the current scale.**

---

## 2. The non-scout staff rate, and the ~0.45

`npcStaffWagePence` — `src/engine/ClubWageScaleService.ts:192`, reached from
`snapNpcStaffWages` (`SeasonBudgetService.ts:633`) and `anchorNpcStaffWages` (`:193`).

**Measured: exactly invariant to the config's wage scale.**

```
ab 33: npcRate SC=48100  EN=48100  (EN/SC=1.000)
ab 43: npcRate SC=77200  EN=77200  (EN/SC=1.000)
ab 66: npcRate SC=134012 EN=134012 (EN/SC=1.000)
ab 72: npcRate SC=144875 EN=144875 (EN/SC=1.000)
```

Of course it is: it divides the club's own `wageReservationPence` across its roster in proportion
to `ability^k`. That is the club's money, not the country's scale.

### 🔴 There is no 0.45 constant to find, and that CORRECTS the PM's inference

The PM's reasoning was: *"A club-income-dependent NPC discount would not hold a near-constant
factor across a tenfold scale change. So reading 1 is the live one."*

**It did not hold constant — it moved by exactly the ×10, and the PM's own numbers show it:
0.42–0.67 in England against 3.65–4.75 in Scotland.** That is 0.45 → 4.5. So an
income-dependent rate is *precisely* what those figures look like, and **reading 2 survives for
staff. Reading 1 is not needed to explain them.**

What the factor actually is:

```
stored/band  =  (club's staff wage share ÷ weeks, split by ability^k)  ÷  (the tier's band rate)
                 ^ the club's own money, country-blind                    ^ scales with country
```

Two unrelated quantities. It **clusters within a country** because NPC clubs in one country have
similar derived income, and it **moves by the scale factor between countries**. On a synthetic
£400,000 reservation I measured 0.065–0.172; the device's real England clubs gave 0.42–0.67.
**Both are the mechanism working.** Reporting a single cause for it would be inventing one.

---

## 3. 🔴 Would a regenerated Scottish pack FIX the 10× or HIDE it? — split by role

This is the question that matters and the answer differs per role.

### Scouts — it would genuinely fix it, and would NOT fix the defect underneath

The write path reads the live country-resolved config (§1), so rebuilding the world while the
device holds SC's config writes SC-scaled scout salaries and the ratio becomes 1.00 **correctly**,
not cosmetically.

⚠️ **But it is a RESET, not a repair.** The durable defect is that **a scout's salary is never
re-priced** while every other staff salary is re-anchored at bootstrap and at each transition. So
the next config change — a re-sync, a country change, a backend re-authoring of
`wageScaleMicroPence` — silently re-opens the identical 10× gap, and nothing will say so. **The
fix for that is to re-anchor `club.scouts` alongside `club.staff`, which is a pricing change and
is NOT mine to make.**

### Staff — regeneration would fix nothing at all

`npcStaffWagePence` is scale-invariant **by construction** (measured 1.000), so NPC staff will sit
off-band by a country-dependent factor no matter how fresh the pack is. A regenerated pack is
re-snapped to the same income share within one bootstrap.

**So the PM's concern is half right, and the half that matters:** regeneration makes the scout
symptom vanish for one config generation and does nothing whatever for staff. Recommending it as
*the* remedy would retire a symptom and leave two mechanisms in place.

### ⚠️ What would settle the CAUSE of the Scottish save's stale scale, which I did NOT confirm

The leading hypothesis is that the Scottish world was built while the device held a **country-less
(base-scale) economy block** and the config was later re-synced to SC — a known, reachable state,
which is why `isCountryResolved` exists and why the ECONOMY section FAILs on it. **I have not
confirmed it and will not guess:** the cheap decisive test is already on that device. Read the
ECONOMY section of the same save's CHECKS and report `economyTierBaseline.country` and the
country-resolved row. If it says SC today, then the build happened before the re-sync and the
hypothesis holds; if it says England, the save is simply holding the wrong country's block and
that is a different and worse finding.

---

## 4. What I changed — diagnostics ONLY

**No pricing changed. The owner has not ruled.**

`src/economy/economyDiagnostics.ts` + its suite:

1. **The panel computes BOTH rates and ratios against whichever GOVERNS the row.** A staff row
   reports `stored/npc-anchored`, with `stored/band` printed beside it explicitly labelled *NOT
   the governing rate*. **A diagnostic that reads 0.48 for a correct wage is worse than no
   diagnostic**, which is the PM's phrasing and the reason this was worth doing.
2. **The prose says what it measured, not what was intended.** The claim *"Since A24 this is the
   SAME function for both roles"* is gone, replaced by the §0 table: two rates, which writes
   which, and that every sampled row belongs to an NPC club (the panel reads `worldStore.clubs`;
   the player's own club is in `clubStore`).
3. 🟢 **A scout off the band now READS as what it is: a STALE WRITE.** New line and new test —
   because the band is exactly linear in the scale, an off-band scout means the config moved
   since the world was built, and the ratio is that scale change. This is the one reading nothing
   else on the device can give, and it is what would have caught Scotland without a second
   country.
4. **England's 1.00 is called a false pass in the panel's own text**, so the next reader does not
   take it as evidence.

The ladder row is unchanged and working: it printed −20% at ability 25, −25% at 40, and four of
sixteen rows on the catch-all above 60 — exactly what it was built to surface.

---

## 5. What I did NOT do

1. **No pricing change**, per instruction. In particular I did **not** re-anchor `club.scouts`,
   which is the real fix for §3, and did not touch `npcStaffWagePence`.
2. **Did not reprice non-scout staff onto the band.** That means overruling
   `snapNpcStaffWages`/`anchorNpcStaffWages`, whose docblock says NPC clubs have no DOF pot so the
   budget ruling's Step 3 does not reach them. It re-prices every staff member at ~1,100 clubs.
   **Owner's ruling, not mine.**
3. **Did not confirm the cause of the Scottish stale scale** (§3's last block) — the decisive
   reading is on the device, not in the code.
4. **Did not treat Scotland's absolute figures as evidence.** Per the PM: the pack is
   legacy-priced, so the player-valuation 9.39–10.52 and wage-coverage 873–974% are explained by
   that and are not calibration findings. Only the RATIOS are used above, and §1 eliminates the
   legacy pack as their cause.

---

## 6. 🔴 Carried forward — the NPC wage bill ignores scouts entirely

Found while tracing, unrelated to the ratios and arguably more consequential.

`computeNpcWageBill` (`src/utils/npcFinances.ts:64`) sums `club.players` + `club.staff` — **not
`club.scouts`**.

🟢 **Good news:** my adding `WorldScout.salary` therefore did NOT move any NPC budget.
🔴 **Bad news:** every NPC club now carries priced scouts that its own wage bill,
`projectedWagePence`, derived budget and affordability gate all ignore. That is the same defect
`Scout::$weeklySalary` was added on 2026-11-05 to close for the AMP funding projection, still open
on the NPC side — and `buildNpcAffordabilityBase`'s docblock already records what a too-low wage
bill does: the gate *"consistently believed clubs were richer than they were and waved through
signings that drained them."*

**Flagged, not fixed.**
