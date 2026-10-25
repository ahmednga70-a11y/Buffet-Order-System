import { Router } from "express";
import { getActiveSession } from "../lib/session.js";
import { getPushKeys, registerDevice, unregisterDevice, validateDevice } from "../lib/push.js";
import { RegisterNotificationDeviceBody } from "@workspace/api-zod/schemas";

const router = Router();
router.get("/notifications/config", async (req, res) => {
  const user = await getActiveSession(req);
  if (!user) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const host = req.get("x-forwarded-host") ?? req.get("host");
  if (!host || !/^[a-z0-9.:-]+$/i.test(host)) {
    res.status(400).json({ error: "Invalid application host" }); return;
  }
  const { publicKey } = await getPushKeys(`https://${host}`);
  res.json({ publicKey });
});
router.post("/notifications/devices", async (req, res) => {
  const user = await getActiveSession(req);
  if (!user) {
    res.status(401).json({ error: "Unauthorized" }); return;
  }
  const parsed = RegisterNotificationDeviceBody.safeParse(req.body);
  if (!parsed.success || !validateDevice(parsed.data)) {
    res.status(400).json({ error: "Invalid notification subscription" }); return;
  }
  res.json({ id: await registerDevice(user, parsed.data) });
});
router.delete("/notifications/devices/:id", async (req, res) => {
  const user = await getActiveSession(req);
  if (!user) { res.status(401).json({ error: "Unauthorized" }); return; }
  await unregisterDevice(user.id, req.params.id!);
  res.sendStatus(204);
});
export default router;
