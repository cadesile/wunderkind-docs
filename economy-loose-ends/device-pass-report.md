<!-- STATUS --> **STATUS:** ✅ Historical device pass, 2026-11-19 morning.

---

# Device pass — findings, 2026-11-19 (in progress)

Build: OTA **481** / `9423654`, backend dev `459dac4b`. Sheet: `device-pass-2026-11-18.md`.
Owner playing manually. **Nothing in the pack-economy change is in this build** — both halves are
committed (`bac1228b`, `4706169b`) and unpushed, so this pass measures R2 plus the regenerated
world.

## ✅ Confirmed

**The regeneration reached the device.** Alexandria (SC t8): capacity **2,500**, north and south
stands NOT BUILT, east LV 1 — exactly two stand levels at `capacityCalculation` 1250, which is
band 3 as authored.

**Scotland's 50% economy factor is working, end to end.** Verified against the published config
rather than inferred — SC is exactly 0.500 of EN on **turnover and wage scale at all eight tiers**,
on the tier-8 ticket price (£7 vs £14) and on the sponsor bands. The owner's prior suspicion that
"the 50% decrease wasn't working" is disproved.

**R2's wage scale is live at the regenerated tiers.** Predicted SC t8 squad ≈ **£1,051/wk**;
Alexandria **£989**, Grangemouth **£934**. Sponsor predicted £62–76/wk; observed **£69** and
**£73**. Two independent clubs, both inside tolerance.

## ⚠️ Open — the three that matter

### 1. Tier-1 wages are ~47% of what R2's scale predicts

Glasgow (SC t1): **WK WAGES £767.1k** against a predicted **£1.62M/wk** for a 26-man squad on SC's
tier-1 scale (166,242,252 micro-pence × σ 973,893 ÷ 1e6). Tier 8 matched at 94%; tier 1 does not.

Two candidate causes, and they need different fixes:

- **Only tiers 7–8 were regenerated.** Tiers 1–6 still carry squads priced before the R2
  migration, so their wages were never re-derived. (Pre-R2 pricing alone would make them
  *dearer*, not cheaper, so this cannot be the whole story.)
- ⚠️ **`computeNpcWageBill` sums `p.contractValue` only** — the legacy alias, found independently
  by the pack-economy session (its report §3). Any player row missing that field contributes
  **zero** to the displayed bill, silently. The regenerated tiers have complete rows; the older
  tiers may not.

**Settles it:** Glasgow's squad list. Individual wages right but the total low ⇒ the sum. Individual
wages low ⇒ the pricing.

### 2. Investor income is larger than everything the gate models

Glasgow: **investors (2), £92.3M per season** — **56% of SC tier-1 authored turnover (£165.5M)**,
and `investor_income` is explicitly in the variant gate's unmodelled list. Every COVERAGE figure in
this programme, R2's 85% target included, was computed with that line absent.

Either the gate's income floor is badly incomplete at the top of the pyramid, or £92.3M of investor
money into a £165M club is itself the defect. **Both are findings and they need opposite fixes.**
Needs the per-investor terms (SHOW DETAILS).

### 3. Row H is contradicting the gate, so far

Both tier-8 Scottish clubs are comfortable — 52+ week runways, wages at ~38% of weekly income.
The gate predicted tier 8 **insolvent in season 1 with a rescue firing**, at 102.6% of income.

And Scotland should be the *harder* case: **upkeep has no country factor.**
`facilityUpkeepPence` is `weeklyUpkeepBase × 1.5^level × upkeepTierFactor(tier)` — tier only — so a
50% country earns half and pays full price for its stadium. That these clubs are nonetheless
healthy suggests the gate's upkeep model is heavier than what the game actually charges. An
England run separates the two variables.

⚠️ **"Income scales by country, upkeep does not" is itself new.** Every country sat at parity until
Scotland went to 50%, so this has never been exercised. Same shape as the flat youth scholarship
and the flat staff role bands, both already fixed by giving them a tier dimension.

## ⭐ THE FINDING — the wage scale is calibrated against a squad that cannot exist

**Confirmed by direct observation on 2026-11-19, superseding three earlier and worse explanations
in this file.** The player card's RAW toggle shows `current ability / potential`. Six players:

