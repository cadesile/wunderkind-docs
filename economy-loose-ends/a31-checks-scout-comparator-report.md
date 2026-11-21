<!-- STATUS --> **STATUS:** 🟢 COMPLETE — A31, 2026-11-21. Commit `925d40a5` (code) + `.context` pass.

# A31 — the CHECKS panel ratios every sampled wage against the rate that governs it

**Epistemic key, used throughout and applied per claim.** Everything below carries one:

- ✅ **MEASURED** — I ran the command or the code and the output is pasted verbatim.
- 🔵 **READ IN CODE** — I traced the call graph at a named commit; no execution.
- 🟡 **INFERRED** — reasoning from the above. Act on it only after checking.
- 🔴 **DISPUTED/CORRECTED** — the brief, a comment or a `.context` file said otherwise.

---

## 0. Headline, for a coordinator who reads one section

1. 🔴 **The brief's instance-3 premise is wrong, and in the more dangerous direction.** It
   predicted a *sensitivity floor* — that for any country scaled below England the legacy-tell
   check **cannot fail**. ✅ Measured: the opposite. A **correctly priced Scottish bottom tier
   reads `LEGACY — FAIL`.** It is a false alarm on correct data, not a missed alarm. §4.
2. 🔴 **That row is still failing on every Scottish save today** — `92e90755` did not fix it, and
   its `FAIL` was being read as A30's defect recurring. ✅ Measured. §4.
3. ✅ **The brief's instance-1 premise holds** and §2a's reading of the code is correct in every
   particular I checked. The fix is a **deletion**. §2.
4. ✅ **§2b's question is answered: the scout half DOES honour `incomeAnchoredWages`**, by the same
   mechanism as the staff half, and the fix needed no flag read at all. §3.
5. ✅ **§5's design tension dissolves.** No second injected rate was needed; `7b56c6c8` was right
   and its warning still stands. §6.
6. 🔴 **FIVE pieces of stale prose, not the two the brief named** — including the
   operator-visible copy the owner actually reads, which is the worst-placed of them. §7.
7. ⚠️ **`computeNpcWageBill` counting scouts is a real behaviour change that needs the owner.** It
   moved no test, so it does not shift NPC signing behaviour in the suite, but the live
   feedback path is traced in §5 and I have tuned nothing. **Your call to take up.**
8. ✅ **663 suites / 11,168 passed, 3 skipped, ZERO failures**, `tsc` clean, at `925d40a5` in a
   detached worktree outside both repos, on a quiet machine. §9.

**Nothing pushed. Nothing deployed. No worktree left inside the repo.** §10.

---

## 1. State of the checkout — what I found, and three divergences from §0a

### 1a. ✅ The suite count is 663, but `wc -l` says 668 and both are correct

🔴 **The brief says to stop if it is not 663. It read 668. I did not stop, because the difference
is not drift and I could show that in one command rather than reasoning about it.**

```
$ npx jest --listTests 2>/dev/null | wc -l
     668
$ npx jest --listTests 2>/dev/null | sed "s|^$PWD/||" | sort \
    | cut -d/ -f1-2 | sort | uniq -c | sort -rn | head
 663 src/__tests__
   1 jest-haste-map: Haste module naming collision: wunderkind-app
   1   The following files share their name; please adjust your hasteImpl:
   1     * <rootDir>/src
   1     * <rootDir>/package.json
   1
```

✅ **663 test files. The other five lines are a haste-map collision warning that jest writes to
STDOUT, so `wc -l` counts it as if it were a suite.** The collision was caused by
`src/.verify-wt/package.json`:

```
    * <rootDir>/package.json
    * <rootDir>/src/.verify-wt/package.json
```

⚠️ **The lesson for this project's own instruction: `--listTests | wc -l` is not robust, because
jest's warnings share the stream. `| grep -c "__tests__"` is.** Every count in this report uses
the grep form, and §0a's own worktree incident would have been diagnosable in one command with it.

### 1b. 🔴 `src/.verify-wt/` was NOT gone, and it is being cycled live

§0a says *"It is gone now and the count is back to 663 — I re-measured."* ✅ It was present when I
measured:

```
$ git status --porcelain --untracked-files=all
 M jest.config.js
?? src/.verify-wt/
```

…and **absent forty seconds later**, in my very next command:

```
$ ls -a src/.verify-wt/
ls: src/.verify-wt/: No such file or directory
```

🟡 **Inferred:** another session is creating and deleting it as part of its own verification loop.
⚠️ **It was UNTRACKED, not a registered worktree** — `git worktree list` never showed it, so §0a's
recommended check cannot see this form of it, and neither can the git-derived ignore list that
`ce08e566` introduced (it asks `git worktree list --porcelain`, which does not list a plain
directory). **A nested plain COPY still doubles collection**; `ce08e566`'s retained
`/.claude/worktrees/` literal covers one such location, and `src/.verify-wt` is not it.
**Flagged, not fixed — not my file and not my task.**

This is exactly why the brief mandates verifying outside both repos, and it is the reason every
figure in §9 was taken in `/private/tmp/…/scratchpad/`, not here.

### 1c. ✅ The uncommitted work §0a names is gone; different work took its place

The four paths §0a warns about — including `src/__tests__/db/contextDocSync.test.ts` — **were
committed as `7d8c552d`** before I started, so there was nothing of that session's to contaminate
or to avoid:

