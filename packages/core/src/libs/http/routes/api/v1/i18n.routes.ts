import { Hono } from "hono";
import type { LucidHonoGeneric } from "../../../../../types/hono.js";
import getAdminTranslations from "../../../controllers/i18n/get-admin-translations.js";

const i18nRoutes = new Hono<LucidHonoGeneric>()
	.get("/admin", ...getAdminTranslations)
	.get("/admin/:locale", ...getAdminTranslations);

export default i18nRoutes;
