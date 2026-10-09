import {
	documentRequestIdSchema,
	documentTargetSchema,
} from "../authoring-schema.js";
import { documentActorSchema } from "../authoring-values-schema.js";

export const inputSchema = documentTargetSchema.extend({
	/** Check a user's read permissions when provided. Defaults to a trusted system read. */
	actor: documentActorSchema.default({ kind: "system" }),
	/** Reads this request's proposal of the document instead of latest. */
	requestId: documentRequestIdSchema,
});
