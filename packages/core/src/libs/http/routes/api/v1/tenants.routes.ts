import { Hono } from "hono";
import type { LucidHonoGeneric } from "../../../../../types/hono.js";
import getAll from "../../../controllers/tenants/get-all.js";

const tenantRoutes = new Hono<LucidHonoGeneric>().get("/", ...getAll);

export default tenantRoutes;
