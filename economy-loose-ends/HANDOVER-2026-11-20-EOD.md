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

## 8. Work state at end of 2026-11-20 — ALL COMMITTED LOCALLY, NOTHING PUSHED

⚠️ **Deploy is HELD by the owner, deliberately.** Device testing is gated on the country-scaling
work in §8b landing, so that one build covers both countries and a tester is not reading four
mechanisms through one screen. **Last deployed: OTA 491 / backend 285 (`db8b56d6`, `f0a1d8f6`),
which is four app commits and one backend commit behind.**

| | state |
|---|---|
| **B1 — the DOF pot** | 🟢 **DONE.** Ledger `598ff158`; refund-on-departure `9bac0b18` (31 paths). The pot carries wage commitments across all five re-derivation paths, four player gates price the whole draw, and departures release what the club no longer owes through five store choke points plus a new academy choke point (`src/engine/ampYouthRelease.ts`, with a caller registry and a `GameLoop.ts` call-count pin). Confirmation run on the committed tree **fully green: 659 suites / 11,057 passed, zero failures.** `dof-pot-refund-report.md` |
| **A24 — staff + scout wages from the band** | 🟢 **DONE.** `9f46bf66` (band pricing), `4113d326` (player renewal pays the wage delta), `ac71159b` (scout anchor reads `ability`, not `experience`), `7b56c6c8` (CHECKS row compares against the rate that wrote the row). Backend `6c5e4ad5`. ⚠️ Two of these were defects found only because a second country was tested — England's panel read 1.00 and was a **false pass**. `a24c-npc-rate-finding.md` |
| **A25 — staff ability bands** | 🟢 **DONE**, backend `a818a60b` (25 paths, includes migration `Version20261120150000.php`). Authored per-country/per-tier table on the player current-ability scale. ⚠️ **Does NOT fix the Scottish new-game screen and on live numbers makes it ~10% worse** — the cause is the rung-4 authoring in §8b #5, not the ability band. A25 measured and reported that itself. Needs a pack rebuilt at `WORLD_PACK_VERSION` 14 and no app change. `a25-ability-bands-report.md` |
| **A29 — the CHECKS panel** | 🟢 **DONE**, `b8ee4594` + `930fcde7`. It is what made the whole day's measurement possible, and it earned itself twice over: writing a CHECKS row disproved two invariants somebody was about to encode, and the panel's own staff row is what exposed the ×10. |
| **Scotland re-measurement** | 🟢 **DONE**, read-only. `scotland-gate-remeasure.md` §1–§24. The carried 643–1188% was an artefact of the gate taking TV from the `ENGLAND_DEV` fixture; real coverage is 146.5 / 225.4 / 377.2 / 424.0%. It also **broke the PM's own 99.93% reconciliation** when asked to try — see §8b. |
| **Country scaling** | 🔵 **IN FLIGHT** — see §8b. The owner has ruled that everything scales by country. This is what the deploy is waiting for. |
| **A19** | 📋 Still only a wording check against A23's rename. Fold into whatever next touches that area. |

**Unowned follow-ups, none started, all flagged rather than fixed:**

- **Eight suites assert wall clocks and a 659-suite run contends with itself** — proven by the same
  commit producing a failure and a clean run. The durable fix is for those suites to stop asserting
  wall clocks. See `agent-standing-notes.md`.
- **The fee's partial elasticity** — a fee is still partly refunded by a re-derivation. Needs a
  frozen per-period opening allocation; B1's carried ledger is the scaffolding that makes it small.
- **`GameLoop:5641`-class asymmetries** — resolved for player renewals in `4113d326`; check nothing
  similar survives elsewhere.
- **`wunderkind_test` holds 98 leaked `league` rows**, giving `LeaderboardHallOfFameTest` a ~14%
  chance per run of a spurious error that misattributes itself. Cleanup proposed in A25's §8.3 and
  deliberately NOT performed — destructive against a shared database, and the real fix belongs in
  `LeagueServiceConcludeSeasonIdempotencyTest`.
