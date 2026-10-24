import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";
import { pool } from "@workspace/db";
import webpush from "web-push";
import { logger } from "./logger.js";
import type { JwtPayload } from "./jwt.js";

type Device = { platform: "web" | "expo"; endpoint?: string; p256dh?: string; auth?: string; token?: string };
type KeyPair = { publicKey: string; privateKey: string; subject: string };

function encryptionKey() {
  const secret = process.env.SESSION_SECRET;
  if (!secret) throw new Error("SESSION_SECRET is required for notification storage");
  return createHash("sha256").update(secret).digest();
}
function encrypt(value: unknown) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", encryptionKey(), iv);
  const data = Buffer.concat([cipher.update(JSON.stringify(value)), cipher.final()]);
  return [iv, cipher.getAuthTag(), data].map((b) => b.toString("base64url")).join(".");
}
function decrypt<T>(value: string): T {
  const [iv, tag, data] = value.split(".").map((s) => Buffer.from(s, "base64url"));
  if (!iv || !tag || !data) throw new Error("Invalid encrypted notification settings");
  const decipher = createDecipheriv("aes-256-gcm", encryptionKey(), iv);
  decipher.setAuthTag(tag);
  return JSON.parse(Buffer.concat([decipher.update(data), decipher.final()]).toString()) as T;
}

export async function getPushKeys(origin?: string): Promise<KeyPair> {
  let result = await pool.query("SELECT encrypted_data FROM push_settings WHERE id = 'vapid'");
  if (!result.rows[0]) {
    if (!origin) throw new Error("Push notifications have not been configured");
    const pair = { ...webpush.generateVAPIDKeys(), subject: new URL(origin).origin };
    await pool.query("INSERT INTO push_settings(id, encrypted_data) VALUES ('vapid', $1) ON CONFLICT DO NOTHING", [encrypt(pair)]);
    result = await pool.query("SELECT encrypted_data FROM push_settings WHERE id = 'vapid'");
  }
  return decrypt<KeyPair>(result.rows[0].encrypted_data as string);
}

export function validateDevice(device: Device) {
  if (device.platform === "expo") {
    return typeof device.token === "string" && /^(ExponentPushToken|ExpoPushToken)\[[A-Za-z0-9_-]{10,200}\]$/.test(device.token);
  }
  if (device.platform !== "web" || !device.endpoint || !device.p256dh || !device.auth) return false;
  try {
    const url = new URL(device.endpoint);
    const host = url.hostname;
    const trusted = ["fcm.googleapis.com", "android.googleapis.com", "updates.push.services.mozilla.com", "web.push.apple.com"].includes(host)
      || host.endsWith(".push.apple.com") || host.endsWith(".notify.windows.com");
    return trusted && url.protocol === "https:" && !url.username && !url.password && (!url.port || url.port === "443")
      && device.endpoint.length < 4096 && /^[\w-]+$/.test(device.p256dh) && /^[\w-]+$/.test(device.auth)
      && Buffer.from(device.p256dh, "base64url").length === 65 && Buffer.from(device.auth, "base64url").length === 16;
  } catch { return false; }
}

export async function registerDevice(user: JwtPayload, device: Device) {
  const id = createHash("sha256").update(device.endpoint ?? device.token!).digest("hex");
  // Bind to this login's expiry; an old device cannot receive notifications forever.
  const expiresAt = new Date((user.exp ?? 0) * 1000);
  await pool.query(
    `INSERT INTO push_devices(id,user_id,project_id,platform,encrypted_data,expires_at)
     VALUES($1,$2,$3,$4,$5,$6) ON CONFLICT(id) DO UPDATE SET user_id=$2,project_id=$3,platform=$4,encrypted_data=$5,expires_at=$6`,
    [id, user.id, user.projectId, device.platform, encrypt(device), expiresAt],
  );
  return id;
}
export async function unregisterDevice(userId: string, id: string) {
  await pool.query("DELETE FROM push_devices WHERE id=$1 AND user_id=$2", [id, userId]);
}

export async function notifyWorkers(projectId: string, orderId: string, urgent = false) {
  try {
    const result = await pool.query(
      `SELECT d.id,d.encrypted_data FROM push_devices d JOIN users u ON u.id=d.user_id
       WHERE d.project_id=$1 AND d.expires_at>NOW() AND u.is_active=true
       AND (u.role='admin' OR (u.role='worker' AND u.project_id=d.project_id))`,
      [projectId],
    );
    if (!result.rows.length) return;
    const title = urgent ? "طلب مستعجل" : "طلب جديد";
    // Keep lock-screen payloads generic: no customer name, notes or credentials.
    const body = urgent ? "أحد العملاء استعجل طلبه — راجع الطلبات المنتظرة" : "فيه طلب جديد في مشروعك — افتح الطلبات";
    const keys = result.rows.some((row) => decrypt<Device>(row.encrypted_data as string).platform === "web")
      ? await getPushKeys() : null;
    for (let start = 0; start < result.rows.length; start += 8) {
      await Promise.all(result.rows.slice(start, start + 8).map(async (row) => {
        try {
          const device = decrypt<Device>(row.encrypted_data as string);
          if (device.platform === "web" && keys) {
            await webpush.sendNotification({
              endpoint: device.endpoint!, keys: { p256dh: device.p256dh!, auth: device.auth! },
            }, JSON.stringify({ title, body, tag: `${urgent ? "urgent" : "order"}-${orderId}`, url: "/" }), {
              vapidDetails: keys, TTL: 3600, urgency: "high", timeout: 6000,
            });
          } else if (device.platform === "expo") {
            const response = await fetch("https://exp.host/--/api/v2/push/send", {
              method: "POST", headers: {
                "Content-Type": "application/json",
                ...(process.env.EXPO_ACCESS_TOKEN ? { Authorization: `Bearer ${process.env.EXPO_ACCESS_TOKEN}` } : {}),
              },
              body: JSON.stringify({ to: device.token, title, body, sound: "default", channelId: "orders", priority: "high", data: { orderId, urgent } }),
              signal: AbortSignal.timeout(6000),
            });
            const ticket = await response.json() as { data?: { status?: string; details?: { error?: string } } };
            if (ticket.data?.details?.error === "DeviceNotRegistered") {
              await pool.query("DELETE FROM push_devices WHERE id=$1", [row.id]);
            } else if (!response.ok || ticket.data?.status !== "ok") {
              logger.warn({ platform: "expo" }, "Push provider rejected a notification; check Expo/FCM configuration");
            }
          }
        } catch (error: unknown) {
          const status = (error as { statusCode?: number }).statusCode;
          if (status === 404 || status === 410) {
            await pool.query("DELETE FROM push_devices WHERE id=$1", [row.id]);
          } else logger.warn({ status }, "Notification delivery failed");
        }
      }));
    }
  } catch {
    // Orders are still saved if a push provider is unavailable.
    logger.error("Unable to send worker notifications; check push configuration and database");
  }
}
