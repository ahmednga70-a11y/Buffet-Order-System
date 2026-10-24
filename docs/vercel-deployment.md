# Vercel + Neon

Deploy this repository as one Vercel project with **Root Directory = repository root** (the directory containing `vercel.json`, `api/`, and `pnpm-workspace.yaml`), not `artifacts/mobile`.

The root `api/index.js` is a source-controlled CommonJS Vercel Function. Before exporting Expo web to `artifacts/mobile/dist`, the build runs `pnpm --filter @workspace/api-server run build:vercel`. This checks the complete server source graph with TypeScript, then bundles it into `artifacts/api-server/dist-vercel/handler.cjs`. Vercel includes that bundle explicitly and does not need to recompile the workspace's TypeScript sources using its separate compiler. Keep the generated bundle out of Git; it is created during every deployment build.

Requests under `/api/` are routed to Express; other frontend routes load the exported app. The JavaScript function entry must be committed, not generated during the build, so Vercel can discover it in advance. Do not keep an old `api/index.ts` alongside it.

## Required production environment variables in Vercel

Configure these in Vercel project settings. Do not commit their values:

- `DATABASE_URL`: the Neon PostgreSQL connection string, including Neon's required SSL settings.
- `ADMIN_INITIAL_PASSWORD`: the chosen password for username `admin`. There is no hardcoded default password.
- `SESSION_SECRET`: a strong random secret for signing sessions.

Replit Secrets do not configure a separate Vercel project. After changing these settings or pushing the deployment fix, create a new Vercel deployment.

The existing Vercel handler initializes the Neon tables and default projects on its first request, then synchronizes the primary admin with `ADMIN_INITIAL_PASSWORD`.

## Check after deployment

1. `GET /api/healthz` must return JSON rather than a Vercel `404` page.
2. `GET /api/projects` must return the project list. The login screen should show selectable projects.
3. Select a project, use username `admin`, and use the password configured in **Vercel's** `ADMIN_INITIAL_PASSWORD`.

If the API returns `500` or `503`, inspect Vercel Function logs for missing configuration or a Neon connection/schema error. Do not change account passwords to work around a missing API route.
