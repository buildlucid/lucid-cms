import { Hono } from "hono";
import getSingle from "../../../controllers/jobs/get-single.js";
import getMultiple from "../../../controllers/jobs/get-multiple.js";
import type { LucidHonoGeneric } from "../../../../../types/hono.js";

const jobsRoutes = new Hono<LucidHonoGeneric>()
	.get("/", ...getMultiple)
	.get("/:id", ...getSingle);

export default jobsRoutes;
