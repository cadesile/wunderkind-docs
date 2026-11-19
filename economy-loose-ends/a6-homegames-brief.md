<!-- STATUS --> **STATUS:** ✅ A6 — `slots - 1` in both gates, `flows.ts`, FUND YOUR CLUB, PricingPane. Landed `3300fcd1`, DEPLOYED 2026-11-19.

---

# TASK — A6: stop wiring finances to club counts (starting with the gate)

**App only (`wunderkind-app`), branch `new-game-save`, on top of `b8842812`.** No backend work.
**Commit; do not push.**

## 🟥 0a. SCOPE — ENGLAND AND SCOTLAND ONLY (owner, 2026-11-19)

> *"don't worry about any leagues and countries other than England and Scotland."*

**This overrides every other country reference in this brief.** Do not run the gate for, measure, or
report on any country but **EN and SC**. Earlier guidance naming a "shallow comparison country", or
KR/FR as range extremes, is **withdrawn — Scotland is the comparison country.**

| | authored `slots` | true home games (`size − 1`) | what a wired `23` reads |
|---|---|---|---|
| EN | 16 | **15** | 53% high |
| SC | 14 | **13** | **77% high** |

**Scotland is the harsher case AND the country the owner tests on.** Give it equal weight to
England throughout — in §4's COVERAGE measurement (whose published table is England's; Scotland's
is unmeasured, so measure it and report it as new) and above all in §5's `SeasonBudgetService`
figure, which is the owner's decision input and reads **77% high** on Scottish NPC matchday income.

## 🔴 0. THE EXPORT SITUATION — READ THIS FIRST, IT IS NOT WHAT AN EARLIER DRAFT SAID

Backend `52c8b3bf` **has been deployed and migrated** (run `44516901111`, 2026-11-19, three
migrations executed). So the deployed box's authored `slots` should now read **EN 16** at all eight
tiers and **SC tiers 1–4 14**.

**But every world export on this machine predates that migration.** Verified 2026-11-19:

```
wunderkind-app/world.json                              EN t1-t8  slots=18
~/Downloads/wunderkind-world-2026-11-18 (1).json       EN t1-t8  slots=18
```

An earlier draft of this brief told you to **stop** if the export read 18. **That instruction is
withdrawn — do not follow it.** 18 is simply what a pre-migration export says, and no fresh export
exists yet. Stopping would be waiting on a file nobody has created.

**What to do instead:**

1. **The code change does not depend on the value.** The fix is "read the authored size and
   subtract one", which is right whether that size is 16, 18 or 20. Implement it and test it
   normally.
2. **For §4's measurement, patch the export.** `docs/economy-loose-ends/dials/patch.mjs` already
   exists for exactly this and `dials/runs/cand-c-authorable` is the R2-state baseline. Produce a
   copy with EN `slots = 16` and run the gate against it — that is what §4's table was computed
   from.
3. **Report BOTH readings**: the gate against the unpatched export (EN 18 → 17 home games) and
   against the patched one (EN 16 → 15). The unpatched number is not a result to be alarmed by; it
   is the measurement of what a stale export does, and it is worth having on record.
4. **State plainly in your report that the live box's `slots` is UNCONFIRMED from the app side.**
   The deploy log prints no UPDATE counts, so "the migration ran" is not the same as "EN is 16".
   The owner is taking a fresh export; A7 (backend) will confirm it server-side. **Do not claim the
   live value.** If a fresh export appears in `~/Downloads/` or the repo root while you are
   working, use it and say so.

## 🟩 0b. THE RULING THIS TASK SERVES — read before §2

The owner ruled, 2026-11-19:

> *"The number of clubs in a country league tiers is something that can change, as we alter the
> cache and tune the system ahead of go live, so there should be no wiring around the amount of
> clubs, the finances should be dynamic."*

**This task is the first piece of that rule, not a standalone off-by-one.** Read
`next-work-plan.md`'s **"RULING — no finance may be wired to a club count"** section before you
start; it carries the full violation inventory and the reasoning. The short form, because it
changes how you should judge every decision in this brief:

Everything that scales with a division's size must be **COUNTED** (from the actual fixture list,
`countHomeGames` — the pattern already used at `SeasonTransitionService.ts:1655`/`:2498`) or
**DERIVED** (`divisionSize − 1`, where fixtures do not exist yet). Never **WIRED** — not a literal,
not a count of whatever club rows happen to exist, not half the calendar.

⚠️ **The rule does NOT mean the size itself goes back to being derived from club rows.** That is the
defect A4 just fixed, and `LeagueSizeResolver`'s docblock argues the case correctly: a derived
divisor moves whenever somebody clicks Generate. The size stays **authored** (`league.slots`); what
must be dynamic is every finance that reads it. If you find yourself about to count club rows to
answer "how big is this division", you have the rule backwards.

## 1. Code state

`git fetch origin` with explicit refspecs; confirm `new-game-save` is at **`b8842812`** and **in
sync with origin** (both repos were pushed 2026-11-19). Working tree must be clean; if not, stop
and report. State branch, hash and date at the top of your report.

