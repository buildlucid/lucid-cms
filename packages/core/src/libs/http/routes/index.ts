import { Hono } from "hono";
import constants from "../../../constants/constants.js";
import type { LucidHonoGeneric } from "../../../types/hono.js";
import healthController from "../controllers/health/index.js";
import apiRoutes from "./api/v1/index.js";
import cdnRoutes from "./cdn/index.js";

const routes = new Hono<LucidHonoGeneric>()
	.get(`/${constants.directories.base}/health`, ...healthController)
	.route(`/${constants.directories.base}/api/v1`, apiRoutes)
	.route(`/${constants.directories.base}/cdn`, cdnRoutes);

export default routes;
