# A34 — NPC investor seed money credited at game start

**Date:** 2026-11-22 · **Branch:** `new-game-save` · **Committed `9fbbf74a`. NOT pushed, NOT deployed.**
**Ruling implemented:** owner, 2026-11-22 — *"NPC clubs that start with investors should
receive that lump sum at game start."*

---

## 0. What I had edited when the first brief was stopped

**Nothing.** The HOLD arrived during verification, before any implementation. No edits existed,
nothing was reverted, and nothing from that pass survives into this work. The only artefact of
it is the read-only finding `a34-investor-asymmetry-readonly-finding.md`.

---

## 1. Did the premise hold?

**Two bullets held exactly. The third held as a fact but its INFERENCE was wrong, and that
changed the fix.**

✅ **Bullet 1 — NPC investors are seeded on device at world build.** Confirmed,
`src/stores/worldStore.ts:642`, under `// 4. Seed sponsors/investors`. Consistent with
pack-is-a-census.

✅ **Bullet 3 — `NpcInvestorContract` has no `investmentAmount`.** Confirmed,
`src/types/world.ts:91-114`. The field exists nowhere for NPCs; I grepped all of `src`.

🔴 **Bullet 2 — the inference that a separate investment lump was omitted is WRONG.**

The brief read `Investor.investmentAmount` and `Investor.seasonalPaymentPence`
(`src/types/market.ts:178-199`) as two different quantities. In the seasonal model they are
**the same number**. The AMP offer generator sets both from one variable
(`src/engine/GameLoop.ts:4486-4488`):

```ts
metadata: {
  investmentAmount: invSeasonalPence, // pence — legacy compat
  seasonalPayment: invSeasonalPence,
```

and acceptance carries that through (`src/engine/InboxResponseHandlers.ts:111`):

```ts
investmentAmount: investorMeta.seasonalPayment!,
seasonalPaymentPence: investorMeta.seasonalPayment,
```

`market.ts:189` labels the field `// pence — kept for backward compat`. **So there is no second
"investment" figure anywhere in the model.** `investmentAmount` is a legacy alias retained for
the pre-promise lump-sum contract shape, which NPCs never use.

**Consequence for the task:** I did **not** add `investmentAmount` to `NpcInvestorContract`.
Storing it would have created a parallel definition of a value already held in
`seasonalPaymentPence` — the precise drift `generateNpcInvestorContracts`' own comments warn
about. The backward-compatibility pattern the brief suggested is unnecessary because no new
field was needed: clubs generated before this change behave identically, since the change is to
the balance assignment, not to the contract shape.

---

## 2. The derivation I reused

The AMP club is credited its seasonal payment **the moment the player accepts**, as an
`investor_income` ledger entry described "season 1 payment"
(`InboxResponseHandlers.ts:120-126`). The player's first season is therefore paid **on
signature**, not at a transition.

The fix mirrors exactly that: at world build, each NPC club is credited the sum of its
generated contracts' `seasonalPaymentPence`. Same quantity, same unconditional treatment, same
point in the club's life (the moment the investor is "found").

No new constant and no new dial. The amount is wholly derived from the authored
`valuation × equityPct × variance` relationship already inside
`generateNpcInvestorContracts`.

### Change, `src/stores/worldStore.ts`

```ts
const investorSeedPence = investors.reduce(
  (sum, i) => sum + Math.max(0, i.seasonalPaymentPence), 0,
);
const openingBalance = startingBalance + investorSeedPence;
```

…and `balance: startingBalance` on the built club became `balance: openingBalance`.

**Order is load-bearing and commented at the site.** `generateNpcInvestorContracts` prices each
payment off `computeClubValuation`, which reads `balance` — so the credit must land *after*
generation, or the investment would inflate the valuation that sized it.

**Re-entry is safe.** The credit rides the same assignment that already resets `balance` from
the authored ladder, so any path that rebuilds a club was already overwriting the balance
wholesale.

---

## 3. 🔴 THE CURVE — and it is the reason this should not reach a device unruled

Measured against the real England world export
(`evidence/world-export-2026-11-20.json`, 127 clubs, 8 tiers) with the LIVE
`maxInvestorsByTier` (`{local:2, regional:2, national:2, elite:2}`) and the authored
`npcStartingBalanceByTier`. Monte Carlo, 4,000 draws per club, over the generator's own formula.

Seed expressed as a **multiple of the club's own valuation**, which is exact from the formula:

| tier | n | median rep | investors | maxEquity | seed/valuation p10 | median | p90 | opening ladder |
|---|---|---|---|---|---|---|---|---|
| 1 | 16 | 81.0 | 2 | **100** | 0.165 | **0.953** | 1.575 | £5,000,000 |
| 2 | 16 | 70.0 | 1 | 20 | 0.068 | 0.146 | 1.156 | £2,000,000 |
| 3 | 16 | 61.5 | 1 | 20 | 0.063 | 0.121 | 0.195 | £800,000 |
| 4 | 16 | 50.5 | 0 | — | 0 | 0 | 0 | £300,000 |
| 5 | 16 | 38.5 | 0 | — | 0 | 0 | 0 | £150,000 |
| 6 | 16 | 30.0 | 0 | — | 0 | 0 | 0 | £100,000 |
| 7 | 16 | 20.5 | 0 | — | 0 | 0 | 0 | £50,000 |
| 8 | 15 | 11.0 | 0 | — | 0 | 0 | 0 | £20,000 |

