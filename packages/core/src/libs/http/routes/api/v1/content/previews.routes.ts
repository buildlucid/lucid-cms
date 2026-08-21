import { Hono } from "hono";
import type { LucidHonoGeneric } from "../../../../../../types/hono.js";
import resolvePreview from "../../../../controllers/previews/content/resolve.js";

const contentPreviewsRoutes = new Hono<LucidHonoGeneric>().post(
	"/",
	...resolvePreview,
);

export default contentPreviewsRoutes;
