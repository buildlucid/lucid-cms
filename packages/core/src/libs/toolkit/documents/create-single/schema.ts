import { requestDetailsSchema } from "../../requests/schema.js";
import { documentWriteSchema } from "../authoring-schema.js";
import { documentDataSchema } from "../authoring-values-schema.js";

export const inputSchema = documentWriteSchema.extend({
	data: documentDataSchema,
	/**
	 * Saves the document as the proposal of a new create request, for people to
	 * review. It stays hidden from content until the request is completed.
	 */
	request: requestDetailsSchema.optional(),
});
