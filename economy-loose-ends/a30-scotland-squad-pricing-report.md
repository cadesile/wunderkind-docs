<!-- STATUS --> **STATUS:** 🟢 DONE — A30, written 2026-11-21 by the A30 task agent. PM review pending.

# A30 — Scotland's squad was priced on England's economy block

**Repo:** `wunderkind-app`. **Branch:** `new-game-save`. **Authored at:** `b0d4c2fc` (clean tree).
**Nothing pushed, nothing deployed.**

---

## 0. Epistemic key — read this before acting on anything below

Per the brief's §5 and the standing notes, every claim in this report is marked:

- **[MEASURED]** — I ran the command shown and the output below it is pasted verbatim.
- **[READ]** — I read it in the code or in a published payload and am quoting it.
- **[BELIEVED]** — an inference. Act on it only after checking it.

🔴 **Nothing in §1–§4 is [BELIEVED].** The two [BELIEVED] items are isolated in §7, and one of
them is the only claim in this report that a device could falsify.

---

## 1. The answer, in one paragraph

**The cause is `src/hooks/useGameConfigSync.ts:75` (at `b0d4c2fc`), inside
`ensureGameConfigStored` — the strict gate that `useInitFlow`'s `ensureConfigOrFail()` runs before
any world is built.** It decided whether to re-fetch the config with `?country=` by testing
`!isCountryResolved(stored.config)`. `isCountryResolved` asks **"was this block resolved against
*a* country"**, and **England's stored block passes that test for a Scottish save.** So on a device
that had already built an English save, the gate short-circuited on `storedAt !== null`, never
fetched `?country=SC`, and the entire Scottish world was built on **England's** ladder. Nothing
ever reprices a figure written at world build, so the save stayed wrong for its whole life.

**It is one defect with three symptoms, exactly as the brief's pattern table predicted** — and the
symptoms differ in size for a reason that is itself measurable:

| written where | priced against | ratio to the correct Scottish figure |
|---|---|---|
| every NPC (`worldStore.ts:465`, one resolution per league) | EN tier *n* instead of SC tier *n* | **10.000** |
| the founder's squad (`useInitFlow.ts:1046`) | EN **t8** instead of SC **t4**, because `startingLeagueTier` read England's published `tierCount` of 8 | **10.030** |
| scouts, **at world-build ingest** (`resolveScoutWagePence`) | EN tier *n* instead of SC tier *n* | **10.000** |
| staff | re-anchored on the device from club income by `npcStaffWagePence` | **1.00 — correct, and that is why** |

⚠️ **The scout row says INGEST deliberately.** NPC scouts are *also* re-anchored after ingest, by
both `snapNpcStaffWages` and `anchorNpcStaffWages`, since `ec949536` — see §5.2, where I had this
wrong and retracted it. The 10.000× above is the figure written at world build, which is what this
defect produced and what the fix changes; what happens to it afterwards is A31's territory.

**§2 of the brief named the two pricing sites correctly and its hypothesis about *why* they were
wrong was not the cause.** The code and the brief disagree in two places, both material, and both
are set out in §5.

---

## 2. The measurement that names the cause — at `b0d4c2fc`, pre-fix

Run in a **detached worktree** cut at `b0d4c2fc`, with only a throwaway probe and two fixtures
added, using **only pre-fix APIs** so it measures the shipped code and not my change.

```
$ cd wunderkind-app && git worktree add --detach <scratch>/wt-pre b0d4c2fc
Preparing worktree (detached HEAD b0d4c2fc)
HEAD is now at b0d4c2fc `.context` stops being an append-only diary, and a test keeps it that way

$ uptime
18:49  up  1:10, 4 users, load averages: 2.45 2.27 4.23
```

The probe sets the store to **England's** live block with `storedAt` non-null (the state a device
is in after building an English save), sets `clubStore.club.country = 'SC'`, mocks
`fetchGameConfig` to return **Scotland's** live block, and then calls the real
`ensureGameConfigStored()` and the real NPC ingest site (`normalizeRawWorldPlayer`, which is what
`worldStore` calls for every NPC).

```
$ npx jest src/__tests__/economy/a30Probe.test.ts

    [A30 PRE-FIX] ensureGameConfigStored -> true
    [A30 PRE-FIX] fetchGameConfig called: 0 []
    [A30 PRE-FIX] isCountryResolved(stored): true
    [A30 PRE-FIX] stored block country: EN | tierCount: 8
    [A30 PRE-FIX] startingLeagueTier(config in hand): 8 | Scotland’s own depth: 4
    [A30 PRE-FIX] resolveEconomy at the founder site -> model: turnover | fallbackReason: none | tier: 8 | wageScaleMicroPence: 928521647
    [A30 PRE-FIX] NPC t1 ability 45 STORED: 17490657 pence | correct SC figure: 1749065 | ratio: 10.000 | SC band [ 1586824 - 1862794 ] | in band: false
    [A30 PRE-FIX] founder squad STORED: 12888922 | correct: 1285017 | ratio: 10.030
    [A30 PRE-FIX] scout ability 22 STORED: 1921654 | correct: 192165 | ratio: 10.000
PASS src/__tests__/economy/a30Probe.test.ts
Tests:       1 passed, 1 total
```

