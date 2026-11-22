<!-- STATUS --> **STATUS:** 🟢 LIVE — brief for A32, issued 2026-11-21 by the PM session.

# A32 — A scout's ability carries an ~18-point flat floor into a proportional wage split

**Read `agent-standing-notes.md` with this brief.** It carries conventions this brief does not
restate, and it grew eight entries tonight. **Both repos are ICM** — read `.context/CONTEXT.md`
first and let it route you before grepping source.

**Repos:** backend `wunderkind-backend` on `development` (primary), app `wunderkind-app` on
`new-game-save` (secondary, for the fallback derivation and any CHECKS row).
**Deployed state:** backend **287** / `f0aaa125`, app **OTA 493** / `e4cd7ced`, both green.
**Trees are clean and all other sessions are archived — you are the only writer.**

---

## 1. The observation, on the owner's own club

A fresh England save on OTA 493, 2026-11-21 21:08. Club at tier 8:

```
12 COACHES · 1 SCOUT        £10,882 /wk
  COACH  4★  £149      COACH  2★  £26      COACH  3★  £72
  SCOUT  3★  £9,741                    ← 89.5% of the staff bill, 65× a 4★ coach
```

**The scout displays THREE stars against coaches on four, and is paid 65× more.** The owner's words:
*"the issue is the level of scout."* They are right about where it is.

---

## 2. 🔴 WHAT I GOT WRONG — CORRECT THE RECORD BEFORE YOU START

**I told the owner that `ScoutAbilityCalculator.php` "has no tier term" and that the fix was to give
scout ability a per-tier band like staff already has. That is wrong, and the band already exists.**

`ScoutGenerationService::build($nationality, $country, $tier)` — when a country and tier are passed,
which every per-club caller does:

```php
$band  = $this->staffAbilityRanges->resolve($country, $tier);
$expMin = $band['min'];
$expMax = $band['max'];
```

**That is `StaffAbilityRangeService::resolve()` — the same per-country, per-tier authored table a
coach is drawn from.** A25 did this deliberately on 2026-11-20, and removed the old parameter
*"rather than defaulted, so no caller can put the player band back."* Its docblock records the exact
defect it fixed: *"a tier-8 side got a scout rated 33 standing next to coaches rated 2-7… one
rating-33 scout among rating-2-7 coaches takes most of the budget: £2,230/wk against coaches on
£13-266."*

**So the band is there, it works, and it is drawn from one authored source shared with coaches.** My
claim was literally true of the file I grepped and false about the system, because the tier term
lives one call upstream. Do not re-do A25's work.

---

## 3. The actual mechanism — a flat term the band cannot reach

```
ability = clamp(1, 100, round(0.7 × experience + 0.3 × mean(judgements)))
```

- **`experience` IS banded** — per country and tier, §2.
- 🔴 **`judgements` are NOT.** `ScoutGenerationService` rolls all five from the flat global
  `PoolConfig::$scoutJudgementMin/Max` — **40/80 on the entity's defaults**, with no band in sight,
  whatever the club's tier.

**So the judgement term contributes `0.3 × mean(judgements)` ≈ 18 points to EVERY scout at EVERY
tier, and nothing can push it down.** Work it through at tier 8, where the staff band is roughly
2–7:

```
0.7 × ~4.5  =  ~3            ← the banded, tier-aware part
0.3 × ~60   =  ~18           ← the FLAT part, identical at tier 1 and tier 8
                 ability ≈ 21
```

**A tier-8 coach's ability is the band value itself: 2–3. A tier-8 scout's is ~21, of which ~18 is
floor.** At tier 1 the banded part dominates (experience 40–90) and the two are comparable — which
is exactly what the CHECKS sample shows: **t1 coaches 40–50 against scouts 34–40; t8 coaches 2–3
against scouts 16–19.**

### Then the split amplifies it

`staffWagePence` (`wunderkind-app/src/engine/ClubWageScaleService.ts:145`) is
`wage = scale × ability^k`, with `scale` solved so the roster fits the reservation. ⚠️ **`k ≈ 2.5`,
derived from the screenshot rather than read from config** — it reconciles twice: scout/coach
`(21/4)^2.5 ≈ 63` against the observed 65.4, and coach/coach `(4/2)^2.5 ≈ 5.7` against
£149/£26 = 5.73. **Confirm `wageCurveExponentBp` yourself rather than inheriting my 2.5.**

