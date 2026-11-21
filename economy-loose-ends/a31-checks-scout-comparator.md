<!-- STATUS --> **STATUS:** 🟢 LIVE — brief for A31, issued 2026-11-21 by the PM session.

# A31 — The CHECKS panel compares scouts against a rate that no longer governs them

**Read `agent-standing-notes.md` with this brief.** It carries the conventions this brief does not
restate. If it and this brief disagree, say so in your report rather than silently picking one.

**Repo:** `wunderkind-app` only. **Branch:** `new-game-save`. **Build on `92e90755`** (A30's fix —
*"A Scottish save stops being built on England's economy block"*), which is the current tip and
**touched both of your files.** §0b says what it did to them.

**ICM:** read `.context/CONTEXT.md` first and let it route you before grepping source. For this task
that is `07_synthesis/output/economy-reference.md` (§E is the `src/economy/` constants table, module
index and contradiction register) and `05_ui` for the panel's conventions.

---

## 0a. STATE OF THE CHECKOUT — CONFIRM IT BEFORE YOU MEASURE ANYTHING

**Build on `7d8c552d`, the current tip.** Above `92e90755` sits `7d8c552d` (*"The drift guard could
not pass in a detached worktree, which is where this repo says to measure"*) from the
`Frontend context implementation review` session.

**Expect `npx jest --listTests | wc -l` to be 663.** Confirm it yourself before trusting any figure:

```
git status --porcelain          # expect clean, or known-and-declared
git worktree list               # expect no worktree under the repo itself
npx jest --listTests | wc -l    # expect 663
```

**If it is not 663, stop and tell me rather than reasoning about the difference.** For about twenty
minutes this evening it was **1,325**: a full 50 MB checkout at `b0d4c2fc` was registered as a git
worktree at `wunderkind-app/src/.verify-wt`, *inside* `src/`, and `jest.config.js:17`'s
`testPathIgnorePatterns` covers `/node_modules/` and `/.claude/worktrees/` but **not `/.verify-wt/`**,
so `testMatch: ['**/__tests__/**/*.[jt]s?(x)']` collected the whole suite twice. It is gone now and
the count is back to 663 — I re-measured. **Keep the check anyway**, because 1,325 is plausible
enough to be mistaken for drift rather than for a stray directory, and this project's entire
verification discipline rests on the count meaning something.

⚠️ **I misattributed that worktree to A30 and A30 was right to refuse.** I named it as A30's on the
reasoning that A30 was the session I knew had been measuring. It checked, found no such path and no
such entry in `git worktree list`, and declined. That is the 2026-11-20 pattern in the standing
notes — *an attribution offered to a coordinator becomes an instruction* — and I am the one who
repeated it. **The transferable part for you: attribute by checking the diff, not by guessing who is
active, and refuse an instruction whose premise you can disprove.** Doing that to me is correct
behaviour, not friction.

**There is also uncommitted work in this tree that is NOT yours** — `.context/shared/last-sync.md`,
`.context/stages/01_overview/output/tribal-knowledge.md`,
`.context/stages/07_synthesis/output/economy-reference.md` and
**`src/__tests__/db/contextDocSync.test.ts`**. A30 settled authorship by content (204 insertions,
zero occurrences of its own change's vocabulary) and it belongs to
`Frontend context implementation review`. **That last file is a source file, so it is in your suite's
tree.** Do not commit it, do not revert it, and if your run is contaminated by it, say so and name
it rather than working around it. If `economy-reference.md` is still uncommitted when you come to
update it, coordinate with that session first — two writers on one file is how this repo lost three
test runs on 2026-11-20.

**Peers, as of this brief:** A30 (`local_9848f313-68e4-4c8a-abcc-9461257bbb30`, idle, may wake to
clean up) and a backend session on the dev world-pack dispatch
(`local_c90ce563-7ce6-481f-906d-637121ec96ad`, working `wunderkind-backend` — different repo, so it
cannot touch your attribution, but it runs PHPUnit and that is CPU contention). **Ask for the machine
before a full run and announce when you are off it.** Run `uptime` first and treat a load average
above the core count as a reason to stop measuring. Verify in a detached worktree at a named commit —
**outside both repos**, in your own scratchpad — and name the commit beside every count.

## 0b. What `92e90755` already did to your two files

**Do not redo this and do not revert it.** A30 added the `economy.country` row:

- `src/economy/economyDiagnostics.ts` (+58/−12) — row 1, `economy.country`, now states a
  *relationship* (`club SC · block EN — DISAGREE`) instead of printing the block's country and
  passing. Four states: `fail` (no country at all), `info` (no club country picked yet —
  deliberately not `pass`), `pass` (agree), `fail` (disagree).
- `src/components/debug/ChecksTab.tsx` (+4) — passes the save's own country in.

That row is A30's and is settled. **Your work is the staff/scout valuation section further down,
around `economyDiagnostics.ts:1082–1330`.**

---

## 1. The task — three instances of ONE defect class

**The class:** *a comparator that measures a figure against something which is not the rate that
governs it.* A diagnostic that reports a wrong ratio for correct behaviour is worse than no
diagnostic, because somebody will chase it — and on this project somebody did, twice.

| # | where | compares against | what actually governs | status |
|---|---|---|---|---|
| 1 | the CHECKS **scout** row | the band | the club's own income, since `ec949536` | 🔴 primary |
| 2 | `computeNpcWageBill` | players + `club.staff` only | scouts are a real weekly outflow too | 🔴 in scope |
| 3 | `LEGACY_TELL_BOTTOM_TIER_PENCE` | a fixed 250,000 pence | each country's own ladder | 🟠 in scope, see §4 |
| 4 | `VALUATION_SAMPLE_TIERS` | the fixed tiers `[1, 3, 5, 8]` | the country's own `tierCount` | 🟠 in scope, see §4b |

All three are verified below at file and line **by me, in the code, not quoted from a report.** What
I have *not* verified is any claim about the right fix — that is yours, and §5 names a real design
tension I am deliberately not resolving for you.

---

## 2. 🔴 The precedent — and why it inverted under us

**`7b56c6c8` ("The staff CHECKS row compares against the rate that wrote the row") is the template,
and you should read its full commit message before writing any code.** It fixed exactly this class,
one role over, and its reasoning is the reasoning you want:

> A device run on OTA 491 read 1.00 for every sampled scout and 0.42-0.67 for every sampled staff
> member, same check and same comparator. Neither figure was a defect in a wage. The 0.4x was a
> defect in this panel.

Its mechanism: two different functions write those rows. `club.staff[]` is band-priced at ingest and
then **overwritten** by `npcStaffWagePence` (the club's income-anchored rate) via `snapNpcStaffWages`
at bootstrap and `anchorNpcStaffWages` at each season transition; `club.scouts[]` was band-priced at
ingest and **left alone**, because both of those functions iterate `club.staff` only. So it made the
panel *"compute both rates and ratio against whichever GOVERNS the row"*, and it signed off with:

> A SCOUT OFF THE BAND NOW READS AS WHAT IT IS: A STALE WRITE.

⚠️ **That sentence was true when it was written and `ec949536` made it false.** `ec949536` ("A club's
scouts are re-priced on its own income, like its coaches") moved NPC scouts onto the income-anchored
rate. **So a scout off the band is now CORRECT, and the panel reports it as a stale write** — the
identical failure `7b56c6c8` existed to fix, with the roles swapped. The panel's own docblock still
describes the old world; `economyDiagnostics.ts:1306` reads:

> `| club.scouts[]` | `resolveScoutWagePence` → the band | **nothing.** Both of those functions
> iterate `club.staff` ONLY |

and `:1325` adds *"⚠️ It reports; it does not judge the split as correct."* **Both statements are now
stale.** Correcting that prose is part of this task, not a nicety — stale confident text is this
project's worst documented failure mode.

⚠️ **This also means START-HERE §4 item 2 understates it.** It says to *"expect scout rows to read
wrong until someone updates the comparator"*, which reads as cosmetic. It is not: the panel is
actively asserting that correct pricing is a defect, on the one surface the owner uses to answer
questions about a live save.

### 2a. 🔴 This premise was contested and settled in code — read this before you trust §1

**A30 told me I had it backwards**, on the reasoning that `snapNpcStaffWages` / `anchorNpcStaffWages`
iterate `club.staff` only, so scouts stay band-priced and the band remains their governing rate. It
cited `economy-reference.md:1497-1511` and the panel's own docblock at `economyDiagnostics.ts:1305-1306`.

**I checked the code and the premise holds. Verified by me, in the source at `7d8c552d`:**

- `SeasonBudgetService.ts:207` — `type AnchoredRosters = Partial<Pick<WorldClub, 'staff' | 'scouts'>>`,
  whose own docblock at `:205` says a pass must not *"[do the staff] half and forget the scouts, which
  is the exact shape of the defect being fixed."*
- `SeasonBudgetService.ts:215` — `anchorScouts(club, budget, economy, price)`, *"The scout half of a
  re-anchor pass."*
- `anchorNpcStaffWages` (`:250`) calls `anchorScouts(club, budget, economy, staffRenewalWagePence)`
  at `:257` and returns `{ staff: next, scouts }`.
- `snapNpcStaffWages` (`:699`) calls `anchorScouts(..., (_existing, anchored) => anchored)` — snap
  rather than mean-revert — and returns `{ staff: next, scouts }`.
- `ec949536`'s own commit message says it in as many words: *"`economyDiagnostics.pickStaffValuationSample`
  samples NPC clubs' `club.scouts` and … **This is the OTA 491 defect, for scouts**"*, and
  *"`computeNpcWageBill` (`npcFinances.ts:64`) still omits scouts — a fourth site with the same
  [omission]"*.

**So NPC scouts ARE re-anchored, and the two sources A30 cited are the stale prose this task exists
to fix.** `economyDiagnostics.ts:1305-1306` describes the pre-`ec949536` world in the present tense,
which is exactly how a careful agent reading the file got the current behaviour wrong. *A comment is
a claim, not a measurement* — and this is the most expensive demonstration of it I have seen on this
project, because the claim is sitting inside the very module whose comparator it misdescribes.
**Correcting it is item 5 of §9, and it is not cosmetic.**

### 2b. ⚠️ But the governing rate is CONDITIONAL — do not hardcode either answer

A30's instinct was not baseless and there is a real subtlety underneath it. **`snapNpcStaffWages`
is gated:**

```ts
function snapNpcStaffWages(club, budget) {
  const economy = resolveEconomy(useGameConfigStore.getState().config, club.tier ?? 8);
  if (!economy.incomeAnchoredWages) return null;        // ← the gate
  const scouts = anchorScouts(club, budget, economy, (_e, anchored) => anchored);
```

**With `incomeAnchoredWages` off, the bootstrap pass does nothing and the band DOES still govern.**
And `anchorNpcStaffWages` is deliberately *not* gated the same way — its comment at `:252-254` says
the gate was left out because *"`npcStaffWagePence` already returns `undefined` with the flag off"*,
**but `anchorScouts` is called at `:257`, before that reasoning applies to anything.** Whether the
scout half honours the flag the way the staff half does is **a question to measure, not to assume**,
and I am not telling you the answer because I do not have it.

**So the comparator must ask what governs THIS row on THIS save, not encode a conclusion.** A fix
that hardcodes "scouts are income-anchored" is the same defect as the one you are removing, pointed
the other way — and it would read wrong on any save with the flag off. **Measure both flag states.**

---

## 3. Instance 2 — `computeNpcWageBill` drops scouts entirely

`src/utils/npcFinances.ts:44-66`. Verified:

```ts
const playerWages = club.players.reduce((s, p) => s + (p.wage ?? p.contractValue ?? 0), 0);
const staffWages  = (club.staff ?? []).reduce((s, m) => s + resolveWorldStaffWagePence(m), 0);
return playerWages + staffWages;
```

**`club.scouts` is never summed.** Its consumers are the NPC affordability and solvency path
(`npcSolvency.ts:118` documents the total as *"Players + staff"*), `npcFinances.ts:358`,
`clubProfileLogic.ts:154` and `npcClubDebugAssessment.ts:106`.

🔴 **The function's own comment, at `:56-59`, describes what this does — about the previous instance
of the same bug:**

> That is not cosmetic. `buildNpcAffordabilityBase` is built on this, and its own docblock records
> what a too-low wage bill does: the gate *"consistently believed clubs were richer than they were
> and waved through signings that drained them"*. Same defect, different dropped outflow.

It then dropped a different outflow. **A scout is a real weekly cost** — on the owner's own club a
scout was £12,510/wk of a £13,376 staff bill, 93.5% of it — so for a club with scouts this is not a
rounding error in the solvency verdict.

⚠️ **Two cautions.** First, check whether any caller compensates by adding scouts itself, or the fix
double-counts — trace it in **both** directions, forward from the callers and backwards from the
money. Second, this changes NPC affordability and solvency verdicts, so **it is a behaviour change,
not just a diagnostic fix.** If it moves NPC signing behaviour in the suite, say so plainly and let
me take it to the owner rather than tuning anything to compensate.

---

## 4. Instance 3 — the legacy tell is calibrated to England, in a world that now scales by country

`src/economy/worldPackDiagnostics.ts:30`:

```ts
/** Weekly pence. Above this at the BOTTOM tier means the squad was priced on the legacy model. */
export const LEGACY_TELL_BOTTOM_TIER_PENCE = 250_000;
```

and `:97-99`:

```ts
const pricing: PackPricing = bottomTier === null
  ? 'unknown'
  : bottomTier.meanWagePence > LEGACY_TELL_BOTTOM_TIER_PENCE ? 'legacy' : 'turnover';
```

**This is the row that printed `Squad pricing model: LEGACY — FAIL` on the broken Scottish save** —
and A30 established by measurement that it is *not* a resolver read at all: `fallbackReason` was
`'none'` and the model `turnover` throughout. The Scottish squad crossed an **England-calibrated
threshold** because it was priced on England's money.

So the check worked, by luck, at 10×. **My reading, and it is reasoning rather than a measurement:
it has an England-shaped sensitivity floor.** Scotland's money is one tenth of England's, so a
correctly-priced Scottish bottom tier sits far below 250,000 — and so does one priced three or five
times too high. For any country scaled below England this check cannot fail, which fails the standing
notes' own bar: *a check must be able to fail, and the failure must change what someone does.*

**Measure that before you act on it** — resolve Scotland's bottom-tier mean through the real
resolver and see how much mispricing it would take to cross 250,000. If I am wrong, say so. If I am
right, the fix is the same sentence as the rest of this brief: compare against the rate that governs,
resolved for the country, rather than a constant. The constant's own docblock already concedes it is
*"'which order of magnitude' and nothing finer"*.

⚠️ **`LEGACY_TELL_BOTTOM_TIER_PENCE` is exported and may have test assertions on it.** Check before
changing its shape, and **tiers are flexible** (binding rule, owner, 2026-11-20): whatever replaces
it must read `tierCount` or a row's own `tier`, never a position or a fixed depth.

---

## 4b. Instance 4 — the panel samples England's tiers on every country

`src/economy/economyDiagnostics.ts:722` — `VALUATION_SAMPLE_TIERS = [1, 3, 5, 8]`. This is **live
violation 4** of the owner's *tiers are flexible* ruling, recorded in `CLAUDE.md` and in
`tribal-knowledge.md` Q4, and **it is in your file.**

🔴 **It is not theoretical and A30 found its fingerprint.** On a four-tier country, tiers 5 and 8 can
never match a player, so **two of the four samples are always empty — which is why the Scottish dump
sampled 8 players where England sampled 16.** Anyone reading that dump is reading half a sample
without being told.

A30 left it alone deliberately, as yours. **Fix it to read the country's own `tierCount` (or the
rows' own `tier` values), never a fixed list or a position.** It is cheap, it is in the file you are
already editing, and it makes every valuation figure on a non-English country trustworthy for the
first time. The binding rule: *a quantity derived per tier reads `tierCount` or the row's own `tier`;
a quantity that IS per-tier data is published, not authored in app code.*

⚠️ **One thing NOT to assume while you are in here.** A30's live config capture at
`economy-loose-ends/a30-config-capture-2026-11-21/` (EN, SC and a no-country block from one dev
publish) unblocks the Scottish gate suite — but **no coverage figure in `economy-reference.md` has
been re-measured against it. Every number in that file is still England's.** The capture is an
unblocked task, not a measurement taken. Do not quote those figures as if they covered Scotland, and
do not treat a disagreement between them and your own reading as a regression.

---

## 5. ⚠️ The design tension I am NOT resolving for you

`7b56c6c8` made a deliberate architectural choice and wrote down why, and your fix runs straight into
it. **Read this before you design anything.**

`economyDiagnostics.ts` must stay runnable **outside the app** — pinned by
`economyDiagnostics.test.ts`'s *"it stays runnable OUTSIDE the app"*, because it once imported from
`api/endpoints` and so the CHECKS output *"could not be reproduced against a live config without a
device, which is most of what it is FOR"*. `npcStaffWagePence` lives in the engine layer, so
`7b56c6c8` **injected** it as an `NpcStaffRateResolver` which `ChecksTab` supplies and a test stubs.
And it explicitly warned:

> That is a deliberate single exception: the band is still imported directly from the economy layer,
> and **a second injected rate would turn this panel into a model of the pricing path rather than a
> reading of it.**

**The scout rate is now a second engine-layer rate.** So the obvious fix — inject it too — is the
thing that commit told you not to do. Your options include: reuse the existing resolver if
`ec949536` routed scouts through the same function (**check this first — it may make the tension
vanish**); widen the one resolver to take a role; or conclude the warning no longer applies and say
why. **I am not picking. Pick one, justify it against that paragraph, and if you think `7b56c6c8` was
wrong, say so directly** — believe the code over the brief, including over this one.

---

## 6. Boundaries

- 🔴 **OUT OF SCOPE — the reload defect.** START-HERE §4 item 2's second unowned finding: a
  re-anchored salary does not survive a reload, because the world blob strips both rosters while
  `seasonBudget` persists, so bootstrap skips the club and never re-snaps. It is pre-existing, hits
  coaches identically, and **bounds the real value of both re-anchor passes** — which means it may
  bound the value of your fix too. **Do not fix it here.** If you touch it incidentally, or if it
  makes your own verification impossible, say so in your report and I will brief it separately.
- **Do not re-rule what anything should cost.** Correctness before calibration; tuning is parked.
  ⚠️ **Specifically: the ability-proportional split is unruled.** `ClubWageScaleService` splits a
  club's reservation in proportion to ability, so a scout at ability ~22 among coaches at 2–7 takes
  a large share — the owner's scout was 93.5% of a £13,376 bill, 84× a coach of the same star
  rating. **Whether that is right is the owner's call, not yours.** Your job is to make the panel
  report it honestly, not to make the number smaller. Report what the honest comparator reveals.
- **The player's own club is deliberately not re-anchored.** Under the owner's B1 ruling that **a
  staff salary is a contract**, `anchorAmpStaffWages` was retired and the owner's scout moves at
  renewal. Do not reinstate an AMP re-anchor pass; if your comparator needs to treat the AMP club
  differently from NPC clubs, that is the reason.
- **Facilities and upkeep are out of scope** (owner, 2026-11-20), with Scottish clubs reading
  insolvent as an accepted consequence.
- **The panel is already too heavy.** A13 owns cleaning it up. **Earn every line** — prefer
  correcting an existing row to adding one, and if your change can remove a line, say so.
  `7b56c6c8` and `92e90755` each fixed a row with zero net new rows; match that if you can.
- **Do not push and do not deploy.** The owner runs deploys.

---

## 7. Verification

- **Prove the panel reads correctly for BOTH roles and BOTH club kinds** — NPC staff, NPC scouts,
  and the AMP club's own, which is governed differently on purpose. A fix that makes the scout row
  read 1.00 by comparing it to itself is not a fix.
- **England is the control and must stay correct.** Prove it rather than asserting it.
- **Verify what the panel PRINTS, not just what the function returns.** This is A30's lesson and the
  country-scaling session's before it: the band was verified to scale 10.000 EN/SC and did, while
  stored wages did not, because nobody measured the thing that was wrong. The equivalent trap here
  is a green unit test over a ratio helper while the rendered row still says `stored/band`.
- **A CHECKS row is a cheap way to disprove an invariant you were about to encode** — it has already
  saved this project three times. If you are about to write "obviously the scout ratio must be 1.00",
  render it first and watch it fail.
- `npm test` green with the **suite count confirmed** (`npx jest --listTests | wc -l` equals it — see
  §0a) and `npx tsc --noEmit` clean, both at a named commit in a detached worktree outside the repo.
  **Baseline is ZERO failures** on an idle machine; do not import the backend's "three to five".
- **Capture failing TEST names, not just `FAIL` lines** — add `^  ● [A-Za-z]` to your filter,
  exclude `● Console`. Re-run any of these alone before attributing it to your change:
  `db/clientRecovery`, `screens/tournamentHubRender`, `db/health/runner`, `db/youthRepository`,
  `db/realisticSave`, `db/testHandleGuard`, `components/new-game-setup/randomClubProbe` — all eight
  assert wall clocks and the suite contends with itself, so such a failure is uninformative even on
  a quiet machine.
- **Commands:** `nvm use` first (Node 20.19.6), `npm install --legacy-peer-deps`, `npm test`,
  `npx tsc --noEmit`. No lint script.

---

## 8. Reporting

- **Report:** `wunderkind-docs/economy-loose-ends/a31-checks-scout-comparator-report.md`, outside
  both repos. **Commands and output verbatim, never summarised** — "tests extended" is not "tests
  pass", and that gap cost a round of rework. Throwaway work in your own scratchpad, **never inside
  either repo** (see §0a for why that is not a theoretical rule today).
- 🔴 **Mark the epistemic status of everything you report to me.** "I verified X by running Y" and
  "I believe X because Z" look identical to a coordinator, who will act on both. An inference
  offered to the previous PM as a fact produced an instruction that would have destroyed 309
  insertions of a third session's uncommitted work.
- **`.context` is mine.** Append one pass entry to `.context/shared/last-sync.md` and correct stage
  text your own change makes wrong — `07_synthesis/output/economy-reference.md` almost certainly
  qualifies, since it documents what governs a scout's wage. Flag anything else stale, naming the
  file, rather than editing it. ⚠️ **Read `b0d4c2fc` first** — it changed the `.context` rules and
  added a guard, and A30 has uncommitted edits to `contextDocSync.test.ts`, so coordinate before
  touching it.

---

## 9. What done looks like

1. Every CHECKS row that samples a wage **ratios it against the rate that governs it**, with any
   non-governing comparison printed only where it is explicitly labelled as such.
2. A correctly re-anchored NPC scout reads as correct; a genuinely stale write still reads as stale.
   **Both directions demonstrated**, not just the first.
3. `computeNpcWageBill` counts scouts, with no caller double-counting, and the effect on NPC
   solvency verdicts stated plainly — flagged to me if it moves signing behaviour.
4. §4 resolved either way: the legacy tell scales with the country, or you have measured that it
   does not need to and said so.
5. The stale prose at `economyDiagnostics.ts:1306` and `:1325` corrected, and `7b56c6c8`'s *"a scout
   off the band is a stale write"* conclusion updated wherever it is recorded.
6. `npm test` green, count confirmed, `tsc` clean, at a named commit; report filed with verbatim
   evidence; `.context` stage text corrected or flagged.
7. Nothing pushed, nothing deployed, no worktree left inside the repo.

**If the brief and the code disagree, the code wins and your report says where.** I was wrong about
`fallbackReason` on A30 and the agent was right to measure it instead of believing me.
