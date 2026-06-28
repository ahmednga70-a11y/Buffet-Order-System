import { Router } from "express";
import { MENU_ITEMS } from "../lib/store.js";

const router = Router();

router.get("/menu", (_req, res) => {
  res.json(MENU_ITEMS);
});

export default router;
