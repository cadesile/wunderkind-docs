<!-- STATUS --> **STATUS:**  📋 REFERENCE — the older backlog; `next-work-plan.md` supersedes it for economy work.

---

# Economy — what is left (2026-11-16)

**The only file in this directory.** It replaces `COVERAGE-DIALS.md`, `F7-device-pass.md`,
`F8-tier8-income-trace.md`, `F9-prize-pool-forecast-fix.md`, `step7-approved-tables.json` and the
income-truth prompt, all of which described work that is now **done, superseded, or recorded in
`.context/`**. The detailed traces live on in the app's
`.context/stages/07_synthesis/output/game-mechanics.md` §13 and in the commit messages on
`new-game-save`; nothing below depends on the deleted files.

## Where things stand

| | |
|---|---|
| App | `dev` and `new-game-save` both at **`a3acb25a`** |
| OTA | **480** (run `43980418145`) — supersedes 479 |
| Suite | 636 suites / 10,627 tests, `tsc` clean |
| Backend | **`740f2c8e`** on `development`, pushed (was `4be0c19c`, docs only) |

**Landed since, backend (2026-11-17/18):** the prize ladder (§3) as `5dc3f51b`; tier-banded staff
pay (`5157fbfb`, pack v8) and tier-banded scout experience (`740f2c8e`, pack v9); world packs as
single-use sets (`8ff2e5fd`). **§2's dials are now re-derived** — 2026-11-18, below. Everything
else in §3 to §5 is open.

✅ **Chosen 2026-11-18: candidate C** (§2e). The authoring run is **`candidate-c-rollout.md`** —
read its §0 first; the one input this derivation could not see is what
`npcFacilityLevelRanges` holds today, and it is backend-only.

⚠️ **The prize ladder landing takes the variant gate from PASS to FAIL on today's other inputs**,
and that is measured, not predicted: see §2. It is not a reason to revert it — it is the reason
dial 4 is now load-bearing.

**Landed in this batch:** shirt sales collapsed to one function with a tier-linked price; the
forecast's three defects (flat league prize paid to every club, a season tax charged while the
pyramid pass is disabled, a club count one short); the gate's income model corrected for shirts,
prepaid seats, real home-game counts and the `incomeAnchoredWages` labelling.

---

# 1. Device pass — the sheet

⚠️ **Three pins on the existing sheet are now WRONG. Fix them before testing.**

| field | old (wrong) | correct |
|---|---|---|
| OTA / SHA | 479 · `6f11e58` | **480 · `a3acb25`** |
| `incomeAnchoredWages` | "OFF — an absent key resolves false" | ⚠️ **ON.** An absent key **derives** from `wageModel`, which is `turnover`. The device's Economy Workings panel confirms it |
| tier-8 COVERAGE | 676% | **534.9%** |

Unchanged pins: channel `dev` · `api.dev.buildmyclub.co.uk` · `WORLD_PACK_VERSION` **6** ·
`PYRAMID_DISTRIBUTION_ENABLED` **false**.

The build number and SHA show on the splash and debug header. `EXPO_PUBLIC_BUILD_NUMBER` moves
once per publish, not per APK build, so that pair is the only reliable answer to "did my update
land" — `expo.version` does not move with an OTA.

## 1a. New rows for THIS batch

### Row D — shirt price follows the division *(new, highest value)*
- **Setup** — new save, tier 8, England. Open Finances → Pricing.
- **Expect** — shirt price **£7.88**, not £45. The Chairman's shirt advice beside it should read
  the same figure; those two used to come from different tier systems and disagree.
- **Also** — the `+` stepper must **stop at 2× the advice**. It previously had no ceiling at all.
- **Fails if** — £45 anywhere, or the stepper passes the cap.

### Row E — season-1 ledger on a FRESH save *(the one that catches the most)*
- **Setup** — brand-new tier-8 save. Open the ledger at the first season boundary.
- **Expect** — `Season shirt sales` roughly **£70,920 gross** at a 15,000 fan base (was ~£516,900),
  with `Shirt manufacturing cost` at 40–50% of it. A `Season ticket sales` row. **No flat league
  prize.**
- **⚠️ Record** — the exact `fanCount`, `morale`, `shirtPrice` and `ticketPrice`. These are save
  state and cannot be derived from the repo; they are the last inputs missing from the trace.