Both repos use ICM: read `.context/CONTEXT.md` and the relevant stage's `output/` first.

**Read before implementing:** `docs/economy-loose-ends/next-work-plan.md`'s **A6 section** — it
carries the full confirmation and the measured impact table; do not re-derive them. Also list
`docs/economy-loose-ends/` for any `*-correction.md` / `*-addition.md` newer than this brief, and
**again immediately before you commit**. Two briefs today were superseded after the agent had
started, and one committed before the correction arrived.

## 2. The defect

`scripts/economy/variantGate.ts:274`, and identically `dispersionGate.ts:146`:

```ts
const homeGames = clubCount > 0 ? clubCount : HOME_GAMES;
```

`clubCount` comes from `groundsByTier()`, which sets `clubCount: cs.length`
(`src/economy/harness/worldExport.ts:119`) — **it counts club rows in the export.**

**Ground truth:** `src/utils/fixtureGenerator.ts`'s `generateRoundRobin` is a **double**
round-robin (`secondLeg` mirrors every first-leg fixture at `round + numRounds`), so each club
plays **(division size − 1)** home games. The division also gains the player's club at their
starting tier — `fixtureStore.ts:102`/`:135` prepend it, and **only** for the amp league.

So the gate is **exactly right at tier 8** (where the generator reserves one place, so rows = size
− 1) and **one game too high at tiers 1–7**. Confirmed in **25 of 25 countries with zero
exceptions**: the deepest tier always holds exactly one fewer club row than the tier above.
⚠️ **That is why it hides** — `clubCount` is correct precisely where you would naturally check it.

## 3. The change

**Read the authored division size from the export and subtract one.**

- `WorldExportLeague` (`src/economy/harness/worldExport.ts:34-41`) **does not declare `slots`,
  although the backend export has emitted it all along** — verified present in
  `wunderkind-world-2026-11-18 (1).json`. Add it.
- Thread the authored size through to `homeGames` as **`size − 1`** in `variantGate.ts` and
  `dispersionGate.ts`.
