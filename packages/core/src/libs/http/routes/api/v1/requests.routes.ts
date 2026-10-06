import { Hono } from "hono";
import type { LucidHonoGeneric } from "../../../../../types/hono.js";
import addDocuments from "../../../controllers/requests/add-documents.js";
import approve from "../../../controllers/requests/approve.js";
import close from "../../../controllers/requests/close.js";
import complete from "../../../controllers/requests/complete.js";
import createComment from "../../../controllers/requests/create-comment.js";
import createSingle from "../../../controllers/requests/create-single.js";
import deleteComment from "../../../controllers/requests/delete-comment.js";
import getExecution from "../../../controllers/requests/get-execution.js";
import getMentionableUsers from "../../../controllers/requests/get-mentionable-users.js";
import getMultiple from "../../../controllers/requests/get-multiple.js";
import getOverview from "../../../controllers/requests/get-overview.js";
import getReviewers from "../../../controllers/requests/get-reviewers.js";
import getSingle from "../../../controllers/requests/get-single.js";
import removeDocument from "../../../controllers/requests/remove-document.js";
import reopen from "../../../controllers/requests/reopen.js";
import reviewTarget from "../../../controllers/requests/review-target.js";
import unapprove from "../../../controllers/requests/unapprove.js";
import updateComment from "../../../controllers/requests/update-comment.js";
import updateCommentResolution from "../../../controllers/requests/update-comment-resolution.js";
import updateSingle from "../../../controllers/requests/update-single.js";
import updateTargets from "../../../controllers/requests/update-targets.js";

const requestsRoutes = new Hono<LucidHonoGeneric>()
	.get("/", ...getMultiple)
	.post("/", ...createSingle)
	.get("/overview", ...getOverview)
	.get("/:id", ...getSingle)
	.get("/:id/execution", ...getExecution)
	.patch("/:id", ...updateSingle)
	.get("/:id/reviewers", ...getReviewers)
	.get("/:id/mentionable-users", ...getMentionableUsers)
	.post("/:id/documents", ...addDocuments)
	.delete("/:id/documents/:requestDocumentId", ...removeDocument)
	.patch("/:id/documents/:requestDocumentId/targets", ...updateTargets)
	.patch("/:id/documents/:requestDocumentId/target-review", ...reviewTarget)
	.post("/:id/approve", ...approve)
	.post("/:id/unapprove", ...unapprove)
	.post("/:id/complete", ...complete)
	.post("/:id/close", ...close)
	.post("/:id/reopen", ...reopen)
	.post("/:id/comments", ...createComment)
	.patch("/:id/comments/:eventId", ...updateComment)
	.patch("/:id/comments/:eventId/resolution", ...updateCommentResolution)
	.delete("/:id/comments/:eventId", ...deleteComment);

export default requestsRoutes;
