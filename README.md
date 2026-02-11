# Digital Boot Photo Shop System

Offline-first photobooth platform for capture ingest, guest selection/editing, collage rendering, local printing, and QR-based cloud sharing.

## Monorepo Structure

- `apps/booth-web`: kiosk UI for guest/operator flow (React + Vite)
- `apps/local-agent`: local service for ingest/render/print/sync (Fastify + SQLite)
- `apps/cloud-web`: cloud APIs + admin/public pages (Next.js + Prisma schema)
- `packages/shared-types`: shared `zod` DTOs and TypeScript contracts
- `packages/template-engine`: template slot-fit and coverage utilities

## Implemented V1 Capabilities

- Camera ingest via hot-folder watcher (`chokidar`) in local-agent
- Session lifecycle and media catalog APIs
- Guest media gallery + selection in booth UI
- Project creation + final render pipeline (`sharp`) with QR overlay (`qrcode`)
- Print queue abstraction with default `WindowsSpoolAdapter` simulation
- Cloud sync endpoints for sessions/assets/finals
- Tokenized public page `/public/p/:token`
- Admin APIs for sessions/templates/branding/retention (token-protected)
- Shared schema contracts across booth/local-agent/cloud
- Basic CI workflow for install/typecheck/build/test

## Quick Start

Prerequisites:

- Node.js 22+
- pnpm 9+

### 1. Install dependencies

```bash
pnpm install
```

### 2. Configure environment

```bash
cp .env.example .env
```

### 3. Run all apps

```bash
pnpm dev
```

Default ports:

- Booth UI: `http://127.0.0.1:5173`
- Local Agent: `http://127.0.0.1:4477`
- Cloud Web: `http://127.0.0.1:3000`

## App Commands

- `pnpm --filter @photobooth/local-agent dev`
- `pnpm --filter @photobooth/booth-web dev`
- `pnpm --filter @photobooth/cloud-web dev`

## Local Agent API (`/api/v1`)

- `POST /sessions`
- `GET /sessions/active`
- `GET /sessions/:id/media`
- `POST /sessions/:id/complete`
- `POST /projects`
- `GET /projects/:id`
- `POST /projects/:id/render`
- `POST /print-jobs`
- `GET /print-jobs/:id`
- `POST /sync/run`
- `GET /templates`
- `POST /templates`
- `GET /brand-profile`
- `GET /health`

## Cloud API (`/api/v1`)

Sync endpoints:

- `POST /sync/sessions`
- `POST /sync/assets`
- `POST /sync/finals`

Admin endpoints (require `x-admin-token` header):

- `GET /admin/sessions`
- `GET|POST /admin/templates`
- `GET|POST /admin/branding`
- `POST /admin/retention/run`

Public share page:

- `GET /public/p/:token`

## Hardware/Booth Notes

- Put captured media into `WATCHED_DIRECTORY` (default `apps/local-agent/uploads/inbox`).
- Local agent copies ingested files to `apps/local-agent/uploads/media`, generates previews, and tracks metadata in SQLite (`apps/local-agent/data/local-agent.db`).
- Rendered print outputs are written to `apps/local-agent/renders`.

## Current Limitations (Expected for this baseline)

- `WindowsSpoolAdapter` currently simulates print dispatch (adapter seam is ready for real spool/vendor integrations).
- Cloud persistence currently uses in-memory store for running APIs; Prisma schema is included for DB migration phase.
- Video flow is ingest + listing only (no full edit pipeline), matching planned V1 scope.

## Testing

```bash
pnpm test
```

Included tests:

- Local agent health endpoint
- Cloud store session upsert/list behavior
- Template engine assignment/coverage logic
