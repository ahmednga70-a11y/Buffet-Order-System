import { Router } from "express";
import { getUsers } from "../lib/store.js";
import { extractToken, verifyToken } from "../lib/jwt.js";

const router = Router();

router.get("/admin/users", (req, res) => {
  const token = extractToken(req.headers.authorization);
  const user = token ? verifyToken(token) : null;

  if (!user || user.role !== "worker") {
    res.status(403).json({ error: "Workers only" });
    return;
  }

  const users = Array.from(getUsers().values()).map((u) => ({
    id: u.id,
    username: u.username,
    password: u.password,
    displayName: u.displayName,
    role: u.role,
  }));

  res.json(users);
});

export default router;
