<!-- STATUS --> **STATUS:**  🟢 LIVE — read with every agent brief.

---

# Standing notes for every task agent — Wunderkind Factory

**Read this with your brief.** It carries conventions that apply to every task, so briefs do not
restate them. If this file and your brief disagree, say so in your report rather than silently
picking one.

---

## 1. 🔴 IF YOU NEED DATA FROM A DEVICE, ADD IT TO THE CHECKS

**Standing instruction, owner, 2026-11-19.**

The app has an on-device diagnostic report — the **Debug → CHECKS** tab
(`src/components/debug/ChecksTab.tsx`, over `src/db/diagnostics.ts`,
`src/economy/economyDiagnostics.ts` and `src/economy/worldPackDiagnostics.ts`). It is copyable, and
it is how the owner answers questions about a live save.

**Whenever your work depends on a figure that can only be confirmed on a device — or you find
yourself writing "the owner should check X" in a report — add X to the checks** rather than leaving
it as prose. A check is a permanent answer; a sentence in a report is read once.

**This has already cost real time.** On 2026-11-19 a Scottish division was paying TV money fourteen
ways to twelve clubs. Three separate agents and the PM spent hours triangulating it from a world
export, a screenshot and two migrations. **A single check printing each league's authored size
against its actual club count and its fixture-derived home games would have shown it in one line.**

**What makes a good check** (and the bar is real — see §2):
- It states a **relationship**, not a value: `slots 14 · clubs 12 · home games 11 — DISAGREE` beats
  three separate numbers a human has to divide.
- It can **fail**, and the failure changes what someone does.
- It is cheap enough to run on every boot, or it belongs behind an explicit action.

⚠️ **Adding a check is in scope for any task whose findings justify one** — you do not need a
separate brief. Keep it proportionate: one or two focused lines, not a new section, and say in your
report what you added and why.

---

## 2. ⚠️ THE CHECKS OUTPUT IS ALREADY TOO HEAVY — DO NOT MAKE IT WORSE

The report currently runs to hundreds of lines, much of it decision-support for tasks that are
finished. **Cleaning it up is queued as its own task (A13).**

Until then: **adding a check means earning its line.** Before you add one, ask whether it would
still be worth printing in six months. If it only answers a question your current task is asking,
it belongs in your report, not in the checks.

---

## 3. The rules that apply to every task

- 🔴 **MECHANISM FIRST, NUMBERS FROM OBSERVED DATA LATER. Owner, 2026-11-21: *"this should be the
  development mantra."*** It is the general form of the standing *correctness before calibration*
  rule, and it is the first thing to apply to any economy or simulation task.
  **What it means in practice:**
  - **Build the relationship, then let the number be authored.** Ship the mechanism with a neutral
    default drawn from an existing authored source, and make the value admin-editable — so the
    later calibration is a **data edit, not a code change, an agent and a deploy.** If tuning your
    work later requires another release, you have not finished it.
  - **Make it observable before it is tuned.** A number the owner cannot see the consequences of
    cannot be ruled on. If the decision needs a figure only a device can show, it goes on the CHECKS
    tab as a *relationship* — see §1 — not into a report nobody reads twice.
  - **Do not ask the owner for a number you have not shown them the curve for.** Report the outcome
    as a function of the input across the plausible range, at both ends of the pyramid, and let them
    read their own answer off it.
  🔴 **WHY, AND IT IS THE PATTERN BEHIND MOST OF 2026-11-21's DEFECTS: a hardcoded number is a
  frozen measurement.** It was right once, in one country, at one tier count, under one set of
  callers — and it goes on being quietly wrong long after the thing it described has moved. Every
  one of these was a constant standing where a relationship belonged:
  - `LEGACY_TELL_BOTTOM_TIER_PENCE = 250_000` — an England-calibrated absolute that made a
    **correctly priced** Scottish save read `LEGACY — FAIL` always. Fixed by becoming a ratio
    against the modelled rate, which needs no country term at all.
  - `VALUATION_SAMPLE_TIERS = [1, 3, 5, 8]` — two of four samples can never match on a four-tier
    country, so the Scottish dump silently sampled half of what England's did.
  - `UPKEEP_TIER_FACTOR`, an eight-element array: a ninth tier inherits 1.0 and upkeep stops
    scaling, with no error.
  - The staff band ceiling authored at `maxAbility 60` where both codebases document a `null`
    catch-all, so the ladder goes flat across the top.
  - The scout's **0.3 × flat judgement mean ≈ 18-point ability floor** — a weighting ruled sound
    when nothing priced off `ability`, which became a 65× wage distortion once something did.
  **The number was not wrong when it was written. The mechanism moved underneath it**, and a
  constant cannot notice that. A relationship can.
