<!-- STATUS: 🔴 THE ENTRY POINT. Written 2026-11-20 end of day for a FRESH session. -->

# Handover — end of 2026-11-20

**You are picking up a long-running effort to fix the economy and simulation of Wunderkind
Factory.** This file supersedes `STATE-OF-PLAY-2026-11-20.md`, which describes the START of this
day. Read this first; read that one only for history.

**Both repos are ICM.** Read `wunderkind-app/.context/CONTEXT.md` and
`wunderkind-backend/.context/CONTEXT.md` before exploring either codebase.

---

## 🔴 1. The one correction that must survive this handover

**`incomeAnchoredWages` is ON.** Three documents said otherwise on 2026-11-20 and all were
wrong, including one written by the PM session.

```ts
// wunderkind-app/src/economy/economyConfig.ts:187
// the comment at the site says it outright: "Absent — today's state — derives."
incomeAnchoredWages: config.incomeAnchoredWages ?? (baseline?.wageModel === 'turnover'),
```

The key is **absent** from the live payload; the live baseline's `wageModel` is **`turnover`**;
so it resolves **TRUE at every tier**. Income anchoring is live on dev.

> ### The lesson, paid for THREE times in one day
>
> **Never read a config value off a repo's default. Resolve it through the resolver the game
> actually uses.** A default is a pre-sync fallback and says nothing about a synced box.
>
> | quantity | the default said | the live value was |
> |---|---|---|
> | `bondDecayFloor` | app: 20 | **50** (backend + live row) |
> | `wageMultiplierTiers` | committed defaults 0.5/1.0/2.5/5.0 | **a different admin table entirely** |
> | `incomeAnchoredWages` | "default false" | **true, derived** |

✅ **CLOSED 2026-11-20 — and the correction above still stands.** A26's scout-`ability` change
shipped in **OTA 488** on the claim that it was *latent* because anchoring was off. Anchoring is
**live**. But scout salaries **did not move by one pence**: all **5,278 of 5,278** dev scouts
have a stored `weekly_salary` exactly equal to `ScoutWageCalculator(experience)`, only 9 coincide
with an ability-based formula (rows where `ability` happens to equal `experience`), and neither
migration wrote to `weekly_salary`. Nine pricing sites traced by call graph; **all nine resolve on
`experience` and none on `ability`.** Evidence: `scout-wage-impact-report.md`.

⚠️ **Read the reason, not just the verdict.** "Latent" was correct **by accident** — it was
justified on anchoring being off, and anchoring was on. The change was inert because `ability`
is not wired to a price **yet**. `ScoutAbilityCalculator`'s own docblock says A24 is what wires
it. So this closes as a fact about today, not as a reason to relax when A24 lands.

---

## 2. What is live on dev right now

| | app | backend |
|---|---|---|
| `dev` head | **`36087794`** (splash `<run> 3608779`) | **`dc9c0ae3`** |

Shipped today: the league sponsor pot divided by club count; `league.slots` retired and every
division size derived (Scotland 14 → 12 at every tier, England unmoved); scouts carrying a
derived `ability`; the staff renewal gate judging on the wage delta; the manager's opinion
decoupled from scout noise and widened to spread 40; bond bias 12; bond decay floor 20.

---

## 3. 🔴 EVERYTHING IS DEPLOYED TO DEV — AND B1 HAS A REVIEWED DEFECT

> ### 🔴 Read before trusting the DOF pot — added late 2026-11-20
>
> **B1's arithmetic is right; the pot it charges is not durable.** `clubStore.transferBudget` is a
> live percentage of the balance, recomputed by **five** paths with no term for what has been
> spent — one of them the Chairman's four-weekly rebalance, which is **ON by default** and is
> *triggered by the draw-down itself*. So a wage commitment charged for up to 46 weeks is
> **refunded within about four weeks**, silently (`spendTransferBudget` floors at zero). The
> owner's third limb is implemented but **not delivered in play**.
>
> **Also: part C gated staff and not players.** The charge is symmetric, the gate is not —
> `SignPlayerPanel`, `DofProposalService`, `DofProposalCard` test up-front cash only while being
> charged up-front **plus** `wage × weeksRemaining`; `SignYouthPanel` does not consult the pot at
> all. A £5,000/wk signing 40 weeks out has £200,000 ungated.
>
> Full review and specification: **`b1-pm-review.md`** (§2, §3, §5, and §10 for what the owner is
> accepting). Verified independently by the PM against `clubStore.ts:530-551`, `GameLoop.ts:5850`
> and `clubStore.ts:504`. Fix briefed as **"Finish B1 — pot as a ledger + player gates"**.
>
> ⚠️ **A27 reviewed separately: accept with caveats** — `a27-pm-review.md`.

