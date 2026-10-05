import { Hono } from "hono";
import type { LucidHonoGeneric } from "../../../../../types/hono.js";
import getOverview from "../../../controllers/publishing/get-overview.js";

const publishingRoutes = new Hono<LucidHonoGeneric>().get(
	"/overview",
	...getOverview,
);

export default publishingRoutes;
