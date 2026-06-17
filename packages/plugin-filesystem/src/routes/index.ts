import type { LucidHonoGeneric } from "@lucidcms/core/types";
import { Hono } from "hono";
import {
	FILE_SYSTEM_DOWNLOAD_ROUTE,
	FILE_SYSTEM_UPLOAD_ROUTE,
} from "../constants.js";
import downloadMedia from "../controllers/download-media.js";
import uploadMedia from "../controllers/upload-media.js";

const routes = () => async (app: Hono<LucidHonoGeneric>) => {
	const fileSystemMediaRoutes = new Hono<LucidHonoGeneric>()
		.get(FILE_SYSTEM_DOWNLOAD_ROUTE, ...downloadMedia)
		.put(FILE_SYSTEM_UPLOAD_ROUTE, ...uploadMedia);

	app.route("/", fileSystemMediaRoutes);
};

export default routes;