**[MEASURED] What that output establishes, line by line:**

1. `fetchGameConfig called: 0` — **the gate performed no fetch at all** for a Scottish save. That
   is the defect, and it is observed rather than inferred.
2. `isCountryResolved(stored): true` — the predicate the gate used returns **true** on England's
   block while Scotland is being built. The guard is the right guard for the wrong question.
3. `stored block country: EN | tierCount: 8` — the config in hand at **world-build time** is
   England's, with England's depth.
4. `fallbackReason: none | model: turnover` — 🔴 **the save was priced on the TURNOVER model with
   no fallback whatsoever.** See §5.1: this disproves the brief's §2b hypothesis outright.
5. The three stored ratios — **10.000 / 10.030 / 10.000** — reproduce the device's readings
   (`stored/band 10.00` on scouts; player valuations 9.27–10.69 against a mean of ~10).
6. `in band: false`, against the Scottish band `[1,586,824 – 1,862,794]` — the stored figure is
   outside the band that governs it, which is the relationship the CHECKS panel reports as a ratio.

### 2a. Why 10.000 and 10.030 are the right two numbers, not one

**[MEASURED]** Captured from the live dev API on 2026-11-21, all three requests inside one minute
(full payloads and a README are in `a30-config-capture-2026-11-21/`):

```
$ curl -s "https://api.dev.buildmyclub.co.uk/api/game-config?country=EN" -o cfg.EN.json
$ curl -s "https://api.dev.buildmyclub.co.uk/api/game-config?country=SC" -o cfg.SC.json
$ curl -s "https://api.dev.buildmyclub.co.uk/api/game-config"            -o cfg.NONE.json
EN bytes:    32437
SC bytes:    31273
NONE bytes:    32435

=== EN ===
country= 'EN' wageModel= turnover tierCount= 8 rows= 8
  tier 1 resolvable True wageScaleMicroPence 1269725639
  tier 2 resolvable True wageScaleMicroPence 1031522690
  tier 3 resolvable True wageScaleMicroPence 949061019
  tier 4 resolvable True wageScaleMicroPence 925730138
  tier 5 resolvable True wageScaleMicroPence 829701212
  tier 6 resolvable True wageScaleMicroPence 850090181
  tier 7 resolvable True wageScaleMicroPence 821051954
  tier 8 resolvable True wageScaleMicroPence 928521647
=== SC ===
country= 'SC' wageModel= turnover tierCount= 4 rows= 4
  tier 1 resolvable True wageScaleMicroPence 126972564
  tier 2 resolvable True wageScaleMicroPence 103152269
  tier 3 resolvable True wageScaleMicroPence 94906102
  tier 4 resolvable True wageScaleMicroPence 92573014
=== NONE ===
country= None wageModel= turnover tierCount= 8 rows= 8
  tier 1 resolvable True wageScaleMicroPence 847206430
  tier 2 resolvable True wageScaleMicroPence 387311996
  tier 3 resolvable True wageScaleMicroPence 159757285
  tier 4 resolvable True wageScaleMicroPence 138884770
  tier 5 resolvable True wageScaleMicroPence 83195802
  tier 6 resolvable True wageScaleMicroPence 59670217
  tier 7 resolvable True wageScaleMicroPence 35619298
  tier 8 resolvable True wageScaleMicroPence 27554524
```

- **EN t1 ÷ SC t1 = 1,269,725,639 ÷ 126,972,564 = 10.000** → every NPC, at matching tiers.
- **EN t8 ÷ SC t4 = 928,521,647 ÷ 92,573,014 = 10.030** → the founder's squad, which is priced at
  the country's *lowest* tier, and so compares England's eighth against Scotland's fourth.

🔴 **And this rules out the brief's §2d lead by measurement.** The **no-country fallback is not a
scaled copy of England** — its ladder declines far more steeply, and its tier 8 (27,554,524) is
**under a third of SC t4**. A save built on the fallback would be too **cheap** at the bottom of
the pyramid, not ten times too dear. So the fallback branch in the sync path cannot be this defect,
and the `SyncService` fallback lead can be closed.

---

## 3. The fix

**One line of behaviour, in the guard, plus the accessor it needs.**

`src/economy/economyConfig.ts` — a new `economyBlockCountry(config)` returning the block's own
country marker, normalised and trimmed, or `null` for the const fallback. `isCountryResolved` is
now defined in terms of it (`economyBlockCountry(config) !== null`), so the two predicates cannot
drift, and its docblock records that it answers the **weaker** question and must not be used to
decide whether a block is usable for a given country.

`src/hooks/useGameConfigSync.ts` — the guard:

```diff
-  const needsCountryRefetch = !!wanted && !isCountryResolved(stored.config);
+  const needsCountryRefetch = !!wanted && economyBlockCountry(stored.config) !== wanted.trim().toUpperCase();
```

