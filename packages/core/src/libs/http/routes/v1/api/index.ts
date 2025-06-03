import { Hono } from "hono";
import authRoutes from "./auth.routes.js";
import accountRoutes from "./account.routes.js";
import clientIntegrationsRoutes from "./client-integrations.routes.js";
import type { LucidHonoGeneric } from "../../../../../types/hono.js";

const routes = new Hono<LucidHonoGeneric>()
	.route("/auth", authRoutes)
	.route("/account", accountRoutes)
	.route("/client-integrations", clientIntegrationsRoutes);

export default routes;
