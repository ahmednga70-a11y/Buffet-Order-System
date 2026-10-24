import assert from "node:assert/strict";
import test from "node:test";
import { createNotificationPreferences } from "../utils/notificationPreferences.ts";

function memoryStorage() {
  const data = new Map();
  return {
    data,
    async getItem(key) { return data.get(key) ?? null; },
    async setItem(key, value) { data.set(key, value); },
  };
}

test("push and bell selections survive reopening, independently of active device registration", async () => {
  const storage = memoryStorage();
  const first = createNotificationPreferences(storage);
  await first.write("worker-a", "project-a", "push", true);
  await first.write("worker-a", "project-a", "bell", true);
  // Device IDs/tokens are kept separately and can be removed safely on logout.
  const reopened = createNotificationPreferences(storage);
  assert.equal(await reopened.read("worker-a", "project-a", "push"), true);
  assert.equal(await reopened.read("worker-a", "project-a", "bell"), true);
  assert.deepEqual([...storage.data.values()], ["on", "on"]);
});

test("explicit off survives reopening and does not switch off the other notification kind", async () => {
  const storage = memoryStorage();
  const preferences = createNotificationPreferences(storage);
  await preferences.write("worker-a", "project-a", "push", true);
  await preferences.write("worker-a", "project-a", "bell", true);
  await preferences.write("worker-a", "project-a", "push", false);
  const reopened = createNotificationPreferences(storage);
  assert.equal(await reopened.read("worker-a", "project-a", "push"), false);
  assert.equal(await reopened.read("worker-a", "project-a", "bell"), true);
});

test("a different account or project never inherits enabled preferences", async () => {
  const preferences = createNotificationPreferences(memoryStorage());
  await preferences.write("worker-a", "project-a", "push", true);
  assert.equal(await preferences.read("worker-b", "project-a", "push"), null);
  assert.equal(await preferences.read("worker-a", "project-b", "push"), null);
  // Structured keys cannot collide through separators in account/project IDs.
  await preferences.write("a:b", "c", "bell", true);
  assert.equal(await preferences.read("a", "b:c", "bell"), null);
});

test("failed storage writes are surfaced, not reported as remembered activation", async () => {
  const preferences = createNotificationPreferences({
    async getItem() { throw new Error("storage unavailable"); },
    async setItem() { throw new Error("storage unavailable"); },
  });
  await assert.rejects(preferences.read("worker", "project", "push"), /storage unavailable/);
  await assert.rejects(preferences.write("worker", "project", "bell", true), /storage unavailable/);
});
