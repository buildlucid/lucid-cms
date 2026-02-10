import { Hono } from "hono";
import type { LucidHonoGeneric } from "../../../../../types/hono.js";
import authorizeStreamController from "../../../controllers/share/authorize-stream.js";
import getShareAccessController from "../../../controllers/share/get-share-access.js";
import requestDownloadController from "../../../controllers/share/request-download.js";
import streamMediaController from "../../../controllers/share/stream-media.js";

const shareRoutes = new Hono<LucidHonoGeneric>()
	.get("/:token", ...getShareAccessController)
	.get("/:token/stream", ...streamMediaController)
	.post("/:token/authorize", ...authorizeStreamController)
	.post("/:token/download", ...requestDownloadController);

export default shareRoutes;
