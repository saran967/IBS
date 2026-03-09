import express from "express";

import {
  assignDailyTarget,
  getTargets,
  getTargetByDate,
} from "../../controller/Target/agentTargetController.js";

const router = express.Router();

// Admin assign target for a date (or today if date absent)

router.post("/assign", assignDailyTarget);

router.get("/", getTargets);

router.get("/:date", getTargetByDate);

export default router;