### Row F — the Budget card reads "over-committed: no"
- **Setup** — the same fresh tier-8 save. Finances → Budgets.
- **Expect (HYPOTHESIS, unverified)** — `over-committed` **no**, and a small positive surplus.
  ⚠️ The figures below were computed **before shirt scaling**. Shirt net used to be about 1.35×
  turnover; at 15,000 fans it is now about £40k net, so income may fall back under the
  **£1,077,687 threshold** and read "yes". The agent never reported the budget recomputed after
  all three commits. **Record the actual income basis, wage share, wage floor and surplus** whatever
  the answer. If it reads "yes", it is not a regression from these fixes: the committed wage bill
  (about £14k/wk, roughly 3.9× authored turnover) is the real question, and Row G answers it.
- **⚠️ Why this row exists** — removing the league prize *without* also gating the season tax
  drives the season-end lump negative, which makes `SeasonBudgetService` refuse the bootstrap
  budget. A club with no stored budget has no reservation for `allocatableBalancePence` to
  subtract, **so its spending pots GROW**. Both fixes shipped together for this reason. On the
  reference club the figures are income £1,228,480, wage share £737,088, surplus **+£72,907**;
  prize-removed-alone would have given **−£111,296**.
- **Fails if** — pots larger than before the update, or a budget refused at bootstrap.
  `over-committed: yes` is a finding to record, not an automatic fail (see the hypothesis above).

### Row G — squad abilities and wages *(answers an open question, see §4)*
- **Setup** — any tier-8 save. Squad, with the ability and wage columns visible.
- **Capture** — each player's ability and weekly wage. Nothing to assert; this settles whether
  the player's ~£14k/wk committed bill against an NPC's ~£1.7k is squad composition (expected:
  at `k = 2.5` an ability-7 player costs 6.1× an ability-3 one) or something else.

## 1b. Rows carried forward, still valid

**Closed:** the RANDOM CLUB loader bleed-through (F5.3) was fixed by the owner.

**Rows that need editing before use** — named by what they assert, since the sheet is in neither
repo:

1. **Any row asserting a ticket price**, or a matchday figure from one. Clubs no longer start at
   a flat £25: **£80 at tier 1 down to £14 at tier 8**. A row expecting £25 is wrong at every tier.
2. **Any row asserting sponsor income.** Per-division since 2026-11-15; expected club + league
   sponsorship is ~22% of authored turnover at tiers 6–8.
3. **Every row asserting a contract demand or "market rate".** Anchored on market value with a
   premium bounded **+25% to +50%**, positioned by form over a 5-appearance window; no
   appearances sits at the floor. **A player never asks for less than market.** Any row expecting
   a multiple of market is a FAILURE condition.
4. **Any row reading the Budget screen** — three numbered steps now, two captions changed.
5. **Any row asserting a budget pot** — pots divide `allocatableBalancePence` (balance − committed
   wages − maintenance, floored at 0), **not** the whole balance, and **not** income.
6. **Any row expecting a season-end pyramid distribution** — the mechanic is OFF, both halves.
7. **Any row listing staff requirements** — reads configured roles now, not a hardcoded list.
8. **New-game club naming** — duplicates gone; the land step has a RANDOMISE button.

**Row A — tier-8 published ticket price.** Expect **£14**, not £25 and not £80; no ~39%
elasticity penalty. Fails if £25 (pack not re-warmed, or a cached pack at version 5).

**Row B — parachutes across two seasons.** Nothing in the season of relegation; instalment 1 at
the end of the NEXT season on a 60/40/20 taper, at **60% of the turnover of the division relegated
INTO** (tier 8 → £98,911; tier 3 → £21,345,961). On promotion the entitlement is dropped — a
judgement call, not authored. ⚠️ **Never exercised**: parachutes were fully built and never paid
until 2026-11-16, because no caller passed the argument.

**Row C — NPC rescues, first two seasons.** Expect **zero** at every tier; a rescue fires only on
`balance < 0` at season end. ⚠️ **Do not read zero as healthy** — it is zero because the lower
tiers are over-funded. Caveat: the harness models one representative club per tier, no transfers,
no matchday variance, no injury load, balance starting at zero. Zero is a **lower bound on
trouble**.

## 1c. Gate reference column — current

Run on `game-config-en.LIVE.json` + `world.json`, default mode. **FLIPPED is today's arm.**

| tier | COVERAGE (was) | COVERAGE (now) | s1 bill% today | rescue? |
|---|---|---|---|---|
| 1 | 72.8% ⚠️ | **73.0%** ⚠️ | 64.9% | no |
| 2 | 89.7% | **85.4%** | 71.4% | no |
| 3 | 94.7% | **94.4%** | 67.6% | no |
| 4 | 106.2% | **101.0%** | 71.2% | no |
| 5 | 106.4% | **99.5%** | 73.3% | no |
| 6 | 222.9% ⚠️ | **192.2%** ⚠️ | 77.6% | no |
| 7 | 284.7% ⚠️ | **254.6%** ⚠️ | 80.7% | no |
| 8 | 676.0% ⚠️ | **534.9%** ⚠️ | 91.7% | no |

