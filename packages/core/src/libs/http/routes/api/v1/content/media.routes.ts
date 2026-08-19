import { Hono } from "hono";
import type { LucidHonoGeneric } from "../../../../../../types/hono.js";
import getMultiple from "../../../../controllers/media/content/get-multiple.js";
import getSingle from "../../../../controllers/media/content/get-single.js";
import resolveUrl from "../../../../controllers/media/content/resolve-url.js";

const contentMediaRoutes = new Hono<LucidHonoGeneric>()
	.get("/", ...getMultiple)
	.get("/:id", ...getSingle)
	.post("/resolve/:key{.+}", ...resolveUrl);

export default contentMediaRoutes;
