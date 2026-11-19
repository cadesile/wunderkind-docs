<!-- STATUS --> **STATUS:** ✅ Superseded. Written for the A3 agent but never delivered; the work landed as B1 instead.

---

# 🔴 ADDITION TO A3 — `tvDeal` has the same defect, and it pays £0 in the live game

**PM session, 2026-11-19, owner authorised relaying this while A3 is still open.**
Your A3 diff is correct as far as it goes — resolved under the plain keys, raw under `*Override`,
import preferring the override with a documented legacy fallback. **`tvDeal` is a third field with
the same cause, and it is a worse defect than the two you have fixed.**

## The chain, every link verified read-only

**1. Nothing ever writes `tvDeal` for a generated league.** `LeagueSizeResolver::syncTvDeal()` is
called from exactly two places, both in `LeagueAdminController` (`:95`, `:201`) — an admin saving a
league. `LeagueService:82` **deliberately does not call it**, and says why: it runs before any NPC
club exists, so the size cannot be derived yet. Nothing calls it afterwards. So a league generated
with a `tvPoolPence` and no authored `tvDeal` keeps `tvDeal = NULL` **until a human opens it in the
admin and presses save.**

**2. That is the live state of Scottish tiers 5–8.** From the deployed export
(`wunderkind-world-2026-11-18 (1).json`):

| league | `tvPoolPence` | `tvDeal` | `slots` |
|---|---|---|---|
| SC t5 | 3,000,000,000 | **NULL** | 0 |
| SC t6 | 1,000,000,000 | **NULL** | 0 |
| SC t7 | 500,000,000 | **NULL** | 0 |
| SC t8 | 120,000,000 | **NULL** | 0 |

Every EN tier authors `tvDeal` directly with **no** pool, so England is unaffected. These four are
the only pooled leagues in the world — and they are the tiers the owner is device-testing.

**3. Both live publication paths emit the raw column.**
`InitializeController:243` is `'tvDeal' => $league->getTvDeal()` — sitting **directly above**
`prizeMoney` / `leaguePositionPot`, which that same array resolves through `LeaguePayoutResolver`
with a comment saying so. `SyncService::buildLeagueSnapshot()` publishes `tvPoolPence` and
`clubCount` but not a resolved deal. The admin export does the same at
`LeagueImportExportService:41`.

**4. The app turns the NULL into zero.** `src/economy/seasonFinances.ts:80`:

```ts
const tvPence = inflate(Math.max(0, league.tvDealPence), idx);
```

`Math.max(0, null)` is `0`. **Scottish tiers 5–8 earn £0 of TV income in the running game.**

**5. And the app has already worked out the right answer before discarding it.** Lines 86–96
compute `expected = trunc(tvPoolPence / clubCount)` and, when it differs from the published deal,
record `tvPoolMismatch` — then **never use it**. That non-preference is deliberate and correct for
its intended case, and its comment says why: preferring the pool would overpay a club reading a
stale pack, preferring the deal would hide a real re-authoring. **But it was written for a
disagreement between two figures, not for the absence of one.** A NULL deal beside a valid pool is
not a mismatch to arbitrate — it is a missing value whose answer is sitting next to it. The app
records that it knows the figure and pays zero anyway.

## The fix, and why it is yours and not the app's

**Resolve `tvDeal` at publication, exactly as you resolved the payouts** — the pattern already
exists as `LeagueSizeResolver::derivedTvDealPence()`, which returns the per-club share or **null**
when there is no pool, so it is inert for every EN tier:

- `LeagueImportExportService` — emit `derivedTvDealPence($l) ?? $l->getTvDeal()` under `tvDeal`,
  and the raw column under **`tvDealOverride`**, matching the two keys you have just added.
- **Also `InitializeController` and `SyncService::buildLeagueSnapshot()`**, which is where the
  running game reads it. ⚠️ The export alone fixes the gate and leaves the game broken.
- Import: treat `tvDealOverride` as you treat the other two.

⚠️ **One asymmetry to get right, and it is not the payout case.** A NULL `prizeMoney` *means*
inherit. A NULL `tvDeal` means "never synced" — and `syncTvDeal()` is supposed to maintain the
column, so the column is also the cache. **Resolve at read; do not add a write to the generation
path** without saying so, because a write there is a migration-shaped change with its own blast
radius, and `LeagueService:82`'s comment is a deliberate decision you would be reversing.

**If you think the right fix is to call `syncTvDeal()` after generation instead, say so in your
report rather than doing it** — that is a different change with a different owner.

## Scope

- This is the **third instance of one defect**: a resolved figure published as its raw column.
  Fold it into A3 if it is a clean addition; if A3 is finished, report it and stop — it becomes its
  own task.
- **Do not author or change any TV figure.** Pools and authored deals are owner data.
- Still do not push, deploy, pick a division size, or touch SC's `slots`.