**Why this shape, and not a `country` field on the store.** The block already carries the backend's
own marker, and `loadExport.assertCountryResolved` in the harness already refuses an EN-resolved
config under `--country SC` — so comparing the marker against the wanted country is this project's
existing idiom for exactly this question, not a new mechanism. Case-folded and trimmed because the
club's code comes from `enabledCountryOptions` and the marker from the backend's resolver: they are
the same vocabulary today, and a case difference between them would otherwise read as a country
change and re-fetch on every init step.

**Both pre-existing states behave exactly as before** — see the four control assertions in §4.2.

### 3a. What the fix does NOT do

🔴 **[READ] It does not repair a save that already exists.** Every wrong figure was written once at
world build and nothing reprices one — which is the whole reason this defect was expensive. **The
owner needs a NEW Scottish save** to see correct wages. An existing Scottish save remains priced on
England's ladder and is not worth tuning against.

---

## 4. Verification

### 4.1 The new suite

`src/__tests__/economy/scotlandSquadPricing.test.ts`, with two fixtures captured from the single
live publish in §2a (`gameConfig.ladder-en.json`, `gameConfig.ladder-sc.json`) — a matched pair,
because two payloads from different publishes would reconcile against nothing.

It asserts through the **real guard** and the **real ingest site**, never over the pricing function.
🔴 **A unit test over `packPlayerWeeklyWagePence` would have passed throughout this defect's entire
life, and so would one over the band** — the band does scale 10.000 EN/SC, which a previous session
verified correctly. The function was never wrong; the config handed to it was.

### 4.2 The stored figures, before and after, through the same probe

**[MEASURED]** The §2 probe, re-run unchanged at the fixed commit (only its two final expectations
flipped), in a second detached worktree at `92e90755`:

```
    [A30 POST-FIX] ensureGameConfigStored -> true
    [A30 POST-FIX] fetchGameConfig called: 1 [["SC"]]
    [A30 POST-FIX] isCountryResolved(stored): true
    [A30 POST-FIX] stored block country: SC | tierCount: 4
    [A30 POST-FIX] startingLeagueTier(config in hand): 4 | Scotland’s own depth: 4
    [A30 POST-FIX] resolveEconomy at the founder site -> model: turnover | fallbackReason: none | tier: 4 | wageScaleMicroPence: 92573014
    [A30 POST-FIX] NPC t1 ability 45 STORED: 1749065 pence | correct SC figure: 1749065 | ratio: 1.000 | SC band [ 1586824 - 1862794 ] | in band: true
    [A30 POST-FIX] founder squad STORED: 1285017 | correct: 1285017 | ratio: 1.000
    [A30 POST-FIX] scout ability 22 STORED: 192165 | correct: 192165 | ratio: 1.000
PASS src/__tests__/economy/a30ProbePost.test.ts
Tests:       1 passed, 1 total
```

| **stored** figure, Scottish save | at `b0d4c2fc` | at `92e90755` | Scottish band |
|---|---|---|---|
| NPC, t1, ability 45 | 17,490,657 (**10.000×**) | **1,749,065 (1.000×)** | 1,586,824 – 1,862,794 — **in band** |
| founder's squad, ability 45 | 12,888,922 (**10.030×**) | **1,285,017 (1.000×)** | priced at t4, not t8 |
| scout, ability 22 | 1,921,654 (**10.000×**) | **192,165 (1.000×)** | — |
| gate's fetch | `called: 0 []` | **`called: 1 [["SC"]]`** | — |
| pricing tier | 8 (England's depth) | **4 (Scotland's own)** | — |

### 4.3 England is unchanged — by evidence, not assertion

Three independent pieces, none of them an assertion that the diff "looks safe":

1. **[MEASURED] The guard performs no fetch for England after England**, and the stored block is
   untouched — `expect(fetchGameConfig).not.toHaveBeenCalled()` plus
   `expect(…economyTierBaseline).toEqual(EN.economyTierBaseline)` (deep equality on the whole
   block, not a spot check). The other three pre-existing states are pinned too: the no-country
   fallback still re-fetches, the pre-pick state still does nothing, and a case-only difference is
   not a country change.
2. **[READ] The predicate is a strict superset of the old one where England is concerned.** Old:
   re-fetch iff `wanted && blockCountry === null`. New: re-fetch iff
   `wanted && blockCountry !== wanted`. For an English save on an English block both are false; for
   the fallback both are true. **The only states whose behaviour changes are the mismatched ones —
   which were broken.** An English save created after a *Scottish* one was equally broken before
   and is now fixed; that is a change in England's behaviour, and it is the defect, not a
   regression.
3. **[MEASURED] The whole suite, at a named commit, zero failures** — §4.4, which is the control
   for everything the guard is upstream of (NPC balances, sponsor pots, valuation and coverage
   rows).

### 4.4 `npm test` and `npx tsc --noEmit`, both at named commits

**Both runs in detached worktrees at named commits, inside the workspace root (see §8.1), with the
machine handed over by session `e9c44b` first and `uptime` checked before each.**

**Baseline — `b0d4c2fc`, nothing of mine present:**

