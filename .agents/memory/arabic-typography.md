---
name: Arabic typography
description: Avoid device-dependent Arabic font fallback without altering stored text.
---

Use locally bundled fonts containing both Arabic and Latin glyphs and Arabic
shaping tables at every text weight used in the mobile/web application.

**Why:** The user reported garbled Arabic on some phones. A Latin-only font
leaves Arabic rendering to device-specific fallback fonts. Bundling an
Arabic-capable family removes that dependency, although a desktop/mobile-width
browser check alone cannot prove the reported device-specific problem is resolved.

**How to apply:** Check all used font weights, include font assets in web/native
builds, and inspect Arabic rendering at phone sizes. If the affected device shows
encoding artifacts such as “Ø” or “Ù” rather than missing or disconnected Arabic
glyphs, investigate that exact response/device before changing encoding.
Do not re-encode existing database text as a speculative fix.
