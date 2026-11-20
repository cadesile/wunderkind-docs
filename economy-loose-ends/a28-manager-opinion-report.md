<!-- STATUS: ✅ STEP 1 COMMITTED (proven no-op) · ⏸️ STEPS 2 & 3 HELD FOR THE OWNER (2026-11-20) -->

# A28 report — the manager's opinion noise, and the bond bias

**Branch** `new-game-save`, app-only. **Commit** `4719b469` — *"The manager's error band stops
being the scouts' error band"*. Not pushed, not merged, not deployed.

**Verification:** `npx tsc --noEmit` clean. `npm test` **649 suites / 10,819 passed** (10,822
collected, 3 skipped), `npx jest --listTests | wc -l` = **649**. Baseline was 648 / 10,816, so
this is **+1 suite / +3 tests** — `managerNoiseDecoupling.test.ts` and nothing else. Reconciles
exactly. `CLAUDE.md`'s `new-game-save` row updated; the previous row kept as `(A26)`.

---

## 1. ✅ Step 1 — the decoupling, committed, and the no-op is PROVEN not asserted

`MAX_MANAGER_NOISE_SPREAD = 20` now lives in `playerRatingEngine.ts` and drives
`deriveErrorMargin`. The import of `scoutNoise`'s `MAX_NOISE_SPREAD` stays, because
`deriveFacilityError` still uses it — and that is correct: the facility half of the blend
genuinely *is* the club's scouting apparatus, so it belongs on the scouting dial. Only the
manager's own judgement moved off it. **Flagging it because it is a judgement call you may want
to revisit:** if A27 ever moves `MAX_NOISE_SPREAD` itself (rather than the age gate), the
facility 40% of `player_rating` moves with it. A27 as briefed touches the age gate, so no
collision today.

**The proof.** A 3,840-case `derivePerceivedRating` grid — 8 scouting ranges × 6 consistencies ×
5 morales × 6 bond values × 4 facility states × 4 week numbers, through the real seeded
`makeRatingRandom` — dumped to 12 decimal places before and after the change and diffed. **23,039
lines, byte-for-byte identical.** Draw order untouched, no draw added or removed, the shared
current/potential error preserved.

**The guard suite** does not assert the two constants are equal, which they are today and which
would pass whether or not anything had been decoupled. It `jest.mock`s `scoutNoise` with
`MAX_NOISE_SPREAD: 1000` and asserts the manager term stays on 20 while the facility term moves
to 1000. That test fails the moment someone re-couples them.

---

## 2. ⏸️ Step 2 — the noise width. **Your ±2.2 is right.** Table below; number not picked.

Your arithmetic checks out exactly: **±2.29** at scouting range 50, consistency 10, after
`MANAGER_WEIGHT` 0.60. (`0.5 × 20 × (1 − 50/100) × 0.7632 × 0.60`.)

**Max manager-term contribution to the perceived rating, in rating points, at average
consistency 10/20:**

| `scoutingRange` | **S=20 (live)** | S=30 | S=40 | S=50 |
|---|---|---|---|---|
| 0 | ±4.58 | ±6.87 | ±9.16 | ±11.45 |
| **20 — `DEFAULT_SCOUTING_RANGE`** | **±3.66** | **±5.49** | **±7.33** | **±9.16** |
| 35 | ±2.98 | ±4.46 | ±5.95 | ±7.44 |
| **50 — your worked example** | **±2.29** | **±3.43** | **±4.58** | **±5.72** |
| 65 | ±1.60 | ±2.40 | ±3.21 | ±4.01 |
| 80 | ±0.92 | ±1.37 | ±1.83 | ±2.29 |

At consistency 1 multiply by 1.31; at consistency 20 multiply by 0.655. Those are the extremes
of the whole range, so the table is within ±35% whatever the manager's consistency.

### 🔴 Two things I'd want the owner told alongside that table

