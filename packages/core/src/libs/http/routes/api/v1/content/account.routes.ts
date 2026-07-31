import { Hono } from "hono";
import type { LucidHonoGeneric } from "../../../../../../types/hono.js";
import get from "../../../../controllers/account/content/get.js";

const contentAccountRoutes = new Hono<LucidHonoGeneric>().get(
	"/account",
	...get,
);

export default contentAccountRoutes;
