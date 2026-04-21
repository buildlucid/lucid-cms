import type { LucidHonoGeneric } from "@lucidcms/core/types";
import { Hono } from "hono";
import { STORAGE_DOWNLOAD_ROUTE, STORAGE_UPLOAD_ROUTE } from "../constants.js";
import storageDownloadController from "../controllers/storage-download.js";
import storageUploadController from "../controllers/storage-upload.js";
import type { PluginOptions } from "../types.js";

/**
 * Registers the plugin's binding-specific transport routes. Keeping these
 * routes inside the plugin avoids teaching core about an R2-only concern.
 */
const routes =
	(pluginOptions: PluginOptions) => async (app: Hono<LucidHonoGeneric>) => {
		const cloudflareR2Routes = new Hono<LucidHonoGeneric>()
			.get(STORAGE_DOWNLOAD_ROUTE, ...storageDownloadController(pluginOptions))
			.put(STORAGE_UPLOAD_ROUTE, ...storageUploadController(pluginOptions));

		app.route("/", cloudflareR2Routes);
	};

export default routes;