```
$ uptime
18:53  up  1:13, 4 users, load averages: 6.10 6.72 5.88
$ npx jest --listTests | wc -l
     662
$ npx jest
Test Suites: 662 passed, 662 total
Tests:       3 skipped, 11130 passed, 11133 total
Snapshots:   0 total
Time:        123.208 s
EXIT=0
$ npx tsc --noEmit
TSC_EXIT=0
```

**With the fix — `92e90755`:**

```
$ uptime
19:00  up  1:20, 4 users, load averages: 7.32 9.05 7.48
$ node -v
v20.19.6
$ git log --oneline -1
92e90755 A Scottish save stops being built on England's economy block
$ npx jest --listTests | wc -l
     663
$ npx jest
Test Suites: 663 passed, 663 total
Tests:       3 skipped, 11147 passed, 11150 total
Snapshots:   0 total
Time:        118.91 s
EXIT=0
$ npx tsc --noEmit
TSC_EXIT=0
$ uptime
19:02  up  1:23, 4 users, load averages: 22.86 13.86 9.59
```

**Zero failures in both.** Filtered for `^FAIL` and `^  ● [A-Za-z]` (excluding `● Console`), per the
brief's §5: **no lines at all** in the post-fix run, so there is nothing to re-run alone.

✅ **The count reconciles exactly, which is the check the standing notes care about most:**

| | suites | passed | collected | `--listTests` |
|---|---|---|---|---|
| `b0d4c2fc` baseline | 662 | 11,130 | 11,133 | 662 |
| `92e90755` | 663 | 11,147 | 11,150 | 663 |
| delta | **+1** | **+17** | **+17** | **+1** |

**+1 suite** is `scotlandSquadPricing.test.ts`. **+17 tests** is its 15 plus the 2 added to
`economyDiagnostics.test.ts` (the `info` pre-pick row and the DISAGREE row). Nothing unattributed.

⚠️ **Two caveats on the timings, neither affecting the counts.** The pre-run load averages
(6.10 and 7.32 on 8 cores) are my own previous run decaying, not another session — checked with
`ps -eo pid,ppid,%cpu,etime,comm`, whose top consumers were DisplayLink at 24%, this Claude process
at 22% and WindowServer at 13%, with **nothing resembling the eight ~80% orphans of 2026-11-20**.
And the closing `22.86` is the suite's own workers, which is what the standing notes describe as
in-run self-contention. Both runs are **faster** than the project's recorded clean baselines
(123.2 s and 118.9 s against 206.9 s), so no wall-clock assertion was under pressure in either.


---

## 5. Where the brief and the code disagree

The brief asked to be told this plainly, so here it is, with the measurement beside each.

### 5.1 🔴 `fallbackReason` was never the signal, and printing it would have collapsed nothing

**The brief's §2b is its own strongest lead and it is wrong — not partly, but in its premise.** It
reads: *"The Scottish dump says `Squad pricing model: LEGACY — FAIL`, which means
`reason !== 'none'`"*, and recommends printing `fallbackReason` as the first measurement, on the
grounds that it *"collapses the search space by four"*.

**[READ] The panel's `LEGACY` does not come from `resolveEconomy` at all.** The row is built in
`src/components/debug/checksReport.ts:456-470` from `fingerprintWorldPack(clubs).pricing`
(`src/economy/worldPackDiagnostics.ts:97-99`), which is:

```ts
const pricing: PackPricing = bottomTier === null
  ? 'unknown'
  : bottomTier.meanWagePence > LEGACY_TELL_BOTTOM_TIER_PENCE ? 'legacy' : 'turnover';
```

`LEGACY_TELL_BOTTOM_TIER_PENCE` is a **fixed 250,000 weekly pence** (`:31`). So the row is a
**threshold on the stored bottom-tier mean NPC wage** — a heuristic over the stored data, not a
read of any resolver state. There is no `fallbackReason` anywhere in that path.

**[MEASURED] And `fallbackReason` was `'none'` throughout.** §2's probe prints
`model: turnover | fallbackReason: none`, and §2a shows why that is structural rather than
incidental: **every row either country publishes is `resolvable: true` under
`wageModel: 'turnover'`**, so `resolveEconomy` returns `'none'` at every tier Scotland has.

So the Scottish `LEGACY` reading is **a consequence of the over-pricing, not a clue to its cause**:
a Scottish bottom tier priced on England's ladder lands above a threshold calibrated on England's
correctly-priced money, and so reads as the wrong model. Had the first measurement been the one the
brief recommended, it would have printed `none` at both sites on both countries and looked like a
dead end.

⚠️ **A second-order consequence worth the PM's attention.** That 250,000 threshold is an
**England-calibrated absolute** with no country term, and it decides a `fail` row. It happens to
read correctly for a correctly-priced Scotland (which is cheaper, so still under), but it is a
country-blind money constant in a panel whose whole job is now multi-country. **I have not touched
it** — out of A30's scope, and it is the same class as the `tiers are flexible` register.

### 5.2 The brief's §3 CHECKS candidate already exists, and it already fired

The brief proposes adding *"stored squad wage vs the band that governs it, with the country and the
`fallbackReason` beside it"*.

