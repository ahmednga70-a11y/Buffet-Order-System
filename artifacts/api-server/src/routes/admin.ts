import { Router } from "express";
import {
  createProject,
  getProjects,
  getProjectById,
  getUserById,
  getUserByUsername,
  getUsers,
  createUser,
  updateWorker as updateStoredWorker,
  updateUserRole as updateStoredUserRole,
} from "../lib/store.js";
import { extractToken, verifyToken } from "../lib/jwt.js";
import { hashPassword } from "../lib/password.js";

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

  const result = await Promise.all((await getUsers()).map(async ({
    id, username, displayName, role, projectId, isActive,
  }) => ({
    id,
    username,
    displayName,
    role,
    projectId,
    projectName: projectId ? (await getProjectById(projectId))?.name ?? null : null,
    isActive,
  })));
  res.json(result);
});

router.patch("/admin/users/:id/role", async (req, res) => {
  const token = extractToken(req.headers.authorization);
  const admin = token ? verifyToken(token) : null;
  if (!admin || admin.role !== "admin") {
    res.status(403).json({ error: "Admin only" });
    return;
  }

  const role = req.body?.role as "customer" | "admin" | undefined;
  if (!role || !["customer", "admin"].includes(role)) {
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
    projectId: updated!.projectId,
    projectName: null,
    isActive: updated!.isActive,
  });
});

router.post("/admin/workers", async (req, res) => {
  const token = extractToken(req.headers.authorization);
  const admin = token ? verifyToken(token) : null;
  if (!admin || admin.role !== "admin") {
    res.status(403).json({ error: "Admin only" });
    return;
  }

  const username = typeof req.body?.username === "string" ? req.body.username.trim().toLowerCase() : "";
  const displayName = typeof req.body?.displayName === "string" ? req.body.displayName.trim() : "";
  const password = typeof req.body?.password === "string" ? req.body.password : "";
  const projectId = typeof req.body?.projectId === "string" ? req.body.projectId : "";
  const project = await getProjectById(projectId);
  if (!username || !displayName || password.length < 8 || !project) {
    res.status(400).json({ error: "Valid username, name, project and 8-character password are required" });
    return;
  }
  if (await getUserByUsername(username)) {
    res.status(400).json({ error: "Username already exists" });
    return;
  }

  const worker = await createUser({
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    username,
    displayName,
    password: hashPassword(password),
    role: "worker",
    projectId,
    isActive: true,
  });
  res.status(201).json({
    id: worker.id,
    username: worker.username,
    displayName: worker.displayName,
    role: worker.role,
    projectId,
    projectName: project.name,
    isActive: true,
  });
});

router.patch("/admin/workers/:id", async (req, res) => {
  const token = extractToken(req.headers.authorization);
  const admin = token ? verifyToken(token) : null;
  if (!admin || admin.role !== "admin") {
    res.status(403).json({ error: "Admin only" });
    return;
  }

  const worker = await getUserById(req.params["id"]!);
  if (!worker || worker.role !== "worker") {
    res.status(404).json({ error: "Worker not found" });
    return;
  }

  const changes: Parameters<typeof updateStoredWorker>[1] = {};
  if (typeof req.body?.displayName === "string") {
    const name = req.body.displayName.trim();
    if (!name) {
      res.status(400).json({ error: "Display name is required" });
      return;
    }
    changes.displayName = name;
  }
  if (typeof req.body?.password === "string") {
    if (req.body.password.length < 8) {
      res.status(400).json({ error: "Password must be at least 8 characters" });
      return;
    }
    changes.password = hashPassword(req.body.password);
  }
  if (typeof req.body?.isActive === "boolean") changes.isActive = req.body.isActive;
  if (typeof req.body?.projectId === "string") {
    if (!(await getProjectById(req.body.projectId))) {
      res.status(400).json({ error: "Invalid project" });
      return;
    }
    changes.projectId = req.body.projectId;
  }

  if (!Object.keys(changes).length) {
    res.status(400).json({ error: "No changes provided" });
    return;
  }
  const updated = await updateStoredWorker(worker.id, changes);
  const project = updated!.projectId ? await getProjectById(updated!.projectId) : undefined;
  res.json({
    id: updated!.id,
    username: updated!.username,
    displayName: updated!.displayName,
    role: updated!.role,
    projectId: updated!.projectId,
    projectName: project?.name ?? null,
    isActive: updated!.isActive,
  });
});

export default router;
