import z from "zod";
import { documentUpdateSchema } from "../authoring-schema.js";

export const inputSchema = documentUpdateSchema.extend({
	/** Permanently deletes the document when true. Defaults to moving it to the bin. */
	hard: z.boolean().default(false),
});
