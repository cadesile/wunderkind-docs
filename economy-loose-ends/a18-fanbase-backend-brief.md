<!-- STATUS --> **STATUS:** ✅ A18 — catchment share ladder published. Landed `8298cc60`. ⚠️ COMMITTED, NOT PUSHED, NOT DEPLOYED. 🔴 **§3 WAS ALREADY DONE — `populationSize` is already in the pack, so NO `WORLD_PACK_VERSION` BUMP was needed or made and nothing needs regenerating.** ⚠️ The expected uniform ×0.47–0.49 did NOT reproduce; the ~70:1 spread did. See `a18-fanbase-backend-report.md`.

---

# TASK — A18: publish the catchment fan-base ladder, and the population it needs

**Backend only (`wunderkind-backend`), branch `development`.** **Commit; do not push.**

⚠️ **Read `agent-standing-notes.md` with this brief.**

## 0. What this completes

The app half landed as **`0964fedc`** on `new-game-save` (A14). It computes
`fanCount = catchment × share(tier)` — **but it is inert**, because the two things it needs do not
exist server-side yet. **This task publishes them.** Until it lands, the app falls back to today's
absolute `fanBaseRanges` byte-identically, which is deliberate.

**Why the feature exists, in one line:** today a tier-1 club in a place of 17,000 has the same
700,000 fans as one in a city of nearly nine million, so the plot a player buys earns them nothing.
Read `next-work-plan.md`'s **THE INTENDED GAME**, **CORRECTION — the median hid a real
correlation**, and **THE LADDER'S STEEPNESS** before starting. **Do not re-derive the numbers** —
they are measured and settled.

## 1. Code state

