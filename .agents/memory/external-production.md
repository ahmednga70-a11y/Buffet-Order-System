---
name: External production hosting
description: Distinguish the user's Vercel and Neon production deployment from Replit development services.
---

The user deploys this application with Vercel and Neon.

**Why:** The user explicitly stated that they use Neon and Vercel. Earlier successful account-registration checks exercised Replit development only, not this external production deployment.

**How to apply:** Investigate the supplied live Vercel URL and its own environment settings when debugging production. Do not treat Replit's managed production database replica or Replit Secrets as the source of truth for the external Neon database or Vercel configuration. Report development verification and live-deployment verification separately.

Validate server imports under NodeNext as well as the workspace's bundler configuration when changing the Vercel entry.

**Why:** The bundler-based check accepted extensionless ESM imports that Vercel's compiler rejected. Bundling successfully alone did not establish deployment compatibility.

**How to apply:** Use explicit `.js` relative imports and explicit directory entry paths in server-side ESM source, and run a NodeNext type check before handing off Vercel deployment changes.

Preserve inferred types from Express application and router factories instead of adding explicit `Express` or `IRouter` wrapper annotations.

**Why:** The external Vercel build reported missing inherited callable signatures and router methods for these explicit wrapper types while local checks passed.

**How to apply:** Let factory return types flow through server exports; type HTTP request and response parameters directly where needed. Do not introduce `any` or casts to suppress the deployment errors.
