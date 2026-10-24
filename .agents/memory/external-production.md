---
name: External production hosting
description: Distinguish the user's Vercel and Neon production deployment from Replit development services.
---

The user deploys this application with Vercel and Neon.

**Why:** The user explicitly stated that they use Neon and Vercel. Earlier successful account-registration checks exercised Replit development only, not this external production deployment.

**How to apply:** Investigate the supplied live Vercel URL and its own environment settings when debugging production. Do not treat Replit's managed production database replica or Replit Secrets as the source of truth for the external Neon database or Vercel configuration. Report development verification and live-deployment verification separately.