No tier insolvent over 30 seasons. COVERAGE outside 85–110% at tiers **1, 6, 7, 8** is accepted
for this pass.

⚠️ **This column is the state of the SHIPPED app against the Nov-15 exports, and it is already
behind the backend.** The landed prize ladder is not in `world.json` yet, so a fresh export moves
this table to the §2b row — tiers 2 and 3 leave the band and tier 8 stops being solvent. Turnover
re-authoring is no longer "the only thing that closes it": dial 4 is what restores the verdict,
and dial 1 is what closes the band. Both are derived in §2.

---

# 2. Coverage dials — RE-DERIVED 2026-11-18

**The approved step-7 tables are already LIVE and need no action.** Verified against
`game-config-en.LIVE.json`: `economyTicketPriceTier1Pence` 8000 with ratios
`[10000, 7500, 5625, 4375, 3500, 2750, 2000, 1750]` produces the live £80→£14 ladder exactly, and
the sponsor bands and `economySponsorTierRatioBp` are in place. That file is retired.

Every dial had been solved against the old gate numerator, which omitted shirt sales entirely
while charging every seat full face price. Both corrections are in, they move different tiers in
**opposite** directions, and the prize ladder has since landed, so the whole set is re-solved
below against the gate as it stands.

## 2a. The method, and why dial 1 needs no search

Reproduce any run with `dials/run.sh` (usage in its header; it patches COPIES, touches neither
repo). Every figure below is a `variantGate.ts` run on `game-config-en.LIVE.json` +
`starter-config.LIVE.json` + `world.json`, EN, FINISH=10.

Dial 1 is **solved, not searched**, because in the harness no modelled income line depends on
authored turnover:

- `tvPerClubPence` is carried from the `ENGLAND_DEV` fixture, not from `economyTierBaseline`;
- the sponsor bands, the ticket price and the fan base are authored absolutes;
- matchday and shirts come from the ground, the price and the fan base;
- **the wage bill comes from `wageScaleMicroPence`, never from `turnoverPence`** —
  `loadExport.ts` builds `turnoverAvgWeeklyPence` through `weeklyWageRange`, so turnover is the
  COVERAGE denominator and the authored arm's credited revenue, and nothing else.

The one line that does follow turnover is the payout, now that the backend authors prize and pot
at `0.2573 ×` each tier's own turnover (§3). At FINISH=10 the champion's prize is 0 and the
position pot pays `pot × (1 − 0.10 × 9)`, so it contributes a flat **2.573%** of turnover at
every tier. Hence, with `F` = TV + matchday + shirt + sponsorship (invariant to turnover):

```
COVERAGE(T) = F / T + 0.02573        →        T = F / (COVERAGE − 0.02573)
```

At a 97.5% target (mid-band) that is `T = 1.0534 × F`. One gate run per candidate geometry gives
`F`; the table below is that arithmetic, and the verification runs land every tier at 97.2–97.6%.
**Cross-check:** at tier 1 this reproduces the old dial-1 value (£288m against the £290m solved
against the old numerator), which is expected — tier 1 was the one tier the income-truth
corrections nearly cancelled on.

## 2b. Dial 2 is LANDED, and on its own it breaks the gate

`5dc3f51b` authors prize = pot = `0.2573 × turnover` at every tier (tier-1 base £100,000,000, ppm
ladder `[1000000, 309000, 91500, 51200, 18200, 6020, 1500, 424]`). Patching `world.json`'s league
rows to those figures reproduces it to within rounding (tier 8 £42,416 against the authored
£42,400). Measured, with nothing else changed:

| tier | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 |
|---|---|---|---|---|---|---|---|---|
| COVERAGE before | 73.0% | 85.4% | 94.4% | 101.0% | 99.5% | 192.2% | 254.6% | 534.9% |
| COVERAGE after | 73.0% | **81.3%** | **82.9%** | 88.5% | 87.9% | 157.6% | 171.4% | 416.2% |

⚠️ **Two results nobody had:** tiers 2 and 3 FALL OUT of the band (they were in it), because the
old ladder was over-paying the middle too; and **tier 8 goes insolvent in season 1** under FLIPPED
— balance −£153,126, bill 100.7% of income — because the cut removed 118 points of income while
upkeep stayed put, taking upkeep from 31.7% to **40.7% of income** against a 60% wage share. The
gate's verdict goes **PASS → FAIL** on the prize fix alone. Dial 4 is what pays for it.

## 2c. Dial 3 as specified makes it worse — measured, not argued

