<!-- STATUS --> **STATUS:** 🟢 LIVE — brief for A30, issued 2026-11-21 by the PM session.

# A30 — Scotland's squad is priced at England's scale

**Read `agent-standing-notes.md` with this brief.** It carries the conventions this brief does not
restate. If it and this brief disagree, say so in your report rather than silently picking one.

**Repo:** `wunderkind-app` only. **Branch:** `new-game-save`.
**Both repos are ICM** — read `.context/CONTEXT.md` first and let it route you to the relevant
`.context/stages/*/output/` before grepping source. For this task that is almost certainly
`07_synthesis/output/economy-reference.md` (§E is the `src/economy/` constants table, module index
and contradiction register) and `03_data`/`04_interfaces` for the config payload's shape.

---

## 0. 🔴 READ THIS FIRST — THERE IS A LIVE CONCURRENT WRITER IN THIS REPO

**Session `Frontend context implementation review [e9c44b]` is working `wunderkind-app` right now.**
It committed `328a7287` at 18:35 and `b0d4c2fc` at 18:36 today, and it was still busy when this
brief was written. Its work is `.context`-shaped; yours is `src/economy/` — but **a suite reads the
whole tree regardless of who owns what**, and on 2026-11-20 two sessions writing this repo at once
cost one of them two full runs and the other one, through *imports* of files neither had been asked
to avoid.

**So, not negotiable:**

- **Verify in a detached worktree at a named commit.** Cut it at the commit you are building on,
  re-measure the baseline there yourself, and **name that commit beside every count you quote.** Do
  not reconcile against any figure in START-HERE, in `CLAUDE.md`'s branch table, or in this brief.
- **Ask for the machine before a full run, and announce when you are off it.** Message `e9c44b`
  directly. Two sessions each politely assuming the other was idle produced a 715s and a 609s run,
  both unattributable, against a 541s clean baseline. One message each way would have saved both.
- **Before trusting any timing, run `uptime`.** On 2026-11-20 eight orphaned busy-loops ran at ~80%
  CPU each for over three hours — load average 33–42 on 8 cores — across most of the day's
  measurement work, and nobody knew. A load average above your core count is a reason to stop
  measuring anything at all.
- **One writer per file, within this repo. Stage by explicit path. Never restore a path you did not
  author** — `git checkout <sha> -- <path>` in a shared checkout is an unrecoverable delete of
  someone's unsaved work. If you are ever told to revert a file you did not write, stop and say so.

⚠️ **START-HERE §3's repo table is stale** and I have corrected it in passing: it names app tip
`9bac0b18` with "nothing unpushed". The app is now at `b0d4c2fc`, **two commits ahead of
`origin/new-game-save`**, and the backend is at `d731db22`, not the `c11c7f2d` it names. Neither
`328a7287` nor `b0d4c2fc` is in the OTA 492 deploy. Treat §3 as a record of last night, not of now.

---

## 1. The task

**A Scottish save prices its squad on England's scale — roughly 10× — and this is the one thing
between the owner and economy tuning.** Fix it, and prove England is unchanged.

### What was measured on a device, on a clean single-version pack

A Scottish save on `Pack version: 14` — **single version, no `MIXED`**, so this is not the
stale-pack confound that invalidated three hours of earlier readings:

```
Squad pricing model:   LEGACY — FAIL
Player valuation:      9.27–10.69, ALL 8 OUTSIDE the band  (t1 mean 10.06, t3 mean 9.96)
Wage coverage:         1005.2% / 956.1% / 933.4% / 951.6%
```

An **English** save on the same pack version, same build, same hour: `TURNOVER`, **16 of 16 player
valuations IN BAND**, coverage 96.5–132.6%.

### The pattern, which is the strongest clue in the record

| written where | reads |
|---|---|
| **Staff** — re-anchored on device from club income (`npcStaffWagePence`) | `stored/npc-anchored 1.00` ✅ |
| **Scouts** — written at world build, never re-anchored | `stored/band 10.00` ❌ |
| **Players** — written at world build, never re-priced | `~10×` ❌ |

