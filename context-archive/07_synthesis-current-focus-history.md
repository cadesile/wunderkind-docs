# `07_synthesis/output/current-focus.md` — archived history

Rotated out of `wunderkind-app/.context/stages/07_synthesis/output/current-focus.md` on
2026-11-20, verbatim and in the order it sat in that file. Nothing in `.context/` links here.

The file had grown to 108,646 bytes / 1,474 lines and was almost entirely `SHIPPED` entries —
months of completed work, with a verbatim 45-line duplicate (its own lines 3–47 repeated at
554–596) and a `2026-11-15` section spliced in below September's. It carried **zero** coverage
of the A12–A28/B1 economy workstream that was the branch's actual live work on 2026-11-16..20.
The replacement keeps only genuinely open work and points at the docs that own each thread.

⚠️ **Order is not chronological.** Read the date in each heading.

Why this split exists: `../context-review/context-refresh.md`.

---

# Current Focus

## SHIPPED 2026-11-11 — the DOF raises more proposals, and you can see why

Mechanics: `game-mechanics.md` §9b. Service surface: `04_interfaces/output/services.md`'s
"DOF proposal volume". Commits `f28f0aa2`, `3ae6f76f`, `f893a73b`, `9461486d`.

**Start here if the question is "why isn't my DOF signing anyone".** The first thing to check is
no longer a threshold: it is whether that DOF was hired mid-game. `dofAutoSignPlayers` and
`dofAutoAssignScouts` were read as truthy while `marketStore.hireCoach` seeds neither, so a DOF
hired through Office → Hire had recruitment AND scouting switched off for the rest of the save,
with nothing in the inbox to say so. New-game DOFs were fine, which is why it survived.
Fixed at both ends and pinned by `dofDelegationDefaults.test.ts`.

**The dominant limiter was attrition, not strictness.** Four paths deleted Formal Shortlist
entries — a DofBrain pass, a ManagerBrain pass, an explicit decline, and the 4-week expiry
sweep — against a pool refilling at 0.6 players per scout-week. A pass is now a cooldown, and a
lapse is distinguished from a decline: an unopened card is not a verdict.

**The call worth revisiting if it feels wrong:** the manager no longer vetoes a signing, it
objects on the card. The owner picked "more proposals to approve", and the manager's gate was a
second `>= 50` cutoff that killed proposals unseen — and formation-blind, so in a 4-4-2 every
defender and midfielder carried a 15-point penalty forever. `dofRequireManagerConsent: true`
restores the old behaviour in one config field.

**Before tuning anything further, read the telemetry.** `trackEvent('DOF Recruitment Tick')`
reports candidates evaluated, proposals raised and a **per-gate rejection tally** — the tally
names which gate is actually binding. There was no telemetry in any of the brains before this,
which is why the review had to read all of them.

**The same bug on the other roles is fixed too** (`da971ee6`): five `chairmanAuto*` duties and
`facilityManagerAutoRepair` had it identically, and `hireCoach` now seeds every default-ON duty
for every role. ⚠️ **That changes in-flight saves on the next tick** — a chairman already in post
starts balancing the budget, ruling on mandates and booking excursions, and a facility manager
starts repairing. The duty they were hired for, but it will read as new behaviour.

**The two tactics duties are the deliberate exception.** `managerDeterminesFormation` and
`managerDeterminesPlayingStyle` are seeded at hire but their READS are still truthy, because
delegating them makes the manager revert the formation the owner set in the Tactics screen —
flipping the read would start undoing explicit user choices on existing saves. The reasoning is
in `dofDelegationDefaults.test.ts`, which names them as excluded rather than skipping them
silently.

**Not measured on device yet.** Every figure here is from running the real functions
(`missionGemRollThresholds` over 2m samples, the gate arithmetic by hand); the end-to-end claim
— proposals per season actually rising in a real save — has not been observed on a device.

## IN PROGRESS (last touched 2026-11-09) — new game setup v3, on branch `new-game-save` (NOT `development`)

**Branch rule, owner's instruction 2026-11-05: every change for this feature goes on
`new-game-save`.** `development` must stay free to ship unrelated work to `master`/prod ahead
of this. Full rationale and the clean-up trigger:
`01_overview/output/environment.md`'s "`new-game-save` — the one live feature branch".
**When `new-game-save` merges to `master`, delete this section** and fold whatever is still
true into the `03_data` / `04_interfaces` / `05_ui` stage output.

**The drop**: `assets/Components/location_new_game/` — `INTEGRATION.md` plus ~3,000 lines across
20 files. v3 adds, behind `resolveSetupFlow()`: a bonus `quiz` step, a `location` step with paid
town valuations, four separately-charged `fac:stadium|training|medical|scouting` BUILD steps, and
a `funding` step. Money is real — the owner's server-side account credit (`user_ledger`) is
debited per site and per funding.

### State as of 2026-11-06

**On `new-game-save` and merged to `dev`** (`160e3531`; `dev` at `35b74237`). The v3.1 UI-fidelity
drop is integrated on top of that (below). `tsc` clean, **538 suites / 9,048 tests**, i18n catalog
4419 → 4579 → **4624**, `audit-tokens` zero mismatches and zero absent keys. `new-game-save` has had `development` merged into it to keep the eventual merge out
small.

Shipped: the copy-in, the four host gaps, the contract adapters, the host wiring, ~100 tests,
and then three rounds of fixes found by testing on dev — see "Found on device" below.

**Production is untouched and stays that way until the switch is flipped.**
`resolveSetupFlow()` returns `v1` when `getApiBaseUrl() === PROD_API_BASE_URL`, so this is
mergeable to `master` ahead of any player-facing release. `setupFlowResolve.test.ts` is what
pins that, and it is the reason the merge is defensible — every other v3 guard proves the flow
works, only that one proves it is unreachable in prod.

**Outstanding: a planned second pass** covering the prototype team's
`assets/Components/v3-missing-features.md` items 2–6 — the server funding minimum, one
season-ticket source, walking the whole quiz set, the owner-balance strip, and restoring the
rest of `setup-state`. Item 7 (snapshots) was declined with the owner; item 1 and a hub fix are
done. The plan, with the constraints each item runs into, is at
`~/.claude-personal/plans/looking-into-ive-endpoints-concurrent-anchor.md`. Device verification
(Phase F) is also still outstanding.

Item 5's `fac:*` half is now covered incidentally by v3.1's pinned budget strip (BALANCE ·
{SITE} · KEEP BACK); only the `funding` step still lacks the owner-balance figure.

### The RANDOM CLUB handoff (2026-11-09), and the one thing it could not know

`assets/Components/design_handoff_random_club/` — README plus the `New Game Flow v3.dc.html`
prototype. A one-tap route through the whole v3 walk: a RANDOM row on *Where will you play?* opens
a budget overlay (land + the four sites, capped by account credit), RANDOMISE picks everything
else, buys the land, plays a stepped loader, and lands on **Your club** in a review mode where
every site and the club funding can still be edited before START GAME. Plus a flow-wide change:
**every `MoneyStepper` now has six buttons** (±£10k / ±£100k / ±£1m) in two rows of three.

All seven of the handoff's acceptance items are done. 549 suites / **9,276 tests**, `tsc` clean,
catalog 4663 → **4714**, `audit-tokens` zero/zero.

**The deferred-charge property is what makes the whole mode cheap.** Review keeps `charged` empty
and `funded` false until START GAME, so `isLocked` needed **no new clause** and every EDIT target
is reachable for free. START GAME then commits in two phases through `primary` — phase one writes
`charged`/`funded` and emits four `buildSite` effects then `fundClub`, a component watcher
re-dispatches once `money.settled`, phase two emits `complete`. A refusal between them clears
`rndCommitting`, so the next press cannot start a half-paid club.

⚠️ **The handoff's RANDOMISE step 1 is not answerable on the client, and this is the drop-pattern
in its purest form yet.** It asks for "countries with ≥1 enriched, for-sale town at
`landPence ≤ land budget`" — which the prototype can evaluate because its sample data holds every
country at once. **The app holds exactly ONE**: `loadCountry` is idempotent per country and
`fetchAll` bumps `runRef`, so switching discards the last one. There is no multi-country cache to
filter, and walking every country up front is ~20 × up to 10 pages before the overlay could
answer. `useLandFlow.findLand` is the replacement: **one page per country, stopping at the first
fit** — sufficient because of the SORT rather than by luck, since `sort=price` is ascending with
unpriced towns last behind a sentinel, so page one is a country's cheapest land and a country
whose cheapest is over budget has nothing under it. A country that fails to load is a miss, not a
failed draw. `?maxLandPence=` is **not** used to ask the server this (`routes.md` has refused it
three times); `randomClubProbe.test.ts` pins that it never reaches the query string.

The consequence for the UI is that the land search moved from the dialog's RANDOMISE press into
the loader's first beats, and the dialog grew a `busy` state — the stand check stays synchronous
and local, so the error that *is* about the budget is still answered before anything is asked of
the server.

**Three things the tests found that review alone would not have:**

1. **`hire` and `role` have their own cases in `primaryOf`**, so a review clause in the switch's
   `default` never reached them — tapping a boardroom tile and confirming walked the player
   onward into the rest of the flow instead of back to review. The clause sits **above** the
   switch now, excluding only the three kinds with something of their own to say.
2. **`clubEconomy` takes the funding MAXIMUM from `ownerLeft`**, and under review nothing is
   charged — so funding would have offered the whole balance while the drafted build was about to
   take a chunk of it, and START GAME would then have been refused for insufficient credit. The
   review branch therefore lives in **`ownerLeft` itself**, counting DRAFTED spend: it excludes
   the site being edited (so re-opening one does not find its own money gone) and excludes nothing
   on the funding step. `siteOfStep` moved to `economy.ts` so both callers share one copy.
3. **A thin credit against a big keep-back opens the overlay already in its warning state** — land
   takes its fifth, `rest` floors at 0, and LEFT OVER is below the keep-back. Correct rather than
   a gap: letting land eat the keep-back buys a ground the club cannot afford to run. Asserted.

**Two guards fired, and both were worth their cost.** `setupChromeDesign.test.ts`'s self-guard
caught the two new `.tsx` files; its `DELTA_ROW` regex anchors on the first array element ending
in `bigStepPence`, and `-megaStepPence` is now first — so the negative sweep over every other file
still passed while the **positive control failed**, i.e. the guard would have reported the one file
it exists to bless as the one file that no longer builds a delta row. Any further increment needs
the same edit. `strings.test.ts` caught the three new CTA keys before they could render as raw key
text.

**Copy went to `ngs.overview.*`, not the handoff's suggested `ngs.review.*`.** That namespace does
not exist; this screen's twenty shipped keys are all `ngs.overview.*`, the chapter is
`ngs.chapter.review`, and the title is `ngs.title.overview`. Since a key's value cannot be changed
and a key cannot be deleted, a second namespace for one screen would have been permanent.

**Decisions worth not relitigating:** no new `StepId` (the dialog and loader are component-level
overlays — `chapterOf` has no safe default branch and `chaptersOf` groups *consecutive* steps, so a
mid-flow id splits a rail chapter, and the loader needs a clock the reducer is forbidden);
the overlays live in `NewGameSetup` because the loader must outlive `CountryStep`'s unmount;
`DraftSiteArt` is exported from `BuildSteps` so the review list cannot grow a second copy of
`useDraftSite` (**the v3.1 cosmetics bug, pre-empted**); and the handoff's VT323 20/22 ships as
`step="body"` + a lineHeight override, because §9 already carries two off-scale sizes here with the
rule "count before adding a third".

⚠️ **Not device-verified.** Also unresolved by design: a *claim* failure after FOUND CLUB falls to
the existing `foundReversed` → `unfound` recovery, which returns the player to the **LAND step**
rather than to the dialog. `unfound` targets `location` by construction and the handoff's
retry-once rule covers *hold* failure only, which happens before the commit — so this is outside
its scope, but it is the thing to watch at device review.

### The LAND filters handoff (2026-11-07), and the bug it turned out to be sitting on

`assets/Components/design_handoff_land_filters/` — README, the `New Game Flow v3.dc.html`
prototype, and a device screenshot. Four asks: a FILTERS panel, 10-at-a-time paging, the land
RANDOMISE rendering with no border, and the rail printing `ngs.rail.…`. All four are done, in
three commits (`4658a8c0`, `d12d7aab`, `776e58aa`), merged to `dev` at `093ab866`. 545 suites /
9,175 tests, `tsc` clean, catalog 4624 → **4654**, `audit-tokens` zero/zero.

✅ **DEVICE-VERIFIED on the `dev` channel, 2026-11-07** — owner's report, "very solid". That
closes the twelve style-callback fixes, the FILTERS panel, the paging and the rail key as
confirmed working rather than merely green. **Scope: this pass's surfaces.** The v3/v3.1 Phase F
below is a wider checklist and is NOT discharged by this — treat the two separately.

