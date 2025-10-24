import { Hono } from "hono";
import getAll from "../../../../controllers/locales/client/get-all.js";
import type { LucidHonoGeneric } from "../../../../../../types/hono.js";

const clientLocalesRoutes = new Hono<LucidHonoGeneric>().get("/", ...getAll);

export default clientLocalesRoutes;
