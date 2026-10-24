---
name: Database target verification
description: Do not infer the database target from the workspace's environment label.
---

Verify the actual database target before writing test fixtures; do not rely solely on the process environment's production/development label.

**Why:** A workspace process reported a production environment label even though an application query could read a non-business marker created through the explicit development-database tool. A label-only fixture guard rejected the correct development database.

**How to apply:** Establish target identity through a harmless development-only marker or equivalent explicit verification before tests write data. Refuse fixtures without that verification, and never seed the marker in production just to bypass the guard. If verification fails, cleanup must not execute writes either.
