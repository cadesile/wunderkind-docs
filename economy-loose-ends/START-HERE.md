# START HERE — economy workstream, as at 2026-11-20 night

**Read this file first. It supersedes `HANDOVER-2026-11-20-EOD.md`**, which remains accurate for
the five "1/10" mechanisms (§8b) and the owner's rulings (§9) and is still worth reading second.

---

## 1. 🔴 YOUR FIRST TASK — Scotland's squad is priced at England's scale

**This is the one thing between the owner and tuning.** It is briefed in full here so you can start
without re-deriving anything.

✅ **FIXED 2026-11-21 by A30 — `92e90755`, NOT YET PUSHED.** Brief:
`a30-scotland-squad-pricing.md`; report and the live EN/SC/no-country config capture are committed
as `01ad91d` (PM-verified: 5 files, 717 insertions, that session's two paths only).

**The cause, measured through the real guard and the real ingest site.** `ensureGameConfigStored` —
the strict gate `useInitFlow`'s `ensureConfigOrFail()` runs before any world is built — decided
whether to re-fetch `GET /api/game-config?country=` by testing `isCountryResolved(stored.config)`, a
predicate that asks *"was this block resolved against **a** country"*. **England's stored block
passes that for a Scottish save.** So on a device that had already built an English save, the gate
short-circuited, **performed no fetch at all**, and the whole Scottish world was priced on England's
ladder: `fetchGameConfig called: 0`, block staying `EN · tierCount 8`, NPC ratio **10.000**,
founder's squad **10.030** (the extra 0.030 is `startingLeagueTier`'s `Math.min(8, count)` cap
reading England's depth — tiers-flexible violation 2, still unfixed). Fix: the guard now compares the
block's own country against the one being built, via a new `economyBlockCountry(config)` that
`isCountryResolved` is defined in terms of so the two cannot drift. 663 suites / 11,147 tests, zero
failures, `tsc` clean, both pre-existing states byte-identical.

🔴 **THE OWNER NEEDS A *NEW* SCOTTISH SAVE BEFORE ANY TUNING.** The fix changes what gets written,
not what was already written. Every existing Scottish save stays wrong for its whole life, because
nothing reprices a world-build figure.

### 🔴 The one measurement that can falsify A30 — and how to read it

A30 is complete from its own end and has named the check that would disprove it. **On a build
carrying `92e90755`, create a NEW Scottish save and read Debug → CHECKS row 1.**

| it reads | means |
|---|---|
| **`club SC · block SC — AGREE`** | the fix holds |
| **`club SC · block EN — DISAGREE`** | the guard was bypassed by a path A30 did not find — **send it back to A30**, which has offered to take it |
| **`AGREE` but valuations still out of band** | the cause is downstream of the config and **A30's diagnosis is incomplete** |

That third row is the valuable one: it is the outcome A30 cannot rule out from code alone, and it is
why this is a falsification rather than a confirmation.

**Nothing needs preparing** — see the clean-pack note in §3. **Do not press admin TOP UP or
Regenerate** to prepare it; both warnings are in §3 and the second one destroys the good packs.

🔴 **CRITICAL — ON A BUILD WITHOUT A31'S FIX, `Squad pricing model` WILL READ `LEGACY — FAIL` ON A
CORRECTLY PRICED SCOTTISH SAVE. THAT IS NOT A30'S DEFECT RECURRING.** A31 measured it through the
real `fingerprintWorldPack`: a correct SC bottom tier reads `meanWagePence 321,041` against the
250,000 threshold, so `pricing = 'legacy'` and the row fails. **Always, not sometimes.** If you test
A30's fix without A31's, expect row 1 to read `AGREE` **and** the pricing-model row to read `FAIL`,
and read only row 1. A31 fixed the threshold in `925d40a5`.

⚠️ **I had this exactly backwards and it is worth knowing why**, because the reasoning looked sound.
I predicted a *sensitivity floor* — that for a country scaled below England the check could never
fire. The economics were right (SC t4's mean is 321,041 against EN t4's 3,210,417, ratio exactly
10.000) but **the threshold does not encode a money scale, it encodes a PYRAMID DEPTH.** England's
bottom tier is t8, ability band 2–7. Scotland's bottom tier is t4, band 15–35 — a *mid-pyramid*
division, because Scotland is only four tiers deep. The ÷10 country scaling is more than cancelled
by the ×6.3 band difference. **So it is a fifth live violation of the owner's "tiers are flexible"
ruling**, and the only one sitting inside an economy constant rather than an index or array length.
A false alarm on correct data, not a missed alarm.

⚠️ **Two more things will read wrong, and neither is a regression.**
1. **The CHECKS scout row**, on any build without `925d40a5` — it ratios NPC scouts against the
   band, which is no longer their governing rate. ✅ **Fixed by A31.** On a fresh Scottish save with
   `incomeAnchoredWages` on, the corrected row reads **`stored/npc-anchored 1.00`** — exactly 1.00
   at bootstrap, since `snapNpcStaffWages` snaps rather than mean-reverting — with `stored/band` ~10
   printed beside it and marked explicitly as not a verdict. 🔴 **`10.00` is NO LONGER the expected
   reading; anyone reconciling against it will read the first honest output as a regression.**
2. **Scottish clubs read insolvent**, because facilities and upkeep are out of scope by the owner's
   own ruling.

⚠️ **My own `fallbackReason` lead was WRONG and is recorded here so nobody re-runs it.** I sent A30
to read `resolveEconomy`'s `fallbackReason`, reasoning that the panel's `LEGACY` must be a resolver
read. It measured `fallbackReason: 'none'` and `model: turnover` throughout. **The panel's `LEGACY`
is not a resolver read at all** — it is a fixed 250,000-pence threshold on the stored bottom-tier
mean wage (`worldPackDiagnostics.ts:30`), so a Scottish squad priced on England's money crossed an
England-calibrated threshold. That threshold is now A31's (§4 of its brief).

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
| **Scouts** — written at world build, ~~never re-anchored~~ ⚠️ see below | `stored/band 10.00` ❌ |
| **Players** — written at world build, never re-priced | `~10×` ❌ |

**Everything re-anchored on the device is correct. Everything written once at world-build time
carries the wrong country's scale.** One defect, three symptoms.

⚠️ **The SCOUTS row above is stale and its `10.00` is no longer safe to lean on.** "Never
re-anchored" was true before `ec949536`; since then **both NPC re-anchor passes DO price scouts** —
`anchorNpcStaffWages` and `snapNpcStaffWages` each call `anchorScouts(...)` and return
`{ staff, scouts }` (`SeasonBudgetService.ts:207, 215, 250, 257, 699`). The scout figure in the dump
is a **world-build ingest** price, taken before any bootstrap or transition pass, so it is not
evidence about re-anchoring either way — and it may itself be **A31's broken comparator** rather
than a clean stale-write reading. **The cause and the fix never rested on it**; they rest on the
config measurement (`fetchGameConfig called: 0`, block `EN`, 10.000 / 10.030). The conclusion holds;
this row's reasoning does not.

⚠️ **And the governing rate is conditional.** `snapNpcStaffWages:701` returns `null` on
`!economy.incomeAnchoredWages`, so with that flag off the band **does** still govern at bootstrap,
while `anchorNpcStaffWages` is deliberately ungated. **Nothing measured so far settles whether the
scout half honours that flag the way the staff half does.** A31 inherits it open — do not encode
either answer.

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

🟢 **DEPLOYED TO DEV 2026-11-21 20:33 — OTA **493** (app `e4cd7ced`, run 44946913660) / backend
**287** (`f0aaa125`, run 44946888119). BOTH GREEN, confirmed.** Carries A30's config-block guard (`92e90755`), A31's comparator and legacy-threshold
fix (`925d40a5`) and B2's top-up refusal (`3ff5a312`). Work branches pushed: app `new-game-save`
→ `97ed9e00`, backend `development` → `3ff5a312`. Both merges were clean; the deploy path is
`new-game-save` → `dev` and `development` → `dev`, which is what OTA 492 did.

✅ **NO WORLD DATA IS INVALIDATED. `WORLD_PACK_VERSION` STAYS 14 — DO NOT REGENERATE.** Verified:
the constant lives at `WorldInitializationService.php:277` and that file is not in the deploy diff;
B2's four references to it are all reads passed to `countReadyUnclaimed`, not a bump. No migration in
either repo (the only matches were `migrations.md` and `drizzle-migration-status.md`, both docs).
Nothing touches pack content or serialization — B2's changes are stocking, reaping and reporting.
**The two complete unclaimed v14 Scottish sets remain valid.** The design reason is the standing one:
the pack is a census and carries no money, so economy authoring stopped being a cache invalidation
at v11.

⚠️ **What IS invalid is every existing Scottish SAVE.** The fix changes what gets written at world
build, and nothing reprices a world-build figure, so a save already built on England's block stays
wrong for its whole life. Fresh saves only.

⚠️ **Expect the admin TOP UP button to start REFUSING.** B2's fix makes it reject a top-up that
would write nothing instead of answering "already at target" — a 409 where there used to be false
success. That is the fix working, not a break.

✅ **POST-DEPLOY STATE VERIFIED ON DEV, 20:48 — B2, read-only, nothing pressed and no save created.**
- **Both Scottish sets survived**: `01a1ff72…` and `01a1fab3…`, `ready`, `payload_version 14`,
  `tier_count 4`, `claimed_at` null. `sc_tier_payload_rows = 8`, `sc_claimable = 2`, EN ready 2.
  **Stronger than my reading of the code:** `WorldPackSetRepository::findBuildingBefore()` filters
  `s.status = :building`, so a `ready` row cannot match the reap's selection, and the reap only ever
  calls `markFailed()` — **no path in that change deletes a set row at all.** Two tests pin it.
- **Consumers alive, queues clear.** ⚠️ Method worth copying: `ps aux` was sampled every 15s rather
  than once, because these are cron-paced workers that exit at `--time-limit=50` — **a single
  snapshot catches an empty instant and reads as "no consumer running"**, which B2's first snapshot
  did. Cron unbroken on the new image, every other minute.
- 🟢 **THE IMAGE WAS REBUILT, so none of B2's change is inert** — `ImageCreated 20:34:59`,
  container started `20:36:18`, and the deployed `/usr/local/bin/worldpackset-consume.sh` carries no
  `-q`. The whole admin surface is fixed, not half of it.

⚠️ **One live piece has never executed, and it is not a fault.** The maintain sweep is hourly at
`:20` and the container started at 20:36, so **its first unattended run is 21:20 UTC** — that is
when the reap, the new `0/2 claimable (+2 building)` Stock column and the non-zero exit are first
exercised. Both countries are at target, so a clean sweep with `reaped 0` is expected.
`/var/log/worldpack-maintain-cron.log` does not exist until then. Marked INFERRED from the crontab
and container start time; nobody has watched it.

---

**Previously deployed to dev** (OTA **492** / backend **286**, both green): everything below.

| repo | branch | ahead of `dev` | notes |
|---|---|---|---|
| `wunderkind-app` | `new-game-save` | nothing unpushed | `9bac0b18` is the tip as of the deploy |
| `wunderkind-backend` | `development` | nothing unpushed | `c11c7f2d` is the tip as of the deploy |

⚠️ **THE TABLE ABOVE IS LAST NIGHT'S AND IS NOW STALE — corrected by the PM session, 2026-11-21
18:40.** Measured, not inferred:

| repo | branch | tip now | vs `origin` |
|---|---|---|---|
| `wunderkind-app` | `new-game-save` | **`b0d4c2fc`** | **2 commits UNPUSHED** |
| `wunderkind-backend` | `development` | **`d731db22`** | in sync |

- App: `328a7287` (*"An NPC club can no longer name a 14-year-old, and one constant caps both injury
  ceilings"*, 18:35 today) and `b0d4c2fc` (*"`.context` stops being an append-only diary, and a test
  keeps it that way"*, 18:36 today) landed **after** this file was written. **Neither is in the OTA
  492 deploy**, and neither is pushed. `b0d4c2fc` changes the `.context` rules and adds a guard —
  read it before touching `.context`.
- Backend: `d731db22` (*"Bring `.context` into line with the day's five commits"*) sits above the
  `c11c7f2d` named above. Both are pushed.
- 🔴 **A session was writing `wunderkind-app` while this correction was made** — `Frontend context
  implementation review`, the author of those two commits. Anyone measuring the app repo needs a
  detached worktree at a named commit and a handshake before a full suite run.

✅ **`ec949536` landed** — a club's scouts are re-priced on its own income, like its coaches.
660 suites / 11,070 passed against a self-measured 659 / 11,057. ⚠️ **It did NOT fix the player's
own club, and it broke the CHECKS scout row. Read §4 item 2 before acting on either.**

### Verified on a device

⚠️ **RE-WEIGH EVERYTHING IN THIS SUBSECTION — 2026-11-21.** Every reading below was taken on dev on
2026-11-20, and on that day the admin world-pack top-up could report success while writing nothing.
So a save's pack may have been staler than the person recording it believed, **including where the
version indicator read clean.** Marked by B2 as inferred from the mechanism rather than observed;
the rows that would have proved it were deleted by that evening's Regenerate. **A finding resting on
a code measurement at a named commit is unaffected — A30's is, and it says so. A finding resting on
a device figure alone is now weaker evidence than it looks.** Nothing below is withdrawn; it needs
re-confirming on a fresh save before anything is built on it.

✅ **A clean Scottish pack is available now, so that re-confirmation is cheap.** Two complete,
unclaimed, version-14 Scottish sets are on dev (`sc_tier_payload_rows = 8`, 4 tiers × 2 sets), one
of them built end to end by the async path today. A fresh save claims one and the per-init dispatch
restocks within ~2 minutes. **Nothing needs preparing: do not use the admin top-up, and do not press
Regenerate** — Regenerate calls `deleteUnclaimed()` and would destroy both good sets.

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
