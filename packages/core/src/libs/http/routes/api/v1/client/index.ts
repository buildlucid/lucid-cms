import { Hono } from "hono";
import type { LucidHonoGeneric } from "../../../../../../types/hono.js";
import clientDocumentsRoutes from "./documents.routes.js";
import clientLocalesRoutes from "./locales.routes.js";
import clientMediaRoutes from "./media.routes.js";

const clientRoutes = new Hono<LucidHonoGeneric>()
	.route("/", clientDocumentsRoutes)
	.route("/media", clientMediaRoutes)
	.route("/locales", clientLocalesRoutes);

export default clientRoutes;
