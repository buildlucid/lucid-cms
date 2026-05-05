import { Hono } from "hono";
import type { LucidHonoGeneric } from "../../../../../types/hono.js";
import decisionApprove from "../../../controllers/publish-requests/decision-approve.js";
import decisionCancel from "../../../controllers/publish-requests/decision-cancel.js";
import decisionReject from "../../../controllers/publish-requests/decision-reject.js";
import getMultiple from "../../../controllers/publish-requests/get-multiple.js";
import getReviewers from "../../../controllers/publish-requests/get-reviewers.js";
import getSingle from "../../../controllers/publish-requests/get-single.js";

const publishRequestRoutes = new Hono<LucidHonoGeneric>()
	.get("/", ...getMultiple)
	.get("/reviewers", ...getReviewers)
	.get("/:id", ...getSingle)
	.post("/:id/approve", ...decisionApprove)
	.post("/:id/reject", ...decisionReject)
	.post("/:id/cancel", ...decisionCancel);

export default publishRequestRoutes;