**[READ] That row exists.** `judgeValuation` (`economyDiagnostics.ts:889`) returns `ratio`,
`inBand`, `model` and `fallbackReason`, and `valuationLines` prints
`stored … · expected … [min–max] turnover → ratio 10.03  OUTSIDE THE MODEL’S OWN BAND`. **It is
what produced the brief's own evidence** — the `9.27–10.69, ALL 8 OUTSIDE the band` reading. The
same was claimed of the scout row, which `economy-reference.md:1505-1511` documents as reading
`stored/band 10.00` on Scotland against England's `1.00`, and calls England's 1.00 *"a FALSE
PASS … a coincidence of the country tested first"*.

So the diagnostic gap was never **"what is stored vs what should be"**. The **player valuation** row
said in numbers that the squad was ten times too dear, and that row's comparator is sound — it
resolves against the config the device holds now and prices through `weeklyWageRange`, the one
implementation. (The scout row printed the same 10.00, but whether its comparator is still the
governing rate is exactly what the retraction below is about, so I am not resting anything on it.)
**The gap was that nothing on the panel said WHY**, and the one row that could have —
`economy.country` — reported a **PASS**. That is the row I changed. See §6.

🔴 **RETRACTED 2026-11-21, and the retraction is the most useful paragraph in this report.**

This section previously carried a "correction to the brief's §4", claiming that NPC **scouts** are
band-priced at ingest and then left alone — so that the brief was wrong to expect the CHECKS scout
row to read wrong, and the `stored/band 10.00` was a genuine reading of a stale write.

**That was wrong. The brief was right. [MEASURED] in the source:**

```
$ sed -n '205,262p' src/engine/SeasonBudgetService.ts
 * Returning one object rather than two values is deliberate: a caller cannot spread the staff
 * half and forget the scouts, which is the exact shape of the defect being fixed.
type AnchoredRosters = Partial<Pick<WorldClub, 'staff' | 'scouts'>>;
/** The scout half of a re-anchor pass. `null` when nothing moved. */
function anchorScouts(club, budget, economy, price) …
function anchorNpcStaffWages(club, budget): AnchoredRosters | null {
  const scouts = anchorScouts(club, budget, economy, staffRenewalWagePence);

$ git log --oneline -S "function anchorScouts" -- src/engine/SeasonBudgetService.ts
ec949536 A club's scouts are re-priced on its own income, like its coaches

$ git show 92e90755:src/engine/SeasonBudgetService.ts | grep -c "function anchorScouts"
1
```

**NPC scouts ARE re-anchored**, by both passes, since `ec949536` — which is exactly what the brief
said and what that commit's own subject line says. So the panel's scout `stored/band` ratio is
compared against a rate that is no longer governing, and the brief's warning stands untouched.

🔴 **How I got it wrong, because this is the transferable part.** I took it from
`economy-reference.md:1497-1511` and the panel's own docblock, **both of which are stale prose in
the present tense**, and I quoted them as `[READ]` without opening `SeasonBudgetService.ts`. The
stale claim sits *inside the very module whose comparator it misdescribes*. So: **a citation marked
`[READ]` is still only a claim — the mark records where I got it, not that it is true.** It fooled
the session that had just spent a day proving "a comment is a claim, not a measurement", in a report
whose own §8.2 records the same lesson catching me once already. Caught by the PM session, which
measured it; `economy-reference.md:1497-1511` and `economyDiagnostics.ts:1305-1306` are stale and
are A31's to fix.

⚠️ **The live subtlety, which is an open measurement and must not be hardcoded either way.**
`snapNpcStaffWages` (`:699-701`) returns `null` on `!economy.incomeAnchoredWages`, so **with that
flag off the band does still govern at bootstrap** — while `anchorNpcStaffWages` is deliberately
ungated (its comment says `npcStaffWagePence` already returns `undefined` with the flag off, so
adding the gate "would change this pass's behaviour rather than just its shape"). Whether the scout
half honours the flag the way the staff half does is **not settled by anything I measured.**

**None of this touches A30's cause, fix or verification**, and that boundary is worth stating
precisely: the scout figure in §2 is a **world-build ingest** price, measured by driving
`resolveScoutWagePence` with the resolved economy directly, and ingest runs before any bootstrap or
transition pass. What it costs me is one piece of **corroboration**: the device's scout row may be
the broken comparator A29/A31 owns rather than a clean reading of a stale write. The cause stands on
§2's config measurement, which does not depend on it.

### 5.3 The two `tiers are flexible` violations in the path: checked off, neither is the cause

Both the brief's §2c and session `e9c44b` flagged `tierRowFor`'s index arithmetic as the
highest-risk candidate. **[MEASURED] It is not this defect:**

- **`tierRowFor` reads `tiers[tier - 1]`** (`economyConfig.ts:125`) and the published arrays from
  §2a are **dense, 1-based and in order** for both countries (EN tiers 1–8, SC tiers 1–4), so it
  agrees with `perTierEconomy.tierRow`'s `.find(r => r.tier === …)` on today's payloads. The latent
  risk is real and remains unfixed; **it is not what mispriced Scotland.** I did not widen scope to
  it — ~20 production callers, and the brief asks for the blast radius to be flagged first.
