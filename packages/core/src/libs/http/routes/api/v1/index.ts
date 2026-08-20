import { Hono } from "hono";
import type { LucidHonoGeneric } from "../../../../../types/hono.js";
import accountRoutes from "./account.routes.js";
import aiRoutes from "./ai.routes.js";
import authRoutes from "./auth.routes.js";
import collectionRoutes from "./collections.routes.js";
import connectionRoutes from "./connection.routes.js";
import contentRoutes from "./content/index.js";
import documentRoutes from "./document.routes.js";
import emailRoutes from "./email.routes.js";
import i18nRoutes from "./i18n.routes.js";
import integrationRoutes from "./integrations.routes.js";
import jobsRoutes from "./jobs.routes.js";
import localeRoutes from "./locales.routes.js";
import mediaRoutes from "./media.routes.js";
import permissionRoutes from "./permissions.routes.js";
import publishingRoutes from "./publishing.routes.js";
import roleRoutes from "./roles.routes.js";
import settingsRoutes from "./settings.routes.js";
import shareRoutes from "./share.routes.js";
import userRoutes from "./users.routes.js";

const routes = new Hono<LucidHonoGeneric>()
	.route("/auth", authRoutes)
	.route("/ai", aiRoutes)
	.route("/account", accountRoutes)
	.route("/integrations", integrationRoutes)
	.route("/collections", collectionRoutes)
	.route("/connection", connectionRoutes)
	.route("/documents", documentRoutes)
	.route("/emails", emailRoutes)
	.route("/i18n", i18nRoutes)
	.route("/jobs", jobsRoutes)
	.route("/locales", localeRoutes)
	.route("/permissions", permissionRoutes)
	.route("/publishing", publishingRoutes)
	.route("/settings", settingsRoutes)
	.route("/roles", roleRoutes)
	.route("/users", userRoutes)
	.route("/media", mediaRoutes)
	.route("/share", shareRoutes)
	.route("/content", contentRoutes);

export default routes;