**Then 2026-11-08 (`68b56a2a`) corrected the one thing the device pass did NOT catch, because it
only shows up on a country nobody had tried.** The band edges shipped as the prototype's
`75K/150K` and `£150k/£300k` — England-shaped guesses — and the second device run was Spain:
310 towns, land at £4.5m, so every priced town fell in the top price band and two of the three
chips could never match. The group rendered perfectly and did nothing, which is why "it looks
right" passed it. `landBandsFrom` now cuts each dimension at its own thirds, rounds the edges to
a sayable figure, and offers no group at all where the data cannot be cut three ways. ⚠️ **The
sample must be the whole country**: the walk is `sort=price`, so a partial one is the cheapest
towns and quantiles over it would put everything still to arrive in the top band — the same
uselessness by a different route. Same commit adds the ORDER chips (CHEAPEST / PRICIEST FIRST,
sorted locally because the server offers `price` ascending only) and fixes three label
truncations. 546 suites / **9,201 tests**, catalog **4663**.

**The lesson, and it is not the one the earlier drops taught.** Those were host assumptions a
reader could check against the repo. This was a *data* assumption — correct for the country the
prototype was drawn against, silently useless for the next one — and neither the type system,
the test suite nor a device pass on one country could see it. **A constant that describes the
CONTENT rather than the code is a bug waiting for a different dataset; derive it or offer
nothing.**

### The world pack carries NPC land now (2026-11-08, `35606460`)

Every club object gains `land` — `{ name, region, plotNumber, capital, valuePence }` or null.
**Stored, not wired**, on the `world_clubs` blob with no migration (the strip is a rest-spread,
the route `coachInfluence` took). Shape, the three meanings of null, and the round-trip guards:
`03_data/output/schema.md`.

⚠️ **The open decision: it is NOT fed into club valuation, and that is deliberate.**
`computeClubValuation` takes `landCostPence` — what the AMP club PAID — while `valuePence` is
what the ground is WORTH. Different quantity, and the magnitudes make wiring it a balance change
rather than plumbing: London FC's land is £150m against a £49k starting balance and a player
book near £1.6m, so passing it straight through makes land ~98% of the valuation and moves
investor offers, loan limits and scouting targets with it. `npcFinances.ts` still carries the
comment saying NPC clubs value no land — now out of date in its reason, not its effect.

**The RANDOMISE bug was twelve bugs.** The handoff offered a stale OTA or a wrapper swallowing
`style`; `git log -S` rules the first out (the button did not exist before `5cafa9a2`, which
added the JSX and its style together), and the second is right in substance and wrong in
mechanism. It is NativeWind dropping the `style={({ pressed }) => …}` **callback's return value**,
already documented in `05_ui/output/patterns.md` and already guarded —
`pressableStyleCallback.test.ts` was green because it read the callback's LITERAL text, and
`[styles.randomBtn, …]` names no property. Teaching it to resolve `styles.<name>` against the
file's own `StyleSheet.create` found twelve live offenders, **all twelve inside this feature**,
because the whole of it arrived as prototype drops. All fixed. The lesson is in `patterns.md`:
a source-reading guard protects the SHAPE it reads, not the rule it is named after.

