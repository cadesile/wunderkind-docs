<!-- STATUS: DONE — session a23-retire-slots, 2026-11-19. Not pushed, not deployed. -->

# A23 — `league.slots` retired; every division size derived

**Owner ruling, 2026-11-19: "Retire slots."** Implemented in both repos. England's figures are
byte-identical before and after, proved by diff. Scotland moves 14 → 12 at every tier.

- Backend: `development`, on top of `9918839c`.
- App: `new-game-save`, on top of `3569326b`.
- Verbatim evidence: `a23-run-2026-11-19/`.

---

## 1. The blast radius — ⚠️ MEASURED WIDER THAN THE BRIEF, AND IT CLOSES AN OPEN ITEM

The brief gave EN and SC and said *"the other 23 countries have NOT been checked against their
rows — out of scope, but say so in the report rather than letting it surface later."*

**I checked all 25.** It cost one script
(`a23-run-2026-11-19/measure-before-after.py`, output `measure-before-after.txt`) against
`~/Downloads/wunderkind-world-2026-11-19.json` — 200 leagues, 3,175 clubs, 25 countries.

> **24 of 25 countries are byte-identical under the derived rule. Only Scotland moves.**

Every country reserves exactly one place at its deepest tier, so `rows + 1` there and `rows`
above reproduces the authored figure precisely: AR/BR/CA/CO/DE/EN/ES/JP/KR/MX/NG/PL/PT/US 16,
BE/IN/SA/WA 14, EG/IT/TN/TR 18, FR 20. **The 23 unchecked countries are no longer an open item.**

### England — unchanged at every tier (the half that must not move)

```
 t rows | size OLD size NEW | homeG OLD homeG NEW |     tvDeal OLD     tvDeal NEW |               pool
 1   16 |       16       16 |        15        15 | £18,750,000.00 £18,750,000.00 |    £300,000,000.00
 2   16 |       16       16 |        15        15 |  £8,750,000.00  £8,750,000.00 |    £140,000,000.00
 3   16 |       16       16 |        15        15 |  £4,375,000.00  £4,375,000.00 |     £70,000,000.00
 4   16 |       16       16 |        15        15 |  £3,125,000.00  £3,125,000.00 |     £50,000,000.00
 5   16 |       16       16 |        15        15 |  £1,875,000.00  £1,875,000.00 |     £30,000,000.00
 6   16 |       16       16 |        15        15 |    £625,000.00    £625,000.00 |     £10,000,000.00
 7   16 |       16       16 |        15        15 |    £312,500.00    £312,500.00 |      £5,000,000.00
 8   15 |       16       16 |        15        15 |     £75,000.00     £75,000.00 |      £1,200,000.00
```

### Scotland — 14 → 12 at every tier

```
 t rows | size OLD size NEW | homeG OLD homeG NEW |     tvDeal OLD     tvDeal NEW |               pool
 1   12 |       14       12 |        13        11 | £21,428,571.42 £25,000,000.00 |    £300,000,000.00
 2   12 |       14       12 |        13        11 | £10,000,000.00 £11,666,666.66 |    £140,000,000.00
 3   12 |       14       12 |        13        11 |  £5,000,000.00  £5,833,333.33 |     £70,000,000.00
 4   12 |       14       12 |        13        11 |  £3,571,428.57  £4,166,666.66 |     £50,000,000.00
 5   12 |       14       12 |        13        11 |  £2,142,857.14  £2,500,000.00 |     £30,000,000.00
 6   12 |       14       12 |        13        11 |    £714,285.71    £833,333.33 |     £10,000,000.00
 7   12 |       14       12 |        13        11 |    £357,142.85    £416,666.66 |      £5,000,000.00
 8   11 |       14       12 |        13        11 |     £85,714.28    £100,000.00 |      £1,200,000.00
```

**The shortfall the old rule produced, recomputed independently of the sibling note and
agreeing with it to the penny: £86,600,000.36 a season across Scotland, £0.00 in England.**
Everywhere else the residue is `intdiv` truncation — £0.42 to £1.04 a season, i.e. pence per
club, which is the floor doing its job and not drift.

