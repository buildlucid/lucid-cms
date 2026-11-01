import { Hono } from "hono";
import constants from "../../../constants/constants.js";
import type { LucidHonoGeneric } from "../../../types/hono.js";
import healthController from "../controllers/health/index.js";
import contentRoutes from "./api/v1/content/index.js";
import cdnRoutes from "./cdn/index.js";

const { api, cdn } = constants.paths;

/** Routes for content deployments: health checks, content API and media. */
const contentRoleRoutes = new Hono<LucidHonoGeneric>()
	.get(`${api}/health`, ...healthController)
	.route(`${api}/v1/content`, contentRoutes)
	.route(cdn, cdnRoutes);

export default contentRoleRoutes;
