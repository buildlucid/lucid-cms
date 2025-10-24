import { Hono } from "hono";
import type { LucidHonoGeneric } from "../../../../types/hono.js";

const routes = new Hono<LucidHonoGeneric>().get("/:token");

export default routes;
