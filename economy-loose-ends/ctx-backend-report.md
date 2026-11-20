<!-- STATUS --> **STATUS:** ✅ DONE — `wunderkind-backend/.context` brought current, 2026-11-20 night.

# `.context` documentation pass — `wunderkind-backend` only

**Scope honoured:** documentation only. **No application code was changed, no migration was run,
no database was touched.** Every schema fact below was confirmed by reading the migration file and
the entity, as the brief required. Nothing was restructured, pruned or deleted; superseded text was
either corrected in place or kept with the correction beside it. Curation is left to the PM.

**Epistemic marking, per the standing notes:** everything in §1 and §2 I verified by reading the
commit diff and the current source at `development` HEAD (`c11c7f2d`). §4 is what I *believe* is
wrong and did not feel entitled to rewrite. Where I state a measurement I did not take, I name the
session that took it.

---

## 1. What I changed

### 1a. Country scaling (`c11c7f2d`) — the largest gap, because that commit touched no stage

⚠️ **`c11c7f2d` updated only `.context/shared/last-sync.md`.** Every stage claim it invalidated was
still standing when I started. Its own last-sync entry flagged two for the PM and had checked one.

| file | what it said | what it says now |
|---|---|---|
| `04_interfaces/services.md` | `LeaguePayoutResolver` resolves an explicit prize/pot override **"verbatim — no ratio, no country factor"** | Retired. An explicit figure is a **baseline-country** figure, scaled via `scaleExplicit()`. Kept the old wording as the struck claim, with the measurement that justifies striking it: **196 of 196 live leagues hold a non-null override and every one is a cascaded copy of the country-blind tier default** (country-scaling session), so "verbatim" was defeating the factor for the whole world rather than preserving one hand-authored division. Recorded the real cost: the admin's per-league override field now means *"in England's terms."* |
| `04_interfaces/services.md` | check 6 is **"the only guard on `league.tv_deal`, the one money figure the country factor never reaches"**, and it *"reports what to author"* | 🔴 **Reversed.** Hand-authoring a pre-scaled per-country table — what the old check told an operator to do — **would now scale twice**. Old paragraph kept as the history that explains the check's name. Struck "the one money figure the country factor never reaches": there is no such figure after this commit. What is left unscaled is facilities, upkeep and ground cost, by the owner's ruling, with the known consequence that Scottish clubs read insolvent. |
| `04_interfaces/services.md` | `derivedTvDealPence()` divides `getTvPoolPence()` | It divides `tvPoolPenceFor()`, **the scaled pool**. Documented both new methods, the ⚠️ *publish this, never `getTvPoolPence()`* rule (the `pool ÷ clubs == tvDeal` invariant holds only while both sides are the same figure), the deliberate raw-pool exception for the admin editor and the export, the legacy unpooled `tvDealFor()` branch, the mid-bootstrap case that must not scale twice, and that **a `league.tv_deal` cache written before this commit holds the unscaled derivation**, so check 9 will flag SC rows until they are re-saved. |
| `04_interfaces/services.md`, `03_data/entities.md` | the youth scholarship ladder, with no country dimension | The anchor and floor are scaled. **Recorded why it was country-blind BY CONSTRUCTION rather than by omission** — the factor cancels in `anchor × avg(tier) / avg(tier 1)`, so Scotland paid England's figure at every tier (measured live at 150000 on both) — plus the 1p anchor floor that stops a small factor scaling an authored anchor into reading as unauthored. |
| `03_data/entities.md` | the parachute is **"SERVED VERBATIM — a schema-agnostic passthrough … publishes it without reading inside"** | Narrowed **by exactly one key**. `parachuteFor()` scales `perSeasonPence` and passes every other key through; a non-integer entry is left alone rather than coerced; a block without that key comes back as stored. ⚠️ **The passthrough argument itself is NOT withdrawn** — the app still owns the schedule's shape and execution — and I said so, because the obvious next edit is to delete an argument that is still correct. |
| `04_interfaces/services.md` | the export's three resolved keys (2026-11-19 note) | Noted all three are now country-scaled, **including the override case**, while the raw `prizeMoneyOverride` / `leaguePositionPotOverride` / `tvDealOverride` / `tvPoolPence` / `parachute` keys stay unscaled — which is what keeps the round-trip exact, since `import()` reads only those. |
| `04_interfaces/services.md` | `WorldOverviewService` — three lines, no economy involvement | It takes `LeagueSizeResolver` now and serves scaled TV figures. ⚠️ **Flagged its one-hour cache**, so nobody reads a stale overview as evidence that scaling did not apply. |
| `07_synthesis/current-focus.md` | *"the verbatim parachute passthrough"* | "Verbatim" struck, with a pointer. |

