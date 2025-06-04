import { Hono } from "hono";
import authRoutes from "./auth.routes.js";
import accountRoutes from "./account.routes.js";
import clientIntegrationsRoutes from "./client-integrations.routes.js";
import collectionRoutes from "./collections.routes.js";
import documentRoutes from "./document.routes.js";
import emailRoutes from "./email.routes.js";
import localeRoutes from "./locales.routes.js";
import type { LucidHonoGeneric } from "../../../../../types/hono.js";

const routes = new Hono<LucidHonoGeneric>()
	.route("/auth", authRoutes)
	.route("/account", accountRoutes)
	.route("/client-integrations", clientIntegrationsRoutes)
	.route("/collections", collectionRoutes)
	.route("/documents", documentRoutes)
	.route("/emails", emailRoutes)
	.route("/locales", localeRoutes);

export default routes;