Stand band `0–1` per stand at tiers 7–8 (mean total stand levels 4.89 → 2.00) does cut tier-8
matchday 365.0% → 162.6% of turnover. It also:

| | tier 7 | tier 8 |
|---|---|---|
| upkeep ÷ income, before | 30.7% | 40.7% |
| upkeep ÷ income, dial 3 alone | **42.5%** | **64.9%** |
| upkeep ÷ income, dial 3 + the six exclusions | 27.1% | **40.6%** |

At tier 8 the four stands are 33% of upkeep but matchday is 87% of income, so shrinking the ground
cuts income about 2.6× faster than it cuts the bill. **Dial 3 alone puts tiers 7 AND 8 insolvent,
and dial 3 plus the six exclusions still leaves tier 8 insolvent.** It is not "over-sized" as this
file previously recorded — it is unsafe without a deeper dial 4 beside it. It is in candidate C
below, paid for.

## 2d. Dial 4 is now load-bearing, and it is what restores PASS

Excluding six facilities at tiers 7–8 — `scouting_center`, `scout_fleet`, `imaging_suite`,
`player_wellbeing`, `nutrition_centre`, `technical_zone` (the imaging suite and the scout fleet
are the two §13.2 already named as implausible) — removes 31% of tier-8 upkeep and **no matchday
at all**, since none of the six is a stand, shop or car park:

| | tier 7 | tier 8 |
|---|---|---|
| upkeep ÷ income | 30.7% → **21.7%** | 40.7% → **28.2%** |
| FLIPPED bill% | 90.7% → 81.7% | 100.7% → **88.2%** |

That alone takes the gate back to PASS with the landed prize ladder and no other change.

⚠️ **The upkeep floor is the real constraint on how poor the bottom tier can be.** Upkeep is
`weeklyUpkeepBase × 1.5^level × tierFactor` with the tier factor **anchored at 1.0 at tier 8** —
deliberately, because `POST /api/club/fund`'s projection is read at FOUND CLUB — so it cannot be
lowered there without breaking the one figure the player sees when they commit real money. A
bottom-tier club holding a plausible ground (8–11 facilities around level 1) pays £110k–£145k a
season to run it, which with a 60% wage share puts a floor of roughly **£300k of season income**,
and therefore of about **£360k of authored turnover**, on tier 8. Today's £164,852 is below that
floor: no turnover table can leave tier 8 that poor while keeping it solvent. Moving it needs
`weeklyUpkeepBase` itself (a global column, scaled up the pyramid by the tier factor), not a dial.

## 2e. Dial 1 — the two candidates, both verified

Tiers 1–6 are identical in both; they differ only in whether dial 3 is entered at tiers 7–8.
Every value is 3 s.f., as the TV and ratio tables are.

| tier | authored turnover today | **candidate B** | **candidate C** | ×today (B / C) |
|---|---|---|---|---|
| 1 | £388,661,540 | **£288,000,000** | **£288,000,000** | 0.74 / 0.74 |
| 2 | £120,049,757 | **£99,500,000** | **£99,500,000** | 0.83 / 0.83 |
| 3 | £35,576,602 | **£30,100,000** | **£30,100,000** | 0.85 / 0.85 |
| 4 | £19,909,009 | **£18,000,000** | **£18,000,000** | 0.90 / 0.90 |
| 5 | £7,071,796 | **£6,360,000** | **£6,360,000** | 0.90 / 0.90 |
| 6 | £2,339,899 | **£3,820,000** | **£3,820,000** | 1.63 / 1.63 |
| 7 | £582,785 | **£1,040,000** | **£602,000** | 1.79 / 1.03 |
| 8 | £164,852 | **£718,000** | **£361,000** | 4.36 / 2.19 |
| | spread t1 ÷ t8 | 401× | 798× | today 2,357× |

**Candidate B** — grounds as generated, six exclusions at tiers 7–8.
**Candidate C** — B plus dial 3 (stand band `0–1` at tiers 7–8, so a 2,500-seat ground) and three
further exclusions at tier 8 only (`youth_academy`, `trial_pitch`, `car_park`), leaving a tier-8
club with eight facilities: four small stands, a training pitch, a physio room, a club shop and a
tactical room. That is both the more plausible bottom-tier club and the steeper pyramid.

✅ **CHOSEN 2026-11-18: candidate C.** The authoring run, step by step, with the exact tables, the
pinned gate expectation and what it deliberately does not do: **`candidate-c-rollout.md`**; the
backend prompt that lands it, **`candidate-c-authoring-prompt.md`**.