### 1b. Staff ability bands (`a818a60b`) and the pack version

A25 had already written thorough entries in `03_data/entities.md`, `03_data/migrations.md` and
`04_interfaces/services.md`. **I checked those against the source and found them accurate** — they
are not re-reported here. What was still wrong was elsewhere:

- 🔴 **`07_synthesis/architecture-notes.md` trap 3b described the workaround as the design.** It
  read *"For staff, ability comes from the club's band (`StaffGenerationService::build()`'s
  `$abilityRange`)"* — which is precisely the defect A25 removed, and the parameter no longer
  exists. Corrected, with the reason the parameter was **removed rather than defaulted to null** (a
  caller that can pass a band can pass the wrong one; leaving the hole open is how the workaround
  survived) and the reason it mattered: the player band is **POTENTIAL** and a staff member has no
  potential half, so both sides of every staff-vs-player comparison were different quantities.
- **`02_architecture/structure.md`** — `StaffAbilityRangeService` recorded beside its player twin
  `StarterAbilityRangeService`, with the **STAFF ABILITY BANDS** grid on the **existing**
  `/admin/staff-pool-config` screen. ⚠️ **No new route and no new entity** — I checked: it posts to
  the existing `admin_staff_pool_config_save`, so `04_interfaces/routes.md` needed **no change**
  and I made none.
- **`04_interfaces/controllers.md`** — the `PoolConfigController` entry (two generic lines) gained
  the grid, and the point that `coach_ability_min/max` is **narrowed to the untiered shared hire
  market, not dead config**.
- 🔴 **`04_interfaces/services.md` said `WORLD_PACK_VERSION` is 11. The constant is 14.** Noted in
  place that **this line has now been stale twice** (it read 9 while the constant was 10), which is
  the argument for reading `WorldInitializationService:277` rather than the mirror. Recorded v12,
  v13 and v14 as ability-shaped census content, so v11's *"last bump money will ever cause"* claim
  **stands as written**.
- ⚠️ **But I qualified that claim in three places** (`services.md` twice,
  `01_overview/tribal-knowledge.md`), because taken literally it is a trap: *"re-authoring any
  figure the wage model reads needs no bump"* is a claim about **PRICE**, not a general licence. A
  pack's census content is still frozen at build time, so **re-authoring
  `pool_config.staff_ability_ranges` reaches a cached country only through a rebuild** — and the
  13 → 14 bump is what delivered A25's fix to a device at all, since nothing re-derives a generated
  staff member the way `app:backfill-scout-abilities` re-derives a scout's `ability`. Ability is an
  input to a wage, so an ability-authoring change moves money with no money in the pack.

### 1c. Test counts and the 3,290 discrepancy — `01_overview/environment.md`

New section, **"Test COUNTS through 2026-11-20 — and one unexplained gap that is still open"**, with
every count attributed to the session that measured it and **the commit named beside each**:

| commit | collected/run | failures | errors | wall-clock | measured by |
|---|---|---|---|---|---|
| `6c5e4ad5` | 3,271 | 3 | — | — | A24 |
| `a818a60b` | 3,290 | 3 (same three, by name) | — | — | A25, twice |
| `a818a60b` | **3,359** | 3 | 1 | 292 s | country-scaling session, re-measured on a quiet machine |
| `c11c7f2d` | 3,366 | 3 | 1 | 301 s | country-scaling session |

🔴 **The 69-test gap at the same commit is recorded as OPEN and UNEXPLAINED. I did not pick one.**
The file now says both figures claim the same tree, so one of them is wrong and **it is not yet
known which**; the two candidate explanations on the record (a different counting convention, a
different checkout state) are named as unverified. ⚠️ **I did not re-run the suite to adjudicate
it** — the brief is documentation-only, another session is writing the app repo, and the standing
notes are explicit that a count taken in these conditions would add a fourth unattributable figure
rather than settle the three that exist.

Also recorded in that file, because they are what let the figure be misread in the first place:

- **This file is the OWNER of the three-to-five range** — the app's `environment.md` defers to it —
  and **the range is about FAILURES, never a test COUNT, and never about `npm test`** (where the
  baseline is zero on an idle machine). Three sessions in one day judged `npm test` against this
  backend figure.
