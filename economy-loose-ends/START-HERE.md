# START HERE — economy workstream, as at 2026-11-20 night

**Read this file first. It supersedes `HANDOVER-2026-11-20-EOD.md`**, which remains accurate for
the five "1/10" mechanisms (§8b) and the owner's rulings (§9) and is still worth reading second.

---

## 1. 🔴 YOUR FIRST TASK — Scotland's squad is priced at England's scale

**This is the one thing between the owner and tuning.** It is briefed in full here so you can start
without re-deriving anything.

### What was measured, on a device, on a clean pack

A Scottish save on `Pack version: 14` — **single version, no `MIXED`**, so this is not the stale-pack
confound that invalidated three hours of earlier readings:

```
Squad pricing model:   LEGACY — FAIL
Player valuation:      9.27–10.69, ALL 8 OUTSIDE the band  (t1 mean 10.06, t3 mean 9.96)
Wage coverage:         1005.2% / 956.1% / 933.4% / 951.6%
```

An **English** save on the same pack version, same build, same hour: `TURNOVER`, **16 of 16 player
valuations IN BAND**, coverage 96.5–132.6%.

### What is NOT the cause — do not re-investigate these

- **The country scaling config is correct.** SC t1 resolves at `126,972,564` against EN t1
  `1,269,725,639` — exactly one tenth. The TV ladder is £2.5m / £1.2m / £583k / £417k, correctly
  scaled, and England's is byte-identical to before the change.
- **The pack is not stale.** Version 14, single. The `MIXED` warning is absent.
- **The ability derivation is fine.** `ability = clamp(1,100, round(0.7×experience + 0.3×mean(judgements)))`
  behaves as designed; a t8 scout lands near 22 and the band price matches.

### The pattern, which is the strongest clue

In the same Scottish dump:

| written where | reads |
|---|---|
| **Staff** — re-anchored on device from club income (`npcStaffWagePence`) | `stored/npc-anchored 1.00` ✅ |
| **Scouts** — written at world build, never re-anchored | `stored/band 10.00` ❌ |
| **Players** — written at world build, never re-priced | `~10×` ❌ |

**Everything re-anchored on the device is correct. Everything written once at world-build time
carries the wrong country's scale.** One defect, three symptoms.

### Where to start looking

`src/economy/packWages.ts` — `packPlayerWeeklyWagePence` takes a `ResolvedEconomy` documented as
*"Resolved for the PAYING club's tier, via `resolveEconomy(config, tier)`"*, so the function is
country-capable. **The question is what config it is actually handed at ingest**, and whether the
country economy block is resolved before or after the pack is priced. The two call sites named by
the census rule are `useInitFlow`'s `worldPlayerToPlayer` (the founder's squad) and
`normalizeRawWorldPlayer` (every NPC).

⚠️ **That is a hypothesis, not a finding.** The PM was wrong three times on this class of problem
tonight and the owner was right each time. **Measure it; do not assume it.**

### The gap in process that let it through, which is the transferable part

The country-scaling session verified that **the band** scales 10.000 EN/SC. It does. **Nobody
verified that stored squad wages scale.** They do not. "Measured correct" and "correct" differed by
exactly what nobody thought to measure. When you fix this, verify the STORED figures on both
countries, not the function that computes them.

### Boundaries

- **England must stay byte-identical.** It is the control and it currently passes. Prove it rather
  than asserting it.
- Do not re-rule what anything should cost. The owner's standing rule is **correctness before
  calibration**, and tuning is explicitly parked.
