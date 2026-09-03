import { Hono } from "hono";
import type { LucidHonoGeneric } from "../../../../../types/hono.js";
import getMultiple from "../../../controllers/jobs/get-multiple.js";
import getSchedules from "../../../controllers/jobs/get-schedules.js";
import getSingle from "../../../controllers/jobs/get-single.js";
import setScheduleState from "../../../controllers/jobs/set-schedule-state.js";
import triggerSchedule from "../../../controllers/jobs/trigger-schedule.js";

const jobsRoutes = new Hono<LucidHonoGeneric>()
	.get("/", ...getMultiple)
	.get("/schedules", ...getSchedules)
	.patch("/schedules/state", ...setScheduleState)
	.post("/schedules/trigger", ...triggerSchedule)
	.get("/:id", ...getSingle);

export default jobsRoutes;
