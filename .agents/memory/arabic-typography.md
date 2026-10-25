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

Check automatic translation before attributing readable but substituted Arabic
words to fonts.

**Why:** A Xiaomi screenshot showed changed short labels while longer Arabic
sentences were readable. The deployed JavaScript and menu API had correct text,
but the published HTML advertised English. That makes browser translation a
plausible separate cause; it is not proof of a native Android font failure.

**How to apply:** Declare Arabic in the original exported document and prevent
automatic translation of this Arabic-only interface, including customer names
and drink labels. Check the actual exported HTML, not only configuration.
Distinguish a browser-installed app/PWA from a native APK before claiming the
affected phone is fixed; a preview screenshot does not verify that device.
