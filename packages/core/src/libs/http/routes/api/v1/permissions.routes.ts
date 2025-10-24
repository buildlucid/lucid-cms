import { Hono } from "hono";
import getAll from "../../../controllers/permissions/get-all.js";
import type { LucidHonoGeneric } from "../../../../../types/hono.js";

const permissionRoutes = new Hono<LucidHonoGeneric>().get("/", ...getAll);

export default permissionRoutes;