- **`startingLeagueTier`'s `Math.min(8, count)`** (`perTierEconomy.ts:129`) is **inert for
  Scotland**, measured: `tierCount` is 4, and `min(8, 4) = 4`. ⚠️ **But it is load-bearing in the
  failure anyway, for a different reason** — with *England's* config in hand it returns 8, which is
  what makes the founder's squad 10.030× rather than 10.000×. The cap did not misbehave; it read a
  truthful 8 off the wrong country's block.

---

## 6. The CHECKS row

🔴 **I upgraded the existing `economy.country` row instead of adding a line**, because the brief and
the standing notes both say the output is already too heavy and a new row must earn its place — and
because the row that needed to change is the row that **lied**. Net new lines on the panel: **zero**.

**Before** (`economyDiagnostics.ts`, at `b0d4c2fc`): status was `isCountryResolved(config) ? pass :
fail`, and the passing detail read `country EN — scales and sponsor bands are country-scaled`.
🔴 **On the broken Scottish save, that row said PASS.** The block *was* fully resolved and fully
scaled — for the wrong country. A row that prints the block's country without the save's cannot
fail on the one state nobody thought of.

**After:** `economyChecks(config, tier, clubCountry?)` compares the two and states a relationship.
`ChecksTab.tsx` passes `useClubStore.getState().club?.country`.

| state | status | detail |
|---|---|---|
| block has no country | `fail` | `club SC · block NULL — this is the const fallback; …` |
| no country picked yet | `info` | `club — (no country picked yet) · block EN — nothing to compare against` |
| they agree | `pass` | `club EN · block EN — AGREE; scales and sponsor bands are this country's` |
| **they disagree** | **`fail`** | `club SC · block EN — DISAGREE. Every figure written once at world build was priced on EN's ladder, and nothing reprices one.` |

It states a relationship, it can fail, and it fails on exactly the state that shipped — four
assertions in the new suite pin each row, and `economyDiagnostics.test.ts` gained the disagreement
case. **The pre-pick state is `info`, deliberately not `pass`:** reporting agreement where there is
nothing to compare is how the old row got its false pass.

### 6.1 Entering A29's territory, declared

The brief says `economyDiagnostics.ts` and `ChecksTab.tsx` were deliberately left alone as A29's
territory and that I should say so if I touch them. **I touched both.** The edits are confined to:
the `economy.country` row and its block comment; one new optional third parameter on
`economyChecks`; one import line; and four lines at the `ChecksTab` call site. **I changed no other
row, no sampling constant, and nothing in the scout or staff paths.**

---

## 7. The two [BELIEVED] claims, isolated

🔴 **Neither is measured. Both are marked so they cannot be mistaken for findings.**

1. **[BELIEVED] How the owner's device got into the failing state: an English save was created
   first, in the same install.** That is the only route I can see to `storedAt !== null` with an
   `EN` block while `SC` is being built — the gate's two callers
   (`useInitFlow.ts:1825`, `:1887`) both run after `clubStore.club.country` is set, and
   `hydrateFromDevice` sets `storedAt` from the AsyncStorage cache, so the EN block survives an app
   restart. **Why I believe it:** the brief records an English save verified on the same pack
   version, same build, same hour. **What would falsify it:** a Scottish save built on a genuinely
   fresh install coming out correct, which this mechanism predicts it would.
   **This does not affect the fix** — the guard is wrong for *any* stored foreign country,
   regardless of how one got there, and §2 measures the defect from the state rather than from the
   history.
2. **[BELIEVED] Every other world-build-time figure in a Scottish save is wrong by its own country
   ratio, not just wages.** NPC starting balances (`npcStartingBalanceByTier`), league sponsor pots
   and NPC sponsor contracts are all read once at build from the same `GameConfig` the guard
   governs, so the same wrong block fed them. **I measured wages and scout wages only.** The fix
   addresses the source for all of them, but I have not confirmed the others' magnitudes.

---

## 8. Flagged for the PM, not edited

### 8.1 🔴 `contextDocSync.test.ts` cannot pass in a detached worktree outside the workspace

**[MEASURED], and it changes the project's own verification instruction.** My first worktree was
cut in my scratchpad, which is where the standing notes' "detached worktree at a named commit"
reads most naturally. The baseline there, **at `b0d4c2fc`, with none of my code present**:

```
Test Suites: 1 failed, 661 passed, 662 total
Tests:       1 failed, 3 skipped, 11129 passed, 11133 total
Time:        135.857 s

FAIL src/__tests__/db/contextDocSync.test.ts
  ● .context/ cites no dead paths › introduces no path that resolves in neither the repo nor the parent workspace
    - Array []
    + Array [
    +   ".context/stages/01_overview/output/environment.md -> docs/economy-loose-ends/dof-pot-refund-report.md",
    +   ".context/stages/02_architecture/output/structure.md -> assets/Components/AvatarV3",
    …28 entries…
```

