import { Hono } from "hono";
import type { LucidHonoGeneric } from "../../../../../types/hono.js";
import clearKV from "../../../controllers/settings/clear-kv.js";
import getSettings from "../../../controllers/settings/get-settings.js";
import updateSystemAlerts from "../../../controllers/settings/update-system-alerts.js";

const settingsRoutes = new Hono<LucidHonoGeneric>()
	.get("/", ...getSettings)
	.patch("/system-alerts", ...updateSystemAlerts)
	.delete("/kv", ...clearKV);

export default settingsRoutes;
