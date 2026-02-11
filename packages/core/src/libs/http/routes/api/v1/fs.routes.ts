import { Hono } from "hono";
import type { LucidHonoGeneric } from "../../../../../types/hono.js";
import downloadMedia from "../../../controllers/fs/download-media.js";
import uploadMedia from "../../../controllers/fs/upload-media.js";

const fsRoutes = new Hono<LucidHonoGeneric>()
	.get("/download", ...downloadMedia)
	.put("/upload", ...uploadMedia);

export default fsRoutes;
