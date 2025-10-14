import { Hono } from "hono";
import type { LucidHonoGeneric } from "../../../../../types/hono.js";
import accountRoutes from "./account.routes.js";
import authRoutes from "./auth.routes.js";
import clientRoutes from "./client/index.js";
import clientIntegrationsRoutes from "./client-integrations.routes.js";
import collectionRoutes from "./collections.routes.js";
import documentRoutes from "./document.routes.js";
import emailRoutes from "./email.routes.js";
import fsRoutes from "./fs.routes.js";
import jobsRoutes from "./jobs.routes.js";
import licenseRoutes from "./license.routes.js";
import localeRoutes from "./locales.routes.js";
import mediaRoutes from "./media.routes.js";
import permissionRoutes from "./permissions.routes.js";
import roleRoutes from "./roles.routes.js";
import settingsRoutes from "./settings.routes.js";
import userRoutes from "./users.routes.js";

const routes = new Hono<LucidHonoGeneric>()
	.route("/auth", authRoutes)
	.route("/account", accountRoutes)
	.route("/client-integrations", clientIntegrationsRoutes)
	.route("/collections", collectionRoutes)
	.route("/documents", documentRoutes)
	.route("/emails", emailRoutes)
	.route("/jobs", jobsRoutes)
	.route("/locales", localeRoutes)
	.route("/permissions", permissionRoutes)
	.route("/settings", settingsRoutes)
	.route("/license", licenseRoutes)
	.route("/roles", roleRoutes)
	.route("/users", userRoutes)
	.route("/media", mediaRoutes)
	.route("/client", clientRoutes)
	.route("/fs", fsRoutes);

export default routes;
