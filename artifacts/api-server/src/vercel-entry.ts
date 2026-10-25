import { pool } from "@workspace/db";
import type { IncomingMessage, ServerResponse } from "node:http";
import app from "./app.js";
import { ensureSystemData } from "./lib/store.js";

let initialized = false;

async function initDatabaseSchema() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS projects (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      username TEXT NOT NULL UNIQUE,
      password TEXT NOT NULL,
      display_name TEXT NOT NULL,
      role TEXT NOT NULL,
      project_id TEXT,
      is_active BOOLEAN NOT NULL DEFAULT TRUE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS orders (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id),
      user_display_name TEXT NOT NULL,
      project_id TEXT NOT NULL DEFAULT 'southern-extension',
      menu_item_id TEXT NOT NULL,
      menu_item_name TEXT NOT NULL,
      menu_item_name_ar TEXT NOT NULL,
      notes TEXT,
      status TEXT NOT NULL DEFAULT 'pending',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      delivered_at TIMESTAMPTZ,
      completed_at TIMESTAMPTZ
    );
    CREATE INDEX IF NOT EXISTS orders_user_id_idx ON orders(user_id);
    CREATE INDEX IF NOT EXISTS orders_project_id_idx ON orders(project_id);
    CREATE INDEX IF NOT EXISTS orders_status_idx ON orders(status);
    CREATE INDEX IF NOT EXISTS orders_created_at_idx ON orders(created_at);
    ALTER TABLE orders ADD COLUMN IF NOT EXISTS urgent_at TIMESTAMPTZ;
    ALTER TABLE orders ADD COLUMN IF NOT EXISTS ready_at TIMESTAMPTZ;
    CREATE TABLE IF NOT EXISTS push_settings (
      id TEXT PRIMARY KEY, encrypted_data TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS push_devices (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      platform TEXT NOT NULL, encrypted_data TEXT NOT NULL,
      expires_at TIMESTAMPTZ NOT NULL
    );
    CREATE INDEX IF NOT EXISTS push_devices_project_idx ON push_devices(project_id);
  `);
}

export default async function handler(req: IncomingMessage, res: ServerResponse): Promise<void> {
  if (!initialized) {
    await initDatabaseSchema();
    await ensureSystemData();
    initialized = true;
  }
  app(req, res);
}
