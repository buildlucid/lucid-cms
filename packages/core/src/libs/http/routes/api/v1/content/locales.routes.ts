import { Hono } from "hono";
import type { LucidHonoGeneric } from "../../../../../../types/hono.js";
import getAll from "../../../../controllers/locales/content/get-all.js";

const contentLocalesRoutes = new Hono<LucidHonoGeneric>().get("/", ...getAll);

export default contentLocalesRoutes;
