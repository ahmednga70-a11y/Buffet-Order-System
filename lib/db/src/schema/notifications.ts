import { index, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { usersTable } from "./users.js";
import { projectsTable } from "./projects.js";

export const pushSettingsTable = pgTable("push_settings", {
  id: text("id").primaryKey(),
  encryptedData: text("encrypted_data").notNull(),
});

export const pushDevicesTable = pgTable("push_devices", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  projectId: text("project_id").notNull().references(() => projectsTable.id, { onDelete: "cascade" }),
  platform: text("platform").notNull(),
  encryptedData: text("encrypted_data").notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
}, (table) => [index("push_devices_project_idx").on(table.projectId)]);