```
$ git show --stat --format='%H %s' 7d8c552d
7d8c552dfa767a8031e8cbacf4dc808e0ec38221 The drift guard could not pass in a detached worktree, …
 .context/shared/last-sync.md                       | 90 ++++++++++++++++++++++
 .../stages/01_overview/output/tribal-knowledge.md  |  9 ++-
 .../07_synthesis/output/economy-reference.md       | 66 ++++++++++++--
 src/__tests__/db/contextDocSync.test.ts            | 54 ++++++++++-
 4 files changed, 205 insertions(+), 14 deletions(-)
```

✅ What *was* uncommitted and not mine was **`jest.config.js`** — not named in §0a, and the file
that governs the count §0a is about. It has since landed as `ce08e566`. I never touched it.

### 1d. ⚠️ HEAD moved FOUR times under me; I built on `15a3dffd`, not `7d8c552d`

The brief says to build on `7d8c552d`. By the time I committed, HEAD was four commits further on:

| commit | subject | mine? |
|---|---|---|
| `7d8c552d` | The drift guard could not pass in a detached worktree | no — the brief's base |
| `ce08e566` | A worktree nested in the checkout doubled jest's collection | no |
| `f5f3e1de` | A stale `OPEN` item survived the split because the section was moved | no |
| `e22d741a` | Moving a section is not re-verifying it | no |
| `15a3dffd` | A fourth instance of the measurement pattern | no |
| **`925d40a5`** | **The CHECKS panel ratios every sampled wage against the rate that governs it** | **mine** |

✅ **I rebased nothing and reverted nothing.** My commit's parent is `15a3dffd`, every figure in
§9 is measured at `925d40a5`, and the baseline it reconciles against is measured by me at
`15a3dffd` rather than quoted from `CLAUDE.md`'s table.

⚠️ **`f5f3e1de` overlaps this task and saved me from one trap.** It had already corrected the
stale `OPEN` marker in `economy-reference.md` that §2a identifies — so I did not become the second
writer on that file for that hunk. The peer session told me so unprompted; ✅ I verified both
commits exist and read their subjects rather than taking it on trust. **What it did NOT fix is the
table row and the "stale write" conclusion** — §7.

### 1e. 🟡 On §0a's misattribution

For the record, since the brief raises it: ✅ I checked authorship by diff content before every
edit, and ✅ my working tree held only my own twelve files at commit time. I was never in a
position where I'd have had to refuse an attribution, so this is agreement with the principle
rather than evidence for it.

### 1f. ✅ Machine state before measuring

Per the standing notes, `uptime` first, every time. **Load average hit 32.15 on 8 cores** early on:

```
$ sysctl -n hw.ncpu ; uptime
8
19:23  up  1:44, 4 users, load averages: 32.15 18.87 13.71
```

🔵 **Not orphaned busy-loops this time** — I checked for the §"eight orphaned busy-loops" pattern
and the top consumer was a Virtualization VM at 103% (Docker/Lando, i.e. the backend session),
with everything else normal. I **measured nothing** until it fell below the core count. All code
reading in §2–§7 was done during that window; all measurement in §4 and §9 after it.

⚠️ **I could not complete the serialising handshake the standing notes require.** The backend
session was not reachable:

```
$ SendMessage to "dev-s-async-world-pack-b"
{"success":false,"message":"No agent named 'dev-s-async-world-pack-b' is reachable."}
```

`ListAgents` showed three peers, **all idle**, and no backend session at all. 🟡 **Inferred: it had
ended.** So the §9 runs are unserialised-by-necessity, not by assumption — mitigated by taking
them at load 2.42 and 663-suite parity, and both are reported with their start load and wall clock
so a load explanation can be tested rather than asserted.

---

## 2. Instance 1 — ✅ the premise holds, and the fix is a deletion

🔵 **Read in code at `15a3dffd`. §2a is correct in every particular I checked**, and I checked each
line it cites:

- `SeasonBudgetService.ts:215` — `anchorScouts(club, budget, economy, price)`, *"The scout half of
  a re-anchor pass."*
- `:257` — `anchorNpcStaffWages` calls `anchorScouts(club, budget, economy, staffRenewalWagePence)`
  and returns `{ staff: next, scouts }`.
- `:705` — `snapNpcStaffWages` calls `anchorScouts(…, (_existing, anchored) => anchored)`.
- `AnchoredRosters`'s own docblock: a pass must not *"[do the staff] half and forget the scouts,
  which is the exact shape of the defect being fixed."*

So **NPC scouts are re-anchored**, and A30's reading was built on the stale prose §7 corrects.

**The defect, at `economyDiagnostics.ts`:**

```ts
const governs: 'band' | 'npc-anchored' =
  sample.role === 'scout' || npcAnchored === null ? 'band' : 'npc-anchored';
```

**The fix:**

```ts
const governs: 'band' | 'npc-anchored' = npcAnchored === null ? 'band' : 'npc-anchored';
```

🔴 **The whole fix is removing a role special-case.** No new rate, no new row, no new parameter.

---

## 3. §2b — ✅ answered by the call graph: the scout half honours the flag, and the panel needs no flag

The brief: *"Whether the scout half honours the flag the way the staff half does is a question to
measure — I do not have the answer."*

