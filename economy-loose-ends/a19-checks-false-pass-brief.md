<!-- STATUS --> **STATUS:** 📋 BRIEFED, NOT STARTED — queued behind A17, which holds the app repo.

---

# TASK — A19: the division-size check passes on seven of its eight real failures

**App only (`wunderkind-app`), branch `new-game-save`.** **Commit; do not push.**
⚠️ **Check for another agent in this repo before starting** — A17 was working here.

⚠️ **Read `agent-standing-notes.md` with this brief.**

## 🟥 0. THE DEFECT — measured on device, 2026-11-19 20:26

The DIVISION SIZE check shipped in A13/A18's work flagged **one** tier:

```
SC t1  slots — · clubs 12 · home games 11 · TV £21.4m              OK
SC t2  slots — · clubs 12 · home games 11 · TV £10m                OK
...
SC t8  slots 14 · clubs 12 · home games 11 · TV £86k = pool/14     DISAGREE
```

**All eight tiers are dividing by 14 against 12 clubs.** Verified against the authored pools:

| tier | shown | pool ÷ 14 | pool ÷ 12 | divisor in use |
|---|---|---|---|---|
| 1 | £21,400,000 | £21,428,571 | £25,000,000 | **14** |
| 4 | £3,600,000 | £3,571,429 | £4,166,667 | **14** |
| 7 | £357,000 | £357,143 | £416,667 | **14** |
| 8 | £86,000 | £85,714 | £100,000 | **14** |

**£86,600,000.36 a season is unpaid, across all eight tiers.** The check catches one because the
app holds an authored `slots` only for the **AMP** tier; elsewhere it reads `—` and **scores the
unknown as agreement.**

🔴 **A false PASS in the one instrument built to catch this defect is worse than no check** — a
reader sees seven OKs and concludes seven tiers are sound. **That is the bug. Not the Scottish
club count, which is a separate owner decision you must not touch.**

## 1. 🔴 THE FIX IS A THIRD STATE, AND A DIVISOR THAT NEEDS NO `slots`

**Two changes, and the second is what actually closes it:**

1. **`slots` unknown must read UNKNOWN, never OK.** Three states — AGREE / DISAGREE / UNKNOWN —
   and **UNKNOWN must not be scored as a pass** by whatever rolls these up into the section verdict.
2. **Derive the divisor from the published figures instead.** `pool ÷ tvDeal` gives **14 at every
   tier here with no authored value needed**, and the club count is already in hand. **So the
   comparison that matters — is TV being divided by more clubs than exist? — is answerable at every
   tier today.** Make that the primary assertion; keep `slots` as corroboration when present.

⚠️ **Watch integer division.** `tvDeal` is `intdiv(pool, size)`, so recovering the divisor needs a
tolerance or a round, not an equality — `pool / tvDeal` will not be exactly 14. **State how you
handled it.**

⚠️ **The same trap applies anywhere else a check compares against a value the device may not hold.**
Look for it while you are in there and **report what you find** rather than fixing it all.

## 2. Add the FANBASE line A18 specified and could not add

A18's §3.3 — it is backend-side and the tab is app-side. **Its spec, verbatim:**

```
FANBASE  ladder published: yes (8 rungs) · catchment known: 127/128 clubs · path: SHARE
         AMP club: tier 6 · catchment 43,000 · share 25.5% · fans 10,965
```

**Why it earns its line:** after today's deploy there is **no way to tell from the device whether
`fanCount` came from the catchment or from the fallback band.** It can fail — a missing ladder, a
pack with no populations, or an AMP club with no catchment all read differently — and the failure
changes what someone does. ⚠️ **One or two lines, per standing-notes §2.**

## 3. 🟡 While you are in `fanBase.ts` — a latent trap A18 flagged

**`REFERENCE_FAN_BASE_SHARE_PERCENT` (`src/economy/fanBase.ts:90-99`) is the REJECTED 5–10%
variant**, pinned by `fanBase.test.ts:154`. It is **not** the fallback for an absent ladder — that
is `fanBaseRanges`, correctly — **but it fills any single tier the published ladder omits**
(`fanBase.ts:179`). The backend publishes all eight rungs, so this is **latent, not live**.

**Two consequences:** a ladder published with a gap silently gets the 164:1 variant at that rung,
and **any app-side measurement run off that constant measures the rejected ladder.**

⚠️ **Decide and justify**: align it with the published default (60–70% → 15–20%), or make an
omitted rung an explicit failure rather than a silent substitution. **Say which and why.** Do not
simply delete it without establishing what reads it.

## 4. Scope and verification

**England and Scotland only.**

1. `npx tsc --noEmit` clean; `npm test` green **with the suite COUNT confirmed**.
2. **Paste the check's output before and after**, for a Scottish save. ⚠️ **After, it must show
   DISAGREE at all eight tiers, not one** — that is the acceptance criterion.
3. **A test that UNKNOWN does not score as a pass.** The defect is the scoring, not the display.
4. **A test for the integer-division tolerance** (§1).
5. The economy gate must be byte-identical — this is diagnostics only.

## 5. Report, do not change

- 🔴 **Scotland's 12-vs-14 itself.** The check exists to make it visible; **fixing it is the
  owner's decision and explicitly not yours.**
- Anything in `wunderkind-backend`.

## 6. Reporting and `.context`

Report: `wunderkind-docs/economy-loose-ends/a19-checks-false-pass-report.md`.
Nothing scratch-shaped inside either repository. Paste commands and output **verbatim**.

Append **one** pass entry to `.context/shared/last-sync.md`. **Flag anything you would have
restructured.**

## 7. Do not

- Do not push. Do not deploy.
- 🔴 **Do not change `league.slots`, any TV figure, or the Scottish club count** (§5).
- **Do not let UNKNOWN read as a pass anywhere** (§1).
- **Do not add a section.** The CHECKS report was just curated down from 109 lines to 71;
  **earn every line you add** (standing-notes §2).
- Do not work in `wunderkind-backend`.
