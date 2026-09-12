import { Router } from "express";
import {
  createOrder,
  deliverOrder,
  confirmOrder,
  rejectOrder,
  getOrderById,
  getOrdersByUser,
  getOrdersByStatus,
  MENU_ITEMS,
} from "../lib/store.js";
import { extractToken, verifyToken } from "../lib/jwt.js";

const router = Router();

router.get("/orders", async (req, res) => {
  const token = extractToken(req.headers.authorization);
  const user = token ? verifyToken(token) : null;

  if (!user) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const mine = req.query["mine"] === "true";
  const status = (req.query["status"] as string) || "all";

  let orders;
  if (mine || user.role === "customer") {
    orders = await getOrdersByUser(user.id, user.projectId);
    if (status !== "all") {
      orders = orders.filter((o) => o.status === status);
    }
  } else {
    orders = await getOrdersByStatus(
      status as "pending" | "delivered" | "completed" | "all",
      user.projectId,
    );
  }

  orders.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  res.json(orders);
});

router.post("/orders", async (req, res) => {
  const token = extractToken(req.headers.authorization);
  const user = token ? verifyToken(token) : null;

  if (!user) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  if (user.role !== "customer") {
    res.status(403).json({ error: "Only customers can create orders" });
    return;
  }

  const { menuItemId, notes } = req.body as { menuItemId: string; notes?: string };
  if (!menuItemId) {
    res.status(400).json({ error: "menuItemId is required" });
    return;
  }

  const menuItem = MENU_ITEMS.find((m) => m.id === menuItemId);
  if (!menuItem) {
    res.status(400).json({ error: "Invalid menu item" });
    return;
  }

  const id = Date.now().toString() + Math.random().toString(36).slice(2, 7);
  const order = {
    id,
    userId: user.id,
    userDisplayName: user.displayName,
    projectId: user.projectId,
    menuItemId,
    menuItemName: menuItem.name,
    menuItemNameAr: menuItem.nameAr,
    notes,
    status: "pending" as const,
    createdAt: new Date().toISOString(),
  };

  const created = await createOrder(order);
  res.status(201).json(created);
});

router.patch("/orders/:id/deliver", async (req, res) => {
  const token = extractToken(req.headers.authorization);
  const user = token ? verifyToken(token) : null;

  if (!user) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  if (user.role !== "worker" && user.role !== "admin") {
    res.status(403).json({ error: "Only workers can mark orders as delivered" });
    return;
  }

  const order = await getOrderById(req.params["id"]!);
  if (!order || order.projectId !== user.projectId) {
    res.status(404).json({ error: "Order not found" });
    return;
  }
  if (order.status !== "pending") {
    res.status(409).json({ error: "Only pending orders can be delivered" });
    return;
  }

  const updated = await deliverOrder(order.id);
  if (!updated) {
    res.status(404).json({ error: "Order not found" });
    return;
  }

  res.json(updated);
});

router.patch("/orders/:id/reject", async (req, res) => {
  const token = extractToken(req.headers.authorization);
  const user = token ? verifyToken(token) : null;

  if (!user) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  if (user.role !== "customer") {
    res.status(403).json({ error: "Only customers can reject delivery" });
    return;
  }

  const order = await getOrderById(req.params["id"]!);
  if (!order || order.userId !== user.id || order.projectId !== user.projectId) {
    res.status(404).json({ error: "Order not found" });
    return;
  }
  if (order.status !== "delivered") {
    res.status(409).json({ error: "Only delivered orders can be rejected" });
    return;
  }

  const updated = await rejectOrder(order.id);
  if (!updated) {
    res.status(404).json({ error: "Order not found" });
    return;
  }

  res.json(updated);
});

router.patch("/orders/:id/confirm", async (req, res) => {
  const token = extractToken(req.headers.authorization);
  const user = token ? verifyToken(token) : null;

  if (!user) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  if (user.role !== "customer") {
    res.status(403).json({ error: "Only customers can confirm delivery" });
    return;
  }

  const order = await getOrderById(req.params["id"]!);
  if (!order || order.userId !== user.id || order.projectId !== user.projectId) {
    res.status(404).json({ error: "Order not found" });
    return;
  }
  if (order.status !== "delivered") {
    res.status(409).json({ error: "Only delivered orders can be confirmed" });
    return;
  }

  const updated = await confirmOrder(order.id);
  if (!updated) {
    res.status(404).json({ error: "Order not found" });
    return;
  }

  res.json(updated);
});

export default router;
