import { Hono } from "hono";
import type { LucidHonoGeneric } from "../../../../../types/hono.js";
import getOverview from "../../../controllers/publishing/get-overview.js";
import publishingRequestRoutes from "./publishing-requests.routes.js";

const publishingRoutes = new Hono<LucidHonoGeneric>()
	.get("/overview", ...getOverview)
	.route("/requests", publishingRequestRoutes);

export default publishingRoutes;
