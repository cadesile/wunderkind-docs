<!-- STATUS --> **STATUS:**  🔄 ACTIVE — agent running as of 2026-11-19 18:30.

---

# TASK — A14: the fan base comes from the plot's population, not from the tier

**App only (`wunderkind-app`), branch `new-game-save`, on top of `ea92859a`.**
⚠️ **Another agent (A11) is in `wunderkind-backend` — do not write there.**
**Commit; do not push.**

⚠️ **Read `docs/economy-loose-ends/agent-standing-notes.md` with this brief.**

## 🟥 0. SCOPE — the APP HALF ONLY, and it must be INERT until the backend catches up

The full feature is two halves. **You are building one**, and the brief's single hardest
requirement is that your half changes **nothing** until the backend publishes its half.

| half | who |
|---|---|
| publish a per-tier **share** ladder, and `populationSize` on the NPC club snapshot | **backend, NOT you** (queued separately) |
| read them when present; **fall back to exactly today's behaviour when absent** | **you** |

## 🔴 1. THE TRAP THAT WOULD DESTROY THE ECONOMY — do not reinterpret `fanBaseRanges` in place

`starterConfig.fanBaseRanges` is **backend-published** and holds **absolute headcounts**:

```ts
'1': { min: 50000, max: 200000 }   …   '8': { min: 100, max: 500 }
```

**If you make the app read that same key as a percentage, a live backend still sending 50,000 means
a tier-1 share of 50,000% of the catchment.** Every club in the game would get an astronomic fan
base on the next sync, silently.

**So: a NEW key.** Read a share ladder (suggested name `fanBaseSharePercent`, tier-keyed
`{min,max}` percentages) **if the backend publishes one**, and otherwise fall back to
`fanBaseRanges` exactly as today. ⚠️ **Confirm the key name with the PM before committing** if you
prefer a different one — the backend half must match it.

**That fallback is what makes this safe to land before the backend half exists**, and it is the
acceptance criterion in §4.

## 2. Code state

`git fetch origin` with explicit refspecs; confirm `new-game-save` is at **`ea92859a`** and in sync.
Working tree clean, or stop and report. State branch, hash and date at the top of your report.

ICM: read `.context/CONTEXT.md` and the relevant stage's `output/` first.

**Read before implementing** — `docs/economy-loose-ends/next-work-plan.md`, these sections:
**THE INTENDED GAME** · **SCOPED — plot population drives the fan base** ·
**DECIDED — reuse `fanBaseRanges`, reinterpreted as a SHARE** · **THE BAND LADDER** ·
**CORRECTION — 60–70% STANDS**. They carry the decisions; do not re-derive them.

## 3. The change

**Today** (`fanStore.ts:112`): a tier-keyed absolute range, drawn at random, identical for every
club in a tier.

**Wanted:**

```
fanCount = catchment population × share(tier)
```

- **The player's own club** — population from the chosen plot (`useLandFlow.ts:329` already carries
  it).
- **NPC clubs** — `populationSize`, which `NpcClub` already holds as a real int derived from its
  linked `LandPlot`. ⚠️ **`WorldClub` does not carry it yet** (`world.ts:238` has only `citySize`).
  Add the optional field and read it when present.
- **The owner's ladder**: tier 8 ≈ **5–10%**, tier 1 ≈ **60–70%**, interpolated between. These are
  **starting** values — `fanStore` already evolves fan count via `promotionIncrease` /
  `relegationDecrease`, and that stays.

⚠️ **`TIER_FILL` IS NOT YOURS.** `calculateAttendanceCount` scales fill by *reputation*; your share
scales *support* by tier. **Support and turnout are different quantities on different axes.** Fold
one into the other and the pyramid gets squared.

## 4. 🔴 VERIFICATION — the inertness proof is the deliverable

1. **🔴 Prove the fallback is byte-identical.** With no share ladder published, fan counts for a
   given seed must match today's exactly. **This is the most important thing in the task** — it is
   what lets it land before the backend half.
2. **Then measure the change**, with a ladder supplied locally: fan count and **season shirt
   income** before and after, at **EN t1, EN t8, SC t1, SC t8**, across a small, medium and large
   population. ⚠️ **Shirt income is LINEAR in `fanCount`** (`shirtSales.ts:111`, booked at
   `SeasonTransitionService:1534`), so this moves real money — **it is NOT a re-expression.**
   Today's tier-8 absolute is 100–500; the ladder gives ~1,000–2,000 in a 20,000 town. **Report the
   multiple at each tier and let it be whatever it is.**
3. `npx tsc --noEmit` clean; `npm test` green with the suite **COUNT** confirmed.
4. **Tests**: the fallback path, the share path, the player's-plot path, and a club with **no**
   population (must not produce 0 or NaN — pick a documented behaviour and pin it).
5. **The economy gate must be byte-identical.** If it moves, something unintended changed.

## 5. Report, do not change

- **Shared catchments** (two clubs in one town) are **explicitly deferred**. Do not implement a
  split. If your reading suggests it is needed sooner than expected, say why.
- **Anything that aggregates fan bases across clubs** — if you find one, **stop and report**: it is
  the condition that makes the deferral unsafe.

## 6. Reporting, scratch files and `.context`

Report: `/Users/courtneyadesile/Documents/WunderkindFactory/docs/economy-loose-ends/a14-fanbase-report.md`.
Nothing scratch-shaped in either repo. Paste commands and output **verbatim**.

Append **one** pass entry to `.context/shared/last-sync.md` and update **game-mechanics.md** — the
fan base is simulation behaviour and belongs there. Nothing else; **flag anything you would have
restructured.**

## 7. Do not

- Do not push. Do not deploy.
- **Do not reinterpret `fanBaseRanges` in place** (§1).
- **Do not work in `wunderkind-backend`** — A11 is there.
- **Do not touch `TIER_FILL`**, `calculateAttendanceCount`'s fill logic, or any authored economy
  figure.
- Do not implement shared-catchment splitting (§5).
- Do not change `WORLD_PACK_VERSION` — the backend half owns that.

Before you commit, list `docs/economy-loose-ends/` for any `*-correction.md` or `*-addition.md`
newer than this brief.
