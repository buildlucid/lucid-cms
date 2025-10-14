import { Hono } from "hono";
import type { LucidHonoGeneric } from "../../../../../types/hono.js";
import uploadMedia from "../../../controllers/fs/upload-media.js";

const fsRoutes = new Hono<LucidHonoGeneric>().put("/upload", ...uploadMedia);

export default fsRoutes;
