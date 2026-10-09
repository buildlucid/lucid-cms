import { toolkitActorSchema } from "../../schema.js";
import {
	documentRequestIdSchema,
	documentTargetSchema,
} from "../authoring-schema.js";

export const inputSchema = documentTargetSchema.extend({
	/** Check a user's read permissions when provided. Defaults to a trusted system read. */
	actor: toolkitActorSchema.default({ kind: "system" }),
	/** Reads this request's proposal of the document instead of latest. */
	requestId: documentRequestIdSchema,
});
