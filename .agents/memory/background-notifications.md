---
name: Background notifications
description: Required platforms and reliable notification identity across serverless deployments.
---

The user requires worker notifications even when the website or application is closed, on both the browser and Android APK.

**Why:** The user explicitly chose “حتى لو الموقع أو التطبيق مقفول” and “المتصفح وأندرويد”.

**How to apply:** Foreground polling, haptics or a browser-only solution do not complete this requirement. Distinguish implementation checks from actual delivery tests. Android background push requires a standalone build with a linked Expo project and matching FCM configuration; Expo Go is not proof that APK push works.

Keep the Web Push signing identity durable across serverless instances and deployments. Its encrypted storage depends on a stable server session secret.

**Why:** Generating new VAPID keys on every cold start invalidates existing browser subscriptions. Changing the encryption secret also prevents reading the saved signing identity and device credentials.

**How to apply:** Reuse the persisted encrypted identity. Plan key rotation and device re-enrollment explicitly, not as an incidental part of a deploy or server restart. Do not expose subscription credentials or private keys in client responses, logs or memory.

The worker's alert tone should be fixed; the user selected their uploaded door-bell sound.

**Why:** The user asked for “نغمة معينة عند العامل تكون ثابتة” and supplied the audio.

**How to apply:** Preserve that sound choice when revising worker notifications. Distinguish browser-page audio from the OS-controlled sound of closed-site notifications, and do not promise that a fixed tone overrides Android's user sound/mute settings.