- **Believe the code over the brief.** If they disagree, say so explicitly in your report and do not
  silently comply. Briefs in this project have repeatedly contained a wrong premise; five agents
  have now caught one by checking.
- 🔴 **COUNT SUITES WITH `grep -c "__tests__"`, NOT `wc -l`.** Added 2026-11-21. `npx jest
  --listTests` writes warning lines to the same stream, so `| wc -l` counts them as suites — it read
  **668 against a real 663** for one session. The two agree on a quiet run (measured identical at
  `4bebf8fc`), which is what makes it dangerous: it is right until it silently is not, and the whole
  verification discipline here rests on the count meaning something. `| grep -c "__tests__"` is the
  robust form. ⚠️ **It also would have diagnosed the nested-worktree doubling in one command**
  instead of the round of confusion it caused. The `wc -l` spelling is in `CLAUDE.md` and in
  `environment.md`'s "green-master bar"; both are PM-owned and not yet corrected.
- ⚠️ **A THRESHOLD CAN ENCODE A DIFFERENT QUANTITY THAN THE ONE ITS UNITS SUGGEST, AND ARGUING FROM
  THE UNITS WILL MISLEAD YOU.** The PM's own error, 2026-11-21, recorded because the reasoning
  looked sound and was wrong in the dangerous direction. `LEGACY_TELL_BOTTOM_TIER_PENCE = 250_000`
  is in pence, so I reasoned about money: Scotland's money is one tenth of England's, therefore the
  check has an England-shaped *sensitivity floor* and can never fire there. **The economics were
  right and the conclusion was backwards.** The constant is applied to the *bottom* tier, and
  England's bottom tier is t8 (ability band 2–7) while Scotland's is t4 (band 15–35) — a mid-pyramid
  division, because Scotland is four tiers deep. The ÷10 scaling is more than cancelled by the ×6.3
  band difference, so a **correctly priced** Scottish save reads `LEGACY — FAIL` **always**. A false
  alarm on correct data, not a missed alarm. **Ask what row the constant is applied TO before
  reasoning about its units.**
  🔴 **And the second-order cost is the transferable part: a violation that fails LOUDLY still went
  a day unnoticed, because the failure was attributed to the right-looking cause** — the Scottish
  `LEGACY — FAIL` was read as the config-block defect, which was real, was separately fixed, and did
  not fix this row. **A loud failure next to a plausible culprit is not a diagnosed failure.**
- **Measure the call graph, not the comments.** A comment is a claim, not a measurement. One agent
  reported a defect as far worse than it was because it read a comment saying a fallback fired
  "when fixtures aren't generated" instead of tracing whether that state was reachable.
- **Documented local conventions beat a brief that contradicts them.**
- **Nothing scratch-shaped inside either repository.** Reports and evidence go in
  `/Users/courtneyadesile/Documents/WunderkindFactory/docs/economy-loose-ends/`; throwaway work in
  your own scratchpad. Paste commands and output **verbatim**.
- **`.context` status and review belong to the project-manager session.** Append one pass entry to
  `shared/last-sync.md` and correct stage text your change makes wrong. Do not restructure, prune,
  or delete a superseded section — **flag it in your report** so the PM can.
- 🔴 **A STATUS MARKER LIKE `OPEN` OR `UNFIXED` IS A STRONGER INVITATION TO TRUST A LINE THAN
  ORDINARY PROSE — AND IT CAN BE STALE IN A WAY PROSE CANNOT.** Added 2026-11-21, and it cost a
  retraction. A passage in `economy-reference.md` §8 marked **`OPEN`** asserted that NPC scouts
  sitting on the band was a *live, unfixed* defect. True at `9f46bf66`/`7b56c6c8`, **false from
  `ec949536`**. `OPEN` claims not just a fact but that the fact is still current, so it reads as
  pre-verified — which is how it travelled into a report written by the session that had just spent
  a day proving that a comment is a claim. **Two failures of the same shape met: a marker
  over-claiming its own currency, and a reader who marked provenance `[READ]` and treated that mark
  as verification.** A citation records where you got a claim, never that it is true. **If a line
  with a status marker is load-bearing for your conclusion, open the code it describes.**
