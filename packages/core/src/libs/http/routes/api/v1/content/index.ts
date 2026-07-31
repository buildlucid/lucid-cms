import { Hono } from "hono";
import type { LucidHonoGeneric } from "../../../../../../types/hono.js";
import contentAccountRoutes from "./account.routes.js";
import contentDocumentsRoutes from "./documents.routes.js";
import contentLocalesRoutes from "./locales.routes.js";
import contentMediaRoutes from "./media.routes.js";
import contentPreviewsRoutes from "./previews.routes.js";

const contentRoutes = new Hono<LucidHonoGeneric>()
	.route("/", contentAccountRoutes)
	.route("/", contentDocumentsRoutes)
	.route("/media", contentMediaRoutes)
	.route("/locales", contentLocalesRoutes)
	.route("/preview", contentPreviewsRoutes);

export default contentRoutes;
