# Zenith HR — Frontend

Angular 21 standalone application implementing the Zenith / Nova HR Lovable UX.

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
  features/       lazy-loaded feature modules
src/styles/       design tokens + Material theme overrides
src/environments/ API base URL and app metadata
```

## Theme

Tokens are sourced from the Lovable UX (`oklch` palette, `--radius: 0.875rem`, Inter, dark sidebar). Angular Material is themed/overridden to match — not used with stock defaults.

## Phase 2 notes

- Real JWT login/register/forgot/reset/verify/MFA against the API
- Demo admin after seed: `admin@zenith.local` / `Password123!`
- MFA challenge: `/auth/mfa` · MFA setup (authenticated): `/mfa-setup`
- Access token refresh is handled by `refreshInterceptor`
