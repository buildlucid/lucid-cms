import { Hono } from "hono";
import type { LucidHonoGeneric } from "../../../../../types/hono.js";
import getOverview from "../../../controllers/review/get-overview.js";

const reviewRoutes = new Hono<LucidHonoGeneric>().get(
	"/overview",
	...getOverview,
);

export default reviewRoutes;
