import { Hono } from "hono";
import type { LucidHonoGeneric } from "../../../../../types/hono.js";
import clearKV from "../../../controllers/settings/clear-kv.js";
import getSettings from "../../../controllers/settings/get-settings.js";

const settingsRoutes = new Hono<LucidHonoGeneric>()
	.get("/", ...getSettings)
	.delete("/kv", ...clearKV);

export default settingsRoutes;
