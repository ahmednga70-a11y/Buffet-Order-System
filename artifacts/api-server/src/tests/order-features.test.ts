import { after, before, test } from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { createECDH, randomBytes, randomUUID } from "node:crypto";
import { pool } from "@workspace/db";
import app from "../app.js";
import { hashPassword } from "../lib/password.js";
import { validateDevice } from "../lib/push.js";
import webpush from "web-push";

const suffix = randomUUID();
const projectA = `feature-test-a-${suffix}`;
const projectB = `feature-test-b-${suffix}`;
const password = "Test-only-password-472!";
const names = ["customer", "other", "worker"] as const;
const ids = Object.fromEntries(names.map((name) => [name, `${name}-${suffix}`])) as Record<typeof names[number], string>;
const tokens: Record<string, string> = {};
const server = createServer(app);
let base = "";
let orderId = "";
let deviceId = "";
let fixtureDatabaseVerified = false;

async function request(path: string, token?: string, method = "GET", body?: unknown) {
  return fetch(`${base}/api${path}`, {
    method,
    headers: { "Content-Type": "application/json", "x-forwarded-host": process.env.REPLIT_DEV_DOMAIN ?? "test.example.com",
      ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
}
async function login(name: typeof names[number], projectId = projectA, rememberMe = false) {
  const response = await request("/auth/login", undefined, "POST", { username: ids[name], password, projectId, rememberMe });
  assert.equal(response.status, 200);
  const auth = await response.json() as { token: string; user: { role: string } };
  return auth.token;
}
before(async () => {
  const marker = await pool.query("SELECT id FROM push_settings WHERE id=$1 AND encrypted_data=$2",
    ["development-test-target-marker", "development-only-fixtures"]);
  if (process.env.VERCEL || marker.rowCount !== 1) throw new Error("Refusing fixtures: database has not been explicitly marked as development");
  fixtureDatabaseVerified = true;
  await pool.query("INSERT INTO projects(id,name) VALUES($1,$2),($3,$4)", [projectA, projectA, projectB, projectB]);
  for (const name of names) {
    await pool.query(
      "INSERT INTO users(id,username,password,display_name,role,project_id,is_active) VALUES($1,$1,$2,$3,$4,$5,true)",
      [ids[name], hashPassword(password), `Test ${name}`, name === "worker" ? "worker" : "customer", name === "worker" ? projectA : null],
    );
  }
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("No test server address");
  base = `http://127.0.0.1:${address.port}`;
  for (const name of names) tokens[name] = await login(name);
});
after(async () => {
  await new Promise<void>((resolve) => server.close(() => resolve()));
  if (fixtureDatabaseVerified) {
    await pool.query("DELETE FROM orders WHERE project_id=ANY($1::text[])", [[projectA, projectB]]);
    await pool.query("DELETE FROM users WHERE id=ANY($1::text[])", [Object.values(ids)]);
    await pool.query("DELETE FROM projects WHERE id=ANY($1::text[])", [[projectA, projectB]]);
  }
  await pool.end();
});

test("remember-me tokens last 30 days; ordinary tokens remain 7 days; /me returns no password", async () => {
  for (const [remember, days] of [[true, 30], [false, 7]] as const) {
    const token = await login("customer", projectA, remember);
    const payload = JSON.parse(Buffer.from(token.split(".")[1]!, "base64url").toString()) as { exp: number; iat: number };
    assert.equal(payload.exp - payload.iat, days * 86400);
    const response = await request("/auth/me", token);
    assert.equal(response.status, 200);
    const user = await response.json() as Record<string, unknown>;
    assert.equal("password" in user, false);
    assert.equal("exp" in user, false);
  }
  await pool.query("UPDATE users SET is_active=false WHERE id=$1", [ids.other]);
  assert.equal((await request("/auth/me", tokens.other)).status, 401);
  await pool.query("UPDATE users SET is_active=true WHERE id=$1", [ids.other]);
});

test("urgent is persisted, customer-owned, project-scoped and atomic", async () => {
  const menuResponse = await request("/menu");
  const menu = await menuResponse.json() as { id: string }[];
  const created = await request("/orders", tokens.customer, "POST", { menuItemId: menu[0]!.id });
  assert.equal(created.status, 201);
  orderId = ((await created.json()) as { id: string }).id;
  assert.equal((await request(`/orders/${orderId}/urgent`, tokens.other, "PATCH")).status, 404);
  assert.equal((await request(`/orders/${orderId}/urgent`, tokens.worker, "PATCH")).status, 403);
  const otherProject = await login("customer", projectB);
  assert.equal((await request(`/orders/${orderId}/urgent`, otherProject, "PATCH")).status, 404);
  const concurrent = await Promise.all([0, 1].map(() => request(`/orders/${orderId}/urgent`, tokens.customer, "PATCH")));
  assert.ok(concurrent.every((response) => [200, 409].includes(response.status)));
  const repeat = await request(`/orders/${orderId}/urgent`, tokens.customer, "PATCH");
  assert.equal(repeat.status, 200);
  const urgent = await repeat.json() as { urgentAt?: string };
  assert.ok(urgent.urgentAt);
  const again = await request(`/orders/${orderId}/urgent`, tokens.customer, "PATCH");
  assert.equal(((await again.json()) as { urgentAt: string }).urgentAt, urgent.urgentAt);
  const rows = await (await request("/orders?status=pending", tokens.worker)).json() as { id: string; urgentAt?: string }[];
  assert.ok(rows.find((row) => row.id === orderId)?.urgentAt);
  const crossProject = await (await request("/orders?status=all", otherProject)).json() as { id: string }[];
  assert.equal(crossProject.some((row) => row.id === orderId), false);
  assert.equal((await request(`/orders/${orderId}/deliver`, tokens.worker, "PATCH")).status, 200);
  assert.equal((await request(`/orders/${orderId}/urgent`, tokens.customer, "PATCH")).status, 409);
});

test("push configuration is worker-only, stable, encrypted and rejects unsafe endpoints", async () => {
  assert.equal((await request("/notifications/config", tokens.customer)).status, 403);
  const first = await request("/notifications/config", tokens.worker);
  assert.equal(first.status, 200);
  const config = await first.json() as { publicKey: string };
  const second = await (await request("/notifications/config", tokens.worker)).json() as { publicKey: string };
  assert.equal(config.publicKey, second.publicKey);
  const stored = await pool.query("SELECT encrypted_data FROM push_settings WHERE id='vapid'");
  assert.equal((stored.rows[0].encrypted_data as string).includes(config.publicKey), false);
  assert.equal(validateDevice({ platform: "web", endpoint: "https://127.0.0.1/private", auth: "abc", p256dh: "abc" }), false);
  assert.equal((await request("/notifications/devices", tokens.worker, "POST", { platform: "web", endpoint: "http://localhost" })).status, 400);
  // No order is created after this inert fixture subscription is registered.
  const result = await request("/notifications/devices", tokens.worker, "POST", { platform: "expo", token: `ExpoPushToken[test-only-${suffix}]` });
  assert.equal(result.status, 200);
  deviceId = ((await result.json()) as { id: string }).id;
  await request(`/notifications/devices/${deviceId}`, tokens.other, "DELETE");
  assert.equal((await pool.query("SELECT count(*)::int AS n FROM push_devices WHERE id=$1", [deviceId])).rows[0].n, 1);
  assert.equal((await request(`/notifications/devices/${deviceId}`, tokens.worker, "DELETE")).status, 204);
  assert.equal((await pool.query("SELECT count(*)::int AS n FROM push_devices WHERE id=$1", [deviceId])).rows[0].n, 0);

  const ecdh = createECDH("prime256v1");
  const p256dh = ecdh.generateKeys().toString("base64url");
  const originalSend = webpush.sendNotification;
  const originalFetch = globalThis.fetch;
  const expoMessages: { sound: string; channelId: string }[] = [];
  globalThis.fetch = async (input, init) => {
    if (String(input) === "https://exp.host/--/api/v2/push/send") {
      expoMessages.push(JSON.parse(String(init?.body)));
      return new Response(JSON.stringify({ data: { status: "ok" } }), { status: 200 });
    }
    return originalFetch(input, init);
  };
  const sent: string[] = [];
  webpush.sendNotification = async (_subscription, payload) => {
    sent.push(String(payload));
    return { statusCode: 201, body: "", headers: {} };
  };
  try {
    const registered = await request("/notifications/devices", tokens.worker, "POST", {
      platform: "web", endpoint: `https://fcm.googleapis.com/fcm/send/test-${suffix}`,
      p256dh, auth: randomBytes(16).toString("base64url"),
    });
    assert.equal(registered.status, 200);
    assert.equal((await request("/notifications/devices", tokens.worker, "POST", {
      platform: "expo", token: `ExpoPushToken[mocked-sound-${suffix}]`,
    })).status, 200);
    const menu = await (await request("/menu")).json() as { id: string }[];
    const crossToken = await login("customer", projectB);
    await request("/orders", crossToken, "POST", { menuItemId: menu[0]!.id });
    assert.equal(sent.length, 0, "another project's worker must not be notified");
    const created = await request("/orders", tokens.customer, "POST", { menuItemId: menu[0]!.id, notes: "private-test-note" });
    const order = await created.json() as { id: string };
    assert.equal(sent.length, 1, "the worker is notified even if its screen is closed");
    await Promise.all([0, 1].map(() => request(`/orders/${order.id}/urgent`, tokens.customer, "PATCH")));
    await request(`/orders/${order.id}/urgent`, tokens.customer, "PATCH");
    assert.equal(sent.length, 2, "urgency sends exactly once even with concurrent taps");
    assert.equal(sent.some((payload) => payload.includes("private-test-note") || payload.includes("Test customer")), false);
    assert.equal(expoMessages.length, 2, "both new-order and urgent events include the native bell");
    for (const message of expoMessages) {
      assert.equal(message.sound, "door_bell.mp3");
      assert.equal(message.channelId, "orders-doorbell-v1");
    }
  } finally {
    webpush.sendNotification = originalSend;
    globalThis.fetch = originalFetch;
  }
});
