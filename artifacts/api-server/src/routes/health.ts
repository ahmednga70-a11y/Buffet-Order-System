import { Router, type Request, type Response } from "express";
import { HealthCheckResponse } from "@workspace/api-zod/schemas";

const router = Router();

router.get("/healthz", (_req: Request, res: Response<{ status: string }>) => {
  const data = HealthCheckResponse.parse({ status: "ok" });
  res.json(data);
});

export default router;
