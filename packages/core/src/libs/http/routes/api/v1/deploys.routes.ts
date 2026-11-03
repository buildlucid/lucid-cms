import { Hono } from "hono";
import type { LucidHonoGeneric } from "../../../../../types/hono.js";
import callback from "../../../controllers/deploys/callback.js";
import cancelRun from "../../../controllers/deploys/cancel-run.js";
import getMultiple from "../../../controllers/deploys/get-multiple.js";
import getRuns from "../../../controllers/deploys/get-runs.js";
import run from "../../../controllers/deploys/run.js";
import setState from "../../../controllers/deploys/set-state.js";
import webhook from "../../../controllers/deploys/webhook.js";

const deploysRoutes = new Hono<LucidHonoGeneric>()
	.get("/", ...getMultiple)
	.get("/runs", ...getRuns)
	.post("/runs/:id/cancel", ...cancelRun)
	.post("/runs/:id/callback", ...callback)
	.post("/:key/run", ...run)
	.patch("/:key/state", ...setState)
	.post("/:key/webhook", ...webhook);

export default deploysRoutes;
