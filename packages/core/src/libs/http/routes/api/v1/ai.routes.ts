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
	.get("/models/:type", ...aiController.getMediaModels)
	.post("/media/image", ...aiController.mediaImageGenerate)
	.post("/media/audio", ...aiController.mediaAudioGenerate)
	.get("/media/files/:key", ...aiController.mediaStream)
	.post("/media/requests/:requestId", ...aiController.mediaCompletion)
	.post("/media/requests/:requestId/save", ...aiController.mediaSave)
	.post("/media-alt", ...aiController.mediaAltGenerate);

export default aiRoutes;