**(a) The live row is almost certainly 20, not 50.** `manager.scoutingRange` is optional, has no
other engine reader, and **is never generated client-side** — `npcManagerGeneration` writes
`coachingAbility` only, so the field arrives purely from `/api/market` or a world pack, and
anything without it falls back to `DEFAULT_SCOUTING_RANGE` **20**. Worth checking what the
owner's actual manager carries before picking a number off the 50 row, because the two rows are
60% apart. **If range 20 is what the save has, the current band is ±3.66, which is why Angus
MacDonald's +3 is reachable today** — on the 50 row a +3 from the manager term alone is
arithmetically impossible (max ±2.29), so the +3 either came off the 20 row or carried some of
the facility error.

**(b) The mean matters more than the max.** The draw is uniform, so the *mean* absolute error is
half the table: at S=20/range 20 the typical read is off by **1.83 points**, and a +3 is an
unusual week, not a typical one. "Slightly more varied" probably means moving the typical case,
not the ceiling. The spread that makes **+3 the typical deviation** at range 20 is **S ≈ 33**;
at range 50, **S ≈ 52**.

My read, if you want one to put to the owner: **S = 30 on the 20 row** — typical error 2.75,
ceiling 5.5 — is the smallest change that makes a wrong read the norm rather than the exception,
and it keeps the ceiling under 6 points, which is about one half-star at a mid-tier ceiling. S =
40 and 50 start producing reads that are wrong by more than a half-star routinely.

### ⚠️ The second effect the owner has not been asked about: weekly DRIFT

`makeRatingRandom(playerId, weekNumber)` reseeds every week, so consecutive weeks are
**independent draws**. The maximum week-to-week *move* in the manager term is twice the band:

| `scoutingRange` | S=20 | S=30 | S=40 | S=50 |
|---|---|---|---|---|
| 20 | 7.33 | 10.99 | 14.65 | 18.32 |
| 50 | 4.58 | 6.87 | 9.16 | 11.45 |

Widening the error from the truth and widening the weekly jitter **are the same knob** — they
cannot be separated without a second mechanism (e.g. seeding from a slower-moving key, or
smoothing the persisted value toward the new draw). At S=40, range 20, a player's displayed
rating could move ~15 points between two weeks with nothing having happened to them. **That is a
different player-facing experience from "the manager is a bit wrong", and it is the part I'd
most want the owner to see before a number is chosen.**

### ⚠️ And the stars may not move at all

`PlayerStarRating` is `floor(value / ceiling × 10)` half-stars against the **league-tier**
ability ceiling. So one half-star is `ceiling / 10` rating points: **~4.5 points at a bottom-tier
ceiling of 45**, 10 points at a ceiling of 100. At S=20 the manager term cannot cross a half-star
boundary at a ceiling of 45 except on an extreme draw at low reach; at S=40 it can. So:

- **If the owner wants the NUMBER to vary more** → the table above answers it, S=30 is enough.
- **If the owner wants to SEE the opinion differ on the star display** → that needs S≈40+ *and*
  accepts the weekly drift above, because a visible star change and a stable weekly reading are
  in direct conflict at this granularity. The lossy-stars rule in `CLAUDE.md` is deliberate
  ("the user is not meant to distinguish a 70-potential prospect from a 90 one"), so I'd treat
  "make the stars move" as a design decision, not a tuning one.

**Which of the two the owner wants is the question I need answered before I touch the constant.**

---

## 3. ⏸️ Step 3 — the bond. **Not zero for every player, but the paths are narrow.**

I could not measure the dev *save*: `player_staff_bonds` lives in SQLite on the owner's device,
there is no local copy of it in either repo, and nothing in the app exports it. **So this is a
static answer about which bonds can exist and how big, not a count of the owner's rows.** If you
want a real count, the cheapest instrument is a Debug → CHECKS line over
`getBondsForStaff(findManager()?.id)` — say the word and I'll add it, it's small.

### The docblock is right about seeding and wrong as a conclusion

