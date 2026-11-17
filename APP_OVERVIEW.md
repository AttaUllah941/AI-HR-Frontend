# Zenith HR — Application Overview

**Zenith Enterprise AI HR Management Platform**: a full-stack HR system covering the employee lifecycle from hiring to payroll, with an AI assistant ("Nova").

| Part | Repo | Stack |
|------|------|-------|
| Frontend | `AI-HR-Frontend` | Angular 21 (standalone components, signals), Angular Material/CDK, ECharts, qrcode, Vitest |
| Backend | `AI-HR-Backend` | Node 22, Express 5, TypeScript, Prisma 7 (`@prisma/adapter-pg`), PostgreSQL 16, Zod |
| Deployment | both | Docker Compose, nginx reverse proxy |

---

## 1. Architecture

```
Browser
  └─► nginx (web container :80)
        ├─ static Angular SPA (production build)
        └─ /api/*  ──proxy──► Express API (api container :3000)
                                  └─► PostgreSQL 16
```

| Service | Role |
|---------|------|
| `web` | Angular SPA served by nginx, proxies `/api/` to the API |
| `api` | REST API (`/api/v1`), runs migrations on start |
| `postgres` | Primary datastore (named volume) |
| `db-backup` | Optional compose profile: one-shot `pg_dump` |

Environments:
- **Development**: `apiBaseUrl = http://localhost:3000/api/v1`.
- **Production**: `apiBaseUrl = /api/v1` (same-origin through nginx).

---

## 2. Frontend

### 2.1 Layout of `src/app`

```
core/
  guards/        authGuard, guestGuard, permissionGuard(...perms)
  interceptors/  auth (Bearer token), error (401/err handling), refresh (shared token refresh)
  models/        api.models.ts (typed API contracts)
  services/      one service per backend domain (+ toast, loading, confirm-dialog)
  utils/         safe-return-url
  validators/    password validators
features/        16 lazy-loaded areas (see below)
layouts/         main-layout (shell, nav, header, notification bell), auth-layout
shared/          page-header, breadcrumb, empty-state, confirm-dialog, loading-overlay, download-blob
```

About 549 source files and 27k lines of TypeScript. Every feature is lazy-loaded through `loadChildren` and gated by `permissionGuard('<module>:view')`.

### 2.2 Feature areas

| Route | Permission | Purpose |
|-------|-----------|---------|
| `/auth` | public | Login, MFA verify, forgot/reset password, email verification |
| `/dashboard` | `dashboard:view` | KPIs, sparklines, charts, clock-in card, activity, calendar |
| `/organization` | `organization:view` | Overview, org chart, branches, departments, teams, designations |
| `/employees` | `employees:view` | List, detail profile (contacts, education, experience, skills, certs, documents, timeline) |
| `/attendance` | `attendance:view` | Records, clock in/out, timesheet, shifts, holidays, overtime, reports |
| `/leave` | `leave:view` | Overview, requests, balances, calendar, types, policy |
| `/payroll` | `payroll:view` | Components, structures, tax, runs, payslips, reports |
| `/recruitment` | `recruitment:view` | Jobs, candidates, pipeline, interviews, offers |
| `/performance` | `performance:view` | Goals, KPIs, review cycles, reviews, feedback, promotions |
| `/ai` | `ai:view` | Overview, Nova chat, resume screening, appraisals, policies, recommendations |
| `/reports` | `reports:view` (`reports:export`) | Cross-module analytics, CSV/PDF/JSON exports |
| `/notifications` | `notifications:view` (`notifications:manage`) | Inbox, preferences, templates, push devices |
| `/profile` | authenticated only | Overview, security, sessions, preferences, activity |
| `/search` | authenticated | Global search |
| `/settings` | `settings:view` | Company settings, security policy, storage |
| `/files` | `files:view` | Overview and file browser |

Most areas follow the same pattern: a `*-shell` page with tabs, `pages/` per tab, and `dialogs/` for create/edit forms. Performance has 24 dialogs and payroll has 15.

### 2.3 Auth flow

