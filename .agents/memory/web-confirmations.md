---
name: Web confirmations
description: Avoid silent web failures when a native alert gates a mutation.
---

Do not put a critical write solely inside an `Alert.alert` button callback in
the shared mobile/web app. Use a visible cross-platform confirmation or a
platform-specific implementation that really works on the web.

**Why:** The installed React Native Web alert implementation is an empty method.
The worker's delivery button therefore appeared to do nothing: its confirmation
callback never ran and no API request was sent, although the backend worked.

**How to apply:** Confirm the full button-to-network-to-visible-state path, not
just the endpoint. Show actionable failures in the page instead of another
web-incompatible native alert. Preserve confirmation before changing order state.
