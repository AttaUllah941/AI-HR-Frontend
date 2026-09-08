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
