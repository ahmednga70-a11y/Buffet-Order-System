import type { IncomingMessage, ServerResponse } from "node:http";
import { Router } from "express";
import { HealthCheckResponse } from "@workspace/api-zod/schemas";

const router = Router();

router.get("/healthz", (_req: IncomingMessage, res: ServerResponse) => {
  const data = HealthCheckResponse.parse({ status: "ok" });
  res.statusCode = 200;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.end(JSON.stringify(data));
});

export default router;
