<!-- STATUS --> **STATUS:** 📋 BRIEFED, NOT STARTED.

---

# TASK — A16: two tests leave the shared `game_config` row dirty, and a third pays for it

**Backend only (`wunderkind-backend`), branch `development`.** **Commit; do not push.**
⚠️ **Another agent (A17) is in `wunderkind-app` — do not write there.**
**Small task. Expect ~20 lines of change.**

⚠️ **Read `agent-standing-notes.md` with this brief.**

## 0. The defect, already diagnosed — do not re-diagnose it

`LegacyNewGameFlowTest::testTheEconomyBlockShipsSwitchedOff` asserts *"the turnover table must be
unauthored"* and fails in **every full run** with:

```
--- Expected          +++ Actual
 Array &0 [
-    0 => 0,
+    0 => 38866153952,
```

**Two tests write that literal into the SHARED `game_config` row inside their own `seed()` and
never restore it:**

```
tests/Command/EconomyAuthoredSizeDriftTest.php:156
tests/Command/EconomyTvCountryScalingGuardTest.php:113
    $config->setEconomyBaselineTurnoverPence([38_866_153_952, 0, 0, 0, 0, 0, 0, 0]);
```

**Default order is alphabetical** and `tests/Command/Economy*` sorts before
`tests/Controller/Api/Legacy*`, so **the polluter always runs first.** A10 proved it three ways
from a verified-clean row: reader alone **passes**; polluter → reader **fails**; reader → polluter
**passes**. Full account in `a10-wage-scale-report.md` §5.9.

⚠️ **Both polluting files landed on 2026-11-19 with A7**, so this is new, not historical.

## 1. 🔴 THE FIX BELONGS IN THE POLLUTERS, NOT THE READER

**Do not touch `LegacyNewGameFlowTest`.** Its assertion is a real invariant and its docblock names
the mistake it exists to catch: *"shipping a non-zero inflation rate or an authored turnover table
by accident, which would change what every existing save derives without anyone choosing it."*
**That is worth keeping exactly as it is.**

The two `tests/Command/Economy*` files need the row for their own run. **Either restore what they
replaced, or stop persisting it** — your call, with the reasoning stated.

⚠️ **Whatever you choose must survive a test failing mid-run.** A restore that only happens on the
happy path leaves the row dirty exactly when something else has already gone wrong, which is the
worst time for it.

## 2. Code state

`git fetch origin` with explicit refspecs; confirm `development` is in sync — ⚠️ **it was pushed and
deployed today, so it should be level with origin, not ahead.** Working tree clean, or stop and
report. State branch, hash and date at the top of your report.

ICM: read `.context/CONTEXT.md` first.

⚠️ **Environment facts, measured today — do not re-diagnose:**
- Tests run through **Lando** (`lando php vendor/bin/phpunit`); host PHP is 8.4, the project needs 8.5.
- **A full run OOM-kills at ~183/3305 (exit 137). The cause is `AdminShellCoverageTest`** — 72
  tests, confirmed twice. **Run `--filter '/^(?!.*AdminShellCoverage).*$/'` to get a clean full
  run of 3,233.**
- **The documented baseline is three to five failures**, and today's clean run showed exactly
  three: `NotificationLogCrudControllerTest`, `CompetitionControllerTest`,
  `FriendlyResolveSingleMatchTest`. ⚠️ **"~31" is NOT a test figure** — it is the economy gate's
  own failed-check count.

## 3. Verification — the whole point is that a full run goes green

1. **Before:** full run (filtered per §2) showing the **four** failures including the reader.
2. **After:** the same run showing **three** — the documented baseline, and the reader passing.
3. **Both polluting files still pass on their own**, and still pass when run after the reader.
4. **Prove the restore survives a failure.** Force one of the polluters to fail (temporarily, in
   your scratchpad — not committed) and show the row is still clean afterwards.
5. ⚠️ **Check the row's state before you start and restore it when you finish.** A10 left it clean;
   if you find it dirty, say so — that tells us something ran since.

## 4. 🟢 While you are here — update the baseline record

`.context/stages/01_overview/output/environment.md` currently lists this as a **sixth known
failure**. ⚠️ **Once fixed it is not a known failure at all** — remove it, and say in the pass entry
that it was a defect fixed rather than a flake that stopped appearing. **Leaving it listed would
train the next agent to ignore a real failure.**

**Also add, if not already there:** the `AdminShellCoverageTest` OOM and the `--filter` workaround
from §2. It cost two sessions a full-suite run today.

## 5. Reporting and `.context`

Report: `wunderkind-docs/economy-loose-ends/a16-test-pollution-report.md`.
Nothing scratch-shaped inside either repository. Paste commands and output **verbatim**.

Append **one** pass entry to `.context/shared/last-sync.md`. **Flag anything you would have
restructured.**

## 6. Do not

- Do not push. Do not deploy.
- 🔴 **Do not modify `LegacyNewGameFlowTest` or relax its assertion** (§1).
- **Do not change any production code.** This is a test-isolation fix; if you conclude production
  code is at fault, **stop and report.**
- **Do not work in `wunderkind-app`** — A17 is there.
- Do not touch any authored economy figure.