1. Login returns `{ user, accessToken, refreshToken }`, or an MFA challenge token when MFA is enabled.
2. `AuthService` keeps session state in signals. "Remember me" chooses `localStorage` (persistent) or `sessionStorage` (tab only).
3. `authInterceptor` adds `Authorization: Bearer <token>`.
4. `refreshInterceptor` handles a 401 on a protected call with **one shared refresh** (`shareReplay`) and retries the request. The session is cleared only if the refresh call itself returns 400/401.
5. `isAuthenticated` stays true for an expired access token as long as a refresh token exists.
6. Permissions come from `user.permissions`. `permissionGuard` redirects to `/profile` on denial.
7. `returnUrl` is sanitized (`safe-return-url.ts`) to prevent open redirects.

### 2.4 Frontend commands

| Command | Description |
|---------|-------------|
| `npm start` | Dev server |
| `npm run build` | Production build |
| `npm run test:ci` | Vitest unit tests (CI mode) |

---

## 3. Backend

### 3.1 Layout

```
src/
  config/       env validation, logger, database
  modules/      ai, attendance, auth, dashboard, employees, files, global, health,
                leave, notifications, organization, payroll, performance,
                profile, recruitment, reports, security, settings
                (Controller → Service → Repository, with Zod validators)
  middleware/   auth, RBAC, validate, rate-limit, request-id, error
  routes/       API aggregation under /api/v1
prisma/         schema.prisma (66 models), migrations, seed.ts, seed-qa.ts
```

### 3.2 Data model (66 Prisma models)

- **Identity & security**: Company, User, Role, Permission, RolePermission, UserRole, Session, PasswordResetToken, EmailVerificationToken, AuditLog, LoginAttempt, CompanySecurityPolicy, UserPreference
- **Organization**: Branch, BranchAllowedIp, Department, Team, Designation
- **Employees**: Employee, EmployeeEmergencyContact, EmployeeEducation, EmployeeExperience, EmployeeSkill, EmployeeCertification, EmployeeDocument
- **Attendance**: Shift, Holiday, AttendanceRecord, OvertimeRequest
- **Leave**: LeaveType, LeavePolicy, LeaveBalance, LeaveRequest
- **Payroll**: SalaryComponent, SalaryStructure, SalaryStructureItem, TaxSetting, PayrollRun, PayrollEntry, PayrollEntryLine, Payslip
- **Recruitment**: JobOpening, Candidate, JobApplication, Interview, JobOffer
- **Performance**: PerformanceGoal, PerformanceKpi, EmployeeKpi, ReviewCycle, PerformanceReview, PerformanceFeedback, PromotionRequest
- **AI**: AiUsageLog, AiConversation, AiMessage, AiGeneration
- **Platform**: ReportExportLog, NotificationTemplate, Notification, NotificationPreference, PushDevice, CompanySettings, StoredFile, SearchBookmark, RecentSearch

### 3.3 API surface (`/api/v1`)

| Module | Highlights |
|--------|-----------|
| `auth` | register, login, refresh, logout, me, forgot/reset password, verify email, MFA setup/enable/disable/verify |
| `dashboard` | summary, activity, notifications feed |
| `organization` | overview, org chart, CRUD for branches, departments, teams, designations (soft-delete) |
| `employees` | paginated list, profile, CRUD, timeline, activity, sub-resource CRUD |
| `attendance` | summary, records CRUD, clock-in/out, timesheet, report, shifts, holidays, overtime approve/reject |
| `leave` | my summary, calendar, report, types, policy, balances, requests with approve/reject/cancel |
| `payroll` | components, structures, tax, runs (process → approve → mark-paid / cancel), entries, payslips |
| `recruitment` | jobs (publish/close/hold), candidates, applications and pipeline, interviews, offers (send/respond) |
| `performance` | goals, KPIs, employee KPIs, cycles, reviews (submit/acknowledge/complete), feedback, promotions |
| `ai` | status, summary, insights, recommendations, conversations, assistant chat, resume screening, appraisals, policies, generations |
| `reports` | summary, attendance, leave, payroll, recruitment, performance, employees, plus exports |
| `notifications` | feed, inbox, preferences, templates and send, devices |
| `profile` | overview, password, sessions, preferences, activity |
| `settings`, `files`, `security`, `global`, `health` | company settings, file storage, security policy, global search, health/ready probes |

