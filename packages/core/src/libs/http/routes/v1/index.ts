import { Hono } from "hono";
import type { LucidHonoContext } from "../../../../types/hono.js";
import apiRoutes from "./api/index.js";
import cdnRoutes from "./cdn/index.js";

const routes = new Hono<LucidHonoContext>()
	.route("/api/v1", apiRoutes)
	.route("/cdn/v1", cdnRoutes);

export default routes;
