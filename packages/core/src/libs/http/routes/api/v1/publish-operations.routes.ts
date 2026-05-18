import { Hono } from "hono";
import type { LucidHonoGeneric } from "../../../../../types/hono.js";
import decisionApprove from "../../../controllers/publish-operations/decision-approve.js";
import decisionCancel from "../../../controllers/publish-operations/decision-cancel.js";
import decisionReject from "../../../controllers/publish-operations/decision-reject.js";
import getMultiple from "../../../controllers/publish-operations/get-multiple.js";
import getOverview from "../../../controllers/publish-operations/get-overview.js";
import getReviewers from "../../../controllers/publish-operations/get-reviewers.js";
import getSingle from "../../../controllers/publish-operations/get-single.js";
import reschedule from "../../../controllers/publish-operations/reschedule.js";
import retry from "../../../controllers/publish-operations/retry.js";
import updateReviewers from "../../../controllers/publish-operations/update-reviewers.js";

const publishOperationRoutes = new Hono<LucidHonoGeneric>()
	.get("/", ...getMultiple)
	.get("/overview", ...getOverview)
	.get("/reviewers", ...getReviewers)
	.get("/:id", ...getSingle)
	.post("/:id/approve", ...decisionApprove)
	.post("/:id/reject", ...decisionReject)
	.post("/:id/cancel", ...decisionCancel)
	.post("/:id/reschedule", ...reschedule)
	.post("/:id/retry", ...retry)
	.post("/:id/reviewers", ...updateReviewers);

export default publishOperationRoutes;
