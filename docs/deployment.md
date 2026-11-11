# Production deployment preparation

The repository is ready for a static Vite frontend, a persistent Express web service, and PostgreSQL 16. A straightforward setup is Vercel for the frontend and Render for the backend and managed database. No hosted resources are created by this guide.

## Backend and database

1. Create a managed PostgreSQL 16 database and a Docker web service in the same Render account and region. Connect the web service to this repository, keep its root at the repository root, set its Dockerfile path to `apps/backend/Dockerfile`, and use the repository root as the Docker build context. The Dockerfile runs forward-only migrations before starting Express.
2. Set `DATABASE_URL` privately to the database's internal connection URL. Set `DATABASE_SSL` according to that connection's TLS mode. The current Node PostgreSQL client uses `rejectUnauthorized: false` when `DATABASE_SSL=true`; review the provider's certificate settings before choosing that mode.
3. Set `NODE_ENV=production`, `PORT=3000`, and `CORS_ORIGIN` to the final frontend HTTPS origin, with no trailing slash. The app reads `PORT` and listens on all interfaces by default.
4. Set the web service health check to `/api/health/database`. Confirm that it returns HTTP 200 after migrations and that `/api/health` responds before connecting the frontend.
5. Keep database credentials, optional Supabase keys, and all account credentials in the hosting provider's secret settings. Do not copy the local `.env`, disposable test database, or test accounts to production.

## Frontend

1. Create a Vercel project from this repository with Root Directory `apps/frontend`, framework Vite, build command `npm run build`, and output directory `dist`. The existing `apps/frontend/vercel.json` supplies the single-page route rewrite.
2. Set the build-time variable `VITE_API_URL` to the backend's public HTTPS origin, with no trailing slash. Do not set database URLs or private keys in any `VITE_` variable.
3. Deploy the frontend after the backend health check passes. Set the backend's `CORS_ORIGIN` to the exact final Vercel or custom-domain origin, then check login and a protected API call from the public frontend.

## Inputs still needed

- Approval of hosting provider, plan, region, and any associated charges for the persistent web service and managed PostgreSQL.
- Access to the hosting accounts and this GitHub repository for project creation, plus the desired production frontend and API domains.
- A decision on whether to migrate approved existing data. A new production database starts empty; the local `sasthosetu` database and disposable browser-test database must not be copied automatically.

The local browser workflow verifies the application, not a hosted deployment. Perform a separate public smoke test after hosting is configured.
