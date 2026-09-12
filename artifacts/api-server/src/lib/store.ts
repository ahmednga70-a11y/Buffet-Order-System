import { db, ordersTable, usersTable } from "@workspace/db";
import { and, desc, eq, gte, lt } from "drizzle-orm";

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

function toUser(row: typeof usersTable.$inferSelect): User {
  return { id: row.id, username: row.username, password: row.password, displayName: row.displayName, role: row.role };
}

function toOrder(row: typeof ordersTable.$inferSelect): Order {
  return {
    ...row,
    notes: row.notes ?? undefined,
    createdAt: row.createdAt.toISOString(),
    deliveredAt: row.deliveredAt?.toISOString(),
    completedAt: row.completedAt?.toISOString(),
  };
}

export async function getUsers(): Promise<User[]> {
  return (await db.select().from(usersTable)).map(toUser);
}

export async function getUserByUsername(username: string): Promise<User | undefined> {
  const [row] = await db.select().from(usersTable).where(eq(usersTable.username, username)).limit(1);
  return row ? toUser(row) : undefined;
}

export async function createUser(user: User): Promise<User> {
  const [row] = await db.insert(usersTable).values(user).returning();
  return toUser(row!);
}

export async function createOrder(order: Order): Promise<Order> {
  const [row] = await db.insert(ordersTable).values({
    ...order,
    createdAt: new Date(order.createdAt),
    deliveredAt: order.deliveredAt ? new Date(order.deliveredAt) : null,
    completedAt: order.completedAt ? new Date(order.completedAt) : null,
  }).returning();
  return toOrder(row!);
}

async function updateOrder(id: string, values: Partial<typeof ordersTable.$inferInsert>): Promise<Order | undefined> {
  const [row] = await db.update(ordersTable).set(values).where(eq(ordersTable.id, id)).returning();
  return row ? toOrder(row) : undefined;
}

export function deliverOrder(id: string) {
  return updateOrder(id, { status: "delivered", deliveredAt: new Date() });
}

export function confirmOrder(id: string) {
  return updateOrder(id, { status: "completed", completedAt: new Date() });
}

export function rejectOrder(id: string) {
  return updateOrder(id, { status: "pending", deliveredAt: null });
}

export async function getOrdersByUser(userId: string): Promise<Order[]> {
  return (await db.select().from(ordersTable).where(eq(ordersTable.userId, userId)).orderBy(desc(ordersTable.createdAt))).map(toOrder);
}

export async function getOrdersByStatus(status: "pending" | "delivered" | "completed" | "all"): Promise<Order[]> {
  const rows = status === "all"
    ? await db.select().from(ordersTable).orderBy(desc(ordersTable.createdAt))
    : await db.select().from(ordersTable).where(eq(ordersTable.status, status)).orderBy(desc(ordersTable.createdAt));
  return rows.map(toOrder);
}

export async function getDailyStats(date: string) {
  const start = new Date(`${date}T00:00:00.000Z`);
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 1);
  const dayOrders = (await db.select().from(ordersTable)
    .where(and(gte(ordersTable.createdAt, start), lt(ordersTable.createdAt, end))))
    .map(toOrder);

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
