# League & Competition System — Backend Design Spec

**Scope:** Spec B of the Club Sim expansion. Backend only.
**Depends on:** Spec A (NpcClub, senior player pool, consume endpoint)
**Excludes:** Frontend changes — squad assembly, match simulation, client-side standings, UI rendering.

---

## Goal

Add a persistent league structure to the backend. Each country has an 8-tier pyramid of `League` entities. NPC clubs are assigned to leagues. The AMP club belongs to a league and moves between tiers via promotion/relegation. The sync response includes a league snapshot so the client has everything it needs in one call. Season data is archived server-side at season end, keeping the fat client lean.

## Architecture

The server remains a **data provider, not a game engine**. Match simulation, standings calculation, and promotion/relegation logic all run on the client. The backend's role is to:

1. Persist the league structure (League entities, club assignments)
2. Serve the AMP's current league + opponent clubs via sync response
3. Receive ongoing match results (stored for future leaderboards)
4. Archive a full pyramid snapshot at season end via `conclude-season`
5. Handle league transition (promotion/relegation) when conclude-season is called

---

## Data Model

### New Entity: `League`

| Field | Type | Notes |
|---|---|---|
| `id` | UUID v7 | |
| `country` | varchar(2) | ISO code — matches `NpcClub.country` |
| `tier` | smallint | 1–8 |
| `name` | varchar(100) | Default "League {tier}", overridable e.g. "Premier League" |
| `createdAt` | datetime_immutable | |

**Unique constraint:** `(country, tier)` — one league per tier per country.

**Repository methods:**
- `findByCountryAndTier(string $country, int $tier): ?League`
- `findByCountry(string $country): League[]` — returns all 8 tiers sorted by tier ASC

---

### New Entity: `SeasonRecord`

One record per AMP academy per season. Written once by `conclude-season`, never updated.

| Field | Type | Notes |
|---|---|---|
| `id` | UUID v7 | |
| `academy` | ManyToOne → Academy | |
| `league` | ManyToOne → League | league competed in |
| `season` | smallint | starts at 1 |
| `finalPosition` | smallint | |
| `gamesPlayed` | smallint | |
| `wins` | smallint | |
| `draws` | smallint | |
| `losses` | smallint | |
| `goalsFor` | smallint | |
| `goalsAgainst` | smallint | |
| `points` | smallint | |
| `promoted` | boolean | |
| `relegated` | boolean | |
| `createdAt` | datetime_immutable | |

---

### New Entity: `SeasonSnapshot`

Full pyramid archive per academy per season. One record per conclude-season call.

| Field | Type | Notes |
|---|---|---|
| `id` | UUID v7 | |
| `academy` | ManyToOne → Academy | |
| `season` | smallint | |
| `country` | varchar(2) | |
| `snapshotData` | JSON | full pyramid overview (see below) |
| `createdAt` | datetime_immutable | |

**`snapshotData` JSON shape:**
```json
{
  "amp": {
    "leagueTier": 8,
    "leagueName": "League 8",
    "finalPosition": 1,
    "gamesPlayed": 30,
    "wins": 22,
    "draws": 4,
    "losses": 4,
    "goalsFor": 67,
    "goalsAgainst": 28,
    "points": 70,
    "promoted": true,
    "relegated": false
  },
  "pyramid": {
    "1": {
      "name": "League 1",
      "standings": [
        {
          "clubId": "uuid",
          "name": "Norwich FC",
          "position": 1,
          "points": 89,
          "goalsFor": 95,
          "goalsAgainst": 21,
          "promoted": false,
          "relegated": false
        }
      ]
    }
  }
}
```

The client sends `pyramidSnapshot` covering all 8 tiers. The backend stores it verbatim.

---

### New Entity: `MatchResult`

Persisted per match result received via sync. Stored for future global leaderboard use.

| Field | Type | Notes |
|---|---|---|
| `id` | UUID v7 | |
| `academy` | ManyToOne → Academy | |
| `opponentClub` | ManyToOne → NpcClub | |
| `goalsFor` | smallint | |
| `goalsAgainst` | smallint | |
| `week` | smallint | game week number |
| `season` | smallint | copied from Academy.currentSeason at time of sync |
| `createdAt` | datetime_immutable | |

---

### Modified Entities

**`NpcClub`**
- Add `league` (ManyToOne → League, nullable, no cascade). Nullable so existing clubs remain valid before league assignment.

**`Academy`**
- Add `currentLeague` (ManyToOne → League, nullable). Null for new academies until `academy/init` assigns them to a tier-8 league.
- Add `currentSeason` (smallint, default 1).

**`StarterConfig`**
- Add `defaultFacilities` (JSON). Same flat `slug → level` format as `NpcClub.facilities`. Pre-populated with sensible tier-8 defaults.
- Add `starterReputationTier` (new enum `ReputationTier`: `LOCAL`, `REGIONAL`, `NATIONAL`, `ELITE`). Default: `LOCAL`.

---

### New Enum: `ReputationTier`

```php
enum ReputationTier: string {
    case LOCAL    = 'local';
    case REGIONAL = 'regional';
    case NATIONAL = 'national';
    case ELITE    = 'elite';
}
```

---

## API

### `POST /api/sync` — changes

**Request — new optional field:**

