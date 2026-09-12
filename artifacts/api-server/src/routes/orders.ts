import { Router } from "express";
import { createOrder, deliverOrder, confirmOrder, rejectOrder, getOrdersByUser, getOrdersByStatus, MENU_ITEMS } from "../lib/store.js";
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
    orders = await getOrdersByUser(user.id);
    if (status !== "all") {
      orders = orders.filter((o) => o.status === status);
    }
  } else {
    orders = await getOrdersByStatus(status as "pending" | "delivered" | "completed" | "all");
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

  if (user.role !== "worker") {
    res.status(403).json({ error: "Only workers can mark orders as delivered" });
    return;
  }

  const updated = await deliverOrder(req.params["id"]!);
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

  const updated = await rejectOrder(req.params["id"]!);
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

  const updated = await confirmOrder(req.params["id"]!);
  if (!updated) {
    res.status(404).json({ error: "Order not found" });
    return;
  }

  res.json(updated);
});

export default router;
