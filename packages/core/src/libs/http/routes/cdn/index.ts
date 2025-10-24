import { Hono } from "hono";
import type { LucidHonoGeneric } from "../../../../types/hono.js";
import streamSingleController from "../../controllers/cdn/stream-single.js";

const routes = new Hono<LucidHonoGeneric>().get(
	"/:key{.+}",
	...streamSingleController,
);

export default routes;
