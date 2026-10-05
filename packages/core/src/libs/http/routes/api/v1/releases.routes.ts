import { Hono } from "hono";
import type { LucidHonoGeneric } from "../../../../../types/hono.js";
import addDocuments from "../../../controllers/releases/add-documents.js";
import approve from "../../../controllers/releases/approve.js";
import close from "../../../controllers/releases/close.js";
import createComment from "../../../controllers/releases/create-comment.js";
import createSingle from "../../../controllers/releases/create-single.js";
import deleteComment from "../../../controllers/releases/delete-comment.js";
import getExecution from "../../../controllers/releases/get-execution.js";
import getMultiple from "../../../controllers/releases/get-multiple.js";
import getOverview from "../../../controllers/releases/get-overview.js";
import getReviewers from "../../../controllers/releases/get-reviewers.js";
import getSingle from "../../../controllers/releases/get-single.js";
import publish from "../../../controllers/releases/publish.js";
import removeDocument from "../../../controllers/releases/remove-document.js";
import reopen from "../../../controllers/releases/reopen.js";
import reviewTarget from "../../../controllers/releases/review-target.js";
import unapprove from "../../../controllers/releases/unapprove.js";
import updateComment from "../../../controllers/releases/update-comment.js";
import updateCommentResolution from "../../../controllers/releases/update-comment-resolution.js";
import updateSingle from "../../../controllers/releases/update-single.js";
import updateTargets from "../../../controllers/releases/update-targets.js";

const releasesRoutes = new Hono<LucidHonoGeneric>()
	.get("/", ...getMultiple)
	.post("/", ...createSingle)
	.get("/overview", ...getOverview)
	.get("/:id", ...getSingle)
	.get("/:id/execution", ...getExecution)
	.patch("/:id", ...updateSingle)
	.get("/:id/reviewers", ...getReviewers)
	.post("/:id/documents", ...addDocuments)
	.delete("/:id/documents/:releaseDocumentId", ...removeDocument)
	.patch("/:id/documents/:releaseDocumentId/targets", ...updateTargets)
	.patch("/:id/documents/:releaseDocumentId/target-review", ...reviewTarget)
	.post("/:id/approve", ...approve)
	.post("/:id/unapprove", ...unapprove)
	.post("/:id/publish", ...publish)
	.post("/:id/close", ...close)
	.post("/:id/reopen", ...reopen)
	.post("/:id/comments", ...createComment)
	.patch("/:id/comments/:eventId", ...updateComment)
	.patch("/:id/comments/:eventId/resolution", ...updateCommentResolution)
	.delete("/:id/comments/:eventId", ...deleteComment);

export default releasesRoutes;
