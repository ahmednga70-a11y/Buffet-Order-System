---
name: Android APK build constraints
description: Constraints for producing an installable Android build from this Replit Expo project.
---

Replit's Expo publishing flow does not produce Android APKs; Android distribution builds must run through Expo's external build service. The workspace also does not include Java, Gradle, or an Android SDK for local APK generation.

**Why:** A requested downloadable APK cannot be created or attached from this workspace alone, even though Expo Go previews work and the app can be configured with the published API URL.

**How to apply:** Keep the mobile app's public API base URL configured for production, verify the API and Expo preview locally, then use the external Expo Android build flow to obtain the APK.