### Proof England is byte-identical, not asserted

```
$ diff variantGate-EN.BEFORE.txt variantGate-EN.AFTER.txt
   (empty)
```

The same gate, same config, same export, run on the stashed clean tree and on the change
(`a23-run-2026-11-19/variantGate-EN.{BEFORE,AFTER}.txt`). Also pinned as a unit test:
`EconomyDerivedSizeDriftTest::testTheDeployedEnglandShapeIsUnchangedAndEntirelyClean` asserts all
eight English tiers resolve to 16 with no finding of any kind.

⚠️ **The Scottish variant gate could not be run** — `loadExport` refuses: *"export is resolved
for EN, not SC — refusing rather than measuring the wrong country."* No SC-resolved game-config
export exists on disk. Pre-existing on both trees (identical refusal, differing only in a line
number), so Scotland's move is evidenced by the export measurement and by unit tests instead.

---

## 2. What changed

### 2.1 `LeagueSizeResolver::sizeOf()` — derives always

`league.slots` is not consulted. The size is NPC club rows, plus one at the country's deepest
division, and the class docblock was rewritten to carry the ruling, the overruled argument
verbatim, and what was given up.

**What the old argument got right, and the honest reason its cost is smaller than it read.**
The docblock's "fatal objection" was that `League::$tvDeal` is a key shipped builds read, so a
derived divisor re-prices a tier for every existing build. **Every path that serves a device
already computed the share at read time** and never touched the stored column — `SyncService:834`,
`InitializeController:251`, `LeagueService:306`, `LeagueImportExportService:66`. So the divisor
was already dynamic on the wire; only the number it divided BY was authored. What is genuinely
given up is named in §2.2.

**And the drift it was protecting against was live anyway.** The authored number did not hold
the divisor still — it held it wrong, for £86,600,000.36 a season.

### 2.2 ⚠️ A REAL DEFECT FOUND AND FIXED IN THE SAME CHANGE, BY THE SUITE

The unconditional bottom-tier `+1` turned a tier with **no rows at all** into a division of
**one**, so `derivedTvDealPence()` published the entire TV pool as a single club's share — the
exact "divide by a clamped 1" failure the `0` return exists to prevent, reached by another route.
It was masked while `slots` was authored, and `BootstrapCountryCommand` creates a country's
leagues and then fills them, so **every country passes through this state.**