| player | age | tier | RAW | band (potential) | ability ÷ potential |
|---|---|---|---|---|---|
| Jamie Armstrong | 19 | 8 | 1 / 4 | 2–7 | 25% |
| Logan Robertson | 20 | 2 | 14 / 47 | 30–60 | **30%** |
| Grant Ferguson | 20 | — | 6 / 20 | — | **30%** |
| Murray Ross | 24 | 8 | 2 / 5 | 2–7 | 40% |
| Lewis Sinclair | 26 | 1 | 65 / 83 | 40–90 | 78% |
| Iain Dalgleish | 24 | 4 | 20 / 34 | 15–35 | 59% |
| Lewis Gilmour | 31 | 7 | 9 / 10 | 5–10 | 90% |

**Potentials land inside the band every time. Abilities sit below them, by an amount that tracks
age.** ⚠️ **With real spread, though** — the two 24-year-olds are at 40% and 59%, so the curve is a
trend, not a formula. (An earlier version of this entry called it deterministic on the strength of
two 20-year-olds both reading 30%; that was over-claiming from two points.) The mechanism is player
development working as designed; the per-player figure varies.

Note also that falling *below the band* is not universal: at tier 4 an ability of 20 sits inside a
15–35 band. It is the bottom tiers and the young players where ability drops under the floor. What
drives the aggregate gap is the **age mix of a real squad**, not a uniform offset.

**Per-player pricing is correct.** Checked against each tier's published scale:

| player | predicted | observed |
|---|---|---|
| Lewis Sinclair (t1, ability 65) | £56,620/wk | £49.7k |
| Logan Robertson (t2, ability 14) | £1,216/wk | £1.1k |
| Lewis Gilmour (t7, ability 9) | £286/wk | £354 |
| Grant Ferguson (ability 6, bottom tiers) | £103–113/wk | £129 |

All within the ±8% negotiation band plus `budgetPremium`. **The wage function is not broken.**

**The defect is in the aggregate, and it is this:** `referenceSquadAbilitySum` spreads abilities
evenly across the tier's band and solves the scale from that — treating every player as if he were
already at his potential. A real squad is a mix of ages, most still developing. At `k = 2.5` the
gap compounds: observed tier-1 wage bills are ~28% of what the calibration targets, tier 8 ~35%.

**Three consequences, in rising order of importance:**

1. The authored "60% of turnover goes to wages" has never been true in play. Real bills are
   ~18–20% of turnover.
2. ⚠️ **The wage bill climbs over seasons on its own** — no renewals, no signings, no inflation —
   as abilities grow toward potential. A club solvent in season 1 at 30% of calibration is paying
   far more by season 5 against income that has not grown the same way.
3. ⚠️ **The gap never fully closes.** If mature players reach ~90% of potential, a fully developed
   squad still averages ~90% of the band, which at `k = 2.5` is `0.9^2.5` ≈ **77%** of the
   calibration. So the 60% target tops out near 46% in practice. The trajectory is **30% → ~77%,
   never 100%.**

**This reframes row H.** Tier 8 is not comfortable; it is comfortable *yet*. The gate prices squads
once at generation and never develops them, so it cannot see this at all. **The real solvency
question is season 4–5, not season 1.**

**For whoever re-calibrates:** the reference squad should be built from *expected mature ability*,
discounted for the age mix a real squad carries — not from the potential band.

## ⚠️ Secondary finding — the wage ladder and the scholarship floor cross at tier 8

Found by the owner on a Scottish save: a 19-year-old 1-star squad GK on **£1/wk** demanding
**£25/wk**, with the card's own copy saying *"market rate for their level is £1/wk against their
current £1/wk"* — the explanation and the demand coming from different places.

**The mechanism is correct and documented.** `renewals.ts:127,142` floors every renewal at
`economy.youthScholarshipPence`, and the docblock says why: *"a professional's renewal must never
come out below what the same club pays a thirteen-year-old."* It is **not** a scholarship figure
leaking onto senior contracts — it is a deliberate ordering guard, and it applies to professionals
on purpose. An earlier reading of this as "a flat floor leaking" was wrong and is retracted.

**What is wrong is where the two ladders meet.** The scholarship ladder stops descending at £25
(its own floor, binding at tiers 6–8) while the wage ladder keeps falling with turnover:

| tier | 1 | 2 | 3 | 4 | 5 | 6 | 7 | **8** |
|---|---|---|---|---|---|---|---|---|
| mean wage ÷ scholarship, **SC** | 10.5× | 12.1× | 13.4× | 13.3× | 12.6× | 9.9× | 2.5× | **0.85×** |
| mean wage ÷ scholarship, **EN** | 21× | 24× | 27× | 26× | 25× | 20× | 5.0× | 1.71× |