`git fetch origin` with explicit refspecs. ⚠️ **`development` is TWO UNPUSHED COMMITS ahead of
origin** (A10's wage scale, `68561f93` and `b82540d7`) — that is expected; do not reset or rebase.
Working tree clean, or stop and report. State branch, hash and date at the top of your report.

ICM: read `.context/CONTEXT.md` and the relevant stage's `output/` first.

⚠️ **Backend tests run through Lando** (`lando php vendor/bin/phpunit`) — host PHP is 8.4, the
project needs 8.5. ⚠️ **A full run OOM-kills on this box** (exit 137) and `AdminShellCoverageTest`
cannot run at all; **judge a 137 as an environment result, not a test result**, and batch if needed.
Baseline is **three to five** documented failures **plus a sixth, deterministic one** (two test
files leave the shared `game_config` row dirty). ⚠️ **"~31" is NOT a test figure.**

## 2. Part one — `fanBaseSharePercent`

**A NEW key on `StarterConfig`**, beside `fanBaseRanges` (`src/Entity/StarterConfig.php:480`), in
**exactly the same shape** — the owner asked for this explicitly:

```
Record<tier, { min: int, max: int }>   // percentages
```

🔴 **DO NOT reinterpret `fanBaseRanges`.** It stays, it keeps its absolute values, and the app keeps
falling back to it. Reinterpreting a published key in place would hand every club a fan base of
50,000% of its catchment on the next sync. **That is the single most dangerous thing in this task.**

**The authored default** — settled by the owner, derived geometrically from tier 1 at 60–70% and
tier 8 at 15–20%:

```php
'1' => ['min' => 60, 'max' => 70],   '5' => ['min' => 27, 'max' => 34],
'2' => ['min' => 49, 'max' => 59],   '6' => ['min' => 22, 'max' => 29],
'3' => ['min' => 40, 'max' => 49],   '7' => ['min' => 18, 'max' => 24],
'4' => ['min' => 33, 'max' => 41],   '8' => ['min' => 15, 'max' => 20],
```

**Admin-editable per tier**, exactly as `fanBaseRanges` is at
`DashboardController.php:841-843` — same submitted-array handling, same validation shape. **The
owner tunes these; that is the point of the ladder.**

**Published** wherever `fanBaseRanges` is published, in the same payload.

## 3. Part two — `populationSize` on the NPC club snapshot

`NpcClub::$populationSize` is already a real `bigint` (`:80`), derived from the linked `LandPlot`
and re-synced by `app:npc-clubs:link-locations`. **The app's `WorldClub` does not carry it** — only
`citySize`. The app half needs the number.

⚠️ **This is a pack-shape change, so `WORLD_PACK_VERSION` MUST be bumped** (11 → 12). It is the
one thing in this task that invalidates every cached pack, and the owner regenerates manually.
**Say so prominently in your report.**

⚠️ **A population IS census, not money** — so it belongs in the pack, consistent with the
pack-is-a-census rule. **Do not** add any derived fan count, any share, or any money to the pack:
the share is config, resolved on the device. **Publishing a fan count would be the exact defect
that rule exists to prevent.**

## 4. ⚠️ What this changes, and the one check that matters

**Nothing changes until an app build reads the new key** — so on its own this is safe, and the
measurement below is what tells the owner what will happen when it is read.

**Report, for England and Scotland** (scope: those two only), using the deployed populations:

| | |
|---|---|
| per tier | **mean/min/max fan count** the ladder produces, against today's absolute band |
| per tier | how many clubs land **above 42,500** — the point at which attendance stops being demand-limited |

**Expected, and state whether you reproduce it:** a spread of about **70:1** across the pyramid,
against today's 73:1, with every tier landing near **×0.47–0.49** of its current level. ⚠️ **If your
spread comes out near 164:1 you have applied the wrong ladder** — that is the rejected 5–10%
variant.

## 5. Verification

1. **`lando php vendor/bin/phpunit`** against the documented baseline (§1). Attribute anything else
   by **stashing and re-running**, never by reading the assertion.
2. **A test that the default ladder is monotonic and within 0–100** — a share above 100% is not a
   share, and a non-monotonic ladder would invert the pyramid.
3. **A test that `fanBaseRanges` is UNCHANGED** — same key, same values, still published. That is
   the app's fallback and the thing that must not move.
4. **Round-trip the admin form**: edit a tier's share, save, confirm it publishes.
5. **`app:economy:wage-table` must be byte-identical** for EN and SC. This touches no economy dial.

## 6. Report, do not change

- **The ladder's numbers.** They are the owner's. ⚠️ If your measurement suggests they are wrong,
  **say so with the figures and stop** — do not adjust them.
- **`crowdShare: 0.04`** in the app's new-game-setup screen is a second, already-live catchment
  share (4% for a new tier-8 club) that will disagree with the tick's 15–20% once this lands.
  **App-side, not yours. Flag it.**
- **`PeerBenchmarkService.getTierFanCountAverage`** judges a club against its tier's mean fan count.
  With catchment-driven fan bases a small-catchment club trails that mean **permanently**, so its
  DOF is judged below standard at every review. **App-side, not yours. Flag it.**

## 7. Reporting, scratch files and `.context`

Report: `/Users/courtneyadesile/Documents/WunderkindFactory/wunderkind-docs/economy-loose-ends/a18-fanbase-backend-report.md`.
Nothing scratch-shaped in either repo. Paste commands and output **verbatim**.

Append **one** pass entry to `.context/shared/last-sync.md`; update `03_data` (the entity and the
pack shape) and `04_interfaces` (the published payload). **Flag anything you would have
restructured.**

## 8. Do not

- Do not push. Do not deploy.
- 🔴 **Do not reinterpret or re-author `fanBaseRanges`** (§2).
- 🔴 **Do not put a fan count, a share, or any money in the pack** (§3).
- **Do not change any other economy figure** — turnover, wage ratios, sponsor bands, TV, payouts.
- **Do not work in `wunderkind-app`** — the app half is already committed there.
- Do not touch `league.slots` or anything to do with division sizes.

Before you commit, list the docs folder for any `*-correction.md` or `*-addition.md` newer than this
brief.