`EconomyTvCountryScalingGuardTest` caught it within minutes of `slots` stopping being read
(`£2,448,000,000.00` published as one club's TV). `sizeOf()` now returns 0 for an empty tier,
deepest included; pinned by
`LeagueSizeResolverTest::testAnEmptyBOTTOMTierIsAlsoZeroRatherThanThePlayerAlone`.

### 2.3 The `+1` is unconditional, and the migration's detection rule was the wrong rule

`Version20261119120000` adds the place only when the deepest tier holds exactly one fewer row
than the tier above. **That rule was right for deciding what to AUTHOR and is wrong for a
participant count:** the player's club is in that division whether or not a gap was left, so the
table it fields is `rows + 1` either way — which is also what the device assembles.

So check 9 keeps the detection and reports an unreserved deepest tier as a **shape note**, the
one size the rows alone cannot corroborate, instead of correcting anything. ⚠️ No country in the
2026-11-19 export is in that shape. The claim that CA, JP, NG, PL, US and SC held a uniform count
was measured **2026-11-12**, before the caches were rebuilt, and is stale — which is itself the
argument for printing the shape rather than asserting it.

### 2.4 `EconomyWageTableCommand` check 9 — ⚠️ REWRITTEN, NOT DELETED

The prohibition (*"it must never be 'fixed' by making `sizeOf()` prefer the row count"*) is
**quoted verbatim** in the new docblock, followed by the ruling that overrules it and the measured
reason. The half that survives the ruling — **it reports and never writes** — is untouched and is
now pinned twice (`testTheCheckNeverWritesTheRetiredColumn`,
`testTheCheckNeverWritesTheTvDealColumn`).

The old comparison had no content left: count 1 (authored) IS count 2 (rows) by construction.
What it compares now:

| | severity | why |
|---|---|---|
| **stale world pack vs NPC rows** | 🔴 FAILS | **the only way left to show a player a wrong divisor, and MORE likely than before** — the divisor follows the rows instantly, the cached pack does not |
| **stale `league.tv_deal` vs the derived share** | 🟡 WARNS | precisely the cost accepted. No player reads the column; four admin surfaces do (`LeagueAdminController:127`, `EconomyAdminController:457`, `WorldOverviewService:98`, `LeagueTierDefaultDiff:68`), so back office and device would disagree |
| **pooled tier with no NPC rows** | 🟡 WARNS | size resolves to 0, every serve path falls back to the stored column; normal mid-bootstrap |
| **unreserved deepest tier** | 🟡 WARNS | §2.3 |
| **rows > size** | 🔴 FAILS | unreachable by construction, kept as a **tripwire**: anything that makes `sizeOf()` read a stored number again lands here first |

The table prints either way and carries a **`slots (unread)`** column — deliberately, not
nostalgically: the column still holds Scotland's 14, still appears in any pre-ruling export, and
somebody reconciling an old file against a running box needs both numbers in one place with a word
saying which is live.

Renamed `checkAuthoredSizeAgainstRows` → `checkDerivedSizeAgainstRows`, and
`EconomyAuthoredSizeDriftTest` → `EconomyDerivedSizeDriftTest`.

### 2.5 Nothing writes the field — and the admin input is REMOVED, not read-only

**The brief asked which. Removed as an input; the derived size is shown read-only in its place.**

- `LeagueAdminController::quickEdit()` no longer reads `slots` from the POST. A posted value is
  **ignored rather than rejected**, so a stale cached admin page still saves successfully — there
  is nothing left for it to corrupt.
- The quick-edit dialog's `SLOTS` number input is replaced by **`DIVISION SIZE (derived)`**, a
  read-only cell fed from the `clubCount` the action already publishes, with the retired column
  shown beneath it for reconciliation. An editable box an operator could type into with no effect
  is worse than no box.
- The JS that let a typed `slots` drive the "Derived: pool ÷ N clubs" note now reads the derived
  size; only the pool can change that note.

### 2.6 ⚠️ The export/import: dropped at BOTH ends, which is a change from the brief

The brief named only the import (`LeagueImportExportService:260`). Stopping there would have
broken `testWorldSurvivesClearAndReimport` — *"whatever the export emits must come back"* — for a
field nothing reads. **So the key is dropped from the export too**, and `slots` is registered on
`worldEntityProvider()`'s exclusion list (the drift guard that requires every mapped League column
to be exported), with the reason and a note that it must come off that list if the column is ever
read again.

**The size still round-trips** — through the `clubs` rows the same export carries, which is what
the derivation reads. The round-trip invariant stays exact rather than gaining a second exception.

### 2.7 The column — left in place, as the brief preferred

`league.slots` is **not dropped**. No drop migration. Nothing reads it, nothing writes it, it holds
whatever it last held. I have no disagreement to argue: dropping a column is irreversible, the
owner's scope is correctness now, and the column has one residual use (reconciling an older export
against a running box) which check 9's table serves.

The three migrations that authored, corrected and resynced it (`Version20261119090000`,
`…120000`, `…150000`) remain applied and correct — a migration that has reached a production box
has to stay re-runnable — but are now **historical**, and marked as such in `migrations.md`.
`LeagueSlotsAuthoringTest` still runs the real SQL; **one of its assertions changed meaning and
was rewritten rather than deleted** (`sizeOf()` on an authored 3 against 3 rows returns 4 now, not
3 — the ruling working).

---

## 3. App side

### 3.1 `worldExport.ts` — the `slots − 1` chain is gone

`homeGamesForLeague(league, clubCount, fallback)` → **`homeGamesForLeague(clubCount,
isDeepestTier, fallback)`**. No league parameter, no `slots`. The rule mirrors the backend's
exactly: `size = rows + (deepest ? 1 : 0)`, home games `= size − 1`, caller's fallback for a tier
with no rows.

