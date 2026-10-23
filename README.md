# Zenith HR — Frontend

Angular SPA for the Zenith Enterprise AI HR platform.

## Scripts

| Command | Description |
|---------|-------------|
| `npm start` | Dev server |
| `npm run build` | Production build |
| `npm run test:ci` | Vitest unit tests (CI) |

## Production

The production Docker image builds the SPA and serves it with nginx (`Dockerfile`, `nginx.conf`). When used from the backend compose stack, `/api/` is proxied to the API container.

See the backend guide: [`AI-HR-Backend/docs/PRODUCTION.md`](../../AI-HR-Backend/docs/PRODUCTION.md) (path relative from monorepo layout).

Production `environment.ts` uses `apiBaseUrl: '/api/v1'` (same-origin).

## Phase 11 — AI Assistant (Nova)

Feature area under `/ai` (permission `ai:view`). Shell tabs:

| Route | Purpose |
|-------|---------|
| `/ai/overview` | Usage KPIs, provider status, recent insights |
| `/ai/assistant` | Chat with Nova (conversations CRUD) |
| `/ai/screening` | Resume screening scorecards |
| `/ai/appraisals` | Appraisal draft generation |
| `/ai/policies` | Policy draft generation (also linked from Policies nav) |
| `/ai/recommendations` | Action recommendations + refresh |

Client: `src/app/core/services/ai.service.ts` → `/api/v1/ai/*`. AI API keys stay on the backend only (`AI_PROVIDER=mock` by default).

## Phase 12 — Reports & Analytics

Feature area under `/reports` (permission `reports:view`; export requires `reports:export`). Shell tabs:

| Route | Purpose |
|-------|---------|
| `/reports/overview` | KPIs, charts, report catalog (PDF/CSV), recent exports |
| `/reports/attendance` | Attendance analytics + date filters |
| `/reports/leave` | Leave mix by status/type |
| `/reports/payroll` | Payroll runs (year/month filters) |
| `/reports/recruitment` | Hiring funnel analytics |
| `/reports/performance` | Goals / reviews / promotions |
| `/reports/employees` | Headcount and department mix |

Client: `src/app/core/services/reports.service.ts` → `/api/v1/reports/*`. Exports: CSV, PDF, JSON (logged in `ReportExportLog`).

## Phase 13 — Notifications

Feature area under `/notifications` (permission `notifications:view`; templates/send need `notifications:manage`). Shell tabs:

| Route | Purpose |
|-------|---------|
| `/notifications/inbox` | In-app inbox, unread filters, mark read / delete |
| `/notifications/preferences` | Per-category in-app / email / push toggles |
| `/notifications/templates` | Template CRUD + send (`notifications:manage`) |
| `/notifications/devices` | Push device registration |

Header bell uses `GET /notifications/feed`. Client: `src/app/core/services/notifications.service.ts` → `/api/v1/notifications/*`.

## Phase 14 — Profile

Self-service area under `/profile` (authenticated; no extra permission). Shell tabs:

| Route | Purpose |
|-------|---------|
| `/profile/overview` | Name, phone, avatar URL + employee summary |
| `/profile/security` | Password change + MFA link |
| `/profile/sessions` | Device sessions / revoke |
| `/profile/preferences` | Theme, locale, timezone, formats |
| `/profile/activity` | Recent audit activity for the user |

Client: `src/app/core/services/profile.service.ts` → `/api/v1/profile/*`. MFA remains at `/mfa-setup`.

## Phase 15 — Settings

Company admin hub under `/settings` (permission `settings:view`; users/roles use their own RBAC). Shell tabs:

| Route | Purpose |
|-------|---------|
| `/settings/overview` | Snapshot KPIs + Lovable-style settings catalog |
| `/settings/company` | Company profile |
| `/settings/users` | Invite / update / soft-delete users (`users:*`) |
| `/settings/roles` | Role permission matrix (`roles:view` / `roles:manage`) |
| `/settings/email` | Email provider settings |
| `/settings/storage` | File storage provider |
| `/settings/system` | System toggles + integrations JSON |
| `/settings/security` | Security policy (Phase 18 APIs) |
| `/settings/audit` | Company audit trail |

Client: `src/app/core/services/settings.service.ts` → `/api/v1/settings/*`.

## Phase 16 — Documents (files)

Secure document library under `/files` (permission `files:view`; upload/update/delete use `files:create|update|delete`). Shell tabs:

| Route | Purpose |
|-------|---------|
| `/files/overview` | Storage counts by category + quick links |
| `/files/library` | All files (search / category) |
| `/files/documents` | Employee documents (`EMPLOYEE_DOCUMENT`) |
| `/files/resumes` | Candidate resumes (`RESUME`) |

Client: `src/app/core/services/files.service.ts` → `/api/v1/files/*` (upload, preview, download, soft-delete).

## Phase 17 — Global features (search)

Cross-app search under `/search`, plus command palette (`Ctrl/⌘ K`) and shortcuts help (`Ctrl/⌘ /`) from the main layout.

| Surface | Purpose |
|---------|---------|
| `/search` | Full search with type filters, status/category, sort, recent, bookmarks |
| Command palette | Quick jump (does not write recent history) |
| Shortcuts help | Catalog from `GET /global/shortcuts` |
| Chords | `G` then `D/E/F/P/S` → dashboard / employees / documents / profile / search |

Client: `src/app/core/services/global.service.ts` → `/api/v1/global/*`.

## Phase 18 — Security hardening

Company security hub under `/settings/security` (`settings:view` / `settings:update`).

| Surface | Purpose |
|---------|---------|
| Status chips | MFA coverage, privileged without MFA, lockouts, failed logins |
| Hardening review | Pass / warn / fail checklist from `GET /security/review` |
| Policy form | Lockouts, password rules, MFA warn flag, IP allowlist |
| Login attempts | Filterable audit of recent sign-in attempts |

Client: `src/app/core/services/security.service.ts` → `/api/v1/security/*`. Privileged users without MFA see a post-login reminder when the policy flag is enabled.

## Phase 19 — Performance optimization

Shell and list-path tuning for faster authenticated UX:

| Area | Change |
|------|--------|
| Shell greeting | `GET /dashboard/greeting` instead of full summary |
| Leave / overtime filters | Debounced reloads |
| Lists | Paginated overtime + leave balances; pipeline/AI chat soft-capped |
| Docs | Aligns with backend Phase 19 indexes + shared pagination |

Also: OnPush + `@for` track across features; lazy command palette / shortcuts from main layout; Angular budget warnings documented in backend README.

## Phase 20 — Production deployment

Production SPA image (`Dockerfile` + `nginx.conf`):

| Concern | Behavior |
|---------|----------|
| API access | Relative `/api/v1` → nginx proxies `/api/` to `api:3000` |
| Uploads | `client_max_body_size 11m` (aligned with backend `FILE_MAX_BYTES`) |
| Headers | nosniff, frame options, referrer, permissions-policy, CSP |
| Probe | `GET /healthz` |

Deploy via the backend compose stack (see backend `docs/PRODUCTION.md`). Frontend CI: `.github/workflows/ci.yml` (`test:ci` + production build).
