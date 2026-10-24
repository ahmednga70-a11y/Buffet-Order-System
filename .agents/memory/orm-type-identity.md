---
name: ORM type identity
description: Avoid cross-package ORM class identity conflicts in external deployment builds.
---

Services must obtain ORM query operators through the shared database package rather than importing a separate ORM dependency alongside that package's tables.

**Why:** Vercel can resolve the service and database package to distinct ORM installations. ORM types with private members then become incompatible even when package versions match; a locally deduplicated pnpm installation may hide the conflict.

**How to apply:** Keep the ORM dependency owned by the database library and expose the query helpers services need through that library. Do not bypass incompatibilities with casts or assume matching version numbers guarantee type identity.