`BondSeedService` seeds a player's assigned coach only, and `CoachAssignmentService`'s
`COACHING_ROLES` is `{coach, assistant_coach}` — so **a manager is genuinely never assignable,
never seeded, and never gets organic weekly growth.** On a fresh save every manager bond is 0 and
`MAX_BOND_BIAS` multiplies nothing, exactly as the docblock warns.

**But four runtime paths build one, and `readManagerBonds` matches on `staff_id` alone — it does
not filter on `staff_type` — so anything pointing at the manager counts:**

| path | `staff_type` | magnitude | needs |
|---|---|---|---|
| `YouthPromotionService.seedGraduateBond` | `manager` | absolute **50–60** | `managerSignsEligibleYouth` on, a youth reaching 16 |
| `ReactionHandler` guardian convince / ignore / sibling | `manager` | **+5 / −8 / −5** | a guardian event |
| `PromiseOutcomeService` | `manager` | ±`outcome.delta` | a promise resolving |
| `ExcursionService` positive bonds | `coach` — ⚠️ but `staff_id` **is** the manager, so it counts | ±`bondDelta` | any staff excursion |

The excursion one is worth calling out as a latent bug-shaped thing: `bondStaff` is built from
`coachStore.coaches` with **no role filter**, and the manager is in that store (`findManager()`
reads the same array). So the manager goes on every staff excursion and makes friends, filed
under `staff_type: 'coach'`. I have **not** changed it — it's out of scope and arguably the
behaviour you want — but it means the bond term is live in more saves than the docblock implies.

### What the bias is actually worth today

`decayNeglectedBonds` erodes every staff row regardless of type, floored at `bondDecayFloor`
**20**. So a youth graduate's 50–60 decays to **20 and stays there forever**, worth
`20/100 × 5 × 0.60` = **+0.6 rating points**. A fresh graduate at 60 is worth +1.8. A guardian
fallout at −13 is worth −0.39.

**So the honest summary for the owner: the bond term is not structurally dead, but at
`MAX_BOND_BIAS` 5 even its best realistic case is under 2 rating points and its steady state is
0.6 — a third of a half-star at best.** Raising the constant *does* do something, for saves that
have run the youth/guardian/promise/excursion content. It does nothing on a young save, which is
what the owner is testing on.

### What I'd put to the owner

The ruling is **symmetric** and I have not added an asymmetric branch — `mapBondToBias` keeps
its shape and only the constant would move. Given the 0.60 damping and the decay floor of 20:

- **`MAX_BOND_BIAS` 5 → 12** makes the steady-state graduate bond worth +1.44 and a maxed
  relationship worth ±7.2 — the first value at which the strongest bond in the game crosses a
  half-star at a mid-tier ceiling.
- **5 → 8** is the conservative option: ±4.8 maxed, +0.96 steady state. Visible in the number,
  not in the stars.

But I'd pair either with a question the owner hasn't been asked: **should the decay floor of 20
apply to manager bonds at all?** Right now a player the manager personally promoted and a player
the manager has never spoken to differ by 0.6 points forever, because the bond that was 60
decayed to the same 20 the floor gives everybody above it. Raising `MAX_BOND_BIAS` scales that
difference up but does not make it *mean* anything. That is a bigger question than the one asked
and I have not acted on it.

---

## 4. What I did not touch

`deriveErrorMargin`'s signature and inputs (`scoutingRange`, `consistency`) — unchanged, per the
2026-11-20 narrowing. `coachingAbility` is still nowhere in the rating path. Consistency, morale,
`MANAGER_WEIGHT`/`FACILITY_WEIGHT`, `mapBondToBias`'s shape, `MAX_BOND_BIAS` itself, the draw
order in `derivePerceivedRating`, and the shared current/potential error: all untouched. Scout
behaviour untouched beyond the one decoupling step. Nothing pushed, merged or deployed.

`game-mechanics.md` gained **§7b**, which documents the manager's perception model — it had no
entry at all before, and §7 covered the scouts only. That absence is a good part of why the two
systems kept being confused for each other from source, including in this brief's own origin.
