import z from "zod";

export const inputSchema = z.object({
	id: z.number().int().positive(),
	/** Permanently remove the file and record. Defaults to false. */
	hard: z.boolean().default(false),
});
