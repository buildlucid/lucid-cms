import { Hono } from "hono";
import getSettings from "../../../controllers/settings/get-settings.js";
import type { LucidHonoGeneric } from "../../../../../types/hono.js";

const settingsRoutes = new Hono<LucidHonoGeneric>().get("/", ...getSettings);

export default settingsRoutes;