- ⚠️ **MOVING A SECTION IS NOT RE-VERIFYING IT, and a split pass is the worst case.** That `OPEN`
  survived because §8 was moved **verbatim** during the `07_synthesis` split — at a commit whose
  parent was `ec949536`, the very change that falsified it. A reorganisation's stated goal is
  faithful preservation, so it is exactly when a stale marker is most likely carried across and
  least likely re-read. **When you move text that asserts a live defect, re-check the defect or
  demote the marker.**
- ⚠️ **"NO RECENT COMMIT HAS TOUCHED IT" BOUNDS *RECENT* STALENESS AND NOTHING ELSE.** A
  remediation sweep cross-referenced thirteen remaining `open`/`unfixed` claims against the files
  the last twelve commits touched. **The rule holds: a claim that went stale long ago, in a file
  nothing has touched since, passes that filter untouched — and a reorganisation pass preserves
  exactly those.** So such a sweep is evidence that the recent window introduced no *new* staleness,
  and **no evidence at all about older drift.** Use it, **say which direction it bounds** when you
  report its result, and never read a clean sweep as "these claims are current". Treat the eleven
  un-re-verified claims as un-re-verified, not as cleared.
  🔴 **RETRACTED, 2026-11-21 — the example this entry originally gave was false, and I am the one
  who put it here.** I wrote that the stale `OPEN` above *"would have passed that filter"* because
  `ec949536` had fallen outside the twelve-commit window. **Measured, and it had not:**

  ```
  $ git rev-list --oneline ce08e566~12..ce08e566 | grep -n ec949536
  6:ec949536 A club's scouts are re-priced on its own income, like its coaches
  $ git show --name-only --format='' ec949536 | grep -c SeasonBudgetService
  1
  ```

  `ec949536` was the **sixth commit inside** the window and `SeasonBudgetService.ts` was among the
  50 touched files — **which is why those claims were the ones checked individually.** The sweep
  found nothing *further*; the stale `OPEN` was caught by a retraction before the sweep ran, not
  missed by it. **So this instance is NOT an example of the limitation.** The limitation is real;
  this was not its evidence. ⚠️ **And note the shape of the error — a window boundary inferred from
  the shape of an argument instead of being measured with one `git rev-list`. That is the same
  failure as the `[READ]` citation two entries up, which is the point of keeping this retraction
  visible rather than tidying it away.**
- **Do not push and do not deploy**, ever, unless your brief says otherwise in those words.
- **THE TEST BASELINE DEPENDS ON WHICH SUITE, AND THIS LINE USED TO GET IT WRONG.** Corrected
  2026-11-20 — it previously read *"the test baseline is three to five failures"* and cited the
  **app's** `environment.md`, which has never said that. An app-scoped claim with an app-scoped
  citation is why three sessions in one day judged `npm test` against a backend figure: each was
  following something real and correctly attributed, as far as it could see. One came within a
  sentence of recording four failures as pre-existing on that basis.
  - **App (`npm test`): the baseline is ZERO on an idle machine.** Measured three times on
    2026-11-20 at three commits — pristine HEAD, `598ff158` (655 / 10,962) and `ac71159b`
    (657 / 10,992 in 540.9s). The app's own doc has always said *"treat any failure as a real
    regression"* and it means it. Owner:
    `wunderkind-app/.context/stages/01_overview/output/environment.md`.
  - **Backend (PHPUnit): the range is three to five**, because known failures #4 and #5 each join
    and leave the list on their own. Owner:
    `wunderkind-backend/.context/stages/01_overview/output/environment.md` — **the backend's file,
    not the app's.** Confirm the three by NAME; a count alone has hidden a sixth failure before.
  ⚠️ **"~31" is NOT a test figure** — it is `app:economy:wage-table`'s own failed-check count, a
  gate result, and it has been struck in that file. Judging a run against 31 would absorb about 27
  real regressions. Attribute anything outside the documented list by **stashing and re-running**,
  never by reading the assertion.
  ⚠️ **And attribute nothing from a contended run.** Same day, same tree: 151s idle against 2,825s
  contended, **18.7x**. Across three contended runs no two agreed on which suites failed and nothing
  failed twice — every one a wall-clock or retry-budget assertion, every one green in isolation.
