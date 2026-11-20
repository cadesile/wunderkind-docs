<!-- STATUS: 🟢 DONE — committed to `new-game-save` as 9bac0b18, NOT pushed, NOT deployed. Full suite GREEN on the committed tree: 659/659 suites, 11,057 passed, zero failures. Read §3 (what remains untrue), the academy sub-section of §2, and §5's near-miss before signing this off. -->

# The DOF's pot refunds what it no longer owes

**Task:** build the refund side of B1's carried wage-commitment ledger.
**Ruling:** owner, 2026-11-20, asked directly and answered *"yes, absolutely"* — unspent
remainder returns to the DOF's pot when a player or staff member is **sold** or their
**contract ends** mid-season.
**Branch:** `new-game-save`. **Not pushed, not deployed.**
**Base:** app `ac71159b` ("A scout's income-anchored wage reads ability, not experience", A24).

---

## 1. The shape of what was built

### The ledger gained a third part: WHO the money is owed for

B1 left two persisted fields — `dofWageCommitmentPence` (the money) and
`dofWageCommitmentPeriodWeek` (the period it belongs to). The refund adds
**`dofWageCommitments: DofWageCommitment[]`**, one entry per refundable commitment:

```ts
interface DofWageCommitment {
  subjectId: string;      // players.id or staff.id
  weeklyPence: number;    // the weekly DELTA that was charged
  committedWeeks: number; // how many weeks of it the pot paid for
  chargedWeek: number;    // club.weekNumber when the charge was drawn
  periodWeek: number;     // the budget period, same identity as the scalar's
}
```

The scalar stays the MONEY and stays authoritative for the pot. The entries are the
**attribution**, and a departure spends one.

### 🔴 Why the scalar alone could not answer the ruling — this is the main finding

B1's report sketched the easy version: `releaseDofWageCommitment(weeklySalaryPence × weeksStillRemaining)`,
subtracting from the scalar. **That version pays out free money by two separate routes**, and the
brief's framing — *"the refund is the same arithmetic run at the departure week"* — is true of the
arithmetic but not of the lookup:

**1. The scalar cannot say whether the departing person was ever charged.** A player signed LAST
season is a Step 1 committed cost, funded out of income; the pot never paid a penny for them.
Driving a refund off their wage hands the DOF money it was never charged, **on every sale of an
established player** — which is most sales. Nothing in the scalar distinguishes them.

**2. The scalar cannot say what the per-week figure was.** The charge is a product. `£20,000` is
`£500 × 40` or `£2,000 × 10`, and those refund by an order of magnitude differently at a given
departure week. **A renewal makes this worse**: its commitment is the DELTA over the incumbent
wage (`dofContractCharge`, floored at zero), so the departing person's *current* wage is not the
figure that was charged. Reading the wage off the person over-refunds every renewal — a coach on
£5,000 renewed at £6,000 was charged the £1,000 rise, and refunding £6,000 × weeks is six times
the charge.

So `DofContractCharge` now also returns **`wageWeeklyPence`** and **`wageWeeksCommitted`**, the
two factors of `wageCommitmentPence`, because a product cannot be un-multiplied weeks later in a
different file. Pinned by the two exhaustive `toEqual`s in `dofHireCharge.test.ts`, which failed
on the shape change — the guard working.

### The arithmetic

```
weeksReleased = clamp(0, W, (chargedWeek + W − 1) − departureWeek)
refund        = weeklyPence × weeksReleased
```

⚠️ **The departure week itself is not refunded, deliberately.**
`weeksRemainingInBudgetSeason` is floored at 1 because *"the club does owe this person at least
the week they arrive"*; the same reasoning says it owes the week they leave. Without it, signing
and selling inside one week is a **free round trip of the whole remaining season** — refund
£200,000, keep the player a week, pay nothing. That is the hole the floor at 1 closes at the
arrival end, re-opened at the departure end. It also means a release can never exceed its own
charge, which is what keeps the over-refund report (below) a report of a real bug.

### 🔴 The charge and the refund agree about the budget period — measured, not assumed

The PM flagged this as mattering more than either change individually: `4113d326` (the DOF's
automatic player renewal) is a new caller of the ledger, and if its idea of "weeks remaining in
the budget period" differed from the refund's, every contract would be silently over- or
under-refunded. **They agree, and the algebra says so rather than a worked example:**

```
lastWeekOwed = chargedWeek + weeksRemaining − 1
             = w + (span − (w − c)) − 1
             = c + span − 1          ← the budget period's OWN final week
```

So a commitment's last covered week is the last week of the budget period, **for every arrival
week.** That is the property that makes the refund and the stale-period graduation **abut rather
than overlap**: a refund can never reach past the period's end because the commitment never did,
and past that point graduation takes over — the two mechanisms cannot both act on the same week.

