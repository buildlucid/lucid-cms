import { Hono } from "hono";
import type { LucidHonoGeneric } from "../../../../../types/hono.js";
import getAll from "../../../controllers/locales/get-all.js";
import getSingle from "../../../controllers/locales/get-single.js";

const localeRoutes = new Hono<LucidHonoGeneric>()
	.get("/", ...getAll)
	.get("/:code", ...getSingle);

export default localeRoutes;
