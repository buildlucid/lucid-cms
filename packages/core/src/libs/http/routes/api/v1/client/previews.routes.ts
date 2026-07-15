import { Hono } from "hono";
import type { LucidHonoGeneric } from "../../../../../../types/hono.js";
import resolvePreview from "../../../../controllers/previews/client/resolve.js";

const clientPreviewsRoutes = new Hono<LucidHonoGeneric>().get(
	"/:token",
	...resolvePreview,
);

export default clientPreviewsRoutes;
