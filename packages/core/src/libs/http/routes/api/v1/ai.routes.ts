import { Hono } from "hono";
import type { LucidHonoGeneric } from "../../../../../types/hono.js";
import aiController from "../../../controllers/ai/index.js";

const aiRoutes = new Hono<LucidHonoGeneric>()
	.post("/custom-field", ...aiController.customFieldInputGenerate)
	.post("/media-image", ...aiController.mediaImageGenerate)
	.post("/media-alt", ...aiController.mediaAltGenerate);

export default aiRoutes;