- **CHECKS "COPY EVERYTHING" overflows the device clipboard** — see the note above §9.

---|---|
| **A24** — staff + scout wages priced from the band | 📋 **RULED THREE TIMES; part-B blocker VERIFIED GONE in code** (`anchorAmpStaffWages` retired + guard test). Briefing is held for ONE thing only: the band-ceiling answer (`wageMultiplierTiers` stop at `maxAbility` 60, `coach_ability_max` is 75). 🟢 Settled late 2026-11-20: scouts price off the **existing `scout.ability`** A26 built, not `experience`; `weeklySalary` **becomes a derivation** (admin help must stop promising an override); the three wage cliffs are to be **measured via A29 first**, not fixed here. The scout `ability` distribution is already measured in `scout-wage-impact-report.md` — use it, do not recompute. |
| **A29** — a CHECKS panel sampling real players: ability → wage → band | 📋 briefed, ready. Stops the owner photographing screens |
| **A19** — re-scope | now only a wording check against A23's rename |
| **A25** — staff ability bands are two flat globals | 🟢 **RULED 2026-11-20** — its own authored per-country/per-tier table, replacing both the flat globals and the `StarterPackService` borrow-the-player-band workaround; staff ability defined against player **current ability**, settled in the same change. Work still parked behind A24. See `a25-staff-ability-bands.md` |

---

⚠️ **CHECKS "COPY EVERYTHING" now overflows the device clipboard — found 2026-11-20 on a real
paste.** Both device dumps taken that day truncated mid-section: the England one inside WRITE COST's
`under 1000ms` list, the Scotland one inside a SQLite query plan. **`checksReport.ts`'s own docblock
states the opposite guarantee** — *"the clipboard is the one thing that must stay complete"*, and
`checksReportCopy.test.ts` enforces that `full ?? detail` reaches the clipboard — so the contract is
written, tested, and false in practice, because no test measures the TOTAL size against what a
device paste can carry.

**Not urgent and there is a working path:** every section is independently copyable, so the five
that matter for economy work (ECONOMY, WAGE COVERAGE, PLAYER VALUATION, STAFF & SCOUT VALUATION,
WORLD PACK) paste cleanly on their own. **Do not "fix" it by abbreviating section text** — that is
exactly the §2b guarantee the docblock protects, and shrinking `full` would make every future dump
quietly less useful. The cheap fixes are to leave the bulky diagnostic sections (WRITE COST's
per-label lists, the boot timeline, the DATABASE query plans) out of copy-all while keeping them
copyable individually, or to write the full report to a file and share that instead of the
clipboard. Whoever next has `ChecksTab.tsx` should take it; it does not need a session of its own.

---

## 8b. 🟢 RULED 2026-11-20 — EVERYTHING SCALES BY COUNTRY

**Owner's ruling, verbatim:** *"To be clear, everything should scale. TV, prize, position and
parachute. Same with salaries, transfer fees etc."* Scotland is 1/10 of England's economy and that
applies to **every money quantity**, not only the ones already country-scaled.

**What this settles, against the five mechanisms below:** #2 (TV / prize / position / parachute
pools, country-blind) is ruled — they scale. #5 (Scotland authored at rung 4 of an eight-tier
ladder) is the authoring half and is ruled by implication — a country's own bottom division must be
its own bottom rung. #1 already complies. #3 and #4 are code defects in the same direction and are
now unambiguously defects rather than open questions.