**So a ~7× ability gap becomes a ~65× wage gap, and ~18 of the scout's 21 points are a constant.**

---

## 4. 🔴 The authors predicted this, in writing, before it happened

`ScoutAbilityCalculator`'s own docblock, which you must read in full:

> **every point of weight given to judgements is a point taken away from tier separation** … Because
> A24 will price a scout's wage off `ability`, that is a live risk rather than a historical note: a
> judgement-heavy blend would route around the band and re-open it.

It then measures the trade-off and records the owner's choice: *"0.3/0.7 gives 56 vs 38 — an
18-point spread; 0.5/0.5 gives 59 vs 29; **0.7/0.3 gives 61 vs 19, a 42-point spread**."*

**Note what that last pair says: at 70/30, the chosen setting, tier 8 still lands at 19.** The
spread was maximised and the floor was accepted. **What has changed since is that the wage is now
priced off `ability` through a power-law split — so a floor that was a modest compression of the
ability ladder is a 65× distortion of the wage ladder.** The ruling was sound for what it was
deciding; it was not deciding this.

`ScoutGenerationService` also records the conflation as **a known open item that was explicitly not
A25's to fix**, with a pointer: *"Recorded as an open item in
`wunderkind-docs/economy-loose-ends/a25-ability-bands-report.md`."* **Read that item first — it may
already contain half of your answer.**

---

## 5. The levers, and which are yours

**Measure before choosing. I am not picking, and two of these are not yours to pick.**

1. 🟢 **Band the judgements per tier. ✅ RULED BY THE OWNER, 2026-11-21 — THIS IS THE PRIMARY
   LEVER.** Verbatim: *"Lower tier scouts genuinely worse at judging players is the expectation."*
   ⚠️ **This paragraph originally framed the gameplay change as a COST and cited
   `scoutExperienceMin/Max` as a precedent against it. Both are now superseded** — that precedent
   concerned a question nobody had asked; this one has been asked and answered. The change is the
   desired behaviour, not a side effect to justify.
   **What the ruling does NOT settle:** by how much. The bands are still the owner's number, so
   answer the question that lets them give it — *what judgement band at each tier makes a tier-8
   scout cost like a tier-8 coach, and is that band one the owner would recognise as "genuinely
   worse at judging"?* ⚠️ **Report the scout's share of the staff bill as a FUNCTION of the band,
   at t8 and t1, rather than picking a point on it.** PM's inference, to be checked: a 10–20 band at
   t8 leaves ability near 7.6 against a coach's 2–3 and the scout still taking ~40–45% of the bill,
   while banding to the staff table itself (2–7) makes them directly comparable at ~1/13. **Same
   ruling, very different outcomes — so banding alone may not be sufficient, and that is a
   measurement, not an assumption.**
2. **Move the 70/30 weights.** 🔴 **Owner's ruling, 2026-11-20, with its reasoning recorded.**
   Do not change it; if your measurements say it is the right lever, say so and let the owner rule
   again. Note 100/0 would make `ability` equal banded experience — directly comparable to a
   coach's — but would remove judgements from whatever else reads `ability`.
3. ⚠️ **DEMOTED BY THE SAME RULING — no longer the one to look at first.** It fixes the wage while
   leaving scouts at every tier equally good at judging, which is the behaviour the owner has just
   said is wrong. Keep it as a possible *complement* to lever 1 if the measurement shows banding
   alone does not bring the share down far enough; do not pursue it as the primary.
   **Decouple the wage input from the quality input** — stop pricing off the same number that
   describes how good the scout is. This is engineering rather than calibration, touches no owner
   ruling, and is the one I would look at first. **`scoutNoise.ts:4` describes itself as "the
   single place where a scout's ability is turned into" perception noise**, so if pricing reads a
   different figure, scouting accuracy is untouched by construction.
4. **Split the reservation per role** before dividing within it. Bounds the damage without
   addressing the cause; cheapest, and worth measuring as a comparison even if you do not ship it.

---

## 6. Constraints

- **Correctness before calibration.** You may fix a mechanism; you may not pick a balance number.
  **If the honest fix needs an authored value, measure what it would take and bring the number to
  the owner rather than choosing it.**
