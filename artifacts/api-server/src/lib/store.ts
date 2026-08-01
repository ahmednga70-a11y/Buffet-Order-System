export interface User {
  id: string;
  username: string;
  password: string;
  displayName: string;
  role: "customer" | "worker";
}

export interface Order {
  id: string;
  userId: string;
  userDisplayName: string;
  menuItemId: string;
  menuItemName: string;
  menuItemNameAr: string;
  notes?: string;
  status: "pending" | "delivered" | "completed";
  createdAt: string;
  deliveredAt?: string;
  completedAt?: string;
}

export interface MenuItem {
  id: string;
  name: string;
  nameAr: string;
  category: "hot" | "cold" | "juice" | "other";
  icon: string;
}

export const MENU_ITEMS: MenuItem[] = [
  { id: "tea", name: "Tea", nameAr: "شاي", category: "hot", icon: "coffee" },
  { id: "coffee", name: "Coffee", nameAr: "قهوة", category: "hot", icon: "coffee" },
  { id: "turkish-coffee", name: "Turkish Coffee", nameAr: "قهوة تركي", category: "hot", icon: "coffee" },
  { id: "nescafe", name: "Nescafe", nameAr: "نسكافيه", category: "hot", icon: "coffee" },
  { id: "hot-chocolate", name: "Hot Chocolate", nameAr: "كاكاو", category: "hot", icon: "coffee" },
  { id: "water", name: "Water", nameAr: "مياه", category: "cold", icon: "droplet" },
  { id: "pepsi", name: "Pepsi", nameAr: "بيبسي", category: "cold", icon: "droplet" },
  { id: "juice-orange", name: "Orange Juice", nameAr: "عصير برتقال", category: "juice", icon: "droplet" },
  { id: "juice-mango", name: "Mango Juice", nameAr: "عصير مانجو", category: "juice", icon: "droplet" },
  { id: "milk", name: "Milk", nameAr: "لبن", category: "other", icon: "droplet" },
];

const users = new Map<string, User>();
const orders = new Map<string, Order>();

users.set("worker", {
  id: "worker",
  username: "worker",
  password: "worker123",
  displayName: "عامل البوفيه",
  role: "worker",
});

users.set("admin", {
  id: "admin",
  username: "admin",
  password: "admin123",
  displayName: "المدير",
  role: "worker",
});

export function getUsers() { return users; }
export function getOrders() { return orders; }

export function getUserByUsername(username: string): User | undefined {
  return users.get(username);
}

export function createUser(user: User): void {
  users.set(user.username, user);
}

export function createOrder(order: Order): void {
  orders.set(order.id, order);
}

export function completeOrder(id: string): Order | undefined {
  const order = orders.get(id);
  if (!order) return undefined;
  const updated = { ...order, status: "completed" as const, completedAt: new Date().toISOString() };
  orders.set(id, updated);
  return updated;
}

export function getOrdersByUser(userId: string): Order[] {
  return Array.from(orders.values()).filter((o) => o.userId === userId);
}

export function deliverOrder(id: string): Order | undefined {
  const order = orders.get(id);
  if (!order) return undefined;
  const updated = { ...order, status: "delivered" as const, deliveredAt: new Date().toISOString() };
  orders.set(id, updated);
  return updated;
}

export function confirmOrder(id: string): Order | undefined {
  const order = orders.get(id);
  if (!order) return undefined;
  const updated = { ...order, status: "completed" as const, completedAt: new Date().toISOString() };
  orders.set(id, updated);
  return updated;
}

export function rejectOrder(id: string): Order | undefined {
  const order = orders.get(id);
  if (!order) return undefined;
  const updated = { ...order, status: "pending" as const, deliveredAt: undefined };
  orders.set(id, updated);
  return updated;
}

export function getOrdersByStatus(status: "pending" | "delivered" | "completed" | "all"): Order[] {
  const all = Array.from(orders.values());
  if (status === "all") return all;
  return all.filter((o) => o.status === status);
}

export function getDailyStats(date: string) {
  const all = Array.from(orders.values());
  const dayOrders = all.filter((o) => o.createdAt.startsWith(date));

  const byUserMap = new Map<string, { displayName: string; items: Map<string, { name: string; nameAr: string; count: number }> }>();
  const byItemMap = new Map<string, { name: string; nameAr: string; count: number }>();

  for (const order of dayOrders) {
    if (!byUserMap.has(order.userId)) {
      byUserMap.set(order.userId, { displayName: order.userDisplayName, items: new Map() });
    }
    const userData = byUserMap.get(order.userId)!;
    const itemKey = order.menuItemId;
    if (!userData.items.has(itemKey)) {
      userData.items.set(itemKey, { name: order.menuItemName, nameAr: order.menuItemNameAr, count: 0 });
    }
    userData.items.get(itemKey)!.count++;

    if (!byItemMap.has(itemKey)) {
      byItemMap.set(itemKey, { name: order.menuItemName, nameAr: order.menuItemNameAr, count: 0 });
    }
    byItemMap.get(itemKey)!.count++;
  }

  const byUser = Array.from(byUserMap.entries()).map(([userId, data]) => ({
    userId,
    displayName: data.displayName,
    totalOrders: Array.from(data.items.values()).reduce((sum, i) => sum + i.count, 0),
    items: Array.from(data.items.entries()).map(([menuItemId, item]) => ({
      menuItemId,
      menuItemName: item.name,
      menuItemNameAr: item.nameAr,
      count: item.count,
    })),
  }));

  const byItem = Array.from(byItemMap.entries()).map(([menuItemId, item]) => ({
    menuItemId,
    menuItemName: item.name,
    menuItemNameAr: item.nameAr,
    count: item.count,
  }));

  return {
    date,
    totalOrders: dayOrders.length,
    completedOrders: dayOrders.filter((o) => o.status === "completed").length,
    pendingOrders: dayOrders.filter((o) => o.status === "pending").length,
    byUser,
    byItem,
  };
}
