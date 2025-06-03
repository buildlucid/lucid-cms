import { Hono } from "hono";
import apiRoutes from "./api/index.js";
import cdnRoutes from "./cdn/index.js";
import type { LucidHonoGeneric } from "../../../../types/hono.js";

const routes = new Hono<LucidHonoGeneric>()
	.route("/api/v1", apiRoutes)
	.route("/cdn/v1", cdnRoutes);

export default routes;
