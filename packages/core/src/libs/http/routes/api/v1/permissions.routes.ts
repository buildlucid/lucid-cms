import { Hono } from "hono";
import type { LucidHonoGeneric } from "../../../../../types/hono.js";
import getAll from "../../../controllers/permissions/get-all.js";

const permissionRoutes = new Hono<LucidHonoGeneric>().get("/", ...getAll);

export default permissionRoutes;