🟡 **FACILITIES AND UPKEEP: RULED OUT OF SCOPE FOR NOW** (owner, 2026-11-20: *"No, leave facilities
for now"*). Income scales; the cost base does not, yet. **This is a deliberate sequencing decision
and its consequence is known and accepted:** the Scotland session measured (§16–§17) that at income
÷10 with upkeep unscaled, **the gate FAILS and all four Scottish tiers read insolvent.** So expect
Scottish solvency to look WORSE immediately after the income scaling lands, not better. That is the
expected result, not a regression, and **nobody should "fix" it by backing the scaling out or by
quietly scaling upkeep too.** It is the next decision in this area, and it is the owner's.

**Why this sequencing is right rather than merely accepted:** applying a country factor that already
exists to quantities that should always have passed through it is CORRECTNESS. Deciding what a
Scottish club's ground should cost to run is CALIBRATION, and the owner's standing rule is
correctness first. Scaling income makes the remaining gap visible and measurable; scaling both at
once would hide which half was wrong.

~~Superseded~~ — the original open question, kept for the record:
⚠️ **ONE THING THE RULING DOES NOT NAME, AND IT DECIDES SOLVENCY: facility upkeep and ground costs.**
The owner's list is income (TV, prize, position, parachute) plus salaries and transfer fees. The
Scotland session measured (§16–§17) that **at income ÷10 with upkeep unscaled, the gate FAILS and
all four Scottish tiers are insolvent.** So scaling income alone makes Scotland strictly worse.
**Do not infer the answer** — "everything" probably covers it, but a club's cost base is a different
decision from its income and the consequence of guessing wrong is a world that cannot be played.

⚠️ **The machinery already exists.** `countryFactorBp` lives in the backend
(`Service/Economy/EconomyScale.php`, `Entity/GameConfig.php`) and is deliberately NOT published to
the app — `api/endpoints/gameConfig.ts` has a test forbidding it, because publishing one *"invites
the app to re-derive"*. So this is very likely applying an existing factor at resolution time rather
than re-authoring 25 countries × 8 tiers by hand. ⚠️ **The admin TIER DEFAULTS screen shows the
pools are authored ONCE and applied to all ticked leagues ("25 match" / "24 match")** — £300m at T1,
£140m at T2, down to £1.2m at T8 — which is exactly why they are country-blind today. Whoever takes
this must establish which layer the factor belongs in before writing anything.

---

## 8b. 🔴 THE 1/10 SCOTLAND PROBLEM — DEVICE TESTING IS GATED ON THIS

Owner, 2026-11-20: *"Scotland should be 1/10 of England's economy (TV deal, prize money etc)"*, and
*"no need to deploy until we can resolve this 1/10 issue — that is a trigger point for major
testing."* **FIVE separate mechanisms are in play and only one of them is correct.** They were found
independently and none subsumes the others, so fixing one will not close this.

1. ✅ **The wage band is correct.** Exactly linear in `wageScaleMicroPence`; EN/SC = 10.000 at every
   ability and tier. Measured by A24 on the live SC payload (`a24c-npc-rate-finding.md`).
2. 🔴 **The TV / prize pool is country-blind.** The POOLS are identical — EN t1 £18.8m × 16 clubs =
   £300.8m against SC t1 £25.0m × 12 = £300.0m, and the same at every tier. Scotland's higher
   *per-club* figure is only the smaller divisor (16/12 = 1.33), which is CORRECT behaviour — the
   owner spotted that, and an earlier framing of "Scotland's TV is authored above England's" was
   wrong. 🔴 **WITHDRAWN — my "÷10 gives 99.93%" is NOT evidence for the 1/10, and nobody should rule on
   it.** The Scotland session was asked to try to break it and did, in one line: **the ÷10 and
   `countryFactorBp('SC') = 1000` are the same factor, and cancel.** The identical statement is
   `1,919,603,100 ÷ 2,070,000,000 = 92.73%` — England's rung 4. *A figure invariant under the
   quantity being proposed cannot be evidence for its value.* 100% was never the target either:
   England's own t4 measures 89.7% / 118.7%. **The pool identity above IS measured and stands; the
   reconciliation that made it look proven does not.**
3. 🔴 **`npcStaffWagePence` is scale-invariant by construction** — EN/SC = 1.000 at every ability and
   tier, so NPC staff pay does not know what country it is in. A24 measured this; it is also why the
   staff ratios moved 0.42–0.67 → 3.65–4.75 between the two device dumps, which is the ×10 and not a
   constant discount. **Regenerating the world pack does NOT fix this** — a fresh pack is re-snapped
   to the same income share within one bootstrap.
4. 🔴 **Scout salaries are a STALE WRITE, not country-blindness.** A scout's salary is written once
   at world build and never re-anchored — `club.scouts` has no re-anchoring path — so a save can
   carry a figure at ten times the scale the device now resolves. Regeneration fixes this as a
   **reset, not a repair**: the gap silently reopens on the next re-sync. The real fix is
   re-anchoring, which is pricing and unruled.
5. 🔴 **Scotland's four tiers are authored as tiers 1–4 of an EIGHT-tier ladder** (A25, `§12` of
   `a25-ability-bands-report.md`). So Scotland's bottom division is authored as a mid-table English
   **The MECHANISM is confirmed by two sessions independently. The MAGNITUDE is disputed and must
   not be quoted until settled.** A25 reported `TierBandScaleResolver::scaleFor` at 64.7% for SC t4
   against 6.9% for EN t8, a 44× gap. The Scotland session reproduced EN t8 **exactly** (6.9% =
   4.5÷65) but measured **SC t4 at 38.5% (25÷65), a 5.56× gap**, and noted 64.7% is exactly `55/85`
   — the **const fallback** branch, which fires only for a country with NO authored band, while
   Scotland has one (`leagueAbilityRanges.SC.4 = 15–35`). It also observed A25's own pair divides to
   9.35×, not 44×. The two numbers come from different precedence branches of the same function.
   ⚠️ **Scotland's bottom division IS England's rung 4 in every quantity** — turnover 9.63×, TV pool
   41.67×, per club 55.56×, position pot 15.0×, parachute 120.77×, band 15–35 against 2–7. That part
   is not disputed. It is an AUTHORING question, not code.

