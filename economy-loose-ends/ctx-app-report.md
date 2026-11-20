<!-- STATUS: 🟢 DONE — documentation only, committed to `new-game-save`, NOT pushed, NOT deployed. ⚠️ READ §5 FIRST: the commit CARRIES THE PM's OWN uncommitted edit to `environment.md`, deliberately and with no way around it. §3 has one finding that corrects three documents at once. -->

# `.context` brought in line with what shipped on 2026-11-20 — app repo

**Task:** bring `wunderkind-app`'s `.context` current against the day's economy work.
**Documentation only. No application code was touched and no test suite was run** — nothing in this
pass can affect one.
**Branch:** `new-game-save`. **Base:** `9bac0b18`, the branch HEAD. **Not pushed, not deployed.**

---

## 1. What I changed

### `03_data/output/state.md` — the DOF's pot ledger

A new section documenting the three persisted `ClubState` fields, placed beside the 2026-09-29
"`pickClubState` is an explicit destructure allowlist" correction, which it is the clearest live
example of.

⚠️ **The brief said two fields. There are THREE.** `dofWageCommitmentPence` and
`dofWageCommitmentPeriodWeek` came from `598ff158`; **`dofWageCommitments: DofWageCommitment[]`**
landed with the refund in `9bac0b18` and is in the allowlist beside them. Verified by reading
`src/db/helpers/pickClubState.ts`, not from the commit messages.

The section covers: what each field is, **why all three or none** (a total without its period is
applied against the wrong period on reload; a total without its entries keeps the money and
forgets who it is owed for, so every commitment in flight becomes unrefundable — invisibly,
because the pot figure still looks correct), that they are **top-level and so do not ride on
`club`**, and that the ledger **graduates by going stale rather than by being cleared**. It defers
the mechanism itself to `game-mechanics.md` §8 rather than restating it.

### `02_architecture/output/structure.md` — `src/engine/ampYouthRelease.ts`

A new bullet in the `src/engine/` breakdown, next to the existing AMP/NPC isolation rule it
belongs with. It records the module, its one export, and **the architectural rule: user-club code
calls the wrapper; only NPC paths call `youthRepository.releaseYouthPlayer` directly** — with why
the choke point cannot live in the repository (it is `clubId`-scoped and shared with NPC callers,
and a repository must not reach into a store).

**Verified against the tree rather than taken from the report.** Three user-club callers of
`releaseAmpYouthPlayer` — `app/player/[id].tsx`, `InboxResponseHandlers.respondToYouthPromotion`,
`YouthPromotionService` — and **exactly two** direct `releaseYouthPlayer` calls in `GameLoop.ts`
(lines 4999 and 5107, both NPC), which is the count the registry test pins.

### `07_synthesis/output/game-mechanics.md` — the big one

Marked *read before changing any simulation behaviour*, and the file where the gap was widest:
**`598ff158`'s carried ledger was not documented here at all.** Three changes.

**1. The "Not decided" note is replaced.** It read:

> *"**Not decided:** whether an unspent remainder returns to the pot when a contract ends or a
> player is sold mid-season. The charge-up-front model creates the question; the owner has not been
> asked."*

The owner has been asked and said *"yes, absolutely."* In its place, a section covering both halves
of the mechanism: the carried ledger and its two-functions-not-five-call-sites design, the fee half
that must **not** be carried, stale-period graduation, the refund arithmetic, the departure week
deliberately not refunded, the `lastWeekOwed = createdWeek + span − 1` algebra that makes refund
and graduation **abut rather than overlap**, the five store choke points plus the academy module,
idempotency-by-entries, what is deliberately **not** a departure (boot hydration, every NPC path, a
promotion — and that there is no loan-out feature), the two things that remain untrue, and that
**nobody has seen any of it on a device**.

⚠️ **This is the only text I removed in the whole pass.** It is a superseded statement of fact
inside a living section, not a section of its own, and leaving "the owner has not been asked" in
the file marked *read this before changing simulation behaviour* would be the drift this pass
exists to stop. **If the PM would rather it had been kept and struck, it is one paragraph to
restore** and the replacement text is self-contained.

**2. The budget table's `transfer` row.** It said the pot pays *"the DOF's player renewal sign-on
fee"*. Since `4113d326` it pays **the sign-on fee AND the wage delta the renewal moves**. Corrected,
with the §14a/§14b/§14c finding in §3 below written in at the site.

**3. Two new sections** — staff and scout wages priced from the wage band on `ability`
(`9f46bf66`, including `ac71159b`'s measured **15.6×** `experience` error, why it reads as a
non-event on a club with no backroom, the three measured pay-cut cliffs at 14→15 / 24→25 / 39→40,
and the open NPC staff-vs-scout asymmetry), and the CHECKS comparator reading the governing rate
(`7b56c6c8`, including that England's 1.00 is a **false pass** and Scotland's 10.00 is the scale
change).

