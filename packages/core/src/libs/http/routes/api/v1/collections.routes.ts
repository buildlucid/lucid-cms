import { Hono } from "hono";
import type { LucidHonoGeneric } from "../../../../../types/hono.js";
import getAll from "../../../controllers/collections/get-all.js";
import getSingle from "../../../controllers/collections/get-single.js";

const collectionRoutes = new Hono<LucidHonoGeneric>()
	.get("/", ...getAll)
	.get("/:key", ...getSingle);

export default collectionRoutes;
