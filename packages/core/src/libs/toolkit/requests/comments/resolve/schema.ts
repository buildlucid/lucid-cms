import { requestCommentResolutionSchema } from "../../../../../schemas/requests.js";
import { requestCommentSchema } from "../../schema.js";

export const inputSchema = requestCommentSchema.extend({
	/** Resolved when it was dealt with, closed when no change is needed, or null to reopen it. */
	resolution: requestCommentResolutionSchema.nullable(),
});
