import { Router } from "express";
import { getDailyStats, getUserById } from "../lib/store.js";
import { extractToken, verifyToken } from "../lib/jwt.js";

const router = Router();

router.get("/stats/daily", async (req, res) => {
  const token = extractToken(req.headers.authorization);
  const user = token ? verifyToken(token) : null;

  if (!user) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const stored = await getUserById(user.id);
  if (!stored?.isActive || (user.role === "worker" && stored.projectId !== user.projectId)) {
    res.status(403).json({ error: "Account is disabled or no longer assigned to this project" });
    return;
  }

  const dateParam = (req.query["date"] as string) || new Date().toISOString().slice(0, 10);
  const stats = await getDailyStats(dateParam, user.projectId);
  res.json(stats);
});

export default router;
