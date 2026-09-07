import { documentUpdateSchema } from "../authoring-schema.js";
import { documentDataSchema } from "../authoring-values-schema.js";

export const inputSchema = documentUpdateSchema.extend({
	data: documentDataSchema,
});
