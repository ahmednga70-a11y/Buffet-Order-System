import { index, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";

export const ordersTable = pgTable(
  "orders",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").notNull().references(() => usersTable.id),
    userDisplayName: text("user_display_name").notNull(),
    projectId: text("project_id").notNull().default("southern-extension"),
    menuItemId: text("menu_item_id").notNull(),
    menuItemName: text("menu_item_name").notNull(),
    menuItemNameAr: text("menu_item_name_ar").notNull(),
    notes: text("notes"),
    status: text("status").$type<"pending" | "delivered" | "completed">().notNull().default("pending"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    deliveredAt: timestamp("delivered_at", { withTimezone: true }),
    completedAt: timestamp("completed_at", { withTimezone: true }),
  },
  (table) => [
    index("orders_user_id_idx").on(table.userId),
    index("orders_project_id_idx").on(table.projectId),
    index("orders_status_idx").on(table.status),
    index("orders_created_at_idx").on(table.createdAt),
  ],
);

export const insertOrderSchema = createInsertSchema(ordersTable).omit({
  createdAt: true,
  deliveredAt: true,
  completedAt: true,
});
export type InsertOrder = z.infer<typeof insertOrderSchema>;
export type Order = typeof ordersTable.$inferSelect;