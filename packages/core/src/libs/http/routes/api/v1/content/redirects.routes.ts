import { Hono } from "hono";
import type { LucidHonoGeneric } from "../../../../../../types/hono.js";
import resolve from "../../../../controllers/redirects/content/resolve.js";

const contentRedirectsRoutes = new Hono<LucidHonoGeneric>().get(
	"/resolve",
	...resolve,
);

export default contentRedirectsRoutes;
