import { Hono } from "hono";
import type { LucidHonoGeneric } from "../../../types/hono.js";
import apiRoutes from "./api/v1/index.js";
import cdnRoutes from "./cdn/index.js";
import shareRoutes from "./share/index.js";

const routes = new Hono<LucidHonoGeneric>()
	.route("/api/v1", apiRoutes)
	.route("/cdn", cdnRoutes)
	.route("/share", shareRoutes);

export default routes;
