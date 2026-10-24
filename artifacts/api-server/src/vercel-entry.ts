import { pool } from "@workspace/db";
import app from "./app";
import { ensureSystemData } from "./lib/store";

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
  `);
}

export default async function handler(req: any, res: any) {
  if (!initialized) {
    await initDatabaseSchema();
    await ensureSystemData();
    initialized = true;
  }
  return app(req, res);
}
