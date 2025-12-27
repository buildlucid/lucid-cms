import { Hono } from "hono";
import type { LucidHonoGeneric } from "../../../../../types/hono.js";
import getMultiple from "../../../controllers/jobs/get-multiple.js";
import getSingle from "../../../controllers/jobs/get-single.js";

const jobsRoutes = new Hono<LucidHonoGeneric>()
	.get("/", ...getMultiple)
	.get("/:id", ...getSingle);

export default jobsRoutes;
