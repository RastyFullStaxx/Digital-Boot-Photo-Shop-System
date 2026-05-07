# Digital Boot Photo Shop System

Offline-first photobooth platform for capture ingest, guest media selection, photo editing, branded print generation, and QR-based digital..

## Overview

Digital Boot Photo Shop System is designed for event and booth operations where internet reliability cannot be guaranteed. The system keeps booth-critical flows local (capture, selection, render, print), then synchronizes session data and final outputs to a cloud app when connectivity is available.

### Core business purpose

- Reduce booth downtime by supporting offline operation
- Speed up guest flow from capture to print
- Preserve brand consistency through logo + QR overlays
- Provide digital retrieval via secure tokenized links
- Offer admin visibility for templates, branding, sessions, and retention

## System Architecture

This repository is a TypeScript monorepo with three applications and two shared packages:

- `apps/booth-web`: Guest/operator kiosk UI (React + Vite)
- `apps/local-agent`: Local hardware/service layer (Fastify + SQLite)
- `apps/cloud-web`: Cloud APIs, admin views, and public QR pages (Next.js)
- `packages/shared-types`: Shared API schemas/contracts (`zod` + TS types)
- `packages/template-engine`: Template slot mapping and render math utilities

### Runtime responsibilities

- `booth-web` handles the interactive guest flow
- `local-agent` performs file ingest, preview generation, final image rendering, print queue dispatch, and sync orchestration
- `cloud-web` receives synced entities and serves admin + public content

## Technology Stack

| Layer | Tools |
|---|---|
| Language | TypeScript |
| Monorepo | pnpm workspaces, Turborepo |
| Booth UI | React, Vite, React Router, Zustand, TanStack Query, react-konva |
| Local service | Fastify, better-sqlite3, chokidar, sharp, qrcode, pino |
| Cloud app | Next.js App Router, NextAuth (credentials scaffold), Prisma schema |
| Validation/contracts | zod (`@photobooth/shared-types`) |
| Testing | Vitest, Supertest (local-agent route testing baseline) |
| CI | GitHub Actions |

## Implemented Baseline (Current)

### Booth flow

- Start/resume a session
- Auto-refresh session gallery from local ingest
- Select media for project creation
- Create edit project from selected assets
- Preview canvas with basic filter/sticker controls
- Trigger final render, print job queueing, and manual sync

### Local agent

- Hot-folder watcher for camera/tether output
- Automatic media copy into managed local storage
- Preview image generation for photo assets
- Local SQLite persistence for sessions/media/projects/print jobs
- Final image composition with:
  - template slot placement
  - logo overlay
  - QR overlay
  - filter stack and sticker overlays (baseline)
- Print queue abstraction with `WindowsSpoolAdapter` simulation
- Sync worker for sessions/assets/finals to cloud API

### Cloud app

- Sync ingestion routes:
  - `POST /api/v1/sync/sessions`
  - `POST /api/v1/sync/assets`
  - `POST /api/v1/sync/finals`
- Admin API routes (token-protected):
  - sessions list
  - template upsert/list
  - branding upsert/get
  - retention run
- Tokenized public page:
  - `GET /public/p/:token`

## Project Structure

```text
.
├── apps
│   ├── booth-web
│   ├── local-agent
│   └── cloud-web
├── packages
│   ├── shared-types
│   └── template-engine
├── .github/workflows
├── package.json
├── pnpm-workspace.yaml
└── turbo.json
```

## Getting Started

### Prerequisites

- Node.js `22+`
- pnpm `9+`

### Installation

```bash
pnpm install
```

### Environment setup

```bash
cp .env.example .env
```

### Run all apps

```bash
pnpm dev
```

Default local URLs:

- Booth UI: `http://127.0.0.1:5173`
- Local Agent API: `http://127.0.0.1:4477`
- Cloud Web/API: `http://127.0.0.1:3000`

### Run a single app

```bash
pnpm --filter @photobooth/booth-web dev
pnpm --filter @photobooth/local-agent dev
pnpm --filter @photobooth/cloud-web dev
```

## Environment Variables

Reference all defaults in `.env.example`.

### Local agent

- `LOCAL_AGENT_HOST`
- `LOCAL_AGENT_PORT`
- `BOOTH_ID`
- `WATCHED_DIRECTORY`
- `MEDIA_DIRECTORY`
- `PREVIEW_DIRECTORY`
- `RENDER_DIRECTORY`
- `DATA_DIRECTORY`
- `CLOUD_API_BASE_URL`
- `CLOUD_API_TOKEN`

### Cloud web

- `DATABASE_URL`
- `NEXTAUTH_URL`
- `NEXTAUTH_SECRET`
- `ADMIN_USERNAME`
- `ADMIN_PASSWORD`
- `ADMIN_API_TOKEN`

## API Summary

### Local Agent (`/api/v1`)

- `GET /health`
- `POST /sessions`
- `GET /sessions/active`
- `GET /sessions/:sessionId/media`
- `POST /sessions/:sessionId/complete`
- `POST /projects`
- `GET /projects/:projectId`
- `PATCH /projects/:projectId`
- `POST /projects/:projectId/render`
- `POST /print-jobs`
- `GET /print-jobs/:printJobId`
- `GET /templates`
- `POST /templates`
- `GET /brand-profile`
- `POST /sync/run`

### Cloud (`/api/v1`)

Sync routes:

- `POST /sync/sessions`
- `POST /sync/assets`
- `POST /sync/finals`

Admin routes (require `x-admin-token`):

- `GET /admin/sessions`
- `GET /admin/templates`
- `POST /admin/templates`
- `GET /admin/branding`
- `POST /admin/branding`
- `POST /admin/retention/run`

Public route:

- `GET /public/p/:token`

## Development Workflow

### Typical booth simulation

1. Start all services with `pnpm dev`
2. Drop sample files into `WATCHED_DIRECTORY` (default: `apps/local-agent/uploads/inbox`)
3. Open booth UI and create/resume session
4. Select media and create project
5. Render and queue a print job
6. Trigger sync and open generated public token URL

### Build, typecheck, and test

```bash
pnpm typecheck
pnpm test
pnpm build
```

## Security and Privacy Baseline

- Public QR access uses unguessable token paths
- Admin endpoints require explicit admin API token header
- Shared schemas validate request payloads at API boundaries
- Retention endpoint supports deletion workflows for aging data

## Current Limitations

- Printer integration is simulated (`WindowsSpoolAdapter` logs dispatch; no vendor driver call yet)
- Cloud runtime persistence currently uses in-memory store for API execution
- Prisma schema is prepared but not yet wired to production DB operations
- Video processing is limited to ingest/listing (no full edit/render parity)
- Auth is scaffolded for admin flows; full production RBAC and session enforcement still pending

## Roadmap (Recommended Next Milestones)

1. Replace in-memory cloud store with Prisma-backed persistence
2. Integrate real Windows spool/vendor printer adapters (DNP/Canon/Citizen)
3. Move media delivery to object storage (S3/R2) with signed URLs
4. Expand edit pipeline (filter fidelity, sticker asset library, layout controls)
5. Add Playwright E2E flows for kiosk, print, and sync recovery
6. Implement stronger admin RBAC + audit UI

## CI

GitHub Actions workflow at `.github/workflows/ci.yml` runs:

- install
- typecheck
- build
- test


## Contribution Guidelines

- Keep contracts in `packages/shared-types` as source of truth
- Update both route handlers and shared schemas together when API changes
- Prefer additive migrations and backward-compatible payload changes
- Add tests for shared logic and route behavior for every non-trivial change

## License

No license file is currently defined in this repository. Add a `LICENSE` file before public distribution.





