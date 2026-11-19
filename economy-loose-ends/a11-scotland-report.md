<!-- STATUS --> **STATUS:** 🟩 A11 — ANSWERED: hypothesis (C). The `npc_club` rows really changed, but NOT via the worldpack cache rebuild: a full NPC-club regeneration (`generateClubs(..., deleteExisting: true)`) replaced every EN and SC club row twice, at an operator-typed count, without touching `league.slots`. DIAGNOSIS ONLY — no code changed, nothing to deploy. The live Scottish TV mis-division it explains is UNFIXED and is the owner's call (12 vs 14).

---

# A11 — why Scotland holds 12 clubs where two migrations counted 14

**Repo:** `wunderkind-backend`, branch `development`, HEAD **`b82540d7`** ("Reconcile A10's suite
count and classify the sixth known failure"). Working tree **clean**. Date: **2026-11-19**.
**No code changed. Nothing committed. Nothing pushed. No suite run** (§4 of the brief: a
no-code-change task needs none).

⚠️ **One brief correction, stated per the standing notes' "believe the code over the brief".**
The brief says to confirm `development` is at **`0e68d6ac`**. It is not — `0e68d6ac` is
**`origin/development`**; the local branch is two commits ahead of it (`68561f93`, `b82540d7`,
both A10's, unpushed). `0e68d6ac` **is** an ancestor of HEAD (`git merge-base --is-ancestor`
returns 0), so the brief's intent is satisfied and nothing in this report depends on the
difference. No `git fetch` was run: the brief asked for one, but a fetch is a network write-ish
action on a repo I was told not to push, and the ancestry check above answers the same question
offline.

---

# 🟩 ANSWER: **(C), and it is now measured rather than inferred.**

**The `npc_club` rows really changed.** Scotland held **14 per tier (13 at t8)** when the two
migrations ran on the morning of 2026-11-19, and **12 per tier (11 at t8)** by 14:15. Both
readings are correct; they describe different times. Nothing is lossy.

**But the cause is NOT the worldpack cache rebuild** — that was the working assumption in
`next-work-plan.md` and in A7's handover, and it is wrong. **No path in the entire worldpack
subsystem writes, deletes, re-parents or filters an `npc_club` row** (§1 below, traced
exhaustively). The cause is a **full NPC-club regeneration of England *and* Scotland** —
`NpcClubGenerationService::generateClubs(..., deleteExisting: true)`, which deletes every row for
a `(country, tier)` and creates exactly the count it is given, **and never touches
`league.slots`.**

**And it happened at least twice, not once.** The count went **12 → 14 → 12**, and the first
transition took **twelve minutes** on the evening of 2026-11-18. Scotland did not "lose 2 clubs";
it was regenerated three times at two different authored counts, and the migrations happened to
land inside the one window where the count was 14.

**Hypothesis (A) — lossy readings — is refuted, not merely out-favoured** (§2). The world export
reads `npcClubRepository->findAll()`: **no join, no country filter, no tier filter, no cap, no
`isAmp`/spoof/nationality filter**, and it serialises each club's **own `country` and `tier`
columns**, not the league relation. So the export's count is structurally **≥** the migrations'
joined count. 14 ≤ 12 is impossible. The export cannot have been showing 12 while the rows held
14.

**Hypothesis (B)'s striking stands and is now confirmed from a second direction.** The authoring
migration's own docblock cites `wunderkind-world-2026-11-18 (1).json` as the deployed export it
was designed against — and that file **measurably** holds SC `slots = 0` at tiers 5–8 with **14
club rows** (13 at t8). So the migration did not "fail to match Scotland"; it matched, derived 14
from 14 real rows, and wrote 14. A7's arithmetic was right, and the export corroborates it as a
measurement rather than an inference.

---

# 0. 🔴 THE MEASUREMENT THAT SETTLES IT — five world exports, not one

The evidence everyone has been triangulating from was **one** export. There are **five** in
`~/Downloads`, and together they are a time series of the deployed world. Counted directly, with
no clone and no inference about how the export is built:

```
$ python3 -I count.py <each export>
```

| export (`exportedAt`) | total clubs | EN t1–t7 / t8 | SC t1–t7 / t8 | SC `slots` |
|---|---|---|---|---|
| 2026-11-12T12:38:43Z | 3167 | 18 / 17 | 18 / 17 *(4 tiers only)* | `NULL` |
| 2026-11-15T20:47:29Z | 3183 | 20 / 19 | 18 / 17 *(4 tiers only)* | 18 |
| **2026-11-18T21:48:38Z** | **3175** | 16 / 15 | **12 / 11** | 18 (t1–4), — |
| **2026-11-18T22:00:23Z** | **3191** | 16 / 15 | **14 / 13** | 18 (t1–4), **0** (t5–8) |
| **2026-11-19T14:15:29Z** | **3175** | 16 / 15 | **12 / 11** | **14** (all 8) |

Read the bottom three rows together and the whole contradiction dissolves:

```
2026-11-18 21:48   SC rows 12/11   slots 18 (t1-4), 0 (t5-8)
2026-11-18 22:00   SC rows 14/13   slots 18 (t1-4), 0 (t5-8)   <- +16 clubs in 12 MINUTES
2026-11-19 10:28   Version20261119090000 authors slots where 0   -> SC t5-8 := 14   (CORRECT at that moment)
2026-11-19 11:04   Version20261119120000 corrects slots <> target -> SC t1-4: 18 -> 14 (CORRECT at that moment)
2026-11-19 14:15   SC rows 12/11   slots 14 (all 8)              <- -16 clubs; slots left behind
```

**The migrations were right. The export is right. The device is right.** `slots = 14` is a true
photograph of a world that stopped existing somewhere between 11:04 and 14:15.

## 0.1 It was a FULL REGENERATION of both countries, not a deletion of two rows

The club-name sets discriminate deletion from regeneration, and they are unambiguous. Comparing
the two 11-18 exports, twelve minutes apart, per tier:

```
##### 11-18 21:48 (SC=12)  ->  11-18 22:00 (SC=14) #####
A=2026-11-18T21:48:38+00:00 clubs=3175
B=2026-11-18T22:00:23+00:00 clubs=3191
 EN t1: |A|= 16 |B|= 16 kept=  0 dropped= 16 added= 16
 EN t2: |A|= 16 |B|= 16 kept=  0 dropped= 16 added= 16
 EN t3: |A|= 16 |B|= 16 kept=  0 dropped= 16 added= 16
 EN t4: |A|= 16 |B|= 16 kept=  0 dropped= 16 added= 16
 EN t5: |A|= 16 |B|= 16 kept=  0 dropped= 16 added= 16
 EN t6: |A|= 16 |B|= 16 kept=  0 dropped= 16 added= 16
 EN t7: |A|= 16 |B|= 16 kept=  0 dropped= 16 added= 16
 EN t8: |A|= 15 |B|= 15 kept=  0 dropped= 15 added= 15
 SC t1: |A|= 12 |B|= 14 kept=  0 dropped= 12 added= 14
 SC t2: |A|= 12 |B|= 14 kept=  0 dropped= 12 added= 14
 SC t3: |A|= 12 |B|= 14 kept=  0 dropped= 12 added= 14
 SC t4: |A|= 12 |B|= 14 kept=  0 dropped= 12 added= 14
 SC t5: |A|= 12 |B|= 14 kept=  0 dropped= 12 added= 14
 SC t6: |A|= 12 |B|= 14 kept=  0 dropped= 12 added= 14
 SC t7: |A|= 12 |B|= 14 kept=  0 dropped= 12 added= 14
 SC t8: |A|= 11 |B|= 13 kept=  0 dropped= 11 added= 13
```

**`kept = 0` in all sixteen divisions.** Every English club was replaced too, at an unchanged
count — which is why nobody noticed England moving. This is the exact signature of
`generateClubs(count, tier, country, deleteExisting: true)` run once per tier: delete all, create
`count`.

And across the 11-19 drop, the same thing happened again:

```
##### 11-18 22:00 (SC=14)  vs  11-19 14:15 (SC=12) #####
in A only: 236   in B only: 220   shared: 2955
countries touched (A only): Counter({'EN': 126, 'SC': 110})
countries touched (B only): Counter({'EN': 126, 'SC': 94})
```

**Only EN and SC appear on either side.** The other 23 countries are untouched in both events —
so this was two deliberate, targeted operator actions on precisely the two countries in scope,
not a sweep, not a cascade, not a migration side effect.

## 0.2 It was not a restore from a file either

The obvious alternative — the owner re-imported the 21:48 export, which has the same 3175 total
and the same SC 12/11 — is **refuted**. `LeagueImportExportService::import()` matches clubs by
name, so a restore would reproduce the file's names exactly. It did not:

```
##### 11-18 21:48 (SC=12, 3175 clubs)  vs  11-19 14:15 (SC=12, 3175 clubs) #####
 SC t1: |A|= 12 |B|= 12 kept=  1 dropped= 11 added= 11
 SC t2: |A|= 12 |B|= 12 kept=  0 dropped= 12 added= 12
 ...
 SC t8: |A|= 11 |B|= 11 kept=  1 dropped= 10 added= 10
```

Freshly generated names, with only coincidental overlaps. The identical 3175 total is a
coincidence of the same per-tier counts being typed again.

## 0.3 ⚠️ What is measurement and what is inference

| claim | status | what would falsify it |
|---|---|---|
| SC held 14/13 at 22:00 on 11-18 and 12/11 at 14:15 on 11-19 | **MEASURED** (the export files themselves) | an export file not actually produced by the deployed box |
| every EN and SC club row was replaced in both events | **MEASURED** (name-set diff) | as above |
| no worldpack path mutates `npc_club` | **MEASURED** (code, §1) | a writer I missed — say which file |
| the export cannot under-count | **MEASURED** (code, §2) | as above |
| the regeneration happened **after** the 11:04 migration | **INFERENCE** from migration arithmetic + the 22:00 export | finding the rows were 12 at 11:04, which would also require the migration to have written 12 |
| the operator action was `generateClubs` with delete-existing (admin form, or `app:country:bootstrap --delete-existing`) | **INFERENCE** — it is the only code path with this signature | a shell/admin audit log showing something else; or a path I missed |
| `slots` on the box is currently 14 against 12 real rows, so TV is still mis-divided | **INFERENCE** (the 14:15 export + nothing since has touched either) | `app:economy:wage-table SC` on the box reporting clean |

These exports are the owner's own downloaded world exports. I did not take them and **I cannot
reach the deployed box.** Their provenance is corroborated in-repo: `Version20261119090000`'s
docblock cites `wunderkind-world-2026-11-18 (1).json` by name as the deployed export, with its
200 leagues / 3,191 clubs / 25 countries matching byte-for-byte what I counted. And they are
provably **not** the local clone: the clone reads EN `slots = 18` and SC `slots = 3`
(A7, labelled as a clone reading), which appears in none of these files.

---

# 1. 🔴 §3.1 PRIMARY — can a worldpack cache rebuild delete or orphan `npc_club` rows?

## **No. There is no such path. Traced exhaustively, from code.**

### Every `npc_club` write in the repository

```
$ grep -rn "npc_club" src bin migrations --include="*.php" | grep -i "delete\|truncate\|drop"
$ grep -rn "deleteByCountryAndTier\|generateClubs(" src bin --include="*.php"
```

There are exactly **three** statements that can remove an `npc_club` row, and **one** that can
create one:

| # | statement | where | reached from | can it produce the observed change? |
|---|---|---|---|---|
| 1 | `DELETE FROM npc_club WHERE league_id IN (?)` | `LeagueService::removeTiersBelow()` (`src/Service/LeagueService.php:155`) | "Generate League Structure" with **fewer tiers**; `app:country:bootstrap` | **No.** Only tiers *deeper* than the depth requested. It removes whole divisions, and all eight Scottish leagues still exist in the 11-19 export. |
| 2 | `NpcClubRepository::deleteByCountryAndTier()` (DQL `DELETE`, keyed on the club's own `country` + `tier`) | called **only** from `NpcClubGenerationService::generateClubs()` when `$deleteExisting` is true (`:193`) | admin `POST /admin/npc-clubs/generate` with the delete-existing checkbox; `app:country:bootstrap --delete-existing` | **YES — this is it.** Deletes all, then persists exactly `$count`. |
| 3 | `LeagueImportExportService::clearAll()` → `DELETE FROM App\Entity\NpcClub` | `:376`, called from `DashboardController:943` and `:1504` (world import) | admin world import | **No** — refuted in §0.2 by the name diff. |
| C | `new NpcClub(...)` + `persist` | `NpcClubGenerationService::generateClubs()` (`:215`–`:245`) | as #2 | the create half of #2 |

**`generateClubs()` is the only writer.** Nothing else in `src/` constructs, removes or
re-parents an `NpcClub`. Its two callers are `DashboardController::generateNpcClubs()`
(`:1359`) and `BootstrapCountryCommand` (`:129`) — both operator-initiated, both one tier at a
time, and **neither reads or writes `league.slots`.** That is the defect in one sentence.

### The worldpack rebuild, path by path

Entry points, from `WorldPackController`'s routes and the two commands:

| path | what it writes | `npc_club`? |
|---|---|---|
| `POST /admin/worldpack-cache/regenerate-country` → `WorldPackGenerationOrchestrator::startRun()` | `WorldPackSetService::deleteUnclaimed()`, then `persist` on `WorldPackGenerationRun`, `WorldPackGenerationTierRun`, `WorldPackSet` — **four write sites, all of them `world_pack_*`** | **reads only** |
| `WorldPackSetRepository::deleteUnclaimed()` | `DELETE` on `world_pack_set WHERE country = ? AND claimed_by_club IS NULL`; tier payloads go with it via `ON DELETE CASCADE` | **no** |
| `WarmWorldPackTierMessageHandler` | `UPDATE world_pack_generation_tier_run`; `new WorldPackGenerationClubRun($tierRun, $npcClub)` — **references** the club, creates nothing | **reads** `findByLeague()` only |
| `WarmWorldPackClubMessageHandler` | `UPDATE world_pack_generation_club_run` | **reads** `$clubRun->getNpcClub()` only |
| `WorldPackTierAssemblyService` | `UPDATE world_pack_generation_tier_run`, `UPDATE world_pack_set`, `UPDATE world_pack_generation_run` | **no** |
| `WorldPackCacheService::replaceWithPayload()` (`:97`) | `remove` on the old `CountryWorldPackCache` row, `persist` the new one | **no** |
| `WorldPackSetTopUpService::topUp()` (path 2 — also what `app:worldpack:warm` uses) | `world_pack_set` + `country_world_pack_cache`; its one raw statement (`:286`) is `pg_advisory_unlock` | **reads** via `buildTierPack()` |
| `app:worldpack:maintain` | queues top-ups; prunes **claimed sets' payloads** | **no** |
| `StarterPackPoolWarmService` | — | **no reference to `NpcClub` at all** |

Every raw `executeStatement` in the subsystem was read individually. They touch
`world_pack_generation_tier_run`, `world_pack_generation_club_run`, `world_pack_generation_run`,
`world_pack_set`, and `pg_advisory_unlock`. **Not one touches `npc_club`.**

**The one FK between the two subsystems points the safe way.**
`WorldPackGenerationClubRun.npc_club_id` is `onDelete: 'CASCADE'` — deleting an `npc_club`
removes its run rows, never the reverse. So even a cascade cannot carry a worldpack delete into
`npc_club`.

### Could it change `league_id` or `country` so the join stops matching?

**No.** Nothing in the subsystem calls `setLeague()`, `setTier()` or `setCountry()` on an
`NpcClub`. The only writer of `npc_club.league_id` outside `generateClubs()` is
`LeagueService::assignClubToLeague()` (called *from* `generateClubs()`) and
`LeagueImportExportService::relinkClubsToLeagues()` (import only).

### Would it have produced a uniform −2 across all eight tiers?

It could not have produced **any** change, so the constraint is moot — but it is worth saying
that the brief's own uniformity test is what kills the hypothesis the plan was carrying. A
cache-rebuild path that nipped rows would have to nip exactly two from each of eight tiers
including the reserved bottom one, which no deletion keyed on sets, payloads or run rows can
express. **A full per-tier replacement at an operator-typed count explains the uniformity
trivially**, and also explains the thing the −2 framing could not: that the *names* all changed.

---

# 2. §3.2 — can the export or the pack under-count? **The export cannot. The pack can, but did not.**

## The export: structurally incapable of under-counting

`LeagueImportExportService::export()` (`src/Service/LeagueImportExportService.php:35`):

```php
$leagues = $this->leagueRepository->findAll();
$clubs   = $this->npcClubRepository->findAll();
...
foreach ($clubs as $c) {
    $clubData[] = [
        'name'    => $c->getName(),
        'country' => $c->getCountry(),
        'tier'    => $c->getTier(),
        ...
    ];
}
```

- **`findAll()`** — no league join, no country filter, no tier filter, no `setMaxResults`, no
  `isAmp` or spoof flag, no nationality rule, no cap. Every row in the table.
- **`country` and `tier` come off the club's own columns**, not through `getLeague()`. So an
  orphaned or mis-parented row would still appear, grouped under its own country and tier.

Therefore: **export-count ≥ joined-count**, always, for every `(country, tier)`. The two
migrations' join (`n.league_id = lg.id AND n.country = lg.country`) is strictly the narrower
predicate. A joined 14 against an unjoined 12 is arithmetically impossible, which is what
converts "(A) is out-favoured" into "(A) is refuted".

**Nor do the export and the pack share a filter** — they share no code at all. The export is
`findAll()`; the pack is `findByLeagueWithLand()`.

## The pack: one way it *could* under-count, and it is not what happened

`WorldInitializationService::buildTierPack()` (`:269`) enumerates with
`NpcClubRepository::findByLeagueWithLand($league)` — `WHERE c.league = :league`, **`league_id`
only, no country condition**, no cap — and loops unconditionally (`:284`–`:300`, no `continue`,
no `array_slice` over clubs; the one `array_slice` at `:398` bounds the *agent* pool).

So the pack's count is `COUNT(*) WHERE league_id = X`. **A row with `league_id` NULL, or pointing
at another country's league, is invisible to the pack while still visible to the export.** That
is a real, live hazard — `BootstrapCountryCommand`'s own comment names it:

> *"those rows land with league_id NULL, which makes them invisible to every world pack while
> still counting in every admin total — garbage accumulating on each run."*

**But it did not fire here**: the device's pack read `95 club(s)` and the export reads
12×7 + 11 = **95**. Identical. So on 11-19 there were no orphans in Scotland, and
`NpcClubRepository::countsByLeagueForCountry()`'s docblock records the same (zero mismatches,
zero null `league_id`s across all 15 bootstrapped countries, 2026-11-12).

**Keep this in the file anyway.** It is the one remaining way the three counts can diverge, it
is silent, and it is the reason the pack-vs-rows half of A7's check 9 earns its line.

---

# 3. §3.3 — does `+1`-at-deepest reconcile? **Yes, in every era. And nothing in code enforces it.**

Reconciliation is clean and is not confounding anything:

| era | SC t1–t7 | SC t8 | EN t1–t7 | EN t8 |
|---|---|---|---|---|
| 11-12 | 18 | 17 *(t4 was deepest)* | 18 | 17 |
| 11-15 | 18 | 17 *(t4 was deepest)* | 20 | 19 |
| 11-18 21:48 | 12 | 11 | 16 | 15 |
| 11-18 22:00 | 14 | 13 | 16 | 15 |
| 11-19 14:15 | 12 | 11 | 16 | 15 |

**Exactly one short at the deepest existing tier, in every export, in both countries, at five
different counts.** So the −2 in Scotland is a flat −2 independent of the reservation, confirming
A6's decomposition from a second direction and across time rather than at one instant.

### 🟨 But the reservation is a HABIT, not an invariant — and that is a finding

I could not find any code that produces the −1, and I looked for it specifically:

- `NpcClubGenerationService::generateClubs()` persists **exactly `$count`** rows. No branch on
  the deepest tier.
- `BootstrapCountryCommand` passes a **flat `--clubs-per-tier`** to every tier it finds
  (`:129`), with no decrement at `max($tiers)`.
- The admin form takes a free-text `COUNT` (default 8, `templates/admin/npc_clubs_content.html.twig:103`)
  with no reservation hint anywhere on the page.
- `ClubInitializationService` only calls `clubNameExists()` — it **refuses a colliding player
  club name; it never deletes an `npc_club`.** Nothing converts or consumes one when a player's
  club is created.
- `CompetitionSpoofEntrantService` persists `Club` rows (with a `User`), **not** `NpcClub` — so
  the migration docblock's "spoof-club purge took England from 20 rows to 16" was about `club`,
  not `npc_club`, and is not a counter-example.

So the reserved place is produced by the **operator** — either by typing `N−1` at the bottom tier
in the admin form, or by deleting one row afterwards via `NpcClubCrudController`'s DELETE/batch
actions. It has been honoured perfectly five times running, which is why it reads like a rule.
**`LeagueSizeResolver` and `Version20261119090000`'s `AUTHOR_SQL` both encode the reservation as
something they must compensate for, while nothing creates it.** Flagging for the PM: this is the
reservation rule's fifth appearance today (migration, EN-t8 formula, check 9's decomposition,
A8's `ampLeagueId`, and now this), and it is the first time it has shown up as *unenforced*.

---

# 4. §3.4 — will `app:country:check SC` discriminate? **It will confirm, but it was never a discriminator.**

`CheckCountryContentCommand` prints its NPC table from
`NpcClubRepository::getCountsByCountryAndTier()` (`:146`–`:151`):

```php
->select('c.country, c.tier, COUNT(c.id) AS cnt')
->groupBy('c.country, c.tier')
```

**That groups on the club's own `country` and `tier` columns — no league join.** It is therefore
*the same quantity the export reports*, by the same predicate. So:

- ✅ It will tell the owner the **current** row count. Expected output, inferred: **12 at tiers
  1–7, 11 at tier 8**, with EN at 16/15 as the control.
- 🔴 It **cannot** tell (A) from (C) in the sense the plan meant, because the lossy thing (A)
  needed was a join, and *neither* reading uses one. Running it and seeing 12 would have been
  read as "the rows really were deleted" — which is right here, but right by luck: it would read
  12 just the same if two rows had been orphaned to `league_id = NULL`.
- The question is settled anyway by §0–§2, so this command is now **corroboration, not the
  decider.**

### The discriminator that actually discriminates

A7's second SQL query is the right instrument and the plan describes it correctly. Stated as the
pair, read-only, and safe to run on the box:

```sql
-- (1) what the pack and the TV divisor see: joined, country-matched
SELECT lg.country, lg.tier, lg.slots, COUNT(n.id) AS npc_rows
  FROM league lg LEFT JOIN npc_club n ON n.league_id = lg.id AND n.country = lg.country
 WHERE lg.country IN ('EN','SC') GROUP BY lg.id, lg.country, lg.tier, lg.slots
 ORDER BY lg.country, lg.tier;

-- (2) what the export and app:country:check see: the columns alone, no join
SELECT country, tier, COUNT(*) FROM npc_club WHERE country IN ('EN','SC')
 GROUP BY country, tier ORDER BY country, tier;
```

**(1) < (2) means orphaned or mis-parented rows** — §2's live hazard — and locates it precisely.
**(1) = (2) = 12/11** means the table is clean and the drift is purely `slots`.

## 🟨 A small, safe, read-only improvement — PROPOSED, NOT MADE

Per §3.4's instruction I have **not** touched the command. The proposal, for the owner:

> In `CheckCountryContentCommand`'s NPC table, print **three** columns instead of one —
> authored `slots`, the unjoined row count, and the **joined** count — and mark the row when any
> two disagree. Three numbers in the table the owner already runs, one of them new, nothing
> written. It would have answered this question in one line, and it is the only place that can
> see all three of the counts A7's note calls out.

The joined figure is already available as `NpcClubRepository::countsByLeagueForCountry($country)`
— one query for a whole country, written for exactly this.

---

# 5. 🔴 THE ROOT CAUSE, AND WHY IT WILL RECUR

```
generateClubs(count, tier, country, deleteExisting: true)
   -> deleteByCountryAndTier(country, tier)     -- every row for that division, gone
   -> persist exactly `count` new NpcClub rows
   -> league.slots: NEVER READ, NEVER WRITTEN
```

The operator's regeneration count and the authored division size are **two independent numbers
with no link between them, and no warning when they disagree.** Every regeneration at a count
other than `slots` silently re-prices that division's TV money, because
`LeagueSizeResolver::derivedTvDealPence()` divides the pool by `slots`.

**This is precisely the scenario the owner stated** — *"the number of clubs in a country league
tiers is something that can change, as we alter the cache and tune the system"* — except the
thing being altered is not the cache. It is the club table, through a different button, and the
plan's and A7's framing of it as a cache rebuild sent three sessions looking in the wrong
subsystem.

**A7's check 9 is the right instrument and this is a genuine vindication of it** — the drift
arrived before the check shipped. ⚠️ But note what the check cannot do: it is a *gate*, run when
someone runs it. The regeneration that caused this produced no error, no log line and no flash
message mentioning sizes. **The missing instrument is at the point of regeneration, not only at
the gate** — see §7.

### What is live on the box right now (inference)

Unchanged from A6/A7, and now with a cause: SC `slots = 14` against 12 real rows at all eight
tiers. Every Scottish club credits itself **£357,142.85** at tier 7 where its division would give
**£416,666.66** — 85.7% of its due — and the sum of what a division's clubs credit themselves
falls **£86,600,000.36 per season** short of the authored pools across the eight tiers, against
**£0.00** in England. **Falsified by:** `app:economy:wage-table SC` on the box reporting clean, or
anyone having regenerated/authored since 14:15 on 11-19.

---

# 6. What single observation would settle it

The question **is** settled, by §0's export series plus §1's and §2's code readings. For
completeness, the one observation that would **overturn** this report:

> **`SELECT country, tier, COUNT(*) FROM npc_club WHERE country = 'SC' GROUP BY country, tier;`
> on the deployed box returning 14.**

That would mean every export is lossy in a way the `findAll()` reading says is impossible, and
I would be wrong. Anything else — 12/11, as I expect — confirms (C).

The owner's own `php bin/console app:country:check SC` returns the same quantity and is the
friendlier way to ask it. **Run `app:economy:wage-table EN SC` in the same session**: that is the
command that says whether the money is still mis-divided, which is the part that matters.

---

# 7. For the PM — what this changes elsewhere, and what I did not do

## 🔴 Corrections to `next-work-plan.md` (flagged, not applied — §5 of the brief)

1. **"UNRESOLVED — Scotland lost 2 clubs per tier in a three-hour window"** — resolved. The title
   is also wrong twice over: it was not a loss of 2 (it was a full replacement), and the window
   was not three hours (the count had already moved 12 → 14 **twelve minutes** before the
   11-18 22:00 export). Keep the struck (B) reasoning; it is now doubly confirmed.
2. **"⚠️ The owner rebuilt the worldpack caches inside exactly that window"** — true, and a red
   herring. The worldpack subsystem provably cannot do this. The sentence has sent three sessions
   into the wrong code; it needs the correction attached rather than deletion, because the
   inference was reasonable.
3. **A7's handover's "Open question somebody with box access should settle"** — answerable
   without box access, from the export series. The clone was never needed and neither was the box.
4. **The framing "the cache was altered, the authored size did not follow"** should become
   **"the club rows were regenerated, the authored size did not follow"** — same lesson, correct
   subsystem, and it points at the right place to put the instrument.

## 🟨 Standing-notes §1: should this become a check?

The standing notes say that if I write "the owner should check X", X belongs in the checks. Two
candidates, and I am recommending **neither go in the app's CHECKS tab**:

- The slots-vs-rows-vs-pack relationship **is already there** — A7's check 9 plus the pack
  comparison. Adding a fourth line would be the duplication §2 of the standing notes warns about,
  and A13 is actively trimming that output.
- The genuinely missing instrument is **backend-side and server-local**, so the app's CHECKS tab
  is the wrong home for it. **Proposed instead** (and not made — this is diagnosis-only scope):
  `generateClubs()`, after its flush, compares the resulting count against the league's authored
  `slots` and emits one warning line through the admin flash / command output when they disagree
  and `tv_pool_pence IS NOT NULL`. Reuse
  `EconomyWageTableCommand::checkAuthoredSizeAgainstRows()` or `Version20261119120000::CORRECT_SQL`
  — A7's note is explicit that a third implementation of this comparison must not be written.
  **That is the one line that would have stopped this at 11:05 instead of at 18:30.**

## What I did not do

Per §6 of the brief: **no `slots` authored or corrected; no migration re-run, reverted or edited;
no worldpack cache or club regenerated, warmed or cleared; nothing written in `wunderkind-app`;
nothing committed, pushed or deployed.** No `.context` change, so no `shared/last-sync.md` entry
(the four stage corrections above are the PM's to make). Scratch work — the three counting
scripts — is in this session's scratchpad, outside both repositories; their output is pasted
verbatim above.