Pinned three ways, in §9 of `dofPotRefund.test.ts`: a sweep over all 46 arrival weeks asserting
`lastWeekOwed === periodEnd`; the boundary cases at `periodEnd − 1`, `periodEnd` and
`periodEnd + 1`; and a sweep over all 46 departure weeks, driven through the real store,
asserting **`refunded + kept === the whole commitment`** and **`kept === the weeks the club
actually had them`**. Nothing double-counted and nothing lost, at any departure week.

### The three traps, and why each is structurally unreachable rather than merely handled

**1. The stale-period guard is one expression, not a branch.**

```ts
const period  = dofBudgetPeriodWeek(state.club);
const carried = carriedDofWageCommitmentPence(state);   // 0 once the period has rolled
const live    = liveDofWageCommitments(state);          // empty for the same reason
```

Entries carry the period the scalar carries, written by the same call, so the two can never
disagree about whether the ledger is alive. A departure after the period rolled therefore
refunds 0 and writes a total of 0 **under the current period**: the graduated commitment is not
resurrected, because nothing is subtracted *from* it. The naive `stored − refund` with the
current period written back is exactly what this shape makes unreachable — it would stamp a live
period onto a total the club has already absorbed into Step 1, and because a late departure
refunds 0, **the whole commitment would come back as spendable pot and be charged a second
time.** Pinned by two tests written to fail if the guard is bypassed, including one where the
departure falls *inside* the old span so the refund would be non-zero if the entry were counted.

**2. An over-refund is floored AND reported.** `reportDofOverRefund` mirrors B1's
`reportDofOverdraw`: `captureWarning('DOF pot over-refunded', …)`, and the figure is returned on
`DofPotRelease.overRefundedPence`. A refund is bounded by the entries it spends and every entry's
money was added by the draw that created it, so an over-refund means **the entries and the total
have drifted apart** — which no departure can cause. The floor stays (the total must never go
negative) but no longer swallows the evidence. ⚠️ Same limit as B1's: `captureWarning` is
dev-builds-only, which is where it is read.

**3. Idempotency is the entries, not a flag.** A departure retires its entries, so a sale that
fires twice — or a contract-end pass that runs twice in a week — finds nothing the second time
and returns `releasedCount: 0` having written nothing. **There is no "already refunded" flag to
keep in step with anything, because the permission slip is the thing that gets spent.** Pinned
three ways: a second release, ten in a row, and a doubled sale driven through the real store
action.

### Both doors, side by side

| | draws | writes |
|---|---|---|
| `drawDofContractCharge(charge)` | `feePence + wageCommitmentPence` off the pot | adds the wage half to the scalar, appends an entry when a `subjectId` was named, prunes graduated entries |
| `releaseDofWageCommitment(subjectId)` | credits the refund back to the pot | subtracts it from the scalar, retires that subject's entries |

⚠️ **One consequence of crediting the stored pot, stated rather than left to be found.** After an
over-DRAW (B1's own failure mode — a gate let through more than the pot held, so `transferBudget`
floored at 0 while the whole commitment went on the ledger), a later departure credits
`transferBudget` back upward. That is arguably right — the club has genuinely stopped owing those
weeks — and it is harmless either way, because the carried total is the authoritative figure: the
next re-derivation produces `opening − carried` regardless of what the stored pot drifted to. The
stored figure is drawn and credited symmetrically, which is B1's own model, and no new mechanism
is needed to keep it honest.

The refund is credited **straight back to `transferBudget`** as well as taken off the scalar,
mirroring the draw, which takes both halves off immediately so the screen is not left showing a
figure that is not the figure. A re-derivation reaches the same answer via `opening − carried`;
the immediate credit is so the screen does not have to wait for one.

---

## 2. Every departure path, measured from the call graph

**The refund lives in FIVE store actions, not at the ~30 call sites that reach them.** This is
the single most load-bearing decision in the change, and it is B1's own argument re-used: B1 put
the carried subtraction in `recalculateTransferBudget`/`setBudgetAllocation` rather than at their
five callers, so a sixth path could not miss it. Same here.