**A median tier-1 club is credited roughly its ENTIRE club valuation in cash on day one.**

### The cliff, at reputation 75

```
  rep  74  maxEquity  20  count 1  median seed/valuation 0.121
  rep  74  maxEquity  20  count 1  median seed/valuation 0.120
  rep  76  maxEquity 100  count 2  median seed/valuation 1.036
  rep  77  maxEquity 100  count 2  median seed/valuation 1.033
  rep  88  maxEquity 100  count 2  median seed/valuation 1.032
```

**Two reputation points apart, an 8.5× jump.** 14 of 16 England tier-1 clubs sit above it.

### Root cause — a misread constant, not a tuning problem

`generateNpcInvestorContracts` (`npcFinances.ts:312-317`):

```ts
const maxEquity = reputation >= 75 ? 100 : reputation >= 40 ? 20 : 10;
...
const equityPct = Math.min(maxEquity, 5 + Math.random() * (maxEquity - 5));
const payment   = Math.round(valuation * (equityPct / 100) * variance);
```

The identical `maxEquity` ladder exists on the AMP side (`GameLoop.ts:4439`) — but there it is
a **filter bound over a backend pool**:

```ts
const eligible = allInvestors.filter((inv) => inv.equityTaken <= maxEquity);
```

and that pool's `equityTaken` is always one of the authored 5/10/20 bands —
`src/api/endpoints/market.ts:368-371` states it outright: *"callers re-derive it from
`equityTaken`'s 5/10/20 bands … exact for every contract the game can produce."*

So on the AMP side `maxEquity = 100` means **"filter nothing out"**, and realised equity stays
≤20%. The NPC generator reuses the same ladder as a **generative range**, producing equity up
to 100%. That is the divergence.

**It is self-inconsistent inside one function.** The payment is sized on the raw `equityPct`
(up to 100), while the stored stake is snapped to the authored bands —
`equityTaken: equityBand(equityPct)` — so a club paid as if it sold 95% of itself records 20%,
and `npcTransferExecutors` charges it on 20%.

**This is pre-existing.** My change does not create it. But it currently trickles in at
transitions and is nearly invisible; crediting at game start makes it immediate and dominant,
and it is a strong candidate for the owner's original *"tier accuracy is off"* report.

---

## 4. Observability — what I touched on CHECKS

⚠️ Kept deliberately minimal, given the several writers on these files this week.

**`src/economy/economyDiagnostics.ts`** — APPENDED one new exported pure function,
`investorSeedChecks`, at end of file. **Nothing existing was modified.** It reports, per tier
that has investor-backed clubs: total seed, median seed as a multiple of that tier's opening
ladder, the min/max multiples, the **spread**, and mean recorded equity.

**`src/components/debug/ChecksTab.tsx`** — exactly three lines added, nothing changed:
1. `investorSeedChecks` added to the existing `@/economy/economyDiagnostics` import list.
2. One `const investorSeed: CheckResult[] = investorSeedChecks({...})` block, reading live
   contracts off `worldStore` rather than recomputing them.
3. One section row, `['NPC INVESTOR SEED — AT GAME START', investorSeed]`.

**`src/economy/worldPackDiagnostics.ts` was NOT touched.**

The rows are `info` with **no threshold**, on purpose: the bands that would justify a threshold
are exactly what is in question, and an invented constant is what this file's own register
keeps warning about. The spread is printed so the owner reads the cliff and rules on it.

---

## 5. Is the amortise-a-rate-against-a-lump behaviour a second defect?

**No — I agree it is correct by design, with one caveat.**

`sumNpcInvestorIncome` amortising `seasonalPaymentPence` across the season matches how
`npcWeeklyIncomePence` treats TV money, prize money and every other seasonal line. A budget is
a *rate* decision; the cash is a *lump*. Budgeting the rate is what lets a club spend evenly
against money that arrives in steps, and the docblock says so.

**The caveat, which my change sharpens:** the seed is now paid at build, so for season 1 the
club holds the cash *and* budgets the amortised rate for the same money. That is not
double-spending — the budget reserves against income, it does not create it — but it does mean
a season-1 NPC budget is anchored on income the club has already banked. Worth the owner's eye;
I did not change it.

**Separate, and I could not settle it:** on the AMP side a 3-season contract appears to pay
**four** times — once on acceptance ("season 1 payment",
`InboxResponseHandlers.ts:123`) and then at promise cycles 1, 2 and 3
(`PromiseOutcomeService.ts:291-299`, which pays before the `isLastCycle` early return, with
cycle 1 also described "season 1 payment"). The NPC side pays a 3-season contract **twice**
before this change and three times after, which is the arithmetic I would expect. **I did not
touch either.** If the AMP count is wrong it is a separate defect and it is the player's club
that benefits.