**Cause, read from the test:** `WORKSPACE_ROOT = join(REPO_ROOT, '..')`
(`contextDocSync.test.ts:25-27`), and `:245-246` resolves every cited path against `REPO_ROOT` then
`WORKSPACE_ROOT`. In a worktree under `/private/tmp/…`, `..` is the scratch directory, so every
`.context` citation of `docs/…` or `assets/Components/…` — which live in the parent workspace, not
in the repo — resolves nowhere. **Confirmed by relocation and nothing else:** re-cutting the same
commit at `/Users/courtneyadesile/Documents/WunderkindFactory/.a30-wt` and running that one suite:

```
PASS src/__tests__/db/contextDocSync.test.ts
Tests:       48 passed, 48 total
```

**[MEASURED] attribution:** the suite is new in `b0d4c2fc`, which is session `e9c44b`'s commit — it
told me so itself and `git show --name-only` agrees. **I am reporting a property of the test, not a
defect and not a complaint:** at `b0d4c2fc` with my changes absent, it fails in one location and
passes in another. **The transferable consequence is the one that matters:** the standing
instruction *"verify in a detached worktree at a named commit"* now additionally requires that the
worktree sit **inside the workspace root**, or this suite fails for environmental reasons that look
exactly like a regression. That belongs in `environment.md` beside the worktree instruction — **the
PM's file, so I have not written it.**

### 8.2 Stale or wrong, flagged rather than edited

- **Nothing stale found in `CLAUDE.md`'s `new-game-save` row.** [MEASURED] — it reads
  **662 / 11,130, 11,133 collected, 3 skipped** and my own clean baseline at `b0d4c2fc` is
  identical. ⚠️ I had drafted a flag here claiming 11,129 and a transcription slip; that figure
  came from the **contaminated** first run in §8.1, where `contextDocSync`'s one failing test moved
  11,130 passed to 11,129 passed + 1 failed. **A count that does not reconcile is a reason to
  investigate, not to flag** — the standing notes say exactly this, and here the discrepancy was
  entirely my measurement environment.
- **`economy-reference.md` §2064** records that *"Scotland has never been gate-measured and cannot
  be on any machine here"* because every captured config was EN, and that one
  `GET /api/game-config?country=SC` saved as `game-config-sc.LIVE.json` unblocks the whole gate
  suite. **That file now exists** — see `a30-config-capture-2026-11-21/`, with EN and the
  no-country fallback captured in the same minute. Whether to run the SC gate with it is the PM's
  call. **That paragraph is now out of date and I have not edited it.**
- **`VALUATION_SAMPLE_TIERS = [1, 3, 5, 8]`** (`economyDiagnostics.ts`, violation 4 of the
  `tiers are flexible` register) is why the Scottish dump sampled **8** players and England's
  sampled **16**: on a four-tier country, tiers 5 and 8 can never match a player. **It is in a file
  I edited and I left it alone** — it is the register's item, not A30's, and fixing it would change
  the panel's sampling on every country.
- **Nothing in `.context` describes the `economy.country` row, so my change makes no stage text
  wrong.** [MEASURED] — `grep -rn "Economy block resolved\|economy\.country" .context/stages/*/output/*.md`
  returns nothing, and `economy-reference.md:154` describes `economyDiagnostics.ts` only at file
  level (*"Debug → CHECKS, every economy row … one caller — debug/ChecksTab.tsx"*), which stays
  true. ⚠️ I had asserted the opposite in a draft of this report, from memory of that module
  index, and the grep disproved it — recorded because it is this project's own rule working on its
  author: **a citation is a claim until it is run.**
- ⚠️ **`economy-reference.md:154` gives `economyDiagnostics.ts` as 1,545 lines**; my change makes
  it 1,580. A size in prose, not a rule — flagged, not edited.

---

## 9. `.context`

**I read `b0d4c2fc` first, as instructed.** Its new rules: `shared/last-sync.md` is rotated,
newest at the BOTTOM, the three-bullet header at the top is the only machine-read part, no new
dated `Correction: YYYY-MM-DD` annotations in stage outputs, and `contextDocSync.test.ts` enforces
all of it.

**What I did:** appended one pass entry to `.context/shared/last-sync.md`, below the header,
newest-at-the-bottom, header untouched. **I did not restructure anything, prune anything, or add a
dated correction annotation.** **Everything in §8 is flagged for the PM rather than edited.**

**[MEASURED] My change makes no stage text wrong** — see §8.2: nothing in
`.context/stages/*/output/` mentions the row I changed, and the only stale thing my change creates
is a line count in prose. So there was no stage correction for me to make, which is the lighter of
the two outcomes the brief allows for.

---

## 10. State, and what is left

**Commit:** `92e90755` — *"A Scottish save stops being built on England's economy block"*, on
`new-game-save`, on top of `b0d4c2fc`. **Nothing pushed. Nothing deployed.** Nine files:

