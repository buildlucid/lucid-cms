import z from "zod";
import { documentWriteSchema } from "../authoring-schema.js";

export const inputSchema = documentWriteSchema.extend({
	/** Explicit document IDs. Each document is deleted independently. */
	ids: z.array(z.number().int().positive()).min(1),
	/** Permanently deletes these documents when true. Defaults to moving them to the bin. */
	hard: z.boolean().default(false),
});