- Facilities and upkeep are **ruled out of scope** (owner, 2026-11-20: *"No, leave facilities for
  now"*), with the known and accepted consequence that Scottish clubs read insolvent.

---

## 2. What the PM session actually did, so you can calibrate how much to trust this file

The role was **project manager and coordinator, not implementer**. Explicitly, by the owner's
instruction at the start: *"You will not be responsible for changing any code."*

**What the PM did:** briefed and sequenced ten agent sessions; ruled on scope when two sessions
disagreed; verified agent claims against the code rather than accepting reports; curated
`.context` status, this folder, and `agent-standing-notes.md`; carried owner rulings into the
record; and ran the deploys.

**What the PM did not do:** write or edit any application or backend code. Every commit in both
repos today came from an agent session. The PM edited only documentation and `.context`.

**Where the PM was wrong today — all four caught by the owner or an agent, none by the PM:**

1. Claimed a "99.93% reconciliation" proved the 1/10 ruling. The Scotland session was asked to
   break it and did: the ÷10 and `countryFactorBp('SC')` are the same factor and cancel.
   **Withdrawn.**
2. Theorised three times about why the world-pack rebuild was failing — orphan cache rows, a
   claimed-set deadlock, crond being down. All three disproved by evidence. The actual answer was
   found by running the inline command.
3. Relayed an unverified attribution as fact and issued an instruction that would have destroyed
   309 insertions of another session's uncommitted work. The accused session checked, refused, and
   was right.
4. Raised an "England regression" that was entirely a mixed-version pack.

**The pattern worth knowing:** the PM's verification of *committed code* was reliable; its
*hypotheses about causes* were not. Treat a claim in this folder as sound where it cites a file and
line, and as a guess where it reasons from symptoms.

---

## 3. State of the world

**Deployed to dev** (OTA **492** / backend **286**, both green): everything below.

| repo | branch | ahead of `dev` | notes |
|---|---|---|---|
| `wunderkind-app` | `new-game-save` | nothing unpushed | `9bac0b18` is the tip as of the deploy |
| `wunderkind-backend` | `development` | nothing unpushed | `c11c7f2d` is the tip as of the deploy |

✅ **`ec949536` landed** — a club's scouts are re-priced on its own income, like its coaches.
660 suites / 11,070 passed against a self-measured 659 / 11,057. ⚠️ **It did NOT fix the player's
own club, and it broke the CHECKS scout row. Read §4 item 2 before acting on either.**

### Verified on a device

- **DOF pot carries and balances.** `opening 209,030,788 · committed 175,860 · pot 208,962,474 ·
  next rebalance 208,854,928 — CARRIED`, ten refundable entries, ledger FITS. The next rebalance
  is *below* the current pot rather than restoring it, which was B1's whole defect.
- **England: 16/16 player valuations in band**, TV ladder unchanged, club solvent, over-committed
  `no`.
- **Scotland: TV scaled correctly**, staff re-anchoring correct, squad pricing wrong (§1).

---

## 4. Open items, in the order the PM would take them

1. **§1 above.** Blocks Scottish testing and therefore tuning.
2. 🔴 **THE OWNER'S OWN SCOUT IS STILL £12,510/wk, AND THE RE-ANCHOR DID NOT FIX IT.**
   `ec949536` landed: a club's scouts are re-priced on its own income, like its coaches. Measured
   on the owner's exact shape — reproducing the device reading to the penny first (coaches
   £868.44/wk, scout £12,509.76/wk, 84.2×) — the staff bill falls from **£16,432.08/wk, 3.87× the
   reservation, to £2,388.11/wk, 0.56×**. Scout down 83.8%. **That is NPC clubs.**
   ⚠️ **The player's own club is NOT fixed, deliberately and correctly.** The coaches read the band
   to the penny, which proves no AMP re-anchor pass is running — `anchorAmpStaffWages` was retired
   earlier the same day under the owner's own B1 ruling that **a staff salary is a contract**.
   Adding an AMP pass back for scouts would reinstate exactly what that ruling retired, so the
   session refused and fixed `ampStaffWagePence`'s SHAPE instead, which prices the next hire rather
   than re-pricing a contract. **Under the ruling, the owner's scout moves at renewal.** If that is
   not what the owner wants, it is a re-ruling, not a bug.
   ⚠️ **The stale-write fix is therefore half true**: confirmed for NPC clubs, not for the
   player's club.
   ⚠️ **This BREAKS the CHECKS panel's scout row.** It ratios NPC scouts against the band, which is
   no longer their governing rate — the identical defect the OTA 491 staff correction fixed for
   coaches. The session deliberately left `economyDiagnostics.ts` and `ChecksTab.tsx` alone as
   A29's territory. **Expect scout rows to read wrong until someone updates the comparator**, and do
   not treat that as a pricing regression.
   ⚠️ **Two unowned findings in the same family**, both traced in code and **not reproduced on a
   device**: `computeNpcWageBill` also omits scouts, so NPC budgets and solvency verdicts exclude
   them; and **a re-anchored salary does not survive a reload** — the world blob strips both rosters
   while `seasonBudget` persists, so bootstrap skips the club and never re-snaps. The second is
   pre-existing, hits coaches identically, and **bounds the real value of both re-anchor passes**.
   Report: `scout-reanchor-report.md`.

3. **The ability-proportional split.** ⚠️ **The
   fix bounds the bill but will not make scouts cheap** — `ClubWageScaleService` splits a club's
   reservation in proportion to ability, so a scout at ability ~22 among coaches at 2–7 still takes
   a large share. On the owner's own club the scout was **£12,510/wk of a £13,376 staff bill, 93.5%,
   84× a coach of the same star rating**, against a reservation of ~£4,249/wk. Whether
   ability-proportional splitting is right here is **calibration and unruled**.
4. **Authored turnover vs modelled income disagree at the bottom of the pyramid, in BOTH countries.**
   EN t8 modelled £1,303,092 against authored £215,000 — **606%**. Not a scaling bug; the same shape
   appears in Scotland. Owner's dial.
5. **The band ceiling is an admin edit.** `wageMultiplierTiers` top row is bounded at `maxAbility`
   60 where both codebases document a `null` catch-all; anything above resolves through a branch the
   backend's own docblock calls accidental. Restoring `null` is behaviour-identical. **Adding rows
   above 60 is calibration and unruled.**
6. **The ladder is non-monotonic** — at ability 25 the staff/player ratio drops 20%, at 40 another
   25%. Measured, owner's dial.
7. **Eight suites assert wall clocks and a 659-suite run contends with itself.** Proven by the same
   commit producing both a failure and a clean run. Unowned.
8. **`wunderkind_test` holds 98 leaked `league` rows**, giving one test a ~14% chance per run of a
   spurious error that misattributes itself. Cleanup proposed in `a25-ability-bands-report.md` §8.3
   and deliberately not performed — destructive against a shared database.
9. **On dev, the async world-pack build does not run.** `app:worldpack:warm <CC>` works inline;
   the admin top-up reports success and writes nothing. See the standing notes.
10. **CHECKS "COPY EVERYTHING" overflows the device clipboard.** Per-section copy works.

---

## 5. Conventions that held all day and should keep holding

Read **`agent-standing-notes.md`** before briefing anyone. It is the most valuable file here and it
earned every line today. The ones that cost the most:

- **Never read a config value off a repo's default** — resolve it through the resolver the game
  uses, and measure the live row.
- **Believe the code over the brief**, including over this file.
- **Verify in a detached worktree at a named commit**, and **name the commit beside any count**.
  Both rules exist because they were broken.
- **One writer per file, within a repository.** Stage by explicit path. **Never restore a path you
  did not author.**
- **Mark the epistemic status of anything you report upward** — "I verified X by running Y" and "I
  believe X because Z" look identical to a coordinator, who will act on both.
- Reports and evidence live **here**, outside both code repos. `.context` status belongs to the
  project-manager session; agents append one entry to `shared/last-sync.md` and never restructure.
