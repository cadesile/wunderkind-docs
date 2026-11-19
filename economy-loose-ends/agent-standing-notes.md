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

- **Believe the code over the brief.** If they disagree, say so explicitly in your report and do not
  silently comply. Briefs in this project have repeatedly contained a wrong premise; five agents
  have now caught one by checking.
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
- **Do not push and do not deploy**, ever, unless your brief says otherwise in those words.
- **The test baseline is three to five failures** (`.context/stages/01_overview/output/environment.md`).
  ⚠️ **"~31" is NOT a test figure** — it is `app:economy:wage-table`'s own failed-check count, and
  it has been struck in that file. Attribute anything outside the documented list by **stashing and
  re-running**, never by reading the assertion.
- **Backend tests run through Lando** (`lando php vendor/bin/phpunit`) — host PHP is 8.4, the
  project needs 8.5.