Responses use a `{ success, data | message, code }` envelope.

### 3.4 Security measures

- helmet (strict CSP in production), CORS allowlist, global rate limiting, a dedicated auth rate limiter, request IDs, a 1 MB body limit.
- JWT access and refresh tokens, RBAC by `module:action` permissions, MFA (TOTP) with secrets encrypted at rest (AES-256-GCM, `enc:v1:`).
- Production startup refuses weak JWT secrets, a missing `MFA_ENCRYPTION_KEY`, and `EMAIL_PROVIDER=console`.
- nginx adds CSP, X-Frame-Options, nosniff, Referrer-Policy and Permissions-Policy on every location block.

### 3.5 Backend commands

| Command | Description |
|---------|-------------|
| `npm run db:up` | Start embedded PostgreSQL (keep terminal open) |
| `npm run dev` | API with hot reload (`tsx watch`) |
| `npm run build` / `npm start` | Compile / run `dist/server.js` |
| `npm run prisma:migrate` | Run migrations (dev) |
| `npm run prisma:seed` / `prisma:seed:qa` | Seed roles, permissions, company / QA data |
| `npm run lint` | Typecheck (`tsc --noEmit`) |
| `npm test` | Node test runner (`src/**/*.test.ts`) |
| `npm run docker:up` / `docker:down` | Compose stack up / down |
| `npm run backup:db` | One-shot database backup |

---

## 4. Configuration (backend `.env`)

| Group | Variables |
|-------|-----------|
| Server | `NODE_ENV`, `PORT`, `API_PREFIX` |
| Database | `DATABASE_URL` (compose overrides it from `POSTGRES_*`) |
| Auth | `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET` (≥32 chars, distinct), `JWT_*_EXPIRES_IN`, `MFA_ENCRYPTION_KEY` (required in production) |
| Web | `CORS_ORIGIN`, `APP_URL` |
| Limits | `RATE_LIMIT_WINDOW_MS`, `RATE_LIMIT_MAX` |
| AI | `AI_PROVIDER` (`mock` or `openai`), `AI_API_KEY`, `AI_BASE_URL`, `AI_MODEL`. Server-side only. |
| Email | `EMAIL_PROVIDER` (`smtp` in production), `EMAIL_FROM`, `EMAIL_SMTP_URL`, `EMAIL_API_KEY`, `ALLOW_CONSOLE_EMAIL` |
| Files | `FILE_STORAGE_ROOT`, `FILE_MAX_BYTES` |
| Logging | `LOG_LEVEL` |

---

## 5. Local setup

1. **Backend**: copy `.env.example` to `.env`. Run `npm run db:up` in one terminal. In another, run `npm run prisma:migrate`, then `npm run prisma:seed`, then `npm run dev`.
2. **Frontend**: run `npm install`, then `npm start`. It serves on `http://localhost:4200` and talks to `http://localhost:3000/api/v1`.
3. **Full stack**: run `npm run docker:up` in the backend. The web container is on port 8080 by default.

Production details: `AI-HR-Backend/docs/PRODUCTION.md`.

---

## 6. Known gaps and recommendations

- **Token storage**: tokens live in web storage, so they are exposed to XSS. The strict CSP mitigates this. httpOnly refresh cookies would be stronger.
- **Test coverage**: the frontend has 12 spec files for ~549 source files, mostly auth, interceptors and a few services, with no component tests. The backend has 16 test files.
- **Large files**: `main-layout.component.ts` (~824 lines) and the performance and AI services (700+ lines) are candidates to split.
- **RBAC coverage**: the client guards are UX only. Confirm that every backend route applies `rbac.middleware`.
- **Leftovers**: `shared/directives` and `shared/pipes` are empty. Check that `stale_token.txt` in the backend root is gitignored and holds no real token.
- **Docs**: the READMEs are organized by build phase and could be reorganized by feature.