🔵 **It does, and by the same mechanism.** The chain, traced at `15a3dffd`:

```
anchorScouts                       (SeasonBudgetService.ts:229)
  → npcStaffWagePence(withBudget, ability, economy)
      → staffWagePence(...)        (ClubWageScaleService.ts:152)
          → if (!economy.incomeAnchoredWages || !(abilityOf > 0)) return undefined;
  → if (!anchored || anchored <= 0) return scout;     // ← row untouched
```

✅ So with the flag **off**, `npcStaffWagePence` returns `undefined` for every ability,
`anchorScouts` leaves every scout on its world-build band price, and the band genuinely governs —
**exactly as §2b suspected, and `anchorNpcStaffWages`'s missing explicit gate is harmless** for the
same reason its own comment gives for the staff half: the resolver already returns `undefined`.
The comment at `:252-254` is therefore correct **and** complete, including for the `anchorScouts`
call at `:257` that precedes it. 🟡 I'd call that accidental rather than designed, but it is sound.

🔴 **The consequence for the fix is the part worth having.** Because the panel's `npcRate` **is**
`npcStaffWagePence` closed over the same store, `npcAnchored !== null` is not a *proxy* for "this
row was re-anchored" — **it is the same condition, evaluated by the same function.** So:

| state | resolver | `anchorScouts` | `governs` | correct? |
|---|---|---|---|---|
| flag on, budget present | returns a figure | re-prices the row | `npc-anchored` | ✅ |
| flag **off** | returns `undefined` | leaves the row | `band` | ✅ |
| no `seasonBudget` yet | returns `undefined` | leaves the row | `band` | ✅ |

