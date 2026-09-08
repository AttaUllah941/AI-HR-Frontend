# Zenith HR — Frontend

Angular 21 standalone application for the Zenith Enterprise AI HR platform. UI tokens and layout target the Lovable reference: [zenith-hr-assistant.lovable.app](https://zenith-hr-assistant.lovable.app/).

## Current status

- **Auth** and **application shell** are implemented (JWT/MFA + Lovable-aligned sidebar/topbar).
- **Dashboard** presents Lovable-style greeting, KPIs, AI insights, and chart panels with **demo data** until domain APIs exist.
- **Organization** (company profile, departments, locations) is live against the API.
- **Employees** directory (filter, paginate, add, export CSV) is live against the API.
- **Attendance** (daily KPIs, team calendar, recent check-ins) is live against the API.
- **Leave** (balances, pending requests, holidays, request form) is live against the API.
- **Payroll** (period totals, salary list, export, run payroll) is live against the API.
- **Recruitment** (pipeline board, post job, AI screen) is live against the API.
- **Performance** (avg score, goals, top performers, AI suggestions) is live against the API.
- Other feature routes remain placeholders until their phases.

## Prerequisites

- Node.js 22+
- Backend API running at `http://localhost:3000` (see backend README)

## Quick start

```bash
npm install
npm start
```

App: `http://localhost:4200`  
Dev API base URL: `http://localhost:3000/api/v1` (`src/environments/environment.development.ts`)

## Scripts

| Command | Description |
|---|---|
| `npm start` | Dev server at `http://localhost:4200` |
| `npm run build` | Production build |
| `npm test` | Unit tests (Vitest) |

## Architecture

```
src/app/
  core/           guards, interceptors, services, models
  shared/         reusable UI components
  layouts/        auth + main application shell
  features/       lazy-loaded feature areas
src/styles/       design tokens + Material theme overrides
src/environments/ API base URL and app metadata
```

## Theme

Tokens follow the Lovable UX (`oklch` palette, `--zh-radius: 0.875rem`, Inter, dark sidebar). Angular Material is themed/overridden to match — not used with stock defaults.

## Auth notes

- Demo admin after backend seed: `admin@zenith.local` / `Password123!`
- MFA challenge: `/auth/mfa` · MFA setup (authenticated): `/mfa-setup`
- Access token refresh is handled by `refreshInterceptor`

## Phase 10 notes

- `/performance` — KPI cards, top performers list, AI suggestions
- Requires migrate deploy + seed after DB is available (Phases 4–10)

## Phase 9 notes

- `/recruitment` — pipeline kanban, post job form, AI screen resumes, stage moves
- Requires migrate deploy + seed after DB is available (Phases 4–9)

## Phase 8 notes

- `/payroll` — period hero total, KPI breakdown, filtered salary list, export CSV, run payroll
- Requires migrate deploy + seed after DB is available (Phases 4–8)

## Phase 7 notes

- `/leave` — balance KPIs, pending requests (approve/reject), upcoming holidays, request form
- Requires migrate deploy + seed after DB is available (Phases 4–7)

## Phase 6 notes

- `/attendance` — summary KPIs, month calendar, recent check-ins, record check-in form
- Requires migrate deploy + seed after DB is available (Phases 4–6)

## Phase 5 notes

- `/employees` — Lovable-style directory table with Filter / Export / Add Employee
- Statuses: Active, Remote, On Leave (plus Inactive/Terminated)
- Requires `npx prisma migrate deploy` + `npm run prisma:seed` after DB is available

## Phase 4 notes

- `/organization` — company profile, departments & teams, locations (API-backed)
- Overview cards mirror Lovable Settings entries for Company / Departments & Teams
- Organization is in the primary nav (product Phase 4); full Settings hub remains Phase 15

## Phase 3 notes

- Application shell matches Lovable nav order (Documents → `/files`, Policies → `/policies`) plus Organization for Phase 4
- Dashboard greeting, KPI grid, AI insights, and chart panels use **demo data** until domain APIs exist
- Global search ⌘K focuses the topbar input (full search lands in a later phase)
