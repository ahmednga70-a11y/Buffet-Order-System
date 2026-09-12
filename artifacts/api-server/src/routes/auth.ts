import { Router } from "express";
import { createUser, getProjectById, getUserByUsername, updateUserPassword } from "../lib/store.js";
import { signToken } from "../lib/jwt.js";
import { hashPassword, isPasswordHash, verifyPassword } from "../lib/password.js";

const router = Router();

router.post("/auth/login", async (req, res) => {
  const { username, password, projectId } = req.body as { username: string; password: string; projectId: string };
  if (!username || !password || !projectId) {
    res.status(400).json({ error: "Username, password and project are required" });
    return;
  }

  const [user, project] = await Promise.all([
    getUserByUsername(username.trim().toLowerCase()),
    getProjectById(projectId),
  ]);
  if (!project) {
    res.status(400).json({ error: "Invalid project" });
    return;
  }

  const passwordMatches = user && (
    verifyPassword(password, user.password) ||
    (!isPasswordHash(user.password) && user.password === password)
  );
  if (!user || !passwordMatches) {
    res.status(401).json({ error: "Invalid username or password" });
    return;
  }
  if (!user.isActive) {
    res.status(403).json({ error: "This account is disabled" });
    return;
  }
  if (user.role === "worker" && user.projectId !== project.id) {
    res.status(403).json({ error: "This worker is not assigned to the selected project" });
    return;
  }

  if (!isPasswordHash(user.password)) {
    await updateUserPassword(user.id, hashPassword(password));
  }

  const sessionUser = {
    id: user.id,
    username: user.username,
    displayName: user.displayName,
    role: user.role,
    projectId: project.id,
    projectName: project.name,
  };
  const token = signToken(sessionUser);
  res.json({ token, user: sessionUser });
});

router.post("/auth/register", async (req, res) => {
  const { username, password, displayName, projectId } = req.body as {
    username: string;
    password: string;
    displayName: string;
    role: "customer";
    projectId: string;
  };

  if (!username || !password || !displayName || !projectId) {
    res.status(400).json({ error: "All fields are required" });
    return;
  }
  if (password.length < 8) {
    res.status(400).json({ error: "Password must be at least 8 characters" });
    return;
  }

  const normalizedUsername = username.trim().toLowerCase();
  const project = await getProjectById(projectId);
  if (!project) {
    res.status(400).json({ error: "Invalid project" });
    return;
  }
  if (await getUserByUsername(normalizedUsername)) {
    res.status(400).json({ error: "Username already exists" });
    return;
  }

  const id = Date.now().toString() + Math.random().toString(36).slice(2, 7);
  const user = {
    id,
    username: normalizedUsername,
    password: hashPassword(password),
    displayName: displayName.trim(),
    role: "customer" as const,
    projectId: null,
    isActive: true,
  };
  await createUser(user);

  const sessionUser = {
    id: user.id,
    username: user.username,
    displayName: user.displayName,
    role: user.role,
    projectId: project.id,
    projectName: project.name,
  };
  const token = signToken(sessionUser);
  res.status(201).json({ token, user: sessionUser });
});

export default router;