New `deepestTierForCountry(world, country)` answers the second argument off the export's league
rows (club rows as a fallback for an export predating the leagues array), mirroring
`LeagueRepository::findLowestTierForCountry()` — the deepest league that EXISTS, never a declared
depth. All three harness gates (`variantGate`, `dispersionGate`, `flows`) updated.

**EN 15 home games at all eight tiers, unchanged. SC 11 at all eight, where the authored 14
gave 13.**

⚠️ `WorldExportLeague.slots` stays declared, `@deprecated`, **because older export files still
carry it** — including the 2026-11-19 one the harness is run against.

⚠️ **This reverses a rule `game-mechanics.md` §13.6 stated explicitly**: *"do not fix that by
re-adding a `+1` at the bottom: the reserved place is a property of the box that generated the
export, not of the game."* It also concluded `slots − 1` was the only formula correct in England at
all eight tiers. The third option it did not weigh is correct in England at all eight **and** in
Scotland at all eight, which neither of the two it compared manages. Annotated in place, not
rewritten away.

### 3.2 🔴 `economyDiagnostics.ts` — THE BRIEF'S PREMISE IS WRONG; the check is NOT retired

The brief (and A19's status note) say the DISAGREE row *"can never fire once nothing is
authored"*. **It can, and it is now the most valuable row on the screen.**

**The app has never read `league.slots`.** The field named `slots` in `DivisionSizeInput` is fed
`ampLeague?.clubCount` (`ChecksTab.tsx:246`) — the **published** divisor, which the backend now
derives. `clubs` comes off the **cached world pack**. So:

> the divisor follows the server's NPC rows the instant they change; `clubs` is whatever pack the
> device is holding. A stale pack is the one remaining route to a division paying by a club count
> it does not field — the live defect from the other direction — and this row is what sees it.

**Decision: the check survives in substance; only its vocabulary was wrong.** `slots` → `divisor`
throughout, and `authored 14 ≠ 12 clubs` → `divisor 14 ≠ 12 clubs`. On a device screen "authored"
sent three sessions looking for a column to correct. The device line now reads
`divisor 12 · clubs 12 · home games 11 · TV £100k = pool/12`.

### 3.3 ⚠️ A19 — for the PM, and not as A19's own note expects

`a19-checks-false-pass-brief.md` is marked *"run A23 first, then re-scope A19 around what is
left"*, on the premise that A23 removes its central case. **A23 does not.** A19's §1 is entirely
intact and still unstarted:

- three states AGREE / DISAGREE / **UNKNOWN**, with UNKNOWN not scored as a pass — still needed,
  because `divisor` is still `null` for every pack-sourced league (it rides only the three
  uncached payloads);
- recovering the divisor as `pool ÷ tvDeal` so the comparison works at every tier — still the
  right move, and still the thing that actually closes the false PASS;
- the integer-division tolerance — unchanged.

**What changed is one word in the DISAGREE message.** A19 should be re-scoped as *"re-check the
wording against A23's rename"*, not *"its central case disappeared"*. No files collide beyond the
rename itself: A19's §2 (FANBASE line) and §3 (`REFERENCE_FAN_BASE_SHARE_PERCENT`) are untouched
here.

---

## 4. Verification

### Backend — `lando php vendor/bin/phpunit --filter '/^(?!.*AdminShellCoverage).*$/'`

```
Tests: 3238, Assertions: 155841, Failures: 3, PHPUnit Deprecations: 1, PHPUnit Notices: 21, Skipped: 13.
```

Baseline 3,233 → **3,238 (+5)**. ⚠️ **All three failures proven pre-existing by stashing the whole
change and re-running on the clean tree** (per standing notes: attribute by stash-and-rerun, never
by reading the assertion):

```
1) NotificationLogCrudControllerTest::testIndexRowIsClickableToADetailPageShowingTheFullPayload
2) CompetitionControllerTest::testShowIncludesResultsOnceRoundsAreProcessed
3) FriendlyResolveSingleMatchTest::testResolvingAnAcceptedChallengeRecordsAFullResult
Tests: 37, Assertions: 501, Failures: 3.      ← on the CLEAN tree, identical three
```

### App

```
Test Suites: 647 passed, 647 total
Tests:       3 skipped, 10802 passed, 10805 total
$ npx jest --listTests | wc -l
     647
$ npx tsc --noEmit
     (zero errors)
```

Baseline 647 / 10,788 → **647 / 10,802 (+14 tests, no new suite)**, `--listTests` 647 ✓.

### The regression guards for the ruling itself

Several tests were **inverted rather than deleted**, so the old and new behaviour cannot both pass
and a silent revert fails loudly:

| test | was | is |
|---|---|---|
| `LeagueSizeResolverTest::testAnAuthoredSlotsIsIgnoredEntirely` | `testAuthoredSlotsWinOverAnyCount` → 18 | → 40 (the rows) |
| `EconomyDerivedSizeDriftTest::testRowsOutnumberingTheRetiredColumnIsNoLongerADisagreement` | FAILED the gate, "Author league.slots to 20" | no finding |
| `SyncServiceLeagueTest::…PublishesTheDerivedShare` | `intdiv(120_000_000, 14)` = £85,714.28 | `intdiv(…, 12)` = £100,000.00 |
| `variantGate.test.ts` `homeGamesForLeague` | `{slots:14}, 12 rows` → 13 | `12, false` → 11 |

⚠️ **One assertion in the drift test could not use the exit code and now says why in a helper
docblock.** The synthetic countries are deliberately minimal, so the command's other eight checks
fail on them and the exit code is 1 whatever check 9 does — an earlier draft asserted
`assertSame(0, getStatusCode())` and read as six failures. "Check 9 raised no problem" is asserted
by slicing the PROBLEMS section, which its warnings are printed above.

---

## 5. `.context`

One pass entry appended to each repo's `shared/last-sync.md`. Stage text my change made wrong,
corrected in place:

- backend `04_interfaces/output/services.md` — the `LeagueSizeResolver` section (which stated the
  opposite ruling) and check 9's description.
- backend `03_data/output/entities.md` — the `slots` field, and the "Why `slots` is authored and
  not counted" section (kept, marked overruled; ⚠️ its measurement table is stale, 2026-11-12).
- backend `03_data/output/migrations.md` — the three `Version2026111909/12/15` sections marked
  historical; "a defect this exposes and does NOT fix" resolved and annotated.
- backend `01_overview/output/environment.md` — the renamed test.
- app `07_synthesis/output/game-mechanics.md` §13.6 — the rule, the reversed `+1` sentence, the
  closed Scotland item, the `FALLBACK_DIVISION_SIZE` note.

⚠️ **Flagged for the PM, not restructured** (per standing notes):

1. `migrations.md`'s three slots migrations are now 300+ lines about an unread column. Marked
   historical at the top; **not pruned**.
2. `entities.md`'s "9 of 15 countries" measurement table is from 2026-11-12 and contradicts the
   2026-11-19 export (which shows all 25 reserving). Marked stale; **not replaced**, since it is
   the record of why the column existed.
3. The app's `last-sync.md` pass ordinal is hand-maintained and branch-relative; I used
   **eighty-sixth** on `new-game-save`, per the file's own merge warning.

---

## 6. Not done

- **Nothing pushed, nothing deployed.** Standing notes §.
- **Nothing committed** — left in the working tree of both repos for review.
- **No authored figure tuned.** Not one pool, ladder or band touched; Scotland's four live tiers
  will simply divide by 12.
- **Not verified against dev.** The measurement is against the 14:15 world export; tonight's
  rebuild cut Scotland's ladder to four tiers, which changes which tiers exist, not the rule (the
  derivation reads whatever the deepest existing league is — `LeagueSizeResolverTest::testTheBottomTierIsTheDEEPESTEXISTINGONE`
  covers a 4-tier Scotland). ⚠️ **A device CHECKS run after a dev deploy is the remaining
  confirmation**, and the line to look for is `SC t4  divisor 12 · clubs 12 · home games 11`.
- **Scotland's variant gate not run** — no SC-resolved config export exists (§1).
