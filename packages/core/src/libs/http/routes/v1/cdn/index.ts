import { Hono } from "hono";
import streamSingleController from "../../../controllers/cdn/stream-single.js";
import type { LucidHonoGeneric } from "../../../../../types/hono.js";

const routes = new Hono<LucidHonoGeneric>().get(
	"/:key{.+}",
	...streamSingleController,
);

export default routes;