### `05_ui/output/patterns.md` — Debug → CHECKS

A new section. **05_ui carried no CHECKS inventory at all** — only a splash-timeline mention — so
this is an addition rather than a correction: that `ChecksTab.tsx` is a renderer owning no row, the
report's section list with the three new economy panels marked, the two `DOF POT` rows and that the
second asserts an **inequality**, the `7b56c6c8` comparator rework as a lesson about diagnostics,
and the panels' three shipped conventions (`warn` at worst, **no `?? 0` on a money field**, three
screen rows with the table in the clipboard once). It closes on the standing note that the report
is already too heavy and a new row has to earn its line.

### `01_overview/output/environment.md` — the green-master bar

**I read the PM's uncommitted edit before touching this file.** Its test-baseline correction and
its two load-sensitivity paragraphs are **untouched** — the diff is 20 insertions against 1
deletion, and the deletion is the branch row itself.

The `new-game-save` row now reads **659 suites / 11,057 tests at `9bac0b18`**, which reconciles
exactly against the 657 / 10,992 it replaces: `7b56c6c8` is +4 tests and no new suite, `9bac0b18`
is +2 suites / +61. The eighth load-sensitive suite is recorded on the row.

⚠️ **That figure is QUOTED, not measured, and the row says so in those words.** It is
`dof-pot-refund-report.md` §6's confirmation run on the committed tree. A documentation pass may
not run a suite, and presenting another session's figure as its own is how an unattributable number
enters a table whose entire history is about exactly that. The same caveat is in the `CLAUDE.md`
mirror.

### `.context/shared/last-sync.md`

**One pass entry, appended.** Nothing else in the file was touched.

### `CLAUDE.md` — re-mirrored

Gitignored, one-way `.context/` → mirror. Its `new-game-save` row read **651 / 10,865 — two
measurements behind**, because the PM's `ac71159b` edit moved the owner and not the mirror. That is
the same reverse-direction drift that row's own history records and warns about. It now carries
659 / 11,057 with the provenance caveat, and the 651 row is demoted rather than deleted. No other
figure in `CLAUDE.md` is affected by this pass (checked for the flush count, the ledger fields, the
youth wrapper and the §14 markers — none appears there).

---

## 2. What I found already correct

- 🟢 **`state.md`'s `flushClubStateToDB()` call count is RIGHT, at 71**, and already carries the
  note that it had drifted by six. The brief said to make it right or remove it; it was made right
  by `9bac0b18` before I arrived. **Re-measured rather than trusted:**
  `grep -c 'flushClubStateToDB()' src/stores/clubStore.ts` returns **71** at HEAD and **70** at
  `ac71159b`, exactly as the note claims.
  **I left the count in and did not remove it**, because the note's own argument is the right one:
  the paragraph documents a *mechanism* (microtask-drain coalescing) that is correct at any count,
  and the number is load-bearing for nothing — which is precisely why it drifted unchallenged. The
  honest fix is a count that says it is incidental, which is what is now there.
- 🟢 `9f46bf66`'s own `03_data/output/schema.md` and `04_interfaces/output/routes.md` entries.
- 🟢 Every `last-sync` entry for the day's commits except two — see §4.

---

## 3. 🔴 One finding, and it corrects three documents at once

**The DOF's automatic PLAYER renewal is `GameLoop` §14a, "Auto-renew contracts".**

- `game-mechanics.md`'s budget table said **§14c**.
- `4113d326`'s commit message says **"§14b now has the staff path's shape"**, and both
  `a24b-dof-player-renewal-report.md` and `dof-pot-refund-report.md`'s draw-site table say **§14b**.
- **There is no §14b in `GameLoop.ts`.** The markers run `14a, 14c, 14d, 14d-ii, 14e, 14e2, 14f`.
  `14a` is "Auto-renew contracts" and holds `dofContractCharge` / `dofChargeRefusal` /
  `drawDofContractCharge` for the player at lines 5667–5716. **`14c` is the STAFF renewal**, at
  5851–5901.

So the two documents disagreed **and both were wrong**, and the wrongness is the dangerous kind: it
points a reader at the *sibling* path — the staff renewal is the other half of the same owner
ruling and the thing the player path was made symmetric with, so a reader who follows either
citation lands on code that looks right and is the wrong one.

Verification, which is one command: `grep -n '── 14' src/engine/GameLoop.ts`.

**Corrected in `game-mechanics.md`, with the discrepancy named in place** so the next reader is not
left wondering which document to believe. **The reports are outside both repos and I left them
alone** — they are a record of what each session found, not a live reference.

---

## 4. Flagged, not changed — for the project-manager session

