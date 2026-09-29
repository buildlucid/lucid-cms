import { Hono } from "hono";
import type { LucidHonoGeneric } from "../../../../../types/hono.js";
import aiController from "../../../controllers/ai/index.js";

const aiRoutes = new Hono<LucidHonoGeneric>()
	.get("/credits", ...aiController.getCredits)
	.get("/usage/chart", ...aiController.getUsageChart)
	.get("/usage/sessions", ...aiController.getUsageSessions)
	.get("/usage/sessions/:type/:id", ...aiController.getUsageSession)
	.get(
		"/usage/sessions/:type/:id/records",
		...aiController.getUsageSessionRecords,
	)
	.post("/custom-field", ...aiController.customFieldInputGenerate)
	.post("/media-image", ...aiController.mediaImageGenerate)
	.post("/media-image/:requestId", ...aiController.mediaImageCompletion)
	.post("/media-alt", ...aiController.mediaAltGenerate);

export default aiRoutes;
