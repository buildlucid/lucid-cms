import { documentWriteSchema } from "../authoring-schema.js";
import { documentDataSchema } from "../authoring-values-schema.js";

export const inputSchema = documentWriteSchema.extend({
	data: documentDataSchema,
});
