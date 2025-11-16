import { Hono } from "hono";
import getMultiple from "../../../../controllers/media/client/get-multiple.js";
import getSingle from "../../../../controllers/media/client/get-single.js";
import processMedia from "../../../../controllers/media/client/process-media.js";
import type { LucidHonoGeneric } from "../../../../../../types/hono.js";

const clientMediaRoutes = new Hono<LucidHonoGeneric>()
	.get("/", ...getMultiple)
	.get("/:id", ...getSingle)
	.post("/process/:key{.+}", ...processMedia);

export default clientMediaRoutes;
