import { Hono } from "hono";
import type { LucidHonoGeneric } from "../../../../../../types/hono.js";
import getMultiple from "../../../../controllers/media/content/get-multiple.js";
import getSingle from "../../../../controllers/media/content/get-single.js";
import processMedia from "../../../../controllers/media/content/process-media.js";

const contentMediaRoutes = new Hono<LucidHonoGeneric>()
	.get("/", ...getMultiple)
	.get("/:id", ...getSingle)
	.post("/process/:key{.+}", ...processMedia);

export default contentMediaRoutes;