⚠️ **C's turnover ladder FAILS `app:economy:wage-table` check 1 at tiers 2, 6 and 8, and no ladder
can pass both that check and this 85–110% band.** Found while writing the prompt, which carries the
three resolutions; the rollout doc opens with the numbers. `S_tier` is derived from the turnover row
and must fall strictly, so the turnover ladder and the ability bands decide it together — and the
bands (`40-90 … 10-15 · 5-10 · 2-7`) flatten at the bottom far faster than the grounds' income does.
Either the bottom bands are re-authored (tier 6 → 10–20, tier 8 → 4–9, a squad-quality change that
also moves staff pay) or tiers 6 and 8 stay out of band on a chain-maximal ladder
(£331m … £686,000 · £215,000, coverage 137.5% / 162.1%, verified PASS). **The recommendation is the
second**, because the first is a balance decision wearing an economy costume.

✅ **RESOLVED (owner, 2026-11-18): R2**, and the implementation brief is
**`r2-economy-authoring-brief.md`** — self-contained, R2's tables substituted throughout, written to
be handed to an engineer session on its own. Re-authoring the bottom ability bands (R1) stays open
as a BALANCE question, not an economy one: it is the only thing that would bring tiers 6 and 8 into
the coverage band, and it moves squad quality and staff pay with it.

⚠️ **C's tier-7 figure is £596,000, not the £602,000 above, and the rollout doc carries the
authorable table.** `npcFacilityLevelRanges` is keyed by BAND — tiers 7 and 8 together — and has no
country dimension, so the three extra exclusions cannot be applied to tier 8 alone. C was re-solved
with nine exclusions at BOTH tiers (`dials/run.sh cand-c-authorable`): tier 7 moves £602,000 →
£596,000, every other tier is identical, and the verdict is unchanged. Nothing needs a new
per-tier override dimension.

Verified, both: **COVERAGE 97.2–97.6% at every tier, "outside 85-110%: none", no tier insolvent
over 30 seasons, PASS**, and upkeep ÷ income monotone down the pyramid (4.9% → 27.6% in B,
→ 31.9% in C).

## 2f. Dial 1's dependents — what MUST move with it, and what must not

**Must move, or the config contradicts itself:**

1. **`wageScaleMicroPence` — ✅ and it moves BY ITSELF, which is better than it sounds.**
   Corrected 2026-11-18, after reading the resolver rather than inferring from the export:
   `EconomyScaleResolver::wageScaleMicroPence()` computes
   `S_tier = playerBudget / (weeksPerSeason × Σ ability^k)` **from the turnover row**, so
   re-authoring turnover moves it by exactly `T_new / T_old` with no second authoring action, and
   the youth scholarship anchor follows the average wage with it. The gate's `--wage-scale-follow`
   is therefore a MODEL of what the backend will publish, not a table to type in — and the figures
   below are predictions to check the published export against. Without it the gate's flat 60.0%
   row spreads to **13.8%–81.0%**, which is why the run that omits it is the wrong model of the
   change, not an option for shipping it.

   | tier | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 |
   |---|---|---|---|---|---|---|---|---|
   | today | 390404650 | 349216683 | 312374073 | 279418383 | 249939558 | 223570772 | 199984018 | 178885951 |
   | cand. B | 289291653 | 289438820 | 264287736 | 252625879 | 224782444 | 364990262 | 356878401 | 779123777 |
   | cand. C | 289291653 | 289438820 | 264287736 | 252625879 | 224782444 | 364990262 | 206577690 | 391732150 |

   ⚠️ **This is a real balance change, not bookkeeping: it is what a tier-8 starting squad costs.**
   Bottom-tier wages rise 4.36× (B) or 2.19× (C). Under `incomeAnchoredWages` ON it reaches only
   season-1 squads and renewals, which converge over about three seasons — the gate's FLIPPED
   balances are identical with and without it.
   ⚠️ **And the new ladder is NOT monotone** (tier 8's scale ends above tier 1's, 2.7× in B),
   because turnover's new ladder is far flatter than the ability bands it is divided by. It is
   internally consistent — the 60.0% row proves that — but it means an ability-7 player is priced
   higher in tier 8 than the same ability would be in tier 1, so a promoted club's renewals get
   CHEAPER. Decide that deliberately; the alternative is re-opening the ability bands, which the
   backend has just re-authored (`e9d81c2a`, gap-fill only, EN untouched).
   ⚠️ **The Economy admin already has an alarm for exactly this and it will fire three times** —
   `buildPreview()` warns when a tier's scale does not fall, so candidate C prints *"Tier N pays
   MORE per unit of ability than tier N−1"* at tiers **2, 6 and 8**. Expected, not a mis-entry. The
   average authored wage per player still falls monotonically, £144,482/wk at tier 1 to £277/wk at
   tier 8.
