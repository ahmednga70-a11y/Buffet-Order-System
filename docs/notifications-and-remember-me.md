# Saved login, urgent orders and background notifications

## Saved login

The login form's “تذكرني على هذا الجهاز” stores a session token, never a password.
Remembered logins expire after 30 days. Browser tokens use local storage; native
tokens use Expo SecureStore. With the option off, the browser uses tab session
storage and native tokens remain in memory. Logout clears the saved session,
query cache and this device's notification subscription. An enabled notification
device needs connectivity to unregister safely before logout.

Worker notification choices (push and bell separately) are saved on the device,
scoped to the account and project. Closing/reopening the app or logging in again
does not reset them. Logout removes the active device registration for privacy,
not the choice: a later login to the same account/project silently re-registers
using the existing OS permission. Another account/project does not inherit it.
Explicitly switching notifications off persists that choice.

On startup the UI first reads the saved setting. A failed network verification
shows “اختيار التفعيل محفوظ”, not an instruction to re-enable notifications.
Connection recovery, foregrounding, and a 30-second retry timer retry
registration without a permission prompt. Revoked/unsupported permission is
reported separately, without erasing the saved choice.

Saved sessions are validated against `/api/auth/me` at startup. Expired tokens,
disabled users and changed roles require signing in again. A network outage alone
does not erase a remembered login.

## Browser notifications

1. Deploy all server and mobile-web changes together to Vercel.
2. Sign in as a worker or admin in the intended project.
3. Press “تفعيل إشعارات الطلبات على هذا الجهاز” and allow notifications.
4. Leave the tab or close it. Creating or expediting an order triggers a server
   Web Push request, not a polling timer in the closed tab.

`public/push-sw.js` is exported as `/push-sw.js`. It must be served as JavaScript
over HTTPS, not rewritten to HTML. It shows notifications and reopens the app at
`/`; the saved login selects the appropriate role screen.

VAPID keys are generated once and persisted encrypted in the database using
`SESSION_SECRET`; no private key is sent to the browser. Subscription credentials
are encrypted too. Keep that secret stable across deployments. Rotating it
requires a deliberate notification-key reset and re-enrolling devices, not just
regenerating keys on every server start. Do not log or export encrypted settings
alongside the secret.

Browser/OS restrictions still apply: denied permission, disabled OS notifications,
battery restrictions and force-stopping the browser can prevent delivery. iPhone
web push requires installing the website to the Home Screen on a supported iOS
version. This is not a guarantee of delivery to every powered-off device.

## Android APK notifications

The app uses `expo-notifications`, the `orders-doorbell-v1` Android channel and Expo's Push
service. The APK must be a real standalone build, not Expo Go.

### Worker bell sound

The worker's new-order and urgency notifications use the supplied, unmodified
`assets/sounds/door_bell.mp3` (approximately 30 seconds). The notifications plugin
bundles it into native builds; the channel and server payload both select that
filename. A new channel ID is intentional: Android does not let applications
change the sound of an existing channel in place. The user can still change or
mute notification sounds through Android settings. Existing APKs need an updated
build and notification activation before this custom channel can be used.

On the web worker queue, “تجربة وتفعيل جرس العامل” plays the same file and enables
it for new orders/urgency while this page is open. Playback uses one audio player,
so alerts restart the bell rather than overlap. The stop button and leaving the
worker screen stop playback. The user must activate audio for the page because
browsers restrict automatic audio. A denied/failed playback shows a visible
explanation. The bell selection survives reloads and login; an autoplay restriction
does not switch it off. If playback is blocked, “تشغيل الجرس لهذا المتصفح” retries
audio from a user gesture without making the worker choose activation again.
Closed-site Web Push still uses the browser/OS sound; a service worker cannot
reliably replace that with this MP3.

External prerequisites (not currently configured in this repository):

- A linked Expo project: its UUID in `extra.eas.projectId` or build-time
  `EXPO_PUBLIC_EAS_PROJECT_ID`.
- A Firebase Android app for `com.buffetorders.app`; configure its matching
  `google-services.json` through the native build setup and FCM v1 sending
  credentials through the Expo project's secure credential management.
- Rebuild/install the APK with these native settings, grant notification
  permission, sign in as the worker, then enable notifications inside the app.

The UI reports missing native configuration explicitly; an Expo Go preview or
missing project ID must not be presented as working Android background push.
If Expo push security is enabled, the server also needs `EXPO_ACCESS_TOKEN` in
the deployment's secure environment. Never put that token in app-public config.
Verify delivery on a physical Android device with the app backgrounded and closed.

## Urgent orders

Customers can expedite only their own pending orders in the selected project.
The first request stores `urgent_at` atomically and triggers a worker push.
Repeating or racing the request does not repeatedly notify workers. Delivered or
completed orders cannot be expedited. Worker cards show a red label and urgent
pending orders appear first. The normal list still refreshes every five seconds
and detects a new order even when the previous queue was empty.

The push payload on the lock screen is generic: customer names, notes, passwords
and tokens are not included. Devices are filtered by active user, current worker
assignment, project and login expiry. Delivery failures do not discard the order;
they are recorded without subscription credentials in server logs.

## Verification

`pnpm --filter @workspace/api-server run test:order-features` creates and cleans up
isolated fixture users/projects in the **development** database. It verifies token
durations, session validation, urgency ownership/project/status rules,
idempotency and notification registration restrictions. It does not send live
test pushes. Real delivery still needs browser/device permission and a real APK
with Expo/FCM credentials configured.

The test refuses to seed fixtures unless the target database has an explicit
development-only marker in `push_settings` (id `development-test-target-marker`,
value `development-only-fixtures`). That marker is configured in this workspace's
development database only, never in Neon production. This guards the actual
database target rather than relying solely on a process environment label.
