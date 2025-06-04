import { Hono } from "hono";
import processMedia from "../../../../controllers/media/client/process-media.js";
import type { LucidHonoGeneric } from "../../../../../../types/hono.js";

const clientMediaRoutes = new Hono<LucidHonoGeneric>().post(
	"/process/:key{.+}",
	...processMedia,
);

export default clientMediaRoutes;
