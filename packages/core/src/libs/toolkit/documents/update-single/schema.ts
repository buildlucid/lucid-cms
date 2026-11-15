import { requestDetailsSchema } from "../../requests/schema.js";
import {
	documentRequestIdSchema,
	documentUpdateSchema,
} from "../authoring-schema.js";
import { documentDataSchema } from "../authoring-values-schema.js";

export const inputSchema = documentUpdateSchema
	.extend({
		/** Edits this request's proposal of the document instead of latest. */
		requestId: documentRequestIdSchema,
		/** Proposes the changes in a new update request for people to review, instead of saving latest. */
		request: requestDetailsSchema.optional(),
		data: documentDataSchema,
	})
	.refine((input) => !(input.requestId && input.request), {
		message: "Pass requestId or request, not both",
		path: ["request"],
	});
