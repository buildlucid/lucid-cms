import { Hono } from "hono";
import getSingle from "../../../controllers/collections/get-single.js";
import getAll from "../../../controllers/collections/get-all.js";
import type { LucidHonoGeneric } from "../../../../../types/hono.js";

const collectionRoutes = new Hono<LucidHonoGeneric>()
	.get("/", ...getAll)
	.get("/:key", ...getSingle);

export default collectionRoutes;