Final deploy of 2026-11-20. App `dev` **`36087794`**, backend `dev` **`dc9c0ae3`**.

| what | app | backend |
|---|---|---|
| B1 — the owner's budget model (parts B and C) | `7609125e` | — |
| A27 — the scout age gate | `6fb687a0` (docs only) | `3e1555c5` |

🔴 **NONE OF IT IS VERIFIED ON DEVICE.** Both landed green in CI and neither has been seen
running. **This is the first thing to do:** see section 9.

## 4. ✅ A27 — committed after this handover was first written

| repo | branch | commit |
|---|---|---|
| backend | `development` | **`3e1555c5`** |
| app | `new-game-save` | **`6fb687a0`** |
| docs | — | `3d75287` |

`ScoutGenerationService::build()` now writes `youth` and `senior` (rolled from the existing
`scoutJudgementMin/Max` — A27's own ruling, reasoned in §3 of its report).
`Version20261120120000` added both keys to all 5,278 dev scouts **and re-derived `ability`**,
since the judgement mean is taken over keys present and 5 → 7 moves it.

**The app needed no functional change** — `ScoutJudgements` already declared seven keys and
`ageGateFor` already read them, so it began working the moment the data existed. The app commit
is comments, a docblock and documentation only; verified by diffing out every comment line and
finding nothing left.

⚠️ **Not verified on device.** Report: `a27-scout-age-gate-report.md`.

## 5. Baselines — take these fresh, they moved repeatedly today

| | figure | at |
|---|---|---|
| app `npm test` | **651 suites / 10,865 tests** | `6fb687a0` |
| backend `phpunit` | **3,265** | `3e1555c5` |

Backend has **three known pre-existing failures** — `NotificationLogCrudControllerTest`,
`CompetitionControllerTest`, `FriendlyResolveSingleMatchTest`. Proven pre-existing by
stash-and-rerun. **Anything else is yours.**

- Backend: `lando php vendor/bin/phpunit --filter '/^(?!.*AdminShellCoverage).*$/'` — a full run
  OOMs at ~183/3305.
- App: `nvm use` first; confirm the COUNT with `npx jest --listTests | wc -l`, and read
  `CLAUDE.md`'s `new-game-save` row rather than trusting a number in any brief.

---

## 6. 🔴 Operational traps — each cost real time today

1. **`wunderkind_test` is NOT migration-tracked.** `doctrine:migrations:migrate --env=test`
   fails with *"relation admin already exists"*. **Apply every schema change to it by hand
   BEFORE running the suite.** A half-migrated test DB produced a `LeaderboardHallOfFameTest`
   error that looked unrelated and vanished when the schema was fixed — **its failures do not
   point at their cause.** Four instances today. SQL in `deploy-run-2026-11-20.md`.
2. **PHPUnit colourises each FIELD of its summary line**, so `Tests: [0-9]+, Assertions` never
   matches — there are escapes between the number and the comma. Pass **`--colors=never`** when
   machine-reading. A wait loop built on such a grep span forever and held a session open.
3. **When a session will not archive but reports idle, both can be honest.** Check
   `ps aux | grep "[s]leep"`.
4. **Two sessions in one checkout: stage by EXPLICIT PATH.** Never `git add -A`. Check
   `git status` before and `git show --stat HEAD` after. `.context/shared/last-sync.md` is the
   file both will want.

---

## 7. Owner rulings made today — do not re-litigate

| ruling | where |
|---|---|
| League sponsor pot divides by club count | shipped |
| Retire `league.slots`; every division size derives | shipped |
| **Existing** staff/players/maintenance committed from income; **new** hires from the DOF pot, charged their remaining season weeks, then rolling into Step 1 | `part-b-resolved-budget-model.md`, built as B1 |
| "Staff bands" = the **wage multiplier** bands, not ability bands | `a24-staff-wage-bands.md` |
| Scout `ability` = `0.7 × experience + 0.3 × judgementMean`, mean over **keys present** | shipped |
| Admin `ability` is read-only | shipped |
| Scouting accuracy **should** vary by player age | A27 |
| The manager's weekly drift **is the model**; "clarity comes from facilities and abilities" | shipped |
| Bond bias **symmetric**, 5 → 12 | shipped |
| Bonds **fade** — decay floor 50 → 20 | shipped |
| The bottom-tier high read is **fine**, accepted | shipped |

---

## 8. Open work, in dependency order

| | state |
|---|---|
| **A24** — staff + scout wages priced from the band | 📋 **RULED THREE TIMES; part-B blocker VERIFIED GONE in code** (`anchorAmpStaffWages` retired + guard test). Briefing is held for ONE thing only: the band-ceiling answer (`wageMultiplierTiers` stop at `maxAbility` 60, `coach_ability_max` is 75). 🟢 Settled late 2026-11-20: scouts price off the **existing `scout.ability`** A26 built, not `experience`; `weeklySalary` **becomes a derivation** (admin help must stop promising an override); the three wage cliffs are to be **measured via A29 first**, not fixed here. The scout `ability` distribution is already measured in `scout-wage-impact-report.md` — use it, do not recompute. |
| **A29** — a CHECKS panel sampling real players: ability → wage → band | 📋 briefed, ready. Stops the owner photographing screens |
| **A19** — re-scope | now only a wording check against A23's rename |
| **A25** — staff ability bands are two flat globals | 🟢 **RULED 2026-11-20** — its own authored per-country/per-tier table, replacing both the flat globals and the `StarterPackService` borrow-the-player-band workaround; staff ability defined against player **current ability**, settled in the same change. Work still parked behind A24. See `a25-staff-ability-bands.md` |

---

## 9. ❓ Needs the OWNER, not an agent

1. ✅ **Did OTA 488 move scout salaries?** — **ANSWERED: no, zero pence** (§1). No longer needs
   the owner. ⚠️ **Two findings it turned up that DO need you:** the live `scout_experience_min/max`
   is **4–34** against a field documented as a 0–100 score, which makes the entire live scout wage
   band **£26.80–£40.30** — £13.50 wide across every scout in the game, i.e. a scout's wage is
   effectively flat regardless of quality (an admin edit, not code — same class as item 4 below).
   And the live `wageMultiplierTiers` top out at `maxAbility` **60** while `coach_ability_max` is
   **75**, so a coach can be generated above the top of the band table A24 will price from.
2. **Does unspent remainder return to the DOF pot** when a contract ends or a player is sold
   mid-season? B1 raised it; never asked.
3. **The excursion role filter** — the manager joins every staff excursion and builds bonds,
   filed as `staff_type: 'coach'`, because `bondStaff` has no role filter.
4. **The pool experience window** — `scoutExperienceMin/Max` is 4–34, authored like career
   years against a field that is a 0–100 score everywhere. The fix is an admin edit, not code.
5. **A fresh world export from the rebuilt dev box.** Blocks two measurements: Scotland's
   643–1188% gate coverage (measured against an 8-tier export while config holds 4 tiers, so
   the number is not trustworthy) and the residual ~172% at SC t4.

---

## 10. Where things are

| | |
|---|---|
| **This file** | the entry point |
| `b1-budget-model-report.md` | the budget model as built, + the `incomeAnchoredWages` finding |
| `b1-FINDING-incomeAnchoredWages-is-ON.md` | the correction, standalone |
| `deploy-run-2026-11-20.md` | both deploys, the gate evidence, the operational traps, the test-DB SQL |
| `a23-pm-review.md` | how A23 was reviewed — the model for reviewing A27 and B1 |
| `scotland-experiment-2026-11-19.md` | the longest findings record |
| `next-work-plan.md` | the older live queue; its POST-SETTLE section indexes parked work |
| `agent-standing-notes.md` | conventions every brief references |
| `deploy-run-2026-11-20/` | gate runs, and `game-config-sc.LIVE.json` — the Scotland config that was "impossible" to get and is one `curl` |

**Deploys:** both repos ship from branch `dev`; a push publishes a real OTA. App work is on
`new-game-save` (a live exception), backend on `development`.

**Standing owner constraints:** correctness before calibration — *"I'm not going to tune
anything until we know the economy implementation is working as expected."* Scratch docs stay
OUTSIDE both code repos. England and Scotland only. No wiring around club counts.
