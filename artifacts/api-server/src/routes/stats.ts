import { Router } from "express";
import { getDailyStats } from "../lib/store.js";
import { extractToken, verifyToken } from "../lib/jwt.js";

const router = Router();

router.get("/stats/daily", (req, res) => {
  const token = extractToken(req.headers.authorization);
  const user = token ? verifyToken(token) : null;

  if (!user) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const dateParam = (req.query["date"] as string) || new Date().toISOString().slice(0, 10);
  const stats = getDailyStats(dateParam);
  res.json(stats);
});

export default router;
