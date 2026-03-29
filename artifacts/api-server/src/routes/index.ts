import { Router, type IRouter } from "express";
import healthRouter from "./health.js";
import moviesRouter from "./movies.js";
import { getSchedulerStatus } from "../lib/scheduler.js";

const router: IRouter = Router();

router.use(healthRouter);
router.use(moviesRouter);

router.get("/scraper/status", (_req, res) => {
  res.json(getSchedulerStatus());
});

export default router;