- **Fallback, and state your choice in the report:** when `slots` is absent or 0 the league is
  deriving, and `rows − 1` is the honest answer at a non-deepest tier. ⚠️ **Do not re-add a `+1`
  for the deepest tier.** That assumption is false on any box whose generator did not reserve a
  place — measured on the development clone, CA, JP, NG, PL, US and SC hold the same count at
  every tier (see `52c8b3bf`'s message). Prefer leaving the current `clubCount` behaviour as the
  last resort over inventing a reservation.
- `HOME_GAMES = 23` stays as the final fallback. **Note in the report that 23 corresponds to a
  24-club division and matches nothing on either box.**

## 4. ⚠️ COVERAGE WILL MOVE, AND THAT IS THE POINT

This is a **measurement** change. Expect, from `dials/runs/cand-c-authorable` with EN at 16:

| tier | matchday share | COVERAGE now | expected after |
|---|---|---|---|
| 1 | 12.4% | 97.6% | **96.8%** |
| 2 | 27.9% | 97.5% | **95.8%** |
| 3 | 32.1% | 97.5% | **95.5%** |
| 4 | 42.3% | 97.6% | **95.0%** |
| 5 | 52.5% | 97.5% | **94.3%** |
| 6 | 68.1% | 97.6% | **93.4%** |
| 7 | 51.1% | 97.5% | **94.4%** |
| 8 | 72.8% | 97.6% | **97.6%** (unchanged — the gate was already right here) |

**Every tier stays well inside the 85–110% band, so nothing authored needs to change and you must
not change anything authored.** What this destroys is the **flatness**: R2 was derived as a
chain-maximal ladder to give uniform coverage and delivers a 0.1-point spread; corrected, it
becomes a ~4.2-point tilt sloping with matchday share.

**That tilt is the finding, not a regression.** Report it plainly. It is also the whole argument
for landing A6 before any future turnover re-derivation, which would otherwise be tuned against a
matchday line 6.25% too generous at seven of eight tiers.

If your measured numbers differ materially from the table, **say so and stop** — either the table
is wrong or the fix is, and guessing which costs more than asking.

## 5. 🔴 THE SECOND HALF — MEASURE IT, DO NOT CHANGE IT

`src/engine/SeasonBudgetService.ts:527` derives home games as `round(weeksPerSeason / 2)` = **23**
at the authored 46 weeks. That is correct only for a 24-club division; at 16 clubs it is **53%
high** (23 against 15). Unlike the gate, **this one feeds real money**: `npcWeeklyIncomePence` →
`deriveClubBudget`, which sets NPC squad wage spend. Its comment claims it derives from the season
"so a tier whose season is not 46 weeks still gets a coherent split" — but a season length cannot
tell you a division size.

⚠️ **DO NOT FIX IT.** Correcting it cuts the matchday component of every NPC club's income by
roughly a third, which lowers budgets and squad spend across the world. **That is an economic
change and it is the owner's.** Your job is to **measure and report**: what an NPC budget at a
representative tier is today, and what it would be at `size − 1`. A patch in your scratchpad to
take the measurement is fine; it must not reach the commit.

`src/engine/GameLoop.ts:1520`'s hardcoded `23` is the mild one — its own comment scopes it to
spreading seasonal money for the solvency *verdict*, *"no money moves through them"*. Mention it
for completeness; leave it.

## 5b. 🔴 THREE MORE WIRED SITES — two to fix, one to verify

Found while taking the ruling's inventory, after this brief was first written. §3's gate fix is no
longer the whole task.

**FIX — `src/components/new-game-setup/economy.ts:11`**, `ECONOMY_STAND_INS.homeGames: 23`.

This is the one that matters most on this list, because **it moves money the player commits**: it
is what FUND YOUR CLUB projects a season from, on the single screen where a real funding decision
is made. At a 16-club division the truth is 15 and it projects 23 — **53% high on gate income**,
before the player has spent anything.

The block's own docblock already records the destination — *"Stand-ins until starter-config
publishes them"* — and the two neighbouring fields (`ticketPricePence`, `seasonTicketHolderPercent`)
carry long comments about having been corrected for exactly this class of divergence, each pinned
against its real source in `economy.test.ts`. **Follow that established pattern**: derive from the
division size where the screen can resolve it, and pin the stand-in against its real source the way
its neighbours are. ⚠️ `contract.test.ts` holds this module to type-imports only — respect it; that
is why the neighbours are literals pinned by test rather than imports.

**FIX — `scripts/economy/flows.ts:68`**, `const HOME_GAMES = 23;`, passed through at `:104`. Same
treatment as the two gates in §3: take the authored size, subtract one. It is harness-only, so it
costs nothing to do in the same pass and leaving it means a third file still disagrees.

**VERIFY, then report — `src/components/finances/PricingPane.tsx:183`.** The pre-fixture fallback
reads:

```ts
const numClubs = (useLeagueStore.getState().league?.clubs?.length ?? 16) + 1;
return Math.floor((numClubs - 1) / 2);
```

At 16 that yields **8**, where a 17-club double round-robin gives **16**. If `league.clubs` excludes
the player's club — which `fixtureStore.ts:102` prepending `ampClubId` suggests — then the `+1` is
right and **the halving is a single-round-robin assumption left behind**, halving the season-ticket
price quoted before fixtures are drawn.

⚠️ **Establish which it is before you touch it.** Check what `league.clubs` actually holds and what
`generateRoundRobin` actually produces; do not reason from this brief, which is stating a
suspicion and not a confirmed defect. The live path (`countHomeGames(fixtures, club.id)` above it)
is correct — only the fallback is in question, and it only shows pre-fixtures. **If it is a real
defect, fix it and pin it with a test. If the `+1` or the halving turns out to be right for a
reason this brief has missed, say so plainly and leave it** — a wrong "fix" here mis-prices a real
purchase.

**LEAVE — `src/engine/GameLoop.ts:1520`** and **`SeasonBudgetService.ts:526`**, per §5. Both are
WIRED and both are named in the ruling's inventory, but correcting `SeasonBudgetService` moves real
NPC money and is the owner's call. **Your §5 measurement is what they will decide from, so it is
now the most load-bearing thing in your report** — give it the same care as the gate diff.

## 6. Verification

1. `npx tsc --noEmit` clean.
2. `npm test` green **with the suite COUNT confirmed** (`npx jest --listTests | wc -l` equals the
   suite count). Correct `CLAUDE.md`'s branch row AND
   `.context/stages/01_overview/output/environment.md`'s green-master bar if it moves — and trust
   your own measurement over the number written there; that row has gone stale seven times.
3. **The gate, before and after, pasted in full for EN and the comparison country.** It MUST move,
   per §4. A byte-identical gate means you have changed nothing that matters.
4. **A test pinning `homeGames = size − 1`** against an authored size, and one covering the
   absent/0 fallback. The off-by-one is the entire defect; it needs an assertion, not an eyeball.

## 7. Reporting, scratch files and `.context`

⚠️ **Nothing scratch-shaped inside either repository.** Your report is
`/Users/courtneyadesile/Documents/WunderkindFactory/docs/economy-loose-ends/a6-homegames-report.md`.
Throwaway work and any measurement patch go in your own scratchpad directory. Paste commands and
output **verbatim**, never summarised.

**`.context` status and review are owned by the project-manager session.** Append one pass entry to
`shared/last-sync.md` and correct stage text your change makes wrong — nothing else. Do not
restructure, prune, or delete a superseded section: **flag it in your report.**

## 8. Do not

- Do not push.
- **Do not touch `wageScaleMicroPence`, any authored economy figure, `economyTierBaseline`, or
  `league_ability_ranges`.** This is a measurement fix.
- **Do not change `SeasonBudgetService` or `GameLoop`.** Measure and report (§5) — those two are the owner's, however clearly they violate the ruling.
- Do not relax or edit any gate check or band.
- Do not work in `wunderkind-backend`.
- **Do not re-add a `+1` for the deepest tier** anywhere (§3).
