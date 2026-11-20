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

🔴 **Still to act on:** A26's scout-`ability` change shipped in **OTA 488** on the claim that it
was *latent* because anchoring was off. It is **live**. **Nobody has checked what it did to
scout salaries on the owner's save.** That is the first thing to verify on device.

---

## 2. What is live on dev right now

| | app | backend |
|---|---|---|
| `dev` head | **`1ff6fd56`** (OTA **489**, splash `489 1ff6fd5`) | **`c7c32027`** |

Shipped today: the league sponsor pot divided by club count; `league.slots` retired and every
division size derived (Scotland 14 → 12 at every tier, England unmoved); scouts carrying a
derived `ability`; the staff renewal gate judging on the wage delta; the manager's opinion
decoupled from scout noise and widened to spread 40; bond bias 12; bond decay floor 20.

---

## 3. Committed but NOT deployed

| repo | branch | commit | what |
|---|---|---|---|
| app | `new-game-save` | **`7609125e`** | **B1 — the owner's budget model** (parts B and C) |
| backend | `development` | — | *(A27 pending, see §4)* |

**B1 is the big one and it is unverified on device.** 651 suites / 10,865 tests, tsc clean,
economy gate unmoved. Report: `b1-budget-model-report.md`.

---

## 4. ⚠️ IN FLIGHT at handover — A27

**A27 (scout age gate) was still running its backend suite when this was written.** Check
whether it committed. Its working-tree files were:

- backend: `ScoutGenerationService.php`, `WorldInitializationService.php`,
  `ScoutGenerationServiceTest.php`, `migrations/Version20261120120000.php`, 3 `.context` files
- app: `scoutNoise.ts`, `scoutNoise.test.ts`, `types/market.ts`, `types/world.ts`, 2 `.context`

**If it did not commit, its work is in the working tree and must be reviewed before anything
else touches those files.** Report: `a27-scout-age-gate-report.md`.

---

## 5. Baselines — take these fresh, they moved repeatedly today

| | figure | at |
|---|---|---|
| app `npm test` | **651 suites / 10,865 tests** | `7609125e` |
| backend `phpunit` | **3,264** | `c05d54a7` |

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
| **A24** — staff + scout wages priced from the band | 📋 ruled, briefed, **blocked behind B1 reaching dev**. ⚠️ Must decide whether `weeklySalary` stops being an override and becomes a derivation — see the brief's carried-forward section |
| **A29** — a CHECKS panel sampling real players: ability → wage → band | 📋 briefed, ready. Stops the owner photographing screens |
| **A19** — re-scope | now only a wording check against A23's rename |
| **A25** — staff ability bands are two flat globals | 🟡 **unruled** |

---

## 9. ❓ Needs the OWNER, not an agent

1. 🔴 **Did OTA 488 move scout salaries?** (§1) — the open consequence of a wrong premise.
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