**The server cannot filter, so the client does.** The handoff specified
`?pop=&plotSize=&price=&maxPrice=&includeUnvalued=` with `limit=10&offset=` and a `total`. None
of it exists — and `maxPrice` is `maxLandPence` renamed, the parameter `routes.md` has now
refused three times. `plotSize` has no column, field or filter anywhere, so the third chip group
is **PLOTS from `plotCount`** (owner's call). `limit=10` would have broken RANDOMISE outright.
So `useLandFlow` walks `nextCursor` to the end on entry — two requests for England — and the
filtering, counting and paging all happen over that. **That is not a revival of the "never filter
client-side" ban**: that ban's premise is a truncated page, and walking the country removes it.

Three smaller decisions, each recorded where it belongs rather than left implicit:
RANDOMISE does **not** clear the filters (it ignores them structurally — `pickTown` is handed
`land.locations` — and `pinSelected` prepends whatever it picks); the gold goes on the FILTERS
icon and its `Badge` but **not** the panel border, because a gold border twenty pixels below
means "the town you picked" (`compliance-review.md` §9b); and the switch is a second local copy
of `StaffToggle`'s, with a note that a third must be a promotion.

**One key had to be renamed before it shipped:** `ngs.location.filter.plots.one` reads as a
plural family to `plural.test.ts`, which demands an `X.other` beside any `X.one`. It is
`plots1/2/3` now. Caught by that guard, not by review.

### The v3.1 UI-fidelity drop, and the four things it got wrong (2026-11-06)

`assets/Components/new-game-save-v3.1/` — 9 files closing the gap between the integrated flow and
the design: the BUILD steps' pinned block (site strip → budget → 140dp hero → caption) with
`'fac'` added to `STEPPER_KINDS` so the step owns its scroll, one 44dp stepper line per facility
row, RANDOMISE for land and each site, YOUR VALUATIONS, and a search + 6-name cap on CLUB NAME.
**It also ships the prototype itself** at `prototype/New Game Setup v3.html` and a Pixel reference
table, so fidelity is verifiable rather than inferred — spot-checks against the HTML passed.

Every host API it assumed was real and matched. Four assumptions did not, and the pattern is the
same one this feature has produced three times already: **the data was right and the code's
reading of it was wrong.**

1. **RANDOMISE LAND could never return a town.** `pickTown` filtered `r.claimable` truthily, but
   `GET /api/locations` does not send `claimable` — which is *why* `rowTag` tests
   `claimable === false`. Every row failed, so the dialog reported NO LAND FOR SALE IN YOUR BUDGET
   for every budget. **The drop's own test was green because its fixture set `claimable: true` on
   every row** — a fixture richer than the endpoint is a test that cannot fail. Now
   `claimable !== false && capacity?.available !== 0`, with a fixture row that carries neither.
2. **A second facility-effect copy map.** `FX_KEYS` + 16 `ngs.build.fx.*` keys over
   `gameplayEffects`, which `game-mechanics.md` §1 reserves to `facilityEffectCopy.ts`. It would
   have printed "Youth development" for `youth_academy` — a field the aggregator reads nothing
   from, asserted absent in `facilityEffectCopy.test.ts` — and revived "XP" and "Cohesion",
   retired on 2026-10-31. **INTEGRATION.md justified it as "as the prototype does"; the prototype
   does not.** `X.effects` is *called* at the row and never *defined* anywhere in the 2.7MB file,
   and none of those three words appears in it. So the map had no design backing and nothing was
   lost replacing it with a derived `effectWordKeys`.
3. **A banned query parameter, re-proposed.** §2 offered `?random=1&maxLandPence=` as a fallback
   for the paged list. `maxLandPence=` is refused at `routes.md`'s own bullet because it makes
   un-valued towns permanently undiscoverable — the bug commit `160e3531` had fixed the day
   before. It is also unnecessary: under `sort=price` the unpriced towns sort last behind a
   sentinel, so page one already holds every priced town, the only kind RANDOMISE may pick.
4. **"Re-record snapshots" was not actionable.** No snapshot or render test existed for any setup
   step, `jest.config.js`'s `testMatch` is `**/__tests__/**` so the drop's co-located
   `randomise.test.ts` would never have RUN, and snapshots were declined with the owner. The test
   moved to `src/__tests__/components/new-game-setup/`. **Snapshots are still declined**, but
   `buildStepRender.test.tsx` now MOUNTS the rewritten step across all four sites, built and
   unbuilt — mount tests, not snapshots: no recorded output to maintain, and the precedent is
   `tournamentHubRender.test.tsx`, which exists because a render-time `undefined is not a function`
   reached a device. It also carries the only assertion guarding the ghost hero. Device
   verification (Phase F) remains outstanding.

Two further things found while integrating, neither visible to `tsc`:

- **An unbuilt stadium drew a finished one.** The four stands are plain level numbers, not on/off
  flags like the shop and museum, and `clampLevel` floors an unbuilt level at 1 — so the new hero
  showed a complete four-stand bowl directly above its own NO STANDS warning. **Setup is the first
  surface where level 0 is real**, which is why nothing had caught it. Level 0 is not representable
  in the sprite package, so the fix is to ghost the site rather than to touch `clampLevel`: see
  `05_ui/output/design-system.md`.
- **Cosmetics were still read from the live store.** The drop fixed exactly this for *levels* (its
  own header explains that `useSiteSpriteConfig` reads the previous club's) and then read `trees`,
  `pitch`, `base` and `floodlights` from `facilityStore.siteConfig` three lines later. In `newClub`
  mode that is the previous club's look painted onto the ground being bought. Now
  `DEFAULT_FACILITY_SITE_VISUAL_CONFIG`, which also drops the subscription.

**The lesson worth carrying past this drop:** a prototype drop's *geometry* is trustworthy and its
*host assumptions* are not — that is already in the tribal knowledge — but v3.1 adds a sharper
form of it. **Three of the four errors were things the drop had itself written down correctly
somewhere else**: it diagnosed the store-levels bug and then repeated it for cosmetics, it cited a
prototype behaviour the prototype does not have, and it shipped a passing test for a predicate the
server contradicts. Read the drop's own reasoning against the drop's own code, not just against the
repo.

Reconciliation details (shadows, money conversion, the one money stepper, the two residual
off-step font sizes, and what was deliberately left as-is) are in
`05_ui/output/compliance-review.md` §9, and are pinned by
`src/__tests__/components/new-game-setup/setupChromeDesign.test.ts` — a source-reading guard whose
own last assertion fails if a new component in the flow isn't added to its file list.

### Found on device, and what each one taught

Three rounds of dev testing produced three bugs, and the pattern in them is worth more than the
fixes: **each was a case where the data was right and the app's reading of it was wrong.**
Nothing was broken server-side in any of them.

1. **An unvalued town read SOLD OUT** and offered nothing. `rowTag` tested `claimable === false`
   before `landPence == null`, and an unpriced town has no plots, so the server honestly says
   `claimable: false` — with `claimableReason: 'awaiting_enrichment'` to say why. The tag and
   the CTA were contradicting each other, because `primaryOf` checks `landPence` first. Pinned
   in `landRowTag.test.ts`, which fails **five** ways against the old order: `valuing`, `failed`
   and `needs_review` were all reading as SOLD OUT too.
2. **84 towns were unreachable.** See `04_interfaces/output/routes.md`'s "Finding a town — the
   discovery deadlock". The page cap, the price-sort sentinel, and a client-side search over a
   truncated list compounded into "Prestwich doesn't exist".
3. **A plot hold could expire and strand the player for good** — below.

### The hold lifecycle, and why reversal is an action rather than a reordering

A plot hold lasts ~15 minutes. `useLandFlow` counted it to zero and stopped; `hold` was never
cleared, so the strip showed a live-looking `0:00`, and `holdLost` sat in the reducer with
nothing in the repo dispatching it.

Past FOUND CLUB it was not merely "the claim fails". **`confirmFound` is one atomic
transition** — `founded: true`, `init` created, initials frozen, step → `badge`, `createGame`
emitted — and the claim runs *afterwards*, in the host. So a claim that could never succeed left
`founded: true` with no club and no claim, and nothing could reverse it: `back`, `goTo` and the
rail all refuse `club`/`location` once founded, `holdLost` self-vetoes on `founded`, and the
error panel's RETRY calls `init.retry()` — the world build for a club that was never registered.

**The fix is `unfound`, not claiming before `confirmFound` commits**, and the reasoning
generalises. The claim is a network call and the reducer is pure by test, so claiming earlier
means a new v3 effect on the `club` CTA, an in-flight state, and splitting `onCreateGame`'s
single ordered chain (`profile → claim → registerClub → init.start`) across two dispatch
generations — which is where the 403-signs-you-out safety property lives. `unfound` matches
three reversal cases the reducer already had (`chargeFailed`, `fundFailed`, `holdLost`) and
emits no effect, so `flows.json` is untouched.

⚠️ **`unfound` resets `initialsEdited` and the badge initials, and that is load-bearing.**
Freezing the initials is *what makes the club name permanent*, so a reversal that leaves them
frozen returns the player to pick a new town while still wearing the old town's badge. Anything
they typed by hand goes with it — unavoidable, it is one flag.

Two structural constraints this ran into, both of which will catch the next person:

- **The reducer has no clock** (`contract.test.ts` bans `Date.now`/`new Date`/`performance.now`),
  so expiry detection lives in `NewGameSetup.tsx`, keyed on `holdId` to fire once per hold.
- **`newGameSetup.logic.ts`'s import list is asserted with an exact ordered `toEqual`**, so it
  cannot import `t`. Player-facing copy reaches the reducer as an action payload — the
  `chargeFailed`/`fundFailed`/`holdLost` pattern.

`claim()` also had to stop flattening every refusal into a bare `Error`; it kept the code only
for `hold_consumed`, so the host could not tell an expired hold from a declined charge.
`HOLD_GONE_CODES` + `codedError` in `land.ts` are that fix.

### The hub now shows a real balance

`useCrossClubEarnings` summed `totalCareerEarnings` across owned clubs, so a new account showed
**£0** while holding its whole starting grant — the wrong figure, not a broken one. It had
written down its own replacement (*"when the real GET ships, swap this hook's body"*), and
`GET /api/account/ledger` is it. Now `useAccountBalance`, labelled BANK BALANCE, with
`totalPence` → `balancePence` because this is net of land, builds and club funding.

**The rule that survived the swap: null, never 0, when the answer is not known.** `£0` and
"don't know" look identical to a player and mean opposite things, and this is money they are
about to spend. Extracted as the pure `balanceLabel` so it can be tested without a renderer.

### The backend shipped, and its contract differs from the drop's proposal

**All five endpoints are live on `api.dev`** (backend `development`, `64fd6b3` + `5a3cbf0`):
`POST /api/club/facilities/{site}`, `POST /api/club/fund`, `GET /api/club/setup-state`,
`GET /api/setup-quiz`, `POST /api/setup-quiz/{id}/answer`. Idempotent on natural keys —
`(club, site)` and `(club)` — with no `Idempotency-Key` header.

⚠️ **The real spec is `wunderkind-backend/docs/api/setup-flow.md`.** The
`backend/setup-flow-and-auth.md` that the drop's own comments cite **does not exist anywhere** —
don't go looking for it. The backend repo also has its own populated `.context/`.

The three differences that mattered, all now absorbed in `src/api/endpoints/*` so nothing
downstream sees two shapes. Each produced **no error at all** — the lesson worth carrying is that
every one of them was found by reading the server's source, and none by running the app:

1. **`setup-state` returns a different object.** Nested `sites: {stadium: {charged, chargedPence,
   levels}}` against the drop's flat `{charged, levels, fundedPence}`. Read raw, `charged` is
   `undefined`, the reducer's spread is a legal no-op, nothing locks — and `useSetupMoney`
   swallows this call's failures by design, so `restore()` restored nothing with no signal
   anywhere. **Presence is the lock, not the value**: an uncharged site must be ABSENT (a £0
   charge cannot exist — the build service only writes a ledger row above zero), and
   `fundedPence` must stay `null` rather than becoming `0`, which would lock funding at zero.
2. **The quota aliases ride nested under `quota`**, and the `enrichment_limited` code the drop
   branches on sits in `body.code` — while `ApiError.code` is built from **`body.error` only**.
   Either alone left the VALUATIONS LEFT strip unrendered and VALUE TOWN permanently enabled.
   Fixed on both sides; the client reads `quota ?? body` and matches both code strings anyway,
   so neither side can break the other by moving one again.
3. **`enrichmentCountMax` is `null` for an unlimited ceiling**, which the drop coalesced to `5`
   — capping an account with no cap, on the config dev actually ships
   (`maxEnrichmentRequestsPerUser: 0` means unlimited). Now mapped to "not known", which is the
   state the flow already handles: no strip, gate open, the 429 as the only hard stop.

**Resolved by the backend, no app change needed**: the quiz now flattens the next unanswered
question onto the top level as `{id, question, options}`, so the drop's single-question reading
works; the ledger has all four `facility_*` types; and the funding floor defaults to off, so
there is no server `422` for a client-side floor to contradict.

### Two corrections to earlier readings of this work

Both were asserted in this file and are wrong:

- **`facilityCatalogFrom` was never missing.** It ships in the drop at `land.ts:72`. What it
  needed was two edits: seats via `standSeatsPerLevel()` (the drop's `t.seatsPerLevel ??
  capacityPerLevel` skipped that helper's clamp and its shipped-default floor), and the vestigial
  third parameter removed, since a spare argument is how a second definition gets reintroduced.
- **The i18n total is 150 keys, not 158.** The earlier count compared the drop's `t()` calls
  against `translations.json`'s two TOP-LEVEL keys (`_meta`, `entries`) rather than the entries
  themselves, so eight keys that already shipped looked missing. 121 came from the drop's
  additions file; 29 were authored from their call sites.

### Live operational constraints

- **The quiz bonus is `grant × multiplier × (correct/total)` and pays only when EVERY question is
  answered.** The app fetches once and answers one, so the bonus is collectable only while
  exactly one question is published. **Publishing a second silently makes it unpayable**, and
  nothing on either side warns you. Walking the set needs a re-GET cursor loop (the server
  supports it — `id` advances and goes `null` when done) plus new copy, since
  `ngs.quiz.body`/`correct`/`correctBody` all promise a doubled grant.
- **The 5s quiz timer is soft.** The server refuses `{"answer": null}` with `400
  answer_required` and records nothing, and no invented index is honest — one could be
  accidentally correct and would still spend the single attempt. Expiry stops the bar and shows
  TIME UP with the options live. A hard cutoff needs one line server-side.
- **A 403 signs the player out** before any caller sees it (`apiRequest` → `onForbidden`), and
  three v3 paths can produce a domain 403: `initialize` with an unowned `locationId`,
  `plots/{id}/claim` with `hold_not_yours`, and any `/api/club/*` where `X-Club-Id` disagrees.
  Mitigated by ordering (`land.claim()` resolves before `initializeClub`, pinned in
  `setupHostOrder.test.ts`) and by only sending `locationId` under v3. A proper fix — teaching
  `apiRequest` an allowlist of paths whose 403 is a domain answer — is still worth proposing.
- **Four starter-config fields are still unpublished**: `homeGames`, `ticketPricePence`,
  `sponsorWeeklyPence`, `starterSquadWagesPence`. `economyOf`'s per-field spread covers them from
  `ECONOMY_STAND_INS`; the mapping hook is one memo in `useSetupHost.ts`, so each is a one-line
  change when it lands. `fundingFloorWeeks` maps from the existing `clubFundingProjectionWeeks`
  and `seasonTicketHolderPercent` from game config — neither needs publishing.
- **`ticketPricePence` was corrected 1500 → 2500.** `clubStore` opens at 2500 and
  `bookSeasonTicketSales` falls back to `?? 2500`, so the drop's stand-in modelled £15 tickets
  for a game that starts selling at £25 — a 40% under-read of gate income on the one screen
  where the player commits real money. Pinned against the store default in `economy.test.ts`.
- **Dev prerequisite for testing the quota**: `maxEnrichmentRequestsPerUser` is `0` (unlimited)
  on deployed dev and no deploy changes it. Set a finite ceiling at
  `/admin?routeName=admin_starter_config` → Land Valuations, one-time per environment — and test
  the unlimited path first, since that is what a fresh environment shows.
- **VALUING and NOT VALUED now render the same `Badge`.** `Badge` has no `info` variant, adding
  one is a `05_ui` change needing its own contrast check (the `infoLight` token exists, the role
  mapping does not), and `WK.accent` is rationed. The label and the progress bar distinguish
  them; revisit at device review.
## ✅ SHIPPED 2026-11-18 — the economy left the worldpack (was PARKED 2026-11-14)

**Done, both repos, one cut.** Backend `WORLD_PACK_VERSION` 10 → 11 removes ALL money from the
pack; the app prices every ingested squad at init from published config. The two land together
by design — there is no fallback window, because a backend that had dropped the keys against an
app still reading them would price every squad at zero.

- **Backend:** `tvDeal`/`sponsorPot`/`prizeMoney`/`leaguePositionPot` off the league,
  `startingBalance` + `land.valuePence` off the club, `contractValue` +
  `agent.commissionRate` off the player, `weeklySalary` off the staff member.
  `leaguePositionDecreasePercent` stays — a rule, not an amount. Nothing is priced at
  generation any more. New guard: `WorldPackCarriesNoMoneyTest`.
- **App:** `economy/packWages.ts` is the one place a pack row is priced, for both ingestion
  sites. Balances fall to the existing `npcStartingBalanceByTier` ladder; staff get a
  tier-aware rung instead of `ability × 100`; the sponsor pot is rolled on device from the
  division's bands off a new `sponsorCount`/`sponsorSizes` on the uncached
  `GET /api/initialize/leagues`. New guard: `src/__tests__/economy/packIsACensus.test.ts`.
- **The payoff, and it is directly tested:** re-authoring a turnover figure now reaches a new
  save with **no `WORLD_PACK_VERSION` bump and no regeneration**.

The BINDING rule it produced — **the pack is a census, not a price list** — is in
`01_overview/output/tribal-knowledge.md` (Q4) and mirrored into `CLAUDE.md`.

⚠️ **ONE OF THE TWO CONSTRAINTS BELOW WAS VOID, AND IT IS STRUCK.** See the struck paragraph in
the record that follows — it is left in place, marked, rather than deleted, so that anyone who
remembers the constraint finds out why it no longer holds.

---

**The record as parked, for the reasoning:**

## PARKED 2026-11-14 (owner: "post testing") — move contract values out of the worldpack

**Today the app never prices a pack's squad.** `useInitFlow.ts:241` ingests
`wage: wp.contractValue ?? 0` — the backend's figure, verbatim. So whichever wage model priced
the pack is what a save runs on in season 1, and `wages.ts` prices everything only from the
first renewal onward.

**That is two sources for one quantity**, which is the shape of nearly every economy defect
found this week (authored vs modelled turnover, legacy vs turnover pricing, a default vs its
`??` fallbacks). Generating contracts at world build from the live config would collapse them
into one function, so a squad could not start on a basis the game will not honour at renewal.

⚠️ **What made it concrete.** Flipping `wageModel` to `turnover` means an existing
legacy-priced pack is catastrophically mispriced, in opposite directions at opposite ends:
a legacy squad costs **9%** of tier-1 turnover and **1,208%** of tier-7's. The ~3-season
`renewalTurnoverRate` grandfathering cannot absorb that — a tier-7 club is bankrupt long before
a third of its contracts come up. So today an economy change forces a pack regeneration, which
is exactly what the pack cache exists to avoid.

**Two constraints for whoever builds it:**

- **The country-resolved config fetch is a hard prerequisite** (landed 2026-11-14). Dynamic
  pricing reads the live config at build; against the country-less fallback it would generate
  every squad on a wage scale belonging to no country — strictly worse than today, where the
  backend at least knows the country.
- ~~**Use the deterministic entry point.** `drawWeeklyWagePence` samples the ±8% negotiation
  band per contract, so two devices building the same pack would produce different squads and a
  save would stop being reproducible from its pack. `weeklyWageRange().expectedPence` plus a
  seeded jitter keeps the spread without that.~~

  ⚠️ **STRUCK 2026-11-18 — VOID, and it was void before it was written.** The scenario cannot
  occur: `8ff2e5fd` made a `WorldPackSet` **single-use** — claimed by exactly one club and never
  served twice — so two devices cannot build the same pack (owner confirmed). The shipped
  implementation uses `drawWeeklyWagePence` directly, with the `rng` it already accepts
  (`wages.ts`) seeded from the pack id plus the player id: the pack id makes a squad
  reproducible, the player id makes the draw per-contract. That is the determinism the
  constraint wanted, without giving up the per-contract spread.

  **One real finding came out of doing it.** `seededRng`'s FIRST draw is very nearly
  seed-independent for similar seeds — 0.6405, 0.6417, 0.6413, 0.6424, 0.6421, 0.6432 across
  six player-id seeds, against a properly uniform second draw. Taken straight, every player in
  a squad would have landed on the same point of the ±8% band, so the per-contract draw would
  have been silently defeated while still producing plausible, non-zero wages. `packWages.ts`
  discards two opening draws and documents the measurement. ⚠️ **The same bias affects
  `seededRng`'s other callers** — `clubIdentity`'s `npc-identity-<clubId>` and every appearance
  fallback — which is worth looking at on its own terms, but was deliberately NOT changed here:
  it would re-roll the identity and face of every club and person in every existing save.

**Check before starting:** whether anything else consumes `RawWorldPlayer.contractValue` (it is
optional on the type, and `?? 0` means an absent value silently prices a player at zero).

## SHIPPED 2026-11-11 — the DOF raises more proposals, and you can see why

Mechanics: `game-mechanics.md` §9b. Service surface: `04_interfaces/output/services.md`'s
"DOF proposal volume". Commits `f28f0aa2`, `3ae6f76f`, `f893a73b`, `9461486d`.

**Start here if the question is "why isn't my DOF signing anyone".** The first thing to check is
no longer a threshold: it is whether that DOF was hired mid-game. `dofAutoSignPlayers` and
`dofAutoAssignScouts` were read as truthy while `marketStore.hireCoach` seeds neither, so a DOF
hired through Office → Hire had recruitment AND scouting switched off for the rest of the save,
with nothing in the inbox to say so. New-game DOFs were fine, which is why it survived.
Fixed at both ends and pinned by `dofDelegationDefaults.test.ts`.

**The dominant limiter was attrition, not strictness.** Four paths deleted Formal Shortlist
entries — a DofBrain pass, a ManagerBrain pass, an explicit decline, and the 4-week expiry
sweep — against a pool refilling at 0.6 players per scout-week. A pass is now a cooldown, and a
lapse is distinguished from a decline: an unopened card is not a verdict.

**The call worth revisiting if it feels wrong:** the manager no longer vetoes a signing, it
objects on the card. The owner picked "more proposals to approve", and the manager's gate was a
second `>= 50` cutoff that killed proposals unseen — and formation-blind, so in a 4-4-2 every
defender and midfielder carried a 15-point penalty forever. `dofRequireManagerConsent: true`
restores the old behaviour in one config field.

**Before tuning anything further, read the telemetry.** `trackEvent('DOF Recruitment Tick')`
reports candidates evaluated, proposals raised and a **per-gate rejection tally** — the tally
names which gate is actually binding. There was no telemetry in any of the brains before this,
which is why the review had to read all of them.

**✅ Fixed same day, not left open:** the identical truthy-read bug on five `chairmanAuto*`
duties and `facilityManagerAutoRepair` went in as `da971ee6`. This paragraph said "deliberately
not fixed … someone should take it" and contradicted `game-mechanics.md` §10, which recorded the
fix — corrected 2026-11-11 after checking the code (`staffOfficeParts.tsx` reads `!== false`;
`marketStore.hireCoach` seeds every default-ON duty). ⚠️ It changed in-flight saves on the next
tick: a chairman already in post started balancing the budget, ruling on mandates and booking
excursions.

**Still truthy on purpose:** `managerDeterminesFormation` / `managerDeterminesPlayingStyle` — see
§10 for why flipping those two would start undoing explicit owner choices on existing saves.

**Not measured on device yet.** Every figure here is from running the real functions
(`missionGemRollThresholds` over 2m samples, the gate arithmetic by hand); the end-to-end claim
— proposals per season actually rising in a real save — has not been observed on a device.

## SHIPPED 2026-11-10 — the weekly advance's write cost, and where to resume

**Pick this up here if the question is "the performance of the advance process."** It is a
frozen-not-finished phase: the owner called the freeze deliberately once returns flattened,
to move to device testing. Nothing below is blocked.

### What the phase was

The Drizzle migration closed, and this is the phase that followed it: the wall-clock cost of
a weekly advance, plus the NPC squad-churn behaviour that lives inside it. Success was
defined as **seconds saved per tick, on device** — statement counts are the CI gate, wall
clock is a device question (`jest/drizzleTestHarness/queryPlans.ts`).

### What shipped, and why each one

Measured through a new device surface, then fixed in order of size. One session's write cost
went **1,146 writes / 32,353 rows to 199 / 7,753.**

| Change | Why | Result |
|---|---|---|
| Debug CHECKS renders `writeMetrics` | it was collected and thrown away; nothing rendered it | the instrument the rest of this rests on |
| Per-seed timing in `runPendingSeeds` | a post-restore boot spent **100 seconds** in seeds with no way to attribute it | 0.2-0.5s on an ordinary boot; the 100s is restore-only |
| Six write-batch envelopes | per-setter writes each claimed their own exclusive scope | see `03_data/output/state.md`'s "Write batching" |
| Two `bootstrap.ts` subscribers deleted | wrote every staff member on every change: `members x mutations` | `staff.upsertMember` 498 to 0 |
| `marketStore` content signature | `setMarketData` ran twice, re-ingesting the whole market each time | staff rows written halved |
| `MARKET_STAFF_PERSIST_LIMIT` (250/type) | ~8,650 free-agent staff rows persisted, **none of them read** | `staff` table 6.5 MB / 10,605 rows to 1.9 MB / 2,403 |
| `batchUpsertStats` collapsed | 1,583 statements, the largest write in the tick | **4,787ms to 260ms**, 4 statements |
| NPC contract seeding widened | every NPC contract was 1-104 weeks, so none exceeded two years | 53-260 weeks, 75% over two years |
| `EXTEND_SCORE_THRESHOLD` tier-scaled | an absolute 55 is unreachable below tier 6, so the bottom of the pyramid renewed nobody | the churn fix |

The two behaviour fixes at the bottom are the NPC free-agent churn the owner reported from
gameplay; the diagnosis and the hypotheses that were killed are in the plan file.

### The one thing that was never measured, and should be first on resuming

**Everything above is a proxy.** Write counts, row counts and statement counts all improved;
**the wall-clock duration of an advance was never measured before or after.** Most of those
writes were queued or fire-and-forget, so it is genuinely open whether the figure the player
waits on moved at all.

The instrument exists and needs no building: the `'Week Advanced'` Amplitude event
(`useWeeklyTick.ts`) already carries **`criticalMs`** — the blocking portion — plus `totalMs`,
`backgroundMs`, per-phase `phase_<slug>_ms`, `npcClubCount` and `squadSize`. **Read
`criticalMs` before/after on the same save shape before treating any of this as a win.** If
it has not moved, that is the most important finding of the phase and it redirects the work
from writes to whatever actually blocks the thread — of which ~372ms is known to be
deliberate cosmetic `setTimeout` padding in `doAdvanceWeek`.

### Lined up next, in the order I would take them

1. **`players.upsertWithForeign`** — 2,493ms for 375 rows, and now the head-of-line blocker
   (`club_state.save` queued 2,492ms behind it). Two N+1s inside one transaction: a guarded
   `INSERT … SELECT … WHERE NOT EXISTS (player_club)` per entry, and
   `writeAgentAssociationInTx` at 2 statements each. Both are commented as having "no
   multi-row form", and the guarded insert carries the objection that *"splitting it into a
   read plus a write would reintroduce the race it exists to close."* **That objection does
   not hold inside this transaction**: `runBulkWrite` has already opened a write transaction
   and the player upserts have run, so the write lock is held and the global queue serialises
   writers — a `SELECT player_id FROM player_club WHERE player_id IN (…)` *inside* it cannot
   be overtaken. That turns 375 guarded inserts into one select plus one chunked insert; the
   agent associations need their own batch form. ⚠️ Fires once per periodic foreign-pool
   refresh, **not every tick**, so it is worth less than its size suggests.
2. **`VACUUM`** — freelist is **13.7 MB of a 38.4 MB file (36%)**, up from 9.1 MB because
   deleting 8,200 staff rows frees pages without returning them. Still never proposed or
   measured, and now the largest unexamined item anywhere on the list.
3. ✅ **B1c — DONE 2026-11-10** (`d9ece537`). A lapse is reconsidered on NEED by
   `decideReinstatements`: positional cover first, then headcount, strongest-first in both, and
   it only ever un-lapses. Full rule in `game-mechanics.md` §9.
4. ✅ **B3 — DONE 2026-11-10** (`c454eab1`). The ceiling is tier-relative
   (`NPC_THINNING_NORMALISED_CEILING = 38` via `isSquadThinningCandidate`), the pass gained the
   squad floor expiry already had, the literal is named, and a dead accumulator went with it.
   Measured skew before the fix: tier 8 lost 25.0% of its first team per season, tier 1 9.4%.
   ⚠️ This was the **third** instance of the defect class, so it also produced a structural
   guard — `tierScaledThresholds.test.ts`, see `game-mechanics.md`'s rule 0.
5. **Slice 4 of the plan** — ⚠️ **two of its three parts were already done when this line was
   written; only one remains.**
   - ✅ `docs/drizzlemigration` → `docs/drizzle`, **done 2026-11-11**. 31 references across 12
     files, 4 of them in source (all comments) — the counts in the old line ("15+ inbound
     citations, 8 in source") were both wrong, under on references and over on source.
   - ✅ Declaring the migration complete in `tribal-knowledge.md` Q4 item 8 — **already there**,
     in bold: "Drizzle Phase 2 is COMPLETE (device pass 2026-10-11)".
   - ⬜ **The 24-row staleness register is the only part left**, and it needs care rather than
     landing: the draft of 2026-11-10 contained at least one claim that was simply false (it
     said a dropped repository would pass `portedRepositoryArchitecture.test.ts`; the test
     asserts the ported SET by equality, so it would fail). That correction is recorded in Q4
     item 8. Do not land the register without re-verifying each row against the code.

### Owner-side, not app-side

- **`db_seed_checkpoints` is export-excluded**, so a save restore re-runs the whole one-time
  seed lane — **100 seconds** on a real save (DEVICE_TEST_PLAN defect 18, last measured at
  10.8s as P21; it grew because the seeds that iterate `staff` got ~100x more rows). The
  export is built outside this repository, so the app can only make the re-run cheap. Letting
  the checkpoints survive a restore would reclaim all of it at once.
- **Sponsor band values in the admin panel**, and whether the bankruptcy tiers still read
  right after the `x100` fix.

### State at the freeze

`dev` at `1667263a` = **OTA 439**; `development` one commit ahead (`ea79c698`, docs only, held
back so it would not bump the OTA number mid-test). **`dev` is 290 commits ahead of
`master`** — all of this is dev-only, and the longer it sits the less attributable any
regression becomes. That is a decision to take deliberately, not to let drift.

Device readings are in this file's sibling stage outputs rather than `DEVICE_TEST_PLAN.md`:
no P-number or D-number was assigned, because every reading came from the new CHECKS panel
rather than a formal probe. **Next formal numbers remain P22 and D15.**

⚠️ **One run's TIMINGS are not evidence** — the same statement on identical code measured
8,775 / 5,352 / 36,621 ms across three sessions. Counts and row counts are structural and
fine from a single run. See `01_overview/output/environment.md`'s "Identifying which OTA a
device is running" for the full caveat and for how the build number on the splash moves.

## SHIPPED 2026-11-06 — tournaments are a front-page feature now, and `.context/` was still describing a soft launch

The code half is small; the point of the entry is the status change behind it.

**The card.** `src/components/dashboard/TournamentsEntryCard.tsx` was a plain link, last in the
dashboard stack. It is now the gold bar from `assets/Components/design_handoff_tournaments_gold_bar`
(option 1c), **2nd on the dashboard directly under the club card**: one ~56dp row — `Swords` ·
TOURNAMENTS over a meta line · a countdown · chevron — whose **entire fill turns `WK.accent`
whenever the club holds a live entry**, showing the entry count, the next tie (`SF vs Dorchester
Town`) and HH:MM:SS to kick-off, `LIVE` once that passes. With no entries it is an ordinary
`match`-domain row reading `No entries · 4 open to join`. Anatomy and the two states:
`05_ui/output/patterns.md`'s "The dashboard's Tournaments card"; the gold exception is now an
entry in `design-system.md` §5's rationing list, the second one there that is a FILL rather
than a marker.

**Three handoff assumptions about the host were wrong, and the same one keeps being wrong:**

1. "Currently last on the dashboard, **debug-gated** — keep the existing debug flag." There was
   no flag to keep; the `debugLoggingEnabled` gate came off on 2026-11-03.
2. "`activeEntryCount` is **already available locally**." It is not, anywhere. There is no
   tournament repository and no hub store, and nothing outside the hub payload knows what the
   club has entered.
3. "Prefer deriving them from the **already-cached** hub state." There is no shared cache —
   `useResource` holds state per hook instance.

So the card takes **one** `GET /api/club/hub` on focus, conditional, **no polling**, keyed on
`gameDate` so a weekly tick refetches in full — the shape `useAdvanceTournamentCta` already
established. (It sends `If-None-Match`, but per the 2026-10-25 audit in
`04_interfaces/output/routes.md` the hub endpoint computes no ETag, so assume a full 200 per
focus; that is the reason not to add a poll on top of it), and the reason the plain link existed (never put the hub's 30s poll on the club
dashboard) is still honoured. All three values are derived in `dashboardLogic.dashTournaments()`,
pinned by seven cases in `__tests__/components/dashboard/dashboardLogic.test.ts`. The entry count
unions **two** places in the one payload, because a competition appears in only one of them: a
drawn entry carries an upcoming match, an entry in a competition that has not started yet is
only visible as `viewer.relation` on the `open` list.

**The documentation half was the larger finding.** `.context/` was still telling agents the
tournament system was a gated, unsettled gap:

- `architecture-notes.md`'s section was titled *"The tournament system is the one place every
  stage shows the same gap"* and named six files that were deleted in the 2026-10-24 hub rebuild,
  plus a four-table SQLite archive dropped by migration `0015` the same day, as the system's
  current shape. Retitled and reframed: it is the one **server-authoritative** feature in a
  client-authoritative game, and the history is now explicitly marked as history.
- `overview.md` did not mention tournaments **at all** — the cross-stage overview of the app
  omitted its only server-run feature.
- `tribal-knowledge.md` still said the soft-launch gate "may still control whether it's visible
  to production users — check that gate directly".
- `patterns.md`, `navigation.md` and `structure.md` each still routed matchux's tournament mode
  through the deleted `TournamentMatchResultScreen`.

**The lesson, which is about `.context/` rather than about tournaments:** a feature's *status*
goes stale faster than its *mechanics*, and nothing in the stage contracts prompts anyone to
re-read a "this is unsettled, expect little precedent" framing after the thing ships. Four
separate docs kept a removed gate alive for three days past its removal. When a gate comes off
or a rebuild lands, grep `.context/` for the feature name and the gate's identifier in the same
change — `debugLoggingEnabled` found all of it in one pass.

## SHIPPED 2026-11-05 — the database connection is no longer owned by a React component

Sentry #20 (`158752380`): a native `SIGSEGV` in `exsqlite3_column_text`, reached through
`expo::NativeStatementBinding::getColumnValues`. Breadcrumbs: `TRIM_MEMORY_BACKGROUND` twice,
`MainActivity destroyed`, recreated, `resumed` — then death, with a read in flight from
`/office/fans`.

**The deciding evidence was a tag, not a stack.** It arrived `react_tree: 1` with no duplicated
breadcrumbs, so the double-mount that every guard in `client.ts` had been built around was
**not** involved. A single Activity destroy/recreate is enough on its own — which means no
arrangement of guards inside a statement could fix it, because the connection was being closed
deliberately, by `SQLiteProvider`'s unmount cleanup, on a schedule nothing in JS controls.

That one fact is the root cause of a family of faults chased separately for weeks: session-long
"Access to closed resource", the `exsqlite3_finalize` SIGSEGV (#15, `154013202`, guarded the
morning of the same day), and this one. And the argument was already in the codebase,
unapplied: `reopenDatabase` has opened module-owned connections in production since it was
written, as the *recovery* path.

**What landed** (both halves — full writeup in `03_data/output/schema.md`):

1. `openOwnedConnection(configure)` in `src/db/client.ts` opens `wk.db` once per JS context with
   `{ useNewConnection: true }` and owns it for the process; `useOwnedDatabase(ready)` calls it
   from `RootLayout` behind the reset and migration gates, and the tree renders behind a
   non-null handle. `<SQLiteProvider>` is gone, pinned by `src/__tests__/db/ownedConnection.test.ts`.
2. `requireLiveHandle(db, step)` guards each native round trip in `execDrizzleStatement` — a row
   read is **four** of them, and the #15 guard only covered the last. Counted in
   `abandonedReadCount()`, next to the skipped finalizes in CHECKS → DATABASE → "Connection churn".

⚠️ **Not yet device-verified.** Both #15 and #20 were reported from OTA dist
`01a1a778` (2026-11-04 16:50), which predates either fix. The reading that would confirm the
second half is a **non-zero** abandoned-read count in "Connection churn" on a device that
backgrounds under memory pressure; the reading that confirms the first is that count staying
**zero** while no "Access to closed resource" appears at all. Note those point opposite ways, so
read them together rather than one alone.

## OPEN 2026-11-03 — a Java-heap `OutOfMemoryError` in SVG path parsing, and the measurement shipped for it

Sentry `158327531`: production, `dist 126`, TECNO BG6m (`device.class: low`, **armeabi-v7a**,
1.87 GB RAM), `route: /home`, `nav_count: 19`, 11 minutes into the session.

    OutOfMemoryError: Failed to allocate a 16 byte allocation with 979896 free bytes and
    956KB until OOM, target footprint 134217728, growth limit 134217728; giving up on
    allocation because <1% of heap free after GC.
      lineTo in PathParser.java:274 → parse:136 → PathView.setD:28 → RenderableViewManager.setD

So the ART heap sat at its **128 MB** ceiling with a full GC unable to free it, and the 16 bytes
that failed were one per-command object. `low_memory: False` with 224 MB of free RAM — the app's
own heap cap, not system pressure.

**The frame is the app's biggest Java allocator, which is not the same as the leak.** Every
sprite here is run-length rasterised (`isoEngine.toImage()` and siblings emit one `M…h…v…h…z`
subpath per horizontal pixel run), and `PathParser` allocates a `PathElement` + `Point[1]` +
`Point` for EVERY path command and parks the list on `VirtualView.elements` for the life of the
view. Measured off the real renderers:

| Render | `<Path>` | path commands | `d` |
|---|---|---|---|
| Dashboard stadium band (`/home`) | 142 | **40,905** | 198 KB |
| Badge / kit / avatar / trophy | 13 / 20 / 67 / 18 | 1,420 / 790 / 2,930 / 1,490 | 6 / 3.4 / 13 / 7 KB |
| One visit to Facilities › Stadium | 1,165 | **225,200** | 1,084 KB |

Three multipliers, in order of how much is pure waste:

1. **`elements` is marker data this app never uses.** It is read in exactly one place —
   `RenderableView.renderMarkers`, guarded on `markerStart/Mid/End` — and there is not one
   marker prop in the codebase. At ≈60 B/command on 32-bit ART (`PathElement` 16 + `Point[1]`
   16 + `Point` 24 + list slot 4) that is ~2.4 MB for the dashboard's stadium alone, ~12.9 MB
   for Facilities › Stadium.
2. **Each `<Svg>` also caches a view-sized ARGB_8888 bitmap** (`SvgView.drawOutput()`), so the
   pixels are held twice. 648×480×4 ≈ 1.24 MB for the stadium band. Native heap on Android 8+,
   so it cannot be what exhausted a *Java* heap — it is an RSS cost, and conflating the two is
   how this gets diagnosed wrongly.
3. **Facilities › Stadium draws the whole ground five times** — the hero plus one per stand,
   because stands have no crop, so `FacilitySpriteTile` falls back to the full site with that
   stand `selected`, into an 88 dp tile.

**Ruled out, each by one fact:** Fabric view-pool retention (`enableViewRecycling()` defaults
false in RN 0.86.3 and react-native-svg never calls `setupViewRecycling()`); the double-React-tree
fault (`react_tree: 1`); a season transition still running (`season_transition_step` is a sticky
tag — it reached `finalizing` earlier in the session); unbounded stack growth (the drawer uses
`router.navigate` on purpose). The two canceled `POST /api/club/kit-identity` / `/api/sync`
breadcrumbs are an app in trouble, not a cause.

**What is NOT established: where the rest of the 128 MB went.** The per-screen figures above do
not add up to it, and **nothing in the app reported its own memory** — no `Runtime`,
`onTrimMemory` or `expo-device` reading anywhere — so a crash report could not answer it.

### Shipped for it: `src/utils/spriteBudget.ts` (no behaviour change)

A live count of mounted sprite `<Path>` commands, reported as **TAGS** (`svg_cmds`,
`svg_peak_cmds`, `svg_java_mb`, `js_heap_mb`) plus an exact `svg_budget` context — tags because
for a native crash the final JS breadcrumbs are not synced across before the process dies, which
`overlayTelemetry.ts` already established and this report confirms (it carries `route` and
`react_tree` on a `mechanism: UncaughtExceptionHandler` event). `useSpriteBudget(image)` is
called by all eleven sprite seams; measurement is cached per image object in a `WeakMap`
(0.87 ms per full stadium on a dev Mac, once per distinct image), and a mount big enough to
matter flushes **synchronously** rather than on the microtask, because the OOM is thrown on the
UI thread after the commit. It also reads the Hermes heap, which is outside ART and therefore
cannot throw this error — that is the point: the next report can tell a Java-side problem from
a JS-side one instead of inferring. Ship the cheap measurement that is capable of saying no.

**Read the next report like this:** `svg_java_mb` near the ceiling implicates the sprites, and
`svg_peak_cmds` far above `svg_cmds` says churn rather than a live set. Both small exonerates
SVG entirely and the search moves to the view hierarchy (every `<Path>` is also an Android
`View`) and whatever else holds Java objects.

**New churn to watch, added 2026-11-05: the boot splash now steps through ELEVEN frames, not
five.** The option-2a build runs LV 0 → LV 10 of one randomly picked site sprite, so a boot is
~11 mount/unmount cycles of a full ground instead of ~5 — during boot, on the thread and heap this
OOM was thrown on. The numbers, measured off the real renderers:

- Worst single frame is **`stadium | city | LV 0` at 55,450 path commands and 273KB of `d`** —
  *larger* than the dashboard stadium band this investigation was opened on (40,905 / 198KB).
  Construction scaffolding costs more than a finished ground, so the most expensive frame is the
  first one, and it is the one rendered synchronously at mount.
- Only one frame is mounted at a time, so the LIVE set is unchanged. This is a `svg_peak_cmds`
  question, not a `svg_cmds` one.
- The random pick helps: the stadium is by far the most expensive and is one boot in four. The
  three plot sites are ~25,000–28,000 commands, about half the stadium's worst frame.
- Retained JS (not ART) cost of the cache is ~2.6MB of `d` strings for eleven stadium frames, up
  from ~1.2MB for five. Capped at `SPLASH_LEVELS + 1` entries.

**What to read off the next low-end device:** `svg_peak_cmds` after a cold boot that drew the
stadium, against one that drew a plot site. If peak is where the problem is, the lever is already
in place — `splashLevelCache`'s level list is derived from `SPLASH_LEVELS`, so halving the frame
count is a one-constant change and an OTA, not a rebuild.

### Levers, not yet taken

OTA-shippable (JS only): stop drawing the whole ground for stand tiles (~164 k commands and 4
bitmaps off that one screen); 2-D rect merging in `toImage()` — **measured 26.2% fewer subpaths**
(8,181 → 6,039) for identical pixels, but `__tests__/components/facility-sprites/geometry.test.ts`
sums `h` widths assuming 1-px-tall rects and would need updating; device-class-aware degradation.
Needs a native rebuild and redistribution (`runtimeVersion.policy` is `appVersion`): a
`patch-package` of react-native-svg to build `elements` lazily — the biggest single win, and
react-native-svg is not currently patched at all — or `android:largeHeap="true"` via a config
plugin (`expo-build-properties` is installed but does not expose it), which is a plaster.

Noticed in passing, not acted on: `hubPrimitives.tsx`'s module-level `spriteCache` is an
unbounded `Map` keyed on `JSON.stringify(config)`. JS heap, not ART, so it is not this crash —
but nothing evicts it.

## SHIPPED 2026-10-31 — the facility-effects pass, and what it left open

**41 commits merged to `master` and released as a production OTA** (`expo.version` unchanged at 1.2.0,
so no installed build was stranded). A week of work that started as "fix the facility card copy" and
turned into an audit of whether facility effects do anything at all. Full detail:
`04_interfaces/output/services.md`, "Facility gameplay effects"; per-pass history in
`shared/last-sync.md` (passes 22-32).

**What it found, in one line each:**

- **Four aggregated `FacilityEffects` totals were computed and then discarded** — `xpMultiplierTotal`
  (ceiling 28.70, 98% of it the four stands), `cohesionBonusTotal` (26.00), `scoutRevealWeeksDelta`
  (17.5) and, at the card layer, two hardcoded label maps that disagreed with the engine on every slug.
  All four are now wired or retired; XP went to club reputation growth, cohesion to positive bond
  formation, scout reveal to mission duration.
- **One level of `physio_clinic` made injuries impossible** for the rest of a save — and the AMP club's
  probability was reused for every NPC club, so *nobody in the game world* could be injured.
- **A flat subtraction from a small ranged quantity appeared three times** (injury probability, injury
  recovery, scout reveal) and is now treated as a smell on sight. Two of the three had to change
  FORMULA, not numbers.
- **`DEFAULT_GAME_CONFIG.baseInjuryProbability` was 0.05 while live said 0.1**, so every test and every
  pre-sync boot modelled injuries at half the real rate.
- **The youth development report had never been delivered** — same inbox id as the first team's, and
  `addMessage` keeps the first.

**Open, and each is the user's call rather than a code task:**

1. **The reputation levers are coupled.** `reputationBonus` totals 2.14 against a 1.99 saturation, so it
   closes the shared +25% clamp alone and `xpMultiplierTotal` is absorbed entirely until those 22 values
   come down. Accepted knowingly; a test asserts it.
2. **The scouting ceiling guard is red and arguably wrong.** `REACH_WEEKS` 1/2/3/4 yields only five
   distinct outputs, so every ceiling at or above ~0.375 gives the same mission table. The live 1.4
   already delivers the intended maximum. Either relax the guard to assert the OUTCOME TABLE, or lower
   the catalogue to ~0.03 if OVERSEAS should stay at 3 weeks.
3. **A maxed medical department is a 5.6x swing in squad availability** (18.4 -> 3.3 expected weeks lost
   per player per season), because the 70% probability cut and 40% duration cut multiply. Invisible in
   the admin CRUD, where the two fields are tuned separately.
4. **Two config fields are named `...WeeksDeltaPerLevel` but carry FRACTIONS** — held together only by
   comments. Backend follow-up: send `injuryRecoveryReductionPerLevel` / `scoutRevealReductionPerLevel`
   and read `new ?? old`.
5. **Unimplemented claims still shipping:** the four stands' descriptions promise an "Executive Box" at
   Level 5+ with no implementing code, and `youth_academy.youthDevelopmentBonusPerLevel` is the last
   `gameplayEffects` field the aggregator ignores.
6. **Uncalled selectors** — `facilityStore.maxSquadSize()` (so no squad cap binds anywhere),
   `facilityTier()`, and `analyticsUnlocked()` which `app/player/[id].tsx` re-implements inline.

⚠️ **Where this is documented is itself a known problem.** All of it lives in
`04_interfaces/output/services.md`, whose charter is the external API surface — but facility effects,
injury formulas, bond growth and reputation curves are **game-loop internals**, which
`CONTEXT.md` says have no dedicated stage. That file grew ~4,300 tokens this week on this one subject
and `04_interfaces` is now the second most expensive stage. An agent asking "how do injuries work" would
not look there. Splitting it into its own output file is the obvious next step and needs a human to
approve the shape.

## OUTSTANDING — `expo-sqlite` 57.0.2 -> 57.0.4 (held 2026-10-24, re-scoped 2026-10-24)

**Still worth doing, and still not done — but it is NOT the fix for the native
SQLite crashes.** The claim that it was (written here the same day) did not survive
reading the diff; the corrected per-frame verdict is below. Held on purpose: it
changes native code, so it needs a rebuild and a device pass rather than an OTA, and
nobody has run that yet. Not blocked on anything; just not started.

`expo-sqlite` **57.0.4** (2026-10-06) says, in its own changelog:

> Fixed reading a prepared statement result after the same statement ran again
> returning the later run's rows instead of throwing. Also guarded `step`,
> `getAll`, `reset` and `finalize` with the same per-statement lock that `run`
> takes.

**What the diff does**, verified 2026-10-24 by diffing the published 57.0.4 tarball
against the installed 57.0.2: `step`, `getAll`, `reset` and `finalize` each gained
`synchronized(statement)` on Android (`SQLiteModule.kt`) and the equivalent
`statement.lock.wait()/signal()` on iOS (`SQLiteModule.swift`). Nothing else in either
file changed. Two details decide whether that touches this app at all: `getColumnNames`
did **not** gain a lock, and `run` — which begins `exsqlite3_reset(stmt)` — already had
one in 57.0.2, on both platforms.

| Sentry | Frame | Covered by 57.0.4? |
|---|---|---|
| `155500974` | `NativeStatementBinding::getColumnNames` (Android SIGSEGV) | **No.** Unsynchronised in both versions, and a lock only helps when both sides of a race take it. |
| `153465903` | `sqlite3_reset` -> `pthread_mutex_lock` (iOS EXC_BAD_ACCESS) | **No.** Same reason as below; iOS `run` also already held `statement.lock`. |
| `155675759` | `sqlite3_reset` -> `pthread_mutex_lock` (Android SIGSEGV) | **No.** The app's only route to `sqlite3_reset` is `SQLiteModule.run()`, already locked in 57.0.2. The `reset` 57.0.4 locked is the standalone `SQLiteStatement.resetAsync`/`resetSync`, which this app never calls — zero hits in `src/`, zero in `drizzle-orm`, and expo's own JS only calls it from the public method. |
| `154013202` | `sqlite3_finalize` -> `pthread_mutex_lock` (Android SIGSEGV) | **Partly.** `finalize` is newly locked, but its `maybeThrowForFinalizedStatement` guard still sits OUTSIDE the critical section in 57.0.4, so the window narrows rather than closes. |

**What is actually killing these sessions.** `sqlite3_reset` faulting inside
`pthread_mutex_lock` means it dereferenced `vdbe->db->mutex` on freed memory — the
`sqlite3_stmt` had already been finalized. Exactly one thing in expo-sqlite frees
statements out from under a live holder: `closeDatabase()`, which calls
`sqlite3_finalize_all_statement()` (`finalizeUnusedStatementsBeforeClosing` defaults to
**true**) and only then `sqlite3_close` — on `Dispatchers.IO`, i.e. concurrently with
queries running on other IO threads. The app never closes the live handle on purpose
(`reopenDatabase` says so in a comment), so the closer left is expo-sqlite's own
`OnDestroy` hook, which closes EVERY cached database when the module is torn down. That
fits `155675759` exactly: its breadcrumb trail ends on a back-arrow tap during the long
write burst of `Assembling your squad…` (`useInitFlow.ts`), on a 3.8 GB Galaxy A21s at
20% battery — the activity going away mid-burst, which is the fault `client.ts`'s
dead-connection comment has described since long before the sweep. Lose that race and the
"Access to closed resource" you normally get becomes a segfault instead.

**A per-statement lock cannot cover that**, in either version: `closeDatabase` never takes
the statement's monitor. So take the bump as hygiene — it is a lockfile line and a strict
improvement — but do not expect the rebuild to close these four, and do not treat them as
fixed when it ships. The real levers are keeping writes out of flight across teardown (the
background write gate is the first half, and only holds writes that have not started yet)
and making the init burst resumable so a kill mid-burst costs nothing.

**What it takes:** `package.json` already declares `~57.0.2`, which permits 57.0.4 — so
this is a lockfile update (`npm install --legacy-peer-deps`), a fresh dev APK
(`./scripts/build-android.sh --apk=yes --env=dev`), and device time. It cannot ship as an
OTA; `runtimeVersion.policy` is `appVersion`, so the build has to be distributed.

**Found while re-checking this, and shipped instead: a reopen was not reopening.**
expo-sqlite caches and REFCOUNTS connections by path plus options (`SQLiteModule.kt`'s
`NativeDatabase` constructor returns a cached one unless `options.useNewConnection`).
SQLiteProvider opened `wk.db` with no `options` prop and `client.ts` opened it with none
either — the same cache key — so `openDatabaseAsync('wk.db')` in `reopenDatabase` handed
back a second JS wrapper around the connection that had just died, and the dead-on-arrival
retry returned that same object a third time. A connection can also be *poisoned* and left
in that cache: `NativeDatabase` is a `SharedRef` whose `sharedObjectDidRelease()` calls
`resetNative()` and destroys the shared C++ binding, while `cachedDatabases` goes on
holding the Kotlin object with `isClosed` still false — which is the
`java.lang.NullPointerException` / "already released" pair the matcher knows, and is the
shape of Sentry `155643565` (every pragma failing on a handle broken since open). Fixed by
`REOPEN_OPTIONS = { useNewConnection: true }` in `src/db/client.ts`, with the reasoning at
the constant and two tests in `clientRecovery.test.ts`. **This half is OTA-shippable** and
needs no rebuild.

**What the JS-side sweep did, and why it is not a substitute:** the work in `1af71707`
fixed four paths that were REPLACING the dead-handle error before anything could match it,
so a session now recovers instead of running on with a dead connection. That addresses the
aftermath. It cannot prevent a native segfault. See `architecture-notes.md`'s "The dead
SQLite handle has THREE spellings".

---

**Newest (2026-10-22): Stage 1 of the Drizzle Phase 3 health engine is
finished — a maintenance lock, a backup primitive, and a registry that went
from 5 invariants to 11.** Commits 6-8 of the eight-commit plan in
`docs/drizzle/stage1-health-engine.md`, all on `development`.

**The lock (commit 6).** `withMaintenanceLock` in `src/db/client.ts` gives a
repair pass the database to itself: it drains the write queue, then a sentinel
gate at the head of `runExclusive`'s queued callback holds every write that
arrives until the pass finishes. The gate lives in `runExclusive` because that
is the single global funnel, so it covers writers the health engine has never
heard of. **Two deadlocks are possible and neither is detectable at runtime** —
claiming the lock from inside an exclusive callback waits on a drain that cannot
finish, and a queued write inside the lock's callback waits on a lock that
cannot clear; at the gate, a repair's own nested write is indistinguishable from
an unrelated writer that arrived during the window. So the rule is lexical:
`withMaintenanceLock` joined `EXCLUSIVE_HELPERS` and a new §2c in
`portedRepositoryArchitecture.test.ts` checks both directions across all of
`src/`. Writes inside a pass take the raw handle, which is safe only there.

**The backup (commit 7).** `src/db/health/backup.ts` — `VACUUM INTO` under the
lock, D9's device-verified primitive (277 ms on a 43.5 MB save, no `-wal`
sidecar, and it compacts). Verified **two ways, because they answer different
questions**: `integrity_check` proves the file is structurally sound but cannot
see a complete-but-incomplete copy, and row parity catches that — parity is only
meaningful because the lock is held. Retention 2, and that is the only bound
that exists: `emergencyPruneIfOverLimit` prunes AsyncStorage keys and can never
reach a `.db` file. **It has no caller yet, by design** — no invariant has a
`repair`, so "back up before every repair" binds at the first repair site.

**The registry (commit 8).** Six invariants registered and two dropped, one
commit each, closing §1.2's candidate list with **no `[U]` surviving** — the
plan's exit criterion. Registered: `pool.exclusive` (device history P10-P18),
`pool.complete` (D13 found 190 stranded players), `listed.has_club`,
`squad.one_amp_club` (**`major` on purpose, not `fatal`** — nothing enforces it,
so a false positive would be an unbootable game with no recovery UI; promote
after a release of clean readings), `store_state.parseable` (one `json_valid`
predicate, the first consumer of D3's device finding), and `potential.range`
(`cosmetic`, so CHECKS-only). **Dropped with their reasons recorded as absence
tests:** `fixtures.clubs_exist`, because "resolve" needs a definition and the
AMP club is a JSON blob with a runtime-assigned id rather than a queryable row
(registrable only once club fields become columns — §2.8's narrow first step);
and `checkpoint.not_hollow`, where the design's `[V] already implemented, move
it` note is half-wrong — the thing it names reads an **AsyncStorage** key, so it
cannot live in an engine that runs before hydration and from `scripts/db/*`.

**Registering an invariant found a live bug, which is the point of the
exercise.** `listed.has_club`'s §1.3 step 2 (name a path that can violate it)
turned up two: `squadStore.removePlayer` deleted the `player_club` row and left
`player_transfer_list` standing, and both of `GameLoop`'s exit paths come
through it — contract expiry (§3e) and the coach-ratio exit — each then adding
the player to free agency. **A listed AMP player whose contract ran out became a
free agent who was still on the transfer list**, which
`getTransferListedPlayers` and the squad header's listed count read directly.
`releasePlayer` had always cleared it and its comment says why. Fixed at the
shared place with a test; **it repairs the path, not existing damage**, so an
old save can legitimately report that invariant on its first boot after this
ships — history, not a regression.

**Measured, and the headroom is now the interesting number:** the boot pass is
**9 statements and ~9 ms** at the 10,000-player fixture (median of five), against
§3's budget of 12 statements and a 150 ms harness tripwire. `pool.complete` is
4 ms of that, double the next costliest, because it is four correlated
`NOT EXISTS` per player. Commit 5 measured 4 statements and ~1 ms, so **three
statements remain** and the next boot-scoped invariant is what runs out of room
— at which point §3 says move checks out rather than raise the number.

**Two things are deliberately NOT done, and both are the owner's call rather
than work:** the first `fatal` invariant plus a recovery surface (one commit,
and its own precondition is clean device readings), and a **post-init health
pass** — §2.4d argues for one, because a world built after boot gets neither the
always-lane repairs nor a health check until the next launch, but the call site
is a new awaited call in the init flow and §2.3 item 12 lifted `useWorldInit`
narrowly while saying more of the boot path is a separate ask. **Device-verified the same day (P19).** A CHECKS run on the `dev`
OTA read **boot 9/9 clear, full 11/11 clear** — exactly the registry's shape,
which is what proves the bundle carries it, since the engine read 4/4 and 5/5
before. Every registered invariant is verified individually, and the registry's
`pool.complete` **agrees with the independent diagnostics check**: 199 outside
the partition, 199 youth, zero unexplained. `listed.has_club` came back clean
with 44 listed players in the save, so the damage the fix predicted was absent
there. **Not verified, and cannot be yet:** the lock and `backup.ts`, which have
no caller until the first repair; the boot pass's wall clock on device (the
report times when it ran, not how long — the harness's ~9 ms does not
transfer); and iOS, which now carries `store_state.parseable`'s dependency on
`json_valid` too. Two findings came out of the same run and are recorded in the
status doc's §2.4e: the database freelist is now **54 MB of 70.5 MB**, and
`staff` is the heaviest table by payload at 5.8 MB over 9,715 rows — six times
`players`, and absent from every ranked load-path option. ⚠️ **Both figures are
superseded — see the 2026-11-10 entry at the top of this file.** On a different
save that day the file was 38.4 MB with a 13.7 MB freelist, and `staff` dropped
from 6.5 MB / 10,605 rows to **1.9 MB / 2,403** once free-agent market rows
stopped being persisted wholesale, which left `match_results` (5.2 MB) as the
heaviest table. The freelist share (36-77%) is the part that holds across both
readings, and `VACUUM` is still unmeasured. `jest` is 410 suites
/ 6,639 tests green and `tsc` clean.

**Previously (2026-10-18): the user club's youth lifecycle can be delegated to the
manager, and a manager-signed graduate now starts with a real bond.** Two
`Coach` flags, `managerSignsEligibleYouth` and `managerHandlesYouthIntake`,
**both default ON and both read as `!== false`** (the `dofAutoHireStaff`
convention — `marketStore.hireCoach` seeds almost no delegation flag, so `!!`
would silently read a mid-game hire as opted out). With signing delegated,
`GameLoop` §11g stops firing the per-player `youth_promotion` SIGN/PASS card —
which re-fired *every week* while an over-age youth sat unsigned — and posts one
`youth_promotion_digest` a week instead. With intake delegated, the manager
enrols or passes on each claimed prospect and the season's existing
`youth_intake` message is re-worded; **its id and `systemType` are deliberately
unchanged on both branches, because that message is the once-per-season
idempotency guard.** The promotion write itself moved out of
`app/player/[id].tsx` into `src/engine/YouthPromotionService.ts`
(`signYouthToFirstTeam`), so the screen and the manager run one implementation;
the 50–60 manager↔player bond is seeded there, and ONLY when the manager made
the call. Unlike the NPC path, a blocked promotion **defers** rather than
transfer-listing one of the owner's seniors to make room. Separately,
`ManagerBrain.assessYouthPlayer` was made materially more willing — its
hardcoded `potential * 0.75` became `config.youthPromotionPotentialWeight`
(0.9) plus a new `youthPromotionWillingnessBonus` (10), dropping the
"promote at 16, no positional need, ability 50" bar from potential ~71 to ~48.
That function still never reads `overallRating`, which is now stated in its doc
comment and pinned by a test — a 16-year-old is judged on ceiling, full stop.
Two notes for whoever picks this up: **default-ON changes in-flight saves on the
next tick** (an unsigned over-age youth gets decided, possibly released, with
the digest as the only notice), and `config.youthEnrollmentWeeks` /
`config.youthIntakeCooldownWeeks` were confirmed to have **no readers anywhere**
— the delegated path uses 104 weeks, matching the screen and
`promoteYouthPlayer`, rather than wiring up a dead key. Full writeup:
`04_interfaces/output/services.md`'s "Youth delegation" section.

**Immediately preceding (2026-10-13, after the 16-bit sprite swap): the avatar BUILD was wired
for real, and the swap's own call-site census was wrong.** The swap added
`height`/`weight` props to `PlayerSprite` and wired them at four call sites —
all four `size="small"`, i.e. the head crop, where `height` is provably a no-op
(the 28×30 window is anchored to the top of the head, so torso and leg length
are never in frame; proven by render hash, not inspection). The one full-body
PLAYER render in the app, `app/player/[id].tsx`'s bio hero, got no props at all,
because the swap commit's "25 call sites across 20 files" counted `src/` only
and missed `app/` entirely — the real figure is 31 across 24. It now passes the
player's real cm/kg. Separately, staff have no height or weight anywhere in the
data model, so every coach, scout, DoF, manager, agent and assistant in the game
shared one identical medium body across the five full-body STAFF portraits
(`app/staff/[id]`, Staff Office, Club at `scale={8}`, Assistant,
ManagerProfileForm): `SpriteConfig` now carries the two tiers, the id-seeded
generators draw them (appended to the END of each rng sequence, so no existing
staff member's face moved — pinned against captured pre-change output), and four
one-time catch-ups give existing saves a build: `seedStaffBodySizeBackfill`,
`seedAgentsBodySizeBackfill`, an assistant branch in `db/bootstrap.ts`, and a
`resolveAppearance` fallback in `toManagerProfile` for the server-held owner
profile. Full writeup — the crop/build render map, which call sites are full-body,
and where a build lives per entity — in `05_ui/output/design-system.md`'s
"Where the avatar is rendered" and "Where the build comes from" sections, plus
`03_data/output/entities.md`'s build note. Also corrected there: the swap's
"~6% larger" was the WIDTH figure; the full body is +9.7% TALL and the head crop
~12% shorter.

From `.context/stages/02_architecture/output/git-activity.md`'s recent-commit read, now on the
`dev` branch (`competition` was merged into it at `e6d4617`; work has continued directly on `dev`
since):

**Newest (2026-10-19, uncommitted): the live match is PORTRAIT, and the app has no landscape
left anywhere.** Prototype drop `assets/Components/matchuxV2`, nine files copied over
`src/components/matchux/` plus one deletion, answering the checklist in
`assets/Components/matchux-integration-feedback.md`. `LiveMatchScreen` is now a single portrait
column — scorebug, pitch (flex), timeline, events row, commentary history, controls — and the
landscape-only pieces are gone: the fixed 164pt side panels became `flex: 1` boxes side by side
under the pitch with a required `height`, `LiveMatchTicker`/`TICKER_HEIGHT` were replaced by
`PitchCommentary` (the current line, overlaid on the pitch) and `CommentaryHistory` (the
previous two, newest first), `MatchTimeline` split out of `LiveMatchPitch` as its own export,
and `sideInset` (`max(insets.left, insets.right)`) disappeared in favour of `insets.top` on the
scorebug and `insets.bottom` on the controls. **`'rotate-prompt'` is removed from
`MatchUXPhase` and `RotateDevicePrompt.tsx` is deleted** — WATCH goes straight to `'live'` — and
the orientation effect collapsed to `if (visible) lockAsync(PORTRAIT_UP)` with the unmount
un-rotate safeguard dropped, which is safe only because `bootstrap/useAppServices.ts` already
locks `PORTRAIT_UP` at boot. New `matchux/layout.ts` is the single home for cross-file sizes
(`liveLayout(windowHeight)` → `{ compact, pitchMinHeight, eventPanelHeight, historyHeight,
pauseSize }`, `compact` below 700pt, plus `HISTORY_HEIGHT`/`CAPTION_MAX_LINES`), budgeted
against 360×640 with the pitch absorbing slack down to a 180pt floor. Behaviour deliberately
unchanged: the single 600ms goal pulse (WCAG 2.3.1), the Reduce Motion skip, the
`max(900ms, 2400ms / speed)` key-event hold, one pause control, and both callers' polling vs
resolved-result shapes. Public API untouched — `index.ts` still exports only `MatchUXOverlay`,
so `GameOverlayHost` and `TournamentMatchResultScreen` were never opened. **Verified:** the
drop's stated baseline (`87c8d6cf`) held exactly — all nine touched files were unchanged since
it, and the only file that had moved (`DecisionScreen.tsx`, fixed by `14b33faa`/`a6236462`) is
the one the drop excludes; zero new i18n keys, all 14 keys it uses confirmed present; `tsc`
clean; 390 suites / 6,026 tests pass. **Loose ends — one fixed same day, two left:**
(1) **FIXED.** The venue line read `{stadiumName} · {n} ATTENDANCE`, because the drop reused
`component.liveMatchPitchClock.text.2` (`"{attendancetoLocaleString} ATTENDANCE"`) inline and
hardcoded the ` · ` separator in a template literal OUTSIDE the catalog — which was itself a
small breach of the translation rule, since a translator could not reorder the line. Replaced by
a new single-unit key `component.liveMatchPitch.venueAttendance` =
`"{stadiumName} · {attendance} ATT"`, added to `manual-overrides.json` and merged with
`i18n:apply-overrides --only ... --write` (never `i18n:regenerate-safe`). The typical render
drops 31 → 24 chars (`Elland Road · 24,391 ATT`), which is the truncation headroom that was
wanted at 360pt; a genuinely long venue still ellipsises at `numberOfLines={1}`
(`The Tottenham Hotspur Stadium · 62,850 ATT` is 42 chars), and that is accepted rather than
solved — one line, one name. `ATT` is the house abbreviation style already used by `HT`/`GOAL`
on this screen. (2) `KitStripe` is newly exported from `LiveMatchTopBar` but imported nowhere.
(3) **Now FOUR** i18n keys are dead rather than three — the drop retired
`component.rotateDevicePrompt.text`, `.text.2` and `component.liveMatchTicker.chip.goal`, and
the fix above retired `component.liveMatchPitchClock.text.2` as well. All four are left in the
catalog as dead entries rather than hand-edited out of `translations.json`/`provenance.json`,
which the i18n binding rule forbids; an orphan key is harmless (the audit checks for MISSING
keys, not unused ones).
**Still no automated coverage for any matchux UI component** — this repo has no RN render
harness, so the drop's own QA checklist is the only test of the layout.

**Immediately preceding (2026-10-05, commit `87c8d6c`): a drop-in visual/performance revision of the whole
matchux live-match UX — public API unchanged, every screen's rendering rewritten.**
`LiveMatchTopBar.tsx` shrank to a single-row scorebug (team chips/score/minute) with all
controls moved to a new `LiveMatchControls.tsx` (segmented 1X/2X/4X speed, the one pause
toggle, labelled skip — bottom-right). `LiveMatchPitchClock.tsx` was deleted and replaced by
`LiveMatchPitch.tsx` (venue/attendance now actually rendered for local home fixtures, a
0–90/120 timeline with event markers — 120 only if a timeline item falls past minute 100 — a
goal card, and a paused/resume overlay). `LiveMatchTicker.tsx` is now a fixed 72pt row
(exports `TICKER_HEIGHT`) with the previous line dimmed and a single 600ms goal pulse instead
of the old 260ms primary/secondary alternation (~3.8 flashes/s, which exceeded WCAG 2.3.1);
Reduce Motion skips the pulse and fade entirely. `LiveMatchSidePanels.tsx` lost its `starMan`
prop (Star Man moved to `MatchResultScreen`, now shown with its rating) and gained
`secondaryColor`. Key-event hold time now scales with playback speed
(`max(900ms, 2400ms / speed)`, previously a fixed 2400ms regardless of speed). `DecisionScreen.tsx`
and `MatchResultScreen.tsx` were also rewritten (venue header/stacked team cards/YOUR CLUB tag
on the former; sticky bottom CONTINUE and AET/pens-as-chips on the latter). Full file-by-file
mapping in `02_architecture/output/structure.md`'s `matchux/` entry. Required 8 new i18n keys
(ticker chips, pitch GOAL/HT/tap-to-resume, decision YOUR CLUB, controls RESULT) — added by
hand to `manual-overrides.json` + `translations.json`/`provenance.json`, **not** via
`npm run i18n:regenerate-safe`, which re-extracts from `git show HEAD` and — now that this
repo's string-rewiring is fully committed, not mid-flight — silently drops every
already-rewired key the same way plain `i18n:extract` does; that script is only safe to run
while a rewiring pass is still uncommitted on disk. Still-open gap carried over from the
previous matchux pass: `TournamentMatchClubSummary` still has no club-id field, so tournament
mode's `ampSide` still can't be computed (confirmed unchanged this pass).

**Immediately preceding (2026-10-05, commits `2f3aeed`/`a996a52`): club facility rendering
replaced with isometric-voxel SVG sprites, merged `facilities_svgs` → `development`.** New
`src/components/facility-sprites/` (Stadium/Training Ground/Medical Centre/Scouting) —
a shared `isoEngine.ts`/`IsoSvg.tsx` voxel renderer, deliberately a *different* technique from
the flat-2D `player-sprite`/`kit-sprite` system, replacing the old backend-`imagePath`/
cached-`<Image>` approach entirely (`useCachedFacilityImage.ts`, `facilityImageAssetService.ts`,
`facilityImages.ts` all deleted). New `facility_site_config` SQLite table (migration
`0005_clammy_mastermind.sql`) holds cosmetic non-leveled settings only
(`trees`/`pitch`/`base`/Stadium's `floodlights`) — after a same-day correction, the stadium
scoreboard is **not** a stored preference at all, it's derived from the AMP's own most recent
home-game result (`useAttendanceStore`). **Rendering pattern, corrected mid-pass:** one
full-site hero sprite per section (matching how the Stadium tab's hero already worked), never
a per-facility crop — individual facility rows stay text-only. Two real bugs found and fixed
against the live backend the same day: stand levels not matching real upgrade level (a
`spriteFacilityId` lookup silently missing before the backend's facilityTemplates import
landed — fixed with a `SLUG_TO_SPRITE_ID` fallback, kept as defense-in-depth for any client
still on the old production data) and a facility's first-ever construction (level 0→1)
rendering as if it didn't exist (an on/off flag gated on level alone, not
`underConstruction`). Full detail, including the vendored-port pixel-hash parity tests, in
`02_architecture/output/structure.md`'s `facility-sprites/` entry and
`05_ui/output/design-system.md`'s "Facility sprites" section.

**Immediately preceding (2026-10-01): the matchux "finished" screen was redesigned around
skip-to-result instead of skip-to-nothing.** Previously, choosing Skip on `DecisionScreen` went
straight to `onDone` — no result was ever shown for a skipped match. Now Skip (and in-match
skip, and a full watched match) all land on the same new `matchux/MatchResultScreen` (replaces
the deleted `MatchFinishedScreen`): a **portrait**, tabbed PLAYER STATS/MATCH EVENTS view built
on the shared `MatchResultContent`, plus a MATCHDAY financials/attendance panel for the AMP's
home fixtures. `MatchUXOverlay`'s landscape lock is now scoped to `phase === 'live'` only — the
old code also forced landscape for `phase === 'finished'`, which no longer applies since the
result screen is portrait. Tournament matches reach the same screen (stats tab only — no events
tab, since tournament narrative isn't in the raw event-string shape that tab parses).
`TournamentMatchResultScreen`'s own standalone `RatingsColumn` (a separate, simpler result view
for the tournament *archive*, not the live match-end moment this redesign touches) was
deliberately left alone — see this file's tournament-archive entry below for that one, now
flagged as a candidate for a future unification pass.

**Immediately preceding (2026-09-29, three same-day commits): Chairman/Owner-facing fixes —
squad-quality judgements, an excursion-affordability bug, and the player's in-game term of
address.** In commit order: (1) `b208e5c` — PA memos and the Assistant screen stopped
addressing the player as "Chairman" (a hireable staff role) in favour of "Owner" or the owner's
own profile name (`ownerAddress()` — see `01_overview/output/tribal-knowledge.md` Q4 item 6),
and excursion catalogue data now syncs from the API on app boot instead of waiting for the
Excursions pane to mount (`useExcursionSync`, mirrors `useArchetypeSync` — see
`04_interfaces/output/services.md`'s "Excursion catalogue boot sync" note); (2) `6160ab7` — a
real affordability gate for excursion bookings, previously dead code because `club.balance` (pence)
was multiplied by 100 again before comparing; fixed by a new earmarked `chairmanBudget` pot plus
a booking-cancel action — full detail in `services.md`'s "Excursion budget gate" note and
`03_data/output/state.md`'s persistence note, and the corrected money rule is now
`01_overview/output/tribal-knowledge.md` Q4 item 2; (3) `a51dde6` — squad-quality judgements
(DOF/Manager Brains, the ideology-deadlock PA memo) were centralized onto a tier-relative
baseline instead of flat absolute thresholds, since player generation is itself tier-scaled —
full detail in `architecture-notes.md`'s "absolute-threshold squad judgements" section.

**Immediately preceding that, on `dev` (2026-09-21, commit `183efb7`, plus an uncommitted follow-up): tournament
ledger wiring, a back-FAB navigation bug fix, and the onboarding tutorial extended to three more
screens — three unrelated pieces landed in one commit.** Ledger: registering for a tournament now
charges `entryFeePerRound` to `financeStore` (new `tournament_entry_fee` category) via
`TournamentDetailScreen`'s new `RegisterControls` (the Register button/dialog moved there from
`OpenEntryCard`, which is now purely informational); `TournamentInboxService` now auto-accepts
every Cup-reward inbox message instead of leaving acceptance for later, so `tournament_prize`
actually lands in the ledger. Navigation: 4 tournament screens swapped `useEffect` → `useFocusEffect`
for back-FAB registration — screens frozen (not unmounted) under the Drawer on blur never re-fired
a plain effect on revisit, leaving the back-FAB dead; Type Landing's back target was also fixed
(defaulted to Home instead of Listings). Tutorial: `TUTORIAL_STEPS` grew from 10 to 13 steps,
inserting Dressing Room/Excursions/Tournaments-Home before the final "Advance the Week" step (now
renumbered 10→13) — see `05_ui/output/navigation.md`'s "Tutorial walkthrough system" section, and
`04_interfaces/output/services.md`'s "Tournament ledger, in full" note for the ledger side.
**Uncommitted, on top of this:** `TournamentMiniView` was consolidated into the one canonical
tournament-summary card, replacing three separate hand-rolled layouts across
`TournamentDetailScreen`/`TournamentListingsScreen`/`TournamentTypeLandingScreen` — see
`05_ui/output/navigation.md`'s route-tree section.

**Immediately preceding (2026-09-21, commit `485f5a5`): client-side tournament-field wiring.**
The backend had already shipped `entryFeePerRound`/`prizes.victorPrize`/`entrants[]` and the real
`TournamentInstanceStatus` values (confirmed live in the entry below), but the client's own types
and UI hadn't caught up yet — this commit fixed that: `TournamentInstanceStatus`'s `'open'`
literal (never matched the real `'registering'` wire value) corrected to the full real set, the
three new fields wired into `TournamentDetailScreen`/`TournamentTypeLandingScreen` (new
`PrizeSummary`/`EntrantRow`/`CancelledView`), and `EntrantCrest.tsx`/`TournamentFixtureList.tsx`
deleted as now fully superseded by `TournamentBracketView`'s `PixelFootballBadge` rendering.
Also same-day: an infinite-refetch-loop bug in `useTournamentListings.ts` (commit `790e5cf`,
unstable `refetch` closure breaking a `useFocusEffect` dependency array) was fixed, and
`prefetchTournamentListings()` added as the first app-boot data-prefetch call site
(`app/(app)/_layout.tsx`), alongside a manual refresh button on the Listings screen.

**Immediately preceding that (2026-09-21, commit `32f057f`): the tournament section was
reorganized into a nested hierarchy** — `Home → Listings (by tournament
type) → Type Landing (sectioned by status) → Instance Detail (polymorphic by status)`,
replacing the flat Active/Open/Recently Completed split described below (which had landed only
the same branch, one entry earlier — reversed the same session). See
`05_ui/output/navigation.md`'s route-tree section for the full route/screen mapping.

Also same day, in a follow-up round: the real wire status values were confirmed live against the
backend (`registering`/`scheduled`/`running`/`completed`/`cancelled` — the client's existing
`'open'` literal never matched), and the backend team shipped `templateId` on every instance
shape (was `open`-only), `entryFeePerRound`/`prizes.victorPrize`, and `entrants[]`/`TournamentEntrantRef`
badge+colour fields — closing four of the five gaps flagged when the hierarchy landed. Still open:
no per-round prize exists in the data model, only a single winner-take-all payout — flagged, not
fabricated. (The client's own types/UI didn't actually consume any of this until the `485f5a5`
entry above, two commits later — see that entry for the code-level fix.) The bracket view stays a
deliberately simple in-house `TournamentBracketView` — two external packages were evaluated and
rejected (one DOM-only, one an unmaintained 2022 beta with a major `react-native-svg` version
mismatch).

**Immediately preceding: the tournament match-result archive.** The client now persists
`TournamentMatchResult` payloads (see `docs/api/tournament-match-result-payload.md`) into a
new SQLite archive — `tournaments`/`tournament_matches`/`tournament_match_lineups`/
`tournament_match_events` (migration `0004_young_thunderbolts.sql` on `master`, see `03_data/output/schema.md`)
— written via `tournamentMatchResultRepository.ts`'s `saveTournamentMatchResult()`. Two write
paths: a new `MATCH_RESULT` push type (`{competitionId, roundId, fixtureId}` only — the backend
team confirmed this contract mid-session, matching the existing notify-only pattern) routed in
`PushNotificationService.ts`, and `TournamentDetailScreen.tsx` opportunistically archiving any
resolved fixture it sees on a normal `GET /api/competitions/{id}` fetch. `tournaments/history`
(`TournamentHistoryScreen`) was rebuilt from a "recently completed, same short window" placeholder
into a real archive UI, filterable by outcome and by the result's world date; a new
`tournaments/results/[fixtureId]` route (`TournamentMatchResultScreen`) shows one archived
result's score, lineups/ratings (its own inline `RatingsColumn`, landscape, simple name+rating
list — not a shared import) and narrative timeline. **Stale as of the matchux skip-to-result
redesign (2026-10-01):** `MatchFinishedScreen` (the component this line originally compared
against) was deleted and replaced by `matchux/MatchResultScreen` — a portrait, tabbed
PLAYER STATS/MATCH EVENTS view (reusing `MatchResultContent`) now shown for every local AMP
match end (skip, in-match skip, or full time) and for tournament matches reached via
`MatchUXOverlay` (stats tab only, no events tab — tournament narrative isn't in the raw
event-string shape that tab parses). `TournamentMatchResultScreen`'s own standalone
`RatingsColumn` was intentionally left alone (out of that change's scope) and is now the one
remaining simple-list result view in the app — a candidate for unifying onto
`MatchResultScreen`/`MatchResultContent` in a future pass. `TournamentFixtureList` also now renders a real scoreline once `TournamentFixture.result`
resolves (was previously typed as the literal `null` — a tracked backend gap that's now closed).

**Immediately preceding: remote push notifications for competition triggers.** Shipped; the plan
that specified it was pruned 2026-11-02 once implemented, and the standing description is
`04_interfaces/output/services.md`'s "Push notification services" section — device-token
registration (`src/api/endpoints/deviceTokens.ts`, `PushNotificationService.ts`), a
`data.type`-routed handler for `ROUND_DRAWN`/`NEW_REGISTRANT`/`ADMIN_MESSAGE` pushes, a new
persisted `competitionNotificationStore` (see `state.md`), an in-app toast banner, and full
Inbox integration alongside admin announcements. See `04_interfaces/output/services.md`'s "Push
notification services" section. Requires a fresh native build to function on-device (iOS
`UIBackgroundModes` entitlement + native APNs/FCM registration) — not OTA-shippable on its own.

**Otherwise primary: the tournament/Cup competition system.** Before the hierarchy consolidation
above, this branch's tournament work had split the monolithic Tournaments Hub into four flat
routes (Active/Open/Recently Completed/History), expanded the registration snapshot payload
(player bio, staff detail, club identity, kit config), and did the initial client integration
of the Cup system against `/api/competitions/*`. This is also the newest, least structurally
settled part of the app —
see `architecture-notes.md`'s tournament-system gap note; expect to be laying down precedent
here rather than following it.

## Per-tier sponsor bands and ticket price (2026-11-15, `new-game-save`)

The backend now resolves a sponsor band and a ticket price **per division** and publishes both
on `economyTierBaseline.tiers[]`, country-scaled. The app reads them through one module,
`src/economy/perTierEconomy.ts` — every function there is a read with a fallback, and each
fallback is the behaviour the app already had, so an unauthored backend is byte-identical
(`src/__tests__/economy/unauthoredBackendParity.test.ts` is exactly that case).

**Two things it fixes, both measured:**

- the six flat `smallSponsorMin`-style keys were one band for every division in the world, so a
  tier-8 league sponsor pot equalled tier 1's — club plus league sponsorship came to 175% of
  tier-8 authored turnover against 1.2% at tier 1;
- every club started at a flat 2500p, which under elasticity is r = 1.67 at the bottom of the
  pyramid — about 39% of a bottom-tier club's attendance given away by a literal.

**`0` is not a price, and an all-zero band is not a band.** Both mean "unauthored", and both
have to fall through rather than win: a published 0 read as a price makes every club free, and a
`{min: 0, max: 0}` band rolls every pot to nothing while looking configured.

**"Advised" has two meanings and they must stay one figure** — the price a club STARTS at
(`clubStore`, `useSetupHost`) and the denominator of the elasticity ratio
(`matchdayIncome`). Both resolve through `advisedTicketPricePence()`. Splitting them would put
every club in the division off its own advice by construction.

Reading sites moved, deciding sites did not: `rollLeagueSponsorPot`, `computeSponsorOffer`,
`computeInvestorBonus`, the Chairman delegation, NPC gate and season-ticket pricing, and
`scripts/economy/variantGate.ts` (which now prints COVERAGE per tier against an 85-110% target,
reported — the verdict still follows the FLIPPED column). **Apply no country factor anywhere:**
the published figures arrive resolved, and the earlier note claiming the app was missing one was
wrong — the real defect was a no-country config read, fixed in build 452.

**Immediately preceding: transfer-market realism and Dressing Room/cohesion work.**
Free-agent wage decay, pricing jitter, willingness signals, unifying the Dressing Room
cohesion display so Squad and Club pages can't disagree, squad-relative contract role
expectations.

**Slightly further back: the Scouting Hub system** (design rationale in
`docs/superpowers/specs/2026-09-10-scouting-hub-design.md`; its implementation plan was pruned
2026-11-02 once shipped) — directive-filtered performer feed,
DoF override escalation ladder, formal/informal shortlist tiers. Landed just before the
current tournament work started.

Not derived from git activity, but relevant context for anyone picking this up: the
`docs/superpowers/plans/` + `specs/` archive
(`.context/stages/06_documentation/output/index.md`) shows this codebase went through a
sustained "SQLite Source of Truth" migration (5 sub-plans, 2026-06-19 to 2026-06-20) just
before the current run of feature work — the persistence patterns documented in
`.context/stages/03_data/output/state.md` are that migration's direct result, not incidental
design.
