# `07_synthesis/output/architecture-notes.md` — archived history

Rotated out of `wunderkind-app/.context/stages/07_synthesis/output/architecture-notes.md` on 2026-11-20, verbatim. Nothing in `.context/` links here.

Why this split exists: `../context-review/context-refresh.md`.

---

### History — pre-hub (2026-09-20 → 2026-09-24)

⚠️ **`TournamentDetailScreen`, `TournamentListingsScreen`, `TournamentTypeLandingScreen`,
`TournamentMiniView`, `TournamentMatchResultScreen`, `tournamentGrouping.ts` and
`TournamentRegistrationService` were all DELETED in the 2026-10-24 hub rebuild**
(`docs/design-briefs/tournament-hub-integration.md`), **and so was the four-table match-result
archive the bullets below treat as the system's one piece of durable storage** (migration
`0015`, same day). The bullets name all of it as current; read them as a record of how the
system got here, not as a file map or a schema. `TournamentInboxService` (now poll-only) and
`TournamentRewardService` do survive, on the push/inbox path.

- `structure.md` (stage 02): `src/engine/Tournament*.ts` and a whole route group exist.
- `schema.md`/`state.md` (stage 03): **narrowed 2026-09-20** — a first tournament table now
  exists (`tournaments`/`tournament_matches`/`tournament_match_lineups`/
  `tournament_match_events`, the match-result archive), but it's exactly that: an archive of
  resolved results, not general tournament/bracket persistence. Live registration/bracket state
  is still fetched fresh every time; the reward-inbox cache is still AsyncStorage +
  `store_state` via `tournamentInboxStore`, unrelated to the new archive.
- `routes.md`/`services.md` (stage 04): tournament bracket/registration data is still fetched
  live from `/api/competitions/*` every time, with four separate engine/service files each
  owning one slice (registration, inbox polling, reward application, and now the match-result
  archive's write path in `PushNotificationService.ts`/`TournamentDetailScreen.tsx`) rather
  than funneling through one service.
- **2026-09-21, resolved same day**: the Listings → Type Landing hierarchy needed a "tournament
  type/format" grouping concept that didn't exist server-side. Flagged mid-day (`templateId`
  present only on the `open`-status shape) and shipped by the backend team before end of day —
  `templateId` is now confirmed present on every instance shape (open/running/active/completed)
  and `TournamentDetail`. `src/utils/tournamentGrouping.ts` still degrades an entry missing
  `templateId` into an `'unknown'` bucket rather than crashing, but that's defense-in-depth now,
  not a live workaround. Same round of fixes also added `entryFeePerRound`/`prizes` to
  `TournamentSummaryFields`, `entrants[]` (club name + badge shape + colours, no kit style yet)
  to `TournamentOpenEntry`/`TournamentDetail`, and badge/colour fields to fixture-level
  `TournamentEntrantRef` — closing four of the five gaps flagged when the hierarchy landed. The
  one still open: no per-round prize exists in the data model, only a single winner-take-all
  payout — see `05_ui/output/navigation.md`'s route-tree section for the full list.
- **2026-09-21, two commits later (`485f5a5`)**: the backend confirmation above was the contract,
  not the client code — this commit is where the client's own types/UI actually caught up:
  `TournamentInstanceStatus`'s `'open'` literal corrected to the real wire set
  (`registering`/`scheduled`/`running`/`completed`/`cancelled`), and the new fields wired into
  `TournamentDetailScreen`/`TournamentTypeLandingScreen`. Worth remembering as a general pattern
  here, not just a one-off: a backend field/enum being "confirmed live" doesn't mean the client
  consumes it yet — check the actual client commit, not just the confirmation.
