# Frontend Audit: Zenith HR SPA

Scope: `AI-HR-Frontend` (Angular 21). Read-only audit. The backend findings (routes, tenancy, indexes, pagination) are in `AI-HR-Backend/docs/audit/AUDIT.md`.
State audited: branch `Review-The-App` at commit `e322c34`, **before** the layered-loading work. Items 1 to 3 below describe that original state.
Method: static reading plus inspection of `dist/` (dated Oct 24, so sizes may be stale). The app was not run and no bundle analysis was executed. Findings marked **(unsure)** were not fully verified.

---

## Critical / High

None found in the frontend.

## Medium

### M1. Blocking global overlay for every HTTP request
- `src/app/core/interceptors/error.interceptor.ts:22-35` called `loading.show()` for every request and `loading.hide()` in `finalize`. The only opt-out was an `X-Skip-Loading` header, which nothing used (grep: no callers).
- `src/app/shared/components/loading-overlay/loading-overlay.component.html` renders a full-screen `position: fixed` overlay with `backdrop-filter: blur(2px)` (`loading-overlay.component.scss`). It is mounted in `layouts/main-layout/main-layout.component.html:403` and `layouts/auth-layout/auth-layout.component.html:12`.
- Effects: every background call (notification bell feed, search type-ahead, refetches) blocks the screen; no delay or minimum duration, so fast calls flash it.
- show/hide calls are balanced (`finalize` runs on success, error and cancel); no leak path found. `LoadingService.reset()` (`core/services/loading.service.ts`) had no callers, so a stuck counter could never be cleared.
- No polling (`interval`/`timer`/`setInterval`) exists in `src/app` (grep), so only user-triggered and refetch traffic hits it.

### M2. Duplicate spinners
- The overlay spinner (40 px) and the per-page `mat-spinner` (28-32 px) show together on list pages, for example `features/employees/pages/employees-list/employees-list-page.component.html:67`, `features/leave/pages/requests/leave-requests-page.component.html:27`, `features/payroll/pages/runs/payroll-runs-page.component.html:36`, `features/attendance/pages/daily/attendance-daily-page.component.html:55` (paths as reported by the audit; the attendance path was not re-checked).
- About 80 files under `src/app/features` use `mat-spinner`/`mat-progress-spinner`. Two patterns: a 16 px `class="save-spinner"` inside dialog submit buttons (34 occurrences), and a 28-32 px page-level spinner. `mat-progress-bar` is not used anywhere.

### M3. ECharts runtime is a 549 KB chunk on the default landing page
- All 6 ECharts users are tree-shaken (`echarts/core` + registered charts/components/renderers; no `import * as echarts`). Example: `features/reports/components/reports-bar-chart.component.ts:11-14`; dashboard charts under `features/dashboard/components/`.
- Even so, `dist/zenith-hr/browser/chunk-APMMRVQX.js` is 561,681 B raw, shared by 9 lazy chunks (dashboard and reports). It is not modulepreloaded, so it loads on demand when the dashboard opens (the default route redirects to `/dashboard`).
- That the chunk is ECharts/zrender is inferred (text match and the chunks that import it), not confirmed with a stats file **(unsure)**.

### M4. Render-blocking external fonts
- `src/index.html:14-22` loads Inter (400/500/600/700), `Material Icons` and `Material Symbols Outlined` from Google Fonts. Two icon font families are loaded, so one may be redundant **(unsure which components use which)**. External font hosts must stay allowed by the nginx CSP.

## Low

- **L1** `angular.json:37-48`: budgets (initial 650 kB warn / 1 MB error, component styles 8 kB / 12 kB) do not cover lazy chunks, so the 561 KB chunk is invisible to the budget check.
- **L2** `dist/.../styles-*.css` is 105,696 B while `src/styles.scss` is 1.5 KB, so this is Material theme output **(unsure if typography/density styles are all needed)**.
- **L3** `features/auth/pages/mfa-setup/mfa-setup-page.component.ts:7,59`: static `import QRCode from 'qrcode'`. It lands in a 31.9 KB lazy chunk (`chunk-D6SYSLHB.js`), so acceptable.
- **L4** `features/payroll/pages/reports/payroll-reports-page.component.ts:6,23` imports `MatProgressSpinnerModule` but the template has no `mat-spinner` (unused import or a different spinner).
- **L5** Auth pages (login, register, forgot/reset password, verify email, MFA) have no local loading text; they relied on the global overlay. Whether their submit buttons are disabled while a request is in flight was not verified **(unsure)**.
- **L6** No loading handling for lazy-route chunk loads (only HTTP is tracked).
- **L7** Largest JS chunks (not mapped to routes, no stats file; hashed names): `chunk-APMMRVQX` 561,681 B; `chunk-ZBNH6373` 165,805 B (looks like shared rxjs/Angular code); `chunk-SUQPL5BM` 106,535 B; `chunk-PA53VIEY` 79,809 B; `chunk-Y4QKO2SH` 67,780 B; `chunk-TM5E7VGS` 62,735 B; `chunk-3OYTJAFX` 59,868 B; `chunk-4ABJ3NWJ` 52,990 B. `main-*.js` is 8,155 B.
- **L8** Material is imported per standalone component through `Mat*Module` classes (144 files), which is tree-shakeable and fine. No heavy export libs (xlsx, jsPDF, html2canvas); report exports happen in the backend.

## Security notes (frontend)
- Tokens are stored in `localStorage`/`sessionStorage` (`core/services/auth.service.ts:13-16, ~75-82`). A strict `script-src 'self'` CSP in `nginx.conf` reduces XSS risk; httpOnly cookies for the refresh token would be stronger. Not a defect, a hardening option.
- Client permission guards (`core/guards/permission.guard.ts`) are UX only. The backend audit found server-side gaps for managers/employees (see backend `AUDIT.md` H1, H2), so the UI hiding a menu item is not a control.

## Git history (secrets)
- Frontend repo: no `.env`, key, token, or credential files in any commit, and a pattern scan of history found nothing. (`git ls-files` matches for "token/secret" are only the AI dialog component files; false positives.)
- Backend repo: see its `AUDIT.md` ("Git history"). `stale_token.txt` was committed once but contains only a `dotenvx` banner line, no token.

---

## Phased implementation plan (frontend)

1. **Loading foundation (in progress in this branch).** Ref-counted `LoadingService` with 200 ms show delay and 400 ms minimum; `SKIP_LOADING` `HttpContextToken` and a dedicated loading interceptor; top progress bar; remove the blocking overlay once nothing depends on it.
2. **Skeletons on first load**, keeping old data (dimmed) on refetch. Dashboard, employees, then attendance/leave/payroll/recruitment/performance list tabs.
3. **Long-operation loaders** (`SmartLoader`) for payroll run, exports, Nova chat, resume screening, AI generation; shared `ErrorState` with a Retry output on failed lists.
4. **Bundle follow-ups (measure first).** Generate a stats file (`ng build --stats-json`) to map chunks to routes; consider `@defer (on viewport)` for dashboard charts; add budgets for lazy chunks; decide whether both icon fonts are needed.
5. **Optional hardening.** Move the refresh token to an httpOnly cookie (needs a backend change).