6. 🔴 **FACILITY UPKEEP IS UNSCALED, and it decides solvency.** Scotland session §16–§17: **at
   income ÷10 the gate FAILS and all four Scottish tiers are insolvent**, because upkeep does not
   shrink with the economy. Granting the 1/10 on income ALONE makes Scotland worse, not better.
   Rule on this together with #2, never after it.

⚠️ **#2 AND #5 ARE NOT INDEPENDENT, which is why the arithmetic looked so clean.** The unscaled pool
pushes Scottish coverage UP; the rung-4 authoring pulls it DOWN; at tier 4, for a founding club
whose matchday is 0.8% of income, they cross at almost exactly 1.00. The 1.58× residual decomposes
into two unrelated ratios — 1.3333 (pool ÷12 vs ÷16) × 1.6667 (taper 0.5 at 6th-of-12 vs 0.3 at
8th-of-16). **The DIRECTION of both findings is solid; the PRECISION is not.** Fixing either alone
moves the numbers in a way that will look wrong unless the other is understood.

⚠️ **#5 cannot move the coverage tables at all** — `scaleFor` is a staff-wage scalar the gate never
reads (`loadExport.ts`'s own header: the turnover average reads no ability band). It lands in the
SOLVENCY column beside #6: a Scottish bottom-division club paying mid-table-English staff AND
England-scale ground upkeep out of income cut to a tenth. **That is where #5 and #6 meet**, and it
is the real shape of the Scottish problem.

⚠️ **A25 does not fix the Scottish new-game screen and on live numbers makes it ~10% worse** — EN
tiers 2–8 fall 18–77% (t8: 8.528 → 2.000) while every SC tier RISES, t4 by +10.1%. A25 measured and
reported this itself rather than letting it ship looking fixed. The cause is #5, not the ability
band.

**What this means for sequencing:** #2 and #5 are owner rulings about authoring. #3 and #4 are code
and are unruled. Nothing should be tuned until the owner decides, and **a device test before then
reads four mechanisms through one screen**, which is what made the Scottish save so confusing.

---

## 9. ❓ Needs the OWNER, not an agent

1. ✅ **Did OTA 488 move scout salaries?** — **ANSWERED: no, zero pence** (§1). No longer needs
   the owner. ⚠️ **Two findings it turned up that DO need you:** the live `scout_experience_min/max`
   is **4–34** against a field documented as a 0–100 score, which makes the entire live scout wage
   band **£26.80–£40.30** — £13.50 wide across every scout in the game, i.e. a scout's wage is
   effectively flat regardless of quality (an admin edit, not code — same class as item 4 below).
   And the live `wageMultiplierTiers` top out at `maxAbility` **60** while `coach_ability_max` is
   **75**, so a coach can be generated above the top of the band table A24 will price from.
2. 🟢 **RULED 2026-11-20 — YES, unspent remainder returns to the DOF pot** on a mid-season
   sale or a contract ending. Owner: *"yes, absolutely."* B1 deliberately built the carried
   ledger so either answer was a small change, and this is the small change: the wage
   commitment for the weeks no longer owed comes off `dofWageCommitmentPence`.
   ⚠️ **The trap is the stale-period guard**, not the arithmetic. `carriedDofWageCommitmentPence`
   returns 0 once `dofWageCommitmentPeriodWeek` no longer matches `club.seasonBudget.createdWeek`,
   so a refund written against a rolled period must not resurrect a dead ledger, and a refund
   must never take the total below zero. **NOT YET BUILT** — no session has this.
3. 🟢 **RULED 2026-11-20 — working as intended, no change.** Owner: for excursions, *"staff
   means manager, DOF, coaches, scouts etc."* The manager joining a staff excursion and building
   bonds is correct behaviour and `bondStaff` needs no role filter.
   ⚠️ **One thing the ruling does not cover:** the manager is *filed* as `staff_type: 'coach'`.
   Participation is now settled; whether a manager's bond row should carry a coach's type is a
   separate data question and is still open. It is cosmetic unless something reads `staff_type`
   to decide behaviour — unmeasured.
4. 🟢 **RULED 2026-11-20 — leave it. `scoutExperienceMin/Max` stays 4–34.** Owner: *"this
   shouldn't change?"* — and they are right, for a reason that only became true today.
   A24 moved scout **wages** onto `scout.ability`, so the experience window no longer prices
   anything. What it still drives is **scouting gameplay**: `ScoutingService.ts:285`
   (`calcScoutReportCooldown`), `:302` and `:423` (`scoutLevelIncrement(tierFromScore(...))`),
   `NpcScoutingService.ts:107`, `StaffConsensus.ts:429`. Re-authoring the window to 0–100 would
   silently re-tier every scout's report cadence and progress rate — which is **calibration**,
   and would be a behaviour change dressed as a data fix. The field being authored like career
   years against a 0–100 score is now a naming/documentation defect, not an economic one.
5. ✅ **DONE 2026-11-20 — the export landed**, and it resolves the measurement block.
   `evidence/world-export-2026-11-20.json` (version 1, exported 16:33, 196 leagues, 3,127 clubs).
   **Scotland is now 4 tiers, matching config** — 4 leagues, 12/12/12/11 clubs — against the
   8-tier export the 643–1188% figure was measured on. So that number was measured against a
   world that no longer exists and must be re-measured, not carried forward. England is 8 tiers,
   16 clubs a tier bar t8's 15. All 25 other countries are 8 tiers.
   ⚠️ **Census check, done while verifying the file:** the export DOES carry money — every one
   of the 3,127 clubs has a distinct non-zero `balance`, and leagues carry `prizeMoney`,
   `tvPoolPence`, `leaguePositionPot` and `parachute`. That is **not** a census-rule breach:
   this is `LeagueImportExportService`'s admin round-trip artefact, not the device pack, and
   the world-pack payload carries no `balance` at all. Worth one note though —
   `LeagueImportExportService.php:335` does `(int) ($row['balance'] ?? 0)` on **import**, so
   importing a world file with a club missing its balance silently sets that club to zero.
   **Re-measurement NOT YET DONE** — no session has this.

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