(SC means are the owner's save; EN is the same figures doubled, since the scale is exactly 2× and
the bands are identical.)

**The inversion happens only in a reduced economy**, and the cause is precise:
`youthScholarshipPence` is **the one economy figure the country factor does not reach** — identical
in both countries (`150000, 59663, 19834, 12024, 4710, 2500, 2500, 2500`) while turnover, wage
scale, ticket price and sponsor bands are all exactly 0.500. Halve the wages, leave the floor, and
the ordering flips.

**Consequences, in rising order of seriousness:**

1. The contract card's "WHY" copy explains a market comparison while the ask comes from the floor —
   a UI defect independent of the economics.
2. At SC tier 8 the floor is **117% of the mean professional wage**, so it is not a guard catching
   an edge case; it is the price of the division.
3. ⚠️ **It ratchets and flattens.** Observed in the owner's own squad: players on **£1/wk** and
   **£7/wk**, contracts expiring S2 wk 1. Every renewal lands at £25, so a bottom-tier wage bill
   rises several-fold in one window and **every player converges on an identical wage regardless of
   ability**. The founder's squad is the most exposed club in the division, since starter squads
   generate at lower abilities (1-3-5) than NPC squads (1-3-6).
4. No gate would ever show this: the harness prices squads at generation and never renews them.

**The fix is an authoring question, not code:** should the scholarship scale with
`economy_factor_bp` like everything else? At 50% Scotland's tier-8 floor becomes £12.50 against a
£21.35 mean — **1.71×, exactly England's ratio** — and the ladders stop crossing in every country
at once.

**Prediction to confirm in play:** at the first renewal window of this save, the squad wage bill
should jump several-fold and every wage should read £25.

**And the RAW toggle can settle the calibration finding directly.** Everything above about
potential-versus-ability was back-calculated from wages — implied mean ability **3.2** at tier 8
against a 2–7 band, **39.0** at tier 1 against 40–90. The player card has a RAW debug view that
shows current ability. Capturing raw current ability for a few players against their tier's band
turns that inference into an observation, and explains the £1–£7 wages as correct prices for
players materially weaker than the band the wage scale was calibrated against.

## 🐛 UI defects seen in passing

- ~~`abilityCeiling: 5` renders raw in the player Scout tab~~ — **retracted, not a defect.** The
  card header carries a **RAW** toggle; that line is deliberate debug output shown while it is on,
  not a string that escaped the translation catalog.
- **The contract-talks card explains a market comparison while the ask comes from the floor** —
  see the crossing finding above. The copy is not wrong about the market; it is answering a
  different question from the one the number came from.

✅ **Not a defect, checked:** the star rating and the wage look contradictory (a 5-star player on
£7/wk) and are not. *"Rating and potential is relative to the current league"* — the stars describe
a player against his division, the wage against the game. A scout assessment below the true rating
is the `player_rating` perception split working as designed.

## 🐛 Crash — white screen on back from an NPC club's finances

**Repro:** open an NPC club → Finances → BACK. White screen. The owner reports having seen it
before "when viewing NPC club dashboard", so it is not a one-off and may be the NPC club screens
generally rather than the finances tab specifically. Captured in a screenshot at 00:18.

Not economy-related and present on OTA 481, so it is **not** caused by the pack-economy change
(which is unpushed).

Context for whoever takes it:

- **There is recorded prior art**: `07_synthesis/output/architecture-notes.md:863` — *"Still open:
  the blank screen on sign-IN. It predates all of the above and is unexplained."* This is a second
  instance of that class, **with a far better repro than the sign-in one has**, which makes it the
  better specimen to debug.
- The app has `AppErrorBoundary` and `RootErrorBoundary`, so a render throw should be caught — a
  white screen suggests either a boundary rendering empty, or a crash outside their subtree.
- `navStore`'s back-FAB contract is a live suspect worth eliminating first: `setBackFab` carries an
  explicit pathname guard against *"a blurring screen wiping a newly focused screen's
  registration"*, and its docblock documents an effect-ordering race between a destination screen's
  registration and `BottomFABRow`'s pathname-change cleanup. A stale callback invoked after unmount
  is exactly the shape that produces this.
- **The save survives it** — state is in SQLite, not Zustand, so a restart resumes.

## Still to capture

Rows E and G at the first season boundary (`fanCount`, `morale`, prices charged, per-player ability
and wage), row I (the owner's own club beside a neighbouring NPC), and row H's actual count of
tier-8 NPCs ending season 1 negative. An **England** run, to separate the country factor from the
upkeep question.