2. **The prize/position ppm ladder, re-derived as the new turnover normalised to tier 1.** The
   authored `[1000000, 309000, …, 424]` IS today's turnover ladder, so dial 1 silently invalidates
   it. Candidate B: `[1000000, 345486, 104514, 62500, 22083, 13264, 3611, 2493]`. Candidate C:
   `…, 2090, 1253]` for tiers 7–8. The tier-1 base `£100,000,000` becomes **£74,102,400**
   (`0.2573 × £288,000,000`).
3. **The youth scholarship anchor** follows wages, not turnover, so it moves with (1) —
   `economyYouthScholarshipTier1Pence` + the cap re-checked by `app:economy:wage-table`.

**Must NOT be chased, and this corrects the rollout note's warning:**

4. **`economySponsorTierRatioBp` — leave it.** Re-authoring turnover moves sponsorship's SHARE of
   turnover (29.7% at tier 1, 10.0% at tier 8, from 22% at both). Chasing a flat 22% would need
   tier-8 bands at 5.4× — a £194k/yr sponsorship for a bottom-tier club, which is less credible
   than the £36k it draws now. The "22% at both ends" property was an artefact of a tier-8
   turnover that was too low, not a target. 29.7% commercial at the top is about right for a
   top-flight club.
5. **TV — leave it.** Its share moves 35.0% → 47.2% at tier 1 and 3.0% → 0.7% at tier 8, both
   defensible (a top flight is broadcast-led; a bottom division has no TV deal). `tvPoolPence /
   slots === tvDeal` still holds and nothing about the pool changes.

## 2g. Status

| dial | status |
|---|---|
| **1. Turnover table** | **Re-derived** — two verified candidates, §2e, with the dependents in §2f. ⚠️ **Both fail `app:economy:wage-table` check 1**, and the band cannot be reconciled with it; §2e's banner and `candidate-c-authoring-prompt.md` §1 carry the three resolutions |
| **2. Position-money pot** | **LANDED** (`5dc3f51b`) — and it is what takes the gate to FAIL until dial 4 lands, §2b |
| **3. Stand levels** | **Re-derived, and the earlier reading corrected.** Not over-sized — unsafe alone. In candidate C, paid for by three more exclusions, §2c |
| **4. Facilities excluded at the bottom** | **Derived and now load-bearing** — the six at tiers 7–8 restore PASS on their own, §2d |
| **5. NPC facility upgrades** | **Done** — shipped code, not a dial |

## 2h. What the gate still cannot see about any of this

- **The grounds it measures are NPC grounds.** The player's own stadium is bought in the v3 setup
  flow, so the player's matchday is not bounded by dial 3 at all. That is consistent — under
  income-anchored wages a club that builds more earns more and is budgeted more — but COVERAGE is
  an authoring check on the NPC pyramid, not a statement about the player's club.
- **It holds a ground fixed for 30 seasons** (§13.3): any PASS is a day-one measurement, and
  confirming the bottom of the pyramid stays put still needs a played-in world re-measured after
  several seasons.
- **Its league money comes from `world.json`**, so the landed prize ladder only reaches it through
  the patch in `dials/patch.mjs` until a fresh export lands. The RESCALE factor is 1.000× today,
  so the tier-1 TV figures already agree.
- **Income is a FLOOR** — investor income, win bonus, the pyramid payout, tournament prize and
  four more lines are unmodelled. A tier that passes here certainly pays.
- **Dial 4 has gameplay consequences this run cannot price**: a tier-8 NPC club with no
  `youth_academy` (candidate C) has no youth intake, and none at tiers 7–8 with a `scouting_center`
  changes how NPCs scout. Both are world-generation authoring decisions, not economy ones.

---

# 3. Backend authoring — ✅ LANDED 2026-11-17

**Landed as `5dc3f51b` on `development`** (pushed), exactly as decided below: `LeaguePayoutResolver`,
a tier-1 base of £100,000,000 for both figures, the ppm ladder
`[1000000, 309000, 91500, 51200, 18200, 6020, 1500, 424]`, NULL = inherit with a one-time
normalisation of the per-league columns, the country factor applied once, and the split-the-money
division that keeps one truncation per figure. Tier 8 goes £5,000,000 → £42,400.

⚠️ **Two consequences measured only afterwards, both in §2:** the ppm ladder is today's turnover
ladder normalised to tier 1, so **dial 1 invalidates it** and it must be re-derived with any new
turnover table; and on today's other inputs this fix alone takes the variant gate from PASS to
**FAIL at tier 8**, which dial 4 is what repairs. Neither is an argument against the change.

The record of what was decided, kept because the reasoning is the authoring contract:

**The prize ladder.** `League::$prizeMoney` and `$leaguePositionPot` are per-club figures but the
EN ladder is sized as if they were pools, and it **inverts at tier 3**:

| tier | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 |
|---|---|---|---|---|---|---|---|---|
| prize ÷ turnover | 0.26× | 0.62× | 1.41× | 1.53× | 3.61× | 6.41× | 17.16× | **30.33×** |
| position pot ÷ turnover | 0.26× | 0.67× | 1.41× | 1.51× | 1.41× | 3.72× | 8.58× | **12.13×** |

A tier-8 champion receives **£5,000,000 against £164,852** of authored annual turnover, while
`tvDeal` runs monotone the other way (0.350× → 0.030×). `tvDeal` has `tvPoolPence` beside it and
`pool / slots === tvDeal` holds on all eight tiers; these two have no such pair and no divisor
anywhere in the app, so the authored number **is** one club's cheque.

Nothing rescales it (`inflate()` is a no-op at `inflationRatePerSeasonBp = 0`; the gate's
`RESCALE` is harness-only). The gate hid it because it models a mid-table finish — **but the
player can win their division.**

**Decided (2026-11-16), prompt issued in plan mode:** `claude/economy-backend-prize-ladder-prompt.md`
in the Build My Club project. Champion prize = **0.2573×** (tier 1's ratio) of each tier's authored
turnover at every tier (tier 8 about £42,415), **no floor variant**. `leaguePositionPot` (the
first-place amount; 10% taper unchanged) takes tier 1's own ratio at every tier. Authored as a
tier-1 base plus a per-tier ratio table in **parts per million** (basis points are too coarse:
tier 8 is about 4.2 bp of tier 1), decoupled from turnover and wage factors, with admin preview
(league total payout), `WORLD_PACK_VERSION` bump and re-warm, and gate acceptance checks (ladders
non-increasing; per-club TV + position + prize within a share-of-turnover band; champion total
at most 1× its own turnover). A champion keeps prize AND first-place pot. Out of scope: TV,
parachutes, taper, wage curve, fan base, stand levels, any app change.

Recorded in the backend's `.context`: `03_data/output/entities.md`.

---

# 4. Open questions

1. **⚠️ `startingBalance` vs `balance` on the world pack.** An NPC tier-8 club's £658k balance
   reconciles **only** on the pack's own `balance` (£94,920.58), not on
   `npcStartingBalanceByTier`'s £20,000 — the implied manufacturing rate on £20,000 is 31.8%,
   outside the 40–50% band, so it is arithmetically impossible. But `worldStore` reads **only**
   `startingBalance`, and the cached export carries the figure under `balance`. If the live
   payload used the export's key name, every NPC would open on £20,000 and the observed numbers
   could not exist. **One look at a live `/api/initialize` payload settles it**, and it blocks any
   decision about NPC starting balances.
2. **Squad abilities (device Row G).** £14,057/wk committed vs an NPC's £1,700 on the same
   authored scale.
   **A lead from the dial work, 2026-11-18 — the two figures may not be on the same scale at all.**
   The gate's tier-8 arms differ by exactly this shape: 60% of AUTHORED turnover is £99k a season
   (**£2.15k/wk**, which is the NPC's £1,700), while 60% of MODELLED income is £412k
   (**£8.9k/wk**, the order of the player's £14,057). NPC squads are priced from the authored
   table and the player's club is budgeted from its own income, so the gap is what
   `incomeAnchoredWages` ON means at a tier whose authored turnover is 4× too low — not
   necessarily a squad-composition difference. Under candidate B the authored anchor rises to
   £718k (£9.4k/wk) and most of the gap closes by construction. ⚠️ Still a hypothesis from the
   gate's arithmetic: Row G's per-player capture is what would confirm it.
3. **A tier-8 NPC's £7,700/wk income is about 2.4× expected (£3.2k/wk), and it is NOT sponsor.**
   ⚠️ Correction: £7,700 was the Winsford screen's **total** weekly income; its sponsor line was
   £133/wk, in line with a SMALL sponsor at £125–£152. The excess is most likely matchday and
   stand levels (dial 3, §2). Do not trace a flat sponsor path.
4. **⚠️ The pyramid tax base is unfiltered.** `applyPyramidTaxAndRedistribution` sums the ledger
   whole, so it would tax the owner's opening balance and funding as profit.
   `NON_RECURRING_INCOME` already names those categories and is already applied to the budget's
   realised income — just not to the tax. **A blocker on re-enabling the pyramid, not optional
   work.**
5. **`WAGE_LADDER_ABILITIES` samples `[10,20,40,60,80,95]` at every tier**, while tier 8's
   authored band is **2–7**, so every row of its wage table is off the end of the band (an
   "ability 20" reads £3,199.88/wk). An app-side display fix — sample the tier's own band.
   ⚠️ **Do not "fix" this by re-authoring `wageScaleMicroPence`**: the scale is calibrated against
   the band and re-authoring it would break every real squad the band produces.

---

# 5. Deferred — new mechanics, not calibration

Expected-value prize · weekly shirt accrual · a `club_shop` effect (it exists and earns nothing)
· a fan base that responds to form or tier rather than being drawn once at init · shirt
elasticity (`ticketElasticity.ts` is the shape, and is already live for tickets) · splitting
`seasonTicketHolderPercent`, which currently sets both the headcount and the discount · a
cost-of-sales ledger category so NPC shirt manufacturing stops sitting under `upkeep` (the NPC
ledger's type union has no `manufacturing` member, which is why it does).

---

# 6. Parked, with owners (do not lose these)

**Go-live prerequisites:** master/dev sync on both repos (app `master` carries 2 merge commits
`dev` lacks; backend `master` is an ancestor of `dev`); forced restart of all saves on the plot
model; legacy-club credit tested end to end; pack-version hashing instead of the manual
`WORLD_PACK_VERSION`; decision on supporting old builds; DB compaction (freelist about 26 MB of
38.4 MB). Reuse the hard-stop list in `economy-investigation/02-dev-deployment-test-plan.md` §6
as the template for the promotion gate, rewritten for a model that is now ON.

**Parked work:** consolidation (`spendGate`, phases A0 to A4, merge batches) on its own branch, now
unblocked by this batch but waiting on device results; owner-DB split, then bonds/morale (scope
freeze: economy only first); `.context` rewrite (`claude/icm-context-feedback.md`).

**Small defects:** sponsor "Needs to reach T8" condition uses the current tier
(`npcFinances.ts:197`); English descriptions string-matched in `SeasonFinanceSummary.ts:59-68`;
`incomeAnchoredWages` doc fixes (F7, `game-mechanics.md` §13.4 which asserts the opposite of the
truth, `ClubWageScaleService` header); `CLAUDE.md` dev row stale; sponsor 52 versus 46 week
divisor is a low-priority measurement only (the off-season ledger already books the gap).

---

# 7. How this differs from `economy-investigation/` (2026-11-13)

The investigation folder is a **historical record**; it describes the state of 13 November. Differences that matter:

| | Investigation (13 Nov) | Now (16 Nov) |
|---|---|---|
| Wage model | `legacy`, deployed OFF; everything inert | `turnover` ON on dev; `incomeAnchoredWages` derives ON |
| Wage anchor | authored per-tier turnover ("baseline turnover is a configured number, not live revenue") | **each club's own modelled income** (owner Option 1, 15 Nov); the authored table now only prices starting squads and renewals converge over about three seasons |
| Health metric | total cost as a share of authored turnover (tier 8 131 to 139%, insolvent) | COVERAGE = modelled income / authored turnover (tier 8 535%), plus s1 bill share (91.7%) |
| Direction of the tier-8 problem | costs exceed authored turnover | modelled income is 5× authored turnover; both say authored turnover is too low, and the size of the fix changed from about +33% to 3× (dial 1 wanted £500k) |
| "App side complete" | "Nothing in this list is an app code change" | false: sponsor and ticket ladders, income-truth batch, shirt scaling, forecast fixes, NPC upgrade pricing, parachute wiring, budget chain |
| Calibration halves | mismatched (squad 33 vs 26), re-derive | re-derived 13 Nov on dev's live squads; every dial since is invalidated by the corrected gate |
| Upkeep | `weeklyUpkeepBase` unscaled, primary fix | app tier factor; NPC facility price fix; facility sale; authored facility count (dial 4) |
| TV | re-authored 35% to 3% of turnover; 60 packs stale | unchanged; pack v6; TV is monotone and is not the problem |
| Prize and position pot | not examined | measured 30.3× and 12.13× turnover at tier 8; ladder inverts at tier 3 (§3) |
| Income model | not examined | three forecast defects and a gate that omitted shirts and over-priced seats, now fixed |
| West stand | recommended fix to 30,000 (makes tier 8 worse) | closed in earlier notes; not tracked here (confirm before closing) |

**Investigation items with no status here, so still unowned:** (a) `POST /api/club/fund` projection
under-reads above the bottom tier (add a note on the endpoint; recheck under the plot model);
(b) publishing `bankruptcyDeductionWeeks` (decision so far: stays null); (c) NPC clubs have no
condition or proactiveness state; (d) seven of eight legacy per-tier wage averages in the harness
are inferred; (e) `gameConfig` money keys are live dials with no release gate (watcher reports
only); (f) stale-pack check after any config-only change.