**The panel reads no flag — and cannot, being pinned out of the engine layer. It does not need
to.** A fix that hardcoded "scouts are income-anchored" would have been the same defect pointed
the other way, and would misreport every save with the flag off. ✅ Both states are tested
(`staffValuationChecks.test.ts`, *"the governing rate follows `incomeAnchoredWages` without
reading it"*).

---

## 4. 🔴 Instance 3 — the brief's premise is wrong, and the failure is a FALSE ALARM

**The brief, marked by you as reasoning rather than measurement:** *"it has an England-shaped
sensitivity floor… for any country scaled below England this check cannot fail."*

✅ **Measured, and it is the other way round.** Driven through the real `resolveEconomy` and
`weeklyWageRange` against A30's live captures, then through the real `fingerprintWorldPack`:

```
######## EN (tierCount 8) ########
  t1: band 40-90  min 12848720  mean 47401329  max 97569968
  t4: band 15-35  min   806700  mean  3210417  max  6708949
  t7: band 5-10   min    45898  mean   138754  max   259639
  t8: band 2-7    min     5252  mean    50599  max   120375  <<< BOTTOM TIER -> reads turnover (PASS)
  >>> fingerprintWorldPack on a CORRECTLY PRICED EN t8 squad:
      bottomTier.meanWagePence = 50599   pricing = 'turnover'

######## SC (tierCount 4) ########
  t1: band 40-90  min  1284872  mean  4740132  max  9756996
  t2: band 30-60  min   508489  mean  1504871  max  2876450
  t3: band 20-40  min   169773  mean   503522  max   960382
  t4: band 15-35  min    80670  mean   321041  max   670894  <<< BOTTOM TIER -> reads LEGACY (FAIL)
  >>> fingerprintWorldPack on a CORRECTLY PRICED SC t4 squad:
      bottomTier.meanWagePence = 321041   pricing = 'legacy'
```

🔴 **A correctly priced Scottish save reads `LEGACY` and the row prints `FAIL`.** Not "cannot
fail" — **always fails.**

### Why, and why the "scaled below England" reasoning misleads

✅ **Scotland's money IS one tenth of England's, exactly as the brief says** — compare EN t4's mean
of **3,210,417** against SC t4's **321,041**. Identical ability band (15–35), ratio exactly 10.000.
The brief's model of the economy is right.

🔴 **What the threshold actually encodes is a PYRAMID DEPTH, not a money scale.** England's bottom
tier is tier 8, ability band **2–7**. Scotland's bottom tier is tier **4**, band **15–35** — a
mid-pyramid division. The constant was calibrated on England's weakest players; Scotland has none
that weak, because Scotland is four tiers deep. The country scaling (÷10) is more than cancelled by
the band difference (×6.3).

So this is **not** an "England-calibrated money" defect. It is a **fifth live violation of the
owner's *tiers are flexible* ruling**, and the only one of the five sitting inside an economy
constant rather than an index or an array length. Added to the Q4 register.

### ⚠️ The part that should change what you do

🔴 **`92e90755` did not fix this row, and it is failing on Scottish saves right now.** A30
established the `LEGACY — FAIL` on the broken Scottish save was not a resolver read, and fixed the
config-block defect. ✅ But the row fails *again* on the fixed save, for an unrelated reason — so
anyone seeing it will reasonably read it as A30's defect recurring. That is the second-order cost
of a wrong comparator and the thing I'd most want you to know.

⚠️ **This also bounds the register entry itself:** a violation that fails LOUDLY was still missed
for a day, because the failure was attributed to the right-looking cause. Noted in Q4.

### The fix

The tell now ratios the bottom tier's mean against **what the turnover model prices those same
players at**, over exactly the population that fed the observed mean:

```ts
const pricing: PackPricing = bottomTier === null
  ? 'unknown'
  : bottomTier.modelledMeanPence !== null
    ? (bottomTier.meanWagePence > bottomTier.modelledMeanPence * LEGACY_TELL_MODEL_RATIO
      ? 'legacy' : 'turnover')
    : (bottomTier.meanWagePence > LEGACY_TELL_BOTTOM_TIER_PENCE ? 'legacy' : 'turnover');
```

- ✅ **`LEGACY_TELL_MODEL_RATIO = 5` is not a new judgement.** `250,000 ÷ 50,599 = 4.94`, so
  **England's existing sensitivity is preserved by construction** and its verdict is unchanged.
  That is what made this safe to land under "England is the control and must stay correct", and it
  is asserted as a test rather than claimed here.
- ✅ **Coarseness preserved.** The models are ~20× apart at the bottom, so anything ~2–10 separates
  them; the constant's own *"which order of magnitude and nothing finer"* still holds.
- ✅ **`LEGACY_TELL_BOTTOM_TIER_PENCE` kept, not deleted** — it is the answer when no economy can be
  resolved (a pre-sync save). Its existing test bounds still describe it correctly in that role, so
  **no existing assertion was changed.** The printed row says when the fallback was used and that
  it cannot be trusted on a country shallower than England.
- ✅ **No layer crossed.** `resolveEconomy` and `weeklyWageRange` are both `src/economy/`.

**The row now states a relationship rather than a bare number**, per the standing note's §1 bar:

```
LEGACY — tier 4 mean weekly wage 321,041 pence across 92 player(s)
  vs modelled 64,208 pence = ×5.00 (legacy above ×5)
```

---

## 5. Instance 2 — ✅ scouts counted; ⚠️ a real behaviour change, untuned

### 🔴 The omission rested on a claim that had already been retired elsewhere

`computeNpcWageBill`'s own docblock said:

> NPC `club.scouts` are still absent from this sum — `WorldScout` carries no wage field at all
> (a deliberate backend decision about the cached world-pack shape), so adding them would mean
> charging every NPC club for a wage the pack never quotes. **Left out on purpose.**

✅ **Every clause of that was false by the time I read it.** `WorldScout.salary` has existed since
A24, and `types/world.ts:366-383` documents it — including, verbatim, that `WorldScout`'s doc
*"used to say a `WorldScout` carries no salary/contract fields at all"* and why that hole was
closed. It is written at ingest by `resolveScoutWagePence` and re-anchored by `anchorScouts`.

🔵 **"The pack quotes no wage" was never the point.** `WorldStaff.salary` is also derived on the
device from config in hand — that is what pack-is-a-census *requires* — and the staff half of this
sum has always counted it. **So the omission rested on a premise about a sibling field that the
sibling field's own documentation had already corrected.**

### ✅ Traced in both directions; nothing double-counts

**Forward from the callers** — all 14 production call sites, and 🔵 **not one adds scout wages
itself**:

```
$ for f in npcSolvency clubProfileLogic npcClubDebugAssessment NpcRescueService npcFinanceSnapshot; do grep -n "scout" …; done
--- src/economy/npcSolvency.ts ---            (no scout reference)
--- src/screens/club/clubProfileLogic.ts ---  (no scout reference)
--- src/utils/npcClubDebugAssessment.ts ---   (no scout reference)
--- src/engine/NpcRescueService.ts ---        (no scout reference)
--- src/engine/npcFinanceSnapshot.ts ---      (no scout reference)
```

**Backwards from the money** — `club.scouts[].salary` is written by `resolveScoutWagePence` at
ingest and `anchorScouts` at re-anchor, and read by `StaffPoachingService` for poach pricing and by
the CHECKS panel. **No other site sums it.** ✅ Asserted as a test
(*"is the SOLE site that counts them — nothing double-counts"*).

🔴 **`resolveScoutWagePence` is deliberately NOT used here**, and that asymmetry is the one
judgement call in this instance. It falls through the band and then a global interpolation when
`salary` is absent — right **at ingest**, where the job is to price a scout for the first time;
wrong **here**, where the job is to total what is already owed. An absent `salary` contributes
**0**: a scout never priced is not a cost the club bears, and imputing a market rate would charge
every pre-A24 save for wages it never committed to. Same shape as
`resolveWorldStaffWagePence` taking `salary` first.

### ⚠️ The behaviour change — traced, reported, NOT tuned

🔵 **There is a feedback path, and it closes on the scout's own wage:**

```
computeNpcWageBill  →  projectedWagePence  (× weeks, SeasonBudgetService.ts:306, :673)
                    →  deriveClubBudget
                    →  wageFloorPence = projectedWage
                    →  wageReservationPence = max(wageShare, projectedWage)   ← clubBudget.ts:199
                    →  overCommitted = projectedWage > wageShare
                    →  surplusPence  = income − reservation − maintenance
                    →  staffWageBudgetPence(reservation)  →  npcStaffWagePence  →  scout salary
```

So counting scouts: raises the projected bill; lowers `surplusPence`; flips **more clubs
`overCommitted`**; and **for a club already over-committed, raises `wageReservationPence` itself**,
hence the staff share, hence the anchored rate. 🟡 Mean-reversion damps that rather than letting it
run away, but I have not modelled its convergence and I am not going to guess at it.

✅ **Measured consequence in the suite: none.** 663 suites, zero failures, no NPC-signing or
solvency suite moved. 🟡 **Inferred: it does not shift NPC signing behaviour in test.** ⚠️ **That is
not the same as no live effect**, and the live effect is a pricing question:

> 🔴 **For your decision, not mine.** On the owner's own club a scout was **£12,510/wk of a
> £13,376 staff bill — 93.5%, and 84× a coach of the same star rating.** For a club with a scout,
> this is not a rounding error in the solvency verdict. Whether a scout *should* cost that is the
> **ability-proportional split**, which the brief says is unruled and the owner's. **I have tuned
> nothing to compensate and changed no pricing.** I'd expect NPC clubs to read as poorer and more
> over-committed than they did yesterday, and for that to be *correct* — but the size of it is the
> owner's to accept.

---

## 6. §5 — ✅ the tension dissolves, and `7b56c6c8` was right

The brief asks me to pick an option and justify it, and says to say so directly if I think
`7b56c6c8` was wrong. **I do not. It was right, its warning still stands, and I needed neither
option.**

🔵 **The brief's own first suggestion is the answer: `ec949536` routed scouts through the same
function.** `npcStaffWagePence` is **role-agnostic**:

```ts
export function npcStaffWagePence(
  club: Pick<WorldClub, 'reputation' | 'seasonBudget' | 'staff' | 'scouts'>,
  ability: number,
  economy: ResolvedEconomy,
): number | undefined {
```

It takes a club and an **ability** — it does not know or care whose. And `ec949536` fixed its
*shape* so the denominator spans both rosters:

```ts
const abilities = [
  ...(club.staff ?? []).map((s) => s.coachingAbility ?? 0),
  ...(club.scouts ?? []).map((sc) => resolveScoutAbility(sc.ability, sc.experience, sc.judgements)),
].filter((a) => a > 0);
```

✅ **So the existing `NpcStaffRateResolver` already prices a scout** — pass the scout's ability and
it answers. The scout rate is not a second engine-layer rate; it is the same rate at a different
ability. **There is nothing to inject.**

**Justified against the paragraph the brief quotes:** the warning is that a second injected rate
would make the panel *"a model of the pricing path rather than a reading of it."* ✅ After this
change the panel still injects **exactly one** function and still imports the band directly from
the economy layer — **unchanged**. It reads one rate per row from the one function that writes it.
Had I widened the resolver to take a role, or injected a second, I'd have added a branch the
pricing path does not have — which is precisely the modelling the warning forbids. **Deleting the
role branch moved the panel further from a model, not closer.**

⚠️ **One genuinely new injection, and why I judge it outside the warning.** §4's fix gives
`fingerprintWorldPack` a `ModelledWageResolver`. It is **not** a second engine rate:
`resolveEconomy` and `weeklyWageRange` are both in `src/economy/`, the same layer as the
diagnostics modules, so **nothing crosses a layer and no boundary test is weakened**. The parameter
exists only because `fingerprintWorldPack` is deliberately pure and store-free, per its own header
— i.e. for testability, not to dodge an import. 🟡 **If you think that still counts against the
spirit of the warning, that is the one call in this change I'd most readily revisit**; the
alternative is importing both into `worldPackDiagnostics.ts` directly, which is architecturally
permitted and which I avoided only to keep the function pure.

---

## 7. 🔴 FIVE pieces of stale prose, not two — and the worst one is operator-visible

The brief names `economyDiagnostics.ts:1306` and `:1325`. ✅ I found five, and the one the brief
does not name is the one that matters most.

| # | where | the stale claim | severity |
|---|---|---|---|
| 1 | `economyDiagnostics.ts` docblock table | `club.scouts[]` → *"**nothing.** Both of those functions iterate `club.staff` ONLY"* | named in brief |
| 2 | same, closing note | *"NPC scouts sit on the band while the staff beside them sit on an income-anchored rate"* | named in brief |
| 3 | **`staffValuationChecks`'s `full` copy** | *"`club.scouts[]` is band-priced at ingest and then **left alone**"* | 🔴 **NOT in the brief** |
| 4 | `computeNpcWageBill` docblock | *"`WorldScout` carries no wage field at all"* | §3's premise |
| 5 | `economy-reference.md` §E | the table row **and** *"A scout off the band now reads as what it is: a STALE WRITE"* | partly pre-fixed |

🔴 **#3 is the worst-placed of the five and I found it only because a test failed.** It is the
legend printed above the table **on the panel itself** — the copy the owner reads when answering a
question about a live save. The docblocks mislead agents; this one misled the owner. It now
describes both rosters on one rate and states the two readings of an off-1.00 ratio.

✅ **#5 was partly fixed under me.** `f5f3e1de` closed the `OPEN` marker §2a cites; the table row
and the "STALE WRITE" conclusion were still live. Both corrected **in place** — §8.

### ✅ What replaced the "stale write" conclusion

The old text was not merely stale, it was **structurally wrong**: it keyed on the **role**. The
correct reading keys on **which rate governs**, which also makes it apply to a coach:

- **band governs** → an off-1.00 ratio **is** a stale write. Nothing re-prices the row, so its
  salary carries the config scale live at world build while the comparator uses the one the device
  holds now; `tierStaffWeeklyWagePence` is exactly linear in `wageScaleMicroPence` (EN/SC = 10.000
  at every ability and tier), so **the ratio IS the scale change**. England's 1.00 remains labelled
  a **FALSE PASS**. 🔵 This was never scout-specific — it applies to a coach identically.
- **anchored rate governs** → an off-1.00 ratio is **not** staleness. ✅ `anchorNpcStaffWages`
  **mean-reverts** through `staffRenewalWagePence` rather than snapping (`:257`), so a row one or
  two transitions into convergence sits legitimately short of target. ⚠️ **It is also what a club
  the bootstrap pass never reached looks like, and ONE ROW CANNOT DISTINGUISH THEM.** The panel
  says both and picks neither.

⚠️ **That second bullet is where §6's out-of-scope reload defect surfaces in my work.** A save
whose `seasonBudget` persists while the world blob strips the rosters is exactly the
"never re-anchored" case. ✅ **I did not fix it and did not touch it.** It did not make my
verification impossible. But it means **the anchored-rate branch of this row cannot be read as
"converging" without other evidence**, which is why the row refuses to claim it is.

---

## 8. Instance 4 — ✅ tiers derived from the country's own rows

`VALUATION_SAMPLE_TIERS = [1, 3, 5, 8]` → `valuationSampleTiers(config)`.

✅ **It reads each row's own `tier`, never a position**, which is the binding rule's exact test and
the thing `economyConfig.tierRowFor` (violation 1) gets wrong. Indexing into the **sorted published
values** means a sparse or reordered array still yields four real tiers:

| published rows | sampled | note |
|---|---|---|
| `1…8` (England) | **`[1, 3, 5, 8]`** | ✅ **byte-identical to the constant** — the control does not move |
| `1…4` (Scotland) | `[1, 2, 3, 4]` | every tier it has; previously two of four samples were always empty |
| `1…12` | `[1, 4, 8, 12]` | bottom rung still sampled — no `Math.min(8, …)` |
| `[2, 4, 6, 9, 11]` | `[2, 4, 6, 11]` | sparse |
| `[9, 2, 11, 4, 6]` | `[2, 4, 6, 11]` | reordered — same answer |
| none published | `[1, 3, 5, 8]` | pre-sync fallback, documented as such |

🟡 **England reproducing exactly is what made this safe to land without re-ruling what the panel
samples**, and it is asserted as a test rather than asserted here. ✅ This is why the Scottish dump
sampled 8 players where England sampled 16 — now 16 for both.

### ✅ "Earn every line" — zero net new rows

```
$ git diff 15a3dffd 925d40a5 -- src/economy/economyDiagnostics.ts src/components/debug/checksReport.ts \
    | grep -cE "^\+.*id: '"
0
```

**Four rows corrected, one legend rewritten, none added** — matching `7b56c6c8` and `92e90755`.
🟡 I could not find a line to *remove* without losing information; the legend is longer because it
now describes two readings where it described one wrongly.

---

## 9. ✅ Verification — verbatim

**Detached worktree at a named commit, outside both repos, as the brief requires:**

```
$ git worktree list
/Users/courtneyadesile/…/wunderkind-app                        925d40a5 [new-game-save]
/private/tmp/claude-501/…/74fa68ab-…/scratchpad/baseline-wt    ac71159b (detached HEAD) prunable
/private/tmp/claude-501/…/9172ad30-…/scratchpad/diag-verify    ac71159b (detached HEAD) prunable
/private/tmp/claude-501/…/dca73b4e-…/scratchpad/a31-verify     925d40a5 (detached HEAD)
```

✅ **Nothing under the repo.** (The two `ac71159b` entries are other sessions' and were already
there; both are in their own scratchpads, outside both repos.)

### Count and typecheck at `925d40a5`

```
$ uptime
19:40  up 2 hrs, 4 users, load averages: 2.26 3.73 6.96
$ npx jest --listTests 2>/dev/null | grep -c "__tests__"
663
$ npx tsc --noEmit
$ echo $?
0
```

### Full suite at `925d40a5`

```
Sat Nov 21 19:40:35 GMT 2026
19:40  up  2:01, 4 users, load averages: 2.42 3.68 6.87

Test Suites: 663 passed, 663 total
Tests:       3 skipped, 11168 passed, 11171 total
Snapshots:   0 total
Time:        140.925 s
EXIT=0
Sat Nov 21 19:42:56 GMT 2026
```

✅ **ZERO failures. 663 suites, matching `--listTests` exactly. Start load 2.42 on 8 cores — a
quiet machine, and 140.9 s against this branch's 206.9 s / 247.0 s history, so there is no
load-flake explanation to test.** No `● ` lines and no worker-exit warning.

### Baseline at `15a3dffd`, measured by me

Per the standing notes — *"re-measure the baseline yourself at the commit you are building on and
quote your own figure"* — rather than reconciling against `CLAUDE.md`'s table:

```
Sat Nov 21 19:43:40 GMT 2026
19:43  up  2:04, 4 users, load averages: 11.01 9.71 8.95

Test Suites: 663 passed, 663 total
Tests:       3 skipped, 11147 passed, 11150 total
Time:        122.679 s
EXIT=0
```

| | suites | passed | collected | failures |
|---|---|---|---|---|
| `15a3dffd` (baseline, measured by me) | 663 | 11,147 | 11,150 | **0** |
| `925d40a5` (this change) | 663 | **11,168** | 11,171 | **0** |
| **delta** | **+0** | **+21** | **+21** | — |

✅ **IT RECONCILES EXACTLY.** The +21 is wholly accounted for by the four suites I touched, and
nowhere else in the tree moved:

```
=== BASELINE 15a3dffd ===
PASS src/__tests__/utils/npcFinances.test.ts
PASS src/__tests__/economy/playerValuation.test.ts
PASS src/__tests__/economy/staffValuationChecks.test.ts
PASS src/__tests__/economy/worldPackDiagnostics.test.ts
Test Suites: 4 passed, 4 total
Tests:       86 passed, 86 total

=== MINE 925d40a5 ===
PASS src/__tests__/economy/worldPackDiagnostics.test.ts
PASS src/__tests__/economy/staffValuationChecks.test.ts
PASS src/__tests__/economy/playerValuation.test.ts
PASS src/__tests__/utils/npcFinances.test.ts
Test Suites: 4 passed, 4 total
Tests:       107 passed, 107 total
```

**86 → 107 = +21**, matching the full-run delta to the test. ✅ **No new suite**, matching
`7b56c6c8`. One test was **replaced** rather than added — the one asserting the now-false invariant
(§7) — so the gross count of new tests is 22 and the net is 21.

⚠️ **Two caveats on these two runs, stated rather than buried.**

1. **The baseline run's start load was 11.01 on 8 cores; mine was 2.42.** Above the core count, so
   by this project's own rule I should not attribute *timing* from it — and I do not: the 122.7 s
   against 140.9 s comparison is **not** evidence that my change is slower, and I draw no
   conclusion from it. ⚠️ **Counts are unaffected** — the standing notes' own measured finding is
   that *"contention moves TIMING, never a COUNT"*, and this pair is consistent with it: both runs
   returned 663 suites and both reconcile.
2. **Neither run was serialised by handshake**, because there was no peer to shake hands with
   (§1f). Both are reported with start load and wall clock so a load explanation can be tested
   rather than assumed, and the decisive fact is that **both runs had zero failures** — there is no
   failure for load to explain.

🔴 **`CLAUDE.md`'s branch table is now stale again** and I have deliberately **not** edited it: its
newest `new-game-save` row reads **662 / 11,130 at `ec949536` + two parity fixes**, which is five
commits behind `15a3dffd`, so the intervening work is unattributed and I cannot reconcile against
it without measuring each commit. **My two figures above are both measured by me, at named
commits, in detached worktrees outside the repo** — which is what that table asks for. Updating the
table is the PM's, and the honest row to add is `663 / 11,168 at 925d40a5`.

### `.context` drift guard

```
$ npx jest src/__tests__/db/contextDocSync.test.ts
PASS src/__tests__/db/contextDocSync.test.ts
Tests:       48 passed, 48 total
```

⚠️ **It failed first, and it was right to.** My first `economy-reference.md` edit annotated the
table row *"⚠️ **Corrected 2026-11-21 (A31).** This row read …"*:

```
● adds no new dated "Correction:" annotations to stage output
    + ".context/stages/07_synthesis/output/economy-reference.md: 5 > 4",
```

✅ That guard exists because *"a dated 'Correction:' paragraph appended BENEATH the wrong sentence
[leaves] the superseded claim live and first on the page"* — which is **this task's own defect
class, pointed at documentation**. I removed the annotation and stated current state in place; the
history lives in `925d40a5`'s message and in this report. **A guard catching me is the system
working.**

---

## 10. Boundaries honoured, and what I did not do

- ✅ **Nothing pushed, nothing deployed.**
- ✅ **No worktree left inside either repo.** Mine are in my own scratchpad and are listed above.
- ✅ **The reload defect (§6) untouched** — but see §7's closing note: it is *why* the anchored-rate
  branch refuses to claim "converging".
- ✅ **No pricing re-ruled, nothing tuned.** The ability-proportional split is reported honestly
  and left alone; §5 is a traced behaviour change with no compensating tuning.
- ✅ **No AMP re-anchor pass reinstated.** The AMP club is not sampled by this panel at all — it
  reads `worldStore.clubs` and the AMP club is in `clubStore` — so "both club kinds" resolves to:
  🔵 **the AMP club has no row here, by construction**, and the panel's docblock says so. 🟡 I
  judged adding AMP rows to be out of scope and against "the panel is already too heavy"; **if you
  want the AMP club's own staff and scouts on this panel, that is a separate brief** and I'd argue
  for it, since the owner's own club is where the 93.5% figure came from and nothing on the device
  shows it.
- ✅ **Facilities and upkeep untouched.**
- ⚠️ **`jest.config.js` / `src/.verify-wt/` not touched** — not mine. §1b flags the residual gap.
- ⚠️ **`economyDiagnostics.ts:109`'s hardcoded `k = 0.75`** — same defect class as this task,
  reported to me by a peer, **out of scope and left alone.** Flagged in `last-sync.md`.

## 11. What I'd want checked before this is trusted further

1. 🟡 **§5's live behaviour change.** The suite says nothing moved; the suite does not price a
   season of NPC transfers. **Owner's call on the magnitude.**
2. 🟡 **`LEGACY_TELL_MODEL_RATIO = 5` is calibrated on one dev publish** (A30's capture, one day).
   England's sensitivity is preserved *as of that publish*. Re-capture rather than reconcile.
3. 🔵 **No Scottish coverage figure in `economy-reference.md` has been re-measured.** The two
   Scottish numbers I added are scoped to the legacy tell and are not a coverage measurement.
4. ⚠️ **The nested-plain-copy gap in §1b** is real and unowned.
5. 🟡 **A device CHECKS run is what would actually close this.** Everything in §2–§8 is measured
   against live config headlessly — which is what that module exists for — but the brief's own bar
   is *verify what the panel PRINTS*, and I have verified that against rendered strings in tests,
   not against a screenshot from a real save.

---

## 12. ⚠️ Added after A30's retraction: `stored/band 10.00` is NOT the expected reading any more

**Raised by the `Economy loose ends` session after this work was complete**, and it is the right
warning: do not treat the device's OTA 491 `stored/band 10.00` scout reading as a known-good
baseline. A30 has established it was a **world-build ingest** price — taken by driving
`resolveScoutWagePence` with the resolved economy directly, before any bootstrap or transition pass
— so it is not evidence about re-anchoring in either direction, **and it may itself have been the
broken comparator this task owns.**

✅ **Checked: nothing in this change rests on that figure.** Two places use a ×10:

- **The tests construct the stale row synthetically** (`salary: band * 10`) and assert the
  comparator reports it. That tests the comparator against a row of known provenance; it reconciles
  against no device reading.
- **The legend and `economy-reference.md` cite "Scotland read 10.00 where England read 1.00"** as
  illustration of the *band-governed* case only, which is now one of two labelled branches rather
  than the row's single meaning.

🔵 **What the ×10 claim does rest on is band linearity, and I verified only its INPUT.** From the
live captures, the published per-tier scale is exactly 10× at every tier Scotland publishes:

```
tier   EN wageScaleMicroPence     SC wageScaleMicroPence     EN/SC
  1               1269725639                126972564   10.000000
  2               1031522690                103152269   10.000000
  3                949061019                 94906102   10.000000
  4                925730138                 92573014   10.000000
EN t8 / SC t4 (the bottom-vs-bottom comparison): 10.030155
```

🟡 **That `tierStaffWeeklyWagePence` is exactly linear in that input is INHERITED from `7b56c6c8`,
not re-measured by me.** ⚠️ **And I could not re-measure it headlessly, which is itself worth
reporting:**

```
$ npx tsx --tsconfig ./tsconfig.json …/linearity.ts
Error: Transform failed with 1 error:
  node_modules/react-native/index.js:27:7: ERROR: Unexpected "typeof"
```

**`@/economy/packWages` pulls react-native in under bare node.** `@/economy/wages` and
`@/economy/economyConfig` do not — §4's measurement ran fine through those. So
`economyDiagnostics.test.ts`'s *"it stays runnable OUTSIDE the app"* holds **under jest**, where
`jest-expo` mocks react-native, but **a bare-node consumer of `tierStaffWeeklyWagePence` cannot
reproduce the CHECKS output** — which is most of what that guarantee is for. 🟡 I have not traced
which import in `packWages`' chain does it. **Flagged, not fixed, not in scope** — but it bounds
the guarantee that `7b56c6c8`'s whole injection design exists to protect, so it belongs on
someone's list.

### 🔴 The practical consequence, stated from the governing rate rather than from the old number

The peer's question — *"establish what the row should say from the governing rate, not by
reconciling against that number"* — has a definite answer, and it is **not 10.00**:

| save state | governs | expected `stored/governing` | `stored/band` printed beside it |
|---|---|---|---|
| Scottish save, `incomeAnchoredWages` **on**, bootstrapped | `npc-anchored` | **≈ 1.00, and exactly 1.00 at bootstrap** — `snapNpcStaffWages` snaps rather than mean-reverting | ~10 or ~0.1; **labelled NOT the governing rate** |
| same, one or more transitions later | `npc-anchored` | **short of 1.00, converging** — `anchorNpcStaffWages` mean-reverts | as above |
| `incomeAnchoredWages` **off** | `band` | **≈ 1.00 if the scale has not moved; ×10 if it has** — and then it IS a stale write | — (band *is* the verdict) |
| never bootstrapped (the §6 reload defect) | `npc-anchored` | off 1.00, indistinguishable from converging | as above |

⚠️ **So on a fresh Scottish save with the flag on, this row should read `stored/npc-anchored 1.00`
and `stored/band` around 10 beside it, explicitly marked not a verdict.** Anyone who reconciles
against the OTA 491 figure will read **the first honest output as a regression** — which is the
peer's point and the reason it is tabulated here rather than left as prose.

🟡 **The one reading I would still want from a device**, and cannot produce headlessly: whether a
real Scottish save has `incomeAnchoredWages` on, since that single flag decides which row of the
table above applies. ✅ **The panel does not need to know** — that is the fix — **but a human
reading the row does**, and nothing on the CHECKS tab currently prints that flag. 🟡 **I judged
adding it out of scope under "the panel is already too heavy"**, but it is one line, it would make
this row self-explaining, and I'd argue for it in a follow-up rather than add it unasked.
