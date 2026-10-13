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
	.get("/media/models/:type", ...aiController.getMediaModels)
	.post("/media/image", ...aiController.mediaImageGenerate)
	.post("/media/audio", ...aiController.mediaAudioGenerate)
	.post("/media/alt", ...aiController.mediaAltGenerate)
	.get("/media/files/:key", ...aiController.mediaStream)
	.get("/media/generations/:id", ...aiController.mediaCompletion)
	.post("/media/generations/:id/save", ...aiController.mediaSave);

export default aiRoutes;