- **Backend tests run through Lando** (`lando php vendor/bin/phpunit`) — host PHP is 8.4, the
  project needs 8.5.
- **One writer per file divides EDITING, not MEASURING — so a shared checkout cannot give you an
  attributable test run. ⚠️ BOTH RULES ARE PER REPOSITORY** (scoped 2026-11-20 after the first
  draft overstated them): one writer per file *within a repo*, one full-suite run *per checkout*. A
  `wunderkind-app` suite reads none of the backend's files and vice versa, so an app-side writer
  cannot make a backend PHPUnit run unattributable. **CPU contention is the only channel that
  crosses repositories**, and it degrades timing assertions rather than attribution — which is the
  expensive half and is unchanged by this scoping. Learned expensively on 2026-11-20, when two sessions wrote the app repo
  at once with their files cleanly divided. A suite reads the whole tree regardless of who owns
  what, so one session's uncommitted edits to `dofHireCharge.ts` and `clubStore.ts` contaminated
  the other's run through its *imports* — files it had never been asked not to touch, and would not
  have thought to check. It cost one session two full runs and the other one. **The rule from here:
  with concurrent writers, verify in a detached worktree at a named commit, and serialise suites.**
  Dividing the files is necessary and not sufficient, and the PM instruction that only divided them
  was incomplete — this was a sequencing failure upstream of the agents, not an execution failure by
  them.
- **Cut your verification worktree at the CURRENT commit and re-measure, never reconcile against a
  number you took earlier.** HEAD moved three times under one session in a single afternoon
  (`4113d326`, `ac71159b`). A count reconciled against a stale baseline looks exactly like a real
  delta and is how an unexplained test-count movement enters the record.
