# `.context/shared/last-sync.md` — archived passes

Rotated out of `wunderkind-app/.context/shared/last-sync.md` on 2026-11-20, verbatim and in the order they sat in that file. Nothing in `.context/` links here.

⚠️ **The order is not chronological and never was.** That file was prepended to for its first ~60 passes and appended to thereafter, which is why the same pass appears with two different ordinals in places and why the ordinals were dropped. Read the DATE in each heading. Duplicate ordinals across `development` and `new-game-save` are a known artefact of the 2026-11-12 merge; all the entries are real and none was dropped.

Why this split exists: `../context-review/context-refresh.md`.

---

## 2026-11-20 — The income-anchored scout wage was still priced off `experience` (app `new-game-save`)

**Stages touched:** none — a defect fix in DEPLOYED code, raised by the PM against `9f46bf66`
(live on dev, OTA 491). Entry recorded here per the standing note.

**🔴 A24 moved every path that COMPUTES a scout's wage onto `ability` and missed the rung that
OUTRANKS all of them.** `resolveWorldStaffWagePence`'s chain is
`salary ?? anchoredPence ?? weeklySalary ?? band ?? legacy`, and `anchoredPence` — the
income-anchored figure — sits above everything A24 changed. Its two producers were still being
handed `experience`:

- `marketStore.setMarketData` → `anchorStaffWages(freshScouts, (s) => s.experience)`, which
  **overwrites** the `salary` just resolved at the `market.ts` ingest boundary;
- `GameLoop` §14c's staff renewal → `(staff as unknown as { experience?: number }).experience ?? 0`,
  which the renewal then mean-reverts toward.

**Both were live.** `incomeAnchoredWages` is TRUE at every tier on live config and the only other
precondition is a `seasonBudget`, which exists from the first season transition.

**🔴 Measured, not inferred — 15.6x.** `staffWagePence` raises its input to
`wageCurveExponentBp / 10000` = **2.5**, and `experience` spans 4–34 while `ability` spans roughly
7–51. On a five-coach backroom at tier 4: `ampStaffWagePence(experience 9)` = **£23.73/wk**
against `ampStaffWagePence(ability 29)` = **£370.87/wk**. At the market ingest an ingested
£1,234.56 was overwritten with **£23.73**. That is `band-ceiling-finding.md` §4's gap — every
scout below every coach — reappearing through a path A24 never looked at.

**⚠️ It reads as a NON-EVENT on a club with no backroom, and that nearly buried it.**
`staffWagePence` normalises the scale so the shape's wages sum to the staff budget, so with a
single-member shape the ability **cancels exactly** and every input returns the same figure. The
first probe read flat and looked harmless. Every test in the new suite seeds a real backroom, and
the degenerate case is pinned as its own test.

**The fix:** `(s) => s.ability` in `marketStore`; `staff.ability ?? 0` in §14c, with `RenewEntry`
now DECLARING `coachingAbility?` and `ability?` so both branches read the declared field —
**the `as unknown as {...}` casts are gone, because the cast is what let the wrong field
type-check.** Nothing else: no wage redesign, no change to the chain's rung order.

**🔴 THE LESSON, and it is this workstream's governing defect in a new costume.** A24 traced every
site that *computes* a scout's wage. It never asked which rung *decides* it. **Tracing the sites
that compute a quantity is not the same as tracing the sites that decide it** — and A24's report
said six pricing sites when there were eight. Corrected there.

**Proven by mutation**, not asserted: reverting both fixes to `experience` fails exactly four of
the nine new tests. The §14c source guard strips comments, because the new `RenewEntry` docblock
quotes the old cast and a guard reading prose would assert against the documentation.

**⚠️ Verified in an ISOLATED worktree at `4113d326`, not in the shared checkout.** A third session
(DOF-pot refund) began editing `dofHireCharge.ts` and `clubStore.ts` mid-run — both imported or
driven by these tests — so that run was unattributable and was killed. `npx tsc --noEmit` clean;
**657 suites / 10,992 passed, 10,995 collected**, `--listTests` 657. ✅ Reconciles exactly against
`4113d326`'s 656 / 10,983 passed: **+1 suite / +9**, all of it the new suite (the
`seasonBudgetService` edit registers a path and adds no test).

⚠️ **A FIFTH load-sensitive suite: `src/__tests__/db/youthRepository.test.ts`**, joining
`db/clientRecovery.test.ts`, `screens/tournamentHubRender.test.tsx` and `db/health/runner.test.ts`.
It failed once at 715 s (against 151 s idle), passes 53/53 alone, and did not reproduce on the
clean re-run. ⚠️ **Which test failed is UNKNOWN** — the run's grep dropped the `●` detail, and that
is recorded rather than inferred from the suite name.

🟢 **For the PM — two process items this pass paid for.** (1) `CLAUDE.md`'s `new-game-save` row
still needs a line and is deliberately not written here; the figures are above and
`655 / 10,962` is A24 **+ B1**. (2) **"One writer per file" does not protect VERIFICATION.** A
test run reads the whole tree regardless of who owns which file, so with concurrent writers a
full suite in the shared checkout is worthless — it needs a worktree per writer, and suites
serialised rather than overlapped. Three sessions wrote this checkout today and it cost four
full runs.

**Flagged, NOT fixed:** `ampStaffWagePence`'s `shape` counts only COACHES, so a club's scouts are
paid out of a staff budget divided as though they did not exist; and NPC `club.scouts` are never
re-anchored at a season transition (`anchorNpcStaffWages`/`snapNpcStaffWages` iterate
`club.staff` only). Both are behaviour changes rather than symmetry fixes, and the owner has
ruled on neither.

**Report:** `/Users/courtneyadesile/Documents/WunderkindFactory/docs/economy-loose-ends/a24b-scout-anchor-input-report.md`

---

## 2026-11-20 — The DOF's pot refunds what the club no longer owes (app `new-game-save`)

**Stages touched:** none directly — `03_data/output/state.md` describes `clubStore`'s persisted
shape and now has one more field (`dofWageCommitments`), flagged here for the PM rather than
edited, since that stage's text is a generated inventory and this is one row of it.

**Owner ruling, 2026-11-20, asked directly:** does unspent remainder return to the DOF's pot when
a contract ends or a player is sold mid-season? *"Yes, absolutely."* B1 built the carried ledger
that made the question answerable and declined to answer it on its own authority
(`b1-finish-report.md` §3). This is the answer.

**🔴 THE FINDING, and it is not the arithmetic.** B1 sketched the easy version — subtract
`weeklySalary × weeksStillRemaining` from the scalar total — and **that version pays out free
money by two independent routes**, both in the one direction an economy must never be wrong in:

- **the scalar cannot say whether the departing person was ever CHARGED.** A player signed last
  season is a Step 1 committed cost funded out of income; the pot never paid a penny for them, so
  refunding their wage is money from nowhere **on every sale of an established player**, which is
  most sales;
- **the scalar cannot say what the PER-WEEK figure was.** The charge is a product, and £20,000 is
  `£500 × 40` or `£2,000 × 10`. A RENEWAL makes it worse: its commitment is the DELTA over the
  incumbent wage, so the departing person's own wage is not what was charged — reading it off them
  over-refunds every renewal by the whole incumbent half.

So the ledger gained a third part: **`dofWageCommitments[]`**, one entry per refundable
commitment (`subjectId`, `weeklyPence`, `committedWeeks`, `chargedWeek`, `periodWeek`). The scalar
stays the MONEY and stays authoritative for the pot; the entries are the attribution, and a
departure spends one. `DofContractCharge` now also returns the two factors of its commitment,
because a product cannot be un-multiplied weeks later in another file.

**The charge and the refund agree about the budget period — measured, not assumed.** The PM
flagged this as mattering more than either change individually, since `4113d326` is a new caller
of the ledger. They agree, by algebra rather than by example:

```
lastWeekOwed = chargedWeek + weeksRemaining − 1
             = w + (span − (w − c)) − 1
             = c + span − 1          ← the budget period's OWN final week
```

**So a commitment's last covered week is the period's last week, for every arrival week** — which
is why the refund and the stale-period graduation ABUT rather than overlap. A refund can never
reach past the period's end because the commitment never did. Pinned by sweeps over all 46 arrival
weeks and all 46 departure weeks, the latter asserting `refunded + kept == the whole commitment`
and `kept == the weeks the club actually had them`, through the real store.

**The three traps are structural, not handled.** The stale-period guard is one expression with no
branch, and an early return makes the resurrection case **unreachable**: past that line the stored
period already matched the club's, so the write cannot move it. An over-refund is floored AND
reported (`reportDofOverRefund`, mirroring B1's `reportDofOverdraw`). Idempotency IS the entries —
a departure retires them, so there is no "already refunded" flag to keep in step with anything.

**🔴 THE REFUND LIVES IN FIVE STORE ACTIONS, NOT THE 30 CALL SITES THAT REACH THEM** — B1's own
argument for putting the carried subtraction in two functions rather than five callers.
`squadStore.removePlayer` / `removePlayerLocal` / `releasePlayer`, `coachStore.removeCoach`,
`scoutStore.removeScout`. ⚠️ One of those sites is a **destructured** `removePlayerLocal` in
`app/(app)/inbox.tsx` that a grep for `.removePlayerLocal(` does not find; per-site wiring would
have missed the user's own "accept the bid" button.

⚠️ **The brief's "contract expiry → `GameLoop.ts`" pointer was to the NPC pass**
(`processNpcContractExpiry`). NPC clubs have no DOF pot — `clubStore` is the player's club alone —
so it is not a departure path at all. The real ones are `GameLoop:1007` (players) and
`:1091-1092` (staff). Corrected with the PM, which accepted it.

**🔴 THE ACADEMY WAS THE ONE DEPARTURE THE STORES CANNOT SEE, and it was in no brief.** A youth
scholarship DRAWS the pot (`SignYouthPanel`, the same finance callback as an adult signing) but a
scholar is not in `squadStore`, which refuses under-age players — so none of the five actions ever
fires for them. Found by tracing the pot's **draw** sites backwards.

Three hand-written call sites were the first version and were not enough: finding it backwards
means the forward direction had no structure, so a fourth caller added later forgets the refund and
nothing fails — **the same shape as the defect being fixed.** So the academy got a choke point,
`src/engine/ampYouthRelease.ts`, which books the row detach and the refund together. It cannot live
in the repository (`releaseYouthPlayer` is `clubId`-scoped and shared with NPC callers, and a
repository must not reach into a store), so it sits one layer up where the rule is enforceable:
**user-club code calls the wrapper, only NPC paths call the repository function.** A registry test
walks `src/**` and `app/**` and asserts the set of callers equals three accounted-for files.

⚠️ **The registry works at FILE granularity, and `CLAUDE.md`'s cohesion rule says why that is a
real limit** — *"a source-reading test protects exactly the files it names"*, after the Personal
Assistant screen printed a raw cohesion score for as long as its guard existed. `GameLoop.ts` is
the identical seam: it legitimately holds NPC academy exits, so a user-club exit added inside it
would pass the registry. It is therefore **also pinned to its exact call count (2)**. The seam is
narrowed, not closed, and the test says so.

**CHECKS — `DOF POT — THE CARRIED LEDGER`, two rows** (`economyDiagnostics.dofPotChecks`). B1
recommended a row and could not write one because A24 held those files. ⚠️ **Writing it disproved
two invariants I was about to encode, and this is the second time in one day a CHECKS row has done
that:**

- **`pot = opening − committed` does NOT hold on a live save.** It is what
  `carriedTransferBudgetPence` computes, so it is the obvious assertion — and it holds only in the
  instant after a re-derivation. A fee of `F` lowers the pot by `F` and the opening by only
  `pct × F`: the fee's documented partial elasticity, still deliberately unfixed. Row 1 therefore
  prints the derivation as *what the next rebalance will produce*, and fails instead on the one
  thing that cannot be legitimate — **the pot exceeding its own opening while money is still
  committed out of it**, which is precisely the failure mode a refund introduces.
- **`entries sum = committed` is wrong the moment anybody has been sold.** A refund retires the
  whole entry but gives back only the weeks AFTER the departure, so the weeks the club USED stay
  on the total with no entry behind them. The invariant is the inequality `entries ≤ committed`.
  I wrote the equality first and the test caught it.
- Three period states, not two: a save that has never committed anything reads `period wk 0` against
  a real `createdWeek`, and calling that GRADUATED would print alarming nonsense on every fresh save.

**Out of scope and unchanged, deliberately:** the fee's partial elasticity, freezing the opening
allocation per period, Step 1's backward-looking derivation, and the whole backend.

**🔴 THE FULL SUITE CAUGHT A DEFECT IN THIS CHANGE THAT NO TARGETED RUN WOULD HAVE, and that is
the finding worth carrying.** Nine targeted suites were green. The full run then failed
`YouthPromotionService.test.ts` with
`TypeError: ...releaseDofWageCommitment is not a function` — that suite's `clubStore` mock is
partial, so the academy wrapper's **unguarded** refund call threw and took the whole release down
with it. The row would not have been detached.

⚠️ **Not a test-mock problem, and treating it as one would have been wrong.** The five store choke
points were ALREADY written with a try/catch for exactly this; the wrapper was the only path that
was not, and the same agent wrote all six. A partial mock is a cheap stand-in for the real failure
modes — an unhydrated store, a renamed action, a future throw inside the refund. The property:
**a scholar who has left has left.** Failing their release because a budget figure could not be
credited turns a money bug into a SQUAD bug, which is strictly worse — the pot self-corrects at
the next re-derivation and an undetached row does not. Guard added, **pinned by mutation**
(removing it fails exactly one test).

⚠️ **And that new test then leaked.** Stubbing `releaseDofWageCommitment` with a thrower via
`setState` persisted into the next test — a zustand action is a state field like any other — and
the doubled-exit case read a pot £95,000 off. Caught by the next test, not by me. The real action
is now captured once and restored in `beforeEach`.

**Also corrected:** `03_data/output/state.md`'s `flushClubStateToDB()` call count read **64** and
had gone stale by six — it measured **70** at `ac71159b`, and this change takes it to 71. Only one
of the seven is this change's; recorded in place rather than silently overwritten, because the
number is load-bearing for nothing (the coalescing is correct at any count), which is exactly why
it drifted unchallenged. The measured device figures in that paragraph are untouched.

**Report:** `/Users/courtneyadesile/Documents/WunderkindFactory/docs/economy-loose-ends/dof-pot-refund-report.md`
**🔴 THE SHARPEST FINDING OF THIS PASS IS NOT ABOUT THE POT: an unverified attribution offered to
a coordinator becomes an instruction.** Late on, `src/economy/economyDiagnostics.ts` — which this
task had edited to add the CHECKS row — turned out to hold another session's uncommitted work. The
contamination was identified correctly and then **attributed by inference**: A25 was the session
visibly active and the work was staff-ability-shaped, so A25 was named to the PM without checking.
A25 disproved it at once (`a818a60b`: 25 paths, zero `.ts`, all backend) and the diff's own text
settled the real author in one grep — a reference to `a24c-npc-rate-finding.md` and 26 "scout"
mentions. It was **A24**.

But the PM had already acted, asking A25 to restore that file and `staffValuationChecks.test.ts`
to `ac71159b`. **`git checkout <rev> -- <path>` is path-level and unconditional**, and that file
held THREE sessions' changes: A24's ~263 uncommitted insertions (awaiting an owner ruling, with
nobody watching the file for it), this task's `dofPotChecks`, and nothing of A25's. No stash
existed. **A25 declined and wrote a backup instead**, which is the only reason this is a near-miss.

⚠️ **And the same error recurred one level down, inside the fix for it.** A25's safety patch was
first headed as A24's work, but `git diff <path>` is path-level too, so it had captured the
`dofPotChecks` hunk as well — applying it whole after this commit would have clobbered or
conflicted with it. Corrected (it now names both authors and says to extract only the hunks for
the author being restored). **Attributing a whole PATH to one author because one author's marker
is in it is the error, and it is available at every level: the diff, the patch that saves the
diff, and the instruction that acts on either.**

Three rules, in descending order of what they would have saved:

1. **Never restore a path you did not author — patch out your own hunks instead.** A lost
   measurement costs a re-run; a path-level revert costs work that exists nowhere else. The
   checkout held 32 modified/untracked paths across several sessions at the time.
2. **Mark the epistemic status of anything reported upward.** *"I verified X by running Y"* and
   *"I believe X because Z was the session I knew was active"* are indistinguishable from a
   coordinator's seat, and it will act on both.
3. **One writer per file WITHIN A REPOSITORY; one full-suite run PER CHECKOUT.** Narrower than
   first reported here: A25 was in a different repository, so app-side writers never made its runs
   unattributable, nor its backend runs these. CPU contention is the only cross-repository channel
   and it degrades *timing* assertions rather than attribution.

Backups, both outside the repos: `docs/economy-loose-ends/app-economyDiagnostics-SAFETY-PATCH.diff`
(durable) and a session scratchpad copy (clearable). ⚠️ The durable one was briefly cited under an
`a24-` name that does not exist — **a recovery attempt against a non-existent path, at the moment
a recovery is needed, is its own failure mode.**

**Load-sensitive suites are now SEVEN**, six of them `db/`: `db/clientRecovery`,
`screens/tournamentHubRender`, `db/health/runner`, `db/youthRepository`, and newly
`db/realisticSave` (*"builds in well under the 2s budget"*) and `db/testHandleGuard` (*"rejects at
once instead of hanging to the timeout"*), both passing 17/17 alone. A24 owns the consolidated note
with the timings; this entry defers to it rather than keeping a second half-list.

---

## 2026-11-20 — B1: the owner's club budget model, parts B and C (`04_interfaces`, `07_synthesis`)

- **The DOF's pot pays for every new contract, wages included**, on `new-game-save`. Implements the
  owner's 2026-11-20 three-step ruling: Step 1 commits existing staff + existing players +
  maintenance off the top of the balance, Step 2 is what that leaves, Step 3 is the director of
  football's pot and it now pays transfer fees, agent commission, signing-on fees, **new player
  wages and new staff wages** — charged as `weeklySalary × weeksRemainingInSeason`, once, after
  which the cost graduates into Step 1 at the next budget.
- New module `src/economy/dofHireCharge.ts` and a new field `ClubBudget.createdWeek` (optional, no
  migration — `seasonBudget` rides on the `club` blob). `createdWeek` exists so "this season" has
  ONE definition: the app had a 52-week contract year, a 46-week playing season, an absolute
  never-reset `weekNumber` and a fixture-driven transition, and electing any of them would have
  created a second source for a quantity Step 1 already owns.
- Part C: `staffHireRefusal` tests that pot instead of `wageReservationPence × STAFF_WAGE_SHARE_BP
  / weeks`. `c73bf9a8`'s renewal-delta logic survives. `STAFF_WAGE_SHARE_BP` survives too, as a
  description of the committed split rather than as an allowance.
- `anchorAmpStaffWages` retired, its overruled argument kept on the record at its old site.
- ⚠️ **Finding that corrects this repo and the brief: `economy.incomeAnchoredWages` resolves TRUE
  on the live config.** `economyConfig.ts:187` derives it from `wageModel` when the key is absent,
  and the live SC payload omits the key while publishing `turnover`. Absent is not false; the
  `false` in `gameConfig.ts` belongs to the pre-sync `DEFAULT_GAME_CONFIG`. Three "inert behind the
  flag" claims in this repo were wrong on that premise, including A26's.
- `04_interfaces/output/services.md` gained the module's section and its five charge sites;
  `07_synthesis/output/game-mechanics.md` §"What each budget is actually spent on" gained the
  three-step model, the graduation property, the gate change and the flag correction.
- Gates: `npx tsc --noEmit` clean; `npm test` 651 suites / 10,865 passed (10,868 collected, 3
  skipped), `--listTests` 651 — baseline 650 / 10,832, reconciles exactly as +1 suite / +33 tests.
  The economy gate FAILs on the same 5 checks as pristine HEAD (verified by running it against a
  `git archive HEAD` copy) — **it has not moved**; the harness imports none of the changed files.

## 2026-11-20 (eighty-seventh pass) - scouts gain a real `ability`, and three conflations go

- **A26 phase 1: scouts get a real `ability`, 1-100 (2026-11-20)**, on `new-game-save`.
  **Stages touched:** 03_data (`entities.md`), shared (this file). Report:
  `wunderkind-docs/economy-loose-ends/a26-scout-ability-report.md`.

  ⚠️ **Ordinal note:** numbered to follow A23's eighty-sixth pass on this branch. Per the
  warning above, the DATE is the reliable identity, not the number.

  **The ruling.** Owner, 2026-11-20: *"add 'ability' value, 1-100, have it driven off experience
  and judgements, to set a single figure, then we'll base wage on that"* - because *"experience
  doesn't match 1 to one"*. **Phase 1 is the FIELD ONLY**; basing a wage on it is A24, blocked
  behind part B. No salary moves in this change.

  **What landed, app side.** `ability: number` on `Scout`, `MarketScout` and `WorldScout` (the
  last optional, for a pack cached at v11 or earlier - the backend bumped
  `WORLD_PACK_VERSION` to 12 for this key). New `src/utils/scoutAbility.ts` with
  `resolveScoutAbility()` / `ensureScoutAbility()`, wired at every ingest: `parseMarketData`,
  `worldScoutEntryToScout`, `worldStaffToScout`, `HireScreen`'s scout shaping, `marketStore`'s
  hire, and **both SQLite rehydrations** (`bootstrap`'s `staff_scout` step, `cacheRepair`).
  **Never `?? 0`** - a 0 would price a scout at the bottom of A24's band.

  **No SQLite migration was needed, and that is a fact worth keeping.** A scout is a JSON blob
  in `staff.data`, so a new field needs no schema change - but a blob written before today has
  no `ability` key and `parseStaffRow` casts without checking, so the store is normalised at
  both hydration points and a save self-heals on first load.

  **Three conflations corrected** (the point of the ruling, not a tidy-up):
  `SeasonBudgetService`'s AMP staff snap fed `scout.experience` into the band that prices a
  coach's `coachingAbility` - now `scout.ability`; the type comments on `Scout.experience` and
  `TournamentSnapshotStaff.ability` both called experience "raw 0-100 ability from backend".
  ⚠️ The `SeasonBudgetService` change is a **behaviour change that is inert today** - the
  function early-returns on `economy.incomeAnchoredWages`, which derives from
  `wageModel === 'turnover'`, and the live model is `legacy`. That is what lets phase 1 correct
  the figure without moving a salary.

  ⚠️ **`ScoutJudgements` is now `Partial`, and `WorldScout.judgements` was unified onto it.**
  The backend writes FIVE keys for every real scout; the seven-key type came from a different
  backend population. 🔴 **This surfaced a live defect left deliberately unfixed:**
  `ageGateFor()` reads `youth`/`senior`, which no real scout has, so it has returned **0 for
  every scout in the game** since it was written. Fixing it changes scouting accuracy in every
  save - a simulation change phase 1 must not make. Logged in the report.

  **Verification.** `npx tsc --noEmit` zero errors. `npm test` 648 suites (`--listTests` 648).
  **The economy gate is byte-identical** with this change applied, proven in a throwaway
  worktree at HEAD rather than argued: HEAD and HEAD+this-change both hash
  `c5941b3008fe9cfa6b881ef22235f48e`. The full working tree differs because it also holds
  A23's uncommitted work.

## 2026-11-19 (eighty-sixth pass) - the app stops reading the retired `league.slots`

- **A23: the app stops reading the retired `league.slots` (2026-11-19)**, on `new-game-save` on
  top of **`c73bf9a8`** (A22's staff-wage commit, which landed part way through this session's
  verification; no file overlap). **Stages touched:** 07_synthesis (`game-mechanics.md` §13.6), shared (this
  file). Report: `wunderkind-docs/economy-loose-ends/a23-retire-slots-report.md`.

  **Why.** The backend retired `league.slots` the same day (owner: *"retire slots"*), so an
  authored size read off an export file is a divisor the running backend no longer uses.

  **What landed.** `homeGamesForLeague` loses its `league` parameter and its `slots − 1` branch:
  it is now `homeGamesForLeague(clubCount, isDeepestTier, fallback)`, mirroring
  `LeagueSizeResolver::sizeOf()` exactly — rows, plus the player's place at the country's deepest
  tier, and the caller's fallback for a tier with no rows. New `deepestTierForCountry(world,
  country)` answers the second argument from the export's league rows (clubs as a fallback),
  mirroring `findLowestTierForCountry()`. All three harness gates updated. **EN 15 home games at
  every tier, unchanged; SC 11 at every tier, where the authored 14 gave 13.**

  ⚠️ **§13.6 CONTAINED A RULE THAT IS NOW REVERSED, and it is annotated in place rather than
  rewritten away.** It said *"do not fix that by re-adding a `+1` at the bottom: the reserved place
  is a property of the box that generated the export, not of the game"*, and concluded `slots − 1`
  was the only formula correct in England at all eight tiers. The third option it did not weigh —
  `rows + (deepest ? 1 : 0)` — is correct in England at all eight tiers *and* in Scotland at all
  eight, which neither of the two it compared manages.

  ⚠️ **AND THE A23 BRIEF'S PREMISE ABOUT `economyDiagnostics` WAS WRONG; the check is NOT
  retired.** It was briefed as losing its central case ("with nothing authored the `authored ≠
  clubs` DISAGREE row can never fire"). The app never read `league.slots`: that field has always
  been fed the published `clubCount` (`ChecksTab:246`), which the backend now derives. `clubs`
  still comes off the CACHED world pack, so the pair can still disagree — and a stale pack is the
  one remaining route to the live defect. ⚠️ Only the vocabulary was wrong, so the field and its
  message are renamed `slots` → `divisor` and `authored N ≠ M clubs` → `divisor N ≠ M clubs`;
  "authored" on a device screen sent three sessions looking for a column to correct.

  ⚠️ **For the PM: A19 needs re-scoping, and not as its own brief expects.** `a19-*.md` is marked
  "run A23 first, then re-scope around what is left". A23 does NOT remove A19's work — the
  three-state AGREE/DISAGREE/UNKNOWN scoring, the `pool ÷ tvDeal` divisor recovery and the
  integer-division tolerance are all still needed and still unstarted, because `divisor` is still
  null for every pack-sourced league. What changed is only that the DISAGREE row's wording moved.

  **Suite.** `npm test` → **647 suites / 10,802 passed**, 3 skipped, `--listTests` 647. `npx tsc
  --noEmit` → zero errors. ⚠️ **Of the +14 over the 647 / 10,788 baseline, only +2 is this
  change** — A22's `c73bf9a8` landed mid-verification in the same checkout and is the other +12.
  Attributed by stash-and-rerun on the two test files this change touches (43 with, 41 without),
  not by reading the suite total.

## 2026-11-19 (eighty-fifth pass) - the NPC budget stops being built on 23 home games

- **Commit:** on `new-game-save`, on top of `e03dd6da` ("Derive pre-fixture home games from the
  division, not half of it"), hash in the report. **Not pushed.** Four app modules, three test
  files (one new). **No authored economy figure touched** — the owner's §0 was explicit that the
  reduction is not to be offset, and that if NPC clubs end up too poor the lever is turnover.
- **Stages touched:** `07_synthesis/output/game-mechanics.md` (§13.6 — `SeasonBudgetService:526`
  struck through as fixed, A6's blast-radius estimate corrected with per-tier measurements, the
  export-vs-authored `slots` confusion recorded, and `GameLoop:1520` annotated with the flip
  measurement that is why it did NOT land), `01_overview/output/environment.md` (green-master bar:
  `new-game-save` 640 / 10,704, with the baseline re-measured rather than assumed).
- **The change:** `SeasonBudgetService.bootstrapNpcSeasonBudgets` read
  `Math.max(1, Math.round(weeksPerSeason / 2))` = **23** home games — a 24-club division — and fed
  it to `npcWeeklyIncomePence` → `deriveClubBudget`, sizing every NPC club's squad wage spend every
  season. Its comment was proud of deriving from the season rather than hardcoding, and that is a
  real improvement on a literal, which is most of why it survived five passes. **A season length
  cannot tell you a division size.** Now COUNTED through `countHomeGames(fixtures, club.id,
  season)` with `homeGamesForDivisionSize(participants)` as the fallback. The existing
  `leagueOfClub` loop was extended rather than a second one added, as the brief asked.
- **What this pass measured, and the three things worth carrying forward:**
  1. ⚠️ **A6's blast-radius estimate was too low and in an instructive way.** It put the cut at
     a flat 24–30% (EN) / 26–37% (SC); measured per club against both real exports with sponsors
     and TV INCLUDED it is **−7.3%/−7.0% at EN t1 but −31.1%/−33.8% at EN t8**, and **−9.7%/−10.9%
     / −41.4%/−51.1%** in Scotland (two figures because two exports twelve minutes apart pick a
     different median club, and Scotland's differ in home games too — 13 against 11). The SPREAD
     across tiers, not the level, is the finding: TV and sponsors dominate a tier-1 club's income
     and dilute the matchday term, while a tier-8 club is almost all gate — so the correction lands
     hardest at the BOTTOM, where solvency was already in question. A6's figures excluded sponsors.
  2. ⚠️ **`GameLoop:1520` was MEASURED and deliberately NOT landed.** Its 23 scopes to the solvency
     verdict, and correcting it flips **16/16 EN and 14/14 SC tier-1 clubs** out of `healthy`
     (EN t8: 0/15, SC t8: 4/11). The cause is not the count: a tier-1 club's wage bill plus upkeep
     sits within a few percent of its income, so any reduction puts it in deficit. A sweep over the
     modelled wage share gives 0 flips at ≤55% of turnover and all of them at 60% — a knife edge,
     which is itself the finding. The one-line correction is written at the site so the next reader
     does not re-derive it.
  3. ⚠️ **No local world export carries the authored sizes §13.6 quotes.** Every `world.*.json` in
     the checkout emits `slots: 18`; the 16/14 are what A7 authored into the backend `league` table
     that day. And **Scotland's club rows moved between two exports twelve minutes apart** (12 at
     21:48, 14 at 22:00), so a counted Scottish figure is 11 or 13 depending on which generation a
     save came from. That is the strongest argument yet for counting over deriving while the
     12-vs-14 question is open, and §13.6 now says so.
- **Guards:** new `src/__tests__/engine/npcSeasonBudgetHomeGames.test.ts` (12 tests — the COUNTED
  path, the DERIVED path and the `ampLeagueId` `+1` decision pinned **separately**, including that
  the `+1` follows the player through promotion). `pricingPaneHomeGames.test.ts`'s source guard now
  reads a **fifth** file, per its own standing note. ⚠️ Its new assertions strip comments before
  matching, because the corrected site deliberately QUOTES its own defect — *"This was
  `Math.max(1, Math.round(weeks / 2))`"* — which is exactly the prose a future reader needs and
  exactly what a naive source match flags. **Match the code, never the prose about it.**
  `seasonBudgetService.test.ts`'s exact-readers list gained the new file, which is that guard
  working as designed.
- **On-device:** a two-line `NPC BUDGET — HOME GAMES (A12)` section in Debug → CHECKS
  (`npcHomeGamesChecks` in `economy/economyDiagnostics.ts`), per the owner's standing note of the
  same day. Row 1 states a RELATIONSHIP and can **fail** — `participants N · counted N · derived N
  · using N (COUNTED/DERIVED)`, FAIL when a counted figure disagrees with the derivation, which is
  the shape of the Scottish drift three agents triangulated by hand. Row 2 is the weekly income
  split (sponsor + matchday + seasonal) labelled with the count it used.
- **Gate:** `variantGate.ts` byte-identical across a stash, md5 `24f2d74db39fccd15f349316fadedd62`
  both runs — the same hash A8 recorded, as it must be: it reads config and a world export, not
  these modules.
- **⚠️ Flagged for the PM, not acted on:** §13.6 is now very long and three of its five STILL-WIRED
  bullets are struck through. It reads as a changelog rather than a rule. Consolidating it is a
  pruning decision and belongs to the project-manager session.

## 2026-11-19 (eighty-fourth pass) - three fallbacks that assumed a single round-robin

- **Commit:** on `new-game-save`, on top of `b29cf149` ("Correct the Scottish TV shortfall"),
  hash in the report. **Not pushed.** Two app modules, three test files. **No authored economy
  figure touched**; `SeasonBudgetService:526` and `GameLoop:1520` deliberately NOT changed, and
  `FALLBACK_DIVISION_SIZE` deliberately NOT re-authored — all three are the owner's decision.
- **Stages touched:** `07_synthesis/output/game-mechanics.md` (§13.6's STILL WIRED list: three
  of its five entries struck through as fixed, with the measurement that corrects A6's blast-radius
  claim), `01_overview/output/environment.md` (green-master bar: `new-game-save` 639 / 10,685).
- **The change:** the last three sites halving the division size —
  `SeasonTransitionService.ts:1656` (NPC season-1 season tickets), `:2499` (the player's own
  booking) and `FinancialProjectionService.ts:222` — now route through
  `homeGamesForDivisionSize`. `generateRoundRobin` is a DOUBLE round-robin, so the answer is
  `size − 1`; all three returned roughly half, and all three said *why* in a comment, which is
  how they survived A6.
- 🟩 **The headline is a MEASUREMENT, and it shrinks the finding.** A6 recorded that these fire
  "at world init, which is exactly when it fires", with the money sites booking half a season.
  **They do not fire there.** `useInitFlow`'s step N+2 generates **every** league's schedule
  before step N+5 distributes income, and at a transition `applySeasonResponse` generates the new
  season's schedule inside `server_sync`, long before `processFanReactions`' PART 2b books the
  tickets. Both money sites are COUNTED in every healthy flow, so **no shipped save mis-booked
  season-ticket money.** The reachable one is the projection, which derives whenever no fixtures
  are loaded for the current season (the failed-hydrate / cache-loss state) and whose count drives
  both the matchday total and the season-ticket lump. **A correctness tidy-up, not a money fix** —
  stated plainly because the brief invited the opposite framing.
- ⚠️ **The NPC site needed a conditional `+1`, which the halving had masked.** It reads
  `worldStore.leagues[].clubIds`; both writers exclude the player's own club
  (`setFromWorldPack` from a pack that reserves the place, `applySeasonUpdate` filtering `isAmp`),
  so the AMP's own league holds `rows + 1` participants and every other league exactly its rows.
  The two player-club sites read `leagueStore.league.clubs` and keep an unconditional `+1`.
  A wrong `+1` would have been as bad as the halving, so each case has its own test.
- **Guards.** `pricingPaneHomeGames.test.ts` now reads **all four** files, as its own header
  instructed, and additionally forbids a comment asserting a single round-robin — it caught this
  pass's own freshly written comments quoting the defect verbatim, which is the guard working.
  New `src/__tests__/engine/roundRobinHomeGameFallbacks.test.ts`: 13 tests, **one site per
  describe**, each requiring the DERIVED figure to equal the COUNTED one rather than restating
  the arithmetic. Verified RED on all 13 against the pre-change modules.
  ⚠️ `SeasonTransitionService.test.ts` had pinned the halved `8` as expected behaviour (`const
  HOME_GAMES = 8`) and now reads it from the helper.
- The economy variant gate is **byte-identical** before and after (`cmp`-verified across a
  stash), as it must be: `variantGate.ts` reads config and a world export, not these modules.
- **Flagged, not changed:** `SeasonTransitionService.ts:4511` is the transition-time NPC
  season-ticket booking and calls `countHomeGames` with **no fallback at all**, so a club with no
  loaded fixtures books zero rather than a derived figure. Different failure mode from this pass,
  same quantity. Detail in `docs/economy-loose-ends/a8-roundrobin-report.md`.

## 2026-11-19 (eighty-third pass) - home games come from the authored division size

- **Commit:** on `new-game-save`, on top of `b8842812` ("Sample the wage ladder across the tier's
  own band"), hash in the report (recording it inside the commit it names is circular).
  **Not pushed.** Three harness scripts, three app modules, four test files. **No authored economy
  figure touched**; `SeasonBudgetService` and `GameLoop` deliberately NOT changed — both violate
  the rule, both move or steer real NPC money, and both are the owner's decision.
- **Stages touched:** `07_synthesis/output/game-mechanics.md` (new §13.6),
  `01_overview/output/environment.md` (green-master bar) and `shared/` (this file). Evidence lives
  outside both repos, in `docs/economy-loose-ends/a6-homegames-report.md`.

- **The rule, now written down in §13.6: a club plays `divisionSize - 1` home games, from the
  AUTHORED size.** `generateRoundRobin` is a DOUBLE round-robin, so every club meets every other
  once at home. Both gates read `clubCount` — the export's club ROWS — which is one game high
  wherever the rows fill the division. `WorldExportLeague` now declares `slots`, which **the
  backend had been emitting all along while nothing declared it**, and `homeGamesForLeague`
  (`src/economy/harness/worldExport.ts`) owns the derivation for all three harness scripts.
- ⚠️ **Why it hid, and this is the part worth carrying forward.** World generation leaves one place
  open at the DEEPEST tier for the player's club, so there the rows already equal `slots - 1` (EN
  t8: 15 rows, 16 slots). A row-count derivation is therefore **exactly right at tier 8 and wrong
  at the other seven** - correct precisely where anyone would check it. ⚠️ **Do not "fix" that by
  re-adding a `+1` at the bottom**: the reserved place belongs to the box that generated the
  export, not to the game, and it is absent on the development clone.
- **COVERAGE moved as predicted and tier 8 is byte-identical** — measured delta matches
  `-matchdayShare / divisionSize` to within 0.1 point at all eight tiers on two independent input
  sets. Verdicts unchanged (`VARIANT GATE: PASS`, `K(b): PASS`); no check or band relaxed.
  ⚠️ The A6 brief's absolute COVERAGE table is **no longer reproducible** — `game-config-en.LIVE.json`
  was re-captured 2026-11-18 21:37 and the world export 2026-11-19 14:15, and the export's EN t1
  `tvDeal` fell 7.25x, which the gate's `RESCALE` multiplies prize and position money by. A control
  run against the old export proved the harness and not the fix. The MECHANISM is confirmed; its
  numbers should not be carried forward as a baseline.
- 🔴 **THREE MORE WIRED SITES nobody had, found by grepping the DERIVATION rather than the
  literal** — `SeasonTransitionService.ts:1656` and `:2499` (both book **real season-ticket
  money**, for every NPC club and for the player's own, at world init, which is exactly when the
  fallback fires) and `FinancialProjectionService.ts:222`. All three carry
  `Math.floor((size - 1) / 2)` — a **single**-round-robin's answer, so roughly **half** a season.
  ⚠️ **The ruling cites `SeasonTransitionService.ts:1655`/`:2498` as the COUNTED exemplar, and it
  is right about those lines — the defect is the `||` branch on the line after each.** 🟩 **One root
  cause, and both comments admit it in words** ("half the rounds at home", "round-robin gives (n-1)
  games total, half at home"): that is a SINGLE round-robin, so all three return about half the real
  figure. Left unchanged (out of brief, two are real-money decisions); **queued as A8.**
- ⚠️ **Scotland authors 14 slots against 12 club rows at every tier**, so there the correction moves
  the gate **UP** rather than down, and at SC tier 8 it makes a number worse (exactly right -> 2
  high). England's drift is 0 at every tier. 🟩 **`rows - 1` is NOT the better input, and EN tier 8
  settles it without reference to Scotland: rows are 15 there while the true division is 16, so
  `rows - 1` gives 14 against 15 — it breaks precisely where the reserved amp place lives.**
  `slots - 1` is the only formula correct in England at all eight tiers. Scotland's gate stays 2
  high until the authored 14 is reconciled; that is the owner's call, not a defect in the change.
- 🔴 **The drift is already costing money — a device reading mid-task is what surfaced it.** TV is
  divided by the authored `slots` in both countries (EN t8 discriminates: £75,000 by slots vs
  £80,000 by rows, published £75,000), harmless in England where they agree. In Scotland each club
  gets `pool / 14` where the division it plays in would give `pool / 12` — **85.7% of its due,
  14.3% short.** ⚠️ **State it as arithmetic, not as money going missing:** nobody distributes the
  pool, each club credits ITSELF `pool / slots`, so the claim is that **the sum of what a division's
  clubs credit themselves falls short of the authored pool** — **£86,600,000.36 per season across
  Scotland, against £0.00 in England.** ⚠️ Two counting traps, both of which caught a first pass:
  recipients at the DEEPEST tier are `rows + 1` (the player sits there and credits itself the same
  share, verified at `distributeSeasonOneStartIncome`), so SC t8 has 12 not 11 and using 11
  overstates the total by one share (£85,714.28); and calling the gap a 16.7% *over*payment is the
  wrong direction (16.7% is how much higher the owed share is than the paid one).
- ⚠️ **Scotland has never been gate-measured and cannot be here** —
  `loadExport.assertCountryResolved` refuses an EN-resolved config with `--country SC` and every
  captured config is EN. **So every COVERAGE figure and authored dial in this project comes from
  England alone**, while Scotland is the country the owner tests on and the harsher case everywhere.
  One authenticated `GET /api/game-config?country=SC` unblocks the whole suite.
- **`new-game-setup/economy.ts`'s `homeGames` is 16, not 15, and that is consistent rather than
  correct.** ⚠️ **No division size is published to the client at all** — checked
  `economyTierBaseline` (tierCount + per-tier ticket price, no size), `starter-config.economy`, and
  `LeagueSnapshot.clubCount` (which IS the authored `slots` but is absent pre-init and off the
  cached pack block). So it follows its two neighbours' pattern: a literal, because
  `contract.test.ts` holds that module to type-imports only, pinned in `economy.test.ts` against
  `homeGamesForDivisionSize(FALLBACK_DIVISION_SIZE)` — the app's own answer, which makes FUND YOUR
  CLUB and the Finances screen agree in one sitting. **Publishing `slots` on
  `economyTierBaseline.tiers[]` is the one change that deletes the constant.**
- ⚠️ **`dispersionGate.ts` cannot run at Node's default heap** — OOM at 1.8GB after 458s, and
  **pre-existing** (proved by a paired before/after run, both arms needing
  `--max-old-space-size=8192`). Same class as the heap death `variantGate`'s memoisation comment
  records; `dispersionGate` has no equivalent cache. Written down nowhere else. Not fixed.
- New guard: `src/__tests__/components/pricingPaneHomeGames.test.ts`. ⚠️ **It reads
  `PricingPane.tsx` and only `PricingPane.tsx`** — the lesson of the cohesion guard — so its header
  names the three sibling sites, and whoever fixes one must add it there in the same change.
  `homeGamesForDivisionSize` is pinned against `generateRoundRobin` itself rather than a number.

## 2026-11-19 (eighty-second pass) - the wage ladder samples abilities that exist

- **Commit:** on `new-game-save`, on top of `4706169b` ("Price the pack on the device"), hash in the report (recording it inside the commit it names is circular).
  **Not pushed.** One module, one component, one test file. No authored economy figure touched;
  `wages.ts` and `wageScaleMicroPence` deliberately untouched.
- **Stages touched:** `07_synthesis/output/game-mechanics.md` (§13's open list) and `shared/`
  (this file). Evidence lives outside both repos, in
  `docs/economy-loose-ends/a2-wage-ladder-report.md`.

- **`WAGE_LADDER_ABILITIES` is gone.** The Economy Workings panel's wage table sampled a fixed
  `[10,20,40,60,80,95]` **at every tier**, so at tier 8 — England's authored band is **2–7** —
  every one of its six rows priced a player the generator cannot produce, and quoted ~£3,200 for
  "ability 20". `wageLadderAbilities(band, rungs = WAGE_LADDER_RUNGS)` replaces it: up to six
  rungs spread evenly across the tier's own band, both ends included, **never more rungs than
  the band has whole points** (a five-point band would otherwise round two rungs onto the same
  ability, which reads as two prices for one player). Tier 1 reports 55,63,71,79,87,95; tier 8
  reports 2,3,4,5,6,7. `wageLadder`'s `abilityBand` is **required, not defaulted** — a default
  band is the fixed array again under another name, wrong silently.

- ⚠️ **The band is a POTENTIAL range, and the panel now says so.** This is the finding that
  outlives the fix. `league_ability_ranges` is what NPC squads are GENERATED from; current
  ability is derived below it and grows toward it with age. The 2026-11-19 device pass, read off
  the player card's raw `ability/potential`: **25% at 19, 30% at 20, 40% and 59% at 24, 78% at
  26, 90% at 31.** So a band-sampled ladder says what a tier's players will *eventually* be
  worth, not what a real squad costs today — a large part of why measured wage bills land at
  ~28% (tier 1) and ~35% (tier 8) of the calibration target. **Still open, deliberately:**
  sampling expected MATURE ability instead, which waits on the reference-squad decision. The
  hook is that `abilityBand` parameter.

- **The country is load-bearing in this panel too.** The band is resolved with
  `resolveAbilityRange(config.leaguePlayerAbilityRanges, saveCountryCode(), tier)`. A blind read
  falls through to `TIER_DEFAULTS` and would show a Scottish save England's band with nothing
  looking wrong — the same defect `saveCountryCode()` was created for at the four engine sites.

- **The caveat line is a LITERAL, not a catalog key — owner's decision, against the task
  brief's §3.** `EconomyWorkingsPanel.tsx`'s header states the convention outright: debug
  surfaces are plain English, because a diagnostic read by the owner is not player-facing copy
  and ~40 throwaway keys in front of translators is the cost of pretending otherwise. The
  panel's two existing caveat paragraphs are literals for that reason, and all three move to the
  catalog together if the panel is ever promoted out of `debugLoggingEnabled`. The token audit
  was run regardless and is clean. **This is the one place a reader should expect the brief and
  the code to disagree.**

- **The economy variant gate is byte-identical before and after (md5-verified across a stash).**
  It must be: nothing outside the panel and its test imports `economyWorkings` at all, so the
  module is not reachable from `scripts/economy/`.

## 2026-11-18 (eightieth pass) - the reference squad, floored

- **Commit:** `b8ce310c`, on `harness-reference-squad-floor` (cut from `dev` @ `a3acb25a`).
  **Not pushed.** One behaviour change, two tests, no authored figure touched.
- **Stages touched:** `02_architecture/output/structure.md` (the `harness/` entry),
  `01_overview/output/environment.md` (the green-master bar), and `shared/` (this file).
  Evidence lives outside both repos, in `docs/economy-loose-ends/harness-squad-size-report.md`.

- **Closes the open defect recorded in the seventy-ninth pass above**, which is marked fixed in
  place rather than deleted. `loadExport.ts` sized the reference squad with `Math.round` where
  `EconomyScaleResolver::referenceSquadSize()` uses `intdiv(min + max, 2)`; it now floors.

- **The invariant is what decided it, not a preference between two roundings.**
  `wageScaleMicroPence × Σ(ability^k) / turnoverPence` is the backend resolver's own formula
  rearranged, so it must be constant across tiers. Reproduced before changing anything, from
  `game-config-en.LIVE.json` + `starter-config.LIVE.json`: **floored it is 9782.608696 at all
  eight tiers** (9782.608677-9782.608713, i.e. flat to ten significant figures); **rounded, tier 7
  alone comes out 10297.894068**, 5.27% off, every other tier unmoved. Tier 7 (16/19) is the only
  odd `playerMin + playerMax` in the live table — 52/46/42/40/38/36/**35**/34 — which is why a
  whole-table defect presented as one tier.

- ✅ **The gate's COVERAGE table is byte-identical** — the whole block hashes the same before and
  after (`md5` of the "Income composition" section), and the verdict stays `PASS`. That was the
  stated stop condition: COVERAGE has no wage term, so movement there would have meant the squad
  size reaches something unmapped. It does not.

- **What DID move is one tier's wage rows, and the direction is the confirmation.** At tier 7 the
  AUTHORED `bill%` goes 115.8% → 112.7% and MODELLED 45.5% → 44.2%; the season-1 bill
  £368,085 → £349,669. **The AUTHORED wage-share row flattens from "60.0-63.2%, spread 3.2
  points" to 60.0% at every tier, spread 0.0.** That row's own caveat says a flat share means the
  authored table is internally consistent — so the 3.2-point spread the gate has been printing was
  never a property of the config, it was this bug, and the gate was reporting the app's arithmetic
  error as a finding about the backend's numbers.

- **The hardcoded fixture was already right, so there was no second defect to fix.**
  `ENGLAND_DEV`'s tier 7 carries `appSquadSize: 17` — the floored value — which means
  `driftAgainstFixture` had been emitting a tier-7 `appSquadSize` row at 5.88% against its 5%
  default threshold **for as long as the bug existed**. That file's docblock says any drift row is
  now a FINDING rather than a confirmation; this one was a true finding nobody read. The fix
  removes it, and a new test asserts the loader and the fixture agree on every tier's squad size so
  the channel stays clean enough for the next real row to stand out. `referenceSquadSize` (23 at
  tier 7) is a different quantity — the backend's calibration squad, not the fielded one — and is
  untouched.

- **The green-master bar's `dev` row was stale a SIXTH time**, and for a new reason worth naming:
  it was *correct when written* (635 / 10,602 at the `new-game-save` → `dev` merge, 2026-11-16) and
  went stale because `dev` then received the income-truth batch. Re-measured at `a3acb25a`:
  **636 / 10,627**. The baseline was measured on a stashed tree rather than derived by subtracting
  this branch's two tests — which is the only reason the staleness was caught, since the derived
  figure would have matched the branch and hidden it. Also recorded there: **the headline test
  figure is the PASSED count and `collected` is 3 higher**, a convention the table never stated and
  which manufactures a 3-test discrepancy when the two are compared.

## 2026-11-18 (seventy-ninth pass) - the coverage dials, re-derived

- **Commit:** none — `dev` @ `a3acb25a`, stage edits in the working tree. No app or backend code
  changed: the deliverable is an authoring table for the operator, plus the tooling that produced
  it (`docs/economy-loose-ends/dials/`, outside both repos, beside `REMAINING-WORK.md` §2).
- **Stages touched:** `07_synthesis/output/game-mechanics.md` (§13.2's stop notice, §13.5's prize
  bullet) and `shared/` (this file).

- **Dial 1 is solved, not searched, and the gate proves why.** No modelled income line depends on
  `turnoverPence`: TV comes from the `ENGLAND_DEV` fixture, the bands and prices are absolutes,
  and **the wage bill comes from `wageScaleMicroPence`** (`loadExport.ts` builds
  `turnoverAvgWeeklyPence` through `weeklyWageRange`). With the landed prize ladder paying a flat
  2.573% of turnover at FINISH=10, `T = F / (COVERAGE - 0.02573)` is exact, and at tier 1 it
  reproduces the old dial-1 value (£288m vs £290m) — the one tier the income-truth corrections
  nearly cancelled on.

- ⚠️ **The backend's landed prize fix (`5dc3f51b`) takes the variant gate PASS → FAIL.** Measured,
  not predicted: tier 8 insolvent in season 1 (bill 100.7% of income) because 118 points of income
  went while upkeep stayed, and **tiers 2 and 3 fall OUT of the 85-110% band** — they were in it.
  The gate cannot see this yet from a Nov-15 `world.json`, which is where it reads league money.

- ⚠️ **Dial 3 was recorded as "over-sized". It is unsafe alone, which is the opposite reading.**
  The documented `0-1` stand band puts tiers 7 AND 8 insolvent on its own (upkeep 42.5% / 64.9% of
  income), because at tier 8 the stands are 33% of upkeep against a matchday worth 87% of income.
  Dial 4 — six implausible facilities at tiers 7-8, no matchday among them — restores PASS by
  itself, which makes it load-bearing rather than tidy-up.

- **A floor nobody had measured:** upkeep is anchored at tier factor 1.0 at tier 8 *on purpose*
  (`POST /api/club/fund`'s projection is read at FOUND CLUB), so a plausible bottom-tier ground
  costs £110k-£145k a season to run and puts a hard floor of about **£360k of authored turnover**
  on tier 8. Today's £164,852 is below it: no turnover table can leave tier 8 that poor and
  solvent.

- **Candidate C chosen the same day**, and writing the authoring run turned up two corrections to
  the derivation itself. **`wageScaleMicroPence` is DERIVED from the turnover row**
  (`EconomyScaleResolver::wageScaleMicroPence()` is `playerBudget / (weeks × Σ ability^k)`), so it
  moves by itself and the gate's `--wage-scale-follow` is a model of what the backend will publish
  rather than a table to type in. And **`npcFacilityLevelRanges` is keyed by BAND — tiers 7 and 8
  together — with no country dimension**, so C's tier-8-only exclusions are not expressible; it was
  re-solved in the authorable form (nine exclusions at both tiers, tier-7 turnover £602k → £596k,
  verdict unchanged). The run also predicts **three expected warnings** on the Economy admin
  screen: `buildPreview()` flags a tier whose wage scale does not fall, and C inverts the
  per-ability rate at tiers 2, 6 and 8 while the average wage still falls monotonically.

- ⚠️ **And then those "warnings" turned out to be HARD FAILURES of the backend's release gate,
  which is the finding of the day.** `app:economy:wage-table` check 1 (S_tier strictly decreasing)
  and check 2 (no shared ability paid more in the lower division) exit non-zero, and **no turnover
  ladder satisfies both them and the 85-110% COVERAGE band** — the EN ability bands flatten at the
  bottom (`10-25` → `10-15` → `5-10` → `2-7`) far faster than the grounds' income does, and
  lowering the wage-curve exponent cannot close tier 7→8 even at k = 1.0. So the authored table has
  **two** invariants to satisfy and this repo's gate only holds one of them: COVERAGE says the
  revenue model and the ladder agree about a division, check 1/2 say a player is never paid more
  for playing in a worse one. The three resolutions, with numbers, are in
  `candidate-c-authoring-prompt.md` §1; the recommendation is to keep the bands and let tiers 6 and
  8 sit out of band (verified PASS at £331m … £215,000, coverage 137.5% / 162.1%), because
  re-authoring the bands is a squad-quality change that also moves staff pay through
  `TierBandScaleResolver`. ✅ **The owner chose R2 the same day**; the implementation brief is
  `r2-economy-authoring-brief.md`, and the ability-band question stays open as a BALANCE decision.

- ✅ **FIXED 2026-11-18 by the eightieth pass below (`harness-reference-squad-floor`). Kept rather
  than deleted — the measurement is the evidence the fix was correct.** ⚠️ **APP DEFECT found while
  reviewing the backend's R2 authoring (2026-11-18): the two repos
  disagree about the tier-7 reference squad size.** `EconomyScaleResolver::referenceSquadSize()`
  uses `intdiv(min + max, 2)` — FLOOR — so dev's tier 7 (`playerMin` 16, `playerMax` 19) is **17**,
  while `src/economy/harness/loadExport.ts` uses `Math.round` and gets **18**. Proof rather than
  inference: `wageScaleMicroPence × Σ(ability^k) / turnoverPence` is constant at **9782.608696
  across all eight tiers** with floored sizes (flat to ten significant figures), and breaks by
  **5.3% at tier 7 alone** with rounded ones. So the harness prices a tier-7 reference squad the
  backend does not have, and its `turnoverAvgWeeklyPence` there is about 5% low. **COVERAGE is
  unaffected — it has no wage term** — which is why no gate run has ever shown this. One-line fix
  in `loadExport.ts`; the published `wageScaleMicroPence` is the backend's and is not in question.

- **A lead on §4's open question 2** (the player's £14,057/wk against an NPC's £1,700): 60% of
  authored turnover at tier 8 is £2.15k/wk and 60% of modelled income is £8.9k/wk, so the gap has
  the shape of "NPCs priced from the table, the player budgeted from income" rather than of a
  squad-composition difference. A hypothesis from the gate's arithmetic, not a trace.

## 2026-11-16 (seventy-eighth pass) - the income-truth batch

- **Commit:** `4d75a15e`, on `economy-income-truth` (cut from `dev` @ `6f11e58f`, OTA 479).
- **Stages touched:** `02_architecture/output/structure.md`,
  `07_synthesis/output/game-mechanics.md` (§13.2, §13.4 and a new §13.5),
  `01_overview/output/environment.md`, and `shared/` (this file).

- **Written as part of the change, not as a backlog sweep.** Four commits landed on this branch
  and each invalidated something `.context/` asserted, so the stage edits are in the same batch
  rather than deferred to a later review.

- **§13.4 was itself the trap it warned about, and that is the entry worth reading.** It said
  `incomeAnchoredWages` is absent from the live export and that an absent key resolves false, so
  the flag is OFF and `wageModel: turnover` "looks like the same switch and is not". The first
  clause is true and the rest is wrong: `economyConfig.ts` resolves
  `config.incomeAnchoredWages ?? (baseline?.wageModel === 'turnover')` — absent **derives** —
  and `game-config-en.LIVE.json` carries `wageModel: "turnover"`, so the flag is **ON**. A
  device confirms it ("income-anchored wages ON"). So it **is** the same switch, the FLIPPED arm
  is what the game runs today, and the two gate arms had been read the wrong way round when
  deciding which tiers need attention. Pinned by `economyConfigIntake.test.ts`, which reads the
  resolver's source.

- **§13.2's 676% is re-measured at 534.9%**, with the full before/after table for all eight
  tiers. The gate's income model omitted shirt sales entirely while charging every seat full
  face price; both are now modelled. ⚠️ **Tier 1 moves the other way** (72.8% → 73.0%), so no
  single factor can be applied to the existing dials. The dial sheet (outside this repo, in
  `docs/economy-loose-ends/REMAINING-WORK.md`) carried a stop notice saying every dial needed
  re-deriving; the per-dial verdicts are in §13.5's "Still open" list too, so the stage output
  does not depend on a file outside version control.
  **Resolved 2026-11-18** — all four dials are re-derived and candidate C was chosen, then
  superseded by R2 when it failed the backend's `app:economy:wage-table` check 1. See the
  seventy-ninth pass below; `REMAINING-WORK.md` §2 holds the derivation and
  `COVERAGE-DIALS.md`, which this entry originally named, was retired into it.

- **New §13.5** records the batch: the shirt refactor and tier-linked price, the three forecast
  defects in one expression, the gate corrections, and six things still open — including two
  that are **not** app-side (the prize ladder at 30.3× turnover at tier 8, and the unfiltered
  pyramid tax base).

- **`src/economy/` is 24 files**, up from the 22 recorded on 2026-11-15: `shirtSales.ts` added,
  `src/utils/shirtSales.ts` deleted.

- **The green-master bar's `dev` row was stale a FIFTH time** — 625 / 10,515 at `d687a51b`, when
  `1cf87528` had since merged `new-game-save` into `dev`. Corrected to 635 / 10,602, with this
  branch's own 636 / 10,627 added beside it.

## 2026-11-15 (seventy-seventh pass) - the 137-commit backlog, reviewed

- **Commit:** `3358ed74`, on `new-game-save` (uncommitted working tree on top of it).
- **Stages touched:** `02_architecture/output/structure.md`,
  `07_synthesis/output/game-mechanics.md`, and `shared/` (this file, `token-savings.md`).
- **What the backlog actually was.** `git log d076e5b3..HEAD` returns 137 commits, but most are
  merges from `development` carrying work that branch's own passes had already documented, and
  the substantive window is 2026-11-13 to 15 — the economy overhaul. **Several of those passes
  wrote stage output without updating this file**, so the commit backlog and the documentation
  gap were never the same set: `game-mechanics.md` already carried the pyramid share cap, the
  NPC buyout, the facility sale and the Q5 elasticity work.
- **The real gap was the `src/economy/` module map.** It was written at "economy overhaul step
  2" and never revisited while the module grew to **22 files** — **17 of them undocumented**,
  including the entire N-series budgeting model (`clubBudget.ts`, `budgetView.ts`,
  `financialApproach.ts`), the payment side (`seasonFinances.ts`, `parachute.ts`, `upkeep.ts`),
  the solvency pair, `marketValue.ts`, `ticketElasticity.ts` and the three read-only
  diagnostics modules. They are now grouped by the question they answer, because the filenames
  alone do not separate "what a club is paid" from "what a club may spend".
- ⚠️ **The lesson worth carrying is about the stale caveat, not the missing files.** The
  `harness/` entry still read "it models wages against revenue and nothing else … safe for a
  reproduction, wrong for a release gate" — written at step 2 and true then. Steps 4-8 closed
  it, and `scripts/economy/variantGate.ts` IS the release gate now. A reader trusting that
  sentence would have concluded the gate's verdict does not count. **A stale caveat is worse
  than a missing one: it is a specific, confident, wrong instruction**, and unlike an absent
  entry nothing about reading it feels incomplete.
- Also added: the mean-reverted player renewal (a ROUTING fix — `quoteRenewal` existed and was
  wired into the DoF path only — plus the deliberate split that keeps `payGapRatio` on the
  market figure), and season-1 budgets being set at START GAME.

## 2026-11-15 (seventy-sixth pass) - the app reads per-division sponsor bands and ticket price

- **Commit:** `3358ed74`, on `new-game-save` (uncommitted working tree on top of it).
- **Stages touched:** `02_architecture/output/structure.md` (the `perTierEconomy.ts` bullet in
  the `src/economy/` module map), `04_interfaces/output/routes.md` (a new
  `EconomyTierRow gained two fields` section), `07_synthesis/output/current-focus.md` (the
  per-tier sponsor/ticket section), and `shared/` (this file, `token-savings.md`,
  `usage-savings-log.md`).
- **Why:** the backend now resolves a sponsor band and a ticket price **per division** and
  publishes both on `economyTierBaseline.tiers[]`, country-scaled. The app reads them through
  one new module, `src/economy/perTierEconomy.ts`.
- **The two defects it closes, both measured:** the six flat `smallSponsorMin`-style keys were
  one band for every division in the world, so a tier-8 league sponsor pot equalled tier 1's
  (club plus league sponsorship was 175% of tier-8 authored turnover against 1.2% at tier 1);
  and every club started at a flat 2500p, which under elasticity is r = 1.67 at the bottom of
  the pyramid — about 39% of a bottom-tier club's attendance given away by a literal.
- **The part worth keeping is what "unauthored" has to survive.** `0` is not a price and an
  all-zero band is not a band: both mean the operator has authored nothing, and both have to
  fall through rather than win, because a published 0 read as a price makes every club free and
  a zeroed band rolls every pot to nothing *while looking configured*. There is no flat
  ticket-price key to fall back to, which is why the zero carries that meaning at all.
  `__tests__/economy/unauthoredBackendParity.test.ts` is that case and nothing else.
- **"Advised" means two things and they must stay one figure** — the price a club STARTS at
  (`clubStore`, `useSetupHost`) and the denominator of the elasticity ratio (`matchdayIncome`).
  Splitting them would put every club in the division off its own advice by construction, which
  is worse than the flat default it replaces.
- ⚠️ **Staleness check run this pass, and it is the finding that outlives the feature:**
  `git log d076e5b3..HEAD` on `new-game-save` returns **137 commits**. The entire economy
  overhaul — N1-N6, Q5 elasticity, the pyramid share cap, the budget screens, the RANDOM CLUB
  loader fix, the season-1 budget bootstrap — landed after the last recorded sync below and has
  never been reviewed into `.context/`. The stages this pass wrote to are therefore correct
  about this change and may be stale about their neighbours. **Reviewing that backlog is a
  separate pass and has not been done.**

## 2026-11-12 (seventy-fifth pass) - staff ability joins the star-rating sweep

- **Commits:** this one and `d076e5b3`, on `development`.
- **Stages touched:** `05_ui/output/patterns.md` (the `ceiling={100}` bullet in the star-rating
  section gained a 2026-11-12 extension).
- **Why:** `StaffMiniView`'s ability row was still printing the literal 0-100 score as
  `ABILITY {n}` - the last surface showing a rating as a number, three weeks after every player
  surface was swept to stars. It now renders `RatingStars ceiling={100}` with an explicit
  `overall`, the same reading the staff profile hero and `SignStaffPanel` already use.
- The part worth keeping is the **`mini` decision**, because the obvious answer is wrong twice
  over: both profile heroes use `mini size={22}`, but the convention is hero = one mini star,
  mini card = the full row at `LAYOUT.starSize` (what `PlayerMiniView` does), and `mini` also
  nests a `Pressable` + `PixelDialog` inside this card's own tap-to-profile `Pressable`, which
  would swallow that tap.
- `ui.staffMiniView.text` is orphaned by this and stays in the catalog, marked not-for-reuse -
  same treatment as `screen.assistant.text.4`.

## 2026-11-12 (seventy-fourth pass) - the economy design reference

- **Commits:** this one, on `development`. Doc only; no source changed.
- **Stages touched:** `07_synthesis/output/game-mechanics.md` (new **§12**, a line in "How to use
  it", a pointer at §8) and this router's `07_synthesis` row.
- **Why:** the owner designated Adrian Crook's "How Feedback Loops Shape Game Economies"
  (13 July 2026) as governing how economy features are implemented. **A larger economy project
  is coming and will carry its own implementation**, so this is deliberately a REFERENCE and
  not a pre-interpretation of it - the first draft was ~80 lines of vocabulary mapping and
  design rules, and was cut back on the owner's instruction. The lesson is the general one: a
  designated reference is not an invitation to design the feature early.
- It is the **first external reference in `.context/`**. One caveat is recorded with it because
  it was cheap to verify and expensive to rediscover: the article's benchmarks are free-to-play
  and real-money, and this app has no IAP or monetisation SDK, so those numbers have no
  referent here.

## 2026-11-12 (seventy-third pass) - `transfers` learns both ends of a deal

- **Commits:** this one, on `development`. Migration `0019_outstanding_the_call.sql`.
- **Stages touched:** `03_data/output/migrations.md` (a full `0019` section, plus a note that
  `0017`/`0018` were never written up), `03_data/output/schema.md` (the `transfers` bullet now
  explains all three club columns and what NULL means on the two new ones),
  `05_ui/output/patterns.md` (`top_transfer` came OUT of the "NOT reachable" table).
- **Why:** the Pyramid News BLOCKBUSTER row and the transfer page drew blank badges, and the
  reason recorded for it was "not fixable by adding a field - the `transfers` table has a
  single club column". That was true of the table and wrong as a conclusion: `npc_club_id` is
  the club a ROW is about, so one row could never say who sold to whom. `transfers` now has
  `from_club_id`/`to_club_id`, mirroring `staff_transfers`, which has had them since it was
  created.
- **Three things worth knowing:**
  - **Required, not optional, on `TransferRecord`** - which is how `tsc` enumerated all SEVEN
    writers (TransferService's two rows, npcTransferExecutors, GameLoop x3,
    SeasonTransitionService, squadStore). An optional field would have let a writer silently
    omit it and left the badge blank for one path only.
  - **NULL means "not a club in the pyramid", not "unknown"** - a free agent, a release, or a
    foreign club, whose id lives in `foreign_clubs` and has no badge here. The name is still
    stored, so a consumer shows the name and draws no club art. `TransferService` collapses
    its `''` sentinel to NULL for exactly this reason.
  - **An old EDITION never improves.** `pyramid_news.pages` is one JSON blob with no update
    path, so an edition generated before this release reads `undefined` forever and keeps its
    blank badge. Only new editions carry the ids - pinned as its own test rather than left as
    a surprise.
- **Not a backend change:** `buildSyncPayload` maps `SyncTransfer` field by field, so the two
  new columns are not sent anywhere. **And not a `FORCE_RESET`:** two nullable ADD COLUMNs, so
  every existing save migrates in place.
- `jest/preport/transferRepository.preport.ts` was AMENDED rather than left verbatim (its
  header says why): a frozen pre-port control cannot see a column added after the snapshot, and
  all nine of its comparisons were failing on that difference rather than on the port.
- Still open, and now one line away rather than impossible: `staff_poach` draws blank badges
  because `generateTopStaffPoach` doesn't copy `staff_transfers`' two club ids into `content`.

## 2026-11-12 (seventy-second pass) - the last two Pyramid News surfaces, and `PAPER` is gone

- **Commits:** this one, on `development`.
- **Stages touched:** `05_ui/output/patterns.md` (the Pyramid News section gained a subsection
  for the teaser modal and the Pulse card; the teletext-frame section gained the derived Fastext
  ink; the Pyramid Pulse three-state table now says the two modes look different on purpose),
  `05_ui/output/design-system.md` §5 (the gold bullet covers all three cards, and records that
  gold is on the live state only), `05_ui/output/compliance-review.md` (one of the two paper
  remnants is resolved; the other is now the last one and says so).
- **Why:** handoff `design_handoff_pyramid_news_teletext_2`. Diffed against v1 it is
  byte-identical plus two sections, so the work was §4 (the dashboard's new-edition teaser
  modal) and §5 (the Pyramid Pulse card) only - the overlay, the twelve page bodies and the CTA
  card had shipped on 2026-11-09 and were left alone.
- **Three things worth knowing beyond the re-skin:**
  - **`PAPER` is deleted**, and `designSystemSource.test.ts` dropped `ClubDashboard.tsx` from
    `PALETTE_FILES` in the same change. That removal is the guard, not a tidy-up: the file's
    seven hexes were exempt and its zero hexes are now counted, and those rules assert
    `count === baseline` in BOTH directions.
  - **A Pulse row deep-links to its own page**, which is the first time anything opens the
    reader off P400. `PulseRow` gained `pageIndex` (the page's index in the edition, never the
    row's own position - the rows are ordered and the pages are not) and `clubId` (from
    `badgeClubId`, so BLOCKBUSTER draws a blank badge rather than guessing).
  - **A Fastext key's ink is now derived from its fill**, in `teletextLayout.ts` rather than as
    a prop, so `designSystem.test.ts` can assert the pairing for every fill. A prop could not
    have been tested.
- **Also fixed, outside the handoff:** `app/pyramid/archive.tsx`'s half-converted sepia header,
  which `compliance-review.md` had flagged as the second of two paper remnants and which would
  otherwise have been the last one left. Eight literals to tokens, so the `rawHex` baseline
  came down 91 → 83. Both of that section's remnants are now closed.
- Recorded rather than fixed: `src/utils/pyramidPulse.ts` still returns hardcoded English row
  labels, named in `compliance-review.md`.

## 2026-11-11 (seventy-first pass) - a gameplay device checklist for what is on `dev`

- **Commits:** this one. Doc only; no source changed.
- **Stages touched:** `06_documentation/output/index.md` - a row for the new
  `docs/device-test-dev-ota445.md`.
- **Why:** `src/db/drizzle/DEVICE_TEST_PLAN.md` is database/perf-scoped with its own P/D probe
  numbering and has no section for simulation behaviour, so the youth/NPC/i18n work merged to
  `dev` on 2026-11-11 had no device plan at all. This is that plan, ordered by value per minute
  on the device rather than by size of change.
- ⚠️ **It was already partly stale when committed** and says so in its own header: `dev` moved
  within the hour (the foreign-pool fix, the silent-decision fix, a pending-intake index and
  migration `0018`), and `master` has since taken a merge too. Two of those commits land on
  ground the plan covers - `overlayMessaging.ts`, which its §3 depends on, and the migration,
  which wants the A1/A2 install checks the plan has no section for. Both are named in it.

## 2026-11-11 (seventieth pass) - the foreign pool stopped stranding players

- **Commits:** `05e980b1` on `development`.
- **Stages touched:** `07_synthesis/output/game-mechanics.md` (§10 register);
  `01_overview/output/environment.md` + the `CLAUDE.md` mirror.
- **Why:** a device CHECKS run FAILED `Every player is in exactly one pool` with **395
  UNEXPLAINED** immediately after an end-of-season, on a save that had read 0 an hour earlier.
  Cause: `populateScoutCache` wiped last season's `player_foreign_transfer` rows and left their
  `players` rows in no pool at all. Long-standing - that line last changed 2026-10-11 in a
  mechanical refactor - and almost certainly the real source of D13's October "190 stranded
  players", whose recorded fix closed the RELEASE path only.
- **The non-obvious half:** the pool is hard season-scoped (`eq(season, ?)` in both the query and
  the count), so NOT deleting is not enough - entries have to be CARRIED FORWARD or they survive
  invisibly. `carryForwardForeignTransferPool` does that; the rollover then tops up the shortfall
  against `config.foreignTransferPoolTarget` (400) instead of refetching ~600 every year.
- ⚠️ **Not retroactive.** Already-stranded players have no pointer row, so nothing tells them
  from a genuine release; the always-run recovery seed sweeps them into free agency.
- **Also:** the `dof_signing` confirmation captioned EVERY completed signing "MANAGER: PASS" -
  the metadata carried no manager fields while the overlay derived `isSigning` from
  `=== 'sign'`, so an absent verdict read as a rejection. Harmless while the manager held a veto;
  misleading once dissent became real.
- **Verified:** `npx tsc --noEmit` zero errors; `npx jest` **553 suites / 9,353 tests** green,
  equal to `npx jest --listTests | wc -l`.
- **VERIFIED on device, 2026-11-11, OTA 448.** A real end-of-season rollover on the mature save
  that exposed it: `Every player is in exactly one pool` **PASS, no players outside the
  partition** (was 395 UNEXPLAINED on the same save and the same rollover under the old build),
  `players` **flat at 4,103** (the old build added 562), foreign pool **515** carried forward,
  and `player_foreign_transfer.carryForward` present in the write log so the new path genuinely
  ran. Note 515 > the 400 target: the target is a FLOOR for topping up, not a cap - the pool
  drains through signings and only refetches below it.


## 2026-11-11 (sixty-ninth pass) - overlay suppression, and the pending-intake index

- **Commits:** `8f6c85d7`, `8e83bc6b` on `development`.
- **Stages touched:** `04_interfaces/output/services.md` (new "Overlay suppression" section);
  `01_overview/output/environment.md` + the `CLAUDE.md` mirror (green bar).
- **Why:** reported from device play - the DOF's proposals were going straight to the inbox and
  the owner never saw them. Suppression keys on the BROAD category, so a "send to inbox" tick on
  a routine signing confirmation silenced the proposals too. `requiresResponse` blocks deletion,
  never display. An invariant test derived from the emitters caught a third case,
  `owner_mandate_due`, which can block the season start.
- **Also:** `players.pending_intake_club_id` indexed, PARTIALLY. The plain index was harmful -
  the market search filters that column `IS NULL` and sorts by ability, and the planner preferred
  the new index over `idx_players_current_ability`, costing a temp B-tree on a hot read (caught by
  `indexWriteCost.test.ts`'s B3). A partial index on `IS NOT NULL` is unusable for an `IS NULL`
  query, so it is invisible there while still serving the badge read.
- **Measured on device, and it refuted a hypothesis:** D11 commit latency is **1.58ms mean**, with
  `synchronous=NORMAL` only 4.6% faster - far below the 30% bar. So the multi-hundred-ms exec and
  queue timings in CHECKS are **JS-starvation victims, not causes**, the same conclusion already
  reached for the ~8.5s `store_state.set` sightings. Do not re-theorise about fsync.
- **Open:** the menu-snap stall is JS-side (frames clean at 17ms throughout) and splits into two
  populations - post-advance with a deep write queue, and a recurring 120-260ms one with queue 0
  during ordinary play. The second is what delays a menu press. Not yet attributed.
  ⚠️ **The stall probe counts BACKGROUND time as a stall** (a `setInterval` drift sampler and a
  frame callback, both stopped while backgrounded), so readings like "JS 400,873ms" are artefacts
  and the WORST JS LAG tile is unreliable. Discard samples spanning an AppState change before
  trusting it.
- **Verified:** `npx tsc --noEmit` zero errors; `npx jest` **553 suites / 9,349 tests** green,
  equal to `npx jest --listTests | wc -l`; `npm run db:verify-baseline` OK;
  `npx tsx scripts/i18n/audit-tokens.ts` 0 mismatches.

## 2026-11-11 (sixty-eighth pass) - docs/drizzlemigration -> docs/drizzle

- **Commits:** working tree on `development`; follows `21523496`.
- **Stages touched:** `06_documentation/output/index.md` (the section heading plus 12 row
  citations, and a note explaining the rename to a cold reader);
  `07_synthesis/output/current-focus.md` (register items 3, 4 and 5 rewritten - 3 and 4 were my
  own B1c/B3 work and had gone stale, 5 is Slice 4); `03_data/output/migrations.md`,
  `03_data/output/schema.md`, and 5 pointers in this file.
- **What moved:** `git mv docs/drizzlemigration docs/drizzle`, clean rename detection on all 7
  files. **31 references across 12 files**, 4 in source (`worldStore.ts`,
  `playerClubRepository.ts`, `diagnostics.ts`, `clearAllClubDataRealSqlite.test.ts`) - all
  comments, so nothing executable pointed at the old path. The old register line said "15+
  inbound citations, 8 in source": under on references, over on source.
- ⚠️ **Earlier entries in THIS file had their paths rewritten too.** They are pointers to
  documents that still exist, so rewriting keeps them resolvable - but it does mean a historical
  entry now names a path that did not exist on the day it was written. The note at the top of
  `06_documentation`'s `docs/drizzle/` section explains that.
- **Two of Slice 4's three parts were already done** when the register line was written:
  `tribal-knowledge.md` Q4 item 8 has declared Phase 2 complete, in bold, since 2026-10-11. Only
  the 24-row staleness register remains, and it should NOT be landed as drafted - see the
  register entry for the false claim it contained.

## 2026-11-11 (sixty-seventh pass) - the unbounded academy nag, and a guard for the defect class

- **Commits:** working tree on `development`; follows the other session's `9b13ff6d`.
- **Stages touched:** `07_synthesis/output/game-mechanics.md` - rule 0 gains the structural
  guard; §5 gains "The owner's promotion prompt".
- **Why:**
  1. §11g's promotion prompt used a per-WEEK id on a weekly loop with no age ceiling, so an
     owner who never answered got one message per eligible youth per week forever. Made
     stable. It also carried only `metadata.playerId` while `purgeForPlayer` matches
     `entityId` - so it was unpurgeable and stranded once its subject left. `entityId` now
     set, and `emitOverlayMessage` forwards it (it did not before, so the call site could not
     have set it even deliberately).
  2. `tierScaledThresholds.test.ts` - the structural guard recommended after three instances
     of "absolute threshold vs tier-scaled quantity" in a month. Nine files, comment-stripped,
     two reasoned allowlist entries, and a case that feeds it the real lines from all three
     shipped bugs so the pattern cannot silently stop working. Verified against an injected
     offender end to end, not just at the regex level.
  3. It found one live case: `assessScoutedPlayer`'s `potential >= 70` +5 bonus, unreachable
     below the top tiers. Now mirrors the `tierAbilityBaseline` line above it.
- **Verified:** `npx tsc --noEmit` zero errors; `npx jest` **551 suites / 9,319 tests** green,
  equal to `npx jest --listTests | wc -l`.

## 2026-11-11 (sixty-sixth pass) - the DOF pass's follow-ups, items 4-9

- **Commits:** `da971ee6`, `959e8440` on `development`.
- **Stages touched:** `07_synthesis/output/game-mechanics.md` (§10 register: the chairman /
  facility-manager row is now FIXED, and the two tactics reads recorded as the deliberate
  exception); `04_interfaces/output/services.md` (`dofWageBillThresholdPct`, the pass-reason
  taxonomy, why the transfer window was left alone); `01_overview/output/environment.md` + the
  `CLAUDE.md` mirror. Also `locales/en/README.md`, which is not a stage.
- **Why:** owner asked for the nine open items to be worked through. The substantive one was
  that the truthy-read delegation bug was never DOF-specific - five `chairmanAuto*` duties and
  `facilityManagerAutoRepair` had it identically, so a chairman hired mid-game did nothing.
- **Two i18n traps recorded in `locales/en/README.md`,** both invisible where you make them:
  `.one`/`.other` are reserved leaf names (`plural.test.ts` turns any `<base>.other` into half
  of a plural pair), and a dynamically-built key is unreachable to `audit-tokens.ts`, so it needs
  an exported `as const` token list plus a test that the catalog covers it.
- **Left deliberately undone:** the two tactics flag READS, because delegating them overrides an
  explicit ongoing owner choice (the manager reverts the formation set in the Tactics screen) and
  flipping them would undo user selections on existing saves. Seeded at hire, not flipped.
- **Verified:** `npx tsc --noEmit` zero errors; `npx jest` **549 suites / 9,300 tests** green,
  equal to `npx jest --listTests | wc -l`; `npm run db:verify-baseline` OK;
  `npx tsx scripts/i18n/audit-tokens.ts` 0 mismatches.

## 2026-11-11 (sixty-fifth pass) - DOF proposal volume

- **Commits:** `f28f0aa2`, `3ae6f76f`, `f893a73b`, `9461486d` on `development`.
- **Stages touched:**
  - `07_synthesis/output/game-mechanics.md` - §7 feed-rate claim CORRECTED (the "3 players per
    scout per tick" was the watch cap, not the find rate); new §9b on the AMP club's own
    recruitment; four rows added to §10's register.
  - `04_interfaces/output/services.md` - new "DOF proposal volume" section: the twelve config
    fields, the two new repository functions, the signature changes.
  - `03_data/output/schema.md` - `scout_shortlist`'s two tiers and `passed_until_week`.
  - `03_data/output/migrations.md` - new "Verify after every schema touch" section.
  - `01_overview/output/environment.md` + the `CLAUDE.md` mirror - green bar.
- **Why:** owner asked for a full review of the DOF/manager/scout transfer flow aimed at
  increasing signing ATTEMPTS, and chose the advisory path - more proposals to approve, not more
  autonomous signings. Low volume turned out to be three compounding layers plus four bugs, the
  worst of which was that `dofAutoSignPlayers` and `dofAutoAssignScouts` were read as truthy
  while `marketStore.hireCoach` seeds neither: **a DOF hired mid-game through Office -> Hire did
  no recruiting and no scouting at all, silently, for the rest of the save.** The dominant
  structural limiter was attrition - four paths deleted shortlist entries against a pool
  refilling at 0.6 players per scout-week.
- **Left deliberately undone:** the same truthy-read bug affects five `chairmanAuto*` duties and
  `facilityManagerAutoRepair`. Recorded in §10's register rather than fixed - different feature
  area, and the owner asked about DOF/manager/scout.
- **Verified:** `npx tsc --noEmit` zero errors; `npx jest` **548 suites / 9,284 tests** green,
  equal to `npx jest --listTests | wc -l`; `npm run db:verify-baseline` OK (it caught a column
  wrongly added to `CREATE_SCHEMA`, which the jest suite did not);
  `npx tsx scripts/i18n/audit-tokens.ts` 0 mismatches.

## 2026-11-10 (sixty-fourth pass) - register item B1c, reinstatement

- **Commits:** working tree on `development`; follows `c454eab1`.
- **Stages touched:** `07_synthesis/output/game-mechanics.md` §9 - the "a lapse cannot be
  revisited" warning replaced with the reinstatement rule.
- **Why:** owner called B1c a big issue and asked for the decision to be changeable. A lapse
  was frozen against a squad snapshot up to RENEWAL_WINDOW_WEEKS (25) old, so a club that
  flagged four players in week 10 still lost all four in week 35. New `decideReinstatements`
  reconsiders on NEED only (positional cover, then headcount) and never on merit, which is
  what stops it thrashing. The positional axis is the one nothing else covered: expiry's
  squad floor is pure headcount, so a 25-man squad losing its only keeper sailed through it.
- **Verified:** `npx tsc --noEmit` zero errors; `npx jest` **545 suites / 9,244 tests** green,
  equal to `npx jest --listTests | wc -l`.

## 2026-11-10 (sixty-third pass) - register item B3, the seasonal cull

- **Commits:** working tree on `development` (uncommitted at time of writing); follows `efd5f8a5`.
- **Stages touched:** `07_synthesis/output/game-mechanics.md` §9 - the "25% cull is still
  unguarded" warning replaced with the fix and its three faults.
- **Why:** B3 was the **third** instance in a month of an absolute threshold against a
  tier-scaled quantity, after `EXTEND_SCORE_THRESHOLD` and `ManagerBrain.assessYouthPlayer`.
  `NPC_THINNING_OVR_CEILING = 70` protected 38% of a tier-1 squad and nobody in tiers 2-8, so
  the cull took 25.0% of a tier-8 first team per season against 9.4% of a tier-1 one. Also
  added the squad floor the pass never had, named the inline 0.25, deleted a dead accumulator
  and corrected a comment that described a different mechanism entirely.
- **Verified:** `npx tsc --noEmit` zero errors; `npx jest` **544 suites / 9,225 tests** green.

## 2026-11-10 (sixty-second pass) - the youth pipeline, four defects

- **Commits:** working tree on `development` (uncommitted at time of writing).
- **Stages touched:** `07_synthesis/output/game-mechanics.md` - §5 Youth rewritten around the
  intake-volume parity rule, a new "promote/release verdict at 16" subsection with the
  before/after measurement, and a new "academy leavers are claimable again" subsection; §9
  gains "How long a free agent survives unsigned", which this file had no home for at all.
- **Why:** the owner reported NPC clubs appearing to sign no youth and the pyramid's players
  draining. Four separate defects, all now fixed in app code:
  1. NPC intake was halved (`ceil(poolSize / 2)`), i.e. ONE prospect per club per season at the
     default academy level against the AMP club's 15 at level 10.
  2. `ManagerBrain.assessYouthPlayer` scored raw potential against an absolute 50 with a
     reputation-derived systematic bias, so **local- and regional-reputation academies promoted
     0.0% of their intake** - measured, 200k samples - including the user's own club at its
     starting reputation of 0.
  3. `rejectIntakePlayer` / `releaseYouthPlayer` never wrote `entered_free_agency_season`
     (`NOT NULL DEFAULT 0`), so every academy leaver was force-retired at the first season
     transition from season 3 onward. Plus a new under-25 age floor on that rule.
  4. No NPC path could sign an under-16 free agent, making the academy flow one-way into
     oblivion. `generateNpcYouthIntake` now draws academy leavers as a second supply.
- **Verified:** `npx tsc --noEmit` zero errors; `npx jest` **543 suites / 9,206 tests** green,
  equal to `npx jest --listTests | wc -l`.

## 2026-11-10 (sixty-first pass) - the advance's write cost, measured on device and cut 5x, then frozen

- **Commits:** `3493208f`, `1fca6dc6`, `1eb9e01f`, `1894d6df`, `fe6e7949`, `daeb573d`,
  `c852cbe9`, `f461e94b` plus green-bar carries, and `ea79c698` (the OTA-identity note) on
  `development`; all but the last merged out to `dev` (`1667263a` = **OTA 439**).
  **Not on `master` — `dev` is 290 commits ahead of it.**
- **Stages touched:** `01_overview/output/environment.md` (new "Identifying which OTA a device
  is running" section; green bar re-measured twice and the table given `dev`'s four-column
  shape on both branches), `01_overview/output/tribal-knowledge.md` (**a fourth hard DB rule**,
  plus the ported-SET correction), `02_architecture/output/structure.md` (engine count
  re-verified), `03_data/output/state.md` (**new "Write batching" section**; staff lifecycle
  corrected), `03_data/output/schema.md` (ported-SET correction),
  `04_interfaces/output/services.md` (the free-agent `staff`-row claim qualified),
  `06_documentation/output/index.md` (two superseded device figures),
  `07_synthesis/output/current-focus.md` (**new 2026-11-10 entry — the resume point**; the P19
  figures annotated as superseded), `07_synthesis/output/game-mechanics.md` (§9's renewal
  brake and release-paths table brought up to date), shared (this file, `token-savings.md`,
  `usage-savings-log.md`). `CLAUDE.md` re-mirrored for the new BINDING rule and given an
  OTA-identity pointer.
- **Code:** six write-batch envelopes (world, squad, `store_state`, staff, `club_state`,
  bonds); two quadratic `bootstrap.ts` subscribers deleted; `marketStore` content signature +
  `MARKET_STAFF_PERSIST_LIMIT`; `batchUpsertStats` collapsed to chunked multi-row;
  `hashString` extracted to a leaf module; per-seed timing in `runPendingSeeds` surfaced in
  CHECKS. New suites: `staffWriteBatch`, `flushClubStateToDB`, `bondWriteBatch`, plus stats
  equivalence cases. `tsc` clean; **543 suites / 9,170 tests** on `development`,
  **565 / 9,575** on the `dev` merge result, `--listTests` agreeing with both.

**Measured on device, one session, before and after:** `1,146 writes / 32,353 rows` →
`199 / 7,753`. `player_season_stats.batchUpsert` 4,787ms → **260ms**. `staff` table
6.5 MB / 10,605 rows → **1.9 MB / 2,403**. `staff.upsertMember` 498 calls → 0.
`player_player_bonds.upsert` 36 → 0 during the tick. A post-restore boot's 100 SECONDS of
seeds turned out to be the one-time lane re-running (checkpoints are export-excluded, defect
18) and is now attributable per seed.

**Four things worth carrying forward, none of them an optimisation:**

1. **A new BINDING rule, the first that is about cost rather than correctness** — never yield
   inside a write transaction during the tick. It made one call measure 8,775 / 5,352 /
   36,621 ms on identical code. It earned rule status because of how it hides: a yield changes
   no statement, so every budget and every test passed throughout.
2. **One run's TIMINGS are not evidence.** That same 7x spread was three sessions of the same
   code. Counts and row counts are structural and fine from one run. Recorded in
   `environment.md` alongside how the OTA build number on the splash moves — both because both
   were got wrong in-session, a device report read as containing a change it predated.
3. **The "quadratic subscriber" shape.** Two store-wide `subscribe` listeners wrote every
   member on every change, because a store-wide listener cannot tell which member changed.
   Both were fully redundant with the stores' own setter write-through. Recorded in
   `state.md` with absence-asserting tests, since what is protected is the absence of code.
4. **A staleness register can be wrong too.** A draft register claimed
   `portedRepositoryArchitecture.test.ts` "would not fail if a repository fell off the ported
   list". It would — `:460` compares the filesystem-derived set to the hand-kept list by set
   equality. Both `tribal-knowledge.md` and `schema.md` said "asserts the count", which reads
   weaker than the test is; corrected by reading it rather than by trusting the register. Same
   pass re-counted `src/engine/` at **99**, which is what `structure.md` already said and which
   the register had wrong as 103.

**The gap this phase did not close, and the first thing to do on resuming:** success was
defined as *seconds saved per tick on device*, and the **wall-clock duration of an advance was
never measured, before or after.** Everything above is write counts and statement counts —
proxies. The `'Week Advanced'` event already carries `criticalMs`; read it before treating any
of this as a win. Full resume brief, including the `players.upsertWithForeign` plan and the
`VACUUM` case (now 13.7 MB of a 38.4 MB file), is the 2026-11-10 entry in
`07_synthesis/output/current-focus.md`.

**Frozen deliberately, not finished** — the owner called it once returns flattened, to move to
device testing. Nothing below the freeze line is blocked.

## 2026-11-10 (sixtieth pass) - NPC contracts all expired inside two years, and game-mechanics had no section for any of it

> Authored on `development` as the fifty-second pass and **renumbered on this merge** —
> pass numbers are branch-local; `dev` carries passes `development` does not.
- **Commits:** `b2af986b` (debug wage bill), `1f1e0750` (contract seeding) and `c24e23c8`
  (this documentation) on `development`; merged out to `dev`. Not yet on `master`.
- **Stages touched:** `07_synthesis/output/game-mechanics.md` (**new §9 "NPC squad management"**;
  §8 corrected and extended; §10's register gained six rows; §10/§11 renumbered), shared
  (`last-sync.md`, `token-savings.md`, `usage-savings-log.md`).
- **Code:** `worldStore.buildWorldLeagueClubs` contract seeding widened;
  `npcClubDebugAssessment.assessNpcFinance` now delegates to `computeNpcWageBill`;
  `NpcClubDashboard` rows updated. New suite `worldStore.contractLengths.test.ts` (6 tests).
  `tsc` clean; **531 suites / 9,039 tests** on `development`, **553 / 9,444** on the `dev` merge
  result, `--listTests` agreeing with both.

**What landed, and why it was the churn.** NPC contracts were seeded
`enrollmentEndWeek = 1 + (idHash % 104)` — a uniform 1–104 weeks, so **no NPC contract in a fresh
world was longer than two years** and the median was about one. The stagger worked; the problem
was that the whole distribution sat inside the window `processNpcContractExpiry` harvests every
four weeks, so the lower pyramid shed and re-signed its squad continuously from week 1. Now
53–260 weeks: **75.2% over two years, median 3.0 years, none under a season**, measured over
20,000 ids rather than reasoned about. Contracts are additionally capped by remaining career, the
ceiling `pickExtensionYears` already applied on renewal.

**Three findings worth carrying forward:**

- **⚠️ `game-mechanics.md` had NO section on the NPC squad/transfer loop at all** — §3 covered NPC
  injuries, §5 NPC youth, §8 NPC sponsor pricing, and the release/renewal/signing cycle was
  absent. That gap is why "why do NPC clubs churn?" had to be answered from source, and why two
  plausible hypotheses (the 2026-11-06 wage fix; the coach-ratio exit) were both wrong before the
  code corrected them. **The coach-ratio exit is AMP-only and releases one player per two ticks
  maximum; no NPC coach-ratio rule exists anywhere.** The section now exists, with the invariant
  that matters most stated first: **no NPC release path reads money.** Solvency produces listings
  and refused signings, never a release — so NPC churn cannot be fixed by tuning finances.
- **The second half of the fix is still open and is the same old shape.**
  `EXTEND_SCORE_THRESHOLD = 55` is absolute while abilities are tier-scaled (tier 8 = 5–15), so a
  **tier-8 squad's maximum possible renewal score is 45** and the bottom of the pyramid renews
  nobody beyond `mustKeep`. Recorded in §9 as live and unfixed. Its test cannot catch it: the
  fixture is written `overallRating: EXTEND_SCORE_THRESHOLD - 10`, so it **passes at any threshold
  value**, and every case sits at tier-1/2 abilities. A fixture keyed to the constant under test is
  the wage-test lesson one layer deeper.
- **The shifted-vs-raw `dateOfBirth` distinction is load-bearing and nearly cost a regression.**
  The new career cap needs the age the game will actually see, which comes from
  `normalized.dateOfBirth` (the SHIFTED dob, the one that gets stored). The appearance call two
  lines below deliberately uses the RAW `p.dateOfBirth`. I reused one age for both, then reverted
  it — conflating them would have silently changed every generated NPC face. Both call sites now
  say which they use and why.

**Also corrected while in the file:** §8 claimed `computeMatchdayRevenue` is the single entry
point "so their figures cannot diverge". True of the money, **false of the displayed crowd** —
`SimulationService` computes its own attendance with ±8% jitter plus U16, fan-event and narrative
`attendance_bonus` uplifts, and that is what the match report, the stadium chart, the
record-attendance check and next season's season-ticket booking read, while the ledger charges the
jitter-free expected figure. **Narrative attendance bonuses raise the displayed crowd and earn
nothing**, and no test covers that path. Also recorded: **fanbase is a CAP on attendance, not a
driver** (it enters only as `min(uncapped, fanCount)` and essentially never binds), and NPC grounds
are passed synthetic condition 100 with no construction closures and no fanbase cap, so all three
penalties fall on the player alone.

**Six rows added to the register, five of them dead config:** the three `npcWeeklyIncome*` fields
(the obvious NPC income dial — two are threaded into `computeNpcWeeklyFinances` and the body never
references `config`), `npcSponsorChancePerWeek`/`npcSponsorBoostAmount`, and
`npcBaseTicketPrice`/`npcAttendanceBase`/`npcAttendancePerReputation`, whose doc comments describe
a linear `500 + 20 × reputation` attendance model the code does not implement. **Eight dead NPC
config fields in total — editing any of them in the admin panel changes nothing.** Plus
`matchdayIncome`'s two zero-caller override hooks and `processNpcContractExpiry`'s discarded
`{ expiredCount }`, which is why the dominant release path is currently unmeasurable.

**Still open from this work:** making releases observable (the `expiredCount` discard), the
tier-scaled renewal threshold, a squad-minimum guard on expiry, and the AMP P&L projection gaps
(`win_bonus` charged weekly and never projected; `season_tax`; a `club.balance * 100` in the
bankruptcy path that contradicts the binding rule). Full plan and ordering in the session plan;
`07_synthesis/output/current-focus.md` has not yet been given an entry for this phase.

## 2026-11-09 (fifty-first pass) - the NPC club profile became a hub and seven pages

## 2026-11-09 (fifty-ninth pass) - RANDOM CLUB, and a fourth refusal of `maxLandPence`

> Authored on `new-game-save` as the fifty-fifth pass and **renumbered on this merge** —
> pass numbers are branch-local; `dev` carries passes `new-game-save` does not.

- **Commits:** `67e59799`..`049201ef` (7) on `new-game-save`.
- **Stages touched:** `07_synthesis/output/current-focus.md` (new section),
  `05_ui/output/compliance-review.md` (new §9c), `04_interfaces/output/routes.md`
  (the fourth `maxLandPence` refusal).
- **The handoff:** `assets/Components/design_handoff_random_club/` — a one-tap route through the
  whole v3 walk (budget overlay -> stepped loader -> a review mode where every site and the club
  funding stay editable until START GAME), plus a flow-wide `MoneyStepper` change to six buttons.
  All seven acceptance items done. **On `new-game-save`: 549 suites / 9,283 tests.** **On `dev`
  after this merge, measured: 550 suites / 9,421 tests** — dev carries work the other branches do
  not, so the figures differ by branch by design, and `jest --listTests` was confirmed equal to
  the suite count on both. Catalog 4663 -> 4714 on `new-game-save`, **4803 -> 4854 on `dev`** (no
  overlap). `tsc` clean and `audit-tokens` zero/zero on both.
- **The host assumption it could not avoid:** RANDOMISE step 1 asks for "countries with a
  for-sale town inside the land budget", which the prototype evaluates because its sample data
  holds every country at once. The app holds exactly one. `useLandFlow.findLand` answers it with
  one page per country under the EXISTING `sort=price`, because ascending price with the unpriced
  sentinel last makes page one a country's cheapest land. **Three of the four `maxLandPence`
  refusals have now been met by using the sort the endpoint already has** — that is the pattern,
  not the instance.
- **What the tests found that review would not have:** `hire`/`role` have their own `primaryOf`
  cases and so never reached a review clause in the switch's `default` (a boardroom tile walked
  the player onward through the flow); and `clubEconomy` takes the funding maximum from
  `ownerLeft`, which under review sees nothing charged — so funding offered money the drafted
  build was about to spend, and START GAME would have been refused for insufficient credit.
- **Two guards fired and both earned their keep.** `setupChromeDesign.test.ts`'s self-guard caught
  the two new components, and its `DELTA_ROW` regex broke in the one direction that matters: the
  negative sweep passed while the POSITIVE control failed, so the guard would have reported the
  one file it exists to bless as the one file that no longer builds a delta row.
- **No new BINDING rule**, so `tribal-knowledge.md` and its `CLAUDE.md` mirror are untouched.
- **Deliberately not written to `03_data/output/state.md`:** the setup reducer's `Draft` gained
  `rndReview` / `rndCommitting`, but that stage's charter is persistence and store state and the
  `Draft` is neither persisted nor a store. The two fields are documented at their declaration and
  in `current-focus.md`.
- ⚠️ **Not device-verified**, and one edge is knowingly unresolved: a *claim* failure after FOUND
  CLUB falls to the existing `unfound` recovery, which returns the player to the LAND step rather
  than the dialog.

## 2026-11-09 (fifty-eighth pass) - the NPC club profile became a hub and seven pages

> Authored on `development` as the fifty-first pass and **renumbered on this merge** —
> pass numbers are branch-local; `dev` carries passes `development` does not.

- **Commits:** `2aba0849`..`9a6f626e` (10) on `development`, from `40a574e3`. Code + docs.
- **Stages touched:** `02_architecture/output/structure.md` (new section for
  `src/components/club-cards/` and `src/screens/club/`; the route list),
  `05_ui/output/navigation.md` (the route tree, and the route-walker warning),
  `05_ui/output/patterns.md` (new "club cards are shared" section + the gold audit; two stale
  `app/club/[id].tsx` citations fixed), shared (`last-sync.md`, `token-savings.md`).
- **What landed.** `app/club/[id].tsx` (2,274 lines, five tabs) → `app/club/[id]/`: a layout,
  a hub, seven drill-down pages. Full report:
  `docs/design-briefs/npc-club-profile-integration.md`.
- **The documentation half worth noting.** Two `.context` citations named a file that no longer
  exists, and both were found by grepping for the deleted path rather than by reading the
  stages — which is the cheap check after any route moves: `grep -rn '<old path>' .context/`.
- **Three guards earned their keep, and all three are the same lesson.**
  `stadiumV3.test.ts`'s `SITES` list failed TWICE as the stadium band moved between files;
  `profileRowRoutes.test.ts` and `bondHighlights.test.ts` each hold a verbatim copy of a
  `dynamicRoutes()` helper that globbed `app/<dir>/[id].tsx` and so went blind to `/club` the
  moment it became a directory. A source-reading guard protects exactly the files it names —
  and a DUPLICATED one has to be fixed in every copy.
- **The cohesion guard grew by three files**, including the player's own club screen, which had
  never been covered despite rendering cohesion through the same shared card.
- **Green bar moved on `development`: 527 suites / 8,947 tests → 528 / 9,016** (one suite
  added, 69 tests). Note `01_overview/output/environment.md` recorded 8,878 before this pass;
  the real figure at `40a574e3` was **8,947**, so that number was stale again by 69. Corrected
  there. **On `dev` after this merge, measured: 547 suites / 9,339 tests** — dev carries work
  the other branches do not, so the figures differ by branch by design. No delta is claimed for
  `dev`, because its PRE-merge figure is recorded two ways (545 / 9,175 in `environment.md`,
  546 / 9,201 in this file's 2026-11-08 entry) and neither was re-measured before merging; the
  post-merge number above is the measured one.
- **Catalog: +94 keys** (4,474 → 4,568 on `development`; **4,709 → 4,803 on `dev`**, no
  overlap), all via `i18n:apply-overrides --only ... --write`, additive.

## 2026-11-06 (fiftieth pass) - three stale recorded numbers, and the one that had no tracked home
## 2026-11-08 (fifty-seventh pass) - measured filter bands, and NPC land from the world pack

> Authored on `new-game-save` as the fifty-fourth pass and **renumbered on this merge** —
> pass numbers are branch-local; `dev` carries passes `new-game-save` does not.
## 2026-11-09 (fifty-fifth pass) - RANDOM CLUB, and a fourth refusal of `maxLandPence`

- **Commits:** `67e59799`, `bc4fc409`, `de8e5f3c`, `3f860c87` on `new-game-save`.
- **Stages touched:** `07_synthesis/output/current-focus.md` (new section),
  `05_ui/output/compliance-review.md` (new §9c), `04_interfaces/output/routes.md`
  (the fourth `maxLandPence` refusal).
- **The handoff:** `assets/Components/design_handoff_random_club/` — a one-tap route through the
  whole v3 walk (budget overlay -> stepped loader -> a review mode where every site and the club
  funding stay editable until START GAME), plus a flow-wide `MoneyStepper` change to six buttons.
  All seven acceptance items done. 549 suites / **9,276 tests**, `tsc` clean, catalog
  4663 -> **4714**, `audit-tokens` zero/zero.
- **The host assumption it could not avoid:** RANDOMISE step 1 asks for "countries with a
  for-sale town inside the land budget", which the prototype evaluates because its sample data
  holds every country at once. The app holds exactly one. `useLandFlow.findLand` answers it with
  one page per country under the EXISTING `sort=price`, because ascending price with the unpriced
  sentinel last makes page one a country's cheapest land. **Three of the four `maxLandPence`
  refusals have now been met by using the sort the endpoint already has** — that is the pattern,
  not the instance.
- **What the tests found that review would not have:** `hire`/`role` have their own `primaryOf`
  cases and so never reached a review clause in the switch's `default` (a boardroom tile walked
  the player onward through the flow); and `clubEconomy` takes the funding maximum from
  `ownerLeft`, which under review sees nothing charged — so funding offered money the drafted
  build was about to spend, and START GAME would have been refused for insufficient credit.
- **Two guards fired and both earned their keep.** `setupChromeDesign.test.ts`'s self-guard caught
  the two new components, and its `DELTA_ROW` regex broke in the one direction that matters: the
  negative sweep passed while the POSITIVE control failed, so the guard would have reported the
  one file it exists to bless as the one file that no longer builds a delta row.
- **No new BINDING rule**, so `tribal-knowledge.md` and its `CLAUDE.md` mirror are untouched.
- **Deliberately not written to `03_data/output/state.md`:** the setup reducer's `Draft` gained
  `rndReview` / `rndCommitting`, but that stage's charter is persistence and store state and the
  `Draft` is neither persisted nor a store. The two fields are documented at their declaration and
  in `current-focus.md`.
- ⚠️ **Not device-verified**, and one edge is knowingly unresolved: a *claim* failure after FOUND
  CLUB falls to the existing `unfound` recovery, which returns the player to the LAND step rather
  than the dialog.

## 2026-11-08 (fifty-fourth pass) - measured filter bands, and NPC land from the world pack

- **Commits:** `68b56a2a`, `35606460` on `new-game-save`.
- **The correction worth reading:** the LAND filter bands shipped as hardcoded prototype values
  and were useless on the first country nobody had tried — Spain, where land is £4.5m against
  England-shaped `£150k/£300k` edges, so every priced town fell in one band. They are measured
  from the country now. **A constant that describes CONTENT rather than code is a bug waiting
  for a different dataset**; neither types, tests nor a one-country device pass can see it,
  because the group renders perfectly and simply matches everything.
- **Stages touched:** `07_synthesis/output/current-focus.md` (both passes, and the open
  valuation decision), `03_data/output/schema.md` (**new** `world_clubs.land` section — the
  three meanings of its nulls, and why `valuePence` is not `landCostPence`).
- **Open decision, deliberately not taken:** NPC `land.valuePence` is stored but not fed into
  `computeClubValuation`. It would be a balance change, not plumbing — land would be ~98% of a
  top club's valuation and move investor offers, loan limits and scouting with it.
- **Counts:** 546 suites / 9,201 tests, catalog 4663.

## 2026-11-07 (fifty-sixth pass) - LAND filters, and twelve dropped style callbacks

> Authored on `new-game-save` as the fifty-third pass and **renumbered on this merge** —
> pass numbers are branch-local; `dev` carries passes `new-game-save` does not.
## 2026-11-07 (fifty-third pass) - LAND filters, and twelve dropped style callbacks

- **Commits:** `4658a8c0`, `d12d7aab`, `776e58aa` on `new-game-save`. The
  `design_handoff_land_filters` drop: a FILTERS panel on the LAND step, 10-at-a-time paging, the
  RANDOMISE button rendering with no border, and the rail printing `ngs.rail.…`.
- **Stages touched:** `05_ui/output/patterns.md` (**the most reusable finding** — the
  Pressable-style-callback guard only read the callback's literal text, so every offender that
  reached through `StyleSheet.create` was invisible to it; twelve live ones, all in
  new-game-setup), `05_ui/output/design-system.md` (`RandomButton`, `LandFilterPanel`),
  `05_ui/output/compliance-review.md` (**new** §9b — the gold taken and the gold refused),
  `04_interfaces/output/routes.md` (server-side land filtering refused a third time, in a new
  form; the app now walks `nextCursor` to the end), `07_synthesis/output/current-focus.md`,
  `01_overview/output/environment.md` (the green bar re-measured on `new-game-save`:
  **545 suites / 9,175 tests**, re-mirrored into `CLAUDE.md`), shared (this file,
  `usage-savings-log.md`).
- **Decisions worth not re-litigating:** the third chip group is PLOTS from `plotCount`, because
  no plot-size field exists anywhere; filtering is the client's, over a fully-walked country,
  because the server has no filter that does not hide un-valued towns; RANDOMISE does not clear
  the filters, it pins what it picks.
- **Device-verified 2026-11-07** (owner, dev channel: "very solid"), covering this pass's
  surfaces. The older v3/v3.1 Phase F checklist is separate and still open.

## 2026-11-07 (fifty-fifth pass) - club value counts the land and the real build spend

> Authored on `new-game-save` as the fifty-second pass and **renumbered on this merge** — pass
> numbers are branch-local; `dev` carries passes `new-game-save` does not.
## 2026-11-07 (fifty-second pass) - club value counts the land and the real build spend

- **Commit:** on `new-game-save`, on top of the v3.1 drop. Owner's ask: "club value should include
  land cost ... build spend determined from live facility config ... store land cost against club
  in database."
- **Stages touched:** `07_synthesis/output/game-mechanics.md` (**new** §8 "Club valuation — the one
  formula", plus §0 rule 7 on raw levels), `03_data/output/state.md` (`club.landCostPence`; the
  "four pence-valued fields" count fixed to five), `01_overview/output/tribal-knowledge.md` (money
  BINDING rule, re-mirrored into `CLAUDE.md`), `04_interfaces/output/services.md` (no server
  valuation; `generateNpcInvestorContracts` gained a templates param), shared (this file,
  `token-savings.md`).
- **Code:** `computeClubValuation` replaces `calculateClubValuation` — one definition taking an
  options object, returning a breakdown; the hook now CALLS it instead of restating the arithmetic.
  Facilities valued at `investedToLevel(baseCost, level)` from the live catalogue; land added as a
  stored `club.landCostPence`; scouts joined the staff term. New `utils/facilityCost.ts`. `tsc`
  clean; **541 suites / 9,104 tests**.

Three things worth carrying past this change:

- **The formula was written twice, verbatim, and pinned by nothing.** Four live money systems price
  off club value — the loan cap, investor buyout, scouting missions, investor offers — and it could
  be changed freely with the suite staying green. The first commit here was a characterisation test
  against the OLD formula, so the diff records exactly what moved. **Write that test before touching
  an unpinned formula, not after.**
- **A fixture richer OR poorer than reality is a test that cannot fail.** `npcContracts.test.ts`
  built its investor club with `facilities: {}`, so the facility term was 0 either way and the
  suite was structurally blind to a change that reprices every tier-1–3 NPC club. This is the same
  shape as the v3.1 `pickTown` fixture setting `claimable: true` on rows the endpoint never sends —
  **twice in two days.** When a test passes a change it should have caught, read the fixture.
- **"Grows with facility improvements" does not follow from book-cost valuation, and saying so was
  the useful part.** `investedToLevel`'s step equals `facilityUpgradeCost` exactly, so an upgrade
  moves cash −X and infra +X and club value stays FLAT. Under the old flat term it FELL by the
  difference, so this is still a large fix — but the owner asked for a rise, and the honest answer
  was to say it is neutral and explain where growth actually comes from (development, matchday
  income, reputation) rather than invent a multiplier with no catalogue behind it.

**Resolved in the same pass, owner's call:** scouting cost is a straight share of club value, so the
valuation change would have taken a new club's 4-week trip from £1,977 to £26,353. The rate moved
**0.1% → 0.01% per week**, putting it at £2,635 — and a maxed club's at £63,850 against £6,237.
A single rate cannot restore both ends; the early game was chosen deliberately, since that is where
cash is tight and the first mission matters. What is NOT fixed, and predates all of this: club
value includes `balance` at ×1, so banking cash still makes scouting dearer. Re-basing on the
weekly wage bill is the real answer and is a formula change, not a constant.

## 2026-11-06 (fifty-fourth pass) - three stale recorded numbers, and the one that had no tracked home

> Authored on `development` as the fiftieth pass and **renumbered on this merge** — pass
> numbers are branch-local; `dev` carries passes `development` does not.
> numbers are branch-local; `new-game-save` carries passes `development` does not.

- **Commit:** docs only, on `development`, propagated to `master`, `dev` and `new-game-save`.
- **Stages touched:** `01_overview/output/environment.md` (new "The green-master bar" section),
  `02_architecture/output/git-activity.md` (a stale citation), shared (`last-sync.md`,
  `token-savings.md`). No code.
- **What was wrong.** Three numbers, each stale in a different way:
  1. `token-savings.md` had been **partially** updated earlier the same day — `Everything` and
     two stage rows refreshed, the other five left at their 2026-11-03 values. All seven are now
     measured. **A partially-updated table is worse than a wholly stale one:** the total was
     correct while five of its parts were not, so the rows did not sum to it and nothing marked
     which were trustworthy. `05_ui` was understated by ~4,800 and `07_synthesis` by ~6,100.
  2. Two 2026-11-06 entries here still said "uncommitted at the time of writing" after the work
     had landed on four branches. Filled in with real SHAs — this file exists to tell a
     staleness check which commits have landed, so "uncommitted" is the one value that cannot
     serve that purpose.
  3. The **green-master bar** said 531 suites / 8,896 tests; the real figure was 527 / 8,878 on
     `master`/`development` and 539 / 9,071 on `dev`/`new-game-save`.
- **The finding worth carrying — the third one had no tracked home at all.** That paragraph
  lived *only* in `CLAUDE.md`, which is gitignored. It is exactly the fragility
  `../CONTEXT.md` recorded on 2026-10-08 for the BINDING rules ("rules owned solely by it
  reached nobody else and did not survive regeneration"), and it had quietly recurred for a
  different fact. It now lives in `01_overview/output/environment.md` with `CLAUDE.md` as a
  one-way mirror. **When a number in `CLAUDE.md` turns out to be wrong, check whether `.context/`
  owns it at all before correcting it — if it does not, that is the actual bug.**
  `02_architecture/output/git-activity.md` was citing the same paragraph as *"`CLAUDE.md`: 150
  jest suites pass"* — stale by 377 suites, and naming a gitignored file as the authority.
- **Why a stale count here is not cosmetic:** it cost real time this session. A correct full run
  (527 suites) looked *short* against the recorded 531, which prompted a check of
  `jest --listTests` to rule out silently-skipped suites. The bar now records the count per
  branch and says to verify the count rather than only the pass/fail line — which is the check
  that distinguishes the two cases.

## 2026-11-06 (fifty-third pass) - staff and scout wages were backend data the app never read, and the DoF could hire out of tier

> Authored on `development` as the forty-ninth pass and **renumbered on this merge** — `dev`
> carries passes `development` does not, so pass numbers are branch-local. Same convention
> this file already uses for migration renumbering.

- **Commit:** `56c7a7a3` (wages + DoF tier gate) and `bc06505b` (the four remaining
  wage sites), both on `development`, merged out to `master`, `dev` and `new-game-save`
  the same day.
- **Stages touched:** `03_data/output/schema.md` (the `tables/staff.ts` synthesis list — `salary`
  removed from it and corrected at length), `04_interfaces/output/routes.md` (the `market.ts`
  row — the four-calls-and-merge tier behaviour, and scout `weeklySalary`),
  `04_interfaces/output/services.md` (the staff auto-hire section — the tier gate), shared (this
  file, `token-savings.md`).
- **Code:** new `src/utils/staffWages.ts` (`resolveWorldStaffWagePence`,
  `fallbackScoutWeeklyWagePence`); `weeklySalary` added to `WorldStaff` and `RawScout` and now
  read in `market.ts`, `useInitFlow.ts`'s three staff/scout conversions, `worldStore.ts`'s
  world-pack builder, `StaffPoachingService.worldMemberSalaryPence`, and
  `npcFinances.generateNpcInvestorContracts`. New
  `src/utils/staffHiringGate.ts`, with `hireLogic.tierRestricted`, `HireScreen` and
  `DofStaffHiringService` all delegating to it. New `src/__tests__/utils/staffWages.test.ts`
  (9 tests) and 6 tier-gate cases appended to `DofStaffHiringService.test.ts`. `tsc` clean;
  **527 suites / 8,877 tests**, all passing.
- **The finding worth carrying:** **a field the backend has always sent can be missing from the
  app entirely, and nothing will say so.** `Staff::$weeklySalary` is serialised into *both*
  `GET /api/market/data` and every `buildStaffSnapshot` world-pack/starter payload, and has been
  for the life of the feature — but the app mapped it in exactly one file, so the whole
  world-pack path fell through to a role-blind `coachingAbility × 100` heuristic. A starting
  Chairman was on £70/wk against the £400–1,200/wk the identical person costs off the market.
  Two things hid it: the wire key (`weeklySalary`) differs from the app's field (`salary`), so
  the miss is an absent optional rather than a type error; and `WorldStaff.salary`'s own doc
  comment *asserted* the backend didn't send it, which is the form this kind of bug takes —
  a comment that was true once, outliving the fact. Four separate client formulas had grown in
  its place (`× 100` in two files, `× 150` in `npcFinances`, `× 300` for market scouts), none
  agreeing. **Three lessons:** when a doc comment claims the backend doesn't send something,
  grep the backend serializer rather than trusting it; no test anywhere asserted a wage, which
  is why a well-typed wrong number survived indefinitely; and the ordering in the resolver
  (`salary` before `weeklySalary`) is deliberate and load-bearing — severance and poach
  compensation are priced off the stored figure, so a wage that corrected itself mid-save would
  re-price every release and buyout in flight.
- **The DoF tier hole, closed in the same pass (owner's call).** `DofStaffHiringService` applied
  no tier gate while Office › Hire hard-blocks any free agent above the club, so a Local club's
  DoF could sign an Elite coach or scout its owner could not — and cheapest-first *surfaced*
  them, because a weak Elite candidate undercuts a strong Local one. **The lesson is about where
  the rule lived:** it was a `const` in `src/screens/office/hireLogic.ts`, so the only other
  caller that needed it couldn't reach it without a screen→engine import, and silently went
  without. It now lives in `src/utils/staffHiringGate.ts` (`freeAgentAboveClubTier`,
  `clubTierOf`) with all three callers delegating. **A club rule parked in a screen module is a
  hole waiting for its second caller.** Employed staff stay ungated there on purpose —
  `evaluateStaffWillingness` owns poaching and can say yes to a step down.
- **The fourth formula, also closed.** `npcFinances.generateNpcInvestorContracts` built its
  valuation input from `coachingAbility * 150` — role-blind like the rest, and re-deriving a
  wage that `buildWorldLeagueClubs` had already resolved correctly a few lines earlier in the
  same call. It now reads `resolveWorldStaffWagePence(s)`. **This is a real behaviour change,
  not a refactor:** staff value is annualised (× 52) inside `calculateClubValuation`, and
  investor payment is `valuation × equity% × variance`, so NPC clubs with senior staff (a
  Chairman was valued at ~£105/wk against a real £400–1,200/wk) now carry higher valuations and
  pay their investors more. AMP-side finances are untouched.
- **⚠️ Corrected same day — "all four heuristics are now gone" was wrong, and the way it was
  wrong is the lesson.** That claim was made off `grep "salary:"` — a colon — which matches
  object-literal assignments and silently misses both `salary ?? ability * 100` and a
  `reduce` that sums a derived wage without ever naming the field. **Grep the SHAPE of the
  computation, not the assignment.** Four more sites existed, all on `development`, found only
  when a `dev` merge put them side by side: `npcFinances.computeNpcWageBill` (a `reduce` at
  `× 150` that ignored `staff[].salary` outright — the one genuine remaining bug, since it
  feeds NPC solvency and understated every NPC payroll), plus inline `?? ability * 100`
  fallbacks in `HireScreen.npcStaffToHireItem`, `StaffPoachingService.poachStaffToAmp` and
  `npcStaffPoachExecutors` (which also re-discriminated staff-vs-scout inline, pricing an
  NPC-side poach differently from the AMP-side one next door). All now route through the
  resolver; `worldMemberSalaryPence` and `PoachableWorldMember` were exported so the sibling
  executor file could stop duplicating them. `resolveWorldStaffWagePence`'s legacy branch is
  genuinely the last one, and fires only for locally generated NPC managers, which have no
  backend figure to prefer.
- **⚠️ "Nothing asserted a wage anywhere" was also wrong**, and more instructively:
  `npcFinances.test.ts` had two cases named *"adds staff wages at coachingAbility × 150"*,
  pinning the broken formula as if it were the specification. **A test that asserts an
  arithmetic identity rather than the source of a figure is worse than no test** — it made the
  bug look deliberate and would have failed the fix. Both now assert that the staff member's
  own wage is what gets summed, with the heuristic checked only as an explicit last resort.
- **Left open:** NPC `club.scouts` are still absent from `calculateClubValuation` entirely —
  its signature takes `staff` and not `scouts`. Separate question from the wage one, and a
  wider change than this pass wanted.

## 2026-11-06 (fifty-second pass) - the dashboard's Tournaments card, and a feature status four docs had not caught up with

- **Commit:** `762bad65` on `development`, merged out to `master`, `dev` and
  `new-game-save` the same day.
- **Stages touched:** `07_synthesis/output/current-focus.md` (new top section),
  `07_synthesis/output/overview.md` (tournaments were absent from the cross-stage overview
  entirely — now a paragraph on the one server-authoritative feature),
  `07_synthesis/output/architecture-notes.md` (the tournament section **retitled and reframed**:
  was "the one place every stage shows the same gap", now a description of shipped structure,
  with its pre-hub bullets marked as history), `05_ui/output/design-system.md` (§5 gold
  rationing — the gold-filled card is a new listed exception),
  `05_ui/output/patterns.md` (new "The dashboard's Tournaments card" section; matchux's
  tournament-mode caller corrected), `05_ui/output/navigation.md` (the entry card is no longer a
  plain link; the `tournaments/results/[fixtureId]` paragraph marked as history),
  `01_overview/output/tribal-knowledge.md` (the soft-launch gate note — there is no gate left to
  check), `06_documentation/output/index.md` (both tournament brief rows), 
  `02_architecture/output/structure.md` (matchux tournament caller), shared (this file,
  `token-savings.md`).
- **Code:** `src/components/dashboard/TournamentsEntryCard.tsx` rewritten from a plain link to
  the "gold bar" (handoff `design_handoff_tournaments_gold_bar`, option 1c) and moved to 2nd on
  the dashboard; `dashTournaments()` added to `dashboard/dashboardLogic.ts` with 7 new cases in
  its suite; 4 new catalog keys via `i18n:apply-overrides --only` (4,424 → 4,428),
  `audit-tokens` clean. `tsc` clean; **526 suites / 8,862 tests**.
- **The finding worth carrying:** the tournament system shipped to production 2026-09-28, was
  rebuilt as the five-root hub 2026-10-24 and lost its `debugLoggingEnabled` gate 2026-11-03 —
  and on 2026-11-06 four separate `.context/` files, plus the handoff brief written against them,
  still described it as a debug-gated soft launch with a file map from before the rebuild. A
  feature's STATUS goes stale faster than its mechanics and nothing prompts a re-read. Grepping
  the gate's identifier (`debugLoggingEnabled`) found every instance in one pass; do that in the
  same change as removing a gate.

## 2026-11-06 (fifty-first pass) - the v3.1 UI-fidelity drop, and reading a drop against itself

- **Commit:** on `new-game-save`, on top of `160e3531`. The drop is
  `assets/Components/new-game-save-v3.1/` (9 files + the prototype HTML + a Pixel reference table).
- **Stages touched:** `04_interfaces/output/routes.md` (`maxLandPence` re-proposed and refused
  again), `05_ui/output/design-system.md` (§6 rows for `RandomiseDialog` and `MoneyStepper`; the
  unbuilt-site ghost; `IsoSvg maxHeight`), `05_ui/output/compliance-review.md` (§9, the setup
  flow's reconciliation), `07_synthesis/output/game-mechanics.md` (§1 gains `effectWordKeys`),
  `07_synthesis/output/current-focus.md` (the v3.1 pass), shared (this file).
- **Code:** `BuildSteps` rebuilt to the prototype (pinned block, one stepper line per row, draft
  sprites), `randomise.ts`/`RandomiseDialog`/`MoneyStepper` new, `LandSteps` gains YOUR VALUATIONS
  + RANDOMISE + the club-name search, `'fac'` into `STEPPER_KINDS`, `IsoSvg` gains `maxHeight`,
  `facilityEffectCopy` gains `effectWordKeys`. `tsc` clean; **538 suites / 9,048 tests**; catalog
  4579 → 4624 (45 keys, via `i18n:apply-overrides --only … --write`); `audit-tokens` clean.

Three things worth carrying past this drop:

- **Read a drop's own reasoning against its own code.** Three of its four errors were things it
  had already written down correctly somewhere else: it diagnosed the "sprites read the previous
  club's levels" bug and then repeated it verbatim for cosmetics three lines later; it justified a
  parallel effect-copy map as "as the prototype does" when the prototype has no such map (the
  function it calls is never defined in the 2.7MB file); and it re-proposed a query parameter this
  repo bans, a day after the commit that banned it. The geometry was trustworthy — the Pixel
  reference checked out against the HTML — and the reasoning around it was not.
- **A fixture richer than the endpoint is a test that cannot fail.** `randomise.test.ts` was green
  on `pickTown` because every fixture row set `claimable: true`; the list endpoint sends no
  `claimable` at all, so the predicate matched nothing and RANDOMISE LAND was dead for every
  budget. The fix was a fixture row that carries what the server actually carries. When a test
  passes for a predicate about an optional field, check what the wire really sends.
- **A source-reading guard is the only guard for chrome, and it protects exactly what it names.**
  `setupChromeDesign.test.ts` now reads every component in `src/components/new-game-setup/` for raw
  shadow props, open-coded money conversion, a second money stepper and a second effect-copy map —
  none of which `tsc` can see, and three of which were already on the branch in files the drop
  never touched. Its last assertion enumerates the directory and fails if a new component is not
  listed, which is the `MoralePane` lesson applied in advance rather than after.

## 2026-11-06 (fiftieth pass) - three device-found bugs in v3, and the traps behind them

- **Commit:** `160e3531` on `new-game-save`, merged to `dev` (`35b74237`). `development` also
  merged INTO `new-game-save` to keep the eventual merge out small.
- **Stages touched:** `04_interfaces/output/routes.md` (the town-discovery deadlock),
  `05_ui/output/patterns.md` (no renderer; the two gold rulings),
  `07_synthesis/output/architecture-notes.md` (catalog merge recipe; apply-overrides cannot
  reword), `07_synthesis/output/current-focus.md` (rewritten state + the hold lifecycle),
  shared (this file).
- **Code:** `rowTag` precedence, server-side town search + cursor paging + the valuation poll
  cadence, `holdLost`/`unfound` and the hold-expiry watcher, `useAccountBalance` replacing
  `useCrossClubEarnings`. `tsc` clean; **535 suites / 8,981 tests**; catalog 4579.

Four things worth carrying past this feature:

- **Every bug found on device was the app misreading correct data.** An unvalued town reported
  SOLD OUT because `claimable === false` was tested before `landPence == null`; 84 towns were
  "missing" because a 200-row cap met a price sort that buries unpriced rows; a hold expired
  with nothing watching the clock. Nothing was wrong server-side in any of them. When a screen
  disagrees with the admin, suspect the reading before the data.
- **A client-side filter over a paged list is worse than no filter.** The town search I added
  could only match rows that had already arrived, which made a truncated list look complete and
  turned "84 towns are missing" into "84 towns do not exist". If a list is paged, its search
  belongs on the server.
- **Catalog merges are a union, mechanically.** `translations.json`/`provenance.json` conflict
  on every cross-branch merge where both sides added keys, and taking a side silently deletes
  the other's. Recipe in `architecture-notes.md`; two independent merges converging on the same
  entry count is the cross-check.
- **Check whether a spec can be executed before executing it.** The v3 notes asked for snapshot
  re-records in a repo with no renderer and zero `.snap` files, and for copy rewrites through
  tooling that refuses to overwrite. Both were answered rather than forced, and both answers
  are now written down so the next person does not rediscover them.

## 2026-11-05 (forty-ninth pass) - new game setup v3 integrated on `new-game-save`

- **Commit:** `c87f6ea3` and the three before it, on `new-game-save` (branched from `master` at
  `2bae7d9f`; NOT on `development` — see `01_overview/output/environment.md`).
- **Stages touched:** `04_interfaces/output/routes.md` (the eight v3 endpoints + the error-code
  contract), `03_data/output/state.md` (`owner_funding`), `05_ui/output/patterns.md` (the four
  new steps), `07_synthesis/output/current-focus.md` (rewritten — it had said the endpoints did
  not exist), shared (this file).
- **Code:** the drop copied in (18 new files, 2 replaces), `seasonTicketBookingFor` extracted
  from `bookSeasonTicketSales`, `owner_funding` added, `locationId` threaded through
  `initializeClub`, the three contract adapters, the host wiring, and 75 new tests. `tsc` clean;
  **530 suites / 8,878 tests**. i18n catalog 4419 → 4569.

Three things worth carrying beyond this feature:

- **A drop's README is a statement of intent, not of diff.** `INTEGRATION.md` marked nine files
  "replace" and one "unchanged"; on this tree all but two were new, because the v2 port it
  claimed to supersede had never been integrated on any branch. Four "missing" host pieces were
  not missing the way it said: `facilityCatalogFrom` shipped inside the drop itself. Resolving
  every `@/…` import and named export against the tree took minutes and corrected most of the
  table.
- **Where a contract differs, the differences were all SILENT.** Three mismatches between the
  drop and the shipped backend produced no error, no crash and no log — a restore that restored
  nothing, a strip that never rendered, an unlimited allowance read as a cap of five. Every one
  was found by reading the server's source, none by running the app. The adapters now read either
  shape and either error-code spelling, so neither side can break the other by moving one again.
- **A source-reading guard protects the literal it greps for, not the decision it names.** Both
  ordering guards here keyed on exact text — one on `'}, [registerClub]);'`, one on a single
  `indexOf('setCompleted(true)')` — so the first broke on an added dependency and the second
  silently stopped proving anything once there were two exits. Both now match on shape, which is
  the same lesson the `MoralePane`-only cohesion guard taught in October.

## 2026-11-05 (forty-eighth pass) - the `new-game-save` branch rule, and setup v3 scoped

- **Commit:** uncommitted at the time of writing, working tree on `new-game-save` (level with
  `master` at `2bae7d9f` — no feature commits yet).
- **Stages touched:** `01_overview/output/environment.md` (new "`new-game-save` — the one live
  feature branch" subsection under Branching model),
  `07_synthesis/output/current-focus.md` (new top section, "new game setup v3"), `CLAUDE.md`'s
  Branch model paragraph (the auto-loaded mirror of the branch rule), shared (this file).
- **Code:** none. This pass is the owner's branch instruction plus a read-only scope of
  `assets/Components/location_new_game/INTEGRATION.md`.

Two things worth carrying forward:

- **The branch rule is an exception with an expiry.** All new-game-flow work goes on
  `new-game-save`, not `development`, because `development` must stay free to ship unrelated
  work to prod first. Both the `environment.md` subsection and the `CLAUDE.md` paragraph say
  to delete themselves once `new-game-save` merges to `master` — the three-branch model is the
  steady state.
- **A drop's "Copy in" table is a manifest of intent, not of diff.** INTEGRATION.md marks nine
  files "replace" and one "unchanged"; on this tree all but two are new, because the v2 port it
  claims to replace was never integrated on any branch. Four host pieces it assumes exist do
  not: `seasonTicketBookingFor`, `facilityCatalogFrom`, the `owner_funding` finance category,
  and a `Badge` `info` variant. Checked by resolving every `@/…` import and named export in the
  drop against the tree rather than by reading the table.

## 2026-11-03 (forty-seventh pass) - the SVG `OutOfMemoryError`, measured rather than guessed

- **Commit:** uncommitted at the time of writing, working tree on `master` (it belongs on
  `development` — see `01_overview/output/environment.md`'s branching model).
- **Stages touched:** `07_synthesis/output/current-focus.md` (new top section — the full
  investigation of Sentry `158327531`), `05_ui/output/patterns.md` (sprite-art section — the
  `useSpriteBudget` rule and the measured per-sprite cost),
  `02_architecture/output/structure.md` (`src/utils/` entry), shared (this file,
  `token-savings.md`).
- **Code:** new `src/utils/spriteBudget.ts` + `src/hooks/useSpriteBudget.ts`, called from the
  eleven sprite seams (`IsoSvg`, `KitSprite`, `AvatarSprite`, `PlayerSprite`, `TrophySprite`,
  `StarSprite`, `BondIcon`, `MoraleIcon`, `MotivationIcon`, `HubTrophyCabinet`'s
  `TrophySilhouette`, `hubPrimitives`' `Badge`/`Trophy`). New
  `__tests__/utils/spriteBudget.test.ts` (16 tests). `tsc` clean; **523 suites / 8,742 tests**.
- **2026-11-05 — boot splash option 2a.** `src/components/splash/` reworked: one of four site
  sprites picked at random and built LV 0 → LV 10 (was a five-frame stadium storyboard), the
  112×23 title banner replaced by the 120×36 stitched ribbon with two differently-sized lines and
  a stepped shine, and a new level chip. `stadiumLevelCache.ts` → `splashLevelCache.ts`. New suite
  `__tests__/components/splash/splashLevelCache.test.ts`; `splashTitle.test.ts` ported to the
  ribbon. `tsc` clean; **526 suites / 8,848 tests**.
  No behaviour change — it only makes the next crash report say where the heap went.

Two things worth carrying forward beyond the investigation itself:

- **The crash frame was the loudest allocator, not the leak.** `PathParser.lineTo` fails because
  it is where this app allocates Java objects in bulk — ~60 B of retained marker data per path
  command, 40,905 commands for one stadium band. The per-screen totals were measured (by running
  the real renderers under `tsx`/jest, not estimated) and they do **not** add up to 128 MB, so
  the honest conclusion was "instrument it", not "fix the sprites". `current-focus.md` has the
  figures and the four hypotheses that each died to a single fact.
- **A tag, because breadcrumbs do not survive a native crash.** Same lesson
  `overlayTelemetry.ts` already paid for, re-confirmed by this report carrying `route` /
  `react_tree` on a `mechanism: UncaughtExceptionHandler` event. The flush is synchronous above
  a 20 k-command delta: the OOM is thrown on the UI thread after the JS commit, so a queued
  flush could have reported one burst stale — the exact quantity in question.

Also corrected while in the file: `structure.md`'s `src/hooks/` and `src/utils/` file counts
were stale (36 → 38, 81 → 107 — both verified by counting, not inferred).

## 2026-11-03 (forty-sixth pass) - Amplitude instrumentation for the Tournament Hub

- **Commit:** this one, on `development` (merged out to both `dev` and `master` the same day).
- **Stages touched:** `04_interfaces/output/services.md` (a new "Tournament Hub analytics"
  section at the end), shared (this file).
- **Code:** new `src/utils/tournamentAnalytics.ts` (event table + pure property builders) and
  `src/hooks/useTrackScreenView.ts` (one event per focus); call sites added to the five hub
  roots, `TournamentInstanceScreen`, the match route, `useTournamentHubActions`
  (`useActions` + `useInboxActions`), `useTrophyReward` and `PostChallengeSheet`. New
  `__tests__/utils/tournamentAnalytics.test.ts` (32 tests) and the analytics modules registered
  in `tournamentHubModules.test.ts`. `tsc` clean; 522 suites / 8,726 tests.

Why it was needed at all: the hub opened to every player (73976839) with **no product
instrumentation**. The Amplitude relay in `client.ts` reports API *errors* only, and
`useRouteTelemetry` tags routes for **Sentry**, not Amplitude — so nothing recorded a Dashboard
view, a registration, or whether a player came back for the result.

Three things worth carrying forward:

- **Screen views had to key off FOCUS, not mount.** Drawer screens are mounted-but-frozen on
  blur (`freezeOnBlur`) and a hub root pushed over by the instance screen stays mounted
  underneath it, so a `useEffect` would have counted the first visit and nothing after. Same
  reason `useResource` polls off `useIsScreenFocused`. The instance and match screens are the
  exception and do fire from an effect — keyed on the loaded id — because the interesting
  properties (status, viewer relation, eligibility, whether the score was still sealed) do not
  exist until the fetch resolves.
- **The leak guard is a VALUE test, not a source-reading one.** Every DTO the builders read has
  `ClubRef`s hanging off it, and `ClubRef` carries `ovr` — the hidden ability figure — so one
  spread of a club object would have exported it. The suite asserts banned keys, banned values
  and that every payload is flat. A test that grepped the builders would pass the moment someone
  built the same payload a different way, which is the failure mode CLAUDE.md's cohesion rule
  already records from `MoralePane.tsx`.
- **One property was dropped for being fake data**: an "opened from" on the match event. Nothing
  in the hub passes `?backTo=`, so it would have been the constant `'direct'` on every event.

**No new BINDING rule**, so `01_overview/output/tribal-knowledge.md` and its `CLAUDE.md` mirror
are untouched.

## 2026-11-02 (forty-fifth pass) - the revealed-result stamp celebration

- **Commit:** this one, on `development`.
- **Stages touched:** `05_ui/output/patterns.md` (a new "The revealed-result stamp" subsection
  under MatchUX phase flow), shared (this file).
- **Code:** drop `assets/Components/design_handoff_match_result_stamp` integrated — new
  `matchux/stampTimeline.ts` (the drop's maths, ported) and `matchux/MatchStamp.tsx` (the
  React/RN half), a new `overlay` slot on `MatchDayShell`, the wiring in
  `SealedDecisionScreen`, and `__tests__/components/matchuxStamp.test.ts` (27 tests).

Three things worth carrying forward from the drop, all written up in `patterns.md`:

- **The handoff's `DONE_AT.W` was wrong by ~400ms**, in a file whose header calls every timing
  final. At its 3200ms stop, 24 confetti bits are still on screen within 30dp of the bottom
  edge, so the tail of the burst blinks out instead of falling off; 3600 is the first clear
  frame, and is what the drop's own comment claims 3200 means. D and L check out as given.
  Pinned by a test, so reverting to the letter of the spec has to be deliberate.
- **The drop duplicated state the app already owns** — a `BEATS` table plus
  `stampTimeFromReveal(r) = r - 1000`, which is `SealedDecisionScreen`'s own `BEATS_MS`. The
  stamp clock starts from that screen's `beat` state instead, so the celebration cannot drift
  off the card it lands on. Same for its colour tables: every hex was already a `WK` token and
  the three words were already `match.outcome.W/D/L`, so **no new catalog keys** and no new
  palette.
- **Its one open question answered rather than carried:** nothing chains `RewardCeremony` off a
  match result (it opens from `WinNoteCard`'s LIFT THE TROPHY, a later deliberate tap), so the
  W cannons need no suppressing for a won final.

Both halves of the usual prototype-drop lesson again: the maths was correct and portable, the
host-plumbing assumptions around it were not.

## 2026-11-02 (forty-fourth pass) - a docs prune, and what the reference count got wrong

- **Commit:** this one, on `development`.
- **Stages touched:** `06_documentation/output/index.md` (a **Pruned (2026-11-02)** section, the
  Drizzle step-log row rewritten, and 16 previously-unindexed docs added),
  `01_overview/output/tribal-knowledge.md` (Q5's stale-docs paragraph), shared (this file).
- **Code:** four docblocks repointed (`pushNotification.ts`, `PushNotificationService.ts`,
  `clubReputationModel.ts`, `SeasonTransitionService.ts`) before the plans they cited were
  deleted. **50 files deleted from `docs/`, 1,565K; 2.5M -> 924K, 107 files -> 57.**

Applied the sibling backend repo's prune criterion — inbound references, not age — and it needed
one refinement before it was usable: **a doc cited only by the documentation index is not
load-bearing** (the index exists to list it), and **two dead docs citing each other are not
alive.** Resolving those two cases moved 60 files out of the "referenced" column, which is what
turned a 107-file review into a short list. Worth reusing; the naive count says almost everything
is referenced.

**The pass ran in two waves, and the second mattered more.** Wave 1 asked "what references
this?" and removed 11 files. The owner then pointed out that most of `docs/` was *actionable
plans, not context* — and asking the right question for that genre, **"is the work done?"**,
removed 37 more and four times the bytes. The inbound-reference test is correct for reference
material and nearly useless for a task list: a plan nobody links to may be urgent, and a plan
linked from five places may have shipped a year ago.

**What the plans actually were: 1,204 unticked tasks for work that shipped.** 34 of the 38
`docs/superpowers/plans/` files were 0% checked. 16 of 16 sampled features were verified present
in the code. `2026-09-10-scouting-hub.md` alone carried 106 open tasks for something
`current-focus.md` calls landed. **An executed plan that was never ticked is indistinguishable
from a plan nobody started** — so it is not harmless history, it is a false backlog, and the
convention now is to fold anything durable into `.context/` or a spec and delete the plan. Kept
the two cited from source; one of them (`2026-09-19-push-notifications…`) is the only plan in the
repo that was ever fully ticked, which is what a real completion record looks like.

**Wave 3 closed the genre out, and the fold is the part to copy.** The last two
`docs/superpowers/plans/` files were implemented AND cited from source, which is why a reference
test kept them and an is-it-done test did not. Deleting them correctly meant three steps in order:
confirm the durable content is already in `.context/` (it was — `services.md`'s push-router
section and `game-mechanics.md` §4), repoint the four citing docblocks, *then* delete. **Deleting
an implemented plan before the fold is worse than leaving it.**

**And the harm is not only in files that should go.**
`docs/drizzle/stage1-health-engine.md` deserves to stay — it is the design record two
`src/db/` files cite — but it claimed "commits 1-5 of 8 are IMPLEMENTED" when 7 of 8 were done:
commit 6's `withMaintenanceLock` has been in `client.ts` long enough to be a CLAUDE.md binding
rule, and commit 7's `health/backup.ts` ships with tests. **A plan that under-reports its own
progress is the same false backlog as an unticked one.** Checking a kept file's status claims is
part of a prune, not a separate chore.

**A second genre test that generalises: regenerable output is not a document.**
`docs/i18n/untranslated-strings-audit.md` carried its own regeneration command, and the script
still exists — so the snapshot was pure staleness risk, especially with a concurrent `t()`
rewiring pass moving the numbers daily. Its citations now point at the script and its `persisted`
bucket.

Three findings worth carrying, beyond the file list in the index:

- **The three generator dumps were the sole inbound reference for 44 of the 47
  `docs/superpowers/` plans and specs.** Deleting them did not touch those files, but it removed
  their apparent liveness — Q5's "historical design record" decision is now the only thing
  holding them. Anyone re-running this analysis will see 44 fresh orphans that are orphaned *by
  design*, so it is recorded in both places rather than left to be rediscovered as rot.
- **Two `.context/` files disagreed about one file's fate, and the older one was wrong.** Q5's
  wording swept `docs/design-briefs/player-avatar-face-system.md` in with the dumps as "doubly
  stale"; the index entry, written later, says to keep it for art direction, and the file carries
  a SUPERSEDED banner doing that job. It was on the deletion list until the index was read. **The
  later and more specific entry wins** — and a prune should read every inbound pointer before
  acting on any one of them, which is also how the four Drizzle step logs were separated from the
  seven that had to stay (two of those are live unfinished work).
- **A reference count is the wrong test for work that was never started.** `currency-display-component.md`
  has no inbound reference and reads "SHELVED 2026-10-25, deliberately. Nothing implemented" — a
  record of a decision *not* to build something. Kept, and now indexed. The sibling repo has the
  same blind spot for briefs whose code does not exist yet; its
  `docs/api/setup-tutorial.md` carries an explicit expiry for that reason.

## 2026-11-01 (forty-second pass) - the avatar's morale prop, finally passed by something

- **Commit:** the morale-wiring commit on `dev`.
- **Stages touched:** `02_architecture/output/structure.md` (the V4 drop entry - morale status,
  plus a stale cross-reference), `05_ui/output/design-system-notes.md` (the "expression is
  fixed at generation time" paragraph, now reversed; the `AvatarSprite` props line),
  `06_documentation/output/index.md` (the avatar face-system brief marked superseded).

The question that started it was just "is the avatar's `morale` prop used anywhere?" The
answer was no: it shipped with the V4 drop on 2026-10-31 and **0 of 56 avatar call sites
passed it**. It was blocked at the component, not merely unwired - `PlayerSprite`,
`PitchAvatar` and `StaffPitchAvatar` did not declare it, so 54 sites could not have passed it.

Three things the audit turned up that are worth more than the feature:

- **The app had THREE morale/mood->face mappings and the canonical one was the dead one.**
  `faceForMorale` (10 equal bands) was unused; `EventQueueOverlay`'s local `moraleToFace()`
  (5 bands) was what actually drew, and its three call sites passed **hardcoded 75/50/30** -
  so no real morale reached any sprite in the app. `mandate/ManagerPortrait.tsx`'s
  `MOOD_FACE` is a third, and is legitimately separate. The 5-band copy is now deleted.
- **The absent-value sentinel is the whole design.** `faceForMorale` reads 0/negative/
  non-finite as "not supplied"; `v4Extras.test.ts:273-275` says why - "an unset field is not
  a miserable one". The app has `?? 70` in four files and `?? 50` in two others for the same
  missing value, so the one real hazard in wiring this was feeding a default to the prop.
  The seam normalises `null` to `undefined` and nothing else.
- **A stale pointer that sent readers nowhere.** `structure.md` said to see
  `05_ui/output/design-system.md` "for the props" - that file has no `avatar-sprite` /
  `AvatarSprite` / `avatar16` mention at all. It meant `design-system-notes.md`. Fixed.

Also marked superseded: `docs/design-briefs/player-avatar-face-system.md`, whose morale->face
table is 5 levels at 80/60/40/20 with face ids (`low`, `dejected`) that do not exist in
`avatar16.ts`'s `Face` union - i.e. it contradicts the shipped ramp and would not compile.

**This REVERSES a recorded product decision** ("a sprite's expression is fixed at generation
time, not morale-driven"), which is why `design-system-notes.md` was rewritten rather than
appended to. No new BINDING rule, so `tribal-knowledge.md` and its `CLAUDE.md` mirror are
untouched - but the existing owned-players-only rule in `patterns.md` is what decided the
scope: unowned players keep their generated face, so a scouting target's expression leaks
nothing. `npx tsc --noEmit` clean; 515 suites / 8562 tests pass.

## 2026-10-31 (forty-first pass) - the scholarship panel

- **Commit:** the D commit on `development`.
- **Stages touched:** `07_synthesis/output/game-mechanics.md` (§5 Youth — the scholarship
  terms table and who reviews a youth signing).

A signed under-age player now gets `SignYouthPanel` instead of the adult one, at both signing
routes. The adult panel's contract ladder, wage negotiation, squad-role selector and gametime
promise are all meaningless for a thirteen-year-old, and its three staff opinions ask the
wrong question: `assessBuyingPlayer` scores first-team positional need and tactical fit.

What the investigation changed about the plan:

- **The right people were already being asked.** The scoping note said to "swap the staff" —
  but `headCoach` resolves to `role === 'manager'`, who per `officeRoleMeta` *runs the
  academy*. The defect was the QUESTION, not the reviewer.
- **The youth lens already existed.** `ManagerBrain.assessYouthPlayer` — used by
  `YouthPromotionService` — deliberately never reads `overallRating` ("a 12–16 year old's
  current ability says almost nothing") and scores `potential`. Reusing it means the signing
  verdict and the intake verdict are literally the same judgement.
- **It is fed the SCOUT's read.** `assessYouthPlayer`'s reasoning quotes potential bands, so
  running it on the true figure would hand the club a read of an unscouted player. The block
  is withheld until a report exists.

`youthScholarshipWeeks` floors at 1 for a reason worth keeping: `executeTransfer` reads a
0-week length as "this transfer establishes no new contract" and leaves the columns untouched,
so a scholar days from their birthday would have arrived with no terms at all.

Two of this file's tests failed on their first run and both were the TEST's fault — one
asserted a 3-year scholarship is "not on the selectable ladder" when 156 happens to be on it
(the claim was unexpressible that way), and one tripped on the panel's own comment naming
`acceptIntakePlayer` to explain why it is the wrong writer. **That is the second time this
session a source-reading guard has had to learn to strip comments.**

## 2026-10-31 (fortieth pass) - the avatar V4 drop's Part B, and three label bugs

- **Commits:** `cdf75f6f`, `9545dc6a`, and the C1 commit on top (`development`).
- **Stages touched:** `02_architecture/output/structure.md` (V4 Part B, the extras seam and
  its two traps, the role tables), `07_synthesis/output/architecture-notes.md` (the i18n
  failure modes), `05_ui/output/patterns.md` (the label/value row shape).

Three reports that looked like three bugs and were three DIFFERENT failure modes of the same
sentence, "the label is missing":

- **A missing catalog KEY.** The outfit tiles rendered `option.outfit.polo` literally: the
  catalog held four of the eight OUTFITS. `t()` returns the key on a miss, and
  `audit-tokens.ts` only inspects calls whose first argument is a string literal, so nothing
  caught it.
- **A missing PROP.** Hair, expression and facial hair were grids of unnamed thumbnails with
  no catalog involvement at all: `HeadTile` passed its label to `accessibilityLabel` and
  never to `OptionTile`'s optional visible `label`. An optional prop that is never passed
  fails silently by construction.
- **A missing FEATURE.** The V4 drop shipped `AvatarExtras` in October and its own strings
  fixture, deliberately unmerged "because no call site emits these keys yet — the builder
  pickers are Part B". Part B had never been built, so earrings, headwear, neckwear and
  tattoos existed in the renderer, the validator and the persistence layer, and nowhere a
  player could reach them.

Worth carrying forward:

- **A type that is narrower than its own implementation is a trap with a delay fuse.**
  `PlayerSprite` read `config.extras` through a cast while declaring `Partial<AvatarConfig>`,
  which has no such field. It worked for every existing caller because they passed extras
  through a spread; it broke the first caller that said so deliberately. Both sprite
  components now advertise what they already accept.
- **Check what the drop's own tables say before deciding what to offer.** The scoping note
  for this work listed armband, wristband and snood among the owner's missing accessories.
  `ACCESSORIES.player` vs `ACCESSORIES.staff` says those three are player-only, and the owner
  is a staff avatar — offering them would have stored flags the sprite never draws.
- **`i18n:apply-overrides --only … --write` is the only safe merge**, and it reports the
  count each time: 4142 → 4152 → 4186 → 4204 across this pass, every step additive.

## 2026-10-31 (thirty-ninth pass) - the teletext pages get one frame

- **Commits:** `d4686b4b` and the follow-ups on it (`development`).
- **Stages touched:** `05_ui/output/patterns.md` (a new "teletext frame" section; the advance,
  season-end and new off-season-skip sections), `05_ui/output/design-system.md` (a new
  **Teletext frame** component row).

Three overlays were drawing a teletext page and disagreeing about how. `PageHeader` and
`Strip` were module-private in `WeeklyTickOverlay` and had been copied by hand into
`SeasonEndTeletext`, where the copies had drifted; the season-end page was a centred card in a
transparent Modal while the advance page was full-bleed. They now share
`src/components/teletext/`.

Three things worth carrying forward:

- **The diagnosis that mattered was structural, not cosmetic.** The reported symptoms were
  "the header should be at the top" and "padding needs review". The cause of both was one
  thing: season-end had **no body gutter wrapper**, so its rows padded 10 from the page edge
  while its chrome padded 12 — content sat OUTDENTED from its own chrome — and its single
  `ScrollView` at `flexGrow: 0` meant nothing was elastic and nothing was pinned, so the
  Fastext key row moved between pages. Two of the listed spacing findings then fixed
  themselves when the frame landed.
- **A page must be ONE child of the body.** The frame puts `BODY_GAP` between its children,
  which is right for the advance page's three blocks and would have put 12dp between every row
  of a 20-club table. This is the kind of thing that only shows up when a second caller
  arrives, which is the argument for extracting at the second caller rather than the third.
- **A source-reading guard must strip comments.** `teletextFrameDesign.test.ts` failed its
  first run on `TimeSkipAnimation`'s own comment explaining that it *used to* paint `#000`. A
  guard that cannot tell code from prose teaches people to delete the prose — which is exactly
  the history that makes these files readable.

The off-season skip was re-skinned onto the same frame rather than restyled in place: a season
skip is a long advance, so it reuses the desk calendar and the segmented bar instead of its own
`#000` backdrop, 4px accent boxes and full-screen white flash. Six catalog keys added
additively via `i18n:apply-overrides --only … --write` (4142 → 4148);
`ui.timeSkipAnimation.text.2`/`.text.3` are now orphaned.

**No new BINDING rule**, so `tribal-knowledge.md` Q4 and its `CLAUDE.md` mirror are untouched.

## 2026-10-31 (thirty-eighth pass) - two silent string-union bugs, both at a boundary

- **Commits:** `47f4cf83`, `5e063e4c` (`development`).
- **Stages touched:** `07_synthesis/output/game-mechanics.md` (new rule 0.6; §8 widened to
  "Stadium, matchday and club money" with a new "Sponsor and investor income" subsection; §5
  Youth gained the signing path and the `club_id` trap), `04_interfaces/output/services.md`
  (the `GET /api/market/data` normalisation boundary), `03_data/output/schema.md` (the
  `player_club.club_id` vs `club_type` invariant and its guards).

Two unrelated-looking bug reports turned out to be the same shape: **a string that is typed as
a union but arrives as unvalidated data, consumed by code whose fallback looks like a correct
answer.** That is now rule 0.6 in `game-mechanics.md`.

- **Sponsors.** The backend sends `size` lowercase; `CompanySize` is uppercase. Pricing chose
  its band with `if LARGE / else if MEDIUM / else small`, so **every sponsor offer the player
  ever received was priced on the small band**; and the eligibility filter compared uppercase
  against lowercase, never matched, so **reputation never gated which sponsors a club drew**.
  NPC clubs were unaffected, because they build their sizes in code — an asymmetry where the
  NPCs earned correct income and the player structurally could not. Fixing it is a balance
  change in both directions, which is why both halves landed together.
- **Youth signings.** `executeTransfer` wrote the literal `'amp'` into `player_club.club_id`.
  First-team signings masked it (`squadStore.addPlayer` upserts the real id milliseconds
  later); youth signings skip that call on purpose, so the stray survived and the player was
  invisible to `getYouthSquadForClub` until the next boot repaired it. **This identifies the
  writer `seedAmpStrayClubRepair`'s doc comment records as never found** after four passes of
  static reading — the `role='youth'` signature in its own description was the tell.

The method worth carrying forward: in both cases the *reported* symptom was cosmetic (a raw
`screen.sponsors.size.small` on screen; a player "not added immediately") and the real defect
was two layers down. Both were found by following the bad value to its consumers rather than
fixing it where it was displayed — `game-mechanics.md` rule 0.5's advice, applied to a string
rather than to a number.

Neither is a new BINDING rule, so `tribal-knowledge.md` Q4 and its `CLAUDE.md` mirror are
untouched.

## 2026-10-31 (thirty-seventh pass) - backfilling the V4 avatar and v3 stadium options

- **Commit:** on top of `9bb85d6b` (`development`), working tree.
- **Stages touched:** `03_data/output/schema.md` + `state.md` (the extras blob shape and the
  seed trio), `05_ui/output/design-system-notes.md` (derived surrounds, the dashboard render
  path, the league trophy).

Both drops shipped their new looks switched off; this turns them on for existing saves.

Four things worth carrying forward, three of them traps:

- **`validateSpriteConfig` rebuilds a fresh object and never spreads its input.** It is the one
  seam every persisted appearance passes through, so a key it does not know about is dropped on
  the next read. Extras were unstorable until it learned about them. Anything added to an
  appearance blob later has the same problem and the same fix.
- **The stadium's "single seam" was not one.** The v3 guard checked shells and the registry and
  concluded `StadiumSprite` was it; `getDashboardStadium` calls `renderStadium` directly, so the
  dashboard kept drawing parkland after the player picked a city. Its render CACHE also had to
  key on `surrounds`, which is a render option and not part of the config. The guard now
  SEARCHES for direct callers instead of naming the ones it knew about.
- **`setFromSync` had four callers disagreeing about the league trophy's shape** -- resolved
  config, raw legacy wire fields, or the key omitted -- so whether a trophy rendered depended on
  which wrote last. Fixed in the store, not at the call sites.
- **Widening `OUTFITS` moved exactly one key** in `generateAppearance`'s pinned output, and
  nothing else, because that generator draws hair and face from its own private age-banded pools
  and never reads `HAIR_STYLES`/`FACES`. Re-baselining `outfit` was legitimate where re-baselining
  anything else would not have been: widening a POOL changes which value a draw lands on while
  `pick` still consumes one draw, so the stream is untouched. There is now a test pinning that
  the generator keeps using its own pools.

`surrounds` is derived rather than stored (NPC clubs have no settings row and never will), so
the stadium half needed no backfill at all. The avatar half is a real one: three seeds that only
ever ADD, leaving every existing face, hair and build byte-identical.

## 2026-10-31 (thirty-sixth pass) - the surroundings picker, and a broken card header

- **Commit:** on top of `e9571e91` (`development`), working tree.
- **Stages touched:** `03_data/output/schema.md` + `migrations.md` (the new column and
  migration `0016`), `05_ui/output/design-system-notes.md` (the picker and the header fix).

Turned the stadium sprite v3's `surrounds` render option into a real player setting: a
"BUILDINGS & TREES" picker in Site Settings, persisted in `facility_site_config` alongside
`trees`/`pitch`/`base`/`floodlights`, reaching the sprite through a new
`useSiteRenderOptions(category)`.

Two things worth carrying forward:

- **A pixel-font label must never be the flex item that shrinks.** `CollapsibleCard`'s title
  had `flex: 1` and no `numberOfLines`, so a long summary squeezed its column to roughly one
  character and Press Start 2P, which does not break mid-word, wrapped "SITE SETTINGS" one
  LETTER per line - a 13-row vertical ribbon on device, reported from a screenshot. The
  summary is the part that can afford to lose characters; it now takes the slack and
  ellipsises. Worth checking any other row that pairs a pixel label with flexible text.
- **The same header was printing untranslated enum values** ('concrete', 'stripes') directly
  beside their translated buttons, because the summary interpolated `cfg.base` / `cfg.pitch`
  raw. Now `siteSettingsSummaryKeys` in `facilityCardLogic.ts`, returning catalog keys, with
  a test that walks the whole option space and asserts every reachable key resolves.

Tile sizes were MEASURED off the renderer rather than guessed (parkland 54x42, the built-up
variants 94x57..80), which is why each tile fits to a fixed width inside a box sized for the
tallest.

## 2026-10-31 (thirty-fifth pass) - stadium sprite v3 integrated

- **Commit:** on top of `1a5aea30` (`development`), working tree.
- **Stages touched:** `02_architecture/output/structure.md` (the facility-sprites paragraph),
  `05_ui/output/design-system-notes.md` (the facility-sprites section).

Second prototype drop of the day. Ported `assets/Components/stadium-v3/` verbatim:
`stadiumConfig.ts` replaced, `stadiumSurrounds.ts` added, three render options merged into the
shell. 131/131 new parity hashes and 63/63 v2-look hashes pass. `StadiumConfig` is frozen, so
the core swap needed no call-site change at all and `tsc` was clean on it.

Three things worth carrying forward:

- **Unlike the avatar V4 drop, this one MOVES the default sprite.** Arched floodlights and the
  scoreboard-on-the-back-stand are on by default. Only `surrounds` is opt-in. So "nothing moves
  unless you pass an option" is a per-drop claim, not a house rule - read each CHANGELOG.
- **`rotation` is now a geometry input, not just a camera angle.** It picks the scoreboard's
  stand (`SCOREBOARD_STAND`). Two renders of one config at different rotations are no longer
  the same sprite rotated.
- **A verbatim fixture overwrite would have destroyed three sites' hashes.** The app's
  `__fixtures__/parity.json` is the v2 drop's COMBINED four-site file; the v3 drop ships a
  stadium-only file in a different shape. Both are kept as shipped, each read by its own test,
  and a test asserts the 63 cases they share agree rather than running them twice. **"Fixtures
  verbatim" in a prompt assumes the drop's file is the whole file - check before copying.**

Nothing persists `surrounds` yet (Part B).

## 2026-10-31 (thirty-fourth pass) — AvatarSprite V4 integrated

- **Commit:** on top of `cefe3fed` (`development`), working tree.
- **Stages touched:** `02_architecture/output/structure.md` (the avatar-sprite paragraph),
  `05_ui/output/design-system-notes.md` (§7's crop table and the head-anchor note).

Ported the V4 avatar drop (`assets/Components/avatar16/`) verbatim: 7 new hair styles, 6 new
faces, 4 new staff outfits, the `AvatarExtras` accessory/tattoo contract, a `morale` render
option that overrides `config.face`, and the `arm`/`leg` picker crops. 134/134 parity hashes
pass, all 16 V3.1 ones byte-identical.

Three things the stages were wrong or silent about, now fixed in them:

- `structure.md` called `AvatarSprite.tsx` **unused**; it has had two call sites in
  `EventQueueOverlay` for some time. It also warned about two traps in it — an `outline`
  defaulting TRUE and hardcoded English `accessibilityLabel` fallbacks — and **both are gone**
  (the first had already been fixed; V4 deletes the second).
- **The new trap, recorded in their place:** `sprite.ts`'s `HairStyle`/`Face`/`Outfit` are now
  strictly NARROWER than `avatar16.ts`'s, which broke an equality `PlayerSprite`'s header
  comment had asserted since the 16-bit swap. Render props take the wide type; `sprite.ts`
  stays the narrow validation/persistence surface, and widening its option LISTS would change
  every generated player's look.
- `design-system-notes.md`'s head-anchor note said the re-anchoring was a local deviation that
  "must be re-applied or re-discussed if a V4 lands". V4 landed and **adopted it upstream**, so
  it is no longer a deviation and `headCrop.test.ts` passed unchanged.

Nothing in the app passes `extras` or `morale` yet — the builder UI, persisting extras, the
morale source and the randomiser are open questions back to the asset author (Part B).

## 2026-10-31 (thirty-third pass) — game mechanics get their own BINDING output file

- **Commit:** on top of `70775c1e` (`development`).
- **Stages touched:** new `07_synthesis/output/game-mechanics.md`; routing in `CONTEXT.md`,
  `07_synthesis/CONTEXT.md` and the `CLAUDE.md` mirror; `04_interfaces/output/services.md` reframed.

**`CONTEXT.md` used to say game-loop internals had no stage and to read the code directly. That
instruction is what let four aggregated facility effects be computed and discarded unnoticed, and the
same "does this effect exist?" question be answered wrongly from source four times.** The paragraph is
corrected and the gap is closed.

`07_synthesis/output/game-mechanics.md` (249 lines) is the simulation's live rules: facility effects,
development, injuries, reputation, bonds, youth, scouting, stadium — each with its formula, inputs,
live values and **invariants** — plus five cross-cutting rules, a register of what does NOT work, and a
procedure for changing a mechanic safely. Marked ⚠️ in every router, like `05_ui`'s design-system.

- **Every constant it quotes was verified by running the code**, not copied from notes: floors,
  saturations, caps, `REACH_WEEKS`, the intake array, the age brackets, the gap exponent. Two figures
  came back different from what I would have written from memory.
- **Split by KIND, not by cutting the file in half.** `game-mechanics.md` owns what the rules ARE
  (current, authoritative); `services.md` keeps the postmortems and measurements — the history, which
  is worth keeping and worth not duplicating. Its facility section now opens with a banner saying the
  mechanics file wins on any contradiction, because two sources of a current rule is the exact bug
  class this whole week was spent on.
- **The dead XP chain is REMOVED, not just documented.** `calculateWeeklyXP`, `tacticalBoost`,
  `totalCoachPerformance` and `WeeklyTickResult.weeklyXP` are gone; wiring `xpMultiplierTotal` into
  reputation two passes ago left the discarded copy running every tick beside it. **A binding mechanics
  file cannot sit next to a function that makes XP look like a live system** — the next reader would
  have had two plausible answers to "what does XP do". Tombstones left at all three sites.

## 2026-10-31 (thirty-second pass) — released to master; mirror re-synced to PRODUCTION

- **Commit:** on top of `2dda5386` (`development`).
- **Stage touched:** `04_interfaces/output/services.md` (the scouting ceiling entry).

**41 commits merged to `master` and pushed** — a real production OTA. Verified on the merge result
itself (485 suites / 7,803 tests, tsc clean) before pushing; `expo.version` unchanged at 1.2.0, so no
installed build was stranded.

- **Check PRODUCTION's config, not dev's, before a master release.** The whole week's verification ran
  against `api.dev.buildmyclub.co.uk`; `master` ships against `api.buildmyclub.co.uk`, and the two had
  genuinely diverged (the stand retune was live in prod and NOT in dev — the opposite of the expected
  direction). They agree on every wired field as of this pass.
- **`FALLBACK_FACILITY_TEMPLATES` re-synced to PRODUCTION: 16 fields across 6 facilities.** The mirror
  had drifted on the four stands' xp/cohesion/loyalty and all three scouting reveal values.

⚠️ **A guard and the gameplay came apart, and the guard is the one that is wrong-ish.**
`scoutRevealWeeksDeltaPerLevel` is now 0.05 / 0.07 / 0.02 (ceiling 1.4), so the `it.failing` assertion
stays red — it wants the ceiling under the 0.5 floor complement. But `REACH_WEEKS` is 1/2/3/4, and
`max(1, round(weeks × factor))` has only FIVE distinct outputs over the whole range: **every ceiling at
or above ~0.375 gives the identical mission table.** The live 1.4 already delivers the intended maximum
and tuning to 0.45 would change nothing observable.

**The transferable point: when the output space is this coarse, a percentage ceiling is the wrong unit
to tune in.** The `.context` entry now carries the outcome table so the value is picked by the row
wanted, not by a percentage that the reach table cannot express.

## 2026-10-31 (thirty-first pass) — two more dead totals, and a correction to the audit method

- **Commit:** on top of `76cbb60f` (`development`).
- **Stage touched:** `04_interfaces/output/services.md` (new section on both wirings).

**The previous pass's claim that `scoutRevealWeeksDelta` was "the last aggregated total with no
consumer" was wrong.** Two more were dead, and much bigger: `xpMultiplierTotal` (ceiling 28.70, 98% of
it the four stands) and `cohesionBonusTotal` (ceiling 26.00, ten facilities). Together that was almost
everything the stands sold — their level-10 card read "+700% XP · +200% tactical cohesion" and only the
loyalty line did anything.

**Why the audit missed them, which matters more than the bug.** It asked *"is this total referenced
anywhere?"* — one hop. Both ARE referenced, at `GameLoop:725/729`; their CONSUMER's output was discarded
(`calculateWeeklyXP` → `WeeklyTickResult.weeklyXP` → no reader). **A reference proves nothing. Follow a
value to a persisted write or a rendered figure, never to its first mention.**

Wired per the owner's intent: XP → club reputation growth, cohesion → positive bond formation.

- **Reputation uses ONE shared cap** (owner's choice over a separate band): the `reputationBonus` and XP
  shares are summed then clamped, so the pair can never exceed +25%. Independently-capped bands were
  rejected as the direction that produced the original runaway (facilities WERE reputation, ~+103/season).
  ⚠️ The levers are therefore coupled — `reputationBonus` totals 2.14 against a 1.99 saturation, so it
  closes the clamp alone and the XP share does nothing until those values come down. The owner accepted
  this explicitly; a test asserts it rather than leaving it as a surprise.
- **Bonds: growth only, +50% cap.** Friction, drift and decay untouched — a facility that also
  suppressed fallings-out would make the dressing-room schism content unreachable.
- **Saturation is DERIVED** (`levelOneCatalogueTotal`), not hardcoded like `REP_FACILITY_SATURATION`'s
  1.99. Every facility bug this week was a number in code disagreeing with the backend; this one cannot
  be, and the owner is mid-retune (stands moving to xp 0.07 / cohesion 0.02 / loyalty 0.05).
- **A capped effect needed a new card unit.** Rendering `per × level × 100` would claim "+70% reputation
  growth" for a stand whose real contribution is a slice of a 25% band. `EFFECT_COPY` gained `'capped'`
  with its own `maxBonus`, and **a capped line is OMITTED when no saturation is supplied, never
  guessed.** `facilities.fx.xp` / `facilities.fx.cohesion` orphaned.
- Three existing tests used `xpMultiplierPerLevel` as a convenient LINEAR example and silently became
  assertions about the capped path. They now use a growth multiplier. **A test's incidental fixture
  choice becomes load-bearing the moment that field changes meaning.**

## 2026-10-30 (thirtieth pass) — the last dead effect is wired

- **Commit:** on top of `1f0d67e1` (`development`).
- **Stage touched:** `04_interfaces/output/services.md` (the `scoutRevealWeeksDelta` entry, "still dead,
  deliberately" -> wired). Brief `docs/design-briefs/scouting-reveal-weeks-wiring.md` marked shipped.

`scoutRevealWeeksDelta` was the last aggregated `FacilityEffects` total with no consumer — three facility
cards advertised a reveal speed-up for as long as the field existed, promising **17.5 weeks** off
missions that take at most four. Wired into `ScoutDispatchService`'s `REACH_WEEKS`.

- **Proportional, for the third time this week.** The brief proposed keeping the flat subtraction and
  re-tuning to a quarter; that was wrong the same way injury recovery was, which was only discovered
  hours earlier. `REACH_WEEKS` spans 1-4, so any flat delta large enough to shorten OVERSEAS zeroes LOCAL
  and NATIONAL. **Three fields of this shape have now been found in one week; a flat subtraction from a
  small, ranged quantity should be treated as a smell on sight.**
- **Duration only, never cost** (brief §1): `calcMissionCost` is proportional to weeks, so pricing from
  the reduced figure would make one investment deliver faster AND cheaper missions. Guarded by reading
  the source — computing both sides in a test would assert only that `calcMissionCost` is deterministic,
  which is the trap the first version of that test fell into and shipped green.
- **Brief §3 resolved by deferring to the backend**: the app honours whatever the catalogue ships, per
  the binding rule that a facility's effects are the backend's decision. Removing `scouting_center`'s
  overlap with its own reach-gating is an admin edit (value to 0), not an app-side exclusion list.
- **The `'weeks'` unit in `EFFECT_COPY` is deleted.** Both week-denominated fields became fractions, so
  nothing mapped to it and the branch was unreachable. **An unreachable branch reads as a supported
  case** — that is exactly how `facilities.fx.injuryNone` came to be printed for an outcome the engine
  could no longer produce, two passes ago. Two tests that exercised the branch via a field that no longer
  uses it were rewritten; one now asserts the unit set itself.
- Still needs backend values: live holds the week-denominated 0.5 / 0.7 / 0.55. For a 50% ceiling at the
  current weighting: `scouting_center` 0.014, `advanced_scouting` 0.02, `scout_fleet` 0.016. An
  `it.failing` guard waits on them.

## 2026-10-30 (twenty-ninth pass) — the recovery values land, measured not modelled

- **Commit:** on top of `3dff4159` (`development`).
- **Stage touched:** `04_interfaces/output/services.md` (measured outcomes for the live medical values).

Backend landed 0.0047 / 0.0047 / 0.0136 / 0.0169 (ceiling 0.399). Mirror re-synced, and the recovery
`it.failing` guard is a real assertion — both of this week's deliberately-red guards are now green.

**Outcomes were measured by running the real formulas over the catalogue, not by re-using the model that
justified the values.** They agreed, which is the point of checking: minor 2-3 -> 1-2, moderate 4-6 ->
2-4, serious 8-12 -> 5-7, average weeks out 4.00 -> 2.40, weekly probability 0.1 -> 0.030.

- **The floor does not bind** (0.030 against a 0.025 floor), so it stays the safety net it was built as —
  but with only 5 percentage points of headroom against the 75% cap, which is worth knowing before
  anyone strengthens a medical facility again.
- **The combined effect is a 5.6x swing in squad availability** — 18.4 expected weeks lost per player per
  season down to 3.3 — because probability and duration MULTIPLY. Neither 70% nor 40% looks dramatic
  alone, and that product is invisible in the admin CRUD where the two fields are tuned separately. A
  maxed medical department is now the most valuable facility investment in the game; a balance position
  rather than a bug, but it should be a chosen one, so the table is in `services.md`.
- A second assertion pins that **every severity tier still spans a range** at the live ceiling. That is
  exactly what the old flat formula destroyed (minor AND moderate both pinned at one week), so it is the
  property worth guarding rather than the numbers.

## 2026-10-30 (twenty-eighth pass) — the AMP/NPC sweep, and the direction it nearly missed

- **Commit:** on top of `27b6814f` (`development`).
- **Stages touched:** `04_interfaces/output/services.md` (the sweep, its method and its result),
  `02_architecture/output/structure.md` (`GameLoop.ts` now carries the hazard).

Swept `processWeeklyTick` deliberately rather than waiting for a third leak.

**The method is recorded because the result is only as good as it.** Taint-trace every tick-scope
declaration whose initialiser reads an AMP store, propagate to fixpoint, intersect against every region
iterating world clubs — regions found by brace-matching from each loop header, because the loops use
four different syntaxes and a naive regex missed the development pass entirely. Property accesses must
be excluded or `npcClub.players` matches the tick's own `players` and the signal drowns. The catalogue,
the clock and `config` are shared by design.

**Result: no third instance in the read direction.** All 7 NPC loops are clean. Two neighbours checked
by hand are correct AND documented as deliberate — `applySeasonalReputation` withholds
`ampFacilityMultiplier` from NPCs with its reason stated, and `NpcScoutingService` omits the
noise-reduction argument.

**The finding: the sweep was looking one way and the leak runs both.** `computePlayerDevelopment` ends
by writing the USER's inbox and the USER's reputation, unscoped, and the NPC pass called it ~50 times a
week. It reached nobody **by luck in two independent places** — `checkBreakthroughSpike` returns null
without an assigned coach and NPC players never have one; and the digest id `dev-report-wk{week}` has no
club in it, so `addMessage` (first-wins) discarded every NPC copy because the AMP pass happens to run
first. Reorder the passes, or hydrate a coach onto an NPC player, and either becomes live. Now gated on
a `notify` option, `{ notify: false }` at the NPC call site.

**Rule to carry: a pass that runs over the pyramid must neither READ the user's club nor WRITE to it.
Checking only the read direction is half an audit.**

- The two isolation guards are merged into one file (`ampNpcIsolation.test.ts`) — two files guarding the
  same lines is its own drift risk.
- **Near-miss worth recording:** I almost reported the spike reputation writes as a live bug. The
  `assignedCoach` gate makes them unreachable for NPCs. Reading the call chain to the end, rather than
  stopping at "this writes AMP state inside an NPC pass", is what separated the latent hazard from the
  live one — and both still deserved the guard, for different reasons.

**Found by the same id collision, and fixed in the next commit (`c7ac52e3`):** AMP **youth** development
passes the same `weekNumber` as the first team, so its fortnightly digest emitted the already-taken
`dev-report-wk{week}` and `addMessage` — first-wins — discarded it. **For the life of the feature the
user never received a youth development report**, and nothing failed: the message was built, translated
and handed to the inbox, which dropped it. `opts.squad` now scopes the id AND the copy from one `DIGEST`
table. `firstTeam` deliberately keeps the ORIGINAL id — a new one would make an already-sent digest
reappear as unread in every existing save, a migration-shaped problem from a cosmetic change.

**The class is worth more than the bug: a collision in a dedupe key is silent by construction.** Nothing
throws, nothing logs, and the losing message is indistinguishable from one that was never sent. Any id
built from fewer fields than the number of callers has this shape — `dev-report-wk{week}` had one field
and three callers.

## 2026-10-30 (twenty-seventh pass) — the AMP club's facilities stop reaching NPC clubs

- **Commit:** on top of `60e15101` (`development`).
- **Stage touched:** `04_interfaces/output/services.md` ("NPC clubs and the user's facilities").

`GameLoop` §3d read the AMP club's `injuryProb` for every club in the pyramid, so the user's medical
build-out protected all ~50 rivals. Each NPC club now computes its own effects, the same way the
development pass already did. Duration was hardcoded `0` — which looked deliberate but never was — and
takes the same club's reduction now.

- **This is the SECOND leak of the same object.** Development was the first, measured at +16.8 vs +28.2
  technical over a season (L0 vs L5), so a good academy upgraded every rival. One tick-wide variable
  computed at the top and reused is the pattern; it will have a third instance if nobody looks.
- **It was a switch, not a mis-tune.** While `calculateInjuryProbability` was `max(0, base − delta)` a
  level-1 `physio_clinic` zeroed the probability, so **nobody anywhere in the game world could be
  injured again** — user and NPC alike. The floor added two passes ago had already downgraded it to
  "everyone is 70% safer", which is how it stayed invisible this long.
- **The guard has to be a SOURCE-READING test** (`npcInjuryIsolation.test.ts`), and this is the clearest
  case yet for why: nothing was wrong with any function. `computeFacilityEffects` and
  `calculateInjuryProbability` were each correct and each tested. Only which argument reached which call
  site was wrong, and no behavioural assertion over a 3,000-line tick would have localised it.
- **The variable is renamed `ampInjuryProb` for its scope.** A bare `injuryProb` in a tick that long
  reads like "the" probability, which is how it came to be reused — the rename is the cheaper half of
  the fix and the test pins that it is used exactly twice.
- The guard **strips comments before searching**, because the fix leaves a tombstone inside §3d naming
  the very variable the rule forbids. A guard that cannot tell code from prose fails on its own
  documentation — it did, on the first run.

## 2026-10-30 (twenty-sixth pass) — injury duration had to change FORMULA, not numbers

- **Commit:** on top of `da65c3dc` (`development`).
- **Stage touched:** `04_interfaces/output/services.md` (the injury paragraphs).

The medical probability values landed (ceiling 0.07 against base 0.1, 70% removed), the mirror is
re-synced and the previous pass's `it.failing` guard is now a real assertion.

`injuryRecoveryWeeksDeltaPerLevel` was the same flat-subtraction shape and is **the one case where no
config value could have worked**: it subtracts a constant from a quantity spanning 2 to 12 weeks. At the
live ceiling of 5.9, every minor (2-3) AND every moderate (4-6) injury came out at exactly one week —
90% of injuries by weight, three tiers collapsed into "one week unless serious", minor pinned from
level 3 — while a delta small enough to spare minor injuries (<= 0.5) moved a 12-week injury not at all.
Now `max(1, round(weeks x clamp(1 - reduction, 0.35, 1)))`; every tier keeps its shape at every setting.

**Two lessons worth more than the fix:**

1. **"Tune the config" is not always available.** The probability bug and this one looked identical from
   the outside — same field shape, same saturation, same catalogue. One was numbers; this one was the
   formula, and the way to tell was modelling the output distribution rather than the ceiling.
2. **A change three files away turned an honest card line into a promise nothing keeps.** The floor added
   last pass made `facilities.fx.injuryNone` ("no injury risk") unreachable, so the card was claiming an
   outcome the engine can no longer produce — in the very module written to stop that. Its guard checks
   that a rendered field is AGGREGATED; it cannot see a formula changing underneath. The share now caps
   at `1 - floorFactor` and a test asserts it. `facilities.fx.injuryNone` is orphaned.

WARNING: **`reduction` is a FRACTION while the field is still named `...WeeksDeltaPerLevel`.** Held only
by comments at `calculateInjuryDuration`, in `GameConfig` and in `EFFECT_COPY` (whose unit moved
`'weeks'` -> `'pct'`, or a maxed build-out would render "-0.17 wks injured" for a 17% cut). Backend
follow-up: send `injuryRecoveryReductionPerLevel` and read `new ?? old`. `facilities.fx.injuryTime` plus
its plural pair are orphaned.

**Open, found while wiring this:** `GameLoop` computes `injuryProb` once from the AMP club's facilities
and reuses it for every NPC club (~line 891), so the user's medical build-out makes the whole world less
injury-prone. Before this week's fixes it was worse than a mis-tune — a level-1 `physio_clinic` zeroed
the probability, so **nobody anywhere in the game world could be injured**. Duration already passes 0 for
NPCs deliberately, so only probability leaks. Same family as the NPC development-effects bug fixed
earlier; this instance survived. Not fixed here — reported.

## 2026-10-30 (twenty-fifth pass) — injuries could be switched off from config

- **Commit:** on top of `5e9c4a1b` (`development`).
- **Stage touched:** `04_interfaces/output/services.md` (the injury paragraph).

One level of `physio_clinic` made injuries **literally impossible** for the rest of a save.
`calculateInjuryProbability` was `max(0, base − delta)` where delta is a FLAT sum over every facility
carrying `injuryProbabilityDeltaPerLevel` × its own `maxLevel`. The three medical facilities summed to
**3.6 against a base of 0.1** — 36× over — and `imaging_suite` (0.18/level) cleared the base on its own
at level 1.

- **A floor, so no config can reach zero**: `max(base × injuryProbabilityFloorFactor, base − delta)`,
  factor 0.25. The worst case is now "rare", not "off".
- **A test that compares the catalogue against the base**, the comparison nobody was making:
  `Σ(injuryProbabilityDeltaPerLevel × maxLevel) < baseInjuryProbability`. It is `it.failing` while the
  live catalogue is still over, so it **turns red when the backend values land** and the fix is to
  delete `.failing`. A skipped test would have gone quiet.
- **`DEFAULT_GAME_CONFIG.baseInjuryProbability` was 0.05; live says 0.1.** Every test and every pre-sync
  boot modelled injuries at half the real rate — and the medical deltas are sized against this number,
  so a stale copy silently re-tunes them. Corrected, and nothing in 482 suites depended on 0.05.
- `FALLBACK_FACILITY_TEMPLATES` re-synced for `physio_clinic` (0.1 → 0.01, which live had already moved).

**The shape of the bug is worth more than the fix.** A flat subtraction against a probability is the
only effect in the catalogue that can switch a system OFF rather than merely mis-tune it, and the
invariant protecting it lived in no file: three backend rows, three `maxLevel`s and one scalar, related
only by arithmetic nobody performed. `injuryRecoveryWeeksDeltaPerLevel` has the identical shape and is
fine only by luck — `max(1, …)` means a saturated build gives one-week injuries, not no injuries.

## 2026-10-30 (twenty-fourth pass) — the intake array covers the facility

- **Commit:** on top of `d25fe3f1` (`development`).
- **Stage touched:** `04_interfaces/output/services.md` (the cliff paragraph, now the fix).

The gap the previous pass documented is closed. `youthIntakeByFacilityLevel` is
`[2,3,5,7,10,15,18,21,24,27]` — ten entries against `youth_academy.maxLevel` 10 — so no real level pays
the engine's `?? 2` any more, and intake no longer falls off a cliff from 15 a year to 2 at level 7.

- **This was an APP fix, not a config one.** The live backend sends no `youthIntakeByFacilityLevel` at
  all, so `DEFAULT_GAME_CONFIG`'s array IS the live rule. The previous pass said "extending the array is
  a config change, not an app release" — that was wrong in the half that matters, and the corrected
  paragraph says so.
- **The engine fallback is now the default BY REFERENCE**, not a second literal. Two arrays for one
  quantity is two ways to get the length wrong, and the length is the thing that broke.
- **The new guard measures against the catalogue, not a number**:
  `src/__tests__/engine/youthIntakeRule.test.ts` asserts the array's length equals `youth_academy`'s own
  `maxLevel`, so the next time a facility's ceiling is raised this fails before anything ships.
  **A literal in a test could not have caught the original bug** — the array and the ceiling were each
  individually plausible; only the comparison was missing.
- **A full default also backfills a short BACKEND array**, which the six-entry default could not. `?? 2`
  is now reachable only past the facility's ceiling, where no real level exists.
- The curve's shape is a balance call and was retuned the same day to `[2,3,4,6,8,10,11,13,14,15]` —
  shallow, +1 or +2 a level, topping out at the 15 the old array reached at level 6. Past the early
  levels an academy's value is prospect quality, and the AMP club has **no youth cull**
  (`YOUTH_RELEASE_SQUAD_LIMIT` is 12 and NPC-only), so intake accumulates and a steep tail is churn.
  Cheap to retune; the length is not.
- **The retune found a second copy.** `npcYouthIntake.test.ts` mocked the config store with a literal
  `[2,3,5,7,10,15]` and hardcoded the counts it implied (`ceil(15/2) = 8`, pool depth `10`) — so it went
  on asserting a retired curve, and passed while doing it. Now mocked with the real
  `DEFAULT_GAME_CONFIG` array via `requireActual`, with every count derived from `youthIntakeForLevel`.
  **The lesson generalises past this array: a test that writes down a value from tuneable data stops
  testing the rule and starts pinning a snapshot** — state the rule ("top 50% of the pool") instead.

**No new BINDING rule**, though it is adjacent to one: "a facility's maximum level is the backend's
decision" now has a corollary worth knowing — **anything indexed BY level has to be re-checked when a
ceiling moves**, and this array was the one that wasn't.

## 2026-10-30 (twenty-third pass) — the academy card, and a column budget

- **Commit:** on top of `2f2939e3` (`development`).
- **Stages touched:** `04_interfaces/output/services.md` ("The one card exception"),
  `05_ui/output/patterns.md` (the column-budget rule).

**`youth_academy`'s card said "Level n active" while the facility worked fine.** Fixed by routing it
through `youthIntakeForLevel` — extracted from the two inline copies in `SeasonTransitionService` so the
card calls the same function the engine does and cannot state a figure the engine will not produce. This
is the **only** effect allowed in from outside `gameplayEffects`, and the narrowness is the point.

- **The intake array is shorter than the facility's maxLevel**: `[2,3,5,7,10,15]` against `maxLevel` 10,
  so levels 7-10 take the engine's `?? 2` and intake goes **15 at level 6 → 2 at level 7**. Drift from the
  2026-10-20 `maxLevel` raise, not a designed cliff. Left as the engine has always behaved; the card
  reports it rather than hiding it, so the gap is visible on device. Fixing it is a **config** change.
- **A test that encoded the bug**: `facilityCardLogic.test.ts` asserted `kind: 'none'` for the academy.
  Rewritten to derive from `youthIntakeForLevel` at every level 0-10, so a config fix moves the test.

**Squad › FORM gained an APP (appearances) column, and it cost NAME 85dp → 49dp at 360dp** — about five
glyphs, within a whisker of the 43dp that the same test file calls a regression. Shipped on the product
owner's call (the full name is one tab away in DEFAULT, which has 143dp). The distinction that makes it
a decision and not the old bug, now a rule in `patterns.md`: **the drop's 43dp was oversizing** (six
columns costing 278dp where 236 would do), **this 49dp is column count** (seven minimal columns costing
272 — still less than the drop's six). The guard was **exempted by name and the 49dp asserted**, not
deleted, so an eighth column has to take one out.

**No new BINDING rule.** Note the pre-existing rule-8 violation left in place: `SquadScreen` queries
`player_season_stats` with raw SQL via `getDatabase()` rather than a repository — the new `SUM(appearances)`
joins the existing `SUM(goals)`/`SUM(assists)` there, and its own comment already flags it.

## 2026-10-30 (twenty-second pass) — where a facility effect is allowed to live

- **Commit:** on top of `0178dae8` (`development`).
- **Stage touched:** `04_interfaces/output/services.md` (new section, "Facility gameplay effects —
  where an effect can live"), plus a routing pointer to it from `CONTEXT.md`'s stage table.

Written because the same question — "does this facility effect exist?" — was answered from source
**twice in one session and wrongly both times** (first "that cap exists nowhere", then "it does
exist" — the truth is that it exists and nothing calls it). The section is the single answer, and it draws
the line the confusion kept crossing: a card may read `gameplayEffects` and nothing else, because
`facilityEffectCopy.ts` derives from the aggregator and `facilityEffectCopy.test.ts` probes the real
aggregator to forbid anything it ignores.

- **Three effects live outside `gameplayEffects`** and therefore cannot ever appear on a card.
  Documented with their actual state, which is worse than their descriptions imply:
  `physio_clinic`'s squad capacity is **computed and never called** (`facilityStore.maxSquadSize()`
  has no consumer in `src/` or `app/`, so no squad cap binds — and the formula dips 15 → 13 at
  level 1); `youth_academy`'s intake is live but comes from `gameConfig.youthIntakeByFacilityLevel`
  `[2,3,5,7,10,15]`, **not** from the backend's own `youth_academy.intakeCountByLevel` `[2,3,3,4,5]`,
  a second array for the same quantity that nothing reads; `scouting_center`'s analytics gate works
  only because `app/player/[id].tsx` re-implements it inline, while the store's `analyticsUnlocked()`
  selector has no caller. **An uncalled selector documents an intention, never shipped behaviour** —
  that is the transferable lesson, and `facilityTier()` is a fourth one.
- **A `description` is backend prose and is checked against nothing.** The four stands all promise
  `unlocks premium "Executive Box" logic at Level 5+`; that string is the concept's only occurrence
  in the repo.
- **The second `LEVEL_BENEFIT_LABELS` is gone.** A duplicate of the hardcoded effect map (plus
  `benefitLabel` and a dead `FacilityCard`) had survived the first removal by sitting in
  `screens/office/shared.tsx`, a different file from the one that renders. 338 lines removed; both
  deletion sites now point at the new section.

**No new BINDING rule.** The existing facility rules (`maxLevel` is the backend's, capacity is
`level × capacityCalculation`, `FALLBACK_FACILITY_TEMPLATES` is a mirror to re-sync) are unchanged,
so `01_overview/output/tribal-knowledge.md` and its `CLAUDE.md` mirror are untouched.

## 2026-10-30 (twenty-first pass) — the live facility catalogue, read and re-synced

- **Commit:** on top of `0b78340e` (`development`).

**`GET /api/game-config` is public — no auth.** The open question "are the live `gameplayEffects` stale?"
was answerable in one curl, not a guess. Worth remembering: the config the app boots on can be read directly.

- **`FALLBACK_FACILITY_TEMPLATES` was stale in `gameplayEffects` only** — 20 fields across 9 facilities.
  Every scalar (cost, upkeep, decay, maxLevel, matchday income, reputation) already matched live, so someone
  had re-synced those; and `spriteFacilityId` is not drift at all, it is a field the backend still does not
  send, which is exactly why `SLUG_TO_SPRITE_ID` exists. Re-synced from the live export, which is what the
  binding rule asks for.
- **The re-sync made two tests fail, and both were right to.** They hardcoded a scouting list of three
  facilities and a total of 11.5; live has FOUR carriers (`scout_fleet` gained
  `scoutErrorRangeDeltaPerLevel`) and a total of 25.0. **A hardcoded list stopped meaning "all of them"
  without anything failing** — both now derive the list and the total from the catalogue, so they assert the
  wiring rather than a snapshot of backend data.
- `playerRatingStore`'s "11.5 today" comment was the same staleness in prose.

**Three balance findings handed to the owner, not changed here** (they are backend data, and the cards now
display them honestly): `baseInjuryProbability` is 0.1 and `physio_clinic` alone removes 0.1 per level, so
one medical facility at LEVEL 1 ends injuries for the squad — `imaging_suite` overshoots by 80% at level 1
and they stack; the four stands carry `xpMultiplierPerLevel: 0.7`, which is ×29.7 weekly XP at max before
coaching, on buildings that are seating; and `youth_academy`'s only keys are ones `computeFacilityEffects`
does not read, so its card says "Level n active" — a facility you can spend ten levels on with nothing to
show.

## 2026-10-30 (twentieth pass) — the remaining cleanups (`05_ui`, engine)

- **Commit:** on top of `c4ea8406` (`development`). Stage touched: `05_ui`
  (`output/design-system.md`, the BottomSheet row). **Everything shipped to `dev` through this session has
  been device-tested and green-lit by the owner as it landed** — the standing "nothing is visually verified"
  gap is closed for this work.

- **`getGameDateDisplay` is deleted, not deprecated.** THREE screens rendered dates through it — both mini
  views' contract lines and the player profile's retirement record — and it derives from `GAME_START` plus a
  week number, the app's other date anchor, which drifts 164 days from `calendarStore.gameDate` by week 179.
  `useWeekDate()` replaces it, stepping from the live anchor. **Deleting beats deprecating here: the helper's
  name is exactly what someone reaches for.** `getGameDate` stays — `worldStore` and `marketStore` seed ages
  at world init, where there is no live calendar and the drift cannot apply.
- **The standings rule is one definition.** `leagueStandings()` takes its fixtures as an argument, which is
  what lets the league page (archived seasons swap the pool) and Pyramid › Browse (the live store) share it.
  The page's dead `pointsDeductionsMap` memo went with it; its other memos stay, because they feed the club
  name map and the season picker, not just the table.
- `LeagueScreen`'s sheet is converted after all. **Its drag handle promised a gesture it did not have** — the
  sheet is not draggable — and its gold border and title were over §5's budget.

## 2026-10-30 (nineteenth pass) — cleanups, and a shared bottom sheet (`05_ui`)

- **Commit:** on top of `7b46d58c` (`development`). Stage touched: `05_ui`
  (`output/design-system.md` — the type scale, `Pager`, and a new `BottomSheet` row).

Five cleanups plus the sheet primitive.

- **`fontSize: 28` is `TYPE.figure` now.** Measured at 24 sites across 14 files, each one landing as "a
  genuine one-off". **A one-off repeated ten times is a step — count before adding the eleventh.** No literal
  28 survives outside `TYPE`: three sites override only `lineHeight`, a `TextInput` reads the step for its
  family and size, and seven newsprint club lines share one named style that adds tracking to it.
- **`Pager` promoted** to `ui/Pager.tsx`, which its own design-system row had asked for. `domain` and `lapped`
  became props — a pager belongs to the card above it, and lapping onto a table is not every pager's job.
- Dead squad card (96 lines) gone; `cooldownKey` folded into `pluralKey`; Squad › Tactics stopped boxing a
  pitch that brings its own frame.
- **`ui/BottomSheet.tsx`: I counted four hand-rolled sheets and there were THIRTEEN.** They agreed on the
  shape and disagreed on every value. Five are converted, including `SlidePanel`, which keeps its name and
  delegates — so the remaining eight are each a one-file change against a written spec rather than a judgement
  call. **Worth grepping for the shape before estimating a de-duplication: the count was 3× my estimate.**
  Two of the converted sheets lose a 4dp `accent` top border and a `panel` fill, which were outside the rules
  (`accent` is `PixelDialog`'s), and `SlidePanel` loses a gold title that was over §5's budget — deliberate
  alignment, and the one visual change here worth an eye on device.
- **Ten call sites now; three are deliberately not converted.** `PostChallengeSheet` and `HubTrophyCabinet`
  are tournaments-module components with their own palette and fonts, so core chrome would clash;
  `YouthEnrolmentModal` has no `onClose` at all — it is an interrupting modal that happens to sit at the
  bottom, which is `PixelDialog`'s role, not a sheet's. **A primitive that fits ten of thirteen is the right
  answer; forcing the other three would have been the wrong one.** `LeagueScreen`'s sheet is the single open
  case: its drag handle implies a gesture it does not have, and its gold is over budget.

## 2026-10-30 (eighteenth pass) — table headers are sized too (`05_ui`)

- **Commit:** on top of `16d5a4d4` (`development`). Stage touched: `05_ui` (`output/patterns.md`).

Asked to fix Squad's "WKS LEFT", which needed 68dp in a 29dp box. **Measuring every header found seven of
fourteen truncating at rest** — NAT, AGE, MOR, GLS, AST, FORM and that one.

- **The rule `patterns.md` already stated was not being applied to my own table.** It said a header is drawn
  in the same box as its cells; I had sized `SQUAD_COL` to content alone and recorded the one header I knew
  about as a known issue. A width is `max(content, header)`, and **three capitals at `headerStep="data"`
  cost 25.5dp** — more than a flag, a morale chip or two digits, so narrow columns are header-driven far more
  often than they look.
- **The guard is the fix, not the widths.** The test now asserts every header against its own box; without
  it the next table repeats this exactly.
- Headers beat names in the trade: FORM's NAME column lost 18dp (103 → 85). A truncated name is ordinary and
  the row opens the profile; a truncated header leaves the column unlabelled.
- The sort arrow (17dp on the active column) still does not fit and deliberately is not designed for —
  asserted so it reads as a decision. Transfer › Search has shipped that way since 2026-10-26.
- ⚠️ **`apply-overrides` is additive-only, so a copy CHANGE cannot go through it** and CLAUDE.md forbids
  hand-editing the catalog. The path is a new key with the old one orphaned (`screen.squad.col.wks`), which
  is what every other copy change this week also did.

## 2026-10-30 (seventeenth pass) — save-slot balance units (engine)

- **Commit:** on top of `b703517c` (`development`). Brief:
  `docs/design-briefs/save-game-integration.md` §1.

Two compensating errors: `saveToSlot` stored `(club.balance ?? 0) * 100` as "pounds → pence" when
`club.balance` is already pence, and the save card divided by 100 again — so the display was right and
the data was wrong. Both halves fixed together.

- **The version marker is the whole trick.** `SaveSlotMeta.metaVersion` (1 = balance is true pence), and
  `slotBalancePence(meta)` applies it. **Slots already on a device cannot be rewritten**, so fixing the
  write alone would have made every existing slot read 100× too high — a visible regression for anyone
  with a save. With the marker both eras display the same figure, which is what the test asserts.
  **Reach for a format version, not a heuristic, whenever stored data changes meaning.**
- A test had locked the bug in, asserting `50000 * 100` with a comment calling `club.balance` "pounds".
  **A test can encode the misunderstanding as firmly as the code** — the second time today a suite
  agreed with a bug (the facility effect labels were the first, by having no test at all).

## 2026-10-30 (sixteenth pass) — the loan limit becomes a total cap (engine)

- **Commit:** on top of `ed567942` (`development`). Brief:
  `docs/design-briefs/finances-loans-integration.md` §3.

`takeLoan` compared the incoming amount against `getLoanLimit(valuation)` and **never summed existing
loans**, so debt stacked without limit. The Loans redesign had just shipped copy saying "per loan",
turning an untold loophole into a documented feature; the owner's call was to close it.

- **The cap counts principal still owed, not total repayable.** `outstandingPrincipal` is
  `amount × weeksRemaining / termWeeks` — repayments are flat, so principal comes off evenly and that
  is exact for this model rather than an estimate. **Excluding interest is the load-bearing choice**:
  count it and the amount you can borrow shrinks when you lengthen the term, so "Max" would jump every
  time the term picker moved. Same borrowing, different cost.
- **The sheet validates against the headroom before the press** (`quote` takes `outstandingPence`), so
  it can never offer an amount the store then refuses — the post-press failure that screen was rebuilt
  to remove. Presets and the stepper clamp to the headroom too.
- The summary leads with what you can still borrow rather than the cap, which would read as available
  when it is not.

## 2026-10-30 (fifteenth pass) — every league gets season history (engine)

- **Commit:** on top of `e5f05c95` (`development`). Stage touched: none directly; the behaviour belongs with
  `04_interfaces`/`07_synthesis` if it outlives `docs/design-briefs/pyramid-browse-integration.md`.

**`addSeasonRecord` had one caller writing one record a season — the AMP's own league.** Every other rung of
the pyramid read "No record" forever, which is what made Pyramid › Browse's new champion half empty on all
eight tiers of a first-season save.

- **The data was already being computed and thrown away.** `buildSeasonReviewData` built a full final table
  for every league and kept only the champion and the promoted/relegated lists.
  `buildLeagueFinalTables(season)` is extracted from it so both share one derivation.
- **Timing is the whole constraint.** `buildLeagueStandings` reads the live fixture store, and
  `recordSeasonHistory` runs AFTER the transition has replaced it with the new season's — the same reason
  `finalPosition` is re-read from `store_state` right above that call. So the tables are captured in
  `SeasonEndOverlay` and carried on the snapshot, which is already the "captured before mutations" vehicle
  (`displayStandings` rides there). A table with no games played is dropped rather than written, so a retry
  after a partial failure records nothing instead of a pyramid of 0-0 draws.
- **`history` stays keyed by tier** — it is persisted, and four screens read it — but records gain
  `leagueId` and the store gains `getLatestByLeague`. **A tier can hold several leagues, so tier alone can
  never identify one**; `getLatestByTier` now returns whichever league was appended last and is only right
  where the caller genuinely means "this tier". Pre-2026-10-30 records carry no `leagueId` and deliberately
  match nothing: one blank season on an existing save, versus showing another league's champion.

## 2026-10-30 (fourteenth pass) — Season-end teletext, mounted (`05_ui`)

- **Commit:** on top of `2cbcc160` (`development`). Brief:
  `docs/design-briefs/season-end-integration.md`.

`SeasonEndTeletext.tsx` had been in the repo since 2026-10-28 with **no call sites outside its own
test** — `design-system.md` said so and it was still true. The wiring pass is done:
`SeasonEndOverlay.tsx` goes from 1,192 to 668 lines, a variable-length slide deck (8 with 4 tiers,
12 with 8, every champion twice, your own season last) becomes six fixed pages behind an index.

- **Both of the drop's blocked questions were answerable in the repo all along**, and the 84 strings
  it needed — 64 teletext plus 20 step label/description keys — were already merged. The only thing
  genuinely missing was the screen pass. **Worth checking before assuming a deferred drop is
  blocked.**
- `design-system.md`'s companion claim, that the profile parts are "mounted only for the promise
  sheet", is now stale — `app/player/[id].tsx` and `app/staff/[id].tsx` both use `ProfileHero`.
- The one change beyond mounting: **the loading phase loses its stadium photo**, because P599 is a
  text page in this design. Raised with the owner and **confirmed: the teletext page stays plain**.
  Noted in the brief in case it is revisited — `StepIndex`'s rows paint no background, so a photo
  would show through behind the step list with only the masthead and strips over it.

## 2026-10-30 (thirteenth pass) — Pyramid › Browse and Save Game (`05_ui`)

- **Commit:** uncommitted at the time of writing, on top of `8c8c3009` (`development`), alongside
  the twelfth pass. Briefs: `docs/design-briefs/pyramid-browse-integration.md`,
  `…/save-game-integration.md`.

**Two findings worth carrying past these screens.**

- **The champion half of Pyramid › Browse is dead on almost every card, and it is an engine gap.**
  `addSeasonRecord` has exactly one caller — `recordSeasonHistory`, which writes ONE record per
  season for `snapshot.currentLeague`, the AMP's own league. No NPC league ever gets history, and
  `leagueHistoryStore` is keyed by tier alone. So only tiers the AMP has played in ever show a
  champion; on a first-season save, none do. Fixing it means writing a record per league at season
  transition and keying the store by league id.
- **Two compensating money errors in the save-slot meta, and a drop that proposed to fix only one.**
  `SaveGameService` stores `(club.balance ?? 0) * 100` as "pounds → pence" when `club.balance` is
  already pence, and the save-game card divided by 100 again — so the displayed figure is right and
  `SaveSlotMeta.balance`'s `// pence` comment is wrong. The drop read only the display half and
  reported "100× too small"; its fix would have shown 100× too MUCH. **Lesson: when a drop reports a
  unit bug, check the write side before believing the read side.** Both halves now carry the
  explanation; correcting it rescales every slot already on a device, so it is the owner's call.
- Also: the drop's `lastFive` assumed top-level `homeGoals`/`awayGoals`; this app keeps them on
  `Fixture.result` (null = unplayed). Its generic made those optional, so it **typechecked and
  returned `[]` forever** — a form row that silently never appears. Rewritten, with the test's
  factory now building real fixtures.

## 2026-10-30 (twelfth pass) — Facilities, and the pitch-stripe fill fix (`05_ui`)

- **Commit:** uncommitted at the time of writing, on top of `8c8c3009` (`development`). Stage
  touched: none directly; the findings below belong in `05_ui` and `07_synthesis` if they outlive
  the briefs.

Integrated `assets/Components/facilities` (option 1b) — the first drop that shipped **pieces plus a
wiring checklist** rather than whole files, because `FacilityCategoryScreen.tsx` was ~1,000 lines.
It is now 706. Report-back: `docs/design-briefs/facilities-integration.md`.

- **The facility cards had been telling the player numbers the engine does not use, for all six
  labelled facilities — found here and fixed in the same pass.** `computeFacilityEffects` reads
  `FacilityTemplate.gameplayEffects` (backend supplied, present on nearly every facility) and never
  read the client's `LEVEL_BENEFIT_LABELS`; every one of the six disagreed, and nine facilities said
  nothing at all. `facilityEffectCopy.ts` now derives all of it from `gameplayEffects`.
  **The guard worth copying: its test PROBES the real aggregator** — feeding it a template carrying
  one key at a time — to assert both that every field we render reaches a total, and that a field it
  ignores (`youthDevelopmentBonusPerLevel`, which `youth_academy` ships) is never rendered. Neither
  list can drift from the engine, and no new backend field can appear on a card as a promise nothing
  keeps.
  Two things only rendering the output showed: seats and income must keep the headline (a stand
  carries XP/cohesion/loyalty terms too, and leading with them hid its seats), and
  `injuryProbabilityDelta` is meaningless raw — stated as a share of `baseInjuryProbability` it
  reveals that three medical facilities zero out injuries at level 1 on the shipped numbers.
- **The site name reuses the drawer's keys** (`menu.facilities.*`) instead of adding four more:
  two names for one site is the drift this codebase keeps paying for.
- **`audit-tokens` earned its keep.** After splitting six count-dependent strings (including
  "2 stand closed", wrong in the common direction) it named the three call sites still pointing at
  the vanished base keys, with line numbers. Run it after every split, not just after adding keys.

### The pitch stripes did not fill their container (`PitchBackground`)

Reported from the device against Squad › Tactics, and **measured from the screenshot**: the unpainted
strip was 11.3dp on the right against 12dp of `paddingHorizontal`, and 17.7dp at the bottom against
`paddingTop` 12 + `paddingBottom` 6 — exactly the padding, all of it bottom-right.

**Cause:** the stripes are an `<Svg style={StyleSheet.absoluteFill} width="100%" height="100%">`.
`absoluteFill` anchors the element to the root's PADDING box; the `100%` resolves against its CONTENT
box. Any padding on the root therefore goes unpainted. **Pre-existing** — `XIFormationPitch` has
always had that padding — but invisible until the pitch moved from the dark page background onto a
`surface` card in the eighth pass. `PitchAvatar`, the only other caller, passes `width`/`height` and
no padding, which is why it never showed.

**Fix:** the caller's padding moves to an inner view, so content box == padding box and the stripes
fill either way — deliberately robust to which box `react-native-svg` resolves against, since that
cannot be tested from here. `splitPadding` in `pitch.ts` carries the measurements; four tests,
including one pinning the sprite case.

**The lesson worth keeping: a transparent background makes a sizing bug invisible until something
opaque moves behind it.** The bug was years old and only a change of backdrop revealed it.

## 2026-10-30 (eleventh pass) — Finances › Loans (`05_ui`)

- **Commit:** uncommitted at the time of writing, on top of `eedc9c4a` (`development`),
  alongside the seventh to tenth passes. Stage touched: none directly.

Integrated `assets/Components/finances-loans` (option 1b). Report-back:
`docs/design-briefs/finances-loans-integration.md`. Backers template for the page, and the
take-a-loan modal becomes a bottom-sheet quote builder that reads amount → term → quote.

- **Two helpers exist for "the date N weeks ahead" and NEITHER fits a loan payoff**, so the
  drop's relative "Season +2, week 34" is the only correct option rather than a fallback.
  `getGameDateDisplay(week)` rides `getGameDate` — the drifting anchor the binding rule names,
  164 days out at week 179. `dateForWeek(gameDateIso, currentWeek, targetWeek)` uses the right
  anchor but its own comment says *"only use it for near-term weeks … rather than dates several
  seasons out"*, and a 1–5 year loan is 52–260 weeks out. **The trap for a future cleanup: this
  looks exactly like a place to swap in `dateForWeek` and delete the string.**
  **`StaffMiniView`'s contract-end date is an existing instance of the drifting anchor reaching
  the player** — same class as the age bug the rule was written for, still unfixed.
- **The loan limit is per loan, and the new copy says so — a decision, not a bug fix.**
  `takeLoan` compares only the incoming amount against `getLoanLimit` and never sums
  `state.loans`, so loans stack without limit. The old screen's "CURRENT LIMIT: £700,000" read
  like a total cap, so the stacking was an untold loophole; "up to £700,000 **per loan**" makes
  it a documented feature. If a total ceiling was ever the intent, the fix is in the store, not
  the screen. Flagged for the owner, deliberately unchanged.
- **A restated formula is acceptable when a test pins it to the original.** `weeklyRepaymentFor`
  duplicates `takeLoan`'s expression *and* its private `WEEKS_PER_YEAR`, but the test calls the
  real `takeLoan` and asserts equality for all five terms — a stronger guard than extracting the
  constant, since it covers the whole expression. Contrast the fourth pass's repair threshold,
  which had no such test and so had to be de-duplicated.
- Two more latent plurals split, one of them spoken: `screen.loans.termA11y` read **"1 years at
  3.5%"** to a screen reader, and 1 year is one of the five selectable terms.
- **There is no shared bottom-sheet primitive, and there are now four hand-rolled ones**
  (`CoachPickerOverlay`, `AssignMissionOverlay`, Office › Hire's role sheet, this). Same
  "promote on the second use" argument `HangTab` just won — worth a `BottomSheet`, not as part
  of an integration.

## 2026-10-30 (tenth pass) — Finances › Investors / Sponsors (`05_ui`, i18n)

- **Commit:** uncommitted at the time of writing, on top of `eedc9c4a` (`development`),
  alongside the seventh to ninth passes. Stage touched: none directly — the new shared
  `src/i18n/plural.ts` is noted here and in `locales/en/README.md`'s territory rather than a
  stage output.

Integrated `assets/Components/finances-backers` (option 1b). Report-back:
`docs/design-briefs/finances-backers-integration.md`. Two screens that had drifted into separate
bespoke layouts now share one `DashCard` template, a card per backer, dashed open slots.

- **`PieChart` does not exist in lucide 0.475.0 — it is `ChartPie`.** The chart family was
  renamed upstream. Nothing else in the app referenced either name, so there was no local
  precedent; `tsc` caught it. **Third drop in a row with a `tsc` error on its own verify line.**
- **`useClubMetrics().totalValuation` is pence**, confirmed three ways (its own `// pence`
  comment, `AssignMissionOverlay`'s explicit `penceToPounds`, and `getLoanLimit` returning a
  `…Pence`). The drop flagged that "if it's pounds, the shipped comparison was already wrong" —
  it isn't, and the buyout maths was right all along. Worth recording because the money binding
  rule makes this the first thing to doubt.
- **Backer offers arrive through the inbox and nowhere else** — their own `inbox.category.investor`,
  `message.gameLoop.investorOffer.*` copy, accepted via `InboxResponseHandlers` (the path
  `EventQueueOverlay` shares). There is no screen for browsing backers, so the open slot's copy
  is the whole truth; a link to `/inbox` was deliberately not added, since it is a dead end in
  any week without an offer.
- **The plural selector is now shared: `src/i18n/plural.ts`'s `pluralKey(base, n)`.** Three
  screens needed it in one day (requests, mission finds, sponsor weeks), so the ternary lives
  once; `requestCountKey` / `missionMetaKey` are one-line wrappers. Its test also adds the
  catalog-wide check **no `.one` / `.other` family is missing a half** — the failure no
  per-screen test could see. `cooldownKey` (committed) still open-codes it, deliberately
  untouched.

## 2026-10-30 (ninth pass) — Transfers › Scouting (`05_ui`)

- **Commit:** uncommitted at the time of writing, on top of `eedc9c4a` (`development`),
  alongside the seventh and eighth passes. Stage touched: `05_ui` (`output/design-system.md`,
  the HangTab row).

Integrated `assets/Components/transfers-scouting` (option 1b). Report-back:
`docs/design-briefs/transfers-scouting-integration.md`. DOF hero via the shared `ProfileHero`,
the directives card as two faces (the DOF's brief / your form), scouts as mini cards with a
hanging mission flag.

- **`HangTab` is promoted to `ui/HangTab.tsx` — on this design-system row's own standing
  instruction** ("Promote to `ui/` when a second card uses it"), now that `StaffMiniView` hangs
  a scout's flag. The row describes the promotion instead of asking for it, and `StaffMiniView`
  took an additive `tab?={{ label, fill }}` whose margin is 0 when absent, so no existing caller
  moved. `TAB_HANG` is **derived** from `playerMiniLogic`'s `LAYOUT.tabHang` rather than
  restated as a literal 10 — same reflex as the fourth pass's repair threshold.
- **No `Button variant="secondary"`** — the drop guessed it, `tsc` rejected it. `teal`
  (`surface` fill, `stroke` border) is the app's neutral filled button and `Button`'s default,
  and is what both buttons use. **Adding a `secondary` would have been the wrong fix:**
  `Button.tsx` names `matchAction` and `dangerOutline` as deliberate one-screen exceptions and
  warns twice against a general-purpose neutral/outline variant.
- **Second drop in a row with a single count-dependent string** ("{finds} finds" → "1 finds").
  Split with `missionMetaKey`. The convention — no ICU, a `.one`/`.other` pair plus a selector
  helper — is now written down in my notes; expect to answer it again.
- The drop also fixed a state worth knowing: with `ownedBy: 'DOF'` and the DOF **sacked**, the
  shipped screen disabled TAKE CONTROL on `!dof`, so the only control that could unlock the
  directive was disabled by the absence that made it necessary.

## 2026-10-30 (eighth pass) — Squad › Tactics, opinion first (`05_ui`)

- **Commit:** uncommitted at the time of writing, on top of `eedc9c4a` (`development`),
  alongside the seventh pass. Stage touched: `05_ui` (`output/design-system.md` §3,
  `output/design-system-notes.md`).

Integrated `assets/Components/squad-tactics` (option 1c). Report-back:
`docs/design-briefs/squad-tactics-integration.md`. The opinion card moves to the top and holds
the formation/style pickers; the First XI pitch goes last.

- **`SURFACE.default` does not exist** (the domains are `club` / `match` / `people`) — a `tsc`
  error on the drop as delivered, for the fit meter's unlit cell. The Fans noise meter, which
  the drop cites as its pattern, answers it: an unlit bar is `SURFACE.club.inset`. **Second drop
  this week whose own `tsc` line had not been run.**
- **`t()` has no plurals, but the house pattern does**: a `.one` / `.other` pair picked by a
  selector helper — `cooldownKey` → `screen.staffOffice.cooldown.one`/`.other`, shipped in the
  fourth pass. So the drop's placeholder "{n} requests" is split rather than carried forward,
  via `requestCountKey(n)`. **Worth remembering as the answer to the next "is there a plural
  helper?": not ICU, a key pair plus a selector in the screen's logic file.**
- **The "one-off" `fontSize` escape hatch has quietly become a sixth size — measured, 16 sites
  across 10 files, all `fontSize: 28` on `step="hero"`.** §3 said "it is not a way to
  reintroduce a sixth size"; it was. The rule now carries the count and the instruction:
  treat a new 28 as reuse, promote it to `TYPE`, sweep the 16 — don't make it 17. Not done here
  (10 files, outside an integration).
- The drop's second blocked question ("Manager's / Club, or the club's setting with 'Manager
  plays 4-3-3' under it?") now has a consistency answer it couldn't have had: the First team
  deck from the seventh pass uses the identical model, so changing this one would make two
  screens disagree about the same pair of facts.

## 2026-10-30 (seventh pass) — Squad › First team control deck (`05_ui`)

- **Commit:** uncommitted at the time of writing, on top of `eedc9c4a` (`development`). Stage
  touched: `05_ui` (`output/patterns.md`, the mobile-table rules).

Integrated `assets/Components/squad-first-team` (option 1c). Report-back:
`docs/design-briefs/squad-first-team-integration.md`. Three fixed strips become one control
deck that is the table card's top edge.

- **The column widths did not add up, and inline widths are why nobody could see it.** The
  drop's six fixed FORM columns summed to 278 of the 334dp a 360dp screen has, leaving NAME
  **43dp — five glyphs**. Hoisted into `SQUAD_COL` (one tested table, the rule `patterns.md`
  already carried with `SEARCH_COL` as precedent) and sized to each column's widest real
  content: NAME is 103dp there now. **The lesson is in the rule now: the sum is the thing that
  breaks, and only a table makes the sum visible.** `patterns.md` also gained the arithmetic
  every such table needs (table width, text box, and VT323's 0.5-em advance) and a new rule
  that **a header is sized by the same box as its cells** — Squad's 8-glyph "WKS LEFT" cannot
  fit any column that narrow, which is recorded in the test rather than renamed, since copy is
  not mine to change.
- **Both of the drop's blocked questions had answers in the catalog, and they resolve
  oppositely.** The playing-style labels already exist as `screen.mandate.style.*` and are
  **the same datum** — Mandate is where the player sets what this tile reads back — so they're
  reused and the bare-English map is gone. The column words also partly exist as `common.*`,
  and there the answer is *don't*: `locales/en/README.md` says two screens' copy matching today
  doesn't mean it always should, so the per-screen `screen.squad.col.*` set stays whole.
- **A sub-44dp control gets `hitSlop`, not a redesign.** The drop flagged its 36dp position
  chips and offered to make them 44; `hitSlop 4` reaches the same target and moves nothing on
  screen, which is how the runway chart's ticks and `SearchRowTabs`' intel tab already do it.

## 2026-10-30 (sixth pass) — MoraleIcon at 16-bit (`05_ui`)

- **Commit:** uncommitted at the time of writing, on top of `7ad48c32` (`development`). Stage
  touched: `05_ui` (`output/design-system.md`, the MoraleIcon row).

Integrated `assets/Components/morale-icon` (option 1d). Report-back:
`docs/design-briefs/morale-icon-integration.md`. Morale is a 14 × 14 chip at 0.5 dp/px instead
of a 7 × 7 sprite at 1 dp/px — the same 14dp box, so none of the six call sites moved.

- **A drop may overturn a documented rule, and this one does: "no outline" is reversed for
  morale.** The reason it is right is the chip rule (`Badge`, `ResultChip`: light fill →
  `stroke` ink), and what the old rule cost is why the row now records it — with no frame the
  tier colour WAS the glyph, so tier 4's green vanished on the Fans hero's `positive` fill.
  Motivation keeps no outline; that assertion moved from `renderMorale` to `renderMotivation`
  rather than being deleted.
- **The drop's own `tsc` line had not been run.** `chipMask`'s grid inferred
  `('k'|'h'|'l'|'f')[][]` and rejected the tier-5 glint. Worth knowing *why* only one line
  tripped: the `stamp()` call above it already widened the grid silently, because TS arrays are
  bivariant — the narrow inference was never load-bearing. **Lesson: a drop's Verify block
  lists what should be run, not what was.**
- **Rendering the sprites, not reading the masks, is what confirmed the geometry** (and found
  that tiers 5 and 1 interpenetrate by two rows, so they are the busiest glyphs and the pair to
  check first on device). The type fix was proved inert by diffing the ASCII dump before and
  after.

Open: the two `scale={3}` call sites (Squad table, Fans hero) render at 1.5dp per sprite pixel,
whole at 2× density and half at 3×. `MoraleIcon`'s prop comment no longer claims "integer
only" — true of the 8-bit sprite, retired by this one.

## 2026-10-30 (fifth pass) — Office › Hire, rebuilt from the prototype drop (`05_ui`)

- **Commit:** on top of `c3444b6c` (`development`). Stage touched: `05_ui`
  (`output/navigation.md`, `output/design-system.md`, `output/design-system-notes.md`).

Integrated `assets/Components/office-hire` (option 1b of the Hire Lab). Report-back:
`docs/design-briefs/office-hire-integration.md`. Every item on the drop's own Verified /
Assumed / Guessed lists held, symbol by symbol, and both of its design-rule calls (fixed
column widths, gold on the active row) were already permitted — so no rule needed rewriting
and the gold count on this screen went *down*.

Three things worth carrying forward:

- **`?role=` now suppresses a UI, not just a default**, so every caller that means a specific
  role has to say so. `ScoutingHubScreen`'s HIRE button — sitting under "No Director of
  Football" — was pushing a bare `/office/hire`, which was invisible while the screen listed
  every role anyway and stops matching its own label the moment the screen opens on a picker.
  **The class: a caller whose behaviour was fine by accident, which only breaks once the callee
  gets an opinion.** Documented in `navigation.md`'s deep-link section.
- **`design-system.md`'s "`Pager` specified but still not built" was half-wrong by the end of
  it.** `HirePager` is the first conforming implementation (48×48 cells, 2dp dividers); that
  line now points at it rather than at the dashboard's older inline pager.
- **`design-system-notes.md`'s `StaffPitchAvatar` census had already drifted** — "18 renders
  across 17 files" measured 25 across 21 before this change touched it. Re-measured and the
  line now names the grep instead of carrying a number that nothing re-checks.

Still open and recorded in the brief: every device check, including the drop's own two guessed
measurements (a 100dp rating column holding "RECRUITMENT ▼" at 360dp, and the NAME column
ellipsising without pushing COST).

## 2026-10-30 (fourth pass) — the facility manager's repair threshold, restored (`04_interfaces`)

- **Commit:** uncommitted at the time of writing, on top of `beb16c79` (`development`). Stage
  touched: `04_interfaces` (`output/services.md`).

**A regression from `9a114145`, reported from the live screen.** The key-staff rebuild dropped
`StaffStatRow` from the role offices as redundant with the profile's ability card. For three of
the four roles it was. For the facility manager it was not: that row carried MAINTENANCE STYLE —
REACTIVE/MODERATE/PROACTIVE and "Repairs below {n}% condition" — which is the only place the
player learns *when* their manager acts, and ability is only half of what that row showed. The
lesson for the next consolidation: **before dropping a shared row as duplicated, check it per
caller — one of them may be passing a flag the others don't** (`showMaintenanceStyle`).

Restored on the CONTROL card, and **de-duplicated while restoring**. The rule had been written
twice, in two files, in opposite directions: `FacilityManagerBrain.assessRepairs` scored damage
against `60 - ability * 0.5`, while the UI printed `40 + ability * 0.5` as a condition. Both are
the same line, nothing connected them, and the UI one lived in a screen file. There is now one
exported `repairConditionThreshold(ability)` in the engine that both use, and a test pinning the
displayed figure to that function rather than to a literal. The arithmetic is unchanged and the
existing `FacilityManagerBrain` suite still passes, which is what makes that a safe refactor
rather than a behaviour change.

Three new keys for the band labels, which were bare English literals inside `maintenanceStyleInfo`
(`screens/office/shared.tsx`) — a function now reachable only from the dead `StaffStatRow`.

## 2026-10-30 (third pass) — Office › Fans (`04_interfaces`, `05_ui`)

- **Commit:** uncommitted at the time of writing, on top of `4c21b1da` (`development`). Stages
  touched: `04_interfaces` (`output/services.md`), `05_ui` (`output/patterns.md`).

The fan hero becomes a 20-bar noise meter on a dark board, attendance and recent events become
collapsible cards, and the two initiatives become compact rows
(`src/screens/office/FansScreen.tsx` + `fansScreenLogic.ts`). About ten gold uses go; HOST is the
only one left, which is correct — it is the screen's one primary action.

**The drop's biggest open question is answered, and the answer is the opposite of what it
feared.** It asked whether the fan tier actually moves income, having searched `FanEngine.getTier`'s
callers, found only `MoraleEngine` (±1 morale), and warned that `screen.fans.text.5`–`.9`
("Attendance: +20% Income" …) might be overstating a cosmetic number. It does move income:
`matchdayIncome.ts`'s AMP branch maps the five tiers onto 1.2/1.1/1.0/0.9/0.8 and applies that to
matchday revenue, which matches the copy exactly. No copy fix needed. **Recorded in `services.md`
with why the search missed it**, since both reasons recur: the call site is in `utils/` rather than
`engine/`, and it reaches its dependencies through `require()` inside a `try/catch` instead of a
top-level `import`, so neither an engine-scoped grep nor an import-graph search finds it.

New in `patterns.md`: `Collapsible` (a `DashCard` whose header is the toggle and carries a
*one-line summary of the contents*, not just a title) and `PixelSwitch`, both still local to
`FansScreen.tsx` and both flagged for promotion to `ui/` on a second caller.

**One "now unused" claim was wrong**: `common.last_5` is still used by `app/league/[id].tsx` — a
shared `common.*` key, so being unused on *this* screen says nothing. The other eight orphaned
keys check out (`screen.fans.text.3/4/13/15/16/18/20/26`). `PixelSwitch` turned out to be defined
locally in the drop rather than an assumed existing component, so nothing was missing there.

Still open from the drop, and genuinely blocked rather than unverified: **fan-base growth has no
on-device history**, so the new ATTENDANCE card tracks *attendance* (`useAttendanceStore`, up to
100 records, newest first) rather than fan count. `fanStore` keeps only the current `fanCount` and
the weekly snapshot goes to the API, so a true growth series needs the engine to record it.

## 2026-10-30 (second pass) — Office › Personal Assistant (`01_overview`, `05_ui`)

- **Commit:** uncommitted at the time of writing, on top of `68446ec4` (`development`). Stages
  touched: `01_overview` (`output/tribal-knowledge.md`, Q4 + its `CLAUDE.md` mirror), `05_ui`
  (`output/navigation.md`).

The four status panels become one CLUB AUDIT card whose rows carry their own levers
(`src/screens/office/AssistantScreen.tsx` + `assistantScreenLogic.ts`). Ordinary rebuild, with
one exception that is not ordinary:

**It was violating BINDING rule 5 in plain sight.** The dressing-room row interpolated
`Math.round(cohesion)` *and* `detectedCliques.length` into `screen.assistant.text.4` — "Cohesion
{n}/100 · {n} distinct groups forming" — which is the entirety of what that rule forbids, and it
had been doing so for as long as the 2026-10-27 source-reading guard existed. **The guard missed
it because it reads `MoralePane.tsx` and only `MoralePane.tsx`.** So the lesson recorded in Q4 is
about the guard rather than the screens: *a source-reading test protects exactly the files it
names, so adding a surface means adding it there in the same change.*
`dressingRoomLogic.test.ts` now reads both files; `screen.assistant.text.4` is orphaned.

Two smaller behaviour fixes carried by the drop: no cohesion data read as `UNSETTLED` and fed
the overall mood, so a **fresh save could never open healthy** — it is `NO_DATA` now and sits out
of the verdict; and the scouting check measures `scouting_center` level while no lever led to
`/facilities/scouting`.

**One thing the drop could not have known, found while integrating:** its MANAGER'S OFFICE lever
points at `/office/staff/manager`, which since `9a114145` redirects — and redirects with a
hardcoded `backTo` of the drawer's home, so the drop's own device check ("the back button returns
here") would have failed. `StaffOfficeScreen` now forwards a caller-supplied `?backTo=` and only
falls back to home, and the lever passes the assistant's own route.

Still English literals, all pre-existing and all listed by the drop as open questions:
`COHESION_TIERS[].label` in `cohesionSummary.ts` (read and sentence-cased here by
`sentenceCase()`, which exists only until those move to `t()`), and `FanEngine.getTier`'s
'Happy'/etc, interpolated into the shipped `screen.assistant.text.6`.

## 2026-10-30 — One back button, and the dead one it replaced (`05_ui`)

- **Commit:** uncommitted at the time of writing, on top of `9a114145` (`development`). Stages
  touched: `05_ui` (`output/design-system.md`, `output/navigation.md`).

**A claim written into `navigation.md` the previous day was wrong, and it shipped a dead
button.** It said the office redirect's `Redirect` "replaces rather than pushes, which is the
point: the profile's back chevron returns to wherever the drawer was opened from." `(app)` is a
Drawer inside the root Stack and `app/staff/[id]` is a root route outside it, so opening an
office pushes nothing onto the root stack and the replace lands on the `(app)` entry itself. The
stack became `[staff/<id>]`, `router.back()` silently no-opped, and users reported the back
button not working. Corrected in place with the rule it generalises to: **a `replace` across a
navigator boundary replaces the boundary, not the route you were looking at** — decide where
back goes explicitly before redirecting out of a Drawer screen.

Reported alongside it, and older than any of this: the back chevron is **easy to miss and often
takes two or three presses**. Seven routes each hand-rolled one at `size` 16/18/20/22 and
`hitSlop` 8/10/12 — a 32–44dp unlabelled target, against the app's own stated 44dp floor
(`SearchRowTabs`, `Pager`, `FastextBar` all say it). They now share
`src/components/nav/BackButton.tsx`: chevron + BACK label in a bordered `surface` box,
`minHeight: 44`, built from the token scales rather than literals. Its row in
`design-system.md`'s component table is the spec. Converting `league/[id]` also retired a gold
chevron (§5).

The decision lives in `src/utils/backNavigation.ts` as a pure function with its own test, not
inside the component, **because this failure is silent**: `router.back()` with nothing to pop is
a no-op, so a back button that goes nowhere is indistinguishable from one that was never wired
up. Same reasoning as the `showDialog` boot-gate rule — a control that fails without saying so
needs a test, not a careful reading.

Five dead imports came out of `app/staff/[id].tsx` on the way; four had been dead since the DOF
flag block was removed in `9a114145` and were missed there. `tsconfig.json` sets no
`noUnusedLocals`, so nothing flags these.

## 2026-10-29 (second pass) — Key staff CONTROL tab + Office › Club (`05_ui`, `02_architecture`)

- **Commit:** uncommitted at the time of writing, on top of `890df49a` (`development`). Stages
  touched: `05_ui` (`output/patterns.md`, `output/navigation.md`), `02_architecture`
  (`output/structure.md`).

Two drops integrated in one pass. **Office › Club** is an ordinary rebuild onto the card
system. **Key staff** is not: the four role offices
(`app/(app)/office/staff/{manager,director-of-football,chairman,facility-manager}.tsx`) stopped
being pages and now redirect to `/staff/<id>?tab=CONTROL`, a new tab on the staff profile. The
route files are untouched on purpose, so `menu.ts` and `menu.test.ts` still resolve them — the
redirect lives inside `StaffOfficeScreen`, below the route. `navigation.md` carries that and
its consequence: a route can now pass the route-integrity test and still render no page of its
own, so check the component, not just the file.

**No new BINDING rule.** Both drops were partly driven by existing ones — four more
bare-literal strings onto `t()` (9 new keys across the two), and gold removed from a Club Value
figure and a duty bullet that were neither "yours" nor "primary" (§5).

**One real bug fixed, in a place neither drop was aiming at:** RELEASE on a key staff member's
*profile* ran the generic `handleRelease`, which booked `staff_severance` with no
`ManagerSackingOverlay` and sent no vacancy inbox message — while the *office*'s RELEASE booked
`contract_termination` and did both. Which behaviour you got depended on which screen you used.
`staffDismissal.ts` now holds the one copy of each flow and both screens call it.

**Two type errors the drops' own "Assumed" lists got wrong**, both caught by `tsc` and both the
same shape — a union retyped by hand instead of imported, missing a member:

- `staffControlLogic.ts`'s `Association` omitted `'none'`, the fourth `StaffAssociation`
  (`@/hooks/useUnifiedStaff`). Behaviour was already right; the type was not. Widened, and the
  test now pins `'none'` and `undefined`.
- `clubScreenLogic.ts` typed the home kit as `Pick<KitOnlyConfig, 'primary' | 'secondary'>`,
  but `KitOnlyConfig` is `Pick<KitConfig, 'kit' | 'shorts' | 'socks'>` and carries **no colours
  at all** — the AMP club's colours live on the club record and arrive via
  `resolveClubKitConfig`, which returns the full `KitConfig`. Retyped to that.

Both drops' "Now unused" lists were checked by whole-word grep, and **one was wrong in a way
that would have broken a screen**: Office › Club's list offered `SectionCard` as possibly
removable, but `src/screens/squad/TacticsScreen.tsx` imports it from `office/shared`. It stays.
Genuinely dead after this pass, left in place: `StaffStatRow`, `staffMoraleColor` and
`staffMoraleLabel` in `office/shared.tsx`, and nine orphaned catalog keys
(`screen.staff.title.4`, `screen.staffOffice.text.9/10/11/14/16`,
`screen.staffOffice.label.25/29`, `common.extend_contract`, `screen.club.text`).

Still open, from the key-staff drop: **praise/criticise does not reach scouts**, because
`applyStaffInteraction` resolves its target from `coachStore` only and returns null for a scout
id (`StaffInteractionService.ts:142`). Covering them is an engine change. Two strings are
flagged placeholder copy (`screen.staffOffice.reserveSublabel`, which still names a function,
and `screen.staffProfile.control.readOnly`), and `OFFICE_ROLE_META`'s 15 labels/duties/vacant
warnings are still bare English — they predate the translation rule and were moved unchanged.

## 2026-10-29 — Transfers › Dashboard rebuild (`05_ui`, `02_architecture`)

- **Commit:** uncommitted at the time of writing, on top of `377be275` (`development`). Stages
  touched: `05_ui` (`output/patterns.md`), `02_architecture` (`output/structure.md`).

A prototype drop (`assets/Components/transfer-dashboard`, lab option 1c) replaced
`src/screens/transfers/DashboardScreen.tsx` and added `dashboardParts.tsx` +
`transferDashboardLogic.ts`. `05_ui`'s "Club dashboard cards" section gains a third surface on
that anatomy, with the three conventions the screen adds (a row is one press target; a
shortfall reads by shape as well as colour; fixed rows beat data-driven rows on a
"what's missing" surface).

**No new BINDING rule**, so `01_overview/output/tribal-knowledge.md` and its `CLAUDE.md` mirror
are untouched — but the rebuild was driven by two existing ones. It fixed a **pence/pounds**
breach that was visible to the player: `formatCurrencyWhole(contract_weekly_wage)` passed whole
pounds to a pence formatter, so the highest earner's £4,800/wk rendered as "£48/wk". The three
open-coded `* 100`s on that screen are now `poundsToPence()`. It also moved four strings
(`AVAILABLE`, `fee`, `FREE`, `/wk`) onto `t()`, and `common.form` ("FORM") was labelling the
*formation* — `common.formation` replaces it. Seven new keys via
`i18n:apply-overrides --only … --write`.

Two findings recorded rather than acted on:

- **`src/screens/transfers/shared.tsx` now has five dead exports** — `SalaryTile`,
  `PlayerMiniCard`, `ShortlistSpotlightCard`, `RecordRow`, `ScoutRow` — and
  `screen.shared.text.39` ("VIEW PLAYER") is the catalog key only the last of those used. The
  drop called its own search for other callers inconclusive; a whole-word grep over `src`,
  `app` and `scripts` now confirms nothing outside `shared.tsx` references any of them. Left in
  place so the rebuild's diff stays one screen.
- **`structure.md`'s `src/screens/` file count read 38 and is now 52** — already stale by 12
  before this change added two.

One behaviour change to know about: LATEST SIGNING used to go blank once the player had left
the club, because the card needed the player row even though the TransferRecord held the name,
fee and club. The ledger row now reads the record and only the face needs the player.

- **Commit:** uncommitted at the time of writing, on top of `a10ccd2f` (`development`). Stages
  touched: `05_ui` (`output/patterns.md`), `01_overview` (`output/tribal-knowledge.md`, Q4 +
  its `CLAUDE.md` mirror).

**New BINDING rule: a global overlay host must never sit behind a boot gate.** `DialogHost`
sat inside `{isFullyReady && ...}` in `app/_layout.tsx`, that gate never opened on device, and
so **every `showDialog()` in the app did nothing** — the save screen's LOAD and DELETE read as
dead buttons. Fixed by mounting it outside the gate (confirmed on device 2026-10-24).

Recorded as a rule rather than one bug for three reasons, all of which generalise: `showDialog`
is fire-and-forget so the failure is completely silent; the `<Stack>` renders outside the same
gate, so a shut gate looks like a normal working app with only its root overlays missing; and
the gate's `fontsLoaded` half was recorded in the boot timeline but never displayed, so it was
inferred wrong twice. **One `fonts` entry in the timeline is ambiguous** — "already true at
first commit" or "false and never flipped" — so read the `loaded` flag, not the entry count.

`05_ui`'s "Global dialogs" section is rewritten as a postmortem: both earlier fixes
(2026-10-23's "never mount a Modal already-visible", which was a no-op — RN's `Modal.render()`
returns null whenever `visible !== true`, so the native view is created on the flip either way
— and 2026-10-24's `statusBarTranslucent` removal, which had a consistent in-app 2x2 behind it
and was still wrong, and has since been REVERTED because it changed nothing and would
otherwise read as though it had mattered), the eliminated-with-evidence list, and the
on-device debug procedure through the two new CHECKS rows.

**Fixed in the same pass:** the gate is now `storesHydrated` alone, which restored
`GameCacheRepairOverlay` (the blocking cover over a half-loaded cache — the real exposure of
the four), `AdminMessageOverlay` and `WelcomeSplash`, and stopped `markBootComplete()`
waiting on fonts. `src/__tests__/nav/rootOverlayGate.test.ts` pins all of it by reading
`app/_layout.tsx`, since the thing to protect is a boot-time condition.

Still unfixed underneath it, and now reported rather than silent: **`useFonts` never settles
on device** — neither resolved nor rejected, and only the hang was ever fatal, since a
rejection would have opened the old gate via `fontError`. After 8s `app/_layout.tsx` marks a
`fonts_stalled` phase and raises a `captureWarning`, and CHECKS gained a "Fonts settled" row.
Suspect `require('../assets/fonts/FlagsColorWorld.ttf')`, the one local-asset font, given
`db07a2d4`'s OTA asset history. Unconfirmed. While it holds, the splash's text never fades
in — nothing else depends on it now.

- **Commit:** uncommitted at the time of writing, on top of `39386ab6` (`development`). Stages
  touched: `01_overview` (`output/tribal-knowledge.md`), `02_architecture`
  (`output/structure.md`), `04_interfaces` (`output/services.md`), `07_synthesis`
  (`output/architecture-notes.md`).

  **Production Sentry sweep, 19 events, 24 Oct 2026 — frontend half.** Written up in
  `07_synthesis/output/architecture-notes.md` under "The dead SQLite handle has THREE
  spellings". The headline is that the dead-handle matcher was fine; three separate paths
  were REPLACING the error before it could be matched (a blind `ROLLBACK` in
  `db.withTransactionAsync`, a throwing `finalizeAsync` in a `finally`, and the
  transactional branch of the Drizzle proxy callback never marking the handle dead at all),
  each leaving a session running with a connection that would never come back.

  **One new binding rule** (`01_overview`, Q4 item 8, mirrored into `CLAUDE.md`): never call
  `db.withTransactionAsync` — use `withSafeTransaction` from the new `src/db/transaction.ts`.

  Also here: `apiRequest` no longer calls `.json()` blind (an empty/truncated 2xx body is now
  a retryable network failure, not a `SyntaxError` nothing retries), non-JSON error bodies are
  kept on the `ApiError` instead of only logged, writes park while the app is backgrounded,
  and a connection is verified at open. **Open and deliberately held: `expo-sqlite` 57.0.4
  added a per-statement lock on `reset`/`finalize`/`getAll`/`step`; the app ships 57.0.2, and
  the bump needs a rebuild and a device pass, not an OTA. Tracked at the top of
  `07_synthesis/output/current-focus.md`, which was RE-SCOPED later the same day: diffing the
  two releases showed `run` (this app's only route to `sqlite3_reset`) was already locked in
  57.0.2 on both platforms, so the bump is hygiene rather than the fix for these frames.**

  That same re-check found and fixed a fourth dead-handle bypass: `reopenDatabase` was
  returning the SAME native connection (expo-sqlite caches connections by path plus options),
  so the recovery re-served the dead handle. `REOPEN_OPTIONS = { useNewConnection: true }` in
  `src/db/client.ts`, plus two tests in `clientRecovery.test.ts`. Unlike the bump, this one
  ships as an OTA. See `07_synthesis/output/architecture-notes.md`'s "Four ways the matcher
  was being bypassed", item 4.

  A later pass the same day added `src/api/concludeSeasonOutbox.ts` — durable delivery for the
  season archive, unblocked by the backend making conclude-season idempotent per club+season.
  See `04_interfaces/output/services.md`.

- **Commit:** uncommitted at the time of writing, on top of `39386ab6` (`development`). Stages
  touched: `03_data` (`output/schema.md`, `output/migrations.md`), `05_ui`
  (`output/navigation.md`).

  **Three fixes from the Tournament Hub's first device pass**, all in
  `docs/design-briefs/tournament-hub-integration.md` §7a. The one with schema consequences:

  **The match-result archive is deleted** — four tables dropped by migration
  `0015_majestic_sunset_bain.sql`, plus its repository, hook, screen and route. It only ever
  existed because no endpoint served a single match; `GET /api/matches/{matchId}` turned out to
  already exist on the backend and simply was not wired up. Nothing is migrated: every result
  those tables held is retrievable from the server under the same id, because **a cup fixture's
  id is its match id** (`MatchQueryService::findMatchDetail` resolves against the fixture
  repository). That fact is also what lets a `MATCH_RESULT` push now open the real result
  instead of archiving it.

  **`PushInboxService` is now a mechanism with no producers, and that is on purpose.** Both went
  this week — the archive here, and auto-accepted Cup rewards when rewards became an explicit
  tap. It is kept because the binding rule in `03_data/output/schema.md`'s `tables/pushInbox.ts`
  section still governs any future backend-delivered event, and a push carries no `X-Club-Id`.
  Anyone tempted to delete it as dead code should read that section first.

  Two smaller ones, no schema impact: a sparse `GET /api/club/hub` crashed the Dashboard through
  the root error boundary (lists are now normalised at the api boundary), and the Next Fixture
  hero rendered undrawn ties with a NaN countdown (now gated on a confirmed fixture).

  **Not a new BINDING rule.** The nearest candidate — "normalise a list the server may omit at
  the boundary, not in the consuming screen" — is a local design choice for one feature's api
  adapter, recorded in the brief. `01_overview/output/tribal-knowledge.md` and its `CLAUDE.md`
  mirror are untouched.

  **Caveat on this pass:** a concurrent `withSafeTransaction` refactor by another session was
  in flight across `src/db/**` throughout, so full-suite runs were red for unrelated reasons.
  Only `src/db/diagnostics.ts` is shared between the two changes (one line each).

- **Commit:** uncommitted at the time of writing, on top of `45776459` (`development`). Stages
  touched: `02_architecture` (`output/structure.md`), `04_interfaces` (`output/routes.md`,
  `output/services.md`), `05_ui` (`output/navigation.md`), `06_documentation`
  (`output/index.md`).

  **This pass's own change: the Tournament Hub prototype drop was integrated**, replacing the
  entire tournament UI. Behind the unchanged `debugLoggingEnabled` gate, so nothing is
  player-visible. Canonical writeup — every ported file's destination, the eleven integration
  problems, the behaviour changes, the drop's README §8 report-back and eight backend gaps:
  `docs/design-briefs/tournament-hub-integration.md`.

  Four facts worth carrying even if you read nothing else:

  1. **`apiRequest` cannot serve this feature, and routing it there would sign users out.** Its
     403 branch calls the forbidden handler; the hub 403s on ordinary outcomes like an
     unaffordable entry fee. `src/api/tournamentHttp.ts` is a second transport, on
     `telemetry.ts`'s precedent, and the only other place in the app that talks HTTP directly.
  2. **`@react-navigation/*` is not a dependency** — expo-router 57 vendors it. The drop's
     navigator was discarded; `src/utils/tournamentRoutes.ts` is now the single source of hub
     pathnames and `menu.ts` imports from it.
  3. **`recordActiveSaveRegistration` moved to `src/engine/TournamentHubApi.ts`.** It was inside
     the now-deleted `TournamentRegistrationService`, and losing it would have stranded every
     future `MATCH_RESULT` push silently. The same decorator owns every ledger write.
  4. **Two clocks now exist.** The hub runs on real server time; the game still has exactly one
     `gameDate` anchor. Nothing age- or season-derived may read the server clock.

  **No new BINDING rule.** The closest candidate — "money-moving hub mutations write their own
  ledger row because the client stays authoritative" — is an application of the existing money
  rule rather than a new one, and is stated in full in the design brief and in
  `04_interfaces/output/services.md`. `01_overview/output/tribal-knowledge.md` and its
  `CLAUDE.md` mirror are untouched.

  **Stages deliberately NOT updated:** `03_data` — no schema change. The tournament archive
  tables are unchanged and still written by `PushInboxService.ingestMatchResultEvent`, which was
  not edited; what changed is that **nothing lists the archive any more** (the History screen is
  gone), noted in `05_ui/output/navigation.md` instead. `07_synthesis` — its tournament-system
  gap note is now partly historical, but rewriting it needs a device pass this change has not
  had.

- **Commit:** uncommitted at the time of writing, on top of `2e4ed000` (`development`). Stages
  touched: `03_data` (`output/entities.md`), `04_interfaces` (`output/services.md`).

  **This pass's own change:** the **tournament registration snapshot was expanded** to send the
  club's real identity and ground rather than pre-sprite placeholders. `club` now carries the
  WHOLE `Club` object (spread in, with six deliberately-divergent names `Omit`ed on
  `TournamentSnapshotClub` so a `Club` change is a compile error rather than a silent payload
  gap), plus two resolved additions: `club.identity` — the kit/badge in exactly the
  `WorldClub.identity` shape the backend already sends for NPC clubs, from the new
  `resolveClubIdentity()` — and `club.stadium`, a complete `StadiumConfig`. Each player also
  carries its `appearance`. The legacy `badgeShape`/`homeKitStyle`/`awayKitStyle` trio is
  **still sent**, unchanged, as the same two fixed defaults, so nothing on the wire breaks
  before the backend reads `identity`; that trio is now the thing to delete, not a gap to fix.
  One new shared seam came out of it: `stadiumCosmeticConfig()` in
  `src/utils/facilitySpriteConfig.ts`, called by both `useSiteSpriteConfig` and the snapshot
  builder, so the scoreboard's visibility rule (hidden in an open transfer window or before any
  home game) is written once. Full field-by-field account in `04_interfaces`.

- **Commit:** `06350d8f` (`master`, `dev` and `development` all level here). Stages touched:
  `01_overview` (`output/environment.md`), `06_documentation` (`output/index.md`).

  **This pass's own change:** the **Google Play release-note format**, recorded because a
  draft was written without it. Play's "What's new" must be wrapped in an `<en-GB>` locale
  tag, is capped at 500 characters, takes plain text only, and ships British English. The
  section also records the two claims to avoid — a stadium capacity figure (it is
  `level × capacityCalculation`, and `capacityCalculation` is synced BACKEND config, so no app
  release can promise a seat count) and a load-time multiple (A5's 14x was one save; a bigger
  one read 10.7 s) — plus the distinction that matters most: notes belong to a **version
  bump**, not to a push to `master`, because `runtimeVersion.policy` is `appVersion` so a
  `master` push is an OTA that needs no notes, and bumping the version strands every installed
  build until a fresh one is distributed.

- **Commit:** `3b7e40f2` and the thirteen before it on `development`, pushed and fast-forwarded
  to `dev` (Stage 1 commits 6-8 of the Drizzle Phase 3 health engine, plus the P19 device
  pass). Stages touched: `01_overview` (`output/tribal-knowledge.md`), `02_architecture`
  (`output/structure.md`), `06_documentation` (`output/index.md`), `07_synthesis`
  (`output/current-focus.md`).

  **Handoff note, because this work is being put down mid-phase.** Stage 1 is finished and
  device-verified; the rest of Phase 3 is not, and the authority on what is left is
  `docs/drizzle/drizzle-migration-status.md` **§4 "If picking this up cold"**,
  rewritten 2026-10-22 as an ordered list grouped by who has to act: two device actions (an
  iOS CHECKS run, and collecting `squad.one_amp_club`'s clean readings), one small
  instrumentation gap (a duration on the boot health pass), two owner decisions (a post-init
  pass, and the first `fatal` invariant with a recovery surface), and seven parked or
  separately-owned items. **All three branches carry Stage 1** — `development` and `dev` are
  level and `master` was merged up the same day — so production has the engine; at the time
  of writing `master` trailed `dev` by two documentation-only commits. Verify with
  `git log --oneline origin/master..origin/dev` rather than trusting a written position: the
  equivalent line in §4 was wrong within minutes of being written, because a merge landed
  while it was being typed.

  **This pass's own change:** Stage 1 went from half-built to finished — a maintenance lock
  and a sentinel gate in `client.ts`, a `VACUUM INTO` backup module, and a registry that grew
  from 5 invariants to 11 with two candidates dropped. Three stage files needed it:

  1. **A BINDING rule changed, so `tribal-knowledge.md` Q4 and its `CLAUDE.md` mirror both
     did.** "Never nest exclusivity" now names `withMaintenanceLock` as a third way to do it,
     in BOTH directions, because neither is detectable at runtime: at the gate a repair's own
     nested write is indistinguishable from an unrelated writer. This is the first BINDING
     change since 2026-10-20, and the sync stayed one-way (`.context/` → `CLAUDE.md`).
  2. **`structure.md`'s `src/db/health/` entry said 5 files; it is 10**, and the entry now
     lists the 11 invariants, which two were dropped and why, the measured boot-pass cost
     (9 statements / ~9 ms against a budget of 12), and that `backup.ts` has no caller by
     design. Its `client.ts` line now mentions the lock, since that file is where the gate
     lives.
  3. **`current-focus.md`** gained the newest entry, including the live bug that registering
     `listed.has_club` turned up (a listed player whose contract expired stayed on the
     transfer list), the P19 device result, and the two things left deliberately undone — the
     first `fatal` invariant plus a recovery surface, and a post-init pass whose call site
     needs an owner lift.
  4. **`06_documentation/output/index.md`** described Stage 1 as "commits 1-4 shipped and the
     engine is still inert" in two rows and dated the pick-up doc to 2026-10-20. Both rows now
     say Stage 1 is complete and device-verified, the directory preamble points at §4 as the
     handoff list, and the `stage1-health-engine.md` row records that **two of that design's
     rows are now known to be wrong** — a reader who starts from the spec rather than from
     `registry.ts` would otherwise be misled about `checkpoint.not_hollow`.

  **Not touched, deliberately:** `03_data` (no migration, no schema change — Stage 1's
  remaining commits are JS only), `04_interfaces` (no route or service surface), `05_ui` (the
  CHECKS tab was not changed), `06_documentation` (`docs/drizzle/` is already
  indexed; its contents changed, its inventory did not).

  Not re-measured: `token-savings.md`. Content was appended to four existing `output/` files
  and no stage was restructured, so the standing measurement still holds.

- **Commit:** 64fb01f2 (previous pass; `master`, `dev` and `development` are all level here), plus this
  pass's own uncommitted changes. Stages touched: `01_overview`
  (`output/tribal-knowledge.md`), `03_data` (`output/migrations.md`), `06_documentation`
  (`output/index.md`).

  **This pass's own change:** bringing the Drizzle-migration documentation current after eight
  days in which Phase 3 did not move but the schema did. The work was mostly in
  `docs/drizzle/` (outside `.context/`), but three stage files were wrong and are
  now fixed:

  1. **`migrations.md` skipped `0010` entirely** — from `0009` straight to `0011`, while
     `schema.md` documented the `db_repair_ledger` table it creates. A gap in the migration
     list is the one kind of gap that file cannot afford, so it now has its own section,
     including the point that an *empty* ledger is the expected state (Stage 1 commits 1–4
     are detect-only; the writer is commit 5).
  2. **`migrations.md`'s preamble described a branch split that no longer exists** ("on
     `master`, six migrations exist; `development` carries four more"). All three branches
     carry all fourteen, `0000`–`0013`.
  3. **The ported-repository count was `44` in `tribal-knowledge.md` Q4** (and its `CLAUDE.md`
     mirror, re-mirrored one-way as the rule requires). It is **45 of 46** since
     `youthPoolRepository` landed on 2026-10-14 — ported from birth, which is now stated as
     the expectation rather than left as a fact about one file.

  Verified rather than assumed this pass: `npx tsc --noEmit` clean, **398 suites / 6,421
  tests** green, journal at 14 entries, `src/db/health/` has no importer outside
  `src/__tests__/`.

  Nothing in `02_architecture`, `04_interfaces`, `05_ui` or `07_synthesis` needed a change —
  no module boundary, route, store shape, design token or binding rule moved.

  **Second half of the same session — Stage 1 commit 5 (the health-engine boot hook).**
  Stage also touched: `02_architecture` (`output/structure.md`), plus a second pass over
  `03_data` (`output/schema.md`, `output/migrations.md`).

  `src/db/health/` had been a tested library that nothing imported since 2026-10-12.
  `useWorldInit` now runs its `boot` pass after `runPendingSeeds` and before hydration, via a
  new adapter `src/db/boot/healthCheck.ts` — the adapter exists because the engine imports no
  store by design, so the store write and the Sentry report have to live outside it. The
  CHECKS tab gained a `HEALTH — INVARIANTS` section rendering the boot pass alongside a live
  `full` one.

  Three facts worth having in `.context/`, none derivable from the code alone:

  1. **`src/db/boot/` and `src/db/health/` were undocumented in `structure.md`**, whose
     `src/db/` entry was also stale (84 files / 42 repositories; really 95 / 46). Both
     directories now have an entry, including the two boundaries the architecture test
     enforces — the engine imports no store, and app code reaches it only through the barrel.
  2. **The engine detects; it does not block boot**, and that is a decision rather than
     unfinished work: no invariant is `fatal` today, so a block path would be unreachable
     code in the boot path, and a false positive on an unenforced invariant costs an
     unbootable game with no recovery UI.
  3. **It cannot throw**, because `useWorldInit`'s catch *retries* the whole game-load path —
     a diagnostic able to double the boot it is diagnosing. `null` in `bootDiagnosticsStore`
     therefore means "did not run", never "found nothing".

  Verified: `tsc` clean, **399 suites / 6,440 tests** green (up 1 suite / 19 tests).

  **Third part of the same session — the data-path code review, cross-checked and folded in.**
  Stage touched: `06_documentation` (`output/index.md`).

  `docs/code-review/data-path-review-worklist.md` (2026-10-12, 15 findings) was uncatalogued
  and eight days stale. Re-verified every finding against `64fb01f2`: **none is fixed, all 15
  still hold.** Three facts worth keeping:

  1. **Finding 11 is a Drizzle item, not a code-review nit.** "Five dead `getDatabase()`
     aliases" is really **118 across 43 files** — Step Z's un-swept other half: removing the
     vestigial `db` parameter from 291 repository functions killed every call site's handle,
     and nobody swept the call sites. It is `drizzle-migration-status.md`'s defect 22 with a
     number, and `noUnusedLocals` (496 errors repo-wide) is the tool for both.
  2. **Three of the review's six lanes were unblocked by Phase 3 and nobody noticed** — C1,
     B3, A5 and A6 all resolved on 2026-10-12, which clears lanes C, D and F.
  3. **Finding 5 is defused by evidence the Drizzle work already had.** The review called the
     `development_log` cap the one finding that destroys existing player data; A7's device
     numbers (0.1 MB table-wide, every player inside the cap) say it has destroyed none.

  **Fourth part — data-path finding 7 implemented.** No stage output needed a change:
  `upsertPlayersWithClubs` is a repository internal, and no `.context/` file names it.
  Recorded here only because the next agent to read `playerRepository.ts` will meet a new
  shared helper, `upsertPlayerRowsInTx`, and should know why three sibling functions are
  deliberately NOT symmetrical — `upsertPlayersWithClubs` chunks both its passes, while
  `upsertPlayersWithForeign` and `upsertPlayersWithYouthPool` chunk only the player rows
  because their pointer inserts are `INSERT … SELECT … WHERE NOT EXISTS` guards with no
  multi-row form.

  Verified: `tsc` clean, **399 suites / 6,449 tests** green.

  **Fifth part — the club blob, recorded as debt.** Stage touched: `03_data`
  (`output/schema.md`, a third pass).

  Raised by the owner against this session's own conclusion. A `reputation_reanchor` seed
  sits outside the two seed lanes, and this work had closed that as "not a bug — it must
  run after hydration". The constraint is real but it is *caused* by a schema decision:
  `world_clubs` is `(id, league_id, data)` and `club_state` is `(id, data, updated_at)`, so
  **no club field is queryable**. Three problems being tracked separately all trace to it —
  the Stage 1 engine cannot check any club invariant (it imports no store by design), one
  seed is forced outside the lane system, and a projection cannot be narrowed on a
  one-column table, which is why §5.4's narrowing bought nothing. The asymmetry worth
  remembering: `players.reputation` and `leagues.reputation_tier` ARE real columns.
  Recorded as a debt note in `schema.md`; narrow first step scoped in
  `drizzle-migration-status.md` §2.8, not started.

  **Sixth part — a player's kit comes from their club.** Stage touched: `05_ui`
  (`output/design-system.md`).

  Reported from a scout report card: a French defender at an NPC club rendered in
  red-and-white stripes. `player.appearance` carries whatever kit the sprite generator
  seeded, not their team's. The non-obvious half, and the reason a per-call-site rule
  would not have held: **the club is not on the player.** `players` has no club column —
  the pointer is in `player_club` — so `playerFromRow` sets `npcClubId: null`
  unconditionally and every db-resolved player arrives clubless. That is exactly the
  population these cards are about (scouted players, shortlist reveals, DOF rejections),
  so the kitless fallback was the common path, not the edge case. Resolved in the shared
  card instead: `PlayerMiniCards`/`ResolvedPlayerMini` batch a `getClubsForPlayers` read
  beside the player read. Recorded as a BINDING rule in `design-system.md`.

  **Seventh part — stadium capacity, and a catalogue that had rotted.** Stages touched:
  `01_overview` (`output/tribal-knowledge.md`, two new binding rules, re-mirrored one-way into
  `CLAUDE.md`), `04_interfaces` (`output/services.md`).

  Capacity became `level × capacityCalculation` — a multiplier, as the admin field always
  claimed — replacing `round(baseCost / capacityCalculation) × level`. The old form derived a
  stand's SIZE from its PRICE, so repricing a stand silently resized the stadium and moved
  attendance, gate income and record-attendance history with it; it also used the config field
  as a divisor against its own label, and the app default (1000) disagreed with live (10000),
  so pre-sync and post-sync grounds differed tenfold. **The live value must now be 1000** —
  synced config, so a backend change, not an app release.

  Second rule recorded because it is the kind that rots silently:
  `FALLBACK_FACILITY_TEMPLATES` is a pre-sync mirror, and syncing it against the 2026-10-21
  export found **48 stale fields across 20 of 22 facilities**, several off by an order of
  magnitude. It breaks nothing — the backend wins once synced — but it is what anyone reads to
  understand the catalogue, and a test measuring the real economy from it was measuring a
  fiction: `reputationGrowthBaseline` moved 1.99 → 2.14 passive reputation per week once the
  true `technical_zone.reputationBonus` (0.2, not 0.05) landed. That baseline documents passive
  growth as "the whole problem"; production is worse than the figure it was written against.

  Re-measured: `token-savings.md`, **all seven stages**, three times this session. Four rows
  had drifted since the 2026-10-19 full pass before this one even started, not just the
  stages touched here.

- **Commit:** working tree on `development` (uncommitted at the time of writing), on top of
  21899d5f. Stage touched: `05_ui` (`output/design-system.md`, `output/patterns.md`).

  **This pass's own change:** matchux live-screen fidelity against the `matchuxV2` prototype
  drop, plus the root-cause fix for a sticky yellow commentary bar. Three facts are new to
  `.context/` and none of them is derivable from the code alone:

  1. **`withAlpha(color, alpha)` in `theme.ts` is now mandatory** for alpha-ing a palette
     token, because seven `WK` tokens already carry alpha and hand-concatenation built a
     10-digit hex. The non-obvious half is the failure mode: under Fabric an unparseable
     colour is silently dropped and the view **keeps its previous value** rather than falling
     back to transparent, with no warning. Recorded in `design-system.md`'s colour preamble.
  2. **`WK.pitch`** (`#2D5038`) — a deliberate green exception to the navy/plum chrome, for
     the one surface that is semantically grass.
  3. **The pitch markings are laid out in measured pixels**, with the prototype proportions
     written down in `patterns.md` so a later pass can re-derive them without re-measuring a
     screenshot.

  Nothing in `01_overview`, `02_architecture`, `03_data`, `04_interfaces` or `07_synthesis`
  needed a change: no binding rule, module boundary, schema, store shape or route moved.

  Not re-measured: `token-savings.md`. Two files in one stage changed; the standing
  measurement still holds.

- **Commit:** 03a12c60 (`development`) — "Play the match in portrait, and keep its sizes in one
  place", which is this pass's work; a concurrent agent committed its own `new-game-setup` drop
  separately as ff4f5485 (now HEAD) and that work is NOT documented here. Written while the
  matchux change was still uncommitted and updated afterwards, which is why this entry names a
  commit it is not contained in: the concurrent agent staged and committed both halves, keeping
  them in separate commits. A small follow-up (the attendance-string i18n fix below) is
  uncommitted on top at the time of writing.
- **Date:** 2026-10-19
- **Stages touched this pass:** 02_architecture (`structure.md` — the `matchux/` entry rewritten
  for the portrait layout: `layout.ts` as the single home for cross-file sizes, the new
  `PitchCommentary`/`CommentaryHistory`/`MatchTimeline` export shape, the removal of
  `LiveMatchTicker`/`TICKER_HEIGHT`/`EVENT_PANEL_HEIGHT`/the fixed 164pt panel width, and
  `RotateDevicePrompt.tsx` + the `'rotate-prompt'` phase deleted), 05_ui (`patterns.md` — the
  "MatchUX phase flow" section: the overlay is now portrait end to end, **with the previous
  landscape-lock rule kept as an explicit historical note rather than silently reversed**, since
  it had been written as a warning not to widen the lock; plus why the render-time phase reset
  must stay now that its original landscape-flash reason is gone, and the new
  `layout.ts`/360×640 budget rule), 07_synthesis (`current-focus.md` — a new newest entry;
  the two older entries that describe the landscape lock and `TICKER_HEIGHT` are left as dated
  history, superseded rather than edited)
- **Also updated:** `shared/token-savings.md` — a **full re-measurement of all seven stages**,
  not the usual targeted delta, because the file had not been re-measured since 2026-10-05
  despite seven intervening passes that wrote stage output. Every row had drifted;
  `04_interfaces` has overtaken `05_ui` as the most expensive stage to load. See that file's
  own note on why the "carried over, unchanged this pass" convention let it go stale.
  `shared/usage-savings-log.md` — one entry for this task.
- **Same-day follow-up (07_synthesis again):** the venue/attendance string was refactored onto a
  new single-unit key `component.liveMatchPitch.venueAttendance`
  (`"{stadiumName} · {attendance} ATT"`), replacing a reuse of
  `component.liveMatchPitchClock.text.2` that left the ` · ` separator hardcoded outside the
  catalog. Added to `manual-overrides.json`, merged with
  `npm run i18n:apply-overrides -- --only <key> --write`. **Worth knowing for next time:** that
  run also merged three `ngs.avatar.height.*` keys the concurrent agent had added to
  `manual-overrides.json` but not yet merged — `--only` scopes what one invocation adds, but it
  cannot stop a *concurrent* unscoped run from sweeping in everything pending, and the catalog is
  a shared file. When two agents are both adding strings, expect the catalog diff to contain the
  other's keys too, and check the diff rather than assuming `--only` isolated you.
- **Not stale, checked:** `05_ui/output/design-system.md` has no matchux references at all, so
  the portrait rewrite leaves it untouched; `03_data` and `04_interfaces` are unaffected (no
  schema, migration, store-state, route or service change — the drop is pure presentation and
  the public API of `MatchUXOverlay` is unchanged, so neither caller was opened).

---

- **Commit:** 7c231901 (HEAD, `development`) — plus uncommitted working-tree changes on top
  (the under-16 youth-signing fix documented in this pass)
- **Date:** 2026-10-19
- **Stages touched this pass:** 03_data (`entities.md` — `is_youth` is now a FLOOR enforced in
  `playerToRow.resolveIsYouth`, why the optional in-memory field + `is_youth = excluded.is_youth`
  leaked it away, `rejectIntakePlayer` no longer clearing it, and the
  `seedYouthFlagAgeBackfill` repair reading its anchor from the `calendar-store` blob rather
  than the unhydrated store), 04_interfaces (`services.md` — a correction notice on the NPC
  youth-lifecycle section, whose "an under-16 signed from the free list lands in the buyer's
  YOUTH squad — tested" claim held for `executeTransfer` alone and was undone downstream by
  `squadStore.addPlayer`; plus the FREE pool no longer excluding youth, and a second pass the
  same day retiring the orphan-making `marketStore.signPlayer` in favour of
  `commitInboxPlayerSigning` — with the finding that both its callers were already
  unreachable — and collapsing the two disagreeing youth-squad reads onto one query)

---

- **Commit:** 9169a68c (HEAD, `development`) — plus uncommitted working-tree changes on top
  (the 16-bit trophy sprite swap documented in this pass)
- **Date:** 2026-10-18
- **Stages touched this pass:** 02_architecture (`structure.md` — a new
  `src/components/trophy-sprite/` entry in the sprite family, the third application of the
  case-insensitive-filesystem naming rule, and the retirement of `TrophyImage`/
  `trophyColours`/`trophyAssetService`), 03_data (`schema.md` — the `leagues.trophy` column
  and why it is `text()` not `mode: 'json'`; `migrations.md` — the `0013_melodic_photon`
  entry, its hand-added backfill, the no-`json_object()` rule and the read-fold-not-seed
  decision), 05_ui (`design-system.md` — `TrophyImage` removed from the unmigrated-files list)

---

- **Commit:** 625d37cd (HEAD, `development`) — plus uncommitted working-tree changes on top
  (the youth-delegation feature documented in this pass)
- **Date:** 2026-10-18
- **Stages touched this pass:** 04_interfaces (`services.md` — step 6 of the youth-intake
  flow, plus a new "Youth delegation — `src/engine/YouthPromotionService.ts`" section),
  03_data (`state.md` — the `staff.data` blob rule that makes new `Coach` flags
  migration-free, and the imperative/`!== false` convention for delegation-flag defaults),
  07_synthesis (`current-focus.md` — dated entry)

---

- **Commit:** 1542b759 (`dev`) — plus uncommitted working-tree changes on top (the
  investor year-end dividend feature documented in this pass)
- **Date:** 2026-10-15
- **Stages touched this pass:** 04_interfaces (`services.md` — the `investor_dividend`
  category and payout path appended to the `dividend_draw` section, plus a new "Investor
  limits and equity — the real numbers" section recording the backend-vs-client config drift
  on `maxInvestorsByTier`/`maxSponsorsByTier` and the real 5/10/20% equity bands, then the
  size-driven per-season investor bonus — `computeInvestorBonus`, priced off the sponsor
  bands, re-rolled each season, paid through the Investment promise — and the pounds-vs-pence
  trap in the EasyAdmin sponsor band fields)

---

- **Commit:** 4add44988d3f21a89df1ccc66f3f7319bed3e316
- **Date:** 2026-09-18
- **Stages touched this pass:** 01_overview, 02_architecture, 03_data, 04_interfaces,
  06_documentation, 07_synthesis (full first warm after the previous `.context/` tree was
  deleted from the working copy — see the router's "Known gaps" section), plus `05_ui`
  (carried over from `master` into this stage's slot, not freshly generated — see
  `stages/05_ui/CONTEXT.md`)

---

- **Commit:** 2eee97d01a38d234d1b4e7e8277ddb59d7357d36 (HEAD) — plus uncommitted working-tree
  changes on top (the push-notification feature; see `07_synthesis/output/current-focus.md`'s
  "Newest, not yet committed" entry) — re-sync stage docs again once that work lands on a
  commit if its shape changes before then
- **Date:** 2026-09-19
- **Stages touched this pass:** 03_data (store count 52→53, persisted-store list), 04_interfaces
  (`routes.md` new `deviceTokens.ts` row, `services.md` new "Push notification services"
  subsection), 07_synthesis (`current-focus.md` new entry, `architecture-notes.md` persisted-
  store count fix) — all for the remote push-notifications-for-competition-triggers feature

---

- **Commit:** 38ad13734fb402f2c3b85ed2e83580dab0edcf8a (HEAD) — plus uncommitted working-tree
  changes on top (the tournament match-result archive feature below)
- **Date:** 2026-09-20
- **Stages touched this pass:** 03_data (`schema.md` new `tables/tournaments.ts` section —
  `tournaments`/`tournament_matches`/`tournament_match_lineups`/`tournament_match_events`,
  migration `0003_nice_guardian.sql`; `migrations.md` row added; `state.md`'s "Tournament state
  specifically" corrected — no longer "no tournament table in SQLite"), 04_interfaces
  (`services.md`'s push-notification subsection: new `MATCH_RESULT` push type), 05_ui
  (`navigation.md`: `tournaments/` added to the route tree, `tournaments/results/[fixtureId]`
  new route, "Two screens named History" → "Three") — all for the tournament match-result
  archive (client-side storage + History-screen archive UI for `TournamentMatchResult`
  payloads; see `docs/api/tournament-match-result-payload.md`). Transport (the `MATCH_RESULT`
  push contract and its payload shape) was confirmed by the backend team mid-session — see
  `07_synthesis/output/current-focus.md` if that entry exists yet, else treat this line as the
  record of it.

---

- **Commit:** e6d4617e3fbcbe96de7379cedb82a7667375f692 (HEAD) — plus uncommitted working-tree
  changes on top (the tournament hierarchy consolidation below)
- **Date:** 2026-09-21
- **Stages touched this pass:** 05_ui (`navigation.md`'s route-tree section rewritten for the
  new `tournaments/listings/`, `tournaments/listings/[templateId]`,
  `tournaments/instances/[instanceId]` routes, replacing `active`/`open`/`recently-completed`/
  `[id]`; "Three screens named History" note updated), 07_synthesis (`current-focus.md` new
  entry superseding the "split into four routes" note from the 2026-09-20 pass;
  `architecture-notes.md`'s tournament-gap section gained a new bullet on the client-side
  `templateId`-grouping stopgap) — all for consolidating the flat Active/Open/Recently
  Completed tournament screens (added earlier the same branch) into a nested
  Home → Listings → Type Landing → Instance Detail hierarchy per a hand-drawn wireframe spec.
  Two dependencies evaluated and rejected for the bracket view
  (`@oliverlooney/react-brackets` — DOM-only; `react-native-tournament-bracket` — unmaintained
  2022 beta, major `react-native-svg` mismatch) in favor of a small in-house
  `TournamentBracketView`. `templateId` (the type-grouping key) is a genuine backend
  prerequisite not yet shipped on every instance shape — flagged in both touched stages, not
  silently assumed complete.

---

- **Commit:** 32f057fa4b8348de2636f583f6c7f78a3a8a6831 (HEAD, pushed to `competition` and
  `dev` — the `dev` push is a real OTA per `CLAUDE.md`'s deployment table)
- **Date:** 2026-09-21 (same day as the entry above — a same-day follow-up round after the
  backend team closed out the gaps that entry flagged)
- **Stages touched this pass:** 05_ui (`navigation.md`'s route-tree section: fixed the
  `TournamentInstanceStatus` values — confirmed live against `api.dev.buildmyclub.co.uk` as
  `registering`/`scheduled`/`running`/`completed`/`cancelled`, not the `'open'`/`'running'`/
  `'completed'` previously guessed; documented `entryFeePerRound`/`prizes`/`entrants[]` landing;
  noted `TournamentFixtureList.tsx`/`EntrantCrest.tsx` deleted as now-unused), 07_synthesis
  (`current-focus.md` updated to "committed and pushed", new fixes summarized;
  `architecture-notes.md`'s tournament-gap bullet updated from "stopgap" to "resolved") — for
  four of the five backend gaps flagged in the entry above being closed same-day: `templateId`
  on every instance shape, `entryFeePerRound`/`prizes.victorPrize` (pence) added to
  `TournamentSummaryFields`, `entrants[]` (badge shape + colours, no kit style) added to
  `TournamentOpenEntry`/`TournamentDetail`, and badge/colour fields added to fixture-level
  `TournamentEntrantRef`. The one gap NOT closed — no per-round prize exists in the data model,
  only a single winner-take-all payout — is documented as a genuine, unresolved product/schema
  question, not silently dropped. Caught and fixed in the same pass, not part of the backend's
  own list: the pre-existing `status: 'open'` assumption throughout the client was wrong (never
  matched the real `'registering'` wire value) — found by curling the live dev API directly
  rather than trusting the codebase's existing type literal.

---

- **Commit:** 183efb7695af59655f2770ce34f35bbfc89741bd (HEAD) — plus uncommitted working-tree
  changes on top (the `TournamentMiniView` consolidation below)
- **Date:** 2026-09-22
- **Stages touched this pass:** `02_architecture` (`git-activity.md`'s "Recent focus" paragraph —
  fixed the stale "current `competition` branch" claim, now merged into `dev`; added a sentence
  naming the newest work), `04_interfaces` (`services.md`'s "Tournament services" section —
  `TournamentRegistrationService`'s UI call site move + new entry-fee ledger charge,
  `TournamentInboxService`'s new auto-accept-on-poll behavior, new "Tournament ledger, in full"
  paragraph closing a total documentation gap), `05_ui` (`navigation.md` — `TournamentMiniView`
  as the new canonical summary card, `OpenEntryCard`'s narrowed scope, new "Back-FAB
  registration: `useFocusEffect`" callout, new "Tutorial walkthrough system" section closing
  another total documentation gap, refetch-loop-fix/prefetch-on-boot note),
  `06_documentation` (`index.md` — added the missing `docs/api/tournament-match-result-payload.md`
  row, cited elsewhere in `.context/` but never indexed), `07_synthesis`
  (`current-focus.md` — new "Newest" entry for commits `183efb7`/`485f5a5`/`790e5cf` plus the
  uncommitted `TournamentMiniView` work, trimmed a now-duplicate paragraph;
  `architecture-notes.md`'s tournament-system section — two new dated bullets on the client-side
  field-wiring commit and the ledger/cross-service-call additions), plus the root `CONTEXT.md`
  ("Known gaps" section — corrected the "no tournament persistence in SQLite" bullet, stale
  since 2026-09-20). This was a pure staleness-catch-up pass (three unreviewed commits plus
  uncommitted work), not new feature work — see the entries above for what actually shipped.
  `03_data` and `01_overview` were not touched — nothing in this pass's changes affected schema,
  persisted state, or the dev environment.

---

- **Commit:** b2942e43248c5d3185fcbb59906c4e76d21c33b9 (HEAD)
- **Date:** 2026-09-23
- **Stages touched this pass:** `05_ui` (`navigation.md` — tournament nested `<Stack>` navigator under Drawer,
  `ScreenFrame` `showBack`/`onBack` header back button, drawer swipe isolation via `useDisableDrawerSwipeOnFocus`,
  safe `setBackFab` registration with pathname-ownership check to resolve blur-cleanup race condition,
  and `navigateBackWithFallback` stack popping).

---

- **Commit:** b2942e43248c5d3185fcbb59906c4e76d21c33b9 (HEAD) — plus uncommitted working-tree
  changes on top (the save-gated push-inbox fix below)
- **Date:** 2026-09-24
- **Stages touched this pass:** `03_data` (`schema.md` — new `tables/pushInbox.ts` section for
  `tournament_save_index`/`push_inbox`, states the new BINDING rule that any backend-delivered
  event mutating save-scoped state must be queued and resolved before it's applied; the
  `tables/tournaments.ts` section's closing paragraph updated — `saveTournamentMatchResult()` is
  no longer called directly from either of its two call sites), `07_synthesis`
  (`architecture-notes.md`'s tournament-gap section — new dated bullet on the data-bleed root
  cause and fix, closing paragraph updated to flag the queue as settled precedent for future
  backend-delivered event types) — for a bug where tournament match history (and, more
  seriously, Cup-reward money/reputation) from one local game save could bleed into another
  after switching saves, since the device's single shared SQLite file has no save-scoping and
  two write paths (`PushNotificationService.handleMatchResultPush()`,
  `TournamentInboxService`'s poll-and-auto-accept) wrote/applied directly regardless of which
  save was active. Fixed with a new save-gated queue (`src/engine/PushInboxService.ts`) — see
  `architecture-notes.md` for the full writeup. `01_overview`, `02_architecture`, `04_interfaces`,
  `05_ui`, `06_documentation` were not touched — no new dev-environment, module-boundary, route,
  UI, or hand-written-doc changes in this pass.

---

- **Commit:** b2942e43248c5d3185fcbb59906c4e76d21c33b9 (HEAD) — plus uncommitted working-tree
  changes on top (same fix, updated after backend review)
- **Date:** 2026-09-24 (same day, backend review round-trip)
- **Stages touched this pass:** `03_data` (`schema.md`'s `tables/pushInbox.ts` section — three
  confirmed findings added: the Cup-reward `relatedEntityId` resolution is actively blocked
  server-side, not just unverified; competition-id reuse is confirmed impossible; a pre-existing
  `X-Club-Id`/`ClubResolver` server-side mechanism was discovered), `04_interfaces`
  (`services.md`'s `apiRequest()` section — new paragraph documenting `X-Club-Id`'s actual
  source (`getServerClubId()`/per-save `clubStore.club.id`) and which endpoints backend confirms
  already consume it, previously undocumented on either side of the stack), `07_synthesis`
  (`architecture-notes.md` — new dated bullet carrying the backend-review findings forward). Not
  a new feature — a same-day correction after backend inspected their own code in response to
  yesterday's fix; no client behavior changed, only what's documented and one code comment
  (`PushInboxService.ts`'s `ingestRewardEvent`) linking the known-blocked state to its cause.

---

- **Commit:** b2942e43248c5d3185fcbb59906c4e76d21c33b9 (HEAD) — plus uncommitted working-tree
  changes on top (same fix, updated after backend shipped item 1)
- **Date:** 2026-09-24 (same day, second round-trip — backend shipped a real fix, not just a
  reply)
- **Stages touched this pass:** `03_data` (`schema.md`'s `tables/pushInbox.ts` — item 1 updated
  from "blocked" to "fixed both sides," noting backend's change is live on `dev`/`competition`
  only, not yet `master`; item 3's closing note tightened now that (1) no longer gates it).
  `04_interfaces`/`07_synthesis` not touched this round — the client-side code change
  (`src/types/tournament.ts`'s new `extractOfferCompetitionId()`,
  `PushInboxService.ingestRewardEvent()` now resolving via `offerData.competitionId` instead of
  `relatedEntityId`) is the substantive change; `schemaDocSync.test.ts` and the full suite
  (2,703 tests) stay green.

---

- **Branch base:** `development` at `4607fad06fdcfec0cabb796a85980cbb85f13fc4` (2026-09-22)
- **Date:** 2026-09-24
- **Stages touched this pass:** targeted additions (not a re-warm) for the Chairman role
  expansion feature — `04_interfaces/output/services.md` (Chairman mandate-verdict automation
  living in `OwnerMandateService.ts`, not `GameLoop.ts`, unlike every other Chairman
  automation), `03_data/output/state.md` (`clubStore.minOperatingReservePct` as a plain new
  `club_state`-blob field), `05_ui/output/patterns.md` (new "Staff automation toggles" section
  documenting the significance of the Manager/DOF/Facility Manager/Chairman singleton roles,
  and flagging the pre-existing "user-as-Chairman" vs. "Chairman NPC seat" naming collision).

---

- **Branch base:** `dev` at `ff390eb` (the Chairman-work merge above)
- **Date:** 2026-09-24
- **Stages touched this pass:** targeted addition for the fan-crisis rework — `04_interfaces/output/services.md` (new "Fan crisis" section: the `fan_protest` game-over path replaced with a
  recurring, recoverable consequence in `FanConversationService.ts`'s
  `evaluateFanUltimatumAtSeasonEnd()` — fanCount shrinks, a dismissible `fan_crisis_report`
  overlay reports it, a new recovery cycle starts immediately; also documents `fanCount` becoming
  a real cap on `calculateAttendanceCount()`, `matchdayIncome.ts`, and every real call site it was
  threaded through). No schema/persistence change (`fanStore` was already fully persisted via the
  generic `store_state` mechanism, confirmed during this pass, not newly added) — `03_data` not
  touched. `talent_drain`/`insolvency` loss conditions are untouched.

---

- **Branch base:** `fan-crisis-mechanic` (uncommitted at time of this pass, branched off `dev`
  at `ff390eb`)
- **Date:** 2026-09-24
- **Stages touched this pass:** targeted addition for two small features — `04_interfaces/output/services.md` (new "Sponsor offers" section: the two `GameLoop.ts` generation sites, the
  tier-scaled `maxSponsorsByTier` cap — not a flat 3 — the flat-array/no-slot-concept data model,
  and the new `dofAutoHandleSponsorOffers` automation via `DofBrain.assessSponsorOffer()` +
  `maybeDofDecideSponsorOffer()`, including a note on why the score-shift magnitude was
  recalibrated from ±25 to ±10 during implementation to actually produce ability-scaled
  variance). No schema change (`Coach.dofAutoHandleSponsorOffers` and the five
  `chairmanAuto*` new-game defaults in `useInitFlow.ts` are both plain new/newly-defaulted
  fields on the existing `Coach` JSON-blob shape) — `03_data` not touched.

---

- **Commit:** (merge of `sprites` into `competition`/`dev`/`development`)
- **Date:** 2026-09-26
- **Stages touched this pass:** `02_architecture` (`structure.md` — new `player-sprite`/
  `kit-sprite` modules), `03_data` (`schema.md`/`entities.md`/`migrations.md` — the new
  `agents.avatar_config` migration, renumbered to `0005` on this merge since `competition`/
  `dev` had independently reached `0004` for the tournament system; new JSON fields inside the
  `players`/`staff`/`club_state`/`world_clubs` blobs), `04_interfaces` (`routes.md`/
  `services.md` — `appearance`/`identity` fields on the endpoints listed there, and the new
  `src/engine/appearance.ts` generation-layer entry), `05_ui` (`design-system.md` — the old
  `Avatar`/`PixelAvatar` entry replaced with `PlayerSprite`/`KitSprite`) — for replacing the
  entire hand-rolled avatar and kit/badge rendering system with the new pixel-sprite
  components (see `wunderkind-backend/docs/api/sprite-appearance-schema.md`, sibling repo, for
  the backend contract). Also fixed every tournament-system file that read the now-deleted
  `Club.badgeShape`/`homeKitStyle`/`awayKitStyle` fields (`TournamentSnapshotBuilder.ts`,
  `types/tournament.ts`, and three tournament screens/components) — the tournament backend's
  registration contract still expects the old enum values and hasn't been updated for the new
  kit/badge system, so these now send/render fixed sensible defaults with real colours, a
  flagged known gap pending backend-coordinated follow-up, not a silent workaround.

---

- **Branch base:** `development` at `96d81c56753f6cab5f17117e3e2d9a0c9ffb6d06`
- **Date:** 2026-09-27
- **Stages touched this pass:** targeted additions for the account-level owner-profile
  feature — owner identity (name/dob/gender/nationality/avatar) moved out of per-save
  `clubStore.managerProfile` into a new account-scoped `ownerProfileStore.ts`
  (`GET`/`POST /api/owner-avatar`, one profile per account reused across every club/save), a
  new pre-game hub gate blocking "New Game" until it's set, and a new `app/(pre-game)/profile.tsx`
  screen. `03_data/output/state.md` (new 5th persistence shape: `persist()` + plain
  `AsyncStorage`, not `zustandStorage` — shared with `gameConfigStore`; new 3rd
  `resetAllStores.ts` reset category, `ACCOUNT_SCOPED_STORES`, for data that must survive
  new-game but clear on logout/delete-account). `04_interfaces/output/routes.md` (new
  `ownerAvatar.ts` endpoint module; `market.ts`'s `initializeClub` no longer sends a `manager`
  field — backend now silently ignores it there). `02_architecture/output/structure.md` (new
  `src/components/manager-profile/` module; `PixelPicker` extracted to `src/components/ui/`).
  `05_ui/output/navigation.md` (new `profile.tsx` route; `hub.tsx`'s card list). Backend
  contract: `wunderkind-backend/docs/api/owner-avatar.md` (sibling repo, not discoverable from
  this repo alone).

---

- **Branch base:** `development` at `e6cdca487fc0fb646c93c510f3d2e51e1c6bf1a1`
- **Date:** 2026-09-27
- **Stages touched this pass:** implemented
  `docs/superpowers/specs/2026-09-26-centralized-staff-sqlite-poaching-design.md` (staff
  centralization + Office > Hire NPC-staff poaching), correcting several places the spec was
  stale against current code — full corrections in `03_data/output/schema.md`'s
  `tables/staff.ts` section and `04_interfaces/output/services.md`'s new "Staff centralization
  & NPC-staff poaching" section (read both before touching staff/`staff_club`/`worldStore.clubs
  [id].staff`/Hire again). Headlines: new `staff_club` pointer table (migration `0004`,
  mirrors `player_club`, not columns-on-`staff` as the spec proposed) + `staffClubRepository.ts`;
  `WorldClub.staff` stays a live in-memory field for its ~9 existing read sites (blast radius
  kept at zero) but the *persisted* `world_clubs` blob now strips it too
  (`stripPlayersForBlob` → `stripClubDataForBlob`), rehydrated at boot from `staff_club` instead
  of the blob; new `src/engine/StaffPoachingService.ts` (willingness gate, buyout calc, poach
  transaction, shared NPC-manager-replacement helper reused by `GameLoop.ts`/
  `SeasonTransitionService.ts`'s existing sack-and-replace paths); `HireScreen.tsx`/
  `HireStaffSheet.tsx` extended (not rebuilt — both already existed) with a STATUS filter, a
  CLUB column, and the willingness-gate rejection modal (reusing the screen's own existing
  `TIER_REJECTION_QUOTES` pattern). Also fixed in passing: the pre-existing
  `useAuthFlow.ts`/`useInitFlow.ts` init-checkpoint-key drift (now one shared exported list),
  and a correctness gap the spec didn't call out — `marketStore.hireCoach`/`hireScout` needed a
  new `staff_club` assignment too, or a normally-hired coach would have no pointer row and
  silently vanish from `coachStore` on the next boot now that hydration is club-scoped.
  `02_architecture/output/structure.md` (new `staffClubRepository.ts`/`StaffPoachingService.ts`).
  **Correction to this same pass, caught by the user before committing**: the first version
  shipped with no existing-save backfill — added `staffClubRepository.seedStaffClubBackfill`
  (registered in `src/db/seeds.ts`, tag `staff_club_centralization_backfill`, ordered as a
  structural reconciliation alongside `seedScoutShortlistIsShortlistedBackfill`, not a plain
  data backfill) to populate `staff_club` for existing saves' AMP staff (orphaned rows with no
  pointer) and NPC staff (still only in the `world_clubs` blob pre-upgrade) before either goes
  missing. `migrations.md`'s `0004` entry corrected to reflect this.

---

- **Commit:** (merge of `development` into `competition`)
- **Date:** 2026-09-27
- **Stages touched this pass:** implemented the NPC club staff/scouts API consumption +
  NPC-to-NPC staff poaching work (see `03_data/output/schema.md`/`migrations.md`,
  `04_interfaces/output/services.md`'s "NPC-to-NPC / NPC-to-AMP staff poaching" section for
  full detail). Headlines: `WorldClub.scouts` (new dedicated `'npc_scout'`-tagged rows in
  `staff`/`staff_club`, alongside the existing `'coach'`/`'scout'` tags), `getAllNpcStaff` bug
  fix (was pulling `'npc_scout'` rows into `WorldStaff`-typed results before this), a new
  `staff_transfers` table + Pyramid News `staff_poach` page (highlights the season's most
  expensive poach, lists the rest), `NpcClubBrain`'s `hire_coach` generalized to `hire_staff`
  across all four poachable roles, and `StaffPoachingService.ts` split into three
  direction-specific poach functions (NPC→AMP unchanged, new NPC→NPC and AMP→NPC). Migration
  renumbered on this merge: `staff_club` (authored on `development` as `0004_optimal_jackpot`,
  `dev`'s `0006_loose_sage`) and `staff_transfers` (`development`'s `0005_yielding_fabian_cortez`,
  `dev`'s `0007_charming_squadron_supreme`) land bundled together as `competition`'s
  `0006_robust_longshot.sql`, since this is the first time this work has merged into
  `competition` — see `migrations.md` for the full detail.

---

- **Commit:** d4bc6fa (merge of `competition` into `master`) — pushed 2026-09-28 as part of
  `master`'s `03fb603` (see the entry below), at the user's explicit instruction after
  confirming the compiled `1.2.0` store build already matches `app.json`, so the "lands on zero
  existing installs until a new native build reaches them" caveat below no longer applies —
  that native build is the one just released
- **Date:** 2026-09-28 (merge authored) / pushed same day
- **Stages touched this pass:** landed the entire `competition` branch on `master` for the
  first time — tournaments/Cup competitions, the staff-centralization + NPC-staff-poaching
  rework, the sprite/avatar system (already partly on `master` via `development`), and the
  Tournament soft-launch gate (nav hidden behind debug mode until the wider push rollout).
  Preceded by two frontend-only changes on `competition` (see that branch's own commit): wiring
  the production Firebase `google-services.json` for `com.buildmyclub` (the missing piece for
  push notifications in production, per `scripts/README.md`), and bumping `expo.version` to
  `1.2.0` so the automatic production OTA (`eas-update-prod.yml`, fires on any push to `master`
  with no approval gate) lands on zero existing installs until a new native build reaches them.
  `03_data/output/migrations.md`/`schema.md`/`state.md`, `.context/CONTEXT.md`,
  `07_synthesis/output/current-focus.md` all corrected to point at `master`'s actual migration
  number, `0004_young_thunderbolts.sql` — **not** any of `competition`'s own `0003_nice_guardian`/
  `0004_blue_zombie`/`0006_robust_longshot` numbering, which doesn't exist on `master` at all.
  `master` had its own already-shipped `0003_swift_microchip.sql` (the same avatar_config ALTER,
  reached `master` via a separate `development` merge, before `competition` ever did) that a
  first attempt at this merge silently renamed via git's content-based rename detection — no
  conflict was flagged, so this was caught by manually diffing the merge result against
  `master`'s pre-merge tree, not by anything git reported. Fixed by restoring `master`'s real
  `0003_swift_microchip.sql` untouched, discarding `competition`'s entire renumbered migration
  set as redundant, and regenerating fresh via `npm run db:generate` against `master`'s true
  baseline — which produced exactly one new migration bundling everything `master` was actually
  missing (`staff_club`, `staff_transfers`, and the four tournament tables plus `push_inbox`/
  `tournament_save_index`). This is the general lesson for any future branch merge that touches
  Drizzle migrations: a "clean" merge with no conflict markers is not proof nothing was silently
  renamed — diff the resulting migration files/journal against the target branch's pre-merge
  tree explicitly before trusting it.

---

- **Commit:** 03fb60363ecb721b84374c3899d68ad5d151e564 (HEAD on `master`, the push covered by
  the entry above) — also on `dev` (14bcd63) and `development` (744faed)
- **Date:** 2026-09-28
- **Stages touched this pass:** unrelated to the merge above beyond both landing in the same
  push — fixed a real bug this pass, not otherwise `.context`-worthy on its own (no new
  module/route/schema): `src/engine/SimulationService.ts`'s auto-manage block was calling
  `reactionHandler.handleChoice()` — which resolves a narrative message via
  `markAsResponded`/`markAsRead` — before `addMessage()` put the message in `narrativeStore`,
  so those calls silently no-op'd against an empty array and the message stayed permanently
  "pending," locking `EventQueueOverlay`'s story-event card with every button disabled forever.
  Fixed by deferring `handleChoice` until after `addMessage`; also hardened
  `NarrativeOverlayCard.runChoice` (`EventQueueOverlay.tsx`) to explicitly clear its own
  `confirmation` state on resolve instead of relying solely on the message-id-change effect.
  Also updated 01_overview (`tribal-knowledge.md`'s competition rollout-status note, now
  superseded now that the entry above shipped it to `master`) and 03_data (`schema.md`'s
  matching "shipped to `dev`/`competition`, not yet `master`" note, updated to point at the
  superseded tribal-knowledge note instead of restating a now-false claim) — those two doc
  fixes were mechanical follow-ups to the shipping event above, not new information.

---

- **Commit:** 5ab1ff6 (HEAD) — plus uncommitted working-tree changes on top (the DOF signing
  fix below)
- **Date:** 2026-09-28 (same day)
- **Stages touched this pass:** targeted additions for the DOF signing/staffing fix —
  `02_architecture/output/structure.md` (`src/engine/` file count 84→85, new
  `DofStaffHiringService` named alongside the existing `*Service.ts` list),
  `04_interfaces/output/services.md` (new "DOF signing pipeline — shortlist curation,
  transfer-window gate, staff auto-hire" section). Root cause: `DofSigningService.ts`'s
  `processDofAutoSign` only ever read the curated Formal Shortlist (cap 20), and every
  automatic candidate source (scout finds, the performer feed) wrote only to the separate
  Intel Pool (cap 50) with no automatic promotion path between them; a blanket transfer-window
  early return also blocked free-agent signings the window-open/closed distinction was never
  meant to gate (`DofBrain.assessCandidate`'s own per-candidate free-agent exemption was
  unreachable dead code as a result). Fixed by removing the blanket window gate and adding
  `processDofShortlistCuration` (auto-promotes Intel Pool candidates, gated on
  `scouting_directive.owned_by === 'DOF'`). Also added, same pass at the user's request mid-
  investigation: `DofStaffHiringService.ts`'s `processDofAutoHireStaff` (hires coaches/scouts
  from the free-agent market under the existing per-role cap), plus the new
  `Coach.dofAutoHireStaff` toggle — the one DOF flag that defaults to enabled when unset,
  unlike the other four. `getRoleCap` relocated from the UI-only `src/screens/office/shared.tsx`
  to a new `src/utils/staffCaps.ts` so engine code has a neutral module to import it from — no
  behavior change, `shared.tsx` re-exports it. No schema/migration change — all new fields are
  plain additions to the existing `Coach` JSON-blob shape. `03_data`, `05_ui` not touched.

---

- **Commit:** 95cc5e9 (HEAD) — plus uncommitted working-tree changes on top (this pass)
- **Date:** 2026-09-29
- **Stages touched this pass:** `05_ui/output/patterns.md` — new "Inbox items must card-render
  any player or staff they mention" section, documenting the convention that both
  `EventQueueOverlay.tsx` and `app/(app)/inbox.tsx` must render a `PlayerMiniView`/`StaffMiniView`
  (or the new `PlayerMiniCards`/`StaffMiniCards` resolve-many wrapper) for every player/staff a
  message names. Triggered by fixing a concrete gap: the DOF staff-auto-hire digest
  (`dof_staff_auto_hire`) rendered as bare names in both surfaces — `DofStaffHiringService.ts`
  now also writes `metadata.hiredStaffIds`, and a new `src/components/ui/StaffMiniCards.tsx`
  (mirrors the existing `PlayerMiniCards.tsx`, resolving coach-store-first then scout-store,
  adapting a `Scout` onto `StaffMiniView`'s `Coach`-shaped prop by mapping `experience` onto
  `coachingAbility`) is now wired into both screens. Also fixed, same pass: `SignStaffPanel.tsx`
  had its own inner `ScrollView` with `padding: 14`, nested inside `app/staff/[id].tsx`'s
  already-scrolling Contract tab (`padding: 10`) — the doubled inset made its RENEW CONTRACT
  button narrower than the sibling RELEASE button. Replaced with a plain `View`. Not yet
  committed. `02_architecture`, `03_data`, `04_interfaces` not touched — no new module, no
  schema change, no route change.

---

- **Commit:** 8aecdf0 (HEAD) — plus uncommitted working-tree changes on top (this pass, and the
  in-progress Assistant/boardroom-memo feature already in the working tree)
- **Date:** 2026-09-29
- **Stages touched this pass:** `04_interfaces/output/services.md` — appended a second entry to
  the existing "staff-profile-consolidation pass" bullet under the `staff_club` centralization
  section, documenting a ghost/nameless-duplicate-staff data-corruption bug found and fixed:
  `marketStore.ts`'s `setMarketData` filtered already-hired staff out of the in-memory
  `coaches`/`marketScouts` pools but wrote the *unfiltered* fetch response to `staff` via
  `batchUpsertStaffEntities`, so a market refresh that resolved after a same-tick hire (routinely
  true of `GameLoop.ts`'s bi-weekly refresh racing the new `DofStaffHiringService` weekly
  auto-hire) clobbered that staff member's real row back to a nameless, contract-less husk. Fixed
  in `src/stores/marketStore.ts`; regression test added at
  `src/__tests__/stores/marketStore.writeThrough.test.ts`. No schema/migration change — pure
  application-code fix — so `03_data` was not touched. `02_architecture` not touched.

---

- **Commit:** 8aecdf0 (HEAD) — plus uncommitted working-tree changes on top (this pass, and the
  in-progress Assistant/boardroom-memo feature already in the working tree)
- **Date:** 2026-09-29
- **Stages touched this pass:** `04_interfaces/output/services.md` — closed out the other
  already-flagged half of the same `staff` table issue: `batchUpsertStaffEntities` never pruned
  stale free-agent rows, so a long save's `staff` table grew unboundedly on every market refresh.
  Added `staffRepository.pruneStaleFreeAgentStaff(db, type, freshIds)` (deletes rows with no
  `staff_club` pointer absent from the fresh batch) and wired it into `marketStore.setMarketData`
  right after each `batchUpsertStaffEntities` call. Tests added to
  `src/__tests__/db/staffRepository.test.ts` and `marketStore.writeThrough.test.ts`. No
  schema/migration change. `02_architecture`, `03_data` not touched.

---

- **Commit:** 341ae7c (HEAD) — plus uncommitted working-tree changes on top (this pass)
- **Date:** 2026-09-29
- **Stages touched this pass:** `04_interfaces/output/services.md` — a user reported the ghost
  staff still present (and a crash on tap) on their existing save right after the two fixes above
  shipped to production. Root cause: those fixes only stop *new* corruption — an existing save
  already had nameless ghost rows sitting in `staff` from before they landed. Added a retroactive
  one-time cleanup seed, `staffClubRepository.seedGhostStaffHireCleanup` (own checkpoint tag,
  since the earlier `seedStaffClubAmpCorruptionCleanup` already ran and marked itself done before
  this later corruption started), and fixed the crash itself: `app/staff/[id].tsx`'s `splitName`
  threw on an `undefined` `staff.name` (`Cannot read property 'trim' of undefined`) — now
  tolerates a missing name. `02_architecture`, `03_data` not touched — no schema change.

---

- **Commit:** a51dde6 (HEAD) — plus uncommitted working-tree changes on top (the matchux
  skip-to-result redesign, the cohesion-phrasing fix, and the migration-recovery fix, all
  already reflected in `output/` as of this pass — see below)
- **Date:** 2026-10-01
- **Review scope:** ran the staleness check against the recorded `341ae7c` — three commits since
  (`7175e77` was already fully captured by the entry above, written while still uncommitted;
  `6160ab7` and `a51dde6` each already self-documented `.context/` as part of their own commit —
  `03_data/output/state.md` + `04_interfaces/output/services.md` for the former,
  `02_architecture/output/structure.md` + `07_synthesis/output/architecture-notes.md` for the
  latter — both verified accurate against current code, no changes needed). Two things were
  genuinely undocumented and are the actual substance of this pass:
- **Stages touched this pass:**
  - `01_overview/output/tribal-knowledge.md` — Q4 item 2 (money rule) was stale: it predated
    `6160ab7`'s correction to `CLAUDE.md` and still said only `transferBudget`/`facilitiesBudget`
    stay pence, omitting `club.balance` and the new `chairmanBudget`, and omitting the
    `* 100`-bug backstory. Corrected to mirror `CLAUDE.md`'s current text. Also added new item 6:
    the player is addressed as "Owner," never "Chairman" (`src/utils/ownerAddress.ts`, from
    commit `b208e5c` — this file had no `.context/` coverage at all before this pass).
  - `04_interfaces/output/services.md` — added an "Excursion catalogue boot sync" note
    (`useExcursionSync`, also from `b208e5c`) right after the existing "Excursion budget gate"
    section.
  - `07_synthesis/output/current-focus.md` — the stacked narrative's top entry was still the
    2026-09-21 tournament-ledger commit (10 days stale); prepended two new entries: the
    uncommitted matchux skip-to-result redesign (`MatchFinishedScreen` deleted, replaced by
    `matchux/MatchResultScreen`, portrait not landscape, shown on skip too) and a consolidated
    summary of the three 2026-09-29 commits above, each pointing at its already-detailed home
    doc rather than re-explaining.
- **Not touched, considered and judged low-value:** `src/utils/nationality.ts` (two more club
  nationalities added, Portugal/France — pure data, not referenced anywhere in `.context/`) and
  a cosmetic `Button.tsx` comment fixup (dropped a dead reference to the now-deleted
  `MatchFinishedScreen`).
- **Known pre-existing staleness, not fixed this pass (out of scope — would need a full
  `02_architecture` re-audit, not a targeted update):** `structure.md`'s `src/hooks/` (36) and
  `src/utils/` (79) file counts no longer match the repo (now 40 and 86 respectively, by a plain
  recursive `find`) — drifted before this pass, unrelated to anything reviewed here.

---

- **Commit:** 3aeb68f (HEAD) — plus uncommitted working-tree changes on top (this pass, and the
  kit/badge sizing fix below)
- **Date:** 2026-10-01
- **Stages touched this pass:** targeted additions closing a total documentation gap flagged by
  the user (`matchux/` had never had a real structural writeup, just a one-line mention in the
  components-directory list, ahead of the component being expanded further):
  - `02_architecture/output/structure.md` — new file-by-file `src/components/matchux/` bullet
    (13 files): the `MatchUXPhase` state machine and discriminated `MatchUXOverlayProps` union
    in `types.ts`, `MatchUXOverlay.tsx`'s orchestration, the per-phase screens
    (`DecisionScreen`/`RotateDevicePrompt`/`LiveMatchScreen` + its three sub-components/
    `MatchResultScreen`), and the two independent callers (`GameOverlayHost.tsx` for local
    fixtures, `TournamentMatchResultScreen.tsx` for tournament results).
  - `05_ui/output/patterns.md` — new "MatchUX phase flow" section: the phase transition rules
    (Skip always reaches `finished`, never bypasses it; `onDone` fires exactly once), the
    landscape-lock scoping (`visible && phase === 'live'` only — regressing this re-introduces
    the pre-2026-10-01 bug where `finished` rendered rotated), the local-vs-tournament
    caller/result-source split, and the `DecisionScreen` kit-bigger-than-badge sizing convention
    (`scale={4}`/`scale={2}`, fixed this same pass — see below).
  - `shared/token-savings.md` — re-measured `02_architecture`/`05_ui` rows and the `Everything`
    total for the growth above (full detail in that file's own "Last updated" line).
  Same pass, the actual trigger for the documentation gap being noticed: swapped
  `DecisionScreen.tsx`'s `KitSprite` scales so the kit reads larger than the badge (previously
  inverted — badge `scale={4}`/60×64dp vs kit `scale={2}`/28×20dp; now badge `scale={2}`/30×32dp
  vs kit `scale={4}`/56×40dp). Pure visual swap, no layout/container change, `npx tsc --noEmit`
  clean. `01_overview`, `03_data`, `04_interfaces`, `06_documentation` not touched — no
  environment, schema, interface, or hand-written-doc change.

---

- **Commit:** a2ff3acb3e6e017565ace587cde275b5b8a4475a (HEAD) — plus uncommitted working-tree
  changes on top (the card-chrome/Pressable fix below)
- **Date:** 2026-10-02
- **Stages touched this pass:** rebuilt `app/(pre-game)/hub.tsx` from a flat vertical menu-card
  list into a landing-page dashboard, per the user's explicit request —
  `05_ui/output/navigation.md` (route tree: `hub.tsx` description updated, new `clubs.tsx`
  "View All Clubs" route added; new "Hub rebuilt as a dashboard" section describing the
  `src/components/hub/{OwnerIdentityCard,ActiveGameCard,ClubsOverviewSection,HubActionGrid,
  NewGameConfirmModal,DeleteAccountConfirmModal}.tsx` split, the new shared
  `src/components/club-card/RemoteClubCard.tsx`, and the `TOTAL CAREER EARNINGS` proxy figure's
  swap-later note), `04_interfaces/output/routes.md` (new `clubList.ts` row for the
  newly-documented `GET /api/club/all` — see `wunderkind-backend/docs/api/club-list.md`).
  Also fixed a real, unrelated, user-reported blocker found during this pass:
  `03_data`/`04_interfaces` not touched for it specifically, but worth noting here since it
  shipped same session — `src/db/cacheIntegrity.ts`'s `staff_coach`/`staff_scout` row probes
  were unscoped (`COUNT(*) FROM staff WHERE type = ?` counted every NPC club's own staff too),
  so a club with genuinely zero scouts/coaches hired got permanently locked behind
  `GameCacheRepairOverlay` with no way to clear it (retry re-ran the same unscoped count).
  Scoped both probes to the AMP club via the same `staff_club` join `loadStaffByClub` already
  uses; regression tests added to `src/__tests__/db/cacheIntegrity.test.ts`.
- **Follow-up same session, not yet reflected above (card-chrome/Pressable note):**
  `05_ui/output/design-system.md` gained a new "⚠️ `Pressable` card chrome" section — a
  `Pressable` whose own `style` carries `backgroundColor`/`borderWidth` together with
  `pixelShadow`'s `elevation` does not reliably paint on Android in this app (confirmed across
  three iterations of this same dashboard rebuild: `OwnerIdentityCard`/`ActiveGameCard`/
  `RemoteClubCard` all had invisible borders until their chrome moved onto an inner `View`,
  matching `Button.tsx`'s pre-existing comment on the same issue). Also documented alongside it:
  wrapping `PlayerSprite`/`KitSprite` in a bordered frame needs that frame given **explicit**
  `width`/`height` (computed from the sprite's own crop × scale) — an auto-sized frame balloons
  to fill the row instead, confirmed against `RelationshipGraph.tsx`'s avatar frame as the one
  other place in the codebase doing this correctly. `01_overview`, `02_architecture`, `03_data`
  not touched this pass.

---

- **Commit:** 19e988a (HEAD) — plus uncommitted working-tree changes on top (the youth
  Contract-tab feature below, and a large, unrelated, already-in-progress i18n migration
  (`locales/`, `scripts/i18n/`) that landed on top of the same files mid-session — not
  authored by this pass, not reviewed/documented here)
- **Date:** 2026-10-03
- **Stages touched this pass:** `03_data/output/entities.md` — new "Youth lifecycle — no
  separate pointer table" section under the Player entity, closing a total documentation gap
  (confirmed previously missing any mention of `players.isYouth`, `player_club.role`, or youth
  lifecycle at all). Documents: no `player_youth` table exists; status is `players.isYouth` +
  `player_club.role` together; `promoteYouthPlayer`/`releaseYouthPlayer`
  (`src/db/repositories/youthRepository.ts`) as the only write path; and
  `config.youthFirstTeamEligibilityAge` (default 16) as the **single** source of truth for
  sign/promotion age — called out explicitly per the user's request, since `TransferService.ts`
  had been silently hardcoding a second, independent copy of the same number (fixed this pass).
  For the feature itself (youth players get a CONTRACT tab once eligible, reusing the adult
  renewal UI; the existing weekly `youth_promotion` nag's "PROMOTE" choice now navigates to that
  tab instead of instantly signing with defaults; Inbox gained parity with the overlay for this
  decision) see the commit itself — no new module/route/schema shape, so `02_architecture`,
  `04_interfaces`, `05_ui` were not touched. Also fixed, unrelated, at the user's request: a
  Squad > Youth avatar kit-rendering bug (`PlayerMiniView.tsx`'s ownership check only recognized
  `squadStore` — first-team only — membership, so youth-squad players always fell back to a
  random placeholder kit; added an explicit `isOwned` override prop, passed `true` from

---

- **Commit:** cda2a65 (HEAD on `development`, merged to `dev`)
- **Date:** 2026-10-04
- **Stages touched this pass:** the translation/i18n system — built incrementally across
  several prior sessions (`locales/`, `scripts/i18n/`, `src/i18n/`, `languageStore`/
  `translationStore`, the `?lang=`/`/api/languages`/`/api/translations` backend contract) but
  **never documented in `.context/` until now**, plus this pass's own fix (a widespread
  key-drift bug — catalog keys scrambled relative to their call sites, mostly in
  `EventQueueOverlay.tsx` — found via a user bug report and fixed with a new verification tool,
  `scripts/i18n/audit-tokens.ts`). Closing that documentation gap touched five stages at once:
  - `07_synthesis/output/architecture-notes.md` — new "Translation / i18n system" section, the
    primary reference: the two-tier architecture (generic-UI-copy catalog vs. `?lang=`
    server-localized content), the catalog files and how to safely add a new string, and the
    2026-10-04 key-drift incident writeup with its recovery method.
  - `01_overview/output/tribal-knowledge.md` — new binding-rule index entry (#7): every
    user-facing string must go through the catalog, never hardcoded. The rule itself is stated
    in full in `CLAUDE.md` per this file's existing indexing convention.
  - `02_architecture/output/structure.md` — new `src/i18n/` bullet (`t()`/`interpolate()`) and
    a new top-level `locales/` + `scripts/i18n/` section; corrected the `src/stores/` file
    count (53 → 56, since grown past-stale independent of this pass).
  - `03_data/output/state.md` — new "Translation/i18n stores" section documenting
    `languageStore` (plain manual `AsyncStorage`, device-scoped) and `translationStore`
    (in-memory only, physical source of truth is a disk file via
    `translationAssetService.ts`) as two more persistence shapes alongside the ones already
    catalogued there; corrected the store count (55 → 56).
  - `04_interfaces/output/routes.md` — new rows for `languages.ts`/`translations.ts`; corrected
    a stale row that claimed `archetypes.ts`/`excursions.ts` made no `apiRequest` calls (both
    were refactored onto it since, `excursions.ts` also gaining `withLang()`); new closing note
    explaining `withLang()`/`?lang=` as the separate, narrower mechanism from the two new rows.
  - `06_documentation/output/index.md` — added `locales/en/README.md` (previously unindexed
    despite being the canonical file-shape/key-naming/placeholder-convention reference).
  `05_ui` not touched this pass — its existing `Pressable` chrome section already covers a
  different bug found the same week (the game hub language picker's button not painting on
  Android), cross-referenced from the new synthesis section rather than duplicated.
  `YouthPane.tsx`'s enrolled-squad list).

---

- **Commit:** f752734725b8f2fb1a1e8faf8aec4a83aef1abc9 (HEAD, branch `facilities_svgs`) — plus
  uncommitted working-tree changes on top (the facility-sprite feature below)
- **Date:** 2026-10-05
- **Stages touched this pass:** 02_architecture (`structure.md`: new `facility-sprites/`
  bullet, `src/components/stadium/` removed from the feature-area list), 03_data (`schema.md`:
  new `facility_site_config` row in the `tables/misc.ts` section; `migrations.md`: new
  `0005_clammy_mastermind.sql` row — regenerated once same-day, see the entry below), 05_ui
  (`design-system.md`: new "Facility sprites" component
  section, explicitly flagging the isometric-voxel/Path-per-colour technique as deliberately
  different from PlayerSprite/KitSprite's flat pixel-rect technique) — all for replacing
  image-based club facility rendering (backend `imagePath`/cached `<Image>`) with the SVG
  facility-sprite system (`src/components/facility-sprites/`, ported 1:1 from the "approved web
  builders," pixel-parity-tested against `__fixtures__/parity.json`). Also shipped as part of
  this pass, not yet reflected in any stage doc beyond the above: `src/types/facility.ts`'s
  `FacilityTemplate` gained `spriteFacilityId` and dropped `imagePath`/`images`;
  `FALLBACK_FACILITY_TEMPLATES` grew from 9 stale rows to the 22-row authoritative catalogue
  (matching a new backend-import JSON deliverable, produced but not yet applied backend-side);
  `src/components/stadium/StadiumView.tsx` deleted outright (confirmed no non-visual logic);
  new `src/utils/facilitySpriteConfig.ts` composition layer; new `FacilityCategoryScreen.tsx`
  `SiteSettingsPanel` for the sprites' cosmetic, non-leveled config (trees/pitch/grounds/
  stadium floodlights+scoreboard), its copy added to the i18n catalog via
  `scripts/i18n/manual-overrides.json` (not `npm run i18n:regenerate-safe` — see the
  **i18n tooling finding** below).

  **i18n tooling finding, worth a follow-up ticket:** running `npm run i18n:regenerate-safe`
  with 13 new `manual-overrides.json` entries and no other changes dropped
  `locales/en/translations.json` from 2324 entries to 757 — the exact catastrophic-data-loss
  failure mode `locales/en/README.md` already documents happening once before, reproduced
  on a routine, by-the-book addition. Root cause not fully diagnosed (not investigated further
  this pass — reverted immediately via `git checkout` instead), but the shape of it: the
  script's HEAD-content extraction only recovered 126 entries, meaning well over a thousand
  previously-catalogued keys exist in `translations.json`/`provenance.json` today through some
  mechanism other than "extractable literal in HEAD" or "listed in `manual-overrides.json`" —
  so the documented recovery path is not actually safe to re-run as told. Worked around by
  hand-merging just the 13 new keys additively into both files (new `_meta.entryCount`/
  `generatedAt`, everything else byte-identical to HEAD) instead of regenerating. Until this is
  root-caused, treat `npm run i18n:regenerate-safe` as unsafe to run — diff
  `locales/en/translations.json`'s entry count before trusting its output, every time.

---

- **Commit:** f752734725b8f2fb1a1e8faf8aec4a83aef1abc9 (HEAD, branch `facilities_svgs`) — plus
  uncommitted working-tree changes on top, still the same facility-sprite feature as the pass
  above, corrected
- **Date:** 2026-10-05
- **Stages touched this pass:** 02_architecture (`structure.md`'s `facility-sprites/` entry
  corrected — see below), 05_ui (`design-system.md`'s "Facility sprites" section corrected),
  03_data (`schema.md`/`migrations.md`: `facility_site_config` no longer has
  `scoreboard`/`scoreboard_home`/`scoreboard_away` columns; migration regenerated from
  `0005_bored_toad_men.sql` to `0005_clammy_mastermind.sql` — safe to do since it was never
  committed).

  **The rendering pattern from the previous pass was wrong and is now fixed.** The original
  intent (confirmed by the human after the first pass shipped) was never "replace each
  per-facility image with a per-facility sprite crop" — it was "one full-site hero sprite per
  section, exactly like the stadium stand hero already worked, with individual facility rows
  staying text-only underneath." `FacilityCard` (`FacilityCategoryScreen.tsx`),
  `FacilityMiniCard` (`MentionedFacilityCards.tsx`) and `NpcFacilityCard`
  (`app/club/[id].tsx`) all had a per-row `facility=` cropped sprite removed and went back to
  text-only; `FacilityCategoryScreen.tsx`'s TRAINING/MEDICAL/SCOUTING tabs and
  `app/club/[id].tsx`'s NPC `FacilitiesPane` each gained a full-site hero (no `facility=` prop)
  at the top, matching the Stadium tab's pre-existing hero.

  **Two real bugs found and fixed while making that correction, not just the rendering-pattern
  revert:**
  1. `SiteSettingsPanel`'s cosmetic controls (trees/pitch/grounds/floodlights) updated
     `facilityStore.siteConfig` but that state was never actually merged into any sprite's
     `config` prop — the panel edited state nothing read. Now merged into
     `FacilityCategoryScreen.tsx`'s `siteSpriteConfig` useMemo.
  2. The stadium scoreboard's home/away numbers were a manually-configurable Site Settings
     field (steppers, arbitrary values) — redesigned to display the AMP club's own most recent
     home-game result instead (`useAttendanceStore`'s `records[0]`), hidden whenever a transfer
     window is open (`isTransferWindowOpen`, `src/utils/dateUtils.ts`) or no home game has been
     played yet. The Scoreboard toggle and Home/Away steppers were removed from
     `SiteSettingsPanel` entirely, and `scoreboard`/`scoreboardHome`/`scoreboardAway` dropped
     from `FacilitySiteVisualConfig` and the `facility_site_config` table (migration
     regenerated, not a second migration, since nothing had shipped yet).

  Also produced as a data deliverable this pass (not a stage-doc change): a second backend
  JSON export, `wunderkind-narrative-2026-10-05-facilities-updated.json` (same directory as
  the facility-only `facilityTemplates-sprite-aligned.json` from the previous pass) — the
  **entire** original narrative JSON with only `facilityTemplates` swapped for the 22-row
  catalogue; every other key (`eventTemplates`, `playerArchetypes`, `tacticalAdvantages`,
  `excursions`, `translations`) verified byte-identical to the source file.

---

- **Commit:** f752734725b8f2fb1a1e8faf8aec4a83aef1abc9 (HEAD, branch `facilities_svgs`) — plus
  uncommitted working-tree changes on top, still the same facility-sprite feature, two more
  rendering bugs fixed
- **Date:** 2026-10-05
- **Stages touched this pass:** 02_architecture (`structure.md`'s `facility-sprites/` entry:
  documented the `SLUG_TO_SPRITE_ID` fallback and the construction-from-level-0 fix below).

  Two bugs found by the human testing against the real backend (`dev.buildmyclub.co.uk`, now
  carrying the imported facilityTemplates catalogue — confirmed live):
  1. **Stand levels not matching the real upgrade level, and the club shop showing even at
     level 0** — root cause: `facilitySpriteConfig.ts`'s `templateFor` matched only on the new
     `spriteFacilityId` field, which production (and, briefly, dev before the import) doesn't
     send — every lookup silently missed, so every stand/building fell back to the sprite's own
     `DEFAULT_STADIUM_CONFIG` hardcoded values (stands 7/3/2/5, `shop: true`) instead of the
     facility's real state. Fixed with a same-shaped `SLUG_TO_SPRITE_ID` fallback map, used only
     when a template's `spriteFacilityId` is absent — kept as defense-in-depth for any client
     still pointed at production until it gets the same import. Also dropped `templateFor`'s
     `category` filter (unnecessary — sprite ids are unique per site — and a source of false
     misses against stale `category` values on old data).
  2. **A facility starting its very first construction (level 0 → 1) would render as if it
     didn't exist at all**, rather than showing the construction-site visual — because the
     on/off flag was still `false` (level 0) while `buildPlotSite`/`buildStadium` skip a
     facility outright whenever its on/off flag is false, regardless of its own `Construction`
     flag. Fixed: the on/off flag is now `level > 0 || underConstruction`.

  Both fixes landed in `src/utils/facilitySpriteConfig.ts`, with new regression tests in
  `src/__tests__/utils/facilitySpriteConfig.test.ts` (disabled-at-0, on-during-first-build,
  and slug-fallback-resolves cases, for both the Stadium builder and the shared plot-site
  builder).

---

- **Commit:** 87c8d6cf42d64921981fc795b49d2c379a683d4d (HEAD) — `development`, now merged into
  both `dev` and `master` and pushed (OTA on both channels)
- **Date:** 2026-10-05
- **Stages touched this pass:** 02_architecture (`structure.md`'s `matchux/` entry rewritten
  for the drop-in UI revision below — file count 13→14), 07_synthesis (`current-focus.md`:
  two new top entries — this matchux revision, and a retroactive entry for the
  `facilities_svgs` merge two commits earlier, which had never gotten one despite already
  being fully documented in `02_architecture`/`03_data`/`05_ui` by the three passes above)

  **This pass's own change:** a drop-in visual/performance revision of the matchux live-match
  UX, delivered externally as `assets/Components/matchux/` + an `INTEGRATION.md` migration
  note, swapped in 1:1 — public prop API (`types.ts`, `index.ts`) byte-identical, confirmed
  before swapping. `LiveMatchPitchClock.tsx` deleted, replaced by new `LiveMatchPitch.tsx` +
  `LiveMatchControls.tsx`; `LiveMatchTopBar.tsx`/`LiveMatchTicker.tsx`/`LiveMatchSidePanels.tsx`/
  `LiveMatchScreen.tsx`/`DecisionScreen.tsx`/`MatchResultScreen.tsx`/`MatchUXOverlay.tsx`
  rewritten/edited; new `minuteLabel.ts`. Full behavioral detail (goal-pulse accessibility fix,
  speed-scaled key-event hold, Star Man relocation, attendance now rendering) in
  `current-focus.md`'s new top entry and `02_architecture/output/structure.md`'s `matchux/`
  entry — not duplicated here.

  Required 8 new i18n keys, added by hand directly to `manual-overrides.json` +
  `translations.json`/`provenance.json` (ticker chip labels, pitch GOAL/HT/tap-to-resume,
  decision-screen YOUR CLUB, controls RESULT) — **`npm run i18n:regenerate-safe` was tried
  first and reverted**: it re-extracts from `git show HEAD:<path>` for every source file, which
  is only safe while a string-rewiring pass is still uncommitted (HEAD then still has the
  original literals). This repo's rewiring is long since committed, so HEAD already matches
  the rewired `t()`-call-site disk content everywhere — running it re-ran a full extraction
  pass and silently dropped ~900 already-rewired keys catalog-wide (translations.json dropped
  from 2337 to ~1900 entries on the first attempt). Caught by diffing the entry count before
  committing; reverted via `git checkout`. **Correction to this file's own 2026-10-01 guidance
  below** ("Never run `npm run i18n:extract` again... `i18n:regenerate-safe` is the only safe
  regeneration path, and only while rewiring is still uncommitted"): that caveat is the whole
  story — once rewiring is committed, `regenerate-safe` is just as unsafe as `i18n:extract` and
  manual catalog edits are the only safe path for a single new key. `CLAUDE.md`'s i18n section
  states the "only while rewiring is still uncommitted" condition but is easy to misread as
  "this script is always safe" — worth a maintainer pass to make that caveat more prominent if
  this trips up another session.

  `token-savings.md` re-measured for the two stages touched this pass (`02_architecture`,
  `07_synthesis`) plus a fresh `Everything` total — see that file's own "Last updated"
  note for the numbers; the other five rows are carried over from the 2026-10-04 full
  re-measurement, unchanged.

---

- **Commit:** fee10d435c9e3c10b76bc1eb9549d26634923119 (HEAD) — `development`, merged into
  `dev` and pushed (OTA on the `dev` channel only; `master` deliberately untouched)
- **Date:** 2026-10-08
- **Stages touched this pass:** 03_data (`schema.md`'s header rewritten — Drizzle is now the
  query layer for *ported* repositories, no longer "never import the schema barrel to query"),
  01_overview (`tribal-knowledge.md` Q4 — new **item 8**, the binding DB-access rule), plus the
  router `CONTEXT.md`

  **New BINDING rule (Q4 item 8):** query only through `src/db/repositories/*` via the accessor
  helpers; never nest exclusivity; never change a Drizzle column `mode` unchecked.

  **Ownership of ALL binding rules inverted — this is the significant part of this pass.**
  Previously the router and `tribal-knowledge.md` both stated that binding rules were owned by
  `CLAUDE.md` and merely *indexed* in `.context/`. But `CLAUDE.md` is **gitignored**
  (`.gitignore:33`), so those rules reached nobody else and did not survive regeneration —
  while the router simultaneously instructs agents to treat `.context/` as authoritative and
  *recreate* `CLAUDE.md` from it, which was impossible for content living only in `CLAUDE.md`.
  The `.context/` summaries had already silently lost operational detail: the i18n
  `{camelCaseToken}` placeholder-matching rule, the `audit-tokens.ts` step, the
  "never run `i18n:extract`" and `regenerate-safe` warnings, the cohesion memo names and
  `TOXIC`→`HARMONIOUS` tier range, and the potential-conversion rationale.

  Now: **`tribal-knowledge.md` Q4 owns all eight rules, stated in full** (the lost detail
  restored), and `CLAUDE.md` carries them as a **one-way mirror** (`.context/` → `CLAUDE.md`;
  `.context/` wins on conflict). `CLAUDE.md` keeps the full text rather than pointers on
  purpose — it is the file auto-loaded into every agent's context, and pointers there would
  make binding rules easy to miss; the fix needed to close the durability gap without opening
  a compliance one. Also closed a gap where the "Owner, never Chairman" rule existed in
  `.context/` but was **missing entirely** from the always-loaded `CLAUDE.md`. The mirror is
  semantically equivalent, not byte-identical — two headline phrasings differ harmlessly.

  **This pass's own change:** Drizzle Phase 2 — the query-layer accessor
  (`getDrizzle()`/`runDrizzleExclusive()`/`runDrizzleTransaction()` in `src/db/client.ts`),
  a real-SQLite Jest harness (`jest/drizzleTestHarness/`, better-sqlite3 migrated from the
  actual migration files), and the pilot repository port
  (`tournamentMatchResultRepository.ts`).

  Three findings worth carrying forward, all recorded in `src/db/drizzle/README.md`'s new
  "Porting a repository to Drizzle" section (the canonical home — not duplicated here):

  1. **The sync expo-sqlite driver must not be used.** An on-device probe found it silently
     bypasses `client.ts`'s `runExclusive` write queue (a sync write executed mid-transaction
     with no error), and survives `reopenDatabase()` only by writing through an orphaned
     second connection that `reopenDatabase()` deliberately never closes. The proxy driver
     (`drizzle-orm/sqlite-proxy`) delegates every statement to `getDatabaseAsync()`, so it
     holds no handle to go stale. Verified on a physical Android device: forcing a swap via
     `markDatabaseDead()` left the long-lived instance working with no rebuild, no duplicate
     rows, `created_at` unchanged.
  2. **Changing a column's Drizzle `mode` is not DDL-neutral.** `integer({mode:'boolean'})`
     with `.default(false)` compiles to literal `DEFAULT false` (not `DEFAULT 0`), which
     drizzle-kit reads as a changed default and turns into a full `__new_table` rebuild
     migration. Attempted on `tournament_matches`/`tournament_match_events`, reverted; mode
     cleanups deferred to Phase 3.
  3. **Drizzle's row mapper reads columns positionally** (`row[columnIndex]`), so the proxy
     callback must return raw value arrays (`executeForRawResultAsync`), not expo-sqlite's
     default name-keyed objects — the object shape silently yields all-`undefined` fields
     rather than an error. Caught by the accessor's own Jest suite before it reached a
     repository.

  Not re-measured: `token-savings.md` (one header paragraph changed in one stage — the
  2026-10-04 full re-measurement still stands).

---

- **Commit:** 42f6c69 (HEAD on `dev`) — working tree otherwise clean at the start of this pass
- **Date:** 2026-10-11
- **Stages touched this pass:** 06_documentation only (`output/index.md`)

  **This pass's own change:** a read-only investigation of the **game load path**, written up
  as `docs/drizzle/game-load-breakdown.md` and catalogued in the documentation index.
  No source, schema, migration or config file changed.

  Two index corrections went with it: the new file got a row, and
  `step-h-c-19-investigations.md` was added to the "not opened this pass" row — it was in the
  directory and cited by `phase3-plan.md` as a companion document, but uncatalogued.

  Nothing in `02_architecture`, `03_data` or `04_interfaces` needed a change: the
  investigation documented existing behaviour and proposed nothing, so no module boundary,
  schema, store shape or route moved. The one thing it establishes that those stages do not
  record — that `hydrateAllStoresFromSQLite` + `runCacheIntegrityPass` is simultaneously step
  6 of `SaveGameService.loadFromSlot` and the body of `useWorldInit`, so the save-restore and
  cold-boot paths share their whole tail — lives in the new doc rather than being mirrored
  into `03_data/output/state.md`, because it is a control-flow fact about two services, not a
  fact about state shape. Revisit that call if a later pass finds agents reaching for it from
  the data stage.

  Not re-measured: `token-savings.md`. One row was added to one stage's `output/index.md`; the
  2026-10-04 full re-measurement still stands and a single row does not move it meaningfully.

---

## 2026-10-22 — animated boot splash (commit base `3092a5ed`, branch `development`)

**Stages touched:** `02_architecture/output/structure.md`, `03_data/output/state.md`,
`04_interfaces/output/routes.md`, `04_interfaces/output/services.md`,
`05_ui/output/patterns.md`, `07_synthesis/output/architecture-notes.md`.

Replaced the static `splash.png` boot backdrop with an animated `react-native-svg` splash
(`src/components/splash/`), wired to a new reactive boot-progress signal and to a new public
`GET /api/telemetry` endpoint. `SplashBackdrop.tsx` was deleted, which takes the 5MB PNG out of
the Metro bundle; the file stays on disk for `app.json`'s native splash.

Why each stage changed:
- **02_architecture** — a new module directory, three new modules outside it, and a deleted one.
- **03_data** — two new session stores, plus the app's second hand-managed AsyncStorage key
  (`wk:live_telemetry`). Both stores are classified in `DEVICE_SCOPED_STORES`, which
  `resetAllStores.newGame.test.ts` enforces.
- **04_interfaces** — a new route, and a third documented `apiRequest` bypass.
- **05_ui** — the splash's patterns (single hoisted overlay, presentational/orchestration split,
  module-level sprite cache, the `fontsReady` gate) and its two deliberate design-system
  exceptions.
- **07_synthesis** — the boot sequence itself moved: `markBootPhase` gained a listener seam,
  `useFonts` was hoisted into `RootLayout`, and a module-scope network call now runs during boot.

**No new BINDING rule was added**, so `01_overview/output/tribal-knowledge.md` and its
`CLAUDE.md` mirror are untouched. The constraints this work has (the `app.json` background-colour
coupling, "never hardcode the telemetry stats window", pence-in-pence-out on
`capitalDeployedPence`) are either instances of rules that already exist or local enough to live
in their stage. Revisit if a second surface starts consuming telemetry.

**Deferred, and recorded in 03_data and 07_synthesis rather than silently dropped:**
`bootProgressStore.setHydrationUnits()` is implemented and tested but has no production caller.
Its intended hook is one line in `src/db/bootstrap.ts`'s `step()`; it was held back to avoid
colliding with concurrent Drizzle work in `src/db/`.

Not re-measured: `token-savings.md`. Content was appended to six existing `output/` files and no
stage was restructured, so the standing measurement still holds.

---

## 2026-10-22 (second pass) — boot splash on device, and what it exposed

**Stages touched:** `02_architecture/output/structure.md`, `03_data/output/state.md`,
`04_interfaces/output/routes.md`, `05_ui/output/patterns.md`,
`07_synthesis/output/architecture-notes.md`.

Nine commits of device-driven fixes after the splash shipped to the `dev` channel, now also
merged to `master`. The corrections matter more than the additions — several things recorded in
the first pass had already stopped being true:

- **`fonts` no longer carries weight in `BOOT_PHASE_WEIGHTS`** (`03_data`). It held 0.90 from
  when `useFonts` resolved late; hoisting it into `RootLayout` moved it to the middle of boot and
  the bar jumped 30% → 90% in two milliseconds, then sat there. The weight table encodes
  sequence, so a phase that becomes parallel has to leave it.
- **The hydration denominator is ~38, not 25** (`03_data`). The static `step()` call-site count
  is 25; a real `HydrationReport` has 38. The first pass recorded the wrong number.
- **`LEVEL_STOPS` became `BUILD_FRAMES`** (`05_ui`, `02_architecture`) — a five-frame storyboard
  with construction sites, driven by `displayedProgress` (the lower of real progress and a build
  clock) so a warm boot cannot show the whole build in a blink.

Two genuinely new pieces of knowledge, both in `05_ui` and `07_synthesis`:

- **Android measures a `Text` once and never re-measures when the font loads.** This produced a
  clipped banner that every width calculation said should fit. The fix needs an explicit width,
  one line per `Text`, and a key on font readiness.
- **The app was booting twice**, because the navigator was mounted conditionally and the initial
  `router.replace` raced its first mount. Pre-existing, worth ~600ms every cold start, and
  invisible until a screen that animates and a mount counter made it visible.

**No new BINDING rule**, so `01_overview/output/tribal-knowledge.md` and its `CLAUDE.md` mirror
remain untouched. The closest candidate — "keep a navigator mounted from the first frame" — is
one fact about one file and is recorded in `07_synthesis` where the boot sequence lives. Revisit
if it is ever violated a second time.

Still outstanding and recorded rather than dropped: `setHydrationUnits` has no production
caller, and the iOS native-splash hand-off changed from a photo to pixel art without a sign-off
and has now reached production.

Not re-measured: `token-savings.md`. Content was edited in place across five existing `output/`
files; no stage was restructured.

---

## 2026-10-24 — Club Dashboard rebuild + design-system migration (`05_ui`)

Commit at sync: `78f52be0` (branch `development`). Stage touched: **`05_ui`** only.

Prompted by the asset author's drop at `assets/Components/NewClubDashboard/` (2,660 lines,
12 files), which was two pieces of work in one folder: a rebuilt Club Dashboard, and a revised
design system the dashboard is merely the first consumer of.

**Stage restructured, not just edited.** `output/design-system.md` went from 860 lines to ~250
and is now rules only; everything in it that was reference rather than rule moved into a new
`output/design-system-notes.md` (the sprite families, the `Pressable`-chrome gotcha, the
token-adoption status, the branding resolution) **verbatim from this repo's own copy**, not
from the drop's — the drop shipped its own edition of these files and it was already behind
(its `Global dialogs` section carried the superseded 2026-10-23 wording). A third new file,
`output/compliance-review.md`, records where the app does not yet obey the spec.

`output/patterns.md` was **merged, not replaced**: the drop's copy differed from the repo's in
exactly two places — it added `## Club dashboard cards` and it carried that stale dialogs
section. Only the new section was taken.

Three things worth knowing beyond the file moves:

- **The contrast table is now a test.** `src/__tests__/constants/designSystem.test.ts` computes
  every ratio in the spec from the shipped `theme.ts`, and pins two deliberate FAILURES
  (`textFaint` on a card, a muted ink on an outcome fill) so nobody promotes them believing
  they pass. This class of drift is exactly what put three different values of "red" in three
  places; a prose table could not have caught it.
- **Two off-by-one errors in the drop's own spec**, both found by that test:
  `surfacePeopleInset` was given as `#2b254f` but its stated derivation
  `mix(surfacePeople, stroke, 0.3)` evaluates to `#2b254e` (the shipped token is now the
  derivation, so the rule is exactly true), and the "±12 RGB of `surface`" claim is 13 for
  `surfacePeople`'s red channel.
- **A real accessibility bug in `Badge`**, unrelated to the dashboard: its `positive`/`danger`/
  `warning` fills carried white ink at 2.89 / 2.48 / 2.69:1 — below even the 3:1 UI threshold.
  Fixed to `stroke` ink (6.71 / 7.81 / 7.22) and its `color` prop renamed from hue names to
  role names.

**No new BINDING rule**, so `01_overview/output/tribal-knowledge.md` and its `CLAUDE.md`
mirror are untouched on that front. `CLAUDE.md`'s "Where things are" table was updated for the
two new `05_ui` output files, as were this router and `stages/05_ui/CONTEXT.md`'s Outputs list.

Recorded rather than fixed (all in `compliance-review.md`): gold rationing is breached at 385
text sites across 122 files, there are 206 non-`stroke` borders, 22 files still concatenate
alpha instead of calling `withAlpha`, and the tournaments hub still runs a parallel type scale
in `hubPrimitives.tsx`'s `useFonts()`.

- **`01_overview/output/tribal-knowledge.md` (Q4 BINDING, + `CLAUDE.md` mirror) and
  `07_synthesis/output/current-focus.md` — THE PACK IS A CENSUS, NOT A PRICE LIST
  (2026-11-18).** The app half of backend `WORLD_PACK_VERSION` 10 → 11. All money left the
  world pack; the device now prices every ingested squad at init from published config. **Both
  repos land together — there is no fallback window by design**, since a backend that had
  dropped the keys against an app still reading them would price every squad at zero.

  **A NEW BINDING RULE**, so `tribal-knowledge.md` Q4 and the `CLAUDE.md` mirror both moved
  (one-way, `.context` wins). The short form: a pack carries no money; an ingested row is
  priced in `economy/packWages.ts` and never at zero; `?? 0` on a money field read off a
  payload is a defect, not a default; derive on device from config in hand, never add server
  load; a COUNT is census, an AMOUNT is not; and the mirror-image mistake — an already-priced
  row keeps its price.

  **What changed in code.** New `economy/packWages.ts` (the one pricing seam, plus the
  tier-aware staff rung). Both ingestion sites rewired: `useInitFlow`'s `worldPlayerToPlayer`
  and `playerUtils`' `normalizeRawWorldPlayer`. Balances drop the pack preference in
  `worldStore.buildWorldLeagueClubs` and fall to the existing `npcStartingBalanceByTier`
  ladder — not new code, just no longer shadowed. The sponsor pot is rolled at init by
  `rollLeagueSponsorPot`, the same call every later season boundary already made.

  **Four findings worth carrying forward.**

  1. ⚠️ **`computeNpcWageBill` was summing only `contractValue` — the LEGACY alias — and that
     became a zero-wage-bill bug the moment packs stopped carrying money.** It had worked by
     accident: a priced pack row carried `contractValue` through `normalizeRawWorldPlayer`'s
     spread. Post-v11 an ingested NPC has `wage` and no `contractValue`, so **every club in the
     pyramid would have reported a player wage bill of 0 for a whole session**, then silently
     started working after a restart (`playerFromRow` populates both fields off one column).
     Not cosmetic: `buildNpcAffordabilityBase` is built on it, and its own docblock records
     that too low a wage bill makes the gate "wave through signings that drained them". Fixed
     to `wage ?? contractValue`, the idiom `GameLoop`/`MarketEngine`/`playerMapper` already
     use. `PyramidNewsService` had the same read and the same fix.
  2. ⚠️ **`seededRng`'s FIRST draw is very nearly seed-independent for similar seeds** —
     0.6405/0.6417/0.6413/0.6424/0.6421/0.6432 across six player-id seeds, against a properly
     uniform second draw. Taken straight it would have silently defeated the per-contract wage
     draw: every player in a squad would land on the same point of the ±8% band, while still
     producing plausible non-zero wages. `packWages.ts` discards two opening draws and records
     the measurement. **The same bias affects `clubIdentity` and every appearance fallback** —
     deliberately NOT changed, because it would re-roll the identity and face of every club and
     person in every existing save. Worth its own pass.
  3. **`/api/initialize/leagues` sends no `sponsorPot` and deliberately still won't.** Dropping
     the pack's key alone would have zeroed league sponsorship. The device already rolled a pot;
     it lacked the census, so the backend added `sponsorCount`/`sponsorSizes` to that uncached
     endpoint and the app rolls at init. ⚠️ Not allowed to fall through to `?? 0` — that
     hard-zero previously paid season-1 position prizes at the full pot for every position.
  4. **The stale constraint in `current-focus.md` is STRUCK, not just superseded.** It said to
     avoid `drawWeeklyWagePence` because "two devices building the same pack would produce
     different squads"; `8ff2e5fd` made a `WorldPackSet` single-use, so that cannot happen
     (owner confirmed). Left in place struck-through with the reason, so anyone who remembers
     the constraint learns why it no longer holds.

  Also recorded in `tribal-knowledge.md`, as the owner asked: **the ability bands
  (`starter_config.league_ability_ranges`) stay backend-authored**, because band and wage scale
  are one system — and the live wrinkle that the app's ENGINE reads the published
  `leaguePlayerAbilityRanges` while the HARNESS refuses it outright, with
  `AbilityRangeParityTest` as the thing that makes both safe.

  New guard: `src/__tests__/economy/packIsACensus.test.ts` (16 tests — nothing anywhere
  asserted an ingested player's wage before). ⚠️ `npcFinances.test.ts`'s *"treats missing
  contractValue as 0"* asserted the DEFECT and is rewritten with the reason written in. The
  economy variant gate is byte-identical before and after (md5-verified across a stash), as it
  must be: it reads config and a world export, not packs.

---

## 2026-11-19 — A13: the CHECKS report curated, and three relationships it could not state

Branch `new-game-save`. App only. **Pass scope: the Debug → CHECKS report only** — what it
retires, what it collapses, and three checks added. **No check's measurement was changed.**

Report: `docs/economy-loose-ends/a13-checks-report.md`.

**The structural change everything else rests on.** `CheckResult` gained an optional `full`
field, and the report's assembly moved out of the component into
**`src/components/debug/checksReport.ts`** (`ChecksTab.tsx` is now the renderer over it). The
screen renders `detail`; the clipboard takes `full ?? detail`. That split is what let the default
view be collapsed without the paste losing anything — measured: **screen 112 → 74 lines, clipboard
110 → 116**, with a token-level diff confirming every pragma name, object name and figure in the
old clipboard still present in the new one. Pinned by
`src/__tests__/components/checksReportCopy.test.ts`.

**Retired (4), each because it was a verdict on a decided question, never an invariant:**
`size.a3Rule` and `size.largestObject` (both go/no-go inputs for a `cache_size` decision long
taken; the size they read is still printed by `size.database`); `b2.poolAbsorbed` (status was a
hardcoded `'info'` — it could not fail under any plan — and its own text read "settled by D14";
**its assertable half, `b2.droppedIndexUnused`, is kept**); and the A5/A6 go/no-go sentences
inside the restore and wipe timing rows, where **the measurement and both thresholds stayed** and
only "A6 does NOT proceed" went.

**Collapsed (5), text preserved in `full`:** the twelve-pragma recital → one row naming whatever
differs from a value the app actually sets; the boot timeline → count, total and three slowest;
per-object and per-table sizing → the heaviest three; write-cost exec and queue → **by STATUS, not
by rank**, so every slow label keeps its own row and only the quiet ones merge.

⚠️ **`EXPECTED_PRAGMAS` holds only values the app itself sets** (`cache_size`, `synchronous`). The
first cut guessed at `mmap_size`/`cache_spill`/`journal_size_limit`/`secure_delete` and the
harness immediately reported two spurious differences — a check crying wolf about a value nobody
chose is what this pass exists to remove. Do not add a row there without a site that sets it.

**Added (2 new, 1 already present):**
  1. **`divisionSizeChecks`** — division size three ways, one line per league: authored `slots`
     (the wire's `clubCount`, "what the pool was divided by") against the clubs that exist against
     fixture-derived home games against `tvPool / slots` vs the published `tvDeal`. This is the
     Scottish 14-ways-to-12-clubs defect in one line. ⚠️ **`clubCount`/`tvPoolPence` ride only the
     three UNCACHED payloads**, so they are in hand for the AMP's own league (via `leagueStore`)
     and `null` elsewhere — and a `null` is never treated as a disagreement, or the row would fail
     on every boot and be ignored. **The `clubs` vs `home games` pair is checkable on every
     league.** `types/api.ts` has said for some time that `clubCount` is published "so a client
     can CHECK that arithmetic rather than trust it"; until now nothing did.
  2. **`wageCoverageChecks`** — the measured season wage bill against the tier's authored player
     budget, as a ratio, one line per tier, to A10's §9 spec and its bands (<60% FAIL, 60–85%
     WARN, 85–115% OK, >115% WARN, >150% FAIL). ⚠️ **§9's premise is wrong on one point and the
     code says so:** it lists `wageToTurnoverRatioBp`/`staffWageShareBp` as arriving on
     `GET /api/game-config`, and they do not — the backend publishes them on
     `EconomyConfigPublisher::publicBlock()` and `EconomyTierBaseline` has no field for either, as
     `clubBudget.ts` already noted at its own site. So the budget uses the app's own
     `DEFAULT_WAGE_BUDGET_RATIO_BP` / `STAFF_WAGE_SHARE_BP` (45% of turnover, the same figure the
     backend gate measures) **and the clipboard line says which it used.** Squad size is the
     save's counted `players / clubs`, never the authored midpoint — A10 measured that gap at
     15–20% optimistic.
  3. **NPC budget inputs (brief §3c) were ALREADY THERE** — A12's `npc.weeklyIncome` row already
     prints sponsor + matchday + seasonal with the home-game count it used. Not duplicated.

The per-tier mean-wage rows moved out of WORLD PACK into the new WAGE COVERAGE block, where each
mean is printed against the budget it is meant to cover. A mean wage with nothing beside it is
how a ~23% coverage sat unnoticed for months.

**Verified:** `npx tsc --noEmit` clean. `npm test` **643 suites / 10,735 passed** (10,738
collected, 3 skipped; `--listTests` 643) — fully green, which is `dev`'s 640/10,704 plus this
pass's three new suites. ⚠️ `tournamentHubRender.test.tsx` failed once in a full run and passes in
isolation on both this tree and a stashed one — an ordering flake, not this change; it did not
recur.

**Flagged for the PM, not acted on:** `runIndexCounterfactualProbe` (D14), `runAnalyzePlanProbe`
(D10) and `runVacuumIntoProbe` (D9) have **no callers anywhere in `src/`** — they are reachable
from no tab. They cost the report nothing (they are not in it), so retiring them was out of this
pass's scope, but someone should decide whether TOOLS lost its buttons or they were never wired.

## 2026-11-19 — A14: the fan base comes from the plot's population (`07_synthesis`)

Branch `new-game-save`, on top of `ea92859a`. **App half only, and deliberately INERT until the
backend publishes its half.**

`fanCount` was a tier-keyed absolute drawn at random, identical for a club in a city of a million
and a club in a village — so the plot a player buys bought them no support, and the multi-club arc
(*earn → sell → buy a larger plot → larger catchment*) had nothing on the other end. It is now
`catchment population × share(tier)`, resolved in one new module, `src/economy/fanBase.ts`
(`resolveStartingFanCount`), read by the two call sites that mint a starting fan count:
`fanStore.initialiseFans` (every world club, off `WorldClub.populationSize`) and `useInitFlow`'s
AMP entry (the player's own, off the new `club.catchmentPopulation`, written at FOUND CLUB from the
claimed location via `useLandFlow.populationOf`). `TIER_FILL` untouched — support and turnout stay
on separate axes.

⚠️ **THE SHARE LADDER IS A NEW PUBLISHED KEY, `starterConfig.fanBaseSharePercent`, and that is the
whole safety story.** `fanBaseRanges` is backend-published ABSOLUTE HEADCOUNTS — the live England
export carries 700,000–1,500,000 at tier 1 — so reinterpreting that key in place would have given
every tier-1 club 700,000% of its catchment on the next config sync, silently, with no error
anywhere. With `fanBaseSharePercent` absent (which is every backend today) the resolver reproduces
the previous draw **byte-for-byte**, same expression and same single `random()` call; a club with
no known catchment does the same, by decision, because 0 fans would remove it from the shirt
economy and a synthesised population is the fallback invention this codebase forbids.

**🔴 The figure the design was reasoned against was the WRONG ONE, and this file carried it.**
`game-mechanics.md` §8 said "shipped fanbases (tier 8 = 100–500 … tier 1 = 50,000–200,000)" —
those are `DEFAULT_FAN_BASE_RANGES`, the app's **pre-sync fallback**. The live published values are
**14–100× larger** (tier 8 = 10,000–20,000, tier 1 = 700,000–1,500,000), and the wrong ones were
quoted onward into the task brief and into the ladder design. Corrected in place. Consequence:
against the live absolutes the owner's 5–10% → 60–70% ladder is a **reduction at every tier**
(×0.04 to ×0.21 at each England tier's own median club population; a median tier-1 club goes
1,100,000 → 73,954 fans and £29.7M → £2.0M of season shirt income), not the 4–10× uplift the plan
expected. Reported, not tuned — and the fallback means nobody has to decide today.

**Flagged for the PM, not acted on** (all in the new `game-mechanics.md` §8 subsection):
`PeerBenchmarkService.getTierFanCountAverage` **does** aggregate fan bases across clubs (a mean,
live, reached by the DOF review) — the shared-catchment deferral survives it, but a small-town club
will now trail its tier mean permanently; `new-game-setup/economy.ts`'s `crowdShare: 0.04` is a
second, already-live catchment→demand share that should read the tier's own share once the ladder
is published; and `variantGate` / `dispersionGate` / `scripts/economy/flows.ts` model the shirt
line from `fanBaseRanges` midpoints with no population term, so they become wrong on the day the
backend publishes a ladder.

**Verified:** `npx tsc --noEmit` clean. `npm test` **646 suites / 10,767 passed** (10,771
collected, 3 skipped; `--listTests` 646) — A13's 643/10,735 plus this pass's three new suites and
33 tests (10,738 collected -> 10,771). ⚠️ `db/bulkWrite.test.ts` failed once in the full run on a 112ms-vs-100ms timing
assertion and passes in isolation — a load flake, and this change touches no write path. The
economy gate is **byte-identical**, md5 `24f2d74db39fccd15f349316fadedd62` — the same hash A8 and
A12 recorded, as it must be: the gate reads config and a world export, not these modules.

Full measurement and tables: `wunderkind-docs/economy-loose-ends/a14-fanbase-report.md`.

## 2026-11-19 — A17: ONE runway, shared by the player's chart and every NPC decision (`07_synthesis`)

**App only, branch `new-game-save`, on top of `c65bfa91`. Not pushed.** `weeksRunway` existed as
**four** hand-written variants of `netOutflow > 0 ? floor(balance / netOutflow) : 52`: the NPC
brain's verdict, the fire-sale discount, the NPC debug dashboard and — not listed in the brief —
the player's own DOF runway, `ampWeeksRunway`. The derivation now lives once, as `runwayWeeks` in
the new **`src/economy/projection.ts`**, defined as the week the projected balance first crosses
zero over the same `projectBands` the player's balance chart is drawn from. `projectBands` and its
types moved there with it (pure, store-free, so `npcSolvency` and the economy harness can reach
them); `FinancialProjectionService` re-exports them for its eleven callers and keeps the
store-reading `buildProjection`. The verdict's INPUTS are assembled once too, in `GameLoop`'s
`assessNpcSolvency`, handed to the transfer executors as `weeksRunwayFor`.

🔴 **Two of the brief's premises were wrong, and the measurement is the finding.**
`min(52, floor(balance / deficit))` is **continuous at break-even** — a club a penny either side
reads 52 weeks on both sides — so there was never a cliff there, and `npcSolvency` already
amortised seasonal money into its income term rather than ignoring it. The real defect was that
the four copies disagreed about **income**: two of them saw `sponsors || weeklyIncome` with no
upkeep, no investors and no TV. On the newest world export (238 EN+SC clubs, every
tier; the 21:48 export agrees): **0 clubs change the brain's verdict** — the derivation is
numerically identical on the brain's own inputs — while **188 change fire-sale discount tier** and
**233 of 238 change the fire-sale runway at all**, 4 of them for the worse.
Every EN and SC tier-1 club stops fire-saling at 25–50% off.

🔴 **Also measured, and it is an owner-level decision this pass deliberately did not take:**
timing an NPC club's seasonal lump at the boundary the way `buildProjection` times the player's —
the literal reading of "mirror the chart" — reads **every tier-1 club as `folded` in every week of
the season**, because TV is ~70% of its weekly income. The amortisation stays, with its reason now
measured rather than asserted. And A12's sensitivity sweep is **identical under both derivations**,
so correcting `GameLoop:1520` is **no safer** than it was: the 16/16 flip figure stands.

`tsc` clean; **647 suites / 10,787 tests**, against a worktree-measured baseline of **646 /
10,772** at `c65bfa91` (identical to `CLAUDE.md`'s `dev` row, which has no row for this tree);
economy gate **byte-identical** (`c5941b30…`, which moved at A15, not here).
`game-mechanics.md`'s "NPC solvency" section carries all of it. Full measurement, the per-tier
verdict tables and the three variants: `wunderkind-docs/economy-loose-ends/a17-shared-projection-report.md`.

## 2026-11-19 — A15: the harness's copy of the backend's reference squad, DELETED (`02_architecture`)

**App only, branch `new-game-save`, on top of `0964fedc`. Not pushed.** The backend's A10 pass
(`68561f93`, committed and undeployed) changed what `S_tier`'s σ is computed over — every reference
member is now mapped through `PlayerGenerationService::expectedCurrentAbility()` rather than priced
at its raw potential. `src/economy/harness/loadExport.ts` kept the app's own copy of that squad and
silently diverged.

**Measured consequence, which is why this blocked a deploy:** against a projected post-A10 export the
gate's wage share went **60.0% at every tier → 191–243%, every tier insolvent in season 1**, plus a
cascade check flipping to FAIL — on a correct backend change. The player share 45% → 143–182% is the
same figure A10 §5.2 measured when the backend's *own* second copy of the squad was priced against
the new scale, arrived at independently from the other side of the wire.

**The fix is a deletion, not a mirror.** `wageScaleMicroPence` is defined as
`playerBudget × UNIT / (weeks × σ)`, so the squad it is calibrated against costs `playerBudget / weeks`
**whatever the abilities are** — σ cancels. `turnoverAvgWeeklyPence` is now
`playerBudget / (weeks × referenceSquadSize)` with the resolver's own two truncating `intdiv`s, and
`wageToTurnoverRatioBp` / `staffWageShareBp` are READ from `starter-config`'s `economy` block
(`EconomyConfigPublisher::publicBlock()`) and **refused** if absent, rather than defaulting to
`fixtures.ts`'s own 6000/2500 constants. On a pre-A10 export the derived figure reproduces the priced
one to **within one penny at three tiers of eight**; on the projected post-A10 export the whole gate
run is **byte-identical** to the pre-A10 one. The band spread survives, renamed
`potentialBandSpread()`, for the LEGACY average alone — and that average prices POTENTIALS, which is
pre-existing and now labelled.

🔴 **Two corrections that supersede earlier reasoning in this log.** (1) `wageScaleMicroPence ×
Σ(abilityᵏ) / turnoverPence` rearranges to `UNIT × wageToTurnoverRatio × (1 − staffWageShare) / weeks`
— **it contains no σ**, so the `9782.608696` constant is restored by a correct mirror *and* by a wrong
one, and it could never have validated a mirror; it could only detect the two copies disagreeing. The
tier-7 floor-vs-round split it showed came from the squad SIZE appearing on both sides of the
division. The floor reading is now sourced directly to `EconomyScaleResolver::referenceSquadSize()`'s
`intdiv(min + max, 2)` over the same `starter_config.npc_squad_config` the app is served as
`npcSquadConfig` — stronger than the behavioural proof it replaces. The passages at `:272-278` and
`:377-380` state the old reasoning; they sit inside historical pass entries, so they are **flagged,
not rewritten**. (2) `wageToTurnoverRatioBp` and `staffWageShareBp` are **not** on
`GET /api/game-config` — A10 §9's on-device check spec says they are, and two of its seven inputs are
therefore unfindable as written.

**Verified:** `npx tsc --noEmit` clean. `npm test` **646 suites / 10,772 passed** (10,775 collected,
3 skipped; `--listTests` 646) — A14's 646 suites plus this pass's 4 tests, no new suite, zero
failures. The economy gate moves by **one penny at three tiers** on the only export that exists, and
that is the correct direction: the 3.2–4.7× movement is what this change *prevents*.

**Flagged for the PM, not acted on:** the only cross-repo agreement check on the reference squad now
exists nowhere and needs the backend to publish `referenceSquadAbilities()` (already public);
`gate.ts:173` calls `realizedWageShares()` with no argument, so its A7 block reports `ENGLAND_DEV`
even on a `--export` run; `fixtures.ts`'s `WAGE_TO_TURNOVER_BP`/`STAFF_WAGE_SHARE_BP` are the same
defect class one layer up; and A10's absolute σ/`S_tier`/budget columns come from a box whose
`npc_squad_config` midpoints are 33…22 against both captured exports' 26…17.

Full measurement, the eight invariant values before and after, and the four gate runs:
`wunderkind-docs/economy-loose-ends/a15-harness-mirror-report.md`.

---

## 2026-11-20 — A28 step 1: the manager's noise spread split off the scouts' (`07_synthesis`)

Branch `new-game-save`, app-only. **Stage touched:** `07_synthesis/output/game-mechanics.md` —
new **§7b, "The MANAGER's opinion of the squad — `player_rating`"**, which this file previously
documented nowhere. §7 covered the SCOUTS only (`scoutNoise.ts`, per-report), and the manager's
weekly perceived-rating pass (`playerRatingEngine.ts` / `PlayerRatingService.ts`,
`player_rating`) had no entry at all — which is a large part of why the two systems kept being
confused for each other from source.

§7b states the blend, the four terms and what drives each, the measured error band at four
scouting ranges against four candidate spreads, the week-to-week drift the seeded-per-week
random source implies, the half-star arithmetic that explains why moving the number need not
move the display, and the four runtime paths that can actually build a manager↔player bond.
Three things recorded there were believed and are false: a "70/30 scouting-range /
coaching-ability split" (never existed — `coachingAbility` is not in the rating path at all),
that `MAX_BOND_BIAS` is inert on every save (it is inert on a FRESH one; youth promotions,
guardian events, promises and excursions each build real bonds), and that an excursion cannot
reach the manager (`ExcursionService` builds `bondStaff` from `coachStore.coaches` with no role
filter, and `readManagerBonds` matches on `staff_id` alone).

**Code change in the same commit:** `MAX_MANAGER_NOISE_SPREAD` (20) introduced in
`playerRatingEngine`, replacing its import of `scoutNoise`'s `MAX_NOISE_SPREAD` for the
manager's own spread — one constant had been driving the manager's opinion of the squad AND
every scout's report. A **proven byte-identical no-op**: a 3,840-case `derivePerceivedRating`
grid (8 scouting ranges × 6 consistencies × 5 morales × 6 bonds × 4 facility states × 4 weeks)
diffed to zero before and after. `deriveFacilityError` deliberately keeps the scouting constant.
Pinned by the new `managerNoiseDecoupling.test.ts`.

**Verified:** `npx tsc --noEmit` clean. `npm test` **649 suites / 10,819 passed** (10,822
collected, 3 skipped; `--listTests` 649) — A26's 648 / 10,816 plus this pass's one suite and
three tests, reconciling exactly.

**Held for the owner, not acted on:** the new spread value (table in §7b) and
`MAX_BOND_BIAS`. Report: `wunderkind-docs/economy-loose-ends/a28-manager-opinion-report.md`.

---

## 2026-11-20 — A28 part 2: the owner's numbers, and a two-source config finding (`07_synthesis`)

Branch `new-game-save`, app-only. **Stage touched:** `07_synthesis/output/game-mechanics.md`
§7b (added earlier the same day) — rewritten for the tuned values and three new findings.

**Tuning, owner's ruling:** `MAX_MANAGER_NOISE_SPREAD` **20 → 40**,
`MAX_BOND_BIAS` **5 → 12** symmetric (`mapBondToBias` keeps its shape; no asymmetric branch).
Measured mean absolute error at scouting range 20 went **2.00 → 3.75** rating points over the
real `leagueAbilityRanges`. The owner's principle — *"clarity comes from facilities and
abilities"* — is in the constant's docblock as well as §7b, because a reader finding a 40 where
the scouts keep a 20 will otherwise read it as a mistake. Both accepted side effects (weekly
re-draw drift, lossy stars) are recorded there with an explicit **do not add smoothing**.

**Three findings recorded in §7b, none fixed:**

1. **The `PERCEIVED_MIN` floor makes the manager systematically optimistic at the bottom of the
   pyramid.** The error is symmetric but the output floor is not, so near the floor the
   pessimistic half of the draw truncates. Measured at range 20 over the real tier ranges: a
   true-2 player (tier 8) reads +1.42 high with 44% of weeks clamped at 1, against +0.57 and
   36% at the old spread. Confined to tiers 7–8 (true ability under ~10), negligible from tier
   6 up. Pre-existing; 40 makes it 3–5× larger where it applies.
2. **`bondDecayFloor` had two sources with the documentation on the losing side.** It is synced
   GameConfig; the app's `DEFAULT_GAME_CONFIG` said 20, the backend entity and the live row said
   **50**, and the synced value wins — while the app's own docblock argued for 20 and gave its
   rationale as though the change had taken effect. It never did. Resolved backend-side the same
   day (owner: let bonds fade) by migration, not by editing the entity default alone, which
   would have governed new installs only and repeated the original mistake. Two of that
   docblock's supporting figures are also wrong: seeded coach bonds top out at **35**
   (`SEED_COACH_POSITIVE_RANGE` `[10, 35]`), not 45, and organic growth is **5**/week live, not 2.
3. **The two bond changes partly cancel.** Bias 5 → 12 and floor 50 → 20 landed together, so the
   settled youth-graduate bond moved **+1.50 → +1.44** — effectively nil. The increase shows up
   in fresh and maintained bonds, not in the baseline. Both are the owner's and intended; the
   interaction was not the point of either, so it is written down rather than left to be
   inferred.

**New measurement surface:** `Debug → CHECKS → MANAGER PERCEPTION`
(`managerPerceptionResults()` in `checksReport.ts`). Prints the manager's judgement inputs — with
an explicit flag when `scoutingRange` is the absent-field fallback, since the band at range 20
is 60% wider than at 50 — the error band, the accepted drift, and the manager's bond rows with
the **live** `bondDecayFloor` beside them. Built because none of this is knowable from source: a
bond's existence depends on how far a save has run, the floor was not reliably knowable from
either repo, and an APK has no console. Its three live reads are lazy `require`s so a debug
module does not pull `@/db/client` into module scope. Pinned by
`src/__tests__/components/managerPerceptionCheck.test.ts`, including that it never throws —
`ChecksTab` awaits the sections in sequence inside one `try`, so a throw would cost every
section after it.

**Verified:** see `CLAUDE.md`'s `new-game-save` row. Report:
`wunderkind-docs/economy-loose-ends/a28-manager-opinion-report.md`.

## 2026-11-20 — A27: the scout age gate made to work, by generating the keys it reads (`07_synthesis`)

**Stages touched:** 07_synthesis (`game-mechanics.md`), shared (this file). Report:
`wunderkind-docs/economy-loose-ends/a27-scout-age-gate-report.md`. The substantive change is
**backend-side** (`wunderkind-backend` on `development`); this repo needed **no functional change
at all**, and verifying that rather than assuming it was most of the app-side work.

**Owner ruling, 2026-11-20**, asked whether scouting accuracy should vary by the player's age:
*"Yes, it should."*

🔴 **`ageGateFor()` had returned 0 for every scout in the game since it was written.** It reads
`judgements.youth` for an under-18 and `judgements.senior` at 18 and above, and the backend's
`ScoutGenerationService` — the only path that has ever written a persisted scout, so the only path
that fills a world pack — wrote five keys, neither of them those. So the `: 0` fallback was the
only branch that had ever run. With `AGE_GATE_WEIGHT` at 0.3 that cost **30% of every scout's
displayed accuracy** (`scoutAccuracyPercent` = `potential × 0.7 + ageGate × 0.3`, so a perfect
100-potential scout showed 70%) and **all** of the noise-band tightening in `applyScoutNoise`.
Display and behaviour agreed with each other, which is exactly why nothing ever looked wrong.

**Why no app change was needed, verified not assumed:**
- `ScoutJudgements` (`src/types/market.ts`) already declared all seven keys as a `Partial`.
- `ageGateFor` already read the two correctly, including the `age < 18` split.
- Every ingest path passes `judgements` through **wholesale** (`useInitFlow`, `api/endpoints/market.ts`,
  `marketStore`) — no key whitelist anywhere, so two more keys simply arrive.
- `profileLogic.ts`'s `SCOUT_JUDGEMENTS` already lists all seven and filters on `!= null`, and
  `judgementKind()` already classifies `youth`/`senior` as `'ageBand'`, so the two new rows render
  on the scout profile card on their own.
- ⚠️ **The i18n keys already existed** — `screen.staffProfile.scout.row.youth` = "Judges youth" and
  `…senior` = "Judges seniors" are in the catalog. This was the one real risk of a silent break (an
  auto-appearing row with no label renders the raw key), and it was checked rather than reasoned
  about. No catalog change, so no `i18n:apply-overrides` run.

**What changed here: three docblocks and one test docblock, all of which described the defect as
live and would otherwise have become documentation of the losing side** — the precise failure mode
this workstream exists to remove. `scoutNoise.ts`'s `ageGateFor`, `types/market.ts`'s
`ScoutJudgements`, `types/world.ts`'s `WorldScout.judgements`, and the "malformed judgements"
describe block in `scoutNoise.test.ts`.

⚠️ **`scoutNoise.test.ts:119-122` is KEPT, and annotated to say why.** A five-key blob was *every
scout in the game* until now, so that case was the normal path; it is now genuinely exceptional — a
pack cached at `WORLD_PACK_VERSION` 12 or earlier, or a hand-edited blob — which is exactly when a
silent `NaN` would be hardest to trace (it survives `Math.max/min` and binds to SQLite as NULL,
failing `scouting_reports.accuracy_percent NOT NULL`). The `: 0` fallback stays load-bearing; what
changed is that it is no longer the only branch.

**Measured on a real dev scout** (`01a0e9cd-b789…`, potential 42, youth 79, senior 28), running the
real `scoutAccuracyPercent` with no facilities: age 17 **29% → 53%**, age 25 **29% → 38%** —
identical at both ages before, 15 points apart after; error band on the potential read ±6 → ±4 at
17. ⚠️ **Scouts therefore get visibly better, and that is the fix working, not inflation** — worth
saying to the owner before they read it as a buff.

**Verified:** `npx tsc --noEmit` clean. `npm test` **651 suites / 10,865 passed**, 10,868
collected, 3 skipped, `--listTests` 651 — **identical to B1's `7609125e` row, and it must be**:
this change is comment-only in `src/`, so it adds no test and moves no count. The
`new-game-save` row in `CLAUDE.md` is therefore left as B1 measured it rather than restated here.

⚠️ **A first full run showed 2 failures in `src/__tests__/db/clientRecovery.test.ts`, and they
were mine only in the sense that I caused the load.** The suite passes 14/14 standalone on both a
pristine `git archive HEAD` copy and this tree, the file and `src/db/client.ts` are untouched by
anyone, and `git diff -U0 -- src app` filtered to non-comment lines is empty — a comment cannot
change `mockOpen.mock.calls.length`. The cause was running the backend phpunit suite and jest
**concurrently**; both failing assertions are timing/budget-bounded (`gives up after a bounded
wait`, a reopen-budget count inside a time window). The solo re-run above is clean. **Worth
remembering: do not run the two repos' suites at the same time on this machine.**

---

## 2026-11-20 — A29: the CHECKS tab reads a real player's wage and asks if the model agrees

**Commit:** `b8ee4594` on `new-game-save`, app only. **Not pushed, not deployed.**
**Stages touched:** none. Flagged below instead, per the standing notes' §3.

The thirteen economy checks were all tier-level aggregates computed from config — even
`wageCoverageChecks`, the closest, divides an authored turnover by app constants and compares a
MEAN. **Nothing anywhere read an actual `players` row and asked whether that player's stored wage
is what the model says he should earn**, so every economy question this workstream has asked about
a live save was answered by the owner photographing a screen.

New CHECKS section **`PLAYER VALUATION — SAMPLED ROWS`** (`economyDiagnostics.ts`, surfaced in
`ChecksTab.tsx` after `WAGE COVERAGE`): per player, tier and club, raw `current_ability` and
`potential`, the stored wage, what `weeklyWageRange` says that ability should earn at that tier,
the ratio, and the `wageMultiplierTiers` band the ability falls in. Four players each from tiers
1/3/5/8, SEEDED so two runs compare. Warns, never fails.

**The expected figure comes from `resolveEconomy` → `weeklyWageRange` and nowhere else** — the
two functions the pricing path and `packWages` call. The test asserts it by computing the figure
through those same functions across 8 tiers × 12 abilities × both models and demanding agreement
to the penny, which is the only form of the assertion a second implementation could not satisfy.

**The band is the MODEL'S OWN `[min, max]`, not a fixed ratio**, because the two models scatter
differently and legitimately: `turnover` draws from ±8% of the curve, `legacy` rolls the
coefficient across 2,000–2,800. A fixed 0.92–1.08 band would have cried wolf on every
legacy-priced player in the game, which is the live state on the real EN export.

🔴 **A unit fact the A29 brief had backwards, and it is load-bearing.**
**`players.contract_weekly_wage` is whole POUNDS, not pence.** `playerMapper.ts:207` divides by
100 on the WRITE path; `:86` multiplies by 100 on the read. So `Player.wage` is pence only
because the mapper scales it back up, and **every wage that survives a save/load round trip is
quantised to the pound** — a ~1% loss at tier 8, where `turnover` prices players at £57–£160/wk.
That is why the check carries a stated £1 tolerance rather than warning at random on band edges.
`CLAUDE.md`'s money rule enumerates the pence exceptions on the *store* side and says nothing
about this column; `transferDashboardLogic.ts:93` and `playerMapper.ts`'s own comments are the
only places it is written down. **Flagged for the PM — it is a BINDING rule, so its home is the
PM's call.**

**Two defects the panel's first render found in itself**, both fixed with a regression test:
the pick landed on the same squad slot in every club (four goalkeepers at all four tiers — player
ids are uuidv7, so ordering a squad by id orders it by creation order, and even spacing over equal
squads aligns; now hashed within a club, equally reproducible); and a `full` on each per-tier row
put the whole sixteen-player table into the clipboard five times, against §2's bar — the table is
now in the summary once.

**Verified:** `npx tsc --noEmit` clean. `npm test` **652 suites / 10,891 passed**, 10,894
collected, 3 skipped, `--listTests` 652. ✅ **Reconciles exactly** against B1's 651 / 10,865:
**+1 suite / +26 tests**, all of it `src/__tests__/economy/playerValuation.test.ts` (26 tests, no
existing test file edited). "A worker process has failed to exit gracefully" appears here too and
is pre-existing — recorded as run-ordering dependent on both preceding `new-game-save` rows.

⚠️ **`CLAUDE.md`'s `new-game-save` row needs a new line for 652 / 10,891** — it is a one-way
mirror of `01_overview/output/environment.md`'s "The green-master bar", so the `.context/` copy
changes first. **Left to the PM**: that table has gone stale six times from exactly this kind of
well-meant edit.

**Raised, not built** (full argument in `docs/economy-loose-ends/a29-checks-panel-report.md` §7):
staff and scouts belong in a SIBLING panel, not this one, when A24 needs it —
`resolveWageTier` already returns `staffMultiplier` on the same row and `STAFF_WAGE_SHARE_BP`
carves the staff pot from the same turnover, so it is the other half of this quantity, but it has
a different band column and a different budget. Also raised: the tier-8 curve prices CA 4 at
£57.24/wk and CA 6 at £157.74/wk, a 2.75× jump for two ability points from `k = 2.5` acting on a
2–7 range. **Correctness before calibration — nothing tuned.**

**Report:** `/Users/courtneyadesile/Documents/WunderkindFactory/docs/economy-loose-ends/a29-checks-panel-report.md`,
with the panel's real rendered output for all four input states.

---

## 2026-11-20 — A24: staff and scout wages priced from `wageMultiplierTiers` (app `new-game-save`)

**Stages touched:** `04_interfaces/output/routes.md`, `03_data/output/schema.md` (corrections
only — no stage regenerated).

Owner ruling: *"In terms of the cost of staff and the expectations on salary, they should be using
that wage band… based on the staff ability. This should all be the same for scouts as well."*

**🔴 Scouts no longer have their own pricing system.** There were three — the player curve,
`tierStaffWeeklyWagePence`'s band for staff, and a straight-line interpolation of a scout's
`experience` across the global `PoolConfig.scoutWageMin/Max`, with no club, country or division in
it. There are now two. `src/utils/staffWages.ts` gained **`resolveScoutWagePence(scout, economy?)`**
— `salary ?? weeklySalary ?? tierStaffWeeklyWagePence(ability, economy) ?? fallback(ability)` —
which is `resolveWorldStaffWagePence`'s chain rung for rung, minus the two rungs scouts have no
analogue for. The ordering was COPIED rather than re-argued, because the ruling is that the two
roles are treated the same.

**It prices on `ability` (A26's derived column), never `experience`** — owner ruling; `experience`
goes back to meaning career length, and it is bounded 4–34 on live config so an
experience-driven scout could never reach the top band at all.

**Two sites were not in the brief's count of four, and one was a real hole.**
`worldStore.buildWorldLeagueClubs` priced NPC club STAFF off the band and gave their SCOUTS no wage
field at all — so `StaffPoachingService.worldMemberSalaryPence` fell to the global interpolation
for a scout while reading `salary` for a coach. `WorldScout.salary?` is new and written at init;
`scoutToWorldScout` now carries it across the AMP→NPC boundary as `coachToWorldStaff` always has.
(`useInitFlow.worldStaffToScout` was already band-priced — the one path that was right.)

**⚠️ The hire market is NOT band-priced, for staff OR scouts, and that is the remaining half of
the ruling.** The band resolves on the paying club's tier and `market.ts` has none — it is a pure
API→domain transform, and the store holding the tier is `clubStore`, fenced off by this task's
brief because a sibling owns B1's budget work there. A market COACH is identical
(`salary: c.weeklySalary` straight through), so the two roles are still treated the same.
Documented at the call site. **`PoolConfig.scoutWageMin/Max` therefore does NOT become dead
config, contrary to the brief** — it still prices the pool.

**The band ceiling: config, not code, and behaviour-identical.** `WageMultiplierTier` now states
that **the last row is the catch-all whether or not its `maxAbility` is `null`**, which is what
both repos' contracts always claimed and what the committed default has — the live table's bounded
`60` made the trailing fallback load-bearing with nothing saying it was allowed to be, and 22.34%
of staff resolve through it. A 61+ ability takes **the same branch it always took**; no multiplier
and no row assignment changed. Restoring the `null` in live config is the equivalent fix and is the
owner's admin edit; a test proves the two tables are identical at every edge. **60–95 was NOT
re-banded** — calibration, unruled.

**The three cliffs were measured, not fixed** (ruling 4). Through the real pricing function on the
live SC payload: ability 14→15 **+58.4%**, 24→25 **−11.4%**, 39→40 **−20.1%**. ⚠️ **The brief's
"~20% cut at 24→25" is the ratio alone and overstates the wage** — it is the 39→40 edge that costs
~20%. Pinned as KNOWN in `scoutWageBands.test.ts` with a `DO NOT "FIX" THIS TEST` note, so a silent
re-authoring shows up in CI. `packWages.ts`'s and `staffWages.ts`'s reasoning comments were
REWRITTEN, not deleted, including the scout monotonicity claim — which A24 makes live for the role
it was written about.

**CHECKS gained `STAFF & SCOUT VALUATION — THE BAND`**, directly after A29's player panel and in
its shape: three screen rows (the authored ladder, staff, scouts), the per-row table in the
clipboard, `warn` at worst, no `?? 0` on a money field. The ladder row prints the staff/player
ratio per band and whether the top row is a catch-all — **it warns on live config right now**, and
both halves of that failure are admin edits rather than releases. It prices through
`tierStaffWeeklyWagePence` imported directly, so it cannot drift from the pricing path.

**⚠️ 🔴 THE NUMBER THE PM SHOULD CARRY TO THE OWNER.** A median dev scout (ability 29) goes from
**£35.00/wk** to **£3,066.93/wk at tier 1** / **£2,236.03/wk at tier 4** — **64× to 88×**. That is
the band working as ruled, not a defect: `band-ceiling-finding.md` §4's headline was that the
cheapest coach outearned the most expensive scout with no overlap at all, and scouts now land
inside the coach range because it is literally the same function. **Correctness before
calibration — nothing tuned.** Also measured and worth knowing: tier-awareness itself only buys
**1.372×** across the live SC pyramid (four tiers within 1.37× of each other), and **tiers 5–8
resolve to `legacy` so the band cannot price them at all** — a tier-5+ club's scouts do not move.

**Verified in an ISOLATED `git worktree` at `930fcde7`, not in the working tree.** ⚠️ **Another
session is writing `new-game-save` in this same checkout** — the B1 budget task, mid-flight across
`clubStore.ts`, `GameLoop.ts`, `dofHireCharge.ts`, `SignPlayerPanel.tsx`, `SignYouthPanel.tsx`,
`DofProposalService.ts`, `TransferService.ts` and the i18n files, and it briefly left the only
`tsc` error in the tree (`clubStore.ts(510,5): Cannot find name 'captureWarning'`, absent at HEAD).
**Flagged for the PM: two writers, one checkout.** None of it is in A24's commit — staged by
explicit path.


---

## 2026-11-20 — B1 finish: the DOF's pot becomes a carried ledger, and the player paths get gated

**Branch `new-game-save`. Not pushed, not deployed.** Base app `930fcde7`. Task: finish B1
against `docs/economy-loose-ends/b1-pm-review.md` §2, §3, §5 and §10.
**Report:** `/Users/courtneyadesile/Documents/WunderkindFactory/docs/economy-loose-ends/b1-finish-report.md`.

**The defect, fixed.** `clubStore.transferBudget` was a live percentage of the balance, re-derived
by five paths with no term for what had been spent — so the owner's limb 3 (a new hire's
remaining season of wages, charged to the director of football's pot) was refunded in full within
four weeks of game time, silently, by the Chairman's own four-weekly rebalance. Two new persisted
`clubStore` fields, `dofWageCommitmentPence` + `dofWageCommitmentPeriodWeek`, and one derivation
(`carriedTransferBudgetPence`) that **all five paths now go through** — they reduce to just
`recalculateTransferBudget` and `setBudgetAllocation`, so the fix is in two functions rather than
five call sites. The five contract-charge sites call a new `drawDofContractCharge(charge)` instead
of `spendTransferBudget(charge.totalPence)`.

🔴 **Only the WAGE half is carried, and that is a deliberate limit.** A fee is also booked to the
ledger, so the balance already carries it and carrying it here too would over-charge the pot by
the fee's share of the percentage. The consequence, stated so nobody reads this as "the pot is now
durable" without qualification: **a fee is still partially refunded by a re-derivation**,
`(1 − pct) × F`, pre-existing and unchanged. Making that durable means freezing the opening
allocation per period, which would stop mid-season income raising the pot and stop the share
control working immediately — a re-ruling, not a fix. Report §2.

**Graduation is a STALE PERIOD, not a `clear()`.** The carried total counts only while its stored
period matches `club.seasonBudget.createdWeek`, which is written by the same call that derives the
new budget — so the moment Step 1 picks the cost up is the moment the pot stops holding it, no
transition path has to remember to clear it, and none can forget to.

🔴 **§3's graduation property is still false, and I MEASURED it rather than restating it.**
`setAmpSeasonBudget` derives `projectedWagePence` from a ledger sum of what the club actually
paid, so a mid-period hire enters the next bill short by `salary × elapsed`, exactly. The test
that "pinned" the property asserted `expect(salary * WEEKS).toBe(salary * WEEKS)` — a constant
against itself — and is replaced by a measurement driven through the real service over a real
ledger. The carried ledger cannot fix this: it is Step 1's own derivation, which the owner ruled
correct.

**Part C's gate, finished.** Four player paths tested `contractCost.upfrontCost` while being
charged that plus the wage; the youth panel consulted the club's BALANCE, not the pot at all. All
now price through a new `dofSigningDraw`, the same arithmetic as the charge. ⚠️ **The review named
four comparisons and there were FIVE** — `DofProposalCard.tsx` has a second one at `:109` driving
the card's own warning, so the card could show a deal in budget and the accept would charge the
wage on top. Found by a source pin failing, not by reading the review.

⚠️ **Three `.context` corrections are the PM's, and I have changed nothing:**
`game-mechanics.md:1593–1595` (*"the pot is a spending envelope, not cash. Pinned by
`dofHireCharge.test.ts`"*) is **now true**, but pinned by the new `dofPotLedger.test.ts` instead;
`game-mechanics.md:1578–1580` (*"the two spans abut, so … no week is funded by nobody"*) is still
false and now *measured* false; and `dofHireCharge.ts`'s header makes the same abutting claim.

🔴 **A FINDING NOT IN THE REVIEW, not fixed, for the loose-ends list.** `GameLoop:5641`, the DOF's
automatic PLAYER renewal, tests and charges the sign-on fee only, then extends the contract at a
wage that may be higher — and nothing prices the delta. The staff renewal a few hundred lines
above charges exactly that delta. **So the asymmetry part C exists to remove survives in
renewals, pointing the same permissive way.** Out of my brief's four paths and a pricing change
the owner has not been asked about, so raised rather than built. Report §8.2.

**Two architecture registries moved, both guards earning their keep.**
`spendGateArchitecture.test.ts`'s SHRINKS-ONLY worklist had `SignYouthPanel.tsx` down as *"should
draw on the DoF pot like every other signing"* — which is what this did, so **the worklist is one
shorter**. `seasonBudgetService.test.ts`'s exact `seasonBudget`-reader registry gains six entries,
the four gate paths marked DECIDERS. `pickClubState.test.ts` pins the *exact* persisted field list
and failed until updated deliberately, which is the guard working: 20 → 22 fields.

**Verified:** `npx tsc --noEmit` clean. All seven suites touched: **7 passed / 138 tests**. New
suite `src/__tests__/economy/dofPotLedger.test.ts` (27). `dofHireCharge.test.ts` 24 → 33,
`DofStaffHiringService.test.ts` 24 → 25, `pickClubState.test.ts` 4 → 5. My delta: **+1 suite /
+38 tests**; the two architecture registries changed no counts. Catalogue 5,017 → 5,021 (+4
keys); `audit-tokens` 0 mismatches.

**`npm test` at `4c3f45eb`: 655 suites / 10,961 passed**, 10,965 collected, 3 skipped,
`--listTests` 655. ⚠️ For most of this task A24 had uncommitted work in this shared checkout, so a
run would not have been attributable — **A24 committed (`9f46bf66`) immediately before I did, so
the tree is clean at my commit and the count IS attributable.** ✅ **Reconciles exactly:** 652
suites / 10,891 tests at a clean `930fcde7` (corroborating A29) **+ 2 / +32 A24's + 1 / +38
mine** = 655 / 10,961.

⚠️ **`CLAUDE.md`'s `new-game-save` row (651 / 10,865) is stale by two changes** and is a one-way
mirror of `01_overview/output/environment.md` — **left to the PM**, as A29 also flagged.

⚠️ **The one failure is a wall-clock tripwire, not a logic failure, and not mine.**
`db/health/runner.test.ts`'s *"runs the boot pass inside 150 ms — a TRIPWIRE, not a device
figure"* read 207 ms while a second full jest run and A24's work were loading the machine. It
passes in isolation and it **passed** in an earlier full run on the same code; I touched nothing
in the health pass. 🔴 **Also worth knowing independently of this change: the documented
three-to-five-failure baseline did not appear at all** — one failure in 655 suites, and it was
that tripwire. Either it has been repaired or it is run-order dependent, and **it is what agents
are told to attribute against**, so it is worth re-measuring on a quiet tree.

⚠️ **No CHECKS line added, against standing-notes §1.** `ChecksTab.tsx` and
`economyDiagnostics.ts` are A24's territory in my brief and it has uncommitted work in both.
**Two lines recommended for the PM to assign once A24 lands** — a `DOF POT  opening · committed ·
pot · period` relationship line, which would have made this defect visible at a glance, and the
`createdWeek · week · span · remaining — SATURATED` line the review's §6 asks for.

⚠️ **The owner's open question is answered one way and either way stays cheap.** My implementation
does **NOT** refund: nothing credits the carried ledger back, so a sale or a sacking leaves the
commitment standing until the period rolls. A refund rule is one action
(`releaseDofWageCommitment`) with the same stale-period guard — which is the trap, since a release
after the period rolled would be free money. **No refund rule implemented on my own authority.**
**Nothing tuned — correctness before calibration.**

---

## 2026-11-20 — The DOF's player renewal prices the wage, not just the fee (app `new-game-save`)

**Stages touched:** none — this is a defect fix with no documented-content change. Entry recorded
here per the standing note; `04_interfaces/output/services.md` already describes §14b's chain
correctly now that it matches the staff path it documents beside it.

**🔴 The defect.** `GameLoop.ts` §14b gated an automatic PLAYER renewal on
`transferBudget < signOnFeePence`, charged `addTransaction(-fee)` + `spendTransferBudget(fee)`,
and then called `extendContract(player.id, offeredWage, …)` — **moving the wage with nothing
charged for it.** So the DOF could raise a wage by any amount and the only thing tested was a
sign-on fee that is a percentage of it. The STAFF renewal twelve lines below has had the whole
machinery since part C of the owner's budget ruling. **This is the asymmetry part C existed to
remove, surviving in renewals** — the 2026-11-16 fix repaired the fee half and stopped.

**The fix, in the staff path's shape.** `weeksRemainingInBudgetSeason`, one `dofContractCharge`
with `incumbentWeeklySalaryPence`, a refusal that names the fee or the wages, and
`drawDofContractCharge(charge)` where `spendTransferBudget(fee)` used to be. It is a **DELTA** —
the player is already inside the committed bill, so only `offeredWage − current wage` for the
weeks remaining is new money, floored at zero so a mean-reverted renewal commits nothing and can
never be refused on wages. The incumbent wage is read off the **live squad record**, because
`players` is a pass-level snapshot and a stale incumbent is a wrong charge that still looks
plausible. The draw goes through **B1's ledger**: `spendTransferBudget` clamps and records
nothing, so a wage drawn through it is refunded by the next re-derivation — drawing it without
the ledger would have rebuilt the defect B1 had just fixed. The fee only is booked as a
transaction; the weekly tick already pays wages.

**New `dofChargeRefusal(charge, pot)` in `staffHireBudget.ts`, and it is one line more than
copying the shape.** The staff path computes the charge TWICE — once itself, once inside
`staffHireRefusal` — and agrees only because the arguments are spelled identically at two call
sites, while its comment claims *"ONE computation feeding both the gate and the charge."* This
takes the charge OBJECT, so they are the same arithmetic by construction. `staffHireRefusal`
delegates to it; its 28 tests are green unchanged.

**Promise-branch gate: DECIDED, left fee-only**, documented at the site. It is an early-out
before the offer is raised, and whatever it admits meets the full gate below on the raised wage,
so the wage is never ungated. ⚠️ Pre-existing and NOT fixed: that `return` is silent, so a user
whose club cannot cover a promised renewal is never told.

**🔴 `renewalTransferBudget.test.ts` was lying in three ways, and only its own failure showed it.**
It is the 2026-11-16 fix's guard, so three of its six assertions pinned the superseded fee-only
shape; they are rewritten with a was/is/why table rather than deleted. Beyond that:
1. **It read COMMENTS as code.** `toMatch(/transferBudget < signOnFeePence/)` PASSED after the
   change — matching the rewritten reasoning, which quotes the pre-fix shape per the
   rewrite-don't-delete convention. **A source guard that matches prose starts passing the moment
   somebody deletes the explanation.** Comments are stripped in both guards now.
2. **It sliced a FIXED 12,000 characters** from its landmark, so it had been shrinking its own
   coverage every time anyone added a comment above it. One real assertion fell off the end and
   failed for running out of file. Landmark-bounded at both ends now. ⚠️ **For the PM: other
   fixed-window source guards are worth a sweep.** Flagged, not done.
3. **Rewriting those three nearly dropped the file's actual point.** The old
   `spendTransferBudget(signOnFeePence)` named the fee and the pot in ONE string; its replacement
   names only the charge, so "the fee is what the pot is charged" became implicit in how that
   object is built and nothing asserted it. A `feePence: 0` would have passed all nine tests
   there and all seventeen in the new suite. Closed by one assertion and **proven by mutation** —
   it is the only one of the ten that catches it. **Superseding a shape is legitimate;
   superseding the property the shape protected is how a guard quietly stops guarding.**

**Verified ALONE on a free machine, on the committed tree:** `npx tsc --noEmit` clean,
**656 suites / 10,983 passed, 10,986 collected**, `--listTests` 656. ✅ Reconciles exactly against
this session's clean `598ff158` baseline of 655 / 10,965: **+1 suite / +21** —
`dofPlayerRenewalCharge.test.ts` (17) plus `renewalTransferBudget.test.ts` 6 → 10.

⚠️ **`CLAUDE.md`'s `new-game-save` row still needs a line, and it is deliberately NOT written
here.** That table is a one-way mirror of `01_overview/output/environment.md`'s green-master bar
and has gone stale six times from well-meant edits. **Left to the PM**, with the figures above
and the caveat that `655 / 10,962` is A24 **+ B1**, not A24 alone.

🟢 **Worth a line in `environment.md` on its own account:** three suites on this box assert wall
clocks and retry budgets and fail when it is loaded — `db/clientRecovery.test.ts`,
`screens/tournamentHubRender.test.tsx`, `db/health/runner.test.ts`, each green in isolation, no
two runs agreeing on which. The same suite measured **2,825 s** loaded and **151 s** alone, 18.7×.
That is most of what the documented "three to five failures" baseline has been.

**Report:** `/Users/courtneyadesile/Documents/WunderkindFactory/docs/economy-loose-ends/a24b-dof-player-renewal-report.md`

---

