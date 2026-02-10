import { Hono } from "hono";
import constants from "../../../constants/constants.js";
import type { LucidHonoGeneric } from "../../../types/hono.js";
import apiRoutes from "./api/v1/index.js";
import cdnRoutes from "./cdn/index.js";

const routes = new Hono<LucidHonoGeneric>()
	.route(`/${constants.directories.base}/api/v1`, apiRoutes)
	.route(`/${constants.directories.base}/cdn`, cdnRoutes);

export default routes;
