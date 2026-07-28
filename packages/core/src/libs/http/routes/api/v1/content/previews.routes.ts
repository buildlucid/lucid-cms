import { Hono } from "hono";
import type { LucidHonoGeneric } from "../../../../../../types/hono.js";
import resolvePreview from "../../../../controllers/previews/content/resolve.js";

const contentPreviewsRoutes = new Hono<LucidHonoGeneric>().get(
	"/:token",
	...resolvePreview,
);

export default contentPreviewsRoutes;