**Everything re-anchored on the device is correct. Everything written once at world-build time
carries the wrong country's scale.** One defect, three symptoms.

### What is NOT the cause — do not re-investigate these

- **The country scaling config is correct.** SC t1 resolves at `126,972,564` against EN t1
  `1,269,725,639` — exactly one tenth. The TV ladder is £2.5m / £1.2m / £583k / £417k, correctly
  scaled, and England's is byte-identical to before the change.
- **The pack is not stale.** Version 14, single. The `MIXED` warning is absent.
- **The ability derivation is fine.** `ability = clamp(1,100, round(0.7×experience + 0.3×mean(judgements)))`
  behaves as designed; a t8 scout lands near 22 and the band price matches.

---

## 2. Where to look — cited, and marked as leads rather than findings

⚠️ **Everything in this section is a LEAD. I verified that each file, line and signature exists; I
did not verify that any of it is the cause.** The previous PM session was wrong three times on this
class of problem in one night and the owner was right each time. **Believe the code over this
brief**, and if the measurement sends you somewhere else, go there and say so in your report.

### 2a. The two pricing sites, confirmed to exist

Both resolve an economy from a `GameConfig` and hand it to `packWages`:

- **Founder's squad** — `src/hooks/useInitFlow.ts:1046`:
  ```ts
  const starterEconomy = resolveEconomy(
    useGameConfigStore.getState().config,
    startingLeagueTier(useGameConfigStore.getState().config),
  );
  ```
  flows into `starterPricing` (`:1042`) → `worldPlayerToPlayer(wp, weekNumber, starterPricing)`
  (`:1050`, defined `:230`) → `resolveStarterWagePence` (`:314`) → `packPlayerWeeklyWagePence`
  (`:321`).

- **Every NPC** — `src/stores/worldStore.ts:465`:
  ```ts
  const packEconomy = resolveEconomy(config, leagueData.tier);
  ```
  one resolution per league, into `normalizeRawWorldPlayer(p, { economy: packEconomy, ... })`
  (`:503`). That `config` is `buildWorldLeagueClubs`' second parameter (`:446`), supplied at
  `:981` from `useGameConfigStore.getState().config` read at `:953`.

So **both sites read the same store, and the question is what is in it at that moment.** The
function itself is country-capable — `packPlayerWeeklyWagePence` (`src/economy/packWages.ts:113`)
documents its input as *"Resolved for the PAYING club's tier, via `resolveEconomy(config, tier)`"*.

### 2b. 🔴 The code already computes the answer and nobody has read it

This is the most useful thing I found and I think it is where you should start.

`resolveEconomy` (`src/economy/economyConfig.ts:154`) does not just return a model — **it returns
`fallbackReason`, one of five values, and the device panel prints only the model:**

```ts
const reason: EconomyFallbackReason =
  !baseline ? 'no-table'
  : baseline.wageModel !== 'turnover' ? 'model-legacy'
  : tier < 1 ? 'no-tier'
  : !row?.resolvable || row.wageScaleMicroPence <= 0 ? 'tier-unresolvable'
  : 'none';
```

The Scottish dump says `Squad pricing model: LEGACY — FAIL`, which means `reason !== 'none'` — **but
not which of the four.** They point at completely different defects:

- `no-table` / `model-legacy` → **the config in hand belongs to no country.** There is a purpose-built
  predicate for exactly this, `isCountryResolved(config)` at `economyConfig.ts:143`, whose docblock
  says *"`economyTierBaseline.country` is the backend's own marker: null means the block came from
  the const fallback and its economy figures belong to no country."*
- `tier-unresolvable` → the SC tier row arrived but is unresolvable or has a non-positive
  `wageScaleMicroPence`.
- `no-tier` → the paying tier resolved as 0.

**First measurement I would take: print `fallbackReason` (and `isCountryResolved`, and
`economyTierBaseline.country`) at both pricing sites, on a Scottish save and an English one.** That
is one line and it collapses the search space by four.

