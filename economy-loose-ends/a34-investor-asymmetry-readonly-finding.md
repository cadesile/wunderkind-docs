# A34 — Investor income: AMP vs NPC asymmetry (READ-ONLY finding)

**Date:** 2026-11-22 · **Branch:** `new-game-save` (clean tree, **no edits made**)
**Status:** investigation only. Work was HELD by the briefing session before implementation.
**Scope:** answers the three questions put after the owner's correction *"the AMP club starts
without investors."*

---

## Verdict in one line

**The owner is right, and the correction is decisive.** The AMP club begins a save with
`investors: []`, acquires investors only by accepting an inbox offer, and therefore has no
investor income to be missing in season 1. The projection read-gap the briefing describes is
**real but latent** — it cannot explain season-1 tier separation.

Two further corrections to the briefing's model are recorded in §4; both narrow the defect.

---

## 1. Q1 — Does the AMP club begin with an empty `club.investors`?

**CONFIRMED. Yes, empty.**

`src/stores/clubStore.ts:465-487`, `createDefaultClub()`:

```ts
export function createDefaultClub(): Club {
  return {
    ...
    sponsorIds: [],
    sponsorContracts: [],
    investorId: null,
    investorEquityPct: null,
    investorInvestmentAmount: null,
    investors: [],
```

Nothing seeds it afterwards. The **only two production call sites** of `addInvestor` are both
inside one function (searched across `src`, excluding `__tests__`):

```
src/stores/clubStore.ts:316    addInvestor: (investor: Investor) => void;   // the type
src/stores/clubStore.ts:1079   addInvestor: (investor) => {                 // the impl
src/engine/InboxResponseHandlers.ts:83    const { club, addInvestor, setInvestorId } = useClubStore.getState();
src/engine/InboxResponseHandlers.ts:106   addInvestor({      // seasonal (promise) model
src/engine/InboxResponseHandlers.ts:126   addInvestor({      // legacy lump-sum model
```

**The acquisition mechanism is an inbox offer, as suspected.**
`respondToInvestorOffer(message, 'accepted')` in `src/engine/InboxResponseHandlers.ts:77`:
gated on `canAddInvestor(...)` against `maxInvestorsByTier`, builds a `GamePromise`
(`buildInvestorPromise`, condition default `league_position` target 5, `repeatSeasons` default 3),
calls `addInvestor`, and credits the club.

⚠️ **A detail the briefing did not have, and it changes the phasing claim.** On acceptance the
AMP club is credited the **whole seasonal payment immediately**, in-week
(`InboxResponseHandlers.ts:120-126`):

```ts
useFinanceStore.getState().addTransaction({
  amount: investorMeta.seasonalPayment!,
  category: 'investor_income',
  description: `${investorMeta.investorName} — season 1 payment (${investorMeta.equityPct}% equity)`,
  weekNumber: currentWeek,
});
```

So the AMP club's first investor payment is **paid on signature**, not at the season transition.
Later seasons are paid through promise resolution
(`PromiseOutcomeService.ts`, `payInvestorSeasonBonus` + the seasonal `investor_income` entry).

---

## 2. Q2 — Do NPC clubs begin a save with investors attached?

**Yes — but only tiers 1–3, and they are DERIVED ON DEVICE at init, not authored in the pack.**

Generated in `src/stores/worldStore.ts:642` during world build:

```ts
const repTier      = npcTierToCommercialRepString(leagueData.tier);
const maxInvestors = config.maxInvestorsByTier[repTier] ?? 1;
...
const investors = generateNpcInvestorContracts(club.id, leagueData.tier, club.reputation, maxInvestors, {
  players: playersWithRoles, facilities: club.facilities, staff, balance: startingBalance,
}, npcFacilityTemplates);
```

This is consistent with the pack-is-a-census rule — money is resolved on the device from live
config, not baked into the pack.

**How many.** `src/utils/npcFinances.ts:263-279`:

```ts
if (tier > 3) return [];
const count = Math.max(0, Math.min(maxInvestors, Math.round((reputation / 100) * maxInvestors)));
if (count === 0) return [];
```

- **Tiers 4–8 get NO investors at all** — a hard early return.
- `maxInvestorsByTier` is keyed by the **commercial** rep band
  (`npcTierToCommercialRepString`: tier ≤2 `elite`, ≤4 `national`, ≤6 `regional`, else `local`).
  Config defaults (`src/types/gameConfig.ts:1928`): `{ local: 2, regional: 2, national: 2, elite: 3 }`.
- So the realistic ceiling is **3 at tiers 1–2, 2 at tier 3**, scaled down by `reputation/100`.

**How `seasonalPaymentPence` is set.** `npcFinances.ts:304-322` — priced off the shared
club-valuation formula, not a constant:

```ts
const { totalValuation: valuation } = computeClubValuation({ ... });
const maxEquity = reputation >= 75 ? 100 : reputation >= 40 ? 20 : 10;
...
const equityPct = Math.min(maxEquity, 5 + Math.random() * (maxEquity - 5));
const variance  = 0.7 + Math.random() * 0.6;
const payment   = Math.round(valuation * (equityPct / 100) * variance);
```

`seasonsRemaining: 3 + floor(random()*3)`, and `equityTaken` is snapped to the AMP 5/10/20 bands.

---

## 3. Q3 — Does season 1 run with NPC budgets including amortised investor income while the AMP club has none?

**Yes — the code bears that out, with one important qualification.**

`src/engine/SeasonBudgetService.ts:657-661` (NPC bootstrap):

```ts
const weeklyIncomePence = npcWeeklyIncomePence({
  // Sponsors AND investors, summed — never `sponsors || weeklyIncome`, which is the `||`
  // that made Step O's investor fix inert at the tick's own call site.
  sponsorPence: sumNpcSponsorIncome(club) + sumNpcInvestorIncome(club),
```

That income feeds `deriveClubBudget(... incomePence: weeklyIncomePence * weeks ...)` and then
`snapNpcStaffWages(club, budget)` — so it does reach NPC wage spend in season 1.

The AMP side (`bootstrapAmpSeasonBudget`, `SeasonBudgetService.ts:481-507`) derives income from
`buildProjection`, and `investor` **does not appear anywhere in
`src/engine/FinancialProjectionService.ts`** (grep returns no matches). Income is:

```ts
const weeklyIncome = sponsorIncomePence + matchdayIncomePerWeek;   // :235
```

**The qualification, and it matters for the tier-separation complaint:**

1. The two budgets are computed **independently** — the AMP budget is derived from the AMP
   club's own projection and is **not anchored against NPC income**. So an NPC's investor
   money does not set the player's wage scale by comparison; it sets that NPC's.
2. In season 1 the AMP club has **nothing to include**, so the projection gap is inert.
   It becomes live only once the player accepts an offer.
3. Investor income exists **only at tiers 1–3**. It is therefore a tier-1–3-only income line
   on the NPC side — which is a genuine input to tier separation between NPC divisions, but
   is not an AMP-vs-NPC gap in season 1.

---

## 4. Two corrections to the briefing

**(a) The NPC transition credit is NOT unconditional.** The briefing describes
`SeasonTransitionService.ts:4555-4593` as accumulating and crediting the seasonal payment.
It is **condition-gated**, exactly as the AMP promise is — an investor whose condition fails is
dropped from the array and pays nothing (`:4560-4570`):

```ts
const conditionMet = evaluateNpcCondition(
  i.promiseConditionType ?? 'league_position',
  i.promiseConditionTarget ?? 5,
  npcClub.tier, npcClub.reputation,
);
if (!conditionMet) return false;
investorIncome += i.seasonalPaymentPence;
```

So the realised-income sides are closer to mirrored than the briefing assumed. Both are
promise/condition gated. The asymmetry is in **phasing** (AMP pays on signature for season 1;
NPC pays at transition) and in **the projection read**, not in whether the money is conditional.

**(b) `InvestorDividendService.ts` is money going OUT, not in.** It was not mentioned in the
briefing and is easy to mistake for the AMP income path. Its docblock states the split
explicitly:

> the promise gates their seasonal payment *into* the club
> (`PromiseOutcomeService.resolvePromise`'s `investor_income` entry), while equity entitles
> them to a profit share whether or not that condition was met.

---

## 5. What remains genuinely defective (for the owner to rule on, not for me to assume)

The projection read-gap is real: once the player holds an investor, `buildProjection` still
reports income without it, which understates WK INCOME, the runway, and any budget derived from
it. But whether it *should* be included is a **design question, not a bug fix**, because:

- the AMP seasonal payment is **promise-gated and non-guaranteed**, so amortising it into a
  weekly recurring rate asserts income the club may not receive; and
- the AMP club is paid its first season **up front on signature**, which the NPC amortisation
  model does not represent at all.

Mirroring the NPC helper's semantics onto a payment with different phasing and different
conditionality would be writing a second model, not reusing one. **This needs the owner.**

## 6. Secondary observation (not investigated further, flagged only)

`sumNpcInvestorIncome(club, weeksPerSeason = 46)` (`npcFinances.ts:372-380`) carries a hardcoded
46-week season as its default. The NPC budget path does pass a real value
(`SeasonBudgetService.ts` uses `weeksPerSeason(club.tier ?? 8)`), but
`SeasonTransitionService.ts:5419` calls it **bare**, taking the 46 default. Worth a look against
the TIERS-ARE-FLEXIBLE rule; not touched here.
