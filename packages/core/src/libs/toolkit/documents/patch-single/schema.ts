import z from "zod";
import {
	documentRequestIdSchema,
	documentUpdateSchema,
} from "../authoring-schema.js";
import { documentPatchSchema } from "../authoring-values-schema.js";

export const inputSchema = documentUpdateSchema.extend({
	/** Patches this request's proposal of the document instead of latest. */
	requestId: documentRequestIdSchema,
	operations: z.array(documentPatchSchema).min(1),
});
