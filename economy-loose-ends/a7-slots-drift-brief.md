<!-- STATUS --> **STATUS:** ✅ A7 — gate TV reads resolved, `tv_deal` resync migration, check 9. Landed `a2697867`, DEPLOYED 2026-11-19.

---

# TASK — A7: make authored-size drift loud, and unstick the TV cache

**Backend only (`wunderkind-backend`), branch `development`, on top of `52c8b3bf`.** No app work —
**another agent is in `wunderkind-app` right now (A6) and you must not cross into it.**
**Commit; do not push, do not deploy.**

## 🟥 0. SCOPE — ENGLAND AND SCOTLAND ONLY (owner, 2026-11-19)

> *"don't worry about any leagues and countries other than England and Scotland."*

Your check may be written to compare **every** league — it costs nothing and a general rule is the
right shape — but **only EN and SC disagreements are findings.** Do not investigate, report on, or
fail the gate because of the other 23 countries. Deployed sizes in scope:

| | authored `slots` | tiers |
|---|---|---|
| EN | 16 | all 8 |
| SC | 14 | all 8 |

## 1. Code state

`git fetch origin` with explicit refspecs; confirm `development` is at **`52c8b3bf`** ("Correct an
authored league.slots that disagrees with the real size") and **in sync with origin** — verified
clean and 0/0 at 2026-11-19. Working tree must be clean; if not, stop and report.

Both repos use ICM: read `.context/CONTEXT.md` and the relevant stage's `output/` before raw source.

**Read before implementing:**
- `docs/economy-loose-ends/next-work-plan.md` — the **RULING** section (the design rule this serves),
  the **A7** section, and **"A7, second half"**. Do not re-derive what they establish.
- `src/Service/Economy/LeagueSizeResolver.php` — read the **whole** docblock. It argues at length why
  the size is authored and not derived. That argument is still correct and your task must not
  undermine it.
- `migrations/Version20261119120000.php` — its `CORRECT_SQL` constant contains the reservation rule
  you need in §3. **Reuse it; do not re-derive it.**

⚠️ **The local database is a CLONE, not the deployed box, and it has already caused one false
finding.** It read Scotland at `slots = 3` when the box was 18. Use it to verify your SQL and logic;
**never report a clone row count as a fact about the deployed world.** Say explicitly in your report
which readings are clone readings.

---

## 2. Part one — the TV cache went stale (fix this first; it is concrete)

**The defect, measured from the fresh export of 2026-11-19:**

```
EN t1  tvPoolPence     = 30000000000
EN t1  tvDeal          =  1875000000   = pool / 16   <- resolved, CORRECT
EN t1  tvDealOverride  =  1666666666   = pool / 18   <- the RAW COLUMN, STALE
```

`tvDealOverride` is B1's faithful export of the stored `league.tv_deal` column. It still encodes the
**old 18-club** division, in every league. `52c8b3bf` changed `slots` and never resynced the figure
derived from it — `syncTvDeal()` runs **only** on an admin save
(`LeagueAdminController:95`/`:201`), as the comments at `InitializeController:245` and
`SyncService:828` both state.

**Who is harmed, and who is not** — establish both in your report rather than taking this on trust:

- **Clients are fine.** All four publication sites resolve `derivedTvDealPence() ?? getTvDeal()`
  (`SyncService:826`, `InitializeController:243`, `LeagueService:302`,
  `LeagueImportExportService`). That is exactly what B1 bought.
- **The release gate is not.** `EconomyWageTableCommand:459` reads `$league->getTvDeal()` — the raw
  column — while `:460` reads the **corrected** `sizeOf()`. **The gate pairs an 18-way TV share with
  a size of 16.** Its TV checks read England's TV income **12.5% low**, and the row it prints is
  internally inconsistent: `perClub × size ≠ pool`.

**The fix, both halves:**

1. **Make the gate resolve, like everything else already does.** `EconomyWageTableCommand:459`
   becomes the same `derivedTvDealPence($league) ?? $league->getTvDeal()` chain. **This is the half
   that matters** — it removes the gate from the cache-staleness class permanently, rather than
   fixing one instance of it.
2. **Resync the column**, because it is a published cache and a future reader will hit it. A
   migration in `Version20261119120000`'s shape: stash the pre-state to a backup table, write
   `intdiv(pool, slots)`, `down()` restores from the stash.
   ⚠️ **Only where `tv_pool_pence IS NOT NULL`.** A league with no pool keeps its authored per-club
   figure untouched — that is what makes the change provably inert for those rows, and it mirrors
   `derivedTvDealPence()`'s own null-is-inert contract. Do not invent a pool for a league without
   one.

⚠️ **THE GATE WILL MOVE AND THAT IS THE PROOF.** I previously recorded B1 as leaving the gate
byte-identical and called the gate "structurally blind to B1" — same blindness, this is it. Expect
England's TV share to rise ~12.5% in the gate's arithmetic. **A byte-identical gate after this change
means you have not fixed it.** Paste the before and after for EN and SC in full.

---

## 3. Part two — nothing checks authored size against reality

**The defect.** Nothing anywhere compares authored `league.slots` against the NPC club rows that
actually exist. Verified: `grep -rni "slots" src --include="*.php"` finds no such comparison.

**The consequence, in the owner's own words** — they have stated they will be *"altering the cache
and tuning the system ahead of go live"*. Regenerate England at 20 clubs per tier while `slots = 16`
and the world pays 16-club money to a 20-club division: the TV pool divided 16 ways and handed to 20
clubs, `app:economy:wage-table` check 8's per-club divisor wrong by 25%, `clubCount` published wrong
to every client. **Silently — no error, no warning, no log line.**

**The fix.** A check in `app:economy:wage-table` — it is already the release gate, already resolves
`sizeOf()` (`:461`, `:947`), and already has the repositories in reach. Report every disagreement
with both figures and the tier.

### 🔴 3a. THE TRAP, AND IT WILL PRODUCE FALSE FINDINGS IF YOU MISS IT

**`slots` is NOT supposed to equal the row count at a country's deepest tier.** The world generator
leaves one place open for the player's club there, so `52c8b3bf` deliberately authored
`rowcount + 1` at the bottom tier where it detected a reservation. A naive `slots == rowcount` check
therefore **fires on every bottom tier in the world, by design.**

The correct comparison is already written and already dry-run-verified — `CORRECT_SQL` in
`migrations/Version20261119120000.php`:

```sql
r.rowcount + CASE
    WHEN r.tier = r.deepest
     AND above.rowcount IS NOT NULL
     AND r.rowcount = above.rowcount - 1
    THEN 1 ELSE 0 END AS target
```

**Reuse that rule.** ⚠️ **And note what it does NOT do: it does not assume the reservation exists.**
It *detects* it, per country, by testing whether the deepest tier holds exactly one fewer row than
the tier above. That mattered — assuming a universal reservation would have corrupted 6 countries'
rows when B3 was dry-run. **Do not replace the detection with an unconditional `+1`.**

⚠️ **Related, and worth stating in your report: `LeagueSizeResolver::sizeOf()`'s derive branch
*does* add `+1` unconditionally at the bottom tier.** That is latent today (nothing is at
`slots = 0`) but it is the same false assumption. Report it; **do not fix it in this task** unless
your check's logic forces the question, in which case say so and stop.

### 3b. Fail or warn — decide it, and defend the decision

There is a real argument each way and it is not obvious.

- Failing makes the gate red on a box mid-bootstrap, where disagreement is expected and harmless.
- Warning risks being the thing nobody reads.

**A suggestion to evaluate, not a requirement:** **warn** when the authored size is the larger (a
half-filled tier — normal during generation) and **fail** when the rows outnumber the slots (money is
provably being divided too few ways). If the evidence points elsewhere, say so and do what the
evidence says.

### 3c. What you must NOT do

⚠️ **Do not "fix" a disagreement by writing `slots`, and do not make `sizeOf()` prefer the row
count.** Either would reintroduce exactly the defect `LeagueSizeResolver`'s docblock exists to
prevent — *"a derived divisor moves whenever somebody clicks Generate"* — and would undo A4. **The
authored number stays authoritative. This task only makes its drift visible so a human can author a
new one.**

---

## 4. Verification

1. **`app:economy:wage-table` for EN and SC, before and after, pasted in full.** It MUST move on
   part one (§2). State the TV rows explicitly and show that `perClub × size` now equals the pool.
2. **Full `vendor/bin/phpunit`.** The documented baseline in
   `.context/stages/01_overview/output/environment.md` is **~31 pre-existing failures**, including
   two known composition-dependent flakes (`NpcClubForeignClubsCitySizeTest` and
   `NpcClubPlaceWeightingTest` — the second is **not yet in the baseline list; add it**). **Attribute
   any new failure by stashing and re-running — never by reading the assertion.**
3. **Tests for the drift check**, covering: agreement (silent), rows > slots, slots > rows, and
   **a bottom tier with a detected reservation, which must NOT be reported.** That last one is the
   trap in §3a and it needs an assertion, not an eyeball.
4. **Tests for the TV resync**, including the null-pool league that must be left untouched.
5. **Prove the migration is reversible**: migrate, roll back, re-migrate, and show the `tv_deal`
   column is identical to its start state (an md5 over the ordered column is enough — that is how
   B3 was proven).
6. **Run the drift check against the clone and report what it says** — but label it a clone reading
   (§1). The deployed box's answer is not knowable from here.

## 5. Reporting, scratch files and `.context`

⚠️ **Nothing scratch-shaped inside either repository.** Your report is
`/Users/courtneyadesile/Documents/WunderkindFactory/docs/economy-loose-ends/a7-slots-drift-report.md`.
Throwaway work and any dry-run SQL go in your own scratchpad directory. Paste commands and output
**verbatim**, never summarised.

**`.context` carries what is now true; the report carries what proves it.** Append **one** pass entry
to `.context/shared/last-sync.md` and correct stage text your change makes wrong — `04_interfaces`
for the command, `03_data` for the migration. Nothing else. Do not restructure a file, prune earlier
entries, or delete a superseded section even when it is visibly wrong: **flag it in your report.**

## 6. Do not

- Do not push. Do not deploy.
- **Do not work in `wunderkind-app` — another agent (A6) is in that repo right now.**
- **Do not touch any authored economy figure** — turnover, ratio ladders, sponsor bands, TV pools,
  payout ladders, ability ranges. You are fixing a stale cache and adding a check.
- **Do not change `WORLD_PACK_VERSION`.** Neither half is a pack-shape change; if you think one is,
  stop and report.
- **Do not edit or relax any existing check** in `EconomyWageTableCommand`. You are adding one and
  correcting one TV read.
- **Do not author `slots`, and do not make `sizeOf()` read rows** (§3c).
- Do not report on countries other than EN and SC (§0).

Before you commit, list `docs/economy-loose-ends/` for any `*-correction.md` or `*-addition.md` newer
than this brief — twice on 2026-11-19 a brief was superseded after the agent had started, and one
agent committed before the correction arrived.
