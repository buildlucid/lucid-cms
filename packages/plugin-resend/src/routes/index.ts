import { Hono } from "hono";
import webhookController from "../controllers/webhook.js";
import type { LucidHonoGeneric } from "@lucidcms/core/types";
import type { PluginOptions } from "../types/types.js";

const routes =
	(pluginOptions: PluginOptions) => async (app: Hono<LucidHonoGeneric>) => {
		const resendRoutes = new Hono<LucidHonoGeneric>().post(
			"/api/v1/resend/webhook",
			...webhookController(pluginOptions),
		);

		app.route("/", resendRoutes);
	};

export default routes;
