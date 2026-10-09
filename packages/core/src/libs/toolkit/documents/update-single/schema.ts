import {
	documentRequestIdSchema,
	documentUpdateSchema,
} from "../authoring-schema.js";
import { documentDataSchema } from "../authoring-values-schema.js";

export const inputSchema = documentUpdateSchema.extend({
	/** Edits this request's proposal of the document instead of latest. */
	requestId: documentRequestIdSchema,
	data: documentDataSchema,
});
