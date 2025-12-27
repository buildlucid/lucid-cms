import { Hono } from "hono";
import type { LucidHonoGeneric } from "../../../../../../types/hono.js";
import getAll from "../../../../controllers/locales/client/get-all.js";

const clientLocalesRoutes = new Hono<LucidHonoGeneric>().get("/", ...getAll);

export default clientLocalesRoutes;