---

## 6. Test figures

- `npx tsc --noEmit` — **clean**, run twice (after the worldStore change, and after the CHECKS
  wiring).
- `npx jest --listTests | wc -l` — **664**. Reconciles exactly against this branch's 663
  baseline at `4bebf8fc`: **+1 suite**, `worldStore.investorSeed.test.ts`, no other new file.
- Targeted group (`economy/`, `stores/worldStore*`, `checksReportCopy`) — **57 suites / 908
  tests, all passed**, 13.1 s.
- New suite — **7/7 passed**.

⚠️ **MACHINE CONTENTION — read the full-run figure with this.** Throughout this work the
machine carried the other session's backend stack (Docker + a lando VM, and a `phpunit` run
observed directly) plus a Time Machine backup. Load average moved from 3.24 to **11.71** during
the session. Per this branch's rule, a full run taken under that load is not evidence; the
figure is reported in §7 with its load stated, and the suite COUNT above is the load-independent
check that nothing was silently skipped.

---

## 7. What the owner should expect to see change on device

**This changes NPC clubs only. The player's club is untouched** — no AMP code path was modified.

1. **Tier 1–3 NPC clubs start richer.** Tiers 4–8 are byte-identical (`tier > 3` generates no
   investors), as pinned by the new test.
2. **Tier separation widens sharply at the top**, and currently *too* sharply — see §3. A
   median tier-1 club opens with roughly double its previous effective wealth.
3. **CHECKS gains a section**, `NPC INVESTOR SEED — AT GAME START`, one row per backed tier.
   **This is the row to read before ruling**: a wide `spread ×` inside one tier is the
   reputation-75 step.
4. **Only on a NEW save.** The credit happens at world build, so an existing save is unaffected.
5. **Second-order:** richer tier-1–3 clubs have larger transfer and facilities budgets
   (both percentages of balance), so NPC transfer activity at the top should rise.

---

## 8. Still unruled — needs the owner, not me

1. 🔴 **The `maxEquity = 100` branch (§3).** I implemented the ruling as given and did **not**
   touch the sizing, because the ruling was about *when* the money arrives, not *how much*. But
   the two interact, and I would not put this on a device without a decision. The narrow fix is
   to make the NPC generator draw from the authored 5/10/20 bands it already snaps to, which
   would make the AMP and NPC sides genuinely one vocabulary.
2. **Payment counts (§5).** Whether an AMP 3-season contract should pay four times.
3. **Season-1 double-anchoring (§5).** Cash banked at build *and* amortised into the same
   season's budget rate.
4. **`npcStartingBalanceByTier` is absent from `game-config-en.LIVE.json`**, so the live game
   falls back to `DEFAULT_GAME_CONFIG`'s ladder. If that ladder is meant to be admin-tunable it
   is currently not being published.

---

## Files changed (stage by explicit path)

```
src/stores/worldStore.ts                              credit the seed at world build
src/economy/economyDiagnostics.ts                     + investorSeedChecks (appended only)
src/components/debug/ChecksTab.tsx                    + 3 lines wiring the section
src/__tests__/stores/worldStore.investorSeed.test.ts  new, 7 tests
```

---

## 9. ⚠️ RELATED DEFECT, HIGHER PRIORITY THAN THIS ONE — NOT FIXED HERE

**Reported by the coordinating session 2026-11-22, while this work was in progress. Recorded
here so it is not lost. I did NOT investigate or fix it, and I have NOT verified it — it is
reproduced as received, and the next agent should verify before building on it.**

> NPC season budgets record `incomePence: 0`, because `setNpcSeasonBudgets`
> (`SeasonTransitionService.ts:5081`) reads `club.weeklyIncome`, while the only writer of that
> field is a refresh pass at `SeasonTransitionService.ts:5419` — ~340 lines later **in the same
> `performSeasonTransition` call**. So the first transition reads `undefined` and every later
> one reads a season-stale value.
>
> Evidence given: a tier-1 club with £112.5M of investors has a season-2 budget of
> `incomePence: 0`, `wageSharePence: 0`, `wageReservationPence` equal to `wageFloorPence`,
> `overCommitted: true`. The club's own `weeklyIncome` reproduces
> `sumNpcSponsorIncome + sumNpcInvestorIncome` to the penny, so the field is right and merely
> arrives late.

**Why it outranks the work in this report.** A28's write-up here concerns how much investor
money an NPC club *has*. That defect concerns whether **any** income reaches an NPC club's
season budget at all — an `incomePence: 0` budget reserves nothing, so every wage in the club
reads unaffordable and `overCommitted` is set for reasons that have nothing to do with the
club's finances. It plausibly swamps the tier-separation signal that started this whole
workstream, and it would also mask the §3 `maxEquity` distortion by discarding the income it
inflates.

**Ordering note for whoever picks this up:** §9 and §3 interact. Fixing §9 alone would make
the §3 over-sizing *more* visible, not less, because the inflated investor income would then
actually reach the budget. Rule on §3's sizing before or alongside §9.

**Line references in the quote above are the reporting session's, not mine — unverified.**
