import { Router } from "express";
import healthRouter from "./health.js";
import authRouter from "./auth.js";
import ordersRouter from "./orders.js";
import statsRouter from "./stats.js";
import menuRouter from "./menu.js";
import adminRouter from "./admin.js";
import notificationsRouter from "./notifications.js";

const router = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(ordersRouter);
router.use(statsRouter);
router.use(menuRouter);
router.use(adminRouter);
router.use(notificationsRouter);

export default router;
