<!-- STATUS --> **STATUS:** ✅ A13 — CHECKS report curated. Landed `ea92859a`. ⚠️ COMMITTED, NOT PUSHED, NOT DEPLOYED.

---

# TASK — A13: the CHECKS report has outlived half its checks

**App only (`wunderkind-app`), branch `new-game-save`.** **Commit; do not push.**

⚠️ **Read `docs/economy-loose-ends/agent-standing-notes.md` with this brief.**

## 0. The ask, in the owner's words

> *"create a task to clean up checks, and some of the 'checks' have been completed. We don't want
> the output to be too heavy."*

**Two jobs, and the second is the point:** retire what is finished, and make what remains readable.

⚠️ **This is a CURATION task, not a deletion task.** The report is the owner's primary instrument
for answering questions about a live save — it has already resolved real defects this month.
**Losing a standing invariant to save three lines is a far worse outcome than leaving one stale
check in.** When genuinely unsure, keep it and say so.

## 1. Code state

`git fetch origin` with explicit refspecs; confirm `new-game-save` is in sync and the tree is clean,
or stop and report. ⚠️ **Another agent may be working in this repo — check before you start and
report if the tree is dirty.** State branch, hash and date at the top of your report.

ICM: read `.context/CONTEXT.md` and the relevant stage's `output/` first.

**The surface:**
```
src/components/debug/ChecksTab.tsx        718 lines   assembles the sections
src/db/diagnostics.ts                   2,652 lines   most of the checks
src/economy/economyDiagnostics.ts         142 lines
src/economy/worldPackDiagnostics.ts       102 lines
src/db/health/checks/                                 the Stage-1 invariants
```

---

## 2. 🔴 THE TEST A CHECK MUST PASS TO SURVIVE

**A check earns its line if it can FAIL in a way that changes what someone does.**

Work through every check and classify it:

| | keep | why |
|---|---|---|
| **INVARIANT** | ✅ | can fail; failure means something is wrong now. Player-pool partitioning, orphan rows, schema migration, store hydration, unique indexes |
| **STANDING FACT** | ✅ but quieter | cannot fail, but is worth knowing every run — SQLite version, journal mode. **Collapse these**; they do not need a line each |
| **COMPLETED DECISION GATE** | ❌ retire | existed to decide a task that is now decided |
| **SETTLED MEASUREMENT** | ❌ retire | answered a question nobody is asking any more |

### 2a. The obvious retirements — verify each before acting

The labels `D4`, `D8`, `D12`, `D13`, `D14`, `A3`, `A5`, `A6`, `B2`, `B3` are task IDs from a
finished workstream, and several checks still print **go/no-go verdicts for decisions already
taken** — for example:

```
clearAllClubData wall-clock (A6): 357ms
  under the ~500ms bar — A6 does NOT proceed
```

```
B2: how the pool scan reaches players: bare SCAN of players — expected on 3.50.3,
    settled by D14 (re-run it if this needs re-checking)
```

**A check whose own text says a question is settled is a check that has finished its job.**

⚠️ **Verify before retiring each one.** Find what the task was and whether it concluded — the
`.context` stages and `docs/` carry them. **If a "gate" turns out to also assert an invariant,
keep the invariant and drop only the verdict.** Several of these do both; that distinction is the
real work of this task.

### 2b. Weight without deletion

Some sections are valuable but verbose. **Prefer summarising to deleting:**
- **PRAGMAS (D4)** — fourteen lines, mostly constants. One line naming anything that differs from
  expected is worth more than fourteen reciting values.
- **Boot timeline** — ~30 lines. Total plus the slowest few would carry it; the full list behind
  an expansion.
- **WRITE COST** — twenty-plus labels. The WARN and the worst few; the rest on demand.
- **SIZING per-object** — twelve table rows.

⚠️ **Keep every section COPYABLE and keep COPY EVERYTHING complete.** The report's purpose is
pasting into a bug report. **Summarising the default view must not mean losing the detail** — if
you collapse something, the full text must still reach the clipboard. Say how you preserved this.

---

## 3. 🟩 ADD THE CHECKS TODAY'S WORK PROVED WERE MISSING

Per the standing note's §1 — **and these are specific, earned, and come from real cost.**

### 3a. 🔴 Division size, three ways, one line per league

The highest-value addition. On 2026-11-19 a Scottish division paid TV **fourteen ways to twelve
clubs**; three agents and the PM spent hours triangulating it. One line would have shown it:

```
EN t8   slots 16 · clubs 15 (+amp = 16) · home games 15 · TV £75,000 = pool/16   OK
SC t7   slots 14 · clubs 12 · home games 11 · TV £357,143 = pool/14              DISAGREE
```

**The relationships are the check**, not the numbers: does the authored size match the clubs that
exist, do the fixtures agree, and is TV divided by the same figure the division actually has?

### 3b. The wage-model reality check

The CHECKS tab already prints a per-tier mean weekly wage. **Add what it should be**: the mean
against the tier's authored player budget, as a ratio. That ratio has sat at ~28–35% for months
without anyone seeing it as a number, and a change landing now is expected to move it to ~70–85%.
**One line per tier makes a calibration drift visible the moment it appears.**

### 3c. NPC budget inputs for one representative club

Weekly income split into its parts — sponsor, matchday, seasonal — with the home-game count used.
Today's NPC-budget work needed exactly this and had to derive it by reading code.

⚠️ **All three must obey §2's bar.** If one cannot fail, make it a quiet standing fact rather than
a loud check.

---

## 4. Verification

1. `npx tsc --noEmit` clean.
2. `npm test` green **with the suite COUNT confirmed** (`npx jest --listTests | wc -l`).
3. **🔴 Paste the full report BEFORE and AFTER**, and state the line count of each. **That diff is
   the deliverable.**
4. **Prove nothing was lost from COPY EVERYTHING** — if you collapsed a section, show its full text
   still reaches the clipboard.
5. **A list of every retired check with its justification**, one line each: what it was, which task
   it served, and why that task is done. ⚠️ **A retirement you cannot justify in one line is one you
   should not make.**

## 5. Reporting, scratch files and `.context`

Report: `/Users/courtneyadesile/Documents/WunderkindFactory/docs/economy-loose-ends/a13-checks-report.md`.
Nothing scratch-shaped in either repo. Paste commands and output **verbatim**.

Append one pass entry to `.context/shared/last-sync.md` and correct stage text your change makes
wrong. **Do not restructure or prune `.context` — flag it in your report.**

## 6. Do not

- Do not push. Do not deploy.
- **Do not delete a check you cannot justify retiring in one line** (§4.5).
- **Do not break COPY EVERYTHING** (§2b).
- **Do not change what any check MEASURES** — this task retires, summarises and adds. Correcting a
  check's logic is a different task; **report it instead.**
- Do not work in `wunderkind-backend`.
- Do not change `WORLD_PACK_VERSION`.