- **Same day, commit `183efb7`**: a new cross-service call was added —
  `TournamentInboxService` now calls `TournamentRewardService.acceptTournamentReward()` directly
  for every freshly-polled Cup-reward message (auto-accept, not user-driven), rather than only
  filing the message for later. And a new ledger category, `tournament_entry_fee`, was wired
  at the UI layer (`TournamentDetailScreen`'s `RegisterControls`, not inside
  `TournamentRegistrationService`) — see `04_interfaces/output/services.md`'s "Tournament
  ledger, in full" note. This is still four separate files each owning one slice of the system
  (registration, inbox polling, reward application, ledger side-effects at the UI layer) — the
  fragmentation this section already flagged is unchanged by either of these additions. What
  *did* get consolidated, uncommitted as of this pass: the UI-layer duplication of the
  tournament-summary card (three hand-rolled layouts → one `TournamentMiniView`) — a UI-layer
  fix, not a service/schema one; see `05_ui/output/navigation.md`.
- **2026-09-24 — data bleed between game saves, root cause and fix.** The direct call chains
  the two bullets above describe (`PushNotificationService.handleMatchResultPush()` →
  `saveTournamentMatchResult()`; `TournamentInboxService`'s poll → `acceptTournamentReward()`
  directly) turned out to be a real bug, not just fragmentation: the device runs one shared
  SQLite file with exactly one save live at a time, and neither call chain checked that the
  backend event it was about to apply actually belonged to the save currently loaded. A
  `MATCH_RESULT` push for one save's tournament, or a Cup-reward poll response, could land in
  whichever save happened to be in the foreground — including crediting money/reputation to the
  wrong save via the reward path. Fixed by inserting a save-gated queue between every
  backend-delivered event and the state it mutates: both call chains now go through
  `src/engine/PushInboxService.ts` (`ingestMatchResultEvent`/`ingestRewardEvent`), backed by two
  new device-global tables (`push_inbox`, `tournament_save_index`) documented in
  `03_data/output/schema.md`'s `tables/pushInbox.ts` section, which also states the binding rule
  this establishes for the whole system going forward. This is now a structural fact about the
  system, not a one-off bugfix: registration (`TournamentRegistrationService`) is what feeds the
  index that makes resolution possible, so any *new* backend-delivered event type added to this
  system later (a bracket-draw notification, a future registration-decision push, etc.) needs
  the same queue-and-resolve treatment before it touches save-scoped state — don't reintroduce a
  direct write path.

- **2026-09-24, same day, backend review of the fix above**: three findings worth carrying
  forward — see `03_data/output/schema.md`'s `tables/pushInbox.ts` section for the full
  writeup. (1) The Cup-reward resolution path is currently blocked server-side (wrong id on
  the inbox message) — a real, currently-shipped regression (rewards now queue forever instead
  of auto-applying) until backend fixes it, not just a design risk. (2) Competition instance
  id reuse is confirmed impossible — one risk closed. (3) The bigger surprise: a server-side
  `X-Club-Id`/`ClubResolver` mechanism already existed, predating this feature, and the client
  was already sending it correctly (`getServerClubId()` off per-save-restored `clubStore`) —
  nobody on the client side knew to document it. It doesn't replace the push-inbox queue (no
  header exists on a push notification), but it's the reason `04_interfaces/output/routes.md`
  is now worth a pass to note which endpoints already self-scope by club versus which ones a
  client still has to gate itself.

**What the history above is for, now that the feature has shipped.** The fragmentation it keeps
flagging — four services each owning one slice — was resolved by the hub rebuild: reads funnel
through one endpoint set and one api decorator, and the UI through one logic module. What
survives is the pair of rules in "Still true, and still binding" above: nothing persists live
bracket state, and nothing backend-delivered writes to a save without going through the queue.
`git-activity.md`'s finding that this is the most heavily worked area of the app still holds —
but the conclusion has inverted. It is no longer the place with the least precedent to follow;
it is the place with the most recent, and an agent should follow the hub's patterns here
(`tournamentHttp` for transport, `useResource` for reads, `tournamentHubLogic` for view rules)
rather than invent alongside them.

