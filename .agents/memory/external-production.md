---
name: External production hosting
description: Distinguish the user's Vercel and Neon production deployment from Replit development services.
---

The user deploys this application with Vercel and Neon.

**Why:** The user explicitly stated that they use Neon and Vercel. Earlier successful account-registration checks exercised Replit development only, not this external production deployment.

**How to apply:** Investigate the supplied live Vercel URL and its own environment settings when debugging production. Do not treat Replit's managed production database replica or Replit Secrets as the source of truth for the external Neon database or Vercel configuration. Report development verification and live-deployment verification separately.

Validate the complete source graph from the Vercel entry under NodeNext, without relying on composite project references, as well as the workspace's bundler configuration.

**Why:** Bundler checks and NodeNext checks using project references both missed an ESM export-resolution failure in a shared package. Checking the entry's complete source graph reproduced the reported missing-schema export locally; cached declarations had concealed the source problem.

**How to apply:** Use explicit `.js` relative imports and explicit directory entry paths in server-side ESM source. Run the standalone entry check with strict null checking and implicit-any checking enabled before handing off deployment changes. Prefer an explicit runtime-schema package entry over traversing generated type barrels from server code; do not hand-edit generated files.

Keep the Vercel function entry as source-controlled JavaScript and bundle the server separately, while retaining an explicit TypeScript check in the build.

**Why:** Vercel's TypeScript compilation repeatedly rejected Express types that the project's own checks accepted, moving the failure between routes after individual patches. The official Node runtime documentation states that Vercel does not support TypeScript project references used by this monorepo. A checked, self-contained JavaScript bundle avoids that second compilation boundary without weakening source type checking.

**How to apply:** Preserve the JavaScript deployment entry and the separate checked bundle build. The entry must exist before Vercel discovers functions; only its bundle is generated. Verify that the packaged entry loads without workspace TypeScript or local dependencies, and keep generated output ignored. Do not restore a TypeScript function entry or suppress source errors with `any` or casts.

Before changing code for a reported build failure, compare the revision cloned in the Vercel log with the actual source at that revision.

**Why:** An uploaded full build log still compiled a pre-fix router annotation that no longer existed in the current workspace. Repeated errors from an older deployment were not evidence that the latest fix failed.

**How to apply:** Inspect the log's cloned branch/revision and the corresponding file content. Distinguish publishing the latest branch changes from rebuilding an older deployment; do not make additional code changes solely to address a stale log.
