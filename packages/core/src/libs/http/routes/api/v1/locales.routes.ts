import { Hono } from "hono";
import getSingle from "../../../controllers/locales/get-single.js";
import getAll from "../../../controllers/locales/get-all.js";
import type { LucidHonoGeneric } from "../../../../../types/hono.js";

const localeRoutes = new Hono<LucidHonoGeneric>()
	.get("/", ...getAll)
	.get("/:code", ...getSingle);

export default localeRoutes;