- ✅ **RULED 2026-11-21 — BUMP `WORLD_PACK_VERSION` TO 15.** The owner has granted it, so the "do
  not bump it unasked" line below is satisfied. **[MEASURED] one site:**
  `WorldInitializationService.php:277`; every other backend reference reads the constant and the app
  asserts no version at all. 🔴 **The bump and the generator change MUST land in one commit and one
  deploy** — bump first and every country rebuilds at v15 carrying the OLD scouts while the version
  claims they are current; generator first and new v14 sets sit beside old v14 sets, so two scout
  populations share one version and the indicator cannot tell them apart, which is worse than
  `MIXED` because `MIXED` at least warns. **Precedent: v12 was bumped for the same class of change**
  (`types/world.ts:336-340` — *"v12 forces a rebuild"*). The money rule is not in the way: money was
  moved OFF the pack so authoring it stops invalidating caches, while ability and judgements are
  census data and legitimately in it. **After the deploy the pack indicator should read `15`,
  single, no `MIXED`** — say so in the report, so the owner knows what success looks like.
- ⚠️ **Band where there is a tier; leave the pool alone.** Club scouts have a country and tier;
  shared-pool scouts have neither, which is exactly why `PoolConfig::$scoutExperienceMin/Max` was
  left untouched *"by ruling"*. Mirror that for judgements rather than inventing a new position, and
  if you disagree say so explicitly instead of quietly extending the band.
- ⚠️ **Check for a backfill and its ORDER.** Scout rows in the database are a different population
  from scouts baked into a pack. `BackfillPersonalitiesCommand.php:46` documents the hazard
  verbatim — *"Run this BEFORE bumping `WorldInitializationService::WORLD_PACK_VERSION`"* — and
  `ScoutAbilityLifecycleSubscriber` recomputes on lifecycle events. Answer explicitly whether one is
  needed and when it runs.
- 🔴 **Scout `ability` is PUBLISHED IN THE WORLD PACK** (`WorldScout.ability`, resolved at ingest
  through `resolveScoutAbility`). **Changing the derivation changes pack content**, so existing
  packs carry old abilities. Say explicitly in your report whether this needs a world-pack
  regenerate, and whether `WORLD_PACK_VERSION` (currently **14**,
  `WorldInitializationService.php:277`) must move. ✅ Regenerating is cheap now — B2's fix is
  deployed and a full 8-tier England rebuilt in **16 seconds** on real traffic tonight — but **the
  version bump is a cache-invalidation decision and the owner has a standing rule that v11 was
  meant to be the last bump money ever caused.** Flag it; do not bump it unasked.
- **Keep the app's fallback in sync.** `wunderkind-app/src/utils/scoutAbility.ts`'s
  `fallbackScoutAbility` mirrors this formula for saves predating the field. If the backend
  derivation changes, that mirror is either updated in the same change or deliberately left with a
  comment saying why. **Two sources for one quantity is the governing defect of this whole
  workstream** — `ScoutAbilityCalculator`'s docblock says so in as many words.