```json
{
  "matchResults": [
    { "opponentClubId": "uuid", "goalsFor": 2, "goalsAgainst": 1, "week": 14 },
    { "opponentClubId": "uuid", "goalsFor": 0, "goalsAgainst": 0, "week": 15 }
  ]
}
```

`matchResults` defaults to `[]`. Existing clients omitting the field continue to work. `SyncService` persists each result as a `MatchResult` entity. No response change based on results.

**Response — new `league` key:**

```json
{
  "league": {
    "id": "uuid",
    "tier": 8,
    "name": "League 8",
    "country": "EN",
    "season": 1,
    "clubs": [
      {
        "id": "uuid",
        "name": "Norwich Town",
        "reputation": 12,
        "tier": 8,
        "primaryColor": "#2980b9",
        "secondaryColor": "#ffffff",
        "stadiumName": "Norwich Park",
        "facilities": { "training_pitch": 1 }
      }
    ]
  }
}
```

`league` is `null` if the Academy has no league assigned yet.

The league snapshot is assembled in `SyncService` from `Academy.currentLeague` + `NpcClubRepository::findByLeague()`.

---

### `POST /api/league/conclude-season`

**Auth:** JWT (existing firewall, `ROLE_ACADEMY`)

**Request:**
```json
{
  "finalPosition": 1,
  "gamesPlayed": 30,
  "wins": 22,
  "draws": 4,
  "losses": 4,
  "goalsFor": 67,
  "goalsAgainst": 28,
  "points": 70,
  "promoted": true,
  "relegated": false,
  "pyramidSnapshot": {
    "1": {
      "name": "League 1",
      "standings": [
        { "clubId": "uuid", "name": "Norwich FC", "position": 1, "points": 89, "goalsFor": 95, "goalsAgainst": 21, "promoted": false, "relegated": false }
      ]
    }
  }
}
```

**Behaviour:**
1. Create `SeasonRecord` for the current academy + season
2. Create `SeasonSnapshot` with `snapshotData` built from the request
3. If `promoted: true` — look up League for same country, tier - 1; update `Academy.currentLeague`. If already at tier 1 or no higher league exists, skip transition silently.
4. If `relegated: true` — look up League for same country, tier + 1; update `Academy.currentLeague`. If already at tier 8 or no lower league exists, skip transition silently.
5. Increment `Academy.currentSeason`
6. Flush and return

**Response:**
```json
{
  "seasonRecordId": "uuid",
  "newLeague": { "id": "uuid", "tier": 7, "name": "League 7" }
}
```

`newLeague` is `null` if no promotion or relegation.

---

### `GET /api/league/season-history`

Returns a lightweight list of past seasons for the authenticated academy.

**Response:**
```json
{
  "seasons": [
    { "id": "uuid", "season": 1, "leagueTier": 8, "leagueName": "League 8", "finalPosition": 1, "points": 70, "promoted": true, "relegated": false }
  ]
}
```

---

### `GET /api/league/season-history/{season}`

Returns the full `snapshotData` JSON for a specific season. Allows client to render a historical season screen on demand without holding it in memory.

**Response:**
```json
{
  "id": "uuid",
  "season": 1,
  "country": "EN",
  "snapshotData": { ... }
}
```

---

## Services

### `LeagueService`

New service. Responsibilities:
- `generateLeaguesForCountry(string $country): League[]` — creates 8 League records (skips existing)
- `assignClubToLeague(NpcClub $club): void` — finds matching League by country+tier, sets FK
- `assignAcademyToStarterLeague(Academy $academy, string $country): void` — finds the tier-8 League for the country, sets `Academy.currentLeague`. Called from `AcademyInitService` when a new academy is created.
- `concludeSeason(Academy $academy, ConcludeSeasonRequest $dto): array` — orchestrates SeasonRecord, SeasonSnapshot, league transition, season increment

### `SyncService` — extensions

- On each sync: if `matchResults` present, persist `MatchResult` entities
- Build and include `league` snapshot in `SyncResponse`

---

## Admin UI

### StarterConfig page — new fields

Added to the existing form at `/admin?routeName=admin_starter_config`:

- **Default Facilities** — JSON textarea using `defaultFacilitiesJson` virtual property (same pattern as `NpcClub.facilitiesJson`)
- **Starter Reputation Tier** — EasyAdmin `ChoiceField` with `LOCAL / REGIONAL / NATIONAL / ELITE` options

---

### `LeagueCrudController`

Standard EasyAdmin CRUD for `League`.

- **List:** country, tier, name, club count (via virtual field)
- **Edit:** country, tier, name

---

### Clubs & Leagues quick-actions page

New card added alongside existing Generate Clubs and Replenish Senior Pool:

**Generate League Structure**
- Input: country dropdown
- Creates 8 `League` records for the selected country (tier 1–8), named "League 1"–"League 8"
- Skips any tier that already exists for that country
- Flash: "Created 8 leagues for England" or "3 created, 5 already existed"

**NPC Club → League auto-assignment:** when clubs are generated for a country+tier, they are automatically assigned to the matching League if one exists.

### Sidebar

```
Clubs & Leagues
  NPC Clubs     ← existing
  Leagues       ← new
  Generate      ← existing (updated with league generation card)
```

---

## Out of Scope (Spec C — Frontend / Client)

- Squad assembly at game-start from pool
- Match simulation formula
- Client-side standings calculation
- Promotion/relegation UI
- Season history screen rendering
- Consume endpoint calls for NPC squad assembly