- **Writing a CHECKS row is a cheap way to disprove an invariant you were about to encode.** It has
  now happened twice in one day. The DOF-pot row disproved both `pot = opening − committed` (false
  on a live save, because the fee's partial elasticity is documented and real) and
  `entries = committed` (false the moment anybody has been sold). Both would otherwise have been
  asserted in a test and built on. If you are about to write "obviously X must equal Y" about money,
  render it on the CHECKS tab first and watch it fail.
- **Trace a charge in BOTH directions.** Departure paths found by looking forward from the stores
  missed the academy entirely: a youth scholarship draws the DOF pot through the same callback as an
  adult signing, but a scholar is not in `squadStore`, so no choke point sees them leave. It was
  found only by tracing the pot's *draw* sites backwards. Forward from the exits, and backwards from
  the money.
- 🔴 **EIGHT SUITES ASSERT WALL CLOCKS, AND THE SUITE CONTENDS WITH ITSELF — so "don't attribute
  from a contended run" is necessary but NOT SUFFICIENT.** The decisive measurement, 2026-11-20:
  `components/new-game-setup/randomClubProbe.test.tsx` blew a **5,000 ms** timeout on a test that
  passes in **23 ms**, 9/9 in 0.69 s alone — a ~200× scheduling delay — during a run that took
  **335.7 s against that session's own 541 s clean baseline**. Faster than baseline, idle machine,
  no other session testing. **In-run worker contention alone did it, and adding two suites was
  enough.** The suite that failed imports only React, `react-test-renderer`, `useLandFlow` and a
  mocked `@/api/client`; none of the 30 changed paths is reachable from it, so a logic regression
  was impossible and scheduling was the only mechanism left. 🔴 **CONFIRMED BY THE STRONGEST
  AVAILABLE EVIDENCE: the SAME COMMIT produced both outcomes.** A confirmation run at that identical
  tree came back **659 passed / 11,057 passed, zero failures** in 369.8 s, with
  `randomClubProbe.test.tsx` PASSING where it had failed at 37.8 s. Two runs, identical code, one
  failure and none — so this no longer rests on inference from timings. ⚠️ **The durable fix is for those eight
  suites to stop asserting wall clocks, or to carry explicit generous timeouts — not for agents to
  measure ever more carefully.** Until then a wall-clock failure in a 659-suite run is uninformative
  even on a quiet machine. NOT YET FIXED; no session owns it.
- **SEVEN OF THOSE EIGHT were found through cross-session contention, and no two contended runs ever
  agreed on which of them fail.** Measured across five full runs on 2026-11-20: `db/clientRecovery.test.ts`,
  `screens/tournamentHubRender.test.tsx`, `db/health/runner.test.ts`, `db/youthRepository.test.ts`,
  `db/realisticSave.test.ts` (*"builds in well under the 2s budget"*),
  `db/testHandleGuard.test.ts` (*"rejects at once instead of hanging to the timeout"*) and the
  worker-exit warning. **Every one is a wall-clock or retry-budget assertion and every one passes in
  isolation** — one pair 17/17. The disagreement between runs IS the evidence: a real regression
  reproduces, load does not. Before attributing ANY of these to your change, re-run it alone.
  ⚠️ **But contention moves TIMING, never a COUNT.** Measured 2026-11-20, and the trees are named
  because this sentence is load-bearing: **A25's two runs at backend `a818a60b` both returned 3,290**
  with the same three named failures, while **A24's run at `6c5e4ad5` returned 3,271**
  (`Assertions: 157033, Failures: 3`). Those are different trees and both reconcile — 3,265 baseline
  + A24's 6 = 3,271, + A25's 19 = 3,290. So: **an unexplained count means investigate; an
  unexplained slow failure may just be load.** Do not use "the machine was busy" to wave away a
  count that does not reconcile — and when you quote a count, name the commit it was measured at,
  or the next person cannot tell a real discrepancy from two people measuring different trees.
- **Attribute by checking the diff, not by guessing who is active.** 2026-11-20: a session correctly
  detected contamination in a shared file and then named the wrong author — picking the session it
  knew was running — and the PM relayed that as fact. The instruction that followed would have
  destroyed 309 insertions of a third session's uncommitted work had the accused session complied.
  It refused, checked, and was right. **One command settles authorship**: `git show --name-only
  --format='' <sha> | grep -c '\.ts$'` for what a commit contains, and `git diff | grep -c
  '<marker>'` for whose vocabulary is in the working tree. This is "measure the call graph, not the
  comments" pointed at process instead of code.
- **If you are told to revert or restore a file you did not write, STOP AND SAY SO.** A checkout
  shared by several sessions can hold thirty-plus in-flight paths with no stash behind them, so
  `git checkout <sha> -- <path>` is an unrecoverable delete of someone's unsaved work. Capture a
  backup outside both repos first, name it so nobody mistakes it for their own, and refuse until the
  premise is verified. **The safe move is never to restore a path you did not author — patch out
  your own hunks instead**, and if you cannot do that without staging someone else's work, stop:
  a commit whose tree you never tested is worse than a late commit. A lost measurement costs a
  re-run; a path-level revert costs work that exists nowhere else. An instruction that says "touch nothing you did not create" cancels itself if
  you created none of it — that contradiction is the signal.
- **AN ATTRIBUTION OFFERED TO A COORDINATOR BECOMES AN INSTRUCTION.** The sharpest process lesson
  of 2026-11-20, and it is about reporting rather than coding. A session named the wrong author for
  a contaminated file — reasonably, by inference — in a report to the PM. The PM relayed it as fact,
  and the instruction that came back would have destroyed a third session's uncommitted work. **So
  mark the epistemic status of anything you report upward**: "I verified X by running Y" and "I
  believe X because Z was the session I knew was active" are different claims and must not look
  alike. The coordinator cannot see which one you meant, and will act on both.
- **Staging your own HUNKS out of a shared file is allowed — but only if you then verify that exact
  reconstructed content.** Ruled 2026-11-20 after two sessions reached opposite conclusions, both
  defensibly. The objection to carving a change out is real and it is *"a commit whose tree I never
  tested"*: an index built by hand can hold a combination no test ever ran. **That objection is
  answered, not waved away, by rebuilding the files as `<HEAD> + your hunks only` and running the
  suite against that exact content in a detached worktree.** Do that and sub-file staging is
  legitimate; skip it and it is not. Prove the carve is clean before committing (`grep -c` the other
  author's marker in your staged content and expect 0) and never touch the other session's working
  copy — read it, do not write it.
  ⚠️ **Tell the other writers once you commit.** A subset commit means HEAD now holds a tree that
  nobody's working copy matches, so every other session in that checkout has a stale baseline and
  must re-measure rather than reconcile against the number it took earlier.
- **The `seasonBudget` reader registry reads TYPE ANNOTATIONS, not just executable code.** It cost
  two sessions a run on 2026-11-20. A field like `seasonBudget?: { wageReservationPence?: number }`
  in a type position registers as a code reference, because the registry strips comments and nothing
  else. Either register the file deliberately with a reason, or avoid the annotation. The same class
  as the guard that read prose: **a source-reading test sees text, not meaning.**
- **CAPTURE FAILING TEST NAMES, NOT JUST `FAIL` LINES.** A filtered capture
  (`grep -E "^(FAIL|Test Suites:|Tests:|Time:)"`) drops Jest's `●` lines, so a contended run told
  one session that `db/youthRepository.test.ts` failed and **nothing about which test** — it had to
  be recorded as unnamed rather than inferred. Add `^  ● [A-Za-z]` to the filter and exclude
  `● Console`. Cheap, and without it "re-run it alone" has nothing to re-run.
- **A GREEN CONTROL RUN IS WORTHLESS IF THE CONTROL WAS ALSO CONTENDED — and this is the trap that
  actually caught someone.** A session called four failures load flake, then **retracted** when a
  pristine-HEAD control came back green, on the correct reasoning that a green control is evidence
  against the easy explanation. The retraction was right on what it had; what it had was wrong,
  because **that control still had a phpunit suite running beside it.** What settled it was the
  timing column — 151s against 2,825s — not the pass/fail. **So compare wall-clock between the two
  runs before believing OR disbelieving a load explanation. A control run with no timing beside it
  decides nothing.**
- **SERIALISING NEEDS AN EXPLICIT HANDSHAKE, not just good intentions.** Two sessions each politely
  assuming the other was idle produced a 715s run and a 609s run, both unattributable, against a
  541s clean baseline. **Ask for the machine, and announce when you are off it.** One message each
  way would have saved both runs.
- **ADDRESS A PEER BY SESSION ID, NEVER BY THE SOCKET YOU LAST SAW IT ON.** A session's socket
  address changes; its id does not. On 2026-11-20 a session got ENOENT on a stale socket AND found
  the peer missing from `ListAgents`, read two independent-looking signals as agreement, and
  reported a live session as ended — nearly orphaning 31 paths of its uncommitted work. **Both
  signals keyed on the address, not on existence.** Check the session list before concluding a peer
  is gone, and remember the harness's "reply to the `from` attribute" advice hands you the fragile
  one.
- 🔴 **THE REAL CAUSE OF TODAY'S CONTENTION WAS EIGHT ORPHANED BUSY-LOOPS, AND NOBODY KNEW.**
  Found 2026-11-20 at 18:43 by the country-scaling session: PIDs 79065–79072, **PPID 1, 3h12m old,
  ~80% CPU each, load average 33–42 on 8 cores.** They came from A24's own load experiment —
  `for i in 1 2 3 4 5 6 7 8; do (while :; do :; done) & done; … kill $LOADPIDS` — whose
  `kill $LOADPIDS` did not fire, so the subshells were orphaned and spun for over three hours,
  **across most of the day's measurement work.**
  ⚠️ **So the notes above may OVERSTATE cross-session contention.** The 18.7× figure, the seven
  load-sensitive suites and the phantom failures were measured while this was running and nobody
  knew it. The in-run self-contention finding is NOT affected — it was proven by the same commit
  producing a failure and a clean run — but the cross-session attributions deserve a re-measure on a
  genuinely quiet machine before they are treated as settled.
  **The transferable rule: if you spawn load generators, verify they died.** `kill $LOADPIDS` from
  an `eval`'d subshell does not reliably reach them; check with `ps -o pid,ppid,%cpu,etime` and
  `uptime` afterwards, and treat a load average above your core count as a reason to stop measuring
  anything at all. **And before trusting ANY timing measurement, run `uptime` first** — every
  session today compared wall clocks without once checking what else was on the machine.
- 🔴 **THE BACKEND COUNT 3,290 DOES NOT REPRODUCE — do not reconcile against it.** Re-measured
  2026-11-20 at the SAME commit `a818a60b` on a quiet machine: **3,359 tests**, a 69-test gap
  nobody can explain. Reconciling a later change against 3,290 would have shown a spurious +76.
  ⚠️ **Both figures claim the same tree, so one of them is wrong and it is not yet known which.**
  Until that is settled, **re-measure the baseline yourself at the commit you are building on** and
  quote your own figure — which is what the country-scaling session did, reconciling 3,359 + 7 =
  3,366 exactly against its own extract. That is the method the earlier note asked for and it is
  the reason the discrepancy surfaced at all rather than being absorbed.
- ⚠️ **`AdminShellCoverageTest` at `admin_logs` cannot run while `var/log/dev.log` is huge.** It
  reads the whole file into memory; at 3.8 GB against a 3.8 GB container PHP is OOM-killed at
  **exit 137** about 189 tests in, reproducibly. It is excluded from recent runs for that reason
  and is NOT a regression in anything. The fix is log rotation, not a code change. As of
  2026-11-20 `var/log/` holds **3.8 GB `dev.log` + 2.0 GB `dev.log.2026-11-12.bak`** — not yet
  rotated, owner's call.
  ⚠️ **NAME YOUR EXCLUSION SCOPE BESIDE ANY BACKEND COUNT.** Added 2026-11-21. B2's runs excluded
  the **whole `AdminShellCoverageTest` class**, which is wider than `environment.md`'s `admin_logs`
  filter — so its **3,307 at `3ff5a312` does NOT reconcile against the 3,366 at `c11c7f2d`**, and
  treating the gap as drift would invent a 59-test discrepancy. A count is comparable only to one
  taken with the same exclusions. **Quote the commit AND the filter.**
  ⚠️ **AN ASSERTION COUNT IS NOT A BASELINE — the test count and the NAMED failures are.** Same
  commit, same count, same three named failures, assertions moved **157,316 → 157,340**. That is
  known item #4's documented instability (`environment.md` records 11/7/7 assertions on three tests
  across consecutive clean runs). Do not read an assertion delta as a signal.
- 🔴 **WRITE GUIDANCE AS AN INVARIANT, NOT AS AN IDENTIFIER — VOLATILE IDS ROT INSIDE AN HOUR.**
  Added 2026-11-21 after it happened twice in one evening. START-HERE told the owner two specific
  world-pack sets were safe and named them, `01a1fab3…` and `01a1ff72…`. One admin Regenerate later
  both were gone — `startRun()` clears a country's unclaimed sets first — and the advice read as
  wrong when **the substance of it was still exactly right**: Scotland was still 2 claimable at v14
  with 8 payload rows and nothing needed preparing. **"2 claimable at version 14" survives a
  rebuild; "`01a1fab3…` is fine" does not.** The same applies to run ids, container ids, queue rows
  and anything else the system recreates on its own schedule — and the cost is not just staleness,
  it is that a reader cannot tell a rotted identifier from a real regression.
  ⚠️ **Corollary, and the reason this is worth a line of its own:** when such a reading does go
  stale, **supersede it in place and say what is still true**, rather than deleting it. The
  superseded text is how the next reader tells "this changed" from "this was wrong".
- 🔴 **NEVER HAND A PEER A LIST PRODUCED BY `head`, `tail` OR ANY TRUNCATION — AND NEVER ACT ON ONE
  AS IF IT WERE COMPLETE.** The PM's error, 2026-11-21, and it nearly shipped a broken commit. I
  read a working tree with `git status --porcelain | head -8`, then sent those eight paths to the
  session that owned them as though they were the whole change. **It was twelve.** The four I
  dropped were `WorldPackSetTopUpService.php`, the admin twig template and both new test files — so
  had that session staged exactly what I sent, the commit would have held **a controller returning
  409 with no UI able to render it and no tests at all.** It staged by explicit path from its own
  `git status`, caught the gap, and told me.
  **Two rules out of it.** Writing: pipe to `wc -l` first, and quote the full list or say
  explicitly that it is truncated — **a truncated list reads exactly like a complete one**, which is
  the same defect as a test run that silently collects fewer files. Reading: **the author of a
  change enumerates its paths, never the coordinator.** This is the fourth instance in one evening
  of the same shape — something inferred, handed to or from a coordinator, and acted on as a
  measurement — and the first where the coordinator was the one inferring, from truncated output
  rather than from a citation or an argument.
- 🔴 **"REBUILD THE WORLD PACK CACHE" DOES NOT REBUILD CLAIMED SETS, AND A TESTER HAS CLAIMED THEM
  ALL.** Found 2026-11-20 after an afternoon of device readings that contradicted each other.
  `admin_worldpack_delete_country` calls `deleteUnclaimed($country)` — **claimed sets are spared by
  design**, because a device may still be downloading its tiers. That protection is correct. The
  trap is that **every save a tester creates claims a set**, so after a day of testing every set in
  the country is claimed, "rebuild" deletes nothing, reports success, and the stale packs survive.
  The page then reads e.g. `EN 2/2 STALE 8/8` — present, complete, and stale — which looks like a
  failed rebuild rather than a skipped one.
  **The way out is the per-set delete with `force`**, which exists precisely for "a set claimed by
  an abandoned save". Then top up to target. ⚠️ Forcing breaks the world of whatever save claimed
  it, so only do it to throwaway saves.
  **The general lesson, which is not about world packs:** when a destructive operation protects a
  class of data, check whether the thing you are trying to fix is ENTIRELY inside the protected
  class. A no-op that reports success is worse than a refusal, and this one silently invalidated
  about three hours of device testing. **A `MIXED` or `STALE` version indicator is a gate, not a
  footnote — read it before any number underneath it.**
- 🔴 ⚠️ **THIS ENTRY IS WRONG AND IS CORRECTED HERE — 2026-11-21, by measurement.** The async
  world-pack build **DOES run on dev.** B2 observed a complete version-14 Scottish set built end to
  end by the async path (`ready_at 2026-11-21 18:51:10`), with `messenger` queues at 0 and the
  consumer running every other minute. **What is actually broken is the REPORTING, not the build:**
  the admin TOP UP button can answer *"already at target"* while writing nothing. That is the half
  that cost the three hours, and it is still live on the running stack — the fix needs an image
  build and is not deployed.
  **So the instruction below is inverted: you do not need the inline command to get a pack.** What
  you must not do is trust the admin top-up's success message, or press **Regenerate** to "get a
  clean one" — that calls `deleteUnclaimed()` and would destroy good unclaimed sets to rebuild from
  scratch for no gain. It is also what erased the evidence B2 went looking for. **Read the pack
  version indicator regardless**; a `MIXED`/`STALE` reading is still a gate.
  ⚠️ **Three places still say otherwise and are NOT yet corrected** — this entry's original text
  below, `wunderkind-app/.context/stages/07_synthesis/output/architecture-notes.md`'s *"Keeping the
  buffer stocked"* bullet, and `wunderkind-backend/.context/stages/01_overview/output/deployment.md:152`.
  The two `.context` files are PM-owned and left alone while B2 has uncommitted work in that repo.
  **Trap #1 above — that a rebuild spares CLAIMED sets — is unaffected and stands.**
  🔴 **One consequence worth carrying: any dev DEVICE reading taken before 2026-11-21 carries a
  weaker guarantee than whoever recorded it assumed**, including one whose pack indicator read
  clean, because a top-up could report success while writing nothing. Marked by B2 as INFERRED from
  the mechanism, not observed — the rows that would prove it were deleted by the 19:41 Regenerate on
  2026-11-20. A diagnosis resting on a code measurement at a named commit is unaffected; one resting
  on a device figure should be re-weighed.

  ---

  **SUPERSEDED TEXT, kept because its three disproved theories still save time:**
  **ON DEV, THE ASYNC WORLD-PACK BUILD DOES NOT RUN — USE THE INLINE COMMAND.** Established
  2026-11-20 by elimination, after three wrong theories (orphan cache rows, claimed-set deadlock,
  crond down — all disproved). **What is true:** the write path stamps `WORLD_PACK_VERSION`
  correctly; `deficit()` is version-aware so stale sets never block a top-up; `crond` IS running
  (`crond -f -l 8`, PID 103 under supervisord); dispatch succeeds. **And yet nothing ever built.**
  `php bin/console app:worldpack:warm <CC>` builds INLINE and worked first time — EN to 2 ready
  sets of 8 tiers, SC to 2 ready sets of 4 tiers. So the defect is in the consumer or handler on
  the dev stack, not in the generation code.
  ⚠️ **This silently invalidated roughly three hours of device testing**, because every admin
  "rebuild" reported success while writing nothing, and each resulting save read a stale or mixed
  pack. **Until it is fixed, warm from the console and never trust the admin top-up on dev.**
  ⚠️ **`supervisorctl` does not work on this image** — `docker/supervisord.conf` defines no
  `[unix_http_server]` and no `[supervisorctl]`, so there is no control socket and
  `supervisorctl status` returns "no such file". That is by construction, not a fault. Check
  processes with `docker exec <container> ps aux` instead.
  **Deployment, for whoever needs it next:** Hetzner, ssh `wunderkind.site`, containers
  `wunderkind-dev` / `wunderkind-prod`, compose files under `/mnt/volume-wkf/wunderkind/{dev,prod}`,
  runbook `docs/deploy/hetzner.md`.