- **Re-measure the baseline yourself at the commit you are building on and quote your own figure.**
  That is what surfaced the gap instead of absorbing it: `3,359 + 7 = 3,366` reconciles exactly,
  where reconciling against 3,290 would have read as a spurious **+76**.
- **Contention moves timing, not a count** — so "the machine was busy" is not available as an
  explanation for a count that does not reconcile.
- ⚠️ **A narrower OOM exclusion exists and keeps 71 of 72 tests.** The section below it filters the
  whole of `AdminShellCoverageTest`; only `::testThePageIsOnTheRedesignedShell"admin_logs"` actually
  OOMs, reading all **4,108,724,354 bytes** of `var/log/dev.log` into a 3.828 GiB container. That is
  why the counts above are higher than the documented 3,233. The fix is log rotation, not a code
  change, and `var/log/` also holds a 2.0 GB `.bak`.
- **Always pass `--colors=never` when you intend to read the summary numbers.**

### 1d. The two operational facts

Written as their own section in `01_overview/deployment.md`, immediately after the paragraph that
claimed a `WORLD_PACK_VERSION` bump is **self-healing** — which is the sentence they falsify on dev,
so I amended its "two things make this self-healing" to "were supposed to" rather than leaving the
two facts to contradict it from elsewhere. Pointers added from
`02_architecture/structure.md` (at `worldpack-maintain.sh` and at `docker/supervisord.conf`) and from
`07_synthesis/architecture-notes.md`'s "Keeping the buffer stocked", so a reader who reaches the
async machinery from any direction meets the caveat.

1. 🔴 **The admin rebuild spares CLAIMED sets by design** (`deleteUnclaimed`), and that protection
   is correct. After a day of testing every set is claimed, so it **deletes nothing, reports
   success, and the stale packs survive** — reading `EN 2/2 STALE 8/8`, which looks like a *failed*
   rebuild rather than a *skipped* one. ✅ `php bin/console app:worldpack:warm <CC>` builds inline
   and works. The per-set `force` delete is the admin route, and it breaks the world of whatever
   save claimed it. Carried the general lesson too: **when a destructive operation protects a class
   of data, check whether what you are fixing is entirely inside the protected class.**
2. 🔴 **On the dev stack the async build does not run at all.** Recorded what is TRUE so it is not
   re-investigated — the version is stamped correctly, `deficit()` is version-aware, **`crond` IS
   running** (`crond -f -l 8`, PID 103), dispatch succeeds — and that **nothing is ever written**,
   cause unknown, defect in the consumer or handler on that stack. Recorded that three theories
   were disproved and the answer came from running the inline command, not from reasoning about
   symptoms.
   ⚠️ **`supervisorctl` cannot work on that image**: `docker/supervisord.conf` defines no
   `[unix_http_server]` and no `[supervisorctl]`, so "no such file" is **by construction, not a
   fault** — use `docker exec <container> ps aux`. Recorded in both `deployment.md` and
   `structure.md`, the latter beside the supervisord entry where someone would go looking.

### 1e. One thing I added that was not in the brief

**`03_data/migrations.md` had no entry for `Version20261120110000`** (`d8376d94`, `bond_decay_floor`
50 → 20). I found it by diffing `migrations/` against the document, not from the brief. It was the
**only** migration on disk with no entry — everything else through `Version20261120150000` is
recorded. Added, from the migration's own docblock, with the entry marked as added by this pass
rather than by the commit that shipped it. The part worth keeping is the trap: the app's
`DEFAULT_GAME_CONFIG.bondDecayFloor` was already 20 **with a docblock explaining exactly why**, but
that constant is a pre-sync fallback and a synced value always beats it, so the app's documentation
had been describing the losing side of a two-source disagreement — the same "never read a config
value off a repo's default" trap as the rest of the day.

---

## 2. What was already right, and I confirmed rather than touched

- **`03_data/migrations.md`'s `Version20261120150000` entry** (A25) — checked against the migration
  file. Accurate and thorough, including the `wunderkind_test` hand-application warning, the
  measured `[0.45×, 0.85×]` seed, the "fit, not a law" caveat, the depth-from-the-player-table rule,
  the `LEAST`/`GREATEST` guard against a transposed admin row, and the no-backfill reasoning.
- **`03_data/migrations.md`'s `Version20261120120000` entry** and the v12 → v13 pairing.
- **`03_data/entities.md`'s `staffAbilityRanges` entry** — column, default, resolver, scale, depth,
  admin location all correct.
