import { Router, type IRouter } from "express";
import healthRouter from "./health.js";
import authRouter from "./auth.js";
import ordersRouter from "./orders.js";
import statsRouter from "./stats.js";
import menuRouter from "./menu.js";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(ordersRouter);
router.use(statsRouter);
router.use(menuRouter);

export default router;
