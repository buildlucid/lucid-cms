import z from "zod";
import { documentUpdateSchema } from "../authoring-schema.js";
import { documentPatchSchema } from "../authoring-values-schema.js";

export const inputSchema = documentUpdateSchema.extend({
	operations: z.array(documentPatchSchema).min(1),
});
