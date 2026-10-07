import { Hono } from "hono";
import type { LucidHonoGeneric } from "../../../../../types/hono.js";
import getMultiple from "../../../controllers/notifications/get-multiple.js";
import getPreferences from "../../../controllers/notifications/get-preferences.js";
import getSummary from "../../../controllers/notifications/get-summary.js";
import getTypes from "../../../controllers/notifications/get-types.js";
import updateMultiple from "../../../controllers/notifications/update-multiple.js";
import updatePreferences from "../../../controllers/notifications/update-preferences.js";
import updateTypeSettings from "../../../controllers/notifications/update-type-settings.js";

const notificationsRoutes = new Hono<LucidHonoGeneric>()
	.get("/", ...getMultiple)
	.patch("/", ...updateMultiple)
	.get("/summary", ...getSummary)
	.get("/types", ...getTypes)
	.patch("/types/:type", ...updateTypeSettings)
	.get("/preferences", ...getPreferences)
	.patch("/preferences", ...updatePreferences);

export default notificationsRoutes;