- **`04_interfaces/services.md`'s `StaffAbilityRangeService` entry** (~96 lines) — correct,
  including the `coachAbilityMin/Max`-is-narrowed-not-retired point.
- **`04_interfaces/services.md`'s scout entries** from `c05d54a7` / `6c5e4ad5` / `3e1555c5` —
  including the quoted-and-corrected "override or derivation" paragraph, which is exactly the
  convention the standing notes ask for.
- **`04_interfaces/routes.md`** — needed no change: the STAFF ABILITY BANDS grid adds no route.
- **`03_data/schema.md`** — lists tables, not columns, so the new column needs no entry there.
- **`CLAUDE.md` does not exist in this repo.** `AGENTS.md` is the gitignored pointer and it is
  generic — it carries **no figures at all**, only routing prose. ⚠️ **So no re-mirror was needed**
  and none was done. The brief's instruction was conditional and the condition is false.

---

## 3. One place I deliberately did not follow the brief's expectation

The brief said the country-scaling session flagged that **`services.md` may still say the parachute
is served verbatim**. ⚠️ **`services.md` does not mention the parachute at all** — I grepped the
whole of `.context`. The "served verbatim" claim about the parachute is in
**`03_data/entities.md`**, and what `services.md` carried was the *sibling* claim, that a prize/pot
**override** is used verbatim with no country factor. **Both were wrong and both are corrected**, so
the flag found a real defect under a slightly wrong address. Saying so because the next person
checking this will otherwise go looking in `services.md` for a sentence that was never there.

---

## 4. ⚠️ What I believe is wrong but did not rewrite — for the PM

Marked as belief, not measurement, except where noted.

1. 🔴 **`07_synthesis/current-focus.md` is a journal, not a current focus.** Its top heading is
   *"DONE in the working tree, 2026-11-18 — R2 is AUTHORED (not committed, not pushed)"* — work that
   has since been committed and deployed — while `CONTEXT.md` routes *"What's actively being worked
   on"* here. **It does not describe 2026-11-20 at all**: not the day's five commits, not the open
   Scottish squad-pricing defect, not the parked calibration items. I corrected only the one factual
   claim inside it that today's commits falsified (the parachute line) and left the structure alone,
   per the brief. **This is the single biggest piece of curation outstanding** and it is yours: it
   needs a rewrite, not a correction, and `START-HERE.md` is currently the more honest account of
   the same question.
2. **`04_interfaces/services.md` cross-references `CLAUDE.md`** — *"See 'Centralized User Ledger' in
   CLAUDE.md"* — a file that does not exist in this repo and is gitignored by design, so the pointer
   is dangling for every reader. Not caused by today's work, and I did not know what it was meant to
   point at, so I left it.
3. **`01_overview/environment.md`'s known-failures section is dated 2026-11-16** and opens *"is
   ~3,181 tests with FOUR failures"*, which is now four counts out of date. I added the counts
   section rather than editing that line, because the failure *list* underneath it is still the live
   baseline and I did not want to touch the sentence that introduces it. The heading date and that
   opening count want reconciling by whoever owns the file.
4. **`04_interfaces/services.md` is 2,240 lines and `03_data/entities.md` is 1,750.** Several
   sections are now three or four layers of correction-beside-superseded-text deep — correct, and
   genuinely valuable as the record of *why*, but the newest reader reaches the current truth last.
   The convention is right; the files may be past the point where it scales. **This is an
   observation, not a recommendation** — compressing them is exactly the curation the brief reserves
   to you, and doing it wrong would destroy the reasoning that makes them worth reading.
5. **Not verified by me:** every figure I recorded in §1c came from the two reports named there. I
   read the reports and the evidence filenames; **I did not re-run the suite**, so I cannot say from
   my own measurement which of 3,290 and 3,359 is right — which is the reason the file records the
   gap instead of resolving it.

---

## 5. Commit

Documentation paths only, staged by explicit path, on `development`. **Not pushed, not deployed.**
SHA is at the top of the message relayed with this report.

**Files:** `.context/shared/last-sync.md` (one appended pass entry, append-only),
`.context/stages/01_overview/output/{deployment,environment,tribal-knowledge}.md`,
`.context/stages/02_architecture/output/structure.md`,
`.context/stages/03_data/output/{entities,migrations}.md`,
`.context/stages/04_interfaces/output/{controllers,services}.md`,
`.context/stages/07_synthesis/output/{architecture-notes,current-focus}.md`.