⚠️ **And be careful about a trap I nearly walked into myself.** A `LEGACY` reading *at diagnostic
read time* is not necessarily what was true *at world-build time* — they are different moments with
possibly different configs, and the whole defect is about something written once at build time.
**Establish which moment each number belongs to before reasoning from it.** If `LEGACY` is only a
read-time artefact, the ~10× could instead be a correctly-`TURNOVER` price taken from the wrong
country's tier row — and `tierRowFor` (`economyConfig.ts:120`) is `tiers[tier - 1]`, so a config
holding England's eight rows would hand SC tier 1 England's tier 1 row and return `TURNOVER`, not
`LEGACY`. **Those two stories predict different `fallbackReason` values. Measure which it is.**

### 2c. Two live violations in `CLAUDE.md` that touch this path

Both are recorded there as known and unfixed. Neither is obviously the cause; check them off rather
than assume them.

1. **`tierRowFor` reads the table by INDEX** — `tiers[tier - 1]` (`economyConfig.ts:125`), which the
   `perTierEconomy` module explicitly forbids (*"or Scotland's tier 4 reads England's tier 4
   band"*). Agrees with the correct lookup **only while the published array is dense, 1-based and
   ordered.** `resolveEconomy` has ~20 production callers, so this is the highest-risk of the four
   listed there.
2. **`startingLeagueTier` caps at England's depth** — `Math.min(8, count)` (`perTierEconomy.ts:129`).
   For a four-tier Scotland `min(8,4) = 4`, so this is probably inert here — **but
   `useInitFlow:1047` is one of its callers**, so confirm rather than reason about it.

### 2d. One more lead, from this project's own memory

The `GameConfig` sync path has a **fallback branch in `SyncService` that is easy to miss** — it is
recorded as the site people forget when adding a config field, because a field must be updated at
three backend serialization sites and two frontend files. If a Scottish save's config can be served
or stored through a no-country fallback branch while an English one is not, that would produce
exactly the observed asymmetry: England resolves, Scotland does not, and only values written before
the real block lands are wrong. **Unverified by me. Worth one look at the sync path's branches.**

---

## 3. 🔴 How to verify — this is the part the last session got wrong

**The country-scaling session verified that THE BAND scales 10.000 EN/SC. It does. Nobody verified
that STORED SQUAD WAGES scale. They do not.** "Measured correct" and "correct" differed by exactly
what nobody thought to measure.

So:

- **Verify the STORED figures, on both countries.** Not the function that computes them. A unit test
  over `packPlayerWeeklyWagePence` would have passed throughout this defect's entire life.
- **England must stay byte-identical. Prove it rather than asserting it.** It is the control and it
  currently passes: 16/16 valuations in band, coverage 96.5–132.6%, TV ladder unchanged, club
  solvent, over-committed `no`.
- **Add a CHECKS row** (`src/components/debug/ChecksTab.tsx` over `src/economy/economyDiagnostics.ts`).
  Standing instruction, owner, 2026-11-19: if your work depends on a figure only a device can
  confirm, or you find yourself writing *"the owner should check X"*, add X to the checks. A good
  row **states a relationship, not a value**, and **can fail**. The obvious candidate here is the
  one whose absence caused this: *stored squad wage vs the band that governs it, with the country
  and the `fallbackReason` beside it.* ⚠️ The CHECKS output is already too heavy — **earn the line**,
  one or two of them, not a new section.
- **Writing a CHECKS row is a cheap way to disprove an invariant you were about to encode.** It has
  already saved this project twice in one day. If you are about to write "obviously X must equal Y"
  about money, render it on the panel first and watch it fail.

---

## 4. Boundaries

- **Do not re-rule what anything should cost.** The owner's standing rule is **correctness before
  calibration**, and tuning is explicitly parked.
- **Facilities and upkeep are out of scope** (owner, 2026-11-20: *"No, leave facilities for now"*),
  with the known and accepted consequence that Scottish clubs read insolvent.
- ⚠️ **The CHECKS scout row is ALREADY BROKEN and it is not yours and not a regression.**
  `ec949536` re-priced NPC scouts on club income, so the panel's scout row now ratios them against
  the band, which is no longer their governing rate. `economyDiagnostics.ts` and `ChecksTab.tsx`
  were deliberately left alone as A29's territory. **Expect scout rows to read wrong, and do not
  treat that as a pricing regression** — if your own CHECKS row has to touch those files, say in
  your report that you are entering A29's territory and keep the edit to your own line.
- **Do not push and do not deploy.** The owner runs deploys.
- **Tiers are flexible** — binding rule, owner, 2026-11-20. No code may be written around a fixed
  number of tiers. Read a tier row by its own `tier` field, never by position. If your fix needs to
  touch `tierRowFor`, that is a candidate for doing it properly rather than working around it — but
  flag the blast radius (~20 callers) in your report before you widen scope that far, and do not
  widen it without saying so.

---

## 5. Reporting

- **Report file:** `wunderkind-docs/economy-loose-ends/a30-scotland-squad-pricing-report.md`
  (`docs/economy-loose-ends/` is a symlink to the same place; either path is fine).
  **Nothing scratch-shaped inside either repository.** Throwaway work goes in your own scratchpad.
- **Paste commands and their output verbatim, never summarised.** A report once said "tests
  extended", which is not "tests pass", and the gap was invisible until someone tried to verify it.
- **The division:** `.context` carries what is now true; the report carries what proves it.
- **`.context` status and review belong to the PM session (me).** You **may** append one pass entry
  to `.context/shared/last-sync.md` and correct stage text your own change makes wrong. You **may
  not** restructure a `.context` file, prune an earlier entry, or delete a superseded section even
  when it is visibly wrong — **flag it in your report, naming the file and what you believe is
  stale**, and I will fix it. ⚠️ `b0d4c2fc` ("`.context` stops being an append-only diary, and a
  test keeps it that way") just changed the rules here and added a guard — **read it before you
  touch `.context` at all.**
- 🔴 **Mark the epistemic status of everything you report upward.** "I verified X by running Y" and
  "I believe X because Z" look identical to a coordinator, who will act on both. This is the
  sharpest process lesson in the record: an attribution offered to a coordinator becomes an
  instruction, and one such inference nearly destroyed 309 insertions of a third session's
  uncommitted work.
- **Test baseline for this repo is ZERO failures on an idle machine.** Do not import the backend's
  "three to five" — that is PHPUnit's, and three sessions in one day applied it here; one came
  within a sentence of recording four real regressions as pre-existing. **Confirm the suite COUNT
  too** (`npx jest --listTests | wc -l` should equal it); a run that collects fewer files looks
  identical to a green one in the summary.
- **Eight suites assert wall clocks and the suite contends with itself**, so a wall-clock failure in
  a ~660-suite run is uninformative even on a quiet machine. **Capture failing TEST names, not just
  `FAIL` lines** — add `^  ● [A-Za-z]` to your filter and exclude `● Console`, or "re-run it alone"
  has nothing to re-run. Re-run any of these alone before attributing it to your change:
  `db/clientRecovery`, `screens/tournamentHubRender`, `db/health/runner`, `db/youthRepository`,
  `db/realisticSave`, `db/testHandleGuard`, `components/new-game-setup/randomClubProbe`.
- **Commands:** `nvm use` first (Node 20.19.6), `npm install --legacy-peer-deps`, `npm test`,
  `npx tsc --noEmit`. There is no lint script.

---

## 6. What done looks like

1. The cause is **named at file and line and demonstrated by a measurement**, not inferred from
   symptoms — and if that turns out not to be §2's hypothesis, the report says so plainly.
2. A Scottish save's **stored** player and scout wages sit in the Scottish band, measured as stored
   values rather than as the output of the pricing function.
3. **England is proven byte-identical**, by evidence rather than assertion.
4. A CHECKS row exists that would have caught this, states a relationship, and can fail.
5. `npm test` green with the count confirmed, `npx tsc --noEmit` clean, both measured in a detached
   worktree at a named commit with the commit quoted beside the figures.
6. The report file exists with verbatim evidence; `.context` stage text your change makes wrong is
   corrected; anything else stale is flagged for me rather than edited.
7. Nothing pushed, nothing deployed.

**If the brief and the code disagree, the code wins and your report says where.**
