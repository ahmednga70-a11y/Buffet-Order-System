import { Router } from "express";
import { createUser, getUserByUsername } from "../lib/store.js";
import { signToken } from "../lib/jwt.js";

const router = Router();

router.post("/auth/login", async (req, res) => {
  const { username, password } = req.body as { username: string; password: string };
  if (!username || !password) {
    res.status(400).json({ error: "Username and password are required" });
    return;
  }

  const user = await getUserByUsername(username);
  if (!user || user.password !== password) {
    res.status(401).json({ error: "Invalid username or password" });
    return;
  }

  const token = signToken({ id: user.id, username: user.username, displayName: user.displayName, role: user.role });
  res.json({ token, user: { id: user.id, username: user.username, displayName: user.displayName, role: user.role } });
});

router.post("/auth/register", async (req, res) => {
  const { username, password, displayName, role } = req.body as {
    username: string;
    password: string;
    displayName: string;
    role: "customer" | "worker";
  };

  if (!username || !password || !displayName || !role) {
    res.status(400).json({ error: "All fields are required" });
    return;
  }

  if (await getUserByUsername(username)) {
    res.status(400).json({ error: "Username already exists" });
    return;
  }

  const id = Date.now().toString() + Math.random().toString(36).slice(2, 7);
  const user = { id, username, password, displayName, role };
  await createUser(user);

  const token = signToken({ id: user.id, username: user.username, displayName: user.displayName, role: user.role });
  res.status(201).json({ token, user: { id: user.id, username: user.username, displayName: user.displayName, role: user.role } });
});

export default router;