1. ⚠️ **`7b56c6c8` and `b8ee4594` have no `last-sync` entry and touched no stage.** The staff/scout
   CHECKS comparator and the player-valuation panel were undocumented in `.context` until this
   pass. Both are now written up in `game-mechanics.md` / `patterns.md`, but **neither has a pass
   entry of its own** and I did not write one on another session's behalf — my single appended
   entry names them instead. **Curation is yours.**
2. ⚠️ **`environment.md`'s baseline paragraph now says "measured three times today" and then names
   a fourth.** I appended the fourth rather than editing the PM's sentence. One word to reconcile,
   left to you because the sentence is yours.
3. 🟡 **The §14b/§14c error is in two reports and a commit message**, which are outside the repos
   and immutable. If a future reader is going to be pointed at those reports, the correction needs
   to live somewhere they will see it; right now it lives in `game-mechanics.md` and in this file.
4. 🟡 **`07_synthesis/output/current-focus.md` was NOT reviewed.** It is 1,474 lines, it was not in
   the brief, and whether today's work changes what the branch's current focus *is* reads to me as
   a PM judgement rather than a documentation correction. **Nothing was changed there and nothing
   was checked there.** Worth someone's pass before the workstream is handed over.
5. 🟡 **`state.md`'s 2026-09-29 note still says `minOperatingReservePct` is missing from
   `pickClubState` and "that bug is still present".** I confirmed it is still absent from the
   allowlist, so the note is accurate — but it is a live defect sitting in a documentation file
   where it has been recorded for nearly two months, and a field that silently resets to 10 on
   every reload is a budget floor nobody is enforcing. Not mine to fix; not a documentation
   problem.
6. 🟡 **The four open items the day's work names and nobody owns**, carried here so they are in one
   place: the fee still partially refunded by a re-derivation; the opening allocation still a live
   percentage of the balance; the hire market not band-priced for staff or scouts (the remaining
   half of the wage-band ruling); and whether NPC club scouts should be income-anchored like the
   staff beside them. All four are in `game-mechanics.md` now, each marked open.

---

## 5. ⚠️ The commit carries the PM's own uncommitted work, and there was no way around it

**Read this before judging the commit.** At the start of this pass `git status` in
`wunderkind-app` showed **exactly one modified path**:
`.context/stages/01_overview/output/environment.md` — **the PM's own edit, uncommitted**, carrying
the test-baseline correction and the load-sensitivity rules.

The brief directed me at that file, told me to read what was there first and not to remove it. I
did all three. But my own change to it is one table row inside the same file, so **committing my
row necessarily commits the PM's 19 lines with it.** The alternatives were worse:

- carving my hunk out by hand produces a tree nobody has reviewed, and the standing note's
  condition for sub-file staging — verify the reconstructed content — cannot be met by a
  documentation pass that is forbidden to run a suite;
- leaving the file out means the green-master row stays two measurements stale, which is the
  specific drift the brief sent me to fix;
- **restoring or stashing it was never an option.** It is not my work.

**So it is committed whole, deliberately, and said out loud here rather than left to be
discovered.** The PM's content is unmodified — the diff is 20 insertions and 1 deletion, and the
deletion is the `new-game-save` row I replaced. ⚠️ **The PM should check that row and the baseline
paragraph** before treating either as its own.

**`scout-reanchor` has written nothing into this checkout.** It is working in its own detached
worktree (`/private/tmp/.../wt-scout`, `9bac0b18`), and `git status` was clean of its paths both
before and after my edits. Nothing of its work is in this commit.

---

## 6. Staging and verification

**Every path staged by name. No `git add -A`, no `git add .`.** Six files, all documentation:

```
.context/shared/last-sync.md
.context/stages/01_overview/output/environment.md
.context/stages/02_architecture/output/structure.md
.context/stages/03_data/output/state.md
.context/stages/05_ui/output/patterns.md
.context/stages/07_synthesis/output/game-mechanics.md
```

`CLAUDE.md` is gitignored and is not in the commit, by design.

**What was verified against the code, not against a report or a commit message:**

| claim | how |
|---|---|
| three persisted ledger fields | read `src/db/helpers/pickClubState.ts` |
| 71 flush calls at HEAD, 70 at `ac71159b` | `grep -c` at both revisions |
| 3 user-club + 2 NPC youth-release callers | `grep -rn` over `src/` and `app/` |
| the player renewal is §14a | `grep -n '── 14' src/engine/GameLoop.ts` |
| the two `DOF POT` rows and their statuses | read `economyDiagnostics.ts`'s `dofPotChecks` |
| the CHECKS section list and order | read `ChecksTab.tsx`'s `sections` array |
| the scout wage chain, rung for rung | read `resolveScoutWagePence` in `src/utils/staffWages.ts` |

**No suite was run and no application file was opened for writing.** The test figures in this pass
are quoted from `dof-pot-refund-report.md` §6 and labelled as quoted, in both the owner and the
mirror.