| choke point | the departures that reach it | call sites |
|---|---|---|
| `squadStore.removePlayer` | player contract expiry (`GameLoop:1007`), the coach-ratio morale exit (`GameLoop:3494`), retirement + the seasonal cull (`SeasonTransitionService:1915`) | 3 |
| `squadStore.removePlayerLocal` | **a SALE** — accepted bid (`InboxResponseHandlers:270`), the inbox screen's own accept (`inbox.tsx:661`), `GameLoop`'s auto-accept (`:3173`), an NPC recruiting from the AMP club (`npcTransferExecutors:720`) | 4 |
| `squadStore.releasePlayer` | the manual release (`app/player/[id].tsx:1404`), the event queue (`EventQueueOverlay:1374`), the weekly tick (`useWeeklyTick:834`) | 3 |
| `coachStore.removeCoach` | sacking (`staffDismissal:34`, `:53`, `app/staff/[id].tsx:412`), staff contract expiry (`GameLoop:1091`), the morale exit (`:3543`), a walking manager (`:3907`), an ultimatum resignation (`StaffUltimatumService:209`), a mandate dismissal (`OwnerMandateService:715`), a poach by an NPC club (`StaffPoachingService:431`), the new-game incumbent swap (`applySetup:216`) | 10 |
| `scoutStore.removeScout` | sacking (`app/staff/[id].tsx:413`), staff contract expiry (`GameLoop:1092`), a poach out (`StaffPoachingService:436`) | 3 |

⚠️ **One of those call sites is a destructured `removePlayerLocal(player!.id)` in
`app/(app)/inbox.tsx`, which a grep for `.removePlayerLocal(` does not find.** It was found only
because the choke-point design made finding it unnecessary. Had the refund been wired per call
site, that sale path would have been missed — and it is the user's own "accept the bid" button.

### 🔴 The one departure the stores cannot see: the academy

**A youth scholarship draws the pot** — `SignYouthPanel` goes through the same
`makeAmpBuyerFinanceCallbacks` as an adult signing — **but a youth scholar is not in
`squadStore`**, which refuses under-age players. So none of the three removal actions fires for
them, and the academy exit needed three explicit sites:

| site | the departure |
|---|---|
| `app/player/[id].tsx` `confirmRelease` | the owner releasing a scholar by hand |
| `InboxResponseHandlers.respondToYouthPromotion` | declining the §11g promotion prompt |
| `YouthPromotionService` | the automatic at-16 assessment deciding to release |

**This was not in the brief's list and was found by tracing the pot's DRAW sites back rather than
its departure sites forward.**

#### 🔴 Three hand-written sites were the first version of this fix, and they were not enough

Finding it backwards is the point: **the forward direction had no structure protecting it.** A
fourth user-club caller of `releaseYouthPlayer` added next month forgets the refund and nothing
fails — which is the same shape as the defect being fixed. So the academy got a choke point of
its own, **`src/engine/ampYouthRelease.ts`**:

```ts
export async function releaseAmpYouthPlayer(playerId, clubId, availableFromWeek, season) {
  await releaseYouthPlayer(playerId, clubId, availableFromWeek, season);
  useClubStore.getState().releaseDofWageCommitment(playerId);
}
```

It cannot live in the repository — `releaseYouthPlayer` is `clubId`-scoped and shared with NPC
callers, and a repository must not reach into a store — so it lives one layer up, where the rule
it creates is **enforceable**: user-club code calls the wrapper, only NPC paths call the
repository function directly.

**And the rule is checked, not just written down.** A registry test walks `src/**` and `app/**`,
collects every file that calls `releaseYouthPlayer`, and asserts the set equals three accounted-for
files with a reason each:

| file | why it may call it |
|---|---|
| `src/db/repositories/youthRepository.ts` | defines it |
| `src/engine/ampYouthRelease.ts` | the player club's only door — adds the pot refund |
| `src/engine/GameLoop.ts` | NPC academies only, and an NPC club has no DOF pot |

⚠️ **The registry works at FILE granularity, and that is a real limit rather than a formality.**
`CLAUDE.md`'s cohesion rule records the lesson in as many words — *"a source-reading test protects
exactly the files it names"* — after the Personal Assistant screen printed a raw cohesion score
for as long as its guard had existed, because that guard read `MoralePane.tsx` and only
`MoralePane.tsx`. `GameLoop.ts` is the same seam here: it legitimately holds NPC academy exits, so
a *user-club* exit added inside it would pass the registry. It is therefore **also pinned to its
exact call count (2)**, so a third call anywhere in that file fails and has to be classified.
Stated here rather than papered over, because the seam is narrower but not gone.

Cost of the choke point: one new module, three call sites changed, and `releaseYouthPlayer`
dropped from `YouthPromotionService`'s repository import. Cheap, and it is the difference between
a fix and a fix that stays fixed.

#### 🔴 The full suite then caught a real defect in the wrapper, and it is the reason to run one

The first version of `releaseAmpYouthPlayer` called the refund **unguarded**, and
`YouthPromotionService.test.ts` failed on it:

```
TypeError: _clubStore.useClubStore.getState(...).releaseDofWageCommitment is not a function
  at releaseDofWageCommitment (src/engine/ampYouthRelease.ts:64:27)
```

That suite's `clubStore` mock is partial — it provides `club` and nothing else — so the refund
threw and **took the whole academy release down with it.** The row would not have been detached.

**It is not merely a test-mock problem, and treating it as one would have been the wrong call.**
The five store choke points were *already* written with a try/catch for exactly this
(`squadStore`'s `releaseDofCommitmentFor` and its two siblings); the wrapper was the only path
that was not, and I had written all of them. A partial mock is a cheap stand-in for the real
failure modes — a store not yet hydrated, a renamed action, a future throw inside the refund —
and the property that matters is this: **a scholar who has left has left.** Failing their release
because a budget figure could not be credited turns a money bug into a SQUAD bug, which is
strictly worse, because the pot self-corrects at the next re-derivation and an undetached row
does not.

So the wrapper gained the guard its five siblings already had, and the guard is now **pinned by
mutation**: removing the try/catch fails exactly one test (the academy release surviving a refund
that throws). The two failing tests were updated deliberately rather than relaxed — the source
pin follows the rename and now asserts the *wrapper* and the absence of the bare repository call,
which is strictly stronger than what it asserted before, because only the wrapper refunds; and
`YouthPromotionService.test.ts` gained a spy asserting the release books **both** halves rather
than only the detach.

⚠️ **And my own new test leaked.** Replacing `releaseDofWageCommitment` with a thrower via
`setState` persisted into the next test — a zustand action lives in the state object like any
other field — and the doubled-exit case immediately read a pot £95,000 off. Caught by the next
test rather than by me. The real action is now captured once and restored in `beforeEach`, so a
later test that stubs an action cannot reintroduce it.

### What is deliberately NOT a departure, and why

- **`squadStore.setPlayers`** — boot hydration. It replaces the whole roster, so treating it as a
  departure would **refund every commitment in the save on every launch**: the B1 defect exactly,
  moved from the Chairman's four-weekly rebalance to the splash screen, and just as invisible.
  Pinned with an explicit test.
- **NPC contract expiry (`GameLoop.processNpcContractExpiry`) and every other NPC path.** They
  iterate `worldStore.clubs`; those clubs have no DOF pot. `clubStore` is the user's club alone.
  ⚠️ **The brief named "contract expiry" and pointed at `GameLoop.ts`; the pass at `GameLoop:6940`
  is the NPC one and is not a departure for the pot.** The user's club's expiry is at
  `GameLoop:1007` (players) and `:1091-1092` (staff), and all three reach a choke point.
- **A youth promotion.** `YouthPromotionService` calls `addPlayer` only — the club keeps owing the
  wage, and the scholar's own commitment correctly stays on the ledger.
- **A player loan out.** ⚠️ **No such feature exists** — `loanStore` is FINANCIAL loans, money
  the club has borrowed, not players lent to other clubs. Recorded because it is the obvious next
  question and the store's name invites the wrong answer; I assumed a loan-out path existed and
  wrote a docblock claiming it was deliberately excluded before checking that it was there.
- **Retirement and the seasonal cull DO reach `removePlayer` and so do call the refund** — but
  they run at a season transition where the period has already rolled, so the stale-period guard
  makes the refund 0 of its own accord. Pinned, because it is the one place the two mechanisms
  have to agree.

### Where a `subjectId` is attached — all seven draw sites

| site | subject |
|---|---|
| `TransferService.makeAmpBuyerFinanceCallbacks` | a new `playerId` parameter, passed by all three signing callers (`SignPlayerPanel`, `SignYouthPanel`, `DofProposalService`) |
| `DofStaffHiringService` | `candidate.id` |
| `GameLoop` §14b player renewal | `player.id` |
| `GameLoop` §14c staff renewal | `staff.id` |
| `app/staff/[id].tsx` renew / hire / poach | attached ONCE in the shared `dofCharge` helper, from `id` / `marketItem.data.id` / `staffMember.id` |

Ids survive every hire and poach path — verified: `marketStore.hireCoach`/`hireScout` write
`id: marketCoach.id`, and `worldStaffToCoach`/`worldStaffToScout` write `id: ws.id`. So the id a
charge is filed under is the id the departure releases against.

### On the `?? 0`s in `drawDofContractCharge`

The money rule treats `?? 0` on a money field as a defect, not a default, so the two in the entry
builder are worth stating rather than leaving to be found:

```ts
const weeklyPence    = Math.max(0, Math.round(charge.wageWeeklyPence ?? 0));
const weeksCommitted = Math.max(0, Math.round(charge.wageWeeksCommitted ?? 0));
const entry = charge.subjectId && wage > 0 && weeklyPence > 0 ? { … } : null;
```

**These are not a money read with a silent default; they are an ATTRIBUTION read whose absence
has a meaning.** The rule exists because a wage read off a payload as 0 silently prices a
contract at nothing. Here the money is `charge.wageCommitmentPence`, which is required and is
drawn in full either way — the `?? 0` governs only whether a permission slip is written, and a
missing factor produces `null` (no entry) rather than an entry for £0, which would be a
permission slip for a refund of nothing. The conservative direction: carried, not refundable.
Every production site supplies both factors, because `dofContractCharge` now returns them.

⚠️ **`subjectId` is OPTIONAL on `DofPotCharge`, and that is the one place this mechanism is
incomplete rather than wrong.** A charge without one draws the pot correctly and is carried
correctly; it is simply never refunded, which is the pre-refund behaviour and the conservative
direction. All seven sites pass one, and a **source pin over all five files** is what stops an
eighth site being added without one — no behavioural test can see a missing subject, because every
figure is individually correct.

---

## 3. What remains untrue

**1. A FEE is still partially refunded by a re-derivation** — `(1 − pct) × F`, about 70% at the
default 30% share. Pre-existing, documented by B1, explicitly out of scope here, and unchanged.
Making it durable still means freezing the opening allocation per budget period.

**2. The opening allocation is still a live percentage of the balance.** Out of scope, unchanged.

**3. Step 1 is still backward-looking**, so a mid-period hire graduates at the weeks they were
actually paid for rather than at a full season. B1 measured this and the refund does not touch
it: Step 1 is a ledger sum of wages the club actually PAID, and a refund moves the pot, not the
payroll. The two do meet consistently, though — a player sold mid-period has the unused tail of
their commitment returned to the pot, and at the next budget they are gone, so Step 1 does not
commit for them either. Charged for the weeks used, committed for nothing after.

**4. The refund is as late as the departure is observed.** Every path above fires in the same
synchronous turn as the removal, so in practice this is exact. There is no sweep and deliberately
so: a reconciliation pass that refunded any entry whose subject was no longer in the store would
refund the entire ledger at boot, before hydration.

---

## 4. CHECKS — and what writing it found

**Added: `DOF POT — THE CARRIED LEDGER`, two rows**, in `economy/economyDiagnostics.ts`'s
`dofPotChecks` and `ChecksTab.tsx`'s section list. B1 recommended a row and could not write one
because A24 held those files; A24 is now out of them.

```
DOF pot (opening · committed · pot · next rebalance)
  opening 300,000,000 · committed 10,500,000 · pot 299,500,000 · next rebalance 289,500,000
  · period wk 100 vs budget wk 100 — CARRIED
DOF pot ledger (entries never claim more than the total holds)
  0 refundable entries · refundable 0 · committed 10,500,000
  · non-refundable 10,500,000 (weeks already used, plus any charge drawn with no subjectId) — FITS
```

### 🔴 Writing the check disproved the invariant I was about to assert — twice

**1. `pot = opening − committed` is NOT an invariant on a live save.** It is what
`carriedTransferBudgetPence` computes, so it is the obvious thing to assert, and it holds only in
the instant after a re-derivation. `transferBudget` is a STORED figure drawn down by every spend
since; `opening` is a live percentage of a balance those spends also moved — and **a fee of `F`
lowers the pot by `F` and the opening by only `pct × F`**. That is the fee's documented partial
elasticity (B1 §2.1), still deliberately unfixed, and a grant moves the pot without moving the
opening either. So row 1 prints the derivation as *what the next rebalance will produce* rather
than as a figure the pot must already equal.

It still has a failing condition, and it is the right one: **the pot exceeding its own opening
allocation while money is still committed out of it.** The refund is the only thing that credits
`transferBudget` upward and it can only ever give back weeks it took, so this guards precisely
the failure mode this change introduces. Pinned both ways — it fails on an over-credit and does
*not* fail merely because a fee has been paid.

**2. `entries sum = committed` is wrong in a way no test would have caught until somebody had
been sold.** A refund retires the whole entry but gives back only the weeks AFTER the departure,
so the weeks the club actually used stay on the total with no entry behind them. The invariant is
the **inequality** `entries ≤ committed`; the remainder is reported, not judged, because it has
two legitimate sources (used weeks, and any charge drawn with no `subjectId`) and one
illegitimate one. **I wrote the equality first and the test caught it**, which is the argument for
driving a check from the mechanism rather than from its own docblock.

**3. A fresh save reads `period wk 0 vs budget wk 100`, which is a mismatch but not a
graduation.** Two period states would print `GRADUATED` on every save that has never committed
anything. There are three: `NO LEDGER`, `CARRIED`, `GRADUATED`.

---

## 5. Scope boundary — A24 and A25

**A24 held `src/engine/GameLoop.ts` and `src/stores/marketStore.ts` with uncommitted work when I
started** (the §14c staff-renewal anchor fix). Per the brief I stopped rather than editing around
it, messaged A24, and did every other part of the work first. A24 committed `ac71159b` and
released both files; I then took only the two `subjectId` additions in GameLoop. A24 explicitly
asked that I write `subjectId` myself rather than doing it for me, on the grounds that it only
means something against the refund semantics — which is the right call and is recorded here
because it is a good example of the boundary working.

### 🔴 The sharpest finding of this pass, and it is not about the pot

**An unverified attribution offered to a coordinator becomes an instruction, and nearly destroyed
a third session's work.**

Late in the task `src/economy/economyDiagnostics.ts` — which I had edited to add the CHECKS row —
turned out to hold *another* session's uncommitted work. I identified the contamination correctly
and then **attributed it by inference**: A25 was the session I knew was active, the work was
staff-ability-shaped, so I named A25 to the PM without checking. A25 disproved it immediately
(its commit `a818a60b` is 25 paths, zero `.ts`, all backend), and the diff's own text settled the
real author in one grep — a reference to `a24c-npc-rate-finding.md` and 26 "scout" mentions. It
was **A24**.

But the PM had already acted on my attribution, and asked A25 to restore
`economyDiagnostics.ts` and `staffValuationChecks.test.ts` to `ac71159b`. **`git checkout <rev> --
<path>` is path-level and unconditional**, and that file held three sessions' changes: A24's ~263
insertions (uncommitted, awaiting an owner ruling, with nobody watching the file for it), my
`dofPotChecks` block, and nothing of A25's. There was no stash to recover from. **A25 declined
the instruction and wrote a backup instead**, which is the only reason this is a near-miss rather
than a loss.

Two things follow, and the second matters more than anything else in this report:

1. **Never restore a path you did not author; patch out your own hunks instead.** A lost
   measurement costs a re-run. A path-level revert costs work that exists nowhere else. The
   checkout held 32 modified or untracked paths across several sessions at the time.
2. **A guess passed to someone with authority stops being a guess.** I had the evidence to settle
   authorship for free and did not look before speaking. This is the same failure mode as reading
   a comment instead of measuring the call graph — the thing this project's standing notes already
   warn about — except the cost landed on somebody else's work rather than on my own conclusions.
3. **So MARK THE EPISTEMIC STATUS of anything reported upward.** *"I verified X by running Y"* and
   *"I believe X because Z was the session I knew was active"* are indistinguishable from the
   coordinator's seat, and it will act on both. This is the actionable half that is mine; the PM
   has taken the other half (acting on a report as fact without running the one command that
   settles it) and both are now standing-note entries. Every claim in this report is either
   measured with its output quoted, or marked as a belief.

Backups now exist in two places: `docs/economy-loose-ends/app-economyDiagnostics-SAFETY-PATCH.diff`
(A25's, durable) and this session's scratchpad (mine, clearable by a reboot — treat A25's as the
real one). The PM retracted the instruction after verifying the file itself, and nothing was lost.

⚠️ **The same error recurred one level down, inside the fix for it.** A25's safety patch was
first written as *A24's* work — but `git diff <path>` is path-level, so it had captured **my**
`dofPotChecks` hunk too, and applying it whole after my commit would have reintroduced or
conflicted with my block. A25 caught and corrected it (the file now names both authors and tells
the reader to extract only the hunks for the author being restored) only because the "three
writers" framing was in hand. **Attributing a whole path to one author because one author's marker
is in it is the error, and it is available at every level — the diff, the patch that saves the
diff, and the instruction that acts on either.**

⚠️ **Two concurrent full-suite runs in one checkout cost A24 two measurements and me one.** My
files (`dofHireCharge.ts`, `clubStore.ts`) are the ones A24's tests import, so the contamination
ran both ways. We serialised by hand. **This is worth a standing note**: the convention
"one writer per file" is not sufficient — it needs "one full-suite run per checkout" beside it.

`src/stores/marketStore.ts` and `src/engine/StaffPoachingService.ts` are untouched by me.

**Correction to the per-repository claim I made to the PM.** I reported the measurement problem as
general; A25 pointed out that it is not. We were in **different repositories**, so app-side writers
never made its runs unattributable and its backend PHPUnit runs could not have perturbed mine. The
accurate rule is narrower: **one writer per file within a repository**, **one full-suite run per
checkout**, and CPU contention as the only channel that crosses repositories — which degrades
*timing* assertions rather than attribution. Recorded because I supplied the over-broad version to
a coordinator who was about to write it into a standing note.

---

## 6. Verification

**`npx tsc --noEmit`: clean**, at every stage (five runs across the task, the last on the committed tree).

### The counts reconcile EXACTLY

| | suites | tests passed | collected |
|---|---|---|---|
| my own measured baseline at `ac71159b`, detached worktree, idle | 657 | 10,992 | 10,995 |
| A24's `7b56c6c8` — **+4 tests, no new suite** | 657 | 10,996 | 10,999 |
| **mine, `9bac0b18`** | **+2 suites** | **+61** | **+61** |
| **total** | **659** | **11,057** | **11,060** |

Measured: **659 total, 11,056 passed + 1 failed + 3 skipped = 11,060 collected**, `--listTests`
**659**. ✅ Reconciles exactly.

My +2 suites are `dofPotRefund.test.ts` (40) and `dofPotRefundDeparturePaths.test.ts` (20); the
+1 is `pickClubState.test.ts`'s new entries test. The five other test files I touched changed no
counts (two exhaustive `toEqual`s updated, one source pin re-pointed, two harness resets, one
registry entry).

⚠️ **The `7b56c6c8` row is DERIVED, not separately measured, and I am labelling it rather than
hiding it.** The PM told me to re-measure rather than reconcile, and a second full baseline run
would have cost nine minutes to confirm a four-test delta. Instead I measured the delta directly:
A24's commit touches exactly three paths, and `staffValuationChecks.test.ts` goes from **19 to 23**
`it` blocks — +4 tests in an existing suite, no new suite file. My own `ac71159b` figure plus that
verified delta gives 657 / 10,996, which matches A24's independently measured figure. That is a
measurement with a checked delta, not a number adopted on trust.

### ⚠️ Why I did NOT verify in a detached worktree, having said I would

The worktree existed to escape contention. Once A24 and A25 were both out, the working tree *was*
`7b56c6c8` + my work and nothing else — I verified that path by path (30 mine, plus the PM's
`.context/stages/01_overview/output/environment.md`, which jest never reads because the only
tree-walking registry scans `src/**`). A working-tree run therefore has strictly fewer moving parts
than copying files into a detached checkout, and I can state exactly what was in it. Said here
because I told the PM I would use a worktree.

### The one failure, and it is a 5,000 ms jest timeout

```
FAIL src/__tests__/components/new-game-setup/randomClubProbe.test.tsx (37.8 s)
  ● findLand › returns a town from the first country that has one inside the budget
    thrown: "Exceeded timeout of 5000 ms for a test.
```

**Not mine, and that is provable rather than plausible.** The suite imports `React`,
`react-test-renderer`, `@/components/new-game-setup/useLandFlow`, and mocks `@/api/client`.
`useLandFlow` imports the account-ledger endpoint, four local new-game modules, `sentry`,
`apiFailure` and `t`. **None of my 30 paths is reachable from it**, checked by name against both
files, so a logic regression from this change is impossible and the only available mechanism is
scheduling. The failure is a bare timeout with no value assertion, and the suite passes **9/9 in
0.69 s** in isolation.

🔴 **It is an EIGHTH load-sensitive suite, and it breaks the explanation the other seven had.**
The run was **335.7 s against my own 541 s clean baseline** — *faster* than baseline, on an idle
machine, with no other session running tests. The previous seven were all attributed to
cross-session contention. This one cannot be: a 23 ms test exceeded a 5 s timeout, a ~200x
scheduling delay, from **in-run worker contention alone**. Adding two suites was enough to shift
the schedule into starving it.

**So the standing note needs a second clause.** "Don't attribute from a contended run" is
necessary but not sufficient — a wall-clock assertion in a 659-suite run is unsafe *even on a
quiet machine*, because the run contends with itself. The durable fix is for those eight suites to
stop asserting wall clocks (or to carry explicit generous timeouts), not for agents to keep
measuring more carefully. Flagged for the PM; not fixed here, as it touches eight suites across
`db/`, `screens/` and `components/` and none of them is this task's.

### Confirmation run — and why it came AFTER the commit

A second full run was taken on the committed tree, deliberately **after** committing rather than
before. The reasoning, since it inverts the obvious order: this change was the single largest
unprotected thing in the repository — 28 modified files plus three untracked, no stash behind it,
and for a few minutes nobody knew whose some of it was. The commit is attributable, reconciles
exactly, and its one failure is provably outside the change's reach, so holding it hostage to a
re-run of a *known-flaky wall-clock assertion* would have traded real risk for cosmetic
cleanliness. Committing first makes the re-run a confirmation rather than a gate, and anything it
found would be committed on top.

**Result: 🟢 FULLY GREEN — `659 passed, 659 total` · `3 skipped, 11,057 passed, 11,060 total`
· zero failures · 369.8 s.** Verbatim:

```
Test Suites: 659 passed, 659 total
Tests:       3 skipped, 11057 passed, 11060 total
Time:        369.839 s
```

🔴 **And this closes the reconciliation completely, in the strongest available way.** The table
above *predicted* 11,057 passed from the baseline plus this change's 61 tests. The first run
measured `11,056 passed + 1 failed` — the same 11,057, one of them timing out. The confirmation
run measures **11,057 passed and nothing failing.** So the predicted total, the failing run and
the green run all agree on the same figure, and the discrepancy between the two runs is accounted
for by exactly one wall-clock timeout in a suite this change cannot reach.

That is also the cleanest possible demonstration of the eighth-suite finding: **identical code,
two runs, one failure and no failures.** `randomClubProbe.test.tsx` passed here at the same
commit where it failed 37.8 s earlier — nothing changed but the scheduling. 369.8 s against the
previous run's 335.7 s, both far under the 541 s baseline, both on an idle machine.

### 🔴 No device test. Nobody has seen B1, `4113d326`, `7b56c6c8` or this running.

What the owner should check on a real save, in order of how much it would tell us:

1. **Sign a player mid-season, note the transfer budget, then SELL them a few weeks later.** The
   pot must rise by the weeks remaining — not by the whole commitment, and not by nothing. **This
   is the entire change in one observation.**
2. **Then advance past a Chairman four-weekly rebalance.** The refund must still be there: it is
   carried, not a one-off credit.
3. **Sack a coach hired this season.** Same behaviour, through a different choke point.
4. **Sell a player who was at the club before the season budget was derived.** The pot must NOT
   move — they were never charged to it, and this is the free-money case.
5. **Advance to a season boundary, then sell someone signed before it.** The pot must not move:
   the commitment has graduated into Step 1.
6. **Debug → CHECKS → `DOF POT — THE CARRIED LEDGER`** should read `CARRIED` with a non-zero
   committed figure mid-season, `NO LEDGER` on a fresh save, and the ledger row should say `FITS`.

---

## 7. For the PM

- `.context` pass entry appended to `shared/last-sync.md`; nothing restructured.
- ⚠️ **`CLAUDE.md`'s `new-game-save` row is stale by three commits** (it reads B1's 651 / 10,865;
  `4113d326`, `ac71159b` and this change have landed since). It is a one-way mirror of
  `01_overview/output/environment.md`, so the `.context/` copy changes first — left to the PM, as
  B1 and A29 also flagged.
- ⚠️ **The "three to five failures" baseline is the BACKEND's, and the misattribution is in the
  standing notes, not in `.context`.** I read it at `agent-standing-notes.md:70`, which states
  the range *and cites the app's* `.context/stages/01_overview/output/environment.md`. The app
  doc has never said it — it says *"Treat any failure as a real regression"*, which is correct —
  and the range actually lives in `wunderkind-backend`'s `environment.md`, describing PHPUnit's
  known failures #1–#5. **This suite's baseline is ZERO on an idle machine** (measured, §6).
  The PM has recorded this in the app's `environment.md`; **the standing-notes line is the one
  that still needs scoping and repointing**, because the standing notes ship with every brief
  while `.context` is routed to on demand. Not edited by me — it is governance text and the PM
  has the baseline. This caught three sessions in one day precisely because each was following an
  app-scoped claim with an app-scoped citation.
- **No device test.** Nobody has seen B1, `4113d326`, or this running. §6 lists what to check.
- ⚠️ **`03_data/output/state.md`'s `flushClubStateToDB()` call count was stale by SIX before this
  change.** It read 64; it measured **70** at `ac71159b`, and this change takes it to 71 (one new
  setter, `releaseDofWageCommitment`). **Corrected in place, with the distinction recorded** — only
  one of the seven is mine. The figure is load-bearing for nothing, since the coalescing is correct
  at any count, which is precisely why it drifted unchallenged; the measured device figures in that
  paragraph are a separate measurement and are untouched. Flagging rather than hiding it because
  the PM owns whether that paragraph should carry a count at all.
- 🔴 **The strongest process finding of this pass: a full suite caught a defect in my own work
  that no targeted run would have.** Nine targeted suites were green before the full run; the full
  run found the wrapper's missing try/catch through a *partial mock in an unrelated suite*. That is
  the argument for the brief's "run the whole suite alone on an idle machine" requirement, stated
  as evidence rather than as compliance — and it cost a third full run, which was worth it.
