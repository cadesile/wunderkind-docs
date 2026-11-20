<!-- STATUS --> **STATUS:** ✅ DONE — see `a15-harness-mirror-report.md`. DEPLOYED (ancestor of `origin/dev`). ⚠️ The report's §0.1 corrects this brief's premise — read it before reusing anything here.

---

# TASK — A15: the harness keeps its own copy of the backend's reference squad, and it is now wrong

**App only (`wunderkind-app`), branch `new-game-save`.** **Commit; do not push.**
⚠️ **Another agent (A18) may be in `wunderkind-backend` — do not write there.** Reading it is
required and expected.

⚠️ **Read `agent-standing-notes.md` with this brief.**

## 🟥 0. THIS TASK HAS AN OPEN QUESTION. INVESTIGATE BEFORE YOU IMPLEMENT.

**§3 is not settled, and the PM does not know the answer.** You are expected to establish the right
approach, state it with evidence, and **stop before implementing if the answer is a backend
change.** A report that says *"here is the right fix and it is not app-side"* is a success.

**What IS settled and safe to do: §2 (the false comment) and §4 (the invariant becomes the proof).**

## 1. Why this blocks a deploy

**A10 is committed on the backend (`68561f93`) and cannot ship without this.** It changed what the
wage scale's σ is computed over — the reference squad is now built from each member's **expected
current ability** rather than from the raw potential band. **The app harness keeps its own copy of
that squad**, so the two have silently diverged. Deploy A10 as it stands and the app's economy gate
goes red on a correct change.

A10 found this, reported it, and correctly did not cross repos. Its report —
`a10-wage-scale-report.md` §0.2 — is the primary source; **read it first.** Its §0.1 and §3 explain
what the backend now does and why.

## 2. ✅ SETTLED — the comment is false, and that is the tell

`src/economy/harness/loadExport.ts:89`:

```ts
/** Evenly spaced INTEGER abilities across a band, matching the backend's reference squad. */
function referenceSquad(band: { min: number; max: number }, size: number): number[] {
```

**"matching the backend's reference squad" is now untrue.** The backend maps each member through
the generator's maturation chain; this spreads raw potentials. **Fix the comment regardless of what
you conclude in §3** — a comment asserting a mirror that does not exist is how this class of defect
survives, and this project has been bitten by exactly that twice today.

## 3. 🔴 THE OPEN QUESTION — where do the expected abilities come from?

The harness is TypeScript and **cannot call the PHP generator.** So mirroring means one of:

| | approach | the objection |
|---|---|---|
| **(a)** | reimplement the maturation chain in TS | ⚠️ **This is the duplication the whole workstream exists to end.** A10 was forbidden from copying those tables into the economy service for the same reason. A second copy in another language is worse |
| **(b)** | **backend publishes** the reference squad's expected abilities (or σ) in game-config; the harness reads it | clean, "one source for one quantity" — **but it is a backend change and not yours** |
| **(c)** | invert the published scale to recover σ | ⚠️ `σ = playerBudget × UNIT / (weeks × S_tier)`, and all three are published — **but it makes §4's invariant true by construction, destroying the check.** And the harness needs the *abilities*, not only σ, to build `turnoverAvgWeeklyPence` |

**Establish which is right. State the evidence. If it is (b), say so and STOP** — do not implement a
backend change, and do not fall back to (a) because (b) is unavailable today.

⚠️ **Do not quietly leave the harness pricing the potential band while calling it a mirror.** If
that is the pragmatic interim, **say so explicitly, change the comment to match, and name what it
now measures** — "what a band-priced squad would cost", not "what the backend's reference squad
costs". An honest wrong number beats a dishonest right one.

## 4. 🟢 THE INVARIANT IS THE PROOF — use it as your acceptance test

`loadExport.ts:140-146` records:

> *"`wageScaleMicroPence × SUM(ability^k) / turnoverPence` is the resolver's own formula rearranged
> and must be constant across tiers. Floored it is 9782.608696 at all eight."*

**That constant is load-bearing twice over**: it is the invariant, *and* it is the stated proof that
`floor` rather than `round` is the backend's squad-size reading.

**A10 measured σ_old/σ_new at 3.18–4.66 across the tiers**, so against the new backend the ratio is
no longer constant — **which is exactly what makes it a perfect self-check:**

🟢 **If your mirror is correct, the ratio becomes CONSTANT ACROSS ALL EIGHT TIERS AGAIN, at a new
value. If it does not, the mirror is wrong.**

**That is your acceptance criterion.** Report the eight values before and after. ⚠️ **Do not update
the documented constant to whatever you happen to produce** — derive it, then check it is constant,
then record it. Those are different operations and only one of them is evidence.

⚠️ **The floor-vs-round proof must survive too.** If your change makes `round` look equally valid,
say so — the original reasoning would then need re-establishing on other grounds.

## 5. Verification

1. `npx tsc --noEmit` clean.
2. `npm test` green **with the suite COUNT confirmed** (`npx jest --listTests | wc -l`).
3. **The eight invariant values, before and after, pasted** (§4).
4. **The economy gate, before and after, for EN.** ⚠️ **It MUST move** — that is the point. Confirm
   the direction and rough magnitude match A10's σ_old/σ_new of 3.18–4.66.
5. ⚠️ **`turnoverAvgWeeklyPence` moves with it.** State what it was and is, and what it now means.

## 6. Report, do not change

- Anything in `wunderkind-backend`, including the publish in §3(b).
- `ENGLAND_DEV` in `harness/fixtures.ts` carries `referenceSquadSize` per tier. **If those become
  wrong, report rather than re-authoring them** — they are a recorded measurement.

## 7. Reporting, scratch files and `.context`

Report: `/Users/courtneyadesile/Documents/WunderkindFactory/wunderkind-docs/economy-loose-ends/a15-harness-mirror-report.md`.
Nothing scratch-shaped in either repo. Paste commands and output **verbatim**.

Append **one** pass entry to `.context/shared/last-sync.md` and correct stage text your change makes
wrong. **Flag anything you would have restructured.**

## 8. Do not

- Do not push. Do not deploy.
- **Do not work in `wunderkind-backend`** — A18 may be there.
- 🔴 **Do not reimplement the generator's maturation tables in TypeScript without saying so and
  justifying it** (§3a).
- 🔴 **Do not update the invariant's constant to match your output without first proving it is
  constant across all eight tiers** (§4).
- **Do not change any authored economy figure.**

Before you commit, list the docs folder for any `*-correction.md` or `*-addition.md` newer than this
brief.
