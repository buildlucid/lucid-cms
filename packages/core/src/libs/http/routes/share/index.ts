import { Hono } from "hono";
import type { LucidHonoGeneric } from "../../../../types/hono.js";
import streamMediaController from "../../controllers/share/stream-media.js";
import authorizeStreamController from "../../controllers/share/authorize-stream.js";

const routes = new Hono<LucidHonoGeneric>()
	.get("/:token", ...streamMediaController)
	.post("/:token", ...authorizeStreamController);

export default routes;