- **A staff salary is a contract** (owner's B1 ruling). Scouts already hired keep their stored
  salary; this changes what gets WRITTEN, so it lands on new saves and new hires. **Say that
  plainly** — the owner was previously told "it moves at renewal" and that turned out to be empty,
  because renewal priced through the same function.
- **Do not push and do not deploy.** The owner runs deploys.

---

## 7. Verification

- **Reproduce the owner's shape first, to the penny, before changing anything** — EN tier 8,
  12 coaches at the band's own abilities, 1 scout, and the £10,882 / £9,741 / 89.5% / 65× figures.
  A fix measured against a shape you did not first reproduce is not measured.
- **State what the scout's share BECOMES**, at tier 8 and at tier 1, and give the owner the
  before/after as a relationship rather than two numbers.
- **Tier 1 must not regress.** Coaches 40–50 against scouts 34–40 is currently sane; a fix that
  makes the bottom right and the top wrong is not a fix. Check both ends.
- **Check what else reads `ability`** before moving it — `scoutNoise.ts`, `ScoutWageCalculator`,
  `economyDiagnostics`, the CHECKS staff/scout rows, tournament snapshots. **Trace it in both
  directions**, forward from the writers and backwards from the consumers.
- **Consider a CHECKS row** stating the relationship that would have caught this — something like
  *scout ability vs the coach band at the same tier*. ⚠️ The panel is already too heavy; earn the
  line, and A31 has just reworked that section, so read it before adding to it.
- **Backend:** `lando php vendor/bin/phpunit`. Baseline is **3,307 at `3ff5a312`** with known
  failures **#1–#3 by name** — ⚠️ **but that run excluded the WHOLE `AdminShellCoverageTest` class**,
  which is wider than `environment.md`'s `admin_logs` filter, so **do not reconcile against the
  3,366 at `c11c7f2d`.** Re-measure your own baseline at the commit you build on and quote the
  commit and the filter beside every figure. An assertion count is not a baseline; the test count
  and the named failures are.
- **App:** baseline ZERO failures; count suites with **`npx jest --listTests | grep -c "__tests__"`,
  not `wc -l`** — `wc -l` counts jest's warning lines and read 668 against a real 663 tonight.

---

## 8. Reporting

- **Report:** `wunderkind-docs/economy-loose-ends/a32-scout-ability-floor-report.md`, outside both
  repos, commands and output **verbatim, never summarised**. Commit your own report and code by
  explicit path; **push nothing.** Nothing scratch-shaped inside either repo — and **no worktree
  inside the repo**, which doubled jest's collection to 1,325 tonight.
- 🔴 **Mark the epistemic status of everything you report upward.** "I verified X by running Y" and
  "I believe X because Z" look identical to a coordinator who will act on both. Three sessions and
  the PM each got caught by that tonight; the PM twice. **This brief's §3 arithmetic and its
  `k ≈ 2.5` are MY inference from a screenshot — check them.**
- ⚠️ **A status marker like `OPEN` over-claims its own currency**, and `a25-ability-bands-report.md`
  is exactly the kind of file to carry a stale one. Open the code it describes before relying on it.
- **`.context` status and review are mine.** Append one pass entry to `shared/last-sync.md` and
  correct stage text your own change makes wrong; flag anything else stale rather than editing it.
  ⚠️ `.context/CONTEXT.md` now requires `OPEN`/`unfixed`/`still wrong` to be dated and tied to the
  commit they were true at.

---

## 8b. 🔴 OWNER SEQUENCING DECISION, 2026-11-21 — MECHANISM NOW, NUMBERS LATER

*"We can worry about the bands after we've tested that the process of matching the scaling to the
tier is correctly implemented, because we can view the raw data against the scouts' reviews and make
a judgment call."*

**The band numbers are explicitly deferred. Do not block on them.** §5 lever 1's "report the share
as a function of the band" is still useful evidence and is no longer a gate.

1. **Default the judgement band to the SAME authored source experience already uses** —
   `StaffAbilityRangeService::resolve($country, $tier)`. `ability` then becomes tier-consistent with
   coaches by construction, the system keeps **one** authored source for staff-level-by-tier, and
   **nothing new has to be authored to ship.** Do not invent a second table unless you must, and say
   why if you do.
2. 🔴 **The band MUST be authored config, not hardcoded.** The owner deferred the numbers precisely
   so they can tune after seeing real data — **if tuning later needs a code change and a deploy,
   this task has not delivered what was asked.** Admin-editable, same shape as the tables beside it.
   **Name in your report exactly where the owner edits it and what the shipped default is.**
3. 🔴 **"View the raw data against the scouts' reviews" is an observability requirement and is IN
   SCOPE.** Standing instruction: a figure only a device can confirm goes in the CHECKS, not in a
   report. What enables the later ruling is a scout's READ against the player's TRUTH — sampled
   judgements versus actual `current_ability`, **by tier**, so a tier-8 scout being appropriately
   wrong reads as a relationship rather than an inference. ⚠️ Earn the line: the panel is already
   too heavy and A31 has just reworked this section.

---

## 9. What done looks like

1. The mechanism named at file and line and **demonstrated by a measurement on the owner's own
   shape**, not inferred from this brief.
2. A recommendation among §5's levers, with the trade-off measured rather than argued — and if it
   is lever 1 or 2, **brought to the owner as a ruling rather than taken.**
3. If the lever is engineering (3 or 4): implemented, with tier 1 and tier 8 both measured
   before and after, and scouting accuracy demonstrably untouched.
4. The pack-regeneration and `WORLD_PACK_VERSION` questions answered explicitly either way.
5. The app-side fallback either updated in the same change or left with a reason.
6. Tests green with the suite count confirmed and the commit quoted; report filed with verbatim
   evidence; nothing pushed.

**If the brief and the code disagree, the code wins and your report says where. §2 of this brief is
me being wrong in public precisely so you check the rest of it.**