```
 .context/shared/last-sync.md                             | one appended pass entry
 src/economy/economyConfig.ts                             | + economyBlockCountry
 src/economy/economyDiagnostics.ts                        | the economy.country row
 src/hooks/useGameConfigSync.ts                           | THE FIX — one line of behaviour
 src/components/debug/ChecksTab.tsx                        | passes the save's country
 src/__tests__/economy/economyDiagnostics.test.ts          | +2 tests
 src/__tests__/economy/scotlandSquadPricing.test.ts        | new, 15 tests
 src/__tests__/economy/__fixtures__/gameConfig.ladder-en.json | new fixture
 src/__tests__/economy/__fixtures__/gameConfig.ladder-sc.json | new fixture
```

**Concurrency, for the record.** Session `e9c44b` was the live writer; I asked for the machine
before any full run, it confirmed both repos committed and clean and that **none** of my files were
its (its own were `GameLoop.ts`, `SimulationService.ts`, `ampNpcSelectionParity.test.ts`,
`contextDocSync.*`, all of `.context/`, and two docs). I staged by explicit path, authored in the
shared checkout, verified only in detached worktrees, and **restored no path I did not author.**
I will tell it I am off the machine. ⚠️ **It and I both wrote `.context/shared/last-sync.md`** —
its rotation at `b0d4c2fc` and my appended entry below it, header untouched, newest at the bottom,
`contextDocSync` green.

### 10.1 For the PM

1. 🔴 **The owner needs a NEW Scottish save.** The fix changes what gets written at world build; it
   repairs nothing already written. An existing Scottish save is still priced on England's ladder.
   **A Scottish save created before `92e90755` is not worth tuning against** — and since the brief
   says this defect is the one thing between the owner and economy tuning, that is the gating step.
2. **The device check to ask for, now that the panel can answer it:** on a fresh Scottish save,
   Debug → CHECKS row 1 should read `club SC · block SC — AGREE`. If it reads `DISAGREE`, the
   guard was bypassed by a path I have not found; if it reads `AGREE` and valuations are still out
   of band, the cause is downstream of the config and A30's diagnosis is incomplete. **That is the
   one measurement that could falsify this report**, and it is now one line on the panel rather
   than a prose request.

   ✅ **And as of this evening nothing needs preparing to take it.** [MEASURED by the backend
   session `0d443d`, 19:29:55 UTC 2026-11-21, reported to me — **not my measurement**]: dev holds
   **two complete unclaimed v14 Scottish sets** (`01a1fab3…`, `01a1ff72…`, 4 tiers each,
   `sc_tier_payload_rows = 8`, `worldpackset` queue 0). A fresh save claims one and the queue
   restocks in ~2 minutes.

   🔴 **Do NOT press admin TOP UP or Regenerate to prepare it**, per that session: its
   `deficit()` fix is **not deployed**, so TOP UP can still report *"already at target"* while
   writing nothing, and Regenerate calls `deleteUnclaimed()` — which would destroy both good sets
   to rebuild from scratch for no gain. **Still read the pack version indicator before any number
   underneath it**; v14 is current and a `MIXED`/`STALE` reading remains a gate.

   ⚠️ **One consequence of that same undeployed defect, which cuts the other way and is mine to
   flag:** a top-up that reports success while writing nothing means *"pack version 14, single, no
   `MIXED`"* was a **weaker guarantee when it was taken than its wording suggests**. It does not
   touch A30 — §2's cause rests on a code measurement at a named commit, not on the device dump —
   but any **other** dev device reading this workstream has banked before that fix deploys deserves
   the same scepticism. That session has recorded it in its own report §6 as `[INFERRED from the
   mechanism]`, which is the right epistemic mark for it.
3. **A `CLAUDE.md` / `environment.md` branch row, measured and yours to add:**
   `new-game-save` — **663 suites / 11,147 tests**, 2026-11-21, at `92e90755`. 11,150 collected,
   3 skipped, zero failures, `--listTests` 663, 118.9 s, `tsc` clean, **measured in a detached
   worktree inside the workspace root**. ✅ Reconciles exactly against 662 / 11,130 at `b0d4c2fc`:
   +1 suite / +17 tests.
4. **§8.1's worktree-location constraint belongs in `environment.md`** beside the existing
   detached-worktree instruction. It cost me one full run and it will cost the next agent one too.
5. **`a30-config-capture-2026-11-21/` holds the SC config** that `economy-reference.md` §2064 says
   unblocks the whole SC gate suite. Running that gate is a task, not a loose end — your call.

### 10.2 Not done, and deliberately so

- **The four `tiers are flexible` violations are untouched**, including `tierRowFor`'s indexing
  (§5.3) and `VALUATION_SAMPLE_TIERS` (§8.2) — the latter is in a file I edited, and it is why the
  Scottish dump sampled 8 players where England sampled 16. Flagged, not fixed: the register is
  its own work and `tierRowFor` has ~20 production callers.
- **The 250,000-pence `LEGACY` threshold is untouched** (§5.1), though it is a country-blind money
  constant deciding a `fail` row on a panel that is now multi-country.
- **Facilities, upkeep and any calibration are untouched**, per the brief's §4. **I re-ruled
  nothing about what anything should cost** — every figure in this report is either a published
  value or a ratio between two of them.
