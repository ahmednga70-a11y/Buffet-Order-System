import app from "./app";
import { ensureSystemData } from "./lib/store";

let initialized = false;

export default async function handler(req: any, res: any) {
  if (!initialized) {
    await ensureSystemData();
    initialized = true;
  }
  return app(req, res);
}
