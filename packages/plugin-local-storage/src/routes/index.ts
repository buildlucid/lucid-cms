import { Hono } from "hono";
import uploadController from "../controllers/upload.js";
import type { LucidHonoGeneric } from "@lucidcms/core/types";
import type { PluginOptions } from "../types/types.js";

const routes =
	(pluginOptions: PluginOptions) => async (app: Hono<LucidHonoGeneric>) => {
		const localStorageRoutes = new Hono<LucidHonoGeneric>().put(
			"/api/v1/localstorage/upload",
			...uploadController(pluginOptions),
		);

		app.route("/", localStorageRoutes);
	};

export default routes;
