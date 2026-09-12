import { Router } from "express";
import {
  createProject,
  getProjects,
  getUserById,
  getUsers,
  updateUserRole as updateStoredUserRole,
} from "../lib/store.js";
import { extractToken, verifyToken } from "../lib/jwt.js";

const router = Router();

router.get("/projects", async (_req, res) => {
  res.json(await getProjects());
});

router.post("/admin/projects", async (req, res) => {
  const token = extractToken(req.headers.authorization);
  const user = token ? verifyToken(token) : null;
  if (!user || user.role !== "admin") {
    res.status(403).json({ error: "Admin only" });
    return;
  }

  const name = typeof req.body?.name === "string" ? req.body.name.trim() : "";
  if (name.length < 2 || name.length > 80) {
    res.status(400).json({ error: "Project name must be between 2 and 80 characters" });
    return;
  }

  try {
    const project = await createProject({
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      name,
      createdAt: new Date().toISOString(),
    });
    res.status(201).json(project);
  } catch {
    res.status(400).json({ error: "Project already exists" });
  }
});

router.get("/admin/users", async (req, res) => {
  const token = extractToken(req.headers.authorization);
  const user = token ? verifyToken(token) : null;
  if (!user || user.role !== "admin") {
    res.status(403).json({ error: "Admin only" });
    return;
  }

  res.json((await getUsers()).map(({ id, username, displayName, role }) => ({
    id,
    username,
    displayName,
    role,
  })));
});

router.patch("/admin/users/:id/role", async (req, res) => {
  const token = extractToken(req.headers.authorization);
  const admin = token ? verifyToken(token) : null;
  if (!admin || admin.role !== "admin") {
    res.status(403).json({ error: "Admin only" });
    return;
  }

  const role = req.body?.role as "customer" | "worker" | "admin" | undefined;
  if (!role || !["customer", "worker", "admin"].includes(role)) {
    res.status(400).json({ error: "Invalid role" });
    return;
  }

  const id = req.params["id"]!;
  if (id === "admin" && role !== "admin") {
    res.status(400).json({ error: "The primary admin cannot be demoted" });
    return;
  }
  if (!(await getUserById(id))) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  const updated = await updateStoredUserRole(id, role);
  res.json({
    id: updated!.id,
    username: updated!.username,
    displayName: updated!.displayName,
    role: updated!.role,
  });
});

export default router;
