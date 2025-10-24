import { Hono } from "hono";
import getSettings from "../../../controllers/settings/get-settings.js";
import clearKV from "../../../controllers/settings/clear-kv.js";
import type { LucidHonoGeneric } from "../../../../../types/hono.js";

const settingsRoutes = new Hono<LucidHonoGeneric>()
	.get("/", ...getSettings)
	.delete("/kv", ...clearKV);

export default settingsRoutes;
