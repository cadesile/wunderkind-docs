# WunderkindFactory — Project Context

> Generated: 2026-03-31 19:30:42 | Stack: unknown | Dev: bare

---

## Overview

WunderkindFactory is a mobile-first football academy management strategy game where players act as Academy Directors — discovering, developing, and trading youth talent through a dynamic 8-trait Personality Matrix in a 16-bit retro-inspired world. The architecture follows a client-authoritative, offline-first model: all core gameplay (the "Weekly Tick," training, aging, and personality shifts) runs entirely on-device via a React Native/Expo frontend, while a Symfony 8 + API Platform backend handles only legacy metric sync, anti-cheat validation, and global leaderboards. State persists locally via Zustand and AsyncStorage, with high-level academy metrics asynchronously pushed to the server when connectivity is available.

---

## Metrics

| Category | Count |
|---|---|
| Entities/Models   | 0 |
| Controllers       | 0 |
| Services          | 0 |

---

## Technology Stack

| | |
|---|---|
| **Language**      | unknown |
| **Framework**     | unknown |
| **Dev env**       | bare |

### Dependencies



---

## Project Structure

```
.
├── docs
│   └── WunderkindFactory-context.md.tmp
├── wunderkind-app
│   ├── app
│   │   ├── (tabs)
│   │   ├── coach
│   │   ├── market
│   │   ├── player
│   │   ├── scout
│   │   ├── _layout.tsx
│   │   └── game-over.tsx
│   ├── assets
│   │   ├── fonts
│   │   ├── images
│   │   ├── svg
│   │   ├── android-icon-background.png
│   │   ├── android-icon-foreground.png
│   │   ├── android-icon-monochrome.png
│   │   ├── favicon.png
│   │   ├── icon.png
│   │   ├── logo_master.png
│   │   └── splash-icon.png
│   ├── docs
│   │   └── wunderkind-app-context.md
│   ├── scripts
│   │   ├── dev-proxy.py
│   │   ├── generate_project_context.sh
│   │   └── generate-assets.js
│   ├── src
│   │   ├── api
│   │   ├── components
│   │   ├── constants
│   │   ├── engine
│   │   ├── hooks
│   │   ├── stores
│   │   ├── types
│   │   └── utils
│   ├── app.json
│   ├── babel.config.js
│   ├── CLAUDE.md
│   ├── eas.json
│   ├── global.css
│   ├── metro.config.js
│   ├── nativewind-env.d.ts
│   ├── package-lock.json
│   ├── package.json
│   ├── README.md
│   ├── tailwind.config.js
│   └── tsconfig.json
└── wunderkind-backend
    ├── bin
    │   └── console
    ├── config
    │   ├── jwt
    │   ├── packages
    │   ├── routes
    │   ├── bundles.php
    │   ├── preload.php
    │   ├── reference.php
    │   ├── routes.yaml
    │   └── services.yaml
    ├── docker
    │   ├── jwt-entrypoint.sh
    │   ├── nginx-http-only.conf
    │   ├── nginx.conf
    │   └── supervisord.conf
    ├── docs
    │   ├── event-guide.md
    │   ├── frontend-integration.md
    │   └── wunderkind-backend-context.md
    ├── migrations
    │   ├── archive
    │   ├── Version20260326000000_baseline_postgres.php
    │   ├── Version20260326222629.php
    │   ├── Version20260326234223.php
    │   ├── Version20260327000001.php
    │   ├── Version20260327000002.php
    │   ├── Version20260329000001.php
    │   ├── Version20260329173338.php
    │   ├── Version20260329193805.php
    │   ├── Version20260329214559.php
    │   ├── Version20260330174208.php
    │   └── Version20260331081012.php
    ├── public
    │   ├── bundles
    │   ├── images
    │   ├── admin-login.css
    │   ├── index.html
    │   └── index.php
    ├── scripts
    │   ├── generate_project_context_push.sh
    │   ├── generate_project_context.sh
    │   └── reset_and_seed.sh
    ├── src
    │   ├── ApiResource
    │   ├── Command
    │   ├── Controller
    │   ├── Dto
    │   ├── Entity
    │   ├── Enum
    │   ├── EventSubscriber
    │   ├── Repository
    │   ├── Service
    │   └── Kernel.php
    ├── templates
    │   ├── admin
    │   └── base.html.twig
    ├── tests
    │   ├── Controller
    │   ├── Repository
    │   └── Service
    ├── translations
    ├── CLAUDE.md
    ├── compose.override.yaml
    ├── compose.yaml
    ├── composer.json
    ├── composer.lock
    ├── docker-compose.prod.yml
    ├── docker-compose.staging.yml
    ├── Dockerfile
    ├── project_plan.md
    ├── README.md
    ├── symfony.lock
    └── wunderkind-backend-context.md

55 directories, 70 files
```

---

## Data Models


---

## API Routes

```
Run:  debug:router
```

---

## Controllers


---

## Services


---

## Migrations

_No migrations directory found._

---

## Environment Variables

```bash
No .env or .env.example found.
```

---

## Development Setup

```bash
composer install
```

---

## Recent Git Activity

```
Git history not available
```

---

## Architecture Notes

- **Repository Pattern** — Symfony backend isolates all data access behind dedicated `*Repository` classes (e.g., `PlayerRepository`, `AcademyRepository`), decoupling query logic from business logic.
- **Service Layer** — A `Service/` directory in the backend centralizes business logic, keeping controllers thin and separating orchestration from HTTP concerns.
- **DTO Pattern** — Explicit `Dto/` classes (`SyncRequest`, `MarketDataResponse`, `AcademyInitRequest`) shape API boundaries, preventing direct entity exposure.
- **Store-per-Domain (Flux/Zustand)** — The frontend uses fine-grained Zustand stores per domain concept (`marketStore`, `scoutStore`, `narrativeStore`, etc.), mirroring a state-management variant of CQRS where reads and mutations are handled through isolated store slices.
- **Feature Module Organization** — Both the Expo router (`app/coach/`, `app/player/`, `app/market/`) and the backend controller split (`Controller/Admin/`, `Controller/Api/`) follow vertical slice / feature-based decomposition rather than purely horizontal layering.

---

## Current Development Focus

- **Project initialization and scaffolding** — No commits or files exist yet; AI can help establish architecture, directory structure, tooling configuration, and boilerplate to get development started efficiently.
- **Technology stack selection** — With no existing code constraints, AI can evaluate and recommend appropriate frameworks, languages, and dependencies aligned with project goals.
- **Documentation and planning** — AI can help draft README, contribution guidelines, and technical specs before code is written, setting clear expectations early.
- **CI/CD pipeline setup** — AI can generate workflow configurations (GitHub Actions, etc.) and testing infrastructure from the ground up without needing to reconcile with existing patterns.
- **Codebase conventions and standards** — AI can establish linting rules, code style guides, commit message conventions, and folder organization before habits form organically.
